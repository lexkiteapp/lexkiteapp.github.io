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

## 7. Hàng triệu clip không cạn, không nhàm (chủ 22/10)
- **Nguồn nội dung vô hạn có kiểm soát**: điểm học sinh từ lexicon 8.177 từ × nghĩa × cụm từ đi kèm × 200+ tình huống đời sống/công sở/du lịch × 6 kỳ thi × lỗi sai phổ biến theo 15 nhóm người học → > 1 triệu điểm học khác nhau; AI soạn, AI judge + luật kiểm (đúng ngữ pháp, tự nhiên, hợp CEFR) trước khi vào kho.
- **Chống nhàm**: điểm "mới lạ" cho mỗi clip (khác chủ đề/kiểu bài/hook/nền so với 20 clip gần nhất); chuỗi series nối tiếp ("Part 2"), mùa/lễ/sự kiện theo lịch từng nước; mỗi tuần thêm ≥ 1 template mới vào vòng xoay.
- **Không lặp**: băm nội dung (câu chính + điểm học) không trùng mãi mãi; pHash/chromaprint không trùng với mọi clip đã đăng.

## 8. Tự động A→Z trên GitHub (không cần máy anh)
cron mỗi ngày → chọn điểm học + tổ hợp (sổ đa dạng) → soạn kịch bản + kiểm AI → TTS + timing → dựng → QA 100 điểm + kiểm khớp (mục 9) → lỗi thì tự sửa/thay tổ hợp tối đa 2 lần, vẫn lỗi → bỏ + ghi sổ → lưu kho + Drive → xếp lịch nháp → báo cáo hằng ngày trong Quản trị › Video. Chỉ bước đăng công khai chờ anh bật.

## 9. Kiểm khớp nội dung ↔ hình ảnh (chặn lỗi tiềm ẩn)
- Nền đúng chủ đề (bg_topics + AI nhìn ảnh nền xác nhận bối cảnh).
- Chữ trên thẻ = đúng câu giọng đọc (so ASR faster-whisper với kịch bản, sai ≤ 0 từ khoá).
- Phụ đề khớp thời gian từng từ ±80 ms; người đang nói = người có khẩu hình chạy; người nghe có phản ứng, không nói.
- Câu ✗/✓ đúng logic (✗ là câu sai thật, ✓ là câu đúng thật – AI judge); "Teacher's tip" khớp điểm học.
- Cử chỉ trung tính, không đè chữ; không người/vật thừa; không chữ lạ trong nền (OCR nền = rỗng).
- Mọi luật là cổng QA: trượt 1 luật = không đăng.

## 10. Một clip – hai nơi dùng: social + bài học trên web (chủ 22/10)
- **Bản web riêng** từ cùng master: 720×1280, ~2–3 MB, poster WebP, phụ đề **WebVTT CHỈ tiếng Anh** (chủ 22/10: dạy hoàn toàn bằng tiếng Anh, KHÔNG phụ đề dịch; chỉ nút/nhãn giao diện theo ngôn ngữ người dùng), lưu CDN của mình (R2/`media.lexkite.com`, đăng ký infra) – tải lười, không tự phát có tiếng, không ảnh hưởng khung app.
- **Gắn thẻ tự động** mỗi clip: từ/cụm (lexicon id), điểm ngữ pháp, tình huống, CEFR, kỳ thi, kỹ năng.
- **Xếp thông minh**: thẻ từ / trang từ vựng ("Xem 20 giây"), trang ngữ pháp, ngày học trong lộ trình ("video của ngày"), bài blog cùng chủ đề, tab mới add-on (tuỳ chọn). Chọn clip theo khớp thẻ + trình độ người học + chưa xem + đa dạng template; sau clip có 1 câu đố nhanh → tính vào SRS.
- **SEO video**: schema `VideoObject` + video sitemap + trang `/video/<slug>/` có transcript → Google hiện video trong tìm kiếm.
- **Đo**: lượt xem, xem hết, câu đố đúng → tăng trọng số clip tốt trên web và chọn hook/template cho social.
- **Đã làm (22/10):** `video-web.yml` (sau cine-render + 04:47 UTC) → `scripts/video/web-rendition.mjs`: 720×1280 CRF 23 +faststart (≤ 3,2 MB), poster WebP, VTT tiếng Anh theo mốc từ (không phụ đề dịch), thẻ (`scripts/lib/video-web.mjs`: lexicon id, ngữ pháp, tình huống, CEFR, kỳ thi, kỹ năng), câu đố 1 câu bằng tiếng Anh (chọn câu đúng / điền chỗ trống / chọn câu đáp, ✓/✗) → GitHub Release `wv-<bài>` → `media.lexkite.com/video/` → `web/data/videos.json` + `content/video/web/captions/`.
  Điều kiện: bản tin + QA ≥ 90 (`webScore`) + chủ duyệt trong `content/video/web/approved.json` (`approved`); `test` = mẫu thử ẩn (chỉ hiện với `?vtest=1`, trang noindex). Duyệt clip = thêm id bài vào `approved` → lượt chạy kế tự lên web.
  Web: gói lười `lvideo` (`web/js/lesson-video.js` + `web/js/lib/video-rank.js`): thẻ từ ("Xem 20 giây"), trang ngữ pháp, ngày học lộ trình ("Video của ngày"), khối video trong mẫu blog (`build-blog.mjs`, chỉ clip đã duyệt); trang `/video/<slug>/` (transcript tiếng Anh, khung trang 15 ngôn ngữ) + `sitemap-video.xml` (`scripts/build-video-pages.mjs`); đo `/api/hit` t:'v' → Quản trị → Thư viện video → Trên web. Test: `scripts/test/video-web.mjs`. Tab mới add-on: chưa làm (vùng `extension/**` của luồng khác).

## 11. Nhân vật khớp bối cảnh (chặn "đứng trên bàn/ghế/dưới nước…") – chủ 22/10
- **Chú thích nền 1 lần khi nhập kho** (CI, miễn phí): độ sâu (Depth-Anything) + phân vùng ngữ nghĩa (Mask2Former ADE20K, giấy phép MIT) → lưu `bg/<id>.zones.json`: đường chân trời/độ cao máy, vùng sàn đứng được, vật tiền cảnh (bàn, ghế, quầy, nước, giường, xe…), vùng cấm.
- **Luật đặt người** (generator + QA): đặt người chỉ trong "vùng đứng" (sàn/lối đi ở xa hơn vật tiền cảnh); phía dưới-sau thân người không được là mặt bàn/ghế/nước/giường; không vật tiền cảnh nào gần hơn người lại bị người đè lên; tầm mắt người ≈ đường chân trời của nền (±6 % khung); cỡ người khớp độ sâu tại chỗ đứng.
- **Nền không có vùng đứng hợp lệ** (vd. mặt nước, trên xe) → chỉ dùng làm cận cảnh mờ sau vai hoặc loại khỏi kho người dẫn.
- **Cổng AI nhìn khung ghép** (Gemini vision qua kho khoá miễn phí, dự phòng Workers AI): hỏi "người có đứng tự nhiên trong cảnh không, có đứng trên/ trong đồ vật, nước, sai tỉ lệ, sai phối cảnh không?" → bất kỳ "có" = trượt. Lấy 3 khung/clip.
- Mọi luật là cổng QA; trượt → generator đổi nền/vị trí, tối đa 2 lần, rồi bỏ clip.
