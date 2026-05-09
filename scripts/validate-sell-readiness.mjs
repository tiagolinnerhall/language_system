import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();

function read(path) {
  const absolute = join(root, path);
  if (!existsSync(absolute)) throw new Error(`Missing required file: ${path}`);
  return readFileSync(absolute, 'utf8');
}

function mustInclude(path, marker) {
  const content = read(path);
  if (!content.includes(marker)) throw new Error(`${path} missing marker: ${marker}`);
}

function mustNotInclude(path, marker) {
  const content = read(path);
  if (content.includes(marker)) throw new Error(`${path} still contains unsafe marker: ${marker}`);
}

[
  'api/_lib/store.js',
  'api/_lib/http.js',
  'api/_lib/analytics.js',
  'api/_lib/email.js',
  'api/_lib/preview.js',
  'api/progress.js',
  'api/analytics.js',
  'api/stripe-webhook.js',
  'scripts/export-native-review-queue.mjs',
  'scripts/validate-audio-manifest-alignment.mjs',
  'scripts/headless-visual-quality-check.mjs',
  'docs/course-review/native-review-first-250.csv',
  'docs/course-review/native-review-first-1000.csv',
  'docs/course-review/native-review-instructions.md'
].forEach(path => {
  if (!existsSync(join(root, path))) throw new Error(`Missing sell-readiness file: ${path}`);
});

mustInclude('api/_lib/store.js', 'MongoClient');
mustInclude('api/_lib/store.js', 'MONGODB_URI');
mustInclude('api/_lib/store.js', 'LANG5K_MONGODB_DB');
mustInclude('api/_lib/http.js', 'HttpOnly; Secure; SameSite=Lax');
mustInclude('api/_lib/http.js', 'lang5k_access_token');
mustInclude('api/_lib/http.js', 'lang5k_account_session');
mustInclude('api/_lib/http.js', 'Request body too large.');
mustInclude('api/_lib/http.js', 'function noStore');
mustInclude('api/_lib/http.js', 'ACCESS_TOKEN_SECONDS');
mustInclude('api/_lib/email.js', 'RESEND_API_KEY');
mustInclude('api/_lib/email.js', 'LANG5K_EMAIL_FROM');
mustInclude('api/_lib/store.js', 'recordStripeWebhookEvent');
mustInclude('api/_lib/store.js', 'markStripeWebhookEventProcessed');
mustInclude('api/_lib/store.js', 'entitlement_events');
mustInclude('api/_lib/store.js', 'checkRateLimit');
mustInclude('api/_lib/store.js', 'updateEntitlementByStripeReference');
mustInclude('api/_lib/store.js', 'getAdminMetrics');
mustInclude('api/stripe-webhook.js', 'STRIPE_WEBHOOK_SECRET');
mustInclude('api/stripe-webhook.js', 'validateLang5KCheckoutSession');
mustInclude('api/stripe-webhook.js', 'markStripeWebhookEventProcessed');
mustInclude('api/stripe-webhook.js', 'WEBHOOK_TOLERANCE_SECONDS');
mustInclude('api/stripe-webhook.js', 'recordStripeWebhookEvent');
mustInclude('api/stripe-webhook.js', 'updateEntitlementByStripeReference');
mustInclude('api/stripe-webhook.js', 'checkout.session.completed');
mustInclude('api/stripe-webhook.js', 'charge.refunded');
mustInclude('api/stripe-webhook.js', 'charge.dispute.created');
mustInclude('api/restore-access.js', 'sendAccessCodeEmail');
mustInclude('api/restore-access.js', 'createAccessToken');
mustInclude('api/restore-access.js', 'hashCode');
mustInclude('api/restore-access.js', 'access_recovery');
mustInclude('api/restore-access.js', 'checkRateLimit');
mustInclude('api/progress.js', 'saveProgressSnapshot');
mustInclude('api/progress.js', 'getProgressArchiveList');
mustInclude('api/progress.js', 'getProgressArchive');
mustInclude('api/progress.js', 'restoreRevision');
mustInclude('api/progress.js', 'restoreConflict');
mustInclude('api/progress.js', '4 * 1024 * 1024');
mustInclude('api/progress.js', 'getEntitlement');
mustInclude('api/_lib/store.js', 'progress_archives');
mustInclude('api/_lib/store.js', 'archiveProgressSnapshot');
mustInclude('api/_lib/store.js', 'safeArchiveProgressSnapshot');
mustInclude('api/_lib/store.js', 'stale-client-save');
mustInclude('api/_lib/store.js', 'progressClientUpdatedAt');
mustInclude('api/_lib/store.js', 'clientUpdatedAt: { $lte: payload.clientUpdatedAt }');
mustInclude('api/_lib/store.js', 'expireAfterSeconds');
mustInclude('api/create-checkout-session.js', 'canUsePaidCheckout');
mustInclude('api/create-checkout-session.js', 'metadata[app]');
mustInclude('api/verify-checkout-session.js', 'validateLang5KCheckoutSession');
mustInclude('api/verify-checkout-session.js', 'recordCheckoutEntitlement');
mustInclude('api/verify-checkout-session.js', 'ACCESS_TOKEN_SECONDS');
mustInclude('api/course.js', 'tokenFromRequest');
mustInclude('api/admin-report.js', 'getAdminMetrics');
mustInclude('api/_lib/preview.js', 'LANG5K_PUBLIC_LAUNCH');
mustInclude('api/_lib/preview.js', 'LANG5K_NATIVE_REVIEW_APPROVED');
mustInclude('app.html', 'syncCloudProgress');
mustInclude('app.html', 'lastSessionIndexes');
mustInclude('app.html', 'buildStudyQueue');
mustInclude('app.html', 'MIN_DELAYED_RECALL_GAP');
mustInclude('app.html', 'studyRatingLocked');
mustInclude('app.html', 'sessionDelayed');
mustInclude('app.html', 'sourceAudioIndex');
mustInclude('app.html', 'audio_manifest_mismatch');
mustInclude('app.html', 'plannedNewCount');
mustInclude('app.html', '/api/progress');
mustInclude('app.html', 'progress_conflict_restored');
mustInclude('app.html', 'hasLocalStudyProgress');
mustInclude('app.html', 'activeSessionPayload');
mustInclude('app.html', '/api/analytics');
mustInclude('access.html', '/api/restore-access');
mustInclude('access.html', 'Send recovery code');
mustInclude('access.html', 'Ready to send a recovery code');
mustInclude('pricing.html', 'email-code access recovery');
mustInclude('vercel.json', 'Strict-Transport-Security');
mustInclude('login.html', '/api/admin-preview-login');
mustInclude('vercel.json', 'Content-Security-Policy');
mustInclude('vercel.json', 'X-Content-Type-Options');
mustInclude('docs/PRODUCTION_ENVIRONMENT.md', 'MONGODB_URI');
mustInclude('docs/PRODUCTION_ENVIRONMENT.md', 'LANG5K_MONGODB_DB');
mustInclude('docs/PRODUCTION_ENVIRONMENT.md', 'STRIPE_WEBHOOK_SECRET');
mustInclude('docs/PRODUCTION_ENVIRONMENT.md', 'RESEND_API_KEY');
mustInclude('docs/course-review/native-review-instructions.md', 'approve');
mustInclude('docs/course-review/native-review-instructions.md', 'reject');

mustNotInclude('api/admin-preview-login.js', 't22222222');
mustNotInclude('api/admin-preview-login.js', 'contato@dental04.com');

console.log('Lang5K sell-readiness validation passed.');
