import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

const root = process.cwd();
const app = readFileSync(join(root, 'app.html'), 'utf8');
const chat = readFileSync(join(root, 'api/_lib/teacher-chat.js'), 'utf8');
const voice = readFileSync(join(root, 'api/_lib/teacher-voice.js'), 'utf8');
const require = createRequire(import.meta.url);
const teacherChatModule = require(join(root, 'api/_lib/teacher-chat.js'));

function mustInclude(name, source, needle) {
  if (!source.includes(needle)) throw new Error(`${name} missing ${needle}`);
}

mustInclude('teacher-chat', chat, "const DEFAULT_FAST_MODEL = 'gpt-5.5'");
mustInclude('teacher-chat', chat, "const DEFAULT_PREMIUM_MODEL = 'gpt-5.5'");
mustInclude('teacher-chat', chat, 'function hardSignal(message, context)');
mustInclude('teacher-chat', chat, 'function chooseTeacherModel(message, context)');
mustInclude('teacher-chat', chat, 'hardSignal(message, context)');
mustInclude('teacher-chat', chat, "LANG5K_TRANSCRIBE_MODEL || 'gpt-4o-transcribe'");
mustInclude('teacher-chat', chat, 'LANG5K_TRANSCRIBE_TIMEOUT_MS');
mustInclude('teacher-chat', chat, 'fetchWithTimeout(OPENAI_TRANSCRIPTIONS_URL');
mustInclude('teacher-chat', chat, 'LANG5K_TEACHER_FAST_MODEL');
mustInclude('teacher-chat', chat, 'LANG5K_TEACHER_PREMIUM_MODEL');
mustInclude('teacher-chat', chat, 'LANG5K_TEACHER_REASONING_EFFORT');
mustInclude('teacher-chat', chat, 'LANG5K_TEACHER_FAST_REASONING_EFFORT');
mustInclude('teacher-chat', chat, 'Default reply language is English.');
mustInclude('teacher-chat', chat, 'teacherReasoningEffort(chosen.tier)');
mustInclude('teacher-chat', chat, 'typedAttempt');
mustInclude('teacher-chat', chat, 'Sense difficulty.');
mustInclude('teacher-chat', chat, 'spokenRecallAttempt');
mustInclude('teacher-chat', chat, 'teacherLiveListening');
mustInclude('teacher-chat', chat, 'normal human Russian teacher');
mustInclude('teacher-chat', chat, 'present human teacher');
mustInclude('teacher-chat', chat, 'Do not dump the study plan');
mustInclude('teacher-chat', chat, '/[а-яё]/i.test(textMessage)');
mustInclude('teacher-chat', chat, 'function isOutOfScopeMessage(message)');
mustInclude('teacher-chat', chat, 'hardOffTopic');
mustInclude('teacher-chat', chat, 'learnerConversation');
mustInclude('teacher-chat', chat, 'In AI Teacher Autopilot, infer the next best step');
mustInclude('teacher-chat', chat, 'function createTeacherVoiceToken(textValue)');
mustInclude('teacher-chat', chat, 'voiceToken');
mustInclude('teacher-chat', chat, 'modelTier');

mustInclude('app.html', app, 'function teacherCurrentAttemptAnalysis()');
mustInclude('app.html', app, 'function teacherDifficultyProfile(plan,performance,currentPayload,attempt)');
mustInclude('app.html', app, 'difficulty,');
mustInclude('app.html', app, 'sessionCounts:{...studySessionStats}');
mustInclude('app.html', app, 'current recall attempt is');
mustInclude('app.html', app, 'function teacherGuideLocal()');
mustInclude('app.html', app, 'Autopilot: decide the next best step');
mustInclude('app.html', app, "source==='autopilot'");
mustInclude('app.html', app, 'TEACHER_AUTOPILOT_COOLDOWN_MS');
mustInclude('app.html', app, 'function teacherShouldAskAiFirst(text)');
mustInclude('app.html', app, 'function teacherIsListeningCheck(text)');
mustInclude('app.html', app, 'function teacherAnswerListeningCheck()');
mustInclude('app.html', app, 'Yes, I am listening.');
mustInclude('app.html', app, 'function syncTeacherRecognitionLanguage()');
mustInclude('app.html', app, "return teacherInRussianSpeechWindow()?'ru-RU':'en-US'");
mustInclude('app.html', app, 'teacherTranscriptEchoesTeacher');
mustInclude('app.html', app, 'function teacherShortCommandEchoPhraseMatch');
mustInclude('app.html', app, 'function teacherBackchannelOnly');
mustInclude('app.html', app, 'function teacherDuplicateTranscript(raw)');
mustInclude('app.html', app, 'function teacherRatingQuestionSignal(text)');
mustInclude('app.html', app, 'function teacherRatingCommandIntent(text,rating)');
mustInclude('app.html', app, 'function teacherRecallTranscriptSignal(text)');
mustInclude('app.html', app, 'teacherVoicePlaybackActiveUntil');
mustInclude('app.html', app, 'teacherAppAudioOutputUntil');
mustInclude('app.html', app, 'teacherQueuedAiRequests');
mustInclude('app.html', app, 'teacherAutopilotActionBlockedUntil');
mustInclude('app.html', app, 'teacherAutopilotActivationActionsToSuppress');
mustInclude('app.html', app, 'function teacherActionSuppressed(action');
mustInclude('app.html', app, 'function teacherRecallAffordanceHTML()');
mustInclude('app.html', app, 'function teacherMarkQuietAttempt()');
mustInclude('app.html', app, 'function teacherRussianQuestionSignal(text)');
mustInclude('app.html', app, 'function teacherStartServerMic');
mustInclude('app.html', app, 'const shouldStartServerMic=serverMicSupported');
mustInclude('app.html', app, 'function teacherRecentLearnerTranscriptMatches');
mustInclude('app.html', app, 'TEACHER_SERVER_MIC_FLUSH_MS');
mustInclude('app.html', app, 'TEACHER_SERVER_MIC_STALE_MS');
mustInclude('app.html', app, 'teacherServerMicRateLimitedUntil');
mustInclude('app.html', app, '/api/teacher-chat?transcribe=1');
mustInclude('app.html', app, 'teacherServerMicActive');
mustInclude('app.html', app, 'raw:value.slice');
mustInclude('app.html', app, 'activeSession:activeSessionPayload()');
mustInclude('app.html', app, 'function resumeActiveSessionView()');
mustInclude('app.html', app, 'hostedAudioManifestPromise');
mustInclude('app.html', app, 'function teacherCanUsePremiumAi()');
mustInclude('app.html', app, 'AI Teacher is full-access.');
mustInclude('app.html', app, 'function renderCoachVoiceGuide()');
mustInclude('app.html', app, 'AI voice guide with full access');
mustInclude('app.html', app, 'Live Teacher is listening. Ask naturally; silence is ignored.');
mustInclude('app.html', app, 'teacherDisclosure');
mustInclude('app.html', app, 'Press Start Live Teacher when you want the teacher to listen');
mustInclude('app.html', app, 'function teacherLiveInstructionText()');
mustInclude('teacher-chat', chat, 'teacher_transcribe:ip');
mustInclude('teacher-chat', chat, 'Unsupported live teacher audio format.');
mustInclude('app.html', app, 'let teacherLiveListening=false');
mustInclude('app.html', app, 'recognition.continuous=true');
mustInclude('app.html', app, 'function teacherStartLiveListening');
mustInclude('app.html', app, 'function teacherToggleLiveListening');
mustInclude('app.html', app, 'function teacherTranscriptLooksUseful');
mustInclude('app.html', app, 'Pause Listening');

mustInclude('teacher-voice', voice, "eleven_flash_v2_5");
mustInclude('teacher-voice', voice, 'function textFromRequestBody(body, access)');
mustInclude('teacher-voice', voice, 'function canUseDynamicVoiceText(access)');
mustInclude('teacher-voice', voice, 'body.text');
mustInclude('teacher-voice', voice, 'function verifyTeacherVoiceToken(textValue, tokenValue)');
mustInclude('teacher-voice', voice, 'voiceToken');

if (!teacherChatModule._test?.isLanguageScopeMessage('что значит привет')) {
  throw new Error('Teacher server scope rejected a Cyrillic Russian question.');
}
if (teacherChatModule._test.isOutOfScopeMessage('how do I say weather in Russian?')) {
  throw new Error('Teacher server scope rejected a legitimate translation question with ordinary vocabulary.');
}
if (!teacherChatModule._test.isOutOfScopeMessage('translate this business plan into Russian')) {
  throw new Error('Teacher server scope allowed an unrelated business-plan translation task.');
}
if (teacherChatModule._test.isOutOfScopeMessage('I am frustrated and this feels too hard')) {
  throw new Error('Normal learner frustration must be handled like a human teacher, not refused as out of scope.');
}
if (teacherChatModule._test.isOutOfScopeMessage('can I talk with you for a second about this lesson')) {
  throw new Error('Normal student conversation about the lesson must not be refused as out of scope.');
}
if (teacherChatModule._test.isOutOfScopeMessage('what is the weather today?')) {
  throw new Error('Ordinary off-focus chatter should be gently refocused by the teacher, not blocked before conversation.');
}
if (!teacherChatModule._test.isOutOfScopeMessage('write me a business plan about crypto investments')) {
  throw new Error('Clearly unrelated risky content work should still be refocused.');
}
if (!teacherChatModule._test.isTranscriptionRequest({ query: { transcribe: '1' }, headers: { 'content-type': 'audio/webm' } })) {
  throw new Error('Teacher chat route must handle live mic transcription requests.');
}
const fastChoice = teacherChatModule._test.chooseTeacherModel('hi are you listening', {
  teacherLiveListening: true,
  teacherAutopilotEnabled: true,
  plan: {},
  performance: {},
  difficulty: {},
  current: {}
});
if (fastChoice.tier !== 'fast') {
  throw new Error(`Simple live teacher checks must use the fast route, not premium/high-latency route: ${JSON.stringify(fastChoice)}`);
}
const sanitizedFastChoice = teacherChatModule._test.chooseTeacherModel('hello', teacherChatModule._test.sanitizeContext({
  teacherLiveListening: true,
  teacherAutopilotEnabled: true,
  plan: {},
  performance: {},
  difficulty: {},
  current: {}
}));
if (sanitizedFastChoice.tier !== 'fast') {
  throw new Error(`Sanitized empty performance context must not become low-accuracy premium routing: ${JSON.stringify(sanitizedFastChoice)}`);
}
const hardChoice = teacherChatModule._test.chooseTeacherModel('explain the grammar ending because I am confused', {
  teacherLiveListening: true,
  teacherAutopilotEnabled: true,
  plan: { weakCount: 10 },
  performance: {},
  difficulty: {},
  current: {}
});
if (hardChoice.tier !== 'premium') {
  throw new Error(`Hard grammar or difficulty cases must still use the premium teacher route: ${JSON.stringify(hardChoice)}`);
}
if (teacherChatModule._test.teacherReasoningEffort('fast') !== 'low') {
  throw new Error('Fast live teacher route must default to low reasoning for latency.');
}

console.log('Teacher model router validation passed.');
