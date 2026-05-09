import http from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import vm from 'node:vm';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};

function loadRows() {
  const rows = [];
  for (let i = 1; i <= 5; i++) {
    const filePath = join(ROOT, 'api', '_data', 'russian', `data${i}.js`);
    const code = readModuleData(filePath, `SENTENCES${i}`);
    rows.push(...code);
  }
  return rows;
}

function readModuleData(filePath, variable) {
  const code = `${readFileSync(filePath, 'utf8')}\n;globalThis.__DATA__=${variable};`;
  const context = {};
  vm.createContext(context);
  vm.runInContext(code, context, { filename: filePath });
  return context.__DATA__;
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
  const relative = normalize(url.pathname === '/' ? 'app.html' : url.pathname.replace(/^\/+/, ''));
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
const { port } = server.address();

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));

  async function completeCurrentCard() {
    await page.waitForSelector('.study-card');
    const nextButton = page.getByRole('button', { name: 'Next: test my memory' });
    if (await nextButton.count()) await nextButton.click();
    await page.getByRole('button', { name: 'Show Russian answer and play audio' }).click();
    await page.waitForSelector('.study-rating');
    await page.getByRole('button', { name: /Good/i }).click();
    await page.waitForTimeout(900);
  }

  await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.study-start');
  const text = await page.locator('.study-start').innerText();
  if (/All done for today/i.test(text)) {
    throw new Error('Fresh guided lesson incorrectly says all done.');
  }
  if (!/10\s+New Sentences/i.test(text.replace(/\s+/g, ' '))) {
    throw new Error(`Fresh guided lesson did not plan 10 new sentences. Saw: ${text}`);
  }
  await page.getByRole('button', { name: 'Hear lesson guide' }).click();
  await page.waitForTimeout(250);
  const translitCheck = await page.evaluate(() => {
    const analysis = eval('analyzeAttempt(SENTENCES[0][1], SENTENCES[0][0], SENTENCES[0][1])');
    return { rating: analysis?.rating, checkedAs: analysis?.checkedAs, state: analysis?.state };
  });
  if (!['good', 'easy'].includes(translitCheck.rating) || translitCheck.checkedAs !== 'transliteration') {
    throw new Error(`Transliteration recall is not accepted: ${JSON.stringify(translitCheck)}`);
  }
  await page.getByRole('button', { name: 'Start guided lesson' }).click();
  await page.getByRole('button', { name: 'Hear Audio Instructions' }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Next: test my memory' }).click();
  await page.getByRole('button', { name: 'Show Russian answer and play audio' }).click();
  await page.waitForSelector('.study-rating');
  if (pageErrors.length) {
    throw new Error(`Guided lesson produced browser errors: ${pageErrors.join('; ')}`);
  }
  const revealText = await page.locator('.study-card').innerText();
  if (!/Self-check before rating/i.test(revealText)) {
    throw new Error('Blank optional recall did not show the self-check rubric.');
  }
  await page.getByRole('button', { name: /Good/i }).dblclick();
  await page.waitForTimeout(900);
  const firstClickState = await page.evaluate(() => ({
    studyIndex: eval('studyIndex'),
    goodCount: eval('studySessionStats.goodCount')
  }));
  if (firstClickState.studyIndex !== 1 || firstClickState.goodCount !== 1) {
    throw new Error(`Rating guard failed. State after double click: ${JSON.stringify(firstClickState)}`);
  }
  for (let i = 0; i < 40; i++) {
    if (await page.locator('.study-summary').count()) break;
    await completeCurrentCard();
  }
  await page.waitForSelector('.study-summary');
  const queueState = await page.evaluate(() => ({
    queueLength: eval('studyQueue.length'),
    delayed: eval('studyQueue.filter(item => item.sessionDelayed).length'),
    delayedGaps: eval('studyQueue.map((item,index)=>item.sessionDelayed ? index - item.sourceIndex - 1 : null).filter(value => value !== null)'),
    firstNewIdx: eval('studyQueue.find(item => item.type === "new")?.idx'),
    firstNewSrs: eval('srsData[studyQueue.find(item => item.type === "new")?.idx]')
  }));
  if (queueState.delayed < 1) {
    throw new Error(`Guided session did not add delayed same-session recall. Queue length: ${queueState.queueLength}`);
  }
  if (queueState.delayedGaps.some(gap => gap < 2)) {
    throw new Error(`Delayed recall happened too soon. Gaps: ${queueState.delayedGaps.join(',')}`);
  }
  if (!queueState.firstNewSrs || queueState.firstNewSrs.box > 1 || queueState.firstNewSrs.intervalDays > 3) {
    throw new Error(`Same-session delayed recall over-promoted first new card: ${JSON.stringify(queueState.firstNewSrs)}`);
  }
  await page.getByRole('button', { name: /Start dictation|Start cloze drill/i }).click();
  await page.waitForSelector('.practice-card');
  const practiceState = await page.evaluate(() => ({
    picked: eval('dictationCurrent?.idx ?? clozeCurrent?.idx ?? null'),
    session: eval('studyQueue.map(item => item.idx)')
  }));
  if (!practiceState.session.includes(practiceState.picked)) {
    throw new Error(`Post-session practice picked unseen sentence ${practiceState.picked}; session was ${practiceState.session.join(',')}.`);
  }
  console.log('Headless app flow check passed.');
} finally {
  await browser.close();
  server.close();
}
