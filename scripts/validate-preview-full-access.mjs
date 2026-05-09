import { createRequire } from 'node:module';

process.env.LANG5K_ACCESS_SECRET = 'test-access-secret';
process.env.LANG5K_PREVIEW_SESSION = 'preview-token';

const require = createRequire(import.meta.url);
const courseHandler = require('../api/course.js');

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
}

async function callCourse(headers = {}, mode = 'full') {
  const req = {
    method: 'GET',
    query: { lang: 'russian', mode },
    headers,
    socket: { remoteAddress: '127.0.0.1' }
  };
  const res = mockResponse();
  await courseHandler(req, res);
  return res;
}

const preview = await callCourse({ cookie: 'lang5k_preview_session=preview-token' });
if (preview.statusCode !== 200) {
  throw new Error(`Preview full access should return 200, got ${preview.statusCode}`);
}
if (preview.body?.mode !== 'full') {
  throw new Error(`Preview full access should return full mode, got ${preview.body?.mode}`);
}
if (!Array.isArray(preview.body?.sentences) || preview.body.sentences.length < 5000) {
  throw new Error(`Preview full access should load the full course, got ${preview.body?.sentences?.length || 0}`);
}

const previewDemoEntry = await callCourse({ cookie: 'lang5k_preview_session=preview-token' }, 'demo');
if (previewDemoEntry.statusCode !== 200 || previewDemoEntry.body?.mode !== 'full') {
  throw new Error(`Preview demo entry should upgrade to full access, got ${previewDemoEntry.statusCode} ${previewDemoEntry.body?.mode}`);
}

const anonymous = await callCourse({});
if (anonymous.statusCode !== 401) {
  throw new Error(`Anonymous full access should remain blocked, got ${anonymous.statusCode}`);
}

const anonymousDemo = await callCourse({}, 'demo');
if (anonymousDemo.statusCode !== 200 || anonymousDemo.body?.mode !== 'demo' || anonymousDemo.body?.limit !== 80) {
  throw new Error('Anonymous demo access should remain limited to the demo course.');
}

console.log('Preview full-access validation passed.');
