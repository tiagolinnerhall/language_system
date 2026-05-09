const { stripeRequest } = require('./_lib/stripe');
const { noStore } = require('./_lib/http');
const { canUsePaidCheckout } = require('./_lib/preview');

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  if (!canUsePaidCheckout(req)) {
    res.status(403).json({ error: 'Checkout is currently limited to private preview access.' });
    return;
  }

  const priceId = (process.env.STRIPE_PRICE_ID || '').trim();
  const siteUrl = (process.env.LANG5K_SITE_URL || 'https://www.lang5k.com').trim().replace(/\/$/, '');
  if (!priceId) {
    res.status(503).json({ error: 'Stripe price is not configured.' });
    return;
  }

  try {
    const session = await stripeRequest('/checkout/sessions', {
      mode: 'payment',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${siteUrl}/access.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/pricing.html?checkout=cancelled`,
      allow_promotion_codes: 'true',
      billing_address_collection: 'auto',
      'automatic_tax[enabled]': 'false',
      client_reference_id: `lang5k-russian-${Date.now()}`,
      'metadata[app]': 'lang5k',
      'metadata[product]': 'russian',
      'metadata[priceId]': priceId,
      'payment_intent_data[metadata][app]': 'lang5k',
      'payment_intent_data[metadata][product]': 'russian',
      'payment_intent_data[metadata][priceId]': priceId
    });
    res.status(200).json({ url: session.url });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to start checkout.' });
  }
};
