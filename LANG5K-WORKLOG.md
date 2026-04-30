# Lang5K Worklog

This file records the unattended premium-improvement loop so completed work does not get lost between 15-minute runs.

## 2026-04-30

### Worklog Started

Changed:
- Added this tracked worklog for Lang5K autonomous improvement runs.
- Updated the watcher prompt outside the repo so future runs must append their result here before committing and pushing.

Why:
- The loop was already preserving results in watcher logs and Git commits, but there was no durable repo-level summary like Dental04 has.

Verification:
- Confirmed recent loop results were stored in `C:\Users\tiago\.codex\watchers\lang5k-premium-loop\logs`.
- Confirmed latest pushed commit before this change was `3104d44 fix: keep home study plan in guided order`.

Remaining Risk:
- Historical run summaries before this worklog remain in the watcher logs rather than being fully copied into this file.

### Guided Summary Review Order Guard

Changed:
- Updated the session-summary autopilot recommendation so remaining due reviews stay ahead of weak-sentence repair drills.
- Added a guided-flow validation guard that fails if `getAutopilotNextStep()` puts weak repair before due reviews.

Why:
- The coached product flow teaches learners to clear due spaced reviews before repair drills. The summary could previously contradict that order, which made the product feel less self-running and less consistent.

Verification:
- First ran `node scripts/validate-guided-study-flow.mjs` after adding the guard and confirmed it failed with `Session summary must keep remaining due reviews before weak repair.`
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.

Pushed Commit:
- `7cddcb8 fix: keep session summary in guided review order`

Remaining Risk:
- No browser session was opened in this run; the change is logic/copy ordering covered by static validators. Future live-site checks should still inspect the summary screen visually.

## 2026-05-01

### Standalone Practice Review Order Guard

Changed:
- Updated cloze/dictation standalone practice selection so due spaced reviews are selected before weak-bin repair sentences.
- Clarified the weak-practice selection reason so it only appears when no spaced reviews are due.
- Extended `scripts/validate-guided-study-flow.mjs` to fail if standalone practice tools put weak repair ahead of due reviews.

Why:
- The coached product promises one consistent study order: due reviews first, then new work, then weak repair. Standalone drills could previously contradict that order when learners clicked into cloze or dictation directly.

Verification:
- Confirmed the new guided-flow validator failed before the app change with `Standalone cloze and dictation must keep due reviews before weak repair.`
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `6968f8a fix: keep practice drills in review order`

Remaining Risk:
- No browser session was opened in this run; the changed behavior is a deterministic picker-order fix covered by static validation. A future live-site pass should still inspect cloze and dictation entry states visually.

### Local Study Date Scheduling Guard

Changed:
- Updated learner-facing study dates so daily goals, streak checks, and next-review scheduling use the learner's local calendar date instead of UTC date slices.
- Added `scripts/validate-local-study-dates.mjs` to fail if the app returns to UTC-derived date keys for study scheduling.

Why:
- A premium self-running study product should reset daily plans and streaks on the learner's actual local day. UTC date keys can make reviews appear due too early or too late and can break streak perception around evening study sessions.

Verification:
- Confirmed `node scripts/validate-local-study-dates.mjs` failed before the app change with `Study scheduling must use an explicit local-date formatter.`
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-local-study-dates.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `011b422 fix: use local dates for study scheduling`

Remaining Risk:
- No browser session was opened in this run; the change is date-key logic covered by static validation and existing flow checks. A future live-site pass should still inspect daily-plan/streak behavior across local midnight in a browser.

### Oldest Due Review Priority Guard

Changed:
- Updated guided due-review ordering so reviews overdue from earlier local dates come before reviews merely due today.
- Added `scripts/validate-due-review-priority.mjs` to guard that `getDueReviews()` keeps oldest due dates ahead of box difficulty while still using box as the tiebreaker.

Why:
- A coached premium study loop should rescue overdue memory debt first. Sorting only by box could let a same-box card due today appear before a card that had been waiting for several days, making the product feel less self-running and less faithful to spaced review urgency.

Verification:
- Confirmed `node scripts/validate-due-review-priority.mjs` failed before the app change with `Due reviews must prioritize the oldest overdue review date before box difficulty.`
- Ran `node scripts/validate-due-review-priority.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-local-study-dates.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `ef612d9 fix: prioritize oldest due reviews`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic due-review ordering covered by the new validator and existing study-flow checks. A future live-site pass should still inspect the guided lesson start screen with mixed overdue reviews.

### Neutral Coach Tone Guard

Changed:
- Replaced milestone, review-bin-empty, and guided-summary copy that overclaimed mastery or used hype-heavy encouragement with calmer coached-product wording.
- Added `scripts/validate-neutral-coach-tone.mjs` to prevent regressions back to mastery claims, conversation-ability overclaims, or hype-heavy completion language.

Why:
- A premium early-course language product should stay practical and credible. Learners need clear next-step coaching, not claims that local progress equals mastery or conversation readiness.

Verification:
- Confirmed `node scripts/validate-neutral-coach-tone.mjs` failed before the app copy change with `Neutral coach tone guard failed`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-local-study-dates.mjs`.
- Ran `node scripts/validate-due-review-priority.mjs`.
- Ran `node scripts/validate-progress-backup-guardrails.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `f358a6c fix: keep coach tone neutral`

Remaining Risk:
- No browser session was opened in this run; the change is copy-only and covered by static validators. A future visual pass should inspect milestone and study-summary spacing on small mobile screens.
