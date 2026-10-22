# Huy hiệu "Featured" trên Chrome Web Store – checklist cho Lexkite

Anh ơi, huy hiệu **Featured** do nhóm Chrome Web Store xét tay, dựa trên "Best practices" và trải nghiệm thật của add-on – không mua được, không có cam kết thời gian. Dưới đây là các tiêu chí, phần Lexkite đã đạt và việc còn lại. Bước gửi yêu cầu (mục 3) **anh tự gửi** bằng tài khoản nhà phát triển; em không đăng nhập hay gửi thay.

Ký hiệu: ✅ đã đạt · 🟡 đạt một phần / cần kiểm lại · ⬜ chưa làm.

## 1. Kỹ thuật & tuân thủ
| Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|
| Manifest V3 | ✅ | `extension/manifest.json` (service worker, không mã từ xa – `cws-check`). |
| Quyền tối thiểu + lý do rõ | 🟡 | 6 quyền + host `http/https://*/*`, đều có lý do trong `store/chrome/PRIVACY-PRACTICES.md`, khóa bởi `permissions.lock.json`. Host rộng là bắt buộc cho tra từ trên mọi trang; nếu nhóm duyệt hỏi, giải thích như mục Host permission. Không thêm quyền mới trước khi xin badge. |
| Chính sách quyền riêng tư + khai Data usage đúng | ✅ | `https://lexkite.com/privacy` (15 ngôn ngữ), tab Privacy practices theo `PRIVACY-PRACTICES.md`. |
| Không hành vi lừa dối / một mục đích | ✅ | Một mục đích (học từ vựng khi duyệt web), không quảng cáo trong add-on, không đổi công cụ tìm kiếm, tab mới tắt được. |
| Cập nhật đều đặn | ✅ | Phát hành tự động qua GitHub Actions; giữ nhịp 1–2 tuần/bản (`docs/CWS-RULES.md`). |
| Không lỗi console / không làm chậm trang | 🟡 | Chạy `scripts/test/ext-e2e.mjs` trên CI trước khi xin; xem lại trang nặng (YouTube, trang báo dài). |

## 2. Listing & trải nghiệm
| Tiêu chí | Trạng thái | Ghi chú |
|---|---|---|
| Tên, mô tả ngắn, mô tả chất lượng, đúng sự thật, không nhồi từ khóa | ✅ | `store/chrome/listing.json` (15 ngôn ngữ), kiểm bằng `node scripts/test/listing-check.mjs`. |
| Ảnh chụp 1280×800 (tối đa 5) từ giao diện thật | 🟡 | en + vi có sẵn trong `store/chrome/screenshots/`; 13 ngôn ngữ còn lại cần sinh bằng workflow "Ảnh Chrome Web Store" rồi tải lên. Kế hoạch 5 ảnh: `store/chrome/LISTING.md`. |
| Ô quảng cáo nhỏ 440×280 + lớn 1400×560 | ✅ | `store/chrome/promo-440x280.png`, `promo-1400x560.png`. |
| Video giới thiệu (YouTube) | 🟡 | Không bắt buộc nhưng có điểm cộng – xem `store/chrome/YOUTUBE.md`. |
| Icon rõ ở 16/32/48/128 | ✅ | `extension/icons/`. |
| UX tốt, trực quan cho người mới | 🟡 | Kiểm lại luồng lần đầu cài: thẻ chào/hướng dẫn bấm đúp, popup không trống khi chưa có từ. |
| Trợ năng (accessibility) | ⬜ | Rà nhanh: điều hướng bàn phím trong popup và thẻ tra từ, `aria-label` cho nút chỉ có icon, độ tương phản chữ (chế độ sáng/tối), Esc đóng thẻ. |
| Hỗ trợ & liên hệ phản hồi nhanh | ✅ | Support URL `https://lexkite.com/app/#/contact`, `support@lexkite.com`, nút "Report a problem" trong popup. Mục tiêu: trả lời trong 1–2 ngày. |
| Đánh giá & trả lời đánh giá | 🟡 | Trả lời **mọi** đánh giá trên https://chromewebstore.google.com/detail/idalfipabpfcajpkfkifbdlpejcdmfcd/reviews (lịch sự, cụ thể, nói rõ bản nào đã sửa). Không mua, không đổi quà lấy đánh giá, không xin đánh giá 5 sao. |
| Nhà phát triển đã xác minh | 🟡 | Dashboard → Account: xác minh email, thông tin nhà phát triển, (nếu có) website lexkite.com đã xác minh trong Google Search Console – giúp có thêm huy hiệu "Established publisher". |

## 3. Gửi yêu cầu xét huy hiệu – anh tự gửi
Chỉ gửi khi các dòng ⬜/🟡 quan trọng đã xong (ảnh đủ ngôn ngữ, trả lời hết đánh giá, rà trợ năng).
1. Đăng nhập tài khoản nhà phát triển Chrome Web Store của anh.
2. Mở form hỗ trợ **One Stop Support**: https://support.google.com/chrome_webstore/contact/one_stop_support
3. Chọn nhóm vấn đề về **item của tôi** (My item) → mục yêu cầu **Featured badge** (tên mục có thể thay đổi theo thời điểm; chọn mục gần nhất với "featured / badge / item review").
4. Điền: Item ID `idalfipabpfcajpkfkifbdlpejcdmfcd`, link cửa hàng, vài câu giới thiệu (gợi ý bên dưới), rồi gửi.
5. Chờ phản hồi qua email. Nếu bị từ chối, đọc lý do, sửa, rồi gửi lại sau vài tuần (không gửi dồn dập).

Gợi ý nội dung (tiếng Anh, anh chỉnh tùy ý):
```
Lexkite (item ID idalfipabpfcajpkfkifbdlpejcdmfcd) is a free Manifest V3 extension that helps learners build English vocabulary while they browse: double-click lookup, selection translation with grammar explanations, saving words with their context, and FSRS spaced-repetition review. It has no ads, needs no account, keeps learning data in the browser, and every permission is justified in the privacy tab. The listing is available in 15 languages and we reply to user reviews and support requests. We would appreciate a review for the Featured badge.
```

## 4. Giữ huy hiệu sau khi có
- Không thêm quyền/host mới nếu không thật cần (thêm quyền có thể bị xét lại).
- Giữ listing đúng sự thật mỗi lần đổi tính năng (`listing.json` + `listing-check`).
- Tiếp tục trả lời đánh giá và cập nhật đều.
