# Lang5k Status Report

Updated: 2026-05-04
Timezone used: Asia/Tbilisi

## Bottom Line

No tracked Lang5k code changes or commits were made on 2026-05-01. The latest committed Lang5k work happened on 2026-04-30.

The project is closer to sellable infrastructure after the 2026-05-04 account/access hardening pass, but it is still not finished premium product shape until production environment variables, live Stripe webhook testing, and native Russian review are complete.

## What Was Actually Done Recently

- Added a private preview login gate.
- Added a simple owner/admin report surface.
- Added `admin-status.json` as a machine-readable owner status file.
- Tightened the guided study flow in `app.html`.
- Added same-session repair so `Again` and `Hard` cards can return later in the same session.
- Unified guided study, cloze, and dictation around `Again`, `Hard`, `Good`, and `Easy`.
- Added Russian course QA checks for question punctuation.
- Fixed Vercel preview routing and preview asset handling.
- Added cloud progress sync endpoints backed by the configured server database.
- Added customer entitlement storage hooks for checkout/webhook events.
- Kept access recovery manual through support to avoid adding an email provider.
- Added analytics event ingestion.
- Added stronger security headers and HttpOnly access/account cookies.

## Evidence

Recent commits:

- `47e5326` - `fix: include preview assets in vercel functions`
- `f52716c` - `fix: route preview gate before static files`
- `5cd95e3` - `fix: gate preview pages with vercel rewrites`
- `d512305` - `fix: enforce Russian question punctuation QA`
- `79f861a` - `feat: add private preview gate and admin report`
- `037842f` - `feat: tighten premium guided study flow`
- `3a0a432` - `feat: strengthen premium study path and recovery`

Current report file:

- `admin-status.json`

Current untracked local items:

- `LANG5K-STATUS-REPORT.md`
- `.serena/` local tooling folder only.

## What Is Still Missing

- Stronger QA and curation for the first 1,000 Russian sentences.
- Reminder automation.
- A better owner dashboard with real operating metrics.
- Production environment configuration for MongoDB, Stripe webhook, and live checkout.
- Live end-to-end Stripe checkout, webhook, refund, and progress-sync testing.

## Practical Next Fix

The next product slice should be production configuration plus live end-to-end payment/account testing. Native Russian review remains the main content-quality blocker.
