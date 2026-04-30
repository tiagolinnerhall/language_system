const { createAccessToken } = require('./_lib/access');
const { isCheckoutSessionPaid, retrieveCheckoutSession, stripeGet } = require('./_lib/stripe');

async function readJsonBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks.map(chunk => Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }

  const secret = (process.env.LANG5K_ACCESS_SECRET || '').trim();
  let body = {};
  try {
    body = await readJsonBody(req);
  } catch {
    res.status(400).json({ error: 'Request body must be valid JSON.' });
    return;
  }
  const email = String(body.email || '').trim().toLowerCase();
  if (!secret) {
    res.status(503).json({ error: 'Access signing is not configured.' });
    return;
  }
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    res.status(400).json({ error: 'Enter the paid email address from your checkout.' });
    return;
  }

  try {
    let startingAfter;
    let match = null;
    for (let page = 0; page < 5 && !match; page++) {
      const response = await stripeGet('/checkout/sessions', {
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {})
      });
      const rows = Array.isArray(response.data) ? response.data : [];
      for (const row of rows) {
        const rowEmail = String(row.customer_details?.email || row.customer_email || '').trim().toLowerCase();
        if (rowEmail !== email) continue;
        const full = await retrieveCheckoutSession(row.id);
        if (isCheckoutSessionPaid(full)) {
          match = full;
          break;
        }
      }
      if (!response.has_more || !rows.length) break;
      startingAfter = rows[rows.length - 1].id;
    }

    if (!match) {
      res.status(404).json({ error: 'No paid Lang5K checkout was found for that email yet.' });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const token = createAccessToken({
      sub: match.customer_details?.email || match.customer_email || match.customer || match.id,
      email: match.customer_details?.email || match.customer_email || '',
      session: match.id,
      scopes: ['russian'],
      iat: now,
      exp: now + 60 * 60 * 24 * 30
    }, secret);

    res.status(200).json({
      token,
      email: match.customer_details?.email || match.customer_email || '',
      restored: true,
      expiresAt: now + 60 * 60 * 24 * 30
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to restore access.' });
  }
};
