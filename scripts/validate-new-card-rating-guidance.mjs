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

const newRecall = extractFunction('showNewRecallCard');
if (/Easy\s*=/.test(newRecall) || /knew it cleanly/.test(newRecall)) {
  throw new Error('New-card recall guidance must not mention Easy before first-pass rating.');
}
mustInclude(
  newRecall,
  'Good is the highest first-pass rating',
  'New-card recall guidance must explain that Good is the top first-pass rating.'
);

const revealStudyCard = extractFunction('revealStudyCard');
mustInclude(revealStudyCard, 'const allowEasy=!isNew;', 'New-card reveal must keep Easy disabled.');
mustInclude(revealStudyCard, "New cards stop at Good on the first pass", 'New-card reveal must explain the Good cap.');

const rateStudyCard = extractFunction('rateStudyCard');
mustInclude(rateStudyCard, "if(isNew && rating==='easy')rating='good';", 'New-card rating must still clamp Easy to Good.');

console.log('New-card rating guidance validation passed.');
