const crypto = require('crypto');
const { verifyAccessToken } = require('./access');
const { accountTokenFromRequest, clientIp, cookieValue, noStore, readJsonBody, tokenFromRequest } = require('./http');
const { hasPreviewSession, SESSION_COOKIE } = require('./preview');
const { checkRateLimit, getEntitlement } = require('./store');

const OPENAI_SPEECH_URL = 'https://api.openai.com/v1/audio/speech';
const PROVIDER_TIMEOUT_MS = 9000;
const MAX_DYNAMIC_TEXT_LENGTH = 650;
const VOICE_MESSAGES = {
  method_guide: 'Lang5K works like this. Do not try to browse everything or memorize by rereading. Start the guided lesson. First, listen and connect the Russian sentence to the English meaning. Then recall before you reveal. Say the answer quietly, or type Russian or transliteration if you want. After reveal, compare honestly. Choose Again if you missed it, Hard if you barely got it, Good if you got most of it, and Easy only when the answer came back quickly and cleanly. Lang5K then schedules reviews, delayed recall, and repair drills automatically.',
  study_new_intro: 'Step one: read the English meaning. Step two: play the Russian audio. Step three: say the Russian sentence once. Then continue to the memory test.',
  study_new_recall: 'New recall. Read the English meaning. Try to remember the Russian sentence you just heard. Say it quietly or type Russian or transliteration, then reveal and self-check.',
  study_review: 'Review. Read the English meaning. Try to remember the Russian translation before hearing it. Say it quietly or type Russian or transliteration, then reveal and self-check.',
  study_delayed_recall: 'Delayed recall. Read the English meaning. Try to remember the Russian sentence you studied earlier. Say it quietly or type Russian or transliteration, then reveal and self-check.',
  study_compare_new: 'Compare your recall with the Russian answer. Listen again. Choose Again if you missed it, Hard if you barely got it, or Good if you got most of it.',
  study_compare_review: 'Compare your recall with the Russian answer. Listen again. Choose Again if you missed it, Hard if you barely got it, Good if you got most of it, or Easy only if you knew it quickly and cleanly.',
  practice_cloze: 'Cloze recall. Use the English meaning and sentence pattern. Think of the missing Russian word, type it if you can, or say it quietly before showing the answer.',
  practice_dictation: 'Dictation. Listen first. Try to catch the Russian sentence. Type the Russian if you can, or repeat what you hear quietly, then reveal and self-check.',
  teacher_on: 'Teacher Mode is on. I can guide the next best step, play the target sentence, reveal answers, and help you rate honestly.',
  teacher_try_recall: 'Try recall first. Say the Russian quietly, type what you remember, or tell me I tried before I reveal the answer.',
  teacher_intro_first: 'This first screen is for listening once. Press Next: test my memory before revealing.',
  teacher_new_intro: 'This is a new sentence. Read the meaning, play or hear the Russian, say it once, then press Next: test my memory.',
  teacher_recall_task: 'Do not reveal yet. Look at the English, try to recall the Russian, say it quietly or type what you remember.',
  teacher_compare: 'Now compare your answer with the Russian. Choose Again if you missed it, Hard if you barely got it, or Good if you got most of it.',
  teacher_cloze: 'This is cloze recall. Use the English meaning and pattern, guess the missing Russian word, then show the answer and rate.',
  teacher_dictation: 'This is dictation. Listen first, repeat or type what you hear, then reveal and rate.',
  teacher_practice: 'Use this practice only after trying recall first. Reveal after your attempt, then rate honestly.',
  teacher_rate: 'Choose your rating now. Say or click Again, Hard, Good, or Easy.',
  teacher_play_open: 'Open a lesson card first, then I can play the target sentence.',
  teacher_reveal_first: 'Reveal and compare first. Then rate it.',
  teacher_scope: 'I can only help with this language course and Lang5K navigation. Ask me where to start, what to do next, why this card is here, or how to use the app.',
  teacher_not_understood: 'I did not understand that lesson command. Try: guide me, play audio, reveal, next, again, hard, good, or easy.',
  teacher_voice_unsupported: 'This browser does not support voice commands here. You can still use Guide me and Do next.',
  teacher_voice_unclear: 'I could not hear a clear command. Try again or use the buttons.',
  teacher_where_start: 'Start with Study. I will choose due reviews, weak repair, or new sentences from your current performance.',
  teacher_performance: 'Your performance summary is on screen. I use due reviews, weak cards, streak, and recent accuracy to choose the next step.',
  teacher_why_now: 'This card was selected by the current schedule: due review, delayed recall, weak repair, or new material.'
};

function providerPreference() {
  const preferred = String(process.env.LANG5K_TEACHER_VOICE_PROVIDER || '').trim().toLowerCase();
  if (preferred === 'elevenlabs') return ['elevenlabs', 'openai'];
  return ['openai', 'elevenlabs'];
}

function activeEntitlement(entitlement) {
  return entitlement && entitlement.status === 'active' && entitlement.product === 'russian';
}

function hashSubject(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24);
}

async function canUseTeacherVoice(req) {
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

function textFromMessageKey(value, vars = {}) {
  const key = String(value || '').trim();
  if (key === 'teacher_start_plan') {
    const count = Math.max(0, Math.min(50, Number(vars.newLimit || 0)));
    return `Start the guided lesson. Today I recommend ${count} new sentence${count === 1 ? '' : 's'}, with due reviews first.`;
  }
  if (key === 'teacher_session_done') {
    return `Session finished. Next focus is ${cleanFocus(vars.focus)}. Press Do next when ready.`;
  }
  if (key === 'teacher_next_focus') {
    return `Press Do next. Your current best focus is ${cleanFocus(vars.focus)}.`;
  }
  const text = VOICE_MESSAGES[key];
  if (!text) {
    const error = new Error('Unknown teacher voice message.');
    error.statusCode = 400;
    throw error;
  }
  return text;
}

function dynamicTeacherVoiceText(value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (!clean) {
    const error = new Error('Teacher voice text is required.');
    error.statusCode = 400;
    throw error;
  }
  if (clean.length > MAX_DYNAMIC_TEXT_LENGTH) {
    const error = new Error('Teacher voice text is too long.');
    error.statusCode = 413;
    throw error;
  }
  return clean;
}

function teacherVoiceTextHash(textValue) {
  return crypto.createHash('sha256').update(String(textValue || '')).digest('hex');
}

function verifyTeacherVoiceToken(textValue, tokenValue) {
  const secret = String(process.env.LANG5K_ACCESS_SECRET || '').trim();
  const token = String(tokenValue || '');
  const [expiresAtRaw, textHash, signature] = token.split('.');
  const expiresAt = Number(expiresAtRaw || 0);
  if (!secret || !expiresAt || !textHash || !signature || Date.now() > expiresAt) return false;
  if (textHash !== teacherVoiceTextHash(textValue)) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${expiresAt}.${textHash}`).digest('hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(actualBuffer, expectedBuffer);
}

function textFromRequestBody(body) {
  if (body && Object.prototype.hasOwnProperty.call(body, 'text')) {
    const clean = dynamicTeacherVoiceText(body.text);
    if (!verifyTeacherVoiceToken(clean, body.voiceToken)) {
      const error = new Error('Signed teacher voice token is required.');
      error.statusCode = 403;
      throw error;
    }
    return clean;
  }
  return textFromMessageKey(body?.key || body?.messageKey, body?.vars);
}

function cleanFocus(value) {
  const text = String(value || '').toLowerCase();
  if (text.includes('due')) return 'due reviews';
  if (text.includes('weak') || text.includes('repair')) return 'weak sentence repair';
  if (text.includes('cloze')) return 'cloze recall';
  if (text.includes('dictation')) return 'dictation';
  if (text.includes('new')) return 'new sentences';
  if (text.includes('review')) return 'review';
  return 'the guided lesson';
}

async function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Voice provider timed out.');
      timeoutError.statusCode = 504;
      timeoutError.transient = true;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function openAiSpeech(text) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;
  const model = String(process.env.LANG5K_TEACHER_VOICE_MODEL || 'gpt-4o-mini-tts').trim();
  const voice = String(process.env.LANG5K_TEACHER_VOICE || 'coral').trim();
  const response = await fetchWithTimeout(OPENAI_SPEECH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      voice,
      input: text,
      instructions: 'Speak like a premium language teacher: clear, calm, warm, concise, and focused on the next learning action.',
      response_format: 'mp3'
    })
  });
  if (!response.ok) {
    await response.text().catch(() => '');
    const error = new Error('OpenAI voice request failed.');
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.transient = response.status >= 500;
    throw error;
  }
  return { provider: 'openai', buffer: Buffer.from(await response.arrayBuffer()) };
}

async function elevenLabsSpeech(text) {
  const apiKey = String(process.env.ELEVENLABS_API_KEY || '').trim();
  const voiceId = String(process.env.ELEVENLABS_VOICE_ID || process.env.LANG5K_ELEVENLABS_VOICE_ID || '').trim();
  if (!apiKey || !voiceId) return null;
  const modelId = String(process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5').trim();
  const response = await fetchWithTimeout(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: {
        stability: 0.58,
        similarity_boost: 0.78,
        style: 0.18,
        use_speaker_boost: true
      }
    })
  });
  if (!response.ok) {
    await response.text().catch(() => '');
    const error = new Error('ElevenLabs voice request failed.');
    error.statusCode = response.status >= 500 ? 502 : response.status;
    error.transient = response.status >= 500;
    throw error;
  }
  return { provider: 'elevenlabs', buffer: Buffer.from(await response.arrayBuffer()) };
}

async function synthesize(text) {
  const providers = {
    openai: openAiSpeech,
    elevenlabs: elevenLabsSpeech
  };
  let configured = false;
  let lastError;
  for (const provider of providerPreference()) {
    try {
      const result = await providers[provider](text);
      if (!result) continue;
      configured = true;
      return result;
    } catch (error) {
      configured = true;
      lastError = error;
      if (!error.transient) break;
    }
  }
  if (lastError) throw lastError;
  const error = new Error(configured ? 'Teacher voice is unavailable.' : 'Teacher voice is not configured.');
  error.statusCode = 503;
  throw error;
}

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    const access = await canUseTeacherVoice(req);
    if (!access.ok) {
      res.status(401).json({ error: 'Active Lang5K access is required for teacher voice.' });
      return;
    }
    const ipAllowed = await checkRateLimit(`teacher_voice:ip:${clientIp(req)}`, 20, 60);
    const ipDailyAllowed = await checkRateLimit(`teacher_voice:ip_day:${clientIp(req)}`, 240, 24 * 60 * 60);
    const previewDailyAllowed = access.subject.startsWith('preview:')
      ? await checkRateLimit(`teacher_voice:preview_ip_day:${clientIp(req)}`, 90, 24 * 60 * 60)
      : true;
    const subjectAllowed = await checkRateLimit(`teacher_voice:subject:${access.subject}`, 120, 60 * 60);
    const dailyAllowed = await checkRateLimit(`teacher_voice:day:${access.subject}`, 300, 24 * 60 * 60);
    if (!ipAllowed || !ipDailyAllowed || !previewDailyAllowed || !subjectAllowed || !dailyAllowed) {
      res.status(429).json({ error: 'Too many teacher voice requests.' });
      return;
    }
    const body = await readJsonBody(req, 8 * 1024);
    const text = textFromRequestBody(body);
    const result = await synthesize(text);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', result.buffer.length);
    res.setHeader('X-Lang5K-Voice-Provider', result.provider);
    res.status(200).end(result.buffer);
  } catch (error) {
    const status = [400, 401, 403, 405, 413, 429].includes(error.statusCode) ? error.statusCode : 503;
    const message = status === 429
      ? 'Too many teacher voice requests.'
      : status === 413
        ? 'Teacher voice text is too long.'
        : status === 401 || status === 403
          ? 'Active Lang5K access is required for teacher voice.'
          : 'Teacher voice is temporarily unavailable.';
    res.status(status).json({ error: message });
  }
};
