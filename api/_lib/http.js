const ACCESS_COOKIE = 'lang5k_access_token';
const ACCOUNT_COOKIE = 'lang5k_account_session';
const ACCESS_TOKEN_SECONDS = 60 * 60 * 24 * 365;
const ACCOUNT_TOKEN_SECONDS = 60 * 60 * 24 * 365;

function readJsonBody(req, maxBytes = 512 * 1024) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('Request body too large.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function readRawBody(req, maxBytes = 256 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += buffer.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error('Request body too large.'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(buffer);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function cookieValue(req, name) {
  const rawCookie = String(req.headers.cookie || '');
  return rawCookie.split(';').map(part => part.trim()).reduce((found, part) => {
    if (found) return found;
    const [key, ...rest] = part.split('=');
    return key === name ? decodeURIComponent(rest.join('=')) : '';
  }, '');
}

function appendSetCookie(res, value) {
  const previous = res.getHeader && res.getHeader('Set-Cookie');
  if (!previous) {
    res.setHeader('Set-Cookie', value);
  } else if (Array.isArray(previous)) {
    res.setHeader('Set-Cookie', [...previous, value]);
  } else {
    res.setHeader('Set-Cookie', [previous, value]);
  }
}

function setCookie(res, name, value, maxAge) {
  appendSetCookie(
    res,
    `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`
  );
}

function clearCookie(res, name) {
  appendSetCookie(res, `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

function setAccessCookie(res, token, maxAge = ACCESS_TOKEN_SECONDS) {
  setCookie(res, ACCESS_COOKIE, token, maxAge);
}

function setAccountCookie(res, token, maxAge = ACCOUNT_TOKEN_SECONDS) {
  setCookie(res, ACCOUNT_COOKIE, token, maxAge);
}

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store');
}

function tokenFromRequest(req, fallbackBearer = '') {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : cookieValue(req, ACCESS_COOKIE) || fallbackBearer;
}

function accountTokenFromRequest(req) {
  return cookieValue(req, ACCOUNT_COOKIE);
}

function emailFromBody(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

function clientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim() || 'unknown';
}

module.exports = {
  ACCESS_COOKIE,
  ACCESS_TOKEN_SECONDS,
  ACCOUNT_COOKIE,
  ACCOUNT_TOKEN_SECONDS,
  accountTokenFromRequest,
  clientIp,
  clearCookie,
  cookieValue,
  emailFromBody,
  noStore,
  readJsonBody,
  readRawBody,
  setAccessCookie,
  setAccountCookie,
  tokenFromRequest,
  validEmail
};
