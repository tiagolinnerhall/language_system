import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const sanitizeMap = extractFunction('sanitizeProgressBackupMap');

for (const marker of [
  'if(source[key]===true){',
  'clean[idx]=true;',
  '}else if(source[key]!==false){',
  'skipped++;'
]) {
  if (!sanitizeMap.includes(marker)) {
    throw new Error(`Progress maps must only keep active true rows: ${marker}`);
  }
}

if (sanitizeMap.includes('clean[idx]=Boolean(source[key]);')) {
  throw new Error('Progress maps must not keep false-valued rows that inflate counts.');
}

console.log('Truthy progress map validation passed.');
