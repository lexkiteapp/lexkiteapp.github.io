# CAPACITY – chi phí Cloudflare theo người dùng & khi nào phải nâng gói

Mục tiêu: biết **chi phí D1 / Functions thật cho mỗi người dùng**, trần DAU của gói Free và Paid, và được **cảnh báo trước** khi chạm hạn mức.
Không bao giờ dội tải production để đo (D1 Free đã cạn 2 lần tuần 20/10) – mọi số dưới đây đo trên D1 cục bộ.

## 1. Cách đo

| Thành phần | Tệp |
|---|---|
| Mô phỏng 1 ngày của từng hồ sơ người dùng, gọi **mã thật** `functions/api/*` (sync, hit, config, notices, league, class, ai, img) | `scripts/capacity/sim.mjs` |
| Đồng hồ D1: cộng `meta.rows_read` / `rows_written` theo từng yêu cầu, giữ mọi câu SQL → `EXPLAIN QUERY PLAN` | `scripts/capacity/meter.mjs` |
| Mô hình hạn mức, ngoại suy DAU, giá Paid | `scripts/capacity/model.mjs`, `functions/api/_capacity.js` |
| CI: Miniflare (workerd – cùng bộ máy D1 thật) → số đọc/ghi **thật**; đỏ nếu đường người dùng có truy vấn quét cả bảng | `.github/workflows/capacity-sim.yml` (push `functions/api/**`, thứ Hai hằng tuần, chạy tay) |
| Test (trong `npm test`) | `scripts/test/capacity.mjs` |

Chạy tại máy (sandbox Mac không mở được cổng cho Miniflare → dùng ước lượng node:sqlite):
`node scripts/capacity/sim.mjs` · trên CI: `node scripts/capacity/sim.mjs --d1=miniflare --users=5 --seed=1500`.
Biến `SIM_PUSH_MS` đổi nhịp đẩy đồng bộ để thử (mặc định 180000 như `web/js/sync.js`).

Hồ sơ (1 ngày): **anon** khách 1 phiên 4 phút · **light** 1 phiên 6 phút, 13 thẻ · **typical** 2 phiên 12+10 phút, 50 thẻ, 1 lần chấm AI, bảng xếp hạng, add-on ·
**heavy** 4 phiên 90 phút, 180 thẻ, 5 chấm + 10 lượt hội thoại AI, lớp học, add-on · **teacher** 1 phiên + báo cáo lớp.
Mỗi phiên: `/api/config` (≤ 1/giờ), beacon thống kê 15 s rồi 3 phút/lần + khi rời trang, kéo đồng bộ khi mở, đẩy ≤ 1 lần/3 phút + khi rời trang, `/api/notices`, `/api/img` cho từ tra, âm thanh qua Worker `audio.lexkite.com`.
Hỗn hợp DAU giả định: anon 30 %, light 35 %, typical 25 %, heavy 8 %, teacher 2 % (sửa `MIX` khi có số thật ở Quản trị › Phân tích).

## 2. Kết quả (Miniflare, 23/10/2026, sau tối ưu)

| Hồ sơ | Lượt Functions/ngày | Lượt Worker audio | Dòng đọc D1 | Dòng ghi D1 |
|---|---:|---:|---:|---:|
| anon | 6 | 8 | 3 | 13 |
| light | 11 | 6 | 82 | 31 |
| **typical** | **36** | **20** | **232** | **123** |
| heavy | 135 | 60 | 797 | 510 |
| teacher | 18 | 5 | 131 | 54 |
| **trung bình 1 DAU (hỗn hợp)** | **28** | **12** | **≈ 180** | **≈ 92** |

Typical theo endpoint (ghi): đẩy đồng bộ 53 (7 lượt × ~7 gói thẻ + meta) · beacon thống kê 44 (10 lượt × ~4,4: dòng phiên + chỉ mục `last` + lượt xem từng trang) · chấm AI 11/lượt · bảng xếp hạng 12.
Đọc: kéo đồng bộ 34/lượt (liệt kê ~33 gói), thông báo, bảng xếp hạng. Đọc **không** phải vấn đề.

Đầu dò D1 (dòng ghi thật mỗi câu lệnh): thêm mới = 1 + số chỉ mục · upsert/UPDATE dòng có sẵn = 1 (+1 nếu đổi cột có chỉ mục) · `ON CONFLICT … WHERE` không đổi = 0 · `INSERT OR IGNORE` trùng = 0 · `INSERT OR REPLACE` = 2.
→ Mỗi chỉ mục trên cột hay đổi = thêm 1 dòng ghi mỗi lần cập nhật.

Chi phí cố định: khởi động lạnh 1 isolate ≈ 190 đọc / 100 ghi (CREATE IF NOT EXISTS, di chuyển 1 lần) · trạng thái hạn mức 6 đọc/phút/trung tâm dữ liệu.
Dung lượng: **≈ 85 KB D1 / người typical** (600 thẻ).

## 3. Mô hình: DAU tối đa

Hạn mức (tài liệu Cloudflare – kiểm lại khi đổi giá):

| | Free (mỗi ngày) | Paid $5/tháng (đã gồm) | Vượt (Paid) |
|---|---|---|---|
| Lượt Workers + Pages Functions | 100.000 | 10 triệu/tháng (≈ 333k/ngày) | $0,30 / triệu |
| D1 dòng đọc | 5 triệu | 25 tỉ/tháng | $0,001 / triệu |
| D1 dòng ghi | **100.000** | 50 triệu/tháng (≈ 1,67 triệu/ngày) | **$1,00 / triệu** |
| D1 dung lượng | 500 MB/DB, 5 GB tổng | 10 GB/DB, 5 GB gồm | $0,75 / GB-tháng |
| KV (chưa dùng) | 100k đọc, 1k ghi/ngày | 10 triệu đọc, 1 triệu ghi/tháng | |
| R2 (ảnh blog) | 10 GB, 1 triệu lệnh A, 10 triệu lệnh B/tháng, không tính phí tải | | |
| Cache API (đệm biên) | miễn phí, không giới hạn | | |

Ngoại suy (không dội tải – nhân số đo/người + chi phí cố định):

| DAU | Lượt/ngày | Đọc/ngày | Ghi/ngày | Vượt Free | Paid ước $/tháng |
|---:|---:|---:|---:|---|---:|
| 1.000 | 40k | 0,18 M | 92k | không (sát trần ghi) | 5 |
| 10.000 | 0,40 M | 1,6 M | 0,90 M | lượt, ghi | 6 |
| 100.000 | 4,0 M | 16 M | 9,0 M | lượt, đọc, ghi | ≈ 260 |
| 1.000.000 | 40 M | 156 M | 89 M | tất cả | ≈ 3.000 (≈ 2.600 là dòng ghi) |

**Trần DAU gói Free: ghi ≈ 1.100 · lượt ≈ 2.500 · đọc ≈ 31.000 → nút thắt là DÒNG GHI** (xác nhận giả thuyết).
Gói Paid: phần đã gồm đủ ≈ 8.300 DAU (lượt) / ≈ 18.500 DAU (ghi); sau đó trả theo dùng – chi phí chủ yếu là dòng ghi ($1/triệu).
**Dung lượng là bức tường thứ hai:** 1 DB D1 tối đa 500 MB (Free) ≈ 6.000 người đăng ký typical, 10 GB (Paid) ≈ 120.000 người.

Lưu ý: số Cloudflare hiện tại của tài khoản (GraphQL 22–23/10) đã 40–57k dòng ghi và 6,5–11,5 triệu dòng đọc/ngày – phần lớn là **việc nền** (archive/Kho Drive) cùng DB `lexkite-sync`, không phải người học. Khi bộ điều phối chuyển việc nền sang D1 nội bộ (tài khoản 2), số của DB chính ≈ đường người dùng.

## 4. Ngưỡng hành động cho chủ

| Khi | Việc phải làm |
|---|---|
| Thư/chuông **"Nâng gói Cloudflare 5 USD trước ngày X"** (≥ 60 % Free 3 ngày liền hoặc dự báo 80 % trong 14 ngày) – thường ở **≈ 650 DAU** hoặc ≈ 60k lượt/ngày | Bật **Workers Paid $5** (dash.cloudflare.com › Workers & Pages › Plans) trước ngày X. Trong lúc chờ: Quản trị › Cài đặt › `hit_rate = 0.2` (giảm ≈ 30 % ghi). |
| > 5.000 DAU | `hit_rate` 0.1–0.2 (thống kê phiên lấy mẫu – số tỉ lệ vẫn đúng). |
| > 8.000 DAU (lượt vượt phần đã gồm, rẻ) | Phục vụ âm thanh **không qua Worker**: R2 + tên miền tùy chỉnh hoặc Cache Rule cho `audio.lexkite.com` (Worker audio = ~35 % lượt của người học). |
| > 20.000 DAU | Chi phí ghi > $5: cân nhắc nhịp đẩy đồng bộ 3 → 10 phút (đo: −9 % ghi), bỏ chỉ mục `sessions_last` (−1 ghi/beacon; "đang online" đọc theo `day`). |
| > 50.000 người đăng ký **hoặc** DB > 6 GB | Tách dữ liệu thẻ: chia D1 theo uid (nhiều DB) hoặc chuyển thân `docs` sang R2, D1 chỉ giữ hash. |
| > 100.000 DAU | Quản trị › Tổng quan/Phân tích đang quét `sessions` (30 ngày), `docs WHERE updated >= ?`, `notice_reads` – chuyển sang bảng tổng hợp theo ngày. |

## 5. Cảnh báo tự động

- `.github/workflows/capacity-watch.yml` (01:25 UTC hằng ngày) → `scripts/capacity/check.mjs` → `POST /api/capacity {op:'check'}` (HMAC `LEXKITE_DRIVE_CLI_KEY`, 1 lượt/ngày, không thử lại).
- `functions/api/capacity.js`: Cloudflare GraphQL 30 ngày – `d1AnalyticsAdaptiveGroups` (lọc DB `lexkite-sync`), `pagesFunctionsInvocationsAdaptiveGroups` + `workersInvocationsAdaptive` (mọi Worker, cùng hạn mức 100k) → bảng `capacity_daily` → luật `evaluate()` (`functions/api/_capacity.js`):
  ≥ 60 % gói Free **3 ngày liền** hoặc hồi quy 14 ngày dự báo **80 % trong 14 ngày** (dòng ghi, dòng đọc, lượt). Ngày X = ngày dự báo chạm 100 % (đi ngang → +7 ngày).
- Báo: chuông Quản trị (`drive_alerts` kind `capacity`, banner đỏ mọi tab → tab Hạn mức) + thư `REPORT_NOTIFY_EMAIL` ≤ 1 thư/24 h; hết nguy cơ → tự gỡ chuông.
- Quản trị › Hạn mức › **📈 Xu hướng 30 ngày**: cột theo ngày (% gói Free) cho ghi / đọc / lượt, vạch 60 % và 80 %.
- **Cần**: bí mật Pages `CF_ANALYTICS_TOKEN` (quyền *Account Analytics: Read*) + `CF_ACCOUNT_ID` (dùng chung `_d1guard.js`). Thiếu → `/api/capacity` 503, workflow đỏ.
- Bộ điều phối việc nền (`infra/jobs.json`): khi có trên main, đăng ký `capacity-watch` (ưu tiên `reports`, tài nguyên `d1_main`, ~1 phút).

## 6. Đã tối ưu (23/10, không đổi hành vi – mỗi mục có test trong `scripts/test/capacity.mjs`)

| Thay đổi | Hiệu quả |
|---|---|
| `_quota.js`: trạng thái hạn mức (cấu hình, khóa, cờ) dùng chung qua Cache API 60 s/trung tâm; quản trị đổi/khóa tự động → xoá đệm | 35 → 6 dòng đọc/lần, isolate thứ 2 = 0 (trước: mỗi isolate mỗi phút) |
| `_quota.js`: chỉ mục `quota_flag(until)`; `quota_count` chỉ mục `(day)` thay `(day, n)` | hết quét bảng cờ; mỗi lần đếm AI bớt 1 dòng ghi chỉ mục |
| `notices.js`: chỉ mục `notices(revoked, at)` + danh sách công khai đệm biên 60 s (lấy trước cửa sổ, lọc lại theo giờ thật; quản trị tạo/thu hồi → purge) | hết SCAN + sắp xếp; 1 lượt đọc/phút/ngôn ngữ/trung tâm thay vì mỗi lần mở app |
| `hit.js`: dọn phiên > 400 ngày theo `day` (chỉ mục) thay `at` (không chỉ mục) | hết quét cả `sessions` (chạy ~0,2 % beacon) |
| `config.js`: đệm biên 5 phút thật (trước chỉ ghi chú) + `ETag`/304; quản trị lưu → purge | D1 ≤ 1 lượt/5 phút/trung tâm |
| Sim nhịp đẩy đồng bộ (đã gom 3 phút + chỉ gói đổi, 1 batch/lượt) | 3 → 10 phút chỉ bớt 9 % ghi → giữ 3 phút |

Trước tối ưu (cùng Miniflare): typical 251 đọc, heavy 2.649 đọc; 3 truy vấn đường người dùng quét cả bảng. Sau: 232 / 797, 0 truy vấn quét.
