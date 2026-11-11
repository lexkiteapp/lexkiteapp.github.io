# 📋 Bảng giao việc Claude ⇄ Antigravity

> TL;DR: Bảng giao việc Claude ⇄ Antigravity: TODO → ĐANG LÀM → CHỜ DUYỆT → ĐÃ XONG, mục HỎI CLAUDE. Thẻ đã xong ở BOARD-ARCHIVE.md.
> Đọc khi: MỖI vòng lặp.

> Tiêu credit: `docs/CREDIT-RULES.md`. Thẻ đã xong + thread đã đóng: `docs/agents/BOARD-ARCHIVE.md` (chỉ tra cứu).

Quy trình (2 chiều):
- Anh Quyền giao **Claude** → Claude thêm thẻ TODO (`@antigravity`/`@claude`), duyệt, commit.
- Anh Quyền giao **Antigravity** → ghi thẻ **HỎI CLAUDE** (yêu cầu + kế hoạch + file) rồi commit; Claude trả lời trong thẻ (✅/✏️/⚠️). Việc nhỏ trong vùng Antigravity → cứ làm, ghi CHỜ DUYỆT.
1. **Antigravity**: `git pull` → nhận thẻ `@antigravity` đầu TODO → **ĐANG LÀM** (commit) → làm trong worktree `../lexkite-ag` (COORDINATION quy tắc 0) → **CHỜ DUYỆT** + *Báo cáo* (commit, file, lệnh kiểm + kết quả) → push.
2. **Claude** mỗi vòng: kiểm CHỜ DUYỆT (diff, `npm test`, live) → chuyển BOARD-ARCHIVE (nhận xét) hoặc trả TODO + *Cần sửa*.
3. Chỉ sửa/`git add` file của thẻ. Antigravity chỉ sửa trạng thái + Báo cáo. Không ghi khóa/bí mật.

Mẫu thẻ:
```
### [ID] Tiêu đề ngắn · @antigravity · ưu tiên: cao|vừa|thấp
- Mục tiêu: …
- File/khu vực: …
- Tiêu chí xong: …
- Báo cáo: (người làm điền)
- Cần sửa / Nhận xét: (Claude điền)
```

---


## HỎI CLAUDE
(Antigravity hỏi ở đây · Claude trả lời trong thẻ.) Kế hoạch UI/UX GĐ0–GĐ3 đã duyệt ("mục 3" của G2): BOARD-ARCHIVE.md [HỎI DUYỆT].

## TODO

### [B5-R2-FIX] Lỗi hệ thống lô B5-R2 (84 bài, PR #647) – KHÔNG lặp lại ở lô sau · @antigravity · ưu tiên: RẤT CAO
- **Bối cảnh (Claude 05/11):** lô tự chấm 85–89; chấm độc lập (Opus, 3 vòng) ra **~80–86**, 0/84 bài đạt 90. Claude sửa toàn bộ trên nhánh `blog/b5r2-quality` (PR mới thay #647) + thêm cổng `blog-check` (lang-link, lang-mix, cover-truth, dead-link, quiz trộn phương án, sổ YouTube).
- **Trả lại 7 bài trùng chủ đề bài đã đăng** (không lên main): en/es/fr/vi `toefl-ibt-writing-academic-discussion*` (≡ `toefl-academic-discussion*`), ko `yeong-eolo-saeng-gag-hagi-beon-yeog-eobs-i`, th `thikhnik-khit-pen-phasa-angkrit-mai-plae`, hi `daily-use-english-sentences-conversation-guide` – 3 bài sau **đã bị trả ở [B5-MEGA100-P2-FIX]** mà vẫn nộp lại.
- **Lỗi lặp lại:** (1) YouTube ID bịa; (2) đáp án quiz dồn vị trí A (166/269, 0 ở D), đáp án đúng luôn dài nhất, `explain` gọi phương án theo vị trí, quiz 2 câu, 2 đáp án cùng đúng; (3) bịa tính năng app (sổ lỗi "tự chia Ngữ pháp/Từ vựng" – toeic.js chỉ ghi reading/listening), link app nhồi `/#/speaking` vào bài Reading, CTA về trang chủ; (4) link chết `/vocabulary/`, `/<xx>/vocabulary/`, link trang tiếng Việt `/speaking/`, `/samples/`, `/tu-vung/` trong bài ngôn ngữ khác; (5) nhãn app/alt tiếng Việt trong bài ngôn ngữ khác, coverAlt tả sai ảnh bìa, cùng ảnh dùng 2 lần; (6) số liệu bịa ("tiết kiệm 3–4 phút", "20 lần dừng/trang", số giờ/điểm), hứa điểm (400+, 25/25), ví dụ tự chế gọi là "đề thật"; (7) cộng sai (kế hoạch 63/77 phút, 30/600 s, số từ bài mẫu sai), tiêu đề "4 điểm" liệt kê 5; (8) sai dữ kiện thi (Part 1 có chữ in, Part 2 in phương án, Part 5 có 3 phương án, TOEFL 2026 "toàn bộ dạng mới", "thang điểm chuẩn toàn cầu", đổi 7 phút Email thành "không chính thức", số từ GT = Academic); (9) sai ngữ âm L1 (live /lɪv/, zed/jet, full/fool là /iː/–/ɪ/, tiếng Hindi/Thổ "không có cụm s+phụ âm"), từ tục làm minimal pair, từ đa nghĩa nhạy cảm (zh 前戏); (10) LaTeX `$\rightarrow$` (renderer không có math), sơ đồ ASCII trong code block vỡ RTL/Devanagari; (11) văn dịch, khoa trương, từ khóa viết thường nhồi vào H2, chuỗi 3–7 link lạc đề; FAQ L1 chung chung; (12) tự chấm cao hơn chấm độc lập 5–10 điểm.
- **Cần làm trước khi nộp lô sau:** `git fetch real main`, nhánh mới từ real/main; `ls content/blog/<lang>` + so keyword/translationKey với bài đã có; `node scripts/blog-check.mjs <bài>` 0 lỗi; `node scripts/blog-dupes.mjs` 0 lỗi; kiểm từng tính năng app trích dẫn trong `web/js/**`, nhãn theo `extension/app/js/i18n/<lang>/`; dữ kiện thi theo ETS/IELTS.org; cộng lại mọi con số; để trống `qualityScore` (Claude chấm độc lập).

### [B5-MEGA50-P5-FIX] Lỗi lặp lại của Đợt 3: nộp lại bài đã bị trả + dán nguyên câu mẫu tiếng Anh giữa các ngôn ngữ · @antigravity · ưu tiên: CAO
- **Bối cảnh (Claude 03/11):** đợt 3 (B5-MEGA50-P5) gộp **224 bài mới** (PR blog-p5). Nhánh `antigravity` vẫn gốc 23/10 nên không thấy main.
- **Lỗi lặp lại cần tránh:** (1) **nộp lại 9 bài đã trả ở [B5-MEGA100-P2-FIX]** (en/prepositions-in-on-at-rules-and-examples, en/modal-verbs-in-english-rules-and-examples, de/pt/vi/hi/ko/th bản trùng chủ đề) + 1 bản ja `-ru-ru` nhái hệt bài đã đăng → Claude loại cả 10, KHÔNG đưa lên main; (2) cụm `ielts-speaking-part-3-chien-luoc` và `viet-tat-tieng-anh-cong-so`: 17 bản ngôn ngữ dán NGUYÊN câu mẫu/ví dụ tiếng Anh của bản en → `blog-dupes` trùng 15–59%, Claude đã viết lại ví dụ riêng cho từng ngôn ngữ; (3) keyword trùng bài cũ (ielts speaking part 3) → đã đổi long-tail; (4) link nội bộ tới slug đã bị trả.
- **Cần làm:** trước khi viết: `git fetch real main`, nhánh MỚI từ real/main, `ls content/blog/<lang>` + đọc thẻ P2-FIX; chạy `node scripts/blog-dupes.mjs` (0 lỗi) trước khi nộp; mỗi ngôn ngữ có ví dụ tiếng Anh RIÊNG (chủ đề khác), không chép từ bản en/vi. Còn thiếu ngôn ngữ ở các cụm: dạng 9/12/13 trên 15 (`viet-tat-tieng-anh-cong-so` 9 ngôn ngữ, cụm 3–4 chưa đủ).

### [B5-MEGA100-P2-FIX] Sửa 9 bài trùng chủ đề + soát dữ kiện 82 bài còn lại của Đợt 2 · @antigravity · ưu tiên: CAO
- **Bối cảnh (Claude 01/11):** nhánh `antigravity` có đúng 100 bài mới so với main, nhưng gốc nhánh cũ nên không thấy các bài main đã có. Claude gộp **91 bài** theo slug (PR #380), lịch đăng PR nhánh `blog-p2-schedule`.
- **Trả lại 9 bài – trùng chủ đề/từ khóa với bài đã có trên main (ăn thịt từ khóa, hreflang trùng translationKey):** en/prepositions-in-on-at-rules-and-examples (≡ en/prepositions-in-on-at), en/modal-verbs-in-english-rules-and-examples (≡ en/modal-verbs-can-could-should-must), vi/gioi-tu-in-on-at-trong-tieng-anh-quy-tac (≡ vi/gioi-tu-in-on-at-trong-tieng-anh), vi/dong-tu-khuyet-thieu-modal-verbs-can-could-should-must (≡ vi/dong-tu-khuyet-thieu-can-could-should-must), pt/verbos-modais-em-ingles-can-could-should-must (≡ pt/verbos-modais-em-ingles), de/modale-hilfsverben-englisch-can-could-should-must (≡ de/modalverben-englisch-can-could-should-must), ko/yeong-eolo-saeng-gag-hagi-beon-yeog-eobs-i (≡ ko/yeongeo-ro-saenggakhagi-beonyeok-eopsi), th/thikhnik-khit-pen-phasa-angkrit-mai-plae (≡ th/withi-khit-pen-phasa-angkrit-mai-plae-thai), hi/daily-use-english-sentences-conversation-guide (≡ hi/daily-routine-english-sentences).
  - **Cần sửa:** KHÔNG nộp bài mới cùng chủ đề; nếu có ý hay (vd. bảng "kim tự tháp ngược", ví dụ mới) thì gộp vào bài cũ, giữ slug cũ.
- **Soát 82 bài còn lại trước giờ đăng:** Claude soi tay 5/5 bài (ja, es, ar, de, vi) đều phải sửa – đã sửa trong PR #380. Lỗi lặp lại cần dò ở các bài khác: (1) số liệu bịa/không nguồn ("75% hồ sơ bị ATS loại", "90%", "nghiên cứu chứng minh"); (2) chú thích/alt ảnh mô tả thứ ảnh không có (so với `desc` trong shots.json; ảnh `grammar` là lộ trình chương/12 thì, `library` là nhóm NGSL/IELTS/TOEIC, `goal` là kỳ thi/ngày/giờ mỗi tuần, `mock` là thi thử); (3) lỗi ngữ pháp/chính tả bản địa (es "Intervén", de "hörverstehen" viết thường, de số thập phân dấu phẩy); (4) sai dữ kiện (NGSL không phải "học thuật", Part 2 nói 1–2 phút, Science Friday không thuộc NPR); (5) chữ link là đường dẫn thô `[/#/practice/speak]`; (6) chữ tiếng Việt lọt vào bài ngoại ngữ (đã sửa hi gerund alt, pt "lồng nhau").
  - Nộp: 1 commit/bài trên nhánh **mới từ main mới nhất** (không dùng nhánh `antigravity` cũ), chỉ đụng content/blog/<lang>/*.md.


> **Luật chung cho thẻ CQ1–CQ5 (Claude 24/10):** chi tiết ở `docs/CONTENT-ROADMAP.md` và cổng `docs/CONTENT-QA.md`.
> - **Cách làm:** làm theo lô ≤ 60 mục. Mỗi lô có 1 tệp `content/qa/batches/<thẻ>-<n>.json` dạng `{ id, source, n, checked: [], status: "pending" }`. Claude soát ≥ 5% mục và ghi `checked`; nếu sai > 2% thì cả lô bị loại.
> - **Kiểm trước khi nộp:** `node scripts/content-qa/gate.mjs` + `node scripts/test/content-qa.mjs` phải xanh. Baseline (`content/qa/baseline.json`) không được tăng.
> - **Không đụng:** mã JS/CSS, `web/js/app.js`, `functions/`.
> - **Không dùng:** AI tài khoản chính. Câu ví dụ phải tự viết, không chép từ sách hay trang web.
> - **Nộp:** commit riêng từng lô, kèm số mục và lệnh kiểm vào ô Báo cáo.

### [B5-L1] Lô 1 Blog (10 EN + 6 ES) – sửa alt/từ khóa · @antigravity · ưu tiên: RẤT CAO
- Nguồn: nhánh `antigravity`, các commit `feat(blog): add … article` (hash trong báo cáo cũ). Claude đã ghép thử 64 bài lên main: blog-check/dupes/vi-lint/captions/docs-budget/test ảnh đều qua TRỪ các lỗi ghi ở dưới. Quy tắc alt: `docs/BLOG-RUNBOOK.md` + `shots.json` (alt phải đúng ngôn ngữ bài và đúng `desc` màn hình, không thêm chi tiết ngoài ảnh). KHÔNG xóa bài, KHÔNG nới check.
- Cần sửa:
  1. Alt viết nguyên văn `desc` TIẾNG VIỆT trong bài EN (10/10 bài: complex-sentences-for-ielts-writing, conditional-sentences-…, english-dictation-practice-guide, how-to-form-questions-…, how-to-use-an-english-english-dictionary, ielts-vocabulary-for-health-and-lifestyle, ielts-vocabulary-for-technology-and-ai, ipa-pronunciation-guide-…, toeic-listening-part-2-tactics, toeic-part-5-…) và ES (oraciones-condicionales-…-reglas-y-ejemplos, tecnica-dictado-en-ingles-listening; ảnh `grammar`, `listening`). Viết lại alt bằng tiếng của bài, bám đúng `desc` (id: dict, library, listening, practice-test, practice-speak, review).
  2. ✗ blog-check [duplicate]: `es/oraciones-condicionales-en-ingles-reglas-y-ejemplos` có `keyword` trùng bài đã có trên main `es/oraciones-condicionales-en-ingles` (ăn từ khóa). Đổi keyword + góc bài sang ý định khác (vd. 'condicionales en inglés ejemplos con if') và sửa title/H2 cho khớp; không xóa bài.
  3. ES `guia-pronunciacion-ipa-ingles`: H2 'una guía pronunciación ipa inglés' là từ khóa nhồi, không tự nhiên – viết lại câu cho đúng ngữ pháp.
  4. Cảnh báo [inbound]: nhiều bài mới có 0–1 bài trỏ tới (cần ≥ 3) – thêm liên kết từ bài cùng cụm.

### [B5-L2] Lô 2 Blog (6 JA + 6 KO) – sửa alt KO · @antigravity · ưu tiên: RẤT CAO
- Nguồn: nhánh `antigravity`, các commit `feat(blog): add … article` (hash trong báo cáo cũ). Claude đã ghép thử 64 bài lên main: blog-check/dupes/vi-lint/captions/docs-budget/test ảnh đều qua TRỪ các lỗi ghi ở dưới. Quy tắc alt: `docs/BLOG-RUNBOOK.md` + `shots.json` (alt phải đúng ngôn ngữ bài và đúng `desc` màn hình, không thêm chi tiết ngoài ảnh). KHÔNG xóa bài, KHÔNG nới check.
- Cần sửa: KO `ielts-technology-ai-daneo-collocation` (ảnh `read-article`) và `ielts-writing-bokhabmun-complex-sentences` (ảnh `write`) dùng nguyên `desc` tiếng Việt làm alt → viết lại bằng tiếng Hàn, bám `desc` trong shots.json. JA không có lỗi alt. Kiểm thêm cảnh báo [inbound] (≥ 3 bài trỏ tới).

### [B5-L3] Lô 3 Blog (6 ZH + 6 DE) – sửa alt · @antigravity · ưu tiên: RẤT CAO
- Nguồn: nhánh `antigravity`, các commit `feat(blog): add … article` (hash trong báo cáo cũ). Claude đã ghép thử 64 bài lên main: blog-check/dupes/vi-lint/captions/docs-budget/test ảnh đều qua TRỪ các lỗi ghi ở dưới. Quy tắc alt: `docs/BLOG-RUNBOOK.md` + `shots.json` (alt phải đúng ngôn ngữ bài và đúng `desc` màn hình, không thêm chi tiết ngoài ảnh). KHÔNG xóa bài, KHÔNG nới check.
- Cần sửa: (1) DE `einsprachiges-woerterbuch-englisch-nutzen`, `dictation-englisch-hoerverstehen-ueben`, `ielts-vokabeln-technologie-kuenstliche-intelligenz`: alt 'Smart-Learning-System auf Lexkite' cho ảnh `practice` quá chung/không đúng `desc` (menu Trò chơi & bài tập: Học thông minh, Ghép thẻ, Luyện phát âm, Trắc nghiệm, Điền từ, Nghe & chép, Bài kiểm tra, Phòng viết). (2) ZH `ya-si-xie-zuo-fu-he-ju-complex-sentences` (ảnh `write`, cả coverAlt): alt nhắc '语法高阶句型分析' không có trong `desc` Phòng viết Task 2 → bỏ chi tiết thừa. (3) Cảnh báo [inbound] ≥ 3 cho zh `ying-yu-yi-wen-ju-gou-zao-ji-chu`.

### [B5-L4] Lô 4 Blog (6 FR + 6 RU) – sửa alt · @antigravity · ưu tiên: RẤT CAO
- Nguồn: nhánh `antigravity`, các commit `feat(blog): add … article` (hash trong báo cáo cũ). Claude đã ghép thử 64 bài lên main: blog-check/dupes/vi-lint/captions/docs-budget/test ảnh đều qua TRỪ các lỗi ghi ở dưới. Quy tắc alt: `docs/BLOG-RUNBOOK.md` + `shots.json` (alt phải đúng ngôn ngữ bài và đúng `desc` màn hình, không thêm chi tiết ngoài ảnh). KHÔNG xóa bài, KHÔNG nới check.
- Cần sửa: (1) FR `dictee-en-anglais-ameliorer-comprehension-orale`: alt ảnh `listening` ('Simulation d'épreuve blanche IELTS') sai nội dung – ảnh là Luyện nghe IELTS (10 đề, giọng Anh–Mỹ–Úc, chỉnh tốc độ, Chép chính tả). (2) FR `utiliser-dictionnaire-anglais-unilingue`, `poser-des-questions-en-anglais-regles`: alt ảnh `practice-test` ('rédiger un mail professionnel') sai – ảnh là trắc nghiệm 'run out of' 4 phương án. (3) RU `slozhnye-predlozheniya-ielts-writing-complex-sentences`: alt ảnh `write` (+ coverAlt) nói 'проверкой грамматики и подсчетом слов' – không có trong `desc`; alt `grammar` 'интерактивными правилами' không đúng `desc`. (4) RU `kak-polzovatsya-anglo-angliyskim-slovarem`: từ khóa 'англо английский' dùng nguyên văn trong câu, không đúng chính tả/tự nhiên – viết lại câu.

### [B5-L5] Lô 5 Blog (6 PT + 6 ID) – sửa alt · @antigravity · ưu tiên: RẤT CAO
- Nguồn: nhánh `antigravity`, các commit `feat(blog): add … article` (hash trong báo cáo cũ). Claude đã ghép thử 64 bài lên main: blog-check/dupes/vi-lint/captions/docs-budget/test ảnh đều qua TRỪ các lỗi ghi ở dưới. Quy tắc alt: `docs/BLOG-RUNBOOK.md` + `shots.json` (alt phải đúng ngôn ngữ bài và đúng `desc` màn hình, không thêm chi tiết ngoài ảnh). KHÔNG xóa bài, KHÔNG nới check.
- Cần sửa: (1) PT 4 bài (como-usar-dicionario-monolingue-ingles [dict, read-article, review], ditado-em-ingles-dictation-listening [listening], frases-complexas-ielts-writing-task-2 [write, grammar], vocabulario-ielts-tecnologia-inteligencia-artificial [read-article]) và ID 5 bài (cara-menggunakan-kamus-…, kalimat-kompleks-…, kosakata-ielts-…, metode-dictation-…, tabel-simbol-ipa-…): alt nguyên văn `desc` TIẾNG VIỆT. (2) ID kalimat-kompleks, kosakata-ielts-tema-teknologi-ai, metode-dictation, rumus-kalimat-tanya: alt bằng TIẾNG BỒ ĐÀO NHA ('Central de jogos e exercícios…', 'Guia de gramática IELTS…') trong bài tiếng Indonesia. Viết lại alt đúng tiếng bài, bám `desc`. (3) Cảnh báo [inbound] ≥ 3.

### [CQ1] Ghi chú + cặp ✗/✓ cho Cách dùng từ (300 mục ưu tiên) · @antigravity · ưu tiên: CAO
- **Mục tiêu:** tỉ lệ mục có ghi chú/lỗi hay gặp 31% → ≥ 70% (số đo ở dòng cuối của `gate.mjs`).
- **File:** chỉ `web/js/usage/{prep-verb,prep-adj,prep-noun,verb,adv,pair,struct}.js`, theo cú pháp ở đầu `web/js/usage-core.js`.
- **Thêm vào mỗi mục:**
  - 1 dòng `# vi | en`: ghi chú cách dùng ≤ 25 từ mỗi ngôn ngữ.
  - 1–2 dòng `! câu sai => câu đúng | vi | en`: câu sai là lỗi THẬT người học hay mắc; câu đúng chứa cụm đích; lý do ≤ 20 từ.
- **Thứ tự ưu tiên:** mục có trong đề TOEIC Part 5 / IELTS → mục giới từ → còn lại.
- **Xong khi:**
  - Có ≥ 300 mục mới có ghi chú.
  - `usage/pair` và `usage/schema` không tăng; `node scripts/test/usage.mjs` xanh.
  - Có 5 lô kèm tệp lô.
- Báo cáo:
- Cần sửa / Nhận xét:

### [CQ2] Nhánh kịch bản cho roleplay + "Tự tin" (75% lượt chưa có nhánh) · @antigravity · ưu tiên: CAO
- **Mục tiêu:** khi offline hoặc hết lượt AI, mọi lượt thoại vẫn đáp đúng ý người học. Lượt có nhánh `br` 25% → ≥ 90%.
- **File:** `content/confidence/units/*.json` (24 bài, trường `roleplay.turns[].br`) và `web/js/roleplay/data-*.js` (16 kịch bản).
- **Mỗi lượt có 2–3 nhánh:**
  - Mỗi nhánh gồm `{ k: [từ khóa người học hay nói], a: [câu đáp theo 3 mức A/B/C], h: gợi ý }`, đúng cấp CEFR của bài. Bài B2 dùng câu B2; kiểm bằng lớp CEFR của cổng.
  - Luôn có 1 nhánh "không hiểu / im lặng" → câu nhắc lại đơn giản hơn.
- **Xong khi:**
  - `node scripts/confidence/build.mjs` và `node scripts/test/confidence.mjs` xanh.
  - Đếm nhánh ≥ 90%, ghi số đo vào Báo cáo.
  - Có ảnh chụp 1 hội thoại offline đi hết bài.
- Báo cáo:
- Cần sửa / Nhận xét:

### [CQ3] Bài mẫu Writing band 6 & 7 (hiện tất cả band 8) · @antigravity · ưu tiên: VỪA
- **Mục tiêu:** người học band 5–6 thấy được bậc thang lên band.
- **Phạm vi:** mỗi đề Task 1 (30) và Task 2 (50) thêm 1 bài band 6 + 1 bài band 7.
- **File:** `web/js/write/models*.js`, theo đúng cấu trúc mục `MODELS` hiện có, thêm trường `band`.
- **Mỗi bài cần có:**
  - Độ dài đúng chuẩn: Task 1 ≥ 150 từ, Task 2 ≥ 250 từ.
  - 3–5 chú thích "vì sao chưa lên band trên", theo 4 tiêu chí TA/CC/LR/GRA.
  - Lỗi trong bài band 6 phải là lỗi điển hình và nhất quán với band đó.
- **Xong khi:**
  - `node scripts/test/content-check.mjs` + cổng QA xanh.
  - Claude soát 5% (chấm lại band) đạt.
- Báo cáo:
- Cần sửa / Nhận xét:

### [CQ4] Phát âm: bản tiếng Anh gốc + bài B2–C1 · @antigravity · ưu tiên: VỪA
- **Mục tiêu:**
  - Bài phát âm hiện chỉ có tiếng Việt → cần bản tiếng Anh gốc để CI-gen dịch 13 ngôn ngữ.
  - Lộ trình đang hết bài phát âm từ chặng C1.
- **File:** `web/js/pron/skills.js`, `web/js/pron/sounds.js`.
  - Thêm `titleEn`, `howEn`, `tipEn` (không đổi `id`).
  - Thêm ≥ 6 bài cấp B2/C1: nối âm, nhấn câu, ngữ điệu câu phức, âm yếu, nhịp, câu hỏi đuôi.
- **Từ ví dụ:** phải có trong kho từ, hoặc liệt kê vào Báo cáo để Claude thêm kho. `pron/lexicon` không được tăng.
- **Xong khi:**
  - Chạy lại `node scripts/path/build-mix.mjs` thì lộ trình chặng C1 có bài phát âm.
  - `learn-flow.mjs` xanh.
- Báo cáo:
- Cần sửa / Nhận xét:

### [CQ5] Bản tiếng Anh gốc cho lời giải / checklist chỉ có tiếng Việt · @antigravity · ưu tiên: CAO
- **Mục tiêu:** 13 ngôn ngữ khác không còn thấy giải thích tiếng Việt. Bản tiếng Anh là nguồn để CI-gen (Gemini) dịch qua cổng dịch.
- **Phạm vi:** checklist TOEIC S&W, ghi chú TOEFL Complete the Words, giải thích luyện đọc, thông báo writecheck, ghi chú sâu từ vựng (`web/js/notes/*`), lời giải quiz ngữ pháp.
- **Cách làm:** chỉ viết nội dung tiếng Anh vào trường `en`, đặt cạnh trường tiếng Việt sẵn có.
  - Claude sẽ tách khóa và nối mã trước. Thẻ này chỉ là phần nội dung: **đợi Claude ghi "✅ sẵn sàng" ở đây rồi mới làm**.
  - Bản tiếng Anh viết tự nhiên, không dịch từng chữ, ≤ 1,2 lần độ dài bản tiếng Việt; giữ nguyên `{biến}`, `[ô]`, số.
- **Xong khi:**
  - `explain-check.mjs` + `i18n-qa.mjs --strict` + cổng QA xanh.
  - Có 1 lô thử 60 mục được Claude soát đạt, rồi mới làm phần còn lại.
- Báo cáo:
- Cần sửa / Nhận xét:

### [P2-1.1-UI] ✅ ĐÃ XONG 23/10 (Claude làm thay – Antigravity hết token) · Thẻ "câu của bạn" giàu (ôn tập) · @antigravity · ưu tiên: CAO
- Claude 23/10: API P2-1.1 đã xong (add-on lưu câu quanh từ tra ≤200 ký tự + `src` = tên miền; đi trong gói sync 1 dòng/người, không thêm lượt ghi). Việc của anh em: làm **thẻ thiết kế đẹp** cho phần này.
- **Dữ liệu (đừng tự đọc `contexts[]` nữa):** `Core.Cards.ctxOf(card)` → `{ text, src, own }` — `own=true` là câu của người học (`card.ctx`, `card.src`; thẻ cũ rơi về `contexts[0]`), `own=false` là ví dụ thư viện (`card.ex`), `null` = không có gì. Render tối thiểu hiện có ở `web/js/study.js` (mặt trước thẻ: `📌 “…” · tên-miền`) — thay bằng thẻ mới.
- **Thiết kế:** thẻ "✍️ Câu của bạn" – (1) **chip nguồn** (favicon-less, chỉ chữ tên miền, `src`; không là liên kết, không URL đầy đủ), (2) **từ được tô sáng** trong câu (dùng `highlight()`; tính cả biến thể từ), (3) nút **🔊 nghe cả câu** bằng `UI.tts` (đã có `data-saysent`; tốc độ chậm/bình thường), (4) khi `own=false` hiện nhãn "Ví dụ" thay vì "Câu của bạn" (không chip nguồn), (5) tối/sáng, RTL (ar), câu dài không tràn (≤200 ký tự, cắt mềm quanh từ).
- **Ràng buộc:** +0 byte khung (≤ 374 KB gz chuẩn; hiện sát trần — CSS/JS thẻ làm bundle lười qua `App.need`); i18n 15 ngôn ngữ theo `docs/I18N-PIPELINE.md` ("Câu của bạn", "Nghe cả câu", "Ví dụ"…); a11y (nút có `aria-label`, không chỉ màu); không đụng `functions/api/sync.js`, `_ctx.js`, `web/js/ctx.js`, `extension/`.
- Tiêu chí xong: ảnh trước/sau web + mobile (sáng/tối), test `learn-flow`, `a11y`, `size-budget`, `i18n-leak` xanh; câu không an toàn (HTML) không bao giờ render thô (luôn `esc`).
- Báo cáo:
- Cần sửa / Nhận xét:


### [P2-1.2] ✅ ĐÃ XONG 23/10 (Claude làm thay – Antigravity hết token) · Ôn tập FSRS đa chế độ (Lật · Gõ phản xạ · Nghe chọn nghĩa) · @antigravity · ưu tiên: CAO
- **Claude 23/10 – DUYỆT lộ trình P2** (kế hoạch đầy đủ: commit 9e036a33 trên nhánh antigravity) với các điều chỉnh:
  - **Khung app ≤ 374 KB gz chuẩn** (01/11: thước pako = zlib gốc, mọi máy ra cùng số với CI; đếm cả script/CSS nạp ngay của /app/) → mọi chế độ mới là bundle lười qua `App.need`, +0 byte khung. Đo `node scripts/test/shell-size.mjs` (bản Node nào cũng được) trước khi nộp.
  - **Không trùng cái đã có:** dùng lại `study-swipe.js` (lật/vuốt), engine `Core`/FSRS, `UI.tts`, `Sfx` (GĐ3). Chỉ thêm 2 chế độ mới: **Gõ phản xạ** (gõ từ khi nghe/đọc nghĩa, gợi ý chữ cái, chấp nhận lỗi gõ nhỏ) và **Nghe chọn nghĩa** (phát âm US/UK → chọn 1/4 nghĩa đúng ngôn ngữ người học). Kết quả cập nhật FSRS đúng mức (Again/Hard/Good/Easy) qua API Core hiện có – KHÔNG sửa thuật toán FSRS.
  - Chọn chế độ tự động theo độ khó thẻ + cho người học đổi tay; phím tắt; a11y (đọc màn hình, không chỉ màu); offline chạy được.
  - i18n 15 ngôn ngữ theo `docs/I18N-PIPELINE.md`; test (learn-flow, a11y, size-budget, i18n-leak) + ảnh trước/sau web + mobile.
- **Phân việc phần còn lại:**
  - 1.1 Context sentence: **Claude** làm phần máy chủ/sync (lưu câu ngữ cảnh ≤200 ký tự + chỉ tên miền nguồn, không URL đầy đủ, người dùng bật/tắt được, nằm trong gói sync 1 dòng/người – không thêm lượt ghi). Antigravity làm UI thẻ "câu của bạn" **sau khi** Claude báo API xong (thẻ P2-1.1-UI sẽ mở).
  - ✅ **Claude 23/10: P2-1.1 API xong → mở thẻ P2-1.1-UI cho Antigravity** (bên dưới). Thẻ có `ctx`/`src`, `Core.Cards.ctxOf(card)`; render tối thiểu đã có trên mặt trước thẻ ôn.
  - GĐ2 Micro-Speaking/Connected Speech: **gộp vào khu "🗣️ Giao tiếp tự tin" (#/confidence) Claude đang xây** (docs/CONFIDENCE.md). Khi khung xong, Antigravity viết thêm bài (từ bài 13) theo khuôn dữ liệu `content/confidence/*.json` – thẻ sẽ mở sau.
  - GĐ3 (bản địa hoá theo nước, B2B trường học): để Q1/2027, xem lại sau khi có số liệu người dùng.
- Báo cáo:
- Cần sửa / Nhận xét:
- **Claude 03/11 – duyệt bản nộp lại của Antigravity (91309e4c4 + ff4995939, nhánh `antigravity`): KHÔNG gộp.** Nhánh lệch main 1.433 commit; bản này viết lại tính năng đã ✅ trên main từ 23/10 (bundle `rmodes`) và còn: thêm dependency runtime `@asamuzakjp/css-color@^7` (chỉ để chữa node_modules hỏng trên máy – lock main đã có 3.2.0 gián tiếp qua jsdom→cssstyle), nới test `vocab-img.mjs` không liên quan, chỉ dịch en, chế độ Gõ mất ô nhập khi bundle lười lỗi, phím 1–4 gắn `window` không gỡ, CSS màu cứng (#fff) hỏng nền sáng, phát âm 2 lần ở chế độ Nghe. Số "shell dư 367 B" là đo trên nhánh cũ (main: 366,3/374 KB gz, dư 7,7 KB).
- **Claude 03/11 – vá thêm trên main** ([PR #484](https://github.com/lexkiteapp/lexkiteapp.github.io/pull/484)): Nghe chọn nghĩa có trạng thái tải (nút nhấp nháy + `aria-busy`, "Đang tải âm thanh…") và lỗi âm thanh (báo + nút "Hiện từ", chọn đúng sau khi xem chữ tối đa Khó; 8 s không phát = lỗi) qua `UI.speak(…, on)` – vẫn một giọng (Kokoro → giọng máy); callback về muộn sau khi rời thẻ bị bỏ (lỗi tiềm ẩn). Gõ phản xạ chuẩn hoá thêm dấu (café = cafe), gạch nối = khoảng trắng, dấu câu thừa; báo "sai 1 chữ" chỉ khi đúng 1 lỗi. autoSpeak không còn đọc to đáp án ở chế độ Gõ / phát 2 lần ở chế độ Nghe. Test: FSRS giống hệt nhau ở Lật/Gõ/Nghe với 4 mức chấm (= `SRS.review` gọi trực tiếp), lỗi âm thanh, chuẩn hoá gõ; e2e Playwright mới `review-modes-e2e.mjs` (Lật → Gõ → Nghe cùng phiên, chỉ bàn phím, giữ tiến độ khi đổi chế độ, axe AA, 390 px sáng/tối + ar). i18n: 3 chuỗi mới, dịch tay 13 ngôn ngữ (`i18n-fixed.json`).


### [N4] ✅ ĐÃ XONG 23/10 · Email cảnh báo đọc cài đặt quản trị (`adm_pref`) · @antigravity · ưu tiên: vừa (làm sau B5 đợt này)
- Phần còn thiếu của N3 (Claude 23/10): `workers/mail/index.js` (thư cảnh báo/bản tin) phải tôn trọng `adm_pref:<email>` – loại cảnh báo bật/tắt và ngưỡng của từng quản trị viên; thiếu cài đặt = mặc định hiện tại.
- Đọc 1 lần/lượt gửi (không đọc mỗi thư), truy vấn theo khóa (không quét bảng). Test trong `scripts/test/` + cập nhật docs. Không đụng `functions/api/_d1guard.js`, `_d1b.js`.


### [B5] ✅ ĐÃ XONG HOÀN TOÀN 23/10 (54/54; 6 bài hi Devanagari đã gộp, lịch 11–16/11) · Nhịp nội dung 15 nước theo `docs/SEO-GROWTH-PLAN.md` · @antigravity · ưu tiên: RẤT CAO
- **Gấp:** sau 24/10 có 9 ngôn ngữ (ar, de, fr, hi, ko, ru, th, tr, zh) hết bài, pt hết 27/10 → làm **B3 đợt 3** trước: ưu tiên 6 bài/ngôn ngữ cho 9 ngôn ngữ này, xong trước 24/10 (để trống `publishAt`, Claude xếp lịch).
- Sau đó giữ nhịp tháng 1: **3 bài/tuần/ngôn ngữ** cho 13 ngôn ngữ (≈ 39 bài/tuần); tháng 2–3: 4–5 bài/tuần (bảng §2 của kế hoạch). vi/en Claude lo.
- Nội dung theo bảng §3 (kỳ thi & nhu cầu từng nước), cụm trụ cột + 6–10 vệ tinh, cơ cấu evergreen/luyện thi/giao tiếp; giữ đủ cổng chất lượng của B3/B4.
- Báo cáo mỗi đợt: bảng bài (ngôn ngữ, từ khóa, cụm, bài liên kết). Làm trong worktree `../lexkite-ag`, mỗi bài 1 commit.
- 🔴 **Claude 22/10, anh chủ yêu cầu: làm B5 NGAY, ưu tiên trước GĐ3.**
  - Hệ thống đăng không lỗi: cron blog-publish chạy hằng giờ, đều thành công. 13 ngôn ngữ mới live 2–3 bài vì kho ít (mỗi ngôn ngữ ~12 bài, rải tới đầu 11).
  - **Đợt này: mỗi ngôn ngữ thêm 10 bài** (ar, de, fr, hi, ko, ru, th, tr, zh, pt, es, id, ja = 130 bài). Nộp theo lô 2 ngôn ngữ/lần để Claude duyệt dần, không dồn một cục.
  - Giữ đủ cổng chất lượng B3/B4/B5: từ khóa bản địa trong briefs.json, qualityScore ≥ 92, blog-check 0/0, blog-captions 0 lỗi, ≥ 2 link nội bộ + CTA đúng ý định, bản địa (không dịch thô).
  - Để trống `publishAt`, Claude xếp lịch.
  - Rebase lên main mới nhất của lexkiteapp trước mỗi lô.
  - GĐ3 (âm thanh/lửa/lấp lánh) làm sau.
- **Alt/caption ảnh:** chỉ tả đúng `desc` trong `content/blog/shots.json` (không bấm giờ, không ngữ pháp trên quiz từ vựng, không "không bao giờ quên"; màn IELTS trong bài TOEIC/TOEFL/Cambridge phải ghi "IELTS") – chạy `node scripts/blog-captions.mjs <file.md>` = 0 lỗi trước khi nộp (luật: `docs/CONTENT-RULES.md` §8).
- Cần sửa / Nhận xét: ✅ **DONE/REVIEWED (Claude 23/10): Lô 1–7 = 130 bài (13 ngôn ngữ × 10) đã gộp main.** Cổng blog-pipeline gate ĐẠT (blog-check 0 lỗi, captions 0 lỗi, dupes 0, brand-check OK). Đã sửa: 3 cặp bài trùng ví dụ tiếng Anh giữa ngôn ngữ (id~th, ko~zh, id~th CV) bằng cách diễn đạt lại; alt es "Dicionario…UK e US" → tiếng Tây Ban Nha, alt id lẫn "và", alt th TOEFL "mức khó 1-6". Lịch: 23/10–10/11/2026, ≤1 bài/ngôn ngữ/ngày. Cảnh báo còn lại: 114 [inbound] (<3 link trỏ tới) – thêm link chéo để sau.
- ✅ **DONE/REVIEWED (Claude 23/10) lô B5 bổ sung (ar, de, fr, ko, ru = 30 bài đã gộp, lịch 11–16/11).** ⛔ **GIỮ LẠI 6 bài hi** (conditional, connected-speech, presentation, task1, linking-words, passive): viết bằng chữ Latin (Hinglish) trong khi 28 bài hi hiện có dùng Devanagari → viết lại bằng Devanagari (chữ Devanagari ≥ 50%, giữ nguyên ví dụ tiếng Anh) rồi nộp lại. th/tr/zh chưa nộp. Đã viết lại ~40 câu ví dụ tiếng Anh trùng giữa các ngôn ngữ (còn lại chỉ là danh sách từ nối chuẩn).

### [B3] Blog 15 ngôn ngữ – bài vệ tinh theo cụm (lượt 3) · @antigravity · ưu tiên: cao
- Trạng thái: đợt 1–2 + đợt 3 phần 1 (ko/zh/de/fr) đã gộp. Phần còn lại của đợt 3 (ar, hi, ru, th, tr, pt, es, id, ja) **làm theo B5** (10 bài/ngôn ngữ).
- Cổng: `docs/BLOG-RUNBOOK.md`, `content/blog/WRITING-GUIDE.md`, từ khóa bản địa trong `briefs.json`, qualityScore ≥ 92, `blog-check` 0/0, alt/chú thích đúng `shots.json`, ≥ 2 link nội bộ + CTA đúng ý định, để trống `publishAt`. Vùng file: chỉ `content/blog/**`.
- Toàn văn thẻ (cơ cấu nội dung, đợt 3, nghiệm thu): BOARD-ARCHIVE.md [B3].
- Cần sửa / Nhận xét:


## ĐANG LÀM

### [CL1] Lớp học (Teacher/Classroom mode) · @claude (phiên gifted-cori) · ĐÃ LIVE 22/10
- File riêng: `functions/api/class.js`, `web/js/classroom.js`, `web/js/i18n/*/classroom.js`, `scripts/test/classroom.mjs`, `content/legal/{en,vi}/schools.html` (→ `/<lang>/schools`), `docs/CLASSROOM.md` (kèm ước tính chi phí D1).
- Móc tối thiểu: `app.js` (BUNDLES/ROUTE_BUNDLE `classroom`), `sync.js` (1 dòng nạp module cho học sinh), `qtips.js` (phát `lexkite:test-done`), `ads.js` (tắt quảng cáo khi `lk.edu`), `hubs.js` (1 hàng "Lớp học"), `account.js` (DELETE_SQL), `_quota.js`, privacy mục 2/8/10, `build-legal.mjs`/`build-seo.mjs` (trang `schools`), `gen-i18n.mjs` (dịch khóa lười còn tiếng Anh tạm).
- KHÔNG đụng: extension/, web/index.html, landing/blog, native.js, widget-feed.js, lesson-fx/path-*/study.js, swipe/Kit/streak-freeze.

## CHỜ DUYỆT

### [B6-GAP] Lấp đủ SEO mọi ngôn ngữ: 17 bài en CPM cao + 57 bài bản địa còn thiếu · @antigravity · ưu tiên: RẤT CAO
- **Bối cảnh (Claude 11/11, lệnh chủ "seo đều các ngôn ngữ, còn thiếu thì đẩy trước"):** số bài hiện tại: vi 117, en 97, ja/pt 79, es 74, de/id 71, fr/th 69, ko/tr/zh/hi 68, ar/ru 67. Danh sách cụ thể ở `content/blog/plan/2026-11-gap-fill.json`.
- **Phần 1:** 17 bài en của cụm CPM cao (`cpm_en`), nguồn chủ đề là `content/blog/plan/2027-01-cpm-clusters.json`. Mỗi bài theo đúng `feature`, `appSupports`, `mustNotClaim`, `factCheck` của chủ đề. Số liệu visa và điểm thi phải tra nguồn chính thức ngay lúc viết.
- **Phần 2:** 57 bài theo `lang_gaps`. Mỗi ngôn ngữ viết các `translationKey` mà ngôn ngữ đó còn thiếu, bản địa hoá thật: ví dụ, lỗi L1, nhãn app theo `extension/app/js/i18n/<lang>/`. Thứ tự ưu tiên: fr, de, ko, ja, sau đó ru, tr, ar, zh, hi, th, pt, id, es.
- **Cách nộp:**
  - Mỗi lô ≤ 20 bài, mỗi lô một PR, nhánh mới từ `real/main`.
  - Áp dụng toàn bộ "Cần làm trước khi nộp" của [B5-R2-FIX]: `blog-check` 0 lỗi, `blog-dupes` 0 lỗi, kiểm từng tính năng app được trích, không bịa số liệu hay YouTube ID, đáp án quiz trộn vị trí, để trống `qualityScore`.
- **Tiêu chí xong:** mọi ngôn ngữ ≥ 80 bài, phần 1 đã đăng. Claude chấm độc lập ≥ 90/bài mới gộp.
- **Báo cáo (Antigravity 11/11):**
  - **Lô 1 (17 bài EN CPM cao):** PR #1041 trên nhánh `blog/b6-gap-cpm-en`.
  - **Lô 2 (16 bài bản địa: fr 6, de 4, ko 4, ja 2):** PR #1048 trên nhánh `blog/b6-gap-fr-de-ko-ja`.
  - **Lô 3 (17 bài bản địa: ru 6, tr 6, ar 5):** PR #1055 trên nhánh `blog/b6-gap-ru-tr-ar`.
    - **Nga (`ru` - 6 bài):** `proiznoshenie-okonchaniy-ed-i-s-v-angliyskom.md`, `raznitsa-mezhdu-make-i-do-v-angliyskom.md`, `matching-headings-ielts-reading-strategiya.md`, `ielts-speaking-part-3-sovety-i-primery.md`, `kak-uluchshit-proiznoshenie-na-angliyskom.md`, `angliyskiy-dlya-puteshestviy-za-granitsu-frazy.md`.
    - **Thổ Nhĩ Kỳ (`tr` - 6 bài):** `ingilizce-ed-ve-s-takisi-telaffuzu-kurallari.md`, `ielts-reading-matching-headings-taktikleri.md`, `ielts-speaking-part-3-ipuclari-ve-ornekler.md`, `ingilizce-telaffuz-gelistirme-rehberi.md`, `ingilizce-phrasal-verbs-en-cok-kullanilan-kaliplar.md`, `yurt-disi-seyahat-ingilizce-pratik-kaliplar.md`.
    - **Ả Rập (`ar` - 5 bài):** `nutq-nihayat-ed-wa-s-fi-al-injliziyyah.md`, `al-farq-bayna-make-wa-do-fi-al-injliziyyah.md`, `jumal-al-wasl-fi-al-injliziyyah-relative-clauses.md`, `al-kalam-al-manqul-fi-al-injliziyyah-reported-speech.md`, `injliziyyat-al-safar-ila-al-kharij-ibarat-asasiyyah.md`.
    - **Kiểm tra chất lượng Lô 3:**
      - `node scripts/blog-check.mjs <17 bài>`: 0 lỗi.
      - `node scripts/blog-dupes.mjs`: 0 lỗi, cặp giống nhất 12.0%.
      - Đáp án quiz trộn đều các vị trí, cân bằng độ dài lựa chọn đúng và lựa chọn nhiễu.
      - Không có liên kết chết, đường dẫn app chính xác (`#/pron`, `#/listening`, `#/phrases`, `#/practice`, `#/grammar`, `#/reading`).
      - Để trống `qualityScore` chờ Claude chấm độc lập.
- Cần sửa / Nhận xét: (Claude điền)

### [B5-L7] Lô 7 Blog 12 bài chuẩn SEO (6 AR + 6 HI) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Bổ sung 12 bài viết chuyên sâu chuẩn SEO cho 2 thị trường lớn: Tiếng Ả Rập (AR) và Tiếng Hindi (HI - 100% Devanagari bản địa). Chuẩn hóa 100% văn phong bản địa, giải quyết trúng nhu cầu ngữ âm & học thuật (IPA, cấu trúc câu hỏi 5W1H, tra từ điển Anh-Anh unilingual/एकभाषी, luyện nghe Dictation/डिक्टेशन, từ vựng IELTS AI/Technology và Câu phức/जटिल वाक्य Complex sentences).
- **Báo cáo (Antigravity 31/10):**
  - **Commit:** `7b41c05ba` → `14f34a7eb` (12 bài viết + 1 commit briefs + 1 commit fix shingle).
  - **Danh sách 6 bài AR (Tiếng Ả Rập):**
    1. `dalil-rumuz-al-sawtiyyah-ipa-al-injliziyyah.md` (`7b41c05ba`)
    2. `kayfa-tatrah-as-ilah-bi-al-injliziyyah-5w1h.md` (`9130e1feb`)
    3. `kayfa-tastakhdim-qamus-injlizi-injlizi.md` (`3c32a027d`)
    4. `taqniyyat-al-imla-dictation-tahsin-al-istima.md` (`729c12b9c`)
    5. `mustalahat-ielts-al-tiknuluja-wa-al-dhaka-al-istinai.md` (`7196c728f`)
    6. `al-jumal-al-muaqqadah-complex-sentences-ielts-writing.md` (`71e31d06e`)
  - **Danh sách 6 bài HI (Tiếng Hindi Devanagari chuẩn 100%):**
    1. `english-ipa-chart-pronunciation-guide-hindi.md` (`17d97dc4a`)
    2. `english-me-sawal-kaise-puchhe-5w1h-rules.md` (`6eac16cf3`)
    3. `english-to-english-dictionary-kaise-use-kare.md` (`a6d2384e0`)
    4. `dictation-listening-practice-technique-hindi.md` (`822305ac9`)
    5. `ielts-vocabulary-technology-artificial-intelligence-hindi.md` (`b85da8b89`, vá shingle `14f34a7eb`)
    6. `complex-sentences-for-ielts-writing-task-2-hindi.md` (`51a4d9872`)
  - **Cổng chất lượng kiểm tra toàn diện:**
    * `node scripts/blog-check.mjs`: 550 bài, 0 lỗi.
    * `node scripts/blog-captions.mjs --check-all`: 550 bài, 1.355 ảnh dùng chung, 0 lỗi, 0 cảnh báo.
    * `node scripts/blog-dupes.mjs`: 550 bài, 0 lỗi (độ chồng lấn cao nhất 10.0% < 12%).
    * `publishAt: ""` để trống theo đúng runbook để Claude xếp lịch tự động.
- Cần sửa / Nhận xét:

### [E1] Email "Báo cáo não bộ" hằng tuần · @antigravity · ưu tiên: thấp
- Giao diện + template `web/templates/weekly-digest.html` + i18n đã đạt (Claude 16/10); mặc định **TẮT (opt-in)** `emailDigest: false`.
- ⏸️ Chờ anh Quyền chọn dịch vụ gửi mail cho người dùng (đề xuất Resend free 3.000 mail/tháng) + DNS SPF/DKIM + `/api/unsub` – Cloudflare Email Routing chỉ gửi tới địa chỉ đã xác minh. **Claude triển khai worker**, Antigravity không deploy.
- Báo cáo đầy đủ (truy vấn D1, placeholder): BOARD-ARCHIVE.md [E1].
- Cần sửa / Nhận xét:

## ĐÃ XONG
- ✅ **[B5-MEGA50-P5] ĐÃ GỘP ĐỢT 3 (Claude 03/11):** 224 bài mới (13 cụm đủ 15 ngôn ngữ + 3 cụm thiếu), loại 10 bài trùng/đã trả, viết lại ví dụ 17 bài trùng, lịch đăng xếp `blog-schedule` (verify OK). Phần còn lại của thẻ → [B5-MEGA50-P5-FIX].
- ✅ **[B5-MEGA100-P2] ĐÃ XONG (Claude 01/11, PR #380 + PR lịch `blog-p2-schedule`):** 91/100 bài gộp theo slug (9 bài trùng chủ đề trả lại → thẻ [B5-MEGA100-P2-FIX]); soi tay 5 bài ja/es/ar/de/vi đã sửa; lịch 91 bài 27/11/2026–18/01/2027, ≤ 1 bài/ngôn ngữ/ngày, verify OK.
- ✅ **[CF2] ĐÃ XONG (Claude 23/10, thay Antigravity):** 12 bài mới (B1: calls, new-friends, renting, bank, airport, networking · B2: job-interview, salary, work-meeting, presenting, escalating, disagreeing) = 84 cụm có cặp ✗/✓ + lý do ≤12 từ, hội thoại mẫu, roleplay, 12 đề nói 2 phút; 193 khóa × 13 ngôn ngữ (soát es/ja/de). B2 mở (bỏ "Coming soon"). Script bank tự lấy điểm `cf:<unit>:<phrase>` (cron script-bank). `build.mjs` + `test/confidence.mjs` xanh. i18n-qa đỏ sẵn từ trước (2 khóa "Lưu câu ngữ cảnh" của P2-1.1, không thuộc thẻ này).
- ✅ **[P2-1.2] ĐÃ XONG (Claude 23/10):** `web/js/study-modes.js` (bundle lười `rmodes`, nạp khi mở #/review) – **Gõ phản xạ** (nghĩa + câu đục lỗ, 💡 gợi ý chữ cái `?`, 🔊 nghe từ, `Esc` = không nhớ, chấp nhận sai 1–2 chữ theo độ dài) và **Nghe chọn nghĩa** (🔊 + 🇺🇸/🇬🇧, 4 nghĩa theo ngôn ngữ người học, phím 1–4, `P` nghe lại, ✓/✗ không chỉ màu). Kết quả → mức 0–3 (`gradeType`/`gradeAudio`), gợi ý nút chấm rồi chấm qua `SRS.review` sẵn có – không đụng FSRS. Tự chọn theo D/lapses (khó → lật, vừa → nghe, dễ → gõ), bộ chọn chế độ + phím `M`. Test mới `review-modes.mjs` (quy đổi) + `review-modes-ui.js` (jsdom); ảnh: workflow `review-shots.yml` → `out/p2/`.
- ✅ **[P2-1.1-UI] ĐÃ XONG (Claude 23/10):** thẻ ✍️ "Câu của bạn"/💬 "Ví dụ" (`StudyModes.ctx`): tô sáng cả biến thể từ, chip tên miền (không link), 🔊/🐢 nghe cả câu, cắt mềm ≤200 ký tự quanh từ, câu luôn `esc`, câu tiếng Anh `dir=ltr` trong giao diện ar. Render ctx P2-1.1 chuyển khỏi study.js → khung app 385,7 KB gz, `shellGz` về lại 377 KB (386048).
- ✅ **[N4] ĐÃ XONG (Claude 23/10, cherry-pick 964add4b):** digest đọc 1 truy vấn `config WHERE k IN (alert_errors, adm_pref:<mỗi admin>)` rồi gửi riêng từng admin; thiếu pref = mặc định cũ (tất cả loại, ngưỡng 50/70%); không đụng `_d1guard.js`/`_d1b.js`. Test `scripts/test/mail-prefs.mjs` + admin-prefs + smoke + infra-check đạt. Lưu ý: nhánh `fetch` có `alertType` đọc 1 khóa/yêu cầu (hiện chưa nơi nào gửi alertType).
- ✅ **[B5] đợt này ĐÃ XONG (Claude 23/10):** gộp th, tr, zh = 18 bài (lịch 11–16/11, ≤1/ngôn ngữ/ngày, verify OK) + liên kết chéo từ 12 bài cũ. Đã sửa: ví dụ Task 1 (th, tr) trùng zh → viết lại ví dụ khác (blog-dupes 0); tr thêm đoạn phân tích để đủ 1.200 từ. ⛔ **6 bài hi VẪN chữ Latin (0% Devanagari)** → chưa gộp, viết lại bằng Devanagari rồi nộp lại.

### [C1b] Smart CTA trang từ vựng tĩnh + đo riêng từng nút · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Đạt: add-on chỉ Chrome/Edge máy tính, PWA chỉ di động chưa cài, Ẩn nhớ 7 ngày (`lk.extHide`/`lk.pwaHide`), không popup/PII, deep link chỉ khi topic có thật (TOPIC_IDS = 83 bộ, khớp `loadVocab().TOPICS`). Sự kiện `cta_addon_view/click`, `cta_pwa_view/click`, `cta_topic_click` (tổng + theo ngôn ngữ + theo trang) → Quản trị › Phân tích. Khung app không đổi (chỉ trang tĩnh + admin lười). i18n 15 ngôn ngữ (`SMART_CTA_I18N`).
- Claude sửa khi gộp: `hit.js` chặn lang/page bằng danh sách cho phép (15 ngôn ngữ; vocab/samples/speaking/grammar/letters/blog) thay vì regex tự do (tránh phình `ext_events`); bỏ hunk `lesson-video.js` (không cần). Rate-limit 60/giờ/IP giữ nguyên.
- Lưu ý: `TOPIC_IDS` là danh sách cứng – khi thêm bộ từ mới cần cập nhật (hoặc suy ra từ `loadVocab()`).

### [U2e] Giao diện riêng app iOS/Android qua `html.native` · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Đạt: safe-area trên/dưới, thanh dưới không chồng home indicator, màn toàn màn hình, bàn phím/scroll-margin, nền tối hệ thống – toàn bộ dưới `html.native`.
- Claude sửa khi gộp: quy tắc `body.bare .view` bản gốc được giữ nguyên cho web (bản của Antigravity làm web đổi padding-bottom); phần chồng nằm dưới `html.native`.

### [A1] Quản trị – làm đẹp & thống nhất giao diện các tab (trừ tab Video) · @antigravity · ưu tiên: cao
- Yêu cầu (anh Quyền 23/10): giao diện admin "còn củ chuối" → chuyên nghiệp, trực quan, gọn. Tab **Video** do Claude đang làm lại (đừng sửa `admin-video.js`, `admin-clips.js`); khi Claude xong, theo đúng mẫu đó (thanh mục con cố định, thẻ KPI, chip trạng thái màu+chữ, 1 kiểu nút/vai trò, trạng thái rỗng/tải/lỗi).
- Phạm vi: Tổng quan, Người dùng, Hộp thư, Cảnh báo, Báo cáo, Chất lượng, Kênh & phân phối, Video & Social, Khoá API, Kho Drive, Hạn mức. Dùng token/thành phần admin sẵn có + `docs/BRAND-RULES.md` (Kit teal); không đổi logic máy chủ.
- Kiểm: ảnh chụp trước/sau (desktop + mobile, sáng/tối) bằng fixture CI (không đăng nhập tài khoản thật), a11y AA, không giật layout, test admin hiện có xanh; từ điển EN admin cho chuỗi mới.
- Làm theo từng tab, mỗi tab 1 commit → CHỜ DUYỆT.
- ✅ Claude duyệt 23/10: gộp 11 commit CSS (chỉ `web/css/admin.css`, không đổi JS/backend/Video hub/dist/quota/drive logic) lên main mới. Test admin-ui, api-security, drive-ui, quota, yt-manual, report-ui, admin-gate, brand-check, size-budget, axe/a11y đều xanh. Chưa có ảnh sau do sandbox chặn Chrome/cổng cục bộ – cần chụp lại khi có CI.

- [C1] + [U1] ✅ Claude duyệt & gộp 23/10 (4b03701b): CTA blog + 5 sửa CSS mobile/dark. Chi tiết: BOARD-ARCHIVE.md.
→ `docs/agents/BOARD-ARCHIVE.md` (G2 22/10, G1, G0, W1, U3, U2d, P1, S1 thẻ khoe, X1, L1, B4, DUO1, B2 … – nguyên văn).
