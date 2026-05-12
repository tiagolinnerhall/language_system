import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function mustInclude(marker, message) {
  if (!app.includes(marker)) throw new Error(message || `Missing marker: ${marker}`);
}

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

for (const marker of [
  "JSON.parse(localStorage.getItem(storagePrefix+'learned')||'{}')",
  "JSON.parse(localStorage.getItem(storagePrefix+'review_bin')||'{}')",
  "JSON.parse(localStorage.getItem(storagePrefix+'srs')||'{}')",
  "JSON.parse(localStorage.getItem(storagePrefix+'stats')||'{}')"
]) {
  if (app.includes(marker)) {
    throw new Error(`Startup must not parse localStorage directly: ${marker}`);
  }
}

const readLocalJsonObject = extractFunction('readLocalJsonObject');
mustInclude('try{', 'Local storage reader must catch malformed JSON.');
mustInclude('localStorage.removeItem(key);', 'Malformed local storage should be cleared so reloads can recover.');
if (!/return parsed && typeof parsed==='object' && !Array\.isArray\(parsed\)\?parsed:\{\};/.test(readLocalJsonObject)) {
  throw new Error('Local storage reader must return only plain object-like progress data.');
}

for (const marker of [
  "let learned=readLocalJsonObject(storagePrefix+'learned');",
  "let reviewBin=readLocalJsonObject(storagePrefix+'review_bin');",
  "let srsData=readLocalJsonObject(storagePrefix+'srs');",
  "let userStats=readLocalJsonObject(storagePrefix+'stats');"
]) {
  mustInclude(marker, `Startup state must use safe local storage reader: ${marker}`);
}

const normalizeStoredProgress = extractFunction('normalizeStoredProgress');
for (const marker of [
  'sanitizeProgressBackupMap(learned,progressLimit)',
  'sanitizeProgressBackupMap(reviewBin,progressLimit)',
  'sanitizeProgressBackupSrs(srsData,progressLimit)',
  'sanitizeProgressBackupStats(userStats,progressLimit)',
  "localStorage.setItem(storagePrefix+'learned',JSON.stringify(learned));",
  "localStorage.setItem(storagePrefix+'review_bin',JSON.stringify(reviewBin));",
  "localStorage.setItem(storagePrefix+'srs',JSON.stringify(srsData));",
  "localStorage.setItem(storagePrefix+'stats',JSON.stringify(userStats));"
]) {
  if (!normalizeStoredProgress.includes(marker)) {
    throw new Error(`Stored progress normalization missing marker: ${marker}`);
  }
}

const loadLanguageData = extractFunction('loadLanguageData');
if (loadLanguageData.indexOf('normalizeStoredProgress();') < 0) {
  throw new Error('Course loading must normalize stored progress after sentences are loaded.');
}

console.log('Safe local storage startup validation passed.');
