import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const clampBackupSrsDate = extractFunction('clampBackupSrsDate');
for (const marker of [
  'const maxFutureDays=31;',
  'fallback=getToday()',
  'parsed.setHours(0,0,0,0);',
  'today.setHours(0,0,0,0);',
  'return fallback;',
  'maxFuture.setDate(today.getDate()+maxFutureDays);',
  'return formatLocalDate(maxFuture);',
  'return value;'
]) {
  if (!clampBackupSrsDate.includes(marker)) {
    throw new Error(`SRS restore date clamp missing marker: ${marker}`);
  }
}

const sanitizeSrs = extractFunction('sanitizeProgressBackupSrs');
for (const marker of [
  'const nextReview=isBackupDate(item.nextReview)?clampBackupSrsDate(item.nextReview):getToday();',
  "lastReview:isBackupDate(item.lastReview)?clampBackupSrsDate(item.lastReview,{allowFuture:false,fallback:''}):''"
]) {
  if (!sanitizeSrs.includes(marker)) {
    throw new Error(`SRS sanitizer must clamp restored dates: ${marker}`);
  }
}

console.log('SRS restore date window validation passed.');
