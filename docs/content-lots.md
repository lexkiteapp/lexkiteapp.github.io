# Lô nội dung cho phiên Sonnet (lộ trình SCORE ≥ 95)

> TL;DR: Danh sách lô viết nội dung cho phiên Claude Sonnet, mỗi lô một tập file riêng, mẫu chuẩn, cổng phải xanh, số mục, token ước tính; xếp theo điểm SCORE thu được trên mỗi công. Opus (trưởng nội dung) làm trước phần "O" (cổng, loader, mẫu chuẩn) rồi soát 10 % mỗi lô và gộp.
> Đọc khi: mở phiên Sonnet viết nội dung, hoặc nhận/soát một lô. Kế hoạch + mốc: `docs/CONTENT-WORLD-PLAN.md` §6. Điểm sống: `content/pipeline/SCORE.md`.

## Luật chung mọi lô (dán vào brief)
- Làm trên main mới nhất của lexkiteapp (`git fetch real main`), nhánh `lot/<id>`, PR nhỏ; chỉ ghi đúng file của lô. Không sửa file PR mở khác đang giữ (#427/#429/#430/#412).
- No-cuts: không bỏ nội dung/test/ngưỡng; không đổi `content-score.mjs`/`score.budget.json`. Điểm chỉ tăng bằng độ phủ thật, qua cổng 100 %.
- Viết như giáo viên bản xứ: câu đời thường, đúng CEFR, ví dụ trung tính văn hoá (sẽ dịch 14 ngôn ngữ), không chép nguyên văn sách/đề/từ điển.
- Trước khi mở PR: cổng của lô + `node scripts/content-qa/gate.mjs` + `node scripts/content-score.mjs` (ghi điểm trước → sau vào PR). Âm thanh: `audio.yml` trên CI sau khi gộp (Kokoro, không chạy trên máy).
- Ngân sách: ≤ 150k context/phiên; viết theo khúc ~20 mục, chạy cổng sau mỗi khúc; gần trần → ghi bàn giao vào PR rồi dừng.
- Opus soát ≥ 10 % mẫu mỗi lô (ghi `content/qa/batches/<id>.json` `checked`), sai > 2 % → trả lô.

## Việc Opus làm trước (mở khoá lô)
| Id | Việc | Mở khoá | TT |
|---|---|---|---|
| O1 | P0.2: `sense-check` + spec `specs/sense-v2.md` + lô gold 100 từ | S-SENSE | ⏳ (phiên content-audit 3/11) |
| O2 | Cambridge: định dạng `web/js/cambridge/<cấp>/t<N>.js`, nạp vào `exam-format-check` theo spec `cam-*`, đề gold A2 t1 | S-CAM | ☐ |
| O3 | Trung gian: spec + `mediation-check` + 2 bài gold `content/mediation/*.json` + đăng ký `sources.json` | S-MED | ☐ |
| O4 | Viết band 6/7: trường `band`, `whyUp` + loader + cổng; 2 bài gold | S-W67 | ☐ |
| O5 | P0.6: `scripts/i18n-native-score.mjs` (dịch ngược + giám khảo 1–5) + 3 bài ngữ pháp gốc en mẫu | S-EN | ☐ |
| O6 | CQ5 tách chữ vi-only ra khoá dịch (TOEIC S&W, TOEFL CW `explain[]`, readings, quiz ngữ pháp, gloss mẫu nói, pron `tip`) | S-EN, dịch | ☐ |

## Lô Sonnet (xếp theo điểm tổng ÷ công; điểm = phần tổng SCORE /100 khi lô xong)
| # | Id | Thành phần SCORE | File riêng của lô | Mẫu chuẩn | Cổng phải xanh | Số mục | Token ~ | +điểm | Chặn bởi |
|---|---|---|---|---|---|---|---|---|---|
| 1 | S-SIT-1…3 | Giao tiếp · tình huống Play & Speak 1→40 | `content/situations/<id>.json` (13/lô, id theo bảng chủ đề trong brief) | `content/situations/cafe.json` | `scripts/test/situations.mjs`, gate, lkf-check | 39 | 45k/lô | +2,79 | – |
| 2 | S-CALL-1…4 | Giao tiếp · cuộc gọi Ama/Carlos 11→60 | `web/js/call/calls-<lô>.js` (12/lô) | `web/js/call/calls.js` | call-qa, gate, voice gate (Ama nữ/Carlos nam) | 49 | 50k/lô | +2,33 | – |
| 3 | S-RP-1…3 | Giao tiếp · roleplay 16→60 | `web/js/roleplay/data-<lô>.js` (15/lô), mọi lượt có `br` ≥ 2 nhánh | `web/js/roleplay/data-everyday.js` | roleplay test, gate | 44 | 50k/lô | +2,10 | – |
| 4 | S-MED-1…2 | 4 kỹ năng · trung gian 0→30 | `content/mediation/m<NN>.json` (15/lô) | O3 | mediation-check | 30 | 40k/lô | +2,00 | O3 |
| 5 | S-CAM-A2-1…2, B1-1…3, B2-1…3, C1-1…3, C2-1…3 | Đề thi · Cambridge 0→6 mỗi cấp | `web/js/cambridge/<cấp>/t<N>.js` (A2: 3 đề/lô, còn lại 2) | O2 | exam-format-check (spec cam-*), gate | 30 đề | 80k/lô | +5,71 | O2 |
| 6 | S-RP-BR | CQ2: nhánh `br` cho 76 lượt roleplay cũ + Confidence ≥ 2 nhánh | `web/js/roleplay/data-{a,b,everyday}.js`, `content/confidence/units/*` | lượt đã có 2 nhánh | gate, confidence test | 76 + 78 lượt | 60k | (chất lượng) | – |
| 7 | S-EN-1…6 | i18n · điểm bản xứ 0→5 | `web/i18n/content/grammar-en-<lô>.json` (13 bài/lô) rồi mỗi L1 viết thẳng | O5 | native-score ≥ 4,3, i18n-qa --strict | 77 bài | 70k/lô | +3,57 | O5, O6 |
| 8 | S-L1-<lang> ×14 | P0.4 lỗi theo tiếng mẹ đẻ (Can-do + dễ học) | `web/js/grammar/l1/<lang>.js` (chỉ file ngôn ngữ đó) | mục `vi` hiện có | l1-check (Opus viết cùng lô đầu), gate | 25/ngôn ngữ | 30k/lô | gián tiếp | file grammar của #429/#430 phải gộp trước |
| 9 | S-SENSE-01…15 | Kho từ (nghĩa v2 lõi 3.000) | `content/lexicon/senses/s<NN>.json` (200 từ theo chỉ số lõi `core.mjs`) | `content/lexicon/senses.json` (gold) | sense-check, build-lexicon | 2.900 | 90k/lô | khi `content:score` đếm nghĩa v2 | O1 |
| 10 | S-W67-1…4 | 4 kỹ năng · viết mẫu 232→400 | `web/js/write/band67-<lô>.js` | O4 | cổng O4, writecheck | 168 bài | 70k/lô | +1,08 | O4 |
| 11 | S-GRAM-A1/C1/C2 | Ngữ pháp · bài A1/C1/C2 + điểm đúng cấp | `web/js/grammar/<cấp>-<lô>.js` | `grammar/starter.js` | grammar-map-check, content-check | 31 bài | 80k/lô | +2,45 | #429/#430 gộp |
| 12 | S-SKILL | Đọc ngắn A1/C2, bài đọc, nghe, chủ đề nói + mẫu (có CEFR, band) | `web/js/read/lot-<n>.js`, `web/js/listen/lot-<n>.js`, `web/js/speak/lot-<n>.js` | bài hiện có | content-check, exam-format | ~500 | 80k/lô | +4,5 | – |

Không phải lô Sonnet (tầng 0/CI, chạy đêm): từ#loại 20k (`lexicon-expand.yml`, +1,94), ảnh theo nghĩa (+1,81, CF_POOL ≤ 0,6), gói nghĩa 13 ngôn ngữ (`lexicon-i18n.yml`, +1,69), collocation/đồng nghĩa/IPA Mỹ tầng 0 (≈ +0,5 cho 9.148 mục có sẵn), C2 (+1,03). Sổ mẫu câu chức năng (+2,86) + trắc nghiệm/tự luận ngữ pháp (+3,37) = xưởng #429; mục gold (+2,21) = #427/#430 – sau khi gộp mới giao Sonnet phần còn lại.
