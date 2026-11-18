# Health board – máy gác "hỏng âm thầm"

> TL;DR: `health-board.yml` chạy hằng ngày (08:23 VN), liệt kê workflow TẮT / ĐỎ / QUÁ HẠN cron / SẢN LƯỢNG 0 vào issue cố định "Sức khoẻ hệ thống" (nhãn `health-board`); có mục critical/high → job đỏ. Cùng logic ở máy: `node scripts/ops/health-board.mjs`.
> Đọc khi: thêm workflow sản xuất (phải khai báo sản lượng), tắt/bật workflow, hoặc thấy job health-board đỏ.

## Vì sao
17/11: SEO ra 0 việc, social "tạo 0", social-coverage đỏ 4/4 – workflow "xanh" nhưng không ra gì. Mã thoát không đủ; phải đo SẢN LƯỢNG (cũng là luật METHODS §4).

## Quy tắc
- **Mức**: 🔴 critical = đỏ 3/3 lượt gần nhất, hoặc sản lượng 0; 🟠 high = đỏ 2/3, tắt không chủ/quá hạn, dưới sàn, cron quá hạn; 🟡 warn = đỏ 1/3, thiếu bản ghi sản lượng khi chưa có lượt xanh.
- **Tắt có chủ**: workflow cố ý tắt phải có dòng trong `infra/health-expected-off.json` (`owner`, `due`, `why`). Quá `due` = đỏ lại. Không tắt workflow để "sửa" lỗi.
- **Sản lượng**: workflow sản xuất gọi `node scripts/ci/record-yield.mjs <id> <n> --unit <đơn vị>` trước bước commit (file `reports/yield/<id>.json` đi cùng commit dữ liệu). Sàn/cửa sổ khai ở `infra/yield-floors.json` (chỉ nâng, không hạ để qua cổng). Workflow có sàn mà không có bản ghi trong cửa sổ = cảnh báo/đỏ.
- **Job đỏ**: `health-board` thoát 1 khi có critical/high → điều phối thấy ở tab Actions + thông báo.
- Test logic: `scripts/test/health-board.mjs` (trong `npm test`). Lõi thuần: `scripts/lib/health-board.mjs`.
