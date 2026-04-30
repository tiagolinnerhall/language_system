import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function mustInclude(marker) {
  if (!app.includes(marker)) throw new Error(`app.html missing marker: ${marker}`);
}

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const importProgressBackup = extractFunction('importProgressBackup');
if (!/sanitizeProgressBackupMap\(data\.learned\)/.test(importProgressBackup)) {
  throw new Error('Progress restore must sanitize learned sentence IDs before saving.');
}
if (!/sanitizeProgressBackupMap\(data\.reviewBin\)/.test(importProgressBackup)) {
  throw new Error('Progress restore must sanitize review-bin sentence IDs before saving.');
}
if (!/sanitizeProgressBackupSrs\(data\.srsData\)/.test(importProgressBackup)) {
  throw new Error('Progress restore must sanitize SRS sentence IDs and schedule data before saving.');
}

const sanitizeMap = extractFunction('sanitizeProgressBackupMap');
if (!/idx>=0&&idx<SENTENCES\.length/.test(sanitizeMap)) {
  throw new Error('Backup map sanitizer must reject sentence IDs outside the loaded course.');
}

const sanitizeSrs = extractFunction('sanitizeProgressBackupSrs');
for (const marker of ['Number.isFinite(box)', 'correctStreak', 'nextReview', 'lastReview']) {
  if (!sanitizeSrs.includes(marker)) throw new Error(`SRS sanitizer missing guard: ${marker}`);
}

mustInclude('Progress restored from backup. Invalid backup rows were skipped.');

console.log('Progress backup guardrail validation passed.');
