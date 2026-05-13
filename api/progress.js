const { verifyAccessToken } = require('./_lib/access');
const { accountTokenFromRequest, noStore, readJsonBody } = require('./_lib/http');
const { hasPreviewSession } = require('./_lib/preview');
const { getEntitlement, getProgressArchive, getProgressArchiveList, getProgressSnapshot, restoreProgressSnapshot, saveProgressSnapshot } = require('./_lib/store');

function accountPayload(req) {
  const secret = (process.env.LANG5K_ACCESS_SECRET || '').trim();
  return verifyAccessToken(accountTokenFromRequest(req), secret);
}

function previewProgressAccount() {
  const user = String(process.env.LANG5K_PREVIEW_EMAIL || 'preview').trim().toLowerCase() || 'preview';
  return `preview:${user}`;
}

async function progressAccount(req) {
  const payload = accountPayload(req);
  if (payload?.email) {
    const entitlement = await getEntitlement(payload.email);
    if (!entitlement || entitlement.status !== 'active' || entitlement.product !== 'russian') {
      const error = new Error('Active Lang5K access is required for cloud progress.');
      error.statusCode = 403;
      throw error;
    }
    return { key: payload.email };
  }
  if (hasPreviewSession(req)) return { key: previewProgressAccount(), preview: true };
  return null;
}

function archiveMetadata(archive) {
  if (!archive) return null;
  const {
    progress,
    conflictProgress,
    email,
    ...metadata
  } = archive;
  return metadata;
}

module.exports = async function handler(req, res) {
  noStore(res);
  let account;
  try {
    account = await progressAccount(req);
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to verify cloud progress access.' });
    return;
  }
  if (!account) {
    res.status(401).json({ error: 'Account login is required for cloud progress.' });
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
        const archive = await getProgressArchive(account.key, language, req.query.archiveRevision);
        if (!archive) {
          res.status(404).json({ error: 'Progress archive not found.' });
          return;
        }
        res.status(200).json({ archive: archiveMetadata(archive) });
        return;
      }
      const snapshot = await getProgressSnapshot(account.key, language);
      const response = {
        progress: snapshot?.progress || null,
        updatedAt: snapshot?.updatedAt || null,
        revision: snapshot?.revision || 0
      };
      if (String(req.query.history || '') === '1') {
        response.archives = await getProgressArchiveList(account.key, language, Number(req.query.limit || 20));
      }
      res.status(200).json(response);
      return;
    }
    if (req.method === 'POST') {
      const body = await readJsonBody(req, 4 * 1024 * 1024);
      if (body.archiveId || body.restoreArchiveId || body.restoreRevision) {
        const archiveKey = body.archiveId || body.restoreArchiveId || body.restoreRevision;
        const archive = await getProgressArchive(account.key, language, archiveKey);
        const sourceProgress = body.restoreConflict && archive?.conflictProgress ? archive.conflictProgress : archive?.progress;
        if (!sourceProgress) {
          res.status(404).json({ error: 'Progress archive not found.' });
          return;
        }
        const snapshot = await restoreProgressSnapshot(account.key, language, sourceProgress);
        res.status(200).json({
          ok: true,
          restored: true,
          updatedAt: snapshot.updatedAt,
          revision: snapshot.revision || 0,
          progress: snapshot.progress
        });
        return;
      }
      const progress = body.progress && typeof body.progress === 'object' ? body.progress : null;
      if (!progress) {
        res.status(400).json({ error: 'Missing progress payload.' });
        return;
      }
      const snapshot = await saveProgressSnapshot(account.key, language, progress, { baseRevision: body.baseRevision });
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
