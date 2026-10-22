# METHODS – luật lõi (đọc đầu mỗi phiên)

Mục lục mọi tài liệu: `docs/README.md`. Lịch sử/chi tiết cũ: `docs/archive/METHODS-HISTORY.md`.
**Tiêu credit (Kling/mọi dịch vụ trả phí) → BẮT BUỘC `docs/CREDIT-RULES.md` trước.**

## 1. Điều phối
- Phiên chính = người DUY NHẤT ship. Agent phụ không commit/push trừ khi được giao rõ; chỉ `git add` đúng file của luồng mình.
- Vùng file: `docs/COORDINATION.md` (cuối file). `web/js/app.js` chỉ thêm 2 dòng BUNDLES/ROUTE_BUNDLE khi được duyệt.
- Antigravity nhận/trả việc qua `docs/agents/BOARD.md`; phiên chính nghiệm thu (diff, test, chạy thật, soi alt) rồi cherry-pick/gộp TAY (không merge nhánh cũ – xem §8).
- Báo cáo của agent khác chỉ là báo cáo → tự kiểm (diff, test, live). Dừng thật: `stop_session`. Hết hạn mức giữa chừng: nhắn agent làm tiếp, không chạy lại từ đầu.
- Grep tính năng cũ trong `web/js` trước khi viết mới (Streak Freeze từng bị viết trùng).

## 2. Repo, remote, ship
- Remote THẬT: `https://github.com/lexkiteapp/lexkiteapp.github.io` (nhánh `main`). `origin` cục bộ là repo cũ – KHÔNG dùng.
- Push: fetch + rebase lên main của remote thật rồi `git push https://x-access-token:$(gh auth token)@github.com/lexkiteapp/lexkiteapp.github.io.git HEAD:main` (không in token). `gh` CLI lỗi TLS trong sandbox → gọi API bằng `curl` + `gh auth token`.
- Ship: `~/.config/lexkite/ship.sh "<mô tả>"` (smoke → tsc → YAML → vi-lint → i18n → bump SW + add-on → commit → push → chờ live).
- Smoke: `node scripts/test/smoke.js "$PWD/web"` (phải ra `ERRORS none`).
- tsc: `npx -y -p typescript@5.6.3 tsc -p tsconfig.check.json`.
- Mergecheck: `bash scripts/mergecheck.sh <branch> "<msg>"` (gộp + dedupe i18n + smoke/tsc/vi-lint/i18n/size/unit/learn-flow + bump sw CACHE + push lên lexkiteapp). Remote thật: github.com/lexkiteapp/lexkiteapp.github.io (origin cục bộ là repo CŨ).
- Trước ship: `npm test` (hoặc các test liên quan khi có file dở của luồng khác) + `node scripts/test/infra-check.mjs` (mọi dịch vụ/host/Worker/kho mới phải ở `infra/resources.json`).
- Sau ship: kiểm LIVE (lexkite.com, API 403 với người lạ…). Báo anh ngắn gọn bằng tiếng Việt.
- `i18n-leak` chập chờn khi chạy cả bộ → chạy riêng.

## 3. Ngân sách dung lượng
- Khung app (shell) ≤ 380 KB gz → tính năng mới phải tải lười (module riêng). `web/js` ≤ 18,8 MB (không tính `admin-*.js`).
- `web/js/i18n/<lang>.js` ≤ 160 KB gz/ngôn ngữ; không thêm file vào `allowBig`.
- `scripts/test/size-budget.mjs`; ngưỡng `visual-qa.budget.json` chỉ được GIẢM.

## 4. Việc nặng = CI, Mac chỉ sửa code
- render / rembg / Remotion / Depth / TTS hàng loạt chạy trên GitHub Actions (`cine-render.yml`, `library-build.yml`, `library-ingest.yml`, `video*.yml`, `blog-images.yml`, `visual-qa.yml`).
- Bất đắc dĩ chạy cục bộ: 1 tiến trình, OpenCV/x264 2 luồng (sandbox không cho `nice`). Tắt tiến trình nền thừa.
- Python bền: `~/.config/lexkite/venv312/bin/python` (wrapper `brand/library/cine/anchor/tools/py.sh`); /tmp venv bị trình dọn xoá.
- Workflow "success" chưa đủ – đọc số liệu (từng báo xanh khi nhập 0 · lỗi 20). Workflow mới phải tự đỏ khi kết quả = 0.
- Workflow nối nhau dùng `workflow_run`/dispatch (commit bằng `GITHUB_TOKEN` không kích hoạt `on: push`).
- Thử 1 trước rồi mới chạy lô (áp dụng cả script/workflow).

## 5. i18n (15 ngôn ngữ) – pipeline G0
- `docs/I18N-PIPELINE.md`. Bố cục G0: chuỗi mới vào nguồn en (`web/js/i18n/en/*.js`, nhóm tải lười = danh sách LAZY trong `scripts/build-i18n.sh` → `web/js/i18n/<lang>/<nhóm>.js`) → `bash scripts/build-i18n.sh` → dịch thật 15 ngôn ngữ (`i18n-fix.mjs` / `scripts/i18n-fixed.json`) → `node scripts/i18n-missing.mjs --strict` + `node scripts/i18n-qa.mjs --strict`. Không để chữ en lọt ở 13 ngôn ngữ.
- Không gọi `t()` lúc nạp module; dữ liệu lưu KHÓA, không lưu chữ đã dịch; chờ `I18N.whenReady()` trước khi vẽ (`i18n-switch.mjs --scan`).
- Chuỗi dữ liệu qua `t(biến)` không bị `i18n-missing` bắt → tự kiểm khóa tiếng Anh. Chữ quản trị soạn: luôn `esc()` + lọc URL.
- Khoá cụm tiếng Anh mẫu (cấu trúc, câu ví dụ) trước khi dịch máy.
- Xung đột `web/js/i18n/<lang>.js`: giữ cả 2 phía rồi `node scripts/i18n-dedupe.cjs` → size-budget + i18n-switch.
- Sau commit bot "i18n: cập nhật…" xem `--stat`: hàng trăm dòng bị xoá = mất bản dịch (harvest hết lượt).

## 6. Nội dung & blog
- Nội dung học: `docs/CONTENT-PIPELINE.md` + `docs/CONTENT-RULES.md`; `npm run content:queue`, `npm run content:gate`; đáp án đúng 100%, tự soạn, không bản quyền; lời giải có bản en (`explain-check` ≥ 98 %).
- Blog: `docs/BLOG-RUNBOOK.md`; `node scripts/blog-check.mjs` 0 lỗi 0 cảnh báo, qualityScore ≥ 92; ≤ 1 bài/ngôn ngữ/ngày; slug vĩnh viễn.
- Alt/chú thích ảnh PHẢI khớp `content/blog/shots.json`, không hứa tính năng không có (B1 8/11 sai, B3 72/72 sai) – cổng `[caption-truth]`, `[alt-truth]`.
- Gộp blog Antigravity: `git diff <mốc> HEAD -- content/blog | git apply -3`, gộp `briefs.json` theo lang+slug, kiểm `publishAt` bài cũ không đổi; không checkout cả `content/blog`.

## 7. Video (chi tiết `docs/VIDEO.md`)
- Định dạng chính = NEWS-ANCHOR (Ama trái, Carlos phải, phông xanh), chỉ tiếng Anh, 1 ý/clip; diễn cảnh tạm dừng; nhà hàng/Priya loại.
- Kho footage (`brand/library/cine`, gitignore) → sao lưu `bash scripts/footage-backup.sh` (repo riêng `lexkite-footage`) sau mỗi lần thêm; không để footage chỉ ở scratchpad.
- Short ĐẠT lưu bền ở repo riêng `lexkite-shorts` (artifact CI hết hạn 14 ngày) + Drive (`drive-shorts.yml`).
- Mọi lớp chữ phải có hộp bố cục & bị QA kiểm; điểm tự chấm cao ≠ khung đúng → luôn soi khung/tờ ảnh ghép.
- ffmpeg: luôn `-nostdin`; `alimiter level=0`; tone −60 dB ở 0 s.

## 8. Lỗi đã mắc (một dòng mỗi lỗi)
- Gộp nguyên nhánh Antigravity cũ → ghi đè bản sửa mới (alt ảnh, iPhone hover); nhánh làm trên khung cũ (`web/index.html` nay là landing, app ở `web/app/index.html`).
- Mảng zsh 1-based → gửi Kling prompt rỗng (−50 cr): dùng `bash -c`, dry-run in lệnh.
- Script ghi đè biến prompt bằng đường dẫn ảnh (−43 cr): đọc lại lệnh trước khi gửi.
- Gửi cả lô 8 plate (225 cr) không thử 1 trước – vi phạm CREDIT-RULES.
- Cảnh footage làm 3 lượt vì thiếu danh sách clip – cảnh mới làm 1 lượt đủ 15 clip (`docs/archive/CINE-SCENE-STANDARD.md`).
- CDN media.lexkite.com đệm bản cũ, bỏ qua `?v=` → fetch theo `gitSha`.
- Play Data safety lần đầu thiếu dòng → đối chiếu `lexkite.com/en/privacy` mục 2 từng dòng.
- Không đăng nhập tài khoản thật để test; dùng `?sandbox=1`, fixture CI.
- Không in/lưu token/khóa/mật khẩu; secret đổ thẳng từ file (`wrangler pages secret put`, GitHub API libsodium). Repo công khai.
- Add-on: sửa xong chờ `~/lexkite-ext-live` lên đúng phiên bản rồi mới báo.

## 9. Tài khoản & hạ tầng (chi tiết `docs/INFRA-RULES.md`, `docs/API-KEYS.md`)
- Email chính thức: vintagezulilyjewelry@gmail.com (không dùng khieudinhthong cho Google). Domain lexkite.com; Firebase `lexkite-app` chỉ auth; dữ liệu đồng bộ ở D1 `lexkite-sync`.
- Wrangler qua file token `~/.config/lexkite/cf-token`; WAF: `node scripts/cf-waf.mjs verify --live`.
- Hạn mức: `docs/QUOTAS.md`; báo lỗi: `docs/REPORTS.md` (lỗi trước, đề xuất tính năng phải admin duyệt).
- Giọng/âm thanh mới: kiểm giấy phép thương mại.

---
Lịch sử đầy đủ (bài học 17–22/10, Kling, chroma key, kho, video): `docs/archive/METHODS-HISTORY.md`.
