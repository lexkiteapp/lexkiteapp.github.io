# Kế hoạch tăng trưởng SEO 15 quốc gia – 6 tháng (17/10/2026 → 04/2027)

> TL;DR: Kế hoạch tăng trưởng SEO 15 quốc gia 6 tháng (17/10/2026→04/2027): mục tiêu, nhịp đăng, nội dung theo nước, trang công cụ, đo lường. Bổ sung SEO-PLAN.md.
> Đọc khi: lên kế hoạch nội dung SEO.

## 0. Hiện trạng (17/10)
| ngôn ngữ | đã đăng | chờ đăng | hết bài sau |
|---|---|---|---|
| vi | 8 | 75 | 31/12 |
| en | 2 | 37 | 23/11 |
| es, id, ja | 2 | 7 | 06/11 |
| pt | 0 | 4 | 27/10 |
| ar, de, fr, hi, ko, ru, th, tr, zh | 0 | 3 | 24/10 |

Pipeline đăng tự động chạy đúng (blog-publish mỗi giờ, IndexNow + WebSub + sổ băm). Vấn đề: **kho bài 13 ngôn ngữ quá mỏng** – sau 24/10 nhiều nước không còn bài mới.

## 1. Mục tiêu thực tế
- **Tháng 3:** mỗi ngôn ngữ ≥ 40 bài chất lượng (vi/en ≥ 100); top 10 cho từ khóa dài (long-tail) ở cả 15 nước; Google index ≥ 80 % trang.
- **Tháng 6:** mỗi ngôn ngữ ≥ 80 bài + trang công cụ; top 3 cho hàng trăm từ khóa dài mỗi nước; bắt đầu lọt top 10 từ khóa trung bình ("ielts listening tips" bản địa…).
- Từ khóa đầu (vd. "học tiếng Anh", "learn English") cần 9–12 tháng + liên kết ngoài – không hứa trong 6 tháng.

## 2. Nhịp đăng
| giai đoạn | vi, en | es, pt, id, ja, ko, hi, ar (thị trường lớn) | zh, fr, de, ru, th, tr |
|---|---|---|---|
| Tháng 1 | 1 bài/ngày | 3 bài/tuần | 3 bài/tuần |
| Tháng 2–3 | 1 bài/ngày | 5 bài/tuần | 4 bài/tuần |
| Tháng 4–6 | 1 bài/ngày | 1 bài/ngày (nước có tín hiệu GSC tốt) | 4–5 bài/tuần |
→ Cần sản xuất **≈ 45–60 bài/tuần**. `blog-schedule` tự rải đều, giờ cao điểm địa phương, ≤ 1 bài/ngày/ngôn ngữ, cùng cụm cách ≥ 7 ngày.

## 3. Nội dung theo nước (từ khóa bản địa, không dịch máy)
| nước | trọng tâm kỳ thi / nhu cầu |
|---|---|
| ja, ko | TOEIC (Part 5/7, từ vựng), 英検/토익스피킹, phát âm L/R, F/P |
| zh | 雅思, 四六级, 托福 |
| hi, ar | IELTS (du học, định cư), nói tự nhiên, phát âm |
| es, pt | IELTS/TOEFL/Cambridge, phrasal verbs, phát âm -ed, false friends |
| id, th | IELTS, TOEFL ITP, TOEIC, giao tiếp công sở |
| de, fr | Cambridge (B2 First/C1), IELTS, false friends |
| ru, tr | ЕГЭ/IELTS · YDS/YÖKDİL, ngữ pháp thì |
Cơ cấu mỗi nước: evergreen ≥ 1/3 · luyện thi ≥ 1/3 · giao tiếp/công sở. Mỗi cụm = 1 bài trụ cột + 6–10 vệ tinh liên kết hai chiều.

## 4. Đòn bẩy lớn nhất: trang công cụ có giá trị thật (programmatic, KHÔNG phải trang mỏng)
- **Chia động từ:** 300 động từ thông dụng × 15 ngôn ngữ (vd. "conjugación del verbo go en inglés", "動詞 go 活用"), mỗi trang có bảng thì, ví dụ có âm thanh, lỗi hay gặp giải thích bằng tiếng bản địa. Ra mắt từng đợt 50 trang/ngôn ngữ/tuần, theo dõi index; trang chưa đủ giá trị = noindex.
- Động từ bất quy tắc, cấu trúc ngữ pháp, chủ đề từ vựng, bài mẫu IELTS – bản địa hóa phần giải thích.
- Công cụ miễn phí (chia động từ, sửa ngữ pháp, tra từ) = nam châm liên kết ngoài tự nhiên.

## 5. Kỹ thuật & đo lường
- Đã có: hreflang, sitemap theo ngôn ngữ, JSON-LD Article/FAQ, IndexNow, WebSub, canonical, WAF chặn cào bài, sổ băm bằng chứng.
- Hằng tuần: báo cáo GSC theo ngôn ngữ (index, hiển thị, nhấp, vị trí) → bài CTR thấp viết lại tiêu đề/mô tả; bài vị trí 8–20 bổ sung nội dung + liên kết nội bộ.
- Core Web Vitals blog xanh; ảnh WebP/AVIF; không pop-up chặn đọc.
- Video shorts (Kling + pipeline) dẫn link về bài/công cụ; không mua liên kết, không spam diễn đàn.

## 6. Ai làm
- **Antigravity:** B3 đợt 3 (13 ngôn ngữ × 6 bài) → các đợt tiếp theo 3–5 bài/tuần/ngôn ngữ theo bảng trên.
- **Claude (phiên chính + agent nội dung):** lập bản đồ từ khóa từng nước, viết song song khi Antigravity không kịp nhịp, nghiệm thu mọi bài (blog-check 0/0, dupes, alt ảnh, qualityScore ≥ 92), xếp lịch, trang công cụ programmatic, báo cáo GSC.
- Cổng chất lượng không đổi: tự viết 100 %, không dịch máy, không hứa tính năng app không có.

## 7. Mốc kiểm tra
| ngày | kiểm |
|---|---|
| 24/10 | 13 ngôn ngữ có lịch tới ≥ 15/11 (đợt 3 xong) |
| 15/11 | ≥ 15 bài/ngôn ngữ; trang chia động từ đợt 1 (en, vi, es, pt, id) |
| 15/12 | ≥ 30 bài/ngôn ngữ; GSC: mọi ngôn ngữ có hiển thị |
| 15/01 | ≥ 40 bài/ngôn ngữ (mục tiêu tháng 3) |
| 04/2027 | ≥ 80 bài/ngôn ngữ + công cụ; đánh giá top long-tail từng nước |
