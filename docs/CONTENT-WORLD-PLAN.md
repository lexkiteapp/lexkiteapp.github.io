# Kế hoạch nội dung chuẩn top 1 thế giới (01/11/2026) – ĐÃ DUYỆT 01/11

> TL;DR: Đối chiếu LexKite với CEFR, EVP/EGP, Oxford 3000/5000, Pearson GSE, British Council, Swan & Smith và đặc tả đề IELTS/TOEIC/TOEFL/Cambridge; khung chung (Can-do LKF, nghĩa từ v2, thang sinh 4 tầng tiết kiệm token, chuẩn bản xứ 15 ngôn ngữ); pha P0/P1/P2 có mục tiêu, cổng QA, chi phí $0; 7 PR P0 (A–G) mở tuần tự khi PR mở ≤ 15.

> Một nguồn cho **chuẩn đích + kế hoạch nâng cấp theo pha**. Không lặp lại:
> quy trình lô → `CONTENT-PIPELINE.md` · chuẩn tối thiểu → `CONTENT-RULES.md` · cổng 7 lớp → `CONTENT-QA.md` ·
> lỗi chặn CQ1–CQ5 (audit 24/10) → `CONTENT-ROADMAP.md` · kho từ → `LEXICON.md` · ảnh → `VOCAB-IMG-STYLE.md` ·
> i18n → `I18N-PIPELINE.md` · video → `VIDEO.md` · bài học → `LESSON-ENGINE.md`.
> Anh duyệt 01/11. Mọi PR tuân thủ: no-cuts, finish-before-start (>15 PR mở = chỉ PR dữ liệu/cổng, không UI mới), $0, không tiêu credit.

## 1. Các "ông lớn" làm thế nào (chỉ phương pháp, không chép nội dung)

| Nguồn | Cách phân tầng | Bài học cho LexKite |
|---|---|---|
| **CEFR Companion Volume 2020** (Hội đồng châu Âu) | Mô tả "Can do" theo 4 nhóm hoạt động: tiếp nhận · sản sinh · tương tác · **trung gian (mediation)**; có bậc "+" (A2+, B1+, B2+) | Mọi nội dung gắn một **mục tiêu Can-do** tự viết; thêm dạng bài trung gian (tóm tắt/giải thích lại cho người khác) – hiện LexKite chưa có |
| **English Vocabulary Profile** (Cambridge, từ Cambridge Learner Corpus ~55 triệu từ bài thi, 140+ tiếng mẹ đẻ) | CEFR **theo từng nghĩa**, không theo từ; gồm cả cụm, phrasal verb, thành ngữ | Tách nghĩa: `từ#loại#n`, mỗi nghĩa một cấp CEFR riêng |
| **English Grammar Profile** | >1.200 "competence statement" theo cấp; "criterial features" = dấu hiệu phân biệt cấp | Kho điểm ngữ pháp dạng "Can use X to do Y" + dấu hiệu cấp dùng để chấm bài viết |
| **Oxford 3000/5000** | Lõi 3.000 từ A1–B2 + 2.000 từ B2–C1; chọn theo **tần suất corpus + mức hữu ích cho người học**; cấp theo từ loại (book n A1, book v A2) | Danh sách lõi tự dựng từ NGSL/wordfreq + tiêu chí hữu ích; ưu tiên làm sâu lõi trước khi mở rộng 20k |
| **Pearson GSE** | Thang 10–90 mịn hơn CEFR; ~2.000 mục tiêu kỹ năng, ~450 mục tiêu ngữ pháp, ~39.000 nghĩa từ; tách đối tượng (phổ thông, học thuật, nghề nghiệp) | Điểm tiến độ mịn (thang 10–90 tự định nghĩa) cho lộ trình thích ứng; nhãn đối tượng General/Academic/Work |
| **British Council LearnEnglish** | Theo **tình huống + chức năng ngôn ngữ** (xin phép, phàn nàn, đề nghị…), mỗi bài: xem/nghe → ngôn ngữ chính → luyện → làm | Sổ mẫu câu theo chức năng × tình huống, cùng khung 4 bước |
| **Swan & Smith, Learner English** | Lỗi do tiếng mẹ đẻ cho ~19 nhóm ngôn ngữ (phát âm, ngữ pháp, từ vựng) | Ngân hàng lỗi L1 có cấu trúc cho 14 ngôn ngữ giao diện (trừ en) |
| **ETS / IDP-BC / Cambridge Assessment** | Đặc tả đề công khai: phần, số câu, thời gian, dạng câu, thang điểm, tiêu chí chấm | Đặc tả máy đọc được + cổng kiểm format cho mọi đề tự soạn |

**Format đề công khai (tóm tắt; nguồn chuẩn đã đối chiếu: `content/exams/spec/*.json`):**
- IELTS Academic/GT: Nghe 4 phần/40 câu/~30'; Đọc 3 bài/40 câu/60'; Viết Task 1 (≥150 từ) + Task 2 (≥250 từ)/60'; Nói 3 phần 11–14'; band 0–9, viết chấm 4 tiêu chí × 25 % (bản mô tả cập nhật 05/2023).
- TOEIC L&R: 100 nghe (Part 1–4, 45') + 100 đọc (Part 5–7, 75'), 10–990. S&W: 11 câu nói (~20') + 8 câu viết (~60').
- TOEFL iBT (đổi 21/01/2026): 4 phần Đọc 50 mục/30' – Nghe 47/29' – Viết 12/23' – Nói 11/8', Đọc/Nghe thích ứng nhiều tầng, 12 dạng câu (có "Complete the Words", "Read in Daily Life"), thang 1–6, ~1,5 giờ.
- Cambridge: A2 Key (Đọc+Viết 7 phần/32 câu 60', Nghe 5 phần/25 câu 30', Nói 2 phần 8–10' theo cặp) · B1 Preliminary (Đọc 6 phần, Viết 2 phần, Nghe 4 phần nghe 2 lần, Nói theo cặp) · B2 First (Reading & Use of English 7 phần/52 câu/75', Viết 80', Nghe 40', Nói 14') · C1 Advanced (R&UoE 8 phần/56 câu/90', Viết 90', Nghe 40', Nói 15') · C2 Proficiency (R&UoE 7 phần/53 câu/90', Viết 90', Nghe 40', Nói 16').

## 2. Đối chiếu khoảng cách (số đo 01/11, nhánh mới nhất)

| Mảng | LexKite đang có | Chuẩn ông lớn | Khoảng cách |
|---|---|---|---|
| Từ vựng | 8.177 mục duy nhất (104 bộ); IPA/nghĩa/định nghĩa/ví dụ/CEFR 100 %; collocation 57 %; đồng nghĩa 31 %; audio UK+US 7.872; ảnh 2.461 (30 %); 13 gói nghĩa; mở rộng 20k đã bắt đầu (582) | CEFR theo nghĩa, nhiều nghĩa/từ, 2–3 ví dụ theo cấp, collocation + mẫu câu (pattern), register, cụm/thành ngữ | **1 nghĩa/từ, 1 ví dụ**; C2 chỉ 197; 280 cờ CEFR chưa xử lý; ảnh 70 % thiếu; chưa có pattern (`depend on sth`), register, họ từ |
| Ngữ pháp | 77 bài, 6 đơn vị, A2 14 · B1 30 · B2 27 · C1 6; 1.020 trắc nghiệm + 920 drill; khối trực quan (timeline 14, diagram 39, scale 11); lỗi L1 rất mỏng (6–11 bài/ngôn ngữ) | ~450 điểm ngữ pháp A1–C2, Can-do cho từng điểm, lỗi theo L1 | **Không có A1 và C2**, C1 mỏng; giải thích viết gốc tiếng Việt → 13 ngôn ngữ dịch máy từ đó; chưa có kho điểm ngữ pháp/Can-do |
| Giao tiếp | phrases.js, 11 cuộc gọi Ama/Carlos, 16 roleplay, 1 tình huống speak, 228 mục gold | ~100 chức năng × tình huống, bậc lịch sự/trang trọng | **Chưa có sổ mẫu câu theo chức năng**; tình huống rất ít |
| 4 kỹ năng | Nghe 40 bộ IELTS; Đọc 57 bài + 15 bộ đề; Nói 32 chủ đề/343 mẫu + 44 bài phát âm; Viết 128 bài mẫu + fixer/writecheck; video 3 | Bài theo Can-do từng cấp A1–C2, đa giọng (UK/US/AU…), trung gian | Bài kỹ năng chủ yếu phục vụ thi, **thiếu A1–A2 phổ thông**; nghe ít đa dạng giọng; chưa có mediation |
| Đề thi | IELTS (mock, nghe, đọc, viết, nói); TOEIC 7 đề đọc, 28 unit nghe, S&W 42/18; TOEFL 2026 đủ 4 phần; placement 20 câu | Đủ format + nhiều đề hoàn chỉnh mỗi kỳ | **Cambridge A2–C2 = 0**; chưa có spec máy đọc + cổng format chung |
| i18n | 15 ngôn ngữ, pipeline G0 + i18n-qa, explain bot đêm | Giải thích viết như người bản xứ, ví dụ đối chiếu tiếng mẹ đẻ | Dịch qua tiếng Việt → **mất tự nhiên**; chưa có điểm "bản xứ" đo được |

## 3. Kiến trúc chung (làm một lần, mọi mảng dùng lại)

1. **LexKite Can-do Framework (LKF)** – `content/framework/lkf.json`: cấp A1…C2 có bậc "+", điểm tiến độ 10–90, mỗi mục tiêu `{id, skill: R|L|S|W|I|M, level, gse, can_do_en, audience: gen|acad|work}`. Tự viết theo cấu trúc CEFR, không chép câu chữ.
2. **Khoá liên kết**: mọi mục nội dung mang `lo:[...]` (mục tiêu), `lvl`, và với từ là `sense` id. Một nghĩa từ → câu ví dụ → bài ngữ pháp → bài tập → câu hỏi đề: liên kết hai chiều để ôn tập lặp lại và "Làm lại câu sai" (đã có trong ExamKit.review) trỏ đúng chỗ.
3. **Thang sinh nội dung** (anh chủ 3/11: AI miễn phí không đủ chất lượng để VIẾT nội dung dạy):
   - Tầng 0 – quy tắc/corpus, 0 token: chia hình thái, collocation đếm n-gram, IPA Mỹ CMUdict, đồng nghĩa WordNet có lọc, sinh drill từ bài ngữ pháp, kiểm format.
   - Tầng 1 – **phiên Claude Sonnet VIẾT** nội dung dạy (giải thích ngữ pháp gốc en, lỗi L1 viết thẳng bằng L1, sổ mẫu câu, đề Cambridge, bài kỹ năng Can-do, nghĩa/ví dụ nghĩa v2, bài viết band 6/7) theo lô trong [`content-lots.md`](content-lots.md): mỗi lô một tập file riêng, mẫu chuẩn, cổng xanh, ≤ 150k context.
   - Tầng 2 – AI miễn phí (ai-pool: Gemini kho / Workers AI tk2 / Groq; KHÔNG AI tài khoản chính) chỉ: nháp dịch số lượng lớn để cổng chặn, và làm giám khảo thứ 2 (khác họ). Không còn là người viết chính.
   - Tầng 3 – **Opus** (trưởng nội dung/điều phối): spec, rubric, mẫu chuẩn, mở khoá lô (cổng/loader), đọc ≥ 10 % mỗi lô (`content-sample.mjs`), trọng tài khi 2 giám khảo bất đồng, gộp.
4. **Chuẩn bản xứ 15 ngôn ngữ**: nguồn giải thích chuyển sang **tiếng Anh đơn giản (en) làm gốc dịch**, vi vẫn là khoá giao diện; mỗi ngôn ngữ sinh **trực tiếp** từ en kèm "gói ngữ cảnh L1" (ví dụ đối chiếu với tiếng mẹ đẻ đó), rồi: `i18n-qa --strict` → dịch ngược (back-check) → giám khảo chấm 1–5 độ tự nhiên → < 4 thì sinh lại, 2 lần trượt → `i18n-fixed.json`/hàng chờ người. Thuật ngữ thi giữ nguyên; câu mẫu tiếng Anh khoá trước khi dịch (luật cũ §5).
5. **Bảng điểm chất lượng** `npm run content:score` → `content/pipeline/SCORE.md`: mỗi mảng một con số 0–100 tính từ độ phủ + tỉ lệ qua cổng; nâng chỉ tiêu `targets.json` khi đạt (luật cũ).

## 4. Kế hoạch theo pha

Chú thích cột: **Mục tiêu** đo được · **Cổng QA** tự động (phải xanh, thêm vào `content:gate`) · **Sinh** (tầng ở §3.3) · **Chi phí** · **i18n**.

### P0 – nền móng (dữ liệu + spec + cổng; không UI mới) · ~2–3 tuần, ≤ 2 phiên chạy cùng lúc

| # | Hạng mục | Mục tiêu | Cổng QA | Sinh | Chi phí | i18n | Trạng thái 3/11 |
|---|---|---|---|---|---|---|---|
| P0.1 | Khung LKF + gắn nhãn | `lkf.json` ~600 mục tiêu (A1–C2 × 6 kỹ năng × 3 đối tượng); 100 % bài ngữ pháp, bộ đề, bài kỹ năng hiện có có `lo` | `lkf-check`: id duy nhất, mỗi cấp × kỹ năng ≥ 15 mục tiêu, mọi `lo` tồn tại, báo % phủ | Tầng 3 viết khung 1 lần; tầng 1 gợi ý `lo` cho mục cũ, tầng 0 chặn sai cấp ±1 | $0 | `can_do_en` → 13 ngôn ngữ qua G0 (chỉ hiển thị cho người học) | ✅ #401 |
| P0.2 | Mô hình nghĩa từ v2 (schema + lõi 3.000) | Lõi 3.000 từ#loại: tách nghĩa (`sense`), CEFR theo nghĩa, ≥ 2 ví dụ/nghĩa ở độ dài theo cấp, ≥ 3 collocation, pattern, register, họ từ; xử lý hết 280 cờ CEFR | `sense-check`: ví dụ chứa đúng dạng từ, độ dài câu theo cấp (A1 ≤ 8 từ… C1 ≤ 25), collocation có tần suất > ngưỡng trong corpus mở, cấp nghĩa ≥ cấp từ, không trùng ví dụ; build-lexicon vẫn xanh | Tầng 0 lấy ứng viên nghĩa (WordNet) + collocation (đếm n-gram); tầng 1 viết def/ví dụ theo lô 25; tầng 2 chấm | $0 (≈ 3.000 × 2 lần gọi ≈ 6k, chia 3 đêm) | gói nghĩa 13 ngôn ngữ chuyển khoá `từ#loại#n`, `lexicon-i18n.yml` dịch theo nghĩa (đã có cờ 2) | ⏳ 3/11 phiên content-audit: cổng `sense-check` + [spec](specs/sense-v2.md) + lô gold 100; còn 2.900 từ → lô S-SENSE |
| P0.3 | Kho điểm ngữ pháp | `grammar-inventory.json` ~300 điểm A1–C2 "Can use X to do Y" + dấu hiệu cấp; ánh xạ 77 bài; danh sách bài thiếu (A1 ≈ 15, C1 +9, C2 ≈ 10) | `grammar-map-check`: mỗi bài ↔ ≥ 1 điểm, mỗi điểm A1–B2 có bài hoặc nằm trong hàng chờ; quiz của bài cùng cấp ±1 | Tầng 3 viết inventory 1 lần; tầng 0 ánh xạ theo từ khoá + tầng 1 xác nhận | $0 | tiêu đề điểm ngữ pháp vào nhóm i18n lazy | ✅ #402 |
| P0.4 | Ngân hàng lỗi theo tiếng mẹ đẻ | 14 ngôn ngữ × 25 lỗi ưu tiên = 350 mục `{l1, area: pron|gram|vocab, wrong, right, why_l1, lesson, lo}`; mỗi bài ngữ pháp A2–B2 có ≥ 1 ghi chú L1 cho mỗi ngôn ngữ trong 6 ngôn ngữ đông người dùng nhất | `l1-check`: câu sai thật sự sai (giám khảo + rule), câu đúng qua writecheck, `why_l1` viết bằng chính L1 và nhắc đúng hiện tượng của L1 đó; không trùng | Tầng 1 sinh từ đặc điểm đối chiếu đã biết (phát âm/trật tự từ/mạo từ/thì); tầng 2 giám khảo 2 họ + giám khảo bản xứ L1 | $0 (≈ 1k lần gọi) | viết thẳng ở L1, dịch ngược kiểm | ☐ chưa ai giữ → lô S-L1 (sau #429/#430) |
| P0.5 | Đặc tả đề máy đọc + cổng format | `content/exams/spec/{ielts-ac,ielts-gt,toeic-lr,toeic-sw,toefl-2026,cam-a2,cam-b1,cam-b2,cam-c1,cam-c2}.json` (phần, số câu, thời gian, dạng câu, độ dài bài, thang điểm, tiêu chí chấm tự diễn đạt); 100 % đề hiện có qua cổng | `exam-format-check`: đếm phần/câu/thời gian/độ dài khớp spec; mọi câu có lời giải + căn cứ; chống trùng (n-gram) với nguồn công khai biết trước → 0 trùng | Tầng 3 viết spec 1 lần (đối chiếu trang chính thức); tầng 0 kiểm | $0 | tên phần/dạng câu giữ tiếng Anh, hướng dẫn qua G0 | ✅ #356 (45 lệch đã biết; Cambridge 0 đề) |
| P0.6 | Nguồn giải thích en + đo "bản xứ" | Giải thích ngữ pháp (77 bài) có bản en gốc; 13 ngôn ngữ sinh lại trực tiếp từ en; điểm tự nhiên trung bình ≥ 4,3/5, không mục nào < 3,5 | `native-score` (back-check + giám khảo 1–5, lưu `content/i18n-native-score.json`), `i18n-qa --strict`, `explain-check` ≥ 98 % | Tầng 1 dịch theo lô, cache theo hash câu en; chỉ sinh lại mục < 4 | $0 (≈ 2.228 chuỗi × 13 ≈ 1,2k lần gọi lô 25) | chính là hạng mục i18n | ☐ chưa ai giữ → O5/O6 + lô S-EN |
| P0.7 | Bảng điểm chất lượng | `content:score` ra 6 điểm mảng + tổng; vào CI `content-qa.yml`; điểm chỉ được tăng (ngưỡng ghi vào file, như `visual-qa.budget.json`) | workflow tự đỏ khi điểm giảm hoặc đếm = 0 | Tầng 0 | $0 | – | ✅ #355 (sàn chỉ tăng; tổng 47,8 ngày 3/11) |

**Thứ tự P0** (một phiên một mảng file, không hai phiên ghi cùng file): P0.5 + P0.7 (cổng trước) → P0.1 → P0.3 → P0.2 → P0.4 → P0.6. P0.2 và P0.6 đụng `web/packs` / i18n nên không chạy song song.

### P1 – lấp lỗ nội dung lớn · ~6–8 tuần (khi số PR mở ≤ 15)

| Hạng mục | Mục tiêu đo được | Cổng QA bổ sung | Sinh / chi phí |
|---|---|---|---|
| Kho từ sâu | 8k mục → 100 % theo mô hình nghĩa v2; C2 ≥ 1.500; collocation ≥ 90 %; ảnh ≥ 8.000 (ưu tiên A1–B1 cụ thể, từ trừu tượng dùng cảnh tình huống); audio câu ví dụ UK+US | ảnh: cổng hiện có (TEXT_OBJ, vision judge ≥ ngưỡng, khớp `word#pos` tại lúc render); audio: Whisper khớp chữ ≥ 98 % | tầng 1 + CF images ≤ 0,6 hạn mức; Kokoro trên CI; $0 |
| Ngữ pháp đủ A1–C2 | 77 → ~140 bài; mỗi bài: công thức, ≥ 1 khối trực quan (timeline/diagram/scale), sai→đúng + vì sao, lỗi L1, ≥ 15 trắc nghiệm + 12 drill, mẹo nhớ hình ảnh | lesson-lint: đủ khối bắt buộc; đáp án 100 % đúng (content-check); độ khó quiz khớp cấp (mô hình IRT đơn giản từ dữ liệu làm bài ẩn danh) | tầng 1 theo mẫu bài sẵn có; tầng 2; $0 |
| Sổ mẫu câu chức năng × tình huống | 80 chức năng (chào hỏi, xin phép, đề nghị, phàn nàn, thương lượng, đồng ý/phản đối lịch sự…) × 40 tình huống (du lịch, công sở, y tế, học đường…) ≈ 2.400 mẫu, 3 bậc trang trọng, audio, liên kết roleplay/call | phrase-check: tự nhiên (2 giám khảo), đúng bậc trang trọng, không trùng; mỗi chức năng có bài luyện 4 bước (nghe → ngôn ngữ chính → luyện → nhập vai) | tầng 1; audio CI; $0 |
| 4 kỹ năng theo Can-do | mỗi cấp A1–C2 × kỹ năng ≥ 20 bài; nghe ≥ 4 giọng (US/UK/AU/IN, giọng TTS miễn phí); thêm dạng trung gian (tóm tắt cho bạn, giải thích biểu đồ); chấm viết/nói theo tiêu chí cấp | skill-check: mỗi bài có `lo`, độ dài/tốc độ nói theo cấp (A1 ≤ 110 wpm … C1 ≤ 170), câu hỏi có căn cứ nguyên văn | tầng 1; chấm AI dùng `ai.js` sẵn có; $0 |
| Cambridge A2–C2 | A2 Key, B1 Preliminary, B2 First: mỗi kỳ ≥ 3 đề hoàn chỉnh; C1/C2 ≥ 1 đề; tiêu chí chấm viết/nói tự diễn đạt | `exam-format-check` theo spec P0.5 | tầng 3 viết đề mẫu đầu tiên mỗi kỳ, tầng 1 sinh đề kế theo mẫu, tầng 2 + đọc 10 %; $0 |
| Lấp đề còn thiếu | theo `QUEUE.md` (TOEIC S&W 60 đề, TOEFL Writing 100, IELTS GT 200…) | cổng hiện có | quy trình `CONTENT-PIPELINE.md` |

### P2 – vượt chuẩn · sau P1

- Chẩn đoán thích ứng theo mục tiêu LKF (thang 10–90) thay placement 20 câu; lộ trình cá nhân hoá dùng learner-memory (theo `on-device-ai` – không fine-tune trên máy).
- Video giảng cho mỗi điểm ngữ pháp/chức năng ưu tiên (Ama + Carlos, tiếng Anh, ≤ 150 wpm) – **anh duyệt mẫu trước**, không tiêu credit khi chưa được duyệt (`CREDIT-RULES.md`).
- Viết/nói: phản hồi theo "dấu hiệu cấp" của kho điểm ngữ pháp (bài viết của anh đang ở B1 vì…, để lên B2 cần…).
- Cụm/thành ngữ C1–C2, từ vựng học thuật theo ngành, tiếng Anh nghề nghiệp (nhãn `work`).
- Ví dụ corpus thật (Tatoeba CC BY, có ghi nguồn) bên cạnh ví dụ tự viết.

## 5. Phiên/PR cho P0 (đã duyệt; mở tuần tự, ≤ 2 phiên chạy, chỉ khi merge captain gộp bớt hàng)

| PR | Nội dung | File chính | Xong khi |
|---|---|---|---|
| P0-A | Spec đề 10 kỳ + `exam-format-check` | `content/exams/spec/*`, `scripts/content-qa/exam-format-check.mjs` | 100 % đề hiện có xanh hoặc có danh sách lệch cụ thể |
| P0-B | `content:score` + ngưỡng chỉ tăng trong CI | `scripts/content-score.mjs`, `content-qa.yml` | SCORE.md sinh tự động, CI đỏ khi giảm |
| P0-C | Khung LKF + `lkf-check` + gắn `lo` cho mục cũ | `content/framework/lkf.json`, `content/framework/lo-map.json` (gắn `lo` tách khỏi web/js), `scripts/content-qa/lkf-check.mjs` | ≥ 95 % mục có `lo` hợp lệ · **xong 02/11**: 585 mục tiêu, 36/36 ô ≥ 15, 9.581/9.581 mục = 100 %; mới 114/585 mục tiêu có nội dung luyện (mảng "Khung Can-do" trong SCORE.md) |
| P0-D | Kho điểm ngữ pháp + ánh xạ 77 bài + hàng chờ bài thiếu | `content/framework/grammar-inventory.json`, `scripts/content-qa/grammar-map-check.mjs` | mọi bài ↔ điểm; hàng chờ A1/C1/C2 vào `targets.json` · **xong 02/11**: 300 điểm (A1 40 · A2 55 · B1 64 · B2 50 · C1 48 · C2 43), 77/77 bài ↔ điểm, 150 điểm đã có bài đúng cấp, 150 điểm vào hàng chờ "Ngữ pháp – bài <cấp>" |
| P0-E | Schema nghĩa v2 + `sense-check` + lô thử 100 từ lõi | `scripts/build-lexicon.mjs`, `LEXICON.md` | lô thử 100 % xanh, rồi CI chạy 3.000 từ theo đêm |
| P0-F | Ngân hàng lỗi L1 (6 ngôn ngữ đầu, rồi 14) | `web/js/grammar/l1/*`, `scripts/content-qa/l1-check.mjs` | 150 mục đầu xanh, ghép vào khối `mistake` sẵn có |
| P0-G | Nguồn giải thích en + `native-score` | `web/i18n/content/*`, `scripts/i18n-native-score.mjs` | trung bình ≥ 4,3/5, không mục < 3,5 |
| P0-H | **Dễ học – dễ nhớ** (sư phạm): 12 tiêu chí có nghiên cứu → luật máy đo tầng 0 ([spec](specs/learnability.md)), mảng mới trong `content:score`, hàng sửa lô 25 | `scripts/content-qa/learnability.mjs`, `content/pipeline/LEARN.md` | mọi bài được chấm, sàn chỉ tăng, lô 1 sửa xong · **02/11**: tổng 84,3 (ngữ pháp 91,6 · lộ trình 78,3 · bộ từ 71,8 · kỹ năng 95,4); lô 1 = 25 cặp dễ nhầm cho 25 bộ từ yếu nhất |


## 6. Lộ trình SCORE ≥ 95 (3/11, anh chủ: > 95/100; không đổi chuẩn đích/trọng số)

Tổng hiện 47,8 = trung bình 7 mảng; phần còn trống cộng lại đúng 52,2 điểm ⇒ ≥ 95 cần gần như MỌI thành phần đạt chuẩn (dư ~5 điểm). Tầng 0 rẻ (đồng nghĩa/IPA Mỹ/collocation cho mục có sẵn) chỉ ≈ +0,5; điểm lớn nằm ở nội dung mới. Lô chi tiết (file, mẫu, cổng, token): [`content-lots.md`](content-lots.md). Khi #430 thêm mảng "Dễ học" vào `content:score`, tính lại bảng này.

| Thành phần (mảng) | Thiếu | +điểm tổng | Cách sinh | Gọi AI miễn phí | Đêm CI / lô Sonnet |
|---|---|---|---|---|---|
| điểm bản xứ (i18n) | 0→5 | 3,57 | O5 + Sonnet en gốc, L1 viết thẳng; AI = giám khảo 2 | ~2k (chấm) | 6 lô S-EN + 2 đêm |
| sổ mẫu câu chức năng (Giao tiếp) | 100 | 2,86 | xưởng #429 → Sonnet viết phần còn lại | – | 1–2 đêm sau #429 |
| mục tiêu Can-do có nội dung luyện | 481 | 2,86 | mọi lô gắn `lo`; Opus ánh xạ | 0 | đi kèm các lô |
| tình huống Play & Speak | 39 | 2,79 | Sonnet (S-SIT) | 0 | 3 lô |
| cuộc gọi Ama/Carlos | 49 | 2,33 | Sonnet (S-CALL) | 0 | 4 lô |
| mục gold cách dùng | 772 | 2,21 | #427/#430 → Sonnet | 0 | 3 lô sau gộp |
| roleplay | 44 | 2,10 | Sonnet (S-RP) | 0 | 3 lô |
| trung gian (mediation) | 30 | 2,00 | O3 + Sonnet (S-MED) | 0 | 2 lô |
| Cambridge A2–C2 | 30 đề | 5,71 | O2 + Sonnet (S-CAM) + audio Kokoro CI | 0 | 14 lô + 3 đêm audio |
| ngữ pháp trắc nghiệm + tự luận | 3.964 | 3,37 | xưởng #429 (AI nháp, cổng) + Sonnet soát | ~8k | 8 đêm |
| bài ngữ pháp A1/C1/C2 + điểm đúng cấp | 31 bài | 3,18 | Sonnet (S-GRAM) | 0 | 4 lô sau #429/#430 |
| kỹ năng (đọc/nghe/nói/viết band 6/7) | ~700 | 5,8 | Sonnet (S-SKILL, S-W67) + audio CI | 0 | 10 lô |
| đề IELTS/TOEIC/TOEFL còn thiếu | theo QUEUE.md | 4,3 | Sonnet + exam-format-check | 0 | 8 lô |
| từ#loại 20k + C2 + ảnh + gói nghĩa + col/syn/IPA Mỹ (Kho từ, i18n) | 10.852 từ, 16.912 ảnh | 9,3 | CI tầng 0 + lexicon-expand + vimg + lexicon-i18n | ~30k | 30–40 đêm (nghẽn: hạn ảnh CF_POOL, sản lượng expand) |

**CQ1–CQ5 (audit 24/10, thẻ AG – đo 3/11):** CQ1 ghi chú cách dùng ⏳ 31 → 40 % (296/747) · CQ2 nhánh `br` ⏳ roleplay 25 %, Confidence ≥ 2 nhánh 20 % → lô S-RP-BR · CQ3 band 6/7 ☐ 142/142 bài band 8 → O4 + S-W67 · CQ4 phát âm i18n ⏳ `tip` 0/56, `how` 43/56 → O6 · CQ5 vi-only ☐ (TOEIC S&W, TOEFL CW, readings, quiz ngữ pháp 3 %) → O6. Lỗi "mất {x}" lời giải đề: gốc ở en.json, sửa #527 (lỗi cũ 2.183 → 1.754).

**Mốc (điều kiện: 2–3 phiên Sonnet/ngày, mỗi phiên 1 lô; #429/#430 gộp trong tuần):** 60 ≈ 10/11 (S-SIT, S-CALL, S-RP, S-MED, Cambridge A2/B1, sổ mẫu câu) · 75 ≈ 20/11 (+ Cambridge B2–C2, bản xứ, gold, ngữ pháp) · 85 ≈ 05/12 (+ Can-do, kỹ năng, đề còn thiếu, gói nghĩa) · 95 ≈ 10/01/2027 (+ kho từ 20k và ảnh – phụ thuộc hạn mức đêm, không mua thêm).
**Tiến độ dự kiến lấp bảng điểm (xưởng `CONTENT-FACTORY.md`, một dòng/đợt):**
- Đợt 1 (02/11, Giao tiếp + Ngữ pháp): xưởng + kind `functions`, `mcq` chạy đêm (~100 chức năng/đêm, ~500 câu trắc nghiệm/đêm trước cổng) → sổ chức năng 100/100 ~04/11, trắc nghiệm 3.000 ~10/11; Ngữ pháp ≥ 95 ~20/11 khi bật thêm drill + bài C1/C2; Giao tiếp ≥ 95 ~25/11 khi bật gold/roleplay/cuộc gọi/tình huống (cần Kokoro trong luồng, đợt 1b).

Nguồn phương pháp: englishprofile.org (EVP/EGP), oxfordlearnersdictionaries.com/about/wordlists, pearson.com GSE learning objectives, rm.coe.int (CEFR Companion Volume), cambridgeenglish.org exam format, ets.org (TOEFL 2026, TOEIC), ielts.org / britishcouncil.org (IELTS format, band descriptors), Swan & Smith *Learner English* (CUP, 2001).
