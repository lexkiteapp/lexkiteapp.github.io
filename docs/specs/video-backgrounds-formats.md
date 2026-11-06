# Video: kho nền dùng lại + đa format + cổng đồng bộ môi/sub/giọng (spec 1 trang, 05/11/2026)

> TL;DR: Mọi video Teach2D dùng giáo viên **TeacherRig** (#669, Ama/Carlos 2D: lip sync, cử chỉ, biểu cảm, 4 ảnh tư thế) + bố cục/đồ hoạ từ Stitch. Thêm **kho template nền** (chủ đề × biến thể × layout, không chữ, 0-credit trước, manifest + QC, tự chọn theo chủ đề/CEFR, xoay vòng), **5 format** để không nhàm, **60 fps**, và **cổng đồng bộ** đo lệch môi ↔ giọng ↔ phụ đề theo từng từ (ms), giọng duy nhất Kokoro. CI-first, credit chỉ trong mức đã duyệt.
> Đọc khi: thêm nền/format video, sửa cổng đồng bộ.

## 1. Kho nền `brand/library/bg/` (manifest `content/video/bg/manifest.json`)
- **Trục**: chủ đề (café, sân bay, văn phòng, lớp học, phố, nhà, khách sạn, siêu thị – mở rộng theo `content/video/cine/news/bg_topics.json`) × biến thể (sáng/chiều/tối · 3 bảng màu brand · 2 góc) × layout (9:16 `short`, 16:9 `wide`, 1280×720 `thumb`). Mỗi mục: `id, topic, cefr_fit[], variant{time,palette,angle}, layout, src, sha, depth?, qc{}`.
- **Phong cách**: token/bảng màu từ `brand/social/channel-kit` + `docs/DESIGN-SYSTEM.md` (một nguồn), phẳng 2D hợp Ama/Carlos, vùng trống cố định cho card/giáo viên/phụ đề theo layout (không vật quan trọng sau đầu/băng phụ đề).
- **Nguồn, thứ tự 0-credit**: (1) Stitch vẽ cảnh nền (dùng hạn mức 400/ngày, mỗi lần 1 cảnh) → xuất SVG/PNG; (2) SVG tự dựng theo tham số (đổi giờ/màu/góc bằng code, 0 ảnh mới); (3) asset bank Kling/footage hiện có (`brand/library/cine`, đã trả tiền). Kling mới chỉ khi chủ duyệt credit (`docs/CREDIT-RULES.md`).
- **QC tự động** (`scripts/video/bg/qc.py`, CI): cổng `TEXT_OBJ` (không chữ/logo – OCR + detector như `docs/VOCAB-IMG-STYLE.md`), kích thước đúng layout, tương phản card/phụ đề trên nền ≥ 4,5:1 ở vùng chữ, độ rối (edge density) vùng card thấp, không trùng gần (pHash) với nền khác, đúng bảng màu (ΔE). Trượt → không vào manifest.
- **Chọn tự động** (`pick_bg(ep)` thuần, test): khớp `topic` của tập (từ `area`/từ khoá/kịch bản) → lọc `cefr_fit` → xoay vòng: không lặp nền trong 6 tập liên tiếp cùng kênh, không lặp biến thể trong 3 (sổ `content/video/bg/used.json`, luật như `publish_pack` cũ); hết nền phù hợp → nền chung của chủ đề cha + cảnh báo (không im lặng).

## 2. Đa dạng format (cùng rig + Stitch, nối vào `gen.py` template)
| Format | Nhịp/hook | Ghi chú |
|---|---|---|
| Hội thoại 2 thầy cô | hook câu hỏi 1–2 s, cắt cảnh theo lượt nói | 2 rig trên một khung (Ama trái, Carlos phải), viseme riêng từng người |
| Quiz | đếm 3-2-1, đáp án + praise | có sẵn (`quiz_card`) |
| Sai thường gặp | ✗ → ✓, hook "Stop saying…" | có sẵn (`_fix`) |
| Câu chuyện ngắn | 3 cảnh nền đổi theo câu | dùng 3 nền cùng chủ đề trong kho |
| Phát âm cận cảnh | zoom miệng rig + IPA + nhịp nhấn | layout mới `close`, miệng ≥ 30 % khung |
Chuyển cảnh/nhịp/hook xoay theo sổ để 2 tập liên tiếp không cùng (format, hook, chuyển cảnh). Mọi bố cục port từ Stitch (không style lại bằng code).

## 3. 60 fps, mượt
- `FPS` 30 → 60 cho bản social và nhúng: rig_plan/rig_host/build/qc/lipsync dùng chung `labels.frames_of(total, fps)` (đã sửa #679) nên chỉ đổi tham số; Remotion render 60. Chi phí render ≈ ×2 → đo phút runner trên pilot trước khi chạy lô (`docs/CI-RUNNERS.md`).
- Cổng `smooth` (qc.py): không khung trùng lặp ngoài khoảng tĩnh có chủ đích, không bước nhảy vị trí > ngưỡng/khung ở node chuyển động, ffprobe đúng 60 fps CFR.

## 4. Đồng bộ môi ↔ giọng ↔ phụ đề (một giọng)
- Giọng duy nhất **Kokoro** prerender (`one-voice-tts`; Ama/Carlos mỗi người 1 voice cố định trong `web/teach/characters.json`), không ElevenLabs. Cổng `voice_id`: mọi câu trong tập cùng engine + voice của nhân vật.
- Mốc từ = faster-whisper (không prompt) trên `voice.wav`; viseme = Rhubarb trên cùng file.
- Cổng `sync` (mở rộng `lipsync_rig`, ms, chặn clip): môi ↔ giọng |Δ| ≤ 33 ms mọi mốc ≥ 50 ms (có); phụ đề ↔ giọng: từ hiện/tô sáng trong ±80 ms đầu từ, không tắt trước cuối từ; phụ đề ↔ chữ kịch bản khớp 100 % token; báo p50/p95/max từng loại vào `qc.json` + bảng điểm.

## 5. Task
- [ ] manifest + `pick_bg` + test xoay vòng; `bg/qc.py` + TEXT_OBJ
- [ ] 20 nền đầu: 8 chủ đề × SVG tham số + Stitch (0 credit)
- [ ] format hội thoại 2 rig + phát âm cận cảnh (Stitch ref trước)
- [ ] 60 fps pilot 4 tập (đo phút) → lô
- [ ] cổng `sync` sub/voice + `voice_id` + `smooth`
