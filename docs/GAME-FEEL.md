# GAME FEEL – âm thanh, chuyển động, nhân vật phản ứng (PILOT sau cờ)

> TL;DR: Lớp làm app "đã tay" như game, không đụng layout Stitch v2. BẬT mặc định từ 3/11 (docs/specs/play-learn.md); tắt bằng Cài đặt hoặc `?feel=0`. Gói âm chuẩn −16 LUFS (gate `sfx-loudness.mjs`).
> Đọc khi: sửa âm thanh/rung/hiệu ứng phản hồi, hoặc gắn nhân vật phản ứng.

## 1. Hiện trạng (29/10)
| Phần | Ở đâu | Ghi chú |
|---|---|---|
| Âm | `web/js/game.js` `tone()` + `Sfx.*` | Bíp Web Audio (sine/triangle), tắt theo `settings.sfx` / `Core.sfxOff`. tap/streak/combo/shimmer thêm lười ở `streak-ui.js` qua `Sfx.extend` |
| Rung | `buzz()` trong game.js; `web/js/native.js` thay `navigator.vibrate` bằng Capacitor Haptics | Chỉ máy cảm ứng, tắt cùng âm và khi giảm chuyển động |
| Phản hồi chung | `Sfx.answer` / `Sfx.finish` | nảy/lắc thẻ, aria-live, combo 3/5/10…, pháo giấy ≥ 80 % |
| CSS chuyển động | `scripts/build-stitch-css.mjs` (PR #212) | `st-pop` 200 ms, `st-burst`, `st-fade` 180 ms, `st-rise`; tắt khi reduced-motion |
| Nhân vật | `web/js/characters.js` (`Chars`) | Ama/Carlos 2D: still-*.webp + clip *.mp4 (13 tư thế; Carlos thiếu wave/concern/point/empathy → tạm `talk`) |

Thiếu: âm được thiết kế, đếm XP, thanh tiến độ chạy, chuyển màn, nhân vật "sống" khi đúng/sai.

## 2. Gói âm (`web/sfx/*.mp3`, ~22 KB cả gói)
Tự tổng hợp bằng `scripts/sfx/build.mjs` (công thức trong code, không mẫu của ai → CC0 của mình, $0, dựng lại y hệt). Mỗi âm chuẩn **−16 LUFS ±1, đỉnh ≤ −1 dBFS** (BS.1770, `scripts/sfx/loudness.mjs`); trộn theo vai bằng `VOL` trong feel.js. tap 0.8 · correct 3.1 · wrong 2.4 · combo 3.0 · complete 7.7 · streak 5.4 KB.
- correct: chuông 2 nốt đi lên · wrong: "bonk" trầm dịu (không buzzer) · combo: lấp lánh 3 nốt, cao độ tăng theo chuỗi (≤ +7 bán cung) · complete: fanfare 4 nốt + hợp âm ấm · streak: vút + chuông.
- Tải sau lần chạm đầu; chưa giải mã xong → bíp cũ. Vẫn đi qua `Sfx.*` nên mọi bề mặt tắt theo `settings.sfx`. `Sfx.locked` chặn `streak-ui.js` ghi đè.

## 3. Chuyển động (`web/js/feel.js`, Web Animations, 0 byte vào khung app)
`Feel.count(el, to)` XP đếm lên 700 ms + nảy 180 ms · `Feel.fill(bar, pct)` thanh chạy 400 ms (scaleX, không đổi layout) · `Feel.swap(update, el?)` chuyển màn ≤ 200 ms (View Transitions nếu có) · `Feel.combo(el, n)` nảy + vòng sáng.
Reduced-motion: nhảy thẳng giá trị cuối, chỉ mờ ≤ 120 ms. Trình đọc màn hình nghe số cuối, `aria-valuenow` cập nhật ngay.

## 4. Nhân vật phản ứng: Rive vs Lottie (2D, qua `Chars`)
| | Rive | Lottie (lottie-web light / dotLottie) | Clip có sẵn (Chars) |
|---|---|---|---|
| Runtime (lười) | ≈ 150 KB gz (canvas-lite + wasm) | ≈ 45 KB gz (light) / ≈ 250 KB wasm | 0 KB |
| Trạng thái idle/cheer/concern | State machine sẵn, chuyển mượt | Tự viết, nhảy segment | Đổi clip + mờ chéo 150 ms |
| Ảnh raster Kling của mình | Lưới biến dạng (thở, chớp mắt) trên still | Chỉ ghép ảnh, không biến dạng tốt | Đúng art chủ đã duyệt |
| Rủi ro | Phải dựng rig tay → dễ thành "programmer art" (đã bị chê); kiểm điều khoản gói free trước | Như trên, art vector phải vẽ lại → lệch nhân vật | Carlos còn thiếu `concern` |

**Đề xuất:** bước 1 dùng clip có sẵn (`listen`=idle, `cheer`, `concern`) qua một máy trạng thái nhỏ trong `feel.js` – đúng art, 0 KB. Rive chỉ làm bước 2 nếu chủ muốn sống hơn, rig từ still đã duyệt, chủ duyệt mẫu trước. Lottie loại (phải vẽ lại nhân vật).

## 5. Duyệt & nối
1. Chủ nghe/xem trang mẫu (Artifact "Lexkite game feel") → OK/sửa.
2. Sau khi PR #212 (Stitch v2) gộp: nối màn phản hồi bài học (`web/js/st/lesson.js`): `Feel.count` XP, `Feel.fill` thanh, `Feel.combo` chuỗi, nhân vật phản ứng – vẫn sau cờ, kèm ảnh CI trước/sau.
3. Bật mặc định + công tắc trong Cài đặt (chuỗi 15 ngôn ngữ theo `docs/I18N-PIPELINE.md`) chỉ khi chủ OK.

## 6. Luật thưởng một nguồn (22/11)
Mọi XP (web, add-on dùng chung `game.js`, mini-game cpack, native) tính bằng **`Game.xpFor(kind, {right,total,mode,hard,hints,score,paid,words,sections})`** trong `web/js/game.js` – bảng `Game.XPR`. Không màn nào tự đặt số (`scripts/test/reward-rules.mjs` chặn; danh sách chờ chỉ được giảm). Native đọc `native/shared/gen/vectors/rewards.json` (`node scripts/native/gen-rewards.mjs`).
| kind | XP | Dùng cho |
|---|---|---|
| `answer` | chọn 2 · gõ 3 · viết câu 4 · nói 3; câu khó +3 | trả lời từng câu |
| `set` | 10 + (XP/câu × số đúng) + 5 nếu đúng hết (≥ 3 câu) − gợi ý (≤ phần đúng); `paid` = câu đã trả riêng | bài luyện, mini-game (ghép thẻ, blitz, nhịp), bài nghe/đọc |
| `exam` | 40 + XP/câu × đúng + 30/phần + hoàn hảo | đề thi đủ, thi thử |
| `say` | máy nghe ≥ 85 % → 5 · ≥ 65 → 3 · < 65 → 0 · không chấm được → 3 | nói 1 câu/từ |
| `talk` | 10 + 3 × lượt nói − gợi ý, tối thiểu 5 | hội thoại, gọi, phản xạ, shadowing |
| `essay` 20 · `learn` 20 · `card` 2/5/8 (quên/ôn/mới) · `output` số từ ÷ 5 (≤ 60) · `step` 2 | | bài viết, học từ mới, thẻ, thẻ kết quả, bước nhỏ |
Nguyên tắc: chỉ câu ĐÚNG ăn điểm; tự tạo ra (gõ/viết/nói) > chọn; không thưởng tốc độ (ghép thẻ trước đây +10 nếu < 25 s → nay theo số cặp đúng; kỷ lục giờ vẫn có huy hiệu); trần 150/lần. **Chống cày:** `reward({…, src})` – cùng bài trong ngày lần 3–4 nửa XP, từ lần 5 ≤ 2 (khóa `xprep`, chỉ trên máy, không đồng bộ).
