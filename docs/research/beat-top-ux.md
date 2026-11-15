# Vượt top 1 về trải nghiệm: đo bản live + bảng khoảng cách (15/11/2026)

> TL;DR: Đo bản live lexkite.com (Playwright trên CI, `?sandbox=1`, không tài khoản thật) cho thấy phản hồi trả lời và giá trị đầu đã tốt; khoảng cách thật nằm ở số chạm tới giá trị (8–9 chạm lần đầu, 2 chạm quay lại), dịch chuyển bố cục (CLS 0,19–0,39 ở desktop trên Ôn tập/Phát âm) và LCP máy yếu 6,7 s. 5 P0 xếp theo bằng chứng, mỗi cái 1 PR.
> Đọc khi: chọn việc nâng trải nghiệm, trước khi mở PR onboarding / Hôm nay→bài / hiệu năng cảm nhận.

**Nguồn số đo.** (a) `scripts/ux/ux-measure.mjs` (workflow `ux-measure.yml`, run 43724514544, kết quả `beat-top-ux.metrics.json`; ảnh 390/1280 × sáng/tối ở artifact `ux-out`); (b) đi tay bài học trên live; (c) số có sẵn: `reports/world/probe.json`, `content/pipeline/WORLD.md`. Điểm đối thủ = ƯỚC LƯỢNG từ tính năng công khai của họ (không dùng tài khoản thật), ghi là ước lượng; điểm của mình là từ số đo. Giới hạn: bước bài học của script lượt 1 lỗi selector (đã sửa tay ở (b)); chấm phát âm cần mic thật nên chưa đo tự động; thông báo hệ điều hành không đo được trên CI.

## Số đo (live, lần đầu, sandbox)
| Chỉ số | 390 sáng | 390 tối | 1280 sáng | 1280 tối |
|---|---|---|---|---|
| Màn đầu (Welcome) hiện | 1,2 s | 0,5 s | 0,35 s | 0,34 s |
| Mở → Ngày 1 (onboarding) | 5,4 s · 8 chạm | 4,6 s · 8 | 4,6 s · 8 | 4,6 s · 8 |
| CLS cao nhất (Ôn tập → Phát âm) | 0,087 | 0,020 | **0,196** | **0,390** |
| TBT tích luỹ | 407 ms | 37 ms | 97 ms | 98 ms |
| INP | 32 ms | 24 ms | 40 ms | 40 ms |

Thêm: lần đầu → câu đúng đầu tiên 5,7 s · 9 chạm (Pixel 7); Hôm nay → bài 2 chạm; LCP máy yếu 6,76 s; khung 371/374 KB gz; 17/69 màn đã Stitch. Phản hồi trả lời đúng/sai: bảng đáy "Well done!/Not quite" có từ, IPA, nghĩa, ví dụ, "Explanation", Continue (Enter) – ngang Duolingo, hơn Memrise.

## Bảng khoảng cách (0–10; ưu tiên P0/P1/P2)
| # | Điểm trải nghiệm | Mình | Tốt nhất (ước lượng) | Ưu | Cách vượt, vẫn 100 % miễn phí, không phiền |
|---|---|---|---|---|---|
| 1 | Lần đầu → giá trị đầu (số chạm) | 5 (8–9 chạm, 5,7 s) | 8 – Duolingo/Speak: vào bài thử trước, hỏi mục tiêu sau | **P0** | Bắt đầu → câu hỏi thật ngay (1–2 chạm), mục tiêu/trình độ hỏi sau chiến thắng đầu, mặc định chọn sẵn; không ép đăng ký |
| 2 | Hôm nay → vào bài (người quay lại) | 6 (2 chạm, 2 màn lặp CTA "Start Day 1") | 9 – Duolingo: 1 chạm | **P0** | CTA Hôm nay vào thẳng bước kế (bỏ trang Day trung gian), chỉ báo "tiếp tục từ câu 3" |
| 3 | Ổn định bố cục (CLS) | 6 (0,19–0,39 desktop Ôn tập/Phát âm) | 9 – app lớn CLS < 0,05 | **P0** | Giữ chỗ cho khối vẽ trễ (thanh CTA dưới, lưới âm, thẻ), kèm test CLS theo route trong CI |
| 4 | Tải cảm nhận máy yếu (LCP) | 4 (6,76 s mobile-qa; khung 371/374 KB) | 8 – Duolingo web ~2–3 s trên 4G | **P0** | Cắt phần nạp ngay khỏi khung (lazy), skeleton Stitch, ưu tiên font/ảnh LCP; không nới ngưỡng |
| 5 | Màn xong bài: thưởng + chuỗi + bước kế | ? (chưa đo; thanh tiến độ "0/6 words" ít đổi trong lúc học) | 9 – Duolingo: thanh đầy, XP, chuỗi, ăn mừng | **P0 (chờ số đo vòng 2)** | Đo vòng 2, rồi: thanh tiến độ thật, ăn mừng nhẹ, 1 nút "bài kế", không tim/ép |
| 6 | Phản hồi trả lời trong bài | 8 | 8 – Duolingo | P2 | Giữ; thêm "vì sao" cho 15 ngôn ngữ (hiện 25/100) |
| 7 | Chấm phát âm theo âm vị | 6 (thư viện 62 âm, Next sound) | 9 – ELSA: chấm từng âm + mẹo miệng | P1 | Chạm từ sai → nghe mẫu + so sóng, tiến độ theo âm; chủ sở hữu Pron là stitch-cover |
| 8 | Nhắc học: quyền, tần suất, giờ yên | 8 (≤1/ngày, giờ yên lặng, hỏi sau giá trị, spec đủ) | 7 – Duolingo thúc ép hơn | P2 | Giữ; đo thời điểm hỏi quyền bằng thiết bị thật |
| 9 | Chuỗi ngày & đóng băng | 8 | 9 – Duolingo | P1 | Màn chuỗi sau bài rõ hơn (chung với #5) |
| 10 | Nhất quán hình (Stitch) | 4 (17/69 màn) | – | P1 | stitch-cover đang làm |
| 11 | Giá & quảng cáo | 10 (miễn phí, không tim, không quảng cáo trong bài) | 5 – app lớn gate bằng gói trả phí | – | Giữ lợi thế |

## 5 P0 và thứ tự làm
1. **P0-1 Lần đầu ngắn** (onboarding; mẫu Stitch qua stitch-cover nếu đổi màn chung).
2. **P0-2 Hôm nay → bài 1 chạm** (không đụng màn Day của stitch-cover; chỉ đích của CTA Hôm nay, báo trước).
3. **P0-3 CLS** (tìm gốc: sidebar/thanh đáy/lưới; test CLS theo route; phần Pron báo stitch-cover).
4. **P0-4 LCP máy yếu** (cắt khỏi khung nạp ngay; không nới ngưỡng).
5. **P0-5 Màn xong bài + chuỗi** sau khi có số đo vòng 2 (script sửa selector bước bài học).

Mỗi PR: mẫu Stitch trước (nếu có đổi bố cục), port, test, chấm độc lập ≥ 90, 1 PR mở mỗi lúc, chỉ gộp khi `required-gate` xanh.
