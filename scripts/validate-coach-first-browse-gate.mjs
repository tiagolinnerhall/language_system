import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const updateCoachModeUI = extractFunction('updateCoachModeUI');
if (!updateCoachModeUI.includes("data-advanced-mode=\"true\"")) {
  throw new Error('Coach-first mode must keep advanced mode tabs hidden.');
}

const renderTodayPlanHome = extractFunction('renderTodayPlanHome');
const browseButton = '<button class="btn btn-secondary" onclick="showBrowseView()">Browse all sentences</button>';
if (!renderTodayPlanHome.includes("${coachFirst?'':`")) {
  throw new Error('Coach-first Today plan must conditionally hide the browse shortcut.');
}
if (!renderTodayPlanHome.includes(browseButton)) {
  throw new Error('Today plan should still offer browsing after coach-first mode is complete.');
}
const browseButtonPosition = renderTodayPlanHome.indexOf(browseButton);
const conditionalPosition = renderTodayPlanHome.indexOf("${coachFirst?'':`");
if (conditionalPosition < 0 || browseButtonPosition < conditionalPosition) {
  throw new Error('Browse shortcut must be inside the non-coach-first conditional.');
}

console.log('Coach-first browse gate validation passed.');
