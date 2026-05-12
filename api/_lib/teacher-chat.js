const crypto = require('crypto');
const { verifyAccessToken } = require('./access');
const { accountTokenFromRequest, clientIp, cookieValue, noStore, readBufferBody, readJsonBody, tokenFromRequest } = require('./http');
const { hasPreviewSession, SESSION_COOKIE } = require('./preview');
const { checkRateLimit, getEntitlement } = require('./store');

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const OPENAI_TRANSCRIPTIONS_URL = 'https://api.openai.com/v1/audio/transcriptions';
const DEFAULT_FAST_MODEL = 'gpt-5.4-mini';
const DEFAULT_PREMIUM_MODEL = 'gpt-5.5';
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const ACTIONS = [
  'none',
  'guide',
  'do_next',
  'play_target',
  'reveal',
  'rate_again',
  'rate_hard',
  'rate_good',
  'rate_easy',
  'open_study',
  'open_browse',
  'open_review',
  'open_cloze',
  'open_dictation',
  'open_pricing',
  'open_access',
  'open_contact',
  'set_goal_5',
  'set_goal_10',
  'set_goal_15',
  'set_goal_20'
];

function hashSubject(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex').slice(0, 24);
}

function teacherVoiceTextHash(textValue) {
  return crypto.createHash('sha256').update(String(textValue || '')).digest('hex');
}

function createTeacherVoiceToken(textValue) {
  const secret = String(process.env.LANG5K_ACCESS_SECRET || '').trim();
  if (!secret) return '';
  const expiresAt = Date.now() + 5 * 60 * 1000;
  const textHash = teacherVoiceTextHash(textValue);
  const payload = `${expiresAt}.${textHash}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

function attachTeacherVoiceToken(answer) {
  return { ...answer, voiceToken: createTeacherVoiceToken(answer.reply) };
}

function activeEntitlement(entitlement) {
  return entitlement && entitlement.status === 'active' && entitlement.product === 'russian';
}

async function canUseTeacherChat(req) {
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

function text(value, max = 500) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function int(value, min = 0, max = 5000) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(min, Math.min(max, n));
}

function bool(value) {
  return Boolean(value);
}

function pickCounts(value, keys) {
  const source = value && typeof value === 'object' ? value : {};
  return keys.reduce((out, key) => {
    out[key] = int(source[key], 0, 5000);
    return out;
  }, {});
}

function sanitizeContext(value) {
  const ctx = value && typeof value === 'object' ? value : {};
  const plan = ctx.plan && typeof ctx.plan === 'object' ? ctx.plan : {};
  const performance = ctx.performance && typeof ctx.performance === 'object' ? ctx.performance : {};
  const current = ctx.current && typeof ctx.current === 'object' ? ctx.current : {};
  const sentence = current.sentence && typeof current.sentence === 'object' ? current.sentence : {};
  return {
    language: text(ctx.language || 'russian', 40),
    mode: text(ctx.mode, 40),
    screen: text(ctx.screen, 700),
    courseAccess: text(ctx.courseAccess, 40),
    teacherMode: text(ctx.teacherMode, 40),
    teacherAutopilotEnabled: bool(ctx.teacherAutopilotEnabled),
    teacherLiveListening: bool(ctx.teacherLiveListening),
    studyActive: bool(ctx.studyActive),
    revealed: bool(ctx.revealed),
    recallAttempted: bool(ctx.recallAttempted),
    spokenRecallAttempt: text(ctx.spokenRecallAttempt, 260),
    coachFirst: bool(ctx.coachFirst),
    difficulty: {
      level: text(ctx.difficulty?.level, 40),
      reasons: Array.isArray(ctx.difficulty?.reasons) ? ctx.difficulty.reasons.slice(0, 6).map(item => text(item, 90)) : [],
      recommendedPace: text(ctx.difficulty?.recommendedPace, 80),
      typedAttempt: {
        present: bool(ctx.difficulty?.typedAttempt?.present),
        raw: text(ctx.difficulty?.typedAttempt?.raw, 260),
        target: text(ctx.difficulty?.typedAttempt?.target, 260),
        translit: text(ctx.difficulty?.typedAttempt?.translit, 260),
        checkedAs: text(ctx.difficulty?.typedAttempt?.checkedAs, 40),
        state: text(ctx.difficulty?.typedAttempt?.state, 30),
        suggestedRating: text(ctx.difficulty?.typedAttempt?.suggestedRating, 20),
        overlap: ctx.difficulty?.typedAttempt?.overlap === null ? null : int(Math.round(Number(ctx.difficulty?.typedAttempt?.overlap || 0) * 100), 0, 100),
        missing: Array.isArray(ctx.difficulty?.typedAttempt?.missing) ? ctx.difficulty.typedAttempt.missing.slice(0, 5).map(item => text(item, 60)) : [],
        extra: Array.isArray(ctx.difficulty?.typedAttempt?.extra) ? ctx.difficulty.typedAttempt.extra.slice(0, 5).map(item => text(item, 60)) : []
      }
    },
    plan: {
      focus: text(plan.focus, 120),
      reason: text(plan.reason, 180),
      action: text(plan.action, 80),
      newLimit: int(plan.newLimit, 0, 50),
      dueCount: int(plan.dueCount, 0, 5000),
      weakCount: int(plan.weakCount, 0, 5000),
      todayNew: int(plan.todayNew, 0, 5000),
      todayReviews: int(plan.todayReviews, 0, 5000),
      sessionAccuracy: plan.sessionAccuracy === null ? null : int(plan.sessionAccuracy, 0, 100),
      lifetimeAccuracy: plan.lifetimeAccuracy === null ? null : int(plan.lifetimeAccuracy, 0, 100)
    },
    performance: {
      learnedCount: int(performance.learnedCount, 0, 5000),
      active: int(performance.active, 0, 5000),
      dueCount: int(performance.dueCount, 0, 5000),
      weakCount: int(performance.weakCount, 0, 5000),
      dailyGoal: int(performance.dailyGoal, 0, 50),
      remainingGoal: int(performance.remainingGoal, 0, 50),
      plannedNewToday: int(performance.plannedNewToday, 0, 50),
      todayNew: int(performance.todayNew, 0, 5000),
      todayReviews: int(performance.todayReviews, 0, 5000),
      streak: int(performance.streak, 0, 5000),
      completedFirstGuidedSession: bool(performance.completedFirstGuidedSession),
      lapses: int(performance.lapses, 0, 5000),
      sessionRated: int(performance.sessionRated, 0, 5000),
      sessionAccuracy: performance.sessionAccuracy === null ? null : int(performance.sessionAccuracy, 0, 100),
      lifetimeAccuracy: performance.lifetimeAccuracy === null ? null : int(performance.lifetimeAccuracy, 0, 100),
      ratings: pickCounts(performance.ratings, ['again', 'hard', 'good', 'easy']),
      boxes: pickCounts(performance.boxes, ['0', '1', '2', '3', '4', '5'])
    },
    current: current.kind ? {
      kind: text(current.kind, 30),
      idx: int(current.idx, 0, 5000),
      type: text(current.type, 40),
      sessionDelayed: bool(current.sessionDelayed),
      sessionRepair: bool(current.sessionRepair),
      russian: text(sentence.russian, 260),
      translit: text(sentence.translit, 260),
      english: text(sentence.english, 260),
      lastRating: text(current.lastRating, 20),
      box: int(current.box, 0, 5),
      lapses: int(current.lapses, 0, 100)
    } : null
  };
}

function systemPrompt() {
  return [
    'You are the Lang5K AI Teacher for the Russian course.',
    'Your only job is to help the student learn Russian inside Lang5K as fast as practical.',
    'You know the app map: Home explains the method; Study is the main guided path; Browse is manual search after guided work; Review Bin repairs weak sentences; Cloze drills one missing word; Dictation checks listening; Pricing, Checkout, Access, Contact, Attribution, Terms, Privacy, and Refunds are separate pages.',
    'Act like a normal human Russian teacher: answer language questions, learner frustration, confidence issues, lesson doubts, customer/access questions, and simple conversation that affects the study session.',
    'If the student drifts away from learning, acknowledge briefly, then refocus them on Russian or the current Lang5K card. Do not answer unrelated risky tasks.',
    'If the student asks any Russian, language-learning, pronunciation, spelling, meaning, grammar, course, or Lang5K doubt, answer naturally even if they do not use app command words.',
    'If the student greets you, checks whether you can hear them, or asks a simple live-teacher status question, answer briefly like a present human teacher, then invite the next language-learning step. Do not dump the study plan unless they ask what to do next.',
    'Method: prioritize due spaced reviews, weak repair, then new sentences. Use active recall before reveal, delayed recall, honest self-rating, cloze, dictation, and daily limits. Never encourage passive browsing as the main path.',
    'Use the supplied student performance, typed attempt analysis, due reviews, weak cards, lapses, current screen, and current sentence. Be specific and decisive.',
    'If context.teacherMode is self-guided, answer and advise but do not request automatic actions unless the student clearly asks for an action. If context.teacherAutopilotEnabled is true, choose the next best step in words; the app will wait for the student to act or ask before changing screens.',
    'If context.teacherLiveListening is true, behave like a live teacher: use the latest transcript as what the student just said, ignore silence/noise, and guide the next step without requiring button instructions.',
    'In AI Teacher Autopilot, infer the next best step from the complete context instead of repeating a fixed script. Decide what the student needs now: listen, attempt recall, reveal, rate, repair, reduce new material, continue, or ask a clarifying question, but do not force movement without a student command.',
    'Use spokenRecallAttempt when present as the student spoken recall transcript. Treat it as imperfect browser transcription, compare it gently to the current target, and prefer honest recall quality over speed.',
    'If the latest student message is a navigation, status, greeting, or "where do I start" question, answer that message directly and do not judge an old recall attempt unless the student asks you to evaluate their answer.',
    'Be wise and calm, not verbose. In live mode, one short spoken instruction is usually enough. Do not list all metrics, due counts, weak counts, and plans unless the student asks for a report.',
    'Sense difficulty. If accuracy is low, weak cards are high, lapses are repeated, or the typed attempt is partial/wrong, slow the pace, repair one sentence, and block extra new material.',
    'If the student is doing well, keep momentum but still prefer recall quality over speed. The easiest fast path is not more content; it is the right next recall at the right time.',
    'Stay useful to the lesson. For unrelated chatter, gently refocus instead of saying you are unable to chat.',
    'Do not claim native-level quality guarantees, medical/legal/financial advice, or abilities the app does not have. Do not say you can grade pronunciation unless the app provides a transcript or visible answer.',
    'Keep replies short enough to be spoken aloud: normally 1 sentence, 2 only when needed. Never monologue while the student is trying to recall.',
    'Return one action only when the latest student message explicitly asks for that action. Use reveal/rating actions only after the context says a recall attempt or revealed answer makes that safe.'
  ].join('\n');
}

function responseSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    properties: {
      reply: {
        type: 'string',
        minLength: 1,
        maxLength: 360
      },
      action: {
        type: 'string',
        enum: ACTIONS
      },
      speak: {
        type: 'boolean'
      },
      difficulty: {
        type: 'string',
        enum: ['easy', 'normal', 'hard']
      },
      focus: {
        type: 'string',
        enum: ['study', 'review', 'repair', 'cloze', 'dictation', 'navigation', 'access', 'scope']
      }
    },
    required: ['reply', 'action', 'speak', 'difficulty', 'focus']
  };
}

function outputText(data) {
  if (typeof data?.output_text === 'string') return data.output_text;
  const chunks = [];
  for (const item of data?.output || []) {
    for (const part of item.content || []) {
      if (typeof part.text === 'string') chunks.push(part.text);
    }
  }
  return chunks.join('').trim();
}

function parseTeacherReply(raw) {
  const clean = text(raw, 2000);
  try {
    const parsed = JSON.parse(clean);
    return normalizeReply(parsed);
  } catch (_) {
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return normalizeReply(JSON.parse(match[0]));
      } catch (_) {}
    }
  }
  return { reply: clean || 'I can help with the next Russian lesson step. Press Guide me and I will choose it.', action: 'none', speak: true };
}

function normalizeReply(value) {
  const reply = text(value?.reply, 360) || 'I can help with the next Russian lesson step.';
  const action = ACTIONS.includes(value?.action) ? value.action : 'none';
  const difficulty = ['easy', 'normal', 'hard'].includes(value?.difficulty) ? value.difficulty : 'normal';
  const focus = ['study', 'review', 'repair', 'cloze', 'dictation', 'navigation', 'access', 'scope'].includes(value?.focus)
    ? value.focus
    : 'study';
  return { reply, action, speak: value?.speak !== false, difficulty, focus };
}

function isLanguageScopeMessage(message) {
  const textMessage = String(message || '').toLowerCase();
  if (/[а-яё]/i.test(textMessage)) return true;
  return /\b(russian|русский|language|languages|word|words|sentence|phrase|grammar|case|ending|conjugat|declension|gender|pronoun|verb|noun|adjective|pronunciation|pronounce|accent|spell|spelling|meaning|translate|translation|translit|cyrillic|vocabulary|lesson|card|review|browse|cloze|dictation|audio|listen|listening|hear me|heard me|can you hear|mic|microphone|are you there|hello|hi|hey|speak|recall|remember|memor|study|learn|fluency|practice|answer|mistake|wrong|correct|lang5k|course|teacher|autopilot|student|navigation|pricing|checkout|access|account|contact|support|refund|privacy|terms|attribution|paid|payment|checkout|how do i say|what does|what is the meaning|where do i start|what should i study|what now|next step)\b/.test(textMessage);
}

function learnerConversation(message) {
  const textMessage = String(message || '').toLowerCase();
  return /\b(confused|stuck|frustrated|overwhelmed|tired|lost|too hard|difficult|hard for me|slow|bad at|can't remember|cannot remember|need a break|can we talk|talk with you|help me|i need help|i don't understand|i do not understand|this lesson|this card|my progress|my answer|my pronunciation|my memory)\b/.test(textMessage);
}

function riskyUnrelatedTask(message) {
  const textMessage = String(message || '').toLowerCase();
  const broadContentTask = /\b(write|draft|make|create|rewrite|summarize|translate|translation|solve|diagnose|advise)\b/.test(textMessage);
  const hardTopicContent = /\b(business plan|essay|email|bedtime story|lawsuit|legal document|investment plan|crypto|bitcoin|stock|medical diagnosis|homework)\b/.test(textMessage);
  return broadContentTask && hardTopicContent;
}

function isOutOfScopeMessage(message) {
  const textMessage = String(message || '').toLowerCase();
  const languageIntent = isLanguageScopeMessage(textMessage);
  const learnerIntent = learnerConversation(textMessage);
  const customerIntent = /\b(lang5k|course|app|site|website|account|access|paid|payment|money|refund|privacy|terms|attribution|support|contact|checkout|subscription|login)\b/.test(textMessage);
  const hardOffTopic = /\b(weather|news|politic|election|recipe|joke|money|stock|crypto|bitcoin|investment|medical|doctor|diagnos|lawyer|legal|lawsuit|movie|music|song|poem|story|dating|sports|shopping|travel booking|code|programming|math|homework|essay|bedtime story|write an email|business plan)\b/.test(textMessage);
  if (riskyUnrelatedTask(textMessage)) return true;
  if (languageIntent || learnerIntent || customerIntent) return false;
  if (hardOffTopic) return false;
  return false;
}

function scopeReply() {
  return attachTeacherVoiceToken({
    reply: 'Let us keep this useful for your Russian. We can turn that into a Russian phrase, talk about this lesson, or continue the current card.',
    action: 'none',
    speak: true,
    difficulty: 'normal',
    focus: 'scope',
    modelTier: 'scope'
  });
}

async function fetchWithTimeout(url, options, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function audioContentType(req) {
  const contentType = String(req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
  if (['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg'].includes(contentType)) {
    return contentType;
  }
  return '';
}

function extensionForType(contentType) {
  if (contentType.includes('mp4')) return 'm4a';
  if (contentType.includes('mpeg') || contentType.includes('mp3')) return 'mp3';
  if (contentType.includes('wav')) return 'wav';
  if (contentType.includes('ogg')) return 'ogg';
  return 'webm';
}

function isTranscriptionRequest(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();
  return req.query?.transcribe === '1' || contentType.startsWith('audio/');
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
  form.append('file', new Blob([buffer], { type: contentType }), `live-teacher.${extensionForType(contentType)}`);
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

async function handleTranscriptionRequest(req, res, access) {
  const ipAllowed = await checkRateLimit(`teacher_transcribe:ip:${clientIp(req)}`, 30, 60);
  const subjectAllowed = await checkRateLimit(`teacher_transcribe:subject:${access.subject}`, 160, 60 * 60);
  const dailyAllowed = await checkRateLimit(`teacher_transcribe:day:${access.subject}`, 700, 24 * 60 * 60);
  if (!ipAllowed || !subjectAllowed || !dailyAllowed) {
    res.status(429).json({ error: 'Too many live teacher transcription requests.' });
    return;
  }
  const contentType = audioContentType(req);
  if (!contentType) {
    res.status(415).json({ error: 'Unsupported live teacher audio format.' });
    return;
  }
  const buffer = await readBufferBody(req, MAX_AUDIO_BYTES);
  if (buffer.length < 200) {
    res.status(200).json({ ok: true, text: '' });
    return;
  }
  const transcript = await transcribeAudio(buffer, contentType);
  res.status(200).json({ ok: true, text: transcript });
}

function hardSignal(message, context) {
  const textMessage = String(message || '').toLowerCase();
  const hardWords = /\b(confus|lost|stuck|hard|difficult|wrong|mistake|again|barely|forgot|forget|struggl|do not understand|don't understand|dont understand|why|grammar|case|ending|conjugat|pronunciation|accent|native|explain)\b/.test(textMessage);
  const plan = context.plan || {};
  const performance = context.performance || {};
  const difficulty = context.difficulty || {};
  const typed = difficulty.typedAttempt || {};
  const lowAccuracy = value => value !== null && value !== undefined && Number(value) < 70;
  return Boolean(
    hardWords ||
    difficulty.level === 'hard' ||
    typed.state === 'wrong' ||
    typed.state === 'partial' ||
    ['again', 'hard'].includes(typed.suggestedRating) ||
    lowAccuracy(plan.sessionAccuracy) ||
    lowAccuracy(performance.sessionAccuracy) ||
    Number(plan.weakCount) >= 6 ||
    Number(performance.weakCount) >= 6 ||
    Number(plan.dueCount) >= 25 ||
    Number(performance.lapses) >= 3 ||
    context.current?.lastRating === 'again' ||
    Number(context.current?.lapses) >= 2
  );
}

function teacherModels() {
  return {
    fast: String(process.env.LANG5K_TEACHER_FAST_MODEL || process.env.LANG5K_TEACHER_MODEL || DEFAULT_FAST_MODEL).trim(),
    premium: String(process.env.LANG5K_TEACHER_PREMIUM_MODEL || DEFAULT_PREMIUM_MODEL).trim()
  };
}

function chooseTeacherModel(message, context) {
  const models = teacherModels();
  if (hardSignal(message, context)) return { model: models.premium, tier: 'premium' };
  return { model: models.fast, tier: 'fast' };
}

async function askOpenAi(message, context) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) {
    const error = new Error('Teacher AI is not configured.');
    error.statusCode = 503;
    throw error;
  }
  const chosen = chooseTeacherModel(message, context);
  const response = await fetchWithTimeout(OPENAI_RESPONSES_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: chosen.model,
      instructions: systemPrompt(),
      input: [
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: JSON.stringify({ studentMessage: message, context }, null, 2)
            }
          ]
        }
      ],
      reasoning: { effort: 'low' },
      max_output_tokens: 700,
      text: {
        format: {
          type: 'json_schema',
          name: 'lang5k_teacher_reply',
          schema: responseSchema(),
          strict: true
        }
      }
    })
  });
  if (!response.ok) {
    const providerText = await response.text().catch(() => '');
    const error = new Error(providerText || 'Teacher AI request failed.');
    error.statusCode = response.status === 401 || response.status === 403 || response.status === 429 ? 503 : response.status;
    throw error;
  }
  const answer = parseTeacherReply(outputText(await response.json()));
  return attachTeacherVoiceToken({ ...answer, modelTier: chosen.tier });
}

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    const access = await canUseTeacherChat(req);
    if (!access.ok) {
      res.status(401).json({ error: 'Active Lang5K access is required for the AI teacher.' });
      return;
    }
    if (isTranscriptionRequest(req)) {
      await handleTranscriptionRequest(req, res, access);
      return;
    }
    const ipAllowed = await checkRateLimit(`teacher_chat:ip:${clientIp(req)}`, 12, 60);
    const ipDailyAllowed = await checkRateLimit(`teacher_chat:ip_day:${clientIp(req)}`, 220, 24 * 60 * 60);
    const previewDailyAllowed = access.subject.startsWith('preview:')
      ? await checkRateLimit(`teacher_chat:preview_ip_day:${clientIp(req)}`, 120, 24 * 60 * 60)
      : true;
    const subjectAllowed = await checkRateLimit(`teacher_chat:subject:${access.subject}`, 80, 60 * 60);
    const dailyAllowed = await checkRateLimit(`teacher_chat:day:${access.subject}`, 220, 24 * 60 * 60);
    if (!ipAllowed || !ipDailyAllowed || !previewDailyAllowed || !subjectAllowed || !dailyAllowed) {
      res.status(429).json({ error: 'Too many AI teacher requests.' });
      return;
    }
    const body = await readJsonBody(req, 24 * 1024);
    const message = text(body.message, 700);
    if (!message) {
      res.status(400).json({ error: 'Teacher message is required.' });
      return;
    }
    const context = sanitizeContext(body.context);
    if (isOutOfScopeMessage(message)) {
      res.status(200).json({ ok: true, ...scopeReply() });
      return;
    }
    const answer = await askOpenAi(message, context);
    res.status(200).json({ ok: true, ...answer });
  } catch (error) {
    const status = [400, 401, 403, 405, 413, 429].includes(error.statusCode) ? error.statusCode : 503;
    const message = status === 429
      ? 'Too many AI teacher requests.'
      : status === 401 || status === 403
        ? 'Active Lang5K access is required for the AI teacher.'
        : status === 503
          ? 'AI teacher is temporarily unavailable.'
          : 'AI teacher request was invalid.';
    res.status(status).json({ error: message });
  }
};

module.exports._test = {
  audioContentType,
  extensionForType,
  isLanguageScopeMessage,
  isOutOfScopeMessage,
  isTranscriptionRequest
};
