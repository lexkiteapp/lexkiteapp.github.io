# METHODS – luật lõi (đọc đầu mỗi phiên)

> TL;DR: Luật lõi: điều phối, repo/remote/ship, ngân sách, việc nặng = CI, i18n, nội dung, video, lỗi đã mắc, tài khoản & hạ tầng. Lịch sử và bài học dài đã chuyển sang archive/METHODS-HISTORY.md (không bỏ luật nào).
> Đọc khi: ĐẦU MỖI PHIÊN.

Mục lục mọi tài liệu: `docs/README.md`. Lịch sử/chi tiết cũ: `docs/archive/METHODS-HISTORY.md`.
**Luật tài liệu: một chủ đề = một file sở hữu, link thay vì chép lại (bảng chủ đề → file: `docs/README.md`).**
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
- Mergecheck: `bash scripts/mergecheck.sh <branch> "<msg>"` (gộp + dedupe i18n + smoke/tsc/vi-lint/i18n/size/unit/learn-flow + bump sw CACHE + push lên lexkiteapp).
- Trước ship: `npm test` (hoặc các test liên quan khi có file dở của luồng khác) + `node scripts/test/infra-check.mjs` (mọi dịch vụ/host/Worker/kho mới phải ở `infra/resources.json`).
- Bản xấu / mất dữ liệu: `docs/ROLLBACK.md` mục 0 (`bash scripts/ops/rollback-pages.sh` → `git revert`; D1 Time Travel; bản mã hoá trên Kho Drive). Mỗi push `main` được gắn tag `prod-…` + smoke tự động (prod-release.yml); KHÔNG tự rollback – cần chủ OK.
- **Trước MỖI lần push: `npm run prepush`** (tự dựng lại ci-triage, path-mix, confidence, extension/app + kiểm vi-lint, docs-budget, infra, ext-sync) rồi commit file được dựng lại. 26/10 Prod release đỏ 5 lần vì quên đúng các bước này.
- Sau ship: kiểm LIVE (lexkite.com, API 403 với người lạ…). Báo anh ngắn gọn bằng tiếng Việt.
- `i18n-leak` chập chờn khi chạy cả bộ → chạy riêng.
- Add-on `extension/app` PHẢI đồng bộ nguyên khối (`bash scripts/build-extension.sh`), không chép lẻ từng file. `node scripts/test/ext-dict-i18n.mjs all` vẽ #/dict/<từ> bằng add-on thật ở 14 ngôn ngữ (Google trả tiếng Việt + bộ nhớ đệm cũ) và chặn mọi chữ Việt; nghĩa từ điển cho người dùng không-vi luôn theo chuỗi giao diện → en (dictionary.js: `wantVi`/`forLang`, bộ nhớ đệm `_ml`).

## 3. Ngân sách dung lượng
- Khung app (shell) ≤ 377 KB gz (đo Node 22 = CI; không nâng) → tính năng mới phải tải lười. Từng module + Δ so với main: `node scripts/test/shell-size.mjs` (tóm tắt CI npm test); khóa i18n chỉ trang lười dùng → `--move` sang `en/lazyui.js` (gói i18nl). `web/js` ≤ 18,8 MB (không tính `admin-*.js`).
- `web/js/i18n/<lang>.js` ≤ 160 KB gz/ngôn ngữ; không thêm file vào `allowBig`.
- `scripts/test/size-budget.mjs`; ngưỡng `visual-qa.budget.json` chỉ được GIẢM.

## 4. Việc nặng = CI, Mac chỉ sửa code
- render / rembg / Remotion / Depth / TTS hàng loạt chạy trên GitHub Actions (`cine-render.yml`, `library-build.yml`, `library-ingest.yml`, `video*.yml`, `blog-images.yml`, `visual-qa.yml`).
- Bất đắc dĩ chạy cục bộ: 1 tiến trình, OpenCV/x264 2 luồng (sandbox không cho `nice`). Tắt tiến trình nền thừa.
- Python bền: `~/.config/lexkite/venv312/bin/python` (wrapper `brand/library/cine/anchor/tools/py.sh`); /tmp venv bị trình dọn xoá.
- Workflow "success" chưa đủ – đọc số liệu (từng báo xanh khi nhập 0 · lỗi 20). Workflow mới phải tự đỏ khi kết quả = 0.
- Workflow nối nhau dùng `workflow_run`/dispatch (commit bằng `GITHUB_TOKEN` không kích hoạt `on: push`).
- Thử 1 trước rồi mới chạy lô (áp dụng cả script/workflow).
- **Runner GitHub (27/10):** việc nền ≤ ~10/20 runner (`max-parallel`), PR hủy lượt cũ, prod-release 1 lượt chờ – `docs/CI-RUNNERS.md`.
- **Kiểm hình (27/10):** mọi màn mới qua `LKJC.visual` (journey-e2e/checks.js) 360/390 px: FAIL lớp nổi đè nút · tràn ngang · số liệu toàn 0; cảnh báo chữ cắt · ảnh đơn sắc · nút chính < 44 px.
- Màn mới chưa có trong journey-e2e → thêm `h.shot()` (chụp = tự kiểm hình); toast chỉ qua `UI.toast` (tự xếp hàng sau modal).

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
- **Cổng duyệt (chủ 22/10)**: mẫu mới/lô mới → tự QA → gửi anh mẫu + báo cáo số đo → CHỜ anh OK mới bật auto/dựng hàng loạt/xếp lịch.
- Luật dựng/QA/tách nền/Kling/kho 3D/cách giảng/ngữ pháp dựng: `docs/VIDEO.md` §9 (chuyển nguyên văn từ METHODS 27/10). QC mọi khâu: `VIDEO-QC.md`; chống trùng: `VIDEO-SCALE-PLAN.md`.


- App: ưu tiên chạy trên máy; tải theo bài; YouTube nhúng ảnh xem trước; ảnh AVIF/WebP.

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
- Add-on: Chrome của anh nạp bản giải nén từ **thư mục dự án chính** `addon dictionary/extension` (ID lgjmm…), KHÔNG phải `~/lexkite-ext-live` → sau mỗi lần đẩy add-on: `git merge --ff-only` bản checkout chính rồi báo anh bấm ↻. Lỗi "Errors" cũ đến từ tab mở trước khi cập nhật (code mồ côi) → đóng tab cũ + Clear all.
- Credit: 20/10 phí ~1.100 cr do làm cả lô trước khi duyệt định dạng → chỉ chi khi anh ghi rõ số cho đúng việc; trần từng hạng mục.
- Worktree agent có thể bắt đầu từ lịch sử CŨ (origin cũ) → brief luôn ghi "làm trên main mới nhất của lexkiteapp".
- Bản clone tạm tên chung (`$TMPDIR/lk`) bị phiên khác `rm -rf` giữa chừng (24/10, mất 1 lượt sửa) → clone tạm luôn tên riêng (`$TMPDIR/lk-<việc>-$$`), lưu bản vá vào scratchpad để chạy lại.
- Video IPA lấy theo từ gốc (waiting /weɪt/) + whisper có prompt kịch bản che lỗi phát âm → IPA chỉ từ kho theo đúng token (`pron.mjs`), ASR không prompt (28/10).

## 9. Tài khoản & hạ tầng (chi tiết `docs/INFRA-RULES.md`, `docs/API-KEYS.md`)
- Email chính thức: vintagezulilyjewelry@gmail.com (không dùng khieudinhthong cho Google). Domain lexkite.com; Firebase `lexkite-app` chỉ auth; dữ liệu đồng bộ ở D1 `lexkite-sync`.
- Wrangler qua file token `~/.config/lexkite/cf-token`; WAF: `node scripts/cf-waf.mjs verify --live`.
- Hạn mức: `docs/QUOTAS.md`; báo lỗi: `docs/REPORTS.md` (lỗi trước, đề xuất tính năng phải admin duyệt).
- Giọng/âm thanh mới: kiểm giấy phép thương mại.

---
Lịch sử đầy đủ (bài học 17–26/10, Kling, chroma key, kho, video, D1, điều phối): `docs/archive/METHODS-HISTORY.md`.

## Bài học hạ tầng – luật cô đọng (video/footage: `docs/VIDEO.md` §9; toàn văn: `docs/archive/METHODS-HISTORY.md` § "Chuyển từ METHODS 26/10")
- CI giọng: runner mới không có ffmpeg → `apt-get install ffmpeg`; ghim faster-whisper 1.0.3.
- D1: việc nền qua `_d1guard.js` (429 `quota-guard` ≥ 50 %), truy vấn theo khoá (EXPLAIN chặn quét bảng), không thăm dò API bằng vòng lặp; dữ liệu nội bộ ở D1 `lexkite-internal` (tài khoản CF thứ 2).
- Mọi việc nền khai báo `infra/jobs.json` + lease (fail-closed); neuron Workers AI tài khoản chính dành cho người dùng, nền dùng tài khoản 2.
- CI đỏ: `ci-triage.yml` phân loại; workflow mới phải thêm vào danh sách `workflow_run`; job gọi API bọc `scripts/ci/quota-skip.mjs`.

## Làm đúng 1 lần (anh chủ 24/10 – không sửa đi sửa lại)
Mọi việc mới (tính năng, pipeline, job nền, nội dung hàng loạt) đi qua 5 bước, ghi ngắn trong brief/PR:
1. **Thiết kế trước 10 dòng** – mục tiêu đo được; tài nguyên dùng (D1 đọc/ghi, AI, Drive, GitHub phút, khung app KB); điểm hỏng có thể xảy ra + cách chặn; ai giữ file nào.
2. **Checklist "Definition of Done" bắt buộc:** hạn mức (jobs.json + lease + ngân sách), không quét bảng, khung app ≤ 377 KB, i18n 15 ngôn ngữ, quyền riêng tư (không PII/URL đầy đủ), a11y, offline, có công tắc tắt + cách quay lại, test.
3. **Thử nhỏ → đo → mới nhân rộng** (1 clip / 1 bài / 60 ảnh / 1 lô) – chỉ nhân khi số đo đạt chuẩn.
4. **Sửa theo LOẠI lỗi, không theo lần:** mỗi lỗi tìm gốc (5 lần "vì sao"), thêm 1 test/cổng chặn cả loại đó (vd. EXPLAIN chặn quét bảng, overflow gate chặn tràn chữ, lease fail-closed).
5. **Một chủ mỗi mảng + agent ngắn** (TOKEN-RULES §9) – không 2 bên cùng sửa 1 file, không agent chạy dài.


- **Quảng cáo:** AdSense web / AdMob app / add-on KHÔNG BAO GIỜ; chỉ ở vị trí CHO PHÉP (deny-by-default), tải lười, cờ ở Quản trị – toàn văn `docs/ADS.md`. Bật nền tảng mới = làm `STORE-READINESS.md` §E cùng lúc.

## Cổng QA nội dung – BẮT BUỘC (24/10, `docs/CONTENT-QA.md`)
- MỌI nguồn nội dung qua `scripts/content-qa/gate.mjs` (npm test + ci.yml + trước commit job sinh); thư mục mới phải đăng ký `content/qa/sources.json` nếu không CI đỏ. 7 lớp, baseline `content/qa/baseline.json` **chỉ được giảm**, sửa theo LOẠI lỗi, 2 giám khảo khác họ lệch ≤ 1 – toàn văn `docs/CONTENT-QA.md`.
- Sinh nội dung/dịch: chỉ kho Gemini hoặc Workers AI tài khoản 2, đăng ký `infra/jobs.json`; **không** AI tài khoản chính. Lộ trình: `docs/CONTENT-ROADMAP.md`.
- Quét lỗi nền hằng đêm + liên kết nội bộ (joinPath/url-guard): `docs/QUALITY-SWEEP.md`.
- LCP app (24/10): màn đầu chỉ HTML + style.css, JS khung nạp sau khung hình đầu; không thêm `<script>`/preload/fade – `docs/UX-PUBLIC.md` §LCP.
- **Dung lượng repo (24/10):** `docs/STORAGE.md` (toàn văn luật: `archive/METHODS-HISTORY.md` § "Chuyển từ METHODS 27/10").
