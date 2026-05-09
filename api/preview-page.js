const fs = require('fs');
const path = require('path');
const { hasPreviewSession, previewSessionToken, publicLaunchEnabled } = require('./_lib/preview');

const ALLOWED_FILES = new Set([
  'index.html',
  'app.html',
  'access.html',
  'admin.html',
  'attribution.html',
  'checkout.html',
  'contact.html',
  'pricing.html',
  'privacy.html',
  'refund.html',
  'terms.html'
]);

const PUBLIC_FILES = new Set([...ALLOWED_FILES].filter(file => file !== 'admin.html'));

module.exports = async function handler(req, res) {
  const file = String((req.query && req.query.file) || 'index.html');

  if (!previewSessionToken()) {
    res.status(503).send('Preview access is not configured.');
    return;
  }

  if (!ALLOWED_FILES.has(file)) {
    res.status(404).send('Not found');
    return;
  }

  if (!hasPreviewSession(req) && !(publicLaunchEnabled() && PUBLIC_FILES.has(file))) {
    const nextPath = file === 'index.html' ? '/' : `/${file}`;
    res.statusCode = 302;
    res.setHeader('Location', `/login.html?next=${encodeURIComponent(nextPath)}`);
    res.end();
    return;
  }

  try {
    const targetPath = path.join(process.cwd(), file);
    const html = fs.readFileSync(targetPath, 'utf8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('Preview page could not be loaded.');
  }
};
