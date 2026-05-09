# Lang5K Production Environment

Set these variables in Vercel before live selling.

## Required

- `STRIPE_SECRET_KEY`
  - Live Stripe secret key.
  - Used only by `/api/create-checkout-session` and `/api/verify-checkout-session`.

- `STRIPE_PRICE_ID`
  - Live Stripe Price ID for the Lang5K full-course product.
  - Use the one-time R$99 price.

- `LANG5K_ACCESS_SECRET`
  - Long random signing secret for browser access tokens.
  - Generate a private random value and do not reuse API keys.

- `LANG5K_SITE_URL`
  - `https://www.lang5k.com`

- `STRIPE_WEBHOOK_SECRET`
  - Stripe endpoint signing secret for `/api/stripe-webhook`.
  - Required to activate or revoke entitlements from checkout, refund, and dispute events.

- `RESEND_API_KEY`
  - Resend API key used only for paid-email recovery codes.
  - Without this, checkout can still unlock the current browser, but self-serve recovery will show a configuration error.

- `LANG5K_EMAIL_FROM`
  - Verified sender for access recovery emails, for example `Lang5K <support@lang5k.com>`.

- `MONGODB_URI`
  - MongoDB connection string.
  - You can reuse the Dental04 MongoDB cluster if the credentials stay server-side only.
  - Keep Lang5K isolated by using a separate database name and Lang5K-only collections.

- `LANG5K_MONGODB_DB`
  - Recommended value: `lang5k`.
  - This keeps Lang5K accounts, entitlements, progress, login codes, and events separate from Dental04 collections.

- `LANG5K_PREVIEW_EMAIL`
  - Owner-only preview login email while the product is hidden before public launch.

- `LANG5K_PREVIEW_PASSWORD`
  - Strong owner-only preview password while the product is hidden before public launch.

- `LANG5K_PREVIEW_SESSION`
  - Long random preview-session value used for the HttpOnly preview cookie.
  - Do not reuse `LANG5K_ACCESS_SECRET`.

- `LANG5K_NATIVE_REVIEW_APPROVED`
  - Leave unset until a native Russian reviewer has approved the launch path.
  - Public checkout remains blocked without this even if `LANG5K_PUBLIC_LAUNCH=1`.

## Existing Audio Variables

Keep audio-generation credentials local unless running generation in a trusted environment:

- `ELEVENLABS_API_KEY`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_BASE_URL`

## Checkout Flow

1. Customer opens `checkout.html`.
2. The page calls `/api/create-checkout-session`.
3. Stripe redirects back to `access.html?session_id=...`.
4. `access.html` calls `/api/verify-checkout-session`.
5. If Stripe says the session is complete and paid, Lang5K sets secure HttpOnly access/account cookies.
6. `app.html` requests the full 5,000-sentence course from `/api/course`.
7. `/api/course` checks the MongoDB entitlement ledger before serving the full course, so refund/dispute webhook updates can revoke access.
8. `/api/stripe-webhook` records unique Stripe events and updates active, refunded, and disputed entitlements in MongoDB.
9. `access.html` can send a six-digit email-code recovery challenge to the Stripe checkout email and issue fresh secure HttpOnly access/account cookies after verification.

## Public Launch Switch

- `LANG5K_PUBLIC_LAUNCH`
  - Leave unset while Lang5K is private preview.
  - Set to `1` only after the owner purchase/refund test and native Russian first-path review are complete.
  - Public checkout also requires `LANG5K_NATIVE_REVIEW_APPROVED=1`; preview checkout still works for owner testing.
  - Admin stays preview-protected even when public launch is enabled.
