# Lang5K - Complete App Documentation & Professional Audit

> **Domain:** lang5k.com
> **Repo:** github.com/tiagolinnerhall/language_system
> **Local Path:** `d:\Projects\Website\russian-1000-sentences\`
> **Audit Date:** 2026-04-24

---

## 1. WHAT THE APP IS

Lang5K is a static HTML/JS language learning app based on **sentence-based spaced repetition**. The premise: learn 5,000 real-life sentences in your target language and you cover ~98% of daily conversation.

### Architecture
- **Pure static site** — 2 HTML files, no backend, no framework, no build step
- **index.html** — Landing page with 20 language cards (only Russian is active)
- **app.html** — The full learning app loaded via `?lang=russian`
- **Data files** — `languages/russian/data1.js` through `data4.js` (arrays of sentence tuples)
- **Config** — `languages/config.js` defines all 20 languages and which data files to load
- **Storage** — 100% localStorage (learned status, review bin, SRS data, streak, stats)

### Sentence Data Format
Each sentence is a 4-element array:
```
[target_language, transliteration, english, category_name]
["Привет!", "Privet!", "Hello! (informal)", "Greetings & Farewells"]
```

### Current Content Status (Russian)
| File | Categories | Sentences | Git Status |
|------|-----------|-----------|------------|
| data1.js | 1-25 (Greetings → Love & Friendship) | 1,000 | Pushed |
| data2.js | 26-50 (Apartment → Numbers) | 1,000 | Pushed |
| data3.js | 51-75 (Business → Idioms) | 1,000 | Untracked |
| data4.js | 76-90 (Accounting → Furniture) | 600 | Untracked |
| data5.js | 91-125 | 0 | NOT CREATED |
| **TOTAL** | **90 of 125** | **3,600 / 5,000** | |

---

## 2. FEATURES (Current)

### 2.1 Browse Mode
- All sentences organized by category (collapsible accordion)
- Search across target language, transliteration, and English
- Filter by category, unlearned-only toggle
- Expand/Collapse all categories
- Global sentence numbering

### 2.2 Click-to-Speak Audio
- Uses **Web Speech API** (browser TTS) — NOT native speaker recordings
- Adjustable speed slider (0.5x – 1.5x, default 0.85x)
- Click any sentence or speaker button to hear it
- "Play All in Category" autoplay with visual highlighting
- Keyboard: Space=play, Arrow Up/Down=navigate sentences

### 2.3 Progress Tracking
- Mark individual sentences as "learned" (checkbox per sentence)
- Progress bar: X / total learned (percentage)
- Per-category learned counts in headers
- All state persisted in localStorage

### 2.4 Review Bin
- Add any sentence to a "review bin" for focused practice
- Audio-first mode: text is **blurred** until manually revealed
- Shuffle, Play All (audio-only), Reveal All, Hide All
- Remove from bin when mastered (animated removal)
- Badge shows count of binned sentences

### 2.5 Study Mode (SRS - Leitner System)
- **Leitner 5-Box System:**
  - Box 1: review in 1 day
  - Box 2: review in 3 days
  - Box 3: review in 7 days
  - Box 4: review in 14 days
  - Box 5: review in 30 days
  - Box 5 + correct → graduated to "Learned"
- **New cards:** Shows full sentence (target + translit + English + audio), user clicks "Got it! Next"
- **Review cards:** Shows English only → user recalls/types answer → reveals → rates Again/Good
- Configurable daily new-sentence goal (5/10/15/20)
- Session summary: new learned, reviewed, accuracy, streak
- Time estimate per session

### 2.6 Streak System
- Tracks consecutive study days
- Fire emoji display with day count
- Resets if a day is missed

### 2.7 Milestone System
- Celebration popups at: 10, 25, 50, 100, 250, 500, 1000, 2500, 5000 sentences learned
- Progressive emojis and messages

### 2.8 PDF Export
- Downloads all sentences as formatted PDF via jsPDF + autoTable
- Grouped by category with headers
- 4 columns: #, Target Language, Transliteration, English

### 2.9 Dark Mode
- Toggle between light/dark themes
- Persisted in localStorage

### 2.10 Multi-Language Architecture
- Config supports 20 languages (Russian, Spanish, French, German, Japanese, Korean, Mandarin, Italian, Portuguese, Arabic, Turkish, Hindi, Dutch, Polish, Swedish, Thai, Vietnamese, Greek, Ukrainian, Hebrew)
- Only Russian has data; all others show "Coming Soon"
- Each language loads its own data files dynamically

---

## 3. METHODOLOGY ASSESSMENT (Honest Audit)

### What Lang5K Gets RIGHT

| Aspect | Assessment |
|--------|-----------|
| **Sentence-based learning** | Correct approach. Research (Lewis, Wray, Laufer) confirms sentences > isolated words for vocabulary retention and grammar acquisition |
| **Frequency-informed categories** | Categories progress from survival (greetings, food, transport) to specialized (legal, business, camping). This roughly mirrors frequency-of-need |
| **SRS implementation** | Leitner system is well-validated. 5-box progression with correct intervals is solid |
| **Review Bin (audio-first)** | Audio-first with blurred text forces active recall — a well-researched technique |
| **Transliteration** | Critical for non-Latin scripts. Removes the "I can't even read this" barrier for beginners |
| **Category organization** | 125 topic categories give good topical coverage of daily life |
| **Study mode design** | New cards (exposure) vs. review cards (recall) is the correct SRS split |
| **Progress tracking + streaks** | Gamification elements that drive habit formation |

### What Lang5K Gets WRONG or LACKS

| Issue | Severity | Detail |
|-------|----------|--------|
| **Browser TTS, not native audio** | CRITICAL | Web Speech API produces robotic, often incorrect pronunciation. For Russian stress patterns, palatalization, and vowel reduction, TTS is actively misleading. Glossika and Pimsleur use native recordings for a reason. |
| **No CEFR level tagging** | HIGH | Sentences are organized by topic but not by difficulty level. A beginner shouldn't see "The audit is scheduled for next week" next to "Hello!" |
| **No frequency ranking** | HIGH | Sentences are not ordered by corpus-backed frequency. Category 76 "Accounting & Taxes" has the same weight as Category 1 "Greetings" |
| **No grammar notes** | HIGH | Pure exposure with zero explanation. Adult learners need to understand WHY "Мне нужно" uses dative case. Glossika gets criticized for this exact gap |
| **AI-generated sentences** | HIGH | All 3,600 sentences appear to be AI-generated, not sourced from authentic corpora or verified by native linguists. Risk of unnatural phrasing, incorrect collocations, or wrong register |
| **Informal transliteration** | MEDIUM | Uses ad-hoc romanization, not standardized IPA or any recognized system. Inconsistencies possible |
| **No speaking practice** | MEDIUM | No speech recognition, no shadowing mode, no pronunciation feedback. Receptive-only |
| **No dictation mode** | MEDIUM | No "type what you hear" exercise. This is the gold standard for listening comprehension |
| **No cloze deletion** | MEDIUM | Fill-in-the-blank is proven to be more effective than simple flashcard review (Clozemaster's entire business model) |
| **No cultural notes** | MEDIUM | No register tagging (formal/informal), no cultural context, no usage notes |
| **No offline/PWA** | LOW | Static files could easily be a PWA but aren't. No service worker |
| **No mobile app** | LOW | Responsive web only. No native app for iOS/Android |
| **localStorage only** | LOW | Data loss risk if user clears browser. No cross-device sync |

---

## 4. COMPETITOR POSITIONING

| Feature | Lang5K | Glossika | Clozemaster | Pimsleur | Anki | Duolingo |
|---------|--------|----------|-------------|----------|------|----------|
| Sentence-based | Yes | Yes | Yes | Yes | Configurable | Partial |
| Native audio | NO (TTS) | Yes | Partial | Yes | User-added | TTS |
| SRS algorithm | Leitner 5-box | Proprietary | SM-2 variant | Graduated interval | FSRS/SM-2 | Proprietary |
| CEFR tagging | No | No | No | Implicit | No | Partial |
| Grammar notes | No | No | No | Implicit | User-added | Minimal |
| Cloze deletion | No | No | Yes (core) | No | Configurable | Yes |
| Speaking practice | No | Shadowing | No | Yes (core) | No | Yes (weak) |
| PDF export | Yes | No | No | No | Addon | No |
| Review bin | Yes | No | No | No | Filtered decks | No |
| Free | Yes | $30/mo | Freemium | $15-21/mo | Free | Freemium |
| Offline | No | Yes | No | Yes | Yes | Yes |
| Languages | 20 planned | 55+ | 60+ | 51 | Any | 40+ |

### Lang5K's Unique Advantages
1. **100% free, no paywall** — Glossika costs $30/month
2. **PDF export** — Nobody else does this well
3. **Review bin with audio-first** — Unique feature
4. **Static site = zero server costs** — Can be hosted on GitHub Pages for free
5. **Open architecture** — Anyone can contribute data files
6. **Transparent methodology** — User can see all sentences, not locked behind drip-feed

### Lang5K's Fatal Gaps (vs. Competitors)
1. **Audio quality** — Browser TTS vs. native recordings is a dealbreaker for serious learners
2. **Content verification** — No proof that sentences are linguistically correct or natural
3. **No production practice** — You can listen and read but never speak or write
4. **No difficulty progression** — All 5,000 sentences are equally weighted

---

## 5. THE "5,000 SENTENCES = 98% COVERAGE" CLAIM

### What Research Actually Says (Paul Nation, Stuart Webb)

| Coverage Level | Word Families Needed (Spoken) |
|----------------|-------------------------------|
| 95% (adequate) | ~3,000 word families |
| 98% (comfortable) | ~6,000-7,000 word families |

- A "word family" = base form + all inflections (run, runs, running, ran, runner = 1 family)
- 5,000 word families ≈ 15,000-30,000 individual word forms
- 5,000 well-chosen sentences can expose you to ~5,000 word families IF each introduces ~1 new word family

### Verdict
The claim is **approximately valid for receptive comprehension** IF:
- Sentences are carefully selected to maximize vocabulary coverage
- Word families are drawn from a spoken/conversational corpus
- "98%" refers to recognition, not production
- Learner also gets exposure beyond these 5,000 sentences

The claim is **misleading** if interpreted as "memorize 5,000 sentences and you can speak fluently."

---

## 6. FILE STRUCTURE

```
russian-1000-sentences/
├── index.html              # Landing page (language selection)
├── app.html                # Full learning app (~1225 lines)
├── languages/
│   ├── config.js           # Language registry (20 languages)
│   └── russian/
│       ├── data1.js        # Categories 1-25 (1000 sentences)
│       ├── data2.js        # Categories 26-50 (1000 sentences)
│       ├── data3.js        # Categories 51-75 (1000 sentences) [UNTRACKED]
│       ├── data4.js        # Categories 76-90 (600 sentences) [UNTRACKED]
│       └── (data5.js)      # Categories 91-125 (MISSING)
```

---

## 7. WHAT'S NEEDED TO MAKE IT PROFESSIONAL

See separate section: PROFESSIONAL_UPGRADE_ROADMAP.md
