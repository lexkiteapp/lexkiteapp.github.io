# Kế hoạch dùng 19.500 credit Kling (tài khoản mới) – kho nhân vật & video Lexkite

Mục tiêu: mỗi credit thành **tài nguyên dùng lại vĩnh viễn** cho bộ sinh video (40+ khuôn × biến thể), Call Mia và app. Chỉ nhận tài nguyên ≥ 90 điểm (`docs/MEDIA-QA-RUBRIC.md` + cổng `library.mjs check`). Giá tham chiếu (tài khoản cũ): ảnh Kling Image 3.0 2K = 1 credit/ảnh; clip Kling 2.5 Turbo 1080p 5 s = 25 credit. Giá tài khoản mới có thể khác → **đo lại ở Bước 0** rồi co giãn bảng dưới theo tỉ lệ.

## Bước 0 – Chuẩn bị trên tài khoản mới (≈ 60 credit)
1. Đo giá thật: 1 ảnh 2K, 1 clip 5 s 1080p (2.5 Turbo / bản mới nhất), ghi vào bảng giá cuối file.
2. **Tạo lại Element khoá nhân vật** (Element gắn với tài khoản cũ): Lexkite Mia/Leo/Ama/Diane/Carlos từ `brand/characters/_candidates/<who>/dna.png` + 3 góc (multi-shot miễn phí hoặc chọn từ ảnh góc đã có). Kiểm: 2 ảnh thử/nhân vật ≥ 90 với ảnh DNA.
3. Ảnh **tư thế trung tính** (tay buông, chân đứng vững) cho từng nhân vật × 3 trang phục (công sở / đời thường / sự kiện) → khung đầu cho mọi clip.

## Bước 1 – Bối cảnh hoàn chỉnh (≈ 600 credit)
- 60 phòng đủ nội thất theo `docs/ASSET-LIBRARY.md` §0 (lối trống giữa, phối cảnh 1 điểm, sàn rõ) × ngày/tối × 9:16 + 16:9, 2 ảnh/lần, ~1,3 lần thử → ~600.
- Ưu tiên theo `casting.json`: office, meeting, boss office, interview room, cafe, apartment, kitchen, library, classroom, exam hall, dorm, school hallway, airport check-in, security, gate, hotel lobby, hotel room, restaurant, diner, supermarket, clinic, bank, street, subway, park, gym, rooftop, coworking.
- Mỗi phòng sinh hồ sơ sàn tự động (`rooms/<id>.json`) – người duyệt chỉnh điểm đứng.

## Bước 2 – Thư viện chuyển động nhân vật chính (≈ 6.000 credit)
Mỗi clip 5 s = 2 hành động (cắt đôi) – xem qa-log 16–17/10.
| Nhân vật | Clip | Ghi chú |
|---|---|---|
| Mia, Leo, Ama | 3 × 25 clip = 75 | phủ đủ ô thiếu trong `render.mjs --coverage`: nói (talk/explain/ask/cta) có **cử động miệng**, nghe (idle/nod), đúng (thumbs/laugh), sai (shock/facepalm), suy nghĩ, chỉ tay, vẫy, cầm điện thoại/cốc, ngồi bàn |
| Diane, Carlos | 2 × 20 clip = 40 | vai sếp/phỏng vấn; barista/dịch vụ/du lịch |
| Trang phục thứ 2 | 5 × 8 clip = 40 | đời thường/sự kiện cho bối cảnh ngoài văn phòng |
| **Tổng** | ~155 clip × 25 + 30% làm lại | ≈ 5.000–6.000 |
Quy tắc: khung đầu tư thế trung tính; chờ ≥ 6 s sau tải ảnh, soi khung đầu trước khi bấm; prompt có "big clear motion"; tránh hành động gây biến dạng (Leo ngả đầu); clip ít động → vai nghe, không bỏ.

## Bước 3 – Cận mặt nói chuyện cho khớp khẩu hình (≈ 2.000 credit)
- Clip bán thân/cận mặt **đang nói** (miệng mở/đóng tự nhiên, chớp mắt, gật nhẹ) 5 s × 5 nhân vật × 6 cảm xúc × 2 góc (thẳng / ¾) = 60 clip ≈ 1.500 + làm lại.
- Dùng cho cảnh nói chính diện, Call Mia, thumbnail động. (Khi có rig Rive sẽ giảm nhu cầu loại này.)

## Bước 4 – Vai phụ (≈ 2.400 credit)
- 11 vai (người phỏng vấn, thu ngân, bác sĩ, tiếp viên, lễ tân khách sạn, nhân viên an ninh, giáo viên, bạn cùng lớp, 2 đồng nghiệp, khách hàng): DNA + Element (~10) + 6 clip nói/nghe (~150) ≈ 160/vai → ~1.800 + làm lại.

## Bước 5 – Cảnh đôi & đặc biệt (≈ 3.000 credit)
- 40 clip 2 nhân vật cùng khung trong phòng có sẵn (bắt tay, đưa cà phê, high-five, phỏng vấn ngồi đối diện, học nhóm) – dùng ảnh phòng + 2 Element làm tham chiếu.
- 30 clip intro/hook/thumbnail động (Kit bay vào, zoom nhân vật sốc, chữ…).

## Bước 6 – Mùa/lễ & xu hướng (≈ 1.500 credit)
- Trang phục + phòng theo mùa (Halloween, Thanksgiving, Giáng sinh, Tết, mùa thi, hè) cho 5 nhân vật chính.

## Dự phòng (≈ 3.900 credit)
- Làm lại khi cổng QA chặn, series mới, nhân vật mới theo dữ liệu xem video thật (format thắng → nhân bản).

## Quy trình mỗi lô (bắt buộc)
1. Thử 1–2 bản → chấm → chỉ nhân rộng khi ≥ 90.
2. Tải bản gốc → `node scripts/video/library.mjs ingest` (tự đặt tên chuẩn, sha, chống trùng, cổng kỹ thuật + giải phẫu + phong cách).
3. `library.mjs sync` → nguồn 1 media.lexkite.com (bản tối ưu) + nguồn 2 Drive qua GrabCast (bản gốc) → `verify`.
4. Ghi `content/video/qa-log.md`; cập nhật `render.mjs --coverage` để chọn lô kế tiếp theo ô còn thiếu.
5. Báo anh khi còn ~20% credit.

## Sẵn sàng trước khi nhận tài khoản mới (checklist)
- [ ] `library.mjs` (ingest/sync/verify/check/restore) chạy thật, đã nhập 26 clip + phòng hiện có.
- [ ] Dây chuyền dựng v3 (Remotion, hook viral, chuyển cảnh, âm thanh, chỉnh màu điện ảnh, watermark chữ) cho ra mẫu ≥ 90.
- [ ] faster-whisper chạy trên CI (khẩu hình lệch < 80 ms).
- [ ] Workspace Lexkite trên GrabCast đã kết nối Drive (nguồn sao lưu 2) – **anh bấm**.
- [ ] Đăng nhập tài khoản Kling mới trên Chrome của anh – **anh bấm** (em không nhập mật khẩu).

## Bảng giá đo thực tế (điền ở Bước 0)
| Loại | Credit | Ghi chú |
|---|---|---|
| Ảnh 2K | | |
| Clip 5 s 1080p | | |

## Luật thử trước (17/10)
Mọi hạng mục mới trong bảng phân bổ (ngồi, cầm điện thoại, đưa đồ, bước vào khung, cảnh đôi, phòng mới…) bắt đầu bằng **1 clip thử (25 credit)** → `chroma-batch.yml` → dựng video thật (`video-sample.yml`) với đúng phòng → chấm ≥ 90 rồi mới chạy lô. Hỏng thì sửa prompt/cách ghép và thử lại 1 clip – không bao giờ tạo lô khi chưa có video thử đạt.

## Cảnh ngồi / có bàn ghế – kết quả thử 17/10 (chốt)
| cách | kết quả | dùng? |
|---|---|---|
| A. Ảnh phòng đã duyệt + ảnh nhân vật làm tham chiếu → ảnh ngồi → video | 2/4 ảnh đạt (1 ảnh ngồi lơ lửng); clip thử 5 s: ngồi yên, nói + nhấp cà phê, tay không xuyên bàn ≈ 90; nhân vật nhỏ | ✓ cho cảnh tiếp theo cùng địa điểm |
| B. Nhân vật + ghế trên phông xanh → ghép vào phòng | ảnh ổn nhưng ghép vẫn rủi ro phối cảnh bàn/ghế | ✗ không dùng cho cảnh ngồi |
| C. Chỉ ảnh nhân vật, bối cảnh mô tả bằng prompt | 4/4 ảnh ngồi đúng ghế, nhân vật to rõ, không chữ; mỗi ảnh 1 quán khác | ✓ cho cảnh ĐẦU của địa điểm mới |

Quy trình: cảnh đầu = C (chọn ảnh tốt nhất → thành "phòng chuẩn" của địa điểm) → các cảnh sau = A với phòng chuẩn đó (giữ nhất quán) → soi từng ảnh (1 credit/ảnh) → mới tạo video (25 credit). Cảnh ĐỨNG vẫn dùng phông xanh + ghép (kho clip động tác).
