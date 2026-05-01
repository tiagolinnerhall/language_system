import { readFileSync } from 'node:fs';

const app = readFileSync('app.html', 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

function mustInclude(source, marker, message) {
  if (!source.includes(marker)) throw new Error(message);
}

for (const name of ['showClozeView', 'showDictationView']) {
  const fn = extractFunction(name);
  mustInclude(fn, 'if(isCoachFirstMode()){', `${name} must check coach-first mode before rendering.`);
  mustInclude(fn, 'goToTodayPlan();', `${name} coach-first attempts must return to the guided plan.`);
  mustInclude(fn, 'return;', `${name} coach-first gate must stop before rendering the practice view.`);

  const gateIndex = fn.indexOf('if(isCoachFirstMode()){');
  const hideIndex = fn.indexOf('hideAllViews();');
  if (gateIndex < 0 || hideIndex < 0 || gateIndex > hideIndex) {
    throw new Error(`${name} coach-first gate should run before leaving the current guided surface.`);
  }
}

console.log('Coach-first practice view gate validation passed.');
