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
const teacherChatBodies = [];
const teacherTranscribeBodies = [];
const progressArchives = [
  {
    archiveId: 'archive-2',
    revision: 2,
    reason: 'superseded',
    archivedAt: '2026-05-10T10:00:00.000Z',
    originalUpdatedAt: '2026-05-10T09:58:00.000Z',
    summary: { learnedCount: 4, srsCount: 6, reviewBinCount: 1, dailyGoal: 10, todayNew: 2, todayReviews: 3 }
  },
  {
    archiveId: 'archive-1',
    revision: 1,
    reason: 'stale-client-save',
    archivedAt: '2026-05-10T09:00:00.000Z',
    originalUpdatedAt: '2026-05-10T08:55:00.000Z',
    summary: { learnedCount: 2, srsCount: 5, reviewBinCount: 0, dailyGoal: 10, todayNew: 1, todayReviews: 1 },
    conflictSummary: { learnedCount: 7, srsCount: 9, reviewBinCount: 2, dailyGoal: 15, todayNew: 3, todayReviews: 4 }
  }
];
let progressCurrent = {
  progress: null,
  updatedAt: '2026-05-10T10:05:00.000Z',
  revision: 3
};
let teacherAutopilotPlannerCount = 0;
let courseResponseDelayMs = 0;
let audioManifestDelayMs = 0;
let teacherChatFailure = false;

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/api/course') {
    const sendCourse = () => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ language: 'russian', mode: 'demo', total: rows.length, limit: 80, sentences: rows.slice(0, 80) }));
    };
    if (courseResponseDelayMs > 0) setTimeout(sendCourse, courseResponseDelayMs);
    else sendCourse();
    return;
  }
  if (url.pathname === '/api/teacher-chat') {
    if (url.searchParams.get('transcribe') === '1') {
      const chunks = [];
      req.on('data', chunk => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      req.on('end', () => {
        teacherTranscribeBodies.push({
          bytes: Buffer.concat(chunks).length,
          contentType: req.headers['content-type'] || ''
        });
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, text: 'what does привет mean' }));
      });
      return;
    }
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
    });
    req.on('end', () => {
      if (teacherChatFailure) {
        res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'AI unavailable for regression test.' }));
        return;
      }
      const body = JSON.parse(raw || '{}');
      teacherChatBodies.push(body);
      const message = String(body.message || '').toLowerCase();
      let reply = 'AI Autopilot decided: start with the guided lesson and keep 10 new sentences only if due reviews stay clear.';
      let action = 'none';
      if (message.includes('autopilot: decide the next best step')) {
        teacherAutopilotPlannerCount += 1;
        if (teacherAutopilotPlannerCount === 1) action = 'open_browse';
      }
      if (message.includes('what should') || message.includes('what now')) {
        reply = 'AI Autopilot decided: do not reveal yet. Try recall first, then compare the answer.';
      } else if (message.includes('why this now')) {
        reply = 'AI Autopilot decided: Lang5K selected a new sentence in the guided sequence.';
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        reply,
        action,
        speak: false,
        difficulty: 'normal',
        focus: 'study'
      }));
    });
    return;
  }
  if (url.pathname === '/api/teacher-voice') {
    res.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ error: 'Teacher voice unavailable in test.' }));
    return;
  }
  if (url.pathname === '/api/progress') {
    if (req.method === 'GET' && url.searchParams.get('history') === '1') {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        progress: progressCurrent.progress,
        updatedAt: progressCurrent.updatedAt,
        revision: progressCurrent.revision,
        archives: progressArchives
      }));
      return;
    }
    if (req.method === 'POST') {
      let raw = '';
      req.on('data', chunk => {
        raw += chunk;
      });
      req.on('end', () => {
        const body = JSON.parse(raw || '{}');
        if (body.archiveId || body.restoreRevision) {
          const archive = progressArchives.find(item => item.archiveId === body.archiveId || String(item.revision) === String(body.restoreRevision));
          const restoredStats = body.restoreConflict && archive?.conflictSummary
            ? { dailyGoal: archive.conflictSummary.dailyGoal, todayNew: archive.conflictSummary.todayNew, todayReviews: archive.conflictSummary.todayReviews }
            : { dailyGoal: archive?.summary?.dailyGoal || 10, todayNew: archive?.summary?.todayNew || 0, todayReviews: archive?.summary?.todayReviews || 0 };
          progressCurrent = {
            revision: progressCurrent.revision + 1,
            updatedAt: new Date(Date.parse(progressCurrent.updatedAt) + 60000).toISOString(),
            progress: {
              learned: { 0: true },
              reviewBin: {},
              srsData: {},
              userStats: restoredStats,
              activeSession: { mode: 'study', studyViewActive: false, teacherModeEnabled: false, teacherAutopilotEnabled: false },
              clientUpdatedAt: Date.now()
            }
          };
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({
            ok: true,
            restored: true,
            revision: progressCurrent.revision,
            updatedAt: progressCurrent.updatedAt,
            progress: progressCurrent.progress
          }));
          return;
        }
        if (body.baseRevision !== progressCurrent.revision && progressCurrent.progress) {
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ ok: true, conflict: true, revision: progressCurrent.revision, updatedAt: progressCurrent.updatedAt, progress: progressCurrent.progress }));
          return;
        }
        progressCurrent = {
          revision: progressCurrent.revision + 1,
          updatedAt: new Date(Date.parse(progressCurrent.updatedAt) + 60000).toISOString(),
          progress: body.progress || null
        };
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ ok: true, revision: progressCurrent.revision, updatedAt: progressCurrent.updatedAt }));
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (url.pathname === '/api/analytics') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (url.pathname === '/audio-manifest-ru.json' && audioManifestDelayMs > 0) {
    setTimeout(() => {
      const filePath = join(ROOT, 'audio-manifest-ru.json');
      res.writeHead(200, { 'Content-Type': MIME['.json'] });
      createReadStream(filePath).pipe(res);
    }, audioManifestDelayMs);
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
  await page.addInitScript(() => {
    window.__speechRecognitionInstances = [];
    window.__speechSynthesisCalls = [];
    window.speechSynthesis = {
      cancel() {},
      speak(utterance) {
        window.__speechSynthesisCalls.push(utterance.text || '');
        if (utterance.onend) setTimeout(() => utterance.onend(), 0);
      }
    };
    window.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };
    class FakeSpeechRecognition {
      constructor() {
        this.lang = 'en-US';
        this.continuous = false;
        this.interimResults = false;
        this.maxAlternatives = 1;
        window.__speechRecognitionInstances.push(this);
        window.__lastSpeechRecognition = this;
      }
      start() {
        this.started = true;
        if (this.onstart) setTimeout(() => this.onstart(), 0);
      }
      stop() {
        this.started = false;
        if (this.onend) setTimeout(() => this.onend(), 0);
      }
    }
    window.__FakeSpeechRecognition = FakeSpeechRecognition;
    window.SpeechRecognition = FakeSpeechRecognition;
    window.webkitSpeechRecognition = FakeSpeechRecognition;
    class FakeMediaRecorder {
      constructor(stream, options = {}) {
        this.stream = stream;
        this.mimeType = options.mimeType || 'audio/webm';
        this.state = 'inactive';
        window.__lastMediaRecorder = this;
      }
      static isTypeSupported() {
        return true;
      }
      start() {
        this.state = 'recording';
        if (this.onstart) setTimeout(() => this.onstart(), 0);
      }
      stop() {
        if (this.ondataavailable) {
          this.ondataavailable({ data: new Blob(['voice data'], { type: this.mimeType }) });
        }
        this.state = 'inactive';
        if (this.onstop) setTimeout(() => this.onstop(), 0);
      }
      requestData() {
        if (this.ondataavailable) {
          this.ondataavailable({ data: new Blob(['voice data'], { type: this.mimeType }) });
        }
      }
    }
    window.MediaRecorder = FakeMediaRecorder;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }]
        })
      }
    });
    window.AudioContext = class {
      createMediaStreamSource() {
        return { connect() {} };
      }
      createAnalyser() {
        return {
          fftSize: 1024,
          connect() {},
          getByteTimeDomainData(values) {
            values.fill(128);
          }
        };
      }
      close() {}
    };
    window.webkitAudioContext = window.AudioContext;
    window.__emitTeacherSpeech = transcript => {
      const recognition = window.__lastSpeechRecognition;
      if (!recognition?.started || !recognition?.onresult) return;
      recognition.onresult({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript } }]
      });
    };
  });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('dialog', dialog => dialog.accept());

  courseResponseDelayMs = 900;
  const bootPage = await browser.newPage();
  await bootPage.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1`, { waitUntil: 'domcontentloaded' });
  await bootPage.waitForSelector('.loading');
  const bootState = await bootPage.evaluate(() => {
    const visible = selector => {
      const el = document.querySelector(selector);
      return el ? getComputedStyle(el).display !== 'none' : false;
    };
    return {
      bodyBooting: document.body.classList.contains('app-booting'),
      coach: visible('.learning-coach'),
      dashboard: visible('#dashboard'),
      modeTabs: visible('#modeTabs'),
      filters: visible('#filtersBar'),
      teacherPanel: visible('#teacherPanel'),
      loadingText: document.getElementById('app')?.textContent || ''
    };
  });
  if (!bootState.bodyBooting || bootState.coach || bootState.dashboard || bootState.modeTabs || bootState.filters || bootState.teacherPanel || !/Loading sentences/i.test(bootState.loadingText)) {
    throw new Error(`Boot showed unstable learner shell before course data loaded: ${JSON.stringify(bootState)}`);
  }
  await bootPage.waitForSelector('.study-start', { timeout: 8000 });
  const firstReadyState = await bootPage.evaluate(() => ({
    bodyBooting: document.body.classList.contains('app-booting'),
    mode: eval('currentMode'),
    browseActive: document.getElementById('mainView')?.classList.contains('hidden') === false,
    studyActive: document.getElementById('studyView')?.classList.contains('active') || false,
    loadingVisible: /Loading sentences/i.test(document.getElementById('app')?.textContent || '')
  }));
  if (firstReadyState.bodyBooting || firstReadyState.mode !== 'study' || !firstReadyState.studyActive || firstReadyState.loadingVisible) {
    throw new Error(`Boot did not settle directly on the guided study screen: ${JSON.stringify(firstReadyState)}`);
  }
  await bootPage.close();
  courseResponseDelayMs = 0;

  audioManifestDelayMs = 1200;
  await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1&resetProgress=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.study-start', { timeout: 8000 });
  const delayedManifestState = await page.evaluate(() => ({
    manifestLoaded: eval('hostedAudioIds !== null'),
    statusText: document.getElementById('audioStatusNotice')?.textContent || '',
    startText: document.querySelector('.study-start')?.textContent || ''
  }));
  if (!delayedManifestState.manifestLoaded || /loading/i.test(delayedManifestState.statusText)) {
    throw new Error(`Guided lesson became clickable before hosted audio manifest was ready: ${JSON.stringify(delayedManifestState)}`);
  }
  await page.getByRole('button', { name: 'Start guided lesson' }).click();
  await page.waitForSelector('.study-card');
  const firstAudioReadyState = await page.evaluate(() => ({
    status: document.getElementById('teacherVoiceStatus')?.textContent || '',
    card: document.querySelector('.study-card')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 260) || ''
  }));
  if (/still loading/i.test(firstAudioReadyState.status)) {
    throw new Error(`First lesson hit audio before manifest was ready: ${JSON.stringify(firstAudioReadyState)}`);
  }
  audioManifestDelayMs = 0;

  async function completeCurrentCard() {
    await page.waitForSelector('.study-card');
    const spacingButton = page.getByRole('button', { name: 'Continue' });
    if (await spacingButton.count()) {
      await spacingButton.click();
      await page.waitForTimeout(200);
      return;
    }
    const nextButton = page.locator('button[onclick="showNewRecallCard()"]');
    if (await nextButton.count()) await nextButton.click();
    const stillNewIntro = await page.evaluate(() => /NEW SENTENCE/i.test(document.querySelector('.study-card')?.textContent || ''));
    if (stillNewIntro) {
      const canShowRecall = await page.evaluate(() => eval('Boolean(studyQueue[studyIndex] && studyQueue[studyIndex].type === "new")'));
      if (canShowRecall) await page.evaluate(() => eval('showNewRecallCard()'));
    }
    const revealButton = page.getByRole('button', { name: 'Show Russian answer and play audio' });
    if (!(await revealButton.count())) {
      if (await page.locator('.study-summary').count()) return;
      const startButton = page.getByRole('button', { name: 'Start guided lesson' });
      if (await startButton.count()) {
        await startButton.click();
        await page.waitForTimeout(200);
        return;
      }
      const state = await page.evaluate(() => ({
        studyIndex: eval('studyIndex'),
        studyRevealed: eval('studyRevealed'),
        card: document.querySelector('.study-card')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500) || ''
      }));
      throw new Error(`Study card had no reveal button: ${JSON.stringify(state)}`);
    }
    await revealButton.click();
    try {
      await page.waitForSelector('.study-rating', { timeout: 5000 });
    } catch (error) {
      const state = await page.evaluate(() => ({
        teacherModeEnabled: eval('teacherModeEnabled'),
        studyIndex: eval('studyIndex'),
        studyRevealed: eval('studyRevealed'),
        message: document.getElementById('teacherMessage')?.textContent || '',
        card: document.querySelector('.study-card')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 500) || ''
      }));
      throw new Error(`Study card did not reveal rating controls: ${JSON.stringify(state)}`);
    }
    await page.getByRole('button', { name: /Good/i }).click();
    await page.waitForFunction(() => !document.body.classList.contains('study-advance-lock'), null, { timeout: 5000 });
    await page.waitForFunction(() => {
      const revealed = window.eval ? window.eval('studyRevealed') : false;
      return !revealed || Boolean(document.querySelector('.study-summary'));
    }, null, { timeout: 5000 });
  }

  await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.study-start');
  const text = await page.locator('.study-start').innerText();
  if (/All done for today/i.test(text)) {
    throw new Error('Fresh guided lesson incorrectly says all done.');
  }
  await page.keyboard.press('Space');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  if (pageErrors.length) {
    throw new Error(`Study start keyboard shortcut produced browser errors: ${pageErrors.join('; ')}`);
  }
  if (!/10\s+New Sentences/i.test(text.replace(/\s+/g, ' '))) {
    throw new Error(`Fresh guided lesson did not plan 10 new sentences. Saw: ${text}`);
  }
  await page.evaluate(() => {
    const today = eval('getToday()');
    localStorage.setItem('russian_srs', JSON.stringify({ 0: { box: 1, nextReview: today, lastReview: today, reps: 1 } }));
    localStorage.setItem('russian_review_bin', JSON.stringify({ 0: true }));
    localStorage.setItem('russian_stats', JSON.stringify({ dailyGoal: 10, todayNew: 10, todayReviews: 4, lastStudyDate: today }));
    localStorage.setItem('russian_teacher_autopilot', '1');
  });
  await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1&resetProgress=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.study-start');
  const resetState = await page.evaluate(() => ({
    url: window.location.href,
    srs: JSON.parse(localStorage.getItem('russian_srs') || '{}'),
    reviewBin: JSON.parse(localStorage.getItem('russian_review_bin') || '{}'),
    stats: JSON.parse(localStorage.getItem('russian_stats') || '{}'),
    teacherAutopilot: localStorage.getItem('russian_teacher_autopilot'),
    startText: document.querySelector('.study-start')?.textContent || ''
  }));
  if (resetState.url.includes('resetProgress') || Object.keys(resetState.srs).length || Object.keys(resetState.reviewBin).length || resetState.teacherAutopilot !== null || !/10\s*New Sentences/i.test(resetState.startText.replace(/\s+/g, ' '))) {
    throw new Error(`Fresh-start reset did not clear local progress: ${JSON.stringify(resetState)}`);
  }
  await page.evaluate(() => {
    const today = eval('getToday()');
    localStorage.setItem('russian_learned', JSON.stringify({ 5: true, 120: true }));
    localStorage.setItem('russian_review_bin', JSON.stringify({ 120: true }));
    localStorage.setItem('russian_srs', JSON.stringify({ 120: { box: 2, nextReview: today, lastReview: today, lastRating: 'good' } }));
    localStorage.setItem('russian_stats', JSON.stringify({ dailyGoal: 10, todayNew: 120, todayReviews: 80, date: today }));
  });
  await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.study-start');
  const demoProgressPreserveState = await page.evaluate(() => ({
    learned: JSON.parse(localStorage.getItem('russian_learned') || '{}'),
    reviewBin: JSON.parse(localStorage.getItem('russian_review_bin') || '{}'),
    srs: JSON.parse(localStorage.getItem('russian_srs') || '{}'),
    stats: JSON.parse(localStorage.getItem('russian_stats') || '{}')
  }));
  if (!demoProgressPreserveState.learned['120'] || !demoProgressPreserveState.reviewBin['120'] || !demoProgressPreserveState.srs['120'] || demoProgressPreserveState.stats.todayNew !== 120) {
    throw new Error(`Demo mode truncated full-course progress indexes: ${JSON.stringify(demoProgressPreserveState)}`);
  }
  const activeSessionResumeState = await page.evaluate(() => eval(`(() => {
    const session = {
      mode: 'study',
      studyViewActive: true,
      studyIndex: 0,
      studyQueue: [{ idx: 0, type: 'review' }, { idx: 1, type: 'review' }],
      studyRevealed: false,
      studySessionStats: { newCount: 0, reviewCount: 1, againCount: 0, hardCount: 0, goodCount: 1, easyCount: 0 },
      teacherModeEnabled: true,
      teacherAutopilotEnabled: true,
      typedAttempt: 'privet'
    };
    applyProgressPayload({ learned: {}, reviewBin: {}, srsData: {}, userStats: { dailyGoal: 10 }, activeSession: session });
    openInitialLearnerView();
    return {
      mode: currentMode,
      studyViewActive,
      studyIndex,
      card: document.querySelector('.study-card')?.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 220) || '',
      input: document.getElementById('studyInput')?.value || '',
      startVisible: Boolean(document.querySelector('.study-start'))
    };
  })()`));
  if (activeSessionResumeState.mode !== 'study' || !activeSessionResumeState.studyViewActive || activeSessionResumeState.studyIndex !== 0 || activeSessionResumeState.input !== 'privet' || activeSessionResumeState.startVisible) {
    throw new Error(`Active study session did not resume on its card: ${JSON.stringify(activeSessionResumeState)}`);
  }
  const revealedSessionResumeState = await page.evaluate(() => eval(`(() => {
    const session = {
      mode: 'study',
      studyViewActive: true,
      studyIndex: 0,
      studyQueue: [{ idx: 0, type: 'review' }],
      studyRevealed: true,
      studySessionStats: { newCount: 0, reviewCount: 0, againCount: 0, hardCount: 0, goodCount: 0, easyCount: 0 },
      teacherModeEnabled: true,
      teacherAutopilotEnabled: true,
      typedAttempt: 'privet'
    };
    applyProgressPayload({ learned: {}, reviewBin: {}, srsData: {}, userStats: { dailyGoal: 10 }, activeSession: session });
    openInitialLearnerView();
    return {
      studyRevealed,
      hasRating: Boolean(document.querySelector('.study-rating')),
      hasTarget: Boolean(document.querySelector('.study-target')),
      index: studyIndex
    };
  })()`));
  if (!revealedSessionResumeState.studyRevealed || !revealedSessionResumeState.hasRating || !revealedSessionResumeState.hasTarget || revealedSessionResumeState.index !== 0) {
    throw new Error(`Revealed active session did not restore compare/rating state: ${JSON.stringify(revealedSessionResumeState)}`);
  }
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1&resetProgress=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.study-start');
  const demoTeacherGate = await page.evaluate(async () => eval(`(async () => {
    courseAccessMode = 'demo';
    teacherAutopilotEnabled = true;
    localStorage.setItem(storagePrefix + 'teacher_autopilot', '1');
    showStudyStart();
    const hasLiveButton = Boolean(document.querySelector('.study-start .teacher-live-talk'));
    const hasVoiceButton = Boolean(document.querySelector('.study-start button.audio-instructions-btn'));
    const unlockText = document.querySelector('.study-start')?.textContent || '';
    await teacherAskAi('where do I start?', { source: 'typed' });
    return {
      hasLiveButton,
      hasVoiceButton,
      autopilot: teacherAutopilotEnabled,
      status: document.getElementById('teacherVoiceStatus')?.textContent || '',
      message: document.getElementById('teacherMessage')?.textContent || '',
      unlockText
    };
  })()`));
  if (demoTeacherGate.hasLiveButton || demoTeacherGate.hasVoiceButton || demoTeacherGate.autopilot || !/full access|unlock/i.test(demoTeacherGate.unlockText + ' ' + demoTeacherGate.status + ' ' + demoTeacherGate.message)) {
    throw new Error(`Demo AI Teacher looked broken instead of gated: ${JSON.stringify(demoTeacherGate)}`);
  }
  const expiredTeacherAccessGate = await page.evaluate(() => eval(`(() => {
    courseAccessMode = 'full';
    teacherAiAccessBlocked = true;
    teacherAutopilotEnabled = true;
    localStorage.setItem(storagePrefix + 'teacher_autopilot', '1');
    showStudyStart();
    const startText = document.querySelector('.study-start')?.textContent || '';
    teacherShowAccessRequired({ expired: true });
    return {
      canUse: teacherCanUsePremiumAi(),
      hasLiveButton: Boolean(document.querySelector('.study-start .teacher-live-talk')),
      startText,
      panelText: document.getElementById('teacherPanel')?.textContent || '',
      status: document.getElementById('teacherVoiceStatus')?.textContent || '',
      autopilot: teacherAutopilotEnabled
    };
  })()`));
  if (expiredTeacherAccessGate.canUse || expiredTeacherAccessGate.hasLiveButton || expiredTeacherAccessGate.autopilot || !/sign in again|recover access|expired/i.test(expiredTeacherAccessGate.startText + ' ' + expiredTeacherAccessGate.panelText + ' ' + expiredTeacherAccessGate.status)) {
    throw new Error(`Expired AI Teacher access still looked available: ${JSON.stringify(expiredTeacherAccessGate)}`);
  }
  const liveNoteOffState = await page.evaluate(() => eval(`(() => {
    courseAccessMode = 'full';
    teacherAiAccessBlocked = false;
    teacherLiveListening = false;
    teacherListening = false;
    teacherServerMicActive = false;
    return teacherLiveControlsHTML();
  })()`));
  if (/listening until paused/i.test(liveNoteOffState) || !/Press Start Live Teacher/i.test(liveNoteOffState)) {
    throw new Error(`Live controls note contradicted mic-off state: ${liveNoteOffState}`);
  }
  const liveInstructionState = await page.evaluate(() => eval(`(() => {
    courseAccessMode = 'full';
    teacherAutopilotEnabled = true;
    teacherLiveListening = true;
    teacherListening = false;
    teacherServerMicActive = false;
    const starting = teacherLiveInstructionText();
    teacherListening = true;
    const live = teacherLiveInstructionText();
    teacherLiveListening = false;
    teacherListening = false;
    const off = teacherLiveInstructionText();
    return { starting, live, off };
  })()`));
  if (/is listening/i.test(liveInstructionState.starting) || !/starting/i.test(liveInstructionState.starting) || !/is listening/i.test(liveInstructionState.live) || !/mic is off/i.test(liveInstructionState.off)) {
    throw new Error(`Card live instruction text contradicted mic state: ${JSON.stringify(liveInstructionState)}`);
  }
  const liveInstructionRefreshState = await page.evaluate(() => eval(`(() => {
    courseAccessMode = 'full';
    teacherAutopilotEnabled = true;
    teacherLiveListening = false;
    teacherListening = false;
    teacherServerMicActive = false;
    const host = document.createElement('div');
    host.id = 'liveInstructionRefreshFixture';
    host.innerHTML = '<div class="study-instruction"><li class="teacher-live-instruction">' + teacherLiveInstructionText() + '</li>' + teacherLiveControlsHTML() + '</div>';
    document.body.appendChild(host);
    const before = {
      instruction: host.querySelector('.teacher-live-instruction')?.textContent || '',
      note: host.querySelector('.teacher-live-note')?.textContent || '',
      state: host.querySelector('.teacher-live-state')?.textContent || ''
    };
    teacherLiveListening = true;
    teacherListening = true;
    updateTeacherListeningUI();
    const after = {
      instruction: host.querySelector('.teacher-live-instruction')?.textContent || '',
      note: host.querySelector('.teacher-live-note')?.textContent || '',
      state: host.querySelector('.teacher-live-state')?.textContent || ''
    };
    host.remove();
    return { before, after };
  })()`));
  if (!/mic is off/i.test(liveInstructionRefreshState.before.instruction) || !/Press Start Live Teacher/i.test(liveInstructionRefreshState.before.note) || !/Live Teacher is listening/i.test(liveInstructionRefreshState.after.instruction) || !/teacher is listening until paused/i.test(liveInstructionRefreshState.after.note) || !/Live mic on/i.test(liveInstructionRefreshState.after.state)) {
    throw new Error(`Rendered live teacher instruction did not refresh with mic state: ${JSON.stringify(liveInstructionRefreshState)}`);
  }
  const teacherVoiceQueueState = await page.evaluate(async () => eval(`(async () => {
    courseAccessMode = 'full';
    teacherModeEnabled = true;
    teacherAutopilotEnabled = true;
    stopPlayback();
    const events = [];
    const originalPlay = playPremiumTeacherVoice;
    const originalApply = applyTeacherAiAction;
    const originalGuide = teacherGuide;
    playPremiumTeacherVoice = async (text, { onplay, onend } = {}) => {
      events.push('start:' + text);
      if (onplay) onplay();
      setTimeout(() => {
        events.push('end:' + text);
        if (onend) onend();
      }, 60);
      return true;
    };
    applyTeacherAiAction = action => events.push('action:' + action);
    teacherGuide = () => events.push('guide');
    teacherSay('first voice');
    teacherSay('second voice');
    maybeApplyTeacherAiAction('open_browse', 'typed');
    scheduleTeacherGuide(10);
    await new Promise(resolve => setTimeout(resolve, 35));
    const early = [...events];
    await new Promise(resolve => setTimeout(resolve, 420));
    const final = [...events];
    stopPlayback();
    events.length = 0;
    teacherSay('interrupt first');
    teacherSay('interrupt second');
    setTimeout(() => stopPlayback(), 20);
    await new Promise(resolve => setTimeout(resolve, 160));
    const interrupted = [...events];
    playPremiumTeacherVoice = originalPlay;
    applyTeacherAiAction = originalApply;
    teacherGuide = originalGuide;
    stopPlayback();
    return { early, final, interrupted };
  })()`));
  if (teacherVoiceQueueState.early.some(item => item.includes('second voice')) || teacherVoiceQueueState.early.some(item => item.startsWith('action:')) || teacherVoiceQueueState.early.includes('guide')) {
    throw new Error(`Teacher voice/action sequencing started too early: ${JSON.stringify(teacherVoiceQueueState)}`);
  }
  const firstStart = teacherVoiceQueueState.final.indexOf('start:first voice');
  const firstEnd = teacherVoiceQueueState.final.indexOf('end:first voice');
  const secondStart = teacherVoiceQueueState.final.indexOf('start:second voice');
  const secondEnd = teacherVoiceQueueState.final.indexOf('end:second voice');
  const actionIndex = teacherVoiceQueueState.final.indexOf('action:open_browse');
  const guideIndex = teacherVoiceQueueState.final.indexOf('guide');
  if ([firstStart, firstEnd, secondStart, secondEnd, actionIndex, guideIndex].some(index => index < 0) || !(firstStart < firstEnd && firstEnd < secondStart && secondStart < secondEnd && secondEnd < actionIndex && secondEnd < guideIndex)) {
    throw new Error(`Teacher voice/action sequencing was not ordered: ${JSON.stringify(teacherVoiceQueueState)}`);
  }
  if (teacherVoiceQueueState.interrupted.some(item => item.includes('interrupt second'))) {
    throw new Error(`stopPlayback did not clear queued teacher voice: ${JSON.stringify(teacherVoiceQueueState)}`);
  }
  const autopilotActionBlockState = await page.evaluate(async () => eval(`(async () => {
    teacherAutopilotEnabled = true;
    teacherAutopilotAwaitingLearnerTurn = false;
    const events = [];
    const originalApply = applyTeacherAiAction;
    applyTeacherAiAction = action => events.push(action);
    maybeApplyTeacherAiAction('open_browse', 'autopilot');
    await new Promise(resolve => setTimeout(resolve, 320));
    applyTeacherAiAction = originalApply;
    return {
      events,
      waiting: teacherAutopilotAwaitingLearnerTurn,
      status: document.getElementById('teacherVoiceStatus')?.textContent || '',
      mode: currentMode
    };
  })()`));
  if (autopilotActionBlockState.events.length || !autopilotActionBlockState.waiting || !/wait|next step/i.test(autopilotActionBlockState.status)) {
    throw new Error(`Autopilot applied a screen-changing action without learner command: ${JSON.stringify(autopilotActionBlockState)}`);
  }
  const teacherAudioEchoGuardState = await page.evaluate(async () => eval(`(async () => {
    courseAccessMode = 'full';
    teacherModeEnabled = true;
    teacherAutopilotEnabled = true;
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAttemptedRecallKey = '';
    teacherSpokenRecallAttempt = { key: '', transcript: '' };
    showStudyCard();
    stopPlayback();
    const originalPlay = playPremiumTeacherVoice;
    playPremiumTeacherVoice = async (text, { onplay, onend } = {}) => {
      if (onplay) onplay();
      setTimeout(() => {
        if (onend) onend();
      }, 120);
      return true;
    };
    teacherSay('Teacher spoken answer that must not be transcribed as the student.');
    teacherCommand('Teacher spoken answer that must not be transcribed as the student.');
    const duringVoice = {
      message: document.getElementById('teacherMessage')?.textContent || '',
      transcript: document.getElementById('teacherTranscript')?.textContent || '',
      attempted: teacherHasRecallAttempt(),
      revealed: studyRevealed
    };
    await new Promise(resolve => setTimeout(resolve, 180));
    teacherServerMicStream = { getTracks: () => [{ stop() {} }] };
    teacherLiveListening = true;
    teacherModeEnabled = true;
    startTeacherServerMicRecorder({ announce: false });
    markTeacherAudioOutput('Teacher audio overlaps this mic segment.', 12000);
    const recorder = teacherServerMicRecorder;
    if (recorder?.ondataavailable) recorder.ondataavailable({ data: new Blob(['teacher echo'], { type: recorder.mimeType || 'audio/webm' }) });
    const chunkCountDuringAudio = teacherServerMicChunks.length;
    if (recorder?.onstop) recorder.onstop();
    stopTeacherServerMic();
    playPremiumTeacherVoice = originalPlay;
    stopPlayback();
    return { duringVoice, chunkCountDuringAudio };
  })()`));
  if (teacherAudioEchoGuardState.duringVoice.transcript || teacherAudioEchoGuardState.duringVoice.attempted || teacherAudioEchoGuardState.duringVoice.revealed || !/Teacher spoken answer/i.test(teacherAudioEchoGuardState.duringVoice.message) || teacherAudioEchoGuardState.chunkCountDuringAudio !== 0) {
    throw new Error(`Teacher audio was allowed back into live mic handling: ${JSON.stringify(teacherAudioEchoGuardState)}`);
  }
  const navigationQuestionRecallState = await page.evaluate(() => eval(`(() => {
    courseAccessMode = 'full';
    teacherModeEnabled = true;
    teacherAutopilotEnabled = true;
    if (!document.querySelector('.study-card')) {
      beginStudySession();
      if (document.querySelector('button[onclick="showNewRecallCard()"]')) showNewRecallCard();
    }
    teacherSpokenRecallAttempt = { key: teacherAttemptBaseKey(), transcript: 'Алло' };
    return {
      alloRecall: teacherVoiceLooksLikeRecallAttempt('Алло'),
      whereNeedsRecallContext: teacherMessageNeedsRecallContext('Where do I start?'),
      whereContextSpoken: teacherAiContext({ includeSpokenRecall: false }).spokenRecallAttempt,
      ratingNeedsRecallContext: teacherMessageNeedsRecallContext('Was my answer good?')
    };
  })()`));
  if (navigationQuestionRecallState.alloRecall || navigationQuestionRecallState.whereNeedsRecallContext || navigationQuestionRecallState.whereContextSpoken || !navigationQuestionRecallState.ratingNeedsRecallContext) {
    throw new Error(`Navigation question inherited stale recall context: ${JSON.stringify(navigationQuestionRecallState)}`);
  }
  await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1&view=browse`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#coachVoiceGuide');
  const demoBrowseVoiceGate = await page.evaluate(() => ({
    hasVoiceButton: Boolean(document.querySelector('#coachVoiceGuide button.audio-instructions-btn')),
    text: document.getElementById('coachVoiceGuide')?.textContent || '',
    href: document.querySelector('#coachVoiceGuide a')?.getAttribute('href') || ''
  }));
  if (demoBrowseVoiceGate.hasVoiceButton || !/full access/i.test(demoBrowseVoiceGate.text) || demoBrowseVoiceGate.href !== 'pricing.html') {
    throw new Error(`Demo Browse AI voice guide was not gated: ${JSON.stringify(demoBrowseVoiceGate)}`);
  }
  const cloudHistoryCheck = await page.evaluate(async () => {
    eval('courseAccessMode="full"');
    eval('dailyNewGoal=20; userStats.dailyGoal=20;');
    await eval('showCloudProgressHistory()');
    const panelText = document.getElementById('cloudHistoryPanel')?.textContent || '';
    await eval('restoreCloudProgressRevision("archive-2",false,"2","4 learned, 6 active reviews, 1 weak, goal 10","May 10, 2026, 10:00 AM")');
    const panelAfterRestore = document.getElementById('cloudHistoryPanel')?.textContent || '';
    return {
      panelText,
      panelAfterRestore,
      learnedCount: Object.keys(eval('learned')).length,
      dailyGoal: eval('userStats.dailyGoal'),
      dailyNewGoal: eval('dailyNewGoal'),
      cloudRevision: localStorage.getItem('russian_cloud_revision'),
      updatedAt: localStorage.getItem('russian_progress_updated_at')
    };
  });
  if (!/Cloud progress history/i.test(cloudHistoryCheck.panelText) || !/Older cloud version/i.test(cloudHistoryCheck.panelText) || !/Restore this version/i.test(cloudHistoryCheck.panelText)) {
    throw new Error(`Cloud history panel did not expose archived progress restore: ${JSON.stringify(cloudHistoryCheck)}`);
  }
  if (!/Current cloud version:\s*4/i.test(cloudHistoryCheck.panelAfterRestore)) {
    throw new Error(`Cloud history restore did not become the current cloud version: ${JSON.stringify(cloudHistoryCheck)}`);
  }
  if (cloudHistoryCheck.learnedCount !== 1 || cloudHistoryCheck.dailyGoal !== 10 || cloudHistoryCheck.dailyNewGoal !== 10 || cloudHistoryCheck.cloudRevision !== '4' || !cloudHistoryCheck.updatedAt) {
    throw new Error(`Cloud history restore did not apply restored progress locally: ${JSON.stringify(cloudHistoryCheck)}`);
  }
  const cloudConflictRestoreCheck = await page.evaluate(async () => {
    await eval('restoreCloudProgressRevision("archive-1",true,"1","7 learned, 9 active reviews, 2 weak, goal 15","May 10, 2026, 9:00 AM")');
    return {
      dailyGoal: eval('userStats.dailyGoal'),
      dailyNewGoal: eval('dailyNewGoal'),
      cloudRevision: localStorage.getItem('russian_cloud_revision')
    };
  });
  if (cloudConflictRestoreCheck.dailyGoal !== 15 || cloudConflictRestoreCheck.dailyNewGoal !== 15 || cloudConflictRestoreCheck.cloudRevision !== '5') {
    throw new Error(`Cloud history conflict-copy restore did not apply exact archived copy: ${JSON.stringify(cloudConflictRestoreCheck)}`);
  }
  await page.locator('#teacherToggleBtn').click();
  await page.locator('#teacherPanel.active .teacher-title').waitFor();
  await page.getByRole('button', { name: 'Start Live Teacher' }).click();
  await page.waitForTimeout(700);
  const teacherMessage = await page.locator('#teacherMessage').innerText();
  const lastTeacherChat = teacherChatBodies.at(-1);
  if (!lastTeacherChat?.message?.includes('Autopilot: decide the next best step') || lastTeacherChat.context?.teacherMode !== 'autopilot') {
    throw new Error(`AI Teacher Autopilot did not send full-state decision context: ${JSON.stringify(lastTeacherChat)}`);
  }
  if (!/AI Autopilot decided/i.test(teacherMessage)) {
    throw new Error(`Teacher mode did not use the AI autopilot decision. Saw: ${teacherMessage}`);
  }
  const activationScreenState = await page.evaluate(() => ({
    mode: eval('currentMode'),
    browseActive: document.getElementById('browseView')?.classList.contains('active') || false
  }));
  if (activationScreenState.mode === 'browse' || activationScreenState.browseActive) {
    throw new Error(`Live Teacher activation auto-navigated before the student asked: ${JSON.stringify(activationScreenState)}`);
  }
  const liveTeacherState = await page.evaluate(() => ({
    live: eval('teacherLiveListening'),
    listening: eval('teacherListening'),
    serverMic: eval('teacherServerMicActive'),
    continuous: window.__lastSpeechRecognition?.continuous,
    lang: window.__lastSpeechRecognition?.lang,
    button: document.getElementById('teacherTalkBtn')?.textContent || '',
    sub: document.getElementById('teacherSub')?.textContent || '',
    status: document.getElementById('teacherVoiceStatus')?.textContent || '',
    disclosure: document.getElementById('teacherDisclosure')?.textContent || ''
  }));
  if (!liveTeacherState.live || !(liveTeacherState.listening || liveTeacherState.serverMic) || !liveTeacherState.serverMic || !/Pause Listening/i.test(liveTeacherState.button)) {
    throw new Error(`Start Autopilot did not start continuous Live Teacher listening: ${JSON.stringify(liveTeacherState)}`);
  }
  if (/requesting microphone/i.test(liveTeacherState.sub + ' ' + liveTeacherState.status)) {
    throw new Error(`Live Teacher showed contradictory mic readiness: ${JSON.stringify(liveTeacherState)}`);
  }
  if (/mic is off/i.test(liveTeacherState.disclosure)) {
    throw new Error(`Live Teacher disclosure contradicted active mic state: ${JSON.stringify(liveTeacherState)}`);
  }
  const teacherPanelButtons = await page.evaluate(() => [...document.querySelectorAll('#teacherPanel .teacher-actions button')].map(button => button.textContent.replace(/\s+/g, ' ').trim()));
  if (teacherPanelButtons.length > 2) {
    throw new Error(`AI Teacher panel exposes too many competing controls: ${teacherPanelButtons.join(' | ')}`);
  }
  const beforeServerMicChatCount = teacherChatBodies.length;
  const beforeServerMicTranscribeCount = teacherTranscribeBodies.length;
  await page.evaluate(async () => {
    eval(`teacherServerMicChunks=[new Blob(['student voice'],{type:'audio/webm'})]`);
    await eval('teacherSubmitServerMicSegment({force:true})');
  });
  await page.waitForTimeout(900);
  const serverMicChat = teacherChatBodies.at(-1);
  if (teacherTranscribeBodies.length !== beforeServerMicTranscribeCount + 1 || teacherChatBodies.length !== beforeServerMicChatCount + 1 || !serverMicChat?.message?.includes('what does привет mean')) {
    throw new Error(`Server mic transcription did not route into teacher chat: ${JSON.stringify({ transcribes: teacherTranscribeBodies.length, chat: serverMicChat })}`);
  }
  const beforeSilenceCount = teacherChatBodies.length;
  const fillerUseful = await page.evaluate(() => eval(`teacherTranscriptLooksUseful('um')`));
  await page.waitForTimeout(150);
  if (fillerUseful || teacherChatBodies.length !== beforeSilenceCount) {
    throw new Error('Live Teacher sent an AI request for filler/silence transcript.');
  }
  const beforeMicCheckCount = teacherChatBodies.length;
  await page.evaluate(() => eval(`stopPlayback(); teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherCommand('hi are you listening to me')`));
  await page.waitForTimeout(250);
  const micCheckMessage = await page.locator('#teacherMessage').innerText();
  if (teacherChatBodies.length !== beforeMicCheckCount) {
    throw new Error('Live Teacher routed a simple listening check to the AI planner instead of acknowledging it locally.');
  }
  if (!/yes|listening|heard you/i.test(micCheckMessage) || /Due reviews first|Autopilot decided/i.test(micCheckMessage)) {
    throw new Error(`Live Teacher did not answer a listening check like a human teacher. Saw: ${micCheckMessage}`);
  }
  const beforeRepeatedGreetingCount = teacherChatBodies.length;
  const repeatedGreetingState = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    teacherAttemptedRecallKey = '';
    teacherSpokenRecallAttempt = { key: '', transcript: '' };
    showStudyCard();
    teacherCommand('Hi, hi, hi.');
    return {
      message: document.getElementById('teacherMessage')?.textContent || '',
      attempted: teacherHasRecallAttempt(),
      revealed: studyRevealed
    };
  })()`));
  if (teacherChatBodies.length !== beforeRepeatedGreetingCount || repeatedGreetingState.attempted || repeatedGreetingState.revealed || !/yes|listening|heard you/i.test(repeatedGreetingState.message)) {
    throw new Error(`Live Teacher treated a repeated greeting as a recall attempt: ${JSON.stringify(repeatedGreetingState)}`);
  }
  const beforeNaturalDoubtCount = teacherChatBodies.length;
  await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    showStudyCard();
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherCommand("I don't know");
  })()`));
  await page.waitForTimeout(900);
  const naturalDoubtState = await page.evaluate(() => ({
    message: document.getElementById('teacherMessage')?.textContent || '',
    attempted: eval('teacherHasRecallAttempt()'),
    revealed: eval('studyRevealed')
  }));
  if (teacherChatBodies.length !== beforeNaturalDoubtCount || !naturalDoubtState.revealed || !/honest recall|mark Again/i.test(naturalDoubtState.message)) {
    throw new Error(`Live Teacher did not treat "I don't know" as an honest recall attempt: ${JSON.stringify({ naturalDoubtState, callsBefore: beforeNaturalDoubtCount, callsAfter: teacherChatBodies.length })}`);
  }
  teacherChatFailure = true;
  await page.evaluate(() => eval('teacherGuide()'));
  await page.waitForTimeout(900);
  const aiFailureFallback = await page.evaluate(() => ({
    message: document.getElementById('teacherMessage')?.textContent || '',
    status: document.getElementById('teacherVoiceStatus')?.textContent || ''
  }));
  teacherChatFailure = false;
  if (/temporarily unavailable|AI unavailable|request was invalid/i.test(aiFailureFallback.message) || !/try|recall|lesson|card|start|compare|rating|again|hard|good/i.test(aiFailureFallback.message)) {
    throw new Error(`AI Teacher outage did not fall back to simple lesson guidance: ${JSON.stringify(aiFailureFallback)}`);
  }
  const beforeRussianMicCheckCount = teacherChatBodies.length;
  await page.evaluate(() => eval(`stopPlayback(); teacherAiBusy=false; teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherCommand('привет ты меня слышишь')`));
  await page.waitForTimeout(250);
  const russianMicCheckMessage = await page.locator('#teacherMessage').innerText();
  if (teacherChatBodies.length !== beforeRussianMicCheckCount || !/yes|listening|heard you/i.test(russianMicCheckMessage)) {
    throw new Error(`Live Teacher did not handle a Russian listening check locally. Saw: ${russianMicCheckMessage}`);
  }
  const beforeRussianQuestionCount = teacherChatBodies.length;
  await page.evaluate(() => eval(`stopPlayback(); teacherAiBusy=false; teacherQueuedAiRequests=[]; teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherCommand('привет что значит пожалуйста')`));
  await page.waitForTimeout(350);
  const russianQuestionChat = teacherChatBodies.at(-1);
  if (teacherChatBodies.length !== beforeRussianQuestionCount + 1 || !russianQuestionChat?.message?.includes('привет что значит пожалуйста')) {
    throw new Error(`Live Teacher swallowed Russian greeting plus real question: ${JSON.stringify(russianQuestionChat)}`);
  }
  const beforeRussianRecallQuestionCount = teacherChatBodies.length;
  await page.evaluate(() => {
    eval(`(() => {
      teacherAutopilotEnabled = true;
      currentMode = 'study';
      studyViewActive = true;
      studyQueue = [{ idx: 0, type: 'review' }];
      studyIndex = 0;
      studyRevealed = false;
      showStudyCard();
    })()`);
  });
  await page.waitForTimeout(450);
  await page.evaluate(() => eval(`stopPlayback(); teacherAiBusy=false; teacherQueuedAiRequests=[]; teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherCommand('как запомнить пожалуйста')`));
  await page.waitForTimeout(350);
  const russianRecallQuestionChat = teacherChatBodies.at(-1);
  if (teacherChatBodies.length <= beforeRussianRecallQuestionCount || !russianRecallQuestionChat?.message?.includes('как запомнить пожалуйста')) {
    throw new Error(`Live Teacher swallowed Russian question during a recall card: ${JSON.stringify(russianRecallQuestionChat)}`);
  }
  await page.evaluate(() => eval(`stopPlayback(); teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherCommand('pause listening')`));
  await page.waitForTimeout(250);
  const pausedLiveTeacherState = await page.evaluate(() => ({
    live: eval('teacherLiveListening'),
    listening: eval('teacherListening'),
    button: document.getElementById('teacherTalkBtn')?.textContent || '',
    message: document.getElementById('teacherMessage')?.textContent || ''
  }));
  if (pausedLiveTeacherState.live || pausedLiveTeacherState.listening || /Pause Listening/i.test(pausedLiveTeacherState.button)) {
    throw new Error(`Voice pause command did not pause Live Teacher: ${JSON.stringify(pausedLiveTeacherState)}`);
  }
  await page.evaluate(() => eval('teacherStartLiveListening({announce:false})'));
  await page.waitForTimeout(250);
  await page.evaluate(() => eval(`stopPlayback(); teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherCommand('stop')`));
  await page.waitForTimeout(250);
  const stoppedByPlainStopState = await page.evaluate(() => ({
    live: eval('teacherLiveListening'),
    listening: eval('teacherListening'),
    button: document.getElementById('teacherTalkBtn')?.textContent || '',
    message: document.getElementById('teacherMessage')?.textContent || ''
  }));
  if (stoppedByPlainStopState.live || stoppedByPlainStopState.listening || /Pause Listening/i.test(stoppedByPlainStopState.button)) {
    throw new Error(`Plain voice stop did not pause Live Teacher: ${JSON.stringify(stoppedByPlainStopState)}`);
  }
  const startFailureState = await page.evaluate(() => eval(`(() => {
    class FailingSpeechRecognition {
      constructor() {
        this.lang = 'en-US';
        this.continuous = false;
        this.interimResults = false;
        this.maxAlternatives = 1;
        window.__lastSpeechRecognition = this;
      }
      start() { throw new Error('start failed'); }
      stop() {}
    }
    window.SpeechRecognition = FailingSpeechRecognition;
    window.webkitSpeechRecognition = FailingSpeechRecognition;
    const originalMedia = navigator.mediaDevices;
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: null });
    const ok = teacherStartLiveListening();
    const state = {
      ok,
      live: teacherLiveListening,
      listening: teacherListening,
      button: document.getElementById('teacherTalkBtn')?.textContent || '',
      status: document.getElementById('teacherVoiceStatus')?.textContent || ''
    };
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: originalMedia });
    window.SpeechRecognition = window.__FakeSpeechRecognition;
    window.webkitSpeechRecognition = window.__FakeSpeechRecognition;
    return state;
  })()`));
  if (startFailureState.ok || startFailureState.live || startFailureState.listening || /Pause Listening/i.test(startFailureState.button)) {
    throw new Error(`Live Teacher showed active after mic start failed: ${JSON.stringify(startFailureState)}`);
  }
  await page.evaluate(() => eval('teacherStartLiveListening({announce:false})'));
  await page.waitForTimeout(300);
  const restartedLiveTeacherState = await page.evaluate(() => ({
    live: eval('teacherLiveListening'),
    listening: eval('teacherListening'),
    serverMic: eval('teacherServerMicActive'),
    lang: window.__lastSpeechRecognition?.lang,
    button: document.getElementById('teacherTalkBtn')?.textContent || ''
  }));
  if (!restartedLiveTeacherState.live || !(restartedLiveTeacherState.listening || restartedLiveTeacherState.serverMic) || !/Pause Listening/i.test(restartedLiveTeacherState.button)) {
    throw new Error(`Live Teacher did not restart after failed mic test: ${JSON.stringify(restartedLiveTeacherState)}`);
  }
  const languageSwitchInitial = await page.evaluate(() => eval(`(() => {
    stopTeacherListening({ disableLive: true });
    currentMode = 'browse';
    studyViewActive = false;
    studyRevealed = false;
    teacherStartLiveListening({ announce: false });
    const initial = teacherDesiredRecognitionLang();
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    showStudyCard();
    return { initial };
  })()`));
  await page.waitForTimeout(350);
  const languageSwitchState = await page.evaluate(initial => ({
    initial: initial.initial,
    after: eval('teacherDesiredRecognitionLang()'),
    live: eval('teacherLiveListening'),
    listening: eval('teacherListening'),
    serverMic: eval('teacherServerMicActive')
  }), languageSwitchInitial);
  if (languageSwitchState.initial !== 'en-US' || languageSwitchState.after !== 'ru-RU' || !languageSwitchState.live || !(languageSwitchState.listening || languageSwitchState.serverMic)) {
    throw new Error(`Live Teacher did not switch recognition language for Russian recall: ${JSON.stringify(languageSwitchState)}`);
  }
  const beforeShadowCount = teacherChatBodies.length;
  const shadowState = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'new' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    showStudyCard();
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherCommand('ty mozhesh skazat');
    return {
      message: document.getElementById('teacherMessage')?.textContent || '',
      attempted: teacherHasRecallAttempt(),
      revealed: studyRevealed
    };
  })()`));
  if (teacherChatBodies.length !== beforeShadowCount || shadowState.attempted || shadowState.revealed || !/test memory|next screen|recall/i.test(shadowState.message)) {
    throw new Error(`New-sentence shadowing was not handled locally: ${JSON.stringify(shadowState)}`);
  }
  const echoState = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    teacherAttemptedRecallKey = '';
    teacherSpokenRecallAttempt = { key: '', transcript: '' };
    showStudyCard();
    teacherAnswerListeningCheck();
    teacherCommand('Yes, I am listening. I heard you. Try the Russian for this card now');
    return {
      message: document.getElementById('teacherMessage')?.textContent || '',
      attempted: teacherHasRecallAttempt(),
      revealed: studyRevealed
    };
  })()`));
  if (echoState.attempted || echoState.revealed || !/Yes, I am listening/i.test(echoState.message)) {
    throw new Error(`Teacher voice echo was treated as learner recall: ${JSON.stringify(echoState)}`);
  }
  const partialRussianRecallGate = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 542, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    teacherAttemptedRecallKey = '';
    teacherSpokenRecallAttempt = { key: '', transcript: '' };
    teacherLastCommandText = '';
    teacherLastCommandAt = 0;
    SENTENCES[542] = ['Скажи, пожалуйста, что мы здесь делаем?', 'Skazhi, pozhaluysta, chto my zdes delaem?', 'Please, what are we doing here?', 'Core Social Language'];
    showStudyCard();
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherCommand('Окей, но мы');
    const afterNoise = {
      message: document.getElementById('teacherMessage')?.textContent || '',
      attempted: teacherHasRecallAttempt(),
      revealed: studyRevealed
    };
    teacherAttemptedRecallKey = '';
    teacherSpokenRecallAttempt = { key: '', transcript: '' };
    teacherLastCommandText = '';
    teacherLastCommandAt = 0;
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherCommand('скажи пожалуйста');
    const afterPartialAnswer = {
      message: document.getElementById('teacherMessage')?.textContent || '',
      attempted: teacherHasRecallAttempt(),
      revealed: studyRevealed
    };
    return { afterNoise, afterPartialAnswer };
  })()`));
  if (partialRussianRecallGate.afterNoise.attempted || partialRussianRecallGate.afterNoise.revealed || /Heard:/i.test(partialRussianRecallGate.afterNoise.message)) {
    throw new Error(`Tiny Russian chatter was treated as learner recall: ${JSON.stringify(partialRussianRecallGate.afterNoise)}`);
  }
  if (!partialRussianRecallGate.afterPartialAnswer.attempted || !/Heard:/i.test(partialRussianRecallGate.afterPartialAnswer.message)) {
    throw new Error(`Real partial Russian recall was rejected: ${JSON.stringify(partialRussianRecallGate.afterPartialAnswer)}`);
  }
  const partialEchoState = await page.evaluate(() => eval(`(() => {
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherVoicePlaying = false;
    teacherAudioGuardUntil = 0;
    teacherRecentAudioEchoTexts = [];
    markTeacherAudioOutput('Yes, I am listening. I heard you. Try the Russian for this card now.', 18000);
    teacherAudioGuardUntil = 0;
    teacherCapturePausedForAudio = false;
    teacherVoicePlaying = false;
    return {
      partial: teacherTranscriptEchoesTeacher('I am listening'),
      full: teacherTranscriptEchoesTeacher('Yes, I am listening. I heard you. Try the Russian for this card now.')
    };
  })()`));
  if (partialEchoState.partial || !partialEchoState.full) {
    throw new Error(`Teacher echo filter still drops legitimate partial learner speech: ${JSON.stringify(partialEchoState)}`);
  }
  const delayedEchoState = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    teacherAttemptedRecallKey = '';
    teacherSpokenRecallAttempt = { key: '', transcript: '' };
    showStudyCard();
    teacherSay('Choose your rating now. Say or click Again, Hard, Good, or Easy.');
    teacherLastSpokenAt = Date.now() - 30000;
    teacherVoicePlaybackActiveUntil = Date.now() + 5000;
    teacherCommand('Choose your rating now. Say or click Again, Hard, Good, or Easy.');
    return {
      message: document.getElementById('teacherMessage')?.textContent || '',
      attempted: teacherHasRecallAttempt(),
      revealed: studyRevealed
    };
  })()`));
  if (delayedEchoState.attempted || delayedEchoState.revealed || !/Choose your rating/i.test(delayedEchoState.message)) {
    throw new Error(`Delayed teacher voice echo was treated as learner speech: ${JSON.stringify(delayedEchoState)}`);
  }
  const targetAudioEchoState = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'new' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    teacherAttemptedRecallKey = '';
    teacherSpokenRecallAttempt = { key: '', transcript: '' };
    showStudyCard();
    const target = SENTENCES[0][0];
    teacherAppAudioOutputText = target;
    teacherAppAudioOutputUntil = Date.now() + 5000;
    teacherCommand(target);
    return {
      message: document.getElementById('teacherMessage')?.textContent || '',
      attempted: teacherHasRecallAttempt(),
      revealed: studyRevealed
    };
  })()`));
  if (targetAudioEchoState.attempted || targetAudioEchoState.revealed || /Heard:|Now test memory/i.test(targetAudioEchoState.message)) {
    throw new Error(`Live Teacher treated app target audio as learner speech: ${JSON.stringify(targetAudioEchoState)}`);
  }
  const duplicateTranscriptState = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }, { idx: 1, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    showStudyCard();
    teacherCommand('next');
    const afterFirst = { index: studyIndex, message: document.getElementById('teacherMessage')?.textContent || '' };
    teacherCommand('next');
    return {
      afterFirst,
      afterSecond: { index: studyIndex, message: document.getElementById('teacherMessage')?.textContent || '' }
    };
  })()`));
  if (duplicateTranscriptState.afterSecond.index !== duplicateTranscriptState.afterFirst.index || duplicateTranscriptState.afterSecond.message !== duplicateTranscriptState.afterFirst.message) {
    throw new Error(`Duplicate transcript executed twice: ${JSON.stringify(duplicateTranscriptState)}`);
  }
  const duplicateQuestionCountBefore = teacherChatBodies.filter(body => body.message === 'what does привет mean').length;
  const duplicateQuestionState = await page.evaluate(() => eval(`(() => {
    teacherAiBusy = false;
    teacherQueuedAiRequests = [];
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherCommand('what does привет mean');
    const afterFirstStatus = document.getElementById('teacherVoiceStatus')?.textContent || '';
    teacherCommand('what does привет mean');
    return {
      afterFirstStatus,
      status: document.getElementById('teacherVoiceStatus')?.textContent || ''
    };
  })()`));
  await page.waitForTimeout(350);
  const duplicateQuestionMatches = teacherChatBodies.filter(body => body.message === 'what does привет mean').length;
  if (duplicateQuestionMatches !== duplicateQuestionCountBefore + 1) {
    throw new Error(`Duplicate natural question was sent to AI more than once: ${JSON.stringify({ duplicateQuestionState, duplicateQuestionCountBefore, duplicateQuestionMatches })}`);
  }
  const queuedAiState = await page.evaluate(() => eval(`(() => {
    teacherAiBusy = true;
    teacherQueuedAiRequests = [];
    teacherAskAi('what does привет mean?', { source: 'voice' });
    teacherAskAi('why this case?', { source: 'typed' });
    const state = {
      queued: teacherQueuedAiRequests.map(request => request.message),
      status: document.getElementById('teacherVoiceStatus')?.textContent || ''
    };
    teacherAiBusy = false;
    teacherQueuedAiRequests = [];
    return state;
  })()`));
  if (queuedAiState.queued?.join('|') !== 'what does привет mean?|why this case?' || !/right after/i.test(queuedAiState.status)) {
    throw new Error(`Live Teacher did not cap busy AI queue safely: ${JSON.stringify(queuedAiState)}`);
  }
  const queuedVoiceAudioRaceState = await page.evaluate(() => eval(`(() => {
    teacherAiBusy = true;
    teacherQueuedAiRequests = [];
    teacherAskAi('first voice question?', { source: 'voice' });
    teacherAskAi('second voice question?', { source: 'voice' });
    markTeacherAudioOutput('Teacher answer audio is starting.', 12000);
    const state = {
      queued: teacherQueuedAiRequests.map(request => request.message),
      status: document.getElementById('teacherVoiceStatus')?.textContent || ''
    };
    teacherAiBusy = false;
    teacherQueuedAiRequests = [];
    teacherAudioGuardUntil = 0;
    return state;
  })()`));
  if (queuedVoiceAudioRaceState.queued.join('|') !== 'first voice question?|second voice question?') {
    throw new Error(`Live Teacher dropped queued voice questions when audio started: ${JSON.stringify(queuedVoiceAudioRaceState)}`);
  }
  const postAudioGuardSpeechState = await page.evaluate(() => eval(`(() => {
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherVoicePlaying = false;
    teacherAudioGuardUntil = Date.now() + 2000;
    teacherRecentAudioEchoTexts = [];
    teacherLastSpokenText = '';
    teacherAppAudioOutputText = '';
    teacherCommand('what does привет mean');
    const state = {
      transcript: document.getElementById('teacherTranscript')?.textContent || '',
      status: document.getElementById('teacherVoiceStatus')?.textContent || ''
    };
    teacherAudioGuardUntil = 0;
    return state;
  })()`));
  if (!/I heard:/i.test(postAudioGuardSpeechState.transcript)) {
    throw new Error(`Post-audio guard swallowed legitimate learner speech: ${JSON.stringify(postAudioGuardSpeechState)}`);
  }
  const voicePrepCaptureState = await page.evaluate(async () => eval(`(async () => {
    stopPlayback();
    teacherModeEnabled = true;
    teacherLiveListening = true;
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherVoicePlaying = false;
    teacherVoiceQueueRunning = false;
    teacherVoiceQueue = [];
    const originalPlayPremiumTeacherVoice = playPremiumTeacherVoice;
    let beforeStart = null;
    let duringPlay = null;
    playPremiumTeacherVoice = (text, { onplay, onend } = {}) => new Promise(resolve => {
      setTimeout(() => {
        beforeStart = {
          paused: teacherCapturePausedForAudio,
          guard: teacherAudioCaptureGuardActive(),
          playing: teacherVoicePlaying,
          busy: teacherPlaybackBusy()
        };
        if (onplay) onplay();
        duringPlay = {
          paused: teacherCapturePausedForAudio,
          guard: teacherAudioCaptureGuardActive(),
          playing: teacherVoicePlaying,
          busy: teacherPlaybackBusy()
        };
        setTimeout(() => {
          if (onend) onend();
          resolve(true);
        }, 30);
      }, 140);
    });
    speakTeacherVoice('Short teacher preparation test.');
    await new Promise(resolve => setTimeout(resolve, 70));
    const preparing = {
      paused: teacherCapturePausedForAudio,
      guard: teacherAudioCaptureGuardActive(),
      playing: teacherVoicePlaying,
      busy: teacherPlaybackBusy()
    };
    await new Promise(resolve => setTimeout(resolve, 240));
    playPremiumTeacherVoice = originalPlayPremiumTeacherVoice;
    stopPlayback();
    if (teacherCaptureResumeTimer) {
      clearTimeout(teacherCaptureResumeTimer);
      teacherCaptureResumeTimer = null;
    }
    teacherLiveListening = false;
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    return { preparing, beforeStart, duringPlay };
  })()`));
  if (voicePrepCaptureState.preparing.paused || voicePrepCaptureState.preparing.guard || voicePrepCaptureState.preparing.playing || !voicePrepCaptureState.preparing.busy) {
    throw new Error(`Teacher paused live capture while premium voice was only preparing: ${JSON.stringify(voicePrepCaptureState)}`);
  }
  if (voicePrepCaptureState.beforeStart.paused || voicePrepCaptureState.beforeStart.guard || voicePrepCaptureState.beforeStart.playing || !voicePrepCaptureState.beforeStart.busy || !voicePrepCaptureState.duringPlay.paused || !voicePrepCaptureState.duringPlay.guard || !voicePrepCaptureState.duringPlay.playing) {
    throw new Error(`Teacher did not pause capture exactly when premium voice started: ${JSON.stringify(voicePrepCaptureState)}`);
  }
  const textOnlyVoiceState = await page.evaluate(async () => {
    const before = window.__speechSynthesisCalls.length;
    stopPlayback();
    if (teacherCaptureResumeTimer) {
      clearTimeout(teacherCaptureResumeTimer);
      teacherCaptureResumeTimer = null;
    }
    teacherModeEnabled = true;
    teacherLiveListening = true;
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherVoicePlaying = false;
    teacherVoiceQueueRunning = false;
    speakTeacherVoice('This should stay text only when premium voice fails.', { lang: 'en-US' });
    await new Promise(resolve => setTimeout(resolve, 400));
    return {
      before,
      after: window.__speechSynthesisCalls.length,
      paused: eval('teacherCapturePausedForAudio'),
      guard: eval('teacherAudioCaptureGuardActive()'),
      status: document.getElementById('teacherVoiceStatus')?.textContent || ''
    };
  });
  if (textOnlyVoiceState.after !== textOnlyVoiceState.before || textOnlyVoiceState.paused || textOnlyVoiceState.guard || !/text only|unavailable/i.test(textOnlyVoiceState.status)) {
    throw new Error(`Teacher voice fell back to robotic browser TTS: ${JSON.stringify(textOnlyVoiceState)}`);
  }
  const targetAudioFallbackState = await page.evaluate(async () => {
    const before = window.__speechSynthesisCalls.length;
    const originalHostedAudioIds = hostedAudioIds;
    hostedAudioIds = new Set();
    playAudio('Привет', 0);
    await new Promise(resolve => setTimeout(resolve, 250));
    hostedAudioIds = originalHostedAudioIds;
    return {
      before,
      after: window.__speechSynthesisCalls.length,
      status: document.getElementById('teacherVoiceStatus')?.textContent || ''
    };
  });
  if (targetAudioFallbackState.after !== targetAudioFallbackState.before || !/Hosted Russian audio is unavailable|audio could not play/i.test(targetAudioFallbackState.status)) {
    throw new Error(`Target Russian audio fell back to robotic browser TTS: ${JSON.stringify(targetAudioFallbackState)}`);
  }
  await page.evaluate(() => {
    eval('stopPlayback(); teacherAiBusy=false; teacherQueuedAiRequests=[]; teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherCommand("where do I start")');
  });
  await page.waitForTimeout(900);
  const mappedAnswer = await page.locator('#teacherMessage').innerText();
  const whereStartChat = teacherChatBodies.at(-1);
  if (!whereStartChat?.message?.includes('where do I start')) {
    throw new Error(`Teacher did not route where-to-start doubt to AI context: ${JSON.stringify(whereStartChat)}`);
  }
  if (!/AI Autopilot decided/i.test(mappedAnswer)) {
    throw new Error(`Teacher did not answer where-to-start through AI Autopilot. Saw: ${mappedAnswer}`);
  }
  await page.evaluate(() => eval('stopPlayback(); teacherAiBusy=false; teacherQueuedAiRequests=[]; teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherCommand("open browse")'));
  await page.waitForTimeout(900);
  const modeNavigationChat = teacherChatBodies.at(-1);
  if (!modeNavigationChat?.message?.includes('open browse')) {
    throw new Error(`Teacher navigation command was not routed through AI Autopilot: ${JSON.stringify(modeNavigationChat)}`);
  }
  const stressPlan = await page.evaluate(() => eval(`(() => {
    const today = getToday();
    for (let i = 0; i < 40; i++) {
      srsData[i] = { box: 1, nextReview: today, lastReview: today, lastRating: 'again', reps: 1, ease: 2 };
    }
    userStats.completedFirstGuidedSession = false;
    return teacherRecommendedPlan();
  })()`));
  if (stressPlan.newLimit !== 0 || !/due reviews/i.test(stressPlan.focus)) {
    throw new Error(`Teacher recommended new material despite high review debt: ${JSON.stringify(stressPlan)}`);
  }
  const priorityNavigation = await page.evaluate(() => eval(`(() => {
    teacherOpenMode('browse');
    return currentMode;
  })()`));
  if (priorityNavigation !== 'study') {
    throw new Error(`Teacher allowed browse before due reviews. Current mode: ${priorityNavigation}`);
  }
  const ratingCommandCheck = await page.evaluate(() => eval(`(() => ({
    notGood: teacherCommandHasRating('not good', 'good'),
    good: teacherCommandHasRating('good', 'good'),
    notThatGood: teacherCommandHasRating('not that good', 'good'),
    dontThinkGood: teacherCommandHasRating("i don't think it was good", 'good'),
    dontThinkItsGood: teacherCommandHasRating("i don't think it's good", 'good'),
    notEasy: teacherCommandHasRating('not easy', 'easy'),
    notVeryEasy: teacherCommandHasRating('not very easy', 'easy'),
    wasntEasy: teacherCommandHasRating("wasn't easy", 'easy'),
    didntFeelEasy: teacherCommandHasRating("it didn't feel easy", 'easy'),
    goodThanks: teacherCommandHasRating('good thanks', 'good'),
    thatWasEasy: teacherCommandHasRating('that was easy', 'easy'),
    rateGood: teacherCommandHasRating('rate it good', 'good'),
    myRatingGood: teacherCommandHasRating('my rating is good', 'good'),
    hard: teacherCommandHasRating('hard', 'hard')
  }))()`));
  if (ratingCommandCheck.notGood || !ratingCommandCheck.good || ratingCommandCheck.notThatGood || ratingCommandCheck.dontThinkGood || ratingCommandCheck.dontThinkItsGood || ratingCommandCheck.notEasy || ratingCommandCheck.notVeryEasy || ratingCommandCheck.wasntEasy || ratingCommandCheck.didntFeelEasy || ratingCommandCheck.goodThanks || ratingCommandCheck.thatWasEasy || !ratingCommandCheck.rateGood || !ratingCommandCheck.myRatingGood || !ratingCommandCheck.hard) {
    throw new Error(`Teacher rating command negation check failed: ${JSON.stringify(ratingCommandCheck)}`);
  }
  const ratingQuestionState = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = true;
    teacherAutopilotEnabled = true;
    studySessionStats = { newCount: 0, reviewCount: 0, againCount: 0, hardCount: 0, goodCount: 0, easyCount: 0 };
    showStudyCard();
    studyRevealed = true;
    showStudyCard();
    const before = { index: studyIndex, good: studySessionStats.goodCount, easy: studySessionStats.easyCount };
    teacherCommand('is this good?');
    return {
      before,
      after: { index: studyIndex, good: studySessionStats.goodCount, easy: studySessionStats.easyCount, message: document.getElementById('teacherMessage')?.textContent || '' }
    };
  })()`));
  if (ratingQuestionState.after.good !== ratingQuestionState.before.good || ratingQuestionState.after.easy !== ratingQuestionState.before.easy || ratingQuestionState.after.index !== ratingQuestionState.before.index) {
    throw new Error(`Rating question mutated progress instead of asking/answering: ${JSON.stringify(ratingQuestionState)}`);
  }
  const directDrillNavigation = await page.evaluate(() => eval(`(() => {
    teacherCommand('cloze');
    return currentMode;
  })()`));
  if (directDrillNavigation !== 'study') {
    throw new Error(`Teacher direct drill command bypassed due-review priority. Current mode: ${directDrillNavigation}`);
  }
  const autopilotAttemptGate = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    localStorage.setItem(storagePrefix + 'teacher_autopilot', '1');
    teacherModeEnabled = true;
    teacherAutopilotAwaitingLearnerTurn = false;
    showStudyCard();
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherCommand('I tried');
    const afterFake = { revealed: studyRevealed, message: document.getElementById('teacherMessage')?.textContent || '' };
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherCommand('ty mozhesh skazat');
    const beforeReveal = {
      hasAttempt: teacherHasRecallAttempt(),
      spoken: teacherSpokenRecallText(),
      guard: teacherAudioCaptureGuardActive(),
      inRecall: teacherInRecallWindow(),
      live: teacherLiveListening,
      paused: teacherCapturePausedForAudio,
      message: document.getElementById('teacherMessage')?.textContent || ''
    };
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherRecentAudioEchoTexts = [];
    teacherLastSpokenText = '';
    teacherLastCommandText = '';
    teacherLastCommandAt = 0;
    teacherCommand('reveal');
    return {
      afterFake,
      beforeReveal,
      afterRealAttempt: { revealed: studyRevealed, message: document.getElementById('teacherMessage')?.textContent || '', hasAttempt: teacherHasRecallAttempt(), guard: teacherAudioCaptureGuardActive() }
    };
  })()`));
  if (autopilotAttemptGate.afterFake.revealed || /skip|fake "I tried"/i.test(autopilotAttemptGate.afterFake.message) || !/honest recall attempt|real attempt|will not reveal|need a real attempt|do not remember/i.test(autopilotAttemptGate.afterFake.message)) {
    throw new Error(`AI Teacher Autopilot accepted a fake recall attempt: ${JSON.stringify(autopilotAttemptGate.afterFake)}`);
  }
  if (!autopilotAttemptGate.afterRealAttempt.revealed) {
    throw new Error(`AI Teacher Autopilot did not reveal after a spoken recall attempt: ${JSON.stringify(autopilotAttemptGate.afterRealAttempt)}`);
  }
  const trivialRecallGate = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    teacherAttemptedRecallKey = '';
    teacherSpokenRecallAttempt = { key: '', transcript: '' };
    showStudyCard();
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherLastCommandText = '';
    teacherLastCommandAt = 0;
    document.getElementById('teacherMessage').textContent = '';
    teacherCommand('ok');
    const afterOk = { attempted: teacherHasRecallAttempt(), message: document.getElementById('teacherMessage')?.textContent || '' };
    teacherAudioGuardUntil = 0;
    teacherLastCommandText = '';
    teacherLastCommandAt = 0;
    teacherCommand('reveal');
    return { afterOk, afterReveal: { revealed: studyRevealed, message: document.getElementById('teacherMessage')?.textContent || '' } };
  })()`));
  if (trivialRecallGate.afterOk.attempted || trivialRecallGate.afterReveal.revealed || /skip|fake "I tried"/i.test(trivialRecallGate.afterReveal.message) || !/honest recall attempt|real attempt|try recall|do not remember/i.test(trivialRecallGate.afterReveal.message)) {
    throw new Error(`AI Teacher Autopilot accepted trivial speech as recall: ${JSON.stringify(trivialRecallGate)}`);
  }
  const doubtRecallGate = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = true;
    teacherAttemptedRecallKey = '';
    teacherSpokenRecallAttempt = { key: '', transcript: '' };
    showStudyCard();
    teacherCommand('как запомнить это?');
    const afterRussianDoubt = { attempted: teacherHasRecallAttempt(), revealed: studyRevealed, message: document.getElementById('teacherMessage')?.textContent || '' };
    document.getElementById('studyInput').value = 'help';
    const typedHelp = teacherHasRecallAttempt();
    document.getElementById('studyInput').value = '?';
    const typedQuestion = teacherHasRecallAttempt();
    document.getElementById('studyInput').value = 'не знаю';
    const typedRussianDoubt = teacherHasRecallAttempt();
    document.getElementById('studyInput').value = 'skazhi pozhaluysta';
    const typedRecall = teacherHasRecallAttempt();
    return { afterRussianDoubt, typedHelp, typedQuestion, typedRussianDoubt, typedRecall };
  })()`));
  if (doubtRecallGate.afterRussianDoubt.attempted || doubtRecallGate.afterRussianDoubt.revealed || doubtRecallGate.typedHelp || doubtRecallGate.typedQuestion || doubtRecallGate.typedRussianDoubt || !doubtRecallGate.typedRecall) {
    throw new Error(`AI Teacher Autopilot accepted doubt/non-recall as a real attempt: ${JSON.stringify(doubtRecallGate)}`);
  }
  const aiRatingActionGate = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = true;
    teacherAutopilotEnabled = true;
    studySessionStats = { newCount: 0, reviewCount: 0, againCount: 0, hardCount: 0, goodCount: 0, easyCount: 0 };
    showStudyCard();
    studyRevealed = true;
    showStudyCard();
    applyTeacherAiAction('rate_good');
    return { index: studyIndex, good: studySessionStats.goodCount, message: document.getElementById('teacherMessage')?.textContent || '' };
  })()`));
  if (aiRatingActionGate.good !== 0 || aiRatingActionGate.index !== 0 || !/choose|rating|honest|you rate/i.test(aiRatingActionGate.message)) {
    throw new Error(`AI rating action directly mutated progress: ${JSON.stringify(aiRatingActionGate)}`);
  }
  const teacherModeIsolation = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ idx: 0, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studyRevealed = false;
    teacherAutopilotEnabled = false;
    localStorage.setItem(storagePrefix + 'teacher_autopilot', '0');
    showStudyCard();
    applyTeacherAiAction('reveal');
    const afterSelfAction = { revealed: studyRevealed };
    teacherAutopilotEnabled = true;
    showStudyCard();
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherLastCommandText = '';
    teacherLastCommandAt = 0;
    teacherCommand('ty mozhesh skazat');
    const context = teacherAiContext();
    stopPlayback();
    teacherCapturePausedForAudio = false;
    teacherAudioGuardUntil = 0;
    teacherRecentAudioEchoTexts = [];
    teacherLastSpokenText = '';
    teacherLastCommandText = '';
    teacherLastCommandAt = 0;
    teacherCommand('reveal');
    const heardText = document.querySelector('.study-typed-answer')?.textContent || '';
    return { afterSelfAction, context, heardText };
  })()`));
  if (teacherModeIsolation.afterSelfAction.revealed) {
    throw new Error('Self-guided mode allowed an AI action to reveal the card.');
  }
  if (teacherModeIsolation.context.teacherMode !== 'autopilot' || !teacherModeIsolation.context.teacherAutopilotEnabled || !/ty mozhesh/i.test(teacherModeIsolation.context.spokenRecallAttempt || '')) {
    throw new Error(`Teacher context did not include autopilot/spoken recall state: ${JSON.stringify(teacherModeIsolation.context)}`);
  }
  if (!/Heard:/i.test(teacherModeIsolation.heardText)) {
    throw new Error(`Spoken recall attempt was not shown after reveal: ${teacherModeIsolation.heardText}`);
  }
  const practiceSpokenRecall = await page.evaluate(() => eval(`(() => {
    currentMode = 'cloze';
    teacherAutopilotEnabled = true;
    clozeCurrent = { idx: 0, answer: 'скажите', revealed: false };
    teacherSpokenRecallAttempt = { key: teacherAttemptBaseKey(), transcript: 'skazhite' };
    document.body.insertAdjacentHTML('beforeend', '<div id="clozeFeedback"></div>');
    revealCloze();
    const clozeText = document.getElementById('clozeFeedback')?.textContent || '';
    currentMode = 'dictation';
    dictationCurrent = { idx: 0, revealed: false };
    teacherSpokenRecallAttempt = { key: teacherAttemptBaseKey(), transcript: 'skazhite pozhaluysta' };
    document.body.insertAdjacentHTML('beforeend', '<div id="dictationFeedback"></div>');
    revealDictation();
    const dictationText = document.getElementById('dictationFeedback')?.textContent || '';
    document.querySelectorAll('#clozeFeedback,#dictationFeedback').forEach(node => node.remove());
    return { clozeText, dictationText };
  })()`));
  if (!/Heard:/i.test(practiceSpokenRecall.clozeText) || !/Heard:/i.test(practiceSpokenRecall.dictationText)) {
    throw new Error(`Practice spoken recall was not shown after reveal: ${JSON.stringify(practiceSpokenRecall)}`);
  }
  const spacingTeacherNext = await page.evaluate(() => eval(`(() => {
    studyQueue = buildStudyQueue([], [0]);
    studyIndex = 1;
    currentMode = 'study';
    studyViewActive = true;
    teacherAutopilotEnabled = true;
    showStudyCard();
    toggleTeacherMode(true);
    teacherDoNext();
    return { studyIndex, hasSpacing: Boolean(document.querySelector('button[onclick="continueStudySpacing()"]')) };
  })()`));
  if (spacingTeacherNext.studyIndex !== 2 || !spacingTeacherNext.hasSpacing) {
    throw new Error(`Teacher Do next did not advance spacing pause correctly: ${JSON.stringify(spacingTeacherNext)}`);
  }
  const adaptationCheck = await page.evaluate(() => eval(`(() => {
    studyQueue = [
      { idx: 0, type: 'new' },
      { idx: 1, type: 'new' },
      { idx: 1, type: 'review', sessionDelayed: true },
      { idx: 2, type: 'new' }
    ];
    studyIndex = 0;
    studySessionStats = { newCount: 0, reviewCount: 0, againCount: 2, hardCount: 0, goodCount: 0, easyCount: 0 };
    const removed = adaptStudyQueueAfterPerformance();
    return { removed, hasFutureNew: studyQueue.slice(1).some(item => item.type === 'new'), hasUnseenDelayed: studyQueue.slice(1).some(item => item.sessionDelayed && item.idx === 1) };
  })()`));
  if (adaptationCheck.removed !== 2 || adaptationCheck.hasFutureNew || adaptationCheck.hasUnseenDelayed) {
    throw new Error(`Teacher did not pause future new cards after weak performance: ${JSON.stringify(adaptationCheck)}`);
  }
  const shortDelayed = await page.evaluate(() => eval(`(() => {
    const queue = buildStudyQueue([], [0]);
    const delayedGaps = queue.map((item,index)=>item.sessionDelayed ? index - item.sourceIndex - 1 : null).filter(value => value !== null);
    return { queueLength: queue.length, delayedGaps };
  })()`));
  if (!shortDelayed.delayedGaps.length || shortDelayed.delayedGaps.some(gap => gap < 2)) {
    throw new Error(`Short guided sessions must create true delayed recall with spacing. Saw: ${JSON.stringify(shortDelayed)}`);
  }
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1&resetProgress=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.study-start');
  await page.evaluate(() => eval('courseAccessMode="full"; showStudyStart();'));
  await page.getByRole('button', { name: /Hear AI voice guide/i }).click();
  await page.waitForTimeout(250);
  await page.getByRole('button', { name: 'Start guided lesson' }).click();
  await page.waitForSelector('.study-card');
  await page.keyboard.press('Space');
  const keyboardIntroState = await page.evaluate(() => ({
    hasRecallInput: Boolean(document.getElementById('studyInput')),
    hasRating: Boolean(document.querySelector('.study-rating')),
    card: document.querySelector('.study-card')?.textContent || ''
  }));
  if (!keyboardIntroState.hasRecallInput || keyboardIntroState.hasRating || !/NEW RECALL/i.test(keyboardIntroState.card)) {
    throw new Error(`Keyboard shortcut skipped the new-card recall screen: ${JSON.stringify(keyboardIntroState)}`);
  }
  await page.locator('#studyInput').fill('test');
  await page.getByRole('button', { name: 'Show Russian answer and play audio' }).click();
  await page.waitForSelector('.study-rating');
  const beforeKeyboardRating = await page.evaluate(() => ({ studyIndex: eval('studyIndex'), goodCount: eval('studySessionStats.goodCount') }));
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  const afterKeyboardRating = await page.evaluate(() => ({ studyIndex: eval('studyIndex'), goodCount: eval('studySessionStats.goodCount') }));
  if (afterKeyboardRating.studyIndex !== beforeKeyboardRating.studyIndex || afterKeyboardRating.goodCount !== beforeKeyboardRating.goodCount) {
    throw new Error(`Space/Enter auto-rated after reveal: before ${JSON.stringify(beforeKeyboardRating)}, after ${JSON.stringify(afterKeyboardRating)}`);
  }
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1&resetProgress=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.study-start');
  await page.evaluate(() => eval('courseAccessMode="full"; showStudyStart();'));
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
  await page.locator('#teacherToggleBtn').click();
  await page.evaluate(() => eval('stopPlayback(); teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherLastCommandText=""; teacherLastCommandAt=0; teacherCommand("I tried")'));
  const memoryButton = page.getByRole('button', { name: 'Next: test my memory' });
  if (await memoryButton.count()) await memoryButton.click();
  await page.getByRole('button', { name: 'Show Russian answer and play audio' }).click();
  const introCarryMessage = await page.locator('#teacherMessage').innerText();
  if (!/Try recall first|do not remember/i.test(introCarryMessage) || /fake "I tried"|skip/i.test(introCarryMessage) || await page.locator('.study-rating').count()) {
    throw new Error(`Intro "I tried" carried into recall reveal gate. Message: ${introCarryMessage}`);
  }
  await page.getByRole('button', { name: 'Next step' }).click();
  const gatedRevealMessage = await page.locator('#teacherMessage').innerText();
  if (!/Try recall first|do not remember/i.test(gatedRevealMessage) || /fake "I tried"|skip/i.test(gatedRevealMessage) || await page.locator('.study-rating').count()) {
    throw new Error(`Teacher revealed before recall attempt or did not explain the gate. Message: ${gatedRevealMessage}`);
  }
  await page.getByRole('button', { name: 'Show Russian answer and play audio' }).click();
  const directRevealMessage = await page.locator('#teacherMessage').innerText();
  if (!/Try recall first|do not remember/i.test(directRevealMessage) || /fake "I tried"|skip/i.test(directRevealMessage) || await page.locator('.study-rating').count()) {
    throw new Error(`Direct reveal bypassed Teacher recall gate. Message: ${directRevealMessage}`);
  }
  await page.evaluate(() => eval('stopPlayback(); teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherLastCommandText=""; teacherLastCommandAt=0; teacherCommand("what should I do")'));
  await page.waitForTimeout(350);
  const currentHelp = await page.locator('#teacherMessage').innerText();
  if (!/Do not reveal yet|Try recall/i.test(currentHelp)) {
    throw new Error(`Teacher did not answer current-card help. Saw: ${currentHelp}`);
  }
  await page.evaluate(() => eval('stopPlayback(); teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherLastCommandText=""; teacherLastCommandAt=0; teacherCommand("why this now")'));
  await page.waitForTimeout(350);
  const whyNow = await page.locator('#teacherMessage').innerText();
  if (!/selected a new sentence|review|delayed|weak/i.test(whyNow)) {
    throw new Error(`Teacher did not answer why-this-now from current state. Saw: ${whyNow}`);
  }
  await page.evaluate(() => eval('stopPlayback(); teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherLastCommandText=""; teacherLastCommandAt=0; teacherCommand("I do not remember")'));
  await page.waitForSelector('.study-rating');
  await page.getByRole('button', { name: 'Teacher On' }).click();
  await page.evaluate(() => eval('toggleTeacherMode(false)'));
  const teacherOffState = await page.evaluate(() => eval('teacherModeEnabled'));
  if (teacherOffState) {
    throw new Error('Teacher Mode did not turn off before normal study completion.');
  }
  if (pageErrors.length) {
    throw new Error(`Guided lesson produced browser errors: ${pageErrors.join('; ')}`);
  }
  const revealText = await page.locator('.study-card').innerText();
  if (!/Self-check before rating/i.test(revealText)) {
    throw new Error('Blank optional recall did not show the self-check rubric.');
  }
  await page.evaluate(() => localStorage.clear());
  await page.goto(`http://127.0.0.1:${port}/app.html?lang=russian&demo=1&resetProgress=1&ratingGuard=1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.study-start');
  await page.waitForFunction(() => !document.body.classList.contains('app-booting') && window.eval && eval('Array.isArray(SENTENCES) && SENTENCES.length > 1 && hostedAudioIds !== null'), null, { timeout: 8000 });
  const firstClickState = await page.evaluate(() => eval(`(async () => {
    courseAccessMode = 'full';
    teacherAutopilotEnabled = false;
    teacherModeEnabled = false;
    teacherAiBusy = false;
    teacherQueuedAiRequests = [];
    teacherVoiceQueue = [];
    teacherVoiceQueueRunning = false;
    teacherVoicePlaying = false;
    teacherAutopilotAwaitingLearnerTurn = true;
    teacherAutopilotActionBlockedUntil = Date.now() + 60000;
    localStorage.setItem(storagePrefix + 'teacher_autopilot', '0');
    localStorage.setItem(storagePrefix + 'teacher_mode', '0');
    stopTeacherListening({ disableLive: true });
    hideAllViews();
    setActiveMode('study');
    studyViewActive = true;
    document.getElementById('studyView').classList.add('active');
    document.getElementById('studyHeaderBar').style.display = 'flex';
    studyQueue = [{ idx: 0, type: 'review' }, { idx: 1, type: 'review' }];
    studyIndex = 0;
    studySessionStats = { newCount: 0, reviewCount: 0, againCount: 0, hardCount: 0, goodCount: 0, easyCount: 0 };
    studyRevealed = false;
    studyRatingLocked = false;
    showStudyCard();
    revealStudyCard({ bypassRecallGate: true, playAudio: false });
    const setup = {
      studyIndex,
      studyRevealed,
      teacherModeEnabled,
      teacherAutopilotEnabled,
      ratingCount: document.querySelectorAll('.study-rating .btn-good').length,
      message: document.getElementById('teacherMessage')?.textContent || '',
      card: document.querySelector('.study-card')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 260) || ''
    };
    if (!setup.studyRevealed || setup.ratingCount !== 1) return { setupFailed: true, setup };
    rateStudyCard('good');
    rateStudyCard('good');
    return {
      setup,
      lockedClass: document.body.classList.contains('study-advance-lock'),
      studyIndex,
      goodCount: studySessionStats.goodCount,
      revealed: studyRevealed,
      ratingLocked: studyRatingLocked,
      goodButtons: document.querySelectorAll('.study-rating .btn-good').length,
      card: document.querySelector('.study-card')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 260) || ''
    };
  })()`));
  if (firstClickState.setupFailed || firstClickState.studyIndex !== 0 || firstClickState.goodCount !== 1 || !firstClickState.ratingLocked || !firstClickState.lockedClass) {
    throw new Error(`Rating guard failed. State after double click: ${JSON.stringify(firstClickState)}`);
  }
  await page.waitForFunction(() => !document.body.classList.contains('study-advance-lock'), null, { timeout: 5000 });
  const spacingDoubleClickState = await page.evaluate(() => eval(`(() => {
    studyQueue = [{ type: 'spacing' }, { idx: 0, type: 'review' }, { idx: 1, type: 'review' }];
    studyIndex = 0;
    currentMode = 'study';
    studyViewActive = true;
    studySpacingAdvanceLocked = false;
    showStudyCard();
    continueStudySpacing();
    continueStudySpacing();
    return { studyIndex, label: document.getElementById('studyProgressLabel')?.textContent || '' };
  })()`));
  if (spacingDoubleClickState.studyIndex !== 1 || !/2 \/ 3/.test(spacingDoubleClickState.label)) {
    throw new Error(`Spacing Continue double click skipped a recall card: ${JSON.stringify(spacingDoubleClickState)}`);
  }
  await page.evaluate(() => eval(`(() => {
    teacherModeEnabled = false;
    teacherAutopilotEnabled = false;
    localStorage.setItem(storagePrefix + 'teacher_mode', '0');
    localStorage.setItem(storagePrefix + 'teacher_autopilot', '0');
    startStudyView();
    beginStudySession();
  })()`));
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
  await page.evaluate(() => eval('teacherAutopilotEnabled=true; teacherModeEnabled=true; localStorage.setItem(storagePrefix + "teacher_autopilot", "1"); toggleTeacherMode(true)'));
  await page.getByRole('button', { name: 'Show answer' }).click();
  const practiceGateMessage = await page.locator('#teacherMessage').innerText();
  const revealedPracticeFeedback = await page.locator('#clozeFeedback .practice-feedback, #dictationFeedback .practice-feedback').count();
  if (!/Try recall first|real attempt|honest recall attempt|will not reveal|do not remember/i.test(practiceGateMessage) || revealedPracticeFeedback) {
    throw new Error(`Practice reveal bypassed Teacher recall gate. Message: ${practiceGateMessage}`);
  }
  await page.evaluate(() => eval(`stopPlayback(); teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherLastCommandText=''; teacherLastCommandAt=0; teacherCommand("I don't remember")`));
  await page.waitForSelector('#clozeFeedback .practice-feedback, #dictationFeedback .practice-feedback');
  const practiceNextMessage = await page.evaluate(() => {
    eval('stopPlayback(); teacherCapturePausedForAudio=false; teacherAudioGuardUntil=0; teacherLastCommandText=""; teacherLastCommandAt=0; teacherCommand("next")');
    return document.getElementById('teacherMessage')?.textContent || '';
  });
  if (!/Choose your rating/i.test(practiceNextMessage)) {
    throw new Error(`Teacher next skipped practice rating after reveal. Message: ${practiceNextMessage}`);
  }
  await page.evaluate(() => eval('toggleTeacherMode(false)'));
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
