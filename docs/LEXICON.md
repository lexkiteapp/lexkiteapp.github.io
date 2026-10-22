# Kho từ vựng – một nguồn sự thật (đọc khi sửa từ vựng)

- **Nguồn duy nhất**: `web/js/data.js` + `web/js/lib/*.js` (dòng `[word, ipa, pos, vi, def, ex, col, syn, level, emoji, ipaUS?]`) + sửa tay `content/lexicon/overrides.json` (khóa `từ#loại` cho mọi bộ, `từ#loại@bộ` cho một bộ).
- **Không sửa** `extension/app/js/**` bằng tay: là bản chép (build-extension.sh / build-lexicon). Mobile build từ `dist/` = cùng nguồn.
- Sau khi sửa: `node scripts/build-lexicon.mjs --write` (chuẩn hoá + chép add-on + `dist/lexicon.json`). Cổng `node scripts/build-lexicon.mjs` (dict-consistency) chạy trong `npm test` và `mergecheck.sh`: lỗi khi nguồn chưa chuẩn hoá, bản chép lệch, IPA có ký hiệu ngoài bảng, cùng `từ#loại` khác nghĩa vi, IPA Mỹ phủ < 97% từ đơn.

## Quy tắc chuẩn hoá (scripts/build-lexicon.mjs, scripts/lexicon/ipa.mjs)
1. **Nghĩa vi theo từ#loại**: nhiều bộ khác nghĩa → nghĩa của nhiều bộ nhất (hoà: NGSL → chủ đề → kỳ thi → AWL/NAWL → TOEIC → chuyên ngành) đứng đầu, nghĩa khác gộp sau `; `, bỏ trùng, tối đa 3 nghĩa thêm. Nghĩa 1 sai → sửa trong overrides.json.
2. **IPA Anh (Oxford)**: ký hiệu hỏng (ʍ ʔ ʈ ᵻ ᵿ t͡ʃ ä ̃) → chuẩn; r cuối âm tiết kiểu Mỹ → RP (giữ r nối trước nguyên âm, giữ `(r)`); bỏ ˈ ở từ 1 âm tiết (đếm âm tiết bảo thủ: phụ âm thành âm tiết ˈbɒtl, ˈfaɪnl giữ ˈ).
3. **IPA Mỹ**: `content/lexicon/ipaus-manual.json` (viết tay) thắng; còn lại CMUdict → IPA kiểu Oxford US (ɑː ɔː iː uː oʊ ɜːr ər, không flap). Biến thể CMU chọn theo vị trí trọng âm của IPA Anh (record n/v). Trọng âm phụ chỉ giữ khi đứng trước ˈ cách ≥ 1 âm tiết. Chính tả Anh → Mỹ khi tra (analyse→analyze). Cụm: hư từ dạng yếu, trọng âm theo bản Anh. Trùng IPA Anh → để trống (giao diện dùng IPA Anh).
4. Làm mới CMUdict: `curl -o $TMPDIR/cmu.dict https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict && node scripts/build-lexicon.mjs --cmu $TMPDIR/cmu.dict --write`.

## CEFR
Cấp độ do người soạn; `content/wordlists/cefr-oxford.json` chỉ có cấp công khai cho NAWL/BSL. Kiểm tra: `node scripts/lexicon/cefr-check.mjs` (tần suất NGSL + độ dài/hình vị) chỉ **gắn cờ** mục lệch ≥ 2 bậc vào `content/lexicon/cefr-flags.json`, không tự đổi.
