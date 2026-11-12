# /go/<lang>/ – trang đích "học thử ngay" cho social + SEO (spec-lite, chủ 12/11)
> TL;DR: Người lạ từ video/quảng bá chạm 3 câu từ vựng ngay trên trang, không đăng ký; xong → "Học tiếp trong app" (/app/, liên kết xác minh → app đã cài tự mở). HTML thuần ≤ 8 KB gz, 15 ngôn ngữ.
> Đọc khi: sửa `scripts/build-go.mjs`, `content/go/copy.json`, `scripts/test/go-landing.mjs`, hoặc làm phễu UTM (`/api/hit` go_*).

- Dựng: `node scripts/build-go.mjs` → `web/go/<lang>/index.html` + `web/go/index.html` (chọn ngôn ngữ theo trình duyệt, không theo IP). `--check` chạy trong npm test.
- Chữ 15 ngôn ngữ: `content/go/copy.json` (mảng theo `KEYS`, en là gốc). Token màu: Stitch (`web/css/st-w-home.css`), sáng/tối theo hệ thống + `lk.theme`.
- UTM: chỉ giữ `utm_source|medium|campaign|content|term` + `c` (mã kênh/bài) khớp `^[A-Za-z0-9._~-]{1,40}$`, nhớ trong phiên, nối vào mọi CTA `/app/?src=go&…`. Không dữ liệu cá nhân trong URL.
- Đo: `/api/hit {t:'q', ev:'go_view|go_start|go_done|go_cta', lang, page:'go'}` (chỉ đếm; bot/webdriver/`lk.noTrack` không gửi). Phễu theo kênh + admin: PR tiếp theo.
- Cửa hàng: nút `data-get-app="go"` dùng lại `js/get-app.js` (CWS / Play / App Store / hướng dẫn thêm vào MH chính).
- Xong khi: test `go-landing` xanh (15 trang, canonical + 16 hreflang, quiz chạy, UTM sạch), LCP là chữ H1 (không ảnh lớn, không font ngoài).
