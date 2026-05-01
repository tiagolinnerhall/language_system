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

const beginStudySession = extractFunction('beginStudySession');
if (beginStudySession.includes('updateStreak();')) {
  throw new Error('Starting a guided lesson must not count the study streak before any rating is saved.');
}

const rateStudyCard = extractFunction('rateStudyCard');
mustInclude(rateStudyCard, 'updateStreak();', 'Rating a card must update the study streak after real progress is saved.');
mustInclude(rateStudyCard, 'updateStreakDisplay();', 'Rating a card must refresh the visible streak after real progress is saved.');

const saveStats = rateStudyCard.indexOf('saveStats();');
const updateStreak = rateStudyCard.indexOf('updateStreak();');
const updateStreakDisplay = rateStudyCard.indexOf('updateStreakDisplay();');
const feedback = rateStudyCard.indexOf('// Brief feedback');
if (saveStats < 0 || updateStreak < 0 || updateStreakDisplay < 0 || feedback < 0) {
  throw new Error('Study streak validation could not inspect rateStudyCard order.');
}
if (saveStats > updateStreak || updateStreak > updateStreakDisplay || updateStreakDisplay > feedback) {
  throw new Error('Study streak must update immediately after rating stats are saved and before feedback renders.');
}

console.log('Study streak after rating validation passed.');
