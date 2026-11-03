# COMPETITOR-UPLIFT – học từ 4You + 10 app lớn, chỉ lấy cơ chế có bằng chứng và chạy $0

> TL;DR: 9 hạng mục xếp theo giá trị ÷ công sức, lấy từ 4You (12 ảnh chủ gửi 2/11) và Duolingo, Babbel, Busuu, Memrise, LingQ, Language Reactor, Speak, Praktika, Elsa, Cake. Mỗi hạng mục ghi nguồn, cái mình đã có, phần thiếu, chi phí $0 và cách đo. Mỗi hạng mục là một PR nhỏ, có test hồi quy, đủ 15 ngôn ngữ, giao diện Stitch, nhân vật 2D. PR code chỉ mở khi repo còn ≤ 15 PR mở (finish-before-start).
> Đọc khi: chọn việc sản phẩm "học đối thủ"; trước khi mở PR cho một hạng mục bên dưới.

**Luật lọc.** Chỉ giữ cơ chế có bằng chứng (thí nghiệm A/B công bố, nghiên cứu, hoặc tính năng lõi của app dẫn đầu mảng đó) và chạy được miễn phí: trên máy người học, CI, hoặc trong hạn mức D1 hiện có. Đã loại:
- Gia sư người thật, như Busuu Live hay cộng đồng chấm bài: tốn người.
- Kho clip phim/MV có bản quyền kiểu Cake: tốn tiền và rủi ro pháp lý.
- Cược chuỗi 2 ngày: Duolingo đã bỏ vì hiệu quả gần 0.
- Bài "chỉ 1 câu": Duolingo thử không tăng DAU.

Không làm trùng các PR đang mở: #325/#344 (học qua video), #323 (truyện/podcast), #315 (lộ trình v3), #311/#438 (Call), #427/#430 (learnability), #453 (nhắc học), #284 (Hôm nay).

## Lexkite đã có (không làm lại)

| Cơ chế đối thủ | Ở lexkite |
|---|---|
| Streak + đóng băng (Duolingo) | `app.js` activeDays/freezeInfo, rã băng `retention.js` |
| Chuỗi tách khỏi mục tiêu ngày: D14 +3,3 %, DAU +1 % ([Duolingo](https://blog.duolingo.com/improving-the-streak)) | Có sẵn: mọi hoạt động > 0 đều giữ chuỗi; 3 vòng mục tiêu riêng |
| SRS (Babbel Review, Speak) | FSRS theo người |
| Giải đấu, nhiệm vụ ngày, XP, huy hiệu | `league.js`, `game.js` |
| Ôn lỗi sai (Duolingo Practice Hub) | `#/mistakes` |
| Chấm phát âm, shadowing (Elsa, Cake, Memrise) | `pron/`, `say.js`, chế độ Shadowing trong #325 |
| Hội thoại AI nhập vai (Speak, Praktika) | Call Ama/Carlos, `roleplay.js` |
| Nghe chép, transcript mờ bấm mới hiện (4You) | `listening.js` (`.blur`, bấm dòng nghe lại) |
| Video + transcript + 4 chế độ + thẻ tra (4You, LR) | #325/#344 |
| Tô màu từ đã biết trên phụ đề YouTube (LR) | `extension/content.js` (`.ytp-caption-segment .vbw.known`) |
| Thẻ "Tiếp tục học" | `vb.lastActivity` trong `app.js`, #284 |
| Lộ trình theo band, nhảy cóc | `speaking.js`, #315 |
| Không quảng cáo trong bài (điểm yếu của 4You) | `docs/ADS.md`: danh sách cho phép, deny-by-default, 30 route |

## Hạng mục (giá trị ÷ công sức, cao → thấp)

### 1. Thử thách 7 ngày (cược chuỗi) + bảo vệ cuối tuần
- **Nguồn:** Duolingo Streak Wager làm D1, D7 và D14 tăng có ý nghĩa, D7 +14 %. Weekend Amulet giúp người học giữ nhịp đều thay vì học dồn; Duolingo ghi nhận người học dồn bỏ app nhiều hơn ([blog](https://blog.duolingo.com/improving-the-streak)).
- **Đã có:** chuỗi, đóng băng, XP, mốc chuỗi, cờ `ret`.
- **Thiếu:**
  - Người học đặt cọc XP, giữ đủ 7 ngày thì nhận gấp đôi.
  - Chọn "nghỉ cuối tuần" mỗi tuần một lần.
  - Màn giáo viên 2D chúc mừng hoặc an ủi.
- **$0:** chạy trên máy và đồng bộ qua state sẵn có.
- **Đo:** `ext_events` `ret:wager_on|off_d7` so với nhóm đối chứng `rb` (RETENTION.md §5). Đích D7 +5 % tương đối.
- **PR:** 1 PR, gồm `retention.js`/`game.js`, test thuần (đủ 7 ngày, lỡ ngày, đóng băng, đổi múi giờ) và 1 màn Stitch.

### 2. Huy hiệu "vừa sức": bạn biết ~96 % từ
- **Nguồn:**
  - LingQ hiện % từ mới trên mỗi bài.
  - Nghiên cứu: đọc cần độ phủ từ 95–98 % (Laufer 1989; Hu & Nation 2000; Schmitt 2011); nghe và xem phim cần ~95 % (van Zeeland & Schmitt 2013; Durbahn 2020) ([tổng quan](https://nflrc.hawaii.edu/rfl/item-detail/654)).
  - 4You chỉ có nhãn CEFR cứng.
- **Đã có:** FSRS (từ đã học), dấu Đã biết/Học trong lõi truyện (#323), nhãn CEFR, danh sách tần suất (`lib/ngsl.js`).
- **Thiếu:** hàm thuần dùng chung `coverage(tokens, known)`. Hàm tính theo lượt xuất hiện của từ, không theo từ duy nhất, vì LingQ tính theo từ duy nhất nên lệch. Phần thiếu còn lại:
  - Chip trên thẻ video, truyện, bài đọc, kèm nhãn loại bài (Hội thoại / Độc thoại / Tin nhắn thoại / Thông báo).
  - Bộ lọc và cách xếp "Vừa sức" (95–98 %).
- **$0:** chạy trên máy.
- **Đo:**
  - Tỉ lệ học hết bài và điểm câu hỏi theo khoảng độ phủ.
  - Đích: bài mở từ "Vừa sức" có tỉ lệ hoàn thành cao hơn ≥ 10 % so với bài mở ngẫu nhiên.
- **PR:** chờ #323 và #325 gộp. 1 PR lõi + test (bảng mẫu tay, lượt ngẫu nhiên giữ bất biến 0–100 %), 1 PR giao diện.

### 3. Add-on YouTube: phụ đề song ngữ + tự dừng sau mỗi câu
- **Nguồn:** Language Reactor, extension học ngôn ngữ phổ biến nhất trên YouTube/Netflix. Lõi của nó: phụ đề kép, tự dừng sau mỗi câu, lặp câu, tua về câu trước, lưu từ kèm câu ([JALT](https://jalt-publications.org/articles/28605-enhancing-functionality-youtube-and-netflix-language-reactor)). Lưu từ là tính năng trả phí ở LR; lexkite cho miễn phí.
- **Đã có:** add-on đã tô từ đã biết trên phụ đề YouTube, tra từ bằng popup, lưu vào SRS.
- **Thiếu:**
  - Dòng dịch thứ hai, lấy từ track dịch của chính YouTube.
  - Tự dừng sau mỗi câu, phím A/D về câu trước/sau, lặp câu.
  - Lưu từ kèm câu và mốc thời gian, bấm để mở lại đúng đoạn.
- **$0:** không thêm quyền, giữ `permissions.lock`/CWS-RULES.
- **Đo:**
  - Số từ lưu trên mỗi giờ xem.
  - Tỉ lệ người dùng add-on mở app trong 7 ngày (`/api/hit`).
  - `ext-e2e` thêm hành trình YouTube giả lập.
- **PR:** 1–2 PR trong `extension/content.js` (popup đã có, không cần Stitch mới).

### 4. Trình phát: tự dừng, lùi 5 giây, tốc độ, màu người nói, bài nghe 2 bước
- **Nguồn:**
  - 4You: thanh tiến độ tô theo người nói, 1x, lùi 5 giây, bước Câu hỏi → Nghe chép (cả câu hoặc điền từ).
  - Language Reactor: tự dừng sau mỗi câu.
- **Đã có:** #325 có lặp câu, Live, điền từ, chính tả, shadowing; `listening.js` có transcript mờ.
- **Thiếu:**
  - Nút tự dừng sau câu, nút −5 s, tốc độ 0,75/1/1,25.
  - Đoạn trên thanh tiến độ tô màu theo Ama/Carlos.
  - Bước "nghe ý chính trước" (1–2 câu hỏi) rồi mới đến nghe chép.
- **$0:** chạy trên máy.
- **Đo:** điểm chính tả lần 2 so với lần 1, và tỉ lệ học hết clip. Đích: hoàn thành +5 %.
- **PR:** chờ #344 gộp. 1 PR, theo màn Stitch của #344.

### 5. Độ khó thích ứng (Birdbrain-lite)
- **Nguồn:** Duolingo Birdbrain ước lượng song song năng lực người học và độ khó từng bài tập. Theo Duolingo, A/B cho thấy người học học được nhiều hơn và quay lại nhiều hơn; hơn 20 % bài đã được cá nhân hoá ([blog](https://blog.duolingo.com/learning-how-to-help-you-learn-introducing-birdbrain), [IEEE](https://spectrum.ieee.org/duolingo)).
- **Đã có:** xếp lớp, FSRS, thước đo dễ học (#427).
- **Thiếu:**
  - Elo trên máy: θ người học theo kỹ năng, b theo từng câu.
  - Engine chọn câu cho xác suất đúng ~80 %.
  - Độ khó từng câu gom ẩn danh lên D1 theo lô ngày (vài trăm dòng).
- **$0:** trên máy, cộng D1 trong hạn mức.
- **Đo:**
  - Tỉ lệ đúng tiến về 75–85 %.
  - Tỉ lệ học hết bài và D7 theo cờ A/B.
- **PR:** 1 PR lõi + test mô phỏng 1 000 người ảo. Hỏi chủ #427/#430 trước để không chồng file.

### 6. Nhiệm vụ đôi bạn (Friends Quest)
- **Nguồn:** Duolingo báo cáo Friends Quest và bảng xếp hạng giúp người học quay lại thường xuyên hơn; hơn nửa DAU theo dõi ít nhất một bạn ([SEC 8-K Q3/2024](https://www.sec.gov/Archives/edgar/data/1562088/000156208824000248/q3fy24duolingo09-30x24shar.htm)). Đây là số liệu công ty, chưa có nghiên cứu độc lập.
- **Đã có:** giải đấu, nhiệm vụ ngày, đăng nhập, đồng bộ.
- **Thiếu:**
  - Ghép đôi qua link mời, mục tiêu XP chung trong tuần.
  - Thẻ tiến độ hai người với Ama/Carlos.
  - Nút "chọc" bạn, gửi qua push sẵn có của #453.
- **$0:** 1 bảng D1 nhỏ, đi qua `_d1guard`/`_quota`.
- **Đo:** D7/D30 của người có cặp so với người chưa có; tỉ lệ nhận lời mời.
- **PR:** 2 PR (API + test bảo mật; giao diện Stitch).

### 7. Học → Luyện → Dùng (khép vòng bài học bằng Call)
- **Nguồn:** Speak chia mỗi bài làm 3 bước: học cụm từ, luyện phát âm, rồi dùng trong hội thoại mô phỏng. Praktika xây quanh nhập vai với nhân vật.
- **Đã có:** bài học, chấm phát âm, Call/roleplay.
- **Thiếu:**
  - Cuối mỗi chương có thẻ "Dùng ngay: gọi Ama 2 phút".
  - Kịch bản Call bắt buộc dùng đúng cụm từ của chương.
  - Chấm số cụm từ đã dùng.
- **$0:** dùng engine Call sẵn có, AI free pool.
- **Đo:** tỉ lệ cụm từ được dùng lại; điểm nhớ cụm từ ở lần ôn FSRS sau.
- **PR:** chờ #438 (Call v2) gộp. 1 PR.

### 8. Một câu bản xứ mỗi ngày trên Hôm nay
- **Nguồn:** Cake đăng cụm diễn đạt mới mỗi ngày qua clip ngắn kèm shadowing chấm điểm. Memrise Immerse/Learn with Locals cho người bản xứ nói, kèm bài nhép môi ([TechRound](https://techround.co.uk/news/memrise-launches-immerse-feature-for-more-effective-language-learning/)).
- **Đã có:** clip Teach2D (#412), giọng Kokoro, chấm `UI.recognize`, trang Hôm nay (#284).
- **Thiếu:**
  - Thẻ "Câu hôm nay": clip 2D 10–15 s → nói theo → chấm → lưu SRS.
  - Đọc theo lịch từ kho clip đã đạt QC.
- **$0:** kho clip có sẵn trên CI.
- **Đo:** tỉ lệ mở thẻ; tỉ lệ đến bài chính sau khi xem thẻ.
- **PR:** chờ #284 gộp. 1 PR.

### 9. Quảng cáo an toàn (tránh điểm yếu của 4You)
- **Nguồn:** 4You có banner dày, quảng cáo sàn crypto (OKX), che nội dung. Đây là phản mẫu.
- **Đã có:** danh sách route cho phép, không quảng cáo trong bài học, ô cố định chống CLS.
- **Thiếu:**
  - AdMob `maxAdContentRating` G/PG trong code.
  - Test CI: ô quảng cáo không bao giờ đè nội dung hay nút CTA ở 360/390/412 px, mỗi màn tối đa 1 ô.
  - Danh sách danh mục nhạy cảm cần chặn (cờ bạc, crypto, hẹn hò…) ghi vào `owner-pending`, vì chỉ chủ bấm được trong AdSense/AdMob.
- **$0.**
- **Đo:** test mobile-qa xanh; tỉ lệ bấm nhầm và tố cáo quảng cáo (ads-report).
- **PR:** 1 PR nhỏ, nằm trong mảng ads.

## Thứ tự làm và số PR

| Thứ tự | Hạng mục | Phụ thuộc | PR dự kiến |
|---|---|---|---|
| 1 | Thử thách 7 ngày | – | 1 |
| 2 | Quảng cáo an toàn | – | 1 |
| 3 | Add-on YouTube song ngữ | – | 1–2 |
| 4 | Độ khó thích ứng | hỏi #427/#430 | 1 |
| 5 | Vừa sức | #323, #325 | 2 |
| 6 | Trình phát | #344 | 1 |
| 7 | Đôi bạn | – | 2 |
| 8 | Câu hôm nay | #284 | 1 |
| 9 | Học → Luyện → Dùng | #438 | 1 |

Tổng 11–12 PR code, cộng PR tài liệu này. Thứ tự làm khác thứ tự giá trị: hạng mục không phụ thuộc PR khác làm trước.

**Mỗi PR:**
- Test hồi quy đi vào `scripts/test/suite.txt`.
- i18n đủ 15 ngôn ngữ theo `docs/I18N-PIPELINE.md`; nhãn ngắn để trong `i18n-fixed.json`.
- Màn mới vẽ bằng Stitch theo khung §5d, có nút Thoát; giáo viên Ama/Carlos 2D.
- Không cắt tính năng sẵn có.
