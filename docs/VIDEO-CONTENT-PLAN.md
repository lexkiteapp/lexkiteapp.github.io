# Kế hoạch khai thác nhân vật & video (học + viral) – chuẩn thị trường Mỹ

Đi kèm `docs/VIDEO-PIPELINE.md` (kỹ thuật dựng). File này = **dùng gì, làm video gì, đăng thế nào để kéo người dùng**. Danh sách tài nguyên máy đọc được: `content/video/assets.json`.

## 1. Dàn nhân vật (chuẩn Mỹ, giọng Mỹ)
| | Mia | Leo | Ama | Kit |
|---|---|---|---|---|
| Vai | NV marketing ở New York, người Mỹ gốc Á, 24 | đồng nghiệp ở Austin, 28, mê thành ngữ | sinh viên người Mỹ gốc Phi, 19, luyện thi | linh vật (`web/js/kit.js`, không vẽ lại) |
| Tính cách | tỉnh bơ, châm biếm, hay "đứng hình" trước tiếng Anh công sở | nhiệt tình quá đà, giải thích bằng ví dụ đời thường | tò mò, hỏi "tại sao", hay đố lại | chốt mẹo nhớ |
| Giọng Kokoro | `af_heart` | `am_michael` | `af_bella` | hiệu ứng ngắn |
| Câu cửa miệng | "Cool. Cool cool cool." | "Here's the thing…" | "Wait, why though?" | — |

## 2. Bộ tài nguyên nhân vật (mỗi nhân vật, tạo từ ảnh ADN làm tham chiếu)
- **Góc nhìn (3)**: chính diện, ¾ trái, nghiêng phải.
- **Biểu cảm (12)**: vui, cười lớn, cười gượng, ngạc nhiên, sốc, suy nghĩ, bối rối, tự hào, buồn, ngán ngẩm (eye-roll), hào hứng, "đứng hình".
- **Cử chỉ (10)**: vẫy tay, chỉ sang phải, chỉ vào người xem, giơ ngón cái, khoanh tay, ôm đầu, vỗ tay, nhún vai, cầm điện thoại, cầm cốc cà phê.
- **Trang phục theo bối cảnh (3)**: công sở, đời thường, sự kiện/du lịch.
- **Cặp đôi (8 cảnh)**: Mia–Leo họp, Mia–Leo cà phê, Ama–Mia học nhóm, Ama hỏi Leo, 3 người họp online, ăn trưa, ăn mừng, "đánh nhau" bằng gối (meme).
- Ngân sách: ~3 nhân vật × (3 + 12 + 10 + 3) × ~3 lần thử = ~250 ảnh + 8 cảnh cặp × 6 = ~50 ảnh.

## 3. Bối cảnh (40, không người – nhân vật ghép vào sau)
| Nhóm | Bối cảnh |
|---|---|
| Công sở (12) | bàn làm việc mở (open office), phòng họp kính, họp online (màn hình laptop), pantry/cà phê công ty, thang máy, quầy lễ tân, phòng phỏng vấn, văn phòng sếp, sân thượng làm việc, coworking, phòng thuyết trình, bãi đậu xe công ty |
| Học tập & thi (8) | phòng thi IELTS/TOEFL, thư viện đại học, phòng ký túc xá, giảng đường, quán cà phê học bài đêm, bàn học có đèn, phòng chờ thi, sân trường |
| Đời sống Mỹ (12) | quán cà phê kiểu Mỹ (đặt đồ uống), siêu thị, diner, food truck, căn hộ New York, công viên Central-Park-style, tàu điện ngầm, taxi/Uber, phòng khám, ngân hàng, tiệm cắt tóc, phòng gym |
| Du lịch (5) | sân bay quầy check-in, cửa an ninh sân bay, khách sạn quầy lễ tân, nhà hàng sang, ga tàu |
| Nền thương hiệu (3) | nền gradient cam–teal cho intro/outro, nền "bảng đen" học từ, nền quiz |
- Mỗi bối cảnh: 1 bản 9:16 + 1 bản 16:9; cùng giờ ánh sáng ban ngày, phong cách đồng nhất với nhân vật (tham chiếu phong cách = ảnh ADN). Ngân sách ~40 × 2 × 2 lần thử ≈ 160 ảnh.
- **Dự phòng**: ~400 ảnh cho biến thể theo mùa (Halloween, Thanksgiving, Giáng sinh, mùa thi) và cảnh theo xu hướng.

## 4. Các dòng video (tận dụng tối đa)
### A. Video học (YouTube 16:9 + nhúng vào app)
| Series | Nội dung | Nguồn trong app |
|---|---|---|
| **Office English 101** | 1 tình huống công sở / tập, 8–10 cụm, roleplay mẫu | `#/roleplay`, chủ đề office-email |
| **IELTS Speaking Band 7+** | Ama luyện Part 1/2/3, Leo sửa câu "band 6 → band 8" | `#/speaking`, bài mẫu band |
| **Grammar in 60s** | 1 điểm ngữ pháp, ví dụ hài | 77 chủ đề ngữ pháp |
| **Word Story** | nguồn gốc từ + mẹo nhớ của Kit | ghi chú học từ (`notes`) |
| **TOEIC Part 5 Speedrun** | 5 câu trong 60 giây, giải nhanh | đề TOEIC |
| **Pronunciation Fix** | 1 âm khó (th, r/l, -ed) | `#/pron` |
### B. Video viral (Shorts / Reels / TikTok 9:16, 20–40 giây)
| Format | Ví dụ hook (≤ 2 giây) |
|---|---|
| **"Don't say… Say…"** | "Stop saying 'I'm agree' in meetings." |
| **POV công sở** | "POV: your boss says 'Let's circle back'." (Mia đứng hình) |
| **Native vs. textbook** | "Textbook: 'How are you?' Real Americans: …" |
| **Thành ngữ đời thường** | "Leo explains 'spill the tea' (badly)." |
| **Đố nhanh 3 giây** | "90% get this wrong: affect or effect?" |
| **Mia's cringe moments** | lỗi tiếng Anh ngượng ngùng → cách sửa |
| **Ama asks why** | "Why is it 'an hour' but 'a university'?" |
| **Trend remix** | bắt trend âm thanh/meme đang nổi (chỉ âm thanh có bản quyền hợp lệ) |
### C. Video kéo người dùng
- Cuối mỗi video: Kit + "Practice this free on lexkite.com" + QR (khổ dọc).
- Nút ghim / mô tả: link trực tiếp tới đúng bài trong app (`/#/topic/...`).
- Chuỗi "30 ngày tiếng Anh công sở" → người xem lưu playlist, quay lại hằng ngày.
- Thử thách (challenge): "Duet với Mia, nói lại câu này" → nội dung do người dùng tạo.

## 5. Lịch đăng & đo lường
- Mỗi ngày: 1 Short (rải TikTok, Reels, Shorts, Facebook Reels). Mỗi tuần: 1 bài học dài YouTube + 1 video tổng hợp.
- Giờ đăng theo giờ Mỹ (EST 7–9h, 12h, 19–21h) – thị trường chuẩn.
- Chỉ số: tỉ lệ xem hết, lượt lưu, lượt nhấp link, người dùng mới từ nguồn video (`/api/hit` ref). Tuần nào format nào thắng → tăng tỉ trọng format đó trong hàng đợi.

## 6. Quy tắc nội dung video
- Tiếng Anh Mỹ chuẩn, tự nhiên; không bịa số liệu ("90% get this wrong" chỉ dùng khi là câu đố, không ghi như thống kê thật – đổi thành "Most learners…").
- Không nêu tên / chê thương hiệu đối thủ; không dùng nhạc, ảnh, meme có bản quyền.
- Nhân vật chỉ lấy từ `brand/characters/` (ảnh ADN + bộ tài nguyên); Kit chỉ từ `web/js/kit.js`.
