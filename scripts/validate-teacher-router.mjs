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

mustInclude('teacher-chat', chat, "const DEFAULT_FAST_MODEL = 'gpt-5.4-mini'");
mustInclude('teacher-chat', chat, "const DEFAULT_PREMIUM_MODEL = 'gpt-5.5'");
mustInclude('teacher-chat', chat, 'function hardSignal(message, context)');
mustInclude('teacher-chat', chat, 'function chooseTeacherModel(message, context)');
mustInclude('teacher-chat', chat, 'LANG5K_TEACHER_FAST_MODEL');
mustInclude('teacher-chat', chat, 'LANG5K_TEACHER_PREMIUM_MODEL');
mustInclude('teacher-chat', chat, 'typedAttempt');
mustInclude('teacher-chat', chat, 'Sense difficulty.');
mustInclude('teacher-chat', chat, 'spokenRecallAttempt');
mustInclude('teacher-chat', chat, 'teacherLiveListening');
mustInclude('teacher-chat', chat, 'language, or language-learning question');
mustInclude('teacher-chat', chat, 'present human teacher');
mustInclude('teacher-chat', chat, 'Do not dump the study plan');
mustInclude('teacher-chat', chat, '/[а-яё]/i.test(textMessage)');
mustInclude('teacher-chat', chat, 'function isOutOfScopeMessage(message)');
mustInclude('teacher-chat', chat, 'hardOffTopic');
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
mustInclude('app.html', app, 'teacherQueuedAiRequest');
mustInclude('app.html', app, 'raw:value.slice');
mustInclude('app.html', app, 'activeSession:activeSessionPayload()');
mustInclude('app.html', app, 'let teacherLiveListening=false');
mustInclude('app.html', app, 'teacherRecognition.continuous=true');
mustInclude('app.html', app, 'function teacherStartLiveListening');
mustInclude('app.html', app, 'function teacherToggleLiveListening');
mustInclude('app.html', app, 'function teacherTranscriptLooksUseful');
mustInclude('app.html', app, 'Pause Listening');

mustInclude('teacher-voice', voice, "eleven_flash_v2_5");
mustInclude('teacher-voice', voice, 'function textFromRequestBody(body)');
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
if (!teacherChatModule._test.isOutOfScopeMessage('what is the weather today?')) {
  throw new Error('Teacher server scope allowed an unrelated weather question.');
}

console.log('Teacher model router validation passed.');
