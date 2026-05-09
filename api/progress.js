const { verifyAccessToken } = require('./_lib/access');
const { accountTokenFromRequest, noStore, readJsonBody } = require('./_lib/http');
const { getEntitlement, getProgressArchive, getProgressArchiveList, getProgressSnapshot, saveProgressSnapshot } = require('./_lib/store');

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
      if (req.query.archiveRevision) {
        const archive = await getProgressArchive(payload.email, language, req.query.archiveRevision);
        if (!archive) {
          res.status(404).json({ error: 'Progress archive not found.' });
          return;
        }
        res.status(200).json({ archive });
        return;
      }
      const snapshot = await getProgressSnapshot(payload.email, language);
      const response = {
        progress: snapshot?.progress || null,
        updatedAt: snapshot?.updatedAt || null,
        revision: snapshot?.revision || 0
      };
      if (String(req.query.history || '') === '1') {
        response.archives = await getProgressArchiveList(payload.email, language, Number(req.query.limit || 20));
      }
      res.status(200).json(response);
      return;
    }
    if (req.method === 'POST') {
      const body = await readJsonBody(req, 4 * 1024 * 1024);
      if (body.restoreRevision) {
        const archive = await getProgressArchive(payload.email, language, body.restoreRevision);
        const sourceProgress = body.restoreConflict && archive?.conflictProgress ? archive.conflictProgress : archive?.progress;
        if (!sourceProgress) {
          res.status(404).json({ error: 'Progress archive not found.' });
          return;
        }
        const restoredProgress = { ...sourceProgress, clientUpdatedAt: Date.now() };
        const snapshot = await saveProgressSnapshot(payload.email, language, restoredProgress);
        res.status(200).json({
          ok: true,
          restored: true,
          updatedAt: snapshot.updatedAt,
          revision: snapshot.revision || 0,
          progress: restoredProgress
        });
        return;
      }
      const progress = body.progress && typeof body.progress === 'object' ? body.progress : null;
      if (!progress) {
        res.status(400).json({ error: 'Missing progress payload.' });
        return;
      }
      const snapshot = await saveProgressSnapshot(payload.email, language, progress);
      res.status(200).json({
        ok: true,
        updatedAt: snapshot.updatedAt,
        revision: snapshot.revision || 0,
        archived: Boolean(snapshot.archived),
        conflict: Boolean(snapshot.conflict),
        progress: snapshot.conflict ? snapshot.progress : undefined
      });
      return;
    }
    res.status(405).json({ error: 'Method not allowed.' });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to sync progress.' });
  }
};
