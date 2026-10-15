/* Ngữ pháp – Từ loại & cấu trúc câu (tự biên soạn) */
(function (g) {
  const G = g.GRAMMAR = g.GRAMMAR || [];

  /* ===================== UNIT: WORDS ===================== */

  G.push({
    id: 'articles', unit: 'words', order: 1,
    title: 'Mạo từ a/an/the và không mạo từ', en: 'Articles', level: 'A2', emoji: '🅰️',
    summary: 'Dùng a/an cho danh từ đếm được số ít được nhắc lần đầu, the cho thứ đã xác định, và bỏ mạo từ khi nói chung chung với danh từ số nhiều hoặc không đếm được.',
    blocks: [
      { type: 'diagram', caption: 'Chọn mạo từ theo từng bước', steps: [
        { t: 'Người nghe đã biết chính xác vật/người nào chưa?', c: 'if' },
        { t: 'Rồi → dùng THE: the report we discussed', c: 'result' },
        { t: '↓ Chưa', c: 'arrow' },
        { t: 'Danh từ đếm được số ít?', c: 'if' },
        { t: 'Có → A / AN: a survey, an hour', c: 'result' },
        { t: '↓ Không (số nhiều / không đếm được)', c: 'arrow' },
        { t: 'Nói chung chung → không mạo từ: Students need sleep.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Lần đầu nhắc tới', parts: [ { t: 'a / an', c: 'aux' }, { t: 'N (số ít, đếm được)', c: 'obj' } ], ex: 'The council built a new library.' },
        { label: 'Đã xác định', parts: [ { t: 'the', c: 'aux' }, { t: 'N', c: 'obj' } ], ex: 'The library opens at 8 a.m.' },
        { label: 'Nói chung', parts: [ { t: 'Ø', c: 'neg' }, { t: 'N số nhiều / không đếm được', c: 'subj' }, { t: 'V…', c: 'verb' } ], ex: 'Libraries play a key role in education.' }
      ] },
      { type: 'uses', items: [
        { title: 'A/an: một cái bất kỳ, nhắc lần đầu', ex: 'A recent study looked at teenage sleep patterns.', vi: 'Một nghiên cứu gần đây đã xem xét thói quen ngủ của thanh thiếu niên.' },
        { title: 'An trước nguyên âm (theo phát âm, không theo chữ cái)', ex: 'It took an hour to complete a university application.', vi: 'Mất một tiếng để hoàn thành một hồ sơ xin vào đại học.' },
        { title: 'The: thứ duy nhất hoặc đã được xác định', ex: 'The graph shows the number of tourists visiting the UK.', vi: 'Biểu đồ cho thấy số lượng du khách đến Vương quốc Anh.' },
        { title: 'The với so sánh nhất, số thứ tự, nhạc cụ, một số tên nước', ex: 'The highest figure was recorded in the first quarter.', vi: 'Con số cao nhất được ghi nhận ở quý đầu tiên.' },
        { title: 'Không mạo từ: nói chung, tên riêng, bữa ăn, môn học', ex: 'Unemployment remains a serious problem in many cities.', vi: 'Thất nghiệp vẫn là một vấn đề nghiêm trọng ở nhiều thành phố.' }
      ] },
      { type: 'table', head: ['Trường hợp', 'Mạo từ', 'Ví dụ'], rows: [
        ['Nghề nghiệp', 'a/an', 'She is an engineer.'],
        ['Âm /juː/ bắt đầu', 'a', 'a university, a European country'],
        ['h câm', 'an', 'an honest answer, an hour'],
        ['Tên nước có Republic/Kingdom/States', 'the', 'the UK, the USA, the Philippines'],
        ['Tên nước thông thường', 'Ø', 'Vietnam, Japan, France'],
        ['Khái niệm chung (không đếm được)', 'Ø', 'Pollution affects health.']
      ] },
      { type: 'tip', text: 'Trong Task 1, hầu như luôn viết “the + danh từ” khi nhắc lại thứ đã có trong đề: the chart, the figure for Japan, the proportion of women. Nhưng nói về một xu hướng chung trong Task 2 thì bỏ mạo từ: Technology has changed education.' },
      { type: 'mistake', wrong: 'The technology is changing the way we work.', right: 'Technology is changing the way we work.', why: 'Khi nói về công nghệ nói chung (khái niệm trừu tượng) thì không dùng the.' },
      { type: 'mistake', wrong: 'He is student at a university in Hanoi.', right: 'He is a student at a university in Hanoi.', why: 'Danh từ đếm được số ít không bao giờ đứng một mình; cần a/an/the/my…' },
      { type: 'mistake', wrong: 'It was an useful experience.', right: 'It was a useful experience.', why: '“useful” bắt đầu bằng âm /j/ (phụ âm), nên dùng a.' },
      { type: 'ielts', text: 'Lỗi mạo từ là lỗi phổ biến nhất của thí sinh Việt Nam vì tiếng Việt không có mạo từ. Kiểm tra mọi danh từ đếm được số ít trong bài viết: nó đã có a/an/the hoặc từ hạn định chưa?', ex: 'In the first year, the proportion of people who used public transport was just under a third.' }
    ],
    quiz: [
      { q: 'She wants to become ___ architect.', options: ['a', 'an', 'the', 'Ø'], answer: 1, explain: 'Nghề nghiệp dùng a/an; “architect” bắt đầu bằng nguyên âm nên dùng an.' },
      { q: '___ pie chart illustrates how households spent their income in 2020.', options: ['A', 'An', 'The', 'Ø'], answer: 2, explain: 'Biểu đồ trong đề đã xác định với người đọc nên dùng The.' },
      { q: '___ education is the key to reducing poverty.', options: ['A', 'An', 'The', 'Ø'], answer: 3, explain: 'Nói về giáo dục nói chung (không đếm được, trừu tượng) nên không dùng mạo từ.' },
      { q: 'He studied at ___ university in Manchester.', options: ['a', 'an', 'the', 'Ø'], answer: 0, explain: '“university” phát âm bắt đầu bằng /j/ nên dùng a.' },
      { q: 'Many students travel to ___ United States to study.', options: ['a', 'an', 'the', 'Ø'], answer: 2, explain: 'Tên nước có “States” dùng the.' },
      { q: 'Which sentence is correct?', options: ['The number of cars rose sharply.', 'Number of cars rose sharply.', 'A number of cars rose sharply.', 'The number of car rose sharply.'], answer: 0, explain: '“The number of + N số nhiều” chỉ con số cụ thể; các câu khác sai mạo từ hoặc sai nghĩa/số.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She is an university student.', 'She is a university student.', 'She is a university students.', 'She is university student.'], answer: 1, explain: 'university bắt đầu bằng âm /j/ (phụ âm) nên dùng a; danh từ đếm được số ít cần mạo từ.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['The unemployment is a serious problem.', 'An unemployment is a serious problem.', 'Unemployment is a serious problem.', 'Unemployment is serious the problem.'], answer: 2, explain: 'Danh từ không đếm được nói chung (unemployment) không dùng mạo từ.' },
      { q: 'Phần nào sai? (A) The life in (B) a big city can be stressful, (C) but it offers (D) many opportunities.', options: ['(A) The', '(B) a', '(C) but', '(D) many'], answer: 0, explain: 'life nói chung không dùng the → bỏ The: Life in a big city…' },
      { q: 'Phần nào sai? He plays (A) piano (B) very well and (C) is (D) the best musician in our class.', options: ['(A) piano', '(B) very', '(C) is', '(D) the'], answer: 0, explain: 'Chơi nhạc cụ dùng the → plays the piano.' },
      { q: 'Task 1: ___ number of international students rose sharply between 2010 and 2020.', options: ['A', 'The', 'An', '—'], answer: 1, explain: 'The number of + N số nhiều (con số cụ thể) đi với động từ số ít; a number of nghĩa là nhiều.' },
      { q: 'Task 2: Many people believe that ___ education is the key to reducing poverty.', options: ['the', 'an', 'a', '—'], answer: 3, explain: 'education nói chung (không đếm được) không dùng mạo từ.' }
    ]
  });

  G.push({
    id: 'countable-uncountable', unit: 'words', order: 2,
    title: 'Danh từ đếm được, không đếm được & lượng từ', en: 'Countable/Uncountable Nouns & Quantifiers', level: 'A2', emoji: '🧮',
    summary: 'Phân biệt danh từ đếm được và không đếm được để chọn đúng lượng từ như many/much, a few/a little, plenty of.',
    blocks: [
      { type: 'sort', caption: 'Xếp danh từ vào hai nhóm (nhiều từ không đếm được trong tiếng Anh lại đếm được trong tiếng Việt)', groups: [
        { title: 'Countable', emoji: '🍎', items: ['job', 'suggestion', 'vehicle', 'tourist', 'problem', 'factory'] },
        { title: 'Uncountable', emoji: '💧', items: ['advice', 'information', 'research', 'equipment', 'traffic', 'furniture', 'evidence', 'knowledge'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Đếm được', parts: [ { t: 'many / a few / few / a number of', c: 'aux' }, { t: 'N số nhiều', c: 'obj' } ], ex: 'A few students failed the exam.' },
        { label: 'Không đếm được', parts: [ { t: 'much / a little / little / an amount of', c: 'aux' }, { t: 'N không đếm được', c: 'obj' } ], ex: 'There is little evidence to support this claim.' },
        { label: 'Dùng cho cả hai', parts: [ { t: 'a lot of / plenty of / some / any / no', c: 'aux' }, { t: 'N', c: 'obj' } ], ex: 'Plenty of money is spent on advertising.' }
      ] },
      { type: 'uses', items: [
        { title: 'Many/much thường dùng trong câu phủ định và câu hỏi', ex: 'Not many people can afford a house in the city centre.', vi: 'Không nhiều người đủ khả năng mua nhà ở trung tâm thành phố.' },
        { title: 'A few/a little = một vài, một ít (ý tích cực)', ex: 'A little practice every day makes a big difference.', vi: 'Luyện tập một chút mỗi ngày tạo ra khác biệt lớn.' },
        { title: 'Few/little = rất ít, hầu như không (ý tiêu cực)', ex: 'Few young people read newspapers nowadays.', vi: 'Ngày nay rất ít người trẻ đọc báo giấy.' },
        { title: 'Đơn vị để đếm danh từ không đếm được', ex: 'She gave me a useful piece of advice.', vi: 'Cô ấy cho tôi một lời khuyên hữu ích.' },
        { title: 'Amount (không đếm được) và number (đếm được) trong Task 1', ex: 'The amount of waste fell, while the number of recycling centres grew.', vi: 'Lượng rác thải giảm, trong khi số trung tâm tái chế tăng.' }
      ] },
      { type: 'table', head: ['Đếm được', 'Không đếm được', 'Cả hai'], rows: [
        ['many', 'much', 'a lot of / lots of'],
        ['a few / few', 'a little / little', 'plenty of'],
        ['a number of', 'an amount of / a great deal of', 'some / any / no'],
        ['fewer', 'less', 'more / most'],
        ['several, each, every', 'a piece of, a bit of', 'enough']
      ] },
      { type: 'tip', text: 'Các từ “bẫy” luôn không đếm được: advice, information, research, equipment, furniture, luggage, homework, knowledge, news, traffic, accommodation. Không thêm -s và không dùng a/an.' },
      { type: 'tip', text: 'Trong văn viết học thuật, ưu tiên “a large number of / a significant amount of / a great deal of” thay cho “a lot of”.' },
      { type: 'mistake', wrong: 'Teachers can give students many useful advices.', right: 'Teachers can give students a lot of useful advice.', why: '“advice” không đếm được: không có dạng số nhiều và không đi với many.' },
      { type: 'mistake', wrong: 'There were less cars on the road in 2010.', right: 'There were fewer cars on the road in 2010.', why: '“cars” đếm được nên dùng fewer; less dùng cho danh từ không đếm được.' },
      { type: 'mistake', wrong: 'The amount of students increased.', right: 'The number of students increased.', why: '“students” đếm được nên dùng number, không dùng amount.' },
      { type: 'ielts', text: 'Task 1 thường chấm lỗi number/amount và fewer/less. Ghi nhớ: người, xe, quốc gia → number/fewer; nước, điện, tiền, rác → amount/less.', ex: 'The amount of electricity consumed rose steadily, whereas the number of households with solar panels doubled.' }
    ],
    quiz: [
      { q: 'We need more ___ before making a decision.', options: ['informations', 'information', 'an information', 'many information'], answer: 1, explain: '“information” không đếm được, không thêm -s, không dùng an/many.' },
      { q: 'Only ___ students passed, so the teacher was disappointed.', options: ['a few', 'few', 'a little', 'little'], answer: 1, explain: '“few” mang nghĩa tiêu cực (rất ít), phù hợp với việc giáo viên thất vọng; students đếm được.' },
      { q: 'The chart shows the ___ of water used by each sector.', options: ['number', 'amount', 'many', 'few'], answer: 1, explain: '“water” không đếm được nên dùng amount.' },
      { q: 'There is ___ traffic in the city centre during rush hour.', options: ['many', 'a lot of', 'a few', 'several'], answer: 1, explain: '“traffic” không đếm được; a lot of dùng được cho cả hai loại.' },
      { q: 'Choose the correct sentence.', options: ['They bought new furnitures.', 'They bought a new furniture.', 'They bought some new furniture.', 'They bought many new furniture.'], answer: 2, explain: '“furniture” không đếm được, đi với some; không có dạng số nhiều.' },
      { q: 'People today spend ___ time outdoors than their parents did.', options: ['fewer', 'less', 'few', 'little'], answer: 1, explain: '“time” không đếm được, dạng so sánh hơn của little là less.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She gave me some useful advices.', 'She gave me a useful advice.', 'She gave me some useful advice.', 'She gave me many useful advice.'], answer: 2, explain: 'advice là danh từ không đếm được: không thêm -s, không dùng a/many; dùng some.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['There is too much traffic in the city centre.', 'There are too many traffics in the city centre.', 'There is too many traffic in the city centre.', 'There are too much traffic in the city centre.'], answer: 0, explain: 'traffic không đếm được → too much + động từ số ít is.' },
      { q: 'Phần nào sai? We need (A) more (B) informations (C) about the course (D) before we decide.', options: ['(A) more', '(B) informations', '(C) about', '(D) before'], answer: 1, explain: 'information không đếm được, không thêm -s.' },
      { q: 'Phần nào sai? Only (A) a little students (B) attended the lecture (C) because of (D) the heavy rain.', options: ['(A) a little', '(B) attended', '(C) because of', '(D) the'], answer: 0, explain: 'students đếm được → dùng a few (hoặc few), không dùng a little.' },
      { q: 'Task 1: The ___ of plastic waste produced in the country doubled between 2000 and 2020.', options: ['number', 'amount', 'many', 'few'], answer: 1, explain: 'waste không đếm được → the amount of.' },
      { q: 'Speaking Part 1: "Do you have many friends?" – "Not many, but I have ___ close friends I can really trust."', options: ['a little', 'much', 'little', 'a few'], answer: 3, explain: 'friends đếm được, ý tích cực (một vài) → a few.' }
    ]
  });

  G.push({
    id: 'adjectives-adverbs', unit: 'words', order: 3,
    title: 'Tính từ, trạng từ & trật tự từ', en: 'Adjectives vs Adverbs & Word Order', level: 'A2', emoji: '🎨',
    summary: 'Tính từ bổ nghĩa cho danh từ, trạng từ bổ nghĩa cho động từ, tính từ hoặc cả câu; vị trí của chúng tuân theo trật tự cố định.',
    blocks: [
      { type: 'diagram', caption: 'Từ tính từ đến trạng từ trong mô tả xu hướng', steps: [
        { t: 'There was a sharp rise in sales.', c: 'active' },
        { t: 'sharp = tính từ, bổ nghĩa cho danh từ rise', c: 'note' },
        { t: '↓ đổi danh từ thành động từ', c: 'arrow' },
        { t: 'Sales rose sharply.', c: 'result' },
        { t: 'sharply = trạng từ, bổ nghĩa cho động từ rose', c: 'note' }
      ] },
      { type: 'formula', rows: [
        { label: 'Tính từ + danh từ', parts: [ { t: 'a / the', c: 'aux' }, { t: 'Adj', c: 'adv' }, { t: 'N', c: 'obj' } ], ex: 'a significant increase' },
        { label: 'Động từ nối + tính từ', parts: [ { t: 'S', c: 'subj' }, { t: 'be / seem / become / remain', c: 'verb' }, { t: 'Adj', c: 'adv' } ], ex: 'The figure remained stable.' },
        { label: 'Động từ + trạng từ', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'Adv', c: 'adv' } ], ex: 'Prices increased dramatically.' },
        { label: 'Trạng từ + tính từ', parts: [ { t: 'Adv', c: 'adv' }, { t: 'Adj', c: 'obj' } ], ex: 'an extremely expensive project' }
      ] },
      { type: 'uses', items: [
        { title: 'Tính từ đứng trước danh từ hoặc sau động từ nối', ex: 'The results seem surprising.', vi: 'Kết quả có vẻ đáng ngạc nhiên.' },
        { title: 'Trạng từ cách thức đứng sau động từ/tân ngữ', ex: 'The government handled the crisis effectively.', vi: 'Chính phủ đã xử lý cuộc khủng hoảng một cách hiệu quả.' },
        { title: 'Trạng từ tần suất đứng trước động từ thường, sau be', ex: 'Students are often tired because they rarely sleep enough.', vi: 'Học sinh thường mệt vì hiếm khi ngủ đủ.' },
        { title: 'Trạng từ bình luận đứng đầu câu', ex: 'Unfortunately, the plan was never put into practice.', vi: 'Đáng tiếc là kế hoạch không bao giờ được thực hiện.' },
        { title: 'Trật tự nhiều tính từ: ý kiến – kích cỡ – tuổi – màu – nguồn gốc – chất liệu', ex: 'a beautiful old wooden house', vi: 'một ngôi nhà gỗ cũ đẹp' }
      ] },
      { type: 'table', head: ['Tính từ', 'Trạng từ', 'Ghi chú'], rows: [
        ['quick', 'quickly', 'thêm -ly'],
        ['steady', 'steadily', 'y → ily'],
        ['dramatic', 'dramatically', '-ic → -ically'],
        ['good', 'well', 'bất quy tắc'],
        ['fast / hard / late', 'fast / hard / late', 'giống nhau (hardly, lately mang nghĩa khác)'],
        ['friendly / lovely', '(không có)', 'dùng in a friendly way']
      ] },
      { type: 'tip', text: 'Task 1 nên luân phiên hai cấu trúc: “There was a gradual decline in…” (Adj + N) và “… declined gradually” (V + Adv) để tránh lặp và thể hiện sự linh hoạt ngữ pháp.' },
      { type: 'mistake', wrong: 'The number of visitors increased significant.', right: 'The number of visitors increased significantly.', why: 'Bổ nghĩa cho động từ increased phải dùng trạng từ.' },
      { type: 'mistake', wrong: 'I feel badly about the result.', right: 'I feel bad about the result.', why: '“feel” là động từ nối (cảm thấy) nên đi với tính từ.' },
      { type: 'mistake', wrong: 'She speaks very well English.', right: 'She speaks English very well.', why: 'Trạng từ cách thức không chen giữa động từ và tân ngữ.' },
      { type: 'ielts', text: 'Bộ từ mô tả xu hướng cần thuộc ở cả hai dạng: slight/slightly, gradual/gradually, steady/steadily, sharp/sharply, dramatic/dramatically, considerable/considerably.', ex: 'Coffee consumption rose steadily between 2000 and 2010, followed by a dramatic fall.' }
    ],
    quiz: [
      { q: 'Unemployment fell ___ over the decade.', options: ['steady', 'steadily', 'steadiness', 'more steady'], answer: 1, explain: 'Bổ nghĩa cho động từ fell nên cần trạng từ steadily.' },
      { q: 'There was a ___ increase in online shopping.', options: ['dramatically', 'dramatic', 'drama', 'dramatise'], answer: 1, explain: 'Bổ nghĩa cho danh từ increase nên cần tính từ dramatic.' },
      { q: 'The food in the canteen tastes ___.', options: ['awfully', 'awful', 'awfulness', 'more awfully'], answer: 1, explain: '“taste” là động từ chỉ giác quan, đóng vai trò động từ nối nên đi với tính từ.' },
      { q: 'Choose the correct word order.', options: ['He always is late for class.', 'He is always late for class.', 'He is late always for class.', 'Always he is late for class.'], answer: 1, explain: 'Trạng từ tần suất đứng sau động từ be.' },
      { q: 'She works very ___ to support her family.', options: ['hardly', 'hard', 'hardness', 'harder than'], answer: 1, explain: '“hard” vừa là tính từ vừa là trạng từ; hardly nghĩa là hầu như không.' },
      { q: 'Which phrase has the correct adjective order?', options: ['a Japanese small new car', 'a new small Japanese car', 'a small new Japanese car', 'a Japanese new small car'], answer: 2, explain: 'Thứ tự: kích cỡ (small) – tuổi (new) – nguồn gốc (Japanese).' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She speaks English very good.', 'She speaks English very well.', 'She speaks very well English.', 'She very well speaks English.'], answer: 1, explain: 'Bổ nghĩa cho động từ dùng trạng từ well; trạng từ đứng sau tân ngữ.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['They live in a stone old lovely cottage.', 'They live in an old lovely stone cottage.', 'They live in a lovely stone old cottage.', 'They live in a lovely old stone cottage.'], answer: 3, explain: 'Trật tự tính từ: ý kiến (lovely) – tuổi (old) – chất liệu (stone).' },
      { q: 'Phần nào sai? The number of visitors (A) increased (B) dramatic (C) after the museum (D) reopened.', options: ['(A) increased', '(B) dramatic', '(C) after', '(D) reopened'], answer: 1, explain: 'Bổ nghĩa cho động từ increased cần trạng từ → dramatically.' },
      { q: 'Phần nào sai? He (A) always is late (B) for meetings, (C) which annoys his (D) colleagues.', options: ['(A) always is', '(B) for', '(C) which', '(D) colleagues'], answer: 0, explain: 'Trạng từ tần suất đứng sau be → is always.' },
      { q: 'Task 1: Car sales rose ___ in the first quarter and then levelled off.', options: ['steady', 'steadiness', 'steadily', 'steadied'], answer: 2, explain: 'Bổ nghĩa cho động từ rose dùng trạng từ steadily.' },
      { q: 'Speaking Part 1: "How do you feel about your hometown?" – "I feel really ___ there because everyone is so friendly."', options: ['comfortably', 'comfortable', 'comfort', 'comfortableness'], answer: 1, explain: 'Sau động từ nối feel dùng tính từ: comfortable.' }
    ]
  });

  G.push({
    id: 'comparatives-superlatives', unit: 'words', order: 4,
    title: 'So sánh hơn & so sánh nhất', en: 'Comparatives & Superlatives', level: 'B1', emoji: '📊',
    summary: 'Dùng so sánh hơn, so sánh nhất, so sánh bằng, so sánh kép và trạng từ chỉ mức độ để so sánh số liệu chính xác.',
    blocks: [
      { type: 'diagram', caption: 'Từ số liệu thô đến câu so sánh band cao', steps: [
        { t: 'Italy: 45%. Spain: 43%.', c: 'note' },
        { t: '↓ so sánh cơ bản', c: 'arrow' },
        { t: 'Italy\'s figure was higher than Spain\'s.', c: 'active' },
        { t: '↓ thêm mức độ chênh lệch', c: 'arrow' },
        { t: 'Italy\'s figure was slightly higher than Spain\'s.', c: 'result' },
        { t: '↓ hoặc đảo góc nhìn', c: 'arrow' },
        { t: 'Spain\'s figure was not quite as high as Italy\'s.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'So sánh hơn', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'slightly / much / considerably', c: 'adv' }, { t: 'Adj-er / more Adj', c: 'obj' }, { t: 'than…', c: 'aux' } ], ex: 'Rents are considerably higher in London than in Leeds.' },
        { label: 'So sánh nhất', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'the Adj-est / the most Adj', c: 'obj' }, { t: '(in / of…)', c: 'time' } ], ex: 'Cars were the most popular means of transport.' },
        { label: 'So sánh không bằng', parts: [ { t: 'S', c: 'subj' }, { t: 'be', c: 'verb' }, { t: 'not', c: 'neg' }, { t: 'as / so Adj as', c: 'obj' }, { t: 'N', c: 'aux' } ], ex: 'Buses are not as fast as trains.' },
        { label: 'So sánh kép', parts: [ { t: 'The + comparative', c: 'adv' }, { t: 'S + V', c: 'subj' }, { t: ', the + comparative', c: 'adv' }, { t: 'S + V', c: 'verb' } ], ex: 'The more people earn, the more they spend.' }
      ] },
      { type: 'uses', items: [
        { title: 'Chỉ mức chênh lệch nhỏ', ex: 'The figure for men was slightly lower than that for women.', vi: 'Con số của nam giới thấp hơn một chút so với nữ giới.' },
        { title: 'Chỉ mức chênh lệch lớn', ex: 'Spending on health was considerably greater than spending on defence.', vi: 'Chi tiêu cho y tế lớn hơn đáng kể so với chi tiêu quốc phòng.' },
        { title: 'Gấp bao nhiêu lần', ex: 'Japan produced twice as much rice as Korea.', vi: 'Nhật Bản sản xuất lượng gạo gấp đôi Hàn Quốc.' },
        { title: 'So sánh kép để diễn tả quan hệ nhân quả', ex: 'The longer students stay online, the less they concentrate.', vi: 'Học sinh càng ở trên mạng lâu thì càng kém tập trung.' },
        { title: 'So sánh nhất kèm thứ hạng', ex: 'Tourism was the second largest source of income.', vi: 'Du lịch là nguồn thu nhập lớn thứ hai.' }
      ] },
      { type: 'table', head: ['Tính từ', 'So sánh hơn', 'So sánh nhất'], rows: [
        ['high', 'higher', 'the highest'],
        ['big', 'bigger', 'the biggest'],
        ['busy', 'busier', 'the busiest'],
        ['expensive', 'more expensive', 'the most expensive'],
        ['good / well', 'better', 'the best'],
        ['bad / badly', 'worse', 'the worst'],
        ['far', 'further / farther', 'the furthest'],
        ['little (lượng)', 'less', 'the least']
      ] },
      { type: 'signals', words: ['slightly', 'marginally', 'a little', 'much', 'far', 'considerably', 'significantly', 'substantially', 'twice as … as', 'three times as … as', 'by far the …'] },
      { type: 'tip', text: 'Tránh lặp danh từ bằng “that of / those of”: The population of Tokyo is larger than that of Paris. (that = the population).' },
      { type: 'mistake', wrong: 'The price of rice was more higher than in 2015.', right: 'The price of rice was much higher than in 2015.', why: 'Không dùng more cùng với đuôi -er. Muốn nhấn mạnh hãy dùng much/far/considerably.' },
      { type: 'mistake', wrong: 'The population of China is larger than India.', right: 'The population of China is larger than that of India.', why: 'Phải so sánh dân số với dân số, không so dân số với một quốc gia.' },
      { type: 'mistake', wrong: 'The more you practise, you will be more fluent.', right: 'The more you practise, the more fluent you will be.', why: 'So sánh kép cần cấu trúc song song: the + so sánh hơn ở cả hai vế.' },
      { type: 'ielts', text: 'Giám khảo Task 1 đánh giá cao việc so sánh có mức độ chính xác. Kết hợp so sánh hơn với trạng từ mức độ và số liệu trong ngoặc.', ex: 'Spending on rent was marginally higher in Sydney (32%) than in Melbourne (30%), but by far the highest proportion was recorded in Hong Kong.' }
    ],
    quiz: [
      { q: 'Train tickets are ___ than bus tickets.', options: ['more expensive', 'expensiver', 'most expensive', 'more expensiver'], answer: 0, explain: 'Tính từ dài dùng more + Adj.' },
      { q: 'The figure for 2020 was ___ higher than in 2019, rising from 50% to 51%.', options: ['considerably', 'slightly', 'dramatically', 'far'], answer: 1, explain: 'Chênh lệch chỉ 1% nên dùng slightly.' },
      { q: 'The ___ you read, the wider your vocabulary becomes.', options: ['much', 'most', 'more', 'many'], answer: 2, explain: 'So sánh kép: The more…, the + comparative…' },
      { q: 'Cycling is not ___ popular as walking in this town.', options: ['so', 'more', 'than', 'the most'], answer: 0, explain: 'So sánh không bằng: not as/so + Adj + as.' },
      { q: 'The unemployment rate in Spain was higher than ___ in Germany.', options: ['this', 'those', 'that', 'it'], answer: 2, explain: '“that” thay cho danh từ số ít the unemployment rate.' },
      { q: 'Electricity was ___ most common source of energy for heating.', options: ['a', 'Ø', 'the', 'an'], answer: 2, explain: 'So sánh nhất luôn đi với the.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['London is more expensive than Manchester.', 'London is expensiver than Manchester.', 'London is more expensive as Manchester.', 'London is most expensive than Manchester.'], answer: 0, explain: 'Tính từ dài: more + adj + than.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['This is the more interesting book I have ever read.', 'This is most interesting book I have ever read.', 'This is the most interesting book I have ever read.', 'This is the interestingest book I have ever read.'], answer: 2, explain: 'So sánh nhất tính từ dài: the most + adj; thường đi với I have ever V3.' },
      { q: 'Phần nào sai? Living in (A) the countryside is (B) much (C) more cheaper (D) than living in the city.', options: ['(A) the', '(B) much', '(C) more cheaper', '(D) than'], answer: 2, explain: 'cheap là tính từ ngắn → cheaper, không thêm more.' },
      { q: 'Phần nào sai? This year\'s results (A) are (B) not as (C) good (D) than last year\'s.', options: ['(A) are', '(B) not as', '(C) good', '(D) than'], answer: 3, explain: 'So sánh không bằng: not as + adj + as → sửa than thành as.' },
      { q: 'Task 1: Coal was ___ source of electricity in 1990, accounting for 45% of the total.', options: ['more important', 'most important than', 'the importantest', 'the most important'], answer: 3, explain: 'So sánh nhất tính từ dài: the most important.' },
      { q: 'Task 2: The ___ people use private cars, the worse air quality becomes.', options: ['most', 'more', 'much', 'many'], answer: 1, explain: 'So sánh kép: The more …, the + so sánh hơn …' }
    ]
  });

  G.push({
    id: 'prepositions', unit: 'words', order: 5,
    title: 'Giới từ chỉ thời gian, nơi chốn & giới từ đi kèm', en: 'Prepositions of Time & Place, Dependent Prepositions', level: 'B1', emoji: '📍',
    summary: 'Dùng in/on/at theo mức độ cụ thể của thời gian và nơi chốn, và ghi nhớ các cụm từ cố định như interested in, responsible for.',
    blocks: [
      { type: 'diagram', caption: 'Hình phễu in → on → at: càng cụ thể càng hẹp', steps: [
        { t: 'IN: tháng, năm, mùa, thế kỷ / thành phố, quốc gia', c: 'active' },
        { t: 'in 2019, in May, in the 1990s, in Hanoi', c: 'note' },
        { t: '↓ cụ thể hơn', c: 'arrow' },
        { t: 'ON: ngày, thứ, ngày lễ cụ thể / bề mặt, con phố', c: 'active' },
        { t: 'on Monday, on 5 June, on Le Loi Street', c: 'note' },
        { t: '↓ cụ thể nhất', c: 'arrow' },
        { t: 'AT: giờ, thời điểm / địa điểm chính xác', c: 'result' },
        { t: 'at 7 p.m., at night, at the station, at 25 Hang Bai', c: 'note' }
      ] },
      { type: 'formula', rows: [
        { label: 'Thời gian', parts: [ { t: 'S + V', c: 'subj' }, { t: 'in / on / at', c: 'aux' }, { t: 'mốc thời gian', c: 'time' } ], ex: 'The exam starts at 9 a.m. on Saturday.' },
        { label: 'Khoảng thời gian (Task 1)', parts: [ { t: 'S + V', c: 'subj' }, { t: 'from … to / between … and', c: 'aux' }, { t: 'năm', c: 'time' } ], ex: 'Sales rose between 2005 and 2015.' },
        { label: 'Giới từ đi kèm', parts: [ { t: 'Adj / V / N', c: 'verb' }, { t: 'giới từ cố định', c: 'aux' }, { t: 'N / V-ing', c: 'obj' } ], ex: 'Parents are responsible for teaching good manners.' }
      ] },
      { type: 'uses', items: [
        { title: 'Mô tả mức thay đổi bằng by và mức cuối bằng to', ex: 'Prices rose by 10% to $50.', vi: 'Giá tăng thêm 10% lên mức 50 đô la.' },
        { title: 'Mức đạt được: at + số liệu', ex: 'The rate peaked at 80% in 2010.', vi: 'Tỉ lệ đạt đỉnh ở mức 80% vào năm 2010.' },
        { title: 'Tính từ + giới từ', ex: 'Many students are interested in studying abroad.', vi: 'Nhiều sinh viên quan tâm đến việc du học.' },
        { title: 'Động từ + giới từ', ex: 'Success depends on hard work rather than luck.', vi: 'Thành công phụ thuộc vào sự chăm chỉ hơn là may mắn.' },
        { title: 'Danh từ + giới từ', ex: 'There has been an increase in demand for housing.', vi: 'Nhu cầu về nhà ở đã tăng lên.' }
      ] },
      { type: 'table', head: ['Nhóm', 'Cụm cố định'], rows: [
        ['Adj + in', 'interested in, involved in, rich in'],
        ['Adj + for', 'responsible for, famous for, suitable for'],
        ['Adj + of', 'aware of, capable of, afraid of, proud of'],
        ['Adj + to', 'similar to, harmful to, addicted to, accustomed to'],
        ['V + on', 'depend on, rely on, focus on, spend money on'],
        ['V + from', 'benefit from, suffer from, prevent sb from'],
        ['N + in / of / to / on', 'a rise in, a cause of, a solution to, an impact on']
      ] },
      { type: 'tip', text: 'Học giới từ theo cả cụm, đừng học riêng lẻ. Sau giới từ, động từ luôn ở dạng V-ing: interested in learning, capable of solving.' },
      { type: 'tip', text: 'Không dùng giới từ trước next/last/this/every: next week, last year, every Sunday.' },
      { type: 'mistake', wrong: 'Children can benefit a lot by playing sports.', right: 'Children can benefit a lot from playing sports.', why: '“benefit” đi với from.' },
      { type: 'mistake', wrong: 'This trend has a big influence to young people.', right: 'This trend has a big influence on young people.', why: 'influence/impact/effect + on.' },
      { type: 'mistake', wrong: 'We discussed about the problem in class.', right: 'We discussed the problem in class.', why: '“discuss” là ngoại động từ, không cần about (giống emphasise, mention).' },
      { type: 'ielts', text: 'Task 1: phân biệt rõ “rose by 5%” (tăng thêm 5 điểm) và “rose to 5%” (tăng lên mức 5%). Một giới từ sai có thể làm sai lệch toàn bộ số liệu.', ex: 'In 2000, the figure stood at 20%; it then increased by 15% to reach 35% in 2010.' }
    ],
    quiz: [
      { q: 'The conference will take place ___ 14 March.', options: ['in', 'on', 'at', 'by'], answer: 1, explain: 'Ngày cụ thể dùng on.' },
      { q: 'The figure rose ___ 20% to 30%.', options: ['by', 'at', 'from', 'in'], answer: 2, explain: 'from … to: từ mức này đến mức khác.' },
      { q: 'Governments should be responsible ___ protecting the environment.', options: ['of', 'for', 'in', 'to'], answer: 1, explain: 'responsible for + V-ing.' },
      { q: 'Smoking is harmful ___ your health.', options: ['for', 'with', 'to', 'at'], answer: 2, explain: 'harmful to sb/sth.' },
      { q: 'I usually study ___ night when it is quiet.', options: ['in', 'on', 'at', 'during'], answer: 2, explain: 'Cụm cố định: at night.' },
      { q: 'Which sentence is correct?', options: ['She is good in maths.', 'She is interested on art.', 'She is aware of the risks.', 'She is capable to win.'], answer: 2, explain: 'aware of đúng; các câu khác cần good at, interested in, capable of winning.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['The meeting is in Monday at 10 a.m.', 'The meeting is on Monday in 10 a.m.', 'The meeting is on Monday at 10 a.m.', 'The meeting is at Monday on 10 a.m.'], answer: 2, explain: 'on + thứ/ngày, at + giờ.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She is interested in environmental science.', 'She is interested on environmental science.', 'She is interested about environmental science.', 'She is interested for environmental science.'], answer: 0, explain: 'interested in là giới từ đi kèm cố định.' },
      { q: 'Phần nào sai? I was born (A) in 2001 (B) on a small village (C) in the north (D) of Vietnam.', options: ['(A) in', '(B) on', '(C) in', '(D) of'], answer: 1, explain: 'in + làng, thành phố, quốc gia → in a small village.' },
      { q: 'Phần nào sai? Many young people (A) depend (B) of their parents (C) for financial support (D) until their late twenties.', options: ['(A) depend', '(B) of', '(C) for', '(D) until'], answer: 1, explain: 'depend on sb → sửa of thành on.' },
      { q: 'Task 1: The figure rose ___ 20% to 35% between 2005 and 2015.', options: ['at', 'from', 'in', 'since'], answer: 1, explain: 'Mô tả thay đổi số liệu: rise from … to …' },
      { q: 'Task 2: Children who spend too much time online may be exposed ___ harmful content.', options: ['with', 'for', 'at', 'to'], answer: 3, explain: 'be exposed to sth là giới từ đi kèm cố định.' }
    ]
  });

  G.push({
    id: 'subject-verb-agreement', unit: 'words', order: 6,
    title: 'Sự hòa hợp chủ ngữ – động từ', en: 'Subject–Verb Agreement', level: 'B1', emoji: '🤝',
    summary: 'Động từ phải chia theo chủ ngữ thật của câu, kể cả khi chủ ngữ dài, là đại từ bất định hay được nối bằng neither…nor.',
    blocks: [
      { type: 'diagram', caption: 'Tìm chủ ngữ thật trước khi chia động từ', steps: [
        { t: 'The quality of the products ___ improved.', c: 'active' },
        { t: '↓ bỏ cụm giới từ “of the products”', c: 'arrow' },
        { t: 'The quality ___ improved.', c: 'note' },
        { t: '↓ chủ ngữ thật = quality (số ít)', c: 'arrow' },
        { t: 'The quality of the products has improved.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Đại từ bất định', parts: [ { t: 'Everyone / Nobody / Each', c: 'subj' }, { t: 'V số ít', c: 'verb' } ], ex: 'Everyone needs a sense of purpose.' },
        { label: 'A number of', parts: [ { t: 'A number of + N số nhiều', c: 'subj' }, { t: 'V số nhiều', c: 'verb' } ], ex: 'A number of schools have banned phones.' },
        { label: 'The number of', parts: [ { t: 'The number of + N số nhiều', c: 'subj' }, { t: 'V số ít', c: 'verb' } ], ex: 'The number of schools has increased.' },
        { label: 'Neither … nor', parts: [ { t: 'Neither A', c: 'subj' }, { t: 'nor', c: 'neg' }, { t: 'B', c: 'subj' }, { t: 'V chia theo B', c: 'verb' } ], ex: 'Neither the teacher nor the students were ready.' }
      ] },
      { type: 'uses', items: [
        { title: 'Chủ ngữ là V-ing hoặc mệnh đề → số ít', ex: 'Learning languages takes time.', vi: 'Học ngoại ngữ cần thời gian.' },
        { title: 'Data: số nhiều trong văn học thuật (số ít cũng được chấp nhận)', ex: 'The data show a clear upward trend.', vi: 'Số liệu cho thấy một xu hướng tăng rõ ràng.' },
        { title: 'Danh từ không đếm được → số ít', ex: 'The information on the website is outdated.', vi: 'Thông tin trên trang web đã lỗi thời.' },
        { title: 'Phân số/phần trăm: chia theo danh từ đi sau of', ex: 'Thirty per cent of the population lives in cities.', vi: 'Ba mươi phần trăm dân số sống ở thành phố.' },
        { title: 'Lượng tiền, thời gian, khoảng cách → số ít', ex: 'Ten years is a long time to wait for a house.', vi: 'Mười năm là quãng thời gian dài để chờ một căn nhà.' }
      ] },
      { type: 'table', head: ['Chủ ngữ', 'Động từ', 'Ví dụ'], rows: [
        ['everyone, somebody, nothing, each', 'số ít', 'Each student has a laptop.'],
        ['both, few, many, several', 'số nhiều', 'Both options are expensive.'],
        ['A number of + Ns', 'số nhiều', 'A number of issues remain.'],
        ['The number of + Ns', 'số ít', 'The number of issues remains high.'],
        ['news, physics, economics', 'số ít', 'The news was shocking.'],
        ['police, people', 'số nhiều', 'The police are investigating.'],
        ['A as well as B / A along with B', 'theo A', 'The manager, as well as his staff, is here.']
      ] },
      { type: 'tip', text: 'Với chủ ngữ dài, hãy gạch bỏ các cụm giới từ (of…, in…, with…) và mệnh đề quan hệ để tìm danh từ chính.' },
      { type: 'mistake', wrong: 'The number of tourists have grown rapidly.', right: 'The number of tourists has grown rapidly.', why: 'Chủ ngữ thật là “the number” (số ít).' },
      { type: 'mistake', wrong: 'Everybody want to live a happy life.', right: 'Everybody wants to live a happy life.', why: 'Đại từ bất định everybody đi với động từ số ít.' },
      { type: 'mistake', wrong: 'One of the main reasons are cost.', right: 'One of the main reasons is cost.', why: 'Chủ ngữ là “one” (số ít), không phải reasons.' },
      { type: 'ielts', text: 'Câu mở bài Task 1 rất hay mắc lỗi này. Hãy kiểm tra: the proportion of / the number of / the amount of → động từ số ít.', ex: 'The proportion of adults who smoke has fallen, while the data indicate a rise in vaping.' }
    ],
    quiz: [
      { q: 'A number of students ___ complained about the canteen food.', options: ['has', 'have', 'is', 'was'], answer: 1, explain: 'A number of + N số nhiều → động từ số nhiều.' },
      { q: 'The number of road accidents ___ fallen since 2015.', options: ['have', 'has', 'are', 'were'], answer: 1, explain: 'The number of → động từ số ít.' },
      { q: 'Neither my parents nor my sister ___ to move abroad.', options: ['want', 'wants', 'are wanting', 'have wanted'], answer: 1, explain: 'Chia theo chủ ngữ gần nhất “my sister” (số ít).' },
      { q: 'Economics ___ a popular subject at university.', options: ['are', 'is', 'were', 'have been'], answer: 1, explain: '“Economics” là tên môn học, tuy có -s nhưng là số ít.' },
      { q: 'Everyone in these villages ___ access to clean water.', options: ['need', 'needs', 'are needing', 'have needed'], answer: 1, explain: 'Everyone → động từ số ít; “in these villages” chỉ là cụm bổ nghĩa.' },
      { q: 'Sixty per cent of the respondents ___ that they exercise weekly.', options: ['says', 'say', 'is saying', 'has said'], answer: 1, explain: 'Phần trăm chia theo danh từ sau of: respondents (số nhiều).' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Everyone in the class have finished the test.', 'Everyone in the class has finished the test.', 'Everyone in the class are finished the test.', 'Everyone in the class have finish the test.'], answer: 1, explain: 'everyone là chủ ngữ số ít → has finished.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['The news are very worrying.', 'The news were very worrying.', 'The news is very worrying.', 'The news be very worrying.'], answer: 2, explain: 'news là danh từ không đếm được, dù có -s vẫn dùng động từ số ít.' },
      { q: 'Phần nào sai? The number of cars (A) on the roads (B) have (C) increased (D) dramatically.', options: ['(A) on', '(B) have', '(C) increased', '(D) dramatically'], answer: 1, explain: 'The number of + N số nhiều → động từ số ít: has increased.' },
      { q: 'Phần nào sai? One of the most serious problems (A) in big cities (B) are (C) the lack (D) of affordable housing.', options: ['(A) in', '(B) are', '(C) the lack', '(D) of'], answer: 1, explain: 'Chủ ngữ chính là One → động từ số ít is.' },
      { q: 'Task 1: A large number of people ___ unemployed in 2020.', options: ['were', 'was', 'is', 'has been'], answer: 0, explain: 'A number of + N số nhiều → động từ số nhiều; năm 2020 → quá khứ: were.' },
      { q: 'Speaking Part 1: "Which subject did you find hardest at school?" – "Mathematics ___ always been the hardest for me."', options: ['have', 'were', 'are', 'has'], answer: 3, explain: 'Tên môn học tận cùng -s (mathematics) vẫn là số ít → has.' }
    ]
  });

  /* ===================== UNIT: SENTENCES ===================== */

  G.push({
    id: 'relative-clauses', unit: 'sentences', order: 7,
    title: 'Mệnh đề quan hệ', en: 'Relative Clauses', level: 'B1', emoji: '🔗',
    summary: 'Mệnh đề quan hệ dùng who/which/that/whose/where để bổ sung thông tin cho danh từ, giúp nối hai câu đơn thành một câu phức gọn gàng.',
    blocks: [
      { type: 'diagram', caption: 'Nối hai câu đơn bằng đại từ quan hệ', steps: [
        { t: 'The city is crowded.', c: 'active' },
        { t: '+ I live in the city.', c: 'note' },
        { t: '↓ nối bằng where', c: 'arrow' },
        { t: 'The city where I live is crowded.', c: 'result' },
        { t: '↓ rút gọn mệnh đề quan hệ khác', c: 'arrow' },
        { t: 'People living in the city face high rents.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Xác định (defining)', parts: [ { t: 'N', c: 'subj' }, { t: 'who / which / that', c: 'aux' }, { t: 'V…', c: 'verb' } ], ex: 'Students who work part-time gain useful skills.' },
        { label: 'Không xác định (non-defining)', parts: [ { t: 'N,', c: 'subj' }, { t: 'who / which', c: 'aux' }, { t: 'V…,', c: 'verb' }, { t: 'phần còn lại', c: 'obj' } ], ex: 'Hanoi, which is the capital, has a population of over eight million.' },
        { label: 'Sở hữu', parts: [ { t: 'N', c: 'subj' }, { t: 'whose', c: 'aux' }, { t: 'N + V…', c: 'verb' } ], ex: 'Children whose parents read to them develop language faster.' },
        { label: 'Rút gọn', parts: [ { t: 'N', c: 'subj' }, { t: 'V-ing / V-ed', c: 'verb' }, { t: '…', c: 'obj' } ], ex: 'Products made in Vietnam are exported worldwide.' }
      ] },
      { type: 'uses', items: [
        { title: 'Who: thay cho người', ex: 'Employees who feel valued tend to stay longer.', vi: 'Nhân viên cảm thấy được trân trọng thường gắn bó lâu hơn.' },
        { title: 'Which: thay cho vật; mệnh đề không xác định có thể thay cho cả câu', ex: 'Fuel prices rose, which led to higher bus fares.', vi: 'Giá nhiên liệu tăng, điều này khiến giá vé xe buýt cao hơn.' },
        { title: 'Where/when: thay cho nơi chốn, thời gian', ex: '2008 was the year when the financial crisis began.', vi: 'Năm 2008 là năm khủng hoảng tài chính bắt đầu.' },
        { title: 'Rút gọn chủ động bằng V-ing', ex: 'Drivers using mobile phones are more likely to crash.', vi: 'Tài xế dùng điện thoại dễ gặp tai nạn hơn.' },
        { title: 'Rút gọn bị động bằng V-ed/V3', ex: 'The money raised by the event was given to charity.', vi: 'Số tiền quyên góp được từ sự kiện được trao cho từ thiện.' }
      ] },
      { type: 'table', head: ['Đặc điểm', 'Xác định', 'Không xác định'], rows: [
        ['Chức năng', 'Thông tin cần thiết để biết là ai/cái gì', 'Thông tin thêm, bỏ đi câu vẫn rõ nghĩa'],
        ['Dấu phẩy', 'Không', 'Có (hai bên)'],
        ['Dùng that', 'Được', 'Không'],
        ['Bỏ đại từ khi là tân ngữ', 'Được: the book (that) I read', 'Không'],
        ['Ví dụ', 'The bus that goes to the airport is late.', 'My father, who is a doctor, works nights.']
      ] },
      { type: 'tip', text: 'Danh từ riêng hoặc thứ duy nhất (my mother, London, the Eiffel Tower) gần như luôn đi với mệnh đề không xác định có dấu phẩy.' },
      { type: 'tip', text: 'Giới từ có thể đặt trước which/whom trong văn trang trọng: the extent to which…, the people with whom she worked.' },
      { type: 'mistake', wrong: 'Ho Chi Minh City, that is the largest city, attracts many migrants.', right: 'Ho Chi Minh City, which is the largest city, attracts many migrants.', why: 'Không dùng that trong mệnh đề quan hệ không xác định.' },
      { type: 'mistake', wrong: 'The students who they study abroad often feel homesick.', right: 'The students who study abroad often feel homesick.', why: 'Đại từ quan hệ đã làm chủ ngữ, không lặp lại they.' },
      { type: 'mistake', wrong: 'This is the village where I was born there.', right: 'This is the village where I was born.', why: '“where” đã thay cho nơi chốn, không thêm there.' },
      { type: 'ielts', text: 'Mệnh đề quan hệ là cách nhanh nhất để tạo câu phức, giúp tăng điểm Grammatical Range. Mệnh đề “which” thay cho cả câu rất hữu ích để nêu hệ quả.', ex: 'Many young people move to big cities in search of work, which puts pressure on housing and public services.' }
    ],
    quiz: [
      { q: 'The woman ___ car was stolen called the police.', options: ['who', 'whose', 'which', 'whom'], answer: 1, explain: 'Chỉ sở hữu (chiếc xe của người phụ nữ) dùng whose.' },
      { q: 'My laptop, ___ I bought last year, has already broken.', options: ['that', 'which', 'who', 'what'], answer: 1, explain: 'Mệnh đề không xác định (có dấu phẩy) dùng which, không dùng that.' },
      { q: 'This is the school ___ my mother used to teach.', options: ['which', 'when', 'where', 'whose'], answer: 2, explain: 'Thay cho nơi chốn với vai trò trạng ngữ (teach there) dùng where.' },
      { q: 'Choose the correct reduced relative clause: “Students who live on campus save money.”', options: ['Students lived on campus save money.', 'Students living on campus save money.', 'Students to live on campus save money.', 'Students are living on campus save money.'], answer: 1, explain: 'Mệnh đề chủ động rút gọn thành V-ing.' },
      { q: 'The rules ___ by the government were unpopular.', options: ['introducing', 'introduced', 'which introduced', 'were introduced'], answer: 1, explain: 'Nghĩa bị động (được chính phủ ban hành) rút gọn bằng V3.' },
      { q: 'House prices doubled, ___ made it hard for young couples to buy a home.', options: ['that', 'what', 'which', 'it'], answer: 2, explain: '“which” thay cho cả mệnh đề phía trước, sau dấu phẩy.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['The man which lives next door is a doctor.', 'The man who he lives next door is a doctor.', 'The man whom lives next door is a doctor.', 'The man who lives next door is a doctor.'], answer: 3, explain: 'who thay cho người làm chủ ngữ; không lặp lại đại từ he.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Hanoi, that is the capital of Vietnam, is famous for its street food.', 'Hanoi, which is the capital of Vietnam, is famous for its street food.', 'Hanoi, where is the capital of Vietnam, is famous for its street food.', 'Hanoi, which it is the capital of Vietnam, is famous for its street food.'], answer: 1, explain: 'Mệnh đề không xác định (có dấu phẩy) dùng which, không dùng that.' },
      { q: 'Phần nào sai? The student (A) whose essay won the prize (B) is (C) from Da Nang, (D) that is in central Vietnam.', options: ['(A) whose', '(B) is', '(C) from', '(D) that'], answer: 3, explain: 'Sau dấu phẩy (mệnh đề không xác định) không dùng that → sửa thành which.' },
      { q: 'Phần nào sai? People (A) who (B) smokes (C) regularly are (D) more likely to develop lung disease.', options: ['(A) who', '(B) smokes', '(C) regularly', '(D) more likely'], answer: 1, explain: 'who thay cho people (số nhiều) → động từ số nhiều smoke.' },
      { q: 'Task 1 (bản đồ): The map shows the area ___ a new shopping centre is planned.', options: ['which', 'where', 'who', 'whose'], answer: 1, explain: 'where thay cho nơi chốn, theo sau là mệnh đề đầy đủ.' },
      { q: 'Task 2: Parents ___ children spend too much time on screens should set clear limits.', options: ['who', 'which', 'whom', 'whose'], answer: 3, explain: 'whose + danh từ chỉ sở hữu (con cái của các phụ huynh).' }
    ]
  });

  G.push({
    id: 'noun-clauses', unit: 'sentences', order: 8,
    title: 'Mệnh đề danh từ', en: 'Noun Clauses', level: 'B2', emoji: '📦',
    summary: 'Mệnh đề danh từ bắt đầu bằng that, what, whether/if hoặc từ để hỏi, đóng vai trò như một danh từ: chủ ngữ, tân ngữ hoặc bổ ngữ.',
    blocks: [
      { type: 'diagram', caption: 'Biến một câu hỏi thành mệnh đề danh từ', steps: [
        { t: 'Why do people move to cities?', c: 'active' },
        { t: '↓ đặt vào câu lớn', c: 'arrow' },
        { t: 'It is unclear ___.', c: 'note' },
        { t: '↓ bỏ trợ động từ, đưa về trật tự câu khẳng định', c: 'arrow' },
        { t: 'It is unclear why people move to cities.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Làm tân ngữ', parts: [ { t: 'S', c: 'subj' }, { t: 'V (think / believe / know)', c: 'verb' }, { t: 'that', c: 'aux' }, { t: 'S + V', c: 'obj' } ], ex: 'Experts believe that the trend will continue.' },
        { label: 'Làm chủ ngữ', parts: [ { t: 'What / Whether / That', c: 'aux' }, { t: 'S + V', c: 'subj' }, { t: 'V (số ít)', c: 'verb' }, { t: '…', c: 'obj' } ], ex: 'What young people need is practical experience.' },
        { label: 'Câu hỏi gián tiếp', parts: [ { t: 'S', c: 'subj' }, { t: 'V (ask / wonder / explain)', c: 'verb' }, { t: 'wh- / whether', c: 'aux' }, { t: 'S + V', c: 'obj' } ], ex: 'Researchers asked whether the policy had worked.' }
      ] },
      { type: 'uses', items: [
        { title: 'That: nêu một sự thật, quan điểm', ex: 'Many people argue that university should be free.', vi: 'Nhiều người cho rằng đại học nên miễn phí.' },
        { title: 'What = the thing(s) that', ex: 'What surprised me most was the cost of living.', vi: 'Điều làm tôi ngạc nhiên nhất là chi phí sinh hoạt.' },
        { title: 'Whether/if: câu hỏi có/không gián tiếp', ex: 'It is debatable whether homework improves results.', vi: 'Việc bài tập về nhà có cải thiện kết quả hay không vẫn còn gây tranh cãi.' },
        { title: 'Wh-: câu hỏi thông tin gián tiếp', ex: 'The chart shows how much money was spent on each item.', vi: 'Biểu đồ cho thấy bao nhiêu tiền đã được chi cho mỗi mục.' },
        { title: 'It + be + Adj + that (chủ ngữ giả)', ex: 'It is essential that children learn to swim.', vi: 'Việc trẻ em học bơi là điều thiết yếu.' }
      ] },
      { type: 'table', head: ['Từ mở đầu', 'Dùng khi', 'Ví dụ'], rows: [
        ['that', 'nêu sự thật/ý kiến (thường bỏ được khi làm tân ngữ)', 'I think (that) it is fair.'],
        ['what', 'cái/điều mà', 'This is what we need.'],
        ['whether / if', 'có hay không (chỉ whether làm chủ ngữ hoặc sau giới từ)', 'It depends on whether it rains.'],
        ['who / where / when / why / how', 'thông tin cụ thể', 'Nobody knows where he went.']
      ] },
      { type: 'tip', text: 'Mệnh đề danh từ luôn theo trật tự câu khẳng định: S + V. Không đảo trợ động từ như trong câu hỏi trực tiếp.' },
      { type: 'tip', text: 'Mở bài Task 2 hiệu quả: “It is often argued that…”, “Whether … is a matter of debate.”' },
      { type: 'mistake', wrong: 'I do not know where does she live.', right: 'I do not know where she lives.', why: 'Câu hỏi gián tiếp dùng trật tự khẳng định, không có does.' },
      { type: 'mistake', wrong: 'The thing what I like most is the weather.', right: 'What I like most is the weather. / The thing that I like most is the weather.', why: '“what” đã bao gồm nghĩa “the thing that”, không dùng sau danh từ.' },
      { type: 'mistake', wrong: 'That he passed the exam surprised everyone was.', right: 'That he passed the exam surprised everyone.', why: 'Mệnh đề danh từ làm chủ ngữ chỉ cần một động từ chính (surprised).' },
      { type: 'ielts', text: 'Mệnh đề danh từ giúp trình bày quan điểm khách quan, học thuật trong Task 2, đặc biệt với cấu trúc chủ ngữ giả It.', ex: 'It is widely accepted that regular exercise reduces stress; what remains unclear is how much exercise is actually needed.' }
    ],
    quiz: [
      { q: 'Can you tell me ___?', options: ['where is the library', 'where the library is', 'where does the library', 'the library where is'], answer: 1, explain: 'Câu hỏi gián tiếp: wh- + S + V.' },
      { q: '___ we need now is a long-term solution.', options: ['That', 'Which', 'What', 'Whether'], answer: 2, explain: 'What = the thing that, làm chủ ngữ.' },
      { q: 'It is uncertain ___ the project will be finished on time.', options: ['whether', 'what', 'which', 'that if'], answer: 0, explain: 'Câu hỏi có/không gián tiếp dùng whether.' },
      { q: 'The table shows ___ people spent on food.', options: ['how much did', 'how much', 'how many', 'what did'], answer: 1, explain: '“how much” + S + V (money không đếm được), không đảo trợ động từ.' },
      { q: 'Scientists agree ___ climate change is caused by human activity.', options: ['what', 'that', 'whether', 'which'], answer: 1, explain: 'Nêu một quan điểm/sự thật dùng that.' },
      { q: 'The decision depends on ___ the council approves the budget.', options: ['if', 'whether', 'that', 'what'], answer: 1, explain: 'Sau giới từ (on) chỉ dùng whether, không dùng if.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I don\'t know where he lives.', 'I don\'t know where does he live.', 'I don\'t know where he does live.', 'I don\'t know where lives he.'], answer: 0, explain: 'Mệnh đề danh từ dùng trật tự câu khẳng định: where + S + V.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['What he said were surprising.', 'What did he say was surprising.', 'What he said was surprising.', 'Which he said was surprising.'], answer: 2, explain: 'Mệnh đề What làm chủ ngữ coi là số ít → was; không đảo ngữ.' },
      { q: 'Phần nào sai? Nobody (A) knows (B) exactly (C) how many people (D) will they attend the event.', options: ['(A) knows', '(B) exactly', '(C) how many', '(D) will they'], answer: 3, explain: 'Mệnh đề danh từ không đảo ngữ và không thêm they → how many people will attend.' },
      { q: 'Phần nào sai? Scientists (A) are still unsure (B) whether (C) is the treatment (D) effective or not.', options: ['(A) are still', '(B) whether', '(C) is the treatment', '(D) effective'], answer: 2, explain: 'Sau whether dùng trật tự khẳng định → whether the treatment is effective.' },
      { q: 'Task 2: It is often argued ___ university education should be free for everyone.', options: ['what', 'that', 'which', 'whether that'], answer: 1, explain: 'It is argued that + mệnh đề: that giới thiệu mệnh đề danh từ.' },
      { q: 'Speaking Part 1: "What do you like about your job?" – "___ I enjoy most is meeting new people."', options: ['That', 'Which', 'It', 'What'], answer: 3, explain: 'What = the thing that, làm chủ ngữ cho is.' }
    ]
  });

  G.push({
    id: 'adverbial-clauses', unit: 'sentences', order: 9,
    title: 'Mệnh đề trạng ngữ & từ nối', en: 'Adverbial Clauses & Linking', level: 'B1', emoji: '🧩',
    summary: 'Phân biệt từ nối đi với mệnh đề (although, because, so that, whereas) và từ nối đi với danh từ/V-ing (despite, because of, in order to).',
    blocks: [
      { type: 'sort', caption: 'Sau từ nối là mệnh đề (S + V) hay cụm danh từ/động từ?', groups: [
        { title: '+ S + V (mệnh đề)', emoji: '🧱', items: ['although', 'even though', 'because', 'since', 'so that', 'whereas', 'while'] },
        { title: '+ N / V-ing', emoji: '🔹', items: ['despite', 'in spite of', 'because of', 'due to', 'owing to', 'instead of'] },
        { title: '+ V nguyên mẫu', emoji: '🎯', items: ['in order to', 'so as to', 'to'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Nhượng bộ (mệnh đề)', parts: [ { t: 'Although', c: 'aux' }, { t: 'S + V,', c: 'subj' }, { t: 'S + V', c: 'verb' } ], ex: 'Although the city is expensive, it offers many opportunities.' },
        { label: 'Nhượng bộ (cụm)', parts: [ { t: 'Despite', c: 'aux' }, { t: 'N / V-ing,', c: 'obj' }, { t: 'S + V', c: 'verb' } ], ex: 'Despite the high cost, many people choose to live there.' },
        { label: 'Mục đích', parts: [ { t: 'S + V', c: 'subj' }, { t: 'so that', c: 'aux' }, { t: 'S + can / will + V', c: 'verb' } ], ex: 'Schools open early so that parents can go to work.' },
        { label: 'Mục đích (cụm)', parts: [ { t: 'S + V', c: 'subj' }, { t: 'in order to', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'People save in order to buy a house.' }
      ] },
      { type: 'uses', items: [
        { title: 'Nguyên nhân: because + mệnh đề / because of + danh từ', ex: 'Flights were cancelled because of the storm.', vi: 'Các chuyến bay bị hủy vì cơn bão.' },
        { title: 'Tương phản hai đối tượng: whereas/while', ex: 'Men preferred football, whereas women preferred swimming.', vi: 'Nam giới thích bóng đá, trong khi nữ giới thích bơi lội.' },
        { title: 'Mục đích phủ định: so as not to / so that … won\'t', ex: 'She left early so as not to miss the train.', vi: 'Cô ấy đi sớm để không lỡ chuyến tàu.' },
        { title: 'Despite the fact that + mệnh đề', ex: 'Despite the fact that it was raining, the match went ahead.', vi: 'Mặc dù trời mưa, trận đấu vẫn diễn ra.' },
        { title: 'Thời gian: when/once/as soon as + hiện tại cho tương lai', ex: 'Once students graduate, they will need to find jobs.', vi: 'Khi sinh viên tốt nghiệp, họ sẽ cần tìm việc.' }
      ] },
      { type: 'table', head: ['Ý nghĩa', '+ Mệnh đề', '+ N / V-ing', 'Trạng từ nối (đầu câu)'], rows: [
        ['Nhượng bộ', 'although, even though', 'despite, in spite of', 'However, Nevertheless,'],
        ['Nguyên nhân', 'because, since, as', 'because of, due to', '–'],
        ['Kết quả', 'so (giữa câu)', '–', 'Therefore, As a result,'],
        ['Tương phản', 'whereas, while', 'unlike', 'In contrast, On the other hand,'],
        ['Mục đích', 'so that', 'in order to / so as to + V', '–']
      ] },
      { type: 'tip', text: 'However/Therefore là trạng từ, không nối được hai mệnh đề bằng dấu phẩy. Dùng dấu chấm hoặc chấm phẩy: Prices rose; however, demand remained high.' },
      { type: 'mistake', wrong: 'Although it was expensive, but many people bought it.', right: 'Although it was expensive, many people bought it.', why: 'Tiếng Việt nói “Mặc dù… nhưng…”, còn tiếng Anh không dùng although và but trong cùng một câu.' },
      { type: 'mistake', wrong: 'Despite he was tired, he kept working.', right: 'Despite being tired, he kept working. / Although he was tired, he kept working.', why: 'Despite + N/V-ing, không theo sau bởi mệnh đề.' },
      { type: 'mistake', wrong: 'Because of the traffic is heavy, I was late.', right: 'Because the traffic was heavy, I was late.', why: 'because of + danh từ; because + mệnh đề.' },
      { type: 'ielts', text: 'Coherence and Cohesion đánh giá cả độ chính xác của từ nối. Đa dạng hóa: although/despite cho nhượng bộ, whereas cho so sánh trong Task 1, so that/in order to cho giải pháp trong Task 2.', ex: 'Governments should invest in public transport so that fewer people rely on private cars, although this will require significant funding.' }
    ],
    quiz: [
      { q: '___ the heavy rain, the festival was a success.', options: ['Although', 'Despite', 'Because', 'Even though'], answer: 1, explain: 'Theo sau là cụm danh từ (the heavy rain) nên dùng Despite.' },
      { q: 'She studied hard ___ she could get a scholarship.', options: ['in order to', 'so that', 'because of', 'despite'], answer: 1, explain: 'Theo sau là mệnh đề S + could + V nên dùng so that.' },
      { q: 'Exports rose in Brazil, ___ they fell in Argentina.', options: ['whereas', 'despite', 'because of', 'in order to'], answer: 0, explain: 'Tương phản hai đối tượng, theo sau là mệnh đề: whereas.' },
      { q: 'The match was postponed ___ bad weather.', options: ['because', 'because of', 'although', 'so that'], answer: 1, explain: '“bad weather” là cụm danh từ nên dùng because of.' },
      { q: 'Which sentence is correct?', options: ['Although he is rich, but he is unhappy.', 'Despite he is rich, he is unhappy.', 'Although he is rich, he is unhappy.', 'In spite he is rich, he is unhappy.'], answer: 2, explain: 'Although + mệnh đề, không kèm but.' },
      { q: 'Many people cycle to work ___ save money.', options: ['so that', 'in order to', 'because', 'due to'], answer: 1, explain: 'Theo sau là động từ nguyên mẫu save: in order to.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Although it was raining, but we went out.', 'Although it was raining, we went out.', 'Despite it was raining, we went out.', 'Although raining, but we went out.'], answer: 1, explain: 'Although không đi cùng but; Despite không đi với mệnh đề.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Despite of the high cost, many people buy organic food.', 'Although the high cost, many people buy organic food.', 'Despite the cost is high, many people buy organic food.', 'Despite the high cost, many people buy organic food.'], answer: 3, explain: 'Despite + danh từ (không có of); Although + mệnh đề.' },
      { q: 'Phần nào sai? (A) Because of the price of fuel (B) rose, (C) many airlines (D) increased their fares.', options: ['(A) Because of', '(B) rose', '(C) many', '(D) increased'], answer: 0, explain: 'Theo sau là mệnh đề (the price … rose) → dùng Because, không dùng Because of.' },
      { q: 'Phần nào sai? She saved money (A) every month (B) so that she (C) can (D) buy a car the following year.', options: ['(A) every', '(B) so that', '(C) can', '(D) buy'], answer: 2, explain: 'Mệnh đề chính ở quá khứ → so that + could: so that she could buy.' },
      { q: 'Task 2: ___ technology has made life easier, it has also created new problems.', options: ['Although', 'Despite', 'Because', 'In spite of'], answer: 0, explain: 'Hai ý tương phản, theo sau là mệnh đề → Although.' },
      { q: 'Speaking Part 1: "Why did you choose your university?" – "I chose it ___ it has an excellent engineering department."', options: ['because of', 'despite', 'because', 'although'], answer: 2, explain: 'Chỉ nguyên nhân, theo sau là mệnh đề → because.' }
    ]
  });

  G.push({
    id: 'complex-sentences', unit: 'sentences', order: 10,
    title: 'Câu phức cho IELTS Writing band 7+', en: 'Complex Sentences for Band 7+', level: 'B2', emoji: '🏗️',
    summary: 'Kết hợp câu đơn thành câu phức chính xác, đồng thời tránh hai lỗi lớn: câu chạy dài (run-on) và câu cụt (fragment).',
    blocks: [
      { type: 'diagram', caption: 'Nâng cấp ba câu đơn thành một câu phức', steps: [
        { t: 'Online learning is cheap.', c: 'active' },
        { t: '+ It is flexible.', c: 'note' },
        { t: '+ It lacks face-to-face interaction.', c: 'note' },
        { t: '↓ gộp tính từ + nhượng bộ + mệnh đề quan hệ', c: 'arrow' },
        { t: 'Although online learning, which is both cheap and flexible, appeals to many students, it lacks face-to-face interaction.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Câu ghép', parts: [ { t: 'Mệnh đề 1', c: 'subj' }, { t: ', and / but / so / yet', c: 'aux' }, { t: 'mệnh đề 2', c: 'verb' } ], ex: 'Cars are convenient, but they cause pollution.' },
        { label: 'Câu phức', parts: [ { t: 'Liên từ phụ thuộc', c: 'aux' }, { t: 'mệnh đề phụ,', c: 'subj' }, { t: 'mệnh đề chính', c: 'verb' } ], ex: 'If cities plant more trees, air quality will improve.' },
        { label: 'Câu ghép – phức', parts: [ { t: 'Mệnh đề phụ,', c: 'subj' }, { t: 'mệnh đề chính', c: 'verb' }, { t: '; however,', c: 'aux' }, { t: 'mệnh đề chính', c: 'obj' } ], ex: 'While taxes fund services, they reduce income; however, most people accept them.' }
      ] },
      { type: 'uses', items: [
        { title: 'Mệnh đề điều kiện để đưa ra giải pháp', ex: 'Unless stricter laws are introduced, plastic waste will keep rising.', vi: 'Nếu không ban hành luật nghiêm hơn, rác thải nhựa sẽ tiếp tục tăng.' },
        { title: 'Cụm phân từ mở đầu câu', ex: 'Having lived abroad, she understands different cultures.', vi: 'Vì đã từng sống ở nước ngoài, cô ấy hiểu các nền văn hóa khác nhau.' },
        { title: 'Mệnh đề quan hệ để bổ sung bằng chứng', ex: 'Finland, whose schools set little homework, ranks highly in education.', vi: 'Phần Lan, nơi trường học giao ít bài tập về nhà, xếp hạng cao về giáo dục.' },
        { title: 'Mệnh đề nhượng bộ để thể hiện lập luận cân bằng', ex: 'Even though tourism creates jobs, it can damage local culture.', vi: 'Mặc dù du lịch tạo ra việc làm, nó có thể gây hại cho văn hóa địa phương.' },
        { title: 'Kết hợp hai đến ba loại mệnh đề, không quá dài', ex: 'When people work from home, they save time that would otherwise be spent commuting.', vi: 'Khi làm việc tại nhà, mọi người tiết kiệm được thời gian lẽ ra phải dành cho việc đi lại.' }
      ] },
      { type: 'table', head: ['Lỗi', 'Ví dụ sai', 'Cách sửa'], rows: [
        ['Run-on (hai mệnh đề không có từ nối)', 'Prices rose people stopped buying.', 'Prices rose, so people stopped buying.'],
        ['Comma splice (nối bằng dấu phẩy)', 'Many people work late, this is unhealthy.', 'Many people work late, which is unhealthy.'],
        ['Fragment (thiếu mệnh đề chính)', 'Because the city is crowded.', 'Because the city is crowded, many people move out.'],
        ['Fragment (thiếu động từ)', 'The reason for this problem.', 'The reason for this problem is a lack of funding.'],
        ['Câu quá dài, mất kiểm soát', '4–5 mệnh đề nối liên tiếp', 'Tách thành 2 câu, mỗi câu 1–2 mệnh đề phụ']
      ] },
      { type: 'tip', text: 'Band 7 yêu cầu “a variety of complex structures” và “frequent error-free sentences”. Một câu phức đúng có giá trị hơn ba câu phức sai, nên hãy đa dạng nhưng kiểm soát được.' },
      { type: 'tip', text: 'Mỗi đoạn thân bài nên có: một câu chủ đề rõ ràng, một câu phức có mệnh đề nhượng bộ hoặc điều kiện, và một câu có mệnh đề quan hệ hoặc cụm phân từ.' },
      { type: 'mistake', wrong: 'Social media connects people, however it can also cause loneliness.', right: 'Social media connects people; however, it can also cause loneliness.', why: '“however” không phải liên từ; nối bằng dấu phẩy tạo thành lỗi comma splice.' },
      { type: 'mistake', wrong: 'For example, the government in Singapore. It has reduced traffic.', right: 'For example, the government in Singapore has reduced traffic.', why: 'Câu đầu là fragment vì không có động từ chính.' },
      { type: 'mistake', wrong: 'Which is the reason why I disagree.', right: 'This is the reason why I disagree.', why: 'Câu bắt đầu bằng Which mà không gắn với mệnh đề chính là câu cụt.' },
      { type: 'ielts', text: 'Giám khảo đánh giá Grammatical Range and Accuracy dựa trên tỉ lệ câu phức không lỗi. Viết xong, hãy đọc lại từng câu: có đủ chủ ngữ + động từ chính chưa? Hai mệnh đề đã có từ nối chưa?', ex: 'Although public transport is often cheaper, many commuters, who value privacy and flexibility, continue to drive, which worsens congestion in city centres.' }
    ],
    quiz: [
      { q: 'Which sentence is a run-on?', options: ['The bus was late, so I walked.', 'The bus was late I walked.', 'Because the bus was late, I walked.', 'I walked because the bus was late.'], answer: 1, explain: 'Hai mệnh đề độc lập nối liền nhau không có từ nối hay dấu câu.' },
      { q: 'Which is a fragment?', options: ['Although many people disagree.', 'Many people disagree.', 'Although many people disagree, I support it.', 'I support it, though many disagree.'], answer: 0, explain: 'Chỉ có mệnh đề phụ mà thiếu mệnh đề chính.' },
      { q: 'Choose the best way to combine: “Fast food is cheap. It is unhealthy.”', options: ['Fast food is cheap, it is unhealthy.', 'Fast food is cheap however unhealthy.', 'Although fast food is cheap, it is unhealthy.', 'Fast food is cheap, despite it is unhealthy.'], answer: 2, explain: 'Although + mệnh đề phụ, mệnh đề chính: đúng ngữ pháp và rõ nghĩa tương phản.' },
      { q: 'Choose the correct punctuation.', options: ['Costs rose, therefore, sales fell.', 'Costs rose; therefore, sales fell.', 'Costs rose therefore sales fell.', 'Costs rose, therefore sales, fell.'], answer: 1, explain: 'Trạng từ nối therefore cần dấu chấm phẩy (hoặc dấu chấm) trước và dấu phẩy sau.' },
      { q: '___ in a big city, he is used to noise.', options: ['Having grown up', 'He grew up', 'Grown up', 'He has grown up'], answer: 0, explain: 'Cụm phân từ hoàn thành diễn tả hành động xảy ra trước, cùng chủ ngữ he.' },
      { q: 'Fix the comma splice: “Many students work part-time, this affects their grades.”', options: ['…part-time, it affects their grades.', '…part-time, which affects their grades.', '…part-time, however affects their grades.', '…part-time this affects their grades.'], answer: 1, explain: '“which” biến vế sau thành mệnh đề quan hệ không xác định, nối hợp lệ.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Having finish the report, she sent it to her manager.', 'Finished the report, she sent it to her manager.', 'Having finished the report, she sent it to her manager.', 'Having finished the report, it was sent to her manager.'], answer: 2, explain: 'Having + V3 diễn tả hành động xảy ra trước; chủ ngữ của mệnh đề chính (she) phải là người thực hiện.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['While many people enjoy city life, but others prefer the peace of the countryside.', 'While many people enjoy city life, others prefer the peace of the countryside.', 'While many people enjoying city life, others prefer the peace of the countryside.', 'Many people while enjoy city life, others prefer the peace of the countryside.'], answer: 1, explain: 'While (tương phản) + mệnh đề, không dùng thêm but.' },
      { q: 'Phần nào sai? (A) Walking along the street, (B) a car (C) almost (D) hit me.', options: ['(A) Walking', '(B) a car', '(C) almost', '(D) hit'], answer: 1, explain: 'Lỗi chủ ngữ treo: người đi bộ là I, không phải a car → Walking along the street, I was almost hit by a car.' },
      { q: 'Phần nào sai? The government (A) has introduced a new tax, (B) it (C) aims (D) to reduce sugar consumption.', options: ['(A) has introduced', '(B) it', '(C) aims', '(D) to reduce'], answer: 1, explain: 'Hai mệnh đề nối bằng dấu phẩy là lỗi → dùng đại từ quan hệ: …a new tax, which aims to…' },
      { q: 'Task 2: Online learning offers flexibility; ___, it may reduce face-to-face interaction.', options: ['although', 'despite', 'however', 'because'], answer: 2, explain: 'Sau dấu chấm phẩy, trước dấu phẩy dùng trạng từ nối however.' },
      { q: 'Task 1: Coal consumption fell sharply, ___ only 10% of total energy use by 2020.', options: ['accounting for', 'accounted for', 'which accounting for', 'was accounting for'], answer: 0, explain: 'Mệnh đề phân từ V-ing bổ sung kết quả cho mệnh đề trước: accounting for.' }
    ]
  });

  G.push({
    id: 'inversion-cleft', unit: 'sentences', order: 11,
    title: 'Đảo ngữ & câu chẻ để nhấn mạnh', en: 'Inversion & Cleft Sentences', level: 'C1', emoji: '🔄',
    summary: 'Dùng đảo ngữ sau trạng từ phủ định (Not only, Rarely, Never) và câu chẻ (It is…that, What…is) để nhấn mạnh ý quan trọng.',
    blocks: [
      { type: 'diagram', caption: 'Từ câu thường đến câu đảo ngữ', steps: [
        { t: 'Pollution harms health and damages the economy.', c: 'active' },
        { t: '↓ đưa Not only lên đầu câu', c: 'arrow' },
        { t: 'Not only + trợ động từ + S + V …', c: 'note' },
        { t: '↓ thêm trợ động từ does', c: 'arrow' },
        { t: 'Not only does pollution harm health, but it also damages the economy.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Đảo ngữ phủ định', parts: [ { t: 'Rarely / Never / Seldom', c: 'neg' }, { t: 'aux', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V…', c: 'verb' } ], ex: 'Rarely do teenagers read printed books.' },
        { label: 'Not only…but also', parts: [ { t: 'Not only', c: 'neg' }, { t: 'aux + S + V,', c: 'aux' }, { t: 'but', c: 'adv' }, { t: 'S + also + V', c: 'verb' } ], ex: 'Not only is cycling cheap, but it is also healthy.' },
        { label: 'Câu chẻ It', parts: [ { t: 'It is / was', c: 'aux' }, { t: 'phần nhấn mạnh', c: 'obj' }, { t: 'that / who', c: 'adv' }, { t: 'S + V…', c: 'subj' } ], ex: 'It is the government that should fund research.' },
        { label: 'Câu chẻ What', parts: [ { t: 'What', c: 'aux' }, { t: 'S + V', c: 'subj' }, { t: 'is / was', c: 'verb' }, { t: 'phần nhấn mạnh', c: 'obj' } ], ex: 'What cities need is better public transport.' }
      ] },
      { type: 'uses', items: [
        { title: 'Never/Rarely/Seldom + trợ động từ', ex: 'Never before have so many people worked from home.', vi: 'Chưa bao giờ có nhiều người làm việc tại nhà đến vậy.' },
        { title: 'Only when / Only after / Not until: đảo ở mệnh đề chính', ex: 'Only when the factory closed did residents notice the cleaner air.', vi: 'Chỉ khi nhà máy đóng cửa, cư dân mới nhận ra không khí trong lành hơn.' },
        { title: 'Under no circumstances / In no way', ex: 'Under no circumstances should children be left alone online.', vi: 'Trong mọi trường hợp, không nên để trẻ em một mình trên mạng.' },
        { title: 'It is…that: nhấn mạnh một thành phần cụ thể', ex: 'It was in 2015 that sales reached their peak.', vi: 'Chính vào năm 2015, doanh số đạt đỉnh.' },
        { title: 'What…is: nhấn mạnh ý chính của lập luận', ex: 'What worries me most is the lack of green space.', vi: 'Điều khiến tôi lo lắng nhất là sự thiếu hụt không gian xanh.' }
      ] },
      { type: 'table', head: ['Mở đầu', 'Cấu trúc', 'Ví dụ'], rows: [
        ['Not only', 'Not only + aux + S + V, but … also', 'Not only does it save time, but it also saves money.'],
        ['Rarely / Seldom', '+ aux + S + V', 'Seldom do we see such growth.'],
        ['Hardly … when', 'Hardly + had + S + V3 + when …', 'Hardly had the shop opened when it sold out.'],
        ['No sooner … than', 'No sooner + had + S + V3 + than …', 'No sooner had the law passed than prices fell.'],
        ['Only by', 'Only by + V-ing + aux + S + V', 'Only by working together can we solve this.'],
        ['Not until', 'Not until + mốc/mệnh đề + aux + S + V', 'Not until 2010 did the trend reverse.']
      ] },
      { type: 'signals', words: ['Not only', 'Never', 'Rarely', 'Seldom', 'Hardly', 'No sooner', 'Only when', 'Only by', 'Not until', 'Under no circumstances', 'It is … that', 'What … is'] },
      { type: 'tip', text: 'Đảo ngữ rất mạnh, chỉ nên dùng 1–2 lần trong một bài Task 2 (thường ở mở bài hoặc kết luận). Dùng quá nhiều khiến bài viết thiếu tự nhiên.' },
      { type: 'mistake', wrong: 'Not only pollution harms health, but also damages the economy.', right: 'Not only does pollution harm health, but it also damages the economy.', why: 'Khi Not only đứng đầu câu phải đảo trợ động từ lên trước chủ ngữ.' },
      { type: 'mistake', wrong: 'Rarely people walk to work in this city.', right: 'Rarely do people walk to work in this city.', why: 'Sau Rarely ở đầu câu cần trợ động từ do/does/did trước chủ ngữ.' },
      { type: 'mistake', wrong: 'What we need it is more teachers.', right: 'What we need is more teachers.', why: 'Mệnh đề What… đã làm chủ ngữ, không thêm it.' },
      { type: 'ielts', text: 'Một câu đảo ngữ hoặc câu chẻ đúng ở kết luận giúp bài viết nổi bật và thể hiện phạm vi ngữ pháp rộng, nhưng chỉ khi dùng chính xác.', ex: 'Only by investing in renewable energy can governments ensure a sustainable future; what is required now is political will rather than new technology.' }
    ],
    quiz: [
      { q: 'Rarely ___ such a dramatic increase in house prices.', options: ['we have seen', 'have we seen', 'we saw', 'saw we'], answer: 1, explain: 'Rarely đầu câu → đảo trợ động từ: have we seen.' },
      { q: 'Not only ___ expensive, but it is also inefficient.', options: ['the system is', 'is the system', 'does the system', 'the system does'], answer: 1, explain: 'Với động từ be, đảo trực tiếp be lên trước chủ ngữ.' },
      { q: 'It was the teachers ___ organised the charity event.', options: ['which', 'who', 'what', 'whom'], answer: 1, explain: 'Câu chẻ nhấn mạnh người làm chủ ngữ dùng who (hoặc that).' },
      { q: '___ the public needs is reliable information.', options: ['That', 'It', 'What', 'Which'], answer: 2, explain: 'Câu chẻ What…is: What the public needs is…' },
      { q: 'No sooner ___ the announcement than the shares rose.', options: ['had they made', 'they had made', 'did they make', 'they made'], answer: 0, explain: 'No sooner + had + S + V3 + than.' },
      { q: 'Only after the accident ___ the dangers of the road.', options: ['people realised', 'did people realise', 'people did realise', 'realised people'], answer: 1, explain: 'Only after + mốc → đảo ngữ ở mệnh đề chính: did people realise.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Never I have seen such a beautiful sunset.', 'Never have I seen such a beautiful sunset.', 'Never I saw such a beautiful sunset.', 'Never have I saw such a beautiful sunset.'], answer: 1, explain: 'Đảo ngữ với Never: Never + trợ động từ + S + V3.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['It was my mother which taught me to cook.', 'It were my mother who taught me to cook.', 'It was my mother whom taught me to cook.', 'It was my mother who taught me to cook.'], answer: 3, explain: 'Câu chẻ nhấn mạnh người: It was + người + who + V.' },
      { q: 'Phần nào sai? Not only (A) the city is (B) polluted, but it (C) is also (D) overcrowded.', options: ['(A) the city is', '(B) polluted', '(C) is also', '(D) overcrowded'], answer: 0, explain: 'Not only đứng đầu câu cần đảo ngữ → Not only is the city polluted…' },
      { q: 'Phần nào sai? (A) What I need (B) most (C) are a quiet place (D) to study.', options: ['(A) What', '(B) most', '(C) are', '(D) to study'], answer: 2, explain: 'Câu chẻ với What làm chủ ngữ dùng động từ số ít → is.' },
      { q: 'Task 2: Only by investing in public transport ___ reduce traffic congestion.', options: ['governments can', 'do governments can', 'can governments', 'governments could to'], answer: 2, explain: 'Only by + V-ing đứng đầu câu → đảo ngữ: can governments reduce.' },
      { q: 'Speaking Part 1: "What do you like most about your hometown?" – "___ the people that make it special – they\'re so welcoming."', options: ['It\'s', 'There are', 'They are', 'What is'], answer: 0, explain: 'Câu chẻ: It is + phần nhấn mạnh + that/who …' }
    ]
  });
})(typeof self !== 'undefined' ? self : this);
