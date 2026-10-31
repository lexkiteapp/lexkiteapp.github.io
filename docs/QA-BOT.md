# QA-BOT – bot QA tự động trên CI
> TL;DR: `scripts/test/qa-bot.mjs` chơi hành trình học thật (sandbox) + quét lỗi giao diện ẩn 390/768/1440 × sáng/tối + hiệu năng + dung lượng; PR có ảnh trước/sau. Chỉ chạy trên CI.
> Đọc khi: thêm màn/tuyến mới, sửa giao diện app, bot đỏ.

## Chạy ở đâu (`.github/workflows/qa-bot.yml`)
- PR đụng `web/**`: dist của PR (hermetic, `/api/*` = `{}`, host ngoài rỗng) → job `bot`; job `before-after` build nhánh gốc, chụp cùng trạng thái, so ảnh (`qa-bot-diff.mjs`) + so lỗi (mới / đã sửa) → summary + artifact `qa-bot-diff`.
- Sau mỗi `Pages deploy` thành công → lexkite.com live; sau mỗi `Preview site` → site preview. Tay: Run workflow với `base_url`.
- Đỏ → `ci-triage` mở issue `ci-failure`.

## Kiểm gì
1. **Hành trình** (390 sáng + 1440 tối, người dùng sandbox mới): thiết lập → bài học (đúng + sai, bỏ qua, nghe, làm lại, back) → ôn thẻ đến hạn → luyện → kỹ năng → thi thử/kiểm tra trình độ → tôi/tiến độ → đổi Tối/Sáng (lưu) → back 2 bước + tải lại. Mỗi bước: 0 lỗi console/exception/unhandledrejection, 0 request cùng nguồn ≥ 400 / hỏng, không màn trống/kẹt; XP tăng, XP hôm nay > 0, thẻ đến hạn giảm.
2. **Đầu dò** (`qa-bot/detect.js`, 13 trạng thái gồm cờ ux1): `hscroll` · `clip` (khung cắt chữ/link) · `spill` (lòi khỏi aside/nav/thẻ) · `offscreen` · `covered` (bị đè) · `align` (cột trái máy tính: mục menu / chân thanh bên cùng mép nội dung ± 4 px) · `indicator` (vạch đang chọn rời viên thuốc > 2 px) · `tap` < 44 px (trừ link trong đoạn văn) · `contrast` (axe color-contrast, như `contrast.mjs`) · `cls` > 0,1.
3. **Hiệu năng** (390, 1440, bấm tab 2 vòng): FPS chuyển tab, INP, long task. 4. **Dung lượng** sau N bài (mặc định 3).

## Ngân sách (chỉ được siết)
CLS ≤ 0,1 · INP đỏ > 500 ms (cảnh báo > 200) · long task đỏ > 500 ms (cảnh báo > 200) · FPS đỏ < 30 (cảnh báo < 50) · localStorage ≤ 2,5 MB, tăng ≤ 32 KB/bài · IndexedDB tăng ≤ 256 KB/bài.

## Baseline (ratchet)
`scripts/test/qa-bot-baseline.json` = lỗi giao diện đã có lúc bật bot (chữ ký `loại|phần tử`). Lỗi MỚI ngoài baseline → đỏ; dòng baseline không còn tái hiện → đỏ "baseline cũ" (xoá dòng đó trong PR sửa). Không bao giờ THÊM dòng để làm xanh. Artifact `qa-bot` luôn có `baseline-seen.json` (lỗi đang thấy) để đối chiếu.

## Thêm màn mới
Thêm `[tên, '/hash']` vào `STATES` trong `qa-bot.mjs`; hàng cần thẳng nhau → `ALIGN`.
