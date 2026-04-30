async function stripeRequest(path, body) {
  const secret = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!secret) {
    const error = new Error('Stripe is not configured.');
    error.statusCode = 503;
    throw error;
  }
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: body ? new URLSearchParams(body) : undefined
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Stripe request failed.');
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

async function stripeGet(path, params = {}) {
  const query = new URLSearchParams(params);
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return stripeRequest(`${path}${suffix}`);
}

async function retrieveCheckoutSession(sessionId) {
  return stripeGet(`/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    'expand[]': 'payment_intent.latest_charge'
  });
}

function isCheckoutSessionPaid(session) {
  if (!session || session.status !== 'complete' || session.payment_status !== 'paid') return false;
  const paymentIntent = session.payment_intent;
  if (paymentIntent && typeof paymentIntent === 'object') {
    if (paymentIntent.status !== 'succeeded') return false;
    const charge = paymentIntent.latest_charge;
    if (charge && typeof charge === 'object') {
      if (charge.disputed) return false;
      if (charge.refunded) return false;
      if (Number(charge.amount_refunded || 0) >= Number(charge.amount || 0)) return false;
    }
  }
  return true;
}

module.exports = { isCheckoutSessionPaid, retrieveCheckoutSession, stripeGet, stripeRequest };
