# Video v3 – engine chung (nâng cấp Teach2D)

> TL;DR: v3 không phải dây chuyền mới. Mọi khuôn (slang, l1, band, guess3, levels3, scorecard…) đi qua cùng `gen.py → build.py → rig_host → qc.py → TeachShort.jsx` (CI `teach-video.yml`, xem `VIDEO-TEACH2D.md`); v3 thêm thành phần chung + cổng số cho 10 lỗi trong `research/video-audit-2411.md`.
> Đọc khi: thêm/sửa khuôn video, đổi `build.py` / `qc.py` / `rig_plan.mjs`, chấm mẫu.

## Schema kịch bản (một episode JSON, `content/video/teach2d/eps/*.json`, do `gen.py` sinh)
`template`, `teacher`, `voice`, `hook {line,text}` (≤ 6 từ, nói xong ≤ 2,2 s), `lines[]` = 3–5 nhịp dạy + ví dụ (`id`, `text`, `pause`) + dòng `c` cuối (CTA, "… lexkite.com"), `cta {area,route,link}`, `data` (nội dung khuôn), tuỳ chọn `exprs`/`expr`/`pose`/`native` (L1). Tổng ≤ 150 từ/phút (cổng `pace`).

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
Giữ nguyên: `contrast` ≥ 4,5:1, `layout` (không đè), `hook`, `min_text`, `platform_zones`…

## Quy trình chấm mẫu bằng agent
Video đầu tiên của mỗi khuôn × ngôn ngữ, sau đó 1/20: lấy 8 khung (5 %…97 %) ghép 1 ảnh → agent Sonnet chấm theo `MEDIA-QA-RUBRIC` thang C và đối chiếu 10 lỗi của bản kiểm; điểm < 90 hoặc lặp lại lỗi → dừng lô, sửa ở engine (không vá từng video). Kết quả ghi `research/video-audit-2411.md` mục "Sau v3".

Test: `scripts/test/teach2d-rig.mjs` (mục v3), `scripts/test/dead-band.py`.
