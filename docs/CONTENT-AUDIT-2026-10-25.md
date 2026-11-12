# Kiểm định nội dung học – 25/10/2026

> TL;DR: Kiểm định nội dung học 25/10: mẫu ngẫu nhiên, lớp lỗi toàn kho 9.588 dòng, sửa tại nguồn, cổng mới và hàng sinh lại. Không xóa nội dung để giấu lỗi.
> Đọc khi: tra lịch sử sửa lỗi nội dung.

Người soát: Claude (giáo viên tiếng Anh + ngôn ngữ học), KHÔNG gọi AI (GrabCast tắt). Luật chủ: chất lượng chỉ đi lên –
không xoá nội dung để giấu lỗi; sửa tận nguồn theo LỚP lỗi, hoặc đưa vào `content/qa/regen-queue.json` (vẫn hiển thị).

## 1. Mẫu (ngẫu nhiên có hạt giống, tái lập được)
Bộ chọn mulberry32, hạt `20261025`, rút không hoàn lại từ từng nguồn (kịch bản ở mục 7). Tổng **406 mục**.

| Loại | Nguồn | n | Lỗi trước | Lỗi sau |
|---|---|---|---|---|
| Từ vựng (nghĩa, IPA, từ loại, CEFR, ví dụ, vi) | `web/js/lib/*.js`, `web/js/data.js` | 110 | 16 (14,5 %) | 0 |
| Ghi chú / mẹo nhớ (Smart Learn 💡) | `web/js/notes/*.json` | 45 | 1 (2,2 %) | 0 |
| Câu hỏi trắc nghiệm (ngữ pháp + TOEIC P5) | `GRAMMAR[].quiz`, `TOEIC.reading` | 50 | 0 | 0 |
| Bài ngữ pháp (ví dụ, ✗/✓) | `web/js/grammar` | 25 | 0 | 0 |
| Giao tiếp tự tin (cụm câu) | `content/confidence/units` | 45 | 0 | 0 |
| Hội thoại (Confidence, Call Mia, Roleplay) | units · `web/js/call` · `web/js/roleplay` | 35 | 0 | 0 |
| Mini-quiz blog (en/vi) | `content/blog/*` front matter | 35 | 1 (2,9 %) | 0 |
| Phát âm (từ, cặp tối thiểu, câu) | `web/js/pron` | 40 | 0 | 0 |
| Bản dịch ar/ja/es (quiz blog + i18n Confidence) | `content/blog/{ar,ja,es}`, `content/confidence/i18n` | 21 | 0 | 0 |
| **Tổng** | | **406** | **18 (4,4 %)** | **0** |

Ngoài mẫu (khi lần theo lớp lỗi) còn thấy: gói nghĩa ja/ar dịch máy lệch nghĩa chính (`big` → ビッグ, `golden` → ゴールデン, 良い).
Kết luận: nội dung soạn tay (ngữ pháp, quiz, Confidence, hội thoại, phát âm) rất sạch; **lỗi tập trung ở kho từ vựng**
(dữ liệu nhập từ NGSL + IPA Mỹ tự sinh từ CMUdict) – vì vậy quét toàn kho theo lớp.

## 2. Lớp lỗi (toàn kho 9 588 dòng, quét tất định)
| # | Lớp | Ví dụ | Trước | Sau | Gốc |
|---|---|---|---|---|---|
| L1 | Nghĩa vi trùng chữ tiếng Anh | `big` = "to, lớn" → Smart Learn hiện phương án **"to"** (chủ thấy); `due to` = "do"; `print` = "in"; `framework` = "…, framework" | 13 | 0 | dữ liệu |
| L2 | Nghĩa vi lặp khúc (gộp nghĩa giữa các bộ) | `venue` "địa điểm tổ chức; địa điểm (tổ chức)" | 16 dòng | 0 | gộp nghĩa trong `build-lexicon` |
| L3 | Từ loại ↔ định nghĩa lệch (NGSL gắn nghĩa danh/tính từ cho mục động từ) | `bear` v = "large brown animal…", vi "chịu đựng; con gấu"; `close` v = "next to…" + IPA Mỹ /kloʊs/ | 18 | 0 | dữ liệu NGSL |
| L4 | Định nghĩa không khớp nghĩa của câu ví dụ | `power` (quyền ↔ "cut off the power"), `conclude`, `golden`, `altogether` | 4 (mẫu) | 0 | dữ liệu |
| L5 | IPA từ đơn có 2 trọng âm chính | `halfway` /ˈhæfˈweɪ/, `engineer` /ˈendʒəˈnɪr/, `e-commerce` | 63 | 0 | bộ đổi CMUdict→IPA |
| L6 | IPA Mỹ sai biến thể/trọng âm (CMUdict) | `undermine` /ˈʌndərmaɪn/, `email` /iˈmeɪl/, `use` v /juːs/, `FYI` = "for your information" | 131 lệch trọng âm chưa giải thích | 0 (66 khác biệt Anh–Mỹ thật → danh sách trắng) | chọn biến thể CMU |
| L7 | EH0 đầu từ đọc /e/ | `enable` /eˈneɪbl/, `essential`, `ensure`… | ~45 | 0 | bộ đổi CMU |
| L8 | IPA Anh kiểu Wiktionary | /sɪnts/, /ˈkʌmpftəbəl/, /streŋkθ/, /ˈhwɪspə/, /ɪŋˈkredɪbl/, 'a'/'ʌɪ', `healthcare` /ˈheltkeʌ/ | 73 dòng + 12 tay | 0 | dữ liệu nhập |
| L9 | Hư từ dạng MẠNH giữa cụm | `a stone's throw` /eɪ …/, `a double-edged sword` /eɪ …/ | 4 | 0 | dữ liệu |
| L10 | IPA Anh sai từ loại | `collect` v /ˈkɒlɪkt/ (danh từ "lời nguyện"), `wind down` /wɪnd/, `intern` n /ɪnˈtɜːn/ | 12 | 0 | dữ liệu |
| L11 | CEFR lệch | `leverage` B1, `denominate` B1, `trail` C1 | 3 (mẫu) | 0 | dữ liệu |
| L12 | ✗/✓ trong ghi chú gán "Sai" cho câu đúng | `sustain development` | 1 | 0 | Antigravity sinh |
| L13 | Tiếng Việt trích như tiếng Anh trong ghi chú | `big data`: "Dữ liệu 'to'…" | 1 | 0 | Antigravity sinh |
| L14 | Quiz blog 2 đáp án cùng chấp nhận được | "plays ___ piano": Ø (Mỹ thân mật) vs the | 1 | 0 | bài vi |
| L15 | Dịch máy gói nghĩa lệch nghĩa chính / lặp | ja `big`, `loud` 派手, `golden`, `a` ある; ar `power` "قوة, القوة" | 5 (soát) | 5 sửa tay, cả gói → hàng sinh lại | i18n-job |

## 3. Sửa tại nguồn
- **Bộ đổi CMUdict → IPA Mỹ** (`scripts/lexicon/ipa.mjs`, `build-lexicon.mjs`): chỉ 1 ˈ (trùng trọng âm ô Anh, không có thì cái cuối) – L5;
  chọn biến thể CMU có trọng âm khớp ô Anh; EH0 đầu từ → /ɪ/ – L7; từ có gạch nối lấy trọng âm theo khúc của ô Anh (`/ˌkʌtɪŋˈedʒ/`).
- **Chuẩn hoá ô Anh** `normUK()` chạy mỗi lần build: bỏ t/p/k chen, hw cổ, ŋ đồng hoá ở tiền tố in-/en-/con-, 'a'→æ, 'ʌɪ'→aɪ,
  hư từ dạng yếu giữa cụm – L8, L9 (73 dòng tự sửa, idempotent).
- **Sửa tay có lý do** (`content/lexicon/overrides.json` +~70 mục: vi, def, level, ipa; `ipaus-manual.json` +45 IPA Mỹ) – L1–L4, L6, L10, L11.
- **Danh sách trắng khác biệt Anh–Mỹ thật** `content/qa/ipa-us-stress-ok.json` (66 từ: garage, laboratory, magazine, vaccine…).
- Ghi chú `web/js/notes/{b,s}.json` (L12, L13); quiz `content/blog/vi/loi-dung-mao-tu-a-an-the.md` đổi phương án (L14);
  gói `web/packs/{ja,ar}.json` + bảng tay `content/wordlists/core.gloss.json` (L15; bảng tay thắng ở lần dịch sau).
- Đồng bộ: `build-lexicon.mjs --write` (bản chép add-on `extension/app`), `gen-newtab.mjs` (`extension/nt`).

## 4. Cổng mới (tất định, lỗi CỨNG – `scripts/content-qa/gate.mjs`, test `scripts/test/content-qa.mjs`)
| Cổng | Lớp |
|---|---|
| `ipaDoubleStress` – từ đơn không được có 2 ˈ (cả ô Anh và Mỹ) | L5 |
| Trọng âm chính Anh ≠ Mỹ ⇒ phải có trong `ipa-us-stress-ok.json` | L6, L10 |
| `viHomographs` – khúc nghĩa vi không được là chữ tiếng Anh hay gặp (to, do, in, ban, men, pin…) | L1 |
| `viDup` – nghĩa vi không lặp khúc (bỏ ngoặc, "sự/thuộc…") | L2 |
| `verbDefOk` – mục `v` phải có định nghĩa động từ ("to …", trợ động từ "used …") | L3 |
| Quiz blog: đáp án trong phạm vi, phương án không trùng (so cả dấu câu), có lời giải | L14 |
| Test bộ đổi: `normUK`, `arpaToIpa` (1 ˈ, EH0) | L5, L7, L8, L9 |

Đã có từ trước, giữ nguyên: lược đồ/đáp án ngữ pháp, ✗/✓, CEFR, dịch (chữ viết bản địa, lẫn tiếng Việt), 2 giám khảo, kiểm mẫu lô.
Chưa có cổng tất định (cần giám khảo): L4 (định nghĩa ↔ ví dụ), L11 (CEFR), L12/L13 (ghi chú), L15 (chất lượng dịch).

## 5. Hàng sinh lại (`content/qa/regen-queue.json`, 290 mục)
- `meaning-i18n` (42): mục đã đổi nghĩa vi/định nghĩa → dịch lại nghĩa 13 ngôn ngữ (`lexicon-i18n.yml`).
- `pack-quality` (4 + cả gói cờ 1 ja/ar/es): dịch máy lệch nghĩa chính – dịch lại + 2 giám khảo.
- `ipa-review` (241): khung phụ âm Anh ≠ Mỹ (phần lớn là khác biệt thật: /tj/~/tʃ/, schedule; phần còn lại là lỗi CMU) – soát tay/giám khảo.
- `notes-review` (3+): mẹo nhớ "từ nguyên dân gian" trình bày như gốc từ (belong = be + long "lâu") – giám khảo soát mọi `m` có tách gốc.

## 6. Kiểm chứng
`npm ci --ignore-scripts` → chuỗi `npm test` (trừ `ext-sync`: đỏ sẵn trên HEAD sạch vì `css/vendor` chỉ có sau postinstall) ✓ ·
`node scripts/content-qa/gate.mjs` ✓ · `node scripts/build-lexicon.mjs` ✓ dict-consistency.

## 7. Tái lập mẫu
Rút theo thứ tự: 110 dòng kho từ (`loadAll`), 45 ghi chú, 35 quiz ngữ pháp + 15 TOEIC P5, 25 bài ngữ pháp (3 ví dụ/bài),
45 cụm Confidence, 35 lượt hội thoại, 35 quiz blog en/vi, 40 mục phát âm, 12 quiz blog ar/ja/es + 3 khoá i18n Confidence/ngôn ngữ.
Hàm ngẫu nhiên mulberry32(20261025), mỗi lần rút `splice(floor(R()·n))`.
