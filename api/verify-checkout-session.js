const { createAccessToken } = require('./_lib/access');
const { stripeRequest } = require('./_lib/stripe');

module.exports = async function handler(req, res) {
  const sessionId = req.query.session_id;
  const secret = (process.env.LANG5K_ACCESS_SECRET || '').trim();
  if (!sessionId) {
    res.status(400).json({ error: 'Missing checkout session.' });
    return;
  }
  if (!secret) {
    res.status(503).json({ error: 'Access signing is not configured.' });
    return;
  }

  try {
    const session = await stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
    if (session.payment_status !== 'paid' || session.status !== 'complete') {
      res.status(402).json({ error: 'Checkout is not paid yet.' });
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const token = createAccessToken({
      sub: session.customer_details?.email || session.customer_email || session.customer || session.id,
      email: session.customer_details?.email || session.customer_email || '',
      session: session.id,
      scopes: ['russian'],
      iat: now,
      exp: now + 60 * 60 * 24 * 365
    }, secret);
    res.status(200).json({
      token,
      email: session.customer_details?.email || session.customer_email || '',
      expiresAt: now + 60 * 60 * 24 * 365
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to verify checkout.' });
  }
};
