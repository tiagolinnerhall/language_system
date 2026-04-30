import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

const loadLanguageData = extractFunction('loadLanguageData');
if (loadLanguageData.includes("'+e.message+'")) {
  throw new Error('Language loading errors must not inject raw exception messages into innerHTML.');
}
if (!loadLanguageData.includes("escapeHtml(e.message||'Unknown error')")) {
  throw new Error('Language loading errors must escape exception messages before rendering.');
}

const renderAccessRequired = extractFunction('renderAccessRequired');
if (renderAccessRequired.includes('<p>${message}</p>')) {
  throw new Error('Access-required errors must not inject raw API messages into innerHTML.');
}
if (!renderAccessRequired.includes('<p>${escapeHtml(message)}</p>')) {
  throw new Error('Access-required errors must escape API messages before rendering.');
}

console.log('Safe error rendering validation passed.');
