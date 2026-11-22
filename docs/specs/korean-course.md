# Spec: Khóa học tiếng Hàn (tl `ko`, TOPIK 1→6 ≈ A1→C2) cho 14 ngôn ngữ giao diện

> TL;DR: Dạy tiếng Hàn TOPIK I (1–2) → TOPIK II (3–6) bằng ĐÚNG engine và nền `Target`/`tl` đã chạy cho es (`spanish-course.md`), fr (`french-course.md`), ja (`japanese-course.md`): thêm dòng bảng + dữ liệu, không nhánh code mới **trừ phần đặc thù chữ viết + ngữ pháp nền** gom trong MỘT module `scripts/target/ko-hangul.mjs` (ghép/tách âm tiết + bộ gõ 2 hàng, phát âm chuẩn 표준 발음법, Romaja RR 2000, IPA, tiểu từ, số Hán-Hàn/thuần Hàn + từ đếm, chia 해요/합니다/quá khứ gồm bất quy tắc, chấm IME). 8 đợt W0–W7, cờ `ko_course` + `ko_course_pct` + `ko_kill` mặc định TẮT, `ready: false` (chỉ quản trị chọn được) tới W7.
> Đọc khi: đụng `content/target/ko/`, `ko-hangul.mjs`, giọng/nhận giọng tiếng Hàn, hoặc chỗ nào giả định "chữ = âm" / "từ đứng riêng không dính tiểu từ" / "danh từ có giống". Soạn 22/11/2026. Điểm không nêu ở đây = theo `spanish-course.md` (một nguồn, không chép lại).

## 1. Mục tiêu
Người nói vi, en, ar, de, es, fr, hi, id, ja, pt_BR, ru, th, tr, zh_CN (giao diện `ko` → không chào khóa này) học tiếng Hàn đủ mọi phần như khóa es/fr/ja: bảng chữ Hangul, từ điển/Sổ từ/SRS, ngữ pháp + drills, lộ trình ngày, phát âm, nghe/nói, gọi điện AI, thi thử, video Teach2D, ảnh từ vựng, add-on tra từ. Đích đầu ra (outcome-speak-write): sau 3–6 tháng đọc trơn Hangul, tự giới thiệu, hỏi giá/giờ (đúng hệ số), gọi món, viết tin nhắn ngắn đúng 해요체 và đúng tiểu từ. Tiếng Anh/es/fr/ja giữ nguyên từng byte (test `target-lang`).

**Vượt khóa Hàn của Duolingo/Memrise/Talk To Me In Korean ở đâu (đo được, không khẩu hiệu):** (1) dạy và CHẤM viết nét jamo + ghép khối âm tiết (đầu-vần-cuối) trên canvas – bên kia chỉ nhận diện; (2) MỌI từ/câu hiện phát âm chuẩn `[국물 → 궁물]` kèm tên luật biến âm giải thích bằng tiếng mẹ đẻ (nối âm, mũi hoá, căng hoá…) – sinh bằng máy, không gõ tay; (3) tiểu từ tự chọn theo âm cuối (은/는, 이/가, 을/를, (으)로) có bộ drill phân biệt 은/는 ↔ 이/가 theo ngữ cảnh; (4) huấn luyện HAI hệ số (thuần Hàn cho giờ/tuổi/đếm, Hán-Hàn cho phút/giá/ngày) bằng nghe-gõ thật, đủ từ đếm; (5) gõ bằng IME thật + bàn phím ảo 2 hàng (`compose`), chấm nhận NFD/jamo rời và sai cách chữ (띄어쓰기) = đúng kèm nhắc; (6) kính ngữ là trục riêng (합쇼체/해요체/반말 + 높임 -시-) với cuộc gọi AI theo vai; (7) **cầu Hán tự**: từ Hán-Hàn mang `hanja` → người học vi thấy âm Hán-Việt (學校 = học hiệu), zh/ja thấy chữ Hán – lợi thế riêng của Lexkite cho người Việt; (8) luyện theo định dạng TOPIK I + II đủ phần, kể cả viết 51–54 chấm theo rubric.

## 2. Khác với es/fr/ja – chỉ những chỗ phải làm riêng
- **Một bảng, không nhánh code**: dòng `ko` ở `web/js/target.js` (`speech`/`rec` `ko-KR`, `kokoro: {}` vì Kokoro-82M không có giọng Hàn → `kokoroVoice` trả `''` = giọng máy, `ready: false`, `home` `#/tlprep/ko` tới khi có lộ trình W4), `TL_GEN.ko` (`scripts/target/tl-gen.mjs`), `TL_RULES.ko` (`lib.mjs`), `tl-voices.json` `ko`. Test `target-lang` chặn mọi `if (tl==='ko')` ở `target.js`/`settings.js`.
- **Đặc thù chữ viết (module duy nhất `ko-hangul.mjs`, gọi khi bảng có `hangul: true`)**:
  - **Hangul trước (W1a)**: 14 phụ âm + 10 nguyên âm cơ bản → 5 phụ âm căng + 11 nguyên âm ghép → khối âm tiết (đầu + vần, rồi + 받침) → 7 âm cuối đại diện + 11 phụ âm kép cuối. Mỗi bước: nhận diện (nghe → chọn), đọc (thấy → nói, Whisper), **viết nét** (canvas, thứ tự + hướng nét – dữ liệu nét jamo tự soạn 40 mục, không cần nguồn ngoài), ghép khối (kéo jamo vào ô đầu/vần/cuối), cặp dễ lẫn (ㅓ/ㅗ, ㅐ/ㅔ, ㄱ/ㄲ/ㅋ, ㅂ/ㅃ/ㅍ, ㅈ/ㅉ/ㅊ). Không có từ vựng nào trước khi qua bài Hangul; romaja chỉ ở bài Hangul + tuần đầu.
  - **Phát âm chuẩn trong dữ liệu**: `pron` (dạng Hangul) = `ko-hangul.mjs pron` sinh từ chữ theo 표준 발음법: nối âm (연음, phụ âm kép tách), 7 âm cuối đại diện + rút phụ âm kép (gốc vị từ ㄺ + ㄱ → ㄹ), bật hơi (격음화 cả hai chiều), ㅎ câm, vòm hoá (구개음화), mũi hoá (비음화, cả ㄹ → ㄴ sau ㅁ ㅇ ㄱ ㅂ), lỏng hoá (유음화), căng hoá (경음화: sau âm tắc; vị từ: gốc ㄴ ㅁ ㄵ ㄻ ㄼ ㄾ trước đuôi), ㅈㅉㅊ + ㅕ → ㅓ, phụ âm + ㅢ → ㅣ. Ngoại lệ KHÔNG đoán được từ chữ (사이시옷 / căng hoá Hán-Hàn 김밥 → 김빱, 발전 → 발쩐; ㄴ 첨가 담요 → 담뇨; 의견란 → 의견난; hình vị thực 겉옷 → 거돋; 밟다) khai ở `pronX` theo vị trí âm tiết – cổng ép seed = máy sinh, không gõ tay lệch. W3 dạy từng luật thành bài, hiện tên luật trên thẻ.
  - **Kính ngữ**: câu ví dụ chính = **해요체** (cổng `end`: …요. / …요?) – một câu một thể; 합쇼체 (…습니다/ㅂ니다) dạy từ A1 ở lời chào/thông báo, 반말 ở B1 có nhãn, 높임 -(으)시- + từ kính (드시다, 계시다, 주무시다, 께서, 께) A2→B2; cuộc gọi AI theo vai (khách – nhân viên, hậu bối – tiền bối) chấm đúng thể.
  - **Tiểu từ** 은/는, 이/가, 을/를, 와/과, (으)로, 에/에서, 도, 만, 의, 께/에게/한테: `josa()` chọn dạng theo âm cuối (ㄹ cuối + (으)로 → 로); điểm ngữ pháp riêng ở W2 (은/는 ↔ 이/가 có drill ngữ cảnh), không vào kho từ (người soạn trả `skip: particle`). Câu ví dụ: từ đứng ĐẦU một 어절, tiểu từ/đuôi dính sau (`sub: 'lead'`: 책을, 학교에서).
  - **Số**: `sino()` (일 이 삼… 십 không "일십", 만 không "일만", 억) và `native()` 1–99 (하나…아흔아홉, dạng định ngữ 한/두/세/네/스무); `count()` chọn hệ theo bảng từ đếm `COUNTERS` (개 명 살 마리 시 시간 병 잔 권 장 대 = thuần Hàn; 분 초 원 년 월 일 층 인분 주 = Hán-Hàn; 6월 유월, 10월 시월). Bài giờ (세 시 삼십 분), giá (오천 원), tuổi (스무 살), điện thoại (공) ở W2–W3.
  - **Chia động/tính từ**: vị từ trong kho ở dạng từ điển …다 + `conj` (reg | 하 | ㅂ | ㄷ | ㅅ | ㅎ | 르 | 러 | 으 | ㄹ | 우 | 이) khớp hình thức gốc (`conjShape`; bất quy tắc là theo từ – 입다 reg / 돕다 ㅂ, 받다 reg / 듣다 ㄷ). `conj()` W0 có 아/어, 해요, quá khứ 했어요, 합니다; W2 mở rộng (-고, -지만, -아서/-니까, -(으)면, -(으)ㄹ 거예요, -고 싶다, -(으)세요, định ngữ -(으)ㄴ/-는/-(으)ㄹ, bị/sai khiến) và kiểm chéo Wiktionary (kaikki `Korean`) + 한국어기초사전 **khớp 100 %**.
  - **Nhập liệu IME + chấp nhận khi chấm**: `fold()` = NFC (bàn phím macOS/iOS có thể ra jamo rời NFD) + ghép jamo tương thích rời (`compose`, như bộ gõ 2 hàng) + bỏ dấu câu; `same(gõ, đáp)` → `ok` | `spacing` (chỉ sai 띄어쓰기 → nhận, nhắc nhẹ) | sai. Bàn phím ảo 2 hàng (두벌식) cho máy chưa có IME Hàn. Romaja KHÔNG bao giờ là đáp án.
- **Không giống, không số nhiều** (`noGender`): `gender`/`plural`/`h`/trường ja bị chặn ở ko; thay bằng `pron`, `romaja`, `topik` 1…6 bắt buộc, `conj` cho vị từ, `hanja` (tuỳ chọn, Hán tự đủ số âm tiết), `pronX`.
- **Lint câu**: không chữ Latin, không Hán tự trong câu (hanja chỉ ở trường riêng), không jamo rời/NFD; số Ả Rập cho giờ/giá được phép.
- **Thi thử** (W5): định dạng **TOPIK I** (듣기 + 읽기) và **TOPIK II** (듣기 + 쓰기 51–54 + 읽기) tự soạn, đúng kiểu câu từng phần, nhãn **"Luyện theo định dạng TOPIK"**, không liên kết NIIED/Viện Giáo dục Quốc tế Quốc gia, không đề thật. Số câu/thời lượng/ngưỡng cấp đối chiếu trang công khai lúc soạn W5; chưa đối chiếu được thì để `null` và UI ẩn (như fr W5).
- **Add-on** (W6): nhận câu tiếng Hàn bằng `\p{Script=Hangul}` (đủ tỉ lệ ký tự Hangul), tra theo lemma (bỏ tiểu từ/đuôi bằng Kiwi trên CI → bảng dạng → lemma ship nhẹ), không quyền mới (`permissions.lock`).
- Phần còn lại (engine tham số hoá `tl`, giải thích bản ngữ en→14, chỉ màn Stitch, một giọng mỗi vai, video Teach2D 2D) = `spanish-course.md` §2.

## 3. Nguồn MIỄN PHÍ (giấy phép)
| Phần | Nguồn / cách làm | Giấy phép – lưu ý |
|---|---|---|
| Khung cấp | TOPIK I (1–2) / II (3–6) ↔ CEFR (ước lượng công khai, chỉ mô tả) | mô tả, không chép |
| Danh sách theo cấp | 국립국어원 「한국어 학습용 어휘 목록」 (cấp A/B/C) – chọn ứng viên + đối chiếu cấp | dữ liệu công (chỉ thứ hạng/cấp, không chép nghĩa) |
| Từ điển đối chiếu | 한국어기초사전 (krdict, Viện Quốc ngữ: phát âm chuẩn, cấp 초급/중급/고급, 활용) + Wiktionary qua kaikki `Korean` – chỉ kiểm chéo trên CI | CC BY-SA 2.0 KR / CC BY-SA – không ship dữ liệu dẫn xuất |
| Tần suất | FrequencyWords `ko_full` (OpenSubtitles 2018, tách theo 어절 → quy lemma trước) – thứ hạng phụ | CC BY-SA 4.0 |
| Phát âm chuẩn | Sinh bằng `ko-hangul.mjs` (tự viết theo 표준 발음법); đối chiếu độc lập **g2pk2** trên CI (`tl_ipa.py`, chế độ `pron`) | tự viết / Apache-2.0 |
| Romaja, IPA | Sinh từ chữ bằng `ko-hangul.mjs` (RR 2000; IPA quy ước §8.2) | tự viết |
| Phân tích hình thái | **Kiwi** (kiwipiepy) – mọi token câu ví dụ phải nhận được, quy dạng → lemma cho add-on | LGPL-3.0 (công cụ CI, không ship) |
| Câu ví dụ | Tự soạn qua ai-pool; Tatoeba (kor) chỉ đo độ tự nhiên + câu người viết cho đề | CC BY 2.0 FR |
| Kiểm ngữ pháp | LanguageTool KHÔNG có tiếng Hàn → Kiwi (không token lạ) + 2 giám khảo AI khác họ + dịch ngược + lint thể/tiểu từ (`josa` khớp âm cuối) | – |
| Giọng (MỘT giọng/vai) | Kokoro-82M và Piper KHÔNG có giọng Hàn → **Supertonic 3** (Supertone Inc., ONNX chạy CPU, giọng F1–F5/M1–M5) thử F1, F2 (Ama) · M1, M2 (Carlos); chốt ở lượt mẫu `word-audio-ko` (§9). Loại: MMS-TTS kor (CC BY-NC), MeloTTS (ghim torch < 2.0, không cài được trên runner hiện tại) | mô hình BigScience **Open RAIL-M** (miễn phí, cho thương mại, có điều khoản cấm lạm dụng – ghi công ở trang Quyền riêng tư §16 khi audio ship) / mã MIT |
| Nhận giọng | Whisper large-v3-turbo đa ngôn ngữ (CI), máy người dùng theo tầng thiết bị | MIT |
| Phông chữ | Noto Sans KR (hiển thị jamo/khối âm tiết rõ ở bài Hangul) – lazy, chỉ khi tl = ko | SIL OFL 1.1 |
| Ảnh từ vựng | Tái dùng `img.json` khi đúng nghĩa `từ#loại` | không chữ trong ảnh |
| Video | Teach2D, Ama + Carlos 2D đọc ko, ≤ 150 wpm (≈ 4 âm tiết/s), chủ duyệt mẫu | 0 credit |

## 4. Đợt (mỗi đợt/lô = 1 PR, cờ tắt; trước push `node scripts/test/run-suite.mjs --affected`)
| Đợt | Nội dung | Phút CI |
|---|---|---|
| W0 | Spec này; `ko-hangul.mjs`; dòng `ko` ở `Target`/`TL_GEN`/`TL_RULES`/`tl-voices.json`; cờ `ko_course`/`ko_course_pct`/`ko_kill`; seed 30 từ soát tay; lượt mẫu giọng (`word-audio-ko`: Supertonic 3 × 4 giọng, −16 LUFS, Whisper large-v3-turbo; phát âm seed ↔ g2pk2) | 60 |
| W1a | Bài Hangul (jamo, khối âm tiết, 받침, viết nét, bàn phím 2 hàng) – dữ liệu `web/packs/ko-hangul` lazy + CDN, không phình `cpack` | 300 |
| W1b | Từ vựng TOPIK I → II ~3.000 mục (lô 300, CI `target-content` tl=ko, ≤ ¼ hạn mức ngày, sau lô es 08:00 UTC): pron/RR/IPA sinh, cấp (NIKL + krdict), lớp chia, hanja, nghĩa 14 ngôn ngữ, ví dụ 해요체 (Kiwi), audio, `img` | 1.800 |
| W2 | Ngữ pháp TOPIK 1→6 (~240 điểm: tiểu từ, đuôi câu, 3 thể + 높임, định ngữ, số + từ đếm, bất quy tắc), bộ chia ko + kiểm chéo Wiktionary/krdict 100 %, drills qua qengine (chấm `same`), giải thích en→14 | 1.300 |
| W3 | Phát âm: từng luật biến âm thành bài (`pron` + tên luật), cặp tối thiểu thật (달/딸/탈, 불/뿔/풀, 어/오, 애/에 chỉ là đồng âm ở Seoul → bài chính tả, không làm cặp), nghe chính tả Hangul, nói theo (Whisper theo tầng) | 700 |
| W4 | Lộ trình ngày + bài học + ≥ 24 cuộc gọi AI TOPIK 1–4 (có kính ngữ theo vai) | 500 |
| W5 | Luyện theo định dạng TOPIK I + II: spec định dạng, ≥ 2 đề/cấp, chấm từng phần, viết 51–54 theo rubric qua ai-pool | 800 |
| W6 | Video Teach2D ko + ảnh còn thiếu + add-on nhận câu Hàn | 1.000 |
| W7 | Màn Stitch (bài Hangul, thẻ phát âm chuẩn, bàn phím 2 hàng, nhãn tl), `ready: true`, bật `ko_course_pct` 10→50→100 (+ kill switch), bản native, kiểm live có ảnh | 300 |

## 5. Cổng QC trên CI (trượt 1 = không gộp; không nới ngưỡng)
Như `spanish-course.md` §5 với `ko`, thay LanguageTool bằng phân tích hình thái (bảng §3), và thêm:
1. **Chữ viết + phát âm** (`validate()`, node, mọi PR): từ là Hangul trọn âm tiết NFC; `pron`, `romaja`, `ipa` **bằng đúng** bản `ko-hangul.mjs` sinh từ chữ (ngoại lệ chỉ qua `pronX` hợp lệ); `topik` ∈ 1…6; vị từ có `conj` khớp hình thức gốc, từ khác không có; `hanja` là Hán tự đủ số âm tiết; không `gender`/`plural`; ngôn ngữ khác không được có trường ko.
2. **Phát âm độc lập**: `pron` seed/lô ↔ g2pk2 khớp 100 % (`tl_ipa.py`, chế độ `pron`; mục có `pronX` chỉ báo) ; W1 thêm ↔ krdict (phát âm chuẩn của Viện Quốc ngữ).
3. **Bộ chia**: `conj()` ↔ Wiktionary/krdict 100 % ở W2; W0 có 20 vị từ mẫu đủ 12 lớp trong test.
4. **Giọng**: −16 LUFS ±1; Whisper large-v3-turbo nghe lại sau câu mang "다음 단어는", chữ nghe được (NFC, bỏ dấu câu) phải đúng từ – WER mục từ = 0; tỉ lệ đạt ≥ 80 % mỗi giọng dùng thật (`require`), không thì giọng máy.
5. **Câu**: 해요체 ở câu chính, một câu một thể, không Latin/Hán tự/jamo rời, từ đứng đầu một 어절; tiểu từ sau từ đích khớp âm cuối (W1, Kiwi).
6. **Không hồi quy** en/es/fr/ja: `target-lang` + toàn bộ `npm test`.

## 6. Tiêu chí xong
Như `spanish-course.md` §6 cho ko: mọi phần ở §1 đủ TOPIK 1→6, qua cổng §5 ở 14 ngôn ngữ, giáo viên dạy bằng giọng ko, chạy web/add-on/iOS/Android, cờ 100 % (+ kill switch) sau 1 tuần nhóm thử không lỗi chặn.

## 7. Rủi ro
- **Không có giọng Hàn trong Kokoro/Piper**: phụ thuộc Supertonic 3 (một nhà cung cấp); nếu lượt mẫu < 80 % → thử bước `steps`/`speed`, rồi ứng viên miễn phí khác cùng cổng (không dùng giấy phép NC, không trả phí). Ngoài trình duyệt, `speechSynthesis` ko-KR là dự phòng cuối (máy nào cũng có giọng Hàn: iOS Yuna, Android Google).
- **Ngoại lệ phát âm theo từ** (사이시옷, Hán-Hàn ㄹ + ㄷㅅㅈ, ㄴ 첨가): máy không đoán được → người soạn phải khai `pronX`; cổng g2pk2 + krdict bắt mục quên khai.
- **ㅐ/ㅔ, ㅚ/ㅙ/ㅞ đồng âm ở Seoul trẻ**: IPA giữ ɛ/e theo chuẩn; bài nghe không làm cặp tối thiểu với chúng; chấm nói không trừ điểm.
- **Dung lượng**: dữ liệu Hangul/nét/phông → `web/packs` + CDN, lazy theo bài; size-budget chặn.
- **Hạn mức ai-pool** (chung es/fr/ja): mỗi lượt sinh ≤ ¼ hạn mức ngày, sinh ưu tiên Groq/gc-groq, chấm Gemini, lệch giờ với lô es (sau 08:00 UTC); không trả phí khi chưa hỏi.
- **Thứ tự**: ko không bật cho người dùng trước khi ja đạt W7 (thứ tự chủ chốt: es → fr → ja → ko).

## 8. Quyết định chuẩn (tự quyết theo ủy quyền toàn quyền của chủ, 22/11/2026)
1. **Chuẩn ngôn ngữ**: tiếng Hàn chuẩn Seoul (표준어) cho giọng, phát âm, ví dụ, đáp án; phương ngữ (경상도/전라도) và tiếng Bắc Triều Tiên chỉ ở ghi chú nhận biết.
2. **IPA** rộng Seoul, SINH từ `pron`: tắc thường k t p tɕ đầu từ, ɡ d b dʑ giữa âm hữu thanh; căng k͈ t͈ p͈ s͈ t͈ɕ; bật hơi kʰ tʰ pʰ tɕʰ; ㅅ/ㅆ trước i/j/ɥ = ɕ/ɕ͈; ㄹ đầu âm tiết = ɾ, cuối/ㄹㄹ = l; âm cuối k̚ t̚ p̚ n l m ŋ; nguyên âm a ɛ ʌ e o u ɯ i, ㅚ = we, ㅟ = ɥi, ㅢ = ɰi. Không chấm âm tiết, không ghi ngữ điệu.
3. **Romaja** = RR 2000 (chuẩn chính phủ Hàn, khớp biển hiệu/bản đồ): theo phát âm cho đồng hoá phụ âm, không ghi căng hoá, nguyên âm theo chữ (ㅢ = ui), danh từ giữ ㄱㄷㅂ + ㅎ (Mukho). Chỉ là trợ giúp ở bài Hangul + tuần đầu, tự tắt khi thuộc ≥ 80 % jamo.
4. **Thể câu chính** = 해요체 (thông dụng, lịch sự, dạy được cả nói và viết tin nhắn); 합쇼체 cho lời chào/thông báo cố định từ A1; 반말 có nhãn từ B1.
5. **Hanja** hiện mặc định cho giao diện zh/ja (và âm Hán-Việt cho vi) khi từ có `hanja`; giao diện khác có công tắc. Không bắt học hanja, không vào đáp án.
6. **Nhãn thi**: "Luyện theo định dạng TOPIK" (không liên kết cơ quan tổ chức, không đề thật – tên thi chỉ để mô tả).
7. **Giọng**: chốt sau lượt mẫu `word-audio-ko` (§9), giọng nữ đạt cổng cao nhất = Ama, giọng nam = Carlos; không có giọng nam đạt → video ko chỉ Ama (ghi lý do ở §9), không hạ cổng.

## 9. Trạng thái
- **W0** (22/11/2026): spec này; `scripts/target/ko-hangul.mjs` (tách/ghép + bộ gõ 2 hàng, phát âm chuẩn 30 ca + vị từ + 5 loại ngoại lệ `pronX`, RR khớp 15 ví dụ chính thức, IPA, tiểu từ, số + từ đếm, chia 20 vị từ đủ 12 lớp, chấm IME); dòng `ko` ở `web/js/target.js` (`ready: false`, `kokoro: {}` → giọng máy ko-KR; cờ `ko_course`/`ko_course_pct`/`ko_kill` ở PUBLIC_KEYS + CONFIG_KEYS, chung nhóm thiết bị `lk.esb`); `TL_GEN.ko` + `TL_RULES.ko` (noGender, sub 'lead', hangul, end 해요체, lint); `lib.mjs` cho phép dấu căng ͈ trong IPA; `tl-voices.json` ko (không Kokoro; Supertonic 3 F1/F2/M1/M2; câu mang "다음 단어는", không cắt; phát âm seed ↔ g2pk2) + nhãn `word-audio-ko`; `tl_piper.py` thêm động cơ `supertonic` + lấy từ seed khi bảng không có giọng Kokoro; `tl-sample.mjs` bỏ Kokoro khi `voices` rỗng; ma trận PR `target-content` thêm ko; seed 30 từ `content/target/ko/` (28 khái niệm chung với seed ja/es + 한국어/김밥; phủ nối âm, căng hoá, bật hơi ㅎ, âm cuối ㅋ, căng hoá theo từ, 5 lớp chia, tính từ định ngữ, 8 từ có hanja); chuỗi "Đã thêm {n} từ tiếng Hàn" đủ 15 ngôn ngữ. Thẻ ko giữ `pron`/`romaja`/`conj`. Chồng trên nhánh ja W0 (#1859) vì dùng chung khung nguồn giọng `alts`/`require`.
- **Lượt mẫu giọng W0**: chạy bằng nhãn `word-audio-ko` trên PR W0 – kết quả + quyết định `require` ghi tại đây.
- **W1a cần**: dữ liệu nét 40 jamo (tự soạn), màn bài Hangul (Stitch), chấm nét + ghép khối; **W1b**: ứng viên từ danh sách NIKL, `gen.mjs` SINH pron/RR/IPA từ chữ trước cổng, bước CI Kiwi + g2pk2 + krdict/kaikki.
