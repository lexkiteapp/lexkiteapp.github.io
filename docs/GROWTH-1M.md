# Kế hoạch 1 triệu người dùng – 24/11/2026 → 23/02/2027

Một nguồn duy nhất cho mục tiêu này. SEO chi tiết: docs/SEO-GROWTH-PLAN.md. Video: docs/VIDEO.md. File này chỉ giữ **con số, kênh, người phụ trách, mốc tuần**. Điều phối đọc file này mỗi nhịp.

## 1. Định nghĩa và phép tính

- **1 người dùng** = 1 người thật (loại bot nhà mình: `bot` rỗng) có ≥1 phiên ≥10 s trên web/app/add-on. Đếm luỹ kế, không trùng thiết bị (`uid` hoặc `lk_id`).
- **Điểm xuất phát (22/11):** Google 89 lượt bấm/28 ngày, index 1,2 % trang mẫu. Social và app mới vài trăm người/ngày. Nghĩa là phải tăng khoảng ×100 trong 90 ngày.
- **Đường cong cần đạt** (luỹ kế / số người mới mỗi ngày ở cuối mốc):

| Mốc | Ngày | Luỹ kế | Người mới/ngày |
|---|---|---|---|
| T1 | 23/12 | 60k | 4k |
| T2 | 23/01 | 300k | 12k |
| T3 | 23/02 | 1M | 35k |

- **Chia theo nguồn ở cuối T3 (35k/ngày):**

| Nguồn | /ngày | Vì sao đạt được |
|---|---|---|
| Video ngắn (TikTok, Reels, Shorts, 15 kênh) | 12k | Cần 3–5 clip lan rộng/tuần (≥500k view). Tỉ lệ bấm link 0,3 %. |
| Vòng lan truyền trong app (thẻ điểm, thách đấu, mời bạn) | 8k | Hệ số K ≥ 0,4 trên lượng người mới từ các nguồn khác |
| SEO (từ điển 15 ngôn ngữ, công cụ IELTS, chia động từ) | 7k | Index 1,2 % → ≥40 %; 30k trang có giá trị × 0,25 lượt bấm/ngày |
| Cửa hàng (ASO App Store, Play) | 4k | Từ khoá, ảnh chụp, đánh giá ≥4,6; lượt cài tự nhiên sinh từ social |
| Add-on (Chrome, Edge) | 2k | Trang CWS, Featured, xếp hạng tìm "dictionary" |
| YouTube dài, cộng đồng, backlink | 2k | 3 video dài/tuần trên kênh chính; diễn đàn, nhóm học tiếng Anh |

**Nói thẳng:** với $0 và SEO gần như bắt đầu từ 0, 1M trong 3 tháng chỉ đạt khi video ngắn bùng nổ thật. Google cần 2–4 tháng mới tin site mới, nên SEO đóng góp nhiều nhất ở T3 và các tháng sau. Vì vậy kế hoạch dồn sức vào **video lan truyền + vòng chia sẻ trong app** từ tuần 1, còn SEO là nền tăng đều. Nếu đến mốc tuần 4 đạt dưới 30 % đường cong, điều phối chuyển thêm sức sang kênh nào đang có số tốt nhất (đo bằng UTM), không dàn đều nữa.

## 2. Nội dung social – kênh có thể nổ nhanh nhất

**Nguyên tắc chung:** giáo viên 2D bản xứ (Ama, Carlos), tiếng Anh chuẩn, ≤150 từ/phút, gán nhãn AI, không câu tương tác giả, không tiêu đề lừa. Mỗi kênh có lời dẫn và ví dụ riêng để giữ điều kiện bật kiếm tiền. Giữ toàn bộ cổng QC.

**Năm loạt chủ lực** (mỗi loạt là một khuôn có thể sinh hàng loạt từ các mô-đun footage):
1. **"Người Việt/Nhật/Tây Ban Nha… hay nói sai"**: 1 lỗi trong 15 giây, sửa bằng câu bản xứ. Loạt dễ lan nhất vì người xem tự nhận ra mình.
2. **Đoán nghĩa 3 giây**: hình, từ ẩn, đếm ngược, đáp án. Người xem bình luận trước khi đáp án hiện ra, giúp thuật toán đẩy clip.
3. **Một tình huống, 3 cấp độ**: gọi cà phê ở A1/B1/C1. Dùng cảnh quán cà phê và sân bay đã có sẵn.
4. **IELTS 60 giây**: một mẹo Speaking hoặc Writing, đổi band trước và sau. Nhóm khán giả CPM cao.
5. **Thử thách thẻ điểm**: "Mình được 82/100, bạn thử đi". Mã QR hoặc link dẫn thẳng về bài thử của app, tạo vòng lan truyền.

**Nhịp đăng:**
- 15 kênh × 1 clip/ngày (đang chạy, không được để trống ngày nào).
- Thêm: 3 kênh có số tốt nhất tuần trước được **3 clip/ngày**, chọn lại mỗi thứ Hai.
- YouTube dài: 3 video/tuần trên kênh chính, dựng từ 7 Shorts cùng chủ đề cộng phần giảng thêm.
- Mọi link có UTM và trỏ về `/go/<lang>`. Bình luận ghim mời làm bài thử 2 phút.

**Pipeline v3 (anh yêu cầu 24/11, video hiện còn kém):** kiểm 20 video đã đăng theo MEDIA-QA-RUBRIC rồi dựng một engine duy nhất: motion graphics bằng code (HTML/SVG theo token Stitch, Playwright, ffmpeg), chữ động khớp mốc thời gian từng từ của Kokoro, nhân vật 2D có cử chỉ theo nhịp câu, hook ≤1,5 s, vùng an toàn cho mọi khổ. Cổng QC tự động: agent đọc ảnh khung và chấm, dưới 90 điểm thì không đăng. Mọi loạt cũ dồn về engine này, mỗi loạt chỉ là một tệp spec. Phụ trách: clip-viral.
Cách làm tiết kiệm token: mỗi loạt viết một bộ kịch bản gốc theo schema rồi bản địa hoá 15 ngôn ngữ qua pipeline i18n. Làm một lần 5–6 template theo token Stitch, khoá thiết kế lại. CI ghép spec × ngôn ngữ × template rồi render, không tốn token. Cổng số tự động kiểm mọi video. Agent chỉ chấm mẫu bằng mắt: video đầu của mỗi template × ngôn ngữ, sau đó 1/20.

**Vòng cải tiến hằng tuần:** lấy số view, tỉ lệ xem hết và lượt bấm từng clip. Loạt nào nằm trong 20 % đầu thì nhân thêm biến thể. 30 % cuối thì sửa đoạn mở đầu hoặc bỏ khuôn đó. Biến thể sinh từ các trục có sẵn (cảnh, góc, phần chèn, giáo viên), không quay lại từ đầu.

## 3. SEO – nền tăng trưởng bền

Chi tiết từng việc nằm trong SEO-GROWTH-PLAN.md. Ưu tiên trong 90 ngày:
1. **Index 1,2 % → 40 %** (T1–T2): bỏ khỏi sitemap các trang mỏng (noindex, không xoá nội dung). Liên kết nội bộ từ trang chủ đề (hub) xuống từ. Làm giàu nghĩa theo lô 20 từ, có chấm độc lập ≥90.
2. **Trang chủ đề × 13 ngôn ngữ**: màn Stitch vocab-hub và vocab-set đã khoá.
3. **Công cụ miễn phí kéo backlink tự nhiên**: máy tính band IELTS, chấm Writing Task 2, bảng chia 300 động từ × 15 ngôn ngữ. Công cụ được trích dẫn nhiều hơn bài viết.
4. **Thị trường CPM cao**: en, de, fr, ja, ko ưu tiên trước. Vẫn giữ nguyên tiếng Việt.
5. **Vòng hằng tuần (thứ Hai)**: đo GSC theo ngôn ngữ. Trang CTR thấp → sửa tiêu đề và mô tả. Trang ở vị trí 8–20 → bổ sung nội dung và liên kết.
6. **Backlink miễn phí**: danh bạ công cụ học, trang tài nguyên giáo dục, Product Hunt/AlternativeTo. Việc dán link anh làm theo danh sách có sẵn.

KPI SEO: index 10 % (T1) → 25 % (T2) → 40 % (T3); lượt bấm Google/ngày 150 → 1,5k → 7k.

## 4. Chất lượng app/web – giữ được người đã kéo về

Người dùng ở lại thì 1M mới có nghĩa, và mới tạo vòng mời bạn.
- **Kích hoạt:** người mới làm xong bài đầu tiên trong ≤90 s. Onboarding 3–4 bước rồi vào Today, không ép đăng ký.
- **Giữ chân:** D1 ≥40 %, D7 ≥20 % (phiên retention đang đo và sửa). Chuỗi ngày học, nhắc nhở theo chuẩn app lớn, có giờ yên tĩnh.
- **Lan truyền:** thẻ điểm đẹp để chia sẻ, thách đấu bạn bè, mời bạn được thưởng huy hiệu hoặc tính năng (không thưởng tiền). Đo hệ số K theo tuần.
- **Tốc độ:** LCP mobile ≤2,5 s trên các trang người mới đáp xuống (`/go`, trang từ, trang chủ đề). Đây là trang nhận traffic social và SEO.
- **Nội dung:** điểm nội dung bài học ≥95 (SCORE.md), ảnh từ vựng ≥95 %, truyện và podcast theo cấp, IELTS B1–B10. Người học phải nói và viết được thật sau 3–6 tháng.
- **Ngôn ngữ:** es, fr, ja, ko lên live đủ khoá. Mỗi ngôn ngữ mới mở thêm một thị trường social và SEO.

## 5. Người phụ trách (một người viết cho mỗi mảng)

| Mảng | Phiên |
|---|---|
| Video ngắn: 5 loạt, nhân biến thể, chọn top kênh | clip-viral local_0fa6f7d1 + video-daily local_b0303ea1 |
| Lịch đăng 15 kênh, YouTube dài | video-daily local_b0303ea1 |
| SEO, index, trang chủ đề, công cụ | seo-growth local_8c15f1e4 |
| Kích hoạt, giữ chân, vòng chia sẻ, hệ số K | retention local_9c9ab0b5 |
| Tốc độ trang đáp | lcp local_82800161 |
| Nội dung, ảnh, IELTS | content-95 local_e0a99ca4 |
| Đo lường: bảng 1M trong admin (nguồn × ngày, luỹ kế, so với đường cong) | admin local_3b1d8daf |
| Điều phối, mốc tuần, dồn sức sang kênh tốt | coordinator (phiên này) |

## 6. Đo lường và nhịp

- **Bảng 1M trong admin**: người mới/ngày theo nguồn (UTM, referrer, cửa hàng), luỹ kế, đường cong mục tiêu, D1/D7, hệ số K. Số lấy từ D1 `sessions` + ext_events, loại bot nhà mình.
- **Thứ Hai hằng tuần**: điều phối ghi một dòng vào §7 (thực tế so với mục tiêu, kênh tốt nhất, quyết định dồn sức).
- **Cổng chặn tuần 4 (21/12)**: dưới 30 % đường cong → dồn sức như ở §1. Trên 100 % → nâng mục tiêu.
- **Luật chống xung đột và chống nặng (anh nhắc 23/11):**
  - **Một mảng file, một người viết:** bảng §5 là danh sách chủ sở hữu. Muốn sửa file của mảng khác thì nhắn người chủ mảng đó, không tự sửa. Việc trùng nhau thì dùng chung code có sẵn, không viết lại.
  - **Không làm web nặng thêm:** tính năng tăng trưởng mới (thẻ điểm, thách đấu, mời bạn, bảng 1M) phải tải lười (lazy) và không cộng byte vào lần tải đầu. Lần tải đầu phải qua size-budget, giữ LCP ≤2,5 s và TBT <200 ms. Không nới ngưỡng nào.
  - **Logic chuẩn top 1:** mỗi lỗi sửa đến nguyên nhân gốc và có test. Kiểm tra trường hợp biên: offline, nhiều thiết bị, nhiều tab, 15 ngôn ngữ. Không để lỗi ngầm. Đạt chuẩn UI/UX của app lớn.
- Mọi việc vẫn theo luật cũ: $0, nhẹ, không cắt tính năng, CI xanh, tiếp tục đóng băng PR mới cho tới khi số PR mở < 20.

## 7. Nhật ký tuần

| Tuần | Luỹ kế thật | Mục tiêu | Người mới/ngày | Kênh tốt nhất | Quyết định |
|---|---|---|---|---|---|
| 0 (23/11) | đo trong tuần 1 | 0 | ~vài trăm | – | Lập kế hoạch, giao việc |
