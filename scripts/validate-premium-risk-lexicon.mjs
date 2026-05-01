import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const app = readFileSync(join(ROOT, 'app.html'), 'utf8');
const studyOrderValidator = readFileSync(join(ROOT, 'scripts', 'validate-premium-study-order.mjs'), 'utf8');

function extractRiskRegex(source, label) {
  const match = source.match(/const PREMIUM_RISK_RE\s*=\s*(\/[^\n]+\/[a-z]*)/);
  if (!match) throw new Error(`${label} must define PREMIUM_RISK_RE.`);
  const context = {};
  vm.createContext(context);
  vm.runInContext(`globalThis.re=${match[1]};`, context, { filename: label });
  return context.re;
}

const appRisk = extractRiskRegex(app, 'app.html');
const validatorRisk = extractRiskRegex(studyOrderValidator, 'validate-premium-study-order.mjs');

const requiredRiskExamples = [
  'I want to kill you.',
  'He was killed.',
  'This is murder.',
  'Does that mean I am dying?',
  'She tried to commit suicide.',
  'I was drunk.',
  'That was stupid.',
  'Why are you staring at me, demon?',
  'I am sexy and I know it.'
];

for (const example of requiredRiskExamples) {
  if (!appRisk.test(example)) {
    throw new Error(`App premium risk lexicon must catch early-course risk example: ${example}`);
  }
  appRisk.lastIndex = 0;
  if (!validatorRisk.test(example)) {
    throw new Error(`Study-order validator risk lexicon must catch: ${example}`);
  }
  validatorRisk.lastIndex = 0;
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
  const riskPenalty = appRisk.test(en) ? 25 : 0;
  appRisk.lastIndex = 0;
  return lengthScore + dailyBonus + politeBonus + questionBonus + socialBonus + abstractPenalty + quotePenalty + riskPenalty + idx * 0.0001;
}

const riskyEarlyRows = loadRows()
  .map((row, idx) => ({ row, idx, score: scoreRow(row, idx) }))
  .sort((a, b) => a.score - b.score)
  .slice(0, 1000)
  .filter(item => {
    const matched = appRisk.test(item.row[2]);
    appRisk.lastIndex = 0;
    return matched;
  });

if (riskyEarlyRows.length) {
  throw new Error(`Premium risk lexicon still leaves risky English in the first 1000 guided rows:\n${riskyEarlyRows.slice(0, 12).map(item => `${item.idx + 1}: ${item.row[2]}`).join('\n')}`);
}

console.log('Premium risk lexicon validation passed.');
