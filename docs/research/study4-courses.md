# Study4 course & exercise structure: research notes

> TL;DR: Ghi chú nghiên cứu cấu trúc khóa học & bài tập của Study4 (15/10/2026, duyệt chỉ đọc). Chỉ học mẫu, không chép.
> Đọc khi: thiết kế khóa học/bài tập.

Date: 2026-10-15. Method: read-only browsing of study4.com in the user's signed-in Chrome (IELTS Intensive Speaking, Listening, Reading and Writing, TED Talks, the IELTS Fundamentals trial), the public landing pages of 9 courses, the test library, a past result page, and flashcards.
Scope: **structure and UX patterns only**. These notes contain no lesson text, questions, essays, audio or word lists. Names of chapters and categories appear only as taxonomy.

> Note on the session: in the Speaking "Luyện nói" tab, one click on the per-answer "Luyện tập" button started the microphone, because it records straight away and opens no panel first. I navigated away within about 2 seconds without pressing stop or save, so nothing should have been submitted. I submitted no answers and did not press "Nộp bài". I did not open any trial lessons on courses that aren't activated, because opening one may start the trial clock.

---

## 0. Cross-cutting architecture (applies to every course)

**Content model** (inferred from URLs and DOM):
- `Course` → `Unit` (chapter, `/learn/units/{id}/`) → `Lesson group` (an h2 heading inside the unit, for example "Task 1: Table" or "Phụ âm /b/") → `Activity` (`/learn/activities/{id}/`).
- Each activity is typed and has a bold prefix in the list: **Lý thuyết** (theory), **Video bài giảng** (video lecture), **Luyện tập** (practice), **Từ vựng** (vocabulary/flashcards).
- Most practice activities embed a reusable **Problem** in an iframe (`/problems/{id}/?view=embed`), a **Problem set** (`/problem-sets/{id}/`, a multi-item quiz) or a **Flashcard list** (`/flashcards/lists/{id}/`). The same problem engine is reused across courses. For example, the "sample + vocab/grammar/cohesion gap-fill" engine serves both Writing essays and Speaking samples.
- One lesson group can hold several activities. These show as **horizontal pill tabs** above the content (for example "Phụ âm /b/ | Âm bắt đầu | Âm ở giữa | Âm kết thúc").

**Course dashboard (`/courses/{id}/learn/`)**:
- Left sidebar lists the units. The footer has "Gia hạn tài khoản" (renew) and "Thay đổi chương trình luyện thi" (change exam programme).
- **"Lịch học của bạn" (study plan)**: a suggested plan per course (for example "Speaking band 7+: entry band 4, target 6–6.5"). Each plan has a **daily checklist** ("Hôm nay cần làm"), a **weekly view** ("Theo tuần", dated rows Mon–Sun) and "Chỉnh sửa/Thêm mới" (edit or add). The trial course offers a plan to adopt with "Sử dụng lịch học này". The plan states its daily time and rhythm (for example "20 new words + flashcard review, 30 min" and "1 grammar topic per 3 days"). There is a global page at `/studyplan/` with "Lịch học của tôi" and "Khám phá" (my plans / discover).
- **Tiến độ học tập**: course % progress, a weekly line ("Bạn chưa hoàn thành bài học nào tuần này"), a **"Tiếp tục bài học"** resume link to the exact activity, and a per-unit "Bạn đã hoàn thành: N%" with "Xem tất cả >>".
- **My courses (`/my-account/courses/`)**: courses are grouped by programme (IELTS Academic / Tiếng Anh cơ bản / Các khóa học thử). Each card shows its status (Đã kích hoạt / Học thử), a % and "Tiếp tục bài học: {unit} – {lesson}".

**Unit page**: the left sidebar lists units, and the main column shows "Tiến độ học tập N%", a search box, and lesson groups (h2) with their activity rows. Each row has an icon state; a filled check means completed. Units with many items are **paginated** (`?page=`). Units also have a **"Ghi chú" (notes) tab**.

**Activity page anatomy**:
- **Left sidebar**: the current lesson group's activities with completion icons (check / pencil / play), "Quay lại chương học", and "**Bài học tiếp theo:** {next group}". The sidebar can be collapsed.
- **Top bar**: a breadcrumb (Course > Unit > Lesson), "✓ Đã hoàn thành" status, "‹ Bài trước | Bài sau ›", and a toggle for the right panel.
- **Sticky footer CTA "HOÀN THÀNH & HỌC BÀI TIẾP THEO →"**. Completion is mostly **self-declared** with this button (some engines also mark completion automatically).
- **Floating right dock**: "Từ điển" (dictionary pop-up), Messenger and Zalo support links.
- **Global text-selection popup** inside content: **Note | Flashcard | Tra từ** (look up), plus **6 highlight styles** (blue, pink, green, yellow, red underline, strike-through) and Delete. Highlights can be saved or restored as named sets ("Lưu/khôi phục highlight", "Xoá tất cả highlights").
- Problem embeds have two top tabs: **"Bài tập thực hành" | "Bài làm của tôi"** (practice / my submissions).

**Standard exercise controls** (used by the gap-fill engines): **Kiểm tra** (check), **Đáp án** (reveal answers), **Xoá hết** (clear). Each blank also has a 💡 hint icon (reveals that one answer) and a 🚩 flag icon (report an error). Answers are stored in `data-answer` and checked client-side.

---

## 1. IELTS Intensive Writing (course 25)

### Outline (6 units, about 260 activities)
| Unit | Activities | Lesson groups (categories) |
|---|---|---|
| Hướng dẫn làm Task 1 | 21 video | 8: intro, scoring criteria (4), general steps (2), graph-with-trend, comparative graph, … |
| Hướng dẫn làm Task 2 | 21 video | 13: intro, arguments and development (5), full essay, TR errors, CC errors, … |
| TASK 1: Các dạng câu hỏi | 80 practice | Table 16, Line 11, Bar 14, Pie 6, Multiple 15, Process/Diagram 12, Map 6 |
| TASK 2: Các dạng câu hỏi | 34 practice | Opinion 10, Cause/Solution 5, Positive/Negative 3, Multi-part 5, Discussion 9, … |
| TASK 2: Chủ đề thường gặp | 102 practice | 26 topics (Animals, Art, Business, Crime, …) |
| PRACTICE ZONE | 1 | "Luyện đề tổng hợp" (question bank) |

Organisation pattern: the **same essays are reachable by question type and by topic** (two indexes over one content pool).

### Video lecture activity
A video player with a long text transcript or notes under it (about 18k characters), a "Highlight nội dung" toggle, and the selection popup (note, flashcard, look up).

### Essay practice activity ("Luyện tập: Essay N")
Layout: the prompt and chart image sit in the main card, and a **right-side vertical mode menu** switches the same essay between 6 modes:

1. **Xem sample essay**: a fully annotated model answer. Toggles: **Hiện nghĩa** (shows Vietnamese gloss chips after target phrases), **Hiện vai trò câu** (green role labels before sentences, such as "Opening statement" or "Overall statement"), **Highlight nội dung** (colour-coded spans: blue for vocabulary phrases, yellow for cohesive devices, green for grammar structures) and saved highlight sets. Grammar spans carry a structure note in a tooltip.
2. **Luyện tập từ vựng**: the essay with every target phrase replaced by a blank input. A **Vietnamese meaning chip** next to each blank is the cue (L1 → L2 recall). About 24 blanks per essay. Kiểm tra / Đáp án / Xoá hết, plus per-blank 💡 and 🚩.
3. **Luyện tập ngữ pháp**: the same engine, with the grammar-structure spans blanked (about 8).
4. **Luyện tập liên kết câu/ý**: the same engine, with the cohesive devices blanked (about 8).
5. **Luyện tập chép câu** (copy): one input per word (about 220), each showing the word as **ghost placeholder text**. The learner retypes the whole essay over the ghost text. Only Kiểm tra and Xoá hết are offered (no reveal needed).
6. **Luyện tập viết câu** (sentence building): each sentence is given as **lemmas separated by slashes** (base forms with no inflection, articles kept), and the learner writes the full sentence in one input. The model sentence is hidden and revealed per item (💡). Checking probably uses string similarity (`string-similarity.min.js` is loaded).

**"Bài làm của tôi"**: a list of saved essays (date + first line + View) and "Tạo bài làm mới". The editor is a plain textarea, with optional **audio recording or upload** on the same form (the problem model is shared with Speaking). No automatic scoring: a notice says the Grammarly integration was dropped and points to an external Quillbot extension. Saving is manual ("Lưu").

---

## 2. IELTS Intensive Speaking (course 27)

### Outline (9 units, about 1,150 activities)
| Unit | Activities | Notes |
|---|---|---|
| Nguyên âm và phụ âm | 190 (51 theory + 139 practice) | 51 groups; one per phoneme (for example "Phụ âm /b/"), each = 1 theory + 3 drills (initial / middle / final position) |
| Trọng âm (Stress) | 5 theory | |
| Nhịp điệu & Thought groups | 10 theory | |
| Ngữ điệu (Intonation) | 7 theory | |
| Linking & Connected speech | 5 theory | |
| Hướng dẫn làm bài Speaking | 34 video | overview 2, Part 1 8, Part 2 15, Part 3 9 |
| Part 1 topics | 298 practice | one group per topic, tagged by **quarter forecast** "[Q1/2026]" |
| Part 2+3 topics | 604 practice | 300 cue cards × (Part 2 sample + Part 3 sample) |
| PRACTICE ZONE | 1 | speaking question bank, with "Danh sách bài làm" (submission list) |

### Theory activity
Rich text with an embedded explainer video and **"soundcite" inline audio**: phrases in the text are clickable and play a short clip (about 20 per phoneme lesson).

### Phoneme drill ("Luyện tập: Âm bắt đầu/giữa/cuối")
- Left: a scrollable **word list** (word + Vietnamese meaning); the current item is highlighted.
- Centre: a large word with a 🔊 button, IPA, Vietnamese meaning, and a big red **mic button**.
- **Playback speed chips 0.75 / 1 / 1.25** and a **"Tự động chuyển câu"** (auto-advance) toggle.
- Recording uses WebAudioRecorder. Scoring happens after recording; I did not test it (no recording allowed).

### Part 1 / Part 2 / Part 3 sample activity
The same annotated-sample engine as Writing, with 4 modes: **Xem sample / Luyện tập từ vựng / Luyện tập ngữ pháp / Luyện nói**. The "Hiện vai trò câu" toggle is absent.
- **Luyện nói**: the topic's questions are listed, and each model answer is split into sentences with a **▶ per sentence**. Each answer has **"Nghe cả đoạn"** (play the whole answer) and **"Luyện tập"**, which starts recording immediately and becomes "Dừng lại" (stop). This is shadowing per answer.
- "Bài làm của tôi" lets the learner write and/or record their own answer to the same prompt.

---

## 3. IELTS Intensive Listening (course 15)

### Outline (7 units, about 1,530 activities)
| Unit | Activities | Notes |
|---|---|---|
| Hướng dẫn các dạng câu hỏi | 12 video | skills: paraphrase, predicting, numbers and letters, distractors, … |
| Luyện nghe chính tả từ vựng | 15 | by word class or feature: noun, verb, adj/adv, plural, numbers and letters, … |
| Luyện nghe chính tả theo chủ đề | 66 | 26 everyday topics, 1–3 recordings each (basic → advanced) |
| Luyện nghe chính tả đề IELTS | 604 | 151 tests × 4 sections |
| PRACTICE ZONE | 1 | question bank |
| Chữa đề IELTS chi tiết | 775 video | 105 tests, 6–8 videos each (one per question range, for example Q1-5, Q6-10) |
| Tổng hợp từ vựng theo chủ đề | 60 | 10 topics × 6 activities (vocabulary pack, see §7) |

### Dictation engine (shared by Listening, TED and Music)
Two tabs: **"Luyện nghe chép chính tả"** (dictation) and **"Luyện nghe có transcript"** (transcript).
- **Dictation tab**: an audio or video player (speeds 0.5×–4×), then **"Chọn chế độ"** with **Điền từ (trung bình)**, **Điền từ (khó)** or **Chép cả câu** (fill some words, fill more words, or type the whole sentence). The work goes **sentence by sentence**, with controls ‹ Câu trước | ⟳ Nghe lại | ✓ Kiểm tra | Câu sau ›, Xoá hết, Đáp án, and a **"Tự động phát lại câu"** (loop the current sentence) toggle. The current sentence appears in a card with its blanks.
- **Keyboard-first design** (shortcuts are printed under the card): space/tab moves to the next blank, Enter checks or goes to the next sentence, alt+tab/del/backspace goes to the previous blank, `\` replays the sentence, and shift+←/→ moves between sentences.
- **Transcript tab**: a timestamped sentence list. Each row has the English line plus an **italic Vietnamese translation** underneath. Toggles: Tự động chuyển câu, Hiện subtitles, **Hiện câu hỏi** (IELTS only: shows the test questions inline), Repeat, Highlight, plus saved highlight sets.
- **IELTS dictation extra**: transcript spans tagged as `synonym` with a `data-question` attribute link a transcript phrase to the question it paraphrases (a keyword ↔ paraphrase map).
- **Vocabulary dictation** ("Luyện nghe chính tả từ vựng"): a single-input dictation with an audio button for each word.

### "Chữa đề" (test walkthrough)
A **screen-recorded video per question range**: a teacher solves the test inside Study4's own exam UI. The left sidebar lists the ranges as separate activities.

---

## 4. IELTS Intensive Reading (course 22)

### Outline (5 units, about 3,040 activities)
| Unit | Activities | Notes |
|---|---|---|
| Phương pháp các dạng câu hỏi | 16 video | skimming, scanning, keywords, paraphrase, … |
| Từ vựng IELTS Academic Reading | 2,100 | **300 passages** × 7 activities (see below) |
| PRACTICE ZONE | 1 | question bank |
| Chữa đề IELTS chi tiết | 876 video | 105 tests, 8–9 videos each |
| Tổng hợp từ vựng theo chủ đề | 50 | 10 topics × 5 |

### Per-passage vocabulary lesson (7 activities)
1. **Đọc và học từ** (read and learn): two tabs.
   - *Học từ mới*: the full passage with target words highlighted and a Vietnamese gloss chip after each one. Toggles: Hiện nghĩa, **Dịch nghĩa** (paragraph translation), Highlight.
   - *Luyện tập*: the same passage with target words blanked. Blanks are **dropdowns or free-text inputs**, cued by the Vietnamese chip. Kiểm tra / Đáp án / Xoá hết.
2. **Flashcards**: the passage's word list (see §7).
3–6. **Trắc nghiệm từ vựng / Tìm cặp / Nghe từ vựng / Dịch nghĩa–Điền từ**: the vocabulary game pack (§7).
7. **Từ/cụm từ đồng/trái nghĩa** (paraphrase trainer), with two tabs.
   - *Xem bài đọc*: a **split view** with the passage on the left and the real test questions on the right. Paraphrase pairs are highlighted on both sides with matching **Q-number tags** (for example "Q1"): the question keyword on the right and its passage equivalent on the left. The correct option is marked.
   - *Luyện tập*: about 22 inputs. The learner types the passage phrase that paraphrases each highlighted question phrase. Correct answers turn green.

### Practice Zone (Reading/Listening question bank)
A "Cài đặt chế độ luyện tập" (practice settings) link, with tabs **Luyện tập | Thống kê | Danh sách bài làm** (practice / stats / attempts). The search panel has a keyword search, **set chips** (IELTS Collection, Simulation Tests, Sample, Actual tests, BC…), **question-type checkboxes** (11 Reading types: TFNG, YNNG, matching headings, …), and a section select. Results are a paginated radio list of passages, followed by an optional **time limit** and "LUYỆN TẬP" (start).

---

## 5. Luyện nghe nói cùng TED Talks (course 16)
- **Outline**: 2 units, Short videos 0–6 min (104) and Long videos 6+ min (98). Each talk is one activity with a **difficulty badge** (Trung bình / Nâng cao) in the sidebar.
- **Activity**: the title + speaker, then 3 tabs over a **video player**:
  - **Luyện nghe chép chính tả**: the dictation engine (3 modes) in a right-hand panel beside the video.
  - **Luyện nghe có transcript**: about 70 timestamped sentences, each with a Vietnamese translation.
  - **Luyện nói shadowing**: a right panel with a **Record** button, a **"Vừa chạy audio vừa record"** toggle (record while the original plays), and **"Tự động chuyển câu"**. Below is the sentence list (EN + VN). The learner shadows sentence by sentence.
- Completion is via the footer CTA.

## 6. IELTS Fundamentals (course 26, trial, trial period expired)
- **Outline**: [Vocabulary] Từ vựng theo chủ đề (20), [Grammar] Parts of speech (8), Tenses (9), Clauses (5), Grammar in Writing (8). Five lessons are marked "Học thử" (trial).
- **Trial dashboard pattern**: an "used up your trial" banner with a **dated promo** (discount for today only), "XEM HƯỚNG DẪN HỌC THỬ", a list of trial lessons, a 6-minute intro video, a "Đặt mua khoá học" CTA repeated twice, and a suggested study plan (1,800 words + 29 grammar topics in 3 months, 2–3 h per day).
- The vocabulary lessons use the same 6-activity vocabulary pack (§7).

---

## 7. Vocabulary system

### The 6-activity vocabulary pack (used in Listening, Reading, Fundamentals and TOEIC)
1. **Từ vựng: Flashcards**: a list view (below).
2. **Trắc nghiệm từ vựng**: the English headword + an **English definition as "Hint"** → choose the **Vietnamese meaning** from 4 options. A "Danh sách bài tập" number grid (1…N) sits under the card, with ‹ Câu trước / Câu sau › and a "Tự động chuyển câu" toggle. There is a timer.
3. **Tìm cặp** (match): a 4-column tile grid that mixes English headwords (red, bold) with VN meaning + EN definition tiles. The learner taps pairs (memory-match style).
4. **Nghe từ vựng**: an audio player over a 3-column grid of word + VN meaning. The learner hears a word and picks the tile.
5. **Dịch nghĩa / Điền từ**: shows the **Vietnamese meaning + English definition hint** → the learner types the English word (productive recall).
6. **Nghe chính tả**: hear the word → type it.

### Flashcard list page (`/flashcards/lists/{id}/`)
- Header, then **"Luyện tập flashcards"** (start review), **"Xem ngẫu nhiên"** (shuffle view) and "List có N từ".
- Each term card shows: **headword (POS) /IPA/ with 🔊 UK and 🔊 US**, **Định nghĩa** (VN meaning + "=" EN definition), **Ví dụ** (3 examples, each with 🔊, the target word in [brackets], and a VN translation), an optional image (TOEIC and "900 từ" lists), and **Ghi chú** (personal note).
- A toast reports "N từ bạn đã học xuất hiện trên trang này": known words are detected across pages.

### Review session (`/review/`)
- A top bar: "<< Xem tất cả • ⚙ Cài đặt • Các từ đã bỏ qua • ☐ Chỉ ôn từ mới" and a red "Dừng học list từ này" (stop studying this list).
- A notice caps learning at **20 new words per day**.
- Card front: the word, UK/US audio, (POS) and IPA, with a "Từ mới" badge. A flip ⟲ button shows the back.
- **Self-grading: 😊 Dễ | 😐 Trung bình | 😣 Khó | ⏩ Đã biết, loại khỏi danh sách ôn tập**. These are SRS ratings plus a "known, remove" option.

### Flashcards hub (`/flashcards/`)
Tabs: **List từ của tôi | Đang học | Khám phá** (my lists / studying / discover).
- "Tạo list từ" (create list). Lists can also be created **from highlights** made on test result pages, including older highlights.
- Discover lists are official lists with word counts and learner counts (for example office English, communication, "900 từ IELTS/TOEFL/SAT (có ảnh)", AWL, NAWL, BWL, TOEFL/TOEIC word lists).
- The header also links to Dictionary (Anh-Việt), Thesaurus and Chinese.

### Highlight → flashcard flow
Select text anywhere in content → popup **Flashcard** → pick a list (highlight modal). The user can also **turn saved highlights into flashcards** later from the result-detail page. Study4 also promotes a **Chrome extension: "Tra từ điển, tạo flashcards mọi lúc mọi nơi"** (look up words and make flashcards anywhere). This competes directly with the Lexkite add-on.

---

## 8. Test library & exam UI (`/tests/`)
- **Header widget**: the user's exam (IELTS Academic), **exam date, "Tới kỳ thi: N ngày" countdown, and target score**, plus a "Thống kê kết quả" link.
- **Category chips**: Tất cả, IELTS Academic, IELTS General, TOEIC, TOEIC SW, HSK 1–6, TOPIK I/II, JLPT N5–N1, Vietnamese high-school exam subjects (English, Maths, Physics, Chemistry, Biology), Digital SAT, ACT. There is a search box and sub-filters (Tất cả / **Đề rút gọn** = short tests).
- **Test card**: title, ⏱ duration, 👤 attempt count, 💬 comment count, "N phần thi | N câu hỏi", tags (#IELTS Academic #Listening), and a CTA of "Chi tiết" or "Xem kết quả" if already attempted.
- **Test detail page**:
  - Tabs "Thông tin đề thi | Đáp án/transcript". There are answer and transcript links per part, which show solutions without attempting.
  - Meta: duration, parts, questions, comments, attempts. A note says scaled scores (9.0 / 990) need FULL TEST mode.
  - **"Kết quả làm bài của bạn"** table: date, mode (Luyện tập / Full test), part, score, time, "Xem chi tiết".
  - Two tabs, **Luyện tập** and **Làm full test**:
    - *Practice*: checkboxes per part, each part showing its **question-type tags** (for example "Recording 1 (10 câu): Note/Form Completion, Table Completion"); an optional time limit from 5 to 55 min (blank = untimed); an **interface choice "Mặc định" or "IELTS Test v1"** (a skin that mimics the computer-delivered test); and a "Pro tips" box recommending part practice.
  - **Comments/discussion** thread under the test.
- **Exam screen** (seen in the walkthrough videos; I did not start a test):
  - A **"Highlight nội dung"** toggle and part tabs (Recording 1–4 / Passage 1–3).
  - An audio bar for Listening.
  - **Split view**: the question text or passage on the left, answer inputs numbered in circles on the right.
  - Right rail: **"Thời gian còn lại" timer**, **NỘP BÀI**, "Khôi phục/lưu bài làm" (save or restore progress), a tip ("click a question number to flag it for review"), and a **question navigator grid** grouped by part.
- **Result page**:
  - Score (0/10), **accuracy %**, time, three tiles (✓ correct / ✗ wrong / – skipped), and "Xem đáp án" / "Tới trang đề thi".
  - **"Phân tích chi tiết"** table per part and overall: rows per **question type** with correct, wrong, skipped, accuracy %, and **clickable question numbers**.
  - Actions: **"Xem chi tiết đáp án"** and **"Làm lại các câu sai"** (retake only the wrong ones).
  - A banner says flashcards can be created from highlights.
- **Answer review page**:
  - Highlight toggle and "**Hiện giải thích/transcript**".
  - The audio player with a "Hiện Transcript" collapsible.
  - Each answer box is coloured (red = wrong), with "Đáp án đúng: …".
  - "**Giải thích chi tiết đáp án**" expands to three parts: **Trích đoạn chứa đáp án** (excerpt), **Keywords** (question phrase = transcript phrase) and **Giải thích** (Vietnamese reasoning).
  - A right-hand question grid; "Chia sẻ" (share).
- **Analytics (`/tests/analytics/`)**:
  - Date-range filter (3 days … 1 year), tests taken, total practice minutes, exam date, countdown, target.
  - Skill tabs (Listening / Reading / Writing / Speaking). Each has tests taken, accuracy, average time, average and best band, per-question-type accuracy tables, and an attempt history.

---

## 9. Public course landing pages (template + per-course)
**Template**:
- Title + rating + review count + learner count, then **✅ 4–6 promise bullets** (target learner + numbers).
- Price with a combo bundle ("Combo … giảm 49–58%", "Tặng TED Talks" as a free gift).
- **"Bạn sẽ đạt được gì sau khoá học?"**: 3–5 numbered outcomes.
- **"Thông tin khoá học"**: named authors with credentials (university, 990 TOEIC, 8.5 IELTS).
- **"Bạn sẽ học như thế nào?"**: method blocks.
- **"Chương trình học"**: units with "N bài" counts and "Học thử" badges on 5–30 sample lessons.
- Reviews.

| Course | Target / promise (paraphrased) | Syllabus (units → lessons) |
|---|---|---|
| Complete TOEIC (28) | TOEIC 450/650/800+; 1,200 words + 17 grammar topics; 20k+ explained MCQs; dictation | Vocab 23, Grammar 18, Part 1 (5), Part 2 (13, one per question type: WHO/WHAT/…/tag/statements), Part 3 (11), Part 4 (15), Part 5 (25), Part 6 (7), Part 7 (16), TOEIC dictation (95). Each Part unit ends with a PRACTICE ZONE |
| IELTS Intensive Listening (15) | band 4 → 7+; fix missed info / linking; daily stats per part and question type | Trial (2), Question types (12), Word dictation (15), Topic dictation (26), Test dictation (83), Practice zone, Walkthroughs (49), Topic vocab (10) |
| IELTS Intensive Reading (22) | band 4 → 7+; "4,000 words"; methods; daily stats | Trial (2), Methods (16), Passage vocab (150), Practice zone, Walkthroughs (49), Topic vocab (10) |
| IELTS Fundamentals (26) | A1–A2 → band 4; 29 grammar topics; 1,800 words / 20 topics; ~200 exercises | Vocab topics (20), Parts of speech (8), Tenses (9), Clauses (5), Grammar in writing (8) |
| TED Talks (16) | listening and reading; topic vocabulary; exam boost | Short (104), Long (98); 22 trial lessons |
| 3,600 từ vựng (12) | 100 topics; daily-life use | 23 units (basic words, verbs, adjectives, phrasal verbs, people, food, travel, … proverbs, word relationships); flashcards with images + "20,000 game questions" |
| Ngữ pháp A–Z (13) | all core grammar; "248 exercises" | 20 units (present/past/future, to be/have/do, articles, prepositions, modals, verb patterns, conditionals, questions, …) |
| Phát âm & giao tiếp (14) | natural expressions; **scripted-dialogue practice tool**; stress, intonation, linking | Unit 1 sounds (50), Unit 2 common expressions (50), Unit 3 dialogue practice (14), Unit 4 **75 topic dialogues** (75); shadowing with recording and correction |
| Music (21) | listening via songs; motivation | Beginner (231), Intermediate (502), Advanced (46); dictation method "listen → type → check and fix, highlight your errors"; 32 trial songs |

---

## 10. Progress & gamification summary
- Course % (dashboard and my-courses card), unit %, a **weekly completion line**, and a "Tiếp tục bài học" deep link.
- The **study plan** gives a daily checklist and a weekly calendar. Plans are suggested per target band and can be adopted with one click.
- Exam countdown + target score sit in the header of tests and analytics.
- Learner counts and ratings act as social proof. Every test has a comment thread.
- No streaks, XP, badges or leaderboards were observed. Motivation is plan + progress + exam countdown.
- Completion is mostly manual ("HOÀN THÀNH & HỌC BÀI TIẾP THEO").

---

## Ideas for Lexkite (original features, prioritized)

Legend: **[Have]** = Lexkite already has something similar; **[Gap]** = missing.

### P0: highest leverage, builds on what we already have
1. **One essay, many drills (mode rail)** [Have, partly]. Our annotated IELTS model essays already carry phrase, linker and role layers and gap/grammar/error/rewrite exercises. Add a persistent **right-side mode rail** over the same text (Read → Vocab recall → Grammar recall → Linkers → Copy-type → Rebuild sentence), so one essay yields 6+ sessions. Original twists:
   - The "rebuild" mode uses **our own lemma scaffolds generated from our essays**.
   - Recall cues are in **the user's UI language** (all 15 languages), not only Vietnamese.
2. **L1-cued recall gap-fill** [Gap]. Blanks cued by a meaning chip in the learner's language, with Check / Reveal-all / Clear, a per-blank hint, and a per-blank "report issue" flag. Reuse it across essays, reading passages and speaking samples, like Study4's shared engine.
3. **Keyboard-first sentence dictation with three difficulty modes** [Have dictation; upgrade it]. Easy, Hard and Full-sentence modes; sentence-by-sentence stepping; replay-sentence and loop toggles; **printed shortcut legend** (Space next blank, Enter check/next, `\` replay, Shift+arrows between sentences); speed 0.5–2×. Pair it with a **transcript tab** showing each sentence's translation in the user's language.
4. **Course layer = Unit → Lesson group → typed Activity** [Gap]. Activities carry a type prefix (Theory / Video / Practice / Vocabulary). Lesson groups hold their activities as tabs, with a sidebar with completion ticks, "Next lesson", prev/next, and a sticky "Complete & continue" CTA. Also "Continue where you left off" on the home and course cards, and unit %. **Auto-complete** an activity when its check passes (better than Study4's manual completion).
5. **Per-question-type analytics + "retake only wrong answers"** [Have mock tests; add these]. Result page: correct/wrong/skipped tiles, an accuracy table by question type with clickable question numbers, and a **Retake wrong** button. Analytics page with a date-range filter, per-skill tabs, average and best band. Feed weak question types into recommendations.
6. **Structured answer explanations** [Have explanations?; standardise them]. Each item gets three fixed fields: Excerpt / Keyword ↔ paraphrase / Why (in the user's language). Highlight the excerpt in the transcript or passage on click.

### P1: strong differentiators
7. **Paraphrase trainer (split view)** [Gap]. The passage or transcript on one side and the questions on the other. Matching Q-tagged highlights link question keywords to their paraphrases. A practice tab asks the learner to find or type the paraphrase. Build it on our own reading and listening tests.
8. **Vocabulary game pack per word list** [Have FSRS flashcards; add games]. Six auto-generated activities from any list: MCQ meaning (with EN definition as hint), memory-match tiles, listen-and-pick grid, meaning → type the word, listen → spell, and in-context gap-fill. FSRS stays the scheduler; the games are "practice" views that also feed FSRS signals.
9. **Highlights → flashcards** [Have add-on look-up + save]. Six highlight styles in every reading/listening/result view, saved highlight sets, and **"make flashcards from my highlights"** after a test. This is our moat: the browser add-on already captures words from the whole web, so we should unify web captures + in-app highlights into one deck.
10. **Study plan with daily checklist + weekly view + exam countdown** [Gap]. Templates by target band (for example "IELTS 6.5 in 8 weeks, 45 min/day"), adopted in one click, auto-checked from activity completion, with exam date and target score in the header. A daily new-word cap (configurable, default 20) linked to FSRS load.
11. **Shadowing mode** [Have speaking + AI scoring + pronunciation library]. Sentence list with translation, record while the original plays (toggle), auto-advance, then **our AI pronunciation score per sentence**. Study4 shows no visible per-sentence score in this flow, so this is a gap we can win. Apply it to model speaking answers ("listen to the whole answer / practise sentence by sentence").
12. **Phoneme drill screen** [Have pronunciation library]. Word list + big word card (IPA, meaning, audio) + mic + speed chips (0.75/1/1.25) + auto-next, with each phoneme in initial, middle and final position. Add our AI scoring with phoneme-level colouring.
13. **Two indexes over one content pool** [Gap]. Browse the same essays and samples **by question type and by topic**, and tag speaking topics by forecast season.

### P2: nice to have
14. **Exam-skin toggle** for mock tests ("Lexkite default" vs "computer-delivered style"), a question navigator with a review flag, save/restore progress, and an optional time limit for part practice.
15. **Per-test discussion + attempt counts** for social proof (needs moderation; consider later).
16. **Inline audio snippets in theory text** (click a phrase to hear it), plus long-form lecture notes with highlight and notes under videos.
17. **Video walkthrough per question range** (cheaper option: an animated step-through of our structured explanation instead of a screen recording).
18. **Known-word detection** ("N words you've learned appear on this page"), shown in the add-on and in-app readers using the FSRS state.
19. **Media-based courses** (TED-style talks / songs) with dictation + transcript + shadowing tabs. Licensing is a blocker, so prefer our own or CC-licensed audio.
20. **Landing-page template** for future paid tiers: promise bullets, numbered outcomes, author credentials, "how you'll learn" blocks, syllabus with lesson counts and free-sample badges.

### Not worth copying
- Manual "mark complete" as the main signal. Prefer auto-completion from passed checks.
- Vietnamese-only glosses. Lexkite must localise cues for all 15 UI languages (see docs/I18N-PIPELINE.md).
- Recording that starts instantly on a "Practice" click with no confirmation. Show an explicit mic state or a press-to-record button.
