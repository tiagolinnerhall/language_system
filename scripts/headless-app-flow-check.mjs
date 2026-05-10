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

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/api/course') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ language: 'russian', mode: 'demo', total: rows.length, limit: 80, sentences: rows.slice(0, 80) }));
    return;
  }
  if (url.pathname === '/api/teacher-chat') {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
    });
    req.on('end', () => {
      const body = JSON.parse(raw || '{}');
      teacherChatBodies.push(body);
      const message = String(body.message || '').toLowerCase();
      let reply = 'AI Autopilot decided: start with the guided lesson and keep 10 new sentences only if due reviews stay clear.';
      if (message.includes('what should') || message.includes('what now')) {
        reply = 'AI Autopilot decided: do not reveal yet. Try recall first, then compare the answer.';
      } else if (message.includes('why this now')) {
        reply = 'AI Autopilot decided: Lang5K selected a new sentence in the guided sequence.';
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        ok: true,
        reply,
        action: 'none',
        speak: false,
        difficulty: 'normal',
        focus: 'study'
      }));
    });
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
    window.__emitTeacherSpeech = transcript => {
      const recognition = window.__lastSpeechRecognition;
      if (!recognition?.onresult) return;
      recognition.onresult({
        resultIndex: 0,
        results: [{ isFinal: true, 0: { transcript } }]
      });
    };
  });
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('dialog', dialog => dialog.accept());

  async function completeCurrentCard() {
    await page.waitForSelector('.study-card');
    const spacingButton = page.getByRole('button', { name: 'Continue' });
    if (await spacingButton.count()) {
      await spacingButton.click();
      await page.waitForTimeout(200);
      return;
    }
    const nextButton = page.getByRole('button', { name: 'Next: test my memory' });
    if (await nextButton.count()) await nextButton.click();
    await page.getByRole('button', { name: 'Show Russian answer and play audio' }).click();
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
    const today = new Date().toISOString().slice(0, 10);
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
  const liveTeacherState = await page.evaluate(() => ({
    live: eval('teacherLiveListening'),
    listening: eval('teacherListening'),
    continuous: window.__lastSpeechRecognition?.continuous,
    lang: window.__lastSpeechRecognition?.lang,
    button: document.getElementById('teacherTalkBtn')?.textContent || ''
  }));
  if (!liveTeacherState.live || !liveTeacherState.listening || !liveTeacherState.continuous || !/Pause Listening/i.test(liveTeacherState.button)) {
    throw new Error(`Start Autopilot did not start continuous Live Teacher listening: ${JSON.stringify(liveTeacherState)}`);
  }
  const beforeSilenceCount = teacherChatBodies.length;
  await page.evaluate(() => window.__emitTeacherSpeech('um'));
  await page.waitForTimeout(150);
  if (teacherChatBodies.length !== beforeSilenceCount) {
    throw new Error('Live Teacher sent an AI request for filler/silence transcript.');
  }
  const beforeMicCheckCount = teacherChatBodies.length;
  await page.evaluate(() => window.__emitTeacherSpeech('hi are you listening to me'));
  await page.waitForTimeout(250);
  const micCheckMessage = await page.locator('#teacherMessage').innerText();
  if (teacherChatBodies.length !== beforeMicCheckCount) {
    throw new Error('Live Teacher routed a simple listening check to the AI planner instead of acknowledging it locally.');
  }
  if (!/yes|listening|heard you/i.test(micCheckMessage) || /Due reviews first|Autopilot decided/i.test(micCheckMessage)) {
    throw new Error(`Live Teacher did not answer a listening check like a human teacher. Saw: ${micCheckMessage}`);
  }
  const beforeRussianMicCheckCount = teacherChatBodies.length;
  await page.evaluate(() => window.__emitTeacherSpeech('привет ты меня слышишь'));
  await page.waitForTimeout(250);
  const russianMicCheckMessage = await page.locator('#teacherMessage').innerText();
  if (teacherChatBodies.length !== beforeRussianMicCheckCount || !/yes|listening|heard you/i.test(russianMicCheckMessage)) {
    throw new Error(`Live Teacher did not handle a Russian listening check locally. Saw: ${russianMicCheckMessage}`);
  }
  const beforeRussianQuestionCount = teacherChatBodies.length;
  await page.evaluate(() => window.__emitTeacherSpeech('привет что значит пожалуйста'));
  await page.waitForTimeout(350);
  const russianQuestionChat = teacherChatBodies.at(-1);
  if (teacherChatBodies.length !== beforeRussianQuestionCount + 1 || !russianQuestionChat?.message?.includes('привет что значит пожалуйста')) {
    throw new Error(`Live Teacher swallowed Russian greeting plus real question: ${JSON.stringify(russianQuestionChat)}`);
  }
  await page.evaluate(() => window.__emitTeacherSpeech('pause listening'));
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
  await page.evaluate(() => window.__emitTeacherSpeech('stop'));
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
    const ok = teacherStartLiveListening();
    const state = {
      ok,
      live: teacherLiveListening,
      listening: teacherListening,
      button: document.getElementById('teacherTalkBtn')?.textContent || '',
      status: document.getElementById('teacherVoiceStatus')?.textContent || ''
    };
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
    lang: window.__lastSpeechRecognition?.lang,
    button: document.getElementById('teacherTalkBtn')?.textContent || ''
  }));
  if (!restartedLiveTeacherState.live || !restartedLiveTeacherState.listening || !/Pause Listening/i.test(restartedLiveTeacherState.button)) {
    throw new Error(`Live Teacher did not restart after failed mic test: ${JSON.stringify(restartedLiveTeacherState)}`);
  }
  const languageSwitchInitial = await page.evaluate(() => eval(`(() => {
    stopTeacherListening({ disableLive: true });
    currentMode = 'browse';
    studyViewActive = false;
    studyRevealed = false;
    teacherStartLiveListening({ announce: false });
    const initial = window.__lastSpeechRecognition?.lang;
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
    after: window.__lastSpeechRecognition?.lang,
    live: eval('teacherLiveListening'),
    listening: eval('teacherListening')
  }), languageSwitchInitial);
  if (languageSwitchState.initial !== 'en-US' || languageSwitchState.after !== 'ru-RU' || !languageSwitchState.live || !languageSwitchState.listening) {
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
    teacherCommand('skazhi pozhaluysta');
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
  const queuedAiState = await page.evaluate(() => eval(`(() => {
    teacherAiBusy = true;
    teacherQueuedAiRequest = null;
    teacherAskAi('what does привет mean?', { source: 'voice' });
    const state = {
      queued: teacherQueuedAiRequest,
      status: document.getElementById('teacherVoiceStatus')?.textContent || ''
    };
    teacherAiBusy = false;
    teacherQueuedAiRequest = null;
    return state;
  })()`));
  if (queuedAiState.queued?.message !== 'what does привет mean?' || !/answer right after/i.test(queuedAiState.status)) {
    throw new Error(`Live Teacher dropped an AI-bound question while busy: ${JSON.stringify(queuedAiState)}`);
  }
  await page.evaluate(() => {
    eval('teacherCommand("where do I start")');
  });
  await page.waitForTimeout(350);
  const mappedAnswer = await page.locator('#teacherMessage').innerText();
  const whereStartChat = teacherChatBodies.at(-1);
  if (!whereStartChat?.message?.includes('where do I start')) {
    throw new Error(`Teacher did not route where-to-start doubt to AI context: ${JSON.stringify(whereStartChat)}`);
  }
  if (!/AI Autopilot decided/i.test(mappedAnswer)) {
    throw new Error(`Teacher did not answer where-to-start through AI Autopilot. Saw: ${mappedAnswer}`);
  }
  await page.evaluate(() => eval('teacherCommand("open browse")'));
  await page.waitForTimeout(350);
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
    hard: teacherCommandHasRating('hard', 'hard')
  }))()`));
  if (ratingCommandCheck.notGood || !ratingCommandCheck.good || ratingCommandCheck.notThatGood || ratingCommandCheck.dontThinkGood || ratingCommandCheck.dontThinkItsGood || ratingCommandCheck.notEasy || ratingCommandCheck.notVeryEasy || ratingCommandCheck.wasntEasy || ratingCommandCheck.didntFeelEasy || !ratingCommandCheck.hard) {
    throw new Error(`Teacher rating command negation check failed: ${JSON.stringify(ratingCommandCheck)}`);
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
    toggleTeacherMode(true);
    showStudyCard();
    teacherCommand('I tried');
    const afterFake = { revealed: studyRevealed, message: document.getElementById('teacherMessage')?.textContent || '' };
    teacherCommand('skazhi pozhaluysta');
    teacherCommand('reveal');
    return {
      afterFake,
      afterRealAttempt: { revealed: studyRevealed, message: document.getElementById('teacherMessage')?.textContent || '' }
    };
  })()`));
  if (autopilotAttemptGate.afterFake.revealed || !/real attempt|will not reveal|need a real attempt/i.test(autopilotAttemptGate.afterFake.message)) {
    throw new Error(`AI Teacher Autopilot accepted a fake recall attempt: ${JSON.stringify(autopilotAttemptGate.afterFake)}`);
  }
  if (!autopilotAttemptGate.afterRealAttempt.revealed) {
    throw new Error(`AI Teacher Autopilot did not reveal after a spoken recall attempt: ${JSON.stringify(autopilotAttemptGate.afterRealAttempt)}`);
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
    teacherCommand('skazhi pozhaluysta');
    const context = teacherAiContext();
    teacherCommand('reveal');
    const heardText = document.querySelector('.study-typed-answer')?.textContent || '';
    return { afterSelfAction, context, heardText };
  })()`));
  if (teacherModeIsolation.afterSelfAction.revealed) {
    throw new Error('Self-guided mode allowed an AI action to reveal the card.');
  }
  if (teacherModeIsolation.context.teacherMode !== 'autopilot' || !teacherModeIsolation.context.teacherAutopilotEnabled || !/skazhi/i.test(teacherModeIsolation.context.spokenRecallAttempt || '')) {
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
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.study-start');
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
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('.study-start');
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
  await page.evaluate(() => eval('teacherCommand("I tried")'));
  await page.getByRole('button', { name: 'Show Russian answer and play audio' }).click();
  const introCarryMessage = await page.locator('#teacherMessage').innerText();
  if (!/Try recall first/i.test(introCarryMessage) || await page.locator('.study-rating').count()) {
    throw new Error(`Intro "I tried" carried into recall reveal gate. Message: ${introCarryMessage}`);
  }
  await page.getByRole('button', { name: 'Next step' }).click();
  const gatedRevealMessage = await page.locator('#teacherMessage').innerText();
  if (!/Try recall first/i.test(gatedRevealMessage) || await page.locator('.study-rating').count()) {
    throw new Error(`Teacher revealed before recall attempt or did not explain the gate. Message: ${gatedRevealMessage}`);
  }
  await page.getByRole('button', { name: 'Show Russian answer and play audio' }).click();
  const directRevealMessage = await page.locator('#teacherMessage').innerText();
  if (!/Try recall first/i.test(directRevealMessage) || await page.locator('.study-rating').count()) {
    throw new Error(`Direct reveal bypassed Teacher recall gate. Message: ${directRevealMessage}`);
  }
  await page.evaluate(() => eval('teacherCommand("what should I do")'));
  await page.waitForTimeout(350);
  const currentHelp = await page.locator('#teacherMessage').innerText();
  if (!/Do not reveal yet|Try recall/i.test(currentHelp)) {
    throw new Error(`Teacher did not answer current-card help. Saw: ${currentHelp}`);
  }
  await page.evaluate(() => eval('teacherCommand("why this now")'));
  await page.waitForTimeout(350);
  const whyNow = await page.locator('#teacherMessage').innerText();
  if (!/selected a new sentence|review|delayed|weak/i.test(whyNow)) {
    throw new Error(`Teacher did not answer why-this-now from current state. Saw: ${whyNow}`);
  }
  await page.evaluate(() => eval('teacherCommand("I tried")'));
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
  await page.getByRole('button', { name: /Good/i }).dblclick();
  await page.waitForTimeout(900);
  const teacherAfterFirstRating = await page.evaluate(() => eval('teacherModeEnabled'));
  if (teacherAfterFirstRating) {
    throw new Error('Teacher Mode turned on during the rating double-click guard test.');
  }
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
  await page.evaluate(() => eval('toggleTeacherMode(true)'));
  await page.getByRole('button', { name: 'Show answer' }).click();
  const practiceGateMessage = await page.locator('#teacherMessage').innerText();
  const revealedPracticeFeedback = await page.locator('#clozeFeedback .practice-feedback, #dictationFeedback .practice-feedback').count();
  if (!/Try recall first/i.test(practiceGateMessage) || revealedPracticeFeedback) {
    throw new Error(`Practice reveal bypassed Teacher recall gate. Message: ${practiceGateMessage}`);
  }
  await page.evaluate(() => eval('teacherCommand("I tried")'));
  await page.waitForSelector('#clozeFeedback .practice-feedback, #dictationFeedback .practice-feedback');
  const practiceNextMessage = await page.evaluate(() => {
    eval('teacherCommand("next")');
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
