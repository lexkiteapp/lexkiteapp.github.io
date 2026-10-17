# Quy trình đa ngôn ngữ Lexkite (bắt buộc cho mọi tính năng, mọi lần mở rộng)

Mục tiêu: 15 ngôn ngữ giao diện, **không lẫn tiếng, không sót, không chồng chéo**, nghĩa chuẩn như app bản địa.

## 1. Nguồn chuẩn duy nhất
| Lớp | Ở đâu | Ai viết |
|---|---|---|
| Khóa (chuỗi gốc) | Tiếng Việt trong mã: `t('Ôn tập')` | Người viết tính năng |
| Tiếng Anh | `web/js/i18n/en/<nhóm>.js` → gộp thành `en.js` bằng `scripts/build-i18n.sh` | Viết tay, cùng commit với tính năng |
| 13 ngôn ngữ khác | `web/js/i18n/<lang>.js` (danh sách: `scripts/i18n-langs.txt`) | Dịch máy từ tiếng Anh (`scripts/gen-i18n.mjs`, chạy trong GitHub Action) |
| Bản dịch tay | `scripts/i18n-fixed.json` | Viết tay – **luôn đè lên dịch máy** (`scripts/i18n-fix.mjs`) |

Một khóa chỉ có **một** bản tiếng Anh: không khai báo trùng khóa ở hai file `en/*.js` (bản sau sẽ đè bản trước).

## 2. Quy tắc khi thêm chữ mới vào giao diện
1. Mọi chữ hiển thị đều qua `t()` (HTML tĩnh: `data-i18n`). Không ghép chuỗi kiểu `t('Ôn') + ' ' + n + t('thẻ')`; dùng biến `t('Ôn {n} thẻ', { n })`.
2. Thêm bản tiếng Anh ngay trong cùng commit (`node scripts/i18n-missing.mjs --strict` phải xanh).
3. Tiếng Anh phải **không mơ hồ** để dịch máy không sai: tránh "Resume" (bị dịch thành CV), "Look up" (bị dịch "nhìn lên"), "Go back over"… Viết rõ: "Continue", "See meaning", "Review again".
4. **Nhãn ngắn (≤ 3 từ)**: nút, tab, tiêu đề mục, tên điều hướng → thêm bản dịch tay cho đủ 13 ngôn ngữ vào `scripts/i18n-fixed.json`, theo cách các app học ngôn ngữ lớn đặt tên (vd. tab "Tôi" = Profil / マイページ / 내 정보).
5. Tên riêng & thuật ngữ thi giữ nguyên: Lexkite, IELTS, TOEIC, TOEFL, Band, Part 1, Task 2, Writing Task 2…
6. Nội dung học (nghĩa từ, giải thích) theo `I18N.learnLang()`; tên bài/chủ đề chưa dịch thì hiện tiếng Anh, **không bao giờ hiện tiếng Việt** ở giao diện ngôn ngữ khác (xem `grammar.js` hàm `TT`).
7. Không đưa mã nội bộ ra giao diện (p14, gt3, t1-energy…).
8. **Không gọi `t()` lúc nạp module** (mảng/đối tượng hằng ở đầu file/IIFE): từ điển `<lang>.js` nạp bất đồng bộ, chữ sẽ bị đóng băng tiếng Việt. Dùng hàm/getter: `const L = () => [t('…')]`, `{ get name() { return t('…'); } }`. Dữ liệu lưu (Store/đồng bộ) giữ **khóa** (`I18N.tk('khóa', {biến})`, dịch lúc vẽ), không lưu chữ đã dịch.

## 3. Kiểm tra tự động (chạy trong ship + Action)
`node scripts/i18n-qa.mjs` kiểm tra từng ngôn ngữ:
- đủ khóa so với `en.js`
- giữ nguyên biến `{n}` và thẻ HTML
- không còn chữ tiếng Việt có dấu (lẫn tiếng)
- không mắc lỗi dịch máy đã biết (danh sách `BAD` trong script – thêm mẫu mới khi phát hiện)
- `--short`: liệt kê nhãn ngắn chưa có bản dịch tay (mục tiêu: 0; đã đạt 0 ngày 15/10/2026 – tên riêng & thuật ngữ thi như "Writing Task 2" được giữ nguyên)

`node scripts/test/i18n-switch.mjs --scan` (t() lúc nạp module, báo file:dòng) và `i18n-switch.mjs` (dùng app bằng tiếng Việt → đổi sang es/ja/ar, từ điển về muộn → quét chữ tiếng Việt) chạy trong `npm test`.

Khóa thiếu → giao diện tự hiện tiếng Anh (en.js nạp trước), không bao giờ hiện tiếng Việt.

## 4. Luồng chạy
1. Viết tính năng + `en/*.js` (+ `i18n-fixed.json` cho nhãn ngắn) → `bash scripts/build-i18n.sh`.
2. Ship (`scripts/i18n-sync.sh` tự dịch ngay khóa mới bằng curl + áp bản dịch tay + i18n-qa) → GitHub Action `i18n.yml`: `gen-i18n.mjs` cho từng ngôn ngữ (chỉ dịch khóa mới) → `i18n-fix.mjs` (áp bản dịch tay) → `i18n-qa.mjs` (báo cáo) → commit `i18n: cập nhật bản dịch giao diện tự động`.
3. Sau mỗi đợt tính năng lớn: chạy `i18n-qa.mjs --short`, dịch tay thêm nhãn ngắn mới.

## 5. Mở thêm ngôn ngữ mới
1. Thêm mã vào `scripts/i18n-langs.txt` và `SUPPORTED` trong `web/js/i18n.js`; tên ngôn ngữ bản địa vào `LANGS`.
2. Action tự dịch toàn bộ; thêm cột ngôn ngữ đó vào **mọi** mục của `i18n-fixed.json`.
3. Add-on: thêm `extension/_locales/<lang>/messages.json`.
4. Store: mô tả & ảnh theo ngôn ngữ đó.
5. `i18n-qa.mjs` phải xanh cho ngôn ngữ mới trước khi bật cho người dùng.

## 6. SEO & blog theo ngôn ngữ
- Thư mục con theo ngôn ngữ trên cùng domain: `/vi/blog/`, `/en/blog/`, `/ja/blog/`… (không subdomain, không chia theo nước).
- `hreflang` + `x-default`; không chuyển hướng tự động theo IP.
- Chỉ mở blog một ngôn ngữ khi có bài bản địa hóa thật (từ khóa riêng thị trường đó), không dịch máy hàng loạt.
- Lối vào Blog trong app chỉ hiện khi `/<lang>/blog/rss.xml` tồn tại.
