import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const app = readFileSync(join(root, 'app.html'), 'utf8');
const chat = readFileSync(join(root, 'api/_lib/teacher-chat.js'), 'utf8');
const voice = readFileSync(join(root, 'api/_lib/teacher-voice.js'), 'utf8');

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
mustInclude('teacher-chat', chat, 'modelTier');

mustInclude('app.html', app, 'function teacherCurrentAttemptAnalysis()');
mustInclude('app.html', app, 'function teacherDifficultyProfile(plan,performance,currentPayload,attempt)');
mustInclude('app.html', app, 'difficulty,');
mustInclude('app.html', app, 'sessionCounts:{...studySessionStats}');
mustInclude('app.html', app, 'current recall attempt is');

mustInclude('teacher-voice', voice, "eleven_flash_v2_5");

console.log('Teacher model router validation passed.');
