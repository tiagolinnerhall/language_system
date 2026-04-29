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
5. If Stripe says the session is complete and paid, Lang5K stores `lang5k_access_token` in browser local storage.
6. `app.html` uses that token to request the full 5,000-sentence course from `/api/course`.
7. `/api/course` re-checks Stripe before serving the full course, so refunded, disputed, or unpaid sessions cannot keep using a stale browser token.
