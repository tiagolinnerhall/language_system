# Lang5K Full Professional Launch Requirements

Lang5K should not be sold as a finished paid product until these gates are complete.

## Required Before Public Paid Launch

1. Private buyer access
   - Users must not get the full paid product only through a public URL.
   - Stripe checkout must create a verified access token.
   - The app must show a limited demo state for unpaid users.

2. Stripe automation
   - Use live Stripe checkout and verified checkout-session status.
   - Store or verify customer email, payment ID, product, access status, and timestamps.
   - Support refunds and revoke access when needed.

3. Database
   - Store customers, purchases, access entitlements, and support/audit metadata.
   - Recommended minimum: Supabase or Vercel Postgres.
   - Do not store secrets in browser code.

4. Account access
   - Email magic link or one-time code login is enough for launch.
   - A buyer should be able to regain access without contacting support.
   - Support must be able to identify a buyer from their checkout email.

5. Russian course quality
   - Complete native-speaker review before premium marketing.
   - Track rejected, edited, and approved sentence IDs.
   - Keep public attribution intact for Tatoeba-derived content.

6. Audio coverage
   - Generate hosted audio only after sentence review.
   - Store audio in Cloudflare R2 under `audio.lang5k.com`.
   - Validate that every paid-course sentence either has hosted audio or an intentional fallback.

7. Legal and support surface
   - Final checkout terms, refund timing, cancellation rules, and support response expectations.
   - Support inboxes: `support@lang5k.com`, `billing@lang5k.com`, `content@lang5k.com`.
   - Privacy policy must describe payment processor, email support, local progress storage, and future account data.

8. Production analytics and reliability
   - Track page views, checkout starts, successful purchases, app starts, and support clicks.
   - Add error monitoring before scaling ads.
   - Keep smoke tests, course validation, and browser checks green.

## Current Status

- Russian 5,000 sentence course: built and validated.
- Public site: live.
- Support email routing: active.
- Stripe checkout API: implemented, requires live environment variables.
- Full buyer access control: implemented as browser access token after verified Stripe checkout, with Stripe re-check before full course delivery.
- Full audio coverage: not complete.
- Native-speaker review: not complete.

## Next Build Slice

Finish production hardening:

1. Add live Vercel environment variables.
2. Test a real Stripe checkout.
3. Add a database-backed customer ledger and email recovery.
4. Add Stripe webhook handling for refunds and disputes.
5. Complete native review and hosted audio generation.
