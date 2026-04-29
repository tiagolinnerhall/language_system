import { createHmac, createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = process.cwd();
const LANGUAGE = 'russian';
const LANGUAGE_CODE = 'ru';
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';
const DEFAULT_MODEL_ID = 'eleven_multilingual_v2';

function readEnv() {
  const path = join(ROOT, '.env.audio.local');
  if (!existsSync(path)) throw new Error('Missing .env.audio.local');
  const env = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return env;
}

function requireEnv(env, key) {
  if (!env[key]) throw new Error(`Missing ${key} in .env.audio.local`);
  return env[key];
}

function loadRussianSentences() {
  const files = ['data1.js', 'data2.js', 'data3.js', 'data4.js', 'data5.js'];
  const all = [];
  files.forEach((file, i) => {
    const variable = `SENTENCES${i + 1}`;
    const filePath = join(ROOT, 'api', '_data', LANGUAGE, file);
    const code = readFileSync(filePath, 'utf8') + `\n;globalThis.__DATA__=${variable};`;
    const context = {};
    vm.createContext(context);
    vm.runInContext(code, context, { filename: file });
    all.push(...context.__DATA__);
  });
  return all;
}

function sentenceId(index) {
  return `${LANGUAGE_CODE}_${String(index + 1).padStart(6, '0')}`;
}

function hmac(key, value) {
  return createHmac('sha256', key).update(value).digest();
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function signingKey(secret, date, region, service) {
  const kDate = hmac(`AWS4${secret}`, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, service);
  return hmac(kService, 'aws4_request');
}

async function uploadToR2({ env, key, body, contentType }) {
  const accountId = requireEnv(env, 'CLOUDFLARE_ACCOUNT_ID');
  const accessKey = requireEnv(env, 'R2_ACCESS_KEY_ID');
  const secretKey = requireEnv(env, 'R2_SECRET_ACCESS_KEY');
  const bucket = requireEnv(env, 'R2_BUCKET');
  const endpoint = (env.R2_ENDPOINT || `https://${accountId}.r2.cloudflarestorage.com`).replace(/\/$/, '');
  const endpointUrl = new URL(endpoint);
  const host = endpointUrl.host;
  const path = `/${bucket}/${key}`;
  const url = `${endpoint}${path}`;
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'auto';
  const service = 's3';
  const payloadHash = hash(body);
  const canonicalHeaders = [
    `host:${host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`
  ].join('\n') + '\n';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [
    'PUT',
    path.split('/').map(encodeURIComponent).join('/').replace(/%2F/g, '/'),
    '',
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join('\n');
  const scope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    scope,
    hash(canonicalRequest)
  ].join('\n');
  const signature = createHmac('sha256', signingKey(secretKey, dateStamp, region, service)).update(stringToSign).digest('hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: authorization,
      'Content-Type': contentType,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
      'Cache-Control': 'public, max-age=31536000, immutable'
    },
    body
  });
  if (!response.ok) {
    throw new Error(`R2 upload failed ${response.status}: ${await response.text()}`);
  }
}

async function generateAudio({ env, text, voiceId }) {
  const apiKey = requireEnv(env, 'ELEVENLABS_API_KEY');
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      Accept: 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey
    },
    body: JSON.stringify({
      text,
      model_id: env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID,
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    })
  });
  if (!response.ok) {
    throw new Error(`ElevenLabs failed ${response.status}: ${await response.text()}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  const env = readEnv();
  const count = Number(process.argv.find(arg => arg.startsWith('--count='))?.split('=')[1] || DEFAULT_BATCH_SIZE);
  const start = Number(process.argv.find(arg => arg.startsWith('--start='))?.split('=')[1] || 0);
  const voiceId = env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID;
  const publicBaseUrl = requireEnv(env, 'R2_PUBLIC_BASE_URL').replace(/\/$/, '');
  const sentences = loadRussianSentences();
  const outputDir = join(ROOT, 'generated-audio', LANGUAGE_CODE);
  mkdirSync(outputDir, { recursive: true });
  const manifest = [];

  for (let index = start; index < Math.min(start + count, sentences.length); index++) {
    const [target, translit, english] = sentences[index];
    const id = sentenceId(index);
    const key = `${LANGUAGE_CODE}/${id}.mp3`;
    const localPath = join(outputDir, `${id}.mp3`);
    const hasCachedAudio = existsSync(localPath);
    console.log(`${hasCachedAudio ? 'Uploading cached' : 'Generating'} ${id}: ${english}`);
    const audio = hasCachedAudio
      ? readFileSync(localPath)
      : await generateAudio({ env, text: target, voiceId });
    if (!hasCachedAudio) writeFileSync(localPath, audio);
    await uploadToR2({ env, key, body: audio, contentType: 'audio/mpeg' });
    manifest.push({ id, index, target, translit, english, url: `${publicBaseUrl}/${key}` });
  }

  const manifestPath = join(outputDir, `manifest-${LANGUAGE_CODE}-${start + 1}-${start + manifest.length}.json`);
  writeFileSync(manifestPath, JSON.stringify({ language: LANGUAGE_CODE, generatedAt: new Date().toISOString(), voiceId, items: manifest }, null, 2));
  const appManifestPath = join(ROOT, `audio-manifest-${LANGUAGE_CODE}.json`);
  const existingManifest = existsSync(appManifestPath)
    ? JSON.parse(readFileSync(appManifestPath, 'utf8'))
    : { language: LANGUAGE_CODE, items: [] };
  const mergedItems = new Map((existingManifest.items || []).map(item => [item.id, item]));
  manifest.forEach(item => mergedItems.set(item.id, item));
  const appManifest = {
    language: LANGUAGE_CODE,
    generatedAt: new Date().toISOString(),
    publicBaseUrl,
    items: [...mergedItems.values()].sort((a, b) => a.index - b.index)
  };
  writeFileSync(appManifestPath, JSON.stringify(appManifest, null, 2) + '\n');
  await uploadToR2({
    env,
    key: `${LANGUAGE_CODE}/manifest.json`,
    body: Buffer.from(JSON.stringify(appManifest, null, 2)),
    contentType: 'application/json'
  });
  console.log(`Generated and uploaded ${manifest.length} file(s).`);
  console.log(`Manifest: ${manifestPath}`);
}

main().catch(error => {
  console.error(error.message);
  if (error.cause) console.error(error.cause);
  process.exit(1);
});
