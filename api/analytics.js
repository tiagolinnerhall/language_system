const { clientIp, noStore, readJsonBody } = require('./_lib/http');
const { trackEvent } = require('./_lib/analytics');
const { checkRateLimit } = require('./_lib/store');

const ALLOWED_EVENTS = new Set([
  'app_start',
  'study_start',
  'study_rating',
  'practice_rating',
  'checkout_start',
  'instruction_audio',
  'teacher_mode',
  'audio_fallback',
  'audio_manifest_mismatch'
]);

function cleanEventValue(type, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const pick = keys => {
    const clean = {};
    keys.forEach(key => {
      const raw = value[key];
      if (typeof raw === 'string') clean[key] = raw.slice(0, 80);
      else if (typeof raw === 'number' && Number.isFinite(raw)) clean[key] = raw;
      else if (typeof raw === 'boolean') clean[key] = raw;
    });
    return Object.keys(clean).length ? clean : undefined;
  };
  if (type === 'study_rating') return pick(['rating', 'type']);
  if (type === 'practice_rating') return pick(['rating', 'practiceMode']);
  if (type === 'instruction_audio') return pick(['section']);
  if (type === 'teacher_mode') return pick(['enabled']);
  if (type === 'audio_fallback') return pick(['idx', 'reason']);
  if (type === 'audio_manifest_mismatch') return pick(['idx', 'audioId']);
  if (type === 'app_start') return pick(['sentences']);
  return undefined;
}

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed.' });
    return;
  }
  try {
    const body = await readJsonBody(req, 16 * 1024);
    const type = String(body.type || '').trim().slice(0, 80);
    if (!type || !ALLOWED_EVENTS.has(type)) {
      res.status(400).json({ error: 'Missing event type.' });
      return;
    }
    const allowed = await checkRateLimit(`analytics:${clientIp(req)}`, 120, 60);
    if (!allowed) {
      res.status(429).json({ error: 'Too many analytics events.' });
      return;
    }
    await trackEvent(req, {
      type,
      language: String(body.language || '').slice(0, 40),
      mode: String(body.mode || '').slice(0, 40),
      value: cleanEventValue(type, body.value)
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to record analytics.' });
  }
};
