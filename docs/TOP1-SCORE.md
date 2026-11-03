# TOP1-SCORE – một bảng điểm 0–100 "Top 1 thế giới" trên CI

> TL;DR: `scripts/top1/score.mjs` gộp số đo đã có (quality-sweep, bảng World, Stitch SSIM, CI trên main, vài test nhanh) thành 8 trục có trọng số → tổng /100, Top 10 nâng cấp theo lợi ích ÷ công sức, sàn chỉ tăng. Không quét lại. Chạy mỗi đêm trong quality-sweep, mỗi tuần trong world-scorecard (nâng sàn).
> Đọc khi: đọc/sửa bảng Top-1, thêm trục hay thành phần, chọn việc nâng cấp tiếp theo.

**Đầu ra.** Job summary (điểm từng trục + tổng), issue **"Top-1 score: X/100"** (nhãn `top1-score`, cập nhật tại chỗ), 1 dòng trong bản tin ngày (`workers/mail` 6c đọc tiêu đề issue), `content/pipeline/TOP1.md` (commit hằng tuần), sàn `content/pipeline/top1.budget.json`.

## Trục (trọng số cộng = 100)

Mỗi trục = trung bình các thành phần ĐO ĐƯỢC. Thành phần chưa có số đo (workflow chưa gộp, nguồn lỗi) ghi "–" và không tính; trục nào không có số đo thì tổng tính trên trọng số còn lại.

| Trục | Trọng số | Thành phần (nguồn – cách đo) |
|---|---|---|
| ui | 15 | `frame-consistency` (kết luận lượt gần nhất trên main: 100/0) · **SSIM vs Stitch** = trung bình `ssim` trong `scripts/test/stitch-diff.json` (ratchet = điểm CI − 0,01) ÷ 0,85 × 100 · màn đã Stitch (World `stitch`) |
| ux | 15 | qa-bot trên live (lượt không phải PR) · journey-e2e (job journey của đêm) · lần đầu → câu đầu (World `firstRun`: giây + số chạm) · số chạm tới bài hôm nay (World `todayTaps`) · test Thoát/Back + luồng học (`exit-guard.mjs`, `learn-flow.mjs`) |
| perf | 15 | Lighthouse perf 6 trang (quality-sweep) · mobile-qa máy yếu: LCP (≤ 2,5 s → 100, ≥ 6 s → 0), INP (200→500 ms), CLS (0,1→0,25), TBT (200→600 ms) · phạt CLS/long task/ngân sách Lighthouse của quét đêm |
| a11y | 15 | Lighthouse a11y · phạt axe AA serious/critical (gồm tương phản) mọi route × vi/en/ar × sáng/tối · phạt vùng chạm < 44 px |
| latent | 15 | phạt console/promise/pageerror/4xx/5xx/tràn ngang/cắt chữ/đè nút · phạt add-on E2E (mỗi ngôn ngữ trượt 2 điểm phạt) + trang nặng · **bất biến logic** `scripts/test/logic-invariants.mjs` (FSRS, chuỗi ngày, todayKey, 4 múi giờ) · test đồng bộ + chuỗi |
| content | 10 | World `content` (content-qa) · World `learn` (learnability) |
| i18n | 10 | World `i18n` (`i18n-qa --strict`, 15 ngôn ngữ) |
| notif | 5 | test `reminders.mjs` + `notify-ux.mjs` (khi phiên notif-ux gộp) · tĩnh: giờ yên lặng, nhắc theo giờ học, có `docs/specs/notifications.md` |

**Phạt → điểm.** Mỗi nhóm lỗi của quality-sweep có điểm phạt theo mức: critical 15, high 6, medium 3, low 1. Điểm thành phần = 100 · e^(−tổng phạt / 50). Đường cong không kẹt ở 0, nên sửa 1 nhóm lỗi luôn được cộng điểm.

**Duolingo.** Cột Duolingo lấy lại từ bảng World (`docs/WORLD-SCORECARD.md`): Lighthouse trang chủ ≤ 1 lần/tuần, robots.txt trước, không đăng nhập, không cào; các trục khác ghi tay trong `world.axes.json` có nguồn. Trục không có mốc an toàn thì ghi "–". So sánh tổng chỉ tính trên các trục có mốc.

## Top 10 nâng cấp

Ứng viên gồm: mỗi nhóm lỗi của quét đêm (bằng chứng: ảnh trên nhánh `quality-qa`, route × số lần) và mỗi thành phần < 100 (bằng chứng: số đo, link lượt CI hoặc file).
- **Lợi ích** = số điểm TỔNG tăng thêm nếu sửa xong mục đó (tính đúng theo trọng số trục và số thành phần).
- **Công sức** 1–5, bảng `EFFORT` trong script: 1 = CSS/aria, 2 = logic 1 màn, 3 = xuyên suốt hoặc hiệu năng, 4–5 = nội dung hoặc thiết kế lớn.
- Xếp theo lợi ích ÷ công sức.

## Sàn chỉ tăng (no-cuts)

- Sàn có cho tổng và cho từng trục. Lượt tuần trên main chạy `--raise` để nâng sàn lên điểm mới, trừ biên nhiễu `NOISE` (perf 3, a11y 2, ux 5, ui 2, latent 3, tổng 2).
- `--check` báo đỏ khi điểm dưới sàn, hoặc khi một trục đã có sàn mà mất số đo. Mất tín hiệu không được coi là sạch.
- `scripts/test/top1-score.mjs` (npm test) chặn PR hạ hoặc xoá sàn so với origin/main.

## Lịch, chi phí CI

| Ở đâu | Khi nào | Làm gì |
|---|---|---|
| `quality-sweep.yml` job report | 22:40 UTC hằng đêm | `--qs qs-report --ci --check --issue --summary`. Lưu artifact `qs-report` (items/result/lh, 21 ngày). Đỏ khi dưới sàn |
| `world-scorecard.yml` | thứ Hai 02:30 UTC | `--qs-latest` (tải `qs-report` của đêm gần nhất, không quét lại) `--ci --write --raise --check --issue`, rồi commit TOP1.md và sàn |

Không chạy trên PR. Cả hai workflow đã có concurrency, timeout và lọc paths (`scripts/test/ci-policy.mjs`). Thêm việc mỗi đêm: khoảng 2 phút runner (npm ci + test nhanh ~70 s). Chạy tại chỗ (tĩnh, không có dữ liệu quét đêm): `node scripts/top1/score.mjs`.

## Thêm trục hoặc thành phần

1. Thêm 1 dòng vào `measure()`, với `score` 0–100 hoặc `null`, kèm `note` và `evidence`. Nếu là phạt: `penalty: true` + ánh xạ `TYPE_AXIS`.
2. Thêm công sức vào `EFFORT` và test vào `scripts/test/top1-score.mjs`.
3. Trục mới: thêm vào `AXES`, giữ tổng trọng số = 100. Test sẽ chặn nếu tổng lệch.

## Sự cố gốc (3/11)

- **world-scorecard đỏ 2/11** (2 lượt push): bước "Lưu kết quả" gặp lỗi `cannot pull with rebase: You have unstaged changes`, vì build để lại tệp đã sửa mà chưa add. Đây là cùng loại lỗi i18n đã gặp 23/10, và còn nằm ở 33 workflow khác. Đã sửa: thêm `--autostash` cho cả 34 chỗ. Luật 5 của `ci-policy.mjs` chặn tái phát.
- **quality-sweep đỏ 27/10–1/11**: đây là phát hiện thật, không phải workflow hỏng. Có 6 lỗi a11y, đã sửa trong PR này:
  - huy hiệu 🧊 tương phản 3,6:1 → cặp teal Stitch;
  - nút Band đang chọn thiếu màu chữ riêng → thêm;
  - thanh tiến độ chuỗi chưa có tên → thêm;
  - `aria-label` đặt trên div trơn → thêm `role=img`;
  - link trong ô trống chưa có gạch chân → thêm;
  - tiêu đề gallery ở chế độ tối thiếu tương phản → sửa.
- Cổng `axe.js` (npm test) nay quét thêm `#/deck`, `#/streak`. `contrast.mjs` quét thêm streak, criteria, deck.
- 18 lỗi add-on E2E được giao cho phiên add-on qua coordinator.
- **Monitor mù:**
  - ci-triage nay ghi số lượt đỏ liên tiếp. Từ 3 lượt trở lên, tiêu đề issue có "(đỏ N lượt liền)".
  - cron-watch báo lịch đêm hoặc tuần không chạy sau khoảng lịch + 6 giờ, thay vì chờ 3 khoảng. Ví dụ: đêm 2/11 GitHub bỏ lượt quality-sweep mà không ai biết.
