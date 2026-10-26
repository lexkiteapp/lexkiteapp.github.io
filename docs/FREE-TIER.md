# FREE-TIER – giữ hệ thống ở 0 đồng khi traffic tăng (SEO hạng mục 6)

> TL;DR: `free-tier-guard.yml` đo số dùng thật mỗi ngày so với trần gói miễn phí; ≥ 60 % cảnh báo, ≥ 80 % mở issue `free-tier`; Worker có chế độ "shed" khi lượt gần trần. Không bao giờ tự nâng gói.
> Đọc khi: thêm Worker/trang tự sinh/việc nền, hoặc khi có issue `free-tier`. Chi phí D1 theo người dùng: docs/CAPACITY.md.

## 1. Trần gói miễn phí đang theo dõi (`scripts/free-tier/limits.mjs`)

| Tài nguyên | Trần | Nguồn số liệu |
|---|---|---|
| Workers + Pages Functions (tài khoản chính, **chung 1 trần**) | 100.000 lượt/ngày | GraphQL `workersInvocationsAdaptive` + `pagesFunctionsInvocationsAdaptiveGroups` |
| Workers tài khoản 2 | 100.000 lượt/ngày | GraphQL (khoá tài khoản 2) |
| D1 `lexkite-sync` | 5 tr dòng đọc · 100k dòng ghi/ngày | `d1AnalyticsAdaptiveGroups` (lọc databaseId) |
| D1 `lexkite-internal` (tài khoản 2) | 5 tr đọc · 100k ghi/ngày | như trên |
| Pages build | 500/tháng (commit `[CF-Pages-Skip]` không tính) | Pages API deployments |
| Pages file/bản | 20.000 | chặn lúc build (`build-web.sh` cảnh báo > 15.000, chặn > 19.500) |
| R2 | 10 GB · Class A 1 tr · Class B 10 tr/tháng | `r2StorageAdaptiveGroups`, `r2OperationsAdaptiveGroups` |
| Repo GitHub web + kho media | 1 GB khuyến nghị | GitHub API `size` |
| Actions cache | 10 GB/repo (*mềm*: GitHub tự xoá cũ, tối đa ⚠️, không mở issue) | `actions/cache/usage` |
| Actions phút / artifact | không giới hạn (repo công khai) | – |

Đánh giá theo **ngày hôm qua (UTC)**, ghi chú kèm đỉnh 7 ngày + 3 script tốn nhất.

## 2. Workflow `free-tier-guard.yml` (01:35 UTC, `infra/jobs.json`)
- `node scripts/free-tier/guard.mjs` (`--dry`: không ghi file, không mở issue). ~4 truy vấn GraphQL + ≤ 45 trang Pages API + ~6 GitHub/ngày, không thử lại.
- ≥ 60 % → `::warning` + bảng Summary. ≥ 80 % → issue nhãn `free-tier` (cập nhật nội dung + 1 bình luận/ngày); hết nguy cơ → tự bình luận và đóng.
- Thiếu khoá → bỏ qua trung tính phần đó (xanh + ghi chú). Có khoá mà không lấy được số → đỏ.

## 3. Giảm tải chủ động (không cắt tính năng)
- **Trình duyệt trước**: lượt trong `max-age` không tới Worker. Ảnh/âm thanh tên theo mã băm: `max-age=1 năm, immutable`. `media.lexkite.com/library/*`: `max-age=1 ngày, stale-while-revalidate=7 ngày`.
- **Cache biên trong Worker** (`workers/lib/edge.mjs` → `edgeCached`): Cache API + SWR tự làm (bản lưu 30 ngày, quá `fresh` → trả bản cũ + làm mới nền). Trúng cache = 0 lượt đọc R2 (Class B), 0 lượt gốc. **Không** giảm lượt Worker (mỗi yêu cầu tới route Worker vẫn tính 1 lượt) – vì vậy §4 có Cache Rule/fail-open.
- **Chế độ shed**: guard ghi `web/free-tier-state.json` `{"mode":"shed"}` khi Workers+Functions ≥ 80 % (chỉ commit khi đổi → 1 build). Worker đọc file tĩnh này (`mode()`, Pages tĩnh không tính lượt Functions, cache 5 phút). Shed: trả bản cache, không làm mới nền; trang thí điểm chưa ổn định → `X-Robots-Tag: noindex, follow` (`shedRobots`) để bot không kéo thêm trang mới. Lỗi đọc trạng thái → `normal` (không bao giờ chặn người dùng).
- **Worker từ điển** (`workers/dict`, PR #59 – chưa merge): khi merge, bọc trả HTML bằng `edgeCached(req, ctx, render, { fresh: 86400, shed: (await mode()) === 'shed' })`, header trình duyệt `cacheControl({ maxAge: 3600, sMaxAge: 86400, swr: 604800 })`, trang thí điểm gọi `shedRobots`. Test giả lập: `scripts/test/free-tier.mjs`.
- **Cache Rules miễn phí cho tĩnh**: có ích khi gốc **không** phải Worker (vd. CNAME proxied tới GitHub Pages + Cache Rule "Eligible for cache, Edge TTL 1 năm") → lượt lặp = 0 lượt Worker. Với route đã có Worker thì Worker chạy trước cache, Cache Rule không cứu được lượt.

## 4. Ngưỡng nâng gói & việc của chủ (guard KHÔNG tự nâng)
| Khi | Việc |
|---|---|
| Workers+Functions ≥ 80 % (80k/ngày) **3 ngày liền**, hoặc đỉnh 7 ngày ≥ 90k | Chủ bật **Workers Paid 5 USD/tháng** (10 tr lượt/tháng, D1 25 tỉ đọc/50 tr ghi/tháng kèm theo). Trước đó: shed tự bật. |
| Worker ảnh/âm thanh chiếm phần lớn lượt (bảng script trong issue) | Đổi `media`/`audio` sang gốc không-Worker: CNAME proxied → GitHub Pages + Cache Rule + Origin Rule đổi Host (docs/CAPACITY.md §5). Hoặc route Worker với **Request limit failure mode = Fail open** để quá trần thì đi thẳng gốc. |
| Pages build ≥ 80 %/tháng | Pages › Settings › Builds › **Branch control: chỉ production** (tắt preview build nhánh); commit máy `[CF-Pages-Skip]`; gom deploy theo lịch. Cân nhắc deploy từ GitHub Actions bằng `wrangler pages deploy` (Direct Upload) – kiểm lại trên tài liệu Cloudflare rằng không tính vào 500 build trước khi chuyển. |
| D1 tài khoản 2 ghi ≥ 80 % | Gộp ghi theo lô ở việc nền (drive*, job_runs). |

## 5. Khoá cần thêm (GitHub › Settings › Secrets › Actions)
1. `CF_ANALYTICS_TOKEN` – tài khoản Cloudflare chính, Custom Token: **Account › Account Analytics › Read** + **Account › Cloudflare Pages › Read**, chỉ tài khoản `e34e14b7…`. (Có thể dùng cùng khoá `lexkite-analytics-read` ở docs/CAPACITY.md §5 nếu thêm quyền Pages Read.)
2. `CF_ANALYTICS_TOKEN_2` – tài khoản 2, **Account Analytics › Read**.
`CF_ACCOUNT_ID`, `CF_ACCOUNT_2` đã có. Không dùng khoá đa năng `cf-token`.

## 6. Số đo đầu tiên (26/10/2026, chạy tay `--dry`)
Workers+Functions hôm qua 13,4k (13 %; đỉnh 7 ngày 32,8k = 33 %) · D1 sync ghi 33k (33 %; đỉnh 57,6k) · **D1 tài khoản 2 ghi 120k (120 %)** · **Pages build tháng 10: 941 (188 %)** – build vẫn chạy nhưng vượt trần công bố · repo web 916 MB (89 %) · lexkite-media 677 MB (66 %) · Actions cache 9,85 GB (mềm) · R2 chưa có số liệu (bucket blog chưa dùng).
