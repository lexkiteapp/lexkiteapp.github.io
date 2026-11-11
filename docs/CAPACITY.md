# CAPACITY – chi phí Cloudflare theo người dùng, kiến trúc mở rộng & khi nào nâng gói

> TL;DR: Chi phí Cloudflare theo người dùng (đo bằng Miniflare, không dội production), kiến trúc mở rộng, hạn mức và trần DAU. Có ngưỡng hành động cho chủ khi nào nâng gói.
> Đọc khi: lập kế hoạch tải/chi phí hoặc thêm endpoint đọc/ghi D1.

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
| CI: Miniflare trước/sau + ước lượng node:sqlite; đỏ khi có SCAN ở đường người dùng hoặc số đo = 0; trang Quản trị > 5.000 dòng/lần mở hoặc SCAN sessions | `.github/workflows/capacity-sim.yml`, `scripts/capacity/admin-sim.mjs` |
| Test (`npm test`) | `scripts/test/capacity.mjs`, `scripts/test/sync-pack.mjs`, `scripts/test/schema-lock.mjs` |

Hồ sơ/ngày: **anon** khách 4 phút · **light** 6 phút, 13 thẻ · **typical** 2 phiên 12+10 phút, 50 thẻ, 1 chấm AI, bảng xếp hạng, add-on · **heavy** 4 phiên 90 phút, 180 thẻ, 5 chấm + 10 lượt hội thoại AI, lớp học · **teacher**.
Hỗn hợp DAU giả định: anon 30 %, light 35 %, typical 25 %, heavy 8 %, teacher 2 % (`MIX` – chỉnh theo Quản trị › Phân tích).

## 2. Kiến trúc (thiết kế 1 lần – mọi mục sau cờ, có test, có cách quay lại)

### A. Dòng ghi
- **A1 Cổng lược đồ** (`functions/api/_schema.js`): CREATE/ALTER/di chuyển chỉ chạy khi phiên bản `once(db, 'tên', N, …)` đổi; isolate lạnh chỉ hỏi Cache API (1 ngày/trung tâm) rồi `schema_ver` (1 dòng đọc). Trước: mỗi isolate lạnh ≈ 190 dòng đọc + 100 dòng ghi (đo). Quên tăng N khi sửa DDL → `schema-lock.mjs` đỏ (`infra/schema.lock.json`). Cờ `SCHEMA_GATE=0`.
- **A2 Thống kê phiên → Workers Analytics Engine** (`hit.js`, binding `HITS`, dataset `lexkite_hits`, miễn phí, không tính D1): mọi beacon ghi 1 điểm AE (ghi kép để tích lũy lịch sử 3 tháng). **Cần chủ bấm Enable Analytics Engine** – tới lúc đó binding tắt, mã tự chạy chế độ d1. Chế độ **hybrid**: nhịp "đang online" 3 phút (`hb:1` từ `web/js/app.js`) chỉ vào AE; D1 chỉ ghi lúc vào trang + lúc rời trang (giữ nguyên mọi báo cáo Quản trị vốn đọc bảng `sessions`); "đang online"/"đang xem" đọc AE SQL (`aeOnline`). Lượt xem trang của nhịp hb dồn sang lần gửi sau (không đếm trùng). Typical: thống kê 38 → 20 dòng ghi.
  Cờ `HIT_STORE`: trống = tự bật khi có binding + khoá đọc AE; `d1` = như cũ (rollback); `hybrid` = ép.
  **Giai đoạn 2** (khi `sessions` > 2 GB hoặc > 100k DAU): bỏ hẳn bảng `sessions` – Quản trị › Phân tích đọc AE SQL (≤ 90 ngày) + bảng tổng hợp ngày `stats_daily` (1 dòng/ngày/chỉ số, cron gộp từ AE) + `visit_day` (1 dòng/khách/ngày cho giữ chân/phễu). Chưa làm ngay vì: cần khoá đọc AE (chưa có) và phải kiểm SQL thật của AE trên dữ liệu thật trước khi thay số liệu Quản trị.
- **A3 Âm thanh**: Worker `audio.lexkite.com` chỉ chạy khi trình duyệt chưa có tệp; SW lưu cache-first, nay **2000 tệp** (trước 600 → người học nhiều bị đẩy ra rồi tải lại qua Worker); tệp tên theo nội dung + `immutable` 1 năm. 26.885 tệp/511 MB không vừa Cloudflare Pages (tối đa 20.000 tệp) → muốn **0 lượt Worker** → §A5 (R2 tĩnh). Rollback: `AUDIO_MAX` trong `web/sw.js`.
- **A4 Bộ đếm AI**: chỉ mục `quota_count(day)` (không chứa n), `ai_cache` dùng `INSERT OR IGNORE` (1 dòng thay 2).
- **A5 Media + âm thanh tĩnh trên R2 (0 lượt Workers)** – sự cố 01/11: Workers + Functions 174k/100k (lexkite-media 132k, audio 30k, Functions 11k) → mọi /api chết 16:22–24:00 UTC. Mọi yêu cầu tới Worker gắn tên miền đều tính 1 lượt, kể cả khi trúng cache → chỉ bỏ Worker mới hết. Static Assets/Pages không dùng được (≤ 20.000 tệp/bản; audio 68.004 tệp, media 32.792).
  - Thiết kế: bucket `lexkite-media-cdn` + `lexkite-audio-cdn` (khoá = đường dẫn URL, URL không đổi) gắn tên miền riêng; Cache Rule `lexkite_cdn_cache` (cache mọi tệp, TTL theo Cache-Control của đối tượng: 1 năm immutable, `library/` 1 ngày + SWR) → lượt lặp = 0 Class B; Transform Rule thêm CORS `*`, nosniff, CSP cho SVG; Range MP4 do R2. Nguồn chép (`scripts/cdn/hosts.mjs`, giữ đúng thứ tự dò của Worker: kho mới nhất thắng): m4 → m1 (`vimg/`, `mN/vimg/`), lexkite-media (blog, library), Release `wv-*` (`video/`), mọi kho kind audio. Đường lùi GitHub của âm thanh ở app/SW (lỗi/404/7 s → Pages m2 → gốc cũ).
  - Chép: `cdn-mirror.yml` mỗi giờ (:47), tăng dần theo sổ `_mirror/manifest.json`, chỉ tải blob tệp mới (clone thưa + sparse); lượt đầu ~100k tệp / 2,3 GB (≈ 10 % Class A tháng). Kho mới (m3…) tự vào theo `infra/media-repos.json`.
  - Chuyển: `node scripts/cdn/cutover.mjs prepare` → `switch --host audio` (cổng: `_mirror/status.json` thiếu 0, lỗi 0, < 26 h) → `verify --host audio` (200/206 Range, kiểu, cache, CORS, lần 2 HIT) → lặp với media. Chạy trên CI: `cdn-mirror.yml` action switch/verify/rollback. Quay lại: `rollback --host …` (Worker vẫn deploy).
  - Khoá: secret CI `CLOUDFLARE_API_TOKEN` (token "lexkite-dict GitHub Actions": Workers R2 Storage, Workers Scripts, Zone Workers Routes) – khoá S3 suy từ token (`scripts/cdn/creds.mjs`: id + sha256 giá trị), không secret mới. `cdn-mirror.yml` bước đầu `cutover.mjs check`: R2 chưa bật (mã 10042) / thiếu quyền → dừng trung tính + ghi việc chủ cần bấm vào Summary.
  - Lượt Workers mỗi cách: (a) **tên miền R2** (`r2/buckets/{b}/domains/custom`) = **0** lượt; (b) Worker đọc R2 qua binding = lượt **y như nay** (mỗi yêu cầu 1 lượt, chỉ bỏ phụ thuộc GitHub) → không làm. Thiếu quyền Cache/Transform Rules: vẫn chạy (cache mặc định theo đuôi tệp + Cache-Control đối tượng; CORS của bucket); chỉ `library/*.json` không cache biên (Class B, 0 lượt Worker) và thiếu nosniff/CSP SVG/X-Origin tới khi có quyền. Gắn R2 lỗi → tự gắn lại Worker.
  - **Đã chuyển 02/11 ~10:05Z**: audio 68.513 tệp / 1,34 GB, media 32.792 tệp / 0,93 GB (0 lỗi, mẫu kiểm 40/40 mỗi bên); verify thật: audio 3/3, media 20/20 (206 Range MP4, kiểu, cache 1 năm, CORS, nosniff). Lượt Worker media+audio: 09h 714 → sau chuyển ~0 (còn push ~6/h). Tệp mới lên R2 sau ≤ 1 h (cdn-mirror :47); trong lúc đó app/SW lùi GitHub.
  - Số đo (GraphQL `workersInvocationsAdaptive`, theo ngày UTC): 28/10 34,4k · 29/10 23,0k · 30/10 26,6k · 31/10 70,9k · 01/11 162,9k (media 132,3k, audio 30,5k, push ~150, mail ~2). Sau chuyển còn push + mail ≈ 150/ngày; /api chỉ còn Pages Functions.

### B. Đồng bộ (`functions/api/sync.js`)
- **B1 Gói 1 dòng/người**: mọi tài liệu (meta + cards_0..31) nằm trong 1 dòng `k='pack'` `{k: [h, body, updated]}`; thân giữ nguyên chuỗi máy khách gửi (đã gzip ở máy) → máy chủ không đụng nội dung thẻ, CPU ≈ 0 (đo: tách/gộp thẻ phía máy chủ tốn 28 ms cho 3.000 thẻ – vượt 10 ms CPU gói Free, nên KHÔNG làm). Giao thức v1 giữ nguyên → web, PWA cũ, app gốc, add-on không phải cập nhật.
  - 1 lượt đẩy = **1 dòng ghi** (trước 1 dòng/tài liệu, đo 7–12); 1 lượt kéo = 1 dòng đọc gói (trước liệt kê ~33).
  - **Khoá bất biến**: hash tài liệu; đẩy lại y hệt (thử lại) → 0 dòng; mở app chỉ gửi lại meta khác mốc `updated` → coi là giống → 0 dòng.
  - **Đồng thời**: ghi có điều kiện `WHERE h = <hash gói cũ>`; thua → đọc lại, gộp, thử ≤ 3 lần, rồi 409 (máy khách giữ "chưa gửi").
  - **Di chuyển lười**: lượt đẩy đầu gộp dòng cũ vào gói rồi xoá chúng trong cùng giao dịch (`EXISTS` gói mới – không bao giờ xoá khi gói chưa ghi).
  - Gói > 1,8 MB (≈ 30k thẻ) → tài liệu đó ghi dòng riêng; dòng riêng mới hơn đè lên gói khi đọc.
  - Cờ `SYNC_PACK=0` (rollback): vẫn đọc gói, ghi dòng riêng.
- **B3 Câu ngữ cảnh (P2-1.1)**: `ctx` (≤200 ký tự) + `src` (tên miền ≤64) là trường TRONG thẻ → nằm trong gói 1 dòng, **0 dòng ghi thêm**; máy khách cũ giữ nguyên trường lạ khi đẩy lại. Đo `scripts/test/sync-ctx.mjs`: +≲25 byte/thẻ sau gzip (câu lặp lại `contexts[0].text`, gzip khử trùng), trần thô ≈ 270 byte/thẻ. Làm sạch phía máy chủ (`functions/api/_ctx.js`: bỏ HTML/ký tự điều khiển, cắt độ dài, bỏ cả câu nếu giống email/số điện thoại) chỉ chạy cho nhóm thẻ máy khách đánh cờ `x:1` (có ctx) → giải nén + phân tích ≈ 1/32 số thẻ, mức vài ms; không cờ = đi thẳng (CPU ≈ 0). Máy khách bị sửa tay không đặt cờ thì chỉ làm bẩn dữ liệu CỦA CHÍNH MÌNH (không ai khác đọc) và giao diện luôn `esc`.
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

- **D4 Trang Quản trị đọc bảng tổng hợp** (sự cố 03/11 – trước đó Quản trị nằm NGOÀI cổng capacity-sim = giám sát mù).
  - Đo thật (GraphQL `d1QueriesAdaptiveGroups`, `node scripts/capacity/d1-sources.mjs --date=…`): 03/11 đọc **4,30 triệu dòng (86 % Free)** – quản trị 4,26 tr · người dùng 22k · việc nền 13k; 02/11: 1,93 tr (quản trị 1,66 tr). Nguyên nhân: Tổng quan/Phân tích/Trực tiếp/Tăng trưởng chạy ~25 câu quét cả bảng `sessions` mỗi lần mở (Phân tích không đệm), Trực tiếp tự làm mới 30 giây/lần, danh sách vid quản trị (`vid_uid JOIN users json_each`) đọc 507 lần/ngày. admin-guard e2e dùng fixtures, chặn mọi mạng – không phải nguồn.
  - Thiết kế (`functions/api/_rollup.js`): `stats_day` 1 dòng/ngày VN = JSON tổng hợp **chính xác** (đếm, tổng, AVG với NULL như SQLite, tập vid để đếm khách không trùng qua nhiều ngày, p75 LCP từ bảng tần suất, "đã loại" theo loại, cờ ret=0/đã thử theo nền tảng cho Tăng trưởng). Tăng dần, không cần cron: ngày thiếu/cũ → 1 câu `sessions WHERE day >= ?` (chỉ mục `sessions_day`) + 1 lô ghi. Ngày **chốt** sau hết ngày + 37 giờ (phiên gửi bù ≤ 36 giờ); chưa chốt dựng lại ≤ 10 phút/lần; danh sách vid quản trị đổi (băm `xh`) hoặc `ROLLUP_VER` đổi → dựng lại. Hôm nay: bộ nhớ isolate 20 giây; Trực tiếp chỉ đọc phiên vừa đổi (`last > ?`, chỉ mục `sessions_last`), đọc đủ hôm nay 15 phút/lần.
  - Đệm kết quả: Phân tích 5 phút (theo khoảng ngày + danh sách quản trị), Tổng quan 60 giây ("đang online" luôn tươi), Trực tiếp 20 giây/10 phút, Tăng trưởng 10 phút, vid quản trị 10 phút (isolate + Cache API). Không thêm chỉ mục `lower(email)`: sync.js ghi `users.email` mỗi lượt → +1 dòng ghi ở đường người dùng.
  - Khác biệt có chủ đích: Giờ cao điểm/Thứ trong tuần theo ngày VN của khoảng (trước: mốc trượt `now − days`). Mọi số khác khớp SQL cũ từng trường (`scripts/test/admin-rollup.mjs`).
  - Cổng: `scripts/test/admin-rollup.mjs` (npm test: khớp SQL cũ, ≤ 5.000 dòng/lần mở ấm, 0 SCAN sessions, tự làm mới ≤ 80 dòng) · `scripts/capacity/admin-sim.mjs` (Miniflare trong `capacity-sim.yml`, dữ liệu giống production; đỏ khi > 5.000 hoặc SCAN sessions) · cron `capacity.js` tách nguồn đọc (§6).
  - Số đo trước → sau (1 lần mở = Tổng quan + Phân tích 30 + Trực tiếp + Tăng trưởng 30 + Dung lượng, 2.796 phiên/20 ngày, **Miniflare = rows_read thật**, capacity-sim 03/11):

    | | Tổng quan | Phân tích 30 | Trực tiếp | Tăng trưởng 30 | Dung lượng | **Tổng** |
    |---|---:|---:|---:|---:|---:|---:|
    | Trước (SQL cũ) | 6.618 | 56.450 | 9.402 | 61.471 | 489 | **134.430** |
    | Sau – lạnh (lần đầu dựng stats_day) | 3.102 | 157 | 5 | 729 | 510 | **4.503** |
    | Sau – ấm (isolate mới) | 421 | 157 | 5 | 729 | 510 | **1.822** (74×) |

    1 giờ Trực tiếp tự làm mới 30 giây/lần: **219.312 → 5.826** dòng (38×). Ngày như 03/11 (~25 lần mở + vài giờ để mở Trực tiếp): ≈ 4,3 tr → ước < 0,1 tr.
  - Quay lại: biến Pages `ADMIN_ROLLUP=0` → SQL cũ (`LEGACY` trong admin.js). Còn quét: `users` (≈ 80 dòng, theo số tài khoản) – xem lại khi > 10k tài khoản.

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
| Ngay khi chủ bật R2 + quyền token | Media + âm thanh không qua Worker: §A5 (`scripts/cdn/cutover.mjs`). |
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
- **Nguồn đọc** (từ 03/11): cùng lượt cron đọc `d1QueriesAdaptiveGroups` hôm qua + hôm nay → `_capacity.js d1Source()` chia **người dùng · quản trị · việc nền** → `capacity_daily.src`; quản trị hoặc việc nền ≥ 10 % hạn mức đọc Free (`SRC_BUDGET`) → chuông `capacity-src` (Hạn mức) + thư ≤ 1/24 h; thư nâng gói kèm dòng nguồn đọc. Đo tay: `node scripts/capacity/d1-sources.mjs --date=YYYY-MM-DD` (sandbox Mac: thêm `NODE_USE_ENV_PROXY=1`).
- **Chưa có khoá** → `/api/capacity` 503 `no-analytics-token` → workflow **bỏ qua trung tính** (xanh + ghi chú), không đỏ.
- **Gói (03/11 ~13:40Z):** tài khoản chính lên **Workers Paid 5 USD/tháng** – D1 đã gồm **25 tỷ dòng đọc + 50 triệu dòng ghi/tháng** (hết trần 5 M/ngày; vượt 0,001 USD/M đọc, 1 USD/M ghi), Workers + Functions 10 triệu lượt/tháng (hết trần 100k/ngày). Tài khoản 2 (D1 nội bộ) vẫn Free. `_d1guard.planOf()`; mọi ngưỡng dưới đây tính trên **ratio = dự báo cuối tháng / phần đã gồm** (`project()`: max nhịp cả tháng, nhịp hôm nay × thời gian còn lại → vòng lặp lỗi lộ ra sau vài giờ). Không nới ngưỡng nào.
- **Trong ngày** (từ 03/11, `functions/api/_d1watch.js`): `POST /api/cron-kick` (Worker `lexkite-cronkick`, 30 phút) → `d1AnalyticsAdaptiveGroups` hôm nay → **50 %** (thư + chuông warn, giờ yên lặng 22–07 VN chỉ chuông) và **75 %** (thư + chuông crit, gửi ngay) – gói Paid 1 thư/bậc/**tháng** (`d1warn:<YYYY-MM>`), gói Free 1 thư/bậc/ngày; **≥ 100 % = trần chi tiêu** (dự báo vượt phần đã gồm → tốn tiền thật): thư "sắp tốn tiền" kèm ước tính USD, gửi ngay kể cả giờ yên lặng, nhắc lại mỗi ngày còn vượt (`d1spend:<ngày>`). Kho Drive `d1Alert` dùng chung thang này (bỏ thư 60 % trùng).
- **≥ 85 %** (`_d1guard.js SHED_PCT`): đường đọc không thiết yếu tự tiết kiệm – Quản trị trả bản đệm cũ (≤ 24 h, dải "số liệu đệm") hoặc 429 `quota-shed` (Retry-After tới 00:00 UTC); `/api/notices` trả danh sách rỗng. **Không bao giờ cắt:** `sync`, `account`, `handoff` (đồng bộ thẻ, đăng nhập, tiến độ học).
- **Ngân sách đọc theo route Quản trị** (`functions/api/_readbudget.js`): mỗi op đọc qua `meter()`; op > `ROUTE_DAY` (100–150k/ngày) hoặc cả Quản trị > `ADMIN_DAY` 500k (10 % Free) → op đó chỉ trả bản đệm tới 00:00 UTC. Thao tác ghi không bị chặn. Bộ đếm ở Cache API (0 dòng D1).
- **Nguồn số trong ngày:** Pages có `CF_ANALYTICS_TOKEN` → máy chủ tự đo GraphQL. Chưa có (tình trạng 03/11) → **lưới CI** `.github/workflows/d1-usage-watch.yml` (20 phút, secret CI `CF_ANALYTICS_TOKEN`) → `scripts/capacity/d1-usage.mjs` → `POST /api/capacity {op:'usage', reads, writes, mReads, mWrites}` (HMAC, hôm nay + cả tháng) → `drive_meta d1u:<ngày>`; `_d1guard.d1Usage` tin số này khi ≤ 45 phút (`CI_FRESH_MS`), cũ hơn → về số tự đếm (không cắt). Cả hai đường có test (`scripts/test/d1-cap.mjs`).
- **Việc của chủ:** tạo token Cloudflare **chỉ** quyền *Account Analytics: Read* (không dùng token có quyền Edit – quyền tối thiểu), đặt tên `CF_ANALYTICS_TOKEN` + `CF_ACCOUNT_ID` cho Pages project `lexkite`. Sự cố 03/11 "mù" đúng vì thiếu khoá này.

## 7. Lịch sử
- 23/10 (lượt 1): chỉ mục `quota_flag(until)`, `notices(revoked, at)`; dọn `sessions` theo `day`; đệm biên trạng thái hạn mức, thông báo, config (+ETag); cảnh báo nâng gói. Đọc: heavy 2.649 → 797.
- 23/10 (lượt 2 – kiến trúc §2): gói đồng bộ 1 dòng, cổng lược đồ, Analytics Engine + hybrid, bộ định tuyến mảnh, SW âm thanh 2000, `ai_cache` OR IGNORE. Ghi typical 112 → 53; trần Free 1.190 → 2.420 DAU.
- 03/11: Quản trị đọc 4,26 tr/ngày (85 % Free) → bảng tổng hợp `stats_day` + đệm + đồng hồ D1 Quản trị + cảnh báo tách nguồn đọc (§D4, §6).
- 03/11 (sự cố): D1 đọc 5,1 M/5 M – Cloudflare báo 90 % lúc 13:12Z trước mình. Nguồn: Quản trị › Phân tích từ **một** Chrome 156 trên Mac (VN – chủ hoặc phiên Claude in Chrome dùng chung trình duyệt) ~840 lượt `/api/admin` (đỉnh 00–01Z ≈ 3 M dòng; tab Trực tiếp tự làm mới cả ngày), mỗi lượt quét `sessions`. Không phải CI. Sửa: #543 (bảng tổng hợp) + ngân sách route/đệm cũ, thang 50/75/85 %, tab Trực tiếp ngừng sau 10 phút không thao tác, đồng bộ nghỉ đúng tới 00:00 UTC, cổng `scripts/test/sessions-scan-gate.mjs` (EXPLAIN: câu mới SCAN `sessions` → đỏ).
