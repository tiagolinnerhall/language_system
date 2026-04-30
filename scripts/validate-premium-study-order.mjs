import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const PREMIUM_RISK_RE = /\b(kill|dead|death|die|hate|idiot|stupid|liar|war|bomb|drunk)\b/i;

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

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(text) {
  return normalize(text).split(/\s+/).filter(Boolean);
}

function scoreRow(row, idx) {
  const [ru, , en] = row;
  const ruWords = tokens(ru);
  const enWords = tokens(en);
  const text = `${ru} ${en}`.toLowerCase();
  const lengthScore = Math.abs(ruWords.length - 5) + Math.abs(enWords.length - 6) * 0.45;
  const dailyBonus = /\b(i|you|we|this|here|there|today|tomorrow|now|want|need|can|have|go|come|buy|eat|drink|help|understand)\b/i.test(en) ? -1.8 : 0;
  const politeBonus = /\b(please|thank|sorry|excuse me|hello)\b/i.test(en) ? -1.4 : 0;
  const questionBonus = /[?]$/.test(ru) ? -0.35 : 0;
  const socialBonus = /friend|family|house|home|food|work|buy|help|go|come|think|need|want|where|how|what|кто|что|где|как|дом|друг|работ|куп|хочу|нужно/.test(text) ? -1.1 : 0;
  const abstractPenalty = /\b(all this time|in return|supposed to|guess|force|anyone else|exactly|liar)\b/i.test(en) ? 2.2 : 0;
  const quotePenalty = /["“”]/.test(en) ? 1.3 : 0;
  const riskPenalty = PREMIUM_RISK_RE.test(en) ? 25 : 0;
  return lengthScore + dailyBonus + politeBonus + questionBonus + socialBonus + abstractPenalty + quotePenalty + riskPenalty + idx * 0.0001;
}

const rows = loadRows();
const curated = rows
  .map((row, idx) => ({ idx, row, score: scoreRow(row, idx) }))
  .sort((a, b) => a.score - b.score);

const first1000 = curated.slice(0, 1000);
const earlyRisk = first1000.filter(item => PREMIUM_RISK_RE.test(item.row[2]));
if (earlyRisk.length) {
  throw new Error(`Premium study order still contains risky English in first 1000 rows:\n${earlyRisk.slice(0, 12).map(item => `${item.idx + 1}: ${item.row[2]}`).join('\n')}`);
}

const first30 = first1000.slice(0, 30).map(item => item.row[2]);
if (first30.some(line => /\b(liar|kill|dead|hate|idiot|stupid|war|bomb)\b/i.test(line))) {
  throw new Error(`Premium study order still has harsh content in the first 30 guided rows.`);
}

console.log(`Premium study order validation passed: ${first1000.length} early rows screened, ${earlyRisk.length} risky rows in first 1000.`);
