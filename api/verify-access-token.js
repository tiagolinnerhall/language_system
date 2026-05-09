const { verifyAccessToken } = require('./_lib/access');
const { noStore, tokenFromRequest } = require('./_lib/http');
const { getEntitlement } = require('./_lib/store');
const { isCheckoutSessionPaid, retrieveCheckoutSession, validateLang5KCheckoutSession } = require('./_lib/stripe');

module.exports = async function handler(req, res) {
  noStore(res);
  const secret = (process.env.LANG5K_ACCESS_SECRET || '').trim();
  const payload = verifyAccessToken(tokenFromRequest(req), secret);
  if (!secret) {
    res.status(503).json({ active: false, error: 'Access verification is not configured.' });
    return;
  }
  if (!payload) {
    res.status(401).json({ active: false, error: 'Invalid or expired access.' });
    return;
  }
  try {
    if (!Array.isArray(payload.scopes) || !payload.scopes.includes('russian')) {
      res.status(401).json({ active: false, error: 'Invalid access scope.' });
      return;
    }
    if (payload.email) {
      const entitlement = await getEntitlement(payload.email);
      if (entitlement && entitlement.status === 'active' && entitlement.product === 'russian') {
        res.status(200).json({ active: true, email: payload.email || '', scopes: payload.scopes || [], expiresAt: payload.exp });
        return;
      }
    }
    if (payload.session) {
      const session = await retrieveCheckoutSession(payload.session);
      if (await validateLang5KCheckoutSession(session) && isCheckoutSessionPaid(session)) {
        res.status(200).json({ active: true, email: payload.email || '', scopes: payload.scopes || [], expiresAt: payload.exp });
        return;
      }
    }
    res.status(402).json({ active: false, error: 'Paid access is no longer active.' });
    return;
  } catch (error) {
    res.status(error.statusCode || 500).json({ active: false, error: error.message || 'Unable to verify paid access.' });
    return;
  }
};
