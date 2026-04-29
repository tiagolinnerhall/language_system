const { bearerToken, verifyAccessToken } = require('./_lib/access');
const { isCheckoutSessionPaid, retrieveCheckoutSession } = require('./_lib/stripe');

module.exports = async function handler(req, res) {
  const secret = (process.env.LANG5K_ACCESS_SECRET || '').trim();
  const payload = verifyAccessToken(bearerToken(req), secret);
  if (!secret) {
    res.status(503).json({ active: false, error: 'Access verification is not configured.' });
    return;
  }
  if (!payload) {
    res.status(401).json({ active: false, error: 'Invalid or expired access.' });
    return;
  }
  try {
    const session = await retrieveCheckoutSession(payload.session);
    if (!isCheckoutSessionPaid(session)) {
      res.status(402).json({ active: false, error: 'Paid access is no longer active.' });
      return;
    }
  } catch (error) {
    res.status(error.statusCode || 500).json({ active: false, error: error.message || 'Unable to verify paid access.' });
    return;
  }
  res.status(200).json({ active: true, email: payload.email || '', scopes: payload.scopes || [], expiresAt: payload.exp });
};
