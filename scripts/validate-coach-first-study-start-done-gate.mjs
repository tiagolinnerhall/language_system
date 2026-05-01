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
  'const doneAction=coachFirst?{label:\'Back to guided plan\',action:\'goToTodayPlan()\'}:{label:\'Back to Browse\',action:\'exitStudy()\'};',
  'Coach-first done fallback must return learners to the guided plan instead of Browse.'
);
mustInclude(
  showStudyStart,
  '<button class="btn btn-secondary" onclick="${doneAction.action}">${doneAction.label}</button>',
  'Done fallback button must render the coach-first-aware action.'
);

if (showStudyStart.includes('<button class="btn btn-secondary" onclick="exitStudy()">Back to Browse</button>')) {
  throw new Error('Study start must not hard-code Back to Browse in the done fallback.');
}

const gateIndex = showStudyStart.indexOf('const doneAction=coachFirst?');
const renderIndex = showStudyStart.indexOf('document.getElementById(\'studyContent\').innerHTML');
if (gateIndex < 0 || renderIndex < 0 || gateIndex > renderIndex) {
  throw new Error('Coach-first done action must be calculated before rendering the study-start card.');
}

console.log('Coach-first study-start done fallback validation passed.');
