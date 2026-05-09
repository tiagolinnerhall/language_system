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

const rateStudyCard = extractFunction('rateStudyCard');
mustInclude(
  rateStudyCard,
  'if(!studyRevealed||!item||studyRatingLocked)return;',
  'Study ratings must require a revealed current card and reject stale or duplicate rating calls.'
);
mustInclude(rateStudyCard, 'studyRatingLocked=true;', 'Study rating lock must still be set before saving side effects.');

const itemIndex = rateStudyCard.indexOf('const item=studyQueue[studyIndex];');
const guardIndex = rateStudyCard.indexOf('if(!studyRevealed||!item||studyRatingLocked)return;');
const lockIndex = rateStudyCard.indexOf('studyRatingLocked=true;');
const processIndex = rateStudyCard.indexOf('processRating(item.idx,rating,item.sessionDelayed?');

if (itemIndex < 0 || guardIndex < 0 || lockIndex < 0 || processIndex < 0) {
  throw new Error('Study rating reveal guard validation could not inspect rateStudyCard order.');
}

if (!(itemIndex < guardIndex && guardIndex < lockIndex && lockIndex < processIndex)) {
  throw new Error('Study ratings must validate the revealed card before locking or saving progress.');
}

console.log('Study rating reveal guard validation passed.');
