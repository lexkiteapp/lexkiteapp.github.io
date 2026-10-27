# METHODS – luật lõi (đọc đầu mỗi phiên)

> TL;DR: Luật lõi: điều phối, repo/remote/ship, ngân sách, việc nặng = CI, i18n, nội dung, video, lỗi đã mắc, tài khoản & hạ tầng. Lịch sử và bài học dài đã chuyển sang archive/METHODS-HISTORY.md (không bỏ luật nào).
> Đọc khi: ĐẦU MỖI PHIÊN.

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
- Bản xấu / mất dữ liệu: `docs/ROLLBACK.md` mục 0 (`bash scripts/ops/rollback-pages.sh` → `git revert`; D1 Time Travel; bản mã hoá trên Kho Drive). Mỗi push `main` được gắn tag `prod-…` + smoke tự động (prod-release.yml); KHÔNG tự rollback – cần chủ OK.
- **Trước MỖI lần push: `npm run prepush`** (tự dựng lại ci-triage, path-mix, confidence, extension/app + kiểm vi-lint, docs-budget, infra, ext-sync) rồi commit file được dựng lại. 26/10 Prod release đỏ 5 lần vì quên đúng các bước này.
- Sau ship: kiểm LIVE (lexkite.com, API 403 với người lạ…). Báo anh ngắn gọn bằng tiếng Việt.
- `i18n-leak` chập chờn khi chạy cả bộ → chạy riêng.
- Add-on `extension/app` PHẢI đồng bộ nguyên khối (`bash scripts/build-extension.sh`), không chép lẻ từng file. `node scripts/test/ext-dict-i18n.mjs all` vẽ #/dict/<từ> bằng add-on thật ở 14 ngôn ngữ (Google trả tiếng Việt + bộ nhớ đệm cũ) và chặn mọi chữ Việt; nghĩa từ điển cho người dùng không-vi luôn theo chuỗi giao diện → en (dictionary.js: `wantVi`/`forLang`, bộ nhớ đệm `_ml`).

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
- **Ngân sách runner (27/10, gói free = 20 runner chung cả repo):** việc nền (ảnh `vocab-img*`, `video*`, `cine-render`, `pron-*`, `lexicon-expand`, footage, `bg-*`, `chroma-batch`, `library-build`…) tổng ≤ ~10 runner, luôn chừa ≥ 10 cho check PR + `prod-release`. Ma trận nền BẮT BUỘC `max-parallel` (≤ 4 cho lô lớn, ≤ 3 còn lại) – chỉ giãn thời gian, KHÔNG bớt shard/khối lượng (no-cuts). Đo 27/10: `vocab-img-scene` 10 runner + trùng lượt PR → check PR chờ hàng.
- Workflow chạy `pull_request`: `concurrency` group `${{ github.workflow }}-${{ github.head_ref || github.ref }}`, `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` (push main không hủy). `prod-release`/deploy: nhóm chung, không hủy → 1 lượt chạy + 1 lượt mới nhất chờ. `setup-node` thêm `cache: npm`. Không dùng concurrency nhóm chung để xếp hàng việc nền (GitHub chỉ giữ 1 lượt chờ, lượt chờ cũ bị HỦY = mất việc).
- Lượt `queued` 0 job nhiều giờ trong khi nhóm đã chạy lượt mới hơn = lượt ma của GitHub → hủy (`POST runs/<id>/cancel`, kẹt thì `force-cancel`).

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
- **Cổng duyệt (chủ 22/10)**: mẫu mới/lô mới → tự QA → gửi anh mẫu + báo cáo số đo → CHỜ anh OK mới bật auto/dựng hàng loạt/xếp lịch.
- Người dẫn = giáo viên Mỹ (KHÔNG lower-third tên – chủ bỏ 22/10; giữ "Teacher's tip", "Repeat after me", giọng giáo viên); chỉ cử chỉ trung tính, đứng; không cử chỉ ký hiệu (đếm ngón/lắc ngón Kling hỏng).
- Hình: không làm mờ nền/hạt phim; không phóng người > 1.0×; push-in từ nền 1,25×; master CRF 17 ≥ 8 Mbps; QA độ nét (Laplacian), SSIM ≥ 0,97.
- Tách nền: trimap + AI matting (ViTMatte) + khử màu viền (pymatting) + chống ám xanh vùng viền + ổn định theo thời gian; QA viền (`scripts/video/matte_qa.py`).
- Liền mạch trong 1 video (chủ 22/10): mỗi người dẫn giữ 1 bộ trang phục suốt clip; 1 nền/1 địa điểm/1 ánh sáng cho cả clip; đổi cảnh bằng khung cắt khác của CÙNG nền (Ama nửa trái, Carlos nửa phải, giữ cố định khung mỗi người); đúng 180° (Ama trái nhìn phải, Carlos phải nhìn trái); QA 1 bg_id/clip.
- Khớp bối cảnh: `bg/<id>.zones.json` (độ sâu + phân vùng) → chỉ đặt người ở vùng sàn, tầm mắt ≈ chân trời; cổng AI nhìn khung ghép (đứng trên bàn/ghế/nước = trượt).
- Cách giảng (bắt buộc mọi kịch bản): 1 ý · sai→đúng + vì sao ngắn · ví dụ tình huống · mẹo nhớ hình ảnh · đoán trước đáp án · nói theo · nhắc lại giãn cách · lỗi theo tiếng mẹ đẻ (`VIDEO-SCALE-PLAN.md` §12).
- **Ngữ pháp dựng (chủ 24/10 – "chuyển cảnh nghiệp dư" dù QC 100):** `scripts/cine/news_edit.py` (`NEWS_EDIT=A|B|C`): cắt đúng chỗ ngắt câu, không cắt giữa câu, đổi người = J-cut/cắt cứng/whip 6-8 khung (không pan 0,7 s), nhấn = punch 1.0↔1.12, chữ động vào/ra mượt, duck nền −40 dB. Cổng `scripts/cine/qa_edit.py` (cắt giữa câu = 0, cắt-đúng-ngắt ≥ 0,9, pan chậm = 0, pop-in = 0). Chi tiết: `archive/METHODS-HISTORY.md` § "Ngữ pháp dựng".
- QC bắt buộc mọi khâu: `docs/VIDEO-QC.md` (trước & sau cho nhân vật, nền, kịch bản, giọng, phụ đề, video); trượt 1 cổng = không dùng/không đăng.
- Chống trùng & 100 điểm: `docs/VIDEO-SCALE-PLAN.md` (7 trục đa dạng, pHash/chromaprint, kiểm khớp chữ↔giọng↔khẩu hình, ≥ 90 mới đăng).

- Video dạy học (27/10, `VIDEO-SERIES.md`): chỉ 2 người dẫn 3D (Carlos, Ama), đứng 1/3 phải; clip để nguyên, nói khi có giọng/ngậm khi nghỉ, ≤130 từ/phút; bố cục v14: 1 thẻ cố định trên + phụ đề dải dưới + thẻ kết FREE/QR, trong SAFE.

- Kho 3D (`scripts/video/bank3d/`): ảnh khung đầu qua `check_first.py` TRƯỚC khi tạo clip; mọi clip có câu khoá vị trí (`send2.sh`), neo ảnh chuẩn; sau: `qc2.py`, tờ ảnh, gate CI.
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

## 9. Tài khoản & hạ tầng (chi tiết `docs/INFRA-RULES.md`, `docs/API-KEYS.md`)
- Email chính thức: vintagezulilyjewelry@gmail.com (không dùng khieudinhthong cho Google). Domain lexkite.com; Firebase `lexkite-app` chỉ auth; dữ liệu đồng bộ ở D1 `lexkite-sync`.
- Wrangler qua file token `~/.config/lexkite/cf-token`; WAF: `node scripts/cf-waf.mjs verify --live`.
- Hạn mức: `docs/QUOTAS.md`; báo lỗi: `docs/REPORTS.md` (lỗi trước, đề xuất tính năng phải admin duyệt).
- Giọng/âm thanh mới: kiểm giấy phép thương mại.

---
Lịch sử đầy đủ (bài học 17–26/10, Kling, chroma key, kho, video, D1, điều phối): `docs/archive/METHODS-HISTORY.md`.

## Bài học footage/hạ tầng – luật cô đọng (toàn văn: `docs/archive/METHODS-HISTORY.md` § "Chuyển từ METHODS 26/10")
- Tách nền: không ghi màu đen dưới alpha 0, không ngưỡng alpha sau co giãn; dùng `matte_refine.py`, `place()`/`over()` premultiplied, QA `edge_qa()` + zoom 400 %.
- CI giọng: runner mới không có ffmpeg → `apt-get install ffmpeg`; ghim faster-whisper 1.0.3.
- Người dẫn luôn ĐỨNG, cử chỉ trung tính, không cử chỉ ký hiệu; khung đầu = khung cuối tư thế để nối.
- Nền: OCR (`bgqc.py`) + nhìn tay; không ghi "clock" trong prompt; mỗi nền phải có sàn đứng được; nhân vật mới = i2i TỪ ref cũ + cổng tay `ref_qc.py`.
- Kling: 2 nhịp mặt phải ghi khe thời gian; khóa miệng khi im; dry-run phải chứa đoạn prompt vừa sửa; KHÔNG cộng nhẩm credit (dùng `CAP`/`CAPRE` từ ledger); "too many requests" (0 cr) = chờ gửi lại, không tính hỏng.
- Kho nền rộng: cổng `bg_gates.py`; chi cho ĐỊA ĐIỂM MỚI, không biến thể thứ 4-5 của cùng địa điểm.
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

- **Quét lỗi tiềm ẩn hằng đêm (24/10):** `quality-sweep.yml` (docs/QUALITY-SWEEP.md) – 0 token, hermetic (/api = {}), 1 issue "quality-sweep" + 1 dòng bản tin. Lỗi nó tìm ra → sửa theo LOẠI + thêm cổng vào npm test, đừng chỉ vá từng trang.
- **Liên kết nội bộ (24/10, /vi/blog/-lang 404):** gốc lỗi = `web/blog-lang.html` cắt `^/blog/?` làm "/blog-lang" thành đuôi "-lang". Cổng: `scripts/lib/url-guard.mjs` (badPath/joinPath – URL bài dựng qua joinPath), `scripts/test/links-js.mjs` (jsdom chạy script thật, quét liên kết DOM + tĩnh của mọi trang blog, ma trận chuyển hướng /blog*, gợi ý 404), `crawl.js` quét href do JS sinh. Mọi URL ghép từ biến → dùng joinPath, không nối chuỗi trần.

- **Quảng cáo (24/10, `docs/ADS.md`):** AdSense web / AdMob app / add-on KHÔNG BAO GIỜ; danh sách vị trí CHO PHÉP (Hôm nay, cuối blog, toàn màn hình sau phiên, có thưởng tự chọn) – mọi chỗ khác chặn (`web/js/ads/policy.js`, test `ads.mjs`). Mọi mã quảng cáo tải lười, khung app chỉ có vỏ ≤ 1 KB; cờ ở Quản trị › Quảng cáo (công tắc khẩn cấp `ads_kill`); cổng giữ chân tự giảm tần suất. Bật nền tảng mới = làm `STORE-READINESS.md` §E cùng lúc.

## Cổng QA nội dung – BẮT BUỘC (24/10, `docs/CONTENT-QA.md`)
- MỌI nguồn nội dung (Claude, Antigravity, bot CI, người) qua `scripts/content-qa/gate.mjs` trong `npm test` + `ci.yml` + trước commit của job sinh (`explain.yml`). Thư mục nội dung mới phải đăng ký `content/qa/sources.json`, nếu không CI đỏ.
- 7 lớp: lược đồ + đối chiếu kho từ · ✗/✓ hợp lệ · **2 giám khảo khác họ mô hình cùng ≥ 4, lệch ≤ 1** (không đạt → hàng duyệt, KHÔNG xuất) · CEFR khớp cấp bài · dịch (dịch ngược ≥ 0.8, không lẫn tiếng, đúng chữ viết, giữ `{biến}`/`[ô]`/số) · kiểm mẫu ≥ 5%/lô, sai > 2% → loại cả lô · báo lỗi "nội dung sai" từ 3 thiết bị → tự ẩn (`content_hidden`), sửa xong thì `unhide`.
- Lỗi cũ nằm ở `content/qa/baseline.json`, **chỉ được giảm** (`--lower-baseline`). Sửa theo LOẠI lỗi, không theo từng mục.
- Sinh nội dung/dịch: chỉ dùng kho Gemini hoặc Workers AI tài khoản 2, đăng ký `infra/jobs.json`; **không** dùng AI tài khoản chính. Lộ trình mảng: `docs/CONTENT-ROADMAP.md`.
- **LCP app (24/10):** màn đầu /app/ phải vẽ được chỉ bằng HTML + style.css; JS khung nạp sau khung hình đầu (dist, `scripts/app-loader.mjs`). Không thêm `<script>`/preload/hiệu ứng mờ dần cho màn đầu; đo bằng `app-lcp.yml` (đẩy nhánh `perf/app-lcp*`) trước/sau – docs/UX-PUBLIC.md §LCP.
- **Dung lượng repo (24/10, docs/STORAGE.md):** media nặng (mp3, ảnh theo từ, video) KHÔNG vào repo chính – sinh vào `.media-out/` rồi `scripts/media/push.mjs` đẩy kho media (`infra/media-repos.json`, round-robin hash trên kho open, tệp không bao giờ dời; đẩy xong mới commit chỉ mục). Cổng `size-guard` (cây ≤ 600 MB, ≤ 20 MB nhị phân/commit, ngoại lệ `Size-Guard: allow`). KHÔNG viết lại lịch sử git main. Kho ≥ 70 % → full + mở kho kế (STORAGE §2). Agent: clone tạm đặt tên RIÊNG (vd. `$TMPDIR/<việc>-<id>`) – thư mục `$TMPDIR/lk` từng bị phiên khác xoá giữa chừng.
