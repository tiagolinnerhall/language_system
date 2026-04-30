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
