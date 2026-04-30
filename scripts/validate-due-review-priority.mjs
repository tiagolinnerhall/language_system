import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const getDueReviews = extractFunction('getDueReviews');

if (!/data\.nextReview<=today/.test(getDueReviews)) {
  throw new Error('Due reviews must only include cards due today or earlier.');
}

if (!/a\[1\]\.nextReview\.localeCompare\(b\[1\]\.nextReview\)/.test(getDueReviews)) {
  throw new Error('Due reviews must prioritize the oldest overdue review date before box difficulty.');
}

if (!/a\[1\]\.box-b\[1\]\.box/.test(getDueReviews)) {
  throw new Error('Due review ordering must still use box difficulty after overdue date.');
}

console.log('Due review priority validation passed.');
