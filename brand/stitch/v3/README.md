# Stitch v3 – kho mẫu (2/11)

Mẫu Stitch sáng + tối cho mọi màn còn viết tay, bản vẽ lại sửa lỗi new-ui-qa (#172), 3 phương án cho màn yếu, bản tiếng Đức/Ả Rập (RTL) và trạng thái rỗng/lỗi/tải.
Chỉ là **mẫu**: việc port vào màn thật do phiên chủ màn làm theo [docs/STITCH-V2-PORT.md](../../../docs/STITCH-V2-PORT.md).

- Sinh: `node scripts/stitch/queue-v3.mjs > out/stitch/v3/queue.json && node scripts/stitch/batch.mjs out/stitch/v3/queue.json` (3 khoá, tự xoay, chạy lại = tiếp tục; credit ở out/stitch/v3/CREDITS.md).
- Đưa vào repo: `node scripts/stitch/import-v3.mjs` → `<surface>/<màn>-light|dark.html` + `.index.txt` (id sáng/tối, khoá, verdict).
- QC máy (CI Stitch quality QC, `--all --strict-layout`): tương phản pixel 4.5/3, bản tối không mảng sáng, tràn ngang, chạm ≥ 44px. Verdict `PASS`/`PICK` = đạt (gác đỏ); `QC` = còn lỗi, ghi ở cột ghi chú → sửa bằng `edit_screens`.
- Ảnh ghép duyệt nhanh: `python3 scripts/stitch/contact-sheet.py out/stitch/v3`.
