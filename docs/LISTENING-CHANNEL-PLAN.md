# Kênh luyện nghe riêng (YouTube dài) – ghi chú kế hoạch (20/10/2026, chưa làm)

**Chủ duyệt:** làm 1 channel RIÊNG cho luyện nghe dạng dài, tách khỏi kênh shorts điện ảnh.

## Mẫu tham chiếu
"Speak English with David & Alice" – 320K sub; video "Improve Your English Just by Listening | 40 Minutes of Real English Listening Practice (B1–B2)" 1,7M view/3 tháng. Hình: 2 ảnh người dẫn ở góc + sóng âm + phụ đề rất to theo câu. Thắng nhờ: video dài nghe nền (watch time, quảng cáo), tiêu đề đúng từ khoá tìm kiếm, hội thoại tự nhiên tốc độ vừa, chi phí ~0.

## Dây chuyền dự kiến (0 credit Kling, 0 token Claude mỗi tập, chạy GitHub Actions)
1. Kịch bản: Gemini miễn phí (khoá xoay vòng sẵn) theo chủ đề × CEFR → cổng tự động: từ vựng đúng cấp (wordlists), ngữ pháp, độ dài, không lặp.
2. Giọng: Kokoro 2 người (Ama af_bella, Carlos am_fenrir hoặc giọng mới), tốc độ tự nhiên, ngắt nghỉ.
3. Hình: Ama + Carlos từ kho footage (ảnh/vòng lặp nhẹ), người nói sáng lên, sóng âm, phụ đề chữ to theo câu, thẻ từ vựng bật đúng lúc, mục lục chương, tóm tắt cuối.
4. Đầu ra: tập 20–40 phút + 3–5 shorts cắt tự động + tiêu đề/mô tả/chương SEO.
5. Đăng: kênh YouTube riêng (chủ tạo kênh + cấp OAuth), lịch tự động.

## Ước tính
Làm dây chuyền 1 lần ≈ 150K token; sau đó mỗi tập 0. Ưu tiên sau khi xong kho footage + chuyển builder lên GitHub.

## Cập nhật ý chủ (20/10): kho "2 người dẫn kiểu BBC" (studio podcast)
Thay ảnh tĩnh bằng **kho clip Kling không tiếng** của 2 nhân vật (Ama + Carlos) ngồi bàn/đứng, cử chỉ tay, gật, cười tự nhiên → ghép khẩu hình theo thoại (mặt chính diện, đầu ổn định = trường hợp ghép miệng chuẩn nhất) → dùng lại vô hạn.
- **Danh sách clip (mỗi bối cảnh ~14 clip):** mỗi người: cận nói ×3 (trung tính / cười / giải thích + tay), nghe-gật ×2, phản ứng (cười, ngạc nhiên) ×2; 2 người: cảnh đôi ×3 (A nói, B nói, cùng cười), toàn cảnh ×1, qua vai ×1/người. **2 bối cảnh** (bàn studio podcast, bàn quán cà phê ấm) để đổi không khí → ~28 clip ≈ 700 credit + ~16 ảnh khung đầu.
- **B-roll:** ~50 ảnh tình huống (Kling Image 1 credit/ảnh: sân bay, siêu thị, văn phòng…) chạy lia/zoom chậm khi kể chuyện.
- **Dựng chuyên nghiệp (luật tự động):** đổi góc mỗi 4–8 s theo câu thoại (người nói = cận/đôi, chèn cảnh người nghe gật/cười), không lặp cùng clip liền nhau, không cắt giữa từ, B-roll khi có câu kể, thẻ từ vựng góc dưới, chương có tiêu đề, tóm tắt cuối.
- **Chi phí:** dựng kho 1 lần ≈ 700–750 credit + ~200K token (gồm cả dây chuyền); sau đó mỗi tập 0 credit, 0 token, chạy GitHub Actions.
- Luật kho chung: khuôn docs/CINE-SCENE-STANDARD.md + kiểm tư thế/logic từng khung đầu (memory kling-prompt-clarity).
