import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const sanitizeStats = extractFunction('sanitizeProgressBackupStats');

for (const marker of [
  'const maxDailyCount=SENTENCES.length;',
  'const maxStreakDays=3650;',
  "assignBoundedStat('todayNew',maxDailyCount);",
  "assignBoundedStat('todayReviews',maxDailyCount);",
  "assignBoundedStat('currentStreak',maxStreakDays);",
  "assignBoundedStat('longestStreak',maxStreakDays);",
  'Math.min(maxValue,Math.max(0,Math.round(value)))'
]) {
  if (!sanitizeStats.includes(marker)) {
    throw new Error(`User stats restore must cap impossible backup stats: ${marker}`);
  }
}

console.log('Progress stat cap validation passed.');
