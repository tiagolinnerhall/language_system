# Lang5K Worklog

This file records the unattended premium-improvement loop so completed work does not get lost between 15-minute runs.

## 2026-05-13

### AI Teacher Access Expiry Gate

Changed:
- Added a client-side `teacherAiAccessBlocked` gate so a server-side 401 from AI Teacher immediately disables live teacher controls.
- Changed expired teacher access copy to tell the user to sign in again or recover access instead of leaving the mic controls visible.
- Added a headless regression for the exact stale/full-looking session case: `courseAccessMode=full` but teacher API access expired.

Why:
- Production logs showed repeated `401` responses from `/api/teacher-chat`. The backend was refusing the current browser session, but the UI could still look like AI Teacher was available because the page still had full-course state from an earlier load/cache.

Verification:
- Ran `node .\scripts\headless-app-flow-check.mjs`.
- Ran `node .\scripts\smoke-test.mjs`.
- Ran `node .\scripts\validate-teacher-router.mjs`.
- Ran `node .\scripts\headless-visual-quality-check.mjs`.
- Ran `node .\scripts\validate-preview-full-access.mjs`.
- Ran `node .\scripts\validate-sell-readiness.mjs`.
- Ran `node .\scripts\validate-safe-local-storage-startup.mjs`.
- Ran `git diff --check`.

Remaining Risk:
- If a browser has an expired preview/full-access session, the user still has to sign in again or recover access. The UI now says that directly instead of presenting live teacher controls.

### Strongest Teacher Model Defaults

Changed:
- Changed every AI Teacher chat route to choose the premium reasoning model tier by default instead of keeping any cheaper fast-chat fallback.
- Set the built-in teacher chat default to `gpt-5.5` for both fast and premium paths.
- Upgraded live microphone transcription default from `gpt-4o-mini-transcribe` to `gpt-4o-transcribe`.

Why:
- The user explicitly chose quality over cost for the live teacher. The teacher should not downgrade model quality during normal lesson conversation or Russian speech handling.

Verification:
- Ran `node .\scripts\validate-teacher-router.mjs`.
- Ran `node .\scripts\smoke-test.mjs`.
- Ran `node --check .\api\_lib\teacher-chat.js`.
- Ran `node .\scripts\headless-app-flow-check.mjs`.
- Ran `node .\scripts\headless-visual-quality-check.mjs`.
- Ran `git diff --check`.
- Confirmed Vercel production env contains `LANG5K_TEACHER_PREMIUM_MODEL`, `LANG5K_TEACHER_MODEL`, `LANG5K_TEACHER_FAST_MODEL`, and `LANG5K_TRANSCRIBE_MODEL`.

Remaining Risk:
- This increases OpenAI cost per live-teacher turn and transcription request. It improves quality, but bad physical microphone audio can still produce bad transcripts.

### Live Teacher Recall Classifier And Premium Model Routing

Changed:
- Tightened Russian spoken-recall detection so a tiny fragment with only weak overlap, such as `Окей, но мы`, is not treated as a valid answer attempt.
- Added local handling for short Russian fragments so the teacher asks for a complete attempt or question instead of judging the student too early.
- Routed Live Teacher, Autopilot, and active study AI replies to the premium teacher model by default instead of waiting for the message to look difficult.
- Added a headless regression that rejects the bad fragment while still accepting a real partial Russian answer like `скажи пожалуйста`.
- Updated progress guard validators so they preserve full-course paid progress indexes when a paid user lands on a demo-limited page, while still checking backup restore sanitization.

Why:
- A premium live teacher must not mistake fragments, teacher/self echo, or hesitation for a real recall attempt. The model also needs to be reserved for reasoning-heavy teacher behavior during live study, not just after the app detects an obvious hard case.

Verification:
- Confirmed `node .\scripts\headless-app-flow-check.mjs` failed before the recall fix on `Окей, но мы` being treated as `Heard:`.
- Ran `node .\scripts\headless-app-flow-check.mjs`.
- Ran every `node .\scripts\validate-*.mjs` validator.
- Ran `node .\scripts\headless-visual-quality-check.mjs`.
- Ran `node .\scripts\smoke-test.mjs`.
- Ran `node --check .\api\_lib\teacher-chat.js`.
- Ran `node --check .\api\_lib\teacher-voice.js`.
- Ran `node --check .\api\_lib\http.js`.
- Ran `node --check .\scripts\headless-app-flow-check.mjs`.
- Ran `git diff --check`.

Remaining Risk:
- Real microphone quality still depends on the learner's browser, microphone permission, and provider transcription quality. Headless tests verify routing and regression behavior, not the user's physical microphone.

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

### Restored Daily Goal Sync

Changed:
- Added a shared daily-goal sync helper so restored/sanitized `userStats.dailyGoal` updates the active in-memory study goal immediately.
- Called the sync after stored-progress normalization and after progress-backup import, before the study UI re-renders.
- Added `scripts/validate-restored-daily-goal-sync.mjs` to keep backup restore and startup normalization aligned with the current guided lesson target.

Why:
- Progress restore already sanitized and saved the learner's daily goal, but the active session could keep using the old in-memory goal until reload. A self-running premium study flow should apply restored coaching preferences immediately, especially after moving progress between devices.

Verification:
- Confirmed `node scripts/validate-restored-daily-goal-sync.mjs` failed before the app change with `Missing function syncDailyGoalFromStats`.
- Ran `node scripts/validate-restored-daily-goal-sync.mjs`.
- Ran `node scripts/validate-progress-backup-guardrails.mjs`.
- Ran `node scripts/validate-progress-stat-caps.mjs`.
- Ran `node scripts/validate-safe-local-storage-startup.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `e4f71dc fix: sync restored daily study goal`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic restore/startup state sync covered by the new validator and adjacent backup/local-storage checks. A future browser pass should import a backup with a non-default daily goal and confirm the guided lesson picker updates without reload.

### Learned Sentences Clear Weak Practice

Changed:
- Updated manual learned marking so a sentence is removed from the weak-practice bin when the learner marks it learned.
- Persisted the weak-practice cleanup immediately and refreshed the visible review-bin badge.
- Added `scripts/validate-learned-clears-weak-practice.mjs` to guard the cleanup order inside `toggleLearned()`.

Why:
- The coached plan should not send learners back to repair a sentence they just marked complete. Leaving learned sentences in weak practice could inflate the review-bin count and make the product feel less self-running and less trustworthy.

Verification:
- Confirmed `node scripts/validate-learned-clears-weak-practice.mjs` failed before the app change with `Marking a sentence learned must remove it from weak practice.`
- Ran `node scripts/validate-learned-clears-weak-practice.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-active-review-summary.mjs`.
- Ran `node scripts/validate-study-rating-lock.mjs`.
- Ran `node scripts/validate-practice-rating-lock.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `250b80a fix: clear weak practice when learned`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic local progress cleanup covered by the new static validator and adjacent weak-practice/study-flow checks. A future browser pass should mark a weak sentence learned from Browse and confirm the Review Bin count drops immediately.

### Active Review Summary Count

Changed:
- Updated the guided-session summary so "sentences in active review" excludes sentences already marked learned.
- Added `scripts/validate-active-review-summary.mjs` to guard the summary against counting every SRS record as active review.

Why:
- The dashboard already defines active review as SRS cards that are not learned. The session summary used the raw SRS record count, which could make a learner think completed Box 5 sentences still needed active review and reduce trust in the coached progress feedback.

Verification:
- Confirmed `node scripts/validate-active-review-summary.mjs` failed before the app change with `Study summary must count only non-learned SRS cards as active review.`
- Ran `node scripts/validate-active-review-summary.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-study-rating-lock.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `fix: align active review summary count`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic summary math covered by the new validator and adjacent guided-study checks. A future browser pass should complete a guided session with at least one learned Box 5 sentence and confirm the visible active-review count matches the dashboard.

### Standalone Practice Rating Guard

Changed:
- Added a one-rating lock for standalone cloze and dictation practice cards.
- Reset the lock when each practice card renders and when its answer is revealed.
- Required cloze/dictation cards to be revealed before `ratePractice()` can save SRS, weak-bin, carry-message, or next-card side effects.
- Added `scripts/validate-practice-rating-lock.mjs` to guard the lifecycle and side-effect order.

Why:
- Cloze and dictation are now part of the coached follow-up path after guided study. A premium self-running flow should tolerate impatient double clicks without saving the same practice card twice, moving SRS dates twice, or skipping the next recommended card.

Verification:
- Confirmed `node scripts/validate-practice-rating-lock.mjs` failed before the app change with `Standalone practice must track whether the current card has accepted a rating.`
- Ran `node scripts/validate-practice-rating-lock.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-study-rating-lock.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-study-streak-after-rating.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `69d8fe3 fix: prevent duplicate practice ratings`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic click-guard logic covered by the new static validator and adjacent study/practice validators. A future browser pass should rapidly double-click a cloze or dictation rating and confirm only one rating is saved and one next card is rendered.

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

### Strict First Guided Session Restore

Changed:
- Tightened `sanitizeProgressBackupStats()` so `completedFirstGuidedSession` is restored only when the backup/local progress value is a real boolean.
- Added `scripts/validate-first-session-flag-guard.mjs` to prevent regressions back to truthy coercion.

Why:
- The coached first-session gate should not be bypassed by malformed restored progress such as `"false"`, `"yes"`, or `1`. A self-running premium learner path needs corrupted progress to fail closed into the guided study flow, not unlock advanced tools early.

Verification:
- Confirmed `node scripts/validate-first-session-flag-guard.mjs` failed before the app change with `First guided session flag must not coerce truthy backup values.`
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran `node scripts/validate-progress-backup-guardrails.mjs`.
- Ran `node scripts/validate-safe-local-storage-startup.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-progress-stat-caps.mjs`.
- Ran `node scripts/validate-truthy-progress-maps.mjs`.
- Ran `node scripts/validate-srs-restore-date-window.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-local-study-dates.mjs`.
- Ran `node scripts/validate-due-review-priority.mjs`.
- Ran `node scripts/validate-audio-status-notice.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `1dab3ea fix: guard first guided session restore`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic progress sanitization covered by static guards and flow validators. A future browser pass should restore a backup with string-valued `completedFirstGuidedSession` and confirm advanced tools stay hidden until a real guided lesson is completed.

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

### Safe Error Message Rendering Guard

Changed:
- Escaped learner-facing course-load exception messages and paid-access API messages before rendering them into `app.html`.
- Added `scripts/validate-safe-error-rendering.mjs` to prevent raw error text from being injected into `innerHTML` on access and load failure paths.

Why:
- Premium access and startup failures should be calm, safe, and recoverable. API or exception text can contain unexpected markup, and the learner-facing app should not render that markup as HTML when explaining the next access step.

Verification:
- Confirmed `node scripts/validate-safe-error-rendering.mjs` failed before the app change with `Language loading errors must not inject raw exception messages into innerHTML.`
- Ran `node scripts/validate-safe-error-rendering.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-progress-backup-guardrails.mjs`.
- Ran `node scripts/validate-safe-local-storage-startup.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran `node scripts/validate-progress-stat-caps.mjs`.
- Ran `node scripts/validate-truthy-progress-maps.mjs`.
- Ran `node scripts/validate-srs-restore-date-window.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-local-study-dates.mjs`.
- Ran `node scripts/validate-due-review-priority.mjs`.
- Ran `node scripts/validate-audio-status-notice.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `2517449 fix: escape learner error messages`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic escaping on error/access paths covered by the new static guard. A future browser pass should force a course API error containing markup and confirm the page displays the literal text without layout regressions.

### Safe Browse Course Rendering Guard

Changed:
- Escaped browse-mode category names, Russian sentence text, transliteration, and English meaning before inserting course rows into `innerHTML`.
- Hardened inline handler escaping so generated `onclick` attributes stay valid if course/category text contains HTML-sensitive characters or quotes.
- Added `scripts/validate-safe-course-rendering.mjs` to keep browse course text aligned with the safer study/practice rendering paths.

Why:
- The guided study and practice cards already render course text defensively, but the browse list still trusted course strings directly. A premium self-running language product should tolerate imported or generated course text without turning unexpected markup into page HTML.

Verification:
- Confirmed `node scripts/validate-safe-course-rendering.mjs` failed before the app change with `Browse rendering must not inject raw course text into innerHTML: ${catName}`.
- Ran `node scripts/validate-safe-course-rendering.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-progress-backup-guardrails.mjs`.
- Ran `node scripts/validate-safe-local-storage-startup.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-safe-error-rendering.mjs`.
- Ran `node scripts/validate-audio-status-notice.mjs`.
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran `node scripts/validate-progress-stat-caps.mjs`.
- Ran `node scripts/validate-truthy-progress-maps.mjs`.
- Ran `node scripts/validate-srs-restore-date-window.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-local-study-dates.mjs`.
- Ran `node scripts/validate-due-review-priority.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `1ecc0b8 fix: escape browse course rendering`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic string escaping covered by the new static guard and existing flow validators. A future browser pass should load the browse view with course text containing quotes and markup-like characters to confirm visual spacing remains unchanged.

### New Card Rating Guidance Alignment

Changed:
- Updated the new-card recall screen so it no longer tells first-pass learners to use an Easy rating that is intentionally unavailable for new cards.
- Added `scripts/validate-new-card-rating-guidance.mjs` to keep the new-card guidance aligned with the existing Good cap, hidden Easy button, and Easy-to-Good clamp.

Why:
- The first guided lesson should feel coached and self-consistent. New cards already stop at Good on the first pass so they stay close in review, but the pre-reveal copy still mentioned Easy. That mismatch could make beginners think a control was missing or that the rating rules were inconsistent.

Verification:
- Confirmed `node scripts/validate-new-card-rating-guidance.mjs` failed before the app change with `New-card recall guidance must not mention Easy before first-pass rating.`
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-safe-course-rendering.mjs`.
- Ran `node scripts/validate-safe-error-rendering.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `00b12d4 fix: align new card rating guidance`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic copy in the new-card recall step and is covered by the new static guard plus guided-flow validators. A future browser pass should start a fresh guided lesson and confirm the new guidance fits cleanly on mobile.

### Duplicate Study Rating Guard

Changed:
- Added a one-rating lock to guided study cards so repeated clicks or taps during the short post-rating transition cannot count the same card twice.
- Reset the lock when a guided session starts, when each study card renders, and when the answer is revealed.
- Added `scripts/validate-study-rating-lock.mjs` to keep the rating side effect order guarded before stats, SRS scheduling, or repair insertion can run.

Why:
- A premium self-running study flow should tolerate impatient double taps without corrupting daily counts, SRS dates, weak-practice scheduling, or the current card position.

Verification:
- Confirmed `node scripts/validate-study-rating-lock.mjs` failed before the app change with `Study mode must track whether the current card has already accepted a rating.`
- Ran `node scripts/validate-study-rating-lock.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `95fdc6a fix: prevent duplicate study ratings`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic event-handler guard covered by the new static validator and adjacent study-flow checks. A future browser pass should rapidly double-click a rating button on a revealed study card and confirm the card advances once with one stats increment.

### Study Streak Earned After Rating

Changed:
- Moved guided-study streak credit out of session start and into the first accepted card rating.
- Added `scripts/validate-study-streak-after-rating.mjs` so starting or abandoning a lesson cannot count as real study progress.

Why:
- A self-running premium study flow should only reward actual saved learning work. Previously, opening a guided lesson could increment the streak before the learner rated any card, which made progress feedback less trustworthy.

Verification:
- Confirmed `node scripts/validate-study-streak-after-rating.mjs` failed before the app change with `Starting a guided lesson must not count the study streak before any rating is saved.`
- Ran `node scripts/validate-study-streak-after-rating.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-study-rating-lock.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `b694c4a fix: count study streak after rating`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic streak timing covered by the new static validator and adjacent guided-flow checks. A future browser pass should start a lesson, exit before rating, and confirm the visible streak does not increase until a rating is saved.

### Today Plan Available New Count

Changed:
- Updated the home Today plan summary so "New sentences planned today" counts actual available new cards from the curated study order instead of only echoing the remaining daily goal.
- Added `scripts/validate-today-plan-available-new-count.mjs` to keep the home CTA from advertising unavailable new-card work when the learner has no fresh cards left.

Why:
- A self-running premium study flow should not send a learner into a guided lesson that immediately bounces back because the daily goal says work remains but the course has no eligible new cards. The plan now reflects real due reviews, available new cards, and weak-practice repair more accurately.

Verification:
- Confirmed `node scripts/validate-today-plan-available-new-count.mjs` failed before the app change with `Today plan must calculate the remaining daily new-card budget.`
- Ran `node scripts/validate-today-plan-available-new-count.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-active-review-summary.mjs`.
- Ran `node scripts/validate-study-rating-lock.mjs`.
- Ran `node scripts/validate-practice-rating-lock.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `f72ec99 fix: count available new cards in today plan`

Remaining Risk:
- No browser session was opened in this run; the changed surface is deterministic home-plan logic covered by the new static validator and adjacent guided-flow checks. A future browser pass should simulate a nearly complete course with no eligible new cards and confirm the home CTA moves to weak repair or browse instead of starting an empty guided lesson.

### Practice Ratings Count Study Streak

Changed:
- Updated standalone cloze and dictation ratings so saved practice progress updates and refreshes the daily study streak, matching guided-lesson ratings.
- Added `scripts/validate-practice-streak-after-rating.mjs` to guard that practice ratings count only after SRS progress is saved and before the next practice card renders.

Why:
- A premium self-running study loop should reward all real saved learning work consistently. Previously, cloze and dictation could save SRS progress without making the visible streak reflect that the learner studied.

Verification:
- Confirmed `node scripts/validate-practice-streak-after-rating.mjs` failed before the app change with `Practice rating must count toward the study streak after progress is saved.`
- Ran `node scripts/validate-practice-streak-after-rating.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-study-streak-after-rating.mjs`.
- Ran `node scripts/validate-practice-rating-lock.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-active-review-summary.mjs`.
- Ran `node scripts/validate-today-plan-available-new-count.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `6d6b2c9 fix: count practice ratings in study streak`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic rating-side-effect order covered by the new static validator and adjacent practice/study-flow checks. A future browser pass should rate one cloze or dictation card and confirm the streak display increments immediately.

### Study Ratings Require Reveal

Changed:
- Added a guarded state check so guided-study ratings are ignored unless the current card has been revealed and still exists in the queue.
- Added `scripts/validate-study-rating-reveal-guard.mjs` to keep stale, premature, or duplicate guided-rating calls from saving progress before reveal.
- Updated `scripts/validate-study-rating-lock.mjs` so the existing duplicate-rating lock guard accepts the stronger combined revealed-card guard.

Why:
- A premium self-running study flow should not rely only on visible button timing for progress safety. Ratings now require the learner to complete the listen/recall/reveal step before SRS, streak, stats, or repair scheduling side effects can run.

Verification:
- Confirmed `node scripts/validate-study-rating-reveal-guard.mjs` failed before the app change with `Study ratings must require a revealed current card and reject stale or duplicate rating calls.`
- Ran `node scripts/validate-study-rating-reveal-guard.mjs`.
- Ran `node scripts/validate-study-rating-lock.mjs`.
- Ran `node scripts/validate-study-streak-after-rating.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran `node scripts/validate-active-review-summary.mjs`.
- Ran `node scripts/validate-today-plan-available-new-count.mjs`.
- Ran `node scripts/validate-practice-rating-lock.mjs`.
- Ran `node scripts/validate-practice-streak-after-rating.mjs`.

Pushed Commit:
- `1d6fff6 fix: guard study ratings before reveal`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic guided-rating state guard covered by the new static validator and adjacent guided-flow checks. A future browser pass should start a guided lesson, reveal a card, rate it once, and confirm normal progression still feels clean on mobile.

### Weak Bin Reveal Before Remove

Changed:
- Updated the weak-practice bin so the checkmark cannot remove a sentence while its text is still hidden.
- Changed the remove tooltip from a learned claim to a reveal-first expectation.
- Added `scripts/validate-weak-bin-reveal-before-remove.mjs` to keep weak-bin cleanup aligned with recall-before-clear guardrails.

Why:
- A self-running premium study flow should not let a learner clear weak practice without first revealing and self-checking the sentence. The previous tooltip also implied Lang5K knew the sentence was learned even though no rating was saved.

Verification:
- Confirmed `node scripts/validate-weak-bin-reveal-before-remove.mjs` failed before the app change with `Weak-bin remove control must not claim a sentence is learned without a rating.`
- Ran `node scripts/validate-weak-bin-reveal-before-remove.mjs`.
- Ran `node scripts/validate-weak-practice-recovery.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `8496590 fix: require reveal before weak bin removal`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic DOM guard covered by the new static validator and adjacent weak-practice checks. A future browser pass should open a weak-bin card, click remove before reveal to confirm the coaching alert, then reveal and remove successfully.

### Coach-First Browse Shortcut Gate

Changed:
- Hid the Today plan "Browse all sentences" shortcut while coach-first mode is active.
- Added `scripts/validate-coach-first-browse-gate.mjs` to keep first-session learners on one clear guided action while preserving browsing after the first guided session.

Why:
- The first-session copy says advanced sentence tools stay out of the way, and the browse tab is already hidden, but the Today plan still exposed a browse shortcut. Removing that shortcut during coach-first mode makes the early product flow more self-running and less ambiguous.

Verification:
- Confirmed `node scripts/validate-coach-first-browse-gate.mjs` failed before the app change with `Coach-first Today plan must conditionally hide the browse shortcut.`
- Ran `node scripts/validate-coach-first-browse-gate.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.

Pushed Commit:
- `749ef91 fix: gate browse shortcut in coach-first plan`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic first-session button render covered by the new static validator. A future browser pass should clear local progress, load the app, and confirm the Today plan shows only the guided lesson action before the first guided session, then restores Browse after completion.

### Coach-First Primary Lesson Action

Changed:
- Forced the Today plan primary CTA to stay on `Start guided lesson` while coach-first mode is active.
- Added `scripts/validate-coach-first-primary-action.mjs` so the first-session plan cannot route learners into Browse or weak-practice repair as the main action before a real guided session is completed.

Why:
- Coach-first mode already hides advanced tabs and the secondary Browse shortcut, but the primary plan button still used the general plan summary. If the learner had no planned new cards or had weak sentences waiting, the first-session CTA could point away from the guided lesson despite the copy saying advanced tools stay out of the way.

Verification:
- Confirmed `node scripts/validate-coach-first-primary-action.mjs` failed before the app change with `Coach-first Today plan must force the primary action back to the guided lesson.`
- Ran `node scripts/validate-coach-first-primary-action.mjs`.
- Ran `node scripts/validate-coach-first-browse-gate.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran `node scripts/validate-today-plan-available-new-count.mjs`.
- Ran `node scripts/validate-study-rating-reveal-guard.mjs`.
- Ran `node scripts/validate-study-rating-lock.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `8d5774a fix: force coach-first primary lesson action`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic first-session CTA render covered by the new validator and adjacent guided-flow checks. A future browser pass should seed a state with coach-first mode active plus no planned new cards or weak sentences present, then confirm the visible primary CTA still starts Study.

### Coach-First Sentence Browser Gate

Changed:
- Replaced the full sentence browser list with a short guided-session unlock prompt while coach-first mode is active.
- Added `scripts/validate-coach-first-browser-list-gate.mjs` so first-session learners cannot be exposed to the full browse list before one real guided lesson is completed.

Why:
- Recent coach-first changes hid the browse tab and shortcuts, but the full sentence list still rendered underneath the guided plan. That contradicted the coached-product promise that advanced sentence tools stay out of the way during the first session.

Verification:
- Confirmed `node scripts/validate-coach-first-browser-list-gate.mjs` failed before the app change with `Coach-first browse mode must gate the full sentence list.`
- Ran `node scripts/validate-coach-first-browser-list-gate.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-coach-first-browse-gate.mjs`.
- Ran `node scripts/validate-coach-first-primary-action.mjs`.
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `3f4320b fix: gate coach-first sentence browser`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic render guard covered by the new static validator and adjacent coach-first checks. A future browser pass should clear local progress, load the app, and confirm the sentence list is replaced by the unlock prompt until a guided session is saved.

### Coach-First Weak Practice Action Gate

Changed:
- Kept the Study start screen from offering the weak-practice shortcut while coach-first mode is still active.
- Added `scripts/validate-coach-first-study-start-weak-gate.mjs` so restored or unusual first-session states cannot expose the review bin before one real guided lesson is completed.

Why:
- Recent coach-first work hid Browse and the full sentence list, but the Study start fallback could still route a first-session learner into weak practice if no due or new cards were available. That contradicted the coached-product promise that advanced repair tools stay out of the way until a guided session is saved.

Verification:
- Confirmed `node scripts/validate-coach-first-study-start-weak-gate.mjs` failed before the app change with `Study start must know when coach-first mode is active.`
- Ran `node scripts/validate-coach-first-study-start-weak-gate.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-coach-first-browse-gate.mjs`.
- Ran `node scripts/validate-coach-first-primary-action.mjs`.
- Ran `node scripts/validate-coach-first-browser-list-gate.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `3bb42cf fix: gate coach-first weak practice action`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic Study start render guard covered by the new validator and adjacent coach-first checks. A future browser pass should seed coach-first mode with weak-practice items and no due/new cards, then confirm Study does not expose the review-bin action before the first guided session is completed.

### Coach-First Done Fallback Gate

Changed:
- Kept the Study start "all done" fallback from pointing first-session learners back to Browse while coach-first mode is still active.
- Added `scripts/validate-coach-first-study-start-done-gate.mjs` so unusual first-session states with no available cards return to the guided plan instead of an advanced sentence surface.

Why:
- Browsing was already gated, but the fallback button still said `Back to Browse`. That was low-risk technically, but it contradicted the coached-product promise that first-session learners should stay inside the guided path until a real lesson is completed.

Verification:
- Confirmed `node scripts/validate-coach-first-study-start-done-gate.mjs` failed before the app change with `Coach-first done fallback must return learners to the guided plan instead of Browse.`
- Ran `node scripts/validate-coach-first-study-start-done-gate.mjs`.
- Ran `node scripts/validate-coach-first-study-start-weak-gate.mjs`.
- Ran `node scripts/validate-coach-first-browser-list-gate.mjs`.
- Ran `node scripts/validate-coach-first-primary-action.mjs`.
- Ran `node scripts/validate-coach-first-browse-gate.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.

Pushed Commit:
- `d4577c9 fix: keep coach-first done fallback guided`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic Study start fallback covered by the new static validator and adjacent coach-first checks. A future browser pass should seed coach-first mode with no due/new cards and confirm the fallback button says `Back to guided plan` and scrolls to the Today plan.

### Coach-First Review Bin Function Gate

Changed:
- Added a function-level coach-first guard to `toggleBinView()` so stale handlers or restored UI state cannot open the weak-practice review bin before one real guided lesson is completed.
- Added `scripts/validate-coach-first-bin-view-gate.mjs` to keep the review-bin surface gated at the render boundary, not only hidden through navigation and CTA state.

Why:
- Recent coach-first work hid the Review Bin tab and weak-practice shortcuts, but the review-bin function itself could still render the advanced repair surface if invoked directly. A premium coached first session should keep the learner in the guided plan until the app has saved a real guided lesson.

Verification:
- Confirmed `node scripts/validate-coach-first-bin-view-gate.mjs` failed before the app change with `Review bin view must check coach-first mode before rendering.`
- Ran `node scripts/validate-coach-first-bin-view-gate.mjs`.
- Ran `node scripts/validate-coach-first-study-start-done-gate.mjs`.
- Ran `node scripts/validate-coach-first-study-start-weak-gate.mjs`.
- Ran `node scripts/validate-coach-first-browser-list-gate.mjs`.
- Ran `node scripts/validate-coach-first-primary-action.mjs`.
- Ran `node scripts/validate-coach-first-browse-gate.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `db0e8ef fix: gate coach-first review bin view`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic function guard covered by the new static validator and adjacent coach-first checks. A future browser pass should seed coach-first mode with weak-practice items and confirm a stale review-bin handler returns the learner to the guided plan instead of showing bin cards.

### Coach-First Practice View Function Gates

Changed:
- Added function-level coach-first guards to `showClozeView()` and `showDictationView()` so stale handlers cannot open advanced practice views before one real guided lesson is completed.
- Added `scripts/validate-coach-first-practice-view-gates.mjs` to keep Cloze and Dictation gated at the render boundary, matching the Review Bin guard.

Why:
- The tabs were already hidden during coach-first mode, but the functions could still render advanced drills if invoked directly. A premium coached first session should keep learners inside the guided path until the app has saved a real guided lesson.

Verification:
- Confirmed `node scripts/validate-coach-first-practice-view-gates.mjs` failed before the app change with `showClozeView must check coach-first mode before rendering.`
- Ran `node scripts/validate-coach-first-practice-view-gates.mjs`.
- Ran `node scripts/validate-coach-first-bin-view-gate.mjs`.
- Ran `node scripts/validate-coach-first-study-start-done-gate.mjs`.
- Ran `node scripts/validate-coach-first-study-start-weak-gate.mjs`.
- Ran `node scripts/validate-coach-first-browser-list-gate.mjs`.
- Ran `node scripts/validate-coach-first-primary-action.mjs`.
- Ran `node scripts/validate-coach-first-browse-gate.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran `node scripts/validate-neutral-coach-tone.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `a183001 fix: gate coach-first practice views`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic function guard covered by the new static validator and adjacent coach-first checks. A future browser pass should seed coach-first mode and confirm direct Cloze or Dictation invocations return to the guided plan instead of opening advanced practice cards.

### Coach-First Autopilot Next-Step Gate

Changed:
- Added a coach-first guard inside `getAutopilotNextStep()` so the session-summary recommendation cannot point first-session learners into Review Bin, Dictation, or Cloze before a real guided lesson is completed.
- Added `scripts/validate-coach-first-autopilot-next-step-gate.mjs` to keep the summary recommendation boundary aligned with the existing coach-first view and action gates.

Why:
- The summary renderer currently marks a real guided session complete before asking for the next recommendation, but the recommendation function itself still assumed that caller order. A premium coached first session is safer if every advanced-drill recommendation point enforces the same first-session rule directly.

Verification:
- Confirmed `node scripts/validate-coach-first-autopilot-next-step-gate.mjs` failed before the app change with `Autopilot next step must check coach-first mode before recommending advanced drills.`
- Ran `node scripts/validate-coach-first-autopilot-next-step-gate.mjs`.
- Ran `node scripts/validate-coach-first-practice-view-gates.mjs`.
- Ran `node scripts/validate-coach-first-bin-view-gate.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `4c34058 fix: gate coach-first autopilot next step`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic recommendation guard covered by the new static validator and adjacent coach-first checks. A future browser pass should seed coach-first mode and force a summary recommendation path to confirm the next-step card returns to the guided plan instead of exposing advanced drills.

### Premium Risk Lexicon Guardrail Expansion

Changed:
- Expanded the premium guided-order risk lexicon in `app.html` so adjacent harsh or awkward early-course terms such as killed, murder, dying, suicide, sexy, and demon receive the same late-course penalty as existing risk terms.
- Aligned `scripts/validate-premium-study-order.mjs` and `scripts/build-russian-5k-from-tatoeba.mjs` with the expanded lexicon.
- Added `scripts/validate-premium-risk-lexicon.mjs` to verify the app and study-order validator catch the same risk examples and keep matched rows out of the first 1000 guided rows.

Why:
- The current premium ordering already pushed obvious harsh terms later, but the lexicon missed close variants that can still make the early Russian course feel less practical and neutral. Strengthening the guardrail is low-risk and improves the coached-product promise without editing course content or changing access, pricing, or legal copy.

Verification:
- Confirmed `node scripts/validate-premium-risk-lexicon.mjs` failed before the app change with `App premium risk lexicon must catch early-course risk example: He was killed.`
- Ran `node scripts/validate-premium-risk-lexicon.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `3538e8b fix: expand premium risk lexicon`

Remaining Risk:
- This pass changes guided-order scoring and validation only; it does not remove any source sentence from the course. A future course QA pass should review whether risky rows should remain late-course material, receive a content warning, or be excluded from paid course data entirely.

### Coach-First Keyboard Browse Gate

Changed:
- Added a coach-first guard to the global keyboard handler so Space, ArrowDown, and ArrowUp cannot play hidden browse-list sentences before one real guided lesson is completed.
- Added `scripts/validate-coach-first-keyboard-browse-gate.mjs` to keep the keyboard shortcut boundary aligned with the existing coach-first browse, tab, and advanced-practice gates.

Why:
- The browse list was already visually gated during coach-first mode, but the global keyboard shortcuts bypassed the render boundary and could still speak sentence-list items. A premium first session should keep the learner inside the guided plan until Lang5K has saved a real guided lesson.

Verification:
- Confirmed `node scripts/validate-coach-first-keyboard-browse-gate.mjs` failed before the app change with `Coach-first mode must gate browse-list keyboard shortcuts before they can speak sentence-list items.`
- Ran `node scripts/validate-coach-first-keyboard-browse-gate.mjs`.
- Ran `node scripts/validate-coach-first-browser-list-gate.mjs`.
- Ran `node scripts/validate-coach-first-primary-action.mjs`.
- Ran `node scripts/validate-coach-first-browse-gate.mjs`.
- Ran `node scripts/validate-coach-first-practice-view-gates.mjs`.
- Ran `node scripts/validate-coach-first-bin-view-gate.mjs`.
- Ran `node scripts/validate-coach-first-study-start-done-gate.mjs`.
- Ran `node scripts/validate-coach-first-study-start-weak-gate.mjs`.
- Ran `node scripts/validate-coach-first-autopilot-next-step-gate.mjs`.
- Ran `node scripts/validate-guided-study-flow.mjs`.
- Ran `node scripts/validate-first-session-flag-guard.mjs`.
- Ran `node scripts/validate-new-card-rating-guidance.mjs`.
- Ran `node scripts/smoke-test.mjs`.
- Ran `node scripts/validate-access-flow.mjs`.
- Ran `node scripts/validate-russian-course.mjs`.
- Ran `node scripts/validate-premium-study-order.mjs`.
- Ran app.html inline script parse-check with Node `vm.Script`.

Pushed Commit:
- `bfc9a0e fix: gate coach-first keyboard browsing`

Remaining Risk:
- No browser session was opened in this run; the changed surface is a deterministic keyboard guard covered by the new static validator and adjacent coach-first checks. A future browser pass should seed coach-first mode, press ArrowDown/ArrowUp/Space on the browse home, and confirm the page stays on the guided plan without playing hidden browse sentences.

### AI Teacher Autopilot Decision Loop and Progress Archive

Changed:
- Converted AI Teacher Autopilot guidance from a local scripted guide into a server-model decision request. Autopilot now sends the full student/app context to `/api/teacher-chat`, including current screen, current card, typed attempt, spoken recall transcript, due reviews, weak cards, ratings, session counts, and access state.
- Kept the local `teacherGuideLocal()` only as fallback/safety behavior when the AI endpoint is unavailable.
- Allowed custom AI teacher replies to use the premium `/api/teacher-voice` TTS path instead of falling back immediately to the browser voice.
- Strengthened the server teacher prompt so Autopilot must infer the next best step for that exact student and answer Russian/language/Lang5K doubts naturally while staying in scope.
- Added Mongo-backed `progress_archives` history for logged-in full-access progress. Each overwrite archives the previous snapshot, and stale client saves are recorded as conflicts instead of overwriting newer server progress.
- Updated the browser sync path to restore the newer server snapshot when a stale-save conflict is returned.
- Anti-flaw follow-up: replaced negative-keyword-only teacher scope with positive language/Lang5K scope plus hard off-topic denials, routed spoken doubts/navigation questions through AI before local command handling, added Autopilot cooldown/dedupe/action caps, and removed silent scripted fallback when the AI Autopilot request fails.
- Anti-flaw follow-up: dynamic premium TTS now requires a short-lived signed `voiceToken` generated by `/api/teacher-chat`, with additional preview/IP daily caps.
- Anti-flaw follow-up: progress saves now accept larger full-course payloads, include active in-session state, archive with retention, expose authenticated archive detail/restore including stale-conflict restore, and use stale-safe `clientUpdatedAt` guards so older tabs cannot overwrite newer server progress.

Why:
- A premium teacher mode should not feel like a hardcoded button narrator. The AI teacher needs the full state and must decide the next safe study action from the student’s actual performance.
- Logged-in learner progress needs a recoverable server history so a stale tab, failed device, or accidental overwrite does not destroy the only copy.

Verification:
- Ran `node scripts\headless-app-flow-check.mjs`.
- Ran `node scripts\smoke-test.mjs`.
- Ran `node scripts\validate-teacher-discoverability.mjs`.
- Ran `node scripts\validate-preview-full-access.mjs`.
- Ran `node scripts\validate-sell-readiness.mjs`.
- Ran `node scripts\validate-teacher-router.mjs`.
- Ran `node scripts\headless-visual-quality-check.mjs`.
- Ran `git diff --check`.

Remaining Risk:
- Progress archive restore is available in MongoDB history and stale-save self-recovery is automatic, but there is not yet a learner-facing “restore older version” screen.

### Live AI Teacher Continuous Listening

Changed:
- Replaced press-to-talk teacher controls with an opt-in Live Teacher mode. Starting Autopilot now starts the live mic, shows a visible listening state, and keeps speech recognition active until the student pauses listening or stops Teacher Mode.
- Added browser speech-recognition auto-restart while Live Teacher remains on, because browsers can end recognition after pauses.
- Added Pause/Resume listening controls and updated disclosure copy: audio is not stored, useful transcripts plus lesson context may be sent to the AI teacher, and silence/filler is ignored.
- Added `teacherLiveListening` to AI context and cloud active-session progress so the teacher and progress sync know whether the student was in live-teacher mode.
- Updated headless tests to simulate `SpeechRecognition`, prove Start Live Teacher enables continuous listening, and prove filler/silence such as “um” does not send an AI request.

Why:
- The intended product behavior is a real teacher-like Autopilot: the student should not need to press a button for every sentence or doubt. Live listening must still be explicit, visible, pausable, and cost-controlled.

Verification:
- Ran `node scripts\validate-teacher-router.mjs`.
- Ran `node scripts\headless-app-flow-check.mjs`.
- Ran `node scripts\smoke-test.mjs`.
- Ran `node scripts\validate-teacher-discoverability.mjs`.
- Ran `node scripts\validate-sell-readiness.mjs`.
- Ran `node scripts\validate-preview-full-access.mjs`.
- Ran `node scripts\headless-visual-quality-check.mjs`.
- Ran `git diff --check`.

Remaining Risk:
- Continuous browser speech recognition still depends on the browser and microphone permission. The app now restarts recognition while Live Teacher is on, but Chrome or the OS can still interrupt microphone access.
- The app does not send AI requests for silence/filler, but real background speech can still produce transcripts. The teacher remains language/Lang5K scoped server-side.

### Learner Cloud Progress History Restore

Changed:
- Added a learner-facing Cloud history tool inside the app advanced tools area for full-access users.
- The panel loads authenticated cloud progress archives, shows the current revision, archived revisions, stale-device conflict copies, and progress summaries.
- Added restore actions for archived revisions and conflict copies. Restoring applies the selected version locally, refreshes the visible learner state, saves it as the newest cloud progress through `/api/progress`, and tracks `progress_archive_restored`.
- Synced restored `userStats.dailyGoal` back into the active daily goal so a restored snapshot does not leave the session using the old local goal.
- Added a persistent Cloud history entry beside the progress bar so recovery remains visible in coach-first mode and after an accidental empty/early overwrite.
- Tightened progress persistence around server-side revisions: normal saves now require a matching `baseRevision`, stale saves are archived as recoverable conflicts, and restore writes are forced through a dedicated server path instead of the normal stale-save path.
- Restores now target an exact archive id, while archive metadata responses avoid returning full archived progress bodies.
- Local reset no longer uploads an empty cloud reset on load or pagehide; it clears this browser only.
- Updated teacher progress-recovery guidance to point paid learners to Cloud history and access recovery.

Why:
- Server-side progress archives already existed, but a paying learner had no visible recovery path if a stale tab or wrong device replaced progress. A premium product needs recoverable progress without owner intervention.

Verification:
- Confirmed `node .\scripts\smoke-test.mjs` and `node .\scripts\validate-sell-readiness.mjs` failed before the app change on the missing `Cloud history` marker.
- Ran `node .\scripts\smoke-test.mjs`.
- Ran `node .\scripts\validate-sell-readiness.mjs`.
- Ran `node .\scripts\headless-app-flow-check.mjs`.
- Ran `node .\scripts\validate-teacher-router.mjs`.
- Ran `node .\scripts\validate-teacher-discoverability.mjs`.
- Ran `node .\scripts\validate-preview-full-access.mjs`.
- Ran `node .\scripts\headless-visual-quality-check.mjs`.
- Ran `node .\scripts\validate-access-flow.mjs`.
- Ran `node .\scripts\validate-russian-course.mjs`.
- Ran `node .\scripts\validate-premium-study-order.mjs`.
- Ran `node .\scripts\validate-audio-manifest-alignment.mjs`.
- Ran `node --check .\api\_lib\store.js`.
- Ran `node --check .\api\progress.js`.
- Ran `git diff --check`.
- Ran a secret-marker scan for OpenAI, Stripe, and Resend key patterns.
- Ran three read-only anti-flaw specialist passes and fixed the reported blockers around reset upload, exact archive targeting, forced restore writes, access recovery links, coach-first visibility, mobile panel bounds, non-technical copy, and teacher recovery guidance.
- Ran a second read-only anti-flaw loop after fixes; the security and UX passes reported no blockers, and the remaining app pass findings were fixed before the final headless/static verification.

Remaining Risk:
- Cloud restore still depends on the browser holding a valid full-access session and the Mongo-backed `/api/progress` endpoint being reachable. If the session expires, the learner must log in again before restoring.

### Live Teacher Human Response And Anti-Flaw Loop

Changed:
- Made Live Teacher answer simple presence checks like “hi, are you listening?” locally with a direct human-style acknowledgement instead of routing them to the AI planner.
- Added Russian/Cyrillic listening checks such as “привет” and “ты меня слышишь” so they are not mistaken for recall attempts.
- Kept real language/course questions AI-backed, but strengthened the teacher prompt so greetings and live-teacher status questions are answered naturally and briefly instead of dumping a fixed study script.
- Added pause/stop voice commands for Live Teacher and corrected the mic UI so a failed mic start cannot remain displayed as active.
- Added dynamic speech-recognition language switching: English for general guidance, Russian during new-sentence shadowing, recall, cloze, and dictation.
- Added protection against the teacher hearing its own spoken reply and treating that audio as the learner’s recall.
- Added local handling for new-sentence shadowing so spoken repetition is acknowledged as shadowing, not sent to the AI or counted as recall.
- Queued learner questions spoken while the AI teacher is already thinking, instead of silently dropping them.
- Broadened server-side teacher scope so Cyrillic Russian questions and translation questions with ordinary words like “weather” are allowed, while unrelated weather/news/etc. questions remain refused.

Why:
- The teacher must behave like a real language teacher: present, interruptible, able to hear natural questions, and strict about the learning method without feeling like a hardcoded script.

Verification:
- Ran `node .\scripts\smoke-test.mjs`.
- Ran `node .\scripts\validate-teacher-router.mjs`.
- Ran `node .\scripts\validate-teacher-discoverability.mjs`.
- Ran `node .\scripts\validate-sell-readiness.mjs`.
- Ran `node .\scripts\validate-preview-full-access.mjs`.
- Ran `node .\scripts\validate-audio-status-notice.mjs`.
- Ran `node .\scripts\validate-audio-manifest-alignment.mjs`.
- Ran `node .\scripts\validate-russian-course.mjs`.
- Ran `node .\scripts\validate-premium-study-order.mjs`.
- Ran `node .\scripts\headless-app-flow-check.mjs`.
- Ran `node .\scripts\headless-visual-quality-check.mjs`.
- Ran `node --check .\api\_lib\teacher-chat.js`.
- Ran `git diff --check`.
- Ran a secret-marker scan for OpenAI, Stripe, and Resend key patterns.
- Ran read-only anti-flaw specialist passes; fixed the reported blockers around mic state, pause/stop, language switching, echo capture, Cyrillic questions, off-topic translation vocabulary, shadowing, and busy-question loss.

Remaining Risk:
- Browser speech recognition remains browser/OS dependent. Live Teacher now detects failed starts and restarts for language changes, but microphone permission and recognition quality are still controlled by the user’s browser.

### Live Teacher Activation Stability

Changed:
- Blocked the first automatic AI action when Live Teacher is turned on, so pressing Start Live Teacher can listen and advise without briefly jumping to another screen.
- Replaced the one-slot busy-state teacher queue with a FIFO queue so two quick student questions while the teacher is thinking are answered in order instead of overwriting each other.
- Added Russian meta-question detection during recall, so phrases like “привет что значит пожалуйста” route to the AI teacher instead of being mistaken for a recall attempt.

Why:
- A real teacher should not grab navigation immediately on activation, lose student questions, or treat a Russian language question as an answer attempt.

Verification:
- Confirmed `node .\scripts\headless-app-flow-check.mjs` failed before the fix on activation auto-navigation.
- Ran `node .\scripts\smoke-test.mjs`.
- Ran `node .\scripts\validate-teacher-router.mjs`.
- Ran `node .\scripts\validate-teacher-discoverability.mjs`.
- Ran `node .\scripts\validate-sell-readiness.mjs`.
- Ran `node .\scripts\headless-app-flow-check.mjs`.
- Ran `node .\scripts\validate-preview-full-access.mjs`.
- Ran `node .\scripts\headless-visual-quality-check.mjs`.
- Ran `node --check .\api\_lib\teacher-chat.js`.
- Ran `git diff --check`.
- Ran a secret-marker scan for OpenAI, Stripe, and Resend key patterns.

Remaining Risk:
- Live listening still depends on browser speech-recognition quality and microphone permission. The app now handles the routing and queueing issues once the browser provides a transcript.

### Live Teacher Mic, Voice, And Human Scope Repair

Changed:
- Added a transcription mode on `/api/teacher-chat?transcribe=1` so Live Teacher can send short microphone segments for AI transcription without adding another Vercel serverless function.
- Live Teacher now starts a server-backed mic recorder when available, keeps browser speech recognition as a supplemental path, and fully resets stale recognizers after terminal mic errors.
- Fixed the old recognizer `onend` race so language switching cannot detach a newer active listener.
- Changed mic UI from optimistic “listening” to “starting/requesting” until a real mic path is active, and updated card copy so it does not claim the teacher is listening when the mic is off.
- Removed robotic browser TTS fallback for teacher voice. If premium AI voice is unavailable, the teacher stays text-only instead of speaking with a robotic voice.
- Removed robotic browser TTS fallback for Russian target audio. If hosted/native audio is missing, still loading, mismatched, blocked, or errored, the app shows a controlled unavailable state instead of speaking synthetic Russian.
- Loosened the teacher scope so normal learner frustration, confusion, small lesson-related conversation, paid-access questions, refund/privacy/support questions, and ordinary off-focus chatter reach the AI teacher for a human-style answer/refocus instead of the old “I can only help” wall.
- Kept hard protection for risky unrelated content tasks such as business-plan/crypto/legal/medical writing requests.
- Updated privacy and in-app disclosure to say short audio segments may be sent for transcription and are not stored by Lang5K.
- Improved teacher voice provider fallback so an OpenAI voice failure can still try ElevenLabs when configured.

Why:
- A premium “real teacher” experience cannot pretend the mic is active, lose spoken questions, switch to robotic voices, or refuse normal student conversation. Failures now become visible text states, and live listening has an owned transcription path.

Verification:
- Confirmed `node .\scripts\headless-app-flow-check.mjs` failed before implementation on the missing server mic path.
- Ran `node .\scripts\smoke-test.mjs`.
- Ran `node .\scripts\validate-teacher-router.mjs`.
- Ran `node .\scripts\validate-teacher-discoverability.mjs`.
- Ran `node .\scripts\validate-sell-readiness.mjs`.
- Ran `node .\scripts\validate-preview-full-access.mjs`.
- Ran `node .\scripts\headless-app-flow-check.mjs`.
- Ran `node .\scripts\headless-visual-quality-check.mjs`.
- Ran `node --check .\api\_lib\http.js`.
- Ran `node --check .\api\_lib\teacher-chat.js`.
- Ran `node --check .\api\_lib\teacher-voice.js`.
- Ran `git diff --check`.
- Ran a secret-marker scan for OpenAI, Stripe, and Resend key patterns.
- Ran three read-only specialist audits for mic recognition, premium audio, and teacher scope; fixed the reported blockers in this pass.

Remaining Risk:
- Headless tests can prove routing, fallback, and UI states, but they cannot prove real microphone recognition quality for every browser/OS. Real Chrome microphone permission and provider transcription quality still need a manual buyer-style test after deployment.
- Live Teacher transcription uses the configured OpenAI key. If billing, key permissions, or provider availability fail, the app now shows a text status instead of pretending the mic worked.

### Live Teacher Listening And Startup Simplification

Changed:
- Hid learner chrome and the teacher panel during boot so the app no longer flashes Browse/loading before settling into the guided Study screen.
- Replaced the duplicated three-button teacher panel with one live-teacher toggle plus Next step, while keeping the question input for typed questions.
- Changed server microphone recording from sliced WebM fragments to short complete recorder segments, so each transcription upload is a valid audio file instead of a middle fragment of a long recording.
- Suppressed confusing transcription-unavailable noise after a recent successful transcript and replaced internal outage copy with simple teacher fallback guidance.
- Treated repeated greetings/status checks like “hi, hi, hi” as live-teacher conversation, not recall attempts.
- Routed natural student doubts like “I don’t know” to the teacher instead of marking them as spoken recall.
- Removed the remaining audio-status copy that implied robotic browser speech fallback for missing hosted audio.

Why:
- The previous flow could look like it was listening while later mic chunks failed transcription, could classify normal student speech as an answer attempt, and exposed too many teacher controls for a premium buyer experience.

Verification:
- Confirmed `node .\scripts\headless-app-flow-check.mjs` failed before fixes on startup boot state and on “I don’t know” being treated as recall.
- Ran `node .\scripts\headless-app-flow-check.mjs`.
- Ran `node .\scripts\smoke-test.mjs`.
- Ran `node .\scripts\validate-teacher-router.mjs`.
- Ran `node .\scripts\validate-teacher-discoverability.mjs`.
- Ran `node .\scripts\validate-audio-status-notice.mjs`.
- Ran `node .\scripts\validate-sell-readiness.mjs`.
- Ran `node .\scripts\validate-preview-full-access.mjs`.
- Ran `node .\scripts\validate-russian-course.mjs`.
- Ran `node .\scripts\validate-premium-study-order.mjs`.
- Ran `node .\scripts\validate-audio-manifest-alignment.mjs`.
- Ran `node .\scripts\headless-visual-quality-check.mjs`.
- Ran `node --check .\api\_lib\teacher-chat.js`.
- Ran `node --check .\api\_lib\teacher-voice.js`.
- Ran `git diff --check`.
- Ran a secret-marker scan for OpenAI, Stripe, and Resend key patterns.
- Tested the production transcription endpoint with an authenticated preview session and generated WAV/WebM speech; both returned transcript text.

Remaining Risk:
- Fresh subagent audit sessions could not run because the Codex usage limit rejected them. The same checks were covered locally with headless regression tests and manual code review.
- Headless tests still cannot prove the user’s physical microphone quality, but the app now sends valid complete audio segments and has a verified production transcription endpoint.
