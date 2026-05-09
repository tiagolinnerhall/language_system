const crypto = require('crypto');
const { noStore, readRawBody } = require('./_lib/http');
const {
  recordCheckoutEntitlement,
  recordAnalyticsEvent,
  markStripeWebhookEventFailed,
  markStripeWebhookEventProcessed,
  recordStripeWebhookEvent,
  updateEntitlementByEmail,
  updateEntitlementByStripeReference
} = require('./_lib/store');
const { stripeRequest, validateLang5KCheckoutSession } = require('./_lib/stripe');

const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

function parseStripeSignature(header) {
  return String(header || '').split(',').reduce((acc, part) => {
    const [key, value] = part.split('=');
    if (!acc[key]) acc[key] = [];
    acc[key].push(value);
    return acc;
  }, {});
}

function verifyStripeWebhook(rawBody, signatureHeader, secret) {
  const parsed = parseStripeSignature(signatureHeader);
  const timestamp = parsed.t?.[0];
  const signatures = parsed.v1 || [];
  if (!timestamp || !signatures.length) return false;
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) > WEBHOOK_TOLERANCE_SECONDS) return false;
  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return signatures.some(sig => {
    const left = Buffer.from(expected);
    const right = Buffer.from(sig || '');
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  });
}

function eventEmail(object) {
  return String(
    object.customer_details?.email ||
    object.customer_email ||
    object.billing_details?.email ||
    object.receipt_email ||
    ''
  ).trim().toLowerCase();
}

async function chargeFromEventObject(eventType, object) {
  if (eventType === 'charge.refunded') return object;
  if (eventType === 'charge.dispute.created' && object.charge) {
    return stripeRequest(`/charges/${encodeURIComponent(object.charge)}`);
  }
  return object;
}

async function markEntitlementFromStripeObject(event, object) {
  const eventType = event.type;
  const status = eventType === 'charge.refunded' ? 'refunded' : 'disputed';
  const charge = await chargeFromEventObject(eventType, object);
  const email = eventEmail(charge);
  const patch = { status, lastStripeEvent: eventType, lastStripeEventCreated: event.created || Math.floor(Date.now() / 1000), stripeEventId: event.id };
  if (email) return updateEntitlementByEmail(email, patch);
  return updateEntitlementByStripeReference({
    stripeChargeId: charge.id || object.charge || '',
    stripePaymentIntentId: typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id || '',
    stripeCustomerId: typeof charge.customer === 'string' ? charge.customer : charge.customer?.id || ''
  }, patch);
}

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!secret) {
    res.status(503).json({ error: 'Stripe webhook is not configured.' });
    return;
  }
  try {
    const rawBody = await readRawBody(req);
    if (!verifyStripeWebhook(rawBody, req.headers['stripe-signature'], secret)) {
      res.status(400).json({ error: 'Invalid Stripe signature.' });
      return;
    }
    const event = JSON.parse(rawBody);
    const shouldProcess = await recordStripeWebhookEvent(event);
    if (!shouldProcess) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }
    try {
      const object = event.data?.object || {};
      if (event.type === 'checkout.session.completed') {
        if (await validateLang5KCheckoutSession(object)) {
          await recordCheckoutEntitlement(object, {
            stripeEventId: event.id,
            stripeEventType: event.type,
            stripeEventCreated: event.created || object.created
          });
        } else {
          await recordAnalyticsEvent({ type: 'stripe.webhook_ignored', stripeType: event.type, stripeEventId: event.id });
        }
      } else if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
        await markEntitlementFromStripeObject(event, object);
      }
      await recordAnalyticsEvent({ type: 'stripe.webhook', stripeType: event.type, stripeEventId: event.id });
      await markStripeWebhookEventProcessed(event.id);
    } catch (error) {
      await markStripeWebhookEventFailed(event.id, error);
      throw error;
    }
    res.status(200).json({ received: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to process Stripe webhook.' });
  }
};

module.exports.verifyStripeWebhook = verifyStripeWebhook;
