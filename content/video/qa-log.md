# Nhật ký chấm điểm tài nguyên & video (docs/MEDIA-QA-RUBRIC.md)

| Ngày | Lô | Loại | Credit | Điểm | Ghi chú |
|---|---|---|---|---|---|
| 2026-10-16 | Thiết kế gốc Mia/Leo/Ama | ảnh nhân vật | 36 | Leo 93 · Ama 94 · Mia v4 92 | Mia v1–v3 bị loại (trẻ con / lệch phong cách); chốt ADN: Mia v4 #4, Leo #5, Ama #2; Element "Lexkite Mia" đã tạo |

## 2026-10-16 – Element Kling + bảng biểu cảm (lưới 2x2, đầu-vai, 2K 3:4, 2 ảnh/lần)
- Element đã tạo: Lexkite Mia, Lexkite Leo, Lexkite Ama (ảnh ADN + 3 góc).
- Lưới 3x2 (6 ô) → 87 ✗ (bố cục sai, biểu cảm lệch đề, tay lộn xộn) ⇒ chuyển sang 2x2, ẩn tay.
- Mia bảng 1 (cười, cười lớn, cười gượng, ngạc nhiên): 91 ✓ (bản trái); bản phải 85 ✗ (tóc lệch ô 4).
- Mia bảng 2 (suy nghĩ, bối rối, tự hào, buồn): 90 ✓ (bản trái, có dấu "?" nhỏ – xoá khi tách lớp); bản phải 86 ✗.
- Mia bảng 3 (lườm, hào hứng, đứng hình, sốc): 90 ✓ và 89 (dự phòng) – ô "lườm" bản 1 giống giận.
- Leo bảng 1: 92 ✓ (nền sạch) / 91 (nền ô xám).
- Leo bảng 2 lần 1: 82 / 78 ✗ (mất kính) ⇒ thêm "ALWAYS wears glasses" → lần 2: 90 ✓ (bản giữa) / 80 ✗.
- Bài học: phụ kiện nhận diện (kính, kẹp tóc) phải nhắc "in every panel"; cấm "symbols/question marks"; tham chiếu Element bị gỡ sau mỗi lần tạo → gắn lại mỗi lượt.

## 2026-10-16 – Nhân vật mới + clip chuyển động
- Diane (DNA): lần 1 = 80 ✗ (da sáng, trông ~65 tuổi) → nhấn "DEEP BROWN SKIN, middle-aged not elderly" → 90 ✓ (bản trái).
- Carlos (DNA, tham chiếu phong cách = Diane): 91 ✓ (bản giữa: ngón cái, ria, tạp dề).
- Clip Kling 2.5 Turbo 1080p 5 s = 25 credit (Kling 4.0 = 67, O1 = 40). Không có 3 s ở 1080p → mỗi clip 2 hành động, cắt đôi.
- Mia idle: 92 ✓ (tách nền từng khung isnet-anime + làm mượt mask theo thời gian, ghép phòng không nhấp nháy).
- Mia gật đầu → cười che miệng: 91 ✓ (chân giữ yên, đúng trang phục; cắt tại ~2,4 s).
- Workers AI FLUX schnell (bảng đạo cụ phòng khách): ~70 – nét kiểu stock, đồ chồng nhau → chỉ dự phòng cho đạo cụ/phòng, không dùng cho nhân vật.
- Thư viện chuyển động (2 hành động/clip, cắt đôi): Mia 7 clip (idle 92, gật+cười 91, vẫy+ngón cái 90, nói+chỉ 90, nhún vai+khoanh tay 90, sốc 84*, suy nghĩ 84*) · Ama 6 clip 88–91 · Leo 3 đạt (suy nghĩ 90, sốc 90, nói 88) + 3 làm lại (bản đầu gần như đứng yên vì ảnh khung đầu đang giơ tay → tạo ảnh Leo tư thế trung tính 91 làm khung đầu).
- Lỗi quy trình: 2 clip Mia ra nhân vật khác (ảnh khung đầu chưa gắn kịp, chờ 3 s) → luật: sau khi tải ảnh chờ ≥ 6 s và soi khung đầu trước khi bấm tạo. Khung đầu phải ở tư thế trung tính (tay buông) để chuyển động rõ.
- 17/10: Diane nói+chỉ 89, hoài nghi+ôm trán 90 ✓; Diane suy nghĩ+cười & gật+ngón cái ✗ (gần như đứng yên). Carlos vẫy+ngón cái 91, nói+cười 89, ngạc nhiên+nhún vai 88 ✓. Leo gật+cười lần 3 ✗ (tóc biến thành buộc đuôi – Kling 2.5 lỗi lặp lại với hành động cười ngả đầu → bỏ hành động này cho Leo, dùng "think_idea"/"talk_point" thay).
- Tổng thư viện đạt: Mia 7, Ama 6, Leo 5, Diane 2, Carlos 3 = 23 clip (46 đoạn hành động).
- Tận dụng clip loại (không phí credit): Leo gật lần 3 → cắt 0–1,2 s trước khi tóc biến dạng = "leo_nod_short" (gật nhanh khi nghe); Diane suy nghĩ+cười (chuyển động nhẹ) → "diane_idle_listen" (đứng nghe/idle – Diane còn thiếu idle); Diane gật+ngón cái yếu → "diane_nod_handsonhips" (nửa đầu gật nghe, nửa sau chống hông tự tin). Clip "ít chuyển động" vẫn có giá trị làm vai NGƯỜI NGHE.
- Luật tiết kiệm: (1) Leo tránh hành động ngả đầu ra sau; (2) prompt luôn có "big clear motion"; (3) mỗi clip mới phải ghi trước vai nói/nghe dự kiến – clip ít động gán vai nghe thay vì loại.
- 17/10 phòng đủ nội thất (9:16, tham chiếu style-ref): phố NY a 90 / b 91 · phỏng vấn a/b 92 · siêu thị a 91 / b 92 · sân bay b 90 (a ✗ biển chữ vô nghĩa "ꟽA8d") · phòng họp a 92 (b ✗ bàn chắn giữa sàn) · thư viện a/b 93 · căn hộ a/b 91 · cà phê a/b 91. Sảnh khách sạn chưa ra (bấm tạo không nhận) → làm lại.

## 18/10/2026 – Trang phục mới (casual/travel) cho kịch bản nhập vai
- `chars/diane/green-casual.png` – Kling Image 3.0 từ `chars/diane/green.png` (2 ảnh, 2 credit): chọn ảnh cardigan teal dệt kim + quần jean navy + giày trắng. Nhận diện giữ đúng (tóc xoăn lọn bạc, kính đỏ, khuyên vàng, đồng hồ). Bỏ ảnh blazer xanh mint (sát màu phông). Soi tách nền magenta (luật chroma_key): áo teal giữ nguyên. **QA 92 – approved.**
- Clip thử `diane_talk_gesture_casual` (Kling 2.5 Turbo 1080p 5 s, 25 credit) – chờ kết quả, dựng thử trên CI trước khi làm lô.
- `chars/mia/green-casual.png` (áo khoác jean + áo coral + jean đen) QA 92 · `chars/mia/green-travel.png` (áo phao vàng mù tạt + áo trắng + jean xanh) QA 92 – lần 1 lấy ảnh công sở làm tham chiếu thì Kling giữ dây thẻ + quần teal → lấy ảnh casual làm tham chiếu là sạch.
- `chars/carlos/green-travel.png` (bomber navy + áo trắng + kaki) QA 92 – AI giám khảo báo "mất ria/identity drift" do so với DNA tạp dề; soi tay 3 mặt cạnh nhau: ria + mặt giữ đúng → nhập --no-vision (ảnh gốc trang phục mới).
- Clip Diane casual: talk_gesture (0–1,7 s), listen_thumbs (5 s), q_talk_nod ¾ trái (0–4,2 s) – QA 91. Video thử lớp học 75/75. Lô Mia casual 4 clip QA 92 (chân trôi ≤ 0,6 %).
- Bài học Kling: prompt "From the waist down she stays completely still like a statue… knees straight, hips level" giữ chân đứng yên cả 5 s (trước đó đổi trụ chân sau ~2 s). Kling hay ra hướng ¾ TRÁI dù ghi phải → dùng clip facing:left.
- (20/10/2026) **Pilot bối cảnh sân bay (quầy check-in), 66/80 credit:** nhân vật mới Mei (nhân viên quầy, tóc bob đen, blazer tím mận + khăn vàng mù tạt; giọng Kokoro af_sarah) – ref QA 92. Khung đầu Kling Image 3.0: master 90 (Mei hơi chính diện), OTS→Mei 93, OTS→Ama 92. Clip a01_ots_mei_talk 92 (track cc ≥ 0,83), a02_ots_ama_talk 91 (cc ≥ 0,86). Video thử `out/cine-airport-pilot-vi.mp4` 27,3 s – qa5 ALL PASS; thang điện ảnh: hình 88, diễn 85, âm 80, dựng 82, chữ 92, nội dung 90, hook 84 → chưa đăng (chỉ 2 góc máy, thiếu insert/âm thanh hành động) – cần bộ cảnh đầy đủ.
- (20/10/2026) **Bank sân bay đầy đủ v1 (249 credit, trần 320):** 6 khung đầu mới (mcu, passport, scale, printer, entrance, exit; loại passport-3 vì 4 bàn tay, passport-1 vì 3 bàn tay). 9 clip mới: b01 master 90 (chỉ làm vai nghe), a03 92, a04 90, a06 react 91, a07 MCU 92, i01 hộ chiếu 92 (chỉ 0–2,9 s; từ khung 72 tay thứ 2 của Mei xuất hiện), i02 cân/băng chuyền 92, e01 vào 90 (đi ngắn), e02 ra 92; + s01 máy in (ảnh tĩnh đẩy máy, 0 credit) 90. Bài `cine-airport-checkin-vi.mp4` 38,8 s và `cine-airport-bags-vi.mp4` 36,0 s: qa5 ALL PASS; thang điện ảnh mỗi bài: hình 91, diễn 88, âm 88, dựng 91, chữ 92, nội dung 92, hook 88.
- (20/10/2026) **Rà lỗi tiềm ẩn 2 bài sân bay (0 credit):** tiếng bánh vali kéo 2,6 s nhưng vali chỉ lăn 0,8 s (khung 0–19) → sửa; tiếng bíp cân không có sự kiện (màn hình cân trong clip Kling không đổi) → dựng i02b_scale_read (thanh sáng dần, bíp đúng 0,79 s); tiếng băng chuyền khớp khung 45 (vali bắt đầu trôi); bỏ tiếng máy in (ảnh tĩnh, không in); tiếng chuông PA lặp lần 2 rơi vào màn kết → nền 44 s, chuông 1 lần; tắt nền sớm hơn (màn kết ≤ −42 dBFS). Hook đổi sang thẻ sai/đúng. qa5 ALL PASS cả 2; thang điện ảnh: hình 91, diễn 88, âm 90, dựng 91, chữ 92, nội dung 92, hook 90.
- (20/10/2026) **Clip diễn xuất sân bay (54/75 credit):** khung otsmei_pass (Mei đặt tay lên 1 thẻ lên máy bay) 90; a08_mei_pass 90 (soi từng khung: 1 thẻ, ngón không xuyên thẻ, 2 tay; thẻ chính là nhãn trắng trên mặt quầy ở a01/a03 → sau a08 không quay lại a01/a03), a09_ama_thanks 91. Ghép vào 2 bài: checkin 39,7 s, bags 38,3 s, qa5 ALL PASS (qa5 nay tính lỗi khi > 40 s – trước chỉ in chữ FAIL). Thang điện ảnh: hình 91, diễn 90, âm 90, dựng 91, chữ 92, nội dung 92, hook 90.
- (20/10/2026) **Cảnh 3 khách sạn – 1 lượt theo CINE-SCENE-STANDARD (378/430 credit):** ref Daniel + 8 khung đầu (28 cr), 14 clip (350 cr), clip dự phòng không dùng. Điểm clip: master 91, Daniel nói 92/91, Ama nói 90/90 (chỉ khung 0–38, sau đó lệch bám miệng), MCU 92, oops 91, cảm ơn 90, Daniel gật 92, phong bì 90 (chỉ 0–56, sau đó phong bì biến hình), chuông 92 (chạm khung 63), máy mã hoá 91 (thẻ vào khe khung 64), đi vào 92, đi ra 91. 8 bài `out/cine-hotel-1..8-vi.mp4` (24–34 s) qa5 ALL PASS, −16,0…−16,4 LUFS. Điện ảnh: hình 91, diễn 90, âm 90, dựng 91, chữ 92, nội dung 92, hook 90.
