import http from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import vm from 'node:vm';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const OUT_DIR = join(ROOT, 'docs', 'qa');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function readModuleData(filePath, variable) {
  const code = `${readFileSync(filePath, 'utf8')}\n;globalThis.__DATA__=${variable};`;
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context, { filename: filePath });
  return context.__DATA__;
}

function loadRows() {
  const rows = [];
  for (let i = 1; i <= 5; i++) {
    rows.push(...readModuleData(join(ROOT, 'api', '_data', 'russian', `data${i}.js`), `SENTENCES${i}`));
  }
  return rows;
}

const rows = loadRows();
const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/api/course') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ language: 'russian', mode: 'demo', total: rows.length, limit: 80, sentences: rows.slice(0, 80) }));
    return;
  }
  if (url.pathname === '/api/analytics' || url.pathname === '/api/progress') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  const relative = normalize(url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, ''));
  if (relative.startsWith('..')) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  const filePath = join(ROOT, relative);
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
  createReadStream(filePath).pipe(res);
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => {
    server.off('error', reject);
    resolve();
  });
});

mkdirSync(OUT_DIR, { recursive: true });
const { port } = server.address();
const browser = await chromium.launch({ headless: true });

async function assertNoOverflow(page, label) {
  const metrics = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyText: document.body.innerText.trim().length
  }));
  if (metrics.bodyText < 200) throw new Error(`${label} rendered too little text.`);
  if (metrics.scrollWidth > metrics.width + 4) {
    throw new Error(`${label} has horizontal overflow: ${metrics.scrollWidth}px content in ${metrics.width}px viewport.`);
  }
}

async function assertElementSettled(page, selector, label) {
  const state = await page.locator(selector).first().evaluate((el) => {
    const style = getComputedStyle(el);
    return { opacity: Number(style.opacity), color: style.color, text: el.textContent || '' };
  });
  if (state.opacity < 0.98) throw new Error(`${label} is still faded at opacity ${state.opacity}.`);
  if (!state.text.trim()) throw new Error(`${label} rendered without text.`);
}

try {
  for (const viewport of [
    { name: 'desktop', width: 1366, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
    { name: 'compact-mobile', width: 360, height: 640 }
  ]) {
    const page = await browser.newPage({ viewport });
    await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1`, { waitUntil: 'networkidle' });
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('.study-start');
    await page.waitForTimeout(500);
    const modeTabsDisplay = await page.locator('#modeTabs').evaluate((el) => getComputedStyle(el).display);
    if (modeTabsDisplay !== 'none') {
      throw new Error(`app ${viewport.name} first-run screen exposes duplicate mode tabs.`);
    }
    const startText = await page.locator('.study-start').innerText();
    if (!/Demo:\s+80 of 5000 sentences/i.test(startText.replace(/\s+/g, ' '))) {
      throw new Error(`app ${viewport.name} study start does not show demo/full access context.`);
    }
    const ctaBox = await page.getByRole('button', { name: 'Start guided lesson' }).boundingBox();
    if (!ctaBox || ctaBox.y + ctaBox.height > viewport.height) {
      throw new Error(`app ${viewport.name} primary lesson CTA is not visible in the first viewport.`);
    }
    await assertNoOverflow(page, `app ${viewport.name} study start`);
    await page.screenshot({ path: join(OUT_DIR, `lang5k-app-study-${viewport.name}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Start guided lesson' }).click();
    await page.getByRole('button', { name: 'Next: test my memory' }).click();
    await page.getByRole('button', { name: 'Show Russian answer and play audio' }).click();
    await page.waitForSelector('.study-rating');
    await page.waitForTimeout(500);
    await assertElementSettled(page, '.study-target', `app ${viewport.name} reveal target`);
    await assertElementSettled(page, '.study-rating button', `app ${viewport.name} rating button`);
    await assertNoOverflow(page, `app ${viewport.name} reveal`);
    await page.screenshot({ path: join(OUT_DIR, `lang5k-app-reveal-${viewport.name}.png`), fullPage: true });
    await page.close();
  }
  const pricing = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await pricing.goto(`http://127.0.0.1:${port}/pricing.html?checkout=cancelled`, { waitUntil: 'networkidle' });
  await assertNoOverflow(pricing, 'pricing mobile cancelled');
  await pricing.screenshot({ path: join(OUT_DIR, 'lang5k-pricing-mobile.png'), fullPage: true });
  await pricing.close();
  const access = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await access.goto(`http://127.0.0.1:${port}/access.html`, { waitUntil: 'networkidle' });
  await access.waitForSelector('#recoveryEmail');
  const accessText = await access.locator('body').innerText();
  if (/Missing checkout session/i.test(accessText)) {
    throw new Error('access recovery page still opens as a missing-checkout error.');
  }
  if (!/Ready to send a recovery code/i.test(accessText)) {
    throw new Error('access recovery page does not open in recovery-first state.');
  }
  await assertNoOverflow(access, 'access recovery mobile');
  await access.screenshot({ path: join(OUT_DIR, 'lang5k-access-recovery-mobile.png'), fullPage: true });
  await access.close();
  console.log('Headless visual quality check passed.');
} finally {
  await browser.close();
  server.close();
}
