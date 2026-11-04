# Nâng cấp toàn diện 11/2026 – spec-lite (04/11)

> TL;DR: 12 hạng mục chủ gửi 04/11, đối chiếu main b8c233cd5. 1 đã có, 8 có một phần, 3 chưa có. Làm 3 đợt; mỗi lát = 1 PR có tiêu chí xong + cổng. Chỉ mở lát mới khi PR mở ≤15 ([finish-before-start]). Toàn bộ $0, nhẹ, không cắt gì đang có.

Nguồn thiết kế: Home = [home-upgrade.md](home-upgrade.md); cộng đồng = [community.md](community.md); thông báo = [notifications.md](notifications.md); nhân vật = [CHARACTERS.md](../CHARACTERS.md). Spec này chỉ nối và thêm phần thiếu, không làm lại.

## Hiện trạng → việc còn thiếu
| # | Hạng mục | Main đang có | Thiếu (= việc) |
|---|---|---|---|
| 1 | Top bar gọn | header 56 px (`st/v2/today*.js`); chuỗi/XP là widget riêng (`StreakUI`, `st/common.js`) | 1 dải chuỗi·XP·mục tiêu; test CTA chính trong màn đầu ở 360×640 |
| 2 | Theo giờ + rung | rung: `native.js` → Capacitor Haptics, `game.js` `buzz` (tôn trọng tắt tiếng/reduced-motion); theme auto/sáng/tối | bảng rung theo sự kiện (đúng/sai/chuỗi); sắc thái sáng/trưa/tối CHỈ ở lời chào + điểm nhấn, giữ nền tối #10191B đã chốt |
| 3 | Linh vật có cảm xúc | `Chars` 9 tư thế, `teacher-slot.js` idle, `lesson/teacher.js` `POSE_EMO` | trạng thái cảm xúc trung tâm nối sự kiện app: lỡ chuỗi (an ủi, không trách), đứng yên ≥45 s gợi ý 1 lần/màn |
| 4 | % tiến độ trên thẻ | `path.js` `pct`, `st/home.js` progressbar, `courses.js` `pctOf` | đưa vào `st/v2/path.js` + thẻ bài Hôm nay |
| 5 | Nhập PDF/ePub/link/phụ đề → bộ thẻ | `anki.js` (txt/csv/tsv), `watch.js`, `api/ai.js` | toàn bộ: đọc tệp trên máy (pdf.js/epub tải lười), trích từ+cấu trúc bằng AI pool miễn phí, tạo bộ FSRS riêng, ≤N lệnh AI/ngày |
| 6 | Add-on + Tab mới | `content.js` bấm đúp + bôi đen; `newtab.js` 10 thẻ, vòng mục tiêu, `ntQuiz` | Tab mới: 1 câu đố 4 lựa chọn ≤10 s; YouTube: bấm từ trong phụ đề → lưu (không đụng DOM player, test ext-*) |
| 7 | Kiểm tra đầu vào | `placement.js` 20 câu thích ứng, CEFR→IELTS, `#/placement` | gắn vào luồng người mới (chủ đã chốt: mời 5 phút, có nút bỏ qua), kết quả gán chặng/bộ từ |
| 8 | Nhập vai + shadowing | `roleplay.js` (phỏng vấn, visa, mặc cả), `pron/*` `PronCoach` mức từ | thêm tình huống phỏng vấn/đàm phán lương; shadowing liên tục + đánh dấu lỗi âm vị trên UI (chạy trên máy nếu có model, không thì mức từ) |
| 9 | Sổ lỗi thông minh | `plan.js` Store `mistakes` (300), `logMistake` từ mock/toefl/toeic/cbt/grammar; add-on ghi vocab/grammar | ghi lỗi dịch từ add-on; tự sinh mini-test biến thể định kỳ (FSRS hẹn ngày) |
| 10 | Lượt AI nhờ ôn thẻ | `_quota.js`, `ads-reward.js` (quảng cáo thưởng +3/+10, ≤3/ngày) | đường "ôn N thẻ → +lượt": bằng chứng ôn phía máy chủ (sync log), trần/ngày, UI nhẹ nhàng không ép |
| 11 | Thách đấu 1v1 60 s | `league.js` bảng xếp hạng tuần | chưa có: ghép cặp (Durable Object free tier) hoặc "đấu bóng ma" không đồng bộ trước (rẻ, không cần thời gian thực) |
| 12 | Kho đề/thẻ cộng đồng | `api/class.js` lớp + giao bộ có sẵn; `community.md` (chưa code) | tạo/chia sẻ bộ thẻ, đề; kiểm duyệt (báo cáo + AI lọc), danh mục công khai; miễn phí, không thanh toán |

## Thứ tự (giá trị/chi phí; lát nhỏ trước)
- **Đợt 1 – dùng lại cái có (6 lát, mỗi lát ≤1 ngày):** #7 đầu vào vào luồng mới → #4 % tiến độ v2 → #1 top bar → #6 Tab mới 10 s → #2 bảng rung → #10 lượt AI nhờ ôn thẻ.
- **Đợt 2 – học sâu:** #9 sổ lỗi biến thể → #3 cảm xúc giáo viên → #8 tình huống + shadowing.
- **Đợt 3 – mới hoàn toàn (spec riêng trước khi code):** #5 nhập tài liệu → #11 đấu bóng ma rồi 1v1 → #12 kho cộng đồng (sau community.md).

## Tiêu chí xong (mọi lát)
Đủ 15 ngôn ngữ (i18n-qa), sáng/tối/360 px không tràn, nút ≥44 px, tương phản AA, shell ≤377 KB, size-budget không nâng, test riêng + e2e trên CI xanh, add-on đồng bộ (ext-sync). Thông báo/nhắc theo notifications-ux (trần, giờ yên, không gây áp lực). Đo sau 2 tuần: tỉ lệ quay lại ngày 1/7, số phút học/ngày, % người mới làm bài đầu vào.
