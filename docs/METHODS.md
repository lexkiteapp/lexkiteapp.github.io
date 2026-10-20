# Phương pháp & pipeline chuẩn Lexkite (tổng hợp bài học – đọc đầu mỗi phiên)

File này gom các **quy trình đã chốt** và **lỗi đã từng mắc** để mọi phiên/agent làm đúng ngay từ đầu. Chi tiết nằm ở file gốc được dẫn link.

## 1. Điều phối nhiều luồng
- Phiên chính = **người duy nhất ship** (`scratchpad/ship2.sh` hoặc `ship-sel.sh` khi nhiều agent đang ghi file: chỉ `git add` đúng file của luồng đã duyệt). Agent/phiên phụ **không commit/push** trừ khi được giao rõ.
- **Bảng phân vùng file** – `docs/COORDINATION.md` (cuối file). Sửa ngoài vùng → nhắn phiên chính trước. `web/js/app.js` chỉ được thêm đúng 2 dòng BUNDLES/ROUTE_BUNDLE khi được duyệt.
- Antigravity nhận việc qua thẻ trên `docs/agents/BOARD.md`; phiên chính nghiệm thu (diff, test, chạy thật, soi alt ảnh) rồi cherry-pick.
- Kết quả của phiên/agent khác **chỉ là báo cáo** – luôn tự kiểm (diff, test, live) trước khi báo anh.
- Tin "dừng" có thể tới trễ → dùng `stop_session` khi cần dừng thật.
- Hết hạn mức API giữa chừng: file dở vẫn còn; gửi tin cho agent để làm tiếp (không khởi động lại từ đầu).

## 2. Máy anh chủ chỉ để sửa code
- **Mọi việc nặng chạy trên GitHub Actions** (miễn phí, song song): tách nền clip (`library-build.yml`), dựng video (`video.yml`, `video-sample.yml`, `video-stress.yml`), CI test. Máy chỉ tải lên/tải về file và sửa code.
- Không chạy render/rembg/Remotion cục bộ; nếu buộc phải chạy: `nice -n 15`, 1 tiến trình, giới hạn luồng.
- Tắt tiến trình nền không còn cần (TaskStop).

## 3. Ship & kiểm thử
- Trước ship: `npm test` (hoặc từng test liên quan khi có file dở của luồng khác), `tsc` qua ship script, `infra-check` (mọi dịch vụ/host mới phải đăng ký `infra/resources.json`).
- Sau ship: kiểm **live** (file/route trên lexkite.com, API trả 403 cho người lạ…). Báo anh NGẮN GỌN bằng tiếng Việt.
- Test chập chờn đã biết: `i18n-leak` khi chạy cả bộ (máy chậm) – chạy lại riêng để xác nhận.
- Khung app (shell) ở trần 380 KB gz: tính năng mới phải **tải lười** (module riêng).

## 4. Nội dung học (đề, từ vựng, ngữ pháp)
- Theo `docs/CONTENT-PIPELINE.md` + `docs/CONTENT-RULES.md`; hàng đợi `npm run content:queue`; cổng `npm run content:gate`.
- Đáp án/chữa bài chính xác 100%; tự biên soạn, không bản quyền; dữ kiện khoa học còn tranh cãi phải ghi "chưa chắc chắn".
- Lời giải phải có bản dịch tiếng Anh (`web/i18n/explain/en.json`, dịch tay) → `explain-check` ≥ 98%.

## 5. Blog SEO (15 ngôn ngữ)
- `docs/BLOG-RUNBOOK.md`, `content/blog/WRITING-GUIDE.md`; `node scripts/blog-check.mjs` **0 lỗi 0 cảnh báo**; qualityScore ≥ 92.
- **Alt ảnh phải khớp `content/blog/shots.json`**; chú thích ảnh **không hứa tính năng app không có** (lỗi B1/B2). Tự động hóa (20/10): cổng `[caption-truth]` – `content/blog/shot-facts.json` + `scripts/blog-captions.mjs` (`--ai` chạy tay), luật ở `docs/CONTENT-RULES.md` §8.
- **Ảnh riêng từng bài** (17/10): bìa tự sinh + `shots:`/`diagrams:` trong front matter, dựng trên CI `blog-images.yml` (pilot → backfill), lưu R2 theo mã băm; alt ảnh chụp tự sinh từ chữ trên màn hình, `[alt-truth]` chặn alt bịa. Chi tiết `docs/BLOG-RUNBOOK.md` § Ảnh riêng từng bài.
- Cụm trụ cột + vệ tinh; từ khóa bản địa thật (không dịch máy); cơ cấu: evergreen ≥ 1/3, luyện thi ≥ 1/3, giao tiếp/công sở.
- Lịch: ≤ 1 bài/ngôn ngữ/ngày, cùng cụm từ khóa cách ≥ 7 ngày, giờ địa phương.

## 6. Nhân vật & tài nguyên hình ảnh (Kling)
- Kế hoạch credit: `docs/KLING-PLAN.md`. Chấm: `docs/MEDIA-QA-RUBRIC.md` – **chỉ dùng ≥ 90**; ghi `content/video/qa-log.md`.
- Element khoá nhân vật gắn với tài khoản → tài khoản mới phải tạo lại từ `dna.png`.
- Clip: Kling 2.5 Turbo 1080p 5 s (~25 credit) = **2 hành động/clip, cắt đôi**. Khung đầu = ảnh **tư thế trung tính đúng tỉ lệ DNA**; sau khi tải ảnh chờ ≥ 6 s và soi khung đầu trước khi bấm; prompt có "big clear motion" + nhắc phụ kiện nhận diện (kính, kẹp tóc, băng đô) "in every frame"; tránh hành động gây biến dạng (Leo ngả đầu → tóc buộc đuôi).
- **Thử trước – làm lô sau (anh chủ 17/10, BẮT BUỘC):** mỗi loại MỚI (động tác mới, tư thế ngồi, cầm/đưa đồ, bước vào khung, cảnh đôi, bối cảnh mới, kiểu ghép mới) chỉ tạo **1 clip thử** → tách nền → **dựng thành video thật** bằng pipeline (đúng phòng, đúng vị trí) → soi khung hình (điểm chạm sàn/ghế, phối cảnh, tay–đồ vật, mép) → đạt ≥ 90 mới tạo hàng loạt. Kịch bản đúng chưa chắc thành phẩm đúng – không tin prompt, chỉ tin video dựng thử.
  - Tư thế ngồi: ghế phải nằm TRONG clip phông xanh (tách cùng nhân vật, cùng phong cách ghế của phòng) – không cho nhân vật "ngồi" lên ghế vẽ trong ảnh phòng.
  - Đưa đồ cho nhau / cảnh đôi: cả 2 nhân vật trong CÙNG 1 clip (không ghép 2 clip rời).
- Clip ít chuyển động → **vai người nghe**, không bỏ. Clip lỗi một đoạn → cắt phần tốt.
- **Phông xanh (chuẩn cho mọi clip mới):** khung đầu = nhân vật tư thế trung tính trên `#00B140` phẳng, không bóng (`brand/library/chars/<id>/green.png`); tách bằng `scripts/video/chroma_key.py` (ngưỡng Cb/Cr 8–24 + luật "G không trội hơn R,B → chắc chắn nhân vật"). Bài học 17/10: ngưỡng cũ 18–46 làm đồ **teal** (yếm Ama, cardigan Leo, quần Mia) trong suốt ~40 % → tưởng nhầm Kling vẽ sai màu. Luôn soi ảnh đã tách trên nền **magenta** trước khi chấm.
- Bối cảnh: **phòng vẽ trọn nội thất** (lối trống giữa, phối cảnh 1 điểm, sàn rõ) – không ghép đồ vật rời giữa sàn (`docs/ASSET-LIBRARY.md` §0). Ảnh tham chiếu phong cách gửi bản nhỏ (`rooms/style-ref.jpg`, < 10 MB/lần tải).
- Kling: nút Generate đôi khi phải bấm 2 lần (lần 1 chỉ "analyze"); settings (tỉ lệ, số ảnh) reset khi tải lại trang.

## 7. Kho tài nguyên & sao lưu
- `scripts/video/library.mjs` (ingest → check → sync → verify → restore → report). Bản gốc `clips/src/`; bản dựng `clips/<id>.mp4` **phải là stacked** (màu trên + mặt nạ dưới, cao 2×) – khai sai = nhân vật bóng ma.
- Cổng kiểm: kỹ thuật (độ phân giải, fps, khung giật, chân trôi ≤ 1,5%, bóng sàn dính), giải phẫu & phong cách (tỉ lệ đầu/thân ≤ 12% so DNA, kính/phụ kiện), AI thị giác (Workers AI Llama 4 Scout + Llama 3.2 Vision kiểm chéo; Gemini cuối cùng).
- 2 nguồn: media.lexkite.com (bản tối ưu) + Drive riêng của Lexkite (bản gốc; dự phòng GrabCast).

## 8. Dựng video
- `docs/VIDEO-PIPELINE.md`: Kokoro (-16 LUFS) → faster-whisper (cần `requests`) → Rhubarb → Remotion (motion, phụ đề bật từng chữ, 12 chuyển cảnh, SFX tự tổng hợp) → QA.
- **Cổng nhất quán**: chủ đề → bối cảnh → dàn vai (`content/video/casting.json`); người nói phải có clip cử động miệng; giữ trang phục/vị trí/ánh sáng.
- **Chống lặp**: 45 khuôn × theme, bộ sinh biến thể có seed, không trùng ≥ 3 thành phần với 30 video gần nhất.
- Nhân vật đứng **trên điểm đứng của hồ sơ sàn**, có bóng tiếp xúc, cắt bóng sàn dính; grade màu chung nền + nhân vật; watermark **chữ "lexkite" mờ**, không ô vuông.
- Test bằng **dựng thật nhiều biến thể trên CI** (miễn phí) để bắt lỗi tiềm ẩn; soi khung hình, không tin điểm tự chấm.

## 9. Hệ thống & an toàn
- Không in/lưu token, khóa, mật khẩu; secret đổ thẳng từ file vào Cloudflare/GitHub (`wrangler pages secret put`, GitHub API mã hoá libsodium). Repo công khai.
- Không đăng nhập tài khoản thật để test; dùng `?sandbox=1`, fixture CI.
- Hạn mức chống lạm dụng: `docs/QUOTAS.md` (khách/đăng nhập/không giới hạn, chặn theo IP, cầu dao 80% gói miễn phí). Học cơ bản luôn miễn phí không giới hạn.
- Báo lỗi: `docs/REPORTS.md` – AI phân loại P0–P3, **lỗi trước, đề xuất tính năng phải admin duyệt mới làm**; Claude Code chỉ tự sửa lỗi rõ ràng, lỗi dữ liệu/tài khoản thì đề xuất.

## 10. Tài khoản & dịch vụ
- Email chính thức: vintagezulilyjewelry@gmail.com (không dùng khieudinhthong cho Google). GrabCast = backend lưu & đăng social của chủ dự án (workspace Lexkite = 4). Wrangler qua file token `~/.config/lexkite/cf-token`; push GitHub qua HTTPS + `gh auth token`.

## 11. Bài học 17/10 (bắt buộc nhớ)
**Làm việc chung**
- **Grep tính năng cũ trước khi làm mới.** Streak Freeze bị viết trùng hệ có sẵn (`app.js` applyFreeze, `game.freezes/frozen`) → đã hợp nhất về 1 nguồn `Core.Stats.freezeInfo(state.game)`. Mọi tính năng: tìm từ khóa trong `web/js` trước.
- **Đừng tin "success" của workflow** – đọc số liệu: lần nhập kho đầu báo xanh nhưng `Nhập 0 · lỗi 20` (sai đường dẫn `clips/src/`). Workflow mới phải tự đỏ khi kết quả = 0.
- **Thử 1 trước rồi mới chạy lô** áp dụng cả cho script/workflow của mình (không chỉ credit Kling).
- Lời ghi duyệt tay phải đúng sự thật: soi phóng to rồi mới ghi (vd. kính Diane).

**Video**
- Phông xanh: `chroma_key.py` = ngưỡng Cb/Cr 8–24 + "G không trội → nhân vật" (giữ teal/ô liu) + "xanh lá trội rõ, kể cả xanh đậm → nền" (bóng đổ trên phông, lỗi Mia) + chỉ giữ nhân vật chính và mảng trong khung bao (tay/vật lạ Kling vẽ thêm ở mép). Luôn soi trên nền magenta (`chroma-batch.yml` xuất bảng soi).
- Cổng tự động (MediaPipe, khung đột biến, gọng kính) **hay báo nhầm trên tranh 2D** → soi tay khung bị gắn cờ; báo nhầm thì `library.mjs approve <id> --waiver "lý do"` (lưu manualReview), lỗi thật thì để dự phòng.
- Kho dựng: nhập/kiểm/stacked chạy trên CI (`library-ingest.yml`), máy chỉ `sync` (upload). CI dựng video phải `library.mjs fetch-render` (trước 17/10 CI không có kho → mọi video thử chỉ nền gradient).
- Cảnh ngồi/bàn ghế: không ghép. Cảnh đầu = ảnh nhân vật + prompt bối cảnh (cách C), các cảnh sau cùng địa điểm = ảnh đó làm tham chiếu (cách A); soi từng ảnh (1 credit) trước khi tạo video. Chi tiết `docs/KLING-PLAN.md`.
- Prompt Kling: không nhắc "người ngoài khung" (Kling vẽ thêm tay/người) – ghi "không người/tay/vật nào khác lọt vào khung"; clip ¾ phải khoá hướng suốt clip (xem `content/video/green-batch.md`).
- Kling web: nút Generate hay phải bấm 2 lần; thứ tự ô trong bộ chọn tài sản ĐỔI khi có ảnh mới → zoom xác nhận ô trước khi chọn; lấy link mp4/ảnh qua API `projects-assets/feeds` trong trang.
- Giọng Việt cho video bài giảng: kiểm **giấy phép thương mại** trước (viXTTS, MMS-TTS cấm thương mại; app có quảng cáo).

**Nội dung & dịch**
- Dịch máy không được dịch cụm tiếng Anh mẫu (cấu trúc ngữ pháp, câu ví dụ trong ngoặc kép) → khoá cụm trước khi dịch; `i18n-qa` chặn.
- Blog: `blog-schedule --verify` trong `npm test` (≤ 1 bài/ngôn ngữ/ngày); kho ít bài tự rải 1–3 ngày/bài, giờ cao điểm địa phương. Slug vĩnh viễn – không dùng tên sách/thương hiệu người khác.
- Bài của Antigravity: chỉ được thêm liên kết vào bài cũ, không đổi nội dung/ngày đăng; soát alt ảnh với `shots.json`.
- **Alt/chú thích ảnh hay bị bịa tính năng** (B3 đợt 3: 72/72 sai – "trình soạn email công sở", "thi thử Cambridge", "3.000 từ", "chấm giọng thời gian thực"). Luật: alt mô tả ĐÚNG màn hình theo `shots.json` (dịch sang ngôn ngữ bài), chú thích = mô tả đúng + ngữ cảnh bài (không trùng giữa các bài – blog-check chặn). Bảng alt chuẩn 4 ngôn ngữ: script mẫu trong lịch sử phiên 17/10 (`alts.py`) – mở rộng cho ngôn ngữ mới thay vì để người viết tự đặt.
- **Gộp nhánh Antigravity:** KHÔNG checkout cả thư mục `content/blog` (nhánh cũ sẽ xoá lịch đã xếp/slug đã đổi ở main). Làm: `git diff <mốc> HEAD -- content/blog | git apply -3`; `briefs.json` gộp theo nội dung (khóa = lang+slug); sau đó kiểm `publishAt` bài cũ không đổi. BOARD/COORDINATION của nhánh họ: không lấy, phiên chính tự ghi nghiệm thu.
- Ảnh chụp app trong bài: bài đã đăng giữ ảnh giao diện tiếng Anh; bài MỚI (sau khi sửa xong lỗi chữ Việt lọt khi đổi ngôn ngữ 17/10) chụp giao diện đúng ngôn ngữ của bài (`blog-shots.mjs ?hl=<lang>`).
- **Đổi ngôn ngữ:** cấm gọi `t()` lúc nạp module (dịch lúc vẽ: hàm/getter); dữ liệu lưu giữ KHÓA, không lưu chữ đã dịch; app chờ `I18N.whenReady()` trước khi vẽ. Test `i18n-switch.mjs --scan` chặn.

**Hạ tầng**
- WAF Cloudflare chạy thật (token riêng `~/.config/lexkite/cf-waf-token`); gói Free: rate limit chỉ "block" (không challenge). Kiểm: `node scripts/cf-waf.mjs verify --live`.
- Trần `web/js` không tính `admin-*.js`; khung app (shell) theo dõi 380 KB gz – ảnh/icon nén lượng tử được thì nén.
- Add-on: sửa xong phải chờ `~/lexkite-ext-live` lên đúng phiên bản rồi mới báo.
- (17/10) **Thêm nhiều trang route mới → kiểm bot dịch nội dung**: `harvest-content.mjs` quét BFS có giới hạn MAX; thêm ~800 trang `#/usage/<từ>` làm bot hết lượt trước trang Phát âm → `strings.json` mất 1.088 câu, bản dịch sẵn 15 ngôn ngữ co 26%. Đã sửa: hết lượt thì gộp câu cũ, bỏ qua trang từng từ (`/dict/`, `/usage/`). Sau mỗi commit của lexkite-bot "i18n: cập nhật…" xem `--stat` – thấy hàng trăm dòng bị xóa là dấu hiệu mất dịch.
- (17/10) **Nhánh Antigravity cũ → gộp TAY, không merge**: B5/U3 làm trên nhánh tách từ bản cũ; gộp nguyên sẽ ghi đè bản sửa alt ảnh và bản sửa iPhone (hover chỉ cho chuột, ẩn gợi ý phím trên cảm ứng). Chỉ lấy đúng commit tính năng, giải xung đột giữ bản sửa mới.

- (18/10/2026) **nav-render báo "màn hình nhảy" ở #/home lần đầu** = hiệu ứng chủ ý sau cài đặt (pháo giấy canvas rAF + toast mừng 3,5 s + ô tra từ còn focus), không phải vẽ lỗi. Test giờ chờ hết pháo giấy/toast, bỏ focus, chờ `document.fonts.ready`, và khi lệch thì in chẩn đoán (DOM đổi, hiệu ứng chạy, ảnh đang tải) – đọc chẩn đoán trước khi sửa app. Lỗi CORS của dịch vụ từ điển ngoài trên WebKit (app đã bắt lỗi) bị bỏ qua.
- (18/10/2026) Play Data safety phải khớp trang chính sách từng dòng: đối chiếu `lexkite.com/en/privacy` mục 2 trước khi lưu (lần đầu thiếu Tên, Mã thiết bị, lịch sử tra tức thời).
- (18/10/2026) **Video: điểm 75/75 nhưng khung hình vẫn lỗi** – chữ karaoke "WAIT," đè tiêu đề hook, "on Friday?" hiện "onFriday?" (từ đang đọc phóng 1,06 × vượt đà lò xo ~1,17 ăn hết margin 12 px). Cổng cũ chỉ kiểm chuỗi ASS, không kiểm bố cục Remotion. Luật: mọi lớp chữ mới phải có hộp trong `motion.overlayBoxes` (cổng `layout`); bố cục chữ tính trong timeline, Remotion chỉ vẽ theo props. ΔE 45,6 ở office-02 với Diane là đo sai (áo blazer vàng bị đếm là da + hộp nhân vật không theo khung máy), không phải grade phòng.
- (18/10/2026) Vòng 2 duyệt khung: Diane đỏ rực = khung giữa chuyển cảnh glitch (saturate 1,6 + hue-rotate trên cả lớp cảnh), không phải grade; chữ "bandwidth"/"means" li ti = trang 0,36 s mà từ bật từ 0,35×; "cháy sáng 1,1 %" ở siêu thị = nền kem của thẻ ✅, không phải phòng. Trước khi sửa grade/ánh sáng: xem khung đó rơi vào chuyển cảnh/lớp UI nào.
- (18/10/2026) **Clip Kling – chân:** cổng `feet_still` cũ chỉ đo đáy bbox chung → nhấc 1 chân khi chân kia chạm đất bị lọt (6/14 clip trang phục mới). Nay đo RIÊNG từng chân. Khi clip có đoạn hỏng: không tạo lại, dùng `cut:[từ,đến]` trong kế hoạch library-ingest (+ `replace:true` nếu id đã có); tìm đoạn đứng yên bằng phép đo từng chân trên bản gốc phông xanh. Prompt khoá chân hiệu quả nhất: "From the waist down … still like a statue … knees straight, hips level, no weight shift".
- (18/10/2026) **Trang phục mới:** ảnh gốc `chars/<who>/green-<outfit>.png` nhập `--ref` → tham chiếu `who@outfit`; clip đặt tên `<who>_<action>_<outfit>`; lấy ảnh trang phục KHÁC công sở làm tham chiếu khi tạo trang phục mới (tránh Kling giữ dây thẻ/quần cũ). Kling hay ra ¾ TRÁI → clip `facing:left` (+ `mirrorOk:true` nếu mặt/tóc đối xứng).
- (18/10/2026) **Video tự động hằng ngày** = `video-auto.yml` → `scripts/video/auto.mjs` → Studio `ciCreate` → `video.yml` (VIDEO-PIPELINE §12). Thêm nội dung = thêm `content/video/auto/<khuôn>--<slug>.vars.json` rồi `node scripts/video/auto.mjs --check`; đọc duyệt câu chữ trước khi commit (agent viết 24 bài: 1 lỗi "?." do mẫu `"{{wrong}}."` – fill nay tự gộp dấu). Clip bị `ready:false` (stacked FAIL) làm kịch bản dùng nó trượt lint → sửa clip trước, đừng sửa kịch bản né.
- (18/10/2026) Clip **phông xanh** đi qua `chroma_key.py` (không phải `clip_to_layer.py` – rembg). Viền xám alpha ~0,5 quanh chân chỉ ở khung đầu = trung vị 2 khung (= trung bình) ở mép clip khi khung 0 (ảnh tham chiếu Kling) có bóng đổ → nay trung vị 3 khung liền nhau, dời cửa sổ vào trong ở 2 đầu. Trước khi sửa cổng: xác định đúng script nào dựng clip (`library.mjs` dòng ~605).
- (18/10/2026) media.lexkite.com: trạm CDN của máy CI còn đệm bản cũ của clip cắt lại (giữ tên), đệm BỎ QUA query `?v=` → sai sha256. fetch-render nay lùi về blob git bất biến theo `gitSha` (API GitHub). Từ máy này CDN trả đúng – lỗi chỉ thấy trên CI.
- (19/10/2026) **Video điện ảnh (pilot latte):** khung đầu KHÔNG cắt dán/phóng to nhân vật (sai tỉ lệ: Carlos to gấp 2,3× quầy). Làm: Kling Image 3.0 (2K, 9:16, 4 ảnh, 1 credit/ảnh) với ảnh tham chiếu phòng + nhân vật (nền xám trơn), prompt nói rõ tỉ lệ (quầy tới hông người lớn, teen ≈ 85 % chiều cao) → chấm ≥ 90 → ảnh 2-shot đã nhận làm tham chiếu cho ảnh cận (giữ bối cảnh) → video Kling 2.5 Turbo 5 s (25 credit) → Lip Sync (5 credit, giọng Kling: Ama = Peppy, Carlos = Michael; câu ≥ 2 s; TẮT nút "Audio" để khỏi lẫn tiếng nền tự sinh) → ghép `scratchpad/cine/assemble.py` (PIL vẽ chữ – ffmpeg máy này không có libass). Kling Image: bấm Generate 2 lần (lần 1 chỉ "Analyzing prompt").
- (20/10/2026) **Pilot sân bay (bank thứ 2):** cảnh OTS cận mặt → `bank.py` KHÔNG có gợi ý miệng sẽ khoá vào mắt đang chớp (độ lệch thời gian lớn nhất) → luôn truyền tâm miệng (đối số 5) và soi tờ sprite A–X trước khi dựng. Mặt nhân vật ở 1/3 trên khung (OTS quầy cao) đè hook/badge/vòng luyện → spec bài đặt `HOOK_Y`/`BADGE_Y`/`RING_EXTRA` (bản lesson5 của airport). Tải ảnh Kling luôn bằng `urlWithoutWatermark` (qget cũ lấy `url` có watermark "KlingAI 3.0"). Python có cv2: `PYTHONPATH=/private/tmp/claude-501/cvpkg $TMPDIR/vt12/bin/python`.
- (20/10/2026) **Xung đột merge ở web/js/i18n/<lang>.js** (mỗi file 1 dòng từ điển khổng lồ): KHÔNG giữ cả 2 phía nguyên dạng – file phình gấp đôi (115→229 KB gz, size-budget đỏ). Giữ cả 2 rồi chạy `node scripts/i18n-dedupe.cjs` (gộp thành 1 từ điển, dòng sau ghi đè) → kiểm size-budget + i18n-switch.
- (20/10/2026) **Gộp W1/N1 của Antigravity:** nhánh làm trên khung cũ (chuông thêm vào `web/index.html` – nay là trang giới thiệu; app ở `web/app/index.html`; tab admin nay khai trong `NAV` của admin.js) và đọc `state.user` (người đăng nhập là `Sync.user`) → gộp tay từng hunk. Nội dung lấy qua `t(biến)` (dữ liệu band, nhận xét) KHÔNG bị `i18n-missing` bắt → tự kiểm khóa tiếng Anh cho mọi chuỗi dữ liệu. Chữ do quản trị soạn hiển thị cho người học: luôn `esc()` + lọc URL (`#/…`, `https://`). Nội dung tiêu chí IELTS: diễn giải bảng mô tả band công khai (bản 5/2023), không chép nguyên văn, không thêm "như người bản ngữ".
- (20/10/2026) **Cảnh footage mới: làm 1 lượt theo `docs/CINE-SCENE-STANDARD.md`** (đủ 15 clip gồm cử chỉ, phản ứng, cận đạo cụ, vào/ra; viết hết thoại 6–8 bài trước). Sân bay phải làm 3 lượt vì danh sách cảnh thiếu – chủ nhắc: "làm 1 lần thôi".
- (20/10/2026) **Kho footage** (brand/library/cine, gitignore) được sao lưu lên repo RIÊNG TƯ `lexkiteapp/lexkite-footage` bằng `bash scripts/footage-backup.sh` – chạy sau mỗi lần thêm cảnh/clip/bài. Không để footage chỉ ở scratchpad (/tmp bị xoá).
- (20/10/2026) **Giọng đọc 404 trên audio.lexkite.com (~9.300 file):** commit của bot bằng `GITHUB_TOKEN` (audio.yml) KHÔNG kích hoạt `on: push` của workflow khác → pages.yml không deploy. Workflow nối nhau phải dùng `workflow_run`/dispatch. Sau deploy, `scripts/audio-cdn-check.mjs` kiểm mọi file trong `audio-index.js` (Pages + mẫu qua CDN); Worker chỉ đệm 404 trong 60 s.
- (20/10/2026) **Dựng bài cine (lesson5) – 3 lỗi âm thanh ẩn:** (1) bài không có tiếng ở t=0 → ffmpeg bắt đầu track âm thanh ở âm đầu tiên (track ngắn hơn video, qa5 đo lệch) → mọi bài thêm `foley/tone0.wav` −60 dB ở 0 s; (2) `alimiter` mặc định `level=1` tự kéo âm lượng lên (chỉnh −16 LUFS ra −14,5) → luôn `level=0`; (3) ffmpeg chạy nền không có `-nostdin` treo vô hạn → mọi lệnh ffmpeg trong lesson5/qa5 phải có `-nostdin` (qa5 nay bắt cả LUFS ngoài −16±1 và > 40 s). Bám miệng OTS Ama khách sạn chỉ giữ tới khung ~37 → giới hạn RANGE trong spec bài.
- (20/10/2026) **Chiến lược video mới (chủ chốt): CHỈ tiếng Anh, 1 bản cho mọi quốc gia.** Phụ đề 1 dòng tiếng Anh A2, nghĩa truyền qua diễn xuất/✗✓/biểu tượng/karaoke; không nhân 15 ngôn ngữ (chỉ dịch chú thích bài đăng). Ưu tiên NHIỀU ý khác nhau (tiểu phẩm hiểu nhầm, Stop saying X, X vs Y, lỗi theo tiếng mẹ đẻ, câu tình huống) sinh tự động từ dữ liệu trên GitHub Actions (0 token). Mẫu tham chiếu: English with Jeson and Jenny (hoạt hình 2 nhân vật, 6–8 triệu view).
- (20/10/2026) **Khung đầu Kling Image (nhà hàng):** `image_to_image` kling-image-v3_0 (và v3_0_omni) với ảnh nguồn ĐÃ có nhân vật → gần như trả lại nguyên bố cục (đổi góc OTS/MCU, thêm súp/hoá đơn đều bị bỏ qua; mất 43 cr). Cách chạy được: (1) ảnh phòng TRỐNG (text_to_image) + ref nhân vật, prompt dùng `图片1/图片2/图片3` → master; (2) OTS/MCU = cắt + phóng master (không dán, giữ tỉ lệ); (3) cận đạo cụ/vào/ra = text_to_image mô tả đủ nhân vật + phòng (1 cr/ảnh, theo prompt rất tốt). Ghi "inanimate, no face, no eyes" cho đạo cụ (bìa hoá đơn mọc mắt). Clip đi vào: Kling cho Ama đi xuyên người phục vụ khi 2 người gần nhau ở khung đầu → khung đầu phải có khoảng sàn rộng giữa 2 người.
- (20/10/2026) **Visual QA** (`visual-qa.yml`, tay + thứ Hai): máy dò tràn chữ/nút đè chữ/chữ ép cột/tương phản/RTL/vùng chạm trên 375·820·1440 × sáng/tối × en/vi/es/ar(+de/ru) – chỉ artifact 5 ngày; đọc report.md trước, chỉ mở ảnh nhóm lỗi đầu; ngưỡng `scripts/test/visual-qa.budget.json` chỉ được giảm.
