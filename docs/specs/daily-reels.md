# Reels hằng ngày tự động (spec 1 trang – 12/11/2026, chờ duyệt)
> TL;DR: Reels hằng ngày tự động cho mọi page/kênh: 6 định dạng từ template Teach2D có sẵn, chọn chủ đề → dựng → QC → lịch → số liệu, 0 credit, chạy trên CI.
> Đọc khi: thêm template reels, đổi lịch đăng hằng ngày, kéo số liệu reels.

**Mục tiêu (chủ 12/11):** mỗi page/kênh nhận ≥1–2 reel/ngày, lịch xếp trước ≥30 ngày, tự duyệt + tự đăng, 0 credit Kling, mọi việc nặng chạy trên CI. Đo số liệu và tuần sau ưu tiên định dạng thắng.

## Dùng lại, không dựng engine mới
Teach2D (`build.py` + Remotion), giọng Kokoro, Ama/Carlos 2D, `mix.py` (đa dạng không lặp), `qc.py` ≥90, `autopub_gate.py`, `store.py`, `publish_meta`, `native-qa.mjs` (L1), định tuyến `_distribution.js` (`schedule`: 09–21h, cap 2/ngày, `PLAN_DAYS`=120).

## 6 định dạng = 6 template có sẵn (chỉ thêm dữ liệu/biến thể, không viết tay từng clip)
| Định dạng chủ | Template/nguồn | Việc thêm |
|---|---|---|
| Từ của ngày | `review` + ảnh vocab (`img.json`) | biến thể "từ + ảnh + ví dụ", hook ≤1 giây |
| Lỗi hay gặp ✗→✓ | `mistake` + `l1` (nội dung CQ1) | nối kho CQ1 vào `gen.py` |
| Quiz 3 giây | quiz 3-2-1 có sẵn trong mọi template | template `quiz3`: câu hỏi ngay frame 0, đếm ngược, đáp án |
| Phát âm đúng/sai | `stress` | biến thể ✗/✓ nghe 2 lần |
| Cụm người bản xứ | `native`, `phrasal` | không đổi, tăng hàng dữ liệu |
| Động từ bất quy tắc | `verbs` (`#/verb/<base>`) | bảng `#/irregular` làm nguồn hàng |
9:16, 15–30 giây, hook trong 1 giây (qc gate hiện: nói trước 2,2 s – siết xuống 1 s cho `quiz3`), CTA app/lexkite.com, phụ đề bản địa theo `cfg.lang` của page (đường L1 đã có).

## Dây chuyền
1. **Chọn chủ đề** `scripts/video/teach2d/daily.py`: mỗi ngày × mỗi page chọn định dạng theo trọng số (mặc định đều; tuần sau theo điểm thắng) và hàng dữ liệu chưa dùng; ghi `eps` (gen.py sinh lại giống hệt).
2. **Dựng + QC** `teach-video.yml` (shards, busy-gate giữ nguyên) → ≥90 + metadata lúc dựng → `autopub_gate` → `store.py`.
3. **Lên lịch** hàng đợi → `schedule` (≥30 ngày; ≤2 bài/ngày/kênh; FB/IG/YT/TikTok chỉ kênh đã nối GrabCast).
4. **Số liệu**: workflow hằng ngày kéo view/hoàn thành/click của bài đã đăng (nguồn GrabCast/API nền tảng nếu có; thiếu thì báo bước chủ cần bấm) → `soc_meta`/bảng điểm theo template.
5. **Vòng thắng**: mỗi tuần `daily.py` đổi trọng số lên định dạng top (giữ sàn 10% mỗi định dạng để không chết dần).

## Công suất cần đo trước khi cam kết
~20 page × 1–2 reel × 30 ngày ≈ 600–1200 clip/tháng. Cần số clip render được/ngày trên CI (busy-gate) và số hàng dữ liệu chưa dùng mỗi định dạng. Thiếu hàng → thêm hàng, không giảm ngưỡng QC.

## Cổng & rủi ro
Không cắt QC/test; i18n 15 ngôn ngữ cho chuỗi mới; nhìn mẫu mỗi template mới (duyệt hình theo điều phối); tách kênh: reel social ≠ clip bài học (role `social`/`embed`).

## Lô đầu
PR 1 `daily.py` + `quiz3` + trọng số; PR 2 kéo số liệu; sau đó lô đầu ≥7 ngày × mọi page lên lịch, báo số reel + link mẫu.
