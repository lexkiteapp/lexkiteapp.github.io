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

## Kiến trúc
- **Hình**: `scripts/lipsync/harvest.py` (CI) căn từng khung `talk-hd` vào nền `listen-hd` (ECC affine, che miệng), chọn 9 khung đại diện theo độ mở, răng, bề ngang, mép mảnh mờ dần. X = miệng gốc của nền. Có mí mắt chớp và roi miệng trên từng tư thế `still-<pose>` khớp được.
- **Mốc**: `pre` = cues Rhubarb (đã `smooth`: giữ ≥ 50 ms, không nháy). `live` = `LipSync.live()`, nhân quả: con trỏ âm vị chỉ tiến khi có tiếng (VAD có trễ tắt), im → X. Nếu không có âm thanh (speechSynthesis) thì chạy theo ước lượng và neo lại theo `onboundary`.
- **Vẽ**: `stateAt(cues, t)` lấy theo `audio.currentTime` (không dùng setTimeout), hình đi trước tiếng 20 ms, trộn 60 ms. Phát thật và dựng video dùng cùng một hàm.
- **Cổng** (`lipsync-lab.yml`, CPU 4×): lệch tiếng–miệng ≤ 45 ms, lệch lịch vẽ p95 ≤ 40 ms, fps ≥ 50, 0 nháy (pre), live trùng mở/đóng ≥ 75 %.

## Kết quả lab
Xem artifact `lipsync-lab` của run CI mới nhất (report.md, metrics.json, video ≤ 20 s). Số đo gửi anh kèm video.

## Đưa vào hệ thống (sau khi anh OK)
1. Commit tài sản `web/lab/lipsync/<who>` → `web/teach/<who>/mouths.webp` + `sheet.json`, đi qua `Chars` (registry).
2. `scripts/gen-audio.mjs` (audio.yml): mỗi câu Call sinh thêm `cues.json` bằng Rhubarb.
3. `lesson/teacher.js` thêm lớp miệng sau cờ `lk.lipsync`. Không có cues thì dùng live, vẫn hạ cấp về poster như hiện nay. Play & Speak dùng chung API.
4. Thu từ điển cho bản chạy thật (chỉ từ trong kịch bản + 2k từ phổ biến) để giữ trần shell.
