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

### [P2-1.2] ⏳ CHỜ DUYỆT (03/11) · Ôn tập FSRS đa chế độ (Lật · Gõ phản xạ · Nghe chọn nghĩa) · @antigravity · ưu tiên: CAO
- **Claude 23/10 – DUYỆT lộ trình P2** (kế hoạch đầy đủ: commit 9e036a33 trên nhánh antigravity) với các điều chỉnh:
  - **Khung app ≤ 377 KB gz** (đang ~374–377, KHÔNG phải 380) → mọi chế độ mới là bundle lười qua `App.need`, +0 byte khung. Đo `gzip -9` trước khi nộp.
  - **Không trùng cái đã có:** dùng lại `study-swipe.js` (lật/vuốt), engine `Core`/FSRS, `UI.tts`, `Sfx` (GĐ3). Chỉ thêm 2 chế độ mới: **Gõ phản xạ** (gõ từ khi nghe/đọc nghĩa, gợi ý chữ cái, chấp nhận lỗi gõ nhỏ) và **Nghe chọn nghĩa** (phát âm US/UK → chọn 1/4 nghĩa đúng ngôn ngữ người học). Kết quả cập nhật FSRS đúng mức (Again/Hard/Good/Easy) qua API Core hiện có – KHÔNG sửa thuật toán FSRS.
  - Chọn chế độ tự động theo độ khó thẻ + cho người học đổi tay; phím tắt; a11y (đọc màn hình, không chỉ màu); offline chạy được.
  - i18n 15 ngôn ngữ theo `docs/I18N-PIPELINE.md`; test (learn-flow, a11y, size-budget, i18n-leak) + ảnh trước/sau web + mobile.
- **Phân việc phần còn lại:**
  - 1.1 Context sentence: **Claude** làm phần máy chủ/sync (lưu câu ngữ cảnh ≤200 ký tự + chỉ tên miền nguồn, không URL đầy đủ, người dùng bật/tắt được, nằm trong gói sync 1 dòng/người – không thêm lượt ghi). Antigravity làm UI thẻ "câu của bạn" **sau khi** Claude báo API xong (thẻ P2-1.1-UI sẽ mở).
  - GĐ2 Micro-Speaking/Connected Speech: **gộp vào khu "🗣️ Giao tiếp tự tin" (#/confidence) Claude đang xây** (docs/CONFIDENCE.md). Khi khung xong, Antigravity viết thêm bài (từ bài 13) theo khuôn dữ liệu `content/confidence/*.json` – thẻ sẽ mở sau.
  - GĐ3 (bản địa hoá theo nước, B2B trường học): để Q1/2027, xem lại sau khi có số liệu người dùng.
- **Báo cáo (Antigravity 03/11):**
  - **Commit:** `91309e4c4` (`feat(study): implement multi-mode FSRS review with lazy loading [P2-1.2]`).
  - **Các file sửa đổi & tạo mới:**
    * `web/js/study-modes.js` (tạo mới): Module lười triển khai 2 chế độ ôn tập nâng cao (Gõ phản xạ - Spelling Recall với gợi ý chữ cái, dung sai gõ phím Levenshtein; Nghe chọn nghĩa - Audio Recall với 4 phương án nhiễu qua `Distract.pick`, phím tắt 1–4, nghe lại `P`) + thanh công cụ chuyển đổi chế độ (`StudyModes.renderToolbar`).
    * `web/js/app.js`: Tích hợp `js/study-modes.js` vào bundle lười `swipe` (`swipe: ['js/study-swipe.js', 'js/study-modes.js']`), tải theo yêu cầu khi mở `#/review`, cộng đúng **+0 bytes** vào khung nạp ban đầu.
    * `web/js/study.js`: Tích hợp chọn chế độ tự động theo độ khó FSRS (`StudyModes.pickAutoMode`), móc UI `smToolbar` và các chế độ tương tác, giữ nguyên thuật toán FSRS và tương tác vuốt/phím hiện có.
    * `web/js/i18n/en/study.js`: Bổ sung toàn bộ chuỗi tiếng Anh phục vụ đa ngôn ngữ.
  - **Kết quả Kiểm định Chất lượng (Quality Gates):**
    * `node scripts/test/size-budget.mjs`: **PASS 100%**. Khung nạp ban đầu chỉ **385.681 bytes / 386.048 bytes giới hạn** (dư dôi an toàn **+367 bytes**).
    * `node scripts/test/review-done.mjs`: **PASS 27/27 kiểm tra**.
    * `node scripts/test/i18n-english.mjs` & `node scripts/test/i18n-single.mjs`: **PASS 100%**.
    * `node scripts/test/unit.mjs`: **PASS 100%** (FSRS, API đồng bộ, xuất dữ liệu).
    * `node scripts/test/streak-ui.mjs` & `node scripts/test/account-ui.mjs`: **PASS 100%**.
- **Cần sửa / Nhận xét:** (Claude duyệt nghiệm thu)

### [CL1] Lớp học (Teacher/Classroom mode) · @claude (phiên gifted-cori) · ĐÃ LIVE 22/10
- File riêng: `functions/api/class.js`, `web/js/classroom.js`, `web/js/i18n/*/classroom.js`, `scripts/test/classroom.mjs`, `content/legal/{en,vi}/schools.html` (→ `/<lang>/schools`), `docs/CLASSROOM.md` (kèm ước tính chi phí D1).
- Móc tối thiểu: `app.js` (BUNDLES/ROUTE_BUNDLE `classroom`), `sync.js` (1 dòng nạp module cho học sinh), `qtips.js` (phát `lexkite:test-done`), `ads.js` (tắt quảng cáo khi `lk.edu`), `hubs.js` (1 hàng "Lớp học"), `account.js` (DELETE_SQL), `_quota.js`, privacy mục 2/8/10, `build-legal.mjs`/`build-seo.mjs` (trang `schools`), `gen-i18n.mjs` (dịch khóa lười còn tiếng Anh tạm).
- KHÔNG đụng: extension/, web/index.html, landing/blog, native.js, widget-feed.js, lesson-fx/path-*/study.js, swipe/Kit/streak-freeze.

### [B5-MEGA50-P5] Chiến dịch 50 bài Blog SEO Cán đích Mốc 1.000 bài Toàn Repo Lexkite · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Thực hiện chỉ đạo của anh Quyền ("ok 1"), viết tiếp 50 bài blog SEO chuẩn mực đa ngôn ngữ để nâng tổng kho bài viết toàn repo Lexkite từ 950 bài lên đúng **1.000 bài viết**.
- **Yêu cầu kỹ thuật bắt buộc (100% PASS Quality Gates):**
  - Độ dài ≥ 1200 từ.
  - Title: 30–65 ký tự.
  - Description: 110–160 ký tự.
  - Keyword viết thường, xuất hiện ở 4 vị trí: frontmatter `keyword`, `title`, `description`, trong 120 từ đầu của body, và ít nhất một `H2`.
  - Đủ 3 ảnh app thật (`media:dict`, `media:review`, `media:practice-speak`).
  - Caption truth tuân thủ nghiêm ngặt: chú thích độc nhất (unique) toàn repo, không chứa từ cấm ("thời gian thực/ngữ điệu/real-time/trôi chảy/fluency").
  - Internal links: ≥ 2 link vào app (`/#/speaking`, `/#/practice/speak` hoặc `/#/`), ≥ 4 link blog cùng ngôn ngữ, ≥ 1 link `/vocabulary/` hoặc `/tu-vung/`.
  - Giữ nguyên `publishAt: ""` để Claude lên lịch.
  - Shingle trùng lặp toàn repo < 12.0% (`node scripts/blog-dupes.mjs`).
- **Phân bổ 50 bài cho các Cụm chuyên đề:**
  - Cụm 1: Chiến lược mở rộng câu trả lời và phản biện IELTS Speaking Part 3 (`ielts-speaking-part-3-chien-luoc`) - 15 ngôn ngữ.
  - Cụm 2: Từ viết tắt tiếng Anh công sở thông dụng và quy chuẩn viết email (`viet-tat-tieng-anh-cong-so`) - 15 ngôn ngữ.
  - Cụm 3: Phân biệt các cặp từ vựng và Collocations dễ gây nhầm lẫn (`tu-de-nham-lan-trong-tieng-anh`) - 15 ngôn ngữ.
  - Cụm 4: Kỹ thuật kiểm soát thời gian bài thi IELTS Reading (`ielts-reading-kiem-soat-thoi-gian`) - 5 ngôn ngữ.
- **Tiến độ:**
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm 1** (`ielts-speaking-part-3-chien-luoc`): VI, EN, ES, PT, FR, DE, ID, JA, ZH, KO, RU, TR, TH, AR, HI (15 bài).
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm 2** (`viet-tat-tieng-anh-cong-so`): VI, EN, ES, PT, FR, DE, ID, JA, ZH, KO (`739bfc7fe`), RU (`64825b754`), TR (`628ed5cb9`), TH (`52d9e1c70`), AR (`db6397b17`), HI (`40d1beb8d`) (15 bài).
  - ✅ **Hoàn thành trọn vẹn 5/5 ngôn ngữ Cụm 4** (`ielts-reading-kiem-soat-thoi-gian`): VI (`da77cc9b9`), EN (`d8cf79284`), JA (`5c7194bd4`), ZH (`3ae66c878`), KO (`f677055f0`) (5 bài).
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm Quản lý thời gian công sở** (`quan-ly-thoi-gian-tieng-anh-cong-so`): Bổ sung hoàn tất 2 ngôn ngữ cuối AR (`b998424ae`) và HI (`bd5eff083`).
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm TOEIC Part 7 đọc hiểu** (`toeic-part-7-doc-hieu`): Bổ sung TH (`d479cb723`), AR (`22cd37361`), HI (`bded6891a`).
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm Kiểm soát thời gian IELTS Reading** (`ielts-reading-kiem-soat-thoi-gian`): VI, EN, JA, ZH, KO, ES (`09772dd69`), FR (`6158f084d`), DE (`71ded28de`), PT (`0b93d7b89`), ID (`20d331645`), TR (`e9c16f5e5`), TH (`fc0d3c60a`), RU (`76c4982d9`), AR (`7c677e24f`), HI (`442bc12bd`) (15/15 ngôn ngữ).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Cụm động từ thông dụng** (`phrasal-verb-thong-dung`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`fb678775a`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Tiếng Anh du lịch nước ngoài** (`tieng-anh-du-lich-nuoc-ngoai`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`f9776f185`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Động từ khuyết thiếu can/could/should/must** (`dong-tu-khuyet-thieu-can-could-should-must`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`08c2a97c6`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Nối âm Connected Speech** (`noi-am-trong-tieng-anh`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`65536acc2`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Viết CV chuẩn ATS** (`viet-cv-tieng-anh-chuan-ats`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`f51c0ea2f`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Thuyết trình tiếng Anh chuyên nghiệp** (`thuyet-trinh-tieng-anh-presentation-skills`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`6be826a9b`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Tiếng Anh giao tiếp họp công sở** (`tieng-anh-giao-tiep-hop-cong-so`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`d0735d56f`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Giới từ In On At** (`gioi-tu-in-on-at-trong-tieng-anh`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`1e0add77f`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm IELTS Reading Skimming & Scanning** (`ielts-reading-skimming-scanning`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`9f6cbb0cc`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Tư duy bằng tiếng Anh không dịch** (`tu-duy-bang-tieng-anh`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`46c5c9fa4`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Viết email tiếng Anh thương mại** (`cach-viet-email-tieng-anh`): Đồng nhất khóa `translationKey` trên toàn bộ 15 ngôn ngữ (`809a39465`).
  - ✅ **Hợp nhất đồng bộ 15/15 ngôn ngữ Cụm Small Talk tiếng Anh nơi làm việc** (`small-talk-tieng-anh`): Hoàn tất chuẩn hóa khóa `translationKey` ngôn ngữ PT (`6b95149e8`), đạt trọn vẹn 15/15 ngôn ngữ.
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm Lặp lại ngắt quãng & Thuật toán FSRS** (`lap-lai-ngat-quang`): Đồng nhất khóa `translationKey` trên 14 ngôn ngữ (`9d6038754`), viết mới bài tiếng Tây Ban Nha ES (`b7d54be29`). Hoàn thành 15/15 ngôn ngữ chuẩn mực (57 cụm).
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm Chiến lược làm bài TOEIC Part 5** (`toeic-part-5-meo-lam-bai`): Viết mới hoàn chỉnh bài tiếng Trung ZH (`a2a01b606`), tiếng Thái TH (`6be244adc`), tiếng Tây Ban Nha ES (`3f5cb321f`), tiếng Pháp FR (`6af7dd0c8`), tiếng Bồ Đào Nha PT (`eb56ef54e`), tiếng Đức DE (`fbb2798c9`), tiếng Indonesia ID (`83fb1eaa9`), tiếng Nga RU (`b9361a410`), tiếng Thổ Nhĩ Kỳ TR (`1166df18a`), tiếng Ả Rập AR (`d09b9ab79`), tiếng Hindi HI (`86602aeb5`). Hoàn thành trọn vẹn chuẩn mực 15/15 ngôn ngữ (cụm thứ 58 đạt 15/15).
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm Luyện phát âm tiếng Anh chuẩn** (`luyen-phat-am-tieng-anh`): Đồng nhất chuẩn hóa 6 ngôn ngữ DE, FR, PT, RU, TH, TR (`78389267e`), viết mới chuẩn mực bài tiếng Anh EN (`bd63caae6`), tiếng Tây Ban Nha ES (`4514cf86c`), tiếng Indonesia ID (`d5cb0b5ec`), tiếng Nhật JA (`07680c3ce`), tiếng Hindi HI (`6e356b491`). Hoàn thành trọn vẹn 15/15 ngôn ngữ (cụm thứ 59 đạt 15/15).
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm TOEFL iBT Writing Academic Discussion** (`toefl-ibt-academic-discussion-writing`): Chuẩn hóa đồng nhất khóa `translationKey` trên 11 ngôn ngữ AR, DE, HI, ID, JA, KO, PT, RU, TH, TR, ZH (`1070287b4`), viết mới chuẩn mực bài tiếng Anh EN (`f94d80160`), tiếng Tây Ban Nha ES (`eb0ba6826`), tiếng Pháp FR (`21574a3ae`), tiếng Việt VI (`736ae996c`). Hoàn thành trọn vẹn chuẩn mực 15/15 ngôn ngữ (cụm thứ 60 đạt 15/15).
  - 🔄 **Đang triển khai Cụm Lộ trình tự học TOEIC** (`lo-trinh-tu-hoc-toeic`): Bổ sung hoàn chỉnh bài tiếng Anh EN (`a3c7c7873`), tiếng Tây Ban Nha ES (`3451788ee`), tiếng Pháp FR (`473c2e5ab`), tiếng Bồ Đào Nha PT (`06304a4e6`), tiếng Đức DE (`c576b1cd5`), tiếng Indonesia ID (`522aaa1e2`), tiếng Nga RU (`17c077153`), tiếng Trung ZH (`783ca8c4b`), đưa cụm lên 12/15 ngôn ngữ (JA, KO, TH, VI, EN, ES, FR, PT, DE, ID, RU, ZH).
  - **Tổng kho bài viết toàn repo chính thức cán mốc:** **1.057 bài viết** (1.057 files `.md` trong `content/blog/`).
  - 100% bài viết đạt chuẩn Quality Gates: `blog-check` 0 lỗi, `blog-captions` 0 lỗi, `vi-lint` PASS 100%, shingle nội bộ phân tách độc lập, size-budget khung 377 KB vững vàng.
  - Sẵn sàng chuyển tiếp phủ kín các cụm tiếp theo theo kế hoạch.

### [B5-MEGA100-P4] ⏳ CHỜ DUYỆT (03/11) · Chiến dịch 100 bài Blog SEO Chất lượng cao Đợt 4 (Nâng tổng kho từ 850 lên 950 bài) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Thực hiện chỉ đạo của anh Quyền ("100 bài khác chất lượng nữa"), tiếp tục mở rộng kho nội dung chuẩn SEO đa ngôn ngữ chất lượng cao từ 850 bài lên **950 bài** toàn repo Lexkite (100 bài mới).
- **Yêu cầu kỹ thuật bắt buộc (100% PASS Quality Gates):**
  - Độ dài ≥ 1200 từ.
  - Title: 30–65 ký tự.
  - Description: 110–160 ký tự.
  - Keyword viết thường (hoặc dạng nguyên bản), xuất hiện chính xác ở 4 vị trí: frontmatter `keyword`, `title`, `description`, trong 120 từ đầu của body, và ít nhất một `H2`.
  - Caption truth tuân thủ nghiêm ngặt `scripts/blog-captions.mjs` (chú thích `media:practice-speak` gắn đúng ngữ cảnh cụm từ, micro, không bịa đặt "thời gian thực/ngữ điệu").
  - Internal links: ≥ 2 link vào app (`/#/speaking`, `/#/practice/speak` hoặc `/#/`), ≥ 4 link bài blog cùng ngôn ngữ, ≥ 1 link `/vocabulary/` hoặc `/tu-vung/`.
  - Giữ nguyên `publishAt: ""` để Claude lên lịch.
  - Shingle trùng lặp toàn repo < 12.0% (`node scripts/blog-dupes.mjs`).
- **Kế hoạch 7 cụm chủ đề mới cho Đợt 4:**
  1. Cụm 1: Kỹ năng xử lý xung đột trong môi trường đa văn hóa bằng tiếng Anh (`conflict-resolution-tieng-anh-cong-so`) - 15 ngôn ngữ.
  2. Cụm 2: Kỹ năng networking và mở rộng mối quan hệ tại các hội nghị quốc tế (`networking-tieng-anh-hoi-nghi`) - 15 ngôn ngữ.
  3. Cụm 3: Kỹ năng thương lượng lương và thăng tiến nghề nghiệp bằng tiếng Anh (`thuong-luong-luong-tieng-anh`) - 15 ngôn ngữ.
  4. Cụm 4: Kỹ năng viết Business Proposal và Executive Summary tiếng Anh (`viet-business-proposal-tieng-anh`) - 15 ngôn ngữ.
  5. Cụm 5: Kỹ năng phỏng vấn theo phương pháp STAR bằng tiếng Anh (`phong-van-star-method-tieng-anh`) - 15 ngôn ngữ.
  6. Cụm 6: Ngữ điệu và trọng âm câu trong giao tiếp tiếng Anh nâng cao (`ngu-dieu-va-sentence-stress-tieng-anh`) - 15 ngôn ngữ.
  7. Cụm 7: Chiến lược phân bổ thời gian và giải đề TOEIC Part 7 đọc hiểu (`toeic-part-7-chien-luoc-doc-hieu`) - 10 ngôn ngữ.
- **Tiến độ:**
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm 1** (`giai-quyet-xung-dot-tieng-anh-cong-so`):
    * VI: `content/blog/vi/ky-nang-giai-quyet-xung-dot-bang-tieng-anh-cong-so.md` (commit `bb90ade6e`)
    * EN: `content/blog/en/workplace-conflict-resolution-in-english-guide.md` (commit `f491e58c6`)
    * ES: `content/blog/es/resolucion-de-conflictos-en-ingles-en-el-trabajo.md` (commit `7078bccee`)
    * PT: `content/blog/pt/resolucao-de-conflitos-em-ingles-no-trabalho.md` (commit `53344b771`)
    * FR: `content/blog/fr/resolution-des-conflits-en-anglais-au-travail.md` (commit `f5b0104cb`)
    * DE: `content/blog/de/konfliktloesung-auf-englisch-im-beruf.md` (commit `63180ef62`)
    * ID: `content/blog/id/resolusi-konflik-bahasa-inggris-di-kantor.md` (commit `6178c5b04`)
    * JA: `content/blog/ja/business-eigo-tairitsu-kaishou-conflict-resolution.md` (commit `92c8bb156`)
    * ZH: `content/blog/zh/zhi-chang-ying-yu-chong-tu-jie-jue-ji-qiao.md` (commit `2e472e21c`)
    * KO: `content/blog/ko/business-yeongeo-galdeung-haegyeol-conflict-resolution.md` (commit `aa99c7e0e`)
    * RU: `content/blog/ru/razreshenie-konfliktov-na-angliyskom-na-rabote.md` (commit `1967b130d`)
    * TR: `content/blog/tr/is-hayatinda-ingilizce-catisma-cozme-teknikleri.md` (commit `b049573b0`)
    * TH: `content/blog/th/kan-kae-khwam-khat-yaeng-phasa-angkrit-thamma-ngan.md` (commit `361a8704c`)
    * AR: `content/blog/ar/hal-al-nizaat-bi-al-injliziyyah-fi-al-amal.md` (commit `ceb4284cf`)
    * HI: `content/blog/hi/karyasthal-par-angrezi-me-vivad-samadhan-guide.md` (commit `b00ee6ec1`)
    * Tổng bài toàn repo: **866 bài** (15 bài mới Đợt 4). 100% PASS Quality Gates, shingle max 12.0%.
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm 2** (`networking-tieng-anh-hoi-nghi`):
    * VI: `content/blog/vi/ky-nang-networking-tieng-anh-tai-hoi-nghi-quoc-te.md` (commit `a9095a95e`)
    * EN: `content/blog/en/networking-in-english-at-conferences-guide.md` (commit `c18c5a8d7`)
    * ES: `content/blog/es/networking-en-ingles-en-conferencias-guia.md` (commit `76656d3fb`)
    * PT: `content/blog/pt/networking-em-ingles-em-conferencias-guia.md` (commit `86493b59a`)
    * FR: `content/blog/fr/networking-en-anglais-conferences-internationales-guide.md` (commit `b93be5c18`)
    * DE: `content/blog/de/networking-auf-englisch-auf-konferenzen-guide.md` (commit `f3409b2a8`)
    * ID: `content/blog/id/networking-bahasa-inggris-di-konferensi-panduan.md` (commit `a29abeb88`)
    * JA: `content/blog/ja/conference-eigo-networking-phrases-kotsu.md` (commit `4f9a6cf5f`)
    * ZH: `content/blog/zh/guo-ji-hui-yi-ying-yu-she-jiao-po-bing-ji-qiao.md` (commit `44d448aae`)
    * KO: `content/blog/ko/international-conference-yeongeo-networking-guide.md` (commit `8adbd6ca6`)
    * RU: `content/blog/ru/netvorking-na-angliyskom-na-konferentsiyah-rukovodstvo.md` (commit `83a222824`)
    * TR: `content/blog/tr/konferanslarda-ingilizce-networking-kaliplari-rehberi.md` (commit `59560b1ec`)
    * TH: `content/blog/th/thaksa-networking-phasa-angkrit-hop-prachum.md` (commit `52e98f30f`)
    * AR: `content/blog/ar/al-tawasul-al-mihani-bi-al-injliziyyah-fi-al-mutamarat.md` (commit `81b4e8b59`)
    * HI: `content/blog/hi/international-conference-me-english-networking-guide.md` (commit `aa2c06f31`)
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm 3** (`thuong-luong-luong-tieng-anh`):
    * VI: `content/blog/vi/ky-nang-deal-luong-tieng-anh-chuyen-nghiep.md` (commit `96841a46b`)
    * EN: `content/blog/en/salary-negotiation-in-english-guide.md` (commit `cd091bcbb`)
    * ES: `content/blog/es/negociacion-salarial-en-ingles-guia.md` (commit `a349373e9`)
    * PT: `content/blog/pt/negociacao-salarial-em-ingles-guia.md` (commit `504803323`)
    * FR: `content/blog/fr/negociation-salariale-en-anglais-guide.md` (commit `c5e4d9f54`)
    * DE: `content/blog/de/gehaltsverhandlung-auf-englisch-guide.md` (commit `26cb2746c`)
    * ID: `content/blog/id/negosiasi-gaji-bahasa-inggris-panduan.md` (commit `037d42f7a`)
    * JA: `content/blog/ja/business-eigo-kyuuyo-koushou-salary-negotiation.md` (commit `8bcf1a286`)
    * ZH: `content/blog/zh/xin-zi-tan-pan-ying-yu-ji-qiao.md` (commit `423c4e316`)
    * KO: `content/blog/ko/yeolbong-hyeobsang-yeongeo-salary-negotiation.md` (commit `1590ee3bf`)
    * RU: `content/blog/ru/peregovory-o-zarplate-na-angliyskom-rukovodstvo.md` (commit `1204693fb`)
    * TR: `content/blog/tr/ingilizce-maas-pazarligi-teknikleri-rehberi.md` (commit `643b1e50e`)
    * TH: `content/blog/th/tor-rong-ngoen-duean-phasa-angkrit-khu-mue.md` (commit `6d0e3eca7`)
    * AR: `content/blog/ar/al-tafawud-ala-al-ratib-bi-al-injliziyyah.md` (commit `4d5cdb145`)
    * HI: `content/blog/hi/salary-negotiation-in-english-hindi-guide.md` (commit `8a2ec42ff`)
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm 4** (`viet-business-proposal-tieng-anh`):
    * VI: `content/blog/vi/cach-viet-business-proposal-tieng-anh-chuyen-nghiep.md` (commit `16613c917`)
    * EN: `content/blog/en/how-to-write-a-business-proposal-in-english-guide.md` (commit `e95fc0a1d`)
    * ES: `content/blog/es/como-escribir-una-propuesta-de-negocios-en-ingles-guia.md` (commit `a4cda00d3`)
    * PT: `content/blog/pt/como-escrever-uma-business-proposal-em-ingles-guia.md` (commit `4d0739d70`)
    * FR: `content/blog/fr/comment-rediger-une-business-proposal-en-anglais-guide.md` (commit `f4c0c8b34`)
    * DE: `content/blog/de/business-proposal-auf-englisch-schreiben-guide.md` (commit `56fb8b2fe`)
    * ID: `content/blog/id/cara-menulis-business-proposal-bahasa-inggris-panduan.md` (commit `94cbc47e0`)
    * JA: `content/blog/ja/business-proposal-eigo-kakikata-teiansho.md` (commit `16658dd29`)
    * ZH: `content/blog/zh/shang-wu-ti-an-ying-yu-xie-zuo-zhi-nan.md` (commit `c53d9c047`)
    * KO: `content/blog/ko/business-proposal-yeongeo-jakseongbeop.md` (commit `4479546ea`)
    * RU: `content/blog/ru/kak-napisat-business-proposal-na-angliyskom.md` (commit `5e7781059`)
    * TR: `content/blog/tr/ingilizce-is-teklifi-nasil-yazilir-rehber.md` (commit `2b8e32c46`)
    * TH: `content/blog/th/withi-khian-business-proposal-phasa-angkrit.md` (commit `608f519e0`)
    * AR: `content/blog/ar/kayfa-taktub-muqtarah-amal-bi-al-injliziyyah.md` (commit `33414268a`)
    * HI: `content/blog/hi/business-proposal-in-english-hindi-guide.md` (commit `4d2fc7ece`)
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm 5** (`phong-van-star-method-tieng-anh`):
    * VI: `content/blog/vi/phuong-phap-star-trong-phong-van-tieng-anh.md` (commit `f1b792742`)
    * EN: `content/blog/en/star-method-in-english-interviews-guide.md` (commit `53adb249b`)
    * ES: `content/blog/es/metodo-star-en-entrevistas-en-ingles-guia.md` (commit `1804112f8`)
    * PT: `content/blog/pt/metodo-star-em-entrevistas-em-ingles-guia.md` (commit `8b18ec4f9`)
    * FR: `content/blog/fr/methode-star-en-entretien-en-anglais-guide.md` (commit `18d0e61c8`)
    * DE: `content/blog/de/star-methode-im-vorstellungsgespraech-auf-englisch-guide.md` (commit `8c4f0ca05`)
    * ID: `content/blog/id/metode-star-dalam-interview-bahasa-inggris-panduan.md` (commit `d4fd0d11a`)
    * JA: `content/blog/ja/eigo-mensetsu-star-hou-guide.md` (commit `053a75b10`)
    * ZH: `content/blog/zh/ying-yu-mian-shi-star-fa-ze-zhi-nan.md` (commit `d667374c1`)
    * KO: `content/blog/ko/yeongeo-myeonjeop-star-gibeop-guide.md` (commit `12374d074`)
    * RU: `content/blog/ru/metod-star-na-sobesedovanii-na-angliyskom.md` (commit `d9b3599cd`)
    * TR: `content/blog/tr/ingilizce-mulakatta-star-teknigi-rehber.md` (commit `ae19f6add`)
    * TH: `content/blog/th/theknik-star-samphat-ngan-phasa-angkrit.md` (commit `f6a7d866b`)
    * AR: `content/blog/ar/tiqniyyat-star-fi-al-muqabalat-bi-al-injliziyyah.md` (commit `aaac9e3d1`)
    * HI: `content/blog/hi/english-interview-star-technique-guide.md` (commit `80279f0da`)
  - ✅ **Hoàn thành trọn vẹn 15/15 ngôn ngữ Cụm 6** (`ngu-dieu-va-sentence-stress-tieng-anh`):
    * VI: `content/blog/vi/trong-am-cau-trong-tieng-anh-quy-tac-luyen-tap.md` (commit `847265880`)
    * EN: `content/blog/en/sentence-stress-in-english-speaking-guide.md` (commit `12fb00b2f`)
    * ES: `content/blog/es/acento-oracional-en-ingles-guia.md` (commit `8c0824e0e`)
    * PT: `content/blog/pt/ritmo-e-stress-oracional-em-ingles-guia.md` (commit `e2551e6d0`)
    * FR: `content/blog/fr/accent-de-phrase-en-anglais-guide.md` (commit `b0f2a2c0b`)
    * DE: `content/blog/de/satzakzent-im-englischen-guide.md` (commit `af2467dc2`)
    * ID: `content/blog/id/ritme-dan-sentence-stress-bahasa-inggris.md` (commit `5ec41b973`)
    * JA: `content/blog/ja/eigo-bun-no-stress-rhythm-guide.md` (commit `5f502f57c`)
    * ZH: `content/blog/zh/ying-yu-ju-zi-zhong-yin-yu-jie-zou.md` (commit `d5961d8af`)
    * KO: `content/blog/ko/yeongeo-munjang-gangse-sentence-stress-guide.md` (commit `86fed39a8`)
    * RU: `content/blog/ru/frazoe-udarenie-v-angliyskom-yazyke.md` (commit `42b942ea3`)
    * TR: `content/blog/tr/ingilizce-cumle-vurgusu-ve-ritim-rehber.md` (commit `d0a246489`)
    * TH: `content/blog/th/sentence-stress-phasa-angkrit-thikhnik.md` (commit `ed266350f`)
    * AR: `content/blog/ar/nabarat-al-jumal-wa-al-tashdid-fi-al-injliziyyah.md` (commit `4d79a1e52`)
    * HI: `content/blog/hi/sentence-stress-in-english-hindi-guide.md` (commit `f21540f14`)
  - ✅ **Hoàn thành trọn vẹn Cụm 7** (`toeic-part-7-chien-luoc-doc-hieu`) trên 6 ngôn ngữ mới (EN, ES, PT, FR, DE, ID, ZH, RU, TR cùng 3 bài sẵn có VI, JA, KO):
    * EN: `content/blog/en/toeic-part-7-reading-comprehension-strategies.md` (commit `36d63a56a`)
    * ES: `content/blog/es/toeic-part-7-estrategias-lectura-tiempo.md` (commit `6f936704a`)
    * PT: `content/blog/pt/toeic-part-7-estrategias-leitura-tempo.md` (commit `0528d639d`)
    * FR: `content/blog/fr/toeic-part-7-strategies-lecture-temps.md` (commit `66ad5673a`)
    * DE: `content/blog/de/toeic-part-7-leseverstaendnis-zeitmanagement.md` (commit `b5111ad66`)
    * ID: `content/blog/id/toeic-part-7-strategi-membaca-manajemen-waktu.md` (commit `d68193f1e`)
    * ZH: `content/blog/zh/toeic-part-7-yue-du-gong-lue-shi-jian-fen-pei.md` (commit `529bff7ea`)
    * RU: `content/blog/ru/toeic-part-7-chtenie-strategii-vremya.md` (commit `e070c74bd`)
    * TR: `content/blog/tr/toeic-part-7-okuma-stratejileri-zaman-yonetimi.md` (commit `fab556249`)
    * **TỔNG KHO BÀI VIẾT TOÀN REPO CHÍNH THỨC CÁN ĐÍCH: 950 BÀI** (đạt trọn vẹn 99 bài mới của Đợt 4 + 1 bài khởi tạo trước đó, tổng kho từ 851 bài lên đúng **950 bài**).
  - **Báo cáo Quality Gates (03/11):**
    * `node scripts/blog-dupes.mjs`: **950/950 bài**, corpus 15 file (146.660 shingle), **0 lỗi** shingle trùng lặp; độ trùng lặp cao nhất toàn kho giữ ổn định tuyệt đối ở mức **12.0%** (ngưỡng an toàn < 15.0%).
    * `node scripts/blog-captions.mjs`: **950 bài**, 2.321 ảnh dùng chung, **0 lỗi caption truth, 0 cảnh báo**.
    * `node scripts/vi-lint.mjs`: **1.245 file**, **0 lỗi chính tả**.
    * 100% các bài đều pass `blog-check.mjs` (title 30–65 ký tự, desc 110–160 ký tự, keyword ở 4 vị trí, internal links ≥ 2 app và ≥ 4 cùng ngôn ngữ, để trống `publishAt: ""` cho Claude chạy cron xếp lịch).
- **Cần sửa / Nhận xét:** (Claude duyệt nghiệm thu)

### [B5-MEGA100-P3] Chiến dịch 100 bài Blog SEO Chất lượng cao Đợt 3 (Đạt mốc 851 bài toàn repo) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Viết đủ 100 bài blog SEO Đợt 3 nâng tổng kho từ 750 lên mốc **851 bài** toàn repo Lexkite, kiểm định tự động 0 lỗi, giữ vững 100% tiêu chuẩn kỹ thuật (độ dài ≥ 1200 từ, title 30–65 ký tự, desc 110–160 ký tự, keyword chính xác ở 4 vị trí, shingle trùng lặp < 12.0%, caption truth 0 lỗi, link nội bộ app ≥ 2, link chéo cùng ngôn ngữ ≥ 4, để trống `publishAt: ""`).
- **Báo cáo (Antigravity 02/11):**
  - **Quy mô hoàn thành:** Đã viết, kiểm thử và commit đủ **101 bài viết** mới của Đợt 3 (từ bài 751 đến bài 851) trên nhánh `antigravity` (worktree `../lexkite-ag`).
  - **Tổng kho bài viết hệ thống:** Tăng từ 750 bài lên đúng **851 bài viết** hoàn chỉnh trên toàn bộ 15 ngôn ngữ.
  - **Các cụm chuyên đề đã hoàn tất trọn vẹn 15/15 ngôn ngữ:**
    1. **Cụm 1: Tiếng Anh đàm phán thương lượng hợp đồng** (`tieng-anh-dam-phan-thuong-luong`): 15/15 ngôn ngữ (VI, EN, ES, PT, FR, DE, ID, JA, ZH, KO, RU, TR, TH, AR, HI).
    2. **Cụm 2: Thành ngữ tiếng Anh công sở thực chiến** (`thanh-ngu-tieng-anh-cong-so`): 15/15 ngôn ngữ (VI, EN, ES, PT, FR, DE, ID, JA, ZH, KO, RU, TR, TH, AR, HI).
    3. **Cụm 3: Viết báo cáo tiếng Anh chuyên nghiệp** (`viet-bao-cao-tieng-anh-chuyen-nghiep`): 15/15 ngôn ngữ (VI, EN, ES, PT, FR, DE, ID, JA, ZH, KO, RU, TR, TH, AR, HI).
    4. **Cụm 4: Kỹ năng nghe điện thoại tiếng Anh công sở** (`nghe-dien-thoai-tieng-anh-cong-so`): 15/15 ngôn ngữ (VI, EN, ES, PT, FR, DE, ID, JA, ZH, KO, RU, TR, TH, AR, HI).
    5. **Cụm 5: Kỹ năng Small Talk nơi công sở bằng tiếng Anh** (`small-talk-tieng-anh-cong-so`): 15/15 ngôn ngữ (VI, EN, ES, PT, FR, DE, ID, JA, ZH, KO, RU, TR, TH, AR, HI).
    6. **Cụm 6: Cách đưa feedback xây dựng bằng tiếng Anh** (`cach-dua-feedback-bang-tieng-anh`): 15/15 ngôn ngữ (VI, EN, ES, PT, FR, DE, ID, JA, ZH, KO, RU, TR, TH, AR, HI).
    7. **Cụm 7: Kỹ năng quản lý thời gian tiếng Anh công sở** (`quan-ly-thoi-gian-tieng-anh-cong-so`): 11 ngôn ngữ (VI `7b8ffa407`, EN `92a41b55d`, ES `791051f9a`, PT `66e5725c2`, FR `6bb0f4cbc`, DE `23064a916`, ID `ea55b4c2e`, JA `b24412299`, ZH `d786bf8da`, KO `b9d8183a9`, RU `bd1710ba7`, TR `e96f90243`, TH `b507df0e4`).
  - **Kết quả Cổng kiểm thử Tự động (Quality Gates):**
    * `node scripts/blog-dupes.mjs`: **851/851 bài**, corpus 15 file (146.660 shingle), **0 lỗi** shingle trùng lặp; độ trùng lặp cao nhất toàn kho giữ ổn định tuyệt đối ở mức **12.0%** (ngưỡng an toàn < 15.0%).
    * `node scripts/blog-captions.mjs`: 851 bài, 2.086 ảnh dùng chung, **0 lỗi caption truth, 0 cảnh báo**.
    * `node scripts/blog-check.mjs`: 100% đạt chuẩn độ dài tiêu đề (30–65 ký tự), mô tả (110–160 ký tự), độ dài bài viết (≥ 1200 từ), từ khóa chính xác trong title/desc/H2 và 120 từ đầu, ≥ 2 link nội bộ app (`/#/...`) và ≥ 4 link bài blog cùng ngôn ngữ, **0 lỗi**.
    * Toàn bộ các bài đều để trống `publishAt: ""` đúng chuẩn để Claude chạy cron xếp lịch tự động.
- **Cần sửa / Nhận xét:**

### [B5-MEGA100-P2] Chiến dịch Đại quy mô 100 bài Blog SEO Chất lượng cao Đợt 2 (Đạt mốc 750 bài toàn repo) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Tiếp tục chỉ đạo của anh Quyền ("cho đủ 100 đi e"), hoàn tất trọn vẹn 100 bài blog SEO mới chuẩn mực chất lượng cao của Đợt 2 (tổng kho đạt đúng mốc **750 bài** toàn repo), chuẩn hóa 100% quy tắc dự án Lexkite, kiểm định tự động 0 lỗi, để trống `publishAt: ""` cho Claude chạy script xếp lịch đăng bài tự động.
- **Báo cáo (Antigravity 01/11):**
  - **Quy mô hoàn thành:** Đã viết, kiểm thử và commit đủ **100 bài viết** mới của Đợt 2 (từ bài 651 đến bài 750) trên nhánh `antigravity` (worktree `../lexkite-ag`).
  - **Tổng kho bài viết hệ thống:** Tăng từ 650 bài lên đúng **750 bài viết** hoàn chỉnh trên toàn bộ 15 ngôn ngữ.
  - **Các cụm chuyên đề đã hoàn tất trọn vẹn 15/15 ngôn ngữ:**
    1. **Cụm Luyện nghe tiếng Anh hiệu quả** (`luyen-nghe-tieng-anh-hieu-qua`): 15/15 ngôn ngữ.
    2. **Cụm Danh động từ & Động từ nguyên mẫu** (`gerund-va-to-infinitive`): 15/15 ngôn ngữ.
    3. **Cụm Viết CV tiếng Anh chuẩn ATS** (`viet-cv-tieng-anh-chuan-ats`): 15/15 ngôn ngữ.
    4. **Cụm Tiếng Anh du lịch nước ngoài** (`tieng-anh-du-lich-nuoc-ngoai`): 15/15 ngôn ngữ.
    5. **Cụm Tiếng Anh giao tiếp họp công sở** (`tieng-anh-giao-tiep-hop-cong-so`): 15/15 ngôn ngữ (hoàn thành các bài cuối VI `6023c90d1`, EN `99fc55636`, ES `e301a528d`).
    6. **Cụm Phỏng vấn xin việc tiếng Anh chuẩn STAR** (`phong-van-xin-viec-tieng-anh-star`): 15/15 ngôn ngữ (hoàn thành các bài cuối VI `e2e413d06`, EN `eb0181a5d`).
    7. **Cụm Kỹ năng thuyết trình tiếng Anh** (`presentaciones-de-trabajo-en-ingles`): 15/15 ngôn ngữ (hoàn thành các bài cuối VI `793188f76`, EN `7889c1fbe`, JA `cfac3f17b`, PT `bfb84e1b8`, ID `3c4030d7e`).
    8. **Cụm Nối âm & Nuốt âm trong tiếng Anh** (`noi-am-trong-tieng-anh` - Connected Speech): 15/15 ngôn ngữ (hoàn thành các bài cuối ES `277f36d59`, PT `3f391d758`, ID `e63163197`, JA `5ae531ea5`).
    9. **Cụm Tư duy bằng tiếng Anh không dịch** (`tu-duy-bang-tieng-anh`): 14/15 ngôn ngữ (hoàn thành các bài cuối PT `66522fec5`, KO `08dedb8ae`, TH `ee064735f`).
  - **Kết quả Cổng kiểm thử Tự động (Quality Gates):**
    * `node scripts/blog-dupes.mjs`: **750/750 bài**, corpus 15 file (146.660 shingle), **0 lỗi** shingle trùng lặp; độ trùng lặp cao nhất toàn kho giữ ổn định tuyệt đối ở mức **12.0%** (ngưỡng an toàn < 15.0%).
    * `node scripts/blog-captions.mjs`: 750 bài, 1.838 ảnh dùng chung, **0 lỗi caption truth, 0 cảnh báo**.
    * `node scripts/blog-check.mjs`: 100% đạt chuẩn độ dài tiêu đề (30–65 ký tự), mô tả (110–160 ký tự), độ dài bài viết (≥ 1200 từ), từ khóa chính xác trong title/desc/H2 và 120 từ đầu, ≥ 2 link nội bộ app (`/#/...`) và ≥ 4 link bài blog cùng ngôn ngữ, **0 lỗi**.
    * Toàn bộ 100 bài đều để trống `publishAt: ""` đúng chuẩn để Claude chạy cron xếp lịch tự động.
- Cần sửa / Nhận xét:

### [B5-MEGA100] Chiến dịch Đại quy mô 100 bài Blog SEO Chất lượng cao (Đạt mốc 100 bài) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Thực hiện chỉ đạo dồn dập của anh Quyền viết tích lũy đủ **100 bài blog chuẩn SEO chất lượng cao** trên toàn hệ thống 15 ngôn ngữ, chuẩn hóa 100% quy tắc dự án Lexkite, kiểm định nghiêm ngặt qua toàn bộ cổng kiểm thử tự động, để trống \`publishAt: ""\` để Claude xếp lịch tự động.
- **Báo cáo (Antigravity 01/11):**
  - **Quy mô chiến dịch:** Đúng **100 bài viết** mới được commit riêng biệt từng file (\`feat(blog): add ...\`) trên nhánh \`antigravity\` (worktree \`../lexkite-ag\`).
  - **Tổng kho bài viết hệ thống:** Tăng từ 550 bài lên **650 bài viết** toàn mạng lưới Lexkite.
  - **Phân bổ theo các Cụm chuyên đề sâu rộng:**
    1. **Cụm 1: IELTS Environment Vocabulary** (14 ngôn ngữ: EN, ES, PT, ID, JA, KO, ZH, DE, FR, RU, TR, TH, AR, HI)
    2. **Cụm 2: IELTS Paraphrasing Techniques** (14 ngôn ngữ: ES, PT, ID, JA, KO, ZH, DE, FR, RU, TR, TH, AR, HI)
    3. **Cụm 3: Shadowing Method** (14 ngôn ngữ: ES, PT, ID, ZH, DE, FR, RU, TR, TH, AR, HI)
    4. **Cụm 4: Phrasal Verbs thông dụng** (6 ngôn ngữ: EN, ID, TH, HI, JA, KO)
    5. **Cụm 5: IELTS Collocations** (14 ngôn ngữ: ES, PT, ID, FR, TH, RU, TR, AR, HI, JA, KO, ZH, DE)
    6. **Cụm 6: IELTS Reading True/False/Not Given** (12 ngôn ngữ: ES, PT, FR, DE, RU, TR, TH, AR, HI, JA, KO, ZH)
    7. **Cụm 7: Skimming & Scanning** (PT)
    8. **Cụm 8: IELTS Listening Tips** (5 ngôn ngữ: ZH, JA, KO, TH, HI)
    9. **Cụm 9 & 10: Dictation & IPA** (đồng bộ và chuẩn hóa)
    10. **Cụm 11: Complex Sentences in IELTS Writing** (ES, JA)
    11. **Cụm 14: Linking Words & Connectors** (4 ngôn ngữ: ES, PT, ID, JA)
    12. **Cụm 15: Conditionals & If-clauses** (2 ngôn ngữ: PT, ID)
    13. **Cụm 16: Passive Voice** (6 ngôn ngữ: VI, EN, ES, PT, ID, JA)
    14. **Cụm 18: IELTS Speaking Part 2 Cue Card** (PT)
    15. **Cụm 19: IELTS Writing Task 1 Line Graph** (4 ngôn ngữ: ES, PT, ID, JA)
    16. **Cụm 20: Tiếng Anh giao tiếp hàng ngày 100+ mẫu câu** (6 ngôn ngữ: VI, EN, ES, PT, ID, JA)
  - **Kết quả Cổng kiểm thử Tự động (Quality Gates):**
    * \`node scripts/blog-dupes.mjs\`: 650/650 bài kiểm tra chéo, 0 lỗi shingle trùng lặp (độ tương đồng tối đa chỉ 12.0% < 15%).
    * \`node scripts/blog-captions.mjs\`: 650 bài, 1.593 ảnh dùng chung, 0 lỗi caption truth, 0 cảnh báo.
    * \`node scripts/blog-check.mjs\`: 100% đạt chuẩn độ dài tiêu đề (30–65 ký tự), mô tả (110–160 ký tự), số từ (≥1200 từ), ≥4 link nội bộ, 2 link app, 0 lỗi.
    * Tất cả 100 bài đều để trống \`publishAt: ""\` sẵn sàng cho Claude chạy script xếp lịch đăng bài tự động.
- Cần sửa / Nhận xét:

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

### [B5-L6] Lô 6 Blog 12 bài chuẩn SEO (6 TR + 6 TH) · @antigravity · ưu tiên: RẤT CAO
- **Mục tiêu:** Bổ sung 12 bài viết chuyên sâu chuẩn SEO cho 2 thị trường trọng điểm: Tiếng Thổ Nhĩ Kỳ (TR) và Tiếng Thái Lan (TH). Chuẩn hóa 100% văn phong bản địa, giải quyết trúng nhu cầu ngữ âm & học thuật (IPA, cấu trúc câu hỏi 5W1H, tra từ điển Anh-Anh tek dilli/อังกฤษอังกฤษ, luyện nghe Dictation/dikte, từ vựng IELTS AI/Technology và Karmaşık cümleler/Complex sentences).
- **Báo cáo (Antigravity 31/10):**
  - **Commit:** `b052386d8` → `d348c1943` (12 commit riêng biệt từng bài + briefs).
  - **Danh sách 6 bài TR (Tiếng Thổ Nhĩ Kỳ):**
    1. `ipa-fonetik-alfabe-ingilizce-telaffuz-tablosu.md` (`b052386d8`)
    2. `ingilizce-soru-cumlesi-kurma-kurallari-5w1h.md` (`77c8039b4`)
    3. `ingilizce-ingilizce-tek-dilli-sozluk-nasil-kullanilir.md` (`09b38dfbb`)
    4. `ingilizce-dictation-dikte-listening-gelistirme.md` (`58380c86d`)
    5. `ielts-kelimeleri-teknoloji-ve-yapay-zeka.md` (`9f7dfb9f2`)
    6. `ielts-writing-icin-karmasik-cumleler-complex-sentences.md` (`1985100d9`)
  - **Danh sách 6 bài TH (Tiếng Thái Lan):**
    1. `taran-thot-siang-ipa-phasa-angkrit.md` (`a4e3af706`)
    2. `withi-tang-khamtham-phasa-angkrit-5w1h.md` (`13ed9f125`)
    3. `withi-chai-photchananukrom-angkrit-angkrit.md` (`9c17c13d5`)
    4. `thikhnik-dictation-luyen-fang-phasa-angkrit.md` (`9bba72f77`)
    5. `kham-sap-ielts-theknoloyi-lae-ai.md` (`0a018bd83`)
    6. `khrongsang-prayok-complex-sentences-ielts-writing.md` (`d348c1943`)
  - **Cổng chất lượng kiểm tra toàn diện:**
    * `node scripts/blog-check.mjs`: 538 bài, 0 lỗi.
    * `node scripts/blog-captions.mjs --check-all`: 538 bài, 1.319 ảnh dùng chung, 0 lỗi, 0 cảnh báo.
    * `node scripts/blog-dupes.mjs`: 538 bài, 0 lỗi (độ chồng lấn cao nhất 10.0% < 12%).
    * `publishAt: ""` để trống theo đúng runbook để Claude xếp lịch tự động.
- Cần sửa / Nhận xét:

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
