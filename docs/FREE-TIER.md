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
- **Worker từ điển** (`workers/dict`): tầng 1 Workers Static Assets (0 lượt script); tầng 2 (R2) bọc `edgeCached(…, { fresh: 86400, shed })`, header `max-age=600, s-maxage=86400, stale-while-revalidate=604800`. Shed còn chặn `scripts/dict/stage.mjs` lên bậc mở index (trang thí điểm mới giữ noindex; lùi bậc vẫn chạy). `shedRobots` dành cho trang tự sinh mới khác. Test: `scripts/test/free-tier.mjs`.
- **Cache Rules miễn phí cho tĩnh**: có ích khi gốc **không** phải Worker (vd. CNAME proxied tới GitHub Pages + Cache Rule "Eligible for cache, Edge TTL 1 năm") → lượt lặp = 0 lượt Worker. Với route đã có Worker thì Worker chạy trước cache, Cache Rule không cứu được lượt.

## 4. Ngưỡng nâng gói & việc của chủ (guard KHÔNG tự nâng)
| Khi | Việc |
|---|---|
| Workers+Functions ≥ 80 % (80k/ngày) **3 ngày liền**, hoặc đỉnh 7 ngày ≥ 90k | Chủ bật **Workers Paid 5 USD/tháng** (10 tr lượt/tháng, D1 25 tỉ đọc/50 tr ghi/tháng kèm theo). Trước đó: shed tự bật. |
| Worker ảnh/âm thanh chiếm phần lớn lượt (bảng script trong issue) | Đổi `media`/`audio` sang gốc không-Worker: CNAME proxied → GitHub Pages + Cache Rule + Origin Rule đổi Host (docs/CAPACITY.md §5). Hoặc route Worker với **Request limit failure mode = Fail open** để quá trần thì đi thẳng gốc. |
| Pages build ≥ 80 %/tháng | Xem §7 (cổng `pages-deploy.yml`, chế độ `hook`/`direct`). |
| D1 tài khoản 2 ghi ≥ 80 % | Gộp ghi theo lô ở việc nền (drive*, job_runs). |

## 5. Khoá cần thêm (GitHub › Settings › Secrets › Actions)
1. `CF_ANALYTICS_TOKEN` – tài khoản Cloudflare chính, Custom Token: **Account › Account Analytics › Read** + **Account › Cloudflare Pages › Read**, chỉ tài khoản `e34e14b7…`. (Có thể dùng cùng khoá `lexkite-analytics-read` ở docs/CAPACITY.md §5 nếu thêm quyền Pages Read.)
2. `CF_ANALYTICS_TOKEN_2` – tài khoản 2, **Account Analytics › Read**.
ID tài khoản chính ghi thẳng trong workflow (công khai). Tài khoản 2 cần thêm secret `CF_ACCOUNT_2` (ID tài khoản 2) cùng `CF_ANALYTICS_TOKEN_2`. Không dùng khoá đa năng `cf-token`. Trạng thái 26/10: `CF_ANALYTICS_TOKEN` đã thêm.

## 6. Số đo đầu tiên (26/10/2026, chạy tay `--dry`)
Workers+Functions hôm qua 13,4k (13 %; đỉnh 7 ngày 32,8k = 33 %) · D1 sync ghi 33k (33 %; đỉnh 57,6k) · **D1 tài khoản 2 ghi 120k (120 %)** · **Pages build tháng 10: 941 (188 %)** – build vẫn chạy nhưng vượt trần công bố · repo web 916 MB (89 %) · lexkite-media 677 MB (66 %) · Actions cache 9,85 GB (mềm) · R2 chưa có số liệu (bucket blog chưa dùng).

## 7. Pages build: nguồn, cổng gom, mục tiêu ≤ 300/tháng (26/10/2026)
**Đo tháng 10** (Pages API, `scripts/free-tier/guard.mjs`): 1.975 bản ghi = 1.592 production + 383 preview (preview đã tắt 26/10); 1.846 do push, 129 do deploy hook. 7 ngày 20–26/10: 1.034 build production ≈ 148/ngày:
push của người/phiên agent ≈ 640 (62 %), commit máy `lexkite-bot`/`Lexkite CI` không skip ≈ 283 (27 %), deploy hook (blog-publish, video-web, blog-images) ≈ 75 (7 %).
video-web vừa push không skip vừa gọi hook → 2 build/lượt. blog-publish mỗi giờ có bài = 1 build (tháng 11 có 151 giờ đăng khác nhau).

**Vượt 500 thì sao** (quan sát thật, không phải tài liệu): build thứ 500 lúc 17/10 09:29 UTC; sau đó vẫn 1.064 deploy thành công, tỉ lệ lỗi không tăng (≈ 10 % so với ≈ 18 % trước) → Cloudflare
**chưa chặn, chưa xếp hàng thêm**. Tài liệu (developers.cloudflare.com/pages/platform/limits) chỉ ghi "500 builds/month" + "1 build at a time", không nói hậu quả → có thể bị áp bất cứ lúc nào: coi 500 là trần cứng.
Hàng đợi chỉ do 1 build đồng thời: build mới chờ build cũ (226 bản `queued/idle` bị bản mới hơn thay thế).

**Cổng `pages-deploy.yml`** (`scripts/pages/deploy.mjs`, test `scripts/test/pages-skip.mjs` trong `npm test`):
- Mọi commit máy (workflow + script) có `[CF-Pages-Skip]`; chỉ `pages-deploy.yml` được dùng `CF_PAGES_DEPLOY_HOOK`/`wrangler pages deploy`. Workflow cần lên site gọi `gh workflow run pages-deploy.yml -f urgent=… -f quiet=… -f reason=…` (cần `permissions: actions: write`).
- Gom: concurrency theo job `cancel-in-progress` + chờ yên `quiet` phút (push 15, dispatch mặc định 10) → chuỗi yêu cầu liền nhau còn 1; nhóm `urgent` tách riêng để yêu cầu thường không huỷ bài blog đến giờ.
- Bỏ khi HEAD đã deploy/đang build, hoặc không đổi tệp site (`NON_SITE`: docs, reports, brand, mobile, store, workers, infra, .github, scripts video/cine/footage/test, *.md ngoài content/web).
- Giãn cách `PAGES_MIN_GAP_MIN` (mặc định 180 phút) giữa 2 build trừ `urgent` (blog-publish, video-web có URL mới, free-tier-guard đổi chế độ shed). Cron `23 */3` bù commit máy đã skip.
- blog-publish chạy `7 */3` (`--since 190`): mọi bài trong khung 3 giờ = 1 build, trùng khung cron → tối đa 8 build/ngày từ blog + bù.

**Chế độ** (biến repo `PAGES_DEPLOY`, GitHub › Settings › Variables):
| Chế độ | Ai build | Build/tháng dự kiến | Chủ cần làm |
|---|---|---|---|
| `git` (mặc định, hiện tại) | Cloudflare build mọi push không skip | ≈ 2.700 (push người/agent ≈ 91/ngày; máy + hook về ≈ 0) – **vẫn vượt** | – |
| `hook` | chỉ cổng gọi deploy hook | ≤ 8 khung × 30 + ≤ 30 gấp video ≈ **≤ 270** (thường ~150–200) | Pages › Settings › Builds › Branch control: tắt **automatic production deployments**; đặt `PAGES_DEPLOY=hook` |
| `direct` (khuyến nghị) | GitHub Actions dựng `dist` + `wrangler pages deploy` | **0** (Direct Upload không qua hệ build Cloudflare; deploy thì không giới hạn số lượt) | như `hook` + thêm quyền **Cloudflare Pages: Edit** cho secret `CLOUDFLARE_API_TOKEN`; đặt `PAGES_DEPLOY=direct` |
Git-integrated project vẫn nhận Direct Upload sau khi tắt automatic deployments (developers.cloudflare.com/pages/configuration/git-integration). Biến môi trường/secret của Functions là cấu hình dự án → giữ nguyên.
Quay lại: bật lại automatic production deployments + xoá biến `PAGES_DEPLOY`.

**Đo**: guard hằng ngày đếm build = deployment tháng này trừ `[CF-Pages-Skip]` và trừ Direct Upload (`ad_hoc`), tối đa 100 trang API. Mục tiêu ≤ 300 (60 %); ≥ 400 (80 %) mở issue `free-tier`.
Log mỗi lượt cổng ghi `chế độ · sự kiện → act: lý do` (Actions › Pages deploy).
