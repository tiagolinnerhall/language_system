import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function extractFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  if (start < 0) throw new Error(`Missing function ${name}`);
  const next = app.indexOf('\nfunction ', start + 1);
  return app.slice(start, next < 0 ? app.length : next);
}

function mustInclude(source, marker, message) {
  if (!source.includes(marker)) throw new Error(message || `Missing marker: ${marker}`);
}

const toggleLearned = extractFunction('toggleLearned');

mustInclude(toggleLearned, 'delete reviewBin[idx];', 'Marking a sentence learned must remove it from weak practice.');
mustInclude(toggleLearned, "localStorage.setItem(storagePrefix+'review_bin',JSON.stringify(reviewBin));", 'Weak-practice cleanup must be persisted.');
mustInclude(toggleLearned, 'updateBinBadge();', 'Weak-practice cleanup must refresh the visible review-bin count.');

const markLearnedIndex = toggleLearned.indexOf('learned[idx]=true;');
const deleteWeakIndex = toggleLearned.indexOf('delete reviewBin[idx];');
const persistWeakIndex = toggleLearned.indexOf("localStorage.setItem(storagePrefix+'review_bin',JSON.stringify(reviewBin));");
const persistLearnedIndex = toggleLearned.indexOf("localStorage.setItem(storagePrefix+'learned',JSON.stringify(learned));");

if (markLearnedIndex < 0 || deleteWeakIndex < 0 || persistWeakIndex < 0 || persistLearnedIndex < 0) {
  throw new Error('Learned weak-practice cleanup validation could not inspect toggleLearned order.');
}

if (!(markLearnedIndex < deleteWeakIndex && deleteWeakIndex < persistWeakIndex && persistWeakIndex < persistLearnedIndex)) {
  throw new Error('Weak-practice cleanup must happen while marking learned and before learned progress is persisted.');
}

console.log('Learned weak-practice cleanup validation passed.');
