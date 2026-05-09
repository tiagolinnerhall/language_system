const fs = require('fs');
const path = require('path');
const vm = require('vm');

const DATA_DIR = path.join(__dirname, '..', '_data', 'russian');
let cachedRussian = null;
let cachedCuratedRussian = null;

const PREMIUM_RISK_RE = /\b(kill|killed|murder|dead|death|die|dying|suicide|hate|idiot|stupid|liar|war|bomb|drunk|sexy|demon)\b/i;
const META_ARTIFACT_RE = /\b(translate this sentence|translated this sentence|translation of this sentence|delete this sentence|this sentence doesn't sound natural|whoever translates|tatoeba)\b/i;
const THIRD_LANGUAGE_RE = /\b(french|german|spanish|italian|portuguese|esperanto|latin|japanese|korean|chinese)\b/i;

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

function scoreRussianRow(row, idx) {
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
  const riskPenalty = PREMIUM_RISK_RE.test(en) ? 50 : 0;
  const artifactPenalty = META_ARTIFACT_RE.test(en) ? 75 : 0;
  const thirdLanguagePenalty = THIRD_LANGUAGE_RE.test(en) ? 10 : 0;
  return lengthScore + dailyBonus + politeBonus + questionBonus + socialBonus + abstractPenalty + quotePenalty + riskPenalty + artifactPenalty + thirdLanguagePenalty + idx * 0.0001;
}

function loadRussianCourse() {
  if (cachedRussian) return cachedRussian;
  const rows = [];
  for (let i = 1; i <= 5; i++) {
    const variable = `SENTENCES${i}`;
    const filePath = path.join(DATA_DIR, `data${i}.js`);
    const code = `${fs.readFileSync(filePath, 'utf8')}\n;globalThis.__DATA__=${variable};`;
    const context = {};
    vm.createContext(context);
    vm.runInContext(code, context, { filename: `data${i}.js` });
    rows.push(...context.__DATA__);
  }
  cachedRussian = rows;
  return rows;
}

function loadCuratedRussianCourse() {
  if (cachedCuratedRussian) return cachedCuratedRussian;
  cachedCuratedRussian = loadRussianCourse()
    .map((row, idx) => ({ row, idx, score: scoreRussianRow(row, idx) }))
    .sort((a, b) => a.score - b.score)
    .map(item => [...item.row, item.idx]);
  return cachedCuratedRussian;
}

module.exports = { loadCuratedRussianCourse, loadRussianCourse, scoreRussianRow };
