import { next } from '@vercel/functions';

const SESSION_COOKIE = 'lang5k_preview_session';
const SESSION_TOKEN = process.env.LANG5K_PREVIEW_SESSION || 'lang5k_preview_session_v1_2026_locked';

function hasPreviewSession(request) {
  const rawCookie = request.headers.get('cookie') || '';
  if (!rawCookie) return false;
  return rawCookie.split(';').some(part => {
    const [name, ...rest] = part.trim().split('=');
    return name === SESSION_COOKIE && decodeURIComponent(rest.join('=')) === SESSION_TOKEN;
  });
}

function isAllowedWithoutSession(pathname) {
  if (pathname === '/login.html' || pathname === '/favicon.svg') return true;
  if (pathname === '/api/admin-preview-login' || pathname === '/api/admin-preview-logout') return true;
  return false;
}

export const config = {
  matcher: [
    '/',
    '/index.html',
    '/app.html',
    '/access.html',
    '/admin.html',
    '/attribution.html',
    '/checkout.html',
    '/contact.html',
    '/pricing.html',
    '/privacy.html',
    '/refund.html',
    '/terms.html',
    '/api/admin-report'
  ]
};

export default function middleware(request) {
  const url = new URL(request.url);

  if (isAllowedWithoutSession(url.pathname)) {
    return next();
  }

  if (hasPreviewSession(request)) {
    return next();
  }

  const loginUrl = new URL('/login.html', request.url);
  loginUrl.searchParams.set('next', url.pathname + url.search);
  return Response.redirect(loginUrl);
}
