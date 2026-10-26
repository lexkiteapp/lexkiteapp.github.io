/* Ngữ pháp – Cấu trúc học thuật & nâng band (tự biên soạn) */
(function (g) {
  const G = g.GRAMMAR = g.GRAMMAR || [];

  /* ===================== UNIT: ACADEMIC ===================== */

  G.push({
    id: 'participle-clauses', unit: 'academic', order: 1,
    title: 'Mệnh đề phân từ', en: 'Participle Clauses', level: 'B2', emoji: '✂️',
    summary: 'Rút gọn mệnh đề trạng ngữ hoặc mệnh đề quan hệ bằng V-ing, V3/ed hoặc Having V3 để câu văn gọn và học thuật hơn – với điều kiện hai vế cùng chủ ngữ.',
    blocks: [
      { type: 'diagram', caption: 'Rút gọn một mệnh đề trạng ngữ thành mệnh đề phân từ', steps: [
        { t: 'After the council had analyzed the data, it changed the policy.', c: 'note' },
        { t: 'Hai vế có cùng chủ ngữ (the council = it)?', c: 'if' },
        { t: '↓ Có → bỏ liên từ và chủ ngữ ở vế phụ', c: 'arrow' },
        { t: 'Chủ động, xảy ra trước? → Having + V3', c: 'if' },
        { t: 'Having analyzed the data, the council changed the policy.', c: 'result' },
        { t: 'Bị động? → V3/ed: Built in 1990, the bridge needs repairs.', c: 'passive' },
        { t: 'Chủ động, cùng lúc? → V-ing: Living abroad, I learned to cook.', c: 'active' }
      ] },
      { type: 'formula', rows: [
        { label: 'Chủ động, đồng thời / nguyên nhân', parts: [ { t: 'V-ing …', c: 'verb' }, { t: ',', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'V …', c: 'verb' } ], ex: '[[Realizing the deadline was close]], the students worked through the night.' },
        { label: 'Chủ động, xảy ra trước', parts: [ { t: 'Having + V3 …', c: 'aux' }, { t: ',', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'V …', c: 'verb' } ], ex: '[[Having completed the survey]], researchers began to analyze the results.' },
        { label: 'Bị động', parts: [ { t: 'V3/ed …', c: 'verb' }, { t: ',', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'V …', c: 'verb' } ], ex: '[[Designed for commuters]], the app shows live bus times.' },
        { label: 'Phủ định', parts: [ { t: 'Not', c: 'neg' }, { t: 'V-ing / having V3 …', c: 'verb' }, { t: ',', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'V …', c: 'verb' } ], ex: '[[Not having studied economics]], she found the lecture difficult.' }
      ] },
      { type: 'uses', items: [
        { title: 'Thay mệnh đề thời gian (when/after/while)', ex: '[[Having moved to the city]], many young people struggle with high rents.', vi: 'Sau khi chuyển đến thành phố, nhiều người trẻ chật vật với giá thuê nhà cao.' },
        { title: 'Thay mệnh đề nguyên nhân (because/as/since)', ex: '[[Lacking public funding]], the museum was forced to close.', vi: 'Vì thiếu kinh phí công, bảo tàng buộc phải đóng cửa.' },
        { title: 'Bị động, thay cho mệnh đề quan hệ', ex: 'The figures [[shown in the table]] refer to full-time workers.', vi: 'Các số liệu được thể hiện trong bảng là về người lao động toàn thời gian.' },
        { title: 'Chủ động, thay cho mệnh đề quan hệ', ex: 'Students [[living on campus]] tend to spend less on transport.', vi: 'Sinh viên sống trong khuôn viên trường thường chi ít hơn cho việc đi lại.' },
        { title: 'Nêu kết quả ở cuối câu (…, V-ing)', ex: 'Fuel prices rose sharply, [[causing a fall in car sales]].', vi: 'Giá nhiên liệu tăng mạnh, dẫn đến doanh số ô tô giảm.' }
      ] },
      { type: 'table', head: ['Mệnh đề đầy đủ', 'Mệnh đề phân từ', 'Ý nghĩa'], rows: [
        ['Because he felt tired, he…', 'Feeling tired, he…', 'Chủ động, cùng lúc / lý do'],
        ['After she had finished, she…', 'Having finished, she…', 'Chủ động, xảy ra trước'],
        ['The tower, which was built in 1990,…', 'The tower, built in 1990,…', 'Bị động'],
        ['When it is heated, water…', 'When heated, water…', 'Giữ liên từ để rõ nghĩa'],
        ['…, which caused delays.', '…, causing delays.', 'Kết quả của cả vế trước']
      ] },
      { type: 'tip', text: 'Có thể giữ lại liên từ cho rõ nghĩa: when, while, after, before, since, once, if, unless + V-ing/V3. Ví dụ: Once installed, the software updates automatically.' },
      { type: 'tip', text: 'Trong Task 1, cấu trúc “…, reaching/hitting + số liệu” và “…, accounting for + %” giúp nối hai ý thành một câu rất tự nhiên.' },
      { type: 'mistake', wrong: 'Walking along the beach, the sunset was beautiful.', right: 'Walking along the beach, we saw a beautiful sunset.', why: 'Lỗi “dangling participle”: chủ ngữ của vế chính phải là người thực hiện hành động walking. Hoàng hôn không thể đi dạo.' },
      { type: 'mistake', wrong: 'Having built in 1990, the stadium needs repairs.', right: 'Built in 1990, the stadium needs repairs.', why: 'Sân vận động được xây (bị động) → dùng V3, không dùng Having + V3 (chủ động).' },
      { type: 'mistake', wrong: 'Finished the essay, she submitted it online.', right: 'Having finished the essay, she submitted it online.', why: 'Cô ấy tự hoàn thành (chủ động) rồi mới nộp → Having + V3. “Finished” đứng một mình sẽ mang nghĩa bị động.' },
      { type: 'ielts', text: 'Mệnh đề phân từ là dấu hiệu rõ ràng của “complex structures” trong tiêu chí Grammatical Range. Dùng 2–3 câu trong một bài là đủ, và luôn kiểm tra chủ ngữ của vế chính.', ex: '[[Having risen steadily for a decade]], the number of online shoppers peaked in 2020, [[accounting for almost 70% of adults]].' }
    ],
    quiz: [
      { q: '___ in 1885, the bridge is one of the oldest in the region.', options: ['Building', 'Built', 'Having built', 'To build'], answer: 1, explain: 'Cây cầu được xây (nghĩa bị động) → phân từ quá khứ Built. Building và Having built mang nghĩa chủ động (cầu tự xây); To build chỉ mục đích.' },
      { q: '___ the instructions, the candidates began the test.', options: ['Having read', 'Read', 'Been reading', 'Having been read'], answer: 0, explain: 'Thí sinh đọc hướng dẫn xong rồi mới bắt đầu (chủ động, xảy ra trước) → Having read. Read là V nguyên mẫu/V3, không rõ trình tự; "Been reading" thiếu Having; "Having been read" là bị động (thí sinh bị đọc).' },
      { q: 'Unemployment rose sharply, ___ a wave of protests.', options: ['triggered', 'having triggered', 'to trigger', 'triggering'], answer: 3, explain: '“…, V-ing” diễn tả kết quả của cả vế trước → triggering. triggered là bị động; having triggered nhấn mạnh trước đó, không hợp; to trigger chỉ mục đích.' },
      { q: '___ enough sleep, many teenagers find it hard to concentrate.', options: ['Not getting', 'Getting not', 'Don\'t getting', 'No got'], answer: 0, explain: 'Phủ định của mệnh đề phân từ: Not + V-ing → Not getting enough sleep. "Getting not", "Don\'t getting", "No got" đều sai trật tự hoặc sai dạng.' },
      { q: 'Most of the goods ___ in this factory are exported to Europe.', options: ['producing', 'produce', 'produced', 'are produced'], answer: 2, explain: 'Rút gọn mệnh đề quan hệ bị động “which are produced” → produced. producing mang nghĩa chủ động; produce và "are produced" tạo thêm động từ chính.' },
      { q: 'When ___ properly, solar panels can last for 25 years.', options: ['maintaining', 'maintained', 'maintain', 'having maintained'], answer: 1, explain: 'Tấm pin được bảo dưỡng (bị động) → When maintained. maintaining mang nghĩa chủ động (tấm pin tự bảo dưỡng); maintain và having maintained sai dạng/nghĩa.' },
      { q: 'Câu nào đúng?', options: ['Arriving at the airport, my flight had been canceled.', 'Having arrived at the airport, the flight was canceled.', 'Arriving at the airport, I discovered my flight had been canceled.', 'Arrived at the airport, I discovered the flight was canceled.'], answer: 2, explain: 'Chủ ngữ “I” là người đến sân bay → hợp lý. Hai câu đầu bị lỗi dangling participle; câu cuối sai dạng (Arrived mang nghĩa bị động).' },
      { q: 'Câu nào đúng?', options: ['Having been warned about the storm, the fishermen stayed in port.', 'Having warned about the storm, the fishermen stayed in port.', 'Warning about the storm, the fishermen stayed in port.', 'Been warned about the storm, the fishermen stayed in port.'], answer: 0, explain: 'Ngư dân được cảnh báo (bị động, xảy ra trước) → Having been + V3. "Having warned" và "Warning" mang nghĩa chủ động (ngư dân cảnh báo); "Been warned" thiếu Having.' },
      { q: 'Câu nào đúng?', options: ['The data collecting by the team was unreliable.', 'People wanting to apply should register online.', 'Students wanted to apply should register online.', 'The report publishing last year was criticised.'], answer: 1, explain: 'People want to apply (chủ động) → wanting. Các câu khác đảo ngược chủ động/bị động. Câu 1 và 4 dùng V-ing với nghĩa bị động (dữ liệu được thu thập, báo cáo được xuất bản); câu 3 dùng V3 với nghĩa chủ động.' },
      { q: 'Câu nào cùng nghĩa? “Because she had lived in Japan, she spoke fluent Japanese.”', options: ['Living in Japan, she will speak fluent Japanese.', 'Lived in Japan, she spoke fluent Japanese.', 'Having been lived in Japan, she spoke fluent Japanese.', 'Having lived in Japan, she spoke fluent Japanese.'], answer: 3, explain: 'Hành động sống ở Nhật xảy ra trước, chủ động → Having lived. "Living… will speak" sai thì; "Lived" sai dạng; "Having been lived" là bị động, sai.' },
      { q: 'Câu nào cùng nghĩa? “The policy, which was introduced in 2015, reduced plastic waste.”', options: ['The policy introducing in 2015 reduced plastic waste.', 'The policy, introduced in 2015, reduced plastic waste.', 'Introducing in 2015, the policy reduced plastic waste.', 'The policy, having introduced in 2015, reduced plastic waste.'], answer: 1, explain: 'Rút gọn mệnh đề quan hệ bị động (which was introduced) → introduced. introducing/Introducing mang nghĩa chủ động (chính sách tự giới thiệu); having introduced cũng chủ động, sai nghĩa.' },
      { q: 'Câu nào cùng nghĩa? “The price of oil fell, and this led to lower gas prices.”', options: ['The price of oil fell, led to lower gas prices.', 'Leading to lower gas prices, the price of oil was fallen.', 'The price of oil fell, leading to lower gas prices.', 'The price of oil falling, which led to lower gas prices.'], answer: 2, explain: '“…, V-ing” thay cho “and this + V” để nêu kết quả. "fell, led" là comma splice; câu 2 sai bị động "was fallen"; câu 4 thiếu động từ chính.' }
    ]
  });

  G.push({
    id: 'subjunctive', unit: 'academic', order: 2,
    title: 'Thức giả định & cấu trúc đề xuất', en: 'The Subjunctive & Mandative Structures', level: 'C1', emoji: '📜',
    summary: 'Sau các động từ/tính từ chỉ đề nghị, yêu cầu, sự cần thiết (suggest, recommend, insist, essential…), mệnh đề that dùng động từ nguyên mẫu không chia cho mọi chủ ngữ.',
    blocks: [
      { type: 'sort', caption: 'Những từ kích hoạt thức giả định (that + S + V nguyên mẫu)', groups: [
        { title: 'Động từ', emoji: '🗣️', items: ['suggest', 'recommend', 'propose', 'insist', 'demand', 'request', 'require', 'urge', 'advise'] },
        { title: 'Tính từ / danh từ', emoji: '❗', items: ['essential', 'vital', 'crucial', 'necessary', 'important', 'imperative', 'a requirement', 'a proposal', 'a recommendation'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Sau động từ', parts: [ { t: 'S', c: 'subj' }, { t: 'suggest/recommend/insist', c: 'verb' }, { t: 'that', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: 'Experts [[recommend that every child learn]] to swim.' },
        { label: 'Sau tính từ', parts: [ { t: 'It is', c: 'aux' }, { t: 'essential / vital', c: 'adv' }, { t: 'that', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: 'It is [[vital that the government act]] quickly.' },
        { label: 'Phủ định', parts: [ { t: 'that', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'not', c: 'neg' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: 'The doctor [[insisted that he not return]] to work yet.' },
        { label: 'Bị động', parts: [ { t: 'that', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'be', c: 'aux' }, { t: 'V3', c: 'verb' } ], ex: 'The committee [[proposed that the fee be reduced]].' }
      ] },
      { type: 'uses', items: [
        { title: 'Đưa ra đề xuất trong bài Task 2', ex: 'I would [[suggest that schools introduce]] financial literacy classes.', vi: 'Tôi đề xuất các trường học đưa vào lớp giáo dục tài chính.' },
        { title: 'Nhấn mạnh sự cần thiết', ex: 'It is [[essential that every citizen have]] access to clean water.', vi: 'Điều thiết yếu là mọi công dân được tiếp cận nước sạch.' },
        { title: 'Yêu cầu, quy định chính thức', ex: 'The university [[requires that each applicant submit]] two references.', vi: 'Trường đại học yêu cầu mỗi ứng viên nộp hai thư giới thiệu.' },
        { title: 'Dạng bị động với be', ex: 'Campaigners [[demand that the forest be protected]].', vi: 'Các nhà vận động yêu cầu khu rừng phải được bảo vệ.' },
        { title: 'Cách thay thế (Anh-Anh): should + V', ex: 'The report [[recommends that cars should be banned]] from the center.', vi: 'Báo cáo khuyến nghị cấm ô tô vào khu trung tâm.' }
      ] },
      { type: 'table', head: ['Cấu trúc', 'Đúng', 'Sai'], rows: [
        ['suggest that + S + V', 'She suggested that he apply early.', 'She suggested him to apply early.'],
        ['suggest + V-ing', 'She suggested applying early.', 'She suggested to apply early.'],
        ['recommend + O + to V', 'They recommend students to read widely.', '(chấp nhận được, ít trang trọng hơn)'],
        ['It is essential that + S + V', 'It is essential that he be on time.', 'It is essential that he is on time. (văn nói)'],
        ['insist on + V-ing', 'He insisted on paying.', 'He insisted to pay.']
      ] },
      { type: 'tip', text: 'Dấu hiệu dễ nhận: chủ ngữ ngôi thứ ba số ít nhưng động từ KHÔNG có -s (that the city invest…). Nếu chưa tự tin, dùng “should + V” – vẫn đúng trong tiếng Anh-Anh.' },
      { type: 'mistake', wrong: 'The teacher suggested me to rewrite the essay.', right: 'The teacher suggested that I rewrite the essay.', why: '“suggest” không đi với cấu trúc O + to V. Dùng suggest that + S + V hoặc suggest + V-ing.' },
      { type: 'mistake', wrong: 'It is important that the government invests in education.', right: 'It is important that the government invest in education.', why: 'Trong văn học thuật trang trọng, sau It is important that dùng động từ nguyên mẫu, không thêm -s.' },
      { type: 'mistake', wrong: 'They demanded that the factory was closed.', right: 'They demanded that the factory be closed.', why: 'Dạng bị động của thức giả định là be + V3, không lùi thì thành was.' },
      { type: 'ielts', text: 'Đoạn giải pháp hoặc kết luận của Task 2 là chỗ lý tưởng cho thức giả định. Một câu dùng đúng cho thấy bạn kiểm soát được cấu trúc ít phổ biến.', ex: 'It is therefore [[imperative that local authorities provide]] affordable childcare and that [[employers be required]] to offer flexible hours.' }
    ],
    quiz: [
      { q: 'The committee recommended that the project ___ postponed.', options: ['is', 'was', 'be', 'being'], answer: 2, explain: 'Sau recommend that… dùng thể giả định; dạng bị động là be + V3 → be postponed. is và was chia theo chủ ngữ (không giả định); being sai cấu trúc.' },
      { q: 'It is essential that every student ___ a copy of the handbook.', options: ['receive', 'receiving', 'received', 'to receive'], answer: 0, explain: 'Sau It is essential that dùng V nguyên mẫu cho mọi chủ ngữ. receiving sai dạng; received chia thường, không phải giả định; "to receive" sai cấu trúc.' },
      { q: 'My tutor suggested ___ more academic articles.', options: ['me to read', 'to read', 'that I reading', 'reading'], answer: 3, explain: 'suggest + V-ing hoặc suggest that + S + V; không dùng suggest + (O) + to V. "me to read" và "to read" sai với suggest; "that I reading" sai dạng.' },
      { q: 'The landlord insisted that the rent ___ paid on the first of the month.', options: ['being', 'to be', 'been', 'be'], answer: 3, explain: 'insist that + S + be + V3 (giả định, bị động) → be paid. being, to be, been đều sai dạng sau that + chủ ngữ.' },
      { q: 'Doctors advise that patients ___ eat for six hours before surgery.', options: ['are not', 'not', 'not to', 'doesn\'t'], answer: 1, explain: 'Phủ định thức giả định: that + S + not + V, không cần trợ động từ do. are not không đi với V nguyên mẫu; doesn\'t sai ngôi (patients số nhiều); "not to" thừa to.' },
      { q: 'It is vital that the public ___ informed about the risks.', options: ['being', 'been', 'be', 'to be'], answer: 2, explain: 'It is vital that + S + be + V3 (giả định bị động) → be informed. being, been, to be đều sai dạng sau that + chủ ngữ.' },
      { q: 'Câu nào đúng (thức giả định, văn trang trọng)?', options: ['The manager demanded that he apologizes.', 'The manager demanded that he apologize.', 'The manager demanded him to apologize.', 'The manager demanded that he apologized.'], answer: 1, explain: 'demand that + S + V nguyên mẫu (không thêm -s) → he apologize. apologizes và apologized chia thường; "demanded him to apologize" sai cấu trúc với demand.' },
      { q: 'Câu nào đúng (thức giả định, văn trang trọng)?', options: ['I propose that the council builds more cycle lanes.', 'I propose the council to build more cycle lanes.', 'I propose that the council build more cycle lanes.', 'I propose that the council building more cycle lanes.'], answer: 2, explain: 'propose that + S + V nguyên mẫu (build, không có -s). builds chia thường; "the council to build" sai cấu trúc; "building" sai dạng.' },
      { q: 'Câu nào đúng?', options: ['It is crucial that she not miss the deadline.', 'It is crucial that she doesn\'t misses the deadline.', 'It is crucial that she not to miss the deadline.', 'It is crucial for she not miss the deadline.'], answer: 0, explain: 'Phủ định thể giả định: S + not + V nguyên mẫu → she not miss. "doesn\'t misses" sai dạng; "not to miss" thừa to; "for she" sai đại từ sau for.' },
      { q: 'Câu nào cùng nghĩa? “Students must wear ID badges – the school insists on it.”', options: ['The school insists that students wear ID badges.', 'The school insists students to wear ID badges.', 'The school insists on students wear ID badges.', 'The school insists that students wore ID badges.'], answer: 0, explain: 'insist that + S + V nguyên mẫu → insists that students wear. "insists students to wear" sai cấu trúc; "insists on students wear" phải là wearing; "wore" chia quá khứ, không giả định.' },
      { q: 'Câu nào cùng nghĩa? “Why don\'t we meet again next week?” she said.', options: ['She suggested us to meet again the following week.', 'She suggested to meet again the following week.', 'She suggested meet again the following week.', 'She suggested that we meet again the following week.'], answer: 3, explain: 'Why don\'t we… → suggest that we + V (hoặc suggest meeting). "suggested us to meet", "suggested to meet" và "suggested meet" đều sai cấu trúc với suggest.' },
      { q: 'Câu nào cùng nghĩa? “Drivers must be tested every ten years. This is necessary.”', options: ['It is necessary that drivers are test every ten years.', 'It is necessary that drivers be tested every ten years.', 'It is necessary drivers to be tested every ten years.', 'It is necessary that drivers testing every ten years.'], answer: 1, explain: 'Sau It is necessary/essential/vital that… dùng thể giả định: S + be + V3 (bị động) hoặc S + V nguyên mẫu, không chia theo chủ ngữ → drivers be tested. "are test" sai dạng bị động, "to be tested" thiếu that + S, "testing" không có động từ chính.' },
      { q: 'The committee recommended that the proposal ___ postponed until next year.', options: ['be', 'being', 'to be', 'been'], answer: 0, explain: 'Sau recommend that… dùng thể giả định: S + be + V3 (bị động), động từ giữ nguyên mẫu → be postponed.' },
      { q: 'It is essential that every applicant ___ a valid passport.', options: ['having', 'to have', 'have', 'has had'], answer: 2, explain: 'It is essential that + S + V nguyên mẫu (thể giả định), không chia theo ngôi → every applicant have.' },
      { q: 'The doctor insisted that he ___ smoking immediately.', options: ['stopping', 'to stop', 'had stopped', 'stop'], answer: 3, explain: 'insist that + S + V nguyên mẫu (thể giả định) → he stop smoking. stopping, to stop và had stopped không phải thể giả định sau insist that.' },
      { q: '___ it not for the scholarship, she could not afford to study abroad.', options: ['Did', 'Should', 'Were', 'Had'], answer: 2, explain: 'Đảo ngữ câu điều kiện loại 2: Were it not for + N = If it were not for + N (nếu không nhờ có…) → Were.' },
      { q: 'She suggested that we ___ the meeting online.', options: ['will hold', 'hold', 'holding', 'to hold'], answer: 1, explain: 'suggest that + S + V nguyên mẫu (thể giả định) → we hold. Không dùng to V hay V-ing sau that + chủ ngữ.' },
      { q: 'Câu nào đúng?', options: ['It is vital that the data be checked carefully.', 'It is vital that the data is checking carefully.', 'It is vital that the data to be checked carefully.', 'It is vital the data being checked carefully.'], answer: 0, explain: 'It is vital that + S + be + V3 (thể giả định, bị động) → the data be checked.' }
    ]
  });

  G.push({
    id: 'preference-advice', unit: 'academic', order: 3,
    title: 'Had better, would rather, would prefer, it\'s time', en: 'Had better, Would rather, Would prefer, It\'s (high) time', level: 'B2', emoji: '⚖️',
    summary: 'Bốn cấu trúc diễn đạt lời khuyên, sự ưu tiên và sự thúc giục – mỗi cấu trúc đi với một dạng động từ khác nhau, và một số dùng thì quá khứ để nói về hiện tại.',
    blocks: [
      { type: 'scale', caption: 'Mức độ thúc giục / cảnh báo (0 = nhẹ nhàng, 100 = rất gấp)', items: [ { t: 'It\'s high time + past', v: 92 }, { t: 'had better (+ cảnh báo hậu quả)', v: 80 }, { t: 'It\'s time + to V', v: 60 }, { t: 'should', v: 45 }, { t: 'would rather / would prefer', v: 20 } ] },
      { type: 'formula', rows: [
        { label: 'Lời khuyên mạnh', parts: [ { t: 'S', c: 'subj' }, { t: 'had better (\'d better)', c: 'aux' }, { t: '(not)', c: 'neg' }, { t: 'V', c: 'verb' } ], ex: 'You[[\'d better not leave]] your laptop unattended.' },
        { label: 'Ưu tiên của mình', parts: [ { t: 'S', c: 'subj' }, { t: 'would rather', c: 'aux' }, { t: 'V', c: 'verb' }, { t: 'than V', c: 'obj' } ], ex: 'I[[\'d rather walk than wait]] for the bus.' },
        { label: 'Muốn người khác làm', parts: [ { t: 'S', c: 'subj' }, { t: 'would rather', c: 'aux' }, { t: 'S2', c: 'subj' }, { t: 'V2/ed (quá khứ)', c: 'verb' } ], ex: 'I[[\'d rather you didn\'t call]] me after 10 p.m.' },
        { label: 'Would prefer', parts: [ { t: 'S', c: 'subj' }, { t: 'would prefer', c: 'aux' }, { t: 'to V / N', c: 'verb' }, { t: 'rather than V', c: 'obj' } ], ex: 'Most commuters [[would prefer to work]] from home [[rather than travel]] daily.' },
        { label: 'Đã đến lúc', parts: [ { t: 'It\'s (high/about) time', c: 'time' }, { t: 'S', c: 'subj' }, { t: 'V2/ed', c: 'verb' } ], ex: '[[It\'s high time governments took]] climate change seriously.' }
      ] },
      { type: 'uses', items: [
        { title: 'Had better: lời khuyên kèm hậu quả nếu không làm', ex: 'You[[\'d better book]] early, or the course will be full.', vi: 'Bạn nên đăng ký sớm, nếu không khóa học sẽ hết chỗ.' },
        { title: 'Would rather + V: ưu tiên của bản thân', ex: 'Many young people [[would rather rent than buy]] an apartment.', vi: 'Nhiều người trẻ thích thuê hơn là mua căn hộ.' },
        { title: 'Would rather + S + quá khứ: mong người khác làm (ở hiện tại)', ex: 'My parents [[would rather I studied]] medicine.', vi: 'Bố mẹ tôi muốn tôi học y hơn.' },
        { title: 'Would prefer + to V / O + to V', ex: 'I [[would prefer my children to spend]] less time online.', vi: 'Tôi muốn con mình dành ít thời gian trên mạng hơn.' },
        { title: 'It\'s (high) time + quá khứ: lẽ ra phải làm rồi', ex: '[[It\'s about time the city invested]] in a metro system.', vi: 'Đã đến lúc thành phố đầu tư vào hệ thống tàu điện ngầm (lẽ ra phải làm từ lâu).' }
      ] },
      { type: 'table', head: ['Cấu trúc', 'Động từ theo sau', 'Ví dụ'], rows: [
        ['had better', 'V nguyên mẫu (không to)', 'We had better leave now.'],
        ['would rather (cùng chủ ngữ)', 'V nguyên mẫu + than + V', 'I\'d rather cook than eat out.'],
        ['would rather (khác chủ ngữ)', 'S + V2 (hiện tại) / had V3 (quá khứ)', 'I\'d rather you had told me.'],
        ['would prefer', 'to V / N / O + to V', 'I\'d prefer tea. / I\'d prefer to stay.'],
        ['prefer (sở thích chung)', 'N/V-ing + to + N/V-ing', 'I prefer reading to watching TV.'],
        ['It\'s time', 'to V / for O + to V / S + V2', 'It\'s time to go. / It\'s time we went.']
      ] },
      { type: 'tip', text: '“Had better” dù có chữ had nhưng nói về hiện tại/tương lai. Phủ định là had better NOT + V, không phải hadn\'t better.' },
      { type: 'tip', text: "Anh-Mỹ văn nói hay bỏ had: “You better hurry!” – nghe tự nhiên khi nói chuyện, nhưng trong bài viết và bài thi hãy dùng đầy đủ had better / 'd better. Tương tự, người Mỹ đôi khi nói “I'd rather you don't…”, nhưng dạng chuẩn vẫn là I'd rather you didn't…" },
      { type: 'mistake', wrong: 'You had better to check your answers.', right: 'You had better check your answers.', why: 'Sau had better dùng V nguyên mẫu không có to.' },
      { type: 'mistake', wrong: 'I would rather staying at home tonight.', right: 'I would rather stay at home tonight.', why: 'Would rather + V nguyên mẫu, không dùng V-ing.' },
      { type: 'mistake', wrong: 'It\'s high time we invest in renewable energy.', right: 'It\'s high time we invested in renewable energy.', why: 'Sau It\'s (high) time + S, động từ chia quá khứ dù nói về hiện tại.' },
      { type: 'ielts', text: 'Speaking Part 1 thường hỏi về sở thích (Do you prefer…?). Trả lời bằng would rather/would prefer và nêu lý do. Trong Task 2, “It is high time…” là một câu kết luận mạnh.', ex: 'To be honest, I[[\'d rather read]] the news on my phone [[than buy]] a paper, mainly because it\'s updated every few minutes.' }
    ],
    quiz: [
      { q: 'You ___ submit the form today; the deadline is tomorrow morning.', options: ['had better', 'would rather', 'had better to', 'would prefer'], answer: 0, explain: 'Lời khuyên gấp kèm lý do → had better + V nguyên mẫu. would rather và would prefer nói về sở thích; "had better to" thừa to.' },
      { q: 'I\'d rather you ___ smoke in the car.', options: ['don\'t', 'didn\'t', 'won\'t', 'not'], answer: 1, explain: 'would rather + S + V quá khứ (didn\'t) để nói về hiện tại. don\'t và won\'t không lùi thì; "not" thiếu trợ động từ.' },
      { q: 'It\'s high time the government ___ something about traffic congestion.', options: ['does', 'do', 'did', 'will do'], answer: 2, explain: 'It\'s high time + S + V2 (quá khứ đơn) = đã đến lúc phải làm gì (hàm ý lẽ ra phải làm từ trước) → did. Không dùng hiện tại (does/do) hay tương lai (will do) sau cấu trúc này.' },
      { q: 'Most employees would prefer ___ flexible hours.', options: ['had', 'have', 'to having', 'to have'], answer: 3, explain: 'would prefer + to V (muốn hơn, cho một lựa chọn cụ thể) → to have. had và have sai dạng; "to having" sai vì to ở đây không phải giới từ. Khác với prefer + V-ing (sở thích chung).' },
      { q: 'I prefer studying in the morning ___ studying late at night.', options: ['than', 'to', 'rather', 'from'], answer: 1, explain: 'prefer V-ing TO V-ing → prefer studying… to studying. Sau prefer không dùng than; rather và from không đi với prefer.' },
      { q: 'We\'d better ___ late, or we\'ll miss the opening speech.', options: ['not be', 'not to be', 'don\'t be', 'haven\'t been'], answer: 0, explain: 'Phủ định của had better: had better not + V → We\'d better not be late. "not to be" thừa to; "don\'t be" và "haven\'t been" sai cấu trúc.' },
      { q: 'Câu nào đúng?', options: ['I\'d rather to take the train.', 'I\'d rather take the train than to drive.', 'I\'d rather take the train than drive.', 'I\'d rather taking the train than driving.'], answer: 2, explain: 'would rather V than V – cả hai động từ đều nguyên mẫu không to. "rather to take" thừa to; "than to drive" thừa to; "taking… driving" sai dạng.' },
      { q: 'Câu nào đúng?', options: ['You hadn\'t better ignore the warning.', 'You had better not ignore the warning.', 'You had not better to ignore the warning.', 'You better not to ignore the warning.'], answer: 1, explain: 'Phủ định đúng: had better not + V → You had better not ignore. "hadn\'t better" và "had not better to" sai vị trí not; "better not to" thiếu had và thừa to.' },
      { q: 'Câu nào đúng?', options: ['It\'s time for us leaving.', 'It\'s time for we to leave.', 'It\'s time us to leave.', 'It\'s time for us to leave.'], answer: 3, explain: 'It\'s time for + tân ngữ + to V → It\'s time for us to leave (hoặc It\'s time we left). "for us leaving", "for we" (phải dùng tân ngữ us), "us to leave" thiếu for đều sai.' },
      { q: 'Câu nào cùng nghĩa? “I want you to stay here rather than go out.”', options: ['I\'d rather you stayed here.', 'I\'d rather you to stay here.', 'I\'d rather stay here.', 'I\'d better you stayed here.'], answer: 0, explain: 'Mong người khác làm gì: would rather + S + V2 → I\'d rather you stayed here. "rather you to stay" sai cấu trúc; "I\'d rather stay" đổi người thực hiện; "I\'d better you stayed" sai cấu trúc.' },
      { q: 'Câu nào cùng nghĩa? “The council should have repaired the roads long ago.”', options: ['It\'s time the council repairs the roads.', 'The council had better repaired the roads.', 'It\'s high time the council repaired the roads.', 'The council would rather repair the roads.'], answer: 2, explain: 'Lẽ ra phải làm từ lâu → It\'s high time + S + V2 → It\'s high time the council repaired… "repairs" phải lùi về V2; "had better repaired" sai dạng; would rather đổi nghĩa thành sở thích.' },
      { q: 'Câu nào cùng nghĩa? “I like cycling more than driving.”', options: ['I prefer cycling than driving.', 'I would rather cycling to driving.', 'I prefer to cycle to drive.', 'I prefer cycling to driving.'], answer: 3, explain: 'prefer V-ing TO V-ing (thích cái này hơn cái kia) → I prefer cycling to driving. Không dùng "than" sau prefer; would rather + V nguyên mẫu (không phải V-ing); prefer to V thì so sánh bằng "rather than".' }
    ]
  });

  G.push({
    id: 'phrasal-verbs-grammar', unit: 'academic', order: 4,
    title: 'Ngữ pháp của cụm động từ', en: 'Phrasal Verbs: Separable, Inseparable & Three-part', level: 'B2', emoji: '🧩',
    summary: 'Cụm động từ có tân ngữ chia thành hai loại: tách được (turn the TV off) và không tách được (look after children). Khi tân ngữ là đại từ, phải đặt nó vào giữa với loại tách được.',
    blocks: [
      { type: 'sort', caption: 'Phân loại một số cụm động từ thường gặp trong IELTS', groups: [
        { title: 'Tách được (V + O + particle)', emoji: '↔️', items: ['carry out', 'set up', 'phase out', 'turn down', 'bring up', 'point out', 'cut down (trees)', 'take up'] },
        { title: 'Không tách được (V + prep + O)', emoji: '🔒', items: ['look after', 'deal with', 'rely on', 'come across', 'look into', 'cope with', 'go through', 'account for'] },
        { title: 'Ba thành phần (luôn liền)', emoji: '3️⃣', items: ['cut down on', 'come up with', 'keep up with', 'look forward to', 'get rid of', 'put up with', 'run out of', 'catch up with'] },
        { title: 'Nội động từ (không tân ngữ)', emoji: '🚫', items: ['break down (hỏng)', 'take off (cất cánh)', 'turn up (xuất hiện)', 'level off', 'grow up', 'drop out'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Tách được + danh từ', parts: [ { t: 'S', c: 'subj' }, { t: 'set', c: 'verb' }, { t: 'up', c: 'adv' }, { t: 'a company', c: 'obj' } ], ex: 'She [[set up a company]] / [[set a company up]] in 2019.' },
        { label: 'Tách được + đại từ', parts: [ { t: 'S', c: 'subj' }, { t: 'set', c: 'verb' }, { t: 'it', c: 'obj' }, { t: 'up', c: 'adv' } ], ex: 'She [[set it up]] in 2019. (KHÔNG: set up it)' },
        { label: 'Không tách được', parts: [ { t: 'S', c: 'subj' }, { t: 'deal with', c: 'verb' }, { t: 'O / it', c: 'obj' } ], ex: 'Governments must [[deal with the problem]] / [[deal with it]].' },
        { label: 'Ba thành phần', parts: [ { t: 'S', c: 'subj' }, { t: 'come up with', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'Engineers [[came up with]] a cheaper design.' }
      ] },
      { type: 'uses', items: [
        { title: 'Đại từ luôn đứng giữa động từ và tiểu từ (loại tách được)', ex: 'The survey was long, but we [[carried it out]] in two weeks.', vi: 'Cuộc khảo sát dài nhưng chúng tôi đã thực hiện xong trong hai tuần.' },
        { title: 'Tân ngữ dài thường đặt sau tiểu từ', ex: 'The government [[phased out]] gasoline cars that failed emission tests.', vi: 'Chính phủ loại bỏ dần những xe chạy xăng không đạt kiểm tra khí thải.' },
        { title: 'Loại không tách: tân ngữ luôn sau giới từ', ex: 'Many elderly people [[rely on]] their neighbours for help.', vi: 'Nhiều người cao tuổi dựa vào hàng xóm để được giúp đỡ.' },
        { title: 'Ba thành phần không bao giờ tách', ex: 'Families should [[cut down on]] sugary drinks.', vi: 'Các gia đình nên cắt giảm đồ uống có đường.' },
        { title: 'Bị động: giữ nguyên tiểu từ sau V3', ex: 'The experiment was [[carried out]] by a team in Oslo.', vi: 'Thí nghiệm được thực hiện bởi một nhóm ở Oslo.' }
      ] },
      { type: 'table', head: ['Cụm động từ', 'Từ đồng nghĩa học thuật', 'Ví dụ'], rows: [
        ['carry out', 'conduct', 'carry out research'],
        ['set up', 'establish', 'set up a charity'],
        ['cut down on', 'reduce', 'cut down on plastic'],
        ['look into', 'investigate', 'look into the causes'],
        ['come up with', 'devise / propose', 'come up with a solution'],
        ['level off', 'stabilize', 'Sales leveled off in 2018.']
      ] },
      { type: 'tip', text: 'Không chắc một cụm có tách được không? Tra từ điển: nếu ghi “sth” ở giữa (set sth up) là tách được; nếu ghi ở cuối (look after sb) là không tách được.' },
      { type: 'tip', text: "Anh-Mỹ: người Mỹ nói fill out a form (Anh-Anh: fill in a form) – cả hai đều tách được: fill it out / fill it in. Chính tả Mỹ: leveled off, leveling off (một chữ l), stabilize (-ize), neighbors (-or); Anh-Anh viết levelled, stabilise, neighbours. Chọn một chuẩn và dùng nhất quán." },
      { type: 'tip', text: 'Task 2 trang trọng nên dùng xen kẽ: cụm động từ phổ biến (carry out, set up) vẫn chấp nhận được, nhưng tránh cụm quá thân mật (put up with → tolerate).' },
      { type: 'mistake', wrong: 'The old rules were confusing, so the school threw away them.', right: 'The old rules were confusing, so the school threw them away.', why: 'Với cụm tách được, đại từ (them) phải đứng giữa động từ và tiểu từ.' },
      { type: 'mistake', wrong: 'Who will look the children after?', right: 'Who will look after the children?', why: '“look after” không tách được; tân ngữ luôn đứng sau after.' },
      { type: 'mistake', wrong: 'We have run out gas.', right: 'We have run out of gas.', why: 'Cụm ba thành phần “run out of” không được bỏ giới từ cuối.' },
      { type: 'ielts', text: 'Speaking: dùng cụm động từ tự nhiên giúp tăng điểm Lexical Resource (idiomatic language). Task 1: level off, shoot up, drop off, pick up mô tả xu hướng rất hiệu quả.', ex: 'Sales [[shot up]] in the first quarter before [[leveling off]] at around 2,000 units.' }
    ],
    quiz: [
      { q: 'The report was confusing, so the editor ___.', options: ['rewrote up it', 'wrote it up again', 'wrote up again it', 'up wrote it'], answer: 1, explain: 'Đại từ it phải đứng giữa động từ và tiểu từ: wrote it up. "rewrote up it" và "wrote up again it" đặt đại từ sai vị trí; "up wrote it" sai trật tự.' },
      { q: 'Scientists are trying to ___ a cheaper vaccine.', options: ['come up with', 'come with up', 'come up', 'come it up with'], answer: 0, explain: 'come up with (nghĩ ra) là cụm ba thành phần, không tách → come up with a vaccine. "come with up", "come up" (thiếu with) và "come it up with" sai.' },
      { q: 'The government needs to ___ the housing crisis urgently.', options: ['deal the crisis with', 'deal it with', 'deal on', 'deal with'], answer: 3, explain: 'deal with không tách được, tân ngữ đứng sau with → deal with the crisis. "deal the crisis with", "deal it with" tách sai; "deal on" sai giới từ.' },
      { q: 'The factory was too old, so the council ___.', options: ['pulled down it', 'pulled it down', 'pulled down', 'it pulled down'], answer: 1, explain: 'pull down tách được; khi tân ngữ là đại từ thì phải đặt ở giữa → pulled it down. "pulled down it" sai vị trí đại từ; "pulled down" thiếu tân ngữ; "it pulled down" sai nghĩa.' },
      { q: 'The research ___ by a team of volunteers.', options: ['was carried out', 'was carried', 'carried out', 'was out carried'], answer: 0, explain: 'Bị động vẫn giữ nguyên tiểu từ của cụm động từ → was carried out. "was carried" thiếu out; "carried out" là chủ động, sai nghĩa; "was out carried" sai trật tự.' },
      { q: 'Unemployment rose for three years before it ___.', options: ['leveled off it', 'leveled it off', 'off leveled', 'leveled off'], answer: 3, explain: 'level off (chững lại) là nội động từ, không có tân ngữ → it leveled off. "leveled off it" và "leveled it off" thừa tân ngữ; "off leveled" sai trật tự.' },
      { q: 'Câu nào đúng?', options: ['I came across it in an old textbook.', 'I came it across in an old textbook.', 'I came across in an old textbook it.', 'I across came it in an old textbook.'], answer: 0, explain: 'come across (tình cờ thấy) không tách được → came across it. Các câu khác đặt it sai vị trí hoặc đảo trật tự cụm động từ.' },
      { q: 'Câu nào đúng?', options: ['She turned down it because the pay was low.', 'She turned it down because the pay was low.', 'She turned down because the pay was low it.', 'She down turned it because the pay was low.'], answer: 1, explain: 'turn down tách được; đại từ it phải đặt giữa → turned it down. "turned down it" sai vị trí đại từ; hai câu còn lại sai trật tự.' },
      { q: 'Câu nào đúng?', options: ['We must cut on down waste.', 'We must cut down waste on.', 'We must cut down on waste.', 'We must cut waste down on.'], answer: 2, explain: 'cut down on + tân ngữ: ba thành phần đứng liền nhau → cut down on waste. Các câu khác tách hoặc đảo vị trí tiểu từ.' },
      { q: 'Câu nào cùng nghĩa? “The company was established in 2005.”', options: ['The company set up in 2005.', 'The company was set up in 2005.', 'The company was set it up in 2005.', 'The company was up set in 2005.'], answer: 1, explain: 'establish = set up; câu bị động → was set up. "set up" chủ động thiếu tân ngữ, sai nghĩa; "was set it up" thừa it; "was up set" sai trật tự.' },
      { q: 'Câu nào cùng nghĩa? “I can\'t tolerate the noise any longer.”', options: ['I can\'t put the noise up with any longer.', 'I can\'t put up the noise any longer.', 'I can\'t put with up the noise any longer.', 'I can\'t put up with the noise any longer.'], answer: 3, explain: 'tolerate = put up with (ba thành phần, không tách). Ba phương án còn lại tách hoặc đảo trật tự cụm động từ ba thành phần.' },
      { q: 'Câu nào cùng nghĩa? “The police are investigating the accident.”', options: ['The police are looking into the accident.', 'The police are looking the accident into.', 'The police are looking it into.', 'The police are looking after the accident.'], answer: 0, explain: 'investigate = look into (không tách được). look after = chăm sóc. "looking the accident into" và "looking it into" tách sai; look after nghĩa là chăm sóc.' }
    ]
  });

  G.push({
    id: 'dependent-prepositions', unit: 'academic', order: 5,
    title: 'Giới từ đi kèm động từ, tính từ, danh từ', en: 'Dependent Prepositions', level: 'B2', emoji: '🔗',
    summary: 'Nhiều động từ, tính từ và danh từ luôn đi với một giới từ cố định (contribute to, responsible for, impact on). Giới từ này thường khác tiếng Việt nên cần học theo cụm.',
    blocks: [
      { type: 'sort', caption: 'Nhóm theo giới từ – học theo cụm, đừng dịch từng chữ', groups: [
        { title: 'TO', emoji: '➡️', items: ['contribute to', 'lead to', 'adapt to', 'access to', 'solution to', 'similar to', 'harmful to', 'object to'] },
        { title: 'ON', emoji: '🎯', items: ['impact on', 'effect on', 'focus on', 'depend on', 'rely on', 'spend money on', 'emphasis on', 'based on'] },
        { title: 'FOR', emoji: '🎁', items: ['responsible for', 'demand for', 'need for', 'reason for', 'account for', 'suitable for', 'pay for'] },
        { title: 'IN / OF / WITH', emoji: '🧷', items: ['increase in', 'interest in', 'invest in', 'aware of', 'consist of', 'cause of', 'cope with', 'associated with'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Động từ + giới từ', parts: [ { t: 'S', c: 'subj' }, { t: 'contribute', c: 'verb' }, { t: 'to', c: 'adv' }, { t: 'N / V-ing', c: 'obj' } ], ex: 'Cars [[contribute to]] air pollution.' },
        { label: 'Tính từ + giới từ', parts: [ { t: 'S', c: 'subj' }, { t: 'be', c: 'aux' }, { t: 'responsible', c: 'verb' }, { t: 'for', c: 'adv' }, { t: 'N / V-ing', c: 'obj' } ], ex: 'Parents are [[responsible for]] teaching basic manners.' },
        { label: 'Danh từ + giới từ', parts: [ { t: 'a / the', c: 'aux' }, { t: 'impact', c: 'subj' }, { t: 'on', c: 'adv' }, { t: 'N', c: 'obj' } ], ex: 'Social media has a huge [[impact on]] teenagers.' },
        { label: 'Giới từ + động từ', parts: [ { t: '… to / for / of', c: 'adv' }, { t: 'V-ing', c: 'verb' } ], ex: 'Many people [[object to paying]] higher taxes.' }
      ] },
      { type: 'uses', items: [
        { title: 'Nguyên nhân – kết quả', ex: 'Poor diet can [[lead to]] serious health problems.', vi: 'Chế độ ăn kém có thể dẫn đến các vấn đề sức khỏe nghiêm trọng.' },
        { title: 'Tác động', ex: 'Tourism has a positive [[effect on]] local employment.', vi: 'Du lịch có tác động tích cực đến việc làm ở địa phương.' },
        { title: 'Trách nhiệm', ex: 'Who should be [[responsible for]] protecting endangered species?', vi: 'Ai nên chịu trách nhiệm bảo vệ các loài có nguy cơ tuyệt chủng?' },
        { title: 'Thay đổi số liệu (Task 1): increase in / increase of', ex: 'There was an [[increase in]] sales, an [[increase of]] 15%.', vi: 'Doanh số tăng, một mức tăng 15%. (in + thứ tăng, of + con số)' },
        { title: 'Giới từ + V-ing (to ở đây là giới từ)', ex: 'Students need time to [[adapt to living]] independently.', vi: 'Sinh viên cần thời gian để thích nghi với cuộc sống tự lập.' }
      ] },
      { type: 'table', head: ['Từ', 'Giới từ', 'Lỗi hay gặp của người Việt'], rows: [
        ['impact / effect / influence', 'on', 'impact to ✗'],
        ['discuss / emphasize / affect', '(không giới từ)', 'discuss about ✗, affect to ✗'],
        ['solution / key / approach', 'to', 'solution for ✗ (ít tự nhiên)'],
        ['interested / invest / rise', 'in', 'interested about ✗'],
        ['concerned / worried', 'about', 'worried of ✗'],
        ['married / similar / addicted', 'to', 'married with ✗']
      ] },
      { type: 'tip', text: 'Nếu “to” là giới từ (look forward to, object to, adapt to, be used to, contribute to, key to) thì động từ theo sau phải ở dạng V-ing: contribute to reducing emissions.' },
      { type: 'tip', text: "Anh-Mỹ và Anh-Anh khác nhau ở vài giới từ: different from (chuẩn cả hai) / different than (Mỹ, văn nói) / different to (Anh); on the weekend (Mỹ) / at the weekend (Anh); in the hospital (Mỹ) / in hospital (Anh); fill out a form (Mỹ) / fill in a form (Anh)." },
      { type: 'mistake', wrong: 'Smartphones have a negative impact to children\'s sleep.', right: 'Smartphones have a negative impact on children\'s sleep.', why: 'impact/effect/influence đi với on.' },
      { type: 'mistake', wrong: 'This essay will discuss about the advantages of online learning.', right: 'This essay will discuss the advantages of online learning.', why: 'discuss là ngoại động từ, không cần about (dù tiếng Việt nói “thảo luận về”).' },
      { type: 'mistake', wrong: 'Young people are more interested about technology.', right: 'Young people are more interested in technology.', why: 'interested đi với in.' },
      { type: 'ielts', text: 'Sai giới từ là lỗi nhỏ nhưng lặp nhiều lần sẽ kéo điểm Grammatical Accuracy và Lexical Resource. Học collocation theo cụm: “have a significant impact on”, “play a key role in”, “pose a threat to”.', ex: 'Rising temperatures pose a serious [[threat to]] coastal cities and have a significant [[impact on]] food production.' }
    ],
    quiz: [
      { q: 'Plastic waste is harmful ___ marine life.', options: ['at', 'to', 'with', 'on'], answer: 1, explain: 'Tính từ harmful đi với giới từ to: harmful to sb/sth (có hại cho ai/cái gì) → to. at, with, on không đi với harmful.' },
      { q: 'Remote work has had a considerable effect ___ downtown businesses.', options: ['to', 'in', 'on', 'for'], answer: 2, explain: 'Danh từ effect đi với on: have an effect on sth (có tác động đến) → on. to, in, for không đi với effect theo nghĩa tác động đến.' },
      { q: 'Teenagers account ___ almost 40% of online gamers.', options: ['for', 'to', 'of', 'in'], answer: 0, explain: 'account for = chiếm (tỉ lệ) → account for almost 40%. to, of, in không đi với account theo nghĩa này.' },
      { q: 'There was a sharp rise ___ the number of electric cars.', options: ['of', 'on', 'at', 'in'], answer: 3, explain: 'rise/increase/fall in + thứ thay đổi → a sharp rise in the number. of dùng với con số (a rise of 10%); on và at sai giới từ.' },
      { q: 'Many residents object ___ a new airport near their homes.', options: ['to build', 'to building', 'building', 'for building'], answer: 1, explain: 'object to + V-ing (to là giới từ) → object to building. "to build" dùng V nguyên mẫu sai; "building" thiếu to; "for building" sai giới từ.' },
      { q: 'The diet mainly consists ___ rice and vegetables.', options: ['in', 'with', 'of', 'from'], answer: 2, explain: 'consist of = gồm có, bao gồm → of. (consist in = nằm ở, cốt ở – nghĩa khác.) in (consist in) mang nghĩa khác; with và from không đi với consist.' },
      { q: 'Câu nào đúng?', options: ['The government should invest on public transportation.', 'The government should invest in public transportation.', 'The government should invest to public transportation.', 'The government should invest for public transportation.'], answer: 1, explain: 'invest in sth = đầu tư vào cái gì → invest in public transportation. Không dùng on/to/for. on, to, for không đi với invest theo nghĩa đầu tư vào.' },
      { q: 'Câu nào đúng?', options: ['Pollution can affect to people\'s health.', 'Pollution can affect on people\'s health.', 'Pollution can have an effect to people\'s health.', 'Pollution can affect people\'s health.'], answer: 3, explain: 'affect là ngoại động từ, không có giới từ; danh từ effect đi với on. Ba câu còn lại thêm giới từ sai sau affect hoặc dùng effect với to.' },
      { q: 'Câu nào đúng?', options: ['Access to clean water is a basic right.', 'Access for clean water is a basic right.', 'Access of clean water is a basic right.', 'Access on clean water is a basic right.'], answer: 0, explain: 'Danh từ access đi với to: access to sth (quyền/khả năng tiếp cận cái gì) → Access to clean water.' },
      { q: 'Câu nào cùng nghĩa? “Tourism greatly influences local culture.”', options: ['Tourism has a great influence to local culture.', 'Tourism has a great influence on local culture.', 'Tourism has a great influence in local culture.', 'Tourism has a great influence with local culture.'], answer: 1, explain: 'influence (v) không cần giới từ; khi đổi sang danh từ thì dùng have an influence ON sth → a great influence on local culture.' },
      { q: 'Câu nào cùng nghĩa? “Fast food causes obesity.”', options: ['Fast food contributes to obesity.', 'Fast food contributes for obesity.', 'Fast food leads obesity.', 'Fast food results of obesity.'], answer: 0, explain: 'contribute to / lead to / result in. Các phương án khác sai giới từ. "contributes for", "leads obesity" (thiếu to), "results of" đều sai giới từ.' },
      { q: 'Câu nào cùng nghĩa? “Children depend on their parents for money.”', options: ['Children are reliant for their parents for money.', 'Children are dependent of their parents for money.', 'Children are dependent with their parents for money.', 'Children are financially dependent on their parents.'], answer: 3, explain: 'be dependent on (phụ thuộc vào) → financially dependent on their parents. reliant đi với on (không phải for); dependent không đi với of hay with (independent mới đi với of).' }
    ]
  });

  G.push({
    id: 'reference-substitution', unit: 'academic', order: 6,
    title: 'Quy chiếu & thay thế để liên kết', en: 'Reference & Substitution for Cohesion', level: 'B2', emoji: '🪢',
    summary: 'Tránh lặp từ và nối các câu chặt chẽ bằng this/these + danh từ, such, the former/the latter, do so, one/ones – yếu tố quan trọng của tiêu chí Coherence & Cohesion.',
    blocks: [
      { type: 'diagram', caption: 'Thay vì lặp lại, hãy trỏ ngược về ý trước', steps: [
        { t: 'Many cities have banned cars from the center.', c: 'note' },
        { t: 'Bạn muốn nhắc lại cả ý vừa nêu?', c: 'if' },
        { t: 'This policy / Such a measure has reduced pollution.', c: 'result' },
        { t: 'Bạn muốn nhắc lại hành động?', c: 'if' },
        { t: 'Other cities should do so too.', c: 'result' },
        { t: 'Bạn muốn nhắc lại một danh từ đếm được?', c: 'if' },
        { t: 'Old cars pollute more than new ones.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Tóm ý trước', parts: [ { t: 'This / These', c: 'aux' }, { t: 'N tóm tắt', c: 'subj' }, { t: 'V …', c: 'verb' } ], ex: '[[This trend]] is likely to continue.' },
        { label: 'Loại / kiểu như vậy', parts: [ { t: 'such (a/an)', c: 'aux' }, { t: 'N', c: 'obj' } ], ex: '[[Such policies]] are expensive to enforce.' },
        { label: 'Hai đối tượng', parts: [ { t: 'the former', c: 'subj' }, { t: '… ,', c: 'verb' }, { t: 'the latter', c: 'subj' }, { t: '…', c: 'verb' } ], ex: 'Rail and air are popular; [[the former]] is greener, [[the latter]] faster.' },
        { label: 'Thay động từ', parts: [ { t: 'S', c: 'subj' }, { t: 'do so / do the same', c: 'verb' } ], ex: 'If firms are asked to cut emissions, most will [[do so]].' },
        { label: 'Thay danh từ đếm được', parts: [ { t: 'a / the / adj', c: 'aux' }, { t: 'one / ones', c: 'obj' } ], ex: 'Small classes are better than large [[ones]].' }
      ] },
      { type: 'uses', items: [
        { title: 'This + danh từ tóm tắt (this issue, this approach)', ex: 'Some schools have banned phones. [[This approach]] has improved concentration.', vi: 'Một số trường cấm điện thoại. Cách làm này đã cải thiện sự tập trung.' },
        { title: 'Such + N: chỉ loại sự việc vừa nhắc', ex: 'Fines for littering are common, but [[such penalties]] rarely change behavior.', vi: 'Phạt xả rác khá phổ biến, nhưng những hình phạt như vậy hiếm khi thay đổi hành vi.' },
        { title: 'The former / the latter', ex: 'Students can study online or on campus; [[the latter]] offers more social contact.', vi: 'Sinh viên có thể học trực tuyến hoặc tại trường; cách thứ hai có nhiều giao tiếp xã hội hơn.' },
        { title: 'Do so: tránh lặp lại cả cụm động từ', ex: 'Governments should regulate AI, and they must [[do so]] quickly.', vi: 'Chính phủ nên quản lý AI, và phải làm điều đó nhanh chóng.' },
        { title: 'That of / those of trong so sánh (Task 1)', ex: 'The population of Lagos is larger than [[that of]] Cairo.', vi: 'Dân số Lagos lớn hơn dân số Cairo.' }
      ] },
      { type: 'table', head: ['Thay thế cho', 'Từ dùng', 'Ví dụ'], rows: [
        ['Danh từ đếm được số ít', 'one', 'a cheap phone and an expensive one'],
        ['Danh từ đếm được số nhiều', 'ones', 'old buildings and new ones'],
        ['Danh từ không đếm được / số ít trong so sánh', 'that (of)', 'the cost of housing is higher than that of food'],
        ['Danh từ số nhiều trong so sánh', 'those (of)', 'wages in cities are higher than those in villages'],
        ['Cụm động từ', 'do so / do the same', 'Others may do so.'],
        ['Cả mệnh đề', 'so / not', 'Will prices rise? I think so / I hope not.']
      ] },
      { type: 'tip', text: 'Đừng để “This” đứng một mình nếu người đọc có thể hiểu nhầm nó chỉ cái gì. “This rise”, “This problem”, “These measures” rõ ràng hơn nhiều so với chỉ “This”.' },
      { type: 'tip', text: "the former / the latter chỉ dùng khi có đúng HAI đối tượng. Từ ba đối tượng trở lên, dùng the first / the second / the last: Students chose math, art, or music; the last was the most popular." },
      { type: 'mistake', wrong: 'Living costs in London are higher than Manchester.', right: 'Living costs in London are higher than those in Manchester.', why: 'Phải so chi phí với chi phí. Dùng those thay cho living costs (số nhiều).' },
      { type: 'mistake', wrong: 'I want a cheap phone, not an expensive.', right: 'I want a cheap phone, not an expensive one.', why: 'Sau tính từ cần one/ones để thay danh từ đếm được, không để tính từ đứng một mình.' },
      { type: 'mistake', wrong: 'Some people use public transportation, the other people drive. The latter is cheaper.', right: 'Some people use public transportation, while others drive. The former is cheaper.', why: 'Public transport (nhắc trước) rẻ hơn → the former. Cũng tránh lặp “people” bằng others.' },
      { type: 'ielts', text: 'Giám khảo đánh giá “referencing” ở band 7+: dùng linh hoạt this/such/these + N thay cho lặp danh từ. Tuy nhiên, lạm dụng the former/the latter có thể khiến bài khó đọc.', ex: 'Some argue that zoos protect endangered species, while others see them as cruel. Although [[the latter view]] has some merit, I believe [[such institutions]] play a vital role in conservation.' }
    ],
    quiz: [
      { q: 'The salaries of doctors are higher than ___ of teachers.', options: ['that', 'those', 'one', 'ones'], answer: 1, explain: 'Thay cho salaries (số nhiều) trong phép so sánh → those of teachers. that dùng cho số ít; one/ones không đi với of theo cách này.' },
      { q: 'Many old factories have closed, and new ___ have opened in the suburbs.', options: ['one', 'that', 'ones', 'those'], answer: 2, explain: 'Thay cho factories (số nhiều) sau tính từ new → ones. one thay cho số ít; that và those không đứng sau tính từ.' },
      { q: 'Some countries have taxed sugary drinks. ___ has reduced consumption.', options: ['This measure', 'These measure', 'Such measure', 'The latter measures'], answer: 0, explain: 'Tóm tắt hành động đánh thuế bằng This measure (số ít). "These measure" sai số; "Such measure" thiếu a; "The latter measures" sai vì chỉ có một biện pháp được nhắc.' },
      { q: 'The council promised to repair the roads but has not ___.', options: ['done it so', 'done such', 'done one', 'done so'], answer: 3, explain: 'do so thay cho cả cụm động từ đã nhắc (repair the roads) → has not done so. "done it so", "done such", "done one" không phải cách thay thế đúng.' },
      { q: 'I considered law and medicine and chose ___ because I enjoy biology.', options: ['the latter', 'the former', 'the one', 'such'], answer: 0, explain: 'Trong hai thứ đã nhắc, medicine được nhắc sau → the latter. the former là thứ nhắc trước (law); the one và such không chỉ rõ thứ tự.' },
      { q: 'Violent video games are popular, but ___ games may affect behavior.', options: ['such a', 'so', 'such', 'this'], answer: 2, explain: 'such + danh từ số nhiều (không có a) → such games. "such a" chỉ đi với danh từ số ít; so không đứng trước danh từ; this không đi với danh từ số nhiều.' },
      { q: 'Câu nào đúng?', options: ['The climate of Spain is warmer than Norway.', 'The climate of Spain is warmer than that of Norway.', 'The climate of Spain is warmer than those of Norway.', 'The climate of Spain is warmer than one of Norway.'], answer: 1, explain: 'So sánh khí hậu với khí hậu (số ít) → that of Norway. Câu 1 so sánh khí hậu với một đất nước (sai logic); those là số nhiều; one of không dùng như vậy.' },
      { q: 'Câu nào đúng?', options: ['Students who wish to leave early may do it so.', 'Students who wish to leave early may do such.', 'Students who wish to leave early may make so.', 'Students who wish to leave early may do so.'], answer: 3, explain: 'do so thay cho cả cụm động từ đã nhắc (leave early) để tránh lặp → may do so. "do it so", "do such", "make so" đều không phải cách thay thế đúng.' },
      { q: 'Câu nào đúng?', options: ['Such a policy would be unpopular.', 'Such policy would be unpopular.', 'A such policy would be unpopular.', 'Such the policy would be unpopular.'], answer: 0, explain: 'such + a/an + danh từ đếm được số ít → Such a policy. "Such policy" thiếu a; "A such" sai trật tự; "Such the" sai mạo từ.' },
      { q: 'Câu nào cùng nghĩa? “Wind power and solar power are both clean. Solar power is cheaper to install.”', options: ['Wind and solar power are both clean, but the former is cheaper to install.', 'Wind and solar power are both clean, but the latter is cheaper to install.', 'Wind and solar power are both clean, but such is cheaper to install.', 'Wind and solar power are both clean, but this one are cheaper to install.'], answer: 1, explain: 'Solar power được nhắc sau → the latter. the former chỉ wind power (sai thông tin); such không thay cho một vật cụ thể; "this one are" sai hòa hợp.' },
      { q: 'Câu nào cùng nghĩa? “Prices in 2020 were higher than prices in 2010.”', options: ['Prices in 2020 were higher than that in 2010.', 'Prices in 2020 were higher than ones in 2010.', 'Prices in 2020 were higher than those in 2010.', 'Prices in 2020 were higher than it in 2010.'], answer: 2, explain: 'Thay cho prices (số nhiều) → those in 2010. that là số ít; ones không dùng sau than theo cách này; it là số ít và sai.' },
      { q: 'Câu nào cùng nghĩa? “Some parents limit screen time. Limiting screen time helps children sleep better.”', options: ['Some parents limit screen time, and it so helps children sleep better.', 'Some parents limit screen time, and the former helps children sleep better.', 'Some parents limit screen time, and those helps children sleep better.', 'Some parents limit screen time, and this practice helps children sleep better.'], answer: 3, explain: 'this + danh từ tóm tắt (this practice) thay cho cả hành động. Các phương án khác dùng sai từ thay thế (it so, the former…) hoặc làm câu sai nghĩa.' }
    ]
  });

  G.push({
    id: 'hedging', unit: 'academic', order: 7,
    title: 'Ngôn ngữ thận trọng (hedging)', en: 'Hedging & Cautious Language', level: 'C1', emoji: '🌫️',
    summary: 'Văn học thuật tránh khẳng định tuyệt đối. Dùng tend to, may well, it appears that, to some extent… để đưa ra nhận định chính xác, khách quan và khó bị bác bỏ.',
    blocks: [
      { type: 'scale', caption: 'Mức độ chắc chắn của nhận định (%)', items: [ { t: 'X causes Y. (tuyệt đối)', v: 100 }, { t: 'X almost certainly / clearly causes Y', v: 90 }, { t: 'X is likely to / may well cause Y', v: 70 }, { t: 'X tends to / appears to cause Y', v: 60 }, { t: 'X may / might / could cause Y', v: 45 }, { t: 'X is unlikely to cause Y', v: 15 } ] },
      { type: 'formula', rows: [
        { label: 'Động từ khuyết thiếu', parts: [ { t: 'S', c: 'subj' }, { t: 'may / might / could / may well', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'Automation [[may well]] replace many office jobs.' },
        { label: 'Động từ thận trọng', parts: [ { t: 'S', c: 'subj' }, { t: 'tend / appear / seem', c: 'verb' }, { t: 'to V', c: 'verb' } ], ex: 'Older people [[tend to]] be less active online.' },
        { label: 'Mệnh đề giới thiệu', parts: [ { t: 'It', c: 'subj' }, { t: 'appears / seems / is likely', c: 'verb' }, { t: 'that', c: 'adv' }, { t: 'S + V', c: 'obj' } ], ex: '[[It appears that]] the policy has had little effect.' },
        { label: 'Bị động khách quan', parts: [ { t: 'It', c: 'subj' }, { t: 'is widely believed / is often argued', c: 'aux' }, { t: 'that', c: 'adv' }, { t: 'S + V', c: 'obj' } ], ex: '[[It is often argued that]] exams cause unnecessary stress.' },
        { label: 'Giới hạn phạm vi', parts: [ { t: 'to some extent / in most cases', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' } ], ex: '[[To some extent]], technology has made people lonelier.' }
      ] },
      { type: 'uses', items: [
        { title: 'Nói về xu hướng chung, không phải mọi trường hợp', ex: 'Children from wealthier families [[tend to]] perform better at school.', vi: 'Trẻ từ các gia đình khá giả thường học tốt hơn.' },
        { title: 'Dự đoán có khả năng cao', ex: 'Demand for electric vehicles [[is likely to]] rise over the next decade.', vi: 'Nhu cầu xe điện có khả năng tăng trong thập kỷ tới.' },
        { title: 'Đưa ra kết luận dè dặt từ dữ liệu', ex: '[[It would appear that]] the campaign was [[not entirely]] successful.', vi: 'Có vẻ như chiến dịch không hoàn toàn thành công.' },
        { title: 'Giảm độ tuyệt đối của lượng từ', ex: 'Many, [[though not all]], graduates find work within six months.', vi: 'Nhiều, dù không phải tất cả, sinh viên tốt nghiệp tìm được việc trong sáu tháng.' },
        { title: 'Đồng ý một phần', ex: 'I agree with this view [[to a certain extent]].', vi: 'Tôi đồng ý với quan điểm này ở một mức độ nhất định.' }
      ] },
      { type: 'table', head: ['Quá tuyệt đối', 'Thận trọng hơn'], rows: [
        ['All teenagers are addicted to their phones.', 'Many teenagers appear to be overly dependent on their phones.'],
        ['This will solve the problem.', 'This could go some way toward solving the problem.'],
        ['Video games cause violence.', 'There may be a link between violent games and aggression.'],
        ['People always prefer cheap products.', 'Consumers often tend to choose cheaper products.'],
        ['It is a fact that…', 'There is considerable evidence that…']
      ] },
      { type: 'tip', text: 'Đừng “hedge” mọi câu: quan điểm chính (thesis) cần rõ ràng. Hedging phù hợp nhất khi nêu nguyên nhân, kết quả, dự đoán và khái quát hóa về một nhóm người.' },
      { type: 'tip', text: "Anh-Mỹ dùng likely như trạng từ ngay sau will: Prices will likely rise next year (= will probably rise). Anh-Anh ưu tiên will probably hoặc are likely to rise. Cả hai đều chuẩn, nhưng không viết “Prices are likely rise” (thiếu to)." },
      { type: 'mistake', wrong: 'Everyone knows that social media destroys relationships.', right: 'It could be argued that social media can weaken some relationships.', why: 'Khái quát hóa quá mức (everyone, destroys) dễ bị giám khảo đánh giá là thiếu thuyết phục.' },
      { type: 'mistake', wrong: 'Young people tend to spending more time online.', right: 'Young people tend to spend more time online.', why: 'tend to + V nguyên mẫu (to ở đây là một phần của động từ nguyên mẫu, không phải giới từ).' },
      { type: 'mistake', wrong: 'It seems that maybe the prices might possibly rise.', right: 'It seems likely that prices will rise.', why: 'Chồng chất quá nhiều từ thận trọng làm câu yếu và rườm rà. Một từ là đủ.' },
      { type: 'ielts', text: 'Hedging giúp bài Task 2 nghe học thuật và tinh tế – thể hiện “position” có cân nhắc. Trong Speaking Part 3, “I\'d say…”, “It probably depends on…” cũng là hedging tự nhiên.', ex: 'While technology is often blamed for declining attention spans, [[it seems likely that]] other factors, such as longer working hours, also play a part.' }
    ],
    quiz: [
      { q: 'Men ___ to take more risks than women when driving, according to the study.', options: ['tend', 'tending', 'are tend', 'tends'], answer: 0, explain: 'tend to + V, chủ ngữ Men số nhiều → tend. tending thiếu động từ chính; "are tend" sai; tends chia số ít.' },
      { q: 'It ___ that the new law has reduced crime, although more data is needed.', options: ['is appeared', 'appears', 'appearing', 'is appearing'], answer: 1, explain: 'It appears that + mệnh đề (dường như) → It appears that… appear là nội động từ nên không có bị động (is appeared sai); appearing thiếu động từ chính; is appearing sai thì.' },
      { q: 'House prices ___ well continue to rise next year.', options: ['are', 'tend', 'may', 'likely'], answer: 2, explain: 'may well + V = rất có thể → may well continue. are, tend và likely không đứng trước well + V nguyên mẫu (likely phải là are likely to).' },
      { q: 'I agree with this statement to ___ extent.', options: ['some', 'any', 'an', 'many'], answer: 0, explain: 'Cụm cố định: to some extent / to a certain extent. any, an, many không đi với extent trong cụm cố định này.' },
      { q: 'Unemployment is ___ to fall if the economy recovers.', options: ['tend', 'possible', 'probably', 'likely'], answer: 3, explain: 'be likely to + V → is likely to fall. "is tend" sai (tend là động từ, không đứng sau is); possible không đi với to V theo cách này (phải là It is possible that…); probably là trạng từ.' },
      { q: 'It is widely ___ that exercise improves mental health.', options: ['believe', 'believing', 'believed', 'belief'], answer: 2, explain: 'Bị động khách quan: It is widely believed that… believe là động từ nguyên mẫu; believing sai dạng; belief là danh từ.' },
      { q: 'Câu nào thận trọng và đúng ngữ pháp nhất?', options: ['Video games definitely make children violent.', 'Video games may be linked to aggressive behavior in some children.', 'Video games might possibly perhaps cause violence.', 'Video games are tend to cause violence.'], answer: 1, explain: 'Câu B thận trọng hợp lý; A tuyệt đối, C chồng từ, D sai ngữ pháp. Câu A khẳng định tuyệt đối (definitely); câu C chồng ba từ rào đón; câu D sai ngữ pháp (are tend).' },
      { q: 'Câu nào đúng?', options: ['There appears to be a link between diet and memory.', 'There appears being a link between diet and memory.', 'It appears to be that a link between diet and memory.', 'There is appeared a link between diet and memory.'], answer: 0, explain: 'Cấu trúc rào đón There appears/seems to be + N (dường như có…) → There appears to be a link. Sau appear dùng to be, không dùng being; appear là nội động từ nên không có bị động.' },
      { q: 'Câu nào đúng?', options: ['Older workers seem be less willing to retrain.', 'Older workers are seem less willing to retrain.', 'Older workers seeming less willing to retrain.', 'Older workers seem to be less willing to retrain.'], answer: 3, explain: 'seem + to be + tính từ (dường như…) → seem to be less willing. "seem be" thiếu to; "are seem" sai vì seem đã là động từ chính.' },
      { q: 'Câu nào cùng nghĩa, nhưng thận trọng hơn? “Online learning is worse than classroom learning.”', options: ['Online learning is always worse than classroom learning.', 'Online learning can be less effective than classroom learning for some students.', 'Online learning must be worse than classroom learning.', 'Online learning is surely worse than classroom learning.'], answer: 1, explain: 'can be + for some students giới hạn phạm vi khẳng định. always và must khẳng định tuyệt đối, không thận trọng hơn câu gốc.' },
      { q: 'Câu nào cùng nghĩa? “Probably, the bridge will be finished by 2030.”', options: ['The bridge tends to finish by 2030.', 'The bridge appears finishing by 2030.', 'The bridge is likely to be finished by 2030.', 'The bridge is likely finishing by 2030.'], answer: 2, explain: 'Probably will → be likely to + V (bị động: to be finished). "tends to finish" mang nghĩa thói quen; "appears finishing" sai dạng; "likely finishing" sai dạng.' },
      { q: 'Câu nào cùng nghĩa? “People say that the town was founded by monks.”', options: ['The town is said founding by monks.', 'It says that the town was founded by monks.', 'The town says to have been founded by monks.', 'The town is said to have been founded by monks.'], answer: 3, explain: 'Bị động khách quan: S + is said + to have been V3 (sự việc trong quá khứ). "is said founding" sai dạng; "It says" là chủ động; "The town says" sai chủ thể.' },
      { q: 'The results ___ that the drug may be effective, but further research is needed.', options: ['confirm', 'guarantee', 'suggest', 'prove'], answer: 2, explain: 'Câu có may và "further research is needed" → kết luận còn dè dặt, dùng động từ rào đón suggest (gợi ý rằng). prove/confirm/guarantee khẳng định chắc chắn, mâu thuẫn với phần sau.' },
      { q: 'It ___ be argued that social media has improved political participation. (chọn cách nói rào đón)', options: ['could', 'must', 'will', 'shall'], answer: 0, explain: 'Cụm rào đón quen thuộc trong văn học thuật: It could be argued that… (có thể lập luận rằng…).' },
      { q: 'Câu nào dùng cách nói rào đón (hedging) phù hợp nhất cho văn học thuật?', options: ['This proves that all older drivers are cautious.', 'Older drivers are always more cautious.', 'It is a fact that every older driver is cautious.', 'This tends to suggest that older drivers are more cautious.'], answer: 3, explain: 'tend to + suggest làm nhẹ mức khẳng định – phù hợp văn học thuật. Các câu còn lại khái quát tuyệt đối (all, always, every, It is a fact) nên dễ bị coi là thiếu căn cứ.' },
      { q: 'Prices are likely ___ further next year.', options: ['rose', 'to rise', 'rising', 'rise'], answer: 1, explain: 'be likely + to V (có khả năng sẽ…) → are likely to rise. rose, rising, rise không đi sau be likely.' },
      { q: 'The decline ___ partly due to lower birth rates.', options: ['may been', 'may be', 'may being', 'may to be'], answer: 1, explain: 'Động từ khuyết thiếu may + V nguyên mẫu → may be (có thể là), dùng để rào đón. "may been", "may being", "may to be" đều sai dạng sau may.' },
      { q: '___ to the survey, most residents appear to support the plan.', options: ['Accordingly', 'Accordance', 'Accord', 'According'], answer: 3, explain: 'according to + nguồn (theo…) → According to the survey. Accordingly là trạng từ (do đó), không đi với to.' }
    ]
  });

  G.push({
    id: 'nominalisation', unit: 'academic', order: 8,
    title: 'Danh từ hóa trong văn học thuật', en: 'Nominalization', level: 'C1', emoji: '🧱',
    summary: 'Biến động từ/tính từ thành danh từ (decide → decision, rise → a rise) để gói cả mệnh đề vào một cụm danh từ – giúp câu văn cô đọng, khách quan và mang tính học thuật.',
    blocks: [
      { type: 'diagram', caption: 'Biến một mệnh đề thành cụm danh từ', steps: [
        { t: 'Because the government decided to raise taxes, people protested.', c: 'note' },
        { t: 'Tìm động từ chính → decided', c: 'if' },
        { t: 'Đổi thành danh từ → decision', c: 'arrow' },
        { t: 'Chủ ngữ → sở hữu (the government\'s / of the government)', c: 'arrow' },
        { t: 'Because + mệnh đề → Because of / Due to + cụm danh từ', c: 'arrow' },
        { t: 'The government\'s decision to raise taxes led to protests.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Cụm danh từ làm chủ ngữ', parts: [ { t: 'the / a', c: 'aux' }, { t: 'N (từ V/adj)', c: 'subj' }, { t: 'of / in + N', c: 'obj' }, { t: 'V …', c: 'verb' } ], ex: '[[The expansion of the airport]] created 3,000 jobs.' },
        { label: 'Thay mệnh đề nguyên nhân', parts: [ { t: 'due to / because of', c: 'adv' }, { t: 'the / a', c: 'aux' }, { t: 'N', c: 'obj' } ], ex: 'Due to [[the closure of the mine]], many families moved away.' },
        { label: 'Động từ “nhẹ” + danh từ', parts: [ { t: 'S', c: 'subj' }, { t: 'make / have / show', c: 'verb' }, { t: 'a / an', c: 'aux' }, { t: 'N', c: 'obj' } ], ex: 'Sales showed [[a slight improvement]] in March.' }
      ] },
      { type: 'uses', items: [
        { title: 'Mô tả xu hướng Task 1', ex: 'There was [[a dramatic decline]] in the number of smokers.', vi: 'Số người hút thuốc giảm mạnh.' },
        { title: 'Gói nguyên nhân thành chủ ngữ', ex: '[[The rapid growth of cities]] has put pressure on housing.', vi: 'Sự phát triển nhanh của các thành phố đã gây áp lực lên nhà ở.' },
        { title: 'Làm câu khách quan (bỏ người thực hiện)', ex: '[[The introduction of tuition fees]] reduced applications.', vi: 'Việc áp dụng học phí đã làm giảm số đơn đăng ký.' },
        { title: 'Tính từ → danh từ', ex: '[[The availability of cheap flights]] has boosted tourism.', vi: 'Sự sẵn có của vé máy bay giá rẻ đã thúc đẩy du lịch.' },
        { title: 'Liên kết câu (nhắc lại ý bằng danh từ)', ex: 'Prices rose by 20%. [[This increase]] hit low-income families hardest.', vi: 'Giá tăng 20%. Mức tăng này ảnh hưởng nặng nhất đến các gia đình thu nhập thấp.' }
      ] },
      { type: 'table', head: ['Động từ / tính từ', 'Danh từ', 'Cụm học thuật'], rows: [
        ['decide', 'decision', 'the decision to …'],
        ['fail', 'failure', 'the failure of the scheme'],
        ['develop', 'development', 'the development of AI'],
        ['able / available', 'ability / availability', 'the availability of jobs'],
        ['reduce / increase', 'reduction / increase', 'a reduction in waste'],
        ['analyze / emerge', 'analysis / emergence', 'the emergence of online retail']
      ] },
      { type: 'tip', text: 'Đừng danh từ hóa mọi câu: quá nhiều danh từ liên tiếp (the implementation of the reduction of the consumption of…) làm câu khó đọc. Mỗi đoạn 1–2 cụm là vừa.' },
      { type: 'tip', text: "Chính tả Anh-Mỹ cho danh từ hóa: analyze → analysis, urbanize → urbanization, organize → organization, aging (Anh-Anh: ageing), canceled / cancellation (Mỹ: canceled một chữ l, nhưng cancellation hai chữ l). Danh từ analysis giống nhau ở cả hai chuẩn." },
      { type: 'mistake', wrong: 'Because of the government invested more, unemployment fell.', right: 'Because of greater government investment, unemployment fell.', why: 'Because of + cụm danh từ, không + mệnh đề. Hoặc dùng Because the government invested more…' },
      { type: 'mistake', wrong: 'There was a significant increase of the price of rice.', right: 'There was a significant increase in the price of rice.', why: 'increase in + thứ thay đổi; increase of + con số (an increase of 10%).' },
      { type: 'mistake', wrong: 'The develop of technology has changed education.', right: 'The development of technology has changed education.', why: 'Sau the cần danh từ (development), không dùng động từ nguyên mẫu.' },
      { type: 'ielts', text: 'Danh từ hóa là đặc trưng của văn phong học thuật, giúp tăng cả Lexical Resource (word formation) lẫn Grammatical Range. Rất hiệu quả trong Task 1 khi muốn đa dạng cách diễn đạt xu hướng.', ex: 'The figures show [[a steady rise]] in car ownership, followed by [[a sharp fall]] after [[the introduction of a congestion charge]].' }
    ],
    quiz: [
      { q: 'The ___ of the new metro line took six years.', options: ['construct', 'construction', 'constructive', 'constructed'], answer: 1, explain: 'Sau The… of cần danh từ → construction. construct là động từ; constructive là tính từ; constructed là V3.' },
      { q: 'There was a slight ___ in unemployment in 2019.', options: ['reduce', 'reducing', 'reductive', 'reduction'], answer: 3, explain: 'Sau a + tính từ (slight) cần danh từ → reduction (sự giảm). reduce là động từ, reductive là tính từ.' },
      { q: '___ heavy rain, the game was canceled.', options: ['Due to', 'Because', 'Although', 'Since'], answer: 0, explain: 'Due to + cụm danh từ (heavy rain) → Due to heavy rain. Because và Since cần mệnh đề; Although chỉ sự tương phản.' },
      { q: 'The ___ of affordable housing is a major concern in big cities.', options: ['available', 'availability', 'avail', 'availably'], answer: 1, explain: 'Sau The… of cần danh từ: available → availability. available là tính từ; avail là động từ; availably không tồn tại.' },
      { q: 'The government\'s ___ to ban plastic bags was widely welcomed.', options: ['decide', 'decisive', 'decision', 'deciding'], answer: 2, explain: 'Sau sở hữu cách (The government\'s) cần danh từ: decision to + V. decide là động từ; decisive là tính từ; deciding không tự nhiên trong cấu trúc này.' },
      { q: 'The chart shows an increase ___ 12% in exports.', options: ['in', 'on', 'at', 'of'], answer: 3, explain: 'increase of + con số (tăng 12%); increase in + thứ thay đổi → an increase of 12% in exports. in, on, at không đi trước con số trong cấu trúc này.' },
      { q: 'Câu nào đúng?', options: ['The rapid growth of online shopping has hurt local stores.', 'The rapid grow of online shopping has hurt local stores.', 'The rapidly growth of online shopping has hurt local stores.', 'The rapid growing of online shopping have hurt local stores.'], answer: 0, explain: 'tính từ + danh từ: rapid growth; chủ ngữ số ít → has hurt. "grow" là động từ; "rapidly growth" sai (trạng từ không bổ nghĩa danh từ); "growing… have" sai hòa hợp.' },
      { q: 'Câu nào đúng?', options: ['Because of people moved to cities, rural schools closed.', 'Because of migration to cities, rural schools closed.', 'Because migration to cities, rural schools closed.', 'Due to people migrate to cities, rural schools closed.'], answer: 1, explain: 'Because of + cụm danh từ → Because of migration to cities. "Because of people moved" và "Due to people migrate" đặt mệnh đề sau giới từ; "Because migration" thiếu of.' },
      { q: 'Câu nào đúng?', options: ['The analyze of the data took weeks.', 'The analyzing of data took weeks.', 'The analyst of the data took weeks.', 'The analysis of the data took weeks.'], answer: 3, explain: 'Danh từ của analyze là analysis → The analysis of the data. analyze là động từ; analyzing không tự nhiên ở đây; analyst là người phân tích, sai nghĩa.' },
      { q: 'Câu nào cùng nghĩa? “Sales fell sharply in May.”', options: ['There was a sharp fall in sales in May.', 'There was a sharply fall in sales in May.', 'There was a sharp fall of sales in May.', 'Sales had a sharp falling at May.'], answer: 0, explain: 'Danh từ hóa: fell sharply → a sharp fall (tính từ + danh từ); danh từ fall/rise đi với in để chỉ cái gì tăng giảm → a sharp fall in sales.' },
      { q: 'Câu nào cùng nghĩa? “Because the factory closed, 500 people lost their jobs.”', options: ['The factory closing led 500 people lost their jobs.', 'The closure of the factory resulted in 500 job losses.', 'The close of factory resulted 500 job losses.', 'Because of the factory closed, 500 jobs lost.'], answer: 1, explain: 'Danh từ hóa: the factory closed → the closure of the factory; dẫn đến kết quả dùng result in + danh từ → resulted in 500 job losses.' },
      { q: 'Câu nào cùng nghĩa? “Scientists failed to predict the earthquake, which caused public anger.”', options: ['Scientists\' fail to predict the earthquake caused public anger.', 'The failing of scientists predicted the earthquake caused anger.', 'Scientists\' failure to predict the earthquake caused public anger.', 'Scientists failure predicting the earthquake angry the public.'], answer: 2, explain: 'failed → failure to + V; dùng sở hữu cách Scientists\'. "Scientists\' fail" dùng động từ làm danh từ; câu 2 đổi nghĩa; các phương án còn lại sai cấu trúc danh từ hóa.' },
      { q: 'The ___ of the new policy led to protests.', options: ['introduction', 'introduce', 'introducing of', 'introduced'], answer: 0, explain: 'Sau The và trước of cần danh từ: introduce → introduction (sự ban hành). introduce là động từ; "introducing of" sai; introduced là V3.' },
      { q: 'There has been a significant ___ in the number of online shoppers.', options: ['increased', 'increasingly', 'increase', 'increasing'], answer: 2, explain: 'Sau a + tính từ (significant) cần danh từ → an increase in (sự tăng lên về). increased là V3/tính từ; increasingly là trạng từ; increasing là tính từ/V-ing.' },
      { q: 'Câu nào là dạng danh từ hóa của: "The government failed to act, which made the crisis worse."', options: ['The government\'s fail to act worsened the crisis.', 'The government failing act worsened the crisis.', 'The failure of government act worsening the crisis.', 'The government\'s failure to act worsened the crisis.'], answer: 3, explain: 'Danh từ hóa: failed → failure (failure to V); made worse → worsened → The government\'s failure to act worsened the crisis.' },
      { q: 'Researchers have little ___ of how the virus spreads.', options: ['understood', 'understandable', 'understanding', 'understand'], answer: 2, explain: 'Sau little cần danh từ: understanding of (hiểu biết về) → little understanding of. understood là V3; understandable là tính từ; understand là động từ.' },
      { q: 'The ___ of plastic bags has reduced waste.', options: ['prohibited', 'prohibition', 'prohibit', 'prohibiting of'], answer: 1, explain: 'Sau The và trước of cần danh từ: prohibit → prohibition (lệnh cấm). prohibited là V3; prohibit là động từ; "prohibiting of" sai.' },
      { q: 'Câu nào cùng nghĩa? "Prices rose rapidly, so demand fell."', options: ['The rapid rise in prices led to a fall in demand.', 'The rapid rise of prices leading a fall in demand.', 'The rapidly rise in prices led to a fall in demand.', 'Prices rapid rising caused demand falling.'], answer: 0, explain: 'Danh từ hóa: rose rapidly → the rapid rise in prices (tính từ + danh từ); so demand fell → led to a fall in demand.' }
    ]
  });

  G.push({
    id: 'parallel-structure', unit: 'academic', order: 9,
    title: 'Cấu trúc song song & so sánh đúng', en: 'Parallel Structure & Faulty Comparisons', level: 'B2', emoji: '🟰',
    summary: 'Các thành phần nối bằng and, or, but, both…and, not only…but also phải cùng dạng ngữ pháp; khi so sánh phải so hai thứ cùng loại.',
    blocks: [
      { type: 'diagram', caption: 'Kiểm tra tính song song của một chuỗi liệt kê', steps: [
        { t: 'The scheme aims to cut traffic, improving air quality and safer roads.', c: 'note' },
        { t: 'Liệt kê các thành phần sau “aims to”', c: 'if' },
        { t: 'cut (V) | improving (V-ing) | safer roads (N) → không cùng dạng ✗', c: 'arrow' },
        { t: 'Đưa tất cả về cùng một dạng (V nguyên mẫu)', c: 'arrow' },
        { t: 'The scheme aims to cut traffic, improve air quality and make roads safer.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Liệt kê', parts: [ { t: 'A (dạng X)', c: 'obj' }, { t: ',', c: 'adv' }, { t: 'B (dạng X)', c: 'obj' }, { t: 'and', c: 'aux' }, { t: 'C (dạng X)', c: 'obj' } ], ex: 'Exercise [[improves sleep, reduces stress and boosts energy]].' },
        { label: 'Liên từ cặp', parts: [ { t: 'both / either / not only', c: 'aux' }, { t: 'X', c: 'obj' }, { t: 'and / or / but also', c: 'aux' }, { t: 'X', c: 'obj' } ], ex: 'The course is [[both affordable and flexible]].' },
        { label: 'So sánh', parts: [ { t: 'N1 of A', c: 'subj' }, { t: 'is higher than', c: 'verb' }, { t: 'that / those of B', c: 'obj' } ], ex: '[[The birth rate in Japan]] is lower than [[that in India]].' }
      ] },
      { type: 'uses', items: [
        { title: 'Song song danh từ', ex: 'The city is famous for its [[museums, parks and nightlife]].', vi: 'Thành phố nổi tiếng với bảo tàng, công viên và cuộc sống về đêm.' },
        { title: 'Song song động từ nguyên mẫu', ex: 'Students need to [[manage their time, set goals and ask for help]].', vi: 'Sinh viên cần quản lý thời gian, đặt mục tiêu và nhờ giúp đỡ.' },
        { title: 'Song song V-ing', ex: 'I enjoy [[hiking, swimming and cycling]].', vi: 'Tôi thích đi bộ đường dài, bơi và đạp xe.' },
        { title: 'Not only… but also: hai vế cùng loại từ', ex: 'The policy is [[not only unfair but also ineffective]].', vi: 'Chính sách này không chỉ bất công mà còn kém hiệu quả.' },
        { title: 'So sánh cùng loại đối tượng', ex: '[[Spending on health]] was higher than [[spending on defense]].', vi: 'Chi tiêu cho y tế cao hơn chi tiêu cho quốc phòng.' }
      ] },
      { type: 'table', head: ['Sai (không song song)', 'Đúng'], rows: [
        ['She likes reading, to swim and yoga.', 'She likes reading, swimming and doing yoga.'],
        ['The job is well-paid and has interest.', 'The job is well-paid and interesting.'],
        ['Either we act now or suffering later.', 'Either we act now or we suffer later.'],
        ['Rents in Paris are higher than Berlin.', 'Rents in Paris are higher than those in Berlin.'],
        ['Her essay was better than the other students.', 'Her essay was better than those of the other students.']
      ] },
      { type: 'tip', text: 'Mẹo kiểm tra: che từ nối (and/or/but) rồi đọc từng thành phần ghép với phần đầu câu. “The scheme aims to… safer roads” nghe sai ngay.' },
      { type: 'tip', text: "So sánh có giới từ cũng song song được: Rents in London are higher than in Tokyo (lặp giới từ in) là câu đúng, tương đương than those in Tokyo. Chỉ sai khi đem rents so với một thành phố: …higher than Tokyo." },
      { type: 'mistake', wrong: 'Online courses are cheap, flexible and you can study anywhere.', right: 'Online courses are cheap, flexible and accessible from anywhere.', why: 'Hai thành phần đầu là tính từ, thành phần thứ ba lại là mệnh đề → đổi thành tính từ.' },
      { type: 'mistake', wrong: 'The salary of a nurse is lower than a doctor.', right: 'The salary of a nurse is lower than that of a doctor.', why: 'Phải so lương với lương, không so lương với bác sĩ.' },
      { type: 'mistake', wrong: 'Not only cars pollute the air but also make noise.', right: 'Cars not only pollute the air but also make noise.', why: 'Not only và but also phải đứng trước cùng loại thành phần (ở đây là động từ). Nếu đặt Not only đầu câu thì phải đảo ngữ.' },
      { type: 'ielts', text: 'Câu liệt kê song song rất thường gặp ở câu mở bài và câu chủ đề của Task 2. Lỗi so sánh sai đối tượng là lỗi số 1 trong Task 1 – luôn dùng that of / those of.', ex: 'Remote working [[not only saves commuting time but also allows]] parents to spend more time with their children.' }
    ],
    quiz: [
      { q: 'The new library is spacious, modern and ___.', options: ['it is comfortable', 'comfortably', 'comfortable', 'comfort'], answer: 2, explain: 'Ba tính từ song song: spacious, modern, comfortable. "it is comfortable" phá vỡ song song; comfortably là trạng từ; comfort là danh từ.' },
      { q: 'Good teachers inspire students, explain clearly and ___ feedback.', options: ['giving', 'give', 'to give', 'gave'], answer: 1, explain: 'Ba động từ hiện tại đơn song song: inspire, explain, give. giving, to give, gave không song song với inspire, explain.' },
      { q: 'The population of Vietnam is larger than ___ of Thailand.', options: ['that', 'those', 'it', 'the one'], answer: 0, explain: 'So sánh dân số với dân số; population số ít → that of Thailand. those là số nhiều; it và the one không dùng với of trong phép so sánh này.' },
      { q: 'You can either pay online or ___ at the counter.', options: ['paying', 'to pay', 'paid', 'pay'], answer: 3, explain: 'either… or… nối hai thành phần cùng dạng → either pay… or pay. paying, to pay, paid không song song với pay.' },
      { q: 'The festival is popular not only with locals but also ___.', options: ['tourists like it', 'with tourists', 'tourists', 'for tourists like'], answer: 1, explain: 'Cấu trúc song song: not only with locals but also WITH tourists – hai vế phải cùng dạng (giới từ + danh từ).' },
      { q: 'I prefer traveling by train to ___.', options: ['fly', 'flying', 'the plane flies', 'to fly'], answer: 1, explain: 'prefer V-ing to V-ing: hai vế song song cùng dạng V-ing → traveling … to flying. fly và to fly không song song với traveling; "the plane flies" là mệnh đề.' },
      { q: 'Câu nào đúng?', options: ['The aim is to reduce costs, improving services and more jobs.', 'The aim is reducing costs, to improve services and create jobs.', 'The aim is to reduce costs, improve services and create jobs.', 'The aim is to reduce costs, improve services and creation of jobs.'], answer: 2, explain: 'Ba động từ nguyên mẫu song song sau to → to reduce costs, improve services and create jobs. Các câu khác trộn to V, V-ing và danh từ.' },
      { q: 'Câu nào đúng?', options: ['Wages in the private sector rose faster than the public sector.', 'Wages in the private sector rose faster than those in the public sector.', 'Wages in the private sector rose faster than that in the public sector.', 'Wages in the private sector rose faster than public.'], answer: 1, explain: 'So lương với lương; wages số nhiều → those in the public sector. Câu 1 so lương với một khu vực (sai logic); that là số ít; "than public" thiếu danh từ.' },
      { q: 'Câu nào đúng?', options: ['The apartment is both cheap and it is central.', 'The apartment is both cheap and in the center.', 'The apartment both is cheap and central.', 'The apartment is both cheap and central.'], answer: 3, explain: 'both A and B: A và B cùng loại từ (tính từ + tính từ) → both cheap and central. Không chèn thêm mệnh đề "it is" vào vế sau.' },
      { q: 'Câu nào cùng nghĩa? “Cycling is healthy. It is also cheap.”', options: ['Cycling is not only healthy but also cheap.', 'Cycling is not only healthy but also it is cheap.', 'Not only cycling is healthy but also cheap.', 'Cycling not only is healthy but cheapness.'], answer: 0, explain: 'not only + adj + but also + adj, song song hoàn hảo. Câu 2 thêm mệnh đề phá vỡ song song; câu 3 đặt not only sai vị trí; câu 4 dùng danh từ cheapness.' },
      { q: 'Câu nào cùng nghĩa? “Tokyo\'s rents are high, but London\'s rents are higher.”', options: ['London\'s rents are higher than Tokyo.', 'London is higher rents than Tokyo.', 'Rents in London are higher than in Tokyo\'s.', 'Rents in London are higher than those in Tokyo.'], answer: 3, explain: 'So rents với rents → those in Tokyo. Câu 1 so tiền thuê với thành phố; câu 2 sai cấu trúc; "than in Tokyo\'s" thừa sở hữu cách.' },
      { q: 'Câu nào cùng nghĩa? “The job involves writing reports. It also involves meeting clients and traveling abroad.”', options: ['The job involves writing reports, to meet clients and travel abroad.', 'The job involves writing reports, meeting clients and traveling abroad.', 'The job involves writing reports, meet clients and traveling abroad.', 'The job involves to write reports, meeting clients and travels abroad.'], answer: 1, explain: 'involve + V-ing; ba hành động liệt kê phải song song cùng dạng V-ing → writing reports, meeting clients and traveling abroad.' }
    ]
  });

  G.push({
    id: 'punctuation', unit: 'academic', order: 10,
    title: 'Dấu câu cho IELTS Writing', en: 'Punctuation: Commas, Semicolons, Colons, Apostrophes, Hyphens', level: 'B2', emoji: '✒️',
    summary: 'Dấu câu đúng giúp câu phức rõ nghĩa: dấu phẩy sau mệnh đề phụ đứng đầu, dấu chấm phẩy nối hai câu độc lập, dấu hai chấm trước danh sách/giải thích, dấu nháy cho sở hữu và gạch nối cho tính từ ghép.',
    blocks: [
      { type: 'diagram', caption: 'Nối hai mệnh đề độc lập: chọn cách nào?', steps: [
        { t: 'Prices rose sharply + demand remained strong', c: 'note' },
        { t: 'Chỉ dùng dấu phẩy? → “comma splice” ✗', c: 'if' },
        { t: '↓ Chọn một trong ba cách đúng', c: 'arrow' },
        { t: 'Dấu chấm: Prices rose sharply. However, demand remained strong.', c: 'result' },
        { t: 'Chấm phẩy: Prices rose sharply; however, demand remained strong.', c: 'result' },
        { t: 'Phẩy + liên từ: Prices rose sharply, but demand remained strong.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Mệnh đề phụ đứng đầu', parts: [ { t: 'Although / If / When + mệnh đề', c: 'adv' }, { t: ',', c: 'neg' }, { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' } ], ex: 'If the trend continues[[,]] the city will run out of water.' },
        { label: 'Chấm phẩy + từ nối', parts: [ { t: 'Câu 1', c: 'subj' }, { t: '; however / therefore ,', c: 'neg' }, { t: 'Câu 2', c: 'obj' } ], ex: 'The scheme was costly[[; nevertheless,]] it was a success.' },
        { label: 'Dấu hai chấm', parts: [ { t: 'Câu hoàn chỉnh', c: 'subj' }, { t: ':', c: 'neg' }, { t: 'danh sách / giải thích', c: 'obj' } ], ex: 'Three sectors grew[[:]] tourism, retail and IT.' },
        { label: 'Tính từ ghép trước danh từ', parts: [ { t: 'a', c: 'aux' }, { t: 'well-known / five-year', c: 'verb' }, { t: 'N', c: 'obj' } ], ex: 'The government launched a [[ten-year]] plan.' }
      ] },
      { type: 'uses', items: [
        { title: 'Dấu phẩy sau từ nối đầu câu', ex: 'In addition[[,]] the bridge will reduce commute times.', vi: 'Thêm vào đó, cây cầu sẽ rút ngắn thời gian di chuyển.' },
        { title: 'Dấu phẩy quanh mệnh đề quan hệ không xác định', ex: 'Hanoi[[, which is the capital,]] has a population of over eight million.', vi: 'Hà Nội, vốn là thủ đô, có dân số hơn tám triệu người.' },
        { title: 'Dấu chấm phẩy nối hai ý liên quan chặt', ex: 'Some people work to live[[;]] others live to work.', vi: 'Một số người làm việc để sống; số khác sống để làm việc.' },
        { title: 'Dấu nháy sở hữu: số ít \'s, số nhiều s\'', ex: 'The [[country\'s]] economy depends on its [[farmers\']] exports.', vi: 'Nền kinh tế của đất nước phụ thuộc vào hàng xuất khẩu của nông dân.' },
        { title: 'Gạch nối cho tính từ ghép (số + danh từ số ít)', ex: 'It was a [[two-hour]] exam with a [[500-word]] essay.', vi: 'Đó là bài thi hai tiếng với một bài luận 500 từ.' }
      ] },
      { type: 'table', head: ['Dấu', 'Dùng khi', 'Ví dụ'], rows: [
        [', (phẩy)', 'Sau mệnh đề phụ / từ nối đầu câu; liệt kê', 'However, the data is limited.'],
        ['; (chấm phẩy)', 'Nối hai câu độc lập liên quan', 'Rents rose; wages did not.'],
        [': (hai chấm)', 'Sau câu hoàn chỉnh, trước danh sách/giải thích', 'One factor stands out: cost.'],
        ['\'s / s\'', 'Sở hữu số ít / số nhiều tận cùng s', 'the city\'s parks / the students\' grades'],
        ['its vs it\'s', 'its = của nó; it\'s = it is', 'The company raised its prices.'],
        ['- (gạch nối)', 'Tính từ ghép đứng trước danh từ', 'a well-paid job (nhưng: the job is well paid)']
      ] },
      { type: 'tip', text: 'Không đặt dấu phẩy giữa chủ ngữ và động từ, và không đặt dấu phẩy trước “that” trong mệnh đề danh từ: “Many people believe that…” – không có dấu phẩy.' },
      { type: 'tip', text: 'Không viết tắt (don\'t, it\'s, can\'t) trong IELTS Writing; viết đầy đủ do not, it is, cannot để giữ văn phong trang trọng.' },
      { type: 'tip', text: "Anh-Mỹ: (1) Dấu phẩy Oxford (serial comma) trước and/or cuối danh sách là chuẩn trong hầu hết sách hướng dẫn văn phong Mỹ: tourism, retail, and IT. Anh-Anh thường bỏ. Cả hai đều chấp nhận được – miễn là nhất quán. (2) Dấu chấm và dấu phẩy đặt BÊN TRONG ngoặc kép: The sign said “Closed.” (Anh-Anh thường đặt ngoài)." },
      { type: 'mistake', wrong: 'Many people live alone, this can lead to loneliness.', right: 'Many people live alone, which can lead to loneliness.', why: 'Comma splice: không được nối hai câu độc lập chỉ bằng dấu phẩy. Dùng which, dấu chấm hoặc chấm phẩy.' },
      { type: 'mistake', wrong: 'The company increased it\'s profits.', right: 'The company increased its profits.', why: 'its (sở hữu) không có dấu nháy; it\'s = it is.' },
      { type: 'mistake', wrong: 'The number of tourist\'s rose; however the profits fell.', right: 'The number of tourists rose; however, the profits fell.', why: 'Số nhiều không có dấu nháy; sau however cần dấu phẩy.' },
      { type: 'ielts', text: 'Lỗi comma splice và thiếu dấu phẩy sau mệnh đề phụ được tính là lỗi ngữ pháp, ảnh hưởng trực tiếp đến band Grammatical Range & Accuracy. Một câu dùng đúng dấu chấm phẩy hoặc hai chấm cho thấy khả năng kiểm soát câu phức.', ex: 'Two factors explain this trend[[:]] rising incomes and cheaper flights. As a result, the region\'s tourism industry has grown rapidly[[; however,]] its infrastructure has not kept pace.' }
    ],
    quiz: [
      { q: 'Choose the correct punctuation: “The plan was expensive ___ it was approved.”', options: [', however', '; however,', ': however', 'however,'], answer: 1, explain: 'Hai câu độc lập + however → dấu chấm phẩy trước, dấu phẩy sau. ", however" tạo comma splice; ": however" sai dấu; "however," thiếu dấu ngăn cách hai câu.' },
      { q: 'The government has three priorities ___ health, education and housing.', options: [':', ';', ',', '-'], answer: 0, explain: 'Dấu hai chấm đứng sau một câu hoàn chỉnh để giới thiệu danh sách → priorities: health, education and housing. Dấu chấm phẩy nối hai mệnh đề độc lập; dấu phẩy và gạch ngang không dùng như vậy trong văn trang trọng.' },
      { q: 'All the ___ results were published online.', options: ['student\'s', 'students', 'students\'', 'student\'s\''], answer: 2, explain: 'Kết quả của nhiều sinh viên (sở hữu số nhiều) → students\'. student\'s là một sinh viên; students thiếu dấu sở hữu; student\'s\' sai.' },
      { q: 'The firm cut ___ workforce by 10%.', options: ['it\'s', 'its\'', 'it is', 'its'], answer: 3, explain: 'its = của nó (tính từ sở hữu, không dấu nháy) → its workforce. it\'s = it is; its\' không tồn tại; it is sai nghĩa.' },
      { q: 'She signed a ___ contract.', options: ['three-years', 'three year\'s', 'three-year', 'three years'], answer: 2, explain: 'Tính từ ghép trước danh từ: số + danh từ số ít + gạch nối. "three-years" sai số; "three year\'s" thừa sở hữu; "three years" thiếu gạch nối khi đứng trước danh từ.' },
      { q: 'Choose the correct sentence beginning: “___ the number of visitors fell sharply.”', options: ['In 2020,', 'In 2020;', 'In 2020:', 'In, 2020'], answer: 0, explain: 'Cụm trạng ngữ đứng đầu câu thường theo sau là dấu phẩy. Dấu chấm phẩy và hai chấm không dùng sau cụm trạng ngữ; "In, 2020" đặt dấu phẩy sai.' },
      { q: 'Câu nào đúng?', options: ['Although it was raining, the event went ahead.', 'Although it was raining the event, went ahead.', 'Although, it was raining the event went ahead.', 'Although it was raining; the event went ahead.'], answer: 0, explain: 'Mệnh đề phụ đứng đầu + dấu phẩy rồi đến mệnh đề chính. Ba phương án còn lại đặt dấu phẩy/chấm phẩy sai vị trí.' },
      { q: 'Câu nào đúng?', options: ['Most experts agree, that the climate is warming.', 'Most experts agree that the climate is warming.', 'Most experts, agree that the climate is warming.', 'Most experts agree; that the climate is warming.'], answer: 1, explain: 'Không có dấu phẩy trước that của mệnh đề danh từ hay giữa chủ ngữ và động từ. Ba phương án còn lại thêm dấu phẩy/chấm phẩy không cần thiết.' },
      { q: 'Câu nào đúng?', options: ['Unemployment fell, this was good news.', 'Unemployment fell this was good news.', 'Unemployment fell, which was good news.', 'Unemployment fell: which was good news.'], answer: 2, explain: 'Nối hai ý bằng mệnh đề quan hệ which để tránh lỗi comma splice → Unemployment fell, which was good news. Câu 1 nối hai câu bằng dấu phẩy (comma splice); câu 2 thiếu dấu câu; dấu hai chấm không đứng trước which.' },
      { q: 'Câu nào cùng nghĩa? “The economy of the country grew. The exports of its farmers rose.”', options: ['The countrys economy grew, and its farmer\'s exports rose.', 'The country\'s economy grew, and its farmers\' exports rose.', 'The countries economy grew, and it\'s farmers exports rose.', 'The country\'s economy grew and it\'s farmers\' exports rose.'], answer: 1, explain: 'country\'s (số ít), farmers\' (số nhiều), its (sở hữu). Các phương án khác viết sai sở hữu cách (countrys, farmer\'s, countries) hoặc nhầm it\'s với its.' },
      { q: 'Câu nào cùng nghĩa? “Some prefer cities. Others prefer the countryside.”', options: ['Some prefer cities, others prefer the countryside.', 'Some prefer cities: others, prefer the countryside.', 'Some prefer cities others prefer the countryside.', 'Some prefer cities; others prefer the countryside.'], answer: 3, explain: 'Hai câu độc lập liên quan → chấm phẩy (không dùng chỉ dấu phẩy). Câu 1 là comma splice; câu 2 đặt dấu sai; câu 3 thiếu dấu câu (run-on).' },
      { q: 'Câu nào cùng nghĩa? “The job pays well. It is a job downtown.”', options: ['It is a well-paid job downtown.', 'It is a well paid-job downtown.', 'It is a well-paid-job down-town.', 'It is a wellpaid job downtown.'], answer: 0, explain: 'Tính từ ghép đứng trước danh từ có gạch nối → a well-paid job; downtown viết liền, không có gạch nối. Các phương án khác đặt gạch nối sai vị trí, thừa gạch nối hoặc viết liền "wellpaid".' }
    ]
  });

  G.push({
    id: 'future-in-past', unit: 'academic', order: 11,
    title: 'Tương lai trong quá khứ', en: 'Future in the Past: was going to, was about to, would', level: 'B2', emoji: '🔮',
    summary: 'Diễn đạt điều từng được dự định, dự đoán hoặc sắp xảy ra tại một thời điểm trong quá khứ – thường là kế hoạch không thành hiện thực.',
    blocks: [
      { type: 'diagram', caption: 'Đứng ở một thời điểm trong quá khứ và nhìn về “tương lai” lúc đó', steps: [
        { t: 'Thời điểm quá khứ: In 2015, …', c: 'note' },
        { t: 'Là dự định / kế hoạch lúc đó? → was/were going to + V', c: 'if' },
        { t: 'I was going to study abroad (but I didn\'t).', c: 'result' },
        { t: 'Là việc sắp xảy ra ngay lúc đó? → was/were about to + V', c: 'if' },
        { t: 'We were about to leave when the phone rang.', c: 'result' },
        { t: 'Là dự đoán / lời hứa được tường thuật? → would + V', c: 'if' },
        { t: 'Few people thought prices would fall.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Dự định (thường không thành)', parts: [ { t: 'S', c: 'subj' }, { t: 'was / were going to', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'I [[was going to study]] law, but I changed my mind.' },
        { label: 'Sắp xảy ra ngay lúc đó', parts: [ { t: 'S', c: 'subj' }, { t: 'was / were about to', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'We [[were about to leave]] when the phone rang.' },
        { label: 'Dự đoán/lời hứa trong quá khứ', parts: [ { t: 'S', c: 'subj' }, { t: 'said / thought / knew', c: 'verb' }, { t: 'S', c: 'subj' }, { t: 'would', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'Experts predicted that the economy [[would recover]] by 2012.' },
        { label: 'Kế hoạch đã sắp xếp', parts: [ { t: 'S', c: 'subj' }, { t: 'was / were', c: 'aux' }, { t: 'V-ing', c: 'verb' }, { t: 'the next day', c: 'time' } ], ex: 'She [[was flying]] to Singapore the next morning.' }
      ] },
      { type: 'uses', items: [
        { title: 'Kế hoạch bị thay đổi', ex: 'The council [[was going to build]] a parking garage, but residents protested.', vi: 'Hội đồng định xây bãi đỗ xe, nhưng người dân phản đối.' },
        { title: 'Suýt nữa / sắp sửa thì…', ex: 'I [[was about to give up]] when I finally found a job.', vi: 'Tôi đã sắp bỏ cuộc thì cuối cùng cũng tìm được việc.' },
        { title: 'Lời dự đoán trong quá khứ (tường thuật)', ex: 'In 2000, few people thought smartphones [[would become]] so common.', vi: 'Năm 2000, ít ai nghĩ điện thoại thông minh sẽ trở nên phổ biến như vậy.' },
        { title: 'Định mệnh, kể chuyện (was to / would)', ex: 'She moved to London in 1990, where she [[would spend]] the rest of her life.', vi: 'Bà chuyển đến London năm 1990, nơi bà sẽ sống phần đời còn lại.' },
        { title: 'Kế hoạch đã hủy (was to have + V3)', ex: 'The minister [[was to have opened]] the bridge, but he fell ill.', vi: 'Bộ trưởng lẽ ra sẽ khánh thành cây cầu, nhưng ông bị ốm.' }
      ] },
      { type: 'table', head: ['Hiện tại', 'Tương lai trong quá khứ', 'Ví dụ'], rows: [
        ['am/is/are going to', 'was/were going to', 'I thought it was going to rain.'],
        ['will', 'would', 'He promised he would help.'],
        ['am/is/are about to', 'was/were about to', 'The movie was about to start.'],
        ['am/is/are V-ing (kế hoạch)', 'was/were V-ing', 'They were meeting at six.'],
        ['is to + V (sắp xếp chính thức)', 'was to + V', 'The summit was to take place in May.']
      ] },
      { type: 'tip', text: 'Trong Speaking Part 2 (kể chuyện quá khứ), “I was going to…, but…” và “I was just about to… when…” giúp câu chuyện sống động và thể hiện đa dạng ngữ pháp.' },
      { type: 'mistake', wrong: 'I was going to visit my aunt, and I visited her.', right: 'I was going to visit my aunt, but I didn\'t have time.', why: '“was going to” thường ngụ ý kế hoạch KHÔNG xảy ra; nếu đã làm thì dùng quá khứ đơn: I visited my aunt.' },
      { type: 'mistake', wrong: 'In 2010, experts said that prices will double.', right: 'In 2010, experts said that prices would double.', why: 'Lời dự đoán trong quá khứ → lùi will thành would (chỉ giữ will khi điều được dự đoán vẫn còn ở tương lai so với hiện tại).' },
      { type: 'mistake', wrong: 'We were about leaving when it started to rain.', right: 'We were about to leave when it started to rain.', why: 'be about to + V nguyên mẫu.' },
      { type: 'ielts', text: 'Task 1 có dự báo: “It was predicted that…would…”. Speaking Part 2 về một kế hoạch đã thay đổi hoặc một quyết định: dùng was going to và was about to.', ex: 'I [[was originally going to study]] engineering, but just as I [[was about to submit]] my application, I realized my real passion was design.' }
    ],
    quiz: [
      { q: 'I ___ call you, but my phone battery died.', options: ['was going to', 'am going to', 'will', 'was about'], answer: 0, explain: 'Kế hoạch trong quá khứ không thành → was going to. am going to và will là hiện tại/tương lai; "was about" thiếu to.' },
      { q: 'The plane ___ take off when the engine failed.', options: ['would', 'was about to', 'is about to', 'was going'], answer: 1, explain: 'Việc sắp xảy ra ngay lúc đó (máy bay sắp cất cánh thì hỏng động cơ) → was about to + V. would không diễn tả "sắp sửa"; is about to sai thì; "was going" thiếu to.' },
      { q: 'In 1995, nobody believed the internet ___ change shopping so dramatically.', options: ['will', 'is going to', 'would', 'has'], answer: 2, explain: 'Dự đoán trong quá khứ về tương lai (năm 1995) → would + V. will và is going to là thì hiện tại; has sai cấu trúc.' },
      { q: 'We ___ to meet at the station, but the train was canceled.', options: ['are going', 'would', 'will', 'were going'], answer: 3, explain: 'was/were going to + V = đã định làm gì trong quá khứ (nhưng không thành) → were going to meet.' },
      { q: 'He promised that he ___ the report by Friday.', options: ['would finish', 'will finish', 'finishes', 'was finish'], answer: 0, explain: 'Tường thuật lời hứa trong quá khứ → would + V → would finish. will finish không lùi thì; finishes sai thì; "was finish" sai cấu trúc.' },
      { q: 'The opening ceremony ___ to take place in March, but it was postponed.', options: ['is', 'was', 'will be', 'has been'], answer: 1, explain: 'was to + V: sự sắp xếp chính thức trong quá khứ (nhưng bị hoãn) → was. is và will be là hiện tại/tương lai; has been sai thì.' },
      { q: 'Câu nào đúng?', options: ['I was about to leaving when she arrived.', 'I was about leave when she arrived.', 'I was about to leave when she arrived.', 'I am about to leave when she arrived.'], answer: 2, explain: 'was about to + V nguyên mẫu, nhất quán thì quá khứ. "about to leaving" sai dạng; "about leave" thiếu to; "am about to" sai thì.' },
      { q: 'Câu nào đúng?', options: ['She knew the exam will be difficult.', 'She knew the exam would be difficult.', 'She knew the exam is going be difficult.', 'She knew the exam would being difficult.'], answer: 1, explain: 'Tương lai trong quá khứ: động từ chính ở quá khứ (knew) → will lùi thành would + V nguyên mẫu → would be difficult.' },
      { q: 'Câu nào đúng?', options: ['They were going to buy a house, but prices rose too quickly.', 'They are going to buy a house, but prices rose too quickly.', 'They were going buy a house, but prices rose too quickly.', 'They would going to buy a house, but prices rose too quickly.'], answer: 0, explain: 'Kế hoạch trong quá khứ không thành → were going to + V. are going to sai thì; "were going buy" thiếu to; "would going to" sai cấu trúc.' },
      { q: 'Câu nào cùng nghĩa? “I intended to apply for the job, but I didn\'t.”', options: ['I will apply for the job.', 'I was about to apply for the job and did.', 'I applied for the job.', 'I was going to apply for the job.'], answer: 3, explain: 'was going to + V = đã định làm (nhưng không làm) → I was going to apply. will apply sai thì; "was about to… and did" và "I applied" trái nghĩa với câu gốc.' },
      { q: 'Câu nào cùng nghĩa? “The bus was just going to leave when I got there.”', options: ['The bus had left when I got there.', 'The bus was about to leave when I got there.', 'The bus would leave after I got there.', 'The bus left before I got there.'], answer: 1, explain: 'just going to leave = about to leave (sắp sửa) → The bus was about to leave. had left và left before nghĩa là xe đã đi rồi; would leave after sai nghĩa.' },
      { q: 'Câu nào cùng nghĩa? “Experts said, ‘Unemployment will fall next year.’”', options: ['Experts said that unemployment will fall the next year.', 'Experts said that unemployment fell the next year.', 'Experts said that unemployment would fall the following year.', 'Experts said that unemployment is falling next year.'], answer: 2, explain: 'Tường thuật: will → would, next year → the following year. "will fall" không lùi thì; "fell" đổi nghĩa thành việc đã xảy ra; phương án còn lại sai dạng tường thuật.' }
    ]
  });

  G.push({
    id: 'alternatives-to-if', unit: 'academic', order: 12,
    title: 'Các cách thay thế cho “if”', en: 'Alternatives to If', level: 'C1', emoji: '🔀',
    summary: 'Unless, provided that, as long as, in case, otherwise, were to và đảo ngữ với should/were/had giúp diễn đạt điều kiện chính xác và đa dạng hơn “if”.',
    blocks: [
      { type: 'sort', caption: 'Nhóm các từ thay thế if theo ý nghĩa', groups: [
        { title: 'Điều kiện bắt buộc (chỉ khi)', emoji: '✅', items: ['provided (that)', 'providing (that)', 'as long as', 'so long as', 'on condition that', 'only if'] },
        { title: 'Phủ định / hậu quả', emoji: '⛔', items: ['unless (= if … not)', 'otherwise', 'or else', 'but for + N'] },
        { title: 'Phòng khi', emoji: '☂️', items: ['in case', 'in the event of + N', 'in case of + N'] },
        { title: 'Giả định / trang trọng', emoji: '🎩', items: ['suppose / supposing', 'were to + V', 'Should + S + V', 'Were + S + to V', 'Had + S + V3'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Unless', parts: [ { t: 'Unless', c: 'neg' }, { t: 'S + V (khẳng định)', c: 'subj' }, { t: ',', c: 'adv' }, { t: 'S + will V', c: 'verb' } ], ex: '[[Unless]] we act now, the problem will get worse.' },
        { label: 'Provided / As long as', parts: [ { t: 'S + will V', c: 'verb' }, { t: 'provided (that) / as long as', c: 'adv' }, { t: 'S + V (hiện tại)', c: 'subj' } ], ex: 'You can borrow the book [[as long as]] you return it by Friday.' },
        { label: 'Đảo ngữ loại 1', parts: [ { t: 'Should', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: ', S + will V', c: 'obj' } ], ex: '[[Should you need]] help, please contact the office.' },
        { label: 'Đảo ngữ loại 2', parts: [ { t: 'Were', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'to V / adj', c: 'verb' }, { t: ', S + would V', c: 'obj' } ], ex: '[[Were the government to raise]] taxes, people would protest.' },
        { label: 'Đảo ngữ loại 3', parts: [ { t: 'Had', c: 'aux' }, { t: 'S', c: 'subj' }, { t: '(not) V3', c: 'verb' }, { t: ', S + would have V3', c: 'obj' } ], ex: '[[Had we left]] earlier, we would have caught the train.' }
      ] },
      { type: 'uses', items: [
        { title: 'Unless = if … not', ex: '[[Unless]] cities invest in public transportation, congestion will worsen.', vi: 'Nếu các thành phố không đầu tư vào giao thông công cộng, ùn tắc sẽ tệ hơn.' },
        { title: 'Provided that / as long as: điều kiện tiên quyết', ex: 'Online learning works well [[provided that]] students are self-disciplined.', vi: 'Học trực tuyến hiệu quả với điều kiện sinh viên có tính kỷ luật.' },
        { title: 'In case: phòng khi (làm trước để đề phòng)', ex: 'Take an umbrella [[in case]] it rains.', vi: 'Mang theo ô phòng khi trời mưa.' },
        { title: 'Otherwise: nếu không thì', ex: 'Governments must cut emissions; [[otherwise]], sea levels will continue to rise.', vi: 'Chính phủ phải cắt giảm khí thải; nếu không, mực nước biển sẽ tiếp tục dâng.' },
        { title: 'Were to: giả định ít có khả năng, trang trọng', ex: '[[If robots were to replace]] teachers, students would lose personal guidance.', vi: 'Nếu robot thay thế giáo viên, học sinh sẽ mất đi sự hướng dẫn cá nhân.' }
      ] },
      { type: 'table', head: ['Cấu trúc', 'Nghĩa', 'Lưu ý'], rows: [
        ['unless', 'if … not', 'Không dùng thêm not sau unless (thường)'],
        ['in case', 'phòng khi', 'KHÁC if: hành động làm trước bất kể có xảy ra không'],
        ['provided / as long as', 'miễn là, với điều kiện', 'Dùng thì hiện tại, không dùng will'],
        ['otherwise', 'nếu không thì', 'Đứng đầu mệnh đề thứ hai, thường sau ; hoặc .'],
        ['Should S V', '= If S V (loại 1, trang trọng)', 'Dùng trong thư, hướng dẫn'],
        ['Had S V3', '= If S had V3 (loại 3)', 'Phủ định: Had S not V3 (không viết tắt)']
      ] },
      { type: 'tip', text: 'Sau unless, provided, as long as, in case: dùng hiện tại đơn để nói về tương lai, KHÔNG dùng will: “in case it rains”, không phải “in case it will rain”.' },
      { type: 'tip', text: "Anh-Mỹ văn nói đôi khi dùng in case với nghĩa gần như if: In case you're wondering, the meeting is at 3. Trong bài thi và văn viết, hãy giữ phân biệt chuẩn: in case = phòng khi (làm trước để đề phòng), if = nếu (chỉ làm khi điều kiện xảy ra)." },
      { type: 'mistake', wrong: 'Unless you don\'t study, you will fail.', right: 'Unless you study, you will fail.', why: 'Unless đã mang nghĩa phủ định (if … not), thêm don\'t sẽ thành phủ định kép, sai nghĩa.' },
      { type: 'mistake', wrong: 'I\'ll bring a jacket if it gets cold – I want to be ready.', right: 'I\'ll bring a jacket in case it gets cold.', why: 'Muốn nói “mang theo trước để đề phòng” → in case. “if” nghĩa là chỉ mang khi trời lạnh.' },
      { type: 'mistake', wrong: 'Had I knew the answer, I would have told you.', right: 'Had I known the answer, I would have told you.', why: 'Đảo ngữ loại 3: Had + S + V3 (known).' },
      { type: 'ielts', text: 'Task 2: unless, provided that và otherwise giúp lập luận có điều kiện rõ ràng. Một câu đảo ngữ (Should/Were/Had) ở phần giải pháp hoặc kết luận gây ấn tượng tốt về phạm vi ngữ pháp.', ex: '[[Were governments to offer]] tax incentives, more companies would switch to renewable energy; [[otherwise]], progress is likely to remain slow.' }
    ],
    quiz: [
      { q: '___ you hurry, you\'ll miss the last bus.', options: ['If', 'Unless', 'Provided', 'In case'], answer: 1, explain: 'Unless = if not: nếu không nhanh lên thì lỡ chuyến. If làm câu mâu thuẫn (nhanh lên thì lại lỡ xe); Provided và In case sai nghĩa.' },
      { q: 'You can use my car ___ you fill up the tank afterwards.', options: ['unless', 'in case', 'as long as', 'otherwise'], answer: 2, explain: 'Điều kiện tiên quyết (miễn là đổ đầy bình) → as long as. unless (trừ khi), in case (phòng khi), otherwise (nếu không thì) đều sai nghĩa.' },
      { q: 'Save your work regularly ___ the computer crashes.', options: ['in case', 'unless', 'provided', 'as long as'], answer: 0, explain: 'Làm trước để đề phòng (máy có thể bị treo) → in case. unless, provided và as long as đều đặt điều kiện, sai nghĩa.' },
      { q: '___ you require further information, please do not hesitate to contact us.', options: ['Had', 'Were', 'Unless', 'Should'], answer: 3, explain: 'Đảo ngữ câu điều kiện loại 1 trang trọng: Should + S + V → Should you require… Had dùng cho loại 3; Were dùng cho loại 2; Unless sai nghĩa.' },
      { q: '___ the scientists not discovered the leak, the plant would have exploded.', options: ['Should', 'Were', 'Had', 'If'], answer: 2, explain: 'Đảo ngữ loại 3: Had + S + (not) + V3 → Had the scientists not discovered… Should và Were dùng cho loại 1, 2; If không đảo ngữ với not đứng sau chủ ngữ như vậy.' },
      { q: 'We need to reduce plastic use; ___, our oceans will be full of waste.', options: ['unless', 'otherwise', 'provided', 'in case'], answer: 1, explain: 'otherwise = nếu không thì → …; otherwise, our oceans will be full of waste. unless, provided và in case phải đi với mệnh đề ngay sau, không đứng sau dấu chấm phẩy như vậy.' },
      { q: 'Câu nào đúng?', options: ['Unless it doesn\'t rain, we will play outside.', 'Unless it rains, we will play outside.', 'Unless it will rain, we will play outside.', 'Unless it would rain, we will play outside.'], answer: 1, explain: 'Unless đã mang nghĩa phủ định → Unless + hiện tại đơn khẳng định: Unless it rains. "doesn\'t rain" là phủ định kép; will/would không dùng sau unless.' },
      { q: 'Câu nào đúng?', options: ['Were the city to build a new stadium, it would attract more tourists.', 'Were the city build a new stadium, it would attract more tourists.', 'Were the city to built a new stadium, it would attract more tourists.', 'Was the city to build a new stadium, it will attract more tourists.'], answer: 0, explain: 'Were + S + to V, mệnh đề chính would + V → Were the city to build… "Were the city build" thiếu to; "to built" sai dạng; "Was… will" sai cấu trúc.' },
      { q: 'Câu nào đúng?', options: ['Take some cash in case the card machine will break.', 'Take some cash in case of the card machine breaks.', 'Take some cash unless the card machine breaks.', 'Take some cash in case the card machine breaks.'], answer: 3, explain: 'in case + hiện tại đơn (không dùng will); in case of + danh từ → in case the card machine breaks. "will break" sai thì; "in case of the card machine breaks" sai cấu trúc; unless sai nghĩa.' },
      { q: 'Câu nào cùng nghĩa? “If you don\'t apply before May, you won\'t get a place.”', options: ['Unless you apply before May, you won\'t get a place.', 'Unless you don\'t apply before May, you will get a place.', 'In case you apply before May, you won\'t get a place.', 'Provided you don\'t apply before May, you will get a place.'], answer: 0, explain: 'if … not = unless (trừ khi). Unless đã mang nghĩa phủ định nên không dùng thêm don\'t → Unless you apply before May, you won\'t get a place.' },
      { q: 'Câu nào cùng nghĩa? “If I had known about the strike, I would have taken a taxi.”', options: ['Should I know about the strike, I would take a taxi.', 'Were I to know about the strike, I would take a taxi.', 'Had I known about the strike, I would have taken a taxi.', 'Had I know about the strike, I would have taken a taxi.'], answer: 2, explain: 'Đảo ngữ loại 3: Had + S + V3 → Had I known… would have taken. Câu 1, 2 là loại 1, 2 (sai thời điểm); câu 4 dùng know thay vì known.' },
      { q: 'Câu nào cùng nghĩa? “The project will succeed, but only if it receives enough funding.”', options: ['The project will succeed unless it receives enough funding.', 'The project will succeed in case it receives enough funding.', 'The project will succeed otherwise it receives enough funding.', 'The project will succeed provided that it receives enough funding.'], answer: 3, explain: 'only if = provided that (với điều kiện tiên quyết) → succeed provided that it receives enough funding. unless đảo nghĩa; in case nghĩa là phòng khi; otherwise sai cấu trúc.' },
      { q: '___ you need any help, please call the front desk.', options: ['Unless', 'Provided not', 'Should', 'Would'], answer: 2, explain: 'Đảo ngữ câu điều kiện loại 1: Should + S + V = If + S + V (nếu… thì) → Should you need any help.' },
      { q: 'You can borrow my car ___ you return it by six.', options: ['provided that', 'unless', 'in case of', 'otherwise'], answer: 0, explain: 'provided (that) = với điều kiện là → provided that you return it by six. unless (trừ khi) sai nghĩa; in case of + danh từ.' },
      { q: '___ the storm, the ferry would have left on time.', options: ['Unless', 'Provided', 'As long as', 'But for'], answer: 3, explain: 'But for + danh từ = If it had not been for (nếu không có…) → But for the storm. Unless/Provided/As long as phải đi với mệnh đề.' },
      { q: 'Take an umbrella ___ it rains.', options: ['as long as', 'in case', 'unless', 'provided'], answer: 1, explain: 'in case + mệnh đề = phòng khi → Take an umbrella in case it rains. Các phương án còn lại sai nghĩa.' },
      { q: '___ he known about the delay, he would have taken a later train.', options: ['Should', 'Had', 'Did', 'Were'], answer: 1, explain: 'Đảo ngữ câu điều kiện loại 3: Had + S + V3 = If + S + had V3 → Had he known. Should dùng cho loại 1, Were cho loại 2; Did không đảo ngữ trong câu điều kiện.' },
      { q: 'Leave now; ___, you\'ll miss the bus.', options: ['unless', 'provided', 'in case', 'otherwise'], answer: 3, explain: 'otherwise = nếu không thì (đứng sau dấu chấm phẩy, trước dấu phẩy) → otherwise, you\'ll miss the bus.' }
    ]
  });

  G.push({
    id: 'emphasis-variety', unit: 'academic', order: 13,
    title: 'Nhấn mạnh & đa dạng câu', en: 'Emphasis: Emphatic do, Fronting, Cleft Sentences', level: 'C1', emoji: '📢',
    summary: 'Dùng do/does/did để nhấn mạnh, đảo thành phần lên đầu câu (fronting), và câu chẻ “What… is…”, “The reason why… is that…” để làm nổi bật thông tin quan trọng.',
    blocks: [
      { type: 'diagram', caption: 'Một ý, bốn cách nhấn mạnh khác nhau', steps: [
        { t: 'Câu gốc: Governments need stricter laws.', c: 'note' },
        { t: 'Nhấn mạnh động từ (phản bác) → Governments DO need stricter laws.', c: 'result' },
        { t: 'Nhấn mạnh thứ cần → What governments need is stricter laws.', c: 'result' },
        { t: 'Nhấn mạnh chủ thể → It is governments that need stricter laws.', c: 'result' },
        { t: 'Nhấn mạnh lý do → The reason why crime is rising is that laws are weak.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Do nhấn mạnh', parts: [ { t: 'S', c: 'subj' }, { t: 'do / does / did', c: 'aux' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: 'Exercise [[does improve]] mood, as several studies show.' },
        { label: 'Câu chẻ What', parts: [ { t: 'What', c: 'adv' }, { t: 'S + V', c: 'subj' }, { t: 'is / was', c: 'aux' }, { t: 'N / to V / mệnh đề', c: 'obj' } ], ex: '[[What concerns me most is]] the cost of housing.' },
        { label: 'Lý do', parts: [ { t: 'The reason (why) S + V', c: 'subj' }, { t: 'is', c: 'aux' }, { t: 'that', c: 'adv' }, { t: 'S + V', c: 'obj' } ], ex: '[[The reason why people move is that]] wages are higher in cities.' },
        { label: 'Fronting', parts: [ { t: 'Thành phần được nhấn mạnh', c: 'obj' }, { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' } ], ex: '[[This argument]] I find unconvincing.' }
      ] },
      { type: 'uses', items: [
        { title: 'Do/does/did: khẳng định mạnh, đặc biệt khi phản bác', ex: 'Although the course is expensive, it [[does offer]] excellent career prospects.', vi: 'Mặc dù khóa học đắt, nó thực sự mang lại triển vọng nghề nghiệp xuất sắc.' },
        { title: 'Did để nhấn mạnh trong quá khứ', ex: 'The campaign [[did raise]] awareness, even if it failed to change behavior.', vi: 'Chiến dịch quả thực đã nâng cao nhận thức, dù không thay đổi được hành vi.' },
        { title: 'What… is…: nêu điều quan trọng nhất', ex: '[[What young people need is]] practical work experience.', vi: 'Điều người trẻ cần là kinh nghiệm làm việc thực tế.' },
        { title: 'All (that)… is…: chỉ cần', ex: '[[All you need to do is]] fill in this form.', vi: 'Tất cả những gì bạn cần làm là điền vào mẫu này.' },
        { title: 'Fronting tính từ / trạng ngữ', ex: '[[Particularly worrying is]] the rise in childhood obesity.', vi: 'Đặc biệt đáng lo ngại là sự gia tăng béo phì ở trẻ em.' }
      ] },
      { type: 'table', head: ['Câu thường', 'Câu nhấn mạnh'], rows: [
        ['I agree that it is useful.', 'I do agree that it is useful.'],
        ['She missed the deadline.', 'She did miss the deadline. (đúng là đã lỡ)'],
        ['We need more nurses.', 'What we need is more nurses.'],
        ['Prices rose because demand grew.', 'The reason why prices rose is that demand grew.'],
        ['The cost surprised me.', 'What surprised me was the cost.'],
        ['The results are more important.', 'More important are the results.']
      ] },
      { type: 'tip', text: 'Sau “The reason why… is” dùng THAT, không dùng because (lặp nghĩa). Trong văn trang trọng, “The reason is because…” bị coi là lỗi.' },
      { type: 'mistake', wrong: 'He does works very hard.', right: 'He does work very hard.', why: 'Sau do/does/did nhấn mạnh, động từ luôn ở dạng nguyên mẫu.' },
      { type: 'mistake', wrong: 'The reason why I chose this course is because it is practical.', right: 'The reason why I chose this course is that it is practical.', why: 'The reason… is that…; dùng because là lặp ý.' },
      { type: 'mistake', wrong: 'What I want it is a stable job.', right: 'What I want is a stable job.', why: 'Mệnh đề What I want đã là chủ ngữ, không thêm it.' },
      { type: 'ielts', text: 'Speaking Part 3: “What I find interesting is…”, “I do think…” giúp câu trả lời tự nhiên và nhấn đúng ý. Task 2: một câu chẻ ở phần kết luận làm nổi bật quan điểm.', ex: 'Admittedly, technology [[does make]] life more convenient. [[What worries me, however, is]] the way it is reducing face-to-face contact.' }
    ],
    quiz: [
      { q: 'I know you think I forgot, but I ___ send the email.', options: ['did', 'do', 'was', 'have'], answer: 0, explain: 'Nhấn mạnh hành động trong quá khứ (phản bác) → did + V. do là hiện tại, không hợp với việc gửi email đã qua; was và have không đi với send theo cách này.' },
      { q: 'Public transportation ___ reduce congestion, despite its critics.', options: ['do', 'does', 'is', 'did to'], answer: 1, explain: 'Trợ động từ nhấn mạnh: chủ ngữ số ít (Public transport), hiện tại → does + V nguyên mẫu → does reduce. do chia số nhiều; is sai cấu trúc; "did to" thừa to.' },
      { q: '___ the government should do is invest in renewable energy.', options: ['That', 'It', 'Which', 'What'], answer: 3, explain: 'Câu chẻ What + S + V + is… → What the government should do is… That, It, Which không mở đầu mệnh đề danh từ thiếu tân ngữ như vậy.' },
      { q: 'The reason why sales fell is ___ prices went up.', options: ['because', 'that', 'why', 'which'], answer: 1, explain: 'The reason why … is that + mệnh đề. Không dùng because sau "The reason … is" vì bị lặp nghĩa nguyên nhân → that.' },
      { q: 'What surprised researchers ___ the speed of the change.', options: ['were', 'it was', 'was', 'are'], answer: 2, explain: 'Mệnh đề What… làm chủ ngữ số ít → động từ was. were và are chia số nhiều; "it was" thừa chủ ngữ.' },
      { q: '___ you need to do is press this button.', options: ['All', 'Every', 'Which', 'Whole'], answer: 0, explain: 'All (that) you need to do is + V = tất cả những gì bạn cần làm là… → All. Every/Whole không làm chủ ngữ theo cách này.' },
      { q: 'Câu nào đúng?', options: ['She does speaks four languages.', 'She did spoke four languages.', 'She does speak four languages.', 'She do speak four languages.'], answer: 2, explain: 'Nhấn mạnh bằng does + V nguyên mẫu → She does speak. "does speaks" thừa -s; "did spoke" thừa V2; "She do" sai hòa hợp chủ ngữ.' },
      { q: 'Câu nào đúng?', options: ['What we need more is investment.', 'What we need is more investment.', 'What do we need is more investment.', 'What we need it is more investment.'], answer: 1, explain: 'What + S + V + is + N; không đảo trợ động từ, không thêm it.' },
      { q: 'Câu nào đúng?', options: ['Especially concerning is the loss of farmland.', 'Especially concerning the loss of farmland is.', 'Especially concerning are the loss of farmland.', 'Especially concerning it is the loss of farmland.'], answer: 0, explain: 'Fronting tính từ: Adj + be + chủ ngữ (số ít → is).' },
      { q: 'Câu nào cùng nghĩa? “Tourism creates jobs – that is certainly true.”', options: ['Tourism is creating jobs.', 'Tourism creates do jobs.', 'Tourism does creates jobs.', 'Tourism does create jobs.'], answer: 3, explain: 'Nhấn mạnh sự thật bằng does + V nguyên mẫu → Tourism does create jobs. "is creating" không nhấn mạnh; "creates do" sai trật tự; "does creates" thừa -s.' },
      { q: 'Câu nào cùng nghĩa? “I moved abroad because I wanted new experiences.”', options: ['The reason why I moved abroad is because I wanted new experiences.', 'The reason why I moved abroad was that I wanted new experiences.', 'The reason I moved abroad, I wanted new experiences.', 'Why I moved abroad was because of I wanted new experiences.'], answer: 1, explain: 'The reason why… was that + mệnh đề (không dùng because sau was) → The reason why I moved abroad was that… Câu 1 lặp nghĩa với because; câu 3 thiếu động từ; câu 4 dùng "because of I" sai.' },
      { q: 'Câu nào cùng nghĩa? “Pollution worries me most.”', options: ['What worries me most is pollution.', 'What worries me most it is pollution.', 'What does worry me most is pollution is.', 'It worries me most what pollution.'], answer: 0, explain: 'Câu chẻ What… is + danh từ → What worries me most is pollution. Câu 2 thừa it; câu 3 lặp is; câu 4 sai trật tự.' },
      { q: '___ I find most surprising is how quickly prices have risen.', options: ['What', 'That', 'Which', 'It'], answer: 0, explain: 'Câu chẻ với What: What + S + V + is… (điều mà… là…) → What I find most surprising is… That, Which, It không mở đầu mệnh đề danh từ thiếu tân ngữ làm chủ ngữ.' },
      { q: 'It was in 2015 ___ the company first made a profit.', options: ['when it', 'what', 'that', 'which'], answer: 2, explain: 'Câu chẻ nhấn mạnh thời gian: It was + cụm thời gian + that + mệnh đề → It was in 2015 that…' },
      { q: 'She ___ understand the problem; she just needed more time.', options: ['does', 'was', 'had', 'did'], answer: 3, explain: 'Trợ động từ nhấn mạnh: did + V nguyên mẫu (thật sự đã…), cùng thì quá khứ với needed → did understand.' },
      { q: 'The thing ___ worries me is the cost.', options: ['who', 'it', 'that', 'what'], answer: 2, explain: 'Sau danh từ The thing dùng đại từ quan hệ that (hoặc which); what đã bao gồm nghĩa "the thing that" nên không dùng sau danh từ.' },
      { q: '___ was the noise that nobody could sleep.', options: ['Very', 'Such', 'So', 'Too'], answer: 1, explain: 'Đảo ngữ nhấn mạnh: Such + be + N + that… (… đến mức mà) → Such was the noise that nobody could sleep.' },
      { q: 'Câu nào nhấn mạnh đúng vào "the lack of funding"?', options: ['It is the lack of funding that worries researchers.', 'It is the lack of funding what worries researchers.', 'What worries researchers it is the lack of funding.', 'The lack of funding is it that worries researchers.'], answer: 0, explain: 'Câu chẻ It is + cụm danh từ + that + V → It is the lack of funding that worries researchers. Không dùng what sau It is…' }
    ]
  });
})(typeof self !== 'undefined' ? self : this);
