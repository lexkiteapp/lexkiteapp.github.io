# CAPACITY – chi phí Cloudflare theo người dùng, kiến trúc mở rộng & khi nào nâng gói

Mục tiêu: biết **chi phí D1 / Functions thật cho mỗi người dùng**, có kiến trúc chịu được hàng triệu DAU, và được **cảnh báo trước** khi chạm hạn mức.
Không bao giờ dội tải production để đo (D1 Free đã cạn 2 lần tuần 20/10) – mọi số dưới đây đo trên D1 cục bộ (Miniflare = bộ máy D1 thật).

## 0. Tóm tắt (Miniflare, 23/10/2026 – cùng 1 lượt CI, `--legacy` = kiến trúc cũ)

| | Trước | Sau |
|---|---:|---:|
| Dòng ghi D1 / người học "typical" / ngày | 112 | **53** |
| Dòng ghi trung bình 1 DAU (hỗn hợp) | 85 | **41** |
| Dòng đọc trung bình 1 DAU | 182 | 147 |
| Trần DAU gói **Free** | ≈ 1.190 (nút thắt: ghi) | **≈ 2.420 (nút thắt: lượt Functions/Worker)** |
| Paid ở 100k DAU | ≈ 237 USD/tháng | **≈ 112 USD/tháng** |
| Paid ở 1M DAU | ≈ 2.760 USD/tháng | **≈ 1.550 USD/tháng** |
| Dung lượng D1 / người typical (đã nén như máy khách) | 21,6 KB | 23,3 KB (1 dòng gói) → **10 GB ≈ 450k người/mảnh** |
| Truy vấn đường người dùng quét cả bảng | 3 | 0 |

Nút thắt còn lại: **lượt gọi** (≈ 41/DAU: 29 Functions + 12 Worker âm thanh) – gói Free 100k/ngày. Trên gói Paid, chi phí lớn nhất vẫn là dòng ghi ($1/triệu).

## 1. Cách đo

| Thành phần | Tệp |
|---|---|
| Mô phỏng 1 ngày của từng hồ sơ, gọi **mã thật** `functions/api/*` (sync, hit, config, notices, league, class, ai, img); máy khách đẩy thân nén gzip như `web/js/sync.js` | `scripts/capacity/sim.mjs` (`--legacy` = cờ cũ) |
| Đồng hồ D1: `meta.rows_read` / `rows_written` từng yêu cầu + `EXPLAIN QUERY PLAN` mọi câu SQL | `scripts/capacity/meter.mjs` |
| Mô hình hạn mức, ngoại suy DAU, giá Paid, luật cảnh báo | `scripts/capacity/model.mjs`, `functions/api/_capacity.js` |
| CI: Miniflare trước/sau + ước lượng node:sqlite; đỏ khi có SCAN ở đường người dùng hoặc số đo = 0 | `.github/workflows/capacity-sim.yml` |
| Test (`npm test`) | `scripts/test/capacity.mjs`, `scripts/test/sync-pack.mjs`, `scripts/test/schema-lock.mjs` |

Hồ sơ/ngày: **anon** khách 4 phút · **light** 6 phút, 13 thẻ · **typical** 2 phiên 12+10 phút, 50 thẻ, 1 chấm AI, bảng xếp hạng, add-on · **heavy** 4 phiên 90 phút, 180 thẻ, 5 chấm + 10 lượt hội thoại AI, lớp học · **teacher**.
Hỗn hợp DAU giả định: anon 30 %, light 35 %, typical 25 %, heavy 8 %, teacher 2 % (`MIX` – chỉnh theo Quản trị › Phân tích).

## 2. Kiến trúc (thiết kế 1 lần – mọi mục sau cờ, có test, có cách quay lại)

### A. Dòng ghi
- **A1 Cổng lược đồ** (`functions/api/_schema.js`): CREATE/ALTER/di chuyển chỉ chạy khi phiên bản `once(db, 'tên', N, …)` đổi; isolate lạnh chỉ hỏi Cache API (1 ngày/trung tâm) rồi `schema_ver` (1 dòng đọc). Trước: mỗi isolate lạnh ≈ 190 dòng đọc + 100 dòng ghi (đo). Quên tăng N khi sửa DDL → `schema-lock.mjs` đỏ (`infra/schema.lock.json`). Cờ `SCHEMA_GATE=0`.
- **A2 Thống kê phiên → Workers Analytics Engine** (`hit.js`, binding `HITS`, dataset `lexkite_hits`, miễn phí, không tính D1): mọi beacon ghi 1 điểm AE (ghi kép ngay từ bây giờ để tích lũy lịch sử 3 tháng). Chế độ **hybrid**: nhịp "đang online" 3 phút (`hb:1` từ `web/js/app.js`) chỉ vào AE; D1 chỉ ghi lúc vào trang + lúc rời trang (giữ nguyên mọi báo cáo Quản trị vốn đọc bảng `sessions`); "đang online"/"đang xem" đọc AE SQL (`aeOnline`). Lượt xem trang của nhịp hb dồn sang lần gửi sau (không đếm trùng). Typical: thống kê 38 → 20 dòng ghi.
  Cờ `HIT_STORE`: trống = tự bật khi có binding + khoá đọc AE; `d1` = như cũ (rollback); `hybrid` = ép.
  **Giai đoạn 2** (khi `sessions` > 2 GB hoặc > 100k DAU): bỏ hẳn bảng `sessions` – Quản trị › Phân tích đọc AE SQL (≤ 90 ngày) + bảng tổng hợp ngày `stats_daily` (1 dòng/ngày/chỉ số, cron gộp từ AE) + `visit_day` (1 dòng/khách/ngày cho giữ chân/phễu). Chưa làm ngay vì: cần khoá đọc AE (chưa có) và phải kiểm SQL thật của AE trên dữ liệu thật trước khi thay số liệu Quản trị.
- **A3 Âm thanh**: Worker `audio.lexkite.com` chỉ chạy khi trình duyệt chưa có tệp; SW lưu cache-first, nay **2000 tệp** (trước 600 → người học nhiều bị đẩy ra rồi tải lại qua Worker); tệp tên theo nội dung + `immutable` 1 năm. 26.885 tệp/511 MB không vừa Cloudflare Pages (tối đa 20.000 tệp) → muốn **0 lượt Worker** cần R2 + tên miền riêng (cần thẻ của chủ – chưa bật) hoặc Origin Rule thay Worker (§5). Rollback: `AUDIO_MAX` trong `web/sw.js`.
- **A4 Bộ đếm AI**: chỉ mục `quota_count(day)` (không chứa n), `ai_cache` dùng `INSERT OR IGNORE` (1 dòng thay 2).

### B. Đồng bộ (`functions/api/sync.js`)
- **B1 Gói 1 dòng/người**: mọi tài liệu (meta + cards_0..31) nằm trong 1 dòng `k='pack'` `{k: [h, body, updated]}`; thân giữ nguyên chuỗi máy khách gửi (đã gzip ở máy) → máy chủ không đụng nội dung thẻ, CPU ≈ 0 (đo: tách/gộp thẻ phía máy chủ tốn 28 ms cho 3.000 thẻ – vượt 10 ms CPU gói Free, nên KHÔNG làm). Giao thức v1 giữ nguyên → web, PWA cũ, app gốc, add-on không phải cập nhật.
  - 1 lượt đẩy = **1 dòng ghi** (trước 1 dòng/tài liệu, đo 7–12); 1 lượt kéo = 1 dòng đọc gói (trước liệt kê ~33).
  - **Khoá bất biến**: hash tài liệu; đẩy lại y hệt (thử lại) → 0 dòng; mở app chỉ gửi lại meta khác mốc `updated` → coi là giống → 0 dòng.
  - **Đồng thời**: ghi có điều kiện `WHERE h = <hash gói cũ>`; thua → đọc lại, gộp, thử ≤ 3 lần, rồi 409 (máy khách giữ "chưa gửi").
  - **Di chuyển lười**: lượt đẩy đầu gộp dòng cũ vào gói rồi xoá chúng trong cùng giao dịch (`EXISTS` gói mới – không bao giờ xoá khi gói chưa ghi).
  - Gói > 1,8 MB (≈ 30k thẻ) → tài liệu đó ghi dòng riêng; dòng riêng mới hơn đè lên gói khi đọc.
  - Cờ `SYNC_PACK=0` (rollback): vẫn đọc gói, ghi dòng riêng.
- **B2 Gộp phía máy khách** (đã có, nay có test): đẩy ≤ 1 lần/3 phút + khi ẩn/rời trang, chỉ gói thẻ đổi; xung đột thẻ theo hoạt động gần nhất (`srs.last`/`added`/`mod`), thẻ xoá theo dấu thời gian.

### C. Dung lượng (10 GB/DB Paid, 500 MB Free)
- **C1 Gọn dữ liệu**: máy khách đã bỏ trường trùng thư viện (`slim`), gzip từng gói (3–5×); gói 1 dòng bỏ chi phí mỗi dòng. Đo: 23 KB/người typical.
  Bước sau (khi cần): mã hoá SRS dạng chênh lệch (giây, base36) trong `slim()` → ước −30 %; đổi định dạng máy khách nên làm cùng lúc cập nhật app gốc.
- **C2 Phân mảnh theo người dùng** (`functions/api/_shard.js`): `users.shard` (DB chính) là thư mục; `docsDb(env, shard)` → `env.DB` (mảnh 0) hoặc binding `DB_S<k>`; người mới chọn theo băm uid trong `SYNC_SHARDS_OPEN`. Hiện N = 1.
  Thêm mảnh (chỉ cấu hình): tạo D1 `lexkite-sync-s1` → `[[d1_databases]] binding = "DB_S1"` → `SYNC_SHARDS_OPEN=0,1` (người mới chia đều). Chuyển người cũ: chép dòng `pack` sang mảnh mới → `UPDATE users SET shard = 1` → xoá ở mảnh cũ (theo lô, ngoài giờ cao điểm). Đóng mảnh đầy: bỏ khỏi `SYNC_SHARDS_OPEN`.

### D. Đọc & lượt gọi
- **D1 Xác thực không trạng thái**: Firebase ID token kiểm chữ ký RS256 ngay tại Functions (`claims()`), JWKS đệm trong isolate 1 giờ + đệm biên Cloudflare (`cacheTtl`); không có D1 trong xác thực. Đồng bộ đọc đúng 1 dòng `users` (khoá/mảnh).
- **D2 Dữ liệu công khai**: `/api/config` đệm biên 5 phút + ETag/304; `/api/notices` danh sách công khai đệm biên 60 s; từ điển/bài học/âm thanh là tệp tĩnh (Pages/CDN); `/api/img` Cache API. Khách chưa đăng nhập: 0 dòng D1 khi bộ đệm ấm (trừ beacon thống kê, nay chủ yếu ở AE).
- **D3 Giới hạn tốc độ**: Cache API (`limit()`, `gate()` store `edge`); trạng thái hạn mức dùng chung 60 s/trung tâm. D1 chỉ đếm chính xác cho AI/handoff/liên hệ (ít lượt).

### E. Cách ly
Đường người dùng ở D1 chính `lexkite-sync`; việc nền chuyển sang D1 nội bộ (tài khoản 2 – bộ điều phối `infra/jobs.json`, `_d1b.js`, cầu dao `_d1guard.js` của luồng khác). Việc người dùng không bao giờ gọi cầu dao.

### F. Ngoại tuyến trước
Kho cục bộ là nguồn thật; đồng bộ so hash từng gói → thay đổi lúc ngoại tuyến sống qua khởi động lại và tự đẩy lần mở sau. `scripts/test/sync-pack.mjs` chạy **`web/js/sync.js` thật** (jsdom, 2 "máy") ↔ máy chủ thật: ngoại tuyến + khởi động lại, 2 máy sửa cùng thẻ hội tụ bất kể thứ tự, ghi chen ngang không mất dữ liệu.

### G. Cờ & cách quay lại

| Cờ (biến Pages) | Mặc định | Quay lại |
|---|---|---|
| `SYNC_PACK` | bật | `0` → ghi dòng riêng, vẫn đọc gói (không mất dữ liệu) |
| `SCHEMA_GATE` | bật | `0` → DDL mỗi isolate như cũ |
| `HIT_STORE` | tự (hybrid khi có `HITS` + `CF_ANALYTICS_TOKEN`) | `d1` → mọi beacon vào D1 |
| `SYNC_SHARDS_OPEN` | `0` | bỏ mảnh mới khỏi danh sách |
| binding `HITS` (wrangler.toml) | **đang tắt** (tài khoản chưa bật AE) | thêm/bỏ dấu `#` khối `[[analytics_engine_datasets]]` |

## 3. Kết quả chi tiết (Miniflare, sau)

| Hồ sơ | Lượt Functions | Lượt Worker audio | Đọc D1 | Ghi D1 (trước → sau) |
|---|---:|---:|---:|---:|
| anon | 6 | 8 | 4 | 11 → 9 |
| light | 12 | 6 | 59 | 31 → 16 |
| **typical** | **38** | **20** | **180** | **112 → 53** |
| heavy | 138 | 60 | 762 | 460 → 235 |
| teacher | 20 | 5 | 117 | 40 → 19 |

Typical sau tối ưu (ghi): beacon vào/rời trang 20 · chấm AI 11–13 · bảng xếp hạng 12 · đồng bộ 7 (9 lượt) · khác 3.
Đầu dò D1: thêm mới = 1 + số chỉ mục · cập nhật = 1 (+1 nếu đổi cột có chỉ mục) · `ON CONFLICT … WHERE` không đổi = 0 · `INSERT OR IGNORE` trùng = 0 · `INSERT OR REPLACE` = 2.

## 4. Hạn mức & trần DAU

| | Free (mỗi ngày) | Paid $5/tháng (đã gồm) | Vượt (Paid) |
|---|---|---|---|
| Lượt Workers + Pages Functions | 100.000 | 10 triệu/tháng | $0,30 / triệu |
| D1 dòng đọc | 5 triệu | 25 tỉ/tháng | $0,001 / triệu |
| D1 dòng ghi | 100.000 | 50 triệu/tháng | $1,00 / triệu |
| D1 dung lượng | 500 MB/DB, 5 GB tổng | 10 GB/DB | $0,75 / GB-tháng |
| Analytics Engine | hạn mức riêng, giữ 3 tháng | 10 triệu điểm/tháng | |
| KV (chưa dùng) · R2 (ảnh blog: 10 GB, 1 tr lệnh A, 10 tr lệnh B/tháng) · Cache API (miễn phí) | | | |

| DAU | Lượt/ngày | Đọc/ngày | Ghi/ngày | Vượt Free | Paid ước $/tháng (trước → sau) |
|---:|---:|---:|---:|---|---:|
| 1.000 | 41k | 0,15 M | 41k | không | 5 → 5 |
| 10.000 | 0,41 M | 1,3 M | 0,41 M | lượt, ghi | 6 → 6 |
| 100.000 | 4,1 M | 13 M | 4,1 M | tất cả | 237 → **112** |
| 1.000.000 | 41 M | 130 M | 41 M | tất cả | 2.758 → **1.547** |

Trần Free sau: lượt ≈ 2.420 · ghi ≈ 2.450 · đọc ≈ 38.000 DAU. Paid (phần đã gồm): lượt ≈ 8.000 · ghi ≈ 41.000 DAU. Dung lượng: 500 MB ≈ 22k người đăng ký (Free), 10 GB ≈ 450k/mảnh.

## 5. Ngưỡng hành động cho chủ

| Khi | Việc |
|---|---|
| Thư/chuông **"Nâng gói Cloudflare 5 USD trước ngày X"** (≥ 60 % Free 3 ngày liền hoặc dự báo 80 % trong 14 ngày) – dự kiến ≈ 1.400 DAU (lượt ≈ 60k/ngày) | Bật **Workers Paid $5** trước ngày X. Tạm thời: Quản trị › Cài đặt `hit_rate = 0.2`. |
| Bật Analytics Engine: dash.cloudflare.com › **Workers & Pages › Analytics Engine › Enable** (miễn phí) → báo để bỏ dấu `#` khối `[[analytics_engine_datasets]]` trong `wrangler.toml` | Chưa bật thì Pages từ chối triển khai (thử 23/10 → đã tắt binding lại). Có binding + khoá đọc (dưới) → hybrid tự bật (thống kê −50 % dòng ghi). |
| > 8.000 DAU | Âm thanh không qua Worker: R2 + tên miền riêng (cần thẻ) **hoặc** bỏ route Worker, CNAME `audio` → `lexkiteapp.github.io` có proxy + Cache Rule "Cache everything, Edge TTL 1 năm" + Origin Rule đổi Host thành `lexkiteapp.github.io` + Transform Rule thêm `Access-Control-Allow-Origin: *` (kiểm gói có Origin Rule đổi Host). |
| > 100.000 DAU hoặc `sessions` > 2 GB | Giai đoạn 2 thống kê (A2): bỏ `sessions`, Quản trị đọc AE + `stats_daily`. |
| > 300.000 người đăng ký hoặc DB > 7 GB | Mở mảnh 2 (C2). |

**Tạo khoá đọc Analytics (tài khoản Cloudflare CHÍNH – vintagezulilyjewelry@gmail.com, KHÔNG dùng khoá đa năng `cf-token`):**
1. dash.cloudflare.com → đăng nhập tài khoản chính → ảnh đại diện (góc phải trên) → **My Profile** → **API Tokens** → **Create Token**.
2. Cuối trang: **Create Custom Token** → **Get started**.
3. Token name: `lexkite-analytics-read`.
4. Permissions: 1 dòng duy nhất **Account** · **Account Analytics** · **Read**.
5. Account Resources: **Include** · chọn đúng tài khoản chính (ID `e34e14b7ab35eaf2b3d9d84fcce011f7`). Client IP Address Filtering: để trống. TTL: để trống (hoặc 1 năm + nhắc gia hạn).
6. **Continue to summary** → kiểm chỉ có "Account Analytics: Read" → **Create Token** → bấm Copy (chỉ hiện 1 lần, không dán vào chat/tài liệu).
7. **Workers & Pages** → **lexkite** → **Settings** → **Variables and Secrets** → **Add**: Type **Secret**, Name `CF_ANALYTICS_TOKEN`, Value = khoá vừa copy · **Add** tiếp: Type **Text**, Name `CF_ACCOUNT_ID`, Value `e34e14b7ab35eaf2b3d9d84fcce011f7` → **Save** (môi trường Production).
8. **Deployments** → bản mới nhất → **⋯ › Retry deployment** (bí mật áp dụng từ bản triển khai mới).
9. Kiểm: GitHub › Actions › **capacity-watch** › Run workflow → xanh kèm số %; Quản trị › Hạn mức › 📈 có cột. Thu hồi: xoá khoá ở API Tokens (cảnh báo tự về "bỏ qua").

## 6. Cảnh báo tự động
- `.github/workflows/capacity-watch.yml` (01:25 UTC, đăng ký ở `infra/jobs.json`) → `scripts/capacity/check.mjs` → `POST /api/capacity {op:'check'}` (HMAC `LEXKITE_DRIVE_CLI_KEY`, 1 lượt/ngày).
- `functions/api/capacity.js`: GraphQL 30 ngày – D1 `lexkite-sync` (đọc/ghi), Pages Functions + mọi Worker (cùng hạn mức 100k) → `capacity_daily` → `evaluate()`: ≥ 60 % Free 3 ngày liền hoặc dự báo 80 % trong 14 ngày; X = ngày dự báo chạm 100 %.
- Báo: chuông Quản trị (`drive_alerts` kind `capacity`) + thư ≤ 1/24 h; hết nguy cơ → tự gỡ. Quản trị › Hạn mức › 📈 Xu hướng 30 ngày.
- **Chưa có khoá** → `/api/capacity` 503 `no-analytics-token` → workflow **bỏ qua trung tính** (xanh + ghi chú), không đỏ.

## 7. Lịch sử
- 23/10 (lượt 1): chỉ mục `quota_flag(until)`, `notices(revoked, at)`; dọn `sessions` theo `day`; đệm biên trạng thái hạn mức, thông báo, config (+ETag); cảnh báo nâng gói. Đọc: heavy 2.649 → 797.
- 23/10 (lượt 2 – kiến trúc §2): gói đồng bộ 1 dòng, cổng lược đồ, Analytics Engine + hybrid, bộ định tuyến mảnh, SW âm thanh 2000, `ai_cache` OR IGNORE. Ghi typical 112 → 53; trần Free 1.190 → 2.420 DAU.
