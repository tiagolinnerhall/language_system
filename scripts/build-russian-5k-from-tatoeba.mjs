import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { join } from 'node:path';

const ROOT = process.cwd();
const SOURCE_DIR = join(ROOT, 'data-sources', 'extract');
const SENTENCES_CSV = join(SOURCE_DIR, 'sentences.csv');
const SENTENCES_DETAILED_CSV = join(SOURCE_DIR, 'sentences_detailed.csv');
const LINKS_CSV = join(SOURCE_DIR, 'links.csv');
const OUT_DIR = join(ROOT, 'api', '_data', 'russian');
const TARGET_COUNT = 5000;
const FILE_COUNT = 5;
const PER_FILE = TARGET_COUNT / FILE_COUNT;

if (!existsSync(SENTENCES_CSV) || !existsSync(SENTENCES_DETAILED_CSV) || !existsSync(LINKS_CSV)) {
  throw new Error('Missing Tatoeba extracts. Expected data-sources/extract/sentences.csv and links.csv.');
}

const MAP = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
  у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
  ь: '', э: 'e', ю: 'yu', я: 'ya',
  А: 'A', Б: 'B', В: 'V', Г: 'G', Д: 'D', Е: 'E', Ё: 'Yo', Ж: 'Zh', З: 'Z', И: 'I',
  Й: 'Y', К: 'K', Л: 'L', М: 'M', Н: 'N', О: 'O', П: 'P', Р: 'R', С: 'S', Т: 'T',
  У: 'U', Ф: 'F', Х: 'Kh', Ц: 'Ts', Ч: 'Ch', Ш: 'Sh', Щ: 'Shch', Ъ: '', Ы: 'Y',
  Ь: '', Э: 'E', Ю: 'Yu', Я: 'Ya'
};

const commonRu = new Set(`
я ты он она мы вы они это тот эта эти мой твой наш ваш его ее их мне тебе нам вам меня тебя
есть был была было были буду будет будут могу можешь может можем можете нужно надо хочу хочешь
знаю знаете думаю сказать говорю идти ехать делать сделать взять дать купить найти ждать видеть
смотреть слушать читать писать работать жить любить понимать помнить спросить ответить прийти уйти
дом работа время день ночь утро вечер сегодня завтра вчера сейчас потом здесь там хорошо плохо
очень уже еще только тоже потому если когда где куда почему сколько как что кто можно нельзя
`.trim().split(/\s+/));

const blockedNames = /\b(tom|mary|john|boston|hokkaido|australia|canada|france|germany|japan)\b|(?:^|[\s,.!?])(?:том|тома|тому|томом|мэри|джон|бостон|хоккайдо)(?:$|[\s,.!?])/i;

function translit(text) {
  return text.split('').map(ch => MAP[ch] ?? ch).join('');
}

function normalize(text) {
  return text
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

function hasBadContent(text) {
  return /https?:|www\.|@|#|<|>|\{|\}|\[|\]|\(|\)|\d{3,}|[=+*_\\]/i.test(text);
}

function looksLikeRussian(text) {
  return /[А-Яа-яЁё]/.test(text) && !/[ぁ-んァ-ン一-龯]/.test(text);
}

function validPair(ru, en) {
  if (!ru || !en) return false;
  if (hasBadContent(ru) || hasBadContent(en)) return false;
  if (blockedNames.test(ru) || blockedNames.test(en)) return false;
  if (!looksLikeRussian(ru)) return false;
  if (/[А-Яа-яЁё]/.test(en)) return false;
  if (!/[A-Za-z]/.test(en)) return false;
  const rw = words(ru);
  const ew = words(en);
  if (rw.length < 2 || rw.length > 12) return false;
  if (ew.length < 2 || ew.length > 14) return false;
  if (ru.length > 95 || en.length > 105) return false;
  if ((ru.match(/[!?]/g) || []).length > 1) return false;
  if ((en.match(/[!?]/g) || []).length > 1) return false;
  if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(en)) return false;
  return true;
}

function jaccard(a, b) {
  const as = new Set(words(a));
  const bs = new Set(words(b));
  let shared = 0;
  for (const word of as) if (bs.has(word)) shared++;
  return shared / Math.max(1, as.size + bs.size - shared);
}

function categoryFor(ru, en, index) {
  const text = `${ru} ${en}`.toLowerCase();
  if (/здравствуйте|привет|спасибо|please|hello|thank|sorry|извин/.test(text)) return 'Core Social Language';
  if (/where|when|why|how|когда|где|почему|как|сколько/.test(text)) return 'Questions & Answers';
  if (/work|job|meeting|office|работ|встреч|началь|коллег/.test(text)) return 'Work & Daily Tasks';
  if (/home|house|room|квартир|дом|комнат|кухн/.test(text)) return 'Home & Family Life';
  if (/buy|shop|store|money|pay|куп|магазин|деньг|плат/.test(text)) return 'Shopping & Money';
  if (/doctor|pain|sick|health|врач|бол|здоров|лекар/.test(text)) return 'Health & Body';
  if (/train|bus|car|airport|station|поезд|автобус|машин|аэропорт|станци/.test(text)) return 'Travel & Transport';
  if (/\b(eat|drink|food|coffee|tea|restaurant)\b|чай|кофе|пить|еда|ресторан|завтрак|обед|ужин/.test(text)) return 'Food & Restaurants';
  if (/think|believe|feel|want|need|дума|чувств|хочу|нужно|надо/.test(text)) return 'Thoughts, Needs & Feelings';
  if (/yesterday|tomorrow|today|сегодня|завтра|вчера|недел|год|месяц/.test(text)) return 'Time & Plans';
  const level = Math.floor(index / 500) + 1;
  return `Fluency Builder ${level}`;
}

function score(ru, en) {
  const rw = words(ru);
  const ew = words(en);
  const common = rw.filter(w => commonRu.has(w)).length;
  const lengthScore = Math.abs(rw.length - 6) + Math.abs(ew.length - 7) * 0.4;
  const punctuationBonus = /[?]$/.test(ru) ? -0.6 : 0;
  return lengthScore - common * 0.35 + punctuationBonus;
}

async function loadSentences() {
  const ru = new Map();
  const en = new Map();
  const rl = createInterface({ input: createReadStream(SENTENCES_CSV, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    const first = line.indexOf('\t');
    const second = line.indexOf('\t', first + 1);
    if (first === -1 || second === -1) continue;
    const id = Number(line.slice(0, first));
    const lang = line.slice(first + 1, second);
    if (lang !== 'rus' && lang !== 'eng') continue;
    const text = line.slice(second + 1).trim();
    if (lang === 'rus') ru.set(id, text);
    else en.set(id, text);
  }
  return { ru, en };
}

async function loadPairs(ru, en) {
  const candidates = [];
  const seen = new Set();
  const rl = createInterface({ input: createReadStream(LINKS_CSV, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    const [aRaw, bRaw] = line.split('\t');
    const a = Number(aRaw);
    const b = Number(bRaw);
    let russian = ru.get(a);
    let english = en.get(b);
    let ruId = a;
    let enId = b;
    if (!russian || !english) {
      russian = ru.get(b);
      english = en.get(a);
      ruId = b;
      enId = a;
    }
    if (!validPair(russian, english)) continue;
    const key = `${normalize(russian)}|${normalize(english)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ russian, english, ruId, enId, score: score(russian, english) });
  }
  return candidates;
}

function selectUnique(candidates) {
  const selected = [];
  const exactRu = new Set();
  const exactEn = new Set();
  const ruPrefixes = new Set();
  const enPrefixes = new Set();
  const categoryCounts = new Map();
  const maxPerCategory = 360;

  for (const item of candidates.sort((a, b) => a.score - b.score || a.russian.length - b.russian.length)) {
    const nr = normalize(item.russian);
    const ne = normalize(item.english);
    if (exactRu.has(nr) || exactEn.has(ne)) continue;
    const rp = prefixKey(item.russian);
    const ep = prefixKey(item.english);
    if ((rp && ruPrefixes.has(rp)) || (ep && enPrefixes.has(ep))) continue;
    const category = categoryFor(item.russian, item.english, selected.length);
    if ((categoryCounts.get(category) || 0) >= maxPerCategory) continue;

    let tooSimilar = false;
    for (const picked of selected) {
      if (Math.abs(words(picked.russian).length - words(item.russian).length) > 3) continue;
      if (jaccard(picked.russian, item.russian) >= 0.5 || jaccard(picked.english, item.english) >= 0.5) {
        tooSimilar = true;
        break;
      }
    }
    if (tooSimilar) continue;

    exactRu.add(nr);
    exactEn.add(ne);
    if (rp) ruPrefixes.add(rp);
    if (ep) enPrefixes.add(ep);
    categoryCounts.set(category, (categoryCounts.get(category) || 0) + 1);
    selected.push(item);
    if (selected.length === TARGET_COUNT) break;
  }
  return selected;
}

async function loadAttributionDetails(selected) {
  const needed = new Set();
  selected.forEach(item => {
    needed.add(item.ruId);
    needed.add(item.enId);
  });
  const details = new Map();
  const rl = createInterface({ input: createReadStream(SENTENCES_DETAILED_CSV, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    const parts = line.split('\t');
    const id = Number(parts[0]);
    if (!needed.has(id)) continue;
    details.set(id, {
      id,
      lang: parts[1] || '',
      username: parts[3] || 'unknown',
      dateAdded: parts[4] || '',
      dateModified: parts[5] || ''
    });
    if (details.size === needed.size) break;
  }
  return details;
}

function writeCourse(selected, details) {
  mkdirSync(OUT_DIR, { recursive: true });
  for (let file = 1; file <= FILE_COUNT; file++) {
    const start = (file - 1) * PER_FILE;
    const chunk = selected.slice(start, start + PER_FILE);
    const lines = [
      `const SENTENCES${file} = [`,
      `// === Lang5K Russian ${start + 1}-${start + chunk.length}: corpus-selected, de-duplicated sentence pairs ===`,
      ...chunk.map((item, offset) => {
        const index = start + offset;
        return JSON.stringify([
          item.russian,
          translit(item.russian),
          item.english,
          categoryFor(item.russian, item.english, index)
        ]) + ',';
      }),
      '];',
      ''
    ];
    writeFileSync(join(OUT_DIR, `data${file}.js`), lines.join('\n'));
  }

  const attribution = [
    '# Russian Course Attribution',
    '',
    'The current Russian 5,000 sentence course is built from Tatoeba Russian-English sentence links, filtered for length, script, exact duplicates, and near-duplicate similarity.',
    '',
    '- Source: Tatoeba sentence exports',
    '- URL: https://tatoeba.org/gos/downloads',
    '- License: CC-BY 2.0 FR for Tatoeba sentence content unless otherwise noted by Tatoeba',
    '- Build script: `scripts/build-russian-5k-from-tatoeba.mjs`',
    '',
    'Lang5K adds ordering, filtering, transliteration, category assignment, app integration, hosted audio, and learning workflows.',
    '',
    'Public machine-readable attribution is available in `attribution-ru.json`.',
    ''
  ];
  writeFileSync(join(ROOT, 'docs', 'russian-course-attribution.md'), attribution.join('\n'));

  const attributionData = {
    language: 'ru',
    generatedAt: new Date().toISOString(),
    source: 'Tatoeba',
    sourceUrl: 'https://tatoeba.org',
    downloadUrl: 'https://tatoeba.org/en/downloads',
    license: 'CC-BY 2.0 FR',
    licenseUrl: 'https://creativecommons.org/licenses/by/2.0/fr/',
    note: 'Each Lang5K row includes the Tatoeba Russian and English sentence IDs and usernames used for attribution.',
    items: selected.map((item, index) => {
      const ru = details.get(item.ruId) || {};
      const en = details.get(item.enId) || {};
      return {
        lang5kId: `ru_${String(index + 1).padStart(6, '0')}`,
        russianSentenceId: item.ruId,
        russianUsername: ru.username || 'unknown',
        englishSentenceId: item.enId,
        englishUsername: en.username || 'unknown',
        tatoebaRussianUrl: `https://tatoeba.org/en/sentences/show/${item.ruId}`,
        tatoebaEnglishUrl: `https://tatoeba.org/en/sentences/show/${item.enId}`
      };
    })
  };
  writeFileSync(join(ROOT, 'attribution-ru.json'), JSON.stringify(attributionData, null, 2) + '\n');
}

const { ru, en } = await loadSentences();
console.log(`Loaded ${ru.size} Russian and ${en.size} English sentences.`);
const candidates = await loadPairs(ru, en);
console.log(`Candidate pairs after basic filters: ${candidates.length}.`);
const selected = selectUnique(candidates);
console.log(`Selected unique pairs: ${selected.length}.`);
if (selected.length !== TARGET_COUNT) {
  throw new Error(`Could only select ${selected.length} unique pairs.`);
}
const details = await loadAttributionDetails(selected);
console.log(`Loaded attribution details for ${details.size} source sentences.`);
writeCourse(selected, details);
console.log('Russian 5K course written.');
