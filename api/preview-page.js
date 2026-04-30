const fs = require('fs');
const path = require('path');

const SESSION_COOKIE = 'lang5k_preview_session';
const SESSION_TOKEN = process.env.LANG5K_PREVIEW_SESSION || 'lang5k_preview_session_v1_2026_locked';

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

function hasPreviewSession(req) {
  const rawCookie = String(req.headers.cookie || '');
  if (!rawCookie) return false;
  return rawCookie.split(';').some(part => {
    const [name, ...rest] = part.trim().split('=');
    return name === SESSION_COOKIE && decodeURIComponent(rest.join('=')) === SESSION_TOKEN;
  });
}

module.exports = async function handler(req, res) {
  const file = String((req.query && req.query.file) || 'index.html');

  if (!ALLOWED_FILES.has(file)) {
    res.status(404).send('Not found');
    return;
  }

  if (!hasPreviewSession(req)) {
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
