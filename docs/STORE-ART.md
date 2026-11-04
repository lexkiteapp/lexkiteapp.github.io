# Ảnh giới thiệu Lexkite (App Store, Google Play, Chrome Web Store, web)

> TL;DR: Một đường ống cho toàn bộ ảnh giới thiệu: màn app thật + khung Stitch + giáo viên 2D + chữ 15 ngôn ngữ + QC. Nguồn: `scripts/store-art/`, khung `brand/stitch/store-art/`. Chụp lại bằng một lần chạy tay `store-art.yml`. Không tự tải lên store.
> Đọc khi: sửa ảnh store, OG, ảnh mạng xã hội, hoặc thêm tính năng cần khoe trên ảnh.

## 1. Nguyên tắc
Rút từ hướng dẫn ASO và Google Play; không chép app nào.
- Người xem thường chỉ thấy vài ảnh đầu, nên ảnh 1–2 phải nói được lợi ích lớn nhất.
- Xếp ảnh theo sức thuyết phục, không theo luồng dùng app. Bỏ màn đăng nhập, thiết lập.
- Chữ ngắn, đọc được ở cỡ thu nhỏ, nói kết quả người học nhận được rồi mới tới tính năng.
- Đúng thật: mọi ảnh là màn app thật. Không điểm đánh giá, giải thưởng, "số 1", tên hay logo đối thủ (`RANKING`, `COMPETITORS` trong `store-metadata.mjs`, kiểm trên từng ảnh).
- Google Play yêu cầu ảnh không ghi giá hay chữ "free". Ảnh Play dùng `sPlay` ("no subscription"); App Store, Chrome và web được ghi "100% free".
- Tên kỳ thi chỉ dùng để mô tả việc luyện tập, không logo. Câu không liên kết với British Council, ETS nằm trong mô tả dài.

## 2. Thông điệp và thứ tự
| # | Màn thật | Tiêu đề (en) | Vì sao |
|---|---|---|---|
| 1 | Today, Ama đứng trước máy | Speak and write English with confidence | Kết quả lớn nhất, có người thật ấm áp, giữ người xem |
| 2 | Cuộc gọi đang diễn ra | Speak out loud every day | Khác biệt rõ nhất: mở miệng nói ngay |
| 3 | Báo cáo viết thật (`Lexis.analyze`) | Write it, see what to improve | Vế "viết" của mục tiêu, kết quả thật từ bài mẫu |
| 4 | Bài học, Carlos động viên | Short lessons that feel like a game | Dễ bắt đầu, không tim, không giới hạn |
| 5 | Thẻ Say it like a native | Sound natural, not like a textbook | Mong muốn của người học khá |
| 6 | Thẻ ôn đã lật | Remember words before you forget | Lặp lại ngắt quãng, nói bằng lợi ích |
| 7 | Hub Tests | Practice for IELTS, TOEIC and TOEFL | Nhóm luyện thi, chốt bằng miễn phí, không đăng nhập |

**Mốc 3–6 tháng:** mặc định ảnh 1 chưa ghi. Hiện main chưa có tính năng đo đầu ra (`#/outcome`, PR #557), nên ghi mốc thời gian lúc này là lời hứa chưa có gì chứng minh, dễ trượt Apple 2.3 và Metadata policy của Play. Khi #557 vào main, chạy với `outcome36 = true`; dòng `s36` đã dịch đủ 15 ngôn ngữ, nói là "kế hoạch để đạt mục tiêu", không cam kết kết quả.

## 3. Kích thước
| Store | Ảnh | Pixel |
|---|---|---|
| App Store | iPhone 6.9" · iPad 13" | 1320×2868 · 2064×2752 |
| Google Play | Điện thoại · tablet 7" · tablet 10" · bìa | 1080×1920 · 1080×1920 · 1440×2560 · 1024×500 |
| Chrome Web Store | Ảnh · ô nhỏ · ô lớn | 1280×800 · 440×280 · 1400×560 |
| Web | OG · vuông | 1200×630 · 1080×1080 |

Tablet Play để đúng 9:16 theo "Add preview assets". Mọi PNG là RGB không alpha (`pngOk`). Icon 512 giữ nguyên, đã đúng logo mới.

## 4. Đường ống
1. `queue.mjs`: prompt Stitch, mỗi khung một prompt, mô tả cảm giác. Sáng và tối sinh riêng vì `edit_screens` làm mất id và vẽ lạc sang sản phẩm khác. Kết quả ở `brand/stitch/store-art/`, id màn ở `.index.txt`.
2. `capture.mjs`: chụp app thật (`?sandbox=1&demo=1`), có thao tác tới đúng trạng thái. Màn trắng hoặc thao tác hỏng là đỏ. App Store chụp trên Simulator (`ios-shots.yml`, cùng kịch bản qua `ios-shots-inject.js`). Add-on chụp bằng `store-shots.mjs` với `RAW=`.
3. `compose.mjs`: điền các ô `lk-logo, lk-headline, lk-em, lk-sub, lk-screen, lk-teacher, lk-teacher2, lk-bubble, lk-tags, lk-points`, không vẽ lại khung. Bong bóng giáo viên giữ tiếng Anh ở mọi ngôn ngữ.
4. `review.py`: một trang duyệt, có điểm từng ảnh.

**Cổng QC (đỏ = workflow đỏ):** thiếu ô, tiêu đề đè thiết bị hoặc giáo viên ở cỡ nhỏ nhất, chữ tràn hoặc ra ngoài ảnh, tương phản đo trên điểm ảnh thật (≥ 4,5:1, chữ lớn ≥ 3:1), giáo viên không chạm đáy ảnh (lộ đường cắt), sai kích thước hoặc có alpha, lint từ cấm theo store. Điểm: 100, trừ 25 mỗi lỗi đỏ, trừ 5 mỗi cảnh báo.

## 5. Chụp lại khi giao diện đã sửa xong
Actions → **Ảnh giới thiệu (Store Art)** → Run workflow: `langs = all`, `preview = false`, `ios = true`. Hoặc:
```bash
T=$(gh auth token); curl -s -X POST -H "Authorization: token $T" https://api.github.com/repos/lexkiteapp/lexkiteapp.github.io/actions/workflows/store-art.yml/dispatches -d '{"ref":"main","inputs":{"langs":"all","preview":"false","ios":"true"}}'
```
Kết quả: artifact `store-art-review` (trang duyệt), `store-art-pack` (Play, Chrome, web), `lexkite-appstore-shots` + nhánh `ios-shots` (App Store). Đẩy lên store là bước riêng, chủ dự án xác nhận. Có `scripts/asc-upload.mjs` cho App Store (`ios-shots.yml`, `asc`); Play và Chrome tải tay.

## 6. Chưa đổi
- `web/og-default.png` và trang landing: chỉ thay file sau khi duyệt. Banner đầu landing đã là Landing v3 từ Stitch với giáo viên sống, không thay bằng ảnh tĩnh.
- `play-shots.yml` và `store-shots.yml` cũ giữ nguyên tới khi bộ mới được duyệt.
- Video store (`store-video*.yml`): chỉ rà, xem báo cáo PR.
