# Video teachers, sets and talk clips (v9 template family, 25/10/2026)

Source of truth for the renderer: `content/video/cine/teachers.json` (clip ids, usable frames, head mask, camera anchor, set paths).
Footage lives in `lexkite-footage` (CI sparse checkout); 24 fps "dl24" clips, 1080×1920 (hotel/airport 1080×1916 → uniform 1920 scale + 1 px side crop).
Rule (memory us-style-characters): teachers must feel American; Priya is excluded; voices are American Kokoro voices; one voice per teacher.

## 1. Usable now (0 credits) – to-camera talk loops with a Rhubarb mouth set

| Teacher | Voice (Kokoro) | Set | Clip id | Framing | Usable frames → seconds | Room for pops (band under the chin) | Notes |
|---|---|---|---|---|---|---|---|
| Ama | af_bella | studio (anchor) | `a01_ama_talk` | MCU | 0–120 → 5.0 s | y 972–1328 (356 px) | v8 base clip, hands on desk |
| Ama | af_bella | studio | `a02_ama_talk_smile` | MCU | 0–120 → 5.0 s | same | smiling variant |
| Ama | af_bella | studio | `a03_ama_explain` | MCU | 20–120 → 4.2 s | same | right-hand explain gesture |
| Carlos | am_fenrir | studio (anchor) | `c01_carlos_talk` | MCU | 0–120 → 5.0 s | y 948–1328 (380 px) | mug on desk right |
| Carlos | am_fenrir | studio | `c02_carlos_talk_smile` | MCU | 0–120 → 5.0 s | same | |
| Carlos | am_fenrir | studio | `c03_carlos_explain` | MCU | 0–120 → 5.0 s | same | **not used**: turns to the mug, eyes off camera for ~1 s (render-1 review) |
| Ama | af_bella | hotel lobby | `h06_ama_mcu_talk` | close MCU | 0–120 → 5.0 s | y 1041–1328 (287 px) | casual look (hoodie); only one clip → loops on its own best frame pair |
| Ama | af_bella | airport | `a07_ama_mcu_talk` | close MCU | 0–120 → 5.0 s | y 1051–1328 (277 px) | casual look; one clip |

Checked but **not used as a teacher shot**:
- `cafe/c10_ama_mcu_talk` (5.0 s, mouth set ok): head fills x 0–1080, y 0–1130 with a big sway → only ~200 px under the chin; usable later for one-line pops only.
- `restaurant/r06_ama_mcu_talk`: usable 52–89 = 1.5 s (rest has posture issues) – too short to loop.
- `restaurant` "single" clips r04/r05/r07/r08 (Ama, 0.8–2.3 s usable) look at the waiter off-screen, not at camera; r02/r03/r09 are Priya (excluded).
- `anchor` a04/c04 *listen*, a05/c05 *react* (no mouth set), two-shots t01–t03, wide w01: not single-teacher to-camera talk.
- Daniel (hotel h02/h03/h09) and Mei (airport a01/a03/a08) exist only as over-the-shoulder counter staff → no to-camera teacher clip.

Rotation used by the 6 samples (≥ 2 teachers, ≥ 3 sets): Carlos·studio (mistake, borrow/lend), Ama·studio (5 words, pronunciation), Ama·hotel (guess), Ama·airport (roleplay).
Clip joins: the renderer scores every candidate join (same clip loop point or another talk clip) on the whole frame + 2× the face, and takes the best;
an 8-frame dissolve hides the join. Render 1 showed that dissolving between DIFFERENT talk clips ghosts the eyes (head positions differ by 10–20 px), so in
practice each video forward-loops one clip at 2–3 varied loop points (never reversed); the last 14 frames dissolve forward into frame 0 (loop-clean).
Truly different talk clips per video need new loops filmed from the same locked pose (see §3).

## 2. Head mask and layout (v8 fix)
`head` in teachers.json = hair + ears + chin + neck over the whole clip (13-frame average with sway), in source pixels. qc_v9 `head_clear` fails if any
caption / pop / hook box touches it on any frame (moved with the camera, both clips during a dissolve). There is no room above the head in any clip
(studio: ~55 px above the hair at max zoom), so all pops live in the band under the chin, captions at y 1410 centred on x 540.

## 3. More teachers – what to generate (ESTIMATE ONLY, nothing spent; docs/CREDIT-RULES.md applies)
Each new teacher needs **2 angles × one 10 s to-camera MCU talk loop** (Kling v2.5 1080p, neutral seated or standing teacher pose, hands visible and still,
no text/logo, mouth closed at start and end so the loop dissolves cleanly), first frames made from the character ref sheet.

| Teacher | Look (US) | Voice | First frames (1 cr each) | Clips (10 s ≈ 50 cr each) | Base | Cap incl. one retry per item |
|---|---|---|---|---|---|---|
| Daniel | Black American man, late 20s, round gold glasses, short afro, moss-green blazer (recast from the British receptionist) | am_michael | 2 | 2 × 50 | 102 | 153 |
| Mei | Chinese-American woman, early 30s, black bob, plum blazer | af_sarah | 2 | 2 × 50 | 102 | 153 |
| Jake | white American man, 30s, light-brown hair, navy crew-neck | am_puck | 2 | 2 × 50 | 102 | 153 |
| Sofia | Latina American woman, 20s, dark wavy hair, mustard cardigan | af_nicole | 2 | 2 × 50 | 102 | 153 |
| **Total** | | | 8 | 400 | **≈ 408 credits** | **≈ 612** |

Order per CREDIT-RULES: 0-credit work first (done: 2 teachers × 3 sets already rotate) → analysis ticket per clip → first frame (1 cr) checked
(pose, 180°, hands, no text) → ONE 10 s clip → frame-by-frame review → only then the second angle / next teacher; stop after 2 fails.
Add each clip to `teachers.json` with a measured head mask and a Rhubarb mouth set (scripts/cine bank tools) before use.

## 4. Teachers bank v1 – CLASSROOM (generated 25/10/2026, 524 / 650 credits)
Owner decision 25/10: every new teacher clip in ONE bright American classroom ("our school": window with daylight, big BLANK whiteboard, student desks, light-oak teacher desk).
Bank: `brand/library/cine/teachers/bank.json` (schema = anchor bank + `head`, `anchor`, `loop`, `voice`, `set`); binaries in `lexkite-footage/teachers/` (clips/, tools/dl24, tools/meta, frames/, refs/); ledger + prompts in `brand/library/cine/teachers/tools/`.
Sets in teachers.json: `classroom` (seated MCU, whiteboard behind/above the head = text zone, desk front = caption zone) and `classroom_board` (standing beside the board, board = text zone).

| Clip | Teacher (voice) | Framing | Usable | Score | Note |
|---|---|---|---|---|---|
| d01_daniel_class | Daniel (am_michael) | MCU frontal | 0–227 | 90 | pilot; master set frame `frames/d_class.png` |
| d02_daniel_ang2 | Daniel | MCU ¾ from left | 0–216 | 89 | |
| m01_mei_class | Mei (af_sarah) | MCU frontal | 0–213 | 87 | 2 brief side glances |
| m02_mei_ang2 | Mei | MCU ¾ from right | 0–239 | 88 | |
| r01_ruth_class | Ruth (af_kore) NEW, early 60s | MCU frontal | 0–240 | 89 | |
| k01_kai_class | Kai (am_liam) NEW, Native Hawaiian American | MCU frontal | 0–228 | 88 | |
| a02_ama_board | Ama (af_bella) | standing medium, whiteboard | 0–223 | 85 | eyes open ~75 % |
| c01_carlos_board | Carlos (am_fenrir) | standing medium, whiteboard | 0–199 | 84 | mouth track 0.87 (head yaw) – short lines |

Rejected: d01_daniel_talk (studio set before the classroom decision, motion fine), a01_ama_board (eyes closed ~45 %, stance shifts, face too small).
Lessons: Kling local-file upload is blocked in the sandbox → refs go to lexkite-media `cine/teachers/` (tools/putmedia.sh); standing "explaining" clips need "eyes wide open" + "legs locked" and a head→thigh framing; ¾ angles from the accepted frontal frame work first try; bank.py face box must be aimed at the mouth (it locked on an eye twice).
Board text is done (§5). Kai's voice: am_liam is graded D in Kokoro's voice list → **am_puck** (C+, US male); Ruth keeps af_kore (C+).

## 5. Text on the whiteboard (render_v9 board mode, 25/10/2026, 0 credits)
- `scripts/video/tpl/board_detect.py --foot <lexkite-footage>` measures every classroom clip ONCE → `bank.json clips[*].board`: board quad (RANSAC
  edges), text `zone` (board-white in EVERY frame, off the head, inside the safe area at every camera scale), caption box on the calm desk lip /
  floor, camera anchor (= caption centre) and the moving-body envelope (`body`, run-lengths) for qc `caption_clear`.
- render_v9: the hook + text pops are written on the board (navy ink, red/green ink, yellow/mint = highlighter, no stroke, board perspective);
  a widget goes on the board when it reaches 48 px there, else the under-chin band (text pop: 50 px). Classroom MCU camera is locked (smax 1.0).
- Measured board room (px, frame 1080×1920; hook needs ≥ 60 px → ~2×64 px rows):

| Clip | Zone w×h | Hook fits? | Caption body overlap (rows of 104) |
|---|---|---|---|
| r01 Ruth MCU | 528×142 (strip above the hair) | yes, 2 rows ≈ 62 px; widgets (quiz, CTA) fall back to the band | 41 (fingertips on the desk lip) |
| d01 Daniel MCU | 530×124 | no (52 px) | 43 |
| d02 Daniel ¾ | 316×508 (right of the head) | only picture-card hooks; text rows < 50 px | 0 |
| k01 Kai / m01, m02 Mei | ≤ 90 px strip or ≤ 146 px column | no | 0–41 |
| a02 Ama / c01 Carlos standing | 818×320–340 | yes, everything on the board | a02: Ama's hip/hand beside the 640 px column; c01: Carlos' hand edge |

- So the v2 samples (content/video/cine/news/templates-v2) use Ruth (mistake), Carlos at the board (5 words, borrow/lend, roleplay) and Ama at
  the board (guess, pronunciation). Daniel/Mei/Kai need a re-framed clip to carry board text: seated lower in frame (≥ 250 px of board above the
  hair) or standing beside the board like a02/c01 (≈ 50 cr per clip + 1 cr first frame, docs/CREDIT-RULES.md).
