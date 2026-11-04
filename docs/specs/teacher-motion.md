# Chuyển động & biểu cảm giáo viên: kiểm kê + hướng đi (spec-lite, 4/11)

> TL;DR: **chưa từng có Rive trong sản phẩm**. Hiện giữ clip Kling + mặt vẽ canvas, đã sửa chuyển trạng thái và tay bị che. Hướng dài hạn chủ chốt 4/11: footage + lớp miệng Rive, chờ mẫu đo.
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

## Tay không bị che (chủ 4/11, ảnh tay Carlos sau thẻ)
Đo: `scripts/teach/hands.py` → `scripts/teach/hands.json`; bảng đầy đủ: artifact `teacher-states-clips`. Dải tay ở khung ảnh tĩnh (% từ đỉnh):
Carlos cheer 53–82, explain/point 52–87, concern/empathy 74–92. Ama cheer 48–61, explain 56–68, point 49–60 + 76–83, encourage 48–65 + 88–94, empathy 48–66. Tư thế khác: không có tay trong vùng nhìn thấy.
Khe (phần khung nhìn thấy từ đỉnh): câu hỏi bài học 67 %, kết bài 70 %, chỗ giáo viên 72 %. **Quy tắc gốc:** đường che cắt ngang dải tay → nâng người bằng `Chars.lift` (trong khoảng trống trên đầu); không đủ chỗ thì cổng `teacher-states` đỏ. Đổi bố cục khe mà không cập nhật = đỏ. Tay xuôi khuất hẳn không tính là cắt.
**Giới hạn:** dò tay bằng màu da (đo trên hình, không nhận dạng bàn tay). Chỉ kiểm khung ảnh tĩnh ở khe; trong clip, tay đi qua đường che lúc vung là bình thường, số % nằm trong bảng. **Chưa kiểm:** khe trong video Remotion, thẻ chia sẻ, Truyện/Radio (`Chars.duo`, #581).

## Bộ tham chiếu khoá
`brand/characters/ref/{ama,carlos}.png` + `refs.json` (sha256, nguồn). Cổng `scripts/teach/ref_gate.py`. **Đo được:** ΔE da/áo, đổi nhân vật giữa clip, đầu trôi. **Chưa đo tốt:** từng nét mặt, "đúng phong cách 2D": không báo đạt, phải soi mắt.

## Kling (chưa tiêu credit)
Kho `lexkite-footage` đã soát bản Carlos còn lại: `gc11_point` tay ra ngoài khung, `gc11_encourage_2` tay giơ kiểu "dừng lại", `gc11_concern_2` nhắm một mắt, `gc11_concern` mặt không đổi; `gc11_encourage` (tay đặt ngực) xem lại được. Bí danh hiện tại do chủ duyệt 29/10.
Ưu tiên theo số màn dùng; giá theo `credits-kling`: ảnh ≈ 4 cr/lượt, clip 10 s 1080p ≈ 50 cr.
| # | Mục | Vì sao, dùng ở đâu | Credit | 0-credit thay thế |
|---|---|---|---:|---|
| 1 | Carlos `point`, tay trong khung | Lộ trình, mỗi lần vào Home | 54 (thử trước) | đang: explain 2 bàn tay |
| 2 | Carlos `encourage` có cử chỉ | Nhắc học, chuỗi, kết bài < 80 %, Speak | 54 | thử `gc11_encourage` có sẵn trước |
| 3 | Carlos `concern` mặt lo thật | Mỗi câu sai | 54 | đang: empathy, chấp nhận được |
| 4–5 | `thinking` không cau mày, cả hai | 5 thẻ Say, Call | 108 | Speak đã dùng listen |
Tổng dự kiến 270 cr + tối đa 2 lần làm lại mỗi mục, trong trần 200 thử/1.500 tổng do coordinator chuyển lời chủ.
**Tiêu chí thêm để tái dùng với lớp miệng (footage + Rive/canvas):** đầu đứng yên (trôi ≤ 1 % khung), nhìn thẳng, môi khép suốt clip, tay trong dải 45–65 % khung, hai bên chừa ≥ 15 %, phông xanh đồng màu không trùng áo Carlos. Câu LOCK: "keeps the exact same face, hair, outfit, body proportions and flat 2D vector style; head stays perfectly still facing camera, lips closed; both hands stay fully inside the frame between chest and chin; flat chroma-key green; no shadows". Thứ tự: `check_first.py` khung đầu → 1 clip → tách nền → `ref_gate` + `hands.py` → dựng thử vào màn thật → mới làm tiếp; 2 lần lỗi thì dừng.

## Rig thân tay + chữ theo lời (chủ 4/11: "tay cứng", muốn sinh động)
**Rig (`web/js/call/rig.js`, 0 credit, 0 tài sản mới, tải lười cùng mặt vẽ):** thân vẽ từ ảnh tĩnh đã duyệt và uốn trong shader WebGL; đầu vẫn là lớp mặt vẽ, cắt mềm ở cổ. Input kiểu Rive: `breath`, `sway`, `arm[2]`, `mix` → sau này thay bằng footage/Rive không đổi người gọi. Nói → mờ chéo 260 ms sang tư thế có tay (`GEST`: Ama explain/encourage, Carlos explain), tay nhấn theo `beat` của tiếng (~5°), im 0,7 s → về nghỉ. Thêm tư thế: thêm vùng khuỷu→bàn tay vào `LIMB`.
Hạ cấp: giảm chuyển động / tiết kiệm dữ liệu / không WebGL → không rig; máy yếu (khung dài > 15 %) → gỡ rig giữa chừng về ảnh 2D. Thân vẽ 30 fps. **Giới hạn:** bài học câu hỏi chỉ thấy tới ngực nên tay ít hiện; Carlos chưa có tay một bên (cần clip, §Kling).
**Chữ theo lời:** mốc từng từ `LipSync.wordTimes` = cùng phép căn âm vị vào đường tiếng thật của đúng file đang phát với miệng, đầu từ bám chỗ tiếng bật lên. Chỉ đổi màu + gạch chân bằng bóng, không đổi bố cục. Giọng máy hoặc không giải mã được file → không có mốc → chữ tĩnh, không đoán. **Đo:** ≤ 120 ms trên tiếng giả (`teacher-bubble.mjs`); trên giọng thật chưa có mốc từ của Kokoro để so, xem video artifact `chars-lively`.
**Icon hiện chữ F/D:** `sw.js` cache-first `.woff2` theo URL, font thu gọn cũ thiếu icon mới → hiện chữ cái đầu. Nay `?v=hash` (cổng `icon-font-version.mjs`).

## Việc còn lại
1. **Mẫu thử footage + Rive (chưa làm, chưa kết luận):** cần đo thật khớp miệng ±33 ms, WebKit. Runtime 468 KB gz tải lười, không chạm trần khung. `.riv` tự động: CLI chạy được trên CI nhưng bản sạch cần tài khoản + workspace Cadet ($9/chỗ/tháng): **bước chủ phải quyết**. Nếu dùng bản Free thì có splash. Ghép ánh sáng: lớp miệng trên đầu footage đứng yên, cùng cách `face.js` đang làm. Mục "không dùng Rive lúc này" ở trên được thay bằng hướng chủ chốt 4/11: làm mẫu đo trước, không đạt thì báo số.
2. Chọn lại khung `laugh` cả hai (0 credit, `teach-build`), sau khi #546 gộp.
3. Ngưỡng `ref_gate`, `motion_jump` đang chạy `--report`, chuyển sang chặn sau khi đặt ngưỡng theo số đo CI đầu tiên.
