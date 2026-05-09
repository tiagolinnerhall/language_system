import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'docs', 'course-review');
const require = createRequire(import.meta.url);
const { scoreRussianRow } = require('../api/_lib/course-data.js');

function loadRows() {
  const rows = [];
  for (let i = 1; i <= 5; i++) {
    const variable = `SENTENCES${i}`;
    const filePath = join(ROOT, 'api', '_data', 'russian', `data${i}.js`);
    const code = `${readFileSync(filePath, 'utf8')}\n;globalThis.__DATA__=${variable};`;
    const context = {};
    vm.createContext(context);
    vm.runInContext(code, context, { filename: `data${i}.js` });
    rows.push(...context.__DATA__);
  }
  return rows;
}

function csvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function exportCsv(fileName, rows) {
  const header = [
    'review_order',
    'source_row',
    'decision_approve_edit_move_reject',
    'native_russian_correction',
    'english_correction',
    'level',
    'register_note',
    'sensitive_content_note',
    'reviewer_comment',
    'russian',
    'transliteration',
    'english',
    'category'
  ];
  const lines = [
    header.map(csvValue).join(','),
    ...rows.map((item, order) => [
      order + 1,
      item.idx + 1,
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      item.row[0],
      item.row[1],
      item.row[2],
      item.row[3]
    ].map(csvValue).join(','))
  ];
  writeFileSync(join(OUT_DIR, fileName), `${lines.join('\n')}\n`);
}

const rows = loadRows();
const curated = rows
  .map((row, idx) => ({ idx, row, score: scoreRussianRow(row, idx) }))
  .sort((a, b) => a.score - b.score);

mkdirSync(OUT_DIR, { recursive: true });
exportCsv('native-review-first-250.csv', curated.slice(0, 250));
exportCsv('native-review-first-1000.csv', curated.slice(0, 1000));
writeFileSync(join(OUT_DIR, 'native-review-instructions.md'), `# Native Russian Review Instructions

Review these files before public sales:

- \`native-review-first-250.csv\`: minimum first paid path.
- \`native-review-first-1000.csv\`: stronger launch path.

For every row, set \`decision_approve_edit_move_reject\` to one of:

- \`approve\`: natural Russian, accurate English, useful for this level.
- \`edit\`: good row, but write a better Russian or English correction.
- \`move\`: correct but too hard, niche, harsh, or badly ordered for the early path.
- \`reject\`: not suitable for paid course quality.

Do not approve rows just because they are grammatically possible. Early rows should be useful, natural, safe for general learners, and appropriate for a practical beginner-to-lower-intermediate sentence trainer.
`);

console.log('Native review queue exported: first 250 and first 1000 rows.');
