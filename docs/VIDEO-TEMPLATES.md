# Video templates v1 – clean, consistent-by-design (24/10/2026)

Owner rejected the cine/news composite approach (two cartoon hosts on cropped AI plates, matting, pans, whip-pans,
chaotic cuts, inconsistent proportions). These two templates replace it. Consistency is a property of the design,
not something QC has to catch afterwards.

| | Template 1 "Teacher card" | Template 2 "Motion explainer" |
|---|---|---|
| Host | ONE host (Ama), one fixed transform for the whole video | none |
| Background | designed studio: cream→mint gradient, blurred brand blobs, soft vignette (never an AI plate) | deep-teal gradient, blurred brand blobs |
| Energy | motion-graphics layer above the host | big type + Noto Emoji icons |
| Voice | Ama's Kokoro voice (af_bella) for every line | same audio |

Code: `scripts/video/tpl/tokens.py` (all tokens below, single source), `render_tpl.py` (both templates), `qc_tpl.py` (gate).
CI: `.github/workflows/video-templates.yml` (input `lesson`, default the gold `news_shopping_stop_8cf065`). 0 credits.

## 1. Grid
- Frame 1080×1920, 30 fps. Safe area for ALL text: x 48–924, y 232–1497 (platform UI: top 12 %, bottom 22 %, right 14 %).
- 12 columns, 24 px gutters, column = 51 px. Blocks span cols 0–11 (876 px); quiz options cols 0–5 / 6–11.
- Vertical rhythm 8 px. Fixed rows: progress bar y 240, series chip y 280, stage from y 392
  (T1 stage ends at 992 = above the host's head; T2 stage ends at 1480). Content is centred in the stage.

## 2. Type scale (one scale, ×1.25, nothing below 48 px)
| token | px | font |
|---|---|---|
| label | 48 | Be Vietnam Pro ExtraBold (chips, CTA) |
| body | 60 | Be Vietnam Pro Bold/ExtraBold |
| h2 | 76 | Be Vietnam Pro ExtraBold (card sentences) |
| h1 | 96 | Be Vietnam Pro ExtraBold / Bricolage |
| display | 128 | Bricolage Grotesque ExtraBold (hook, formula, brand) |
Line height 1.18. Lines are wrapped *balanced* (same line count, narrowest width) so there are no orphans.

## 3. Colour (web/js/kit.js only)
navy #0F3D3E (ink, T2 bg), navy2 #17595A, red #E5502F (wrong, accent), cream #FFF7EA, yellow #FFC94A (highlight),
green #2FBF71 (right). Wrong = red ✗ badge + red words + red underline; right = green ✓ badge + green words + green underline.

## 4. Motion tokens
- Durations: fast 200 ms, base 300 ms, slow 500 ms. Nothing else.
- One easing family (quint): out = cubic-bezier(.22,1,.36,1) for every entry, in = cubic-bezier(.64,0,.78,0) for every exit,
  inout = cubic-bezier(.83,0,.17,1) for dims.
- Entries: rise (40 px), slide (120 px from the right, cards), fade, pop (scale .8→1, badges/stamps only), wipe (underlines, strikes, progress).
- Exits: fade, fast. Stagger = fast (200 ms).

## 5. Rules
1. Max ONE moving element group at a time (the beat that owns the tween; a beat's exits share one tag). Words of a sentence = one group.
2. No cut without a reason: the host never cuts, moves or scales (T1 transform: scale 1.0, x 0, y +600, every frame).
   Scene change = the previous beat fades out (fast) before the next beat enters.
3. Text appears with the spoken word (Kokoro + faster-whisper word times), never before it.
4. Every text block stays fully visible ≥ 0.8 s; the timeline adds silence when a line ends too soon.
5. Text only inside the safe area; the host may sit below it.
6. Sound: soft whoosh on card/beat entries (−27 dBFS peak), tick on highlights/badges/countdown (−29 dBFS),
   music bed (soft pad) at −40 dBFS RMS, voice at −19 dBFS RMS.
7. Delivery: 25–35 s, H.264 CBR ≥ 5.5 Mbps, ≤ 25 MB, AAC 160 k.

## 6. Beat structure (template "fix")
hook (Stop saying + struck phrase) → wrong (✗ card) → guess (? + 3-dot countdown pause) → right (✓ card slides in under ✗, ✗ dims)
→ rule (formula) → quick check (strike + NO stamp) → normal speed (karaoke + marker) → teacher's tip (3 numbered rows)
→ quiz (A/B options, comment CTA) → share + Lexkite brand. Progress bar steps once per beat.

## 7. QC (`qc_tpl.py`, any fail = not delivered)
host_variance (distinct host transforms = 1) · motion_tokens (every tween uses DUR + EASE tokens) · safe_area (text boxes) ·
readability (≥ 0.8 s fully visible, ≥ 48 px) · no_jitter (a static element keeps exactly one position; tweens monotonic) ·
one_moving_group · no_unmotivated_cut · file (duration, Mbps, MB). Writes `<video>.qc.json`.
Human check: look at the contact sheet (`<video>.sheet.jpg`, one frame per beat) before sending anything to the owner.
