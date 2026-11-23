# Spec — Khu B: MỘT kiểu chọn + MỘT kiểu CTA (rà soát 23/11)

> TL;DR: Mọi màn dùng đúng một trạng thái chọn (`.on` = viền teal + nền accent-soft + dấu ✓) và đúng một CTA chính/màn (`.btn.primary` = lớp CTA Stitch sẵn có: `--cta-grad` đỏ→vàng + bóng đáy `--cta-shadow`, ở `web/css/tactile.css`; KHÔNG đặt màu CTA mới). Hover chỉ đổi nền; focus-visible là vòng riêng. Có test chặn lặp lại.
> Đọc khi: sửa chip/tab/thẻ chọn hoặc nút chính ở bất kỳ màn nào.

## Vấn đề (nguồn: audit-2311 README + cluster-0/2/5)
1. Ba kiểu chọn chồng nhau (nền đục, viền cam/đỏ, gradient) + viền cam/đỏ lạ lúc hover/focus: tracks, criteria, models, mock (thẻ kỹ năng + checkbox native), call/confidence (thẻ viền đỏ không rõ nghĩa), listen/listening (lưới "Test N": ở tối gần như không thấy ô chọn), fix (ô dán viền đỏ khi trống).
2. Không có CTA chính rõ ràng / nhiều CTA cam ngang hàng: deck (6 nút), toeic/toeic_r (10 nút "Thi thử Test N" + 2 CTA cam), toeic_sw (5+ nút cam), listening (3 nút/Part), mock/toeic_test (CTA dưới nếp gập), qstats/tests/toefl (không CTA chính).
3. Ba màu CTA: vàng-cam (Hôm nay), đỏ gạch (Ngày 1/Khóa học), gradient cam (Xong/OK/Học thông minh).

## Quyết định (khuôn duy nhất)
**Chọn** — tài liệu tham chiếu: bảng kỳ thi #1926 (`web/css/tl-pick.css` `.tlp-row.on`).
- `.on`, `[aria-pressed="true"]`, `[aria-selected="true"]` (chip, tab, thẻ, ô lưới) → `border-color: var(--done)`, `background: var(--accent-soft)`, dấu ✓ tròn (trong ô hoặc `::after`), viền 2 px nên thấy được ở tối.
- `:hover` (chỉ `@media (hover:hover)`) → chỉ `background: var(--surface-2)`, KHÔNG đổi viền/màu viền.
- `:focus-visible` → `outline: 3px solid var(--accent); outline-offset: 2px` (vòng riêng, không lẫn trạng thái chọn).
- Bỏ: nền nâu đục, viền cam/đỏ, checkbox native trong thẻ (dùng ✓ tròn Stitch), chip "Tất cả" gradient.
**CTA**
- Đúng 1 `.btn.primary` mỗi màn/khối = lớp CTA Stitch sẵn có (tactile.css: `--cta-grad`, `--cta-ink`, `--cta-shadow`, ấn xuống `--press`); các CTA tự chế (cam/vàng/đỏ gạch/gradient riêng) đổi về lớp này; full-width trên 390; ghim đáy trên tab bar khi form dài (mock, toeic_test).
- Phụ = `.btn` viền; còn lại gom `⋯`/link văn bản (deck: Học = chính; Kiểm tra/Chia sẻ/Xuất/Nhập/Anki vào menu). Chọn đề (Test 1..10, Part) = bộ chọn dùng khuôn "Chọn" ở trên, không phải 10 nút.
- Nút trong banner gradient tối: bề mặt tối + viền sáng (không nền trắng chói).

## Cách làm (không thêm CSS file/JS framework; ngân sách tải đầu giữ)
- Khối CSS dùng chung ~1 KB ở `web/css/style.css` (token + `.on/hover/focus-visible` + `.btn.primary`), các màn bỏ luật riêng chồng (xóa luật cũ, không chồng thêm).
- Test chặn lặp lại `scripts/test/select-cta-guard.mjs` (vào suite.txt): (a) không luật `:hover/:focus` nào đổi `border-color` trên `.chip/.tab/.pill/.on`; (b) không `linear-gradient`/màu CTA riêng ngoài `--cta-grad` trên nút ngoài `.btn.primary`/`.tk-btn`; (c) mọi `.on` có viền ≥2 px; (d) ≤1 `.btn.primary` trong DOM mẫu của từng màn (render jsdom). Phối hợp với phiên ui-audit-all (check CI của họ) để không trùng file.
## Đợt (1 PR/đợt, P0→P1, ảnh CI 390/768 sáng/tối, ngưỡng stitch-diff giữ nguyên)
1. Nền: khối CSS + test + listen/listening (lưới Test N → bộ chọn cuộn ngang), criteria, tracks, models.
2. CTA: deck, toeic/toeic_r/toeic_sw/toeic_test, mock, cambridge, tests/qstats/toefl.
3. call/confidence/fix/handsfree/grammar + home (một màu CTA) + sheets.
Không đụng: `web/cpack/tl-app/tl-pick.js` (#1926); luồng bài học (#596/ex-frame).
## Chấp nhận
Mỗi màn trong 3 cluster: 1 kiểu chọn, ≤1 CTA chính, hover không đổi viền, ảnh tối thấy ô chọn; test mới xanh; ngưỡng ssim/axe không hạ; i18n không thêm chuỗi mới (hoặc 15 ngôn ngữ nếu có).
