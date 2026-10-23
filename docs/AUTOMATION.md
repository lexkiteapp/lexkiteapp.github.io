# AUTOMATION – quy trình tự động A→Z (video học + phân phối) – chủ 22/10/2026

Một đường ống, chạy trên GitHub Actions + Cloudflare (0 đồng), mỗi bước có cổng QC (`docs/VIDEO-QC.md`). Người chỉ chạm ở **2 điểm duyệt** (đánh dấu 👤).

| # | Bước | Kích hoạt | Đầu ra | Cổng / chặn |
|---|---|---|---|---|
| 1 | Chọn điểm học | cron hằng ngày | điểm học mới từ lexicon × tình huống × kỳ thi (VIDEO-SCALE-PLAN §7) | không trùng mãi mãi; trộn độ khó 40/40/20 |
| 2 | Soạn kịch bản | sau 1 | script + hook + "Teacher's tip" + câu đố | AI judge: đúng, dễ hiểu ≤ B1, ✗/✓ đúng, trung tính văn hoá |
| 3 | Chọn tổ hợp | sau 2 | template, nền (1 địa điểm), người dẫn/trang phục/clip, kiểu quay, màu, hook | sổ đa dạng 7 trục + chữ ký dựng ≠ 30 clip gần nhất; bối cảnh có zones |
| 4 | Giọng + timing | sau 3 | TTS (IPA Mỹ), word timings | LUFS, ASR khớp kịch bản |
| 5 | Dựng | sau 4 | master 1080×1920 + công thức (recipe) | — |
| 6 | QC sau dựng | sau 5 | `qc/<id>.json`, điểm /100 | qc-gate (mọi cổng); trượt → đổi tổ hợp ≤ 2 lần → bỏ + ghi sổ |
| 7 | Lưu trữ | đạt 6 | master + bìa lên Kho Drive (cân bằng), công thức lên repo | 1 bản (chưa duyệt, 30 ngày) / 2 bản (đã duyệt) |
| 8 | 👤 Duyệt | chủ (từng clip / hàng loạt) | trạng thái Approved | cổng duyệt (template mới: mẫu + báo cáo trước) |
| 9 | Định tuyến | sau 8 | kênh **Nhúng** (web/app) + kênh **Social** theo luật (loại, chủ đề, vùng) | giới hạn/ngày, khoảng cách, khung giờ, chống spam |
| 10 | Gói đăng + metadata | sau 9 | tiêu đề/mô tả/tag tối ưu từng nền tảng, mã `lk:` | SEO score; không trùng tiêu đề/bìa trong kênh |
| 11 | Đăng | lịch | YouTube: tay (Studio) cho tới khi API được duyệt → tự động; FB/IG/TikTok/Threads qua GrabCast API | 👤 chỉ cú bấm tải YouTube khi chưa kiểm định |
| 12 | Đồng bộ | cron 30 phút | youtube_id/link bài → manifest web, trạng thái từng kênh | sai kênh/riêng tư/xoá → cảnh báo + dự phòng tự lưu |
| 13 | Nhúng bài học | sau 12 | video vào thẻ từ, ngữ pháp, lộ trình, blog (facade nhẹ) | E2E web/app; 0 byte YouTube trước khi bấm |
| 14 | Đo & học lại | hằng ngày | lượt xem, xem hết, lưu, chia sẻ, câu đố đúng | trọng số template/hook/độ khó/kênh cho vòng sau |
| 15 | Giám sát | liên tục | báo cáo hằng ngày (email 8h + Quản trị › QC/Video/Social) | lỗi CI, kênh bị hạn chế, Drive ≥ 80 %, quota → cảnh báo |

**Nguyên tắc**: chạy lại không tạo trùng (idempotent, có resume); mọi khoá ở máy chủ; mọi bước ghi sổ; credit Kling KHÔNG nằm trong đường ống tự động (kho footage làm riêng, theo CREDIT-RULES); không bật tự động cho template chưa được chủ duyệt.

## Triển khai tin ngắn (news) – 23/10/2026
- Bước 1–3: `news-auto.yml` → `scripts/cine/news_auto.py pick` (sổ `lexkite-shorts:ledger/news.json`, đa dạng chủ đề/hook, thử lại ≤ 2 lần với nền khác) → `materialize` (`bank2news.py`, tất định).
- Bước 4–7: `cine-render.yml` (gọi bằng `workflow_call`, scene=news): giọng → cổng AI (Workers AI → Gemini kho khoá → bỏ qua trung tính, `ai_gate.py`) → dựng (seed theo bài) → `qa_news` (+ layout QA, trễ giọng/phụ đề ≤ 80 ms) → `qc_gate` → `store_shorts` + kho Drive (1 bản tới khi duyệt).
- Bước 8: hàng "Chờ duyệt" (Quản trị › Video); `news_auto.py record` ghi sổ (mỗi run 1 lần). Lịch 08:53 UTC KHÔNG làm gì cho tới khi có tệp `content/video/cine/news/AUTO_APPROVED` (chủ duyệt mẫu). Không tự đăng.
- Giám sát: artifact `video-summary-*` → bản tin ngày `scripts/ci/triage.mjs` (dựng/đạt/trượt theo cổng/chờ duyệt). Thử E2E: `video-e2e.yml` chạy ở mọi PR chạm `scripts/cine/**` hay workflow video (AI giả lập, dựng mẫu).
- Bền: mọi gọi ngoài có timeout; `fetch.mjs` quá 15 phút → git sparse; kiểm dung lượng đĩa ≥ 8 GB trước khi dựng; sổ việc `infra/jobs.json` (lease `news-auto`).
