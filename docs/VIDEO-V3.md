# Video v3 – engine chung (nâng cấp Teach2D)

> TL;DR: v3 không phải dây chuyền mới. Mọi khuôn (slang, l1, band, guess3, levels3, scorecard…) đi qua cùng `gen.py → build.py → rig_host → qc.py → TeachShort.jsx` (CI `teach-video.yml`, xem `VIDEO-TEACH2D.md`); v3 thêm thành phần chung + cổng số cho 10 lỗi trong `research/video-audit-2411.md`.
> Đọc khi: thêm/sửa khuôn video, đổi `build.py` / `qc.py` / `rig_plan.mjs`, chấm mẫu.

## Khuôn (spec duy nhất)
Mọi khuôn là một hàm `T_<khuôn>` trong `build.py` dùng chung `Card` / `title` / `end_card` / cổng qc; KHÔNG có dây chuyền riêng. Khuôn + pilot + điểm: slang (t2s_ace), l1 (t2_l1_vi_a_little; ar/ja: t2_l1_ar_afraidfrom, t2_l1_ja_agree), scorecard (t2sc_001) đã đạt viral/ypp 100 short+wide; guess3, levels3, call, dictation, grammar, guess, level, mistake, native, pair, pattern, phrasal, prep, react, review, stress, toeic, usuk, verbs, band, roots, rule: pilot trong batch CI `v3-all-templates` (kết quả ghi bên dưới khi xong). news/cine/motion-drill là engine khác (docs/VIDEO.md): dùng cùng `viral_score`/`ypp` khi cắm vào, chưa gộp trong đợt này.

## Lấy mẫu chấm mắt (CI)
Video ĐẦU TIÊN của mỗi cặp khuôn × ngôn ngữ trang, sau đó cứ 20 video của cặp đó thì chấm 1 (`autopub_gate.review_due`). Agent Sonnet đọc ảnh ghép 8 khung (artifact `tv-review`, rubric MEDIA-QA-RUBRIC thang C) và ghi `content/video/teach2d/review-log.json` `{ep: {score, by, at}}`; thiếu bản ghi hoặc <90 → lý do `review:first|every20`, video không đăng (store.py). Mọi video còn lại đã bị cổng số chặn <90 (qc) / <95 (viral_score) / ypp.

## Schema kịch bản (một episode JSON, `content/video/teach2d/eps/*.json`, do `gen.py` sinh)
`template`, `teacher`, `voice`, `hook {line,text}` (≤ 6 từ, nói xong ≤ 2,2 s), `lines[]` = 3–5 nhịp dạy + ví dụ (`id`, `text`, `pause`) + dòng `c` cuối (CTA, "… lexkite.com"), `cta {area,route,link}`, `data` (nội dung khuôn), tuỳ chọn `exprs`/`expr`/`pose`/`native` (L1). Tổng ≤ 150 từ/phút (cổng `pace`).

Schema máy kiểm: `scripts/video/teach2d/script_schema.py` (test `teach2d-script-schema.py` chạy trên cả 3764 tập; 15 ngôn ngữ trang en/ar/de/es/fr/hi/id/ja/ko/pt/ru/th/tr/vi/zh, bản địa hoá qua `content/video/teach2d/l1/<lang>.json` + native-qa). 3–5 "nhịp" = thẻ trên màn; số câu dạy giữa hook và CTA là 3–8 tuỳ khuôn. Nợ đã biết: 42 hàng l1 có hook nói >6 từ (`schema-known.json`) – không qua được cổng hook nên không lên bank; sửa hàng nguồn rồi xoá khỏi danh sách.

## Thành phần v3
- **Beat → look** (`rig_plan.mjs` `schedule`): mỗi nhịp một nét mặt/tư thế khác nhịp trước (`BEAT_EMO` xoay vòng, không lặp liền kề) + gật/lắc đầu nhấn ở giữa câu (`nod`/`bob`, thủ tục cổ nên không che miệng); ảnh tư thế (tay) vẫn chỉ trong im lặng ≥ 1,2 s.
- **Phụ đề đốt vào hình cả bản wide** (`build.py` FMT wide `cap=[96,924,1056,1024]`, dải dưới vùng thẻ, bên trái giáo viên) – trước v3 wide chỉ có VTT.
- **Màn kết duy nhất** (`build.py` `end_card`, mọi khuôn, mọi khổ): icon + Lexkite + 100% FREE, nút "Practice …" (`CTA_LABEL` theo `cta.area`), QR, lexkite.com; hiện ≥ 2 s (`TOTAL ≥ dòng c + 2,9 s`).
- **Nền trống**: hook reel là thẻ poster lớn, chữ thẻ +25 % (reel dọc); cổng `layout_fill` đo hình học từ timeline (thẻ/tiêu đề/giáo viên/phụ đề phủ ≥ 50 % safe-box, ≤ 10 % khoảnh khắc vượt). `dead_band.py` có thêm `empty_ratio` theo điểm ảnh nhưng KHÔNG bật (thẻ tông gần nền bị tính là trống).
- Motion v2 (caption pop, word bump, drift) – đã có từ `video/template-v2`.

## Cổng số mới (`qc.py`, điểm ≥ 90 và mọi cổng xanh)
| Cổng | Kiểm |
|---|---|
| `pose_variety` | số (nét mặt, tư thế) khác nhau ≥ min(số nhịp, 8) và look đổi ở mọi đầu nhịp (đọc `rig.frames.json`) |
| `end_card` | đủ icon, nút "Practice…", QR, lexkite.com; mỗi thành phần ≥ 2 s trước hết video |
| `caption_full` | có dải phụ đề trong safe-box mọi khổ; mọi từ của mọi câu nằm trong trang phụ đề (không cắt lửng) |
| `caption_sync` | chạy cả wide (trước chỉ short) |
| `layout_fill` | ≤ 50 % safe-box trống ở mọi khoảnh khắc 0,25 s (cho phép ≤ 10 % khoảnh khắc: chuyển cảnh) |
| `dead_band` | dải phẳng ≥ 8 % chiều cao (giữ nguyên) |
| `viral_score` ≥ 95 | 7 tiêu chí in riêng trong QC (trọng số): hook 20 (nói xong ≤ 1,5 s, ≤ 6 từ, pop khung 0), giữ người xem 20 (nhịp hình ≤ 5 s, có câu hỏi mở + phần thưởng), giá trị học 15 (từ khoá nói + hiện + ví dụ + hành động), giọng 10 (≤ 150 wpm), biến hoá 15 (looks ≥ beats, ≥ 4 loại phần tử, ≥ 3 thẻ), tiêu đề/thumbnail 10, CTA 10 |
| `ypp` | không gần trùng kịch bản (Jaccard 3-từ < 0,55 cùng ngôn ngữ, gồm cả dữ kiện hiện hình); có giá trị giáo dục riêng; cờ tổng hợp/AI = true và made-for-kids = false (content/video/teach2d/ypp.json – upload phải gửi); nhạc/giọng/giáo viên ∈ registry (nhạc tự tổng hợp, Kokoro, rig 2D), không footage ngoài |
| `native_script` | chữ Ả Rập rtl và không lẫn Latin; CJK ≥ 44 px (phông Noto fallback có sẵn) |
Dưới 95 / có lý do ypp: không đăng, không vào bank (bank.py + autopub_gate đã chặn mọi cổng đỏ).
Giữ nguyên: `contrast` ≥ 4,5:1, `layout` (không đè), `hook`, `min_text`, `platform_zones`…

## Quy trình chấm mẫu bằng agent
Video đầu tiên của mỗi khuôn × ngôn ngữ, sau đó 1/20: lấy 8 khung (5 %…97 %) ghép 1 ảnh → agent Sonnet chấm theo `MEDIA-QA-RUBRIC` thang C và đối chiếu 10 lỗi của bản kiểm; điểm < 90 hoặc lặp lại lỗi → dừng lô, sửa ở engine (không vá từng video). Kết quả ghi `research/video-audit-2411.md` mục "Sau v3".

Test: `scripts/test/teach2d-rig.mjs` (mục v3), `scripts/test/dead-band.py`.
