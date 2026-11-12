/* TOEFL iBT (định dạng từ 21/01/2026) – Bộ luyện tập 3. Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
 * Nạp SAU data1.js và data2.js: chỉ BỔ SUNG vào window.TOEFL (không ghi đè), cùng định dạng với data1/data2.
 *  - Số câu `n` nối tiếp bộ 2 (vd. Daily Life 21–30, Academic 41–60…) để tên ô chọn (radio "q{n}") không trùng.
 *  - Email/Discussion/Repeat/Interview: hiện thành thẻ "Bộ 5", "Bộ 6" (chọn qua ?i=).
 *  - Trắc nghiệm soạn với đáp án đúng ở vị trí 0, cuối file xoay vòng (chỉ các unit tf3-) để A/B/C/D phân bố đều. */
(function (g) {
  const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
  ['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });
  const mcq = (instr, items) => ({ type: 'mcq', instr, items });

  /* ===================================================================
   * READING · Complete the Words
   * =================================================================== */
  TF.reading.push({
    id: 'tf3-cw1', set: 3, task: 'cw', title: 'How Bats Find Their Way in the Dark',
    instr: 'Fill in the missing letters in the paragraph.',
    text: "Most bats hunt at night, when it is too dark to see clearly. Instead of relying {o|n} their eyes, many species use a method {cal|led} echolocation. A bat produces high-pitched calls {th|at} are usually too high for humans {t|o} hear. When a call hits an object, the sound {bou|nces} back as an echo. By listening {care|fully} to these echoes, the bat {ca|n} judge the size, shape, and distance of {i|ts} prey. Some bats can even {det|ect} an insect as thin as a human {ha|ir}.",
    explain: [
      "\"rely on\" = dựa vào; sau \"relying\" luôn đi với giới từ \"on\".",
      "\"a method called echolocation\" = một phương pháp gọi là định vị bằng tiếng vang; \"called\" là phân từ bị động rút gọn (= which is called).",
      "Đại từ quan hệ \"that\" thay cho \"calls\", mở đầu mệnh đề quan hệ \"that are usually too high…\".",
      "Cấu trúc \"too + adj + for sb + to V\" (quá … để ai làm gì): \"too high for humans to hear\".",
      "Chủ ngữ số ít \"the sound\" + động từ thêm -s: \"bounces back\" (dội lại).",
      "Trạng từ \"carefully\" bổ nghĩa cho động từ \"listening\" (lắng nghe một cách chăm chú).",
      "Động từ khuyết thiếu \"can\" + V nguyên mẫu \"judge\" (có thể đánh giá).",
      "Tính từ sở hữu \"its\" (của nó) đứng trước danh từ \"prey\" (con mồi), chỉ con dơi; không viết \"it's\".",
      "\"detect\" = phát hiện; sau \"can even\" cần động từ nguyên mẫu.",
      "\"as thin as a human hair\" = mảnh như sợi tóc người; so sánh ngang bằng \"as + adj + as\".",
    ],
  });
  TF.reading.push({
    id: 'tf3-cw2', set: 3, task: 'cw', title: "Chocolate's Long Journey",
    instr: 'Fill in the missing letters in the paragraph.',
    text: "Long before chocolate became a sweet snack, it was a bitter drink. The ancient peoples of Central America {gr|ound} roasted cacao beans and {mi|xed} them with water and spices. Cacao beans were so valuable {th|at} they were sometimes used {a|s} money. In the sixteenth century, Spanish explorers {bro|ught} cacao to Europe, {wh|ere} people began to add sugar {t|o} the drink. Solid chocolate bars {app|eared} only in the nineteenth century, {wh|en} new machines made {produ|ction} much cheaper.",
    explain: [
      "\"ground\" là quá khứ của \"grind\" (nghiền, xay); cùng thì quá khứ với \"mixed\" trong chuỗi hành động.",
      "\"mixed them with water\" = trộn chúng với nước; động từ quá khứ có quy tắc, nối bằng \"and\".",
      "Cấu trúc \"so + adj + that + mệnh đề\" (quá … đến nỗi): \"so valuable that they were…\".",
      "\"be used as money\" = được dùng làm tiền; \"as\" = với vai trò là.",
      "\"brought\" là quá khứ bất quy tắc của \"bring\" (mang đến).",
      "Trạng từ quan hệ \"where\" thay cho địa điểm \"Europe\" (nơi mà người ta bắt đầu thêm đường).",
      "\"add sugar to the drink\" = thêm đường vào đồ uống; cấu trúc \"add A to B\".",
      "\"appeared\" = xuất hiện; quá khứ đơn vì sự việc xảy ra ở thế kỷ 19.",
      "Trạng từ quan hệ \"when\" thay cho mốc thời gian \"the nineteenth century\".",
      "\"production\" = việc sản xuất; cần danh từ làm tân ngữ trong cấu trúc \"make + O + adj\" (made production much cheaper).",
    ],
  });

  /* ===================================================================
   * READING · Read in Daily Life (câu 21–30, nối tiếp bộ 2)
   * =================================================================== */
  TF.reading.push({
    id: 'tf3-dl1', set: 3, task: 'daily', title: 'Aquatic Center Schedule',
    text: "RIVERSIDE AQUATIC CENTER – WINTER SCHEDULE\n\nStarting January 8, the indoor pool will open at 6 a.m. on weekdays, one hour earlier than before, so that early swimmers have more time before classes. From 6 to 9 a.m., lap lanes are reserved for students and staff with a valid ID card. Family swim moves to Saturday afternoons, 1–4 p.m.\n\nThe diving pool will be closed for the whole month of February while its filtration system is replaced.\n\nFree beginner swimming lessons are offered on Tuesday evenings. Each session is limited to twelve people, so please sign up at the front desk at least two days in advance.",
    groups: [mcq('Read the notice and answer the questions.', [
      { n: 21, q: 'What change is being made to the weekday schedule?', options: ['The pool will open one hour earlier.', 'The pool will close one hour earlier.', 'Family swim will take place on weekday mornings.', 'Lap lanes will be open to the public all day.'], a: 0,
        explain: "\"the indoor pool will open at 6 a.m. on weekdays, one hour earlier than before\" – bể bơi mở cửa sớm hơn một tiếng vào các ngày trong tuần. Family swim chuyển sang chiều thứ Bảy, không phải buổi sáng ngày thường." },
      { n: 22, q: 'Why will the diving pool be closed in February?', options: ['Part of its water-cleaning equipment is being replaced.', 'It will be used for a swimming competition.', 'Too few people used it during the winter.', 'The lifeguards will be on vacation.'], a: 0,
        explain: "Bể nhảy cầu đóng cửa \"while its filtration system is replaced\" – hệ thống lọc nước (thiết bị làm sạch nước) đang được thay. Các lý do khác không được nhắc tới." },
      { n: 23, q: 'What can be inferred about a person who wants to take a beginner lesson next Tuesday?', options: ['The person should register by Sunday at the latest.', 'The person must pay at the front desk.', 'The person must already be a strong swimmer.', 'The person can simply arrive on Tuesday evening.'], a: 0,
        explain: "Câu suy luận: phải đăng ký \"at least two days in advance\" vì mỗi buổi chỉ nhận 12 người → muốn học thứ Ba thì chậm nhất là Chủ nhật phải đăng ký. Lớp học miễn phí (\"Free\") nên không cần trả tiền." },
    ])],
  });
  TF.reading.push({
    id: 'tf3-dl2', set: 3, task: 'daily', title: 'Email about Lab Safety Training',
    text: "From: Dr. Martin Osei, Chemistry Department\nTo: Students in CHEM 110\nSubject: Required safety training before the first lab\n\nDear students,\n\nBefore you can take part in any laboratory session this semester, you must complete the online safety training on the course website. The training takes about forty minutes and ends with a short quiz. You need a score of at least 80 percent to pass, but you may retake the quiz as many times as necessary.\n\nThe first lab is on Monday, September 15. Students who have not passed the quiz by Friday, September 12, will not be allowed into the lab and will have to make up the session later in the term.\n\nIf you completed the same training for another chemistry course within the last two years, you do not need to repeat it. Simply forward your certificate to the lab coordinator, Ms. Bianca Ruiz.\n\nBest regards,\nDr. Osei",
    groups: [mcq('Read the email and answer the questions.', [
      { n: 24, q: 'What is the main purpose of the email?', options: ['To tell students about a training they must finish before the labs begin', 'To announce the results of a chemistry quiz', 'To introduce the new lab coordinator', 'To change the date of the first lab session'], a: 0,
        explain: "Tiêu đề \"Required safety training before the first lab\" và đoạn đầu cho biết sinh viên phải hoàn thành khóa an toàn trực tuyến trước buổi thí nghiệm → mục đích là thông báo khóa huấn luyện bắt buộc. Ngày buổi thí nghiệm đầu không thay đổi." },
      { n: 25, q: 'What will happen to students who have not passed the quiz by September 12?', options: ['They will have to attend the first lab at a later time.', 'They will fail the course.', 'They will have to pay a fee.', 'They will lose 20 percent of their grade.'], a: 0,
        explain: "Những bạn chưa đạt trước 12/9 \"will not be allowed into the lab and will have to make up the session later in the term\" → phải học bù buổi thí nghiệm đó sau. Email không nói trượt môn hay bị trừ điểm." },
      { n: 26, q: 'What is true about the training?', options: ['Some students may be able to skip it.', 'Students can take the quiz only once.', 'It must be completed in the chemistry building.', 'It takes about two hours to finish.'], a: 0,
        explain: "Ai đã học khóa này cho môn hóa khác trong vòng hai năm \"do not need to repeat it\" – chỉ cần gửi chứng chỉ → một số sinh viên được miễn. Bài quiz được làm lại nhiều lần, khóa học trực tuyến và chỉ mất khoảng 40 phút." },
    ])],
  });
  TF.reading.push({
    id: 'tf3-dl3', set: 3, task: 'daily', title: 'Textbook Swap Flyer',
    text: "TEXTBOOK SWAP DAY\nStudent Union, Room 2B · Wednesday, January 10 · 10 a.m.–4 p.m.\n\nDon't pay full price for books you will only use for one semester! Bring your used textbooks in good condition and receive one token for each book. Every token can be exchanged for any other book on our tables.\n\nNo books to trade? Tokens can also be bought for $3 each.\n\nAny books left at the end of the day will be donated to the Eastside Community Library, so please only bring books you are happy to give away.",
    groups: [mcq('Read the flyer and answer the questions.', [
      { n: 27, q: 'How can students get a token?', options: ['By bringing a used textbook in good condition', 'By arriving before 10 a.m.', 'By volunteering at the Student Union', 'By showing a library card'], a: 0,
        explain: "\"Bring your used textbooks in good condition and receive one token for each book\" – mỗi cuốn sách cũ còn tốt đổi được một token. Ngoài ra có thể mua token với giá 3 đô." },
      { n: 28, q: 'What will happen to the books that are not taken?', options: ['They will be given to a community library.', 'They will be returned to their owners.', 'They will be sold for $3 each.', 'They will be kept for the next swap day.'], a: 0,
        explain: "\"Any books left at the end of the day will be donated to the Eastside Community Library\" → sách còn lại được tặng cho thư viện cộng đồng, vì vậy chỉ nên mang sách mình sẵn sàng cho đi." },
    ])],
  });
  TF.reading.push({
    id: 'tf3-dl4', set: 3, task: 'daily', title: 'Messages about a Ride to the Airport',
    text: "Mai (6:15 p.m.): Hi Leo! My flight home is on Friday at 9:40 a.m. Is your offer to drive me to the airport still open?\nLeo (6:18 p.m.): Of course! But there's road work on the highway this month, so traffic gets really bad in the morning. We should leave by 6:30 to be safe.\nMai (6:19 p.m.): That early? I was hoping to leave around 7:30.\nLeo (6:21 p.m.): I know, but last week it took me almost two hours to get there. I can pick up coffee and breakfast for both of us on the way, if you like.\nMai (6:22 p.m.): OK, I'll take you up on that! See you at 6:30.",
    groups: [mcq('Read the messages and answer the questions.', [
      { n: 29, q: 'Why does Leo want to leave at 6:30?', options: ['Construction on the highway may cause long delays.', "Mai's flight has been moved to an earlier time.", 'He has to be at work by 8 a.m.', 'They need time to eat breakfast at the airport.'], a: 0,
        explain: "Leo nói \"there's road work on the highway this month, so traffic gets really bad\" và tuần trước mất gần hai tiếng → cần đi sớm vì công trình trên đường cao tốc gây kẹt xe. Giờ bay của Mai không đổi." },
      { n: 30, q: "What does Mai mean when she writes, \"I'll take you up on that\"?", options: ["She accepts Leo's offer to buy breakfast.", 'She wants Leo to drive faster.', 'She will pay for the gas.', 'She will take a taxi instead.'], a: 0,
        explain: "\"take sb up on (an offer)\" = nhận lời đề nghị của ai. Mai đồng ý với lời đề nghị mua cà phê và bữa sáng trên đường của Leo, đồng thời chấp nhận đi lúc 6:30." },
    ])],
  });

  /* ===================================================================
   * READING · Read an Academic Passage (câu 41–60)
   * =================================================================== */
  TF.reading.push({
    id: 'tf3-ap1', set: 3, task: 'academic', title: 'The Coffeehouses of Early Modern London',
    text: [
      "Coffee reached England in the middle of the seventeenth century, and London's first coffeehouse is generally said to have opened in 1652. The drink was unfamiliar and, to many people, unpleasant: early customers described it as thick, black, and bitter. Nevertheless, coffeehouses spread with remarkable speed. Within a few decades, London had hundreds of them, and they had become one of the most important places for public life in the city.",
      "Part of their appeal was practical. Unlike taverns, coffeehouses served a drink that kept customers alert rather than making them drunk, which made them suitable places to conduct business and hold serious conversations. They were also inexpensive. For the price of a single penny, a customer could enter, buy a cup of coffee, and stay for hours. Newspapers, pamphlets, and letters were left on the tables for anyone to read, so even people who could not afford to buy printed material could keep up with the latest news.",
      "Coffeehouses also followed unusual social customs. In a society that was strongly divided by rank, customers were generally expected to sit wherever there was space and to talk with whoever was beside them, whether a merchant, a shopkeeper, or a gentleman. Contemporary writers often noted with surprise that men of very different backgrounds argued together at the same long tables. Because so much could be learned simply by listening, coffeehouses earned the nickname \"penny universities.\" It should be noted, however, that this openness had limits: the customers were almost all men.",
      "Over time, many coffeehouses became associated with particular groups and activities. Some attracted writers and poets, others scientists, and still others people who traded in goods or shares. One coffeehouse owned by Edward Lloyd became a meeting place for ship owners and merchants who wanted reliable information about ships and their cargoes. The people who met there began to offer insurance for sea voyages, and their informal arrangements eventually developed into one of the world's best-known insurance markets. Similarly, traders who gathered in certain coffeehouses near the Royal Exchange helped lay the foundations of the London stock market.",
      "Not everyone approved of these gatherings. Some critics complained that men wasted their time and money in coffeehouses instead of working. More seriously, the government worried that the free exchange of news and opinions encouraged criticism of the king. In 1675, King Charles II issued a proclamation ordering all coffeehouses to close. The reaction was immediate and widespread. Coffeehouse owners, customers, and even some of the king's own advisers protested, and the order was withdrawn within days, before it had even taken effect.",
      "By the late eighteenth century, the coffeehouse had begun to decline. Many of the groups that had once met there moved into private clubs and offices of their own, and tea gradually replaced coffee as the most popular drink in Britain. Yet historians argue that the coffeehouse left a lasting mark. It helped create a public space in which ordinary people could gather information, debate political questions, and form their own opinions, a space that many scholars regard as an early version of modern public debate.",
    ].join('\n\n'),
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 41, q: 'According to paragraph 1, how did many people first react to coffee?', options: ['They found its taste unpleasant.', 'They believed it was a medicine.', 'They thought it was too expensive.', 'They preferred it to all other drinks.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Đoạn 1: đồ uống này lạ lẫm và \"to many people, unpleasant\" – khách đầu tiên tả nó \"thick, black, and bitter\" → nhiều người thấy vị khó chịu. Đoạn văn không nói coffee bị coi là thuốc hay quá đắt." },
      { n: 42, q: 'According to paragraph 2, why were coffeehouses suitable places for doing business?', options: ['Their main drink kept customers clear-headed.', 'They were open only to merchants.', 'They provided private rooms for meetings.', 'They charged no money for coffee.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Khác với quán rượu, quán cà phê phục vụ đồ uống \"that kept customers alert rather than making them drunk\" → khách luôn tỉnh táo, phù hợp để bàn công việc. Cà phê vẫn phải trả một xu, không miễn phí." },
      { n: 43, q: 'The word "afford" in paragraph 2 is closest in meaning to', options: ['have enough money for', 'understand', 'find time for', 'be allowed to use'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"people who could not afford to buy printed material\" = những người không đủ tiền mua sách báo → \"have enough money for\"." },
      { n: 44, q: 'Why does the author mention the nickname "penny universities" in paragraph 3?', options: ['To emphasize that people could learn a great deal cheaply in coffeehouses', 'To show that coffeehouses were part of real universities', 'To explain that students received discounts in coffeehouses', 'To suggest that coffeehouses charged fees for lessons'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. \"Because so much could be learned simply by listening\" và giá vào chỉ một xu → biệt danh \"đại học một xu\" nhấn mạnh rằng người ta học được rất nhiều với chi phí rất thấp. Quán cà phê không phải trường đại học thật." },
      { n: 45, q: 'According to paragraph 3, all of the following were true of coffeehouse customs EXCEPT', options: ['customers were seated according to their social rank', 'customers were expected to sit wherever there was space', 'men from different backgrounds talked together', 'almost all customers were men'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 3 nói khách ngồi \"wherever there was space\", nói chuyện với bất kỳ ai, và gần như toàn bộ là nam giới. Việc xếp chỗ theo địa vị xã hội là NGƯỢC với đoạn văn → đáp án." },
      { n: 46, q: 'What can be inferred from paragraph 4 about the coffeehouse owned by Edward Lloyd?', options: ['The information shared there was valuable to people involved in sea trade.', 'It was the first coffeehouse to open in London.', 'It was popular mainly with poets and scientists.', 'Its owner was a famous ship captain.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Chủ tàu và thương nhân đến đó để có \"reliable information about ships and their cargoes\", rồi từ đó hình thành thị trường bảo hiểm hàng hải → suy ra thông tin trao đổi ở đây rất giá trị với giới buôn bán đường biển." },
      { n: 47, q: 'The word "informal" in paragraph 4 is closest in meaning to', options: ['not official', 'not profitable', 'not honest', 'not popular'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"their informal arrangements eventually developed into…\" = những thỏa thuận không chính thức (chưa có tổ chức, giấy tờ) dần phát triển thành thị trường bảo hiểm → \"not official\"." },
      { n: 48, q: 'According to paragraph 5, why did the government want to close the coffeehouses?', options: ['It feared that they encouraged criticism of the king.', 'It believed coffee was harmful to health.', 'It wanted to increase taxes on tea.', 'It wanted merchants to trade at the Royal Exchange.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"the government worried that the free exchange of news and opinions encouraged criticism of the king\" → chính quyền lo ngại quán cà phê khuyến khích chỉ trích nhà vua." },
      { n: 49, q: 'What can be inferred from paragraph 5 about the proclamation of 1675?', options: ['Opposition to it was strong enough to make the king change his mind.', 'It was enforced for many years.', 'Most people in London supported it.', 'It closed all coffeehouses outside London.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Phản ứng \"immediate and widespread\", ngay cả cố vấn của vua cũng phản đối, và lệnh bị rút lại \"within days, before it had even taken effect\" → suy ra sự phản đối đủ mạnh để nhà vua đổi ý. Lệnh chưa từng được thi hành." },
      { n: 50, q: 'What is the main purpose of paragraph 6?', options: ['To explain why coffeehouses declined and why they remain historically important', 'To compare the taste of tea and coffee', 'To describe how private clubs were organized', 'To argue that coffeehouses should be revived today'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Đoạn 6 nêu lý do quán cà phê suy tàn (các nhóm chuyển sang câu lạc bộ riêng, trà thay cà phê) rồi khẳng định \"the coffeehouse left a lasting mark\" → vừa giải thích sự suy tàn vừa nêu ý nghĩa lịch sử lâu dài." },
    ])],
  });
  TF.reading.push({
    id: 'tf3-ap2', set: 3, task: 'academic', title: 'How Glaciers Shape the Land',
    text: [
      "A glacier is a large mass of ice that forms on land and moves slowly under its own weight. Glaciers develop in places where more snow falls in winter than melts in summer. Year after year, the snow builds up, and the weight of the upper layers presses the lower layers into dense ice. Once the ice becomes thick enough, usually several dozen meters, it begins to flow downhill like an extremely thick liquid. Most glaciers move only a few centimeters to a few meters per day, but over thousands of years they can completely reshape the landscape.",
      "Glaciers wear away the rock beneath them in two main ways. The first is called plucking. Meltwater seeps into cracks in the bedrock under the glacier and freezes there, attaching pieces of rock to the ice. As the glacier moves forward, it tears these pieces away and carries them along. The second process is abrasion. The rocks that are frozen into the bottom of the glacier act like the teeth of a giant file, scraping and polishing the surface they pass over. Abrasion often leaves long, parallel scratches in the bedrock, which show geologists the direction in which the ice once moved.",
      "These processes produce some of the most recognizable features of mountain landscapes. A river usually cuts a narrow valley with a V-shaped cross section, because it erodes mainly downward. A glacier, by contrast, fills the entire valley and erodes its floor and sides at the same time, gradually turning it into a broad valley with a U shape. Smaller side glaciers do not erode as deeply as the main one, so when the ice melts, their valleys are left high above the main valley floor. Today, waterfalls often pour from these hanging valleys. Where glaciers reached the sea, they carved deep valleys below sea level that later filled with seawater, forming the long, narrow inlets known as fjords.",
      "Everything a glacier picks up must eventually be deposited somewhere. When the ice melts, it drops a mixture of clay, sand, gravel, and boulders, all jumbled together without any sorting by size. This material often piles up in long ridges called moraines along the sides and at the front of the glacier. Glaciers can also carry individual boulders for hundreds of kilometers. These so-called erratics are frequently made of a type of rock completely different from the bedrock on which they now rest.",
      "In the early nineteenth century, such features puzzled scientists. Many believed that the scattered boulders and piles of gravel had been left by an enormous flood. In the 1830s, however, the Swiss-born naturalist Louis Agassiz, who had studied the glaciers of the Alps, argued that the same features found far from any mountains had been produced by ice. He proposed that much of northern Europe and North America had once been covered by vast ice sheets. The idea was strongly resisted at first, but as evidence accumulated from many regions, it gradually became widely accepted.",
      "Understanding glaciers is not only a matter of explaining the past. Today, most of the world's mountain glaciers are shrinking as global temperatures rise. In many regions, including parts of Asia and South America, glaciers act as natural water towers: they store winter snowfall as ice and release it slowly as meltwater during the dry season. As they shrink, rivers may at first carry more water than usual, but in the long term, communities that depend on glacial meltwater for drinking water, farming, and electricity could face serious shortages.",
    ].join('\n\n'),
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 51, q: 'According to paragraph 1, under what conditions does a glacier form?', options: ['When more snow falls in winter than melts in summer', 'When rivers freeze completely during winter', 'When rain falls on high mountains', 'When summer temperatures are higher than usual'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"Glaciers develop in places where more snow falls in winter than melts in summer\" → sông băng hình thành khi lượng tuyết rơi mùa đông nhiều hơn lượng tan vào mùa hè, tuyết tích tụ qua nhiều năm." },
      { n: 52, q: 'The word "dense" in paragraph 1 is closest in meaning to', options: ['tightly packed', 'very cold', 'easily broken', 'clear'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. Sức nặng của các lớp trên ép các lớp dưới thành \"dense ice\" = băng đặc, nén chặt → \"tightly packed\"." },
      { n: 53, q: 'According to paragraph 2, what happens during plucking?', options: ['Pieces of rock frozen to the ice are pulled away as the glacier moves.', 'Rocks in the ice polish the surface of the bedrock.', 'Meltwater washes sand and gravel out of the glacier.', 'The glacier melts the bedrock beneath it.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Nước tan chảy thấm vào khe đá rồi đông lại, gắn mảnh đá vào băng; khi sông băng di chuyển, \"it tears these pieces away\" → mảnh đá bị kéo bật đi. Việc đá trong băng mài nhẵn bề mặt là quá trình abrasion." },
      { n: 54, q: 'Why does the author mention "the teeth of a giant file" in paragraph 2?', options: ['To help explain how rocks in the ice scrape the surface below', 'To describe the shape of the glacier\'s front edge', 'To show that glaciers contain metal', 'To compare the speed of glaciers with that of rivers'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. So sánh đá đóng băng ở đáy sông băng với \"răng của một cái giũa khổng lồ\" để minh họa cách chúng \"scraping and polishing\" – cào và mài nhẵn mặt đá bên dưới (quá trình abrasion)." },
      { n: 55, q: 'According to paragraph 3, why does a glacial valley have a U shape?', options: ['The glacier erodes the floor and sides of the valley at the same time.', 'The glacier cuts mainly downward into the rock.', 'Rivers flow along the sides of the glacier.', 'Waterfalls wear away the walls of the valley.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Sông thì xói chủ yếu theo chiều sâu (thung lũng chữ V), còn sông băng \"fills the entire valley and erodes its floor and sides at the same time\" → tạo thung lũng rộng hình chữ U." },
      { n: 56, q: 'What can be inferred from paragraph 3 about hanging valleys?', options: ['They were formed by glaciers that carried less ice than the main glacier.', 'They are found only near the sea.', 'They were cut by waterfalls before the ice age.', 'They are deeper than the main valley.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Sông băng nhánh nhỏ hơn \"do not erode as deeply as the main one\", nên thung lũng của chúng nằm cao phía trên → suy ra thung lũng treo do các sông băng nhỏ hơn (ít băng hơn) tạo ra. Chúng nằm CAO hơn, không sâu hơn thung lũng chính." },
      { n: 57, q: 'According to paragraph 4, all of the following are true of material deposited by glaciers EXCEPT', options: ['it is carefully sorted into layers by size', 'it can include clay, sand, gravel, and boulders', 'it often forms ridges called moraines', 'it may include boulders carried a very long distance'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Vật liệu do băng để lại \"all jumbled together without any sorting by size\" – trộn lẫn, KHÔNG phân loại theo kích thước. Ba ý còn lại đều có trong đoạn 4 (đất sét, cát, sỏi, đá tảng; moraine; đá lạc – erratics)." },
      { n: 58, q: 'The word "accumulated" in paragraph 5 is closest in meaning to', options: ['gradually increased', 'quickly disappeared', 'was hidden', 'was questioned'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"as evidence accumulated from many regions\" = khi bằng chứng từ nhiều vùng ngày càng tích lũy thêm → \"gradually increased\"." },
      { n: 59, q: 'What can be inferred from paragraph 5 about the scientists who believed in a great flood?', options: ['They did not recognize that ice could move large boulders over long distances.', 'They had studied the glaciers of the Alps in detail.', 'They agreed with Agassiz immediately.', 'They had never seen boulders or gravel.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Họ cho rằng đá tảng rải rác và đống sỏi do một trận lụt khổng lồ để lại, trong khi Agassiz chứng minh đó là do băng → suy ra họ chưa nhận ra băng có thể mang đá tảng đi rất xa. Ý tưởng của Agassiz \"was strongly resisted at first\"." },
      { n: 60, q: 'According to paragraph 6, why might shrinking glaciers cause water shortages in the future?', options: ['Communities rely on slowly released meltwater during dry seasons.', 'Glaciers will stop producing snow in winter.', 'Rivers fed by glaciers will freeze more often.', 'Meltwater will become too salty to drink.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Sông băng là \"natural water towers\": trữ tuyết mùa đông thành băng và nhả nước tan dần trong mùa khô. Khi chúng thu nhỏ, các cộng đồng dựa vào nước băng tan để uống, trồng trọt và làm điện có thể bị thiếu nước nghiêm trọng." },
    ])],
  });

  /* ===================================================================
   * LISTENING · Listen and Choose a Response (câu 17–24)
   * =================================================================== */
  const RESP = [
    { s: 'A', t: "Where can I pick up my new student ID card?",
      options: ["At the main office in the Student Center.", "I picked it up from the floor.", "It has my photo and student number.", "Yes, it's a new card."],
      explain: "Câu hỏi \"Where\" (ở đâu) → cần địa điểm: \"Ở văn phòng chính trong Trung tâm Sinh viên\". \"picked it up from the floor\" là bẫy nghĩa khác của \"pick up\"; câu hỏi Wh- không trả lời bằng \"Yes\"." },
    { s: 'B', t: "I didn't understand anything in today's physics lecture.",
      options: ["Me neither – maybe we could go to office hours together.", "The lecture hall was on the third floor.", "Physical exercise is good for you.", "I understood the directions to the station."],
      explain: "Người nói than phiền không hiểu bài giảng → phản hồi đồng cảm và đề xuất giải pháp: \"Mình cũng vậy – hay mình cùng đến giờ tiếp sinh viên của thầy nhé\". \"Physical\" là bẫy âm gần giống \"physics\"." },
    { s: 'A', t: "When does the next bus to the city center leave?",
      options: ["In about fifteen minutes.", "It leaves from platform two.", "The city center is very crowded.", "I left my bag on the bus."],
      explain: "Câu hỏi \"When\" (khi nào) → cần thời gian: \"Khoảng mười lăm phút nữa\". \"platform two\" trả lời cho \"Where\"; các phương án còn lại chỉ lặp từ \"leave\", \"city center\"." },
    { s: 'B', t: "Would you mind opening the window? It's really warm in here.",
      options: ["Not at all – I was feeling hot too.", "Yes, the window faces the garden.", "The weather will be warm tomorrow.", "I mind my little brother on weekends."],
      explain: "\"Would you mind + V-ing?\" là lời NHỜ lịch sự; đồng ý thì trả lời \"Not at all\" (không phiền gì). \"I mind my little brother\" là bẫy nghĩa khác của \"mind\" (trông nom)." },
    { s: 'A', t: "Why weren't you at the club meeting last night?",
      options: ["I had to finish a lab report.", "The meeting is held every Thursday.", "I met them last night at the café.", "It was a great club."],
      explain: "Câu hỏi \"Why\" (tại sao) → cần lý do: \"Mình phải hoàn thành báo cáo thí nghiệm\". Các phương án khác lặp \"meeting\", \"last night\", \"club\" nhưng không nêu lý do vắng mặt." },
    { s: 'B', t: "The printer in the library is out of paper again.",
      options: ["I'll let the front desk know.", "I printed my essay yesterday.", "The library closes at ten.", "Paper is made from wood."],
      explain: "Người nói báo một sự cố → phản hồi hợp lý là đề nghị xử lý: \"Để mình báo quầy lễ tân\". Các câu còn lại chỉ lặp từ khóa \"printer\", \"library\", \"paper\"." },
    { s: 'A', t: "Are you taking the history seminar or the art history one?",
      options: ["The art history one – it fits my schedule better.", "Yes, I'm taking it.", "History was my favorite subject in high school.", "The seminar room is very small."],
      explain: "Câu hỏi lựa chọn (A hay B) → không trả lời \"Yes/No\" mà chọn một phương án kèm lý do: chọn môn lịch sử nghệ thuật vì hợp lịch học hơn." },
    { s: 'B', t: "You've already finished the reading for next week, haven't you?",
      options: ["Almost – I just have one chapter left.", "Next week is spring break.", "I read the newspaper every morning.", "I've already eaten, thanks."],
      explain: "Câu hỏi đuôi để xác nhận (\"Bạn đọc xong rồi, phải không?\") → \"Gần xong – mình chỉ còn một chương\" trả lời đúng trọng tâm. Các phương án khác lặp \"next week\", \"read\", \"already\" để gây nhiễu." },
  ];
  const respScript = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
  RESP.forEach((r, i) => { respScript.push({ say: 'Number ' + (i + 17) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
  TF.listening.push({
    id: 'tf3-lr', set: 3, task: 'response', title: 'Choose a Response · Set 3',
    speakers: { A: { name: 'Speaker 1', accent: 'en-US', gender: 'f' }, B: { name: 'Speaker 2', accent: 'en-GB', gender: 'm' } },
    script: respScript,
    groups: [mcq('Listen to each sentence and choose the best response.', RESP.map((r, i) => ({ n: i + 17, q: 'Choose the best response to sentence ' + (i + 17) + '.', options: r.options, a: 0, cue: r.t, explain: r.explain })))],
  });

  /* ===================================================================
   * LISTENING · Listen to a Conversation (câu 17–24)
   * =================================================================== */
  TF.listening.push({
    id: 'tf3-lc1', set: 3, task: 'conversation', title: 'Borrowing Equipment from the Media Lab',
    speakers: { S: { name: 'Student (Marcus)', accent: 'en-US', gender: 'm' }, L: { name: 'Media lab assistant', accent: 'en-GB', gender: 'f' } },
    script: [
      { say: 'Listen to a conversation between a student and an assistant at the media lab.' }, { pause: 1 },
      { s: 'S', t: "Hi. I'm making a short documentary for my film class, and I'd like to borrow a video camera and a microphone this weekend." },
      { s: 'L', t: "Sure. Have you used our equipment before?" },
      { s: 'S', t: "No, this is my first time." },
      { s: 'L', t: "Then you'll need to watch a twenty-minute online tutorial first. It shows you how to handle the cameras safely. Once you've finished, the system gives you a code, and you show it to us when you pick up the equipment." },
      { s: 'S', t: "OK, that's easy. Can I keep the camera from Friday until Monday?" },
      { s: 'L', t: "Normally the limit is two days. But for weekend loans, you can pick it up on Friday afternoon and bring it back by ten on Monday morning. Just be aware that there's a fine of ten dollars for every hour it's late, because other students book it for Monday classes." },
      { s: 'S', t: "Got it. I'll be on time. Oh, and I'm planning to film outdoors, at the harbor. Is that a problem?" },
      { s: 'L', t: "Not at all, but take one of our rain covers. The weather forecast isn't great, and water is the main reason cameras come back damaged." },
      { s: 'S', t: "Good idea. Thanks a lot." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 17, q: 'Why does the student go to the media lab?', options: ['To borrow equipment for a film project', 'To return a damaged camera', 'To sign up for a film class', 'To ask for help editing a documentary'], a: 0, cue: 'borrow a video camera',
        explain: "Marcus nói ngay câu đầu: \"I'd like to borrow a video camera and a microphone this weekend\" để làm phim tài liệu ngắn cho lớp điện ảnh → mượn thiết bị cho dự án phim." },
      { n: 18, q: 'What must the student do before he can borrow the equipment?', options: ['Complete an online tutorial', 'Pay a deposit of ten dollars', 'Get permission from his professor', 'Book the camera a week in advance'], a: 0, cue: 'twenty-minute online tutorial',
        explain: "Người mượn lần đầu phải \"watch a twenty-minute online tutorial first\", rồi đưa mã xác nhận khi nhận thiết bị. Mười đô là tiền phạt mỗi giờ trả muộn, không phải tiền cọc." },
      { n: 19, q: 'Why does the assistant mention Monday classes?', options: ['To explain why late returns are fined', 'To suggest that the student film on Monday', 'To say that the lab is closed on Monday', 'To recommend a class about cameras'], a: 0, cue: 'fine of ten dollars',
        explain: "Phạt 10 đô mỗi giờ trả muộn \"because other students book it for Monday classes\" → nhắc đến lớp sáng thứ Hai để giải thích vì sao trả muộn bị phạt." },
      { n: 20, q: 'What does the assistant recommend?', options: ['Taking a cover to protect the camera from rain', 'Filming indoors instead of at the harbor', 'Borrowing a second microphone', 'Checking the weather before booking'], a: 0, cue: 'rain covers',
        explain: "\"take one of our rain covers\" – mang theo áo che mưa cho máy quay vì dự báo thời tiết xấu và nước là nguyên nhân chính làm hỏng máy. Cô không khuyên đổi sang quay trong nhà." },
    ])],
  });
  TF.listening.push({
    id: 'tf3-lc2', set: 3, task: 'conversation', title: 'Meeting a Teaching Assistant about a Field Journal',
    speakers: { S: { name: 'Student (Hana)', accent: 'en-GB', gender: 'f' }, T: { name: 'Teaching assistant', accent: 'en-US', gender: 'm' } },
    script: [
      { say: 'Listen to a conversation between a student and a teaching assistant for a biology course.' }, { pause: 1 },
      { s: 'S', t: "Hi, thanks for meeting me. I wanted to ask about the field journal assignment. I'm not sure I'm doing it right." },
      { s: 'T', t: "Of course. What have you done so far?" },
      { s: 'S', t: "Well, I've been visiting the park by the river every few days and writing down the birds I see. But my entries are mostly just lists of names." },
      { s: 'T', t: "I see. Lists are a good start, but the main point of the journal is careful observation. For each visit, we want the date, the time, the weather, and then detailed notes on what the animals are actually doing – feeding, calling, building nests, that kind of thing." },
      { s: 'S', t: "Oh, so behavior is more important than the number of species?" },
      { s: 'T', t: "Exactly. Honestly, a journal that follows two or three species closely usually gets a higher grade than one with fifty names and no details. And try adding a few quick sketches. They don't have to be beautiful – they just help you notice things." },
      { s: 'S', t: "I'm terrible at drawing, but I'll try. Also, is it OK if I visit at different times of day?" },
      { s: 'T', t: "That's actually a great idea. Many birds are most active early in the morning, so you'll probably notice behavior that you've been missing in the afternoons." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 21, q: 'Why does the student meet the teaching assistant?', options: ['She is unsure whether she is completing an assignment correctly.', 'She wants to change the topic of her research paper.', 'She missed a field trip to the river.', 'She wants to borrow a guidebook about birds.'], a: 0, cue: "not sure I'm doing it right",
        explain: "Hana nói: \"I wanted to ask about the field journal assignment. I'm not sure I'm doing it right\" → cô không chắc mình làm bài nhật ký thực địa đúng yêu cầu." },
      { n: 22, q: 'What is the problem with the student\'s journal entries?', options: ['They are mostly lists without detailed observations.', 'They do not include enough species.', 'They were written too late.', 'They describe the wrong park.'], a: 0, cue: 'mostly just lists of names',
        explain: "Hana tự nhận \"my entries are mostly just lists of names\"; trợ giảng giải thích mục đích chính là quan sát chi tiết hành vi → vấn đề là chỉ liệt kê tên, thiếu ghi chép quan sát." },
      { n: 23, q: "What is the teaching assistant's opinion about the number of species in a journal?", options: ['Observing a few species closely is better than listing many.', 'Students should record at least fifty species.', 'The number of species is the most important factor.', 'Students should focus only on rare species.'], a: 0, cue: 'two or three species closely',
        explain: "Câu hỏi thái độ: nhật ký theo dõi kỹ hai, ba loài \"usually gets a higher grade than one with fifty names and no details\" → anh cho rằng quan sát kỹ vài loài tốt hơn liệt kê thật nhiều loài." },
      { n: 24, q: 'Why does the teaching assistant mention the early morning?', options: ['Birds are often more active then.', 'The park is less crowded then.', 'The light is better for drawing then.', 'The assignment must be done before class.'], a: 0, cue: 'most active early in the morning',
        explain: "\"Many birds are most active early in the morning\" → đi vào sáng sớm, Hana có thể quan sát được những hành vi mà buổi chiều cô bỏ lỡ." },
    ])],
  });

  /* ===================================================================
   * LISTENING · Listen to an Announcement (câu 13–18)
   * =================================================================== */
  TF.listening.push({
    id: 'tf3-la1', set: 3, task: 'announcement', title: 'Changes to the Campus Shuttle',
    speakers: { A: { name: 'Announcer', accent: 'en-GB', gender: 'f' } },
    script: [
      { say: 'Listen to an announcement on the campus radio station.' }, { pause: 1 },
      { s: 'A', t: "Good morning. Here is some important news for everyone who uses the campus shuttle. Starting next Monday, the shuttle will no longer stop on Maple Avenue. The city is rebuilding the bridge there, and the road will be closed for about three months." },
      { s: 'A', t: "During this time, the shuttle will stop in front of the Science Library instead. The new route adds a few minutes to the trip, so please allow extra time to get to your morning classes." },
      { s: 'A', t: "There's also some good news. Because so many students have asked for it, buses will now run every ten minutes during the busiest hours, from eight to ten in the morning, instead of every fifteen." },
      { s: 'A', t: "You can track every bus in real time with the free campus transport app. Thank you, and have a safe trip." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 13, q: 'Why will the shuttle stop using Maple Avenue?', options: ['A bridge on that road is being rebuilt.', 'Too few students use that stop.', 'The road is too narrow for buses.', 'The Science Library has moved there.'], a: 0, cue: 'rebuilding the bridge',
        explain: "\"The city is rebuilding the bridge there, and the road will be closed for about three months\" → tuyến xe bỏ điểm dừng Maple Avenue vì cây cầu đang được xây lại." },
      { n: 14, q: 'What does the announcer advise students to do?', options: ['Leave a little earlier for morning classes', 'Buy a new shuttle pass', 'Walk to the Science Library', 'Avoid the shuttle between eight and ten'], a: 0, cue: 'allow extra time',
        explain: "Tuyến mới dài hơn vài phút nên \"please allow extra time to get to your morning classes\" → nên đi sớm hơn một chút để kịp giờ học buổi sáng." },
      { n: 15, q: 'What change has been made in response to student requests?', options: ['Buses will run more often at busy times.', 'A new stop has been added at the library.', 'The shuttle will run later at night.', 'A transport app has been created.'], a: 0, cue: 'every ten minutes',
        explain: "\"Because so many students have asked for it\", xe sẽ chạy 10 phút một chuyến thay vì 15 phút vào giờ cao điểm 8–10 giờ sáng → tăng tần suất. Điểm dừng ở thư viện là do sửa cầu, không phải theo yêu cầu sinh viên." },
    ])],
  });
  TF.listening.push({
    id: 'tf3-la2', set: 3, task: 'announcement', title: 'Before the First Chemistry Lab',
    speakers: { A: { name: 'Lab instructor', accent: 'en-US', gender: 'm' } },
    script: [
      { say: 'Listen to a lab instructor talking to a chemistry class.' }, { pause: 1 },
      { s: 'A', t: "Before we start our first lab next week, I need to go over a few rules. First, safety glasses must be worn at all times inside the lab, even when you're just writing notes. If you wear regular glasses, we have special covers that fit over them." },
      { s: 'A', t: "Second, no food or drink of any kind is allowed in the lab – not even a bottle of water. You can leave them on the shelves in the hallway." },
      { s: 'A', t: "You'll work in pairs, and you'll keep the same partner for the whole semester, so choose carefully. Please send me your partner's name by Friday." },
      { s: 'A', t: "Finally, each pair will write one lab report together, but the short quiz at the start of every session is individual." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 16, q: 'What does the instructor say about students who wear regular glasses?', options: ['They can use covers that fit over their glasses.', 'They do not need to wear safety glasses.', 'They must buy special safety glasses.', 'They should wear contact lenses in the lab.'], a: 0, cue: 'special covers',
        explain: "\"If you wear regular glasses, we have special covers that fit over them\" – phòng thí nghiệm có tấm che đặc biệt đeo chồng lên kính thường. Quy định kính bảo hộ áp dụng cho TẤT CẢ mọi người." },
      { n: 17, q: 'What must students do by Friday?', options: ["Tell the instructor their partner's name", 'Submit their first lab report', 'Buy safety glasses', 'Take a short quiz'], a: 0, cue: "partner's name by Friday",
        explain: "\"Please send me your partner's name by Friday\" – gửi tên bạn cùng nhóm trước thứ Sáu, vì sẽ làm cùng một người cả học kỳ." },
      { n: 18, q: 'What does the instructor say about the quizzes?', options: ['Each student takes them alone.', 'Partners take them together.', 'They are given at the end of each lab.', 'They replace the lab reports.'], a: 0, cue: 'quiz at the start of every session is individual',
        explain: "Báo cáo thí nghiệm viết theo cặp, nhưng \"the short quiz at the start of every session is individual\" → bài kiểm tra ngắn đầu mỗi buổi làm riêng từng người." },
    ])],
  });

  /* ===================================================================
   * LISTENING · Listen to an Academic Talk (câu 21–30)
   * =================================================================== */
  TF.listening.push({
    id: 'tf3-lt1', set: 3, task: 'talk', title: 'Biology: How Octopuses Change Color',
    speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to part of a talk in a marine biology class.' }, { pause: 1 },
      { s: 'P', t: "Today I want to talk about one of the most impressive abilities in the animal world: the octopus's ability to change its color. An octopus can go from pale white to dark red, or match the pattern of a rock, in less than a second." },
      { s: 'P', t: "So how does it do this? The key is the octopus's skin, which contains thousands of tiny cells called chromatophores. Each one is like a small elastic bag filled with pigment – yellow, red, or brown. Muscles around the bag are connected directly to the nervous system. When the muscles pull, the bag stretches out and the color spreads. When they relax, the bag shrinks to a tiny dot that you can barely see. Because it's controlled by nerves, the change is extremely fast." },
      { s: 'P', t: "There are other layers of cells under the chromatophores. Some of them reflect light, which produces shiny blues and greens, and others simply reflect white light. By combining all these layers, the octopus can create a huge range of colors and patterns." },
      { s: 'P', t: "And it's not only color. Octopuses can also change the texture of their skin. They raise small bumps called papillae, so their skin looks rough, like coral or seaweed. A smooth octopus can suddenly look exactly like a rock covered in algae." },
      { s: 'P', t: "Now here's the puzzle. As far as we can tell, most octopuses are colorblind. Their eyes have only one type of light receptor, so they probably can't tell red from green. So how do they match colors so well? We don't have a complete answer yet. But researchers have found light-sensitive proteins in octopus skin – the same kind found in eyes. So one possibility is that the skin itself can sense light, at least to some degree. That's still being tested, though, so treat it as a hypothesis, not a fact." },
    ],
    groups: [mcq('Answer the questions about the talk.', [
      { n: 21, q: 'What is the talk mainly about?', options: ['How octopuses change the appearance of their skin', 'How octopuses catch their prey', 'Why octopuses live near coral reefs', 'How the octopus nervous system developed'], a: 0, cue: 'change its color',
        explain: "Câu hỏi ý chính: bài giảng giải thích cơ chế bạch tuộc đổi màu (tế bào sắc tố, các lớp phản quang) và đổi kết cấu da (papillae) → cách bạch tuộc thay đổi vẻ ngoài của da." },
      { n: 22, q: 'Why can an octopus change color so quickly?', options: ['Its color cells are controlled directly by nerves.', 'Its pigment is produced very quickly.', 'It changes the temperature of its skin.', 'It takes in pigment from its food.'], a: 0, cue: 'controlled by nerves',
        explain: "Cơ quanh túi sắc tố \"are connected directly to the nervous system\" và \"Because it's controlled by nerves, the change is extremely fast\" → đổi màu nhanh vì do dây thần kinh điều khiển trực tiếp." },
      { n: 23, q: 'What happens when the muscles around a chromatophore relax?', options: ['The bag of pigment shrinks and becomes hard to see.', 'The color spreads across the skin.', 'The skin turns rough.', 'The cell reflects blue light.'], a: 0, cue: 'shrinks to a tiny dot',
        explain: "Khi cơ co kéo, túi giãn ra và màu lan rộng; khi cơ thả lỏng \"the bag shrinks to a tiny dot that you can barely see\" → túi sắc tố co lại thành chấm nhỏ khó thấy." },
      { n: 24, q: 'Why does the professor mention a rock covered in algae?', options: ['To illustrate how changing skin texture helps octopuses blend in', 'To describe where octopuses usually lay their eggs', 'To explain what octopuses eat', 'To show that octopuses prefer shallow water'], a: 0, cue: 'covered in algae',
        explain: "Ví dụ minh họa cho việc đổi kết cấu da: nhờ nổi các nốt papillae, bạch tuộc trơn nhẵn \"can suddenly look exactly like a rock covered in algae\" → giúp nó ngụy trang hòa vào môi trường." },
      { n: 25, q: "What is the professor's attitude toward the idea that octopus skin can sense light?", options: ['He thinks it is possible but has not been proven.', 'He thinks it has been clearly proven.', 'He thinks it is very unlikely.', 'He thinks it explains why octopuses are colorblind.'], a: 0, cue: 'treat it as a hypothesis',
        explain: "Câu hỏi thái độ: giáo sư gọi đó là \"one possibility\", nói \"That's still being tested\" và dặn \"treat it as a hypothesis, not a fact\" → ông cho rằng có khả năng nhưng chưa được chứng minh." },
    ])],
  });
  TF.listening.push({
    id: 'tf3-lt2', set: 3, task: 'talk', title: 'Linguistics: From Pidgin to Creole',
    speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to part of a talk in a linguistics class.' }, { pause: 1 },
      { s: 'P', t: "Imagine a group of people who need to work or trade together, but who don't share a common language. What happens? Very often, they develop what linguists call a pidgin." },
      { s: 'P', t: "A pidgin is a simplified language that grows out of contact between groups. Most of its words usually come from one dominant language, often the language of traders or landowners, but the grammar is greatly reduced. There may be no verb endings, no plural forms, and a fairly small vocabulary. And here's the important point: nobody speaks a pidgin as their first language. It's a tool people use for specific purposes, like buying and selling." },
      { s: 'P', t: "Now, something remarkable can happen when children grow up hearing a pidgin. If it's the main language used around them, they acquire it as their native language. And when that happens, the language changes quickly. Within a generation or two, it develops a richer vocabulary and more complex grammar, such as consistent ways to mark past and future time. At that point, linguists call it a creole." },
      { s: 'P', t: "A well-known example is Tok Pisin, which is spoken in Papua New Guinea. It started as a pidgin used on plantations and in trade, with most of its words taken from English. Today it has millions of speakers, many of whom learned it as children, and it's one of the country's official languages. It's used in newspapers, on the radio, and even in parliament. So a language that began as a simple tool for trade became a full language in its own right." },
      { s: 'P', t: "Why do linguists find this so interesting? Because it suggests that children don't simply copy the language they hear. When the input is incomplete, they seem to fill in the gaps and create regular grammatical rules. Some researchers see this as evidence of a strong human ability for language. Others argue that adults also play a big role in the process. That debate is still going on, and we'll come back to it next week." },
    ],
    groups: [mcq('Answer the questions about the talk.', [
      { n: 26, q: 'What is the main topic of the talk?', options: ['How simplified contact languages can develop into full languages', 'How children learn a second language at school', 'Why English is used in international trade', 'How languages disappear over time'], a: 0, cue: 'pidgin',
        explain: "Câu hỏi ý chính: giáo sư giải thích pidgin (ngôn ngữ giản lược hình thành khi các nhóm tiếp xúc) và cách nó trở thành creole – một ngôn ngữ hoàn chỉnh." },
      { n: 27, q: 'According to the professor, what is true of a pidgin?', options: ['No one speaks it as a first language.', 'It has a very complex grammar.', 'Its words come equally from many languages.', 'It is used mainly in schools.'], a: 0, cue: 'nobody speaks a pidgin as their first language',
        explain: "Giáo sư nhấn mạnh \"nobody speaks a pidgin as their first language\" – đó là công cụ dùng cho mục đích cụ thể như mua bán. Ngữ pháp của pidgin bị rút gọn nhiều, và phần lớn từ vựng đến từ một ngôn ngữ chiếm ưu thế." },
      { n: 28, q: 'According to the professor, what causes a pidgin to become a creole?', options: ['Children acquire it as their native language.', 'A government makes it an official language.', 'Traders add words from other languages.', 'Linguists write a grammar book for it.'], a: 0, cue: 'acquire it as their native language',
        explain: "Khi trẻ lớn lên nghe pidgin là ngôn ngữ chính, \"they acquire it as their native language\" và ngôn ngữ nhanh chóng phát triển từ vựng, ngữ pháp phong phú hơn → trở thành creole. Việc thành ngôn ngữ chính thức chỉ là ví dụ về Tok Pisin sau này." },
      { n: 29, q: 'Why does the professor mention that Tok Pisin is used in parliament?', options: ['To show that a former pidgin can become a fully developed language', 'To explain why English is no longer spoken there', 'To suggest that pidgins are used mainly by politicians', 'To show that Tok Pisin has very few speakers'], a: 0, cue: 'even in parliament',
        explain: "Tok Pisin được dùng trên báo, đài và cả trong quốc hội → minh chứng rằng một ngôn ngữ khởi đầu là công cụ buôn bán đơn giản đã trở thành \"a full language in its own right\"." },
      { n: 30, q: 'What does the professor imply about the role of children in creating creoles?', options: ['They add regular grammatical rules that were missing from what they heard.', 'They usually refuse to learn their parents\' pidgin.', 'They copy exactly the language spoken by adults.', 'They play no role in the process.'], a: 0, cue: 'fill in the gaps',
        explain: "Giáo sư nói trẻ em \"don't simply copy the language they hear\" mà \"fill in the gaps and create regular grammatical rules\" → hàm ý trẻ tự bổ sung quy tắc ngữ pháp còn thiếu. Bà cũng lưu ý vai trò của người lớn vẫn đang được tranh luận." },
    ])],
  });

  /* ===================================================================
   * WRITING · Build a Sentence (câu 21–30)
   * chunks: các cụm từ theo ĐÚNG thứ tự; giao diện tự xáo trộn.
   * =================================================================== */
  TF.writing.push({
    id: 'tf3-bs', set: 3, task: 'sentence', title: 'Build a Sentence · Set 3',
    instr: 'Put the words in the correct order to make a grammatical response.',
    items: [
      { n: 21, prompt: 'Where did you study for the exam?', chunks: ['I', 'studied', 'in the library', 'with', 'two friends', 'from my class'], end: '.', alt: ['in the library I studied with two friends from my class', 'with two friends from my class I studied in the library'],
        explain: "Trật tự câu cơ bản S + V + nơi chốn + đi cùng ai: \"I studied in the library with two friends\"; cụm \"from my class\" bổ nghĩa cho \"two friends\" nên đứng ngay sau." },
      { n: 22, prompt: 'How was your weekend?', chunks: ['it was', 'so', 'relaxing', 'that', 'I forgot', 'about my homework'], end: '.',
        explain: "Cấu trúc \"so + adj + that + mệnh đề\" (quá … đến nỗi): \"so relaxing that I forgot about my homework\"; \"forget about\" = quên mất." },
      { n: 23, prompt: 'Is there anything else I can help you with?', chunks: ['could you', 'tell me', 'where', 'the nearest', 'post office', 'is'], end: '?', starter: 'Yes.',
        explain: "Câu hỏi lồng lịch sự: \"Could you tell me + where + S + V\". Trong mệnh đề lồng KHÔNG đảo ngữ: \"where the nearest post office is\" (không phải \"where is the…\")." },
      { n: 24, prompt: 'Why did you change your major?', chunks: ['I realized', 'that', 'I was', 'more interested', 'in biology', 'than in chemistry'], end: '.',
        explain: "\"realize that + mệnh đề\" (nhận ra rằng); so sánh hơn \"more interested in A than in B\" – giới từ \"in\" lặp lại ở cả hai vế." },
      { n: 25, prompt: 'Can I borrow your notes from Monday?', chunks: ['sure', 'as long as', 'you', 'give them back', 'before', 'the quiz'], end: '.',
        explain: "Đồng ý kèm điều kiện: \"Sure, as long as + mệnh đề\" (miễn là); \"give them back\" – đại từ \"them\" đứng giữa động từ và tiểu từ \"back\"." },
      { n: 26, prompt: 'Did the professor accept your topic?', chunks: ['she', 'told me', 'to', 'narrow it down', 'a little', 'more'], end: '.', starter: 'Yes, she did.',
        explain: "Cấu trúc \"tell + O + to V\" (bảo ai làm gì): \"told me to narrow it down\"; \"narrow down\" = thu hẹp; \"a little more\" (thêm một chút) đứng cuối." },
      { n: 27, prompt: 'What are you doing this summer?', chunks: ['I', 'am going to', 'work', 'at a museum', 'that', 'my aunt', 'manages'], end: '.',
        explain: "\"be going to + V\" diễn tả dự định; mệnh đề quan hệ \"that my aunt manages\" bổ nghĩa cho \"a museum\" (bảo tàng mà dì tôi quản lý)." },
      { n: 28, prompt: 'Why was the concert postponed?', chunks: ['it', 'was postponed', 'because', 'the lead singer', 'had', 'lost', 'her voice'], end: '.', alt: ['because the lead singer had lost her voice it was postponed'],
        explain: "Bị động quá khứ \"was postponed\" (bị hoãn); \"because + mệnh đề\" nêu lý do; quá khứ hoàn thành \"had lost\" chỉ việc xảy ra trước khi buổi hòa nhạc bị hoãn." },
      { n: 29, prompt: 'What is the hardest part of the course?', chunks: ['writing', 'the final', 'research paper', 'is', 'the most', 'difficult part'], end: '.', alt: ['the most difficult part is writing the final research paper'],
        explain: "Danh động từ làm chủ ngữ: \"Writing the final research paper\" + \"is\" + so sánh nhất \"the most difficult part\". Có thể đảo hai vế quanh \"is\"." },
      { n: 30, prompt: 'Is the gym crowded in the evening?', chunks: ['it', 'tends', 'to be', 'less crowded', 'after', 'eight o\'clock'], end: '.', alt: ['after eight o\'clock it tends to be less crowded'],
        explain: "\"tend + to V\" (thường có xu hướng); so sánh kém \"less crowded\" (ít đông hơn); cụm thời gian \"after eight o'clock\" đứng cuối câu." },
    ],
  });

  /* ===================================================================
   * WRITING · Write an Email
   * =================================================================== */
  TF.writing.push({
    id: 'tf3-em1', set: 3, task: 'email', title: 'Asking for a Deadline Extension', minutes: 7,
    scenario: 'Your sociology essay is due this Friday. However, you have been sick with a high fever for most of this week and have not been able to finish it.',
    to: 'Professor Hayes, your sociology instructor',
    points: ['Explain your situation.', 'Describe how much of the essay you have completed.', 'Ask for a new deadline and suggest a date.'],
    model: "Dear Professor Hayes,\n\nI am writing to ask whether I could have a short extension on the essay for Sociology 201, which is due this Friday.\n\nSince last Sunday, I have been sick with a high fever. I visited the campus health center on Monday, and the doctor told me to rest for several days. I have attached the doctor's note to this email.\n\nBefore I became ill, I had already completed my research and written about half of the essay, including the introduction and the first two sections. However, I still need to write the analysis and the conclusion, and I do not think I can do this well by Friday.\n\nWould it be possible to submit the essay next Wednesday instead? I am feeling better now, so I am confident that I can finish it by then. Thank you very much for your understanding.\n\nSincerely,\nMinh Tran",
    checklist: ['Nêu rõ mục đích (xin gia hạn bài luận) ngay đoạn đầu', 'Giải thích hoàn cảnh cụ thể, có bằng chứng (giấy khám bệnh)', 'Cho biết tiến độ: đã làm được phần nào, còn thiếu phần nào', 'Đề xuất ngày nộp mới cụ thể bằng câu hỏi lịch sự ("Would it be possible…?")', 'Giọng văn trang trọng, có lời cảm ơn và ký tên', 'Khoảng 120–180 từ'],
    tips: 'Thư xin gia hạn thuyết phục hơn khi cho thấy bạn đã cố gắng (đã hoàn thành một nửa) và đề xuất một hạn mới hợp lý, thay vì chỉ xin "thêm thời gian" chung chung.',
  });
  TF.writing.push({
    id: 'tf3-em2', set: 3, task: 'email', title: 'Asking a Former Manager for a Reference', minutes: 7,
    scenario: 'You are applying for a summer internship at a publishing company. The application requires a reference letter. Last year you worked part-time at a bookstore, where Ms. Delgado was your manager.',
    to: 'Ms. Delgado, your former manager',
    points: ['Remind Ms. Delgado who you are.', 'Explain what you are applying for and why you are asking her.', 'Give details about the letter, including the deadline.'],
    model: "Dear Ms. Delgado,\n\nI hope you are doing well. My name is Lan Nguyen, and I worked part-time at Corner Books from September to June last year, mainly at the front desk and helping with the monthly reading events.\n\nI am now applying for a summer internship in the editorial department of Brightline Publishing, and the application requires a reference letter from a previous employer. Because you saw how I worked with customers and helped organize events, I believe you know my strengths better than anyone else.\n\nIf you agree, the letter should describe my responsibilities and your impression of my work. It needs to be sent directly to the company by email before April 15. I have attached the internship description and my updated résumé, in case they are helpful.\n\nThank you very much for considering my request. I understand that you are busy, so please let me know if this is not possible.\n\nBest regards,\nLan Nguyen",
    checklist: ['Nhắc lại bạn là ai: thời gian và công việc đã làm', 'Nêu vị trí đang ứng tuyển và lý do nhờ đúng người này', 'Cung cấp chi tiết: nội dung thư, cách gửi, hạn chót', 'Đính kèm tài liệu hữu ích (mô tả công việc, CV)', 'Lịch sự, tôn trọng thời gian của người nhận; có lời cảm ơn', 'Khoảng 120–180 từ'],
    tips: 'Khi nhờ viết thư giới thiệu, hãy giúp người nhận dễ đồng ý: nhắc lại kỷ niệm làm việc cụ thể, nói rõ cần viết gì và hạn khi nào, và cho họ một "lối thoát" lịch sự nếu không thể giúp.',
  });

  /* ===================================================================
   * WRITING · Write for an Academic Discussion
   * =================================================================== */
  TF.writing.push({
    id: 'tf3-ad1', set: 3, task: 'discussion', title: 'Should City Centers Be Car-Free?', minutes: 10,
    professor: { name: 'Dr. Haddad', text: 'In our transportation planning course, we have been studying how cities manage traffic. Several European cities have recently banned private cars from their historic centers, allowing only pedestrians, bicycles, buses, and delivery vehicles. Supporters say this makes city centers cleaner and more pleasant, while critics worry that it hurts local businesses and makes life difficult for some residents. Should more cities ban cars from their centers? Explain your view.' },
    students: [
      { name: 'Sofia', text: 'Yes, definitely. When cars disappear, the air becomes cleaner and the streets become safer for children. People walk more, sit in cafés, and enjoy the city instead of rushing through it.' },
      { name: 'Kenji', text: 'I see the benefits, but a total ban seems unfair. Older people and people with disabilities may not be able to walk or cycle long distances, and shops could lose customers who come from the suburbs by car.' },
    ],
    model: "I agree with Sofia that car-free centers can make cities healthier and more pleasant, but Kenji's concerns show that a ban only works if it is planned carefully. In my view, cities should remove private cars from their centers gradually and offer good alternatives first. For example, a city could build large parking areas on the edge of the center, connected to it by frequent free buses, so that shoppers from the suburbs can still reach local stores easily. People with disabilities could receive special permits to drive in when necessary. Some cities that have done this have actually found that shops gained customers, because people who walk tend to stay longer and stop at more stores. As a result, a well-designed ban can benefit both residents and businesses.",
    checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Phản hồi ý của cả Sofia và Kenji', 'Đóng góp ý MỚI (bãi đỗ xe ven trung tâm + xe buýt miễn phí, giấy phép đặc biệt)', 'Có ví dụ/bằng chứng cụ thể hỗ trợ lập luận', 'Dùng từ nối: In my view, For example, As a result', 'Tối thiểu khoảng 100 từ'],
    tips: 'Khi hai bạn đưa ra hai mặt lợi – hại, một cách hay là đồng ý có điều kiện: "Yes, but only if…" rồi đưa giải pháp cụ thể khắc phục mối lo của bạn phản đối.',
  });
  TF.writing.push({
    id: 'tf3-ad2', set: 3, task: 'discussion', title: 'Is Space Exploration Worth the Cost?', minutes: 10,
    professor: { name: 'Professor Adeyemi', text: 'This week we are discussing how governments set priorities for public spending. Every year, several countries spend billions of dollars on space programs, such as sending robots to Mars or building space telescopes. Some people believe this money would be better spent solving problems on Earth, such as poverty or climate change. Others think space exploration is a valuable investment. What is your opinion? Should governments continue to fund space exploration?' },
    students: [
      { name: 'Aisha', text: 'I think the money should be used on Earth first. It is hard to justify sending robots to Mars when millions of people still do not have clean water or enough food.' },
      { name: 'Lucas', text: 'Space programs are worth it. They inspire young people to study science, and many technologies we use every day, like weather forecasts and GPS, depend on satellites.' },
    ],
    model: "I understand Aisha's point, but I agree with Lucas that governments should continue funding space exploration. One reason that has not been mentioned yet is that space research helps us solve the very problems Aisha is worried about. For example, satellites monitor droughts, floods, and deforestation, which allows governments and aid organizations to respond to disasters more quickly and plan where water and food are most needed. Satellites also measure changes in sea ice and global temperatures, giving scientists the data they need to understand climate change. In addition, space budgets are usually a very small part of total government spending, so cutting them would not end poverty. Therefore, I believe space exploration and solving problems on Earth are not really competing goals.",
    checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Phản hồi ý của cả Aisha và Lucas', 'Đóng góp ý MỚI (vệ tinh giúp giải quyết chính các vấn đề trên Trái Đất)', 'Có ví dụ cụ thể (theo dõi hạn hán, lũ lụt, băng biển)', 'Dùng từ nối: For example, In addition, Therefore', 'Tối thiểu khoảng 100 từ'],
    tips: 'Một chiến lược mạnh là cho thấy hai lựa chọn tưởng đối lập thực ra hỗ trợ nhau – lấy chính lo ngại của bạn phản đối để củng cố quan điểm của mình.',
  });

  /* ===================================================================
   * SPEAKING · Listen and Repeat
   * =================================================================== */
  TF.speaking.push({
    id: 'tf3-rp1', set: 3, task: 'repeat', title: 'Campus Bookstore Cashier', accent: 'en-US',
    context: 'You are starting a part-time job at the campus bookstore. Listen to the store manager and repeat exactly what you hear.',
    sentences: [
      { t: 'Welcome to the team.', tip: 'Nối âm "Welcome to" đọc lướt /tə/; nhấn "TEAM".' },
      { t: 'The store opens at eight thirty.', tip: '"opens at" nối âm /ˈoʊpənzæt/; "thirty" giọng Mỹ đọc /ˈθɝːdi/ với âm /t/ bật nhẹ.' },
      { t: 'Always ask customers for their student ID.', tip: 'Nhấn "ALways", "I-D"; cụm phụ âm /sk/ trong "ask" phải rõ.' },
      { t: 'Used textbooks are kept on the second floor.', tip: '"Used" /juːzd/; "textbooks" có cụm phụ âm /kstb/ – đọc chậm cho rõ.' },
      { t: 'If the card reader stops working, restart it once.', tip: 'Ngắt nhịp sau "working,"; "restart it" nối âm /riˈstɑːrdɪt/.' },
      { t: 'Customers can return books within ten days if they keep the receipt.', tip: '"receipt" đọc /rɪˈsiːt/ – chữ "p" câm; nhấn "TEN DAYS".' },
      { t: 'At the end of each shift, count the money in the register and sign the daily report.', tip: 'Câu dài – chia nhịp: "At the end of each shift / count the money in the register / and sign the daily report".' },
    ],
  });
  TF.speaking.push({
    id: 'tf3-rp2', set: 3, task: 'repeat', title: 'Aquarium Volunteer', accent: 'en-GB',
    context: 'You are training as a volunteer at a public aquarium. Listen to the education officer and repeat exactly what you hear.',
    sentences: [
      { t: 'Thank you for helping today.', tip: 'Âm /θ/ trong "Thank" – đặt đầu lưỡi giữa hai hàm răng; nhấn "HELPing".' },
      { t: 'Please do not tap on the glass.', tip: '"glass" giọng Anh-Anh đọc /ɡlɑːs/ với âm /ɑː/ dài.' },
      { t: 'The shark tunnel is the most popular area.', tip: 'Nhấn "SHARK TUNnel" và "POPular"; "most popular" nối âm nhẹ.' },
      { t: 'Feeding time for the penguins is at half past eleven.', tip: '"half past eleven" theo cách nói giờ của Anh; "penguins" /ˈpeŋɡwɪnz/.' },
      { t: 'Children must be accompanied by an adult at all times.', tip: 'Bị động "must be accompanied"; "accompanied" /əˈkʌmpənid/ nhấn âm thứ hai.' },
      { t: 'If a visitor feels unwell, take them to the first aid room near the entrance.', tip: 'Ngắt nhịp sau "unwell,"; "first aid" nối âm /fɜːsteɪd/.' },
      { t: 'Most of the fish in this tank were rescued from the coast and cannot be returned to the wild.', tip: 'Câu dài – ngắt sau "tank" và "coast"; nhấn "CANnot" và "WILD".' },
    ],
  });

  /* ===================================================================
   * SPEAKING · Take an Interview
   * =================================================================== */
  TF.speaking.push({
    id: 'tf3-iv1', set: 3, task: 'interview', title: 'Food and Eating Habits', seconds: 45, accent: 'en-US',
    context: 'A nutrition researcher is interviewing university students about their eating habits. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'To start, could you describe what you usually eat on a typical weekday?',
        model: "On weekdays I usually have a quick breakfast, like bread and a banana, because my first class starts early. For lunch I eat in the university cafeteria, normally rice with vegetables and some chicken or fish. In the evening I try to cook something simple with my roommate, since it's cheaper and healthier than ordering food.",
        tip: 'Đi theo trình tự sáng – trưa – tối để câu trả lời có cấu trúc; thêm lý do ngắn ("because…", "since…") cho mỗi bữa.' },
      { q: 'Do you prefer cooking at home or eating out? Why?',
        model: "I prefer cooking at home most of the time. It saves money, and I know exactly what goes into my food. Cooking also helps me relax after a long day of classes. However, I enjoy eating out on weekends with friends, because it's a nice way to try new dishes and spend time together.",
        tip: 'Nêu lựa chọn chính với 2 lý do, rồi thêm ngoại lệ bằng "However…" để thể hiện sự linh hoạt.' },
      { q: 'Some people think schools and universities should stop selling sugary drinks. What is your opinion?',
        model: "I think it's a reasonable idea. Many students drink soda every day without realizing how much sugar it contains, and that can lead to health problems later. If schools offer water, tea, and fruit juice instead, students will probably get used to them. Of course, students can still buy soda elsewhere, but schools should at least set a good example.",
        tip: 'Câu hỏi quan điểm: đồng ý/không đồng ý + lý do + hệ quả, rồi thừa nhận giới hạn ("Of course…") trước khi kết luận.' },
      { q: 'How do you think the way people eat will change in the next twenty years?',
        model: "I expect people will eat less meat, because of concerns about health and the environment. Plant-based products are already becoming cheaper and tastier, so they'll probably be very common. I also think more people will order food through apps, which means cities will need better ways to deal with packaging waste.",
        tip: 'Câu hỏi dự đoán: dùng "I expect…", "will probably…". Một xu hướng chính + nguyên nhân + một hệ quả là đủ cho 45 giây.' },
    ],
  });
  TF.speaking.push({
    id: 'tf3-iv2', set: 3, task: 'interview', title: 'Work and Future Careers', seconds: 45, accent: 'en-GB',
    context: 'A careers office is interviewing students about their plans for the future. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'Could you tell me about a job or volunteer experience that you have had?',
        model: "Last summer I volunteered at an English club for primary school children in my neighbourhood. I helped the teacher prepare games and read stories with small groups. At first I was nervous, but the children were so enthusiastic that I quickly felt comfortable. It taught me to explain things clearly and to be patient.",
        tip: 'Kể ngắn: làm gì, ở đâu, nhiệm vụ cụ thể, và bài học rút ra. Dùng thì quá khứ nhất quán.' },
      { q: 'Would you rather work for a large company or a small one? Why?',
        model: "I'd rather start my career at a large company. Big companies usually offer structured training programmes, and I could learn from many experienced colleagues. They also have clear paths for promotion. Later, once I have more experience, I might move to a smaller company where I could take on more responsibility.",
        tip: 'Dùng "I\'d rather…" để nêu lựa chọn; đưa 2–3 lý do, có thể thêm kế hoạch dài hạn ("Later…") cho câu trả lời có chiều sâu.' },
      { q: 'Some people say that a high salary is the most important thing when choosing a job. Do you agree?',
        model: "Not completely. A good salary is certainly important, especially when you need to support a family or pay rent in a big city. But if you dislike your work or your colleagues, you'll probably feel stressed and unmotivated, no matter how much you earn. For me, interesting work and a healthy work-life balance matter just as much as money.",
        tip: 'Thừa nhận mặt đúng ("certainly important…"), nêu phản biện ("But…"), rồi kết bằng quan điểm cá nhân rõ ràng.' },
      { q: 'What skills do you think will be most important for workers in the future?',
        model: "I think the ability to keep learning will be the most important skill. Technology is changing so quickly that many jobs will look very different in ten years. Workers who can learn new tools fast will have a big advantage. Communication and teamwork will also matter, because machines can't easily replace those human skills.",
        tip: 'Nêu một kỹ năng chính + lý do (công nghệ thay đổi nhanh), rồi bổ sung 1–2 kỹ năng mềm với giải thích ngắn.' },
    ],
  });

  /* ===================================================================
   * Xoay vị trí đáp án đúng (chỉ các unit của bộ 3): dữ liệu soạn với a = 0,
   * xoay theo mẫu cố định cho từng dạng bài → A/B/C/D phân bố đều.
   * Cờ _rot ngăn xoay lặp (data1/data2 cũng dùng cờ này).
   * =================================================================== */
  const PAT = [2, 0, 3, 1, 1, 3, 0, 2, 3, 2, 1, 0];
  const counter = {};
  [...TF.reading, ...TF.listening].filter(u => /^tf3-/.test(u.id)).forEach(u => (u.groups || []).forEach(gr => {
    if (gr.type !== 'mcq' || gr._rot) return; gr._rot = 1;
    gr.items.forEach(it => {
      const k = counter[u.task] = (counter[u.task] || 0) + 1;
      const n = it.options.length, want = PAT[(k - 1) % PAT.length] % n, r = (it.a - want + n) % n;
      if (r) { it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want; }
    });
  }));
})(typeof self !== 'undefined' ? self : this);
