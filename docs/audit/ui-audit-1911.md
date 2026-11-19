# Rà soát giao diện 19/11 (ngoài luồng bài học)

Nguồn: workflow `ui-audit-shots` (PR #1626) – 45 màn + 3 trạng thái × 375/1440 × sáng/tối, en. Số đo: `metrics.json` của artifact.
Lưu ý môi trường: CI chạy offline (`noProd`) nên gói nội dung dịch không tải được (grammar bài `ed-s-endings` hiện tiếng Việt), Turnstile báo "Invalid sitekey" ở Contact, tra từ không có thật hiện khung chờ – đây là hiện vật của CI, KHÔNG phải lỗi người dùng.

| Màn | Lỗi | Mức | Sửa |
|---|---|---|---|
| #/streak | "Mốc tiếp theo: N ngày" lặp 2 lần (thẻ tuần + thẻ rương rỗng) | TB | Đã sửa: thẻ rương chỉ hiện khi có rương (+ test retention) |
| Mọi màn trong (375) | Ô tra từ thanh trên cắt "Look…" (placeholder bị cắt) | Thấp | Ghi nhận; cần khoá ngắn mới ở 15 ngôn ngữ |
| Vocab hub | Hai ô tra từ chồng (thanh trên + ô trong trang) | Thấp | Ghi nhận (bố cục Stitch) |
| Goal | "Next mock test: 12/3/2…" bị cắt ngày | Thấp | Ghi nhận |
| Speaking | Chip "Short questions… answer in 2–3 sent" bị cắt | Thấp | Ghi nhận |
| Pron | CTA "Keep learning" nổi che hàng cuối lưới | Thấp | Ghi nhận |
| Desktop | Nhiều màn có cột nội dung 700–760 px giữa vùng 1080 px | Thấp | Theo spec Stitch, giữ |
| Còn lại (home, vocab, skills, tests, me, path, day, review, practice, dict, deck, library, grammar, courses, call, roleplay, say, pron, listening, reading, write, paraphrase, cbt, qstats, quick, stats, league, goal, settings, mistakes, toeic, toefl, resources, placement, 404, toast, modal; sáng+tối) | Không thấy lỗi bố cục/tương phản/trống/lặp ở mức cao–trung bình | – | – |

Mức cao: không có.
