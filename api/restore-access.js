const { createAccessToken, hashCode, randomCode, timingSafeTextEqual } = require('./_lib/access');
const { sendAccessCodeEmail } = require('./_lib/email');
const {
  ACCESS_TOKEN_SECONDS,
  ACCOUNT_TOKEN_SECONDS,
  clientIp,
  noStore,
  readJsonBody,
  setAccessCookie,
  setAccountCookie,
  validEmail
} = require('./_lib/http');
const {
  deleteLoginCode,
  checkRateLimit,
  getEntitlement,
  getLoginCode,
  recordAnalyticsEvent,
  saveAccount,
  saveLoginCode
} = require('./_lib/store');

const PURPOSE = 'access_recovery';
const CODE_TTL_SECONDS = 15 * 60;

function activeEntitlement(entitlement) {
  return entitlement && entitlement.status === 'active' && entitlement.product === 'russian';
}

function issueAccess(res, email, entitlement, secret) {
  const now = Math.floor(Date.now() / 1000);
  const token = createAccessToken({
    sub: email,
    email,
    session: entitlement.stripeSessionId || '',
    scopes: ['russian'],
    iat: now,
    exp: now + ACCESS_TOKEN_SECONDS
  }, secret);
  const accountToken = createAccessToken({
    sub: email,
    email,
    type: 'account',
    iat: now,
    exp: now + ACCOUNT_TOKEN_SECONDS
  }, secret);
  setAccessCookie(res, token);
  setAccountCookie(res, accountToken);
  return { access: true, email, expiresAt: now + ACCESS_TOKEN_SECONDS };
}

async function requestCode(email, secret) {
  const entitlement = await getEntitlement(email);
  if (activeEntitlement(entitlement)) {
    const code = randomCode();
    const codeHash = hashCode(email, code, PURPOSE, secret);
    await saveLoginCode(email, PURPOSE, codeHash, CODE_TTL_SECONDS);
    await sendAccessCodeEmail(email, code);
    await recordAnalyticsEvent({ type: 'access.recovery_code_sent', email });
  } else {
    await recordAnalyticsEvent({ type: 'access.recovery_request_no_entitlement' });
  }
}

async function verifyCode(res, email, code, secret) {
  const saved = await getLoginCode(email, PURPOSE);
  const expected = hashCode(email, code, PURPOSE, secret);
  if (!saved || !timingSafeTextEqual(saved.codeHash, expected)) {
    const error = new Error('Invalid or expired recovery code.');
    error.statusCode = 400;
    throw error;
  }
  const entitlement = await getEntitlement(email);
  if (!activeEntitlement(entitlement)) {
    const error = new Error('No active Lang5K access was found for this email.');
    error.statusCode = 403;
    throw error;
  }
  await deleteLoginCode(email, PURPOSE);
  await saveAccount(email, { email, updatedAt: new Date().toISOString() });
  await recordAnalyticsEvent({ type: 'access.recovered', email });
  return issueAccess(res, email, entitlement, secret);
}

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  const secret = (process.env.LANG5K_ACCESS_SECRET || '').trim();
  if (!secret) {
    res.status(503).json({ error: 'Access signing is not configured.' });
    return;
  }
  try {
    const body = await readJsonBody(req, 16 * 1024);
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').replace(/\D/g, '');
    if (!validEmail(email)) {
      res.status(400).json({ error: 'Enter the email used at Stripe checkout.' });
      return;
    }
    const ip = clientIp(req);
    const limitedKey = code ? `recovery_verify:${email}:${ip}` : `recovery_send:${email}:${ip}`;
    const allowed = await checkRateLimit(limitedKey, code ? 8 : 3, code ? 15 * 60 : 60 * 60);
    if (!allowed) {
      res.status(429).json({ error: 'Too many attempts. Please wait and try again.' });
      return;
    }
    if (code) {
      const result = await verifyCode(res, email, code, secret);
      res.status(200).json(result);
      return;
    }
    await requestCode(email, secret);
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Access recovery failed.' });
  }
};
