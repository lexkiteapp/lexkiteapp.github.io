/* English UI strings – phrases.js, write.js, task1.js, ideas.js, assist.js */
(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D.en = Object.assign(D.en || {}, {
// ---- Shared ----
'{n} từ': '{n} words',
'Biểu đồ cột': 'Bar chart',
'Biểu đồ tròn': 'Pie chart',
'Quy trình': 'Process',
'Bản đồ': 'Map',
'Tiếp tục': 'Resume',
'Tạm dừng': 'Pause',
'Số từ': 'Words',
'Nhận xét': 'Feedback',
'Kiểm tra': 'Check',
'Dịch': 'Translate',
'Khác': 'Other',

// ---- phrases.js: annotated model answers ----
'Từ nối': 'Linking words',
'Lưu vào Sổ cụm từ': 'Save to Phrasebook',
'Bài mẫu Task {n}': 'Task {n} model answer',

// ---- phrases.js: exercises ----
'Xem đáp án': 'Show answers',
'Danh từ số nhiều': 'Plural noun',
'Đáp án': 'Answers',
'Chính xác!': 'Correct!',

// ---- phrases.js: save phrase dialog & selection bar ----
'Lưu cụm từ / cấu trúc': 'Save phrase / structure',
'Cụm từ hoặc cấu trúc': 'Phrase or structure',
'vd: pose a threat to / not only … but also …': 'e.g. pose a threat to / not only … but also …',
'Nghĩa theo cụm': 'Meaning of the phrase',
'Nghĩa tiếng Việt của cả cụm': 'Translation of the whole phrase',
'Cách dùng / mẫu cấu trúc (tùy chọn)': 'Usage / pattern (optional)',
'vd: S + pose a threat to + N · dùng trong Writing Task 2': 'e.g. S + pose a threat to + N · used in Writing Task 2',
'Câu ví dụ / ngữ cảnh': 'Example sentence / context',
'Hủy': 'Cancel',
'Đang dịch…': 'Translating…',
'Đã lưu “{p}” – vào Sổ cụm từ để ôn': 'Saved “{p}” – review it in your Phrasebook',
'Tra nghĩa': 'See meaning',
'Lưu cụm': 'Save phrase',
'Lưu từ Lexkite': 'Saved from Lexkite',
'Đang tra “{text}”…': 'Looking up “{text}”…',
'Đang dịch “{text}”…': 'Translating “{text}”…',
'Chưa dịch được cả câu – nghĩa từng từ:': 'Couldn’t translate the whole sentence. Word meanings:',
'Nghĩa từng từ (tạm):': 'Word by word (rough):',
'Bản dịch': 'Translation',
'Không dịch được – thử lại sau.': 'Couldn’t translate – please try again later.',
'Cấu trúc trong đoạn': 'Structures in this text',
'Học bài này →': 'Study this lesson →',
'Giải thích sâu': 'Explain in depth',
'AI đang phân tích…': 'AI is analysing…',
'Không tìm thấy': 'Not found',
'Thêm ngữ cảnh': 'Add context',
'Lưu flashcard': 'Save flashcard',
'Chi tiết': 'Details',
'Đã lưu': 'Saved',

// ---- phrases.js: Phrasebook ----
'Sổ cụm từ & cấu trúc': 'Phrases & Structures',
'Học các cụm': 'Study phrases',

// ---- write.js: Writing Lab (Task 2) ----
'Phòng viết': 'Writing Lab',
'Đề {n}': 'Prompt {n}',
'Bắt đầu viết bài của bạn…': 'Start writing your essay…',
'Phân tích từ vựng': 'Analyse vocabulary',
'Mở': 'Open',
'Chưa có': 'None yet',

// write.js: trend stats (dynamic keys)
'Bảng (table)': 'Table',
'Bản đồ (map)': 'Map',
'Quy trình (process)': 'Process',
'Kết hợp': 'Mixed',

// write.js: essay outlines (dynamic keys)

// ---- task1.js: Writing Task 1 ----
'(bị động)': '(passive)',
'Lưu ý': 'Tips',
'Tổng quan': 'Overview',
'Số liệu': 'Figures',

// ---- ideas.js: Task 2 idea bank ----
'Không lưu được': 'Couldn’t save',

// ---- assist.js: writing assistant ----
'Chính tả': 'Spelling',
'Ngữ pháp': 'Grammar',
'Dấu câu': 'Punctuation',
'Văn phong': 'Style',
'Lặp từ': 'Repetition',
'Máy chủ kiểm tra đang bận – thử lại sau 1 phút.': 'The checking server is busy – try again in a minute.',
'Không kiểm tra được lúc này.': 'Can’t check right now.',
'Trợ lý viết': 'Writing assistant',
'Kiểm tra ngữ pháp, chính tả, văn phong · bôi đen 1 câu để viết lại hay hơn': 'Check grammar, spelling and style · select a sentence to rewrite it better',
'Kiểm tra ngữ pháp': 'Check grammar',
'Viết lại câu đã chọn': 'Rewrite selected sentence',
'Viết ít nhất 1–2 câu rồi kiểm tra nhé': 'Write at least a sentence or two before checking',
'Đang kiểm tra…': 'Checking…',
'Bỏ qua': 'Dismiss',
'(xóa)': '(delete)',
'Không có gợi ý – tự sửa lại câu': 'No suggestions – revise the sentence yourself',
'Bôi đen 1 câu (≥ 4 từ) trong bài để viết lại': 'Select a sentence (4+ words) in your essay to rewrite it',
'AI đang viết lại…': 'AI is rewriting…',
'Dùng câu này': 'Use this sentence',
'Không có kết quả.': 'No results.',
'Đã thay câu': 'Sentence replaced',
'Bật AI': 'Turn on AI',
}); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, {
'Đang phân tích từ vựng…': 'Analysing vocabulary…', 'Từ vựng quan trọng': 'Key vocabulary',
'Tải AI của Chrome (~2GB, 1 lần)': 'Download Chrome’s AI (~2 GB, once)', 
}); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, {"Chấm lại": "Re-grade"}); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Trang trọng, học thuật hơn': 'More formal and academic', 'Gọn hơn, bỏ ý thừa': 'More concise', 'Diễn đạt đầy đủ, nhiều cấu trúc hơn': 'Fuller, with richer structures', 'Gợi ý sửa từ AI trên máy': 'Suggestion from on-device AI' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Luôn có': 'Always on', 'Không tải được – thử lại sau': 'Download failed – try again later',
'Trang trọng': 'Formal', 'Bán trang trọng': 'Semi-formal', 'Thân mật': 'Informal',
'Bạn bè, người thân: Dear/Hi + tên → Best wishes / Love / See you soon. Được dùng viết tắt (I\'m, can\'t) và câu cảm thán.': 'Friends and family: Dear/Hi + first name → Best wishes / Love / See you soon. Contractions (I\'m, can\'t) and exclamations are fine.',
'Luyện viết': 'Practise writing', 
'Thư trang trọng nên tránh viết tắt (có {n} chỗ như I\'m, can\'t).': 'Formal letters should avoid contractions ({n} found, e.g. I\'m, can\'t).',
// ---- Tên đề viết thư IELTS General (gt-letters.js) ----
}); })(typeof self !== 'undefined' ? self : this);
