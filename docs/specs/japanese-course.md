# Spec: Khóa học tiếng Nhật (tl `ja`, JLPT N5→N1 ≈ A1→C2) cho 14 ngôn ngữ giao diện

> TL;DR: Dạy tiếng Nhật N5→N1 bằng ĐÚNG engine và nền `Target`/`tl` đã chạy cho es (`spanish-course.md`) và fr (`french-course.md`): thêm dòng bảng + dữ liệu, không nhánh code mới **trừ phần đặc thù chữ viết** gom trong MỘT module `scripts/target/ja-kana.mjs` (kana → romaji/IPA, mora, cao độ, furigana, chuẩn hoá chấm IME). 8 đợt W0–W7, cờ `ja_course` + `ja_course_pct` + `ja_kill` mặc định TẮT, `ready: false` (chỉ quản trị chọn được) tới W7.
> Đọc khi: đụng `content/target/ja/`, `ja-kana.mjs`, giọng/nhận giọng tiếng Nhật, hoặc chỗ nào giả định "từ cách nhau bằng khoảng trắng" / "danh từ có giống". Soạn 22/11/2026. Điểm không nêu ở đây = theo `spanish-course.md` (một nguồn, không chép lại).

## 1. Mục tiêu
Người nói vi, en, ar, de, es, fr, hi, id, ko, pt_BR, ru, th, tr, zh_CN (giao diện `ja` → không chào khóa này) học tiếng Nhật đủ mọi phần như khóa es/fr: chữ cái, từ điển/Sổ từ/SRS, ngữ pháp + drills, lộ trình ngày, phát âm + cao độ, nghe/nói, gọi điện AI, thi thử, video Teach2D, ảnh từ vựng, add-on tra từ. Đích đầu ra (outcome-speak-write): sau 3–6 tháng tự giới thiệu, hỏi đường, gọi món, viết tin nhắn ngắn bằng kana + kanji N5 đúng thể lịch sự. Tiếng Anh/es/fr giữ nguyên từng byte (test `target-lang`).

**Vượt khóa Nhật của Duolingo/Babbel ở đâu (đo được, không khẩu hiệu):** (1) dạy và CHẤM viết nét kana (Duolingo chỉ nhận diện); (2) cao độ Tokyo hiện trên MỌI từ (đường L/H) + bài nghe phân biệt cặp cao độ (箸/橋) – cả hai bên không có; (3) furigana bật/tắt theo từng kanji đã thuộc (SRS biết bạn đã thuộc 食 thì ẩn furigana của 食), không bật/tắt cả bài; (4) romaji tự tắt dần theo tiến độ, không phải công tắc tay; (5) gõ bằng IME thật + chấm chấp nhận kana/kanji/katakana/bán độ rộng (fold); (6) kính ngữ có lộ trình riêng N3→N1 (sonkeigo/kenjōgo/teineigo) với cuộc gọi AI theo vai (khách – nhân viên, cấp dưới – sếp); (7) luyện theo định dạng JLPT đủ 5 cấp, chấm từng phần như đề thật.

## 2. Khác với es/fr – chỉ những chỗ phải làm riêng
- **Một bảng, không nhánh code**: dòng `ja` ở `web/js/target.js` (`speech`/`rec` `ja-JP`, Kokoro `jf_alpha` = Ama, `jm_kumo` = Carlos, `ready: false`, `home` `#/tlprep/ja` tới khi có lộ trình W4), `TL_GEN.ja` (`scripts/target/tl-gen.mjs`), `TL_RULES.ja` (`lib.mjs`), `tl-voices.json` `ja`. Test `target-lang` chặn mọi `if (tl==='ja')` ở `target.js`/`settings.js`.
- **Đặc thù chữ viết (module duy nhất `ja-kana.mjs`, gọi khi bảng có `kana: true`)**:
  - **Chữ cái trước (W1a)**: 46 hiragana + 46 katakana + dakuten/handakuten + yōon + っ/ー là bài học đầu (không có từ vựng kanji nào trước khi qua bài kana). Mỗi chữ: nhận diện (nghe → chọn), đọc (thấy → nói, Whisper), **viết nét** (canvas, thứ tự + hướng nét chấm theo dữ liệu nét KanjiVG CC BY-SA, chỉ đối chiếu trên máy – không ship dữ liệu dẫn xuất ngoài mục cần), cặp dễ lẫn (シ/ツ, ソ/ン, ぬ/め, ね/れ/わ).
  - **Kanji theo cấp JLPT** (N5 ~100 → N1 ~2.100+): `kana` = cách đọc của TỪ (furigana theo khối kanji, okurigana tách đúng: 食[た]べる – `ruby()`), kanji lẻ (on/kun, bộ, số nét) từ KANJIDIC2 (CC BY-SA, EDRDG) ở W1b. **Furigana bật/tắt**: mặc định bật ở N5; tự tắt cho kanji đã thuộc (SRS ≥ 21 ngày), công tắc tay vẫn có.
  - **Romaji chỉ là trợ giúp tắt dần**: kiểu gõ IME trung thành với kana (おう → ou, ー → lặp nguyên âm, ん trước nguyên âm/y → n') – học romaji = học gõ. Hiện ở bài kana + 2 tuần đầu, giảm theo tiến độ (ẩn khi đã thuộc ≥ 80 % kana), không bao giờ là đáp án duy nhất.
  - **Kính ngữ**: câu ví dụ chính = thể lịch sự です/ます (cổng `end`); thể thường dạy ở W2 với nhãn rõ; **keigo** (尊敬語/謙譲語/丁寧語) N3→N1 có bài + cuộc gọi theo vai.
  - **Trợ từ** は/が/を/に/で/へ/と/も/の/から/まで: điểm ngữ pháp riêng ở W2 (は vs が, に vs で có bộ drill phân biệt), không vào kho từ (người soạn trả `skip: particle`).
  - **Đếm từ** (助数詞): 〜つ/〜人/〜本/〜枚/〜匹/〜冊/〜台/〜個/〜回/〜階… có biến âm (いっぽん, さんぼん, ろっぽん) – bảng sinh + kiểm 100 % ở W2.
  - **Cao độ (pitch accent)**: `pitch` = vị trí mora hạ giọng kiểu NHK (0 = heiban…); `pitchPattern()` cho đường L/H + mức trợ từ sau; hiện trên mọi thẻ từ ở W3, bài cặp cao độ thật (箸 はし¹ / 橋 はし² / 端 はし⁰) – test chặn cặp không khác cao độ (như cặp tối thiểu es).
  - **Nhập liệu IME + chấm chấp nhận kana**: `fold()` (NFKC bán độ rộng → toàn độ rộng, katakana → hiragana, bỏ dấu câu/khoảng trắng); đáp án đúng nếu khớp chữ HOẶC khớp kana đọc (gõ たべます cho 食べます = đúng, kèm hiện chữ kanji). Bàn phím ảo kana dự phòng cho máy chưa có IME.
- **Không giống, không số nhiều** (`noGender`): trường `gender`/`plural`/`h` bị chặn ở ja; thay bằng `vclass` (ichidan|godan|irregular – khớp đuôi kana) cho động từ, `aclass` (i|na) cho tính từ, `jlpt` 5…1 bắt buộc.
- **Chữ không cách từ** (`sub`): "câu chứa từ" = chứa chuỗi; lint câu: không chữ Latin/số Ả Rập/khoảng trắng/katakana bán độ rộng, kết thúc 。/？.
- **Chia động từ** (W2): bảng `ja` trong `scripts/target/conjugate.mjs` (ます/ません/ました/ませんでした, て/た/ない/なかった, ば/たら/よう/られる/させる/させられる/命令, khả năng; ichidan/godan theo đuôi + bất quy tắc する/来る + ngoại lệ 行く→行って, ある→ない), kiểm chéo Wiktionary (kaikki `Japanese`) **khớp 100 %**.
- **Thi thử** (W5): định dạng **JLPT N5–N1** tự soạn (文字・語彙 / 文法 / 読解 / 聴解, đúng số phần và kiểu câu), nhãn **"Luyện theo định dạng JLPT"**, không liên kết Japan Foundation/JEES, không đề thật.
- **Add-on** (W6): nhận câu tiếng Nhật bằng `\p{Script=Hiragana|Katakana|Han}` (Han không kana = coi là zh, không chào), không quyền mới (`permissions.lock`).
- Phần còn lại (engine tham số hoá `tl`, giải thích bản ngữ en→14, chỉ màn Stitch, một giọng xuyên suốt, video Teach2D 2D) = `spanish-course.md` §2.

## 3. Nguồn MIỄN PHÍ (giấy phép)
| Phần | Nguồn / cách làm | Giấy phép – lưu ý |
|---|---|---|
| Khung cấp | JLPT N5–N1 ↔ CEFR (ước lượng công khai của Japan Foundation chỉ để mô tả) | mô tả, không chép |
| Danh sách theo cấp | Danh sách từ JLPT N5–N1 của Jonathan Waller (tanos.co.uk) qua bộ `open-anki-jlpt-decks` (jamsinclair, 7.571 mục có cách đọc) – nguồn ứng viên W1b, `kana` + `jlpt` lấy theo danh sách (`TL_GEN.ja.cands`, `TL_RULES.ja.derive`) | MIT / CC BY, ghi công |
| Từ điển đối chiếu | JMdict/EDICT (cách đọc, cờ phổ biến `ichi1/news1`), KANJIDIC2 (kanji lẻ), Wiktionary qua kaikki `Japanese` (cao độ, chia) – chỉ kiểm chéo trên CI | CC BY-SA (EDRDG / Wikimedia) – không ship dữ liệu dẫn xuất |
| Tần suất | FrequencyWords `ja_full` (OpenSubtitles 2018) – thứ hạng phụ | CC BY-SA 4.0 |
| Thứ tự nét | KanjiVG (đối chiếu chấm nét kana/kanji) | CC BY-SA 3.0 |
| Cách đọc + cao độ đối chiếu | OpenJTalk (pyopenjtalk, từ điển NAIST-jdic) trên CI | BSD |
| IPA | Sinh từ kana bằng `ja-kana.mjs` (quy ước §8.2), không gõ tay | tự viết |
| Câu ví dụ | Tự soạn qua ai-pool; Tatoeba (jpn) chỉ đo độ tự nhiên + câu người viết cho đề | CC BY 2.0 FR |
| Kiểm ngữ pháp | LanguageTool KHÔNG có tiếng Nhật → thay bằng: fugashi + UniDic phân tích hình thái (mọi token phải nhận được, không 未知語), 2 giám khảo AI khác họ + dịch ngược, lint kính ngữ/trộn thể | BSD / UniDic BSD |
| Giọng (MỘT giọng/vai) | **Open JTalk HTS** (lượt mẫu W0 chốt, §9): Ama = `mei_normal` (MMDAgent), Carlos = `nitech_jp_atr503_m001`; Kokoro-82M `jf_alpha`/`jm_kumo` (misaki JAG2P) chỉ đo báo cáo – Piper không có giọng ja | CC BY 3.0 (Nagoya Institute of Technology – ghi công ở trang Giới thiệu + mô tả video) / Apache-2.0 |
| Nhận giọng | Whisper large-v3-turbo đa ngôn ngữ (CI; chấm theo CÁCH ĐỌC), máy người dùng theo tầng thiết bị | MIT |
| Ảnh từ vựng | Tái dùng `img.json` khi đúng nghĩa `từ#loại` | không chữ trong ảnh |
| Video | Teach2D, Ama + Carlos 2D đọc ja, ≤ 150 wpm (≈ 6 mora/s), chủ duyệt mẫu | 0 credit |

## 4. Đợt (mỗi đợt/lô = 1 PR, cờ tắt; trước push `node scripts/test/run-suite.mjs --affected`)
| Đợt | Nội dung | Phút CI |
|---|---|---|
| W0 | Spec này; `ja-kana.mjs`; dòng `ja` ở `Target`/`TL_GEN`/`TL_RULES`/`tl-voices.json`; cờ `ja_course`/`ja_course_pct`/`ja_kill`; seed 30 từ soát tay; lượt mẫu giọng (`word-audio-ja`: Kokoro jf_alpha/jm_kumo vs Open JTalk, −16 LUFS, Whisper chấm cách đọc) | 60 |
| W1a | Bài chữ cái: hiragana/katakana (nhận diện, đọc, viết nét), dữ liệu ra `web/packs` lazy + CDN – không phình `cpack` | 300 |
| W1b | Từ vựng N5→N3 ~3.000 mục (lô 300, CI `target-content` tl=ja): kana, romaji/IPA sinh, cao độ (kiểm chéo kaikki + OpenJTalk), JLPT (tanos), nhóm từ, nghĩa 14 ngôn ngữ, ví dụ + furigana câu (fugashi), audio, `img`; N2→N1 nối tiếp | 1.800 |
| W2 | Ngữ pháp N5→N1 (~250 điểm: trợ từ, thể, kính ngữ, đếm từ), bộ chia ja + kiểm chéo Wiktionary 100 %, drills qua qengine (chấm `fold`), giải thích en→14 | 1.300 |
| W3 | Phát âm: mora/っ/ー/ん, vô thanh hoá (す/し cuối), cao độ (đường L/H mọi từ, cặp cao độ thật), nghe chính tả kana, nói theo (Whisper theo tầng) | 700 |
| W4 | Lộ trình ngày + bài học + ≥ 24 cuộc gọi AI N5–N2 (có keigo theo vai) | 500 |
| W5 | Luyện theo định dạng JLPT N5–N1: spec định dạng, ≥ 2 đề/cấp, chấm từng phần | 800 |
| W6 | Video Teach2D ja + ảnh còn thiếu + add-on nhận câu Nhật | 1.000 |
| W7 | Màn Stitch (bài kana, furigana, IME, đường cao độ, nhãn tl), `ready: true`, bật `ja_course_pct` 10→50→100, bản native, kiểm live có ảnh | 300 |

## 5. Cổng QC trên CI (trượt 1 = không gộp; không nới ngưỡng)
Như `spanish-course.md` §5 với `ja`, thay LanguageTool bằng phân tích hình thái (bảng §3), và thêm:
1. **Chữ viết** (`validate()`, node, mọi PR): kana hợp lệ + furigana khớp chữ; `romaji` và `ipa` **bằng đúng** bản `ja-kana.mjs` sinh từ kana; `pitch` ∈ 0…số mora; `jlpt` ∈ 5…1; `vclass`/`aclass` khớp đuôi; không `gender`/`plural`; ngôn ngữ khác không được có trường ja.
2. **Cách đọc**: kana seed/lô ↔ OpenJTalk (`tl_ipa.py`, chế độ `reading`) khớp 100 % (lệch → sửa hoặc ghi ngoại lệ có lý do); kana ↔ JMdict/kaikki ở W1.
3. **Cao độ**: seed/lô ↔ kaikki (NHK-kiểu) khớp hoặc ghi biến thể được chấp nhận; OpenJTalk chỉ báo cáo (từ điển khác NHK có chỗ).
4. **Giọng**: −16 LUFS ±1; Whisper large-v3-turbo nghe lại, so **cách đọc** (OpenJTalk của chữ nghe được, chuẩn hoá trường âm) với kana seed – WER mục từ = 0; tỉ lệ đạt ≥ 80 % mỗi giọng dùng thật, không thì giọng máy.
5. **Câu**: thể lịch sự ở câu chính, không trộn だ/です trong mệnh đề chính, không romaji/khoảng trắng; câu thể thường chỉ trong bài thể thường (có nhãn).
6. **Không hồi quy** en/es/fr: `target-lang` + toàn bộ `npm test`.

## 6. Tiêu chí xong
Như `spanish-course.md` §6 cho ja: mọi phần ở §1 đủ N5→N1, qua cổng §5 ở 14 ngôn ngữ, giáo viên dạy bằng giọng ja, chạy web/add-on/iOS/Android, cờ 100 % sau 1 tuần nhóm thử không lỗi chặn.

## 7. Rủi ro
- **Giọng HTS nghe máy hơn Kokoro/VOICEVOX**: đúng cách đọc là ưu tiên 1 (cổng §5.4); W3 thử giọng tự nhiên hơn, miễn phí, cùng cổng. Kokoro ja (misaki[ja] + UniDic ~500 MB) đọc thêm đuôi を/や và đọc sai một số từ – đo lại khi misaki/Kokoro có bản mới.
- **Kanji nhiều cách đọc** (今日 きょう/こんにち, 一日 ついたち/いちにち): audio luôn đọc theo `kana` (`say: kana`), cổng đọc so OpenJTalk + JMdict.
- **Cao độ có biến thể** (電車 0/1, 赤い 0/1): lưu dạng NHK chính, biến thể ghi chú; chấm nói không trừ điểm cao độ biến thể.
- **Dung lượng**: dữ liệu kana/nét/kanji lớn → `web/packs` + CDN, lazy theo bài; size-budget chặn.
- **Hạn mức ai-pool**: như es/fr, chạy nối tiếp, không trả phí khi chưa hỏi.
- **Thứ tự**: ja không bật cho người dùng trước khi fr đạt W7 (thứ tự chủ chốt: es → fr → ja/ko).

## 8. Quyết định chuẩn (điều phối tự quyết theo ủy quyền của chủ, 22/11/2026)
1. **Chuẩn ngôn ngữ**: tiếng Nhật chuẩn Tokyo (共通語/標準語) cho giọng, cao độ, ví dụ, đáp án; phương ngữ (関西弁…) chỉ ở ghi chú nhận biết.
2. **IPA** rộng, SINH từ kana: ɯ (う), ɕ tɕ dʑ (し ち じ), ɲ (に), ç (ひ), ɸ (ふ), phụ âm vòm kʲ gʲ mʲ ɾʲ bʲ pʲ, ɾ; ん đồng hoá m/n/ɲ/ŋ, cuối/trước nguyên âm ɴ; っ = nhân đôi phụ âm sau; trường âm ː (ー, nguyên âm lặp, おう, えい); う cuối động từ giữ là âm riêng (思う omoɯ). Không ghi vô thanh hoá/cao độ trong IPA (cao độ là trường `pitch`).
3. **Romaji** = kiểu gõ IME trung thành kana (không macron): dễ gõ, khớp IME, học xong romaji là gõ được.
4. **Chữ mặc định**: từ viết như người Nhật viết thường ngày (kanji khi từ thường viết kanji; りんご, うれしい viết kana vì kanji không thuộc Jōyō/ít dùng).
5. **Nhãn thi**: "Luyện theo định dạng JLPT" (không liên kết cơ quan tổ chức, không đề thật – tên thi chỉ để mô tả).
6. **Giọng** (chốt sau lượt mẫu 22/11, §9): Ama = Open JTalk `mei_normal`, Carlos = Open JTalk `nitech_jp_atr503_m001` (CC BY 3.0, ghi công). Kokoro ja không qua cổng → không dùng cho tới khi một lượt đo lại ≥ 80 %. Nâng chất lượng (giọng tự nhiên hơn HTS) ở W3: thử VOICEVOX (nhân vật cho phép dùng thương mại có ghi công) / Style-BERT-VITS2 JVNV (CC BY-SA) – cùng cổng, không hạ ngưỡng.

## 9. Trạng thái
- **W0** (22/11/2026): spec này; `scripts/target/ja-kana.mjs`; dòng `ja` ở `web/js/target.js` (`ready: false`, cờ `ja_course`/`ja_course_pct`/`ja_kill` ở PUBLIC_KEYS + CONFIG_KEYS, chung nhóm thiết bị `lk.esb`); `TL_GEN.ja` + `TL_RULES.ja` (noGender, sub, kana, end, lint); `tl-voices.json` ja (misaki-ja, đọc kana, chấm cách đọc, không cắt câu mang, đối chứng Open JTalk) + nhãn `word-audio-ja` + `tl_kana.py`; ma trận PR `target-content` thêm ja; seed 30 từ `content/target/ja/` (27 khái niệm chung với seed es + 好き/来る/町, phủ hiragana/katakana/っ/ゃゅょ/ー/ん, 3 nhóm động từ, tính từ i/na); chuỗi "Đã thêm {n} từ tiếng Nhật" đủ 15 ngôn ngữ. Thẻ ja giữ `kana`/`romaji`/`pitch`.
- **Lượt mẫu giọng W0** (22/11/2026, `word-audio-tl` tl=ja, 20 từ): cách đọc seed ↔ OpenJTalk 30/30, cao độ ↔ OpenJTalk 30/30; Kokoro `jf_alpha` 8/20, `jm_kumo` 9/20 (< 80 %: đuôi thừa を/や sau từ – 犬を, 大きいや – và đọc sai 家/靴/町) → **không đạt**; Open JTalk mặc định (= `mei_normal`) 19/20 (太陽 → 対応). Quyết định (điều phối, không hạ cổng): giọng dùng thật ja = Open JTalk HTS cho cả hai vai (`require` = `ojt_mei`, `ojt_m001` trong `tl-voices.json`), Kokoro chỉ đo báo cáo; nguồn giọng hỏng không làm chết lượt (ghi `altErr`). Bảng `Target.ja` (giọng chạy trên máy) đổi theo khi có file dựng sẵn (W1b/W3); cờ tắt nên chưa ai nghe.
- **W1b đường ống** (22/11/2026, nhánh `claude/ja-w1`): `gen.mjs` đọc bảng – `cands()` (danh sách JLPT, N5 trước, gợi ý cách đọc/cấp/nghĩa Anh cho người soạn), `lemma: false`, `derive()` (kana + jlpt theo nguồn, romaji/IPA sinh từ kana, bỏ gender); CI `tl_ja_fill.py` ghi cao độ OpenJTalk (từ một token; từ ghép giữ số người soạn + `qa.pitchSrc: ai` để soát) + gắn cờ cách đọc lệch; `wikt-check` gắn cờ cách đọc Wiktionary lệch (`longFold` – trường âm viết kiểu nào cũng so được); gói app `scripts/target/tl-pack.mjs` → `web/packs/tl/ja/<15 ngôn ngữ>.json` (chỉ seed + lô `reviewed`, ngoài cpack; chia theo cấp JLPT khi > 1.000 mục). Lô 1 (n = 300) chạy `target-content` tl=ja; AI pool ≤ ⅓ hạn mức ngày, lệch giờ với lô es/fr.
- **W2a bộ chia** (22/11/2026, nhánh `claude/ja-w2`): `scripts/target/conj-ja.mjs` – 20 dạng (ます/ません/ました/ませんでした/ましょう, ない/なかった, て/た/たら, ば, う・よう, khả năng, bị động, sai khiến, sai khiến bị động, mệnh lệnh, cấm な, ず, 連用形) cho ichidan/godan/する/来る/〜する/(…)来る, chữ + kana song song, ngoại lệ 行く/ある/いらっしゃる…; `conj-ja-check.mjs` ↔ Wiktionary: **348/348 ô khớp** (31 động từ; くださる, 勉強する không có trang động từ – báo, không loại). Còn W2b: kho điểm ngữ pháp N5→N1 (trợ từ, thể, keigo, đếm từ) + drills qua qengine.
- **W3a phát âm** (23/11/2026, nhánh `claude/ja-w3`): `content/target/ja/pron.json` (8 chủ đề: nguyên âm, trường âm, っ, ん, ゃゅょ, cao độ, vô thanh hoá, つ/す; 64 từ `read = {chữ: [kana, cao độ NHK]}`, cặp tối thiểu phải KHÁC âm hoặc KHÁC cao độ) + giải thích 15 ngôn ngữ; `px-lib.mjs` dòng `TLX.ja` sinh IPA + kana có dấu hạ ꜜ từ kana (`accentKana`), `px-pack.mjs` ghi `web/packs/tl/ja/px*.js` (ngoài cpack); CI `tl_ja_fill.py --pron` (cách đọc ↔ OpenJTalk 100 %, cao độ lệch chỉ báo ⚑). Còn W3b: màn bài (nghe ví dụ, cặp, chính tả kana, nói theo – Whisper), đường L/H trên thẻ từ, đối chiếu cao độ với kaikki.
- **W4a cuộc gọi AI** (23/11/2026, nhánh `claude/ja-w4`): 24 cuộc A1→C1 (≈ N5→N2; A1 4 · A2 5 · B1 6 · B2 5 · C1 4; 93 nút) ở `content/target/ja/calls/calls-0[1-4].json` – 13 nhập vai (quán cà phê, hỏi đường, bệnh viện, thuê nhà, phỏng vấn, **khách sạn – nhân viên dùng 尊敬語**, **gọi cho đối tác – người học dùng 謙譲語**, báo cáo sếp…) + chat tự do; Ama/Carlos. Engine `web/js/call/engine.js` mở rộng theo bảng `TLX.ja` (không `\b`: so chuỗi; chuẩn hoá NFKC + katakana→hiragana nên gõ ネコ/ねこ/ﾈｺ đều khớp; đếm từ bằng Intl.Segmenter; từ đệm えーと/あのー, từ nối から/ので/けど…; từ mục tiêu so theo chuỗi) – en/es/fr giữ nguyên (call-engine 2819 kiểm tra). Cổng `calls-check.mjs --tl ja`: cấu trúc nút, regex hợp lệ sau chuẩn hoá, câu mẫu của người học PHẢI ở thể lịch sự, không Latin/khoảng trắng, mọi câu mẫu đạt `min` từ. Gói `web/packs/tl/ja/cl.js` (35 KB, ngoài cpack vì cpack còn 9 KB) → bundle `callja`. **Chưa có**: phân tích hình thái (fugashi + UniDic, 0 token lạ) trên CI – cần máy có UniDic, làm ở W4b cùng lộ trình ngày; chưa có audio dựng sẵn (giọng chạy trên máy). Còn W4b: lộ trình ngày (cần kho điểm ngữ pháp W2b).
- **W2b-1 kho điểm ngữ pháp** (25/11/2026, nhánh `claude/ja-w2b`): `content/target/ja/grammar-inventory.json` – 302 điểm tự soạn N5→N1 (A1 52 · A2 58 · B1 77 · B2 76 · C1 39; `level` = CEFR tương ứng, `jlpt` = cấp; trợ từ, thể, kính ngữ, đếm từ, điều kiện, bị động/sai khiến, liên từ, văn viết), ví dụ qua lint `TL_RULES.ja`, `tenses` = khóa `conj-ja` `FORMS`; cổng `grammar-map-check --tl ja` + 5 ca hồi quy ở `scripts/test/grammar-inventory.mjs`. Còn W2b-2: giải thích 15 ngôn ngữ (`gx/`), câu điền từ ≥ 3/điểm (`drills.json`) và hàng `TLP.ja` ở `drill-lib.mjs` (gói ra `web/packs/tl/ja`, ngoài cpack), rồi lộ trình ngày W4b.
- **W1a cần**: dữ liệu nét kana (KanjiVG) ra `web/packs/ja-kana`, màn bài chữ cái (Stitch), chấm nét; **W1b**: nguồn tanos N5 làm ứng viên chính, `gen.mjs` giữ trường kana và SINH romaji/IPA từ kana trước cổng, bước CI fugashi + OpenJTalk + kaikki.
