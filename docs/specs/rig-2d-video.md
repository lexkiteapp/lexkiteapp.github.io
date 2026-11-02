# Rig 2D giáo viên → video (mẫu, chờ anh chủ duyệt)

> TL;DR: Giáo viên 2D dựng một lần bằng SVG có tham số (mặt vẽ của #293). Mỗi clip tốn 0 credit, khớp miệng theo âm vị Kokoro, render trên CI rig-sample.yml, có 13 cổng QC. Mỗi câu chọn cô, thầy hoặc luân phiên.

**Mục tiêu.** Video giáo viên 2D rẻ hơn Kling: rig dựng một lần, sau đó mỗi clip tốn 0 credit, nhân vật nhất quán tuyệt đối, và cùng engine phát được trực tiếp trong app.

**Cách làm.** Rig SVG bằng code, dựng lại trên mặt vẽ của PR #293:
- Phần dùng lại: `web/js/call/face.js`, `mouths.js`, `lipsync.js` và đầu trơn `head-bare-2x.webp`.
- Rive bị loại vì phải kéo thả trong editor, nên không tự động trọn được. Gói miễn phí cũng giới hạn số file và chỉ xuất bản có watermark hoặc bị hạn chế.

**Đầu vào.** `content/video/rig/<id>.json` gồm:
- `who` mặc định và danh sách câu `segments[]`.
- Mỗi câu có `who` riêng, nên clip có thể chỉ cô, chỉ thầy, hoặc hai người luân phiên. Ngoài ra còn `emo` và `hand` (`thumb` hoặc `palm`).
- `template` là khung tạm; khi làm loạt, khung lấy từ Stitch.

**Pipeline.** Chạy trên CI `rig-sample.yml`, không chạy trên Mac:
1. `scripts/rig/tts.py`: Kokoro sinh tiếng và mốc âm vị trong cùng một lần chạy. Giọng lấy từ `characters.json`, `speed` giữ nhịp ≤150 wpm.
2. `scripts/rig/timeline.mjs`: dựng cues cho từng câu, chạy `LipFace.machine` (miệng, chớp mắt, liếc, mày, nghiêng/gật), thêm tay và thở. Bản `--reduced` (prefers-reduced-motion) bỏ nghiêng, gật và thở; tay chỉ mờ dần, không bay lên.
3. `scripts/rig/render.py`: resvg + Pillow ra MP4 9:16, loudnorm về −16 LUFS, xuất khung chính và chạy QC.

**Cổng QC.** Điểm = phần trăm cổng đạt; cần ≥90 và không cổng nào đỏ.
- Giọng đúng giáo viên, chỉ tiếng Anh, nhịp ≤150 wpm, hook ≤1,5 s (tiếng và thẻ hook xuất hiện từ khung 0), dài 15–30 s.
- Khớp miệng: lệch ≤45 ms, đúng hình ≥80 %, không nháy miệng, chớp mắt 6–30 lần/phút.
  - Lệch đo ở scripts/rig/lag.mjs: miệng ↔ hình chuẩn âm vị theo cụm + miệng rời X ↔ mép bật tiếng (một ngưỡng `LS.ONSET` 5 %). Âm vị đầu câu Kokoro muộn 35–60 ms → `LS.anchor` neo vào tiếng. Test hồi quy: scripts/test/rig-lag.mjs (miệng trễ 60 ms phải đỏ).
- Âm lượng −16 ±1 LUFS, đỉnh ≤ −1 dBTP.
- Có bản reduced-motion; tương phản phụ đề ≥4,5:1; số khung khớp thời lượng.

**Chưa làm (chờ anh duyệt mẫu).**
- Chạy loạt kịch bản.
- Màu tay cho Carlos.
- Lấy khung từ Stitch.
- Phát trực tiếp trong app theo đúng/sai: dùng engine của #293, cờ `lk.lipsync`.
