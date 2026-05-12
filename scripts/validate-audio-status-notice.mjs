import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const app = readFileSync(join(process.cwd(), 'app.html'), 'utf8');

function mustInclude(marker, message) {
  if (!app.includes(marker)) throw new Error(message || `Missing marker: ${marker}`);
}

mustInclude('id="audioStatusNotice"', 'App shell must reserve space for learner-visible audio status.');
mustInclude('function renderAudioStatusNotice()', 'App must render a dynamic audio status notice.');
mustInclude('Hosted audio ready', 'Audio status must confirm when hosted audio is ready.');
mustInclude('reports it instead of using robotic browser speech', 'Audio status must explain that missing hosted files do not fall back to robotic speech.');
mustInclude('renderAudioStatusNotice();', 'Audio status must refresh after data or manifest loading.');
mustInclude('.audio-status', 'Audio notice needs explicit styling so it is visible but not disruptive.');

console.log('Audio status notice validation passed.');
