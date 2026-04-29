import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) {
    throw new Error(`Missing required file: ${path}`);
  }
  return readFileSync(absolute, 'utf8');
}

function assertIncludes(file, content, marker) {
  if (!content.includes(marker)) {
    throw new Error(`${file} is missing marker: ${marker}`);
  }
}

const index = read('index.html');
const app = read('app.html');
const manifest = read('manifest.webmanifest');
const audioManifest = read('audio-manifest-ru.json');
const sw = read('sw.js');
const r2Docs = read('docs/audio-r2-setup.md');

assertIncludes('index.html', index, 'Lang5K');
assertIncludes('index.html', index, 'R2-hosted native audio');
assertIncludes('index.html', index, '5,000-sentence path');
assertIncludes('app.html', app, 'Cloze');
assertIncludes('app.html', app, 'Dictation');
assertIncludes('app.html', app, 'checks Cloudflare R2 first');
assertIncludes('app.html', app, 'showClozeView');
assertIncludes('app.html', app, 'showDictationView');
assertIncludes('manifest.webmanifest', manifest, '"name": "Lang5K"');
assertIncludes('audio-manifest-ru.json', audioManifest, '"language": "ru"');
assertIncludes('sw.js', sw, 'languages/russian/data5.js');
assertIncludes('docs/audio-r2-setup.md', r2Docs, 'R2_PUBLIC_BASE_URL');
assertIncludes('docs/audio-r2-setup.md', r2Docs, 'R2_ENDPOINT');
assertIncludes('docs/audio-r2-setup.md', r2Docs, 'ELEVENLABS_API_KEY');

console.log('Lang5K smoke test passed.');
