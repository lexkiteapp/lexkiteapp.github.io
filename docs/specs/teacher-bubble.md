# TeacherBubble – bong bóng lời giáo viên dùng chung (spec, 1 trang)

> TL;DR: một module `web/js/teacher-bubble.js` cho mọi chỗ Ama/Carlos "nói" bằng chữ: gõ 1 lần/ngày, pop nhẹ, 🔊 chỉ khi bấm, miệng bám âm thanh, vòng nghỉ dừng khi ẩn.
> Đọc khi: thêm/đổi lời thoại giáo viên ở bất kỳ màn nào. Cổng: `scripts/test/teacher-bubble.mjs` (tĩnh trong npm test) + CI `teacher-bubble.yml`.

**API** `TeacherBubble.attach({ root, textEl, slotEl, pointerEl?, bubbleEl?, who:'ama', text, mood, key })` → `{ finish(), speak(audio, visemes, text), destroy(), stats }`. `mood` ∈ greet · goal · streak · review · plan (Hôm nay: người mới → greet; xong kế hoạch → goal; có từ cần ôn → review, luôn khuyến khích, không dọa; còn lại → plan). Tải lười bằng `App.loadScript('js/teacher-bubble.js')` (không nằm trong khung app / gói ux1).

## Hành vi (một nguồn)
1. **Gõ chữ** ~40 cụm ký tự/s (`CPS`), tách bằng `Intl.Segmenter('grapheme')` (dự phòng gộp dấu `\p{M}`) – dấu tiếng Việt/Hindi không bao giờ bị tách. Chỉ lần xem đầu trong ngày cho mỗi câu (`localStorage lk.tb.<key>` = ngày + băm chữ); lần sau hiện ngay. Chạm/click/Enter/Space = hiện hết. Cả câu có sẵn trong DOM (phần chờ `visibility:hidden`) → chiều cao cố định, CLS 0. `prefers-reduced-motion`, tiết kiệm dữ liệu/2G, trình duyệt tự động hóa (trừ khi `lk.tb=1`), tab ẩn → hiện ngay. Trình đọc màn hình: chữ gõ `aria-hidden`, một vùng `aria-live=polite` đọc đủ câu 1 lần.
2. **Âm**: không tiếng gõ. "Bốp" nhẹ `sfx/pop.mp3` (−16 LUFS, ≤ 6 KB, sinh bằng `scripts/sfx/make-pop.sh`) khi bong bóng gõ lần đầu trong ngày và `sfx` bật. Không bao giờ tự đọc. Nút 🔊 (44×44 px, `aria-label` dịch 15 ngôn ngữ: "Nghe Ama đọc"/"Dừng Ama đọc", đổi thành dừng khi đang đọc) gọi `UI.tts(text, accent, …, { who:'ama', gender:'f' })` → Kokoro `af_heart`/Kokoro trên máy/giọng máy NỮ. **Chỉ hiện khi đọc được thật**: giao diện en (Ama Kokoro); ngôn ngữ khác chỉ khi `speechSynthesis` có giọng nữ cho ngôn ngữ đó (`LKAudio.genderOf`); app native không có `speechSynthesis` → ẩn ở ngôn ngữ ≠ en.
3. **Miệng/biểu cảm/cử chỉ** (`TeacherRig`, tải lười): giọng phát bằng file Kokoro → rig bám `audio.currentTime` (bắt phần tử Audio qua `HTMLMediaElement.play` trong lúc đọc, vì `UI.tts` không đưa ra – không sửa `ui.js`); giọng máy/Kokoro trên máy → đồng hồ trang theo câu (`onSentence`). Gõ chữ: miệng cử động theo nhịp gõ rồi dừng. Biểu cảm theo mood (greet=happy, goal/streak=praise, review=encourage, plan=explain); cử chỉ vẫy/chỉ/giơ ngón cái chạy khi gõ xong (rig xếp hàng khi đang nói). Khớp môi ±33 ms (cổng `teacher-rig.mjs`, `lip-clock`).
4. **Vòng lặp**: chữ không bao giờ gõ lại; chỉ vòng nghỉ (chớp 3–6 s ngẫu nhiên, thở ≤ 0,6 %) lặp, và dừng hẳn (`TeacherRig.pause`) khi `document.hidden` hoặc ngoài màn (IntersectionObserver). Chỉ transform/opacity; gõ = 2 `nodeValue`/khung, không đọc layout trong vòng gõ.
5. **Hình**: bỏ viền đứt/nền/bóng của ô `[data-tch]`, bệ bo tròn → mặt nền phẳng đục (`.tslot-ledge` bo nhẹ, rộng hơn hình; KHÔNG mặt nạ mờ đáy – final-qc cấm) + bóng tiếp đất radial-gradient ở mép mặt nền, mũi nhọn bong bóng thẳng hàng miệng (`MOUTH_Y = 392/960` = `RIG.ama.mouth`, đo hộp ảnh, cập nhật khi đổi cỡ).

## Kiểm kê chỗ giáo viên "nói" (05/11) và khả năng dùng lại
| Chỗ | Hiện nay | So với chuẩn | Dùng TeacherBubble? |
|---|---|---|---|
| Hôm nay `ux1.js home2` | **TeacherBubble** (PR này) | đạt | đã dùng |
| Bài học `lesson/ui.js` + `lesson/teacher.js` (chat, nghe, kể) | SayText theo từ + clip/LipSync live, mốc CI | chữ chạy theo lời THẬT (có tiếng), không phải gõ | Không thay SayText; nên dùng `rig.speak` + pop/aria-live; kiểm kê riêng |
| Call Ama/Carlos `call.js`, `call/engine.js` | SayText + rig/LipSync, giọng Kokoro dựng sẵn | đạt phần miệng; thiếu aria-live đủ câu | Chỉ lấy phần a11y/idle-pause |
| Streak / chúc mừng (`streak-ui`, `st/v2/streak`) | ảnh tĩnh + toast | không lời, không idle-pause | Có (mood streak/goal) |
| Nhắc học `remind.js`, `retention.js` (thẻ trong app) | `Chars.slot` pose encourage tĩnh, chữ hiện ngay | thiếu 🔊/idle; không cần gõ | Có (gõ tắt, `key` riêng; 🔊 tùy chọn) |
| Thông báo hệ điều hành / push | chỉ chữ | không có giáo viên | Không (chuẩn thông báo riêng) |
| `st/common.js` `tStill`/`tFace` (chip, thẻ) | slot tĩnh/clip | không lời | Không |
| Add-on Chrome (`extension/app`) | cùng mã web (mirror) | tự theo web | Tự động (build-extension) |
| App native iOS/Android | WebView Capacitor = web; SwiftUI/Compose viết lại (docs native-apps) | — | Bản native làm lại cùng bảng hành vi trên |

## Ghi chú hành vi (chuyển từ đầu web/js/teacher-bubble.js, 07/11)

💬 TeacherBubble – bong bóng lời giáo viên dùng chung (docs/specs/teacher-bubble.md; Hôm nay dùng đầu tiên, màn khác tái dùng).
- Chữ hiện dần ~40 chữ/s theo CỤM KÝ TỰ (Intl.Segmenter 'grapheme': dấu tiếng Việt/Hindi không bao giờ bị tách), chỉ lần xem ĐẦU trong ngày cho mỗi câu; lần sau hiện ngay.
  Chạm/Enter/Space vào bong bóng = hiện hết. Chiều cao đặt sẵn lúc đầu (cả câu có trong DOM, phần chưa gõ ẩn bằng visibility) → CLS 0.
  Giảm chuyển động / tiết kiệm dữ liệu / trình duyệt tự động hóa → hiện ngay. Trình đọc màn hình: chữ gõ aria-hidden + một bản đọc 1 lần (aria-live).
- Âm: "bốp" nhẹ (sfx/pop.mp3, −16 LUFS) khi bong bóng hiện lần đầu trong ngày và sfx bật. KHÔNG tiếng gõ, KHÔNG tự đọc: giọng chỉ phát khi bấm 🔊.
- 🔊 chỉ hiện khi giọng NỮ đọc được ngôn ngữ giao diện: en = Ama (Kokoro af_heart qua UI.tts who:'ama'); ngôn ngữ khác = chỉ khi máy có giọng nữ cho ngôn ngữ đó.
- Miệng/biểu cảm: TeacherRig (tải lười) – theo đồng hồ file âm thanh đang phát (bắt Audio giọng qua HTMLMediaElement.play trong lúc đọc),
  không có file (giọng máy/Kokoro trên máy) → đồng hồ trang + chữ. Gõ chữ: miệng cử động nhẹ theo nhịp gõ rồi dừng. Vòng nghỉ chớp/thở dừng khi tab ẩn hoặc ngoài màn.
Lõi thuần (Node + trình duyệt): TeacherBubble.core – cổng scripts/test/teacher-bubble.mjs.
