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

const renderTodayPlanHome = extractFunction('renderTodayPlanHome');
mustInclude(renderTodayPlanHome, 'const primaryAction=coachFirst?{label:\'Start guided lesson\',action:\'startStudyView()\'}:{label:plan.nextLabel,action:plan.nextAction};', 'Coach-first Today plan must force the primary action back to the guided lesson.');
mustInclude(renderTodayPlanHome, 'onclick="${primaryAction.action}"', 'Today plan primary button must use the coach-first-aware action.');
mustInclude(renderTodayPlanHome, '${primaryAction.label}</button>', 'Today plan primary button must use the coach-first-aware label.');

const forcedActionIndex = renderTodayPlanHome.indexOf('const primaryAction=coachFirst?');
const buttonIndex = renderTodayPlanHome.indexOf('onclick="${primaryAction.action}"');
if (forcedActionIndex < 0 || buttonIndex < 0 || forcedActionIndex > buttonIndex) {
  throw new Error('Coach-first primary action must be chosen before the Today plan button renders.');
}

console.log('Coach-first primary action validation passed.');
