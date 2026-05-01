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

const renderBinView = extractFunction('renderBinView');
if (renderBinView.includes('I learned this! Remove from bin')) {
  throw new Error('Weak-bin remove control must not claim a sentence is learned without a rating.');
}
mustInclude(
  renderBinView,
  'title="Remove from weak practice after reveal"',
  'Weak-bin remove control must set a reveal-first expectation.'
);

const removeFromBin = extractFunction('removeFromBin');
mustInclude(
  removeFromBin,
  `document.querySelector('[data-reveal="'+idx+'"].revealed')`,
  'Weak-bin removal must verify the sentence was revealed before clearing it.'
);
mustInclude(
  removeFromBin,
  'Reveal the sentence and self-check before removing it from weak practice.',
  'Weak-bin removal must coach the learner instead of silently clearing hidden weak items.'
);

const revealGuard = removeFromBin.indexOf(`document.querySelector('[data-reveal="'+idx+'"].revealed')`);
const deleteIndex = removeFromBin.indexOf('delete reviewBin[idx]');
if (revealGuard < 0 || deleteIndex < 0 || revealGuard > deleteIndex) {
  throw new Error('Weak-bin reveal guard must run before deleting the weak-practice item.');
}

console.log('Weak bin reveal-before-remove validation passed.');
