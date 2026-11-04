# Chuyển động & biểu cảm giáo viên: kiểm kê + hướng đi (spec-lite, 4/11)

> TL;DR: **chưa từng có Rive trong sản phẩm**, không nhánh nào có `.riv`. Giữ **clip Kling + mặt vẽ canvas**, sửa chuyển trạng thái. Không dựng Rive lúc này. Khoảng trống thật là 4 clip của Carlos và biểu cảm `thinking` (cần credit).
> Đọc khi: thêm cử chỉ, đổi `Chars.*`, `teacher-slot/live`, `lesson/teacher.js`. Số đo mới nhất: artifact workflow `teacher-states`.

## Kiểm kê
Nguồn: `web/teach/characters.json`, mỗi tư thế = clip 10 s, 24 fps, H.264 xếp chồng alpha, 100–230 KB (`*-hd`: 2×) + ảnh tĩnh 2× 30–38 KB.

| Tư thế | Ama | Carlos | Màn dùng (ngữ cảnh) | Đúng ngữ cảnh? |
|---|---|---|---|---|
| talk / listen | clip riêng | clip riêng | Bài học, truyện (dự phòng khi không có mặt vẽ) | OK |
| cheer | clip riêng | clip riêng | Đúng, kết bài ≥ 80 %, kỷ lục chuỗi | OK. Trước đây kết bài v2 luôn cheer, đã sửa |
| concern | clip riêng | **= empathy** (gc11_empathy) | Sai, thẻ Say | Carlos tay đặt ngực, mặt không lo: chấp nhận được |
| encourage | clip riêng | **= happy** (gc11_happy) | Nhắc học, chuỗi, kết bài < 80 %, Speak bước 2 | Carlos không có cử chỉ: yếu |
| point | clip riêng | **= explain** (gc11_explain) | Nút kế trên lộ trình | **Carlos không chỉ tay** (2 bàn tay trước ngực): cần clip |
| wave | clip riêng | clip riêng | Người mới ở Home | OK |
| happy | clip riêng + vòng nghỉ | clip riêng + vòng nghỉ | Home, chuỗi băng | OK |
| thinking | clip riêng | clip riêng | Thẻ Say (5 thẻ) | **Cả hai cau mày, nhìn như giận**. Speak đã đổi sang listen; thẻ Say còn |
| laugh | ảnh tĩnh miệng khép | miệng màu lạ | Thẻ Say (2 thẻ) | **Khung ảnh tĩnh chọn sai**, chọn lại 0 credit sau #546 |
| explain, surprise, empathy | clip riêng | clip riêng | Thẻ Say | OK |

Mặt vẽ (canvas, `call/face.js` + `mouths.js`): Call, câu hỏi bài học, truyện. 9 viseme, chớp mắt, nghiêng/gật, 7 biểu cảm (`EMO`), 60 fps ở CPU 4× (call-qa). Ảnh tĩnh: phản hồi đúng/sai, chip, thẻ Say, Speak, modal.

| Hạng mục | Trước | Nay | Đo bằng |
|---|---|---|---|
| Ảnh tĩnh → clip | Nhảy tay: ảnh ở giữa cử chỉ, clip từ tay xuôi (SSIM khung đầu/ảnh 0,77–0,96) | Clip bắt đầu tại `still_frame` | shots, `motion_jump.py` |
| Mờ vào canvas | Ảnh ẩn ngay, canvas từ 0: **nháy hụt hình 180 ms** | Ảnh giữ tới hết mờ | shots giữa lúc mờ |
| Đổi tư thế bài học | Cắt cứng; ảnh chưa tải = **khung trống** ở câu sai đầu tiên | Mờ chéo 180 ms, chờ giải mã, tải trước | shots, `teacher-states.mjs` |
| Kết bài | Luôn Ama + cheer, kể cả 20 % hoặc bài của Carlos; cử chỉ mất ngay vì nói luôn | Đúng người, theo điểm, cử chỉ 0,9 s rồi nói | `teacher-states.mjs` |
| Clip nghỉ giữa 2 lần lặp | Đứng hình 6 s | Thở nhẹ như ảnh tĩnh | shots |
| Viền/nhòe tay nhanh (ảnh 5.png) | Lỗi | **Của #546**, kiểm lại sau khi gộp | `teacher-motion` |
| Giọng | Đúng (Ama `af_heart`, Carlos `am_michael`, giọng máy theo giới) | Thêm cổng | `teacher-states.mjs` |
| Giảm chuyển động | Đúng (ảnh tĩnh; mặt vẽ chỉ miệng + chớp) | Thêm cổng | cả hai |
| Độ nặng | Clip tải lười, 0 byte ở Home/Today nếu không hiện | Không đổi; +~1 KB JS | `size-budget` |

**Chưa kiểm được:** WebView thật iOS/Android (CI chỉ có Chrome + WebKit macOS, gần iOS nhưng không phải iPhone).

## So sánh 3 hướng (số đo 4/11)
| | Giữ clip + mặt vẽ, cải tiến | Rig canvas/vector toàn thân | Rive |
|---|---|---|---|
| Tải thêm | 0 | ~10–30 KB JS + vẽ lại hình | **Runtime canvas-lite 2.49.2: 121 KB JS + 348 KB wasm gz = 468 KB**, gấp 1,25 lần cả khung app 372 KB (tải lười được) |
| Giấy phép | của mình | của mình | Runtime MIT |
| Giữ đúng hình chủ duyệt | **Có** | Không (vẽ lại) | Không (vẽ lại thành vector) |
| Tự động trên CI | Có | Có | Có một phần: `rive --publish/--verify` chạy không cửa sổ, nhưng bản sạch cần tài khoản + Cadet **$9/chỗ/tháng**; Free có splash; vẽ rig vẫn cần người |
| Chi phí | $0, clip mới tốn credit | $0 | Có phí nếu bỏ splash: trái luật $0 |
| Cử chỉ tay tự do, nối mượt | Hạn chế: chỉ clip có sẵn, nối bằng mờ chéo | Có | **Tốt nhất** |

**Khuyến nghị: không dùng Rive lúc này.** Lý do: phải vẽ lại nhân vật (đổi hình đã duyệt), 468 KB, $9/tháng để bỏ splash, và lỗi hiện tại nằm ở khâu nối trạng thái, đã sửa được mà không đổi hệ. Xem xét lại khi anh muốn cử chỉ liền mạch kiểu Duolingo và chấp nhận vẽ lại. Bộ số viseme của `mouths.js` đã cùng kiểu input Rive nên không mất công nếu đổi sau.

## Bảng sự kiện (một nguồn: `Chars.forEvent`)
`correct` cheer · `wrong` concern · `done` ≥ 80 % cheer, thấp hơn encourage · `replyOk` happy · `replyFix` encourage · `think` thinking · `recall` listen · `retry` encourage.

## Việc còn lại (cần duyệt)
1. Clip Carlos: `point`, `encourage`, `concern`, và `thinking` cả hai người không cau mày: 5 clip Kling, cần duyệt credit. Lộ trình lúc đến lượt Carlos đang "chỉ" bằng 2 bàn tay.
2. Chọn lại khung `laugh` cả hai (0 credit, `teach-build`), sau khi #546 gộp vì #546 giữ `build.py`.
