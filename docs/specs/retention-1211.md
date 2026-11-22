# Giữ chân người học – baseline 12/11/2026

> TL;DR: D1 15,3 % · D7 3,5 % · ~3 phiên/người/tuần (người đã quay lại). 85 % khách mới không quay lại ngày +1. Thẻ đo mới ở Quản trị › Phân tích › "Giữ chân theo nền tảng & quốc gia".
> Đọc khi: làm vòng thói quen (Hôm nay, chuỗi, nhắc, quay lại, tổng kết tuần).

**Cách đo** (`functions/api/_retention.js`, op `retention`, test `scripts/test/retention-admin.mjs`): nhóm = máy lần đầu ghé (phiên `ret = 0`) trong 90 ngày; D*N* = có phiên đúng ngày +N (giờ VN); chỉ nhóm đủ tuổi; loại bot (`bot IS NULL`) và vid quản trị; không trả vid/email. D30: chưa có nhóm nào đủ tuổi (hiện 0 máy).

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
2. **Ngày 2–7**: D7 chỉ 3,5 % cả nhóm; người quay lại ngày 1 vẫn rụng dần trước hết tuần đầu → cần mục tiêu ngày + chuỗi dễ thấy ngay ở trang chủ.
3. **Web ngoài VN** (FR 5 %, US 8 %, IN 10 %): vào qua SEO, đọc 1 bài rồi đi; không có "học tiếp" cá nhân hoá. Nhóm CPM cao nên đáng nhất.
4. **Add-on**: D1 = 0 % (27/27 không về) – chỉ tra từ, không có đường về học.
5. **Phiên đầu**: 14 % không chạm thật (nảy); và bước onboarding / bài đầu / sau bài tập sai **chưa có bộ đếm** (chỉ có `ret:*` và funnel thô) → bổ sung đếm ẩn danh theo bước ở PR "Hôm nay" (không PII), đo lại sau 7 ngày.

## Kế hoạch tác động (mỗi PR một việc, đo lại D1/D7 sau ≥ 7 ngày)
a) Tiếp tục + kế hoạch Hôm nay · b) mục tiêu ngày + chuỗi + hồi chuỗi · c) nhắc thông minh (web push; email cần chủ chọn Resend/Brevo + DNS) · d) quay lại 3/7/14 ngày · e) tổng kết tuần.

## 22/11 – đo lại + phễu lần đầu
Số thật 38 ngày (người thật, bot loại; D1 = có phiên đúng ngày +1, D7 = đúng ngày +7):

| Nền tảng | Máy mới | D1 | D7 |
|---|---|---|---|
| web | 645 | 11,4 % | 6,0 % |
| iOS | 93 | 23,9 % | 4,6 % |
| Android | 49 | 16,3 % | 8,7 % |
| PWA | 14 | 36 % | 8 % |
| add-on | 32 | 0 % | 0 % |

- **Chỗ rơi lớn nhất:** ~39 % máy mới kết thúc phiên đầu khi vẫn ở Welcome/thiết lập (web 18–64 s, iOS 12 s), D1 nhóm này 5–10 %. Người học lâu phiên đầu (luyện 13 phút, ngữ pháp 30 phút) cũng chỉ ~11–28 % quay lại → thiếu lý do quay lại ngày mai.
- **Gốc lỗi đã sửa:** cờ `ux1` = 100 % nên đường học chính là lesson engine (màn kết `.lsn-end`), nhưng nó không phát `lexkite:practice-done` → `remind.js` không bao giờ hỏi bật nhắc sau bài đầu. Nay `remind.js` nhận màn kết bài học (công tắc khẩn `/api/config` `rem_lsn` = `'0'`). `hab:plan_done` = 0 trong 14 ngày cùng nguyên nhân gốc: người học xong bài ở lesson engine.
- **Phễu mới** (`hit.js` `ONB_EV`, đếm `hab:*` 1 lượt/máy/ngày, thẻ Quản trị › Phân tích "Phễu lần đầu"): `onb_welcome` → `onb_s_<bước>` → `onb_done` → `first_win` (xong bài/lượt luyện đầu tiên, máy đã học từ trước = `lk.fw` `'old'`, không tính) → `fw_d1` / `fw_d7` (mở lại đúng ngày +1/+7 sau bài đầu). Cửa sổ 7 ngày nên D7 sau bài đầu chỉ là xấp xỉ; so trước/sau theo ngày phát hành (không chia nhóm %).
- **Web Push (việc cấu hình, chưa làm):** `PUSH_PCT` (bí mật Pages, đang 10) cần nâng lên 100 theo luật ship 100 % – công tắc khẩn = đặt lại 0. 90 % máy web bật nhắc hiện chỉ nhận nhắc khi tab đang mở.
