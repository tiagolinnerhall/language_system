import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

function mustInclude(source, marker, message) {
  if (!source.includes(marker)) throw new Error(message || `Missing marker: ${marker}`);
}

const showStudyStart = extractFunction('showStudyStart');
mustInclude(showStudyStart, 'const coachFirst=isCoachFirstMode();', 'Study start must know when coach-first mode is active.');
mustInclude(
  showStudyStart,
  'const showWeakPracticeAction=weakCount>0&&!coachFirst;',
  'Coach-first study start must not expose weak-practice action before a real guided session.'
);
mustInclude(
  showStudyStart,
  '`:showWeakPracticeAction?`',
  'Weak-practice shortcut must be behind the coach-first-aware gate.'
);

const weakGateIndex = showStudyStart.indexOf('const showWeakPracticeAction=weakCount>0&&!coachFirst;');
const weakBranchIndex = showStudyStart.indexOf('`:showWeakPracticeAction?`');
if (weakGateIndex < 0 || weakBranchIndex < 0 || weakGateIndex > weakBranchIndex) {
  throw new Error('Coach-first weak-practice gate must be calculated before rendering the study-start action.');
}

if (showStudyStart.includes('`:weakCount>0?`')) {
  throw new Error('Study start must not render weak-practice shortcut directly from weakCount.');
}

console.log('Coach-first study-start weak-practice gate validation passed.');
