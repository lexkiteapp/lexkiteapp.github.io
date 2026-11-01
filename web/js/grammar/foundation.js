/* Ngữ pháp – Nền tảng (tự biên soạn) */
(function (g) {
  const G = g.GRAMMAR = g.GRAMMAR || [];

  /* 1. Parts of speech & sentence patterns */
  G.push({
    id: 'parts-of-speech-patterns', unit: 'foundation', order: 1,
    title: 'Từ loại & 5 mẫu câu cơ bản', en: 'Parts of Speech & Basic Sentence Patterns', level: 'A2', emoji: '🧩',
    summary: 'Nhận diện danh từ, động từ, tính từ, trạng từ và lắp chúng vào 5 mẫu câu gốc của tiếng Anh: S+V, S+V+O, S+V+C, S+V+O+O, S+V+O+C.',
    blocks: [
      { type: 'sort', caption: 'Bốn từ loại chính – mỗi từ loại đứng ở một vị trí riêng trong câu', groups: [
        { title: 'Danh từ (Noun)', emoji: '📦', items: ['economy', 'pollution', 'student', 'decision', 'growth'] },
        { title: 'Động từ (Verb)', emoji: '🏃', items: ['rise', 'reduce', 'become', 'consider', 'offer'] },
        { title: 'Tính từ (Adjective)', emoji: '🎨', items: ['urban', 'affordable', 'significant', 'harmful', 'reliable'] },
        { title: 'Trạng từ (Adverb)', emoji: '⚡', items: ['rapidly', 'slightly', 'often', 'clearly', 'well'] }
      ] },
      { type: 'formula', rows: [
        { label: 'S + V (nội động từ)', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: '(trạng từ)', c: 'adv' } ], ex: '[[Unemployment]] [[fell]] [[sharply]].' },
        { label: 'S + V + O', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: '[[The]] council built [[a]] new library.' },
        { label: 'S + V + C (động từ nối)', parts: [ { t: 'S', c: 'subj' }, { t: 'be / become / seem / look', c: 'verb' }, { t: 'C (tính từ / danh từ)', c: 'obj' } ], ex: 'Housing has become [[extremely]] [[expensive]].' },
        { label: 'S + V + O + O', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'O (người)', c: 'obj' }, { t: 'O (vật)', c: 'obj' } ], ex: 'The [[scholarship]] gave her a [[chance]] to study abroad.' },
        { label: 'S + V + O + C', parts: [ { t: 'S', c: 'subj' }, { t: 'make / find / keep / consider', c: 'verb' }, { t: 'O', c: 'obj' }, { t: 'C', c: 'adv' } ], ex: 'Many people find city life [[stressful]].' }
      ] },
      { type: 'uses', items: [
        { title: 'S + V: hành động không cần tân ngữ (rise, fall, happen, arrive)', ex: 'The number of tourists rose [[steadily]].', vi: 'Số lượng khách du lịch tăng đều đặn.' },
        { title: 'S + V + O: hành động tác động lên người/vật', ex: 'Factories produce a [[huge]] amount of waste.', vi: 'Các nhà máy thải ra một lượng rác khổng lồ.' },
        { title: 'S + V + C: động từ nối + tính từ (KHÔNG dùng trạng từ)', ex: 'The results seem [[promising]].', vi: 'Kết quả có vẻ đầy hứa hẹn.' },
        { title: 'S + V + O + O: give, send, offer, show, teach, lend', ex: 'My tutor showed me a [[better]] way to plan essays.', vi: 'Gia sư chỉ cho tôi một cách lập dàn ý bài luận tốt hơn.' },
        { title: 'S + V + O + C: làm cho / cho rằng ai, cái gì thế nào', ex: 'Technology has made communication [[instant]].', vi: 'Công nghệ đã khiến việc liên lạc trở nên tức thì.' }
      ] },
      { type: 'table', head: ['Từ loại', 'Vị trí thường gặp', 'Ví dụ'], rows: [
        ['Danh từ', 'sau a/the/my, làm chủ ngữ hoặc tân ngữ', 'the growth of cities'],
        ['Động từ', 'sau chủ ngữ', 'Cities grow quickly.'],
        ['Tính từ', 'trước danh từ, sau be/become/seem', 'rapid growth / Growth is rapid.'],
        ['Trạng từ', 'bổ nghĩa cho động từ, tính từ, cả câu', 'grow rapidly / extremely rapid']
      ] },
      { type: 'tip', text: 'Động từ nối (be, become, seem, look, sound, feel, taste, remain, get) đi với TÍNH TỪ, không đi với trạng từ: look happy, remain stable, sound interesting.' },
      { type: 'tip', text: 'Câu tiếng Anh luôn cần chủ ngữ và động từ chia. Tiếng Việt có thể nói "Ở Hà Nội có nhiều hồ", nhưng tiếng Anh phải là "There are many lakes in Hanoi" hoặc "Hanoi has many lakes".' },
      { type: 'mistake', wrong: 'In my hometown has a famous market.', right: 'My hometown has a famous market. / There is a famous market in my hometown.', why: 'Cụm giới từ (In my hometown) không làm chủ ngữ được; câu thiếu chủ ngữ thật.' },
      { type: 'mistake', wrong: 'She explained me the answer.', right: 'She explained the answer to me.', why: 'Explain, describe, suggest không theo mẫu S + V + O + O; phải dùng to + người.' },
      { type: 'mistake', wrong: 'The air in big cities is very pollution.', right: 'The air in big cities is very polluted.', why: 'Sau be + very cần tính từ (polluted), không phải danh từ (pollution).' },
      { type: 'ielts', text: 'Trong Writing Task 1, mẫu S + V + trạng từ (rose sharply) và S + V + C (remained stable) xuất hiện liên tục. Trong Task 2, mẫu S + V + O + C (make something affordable / consider something essential) giúp câu gọn mà vẫn học thuật.', ex: 'Subsidies could make electric cars [[affordable]] for ordinary families.' }
    ],
    quiz: [
      { q: 'The new policy has made public transport much ___.', options: ['cheaply', 'cheaper', 'cheapness', 'cheapen'], answer: 1, explain: 'Mẫu S + V + O + C: make + tân ngữ + tính từ → cheaper. cheaply là trạng từ; cheapness là danh từ; cheapen là động từ.' },
      { q: '"The lecturer gave us a reading list." thuộc mẫu câu nào?', options: ['S + V + O', 'S + V + C', 'S + V + O + O', 'S + V + O + C'], answer: 2, explain: 'Gave có hai tân ngữ: us (người) và a reading list (vật). Câu có hai tân ngữ (us, a reading list) nên không phải S+V+O, S+V+C hay S+V+O+C.' },
      { q: 'The price of oil ___ dramatically last year.', options: ['rose', 'raised', 'was risen', 'rised'], answer: 0, explain: 'Rise là nội động từ (S + V), quá khứ là rose. Raise là ngoại động từ, cần tân ngữ nên raised sai; "was risen" sai vì rise không có bị động; "rised" sai dạng.' },
      { q: 'After the speaking test, the candidates looked ___.', options: ['relieve', 'relievedly', 'relief', 'relieved'], answer: 3, explain: 'Look là động từ nối → theo sau là tính từ relieved. relieve là động từ; relievedly là trạng từ; relief là danh từ.' },
      { q: 'Many scientists consider plastic waste ___ threats to marine life.', options: ['the greatest', 'one of the greatest', 'greatest', 'the greatly'], answer: 1, explain: 'Danh từ số nhiều threats → one of the greatest + N số nhiều; đây là bổ ngữ cho tân ngữ. "the greatest" không hợp với danh từ số nhiều threats; "greatest" thiếu the; "the greatly" sai dạng.' },
      { q: 'Online courses offer ___ more flexibility than traditional classes.', options: ['to learners', 'learners', 'for learners to', 'learners to'], answer: 1, explain: 'Offer + người + vật (S + V + O + O): offer learners more flexibility. "to learners" đặt sai trật tự khi có hai tân ngữ; "for learners to" và "learners to" sai cấu trúc.' },
      { q: 'Câu nào đúng?', options: ['The situation became worsely.', 'She explained me the problem.', 'The committee elected her chair.', 'They discussed about the issue.'], answer: 2, explain: 'Elect + O + C là mẫu đúng. Became + tính từ (worse); explain sth to sb; discuss không đi với about.' },
      { q: 'Câu nào đúng?', options: ['In my country has many festivals.', 'The film made me to cry.', 'He seems happily today.', 'Governments should make healthcare affordable.'], answer: 3, explain: 'Make + O + tính từ là đúng. Các câu khác: thiếu chủ ngữ, make sb do (không to), seem + tính từ.' },
      { q: 'Câu nào đúng?', options: ['Smartphones have made our lives easier.', 'Smartphones have made our lives more easily.', 'Smartphones have made easier our lives.', 'Smartphones made our lives to be easier.'], answer: 0, explain: 'Make + O + C (tính từ so sánh) theo đúng trật tự: made our lives easier. "more easily" là trạng từ; "made easier our lives" sai trật tự; "to be easier" thừa to be.' },
      { q: 'Phần nào sai? "The manager (A) explained (B) us (C) the new rules (D)."', options: ['The manager', 'explained', 'us', 'the new rules'], answer: 2, explain: 'Explain không có hai tân ngữ: explained the new rules to us. The manager, explained (khi có to us đi kèm) và the new rules đều đúng; phần sai là us đứng ngay sau explained.' },
      { q: 'Phần nào sai? "She (A) felt (B) very (C) nervously (D) before the interview."', options: ['She', 'felt', 'very', 'nervously'], answer: 3, explain: 'feel là động từ nối → dùng tính từ nervous, nên phần sai là (D) nervously. She, felt, very đều đúng.' },
      { q: 'Phần nào sai? "In (A) Vietnam (B) has (C) many beautiful beaches (D)."', options: ['In', 'Vietnam', 'has', 'many beautiful beaches'], answer: 0, explain: 'Bỏ In để Vietnam làm chủ ngữ, hoặc viết There are many beautiful beaches in Vietnam. Vietnam, has và many beautiful beaches đều đúng khi bỏ In.' }
    ]
  });

  /* 2. Word formation */
  G.push({
    id: 'word-formation', unit: 'foundation', order: 2,
    title: 'Cấu tạo từ: hậu tố & tiền tố', en: 'Word Formation: Suffixes & Prefixes', level: 'B1', emoji: '🔧',
    summary: 'Biến một gốc từ thành danh từ, động từ, tính từ, trạng từ bằng hậu tố, và đổi nghĩa bằng tiền tố như un-, dis-, mis-, over-, re-. Kỹ năng then chốt cho dạng điền từ trong Listening và Reading.',
    blocks: [
      { type: 'diagram', caption: 'Một gốc từ – bốn từ loại', steps: [
        { t: 'Gốc: ECONOMY (danh từ – nền kinh tế)', c: 'if' },
        { t: '↓ + -ic / -ical', c: 'arrow' },
        { t: 'economic (thuộc kinh tế) · economical (tiết kiệm)', c: 'result' },
        { t: '↓ + -ally', c: 'arrow' },
        { t: 'economically (về mặt kinh tế)', c: 'result' },
        { t: '↓ + -ise', c: 'arrow' },
        { t: 'economize (tiết kiệm, động từ)', c: 'result' },
        { t: 'Chọn dạng nào phụ thuộc VỊ TRÍ trong câu', c: 'note' }
      ] },
      { type: 'formula', rows: [
        { label: 'Danh từ', parts: [ { t: 'gốc từ', c: 'verb' }, { t: '-tion / -ment / -ness / -ity / -ance', c: 'obj' } ], ex: 'develop → [[development]]; aware → [[awareness]]' },
        { label: 'Tính từ', parts: [ { t: 'gốc từ', c: 'verb' }, { t: '-al / -ful / -less / -ive / -able / -ous', c: 'adv' } ], ex: 'environment → [[environmental]]; harm → [[harmful]]' },
        { label: 'Trạng từ', parts: [ { t: 'tính từ', c: 'adv' }, { t: '-ly', c: 'time' } ], ex: 'significant → [[significantly]]' },
        { label: 'Động từ', parts: [ { t: 'gốc từ', c: 'obj' }, { t: '-ise / -en / -ify', c: 'verb' } ], ex: 'modern → [[modernize]]; wide → [[widen]]; simple → [[simplify]]' },
        { label: 'Tiền tố đổi nghĩa', parts: [ { t: 'un- / dis- / mis- / over- / re-', c: 'neg' }, { t: 'gốc từ (giữ nguyên từ loại)', c: 'verb' } ], ex: 'employed → [[unemployed]]; estimate → [[overestimate]]' }
      ] },
      { type: 'uses', items: [
        { title: 'Sau mạo từ / tính từ / giới từ → danh từ', ex: 'There has been a sharp [[reduction]] in crime.', vi: 'Tỷ lệ tội phạm đã giảm mạnh.' },
        { title: 'Trước danh từ hoặc sau be → tính từ', ex: 'Public transport is not always [[reliable]].', vi: 'Giao thông công cộng không phải lúc nào cũng đáng tin cậy.' },
        { title: 'Bổ nghĩa cho động từ / tính từ → trạng từ', ex: 'Prices increased [[considerably]] in 2022.', vi: 'Giá cả tăng đáng kể vào năm 2022.' },
        { title: 'Tiền tố phủ định: un-, in-, im-, ir-, il-, dis-', ex: 'It is [[irresponsible]] to drive after drinking.', vi: 'Lái xe sau khi uống rượu là thiếu trách nhiệm.' },
        { title: 'Tiền tố mang nghĩa khác: mis- (sai), over- (quá), under- (dưới mức), re- (lại)', ex: 'Many students [[underestimate]] the writing test.', vi: 'Nhiều thí sinh đánh giá thấp bài thi viết.' }
      ] },
      { type: 'table', head: ['Hậu tố / Tiền tố', 'Tạo ra', 'Ví dụ'], rows: [
        ['-tion, -sion', 'danh từ (từ động từ)', 'pollute → pollution, decide → decision'],
        ['-ment', 'danh từ', 'invest → investment, govern → government'],
        ['-ness, -ity', 'danh từ (từ tính từ)', 'happy → happiness, able → ability'],
        ['-er, -or, -ist', 'danh từ chỉ người', 'employ → employer, science → scientist'],
        ['-al, -ive, -ous, -ful', 'tính từ', 'nation → national, effect → effective'],
        ['-able, -ible', 'tính từ (có thể…)', 'afford → affordable, access → accessible'],
        ['-ise / -ify / -en', 'động từ', 'urban → urbanize, pure → purify, short → shorten'],
        ['un- / dis- / in- / im-', 'phủ định', 'unfair, dishonest, inefficient, impossible'],
        ['mis- / over- / under- / re-', 'sai / quá / thiếu / lại', 'misunderstand, overpopulated, underpaid, rebuild']
      ] },
      { type: 'tip', text: 'Gặp chỗ trống, hãy hỏi: trước nó là gì, sau nó là gì? a/the/my + ___ → danh từ; be/seem + ___ → tính từ; ___ + động từ hoặc đứng cuối câu sau động từ → thường là trạng từ.' },
      { type: 'tip', text: 'Im- thường đứng trước p/m (impossible, immature), il- trước l (illegal), ir- trước r (irrelevant). Còn lại phần lớn dùng un- hoặc in-.' },
      { type: 'mistake', wrong: 'The government should invest more money in educate.', right: 'The government should invest more money in education.', why: 'Sau giới từ in cần danh từ (education), không phải động từ.' },
      { type: 'mistake', wrong: 'This is a very economy car.', right: 'This is a very economical car.', why: 'Trước danh từ car cần tính từ; economical = tiết kiệm nhiên liệu (economic = thuộc về kinh tế).' },
      { type: 'mistake', wrong: 'Many young people are unemployment.', right: 'Many young people are unemployed.', why: 'Sau are cần tính từ unemployed; unemployment là danh từ (tình trạng thất nghiệp).' },
      { type: 'ielts', text: 'Listening và Reading thường yêu cầu điền ĐÚNG dạng từ – sai một hậu tố là mất điểm. Trong Writing, biến đổi từ loại giúp paraphrase: "pollution has increased" → "the environment has become increasingly polluted".', ex: 'Rapid [[urbanization]] has made cities [[increasingly]] crowded.' }
    ],
    quiz: [
      { q: 'The ___ of new factories has created thousands of jobs.', options: ['construct', 'constructive', 'construction', 'constructively'], answer: 2, explain: 'Sau The và trước of cần danh từ → construction. construct là động từ; constructive là tính từ; constructively là trạng từ.' },
      { q: 'Cycling is an ___ way to reduce air pollution.', options: ['effect', 'effective', 'effectively', 'effectiveness'], answer: 1, explain: 'Trước danh từ way cần tính từ → effective. effect là danh từ/động từ; effectively là trạng từ; effectiveness là danh từ.' },
      { q: 'The cost of living has risen ___ over the past decade.', options: ['significantly', 'significant', 'significance', 'signify'], answer: 0, explain: 'Bổ nghĩa cho động từ has risen → trạng từ significantly. significant là tính từ; significance là danh từ; signify là động từ.' },
      { q: 'Some cities have become seriously ___, with too many people and too few homes.', options: ['populated', 'overpopulated', 'underpopulated', 'repopulated'], answer: 1, explain: 'too many people → quá đông dân: tiền tố over- → overpopulated. populated không nói rõ "quá mức"; underpopulated là thưa dân; repopulated là đưa dân trở lại.' },
      { q: 'It is ___ to compare the two countries because their data come from different years.', options: ['fair', 'unfairly', 'unfairness', 'unfair'], answer: 3, explain: 'Sau It is cần tính từ, nghĩa phủ định (không công bằng) → unfair. fair sai nghĩa; unfairly là trạng từ; unfairness là danh từ.' },
      { q: 'Many people ___ the amount of sugar in soft drinks; it is much higher than they think.', options: ['underestimate', 'overestimate', 'misestimate', 'reestimate'], answer: 0, explain: 'Lượng đường thực tế cao hơn họ nghĩ → họ đánh giá thấp: underestimate. overestimate là đánh giá quá cao (trái nghĩa); misestimate ít dùng; reestimate là ước tính lại.' },
      { q: 'Câu nào đúng?', options: ['There has been a dramatic increasing in obesity.', 'Obesity has increased dramatic.', 'There has been a dramatic increase in obesity.', 'Obesity has dramatic increased.'], answer: 2, explain: 'Sau a + tính từ cần danh từ increase; còn nếu dùng động từ thì phải là increased dramatically.' },
      { q: 'Câu nào đúng?', options: ['Smoking in public places is illegal in many countries.', 'Smoking in public places is unlegal in many countries.', 'Smoking in public places is inlegal in many countries.', 'Smoking in public places is dislegal in many countries.'], answer: 0, explain: 'Gốc bắt đầu bằng l dùng tiền tố il- → illegal. un-, in-, dis- không đi với legal.' },
      { q: 'Câu nào đúng?', options: ['Her explain was very clear.', 'She explained the process clearly.', 'She explanation the process clear.', 'Her explanation was very clearly.'], answer: 1, explain: 'Động từ explained + trạng từ clearly. Sau was cần tính từ clear; chủ ngữ cần danh từ explanation.' },
      { q: 'Phần nào sai? "Young people (A) need more (B) financial (C) educate (D)."', options: ['Young people', 'more', 'financial', 'educate'], answer: 3, explain: 'Sau tính từ financial cần danh từ → financial education. Young people, more và financial đều đúng.' },
      { q: 'Phần nào sai? "Recycling (A) is an environmental (B) friendly (C) habit (D)."', options: ['Recycling', 'environmental', 'friendly', 'habit'], answer: 1, explain: 'Bổ nghĩa cho tính từ friendly cần trạng từ: environmentally friendly. Recycling, friendly và habit đều đúng.' },
      { q: 'Phần nào sai? "Many workers (A) feel (B) that they are (C) underpay (D)."', options: ['Many workers', 'feel', 'are', 'underpay'], answer: 3, explain: 'Sau are cần tính từ/V3: underpaid (bị trả lương thấp). Many workers, feel và are đều đúng.' }
    ]
  });

  /* 3. Pronouns */
  G.push({
    id: 'pronouns', unit: 'foundation', order: 3,
    title: 'Đại từ: nhân xưng, sở hữu, phản thân, one/ones', en: 'Pronouns', level: 'A2', emoji: '👥',
    summary: 'Chọn đúng đại từ chủ ngữ, tân ngữ, tính từ sở hữu, đại từ sở hữu và phản thân; dùng one/ones để tránh lặp danh từ.',
    blocks: [
      { type: 'sort', caption: 'Năm dạng của đại từ – xếp theo vị trí trong câu', groups: [
        { title: 'Chủ ngữ', emoji: '🙋', items: ['I', 'you', 'he', 'she', 'it', 'we', 'they'] },
        { title: 'Tân ngữ', emoji: '🎯', items: ['me', 'you', 'him', 'her', 'it', 'us', 'them'] },
        { title: 'Tính từ sở hữu (+ N)', emoji: '🏷️', items: ['my', 'your', 'his', 'her', 'its', 'our', 'their'] },
        { title: 'Đại từ sở hữu (đứng một mình)', emoji: '🎁', items: ['mine', 'yours', 'his', 'hers', 'ours', 'theirs'] },
        { title: 'Phản thân', emoji: '🪞', items: ['myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Chủ ngữ + động từ + tân ngữ', parts: [ { t: 'They', c: 'subj' }, { t: 'invited', c: 'verb' }, { t: 'us', c: 'obj' } ], ex: '[[They]] invited [[us]] to the graduation ceremony.' },
        { label: 'Tính từ sở hữu + danh từ', parts: [ { t: 'its / their', c: 'adv' }, { t: 'N', c: 'obj' } ], ex: 'The company changed [[its]] logo last year.' },
        { label: 'Đại từ sở hữu thay cho (tính từ sở hữu + N)', parts: [ { t: 'S', c: 'subj' }, { t: 'be', c: 'verb' }, { t: 'mine / theirs', c: 'obj' } ], ex: 'This laptop is [[mine]]; that one is [[hers]].' },
        { label: 'Phản thân: chủ ngữ = tân ngữ', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: '-self / -selves', c: 'obj' } ], ex: 'Children can teach [[themselves]] basic coding.' },
        { label: 'One / ones tránh lặp danh từ đếm được', parts: [ { t: 'the / a + tính từ', c: 'adv' }, { t: 'one / ones', c: 'obj' } ], ex: 'I prefer old buildings to modern [[ones]].' }
      ] },
      { type: 'uses', items: [
        { title: 'It / its cho vật, công ty, quốc gia, động vật', ex: 'The city is famous for [[its]] night markets.', vi: 'Thành phố nổi tiếng với các chợ đêm.' },
        { title: 'They / their cho số nhiều và cho "người nào đó" không rõ giới tính', ex: 'If a student is late, [[they]] cannot enter the exam room.', vi: 'Nếu thí sinh đến muộn, họ không được vào phòng thi.' },
        { title: 'Đại từ phản thân khi chủ ngữ tự tác động lên mình', ex: 'Athletes push [[themselves]] to the limit.', vi: 'Vận động viên ép bản thân đến giới hạn.' },
        { title: 'Phản thân để nhấn mạnh (chính …)', ex: 'The president [[herself]] opened the new hospital.', vi: 'Chính bà tổng thống đã khánh thành bệnh viện mới.' },
        { title: 'One / ones thay cho danh từ đã nhắc', ex: 'Small apartments are cheaper than large [[ones]].', vi: 'Căn hộ nhỏ rẻ hơn căn hộ lớn.' }
      ] },
      { type: 'table', head: ['Chủ ngữ', 'Tân ngữ', 'TT sở hữu', 'ĐT sở hữu', 'Phản thân'], rows: [
        ['I', 'me', 'my', 'mine', 'myself'],
        ['you', 'you', 'your', 'yours', 'yourself / yourselves'],
        ['he', 'him', 'his', 'his', 'himself'],
        ['she', 'her', 'her', 'hers', 'herself'],
        ['it', 'it', 'its', '—', 'itself'],
        ['we', 'us', 'our', 'ours', 'ourselves'],
        ['they', 'them', 'their', 'theirs', 'themselves']
      ] },
      { type: 'tip', text: 'Its (của nó) KHÔNG có dấu nháy; it\'s = it is / it has. Tương tự: their (của họ) ≠ there ≠ they\'re.' },
      { type: 'tip', text: 'Một số động từ KHÔNG đi với phản thân dù tiếng Việt có "bản thân": relax, feel, concentrate, meet. Nói I relaxed, không nói I relaxed myself.' },
      { type: 'mistake', wrong: 'Each country has it\'s own culture.', right: 'Each country has its own culture.', why: 'Tính từ sở hữu là its, không có dấu nháy.' },
      { type: 'mistake', wrong: 'My sister and me went to the exhibition.', right: 'My sister and I went to the exhibition.', why: 'Ở vị trí chủ ngữ dùng I, kể cả khi đi kèm người khác.' },
      { type: 'mistake', wrong: 'Parents should spend more time with theirs children.', right: 'Parents should spend more time with their children.', why: 'Trước danh từ dùng tính từ sở hữu their; theirs đứng một mình.' },
      { type: 'ielts', text: 'Trong Writing, đại từ là công cụ liên kết quan trọng (cohesion): dùng it, they, this, these, one để tránh lặp từ. Nhưng phải rõ ràng đại từ chỉ cái gì, nếu không giám khảo sẽ trừ điểm Coherence & Cohesion.', ex: 'Some cities ban cars from [[their]] centers. [[This]] policy reduces pollution, but [[it]] can hurt local shops.' }
    ],
    quiz: [
      { q: 'The university has increased ___ tuition fees by 10%.', options: ['it\'s', 'its', 'their\'s', 'it'], answer: 1, explain: 'Tính từ sở hữu của it là its (không có dấu nháy). it\'s = it is; "their\'s" sai chính tả; it là đại từ, không đứng trước danh từ.' },
      { q: 'Between you and ___, I think the test was harder than last year.', options: ['I', 'myself', 'me', 'mine'], answer: 2, explain: 'Sau giới từ between dùng đại từ tân ngữ → between you and me. I là chủ ngữ; myself là phản thân; mine là đại từ sở hữu.' },
      { q: 'Teenagers often compare ___ with celebrities on social media.', options: ['themselves', 'them', 'theirs', 'their'], answer: 0, explain: 'Chủ ngữ và tân ngữ là cùng người (teenagers) → đại từ phản thân themselves. them chỉ người khác; theirs và their là dạng sở hữu.' },
      { q: 'My essay was shorter than ___, but it got a higher score.', options: ['her', 'she', 'herself', 'hers'], answer: 3, explain: 'Thay cho her essay → đại từ sở hữu hers. her phải đi kèm danh từ; she là chủ ngữ; herself là phản thân.' },
      { q: 'These shoes are too tight. Do you have any bigger ___?', options: ['one', 'ones', 'it', 'them'], answer: 1, explain: 'Thay cho danh từ số nhiều shoes → ones. one thay cho số ít; it và them không dùng sau tính từ bigger.' },
      { q: 'I didn\'t need help; I fixed the printer ___.', options: ['myself', 'me', 'mine', 'my'], answer: 0, explain: 'Đại từ phản thân nhấn mạnh "tự mình" → myself. me, mine, my không mang nghĩa tự làm lấy.' },
      { q: 'Câu nào đúng?', options: ['Me and my friends often go cycling.', 'The decision was their\'s.', 'Every employee should bring their ID card.', 'She enjoyed herself the party.'], answer: 2, explain: 'They/their có thể dùng cho every employee. Các câu khác: My friends and I; theirs; enjoyed herself at the party.' },
      { q: 'Câu nào đúng?', options: ['I usually relax myself by reading.', 'I usually relax by reading.', 'I usually relax me by reading.', 'I usually relax mine by reading.'], answer: 1, explain: 'relax thường không đi với đại từ phản thân → I usually relax by reading. relax myself/me/mine đều không tự nhiên hoặc sai.' },
      { q: 'Câu nào đúng?', options: ['A friend of me works in Sydney.', 'A friend of my works in Sydney.', 'A friend of myself works in Sydney.', 'A friend of mine works in Sydney.'], answer: 3, explain: 'Cấu trúc a friend of + đại từ sở hữu: a friend of mine. me, my và myself không dùng sau "a friend of".' },
      { q: 'Phần nào sai? "The company (A) moved (B) it\'s (C) headquarters to Singapore (D)."', options: ['The company', 'moved', 'it\'s', 'headquarters to Singapore'], answer: 2, explain: 'Sở hữu dùng its; it\'s = it is, nên phần sai là (C). The company, moved, headquarters đều đúng.' },
      { q: 'Phần nào sai? "Him (A) and his brother (B) started (C) their own business (D)."', options: ['Him', 'and his brother', 'started', 'their own business'], answer: 0, explain: 'Vị trí chủ ngữ cần đại từ chủ ngữ He, không phải Him, nên phần sai là (A). and his brother, started, their own business đều đúng.' },
      { q: 'Phần nào sai? "I prefer (A) printed books to (B) electronic one (C) because they are easier on the eyes (D)."', options: ['I prefer', 'to', 'electronic one', 'because they are easier on the eyes'], answer: 2, explain: 'Thay cho books (số nhiều) phải dùng ones: electronic ones. I prefer, to và because they are easier on the eyes đều đúng.' }
    ]
  });

  /* 4. Determiners */
  G.push({
    id: 'determiners', unit: 'foundation', order: 4,
    title: 'Từ hạn định: this/that, some/any, each/every, both/either, other', en: 'Determiners', level: 'B1', emoji: '👉',
    summary: 'Dùng đúng các từ đứng trước danh từ: this/that/these/those, some/any/no, each/every, all/both/either/neither, another/other/the other.',
    blocks: [
      { type: 'diagram', caption: 'Chọn another / other / the other(s)', steps: [
        { t: 'Danh từ phía sau số ít hay số nhiều?', c: 'if' },
        { t: 'Số ít, "thêm một cái bất kỳ" → ANOTHER + N: another option', c: 'result' },
        { t: 'Số ít, "cái còn lại duy nhất" → THE OTHER + N: the other hand', c: 'result' },
        { t: '↓ Số nhiều', c: 'arrow' },
        { t: 'Không xác định → OTHER + Ns: other countries', c: 'result' },
        { t: 'Tất cả phần còn lại → THE OTHER + Ns / THE OTHERS', c: 'result' },
        { t: 'Không có danh từ phía sau → another / others / the other / the others', c: 'note' }
      ] },
      { type: 'formula', rows: [
        { label: 'Each / every + N số ít', parts: [ { t: 'Each / Every', c: 'adv' }, { t: 'N số ít', c: 'subj' }, { t: 'V số ít', c: 'verb' } ], ex: '[[Every candidate]] receives a score report.' },
        { label: 'Both / all + N số nhiều', parts: [ { t: 'Both / All (of the)', c: 'adv' }, { t: 'N số nhiều', c: 'subj' }, { t: 'V số nhiều', c: 'verb' } ], ex: '[[Both]] options have advantages.' },
        { label: 'Either / neither + N số ít', parts: [ { t: 'Either / Neither', c: 'adv' }, { t: 'N số ít', c: 'subj' }, { t: 'V số ít', c: 'verb' } ], ex: '[[Neither]] solution is perfect.' },
        { label: 'Câu phủ định / câu hỏi', parts: [ { t: 'S', c: 'subj' }, { t: 'don\'t', c: 'neg' }, { t: 'V', c: 'verb' }, { t: 'any + N', c: 'obj' } ], ex: 'We don\'t have [[any]] data for 2015.' },
        { label: 'No = not any', parts: [ { t: 'There is / are', c: 'verb' }, { t: 'no', c: 'neg' }, { t: 'N', c: 'obj' } ], ex: 'There were [[no]] female engineers in 1990.' }
      ] },
      { type: 'uses', items: [
        { title: 'This/these (gần, hiện tại) – that/those (xa, quá khứ)', ex: 'These days, [[few]] people send letters; in those days, [[everyone]] did.', vi: 'Ngày nay ít người gửi thư; hồi đó thì ai cũng gửi.' },
        { title: 'Some trong câu khẳng định và lời mời; any trong câu phủ định / câu hỏi', ex: 'Would you like [[some]] advice? – I don\'t need [[any]], thanks.', vi: 'Bạn có cần lời khuyên không? – Không cần đâu, cảm ơn.' },
        { title: 'Each: từng cái riêng lẻ (thường nhóm nhỏ); every: tất cả, nhìn chung', ex: '[[Each]] student gives a short presentation; [[every]] class lasts 90 minutes.', vi: 'Mỗi học sinh thuyết trình ngắn; mọi lớp học đều kéo dài 90 phút.' },
        { title: 'Both (cả hai) – either (một trong hai) – neither (không cái nào trong hai)', ex: 'You can take [[either]] bus; [[both]] go to the city center.', vi: 'Bạn có thể đi xe buýt nào cũng được; cả hai đều tới trung tâm.' },
        { title: 'Another / other / the other', ex: '[[One]] advantage is cost; [[another]] is convenience.', vi: 'Một ưu điểm là chi phí; một ưu điểm khác là sự tiện lợi.' }
      ] },
      { type: 'table', head: ['Từ', 'Đi với', 'Ví dụ'], rows: [
        ['each / every', 'N đếm được số ít + V số ít', 'every household'],
        ['all', 'N số nhiều / không đếm được', 'all students, all information'],
        ['both', 'N số nhiều (2 thứ)', 'both parents'],
        ['either / neither', 'N số ít (1 trong 2)', 'neither country'],
        ['some / any / no', 'N số nhiều / không đếm được', 'some money, any questions'],
        ['another', 'N số ít', 'another reason'],
        ['other', 'N số nhiều / không đếm được', 'other reasons']
      ] },
      { type: 'tip', text: 'Khi có the/my/these… phía sau, phải thêm of: all of the students, each of my friends, neither of the solutions. Each of / every one of + N số nhiều nhưng động từ vẫn số ít: Each of the rooms has a window.' },
      { type: 'tip', text: 'Every không đứng một mình, cũng không đi với of. Muốn nói "mỗi người trong số…" dùng each of hoặc every one of.' },
      { type: 'mistake', wrong: 'Every students have a laptop.', right: 'Every student has a laptop.', why: 'Every + danh từ số ít + động từ số ít.' },
      { type: 'mistake', wrong: 'There are another reasons for this trend.', right: 'There are other reasons for this trend.', why: 'Another chỉ đi với danh từ số ít; số nhiều dùng other.' },
      { type: 'mistake', wrong: 'Both of option are expensive.', right: 'Both options are expensive. / Both of the options are expensive.', why: 'Both + N số nhiều, hoặc both of + the/my + N số nhiều.' },
      { type: 'ielts', text: 'Cụm On the one hand… On the other hand… và Another / A further advantage is… là khung quen thuộc trong Task 2. Ở Task 1, each và both giúp so sánh hai biểu đồ: Both charts show…, In each country…', ex: '[[Both]] graphs show a decline in coal use, but [[neither]] country met its target.' }
    ],
    quiz: [
      { q: '___ applicant must provide two references.', options: ['All', 'Each', 'Both', 'Other'], answer: 1, explain: 'Danh từ số ít applicant → Each (mỗi). All và Both đi với danh từ số nhiều; Other (không có the) đi với danh từ số nhiều hoặc không đếm được; số ít dùng another / the other.' },
      { q: 'I have read two books on this topic, but ___ of them was useful.', options: ['neither', 'both', 'either', 'none'], answer: 0, explain: 'Hai cuốn, không cuốn nào hữu ích, động từ số ít was → neither. both cần động từ số nhiều và sai nghĩa; either mang nghĩa "một trong hai" (không phủ định); none dùng cho từ ba trở lên.' },
      { q: 'Some people prefer working from home; ___ prefer the office.', options: ['another', 'other', 'others', 'the another'], answer: 2, explain: 'Không có danh từ phía sau, số nhiều, không xác định → others. another và the another đi với số ít; other phải có danh từ theo sau.' },
      { q: 'We didn\'t receive ___ complaints about the new timetable.', options: ['some', 'no', 'every', 'any'], answer: 3, explain: 'Câu phủ định (didn\'t) → any. some dùng trong câu khẳng định; no không đi với didn\'t (phủ định kép); every đi với danh từ số ít.' },
      { q: 'I have two brothers. One is a doctor and ___ is a pilot.', options: ['another', 'the other', 'other', 'others'], answer: 1, explain: 'Chỉ có hai người, người còn lại duy nhất → the other. another dùng khi còn nhiều lựa chọn; other phải đi với danh từ; others là số nhiều.' },
      { q: 'In ___ days, people did not have refrigerators.', options: ['these', 'this', 'those', 'that'], answer: 2, explain: 'Nói về thời quá khứ, danh từ số nhiều days → in those days. these/this chỉ hiện tại; that đi với số ít.' },
      { q: 'Câu nào đúng?', options: ['Each of the students have a locker.', 'Every of the students has a locker.', 'Each of the students has a locker.', 'Each students has a locker.'], answer: 2, explain: 'Each of + the + N số nhiều + V số ít. Every không đi với of. "have" sai hòa hợp; "Every of" sai; "Each students" sai số.' },
      { q: 'Câu nào đúng?', options: ['Another option is to raise taxes.', 'Another options are to raise taxes.', 'Other option is to raise taxes.', 'The others option is to raise taxes.'], answer: 0, explain: 'Another + danh từ số ít + is → Another option is… "Another options" sai số; "Other option" thiếu mạo từ; "The others option" sai dạng.' },
      { q: 'Câu nào đúng?', options: ['All of student passed.', 'All the student passed.', 'All students passes.', 'All the students passed.'], answer: 3, explain: 'All (of) the + N số nhiều + V chia số nhiều/quá khứ. "All of student" và "All the student" sai số; "passes" sai hòa hợp và thì.' },
      { q: 'Phần nào sai? "Every (A) households (B) in the area (C) receives a recycling bin (D)."', options: ['Every', 'households', 'in the area', 'receives a recycling bin'], answer: 1, explain: 'Every + danh từ số ít → household, nên phần sai là (B). Every, in the area và receives (chia số ít) đều đúng.' },
      { q: 'Phần nào sai? "There are (A) another (B) factors that (C) affect house prices (D)."', options: ['There are', 'another', 'that', 'affect house prices'], answer: 1, explain: 'factors số nhiều → other factors, không dùng another (chỉ đi với số ít); phần sai là (B). There are, that, affect đều đúng.' },
      { q: 'Phần nào sai? "Either (A) of the two candidates (B) are (C) suitable for the job (D)."', options: ['Either', 'of the two candidates', 'are', 'suitable for the job'], answer: 2, explain: 'Either (of) đi với động từ số ít trong văn trang trọng → is. Either, of the two candidates và suitable for the job đều đúng.' }
    ]
  });

  /* 5. There is / it as empty subject */
  G.push({
    id: 'there-is-empty-it', unit: 'foundation', order: 5,
    title: 'There is/are & "it" làm chủ ngữ giả', en: 'There is / There are & Empty "it"', level: 'A2', emoji: '🏠',
    summary: 'Dùng there is/are để giới thiệu sự tồn tại của sự vật, và it làm chủ ngữ giả cho thời tiết, thời gian, khoảng cách và các cấu trúc It is + adj + to V, It takes…',
    blocks: [
      { type: 'diagram', caption: 'Đưa chủ ngữ dài ra sau bằng "it"', steps: [
        { t: 'To learn a new language as an adult is difficult.', c: 'if' },
        { t: '↓ Chủ ngữ quá dài, câu nặng đầu', c: 'arrow' },
        { t: 'It is difficult to learn a new language as an adult.', c: 'result' },
        { t: '↓ Tương tự với mệnh đề that', c: 'arrow' },
        { t: 'It is clear that the policy has failed.', c: 'result' },
        { t: 'It = chủ ngữ giả, chủ ngữ thật nằm sau', c: 'note' }
      ] },
      { type: 'formula', rows: [
        { label: 'Sự tồn tại', parts: [ { t: 'There', c: 'subj' }, { t: 'is / are / was / were / has been', c: 'verb' }, { t: 'N', c: 'obj' }, { t: '(nơi chốn / thời gian)', c: 'time' } ], ex: '[[There are]] fewer green spaces in the city than before.' },
        { label: 'Tính từ + to V', parts: [ { t: 'It', c: 'subj' }, { t: 'is', c: 'verb' }, { t: 'adj (for sb)', c: 'adv' }, { t: 'to V', c: 'obj' } ], ex: '[[It is essential for]] children to learn to swim.' },
        { label: 'Tính từ + that', parts: [ { t: 'It', c: 'subj' }, { t: 'is', c: 'verb' }, { t: 'adj', c: 'adv' }, { t: 'that + S + V', c: 'obj' } ], ex: '[[It is likely that]] prices will rise.' },
        { label: 'Thời gian cần để làm gì', parts: [ { t: 'It', c: 'subj' }, { t: 'takes', c: 'verb' }, { t: '(sb)', c: 'obj' }, { t: 'thời gian', c: 'time' }, { t: 'to V', c: 'obj' } ], ex: '[[It takes]] me an hour to get to work.' }
      ] },
      { type: 'uses', items: [
        { title: 'There is + N số ít / không đếm được; there are + N số nhiều', ex: '[[There is]] a lack of affordable housing.', vi: 'Đang thiếu nhà ở giá phải chăng.' },
        { title: 'There + các thì khác: there has been, there will be, there used to be', ex: '[[There has been]] a steady rise in online shopping.', vi: 'Mua sắm trực tuyến tăng đều.' },
        { title: 'It cho thời tiết, thời gian, khoảng cách', ex: '[[It is]] about 30 kilometers from the airport to the city.', vi: 'Từ sân bay đến thành phố khoảng 30 km.' },
        { title: 'It is + adj + (for sb) + to V', ex: '[[It is difficult for]] elderly people to use some apps.', vi: 'Người lớn tuổi thấy khó dùng một số ứng dụng.' },
        { title: 'It is said / believed / thought that… (khách quan, học thuật)', ex: '[[It is widely believed that]] exercise improves memory.', vi: 'Nhiều người tin rằng tập thể dục cải thiện trí nhớ.' }
      ] },
      { type: 'table', head: ['Muốn nói', 'Dùng', 'Ví dụ'], rows: [
        ['Có cái gì ở đâu', 'There is / are', 'There are two parks near my house.'],
        ['Thời tiết', 'It is …', 'It is very humid in summer.'],
        ['Mất bao lâu', 'It takes (sb) + time + to V', 'It took us two years to save enough.'],
        ['Đánh giá một hành động', 'It is + adj + to V', 'It is wise to book tickets in advance.'],
        ['Ý kiến chung', 'It is believed / said that…', 'It is said that the castle is haunted.']
      ] },
      { type: 'tip', text: 'Động từ sau there chia theo danh từ ĐẦU TIÊN đứng sau: There is a desk and two chairs. / There are two chairs and a desk.' },
      { type: 'tip', text: 'Câu "Có nhiều người…" tiếng Việt → There are many people who… hoặc Many people… Đừng dùng "It has" hay "Have" để nói "có".' },
      { type: 'mistake', wrong: 'In my city have many parks.', right: 'There are many parks in my city.', why: 'Tiếng Anh dùng There are để nói "có"; không dùng have khi không có chủ ngữ.' },
      { type: 'mistake', wrong: 'Is important to protect the environment.', right: 'It is important to protect the environment.', why: 'Câu tiếng Anh bắt buộc có chủ ngữ; dùng it làm chủ ngữ giả.' },
      { type: 'mistake', wrong: 'There is many reasons for this.', right: 'There are many reasons for this.', why: 'Reasons số nhiều → there are.' },
      { type: 'ielts', text: 'Task 1: There was a sharp rise in… là cách paraphrase cho "X rose sharply". Task 2: It is often argued that… / It is undeniable that… mở bài khách quan. Speaking: It takes me about… khi nói về thói quen đi lại.', ex: '[[There was]] a dramatic increase in the number of electric vehicles sold after 2020.' }
    ],
    quiz: [
      { q: '___ a significant drop in sales in the third quarter.', options: ['It was', 'There was', 'There were', 'It had'], answer: 1, explain: 'Giới thiệu sự tồn tại, a drop số ít → There was. It was không dùng để nói "có"; There were chia số nhiều; It had sai cấu trúc.' },
      { q: '___ me three months to prepare for the exam.', options: ['It took', 'There took', 'I took', 'It takes to'], answer: 0, explain: 'Diễn đạt thời gian cần để làm gì: It takes/took + sb + thời gian + to V → It took. There took và I took sai cấu trúc (I took cần "to prepare" khác nghĩa); "It takes to" thừa to và sai thì.' },
      { q: 'It is important ___ students to get enough sleep.', options: ['to', 'of', 'that', 'for'], answer: 3, explain: 'It is + tính từ + for sb + to V → important for students to get enough sleep. to và of không đi với important + sb trong cấu trúc này; that cần mệnh đề (that students get…).' },
      { q: '___ widely accepted that smoking causes cancer.', options: ['There is', 'This is', 'It is', 'They are'], answer: 2, explain: 'Cấu trúc khách quan It is + V3 + that… → It is widely accepted that… There is, This is, They are không đi với cấu trúc này.' },
      { q: 'There ___ a lot of traffic on the roads this morning.', options: ['were', 'was', 'have', 'had'], answer: 1, explain: 'traffic không đếm được → There was. were chia số nhiều; have/had không dùng sau There để nói "có".' },
      { q: '___ used to be a cinema in this street, but it closed.', options: ['There', 'It', 'Here', 'They'], answer: 0, explain: 'There used to be = trước đây đã từng có → There used to be a cinema. It, Here, They không dùng trong cấu trúc này.' },
      { q: 'Câu nào đúng?', options: ['Is very hot in Ho Chi Minh City.', 'It is very hot in Ho Chi Minh City.', 'There is very hot in Ho Chi Minh City.', 'Ho Chi Minh City has very hot.'], answer: 1, explain: 'Nói về thời tiết dùng it làm chủ ngữ giả → It is very hot. Câu tiếng Anh cần chủ ngữ (Is very hot sai); There is không dùng cho thời tiết; "has very hot" sai cấu trúc.' },
      { q: 'Câu nào đúng?', options: ['There have been many changes in my town.', 'It has been many changes in my town.', 'There has many changes in my town.', 'My town have been many changes.'], answer: 0, explain: 'There have been + N số nhiều (hiện tại hoàn thành). "It has been" không dùng để nói "có"; "There has many" sai; "My town have been" sai cấu trúc.' },
      { q: 'Câu nào đúng?', options: ['It is difficult understand his accent.', 'It is difficult to understanding his accent.', 'His accent is difficult to understand it.', 'It is difficult to understand his accent.'], answer: 3, explain: 'It is + adj + to V nguyên mẫu; không lặp it ở cuối. "difficult understand" thiếu to; "to understanding" sai dạng; câu 3 thừa it.' },
      { q: 'Phần nào sai? "There is (A) several (B) ways to (C) solve this problem (D)."', options: ['There is', 'several', 'to', 'solve this problem'], answer: 0, explain: 'several ways là số nhiều → There are, nên phần sai là (A). several, to, solve this problem đều đúng.' },
      { q: 'Phần nào sai? "It takes (A) about two hours (B) for drive (C) to the coast (D)."', options: ['It takes', 'about two hours', 'for drive', 'to the coast'], answer: 2, explain: 'It takes + thời gian + to V → phải là "to drive", không dùng "for drive". It takes, about two hours và to the coast đều đúng.' },
      { q: 'Phần nào sai? "In the past (A), it had (B) very few cars (C) in my village (D)."', options: ['In the past', 'it had', 'very few cars', 'in my village'], answer: 1, explain: 'Nói "có" dùng there were, không dùng it had, nên phần sai là (B). In the past, very few cars, in my village đều đúng.' }
    ]
  });

  /* 6. Questions */
  G.push({
    id: 'questions', unit: 'foundation', order: 6,
    title: 'Câu hỏi: Yes/No, Wh-, chủ ngữ – tân ngữ, câu hỏi gián tiếp', en: 'Questions', level: 'A2', emoji: '❓',
    summary: 'Đặt câu hỏi đúng trật tự: đảo trợ động từ lên trước chủ ngữ, phân biệt câu hỏi về chủ ngữ (không đảo) và câu hỏi gián tiếp lịch sự (không đảo).',
    blocks: [
      { type: 'diagram', caption: 'Từ câu khẳng định đến câu hỏi', steps: [
        { t: 'She works in a hospital.', c: 'if' },
        { t: '↓ Thêm trợ động từ does, đưa lên trước chủ ngữ', c: 'arrow' },
        { t: 'Does she work in a hospital? (Yes/No)', c: 'result' },
        { t: '↓ Thêm từ để hỏi ở đầu', c: 'arrow' },
        { t: 'Where does she work?', c: 'result' },
        { t: '↓ Lồng vào câu khác → trật tự câu kể', c: 'arrow' },
        { t: 'Could you tell me where she works?', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Yes/No', parts: [ { t: 'Aux / be', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: '…?', c: 'obj' } ], ex: '[[Have you ever lived]] abroad?' },
        { label: 'Wh- hỏi tân ngữ / trạng ngữ', parts: [ { t: 'Wh-', c: 'adv' }, { t: 'Aux', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' } ], ex: '[[What did you study]] at university?' },
        { label: 'Wh- hỏi chủ ngữ (không trợ động từ)', parts: [ { t: 'Who / What', c: 'subj' }, { t: 'V (chia)', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: '[[Who invented]] the telephone?' },
        { label: 'Câu hỏi gián tiếp', parts: [ { t: 'Do you know / Could you tell me', c: 'aux' }, { t: 'Wh- / if', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' } ], ex: 'Do you know [[what time the library opens]]?' }
      ] },
      { type: 'uses', items: [
        { title: 'Yes/No: dùng do/does/did, be, have hoặc động từ khuyết thiếu', ex: '[[Can you describe]] your hometown?', vi: 'Bạn có thể mô tả quê hương mình không?' },
        { title: 'Wh-: what, where, when, why, how, which, whose, how often, how long', ex: '[[How often do you use]] public transport?', vi: 'Bạn đi phương tiện công cộng bao lâu một lần?' },
        { title: 'Câu hỏi chủ ngữ: who/what làm chủ ngữ → không dùng do/does/did', ex: '[[What happened]] after the meeting?', vi: 'Chuyện gì đã xảy ra sau cuộc họp?' },
        { title: 'Câu hỏi tân ngữ: có trợ động từ', ex: '[[Who did the manager promote]]?', vi: 'Người quản lý đã thăng chức cho ai?' },
        { title: 'Câu hỏi gián tiếp: lịch sự, không đảo, không dùng do', ex: 'I wonder [[whether the museum is open]] on Mondays.', vi: 'Không biết bảo tàng có mở cửa vào thứ Hai không.' }
      ] },
      { type: 'table', head: ['Loại', 'Ví dụ', 'Ghi chú'], rows: [
        ['Hỏi chủ ngữ', 'Who called you?', 'Who = người gọi, không có did'],
        ['Hỏi tân ngữ', 'Who did you call?', 'you = người gọi, có did'],
        ['Trực tiếp', 'Where is the station?', 'đảo be lên trước'],
        ['Gián tiếp', 'Can you tell me where the station is?', 'trật tự câu kể'],
        ['Gián tiếp Yes/No', 'I\'d like to know if the course is free.', 'dùng if / whether']
      ] },
      { type: 'tip', text: 'Giới từ thường đứng cuối câu hỏi trong tiếng Anh tự nhiên: Who are you waiting for? What is it made of? Where are you from?' },
      { type: 'tip', text: 'Trong Speaking, nếu chưa nghe rõ câu hỏi, hãy dùng câu hỏi gián tiếp: Could you tell me what you mean by "public spaces"?' },
      { type: 'mistake', wrong: 'Where you live?', right: 'Where do you live?', why: 'Câu hỏi Wh- với động từ thường cần trợ động từ do/does/did.' },
      { type: 'mistake', wrong: 'Who did break the window?', right: 'Who broke the window?', why: 'Who là chủ ngữ → không dùng did, động từ chia quá khứ.' },
      { type: 'mistake', wrong: 'Can you tell me where is the bus stop?', right: 'Can you tell me where the bus stop is?', why: 'Câu hỏi gián tiếp giữ trật tự câu kể: S + V.' },
      { type: 'ielts', text: 'Speaking Part 3 có nhiều câu hỏi gián tiếp; nghe đúng cấu trúc giúp bạn hiểu ý giám khảo. Trong Writing Task 2, câu hỏi tu từ hiếm khi nên dùng; thay vào đó dùng mệnh đề danh từ: The question is whether…', ex: 'The key issue is [[whether governments can afford]] free university education.' }
    ],
    quiz: [
      { q: 'How long ___ you been learning English?', options: ['do', 'are', 'have', 'did'], answer: 2, explain: 'Hiện tại hoàn thành tiếp diễn → have you been learning. do, are, did không tạo được thì hiện tại hoàn thành tiếp diễn với been learning.' },
      { q: 'Who ___ the first prize in the competition?', options: ['did win', 'won', 'did won', 'does won'], answer: 1, explain: 'Who là chủ ngữ của câu hỏi → không dùng trợ động từ: Who won…? "did win" chỉ dùng khi nhấn mạnh; "did won" và "does won" sai dạng.' },
      { q: 'Could you tell me what time ___?', options: ['the exam starts', 'does the exam start', 'starts the exam', 'the exam does start'], answer: 0, explain: 'Câu hỏi gián tiếp → trật tự S + V: the exam starts. "does the exam start" và "starts the exam" giữ trật tự câu hỏi; "the exam does start" thừa does.' },
      { q: '___ did you choose this university? – Because of its reputation.', options: ['What', 'How', 'Which', 'Why'], answer: 3, explain: 'Câu trả lời bắt đầu bằng Because of… → hỏi lý do: Why. What, How, Which không hỏi lý do.' },
      { q: 'I\'d like to know ___ the course includes accommodation.', options: ['that', 'if', 'what', 'does'], answer: 1, explain: 'Câu hỏi gián tiếp dạng Yes/No → if/whether. that dùng cho câu trần thuật; what sai nghĩa; does không đứng trong câu gián tiếp.' },
      { q: 'What ___ when the fire alarm went off?', options: ['did you do', 'you did', 'did you', 'you do'], answer: 0, explain: 'What là tân ngữ → cần trợ động từ: What did you do? "you did" và "you do" thiếu trợ động từ; "did you" thiếu động từ chính do.' },
      { q: 'Câu nào đúng?', options: ['What means this word?', 'What this word means?', 'What does mean this word?', 'What does this word mean?'], answer: 3, explain: 'What là tân ngữ → What + does + S + V nguyên mẫu → What does this word mean? Các câu còn lại thiếu trợ động từ hoặc sai trật tự.' },
      { q: 'Câu nào đúng?', options: ['Do you know where does she live?', 'Do you know where lives she?', 'Do you know where she lives?', 'Do you know where she does live?'], answer: 2, explain: 'Câu hỏi gián tiếp: where + S + V chia (không đảo, không trợ động từ) → where she lives. "where does she live", "where lives she", "where she does live" đều sai trật tự.' },
      { q: 'Câu nào đúng?', options: ['Who did tell you the news?', 'Who you told the news?', 'Who told to you the news?', 'Who told you the news?'], answer: 3, explain: 'Who là chủ ngữ → Who + V2 + tân ngữ → Who told you the news? "did tell" thừa trợ động từ; "Who you told" sai trật tự; "told to you" thừa giới từ.' },
      { q: 'Phần nào sai? "How many (A) conferences did (B) she attended (C) last year (D)?"', options: ['How many', 'did', 'attended', 'last year'], answer: 2, explain: 'Hỏi về tân ngữ (conferences) nên cần trợ động từ did, và sau did dùng động từ nguyên mẫu: did she attend. How many, did, last year đều đúng.' },
      { q: 'Phần nào sai? "I wonder (A) why is (B) the price (C) so high (D)."', options: ['I wonder', 'why is', 'the price', 'so high'], answer: 1, explain: 'Câu hỏi gián tiếp không đảo: why the price is so high. I wonder, the price và so high đều đúng.' },
      { q: 'Phần nào sai? "Where (A) your parents (B) work (C) now (D)?"', options: ['Where', 'your parents', 'work', 'now'], answer: 1, explain: 'Thiếu trợ động từ: Where do your parents work now? Where, work và now đều đúng; chỉ cần thêm do trước your parents.' }
    ]
  });

  /* 7. Question tags & short answers */
  G.push({
    id: 'question-tags-short-answers', unit: 'foundation', order: 7,
    title: 'Câu hỏi đuôi & câu trả lời ngắn', en: 'Question Tags & Short Answers', level: 'B1', emoji: '🏷️',
    summary: 'Thêm câu hỏi đuôi để xác nhận hoặc mời người nghe đồng ý, và dùng câu trả lời ngắn như Yes, I do / So do I / Neither do I để phản hồi tự nhiên.',
    blocks: [
      { type: 'diagram', caption: 'Lắp câu hỏi đuôi: đảo dấu, giữ trợ động từ', steps: [
        { t: 'Câu chính KHẲNG ĐỊNH → đuôi PHỦ ĐỊNH', c: 'if' },
        { t: 'You\'ve been to Da Lat, haven\'t you?', c: 'result' },
        { t: 'Câu chính PHỦ ĐỊNH → đuôi KHẲNG ĐỊNH', c: 'if' },
        { t: 'She doesn\'t eat meat, does she?', c: 'result' },
        { t: '↓ Không có trợ động từ? Mượn do / does / did', c: 'arrow' },
        { t: 'The bus left on time, didn\'t it?', c: 'result' },
        { t: 'Đuôi luôn dùng ĐẠI TỪ: this/that → it, these/those → they, nobody → they', c: 'note' }
      ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định + đuôi phủ định', parts: [ { t: 'S + V…', c: 'subj' }, { t: 'aux + n\'t', c: 'neg' }, { t: 'đại từ?', c: 'obj' } ], ex: 'The exam was difficult, [[wasn\'t it]]?' },
        { label: 'Phủ định + đuôi khẳng định', parts: [ { t: 'S + aux + not + V…', c: 'subj' }, { t: 'aux', c: 'aux' }, { t: 'đại từ?', c: 'obj' } ], ex: 'You haven\'t finished yet, [[have you]]?' },
        { label: 'Đồng ý với câu khẳng định', parts: [ { t: 'So', c: 'adv' }, { t: 'aux', c: 'aux' }, { t: 'S', c: 'subj' } ], ex: 'I love street food. – [[So do I]].' },
        { label: 'Đồng ý với câu phủ định', parts: [ { t: 'Neither / Nor', c: 'neg' }, { t: 'aux', c: 'aux' }, { t: 'S', c: 'subj' } ], ex: 'I can\'t stand loud music. – [[Neither can I]].' },
        { label: 'Trả lời ngắn', parts: [ { t: 'Yes / No', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'aux (n\'t)', c: 'aux' } ], ex: 'Do you work? – [[Yes, I do]]. / [[No, I don\'t]].' }
      ] },
      { type: 'uses', items: [
        { title: 'Xác nhận điều mình gần như chắc chắn (giọng xuống)', ex: 'It\'s your first time in London, [[isn\'t it]]?', vi: 'Đây là lần đầu bạn đến London phải không?' },
        { title: 'Hỏi thật vì chưa chắc (giọng lên)', ex: 'The deadline is Friday, [[isn\'t it]]?', vi: 'Hạn chót là thứ Sáu à?' },
        { title: 'So + aux + S: "tôi cũng vậy" (khẳng định)', ex: 'My brother studies medicine, and [[so does my cousin]].', vi: 'Anh tôi học y, và anh họ tôi cũng vậy.' },
        { title: 'Neither + aux + S: "tôi cũng không" (phủ định)', ex: 'I didn\'t enjoy the film. – [[Neither did I]].', vi: 'Tôi không thích bộ phim. – Tôi cũng không.' },
        { title: 'Trả lời ngắn tránh lặp lại cả câu', ex: 'Have you ever been to Japan? – [[No, I haven\'t]], but I\'d love to.', vi: 'Bạn đã từng đến Nhật chưa? – Chưa, nhưng tôi rất muốn.' }
      ] },
      { type: 'table', head: ['Câu chính', 'Đuôi', 'Ghi chú'], rows: [
        ['I am late,', 'aren\'t I?', 'ngoại lệ: không dùng amn\'t'],
        ['Let\'s take a break,', 'shall we?', 'lời rủ'],
        ['Open the window,', 'will you? / could you?', 'câu mệnh lệnh'],
        ['Nobody called,', 'did they?', 'nobody/no one → đuôi khẳng định, they'],
        ['There is a problem,', 'isn\'t there?', 'there giữ nguyên'],
        ['She rarely complains,', 'does she?', 'rarely/hardly/never mang nghĩa phủ định']
      ] },
      { type: 'tip', text: 'Trả lời câu hỏi đuôi phủ định theo SỰ THẬT, không theo cảm giác "đúng/sai" như tiếng Việt. You don\'t smoke, do you? – No, I don\'t (= đúng, tôi không hút). Nói "Yes" nghĩa là bạn CÓ hút.' },
      { type: 'tip', text: 'Trong giao tiếp thân mật có thể nói Me too / Me neither thay cho So do I / Neither do I.' },
      { type: 'mistake', wrong: 'You are a student, isn\'t it?', right: 'You are a student, aren\'t you?', why: 'Đuôi phải lặp lại trợ động từ và đại từ của câu chính, không dùng isn\'t it cho mọi trường hợp.' },
      { type: 'mistake', wrong: 'I don\'t like spicy food. – So do I.', right: 'I don\'t like spicy food. – Neither do I.', why: 'Đồng ý với câu phủ định dùng Neither.' },
      { type: 'mistake', wrong: 'She went home early, wasn\'t she?', right: 'She went home early, didn\'t she?', why: 'Câu chính dùng động từ thường ở quá khứ → đuôi didn\'t.' },
      { type: 'ielts', text: 'Trong Speaking, không cần dùng câu hỏi đuôi với giám khảo, nhưng câu trả lời ngắn + mở rộng (Yes, I do – actually I…) giúp mở đầu tự nhiên. Trong Listening Section 1, câu hỏi đuôi thường dùng để xác nhận thông tin – cẩn thận với đáp án bị sửa lại.', ex: 'Do you enjoy cooking? – [[Yes, I do]], although I only have time at weekends.' }
    ],
    quiz: [
      { q: 'You\'ve already booked the hotel, ___?', options: ['haven\'t you', 'didn\'t you', 'have you', 'don\'t you'], answer: 0, explain: 'Câu chính khẳng định với have (have booked) → câu hỏi đuôi phủ định cùng trợ động từ: haven\'t you? didn\'t/don\'t sai trợ động từ; have you không đổi sang phủ định.' },
      { q: 'Nobody noticed the mistake, ___?', options: ['didn\'t they', 'did he', 'did they', 'noticed they'], answer: 2, explain: 'Nobody mang nghĩa phủ định → đuôi khẳng định, dùng they. "didn\'t they" sai vì nobody đã phủ định; "did he" sai chủ ngữ; "noticed they" sai cấu trúc.' },
      { q: 'I\'m on the shortlist, ___?', options: ['amn\'t I', 'am not I', 'isn\'t it', 'aren\'t I'], answer: 3, explain: 'Ngoại lệ: I am → câu hỏi đuôi là aren\'t I? "amn\'t I" và "am not I" không dùng; isn\'t it sai chủ ngữ.' },
      { q: 'My parents never use social media, and ___ my grandparents.', options: ['so do', 'neither do', 'neither don\'t', 'so don\'t'], answer: 1, explain: 'Câu trước có never (phủ định) → đồng ý dùng neither do (động từ thường use). so do dùng cho câu khẳng định; "neither don\'t" là phủ định kép; "so don\'t" sai.' },
      { q: 'Let\'s go for a walk after dinner, ___?', options: ['will we', 'don\'t we', 'shall we', 'do we'], answer: 2, explain: 'Câu rủ rê bắt đầu bằng Let\'s… luôn dùng câu hỏi đuôi shall we? will we, don\'t we và do we không dùng sau Let\'s.' },
      { q: '"I passed the driving test first time." – "___"', options: ['So did I.', 'So I did.', 'Neither did I.', 'So was I.'], answer: 0, explain: 'Đồng ý với câu khẳng định thì quá khứ (passed) → So did I. "So I did" sai trật tự; Neither dùng cho câu phủ định; "So was I" sai trợ động từ.' },
      { q: 'Câu nào đúng?', options: ['There aren\'t enough seats, aren\'t there?', 'There aren\'t enough seats, are there?', 'There aren\'t enough seats, are they?', 'There aren\'t enough seats, isn\'t it?'], answer: 1, explain: 'Câu chính phủ định, chủ ngữ there → đuôi are there. "aren\'t there" không đổi sang khẳng định; "are they" sai chủ ngữ; "isn\'t it" sai hoàn toàn.' },
      { q: 'Câu nào đúng?', options: ['She can speak French, can she?', 'She can speak French, doesn\'t she?', 'She can speak French, can\'t she?', 'She can speak French, isn\'t it?'], answer: 2, explain: 'Khẳng định với can → câu hỏi đuôi phủ định can\'t she? "can she" không đổi sang phủ định; doesn\'t và isn\'t sai trợ động từ.' },
      { q: 'Câu nào đúng?', options: ['"I hate waiting." – "Neither do I."', '"I hate waiting." – "So am I."', '"I hate waiting." – "So I do."', '"I hate waiting." – "So do I."'], answer: 3, explain: 'hate là động từ thường, câu khẳng định → So do I. Neither dùng cho câu phủ định; "So am I" sai trợ động từ; "So I do" sai trật tự.' },
      { q: 'Phần nào sai? "This (A) is your first IELTS test (B), isn\'t (C) this (D)?"', options: ['This', 'is your first IELTS test', 'isn\'t', 'this'], answer: 3, explain: 'Câu hỏi đuôi dùng đại từ it thay cho this → isn\'t it?, nên phần sai là (D). This, is your first IELTS test, isn\'t đều đúng.' },
      { q: 'Phần nào sai? "He hardly (A) ever studies (B), doesn\'t (C) he (D)?"', options: ['He hardly', 'ever studies', 'doesn\'t', 'he'], answer: 2, explain: 'Hardly mang nghĩa phủ định → đuôi khẳng định: does he? He hardly, ever studies và he đều đúng.' },
      { q: 'Phần nào sai? "I haven\'t (A) seen that film. – So (B) have (C) I (D)."', options: ['I haven\'t', 'So', 'have', 'I'], answer: 1, explain: 'Đồng ý với câu phủ định (haven\'t) → Neither have I, nên phần sai là (B) So. I haven\'t, have, I đều đúng.' }
    ]
  });

  /* 8. Imperatives & suggestions */
  G.push({
    id: 'imperatives-suggestions', unit: 'foundation', order: 8,
    title: 'Câu mệnh lệnh, Let\'s & lời đề nghị', en: 'Imperatives, Let\'s & Suggestions', level: 'A2', emoji: '💬',
    summary: 'Ra lệnh, hướng dẫn và rủ rê bằng câu mệnh lệnh, let\'s, why don\'t we…?, how about…?, I suggest…, chọn mức độ lịch sự phù hợp.',
    blocks: [
      { type: 'scale', caption: 'Mức độ lịch sự / gián tiếp (0 = rất thẳng, 100 = rất mềm mỏng)', items: [ { t: 'Close the door.', v: 10 }, { t: 'Let\'s close the door.', v: 30 }, { t: 'Why don\'t we close the door?', v: 45 }, { t: 'How about closing the door?', v: 50 }, { t: 'Could you close the door, please?', v: 70 }, { t: 'Would you mind closing the door?', v: 85 } ] },
      { type: 'formula', rows: [
        { label: 'Mệnh lệnh khẳng định', parts: [ { t: 'V (nguyên mẫu)', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: '[[Read]] the question carefully.' },
        { label: 'Mệnh lệnh phủ định', parts: [ { t: 'Don\'t', c: 'neg' }, { t: 'V', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: '[[Don\'t leave]] any answers blank.' },
        { label: 'Rủ cùng làm', parts: [ { t: 'Let\'s (not)', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: '[[Let\'s meet]] at the library at six.' },
        { label: 'Đề nghị với V nguyên mẫu', parts: [ { t: 'Why don\'t we / you', c: 'aux' }, { t: 'V', c: 'verb' }, { t: '…?', c: 'obj' } ], ex: '[[Why don\'t we share]] a taxi?' },
        { label: 'Đề nghị với V-ing', parts: [ { t: 'How / What about', c: 'adv' }, { t: 'V-ing / N', c: 'verb' }, { t: '…?', c: 'obj' } ], ex: '[[How about taking]] the train instead?' },
        { label: 'Suggest (trang trọng)', parts: [ { t: 'I suggest', c: 'subj' }, { t: '(that) S + V nguyên mẫu', c: 'verb' } ], ex: 'I [[suggest that he apply]] early.' }
      ] },
      { type: 'uses', items: [
        { title: 'Hướng dẫn, chỉ dẫn, công thức nấu ăn', ex: '[[Turn]] left at the roundabout and [[park]] behind the hall.', vi: 'Rẽ trái ở vòng xuyến và đỗ xe sau hội trường.' },
        { title: 'Cảnh báo, lời khuyên ngắn', ex: '[[Don\'t forget]] to check your spelling.', vi: 'Đừng quên kiểm tra chính tả.' },
        { title: 'Let\'s: rủ người khác cùng làm (có cả người nói)', ex: '[[Let\'s not waste]] any more time.', vi: 'Đừng phí thêm thời gian nữa.' },
        { title: 'Why don\'t we…? / How about…?: gợi ý thân mật', ex: '[[What about organizing]] a charity run?', vi: 'Hay là tổ chức một cuộc chạy từ thiện?' },
        { title: 'Suggest / recommend: gợi ý trang trọng', ex: 'Experts [[recommend reducing]] screen time before bed.', vi: 'Các chuyên gia khuyên nên giảm thời gian dùng màn hình trước khi ngủ.' }
      ] },
      { type: 'table', head: ['Cấu trúc', 'Theo sau', 'Ví dụ'], rows: [
        ['Let\'s', 'V nguyên mẫu', 'Let\'s start.'],
        ['Why don\'t we/you', 'V nguyên mẫu', 'Why don\'t you ask the teacher?'],
        ['Shall we', 'V nguyên mẫu', 'Shall we order now?'],
        ['How about / What about', 'V-ing / N', 'How about a coffee?'],
        ['suggest / recommend', 'V-ing hoặc that + S + V', 'I suggest leaving early.'],
        ['Would you mind', 'V-ing', 'Would you mind waiting?']
      ] },
      { type: 'tip', text: 'Suggest KHÔNG đi với to V và không đi trực tiếp với người: không nói "suggest me to go". Dùng suggest going, hoặc suggest (that) I go.' },
      { type: 'tip', text: 'Thêm please, just hoặc chuyển thành câu hỏi Could you…? để mệnh lệnh nghe lịch sự hơn – đặc biệt khi nói với người lạ hoặc giám khảo.' },
      { type: 'mistake', wrong: 'Let\'s to go to the beach.', right: 'Let\'s go to the beach.', why: 'Let\'s + V nguyên mẫu không to.' },
      { type: 'mistake', wrong: 'How about go to the museum?', right: 'How about going to the museum?', why: 'How about + V-ing.' },
      { type: 'mistake', wrong: 'My teacher suggested me to read more.', right: 'My teacher suggested that I read more. / My teacher suggested reading more.', why: 'Suggest không theo mẫu suggest sb to V.' },
      { type: 'ielts', text: 'Speaking Part 2/3 hay có tình huống đưa lời khuyên. Writing General Training Task 1 (viết thư) cần lời đề nghị lịch sự: I would suggest…, Perhaps we could…, Would it be possible to…?', ex: '[[Perhaps we could arrange]] a meeting next week to discuss the problem.' }
    ],
    quiz: [
      { q: '___ forget to bring your passport on the test day.', options: ['Not', 'No', 'Don\'t', 'Doesn\'t'], answer: 2, explain: 'Mệnh lệnh phủ định: Don\'t + V nguyên mẫu → Don\'t forget. Not và No không đứng đầu mệnh lệnh; Doesn\'t dùng cho ngôi ba số ít.' },
      { q: 'Let\'s ___ the presentation one more time.', options: ['practice', 'to practice', 'practicing', 'practiced'], answer: 0, explain: 'Let\'s + V nguyên mẫu → Let\'s practice. Sau Let\'s không dùng to V, V-ing hay V3.' },
      { q: 'How about ___ a study group?', options: ['start', 'to start', 'we to start', 'starting'], answer: 3, explain: 'How about + V-ing? (… thì sao?) dùng để gợi ý → starting. start và we to start sai sau How about; to start thừa to.' },
      { q: 'Why don\'t we ___ the meeting until Monday?', options: ['postponing', 'postpone', 'to postpone', 'postponed'], answer: 1, explain: 'Why don\'t we + V nguyên mẫu → Why don\'t we postpone…? Không dùng V-ing, to V hay V3 sau Why don\'t we.' },
      { q: 'The doctor suggested ___ less salt.', options: ['to eat', 'me to eat', 'eating', 'eat'], answer: 2, explain: 'suggest + V-ing (gợi ý làm gì); không dùng suggest sb to V → eating. "to eat", "me to eat" và "eat" đều sai cấu trúc với suggest.' },
      { q: 'Let\'s ___ about the results until they are published.', options: ['not worry', 'don\'t worry', 'not to worry', 'no worry'], answer: 0, explain: 'Phủ định của Let\'s là Let\'s not + V → Let\'s not worry. "don\'t worry", "not to worry", "no worry" đều sai sau Let\'s.' },
      { q: 'Câu nào đúng?', options: ['What about visiting the old quarter?', 'What about to visit the old quarter?', 'What about visit the old quarter?', 'What about we visiting the old quarter?'], answer: 0, explain: 'What about + V-ing? dùng để gợi ý → What about visiting the old quarter? "to visit", "visit" và "we visiting" đều sai sau What about.' },
      { q: 'Câu nào đúng?', options: ['I recommend you to book early.', 'I recommend to book early.', 'I recommend booking early.', 'I recommend book early.'], answer: 2, explain: 'recommend + V-ing (hoặc recommend that you book) → I recommend booking early. "recommend you to book" và "recommend to book" sai cấu trúc; "recommend book" thiếu -ing.' },
      { q: 'Câu nào đúng?', options: ['Would you mind to open the window?', 'Would you mind open the window?', 'Would you mind if open the window?', 'Would you mind opening the window?'], answer: 3, explain: 'Would you mind + V-ing? (phiền bạn… được không) → Would you mind opening the window? "mind to open", "mind open" và "if open" (thiếu chủ ngữ) đều sai.' },
      { q: 'Phần nào sai? "Please (A) to fill in (B) the form (C) before the interview (D)."', options: ['Please', 'to fill in', 'the form', 'before the interview'], answer: 1, explain: 'Câu mệnh lệnh dùng V nguyên mẫu không to → Please fill in…, nên phần sai là (B). Please, the form, before the interview đều đúng.' },
      { q: 'Phần nào sai? "She suggested (A) that I (B) to take (C) a gap year (D)."', options: ['She suggested', 'that I', 'to take', 'a gap year'], answer: 2, explain: 'Suggest (that) + S + V nguyên mẫu: She suggested that I take a gap year, nên phần sai là (C) to take. She suggested, that I, a gap year đều đúng.' },
      { q: 'Phần nào sai? "Don\'t (A) to worry (B), we have (C) plenty of time (D)."', options: ['Don\'t', 'to worry', 'we have', 'plenty of time'], answer: 1, explain: 'Don\'t + V nguyên mẫu (không to) → Don\'t worry, nên phần sai là (B). Don\'t, we have, plenty of time đều đúng.' }
    ]
  });

  /* 9. Numbers & data language */
  G.push({
    id: 'numbers-data-language', unit: 'foundation', order: 9,
    title: 'Số, ngày tháng, phần trăm, phân số & ước lượng', en: 'Numbers, Dates, Percentages & Approximations', level: 'B1', emoji: '📊',
    summary: 'Đọc và viết số liệu chính xác cho Writing Task 1: ngày tháng, phần trăm, phân số, bội số (a fivefold increase) và cách ước lượng (just over a third, roughly 40%).',
    blocks: [
      { type: 'scale', caption: 'Diễn đạt tỷ lệ bằng lời (con số = phần trăm thực tế)', items: [ { t: 'the vast majority', v: 90 }, { t: 'three quarters', v: 75 }, { t: 'almost two thirds', v: 64 }, { t: 'just over half', v: 52 }, { t: 'roughly two fifths', v: 41 }, { t: 'just under a third', v: 32 }, { t: 'about a quarter', v: 24 }, { t: 'one in ten', v: 10 }, { t: 'a tiny fraction', v: 3 } ] },
      { type: 'formula', rows: [
        { label: 'Phần trăm', parts: [ { t: 'số + per cent / %', c: 'obj' }, { t: 'of', c: 'adv' }, { t: 'N', c: 'subj' } ], ex: '[[45%]] of households owned a car in 2010.' },
        { label: 'Ước lượng', parts: [ { t: 'just over / just under / roughly / approximately', c: 'adv' }, { t: 'số / phân số', c: 'obj' } ], ex: '[[Just under a third]] of respondents disagreed.' },
        { label: 'Bội số (danh từ)', parts: [ { t: 'a twofold / threefold / fivefold', c: 'adv' }, { t: 'increase / rise', c: 'obj' } ], ex: 'There was a [[fivefold increase]] in online sales.' },
        { label: 'Bội số (so sánh)', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'twice / three times as many as', c: 'adv' } ], ex: 'Men spent [[twice as much time]] on sport as women.' },
        { label: 'Ngày tháng (Anh – Anh)', parts: [ { t: 'on', c: 'time' }, { t: 'the 3rd of May / 3 May', c: 'time' }, { t: 'in 2015 / in the 1990s', c: 'time' } ], ex: 'The bridge opened on [[3 May 2015]].' },
        { label: 'Ngày tháng (Anh – Mỹ)', parts: [ { t: 'on', c: 'time' }, { t: 'May 3, 2015 / May 3rd', c: 'time' }, { t: 'in 2015 / in the 1990s', c: 'time' } ], ex: 'The bridge opened on [[May 3, 2015]].' }
      ] },
      { type: 'uses', items: [
        { title: 'Phân số: tử số là số đếm, mẫu số là số thứ tự (+ s nếu tử > 1)', ex: '[[Two fifths]] of the budget went on healthcare.', vi: 'Hai phần năm ngân sách được chi cho y tế.' },
        { title: 'Ước lượng khi số không tròn', ex: '[[Roughly 40%]] of graduates found work within a month.', vi: 'Khoảng 40% sinh viên tốt nghiệp tìm được việc trong vòng một tháng.' },
        { title: 'Bội số mô tả mức tăng lớn', ex: 'The number of cyclists [[quadrupled]] between 2000 and 2020.', vi: 'Số người đi xe đạp tăng gấp bốn lần từ năm 2000 đến 2020.' },
        { title: 'Percentage (danh từ, không đi với số) vs per cent (đi với số)', ex: 'The [[percentage]] of smokers fell to [[12 per cent]].', vi: 'Tỷ lệ người hút thuốc giảm xuống 12%.' },
        { title: 'Số lớn: million, billion không thêm s khi có số đứng trước', ex: 'The city welcomed [[3.5 million]] visitors last year.', vi: 'Thành phố đón 3,5 triệu lượt khách năm ngoái.' }
      ] },
      { type: 'table', head: ['Số liệu', 'Cách viết bằng lời', 'Ghi chú'], rows: [
        ['26%', 'just over a quarter', 'over = cao hơn một chút'],
        ['48%', 'just under half / nearly half', 'under / nearly = thấp hơn một chút'],
        ['67%', 'two thirds', 'mẫu số số nhiều → thirds'],
        ['×2 / ×3', 'doubled / tripled', 'động từ'],
        ['×5', 'a fivefold increase / increased fivefold', 'danh từ / trạng từ'],
        ['1990–1999', 'the 1990s', 'không có dấu nháy'],
        ['2,500,000', 'two and a half million', 'million không thêm s']
      ] },
      { type: 'tip', text: 'Đừng lặp đi lặp lại "X%". Xen kẽ con số với cách nói bằng lời (a third, the majority, one in five) để tăng điểm Lexical Resource.' },
      { type: 'tip', text: 'Number (đếm được) vs amount (không đếm được): the number of tourists, the amount of water. Proportion / percentage / share dùng cho tỷ lệ.' },
      { type: 'tip', text: 'Anh – Mỹ: viết percent (một từ): 8 percent, 45 percent of households; Anh – Anh hay viết per cent. Ngày tháng Anh – Mỹ: tháng trước, ngày sau – May 3, 2015 (đọc "May third"); dạng số 5/3/2015 = ngày 3 tháng 5 (Anh – Anh hiểu là 5 tháng 3), nên trong bài viết hãy ghi tên tháng để tránh nhầm.' },
      { type: 'mistake', wrong: 'The percentage of unemployment was 8 percents.', right: 'The unemployment rate was 8 per cent.', why: 'Per cent / percent không bao giờ thêm s.' },
      { type: 'mistake', wrong: 'Two third of students live at home.', right: 'Two thirds of students live at home.', why: 'Tử số > 1 → mẫu số thêm s: two thirds.' },
      { type: 'mistake', wrong: 'The population reached 5 millions.', right: 'The population reached 5 million.', why: 'Khi có số đứng trước, million/thousand/hundred không thêm s.' },
      { type: 'ielts', text: 'Writing Task 1 chấm cả độ chính xác số liệu lẫn sự đa dạng cách diễn đạt. Kết hợp ước lượng (approximately, just over) với bội số (doubled, a threefold rise) để có câu tổng quan và câu chi tiết hay.', ex: 'Spending on public transport [[roughly doubled]], reaching [[just over a third]] of the total budget by 2020.' }
    ],
    quiz: [
      { q: '34% of respondents chose cycling. → ___ a third of respondents chose cycling.', options: ['Just under', 'Exactly', 'Just over', 'Nearly'], answer: 2, explain: '34% lớn hơn 1/3 (≈ 33,3%) một chút → just over a third. Just under là ít hơn; Exactly sai số liệu; Nearly cũng mang nghĩa chưa tới.' },
      { q: 'Sales rose from 2 million to 10 million – a ___ increase.', options: ['twofold', 'fivefold', 'tenfold', 'fivefolds'], answer: 1, explain: '10 ÷ 2 = 5 → a fivefold increase (tăng gấp năm), tính từ không thêm s. twofold và tenfold sai số liệu; "fivefolds" sai dạng.' },
      { q: '60% of the energy came from coal. → ___ of the energy came from coal.', options: ['Three fifths', 'Three fifth', 'Two thirds', 'A half'], answer: 0, explain: '60% = 3/5 → three fifths (mẫu số thêm s khi tử số lớn hơn 1). "Three fifth" thiếu s; two thirds ≈ 67%; a half = 50%.' },
      { q: 'The figure for 2020 was ___ the figure for 2010.', options: ['twice higher as', 'two times as higher than', 'twice so high as', 'twice as high as'], answer: 3, explain: 'Bội số + so sánh bằng: twice / three times + as + adj nguyên mẫu + as. "twice higher as", "two times as higher than", "twice so high as" đều sai cấu trúc so sánh bội số.' },
      { q: 'The ___ of water used by households fell sharply.', options: ['number', 'amount', 'few', 'many'], answer: 1, explain: 'water không đếm được → the amount of. number dùng cho danh từ đếm được; few và many là từ hạn định, không đứng sau the… of như danh từ.' },
      { q: 'The museum attracted around 800 ___ visitors last year.', options: ['thousands', 'thousand of', 'thousand', 'thousands of'], answer: 2, explain: 'Có số đứng trước → thousand không thêm s, không có of. "thousands" và "thousands of" chỉ dùng khi không có số cụ thể phía trước; "thousand of" thừa of.' },
      { q: 'Câu nào đúng?', options: ['Car ownership increased by 5 percents.', 'Car ownership increased by 5 per cent.', 'Car ownership increased by 5 percentage.', 'Car ownership increased by 5 per cents.'], answer: 1, explain: 'per cent đứng sau số và không thêm s → by 5 per cent. "percents", "per cents" sai; percentage là danh từ "tỉ lệ", không đi trực tiếp sau số.' },
      { q: 'Câu nào đúng?', options: ['The museum opened in the 1980\'s.', 'The museum opened on 1980s.', 'The museum opened in 1980s.', 'The museum opened in the 1980s.'], answer: 3, explain: 'Nói về thập kỷ: in the 1980s (có the, không dấu nháy). "1980\'s" thừa dấu nháy; "on 1980s" sai giới từ; "in 1980s" thiếu the.' },
      { q: 'Câu nào đúng?', options: ['Roughly a quarter of the population is over 65.', 'Roughly a fourth part of the population is over 65.', 'Roughly quarter of population is over 65.', 'Roughly a quarters of the population is over 65.'], answer: 0, explain: 'A quarter of the + N (một phần tư), a quarter không thêm s → Roughly a quarter of the population. "a fourth part" không tự nhiên; câu 3 thiếu a và the; "a quarters" sai số.' },
      { q: 'Phần nào sai? "Nearly (A) two third (B) of the participants (C) were women (D)."', options: ['Nearly', 'two third', 'of the participants', 'were women'], answer: 1, explain: 'Phân số có tử số lớn hơn 1 thì mẫu số thêm s → two thirds, nên phần sai là (B). Nearly, of the participants, were women đều đúng.' },
      { q: 'Phần nào sai? "The number (A) of energy (B) produced by wind (C) tripled (D)."', options: ['The number', 'of energy', 'produced by wind', 'tripled'], answer: 0, explain: 'energy không đếm được → The amount (of energy), nên phần sai là (A) The number. of energy, produced by wind, tripled đều đúng.' },
      { q: 'Phần nào sai? "In 2019 (A), the city had (B) 4 millions (C) residents (D)."', options: ['In 2019', 'had', '4 millions', 'residents'], answer: 2, explain: 'Có số đứng trước thì million không thêm s → 4 million residents, nên phần sai là (C). In 2019, had, residents đều đúng.' }
    ]
  });

  /* 10. -ing vs -ed adjectives & adjective + preposition */
  G.push({
    id: 'ing-ed-adjectives-prepositions', unit: 'foundation', order: 10,
    title: 'Tính từ -ing / -ed & tính từ + giới từ', en: '-ing vs -ed Adjectives & Adjective + Preposition', level: 'B1', emoji: '😮',
    summary: 'Phân biệt tính từ -ing (tính chất của sự vật, gây ra cảm xúc) với -ed (cảm xúc của người), và học các cặp tính từ + giới từ cố định như interested in, responsible for, aware of.',
    blocks: [
      { type: 'sort', caption: '-ING = nguyên nhân gây cảm xúc · -ED = người cảm nhận cảm xúc', groups: [
        { title: '-ING: sự vật / sự việc như thế nào', emoji: '🎬', items: ['a boring lecture', 'confusing instructions', 'an exhausting journey', 'surprising results', 'a worrying trend'] },
        { title: '-ED: người cảm thấy thế nào', emoji: '🙂', items: ['bored students', 'confused tourists', 'exhausted nurses', 'surprised scientists', 'worried parents'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Sự vật gây cảm xúc', parts: [ { t: 'S (vật / việc)', c: 'subj' }, { t: 'be', c: 'verb' }, { t: 'V-ing (adj)', c: 'adv' } ], ex: 'The documentary was [[fascinating]].' },
        { label: 'Người cảm thấy', parts: [ { t: 'S (người)', c: 'subj' }, { t: 'be / feel', c: 'verb' }, { t: 'V-ed (adj)', c: 'adv' }, { t: 'giới từ + N', c: 'obj' } ], ex: 'I was [[fascinated by]] the documentary.' },
        { label: 'Tính từ + giới từ + N / V-ing', parts: [ { t: 'S', c: 'subj' }, { t: 'be', c: 'verb' }, { t: 'adj + prep', c: 'adv' }, { t: 'N / V-ing', c: 'obj' } ], ex: 'She is [[interested in]] studying law.' }
      ] },
      { type: 'uses', items: [
        { title: '-ing mô tả đặc điểm của vật, sự việc (hoặc người gây cảm xúc cho người khác)', ex: 'The rise in house prices is [[alarming]].', vi: 'Sự tăng giá nhà đáng báo động.' },
        { title: '-ed mô tả cảm xúc của người', ex: 'Many residents are [[frustrated with]] the noise.', vi: 'Nhiều cư dân bực bội vì tiếng ồn.' },
        { title: 'Adj + of: aware of, afraid of, proud of, capable of, full of', ex: 'People are more [[aware of]] their carbon footprint now.', vi: 'Giờ mọi người ý thức hơn về lượng khí thải carbon của mình.' },
        { title: 'Adj + for / to: responsible for, famous for, similar to, harmful to', ex: 'Parents are [[responsible for]] their children\'s safety.', vi: 'Cha mẹ chịu trách nhiệm về sự an toàn của con cái.' },
        { title: 'Adj + in / at / with / about: interested in, good at, satisfied with, worried about', ex: 'Customers were [[satisfied with]] the new service.', vi: 'Khách hàng hài lòng với dịch vụ mới.' }
      ] },
      { type: 'table', head: ['Giới từ', 'Tính từ thường đi kèm'], rows: [
        ['of', 'aware, afraid, proud, capable, fond, tired, full, short'],
        ['for', 'responsible, famous, suitable, necessary, grateful'],
        ['to', 'similar, harmful, addicted, relevant, accustomed, equal'],
        ['in', 'interested, involved, rich, successful (in V-ing)'],
        ['at', 'good, bad, skilled, surprised, shocked'],
        ['with', 'satisfied, familiar, bored, crowded, impressed'],
        ['about', 'worried, excited, anxious, concerned, optimistic']
      ] },
      { type: 'tip', text: 'Mẹo nhanh: hỏi "ai/cái gì GÂY RA cảm xúc?" → -ing. "Ai CẢM THẤY?" → -ed. Một người có thể là -ing nếu họ khiến người khác cảm thấy vậy: He is boring (anh ta nhạt nhẽo) ≠ He is bored (anh ta đang chán).' },
      { type: 'tip', text: 'Sau giới từ, động từ phải ở dạng V-ing: good at managing, interested in learning, responsible for keeping.' },
      { type: 'mistake', wrong: 'I am very interesting in history.', right: 'I am very interested in history.', why: 'Người cảm thấy hứng thú → interested; "I am interesting" = tôi là người thú vị.' },
      { type: 'mistake', wrong: 'Smoking is harmful for your lungs.', right: 'Smoking is harmful to your lungs.', why: 'Harmful đi với to.' },
      { type: 'mistake', wrong: 'She is good in solving problems.', right: 'She is good at solving problems.', why: 'Good đi với at khi nói về kỹ năng.' },
      { type: 'ielts', text: 'Speaking Part 1 hỏi rất nhiều về sở thích và cảm xúc – nhầm -ing/-ed là lỗi giám khảo dễ nhận ra. Trong Task 2, các cụm be aware of, be responsible for, be harmful to, be addicted to xuất hiện thường xuyên.', ex: 'Young people are increasingly [[addicted to]] their phones, which is quite [[worrying]].' }
    ],
    quiz: [
      { q: 'The results of the experiment were really ___.', options: ['surprised', 'surprise', 'surprising', 'surprisingly'], answer: 2, explain: 'Kết quả (vật) gây ra cảm giác ngạc nhiên → tính từ -ing: surprising. surprised dùng cho người cảm thấy ngạc nhiên; surprise là danh từ/động từ; surprisingly là trạng từ.' },
      { q: 'Many employees feel ___ after working twelve-hour shifts.', options: ['exhausted', 'exhausting', 'exhaust', 'exhaustion'], answer: 0, explain: 'Người cảm thấy kiệt sức → tính từ -ed: exhausted. exhausting mô tả công việc gây mệt; exhaust là động từ; exhaustion là danh từ.' },
      { q: 'Hanoi is famous ___ its street food.', options: ['of', 'with', 'about', 'for'], answer: 3, explain: 'be famous FOR sth = nổi tiếng vì/về → famous for its street food. of, with, about không đi với famous theo nghĩa này.' },
      { q: 'This new phone is very similar ___ the previous model.', options: ['with', 'to', 'as', 'than'], answer: 1, explain: 'be similar TO sth = giống với → similar to the previous model. with, as, than không đi với similar.' },
      { q: 'I was ___ by the size of the stadium.', options: ['impressed', 'impressive', 'impressing', 'impression'], answer: 0, explain: 'Người bị gây ấn tượng → impressed (by). impressive mô tả vật gây ấn tượng; impressing sai dạng; impression là danh từ.' },
      { q: 'The instructions were so ___ that nobody knew what to do.', options: ['confused', 'confuse', 'confusion', 'confusing'], answer: 3, explain: 'Hướng dẫn (vật) gây khó hiểu → confusing. confused dùng cho người cảm thấy bối rối; confuse là động từ; confusion là danh từ.' },
      { q: 'Câu nào đúng?', options: ['I am worried about the exam.', 'I am worried of the exam.', 'I am worrying about the exam result is bad.', 'I am worry about the exam.'], answer: 0, explain: 'Tính từ -ed chỉ cảm xúc của người: be worried ABOUT + danh từ (lo lắng về) → I am worried about the exam.' },
      { q: 'Câu nào đúng?', options: ['She is capable to run the company.', 'She is capable for running the company.', 'She is capable of run the company.', 'She is capable of running the company.'], answer: 3, explain: 'be capable OF + V-ing (có khả năng làm gì) → capable of running the company. "capable to run" sai giới từ; "capable for" sai giới từ; "capable of run" thiếu -ing.' },
      { q: 'Câu nào đúng?', options: ['The lecture was so bored that I fell asleep.', 'I was so boring that I fell asleep.', 'The lecture was so boring that I fell asleep.', 'The lecture bored so that I fell asleep.'], answer: 2, explain: 'Bài giảng gây chán → boring. "The lecture was so bored" sai (bài giảng không cảm thấy chán); "I was so boring" nghĩa là tôi gây chán; "bored so that" sai cấu trúc.' },
      { q: 'Phần nào sai? "Most visitors (A) were disappointing (B) with (C) the hotel service (D)."', options: ['Most visitors', 'were disappointing', 'with', 'the hotel service'], answer: 1, explain: 'Khách (người) cảm thấy thất vọng → were disappointed, nên phần sai là (B). Most visitors, with, the hotel service đều đúng.' },
      { q: 'Phần nào sai? "Teachers are (A) responsible to (B) creating (C) a safe environment (D)."', options: ['Teachers are', 'responsible to', 'creating', 'a safe environment'], answer: 1, explain: 'be responsible FOR + V-ing (chịu trách nhiệm) → phần sai là "responsible to". Teachers are, creating và a safe environment đều đúng.' },
      { q: 'Phần nào sai? "I am interested (A) in learn (B) more about (C) marine biology (D)."', options: ['I am interested', 'in learn', 'more about', 'marine biology'], answer: 1, explain: 'Sau giới từ in cần V-ing → interested in learning, nên phần sai là (B). I am interested, more about, marine biology đều đúng.' }
    ]
  });

  /* 11. so / such / too / enough */
  G.push({
    id: 'so-such-too-enough', unit: 'foundation', order: 11,
    title: 'So, such, too, enough & so…that / such…that', en: 'So / Such / Too / Enough', level: 'B1', emoji: '⚖️',
    summary: 'Nhấn mạnh mức độ bằng so/such, diễn tả "quá… đến nỗi không thể" bằng too, "đủ… để" bằng enough, và nêu kết quả bằng so…that / such…that.',
    blocks: [
      { type: 'diagram', caption: 'Chọn so hay such: nhìn từ đứng ngay sau', steps: [
        { t: 'Sau nó là tính từ / trạng từ đứng một mình?', c: 'if' },
        { t: 'Có → SO: so expensive, so quickly', c: 'result' },
        { t: '↓ Không, có danh từ', c: 'arrow' },
        { t: '(a/an) + tính từ + danh từ → SUCH: such an expensive city, such long queues', c: 'result' },
        { t: '↓ Muốn nói "quá mức, nên không thể"?', c: 'arrow' },
        { t: 'TOO + adj + (for sb) + to V: too expensive for students to rent', c: 'result' },
        { t: 'adj + ENOUGH + to V / ENOUGH + N: old enough to vote, enough money', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'So … that', parts: [ { t: 'S + V', c: 'subj' }, { t: 'so', c: 'adv' }, { t: 'adj / adv', c: 'verb' }, { t: 'that + kết quả', c: 'obj' } ], ex: 'The rent was [[so high that]] we had to move.' },
        { label: 'Such … that', parts: [ { t: 'S + V', c: 'subj' }, { t: 'such (a/an)', c: 'adv' }, { t: 'adj + N', c: 'verb' }, { t: 'that + kết quả', c: 'obj' } ], ex: 'It was [[such a long flight that]] I couldn\'t sleep.' },
        { label: 'Too … to', parts: [ { t: 'S + be', c: 'subj' }, { t: 'too', c: 'neg' }, { t: 'adj', c: 'verb' }, { t: '(for sb) to V', c: 'obj' } ], ex: 'The test was [[too difficult for most students to finish]].' },
        { label: 'Adj + enough', parts: [ { t: 'S + be', c: 'subj' }, { t: 'adj', c: 'verb' }, { t: 'enough', c: 'adv' }, { t: 'to V', c: 'obj' } ], ex: 'She isn\'t [[old enough to drive]].' },
        { label: 'Enough + N', parts: [ { t: 'S + V', c: 'subj' }, { t: 'enough', c: 'adv' }, { t: 'N', c: 'obj' }, { t: '(to V)', c: 'verb' } ], ex: 'Many hospitals don\'t have [[enough staff]].' }
      ] },
      { type: 'uses', items: [
        { title: 'So + adj / adv: nhấn mạnh', ex: 'Prices have risen [[so quickly]].', vi: 'Giá cả tăng nhanh quá.' },
        { title: 'Such + (a/an) + adj + N: nhấn mạnh có danh từ', ex: 'Vietnam has [[such friendly people]].', vi: 'Người Việt Nam thân thiện thật.' },
        { title: 'Too: quá mức, mang nghĩa tiêu cực / không thể', ex: 'The city center is [[too crowded to drive through]] at rush hour.', vi: 'Trung tâm thành phố quá đông để lái xe qua giờ cao điểm.' },
        { title: 'Enough: đủ (sau tính từ, trước danh từ)', ex: 'The salary is [[high enough to support]] a family.', vi: 'Mức lương đủ cao để nuôi một gia đình.' },
        { title: 'So many / so much / so few / so little + N', ex: 'There were [[so many applicants that]] the deadline was extended.', vi: 'Có nhiều ứng viên đến nỗi hạn chót được gia hạn.' }
      ] },
      { type: 'table', head: ['Cấu trúc', 'Đúng', 'Sai'], rows: [
        ['so + adj', 'so cold', 'such cold'],
        ['such + a + adj + N', 'such a cold day', 'so cold day'],
        ['such + adj + N số nhiều / không đếm được', 'such cold weather', 'such a cold weather'],
        ['so many / much + N', 'so many cars', 'such many cars'],
        ['adj + enough', 'big enough', 'enough big'],
        ['enough + N', 'enough space', 'space enough (cổ)']
      ] },
      { type: 'tip', text: 'Too không có nghĩa là "rất". "This film is too good" nghe như có vấn đề (quá hay đến mức…). Muốn khen, dùng very, really, so: This film is so good.' },
      { type: 'tip', text: 'Trong cấu trúc too…to và enough…to, không lặp lại tân ngữ ở cuối: The box was too heavy to lift (không nói to lift it) khi chủ ngữ chính là tân ngữ của động từ.' },
      { type: 'mistake', wrong: 'It was so a beautiful beach.', right: 'It was such a beautiful beach.', why: 'Có a + tính từ + danh từ → dùng such.' },
      { type: 'mistake', wrong: 'He is enough tall to play basketball.', right: 'He is tall enough to play basketball.', why: 'Enough đứng SAU tính từ.' },
      { type: 'mistake', wrong: 'The weather was too hot that we stayed inside.', right: 'The weather was so hot that we stayed inside.', why: 'Kết quả với that dùng so…that; too đi với to V.' },
      { type: 'ielts', text: 'So…that / such…that giúp nối nguyên nhân – kết quả trong một câu phức, ăn điểm Grammatical Range. Not… enough và too… to là cách lịch sự để nêu hạn chế trong Task 2.', ex: 'Housing in many capitals has become [[so expensive that]] young professionals cannot afford to live near their workplaces.' }
    ],
    quiz: [
      { q: 'It was ___ interesting talk that nobody left early.', options: ['so', 'such an', 'such', 'too'], answer: 1, explain: 'a/an + tính từ + danh từ số ít → such an (interesting bắt đầu bằng nguyên âm). so không đứng trước a/an + N; "such" thiếu an; too sai nghĩa và cấu trúc.' },
      { q: 'The coffee was ___ hot to drink.', options: ['too', 'so', 'such', 'enough'], answer: 0, explain: 'Quá… đến mức không thể làm gì → too + adj + to V → too hot to drink. so cần that; such cần danh từ; enough phải đứng sau tính từ và mang nghĩa ngược lại.' },
      { q: 'Are you ___ to join the army?', options: ['enough old', 'old enough', 'too old enough', 'so old'], answer: 1, explain: 'Tính từ + enough + to V (đủ… để) → old enough. enough đứng SAU tính từ. "enough old" sai vị trí; "too old enough" trộn hai cấu trúc; "so old" cần that.' },
      { q: 'There were ___ people at the concert that we couldn\'t see the stage.', options: ['such', 'so much', 'too many', 'so many'], answer: 3, explain: 'people đếm được + kết quả với that → so many people that… such không đi trực tiếp với many; so much dùng cho danh từ không đếm được; too many không đi với that.' },
      { q: 'We had ___ terrible weather that the game was canceled.', options: ['such', 'such a', 'so', 'too'], answer: 0, explain: 'Weather không đếm được → such + adj + N (không có a). "such a" sai vì weather không đếm được; so không đứng trước adj + N; too không đi với that.' },
      { q: 'The bus was so slow ___ I missed my interview.', options: ['as', 'to', 'that', 'than'], answer: 2, explain: 'so + adj + that + kết quả → so slow that I missed… as, to, than không tạo cấu trúc kết quả với so.' },
      { q: 'Câu nào đúng?', options: ['There isn\'t money enough for the project.', 'There isn\'t enough of money for the project.', 'There isn\'t enough money for the project.', 'There isn\'t enough the money for the project.'], answer: 2, explain: 'enough + danh từ (đủ cái gì) → enough money; enough đứng TRƯỚC danh từ, không có of/the. "money enough" sai vị trí; "enough of money" thừa of; "enough the money" thừa the.' },
      { q: 'Câu nào đúng?', options: ['The room was too small for us to work in it.', 'The room was so small to work in.', 'The room was too small enough to work in.', 'The room was too small for us to work in.'], answer: 3, explain: 'too + adj + for sb + to V, không lặp tân ngữ it ở cuối → too small for us to work in. Câu 1 thừa it; "so small to" sai cấu trúc; "too small enough" trộn hai cấu trúc.' },
      { q: 'Câu nào đúng?', options: ['She speaks such fluent English that people think she is British.', 'She speaks English such fluently.', 'She speaks so fluent English.', 'She speaks English too fluently that people think she is British.'], answer: 0, explain: 'such + tính từ + danh từ không đếm được (fluent English) + that → such fluent English that…' },
      { q: 'Phần nào sai? "It was (A) so (B) a difficult exam (C) that many people failed (D)."', options: ['It was', 'so', 'a difficult exam', 'that many people failed'], answer: 1, explain: 'Trước a + tính từ + danh từ phải dùng such, không dùng so → such a difficult exam. Phần sai là "so".' },
      { q: 'Phần nào sai? "The suitcase (A) was (B) enough light (C) to carry onto the plane (D)."', options: ['The suitcase', 'was', 'enough light', 'to carry onto the plane'], answer: 2, explain: 'enough đứng SAU tính từ → light enough, nên phần sai là (C). The suitcase, was, to carry onto the plane đều đúng.' },
      { q: 'Phần nào sai? "The traffic (A) was (B) too heavy that (C) we arrived late (D)."', options: ['The traffic', 'was', 'too heavy that', 'we arrived late'], answer: 2, explain: 'Kết quả với that dùng so + adj + that → so heavy that, không dùng too, nên phần sai là (C). The traffic, was, we arrived late đều đúng.' }
    ]
  });

  /* 12. Adverbs: frequency, degree, sentence adverbs */
  G.push({
    id: 'adverbs-position', unit: 'foundation', order: 12,
    title: 'Trạng từ tần suất, mức độ, trạng từ câu & vị trí', en: 'Adverbs of Frequency, Degree & Sentence Adverbs', level: 'B2', emoji: '📍',
    summary: 'Đặt trạng từ tần suất (always, rarely), mức độ (extremely, fairly) và trạng từ câu (generally, arguably, surprisingly) vào đúng vị trí để câu tự nhiên và học thuật.',
    blocks: [
      { type: 'scale', caption: 'Thang tần suất (ước lượng %)', items: [ { t: 'always', v: 100 }, { t: 'usually / normally', v: 85 }, { t: 'often / frequently', v: 70 }, { t: 'sometimes', v: 50 }, { t: 'occasionally', v: 30 }, { t: 'rarely / seldom', v: 12 }, { t: 'hardly ever', v: 5 }, { t: 'never', v: 0 } ] },
      { type: 'formula', rows: [
        { label: 'Trước động từ thường', parts: [ { t: 'S', c: 'subj' }, { t: 'often / rarely', c: 'adv' }, { t: 'V', c: 'verb' } ], ex: 'Students [[rarely]] read printed newspapers.' },
        { label: 'Sau be / trợ động từ đầu tiên', parts: [ { t: 'S', c: 'subj' }, { t: 'be / aux', c: 'aux' }, { t: 'always / never', c: 'adv' }, { t: 'V / adj', c: 'verb' } ], ex: 'Public transport is [[usually]] cheaper. / I have [[never]] been abroad.' },
        { label: 'Mức độ + tính từ / trạng từ', parts: [ { t: 'extremely / fairly / slightly', c: 'adv' }, { t: 'adj / adv', c: 'verb' } ], ex: 'The figures are [[slightly]] lower than expected.' },
        { label: 'Trạng từ câu (đầu câu + dấu phẩy)', parts: [ { t: 'Generally / Arguably / Surprisingly,', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: '[[Surprisingly]], rural areas recorded higher growth.' },
        { label: 'Cụm tần suất (cuối câu)', parts: [ { t: 'S + V + O', c: 'subj' }, { t: 'once a week / every day', c: 'time' } ], ex: 'I go swimming [[twice a week]].' }
      ] },
      { type: 'uses', items: [
        { title: 'Tần suất: trước động từ thường, sau be', ex: 'People [[often]] underestimate the cost of owning a car.', vi: 'Người ta thường đánh giá thấp chi phí sở hữu ô tô.' },
        { title: 'Mức độ: đứng trước tính từ/trạng từ được bổ nghĩa', ex: 'The new metro line is [[remarkably]] efficient.', vi: 'Tuyến tàu điện mới vận hành hiệu quả đáng kể.' },
        { title: 'Trạng từ câu: thể hiện quan điểm người viết về cả câu', ex: '[[Arguably]], the internet has done more for education than any other invention.', vi: 'Có thể nói internet đã đóng góp cho giáo dục nhiều hơn bất kỳ phát minh nào khác.' },
        { title: 'Trạng từ câu để khái quát / thận trọng (hedging)', ex: '[[Generally speaking]], older people prefer face-to-face services.', vi: 'Nhìn chung, người lớn tuổi thích dịch vụ trực tiếp hơn.' },
        { title: 'Sometimes / usually / occasionally có thể đứng đầu câu để nhấn mạnh', ex: '[[Occasionally]], the river floods the lower part of the town.', vi: 'Thỉnh thoảng sông dâng nước làm ngập khu thấp của thị trấn.' }
      ] },
      { type: 'table', head: ['Loại', 'Ví dụ', 'Vị trí thường gặp'], rows: [
        ['Tần suất', 'always, usually, often, rarely, never', 'trước V thường / sau be, aux'],
        ['Mức độ', 'extremely, highly, fairly, quite, slightly, rather', 'trước adj / adv'],
        ['Quan điểm', 'arguably, undoubtedly, surprisingly, interestingly', 'đầu câu + dấu phẩy'],
        ['Khái quát', 'generally, typically, overall, broadly', 'đầu câu hoặc sau S'],
        ['Thời gian xác định', 'every day, once a month, in 2020', 'cuối câu']
      ] },
      { type: 'tip', text: 'Trạng từ KHÔNG chen giữa động từ và tân ngữ: I really like music (đúng), không nói I like very much music – hãy nói I like music very much.' },
      { type: 'tip', text: 'Các từ phủ định như never, rarely, seldom, hardly ever không dùng chung với not: I never eat fast food (không nói I don\'t never eat).' },
      { type: 'mistake', wrong: 'I go always to the gym after work.', right: 'I always go to the gym after work.', why: 'Trạng từ tần suất đứng trước động từ thường.' },
      { type: 'mistake', wrong: 'She speaks very well English.', right: 'She speaks English very well.', why: 'Không đặt trạng từ giữa động từ và tân ngữ.' },
      { type: 'mistake', wrong: 'He is late usually for class.', right: 'He is usually late for class.', why: 'Với be, trạng từ tần suất đứng ngay sau be.' },
      { type: 'ielts', text: 'Trạng từ câu như arguably, admittedly, undoubtedly, interestingly giúp thể hiện lập trường trong Task 2. Task 1 cần trạng từ mức độ chính xác: slightly, considerably, substantially. Speaking Part 1: trả lời tần suất tự nhiên (I hardly ever…, I tend to… once a week).', ex: '[[Admittedly]], online learning has drawbacks, but it is [[undoubtedly]] more flexible.' }
    ],
    quiz: [
      { q: 'My grandparents ___ use the internet.', options: ['rarely', 'are rarely', 'rarely do', 'do rarely not'], answer: 0, explain: 'Trạng từ tần suất đứng trước động từ thường → rarely use. "are rarely use" thừa be; "rarely do use" dùng do nhấn mạnh không cần thiết; "do rarely not" sai.' },
      { q: 'The figures for 2021 were ___ higher than those for 2020.', options: ['slight', 'slightly', 'very', 'more'], answer: 1, explain: 'Bổ nghĩa cho tính từ so sánh higher → trạng từ slightly. slight là tính từ; "very" không bổ nghĩa cho tính từ so sánh (phải là much / far higher); more trùng với dạng so sánh.' },
      { q: '___, the cheapest option turned out to be the most reliable.', options: ['Surprising', 'Surprise', 'To surprise', 'Surprisingly'], answer: 3, explain: 'Trạng từ câu thể hiện quan điểm người viết → Surprisingly, … Surprising là tính từ; Surprise là danh từ/động từ; To surprise sai nghĩa.' },
      { q: 'I have ___ been to a music festival.', options: ['ever never', 'not never', 'never', 'never not'], answer: 2, explain: 'Sau trợ động từ have: have never been. Không dùng hai phủ định. "ever never", "not never", "never not" đều là phủ định kép hoặc sai trật tự.' },
      { q: 'Students are ___ tired on Monday mornings.', options: ['often', 'oftenly', 'often are', 'often do'], answer: 0, explain: 'Trạng từ tần suất đứng SAU động từ be và trước động từ thường → are often tired. "oftenly" không tồn tại; "often are" sai vị trí; "often do" thừa trợ động từ.' },
      { q: '___ speaking, women live longer than men.', options: ['General', 'Generally', 'Generality', 'Generalize'], answer: 1, explain: 'Cụm cố định Generally speaking (nói chung). General là tính từ; Generality là danh từ; Generalize là động từ.' },
      { q: 'Câu nào đúng?', options: ['I like very much reading novels.', 'I very like reading novels.', 'I really like reading novels.', 'I like reading very much novels.'], answer: 2, explain: 'Really đứng trước động từ; very much đặt cuối câu. Không chen giữa V và O. "like very much reading" chen trạng từ giữa động từ và tân ngữ; "very like" sai; câu 4 đặt very much sai vị trí.' },
      { q: 'Câu nào đúng?', options: ['She has always been interested in politics.', 'She has been interested always in politics.', 'She has been always interested in politics.', 'Always she has been interested in politics.'], answer: 0, explain: 'Với nhiều trợ động từ, always đứng sau trợ động từ đầu tiên: has always been. Ba phương án còn lại đặt always sai vị trí so với trợ động từ.' },
      { q: 'Câu nào đúng?', options: ['He doesn\'t hardly ever cook.', 'He cooks hardly ever not.', 'He hardly ever doesn\'t cook.', 'He hardly ever cooks.'], answer: 3, explain: 'Hardly ever đã mang nghĩa phủ định, đứng trước động từ thường. "doesn\'t hardly" là phủ định kép; hai câu còn lại sai trật tự và thừa phủ định.' },
      { q: 'Phần nào sai? "Tourists (A) visit usually (B) the old quarter (C) in the evening (D)."', options: ['Tourists', 'visit usually', 'the old quarter', 'in the evening'], answer: 1, explain: 'usually đứng trước động từ thường → usually visit, nên phần sai là (B) visit usually. Tourists, the old quarter, in the evening đều đúng.' },
      { q: 'Phần nào sai? "The government (A) has spent (B) money wisely (C) never (D)."', options: ['The government', 'has spent', 'money wisely', 'never'], answer: 3, explain: 'Never đứng sau trợ động từ: has never spent money wisely. The government, has spent và money wisely đều đúng.' },
      { q: 'Phần nào sai? "My brother (A) plays very well (B) the guitar (C) on weekends (D)."', options: ['My brother', 'plays very well', 'the guitar', 'on weekends'], answer: 1, explain: 'Không đặt very well giữa động từ và tân ngữ: plays the guitar very well. My brother, the guitar và at weekends đều đúng.' }
    ]
  });
})(typeof self !== 'undefined' ? self : this);
