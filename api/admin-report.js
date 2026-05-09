const fs = require('fs');
const path = require('path');
const { getAdminMetrics } = require('./_lib/store');

const SESSION_COOKIE = 'lang5k_preview_session';
const SESSION_TOKEN = (process.env.LANG5K_PREVIEW_SESSION || '').trim();

function hasPreviewSession(req) {
  const rawCookie = String(req.headers.cookie || '');
  if (!rawCookie) return false;
  return rawCookie.split(';').some(part => {
    const [name, ...rest] = part.trim().split('=');
    return name === SESSION_COOKIE && decodeURIComponent(rest.join('=')) === SESSION_TOKEN;
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!SESSION_TOKEN) {
    res.status(503).json({ error: 'Preview access is not configured.' });
    return;
  }

  if (!hasPreviewSession(req)) {
    res.status(401).json({ error: 'Preview login required.' });
    return;
  }

  try {
    const reportPath = path.join(process.cwd(), 'admin-status.json');
    const raw = fs.readFileSync(reportPath, 'utf8');
    const data = JSON.parse(raw);
    try {
      data.metrics = await getAdminMetrics();
    } catch (metricsError) {
      data.metrics = {
        configured: false,
        error: metricsError.message || 'Live metrics could not be loaded.'
      };
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Admin report could not be loaded.' });
  }
};
