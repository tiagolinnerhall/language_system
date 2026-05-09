class EmailConfigError extends Error {
  constructor(message = 'Email recovery is not configured.') {
    super(message);
    this.statusCode = 503;
  }
}

function emailConfig() {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  const from = (process.env.LANG5K_EMAIL_FROM || '').trim();
  const siteUrl = (process.env.LANG5K_SITE_URL || 'https://www.lang5k.com').trim().replace(/\/$/, '');
  if (!apiKey || !from) throw new EmailConfigError();
  return { apiKey, from, siteUrl };
}

async function sendAccessCodeEmail(to, code) {
  const { apiKey, from, siteUrl } = emailConfig();
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Your Lang5K access code',
      text: `Your Lang5K access code is ${code}. It expires in 15 minutes.\n\nOpen ${siteUrl}/access.html to enter it.`,
      html: `<p>Your Lang5K access code is <strong>${code}</strong>.</p><p>It expires in 15 minutes.</p><p><a href="${siteUrl}/access.html">Open Lang5K access</a></p>`
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || data.error || 'Access email could not be sent.');
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

module.exports = { EmailConfigError, sendAccessCodeEmail };
