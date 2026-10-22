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

## 12. Cách giảng: dễ hiểu – dễ học – dễ nhớ (chủ 22/10) – bắt buộc cho mọi kịch bản
1. **Một ý duy nhất**, nói được trong 1 câu ("Dùng *look for* khi đang tìm").
2. **Tương phản sai → đúng** (✗ câu người học hay nói → ✓ câu bản xứ) + **vì sao** trong ≤ 12 từ (quy tắc dễ nhớ, không thuật ngữ khó).
3. **Ví dụ trong tình huống thật** (2–3 câu ngắn, đúng CEFR, từ vựng quen).
4. **Mẹo nhớ**: hình ảnh/biểu tượng trên thẻ (mã hoá kép), vần/ẩn dụ ngắn, công thức màu (*look* + **for** + vật).
5. **Truy xuất chủ động**: "Dừng lại, đoán xem…" 1,5 s trước khi lộ đáp án; cuối clip câu đố 1 chạm (web) / bình luận (social).
6. **Nói theo**: "Repeat after me" có khoảng lặng; phát âm khó → cặp âm tối thiểu + nhấn trọng âm bằng chữ in đậm.
7. **Lặp lại giãn cách**: series nhắc lại ý cũ ở clip sau ("Nhớ *look for* hôm qua?"); web đưa vào SRS.
8. **Cá nhân hoá**: lỗi theo nhóm ngôn ngữ mẹ đẻ (vd. người Việt bỏ mạo từ, người Nhật nhầm l/r) → gắn thẻ, xếp đúng người học trên web.
9. **Kiểm định**: AI judge chấm "dễ hiểu cho trình độ X?", "mẹo có sai không?", câu giải thích ≤ CEFR+1; trượt → viết lại.

## 13. Viral – kéo user – save/share (chủ 22/10)
- **Độ khó trộn có chủ đích**: mỗi tuần ~40 % dễ (A1–A2, phủ rộng, nhiều view), 40 % vừa (B1–B2, người học nghiêm túc), 20 % khó/"thử thách" (C1+, "99 % người học sai câu này") để kéo bình luận & share; nhãn độ khó hiện ở góc.
- **Kho hook xoay vòng** (≥ 12 kiểu): câu hỏi trực tiếp · "Đừng nói X" · con số ("3 cách…") · thử thách "Bạn trả lời được không?" · sự thật bất ngờ · POV tình huống · so sánh "Sách dạy vs người Mỹ nói" · lỗi của người nổi tiếng/phim (không dùng hình người thật) · đếm ngược · "Sai 90 %" · câu chuyện 1 dòng · tranh luận A/B. A/B hook theo số liệu.
- **Lý do để Save**: thẻ tóm tắt "Teacher's tip" chụp màn hình được, list 3–5 câu dùng ngay, "Lưu lại học sau"; series đánh số (Part 1/2/3) → follow.
- **Lý do để Share**: câu đố có đáp án gây tranh luận, "Gửi cho người hay nói sai câu này", nội dung hữu ích cho phỏng vấn/du lịch/thi.
- **Bình luận**: kết bằng câu hỏi mở/đố; ghim bình luận đáp án; trả lời bằng clip mới (series).
- **Kéo về app**: CTA cuối cùng nhẹ + link đúng bài học trên web (deep link), không bán hàng gắt.
- Đo: save rate, share rate, completion, comment → trọng số template/hook/độ khó tuần sau.

## 14. Ai ở nước nào cũng học được (chủ 22/10)
- Clip social **chỉ tiếng Anh**, nhưng hiểu được không cần tiếng mẹ đẻ: tiếng Anh đơn giản (giải thích ≤ CEFR B1), nói chậm rõ, ✗/✓ + biểu tượng + màu mang nghĩa, ví dụ tự giải thích.
- KHÔNG làm phụ đề dịch theo từng video (chủ đã cấm: chồng chéo, khó quản lý). Video chỉ tiếng Anh + phụ đề tiếng Anh; giao diện quanh video theo i18n sẵn có; nghĩa theo ngôn ngữ người học lấy từ lexicon (1 nguồn).
- Nội dung trung tính văn hoá: tên người đa dạng, tiền tệ/đơn vị chung hoặc ghi cả hai, không tôn giáo/chính trị/vùng nhạy cảm, không đùa dựa vào văn hoá một nước; idiom luôn kèm nghĩa đơn giản.
- Lỗi theo tiếng mẹ đẻ (§12.8) nói theo dạng "Many learners say…" – không chê một quốc gia.
- Lịch đăng theo giờ cao điểm từng khu vực; hashtag tiếng Anh + hashtag địa phương do AI chọn.

## 15. Đa dạng kiểu quay – không lộ "dựng hàng loạt" (chủ 22/10)
- **≥ 12 mẫu dựng (shot grammar)** xoay vòng, mỗi template nhiều biến thể: mở bằng cận mặt / trung cảnh / chữ trước người sau / nền trống rồi người bước vào khung (slide-in) / chia đôi màn hình 2 người / người + bảng minh hoạ lớn / "góc phóng viên" ¾ / cận tay + chữ / người nói thẳng ống kính kiểu vlog / "cut-in" phóng to chữ khoá / mở bằng câu đố toàn màn hình / kết bằng tua lại (rewind) câu chính.
- **Chuyển động máy** đa dạng nhưng nhẹ: đẩy vào, kéo ra, trượt ngang (parallax từ độ sâu), nghiêng nhẹ, rung tay cầm rất khẽ (handheld 0,3 %), đổi tiêu cự giả (rack focus) – mỗi clip ≤ 3 kiểu, không lặp chuỗi của 10 clip gần nhất.
- **Nhịp dựng** khác nhau theo template (nhanh 1,5 s / vừa 2,5 s / chậm 3,5 s), chuyển cảnh: cắt thẳng, J/L-cut, match-cut theo cử chỉ, whip-pan nhẹ, không lạm dụng.
- **Bố cục chữ** 6 kiểu (thẻ trên, thẻ cạnh, chữ lớn giữa, bảng 2 cột, danh sách, bong bóng thoại) × 8 bộ màu series.
- **Người dẫn**: 4 người (Ama, Carlos + Mia, Jake khi duyệt) × 2 trang phục × nhiều clip trung tính → ai mở, ai hỏi, ai giải thích luân phiên; có clip 1 người, có clip đối đáp.
- **Âm thanh**: 20+ nhạc nền, 5 bộ SFX, 2–3 giọng chính xoay.
- **QA chống motip**: chữ ký dựng (chuỗi shot + chuyển động + bố cục + màu + người mở) không trùng với 30 clip gần nhất; pHash chuỗi khung chính khác biệt đủ ngưỡng.

## 16. Kho kịch bản viết sẵn (chỉ CHỮ – chủ 22/10)
- **Mục tiêu** 20–30 nghìn kịch bản short viết 1 lần, render dùng dần. KHÔNG dựng, KHÔNG credit Kling, KHÔNG tự đăng (cổng duyệt template vẫn áp dụng).
- **Điểm học = 1 nguồn**: `scripts/scriptbank/lib.mjs` `plan()` tất định từ Cách dùng từ (`web/js/usage`: lỗi hay gặp, cặp dễ nhầm, giới từ, mẫu động từ, trạng từ, cấu trúc), ngữ pháp (câu đố cuối bài), lexicon (từ trong ngữ cảnh, cụm đi kèm, X vs Y theo syn, trọng âm theo IPA Mỹ, nhầm nghĩa) + bảng tình huống. 21.221 điểm, `pid` không trùng; mỗi lô 20 trộn 40/40/20 (dễ/vừa/khó) và đa loại bài.
- **Lược đồ** (không phụ thuộc template): `id pid src type cefr diff topic hook_type point hook wrong right why ex[2] memory quiz{q,options,answer,explain} lines[{who,say}] words est_s (syl stress) qc{flags,judge} gen{model,at}`.
- **Sinh**: CI `script-bank.yml` (07:20 VN) → `scripts/scriptbank/job.mjs` → `/api/lexai` `vgen` (Gemini 3.6-flash → 3.5-flash → 3-flash-preview; mỗi mô hình 20 lượt/ngày/dự án; lời giải giữ 3.8-flash) – 429/503 theo mô hình KHÔNG làm cả khóa nghỉ.
- **QC** (`lib.qc`): đủ trường, hook ≤ 5 từ, why ≤ 14, câu ≤ 14 từ, xen kẽ Ama/Carlos, 18–28 s (156 wpm + nghỉ), tiếng Anh giải thích trong NGSL (≤ 2 từ ngoài), khớp nguồn (từ/cụm đích có trong câu đúng + ví dụ, trọng âm/số âm tiết = IPA, dạng đúng của lỗi hay gặp, đáp án ngữ pháp), chống trùng (câu đúng trùng / 3-gram Jaccard ≥ 0,5) → `vjudge` Llama 3.3 70B CHỈ chấm (≥ 4 vào kho; ≤ 3 → `review.jsonl`); hết neuron → `pending.jsonl`, không vào kho.
- **Lưu**: `content/video/scripts/bank/NNNN.jsonl` (500/mảnh), `review.jsonl`, `state.json`, `summary.json` → `web/data/script-bank.json` → Quản trị › Thư viện video › **Kho kịch bản**.
- **Cổng thí điểm**: `content/video/scripts/config.json` `scale:false` → lịch chỉ chấm hàng chờ; thí điểm chạy tay (`max 100, cap 2`). Chỉ đặt `scale:true` sau khi soát tay ≥ 30 mẫu đạt ≥ 90 % đúng thật và chủ OK. Test: `scripts/test/script-bank.mjs`.
- **Bộ vàng (chủ 22/10, Gemini hết hạn mức + GrabCast lỗi)**: `scripts/scriptbank/gold.mjs` (`plan` → 1.931 điểm phủ đều 8 nhóm × chủ đề × 40/40/20; `next N`; `build`). Nguồn gọn `content/video/scripts/gold/src/*.jsonl` → đủ lược đồ + lời thoại mặc định (`lib.expandLines`: hook ≤ 1,5 s → lỗi → nghỉ đoán → đáp án giữa clip → vì sao → aha → mồi bình luận → lưu/chia sẻ + câu lặp về hook) → QC (`qc` + `qcViral`: 8 công thức hook, điểm hook ≥ 4, không lặp liền) → `bank/gNNNN.jsonl`; bản đọc `out/script-bank/`. Mục `skip` = dữ liệu nguồn sai (vd. IPA lexicon) – sửa lexicon trước.
