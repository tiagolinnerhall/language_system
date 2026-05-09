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

mustInclude(app, 'let studyRatingLocked=false;', 'Study mode must track whether the current card has already accepted a rating.');

const beginStudySession = extractFunction('beginStudySession');
mustInclude(beginStudySession, 'studyRatingLocked=false;', 'Starting a guided session must clear the rating lock.');

const showStudyCard = extractFunction('showStudyCard');
mustInclude(showStudyCard, 'studyRatingLocked=false;', 'Each new study card must clear the rating lock.');

const revealStudyCard = extractFunction('revealStudyCard');
mustInclude(revealStudyCard, 'studyRatingLocked=false;', 'Reveal must leave the current card ready for exactly one rating.');

const rateStudyCard = extractFunction('rateStudyCard');
mustInclude(rateStudyCard, 'studyRatingLocked)return;', 'Rating a study card must ignore duplicate taps during the transition delay.');
mustInclude(rateStudyCard, 'studyRatingLocked=true;', 'Rating a study card must lock immediately before stats or scheduling change.');

const duplicateGuard = rateStudyCard.indexOf('studyRatingLocked)return;');
const lockSet = rateStudyCard.indexOf('studyRatingLocked=true;');
const processRatingCall = rateStudyCard.indexOf('processRating(item.idx,rating,item.sessionDelayed?');
const statsUpdate = rateStudyCard.indexOf('studySessionStats.');
if (duplicateGuard < 0 || lockSet < 0 || processRatingCall < 0 || statsUpdate < 0) {
  throw new Error('Study rating lock validation could not inspect rateStudyCard order.');
}
if (duplicateGuard > lockSet || lockSet > processRatingCall || lockSet > statsUpdate) {
  throw new Error('Study rating lock must be checked and set before scheduling or session stats update.');
}

console.log('Study rating lock validation passed.');
