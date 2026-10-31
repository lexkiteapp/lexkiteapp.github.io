# Call – khớp miệng 2D chuẩn (lip-sync), $0

> TL;DR: Giáo viên 2D Ama/Carlos khớp **từng âm** bằng 9 hình miệng (chuẩn Rhubarb/Preston Blair) cắt từ chính clip registry, đè lên tư thế cảm xúc 2D sẵn có, có chớp mắt và nhịp đầu. Câu dựng sẵn: Kokoro + Rhubarb trên CI. Câu AI lúc chạy: chữ → âm vị (CMUdict) chạy theo đồng hồ âm thanh và năng lượng Web Audio. Đang ở **lab** (`web/lab/lipsync.html?lab=1`), chưa vào luồng Call: chờ anh duyệt video.
> Đọc khi: sửa `web/js/call/lipsync.js`, `scripts/lipsync/*`, đưa khớp miệng vào `call.js`/`lesson/teacher.js` hoặc Play & Speak.

## Hiện trạng (trước lab)
`lesson/teacher.js` chỉ bật vòng clip **talk** khi đang nói, **listen** khi im ([CALL.md](../CALL.md)). Miệng trong clip chạy theo nhịp của clip, không theo âm, nên lệch rõ ở từ ngắn và chỗ ngắt. Video teach2d cũng chỉ gate nói/im (`scripts/video/teach2d/qc.py`). Pilot sprite cũ (#151, `docs/mocks/teacher-pilot/b-sprite.html`) có khớp âm nhưng dùng mặt bản 3D cũ, không còn đúng nhân vật 2D.

## Cách làm các bên và nguồn mở (đã kiểm license)
| Hướng | Dùng? | Lý do |
|---|---|---|
| [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) (MIT) | ✅ câu dựng sẵn | làm cho 2D, có `--dialogFile`, đã dùng trong `cine-render.yml` |
| Kokoro ([hexgrad/kokoro](https://github.com/hexgrad/kokoro), Apache-2.0) | ✅ giọng | `start_ts/end_ts` từng từ (tiếng Anh): dự phòng/kiểm chéo |
| CMUdict ([cmusphinx](https://github.com/cmusphinx/cmudict), BSD) + luật chữ | ✅ câu AI | `content/lexicon/cmudict-subset.txt` có sẵn |
| [wawa-lipsync](https://github.com/wass08/wawa-lipsync) (MIT), Web Audio | ý tưởng | ta chỉ dùng năng lượng để mở/đóng; hình miệng lấy từ chữ (chuẩn hơn phổ tần) |
| [TalkingHead](https://github.com/met4citizen/TalkingHead) / [HeadTTS](https://github.com/met4citizen/HeadTTS) (MIT) | sau | TTS trên máy có mốc từ; WASM chậm hơn thời gian thực trên máy yếu |
| `speechSynthesis` onboundary | dự phòng | [caniuse](https://caniuse.com/mdn-api_speechsynthesisutterance_boundary_event) một phần, [WebKit 238189](https://auto-bugs.webkit.org/show_bug.cgi?id=238189): neo lại khi có, không phụ thuộc |
| Duolingo ([visemes](https://blog.duolingo.com/world-character-visemes), [Rive/Lily](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)) | mẫu | TTS → căn âm vị → viseme; miệng và tư thế chạy song song: đúng kiến trúc ở đây |
| OVRLipSync ([license](https://developers.meta.com/vr/licenses/oculussdk/)) · [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) | ❌ | chỉ nền tảng Meta · cấm thương mại |
| [MuseTalk](https://github.com/TMElyralab/MuseTalk) / [LatentSync](https://github.com/bytedance/LatentSync) | ❌ | cần GPU 8–18 GB, làm cho mặt người thật, video nặng |

**Phương án B (nếu miệng cắt từ clip chưa đạt):** vẽ lại Ama/Carlos thành Rive state machine, giống cách Duolingo làm Lily. Lớp miệng (input số = viseme) chạy song song lớp tư thế/biểu cảm. [Runtime web](https://github.com/rive-app/rive-wasm) MIT, ~150 KB, chạy thời gian thực, nhận đúng cues ở trên. Không dùng nhân vật cộng đồng chưa kiểm license, phải được cho dùng thương mại. Đổi hình cần anh duyệt.

## Miệng VẼ (31/10, thay miệng cắt-dán)
Anh chủ xem video miệng cắt từ clip: "lỗi ghê quá" → bỏ. Thay bằng `web/js/call/mouths.js` (`LipMouth`): 9 hình X–H là bộ số (rộng, mở trên/dưới, tròn, cười, răng, lưỡi) → SVG vector theo nét từng giáo viên (Ama: môi nâu đỏ, nét miệng tối; Carlos: nét đen, ria vẽ đè lên). Trộn 2 hình = nội suy bộ số (morph), cùng kiểu lớp miệng Rive (input số = viseme) – file .riv có thể dựng sau từ chính bộ số này. Bảng duyệt: `scripts/lipsync/mouth_board.py` (CI: artifact `mouth-board.png`). **Chờ anh duyệt hình** trước khi gắn vào lab/luồng Call.
Mốc: `LipSync.align(cues, env, {words})` neo mép im↔mở vào lúc tiếng bắt đầu/tắt (RMS 100 Hz), tuỳ chọn thời điểm từ Kokoro; report ghi lệch trước/sau (`AV lag (thô)`).

## Mặt VẼ nhiều lớp + mốc Kokoro (31/10, chuẩn Duolingo/Rive)
- **Lớp mặt** `web/js/call/face.js` (`LipFace`): đầu trơn (poster-2x xoá mắt/mày/miệng/ria, lấp da bằng nội suy Laplace – `scripts/lipsync/face_board.py`) + mắt, mi (mí trên = chớp), mày, ria Carlos, miệng (`LipMouth`) đều vector, toạ độ đo trên poster-2x. Input số kiểu Rive: viseme, gain, blink, look, brow, knit, tilt, nod.
- **Máy biểu cảm** `LipFace.machine()`: các lớp chạy song song, tất định theo hạt giống: chớp 150 ms mỗi 2.8–5.6 s (15 % chớp đôi), liếc chỉ ở chỗ im, nhướng mày ở chỗ nhấn (tiếng bật lên sau ≥150 ms im) và cuối câu hỏi, nghiêng/gật đầu nhẹ theo năng lượng nói, thiên hướng theo cảm xúc (`EMO`).
- **Mốc Kokoro** `scripts/lipsync/kokoro_ts.py`: Kokoro python sinh tiếng và mốc âm vị (pred_dur, 1/40 s) cùng một lần → `LipSync.fromPhones()` → `align` → `smooth` → `lead`. Rhubarb vẫn chạy để so.
- **Độ đi trước riêng** `LipSync.lead()`: M/B/P 65 ms, F/V 45 ms, W/OO 40 ms, còn lại 20 ms (hình trước vẫn ≥ 50 ms). **Độ mở theo độ lớn tiếng** `LipSync.gain(env)` ∈ [0.45, 1.15].
- **Điểm chất lượng** (`drawn_frames.mjs`, cổng CI): lệch ≤ 45 ms · đúng hình theo âm vị Kokoro ≥ 80 % (khung có tiếng, ±40 ms) · 0 nháy · chớp 6–30 lần/phút · fps mặt vẽ ≥ 50 ở CPU 4× (`web/lab/face.html`). Bảng `face-board.png`, video `drawn.gif`. **Chờ anh duyệt hình.**

## Kiến trúc
- **Hình**: `scripts/lipsync/harvest.py` (CI) căn từng khung `talk-hd` vào nền `listen-hd` (ECC affine, che miệng), chọn 9 khung đại diện theo độ mở, răng, bề ngang, mép mảnh mờ dần. X = miệng gốc của nền. Có mí mắt chớp và roi miệng trên từng tư thế `still-<pose>` khớp được.
- **Mốc**: `pre` = cues Rhubarb (đã `smooth`: giữ ≥ 50 ms, không nháy). `live` = `LipSync.live()`, nhân quả: con trỏ âm vị chỉ tiến khi có tiếng (VAD có trễ tắt), im → X. Nếu không có âm thanh (speechSynthesis) thì chạy theo ước lượng và neo lại theo `onboundary`.
- **Vẽ**: `stateAt(cues, t)` lấy theo `audio.currentTime` (không dùng setTimeout), hình đi trước tiếng 20 ms, trộn 60 ms. Phát thật và dựng video dùng cùng một hàm.
- **Cổng** (`lipsync-lab.yml`, CPU 4×): lệch tiếng–miệng ≤ 45 ms, lệch lịch vẽ p95 ≤ 40 ms, fps ≥ 50, 0 nháy (pre), live trùng mở/đóng ≥ 75 %.

## Kết quả lab
Xem artifact `lipsync-lab` của run CI mới nhất (report.md, metrics.json, video ≤ 20 s). Số đo gửi anh kèm video.

## Đưa vào hệ thống (anh OK 31/10: "gắn mặt vẽ khớp miệng vào luồng Call thật (sau cờ lk.lipsync), giữ mọi cổng")
1. **Tài sản** `web/teach/<who>/head-bare(-2x).webp` = poster-2x xoá mắt/mày/miệng/ria (`scripts/lipsync/head_bare.py` → sha256 vào `characters.json`, cổng characters-gate), lấy qua `Chars.head(who, x2)`.
2. **Mốc CI** `scripts/lipsync/call_cues.mjs` (audio.yml, chạy tay được với `only_call_cues`): mỗi câu giáo viên trong Call → Kokoro python sinh tiếng + âm vị cùng lần → `<khoá>-ls.mp3` (kho media; mp3 cũ đệm immutable nên không ghi đè) + `web/js/call/cues.js` (`LK_CUES`: mốc nén, độ lớn tiếng 100 Hz 8 bit, từ điển nhỏ cho live). Mỗi câu qua cổng như lab (lệch ≤ 45 ms, đúng hình ≥ 80 %, 0 nháy); trượt → không ghi mốc → app dùng live.
3. **Luồng Call** `lesson/teacher.js` `mount(el, who, { lip: true })` (chỉ `call.js` truyền): cờ `lk.lipsync` (localStorage 1/0 hoặc config `lipsync`) → nạp lười `call/{lipsync,mouths,face,cues}.js` (khung app không đổi) → `<svg>` đầu trơn + lớp vector, vẽ lại mỗi khung theo `audio.currentTime`, nghiêng/gật quanh cổ trong SVG. Có mốc → pre (độ dài mp3 lệch mốc > 120 ms → live); không có → `LipSync.live()` + năng lượng tiếng (AnalyserNode, cần CORS – audio.lexkite.com trả ACAO *); giọng máy → live theo thời lượng ước tính; nghỉ → chớp/liếc. Hạ cấp: lỗi nạp/thiếu đầu trơn → vòng clip WebGL → poster (saveData / giảm chuyển động).
4. **Bản nhúng** (anh chủ: "nhúng" = video bài học nhúng trên web, `lesson-video.js` / lv_embed): được phủ khi video teach2d có mặt vẽ khớp miệng (cùng `stateAt`/`LipFace`, mốc phones Kokoro) – không dựng widget giáo viên riêng.
5. **Cổng**: lipsync-lab (lab) · call-e2e mục 4b (cờ bật: mặt vẽ thay clip, fps ≥ 50 ở CPU 4×, không lỗi JS) · characters-gate · size-budget (shell không đổi).
