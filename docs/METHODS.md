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
- **Cổng duyệt (chủ 22/10)**: mẫu mới/lô mới → tự QA → gửi anh mẫu + báo cáo số đo → CHỜ anh OK mới bật auto/dựng hàng loạt/xếp lịch.
- Người dẫn = giáo viên Mỹ (KHÔNG lower-third tên – chủ bỏ 22/10; giữ "Teacher's tip", "Repeat after me", giọng giáo viên); chỉ cử chỉ trung tính, đứng; không cử chỉ ký hiệu (đếm ngón/lắc ngón Kling hỏng).
- Hình: không làm mờ nền/hạt phim; không phóng người > 1.0×; push-in từ nền 1,25×; master CRF 17 ≥ 8 Mbps; QA độ nét (Laplacian), SSIM ≥ 0,97.
- Tách nền: trimap + AI matting (ViTMatte) + khử màu viền (pymatting) + chống ám xanh vùng viền + ổn định theo thời gian; QA viền (`scripts/video/matte_qa.py`).
- Liền mạch trong 1 video (chủ 22/10): mỗi người dẫn giữ 1 bộ trang phục suốt clip; 1 nền/1 địa điểm/1 ánh sáng cho cả clip; đổi cảnh bằng khung cắt khác của CÙNG nền (Ama nửa trái, Carlos nửa phải, giữ cố định khung mỗi người); đúng 180° (Ama trái nhìn phải, Carlos phải nhìn trái); QA 1 bg_id/clip.
- Khớp bối cảnh: `bg/<id>.zones.json` (độ sâu + phân vùng) → chỉ đặt người ở vùng sàn, tầm mắt ≈ chân trời; cổng AI nhìn khung ghép (đứng trên bàn/ghế/nước = trượt).
- Cách giảng (bắt buộc mọi kịch bản): 1 ý · sai→đúng + vì sao ngắn · ví dụ tình huống · mẹo nhớ hình ảnh · đoán trước đáp án · nói theo · nhắc lại giãn cách · lỗi theo tiếng mẹ đẻ (`VIDEO-SCALE-PLAN.md` §12).
- QC bắt buộc mọi khâu: `docs/VIDEO-QC.md` (trước & sau cho nhân vật, nền, kịch bản, giọng, phụ đề, video); trượt 1 cổng = không dùng/không đăng.
- Chống trùng & 100 điểm: `docs/VIDEO-SCALE-PLAN.md` (7 trục đa dạng, pHash/chromaprint, kiểm khớp chữ↔giọng↔khẩu hình, ≥ 90 mới đăng).

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

## 9. Tài khoản & hạ tầng (chi tiết `docs/INFRA-RULES.md`, `docs/API-KEYS.md`)
- Email chính thức: vintagezulilyjewelry@gmail.com (không dùng khieudinhthong cho Google). Domain lexkite.com; Firebase `lexkite-app` chỉ auth; dữ liệu đồng bộ ở D1 `lexkite-sync`.
- Wrangler qua file token `~/.config/lexkite/cf-token`; WAF: `node scripts/cf-waf.mjs verify --live`.
- Hạn mức: `docs/QUOTAS.md`; báo lỗi: `docs/REPORTS.md` (lỗi trước, đề xuất tính năng phải admin duyệt).
- Giọng/âm thanh mới: kiểm giấy phép thương mại.

---
Lịch sử đầy đủ (bài học 17–22/10, Kling, chroma key, kho, video): `docs/archive/METHODS-HISTORY.md`.
- (22/10/2026) **Viền đen + răng cưa người dẫn (0 cr):** nguyên nhân = `chroma_key.py` ghi màu ĐEN dưới vùng alpha 0 → `expand.py` chép vào kfull → mọi lần co giãn straight-alpha (lipsync.finish, warpAffine trong news.py) trộn đen vào mép; matte gần nhị phân + `MORPH_OPEN/CLOSE` trên alpha → bậc thang; kmask h264 trắng = 250 → người trong suốt 2 %. Sửa: `chroma_key.py --refine` dùng `scripts/video/matte_refine.py` (guided matte theo khoảng cách CbCr, co 1 px, mềm 0,3 px; màu dưới vùng trong suốt = màu nhân vật kéo ra (push-pull), khử ám G ≤ max(R,B)+6), ghép bằng `place()` (premultiplied, INTER_AREA khi thu) + `over()` (light wrap 2,5 px), `mask_levels()` cho kmask, QA `edge_qa()` (soft/width/dark) + `zoom()` 400 %. Không ngưỡng alpha sau khi co giãn.
- (22/10/2026) **CI giọng ad-hoc:** runner ubuntu mới KHÔNG có sẵn ffmpeg → `tts.mjs` (execFileSync ffmpeg) chết trong phonemizer với exit 7 không thông báo; luôn `apt-get install ffmpeg`. faster-whisper phải ghim 1.0.3 (bản mới lỗi PyAV `metadata_errors`) + `requests`.
- (22/10/2026) **Người dẫn đứng, cử chỉ trung tính (chủ):** clip mới đều ĐỨNG (Carlos có `carlos_stand_ref.png`), cử chỉ trung tính dùng được cho mọi câu, đầu = cuối cùng tư thế để nối; KHÔNG dùng cử chỉ biểu tượng (chỉ, like, đếm, nhún vai, lắc ngón). Kling: "relaxed gestures at chest height" thường chỉ ra tay ở eo/để xuôi; câu "both hands rise to chest height … for most of the clip" (ga2_explain) mạnh hơn. Ảnh ¾: kiểm hướng bằng tai/khuyên tai so với mặt; ảnh i2i ¾ đứng ra người NHỎ hơn ảnh gốc (mặt ~200 px → phóng 2×, hơi mềm).

## Footage bank 22/10 (Kling, footage agent) – bài học
- Nền: OCR (RapidOCR, `anchor/tools/bgqc.py`) bắt chữ giả trên biển; poster nhỏ OCR có thể sót → vẫn phải nhìn. Ghi "clock" trong prompt làm Kling THÊM đồng hồ; sửa chữ/số 0 credit bằng `paintbox/signfix/clockfix.py`. Mỗi nền mới phải có sàn đứng được (§11) – lỗi: hàng ghế/đài phun nước ở 1/3 dưới.
- Nhân vật MỚI từ image_to_image vẽ tay kiểu "mái chèo"/dính ngón; sửa đúng = i2i TỪ ref cũ (giữ thân + tay, đổi đầu/tóc/da/áo). Cổng tay `anchor/tools/ref_qc.py` + dấu kiểm tay người; `clip1.sh` không tiêu credit khi chưa qua.
- Kling 2.5 không làm động tác theo chiều sâu (nghiêng về phía camera) và làm yếu cử động thân của Carlos; quay ¾ trái/phải hay bị ngược → lật ngang 0 credit khi nhân vật đối xứng.
- Luôn chặn gửi khi dry-run không chứa đoạn prompt vừa sửa (`refsub.sh`): 1 lần gửi nhầm prompt cũ = 2 cr mất.
- Biểu cảm 22/10 (500 cr, 20/20 clip, `anchor/tools/ledger.txt` == EXPRESSIONS): Kling 2.5 KHÔNG giữ thứ tự 2 nhịp mặt (ngạc nhiên→cười, cau mày→gật) trừ khi ghi rõ khe thời gian ("In the first second …, then for the rest of the clip …"); Carlos giơ tay ngang ngực được khi ghi "level with the middle of his chest"; người nghe dặn "lips closed" vẫn há miệng (O/cười) → khóa miệng khi im lặng. Chống trùng: `anchor/tools/expr_sig.py` (chữ ký chuyển động đầu/miệng/mày/thân) chỉ là CỜ – xác nhận bằng tờ ảnh `expr_sheet.py`.
- (23/10/2026) **Kho nền rộng 2 người (BG LIBRARY 3, 950 cr → 517 nền):** 1 ảnh 16:9 2K (kling-image-v3_0, 1 cr; 4K chỉ có omni ≥ 2 cr) → Ama khung 9:16 tâm 32 %, Carlos tâm 68 % CÙNG ảnh (khung ở mép 3 % toàn đạo cụ – sai), Real-ESRGAN animevideov3 trên CI → 1350×2400. Cổng tự động `scripts/video/bg_gates.py` (CI `bg-gates.yml`): Kling đặt chân trời 0,55–0,69 dù prompt ghi 38 % → đo VP trên ẢNH RỘNG rồi chọn cao/độ dời khung cắt cho chân trời khung cuối 36–44 % (đừng loại); sàn/nước/mặt bàn dưới người đo trên phân vùng ảnh rộng (khung hẹp mất nhãn sàn); độ nét = acuity cạnh chuẩn hoá dải sáng (Laplacian phạt nhầm nền phẳng/đêm); pHash ≤ 6 (≤ 14 bắt nhầm phòng khác cùng bố cục); CLIP 0,92 cùng địa điểm ⇒ mỗi địa điểm chỉ 2–3 biến thể → chi cho ĐỊA ĐIỂM MỚI (đạt ~70 %) thay vì biến thể thứ 4–5; biến thể đêm/ngoài trời tự nhiên đạt kém nhất; cảnh sân bay/biển bảng hay ra chữ giả (OCR). Kling "too many requests" (400, 0 cr) → chờ rồi gửi lại, không tính là hỏng.
- (22/10/2026) **Người dẫn mới Mia/Jake (629/650 cr):** 22/25 clip đạt. Ảnh gốc quyết định biên độ mặt: Jake vẽ cười nhe răng + mắt liếc phải → Kling giữ nụ cười/ánh mắt (hmm hỏng, glance phải xin hướng mắt sẵn có rồi lật ngang 0 cr); Mia mày mảnh → không cau mày được. i2i ¾ từ ảnh chính diện ra NGHIÊNG HẲN (2 lần) → ¾ người mới cần cách khác. Credit: KHÔNG cộng nhẩm — `clip1.sh` có chặn `CAP=… CAPRE=…` tính từ ledger (lần này nhẩm sai 2 clip, vượt trần phụ 600 → 629).
- (23/10/2026) **Việc nền cạn D1 miễn phí 2 lần (5 triệu dòng đọc/ngày) làm sập tính năng người dùng:** `list`/`COUNT(*)` quét cả bảng + thăm dò `/api/drive` bằng vòng lặp. Luật: việc nền (Kho Drive, archive, verify, youtube.sync, báo cáo QC) qua `functions/api/_d1guard.js` (429 `quota-guard` khi ≥ 50 % hạn mức đọc, cảnh báo 60 %, CI dừng-mai-chạy, KHÔNG thử lại); truy vấn đường footage chỉ tra theo khoá (test `scripts/test/drive.mjs` chạy EXPLAIN QUERY PLAN, quét drive_files/drive_refs = đỏ); không thăm dò API bằng vòng lặp — đọc log workflow. Chi tiết `docs/VIDEO.md` §5b.
