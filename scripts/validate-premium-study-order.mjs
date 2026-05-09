import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const PREMIUM_RISK_RE = /\b(kill|killed|murder|dead|death|die|dying|suicide|hate|idiot|stupid|liar|war|bomb|drunk|sexy|demon)\b/i;
const META_ARTIFACT_RE = /\b(translate this sentence|translated this sentence|translation of this sentence|delete this sentence|this sentence doesn't sound natural|whoever translates|tatoeba)\b/i;
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

const rows = loadRows();
const curated = rows
  .map((row, idx) => ({ idx, row, score: scoreRussianRow(row, idx) }))
  .sort((a, b) => a.score - b.score);

const first1000 = curated.slice(0, 1000);
const earlyRisk = first1000.filter(item => PREMIUM_RISK_RE.test(item.row[2]));
if (earlyRisk.length) {
  throw new Error(`Premium study order still contains risky English in first 1000 rows:\n${earlyRisk.slice(0, 12).map(item => `${item.idx + 1}: ${item.row[2]}`).join('\n')}`);
}

const earlyArtifacts = first1000.slice(0, 250).filter(item => META_ARTIFACT_RE.test(item.row[2]));
if (earlyArtifacts.length) {
  throw new Error(`Premium study order still contains corpus/meta artifacts in first 250 rows:\n${earlyArtifacts.slice(0, 12).map(item => `${item.idx + 1}: ${item.row[2]}`).join('\n')}`);
}

const first30 = first1000.slice(0, 30).map(item => item.row[2]);
if (first30.some(line => PREMIUM_RISK_RE.test(line))) {
  throw new Error(`Premium study order still has harsh content in the first 30 guided rows.`);
}

const appHtml = readFileSync(join(ROOT, 'app.html'), 'utf8');
if (appHtml.includes('const PREMIUM_STUDY_ORDER=SENTENCES.map')) {
  throw new Error('app.html computes PREMIUM_STUDY_ORDER before async course data loads, so fresh guided lessons can be empty.');
}
if (!appHtml.includes('premiumStudyOrder=buildPremiumStudyOrder();')) {
  throw new Error('app.html must rebuild premiumStudyOrder immediately after loading course data.');
}
const courseApi = readFileSync(join(ROOT, 'api', 'course.js'), 'utf8');
if (!courseApi.includes('loadCuratedRussianCourse')) {
  throw new Error('api/course.js must serve the curated course order, not raw corpus order.');
}

console.log(`Premium study order validation passed: ${first1000.length} early rows screened, ${earlyRisk.length} risky rows in first 1000.`);
