# Teach2D – English-teaching video templates (29/10/2026, v2 31/10)

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
- Canvas = flat Kit gradient + 3 static soft blobs (0 credits, no AI plate, no blur, nothing moving). Teacher = the 1108×960 HD registry clip, one fixed transform, never > 1.0× (camera push ≤ 1/k): short v2 corner 864 px (k 0.90), side 920 px (k 0.96), bubble window 480 px (k ≈ 0.93–0.96); embed 960 px (k 1.0 – cannot grow). Short head top at y 1292 right under the caption row (build.py asserts caption directly above the head and the clip's bust cut below the frame).
- Scene (optional pilot field `scene`: kitchen · office · studio · classroom · field · cafe · library · station; add one = a key in `src/teach/scenes.json`, generated as flat Kit vector rooms): depth layers – far wall band (window + light shaft, wall-to-floor shading), mid furniture, near props on the counter – in theme tokens (`wall · sky · glow · wood · leaf · shade` + series tint), soft light pools (`g` radial) and gradients (`lg`), no text, no people, static, card region (y < 1150) left empty. Grounding from `scene.py`: floor plane, soft contact shadow, FOREGROUND counter (short top y 1830, wide y 900 right of the card region). Front props are groups (`g`): `scene.py` slides / shrinks (≥ 0.6) each beside the teacher, or stands it behind her when no room – `build.py` asserts no front item over her head or her body above the counter (every camera framing), `qc.py` scene_clear re-checks. Bubble layout = backdrop below the card region only, no counter. Counter never covers captions / nodes; props + timeline carry `scene`.
- Cards = Kit card (2 px border, darker ledge, radius 44) in ONE region above the head, sized to content (a card grows, 0.24 s, when rows arrive on later words – no empty half); series chip top-left; one-row karaoke caption between cards and head. Every chip / pill / tag is sized by `fit.py` (rendered font + letter-spacing + flag / letter chip / ✓) so its text stays on ONE line inside it – `build.py` asserts, `qc.py` layout gate re-checks.
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
- Layouts (`build.py --layout`, else the row's `layout`, else corner; same cards + timing): `corner` (teacher centre, region 324–1150, caption 1166–1280) · `side` (teacher left, larger, caption 60–760 above the head) · `bubble` (region to 1280, caption 1296–1410 above a round Kit call window [552,1428,1032,1908]). Every pilot ships the other two layouts as stills + a layout board (`layouts.jpg`).
- Rotating per episode (batch only after the owner's OK): hook style (question · challenge · "most learners…" · myth), layout, example scene. Look = `dusk` (owner pick 29/10).
- Optional v2 row fields (absent = old output byte-identical): `layout`, `hook_style` (question · challenge · most · myth → the on-screen hook is `hook.text`, `hook_hl` in accent), `in.hook_say` / `in.hook_text` for every template (also the formerly fixed ones), grammar `brick_labels` / `brick_cues`, call `right_opt` (verb phrases: “Let's grab a coffee!”).
- Audio: voice −16 LUFS dominates; social music bed −40 dBFS RMS (ducked 12 dB under the voice). Optional row fields `hook_by` (hook deadline, default 2.2 s; t3 samples 1.5) and `hook_speed` (Kokoro speed of the hook line only; gen.py asserts 0.10 + words / (2.55 × speed) ≤ hook_by − 0.1).
- Planner rule: no two consecutive videos share template, teacher, look, layout or hook style; a point (content hash) is never reused; ≥ 1 new template per month (`VIDEO-SERIES.md`).

## QC gates (`qc.py`, all must pass, weighted score ≥ 90)
voice_teacher · pace ≤ 150 wpm · caption_sync (caption == script == whisper) · mouth (talk only while speaking, closed-mouth listen in pauses > 0.35 s) · hook (by `hook_by`) · cue_timing ±80 ms ·
scene_clear (known key; counter + props off captions / text / QR / CTA and off the teacher's head / body; card region calm ≤ 1.35:1; text + captions readable on the composited scene) · bed (−40 ± 3 dBFS RMS, none in embeds) ·
layout (text in SAFE, no overlap, nothing on the head, caption off the face, nothing under the ring, chip / pill text on one line in its pill) · contrast (≥ 4.5:1, ≥ 56 px ≥ 3:1, real fill) · min_text (40 / 34 px) ·
ipa (== audited bank, stress dot == IPA mark) · cta (lexkite.com/app deep link) · duration 18–42 s · file (30 fps, AAC, −16 LUFS ±1.5) · frames (teacher visible every second against the expected scene background, no blank frame).

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
- Owner OK 30/10 on the 5 new templates (grammar, dictation, toeic, review, call – CI f5c3fe8, all 32 renders QC 100). Batch / cron / publish still need their own OK.
- Cookie/biscuit usuk ep (kitchen scene) waits for `biscuit#n` in the audited IPA bank (`content/lexicon/expand/retry`).
- Matching 2D scenes: vector scene layer done (0 credits); samples `t3_usuk_soccer` (field), `t3_mistake_discuss` (office), `t3_stress_photographer` (studio), `t3_verbs_break` (classroom), hook by 1.5 s – owner look OK pending. A Kling 2D-scene bank would still follow `CREDIT-RULES.md` and need an explicit credit OK.
- v2 sample set (31/10, CI pending, owner judges variety): `t4_usuk_soccer` (Ama, dusk, side, field, question) · `t4_grammar_stative` (Carlos, light, corner, library, most learners) · `t4_mistake_discuss` (Ama, dark, bubble, office, myth) · `t4_stress_photographer` (Carlos, dusk, side, studio, challenge) · `t4_call_grabcoffee` (Ama, light, corner, cafe, question) · `t4_verbs_break` (Carlos, dark, bubble, classroom, myth) · `t4_dictation_commuter` (Ama, dusk, side, station, challenge); all hook by 1.5 s.
- Teacher poses: only talk / listen have HD clips (`-hd.mp4`, 1108×960); explain / point / happy / thinking … are 554×480 clips (+ 1108×960 *stills* `still-<pose>.webp`) – a 480-tall clip would be enlarged > 1.0× at the v2 sizes, so poses wait for an HD clip bank.
- 1080p bank (session teach-build-1080): `host.py` reads the same registry paths, no code change.
