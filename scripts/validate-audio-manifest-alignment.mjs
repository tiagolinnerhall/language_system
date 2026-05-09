import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const require = createRequire(import.meta.url);
const { loadCuratedRussianCourse } = require('../api/_lib/course-data.js');

function readModuleData(filePath, variable) {
  const code = `${readFileSync(filePath, 'utf8')}\n;globalThis.__DATA__=${variable};`;
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context, { filename: filePath });
  return context.__DATA__;
}

function loadRawRows() {
  const rows = [];
  for (let i = 1; i <= 5; i++) {
    rows.push(...readModuleData(join(ROOT, 'api', '_data', 'russian', `data${i}.js`), `SENTENCES${i}`));
  }
  return rows;
}

const rawRows = loadRawRows();
const curatedRows = loadCuratedRussianCourse();
const manifest = JSON.parse(readFileSync(join(ROOT, 'audio-manifest-ru.json'), 'utf8'));
const manifestById = new Map((manifest.items || []).map(item => [item.id, item]));
const failures = [];

curatedRows.forEach((row, curatedIndex) => {
  const sourceIndex = row[4];
  if (!Number.isInteger(sourceIndex) || sourceIndex < 0 || sourceIndex >= rawRows.length) {
    failures.push(`curated ${curatedIndex + 1}: missing valid source index`);
    return;
  }
  const raw = rawRows[sourceIndex];
  if (raw[0] !== row[0] || raw[2] !== row[2]) {
    failures.push(`curated ${curatedIndex + 1}: source row ${sourceIndex + 1} does not match visible sentence`);
    return;
  }
  const audioId = `ru_${String(sourceIndex + 1).padStart(6, '0')}`;
  const item = manifestById.get(audioId);
  if (!item) {
    failures.push(`curated ${curatedIndex + 1}: missing manifest item ${audioId}`);
    return;
  }
  if (item.target !== row[0]) {
    failures.push(`curated ${curatedIndex + 1}: ${audioId} target mismatch. visible="${row[0]}" manifest="${item.target}"`);
  }
});

if (failures.length) {
  throw new Error(`Audio manifest alignment failed:\n${failures.slice(0, 20).join('\n')}`);
}

console.log(`Audio manifest alignment passed: ${curatedRows.length} curated rows map to matching source audio.`);
