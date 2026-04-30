import { NextResponse } from 'next/server';

const SESSION_COOKIE = 'lang5k_preview_session';
const SESSION_TOKEN = process.env.LANG5K_PREVIEW_SESSION || 'lang5k_preview_session_v1_2026_locked';

function hasPreviewSession(request) {
  const cookie = request.cookies.get(SESSION_COOKIE);
  return cookie && cookie.value === SESSION_TOKEN;
}

function isAllowedWithoutSession(pathname) {
  if (pathname === '/login.html' || pathname === '/favicon.svg') return true;
  if (pathname === '/api/admin-preview-login' || pathname === '/api/admin-preview-logout') return true;
  return false;
}

export function middleware(request) {
  const { pathname, search } = request.nextUrl;

  if (isAllowedWithoutSession(pathname)) {
    return NextResponse.next();
  }

  if (hasPreviewSession(request)) {
    return NextResponse.next();
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login.html';
  loginUrl.search = '';
  loginUrl.searchParams.set('next', pathname + (search || ''));
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/:path*']
};
