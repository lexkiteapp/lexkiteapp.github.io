# Hướng dẫn viết bài blog Lexkite (cho người & AI viết)

Đọc trước: docs/SEO-PLAN.md §4 (quy trình), §5 (định dạng), §7 (sự thật đã xác minh); content/blog/briefs.json (brief); content/blog/shots.json (ảnh app thật + mô tả màn hình).

## Bắt buộc
- File `content/blog/vi/<slug>.md`, front matter đúng §5. `publishAt:` để TRỐNG (bộ xếp lịch điền). `status: ready`, `factChecked: 2026-10-15`, `author: Lexkite`, `lang: vi`, `translationKey` = slug, `cover` = ảnh đầu tiên của brief, `coverAlt` mô tả đúng màn hình.
- Tiêu đề 30–65 ký tự, chứa từ khóa chính (có thể viết hoa chữ đầu/tên riêng); mô tả 110–160 ký tự, có từ khóa, hấp dẫn để bấm.
- Thân bài ≥ 1.200 từ (đếm theo khoảng trắng; nhắm 1.400–1.800), không có H1, ≥ 4 H2, không nhảy cấp tiêu đề; từ khóa chính xuất hiện trong 120 từ đầu và trong ≥ 1 H2.
- **Ảnh RIÊNG của bài (bắt buộc với bài mới khi `images.enforce` bật – docs/BLOG-RUNBOOK.md § Ảnh riêng từng bài):**
  - Ảnh bìa riêng tự sinh từ tiêu đề – không cần làm gì (tùy chọn `coverArt: {mood: think, icon: blocks}`; mood: happy|win|cheer|think|sad|sleep, icon: book|target|bulb|blocks|mic|chat|ear|pen). Vẫn giữ `cover`/`coverAlt` (ảnh dự phòng khi chưa render).
  - `shots:` = các màn hình app ĐÚNG nội dung bài bàn tới (từ đang giảng → `#/dict/<từ>`, bài ngữ pháp → `#/grammar/<id bài học>`, động từ bất quy tắc → `#/verb/<động từ>`, đề/luyện tập cụ thể…). CI chụp giao diện đúng ngôn ngữ bài (`hl=<lang>`, bản sandbox). Route phải có thật trong app (blog-check kiểm). Gợi ý nhanh: `node scripts/blog-images.mjs suggest content/blog/<lang>/<slug>.md` – mở thử route trước khi dùng.
  - Trong bài: `![](media:@s1 "chú thích theo ngữ cảnh bài")` – **để trống alt** (alt tự sinh từ chữ thật trên ảnh chụp). Nếu tự viết alt: không được có số, cụm trong ngoặc kép, từ tiếng Anh (ở bài ar/hi/th/zh/ja/ko/ru) mà ảnh không có – `[alt-truth]` chặn.
  - `diagrams:` cho timeline thì / cấu trúc câu / bảng so sánh → `{{diagram: d1 | chú thích}}` (SVG/HTML nhúng, chữ chọn được, tốt cho SEO). Mỗi shot/diagram khai báo phải được dùng; ≥ 2 hình riêng/bài, ≥ 1 ảnh chụp.
  - Cú pháp (YAML rút gọn, được xuống dòng trong `[ … ]`); mẫu thật: `content/blog/en/present-perfect-vs-past-simple.md`:
    ```
    coverArt: {mood: think, icon: blocks}
    shots: [
      {id: s1, route: '#/grammar/present-perfect', crop: main},
      {id: s2, route: '#/grammar/past-simple', crop: main},
      {id: s3, route: '#/verb/write', crop: main}
    ]
    diagrams: [
      {id: d1, type: timeline, title: 'Closed and open time frames', span: [-4, 1], now: 'now', events: [{from: -4, to: -2.5, label: 'last summer → past simple'}, {at: -1.6, label: 'in 2019 → past simple'}, {from: -1, to: 0, label: 'this year so far → present perfect'}]},
      {id: d2, type: boxes, title: 'Present perfect form', parts: [{t: 'I', r: 'subject'}, {t: 'have', r: 'have / has'}, {t: 'written', r: 'past participle (V3)'}]},
      {id: d3, type: compare, title: 'say vs tell', cols: ['say', 'tell'], rows: [['say something', 'tell someone something']]}
    ]
    ```
    Thân bài: `{{diagram: d1 | Cửa sổ đóng kết thúc trước hiện tại…}}`, `![](media:@s1 "Bài học present perfect trong app – công thức have/has + V3")`. Khóa shot: `id, route, lang (auto), device (desktop|mobile), crop (viewport|main|full|{selector: '.card'}|{x,y,w,h}), wait (ms), scroll (CSS selector)`. Không có khóa `alt` trong shots.
  - Ảnh chụp chung cũ (`media:<id>` trong shots.json) vẫn dùng được làm hình phụ – khi đó áp dụng luật dưới.
- 2–3 ảnh `![alt cụ thể ≥ 10 ký tự](media:<id> "chú thích")` lấy id trong shots.json; alt/chú thích phải đúng với mô tả `desc` của ảnh, không bịa chi tiết không có trên màn hình.
  - ⚠️ **Lỗi đã gặp (B1, 16/10 – 8/11 ảnh sai)**: gán chú thích theo chủ đề bài thay vì theo ảnh. Vd. ảnh `practice-test` (câu hỏi nghĩa "run out of") ghi thành "đề thi TOEIC có đồng hồ"/"bài tập thì động từ"; `review` (phiên ôn flashcard "pollution") ghi thành "biểu đồ đường cong quên"; `grammar` (khóa ngữ pháp IELTS, 12 thì) ghi thành "mẹo nhận diện từ loại TOEIC".
  - **Tự kiểm trước khi commit**: với mỗi `media:<id>`, mở `desc` trong shots.json, đặt cạnh alt – mọi danh từ trong alt (tên màn hình, từ ví dụ, con số) phải có trong `desc`. Được diễn đạt lại sang ngôn ngữ bài, được nói ảnh giúp gì cho chủ đề ở *chú thích*, nhưng không mô tả nội dung không có trên màn hình.
  - Không có ảnh hợp chủ đề → thêm shot mới vào shots.json rồi chụp (`blog-shots.mjs`), hoặc dùng ít ảnh hơn (tối thiểu 2) – không "ép" ảnh không liên quan.
- ≥ 2 liên kết vào app dạng `[chữ](/app/#/route)` (route trong brief/shots), ≥ 1 liên kết tới bài khác `/vi/blog/<slug>/` (slug có trong briefs.json, chọn bài liên quan thật), có thể thêm trang tĩnh `/samples/`, `/speaking/`, `/tu-vung/`, `/ngu-phap/`, `/viet-thu/`.
- Đúng 1 hộp `{{cta: /app/#/route | Lời mời hành động}}` và đúng 1 slot video tùy chọn `{{youtube: | Gợi ý video: …}}` (để trống ID – KHÔNG bịa ID).
- **Mini-quiz cuối bài (`quiz:` trong front-matter):** 3 câu trắc nghiệm nhanh, chấm tại chỗ, có giải thích và nút mở app.
  - Cú pháp chuẩn trong front matter (`[...]` hoặc `{ items: [...], cta: {...} }`):
    ```yaml
    quiz: [
      {
        q: "Which tense is used for an action completed at an unspecified time in the past?",
        options: ["Past simple", "Present perfect", "Past continuous", "Past perfect"],
        answer: 1,
        explain: "Present perfect connects a past action with the present without specifying the exact time."
      },
      {
        q: "She has lived in London _____ five years.",
        options: ["since", "for", "during", "from"],
        answer: 1,
        explain: "'For' is used with a period of time (duration), while 'since' marks a starting point."
      },
      {
        q: "Which sentence is grammatically correct?",
        options: ["I saw him yesterday.", "I have seen him yesterday.", "I had seen him yesterday.", "I am seeing him yesterday."],
        answer: 0,
        explain: "Past simple ('saw') is required because the specific past time 'yesterday' is stated."
      }
    ]
    ```
  - Lưu ý: `answer` là chỉ số 0-indexed (0 = A, 1 = B, 2 = C, 3 = D). Câu hỏi & giải thích tự biên soạn 100%, chuẩn xác, bám sát nội dung bài.
  - Viết câu hỏi/giải thích bằng **ngôn ngữ của bài** (câu ví dụ tiếng Anh giữ nguyên); mỗi câu **chỉ 1 đáp án đúng không cãi được** (tránh cặp mơ hồ kiểu many ↔ all); số liệu/mốc thời gian phải khớp thân bài; **không nói về tính năng app** ngoài những gì bài đã viết (luật caption-truth). `cta.url` chỉ là đường dẫn trong site (`/app/#/route`). Quiz.js nạp lười, khi không có JS hiện khối "Xem đáp án"; sự kiện gửi `/api/hit` `{t:'q', ev}` chỉ đếm quiz_view/quiz_done/quiz_cta, không gửi bài/định danh.
- Phần `## Câu hỏi thường gặp` với 3–4 câu `### …?`, mỗi câu 1 đoạn trả lời (câu hỏi người học thật sự tìm).
- Chính tả kiểu bỏ dấu mới: hóa, khỏe, thủy, quý, tòa, họa (KHÔNG hoá, khoẻ, thuỷ, quí, toà, hoạ). Không lỗi gõ, không trộn tiếng Anh khi đã có từ Việt tự nhiên; thuật ngữ thi giữ tiếng Anh (Task 2, band, collocation…).

## Chất lượng
- Văn phong: người thầy giỏi nói chuyện với người học Việt – rõ, ấm, cụ thể; câu ngắn; ví dụ thật; bảng khi so sánh; danh sách khi có bước.
- 100% tự viết. Ví dụ tiếng Anh tự đặt, đúng ngữ pháp, tự nhiên. Không chép/nhại câu của sách, đề thi thật, website khác.
- Chính xác: chỉ dùng sự thật trong §7 hoặc kiến thức phổ thông chắc chắn; không bịa nghiên cứu, số liệu, trích dẫn, tên người; không hứa điểm số; không nói Lexkite “chính thức” hay liên kết với IELTS/ETS. Tính năng Lexkite chỉ mô tả những gì có trong shots.json/README.
- Mỗi bài có phần “Làm ngay trong Lexkite” (H2) hướng dẫn từng bước bằng tính năng thật, nhưng không biến bài thành quảng cáo: ≥ 70% nội dung là kiến thức hữu ích độc lập.
- Không lặp đoạn/câu giữa các bài (có máy kiểm trùng 8 từ liên tiếp). Mở bài khác nhau, tránh khuôn “Trong bài viết này…”.

## Bài kiến thức nền (evergreen, brief có `"type": "evergreen"`)
Mục tiêu: bài hay nhất tiếng Việt cho chủ đề đó – như một chuyên gia ngôn ngữ học/giáo viên IELTS hàng đầu chia sẻ, không phải bài giới thiệu app.
- Độ dài 1.800–2.500 từ. Mở bài trả lời thẳng câu hỏi trong 2–3 câu, rồi mới đi sâu.
- **Phân tích, không liệt kê**: giải thích *vì sao* (logic của tiếng Anh, so sánh với tiếng Việt – nguồn gốc lỗi của người Việt), có cặp câu đúng/sai đối chiếu, bảng tóm tắt, sơ đồ quyết định bằng danh sách.
- Ví dụ tự đặt, tự nhiên, nhiều ngữ cảnh (đời sống, công việc, học thuật). Đánh dấu mức độ (A2/B1/B2/C1) khi hữu ích.
- Có mục **“Tự kiểm tra”** (5–8 câu bài tập nhỏ) và **đáp án có giải thích** ngay sau.
- App chỉ xuất hiện nhẹ ở mục “Luyện thêm” cuối bài (≥ 2 liên kết `/app/#/…` trong câu chữ + 1 hộp CTA). Không quảng cáo lộ liễu.
- ≥ 4 liên kết tới bài blog khác (bài trong briefs.json) và liên kết bài ngữ pháp/từ vựng tĩnh liên quan (`/ngu-phap/`, `/tu-vung/`…) khi có.
- Không trích lời bài hát, phụ đề phim, đoạn sách/báo có bản quyền; không bịa tên nghiên cứu, số liệu, tên podcast/kênh cụ thể; thông tin ngôn ngữ phải chuẩn (đối chiếu kiến thức từ điển Oxford/Cambridge, ngữ pháp chuẩn).
