# Lô nội dung cho phiên Sonnet (lộ trình SCORE ≥ 95)

> TL;DR: Danh sách lô viết nội dung cho phiên Claude Sonnet, mỗi lô một tập file riêng, mẫu chuẩn, cổng phải xanh, số mục, token ước tính; xếp theo điểm SCORE thu được trên mỗi công. Opus (trưởng nội dung) làm trước phần "O" (cổng, loader, mẫu chuẩn) rồi soát 10 % mỗi lô và gộp.
> Đọc khi: mở phiên Sonnet viết nội dung, hoặc nhận/soát một lô. Kế hoạch + mốc: `docs/CONTENT-WORLD-PLAN.md` §6; thứ tự Đợt 2: `docs/specs/content-upgrade-2.md`. Điểm sống: `content/pipeline/SCORE.md`.

## Luật chung mọi lô (dán vào brief)
- Làm trên main mới nhất của lexkiteapp (`git fetch real main`), nhánh `lot/<id>`, PR nhỏ; chỉ ghi đúng file của lô. Không sửa file PR mở khác đang giữ (#427/#429/#430/#412).
- No-cuts: không bỏ nội dung/test/ngưỡng; không đổi `content-score.mjs`/`score.budget.json`. Điểm chỉ tăng bằng độ phủ thật, qua cổng 100 %.
- Viết như giáo viên bản xứ: câu đời thường, đúng CEFR, ví dụ trung tính văn hoá (sẽ dịch 14 ngôn ngữ), không chép nguyên văn sách/đề/từ điển.
- Trước khi mở PR: cổng của lô + `node scripts/content-qa/gate.mjs` + `node scripts/content-score.mjs` (ghi điểm trước → sau vào PR). Âm thanh: `audio.yml` trên CI sau khi gộp (Kokoro, không chạy trên máy).
- Ngân sách: ≤ 150k context/phiên; viết theo khúc ~20 mục, chạy cổng sau mỗi khúc; gần trần → ghi bàn giao vào PR rồi dừng.
- Opus soát ≥ 10 % mẫu mỗi lô (ghi `content/qa/batches/<id>.json` `checked`), sai > 2 % → trả lô.

## Việc Opus làm trước (mở khóa lô)
| Id | Việc | Mở khóa | TT |
|---|---|---|---|
| O1 | P0.2: `sense-check` + spec `specs/sense-v2.md` + lô gold 100 từ | S-SENSE | ⏳ (phiên content-audit 3/11) |
| O2 | Cambridge: định dạng `web/cpack/cambridge/<cấp>/t<N>.js`, nạp vào `exam-format-check` theo spec `cam-*`, đề gold A2 t1 | S-CAM | ✅ 05/11 (`specs/cambridge.md`) |
| O3 | Trung gian: spec + `mediation-check` + 2 bài gold `content/mediation/*.json` + đăng ký `sources.json` | S-MED | ✅ (màn luyện: bước sau, cần duyệt hình) |
| O4 | Viết band 6/7: trường `band`, `whyUp` + loader + cổng; 2 bài gold | S-W67 | ☐ |
| O5 | P0.6: `scripts/i18n-native-score.mjs` (dịch ngược + giám khảo 1–5) + 3 bài ngữ pháp gốc en mẫu | S-EN | ☐ |
| O6 | CQ5 tách chữ vi-only ra khóa dịch (TOEIC S&W, TOEFL CW `explain[]`, readings, quiz ngữ pháp, gloss mẫu nói, pron `tip`) | S-EN, dịch | ☐ |

## Brief S-MED-1 (sau O3)
Mục tiêu: 14 bài trung gian `content/mediation/m03…m16.json`, mỗi bài 1 mục tiêu `M.*` khác nhau trong lkf.json, phủ A2 (3) · B1 (4) · B2 (4) · C1 (3); đủ 6 activity, ≥ 4 bài `speak`, ≥ 3 nguồn chart/dialogue; đủ 3 đối tượng gen/acad/work.
1. Nhánh `lot/s-med-1` trên real/main; chỉ ghi `content/mediation/`. Mẫu + luật: `docs/specs/mediation.md`, `m01.json`, `m02.json`.
2. Mỗi bài: tình huống đời thật có một người nhận cụ thể và lý do cần; ý cần ≥ 3 (có số liệu/việc phải làm), ý nên bỏ ≥ 1 hợp lý; bài mẫu bằng lời của mình đúng cấp; tips nói rõ vì sao chọn/bỏ.
3. Cổng: `node scripts/content-qa/mediation-check.mjs` + `node scripts/test/mediation.mjs` + gate + content-score (ghi điểm trước → sau). Opus đọc ≥ 2 bài/lô.

## Lô Sonnet (xếp theo điểm tổng ÷ công; điểm = phần tổng SCORE /100 khi lô xong)
| # | Id | Thành phần SCORE | File riêng của lô | Mẫu chuẩn | Cổng phải xanh | Số mục | Token ~ | +điểm | Chặn bởi |
|---|---|---|---|---|---|---|---|---|---|
| 1 | S-SIT-1…3 | Giao tiếp · tình huống Play & Speak 1→40 | `content/situations/<id>.json` (13/lô, id theo bảng chủ đề trong brief) | `content/situations/cafe.json` | `scripts/test/situations.mjs`, gate, lkf-check | 39 | 45k/lô | +2,79 | – |
| 2 | S-CALL-1…4 | Giao tiếp · cuộc gọi Ama/Carlos 11→60 | `web/js/call/calls-<lô>.js` (12/lô) | `web/js/call/calls.js` | call-qa, gate, voice gate (Ama nữ/Carlos nam) | 49 | 50k/lô | +2,33 | – |
| 3 | S-RP-1…3 | Giao tiếp · roleplay 16→60 | `web/js/roleplay/data-<lô>.js` (15/lô), mọi lượt có `br` ≥ 2 nhánh | `web/js/roleplay/data-everyday.js` | roleplay test, gate | 44 | 50k/lô | +2,10 | – |
| 4 | S-MED-1…2 | 4 kỹ năng · trung gian 2→30 | `content/mediation/m<NN>.json` (14/lô) | `m01.json`, `m02.json` (docs/specs/mediation.md) | mediation-check, test/mediation | 30 | 40k/lô | +2,00 | O3 |
| 5 | S-CAM-A2-1…2, B1-1…3, B2-1…3, C1-1…3, C2-1…3 | Đề thi · Cambridge 0→6 mỗi cấp | `web/cpack/cambridge/<cấp>/t<N>.js` (A2: 3 đề/lô, còn lại 2) | O2 | exam-format-check (spec cam-*), gate | 30 đề | 80k/lô | +5,71 | O2 |
| 6 | S-RP-BR | CQ2: nhánh `br` cho 76 lượt roleplay cũ + Confidence ≥ 2 nhánh | `web/js/roleplay/data-{a,b,everyday}.js`, `content/confidence/units/*` | lượt đã có 2 nhánh | gate, confidence test | 76 + 78 lượt | 60k | (chất lượng) | – |
| 7 | S-EN-1…6 | i18n · điểm bản xứ 0→5 | `web/i18n/content/grammar-en-<lô>.json` (13 bài/lô) rồi mỗi L1 viết thẳng | O5 | native-score ≥ 4,3, i18n-qa --strict | 77 bài | 70k/lô | +3,57 | O5, O6 |
| 8 | S-L1-<lang> ×14 | P0.4 lỗi theo tiếng mẹ đẻ (Can-do + dễ học) | `web/js/grammar/l1/<lang>.js` (chỉ file ngôn ngữ đó) | mục `vi` hiện có | l1-check (Opus viết cùng lô đầu), gate | 25/ngôn ngữ | 30k/lô | gián tiếp | file grammar của #429/#430 phải gộp trước |
| 9 | S-SENSE-01…15 | Kho từ (nghĩa v2 lõi 3.000) | `content/lexicon/senses/s<NN>.json` (200 từ theo chỉ số lõi `core.mjs`) | `content/lexicon/senses.json` (gold) | sense-check, build-lexicon | 2.900 | 90k/lô | khi `content:score` đếm nghĩa v2 | O1 |
| 10 | S-W67-1…4 | 4 kỹ năng · viết mẫu 232→400 | `web/js/write/band67-<lô>.js` | O4 | cổng O4, writecheck | 168 bài | 70k/lô | +1,08 | O4 |
| 11 | S-GRAM-A1/C1/C2 | Ngữ pháp · bài A1/C1/C2 + điểm đúng cấp | `web/js/grammar/<cấp>-<lô>.js` | `grammar/starter.js` | grammar-map-check, content-check | 31 bài | 80k/lô | +2,45 | #429/#430 gộp |
| 12 | S-SKILL | Đọc ngắn A1/C2, bài đọc, nghe, chủ đề nói + mẫu (có CEFR, band) | `web/js/read/lot-<n>.js`, `web/js/listen/lot-<n>.js`, `web/js/speak/lot-<n>.js` | bài hiện có | content-check, exam-format | ~500 | 80k/lô | +4,5 | – |

Không phải lô Sonnet (tầng 0/CI, chạy đêm): từ#loại 20k (`lexicon-expand.yml`, +1,94), ảnh theo nghĩa (+1,81, CF_POOL ≤ 0,6), gói nghĩa 13 ngôn ngữ (`lexicon-i18n.yml`, +1,69), collocation/đồng nghĩa/IPA Mỹ tầng 0 (≈ +0,5 cho 9.148 mục có sẵn), C2 (+1,03). Sổ mẫu câu chức năng (+2,86) + trắc nghiệm/tự luận ngữ pháp (+3,37) = xưởng #429; mục gold (+2,21) = #427/#430 – sau khi gộp mới giao Sonnet phần còn lại.

## Brief lô S-CAM-A2-1 (Sonnet, dán nguyên khối)
- Việc: viết 3 đề A2 Key mới `web/cpack/cambridge/a2/t2.js`, `t3.js`, `t4.js` theo đúng mẫu gold `web/cpack/cambridge/a2/t1.js` + `docs/specs/cambridge.md` §1. Nhánh `lot/s-cam-a2-1` trên main mới nhất của lexkiteapp (`git fetch real main`), 1 PR.
- Chỉ ghi: 3 file đề + thêm 3 đường dẫn vào gói `cambridge` trong `web/js/app.js` (đúng 1 dòng đó). Không sửa cổng, spec, rubric, content-score.
- Mỗi đề đủ 3 bài: R&W 30 câu + Part 6 email (≥ 25 từ, 3 ý + checks) + Part 7 picture story (≥ 35 từ, 3 tranh); Listening 25 câu (5 phần, script đủ người nói, giọng `en-GB`); Speaking 2 phần có câu mẫu.
- Chủ đề khác t1 và khác nhau (gợi ý: du lịch & giao thông · mua sắm & quần áo · sức khoẻ & thể thao · nhà & gia đình · công việc & nghề · công nghệ hằng ngày). Từ vựng/ngữ pháp đúng A2 (English Vocabulary Profile A1–A2), câu ngắn, giọng tự nhiên như giáo viên bản xứ; KHÔNG chép đề/sách.
- Đáp án phân bố đều A/B/C; phương án nhiễu phải được nhắc trong bài/lời thoại nhưng sai rõ ràng (một đáp án duy nhất). `cue` = cụm nguyên văn; `explain` tiếng Anh A2, nói vì sao đúng và vì sao phương án nhiễu sai.
- Cổng phải xanh trước PR: `node scripts/content-qa/exam-format-check.mjs`, `node scripts/test/cambridge.mjs`, `node scripts/content-qa/gate.mjs`, `node scripts/content-score.mjs` (ghi điểm Đề thi trước → sau vào PR). Không thêm dòng vào `deviations.json`.
- Viết theo khúc: 1 đề → chạy cổng → đề kế. Gần trần context: ghi bàn giao vào PR rồi dừng. Audio: CI `audio.yml` sau khi gộp.


## Lô Đầu ra 3–6 tháng (spec `docs/specs/outcomes-3-6m.md`, 03/11)
Mỗi lô một tập file riêng, không trùng nhau và không trùng lô trên. Mẫu chuẩn + cổng (Opus làm trước = O7): loader + `scripts/test/outcomes-content.mjs` + đăng ký `content/qa/sources.json`. Mọi lô ghi `lo:[…]` theo `lkf.json` (kỹ năng S/W/I) và phục vụ đích nói/viết tự tin sau 3–6 tháng (`outcome-speak-write`).
| # | Id | Việc | File riêng của lô | Số mục | Token ~ | Chặn bởi |
|---|---|---|---|---|---|---|
| 13 | S-OUT-TASK-gen / -work / -ielts | Nhiệm vụ đầu ra 24 tuần × 1 nhánh: đề, Can-do, 8–12 chunk, bài mẫu A2/B1/B2, tiêu chí đạt (rubric §5) | `content/outcomes/tasks/<nhánh>.json` | 24/lô | 70k/lô | O7 |
| 14 | S-OUT-CHECK-a / -b / -c | Đề đo song song: đoạn đọc to 40–60 từ, đề nói 1–2', đề viết 10' (thêm đề 3→6 mỗi cấp, độ khó tương đương đề 1–2 trong `web/js/web/cpack/outcomes/forms.js`) | `content/outcomes/checks/<cấp>.json` | 4/lô | 20k/lô | O7 |
| 15 | S-OUT-DRILL | Mỗi luật `LK_WRITE` (id trong `writecheck-rules.js`) 3 câu drill sai→đúng để nói/gõ lại, giải thích en | `content/outcomes/drills.json` | ~80 luật | 60k | O7 |
| 16 | S-OUT-FLU | Kịch bản 4/3/2 + shadowing: 1 câu chuyện mẫu/chủ đề, 3 vòng gợi ý, câu shadowing có nhịp | `content/outcomes/fluency/<cấp>.json` (a, b, c) | 20/lô | 50k/lô | O7 |
