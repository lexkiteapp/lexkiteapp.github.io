/* 🌐 Lỗi hay gặp do ảnh hưởng tiếng mẹ đẻ – người Việt. Hiện trong bài ngữ pháp khi giao diện = vi (grammar.js loadL1).
 * notes[id bài] = [[câu sai, câu đúng, giải thích ngắn bằng tiếng Việt]] – viết tay, không dịch máy. */
window.GRAMMAR_L1 = { lang: 'vi', title: 'Lỗi hay gặp của người Việt', notes: {
  articles: [['I bought new phone yesterday.', 'I bought a new phone yesterday.', 'Tiếng Việt không có mạo từ nên hay bỏ a/an. Danh từ đếm được số ít luôn cần a/an/the (hoặc my, this…).']],
  'noun-plurals': [['There are many student in my class.', 'There are many students in my class.', 'Tiếng Việt dùng "nhiều", "các" chứ không đổi danh từ; tiếng Anh vẫn phải thêm -s sau many, two, several…']],
  'present-simple': [['My brother work in a bank.', 'My brother works in a bank.', 'Động từ tiếng Việt không đổi theo ngôi; chủ ngữ ngôi thứ ba số ít ở hiện tại đơn cần thêm -s/-es.']],
  'past-simple': [['Yesterday I go to the cinema.', 'Yesterday I went to the cinema.', 'Tiếng Việt chỉ thời gian bằng từ (hôm qua, đã); tiếng Anh phải đổi dạng động từ dù câu đã có yesterday.']],
  'reason-contrast': [['Although it rained, but we went out.', 'Although it rained, we went out.', '"Mặc dù… nhưng…" → tiếng Anh chỉ dùng một liên từ: although HOẶC but.']],
  'purpose-result': [['Because I was tired, so I went home early.', 'Because I was tired, I went home early.', '"Vì… nên…" → chỉ giữ because hoặc so, không dùng cả hai trong một câu.']],
  'dependent-prepositions': [['We discussed about the problem.', 'We discussed the problem.', '"Thảo luận về" nhưng discuss đi thẳng với tân ngữ, không có about (tương tự: mention, emphasize).']],
  'there-is-empty-it': [['In my city has many parks.', 'There are many parks in my city.', '"Ở thành phố tôi có…" không dịch là has; tiếng Anh dùng There is / There are.']],
  'ing-ed-adjectives-prepositions': [['I am very boring in this lesson.', 'I am very bored in this lesson.', 'Tiếng Việt "chán" dùng cho cả người lẫn vật; tiếng Anh: -ed tả cảm xúc của người, -ing tả thứ gây ra cảm xúc.']],
} };
