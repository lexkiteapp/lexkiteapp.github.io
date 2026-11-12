# Giữ chân người học – baseline 12/11/2026

> TL;DR: D1 15,3 % · D7 3,5 % · ~3 phiên/người/tuần (người đã quay lại). 85 % khách mới không quay lại ngày +1. Thẻ đo mới ở Quản trị › Phân tích › "Giữ chân theo nền tảng & quốc gia".
> Đọc khi: làm vòng thói quen (Hôm nay, chuỗi, nhắc, quay lại, tổng kết tuần).

**Cách đo** (`functions/api/_retention.js`, op `retention`, test `scripts/test/retention-admin.mjs`): nhóm = máy lần đầu ghé (phiên `ret = 0`) trong 90 ngày; D*N* = có phiên đúng ngày +N (giờ VN); chỉ nhóm đủ tuổi; loại bot (`bot IS NULL`) và vid quản trị; không trả vid/email. D30 chưa đủ tuổi (dữ liệu `sessions` mới ~2 tuần cho nhóm đo được).

## Baseline 12/11 (586 máy mới, 90 ngày)
| Nhóm | Mới | Chạm thật ngày đầu* | D1 | D7 | Phiên/người/tuần |
|---|---|---|---|---|---|
| Tất cả | 586 | 86 % | 15,3 % | 3,5 % | 3,0 |
| Web | 464 | 83 % | 13,8 % | 3,6 % | 3,1 |
| iOS / Android | 48 / 36 | 100 % | 32,6 % / 16,7 % | 3,7 % / 8,3 % | 3,3 / 2,3 |
| PWA | 11 | 100 % | 36 % | 0 % | 3,8 |
| Add-on | 27 | 96 % | **0 %** | 0 % | 2,2 |
| VN | 218 | 84 % | 19,3 % | 5,8 % | – |
| FR / US / JP / GB / IN | 59 / 38 / 36 / 15 / 20 | 79–93 % | 5 % / 8 % / 21 % / 29 % / 10 % | 0–10 % | – |
*≥ 2 trang hoặc ≥ 60 giây. Mẫu nhỏ: nước dưới 40 người chỉ để định hướng.

## 5 điểm rơi lớn nhất (dữ liệu thật; chỗ chưa đo được ghi rõ)
1. **Ngày +1**: 85 % không quay lại. Chưa có gì kéo họ về (web chưa có nhắc/email; Web Push mới bật theo cờ).
2. **Ngày 2–7**: D1→D7 chỉ còn 3,5 %; người quay lại ngày 1 vẫn rụng hết trước tuần đầu → cần mục tiêu ngày + chuỗi dễ thấy ngay ở trang chủ.
3. **Web ngoài VN** (FR 5 %, US 8 %, IN 10 %): vào qua SEO, đọc 1 bài rồi đi; không có "học tiếp" cá nhân hoá. Nhóm CPM cao nên đáng nhất.
4. **Add-on**: D1 = 0 % (27/27 không về) – chỉ tra từ, không có đường về học.
5. **Phiên đầu**: 14 % không chạm thật (nảy); và bước onboarding / bài đầu / sau bài tập sai **chưa có bộ đếm** (chỉ có `ret:*` và funnel thô) → bổ sung đếm ẩn danh theo bước ở PR "Hôm nay" (không PII), đo lại sau 7 ngày.

## Kế hoạch tác động (mỗi PR một việc, đo lại D1/D7 sau ≥ 7 ngày)
a) Tiếp tục + kế hoạch Hôm nay · b) mục tiêu ngày + chuỗi + hồi chuỗi · c) nhắc thông minh (web push; email cần chủ chọn Resend/Brevo + DNS) · d) quay lại 3/7/14 ngày · e) tổng kết tuần.
