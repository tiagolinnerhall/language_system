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
  if (!source.includes(marker)) throw new Error(message);
}

const nextStep = extractFunction('getAutopilotNextStep');

mustInclude(nextStep, 'if(isCoachFirstMode()){', 'Autopilot next step must check coach-first mode before recommending advanced drills.');
mustInclude(nextStep, "title:'Next: stay with the guided path'", 'Coach-first autopilot should use guided-path copy.');
mustInclude(nextStep, "action:'goToTodayPlan()'", 'Coach-first autopilot should return learners to the guided plan.');

const gateIndex = nextStep.indexOf('if(isCoachFirstMode()){');
const weakIndex = nextStep.indexOf('weakCount>0');
const dictationIndex = nextStep.indexOf("action:'showDictationView()'");
const clozeIndex = nextStep.indexOf("action:'showClozeView()'");

if (gateIndex < 0 || weakIndex < 0 || gateIndex > weakIndex) {
  throw new Error('Coach-first gate must run before weak-bin recommendations.');
}
if (dictationIndex < 0 || clozeIndex < 0) {
  throw new Error('Autopilot next step must still include dictation and cloze recommendations after coach-first mode.');
}
if (gateIndex > dictationIndex || gateIndex > clozeIndex) {
  throw new Error('Coach-first gate must run before dictation or cloze recommendations.');
}

console.log('Coach-first autopilot next-step gate validation passed.');
