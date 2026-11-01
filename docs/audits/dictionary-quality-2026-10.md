# Kiểm định từ điển Lexkite — 10/2026 (chỉ đọc)

> TL;DR: Audit chất lượng từ điển 10/2026. Báo cáo tại thời điểm đó.
> Đọc khi: tra chất lượng từ điển.
Kho: 8.177 từ duy nhất (9.588 dòng/104 bộ) ở `web/js/lib/*.js`+`data.js`. Mẫu tay 293 từ đơn, phân tầng A1–C2 (50/cấp; NGSL 100, AWL 30, TOEIC/BSL 45, chuyên ngành 48, đề thi 52, chủ đề 25). Nghĩa/ví dụ do Claude phán đoán (±3%); "kho" = quét máy 100%. Sandbox chặn dictionaryapi/Commons → chưa đo phủ giọng người; CMUdict đã đối chiếu.

## 1. Nguồn từng trường
- IPA Anh: tay + `fill-vocab.mjs` (Wiktionary RP), 100% có. IPA Mỹ `ipaUS`: chỉ 248 từ (3%).
- Âm thanh từ: KHÔNG có file; `speechSynthesis` của máy (khác nhau theo thiết bị), online thì `Dict.lookup` lấy bản ghi người (dictionaryapi/Commons). Kokoro (bf_emma/af_heart → audio.lexkite.com) chỉ cho bài nghe/câu, 0 từ đơn.
- Nghĩa vi: tay + `gen-wordlist.mjs` (gtx) + `*.fix.json`. 13 ngôn ngữ khác: `web/packs/<lang>.json` do `gen-word-packs.mjs` (gtx, 1 mục/TỪ, không theo từ loại); `core.gloss.json` tay chỉ ~170 từ. en = định nghĩa Anh.
- Định nghĩa Anh, ví dụ: tự soạn (không Tatoeba). CEFR, từ loại: tay; `cefr-oxford.json` chỉ NAWL/BSL.

## 2. Tỷ lệ lỗi (mẫu n=293 trừ khi ghi "kho")
| Trường | Lỗi | Ví dụ (hiện tại → đúng) |
|---|---|---|
| IPA ký hiệu hỏng (kho) | 37 (0,45%) | while `/ʍaɪl/`→`/waɪl/`; motorcycle `/ˈməʊʔəˌsaɪkl/`→`/ˈməʊtəsaɪkl/`; specialty `ʈ`→`t`; ton `/tɔ̃/`→`/tʌn/`; actually `ᵿ`→`ʊ`; `t͡ʃ`,`äʊ`→`tʃ`,`aʊ` |
| IPA sai (mẫu) | 6 = 2% | beer `/ˈbɪə/`→`/bɪə/`; that `/ðət/`→`/ðæt/`; musical `/ˈmjuzɪkəl/`→`/ˈmjuːzɪkl/`; creation `/ˈkriˈeɪʃən/`→`/kriˈeɪʃn/` |
| r kiểu Mỹ trong trường Anh (kho) | 53 (0,65%) | outperform `/ˌaʊtpəˈfɔrm/`→`/ˌaʊtpəˈfɔːm/` |
| ˈ thừa ở từ 1 âm tiết (kho) | 332 (4,1%) | cat `/ˈkæt/`→`/kæt/` (Oxford không ghi) |
| Thiếu trọng âm phụ | ~5% | invitation `/ɪnvɪˈteɪʃən/`→`/ˌɪnvɪˈteɪʃn/` |
| Nghĩa 1 sai/thiếu nghĩa chính | 9 = 3% | impression "lượt hiển thị" (thiếu "ấn tượng"); bitter "cay đắng" (thiếu "đắng"); highly "rất, cao"; podium "bục phát biểu" (=lectern); plateau (v) bỏ "cao nguyên" |
| Định nghĩa Anh lệch từ loại (kho) | present, record | present adj def "gift"; record n def "being the highest…" |
| Ví dụ lệch nghĩa/không tự nhiên | 4 = 1,4% | step (def "bậc thang", ví dụ nghĩa "bước"); unreal; administrate ("administrated"→administered) |
| Ví dụ quá khó so CEFR | ~8% A1–A2 | advertisement A2: "…junk food should be banned during children's programmes" |
| Ví dụ tên Tom/Mary (kho) | 4 (0,05%) | "Sorry, Tom, you are on mute." |
| CEFR đáng ngờ | ~12% | A1: diet, guess, false, terrible (Oxford A2–B1); B1: lessor, accrual, underwrite, yuan |
| Trùng nghĩa giữa bộ (kho) | 1.136 từ ở ≥2 bộ; 625 lệch nghĩa vi | promotion: 5 bộ, 4 chuỗi vi khác nhau; impression: "lượt hiển thị" (dom-mkt) vs "ấn tượng" (ngsl7); app lấy bộ gặp trước nên nghĩa 1 phụ thuộc bộ |
Ví dụ chứa từ khóa: ~100%; trùng ví dụ: 1.

## 3. 15 ngôn ngữ
Phủ: vi tay 100%; en 100%; 13 ngôn ngữ khác 100% từ khóa nhưng chỉ 41% (3.332) qua tinh chỉnh theo từ loại, 59% dịch từ trần không ngữ cảnh. Thử 30 từ đa nghĩa (left, mouse, floor, code, step, web, clip, court, claim, ward, shaft, motor, bust, input, mere, fool, raw, hedge, express, refer, support, level, item, instrument, lobby, plateau, buffer, ally, entry…); mẫu chủ ý khó nên tỷ lệ thực thấp hơn.
| Ngôn ngữ | Sai/30 | Ví dụ xấu |
|---|---|---|
| ko | ~9 | support→버티다; level→수준기; express→짜내다; ward→구 |
| th | ~7 | ward→ท้องที่(khu hành chính); motor→รถยนต์; instrument→ตราสาร |
| hi | ~6 | ward→परवरिश(giám hộ); lobby→पैरवी(vận động hành lang) |
| ar | ~5 | instrument→صك(chứng thư); express→أرسل سريعا; shaft→رمح(giáo) |
| ja | ~5 | refer→謀る; level→平準; hedge→生け垣(hàng rào) |
| zh | ~4 | ward→牢房; shaft→矿井; hedge→不置可否 |
| id, pt, ru | ~4–5 | id input→pemakaian; pt shaft→fuste; ru court→корт trước суд |
| fr, tr, es, de | ~2–3 | fr ward→quartier; de plateau(v)→Plateau (danh từ) |
| vi / en | ~3% / như §2 | — |
Lỗi hệ thống: (1) pack theo TỪ không theo loại: lead (n) hiện "führen" (động từ), plateau (v) ra danh từ ở 10/13 ngôn ngữ; (2) 13 ngôn ngữ dịch từ tiếng Anh trần, không dùng vi/def làm ngữ cảnh; (3) `web/i18n/content/*.json` chỉ phủ 3,7% nghĩa vi.
Hiển thị: `--font` Be Vietnam Pro→sans hệ thống, không Noto Thai/CJK/Arabic/Devanagari, không `:lang()`; `--ipa` = Lucida Sans Unicode/Arial Unicode MS (macOS) → Android/Linux dễ vỡ ʔ ᵻ. Không `word-break/line-break` cho ja/zh/th. RTL: `dir=rtl` + ~12 quy tắc, IPA/ví dụ ép `direction:ltr` (tốt); add-on (popup.css 0, newtab.css 2 quy tắc) chưa xử lý RTL.

## 4. So với Cambridge/Oxford (thiếu gì)
IPA Mỹ (có 3%); giọng người thật Anh+Mỹ mọi mục (không có file); nhiều nghĩa xếp theo tần suất (ta 1–3 nghĩa gộp, 3% sai thứ tự); ví dụ/nghĩa từ corpus (ta 1 ví dụ/từ); CEFR từng nghĩa (ta 1/từ, 12% ngờ); collocation/đồng nghĩa (col 59%, syn 31%); họ từ, thành ngữ, trọng âm danh/động từ (không có); bilingual tay (13 ngôn ngữ ta là máy dịch).

## 5. Nguồn nâng cấp $0
- IPA Mỹ: CMUdict (BSD-like) phủ 7.514/7.713 từ đơn, ARPAbet→IPA; ~1 ngày.
- Giọng người: Commons `En-uk-/En-us-*.ogg` + LinguaLibre (CC BY-SA/CC0, phải ghi tác giả, tải về audio.lexkite.com); phủ ước 25–40% từ thông dụng (chưa đo; đo bằng CI qua API titles).
- Kokoro (Apache-2.0, đã chạy `audio.yml`): phần còn lại ~16k clip ≈130 MB, 6–20 đêm; R2/Worker free.
- Ví dụ: Tatoeba CC BY 2.0 FR/Wiktionary CC BY-SA chỉ làm ứng viên (phải ghi nguồn); giữ quy ước tự soạn.
- LLM duyệt: mẫu `workers/mail/judge.js` (Gemini xoay khóa→Cloudflare AI), lô 15, ~90 mục/đêm → cần nâng lô/nhiều đêm trong free quota.

## 6. Một nguồn sự thật
Hiện nhiều bản: `web/js/lib` (gốc); `extension/app/js/lib` (bản chép của `build-extension.sh`, đã LỆCH: ngsl 999 dòng, bsl 270, awl 233); `mobile/www` (không gói packs); `web/packs` và `extension/academic.json` sinh riêng; add-on tra từ lạ qua dictionaryapi/gtx nên nghĩa khác app.
Kế hoạch: (1) gốc = `web/js/lib`+`*.fix.json`; thêm `build-lexicon.mjs` gộp theo `từ#loại` → `dist/lexicon.json` (nghĩa có rank, cefr, ipaUK/US, audio, gloss{lang}); (2) web, add-on, mobile cùng đọc lexicon; bỏ `extension/app` khỏi git, build ở CI; (3) pack khóa `từ#loại`; (4) cổng `dict-consistency` trong `npm test`: cùng `từ#loại` khác vi, ký hiệu IPA ngoài bảng, thiếu ipaUS, ví dụ thiếu từ khóa → lỗi.

## 7. Ưu tiên
1. P0 (≤1 ngày): sửa 37+53 IPA hỏng và ˈ thừa; hợp nhất 625 từ lệch nghĩa; sửa present/record/impression/bitter/podium.
2. P0: `ipaUS` từ CMUdict (~7.500 từ), nút UK/US thật.
3. P1: pack theo `từ#loại` + `--refine` 59% còn lại; LLM duyệt ko/th/hi/ar/ja/zh trước; mở rộng `core.gloss`.
4. P1: một nguồn (§6).
5. P2: Kokoro toàn từ, đo phủ Commons/LinguaLibre (A1–B1 trước).
6. P2: CEFR theo Oxford 3000/5000; hạ ví dụ A1–A2.
7. P2: Noto theo `:lang()`, line-break ja/zh/th, RTL add-on.
