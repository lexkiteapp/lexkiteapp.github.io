# Sản xuất video v2 – giáo viên bằng TeacherRig + metadata đăng bài + dọn rác (spec-lite 05/11)

> TL;DR: Teach2D (`teach-video.yml`, 300 tập đã qua cổng máy, 0 tập vào bank) bị giữ vì miệng là vòng talk/listen chung, không khớp âm vị (`infra/ci-backlog.json` hold "chuẩn #293"). v2: giáo viên trong video do **TeacherRig** (#669) vẽ khung-theo-khung bằng đúng API `speak/setEmotion/gesture` với viseme Rhubarb của chính `voice.wav` → cổng khớp môi ±33 ms trên video thật; mỗi tập mang khối `publish` 4 nền tảng viết từ kịch bản; công cụ dọn video rác có cách ly. 0 credit, mọi việc nặng trên CI.
> Đọc khi: sửa lớp giáo viên của video Teach2D, metadata đăng bài, dọn video.

## 1. Giáo viên = rig (thay vòng talk/listen)
- `scripts/video/teach2d/rig_host.mjs` (CI, Playwright + `page.clock`): mount `TeacherRig` 1108×960 (cùng khung registry `talk-hd`), nền trong suốt; mốc viseme = Rhubarb từng câu (`vo/vis3/<id>.json`) + `t0` câu trong timeline → MỘT lần `speak(null, cues, {dur})` cho cả video; cảm xúc/cử chỉ theo kịch bản (`hook` → surprise/happy, `quiz` → thinking, đáp án → praise + nod, CTA → encourage); cử chỉ tư thế chỉ ở khoảng lặng (rig tự xếp hàng khi đang nói).
- Đồng hồ giả: mỗi khung `clock.runFor(1000/30)` → canvas → PNG có alpha → `rig.webm` (VP9 yuva420p) + `rig.frames.json` (hình miệng, tư thế, cảm xúc mỗi khung). Tất định: chạy lại = cùng sha.
- `build.py`: host có clip `rig` → một đoạn liền cả video (không cắt ghép, một phong cách host/tập); bố cục/khung hình giữ nguyên.
- Cổng mới `lipsync_rig` (qc.py): mọi mốc Rhubarb ≥ 50 ms hiện đúng hình trong ±33 ms; im lặng > 0,35 s → miệng X; không khung nào có tư thế che miệng khi đang nói. Cổng `mouth` cũ giữ cho bank registry (không bỏ).
- Hết hold `teach-video` trong `ci-backlog.json` chỉ khi pilot rig xanh mọi cổng + contact sheet sạch (chủ 3/11: tự duyệt).

## 2. Khối `publish` (viết lúc sản xuất, không ghép mẫu)
- `gen.py` → `publish.py`: `title` ≤ 60 = câu hook/điểm học của chính kịch bản (cắt ở ranh giới cụm, không cụt), `keyword`, `value`, `hashtags` 3–5 theo khu vực app + CEFR; `platforms`: `youtube {title, description (điểm học + deep link đúng tính năng + chương), tags}`, `facebook {text}`, `instagram {caption, hashtags ≤ 5}`, `tiktok {caption ≤ 150}`.
- Hợp lệ theo `scripts/cine/publish_meta.validate` (#587) + luật nền tảng; cổng `publish_meta` trong preqc (`publish.py --check`). **Không kết nối kênh, không đăng/lên lịch** (chủ 4/11).

## 3. Dọn video rác
- `scripts/video/junk.py`: manifest (đường dẫn, byte, sha, lý do: hỏng · trùng sha · trượt QC · không tham chiếu) → cách ly (`restore.json`) → xoá hẳn chỉ khi ≥ 7 ngày, grep chứng minh không tham chiếu và có bản sao/sổ. Bảo vệ footage bank (Mei/Kai/Daniel, registry). Artifact CI rác: `video-junk.yml` (mặc định dry-run). Chi tiết: `docs/VIDEO-STORAGE.md` § Dọn video rác.

## Task
- [ ] rig_host + build/qc + workflow (chồng #669; gộp sau #669)
- [ ] publish.py + eps + cổng preqc
- [ ] junk.py + video-junk.yml + test
- [ ] pilot 4 tập (usuk, verbs, stress, review) × short/wide trên CI → ≥ 90, contact sheet → bỏ hold, lô qua ci-filler
- [ ] Sau: 1:1 cho feed, cắt 15–30 s hook 1,5 s từ tập 16:9; gesture bank Kling (cần duyệt credit)
