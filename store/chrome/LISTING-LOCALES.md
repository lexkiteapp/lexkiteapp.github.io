# Lexkite – mô tả cửa hàng theo thị trường

Nội dung 15 ngôn ngữ (tên, mô tả ngắn, mô tả chi tiết) nay nằm **duy nhất** trong [`listing.json`](listing.json):
`en, vi, es, pt_BR, fr, de, id, th, zh_CN, ja, ko, hi, ar, ru, tr`.

- Copy nhanh lên dashboard: mở `store/chrome/fill.html` (sinh bằng `node scripts/gen-store-fill.mjs`).
- Kiểm trước khi dán: `node scripts/test/listing-check.mjs` (độ dài, đủ 15 ngôn ngữ, không ®, không từ cấm, có link chính sách `https://lexkite.com/<lang>/privacy`, có câu không liên kết).
- Dashboard → Store listing → chọn Language → dán Description; ảnh `screenshots/<mã>-1..5.png` (1280×800).
- Name / Summary hiển thị lấy từ gói (`extension/_locales/<mã>/messages.json` → appName / appDesc) – giữ trùng với `listing.json`.
