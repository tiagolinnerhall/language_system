import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const EXPECTED_COUNT = 5000;

function normalize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text) {
  return normalize(text).split(/\s+/).filter(Boolean);
}

function prefixKey(text, size = 4) {
  const parts = words(text);
  if (parts.length < size) return '';
  return parts.slice(0, size).join(' ');
}

function jaccard(a, b) {
  const as = new Set(words(a));
  const bs = new Set(words(b));
  let shared = 0;
  for (const word of as) if (bs.has(word)) shared++;
  return shared / Math.max(1, as.size + bs.size - shared);
}

function loadAll() {
  const all = [];
  for (let i = 1; i <= 5; i++) {
    const variable = `SENTENCES${i}`;
    const filePath = join(ROOT, 'api', '_data', 'russian', `data${i}.js`);
    const code = readFileSync(filePath, 'utf8') + `\n;globalThis.__DATA__=${variable};`;
    const context = {};
    vm.createContext(context);
    vm.runInContext(code, context, { filename: `data${i}.js` });
    all.push(...context.__DATA__);
  }
  return all;
}

const sentences = loadAll();
const attribution = JSON.parse(readFileSync(join(ROOT, 'attribution-ru.json'), 'utf8'));
if (sentences.length !== EXPECTED_COUNT) {
  throw new Error(`Expected ${EXPECTED_COUNT} Russian sentences, got ${sentences.length}`);
}
if (!Array.isArray(attribution.items) || attribution.items.length !== EXPECTED_COUNT) {
  throw new Error(`Expected ${EXPECTED_COUNT} attribution rows, got ${attribution.items?.length || 0}`);
}

const ru = new Map();
const en = new Map();
const ruPrefixes = new Map();
const enPrefixes = new Map();
const similar = [];
for (let i = 0; i < sentences.length; i++) {
  const row = sentences[i];
  const attributionRow = attribution.items[i];
  if (!Array.isArray(row) || row.length !== 4) throw new Error(`Bad row at ${i + 1}`);
  const expectedId = `ru_${String(i + 1).padStart(6, '0')}`;
  if (attributionRow.lang5kId !== expectedId) throw new Error(`Bad attribution id at ${i + 1}`);
  if (!attributionRow.russianUsername || !attributionRow.englishUsername) throw new Error(`Missing attribution username at ${i + 1}`);
  if (!/[А-Яа-яЁё]/.test(row[0])) throw new Error(`Missing Cyrillic at ${i + 1}: ${row[0]}`);
  const nr = normalize(row[0]);
  const ne = normalize(row[2]);
  if (ru.has(nr)) throw new Error(`Duplicate Russian at ${i + 1} and ${ru.get(nr)}: ${row[0]}`);
  if (en.has(ne)) throw new Error(`Duplicate English at ${i + 1} and ${en.get(ne)}: ${row[2]}`);
  const rp = prefixKey(row[0]);
  const ep = prefixKey(row[2]);
  if (rp && ruPrefixes.has(rp)) throw new Error(`Repeated Russian opening at ${i + 1} and ${ruPrefixes.get(rp)}: ${row[0]}`);
  if (ep && enPrefixes.has(ep)) throw new Error(`Repeated English opening at ${i + 1} and ${enPrefixes.get(ep)}: ${row[2]}`);
  ru.set(nr, i + 1);
  en.set(ne, i + 1);
  if (rp) ruPrefixes.set(rp, i + 1);
  if (ep) enPrefixes.set(ep, i + 1);
}

for (let i = 0; i < sentences.length; i++) {
  for (let j = i + 1; j < Math.min(sentences.length, i + 350); j++) {
    if (Math.abs(words(sentences[i][0]).length - words(sentences[j][0]).length) > 3) continue;
    if (jaccard(sentences[i][0], sentences[j][0]) >= 0.5 || jaccard(sentences[i][2], sentences[j][2]) >= 0.5) {
      similar.push([i + 1, j + 1, sentences[i][0], sentences[j][0]]);
      if (similar.length > 10) break;
    }
  }
  if (similar.length > 10) break;
}

if (similar.length) {
  throw new Error(`Near-duplicate sentences found:\n${similar.map(row => row.join(' | ')).join('\n')}`);
}

const categories = new Set(sentences.map(row => row[3]));
console.log(`Russian course validation passed: ${sentences.length} sentences, ${categories.size} categories.`);
