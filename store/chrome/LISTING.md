# Lexkite – Chrome Web Store listing

**Source of truth: [`listing.json`](listing.json)** – name, summary and description for all 15 store locales (`en, vi, es, pt_BR, fr, de, id, th, zh_CN, ja, ko, hi, ar, ru, tr`). Edit texts there only, then:

```
node scripts/test/listing-check.mjs   # lengths, 15 locales, no ®, no banned words, privacy link, disclaimer
node scripts/gen-store-fill.mjs       # regenerates fill.html (copy buttons for the dashboard)
```

`name` / `summary` are also the extension's `appName` / `appDesc` in `extension/_locales/<locale>/messages.json` (the store shows the values from the package) – keep them identical. Same texts are used for Microsoft Edge Add-ons (`docs/EDGE-SUBMIT.md`).

Images: `store/chrome/screenshots/` (1280×800) and `store/chrome/promo-440x280.png`, `promo-1400x560.png`. Package: `store/lexkite-extension.zip` (built by `bash scripts/build-extension.sh --zip`, not in git).

| Field | Value |
|---|---|
| Name (from manifest, localised) | `listing.json → <locale>.name` (≤ 75) – en: `Lexkite – English Dictionary, Translator & Vocabulary Flashcards` |
| Summary (from manifest, localised) | `listing.json → <locale>.summary` (≤ 132) |
| Category | **Education** |
| Default language | English (+ the 14 other locales in `listing.json`) |
| Official URL | `https://lexkite.com` |
| Homepage URL | `https://lexkite.com` |
| Support URL | `https://lexkite.com/app/#/contact` (email: support@lexkite.com) |
| Privacy policy URL | `https://lexkite.com/privacy` (localised link inside each description: `https://lexkite.com/<lang>/privacy`) |
| Mature content | No |
| Store icon | `extension/icons/icon-128.png` (128×128) |

## Copy rules
- Only features that exist; numbers verified in the repo: **6,000+** words with IPA (8,177 unique entries in `web/js/data.js` + `web/js/lib/*`), **15** interface languages (`extension/_locales`, `scripts/i18n-langs.txt` + en/vi), IELTS & TOEIC practice tests with explanations, FSRS.
- No "best / #1 / official", no ratings or user counts, no "®", no competitor brand names. Exam names (IELTS, TOEIC, TOEFL) only as exam names, always with the non-affiliation line at the end.

## Screenshot plan (5 × 1280×800 per locale, copy in `scripts/store-copy.mjs` → `CAP`)
1. **Thumbnail** – double-click lookup card on an article; short bold headline ("Double-click any word. Learn it for good.").
2. **Translate selection** – sentence translation + grammar structures.
3. **Toolbar popup** – cards due, daily goal, quick review.
4. **New tab** – vocabulary card on every new tab.
5. **Proof** – 4 stat tiles: 6,000+ words · 15 languages · IELTS · TOEIC practice tests · FSRS.

---

## English (default) – copy of `listing.json → en`

**Summary:**
```
Double-click any word for meaning, IPA and audio. Translate selections, save words in context and review flashcards for IELTS/TOEIC.
```

**Description:**
```
Lexkite turns everything you read and watch online into English vocabulary practice for IELTS, TOEIC and everyday life: a dictionary and translator on every page, plus flashcards that remind you to review each word right before you forget it.

LOOK UP ANY WORD, ON ANY PAGE
• Double-click a word: British & American IPA, audio, meanings by part of speech, definitions, examples and a picture.
• Select a sentence or paragraph: instant translation, with the grammar structures in it explained.
• Right-click → “Look up” or “Translate selection”.
• Optional: a deeper AI explanation of any expression, only when you ask for it.
• Optional writing check (off by default): underlines English mistakes in the box you are typing in and explains each one.

LEARN FROM YOUTUBE
• Turn on English subtitles and click any word in the captions – the video pauses and you see the meaning and a translation of the whole line.
• Keys A / S / D jump to the previous line, replay the current one or move to the next.

SAVE WORDS WITH THEIR CONTEXT
• Every saved word keeps the sentence and the page where you found it.
• Words you have already learned can be highlighted on the pages you visit, so you meet them again in real context.
• Academic B2–C2 words can be underlined (optional).

REVIEW AT THE RIGHT MOMENT
• Spaced-repetition flashcards scheduled by the FSRS algorithm.
• A daily reminder and “golden moment” alerts when words are about to be forgotten, with quiet hours.
• A vocabulary card on every new tab (turn it off in one click).
• A toolbar badge showing how many cards are due today.

A FULL STUDY APP INCLUDED
• 6,000+ words with IPA, topic word lists, the Academic Word List, phrasal verbs, idioms and collocations.
• Flashcards, games, listening & dictation, pronunciation practice, reading passages, and IELTS & TOEIC practice tests with explanations.
• Interface in 15 languages.

FREE AND PRIVATE
• Free, no ads in the extension, no account required.
• Your learning data stays in your browser. Sign in with Google on lexkite.com only if you want to sync between devices.
• We never collect your browsing history or sell your data. Privacy policy: https://lexkite.com/privacy

Lexkite is an independent product and is not affiliated with or endorsed by the British Council, IDP, Cambridge University Press & Assessment or ETS. IELTS, TOEIC and TOEFL are trademarks of their respective owners.
```
