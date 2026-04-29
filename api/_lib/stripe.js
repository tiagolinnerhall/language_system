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

module.exports = { stripeRequest };
