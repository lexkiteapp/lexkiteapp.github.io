# Hệ thống video học – kế hoạch & hàng đợi vòng lặp tự động (21/10/2026)

**Mục tiêu (chủ):** clip học viral, 1 bản tiếng Anh cho mọi quốc gia, phủ mọi chủ đề bài học của web, dễ save/share, kéo người dùng về lexkite.com; chất lượng điện ảnh top 1; **0 credit, 0 token mỗi clip khi scale**; hệ thống nhẹ, miễn phí.

## 1. Phân tích: vì sao clip của mình có thể vượt các kênh hiện tại
| Kênh hiện tại | Điểm mạnh | Điểm yếu mình vượt được |
|---|---|---|
| Ariannita / Giovana (người thật, 1 ý/clip) | cá tính, ngắn | không hệ thống, không có lộ trình, không có bài tập sau clip |
| Jeson & Jenny (hoạt hình hiểu nhầm, 6–8M view) | hài, dễ share | ít chiều sâu học thuật, không dẫn về luyện tập |
| David & Alice (podcast dài) | watch-time, nghe nền | hình tĩnh, ít tương tác |
**Lợi thế Lexkite:** mỗi clip gắn **1 bài học thật trên web** (deep link luyện ngay), dữ liệu khổng lồ sẵn có (9.600 từ CEFR, 77 bài ngữ pháp, 125 lỗi theo L1, đề thi), chuẩn học thuật đã rà soát, QA tự động, chi phí biên 0.

## 2. Định dạng chính (đã duyệt)
1. **Short tình huống** (nhân vật diễn trong bối cảnh) – 9 template, nhịp v3 – kho: cà phê, sân bay, khách sạn, nhà hàng.
2. **Short "bản tin"** – người dẫn phông xanh + ảnh nền tĩnh, máy quay ảo 2.5D + đốm sáng (đang hoàn thiện pilot khách sạn). Không cắt cảnh đóng vai; không cho đồ vật trong ảnh chuyển động.
3. **Kênh luyện nghe dài** (để sau) – docs/LISTENING-CHANNEL-PLAN.md.

## 3. Yếu tố save/share (bắt buộc mọi clip)
Hook ✗/✓ hoặc câu hỏi ≤5 từ · 1 ý/clip · thẻ "Screenshot/Save this" có cấu trúc câu · vòng "Comment A/B" · series đánh số · ảnh bìa chữ to · CTA deep link đúng bài trên web · loop liền mạch.

## 4. HÀNG ĐỢI VÒNG LẶP (làm lần lượt từ trên xuống; xong đánh ✅ + commit)
1. ⏳ Hoàn thiện pilot bản tin khách sạn 100/100 (agent đang chạy) → nếu đạt: chốt template `news`.
2. ☐ **Chuyển builder lên GitHub Actions** (workflow `cine-render.yml`): lấy footage từ repo riêng `lexkite-footage`, dựng + qa5/qa_news, xuất mp4 + bìa làm artifact/R2; Mac không render nữa.
3. ☐ **Bộ sinh kịch bản tự động (0 token):** từ dữ liệu web (`content/wordlists`, `web/js/grammar/*`, `grammar/l1/*`, ecosystem.json, scenes/*.md) → lesson spec theo template; luật kiểm (English đúng, CEFR, ≤15 cps, không trùng ý: sổ `content/video/cine/used.json`). Ý tưởng mới (tuỳ chọn) qua Gemini miễn phí + cùng cổng kiểm.
4. ☐ **Bản đồ phủ chủ đề:** mỗi khu vực web (ecosystem.json) × CEFR → ≥ 5 clip/khu vực; ưu tiên khu vực chưa có clip; CTA deep link đúng bài.
5. ☐ Dựng lại toàn bộ bài 4 cảnh theo English-only + v3 (trên CI).
6. ☐ Lịch đăng + gói đăng (tiêu đề, mô tả, hashtag, bìa) cho TikTok/Reels/Shorts – xuất file sẵn; đăng tự động cần chủ cấp tài khoản.
7. ☐ Cảnh mới (hiệu thuốc, hỏi đường, cửa hàng) – CHỈ khi chủ duyệt credit, theo docs/CREDIT-RULES.md.

## 5. Luật vòng lặp
- Đọc `docs/METHODS.md`, `docs/CREDIT-RULES.md` trước. **Không tiêu credit** nếu chưa có chủ duyệt rõ trong chat.
- Tiết kiệm token: giao việc lớn cho agent (giới hạn token, không agent con), mỗi lần ≤ 2 agent video + 1 agent web; tick không có việc mới thì chỉ kiểm tra trạng thái ngắn.
- Mac mát: render/nặng chạy GitHub Actions.
- Mỗi việc: test → fix → nâng cấp → sao lưu footage → commit (không đụng việc agent khác).
