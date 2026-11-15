# Rig giáo viên 2D kiểu Rive (TeacherRig) – spec-lite 05/11

> TL;DR: Ama/Carlos thành rig 2D chạy thời gian thực (input số + state machine + blend, đúng mô hình Rive), dùng chung cho Call, màn dạy học, video. Không dùng tệp .riv (lý do bên dưới). Mã: `web/js/teacher-rig.js`. Cổng: `scripts/test/teacher-rig.mjs` (npm test) + `teacher-rig.yml` (trình duyệt thật).
> Đọc khi: thêm cử chỉ/biểu cảm, gắn giáo viên vào màn mới, làm gesture bank.

## Khả thi .riv (kết luận)
- **Không sinh .riv tự động được ở $0.** Định dạng nhị phân, không có trình ghi chính thức. `rive --publish` chạy không cửa sổ nhưng rig phải dựng trong editor. Bản không splash cần gói Cadet $9/chỗ/tháng, trái luật $0. Runtime canvas-lite nặng 468 KB gz, hơn cả khung app 372 KB. Phải vẽ lại vector nên đổi hình chủ đã duyệt. Số đo lấy từ #583.
- **Phương án dùng: rig tự viết, giữ đúng input của Rive.** Gồm `viseme` (số), `emotion` (enum), trigger `gesture`. Nếu sau này chủ chọn Rive thì người gọi không phải đổi gì.

## Kiến trúc (giữ đúng hình đã duyệt, không vẽ tay)
| Lớp | Nguồn | Chuyển động |
|---|---|---|
| Mặt | đầu trơn + mắt/mày/miệng vector (#293 `LipFace/LipMouth/LipPaint`) | 9 viseme theo mốc CI/Kokoro hoặc live; chớp, liếc; miệng không bị làm mượt trễ |
| Khớp cổ/thân | cùng ảnh | biến đổi **cứng**: xoay ≤ 6°, gật ≤ 8 px, lắc ≤ 3 px; thở là co giãn đều ≤ 0,6 %. Không có phép uốn nên không méo, không gãy khớp |
| Tư thế/cử chỉ | ảnh tư thế registry (`Chars.still`), sau này thêm clip footage | mờ chéo 180 ms trong CÙNG 1 canvas. Khi đang nói, cử chỉ xếp hàng tới hết câu; khi bắt đầu nói, ảnh tư thế mờ ra để miệng khớp |

API: `TeacherRig.mount(el, who)` → `speak(audio, visemes, {text})`, `setEmotion(name)`, `gesture(name)`, `listen(on)`, `destroy()`.
- **Biểu cảm (9):** neutral, happy, praise, encourage, thinking, surprise, listen, sad (buồn nhẹ), explain. Trộn dần, có trần tốc độ mỗi khung.
- **Cử chỉ (16):** nod, shake, blink, bob (thủ tục) · wave, point, explain, cheer, think, surprised, laugh, empathy (ảnh đã duyệt) · thumbs_up, clap, count, hold_card.
- Bốn cử chỉ cuối: ảnh chuẩn riêng cho cả 2 người (gesture bank 05/11 + 12/11; `count` = 1 dáng giữ yên ngón trỏ "số một"). `alt` chỉ còn là lưới an toàn khi thiếu ảnh.
- **Giảm chuyển động:** khớp cổ và thở đứng yên; vẫn giữ miệng, chớp mắt và mờ chéo.
- **Máy yếu:** hạ về dpr 1. Thiếu tài sản: hiện ảnh poster 2D.
- 0 thay đổi DOM mỗi khung. Tải lười, khung app không đổi.

## Cổng QC (CI, không chạy trên Mac)
1. **Khớp môi:** mọi mốc ≥ 50 ms trong `cues.js` (256 câu × 2 người, 7.294 mốc) hiện đúng hình trong **±33 ms**. Đo hiện tại: p50 17 ms, p99 27 ms.
2. **Khớp xương:** chạy 60 s kịch bản ngẫu nhiên. Góc/độ dời trong giới hạn, đổi mỗi khung ≤ trần tốc độ (không giật), ma trận không trượt, độ dài chi đổi ≤ biên thở.
3. **Trình duyệt:**
   - fps ≥ 55 ở CPU 1× và ≥ 50 ở CPU 4×; khung > 34 ms ≤ 5 %.
   - So khung lúc chuyển trạng thái: không khung nào đổi > 35 % tổng thay đổi.
   - Alpha: viền ngả xanh phông ≤ 1 %, không cắt đỉnh, không bụi nền.
   - Giảm chuyển động; 0 lỗi JS; ảnh từng trạng thái lưu thành artifact.
4. Mọi cử chỉ trỏ tư thế registry có ảnh cho cả 2 người.

Ngưỡng chỉ được siết, không nới.

## Task
- [x] Lõi + lớp DOM + 2 cổng + workflow (PR này).
- [ ] Gắn vào Call (`call.js` → thay `LessonTeacher.mount(..., {lip:true})`) và câu hỏi bài học. Chờ các PR đang giữ file gộp xong: #311 call.js, #581 lesson/teacher.js, #377/#360 face.js. Sau đó `teacher.js face()` dùng chung lõi này, không còn 2 bản.
- [ ] Thân/tay sống của #594 (`LipRig`, uốn WebGL): khi gộp, cắm làm lớp thân. Cổng khớp xương ở đây áp cho cả lớp đó.
- [x] Gesture bank ảnh tĩnh: đủ 4 cử chỉ × 2 người (12/11, Nano Banana Pro qua Kling, 100 cr; ledger `brand/library/cine/teachers/tools/ledger.txt`). Clip phông xanh cho video: lô sau.

## Gesture bank – KẾ HOẠCH CHỜ DUYỆT (chưa tiêu credit: 0 / 200 pilot)
**Đã tận dụng (0 credit):** 13 tư thế × 2 người trong registry, gồm clip + ảnh tĩnh của trang phục 3 đã khoá.
**Không dùng được:** clip trong `brand/library` như `ama_wave_thumbs`, `carlos_listen_thumbs`, `ama_q_talk_nod`. Các clip này là trang phục "casual"/"travel" cũ, trộn vào sẽ sai bộ nhân vật đã khoá. Gật/lắc đầu làm bằng thủ tục, không cần clip.

**Cần tạo (11 clip), trang phục 3, phông #00B140, máy khoá, tay xuôi ở đầu và cuối, môi khép:**
- Ama: thumbs_up, clap, count (1-2-3 ngón), hold_card.
- Carlos: 4 cử chỉ trên, cộng thêm point, encourage, concern. Ba tư thế này hiện đang mượn tư thế khác.

| Bước | Cách | Credit |
|---|---|---|
| Ảnh khung đầu 2K | `image_to_image` từ khung đầu đã khoá, 4 ảnh/lượt → `check_first.py` + soát 5 ngón/khung | ~4/mục |
| Clip 1080p 5 s | `send2.sh` dry-run → 1 clip → `qc2.py` + tờ soát ≥ 90 | ~25/mục |
| Pilot | 1 mục: Carlos point (thiếu lâu nhất), làm trọn tới khi vào rig | **≤ 30** |
| Phần còn lại | 10 mục, lần lượt từng cái; hỏng 2 lần liên tiếp thì dừng | ≤ 290 |
| **Tổng trần** | | **≤ 320 cr** (trong mức ~1.500 nếu pilot đạt) |

**Cách dùng:**
1. Clip đi CI `green-prep` → `matte-pro` → `teach-build` (thêm tư thế vào `characters.json` và `still_frame`), qua `characters-gate`.
2. Trong rig: đổi `pending` → tư thế thật (1 dòng trong `GESTURES`).
3. Tái dùng nguyên clip cho video (`registry_clips.py`) và `teacher-live` (phát clip trên chỗ giáo viên).
4. Mỗi clip là tài sản một lần trong bank; từ đó mọi câu/màn mới dùng lại với chi phí 0.

## Ghi chú kiến trúc (chuyển từ đầu web/js/teacher-rig.js, 07/11)

- 🎭 TeacherRig – rig hoạt hình 2D Ama/Carlos kiểu Rive (input số + state machine + blend), dùng chung cho Call, màn dạy học, video (spec: docs/specs/teacher-rive-rig.md).
- Không có .riv: Rive cần editor GUI + gói trả phí để bỏ splash và vẽ lại hình đã duyệt (#583 đo: runtime 468 KB gz) → rig tự viết, cùng mô hình input của Rive:
- lớp mặt  = đầu trơn + mắt/mày/miệng vector (LipFace/LipMouth/LipPaint, #293) – miệng theo viseme, không bao giờ bị làm mượt trễ (khớp ±33 ms, cổng teacher-rig.mjs)
- lớp thân = biến đổi CỨNG quanh khớp cổ (xoay + tịnh tiến, thở = co giãn đều ≤ 0,6 %) → không méo, không gãy khớp, độ dài chi không đổi
- lớp tư thế = ảnh tư thế đã duyệt (Chars.still, footage registry) mờ chéo 180 ms trong CÙNG 1 canvas (0 thay đổi DOM mỗi khung)
- API: TeacherRig.mount(el, who, o) → { speak(audio, visemes, o), setEmotion(name), gesture(name), listen(on), pause(on), destroy(), stats }
- Lõi thuần (Node + trình duyệt): TeacherRig.core – cổng CI chạy đúng lõi này. Tải lười: chỉ màn có giáo viên nạp tệp này (shell không đổi).
- [x] App native (iOS SwiftUI / Android Compose, mốc M2): port đúng rig này (cùng input `viseme`/`emotion`/`gesture`), không dùng runtime Rive – xem `docs/specs/native-apps.md` §5 (C05); định nghĩa + vector sinh bởi `scripts/native/gen-teach.mjs`.
