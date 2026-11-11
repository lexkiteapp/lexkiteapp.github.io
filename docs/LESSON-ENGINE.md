# Bài học trộn bài tập nhỏ (#/lesson) – thiết kế + MVP

> TL;DR: Một bài 3–5 phút gồm 10–14 bài tập nhỏ trộn 7 dạng (nghe chọn từ thiếu · nghe xếp câu · nghe gõ lại · nói theo · nhìn ảnh nói từ · dịch bằng ô chữ · ghép cặp),
> **cá nhân hóa** từ thẻ đến hạn FSRS + từ đã tra bằng add-on, **0 tim/năng lượng**, sai thì gặp lại trong bài ("Lỗi cũ") và vào hàng ôn FSRS,
> phản hồi tức thì + "Giải thích đáp án" từ dữ liệu sẵn có (gold bank `why`, từ điển, IPA, trọng âm, US/UK – 0 lượt AI), thanh tiến độ + COMBO,
> Ama/Carlos đọc lời nhắc bằng clip phông xanh tách nền (nói/nghe). Mọi thứ trên máy, tải lười (khung app +~0,4 KB). MVP sau cờ `lesson_mix`.
> Đọc khi: sửa/mở rộng màn `#/lesson`, thêm dạng bài, đổi cách chọn từ hoặc cách ghi FSRS.

## 1. Đã có gì (audit 27/10, main `938821c2e`) → tái dùng, không viết trùng
| Có sẵn | Ở đâu | Dùng thế nào |
|---|---|---|
| FSRS + định nghĩa "đến hạn" duy nhất | `core.js` `SRS.review`, `Cards.dueList(map,{practicable})` | chọn từ + ghi điểm cuối bài |
| Thẻ có ngữ cảnh từ add-on | `Cards._add` ghi `c.ctx`/`c.src` khi lưu từ trang web | ưu tiên số 2, câu của chính người học |
| Câu song ngữ | `c.sentences = [{en, vi}]` (vi = ngôn ngữ người học, Tatoeba) | dạng dịch bằng ô chữ |
| Ảnh theo nghĩa `từ#loại` | `VImg.has/get` (`vocab-img.js`, cờ `vocab_img`) | dạng nhìn ảnh nói từ – chỉ khi có đúng `từ#loại` |
| Đọc + nhận giọng | `UI.tts` (Kokoro nếu có, rồi máy), `UI.recognize` (Web Speech → Whisper trên máy) | nghe/nói |
| Giải thích đáp án | `explain-card.js` (lược đồ `{why, wrong, ex, hook}`) | khung HTML giải thích |
| Gold bank | `content/video/scripts/bank/*.jsonl` (`why`, `wrong`, `right`, `ex`) | dựng `web/cpack/lesson/gold.js` (theo từ) |
| Nhịp buổi học (combo, tạm tắt nghe/nói) | `confidence.js` | cùng tinh thần; bài học có máy trạng thái riêng nhỏ hơn |
| Tiến trình ngày | `path-day.js` (dùng `dueList`) | sau duyệt: thêm bước "Bài học trộn" |

## 2. Luồng một bài
1. **Chọn 5–7 từ** (`LessonEngine.pickWords`): đến hạn FSRS (quá hạn lâu trước) → từ tra bằng add-on gần nhất (`c.src`/`c.contexts`) → thẻ mới → bộ khởi đầu A1 (người mới, 0 thẻ).
2. **Dựng 10–14 bài** (`build`): mỗi từ 2 dạng khác nhau theo dữ liệu có thật (không có câu → không có dạng câu; không có ảnh đúng `từ#loại` → không có dạng ảnh); xen kẽ, không 2 bài liền cùng từ.
3. **Hàng đợi**: sai → bản sao vào cuối hàng, gắn nhãn **"Lỗi cũ"** (tối đa 2 lần/bài); thanh tiến độ chỉ tăng khi đúng.
4. **COMBO**: đúng liên tiếp ≥ 3 → hiện "🔥 COMBO ×n", sai → về 0. **Màn kết**: +XP · tỉ lệ đúng · COMBO cao nhất · thời gian · từ cần ôn.
5. **Phản hồi tức thì** (sheet dưới): đúng/sai, đáp án, nghĩa, IPA + trọng âm, ghi chú US/UK (khi `ipa ≠ ipaUS`), nút **Giải thích**: phần CÂU trước – `lesson/why.js` (lỗi vừa mắc so với đáp án, trật tự từ, từ nhiễu, ví dụ MỚI không lặp câu bài; docs/specs/sentence-builder.md), rồi phần TỪ (gold `why` + sai→đúng, hoặc định nghĩa + ví dụ) – 0 AI.
6. **"Không nghe được lúc này" / "Không nói được lúc này"**: tắt dạng đó 60 phút (`lk.lsn.off`), các bài còn lại tự đổi sang bản đọc/bản chọn; không trừ điểm.
   Micro không bao giờ "chết" im lặng (LX-1002): mỗi lần chạm kết thúc bằng câu nghe được hoặc lời nhắn theo mã lỗi (`UI.recErrorText`) + nhãn **Thử lại**; hỏng micro/quyền/mạng 2 lần → chỉ lối "Không nói được lúc này". `UI.recognize` luôn phát đúng 1 result/error trước end (phiên kết thúc im lặng/treo → `no-speech`); dịch vụ của trình duyệt hỏng (`network`/`service-not-allowed`/`language-not-supported`) → cả phiên chuyển sang ghi âm + Whisper trên máy. Test: `scripts/test/lesson.mjs` phần F.
7. **Cuối bài → FSRS**: từ sai ≥ 1 lần → `grade 0` (Quên) – chưa có thẻ thì `App.addWord` để vào hàng ôn; từ đến hạn đúng ngay lần đầu → `grade 2`; từ chưa đến hạn đúng → không đổi lịch. XP qua `App.reward`. Demo (`?demo=1`) không ghi gì.
8. **0 tim, 0 năng lượng, 0 khóa**: không có giới hạn số bài/ngày.

## 2b. Cảm giác game (chủ 27/10: "như Duolingo – ít chữ, không phải nghĩ học gì")
- `#/lesson` = **bản đồ chặng** 6 nút tự trộn (`pathPlan`: Bài học · Nghe · Nói · Ôn lỗi; nhiều từ đến hạn/hay quên → mở bằng Ôn lỗi), **một** nút phát sáng + BẮT ĐẦU; `#/lesson/go` = chơi nút đó. Truyện/Radio thành nút khi có (§8).
- Bài 2–3 phút (4 từ ≈ 9 bài). Chữ hướng dẫn ≤ 5 từ; giải thích chỉ khi bấm **Vì sao?** (trọng âm, US/UK, gold `why`).
- Mỗi câu: âm + rung (`Sfx`, theo Cài đặt › Hiệu ứng âm thanh), giáo viên gật/lắc + nói ("Nice!"/"Almost!") + emoji; ô chữ nảy, thanh tiến độ sáng, COMBO 🔥; màn kết pháo giấy + XP · % · thời gian, **1 chạm** sang bài tiếp. Chỉ transform/opacity (60 fps), tắt khi giảm chuyển động.

## 2c. Truyện + Radio (nút trên bản đồ) · trang chủ = bản đồ
- Nội dung `content/lesson/stories.json` (tự soạn A1–A2, Ama ↔ Carlos) → `scripts/lesson/build-stories.mjs` (kiểm lược đồ, cặp ghép đủ 15 ngôn ngữ) → `web/cpack/lesson/stories.js` (~5 KB gz, trong bundle `lesson`).
- **Truyện**: từng câu thoại (người nói sáng lên, chữ hiện dạng chat) + bài kiểm xen giữa: xếp lại câu vừa nghe · câu hỏi hiểu · ghép cụm ↔ nghĩa (ngôn ngữ người học). **Radio**: chỉ nghe (không chữ, "ON AIR") rồi 3 câu hỏi.
- Giọng: Kokoro **sinh sẵn trên CI** (`scripts/gen-audio.mjs`, `audio.yml` hằng đêm; Ama = af_heart, Carlos = am_michael) → `audio.lexkite.com/audio/l/<KVoice.lineKey>.mp3`; vòng nói chạy đúng độ dài file; chưa có file → giọng máy. Khớp âm vị: §4.
- Câu thoại không tính điểm (chỉ tiến độ); hết bài → bài kế tiếp xoay vòng. Cờ `lesson_mix` bật → `#/home` = bản đồ (trang chủ đầy đủ ở `#/home?all=1`).

- Cờ `ux1` (5 tab, trang chủ = bản đồ theo mục tiêu thi + trình độ, nút kiểm tra kỹ năng thi): xem [LEARNING-PATH.md](LEARNING-PATH.md).

## 3. Bảy dạng bài (MVP)
| Dạng | Cần dữ liệu | Chấm | Khi tắt nghe / nói |
|---|---|---|---|
| `gap` nghe chọn từ thiếu (+ nút 🐢 0,7×) | câu chứa từ | chọn 1/4 (nhiễu cùng loại từ) | hiện câu chữ |
| `build` nghe xếp câu | câu 3–10 từ | thứ tự ô = câu (bỏ dấu câu/hoa thường) | hiện nghĩa thay audio |
| `say` nói theo | câu hoặc từ | `UI.recognize` ≥ 0,7 (máy) | đổi sang `gap` |
| `pic` nhìn ảnh nói từ | `VImg` có đúng `từ#loại` | nói ≥ 0,7, hoặc chọn 1/4 khi tắt nói | chọn 1/4 |
| `tr` dịch bằng ô chữ | `c.sentences[0]` {en, vi} | thứ tự ô = câu en | giữ (không cần nghe) |
| `type` nghe gõ lại | từ đơn | gõ = từ (bỏ hoa/thường, khoảng trắng) | gõ từ theo nghĩa |
| `match` ghép cặp (1/bài) | ≥ 4 từ có nghĩa | 4 cặp từ ↔ nghĩa, 0 lần nhầm = đúng | giữ |

## 4. Giáo viên Ama/Carlos
- Nguồn: clip **phông xanh 2D đã tách nền PRO** (Ama `ga2_talk/ga2_listen`, Carlos `gc4_talk_natural/gc4_listen`) → `scripts/video/teach_build.sh` trên CI macOS (`teach-build.yml`, đẩy nhánh `teach-build*`, 0 credit): khung 3:4 theo bao alpha chung (đủ đầu + khoảng thở), vòng ping-pong, VP9 alpha `.webm` + HEVC alpha `.mov` (Safari/iOS) + `poster.webp`.
- `web/js/lesson/teacher.js`: nói → vòng `talk` (miệng thật của clip, khớp nhịp), im → `listen`, crossfade 160 ms; nền trong suốt, không khung vuông. Đã bỏ cách ghép mảng miệng từ nhiều clip (28/10: lệch màu, dính nền, trượt ~6,6 px).
- Khớp từng âm vị: làm SAU, chỉ với hình miệng trích từ CHÍNH clip đang phát + cổng CI đo chênh màu viền/độ trượt; pilot 1 câu → chủ duyệt trước khi bật.
- Hạ cấp: `saveData` / `prefers-reduced-motion` / thiếu tài sản → `poster.webp` tĩnh; không có giáo viên → bài vẫn chạy.

## 5. Dung lượng (ngân sách TEACHER-IN-APP §2b)
| Phần | Byte | Khi nào tải |
|---|---:|---|
| Khung app | +~0,4 KB (2 dòng BUNDLES/ROUTE_BUNDLE + thẻ trang chủ khi cờ bật) | luôn |
| `lesson` (engine + ui + en strings) | ~9 KB gz | mở `#/lesson` |
| `lgold` gold bank theo từ | ~12 KB gz | lần đầu bấm Giải thích |
| Giáo viên | ≤ 180 KB | mở bài, `!saveData`; lần sau 0 |
| Ảnh | ≤ 6 KB/ảnh (`VImg`) | chỉ bài `pic` |

## 6. Cờ & phát hành
- Cờ `lesson_mix` (config công khai `lk.cfg`), thử: `localStorage lk.lesson=1` hoặc mở `#/lesson?demo=1` (bộ từ mẫu, không ghi FSRS – link demo cho anh).
- Cờ tắt → không có thẻ ở trang chủ, khung app không tải gì thêm. **Anh duyệt demo rồi mới bật** (bật dần theo `%` như `vocab_img`).
- Android (Capacitor) dùng cùng mã web; add-on mở tab `lexkite.com/app/#/lesson` (không đổi `permissions.lock`).

## 7. Kiểm thử (CI, không tài khoản thật)
`scripts/test/lesson.mjs` (trong `npm test`): engine thuần (chọn từ theo ưu tiên, dạng theo dữ liệu, hàng đợi lỗi cũ, combo, tắt nghe/nói, FSRS cuối bài) + jsdom chạy hết 1 bài demo (đúng/sai/giải thích/kết quả, 0 lỗi console).

## 8. Lộ trình sau MVP (từ ảnh Duolingo anh gửi 27/10 + nghiên cứu; mỗi mục 1 phiên, chờ anh duyệt)
| # | Hạng mục | Cách làm $0 | Tái dùng |
|---|---|---|---|
| 1 | **Bản đồ lộ trình**: mỗi unit trộn nút bài học · video · truyện · Radio · ôn tập (+XP) | nút = route lười; tiến độ IndexedDB | `path-day.js`, `lesson-video.js` |
| 2 | ✅ (MVP §2c) **Truyện (Stories)**: hội thoại minh họa Ama ↔ Carlos, giữa truyện có "chạm từ bạn nghe" + ghép cặp cụm VN↔EN, câu hỏi hiểu | kịch bản JSON + Kokoro + cue Rhubarb **sinh sẵn trên CI** (tĩnh) | engine (`build`/`match`), `teacher.js` |
| 3 | ✅ (MVP §2c) **Radio**: nghe 1–2 phút (2 giọng) + 3 câu hỏi | Kokoro sinh sẵn trên CI | `listening.js` qengine |
| 4 | **Practice Hub** hằng ngày: từ yếu · đến hạn · lỗi cũ | chỉ đọc FSRS + nhật ký Lỗi cũ trên máy | `dueList`, `LessonEngine.results` |
| 5 | ✅ (`docs/CALL.md`) **Cuộc gọi Ama/Carlos**: kịch bản rẽ nhánh + **tổng kết** ("bạn đã dùng 11 từ") + **xem lại lời thoại** có ghi chú sửa (bread ≠ breast, "trả lời đầy đủ hơn") | khớp từ tại máy; cặp âm dễ nhầm từ `pron/pairs.js` | `call.js`, `pron` |
| 6 | **Giải thích theo lớp lỗi** (giới từ, thì, mạo từ…) trước, Gemini Nano khi có (desktop) | luật trên máy, Nano trên máy | `writecheck-rules.js`, `ai-local.js` |
| 7 | ✅ cho cuộc gọi (`docs/CALL.md`; Moonshine chưa) Nhận giọng trên máy mặc định khi tải được: Whisper tiny.en (đã có) / Moonshine tiny; Web Speech chỉ dự phòng (gửi âm thanh tới Google, WebView Android chập chờn) | tải lười khi vào bài nói, theo ngân sách §5 | `UI.recognize` |
| 8 | Chấm âm vị "beta" (wav2vec2 CTC + GOP, chỉnh theo speechocean762 CC BY 4.0) – desktop/WebGPU trước (~300M tham số) | trên máy | `pron` GOP hiện có |
FSRS giữ bản trong `core.js` (đã chạy, có test) – không đổi sang ts-fsrs. Rive chỉ cân nhắc cho hoạt cảnh phản ứng nếu sprite chưa đủ.

## Khớp miệng mặt VẼ Ama/Carlos (Call, bài học, Truyện, video) – $0

> TL;DR: Giáo viên 2D Ama/Carlos khớp **từng âm** bằng 9 hình miệng (chuẩn Rhubarb/Preston Blair) cắt từ chính clip registry, đè lên tư thế cảm xúc 2D sẵn có, có chớp mắt và nhịp đầu. Câu dựng sẵn: Kokoro + Rhubarb trên CI. Câu AI lúc chạy: chữ → âm vị (CMUdict) chạy theo đồng hồ âm thanh và năng lượng Web Audio. Đang ở **lab** (`web/lab/lipsync.html?lab=1`), chưa vào luồng Call: chờ anh duyệt video.
> Đọc khi: sửa `web/js/call/lipsync.js`, `scripts/lipsync/*`, đưa khớp miệng vào `call.js`/`lesson/teacher.js` hoặc Play & Speak.

### Câu bài học không có mốc CI (3/11)
Câu có file mp3 nhưng chưa có mốc Kokoro (mọi câu bài học đọc từ kho, lời khen/nhắc): `teacher.js` giải mã đúng file đang phát → `LipSync.envOf` (RMS 100 Hz) → `LipSync.fromEnv` (DP phân đoạn: căn âm vị của chữ vào độ lớn tiếng thật, hình môi M/B/P – F/V – chu môi giữ ≥ 50–60 ms) → chế độ mốc; lỗi CORS/giải mã → giữ live. Cổng `scripts/test/lipsync-lesson.mjs` (npm test + call-qa, so với mốc Kokoro 256 câu): lệch mở miệng p95 ≤ 80 ms (đo 70), môi mím M/B/P ≥ 78 % (đo 80, live 25), đúng hình ≥ 50 % (đo 51, live 28). Máy yếu (> 15 % khung > 50 ms sau 1,5 s) → canvas vẽ ở dpr 1.

### Hiện trạng (trước lab)
`lesson/teacher.js` chỉ bật vòng clip **talk** khi đang nói, **listen** khi im ([CALL.md](../CALL.md)). Miệng trong clip chạy theo nhịp của clip, không theo âm, nên lệch rõ ở từ ngắn và chỗ ngắt. Video teach2d cũng chỉ gate nói/im (`scripts/video/teach2d/qc.py`). Pilot sprite cũ (#151, `docs/mocks/teacher-pilot/b-sprite.html`) có khớp âm nhưng dùng mặt bản 3D cũ, không còn đúng nhân vật 2D.

### Cách làm các bên và nguồn mở (đã kiểm license)
| Hướng | Dùng? | Lý do |
|---|---|---|
| [Rhubarb Lip Sync](https://github.com/DanielSWolf/rhubarb-lip-sync) (MIT) | ✅ câu dựng sẵn | làm cho 2D, có `--dialogFile`, đã dùng trong `cine-render.yml` |
| Kokoro ([hexgrad/kokoro](https://github.com/hexgrad/kokoro), Apache-2.0) | ✅ giọng | `start_ts/end_ts` từng từ (tiếng Anh): dự phòng/kiểm chéo |
| CMUdict ([cmusphinx](https://github.com/cmusphinx/cmudict), BSD) + luật chữ | ✅ câu AI | `content/lexicon/cmudict-subset.txt` có sẵn |
| [wawa-lipsync](https://github.com/wass08/wawa-lipsync) (MIT), Web Audio | ý tưởng | ta chỉ dùng năng lượng để mở/đóng; hình miệng lấy từ chữ (chuẩn hơn phổ tần) |
| [TalkingHead](https://github.com/met4citizen/TalkingHead) / [HeadTTS](https://github.com/met4citizen/HeadTTS) (MIT) | sau | TTS trên máy có mốc từ; WASM chậm hơn thời gian thực trên máy yếu |
| `speechSynthesis` onboundary | dự phòng | [caniuse](https://caniuse.com/mdn-api_speechsynthesisutterance_boundary_event) một phần, [WebKit 238189](https://auto-bugs.webkit.org/show_bug.cgi?id=238189): neo lại khi có, không phụ thuộc |
| Duolingo ([visemes](https://blog.duolingo.com/world-character-visemes), [Rive/Lily](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)) | mẫu | TTS → căn âm vị → viseme; miệng và tư thế chạy song song: đúng kiến trúc ở đây |
| OVRLipSync ([license](https://developers.meta.com/vr/licenses/oculussdk/)) · [Wav2Lip](https://github.com/Rudrabha/Wav2Lip) | ❌ | chỉ nền tảng Meta · cấm thương mại |
| [MuseTalk](https://github.com/TMElyralab/MuseTalk) / [LatentSync](https://github.com/bytedance/LatentSync) | ❌ | cần GPU 8–18 GB, làm cho mặt người thật, video nặng |

**Phương án B (nếu miệng cắt từ clip chưa đạt):** vẽ lại Ama/Carlos thành Rive state machine, giống cách Duolingo làm Lily. Lớp miệng (input số = viseme) chạy song song lớp tư thế/biểu cảm. [Runtime web](https://github.com/rive-app/rive-wasm) MIT, ~150 KB, chạy thời gian thực, nhận đúng cues ở trên. Không dùng nhân vật cộng đồng chưa kiểm license, phải được cho dùng thương mại. Đổi hình cần anh duyệt.

### Miệng VẼ (31/10, thay miệng cắt-dán)
Anh chủ xem video miệng cắt từ clip: "lỗi ghê quá" → bỏ. Thay bằng `web/js/call/mouths.js` (`LipMouth`): 9 hình X–H là bộ số (rộng, mở trên/dưới, tròn, cười, răng, lưỡi) → SVG vector theo nét từng giáo viên (Ama: môi nâu đỏ, nét miệng tối; Carlos: nét đen, ria vẽ đè lên). Trộn 2 hình = nội suy bộ số (morph), cùng kiểu lớp miệng Rive (input số = viseme) – file .riv có thể dựng sau từ chính bộ số này. Bảng duyệt: `scripts/lipsync/mouth_board.py` (CI: artifact `mouth-board.png`). **Chờ anh duyệt hình** trước khi gắn vào lab/luồng Call.
Mốc: `LipSync.align(cues, env, {words})` neo mép im↔mở vào lúc tiếng bắt đầu/tắt (RMS 100 Hz), tuỳ chọn thời điểm từ Kokoro; report ghi lệch trước/sau (`AV lag (thô)`).

### Mặt VẼ nhiều lớp + mốc Kokoro (31/10, chuẩn Duolingo/Rive)
- **Lớp mặt** `web/js/call/face.js` (`LipFace`): đầu trơn (poster-2x xoá mắt/mày/miệng/ria, lấp da bằng nội suy Laplace – `scripts/lipsync/face_board.py`) + mắt, mi (mí trên = chớp), mày, ria Carlos, miệng (`LipMouth`) đều vector, toạ độ đo trên poster-2x. Input số kiểu Rive: viseme, gain, blink, look, brow, knit, tilt, nod.
- **Máy biểu cảm** `LipFace.machine()`: các lớp chạy song song, tất định theo hạt giống: chớp 150 ms mỗi 2.8–5.6 s (15 % chớp đôi), liếc chỉ ở chỗ im, nhướng mày ở chỗ nhấn (tiếng bật lên sau ≥150 ms im) và cuối câu hỏi, nghiêng/gật đầu nhẹ theo năng lượng nói, thiên hướng theo cảm xúc (`EMO`).
- **Mốc Kokoro** `scripts/lipsync/kokoro_ts.py`: Kokoro python sinh tiếng và mốc âm vị (pred_dur, 1/40 s) cùng một lần → `LipSync.fromPhones()` → `align` → `smooth` → `lead`. Rhubarb vẫn chạy để so.
- **Độ đi trước riêng** `LipSync.lead()`: M/B/P 65 ms, F/V 45 ms, W/OO 40 ms, còn lại 20 ms (hình trước vẫn ≥ 50 ms). **Độ mở theo độ lớn tiếng** `LipSync.gain(env)` ∈ [0.45, 1.15].
- **Điểm chất lượng** (`drawn_frames.mjs`, cổng CI): lệch ≤ 45 ms · đúng hình theo âm vị Kokoro ≥ 80 % (khung có tiếng, ±40 ms) · 0 nháy · chớp 6–30 lần/phút · fps mặt vẽ ≥ 50 ở CPU 4× (`web/lab/face.html`). Bảng `face-board.png`, video `drawn.gif`. **Chờ anh duyệt hình.**

### Kiến trúc
- **Hình**: `scripts/lipsync/harvest.py` (CI) căn từng khung `talk-hd` vào nền `listen-hd` (ECC affine, che miệng), chọn 9 khung đại diện theo độ mở, răng, bề ngang, mép mảnh mờ dần. X = miệng gốc của nền. Có mí mắt chớp và roi miệng trên từng tư thế `still-<pose>` khớp được.
- **Mốc**: `pre` = cues Rhubarb (đã `smooth`: giữ ≥ 50 ms, không nháy). `live` = `LipSync.live()`, nhân quả: con trỏ âm vị chỉ tiến khi có tiếng (VAD có trễ tắt), im → X. Nếu không có âm thanh (speechSynthesis) thì chạy theo ước lượng và neo lại theo `onboundary`.
- **Vẽ**: `stateAt(cues, t)` lấy theo `audio.currentTime` (không dùng setTimeout), hình đi trước tiếng 20 ms, trộn 60 ms. Phát thật và dựng video dùng cùng một hàm.
- **Cổng** (`lipsync-lab.yml`, CPU 4×): lệch tiếng–miệng ≤ 45 ms, lệch lịch vẽ p95 ≤ 40 ms, fps ≥ 50, 0 nháy (pre), live trùng mở/đóng ≥ 75 %.

### Kết quả lab
Xem artifact `lipsync-lab` của run CI mới nhất (report.md, metrics.json, video ≤ 20 s). Số đo gửi anh kèm video.

### Đưa vào hệ thống (anh OK 31/10: "gắn mặt vẽ khớp miệng vào luồng Call thật (sau cờ lk.lipsync), giữ mọi cổng")
1. **Tài sản** `web/teach/<who>/head-bare(-2x).webp` = poster-2x xoá mắt/mày/miệng/ria (`scripts/lipsync/head_bare.py` → sha256 vào `characters.json`, cổng characters-gate), lấy qua `Chars.head(who, x2)`.
2. **Mốc CI** `scripts/lipsync/call_cues.mjs` (audio.yml, chạy tay được với `only_call_cues`): mỗi câu giáo viên trong Call → Kokoro python sinh tiếng + âm vị cùng lần → `<khoá>-ls.mp3` (kho media; mp3 cũ đệm immutable nên không ghi đè) + `web/js/call/cues.js` (`LK_CUES`: mốc nén, độ lớn tiếng 100 Hz 8 bit, từ điển nhỏ cho live). Mỗi câu qua cổng như lab (lệch ≤ 45 ms, đúng hình ≥ 80 %, 0 nháy); trượt → không ghi mốc → app dùng live.
3. **Luồng Call** `lesson/teacher.js` `mount(el, who, { lip: true })` (chỉ `call.js` truyền): cờ `lk.lipsync` (localStorage 1/0 hoặc config `lipsync`) → nạp lười `call/{lipsync,mouths,face,cues}.js` (khung app không đổi) → `<svg>` đầu trơn + lớp vector, vẽ lại mỗi khung theo `audio.currentTime`, nghiêng/gật quanh cổ trong SVG. Có mốc → pre (độ dài mp3 lệch mốc > 120 ms → live); không có → `LipSync.live()` + năng lượng tiếng (AnalyserNode, cần CORS – audio.lexkite.com trả ACAO *); giọng máy → live theo thời lượng ước tính; nghỉ → chớp/liếc. Hạ cấp: lỗi nạp/thiếu đầu trơn → vòng clip WebGL → poster (saveData / giảm chuyển động).
4. **Bản nhúng** (anh chủ: "nhúng" = video bài học nhúng trên web, `lesson-video.js` / lv_embed): được phủ khi video teach2d có mặt vẽ khớp miệng (cùng `stateAt`/`LipFace`, mốc phones Kokoro) – không dựng widget giáo viên riêng.
5. **Cổng**: lipsync-lab (lab) · call-e2e mục 4b (cờ bật: mặt vẽ thay clip, fps ≥ 50 ở CPU 4×, không lỗi JS) · characters-gate · size-budget (shell không đổi).
6. **Hiệu năng** (01/11, call-e2e 4b đỏ 40 fps): KHÔNG dựng lại DOM mỗi khung – mỗi lớp mặt (`LipFace.parts`) có khung nút cố định (lớp không dùng = `display="none"`, ảnh y hệt), teacher.js chỉ vá thuộc tính lớp đổi → 0 mutation childList trong #view (các MutationObserver của app: toast né nút, edgeFade, nhãn loa… từng chạy mỗi khung). cues.js v2: đoạn im env nén `~n.` (= n nhóm "AAAA", không mất dữ liệu).

### 2/11 – lên web mặc định (PR #293 v2)
- **fps (gốc):** mặt vẽ vẽ trên MỘT `<canvas>` (`web/js/call/paint.js` dịch chuỗi SVG của LipFace → Path2D, đệm LRU), 0 thay đổi DOM mỗi khung → hết tính lại style + MutationObserver của app. call-e2e 4b: fps ≥ 50 ở CPU 4× + đếm 0 mutation trong khung giáo viên.
- **Một bộ máy:** bảng viseme duy nhất `web/js/call/visemes.json` → khối `@visemes` trong lipsync.js (`scripts/lipsync/visemes-sync.mjs`), `scripts/lipsync/visemes.py` (video: `shape_at` = đúng hình web), `cues_cli.mjs` (video dùng nguyên mốc web hoặc cùng đường ống Kokoro). `scripts/lipsync/call_cues.mjs` dùng chung `fromKokoro`. Test chéo `scripts/test/lipsync-cross.mjs` (npm test): mọi câu có mốc → cùng chuỗi hình 24 fps web = video.
- **Sống:** tính cách riêng (`RIG.temper`: Ama chớp/liếc nhanh, mày rõ; Carlos thưa, nhỏ), `listen` khi người học nói (gật nhẹ), `react` happy/encourage/thinking/concern (khóe miệng + mày), tư thế ảnh tĩnh có sẵn → nói thì bỏ ảnh tĩnh, giữ biểu cảm. Giảm chuyển động: giữ miệng + chớp, bỏ nghiêng/gật/liếc.
- **Logic:** không phát (dừng/hết/chờ tải) → miệng về X trong 80 ms; tua/tốc độ theo `audio.currentTime`; mốc lệch độ dài mp3 > 120 ms / lỗi bản -ls → live; 1 AudioContext chung cho nhiều giáo viên; tiết kiệm dữ liệu → poster.
- **Cờ:** `lk.lipsync` mặc định BẬT; `localStorage lk.lipsync=0` hoặc cfg `lipsync:false` = tắt (vòng clip).
- **CI không gọi kho media:** call-e2e dựng WAV giả từ độ lớn tiếng đã lưu trong cues.js (đúng độ dài → chế độ pre).
- **Lab:** workflow lipsync-lab.yml + trang web/lab/{face,lipsync}.html (dùng bởi scripts/lipsync/lab.mjs, drawn_frames.mjs) để ở nhánh `wip/lipsync-lab` – thêm lại khi ci-triage.yml rảnh (PR #429/#172); cổng sản xuất từng câu vẫn chạy trong audio.yml (call_cues.mjs).

## Ghi chú web/js/lesson/teacher.js (chuyển từ đầu tệp, 07/11)

- 👩‍🏫 Ama / Carlos đọc lời nhắc trong bài học – clip PHÔNG XANH đã tách nền PRO (scripts/teach/build.py, CI teach-build.yml), nền trong suốt, đủ đầu.
- Đang nói → vòng "talk" (miệng thật của clip, khớp nhịp), im/nghe → vòng "listen"; trộn 160 ms trong CÙNG 1 canvas (không 2 lớp chồng nhau).
- Video H.264 "xếp chồng" (nửa trên màu đã nhân alpha, nửa dưới alpha) → WebGL ghép thành nền trong suốt: mọi trình duyệt, giải mã phần cứng.
- Hạ cấp: saveData / giảm chuyển động / không WebGL / thiếu tài sản → poster.webp (alpha) tĩnh. Tài sản: chỉ qua Chars (poster, clip talk/listen, đầu trơn).
- 🙂 Mặt VẼ khớp miệng (cờ lk.lipsync, chỉ Call: mount(el, who, { lip: true }), docs/LESSON-ENGINE.md §Khớp miệng): đầu trơn + mắt/mi/mày/ria/miệng vector (LipFace) vẽ lại mỗi khung theo
- audio.currentTime. Có mốc CI (web/js/call/cues.js + <khóa>-ls.mp3) → "pre"; không có → LipSync.live() theo năng lượng tiếng. Thiếu gì → vòng clip như cũ → poster.
