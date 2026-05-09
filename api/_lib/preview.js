const SESSION_COOKIE = 'lang5k_preview_session';

function previewSessionToken() {
  return (process.env.LANG5K_PREVIEW_SESSION || '').trim();
}

function publicLaunchEnabled() {
  return ['1', 'true', 'yes'].includes(String(process.env.LANG5K_PUBLIC_LAUNCH || '').toLowerCase());
}

function nativeReviewApproved() {
  return ['1', 'true', 'yes'].includes(String(process.env.LANG5K_NATIVE_REVIEW_APPROVED || '').toLowerCase());
}

function hasPreviewSession(req) {
  const token = previewSessionToken();
  if (!token) return false;
  const rawCookie = String(req.headers.cookie || '');
  if (!rawCookie) return false;
  return rawCookie.split(';').some(part => {
    const [name, ...rest] = part.trim().split('=');
    return name === SESSION_COOKIE && decodeURIComponent(rest.join('=')) === token;
  });
}

function canUsePaidCheckout(req) {
  return hasPreviewSession(req) || (publicLaunchEnabled() && nativeReviewApproved());
}

module.exports = { SESSION_COOKIE, canUsePaidCheckout, hasPreviewSession, nativeReviewApproved, previewSessionToken, publicLaunchEnabled };
