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

mustInclude(app, 'let practiceRatingLocked=false;', 'Standalone practice must track whether the current card has accepted a rating.');

const renderClozeCard = extractFunction('renderClozeCard');
mustInclude(renderClozeCard, 'practiceRatingLocked=false;', 'Rendering a cloze card must clear the practice rating lock.');

const renderDictationCard = extractFunction('renderDictationCard');
mustInclude(renderDictationCard, 'practiceRatingLocked=false;', 'Rendering a dictation card must clear the practice rating lock.');

const revealCloze = extractFunction('revealCloze');
mustInclude(revealCloze, 'practiceRatingLocked=false;', 'Revealing a cloze card must allow exactly one rating.');

const revealDictation = extractFunction('revealDictation');
mustInclude(revealDictation, 'practiceRatingLocked=false;', 'Revealing a dictation card must allow exactly one rating.');

const ratePractice = extractFunction('ratePractice');
mustInclude(ratePractice, 'if(!current||!current.revealed||practiceRatingLocked)return;', 'Practice ratings must require reveal and reject duplicate clicks.');
mustInclude(ratePractice, 'practiceRatingLocked=true;', 'Practice rating lock must be set before saving rating side effects.');

const guardIndex = ratePractice.indexOf('if(!current||!current.revealed||practiceRatingLocked)return;');
const lockIndex = ratePractice.indexOf('practiceRatingLocked=true;');
const processIndex = ratePractice.indexOf('processRating(current.idx,rating);');
const renderIndex = Math.min(
  ...['renderClozeCard();', 'renderDictationCard();']
    .map(marker => ratePractice.indexOf(marker))
    .filter(index => index >= 0)
);

if (guardIndex < 0 || lockIndex < 0 || processIndex < 0 || renderIndex < 0) {
  throw new Error('Practice rating lock validation could not inspect ratePractice order.');
}

if (!(guardIndex < lockIndex && lockIndex < processIndex && processIndex < renderIndex)) {
  throw new Error('Practice rating lock must be checked and set before SRS, stats, or next-card rendering side effects.');
}

console.log('Practice rating lock validation passed.');
