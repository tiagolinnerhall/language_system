const { createAccessToken } = require('./_lib/access');
const { ACCESS_TOKEN_SECONDS, ACCOUNT_TOKEN_SECONDS, noStore, setAccessCookie, setAccountCookie } = require('./_lib/http');
const { recordCheckoutEntitlement } = require('./_lib/store');
const { isCheckoutSessionPaid, retrieveCheckoutSession, validateLang5KCheckoutSession } = require('./_lib/stripe');

module.exports = async function handler(req, res) {
  noStore(res);
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
    const session = await retrieveCheckoutSession(sessionId);
    const productOk = await validateLang5KCheckoutSession(session);
    if (!productOk) {
      res.status(403).json({ error: 'Checkout session is not for Lang5K Russian access.' });
      return;
    }
    if (!isCheckoutSessionPaid(session)) {
      res.status(402).json({ error: 'Checkout is not paid yet.' });
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const email = session.customer_details?.email || session.customer_email || '';
    const token = createAccessToken({
      sub: email || session.customer || session.id,
      email,
      session: session.id,
      scopes: ['russian'],
      iat: now,
      exp: now + ACCESS_TOKEN_SECONDS
    }, secret);
    await recordCheckoutEntitlement(session, { stripeEventType: 'checkout.session.verified', stripeEventCreated: session.created || now });
    setAccessCookie(res, token);
    if (email) {
      const accountToken = createAccessToken({
        sub: email,
        email,
        type: 'account',
        iat: now,
        exp: now + ACCOUNT_TOKEN_SECONDS
      }, secret);
      setAccountCookie(res, accountToken);
    }
    res.status(200).json({
      access: true,
      email,
      expiresAt: now + ACCESS_TOKEN_SECONDS
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to verify checkout.' });
  }
};
