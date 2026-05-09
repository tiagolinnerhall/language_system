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

function assertNotIncludes(file, content, marker) {
  if (content.toLowerCase().includes(marker.toLowerCase())) {
    throw new Error(`${file} still contains stale customer copy: ${marker}`);
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
const admin = read('admin.html');
const attributionPage = read('attribution.html');
const terms = read('terms.html');
const privacy = read('privacy.html');
const refund = read('refund.html');
const contact = read('contact.html');
const checkout = read('checkout.html');
const access = read('access.html');
const previewPageApi = read('api/preview-page.js');
const previewLoginApi = read('api/admin-preview-login.js');
const adminReportApi = read('api/admin-report.js');
const teacherVoiceApi = read('api/_lib/teacher-voice.js');
const vercelConfig = read('vercel.json');
const robots = read('robots.txt');
const sitemap = read('sitemap.xml');
const publicPages = ['index.html', 'pricing.html', 'attribution.html', 'terms.html', 'privacy.html', 'refund.html', 'contact.html', 'checkout.html', 'access.html', 'app.html'];

assertIncludes('index.html', index, 'Lang5K');
assertIncludes('index.html', index, 'hosted audio');
assertIncludes('index.html', index, '5,000-sentence path');
assertIncludes('index.html', index, '5000</div><div class="label">Hosted Audio Files');
assertIncludes('index.html', index, 'A Fast Practical Study Method');
assertIncludes('app.html', app, 'Cloze');
assertIncludes('app.html', app, 'Dictation');
assertIncludes('app.html', app, "Today's guided lesson");
assertIncludes('app.html', app, 'Start guided lesson');
assertIncludes('app.html', app, 'Next: test my memory');
assertIncludes('app.html', app, 'Hear Audio Instructions');
assertIncludes('app.html', app, 'Hear how Lang5K works');
assertIncludes('app.html', app, 'Hear AI voice guide');
assertIncludes('app.html', app, 'METHOD_AUDIO_INSTRUCTIONS');
assertIncludes('app.html', app, 'speakInstruction');
assertIncludes('app.html', app, 'Teacher Mode');
assertIncludes('app.html', app, 'Open AI Teacher');
assertIncludes('app.html', app, 'Hold to Talk');
assertIncludes('app.html', app, 'AI Teacher Autopilot');
assertIncludes('app.html', app, 'teacherWebsiteMap');
assertIncludes('app.html', app, 'teacherPerformanceProfile');
assertIncludes('app.html', app, 'teacherRecommendedPlan');
assertIncludes('app.html', app, 'playPremiumTeacherVoice');
assertIncludes('app.html', app, 'speakTeacherVoice');
assertIncludes('app.html', app, 'teacherVoiceAbortController');
assertIncludes('app.html', app, 'teacherVoiceKeyForText');
assertIncludes('app.html', app, 'teacherVoicePayloadForText');
assertIncludes('app.html', app, 'Preparing premium AI voice');
assertIncludes('app.html', app, '<span class="ai-voice-label">AI voice</span>');
assertIncludes('app.html', app, 'Mic is off by default');
assertIncludes('app.html', app, 'transcript plus lesson context may be sent to the AI teacher');
assertIncludes('app.html', app, 'Start with Study');
assertIncludes('app.html', app, 'New sentences now');
assertIncludes('app.html', app, 'Use Talk to Teacher');
assertIncludes('app.html', app, 'NEW RECALL');
assertIncludes('app.html', app, 'Lang5K study order');
assertIncludes('app.html', app, 'SPACING PAUSE');
assertIncludes('app.html', app, 'teacherCommandHasRating');
assertIncludes('app.html', app, 'curated daily-life path');
assertIncludes('app.html', app, 'Lang5K saved your ratings and picked the next best drill');
assertIncludes('app.html', app, 'review_bin');
assertIncludes('app.html', app, 'Backup progress');
assertIncludes('app.html', app, 'Restore progress');
assertIncludes('app.html', app, 'This is English. Try to remember the Russian translation');
assertIncludes('app.html', app, 'Optional: type Russian or transliteration');
assertIncludes('app.html', app, 'Show Russian answer and play audio');
assertIncludes('app.html', app, 'Why first? This sentence is due for spaced review today.');
assertIncludes('app.html', app, 'Best practical path: review due cards first, then add new ones.');
assertIncludes('app.html', app, 'Again, Hard, Good, or Easy schedules the next repetition.');
assertIncludes('app.html', app, 'Again = missed it, Hard = barely got it, Good = got most, Easy = knew it cleanly.');
assertIncludes('app.html', app, 'Use Hard if you only remembered part of it. Use Easy only if it came back quickly and cleanly.');
assertIncludes('app.html', app, 'Type it if you can, or say it to yourself');
assertIncludes('app.html', app, 'If you do not have a Cyrillic keyboard yet');
assertIncludes('app.html', app, 'Again - I missed it');
assertIncludes('app.html', app, 'Hard - I was close');
assertIncludes('app.html', app, 'Good - I got most');
assertIncludes('app.html', app, 'Easy - I knew it cleanly');
assertIncludes('app.html', app, 'I barely got it');
assertIncludes('app.html', app, 'I knew it');
assertIncludes('app.html', app, 'Why this now');
assertIncludes('app.html', app, 'Saved. This sentence will stay close and come back soon.');
assertIncludes('app.html', app, 'Auto-check');
assertIncludes('app.html', app, 'Checked as:');
assertIncludes('app.html', app, 'Pattern note:');
assertIncludes('app.html', app, 'today-plan-kicker');
assertIncludes('app.html', app, 'Finish for today');
assertIncludes('app.html', app, 'Self-check before rating');
assertIncludes('app.html', app, 'showClozeView');
assertIncludes('app.html', app, 'showDictationView');
assertIncludes('app.html', app, 'startShadowRecord');
assertIncludes('app.html', app, 'does not upload or score your recording');
assertIncludes('app.html', app, 'New Practiced');
assertNotIncludes('app.html', app, 'New Learned');
assertIncludes('manifest.webmanifest', manifest, '"name": "Lang5K"');
assertIncludes('audio-manifest-ru.json', audioManifest, '"language": "ru"');
assertIncludes('attribution-ru.json', attribution, '"license": "CC-BY 2.0 FR"');
assertIncludes('sw.js', sw, 'checkout.html');
assertIncludes('pricing.html', pricing, 'Full Russian access');
assertIncludes('pricing.html', pricing, 'Start secure checkout');
assertIncludes('pricing.html', pricing, 'app.html?lang=russian&demo=1');
assertNotIncludes('pricing.html', pricing, 'self-serve browser access recovery');
assertNotIncludes('pricing.html', pricing, 'same paid email');
assertIncludes('checkout.html', checkout, '/api/create-checkout-session');
assertIncludes('access.html', access, '/api/verify-checkout-session');
assertIncludes('access.html', access, '/api/restore-access');
assertIncludes('access.html', access, 'Access recovery');
assertIncludes('access.html', access, 'Send recovery code');
assertIncludes('api/preview-page.js', previewPageApi, 'Preview access is not configured.');
assertIncludes('api/admin-preview-login.js', previewLoginApi, 'Preview access is not configured.');
assertIncludes('api/admin-report.js', adminReportApi, 'Preview access is not configured.');
assertIncludes('admin.html', admin, 'function escapeHtml');
assertNotIncludes('api/preview-page.js', previewPageApi, 'lang5k_preview_session_v1_2026_locked');
assertNotIncludes('api/admin-preview-login.js', previewLoginApi, 'lang5k_preview_session_v1_2026_locked');
assertNotIncludes('api/admin-report.js', adminReportApi, 'lang5k_preview_session_v1_2026_locked');
assertNotIncludes('api/admin-preview-login.js', previewLoginApi, 't22222222');
assertNotIncludes('api/admin-preview-login.js', previewLoginApi, 'contato@dental04.com');
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
assertIncludes('api/_lib/teacher-voice.js', teacherVoiceApi, 'gpt-4o-mini-tts');
assertIncludes('api/_lib/teacher-voice.js', teacherVoiceApi, 'ELEVENLABS_VOICE_ID');
assertIncludes('api/_lib/teacher-voice.js', teacherVoiceApi, 'VOICE_MESSAGES');
assertIncludes('api/_lib/teacher-voice.js', teacherVoiceApi, 'textFromMessageKey');
assertIncludes('api/_lib/teacher-voice.js', teacherVoiceApi, 'teacher_start_plan');
assertIncludes('api/_lib/teacher-voice.js', teacherVoiceApi, 'teacher_voice:day:');
assertIncludes('api/_lib/teacher-voice.js', teacherVoiceApi, 'checkRateLimit');
assertIncludes('vercel.json', vercelConfig, '^/api/teacher-voice$');
assertIncludes('vercel.json', vercelConfig, "media-src 'self' blob:");

for (const page of publicPages) {
  const content = read(page);
  assertNotIncludes(page, content, 'browser voice fallback');
  assertNotIncludes(page, content, 'Hosted Audio Samples');
  assertNotIncludes(page, content, 'hosted-audio samples');
  assertNotIncludes(page, content, 'full audio catalog is generated');
  assertNotIncludes(page, content, 'Full hosted audio should be generated');
  assertNotIncludes(page, content, 'Checkout must be fully configured');
  assertNotIncludes(page, content, 'Stripe live configuration');
  assertNotIncludes(page, content, 'Paid beta');
  assertNotIncludes(page, content, 'Launch plan');
  assertNotIncludes(page, content, 'not ready yet');
  assertNotIncludes(page, content, 'The Fastest Practical Method');
}

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
