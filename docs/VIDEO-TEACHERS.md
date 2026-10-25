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
