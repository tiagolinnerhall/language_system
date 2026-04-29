# Lang5K Phase 1 Professional Upgrade Design

## Goal
Make Lang5K credible as a professional sentence-first language learning product without adding paid infrastructure or requiring API keys in this phase.

## Scope
- Keep the current static HTML/JS architecture and Vercel deployment path.
- Rebrand visible copy consistently as Lang5K.
- Replace overstrong claims with honest positioning: 5,000 well-chosen sentences can build broad daily-life coverage, but fluency still requires active recall, listening, and speaking.
- Add a clear learning method: Learn, Recall, Listen, Cloze, Dictation, Review.
- Improve the landing page so it explains the product, its current Russian status, and the upgrade path to native audio.
- Improve the app with a professional dashboard, mode navigation, audio-quality notice, cloze practice, and dictation practice.
- Add PWA/offline basics and an audio hosting setup guide for Cloudflare R2.

## Architecture
The app remains a static site:
- `index.html` is the product landing page and language selector.
- `app.html` is the learner workspace.
- `languages/config.js` and `languages/russian/*.js` remain the course data source.
- `manifest.webmanifest` and `sw.js` add basic install/offline behavior.
- `docs/audio-r2-setup.md` documents R2 and audio-provider setup without committing secrets.

## Learning Method
The app should guide users toward the fastest practical method:
- Learn high-utility sentences in order.
- Listen and shadow aloud.
- Recall from English to Russian.
- Use cloze to force word-level retrieval.
- Use dictation to train listening.
- Use SRS for long-term retention.

## Out of Scope
- Native audio generation.
- User accounts and cross-device sync.
- Payment/subscription flows.
- Full data migration from arrays to objects.
- Claiming native-speaker verification before it exists.

## Acceptance Criteria
- Landing page says Lang5K, not LangMaster.
- Landing page does not claim native pronunciation while the app uses browser TTS.
- App exposes Browse, Study, Cloze, Dictation, and Review Bin as clear modes.
- App includes an honest audio notice and R2-ready copy.
- Cloze mode hides one target-language word and lets the learner reveal/rate.
- Dictation mode plays audio, accepts typed Russian, and reveals the target sentence.
- Static PWA files exist.
- A smoke test can verify these expected product markers.
