# Teach2D – English-teaching video templates (29/10/2026)

> TL;DR: one Remotion pipeline, 5 templates, ONE 2D teacher (Ama or Carlos from `web/teach/characters.json`), Lexkite Kit cards (Stitch, dark A / light B), every element on its spoken word, 9:16 social + 16:9 lesson embed from the same data. CI only (`teach-video.yml`), 0 credits. QC before AND after render. Bulk only after the owner OKs the pilots.
> Read when: making or changing teaching videos. Older engines: `VIDEO-MOTION.md` (#191 overlay on render_v9 plates – superseded here), `VIDEO-SERIES.md` (series rules, still valid).

## Pipeline (`.github/workflows/teach-video.yml`, never on the Mac)
1. **preqc** – `gen.py` regenerates `content/video/teach2d/eps/*.json` from `pilots.json` (must be identical) + every script == `reviewed.json` (hook true) + motion parity test.
2. **voice** – Kokoro with the registry voice of the teacher shown (Ama `af_bella`, Carlos `am_fenrir`) → Rhubarb → faster-whisper clock on the exact caption tokens (`pilot5_voice.py`).
3. **render** (per pilot × short/wide) – `host.py` (registry stacked-alpha talk/listen → VP9 alpha) → `build.py` (layout, cues, captions, voice −16 LUFS + soft ticks, QR deep link) →
   **QC before render** (`qc.py` on the timeline, both themes) → Remotion `teach-short` 30 fps → **QC after render** (`qc.py --video`) → contact sheet, phone copy, poster, VTT.
4. **embed** – Playwright screenshots of `docs/mocks/teach-video/embed.html` (lesson step, light/dark, phone/desktop). Real wiring = `web/js/lesson-video.js` (#195) after the owner's OK.
5. **sheet** – `sheet.py`: one owner review sheet + score table; red if any pilot < 90 or a gate fails.

## Look (Stitch "Lexkite Kit", tokens `scripts/video/remotion/src/teach/theme.json`)
- Three looks, same components: `dark` (A Tactile Night, = app dark), `dusk` (brighter teal dark for social feeds – owner 29/10 "màu hơi tối"), `light` (B Bright Day). Every pilot ships stills of the other two looks for the owner's pick; contrast gate runs on all three.
- Canvas = flat Kit gradient + 3 static soft blobs (0 credits, no AI plate, no blur, nothing moving). Teacher bottom-centre, one fixed transform, never > 1.0× (short 640 px tall, embed 960 px).
- Cards = Kit card (2 px border, darker ledge, radius 44) in ONE region above the head; series chip top-left; one-row karaoke caption between cards and head.
- Motion: `soft` entrance (fade 0.24 s + 16 px ease-out, no spring – owner rejected #191's bounce), state colour mix 0.18 s, strike draw 0.30 s; ONE light celebration (✓ pop + confetti ≤ 0.9 s) on the quiz answer. Static while read.
- Stitch reference screens (project 7268539912208977707): US/UK twin tiles `4cb4e39f975b4d7c9b9e9497016a5618`; quiz/mistake/tip `b83dd6cf…/ad30b370…/9c86169b…` (#191).

## Templates (each = 1 point, hook ≤ 6 words on screen at frame 0, example, 3-2-1 quiz, share line, deep-link CTA + QR)
| template | series | facts from | CTA (app route) |
|---|---|---|---|
| `usuk` | US or UK? (model: approved cookie/biscuit ep.) | curated pair + audited IPA bank | `#/dict/<us word>` |
| `verbs` | Verb Forms Challenge | `web/js/verbs-core.js` forms + over-regularised mistake | `#/verb/<base>` |
| `stress` | Where's the Stress? | audited IPA stress mark == lit syllable | `#/pron/<word>` |
| `mistake` | Stop Saying This | gold bank `stop-saying` rows | `#/fix` |
| `phrasal` | Phrasal Verb in 30s | gold bank `idiom-phrasal` rows | `#/phrases` |
| `grammar` | Grammar in 60s (Stitch `3fcef4347cac4fc58dcd3911fa1a3647`) | app grammar point (`web/js/grammar/*`: formula → bricks, listed mistake, listed quiz) | `#/grammar/<id>` |
| `dictation` | What Did She Say? (Stitch `96c97a4a8606465f97f7b34d47297563`) | app listening script line (`web/js/listen/*`) said twice, gap fills; word meaning = audited bank | `#/dictation/<id>` |
| `toeic` | TOEIC Word | app TOEIC Part 5 item (`web/js/toeic/reading*`: answer key + cue) | `#/toeic` |
| `review` | Remember This? | audited word bank card + the app's 4 grade buttons (en i18n) | `#/review?w=<word>` |
| `call` | Ask Ama | app call script (`web/js/call/calls.js`: phrase, meaning, reply) – in-app caller is Mia, so the CTA says "Practice a real call" | `#/call/<id>` |

## Variety (owner 29/10: "đa dạng, đỡ nhàm chán")
- Fixed per series (recognition): series chip + series tint on the canvas (`theme.json` tints: US/UK teal, Verbs gold, Stress coral, Stop Saying red-coral, Phrasal mint) + one teacher per series.
- Layouts (`build.py --layout`, same cards + timing): `corner` (teacher bottom-centre) · `side` (teacher left, larger, caption right of the head) · `bubble` (big card, teacher in a round Kit call window). Every pilot ships a layout board (`layouts.jpg`).
- Rotating per episode (batch only after the owner's OK): hook style (question · challenge · "most learners…" · myth), layout, example scene. Look = `dusk` (owner pick 29/10).
- Planner rule: no two consecutive videos share template, teacher or look; a point (content hash) is never reused; ≥ 1 new template per month (`VIDEO-SERIES.md`).

## QC gates (`qc.py`, all must pass, weighted score ≥ 90)
voice_teacher · pace ≤ 150 wpm · caption_sync (caption == script == whisper) · mouth (talk only while speaking, closed-mouth listen in pauses > 0.35 s) · hook · cue_timing ±80 ms ·
layout (text in SAFE, no overlap, nothing on the head, caption off the face, nothing under the ring) · contrast (≥ 4.5:1, ≥ 56 px ≥ 3:1, real fill) · min_text (40 / 34 px) ·
ipa (== audited bank, stress dot == IPA mark) · cta (lexkite.com/app deep link) · duration 18–42 s · file (30 fps, AAC, −16 LUFS ±1.5) · frames (teacher visible every second, no blank frame).

## Topic plan – every app area, zero-coverage first (only machine-checkable points)
| order | app area (route) | template | point source | status |
|---|---|---|---|---|
| 1 | dictionary `#/dict` | usuk | US/UK pairs with both IPA in bank (elevator/lift, apartment/flat, vacation/holiday, line/queue, gas/petrol, sidewalk/–) | pilot |
| 2 | verbs `#/verb` | verbs | ~180 irregular verbs × overreg mistake (verbs-core) | pilot |
| 3 | pronunciation `#/pron` | stress | stress-shift families (photograph/-er, economy/economic, record n/v) from IPA bank | pilot |
| 4 | grammar-check `#/fix` | mistake | 72 gold `stop-saying` rows | pilot |
| 5 | phrases `#/phrases` | phrasal | 26 gold `idiom-phrasal` rows | pilot |
| 6 | word-usage `#/usage` | mistake (pair variant) | 27 gold `x-vs-y` + pair-cards | after OK |
| 7 | grammar `#/grammar/<id>` | mistake (rule card) | 889 grammar points (rule + ✗/✓) | after OK |
| 8 | reading / toeic / placement | quiz-only variant of `verbs`/`mistake` (A/B card, 3-2-1) | placement + TOEIC item banks (answer key = data) | after OK |
| 9 | lesson `#/lesson`, call `#/call`, confidence `#/confidence` | embed 16:9 inside the lesson step; CTA "Call Ama" only where the feature exists | lesson engine items | after OK |
Excluded (strength filter, `VIDEO-SERIES.md`): accents/intonation, slang, roleplay, long listening.

## Not done yet (needs the owner)
- Approval of the 5 pilots (review sheet) before any batch / cron / publish.
- Matching 2D scene backgrounds: today the Kit canvas (0 credits). A Kling 2D-scene bank would follow `CREDIT-RULES.md` (analysis → dry-run → 1 pilot) and needs an explicit credit OK.
- 1080p bank (session teach-build-1080): `host.py` reads the same registry paths, no code change.
