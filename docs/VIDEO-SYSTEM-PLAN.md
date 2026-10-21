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
1. ⏳ Hoàn thiện pilot bản tin khách sạn 100/100 → chốt template `news` (v4: khung từ ngực trở lên, cân tỉ lệ 2 host, vùng bố cục không chồng chéo, render trên CI).
1b. ⏳ **Chủ duyệt 21/10: 350 credit Kling trong ngày** cho ảnh bối cảnh + tài sản phù hợp (theo CREDIT-RULES): thư viện ~25–40 ảnh nền (≤70 cr) → `brand/library/cine/anchor/bg/index.json`; Ama ĐỨNG trên phông xanh nếu khung ngực-trở-lên vẫn không đạt (thử 1 clip trước, ≤125 cr); dự phòng còn lại cho template news đa dạng.
1c. ☐ Template news đa dạng (≥6 kiểu: 3 câu cần biết, sai→sửa, A/B, điền từ, 3 cách nói, POV) + soát từng khung/voice/sub tự động, chạy trên CI.
2. ✅ **Builder trên GitHub Actions** (21/10): workflow `cine-render` (`.github/workflows/cine-render.yml`, builder `scripts/cine/`). Chạy: Actions → cine-render → Run workflow (scene `hotel|cafe|airport|restaurant|anchor`, lessons `hotel_tpl_choose,hotel_1:vi` hoặc `all`, lang `en`, viral bật, outsuf `-v3`) hoặc API `POST /repos/lexkiteapp/lexkiteapp.github.io/actions/workflows/cine-render.yml/dispatches`. Ra artifact `cine-<scene>-<số>` (mp4 + bìa + log qa5/timeline, giữ 14 ngày); job đỏ nếu qa5 có FAIL. Footage lấy sparse từ `lexkite-footage` qua deploy key chỉ-đọc (secret `FOOTAGE_DEPLOY_KEY`). Kiểm 21/10: hotel_tpl_choose en v3 22,21 s + hotel_1 vi 33,92 s + cafe latte vi 32,42 s = trùng độ dài bản Mac, qa5 ALL PASS. Tin `news` (qa_news) thêm sau khi pilot chốt.
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
