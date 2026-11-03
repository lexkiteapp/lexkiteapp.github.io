# WORLD-SCORECARD – thước đo "tốt nhất thế giới, vượt Duolingo" trên CI

> TL;DR: Một bảng điểm máy đo (0–100/trục) Lexkite vs Duolingo vs mục tiêu, tự sinh `content/pipeline/WORLD.md` hằng tuần (`world-scorecard.yml`). Gom điểm đã có, đo thêm trục còn thiếu, sàn chỉ tăng, Top 10 khoảng cách → `UX-BENCHMARK.md`.
> Đọc khi: chọn việc tiếp theo cho sản phẩm; thêm/sửa trục; đọc kết quả tuần.

**Mục tiêu.** Biến "chuyên nghiệp, top 1, vượt Duolingo" thành con số trên CI: mỗi trục có Lexkite, Duolingo, mục tiêu, khoảng cách. Chủ chỉ cần đọc `WORLD.md`.

**Nguồn (gom, không viết lại).** Mọi số đo đều do file của người sở hữu sinh ra; bảng này chỉ đọc:
- `content` ← `content/pipeline/SCORE.md` (`npm run content:score`).
- `learn` ← `content/pipeline/LEARN.md` (learnability, PR #427/#430). Chưa có thì ghi "–".
- `perf`, `a11y` ← `reports/lighthouse.json` (lighthouse.yml).
- `stitch` ← `docs/stitch-coverage.json`.
- `i18n` ← `scripts/i18n-qa.mjs --strict`.
- `shell` ← `scripts/test/shell-size.mjs`.
- `gates` ← kết luận lượt gần nhất trên main của npm-test (axe/a11y), visual-qa, new-ui-qa, mobile-qa (kèm LCP/CLS/INP), journey-e2e và stitch-quality-qc. Lấy qua GitHub API: `scripts/world/ci-status.mjs`.

**Trục mới, đo bằng máy:**
- `firstRun`: giây máy và số chạm từ trang giới thiệu tới câu trả lời đầu tiên được chấp nhận. Mục tiêu ≤ 30 s, ≤ 5 chạm.
- `todayTaps`: số chạm từ /app/ tới màn học của bài hôm nay. Mục tiêu 1.
- Hai trục trên đo bằng `scripts/world/probe.mjs` (Playwright) trên dist cục bộ. `/api` là giả lập, lexkite.com bị chặn bằng /etc/hosts.
- `habit` (tĩnh): chuỗi, đóng băng, mục tiêu ngày, nhắc học.
- `personal` (tĩnh): FSRS và số ngôn ngữ có lỗi L1.
- `offline` (tĩnh, đọc `sw.js`): shell, điều hướng dự phòng, gói từ.

**Lợi thế phải thắng rõ (`mustWin`, Lexkite − Duolingo ≥ 30):** `whyL1` (vì sao + lỗi theo 15 tiếng mẹ đẻ), `exam` (đề thật IELTS/TOEIC/TOEFL/Cambridge, đích 10 đề/kỳ), `addon` (tra từ trong trình duyệt), `aiLocal` (AI trên máy miễn phí), `noLimit` (không tim/năng lượng).

**Mốc Duolingo (an toàn).**
- `perf` và `a11y` đo bằng `scripts/world/duolingo-lh.mjs`. Script chạy ≤ 1 lần/tuần (bỏ qua nếu lần đo trước chưa quá 6 ngày) và gửi ≤ 3 request trang: robots.txt và 1 lượt tải trang chủ.
- Script đọc robots.txt trước; nếu robots chặn `/` thì không đo. Không đăng nhập, không cào nội dung.
- Các trục còn lại ghi tay trong `content/pipeline/world.axes.json`, kèm nguồn và ngày kiểm (`checked`). Điểm có `verified:false` (nguồn thứ cấp) hiện dấu `*`.
- Trục không đo được an toàn ghi "–" và chỉ so với mục tiêu. Không tự động hoá app đối thủ.

**Cách tính.**
- Tổng = trung bình có trọng số (`weight`) của các trục đo được. So với Duolingo chỉ tính trên các trục mà cả hai đều có số.
- Top 10 xếp theo (mục tiêu − Lexkite) × `impact` ÷ `cost`. Bảng này tự ghi vào khối `auto:world-gaps` của `UX-BENCHMARK.md`.

**Cổng và sàn.**
- Sàn nằm ở `content/pipeline/world.budget.json` và CHỈ TĂNG: chạy trên main thì `--raise` nâng sàn lên điểm mới.
- Trục dao động theo máy (perf, a11y, firstRun, gates) có biên `NOISE` trong script.
- `--check` trượt khi một trục dưới sàn hoặc mất số đo.
- `scripts/test/world-scorecard.mjs` (npm test) chặn mọi PR hạ hay xoá sàn so với origin/main. Không nới ngưỡng ([no-cuts]).

**Chạy.** Tự chạy thứ Hai 02:30 UTC, khi có workflow_dispatch, hoặc khi push lên main đụng các file của bảng. Muốn thử trên nhánh thì dispatch với `ref` = nhánh đó. Ở nhánh không phải main thì không đo Duolingo và không commit. Chấm nhanh tại chỗ (tĩnh, ~3 s): `node scripts/world-scorecard.mjs`. Probe chỉ chạy trên CI.

**Top-1 score.** Lượt tuần này cũng chấm bảng Top-1 (gộp World + quét đêm mới nhất) và nâng sàn của nó – `docs/TOP1-SCORE.md`.

**Thêm trục.** Thêm 1 mục vào `world.axes.json`, viết hàm đo trong `measure()` (tĩnh, hoặc qua `reports/world/*.json` do CI ghi), rồi thêm test.
