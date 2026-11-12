# Phễu kênh: UTM → trang đích → app → bài đầu → D1/D7+ (spec-lite, chủ 12/11)
> TL;DR: Mỗi link bài đăng mang `utm_source/medium/campaign` + `c=<mã bài>`; đo vào trang → quiz → bấm vào app → máy mới vào app → xong bài đầu → quay lại D1/D7+ theo từng nguồn/mã, trong Quản trị › Phân tích › "Kênh & mã bài". Không IP, không PII, loại bot/CI/quản trị.
> Đọc khi: sửa `functions/api/_funnel.js`, beacon `at`/`fl` trong `web/js/app.js`, `web/js/admin-channels.js`, hoặc đặt link cho bài đăng.

- Link chuẩn: `https://lexkite.com/go/<lang>/?utm_source=<tiktok|youtube|facebook|instagram|seo|…>&utm_campaign=<chiến dịch>&c=<mã bài>` (giá trị `[A-Za-z0-9._~-]{1,40}`; giá trị khác bị bỏ).
- Trang đích (`build-go.mjs`) gửi `go_view|go_start|go_done|go_cta` kèm `at` → `ext_events` `fun:<sự kiện>:<nguồn>|<chiến dịch>|<mã>` (trần 600 tổ hợp/ngày).
- App (`app.js`): đọc UTM lúc vào, nhớ `lk.at`; beacon phiên ĐẦU mang `at`; `fl:1` khi máy đó có bài/ôn đầu tiên (lần duy nhất). Máy chủ (`hit.js` → `attrStmts`): máy mới (ret=0) + UTM → `vid_attr` (lượt đầu thắng); máy cũ → đánh dấu D1 (đúng ngày kế) / D7+ (từ ngày 7). ≤ 40 lượt ghi/IP/giờ; dọn >400 ngày.
- Đọc: op `channels` (admin.js, đệm 10 phút, kỳ 7/30/90) → bảng theo nguồn/chiến dịch/mã + tóm tắt hôm qua so với hôm kia. D1/D7+ chỉ tính nhóm đủ tuổi.
- Còn lại: tóm tắt hằng ngày đẩy sang kênh báo (hiện hiển thị trong Quản trị); `/api/go/<nền tảng>/bio` nên trỏ tới `/go/<lang>/` (thuộc phiên social).
