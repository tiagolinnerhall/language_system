const { bearerToken, verifyAccessToken } = require('./_lib/access');
const { loadRussianCourse } = require('./_lib/course-data');

const DEMO_LIMIT = 80;

module.exports = async function handler(req, res) {
  const lang = req.query.lang || 'russian';
  const mode = req.query.mode || 'demo';
  if (lang !== 'russian') {
    res.status(404).json({ error: 'Language not available yet.' });
    return;
  }

  const rows = loadRussianCourse();
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
  const payload = verifyAccessToken(bearerToken(req), secret);
  if (!payload || !Array.isArray(payload.scopes) || !payload.scopes.includes('russian')) {
    res.status(secret ? 401 : 503).json({
      error: secret ? 'Paid access is required.' : 'Paid access is not configured yet.'
    });
    return;
  }

  res.status(200).json({
    language: 'russian',
    mode: 'full',
    total: rows.length,
    limit: rows.length,
    sentences: rows
  });
};
