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

const toggleLearned = extractFunction('toggleLearned');
const toggleBin = extractFunction('toggleBin');

if (app.includes('onclick="toggleLearned')) {
  throw new Error('Browse must not expose a one-click mark-learned shortcut.');
}
if (toggleLearned.includes('learned[idx]=true') || toggleLearned.includes('delete learned[idx]')) {
  throw new Error('toggleLearned must not mutate learned progress directly.');
}
mustInclude(
  toggleLearned,
  'Use Study and spaced review ratings to graduate a sentence.',
  'Browse learned shortcut must direct learners back to the study method.'
);

if (toggleBin.includes('delete reviewBin[idx]')) {
  throw new Error('Browse must not remove weak-practice items without successful repair.');
}
mustInclude(toggleBin, 'toggleBinView();', 'Clicking an existing weak item from Browse should open repair, not remove it.');

console.log('Browse shortcut guard validation passed.');
