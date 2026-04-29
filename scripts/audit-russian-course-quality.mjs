import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'docs', 'course-review');

function normalize(text) {
  return String(text).toLowerCase().replace(/[ё]/g, 'е').replace(/\s+/g, ' ').trim();
}

function words(text) {
  return normalize(text).replace(/[^\p{L}\p{N}\s]/gu, '').split(/\s+/).filter(Boolean);
}

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

function hasQuestionMarkMismatch(ru, en) {
  return ru.includes('?') !== en.includes('?');
}

function hasSuspiciousLatinInRussian(ru) {
  return /[A-Za-z]{2,}/.test(ru);
}

function hasSuspiciousCyrillicInEnglish(en) {
  return /[А-Яа-яЁё]/.test(en);
}

function hasLengthRatioIssue(ru, en) {
  const rw = words(ru).length;
  const ew = words(en).length;
  if (rw < 2 || ew < 2) return false;
  const ratio = Math.max(rw, ew) / Math.max(1, Math.min(rw, ew));
  return ratio >= 3.2;
}

function hasWeakEnglish(en) {
  return /\b(gonna|wanna|gotta|ain't|ya|dunno)\b/i.test(en);
}

function hasMarkupOrUrl(text) {
  return /https?:|www\.|<[^>]+>|[@#{}[\]\\]/.test(text);
}

function issueList(row) {
  const [ru, translit, en, category] = row;
  const issues = [];
  if (!/[А-Яа-яЁё]/.test(ru)) issues.push('missing-cyrillic');
  if (!translit || translit.length < 2) issues.push('missing-transliteration');
  if (!/[A-Za-z]/.test(en)) issues.push('missing-english');
  if (hasQuestionMarkMismatch(ru, en)) issues.push('question-mark-mismatch');
  if (hasSuspiciousLatinInRussian(ru)) issues.push('latin-in-russian');
  if (hasSuspiciousCyrillicInEnglish(en)) issues.push('cyrillic-in-english');
  if (hasLengthRatioIssue(ru, en)) issues.push('length-ratio');
  if (hasWeakEnglish(en)) issues.push('informal-english');
  if (hasMarkupOrUrl(ru) || hasMarkupOrUrl(en)) issues.push('markup-or-url');
  if (words(ru).length > 18 || words(en).length > 22) issues.push('too-long-for-core-drill');
  if (!category) issues.push('missing-category');
  return issues;
}

const rows = loadRows();
const flagged = [];
const issueCounts = new Map();
rows.forEach((row, index) => {
  const issues = issueList(row);
  issues.forEach(issue => issueCounts.set(issue, (issueCounts.get(issue) || 0) + 1));
  if (issues.length) {
    flagged.push({
      index: index + 1,
      id: `ru_${String(index + 1).padStart(6, '0')}`,
      issues,
      russian: row[0],
      transliteration: row[1],
      english: row[2],
      category: row[3]
    });
  }
});

mkdirSync(OUT_DIR, { recursive: true });
const report = {
  generatedAt: new Date().toISOString(),
  language: 'russian',
  totalRows: rows.length,
  flaggedRows: flagged.length,
  issueCounts: Object.fromEntries([...issueCounts.entries()].sort((a, b) => b[1] - a[1])),
  notes: [
    'This is automated linguistic QA, not a native-speaker certification.',
    'Rows with no issues passed structural, punctuation, script, length, and basic readability checks.',
    'Flagged rows should be reviewed by a Russian native speaker before premium advertising.'
  ],
  flagged
};

writeFileSync(join(OUT_DIR, 'russian-qa-report.json'), JSON.stringify(report, null, 2) + '\n');
writeFileSync(join(OUT_DIR, 'russian-qa-summary.md'), `# Russian Course QA Summary

Generated: ${report.generatedAt}

- Total rows: ${report.totalRows}
- Flagged rows: ${report.flaggedRows}
- Automated pass rate: ${(((report.totalRows - report.flaggedRows) / report.totalRows) * 100).toFixed(2)}%

## Issue Counts

${Object.entries(report.issueCounts).map(([issue, count]) => `- ${issue}: ${count}`).join('\n') || '- No issues flagged'}

## Important Note

This audit is automated linguistic QA. It improves product quality and catches mechanical risk, but it is not a substitute for a native Russian speaker signing off on the course.
`);

console.log(`Russian automated QA complete: ${rows.length - flagged.length}/${rows.length} rows passed; ${flagged.length} flagged.`);
