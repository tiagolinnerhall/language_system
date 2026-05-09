const { verifyAccessToken } = require('./_lib/access');
const { loadCuratedRussianCourse } = require('./_lib/course-data');
const { noStore, tokenFromRequest } = require('./_lib/http');
const { hasPreviewSession } = require('./_lib/preview');
const { getEntitlement } = require('./_lib/store');
const { isCheckoutSessionPaid, retrieveCheckoutSession, validateLang5KCheckoutSession } = require('./_lib/stripe');
const handleTeacherChat = require('./_lib/teacher-chat');
const handleTeacherVoice = require('./_lib/teacher-voice');

const DEMO_LIMIT = 80;

function sendFullCourse(res, rows) {
  res.status(200).json({
    language: 'russian',
    mode: 'full',
    total: rows.length,
    limit: rows.length,
    sentences: rows
  });
}

module.exports = async function handler(req, res) {
  if (req.query.voice === 'teacher') {
    return handleTeacherVoice(req, res);
  }
  if (req.query.teacher === 'chat') {
    return handleTeacherChat(req, res);
  }
  const lang = req.query.lang || 'russian';
  const mode = req.query.mode || 'demo';
  if (lang !== 'russian') {
    res.status(404).json({ error: 'Language not available yet.' });
    return;
  }

  const rows = loadCuratedRussianCourse();
  if (hasPreviewSession(req)) {
    noStore(res);
    sendFullCourse(res, rows);
    return;
  }

  if (mode !== 'full') {
    res.status(200).json({
      language: 'russian',
      mode: 'demo',
      total: rows.length,
      limit: DEMO_LIMIT,
      sentences: rows.slice(0, DEMO_LIMIT)
    });
    return;
  }

  const secret = (process.env.LANG5K_ACCESS_SECRET || '').trim();
  const payload = verifyAccessToken(tokenFromRequest(req), secret);
  noStore(res);
  if (!payload || !Array.isArray(payload.scopes) || !payload.scopes.includes('russian')) {
    res.status(secret ? 401 : 503).json({
      error: secret ? 'Paid access is required.' : 'Paid access is not configured yet.'
    });
    return;
  }
  try {
    if (payload.email) {
      const entitlement = await getEntitlement(payload.email);
      if (entitlement && entitlement.status === 'active' && entitlement.product === 'russian') {
        sendFullCourse(res, rows);
        return;
      }
    }
    if (payload.session) {
      const session = await retrieveCheckoutSession(payload.session);
      if (await validateLang5KCheckoutSession(session) && isCheckoutSessionPaid(session)) {
        sendFullCourse(res, rows);
        return;
      }
    }
    res.status(402).json({ error: 'Paid access is no longer active.' });
    return;
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to verify paid access.' });
    return;
  }
};
