/* English UI strings – phrases.js, write.js, task1.js, ideas.js, assist.js */
(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D.en = Object.assign(D.en || {}, {
// ---- Shared ----
'{n} từ': '{n} words',
'Biểu đồ cột': 'Bar chart',
'Biểu đồ tròn': 'Pie chart',
'Quy trình': 'Process',
'Bản đồ': 'Map',
'Bấm giờ': 'Start timer',
'Tiếp tục': 'Resume',
'Tạm dừng': 'Pause',
'Số từ': 'Words',
'Nhận xét': 'Feedback',
'Kiểm tra': 'Check',
'Dịch': 'Translate',
'Khác': 'Other',

// ---- phrases.js: annotated model answers ----
'Từ nối': 'Linking words',
'Lưu tất cả': 'Save all',
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
'Độ đa dạng từ': 'Lexical variety',
'Từ nối & cụm': 'Linkers & phrases',
'Từ của tôi': 'My words',

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
'Tải AI của Chrome (~2GB, 1 lần)': 'Download Chrome’s AI (~2 GB, once)', 'AI phản hồi quá lâu – thử lại sau.': 'AI took too long – try again later.',
}); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, {"{n}/{min} từ · {p} đoạn.": "{n}/{min} words · {p} paragraphs.", "Có câu tổng quan (overview).": "Has an overview.", "Thiếu câu tổng quan (overview) – lỗi nặng ở Task 1.": "No overview – a serious weakness in Task 1.", "{k} số liệu được dẫn.": "{k} figures cited.", "Nêu rõ quan điểm.": "Clear position.", "Chưa nêu rõ quan điểm.": "Position not clearly stated.", "Có kết luận.": "Has a conclusion.", "Thiếu đoạn kết luận.": "Missing a conclusion.", "Dùng {n} từ nối khác nhau: {list}.": "Uses {n} different linking words: {list}.", "Dùng {n} từ nối khác nhau.": "Uses {n} different linking words.", "Độ đa dạng từ {p}%, từ học thuật {a}%.": "Lexical variety {p}%, academic words {a}%.", "{c}% câu có cấu trúc phức · {e} lỗi phát hiện.": "{c}% complex sentences · {e} errors found.", "Viết đủ tối thiểu {min} từ – thiếu từ bị trừ điểm Task.": "Write at least {min} words – under-length answers lose Task marks.", "Thêm câu tổng quan bắt đầu bằng “Overall, …” nêu 2 xu hướng/đặc điểm nổi bật nhất.": "Add an overview starting with “Overall, …” stating the 2 most notable trends or features.", "Nêu rõ quan điểm ngay mở bài và nhắc lại ở kết bài.": "State your position in the introduction and restate it in the conclusion.", "Dùng đa dạng từ nối hơn: however, moreover, as a result, for instance, in contrast…": "Use a wider range of linkers: however, moreover, as a result, for instance, in contrast…", "Thêm câu phức: mệnh đề quan hệ (which/who), câu điều kiện, “Although…”, mệnh đề rút gọn V-ing.": "Add complex sentences: relative clauses (which/who), conditionals, “Although…”, participle clauses.", "Thay từ quá cơ bản bằng từ chính xác hơn (xem gợi ý bên dưới).": "Replace very basic words with more precise ones (see suggestions below).", "Dùng thêm từ học thuật (AWL) đã học trong thư viện Lexkite.": "Use more academic (AWL) words from your Lexkite library.", "Ước lượng nhanh theo các chỉ số đo được (độ dài, bố cục, từ nối, từ vựng, câu phức, lỗi ngữ pháp). Để có nhận xét chi tiết như giám khảo, bật chấm bằng AI.": "A quick estimate from measurable features (length, structure, linkers, vocabulary, complex sentences, grammar errors). For examiner-style feedback, turn on AI grading.", "Liên kết ý tốt với nhiều từ nối.": "Ideas are well linked with varied connectors.", "Vốn từ đa dạng, ít lặp từ.": "Varied vocabulary with little repetition.", "Dùng từ học thuật phù hợp.": "Appropriate academic vocabulary.", "Có nhiều câu phức.": "Good use of complex sentences.", "Đủ độ dài yêu cầu.": "Meets the length requirement.", "Từ cơ bản – nên thay để tăng điểm Lexical Resource.": "Basic word – replace it to raise your Lexical Resource score.", "Lexkite – chấm nhanh theo quy tắc": "Lexkite – quick rule-based scoring", "Chấm sâu như giám khảo bằng AI (miễn phí)": "Get examiner-style AI feedback (free)", "Đây là kết quả chấm nhanh theo quy tắc:": "Here is the quick rule-based result:", "Chấm lại": "Re-grade"}); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Trang trọng, học thuật hơn': 'More formal and academic', 'Gọn hơn, bỏ ý thừa': 'More concise', 'Diễn đạt đầy đủ, nhiều cấu trúc hơn': 'Fuller, with richer structures', 'Gợi ý sửa từ AI trên máy': 'Suggestion from on-device AI' }); })(typeof self !== 'undefined' ? self : this);
(function (g) { Object.assign(g.I18N_DICT.en, { 'Tải về (~2 GB, 1 lần)': 'Download (~2 GB, once)', 'Chấm nhanh & ghi chú từ soạn sẵn': 'Quick scoring & built-in word notes', 'Luôn có': 'Always on', 'AI có sẵn trong Chrome (trên máy, riêng tư)': 'Chrome built-in AI (on-device, private)', 'Gemini – chấm chi tiết như giám khảo': 'Gemini – examiner-style feedback','AI của Chrome đã sẵn sàng': 'Chrome AI is ready', 'Không tải được – thử lại sau': 'Download failed – try again later',
'Trang trọng': 'Formal', 'Bán trang trọng': 'Semi-formal', 'Thân mật': 'Informal',
'Bạn bè, người thân: Dear/Hi + tên → Best wishes / Love / See you soon. Được dùng viết tắt (I\'m, can\'t) và câu cảm thán.': 'Friends and family: Dear/Hi + first name → Best wishes / Love / See you soon. Contractions (I\'m, can\'t) and exclamations are fine.',
'Luyện viết': 'Practise writing', 
'Thư trang trọng nên tránh viết tắt (có {n} chỗ như I\'m, can\'t).': 'Formal letters should avoid contractions ({n} found, e.g. I\'m, can\'t).',
// ---- Tên đề viết thư IELTS General (gt-letters.js) ----
}); })(typeof self !== 'undefined' ? self : this);
