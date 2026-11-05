# LUẬT BẮT BUỘC khi tiêu credit (Kling / mọi dịch vụ trả phí) – chủ duyệt 20/10/2026

> TL;DR: Luật bắt buộc khi tiêu credit (Kling/dịch vụ trả phí): làm hết phần 0 credit trước, phân tích, dry-run, thử 1 cái, hỏng 2 lần thì dừng. Chủ duyệt 20/10/2026.
> Đọc khi: TRƯỚC mọi việc tốn credit.

> Chủ: "không lãng phí credit tạo lỗi liên tục, phân tích chuẩn chỉnh chất lượng khi làm bất cứ gì". Mọi agent (Claude, Antigravity) PHẢI làm đúng thứ tự dưới đây. Vi phạm = dừng việc, báo lại.

## 1. Trước khi tiêu bất kỳ credit nào
0. **Chủ duyệt rõ trong chat** con số credit cho đúng việc đó; chưa duyệt = không tiêu.
1. **Làm hết phần 0 credit trước** (sửa bố cục, chuyển cảnh, phụ đề, nội dung, dựng lại bằng tài sản sẵn có). Chỉ tiêu credit cho thứ không thể làm bằng tài sản hiện có.
2. **Viết phiếu phân tích** (ghi vào ledger của cảnh trước khi gửi): mục tiêu, vì sao cần, câu lệnh đầy đủ, ảnh/khung đầu dùng, tiêu chí đạt (tư thế, tỉ lệ, đạo cụ, không chữ/logo, không người/tay thừa, đúng 180°, tách nền được), số credit dự kiến.
3. **Kiểm tra script trước khi chạy thật:** in ra đúng lệnh sẽ gửi (dry-run) và đọc lại – từng có lỗi script làm mất 43 + 50 credit (prompt bị ghi đè bằng đường dẫn ảnh; vòng lặp zsh đánh số mảng từ 1 → gửi clip không có hành động).
4. **Ảnh chuẩn trước, clip dùng chính ảnh chuẩn đó** (chủ 05/11): ảnh (1–2 credit) phải đạt mọi tiêu chí + cổng (`check_first.py`/`qc_green.py still`) trước khi tạo clip (25 credit), rồi đưa ảnh đạt vào clip làm khung đầu/khung cuối (`--tailImage`) – không để Kling tự chế tư thế. Prompt chuẩn: một động tác, khoá môi/khoá vị trí lặp lại, danh sách cấm, dry-run.

## 2. Khi tiêu
5. **Thử 1 cái trước** (1 ảnh / 1 clip / 1 plate), soát từng khung, đạt mới làm cái tiếp theo – **lần lượt từng cái**, không gửi cả lô.
6. **Hỏng 2 lần liên tiếp → DỪNG**, phân tích nguyên nhân, báo chủ. Không thử mò.
7. **Có trần credit cho từng việc**, ghi trước trong phiếu; chạm trần → dừng, báo.

## 3. Sau khi tiêu
8. Ghi ledger: credit, kết quả đạt/hỏng, lý do hỏng, bài học → nếu là bài học chung thì thêm 1 dòng vào `docs/METHODS.md`.
9. Soát bằng mắt người (tờ ảnh ghép) mọi kết quả trước khi đưa vào bài hoặc gửi chủ; chỉ dùng kết quả ≥ 90 (`docs/MEDIA-QA-RUBRIC.md`).

## 4. Cách gọi Kling (một chỗ duy nhất)
- Công cụ `kling` = gói chính thức `@klingai/cli-global` (client MCP mỏng), đăng nhập tài khoản Kling của chủ → trừ **credit tài khoản**, KHÔNG phải API trả phí riêng (api.klingai.com). Số dư: `kling account` → `availableRemainCredits`.
- Env `KLING_HOME=~/.config/kling NODE_USE_ENV_PROXY=1`; ảnh tham chiếu đưa lên lexkite-media rồi dùng URL raw (tải file thẳng bị chặn).
- ⛔ **Không tách nền/upscale/interp clip trên máy** (28/10 máy chủ quá tải, load 49): `clip1.sh` chỉ đẩy clip Kling gốc; chuẩn bị chạy CI `green-prep.yml` → `matte-pro.yml` (`prep.sh` tự chặn ngoài CI).
- Luôn qua bộ bọc `scripts/video/bank3d/` (tên cũ; nhân vật nay CHỈ 2D – METHODS §0): `check_first.py` (ảnh khung đầu) → `send2.sh` (dry-run, sàn `CAPMIN`, ledger, câu khoá vị trí) → `qc2.py` + tờ ảnh.
- **Gesture bank phông xanh** (`docs/specs/teacher-rive-rig.md`): `qc2.py`/`check_first.py` chỉ cho nền bảng trắng → dùng `qc_green.py still|clip` (khung, chân đứng yên, nền sạch, không cắt khung, miệng khép, khớp khung đầu/cuối). Clip làm `first = khung khoá tay xuôi → TAIL = ảnh tư thế đã duyệt` (`vsub.sh`, biến `TAIL` → `--tailImage`): không có khung cuối, Kling tự chế cử chỉ khác (05/11, hỏng 25 cr).

Liên quan: `docs/VIDEO.md` (hiện hành), `docs/archive/CINE-SCENE-STANDARD.md` (khuôn cảnh 1 lượt, soát tư thế §3), `docs/MEDIA-QA-RUBRIC.md` (chỉ dùng ≥ 90).
