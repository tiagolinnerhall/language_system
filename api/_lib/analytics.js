const { recordAnalyticsEvent } = require('./store');

async function trackEvent(req, event) {
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ua = String(req.headers['user-agent'] || '').slice(0, 240);
  return recordAnalyticsEvent({
    ...event,
    ipHashHint: ip ? 'present' : 'missing',
    userAgent: ua
  });
}

module.exports = { trackEvent };
