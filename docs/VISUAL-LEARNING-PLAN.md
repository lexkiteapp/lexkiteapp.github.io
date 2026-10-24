# Visual learning plan: where images help beyond vocab cards

Owner request, 24/10/2026. Every image here goes through the same pipeline as the vocabulary images: `scripts/vocab-img/scene-gen.mjs` generates it, `local_judge.py` and the GrabCast vision judge must both agree, it is encoded as WebP and AVIF at 6 KB or less, it is stored in a media repo (`infra/media-repos.json`, never Pages), and the same weekly 5 % spot check applies. The display rules are the same too: fixed boxes, decode before showing, zero layout shift (docs/LEXICON.md § Quy tắc tích hợp hình).

## The candidates

The table orders the candidates by value for effort. Storage is the number of images × about 9 KB for the WebP and AVIF pair.

| # | Surface | Learning value | Image type | Count | Storage | Effort | Order |
|---|---|---|---|---|---|---|---|
| 1 | **Topic covers** for the 50 topic sets (`content/lexicon/topics.json`) | Medium. A recognisable cover speeds up choosing a set and anchors the theme (dual coding at set level). | AI scene, style s1 | 50 | ~0.5 MB | Low: the prompt is built from the topic name, so no card writer is needed | **Phase 1 (now)** |
| 2 | **Confidence lesson scenes**, one per situation (24 units, `content/confidence/units`) | High. The situation (airport desk, doctor, interview) primes the role-play and lowers anxiety before speaking. | AI scene, style s1 | 24 | ~0.2 MB | Low: the prompt is built from `goal.en` and `aRole` | **Phase 1 (now)** |
| 3 | **Grammar timelines and diagrams** (tenses, conditionals, articles, prepositions) | Very high. Timelines are the standard explanation for the tense system, and they are exact. | Deterministic SVG (same family as the `concept.mjs` c1 tiles) | ~60 | 0 (inline SVG, about 1 KB each) | Medium: one generator per diagram family, plus review of each diagram | Phase 2 |
| 4 | **Quiz feedback visuals** (correct or wrong, plus the sense image) | Medium. It reinforces the sense at the moment of feedback, using the existing 64 px quiz role. | Reuses the sense image (`VImg` role `quiz`) | 0 new | 0 | Low: wiring only | Phase 2 |
| 5 | **Pronunciation mouth and tongue diagrams** for the 56 sounds | High for hard sounds (θ ð æ ʌ ɜː, r and l). | SVG sagittal diagrams drawn by hand or from a parametric template. AI is unsuitable because the anatomy must be exact. | 56 | 0 (SVG) | High: phonetic accuracy needs expert review | Phase 3 |
| 6 | **Listening part scene thumbnails** | Medium. They set the context before audio plays. | AI scene, style s1 | ~1 per part, ~200 | ~1.8 MB | Medium: a prompt from the part's context line | Phase 3 |
| 7 | **Reading passage header images** | Low to medium. They are mostly engagement, and they risk distracting from the text. | AI scene, style s1 | ~1 per passage, ~300 | ~2.7 MB | Medium | Phase 4 |
| 8 | **Writing Task 1 charts** | High, but the charts are **already data-driven**, rendered from data rather than images, so this needs no AI. | Existing chart renderer | 0 | 0 | None | Done or not needed |

## Phase 1, implemented 24/10

- **Keys.** Topic covers are `topic:<id>` and confidence scenes are `conf:<id>`. They are produced in the same run as the abstract-sense pilot (workflow `vocab-img-scene.yml`, mode `pilot`), and `scene-gen.mjs` `lessonTarget()` builds their prompts and judge targets.
- **Gates.**
  - The local judge checks CLIP rank 1 against the sibling topics or situations plus random distractors, and caption agreement through MiniLM.
  - The GrabCast vision judge describes the image blind, and that description must also rank its own target first.
  - The remaining gates are OCR, NSFW, style centroid, pHash and size.
- **Status: not published yet.** Publishing waits for the owner to approve the pilot contact sheet, as with the 20k scale-up. Once approved, the plan is:
  - a manifest `content/visual/lesson-img.json` (owned by `vocab-img-scene`), `{key: {h, alt, at}}`;
  - files in the open media repo;
  - the topic picker and the confidence lesson header read through `VImg.pic` with role `card` (120 px) for topics and `dict` (160 px) for lesson headers.

## Rules for every phase

- One image role and size token per surface (`VImg.SIZE`), in fixed aspect boxes with `--radius-sm` corners.
- An image appears only after `decode()`, with a 150 ms fade, or no fade when reduced motion is on.
- Save-data mode and 2G turn images off. Devices with 2 GB of memory or less get no @2x versions.
- Dark mode shows only transparent-background images (`a`). Scene images always carry their sentence underneath.
- Bookkeeping lives in git manifests only. There are no D1 writes and nothing goes into Pages. Each phase is a job in `infra/jobs.json` with a lease and a budget from the coordinator, and it touches only its own files.
