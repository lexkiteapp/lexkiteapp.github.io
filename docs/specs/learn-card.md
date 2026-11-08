# Thẻ kết quả theo câu (LearnCard) – spec-lite (04/11/2026)

> TL;DR: Sau mỗi câu, người học giữ lại một thứ dùng được: câu đúng đủ dấu, nghĩa tiếng mẹ đẻ, mẫu câu; mở thêm "Vì sao" và "Thử đổi từ", nói theo bằng mic, chạm từ xem nghĩa, mẫu tự vào ôn tập. Một module tải lười, dữ liệu ở `web/packs/lcard`.
> Đọc khi: sửa tấm phản hồi sau khi làm bài có câu, kho mẫu câu, soát dấu câu nội dung.

## Mục tiêu đo được
| # | Tiêu chí | Kiểm |
|---|---|---|
| 1 | Câu trên thẻ luôn là câu nguồn đủ dấu (không phải chuỗi ô chữ đã bỏ dấu) | jsdom `lesson-card.mjs` |
| 2 | Có nghĩa → hiện, thiếu → ẩn gọn, không có ô trống | jsdom |
| 3 | Mẫu câu khớp bằng luật tay (0 AI lúc chạy); thiếu → ẩn | `build-card.mjs --check` |
| 4 | Một chạm "Tiếp tục" luôn đi tiếp, thẻ chưa tải xong cũng không chặn | jsdom |
| 5 | Sai: hiện câu đúng và lý do (mở sẵn Vì sao), không trừ gì | jsdom |
| 6 | Nội dung câu đúng dấu + viết hoa, ngoại lệ ghi lý do | `sentence-punct.mjs` trong npm test |
| 7 | Mẫu tự lưu: ≤ 2 mẫu/bài, ≤ 5 mẫu/ngày, demo không ghi, bỏ lưu được | jsdom |
| 8 | Shell ≤ 377 KB gz, `web/js` không vượt `totalJs`, không nới trần | `size-budget.mjs` |

## Thiết kế
- `web/js/lesson/card.js` (`self.LearnCard`, gói lười `lcard` cùng `why.js` của #336): phần thuần `match(sent, frames)`, `sentenceTokens`, `saveAllowed`; phần vẽ `html(spec)`, `wire(root, spec, deps)`. Không phụ thuộc màn bài học: `spec = { en, tr, ok, word?, hard?, why?() }`, nên mọi màn gọi được.
- **Dữ liệu ngoài `web/js`** (`scripts/lesson/build-card.mjs`, nguồn `content/lesson/card/`):
  - `web/packs/lcard/frames.json`: mẫu câu (regex, chữ mẫu, câu đổi từ, cờ thành ngữ).
  - `web/packs/lcard/<lang>.json`: `{ s: {câu đã chuẩn hoá: bản dịch}, i: {mã thành ngữ: nghĩa} }` cho câu truyện/radio.
- Câu từ vựng dùng lại `web/packs/sent` (có sẵn) và `c.sentences`. Bản dịch trùng tiếng Anh coi như thiếu.
- Tấm phản hồi Stitch giữ nguyên: thẻ chèn vào slot `extra`, màu theo panel `lsn-dict` của chính khuôn. Không vẽ màn mới, không tốn lượt Stitch.
- Lưu ôn tập: `App.addWord({ word: 'Can I have …, please?', pos: 'phrase', ex, vi|def })`. Dấu `…` để giọng đọc không đọc gạch dưới; lesson engine nhận thẻ mẫu và ra bài `build`/`say` từ `ex`.
- **Ngân sách:** `lesson/gold.js` (dữ liệu 56 KB) chuyển sang `web/packs/lesson/gold.json`, nạp khi cần, nhường chỗ cho `card.js` + `why.js` + i18n. Không cắt nội dung, không nới trần.

## Cách dựng và điểm hỏng
| Điểm hỏng | Chặn |
|---|---|
| Regex mẫu chậm | ≤ 300 mẫu, test đo < 5 ms/câu, cấm lồng lượng từ |
| Gói dữ liệu lỗi mạng | thẻ ẩn phần đó, Tiếp tục không chờ |
| Lưu thẻ quá nhiều làm ngập ôn tập | trần theo bài/ngày |
| Mic hỏng/không có quyền | `UI.recErrorText`, không chấm điểm, không chặn |
| Đổi chữ câu làm mất mp3 (`KVoice.lineKey` theo chữ) | chỉ sửa dữ liệu khi sai thật; sàn `audio-coverage` giữ |

## Definition of Done
Hạn mức: 0 AI lúc chạy, không D1. Tắt được: `localStorage lk.lcard=0`. i18n 15 ngôn ngữ, RTL dùng thuộc tính logic. Nút ≥ 44 px, tương phản ≥ 4,5:1 (`lt/dk` trong `contrast`). Offline: gói lỗi → ẩn. Test: `scripts/test/lesson-card.mjs`, `sentence-punct.mjs`. Ảnh: `lcard-shots.yml` 390 px sáng/tối.
