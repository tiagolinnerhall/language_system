const PREVIEW_EMAIL = (process.env.LANG5K_PREVIEW_EMAIL || 'contato@dental04.com').trim().toLowerCase();
const PREVIEW_PASSWORD = process.env.LANG5K_PREVIEW_PASSWORD || 't22222222';
const SESSION_COOKIE = 'lang5k_preview_session';
const SESSION_TOKEN = process.env.LANG5K_PREVIEW_SESSION || 'lang5k_preview_session_v1_2026_locked';

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = await parseBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');

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
