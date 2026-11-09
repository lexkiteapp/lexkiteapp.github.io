# Spec: Khóa học tiếng Tây Ban Nha (tl `es`) cho 14 ngôn ngữ giao diện

> TL;DR: Dạy tiếng TBN A1→C2 bằng ĐÚNG engine tiếng Anh, mở rộng nền `Target`/`tl` đã có (`specs/target-language.md`, PR #445 – pt-BR thử) thay vì sao chép. 8 đợt (W0–W7), cờ `es_course` mặc định TẮT tới khi qua toàn bộ cổng. Chưa viết code: chờ số PR mở ≤ 15 (luật xong-trước-làm-sau).
> Đọc khi: đụng `Target`, nội dung `content/target/es/`, hoặc bất kỳ tính năng nào giả định "ngôn ngữ đang học = tiếng Anh". Soạn 03/11/2026.

## 1. Mục tiêu
Người nói vi, en, ar, de, fr, hi, id, ja, ko, pt_BR, ru, th, tr, zh_CN (giao diện `es` → không chào khóa này) học tiếng TBN đủ mọi phần như khóa tiếng Anh: từ điển/Sổ từ/SRS, ngữ pháp + drills, lộ trình ngày, phát âm, nghe/nói, gọi điện AI, thi thử, video Teach2D, ảnh từ vựng, add-on tra từ. Tiếng Anh giữ nguyên từng byte (test hồi quy `target-lang` so ảnh chụp dữ liệu en).

## 2. Kiến trúc "ngôn ngữ đích" tổng quát
- **Một bảng, không nhánh code**: `Target` thêm dòng `es` (speech lang `es-419` → dự phòng `es-MX`/`es-US`, nhận giọng `es`, Kokoro, giáo viên, tiền tố lọc giọng máy, `wordFiles`). Mọi chỗ còn `if (pt)` từ lát 1 đổi thành tra bảng → thêm ngôn ngữ thứ 3 = thêm dòng + dữ liệu. Khóa thẻ `es:`+lemma, trường `tl:'es'`; đồng bộ/SRS/Ôn đã lọc theo `Target.cur()`.
- **Dữ liệu theo tl**: `content/target/es/{schema,seed,core-*,grammar,drills,calls,exams}.json` cùng schema với pt (mở rộng: giống, số nhiều, bảng chia động từ, biến thể vùng). Mỗi module tải lười (`web/js/target/es/*.js` hoặc JSON CDN) → khung ≤ ngân sách shell, i18n ≤ 160 KB gz/ngôn ngữ không đổi.
- **Engine dùng chung, tham số hoá `tl`**: qengine/drills, lesson engine + path-day, call engine, mock/CBT, pron coach, Teach2D (viseme lấy từ âm vị espeak → không phụ thuộc tiếng), explain-card. Mỗi engine có 1 chỗ đọc `Target.cur()`; không file nào chép đôi.
- **Giải thích bản ngữ**: nguồn lời giải viết bằng **en** (khóa gốc cho tl ≠ en) → `i18n.yml`/gen-explain dịch 13 ngôn ngữ + vi (vi không phải nguồn ở khóa này); nhãn ngắn qua `i18n-fixed.json`. Nghĩa từ 14 ngôn ngữ: `lexicon-i18n.yml` thêm tham số `--tl es` (gói `web/packs/es/<lang>.json`).
- **Giao diện**: chỉ màn từ Stitch (Lexkite Kit): chọn ngôn ngữ học lúc bắt đầu, công tắc ở Cài đặt, nhãn tl trên thẻ. Không màn tự vẽ.

## 3. Các phần & nguồn MIỄN PHÍ (giấy phép)
| Phần | Nguồn / cách làm | Giấy phép – lưu ý |
|---|---|---|
| Khung cấp độ | CEFR (Hội đồng châu Âu, dùng tự do); PCIC Instituto Cervantes chỉ làm **danh mục đối chiếu**, không chép chữ | Không sao chép văn bản PCIC |
| Tần suất từ | FrequencyWords es (OpenSubtitles 2018) – chỉ thứ hạng | CC BY-SA 4.0, ghi công |
| Lemma, giống, chia động từ, IPA đối chiếu | Wiktionary qua kaikki.org – **chỉ để kiểm chéo trên CI**, không phát hành dữ liệu dẫn xuất | CC BY-SA; nội dung ship tự soạn |
| IPA | espeak-ng `es-419` (seseo, không ceceo) sinh + chuẩn hoá (`scripts/lexicon/ipa.mjs` thêm bảng es) | GPL công cụ, đầu ra tự do |
| Câu ví dụ | Tự soạn qua ai-pool; Tatoeba chỉ để đo độ tự nhiên | Tatoeba CC BY 2.0 FR |
| Kiểm ngữ pháp | LanguageTool es tự chạy trên runner (Java) + treebank UD AnCora để thử cổng | LGPL / CC BY 4.0 |
| Giọng (MỘT giọng) | Kokoro-82M + âm vị espeak `es-419`: `ef_dora` (Ama), `em_alex` (Carlos), dựng sẵn trên CI; dự phòng Piper `es_MX` | Apache-2.0 / MIT |
| Nhận giọng | Whisper small đa ngôn ngữ (CI chấm), máy người dùng theo tầng thiết bị (luật on-device AI) – `whisper-tiny.en` hiện tại không dùng được cho es | MIT |
| Thi thử | Định dạng DELE A1–C2 / SIELE tự soạn (`content/exams/spec/dele-*.json`, `siele.json`); ghi "luyện theo định dạng", không liên kết Cervantes, không đề thật | Tên thi là nhãn hiệu – chỉ mô tả |
| Ảnh từ vựng | Tái dùng `img.json` khi trùng nghĩa `từ#loại` (ánh xạ es→en sense, kiểm tay mẫu); thiếu → `vocab-img-free.yml` | Không chữ trong ảnh (TEXT_OBJ) |
| Video | Teach2D, Ama + Carlos 2D đọc es, ≤ 150 wpm, chủ duyệt mẫu trước (luật video) | 0 credit |

## 4. Đợt (theo thứ tự, mỗi đợt = 1 PR + cờ tắt)
| Đợt | Nội dung | Token Claude | Phút CI |
|---|---|---|---|
| W0 | Tổng quát hoá `Target` (bảng thay `if pt`), dòng `es`, cờ `es_course`, `word-audio-es` lượt mẫu 20 từ, seed 30 từ | 60k | 60 |
| W1 | Từ vựng A1–B2 3.000 lemma (giống, số nhiều, IPA, nghĩa 14 ngôn ngữ, ví dụ, audio Ama+Carlos, `img` khi đúng nghĩa) – `target-content --tl es` theo lô 300 | 110k | 1.500 |
| W2 | Ngữ pháp A1–C2: `grammar-inventory` es (~220 điểm), bộ chia động từ quy tắc tự viết + kiểm chéo Wiktionary, drills qua qengine, giải thích en→14 | 160k | 1.200 |
| W3 | Phát âm (r/rr, b/v, nguyên âm thuần, trọng âm/dấu, nối âm), cặp tối thiểu, nghe chính tả, nói theo; Whisper đa ngôn ngữ tầng thiết bị | 100k | 600 |
| W4 | Lộ trình ngày + bài học (lesson/path-day) + gọi điện AI & roleplay es (≥ 24 cuộc gọi A1–C1, ai-pool với `tl`) | 130k | 500 |
| W5 | Thi thử DELE A1–C2 + SIELE: spec định dạng, ≥ 2 đề/cấp, chấm nói/viết qua ai-pool + rubric | 120k | 700 |
| W6 | Video Teach2D es (mẫu → chủ duyệt → lô) + ảnh từ vựng còn thiếu + add-on tra từ es (nhận câu TBN, popup nghĩa 14 ngôn ngữ, không thêm quyền – `permissions.lock`) | 100k | 1.000 |
| W7 | Màn Stitch (chọn ngôn ngữ học, công tắc, nhãn tl), bật cờ cho nhóm thử, đo, rà nốt chỗ giả định tiếng Anh (gợi ý, mini-game, xuất Anki/CSV có `tl`) | 90k | 300 |
| **Tổng** | | **≈ 870k** | **≈ 5.900** (≈ 2–3 ngày đồng hồ trên 40 runner, chạy đêm theo hạn mức ai-pool) |

Nhịp dự kiến: W0 ngay khi PR mở ≤ 15; mỗi đợt sau ~3–5 ngày (giới hạn là hạn mức ai-pool miễn phí + nghiệm thu, không phải CI) → ≈ 5–6 tuần.

## 5. Cổng QC trên CI (trượt 1 = không gộp; không nới ngưỡng)
1. **Chính xác ngôn ngữ**: LanguageTool es 0 lỗi trên mọi câu TBN; 2 giám khảo AI khác họ + dịch ngược; bảng chia động từ khớp Wiktionary 100 % (ngoại lệ ghi tay có lý do); IPA espeak ↔ Wiktionary lệch → gắn cờ.
2. **Nghĩa & giải thích 14 ngôn ngữ**: `i18n-missing/qa --strict`, `explain-check` ≥ 98 %, backcheck native-score ≥ 95; không lẫn tiếng (es/en/vi lọt vào ngôn ngữ khác).
3. **Giọng**: −16 LUFS, Whisper small es nghe lại khớp chữ (WER mục từ = 0, câu ≤ 5 %), một giọng/vai xuyên suốt.
4. **Giao diện**: visual-qa (tương phản WCAG AA sáng/tối, khung app ≤ ngân sách, nút thoát mọi màn – `specs/exit-button.md`), stitch-quality-qc, i18n-switch.
5. **Nội dung**: `content:gate` + content-qa, điểm chấm ≥ 95/100 mỗi lô, soát tay mẫu ≥ 5 % (min 5) bởi phiên khác người viết; đáp án đúng 100 %.
6. **Không hồi quy tiếng Anh**: `target-lang` + `sync-pack` + toàn bộ `npm test`; workflow mới tự đỏ khi kết quả = 0, có concurrency/paths/timeout.

## 6. Tiêu chí xong
Mỗi phần ở §1 có đủ nội dung A1→C2 (từ vựng C1–C2 mở rộng sau W1 theo hàng đợi `targets.json` mục `es:*`), qua 6 cổng §5 ở cả 14 ngôn ngữ, Ama/Carlos dạy bằng giọng es, chạy được trên web/add-on/iOS/Android, cờ bật cho mọi người sau 1 tuần nhóm thử không có lỗi chặn.

## 7. Rủi ro
- **Hạn mức ai-pool** (≈ 3.000 từ × 14 ngôn ngữ + lời giải): chạy đêm, nối tiếp từ chỗ dừng; không chuyển sang dịch vụ trả phí khi chưa hỏi chủ.
- **Giọng Kokoro es** chưa qua lượt mẫu → W0 quyết; trượt thì Piper `es_MX` (vẫn một giọng). Lượt mẫu chấm thêm seseo: các từ có c/z (cielo, zapato) phải ra /s/, không ra /θ/.
- **CC BY-SA lan truyền**: chỉ dùng Wiktionary/FrequencyWords làm thứ hạng/kiểm chéo, không ship dữ liệu dẫn xuất.
- **Dung lượng**: dữ liệu es tải lười, không vào khung/i18n; size-budget chặn.
- **Chồng chéo với tiếng Anh**: engine nào chưa tham số hoá `tl` → sửa engine (không chép); grep `Target.cur` trước khi viết.
- **Nhận giọng trên máy yếu**: tầng thiết bị; máy yếu chấm qua CI/Worker miễn phí, không bỏ bài nói.

## 8. Quyết định chuẩn ngôn ngữ (chủ, 03/11/2026)
**Tiếng TBN Mỹ Latinh trung tính** là chuẩn duy nhất cho giọng, IPA, ví dụ, đáp án và chấm điểm: seseo (c/z = /s/), `ustedes` cho số nhiều ngôi 2, từ vựng trung tính toàn vùng (computadora, carro/auto, celular, jugo). `vosotros`, ceceo/distinción và leísmo **chỉ** xuất hiện trong ghi chú "Ở Tây Ban Nha" (nhận biết khi nghe/đọc, không dạy chủ động, không bắt buộc trong đáp án). Cổng QC §5.1 thêm lint: câu chính không có dạng `vosotros` hay leísmo (trừ khối ghi chú). Thi thử DELE/SIELE vẫn hợp lệ vì cả hai chấp nhận mọi biến thể chuẩn.

## 9. Điểm cần chủ quyết
1. Đồng ý tên hiển thị "Luyện định dạng DELE/SIELE" (không liên kết Cervantes).

## 10. Trạng thái
- **W0** (03/11/2026): `Target` tổng quát hoá – mỗi ngôn ngữ đích = 1 dòng bảng (`flag`/`ls`/`label`/`fallback`), không còn nhánh `if (pt)` (test `target-lang` chặn); dòng `es` (es-419 → es-MX → es-US, nhận giọng es-MX vì Web Speech chưa có es-419 ổn định, Ama `ef_dora` / Carlos `em_alex`, `wordFiles:false`); cờ `es_course` (mặc định TẮT, hoặc `lk.es=1`); seed 30 từ `content/target/es/` (giống, `plural`, IPA es-419 seseo, nghĩa 15, ví dụ tự soạn; luật riêng qua `TL_RULES` trong `scripts/target/lib.mjs`). Lượt mẫu giọng: workflow chung `word-audio-tl.yml` (nhãn `word-audio-es`; bảng `scripts/word-audio/tl-voices.json`; thêm bước IPA seed ↔ espeak-ng + cổng seseo) – lượt 41630995845 (Whisper small es, −16 LUFS): Kokoro `ef_dora` 19/20, `em_alex` 19/20 (≥ 80 %, độ to 0 trượt; trượt casa, niño), Piper `es_MX-claude-high` 20/20; seseo 12/12 c/z ra /s/ (cielo sjˈelo, zapato sapˈato) → giữ Kokoro, KHÔNG cần Piper. IPA seed sửa theo espeak (ciudad, hoy).
- **W1** (05/11/2026, đang chạy): `gen.mjs` chỉ đọc bảng `scripts/target/tl-gen.mjs` (biến thể, nguồn FrequencyWords `es_50k`, quy ước IPA, `plural`, tiêu chí giám khảo, luật trung tính §8); lint `TL_RULES.es.lint` chặn vosotros/os/-áis/-éis/coger/ordenador/zumo trong câu chính; mỗi lượt `target-content` (dispatch trên nhánh PR) = 1 tệp `core-NN.json` ≤ 300 mục: LanguageTool es (Docker 6.8, 0 lỗi) → 2 giám khảo + dịch ngược → IPA = espeak-ng es-419 dấu nhấn đầu âm tiết (`tl_ipa_fill.py`, lệch → `qa.ipaAi`) → Wiktionary lemma/giống/số nhiều (`wikt-check.mjs`, tệp nhỏ kaikki từng từ, không ship dữ liệu) → `build.mjs --check` cả bộ. Nghĩa 14 ngôn ngữ đi cùng lượt soạn + dịch ngược (một nguồn, không cần `lexicon-i18n --tl`); gói lười `web/packs/es/` + audio cả bộ làm khi app dùng tới (W4). Lô ra artifact `bot-output-target-es` (không bot push nhánh PR), lấy về bằng `scripts/ci/bot-output.sh` rồi commit; #673 gộp với 424 lemma, phần còn lại theo nhánh `claude/es-vocab-batch` mỗi đợt ~500 lemma có CI.
- **W2a** (06/11/2026): kho ngữ pháp es `content/target/es/grammar-inventory.json` (230 điểm A1–C2, ví dụ es-419 + `example_en`, `tenses` = khóa bộ chia) – cổng `grammar-map-check.mjs --tl es` (lint vosotros, LanguageTool 0 lỗi trên CI qua `scripts/ci/lt-up.sh`, ≥ 200 điểm); bộ chia `scripts/target/conjugate.mjs` (quy tắc tự viết + bảng bất quy tắc, 5 ngôi es-419, 21 khóa thì) – test 0 mạng `es-conjugate.mjs`, kiểm chéo Wiktionary `conj-check.mjs` (khớp 100 %, ngoại lệ `EXCEPT` có lý do). - **W2b** (08/11/2026): màn luyện `#/practice/es?lv=A1|A2|B1` (chế độ của route practice, `web/js/espr.js`; vào được bằng URL, ô lối vào ở Luyện tập khi cờ `es_course` bật) dùng NGUYÊN khung Stitch bài học (lesson-question · feedback-* · lesson-complete) + chấm gõ qua `QE.gradeGap` (qengine.js), không CSS mới. Dữ liệu: `content/target/es/drills.json` (375 câu điền từ tự soạn gắn 125 điểm A1–B1) + bài CHIA ĐỘNG TỪ sinh từ `form()`/tenses của `conjugate.mjs` (đáp án = bộ chia đã kiểm Wiktionary) + giải thích en/vi + 13 ngôn ngữ ở `content/target/es/gx/<ngôn ngữ>.json`; `node scripts/target/drill-pack.mjs` dựng gói tải lười `web/cpack/es/{dr,gx-<ngôn ngữ>}.js` (`--check` trong npm test: khớp nguồn, đủ 15 ngôn ngữ, ví dụ trong "…" giữ nguyên, không lẫn tiếng Việt; `--lt` trên CI: LanguageTool 0 lỗi mọi câu điền từ). Âm thanh: `gen-audio.mjs --tl es` (audio.yml dispatch input `tl=es`, giọng `ef_dora`, âm vị espeak es-419 qua misaki, `scripts/sentence-audio/corpus-es.mjs` + `render-es.mjs`) – lượt tiếng Anh không đổi. Còn lại cho đợt sau: điểm ngữ pháp B2–C2 và bài nghe/nói.
- **W3** (08/11/2026): phát âm trong chế độ `#/practice/esp` (route practice sẵn có, `web/cpack/es-app/pron-ui.js`; ô lối vào cạnh ô luyện TBN khi cờ `es_course` bật). 8 chủ đề âm (nguyên âm thuần, r/rr, b-v, c-z-s seseo, trọng âm + tilde, nối âm, j-g-gu, ñ-ll-h-ch-qu) × 3 bài trên NGUYÊN khung Stitch bài học (dùng chung `App.esQ/esFoot/esEnd` của `espr.js`): cặp tối thiểu (nghe → chọn), nghe chính tả (nghe → gõ, thiếu tilde vẫn đúng kèm nhắc), nói theo (micro; Web Speech es hoặc **Whisper đa ngôn ngữ chạy trên máy** – `ui.js`: tiếng Anh giữ `whisper-tiny.en`, es/pt dùng `whisper-tiny` hoặc `whisper-base` khi RAM ≥ 4 GB, tải sau khi người dùng đồng ý, không nằm trong bundle). Chỉ cặp THẬT SỰ khác âm (casa/caza, si/sí là đồng âm ở es-419 → làm bài chính tả, không làm cặp; test chặn). Nguồn `content/target/es/pron.json` + `px/<ngôn ngữ>.json` (giải thích + nhãn 15 ngôn ngữ); IPA sinh bằng luật `scripts/target/es-g2p.mjs` (đối chiếu 424 lemma của kho từ ≥ 90 %, từ trùng thì khớp 100 %); `node scripts/target/drill-pack.mjs` dựng `web/cpack/es/px*.js`; từ/cụm vào corpus Kokoro (`corpus-es.mjs`, dispatch audio.yml `tl=es` sau gộp). Test `es-pron.mjs`.
- **Lộ trình mở rộng kho từ es** (hiện 454 từ, 424 đang `pending-review`): (1) nguồn = FrequencyWords es_50k (chỉ thứ hạng) → hàng đợi `targets.json` `es:*`, soạn qua `gen.mjs` (ai-pool Groq → gc-groq → Gemini), mỗi lượt ≤ 300 mục / `core-NN.json`; (2) nhịp = mỗi đợt ~500 lemma, 1 PR/đợt (nhánh `claude/es-vocab-batch`), chạy đêm theo hạn mức ai-pool, A1–B2 xong rồi C1–C2; (3) cổng duyệt = LanguageTool es 0 lỗi, 2 giám khảo + dịch ngược ≥ 90 % mục ≥ 90 điểm (< 90 % → Sonnet duyệt-sửa 100 %, < 70 % → bỏ Groq), IPA espeak ↔ Wiktionary, `build.mjs --check`, soát tay mẫu ≥ 5 %; chỉ gộp khi CI xanh, mục lên `reviewed` sau cổng.
- **W1 cần (gốc)**: `scripts/target/gen.mjs` còn lời nhắc/biến thể pt cứng → đưa vào bảng theo `tl` (lời nhắc es-419 trung tính, seseo, `plural`); `lexicon-i18n.yml --tl es`; nguồn FrequencyWords es; nếu Kokoro es trượt → Piper `es_MX` làm giọng duy nhất.
- **W4** (09/11/2026): lộ trình ngày + cuộc gọi AI es. **Cuộc gọi**: `content/target/es/calls/calls-01..04.json` = 24 cuộc A1–C1 (chat/role, Ama + Carlos, es-419 trung tính); `web/js/call/engine.js` + `web/js/call.js` tham số hoá theo `tl` (lọc cuộc gọi theo `c.tl`, `lang`/ASR/giọng theo `Target`, UNSAFE es; id `es-…` mở thẳng không đổi ngôn ngữ đang học); gói lười `cpack/es/cl.js` (BUNDLES.calles). Cổng máy `scripts/target/calls-check.mjs` (lint vosotros/leísmo/từ vùng, cấu trúc nút, ≥ 24 cuộc đủ 5 cấp; trong `es-path.mjs`). **Lộ trình**: `#/practice/esd` (mode của route practice, `cpack/es-app/day-ui.js`): 125 ngày = 125 điểm ngữ pháp A1–B1 (mỗi điểm đúng 1 ngày), ~4 từ mới/ngày theo rank (seed + lô `reviewed`), 1 chủ đề phát âm, cứ 5 ngày 1 cuộc gọi (dễ→khó, mỗi cuộc 1 lần); bước ngữ pháp/phát âm/gọi mở màn có sẵn, kết màn đánh dấu bước (`App.esDayMark`, tiến độ `lk.es.day`). Dựng bởi `scripts/target/path-lib.mjs` (hàm `planDay` MỘT nguồn, sinh vào `dy.js`) qua `drill-pack.mjs`; nhãn 15 ngôn ngữ `content/target/es/path-ui.json`; corpus Kokoro thêm từ/ví dụ/lời cuộc gọi (Ama `ef_dora`, Carlos `em_alex`). **Kho từ**: 452 từ (30 seed + 422 lô duyệt-sửa; 2 mục bỏ) đã `reviewed`, vào lộ trình. **Giới hạn**: `web/cpack` đang sát trần 3 MB (còn ~1 KB) → lô từ/đề kế tiếp (W5+) phải nâng trần có duyệt hoặc đưa dữ liệu ra CDN; bước "từ mới" mới là xem/nghe + đánh dấu (chưa đưa vào SRS), nối SRS = việc kế.
