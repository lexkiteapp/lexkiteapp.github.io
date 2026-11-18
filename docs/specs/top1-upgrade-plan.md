# Kế hoạch nâng cấp lên top 1 – bằng chứng kiểm toán 18/11/2026

> TL;DR: Kiểm toán CI 10 bộ (main 3ac6bb2 + live) cho thấy nền tảng sạch (0 tràn, 0 tương phản, FPS 60, INP ≤112 ms, 15 ngôn ngữ đi hết hành trình) nên khoảng cách tới Duolingo/Speak/ELSA/Cake nằm ở **số chạm tới giá trị, hiệu năng màn sâu, nhất quán Stitch, gamification và chấm phát âm**. 6 P0 sửa trong 1 PR; 12 mục UI/UX, 7 nội dung, 8 tính năng, mỗi mục có thước đo. Số liệu và ảnh: `reports/top1-audit/2026-11-18.md`.
> Đọc khi: chọn việc nâng chất lượng tiếp theo; trước khi vẽ màn Stitch mới; trước khi mở PR UX/retention.

Luật chung: $0, chỉ CI, không cắt tính năng/nội dung/test/ngưỡng, mọi màn có nút thoát, thông báo không làm phiền, 1 PR mở/đợt (WIP đóng băng). Trùng ý đã có thì **nối vào** [research/beat-top-ux.md](../research/beat-top-ux.md), [COMPETITOR-UPLIFT.md](../COMPETITOR-UPLIFT.md), [upgrade-audit.md](upgrade-audit.md), không làm lại.

Thước đo chung (đo bằng `ux-measure`, `/api/hit`, `ret:*` events): **TTFL** = thời gian tới bài đầu (mục tiêu ≤ 60 s, hiện ~5 s tới Ngày 1 nhưng 8 chạm); **chạm-tới-câu-đầu** (≤ 3); **tỉ lệ xong bài**; **D1/D7**; **NPS** (hỏi 1 lần sau bài thứ 5, không chặn). Mốc hiện tại D1/D7/NPS chưa có số trong báo cáo → bước 0 là bật đo (mục F1).

## 1. So với Duolingo, Speak, ELSA, Cake theo hành trình
(Cột "họ" dựa trên hành vi công khai của app, ước lượng – không phải số nội bộ.)

| Hành trình | Họ làm gì | Mình hiện nay (bằng chứng) | Đề xuất + màn Stitch cần vẽ |
|---|---|---|---|
| Lần đầu mở (≤60 s) | Duolingo/Speak: vào bài thử ngay, hỏi mục tiêu sau; ~1–3 chạm tới câu đầu | Welcome 0,5–1,2 s, **8 chạm, 4,7 s** tới Ngày 1; bước "Hôm nay→bài" không vào (ux-measure) | "Câu hỏi đầu tiên" ngay sau Welcome (2 chạm), hỏi mục tiêu/trình độ sau bài 1. **Vẽ:** Welcome→câu thử, hỏi-mục-tiêu-muộn |
| Bài học | Duolingo: thanh tiến độ, phản hồi tức thì, nhạc đúng/sai, hạ độ khó khi sai | Phản hồi đúng/sai tốt (8/10); `#/lesson` 2 nút Skip lặp, nút Kiểm tra xám, LCP 6,6 s | Gộp Skip; nút chính luôn có màu; tải trước câu kế. **Vẽ:** thanh dưới bài học 1 hàng |
| Ôn tập | Duolingo Practice Hub; Anki lịch rõ | FSRS có, `#/review` perf 75, `select` 28 px, "Hôm nay" có 2 CTA lặp | 1 CTA "Ôn 8 thẻ · 2 phút"; chọn chế độ bằng chip ≥44 px. **Vẽ:** Review hub |
| Chuỗi & thông báo | Duolingo: chuỗi + đóng băng + nhắc ép; Speak ít ép | Nhắc ≤1/ngày, giờ yên, hỏi quyền sau giá trị (8/10, tốt hơn họ về "không phiền"); màn chuỗi sau bài chưa đo | Giữ luật; thêm màn "Chuỗi vừa tăng" có Ama/Carlos + cược 7 ngày (COMPETITOR-UPLIFT #1). **Vẽ:** Streak-up, Streak-at-risk |
| Gamification | Duolingo: giải đấu, nhiệm vụ, kho đá quý, huy hiệu, ăn mừng | `league.js`, `game.js` có; ăn mừng cuối bài chưa đo; độ đẹp Stitch 17/69 màn | Màn ăn mừng cuối bài (XP đếm, chuỗi, mốc tiếp); đồng bộ giải đấu theo Stitch. **Vẽ:** Lesson-complete, League-promo |
| Nói / phát âm | ELSA: chấm âm vị + mẹo miệng + lộ trình lỗi; Speak: hội thoại AI liên tục; Cake: shadowing clip | Thư viện 62 âm, GOP, Call Ama/Carlos; nhân vật Call "clip-art", LCP Call 9,6 s | Chạm từ sai→nghe mẫu+so sóng+mẹo miệng; tiến độ theo âm; Call tải nhanh, bubble Stitch. **Vẽ:** Pron-word-detail, Call-lobby |
| Thi thử | ELSA/Speak ít; Duolingo English Test riêng | Mock, TOEIC, IELTS, Cambridge có (lợi thế); nhãn Listening/Speaking **chưa dịch** (i18n 13/100) | Dịch đủ 15 ngôn ngữ; kết quả thi có "việc cần sửa tuần này". **Vẽ:** Mock-result |
| Hồ sơ & tiến độ | Duolingo: hồ sơ bạn bè, heatmap; ELSA: điểm tổng | `#/me` có, perf 81, LCP 5 s | Một "điểm tiến bộ" + heatmap ngày + mục tiêu 3–6 tháng (outcomes spec). **Vẽ:** Me-progress |
| Chia sẻ | Duolingo: thẻ chuỗi/Year in Review; Cake: clip | Chưa có thẻ chia sẻ từ app (viral plan: score card trước) | Thẻ điểm/chuỗi 1 chạm, ảnh tự dựng. **Vẽ:** Share-card (1:1 và 9:16) |

## 2. UI/UX

| # | Mục (P) | Vấn đề · bằng chứng | Giải pháp | Đo | Lớn · thứ tự |
|---|---|---|---|---|---|
| U1 | **P0** Chạm ≥44 px | Audit tổng chạm 87,5; `a.small` 18 px, `qe-n` 32 px, `select` 28 px, `summary` 23 px | Một lớp CSS dùng chung (vùng chạm vô hình 44 px) + test quét | Audit chạm ≥95; qa-bot `tap`=0 | S · 1 |
| U2 | **P0** Tràn/cắt `#/day/1`, ô không nhãn Dictation | bố cục 25 và 55 | Sửa icon cắt, aria-label + nhãn nhìn thấy, nút Next không rớt dòng | Audit bố cục ≥95 | S · 1 |
| U3 | **P0** Đường vào bài kẹt? (Hôm nay→bài, practice/test) | ux-measure 4-lesson `ok:false`; mqa timeout | Tái hiện bằng click thật; nếu thật: sửa điều hướng + thêm vào journey-matrix | Chạm tới bài ≤2, 0 lỗi | S–M · 1 |
| U4 | **P0** Lần đầu ≤3 chạm tới câu đầu | 8 chạm | Welcome→câu thử, hỏi mục tiêu muộn (beat-top-ux P0-1) | TTFL, chạm, hoàn thành bài 1 ≥ +10 % | M · 2 |
| U5 | P1 Màn sau bài (ăn mừng+chuỗi+bước kế) | chưa đo, điểm đẹp 82 | Màn Lesson-complete theo Stitch, haptic/âm tắt được, tôn trọng reduced-motion | Xong bài, D1 +3 % | M · 3 |
| U6 | P1 Nhất quán Stitch | 17/69 màn; AI-judge độ đẹp TB 72 | Phủ tiếp theo `stitch-v2-coverage-plan`; ưu tiên `/L/schools`, add-on tab mới, Call | Độ đẹp ≥85, stitch-diff xanh | L · 3 |
| U7 | P1 Thanh trên gọn, toast không đè | toast tối đè thanh tab (`#/day/1`, `#/cambridge`) | Toast trên thanh tab, 1 hàng icon | 0 "covered" | S · 2 |
| U8 | P1 Skip lặp, nút chính xám | `#/lesson` | Một Skip; nút chính luôn nhận diện | Nhấp nhầm ↓ | S · 2 |
| U9 | P1 Hiệu năng màn sâu | LCP review/dict/me 5–6,7 s (mqa) | Skeleton Stitch, tải trước dữ liệu màn kế, cắt JS khỏi khung đầu | LCP ≤ 3 s, perf ≥ 90 | M · 2 |
| U10 | P2 Bán kính/spacing Call | không đều | Token Stitch | Độ đẹp | S · 4 |
| U11 | P2 Loại `/human.html` khỏi Audit tổng, thử lại shard apt | nhiễu số liệu | Sửa danh sách + retry | Audit không nhiễu | S · 1 |
| U12 | P2 Phủ Back/Thoát 29/73 | chưa đo đủ | Mở rộng exit-sweep | 73/73 | S · 4 |

## 3. Nội dung

| # | Mục (P) | Vấn đề · bằng chứng | Giải pháp | Đo | Lớn · thứ tự |
|---|---|---|---|---|---|
| C1 | **P0** Nhãn kỹ năng chưa dịch | `cambridge.js:11`, `toefl.js:14`, `mock.js:145` | Bọc `t()` + khoá dịch 15 ngôn ngữ, test "không còn chữ Anh trần" | i18n audit ≥95 | S · 1 |
| C2 | P1 Giải thích "vì sao" 15 ngôn ngữ | 25/100 (beat-top-ux) | Mở rộng theo hàng loạt Sonnet + judge | ≥70/100 | M · 3 |
| C3 | P1 Phủ i18n đo 137/202 | nhiều mục chưa đo | Mở rộng đầu dò | 202/202 | S · 3 |
| C4 | P1 Lộ trình 3–6 tháng nói+viết có số đo | outcomes spec | Bài kiểm tháng, báo cáo tiến bộ | Điểm tháng ↑ | L · 4 |
| C5 | P1 Tây Ban Nha live, Pháp đang làm | – | Tiếp tục lộ trình đã duyệt; cùng chuẩn Stitch | Tỉ lệ xong khoá | L · theo kế hoạch |
| C6 | P2 Mật độ ví dụ B2+ | upgrade-audit | Tăng qua Content QA | Điểm nội dung ≥95 | M · 5 |
| C7 | P2 Clip giáo viên có phụ đề mặc định | upgrade-audit | Bật mặc định | a11y | S · 5 |

## 4. Tính năng

| # | Mục (P) | Vấn đề · bằng chứng | Giải pháp | Đo | Lớn · thứ tự |
|---|---|---|---|---|---|
| F1 | **P0** Đo D1/D7/xong bài/NPS | báo cáo chưa có số nền | Sự kiện `ret:*` + bảng funnel-digest + NPS 1 lần sau bài 5 | Có số nền trong 7 ngày | S · 1 |
| F2 | P1 Cược chuỗi 7 ngày + ngày nghỉ cuối tuần | COMPETITOR-UPLIFT #1 | Theo spec đó; Ama/Carlos chúc mừng | D7 +5 % | M · 3 |
| F3 | P1 Chấm âm vị + so sóng + mẹo miệng | `pron/` có, UX thiếu | Màn chi tiết từ sai | Điểm âm tăng sau 2 tuần | M–L · 3 |
| F4 | P1 Thẻ chia sẻ điểm/chuỗi | chưa có | Ảnh tự dựng 1:1, 9:16, 1 chạm | Lượt chia sẻ/DAU, lượt cài từ link | M · 3 |
| F5 | P1 Huy hiệu "vừa sức ~96 %" | COMPETITOR-UPLIFT #2 | hàm `coverage()` + chip | Xong bài ≥ +10 % | M · 4 |
| F6 | P2 Hội thoại Call nhanh | LCP Call 9,6 s | Tải lười, bubble Stitch | LCP ≤ 4 s | M · 4 |
| F7 | P2 Add-on YouTube song ngữ/tự dừng | COMPETITOR-UPLIFT #3 | theo spec | Từ lưu/giờ xem | M · 5 |
| F8 | P2 Year-in-review | – | Dựng cuối năm từ dữ liệu có sẵn | Chia sẻ | M · 5 |

## Thứ tự
1. **PR P0** (U1, U2, U3 nếu tái hiện được, C1, U11, F1 phần đo) – 1 PR, test chặn tái phát (đếm chữ Anh trần, quét tap ≥44, đầu dò bố cục `#/day/1`).
2. U4, U7, U8, U9 (đường vào + hiệu năng).
3. U5, U6, F2–F4, C2–C3 (cảm giác app lớn).
4. C4–C6, F5–F6.
5. P2.

Sau mỗi bước chạy lại `top1-audit` bằng cách dispatch các workflow ở bảng trong báo cáo và so điểm Audit tổng (TB 90,8; i18n 90,2; chạm 87,5; hiệu năng 76,3; độ đẹp 72,2 là mốc nền).
