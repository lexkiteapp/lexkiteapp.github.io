# Lexkite – Microsoft Edge Add-ons: ghi chú listing

Hướng dẫn đầy đủ: `docs/EDGE-SUBMIT.md`. Tên / mô tả ngắn / mô tả: **`store/chrome/listing.json`** (dùng chung với Chrome; copy nhanh ở `store/chrome/fill.html`).

## Search terms (tối đa 7 cụm, mỗi cụm ≤ 30 ký tự)
Điền cho English; ngôn ngữ khác dịch tự nhiên (không nhồi từ, không tên thương hiệu khác).

| # | English | Ký tự |
|---|---|---|
| 1 | `english dictionary` | 18 |
| 2 | `translate selection` | 19 |
| 3 | `vocabulary flashcards` | 21 |
| 4 | `IELTS vocabulary` | 16 |
| 5 | `TOEIC vocabulary` | 16 |
| 6 | `spaced repetition` | 17 |
| 7 | `learn english words` | 19 |

Gợi ý tiếng Việt: `từ điển anh việt`, `dịch tiếng anh`, `flashcard từ vựng`, `từ vựng IELTS`, `từ vựng TOEIC`, `lặp lại ngắt quãng`, `học tiếng anh`.

## Notes for certification (dán vào ô ghi chú cho người kiểm duyệt)
```
No account or login is needed to test. 1) Open any English article (e.g. a Wikipedia page), double-click an English word: a lookup card shows IPA, audio and meanings. 2) Select a sentence: it is translated and its grammar structures are explained. Right-click a selection for "Look up" / "Translate selection". 3) Click the toolbar icon (or Alt+L) to open the popup with today's cards and a quick review. 4) Open a new tab: a vocabulary flashcard is shown with a search box that uses the browser's default search engine (no search provider change); it can be turned off with "Turn off" at the bottom of the card. 5) Writing check is off by default: enable "Writing check" in the popup, then type "She have a apple" into any text box and click the underlined word. All JavaScript is bundled in the package (no remote code); only dictionary/translation data is fetched. Privacy policy: https://lexkite.com/privacy
```

## Quyền (tóm tắt cho kiểm duyệt – bản đầy đủ: `store/chrome/PRIVACY-PRACTICES.md`)
- `storage`: lưu từ đã lưu, lịch ôn, cài đặt trên máy.
- `alarms`: nhắc học hằng ngày + kiểm 15 phút cập nhật số thẻ cần ôn.
- `notifications`: nhắc học / "thời điểm vàng" (tắt được, có giờ yên lặng).
- `contextMenus`: mục "Look up" / "Translate selection" khi chuột phải vào đoạn đã chọn.
- `scripting`: chèn content script có sẵn trong gói vào các tab đã mở sau khi cài/cập nhật; đọc danh sách phụ đề YouTube.
- `search`: ô tìm kiếm ở tab mới gửi tới công cụ tìm kiếm mặc định của người dùng.
- Host `http://*/*`, `https://*/*`: tra/dịch trên mọi trang người dùng đọc; gọi dịch vụ từ điển/dịch đã liệt kê trong chính sách.
- `chrome_url_overrides.newtab`: thẻ từ vựng trên tab mới, tắt được.
