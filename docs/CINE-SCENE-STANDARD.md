# Khuôn chuẩn 1 cảnh footage điện ảnh (làm 1 lần, không làm lại)

Rút ra từ quán cà phê (15 clip) và sân bay (pilot 66 + bộ 249 + bổ sung 54 = 369 credit, 3 lượt). Cảnh mới **chạy đúng 1 lượt theo file này**; ngân sách ≈ 16 ảnh + 15 clip ≈ **390 credit**, dự phòng 10 %.

## 1. Danh sách clip BẮT BUỘC (đủ cho mọi mẫu bài: sai→sửa, A/B, series, luyện nói)
Nhân vật: **A** = khách (Ama), **B** = người phục vụ của cảnh. Luật 180°: A trái nhìn phải, B phải.

| # | Clip (5 s, kling-video-v2_5 1080p) | Dùng cho |
|---|---|---|
| 1 | Toàn cảnh 2 người, cả hai nghe (miệng khép) | mở cảnh, nền chữ |
| 2–3 | Qua vai nhìn B nói ×2 (mặt chính diện, đầu quay ≤ 20°) | B nói (ghép khẩu hình) |
| 4–5 | Qua vai nhìn A nói ×2 | A nói |
| 6 | A cận mặt nói vào máy | bản đọc chậm, "Your turn" |
| 7 | A phản ứng "oops" → cười | sau câu sai |
| 8 | A gật đầu cảm ơn, cười ấm (thấy rõ miệng) | kết hội thoại |
| 9 | B phản ứng gật/cười | nền thẻ so sánh |
| 10 | **B cử chỉ chính** (đưa đồ / chỉ tay / gõ máy) | diễn xuất ≥ 90 |
| 11–12 | **2 cận cảnh đạo cụ** của tình huống (tay đưa – nhận, máy móc) | nhịp dựng, tiếng động |
| 13 | A đi vào (≥ 3 bước, từ trái) | mở đầu + bước chân |
| 14 | A chào rồi đi ra (hướng ghi rõ trong bank.json) | kết |
| 15 | Dự phòng làm lại 1 clip lỗi | |

## 2. Khuôn câu lệnh (Kling Image 3.0 khung đầu → Kling Video)
- Khung đầu: image_to_image với ảnh tham chiếu nhân vật + ảnh bối cảnh đã duyệt; ghi rõ **tỉ lệ cơ thể so với đồ vật**, góc máy, hướng nhìn, ánh sáng; "không người/tay/vật nào khác lọt vào khung", "không chữ, không logo".
- Clip: 1 hành động đơn, chậm, nhỏ; "giữ hướng đầu suốt clip"; tay **không chạm/xuyên** đồ vật trừ đúng 1 thao tác mô tả; đạo cụ giữ nguyên số lượng.
- Mỗi lần gửi 1 việc (song song bị quá tải).

## 3. Soát TRƯỚC khi chi 25 credit cho clip
Khung đầu: đúng tỉ lệ, đúng 180°, đủ đạo cụ & cùng mẫu với các khung khác, đúng số tay, không chữ/logo, mặt đủ to (≥ 160 px) để ghép khẩu hình. Sai 1 mục → tạo lại ảnh (1 credit), không tạo clip.

## 4. Sau khi có clip (0 credit, tự động)
`interp24.py` (bỏ giật "vẽ cách khung") → lấy bộ miệng + đường bám (gợi ý vùng miệng, tránh mắt chớp) → soi từng khung chỗ tay/đạo cụ, ghi **đoạn dùng được** vào `bank.json` → chấm MEDIA-QA-RUBRIC, < 90 thì dùng clip dự phòng.

## 5. Bài dựng: luật cứng (qa5 chặn)
Phụ đề đúng nguyên văn, ≤ 15 ký tự/giây, chuyển trang không nháy; chữ không đè mặt, trong vùng an toàn; người nói luôn thấy mặt hoặc ngoài hình; tiếng động chỉ khi thấy sự kiện; màn kết im; ≤ 40 s; liên tục đạo cụ giữa các shot; hook = thẻ ✗/✓ lỗi hay gặp trong 2 s đầu.

## 6. Giọng & khẩu hình
Kokoro trên nhánh `rhubarb-adhoc` (lines.json) → Rhubarb → `vis3/`. Mỗi cảnh viết **toàn bộ câu thoại cho 6–8 bài ngay từ đầu** (1 lượt TTS).
