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

const toggleBinView = extractFunction('toggleBinView');
mustInclude(toggleBinView, 'if(isCoachFirstMode()){', 'Review bin view must check coach-first mode before rendering.');
mustInclude(toggleBinView, 'goToTodayPlan();', 'Coach-first review bin attempts must return to the guided plan.');
mustInclude(toggleBinView, 'return;', 'Coach-first review bin gate must stop before rendering bin cards.');

const gateIndex = toggleBinView.indexOf('if(isCoachFirstMode()){');
const renderIndex = toggleBinView.indexOf('renderBinView();');
if (gateIndex < 0 || renderIndex < 0 || gateIndex > renderIndex) {
  throw new Error('Coach-first review bin gate must run before renderBinView().');
}

const hideIndex = toggleBinView.indexOf('hideAllViews();');
if (hideIndex >= 0 && gateIndex > hideIndex) {
  throw new Error('Coach-first review bin gate should run before leaving the current guided surface.');
}

console.log('Coach-first review bin view gate validation passed.');
