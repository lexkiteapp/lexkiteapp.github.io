# quality-sweep – quét lỗi tiềm ẩn hằng đêm (0 token LLM)

> TL;DR: quality-sweep: quét lỗi tiềm ẩn hằng đêm (22:40 UTC, 0 token LLM) và journey-e2e; mở 1 issue + 1 dòng bản tin. Chạy tay: Actions → Quality sweep.
> Đọc khi: sửa/đọc kết quả quét đêm.

Workflow `.github/workflows/quality-sweep.yml` (22:40 UTC, sổ `infra/jobs.json` id `quality-sweep`, lease chỉ phút GitHub). Chạy tay: Actions → Quality sweep → `quick=1` để thử nhanh.

| Phần | Làm gì | Mã |
|---|---|---|
| Web/app | Mọi route app (danh sách cố định + tự dò `routes.x =` trong `web/js`) + 3 mẫu mỗi loại trang tĩnh của `dist/` × vi/en/ar × điện thoại/máy tính × sáng/tối. Bắt: lỗi console, promise không bắt, request 4xx/5xx, tràn ngang, chữ bị cắt, nút đè nhau, vùng chạm < 44 px (điện thoại), axe serious/critical, CLS > 0.1, tác vụ dài > 200 ms | `scripts/quality/sweep.mjs` |
| Lighthouse | 6 trang (`/`, `/en/`, app, vocabulary, blog, 1 bài), điện thoại; ngân sách perf ≥ 85, a11y ≥ 95, SEO ≥ 95 | `scripts/quality/lh.mjs` |
| Ảnh | So ảnh chụp (bản sáng) với nền lưu trong cache `qs-baseline-<lang>-*`; đổi > 2% điểm ảnh → gắn cờ (KHÔNG làm hỏng build). Trang bị cờ giữ ảnh nền cũ tối đa 3 đêm để kịp xem, sau đó nhận ảnh mới | sweep.mjs |
| Add-on | `ext-e2e.mjs` vi/en/ar + `dict-perf.mjs` mục 6 (trang nặng: ngân sách +600 ms script, +40 MB heap, bấm đúp lần đầu vẫn tra được) | workflow |
| Native | Thứ Hai: kích hoạt `ios-e2e.yml` + `native-auth-e2e.yml` (iOS Simulator + Android emulator) | workflow |
| Báo cáo | `scripts/quality/report.mjs` → job summary, issue `quality-sweep` (mở/cập nhật; tự đóng khi sạch), ảnh lỗi trên nhánh `quality-qa`, 1 dòng trong bản tin 01:00 UTC (`workers/mail` đọc issue mở) | report.mjs |

Mức độ: critical = lỗi trang/promise/5xx/axe critical · high = console, 4xx, tràn ngang, axe serious · medium = cắt chữ, đè nút, CLS · low = vùng chạm, tác vụ dài (CI nhiễu).

**Hermetic / 0 D1:** `dist` phục vụ bằng `scripts/quality/serve.mjs`; `/api/*` (mọi origin) trả `{}`; request ra ngoài trả rỗng; Lighthouse chạy với `lexkite.com` trỏ về 127.0.0.1. Lỗi do `{}` giả (app mong dữ liệu khác) có thể lên như lỗi script – kiểm tra trước khi sửa.

**Tắt:** `paused: true` trong `infra/jobs.json` + bỏ `schedule` (jobs-check yêu cầu khớp), hoặc disable workflow. **Gốc lỗi → cổng chặn:** khi sửa 1 loại lỗi mà sweep tìm ra, thêm test/cổng vào `npm test` (METHODS "Làm đúng 1 lần" bước 4) rồi mới coi là xong.

## journey-e2e – hành trình người dùng đầu-cuối
`scripts/test/journey-e2e.mjs` (workflow `journey-e2e.yml`: mỗi PR đụng file app + job `journey` của quality-sweep mỗi đêm; thứ Hai/`native=1` thêm hành trình 1–3 trên Android emulator + iOS Simulator qua `scripts/test/journey-e2e/native.js`).
7 hành trình × vi/en/ar × máy tính/điện thoại: lần đầu → kiểm tra đầu vào → bài đầu → hỏi nhắc học đúng 1 lần · quay lại → ngày ngữ pháp+phát âm → "Tiếp theo" → tự tin/nhập vai B2 · ôn lật/gõ/nghe + "câu của bạn" + đồng bộ khứ hồi giả lập · tra từ → song sinh SEO (ảnh từ vựng TẮT, CLS) · cài đặt nhắc học + cờ quảng cáo TẮT · học sinh lớp học · add-on lưu kèm câu → tab mới → mở app.
Mỗi bước: `journey-e2e/checks.js` (lớp nổi chồng nhau, 2 lời mời, focus, ô quảng cáo) + lỗi console/promise + tải lại + mất mạng. Hermetic: `/api/*` giả lập trong tiến trình, host ngoài rỗng, `?sandbox=1` (đồng bộ/lớp học dùng tài khoản Firebase GIẢ). Hộp hỏi nhắc học chỉ hiện khi kiểm thử nếu `localStorage lk.e2e=1` (remind.js, số liệu/push vẫn tắt).
Chạy tay: `node scripts/test/journey-e2e.mjs --root dist --lang vi --device mobile --only 1 [--ext]`.

## Luật chuyển từ METHODS (27/10)
- **Quét lỗi tiềm ẩn hằng đêm (24/10):** `quality-sweep.yml` (docs/QUALITY-SWEEP.md) – 0 token, hermetic (/api = {}), 1 issue "quality-sweep" + 1 dòng bản tin. Lỗi nó tìm ra → sửa theo LOẠI + thêm cổng vào npm test, đừng chỉ vá từng trang.
- **Liên kết nội bộ (24/10, /vi/blog/-lang 404):** gốc lỗi = `web/blog-lang.html` cắt `^/blog/?` làm "/blog-lang" thành đuôi "-lang". Cổng: `scripts/lib/url-guard.mjs` (badPath/joinPath – URL bài dựng qua joinPath), `scripts/test/links-js.mjs` (jsdom chạy script thật, quét liên kết DOM + tĩnh của mọi trang blog, ma trận chuyển hướng /blog*, gợi ý 404), `crawl.js` quét href do JS sinh. Mọi URL ghép từ biến → dùng joinPath, không nối chuỗi trần.
- **Trang chuyển /blog (28/10, trang trắng chỉ có link):** link Blog trong app trỏ thẳng `/<lang>/blog/` (hubs.js); `/blog(/)` viết lại sang `/blog-lang` (không `.html` – Pages 308 đổi URL); `blog-lang.html` có kiểu thương hiệu + danh sách ngôn ngữ do build-blog ghi sẵn → chuyển đồng bộ. Cổng: `links-js.mjs` mục 2b.
