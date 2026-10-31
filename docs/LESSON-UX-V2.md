# Bài học v2 – rõ ràng như Duolingo (phân tích + kế hoạch, 31/10)

> Đọc khi: sửa màn `#/lesson`, thêm dạng bài, đổi đề/gợi ý/kiểm nội dung. Thiết kế lõi: [LESSON-ENGINE.md](LESSON-ENGINE.md). Khung app: DESIGN-SYSTEM §5d (biến thể `focus`).

## 1. Gốc lỗi (chủ thử iPhone 390 px, sáng)
| Thấy | Gốc trong mã |
|---|---|
| "Xếp thành câu" mà đề là định nghĩa tiếng Anh | `ui.js next()`: khi `noAudio`, `build` lấy `it.prompt \|\| meanOf(card)` → từ chủ đề (`data.js`) không có bản dịch câu → rơi về `def`. Đề = nghĩa của TỪ, đáp án = CÂU. |
| "Gõ từ tiếng Anh" chỉ có định nghĩa, không gợi ý | `type` + `noAudio` → `sub = meanOf(card)`; không độ dài, chữ đầu, ngân hàng chữ; nút Kiểm tra không ghim đáy. |
| Không có nghĩa tiếng mẹ đẻ | `data.js` chỉ có `vi` cho TỪ; câu ví dụ không có bản dịch nào (15 ngôn ngữ). |
| Chip đầu trang không nhãn, thẻ unit "Education · Lesson · 4 min" | `ux1.js map()` chỉ in icon + số; bài không có tên/mục tiêu/từ mới. |
| Ama bị cắt ngang eo | `.lsn-tchw` cao 172 px + `-mb-14` + mask 80 % → đường cắt (cấm theo luật HARD). |
| Chip "IELTS · Target" lẻ loi, avatar trong top-bar bài học | khung `focus` §5d chỉ cho X + thanh tiến độ + 1 chip trạng thái. |
| Tấm báo lỗi dùng emoji hệ thống | lệch Kit → icon Kit. |

## 2. Chuẩn Duolingo → Lexkite
1 lời dặn/dạng · nghĩa tiếng mẹ đẻ mọi câu · gợi ý tăng dần (không trừ XP) · gõ khó → chuyển ngân hàng chữ · thanh KIỂM TRA ghim đáy · tấm đúng/sai có đáp án + giải thích 1 dòng + loa · màn mở bài (mục tiêu + từ mới) · màn kết (XP, %, từ cần ôn) · COMBO/chuỗi.

## 3. Ma trận dạng bài (dữ liệu thiếu → KHÔNG sinh dạng đó)
| Dạng | Lời dặn | Đề (nguồn) | Ô trả lời | Gợi ý (tăng dần) | Chấm |
|---|---|---|---|---|---|
| `build` | Xếp câu tiếng Anh | bản dịch CÂU (ngôn ngữ người học) + loa | 2 dòng ô kẻ + ngân hàng ô chữ (+2 nhiễu) | ô đầu tiên → ô kế | chuỗi ô = câu |
| `type` | Gõ từ tiếng Anh | nghĩa tiếng mẹ đẻ đậm + định nghĩa EN nhỏ + loa/chậm | ô chữ cái theo độ dài + ô gõ | chữ đầu (sẵn) → mở 1 chữ → ngân hàng chữ | = từ (bỏ hoa/thường) |
| `gap` | Chọn từ còn thiếu | câu có chỗ trống + bản dịch câu | 4 thẻ | bỏ 1 phương án | đúng thẻ |
| `tr` | Dịch câu này | câu tiếng mẹ đẻ | ô chữ EN | ô đầu | chuỗi ô |
| `mean` | Chọn từ đúng | nghĩa tiếng mẹ đẻ | 4 thẻ | bỏ 1 | đúng thẻ |
| `say`/`pic`/`match` | giữ như cũ + nghĩa tiếng mẹ đẻ | | | | |

## 4. Luật nội dung (CI `lesson-content.mjs`, chạy MỌI từ chủ đề × mọi dạng × 15 ngôn ngữ)
Lời dặn khớp dạng · đề `build`/`tr` là bản dịch câu (không phải định nghĩa, không trùng `def`) · đáp án có trong ngân hàng ô · có ≥1 gợi ý · có nghĩa tiếng mẹ đẻ (thiếu → không sinh dạng cần nó, không rơi về EN) · câu 3–14 từ chứa đúng từ học · nhiễu không trùng đáp án.

## 5. Khung & trang chủ
- Top-bar trang chủ: nút đổi ngôn ngữ (🌐 + mã, 15 ngôn ngữ, dùng `App.langPicker`) + avatar; dải 4 thẻ có NHÃN: Mục tiêu · Chuỗi ngày · XP · Mục tiêu ngày.
- Thẻ unit: "UNIT 1 · EDUCATION", tên bài thật, "Bạn sẽ học 4 từ: …", chip phút/số bài/CEFR.
- Màn bài: khung `focus` (X + thanh + 1 chip COMBO/Câu n/N), bỏ avatar + chip kỳ thi, giáo viên đứng đủ người chạm nền (không đường cắt), KIỂM TRA ghim đáy, ô gõ tắt spellcheck/autocorrect, X/Esc/Back → tấm "Rời bài?".
- Thêm: màn mở bài (mục tiêu + từ mới), màn kết (đã có, thêm từ cần ôn), icon Kit cho tấm báo lỗi.

## 6. Thứ tự làm (sau khi anh OK ảnh)
1. Engine + dữ liệu: bản dịch câu 15 ngôn ngữ (sinh trên CI, `web/packs/sent-<lang>.json` tải lười) + gợi ý + ma trận; test nội dung CI. 2. Port 4 màn Stitch (sáng/tối) + khung focus + giáo viên. 3. i18n 15 ngôn ngữ. 4. Luật bot QA (sau khi PR #270 gộp).
