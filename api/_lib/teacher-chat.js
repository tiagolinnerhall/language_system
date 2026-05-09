const crypto = require('crypto');
const { verifyAccessToken } = require('./access');
const { accountTokenFromRequest, clientIp, cookieValue, noStore, readJsonBody, tokenFromRequest } = require('./http');
const { hasPreviewSession, SESSION_COOKIE } = require('./preview');
const { checkRateLimit, getEntitlement } = require('./store');

const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_FAST_MODEL = 'gpt-5.4-mini';
const DEFAULT_PREMIUM_MODEL = 'gpt-5.5';
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
    'Answer only a Russian, language, or language-learning question, or a Lang5K navigation/workflow question. Refuse everything else briefly and return focus "scope".',
    'Method: prioritize due spaced reviews, weak repair, then new sentences. Use active recall before reveal, delayed recall, honest self-rating, cloze, dictation, and daily limits. Never encourage passive browsing as the main path.',
    'Use the supplied student performance, typed attempt analysis, due reviews, weak cards, lapses, current screen, and current sentence. Be specific and decisive.',
    'If context.teacherMode is self-guided, answer and advise but do not request automatic actions unless the student clearly asks for an action. If context.teacherAutopilotEnabled is true, you may choose the next safe study action.',
    'Use spokenRecallAttempt when present as the student spoken recall transcript. Treat it as imperfect browser transcription, compare it gently to the current target, and prefer honest recall quality over speed.',
    'Sense difficulty. If accuracy is low, weak cards are high, lapses are repeated, or the typed attempt is partial/wrong, slow the pace, repair one sentence, and block extra new material.',
    'If the student is doing well, keep momentum but still prefer recall quality over speed. The easiest fast path is not more content; it is the right next recall at the right time.',
    'Stay lesson-only. If the user asks unrelated questions, politely refuse and redirect to Russian learning or Lang5K navigation.',
    'Do not claim native-level quality guarantees, medical/legal/financial advice, or abilities the app does not have. Do not say you can grade pronunciation unless the app provides a transcript or visible answer.',
    'Keep replies short enough to be spoken aloud: normally 1 to 3 sentences.',
    'Return one action only when it clearly helps. Use reveal/rating actions only after the context says a recall attempt or revealed answer makes that safe.'
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
        maxLength: 650
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
  const reply = text(value?.reply, 650) || 'I can help with the next Russian lesson step.';
  const action = ACTIONS.includes(value?.action) ? value.action : 'none';
  const difficulty = ['easy', 'normal', 'hard'].includes(value?.difficulty) ? value.difficulty : 'normal';
  const focus = ['study', 'review', 'repair', 'cloze', 'dictation', 'navigation', 'access', 'scope'].includes(value?.focus)
    ? value.focus
    : 'study';
  return { reply, action, speak: value?.speak !== false, difficulty, focus };
}

function isLanguageScopeMessage(message) {
  const textMessage = String(message || '').toLowerCase();
  return /\b(russian|language|languages|word|words|sentence|phrase|grammar|case|ending|conjugat|declension|pronoun|verb|noun|adjective|pronunciation|accent|spell|spelling|meaning|translate|translation|translit|cyrillic|vocabulary|lesson|card|review|cloze|dictation|audio|listen|speak|recall|remember|memor|study|learn|fluency|practice|answer|mistake|wrong|correct|why|how do i say|what does)\b/.test(textMessage);
}

function isOutOfScopeMessage(message) {
  const textMessage = String(message || '').toLowerCase();
  const offTopic = /\b(weather|news|politic|recipe|joke|money|stock|crypto|medical|doctor|lawyer|legal|movie|music|dating|sports|shopping|travel booking|code|programming)\b/.test(textMessage);
  return offTopic && !isLanguageScopeMessage(textMessage);
}

function scopeReply() {
  return {
    reply: 'I can only help with Russian, language-learning questions, this lesson, and Lang5K navigation. Ask me about spelling, pronunciation, meaning, grammar, recall, reviews, or what to study next.',
    action: 'none',
    speak: true,
    difficulty: 'normal',
    focus: 'scope',
    modelTier: 'scope'
  };
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
  return { ...answer, modelTier: chosen.tier };
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
    const ipAllowed = await checkRateLimit(`teacher_chat:ip:${clientIp(req)}`, 12, 60);
    const subjectAllowed = await checkRateLimit(`teacher_chat:subject:${access.subject}`, 80, 60 * 60);
    const dailyAllowed = await checkRateLimit(`teacher_chat:day:${access.subject}`, 220, 24 * 60 * 60);
    if (!ipAllowed || !subjectAllowed || !dailyAllowed) {
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
