# Kho từ vựng – một nguồn sự thật (đọc khi sửa từ vựng)

- **Nguồn duy nhất**: `web/js/data.js` + `web/js/lib/*.js` (dòng `[word, ipa, pos, vi, def, ex, col, syn, level, emoji, ipaUS?]`) + sửa tay `content/lexicon/overrides.json` (khóa `từ#loại` cho mọi bộ, `từ#loại@bộ` cho một bộ).
- **Không sửa** `extension/app/js/**` bằng tay: là bản chép (build-extension.sh / build-lexicon). Mobile build từ `dist/` = cùng nguồn.
- Sau khi sửa: `node scripts/build-lexicon.mjs --write` (chuẩn hóa + chép add-on + `dist/lexicon.json`). Cổng `node scripts/build-lexicon.mjs` (dict-consistency) chạy trong `npm test` và `mergecheck.sh`: lỗi khi nguồn chưa chuẩn hóa, bản chép lệch, IPA có ký hiệu ngoài bảng, cùng `từ#loại` khác nghĩa vi, IPA Mỹ phủ < 97% từ đơn.

## Quy tắc chuẩn hóa (scripts/build-lexicon.mjs, scripts/lexicon/ipa.mjs)
1. **Nghĩa vi theo từ#loại**: nhiều bộ khác nghĩa → nghĩa của nhiều bộ nhất (hoà: NGSL → chủ đề → kỳ thi → AWL/NAWL → TOEIC → chuyên ngành) đứng đầu, nghĩa khác gộp sau `; `, bỏ trùng, tối đa 3 nghĩa thêm. Nghĩa 1 sai → sửa trong overrides.json.
2. **IPA Anh (Oxford)**: ký hiệu hỏng (ʍ ʔ ʈ ᵻ ᵿ t͡ʃ ä ̃) → chuẩn; r cuối âm tiết kiểu Mỹ → RP (giữ r nối trước nguyên âm, giữ `(r)`); bỏ ˈ ở từ 1 âm tiết (đếm âm tiết bảo thủ: phụ âm thành âm tiết ˈbɒtl, ˈfaɪnl giữ ˈ).
3. **IPA Mỹ**: `content/lexicon/ipaus-manual.json` (viết tay) thắng; còn lại CMUdict → IPA kiểu Oxford US (ɑː ɔː iː uː oʊ ɜːr ər, không flap). Biến thể CMU chọn theo vị trí trọng âm của IPA Anh (record n/v). Trọng âm phụ chỉ giữ khi đứng trước ˈ cách ≥ 1 âm tiết. Chính tả Anh → Mỹ khi tra (analyse→analyze). Cụm: hư từ dạng yếu, trọng âm theo bản Anh. Trùng IPA Anh → để trống (giao diện dùng IPA Anh).
4. Làm mới CMUdict: `curl -o $TMPDIR/cmu.dict https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict && node scripts/build-lexicon.mjs --cmu $TMPDIR/cmu.dict --write`.

## CEFR
Cấp độ do người soạn; `content/wordlists/cefr-oxford.json` chỉ có cấp công khai cho NAWL/BSL. Kiểm tra: `node scripts/lexicon/cefr-check.mjs` (tần suất NGSL + độ dài/hình vị) chỉ **gắn cờ** mục lệch ≥ 2 bậc vào `content/lexicon/cefr-flags.json`, không tự đổi.

## Nghĩa 13 ngôn ngữ (P1)
- `web/packs/<lang>.json`: `"từ"` → `[nghĩa, cờ, tin cậy]`; `"từ#loại"` cho từ có ≥ 2 từ loại. Cờ 2 = dịch theo nghĩa + từ loại (đầu vào: từ, loại, định nghĩa Anh, ví dụ). Tin cậy 1 = AI duyệt ≤ 3/5 → app hiện nhãn "Dịch máy" (chỉ khi đó).
- CI `lexicon-i18n.yml` (04:30 VN, 120 lần gọi × 25 mục): `scripts/lexicon/i18n-job.mjs` → `/api/lexai` (xác thực JWT OIDC GitHub, không secret) → kho khóa Gemini miễn phí xoay vòng → Workers AI. Thứ tự: ko, th, hi, zh, ja, ar, rồi es pt fr de id ru tr. Tiếp tục từ chỗ dừng (mục chưa cờ 2 / chưa điểm).
- Bảng tay `content/wordlists/*.gloss.json` luôn thắng (đã sửa ward/support/level/express/motor/instrument/lobby/shaft/refer cho ngôn ngữ ưu tiên). `word-packs.yml` (gtx) chỉ điền từ còn thiếu, không đè cờ 2.

## Giọng đọc từ (P2)
- CI `word-audio.yml` (01:00 VN, 300 từ/đêm): `scripts/gen-word-audio.mjs` Kokoro bf_emma (Anh) + af_heart (Mỹ) → `web/audio/w/<fnv(giọng|từ)>.mp3` → audio.lexkite.com/audio/w/. `web/audio/w/index.txt` = từ đã đủ 2 giọng (gen-newtab đặt `k: 2`).
- App: `UI.speak` thử file từ (từ có trong kho, đang online), lỗi → giọng máy và nhớ trong phiên. Add-on tab mới: `k: 2` → file Anh/Mỹ, còn lại giọng máy.

## Hiển thị
- `--font` theo `:root:lang()` (Be Vietnam Pro cho Latin + Noto/hệ thống cho Thái, CJK, Ả Rập, Devanagari; 0 KB tải font). `--ipa` có Charis/Doulos/Segoe/Noto/DejaVu. ja/zh `line-break: strict`, ko `word-break: keep-all`. Add-on popup/tab mới: font theo ngôn ngữ, RTL giữ IPA/từ tiếng Anh ltr.

## Mảnh tra từ (Lex) – mọi giao diện đọc cùng một bản dựng (23/10)
- Dựng: `scripts/lexicon/shards.mjs` chạy CHÍNH `data.js` + gói `words`/`tsl` (thứ tự lấy từ `BUNDLES` trong app.js) trong vm → `IELTS_DATA.INDEX` y như trình duyệt → `dist/data/lex-index.json` (no-cache, ~2,3 KB br) + `dist/data/lex/c/<hash>.json` (279 mảnh lõi ≈ 2,7 KB br, immutable) + `dist/data/lex/<lang>/<hash>-<j>.json` (nghĩa 13 ngôn ngữ, mảnh j phủ 4 mảnh lõi) + `top.<hash>.json` (300 từ NGSL đầu, tải khi bấm ô tìm). Sinh lúc `build-web.sh` (không commit; `web/data/lex*` gitignore). Mobile bỏ mảnh ngôn ngữ (dùng gói lexkite.com như packs).
- Mảnh kèm `r` (dạng bất quy tắc → gốc, từ `LK_VERBS.irregularList()` + số nhiều bất quy tắc), `f` (không dấu → có dấu), `a` (từ có file Kokoro). Trường mới của mục từ (vd. `img` theo nghĩa) chỉ cần có trong `data.js`/`T()` – mảnh tự mang theo, cổng tự so.
- Máy khách `web/js/lex.js` (ngoài khung app, nạp lúc rảnh; add-on SW `importScripts`, popup `<script>`): `Lex.norm` (NFC, hoa thường, nháy/gạch cong, mép dấu câu; không dấu chỉ là dự phòng: resume ≠ résumé) → khớp đúng → không dấu → bất quy tắc → quy tắc (-s/-es/-ies/-ed/-ing/-er/-est, phụ âm đôi) → cụm động từ (went up → go up, looking it up → look up). Bộ nhớ: đã parse trong RAM → IndexedDB `lk-lex` (khóa = đường dẫn có hash, LRU 400 tệp) → mạng; nhiều lời gọi cùng mảnh = 1 lần tải. Mục lục: bản IndexedDB dùng ngay + hỏi bản mới (đổi kho → hash mới → tự hết hạn). Không có mảnh/mất mạng → dự phòng `IELTS_DATA.INDEX` cùng chuẩn hóa.
- `INDEX` không còn phụ thuộc thứ tự nạp gói: hạng bộ `topics < writing < speaking < awl < core < office < toeic < domain < exam < nawl < bsl`, cùng hạng thì nạp trước thắng.
- Dùng: `Dict.quick/lookup` (web, add-on, mobile) lấy mục kho qua Lex (từ có trong kho hiện ngay, không chờ Google/Wiktionary; IPA Mỹ theo kho, không ghép với US của nguồn ngoài; bản lưu ≤ 14 ngày được phủ trường kho mới); gợi ý tìm `Lex.suggest` (1 mảnh/tiền tố, gõ nhanh không đè kết quả); nghĩa bản địa `App.nativeFill` & add-on `mean` = mảnh ngôn ngữ (thiếu → gói → dịch máy; `dir=auto` cho ar); `UI.speak` hỏi `Lex.peekAu` (không tải file 404). Trang `#/dict` không chờ 2,3 MB gói từ nữa (chỉ `vcore`, `uidx`; gói đủ nạp khi người dùng ngừng gõ để vẽ thêm cụm từ).
- Cổng: `node scripts/build-lexicon.mjs` (dict-consistency) gọi `scripts/lexicon/surfaces.mjs` – mảnh = INDEX từng mục, tab mới add-on (`extension/nt`, sinh bằng `gen-newtab.mjs` theo mục chính + ghi chú `web/js/notes/*.json`) = INDEX ở IPA Anh/Mỹ/CEFR/nghĩa đầu, bản chép add-on `lex.js`/`dictionary.js`, `TOPIC_IDS` blog, khóa gói nghĩa. `node scripts/test/lex.mjs` (chuẩn hóa, biến tố, cụm động từ, ngôn ngữ thiếu, đổi phiên bản, gõ nhanh, offline, âm thanh, IPA). Hiển thị thật + số đo: CI `dict-perf.yml` (`scripts/test/dict-perf.mjs`, so trước/sau, bảng ở Summary).
