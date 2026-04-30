# Lang5K Learning Method And Autopilot Audit

Date: 2026-04-30

## Audit Scope

- Public funnel pages: home, pricing, checkout, access, contact, terms, privacy, refund, attribution.
- Learning app flow: browse, guided lesson, review bin, cloze, dictation, audio playback, local progress.
- Backend access APIs: checkout session creation, checkout verification, access token verification, course delivery.
- Course assets: 5,000 Russian sentence rows, attribution, audio manifest, R2-hosted audio expectation.
- Autopilot readiness: whether a learner can arrive, pay, open the course, and know the next learning action without manual planning.

## Evidence Baseline

Lang5K should optimize for:

- Retrieval practice before re-study.
- Spaced review instead of massed repetition.
- Immediate corrective feedback after recall.
- Audio-first listening and shadowing as a pronunciation/listening support, not as the only activity.
- Production practice through cloze and dictation to expose weak forms.

Useful evidence references:

- Kim and Webb, 2022, second-language spaced practice meta-analysis: spacing has a medium-to-large effect, with longer spacing helping delayed retention.
- Bahrick et al., 1993, foreign-language vocabulary maintenance: spaced relearning improved long-term retention across years.
- Nakata and Webb, 2016, vocabulary flashcard review: effective systems support repeated retrieval and spacing between retrievals.
- Shadowing pronunciation review, Oxford ORA: shadowing is useful for listening/pronunciation practice, but it should be paired with recall and feedback.

## Implemented Well

- The course has exactly 5,000 Russian sentence pairs with attribution.
- The app has a guided daily lesson instead of only a browse list.
- The main study loop now forces: listen, immediate recall, reveal, rate.
- Ratings schedule spaced review through a Leitner-style system.
- Cloze and dictation exist as active production drills.
- Full audio coverage is represented through the R2 audio manifest path.
- Payment-to-access flow exists with Stripe Checkout and signed access tokens.

## Fixed In This Pass

- Added an explicit "Autopilot study order" panel before the lesson.
- Missed cards are now automatically saved into the weak review bin.
- Session completion now chooses the next best drill: review bin, dictation, due reviews, or cloze.
- Escaped displayed course and user-entered text in high-risk study/practice templates.
- Expanded smoke tests to guard the new autopilot method markers.
- Added a four-level rating scale for guided review: Again, Hard, Good, Easy.
- Clarified that no microphone is used and that typing is optional in recall, cloze, and dictation.
- Rewrote review and recall cards to explain the exact learner task and why review appears first.
- Added visible drill explanations for why cloze and dictation appear next.
- Added post-drill saved-state feedback so practice does not advance silently.

## Specialist-Agent Verdicts

- Method Specialist: `Partially Appropriate`
- Learner UX Specialist: `Partially Appropriate`
- Course Quality Specialist: `Partially Appropriate`
- Autopilot Specialist: `Partially Appropriate`

### Main reasons

- The core method is now defensible: retrieval before reveal, immediate feedback, spacing, audio support, cloze, and dictation are present.
- The learner flow is much clearer, but still depends on self-rating and does not yet have pronunciation scoring or cloud progress.
- The course still needs native-speaker review, better early-course ordering, and sensitive-content filtering for a stronger premium product.
- The business is not autopilot yet because subscriptions, webhooks, analytics, reminders, and account recovery are still missing.

## Remaining Autopilot Gaps

- Progress is local to the browser. A user who changes device loses history unless we add accounts or cloud sync.
- Access is a 30-day signed token after one-time payment. A serious subscription needs Stripe subscriptions, webhook handling, renewal, cancellation, and customer portal.
- The app does not yet send daily reminders or failed-payment recovery emails.
- There is no server-side analytics for activation, session completion, retention, churn, refunds, or support.
- Pronunciation is self-rated. True pronunciation feedback would need speech recognition and a native/phonetic scoring model.
- Russian text still needs native-speaker review before making strong quality claims.

## Readiness Judgment

Lang5K is now a credible guided sentence-learning product with a defensible study loop. It is stronger than a generic sentence browser and no longer depends on hidden method assumptions.

It is still **not fully professional or fully autopilot yet**. The next highest-leverage work is:

1. Cloud accounts and progress sync.
2. Stripe subscriptions, webhook verification, and customer portal.
3. Reminder/onboarding email automation.
4. Server-side analytics and operational monitoring.
5. Native-speaker QA, safer early-course ordering, and content filtering.
