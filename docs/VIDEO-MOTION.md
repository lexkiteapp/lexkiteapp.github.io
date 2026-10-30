# Video motion layer – Stitch cards + Remotion (28/10/2026)

> TL;DR: v14 host plate (render_v9 --overlay) + Stitch Tactile Night cards drawn by Remotion at 60 fps, every element appearing on its spoken word (±80 ms); CI-only workflow video-motion, 0 credits; gates = qc_v9 + qc_motion.

Owner 28/10: "dùng tạo animation chuẩn đẹp khớp hơn + stitch". The learning shorts keep the approved v14 host engine
(render_v9.py, Kokoro voice, captions, 0 credits) with the ONE registry character set (2D Ama/Carlos, `web/teach/characters.json`); the lesson graphics are Stitch "Tactile Night" cards drawn and
animated by Remotion at 60 fps, every element keyed to the spoken word. QC contract: docs/VIDEO-TEMPLATES.md §16.

## Pipeline (CI only: `.github/workflows/video-motion.yml`, never render locally)
1. voice: Kokoro + Rhubarb + word clock (`pilot5_voice.py`), same as video-templates9.
2. hosts (30/10, #201 registry gate): set `reg2d` – `scripts/video/motion/registry_plate.py` composites the registry green-screen clips
   (`gc11_*`/`ga11_*`, spec ids = registry src ids) over the Teach2D dusk canvas, one eye line + head size for both teachers, teacher right
   of centre; writes the clip entries render_v9 reads (`--teachers`). The old 3D classroom clips stay retired (registry.check blocks them).
3. plate: `render_v9.py --overlay` = teacher + captions + audio; pops planned but not drawn, no pop sfx, writes `host_move`
   (per-clip moving-body mask). Spec `"layout": "right"` = v14 medium shot (host lowered 180 px, wall above, inside the top UI band)
   with the host kept at its native x → full-width top card + left column free.
4. overlay: `scripts/video/motion/build_overlay.py` – free area = SAFE − head − moving body (camera push included) − caption plate;
   ONE fixed top-card rectangle + left column; text measured with the fonts Remotion uses (Plus Jakarta Sans 800, Noto Sans IPA).
5. render: Remotion composition `stitch-short` (`scripts/video/remotion/src/stitch/`), 60 fps over the plate, CRF 16.
6. QC: `qc_motion.py` – every qc_v9 gate on a 24 fps proxy (overlay cards as elements, card fills re-measured on the frames) + motion gates.

## Motion rules (core.py == core.mjs, parity test `scripts/test/motion-core.mjs`)
- Entrances: `rise` (fade 0.12 s + spring 0.94→1, 36 px lift), `pop` (bouncy, checks/+XP/ring), `draw` (strike 0.30 s), state mix 0.18 s.
- `in.t = word start − HALF[kind]` → the element *appears* (alpha 0.5 / half drawn / state midpoint) on its word. Gate ±80 ms.
- Static after `SETTLE` (≤ 0.45 s): nothing moves while text is read; only value widgets change (countdown ring, +XP, band number/bar).
- Cards in one slot hand over without overlap (leave 0.17 s before the next appears). Hook from frame 0 (full ≤ 0.12 s); end card gone 0.4 s before the end (clean loop).

## Templates (`content/video/cine/news/templates-motion/`, block `motion`)
| type | host | elements |
|---|---|---|
| drill | Carlos | hook · question card (blank slot, 3-2-1 ring, +XP) · A–D pills on each spoken option, ring→✓ on the answer · watch-out card |
| mistake | Ama | ✗ sentence with strike drawn on "am" · BETTER card (word, audited US IPA, stress dots lit on the word) · disagree card |
| tip | Ama | hook · rule card: FOR tile then SINCE tile on their words, examples on their words · summary card |
| ready | Carlos | "Can you reach Band 7?" · 2 quick questions (pills, ring, +XP) · band bar 5.0→6.0→6.5→7.0 with target flag |
| end card | all | app icon + 100 % FREE (top) · QR (deep link) + CTA + lexkite.com (column) |

Row grammar (top / col cards): `chip`, `line` (body 76 px, `hook` 100 px, `slot` = blank replaced on `reveal`), `sub` (46 px, wraps),
`ipa`, `dots` (syl, stress, hit), `tile` (tag, lines, ex, ex_at, at); `strike`, `xp`, `ring` (count beat id). Sizes follow the v10
phone floor (cap: hook ≥ 72, body ≥ 56, card lines ≥ 25).

## Gates (qc_motion.py) – besides all qc_v9 gates
overlay_timing (±80 ms vs the plate word clock, token match) · overlay_sync_px (pixel change across the word, none before) ·
overlay_host (no card on the head box / moving-body mask, every frame) · overlay_still · file60 (60 fps, = plate duration, AAC) · av_sync (≤ 10 ms).

## Embedded lesson videos (same data + components)
- `embed_spec.py`: the short spec minus the social lines (`embed.drop`), plus ONE hand-over line (`embed.end`), TTS speed ×0.94, 0.8 s breaths.
- Plate: `render_v9 --overlay --clean` (caption-free twin of the plate, same frames + audio). Formats (`build_overlay.py --format`):
  `wide` 1920×1080 = cards on the dark canvas left + the teacher in a rounded window right; `sq45` 1080×1350 = plate cropped around the teacher.
- Calmer motion (no bounce, no +XP), 30 fps, H.264 CRF 30 (≤ 0.30 MB/s), poster JPG, captions `*.en.vtt` (one cue per line, translatable) +
  `*.chapters.vtt` (one per top card). End card = "Up next … / Next step →" (no QR, no follow, no lexkite.com).
- Gates: overlay_* on the format's own canvas/safe area, same text floors, timing / pixel sync / host / still / AV, vtt_captions, chapters, embed_no_follow_cta, file size.
- Delivery: the existing lesson player `web/js/lesson-video.js` (lite YouTube facade, self-hosted fallback on R2 media.lexkite.com, manifest
  `/data/videos.json`, docs/VIDEO-STORAGE.md) – no new service. Upload / manifest entry only after the owner's OK.

## Host layer (owner 28/10: the 2D/2.5D puppet hosts every video)
The overlay never draws the teacher. `src/stitch/hosts.js` registry: `host.kind = 'puppet'` → the puppet component (`<Teacher {...host} t fps/>`,
session puppet-2d-ama); geometry `content/video/puppet/<who>.json` {head, envelope rows} → `build_overlay.py --host-geom`. Until it lands the
samples use the render_v9 footage plate as a placeholder, tagged "PLACEHOLDER HOST" (top-left, inside the platform UI band).
