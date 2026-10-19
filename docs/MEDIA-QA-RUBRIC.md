# Tiêu chuẩn chấm điểm tài nguyên nhân vật & video (thang 100 – chỉ dùng khi ≥ 90)

Áp dụng cho mọi ảnh Kling, mọi video tự dựng, mọi cuộc gọi "Call Mia". Chấm **trước** (bản nháp/lô thử) và **sau** (bản cuối) – ghi điểm vào `content/video/qa-log.md`. Lô < 90 → sửa mô tả/tham chiếu rồi làm lại; KHÔNG chạy lô tiếp theo cùng hướng.

## A. Ảnh nhân vật (mỗi lô)
| Tiêu chí | Điểm | Đạt khi |
|---|---|---|
| Đồng nhất nhận diện (mặt, kiểu tóc, màu da, dáng) so với ảnh ADN | 25 | nhìn nhanh 1 giây biết ngay là ai; không lệch tuổi/giới tính |
| Đồng nhất trang phục & màu (mã màu thương hiệu) | 15 | đúng món đồ, đúng màu, đúng phụ kiện (kẹp tóc, kính, thẻ đeo) |
| Đồng nhất phong cách vẽ (nét, độ dày viền, đổ bóng) với cả dàn | 15 | đặt cạnh 2 nhân vật kia không lệch phong cách |
| Biểu cảm / cử chỉ đúng yêu cầu, đọc được ở cỡ nhỏ (thumbnail 200 px) | 15 | người xem đoán đúng cảm xúc |
| Giải phẫu & lỗi AI (tay 5 ngón, không thừa chi, không nhân đôi nhân vật, không méo mặt) | 15 | 0 lỗi |
| Dùng được để dựng (nền sạch, nhân vật trọn khung, tách nền dễ, không chữ/logo/watermark) | 10 | tách lớp được, không cắt chân/tay |
| Hấp dẫn thị giác (bắt mắt, cân đối, hợp thị trường Mỹ) | 5 | đủ đẹp để làm thumbnail |

## B. Bối cảnh
| Tiêu chí | Điểm |
|---|---|
| Đúng bối cảnh & văn hóa Mỹ (đồ vật, biển báo không chữ thật, không thương hiệu) | 25 |
| Cùng phong cách vẽ & bảng màu với nhân vật | 25 |
| Chừa vùng trống cho nhân vật & phụ đề (khổ 9:16 chừa 1/3 dưới) | 20 |
| Không lỗi AI (đường thẳng méo, phối cảnh sai, chữ vô nghĩa) | 20 |
| Có cả bản 9:16 và 16:9, ánh sáng nhất quán | 10 |

## C. Video (Shorts & bài học)
| Tiêu chí | Điểm | Đo tự động? |
|---|---|---|
| Câu mở đầu (hook) giữ người xem: ≤ 2 s, có xung đột/tò mò | 15 | tỉ lệ xem qua 3 s (sau đăng) |
| Kiến thức đúng 100% (ngữ pháp, nghĩa, phát âm, CEFR) | 20 | LanguageTool + content-check + duyệt |
| Khớp miệng (lệch < 80 ms) & biểu cảm đúng câu thoại | 15 | có |
| Âm thanh: −16 LUFS ±1, giọng rõ, không rè, nhạc nền ≤ −24 dB | 10 | có |
| Phụ đề karaoke: đúng chữ 100% (cả dấu cách giữa từ khi hiện), đúng nhịp, trong vùng an toàn, không chồng lên chữ hook/thẻ/watermark (cổng `layout`), tương phản ≥ 4.5:1 | 10 | có |
| Nhịp dựng: cắt cảnh 2–4 s, không khung tĩnh > 4 s | 10 | có |
| Thương hiệu & pháp lý: đúng nhân vật/màu, không nhãn hiệu đối thủ, không nhạc/ảnh bản quyền | 10 | có (brand-check) |
| Kêu gọi hành động: link/QR đúng bài trong app | 5 | có |
| Giá trị chia sẻ (hài, hữu ích, "phải lưu lại") | 5 | sau đăng: lượt lưu/chia sẻ |

## D. Cuộc gọi "Call Mia" / chatbot
| Tiêu chí | Điểm |
|---|---|
| Độ trễ phản hồi ≤ 1,5 s (câu soạn sẵn ≤ 0,3 s) | 20 |
| Nhân vật đúng tính cách & đúng trình độ người học | 20 |
| Sửa lỗi tế nhị, chính xác, có giải thích theo ngôn ngữ người học | 20 |
| Khớp miệng & biểu cảm tự nhiên | 15 |
| An toàn (không nội dung nhạy cảm, không lộ dữ liệu) | 15 |
| Tổng kết cuối cuộc gọi hữu ích, nối về thẻ ôn | 10 |

## E. Sau đăng (vòng lặp cải thiện)
Mỗi tuần: so sánh tỉ lệ xem hết, lưu, chia sẻ, nhấp link, người dùng mới theo từng format → format điểm thấp bị giảm tỉ trọng trong hàng đợi, format thắng được nhân bản.

## D. Thang "điện ảnh" 7 mặt (19/10/2026 – mục tiêu ngang kênh học tiếng Anh hoạt hình hàng đầu; mặt nào < 90 → không đăng)
| Mặt | 90 nghĩa là | Mốc hiện tại (latte bản điềm đạm 18/10) |
|---|---|---|
| 1. Hình ảnh – nhân vật trong bối cảnh | nhân vật ở TRONG cảnh: chung ánh sáng/bóng, chạm đồ vật, nhìn nhau (eyeline), không viền cắt dán | 55 |
| 2. Diễn xuất – chuyển động | cử chỉ/biểu cảm khớp nghĩa câu, khớp miệng (lip sync) theo giọng, không khựng/nhảy tư thế | 40 |
| 3. Giọng – âm thanh | giọng tự nhiên ở tốc độ ~0,9×, có tiếng không gian theo bối cảnh (quán, văn phòng…), SFX tinh tế, −16 LUFS | 50 |
| 4. Dựng – nhịp | cắt theo lượt nói, shot ≥ 2,5 s, máy quay thật (dolly/pan mềm), ≤ 2 chuyển cảnh kiểu | 70 |
| 5. Phụ đề – chữ | ≤ 13–15 ký tự/s, ≥ 1,2 s/trang, kiểu chữ & bố cục đồng bộ thương hiệu | 75 |
| 6. Nội dung – kịch bản | đúng 100 %, hữu ích, có 1 khoảnh khắc hài/bất ngờ ≤ 3 s đầu | 75 |
| 7. Hook – thương hiệu | hook ≤ 2 s gây tò mò thật, thumbnail riêng, màn kết sạch | 65 |
Hướng nâng (đang thử): shot điện ảnh Kling từ khung đầu dựng bằng kho (nhân vật + phòng) → Kling Lip Sync theo giọng → Remotion chỉ phụ đề/thẻ/màn kết.

**Cổng tự động cho thang D (chế độ cine – `scripts/video/cine/gates.mjs`, docs/VIDEO-PIPELINE.md §13)** – máy chặn trước, người chấm 7 mặt sau. FAIL = không đăng; SKIP = máy không đo được → **cần duyệt tay** (không bao giờ tự PASS).

| Cổng | Đo gì (cách đo) | Ngưỡng | Mặt D |
|---|---|---|---|
| 1 `proportion` | khung đầu 2 người: hộp người (MediaPipe EfficientDet-Lite2 "person") + vạch mặt quầy; người lớn đứng sau quầy = phần trên quầy ÷ (1 − 0,52) | teen : người lớn = 0,85 ± 0,08; quầy = 0,52 ± 0,12 × người lớn; khung 1 người lọt thêm người → FAIL | 1 |
| 2 `identity` | bảng màu ref (màu ≥ 6 % diện tích; khung cận/sau quầy so nửa trên ref) ↔ vùng người; màu áo ref phải còn trong vùng người – trên khung đầu VÀ 3 khung của clip (0,5 / 2,5 / 4,5 s) | ΔE ≤ 22 (màu lớn), áo ≤ 16 | 1 |
| 3 `vision` | AI thị giác (Workers AI llama-4-scout → Gemini, dùng lại chuỗi của kho nhân vật): vật thừa, chữ vô nghĩa, người thừa, méo mặt/tay | lỗi → sinh lại khung; lỗi chỉ ở cuối clip → cắt shot trước khung lỗi; không có AI → SKIP "cần duyệt tay" | 1, 7 |
| 4 `lipsync` | ranh giới giọng TTS = tới đầu đoạn im lặng kéo tới hết file (khoảng ngắt giữa câu KHÔNG tính); giọng/cảm xúc theo cast bible; số mặt Kling nhận diện | câu ≥ 2 s (kéo bằng thán từ trong kịch bản, không đệm im lặng), ≤ shot − 0,2 s, tiếng gốc tắt (original_audio_volume = 0), ≥ 2 mặt phải chọn mặt bằng so ref | 2, 3 |
| 5 `opening` | RMS 0,5 s đầu video cuối; hook chữ | ≥ −35 dBFS; hook từ khung 0 | 7 |
| 6 `layout` | phụ đề/thẻ theo shot; hộp chữ (PIL) ↔ hộp mặt từng shot (đo trên khung mẫu; mặt hoạt hình không bắt được → vùng mặt preset, ghi measured:false) | phụ đề không vắt qua điểm cắt, ≤ 15 ký tự/s, ≥ 1,2 s/trang (≤ 2 từ được miễn); thẻ hiện SAU khi câu nó trả lời bắt đầu, trong shot đó; chữ đè mặt ≤ 2 % | 5 |
| 7 `endcard` | sha256 mọi đoạn ghép ↔ tài sản trong manifest của chính video | màn kết do bước endcard dựng riêng; không đoạn nào cắt từ video khác | 7 |
| + `loudness` | ebur128 trên file cuối | −16 ± 1 LUFS | 3 |

Pilot latte (19/10, driver local-cache): proportion FAIL (0,73), identity PASS, vision FAIL (chữ vô nghĩa trên bảng phấn, người thừa ở khung cận), lipsync PASS, opening FAIL (shot hook im lặng), layout FAIL (1 trang 18,6 ký tự/s), endcard PASS, loudness PASS (−15,8 LUFS).
