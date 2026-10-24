# quality-sweep – quét lỗi tiềm ẩn hằng đêm (0 token LLM)

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
