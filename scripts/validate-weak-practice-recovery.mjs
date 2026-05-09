import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const app = readFileSync(join(root, 'app.html'), 'utf8');

function mustInclude(marker) {
  if (!app.includes(marker)) throw new Error(`app.html missing marker: ${marker}`);
}

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const processRating = extractFunction('processRating');
const clearRecoveredWeakPractice = extractFunction('clearRecoveredWeakPractice');
if (!/rating==='easy'[\s\S]*clearRecoveredWeakPractice\(idx\)/.test(processRating)) {
  throw new Error('Easy ratings must clear recovered sentences from weak practice.');
}
if (!/rating==='good'[\s\S]*clearRecoveredWeakPractice\(idx\)/.test(processRating)) {
  throw new Error('Good ratings must clear recovered sentences from weak practice.');
}
if (!/clearReviewBinItem\(idx\)/.test(clearRecoveredWeakPractice)) {
  throw new Error('Successful ratings must clear recovered sentences from weak practice.');
}

mustInclude('Recovered. Removed from weak practice.');
mustInclude('clearRecoveredWeakPractice');

console.log('Weak practice recovery validation passed.');
