# Kế hoạch kho video đa dạng + chuẩn 100/100 (22/10/2026)

Mục tiêu: hàng nghìn short bản tin giáo viên (Ama/Carlos) mà **mỗi clip là nội dung gốc thật**, nền tảng không coi là trùng lặp/reused, không bóp đề xuất; chất lượng ≥ 90/100 mới đăng, nhắm 100.

## 1. Vì sao nền tảng hạ đề xuất & cách tránh
| Tín hiệu nền tảng dùng | Cách mình tránh |
|---|---|
| Vân tay hình (pHash khung chính) giống clip cũ | Mỗi clip khác ≥ 4/7 trục (mục 2); kiểm pHash với **mọi clip đã đăng**, khoảng cách < ngưỡng → chặn |
| Vân tay âm thanh (cùng nhạc/giọng/câu) | Lời thoại mới 100% mỗi bài; nhạc nền xoay kho có giấy phép; kiểm chromaprint |
| Nội dung tái sử dụng/ít sáng tạo (chỉ đổi filter, ghép lại) | Mỗi clip = **1 điểm học mới** + câu ví dụ mới; không đăng lại bài cũ đổi màu |
| Đăng hàng loạt giống nhau, cùng giờ | 1–3 clip/ngày/nền tảng, giờ lệch, caption & hashtag viết riêng từng nền tảng, không watermark nền tảng khác |
| Vi phạm bản quyền/nhãn AI | Nhạc tự tạo hoặc giấy phép rõ; bật nhãn "AI-generated" khi nền tảng yêu cầu; không nhái thương hiệu |

## 2. Bảy trục đa dạng (mỗi clip khác clip gần nhất ≥ 4 trục; 30 ngày không trùng bộ ≥ 5 trục)
1. **Điểm học** (kho ≥ 500: tình huống, cụm câu, ngữ pháp, phát âm, từ vựng, idiom, lỗi sai, mẹo thi).
2. **Template** (≥ 10: 3 cách nói, lỗi→sửa, thang lịch sự, A/B quiz, so sánh 2 cột, mẹo 1 phút đếm ngược, điền chỗ trống, POV tình huống, nghe & nhắc lại, người bản xứ vs sách).
3. **Nền** (≥ 60 ảnh tĩnh theo chủ đề + biến thể giờ ngày/đêm; không lặp trong 6 bài liền).
4. **Mẫu cắt cảnh** (≥ 6 nhịp: ai mở, tỉ lệ single/¾, nhịp 1.5–3.5 s, J-cut).
5. **Màu series** (8 bộ màu/chip/lower-third theo chuyên mục).
6. **Kiểu hook** (câu hỏi, gọi lỗi sai, con số, thử thách, sự thật bất ngờ, POV).
7. **Âm thanh** (giọng dẫn chính Ama/Carlos xoay, nhạc nền 20+ bài, SFX bộ khác nhau).
→ Tổ hợp > 10 × 60 × 6 × 8 × 6 × 2 × 20 ≈ 1,4 triệu biến thể trên 500+ điểm học. Sổ đa dạng `content/video/cine/news/diversity.json` ghi trục của từng clip; generator chọn tổ hợp thoả ràng buộc.

## 3. Thang 100 điểm (QA tự động + duyệt mẫu; ≥ 90 mới đăng)
| Hạng mục | Điểm | Tiêu chí đo |
|---|---|---|
| Nội dung | 25 | đúng tuyệt đối (AI judge + nguồn), 1 điểm/clip, ví dụ tự nhiên, hợp CEFR, có "Teacher's tip" dùng được ngay |
| Hook & giữ chân | 20 | hook ≤ 1,5 s ≤ 5 từ; đổi nhịp mỗi 3–5 s; không lặng > 0,4 s; 18–28 s; kết loop + Save this |
| Hình ảnh | 20 | nét (Laplacian), không vỡ khối (SSIM ≥ 0,97), viền tách nền sạch, màu như quay thật, đầu 2 người ±5 %, vùng an toàn |
| Điện ảnh | 10 | single/¾ xen kẽ, đúng 180°, push-in 2–4 %, DOF nền, bóng tiếp xúc, không jump cut |
| Giọng | 15 | Mỹ tự nhiên, 150–165 từ/phút, −14 LUFS mạng xã hội, nhấn đúng trọng âm (từ điển phát âm riêng), bed −40 dB |
| Phụ đề | 10 | khớp từng từ ±80 ms, cụm 2 dòng không kết bằng hư từ, ≥ 80 px, tương phản AA, highlight từ khoá |

## 4. Nâng từ "khá" lên 100
- **Giọng**: chọn giọng Kokoro tốt nhất theo vai + từ điển phát âm (dùng IPA Mỹ mới trong lexicon) + ngắt nghỉ theo dấu câu; thử thêm TTS mở có cảm xúc (giấy phép thương mại) và A/B nghe mù.
- **Phụ đề karaoke**: tô từng từ đang nói (word timing faster-whisper), từ khoá đổi màu series.
- **Chuyển động đồ hoạ**: thẻ trượt/nảy nhẹ 8–12 khung, gạch ✗ → ✓ động; không flash.
- **Âm thanh**: room tone nhẹ, SFX chuyển cảnh −8 dB, nhạc có giấy phép, ducking tự động dưới giọng.
- **Sắc nét**: master CRF 17–18, ≥ 8 Mbps, Real-ESRGAN cho nền/clip thấp phân giải, push-in dựng ở 1,25×.
- **Vòng phản hồi**: kéo số liệu xem/giữ chân (YouTube Data API miễn phí; TikTok/Meta khi có) → tăng trọng số template/hook thắng, bỏ cái thua.

## 5. Đường ống (0 credit, chạy GitHub Actions)
kho điểm học (500+, AI soạn + kiểm) → generator chọn tổ hợp theo sổ đa dạng → TTS + timing → dựng (news.py) → QA 100 điểm + pHash/chromaprint chống trùng → lưu lexkite-shorts + Drive → lịch đăng (nháp, anh duyệt).

## 6. Thứ tự làm
1. Duyệt 3 mẫu v6 (đang sửa khung đen, cỡ đầu, độ nét). 2. 10 template + 10 video mẫu cho anh duyệt. 3. Sổ đa dạng + pHash chống trùng + thang 100. 4. Kho 500 điểm học. 5. Karaoke sub + motion thẻ + giọng nâng cấp. 6. Dựng lại 24 bài + chạy hằng ngày.
