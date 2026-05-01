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

const render = extractFunction('render');
for (const marker of ['${catName}', '${s.r}', '${s.t}', '${s.e}']) {
  if (render.includes(marker)) {
    throw new Error(`Browse rendering must not inject raw course text into innerHTML: ${marker}`);
  }
}

for (const marker of [
  '${escapeHtml(catName)}',
  '${escapeHtml(s.r)}',
  '${escapeHtml(s.t)}',
  '${escapeHtml(s.e)}',
  "onclick=\"playAllInCategory(this,'${escapeForHandler(catName)}')\""
]) {
  mustInclude(render, marker, `Browse rendering missing escaped marker: ${marker}`);
}

const escapeForHandler = extractFunction('escapeForHandler');
for (const marker of [
  ".replace(/&/g,'&amp;')",
  ".replace(/</g,'&lt;')",
  ".replace(/>/g,'&gt;')",
  ".replace(/\"/g,'&quot;')"
]) {
  mustInclude(escapeForHandler, marker, `Handler attribute escaping missing marker: ${marker}`);
}

console.log('Safe course rendering validation passed.');
