# GAME FEEL – âm thanh, chuyển động, nhân vật phản ứng (PILOT sau cờ)

> TL;DR: Lớp làm app "đã tay" như game, không đụng layout Stitch v2. Mặc định TẮT; `?feel=1` bật, `?feel=0` tắt. Chờ chủ duyệt mẫu rồi mới bật cho mọi người.
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
Tự tổng hợp bằng `scripts/sfx/build.mjs` (công thức trong code, không mẫu của ai → CC0 của mình, $0, dựng lại y hệt). tap 0.8 · correct 3.1 · wrong 2.4 · combo 3.0 · complete 7.7 · streak 5.4 KB.
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
