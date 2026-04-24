# Lang5K — Professional Upgrade Roadmap

> From hobby project to top-tier language learning platform.
> What tools you need to give Claude to make this happen.

---

## CURRENT STATE: 4/10

Lang5K has a solid foundation (sentence-based SRS, review bin, PDF export, multi-language architecture) but lacks the features that separate a hobby project from a product people pay for. Here's the gap analysis and exactly what's needed.

---

## TIER 1: CRITICAL (Must-Have for Launch)

### 1.1 Native Speaker Audio Recordings
**Why:** Browser TTS is the single biggest quality gap. Russian pronunciation (stress, palatalization, vowel reduction) cannot be faked by TTS. Every serious competitor (Glossika, Pimsleur) uses native recordings.

**What you need to give me:**
- Access to **ElevenLabs API** or **Amazon Polly Neural** for high-quality TTS generation as an intermediate step (pre-generate audio files instead of using browser TTS live)
- Or: Budget for **native speaker recording sessions** on Fiverr/Upwork (~$0.05-0.10 per sentence × 5,000 = $250-500 per language)
- Storage: Audio files hosted on **Cloudflare R2** or **GitHub LFS** or **S3**

**What I can do now without tools:**
- Refactor app to load pre-recorded MP3/OGG files instead of using SpeechSynthesis API
- Build audio player with preload, caching, and offline support

### 1.2 CEFR Level Tagging
**Why:** Sentences must be difficulty-tagged so beginners see A1 content first, not "The audit is scheduled for next week" (B2+).

**What you need to give me:**
- Access to **GPT-4 / Claude API** to batch-classify all 5,000 sentences by CEFR level (A1, A2, B1, B2, C1, C2)
- Ideally: review by a **native-speaking linguistics consultant** on Fiverr ($50-100 to spot-check 200 sentences)

**What I can do now:**
- Add CEFR field to data format: `[target, translit, english, category, "A1"]`
- Build UI filtering by level
- Create heuristic classifier based on sentence length + vocabulary frequency

### 1.3 Content Verification by Native Speakers
**Why:** AI-generated sentences risk unnatural phrasing, wrong register, incorrect collocations. This destroys credibility with any serious learner.

**What you need to give me:**
- A **native Russian speaker** to review all 5,000 sentences (Fiverr: ~$100-200 for full review)
- Flag unnatural sentences, wrong stress marks, incorrect register
- Add usage notes where needed

**What I can do now:**
- Add a "report issue" button per sentence
- Cross-reference sentences against Tatoeba corpus for naturalness

### 1.4 Frequency-Based Ordering
**Why:** The most efficient learning path is most-frequent-first. Currently sentences are grouped by topic with no frequency ranking.

**What you need to give me:**
- Access to a **Russian frequency corpus** (OpenCorpora, Russian National Corpus, or frequency-list.de/ru)
- Or: API access to score sentences by word frequency

**What I can do now:**
- Download freely available Russian frequency word lists
- Score each sentence by average word frequency
- Add frequency rank to data format
- Sort sentences within categories by frequency

### 1.5 Complete the Content (3,600 → 5,000)
**Why:** The app promises 5,000 sentences and delivers 3,600.

**What you need to give me:**
- Just time/approval. I can generate the remaining 1,400 sentences (categories 91-125)
- After generation, native speaker review (see 1.3)

---

## TIER 2: HIGH IMPACT (Needed for Competitive Product)

### 2.1 Grammar Notes (Contextual)
**Why:** Pure sentence exposure fails adult learners. Brief inline notes like "Мне = dative case of я (I)" transform comprehension.

**What you need to give me:**
- API access (Claude/GPT) to batch-generate grammar notes for key sentences
- Native speaker review of generated notes

**What I can do now:**
- Add optional grammar note field to data format
- Build collapsible "Why?" section under each sentence
- Identify sentences that demonstrate key grammar points

### 2.2 Cloze Deletion Mode
**Why:** Fill-in-the-blank is proven more effective than simple flashcard review. Clozemaster's entire business is built on this.

**What you need to give me:**
- Nothing — I can build this with current tools

**What I can do now:**
- Build cloze deletion study mode (hide one word in the target sentence, user fills it in)
- Intelligently select the most instructive word to blank (the lowest-frequency or grammar-critical word)
- Add as a third study mode alongside "browse" and "flashcard"

### 2.3 Dictation Mode
**Why:** "Write what you hear" is the gold standard for listening comprehension. Forces bottom-up processing.

**What you need to give me:**
- Better audio (see 1.1) — dictation with TTS teaches you to understand robots, not people

**What I can do now:**
- Build dictation UI: play audio → user types → compare → show correct answer
- Fuzzy matching for minor typos
- Keyboard layout switcher for Cyrillic input

### 2.4 Speaking Practice (Speech Recognition)
**Why:** Production practice is the biggest gap vs Pimsleur. The Web Speech API has built-in speech recognition.

**What you need to give me:**
- Nothing for basic implementation — Web Speech API has `SpeechRecognition` built into Chrome
- For advanced: **Whisper API** or **Azure Speech Services** for better accuracy

**What I can do now:**
- Build "repeat after me" mode using `webkitSpeechRecognition`
- Compare user's spoken text against target sentence
- Show word-by-word accuracy highlighting

### 2.5 PWA (Progressive Web App) + Offline
**Why:** Language learners study on commutes, flights, and in places with bad wifi. Offline is expected.

**What you need to give me:**
- Nothing — pure frontend change

**What I can do now:**
- Add service worker for offline caching
- Add manifest.json for "Add to Home Screen"
- Cache all audio files for offline use
- Pre-cache data files

### 2.6 Formal/Informal Register Tagging
**Why:** Using ты when you should use вы is a serious social error in Russian. Every sentence needs a register tag.

**What you need to give me:**
- Native speaker review (or API batch classification)

**What I can do now:**
- Add register field: `"informal"`, `"formal"`, `"neutral"`
- Build filter: "Show only formal sentences"
- Visual indicator (tag/badge) on each sentence

---

## TIER 3: NICE-TO-HAVE (Premium Features)

### 3.1 Cross-Device Sync (Backend)
**What you need to give me:**
- **Supabase** or **Firebase** project for auth + database
- Or: Simple JSON sync to GitHub Gist

### 3.2 Conjugation/Declension Tables
**What you need to give me:**
- Access to **Wiktionary API** or **OpenRussian API** for morphological data
- Or: Russian declension/conjugation database

### 3.3 Sentence Families (Related Sentences)
**What you need to give me:**
- Embedding API (OpenAI or local) to compute sentence similarity
- Build graph of related sentences by grammar pattern and vocabulary overlap

### 3.4 Shadowing Mode
**What I can do now:**
- Play audio → record user → play back side-by-side
- Uses `MediaRecorder` API (no external tools needed)

### 3.5 Cultural Context Notes
**What you need to give me:**
- Native speaker or cultural consultant input
- API for batch-generating cultural notes

### 3.6 IPA Transcriptions
**What you need to give me:**
- Access to **eSpeak** (open-source IPA generator) or **Lexiconista API**
- Or: Russian pronunciation dictionary with IPA

### 3.7 Mobile App (React Native / Capacitor)
**What you need to give me:**
- Decision: React Native vs. Capacitor vs. stay web-only
- Apple Developer Account ($99/year) for iOS
- Google Play Console ($25 one-time) for Android

### 3.8 Analytics Dashboard
**What you need to give me:**
- **Plausible** or **PostHog** for privacy-friendly analytics
- Or: Simple self-hosted tracking

---

## DATA FORMAT UPGRADE

### Current Format (Array Tuple)
```js
["Привет!", "Privet!", "Hello! (informal)", "Greetings & Farewells"]
```

### Proposed Professional Format (Object)
```js
{
  id: "ru_0001",
  target: "Привет!",
  translit: "Privet!",
  ipa: "/prʲɪˈvʲet/",
  english: "Hello! (informal)",
  category: "Greetings & Farewells",
  cefr: "A1",
  frequency: 1,
  register: "informal",
  grammar: "Shortened form of приветствую (I greet). Used with friends, family, peers.",
  culture: "Not appropriate with strangers, elderly, or in formal settings. Use Здравствуйте instead.",
  audio: "audio/ru/ru_0001.mp3",
  related: ["ru_0002", "ru_0003"],
  tags: ["greeting", "daily"]
}
```

This is the target format. Migration can be incremental — add fields one at a time.

---

## PRIORITY EXECUTION ORDER

### Phase 1: Content Complete (1-2 days)
1. Finish data4.js (categories 91-100, +400 sentences)
2. Create data5.js (categories 101-125, 1000 sentences)
3. Update config.js to reference all 5 data files
4. Commit and push everything

### Phase 2: Core Quality (1 week)
5. Add CEFR level tagging to all sentences
6. Add frequency ranking
7. Add register tagging (formal/informal/neutral)
8. Migrate data format from arrays to objects (backwards-compatible)

### Phase 3: Audio Upgrade (1-2 weeks)
9. Pre-generate audio files using ElevenLabs or Amazon Polly
10. Build audio loader to replace Web Speech API
11. Add offline caching (PWA)

### Phase 4: Learning Modes (1-2 weeks)
12. Add cloze deletion study mode
13. Add dictation mode
14. Add speech recognition (repeat after me)
15. Add shadowing mode

### Phase 5: Polish (1 week)
16. Grammar notes for key sentences
17. Cultural context notes
18. Mobile optimization / PWA install prompt
19. Landing page redesign

### Phase 6: Scale (Ongoing)
20. Add second language (Spanish or Portuguese)
21. Cross-device sync
22. Mobile app consideration
23. Community contribution system

---

## TOOLS CHECKLIST — What to Give Claude

| Tool/Access | Purpose | Cost | Priority |
|-------------|---------|------|----------|
| ElevenLabs API key | Generate native-quality audio | ~$5-22/mo | CRITICAL |
| Claude/GPT API access | Batch CEFR tagging, grammar notes | Already have | CRITICAL |
| Native Russian speaker (Fiverr) | Verify all 5,000 sentences | ~$100-200 | CRITICAL |
| Russian frequency word list | Frequency-rank sentences | Free (OpenCorpora) | HIGH |
| Cloudflare R2 / S3 bucket | Host audio files | ~$0-5/mo | HIGH |
| GitHub Pages or Vercel | Host the site | Free | HIGH |
| Supabase project | Cross-device sync (later) | Free tier | MEDIUM |
| Apple Developer Account | iOS app (later) | $99/year | LOW |
| Google Play Console | Android app (later) | $25 one-time | LOW |

---

## BOTTOM LINE

Lang5K has a genuinely good foundation that most competitors charge $15-30/month for. The core methodology (sentence-based SRS) is linguistically sound. The gaps are **audio quality**, **content verification**, and **difficulty progression** (CEFR). Fix those three things and you have a product that competes with Glossika at $0/month.

The unique selling proposition: **Free, open, 5000 native-audio sentences with SRS, difficulty tagging, and PDF export.** Nobody else offers this combination.
