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
  'audio_fallback',
  'audio_manifest_mismatch',
  'access.recovery_code_sent',
  'access.recovery_request_no_entitlement',
  'access.recovered',
  'stripe.webhook',
  'stripe.webhook_ignored'
]);

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
      value: body.value && typeof body.value === 'object' ? body.value : undefined
    });
    res.status(200).json({ ok: true });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to record analytics.' });
  }
};
