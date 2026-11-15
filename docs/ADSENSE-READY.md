# ADSENSE-READY – Danh sách sẵn sàng duyệt AdSense / AdMob

> TL;DR: Kiểm như người duyệt Google (Googlebot, không JS, 12/11): site đã có nội dung tĩnh đầy đủ, About/Privacy/Terms/Contact, ads.txt đúng, CMP của Google đã nối trong mã, không PDF bản quyền trong nguồn deploy. Đã sửa 3 lỗi còn lại; chủ làm 3 cú bấm ở cuối. Máy gác: `scripts/test/adsense-hygiene.mjs`.

## 1. Bằng chứng (tải bằng Googlebot UA, không chạy JS)

| Hạng mục | Kết quả 12/11 | Việc đã làm |
|---|---|---|
| Nội dung dựng sẵn (không JS) | `/en/` 200 · `/en/blog/` 200 (12+ bài EN, ~25/ngôn ngữ ×15) · bài mẫu 2 400+ từ, có tác giả, JSON-LD BlogPosting/Organization · `/en/dictionary/<từ>/` ≈ 530 từ · `/en/words/<từ>/` ≈ 280 từ · mẫu 140 URL từ mọi sitemap: tất cả 200, trang hiển thị > 250 từ trừ trang chính sách (130–200 từ, chủ đích) | Giữ nguyên, không cắt |
| Nhãn lạc ngôn ngữ | `/en/words/launch` hiện chip chủ đề tiếng Việt ("Khám phá vũ trụ") lẫn trong trang EN – tín hiệu "dịch máy/trang kém chất lượng" | `scripts/lib/seo-words.mjs`: chip chủ đề chỉ ở trang `vi` (tên chủ đề chưa có bản dịch) |
| Bản quyền | 2 PDF giáo trình ngữ pháp chỉ nằm ở thư mục gốc **máy cục bộ**, `.gitignore` chặn `*.pdf`, `git ls-files` không có PDF/EPUB nào, `web/` (nguồn `dist/`) không có → không bao giờ được deploy hay liên kết | Thêm máy gác: test đỏ nếu git hoặc `web/` có PDF/sách. Lịch sử git không đụng |
| Trang bắt buộc | `/en/about/` (200, có mục Liên hệ: LLC, địa chỉ, support@) · `/en/privacy/` (AdSense, partner-sites, adssettings, CMP) · `/en/terms/` · chính sách biên tập, đính chính, nguồn · menu + chân trang trên mọi trang tĩnh. `/contact` và `/about` từng **404** | `web/_redirects`: `/about`, `/contact` → `/en/about/` (302) |
| ads.txt | `https://lexkite.com/ads.txt` = 1 dòng `google.com, pub-…, DIRECT, f08c47fec0942fa0` (đúng); `app-ads.txt` cùng dạng | Test kiểm dạng IAB |
| Quảng cáo không đặt bừa | Mặc định `enabled:false` → 0 byte quảng cáo; luật `policy.js`: không trong `/app/`, quiz/học, admin, lỗi 404 (noindex), trang trống; ô cách nút ≥ 2,5rem (docs/ADS.md §1c) | – |
| CMP | Mã đã chờ `__tcfapi` (TCF v2.2) trước mọi yêu cầu quảng cáo; từ chối → 0 yêu cầu; DNT/GPC → không cá nhân hóa | **Chủ bật thông điệp trong AdSense (miễn phí), xem §3** |
| Nội dung AI/quy mô | Blog có tác giả (Đội biên tập), trang chính sách biên tập/nguồn/đính chính, bài mới ≥ 1 200 từ; robots chặn bot huấn luyện AI | Theo dõi: bài yếu đã `noindex` bởi bộ dựng blog |

## 2. Rủi ro còn lại (nói thật)
- Trang `/<lang>/words/<từ>` ngoài EN/VI mỏng hơn (≈ 250 từ, cùng mục từ dịch). Giữ vì là bản địa hóa thật; nếu Google vẫn từ chối vì "ít nội dung", bước kế = `noindex` các ngôn ngữ phụ cho tới khi mỗi trang có thêm ví dụ/ghi chú riêng.
- Lưu lượng chưa lớn; AdSense duyệt theo nội dung, không theo lượng truy cập.
- Gốc `/` chuyển 302 theo nước/ngôn ngữ (người duyệt Mỹ thấy `/en/`).

## 3. Chủ làm đúng 3 cú bấm (sau khi PR này lên live)
1. AdSense › **Privacy & messaging** › tạo thông điệp **GDPR** (EEA/UK/CH) + **luật bang Mỹ**, bấm **Publish** (CMP miễn phí do Google chứng nhận).
2. AdSense › trạng thái tài khoản: tick **"I confirm that I have fixed the issues"** → **Resubmit** (site: `lexkite.com`).
3. Sau khi AdSense duyệt: AdMob › **Apps › Add app** (đã công bố) dán link store → gửi lại duyệt; `app-ads.txt` đã sẵn ở gốc.
