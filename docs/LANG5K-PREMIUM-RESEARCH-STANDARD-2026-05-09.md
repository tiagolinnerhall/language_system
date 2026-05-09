# Lang5K Premium Research Standard

Generated: 2026-05-09

## Evidence Standard

Lang5K should be measured against these principles:

- Retrieval before reveal.
- Corrective feedback after the learner attempts recall.
- Spacing across sessions, plus delayed same-session recall before leaving a new item.
- Review debt control before adding too much new material.
- Weak-item repair and focused practice modes.
- Real audio and optional speaking/shadowing practice without pretending to grade pronunciation unless a real speech engine is active.
- Clear daily plan and next-review state.
- Course rows reviewed for usefulness, naturalness, level, register, and sensitive content before public premium claims.

## Product Benchmark

- Duolingo Practice Hub: focused practice options for mistakes, listening, speaking, stories/radio, and personalized review.
- Busuu: short focused lessons, placement, topic-based course structure, study plan, smart review, and native/community feedback.
- Memrise: real native speaker videos, useful phrases, AI conversation practice, and immersion beyond flashcards.
- Babbel: speech-recognition support where available and guided speaking practice.
- Anki FSRS: modern SRS uses estimated forgetting/retention instead of only simple boxes.

## Implemented In Lang5K

- Guided session planner now throttles new material when review debt is high.
- New sentences now receive immediate recall and delayed same-session recall.
- Delayed same-session recall now requires an actual gap and no longer double-promotes long-term SRS.
- Practice after a session uses recently studied sentences before introducing unseen ones.
- Spaced review stores interval, ease, repetitions, lapses, and recent modes.
- Weak sentences go to reveal-and-rate repair practice instead of manual clearing.
- Optional local shadow recording lets learners compare their voice against audio without upload or fake scoring.
- Demo and full-course learner states now show access context inside Study.
- Checkout verification and webhooks validate Lang5K product metadata and Stripe price before granting access.
- Public checkout is gated until native Russian review approval is explicitly enabled.
- Headless visual quality checks cover desktop/mobile/compact study and reveal states, pricing, and recovery.

## Still Owner-Blocked

- Native Russian sign-off for the first 250-1000 paid-path rows.
- Live Stripe purchase, recovery, refund, and webhook test.
- Resend sender/API values for real recovery email delivery.
- Public launch decision.

## Sources

- Nature Reviews Psychology: `https://www.nature.com/articles/s44159-022-00089-1`
- Duolingo Practice Hub: `https://blog.duolingo.com/guide-to-duolingo-practice-hub/`
- Busuu overview: `https://help.busuu.com/hc/en-us/articles/15936615354641-What-is-Busuu`
- Busuu courses/review: `https://www.busuu.com/en/it-works/courses`
- Memrise homepage: `https://www.memrise.com/en-us/`
- Babbel speech recognition: `https://support.babbel.com/hc/en-us/articles/19211305815570-Speech-recognition`
- Anki FSRS docs: `https://docs.ankiweb.net/deck-options`
