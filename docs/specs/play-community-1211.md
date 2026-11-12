# Chơi + Cộng đồng: đối chuẩn & thứ tự làm (12/11/2026)

> TL;DR: Lexkite đã có lõi chơi (Blitz 60 s, Ghép thẻ, giải tuần, lớp, backend cộng đồng + kiểm duyệt) nhưng **chưa có vòng xã hội nào chạm tới người học thường** (bạn bè, đấu, nhiệm vụ chung). Làm theo thứ tự: ① Đấu bóng ma 60 s → ② Bộ mini-game nối SRS + thử thách ngày → ③ Bạn bè + nhiệm vụ bạn → ④ Game "sửa lỗi" từ sổ lỗi → ⑤ Kho bộ thẻ chia sẻ → ⑥ Sửa bài cộng đồng. Tất cả $0 (D1 + Pages Functions; không Durable Object cho tới khi cần thời gian thực). Sở hữu: #11 (đấu) và #12 (cộng đồng) của [upgrade-2026-11.md](upgrade-2026-11.md); chi tiết an toàn giữ ở [community.md](community.md), game ở [play-learn.md](play-learn.md).

## 1. Đối chuẩn (cái đáng lấy / cái bỏ)
| App | Lấy | Bỏ |
|---|---|---|
| Duolingo | giải tuần, **Friend Streak** + **Friend Quest** (nhiệm vụ đôi), nhiệm vụ ngày, ăn mừng + rung, Adventures | tim/mạng, ép mua, thông báo tội lỗi |
| Quizlet | Match tính giờ, Live (đội), chia sẻ/nhân bản bộ thẻ, kho công khai | Blast (học ít) |
| Kahoot | thanh giờ + điểm tốc độ, bục vinh danh, mã vào nhanh | áp lực công khai |
| Memrise | Speed Review, từ khó, clip bản ngữ | – |
| ELSA | chấm tức thì, mục tiêu ngày | paywall |
| Busuu | **cộng đồng chữa bài viết/nói** (người bản ngữ), bạn học | chờ người thật lâu, chấm không đều |
| HelloTalk | bạn trao đổi ngôn ngữ, sửa câu trực tiếp | tin riêng/lạ (quấy rối, lừa đảo), lộ thông tin |

Cách mình hơn: đấu & thử thách **không cần cùng lúc** (bóng ma), mọi trò ăn từ **thẻ đến hạn + sổ lỗi của chính người học**, sửa bài **AI trước, người sau**, 0 tin riêng với người lạ, 0 dữ liệu cá nhân công khai, 15 ngôn ngữ, miễn phí hết.

## 2. Đã có (main 82738b60f)
Blitz 60 s + link thách `?ch=` không máy chủ (`cpack/play-app/play-blitz.js`, `pgames`) · Ghép thẻ/Điền chữ (`study-games.js`) · `Sfx`/rung/combo (`game.js`) · giải tuần 6 hạng opt-in, biệt danh (`league.js`, `api/league.js`) · lớp + giao bộ (`classroom.js`, `api/class.js`) · backend cộng đồng đợt 1: hồ sơ/nhóm tuổi/chặn/báo cáo/lọc nội dung/hàng duyệt (`api/community.js`, `_cm.js`; **chưa có UI**) · sổ lỗi `logMistake` (#1125 đang làm) · roleplay (backlog-features).
**Thiếu**: bạn bè/theo dõi · đấu 1v1 · nhiệm vụ ngày/bạn · mini-game thứ 2+ (M2 chưa code) · kho/chia sẻ bộ thẻ · sửa bài cộng đồng · mọi UI cộng đồng.

## 3. Khoảng trống xếp theo giữ chân ($0 cho tất cả)
| # | Hạng mục | Tác động | Công | Ghi chú thiết kế |
|---|---|---|---|---|
| 1 | **Đấu bóng ma 60 s** (#11): chạy Blitz, đối thủ = lượt đã ghi của bạn/người cùng hạng giải tuần gần trình; thắng/thua nhẹ nhàng, "gỡ" 1 chạm | D7 ↑↑, D30 ↑ (lý do quay lại: "xem bạn có bị vượt không") | M | D1 `duel_run(uid, day, seed, score, trace)`; chống gian lận: server tính lại điểm từ trace ≤ trần; không thời gian thực → $0 |
| 2 | **Bộ mini-game nối SRS** (Ghép tốc độ, Gõ chữ thiếu, Nghe liên hoàn, Câu thật) + **Thử thách ngày** (1 bộ/ngày chung, xếp hạng bạn) | D1 ↑↑, D7 ↑ | M mỗi trò | lõi `PlayBlitz.core`; ≤15 KB gz/trò, lười; combo/rung/ăn mừng đã có |
| 3 | **Bạn bè + theo dõi + Nhiệm vụ bạn + chuỗi đôi** | D7 ↑↑, D30 ↑↑ (mạnh nhất theo dữ liệu Duolingo) | L | kết bạn 2 chiều, mã/QR/link (bảng `cm_friend`, `cm_invite` đã spec); chỉ biệt danh; 13–17 chỉ cùng nhóm tuổi |
| 4 | **Game "Sửa lỗi"** từ sổ lỗi (biến thể, FSRS hẹn ngày) | D7 ↑, kết quả học thật | S (sau #1125) | dùng chung lõi trò #2 |
| 5 | **Kho bộ thẻ chia sẻ**: đăng/like/nhân bản, danh mục, kiểm duyệt (báo cáo + AI lọc) | D30 ↑, SEO/tăng trưởng ↑ | M | `cm_deck`; chỉ nội dung chữ; lọc `checkText`; 2 báo cáo → tự ẩn |
| 6 | **Sửa bài cộng đồng** (viết/nói): AI sửa ngay, bạn đọc cùng nhóm góp ý có cấu trúc (chọn lỗi + gợi ý), không bình luận tự do | D30 ↑, đúng mục tiêu nói/viết | L | chỉ bài người đăng cho nhóm bạn/phòng; không tin riêng; huy hiệu "người sửa hay" |
| 7 | Phòng chat/nói WebRTC (community.md đợt 3–5) | D30 ↑ nhưng rủi ro an toàn/chi phí cao | XL | hoãn tới khi 1–6 xong + soát an toàn |

## 4. Đo (mỗi PR, sau 14 ngày): D1/D7/D30 người dùng chạm tính năng vs. đối chứng; số lượt chơi/ngày; tỉ lệ báo cáo/1000 lượt (mục tiêu < 1); 0 PII lộ.

## 5. Luật chung
Stitch Lexkite Kit + 2D Ama/Carlos; sáng/tối, 360–390 px, nút ≥44 px; 15 ngôn ngữ (`i18n-missing`+`i18n-qa` strict); code lười, shell không tăng; thông báo theo notifications-ux (mặc định chỉ trong app, trần 1 push/ngày, giờ yên, không câu ép); 0 tim/mạng; không cắt tính năng/test/ngưỡng; mỗi PR có test + e2e và đủ cổng CI trước khi tự gộp.

## 🥁 Nhịp điệu (game 1/4 của chuỗi mini-game 12/11)
Chạm đúng nhịp NHẤN của câu tiếng Anh: từ nhấn (từ nội dung) → chạm đúng lúc; từ yếu (a, the, to…) → để im. Luyện nhịp "stress-timed" – kỹ năng nói thật, luật nhấn lấy từ `PronCoach.plan` (không chép lại).
Câu = ví dụ của từ đến hạn/yếu (SRS thật) → 12 câu mẫu; 5 câu, nhịp 700→560 ms. Chấm: ±90 ms = Chuẩn (20), ±240 ms = Tốt (10), combo ×1/×2/×3 như Blitz; chạm nhầm từ yếu/ngoài nhịp = trừ độ chính xác + reset combo.
SRS: chỉ thẻ đến hạn, chỉ khi chạm đúng từ đích và cả câu ≥ 90 % và không chạm thừa → Good qua `SRS.review`; lỡ/sai KHÔNG phạt. Lazy `cpack/play-app/play-rhythm.js` (pgames, ngoài khung), âm Web Audio lên lịch theo đồng hồ âm thanh, nút tắt âm, phím Space, ký hiệu ✓✓/✓/✗/! (không chỉ màu), tab ẩn → làm lại câu. Giới hạn đã biết: bài dựa vào thị giác (từ nhấn hiện bằng chữ đậm/●, tích-tắc đều) nên người khiếm thị chưa chơi được; kết quả từng từ được đọc ở cuối câu.
Stitch (project "Lexkite Games" 3076699522281938084): gameplay sáng 83338e27…, kết quả sáng f02d3416…, gameplay tối 9439bedb…, kết quả tối 1bf02f7a….
