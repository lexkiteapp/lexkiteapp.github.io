# Welcome + thiết lập lần đầu – spec-lite (chủ 4/11)
> TL;DR: Người mới: Welcome → 5 bước thiết lập → bài đầu → Hôm nay, không hỏi lại điều đã biết. Người đã có dữ liệu không bao giờ thấy lại màn giới thiệu. Port Stitch, tiếp nối #347.
> Đọc khi: sửa `web/js/welcome.js`, `web/js/onboard.js`, `scripts/gen-hero.mjs`, hoặc test `welcome-journey` đỏ.

## Ai thấy gì, đi đâu
"Có dữ liệu" = `settings.onboarded` hoặc có thẻ hoặc có XP (cùng phép `fresh` ở boot).

| Trạng thái | Vào `#/welcome`, `start`, `signup`, `setup` | Vào `#/welcome/setup` | Vào `#/welcome/login` |
|---|---|---|---|
| Người mới | Màn Welcome | Thiết lập từ bước đang dở | Welcome, nút Đăng nhập được làm nổi |
| Đã đăng nhập, có dữ liệu | Thay bằng `#/home` | Thay bằng `#/home` | Thay bằng `#/me` |
| Có tiến độ, chưa đăng nhập | Thay bằng `#/home` | Thay bằng `#/home` | Welcome, nút Đăng nhập nổi; đăng nhập xong gộp dữ liệu rồi về `#/home` |

Thay bằng `location.replace`, để nút Back không kẹt vòng lặp. Đổi kế hoạch sau này vẫn ở Cài đặt và Hôm nay, không dùng lại thiết lập.

- **Deep link:** người mới mở `#/dict/x`, `#/tests`, `#/review`… thì thấy đúng trang đó. Chỉ `/`, `#/home`, `#/welcome` mới dẫn về Welcome (giữ phép boot ở `app.js`).
- **Đổi ngôn ngữ giữa chừng:** `I18N.set` tải lại trang. Lựa chọn và bước hiện tại nằm ở `sessionStorage` `lk.onbPick`, nên quay lại đúng bước với đủ lựa chọn. Thẻ thử nhanh về mặt trước. Xoá khoá khi xong thiết lập.
- **Đăng nhập giữa thiết lập:** sau khi gộp, nếu tài khoản có dữ liệu thì về `#/home`, không hỏi tiếp. Nếu tài khoản trống thì ở lại đúng bước, không đánh dấu `onboarded` (bản cũ bỏ qua cả thiết lập). Huỷ đăng nhập: giữ nguyên màn.
- **`Sync.can === false`:** không hiện nút Đăng nhập, như hiện tại.

## Luồng thiết lập
`goal → level → target → pace → ready → Ngày 1 hoặc bài đầu vào → Hôm nay`

- Mỗi bước có hash riêng `#/welcome/setup?s=<bước>`, nên Back hệ thống và vuốt iOS đi đúng một bước, tải lại vẫn đúng màn.
- Back hoặc X trên top-bar ≥ 44 px ở mọi bước, Esc cũng lùi. Bước đầu lùi về Welcome.
- **Lời mời bài đầu vào (Đợt 1 #7):** chưa chọn trình độ (hoặc chọn "kiểm tra") → `ready` → lời mời 5 phút ở `#/placement` (Ama qua `Chars.slot`, Bắt đầu + **Bỏ qua**). Bỏ qua → Hôm nay, chặng đầu. Làm xong → chặng theo kết quả (`Tracks.start`), thêm ≤10 từ đúng CEFR từ vựng vào bộ thẻ, nút về Hôm nay. Đã chọn trình độ tay → vào thẳng Ngày 1, không mời. Cờ phiên `lk.plInv` (onboard.js ghi, placement.js xóa).
- **Không hỏi lại:** có `settings.placement` (làm bài đầu vào từ Welcome) thì bước `level` ghi sẵn kết quả, được đổi nếu muốn. `settings.exam` và `examTarget` hợp thang thì chọn sẵn.
- **Bài đầu vào từ Welcome khi chưa thiết lập:** nút cuối của kết quả đi `#/welcome/setup`, không đi `#/home` (bản cũ về Home chưa có mục tiêu, tải lại thì quay về Welcome). Đã thiết lập thì vẫn `#/home`.
- **`#/style` từ Welcome:** không đổi logic; Back về Welcome, không chặn thiết lập.

## Khớp với phần còn lại
- **Tên gọi:** Hôm nay · Từ vựng · Kỹ năng · Thi · Tôi (#584). Câu chữ và tuyên bố lấy từ landing (`content/landing/*.json`): "miễn phí", "không cần tài khoản để bắt đầu". Không có số liệu bịa; con số nào cũng phải đúng với dữ liệu thật.
- **Điểm mục tiêu:** lưu `examTarget` đúng thang #582 (`App.targetFits`): IELTS 0–9, TOEIC 10–990, TOEFL 1–6, General A1–C2. Nhãn "8.0+", "900+", "5.5+" chỉ để hiển thị, lưu số không có dấu `+`.
- **Cường độ:** nhãn phút và số từ mới phải đúng `dailyGoal`/`dailyNew` đang lưu, Hôm nay đọc cùng hai ô đó.
- **Nhân vật:** Ama/Carlos 2D từ `Chars.*`, chạm nền sạch, không thân mờ dần (METHODS §0). Câu "mình là Kit" đổi thành lời của Ama.

## Không ngõ cụt
- **App kẹt lúc khởi động:** thấy trên live 4/11, `indexedDB.open('lexkite')` treo thì `App.ready` không bao giờ xong và `#view` trắng vĩnh viễn. Sau 8 giây chưa vẽ gì → thẻ "Không tải được" kèm nút Thử lại (tải lại trang). Không đọc dữ liệu giả, để không ghi đè dữ liệu thật.
- Gói `onb` hoặc `welcome` tải lỗi: thẻ lỗi có Thử lại và lối về, không phải dòng chữ trơn.

## Giữ nguyên chức năng
Thẻ thử nhanh (lật, nghe, 4 mức chấm, `#wDone`), Đăng nhập (`#loginW`, `#loginH`), chọn ngôn ngữ, link kiểm tra trình độ và phong cách, 9 tính năng + 2 điểm nhấn, menu đầu trang, toàn bộ link và dòng pháp lý ở chân trang. Muốn gộp thì chuyển chỗ, không bỏ.

## Thiết kế & hiệu năng
- **Stitch (Lexkite Kit, sáng + tối):** màn mới `welcome` 390 px và `welcome-desk`. Dùng lại ref `onb-goal`, `onb-level`, `onb-pace`, `onb-ready` (#347) và `onb-band` (bước target). Desktop của thiết lập = cùng cột giữa (§5d), không cần ref riêng.
- **Code:** `web/js/welcome.js` tải lười, `routes.welcome` trong `app.js` chỉ còn phần gọi và logic chuyển hướng. Khung hình đầu vẫn do `gen-hero` vẽ (LCP, CLS ≈ 0), khớp bố cục mới. Shell ≤ 374 KB gz chuẩn, không nới trần.

## Xong khi
Test `welcome-journey` xanh cho từng dòng ở trên, stitch-diff và frame-consistency có khoá mới, i18n-qa strict đủ 15 ngôn ngữ, có ảnh trước/sau sáng + tối.
