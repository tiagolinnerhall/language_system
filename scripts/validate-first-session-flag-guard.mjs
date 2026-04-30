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

if (sanitizeStats.includes('Boolean(source.completedFirstGuidedSession)')) {
  throw new Error('First guided session flag must not coerce truthy backup values.');
}

for (const marker of [
  "if(typeof source.completedFirstGuidedSession==='boolean')clean.completedFirstGuidedSession=source.completedFirstGuidedSession;",
  'else if(source.completedFirstGuidedSession!==undefined)skipped++;'
]) {
  if (!sanitizeStats.includes(marker)) {
    throw new Error(`First guided session flag guard missing marker: ${marker}`);
  }
}

console.log('First guided session flag guard validation passed.');
