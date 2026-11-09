# Quy trình đa ngôn ngữ Lexkite (bắt buộc cho mọi tính năng, mọi lần mở rộng)

> TL;DR: Quy trình 15 ngôn ngữ giao diện: nguồn chuẩn duy nhất, quy tắc thêm chữ mới, kiểm tra tự động, mở thêm ngôn ngữ, SEO/blog theo ngôn ngữ. Không lẫn tiếng, không sót.
> Đọc khi: MỌI việc thêm chữ giao diện.

Mục tiêu: 15 ngôn ngữ giao diện, **không lẫn tiếng, không sót, không chồng chéo**, nghĩa chuẩn như app bản địa.

## 1. Nguồn chuẩn duy nhất
| Lớp | Ở đâu | Ai viết |
|---|---|---|
| Khóa (chuỗi gốc) | Tiếng Việt trong mã: `t('Ôn tập')` | Người viết tính năng |
| Tiếng Anh | `web/js/i18n/en/<nhóm>.js` → gộp thành `en.js` bằng `scripts/build-i18n.sh` | Viết tay, cùng commit với tính năng |
| 13 ngôn ngữ khác – **nguồn** | `i18n/ui/<lang>.js` + `i18n/ui/<lang>/<nhóm>.js` (danh sách: `scripts/i18n-langs.txt`), khóa = nguyên câu tiếng Việt | Dịch máy từ tiếng Anh (`scripts/gen-i18n.mjs`, chạy trong GitHub Action); sửa tay được |
| 13 ngôn ngữ khác – **gói chạy** | `web/js/i18n/<lang>.js` + `web/js/i18n/<lang>/<nhóm>.js`, khóa băm | **Sinh** bằng `node scripts/i18n-pack.mjs` – đừng sửa tay |
| Bản dịch tay | `scripts/i18n-fixed.json` | Viết tay – **luôn đè lên dịch máy** (`scripts/i18n-fix.mjs`) |

Một khóa chỉ có **một** bản tiếng Anh: không khai báo trùng khóa ở hai file `en/*.js` (bản sau sẽ đè bản trước).

### 1b. Gói chạy khóa băm (từ 3/11/2026)
- Trước 3/11 mỗi gói ngôn ngữ lặp nguyên câu tiếng Việt làm khóa: 3,5 MB trên 7,9 MB chỉ là khóa. Nay **nguồn** (dễ đọc, như cũ) nằm ở `i18n/ui/`, ngoài `web/` (không triển khai, không tính ngân sách `totalJs`). **Gói chạy** trong `web/js/i18n/<lang>` lưu khóa `hk(câu)` = `"_"` + FNV-1a 32 bit base36 (≤ 8 ký tự). Đo 3/11: web/js bớt 2 764 645 B; mỗi người học tải ít hơn ~30 % gzip (de: 193 → 134 KB nếu mở hết nhóm).
- Tra cứu: `web/js/i18n.js` thử `D[lang][câu]` rồi `D[lang][hk(câu)]` (chỉ khi en có khóa đó → chuỗi lạ không trùng nhầm). Hai khóa trùng băm, hoặc khóa có bản dịch mà en không có → gói giữ **nguyên câu** làm khóa. Khóa nguyên câu dạng `_abc12` bị cấm (lỗi khi dựng).
- Mã cần tra một ngôn ngữ cụ thể: `I18N.has(l, câu)` / `I18N.tr(l, câu)` – **không** đọc `I18N_DICT[l][câu]`. Add-on: `xd(src)` trong `extension/{background,content,popup,writecheck}.js` (tra băm trước, vì nền en của background giữ khóa nguyên câu). Script Node đọc **nguồn**: `loadLang(lang)` / `loadSrc(lang, nhóm)` trong `scripts/lib/i18n-pack.mjs`.
- Ai sinh lại gói: `build-i18n.sh`, `gen-i18n.mjs`, `i18n-fix.mjs`, `confidence/build.mjs --write`, `build-extension.sh`, `mergecheck.sh`; bot `i18n.yml` add cả `i18n/ui` lẫn `web/js/i18n`. Kiểm: `node scripts/i18n-pack.mjs --check` (trong `i18n-qa.mjs`) và `scripts/test/i18n-pack.mjs` (ghép lại 100 % chuỗi mọi ngôn ngữ, trùng băm, chạy thật `i18n.js` từng ngôn ngữ, add-on).
- **PR đang sửa `web/js/i18n/<lang>/…` (không phải en)**: chuyển thay đổi sang `i18n/ui/<lang>/…` rồi `node scripts/i18n-pack.mjs`. Xung đột ở gói chạy: lấy bên nào cũng được rồi chạy lại `i18n-pack` (preview-resolve hợp khóa cả `i18n/ui/**`).

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

Khóa chỉ module tải lười dùng nằm ở `en/lazyui.js` (gói `i18nl`, App.need luôn nạp trước), không ở `en.js` (khung app); khóa khung cần ngay → `en/xcore.js`. `node scripts/test/shell-size.mjs --keys` liệt kê khóa nên chuyển.

`node scripts/test/i18n-switch.mjs --scan` (t() lúc nạp module, báo file:dòng) và `i18n-switch.mjs` (dùng app bằng tiếng Việt → đổi sang es/ja/ar, từ điển về muộn → quét chữ tiếng Việt) chạy trong `npm test`.

Khóa thiếu → giao diện tự hiện tiếng Anh (en.js nạp trước), không bao giờ hiện tiếng Việt.

### Nội dung bài học viết gốc tiếng Anh (O5)
Khóa có `content/i18n/en-src/*.json` { "<chuỗi vi>": "<en GV bản xứ>" }: `gen-content-i18n.mjs` cho en hiện thẳng bản gốc, L1 dịch **từ en** (dấu `content/i18n/from-en.json`, dịch lại khi en đổi); bản đã sửa `content/i18n/native-fixed.json` đứng trên hết. `i18n-native-score.yml` (dispatch, 4 shard): A dịch ngược L1→en, B khác họ chấm 1–5 → `content/i18n-native-score.json` (content-score đọc `avg`); cổng avg ≥ 4,3, không mục < 3,5; `--fix` viết lại mục < 4 thẳng từ en. Rút khóa một bài: `node scripts/i18n-native-score.mjs --keys <id>`. Test: `scripts/test/i18n-native-score.mjs`.

## 4. Luồng chạy
1. Viết tính năng + `en/*.js` (+ `i18n-fixed.json` cho nhãn ngắn) → `bash scripts/build-i18n.sh` (gộp en.js, tách nhóm ở nguồn `i18n/ui`, sinh gói khóa băm).
2. Ship (`scripts/i18n-sync.sh` tự dịch ngay khóa mới bằng curl + áp bản dịch tay + i18n-qa) → GitHub Action `i18n.yml`: `gen-i18n.mjs` cho từng ngôn ngữ (chỉ dịch khóa mới) → `i18n-fix.mjs` (áp bản dịch tay vào nguồn `i18n/ui`) → `i18n-pack.mjs` (gói khóa băm) → `i18n-qa.mjs` (báo cáo) → commit `i18n: cập nhật bản dịch giao diện tự động`.
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

## Nhóm ở web/cpack
Nhóm `pathn` (nội dung nút Lộ trình): nguồn và bản en như mọi nhóm, gói chạy 13 ngôn ngữ ra `web/cpack/lesson/pn-<lang>.js` (`CPACK_GROUP` trong `scripts/lib/i18n-pack.mjs`), nạp qua `App.pathnPack` cùng dữ liệu nút; `scan-roots` và `i18n-pack` kiểm.

**Chữ app native bị khóa** (#983): `i18n-fix.mjs` luôn đặt lại khóa nằm trong `native/shared/strings.json` theo đúng chữ đã phát hành ở `native/shared/gen/strings/<lang>.json`, nên bot dịch lại không làm trôi native được. Trong `i18n.yml`, bước `gen.mjs --check` chạy trước commit: đỏ thì không commit. Muốn đổi chữ native: mở PR, chạy `I18N_NATIVE_UNLOCK=1 node scripts/i18n-fix.mjs && node scripts/native/gen.mjs` và cập nhật ảnh trong cùng PR. Test: `scripts/test/native-strings-locked.mjs`.
