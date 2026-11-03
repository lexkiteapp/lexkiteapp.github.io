# Home upgrade – spec-lite (3/11)

> TL;DR: Home hiện chỉ có 1 lộ trình + 1 CTA; nâng lên chuẩn app lớn qua 5 lát tuần tự: L1 cô giáo mắt mở + vòng nghỉ 1–3 s ≤ 150 KB, L2 Home dùng vòng nghỉ (sau #314), L3 đưa Home v2 #284 vào main, L4 lưới 9 màn học + thử thách, L5 lộ trình nhiều chặng (sau #315).

Chủ 3/11: Home (`#/home`) "quá ít stage, quá ít option học; ảnh cô giáo đứng nhắm mắt lỗi; cần cô động 1–3 s nhẹ, thân thiện". Tài sản giáo viên tải qua [teach-assets-cdn.md](teach-assets-cdn.md) như mọi clip.
Một nguồn: thiết kế Home v2 = docs/HOME-V2.md (PR #284, Stitch đã OK 31/10); lộ trình = docs/specs/play-and-speak-path.md (PR #315);
chỗ giáo viên = [CHARACTERS.md](../CHARACTERS.md) (#314 `Chars.slot`). Spec này chỉ nối các mảnh và thêm phần còn thiếu – không làm lại.

## So với app lớn (Home/lộ trình)
| | Chặng | Loại màn trên Home | Lựa chọn mỗi ngày |
|---|---|---|---|
| Duolingo | Section → Unit → 5–8 bài + rương/ôn/huyền thoại | bài, ôn lỗi, nghe, nói, truyện, video call (Max) | 1 nút "Start" + nhiệm vụ ngày, chuỗi, giải đấu |
| Babbel | Course → Lesson + Review | bài, ôn (SRS), podcast, game, live | "Next lesson" + "Review N items" |
| Busuu | Level → Chapter → Lesson + checkpoint | bài, ôn từ, sửa bài cộng đồng, ngữ pháp | kế hoạch học theo mục tiêu/ngày |
| Speak | Course → Lesson + Live tutor | nói, gọi AI | lesson ngày + free talk |
| ELSA | Skill map → bài phát âm | phát âm, nghe, hội thoại | daily test + bài gợi ý |
| **Lexkite (main)** | đơn vị → nút bài (1 chuỗi) | **chỉ lộ trình**; chip/thi nằm trong modal Guide; 18 route học (listen, speak, call, grammar, read, quick, reflex, mock, games, pron, roleplay…) **không có lối vào trên Home** | 1 CTA "Bắt đầu bài học" |

## Đề xuất (đã có dữ liệu thật – khối không có dữ liệu thì ẩn, không bịa)
1. **Lộ trình nhiều chặng** (PathV3 #315): phần → đơn vị → bài → ôn chặng + mốc thưởng (rương XP/huy hiệu) ở cuối đơn vị; nhảy cóc ≥ 80 %.
2. **"Hôm nay chọn bài"** (Home v2 #284): thẻ chính theo `next-step.js` + nhắc ôn khi `dueList` > 0 + 2–3 lựa chọn thay thế (5 phút ôn nhanh / gọi Ama / truyện).
3. **Lưới màn học** (mới, lát 3): 9 ô có sẵn: Từ vựng, Nghe, Nói & gọi giáo viên, Ngữ pháp, Đọc, Truyện, Ôn nhanh (`quick`/`reflex`), Thi thử (`mock`/TOEIC), Game (`practice`) – ô hiện số đến hạn/tiến độ thật.
4. **Thử thách ngày/tuần + chuỗi** (retention.js, league.js): 3 nhiệm vụ nhỏ, đóng băng chuỗi, không đếm ngược gây áp lực, không phạt (theo notifications-ux).
5. **Cô giáo sống**: vòng nghỉ 1–3 s mắt mở (`Chars.idle`), poster mắt mở cho reduced-motion/lite.

## Lát (mỗi lát 1 PR nhỏ, tuần tự, không chồng file PR khác)
| # | Nội dung | File | Phụ thuộc |
|---|---|---|---|
| L1 | Sửa gốc "nhắm mắt": `build.py` chọn khung mắt mở (`scripts/teach/eyes.py`) + QC; vòng nghỉ `idle.{webm,mp4}` + `idle-poster.webp` (`scripts/teach/idle.py`); `Chars.idle`; cổng | scripts/teach/*, web/teach/*, characters.js, characters-gate, characters-shots.yml, teach-build.yml | – |
| L2 | Home dùng vòng nghỉ: `Chars.slot(…, {idle:true})` – `<video>` VP9α (Chrome/Firefox/Android) / clip WebGL xếp chồng (Safari), lazy khi vào màn, dừng khi ra, reduced-motion/lite → poster | teacher-slot.js, ux1.js | sau #314 |
| L3 | Home v2 vào main: gỡ vượt size-budget bằng lazy-load (không cắt) rồi gộp | #284 | nhận lại từ trưởng gộp |
| L4 | Lưới màn học + thử thách ngày/tuần (Stitch Lexkite Kit → port HTML, cổng SSIM), 15 ngôn ngữ | st/v2/*, i18n | sau L3 |
| L5 | Lộ trình nhiều chặng + mốc thưởng gắn PathV3 | path3.js, ux1.js | sau #315 + L3 |

## Tiêu chí xong
- Không ảnh tĩnh/poster giáo viên nào nhắm mắt (cổng `idle.py --check` + QC trong `build.py`).
- Vòng nghỉ: 1–3 s, mỗi tệp ≤ 150 KB, cùng khung 554×480 với ảnh tĩnh (cùng đường mắt/tỉ lệ), không viền đen/xén, vòng nối không giật.
- Home: ≥ 9 lối vào màn học, thẻ "hôm nay" theo tiến độ + dueList, thử thách ngày/tuần; nút Back/Thoát mọi màn học (exit-guard).
- Shell ≤ 374 KB (size-budget), Lighthouse mobile không tụt, CLS ≤ 0,1; clip tải lười, không chặn render đầu.
- 15 ngôn ngữ (I18N-PIPELINE + i18n-qa --strict); thiết kế Stitch (stitch-diff SSIM); test hồi quy mỗi lát.

## Cổng CI
`characters-gate.mjs` (npm test: tệp + sha + `Chars.idle`) · `characters-shots.yml` trên PR chạm nhân vật (`idle.py --check`: định dạng VP9α/H.264, khung, 1–3 s, ≤ 150 KB, sha, mắt mở) · `teach-build.yml` dựng lại idle sau build · `size-budget` · `stitch-diff` · `i18n-qa` · `exit-guard` · `ux1`/`learn-flow`.
