# Spec: máy tính band IELTS /<lang>/<slug>/ (23/11/2026)

> TL;DR: Công cụ miễn phí 15 ngôn ngữ: nhập điểm thô Listening/Reading (0–40, Academic hoặc General Training) + band Writing/Speaking → band từng kỹ năng + band tổng (làm tròn 0,5). Trang tĩnh nhẹ, JS lười ≈ 2 KB, bảng quy đổi HTML đầy đủ làm nội dung index được. Thêm 1 loại trang vào `scripts/build-tools.mjs` (không pipeline mới).
> Đọc khi: sửa `content/tools/ielts-band.json`, `scripts/lib/ielts-band.mjs`, `web/js/tools/ielts-band.js`, khối `band` trong `content/tools/i18n/<lang>.json`.

## 1. Vì sao
GROWTH-1M §3.3: công cụ miễn phí kéo backlink tự nhiên; truy vấn "IELTS band score calculator" có cầu ở mọi thị trường CPM cao. Không trùng trang đã có: bài test CEFR chỉ quy đổi gần đúng sang IELTS, không tính band.

## 2. Hành vi
- Vào: Listening 0–40, Reading 0–40 + chọn Academic/General, Writing 0–9 (bước 0,5), Speaking 0–9.
- Ra: band Listening/Reading theo bảng quy đổi, band tổng = trung bình 4 kỹ năng làm tròn tới 0,5 (x,25 → x,5; x,75 → x+1), lời nhắc "gần đúng", nút mở app (luyện theo kỹ năng yếu nhất).
- Bảng quy đổi PHỔ BIẾN, gần đúng (IELTS không công bố bảng cố định, mỗi đề lệch ±1 câu) – ghi rõ trên trang; một nguồn `content/tools/ielts-band.json`.
- 0 gọi mạng, 0 lưu dữ liệu ngoài localStorage của lần nhập cuối (try/catch).

## 3. Kỹ thuật & chặn
- URL vĩnh viễn ở `scripts/lib/tools-links.mjs` (TOOL_SLUGS.band). Chuỗi 15 ngôn ngữ: khối `band` + `nav.band` trong `content/tools/i18n/<lang>.json` (dịch thật, i18n-qa).
- JSON-LD: WebApplication + BreadcrumbList; hreflang 15 + x-default en; vào `sitemap-tools.xml`; link từ chân trang (`toolFoot`) + hộp công cụ blog IELTS.
- Nhẹ: HTML tĩnh, JS tải defer riêng ở trang này, CSS thêm < 1 KB dùng lại TOOL_CSS; LCP là h1 chữ.
- Test: `scripts/test/tools-pages.mjs` (trang đủ 15 ngôn ngữ, hreflang) + `scripts/test/ielts-band.mjs` (bảng đơn điệu, làm tròn, JS = lib).
- Công tắc: `TOOLS_PAGES=0`.
