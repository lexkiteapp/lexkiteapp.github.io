# Kho tài nguyên hình ảnh Lexkite – thiết kế để ghép tổ hợp vô hạn

Mục tiêu: một kho **mô-đun** (nhân vật, biểu cảm, cử chỉ, phòng trống, đạo cụ, phương tiện, hiệu ứng) đủ phủ mọi nơi dùng trong hệ sinh thái – video Shorts/YouTube, "Call Mia", roleplay, bài học trong app, thumbnail, social, blog, email, thông báo, cửa hàng ứng dụng – và **ghép bằng script** thành hàng nghìn khung hình khác nhau mà vẫn đồng nhất phong cách. Ảnh AI (Kling) chỉ là **nguyên liệu**; sản phẩm cuối do máy dựng (SVG/Remotion) → $0/khung hình.

Liên quan: `docs/VIDEO-PIPELINE.md` (dựng video), `docs/VIDEO-CONTENT-PLAN.md` (nội dung), `docs/MEDIA-QA-RUBRIC.md` (chấm điểm), `content/video/assets.json` (danh mục máy đọc), `docs/BRAND-RULES.md`.


## 0. Luật chống "lơ lửng" (ưu tiên cao nhất – anh chủ 17/10)
- **Phòng = cảnh hoàn chỉnh**: Kling vẽ trọn nội thất, đèn, cửa sổ, đồ trang trí trong cùng 1 phối cảnh & ánh sáng; chừa **vùng sàn trống** (giữa hoặc 1/3 trái/phải) cho nhân vật. KHÔNG ghép đồ vật rời vào giữa sàn.
- Đồ vật rời (sprite) chỉ dùng làm **tiền cảnh cắt mép khung** (mép bàn, cốc, cây sát cạnh dưới) – không cần chạm sàn nên không thể lơ lửng.
- Mỗi phòng có **hồ sơ sàn** `rooms/<id>.json`: `floor:{yNear,yFar}`, `vanish:[x,y]`, `scaleAt(y)` (chiều cao người theo độ sâu), `stand:[{x,y}]` các điểm đứng hợp lệ, `light:{dir,warmth}`.
- Ghép nhân vật: chân = điểm `stand`, cao = `scaleAt(y)`, **bóng tiếp xúc** + bóng đổ theo `light.dir`, chỉnh màu theo `warmth`; ngồi chỉ ở ghế/sofa vẽ sẵn trong phòng (có điểm `seat`).
- Cổng tự động: chân lệch vùng sàn > 1% chiều cao khung, tỉ lệ sai > 5%, thiếu bóng → chặn.

## 1. Quy chuẩn chung (bắt buộc để ghép không lệch)
| Quy chuẩn | Giá trị |
|---|---|
| Phong cách | phẳng 2D vector, viền nâu đậm mềm, đổ bóng cel 1 tầng, bảng màu ấm + điểm nhấn teal/cam thương hiệu |
| Góc nhìn | **chính diện (front elevation)** như game cuộn ngang; nhân vật thêm ¾ và nghiêng |
| Thang đo | 1 m = 220 px ở canvas chuẩn 1080×1920; nhân vật cao ~1,65–1,85 m; mỗi đạo cụ ghi `heightM` |
| Đường sàn | 9:16: y = 1500 px; 16:9: y = 900 px – mọi phòng và đạo cụ đặt chân lên đường này |
| Tầm mắt | 1,5 m trên sàn (phòng vẽ theo tầm mắt này) |
| Vùng an toàn | 9:16: 1/3 dưới để phụ đề; 16:9: 15% dưới |
| Định dạng lưu | `svg` (chuẩn), `png` 2× dự phòng; nền trong suốt; tên `kind/slug@variant.svg` |
| Nguồn gốc | ghi `source` (kling task id / prompt / ngày) + `qa` điểm – thiếu thì cổng chặn |

## 2. Danh mục cần phủ (ưu tiên P1 → P3)
### 2.1 Nhân vật
| Nhóm | Số lượng | Bộ mỗi nhân vật |
|---|---|---|
| Chính: Mia, Leo, Ama (P1, có) · Diane – quản lý ~50 · Carlos – người Mỹ gốc Latinh ~30, dịch vụ/đời sống (P1) | 5 | 12 biểu cảm · 10 cử chỉ toàn thân · 3 góc · 3 trang phục (công sở/đời thường/sự kiện) · tư thế ngồi · 9 khẩu hình (tách lớp) · chớp mắt |
| Vai phụ: người phỏng vấn, thu ngân, bác sĩ, nhân viên sân bay, lễ tân khách sạn, cảnh sát/an ninh, giáo viên, bạn cùng lớp, đồng nghiệp ×2, khách hàng (P2) | 11 | ảnh gốc + 4 biểu cảm + 2 cử chỉ |
| Đám đông/hậu cảnh: bóng người đơn sắc (P2) | 20 dáng | 1 màu, để làm nền đông người |
| Kit (linh vật) | – | **chỉ từ `web/js/kit.js`**, không tạo bằng AI |

### 2.2 Phòng trống / nền (không người, không đồ rời)
| Nhóm | Phòng (mỗi phòng: ngày + tối, 9:16 + 16:9) |
|---|---|
| Công sở (P1) | open office, phòng họp kính, văn phòng sếp, pantry, sảnh lễ tân, thang máy, phòng phỏng vấn, coworking, phòng thuyết trình |
| Học tập (P1) | lớp học, giảng đường, thư viện, phòng ký túc, phòng thi, hành lang trường |
| Đời sống (P1–P2) | căn hộ (phòng khách, bếp, phòng ngủ), quán cà phê, diner, siêu thị, phòng khám, ngân hàng, tiệm tóc, gym, công viên, phố (mặt tiền), ga tàu điện ngầm |
| Du lịch (P2) | quầy check-in sân bay, cửa an ninh, cổng lên máy bay, sảnh khách sạn, phòng khách sạn, nhà hàng sang, ga tàu |
| Thương hiệu (P1) | gradient cam–teal, bảng đen, nền quiz, nền "studio" trơn, nền video call (khung cửa sổ) |
| Mùa/lễ (P3) | Halloween, Thanksgiving, Giáng sinh, năm mới, mùa thi, mùa hè – dạng **lớp phủ đạo cụ** lên phòng có sẵn, không vẽ lại phòng |

### 2.3 Đạo cụ (sprite tách nền, chính diện, có `heightM`, `anchor`)
| Bộ | Món |
|---|---|
| Văn phòng (P1) | bàn làm việc, ghế xoay, kệ sách, tủ hồ sơ, bàn họp tròn/dài, bảng trắng, máy nước, máy in, vách ngăn |
| Công nghệ (P1) | laptop (mở/đóng), màn hình, điện thoại (cầm tay + để bàn), tai nghe, máy chiếu, TV/màn họp online |
| Nội thất nhà (P1) | sofa, bàn trà, giường, tủ bếp, tủ lạnh, bàn ăn, ghế ăn, thảm, rèm, kệ TV |
| Đèn (P1) | đèn cây, đèn bàn, đèn trần, đèn thả, đèn dây trang trí |
| Cây & trang trí (P1) | monstera, cây treo, xương rồng, tranh khung, đồng hồ, lịch, bảng ghim, gương |
| Đồ cầm tay (P1) | cốc cà phê, sách, vở, bút, ba lô, túi xách, vali, ô, hộ chiếu, thẻ lên máy bay, khay đồ ăn |
| Quán & cửa hàng (P2) | quầy pha chế, máy pha cà phê, bảng menu (trống chữ), kệ hàng, xe đẩy, quầy thu ngân |
| Trường học (P2) | bàn học sinh, bục giảng, bảng đen, tủ locker, quả địa cầu |
| Đường phố (P2) | cây, cột đèn, ghế công viên, trạm xe buýt, biển báo (không chữ), vạch qua đường, hydrant |
| Phương tiện, vẽ nhìn ngang (P2) | xe hơi sedan, SUV, taxi vàng, xe buýt, xe đạp, xe tay ga, máy bay (xa), tàu điện |
| Đồ ăn uống (P2) | burger, pizza, salad, bánh donut, ly nước, cà phê take-away |
| Mùa/lễ (P3) | bí ngô, cây thông, quà, pháo giấy, bóng bay |

### 2.4 Lớp hiệu ứng & giao diện (dựng bằng code – không dùng AI)
Bong bóng thoại, mũi tên, khung câu hỏi, dấu ✓/✗, thanh tiến độ, lower-third, khung "Don't say / Say", sticker cảm xúc (giọt mồ hôi, tim, dấu hỏi), ánh sáng ngày/tối (lớp màu), mưa/tuyết, zoom/pan camera → SVG + Remotion, theo màu thương hiệu.

## 3. Quy trình sản xuất (mỗi lô)
1. **Tạo** trên Kling: nhân vật dùng Element đã khóa (Lexkite Mia/Leo/Ama…); đạo cụ & phòng dùng prompt khuôn (mục 5). 2K, 2 ảnh/lần.
2. **Chấm trước** theo `MEDIA-QA-RUBRIC.md` – chấm **từng ô** (lưới biểu cảm/đạo cụ); ô < 90 bỏ, chỉ tạo lại phần thiếu.
3. **Tải bản gốc PNG** (đường dẫn kimg bỏ hậu tố `:WxH.webp`) → `brand/characters/_candidates/` (không commit).
4. **Xử lý tự động** (`scripts/video/vectorize.py`, chạy được trên máy và GitHub Actions):
   cắt ô theo lưới / theo vùng liền khối → xoá nền + viền trắng kiểu sticker (lấp màu từ mép, loại mảng gần trắng chạm nền) → **vtracer → SVG** → tối giản đường (giảm điểm, gộp màu về bảng màu chuẩn) → tính khung bao & `anchor` (giữa đáy) → xuất `svg` + `png@2x`.
5. **Chấm sau**: hiển thị lên phòng mẫu ở đúng thang đo; kiểm viền sáng, màu ngoài bảng, nét đứt, kích thước file (≤ 80 KB/sprite, ≤ 250 KB/phòng).
6. **Đăng ký** vào `content/video/assets.json` (id, kind, tags, heightM, anchor, variants, source, qa) → commit vào `brand/library/`.

## 4. Bộ ghép (composer)
- Đầu vào: `scene` JSON `{room, time:"day|night", props:[{id,x,depth}], cast:[{who,pose,expr,x,facing}], fx:[…]}`.
- Luật tự động: xếp lớp theo `depth` (tường → đồ sát tường → nhân vật → tiền cảnh bàn/quầy); chân nhân vật & đạo cụ trên đường sàn; không chồng lấn vùng mặt; chừa vùng phụ đề; ≤ 6 đạo cụ/khung để gọn mắt.
- **Bộ sinh biến thể**: với mỗi phòng có danh sách "khe đặt đồ" (slot) → script chọn ngẫu nhiên có trọng số theo tag (vd. `office` + `morning`) → mỗi video khác nhau nhưng hợp ngữ cảnh. Có `seed` để tái tạo y hệt.
- Dùng chung cho: Remotion (video), trang `#/videos` và "Call Mia" (nền cuộc gọi), thumbnail, ảnh blog/social, ảnh minh hoạ bài học trong app.

## 5. Prompt khuôn (Kling)
- **Đạo cụ**: `2D game sprite asset sheet of <set>, flat vector cartoon, clean soft dark-brown outlines, simple flat cel shading, warm muted palette with teal and orange accents. Strict straight-on front elevation view, no perspective. Each object on plain solid off-white background, generous empty space, neat grid. Objects: <list>. No text, no logos, no people.` (viền trắng nếu có sẽ bị xoá ở bước 4 – không tạo lại vì lý do này).
- **Phòng trống**: `Empty <room> interior, flat 2D vector cartoon, same outline and palette as above, straight-on front view, eye level 1.5 m, visible floor line in the lower third, back wall with windows, NO furniture in the middle area, no people, no text, soft daylight.` + biến thể `night, warm lamp light, dark blue windows`.
- **Biểu cảm**: Element nhân vật + lưới 2×2 đầu-vai, ẩn tay, nhắc phụ kiện nhận diện "in every panel", cấm ký hiệu/chữ (xem qa-log 2026-10-16).

## 6. Ngân sách credit (1 credit = 1 ảnh)
| Hạng mục | Ước tính |
|---|---|
| 5 nhân vật chính × (biểu cảm 6 + cử chỉ 10 + trang phục 6 + ngồi 4 + làm lại) | ~200 |
| 11 vai phụ × 8 | ~90 |
| Phòng trống ~40 × 2 giờ × 2 khổ × 1,5 lần thử | ~240 |
| Đạo cụ ~15 bảng × 2 × 1,5 | ~45 |
| Mùa/lễ (lớp phủ) | ~40 |
| Clip chuyển động Kling (đặc biệt: intro, thumbnail động) | ~200 |
| Dự phòng xu hướng | còn lại (~500) |

## 7. Cổng chất lượng (chặn nhập kho)
- Điểm rubric ≥ 90 (từng ô) · đúng thang đo ±5% · không viền sáng (alpha mép) · màu trong bảng (ΔE ≤ 8 sau gộp) · SVG hợp lệ, ≤ kích thước trần · có `source` + `qa` · không chữ/logo/thương hiệu bên thứ ba · nhân vật chỉ từ Element đã khóa.

## 8. Lưu trữ & sao lưu (kho dựng `brand/library/` – `scripts/video/library.mjs`)
**Một nguồn sự thật**: `content/video/library.json` (commit). File gốc ở `brand/library/` (nhị phân không commit – `.gitignore`), có **2 nguồn sao lưu** đồng bộ theo sha256:

| Nguồn | Nội dung | Địa chỉ |
|---|---|---|
| Chính – repo `lexkiteapp/lexkite-media` thư mục `library/` | mục **approved**: ảnh PNG → WebP ≤ 400 KB; clip = bản **stacked** `clips/<id>.mp4` (màu + mặt nạ, render đọc) + bản gốc lossless `src/clips/src/<id>.mp4`; `library/index.json` (chỉ mục công khai) + `library/manifest.json` (manifest dựng) | `https://media.lexkite.com/library/<file>` (Worker `workers/media`: MP4 có Range, cache 1 ngày) |
| Phụ – kho GrabCast workspace 4 (`storage_class: bulk`) | **bản gốc** đủ phân giải của MỌI mục (cả reserve/reject) | `locations.backup.objectId` trong manifest |

### 8.1 Tên chuẩn (sai tên = không nhập)
- `chars/<who>/{dna,neutral,expr-<tên>,gesture-<tên>}.png`
- Clip **gốc** Kling: `clips/src/<who>_<action>[_vN].mp4` (vd. `clips/src/leo_nod_laugh_v3.mp4`). Clip **dựng** (render.mjs đọc): `clips/<who>_<action>.mp4` = bản **stacked** (nửa trên màu, nửa dưới mặt nạ) do `library.mjs stack` tạo bằng `clip_to_layer.py --stacked` – KHÔNG bao giờ chép clip gốc vào `clips/` (lỗi 17/10: render coi nửa dưới clip gốc là alpha → nhân vật bóng ma, mất nửa người).
- `rooms/<room>-<day|night|dusk>-<9x16|16x9|3x4|1x1>.png` + hồ sơ sàn tự động `rooms/<room>.json` (§0; sửa tay xong đặt `"manual": true`)
- `props/<set>/<item>.{png,svg}` · `templates/` → `brand/social/templates`

### 8.2 Mục manifest
`id, kind, who, tags, file, sha256, bytes, w, h, duration, qa, waiver, source{from, tool, prompt, date}, roles[speaker|listener], status (approved|reserve|reject), check{status, issues, metrics, vision, sheet}, locations{primary{path,url,sha256,gitSha,bytes,srcSha}, backup{status,objectId}}`. Clip có thêm `variants.stacked{file, foot, figH, w, h, status, url}`. `brand/library/manifest.json` (render.mjs) được SINH từ library.json: chỉ clip approved có bản stacked đạt, phòng 9x16 có file + hồ sơ sàn, ảnh tĩnh có file. `refs` = số đo DNA từng nhân vật (tỉ lệ đầu/thân, nét viền, màu da/tóc/áo Lab, vùng mắt) dùng để so mọi ảnh/clip sau.

### 8.3 Lệnh
```
node scripts/video/library.mjs ingest <file> --as clips/mia_talk_point.mp4 --qa 92 [--role listener] [--reserve|--reject] [--waiver "lý do qa-log"]
node scripts/video/library.mjs ingest --plan scripts/video/library-seed.json --on-fail reject   # nhập theo lô (lô đầu 17/10)
node scripts/video/library.mjs check <file|id|all> [--no-vision]
node scripts/video/library.mjs sync [--dry-run] [--primary-only|--backup-only]
node scripts/video/library.mjs verify [--deep]        # HEAD CDN + sha trong repo + GET object GrabCast; báo thiếu sót
node scripts/video/library.mjs restore <id|all>       # gốc: nguồn chính nếu không nén, else GrabCast; chỉ còn bản web → _web/
node scripts/video/library.mjs report                 # phủ theo nhân vật/hành động/phòng + tổ hợp còn thiếu
node scripts/video/library.mjs stack [id|all] [--force]  # bản stacked cho clip approved (rembg isnet-anime) + đo foot/figH/w/h + ghi brand/library/manifest.json
node scripts/video/library.mjs render-manifest        # ghi lại + kiểm brand/library/manifest.json (file tồn tại, stacked đạt, phòng có hồ sơ sàn)
```
- `ingest` chặn: trùng sha256 (bản sao), id đã có mà nội dung khác (đặt `_v2`), qa < 90 không có `--reserve`/`--waiver`, và **check FAIL** (với `--on-fail reject` thì nhập dạng reject = cách ly, chỉ sao lưu, không bao giờ dùng để dựng).
- `sync` idempotent theo sha (bỏ qua mục đã có ở cả 2 nơi); 1 commit/lần đẩy qua GitHub git API (`gh auth token`, không in). Ước lượng dung lượng repo: cảnh báo ≥ 700 MB, dừng ở 950 MB → chuyển ORIGIN Worker sang R2.
- GrabCast trả `pool_full` (chưa nối Google Drive, R2 có sẵn 0 B) → `backup.status = pending`; chủ dự án: grabcast.click/scheduler.html → workspace Lexkite → Storage → **Connect Google Drive**, rồi `sync --backup-only`.
- Khoá: GitHub qua `gh auth token`, GrabCast `~/.config/lexkite/grabcast-key` (hoặc env `GRABCAST_API_KEY`), Gemini lấy từ D1 `config.gemini_keys` (wrangler + `~/.config/lexkite/cf-token`) hoặc env `GEMINI_KEYS` – chỉ giữ trong bộ nhớ, mọi log đều được che.
- Node cần `NODE_USE_ENV_PROXY=1` sau proxy – script tự bật khi thấy `HTTPS_PROXY`.

### 8.4 Cổng kiểm tra kỹ thuật (`scripts/video/asset_check.py`, chạy tự động khi ingest)
Cài 1 lần: `python3 -m venv .tools/pyenv && .tools/pyenv/bin/pip install numpy pillow mediapipe` + 3 mô hình `.task` (pose_landmarker_full, hand_landmarker, face_landmarker) từ `storage.googleapis.com/mediapipe-models/...` vào `.tools/mediapipe/`.
Kết quả ghi vào `check` của manifest: PASS/WARN/FAIL + số đo + lý do; bảng ghép mục WARN/FAIL ở `brand/library/_review/` (không commit).

| Loại | Kiểm | Mức |
|---|---|---|
| Ảnh | tỉ lệ khai báo (±2 %), cạnh ngắn ≥ 1500 (nhân vật) / 1080 (phòng), RGB/RGBA 8-bit sRGB, alpha thừa/rác | FAIL (alpha nhân vật WARN) |
| Nhân vật | nền mép trơn (MAD ≤ 6, P95 ≤ 22), cách mép ≥ 2 % (bỏ 0,3 % viền rác Kling) | FAIL |
| | chữ/watermark ở 4 góc (ngoài nhân vật chính), bảng màu gần màu thương hiệu | WARN |
| Phòng | sàn giữa nửa dưới trống (mật độ cạnh ≤ 0,075), hồ sơ sàn tự động (đường sàn, điểm tụ, scaleAt theo tầm mắt 1,5 m, 3 điểm đứng, hướng/ấm ánh sáng) | FAIL / WARN nếu độ tin < 0,3 |
| Clip | h264 yuv420p, cạnh ngắn ≥ 1080, 24/25/30 fps không VFR, 5 ± 0,2 s (đoạn cắt `trimmed` 0,8–5,2 s), khung đen, ≥ 6 khung trùng liên tiếp, khung đột biến (so t↔t+2 vì Kling hoạt hình "on twos"), nền đổi màu, chân trôi ≥ 1,5 % | FAIL |
| | có tiếng (> −45 dB; bản web bỏ tiếng), năng lượng chuyển động thấp → gợi ý vai listener, nghi trôi nhận dạng (tóc mọc thêm/áo đổi màu) | WARN/INFO |
| Clip stacked | chiều cao chẵn = 2 × khung màu, nửa dưới là mặt nạ (sắc độ < 8, ≥ 85 % điểm 0/255, phủ 2–90 %) – clip gốc khai nhầm stacked = FAIL; người cao ≥ 1000 px; mép alpha nhấp nháy (bật-tắt-bật > 0,4 %), bóng sàn dính (bề ngang đáy/mắt cá ≥ 1,6) | FAIL |
| Anatomy & style (ảnh + khung đầu/giữa/cuối) | MediaPipe Pose/Hands/Face: 1 người, 2 tay 2 chân, ≤ 2 bàn tay, góc khớp/tỉ lệ đoạn chi (WARN – MediaPipe trên tranh 2D chỉ "khá"; không nhận ra = WARN "cần duyệt tay"); tỉ lệ đầu/thân lệch DNA > 12 % = FAIL; màu da/tóc/áo lệch DNA ΔE > 10 WARN, > 25 FAIL; kính Leo/Diane (mật độ cạnh vùng mắt < 55 % DNA) = FAIL; nét viền ngoài biên dàn ± 45 % và kết cấu ảnh thật = WARN | |
| AI thị giác | Gemini 3.8 Flash nhận ảnh DNA + bảng ghép 1–6 khung → JSON `{hands_ok, limbs_ok, face_ok, extra_people, text_present, style_consistent, identity_consistent, issues}`; sai bất kỳ = FAIL (đây là chốt "identity drift"); hết khoá/hạn mức → WARN "cần duyệt tay" | FAIL |

Test: `node scripts/test/library.mjs` (trong `npm test`) – tên chuẩn, chống trùng, cổng QA, verify với fetch giả, báo cáo phủ, diễn giải AI + `scripts/test/asset_check_test.py` (hàm đo trên ảnh/clip tổng hợp; tự bỏ qua nếu máy không có numpy).

## 9. Quy chuẩn grade màu khi dựng (Remotion – `scripts/video/motion.mjs` GRADES, áp ở `remotion/src/Short.jsx`)
- **Một grade cho cả cảnh**: nền phòng + nhân vật + Kit nằm chung 1 lớp lọc (đường cong từng kênh `feComponentTransfer` + bão hòa) → hai lớp hòa tông, không lệch.
  - `day-warm` (phòng ban ngày): teal–orange nhẹ – shadow nâng xanh teal đậm, highlight kem ấm, bão hòa ×1,06.
  - `night` (phòng tối): xanh đêm ở shadow/trung tông, đèn vàng ở highlight, vignette sâu hơn.
  - `studio` (không có phòng): gradient thương hiệu cam → teal sâu (màu theo theme), đường cong gần trung tính.
- **Nhấn chủ thể**: DOF nhẹ cho nền (blur 2–4 px: studio 2, ngày 3, tối 4) · vignette mềm (0,32–0,5) · light wrap kem quanh mép nhân vật · rim light ấm (#FFB054 / #FFC94A tối) theo hướng sáng phòng · bóng tiếp xúc dưới chân.
- **Bloom** nhẹ từ highlight phòng (screen 0,12–0,22) · **grain** phim rất nhẹ (7%, tắt bằng `VIDEO_GRAIN=0`).
- **Chữ & sticker** chỉ dùng bảng màu brand; mỗi theme ≤ 3 màu nhấn; chữ trắng viền mực / mực trên vàng (≥ 4.5:1, kiểm trong `scripts/test/motion.mjs`).
- **QA tự động** (bước qa, cổng `grade`): mỗi cảnh lấy 1 khung – cháy sáng (Y ≥ 250) và bết tối (Y ≤ 5) mỗi loại < 1%; bão hòa trung bình 0,12–0,62; ΔE (a\*b\*) giữa tông da nhân vật và tông phòng ≤ 38 (lớn hơn = tách lớp, phải sửa ảnh phòng/clip hoặc grade).
- Tài nguyên mới vào kho phải qua thử trong 3 grade trên (dựng `node scripts/video/stress.mjs`) trước khi duyệt.

### 8.5 Xử lý nặng trên CI – `.github/workflows/library-build.yml` (anh chủ 17/10: máy chỉ upload + sửa code/manifest)
1. Máy: `ingest` (chép gốc, ghi manifest) → `sync --primary-only` đẩy **bản gốc clip nguyên vẹn** lên `lexkite-media/library/src/clips/src/<id>.mp4` (không xử lý) → commit `content/video/library.json`.
2. Actions → **library-build** → Run (ids: `missing` | `all` | `mia_idle,leo_talk_point`): `plan` liệt kê clip approved có gốc ở `library/src` mà chưa có stacked → `build` (matrix theo clip, ubuntu, Python 3.12 + rembg isnet-anime + MediaPipe, mô hình được cache) tải gốc (kiểm sha256) → `clip_to_layer.py --stacked` → `asset_check.py --kind stacked` (cùng cổng kỹ thuật/giải phẫu/phong cách như trên máy) → artifact `<id>.{mp4,json,jpg}`.
3. `publish`: gộp artifact `library-results` → `library.mjs ci-apply` ghi `variants.stacked` (foot/figH/w/h/status) + `brand/library/manifest.json`; có secret **`LEXKITE_MEDIA_TOKEN`** (PAT fine-grained, Contents: write trên `lexkiteapp/lexkite-media`) thì đẩy luôn bản stacked + `library/index.json` + `library/manifest.json` lên CDN; rồi mở PR manifest vào repo chính. Thiếu secret/PR bị chặn: phiên chính tải artifact `library-results` → `node scripts/video/library.mjs ci-apply <thư mục>` (chỉ upload).
- Nguồn chính của clip = bản **stacked** `https://media.lexkite.com/library/clips/<id>.mp4`; bản gốc lossless `https://media.lexkite.com/library/src/clips/src/<id>.mp4` (CI + `restore` dùng). Ảnh tĩnh vẫn là WebP ≤ 400 KB.
- AI thị giác (Gemini) không chạy trên CI (khóa ở D1, gói miễn phí chỉ 20 lượt/ngày dùng chung với app) → mục mới gắn `needsManualReview` cho tới khi chạy `check <id>` trên máy lúc còn hạn mức (kết luận AI được giữ lại theo sha).
