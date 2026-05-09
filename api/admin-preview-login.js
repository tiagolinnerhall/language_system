const PREVIEW_EMAIL = (process.env.LANG5K_PREVIEW_EMAIL || '').trim().toLowerCase();
const PREVIEW_PASSWORD = process.env.LANG5K_PREVIEW_PASSWORD || '';
const SESSION_COOKIE = 'lang5k_preview_session';
const SESSION_TOKEN = (process.env.LANG5K_PREVIEW_SESSION || '').trim();
const { clientIp, noStore, readJsonBody } = require('./_lib/http');
const { checkRateLimit } = require('./_lib/store');

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    if (!PREVIEW_EMAIL || !PREVIEW_PASSWORD || !SESSION_TOKEN) {
      res.status(503).json({ error: 'Preview access is not configured.' });
      return;
    }

    const body = await readJsonBody(req, 16 * 1024);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const allowed = await checkRateLimit(`preview_login:${email || 'missing'}:${clientIp(req)}`, 8, 15 * 60);
    if (!allowed) {
      res.status(429).json({ error: 'Too many attempts. Please wait and try again.' });
      return;
    }

    if (email !== PREVIEW_EMAIL || password !== PREVIEW_PASSWORD) {
      res.status(401).json({ error: 'Wrong email or password.' });
      return;
    }

    const maxAge = 60 * 60 * 12;
    res.setHeader(
      'Set-Cookie',
      `${SESSION_COOKIE}=${encodeURIComponent(SESSION_TOKEN)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
    );
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: 'Login request was invalid.' });
  }
};
