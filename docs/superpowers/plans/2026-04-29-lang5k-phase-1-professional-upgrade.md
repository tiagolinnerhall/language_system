# Lang5K Phase 1 Professional Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade Lang5K into a more credible static language-learning product with stronger method, UX, and deployment readiness.

**Architecture:** Keep the current static app. Add small focused static assets and tests while editing `index.html` and `app.html` in place.

**Tech Stack:** Plain HTML, CSS, JavaScript, browser localStorage, Web Speech API, service worker, Node.js smoke test.

---

### Task 1: Add Product Smoke Test

**Files:**
- Create: `scripts/smoke-test.mjs`

- [ ] Add a Node script that reads `index.html`, `app.html`, `manifest.webmanifest`, `sw.js`, and `docs/audio-r2-setup.md`.
- [ ] Check for required product markers: Lang5K branding, honest browser-audio copy, Cloze mode, Dictation mode, PWA manifest, and R2 setup docs.
- [ ] Run `node scripts/smoke-test.mjs` before implementation and expect it to fail because the new markers are not present.

### Task 2: Upgrade Landing Page

**Files:**
- Modify: `index.html`

- [ ] Replace LangMaster branding with Lang5K.
- [ ] Replace the absolute 98% claim with a more defensible explanation.
- [ ] Add a professional method section covering sentence-first learning, active recall, SRS, cloze, dictation, and future native audio.
- [ ] Make Russian status honest: 3,600 current sentences, path to 5,000.

### Task 3: Upgrade App Workspace

**Files:**
- Modify: `app.html`

- [ ] Add mode tabs for Browse, Study, Cloze, Dictation, and Review Bin.
- [ ] Add a progress dashboard with learned, active review, due, and course-size metrics.
- [ ] Add audio quality notice that browser TTS is temporary and R2 native audio is planned.
- [ ] Keep all existing Browse, Study, Review Bin, PDF, and localStorage behavior.

### Task 4: Add Cloze and Dictation Modes

**Files:**
- Modify: `app.html`

- [ ] Add cloze queue selection using due/new/random sentence choices.
- [ ] Hide a useful target-language word, let users reveal the answer, and rate Again/Good into SRS.
- [ ] Add dictation mode with play, typed answer, reveal, and SRS rating.
- [ ] Reuse the current Web Speech API until R2 audio exists.

### Task 5: Add PWA and R2 Docs

**Files:**
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `docs/audio-r2-setup.md`

- [ ] Add manifest metadata for installability.
- [ ] Cache core static files and Russian data files.
- [ ] Document the local secret names for Cloudflare R2 and ElevenLabs without committing actual keys.

### Task 6: Verify

**Files:**
- Read: all changed files

- [ ] Run `node scripts/smoke-test.mjs` and require pass.
- [ ] Serve the site locally and inspect key pages in a browser.
- [ ] Confirm no API keys or secrets were committed.
