# Bài học trộn bài tập nhỏ (#/lesson) – thiết kế + MVP

> TL;DR: Một bài 3–5 phút gồm 10–14 bài tập nhỏ trộn 7 dạng (nghe chọn từ thiếu · nghe xếp câu · nghe gõ lại · nói theo · nhìn ảnh nói từ · dịch bằng ô chữ · ghép cặp),
> **cá nhân hóa** từ thẻ đến hạn FSRS + từ đã tra bằng add-on, **0 tim/năng lượng**, sai thì gặp lại trong bài ("Lỗi cũ") và vào hàng ôn FSRS,
> phản hồi tức thì + "Giải thích đáp án" từ dữ liệu sẵn có (gold bank `why`, từ điển, IPA, trọng âm, US/UK – 0 lượt AI), thanh tiến độ + COMBO,
> Ama/Carlos đọc lời nhắc bằng sprite khớp miệng (pilot B, PR #151). Mọi thứ trên máy, tải lười (khung app +~0,4 KB). MVP sau cờ `lesson_mix`.
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
| Gold bank | `content/video/scripts/bank/*.jsonl` (`why`, `wrong`, `right`, `ex`) | dựng `web/js/lesson/gold.js` (theo từ) |
| Nhịp buổi học (combo, tạm tắt nghe/nói) | `confidence.js` | cùng tinh thần; bài học có máy trạng thái riêng nhỏ hơn |
| Tiến trình ngày | `path-day.js` (dùng `dueList`) | sau duyệt: thêm bước "Bài học trộn" |

## 2. Luồng một bài
1. **Chọn 5–7 từ** (`LessonEngine.pickWords`): đến hạn FSRS (quá hạn lâu trước) → từ tra bằng add-on gần nhất (`c.src`/`c.contexts`) → thẻ mới → bộ khởi đầu A1 (người mới, 0 thẻ).
2. **Dựng 10–14 bài** (`build`): mỗi từ 2 dạng khác nhau theo dữ liệu có thật (không có câu → không có dạng câu; không có ảnh đúng `từ#loại` → không có dạng ảnh); xen kẽ, không 2 bài liền cùng từ.
3. **Hàng đợi**: sai → bản sao vào cuối hàng, gắn nhãn **"Lỗi cũ"** (tối đa 2 lần/bài); thanh tiến độ chỉ tăng khi đúng.
4. **COMBO**: đúng liên tiếp ≥ 3 → hiện "🔥 COMBO ×n", sai → về 0. **Màn kết**: +XP · tỉ lệ đúng · COMBO cao nhất · thời gian · từ cần ôn.
5. **Phản hồi tức thì** (sheet dưới): đúng/sai, đáp án, nghĩa, IPA + trọng âm, ghi chú US/UK (khi `ipa ≠ ipaUS`), nút **Giải thích** (gold `why` + sai→đúng, hoặc định nghĩa + ví dụ) – 0 AI.
6. **"Không nghe được lúc này" / "Không nói được lúc này"**: tắt dạng đó 60 phút (`lk.lsn.off`), các bài còn lại tự đổi sang bản đọc/bản chọn; không trừ điểm.
7. **Cuối bài → FSRS**: từ sai ≥ 1 lần → `grade 0` (Quên) – chưa có thẻ thì `App.addWord` để vào hàng ôn; từ đến hạn đúng ngay lần đầu → `grade 2`; từ chưa đến hạn đúng → không đổi lịch. XP qua `App.reward`. Demo (`?demo=1`) không ghi gì.
8. **0 tim, 0 năng lượng, 0 khóa**: không có giới hạn số bài/ngày.

## 2b. Cảm giác game (chủ 27/10: "như Duolingo – ít chữ, không phải nghĩ học gì")
- `#/lesson` = **bản đồ chặng** 6 nút tự trộn (`pathPlan`: Bài học · Nghe · Nói · Ôn lỗi; nhiều từ đến hạn/hay quên → mở bằng Ôn lỗi), **một** nút phát sáng + BẮT ĐẦU; `#/lesson/go` = chơi nút đó. Truyện/Radio thành nút khi có (§8).
- Bài 2–3 phút (4 từ ≈ 9 bài). Chữ hướng dẫn ≤ 5 từ; giải thích chỉ khi bấm **Vì sao?** (trọng âm, US/UK, gold `why`).
- Mỗi câu: âm + rung (`Sfx`, theo Cài đặt › Hiệu ứng âm thanh), giáo viên gật/lắc + nói ("Nice!"/"Almost!") + emoji; ô chữ nảy, thanh tiến độ sáng, COMBO 🔥; màn kết pháo giấy + XP · % · thời gian, **1 chạm** sang bài tiếp. Chỉ transform/opacity (60 fps), tắt khi giảm chuyển động.

## 2c. Truyện + Radio (nút trên bản đồ) · trang chủ = bản đồ
- Nội dung `content/lesson/stories.json` (tự soạn A1–A2, Ama ↔ Carlos) → `scripts/lesson/build-stories.mjs` (kiểm lược đồ, cặp ghép đủ 15 ngôn ngữ) → `web/js/lesson/stories.js` (~5 KB gz, trong bundle `lesson`).
- **Truyện**: từng câu thoại (người nói sáng lên, chữ hiện dạng chat) + bài kiểm xen giữa: xếp lại câu vừa nghe · câu hỏi hiểu · ghép cụm ↔ nghĩa (ngôn ngữ người học). **Radio**: chỉ nghe (không chữ, "ON AIR") rồi 3 câu hỏi.
- Giọng: Kokoro **sinh sẵn trên CI** (`scripts/gen-audio.mjs`, `audio.yml` hằng đêm; Ama = af_heart, Carlos = am_michael) → `audio.lexkite.com/audio/l/<KVoice.lineKey>.mp3`; miệng sprite chạy theo đúng độ dài file; chưa có file → giọng máy. Cue Rhubarb theo âm vị: sau duyệt.
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
- `web/js/lesson/teacher.js`: port tối giản của pilot B (`docs/mocks/teacher-pilot/b-sprite.html`, PR #151): vòng lặp 3 s + 10 hình miệng Rhubarb (X A B C1 C D E F G H) + bám mặt theo khung.
- Lời nhắc trong bài là câu động (từ của người học) → chưa có mp3+cue sinh sẵn: miệng chạy theo **chữ → viseme** (bảng chữ cái → hình miệng) trong lúc `UI.tts` đang đọc (`onEnd` dừng). Câu cố định ("Nice!", "Try again") sau duyệt sẽ sinh sẵn Kokoro + Rhubarb trên CI (đúng §5 TEACHER-IN-APP) – driver đã nhận `cues` nếu có.
- Hạ cấp: `saveData` / `prefers-reduced-motion` / thiếu tài sản → ảnh poster tĩnh; không có giáo viên → bài vẫn chạy.
- Tài sản `web/teach/<ama|carlos>/` (chép từ pilot): poster 17 KB + loop 100–130 KB + miệng 20 KB + json 6 KB ≈ **≤ 180 KB lần đầu, 0 lần sau (SW)**.

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
| 5 | **Cuộc gọi Ama/Carlos**: kịch bản rẽ nhánh + **tổng kết** ("bạn đã dùng 11 từ") + **xem lại lời thoại** có ghi chú sửa (bread ≠ breast, "trả lời đầy đủ hơn") | khớp từ tại máy; cặp âm dễ nhầm từ `pron/pairs.js` | `call.js`, `pron` |
| 6 | **Giải thích theo lớp lỗi** (giới từ, thì, mạo từ…) trước, Gemini Nano khi có (desktop) | luật trên máy, Nano trên máy | `writecheck-rules.js`, `ai-local.js` |
| 7 | Nhận giọng trên máy mặc định khi tải được: Whisper tiny.en (đã có) / Moonshine tiny; Web Speech chỉ dự phòng (gửi âm thanh tới Google, WebView Android chập chờn) | tải lười khi vào bài nói, theo ngân sách §5 | `UI.recognize` |
| 8 | Chấm âm vị "beta" (wav2vec2 CTC + GOP, chỉnh theo speechocean762 CC BY 4.0) – desktop/WebGPU trước (~300M tham số) | trên máy | `pron` GOP hiện có |
FSRS giữ bản trong `core.js` (đã chạy, có test) – không đổi sang ts-fsrs. Rive chỉ cân nhắc cho hoạt cảnh phản ứng nếu sprite chưa đủ.
