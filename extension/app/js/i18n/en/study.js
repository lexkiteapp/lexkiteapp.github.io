/* English UI strings – study.js, plan.js, path.js, method.js, goal.js */
(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D.en = Object.assign(D.en || {}, {
  /* ---------- study.js: sources & review ---------- */
  'Sổ từ của tôi ({n})': 'My word list ({n})',
  'Sổ từ của tôi': 'My word list',
  'Thẻ đến hạn hôm nay': 'Cards due today',
  'Từ sắp quên (độ nhớ < 85%)': 'Words you’re forgetting (recall < 85%)',
  'Cụm từ & cấu trúc của tôi': 'My phrases & structures',
  'Từ hay quên': 'Frequently forgotten words',
  'Cấp độ nhớ {n}': 'Memory level {n}',
  'Chưa có flashcard nào': 'No flashcards yet',
  'Thêm từ từ thư viện hoặc tra từ điển để bắt đầu.': 'Add words from the library or look them up in the dictionary to get started.',
  'Mở thư viện': 'Open library',
  'Tra từ': 'Look up a word',
  'Hôm nay bạn đã ôn hết!': 'You’re all caught up for today!',
  'Hoàn thành {n} lượt ôn!': '{n} reviews done!',
  'Nhớ ngay': 'Recalled',
  'Chuỗi ngày': 'Day streak',
  'Thẻ tiếp theo đến hạn: <b>{date}</b>.': 'Next card due: <b>{date}</b>.',
  'Học đều mỗi ngày là bí quyết nhớ lâu.': 'Studying a little every day is the secret to long-term memory.',
  'Học thông minh': 'Smart Learn',
  'Ghép thẻ': 'Match',
  'Thêm từ mới': 'Add new words',
  'Nhớ lại từ tiếng Anh, rồi chạm để lật': 'Recall the English word, then tap to flip',
  'Đoán nghĩa, rồi chạm để lật': 'Guess the meaning, then tap to flip',
  'Thoát': 'Exit',
  'Thẻ đang ở bước học (1–10 phút) sẽ quay lại trong phiên': 'Cards in the learning step (1–10 min) come back in this session',
  '<b>{n}</b> thẻ còn lại': '<b>{n}</b> cards left',
  'TỪ MỚI': 'NEW',
  'Đổi chiều thẻ': 'Flip card direction',
  'Ngữ cảnh của bạn': 'Your contexts',
  'Nghe cả câu': 'Play the whole sentence',
  'Câu của tôi': 'My sentence',
  'Câu song ngữ': 'Bilingual sentences',
  'Khả năng còn nhớ trước lần ôn này: <b>{pct}%</b> · đã quên {n} lần': 'Recall chance before this review: <b>{pct}%</b> · forgotten {n} times',
  'Tự đặt câu với “{word}”': 'Write your own sentence with “{word}”',
  '(+5 XP · giúp nhớ sâu hơn)': '(+5 XP · helps it stick)',
  'Viết một câu về bản thân bạn có dùng từ này…': 'Write a sentence about yourself using this word…',
  'Lưu câu của tôi': 'Save my sentence',
  'Lật thẻ': 'Flip card',
  'Phím tắt: <span class="kbd">Space</span> lật · <span class="kbd">1</span>–<span class="kbd">4</span> chấm điểm · <span class="kbd">P</span> phát âm': 'Shortcuts: <span class="kbd">Space</span> flip · <span class="kbd">1</span>–<span class="kbd">4</span> grade · <span class="kbd">P</span> pronounce',
  'Quên': 'Again',
  'Khó': 'Hard',
  'Nhớ': 'Good',
  'Dễ': 'Easy',
  'Câu cần có từ “{word}” nhé': 'Your sentence needs to include “{word}”',
  'Đã lưu': 'Saved',

  /* ---------- study.js: practice hub & questions ---------- */
  'Trắc nghiệm': 'Multiple choice',
  'Điền từ vào câu': 'Fill in the blank',
  'Nghe & chép': 'Listen & type',
  'Bài kiểm tra': 'Test',
  'Luyện phát âm': 'Pronunciation',
  'Trò chơi & bài tập': 'Games & practice',
  'Chọn nguồn từ, rồi chọn cách luyện. Mỗi bài đều cộng XP và tính vào nhiệm vụ ngày.': 'Pick a word source, then a practice mode. Every session earns XP and counts toward your daily quests.',
  'Nguồn từ': 'Word source',
  'Từ tiếng Anh nghĩa là “{vi}”?': 'Which English word means “{vi}”?',
  'Điền từ: {sentence}': 'Fill in: {sentence}',
  'Nghĩa của “{word}”?': 'What does “{word}” mean?',
  'Chính xác!': 'Correct!',
  'Tuyệt vời!': 'Awesome!',
  'Giỏi lắm!': 'Well done!',
  'Chưa đúng · Đáp án: {answer}': 'Not quite · Answer: {answer}',
  'Nghe': 'Listen',
  'Nghe câu': 'Play sentence',
  'Dịch câu': 'Translate sentence',
  'Tiếp tục': 'Continue',
  'Chọn nghĩa đúng': 'Choose the correct meaning',
  'Chọn từ tiếng Anh đúng': 'Choose the correct English word',
  'Điền từ': 'Spell the word',
  'Chậm': 'Slow',
  'Gõ lại từ bạn nghe được': 'Type the word you hear',
  'gợi ý: {hint}': 'hint: {hint}',
  'Gợi ý: <b>{hint}</b>': 'Hint: <b>{hint}</b>',
  'bắt đầu bằng “{letter}”, {n} ký tự': 'starts with “{letter}”, {n} letters',
  'Gõ từ tiếng Anh': 'Type the English word',
  'Gõ đáp án…': 'Type your answer…',
  'Kiểm tra': 'Check',
  'Không biết – xem đáp án': 'I don’t know – show answer',
  'Gần đúng rồi! Kiểm tra lại chính tả': 'Almost! Check your spelling',
  '{score}/{total} câu đúng': '{score}/{total} correct',
  'Mức từ vựng ước tính: <b>Band {band}</b>': 'Estimated vocabulary level: <b>Band {band}</b>',
  '(tham khảo)': '(for reference)',
  'Cần ôn lại:': 'Review these:',
  'Đưa các từ sai vào flashcard': 'Add missed words to flashcards',
  'Không sai câu nào – xuất sắc!': 'No mistakes – excellent!',
  '<b>Hoàn thành bài!</b> Các từ đã được thêm vào flashcard để ôn đúng thời điểm vàng.': '<b>Unit complete!</b> These words were added to your flashcards so you can review them at the optimal time.',
  'Cần đạt <b>80%</b> để hoàn thành bài – ôn lại các từ sai rồi thử lại nhé.': 'You need <b>80%</b> to complete the unit – review the words you missed and try again.',
  'Về lộ trình': 'Back to path',
  'Làm lại': 'Try again',
  'Làm lượt mới': 'New round',
  'Đổi chế độ': 'Change mode',
  'Đã thêm vào flashcard': 'Added to flashcards',
  'Chưa có từ để luyện': 'No words to practice yet',
  'Nguồn “{name}” đang trống.': 'The source “{name}” is empty.',
  'Chọn nguồn khác': 'Choose another source',

  /* ---------- study.js: Smart Learn ---------- */
  '{done}/{total} từ': '{done}/{total} words',
  'Nghe chậm': 'Play slowly',
  'Từ mới': 'New words',
  'Chạm để lật': 'Tap to flip',
  'Mình đã biết từ này': 'I already know this word',
  'Đã đánh dấu “{word}” là từ đã biết – sẽ ôn lại sau ~1 tháng': 'Marked “{word}” as known – you’ll review it again in about a month',
  'Bạn đã học xong {n} từ!': 'You’ve learned {n} words!',
  '{answered} câu trả lời · {mistakes} lần sai · +20 XP thưởng': '{answered} answers · {mistakes} mistakes · +20 bonus XP',
  '+{xp} XP thưởng': '+{xp} bonus XP',
  'Đưa {n} từ vào flashcard để ôn định kỳ': 'Add {n} words to flashcards for regular review',
  'Các từ này đã có trong flashcard – hệ thống sẽ nhắc bạn ôn đúng lúc.': 'These words are already in your flashcards – we’ll remind you to review them at the right time.',
  'Học 8 từ tiếp theo': 'Learn the next 8 words',
  'Đã thêm': 'Added',

  /* ---------- study.js: Match & pronunciation ---------- */
  'Chơi lại': 'Play again',
  'Trình duyệt không hỗ trợ nhận dạng giọng nói – hãy dùng Chrome hoặc Edge.': 'This browser doesn’t support speech recognition – please use Chrome or Edge.',
  'Bỏ qua': 'Skip',
  'ước tính': 'estimated',
  'Xuất sắc!': 'Excellent!',
  'Máy nghe được: “{heard}”': 'We heard: “{heard}”',
  'Luyện tiếp': 'Keep practicing',

  /* ---------- plan.js: mistake notebook ---------- */
  'Từ vựng': 'Vocabulary',
  'Ngữ pháp': 'Grammar',
  'Đọc hiểu': 'Reading',
  'Sổ lỗi sai': 'Mistake notebook',
  'Mọi câu bạn làm sai đều được ghi lại tự động. Ôn lại lỗi sai là cách tăng điểm nhanh nhất – xem lại vì sao sai rồi đánh dấu “Đã hiểu”.': 'Every question you get wrong is saved automatically. Reviewing mistakes is the fastest way to raise your score – see why you got it wrong, then mark it “Got it”.',
  'Ôn từ sắp quên': 'Review fading words',
  'Dọn lỗi đã sửa': 'Clear fixed mistakes',
  'Tất cả ({n})': 'All ({n})',
  'sai {n} lần': 'missed {n} times',
  'Đã hiểu': 'Got it',
  'Xem lại bài': 'Review lesson',
  'Tra lại từ': 'Look up again',
  'Đọc lại bài': 'Reread passage',
  'Nghe lại phần này': 'Replay this part',
  'Không có lỗi sai nào cần xem lại.': 'No mistakes to review.',
  'Đã dọn': 'Cleared',

  /* ---------- plan.js: placement test ---------- */
  'TỪ VỰNG': 'VOCABULARY',
  'Tôi không biết': 'I don’t know',
  'từ vựng': 'vocabulary',
  'ngữ pháp': 'grammar',
  'Thoát giữa chừng?': 'Quit now?',
  'Kết quả của lượt này sẽ không được lưu.': 'Your answers in this round won’t be saved.',
  'Làm tiếp': 'Keep going',
  'Ưu tiên theo bài kiểm tra đầu vào': 'Prioritised by your placement test',
  'Lộ trình': 'Path',
  'Bắt đầu →': 'Start →',

  /* ---------- plan.js: today's plan ---------- */
  'Làm bài kiểm tra đầu vào (5 phút)': 'Take the placement test (5 min)',
  'Để Lexkite cá nhân hóa lộ trình cho bạn': 'So Lexkite can personalize your path',
  'Ôn tập thẻ đến hạn': 'Review due cards',
  'Lặp lại ngắt quãng – ưu tiên số 1': 'Spaced repetition – top priority',
  'đã học {pct}%': '{pct}% learned',
  'Ngữ pháp: {title}': 'Grammar: {title}',
  'Nghe: Test {test} · Part {part}': 'Listening: Test {test} · Part {part}',
  'Lần trước {score}/10 – nghe lại có lời thoại': 'Last time {score}/10 – listen again with the transcript',
  '10 câu': '10 questions',
  'Phát âm: {title}': 'Pronunciation: {title}',
  'Khẩu hình → nghe phân biệt → nói & chấm điểm': 'Mouth position → listen and compare → speak and get scored',
  'Đọc 1 bài IELTS & lưu từ mới': 'Read 1 IELTS passage & save new words',
  'Ngữ liệu dễ hiểu – học từ trong ngữ cảnh': 'Comprehensible input – learn words in context',
  'Luyện Speaking 1 câu hỏi': 'Practice 1 Speaking question',
  'Ghi âm, nghe lại, xem phân tích từ vựng': 'Record, play back and see a vocabulary analysis',
  'Viết 1 đoạn Task 2': 'Write 1 Task 2 paragraph',
  'Dùng lại từ vựng đã học': 'Reuse the vocabulary you’ve learned',
  'Thử Phòng viết lần đầu': 'Try the Writing room for the first time',

  /* ---------- plan.js: free resources ---------- */




















  /* ---------- path.js ---------- */
  'Chặng 0 · Từ cốt lõi': 'Stage 0 · Core words',
  'Những từ thông dụng nhất tiếng Anh (NGSL) – nền móng cho người mới': 'The most common English words (NGSL) – the foundation for beginners',
  'Chặng 1 · Nền tảng': 'Stage 1 · Foundations',
  'Từ vựng chủ đề quen thuộc trong Speaking Part 1–2': 'Everyday topic vocabulary for Speaking Part 1–2',
  'Chặng 2 · Mở rộng chủ đề': 'Stage 2 · Broader topics',
  'Chủ đề Writing Task 2 hay gặp và từ mô tả biểu đồ': 'Common Writing Task 2 topics and chart-description language',
  'Chặng 3 · Học thuật': 'Stage 3 · Academic',
  'Từ học thuật AWL, từ nối, cách nêu quan điểm': 'AWL academic words, linking words and ways to give opinions',
  'Chặng 4 · Tinh hoa': 'Stage 4 · Mastery',
  'Collocation, thành ngữ và từ học thuật nâng cao': 'Collocations, idioms and advanced academic words',
  'Học từ mới': 'Learn new words',
  'Giới thiệu từ → trắc nghiệm → tự gõ lại': 'Introduction → multiple choice → type it yourself',
  'Củng cố nhanh nghĩa – từ': 'Quickly reinforce word–meaning pairs',
  'Nhận diện âm và chính tả': 'Recognize sounds and spelling',
  'Kiểm tra bài': 'Unit test',
  'Đạt ≥ 80% để mở bài tiếp theo': 'Score ≥ 80% to unlock the next unit',
  '{done}/{total} bài hoàn thành · Học theo vòng: giới thiệu → luyện → nghe → kiểm tra, rồi ôn lại đúng thời điểm vàng.': '{done}/{total} units complete · Learn in cycles: introduce → practice → listen → test, then review at the optimal time.',
  'Bài này đang khóa': 'This unit is locked',
  'Hoàn thành bài trước (kiểm tra đạt ≥ 80%) hoặc học ≥ 80% số từ của bài này để mở khóa.': 'Complete the previous unit (score ≥ 80% on its test) or learn ≥ 80% of this unit’s words to unlock it.',
  'Xem trước bộ từ': 'Preview word set',
  '{n} từ · đã học {pct}%': '{n} words · {pct}% learned',
  'điểm kiểm tra {score}%': 'test score {score}%',
  'Đóng': 'Close',

  /* ---------- method.js ---------- */
  'Đường cong quên lãng': 'Forgetting curve',
  '{n} thẻ đang ở thời điểm vàng': '{n} cards at their optimal time',
  'Không còn thẻ đến hạn': 'No cards due',
  'Lặp lại ngắt quãng': 'Spaced repetition',
  'Ngữ liệu dễ hiểu': 'Comprehensible input',
  '1 bài ngữ pháp': '1 grammar lesson',
  'Sửa lỗi sai': 'Fix mistakes',
  'Nghe 1 phần': 'Listen to 1 part',
  'Luyện Speaking': 'Practice Speaking',
  'Ghép thẻ tính giờ': 'Timed matching',
  '{n} từ đang sắp quên': '{n} words fading',
  'Đọc bài': 'Read',

  'Luyện phát âm từ': 'Practice word pronunciation',
  'Thư viện phát âm': 'Pronunciation library',
  'Phòng Speaking': 'Speaking room',
  'Phòng viết': 'Writing room',
  'Sổ cụm từ': 'Phrasebook',
  'Chuỗi {n} ngày · {xp} XP': '{n}-day streak · {xp} XP',
  'Tiến độ & huy hiệu': 'Progress & badges',
  'Đọc 1 bài': 'Read 1 passage',
  'Ôn thẻ': 'Review cards',
  'đến hạn ôn': 'due for review',
  'đang ở bước học': 'in learning step',
  'Câu hỏi thường gặp': 'FAQ',

  /* ---------- goal.js ---------- */
  'Bài đọc': 'Reading passages',
  'Bài viết': 'Writing tasks',
  'Bài ngữ pháp': 'Grammar lessons',
  'Đặt mục tiêu': 'Set goal',
  'Kỳ thi': 'Exam',
  'Ngày thi': 'Exam date',
  'Lập kế hoạch': 'Create plan',
}); })(typeof self !== 'undefined' ? self : this);
/* Từ khó nhớ (leech) */
(function (g) { Object.assign(g.I18N_DICT.en, {
  'Từ khó nhớ – đã quên {n} lần': 'Hard word – forgotten {n} times',
  'Học lại theo cách khác thay vì ôn thêm lần nữa: tạo mẹo nhớ, đọc to theo, đặt câu về chính bạn.': 'Relearn it differently instead of just reviewing again: make a memory aid, say it aloud, write a sentence about yourself.',
  'Tạo mẹo nhớ bằng AI': 'Create a memory aid with AI', 'Đọc to theo 3 lần': 'Repeat aloud 3 times', 'AI đang nghĩ mẹo nhớ…': 'AI is thinking of a memory aid…',
  'Mẹo nhớ của riêng bạn (vd. liên tưởng âm thanh, hình ảnh)…': 'Your own memory aid (e.g. a sound or image association)…', 'Đã lưu mẹo nhớ': 'Memory aid saved', 'Bật AI': 'Turn on AI',
}); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, {
  'Chính xác!': 'Correct!', 'Chưa đúng': 'Not quite',
}); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Từ vừa quên – xem lại 1 lần nữa:': 'Words you just forgot – look again:', 'Số thẻ đến hạn 7 ngày tới': 'Cards due in the next 7 days', 'Mai': 'Tmrw' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Hay đi với': 'Goes with', 'Đồng nghĩa': 'Synonyms', 'Định nghĩa': 'Definition', 'Ví dụ': 'Example', 'Nghe cả câu': 'Play sentence' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Nghe từ, nhớ lại nghĩa rồi chạm để lật': 'Listen, recall the meaning, then tap to flip', 'nghe lại': 'replay' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Sắp thi hoặc muốn học thêm? Ôn trước {n} thẻ đến hạn trong 2 ngày tới.': 'Exam coming up or want more? Review {n} cards due in the next 2 days now.', 'Ôn trước →': 'Review ahead →' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Làm lại lỗi sai': 'Retry mistakes', 'Xem danh sách': 'View list', 'Gõ đáp án của bạn': 'Type your answer', 'Hiện đáp án': 'Show answer', 'Mình làm đúng': 'I got it right', 'Vẫn sai': 'Still wrong' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Làm lại {n} lỗi sai': 'Retry {n} mistakes', 'Tự nhớ lại đáp án – sửa lỗi = tăng điểm nhanh nhất': 'Recall the answer yourself – fixing mistakes is the fastest way to score higher' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Hoàn tác lần chấm vừa rồi (Z)': 'Undo last grade (Z)', 'Đã hoàn tác – chấm lại thẻ này': 'Undone – grade this card again' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'hoàn tác': 'undo' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Mẹo nhớ': 'Mnemonic', 'Lỗi hay gặp': 'Common mistake','Họ từ': 'Word family', 'Chế độ Rảnh tay': 'Hands-free mode', 'Xem lại đoạn gốc': 'Replay the original clip' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Hiểu sâu': 'Go deeper', 'Sai': 'Wrong', 'Đúng': 'Right', 'Chấm mức độ nhớ': 'Rate how well you remembered', 'Chạm để nghe · chạm lần nữa để tra nghĩa': 'Tap to hear · tap again to look it up' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { /* Lộ trình (path.js) – mục tiêu đầu ra từng chặng/bài; Mục tiêu CEFR (goal.js) */
  'Hiểu và dùng các từ thông dụng nhất trong hội thoại và bài đọc hằng ngày': 'Understand and use the most common words in everyday conversations and texts',
  'Nói và viết về chủ đề quen thuộc: học tập, công việc, sức khỏe, du lịch': 'Speak and write about familiar topics: study, work, health and travel',
  'Bàn luận vấn đề xã hội và mô tả số liệu, biểu đồ bằng từ chính xác': 'Discuss social issues and describe data and charts with precise words',
  'Viết và nói theo phong cách học thuật: nêu quan điểm, nối ý mạch lạc': 'Write and speak in an academic style: give opinions and link ideas clearly',
  'Diễn đạt tự nhiên và chính xác với collocation, thành ngữ': 'Express yourself naturally and precisely with collocations and idioms',
  'Mục tiêu: nhận ra, hiểu và dùng được {n} từ về “{name}”.': 'Goal: recognise, understand and use {n} words about “{name}”.',
  'Nghe giọng Anh–Anh': 'British pronunciation',
  'Phân bố mức độ nhớ': 'How well you remembered',
  'Cấp độ CEFR': 'CEFR level',
}); })(typeof self !== 'undefined' ? self : this);
/* Lộ trình: bài con chặng 0 */
(function (g) { Object.assign(g.I18N_DICT.en, {
  "Từ cốt lõi {a}–{b}": "Core words {a}–{b}",
}); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, {
  "Kết quả phiên ôn": "Review session results",
  "Hoàn thành mục tiêu ngày": "Daily goal reached",
  "Từ cần chú ý nhất:": "Word to watch most:",
  "Nghe phát âm": "Listen to pronunciation",
  "Từ vừa quên khác:": "Other missed words:",
  "Phiên ôn xuất sắc!": "Flawless review!",
  "Bạn không quên từ nào trong phiên này.": "You didn't forget a single word in this session.",
}); })(typeof self !== 'undefined' ? self : this);
