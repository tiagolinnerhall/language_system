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
if (app.includes('revealAllBin')) {
  throw new Error('Weak-bin repair must not expose a Reveal All shortcut.');
}
if (app.includes('Audio plays first') || app.includes('Listen first, keep the text hidden')) {
  throw new Error('Weak-bin copy must not teach answer audio before recall.');
}
if (renderBinView.includes('english hidden-text')) {
  throw new Error('Weak-bin repair must keep the English meaning visible for active recall.');
}
mustInclude(
  renderBinView,
  'Read the English meaning, try the Russian from memory',
  'Weak-bin repair must prompt recall before reveal.'
);
mustInclude(
  renderBinView,
  'title="Remove from weak practice after reveal"',
  'Weak-bin remove control must set a reveal-first expectation.'
);

const removeFromBin = extractFunction('removeFromBin');
const speakBin = extractFunction('speakBin');
mustInclude(
  speakBin,
  'Try recall from the English meaning first. Reveal before listening to the Russian answer.',
  'Weak-bin answer audio must be gated until after recall and reveal.'
);
mustInclude(
  removeFromBin,
  `document.querySelector('[data-reveal="'+idx+'"].revealed')`,
  'Weak-bin removal must verify the sentence was revealed before clearing it.'
);
mustInclude(
  removeFromBin,
  'Reveal the sentence and self-check before choosing a rating.',
  'Weak-bin removal must coach the learner instead of silently clearing hidden weak items.'
);

const revealGuard = removeFromBin.indexOf(`document.querySelector('[data-reveal="'+idx+'"].revealed')`);
if (removeFromBin.includes('delete reviewBin[idx]') || removeFromBin.includes("rateBinCard(idx,'good')")) {
  throw new Error('Weak-bin checkmark must not remove or auto-rate a weak item.');
}
if (revealGuard < 0) {
  throw new Error('Weak-bin reveal guard must run before showing rating guidance.');
}

console.log('Weak bin reveal-before-remove validation passed.');
