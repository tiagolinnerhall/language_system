# Lang5K Sell-Readiness Implementation

Date: 2026-05-04

## Implemented

- Cloud progress sync:
  - `/api/progress` `GET` and `POST`
  - App now loads and saves progress snapshots for paid checkout sessions.

- MongoDB-backed customer/entitlement ledger:
  - `api/_lib/store.js`
  - Uses `MONGODB_URI` and `LANG5K_MONGODB_DB`.
  - Stores accounts, entitlements, progress snapshots, billing events, and analytics events.

- Stripe webhook/customer lifecycle handling:
  - `/api/stripe-webhook`
  - Verifies `STRIPE_WEBHOOK_SECRET`.
  - Handles `checkout.session.completed`, `charge.refunded`, and `charge.dispute.created`.

- Minimal access recovery:
  - Automated email recovery was removed to avoid adding another provider.
  - Lost access/new-device access is handled manually through support with the Stripe receipt.

- Analytics:
  - `/api/analytics`
  - Captures checkout start, app start, study start, study rating, and practice rating events.

- Stronger headers and safer session handling:
  - Added CSP, nosniff, referrer policy, permissions policy, and tighter CORS header in `vercel.json`.
  - Paid access now uses an HttpOnly `lang5k_access_token` cookie.
  - Account sync uses an HttpOnly `lang5k_account_session` cookie.

## Still Not Done

- Native Russian review. This was explicitly excluded from this implementation request.
- Production Vercel env vars are not set or verified in this local pass.
- Live Stripe checkout, webhook, refund, and progress-sync testing still needs real production credentials.
- Owner metrics dashboard is not built yet.
- Reminder/onboarding automation is not built yet.

## Required Production Environment

- `LANG5K_ACCESS_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `LANG5K_SITE_URL`
- `MONGODB_URI`
- `LANG5K_MONGODB_DB`
- `LANG5K_PREVIEW_EMAIL`
- `LANG5K_PREVIEW_PASSWORD`
- `LANG5K_PREVIEW_SESSION`

## Verification

- `node scripts/validate-sell-readiness.mjs`
- `node scripts/smoke-test.mjs`
- `node scripts/validate-access-flow.mjs`
- `node scripts/validate-russian-course.mjs`
- `node scripts/validate-premium-study-order.mjs`
