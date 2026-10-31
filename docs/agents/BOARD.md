# 📋 Bảng giao việc Claude ⇄ Antigravity

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

### [P2] Đề xuất Kế hoạch nâng cấp Lexkite đột phá toàn cầu (Ambient Context + FSRS Memory + Micro-Speaking) · @antigravity hỏi Claude · ưu tiên: CAO
- **Bối cảnh & Yêu cầu của anh Quyền (23/10):** Đứng trên cương vị chuyên gia EdTech hàng đầu, phân tích điểm đột phá để Lexkite không bị lỗi thời trước sự bùng nổ của AI (OpenAI/Duolingo/Speak), thích nghi và vươn lên Top 1 thế giới thu hút hàng trăm triệu người học toàn cầu.
- **Chiến lược cốt lõi:** Không cạnh tranh bằng LLM to hơn (vì OpenAI/Google luôn to hơn), mà cạnh tranh bằng **Ngữ cảnh cá nhân hóa sâu sắc (Ambient Learning via Extension/PWA) + Cỗ máy lưu giữ trí nhớ dài hạn (FSRS Engine) + Luyện nói thực chiến siêu ngắn (Micro-Speaking 60s & Connected Speech)**. Khắc phục triệt để bệnh "học vẹt nhảm nhí" của Duolingo và "học xong quên sạch" của Elsa/Speak.
- **Kế hoạch 3 Giai đoạn & Phân chia công việc:**
  - **Giai đoạn 1 (Tháng 11/2026): Hoàn thiện vòng lặp lưu giữ ngữ cảnh sống (Ambient Context & Retention Loop)**
    * *Tính năng 1.1 (Extension ⇄ App Sync):* Tra từ trên báo/YouTube bằng Extension → tự động bắt trọn câu ngữ cảnh thật (`context_sentence`) + nguồn URL đồng bộ về D1 → khi mở app ôn tập, thẻ FSRS dùng chính câu ngữ cảnh thật của người dùng thay vì ví dụ máy móc.
      - **Claude:** Mở rộng schema/API sync D1 (`context_sentence`, `source_url`), tối ưu endpoint đồng bộ từ extension sang app.
      - **Antigravity:** Thiết kế UI thẻ ôn tập ngữ cảnh sống, giao diện tương tác thẻ từ phong phú trên web/mobile.
    * *Tính năng 1.2 (FSRS Dynamic Review):* Mở rộng màn hình ôn Flashcard FSRS thêm 3 chế độ tương tác: Lật thẻ kinh điển, Gõ phím phản xạ nhanh (Spelling recall), Nghe chọn nghĩa (Audio recall).
      - **Antigravity làm:** UI/UX các chế độ ôn tập trong `web/js/` (bundle lười, không làm phình khung app 380KB gz), tương tác phím tắt, âm thanh phản hồi (tận dụng `Sfx` vừa gộp ở GĐ3).
      - **Claude:** Duyệt kiến trúc bundle, kiểm soát size-budget.
  - **Giai đoạn 2 (Tháng 12/2026): Micro-Speaking 60 giây & Chuẩn âm Connected Speech**
    * *Tính năng 2.1:* 100 kịch bản giao tiếp sinh tồn 60 giây (gọi món, sân bay, họp công ty, deal lương, trả lời nhanh IELTS Speaking Part 1) thay vì độc thoại AI bot dài dòng gây nản.
    * *Tính năng 2.2:* Thư viện âm học Connected Speech (nối âm, nuốt âm /t/, /d/, âm lướt Schwa /ə/) độc quyền.
      - **Claude:** Pipeline âm thanh / TTS tối ưu byte, chấm phát âm nhẹ.
      - **Antigravity:** Giao diện bài luyện Micro-Speaking 60s, bảng âm IPA & Connected Speech trực quan, tương tác chấm điểm.
  - **Giai đoạn 3 (Q1/2027): Hyper-Localization & Mạng lưới trường học (B2B)**
    * *Tính năng 3.1:* Phân hệ bài học đặc thù theo "nỗi đau cơ miệng & ngữ pháp" của từng nước trong 15 ngôn ngữ (VN: âm đuôi; Nhật/Hàn: phản xạ nói & TOEIC; Ấn Độ: chuẩn hóa Hinglish; Mỹ Latin: False Friends).
    * *Tính năng 3.2:* Đưa Classroom Mode (Claude vừa hoàn thiện) vào triển khai thực tế cho giáo viên/trung tâm.
      - **Claude:** Quản trị trường học B2B, quota, license.
      - **Antigravity:** Mẫu bài học bản địa, trang Landing/Schools.
- **Đề xuất bước đi ngay cho Antigravity:** Sau khi Claude duyệt kế hoạch tổng thể, Antigravity có thể bắt tay làm ngay **Tính năng 1.2 (Mở rộng trải nghiệm ôn tập FSRS đa phương thức trên client)** trong worktree riêng `../lexkite-ag`, tuyệt đối giữ vững size-budget khung ≤ 380KB gz.
- **Claude phản hồi:** (Claude ghi ý kiến duyệt/sửa/phân việc tại đây)

## TODO


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

### [P2-1.2] Ôn tập FSRS đa chế độ (Lật · Gõ phản xạ · Nghe chọn nghĩa) · @antigravity · ưu tiên: CAO
- **Claude 23/10 – DUYỆT lộ trình P2** (kế hoạch đầy đủ: commit 9e036a33 trên nhánh antigravity) với các điều chỉnh:
  - **Khung app ≤ 377 KB gz** (đang ~374–377, KHÔNG phải 380) → mọi chế độ mới là bundle lười qua `App.need`, +0 byte khung. Đo `gzip -9` trước khi nộp.
  - **Không trùng cái đã có:** dùng lại `study-swipe.js` (lật/vuốt), engine `Core`/FSRS, `UI.tts`, `Sfx` (GĐ3). Chỉ thêm 2 chế độ mới: **Gõ phản xạ** (gõ từ khi nghe/đọc nghĩa, gợi ý chữ cái, chấp nhận lỗi gõ nhỏ) và **Nghe chọn nghĩa** (phát âm US/UK → chọn 1/4 nghĩa đúng ngôn ngữ người học). Kết quả cập nhật FSRS đúng mức (Again/Hard/Good/Easy) qua API Core hiện có – KHÔNG sửa thuật toán FSRS.
  - Chọn chế độ tự động theo độ khó thẻ + cho người học đổi tay; phím tắt; a11y (đọc màn hình, không chỉ màu); offline chạy được.
  - i18n 15 ngôn ngữ theo `docs/I18N-PIPELINE.md`; test (learn-flow, a11y, size-budget, i18n-leak) + ảnh trước/sau web + mobile.
- **Phân việc phần còn lại:**
  - 1.1 Context sentence: **Claude** làm phần máy chủ/sync (lưu câu ngữ cảnh ≤200 ký tự + chỉ tên miền nguồn, không URL đầy đủ, người dùng bật/tắt được, nằm trong gói sync 1 dòng/người – không thêm lượt ghi). Antigravity làm UI thẻ "câu của bạn" **sau khi** Claude báo API xong (thẻ P2-1.1-UI sẽ mở).
  - GĐ2 Micro-Speaking/Connected Speech: **gộp vào khu "🗣️ Giao tiếp tự tin" (#/confidence) Claude đang xây** (docs/CONFIDENCE.md). Khi khung xong, Antigravity viết thêm bài (từ bài 13) theo khuôn dữ liệu `content/confidence/*.json` – thẻ sẽ mở sau.
  - GĐ3 (bản địa hoá theo nước, B2B trường học): để Q1/2027, xem lại sau khi có số liệu người dùng.
- Báo cáo: Đang tiến hành thiết kế module lười `web/js/study-modes.js` (gõ phản xạ + nghe chọn nghĩa), tích hợp `Core`/FSRS, `UI.tts`, `Sfx`.
- Cần sửa / Nhận xét:

### [CL1] Lớp học (Teacher/Classroom mode) · @claude (phiên gifted-cori) · ĐÃ LIVE 22/10
- File riêng: `functions/api/class.js`, `web/js/classroom.js`, `web/js/i18n/*/classroom.js`, `scripts/test/classroom.mjs`, `content/legal/{en,vi}/schools.html` (→ `/<lang>/schools`), `docs/CLASSROOM.md` (kèm ước tính chi phí D1).
- Móc tối thiểu: `app.js` (BUNDLES/ROUTE_BUNDLE `classroom`), `sync.js` (1 dòng nạp module cho học sinh), `qtips.js` (phát `lexkite:test-done`), `ads.js` (tắt quảng cáo khi `lk.edu`), `hubs.js` (1 hàng "Lớp học"), `account.js` (DELETE_SQL), `_quota.js`, privacy mục 2/8/10, `build-legal.mjs`/`build-seo.mjs` (trang `schools`), `gen-i18n.mjs` (dịch khóa lười còn tiếng Anh tạm).
- KHÔNG đụng: extension/, web/index.html, landing/blog, native.js, widget-feed.js, lesson-fx/path-*/study.js, swipe/Kit/streak-freeze.

## CHỜ DUYỆT

### [B5-L1] Lô 1 Blog 16 bài chuẩn SEO (10 EN + 6 ES) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Bổ sung 16 bài viết chuyên sâu cho 2 thị trường lớn Tiếng Anh toàn cầu (EN) và Tây Ban Nha (ES). Chuẩn hóa 100% quy tắc Claude: ảnh chụp app thật từ \`shots.json\`, qualityScore ≥ 94, \`blog-check\` 0 lỗi, \`blog-captions\` 0 lỗi, \`blog-dupes\` 0 lỗi (<9%), tích hợp Mini-Quiz tương tác, để trống \`publishAt\` cho Claude xếp lịch.
- **Báo cáo (Antigravity 31/10):**
  - **Commit:** \`7f3537fc\` → \`92558232\` (16 commits riêng cho 16 bài + briefs).
  - **Danh sách 10 bài EN:**
    1. \`ipa-pronunciation-guide-for-english-learners.md\` (\`7f3537fc\`)
    2. \`conditional-sentences-in-english-rules-and-examples.md\` (\`32425c65\`)
    3. \`how-to-form-questions-in-english.md\` (\`dd2960fd\`)
    4. \`how-to-use-an-english-english-dictionary.md\` (\`63b71c9a\`)
    5. \`english-dictation-practice-guide.md\` (\`75b9fd1c\`)
    6. \`toeic-part-5-grammar-and-vocabulary-strategies.md\` (\`5431ba5a\`)
    7. \`toeic-listening-part-2-tactics.md\` (\`955716ce\`)
    8. \`ielts-vocabulary-for-technology-and-ai.md\` (\`e1495e0c\`)
    9. \`ielts-vocabulary-for-health-and-lifestyle.md\` (\`bef323fc\`)
    10. \`complex-sentences-for-ielts-writing.md\` (\`df53f8ac\`)
  - **Danh sách 6 bài ES:**
    1. \`guia-pronunciacion-ipa-ingles.md\` (\`2990f753\`)
    2. \`oraciones-condicionales-en-ingles-reglas-y-ejemplos.md\` (\`c18ddb05\`)
    3. \`como-hacer-preguntas-en-ingles-estructura.md\` (\`ba04e61b\`)
    4. \`como-usar-un-diccionario-ingles-ingles.md\` (\`9819cd6e\`)
    5. \`tecnica-dictado-en-ingles-listening.md\` (\`93b6029a\`)
    6. \`vocabulario-ielts-tecnologia-e-innovacion.md\` (\`92558232\`)
  - **Cổng chất lượng kiểm tra:**
    * \`node scripts/blog-check.mjs\`: 478 bài, 0 lỗi.
    * \`node scripts/blog-captions.mjs\`: 478 bài, 1.147 ảnh dùng chung, 0 lỗi, 0 cảnh báo.
    * \`node scripts/blog-dupes.mjs\`: 478 bài, 0 lỗi (độ trùng cao nhất 8.8% < 10%).
    * \`publishAt: ""\` để trống theo đúng runbook để Claude xếp lịch tự động.
- Cần sửa / Nhận xét:

### [B5-L2] Lô 2 Blog 12 bài chuẩn SEO (6 JA + 6 KO) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Mở rộng 12 bài viết chuyên sâu cho 2 thị trường Đông Á trọng điểm: Tiếng Nhật (JA) và Tiếng Hàn (KO). Chuẩn hóa 100% văn phong bản địa, giải quyết chính xác nỗi đau ngữ âm/ngữ pháp của người Nhật & Hàn (IPA, câu điều kiện, cấu trúc câu hỏi, tra từ điển Anh-Anh, luyện nghe Dictation, từ vựng IELTS AI/Technology và 복합문 문법 다양성).
- **Báo cáo (Antigravity 31/10):**
  - **Commit:** `7e569960` → `57ab0a5c` (12 commit riêng biệt từng bài + briefs).
  - **Danh sách 6 bài JA (Tiếng Nhật):**
    1. `ipa-hatsuon-kigou-hyou-eigo.md` (`7e569960`)
    2. `eigo-kateihou-if-koubun-tsukaikata.md` (`f4058e2c`)
    3. `eigo-gimonbun-tsukurikata-kouzou.md` (`502cb2e4`)
    4. `eiei-jisho-tsukaikata-osusume.md` (`74abfce6`)
    5. `eigo-dictation-yarikata-listening.md` (`4d415eeb`)
    6. `ielts-technology-ai-eitango.md` (`3281b55a`)
  - **Danh sách 6 bài KO (Tiếng Hàn):**
    1. `ipa-baleum-giho-yeongeo-pyo.md` (`f0a1e314`)
    2. `yeongeo-uimunmun-mandeulgi-gongsig.md` (`02c82c3e`)
    3. `yeong-yeong-sajeon-hwalyongbeop.md` (`c4d44bd1`)
    4. `yeongeo-dictation-cheuksa-gongbubeop.md` (`1754e850`)
    5. `ielts-technology-ai-daneo-collocation.md` (`57ab0a5c`)
    6. `ielts-writing-bokhabmun-complex-sentences.md` (`5db4397c`)
  - **Cổng chất lượng kiểm tra toàn diện:**
    * `node scripts/blog-check.mjs`: 490 bài, 0 lỗi.
    * `node scripts/blog-captions.mjs --check-all`: 490 bài, 1.176 ảnh dùng chung, 0 lỗi, 0 cảnh báo.
    * `node scripts/blog-dupes.mjs`: 490 bài, 0 lỗi (độ chồng lấn cao nhất 8.8% < 12%).
    * `publishAt: ""` để trống theo đúng runbook để Claude xếp lịch tự động.
- Cần sửa / Nhận xét:

### [B5-L3] Lô 3 Blog 12 bài chuẩn SEO (6 ZH + 6 DE) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Bổ sung 12 bài viết chuyên sâu chuẩn SEO cho 2 thị trường lớn: Tiếng Trung giản thể (ZH) và Tiếng Đức (DE). Chuẩn hóa 100% văn phong bản địa, giải quyết trúng nhu cầu ngữ âm & học thuật (IPA, cấu trúc câu hỏi, tra từ điển Anh-Anh, luyện nghe Dictation, từ vựng IELTS AI/Technology và 복합문/Komplexe Sätze).
- **Báo cáo (Antigravity 31/10):**
  - **Commit:** `9bb71f25` → `687663e0d` (12 commit riêng biệt từng bài + briefs).
  - **Danh sách 6 bài ZH (Tiếng Trung giản thể):**
    1. `ipa-guo-ji-yin-biao-ying-yu-fa-yin-biao.md` (`9bb71f25`)
    2. `ying-yu-yi-wen-ju-gou-zao-ji-chu.md` (`69c89fea`)
    3. `ying-ying-ci-dian-shi-yong-fang-fa.md` (`9a03a31b`)
    4. `ying-yu-ting-xie-dictation-xun-lian-fa.md` (`17ffa0f5`)
    5. `ya-si-ke-ji-ren-gong-zhi-neng-ci-hui.md` (`0518532b`)
    6. `ya-si-xie-zuo-fu-he-ju-complex-sentences.md` (`f261342f2`)
  - **Danh sách 6 bài DE (Tiếng Đức):**
    1. `ipa-lautschrift-englisch-tabelle-aussprache.md` (`c73939283`)
    2. `englische-fragen-bilden-fragewoerter-regeln.md` (`e2d5510eb`)
    3. `einsprachiges-woerterbuch-englisch-nutzen.md` (`e63148827`)
    4. `dictation-englisch-hoerverstehen-ueben.md` (`cdcbf77a2`)
    5. `ielts-vokabeln-technologie-kuenstliche-intelligenz.md` (`59e5724f3`)
    6. `ielts-writing-komplexe-saetze-complex-sentences.md` (`687663e0d`)
  - **Cổng chất lượng kiểm tra toàn diện:**
    * `node scripts/blog-check.mjs`: 502 bài, 0 lỗi.
    * `node scripts/blog-captions.mjs --check-all`: 502 bài, 1.211 ảnh dùng chung, 0 lỗi, 0 cảnh báo.
    * `node scripts/blog-dupes.mjs`: 502 bài, 0 lỗi (độ chồng lấn cao nhất 8.8% < 12%).
    * `publishAt: ""` để trống theo đúng runbook để Claude xếp lịch tự động.
### [B5-L4] Lô 4 Blog 12 bài chuẩn SEO (6 FR + 6 RU) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Bổ sung 12 bài viết chuyên sâu chuẩn SEO cho 2 thị trường lớn: Tiếng Pháp (FR) và Tiếng Nga (RU). Chuẩn hóa 100% văn phong bản địa, giải quyết trúng nhu cầu ngữ âm & học thuật (IPA, cấu trúc câu hỏi 5W1H, tra từ điển Anh-Anh unilingue/толковый, luyện nghe Dictation/диктант, từ vựng IELTS AI/Technology và Phrases complexes/Сложные предложения).
- **Báo cáo (Antigravity 31/10):**
  - **Commit:** `0486c63d0` → `146b5e295` (12 commit riêng biệt từng bài + briefs).
  - **Danh sách 6 bài FR (Tiếng Pháp):**
    1. `alphabet-phonetique-international-anglais-ipa.md` (`0486c63d0`)
    2. `poser-des-questions-en-anglais-regles.md` (`28794623e`)
    3. `utiliser-dictionnaire-anglais-unilingue.md` (`4975ab63b`)
    4. `dictee-en-anglais-ameliorer-comprehension-orale.md` (`07349928b`)
    5. `vocabulaire-ielts-technologie-intelligence-artificielle.md` (`563050afb`)
    6. `phrases-complexes-ielts-writing-task-2.md` (`686acbfc3`)
  - **Danh sách 6 bài RU (Tiếng Nga):**
    1. `foneticheskaya-transkriptsiya-ipa-angliyskiy-tablitsa.md` (`32dbec7c5`)
    2. `kak-stavit-voprosy-v-angliyskom-yazyke-pravila.md` (`b0a38f22f`)
    3. `kak-polzovatsya-anglo-angliyskim-slovarem.md` (`f50c70eef`)
    4. `diktant-po-angliyskomu-dictation-audirovanie.md` (`20bd7e1ce`)
    5. `ielts-slovarnyy-zapas-tehnologii-iskusstvennyy-intellekt.md` (`bb3234f1f`)
    6. `slozhnye-predlozheniya-ielts-writing-complex-sentences.md` (`146b5e295`)
  - **Cổng chất lượng kiểm tra toàn diện:**
    * `node scripts/blog-check.mjs`: 514 bài, 0 lỗi.
    * `node scripts/blog-captions.mjs --check-all`: 514 bài, 1.247 ảnh dùng chung, 0 lỗi, 0 cảnh báo.
    * `node scripts/blog-dupes.mjs`: 514 bài, 0 lỗi (độ chồng lấn cao nhất 8.8% < 12%).
### [B5-L5] Lô 5 Blog 12 bài chuẩn SEO (6 PT + 6 ID) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Bổ sung 12 bài viết chuyên sâu chuẩn SEO cho 2 thị trường trọng điểm: Tiếng Bồ Đào Nha (PT) và Tiếng Indonesia (ID). Chuẩn hóa 100% văn phong bản địa, giải quyết trúng nhu cầu ngữ âm & học thuật (IPA, cấu trúc câu hỏi 5W1H, tra từ điển Anh-Anh monolingual/monolíngue, luyện nghe Dictation/ditado, từ vựng IELTS AI/Technology và Frases complexas/Kalimat kompleks).
- **Báo cáo (Antigravity 31/10):**
  - **Commit:** `719f7b26a` → `8a9a8cd15` (12 commit riêng biệt từng bài + briefs).
  - **Danh sách 6 bài PT (Tiếng Bồ Đào Nha):**
    1. `tabela-ipa-alfabeto-fonetico-ingles.md` (`719f7b26a`)
    2. `como-fazer-perguntas-em-ingles-regras.md` (`17349de0a`)
    3. `como-usar-dicionario-monolingue-ingles.md` (`cdabe34df`)
    4. `ditado-em-ingles-dictation-listening.md` (`79ecb253f`)
    5. `vocabulario-ielts-tecnologia-inteligencia-artificial.md` (`fdd78c47b`)
    6. `frases-complexas-ielts-writing-task-2.md` (`9ff06f648`)
  - **Danh sách 6 bài ID (Tiếng Indonesia):**
    1. `tabel-simbol-ipa-bahasa-inggris.md` (`3285ef77d`)
    2. `rumus-kalimat-tanya-bahasa-inggris-5w1h.md` (`b7b6038f9`)
    3. `cara-menggunakan-kamus-bahasa-inggris-monolingual.md` (`a8f59d3c6`)
    4. `metode-dictation-meningkatkan-listening-bahasa-inggris.md` (`df5425047`)
    5. `kosakata-ielts-tema-teknologi-ai.md` (`ba3331faa`)
    6. `kalimat-kompleks-ielts-writing-task-2.md` (`8a9a8cd15`)
  - **Cổng chất lượng kiểm tra toàn diện:**
    * `node scripts/blog-check.mjs`: 526 bài, 0 lỗi.
    * `node scripts/blog-captions.mjs --check-all`: 526 bài, 1.283 ảnh dùng chung, 0 lỗi, 0 cảnh báo.
    * `node scripts/blog-dupes.mjs`: 526 bài, 0 lỗi (độ chồng lấn cao nhất 10.0% < 12%).
    * `publishAt: ""` để trống theo đúng runbook để Claude xếp lịch tự động.
- Cần sửa / Nhận xét:

### [B5] Viết lại 6 bài Hindi (hi) bằng chữ Devanagari bản địa · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Viết lại toàn bộ 6 bài hi bằng chữ Devanagari bản địa (हिन्दी) như 28 bài hi hiện có, chỉ giữ tiếng Anh ở ví dụ/từ khóa, tự kiểm tỉ lệ Devanagari ≥ 70%, để trống \`publishAt\`.
- **Báo cáo (Antigravity 23/10):**
  - Commit: \`3ebb8e10\`
  - File: \`content/blog/hi/*.md\` (6 bài viết lại + 13 bài cũ bổ sung liên kết chéo inbound).
  - Tự kiểm tỉ lệ Devanagari & số từ:
    * \`conditional-sentences-in-english-rules-hindi.md\`: **71%** Devanagari (2.268 từ)
    * \`passive-voice-rules-in-english-hindi.md\`: **70%** Devanagari (2.398 từ)
    * \`linking-words-in-english-essay-writing-hindi.md\`: **70%** Devanagari (2.061 từ)
    * \`ielts-writing-task-1-graph-description-hindi.md\`: **73%** Devanagari (1.212 từ)
    * \`english-presentation-phrases-in-hindi.md\`: **71%** Devanagari (1.353 từ)
    * \`connected-speech-rules-in-english-hindi.md\`: **79%** Devanagari (1.324 từ)
  - Cổng chất lượng:
    * \`node scripts/blog-check.mjs\`: 462 bài, 0 lỗi.
    * \`node scripts/blog-captions.mjs\`: 462 bài, 1.111 ảnh dùng chung, 0 lỗi, 0 cảnh báo.
    * \`npm run content:gate\`: PASS 100%.
    * \`npm test\`: PASS 100% (1.274 trang, 46 màn a11y, 30 native-auth, size-budget, vi-lint, infra-check).
    * \`publishAt: ""\` để trống cho Claude xếp lịch.
- Cần sửa / Nhận xét:

### [E1] Email "Báo cáo não bộ" hằng tuần · @antigravity · ưu tiên: thấp
- Giao diện + template `web/templates/weekly-digest.html` + i18n đã đạt (Claude 16/10); mặc định **TẮT (opt-in)** `emailDigest: false`.
- ⏸️ Chờ anh Quyền chọn dịch vụ gửi mail cho người dùng (đề xuất Resend free 3.000 mail/tháng) + DNS SPF/DKIM + `/api/unsub` – Cloudflare Email Routing chỉ gửi tới địa chỉ đã xác minh. **Claude triển khai worker**, Antigravity không deploy.
- Báo cáo đầy đủ (truy vấn D1, placeholder): BOARD-ARCHIVE.md [E1].
- Cần sửa / Nhận xét:

## ĐÃ XONG
- ✅ **[N4] ĐÃ XONG (Claude 23/10, cherry-pick 964add4b):** digest đọc 1 truy vấn `config WHERE k IN (alert_errors, adm_pref:<mỗi admin>)` rồi gửi riêng từng admin; thiếu pref = mặc định cũ (tất cả loại, ngưỡng 50/70%); không đụng `_d1guard.js`/`_d1b.js`. Test `scripts/test/mail-prefs.mjs` + admin-prefs + smoke + infra-check đạt. Lưu ý: nhánh `fetch` có `alertType` đọc 1 khóa/yêu cầu (hiện chưa nơi nào gửi alertType).
- ✅ **[B5] đợt này ĐÃ XONG (Claude 23/10):** gộp th, tr, zh = 18 bài (lịch 11–16/11, ≤1/ngôn ngữ/ngày, verify OK) + liên kết chéo từ 12 bài cũ. Đã sửa: ví dụ Task 1 (th, tr) trùng zh → viết lại ví dụ khác (blog-dupes 0); tr thêm đoạn phân tích để đủ 1.200 từ. ⛔ **6 bài hi VẪN chữ Latin (0% Devanagari)** → chưa gộp, viết lại bằng Devanagari rồi nộp lại.

### [N3] Cài đặt nâng cao cho tài khoản quản trị · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Mục tiêu: trong tab Cài đặt thêm khối **"🛡️ Tài khoản quản trị"**: tab mặc định, ngôn ngữ & giao diện mặc định, loại cảnh báo email (lỗi JS, workflow, hộp thư, chất lượng, bản dịch), ngưỡng cảnh báo, tự đăng xuất sau N phút, xuất nhật ký quản trị CSV, phiên gần đây.
- **Claude 23/10:** Antigravity làm **TOÀN BỘ N3 gồm cả API** (tránh hỏi qua lại).
  - **Server:** file MỚI `functions/api/admin-prefs.js` (POST `op: get|set`), đặt sau `adminGate` import từ `admin.js`. KHÔNG sửa logic server của `admin.js` (tối đa 1 dòng route nếu cần).
  - **Lưu trữ:** D1 chính, bảng `config`, khóa `adm_pref:<email>`, blob JSON ≤ 4 KB, **whitelist trường có kiểm schema** (từ chối trường lạ/kiểu sai). Đọc 1 lần lúc tải, cache vào `sessionStorage`.
  - **Client:** CHỈ mở rộng phần tab Cài đặt của `web/js/admin.js`, hoặc tốt hơn là file lười mới `web/js/admin-prefs.js` gắn từ tab Cài đặt.
  - **Tính năng:** tab mặc định, ngôn ngữ/giao diện mặc định, bật/tắt từng loại cảnh báo email, ngưỡng, tự đăng xuất sau N phút.
  - "Phiên gần đây" và "xuất CSV nhật ký" **chỉ đọc dữ liệu có sẵn**. `admin_log` có thể chuyển sang D1 nội bộ (`functions/api/_d1b.js`) → dùng helper đó, truy vấn có **LIMIT** và theo chỉ mục thời gian.
  - Kèm: test, từ điển EN của admin, ảnh trước/sau. `workers/mail/index.js` (đọc loại cảnh báo): Claude triển khai sau.
- Báo cáo:
- Cần sửa / Nhận xét:
- Báo cáo (Claude 23/10): cherry-pick 06419c2f lên main mới (xung đột package.json: giữ test của main + thêm admin-prefs.mjs). Đạt: admin-prefs/admin-ui/api-security/size-budget (khung 374/377 KB, client lười nên +0)/brand/infra/client-security/smoke/a11y/i18n. adminGate + khóa `adm_pref:<email>` whitelist ≤4 KB, XSS-safe (esc + bảng cố định), tự logout an toàn, CSV chống công thức.
- Claude đã sửa: (1) `logs` đọc `admin_log` ở **D1 chính** (adminAudit ghi env.DB, không phải D1 nội bộ – bản gốc dễ đọc nhầm khi D1B=1); (2) lọc theo email chỉ quét tối đa 2000 dòng mới nhất (không có chỉ mục email → tránh quét toàn bảng); (3) `admin.js` op `config` đọc `WHERE k IN (CONFIG_KEYS)` thay vì quét cả bảng (có thêm hàng adm_pref:*).
- Còn lại (Claude): `workers/mail/index.js` đọc `alertTypes`/ngưỡng từ adm_pref. Ghi chú: `admin-gate.mjs` đang FAIL ở main từ 2ac7f4c5 (nút #swAcc) – không do N3.


### [GĐ3] Âm thanh (mở rộng Sfx) · ngọn lửa chuỗi · lấp lánh · @antigravity · ✅ Claude duyệt & gộp main 23/10
- Gộp `68040109` (feat fx) + `8f737278` (fix CSS.escape), bỏ commit BOARD. Đạt: mở rộng `Sfx` trong `game.js` (không module thứ 2), `isMuted()` + `actx.resume()`; lửa/lấp lánh CSS nằm trong `streak-ui.js` (bundle lười), tắt khi `prefers-reduced-motion`; không đụng file của agent khác; `CSS.escape` là vá phòng vệ đúng + mock test.
- Đo: smoke, size-budget, learn-flow, unit, streak-ui, shorts-scale, a11y (0 NOLABEL), axe 46 màn, i18n-switch/qa/missing, brand-check đều đạt. ⚠️ Khung app 379 → **380/380 KB gz** (`game.js` +~0,2 KB gz): hết dư địa, thay đổi khung sau phải bớt byte trước.
- Lưu ý: `decorate()` chạy lúc `streak-ui.js` nạp nên lửa/shimmer chỉ hiện khi bundle `streak` đã tải; `Sfx.tap/combo/shimmer` chưa được gọi ở đâu (để sẵn).

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
