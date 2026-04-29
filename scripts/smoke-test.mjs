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
const attribution = read('attribution-ru.json');
const sw = read('sw.js');
const r2Docs = read('docs/audio-r2-setup.md');
const pricing = read('pricing.html');
const attributionPage = read('attribution.html');
const terms = read('terms.html');
const privacy = read('privacy.html');
const refund = read('refund.html');
const contact = read('contact.html');
const checkout = read('checkout.html');
const access = read('access.html');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');
const publicPages = ['index.html', 'pricing.html', 'attribution.html', 'terms.html', 'privacy.html', 'refund.html', 'contact.html', 'checkout.html', 'access.html', 'app.html'];

assertIncludes('index.html', index, 'Lang5K');
assertIncludes('index.html', index, 'hosted audio');
assertIncludes('index.html', index, '5,000-sentence path');
assertIncludes('app.html', app, 'Cloze');
assertIncludes('app.html', app, 'Dictation');
assertIncludes('app.html', app, 'checks Cloudflare R2 first');
assertIncludes('app.html', app, 'showClozeView');
assertIncludes('app.html', app, 'showDictationView');
assertIncludes('manifest.webmanifest', manifest, '"name": "Lang5K"');
assertIncludes('audio-manifest-ru.json', audioManifest, '"language": "ru"');
assertIncludes('attribution-ru.json', attribution, '"license": "CC-BY 2.0 FR"');
assertIncludes('sw.js', sw, 'checkout.html');
assertIncludes('pricing.html', pricing, 'Professional launch');
assertIncludes('pricing.html', pricing, 'Start secure checkout');
assertIncludes('checkout.html', checkout, '/api/create-checkout-session');
assertIncludes('access.html', access, '/api/verify-checkout-session');
assertIncludes('attribution.html', attributionPage, 'Creative Commons Attribution 2.0 France');
assertIncludes('terms.html', terms, 'Terms of Use');
assertIncludes('privacy.html', privacy, 'local storage');
assertIncludes('refund.html', refund, 'Refund Policy');
assertIncludes('contact.html', contact, 'Contact Lang5K');
assertIncludes('robots.txt', robots, 'Sitemap: https://www.lang5k.com/sitemap.xml');
assertIncludes('sitemap.xml', sitemap, 'https://www.lang5k.com/attribution.html');
assertIncludes('docs/audio-r2-setup.md', r2Docs, 'R2_PUBLIC_BASE_URL');
assertIncludes('docs/audio-r2-setup.md', r2Docs, 'R2_ENDPOINT');
assertIncludes('docs/audio-r2-setup.md', r2Docs, 'ELEVENLABS_API_KEY');

const missingLinks = [];
for (const page of publicPages) {
  const html = read(page);
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (url.includes('${') || /^(https?:|mailto:|data:|#)/.test(url)) continue;
    const clean = url.split('?')[0].split('#')[0].replace(/^\//, 'index.html');
    if (clean && !existsSync(join(root, clean))) missingLinks.push(`${page} -> ${url}`);
  }
}
if (missingLinks.length) throw new Error(`Missing local links:\n${missingLinks.join('\n')}`);

console.log('Lang5K smoke test passed.');
