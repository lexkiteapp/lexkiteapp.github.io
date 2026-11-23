# Teach2D – English-teaching video templates (29/10/2026)

> TL;DR: one Remotion pipeline, 16 templates (5 batch-generated from data, see Batch), ONE 2D teacher (Ama or Carlos from `web/teach/characters.json`), Lexkite Kit cards (Stitch, dark A / light B), every element on its spoken word, 9:16 social + 16:9 lesson embed from the same data. CI only (`teach-video.yml`), 0 credits. QC before AND after render. Bulk only after the owner OKs the pilots.
> Read when: making or changing teaching videos. Older engines: `VIDEO-MOTION.md` (#191 overlay on render_v9 plates – superseded here), `VIDEO-SERIES.md` (series rules, still valid).

## Pipeline (`.github/workflows/teach-video.yml`, never on the Mac)
1. **preqc** – `gen.py` regenerates `content/video/teach2d/eps/*.json` from `pilots.json` (must be identical) + every script == `reviewed.json` (hook true) + motion parity test.
2. **voice** – Kokoro with the registry voice of the teacher shown (Ama `af_bella`, Carlos `am_fenrir`) → Rhubarb → faster-whisper clock on the exact caption tokens (`pilot5_voice.py`).
3. **render** (per pilot × short/wide) – `rig_host.mjs --geom-only` (static TeacherRig geometry) → `build.py` (every look/layout) → `rig_host.mjs` on the timeline (TeacherRig drawn frame by frame on a fake page clock, mouth = this voice's Rhubarb visemes → `rig.webm` VP9 alpha + `rig.frames.json`, page == core simulation, re-render byte-identical; spec `docs/specs/video-production-v2.md` §1; `host.py` registry talk/listen stays for the old path) → `build.py` (layout, cues, captions, voice −16 LUFS + soft ticks, QR deep link) →
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
| `roots` | Word Roots (Gốc từ, 17/11) | `content/video/teach2d/roots.json`: 40 Latin / Greek roots × 6–10 real words; IPA / definition / example from the audited bank | `#/dict/<first word>` |
| `slang` | Slang Card (22/11, 7–12 s, [SAY-NATIVE.md](SAY-NATIVE.md#slang-card-2211--dòng-clip-ngắn-viral-thẻ-lóng--biểu-cảm)) | `content/say-native/slang.json` (≥ 300 thẻ lóng sạch) + TeacherRig EXPR biểu cảm mạnh; carousel vuông `card.py` | `#/phrases` |
| `guess3` | Guess in 3 Seconds (23/11, 7–12 s, growth series #2, `GROWTH-1M.md` §2) | audited word bank + `img.json` picture of the exact `word#n` sense (30 s `guess` data source; Noto-emoji icons or conf ≥ 80 scene with a physical-thing gloss; TEXT_OBJ gate = no text in pictures) | `#/dict/<word>` |
| `levels3` | One Situation, 3 Levels (23/11, 10–13 s, growth series #3, `GROWTH-1M.md` §2) | `content/video/teach2d/levels3.json` (64 situations: the same line at A1 / B1 / C1 + note + register; gates `node scripts/say-native/levels3.mjs --check`) | `#/phrases` |
| `band` | Band 5 to 9 (20/11, [spec](specs/band-upgrade.md)) | `content/video/teach2d/bands.json`: 14 topics × 3 hand-written model sentences (IELTS band 5 / 7 / 9) + one reason and criterion per upgrade | `#/write` · `#/speaking` |

## Guess in 3 Seconds – `guess3` (23/11, growth series #2)
- Script: hook (≤ 6 words, 3 true variants) → **2.6 s silence = the 3-2-1 ring** over the picture with the word hidden (blank letter tiles; the viewer guesses in the comments) → `Answer: <word>!` (tiles fill, word + IPA) → bank meaning → bank example → `lexkite.com`. Kokoro 1.25× (one voice), Ama / Carlos alternate, drawn-face EXPR (`confused` / `smirk` / `hype`) held through the countdown.
- Rows: `gen.py --guess3-eps N` (like `--slang-eps`) → auto.json + reviewed.json with machine gates **data** (facts == bank + the picture is this word sense) · **level** (spoken words ≤ B1 NGSL, ≤ 1 residual, taught word exempt) · **hook** (one of `G3_HOOKS`) · **dup** (word / picture pHash ≥ 10 bits, not a 30 s `guess` word) · 7–12 s. Test `scripts/test/teach2d-guess3.py` (preqc `gen`). Carousel: `card.py` (guess3 branch: guess / answer + teacher / sentence + filled tiles + CTA). Template approval stays `draft` until the pilots pass QC ≥ 90 short + wide.

## One Situation, 3 Levels – `levels3` (23/11, growth series #3)
- Script: hook `<situation>: three levels!` + situation chip → **A1 line → B1 line → C1 line** (one Kit card each over a 3-step track, level badge, key phrase highlighted, short note; each line has its own TeacherRig face `shrug` → `smirk` → `smug`, `rig_plan` `exprs`) → silent quick quiz in the C1 pause (which key phrase would a native say? answer lights on the CTA) → `lexkite.com`. Kokoro 1.2× (one voice), Ama / Carlos alternate, est. 9–12.4 s (+ end-card tail = 10–13 s, qc `duration` 9.5–13.5 s), ≤ 150 wpm.
- Bank `levels3.json` + validator `levels3.mjs --check` (npm test): ≥ 60 situations; A1 line = audited-bank A1 words only, B1 ≤ B1 (bank cefr / NGSL), C1 = real words and a key phrase that occurs in repo English text (lexicon examples, situations, lessons, roleplay, listening, notes, slang bank; `vouch:true` only as a visible exception, ≤ 10), three different lines, hook + lines ≤ 24 words, ad-safety (slang.mjs blocklist + no alcohol).
- Rows: `gen.py --levels3-eps N [--ids a|b|c]` → auto.json + reviewed.json with machine gates **data** (row facts == live bank) · **level** (hook + A1 + B1 lines ≤ B1 NGSL) · **hook** (title + fixed claim) · **dup** · est. length. Test `scripts/test/teach2d-levels3.py` (preqc `gen`). Carousel `card.py` (levels3 branch: cover · the three lines · quiz + CTA). Scene = the Kit canvas: the café / airport footage plates are another engine (cine) and not wired into Teach2D, so none is used. Approval stays `draft` until the 3 pilots pass QC ≥ 90 short + wide.

## Variety (owner 29/10: "đa dạng, đỡ nhàm chán")
- Fixed per series (recognition): series chip + series tint on the canvas (`theme.json` tints: US/UK teal, Verbs gold, Stress coral, Stop Saying red-coral, Phrasal mint) + one teacher per series.
- Layouts (`build.py --layout`, same cards + timing): `corner` (teacher bottom-centre) · `side` (teacher left, larger, caption right of the head) · `bubble` (big card, teacher in a round Kit call window). Every pilot ships a layout board (`layouts.jpg`).
- Rotating per episode (batch only after the owner's OK): hook style (question · challenge · "most learners…" · myth), layout, example scene. Look = `dusk` (owner pick 29/10).
- Planner rule: no two consecutive videos share template, teacher or look; a point (content hash) is never reused; ≥ 1 new template per month (`VIDEO-SERIES.md`).

## Mix – the 0-credit build bank (owner 5/11: "kho dựng 0đ, hàng triệu clip, không lặp")
- Every clip = episode (template × data row × teacher, reviewed script untouched) + one seeded combination of pieces we already own: `scripts/video/teach2d/mix.py` → `content/video/teach2d/mix.json` (render order = pilots then auto, seed = sha256(episode id), regenerated identically in preqc).
- Axes: layout 3 · canvas blob arrangement 4 (`TeachShort.jsx` BLOBS, series tint always large and high) · music 6 (`synth.mjs`) · camera rhythm 4 (`build.py` FR) · hook stinger 4 + card swish 2 (`brand/library/sfx`) · silence gestures after a teaching line / after the quiz answer (TeacherRig pose gestures with the teacher's OWN approved image only – an `alt` stand-in is not counted as variety).
- Anti-repeat: no axis repeats the previous clip; background (layout+canvas) and opening (hook+cam) never repeat in the last 6, gestures and music never in the last 4. Diversity = mean pairwise normalised Hamming distance per 6-clip window, gate ≥ 70 (`mix.py --check`, `scripts/test/teach2d-mix.py`). `mix.py --stats` = pieces, distinct clips, score.
- Kling only ADDS a new kind of piece (a new approved gesture image → it enters the gesture lists automatically via `characters.json`); never per clip. Look stays `dusk` (owner pick); dark/light are an axis only after the owner says so.

## QC gates (`qc.py`, all must pass, weighted score ≥ 90)
voice_teacher · pace ≤ 150 wpm · caption_sync (caption == script == whisper) · lipsync_rig (rig host: every Rhubarb cue ≥ 50 ms on screen within ±33 ms, X in silences > 0.35 s, no pose over the mouth while the voice is on, frame count; `lipsync_gate.py`) · mouth (registry host: talk only while speaking, closed-mouth listen in pauses > 0.35 s) · hook · cue_timing ±80 ms ·
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

## Batch (owner 2/11: hundreds of episodes, machine QC instead of a per-image OK; 0 credits)
- `gen.py --plan N` appends rows to `content/video/teach2d/auto.json` from our data only – `usuk` (curated `usuk-pairs.json`, both IPA in the bank), `verbs` (verb engine + lexicon example sentences), `stress` (stress-shift families word + suffix from the IPA bank, spelling syllables = IPA nuclei), `guess` (img.json picture of the exact `word#n`), `review` (bank card). Facts are frozen in the row; order = least-covered app area first, never the same template twice in a row.
- Machine gates per row → `reviewed.json` verdict (`machine: true`): **data** (== bank / verb engine / img.json) · **level** (every spoken word NGSL or bank A1–B1, taught words exempt) · **hook** (true for these facts, ≤ 6 words) · **dup** (point hash never reused, one word = one episode, picture pHash ≥ 10 bits apart). Teacher skip lists in `gen.py` (other sense in the bank example, family-safe topics). Tests: `scripts/test/teach2d-gen.py` (preqc).
- `gen.py --verify` re-checks every row against the live bank before a render (changed fact → not rendered, warned). `gen.py --todo` = verified, not banked, < 2 red tries.
- `teach-video.yml` input `shards` = render the next N (≤ 120, matrix limit); ci-filler entry `teach-video` (probe `gen.py --todo --count`). Pictures via `scripts/media/origin.py` with `MEDIA_ORIGIN_ONLY=1` (GitHub origins only, never media.lexkite.com or /api).
- `bank.py`: an episode enters `bank.json` only when short AND wide pass every qc.py gate with score ≥ 90 and the mp4 is not a byte copy; videos = artifact `tv-bank-<run>` (90 days); score table `BANK.md`. Committed to main by the main batch run (deploy key, `commit-regen.sh`).

## L1 clips for native pages (owner 11/11; replaces PRs #377 / #360)
> Page Facebook bản địa (D1 `yt_chan_cfg.cfg.lang`: vi 11, pt 13, es 14, de 15, fr 16, hi 17, ar 18, tr 19, ru 20, + ja/ko/zh) đăng clip riêng theo ngôn ngữ page, giáo viên vẫn dạy tiếng Anh; page EN và kênh toàn cầu giữ nguyên. Mẫu `l1`, hàng dữ liệu `content/video/teach2d/l1.json`, test `scripts/test/teach2d-l1.mjs`.
> Đọc khi: thêm clip L1, thêm ngôn ngữ page, đổi luật đăng clip bản địa.

### Đường ống
mẫu `l1` trong `gen.py`/`build.py`, hàng dữ liệu `content/video/teach2d/l1.json`, QC `qc.py`, kho `bank.py`, lưu `store.py`, phân phối GrabCast `functions/api/_distribution.js`.

### Mỗi clip
- **Dạy (tiếng Anh)**: Ama hoặc Carlos, ≤ B1 (cổng `l1_gate`), ≤ 150 wpm; câu sai ✗ → đúng ✓ hiện trên màn hình; quiz 3-2-1.
- **Bản địa** (`native.*` trong hàng): `hook` ≤ 34 ký tự, hiện từ khung 0 (cổng hook của qc: trong 1,5 s đầu); `tip` = mẹo giải thích trên khung; `caption` = chú thích bài đăng (giữ nguyên câu tiếng Anh mẫu trong “ ”); `comment` = bình luận đầu (có đúng một `{link}`); `hashtags` 3–5, có `#lexkite`. Tiêu đề, chú thích, hashtag, bình luận đầu của `publish` lấy từ đây (`publish.py` `build_l1`).
- **Nội dung**: lỗi L1 (người nói ngôn ngữ đó hay mắc: bỏ -s ở vi, “I have 20 years” ở pt/fr, “I am agree” ở es, “become”≠bekommen ở de, “library”≠librairie ở fr…).

### Bản dịch (docs/I18N-PIPELINE.md)
`en.*` là gốc, `native.*` là bản tay tầng i18n-fixed (thắng dịch máy). `{m:từ}` lấy nghĩa từ kho: vi = kho từ, ngôn ngữ khác = `web/packs/<lang>.json`. `scripts/video/teach2d/native-qa.mjs` (luật chung `scripts/lib/i18n-rules.mjs`, dùng chung với `i18n-qa.mjs`): không lẫn tiếng Việt, không lỗi dịch máy đã biết, giữ câu tiếng Anh mẫu, hashtag, độ dài, bình luận đầu, nghĩa lấy từ kho; `--online` thêm dịch ngược gtx (teach-video preqc luôn chạy; gtx không trả lời thì bỏ riêng cổng này). Kết quả `l1-qa.json` (`--write`).

Chữ không-Latin (ru/hi/ar/ja/ko/zh): Chromium tự lùi phông theo glyph (job render cài `fonts-noto-core` + `fonts-noto-cjk`); `build.py` chỉ ĐO chữ (`tw`, cùng họ Noto, ja/zh xuống dòng theo từng ký tự, ar đặt `rtl` cho dòng bản địa, tiếng Anh vẫn trái→phải); hashtag cho phép chữ Unicode. Hook/tip hi·ar·ja·ko·zh cần người bản ngữ liếc lại ở bài đầu mỗi page.

### Định tuyến và lịch (đã có ở main, test `scripts/test/teach2d-l1.mjs`)
`store.py` ghi `lang` vào index → `blockOf`/`implicitSocialRules`: clip `lang=X` chỉ đi page `cfg.lang`=X (page EN chung không nhận). Mỗi page ≤ 2 bài/ngày, khung 09–21 giờ địa phương (`schedule`). Link web gắn UTM + bình luận đầu: phần code phân phối dùng chung (phiên page-kit), clip chỉ mang `first_comment` có `{link}`.

### Tự duyệt (chủ cho tự đăng 11/11)
`autopub_gate.py`: QC ≥ 90 cả short + wide, mọi cổng xanh (phụ đề khớp, vùng an toàn, chính tả/IPA, wpm), `native-qa` xanh (`l1-qa.json`), publish hợp lệ → tự duyệt, tự đăng, lên lịch sẵn. Bài đầu tiên mỗi page được báo điều phối để chủ xem sau.

## Word Roots – "Gốc từ" (17/11, template `roots`)
> Chuỗi "một gốc – ba từ": mở bằng vòng tròn (gốc ở giữa, các từ của bài nằm trên vòng, mỗi từ hiện đúng lúc giáo viên đọc tên), rồi "Did you know?" (từ gốc Latin/Hy Lạp), mỗi từ một thẻ Kit (tiền tố mực + GỐC vàng, IPA, công thức `de- + pos = down + put`, nghĩa ngắn, câu ví dụ của kho), quiz 3 giây, CTA `#/dict/<từ>`. Ý tưởng định dạng tham khảo kênh khác; hình, câu chữ, nhân vật là của Lexkite (giáo viên 2D Ama/Carlos, thẻ Kit, emoji của kho từ).
- **Kho**: `roots.json` (≥ 30 gốc; hiện 40 / ~290 từ). Mỗi từ: `seg` = `tiền-|gốc|-hậu` (nối lại == chính tả, phần gốc ∈ `variants`), `mean` = nghĩa ngắn nói thành lời, `pm` = nghĩa tiền tố riêng (tuỳ chọn). Nguồn từ nguyên (`lang` + `src` + `src_mean`) đã đối chiếu Etymonline / Wiktionary; `scripts/test/teach2d-roots.py` khoá nguồn từng gốc, từ phải có trong từ điển app (IPA + nghĩa + ví dụ), `vi` giữ cho clip L1 tiếng Việt.
- **Sinh tập**: `gen.py --roots` chia mỗi gốc thành bài 3 từ (2 khi dư 1 hoặc quá 28 s), 4 cổng máy như `--plan` (data == kho · level ≤ B1 trừ từ dạy · hook · dup) → `auto.json` + `reviewed.json`. Giáo viên xen kẽ Ama/Carlos. Bài đầu mỗi gốc lên trước (đa dạng), bài sau theo sau.
- **Dựng**: `build.py` `T_roots`; vòng tròn `ring.png` sinh lúc dựng; tint `roots` trong `theme.json`; nhạc `chill-keys`. Metadata `publish.py` (tiêu đề `Pos root: position, deposit and opposite`, mô tả có từ nguyên + công thức).
- **Duyệt/đăng**: mẫu `roots` nằm ở sổ duyệt (`approved.json`) trạng thái `draft` tới khi tập đầu có short + wide QC ≥ 90 (bank.py) → điều phối chuyển `approved` → autopub_gate → store → lịch như mọi tập Teach2D (1 video/kênh/ngày).

## Not done yet (needs the owner)
- Owner OK 30/10 on the 5 new templates (grammar, dictation, toeic, review, call – CI f5c3fe8, all 32 renders QC 100). Batch / cron / publish still need their own OK.
- Matching 2D scene backgrounds: today the Kit canvas (0 credits). A Kling 2D-scene bank would follow `CREDIT-RULES.md` (analysis → dry-run → 1 pilot) and needs an explicit credit OK.
- 1080p bank (session teach-build-1080): `host.py` reads the same registry paths, no code change.
