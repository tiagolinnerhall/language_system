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

### In-App Audio Readiness Notice

Changed:
- Added a learner-visible audio status notice inside `app.html` that reports when hosted audio is ready for the visible course and explains that browser speech keeps practice moving if hosted files are unavailable.
- Added `scripts/validate-audio-status-notice.mjs` to guard the app shell, styling, status copy, and refresh hooks.

Why:
- A premium coached product should make critical lesson infrastructure visible inside the study workspace. Learners should not have to infer whether audio is loaded, unavailable, or still safe to practice with.

Verification:
- Confirmed `node scripts/validate-audio-status-notice.mjs` failed before the app change with `App shell must reserve space for learner-visible audio status.`
- Ran `node scripts/validate-audio-status-notice.mjs`.
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
- Opened `http://127.0.0.1:4175/app.html?lang=russian&demo=1` in Playwright, injected sample course rows because the simple static server does not serve Vercel API routes, and verified the notice rendered on desktop and mobile with no horizontal overflow.

Pushed Commit:
- `d00f807 feat: show in-app audio readiness`

Remaining Risk:
- The browser check used a local static server with injected sample course rows; the only observed console error was the expected `/api/course` 404 from not running Vercel serverless routes locally. A future live deployment check should confirm the notice against the real `/api/course` response and production audio manifest.

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

### Restored Stats Backup Guard

Changed:
- Added `sanitizeProgressBackupStats()` so imported progress backups sanitize study stats before saving them to local storage.
- Extended `scripts/validate-progress-backup-guardrails.mjs` to require safe restore handling for daily goals, daily counters, streak counters, guided-session completion, and study dates.

Why:
- A premium self-running study product should not let a malformed or stale backup distort the guided plan with impossible daily goals, invalid streaks, or bad calendar dates. Restore already sanitized learned rows, weak-bin rows, and SRS data; user stats needed the same guardrail.

Verification:
- Confirmed `node scripts/validate-progress-backup-guardrails.mjs` failed before the app change with `Progress restore must sanitize user stats before saving.`
- Ran `node scripts/validate-progress-backup-guardrails.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-local-study-dates.mjs`.
- Ran `node scripts/validate-due-review-priority.mjs`.
- Ran `node scripts/validate-audio-status-notice.mjs`.
- Ran app.html inline script parse-check with `node --check` on the extracted script.

Pushed Commit:
- `89ee706 fix: sanitize restored study stats`

Remaining Risk:
- No browser session was opened in this run; the changed surface is import/restore validation covered by the new static guard and the existing flow checks. A future browser pass should manually import a deliberately malformed backup and inspect the alert plus restored daily-goal state.

### Capped Restored Progress Stats

Changed:
- Added `scripts/validate-progress-stat-caps.mjs` to guard against restored progress backups importing impossible daily counters or streak counters.
- Updated `sanitizeProgressBackupStats()` so `todayNew` and `todayReviews` are capped to the loaded course size, while `currentStreak` and `longestStreak` are capped to 3,650 days.

Why:
- A coached, self-running study product should not let a malformed backup make today's guided lesson look finished, inflate review history, or create unrealistic streak state. Restore already sanitized IDs, SRS dates, and daily-goal choices; restored counters needed bounded values too.

Verification:
- Confirmed `node scripts/validate-progress-stat-caps.mjs` failed before the app change with `User stats restore must cap impossible backup stats: const maxDailyCount=SENTENCES.length;`.
- Ran `node scripts/validate-progress-stat-caps.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-progress-backup-guardrails.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `7bbb5cb fix: cap restored progress stats`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic restore sanitization covered by static validators. A future browser pass should import a backup with very large stats and confirm the restored plan display remains realistic.

### Safe Local Progress Startup

Changed:
- Added `readLocalJsonObject()` so malformed localStorage progress JSON no longer crashes the app before the learner can reach the guided lesson.
- Added `normalizeStoredProgress()` after course load so stored learned rows, review-bin rows, SRS data, and study stats are sanitized against the loaded course before the UI renders.
- Added `scripts/validate-safe-local-storage-startup.mjs` to prevent regressions back to direct startup parsing or unsanitized stored progress.

Why:
- A self-running premium study product should recover cleanly from corrupted browser storage instead of leaving learners on a broken app shell. The app already had restore sanitizers for imported backups; startup storage now gets the same protective path.

Verification:
- Confirmed `node scripts/validate-safe-local-storage-startup.mjs` failed before the app change with `Startup must not parse localStorage directly`.
- Ran `node scripts/validate-safe-local-storage-startup.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-progress-backup-guardrails.mjs`.
- Ran `node scripts/validate-progress-stat-caps.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-local-study-dates.mjs`.
- Ran `node scripts/validate-due-review-priority.mjs`.
- Ran `node scripts/validate-audio-status-notice.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `259380e fix: recover from bad local progress storage`

Remaining Risk:
- No browser session was opened in this run; the changed surface is startup state recovery and is covered by the new static guard plus the existing flow validators. A future browser pass should seed malformed localStorage values and confirm the app opens to the guided lesson without a visible error.

### Truthy Progress Map Guard

Changed:
- Updated progress-map sanitization so learned and weak-practice maps keep only active `true` rows, while inactive `false` rows are dropped instead of being kept as counted keys.
- Added `scripts/validate-truthy-progress-maps.mjs` to prevent regressions that would let false-valued backup or local-storage rows inflate learned or weak-sentence counts.

Why:
- The guided product relies on accurate counts to choose and explain the next study step. A malformed backup or local entry such as `{ "42": false }` could previously survive sanitization and make the app overstate learned progress or weak-practice debt.

Verification:
- Confirmed `node scripts/validate-truthy-progress-maps.mjs` failed before the app change with `Progress maps must only keep active true rows: if(source[key]===true){`.
- Ran `node scripts/validate-truthy-progress-maps.mjs`.
- Ran `node scripts/validate-progress-backup-guardrails.mjs`.
- Ran `node scripts/validate-safe-local-storage-startup.mjs`.
- Ran `node scripts/validate-progress-stat-caps.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-local-study-dates.mjs`.
- Ran `node scripts/validate-due-review-priority.mjs`.
- Ran `node scripts/validate-audio-status-notice.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `0fe6a49 fix: ignore inactive progress map rows`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic backup/startup sanitization covered by static guards. A future browser pass should import a backup containing false-valued learned and review-bin rows and confirm the dashboard counts stay realistic.

### Restored SRS Date Window Guard

Changed:
- Added `clampBackupSrsDate()` so imported or locally normalized SRS rows cannot keep impossible review dates far beyond the app's real scheduling window.
- Updated SRS restore sanitization to clamp `nextReview` to at most 31 days from the learner's current local date and reject future `lastReview` values.
- Added `scripts/validate-srs-restore-date-window.mjs` to guard the restored SRS date-window behavior.

Why:
- A malformed backup with a syntactically valid date like `2099-01-01` could hide due reviews from the guided lesson for years. A self-running premium study product should recover that state into a realistic review schedule instead of silently losing the learner's review queue.

Verification:
- Confirmed `node scripts/validate-srs-restore-date-window.mjs` failed before the app change with `Missing function clampBackupSrsDate`.
- Ran `node scripts/validate-srs-restore-date-window.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-progress-backup-guardrails.mjs`.
- Ran `node scripts/validate-progress-stat-caps.mjs`.
- Ran `node scripts/validate-safe-local-storage-startup.mjs`.
- Ran `node scripts/validate-truthy-progress-maps.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-local-study-dates.mjs`.
- Ran `node scripts/validate-due-review-priority.mjs`.
- Ran `node scripts/validate-audio-status-notice.mjs`.
- Ran app.html inline script parse-check with `new Function()` over extracted inline scripts.

Pushed Commit:
- `a2a5cd6 fix: clamp restored srs review dates`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic restore/startup sanitization covered by the new static guard and existing flow validators. A future browser pass should import a backup with a far-future `nextReview` and confirm the guided lesson shows the restored review within the normal schedule.
