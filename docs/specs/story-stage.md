# Sân khấu Truyện + khung bài tập (story-stage)

> TL;DR: Ama + Carlos đứng trên một sàn chung, người nói sáng; bài tập dùng cùng bệ; nút/hàng đáp án theo chuẩn Duolingo. Mã tải lười, CSS theo token. Cổng: `scripts/test/story-stage.mjs` + `story-stage.yml`.

## Lỗi → gốc → sửa
| Lỗi (iPhone Safari tối) | Gốc | Sửa |
|---|---|---|
| Nhân vật lơ lửng, cắt ngang hông | Ảnh nửa người trong hộp 150×160 đặt rời, không bệ; đáy mờ lộ trên nền | `.ss-stage` 2 chỗ đứng 52 % + `.ss-floor` cùng màu khung chat (bài tập: bệ lấy đúng màu thẻ đề bài), mặt nạ mờ đáy ảnh (chỉ khung bài tập; sân khấu Truyện để sàn che đáy – mặt nạ trên khung vẽ động làm tụt fps 4×) |
| Chip AMA/ĐỐI THOẠI/CARLOS bị đầu trang che | `main` chỉ `pt-14`; đầu trang cố định cao 56 px + vùng an toàn iPhone | `.ss>main{padding-top:3.5rem+safe-area+.5rem}` (chưa đo trên máy thật – cổng trình duyệt kiểm `chip.top ≥ header.bottom`) |
| Bong bóng nặng, 🔊 lệch giữa 2 người, không rõ ai nói | Khuôn Stitch: Carlos nút 🔊 đầu hàng, Ama cuối | `.ss-act`: 🔊 + 🐢 cùng hàng, cùng chỗ; viền 1 px; `data-speaker` sáng/mờ + viền dòng hiện hành |
| Giật khi cuộn/khi dòng hiện | (1) `backdrop-blur-xl` trên đầu trang cố định (Safari); (2) 2 giáo viên × 2 video + canvas vẽ 24 fps liên tục, không dừng khi ngoài màn/không nói; (3) `scrollIntoView` tức thì + aria-live | (1) `backdrop-filter:none` (nền đã 95 % đục); (2) StoryStage.park (không sửa teacher.js) – người im, ngoài màn (IntersectionObserver), tab ẩn → dừng vẽ + video; (3) cuộn mượt, (bỏ `content-visibility:auto`: ước lượng 96 px lệch chiều cao thật → CLS 0,011 khi cuộn tới dòng) chỉ transform/opacity |
| Bài tập: khoảng trống giữa đề và ngân hàng; CTA xám bùn; Bỏ qua/Báo lỗi cạnh tranh CTA; chip IELTS thừa | Hàng đáp án rỗng không kẻ dòng; CTA gradient + opacity; 2 nút nền trắng bóng đậm | 2 dòng kẻ sẵn (thẻ bay vào, ngân hàng giữ ô → không xô); CTA tắt xám phẳng 5,3:1 / bật giữ gradient cam mẫu Stitch, chữ ≥ 4,5:1 (sáng+tối) – chủ dự án 6/11: chọn bản đẹp + mượt, khớp Stitch; Bỏ qua/Báo lỗi giữ trên CTA như mẫu Stitch; chip mục tiêu theo mẫu (`sh.chip`, ẩn khi không có mục tiêu) |

Đã có sẵn (không đổi): word-arrange.js (FLIP, ô giữ chỗ, Backspace gỡ từ cuối, kéo thả), Sfx đúng/sai theo cài đặt, tấm phản hồi Stitch (đáp án đúng khi sai, Vì sao? = dữ liệu giải thích thật). Mới: Enter = Kiểm tra (khi không focus nút/thẻ), rung ngắn (`navigator.vibrate`, theo cài đặt âm + giảm chuyển động; iOS Safari không có), chạm sân khấu = bỏ qua lời/sang câu, chạm từ = tra (`Dict.quick`, như màn Nghe), cử chỉ `react()` theo câu (chỉ khi bật mặt vẽ `lk.lipsync`).

## Kiểm toán màn tương tự
| Màn | Hiện trạng | Việc |
|---|---|---|
| Truyện/Radio (story-duo) | đã làm | — |
| Bài tập (lesson-question: build/gap/type/listen) | đã làm (bệ + CTA + hàng kẻ) | — |
| Feedback đúng/sai (feedback-*) | giáo viên đứng sau thẻ, tư thế cheer/concern | dùng `park` + bệ: bước kế |
| Call (teacher-call) | `call.js` tự vẽ giáo viên + mặt vẽ | dùng `StoryStage.attach` không hợp (1 người); chỉ thêm `park` khi tab ẩn |
| Lesson intro/complete | Chars.slot (đã bệ) | không đổi |
| Nghe có nhân vật (listening) | không có giáo viên | — |

Chưa làm: tích hợp `TeacherRig` (teacher-rig.js chưa nằm trong gói nào của app; cần thêm vào BUNDLES = sửa app.js, PR #756) – hiện khớp miệng dùng LessonTeacher (clip + mặt vẽ + cues Kokoro); bước kế: `TeacherRig.mount(el, who).speak(audioEl, visemes)` trong `story-stage.js` sau khi app.js mở khóa. Lật hướng nhìn: bảng `FLIP` trong story-stage.js (poster Carlos đã quay trái, Ama nhìn thẳng → không lật). Tra từ chỉ bằng chạm (bàn phím dùng 🔊/Tra từ ở trang từ điển).

## Số đo (CI `story-stage`)
long task > 50 ms ≤ 2 · fps ≥ 50 (Chromium CPU 4×) · CLS 0 · WebKit iPhone 13 · ảnh 360 px sáng/tối trước/sau trong `out/story-stage/`. Khung app không đổi (module + CSS tải lười).
