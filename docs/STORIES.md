# Truyện, sách phỏng theo & podcast theo cấp độ (Lexkite Stories)

> TL;DR: Thư viện truyện A1–C1 + podcast hội thoại ngắn, đọc kèm nghe (tô sáng theo câu), chạm từ → thẻ (loa, IPA, nghĩa) với 2 nút **Đã biết / Học** (Học = thẻ SRS sẵn có qua `App.addWord`), câu hỏi hiểu bài cuối chương, bộ đếm "+N từ mới", mục tiêu 10 phút/ngày. Nội dung CHỈ public domain do mình tự phỏng theo, hoặc truyện gốc tự viết. Lõi `web/js/stories/core.js`, nội dung `content/stories/*.json`, cổng `scripts/content-qa/gate.mjs` (mục Stories) + `scripts/test/stories.mjs`. Mốc: M1 lõi + nội dung mẫu (PR này) → M2 màn Stitch chờ anh duyệt → M3 nối giao diện + e2e mobile.

Ý tưởng tính năng lấy cảm hứng từ các app "sách phỏng theo"; KHÔNG chép thương hiệu, câu chữ, ảnh, bố cục của app nào. Mọi chữ trong truyện do mình viết lại.

## 1. Kiểm kê – dùng lại, không viết trùng

| Cần | Đã có | Dùng thế nào |
|---|---|---|
| Bọc từ chạm được + tô sáng | `Lexis.markText` (bài đọc IELTS, `web/js/reading.js`) | Trình đọc truyện dùng `Stories.tokens()` (lõi thuần, test được); M3 cân nhắc gọi `Lexis.markText` cho lớp AWL/từ nối |
| Tra từ nhanh | `Dict.quick` → `Dict.lookup` (`dictionary.js`); IPA `UI.ipaHtml`; loa `UI.audioFor` + `speak` | Thẻ tra từ = popover của `reading.js` thu gọn thành thẻ đáy màn (mobile) |
| Lưu thẻ ôn | `App.addWord(entry, {text, vi, title})`, `App.inDeck`; FSRS `Core.SRS`; `Core.Cards.dueList` (nguồn duy nhất thẻ đến hạn) | Nút **Học** = `App.addWord` kèm câu truyện làm ngữ cảnh, `title: 'Truyện: ' + tên` (khóa, dịch lúc vẽ) |
| Đọc to + tô câu | `UI.tts(text, accent, null, {onSentence, onEnd})`, `UI.splitSentences`, `UI.stopSpeak`; audio-playback robust (#297) | Không có file audio → `UI.tts` + `onSentence`. Có audio (M3) → `Stories.timeline(…, {marks})` + `Stories.sentenceAt(t)` theo `audio.currentTime` |
| Thưởng/tiến độ | `App.reward({readings, listens, quizzes, perfect, xp})`, `Game.mutate`, `goal.js` (chỉ tiêu tuần theo kỹ năng: `readings`, `listens`) | Hết chương: `readings:1` (truyện) hoặc `listens:1` (podcast) → goal.js tự tính tuần |
| Phút/ngày | Gia sư 1-1 (#319) có `Tutor.minutes` | `Stories.addTime/goal` lưu `game.storyMin[day]` (giây, chặn 60 s/nhịp, bỏ khi tab ẩn); M3 đọc chung với gia sư (thẻ "Buổi học hôm nay" hiển thị 10 phút đọc) – không tạo đồng hồ thứ 3 |
| Lời nhắc hằng ngày | `remind.js` (≤ 1/ngày) + loại `tutor` (#319) | Không thêm loại nhắc riêng; gia sư gợi ý "đọc tiếp chương N" |
| Nhân vật | Ama (nữ) + Carlos (nam) 2D (`teach2d`, puppet) | Podcast = Ama + Carlos; ảnh bìa = minh họa 2D (có/không có nhân vật) |
| Ảnh từ vựng | `img.json` → `vocab-img.js` (không chữ trong ảnh) | Thẻ tra từ hiện ảnh nếu từ có trong img.json (không sinh ảnh mới ở M1) |
| Dịch khi bôi đen | #320 | Thẻ tra từ của truyện dùng lại API dịch của #320 khi gộp; M1 không đụng |
| Lộ trình ngày | `ux1.js` đã có loại bài `story` (KMIN 4 phút) | M3: loại `story` trỏ `#/story/<id>` chương kế tiếp |

## 2. Dữ liệu (`content/stories/<id>.json`, 1 file/truyện hoặc podcast)

```jsonc
{
  "id": "aesop-fox-grapes", "kind": "book" | "podcast", "level": "A1",          // A1…C1
  "title": "The Fox and the Grapes", "summary": "…(en, 1 câu)",
  "source": { "type": "public-domain" | "original", "work": "Aesop's Fables", "author": "Aesop",
              "published": -550, "authorDied": -564, "url": "https://www.gutenberg.org/ebooks/…",
              "note": "Viết lại hoàn toàn theo cấp độ A1 bởi Lexkite" },
  "license": "CC BY 4.0 Lexkite (bản phỏng theo); nguyên tác public domain",
  "cover": { "style": "2d", "cast": ["ama"] | [], "scene": "mô tả minh họa 2D, không chữ" },
  "audio": { "wpm": 120, "voice": "kokoro:af_heart", "file": null, "marks": null },
  "speakers": { "A": "ama", "B": "carlos" },                                   // chỉ podcast
  "chapters": [{
    "title": "…", "sentences": ["…", "…"] | [{ "who": "A", "text": "…" }],     // podcast = lượt thoại
    "words": ["fox", "grape"],                                                  // từ tô sáng; IPA/nghĩa lấy từ kho từ lúc chạy
    "quiz": [{ "q": "…", "options": ["…","…","…"], "answer": 1, "explain": "…" }]
  }]
}
```

- `words` chỉ là KHÓA từ trong kho (`content/lexicon`) → IPA, nghĩa 15 ngôn ngữ, audio đi theo kho đã QA; không gõ tay IPA/nghĩa trong truyện.
- Dữ liệu người học (máy + đồng bộ D1 qua `game`): `game.story = { known: {w: ts}, learn: {w: ts}, done: {"<id>#<ch>": "3/3"}, at: {"<id>": ch} }`, `game.storyMin = { "YYYY-MM-DD": giây }` (giữ 35 ngày).

## 3. Luật nội dung & bản quyền (lỗi CỨNG trong cổng)

1. `source.type = "public-domain"`: xuất bản ≤ **1930** (Mỹ: 95 năm) VÀ tác giả mất ≤ **1955** (đời + 70). Hai điều kiện cùng lúc → *Animal Farm* (1945) / *1984* bị chặn dù Orwell mất 1950. Có danh sách chặn tên tác phẩm còn bản quyền phổ biến (`BLOCK` trong lõi).
2. Bản dịch cũ CÓ thể còn bản quyền (ví dụ bản dịch Odyssey hiện đại) → mình viết lại từ cốt truyện, không chép câu của bản dịch nào; `source.url` trỏ bản PD (Gutenberg/Wikisource).
3. `"original"`: truyện/podcast tự viết; `author: "Lexkite"`.
4. Ảnh bìa: `cover.style = "2d"`, nhân vật chỉ trong bộ 2D đã duyệt (`ama`, `carlos`, `kit`); không chữ trong ảnh (như cổng TEXT_OBJ của ảnh từ vựng). Ảnh bìa sinh ở M3 qua luồng 0 credit (cùng luồng vocab-img free) và gửi anh duyệt trước khi bật.

## 4. Mốc kiểm chất lượng (cổng tự động, trong `npm test` + CI)

| Kiểm | Luật | Nơi |
|---|---|---|
| Schema | đủ trường, `answer` trong phạm vi, có `explain`, ≥ 2 câu hỏi/chương | `Stories.validate` |
| Bản quyền | §3 | `Stories.licenseOk` (CỨNG) |
| Từ đúng cấp | mọi từ trong câu cao hơn cấp truyện > 1 bậc (theo kho CEFR) phải nằm trong `words` của chương; `words` phải có trong kho và xuất hiện trong chương | gate `stories/cefr-fit`, `stories/lexicon` |
| Độ dài câu | trung bình từ/câu ≤ A1 9 · A2 12 · B1 16 · B2 20 · C1 24 | `Stories.validate` |
| Ngữ pháp/chính tả | `LK_WRITE.check` (soát lỗi offline) = 0 lỗi grammar/spelling mỗi câu | gate `stories/grammar` |
| Audio | `audio.wpm ≤ 150` (luật video ≤ 150 wpm); khi có file: wpm đo = số từ / thời lượng ≤ 150 | `Stories.validate` / `Stories.wpm` |
| Ảnh bìa | §3.4 | `Stories.validate` |
| Duyệt người | truyện mới: 1 lượt soát của mình (đọc to cả chương) + mẫu gửi anh trước khi mở hàng loạt | quy trình |

## 5. Hành vi trình đọc (M3, logic đã có ở M1)

- Mở chương: tô sáng `words` chưa ở `known` và chưa có trong sổ (`App.inDeck`) → `Stories.newWords`.
- Chạm từ → thẻ đáy màn: từ, 🔊, IPA (giọng theo cài đặt), nghĩa theo ngôn ngữ người học, câu ngữ cảnh; **Đã biết** → `Stories.mark(st,'known')` (bỏ tô); **Học** → `Stories.mark(st,'learn')` + `App.addWord` (câu truyện làm ngữ cảnh) → vào FSRS/`dueList` ngay.
- Nghe: nút ▶ / tốc độ 0.8–1.0×; câu đang đọc tô nền, tự cuộn; chạm câu = nghe lại câu đó. Podcast: lượt thoại có avatar Ama/Carlos, transcript chạm được như truyện.
- Cuối chương: quiz (`Stories.grade`) → lời giải; sai → `App.logMistake({kind:'story'})`; tổng kết buổi: phút hôm nay / 10, **+N từ mới** (`Stories.counter`), nút "Ôn N từ vừa học" (`#/practice/learn?src=deck`) và "Chương tiếp".
- Thời gian: `Stories.addTime` mỗi ≤ 15 s khi tab hiện + đang đọc/nghe; `Stories.goal(log, day, 10)`.

## 6. Kế hoạch mốc

- **M1 (PR này)**: spec; `web/js/stories/core.js` (thuần, không DOM); 4 nội dung mẫu (Aesop A1, Grimm A2, Sherlock Holmes B1, podcast gốc Ama + Carlos A2); cổng gate + `scripts/test/stories.mjs`; đăng ký nguồn `stories` trong `content/qa/sources.json`. Chưa có route/i18n (chưa có chữ giao diện).
- **M2 – màn Stitch (chờ anh duyệt ảnh)**: 5 màn 390 px sáng/tối theo hệ Stitch hiện tại (Kit brand, tương phản AA): (1) Thư viện (tab cấp A1–C1, bìa 2D, phút/chương, tiến độ), (2) Trình đọc (karaoke câu, từ mới tô sáng, thanh nghe), (3) Thẻ tra từ (🔊, IPA, nghĩa, Đã biết/Học), (4) Nghe podcast (Ama/Carlos, transcript), (5) Tổng kết buổi (phút/10, +N từ mới, quiz). Ảnh gửi anh → sửa → OK mới sang M3. Không đụng màn của gia sư (#319 M2) – thẻ trang chủ gia sư chỉ nhận link "đọc tiếp".
- **M3 – nối giao diện**: `web/js/stories/ui.js` route `#/stories`, `#/story/<id>/<ch>` (gói lười `stories`, +2 dòng BUNDLES/ROUTE_BUNDLE trong `app.js` – báo trước vì nhiều PR giữ app.js), CSS Stitch biên dịch `css/st-stories.css`; chuỗi giao diện vào `web/js/i18n/en/stories.js` (nhóm LAZY) → dịch 15 ngôn ngữ theo `docs/I18N-PIPELINE.md` (`i18n-missing --strict`, `i18n-qa --strict`); audio Kokoro dựng trên CI (`library-build.yml` hoặc workflow mới tự đỏ khi 0 file) kèm mốc thời gian câu (`marks`), đo wpm ≤ 150; bìa 2D 0 credit qua cổng TEXT_OBJ; mở rộng nội dung lên ≥ 5 truyện/cấp; e2e mobile 390 px (mở thư viện → đọc → chạm từ → Học → quiz → tổng kết; kiểm thẻ vào `dueList`), axe, size-budget (shell không tăng), CI xanh.
