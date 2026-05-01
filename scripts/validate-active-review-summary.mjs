import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const showStudySummary = extractFunction('showStudySummary');

if (!showStudySummary.includes('const activeReviewCount=Object.keys(srsData).filter(idx=>!learned[idx]).length;')) {
  throw new Error('Study summary must count only non-learned SRS cards as active review.');
}

if (showStudySummary.includes('const totalInSRS=Object.keys(srsData).length;')) {
  throw new Error('Study summary must not label learned SRS records as active review.');
}

if (!showStudySummary.includes('${activeReviewCount} sentences in active review')) {
  throw new Error('Study summary must render the filtered active-review count.');
}

console.log('Active review summary validation passed.');
