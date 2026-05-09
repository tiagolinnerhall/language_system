# Lang5k Full Audit And Sell-Readiness Report

Date: 2026-05-04
Timezone: Asia/Tbilisi
Target: `D:\Projects\Website\lang5k`
Live spot checks: `https://www.lang5k.com`, `https://audio.lang5k.com`

## Verdict

Status: **Not ready to sell as a finished premium app.**

Lang5k is a credible private-preview Russian sentence trainer. The core learning loop is directionally sound: active recall, reveal, self-rating, spaced review, cloze, dictation, audio, weak-item repair, and a daily plan are present.

It is not sell-ready yet because the business/account layer is still too thin: no real accounts, no cloud progress, no database-backed entitlement ledger, no Stripe webhooks/customer portal, no email-based recovery verification, no production analytics, and no native-speaker sign-off for the full Russian course.

## Cancelled Automation

- Deleted the recurring Codex automation `dental04-website-audit`.
- It was the only matching recurring remote/auto audit found under `C:\Users\tiago\.codex\automations`.
- It was already paused, but it is now deleted.

## Scope Covered

- Public pages: home, pricing, app, checkout, access, contact, attribution, terms, privacy, refund, login, admin.
- API functions: preview login/logout/page gate, admin report, checkout session creation, checkout verification, access-token verification, course delivery, access restore.
- Learning app: demo mode, guided lesson copy, local progress, SRS ratings, review bin, cloze, dictation, backup/restore, audio manifest.
- Course assets: 5,000 Russian rows, attribution, automated QA report, audio manifest, sample hosted audio.
- Deployment/config: Vercel routes, preview gate, robots, sitemap, environment docs, ignored files.
- Browser/runtime checks: local static page checks, live redirect/header/API/audio probes.
- Method evidence: spacing/retrieval and balanced language course references.

## Fixed Now

- Removed hardcoded preview login fallback email/password from `api/admin-preview-login.js`.
- Removed hardcoded preview session fallback from `api/preview-page.js` and `api/admin-report.js`.
- Changed preview/admin access to fail closed with `503` when preview env vars are missing.
- Escaped dynamic admin-report strings in `admin.html` before inserting them into HTML.
- Added smoke-test checks so hardcoded preview fallback secrets cannot silently return.
- Updated `docs/PRODUCTION_ENVIRONMENT.md` with required preview env vars.
- Refreshed Russian automated QA outputs.

## Verification

Commands/checks run:

- `node scripts/smoke-test.mjs` passed.
- `node scripts/validate-access-flow.mjs` passed.
- `node scripts/validate-russian-course.mjs` passed.
- `node scripts/audit-russian-course-quality.mjs` passed: 5,000/5,000 rows, 0 flagged.
- `node scripts/validate-premium-study-order.mjs` passed: first 1,000 early rows screened, 0 risky rows.
- Direct API handler check: `/api/course` demo returns 80 of 5,000 rows.
- Direct preview-login handler check: missing preview env now returns `503`.
- `git diff --check` found no whitespace errors, only existing line-ending warnings.
- Live homepage returns `302` to `/login.html?next=%2F`.
- Live demo API returns `200`, `mode=demo`, `total=5000`, `limit=80`.
- Live audio samples `ru_000001`, `ru_002500`, and `ru_005000` returned `200 audio/mpeg`.

## Evidence References

- Carpenter, Pan, and Butler, 2022, Nature Reviews Psychology: spacing and retrieval practice are strongly supported learning strategies.
  Source: https://www.nature.com/articles/s44159-022-00089-1
- Kim and Webb, 2022, Language Learning: second-language spaced practice meta-analysis supports spaced practice effects.
  Source: https://bibdb.ninjal.ac.jp/bunken/ja/article/112024001639
- Nation, 2007, Four Strands: a balanced language course needs meaning-focused input, meaning-focused output, language-focused learning, and fluency development.
  Source: https://www.tandfonline.com/doi/abs/10.2167/illt039.0

## Findings

### P0 - Do Not Sell Yet: Account And Entitlement Model Is Not Serious Enough

Evidence:
- Progress is stored in browser `localStorage` in `app.html`.
- Paid access token is also stored in browser `localStorage`.
- There is no database customer ledger.
- There is no real login/account model.

Why it matters:
- Paying users can lose progress by changing browser/device.
- Support cannot reliably diagnose access, refunds, churn, usage, or customer state.
- A paid product needs account recovery and entitlement state that survives browser storage loss.

Required before selling:
- Add passwordless account login.
- Store users, purchases, entitlements, progress snapshots, and audit metadata server-side.
- Keep local storage only as a cache/offline convenience.

### P0 - Access Restore Is Unsafe For Paid Launch

Evidence:
- `api/restore-access.js` accepts an email and searches recent Stripe Checkout sessions.
- If it finds a paid session, it issues a new access token directly to the current browser.
- It does not prove the requester controls that email inbox.
- It has no visible rate limiting.

Why it matters:
- Anyone who knows a buyer email could attempt to restore access.
- The endpoint can leak whether an email purchased through different error messages.
- This is not acceptable for a real paid app.

Required before selling:
- Replace direct restore with a magic link or one-time code sent to the paid email.
- Add rate limiting and generic responses.
- Store recovery events in a customer/access ledger.

### P0 - Stripe Is Not Production-Complete

Evidence:
- Checkout creation and checkout-session verification exist.
- There is no Stripe webhook handler.
- There is no customer portal.
- Refund/dispute checks happen by re-checking Stripe on token/course verification, not by maintaining entitlement state.

Why it matters:
- Sales, refunds, disputes, failed payments, cancellations, and customer lifecycle are not operationally clean.
- A real sale needs reliable post-payment automation, not just a one-time browser token.

Required before selling:
- Add Stripe webhooks for checkout completed, refund, dispute, subscription/payment events if subscriptions are used.
- Add customer portal or explicit support workflow for cancellations/refunds.
- Store Stripe customer/session/payment IDs in the database.

### P1 - Course Quality Is Automated-QA Clean But Not Native-Certified

Evidence:
- Automated course QA passed 5,000/5,000 rows.
- The docs still state native-speaker review is not complete.
- The public/pricing copy correctly says native-speaker QA is still being expanded.

Why it matters:
- Corpus-derived sentence pairs can be mechanically valid but still awkward, unnatural, context-poor, too formal, or misleading.
- Premium marketing should not imply native-curated quality until it is reviewed.

Required before selling:
- Native Russian speaker reviews at least the first 1,000 sale-critical rows before paid launch.
- Track approved/edited/rejected sentence IDs.
- Make the first-week course path feel intentionally curated, not just sorted.

### P1 - No Analytics Or Operational Monitoring

Evidence:
- No production analytics/dashboard code was found for activation, lesson starts, session completions, retention, checkout starts, payment success, restore attempts, refunds, support clicks, audio failures, or API errors.

Why it matters:
- You cannot sell responsibly without knowing whether buyers activate, learn, return, fail checkout, or request refunds.

Required before selling:
- Track public funnel events, checkout events, app starts, first-session completion, due-review completion, weak-item repair, return-day retention, restore attempts, and support/refund clicks.
- Add error monitoring for API failures and client runtime errors.

### P1 - Preview Gate Was Too Weak Before This Audit

Evidence:
- The preview login previously had source-code fallback credentials/session values.
- This audit removed those defaults and made preview config fail closed.

Remaining risk:
- The deployed production environment must now contain `LANG5K_PREVIEW_EMAIL`, `LANG5K_PREVIEW_PASSWORD`, and `LANG5K_PREVIEW_SESSION`, or preview pages will intentionally fail closed after deployment.

### P1 - Live Site Lacks Strong Security Headers

Evidence:
- Live header probes showed HSTS.
- They did not show a Content-Security-Policy.
- `access-control-allow-origin: *` appears on static HTML responses.

Why it matters:
- The app stores access tokens in browser storage today, so XSS protection matters more than usual.
- A paid app should ship with a conservative CSP, no unnecessary permissive CORS, and explicit security headers.

Required before selling:
- Add CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and tighter CORS behavior.
- Prefer moving paid access tokens to secure HttpOnly session cookies once accounts exist.

### P2 - Demo API Is Public Even While Pages Are Private Preview

Evidence:
- Live `https://www.lang5k.com/` redirects to preview login.
- Live `https://www.lang5k.com/api/course?lang=russian&mode=demo` returns 80 demo rows publicly.

Why it matters:
- This may be acceptable for a public demo, but it is inconsistent with a fully hidden private preview.

Decision needed:
- Keep public demo API if the goal is teaser/demo access.
- Gate demo API too if the goal is complete pre-launch privacy.

### P2 - Product Method Is Defensible But Incomplete

Evidence:
- The app includes retrieval, reveal, spacing, cloze, dictation, audio, and daily-plan copy.
- It relies on self-rating and has no pronunciation scoring.
- It is mostly sentence-trainer focused, not a complete balanced course.

Why it matters:
- It can be sold honestly as a Russian sentence trainer, not as a complete fluency system.

Required before selling:
- Market it as "Russian sentence recall and listening trainer".
- Do not claim fast fluency.
- Add more meaning-focused input/output, onboarding guidance, and habit/reminder flows.

### P2 - Sales Funnel Is Too Thin

Evidence:
- Pricing exists with one-time R$99 access.
- Checkout page starts Stripe.
- Contact, refund, privacy, terms pages exist.
- There is no proof page, testimonials, sample lesson walkthrough, comparison, FAQ, launch offer framing, or refund/support SLA strong enough for cold traffic.

Required before selling:
- Add a public demo walkthrough.
- Add FAQ covering what it is, what it is not, source quality, refund, device access, audio, no microphone, and expected usage.
- Add trust proof after native QA: number of reviewed rows, audio coverage, sample lessons, attribution, and update policy.

### P3 - Static Architecture Will Limit Growth

Evidence:
- Large app logic lives in one `app.html`.
- API functions are simple serverless files.
- Course chunks are JS modules under `api/_data`.

Why it matters:
- It is okay for private preview, but it will slow serious iteration on accounts, analytics, course QA, testing, subscriptions, and multi-language support.

Strategic fix:
- Move to a small app framework or at least split modules before adding many languages and customer operations.

## What Is Needed To Sell Lang5k

Minimum honest paid beta:

1. Real account login with email magic link or one-time code.
2. Cloud progress sync.
3. Database ledger for users, purchases, entitlements, progress snapshots, support/refund state, and audit events.
4. Stripe webhook handler and customer lifecycle records.
5. Safe access recovery by email proof, not just email lookup.
6. Rate limiting on login, restore, checkout, and token verification routes.
7. Native-speaker review for the first paid path, ideally first 1,000 rows.
8. Honest positioning: "Russian 5K sentence trainer", not "learn Russian fast" or "fluency".
9. Production analytics and error monitoring.
10. Security headers and safer token/session storage.
11. Public FAQ/demo/trust page explaining source data, audio, no microphone, progress, refunds, and limitations.
12. Tested live Stripe purchase and refund flow.

Finished premium product:

1. Everything in paid beta.
2. Full native review workflow for all 5,000 rows.
3. Real course sequencing by level/grammar/utility, not only heuristic sorting.
4. Reminder emails/notifications.
5. Admin dashboard for activation, retention, revenue, refunds, audio failures, course QA, and support.
6. Customer portal.
7. Multi-device progress sync and export.
8. More input/output practice beyond sentence cards.
9. A scalable course-generation/review pipeline before adding more languages.

## Best Product Positioning

Sellable promise:

"Lang5k helps Russian learners practice 5,000 practical sentence pairs with active recall, listening, cloze, dictation, and spaced review."

Avoid:

- "Become fluent fast."
- "Native-level Russian."
- "AI tutor."
- "Complete Russian course."
- "Guaranteed results."

## Can Implement Next Without Tiago

1. Add a sell-readiness checklist page/admin report that tracks every blocker above.
2. Add a public FAQ/trust page.
3. Add stricter security headers in `vercel.json`.
4. Add generic responses and basic throttling for restore/login endpoints.
5. Add a database schema plan and first migration for users, entitlements, progress, and events.
6. Split `app.html` into maintainable modules.

## Needs Tiago

1. Decide whether Lang5k should be sold as paid beta or held until finished premium.
2. Approve account/cloud progress storage.
3. Choose database provider.
4. Provide/approve Stripe live product/price/customer portal setup.
5. Approve refund terms and support response expectations.
6. Arrange native Russian review.
7. Decide whether the demo API should stay public during private preview.

## Loop Status

The local/code audit found and fixed safe preview/admin security issues. Remaining sell-readiness blockers need product decisions, account/database implementation, Stripe production setup, analytics/monitoring, and native-speaker QA before Lang5k should be sold as a serious finished app.
