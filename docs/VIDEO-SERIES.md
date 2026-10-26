# Video series plan (owner 26/10/2026)

> TL;DR: 6 numbered series on the v10 templates, ONLY topics our automatic pipeline does well (§Strength filter). Each episode teaches ONE useful point and gives the viewer a reason to save it (a list or rule they will need later) and a reason to share it (a common mistake, a challenge or a quiz). Teaching pace is 0.8 with a 0.5–0.7 s breath between sentences (qc gate `pace`, ≤ 150 wpm). Voice, captions and mouth are all derived from the same audio (gates `caption_sync` and `lipsync_rhubarb`). Viral rules: `VIDEO-SCALE-PLAN.md` §12–13.

## What goes viral AND helps the learner (ranked)
| # | Series (template) | Why people save / share / comment | Level |
|---|---|---|---|
| 1 | **Stop Saying This** (`mistake`) | Share: "send this to a friend who says it". Comment: "I said this for years". The mistakes are real L1 transfer errors, so the video has real value. | A2–B1 |
| 2 | **Same or Different?** (`pair`) | Save: one rule settles a confusion for good. Comment: people argue over the answer. | A2–B2 |
| 3 | **Where's the Stress?** (`pron`, word stress ONLY) | Challenge: viewers test friends. Stress dots are screenshot-worthy. Only words whose CMU/IPA stress matches and whose TTS audio round-trips through whisper. | all |
| 4 | **Say It Like a Native** (`words5`) | Highest save rate: 5 ready-to-use alternatives, a list people keep. | B1–B2 |
| 5 | **US or UK?** (`pair`, twin tiles) | Comments: people argue over which they use. Save: the word table. All text + pictures, a perfect fit for automation. | A2–B2 |
| 6 | **Guess the Word** (`guess`) | Comments: viewers type their answer before the reveal. A cheap engagement episode between heavier ones. | A1–B1 |

## Episode bank (first 10 per series, in order; text scripts self-reviewed, not sent to owner)
1. Stop Saying This: I am agree · discuss about · explain me · I have 20 years old · return back · very like · open the light · How to say…? · I'm boring · Me too (negative → "Me neither").
2. Same or Different?: borrow/lend · say/tell · fun/funny · bored/boring · make/do · lose/miss · since/for · already/yet · hear/listen · remember/remind.
3. Where's the Stress?: comfortable · vegetable · photograph/photographer · develop · hotel · event · record (n/v) · present (n/v) · banana · interesting.
4. Say It Like a Native: instead of very good · I think · sorry · thank you · I don't know · very tired · very big · I'm busy · goodbye · I like it.
5. US or UK?: elevator/lift · apartment/flat · cookie/biscuit · fries/chips · vacation/holiday · sidewalk/pavement · trash/rubbish · line/queue · gas/petrol · check/bill.
6. Guess the Word: elevator/lift · receipt · luggage · cashier · pharmacy · sidewalk · appointment · refund · umbrella · neighbor.

## Strength filter (owner 26/10: only teach what the automatic pipeline does well)
**Strong (use):** one teacher explaining to camera + text on the board + picture cards. Common mistakes, confusing pairs, US vs UK words,
5-way alternatives, collocations, verb patterns, prepositions, short grammar rules with one example, picture-word quizzes, word stress.
Every one of these is checkable by machine: the source of truth is our own data (usage DB, lexicon, CMU/IPA, img.json), not the AI's opinion.
**Weak (do not make):**
- Multi-character dialogue / roleplay acted by one host (the bank has one host per clip; two-voice scenes are paused, `VIDEO.md`).
- Sounds, accents, intonation, connected speech, "wrong vs right" pronunciation: TTS cannot say the wrong form reliably and nobody checks the audio.
- Emotion or acting, gestures that point/count/hold objects (the gesture bank is neutral by design).
- Slang, memes, trending phrases (they date fast, and an AI judge cannot verify current usage), culture/politics/religion, idioms with no checkable source.
- Long listening or story content (> 35 s, a talking head cannot hold it) and exam-strategy claims we cannot prove.
A topic is admitted only if its key fact comes from our data and a QC gate can verify it; otherwise it goes to `review.jsonl`, never into the bank.

## Scale pipeline (standard for v10; details `VIDEO-SCALE-PLAN.md` §5, §7, §16)
1. **Point bank** (`scripts/scriptbank`, 21,221 unique `pid` from usage/grammar/lexicon) → filtered by the strength filter above.
2. **Planner**: series × point × level × teacher × set × hook style × layout × accent colour. Each clip differs from the last 30 on ≥ 4 of 7 axes; the content hash (point + key sentence) is never reused.
3. **Script** (deterministic template + data) → `lib.qc` → AI judge only scores (≥ 4) → `reviewed-hooks.json` (hook_true).
4. **Render on GitHub Actions** (0 credits): Kokoro 0.8 → Rhubarb mouth → whisper word clock → render_v9 → qc_v9 (27 gates incl. pace,
   caption_sync, lipsync, min_text_px, continuity, host_sharp) → rubric ≥ 90 → pHash/chromaprint vs every published clip.
5. **Queue** → Admin "Chờ duyệt" → owner approves → publish. Cron/bulk only after the owner approves the template samples.
6. **Feedback**: save/share/completion per series → re-weights the planner each week. New template ≥ 1 per month so the look never goes stale.

**Honest ceiling:** truly different videos ≈ unique points × useful angles (≈ 21k × 2–3 ≈ 50k). Beyond that, extra variants repeat the same lesson,
and platforms down-rank mass-produced repeats. "Millions" therefore means growing the point bank (more usage data and levels),
not re-skinning the same points. Platform caps: ≤ 2–3 posts per channel per day.

## Production standard (owner-approved 26/10/2026, `content/video/cine/news/approved.json`)
- Host clip plays **as generated** (`host_fx: raw`): no mouth swap, no hold smoothing – processing the teacher caused the visible glitches. The mouth talks but is not word-synced.
- Footage bank, not per-video generation: chained Kling clips per teacher (2D and 3D alternate for variety); videos reuse the bank at 0 credits.
- Layout v12: one left board column – lesson cards (word / IPA / meaning / example), left-aligned quiz with equal pills, 'SAVE THIS' card, one-line captions; qc text_on_board / head_clear / caption_clear catch any overflow.
- Pace ≤ 130 wpm (qc `pace`), 0.6–0.8 s breaths; IPA from the app dictionary (Noto Sans glyphs).
- **Mouth tempo = voice tempo (owner 26/10).** The host mouth is never edited, so the FOOTAGE must match the voice: (1) bank talk clips are
  generated with a slow teaching cadence ("speaks slowly and calmly, gentle mouth movement"); each clip's mouth cadence (open/close cycles per
  second, measured on the face crop by `scripts/video/tpl/mouth_tempo.py`) must sit within ±20 % of the voice syllable rate (≈ 2.0–2.4 syl/s at
  ≤ 130 wpm), else the clip is not used for talk; (2) speech-gated assembly: talk clips play only while the voice speaks; pauses, the 3-2-1 count
  and the your-turn beat use the teacher's **closed-mouth listen/nod clip**; (3) every bank teacher therefore has ≥ 3 chained talk clips + 1 listen
  clip (2D and 3D). Voice pace itself stays ≤ 130 wpm (qc `pace`).

## Core series (owner 26/10: keep only what fits the build – raw host, v12 lesson card, quiz, IPA, img.json pictures, our own data)
| # | Series | Web areas (CTA) | Fit |
|---|---|---|---|
| 1 | Guess the Word | dictionary, reading | picture clues from img.json (→ 20k words), 3 s count, IPA |
| 2 | Stop Saying This (= Don't say… Say…) | grammar-check | real errors from our data, ✗/✓, quiz |
| 3 | Same or Different? (+ 3-second quiz affect/effect) | word-usage | two lesson cards, memory trick |
| 4 | US or UK? | word-usage, dictionary | owner: "dễ hiểu rành mạch"; flags + pictures |
| 5 | Where's the Stress? | pronunciation | approved into the bank (approved.json) |
| 6 | Say It Like a Native (incl. Native vs textbook) | vocab-review, paraphrase | 5-word card, save-worthy |
| 7 | Grammar in 60s (incl. Ama asks why) | grammar | one rule, ✗/✓, quiz (889 grammar points) |
| 8 | Phrasal Verb in 30s | phrases | meaning card + example + scene picture |
| 9 | Word in Context (IELTS / TOEFL / TOEIC tag) | ielts, toefl, toeic | academic / office word + real sentence |
| 10 | Verb Forms Challenge (go / went / gone) | verbs | simple, visual; one small new template |
**Dropped / parked:** POV office, Mia's cringe, trend remix (acting/memes); Office English 101 (multi-character); Word Story (etymology hard to verify);
IELTS Speaking Band 7+ (long answers > 45 s); TOEIC Part 5 Speedrun (busy, small text); listening fill-in and level test – later, after the 10 run well.
Rotation fills zero-coverage areas first; each episode = one point, IPA, example, picture when img.json has the exact key.

## Series rules (every episode)
- Hook ≤ 1.5 s naming the payoff ("99 % of learners say this wrong"). The hook must be true (hook_truth gate).
- Fixed series look: title chip "Stop Saying This · Part 7", series colour, same teacher per series (consistency gives follows).
- Spaced repetition: the last 2 s recall the previous episode ("Remember: I agree, not I am agree"). The app's SRS deep-link is the CTA.
- Save driver on screen at the end: summary card "Save this for later" (rule or list, screenshot-ready).
- Share/comment driver: an open question or quiz. The pinned comment holds the answer.
- Rotation: 1 video/day, the 6 series in turn (mistake and pair twice a week). Difficulty mix 40 % easy / 40 % mid / 20 % "challenge".
- Measure per series: save rate, share rate, completion ≥ 70 %. Weight next week's rotation toward the winners.

## Gate (owner)
Bulk episodes only after the owner approves the re-paced v10 samples (`video-approval-gate`). Until then: ≤ 3 samples per round.

## Pipeline v10 – how to run (series generator, 26/10/2026)
1. **Generate** (deterministic, no AI): `python3 scripts/video/tpl/gold2v9.py` reads the gold bank `content/video/scripts/bank/*.jsonl` and writes
   `content/video/cine/news/series/<slug>/<id>.json` (v9 specs, same line/pop/anchor pattern as the templates-v2 episode-1 gold specs) + `plan.json`
   (episode order, skipped items with reasons) + `reviewed-hooks.json` (verdicts). Series: `stop-saying-this` (mistake, Daniel) and
   `same-or-different` (pair, Carlos). Every sentence is a bank field or a fixed connective. Self-checks: 50–80 words (gold band 55–76), est. ≤ 45 s,
   key indices inside lines, quiz answer spoken, CTA "Save this, and … on lexkite.com.", hook ≤ 6 words on screen, error phrase only in the error line.
   `--check` = dry run. Re-running keeps a verdict only while its script + hook are unchanged.
2. **Review** (gate 1): `python3 scripts/video/tpl/review_queue.py <slug> 10` prints the next unreviewed episodes; record with
   `--ok <id> "note"` / `--bad <id> "why"`. Fixes go into the bank line (then regenerate), never into the spec by hand.
3. **Render** (CI only): dispatch `video-series.yml` with `series`, `ids` (or `count` ≤ 12 = next reviewed, unregistered episodes). It refuses
   unreviewed specs, renders a matrix (Kokoro 0.75 → Rhubarb → whisper clock → render_v9 → qc_v9 against the series verdict file), then the
   dedupe job checks `series/registry.json` (content hash = series + key sentence; 8-frame pHash, Hamming ≤ 6 on ≥ 6/8 = duplicate) and goes red
   on any duplicate or when 0 videos pass.
4. **Approval gate** (owner): output is an artifact only (no store, Drive or publish). After the owner OKs a video, register it with
   `python3 scripts/video/tpl/series_dedupe.py add content/video/cine/news/series/registry.json <entry.json>` and commit; publishing is a separate step.
