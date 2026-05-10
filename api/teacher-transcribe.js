const crypto = require('crypto');
const { verifyAccessToken } = require('./_lib/access');
const { accountTokenFromRequest, clientIp, cookieValue, noStore, readBufferBody, tokenFromRequest } = require('./_lib/http');
const { hasPreviewSession, SESSION_COOKIE } = require('./_lib/preview');
const { checkRateLimit, getEntitlement } = require('./_lib/store');

const OPENAI_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;

function hashSubject(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24);
}

function activeEntitlement(entitlement) {
  return entitlement && entitlement.status === 'active' && entitlement.product === 'russian';
}

async function canUseTeacherTranscribe(req) {
  if (hasPreviewSession(req)) {
    return { ok: true, subject: `preview:${hashSubject(cookieValue(req, SESSION_COOKIE) || clientIp(req))}` };
  }
  const secret = String(process.env.LANG5K_ACCESS_SECRET || '').trim();
  if (!secret) return { ok: false, subject: '' };
  const accessPayload = verifyAccessToken(tokenFromRequest(req), secret);
  if (
    accessPayload &&
    Array.isArray(accessPayload.scopes) &&
    accessPayload.scopes.includes('russian') &&
    accessPayload.email
  ) {
    const ok = activeEntitlement(await getEntitlement(accessPayload.email));
    return { ok, subject: ok ? `account:${hashSubject(accessPayload.email)}` : '' };
  }
  const accountPayload = verifyAccessToken(accountTokenFromRequest(req), secret);
  if (accountPayload && accountPayload.email) {
    const ok = activeEntitlement(await getEntitlement(accountPayload.email));
    return { ok, subject: ok ? `account:${hashSubject(accountPayload.email)}` : '' };
  }
  return { ok: false, subject: '' };
}

function audioContentType(req) {
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg'].includes(contentType)) {
    return contentType;
  }
  return 'audio/webm';
}

function extensionForType(contentType) {
  if (contentType.includes('mp4')) return 'm4a';
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'mp3';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('ogg')) return 'ogg';
  return 'webm';
}

async function transcribeAudio(buffer, contentType) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    const error = new Error('OpenAI transcription is not configured.');
    error.statusCode = 503;
    throw error;
  }
  const form = new FormData();
  const model = String(process.env.LANG5K_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe').trim();
  const fileName = `live-teacher.${extensionForType(contentType)}`;
  form.append('file', new Blob([buffer], { type: contentType }), fileName);
  form.append('model', model);
  form.append('response_format', 'json');
  form.append('prompt', 'Lang5K Russian lesson. The student may ask in English or Russian, say a Russian recall attempt, or ask the teacher what to do next.');
  const response = await fetch(OPENAI_TRANSCRIPTIONS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.message || 'Transcription failed.');
    error.statusCode = response.status >= 500 ? 503 : response.status;
    throw error;
  }
  return String(data.text || '').trim();
}

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    const access = await canUseTeacherTranscribe(req);
    if (!access.ok) {
      res.status(401).json({ error: 'Active Lang5K access is required for live teacher transcription.' });
      return;
    }
    const ipAllowed = await checkRateLimit(`teacher_transcribe:ip:${clientIp(req)}`, 30, 60);
    const subjectAllowed = await checkRateLimit(`teacher_transcribe:subject:${access.subject}`, 160, 60 * 60);
    const dailyAllowed = await checkRateLimit(`teacher_transcribe:day:${access.subject}`, 700, 24 * 60 * 60);
    if (!ipAllowed || !subjectAllowed || !dailyAllowed) {
      res.status(429).json({ error: 'Too many live teacher transcription requests.' });
      return;
    }
    const contentType = audioContentType(req);
    const buffer = await readBufferBody(req, MAX_AUDIO_BYTES);
    if (buffer.length < 200) {
      res.status(200).json({ ok: true, text: '' });
      return;
    }
    const text = await transcribeAudio(buffer, contentType);
    res.status(200).json({ ok: true, text });
  } catch (error) {
    const status = [400, 401, 403, 405, 413, 429].includes(error.statusCode) ? error.statusCode : 503;
    const message = status === 429
      ? 'Too many live teacher transcription requests.'
      : status === 413
        ? 'Live teacher audio is too long.'
        : status === 401 || status === 403
          ? 'Active Lang5K access is required for live teacher transcription.'
          : 'Live teacher transcription is temporarily unavailable.';
    res.status(status).json({ error: message });
  }
};

module.exports._test = { audioContentType, extensionForType };
