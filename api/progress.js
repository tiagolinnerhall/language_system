const { verifyAccessToken } = require('./_lib/access');
const { accountTokenFromRequest, noStore, readJsonBody } = require('./_lib/http');
const { getEntitlement, getProgressSnapshot, saveProgressSnapshot } = require('./_lib/store');

function accountPayload(req) {
  const secret = (process.env.LANG5K_ACCESS_SECRET || '').trim();
  return verifyAccessToken(accountTokenFromRequest(req), secret);
}

module.exports = async function handler(req, res) {
  noStore(res);
  const payload = accountPayload(req);
  if (!payload || !payload.email) {
    res.status(401).json({ error: 'Account login is required for cloud progress.' });
    return;
  }
  const entitlement = await getEntitlement(payload.email);
  if (!entitlement || entitlement.status !== 'active' || entitlement.product !== 'russian') {
    res.status(403).json({ error: 'Active Lang5K access is required for cloud progress.' });
    return;
  }
  const language = String(req.query.language || 'russian');
  if (language !== 'russian') {
    res.status(404).json({ error: 'Language not available.' });
    return;
  }
  try {
    if (req.method === 'GET') {
      const snapshot = await getProgressSnapshot(payload.email, language);
      res.status(200).json({ progress: snapshot?.progress || null, updatedAt: snapshot?.updatedAt || null });
      return;
    }
    if (req.method === 'POST') {
      const body = await readJsonBody(req, 512 * 1024);
      const progress = body.progress && typeof body.progress === 'object' ? body.progress : null;
      if (!progress) {
        res.status(400).json({ error: 'Missing progress payload.' });
        return;
      }
      const snapshot = await saveProgressSnapshot(payload.email, language, progress);
      res.status(200).json({ ok: true, updatedAt: snapshot.updatedAt });
      return;
    }
    res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to sync progress.' });
  }
};
