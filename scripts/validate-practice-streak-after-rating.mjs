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

const ratePractice = extractFunction('ratePractice');

mustInclude(ratePractice, 'processRating(current.idx,rating,mode);', 'Practice rating must save SRS progress.');
mustInclude(ratePractice, 'updateStreak();', 'Practice rating must count toward the study streak after progress is saved.');
mustInclude(ratePractice, 'updateStreakDisplay();', 'Practice rating must refresh the visible streak after progress is saved.');

const saveIndex = ratePractice.indexOf('processRating(current.idx,rating,mode);');
const streakIndex = ratePractice.indexOf('updateStreak();');
const displayIndex = ratePractice.indexOf('updateStreakDisplay();');
const progressIndex = ratePractice.indexOf('updateProgress();');

if (saveIndex < 0 || streakIndex < 0 || displayIndex < 0 || progressIndex < 0) {
  throw new Error('Practice streak validation could not inspect ratePractice order.');
}

if (!(saveIndex < streakIndex && streakIndex < displayIndex && displayIndex < progressIndex)) {
  throw new Error('Practice streak must update after saving the rating and before the next card renders.');
}

console.log('Practice streak after rating validation passed.');
