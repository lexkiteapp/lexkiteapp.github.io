# Trang chủ v2 ("Hôm nay") – benchmark 3 app lớn → Lexkite (31/10)

> TL;DR: Màn chính chỉ hiện 1 bài trên lộ trình, dù app ĐÃ CÓ ôn tập SRS, sổ lỗi sai, luyện nhanh, thi thử, truyện, nghe/nói, gọi giáo viên, giải đấu, chuỗi ngày. Home v2 = HIỆN những thứ sẵn có theo thứ tự "1 việc chính + kế hoạch hôm nay + lối tắt", chưa xây mới.
> Đọc khi: sửa `#/home` / `#/train` (web/js/ux1.js + web/js/st/v2/path.js). Khung: DESIGN-SYSTEM §5d. Bài học: LESSON-UX-V2.md (không thuộc trang này).

## 1. Ba app làm gì (và Lexkite đã có gì)
| Mẫu | Duolingo | Busuu / Babbel | ELSA Speak (người thi VN) | Lexkite ĐÃ CÓ (route / file) |
|---|---|---|---|---|
| Lựa chọn mà không rối | 1 lộ trình giữa màn; mọi thứ khác nằm ở tab/rail phải (nhiệm vụ, giải đấu) | Tab "Hôm nay": 1 thẻ bài kế + 2–3 thẻ phụ | Thẻ "Bài hôm nay" + lưới kỹ năng | Chỉ 1 nút bài; lối tắt nằm ở tab Kỹ năng/Thi (`hubs.js`) |
| Kế hoạch ngày | Nhiệm vụ ngày (3 việc) + mục tiêu XP | Busuu: kế hoạch theo cấp đích + ngày thi | Kế hoạch ~10 phút/ngày | `plan.js` (Day N), `goal.js`, `path-day.js` – CHƯA hiện ở home |
| Luyện tập (lỗi, từ, nghe, nói) | Practice hub: Lỗi sai · Từ · Nghe · Nói | Babbel Review manager; Busuu Smart review | Luyện âm theo lỗi phát âm | `#/mistakes`, `#/review`, `#/practice`, `#/listening`, `#/speaking`, `#/pron`, `#/reflex` |
| Nhắc ôn tới hạn | "Luyện lỗi sai" nổi lên khi có lỗi | "N từ cần ôn" (độ mạnh từ) | – | SRS `study.js` có số thẻ tới hạn – chưa nhắc ở home |
| Bài nhanh 1 phút | Bài "luyện nhanh" ngắn | Babbel games / thẻ nhanh | Bài 1–2 phút | `#/quick`, `#/reflex`, thử thách 2 phút `#/confidence` |
| Chế độ thi | Duolingo Score / DET | Busuu chứng chỉ | IELTS/TOEIC: band dự đoán, thi nói thử | `#/mock`, `#/toeic*`, `#/toefl`, `#/placement`, `exam-readiness` (st/v2) |
| Truyện / podcast | Stories trong lộ trình; Adventures | Babbel Podcasts, Everyday Stories | – | `lesson/stories.js`, `story-duo` (st/v2), `#/listen`, `#/letters` |
| Giải đấu + chuỗi | Giải tuần + streak, đóng băng chuỗi, rail phải | Busuu streak nhẹ | Streak + huy hiệu | `#/league`, `#/streak` (retention.js), `streak` (st/v2) |
| Bước kế cá nhân hoá | Tự nhảy cấp, luyện theo điểm yếu | Busuu theo cấp đích | Theo điểm phát âm yếu | `next-step.js` (đã tính, ít hiện) |
| Người mới (trống) | Chọn mục tiêu → kiểm tra trình độ → bài 1 | Chọn cấp + ngày thi → kế hoạch | Bài test giọng 2 phút | `#/placement`, `#/goal`, Ama/Carlos chào (`Chars.*`), `#/call` |

## 2. Bài học rút ra
1. **Một việc chính, nhiều lối phụ gọn**: nút lớn "Tiếp tục" luôn ở trên; các lựa chọn khác là thẻ nhỏ cùng khung, không chen vào lộ trình.
2. **Kế hoạch hôm nay = 3 việc có vòng tiến độ** (bài kế · ôn N từ · 1 bài nhanh) – người học biết "xong ngày" là gì.
3. **Nhắc ôn chỉ hiện khi có việc thật** (số từ tới hạn / lỗi sai > 0), không hiện thẻ rỗng.
4. **Thi là động lực chính của người VN** (ELSA): thẻ "IELTS 6.5 · còn N ngày · thi thử" ngay home.
5. **Người mới không thấy trang trống**: Ama chào + 3 bước (mục tiêu → kiểm tra 2 phút → bài 1).
6. **Desktop**: cột giữa = Hôm nay; rail phải = chuỗi, giải đấu, nhiệm vụ (giống Duolingo).

## 3. Ưu tiên (HIỆN cái có trước, xây mới sau)
| # | Việc | Loại |
|---|---|---|
| P1 | Home v2 "Hôm nay": top-bar (ngôn ngữ + 4 chip có nhãn) → thẻ Tiếp tục (lộ trình thu gọn, có Ama đứng chạm nền) → Kế hoạch hôm nay (3 việc, vòng) → nhắc ôn/lỗi sai (có điều kiện) → hàng "Luyện nhanh 1 phút" (Lỗi sai · Từ · Nghe · Nói) → thẻ Thi (mục tiêu + thi thử) → Truyện/Nghe → dải chuỗi + giải đấu → lộ trình đầy đủ bên dưới | nối dữ liệu có sẵn |
| P2 | Trạng thái người mới (Ama + 3 bước) và rail phải desktop | nối dữ liệu có sẵn |
| P3 | Bước kế cá nhân hoá hiện rõ (`next-step.js` → thẻ Tiếp tục đổi theo điểm yếu) | logic nhỏ |
| P4 | Mới: đóng băng chuỗi, nhiệm vụ ngày có thưởng, chuỗi bạn bè | xây mới, sau khi anh OK |

Không cắt gì: lộ trình đầy đủ (mọi nút, popover bài, hướng dẫn chặng), chip, giáo viên vẫn ở home ngay dưới các khối mới; chỉ THÊM khối.

## 4. Thiết kế (Stitch, chờ anh duyệt 31/10)
Ref: `brand/stitch/v2/app/home-v2/` (today · new · desk, sáng/tối; id ở `.index.txt`; tờ duyệt `owner/`). Port theo STITCH-V2-PORT.md sau khi anh OK; ô giáo viên = `Chars.*`; số liệu chỉ từ dữ liệu thật (khối không có dữ liệu thì ẩn).
