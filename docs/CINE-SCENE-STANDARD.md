# Khuôn chuẩn 1 cảnh footage điện ảnh (làm 1 lần, không làm lại)

> Bắt buộc: `docs/CREDIT-RULES.md` trước khi tiêu bất kỳ credit nào.

Rút ra từ quán cà phê (15 clip) và sân bay (pilot 66 + bộ 249 + bổ sung 54 = 369 credit, 3 lượt). Cảnh mới **chạy đúng 1 lượt theo file này**; ngân sách ≈ 16 ảnh + 15 clip ≈ **390 credit**, dự phòng 10 %.

## 1. Danh sách clip BẮT BUỘC (đủ cho mọi mẫu bài: sai→sửa, A/B, series, luyện nói)
Nhân vật: **A** = khách (Ama), **B** = người phục vụ của cảnh. Luật 180°: A trái nhìn phải, B phải.

| # | Clip (5 s, kling-video-v2_5 1080p) | Dùng cho |
|---|---|---|
| 1 | Toàn cảnh 2 người, cả hai nghe (miệng khép) | mở cảnh, nền chữ |
| 2–3 | Qua vai nhìn B nói ×2 (mặt chính diện, đầu quay ≤ 20°) | B nói (ghép khẩu hình) |
| 4–5 | Qua vai nhìn A nói ×2 | A nói |
| 6 | A cận mặt nói vào máy | bản đọc chậm, "Your turn" |
| 7 | A phản ứng "oops" → cười | sau câu sai |
| 8 | A gật đầu cảm ơn, cười ấm (thấy rõ miệng) | kết hội thoại |
| 9 | B phản ứng gật/cười | nền thẻ so sánh |
| 10 | **B cử chỉ chính** (đưa đồ / chỉ tay / gõ máy) | diễn xuất ≥ 90 |
| 11–12 | **2 cận cảnh đạo cụ** của tình huống (tay đưa – nhận, máy móc) | nhịp dựng, tiếng động |
| 13 | A đi vào (≥ 3 bước, từ trái) | mở đầu + bước chân |
| 14 | A chào rồi đi ra (hướng ghi rõ trong bank.json) | kết |
| 15 | Dự phòng làm lại 1 clip lỗi | |

## 2. Khuôn câu lệnh (Kling Image 3.0 khung đầu → Kling Video)
- Khung đầu: image_to_image với ảnh tham chiếu nhân vật + ảnh bối cảnh đã duyệt; ghi rõ **tỉ lệ cơ thể so với đồ vật**, góc máy, hướng nhìn, ánh sáng; "không người/tay/vật nào khác lọt vào khung", "không chữ, không logo".
- Clip: 1 hành động đơn, chậm, nhỏ; "giữ hướng đầu suốt clip"; tay **không chạm/xuyên** đồ vật trừ đúng 1 thao tác mô tả; đạo cụ giữ nguyên số lượng.
- Mỗi lần gửi 1 việc (song song bị quá tải).

## 3. Soát TRƯỚC khi chi 25 credit cho clip
Khung đầu: đúng tỉ lệ, đúng 180°, đủ đạo cụ & cùng mẫu với các khung khác, đúng số tay, không chữ/logo, mặt đủ to (≥ 160 px) để ghép khẩu hình. Sai 1 mục → tạo lại ảnh (1 credit), không tạo clip.

**Soát tư thế / logic (bắt buộc, cả khung đầu lẫn từng clip – lỗi nhà hàng 20/10: Ama ngồi trên mép bàn, giày gác lên ghế, mọi ảnh cắt từ master đều dính):** người ngồi thì mông trên mặt ghế, lưng tựa ghế, chân buông xuống sàn; KHÔNG ai ngồi/đứng trên bàn, quầy, ghế; không gác chân lên đồ; bàn ghế đúng tỉ lệ với người; không ai đi xuyên người/vật; đạo cụ đúng số lượng. Prompt phải viết thẳng: "X sits on a wooden chair at the table, her back against the chair back, both feet on the floor, hands resting on the tabletop" + "nobody sits on the table, no feet on chairs or furniture, no one walks through another person". Ảnh cắt/OTS sinh từ 1 master thừa hưởng lỗi của master → soát master trước. Khung đầu sai 2 lần liên tiếp → DỪNG, báo chủ, không thử tiếp. Ghi kết quả soát vào `qa_notes.json` (trường `logic`).

## 4. Sau khi có clip (0 credit, tự động)
`interp24.py` (bỏ giật "vẽ cách khung") → lấy bộ miệng + đường bám (gợi ý vùng miệng, tránh mắt chớp) → soi từng khung chỗ tay/đạo cụ, ghi **đoạn dùng được** vào `bank.json` → chấm MEDIA-QA-RUBRIC, < 90 thì dùng clip dự phòng.

## 5. Bài dựng: luật cứng (qa5 chặn)
Phụ đề đúng nguyên văn, ≤ 15 ký tự/giây, chuyển trang không nháy; chữ không đè mặt, trong vùng an toàn; người nói luôn thấy mặt hoặc ngoài hình; tiếng động chỉ khi thấy sự kiện; màn kết im; ≤ 40 s; liên tục đạo cụ giữa các shot; hook = thẻ ✗/✓ lỗi hay gặp trong 2 s đầu.

## 6. Giọng & khẩu hình
Kokoro trên nhánh `rhubarb-adhoc` (lines.json) → Rhubarb → `vis3/`. Mỗi cảnh viết **toàn bộ câu thoại cho 6–8 bài ngay từ đầu** (1 lượt TTS).

## 7. 5 mẫu bài mới (templates) – cách dùng trong builder
Spec + ví dụ: `content/video/cine/templates.md`. Builder chuẩn: **`scripts/cine/`** trong repo công khai (`lesson5.py` + `tpl_styles.py` + `qa5.py` + `lipsync.py` + `foley.py` + `mkgap.py` + `interp24.py`; gộp từ hotel/anchor 20/10 – bản sao trong `brand/library/cine/<cảnh>/tools/` chỉ còn là lịch sử); 5 bài mẫu `lessons/hotel_tpl_{choose,gap,ladder,mistake,pov}.py`, locale `content/video/cine/locales/hotel_tpl_<tên>.<lang>.json`. Bài cũ không đổi (mặc định `HOOK_KIND='contrast'`).
- **Biến trong file bài:** `HOOK_KIND` (contrast | question | pov – qa5 đòi thẻ hook ≤ 2 s), `QA = dict(template=…)` (luật riêng từng mẫu trong qa5), `CAPSTYLE = {shot_id: (style, sub)}` (phụ đề dạng Gap/Strike, `('Karaoke', i)` = tô vàng từ thứ i, `(None, None)` = tắt phụ đề khi nghe), `ALLSHOTS_OV` (thẻ trên mọi shot, vd. Pov), vị trí `CHOICE_Y / LADDER_Y / HOOK_Y / POV_Y / BADGE_Y` theo mặt của bank.
- **Overlay:** tuple trong `ov` có thêm phần tử thứ 5 = `sub` (trạng thái); cùng style + nội dung trên các shot liền nhau tự nối thành 1 thẻ (không chớp), đổi `sub` = đổi trạng thái ngay khung đó.
- **Fill the gap:** `mkgap.py <src> <new> <từ> <t0> <t1>` → wav có 0,6 s im + cue X (cắt từ đầu cue Rhubarb tới khoảng lặng sau từ), thêm dòng `derived` vào `ci/lines.json`.
- **Bài học khách sạn:** mặt Ama MCU xuống tới y 1061 → Ladder y 1066 (3 câu đều trên CU); mặt Daniel OTS lên tới y 297 → chip POV y 232; Hook trên toàn cảnh đặt y 900 (mặt người ở 324–873).
- **Chỉ tiếng Anh (quyết định chủ 20/10 – mặc định cho bài mới):** `lesson5.py en <bài>` hoặc locale có `"english_only": true` → không dòng bản ngữ ở Sub/Hook/Ring/Recap/Gap/Strike (Sub 1 dòng chữ to 58), nhãn tiếng Anh ngắn, CTA tiếng Anh; `lines` trong locale có thể bỏ trống. Ra `out/cine-<bài>-en.mp4`. Song ngữ (`vi` …) vẫn chạy như cũ.
- **Chế độ viral (20/10, 0 credit Kling – mặc định BẬT khi chỉ tiếng Anh, bài bật bằng `VIRAL_HOOK` trong nhánh `if VIRAL:`; `VIRAL=0` tắt; bài cũ không có `VIRAL_HOOK` → ra y như cũ):** `vhook('câu *từ vàng*|icon')` thẻ hook 0–1,2 s trên toàn cảnh (≥ 84 px, icon vẽ `grimace`/`?`/`Zz`, không emoji font) → phụ đề `Cap` 1 dòng 72 px, trang 2–4 từ, từ đang nói vàng, `KEYWORDS` xanh (vẫn nguyên văn, ≤ 15 cps) → Gap/Strike 66 px → `PUNCH[shot]=t` (1,0→1,08 trong 0,4 s) → SFX `foley/pop.wav` (−22 dBFS, thẻ hiện/đổi trạng thái) + `whoosh.wav` (−26 dBFS, cắt vào/ra cảnh không thoại) → vòng 3 s "Comment … 👇" (mũi tên vẽ) TRƯỚC khi lộ đáp án, chèn phản ứng (oops/react/thanks) → `vloop(recap)`: không end card, cảnh rộng tua ngược về khung 0 (loop), chip "Follow for daily English / lexkite.com" 0,6 s cuối → chip `SERIES` (hook + loop) + ảnh bìa `out/covers/<tên>.jpg`. Ra `out/cine-<bài>-en-v2.mp4` (`OUTSUF`). qa5 thêm mục VIRAL RULES: hook ≤ 1,2 s & ≥ 84 px, Cap ≥ 70 px 1 dòng, shot giữ ≤ 2,5 s (shot thoại ≤ câu + 0,45 s), không end card, Follow = 0,6 s cuối, SSIM khung đầu/cuối > 0,6, vòng 3 s trước đáp án, thẻ không chồng nhau, mặt kiểm theo từng shot thẻ đi qua (có tính punch-in). Bài học: mặt MCU khi punch xuống y 1069 → Ladder y 1072, Hook "One possible answer" y 1080; chip series ở góc phải trùng mặt Daniel OTS khi punch → chỉ đặt trên hook + loop.
- **Nhịp độ chuẩn v3 (chủ góp ý 20/10: "nhịp chưa hợp, đoạn cuối nhanh") – qa5 bắt buộc ở chế độ viral:** mọi thẻ chữ giữ ≥ max(1,2 s; 0,4 + 0,28 s × số từ), recap ≥ 2,5 s. Khung bài 18–24 s: Hook 1,6–2,0 s (≤ 5–7 từ, `vhook` tự tính; đặt trong `VHOOK_BOX` = mảng tường trống, KHÔNG đè người – `AVOID` thân Ama ở master) → Setup (thẻ câu hỏi/đáp án lên ≥ 1,5 s TRƯỚC tiếng) → Thử thách (nghe + vòng "Comment … 👇" 3 s, icon bong bóng thoại) → Lộ đáp án ≥ 1,8 s trên shot phản ứng → Củng cố (câu mẫu thường + 1 lần 0,85× karaoke, `tempo=0.85`) → `vend(recap)`: recap 2,5 s + lắng 0,3 s rồi loop 1,0 s có chip Follow 1,0 s, âm tắt dần 0,4 s. Thở 0,35–0,5 s sau mỗi câu trước khi cắt (tail 0,42), cắt chỉ ở ranh giới câu; pop chỉ khi thẻ XUẤT HIỆN, cách nhau ≥ 2 s; mốc từng từ phụ đề bám ranh giới cue Rhubarb (±0,15 s). qa5 in "VIRAL TIMELINE" (beat + giờ) để soát nhịp. Ra `OUTSUF=-v3`. Máy nóng: ffmpeg/x264 `-threads 2`, OpenCV 2 luồng, dựng từng clip một (sandbox không cho `nice`).
- **Mẫu T6 "anchor-explainer" (20/10):** kho người dẫn `brand/library/cine/anchor/` (Ama trái, Carlos phải, bàn studio, 14 clip: mỗi người MCU nói ×3 / nghe-gật / phản ứng; 2 người: A nói, B nói, cùng cười; toàn cảnh) + B-roll `bank:clip` từ 4 kho cảnh. Builder = bản sao hotel trong `anchor/tools` (+ `CDIR()` đọc dl24/meta kho khác, style `Card` ✗/✓/nhãn, `AMB` theo chủ đề, qa5 `template='anchor'`: 20–35 s, không lặp clip liền nhau, có cả người dẫn lẫn B-roll, đổi góc ≤ 5 s). MCU = cắt + phóng master 2 người (0 credit, giữ đúng trang phục/bối cảnh). Clip phản ứng cười (a05/c05/t03) KHÔNG ghép miệng (chạy nguyên bản). Mặt Carlos có ria: khung mặt bank.py phải bắt đầu DƯỚI mắt (y ≥ 645 ở MCU) nếu không bộ miệng ăn cả mắt chớp.

## 8. Dựng trên CI (từ 21/10 – Mac không render nữa)
- Workflow `cine-render` (`.github/workflows/cine-render.yml`, workflow_dispatch): `scene`, `lessons` (`a,b:vi` – `:lang` ghi đè; `all` = mọi `lessons/*.py` không bắt đầu bằng `_`, bài thiếu locale bị bỏ qua), `lang` (mặc định en), `viral` (bật = luật mặc định lesson5; tắt = ép `VIRAL=0`), `outsuf` (`-v3`). Artifact `cine-<scene>-<run>`: `out/*.mp4`, `out/covers/*.jpg`, `out/qa/` (build/qa log + timeline), 14 ngày. qa5 có FAIL → job đỏ (qa5 trả mã 1).
- Footage: clone sparse `<scene>` + `hotel/tools/{end,foley}` (anchor: thêm 4 kho cảnh) từ repo riêng `lexkite-footage` bằng deploy key chỉ-đọc (secret `FOOTAGE_DEPLOY_KEY`). **Thêm/sửa cảnh, bài, giọng → chạy `bash scripts/footage-backup.sh` trước khi dựng CI.** Code bài (`lessons/*.py`) vẫn nằm trong footage; locale ở `content/video/cine/locales/`.
- `scripts/cine/prep_scene.sh <footage> <scene>` nối các thư mục còn thiếu vào `<scene>/tools` (meta, dl24, vis3←visemes, ci/lines.json←lines.json, end/foley dùng chung của hotel). Mỗi cảnh cần `tools/amb_<cảnh>.wav` (cafe: `amb_cafe.wav` = v1+v5 trộn sẵn 60 s) hoặc bài tự đặt `AMB`; `AMB_DB` mặc định −17.
- Biến môi trường (chạy tay cũng được): `CINE_SCENE_DIR` (thư mục cảnh, mặc định cwd), `CINE_LIB` (gốc footage cho `bank:clip`), `CINE_ROOT` (repo), `CINE_OUT` (mặc định `out/`), `CINE_THREADS` (Mac 2, CI 0 = mọi nhân). Phông OFL: Be Vietnam Pro + Bricolage từ `brand/social/src/fonts`, Noto Sans Arabic trong `scripts/cine/fonts`.
- qa5: bài cũ không khai `HOOK_KIND` (vd. cafe latte, làm trước luật hook 2 s) chỉ báo WARN ở luật hook, không tính FAIL; bài mới phải khai `HOOK_KIND`.
