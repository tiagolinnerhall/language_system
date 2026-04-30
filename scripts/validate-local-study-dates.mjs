import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function mustInclude(marker, message) {
  if (!app.includes(marker)) throw new Error(message || `Missing marker: ${marker}`);
}

mustInclude('function formatLocalDate(date=new Date())', 'Study scheduling must use an explicit local-date formatter.');
mustInclude('return formatLocalDate();', 'getToday must return the learner local calendar date.');
mustInclude('data.nextReview=formatLocalDate(nextDate);', 'SRS next-review dates must be saved as learner local calendar dates.');
mustInclude('const yesterdayStr=formatLocalDate(yesterday);', 'Streak comparisons must use learner local calendar dates.');

const forbiddenUtcDateKeys = [
  'return new Date().toISOString().slice(0,10);',
  'data.nextReview=nextDate.toISOString().slice(0,10);',
  'const yesterdayStr=yesterday.toISOString().slice(0,10);'
];

for (const marker of forbiddenUtcDateKeys) {
  if (app.includes(marker)) {
    throw new Error(`Learner-facing study dates must not be derived from UTC: ${marker}`);
  }
}

console.log('Local study date validation passed.');
