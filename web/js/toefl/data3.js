/* TOEFL iBT (định dạng từ 21/01/2026) – Bộ luyện tập 3 (+ Reading & Listening bộ 4). Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
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
      { n: 21, prompt: 'Where did you study for the exam?', chunks: ['I', 'studied', 'in the library', 'with', 'two friends', 'from my class'], end: '.',
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
      { n: 28, prompt: 'Why was the concert postponed?', chunks: ['it', 'was postponed', 'because', 'the lead singer', 'had', 'lost', 'her voice'], end: '.',
        explain: "Bị động quá khứ \"was postponed\" (bị hoãn); \"because + mệnh đề\" nêu lý do; quá khứ hoàn thành \"had lost\" chỉ việc xảy ra trước khi buổi hòa nhạc bị hoãn." },
      { n: 29, prompt: 'What is the hardest part of the course?', chunks: ['writing', 'the final', 'research paper', 'is', 'the most', 'difficult part'], end: '.', alt: ['the most difficult part is writing the final research paper'],
        explain: "Danh động từ làm chủ ngữ: \"Writing the final research paper\" + \"is\" + so sánh nhất \"the most difficult part\". Có thể đảo hai vế quanh \"is\"." },
      { n: 30, prompt: 'Is the gym crowded in the evening?', chunks: ['it', 'tends', 'to be', 'less crowded', 'after', 'eight o\'clock'], end: '.',
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
   * BỘ 4 · READING (tự biên soạn). Daily Life câu 31–40, Academic 61–80.
   * =================================================================== */
  TF.reading.push({
    id: 'tf4-cw1', set: 4, task: 'cw', title: 'Why Leaves Change Color in Autumn',
    instr: 'Fill in the missing letters in the paragraph.',
    text: "In summer, most leaves look green because they contain large amounts of chlorophyll, the pigment {th|at} plants use to capture energy {fr|om} sunlight. As the days become shorter {a|nd} cooler in autumn, many trees stop {prod|ucing} new chlorophyll. The green color slowly {fa|des}, and yellow and orange pigments that {we|re} there all along become visible. {So|me} trees also make red pigments at {th|is} time of year. Bright, sunny days {foll|owed} by cool nights tend to produce the most colorful {disp|lays}.",
    explain: [
      "Đại từ quan hệ \"that\" thay cho \"the pigment\", mở đầu mệnh đề quan hệ \"that plants use…\".",
      "\"capture energy from sunlight\" = thu năng lượng TỪ ánh sáng mặt trời; giới từ \"from\" chỉ nguồn gốc.",
      "Hai tính từ song song \"shorter and cooler\" nối bằng \"and\".",
      "\"stop + V-ing\" = ngừng làm gì → \"stop producing\" (ngừng tạo ra).",
      "Chủ ngữ số ít \"The green color\" + động từ hiện tại đơn thêm -s → \"fades\" (nhạt dần).",
      "Mệnh đề quan hệ \"that were there all along\" (vốn đã có sẵn từ trước); chủ ngữ số nhiều \"pigments\" → \"were\".",
      "\"Some trees\" = một số cây; \"some\" đứng trước danh từ số nhiều.",
      "\"at this time of year\" = vào thời điểm này trong năm; cụm cố định.",
      "Phân từ bị động rút gọn \"followed by\" (được tiếp nối bởi) = days which are followed by cool nights.",
      "Sau tính từ \"colorful\" cần danh từ số nhiều \"displays\" (những cảnh sắc màu)."
    ],
  });
  TF.reading.push({
    id: 'tf4-cw2', set: 4, task: 'cw', title: 'The Printing Press',
    instr: 'Fill in the missing letters in the paragraph.',
    text: "Before the fifteenth century, books in Europe were usually copied {b|y} hand, so they were rare {a|nd} expensive. Around 1450, Johannes Gutenberg developed a printing {sys|tem} that used movable metal type. Each letter {w|as} cast as a separate piece, and the {pie|ces} could be arranged to form a page, inked, {a|nd} pressed onto paper. After printing, the {let|ters} could be taken apart and used {ag|ain} for the next page. As a result, books {bec|ame} cheaper, and ideas spread far more {qui|ckly} than before.",
    explain: [
      "\"by hand\" = bằng tay; cụm cố định với giới từ \"by\".",
      "Hai tính từ song song \"rare and expensive\" (hiếm và đắt).",
      "Sau \"a printing\" cần danh từ \"system\" (hệ thống in).",
      "Bị động quá khứ: \"Each letter was cast\" (mỗi chữ được đúc); chủ ngữ số ít → \"was\".",
      "\"the pieces\" = các con chữ (mảnh) đã nhắc ở trước; danh từ số nhiều.",
      "Chuỗi ba động từ song song \"arranged…, inked, and pressed\" nối bằng \"and\".",
      "\"the letters could be taken apart\" = các con chữ có thể được tháo rời; danh từ số nhiều.",
      "\"used again\" = được dùng lại; trạng từ \"again\".",
      "Quá khứ đơn \"became cheaper\" (trở nên rẻ hơn).",
      "Trạng từ \"quickly\" bổ nghĩa cho động từ \"spread\"; \"far more quickly than before\" = nhanh hơn nhiều so với trước."
    ],
  });
  TF.reading.push({
    id: 'tf4-dl1', set: 4, task: 'daily', title: 'Recycling Center Holiday Hours',
    text: "GREENFIELD RECYCLING CENTER – HOLIDAY HOURS\n\nThe center will be closed on December 25 and January 1. On all other days between December 20 and January 5, it will close at 3 p.m. instead of the usual 5 p.m.\n\nGift wrapping paper with glitter or metallic foil cannot be recycled and should be placed in regular trash. Plain paper and cardboard boxes are accepted as usual, but boxes must be flattened before drop-off.\n\nResidents may drop off natural holiday trees free of charge from January 2 to January 15. Please remove all lights and decorations first.",
    groups: [mcq('Read the notice and answer the questions.', [
      { n: 31, q: 'What will change about the center\'s hours during the holiday period?', options: ['It will close two hours earlier on most days.', 'It will open two hours later on most days.', 'It will be closed every weekend.', 'It will stay open later on December 31.'], a: 0,
        explain: "\"it will close at 3 p.m. instead of the usual 5 p.m.\" → trong dịp lễ trung tâm đóng cửa sớm hơn hai tiếng vào hầu hết các ngày (trừ hai ngày nghỉ hẳn 25/12 và 1/1). Giờ mở cửa không đổi." },
      { n: 32, q: 'What should residents do with wrapping paper that has glitter on it?', options: ['Put it in the regular trash', 'Flatten it before drop-off', 'Bring it in after January 2', 'Separate it from plain paper at the center'], a: 0,
        explain: "Giấy gói có kim tuyến hoặc lớp kim loại \"cannot be recycled and should be placed in regular trash\" → bỏ vào thùng rác thường. Việc làm phẳng chỉ áp dụng cho hộp các-tông." },
      { n: 33, q: 'What can be inferred about a resident who brings a decorated holiday tree on January 10?', options: ['The resident will need to take off the decorations first.', 'The resident will have to pay a small fee.', 'The tree will not be accepted on that date.', 'The resident must also bring cardboard boxes.'], a: 0,
        explain: "Câu suy luận: cây thông được nhận miễn phí từ 2/1 đến 15/1 (ngày 10/1 nằm trong khoảng này), nhưng \"Please remove all lights and decorations first\" → người dân phải tháo đồ trang trí trước. Không mất phí (\"free of charge\")." },
    ])],
  });
  TF.reading.push({
    id: 'tf4-dl2', set: 4, task: 'daily', title: 'Email about a Course Waitlist',
    text: "To: Students on the waitlist for PSYC 210\nFrom: Dr. Hana Okafor\nSubject: Waitlist update\n\nDear students,\n\nBecause of high demand, the department has agreed to open a second section of Introduction to Social Psychology. The new section will meet on Mondays and Wednesdays from 4:00 to 5:15 p.m. in Room 118 of Carver Hall.\n\nIf you would like a seat in the new section, please reply to this email by Friday at noon. Seats will be given in the order that replies are received. Students who do not reply will stay on the waitlist for the original section, but I should warn you that very few students drop the course after the first week.\n\nBest regards,\nDr. Okafor",
    groups: [mcq('Read the email and answer the questions.', [
      { n: 34, q: 'What is the main purpose of the email?', options: ['To offer students places in a newly created class section', 'To announce that a course has been cancelled', 'To change the room for the original section', 'To remind students about a Friday exam'], a: 0,
        explain: "Mục đích chính: khoa mở thêm \"a second section\" vì nhu cầu cao, và giáo sư mời sinh viên trong danh sách chờ trả lời để nhận chỗ ở lớp mới. Không có thông tin hủy môn hay thi cử." },
      { n: 35, q: 'How will seats in the new section be assigned?', options: ['On a first-come, first-served basis', 'By students\' grades in earlier courses', 'By a random drawing on Friday', 'According to students\' year of study'], a: 0,
        explain: "\"Seats will be given in the order that replies are received\" → ai trả lời trước được xếp trước (first-come, first-served)." },
      { n: 36, q: 'What does Dr. Okafor suggest about staying on the waitlist for the original section?', options: ['It is unlikely to result in getting a seat.', 'It guarantees a seat in the second week.', 'It is required for all psychology majors.', 'It gives students priority in the next term.'], a: 0,
        explain: "Giáo sư cảnh báo \"very few students drop the course after the first week\" → hầu như không có ai bỏ lớp, nên ở lại danh sách chờ khó có chỗ. Không có thông tin về ưu tiên học kỳ sau." },
    ])],
  });
  TF.reading.push({
    id: 'tf4-dl3', set: 4, task: 'daily', title: 'Language Exchange Flyer',
    text: "JOIN THE CAMPUS LANGUAGE EXCHANGE!\n\nWant to practice a new language with a native speaker? Our program matches you with a partner who wants to learn your language. You meet for one hour a week: thirty minutes in your language and thirty minutes in theirs.\n\nMeetings take place in the International Lounge, Student Union, 2nd floor, but partners may also agree to meet online.\n\nTo sign up, complete the short form at the International Office by September 15. Please list up to three languages you would like to practice, in order of preference.",
    groups: [mcq('Read the flyer and answer the questions.', [
      { n: 37, q: 'How is each weekly meeting organized?', options: ['The time is divided equally between two languages.', 'A teacher leads the first half of the session.', 'Partners speak only the language they are learning.', 'Each meeting focuses on a different language.'], a: 0,
        explain: "\"thirty minutes in your language and thirty minutes in theirs\" → một tiếng mỗi tuần chia đều cho hai ngôn ngữ. Tờ rơi không nhắc đến giáo viên." },
      { n: 38, q: 'According to the flyer, what must students do on the sign-up form?', options: ['Rank the languages they want to practice', 'Choose a meeting time', 'Describe their current language level', 'Name the partner they want'], a: 0,
        explain: "\"list up to three languages you would like to practice, in order of preference\" → liệt kê tối đa ba ngôn ngữ theo thứ tự ưu tiên, tức là xếp hạng các ngôn ngữ muốn luyện." },
    ])],
  });
  TF.reading.push({
    id: 'tf4-dl4', set: 4, task: 'daily', title: 'Group Chat about a Presentation',
    text: "Priya (8:02 p.m.): Hi both! Our presentation is on Thursday. Can we meet tomorrow to rehearse?\nCarlos (8:05 p.m.): Tomorrow works, but I've got a lab until 3. Anytime after that?\nJun (8:07 p.m.): I'm working at the café until 4:30, sorry.\nPriya (8:08 p.m.): How about 5 in the library? I'll book a group room with a screen.\nCarlos (8:09 p.m.): Perfect. I'll bring my laptop.\nJun (8:10 p.m.): Sounds good. I still need to finish the last two slides, though, so they might be a bit rough.\nPriya (8:11 p.m.): No worries. That's what the rehearsal is for!",
    groups: [mcq('Read the messages and answer the questions.', [
      { n: 39, q: 'Why do the students agree to meet at 5 p.m.?', options: ['Both Carlos and Jun are busy earlier in the afternoon.', 'The library opens at 5 p.m.', 'Their presentation starts at 5 p.m. on Thursday.', 'Priya cannot book a room before then.'], a: 0,
        explain: "Carlos có giờ thực hành đến 3 giờ, Jun làm ở quán cà phê đến 4:30 → 5 giờ là thời điểm cả nhóm đều rảnh. Không có thông tin về giờ mở cửa thư viện." },
      { n: 40, q: 'What does Priya mean when she writes, "That\'s what the rehearsal is for"?', options: ['The practice session is a chance to improve unfinished work.', 'Jun should finish the slides before the meeting.', 'The rehearsal will be cancelled if the slides are not ready.', 'She will make the last two slides herself.'], a: 0,
        explain: "Jun lo hai trang cuối còn \"rough\" (thô, chưa hoàn chỉnh); Priya trấn an rằng buổi tập dượt chính là để chỉnh sửa những phần chưa xong. Cô không yêu cầu Jun phải làm xong trước." },
    ])],
  });

  TF.reading.push({
    id: 'tf4-ap1', set: 4, task: 'academic', title: 'Sea Otters and Kelp Forests',
    text: [
      "Along the rocky coasts of the North Pacific, kelp forests grow in cool, shallow water. Kelp is a large brown seaweed that can grow tens of centimeters in a single day and reach the surface from depths of more than twenty meters. These underwater forests provide food and shelter for hundreds of species, from small invertebrates to fish and marine mammals. Yet their survival depends, to a surprising degree, on a single predator: the sea otter.",
      "Sea otters feed heavily on sea urchins, spiny animals that graze on kelp. Because otters have no thick layer of fat to keep them warm, they must eat a large amount of food every day, often around a quarter of their body weight. When otters are present, they keep urchin numbers low, and the urchins that survive tend to hide in cracks in the rocks, feeding mainly on pieces of kelp that drift past. When otters disappear, however, urchin populations can grow rapidly. The urchins leave their hiding places and move across the sea floor, eating the bases of the kelp. In some places, this has turned thick forests into so-called urchin barrens, areas where little except urchins remains.",
      "The importance of otters became clear partly because of a historical accident. During the eighteenth and nineteenth centuries, sea otters were hunted intensively for their fur, which is the densest of any mammal. By the early twentieth century, they had disappeared from most of their original range, and only small groups survived. In 1911, an international agreement gave otters protection, and their numbers slowly began to recover. Scientists who later compared coastlines with and without otters found striking differences: where otters had returned, kelp was plentiful; where they were still absent, urchins were common and kelp was scarce.",
      "An effect of this kind, in which a predator influences plants indirectly by controlling the animals that eat them, is known as a trophic cascade. The sea otter is therefore often described as a keystone species. Like the central stone that holds an arch together, a keystone species has an effect on its ecosystem that is much larger than its numbers alone would suggest.",
      "Healthy kelp forests also benefit people. They reduce the force of waves that reach the shore, support fisheries, and take up carbon dioxide as they grow. For these reasons, some researchers argue that protecting sea otters may be one of the most effective ways to protect coastal ecosystems as a whole. Others caution that the relationship is not always simple. Water temperature, storms, and disease can also affect kelp and urchins, so the return of otters does not automatically restore every forest.",
    ].join('\n\n'),
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 61, q: 'According to paragraph 1, which of the following is true of kelp?', options: ['It can grow very quickly.', 'It grows mainly in warm water.', 'It provides food for only a few species.', 'It grows only in water deeper than twenty meters.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Đoạn 1: tảo bẹ \"can grow tens of centimeters in a single day\" → mọc rất nhanh. Tảo sống ở nước \"cool, shallow\" (lạnh, nông), là nơi sống của \"hundreds of species\", nên các phương án còn lại đều sai." },
      { n: 62, q: 'According to paragraph 2, why must sea otters eat a large amount of food?', options: ['They lack a thick layer of fat to keep them warm.', 'Sea urchins contain very little food value.', 'They must compete with fish for food.', 'They spend most of the day swimming long distances.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"Because otters have no thick layer of fat to keep them warm, they must eat a large amount of food every day\" → rái cá không có lớp mỡ dày giữ ấm nên phải ăn nhiều." },
      { n: 63, q: 'The word "graze" in paragraph 2 is closest in meaning to', options: ['feed', 'climb', 'rest', 'hide'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"sea urchins, spiny animals that graze on kelp\" = những con vật gặm/ăn tảo bẹ → \"feed\". Đoạn văn sau đó nói rõ nhím biển \"eating the bases of the kelp\"." },
      { n: 64, q: 'According to paragraph 2, what happens when sea otters are present?', options: ['Sea urchins stay hidden and eat mostly drifting kelp.', 'Sea urchins move freely across the sea floor.', 'Kelp forests turn into urchin barrens.', 'Sea urchins begin to eat other animals.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Khi có rái cá, nhím biển ít đi và những con sống sót \"tend to hide in cracks in the rocks, feeding mainly on pieces of kelp that drift past\" → ẩn nấp, chủ yếu ăn tảo trôi dạt. Việc bò khắp đáy biển và tạo \"urchin barrens\" chỉ xảy ra khi KHÔNG có rái cá." },
      { n: 65, q: 'Why does the author mention that sea otter fur "is the densest of any mammal" in paragraph 3?', options: ['To explain why otters were hunted so intensively', 'To show how otters survive without body fat', 'To compare otters with other marine mammals', 'To explain why the 1911 agreement was signed'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Chi tiết bộ lông dày nhất trong các loài thú nằm ngay trong câu nói rái cá \"were hunted intensively for their fur\" → tác giả nêu ra để giải thích vì sao chúng bị săn bắt ráo riết đến gần tuyệt chủng." },
      { n: 66, q: 'What can be inferred from paragraph 3 about the scientists\' comparison of coastlines?', options: ['It provided evidence that otters help kelp forests survive.', 'It showed that urchins prefer warmer coastlines.', 'It was carried out before otters were protected.', 'It proved that hunting otters had no effect on kelp.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Nơi rái cá quay lại thì tảo bẹ dày đặc, nơi vắng rái cá thì nhiều nhím biển và ít tảo → so sánh này là bằng chứng cho thấy rái cá giúp rừng tảo bẹ tồn tại. Cuộc so sánh diễn ra \"later\", tức là sau khi rái cá được bảo vệ." },
      { n: 67, q: 'According to paragraph 4, a trophic cascade occurs when', options: ['a predator affects plants by controlling the animals that eat them', 'plants grow faster than animals can eat them', 'a species disappears because of hunting', 'many predators compete for the same prey'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Định nghĩa trong đoạn 4: \"a predator influences plants indirectly by controlling the animals that eat them\" → động vật săn mồi tác động gián tiếp lên thực vật thông qua việc kiểm soát loài ăn thực vật." },
      { n: 68, q: 'Why does the author compare a keystone species to "the central stone that holds an arch together" in paragraph 4?', options: ['To illustrate that one species can be essential to a whole ecosystem', 'To show that sea otters live among rocks', 'To explain how kelp is attached to the sea floor', 'To suggest that ecosystems are built slowly over time'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Viên đá đỉnh vòm giữ cả vòm đứng vững; tương tự, loài then chốt có ảnh hưởng \"much larger than its numbers alone would suggest\" → minh họa rằng một loài có thể quyết định sự tồn tại của cả hệ sinh thái." },
      { n: 69, q: 'According to paragraph 5, all of the following are benefits of kelp forests EXCEPT', options: ['they increase the water temperature near the coast', 'they reduce the force of waves', 'they support fisheries', 'they take up carbon dioxide'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 5 liệt kê lợi ích: giảm lực sóng, hỗ trợ nghề cá, hấp thụ CO₂. Nhiệt độ nước chỉ được nhắc như một yếu tố ẢNH HƯỞNG đến tảo bẹ, không phải lợi ích do tảo mang lại → đáp án." },
      { n: 70, q: 'What can be inferred from paragraph 5 about the return of sea otters to an area?', options: ['It may not be enough on its own to restore a kelp forest.', 'It always leads to more storms and disease.', 'It reduces the number of fish in the area.', 'It has no effect on sea urchin populations.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Một số nhà khoa học lưu ý nhiệt độ nước, bão và dịch bệnh cũng ảnh hưởng, nên \"the return of otters does not automatically restore every forest\" → chỉ riêng việc rái cá quay lại có thể chưa đủ để phục hồi rừng tảo." },
    ])],
  });
  TF.reading.push({
    id: 'tf4-ap2', set: 4, task: 'academic', title: 'The Origins of Writing in Mesopotamia',
    text: [
      "Writing was invented independently in several parts of the world, but one of the earliest known systems developed in southern Mesopotamia, in what is now Iraq. By the late fourth millennium BCE, cities such as Uruk had grown large and complex. Temple and palace officials had to keep track of goods such as grain, livestock, and textiles, as well as the workers who produced them. Many scholars believe that writing grew out of this practical need to record economic information.",
      "For thousands of years before writing appeared, people in the region had used small clay tokens of different shapes to represent goods. A cone or a sphere, for example, might stand for a particular measure of grain. Some researchers have argued that writing developed gradually from these tokens: at first they were sealed inside hollow clay containers, and their shapes were pressed into the outside so that the contents could be checked without breaking the container. Eventually, people may have realized that the marks alone were sufficient, and the tokens were no longer needed. This theory is influential but not universally accepted, and the exact steps remain a subject of debate.",
      "The earliest tablets from Uruk, dating to around 3300–3000 BCE, contain mainly numbers and simple pictures. A drawing of an animal's head might represent the animal itself, and marks beside it showed how many. These records were limited in what they could express. They could show that ten sheep had been delivered, but they could not easily record a story, a law, or the name of a person.",
      "Over the following centuries, the system changed in two important ways. First, the signs became more abstract. Scribes wrote by pressing the end of a cut reed into soft clay, which produced wedge-shaped marks, and the original pictures gradually turned into combinations of wedges. This style is called cuneiform, from the Latin word for \"wedge.\" Second, many signs came to represent sounds rather than only objects or ideas. A sign that originally meant one thing could be used for another word that sounded similar, much as a picture of an eye and a saw might be used to write the English phrase \"I saw.\" This development allowed scribes to write names, grammatical endings, and eventually whole sentences.",
      "Learning cuneiform was difficult. The system used hundreds of signs, and many of them had more than one possible reading. Scribes trained for years in schools, copying lists of signs and model texts again and again. As a result, literacy remained limited to a relatively small group of specialists. Nevertheless, cuneiform proved remarkably adaptable. It was used to write several different languages over a period of about three thousand years, and the documents that survive include not only economic records but also letters, laws, scientific observations, and literature.",
    ].join('\n\n'),
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 71, q: 'According to paragraph 1, what do many scholars believe led to the development of writing in Mesopotamia?', options: ['The need to record economic information', 'The desire to preserve religious stories', 'Contact with other writing systems', 'The need to communicate with distant cities'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"Many scholars believe that writing grew out of this practical need to record economic information\" → nhu cầu ghi chép thông tin kinh tế (hàng hóa, nhân công). Đoạn 1 còn nói chữ viết ra đời độc lập ở nhiều nơi, không do tiếp xúc với hệ chữ khác." },
      { n: 72, q: 'The word "sufficient" in paragraph 2 is closest in meaning to', options: ['enough', 'permanent', 'accurate', 'attractive'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"the marks alone were sufficient, and the tokens were no longer needed\" = chỉ riêng các dấu in đã ĐỦ, không cần thẻ đất sét nữa → \"enough\"." },
      { n: 73, q: 'Why were the shapes of tokens pressed into the outside of clay containers, according to paragraph 2?', options: ['So that the contents could be checked without opening the container', 'So that the containers would be easier to carry', 'So that the tokens could be reused later', 'So that the containers could be sold as decorations'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Hình dạng thẻ được ấn ra mặt ngoài \"so that the contents could be checked without breaking the container\" → để kiểm tra bên trong có gì mà không phải đập vỡ vật chứa." },
      { n: 74, q: 'What does the author suggest about the theory that writing developed from clay tokens?', options: ['It is widely discussed, but scholars still disagree about it.', 'It has been proven by the earliest tablets.', 'It has been rejected by most researchers.', 'It applies to every early writing system.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Tác giả viết \"This theory is influential but not universally accepted, and the exact steps remain a subject of debate\" → giả thuyết có ảnh hưởng lớn nhưng các học giả vẫn còn tranh luận; chưa được chứng minh, cũng không bị đa số bác bỏ." },
      { n: 75, q: 'Why does the author mention "ten sheep" in paragraph 3?', options: ['To illustrate the kind of information the earliest tablets could record', 'To show that sheep were the most valuable animals in Uruk', 'To explain how numbers were written with wedges', 'To argue that the earliest tablets recorded laws'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Ví dụ \"ten sheep had been delivered\" minh họa loại thông tin đơn giản (số lượng + vật) mà những tấm bảng đầu tiên ghi được, đối lập với việc chúng không ghi được truyện, luật hay tên người." },
      { n: 76, q: 'According to paragraph 3, the earliest tablets could NOT easily record which of the following?', options: ['The name of a person', 'The number of animals delivered', 'The type of goods received', 'Quantities of grain'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 3: các tấm bảng sớm nhất ghi được số lượng và vật (ví dụ mười con cừu) nhưng \"could not easily record a story, a law, or the name of a person\" → tên người là thứ KHÔNG ghi được dễ dàng." },
      { n: 77, q: 'According to paragraph 4, why is the writing system called cuneiform?', options: ['Because its signs were made of wedge-shaped marks', 'Because it was first used in a city called Cunei', 'Because it was written on pieces of reed', 'Because it was based on pictures of objects'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Bút sậy ấn vào đất sét tạo ra \"wedge-shaped marks\"; tên cuneiform đến \"from the Latin word for 'wedge'\" (cái nêm) → gọi theo hình dạng nét chữ hình nêm. Chữ viết trên đất sét, không phải trên sậy." },
      { n: 78, q: 'Why does the author mention the English phrase "I saw" in paragraph 4?', options: ['To explain how a sign could be used for a word that sounded similar', 'To show that cuneiform was later used to write English', 'To compare the difficulty of English and cuneiform', 'To give an example of an abstract wedge-shaped sign'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Ví dụ hình con mắt (eye) + cái cưa (saw) để viết \"I saw\" minh họa nguyên tắc dùng một ký hiệu cho một từ khác ĐỒNG ÂM/gần âm – tức là ký hiệu bắt đầu biểu thị âm thanh. Chữ hình nêm không dùng để viết tiếng Anh." },
      { n: 79, q: 'What can be inferred from paragraph 5 about literacy in ancient Mesopotamia?', options: ['Most ordinary people could not read or write cuneiform.', 'Children learned cuneiform easily at home.', 'Cuneiform had only a few signs to remember.', 'Scribes did not need any formal training.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Chữ hình nêm có hàng trăm ký hiệu, người học phải được đào tạo nhiều năm, nên \"literacy remained limited to a relatively small group of specialists\" → phần lớn người bình thường không biết đọc viết." },
      { n: 80, q: 'According to paragraph 5, all of the following types of documents survive in cuneiform EXCEPT', options: ['maps of trade routes', 'letters', 'laws', 'scientific observations'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 5 liệt kê văn bản còn lại gồm hồ sơ kinh tế, \"letters, laws, scientific observations, and literature\". Bản đồ tuyến đường buôn bán KHÔNG được nhắc tới → đáp án." },
    ])],
  });

  /* ===================================================================
   * BỘ 4 · LISTENING (tự biên soạn). Response 41–48, Conversation 41–48,
   * Announcement 49–54, Academic Talk 55–64.
   * =================================================================== */
  const RESP4 = [
    { s: 'A', t: "Do you know where I can get my student ID card replaced?",
      options: ["Try the registration office in Building C.", "I replaced my phone last month.", "My student number starts with 24.", "The card was blue and white."],
      explain: "Câu hỏi \"where\" (ở đâu) → cần một địa điểm: \"Thử phòng đăng ký ở tòa C xem\". Các phương án khác chỉ lặp từ \"replace\", \"student\", \"card\" để gây nhiễu." },
    { s: 'B', t: "I can't believe the library is closed this weekend.",
      options: ["I know – we'll have to study at the café instead.", "It was built in the 1960s.", "Yes, I believe in hard work.", "I closed the window before I left."],
      explain: "Người nói than phiền thư viện đóng cửa cuối tuần → phản hồi đồng tình và đưa phương án thay thế: \"Ừ – chắc phải học ở quán cà phê thôi\". \"believe\", \"closed\" chỉ là bẫy lặp từ." },
    { s: 'A', t: "How long did it take you to finish the lab report?",
      options: ["About three hours, but the graphs took the longest.", "It's due next Tuesday.", "The lab is on the second floor.", "I took the long way home."],
      explain: "Câu hỏi \"How long\" (mất bao lâu) → cần khoảng thời gian: \"Khoảng ba tiếng\". \"due next Tuesday\" trả lời cho \"When\"; \"took the long way\" là bẫy lặp từ." },
    { s: 'B', t: "Shouldn't we start the presentation with the survey results?",
      options: ["Good point – they're the most interesting part.", "The survey had twenty questions.", "I present the weather on the radio.", "We started at nine o'clock."],
      explain: "Câu hỏi phủ định dùng để đề xuất (\"Chẳng phải ta nên mở đầu bằng kết quả khảo sát sao?\") → phản hồi đồng ý kèm lý do. Các phương án khác lặp \"survey\", \"present\", \"start\"." },
    { s: 'A', t: "Would you rather meet in the morning or after lunch?",
      options: ["After lunch works better for me.", "Yes, I'd like to meet.", "I had a sandwich for lunch.", "The meeting was very useful."],
      explain: "Câu hỏi lựa chọn (A hay B) → chọn một phương án: \"Sau bữa trưa thì tiện hơn cho mình\". Không trả lời Yes/No cho câu hỏi lựa chọn." },
    { s: 'B', t: "The professor posted the exam grades online.",
      options: ["Really? I'll check mine right now.", "The post office closes at five.", "She's a very good professor.", "I'm going to grade school next year."],
      explain: "Người nói thông báo đã có điểm thi trên mạng → phản hồi tự nhiên: \"Thật à? Để mình xem điểm ngay\". \"post office\", \"grade school\" là bẫy đồng âm/khác nghĩa." },
    { s: 'A', t: "Why don't you join the hiking club this semester?",
      options: ["I'd love to, but my schedule is already full.", "Because the club meets on Fridays.", "I joined two pieces of wood together.", "The mountains are very high."],
      explain: "\"Why don't you…?\" là lời RỦ/gợi ý, không phải hỏi lý do → đáp lại bằng nhận lời hoặc từ chối lịch sự: \"Mình rất muốn, nhưng lịch đã kín rồi\". Phương án bắt đầu bằng \"Because\" là bẫy." },
    { s: 'B', t: "Excuse me, is this seat taken?",
      options: ["No, go ahead.", "I took the bus this morning.", "Yes, I'd like a seat by the window.", "The seats are made of plastic."],
      explain: "Hỏi chỗ có người ngồi chưa → \"No, go ahead\" (Chưa, bạn cứ ngồi). Phương án \"Yes, I'd like a seat…\" nghe như trả lời nhưng sai ý; các câu khác lặp \"took\", \"seats\"." },
  ];
  const respScript4 = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
  RESP4.forEach((r, i) => { respScript4.push({ say: 'Number ' + (i + 41) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
  TF.listening.push({
    id: 'tf4-lr', set: 4, task: 'response', title: 'Choose a Response · Set 4',
    speakers: { A: { name: 'Speaker 1', accent: 'en-GB', gender: 'm' }, B: { name: 'Speaker 2', accent: 'en-US', gender: 'f' } },
    script: respScript4,
    groups: [mcq('Listen to each sentence and choose the best response.', RESP4.map((r, i) => ({ n: i + 41, q: 'Choose the best response to sentence ' + (i + 41) + '.', options: r.options, a: 0, cue: r.t, explain: r.explain })))],
  });

  TF.listening.push({
    id: 'tf4-lc1', set: 4, task: 'conversation', title: 'Getting Feedback on a Résumé',
    speakers: { S: { name: 'Student (Aisha)', accent: 'en-US', gender: 'f' }, C: { name: 'Career adviser', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to a conversation between a student and a career adviser.' }, { pause: 1 },
      { s: 'S', t: "Hi. I'm applying for a summer internship at an engineering firm, and I was hoping you could look at my résumé." },
      { s: 'C', t: "Of course. Let's see… Well, the layout is clear, but it's three pages long. For an internship, one page is usually best. Recruiters often spend less than a minute on each résumé." },
      { s: 'S', t: "Oh. I wasn't sure what to leave out." },
      { s: 'C', t: "I'd start with the list of high school awards. They're impressive, but they're quite old now. Your university project on solar panels is much more relevant to an engineering firm, so give that more space." },
      { s: 'S', t: "OK. Should I describe what I did on the project in detail?" },
      { s: 'C', t: "Yes, but focus on results. Instead of writing that you 'worked on' the panels, say what you achieved – for example, that your design improved efficiency by twelve percent. Numbers catch a recruiter's eye." },
      { s: 'S', t: "That makes sense. The deadline is next Friday. Could I bring you a new version on Wednesday?" },
      { s: 'C', t: "Sure. Book a slot online, and I'll check it again before you send it." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 41, q: 'Why does the student visit the career adviser?', options: ['To get advice on her résumé for an internship', 'To find out which companies offer internships', 'To ask about a job at the career center', 'To prepare for an interview next Friday'], a: 0, cue: 'look at my résumé',
        explain: "Aisha nói ngay từ đầu: cô nộp đơn thực tập mùa hè ở một công ty kỹ thuật và muốn cố vấn \"look at my résumé\" → xin góp ý cho bản lý lịch. Thứ Sáu tới là hạn nộp hồ sơ, không phải ngày phỏng vấn." },
      { n: 42, q: 'What does the adviser say about the length of the résumé?', options: ['It should be reduced to one page.', 'It should include more pages about awards.', 'Three pages is the usual length.', 'Length does not matter to recruiters.'], a: 0, cue: 'one page is usually best',
        explain: "Lý lịch dài ba trang, trong khi với hồ sơ thực tập \"one page is usually best\" vì nhà tuyển dụng chỉ đọc mỗi bản chưa tới một phút → nên rút xuống một trang." },
      { n: 43, q: 'Why does the adviser suggest removing the high school awards?', options: ['They are less relevant than her recent project.', 'They are not impressive enough.', 'Recruiters do not trust awards.', 'They are already listed on another page.'], a: 0, cue: 'much more relevant',
        explain: "Cố vấn nói các giải thưởng thời phổ thông \"impressive, but quite old\", còn dự án pin mặt trời ở đại học \"much more relevant to an engineering firm\" → nên bỏ giải thưởng cũ để nhường chỗ cho nội dung liên quan hơn. Ông không chê chúng kém ấn tượng." },
      { n: 44, q: 'Why does the adviser mention "twelve percent"?', options: ['To give an example of describing a measurable result', 'To show how much the firm pays interns', 'To explain how recruiters score résumés', 'To describe the cost of solar panels'], a: 0, cue: 'improved efficiency by twelve percent',
        explain: "Con số 12% là ví dụ minh họa cho lời khuyên \"focus on results\": thay vì viết chung chung \"worked on\", hãy nêu kết quả đo được vì \"Numbers catch a recruiter's eye\"." },
    ])],
  });
  TF.listening.push({
    id: 'tf4-lc2', set: 4, task: 'conversation', title: 'Changing a Research Paper Topic',
    speakers: { S: { name: 'Student (Ben)', accent: 'en-GB', gender: 'm' }, P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to a conversation between a student and a professor during office hours.' }, { pause: 1 },
      { s: 'S', t: "Professor Lin, do you have a minute? It's about my research paper on urban gardens." },
      { s: 'P', t: "Sure, Ben. How's it going?" },
      { s: 'S', t: "Not great, honestly. I wanted to interview people who run community gardens in the city, but most of them haven't replied to my emails. I'm thinking about changing my topic." },
      { s: 'P', t: "I understand, but you've already done a lot of reading. Before you change everything, have you tried visiting a garden in person? Many of the volunteers are there on Saturday mornings, and people are often happier to talk face to face than to answer an email from a stranger." },
      { s: 'S', t: "I hadn't thought of that. There's one near my apartment." },
      { s: 'P', t: "Good. And if you still can't get enough interviews, you could use the city's survey of community gardens. It was published last year, and it's in the library database. That way your paper would be based on published data instead of interviews." },
      { s: 'S', t: "That's a relief. So I don't have to start from scratch." },
      { s: 'P', t: "Exactly. Just send me a short note next week to let me know which approach you're taking." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 45, q: 'What problem does the student have?', options: ['People he wants to interview have not responded.', 'He cannot find any reading about his topic.', 'He missed the deadline for his paper.', 'The community garden near him has closed.'], a: 0, cue: "haven't replied to my emails",
        explain: "Ben muốn phỏng vấn người quản lý vườn cộng đồng nhưng \"most of them haven't replied to my emails\" → người cần phỏng vấn không phản hồi. Giáo sư còn nói cậu đã đọc tài liệu khá nhiều." },
      { n: 46, q: 'Why does the professor suggest visiting a garden on Saturday morning?', options: ['People may be more willing to talk in person.', 'The gardens are closed on weekdays.', 'She will be there to help him.', 'Saturday is the only day volunteers are paid.'], a: 0, cue: 'face to face',
        explain: "Tình nguyện viên thường có mặt sáng thứ Bảy và \"people are often happier to talk face to face than to answer an email from a stranger\" → gặp trực tiếp thì dễ được nhận lời hơn." },
      { n: 47, q: 'What does the professor say about the city survey?', options: ['It could replace the interviews as a source of data.', 'It is too old to be useful.', 'It is not available to students.', 'It must be included in every research paper.'], a: 0, cue: 'based on published data',
        explain: "Nếu vẫn không đủ người phỏng vấn, Ben có thể dùng khảo sát của thành phố (xuất bản năm ngoái, có trong cơ sở dữ liệu thư viện) để bài viết \"based on published data instead of interviews\" → thay thế cho phỏng vấn." },
      { n: 48, q: 'What does the student mean when he says, "So I don\'t have to start from scratch"?', options: ['He is glad he can keep the work he has already done.', 'He wants to choose a completely new topic.', 'He thinks the paper will take longer than expected.', 'He has not started any reading yet.'], a: 0, cue: 'start from scratch',
        explain: "\"start from scratch\" = làm lại từ đầu. Ben nhẹ nhõm (\"That's a relief\") vì không phải đổi đề tài, giữ được phần đã đọc và đã làm." },
    ])],
  });

  TF.listening.push({
    id: 'tf4-la1', set: 4, task: 'announcement', title: 'Fire Drill in the Residence Hall',
    speakers: { A: { name: 'Residence hall director', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to an announcement in a university residence hall.' }, { pause: 1 },
      { s: 'A', t: "Attention, residents. There will be a fire drill in this building tomorrow, Thursday, at some point between ten a.m. and noon. We don't announce the exact time, because the goal is to practise reacting to a real emergency." },
      { s: 'A', t: "When the alarm sounds, leave your room immediately and use the stairs, not the elevators. Please don't stop to collect your belongings. Close your door behind you, since a closed door slows the spread of smoke." },
      { s: 'A', t: "Once you're outside, go to the meeting point in the parking lot across the street and wait there until a staff member gives you permission to return. We'll take attendance, so please don't leave the area early." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 49, q: 'Why is the exact time of the drill not announced?', options: ['So that residents practise responding as in a real emergency', 'Because the staff have not decided on the time yet', 'Because the alarm system might not work', 'So that fewer residents leave the building'], a: 0, cue: 'practise reacting to a real emergency',
        explain: "\"We don't announce the exact time, because the goal is to practise reacting to a real emergency\" → không báo giờ chính xác để cư dân tập phản ứng như khi có sự cố thật." },
      { n: 50, q: 'Why should residents close their doors?', options: ['A closed door slows the spread of smoke.', 'It prevents things from being stolen.', 'Staff need to check which rooms are empty.', 'It keeps the stairs clear.'], a: 0, cue: 'slows the spread of smoke',
        explain: "\"Close your door behind you, since a closed door slows the spread of smoke\" → đóng cửa để làm chậm khói lan." },
      { n: 51, q: 'What must residents do at the meeting point?', options: ['Wait until a staff member allows them to go back', 'Collect their belongings from staff', 'Sign up for a fire safety course', 'Return to the building after ten minutes'], a: 0, cue: 'wait there until a staff member',
        explain: "Tại điểm tập trung phải \"wait there until a staff member gives you permission to return\" và không rời đi sớm vì sẽ điểm danh." },
    ])],
  });
  TF.listening.push({
    id: 'tf4-la2', set: 4, task: 'announcement', title: 'Guest Lecture Moved',
    speakers: { A: { name: 'Department assistant', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to an announcement at the beginning of a class.' }, { pause: 1 },
      { s: 'A', t: "Before your lecture starts, a quick update about Friday's guest talk by Dr. Emma Ruiz on ocean plastics. So many people have registered that we're moving it from Room 204 to the main auditorium in the Hartley Building. The time hasn't changed – it still starts at four." },
      { s: 'A', t: "Students in this course will receive extra credit for attending, but only if you scan your student card at the entrance. Unfortunately, we can't add your name afterwards." },
      { s: 'A', t: "The talk will also be recorded, and the video will be posted on the department website next week. However, watching the recording doesn't count for extra credit." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 52, q: 'Why has the guest lecture been moved?', options: ['More people signed up than the original room can hold.', 'Room 204 is being repaired.', 'The speaker asked for a larger screen.', 'The time of the lecture has changed.'], a: 0, cue: 'So many people have registered',
        explain: "\"So many people have registered that we're moving it… to the main auditorium\" → số người đăng ký vượt sức chứa phòng cũ. Giờ bắt đầu không đổi, vẫn 4 giờ." },
      { n: 53, q: 'What must students do to receive extra credit?', options: ['Scan their student card when they arrive', 'Register on the department website', 'Write a summary of the talk', 'Watch the recording next week'], a: 0, cue: 'scan your student card',
        explain: "Được cộng điểm \"only if you scan your student card at the entrance\" và không thể bổ sung tên sau → phải quét thẻ khi vào cửa. Xem video ghi lại thì không được cộng điểm." },
      { n: 54, q: 'What does the speaker imply about students who cannot attend on Friday?', options: ['They can watch the talk later but will not get extra credit.', 'They can attend a second talk next week.', 'They should ask Dr. Ruiz for her notes.', 'They will lose points in the course.'], a: 0, cue: 'recording doesn\'t count',
        explain: "Câu suy luận: bài nói được ghi hình và đăng lên web tuần sau, nhưng \"watching the recording doesn't count for extra credit\" → người vắng mặt vẫn xem lại được nhưng không được cộng điểm. Không có thông tin bị trừ điểm." },
    ])],
  });

  TF.listening.push({
    id: 'tf4-lt1', set: 4, task: 'talk', title: 'Geology: How Limestone Caves Form',
    speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to part of a talk in a geology class.' }, { pause: 1 },
      { s: 'P', t: "Last week we looked at how rivers shape valleys. Today we're going underground, to look at how most large caves form. And the surprising answer is that the main tool isn't rushing water cutting through rock. It's chemistry." },
      { s: 'P', t: "Most of the world's large caves form in limestone, a rock made mainly of a mineral called calcite. Now, rainwater picks up a small amount of carbon dioxide from the air, and even more from the soil it passes through. That makes the water slightly acidic – it contains a weak acid called carbonic acid. When this water seeps into cracks in limestone, it slowly dissolves the calcite." },
      { s: 'P', t: "Slowly is the key word. The cracks widen by perhaps a fraction of a millimeter a year. But over tens or hundreds of thousands of years, small cracks can become passages, and passages can become huge chambers." },
      { s: 'P', t: "Interestingly, the same chemistry also works in reverse. When water containing dissolved calcite drips from a cave ceiling, it releases some of its carbon dioxide into the cave air. As a result, it can't hold as much calcite, so a tiny amount is left behind. Drop by drop, this builds up formations hanging from the ceiling, called stalactites. Where the drops land on the floor, formations called stalagmites grow upward." },
      { s: 'P', t: "Because these formations grow in layers, a bit like tree rings, scientists can use them to study past climates. But please don't touch them if you visit a cave. Oils from human skin can stop the calcite from building up, and a formation that took thousands of years to grow can be damaged in seconds." },
    ],
    groups: [mcq('Answer the questions about the talk.', [
      { n: 55, q: 'What is the talk mainly about?', options: ['The chemical processes that form limestone caves and their features', 'How rivers cut deep valleys through rock', 'Why limestone is used as a building material', 'How to explore caves safely'], a: 0, cue: "It's chemistry",
        explain: "Câu hỏi ý chính: giáo sư giải thích hang lớn hình thành chủ yếu nhờ phản ứng hóa học (nước có tính axit hòa tan đá vôi) và cùng cơ chế đó tạo ra thạch nhũ, măng đá. Sông tạo thung lũng chỉ là bài tuần trước." },
      { n: 56, q: 'Why is rainwater able to dissolve limestone?', options: ['It becomes slightly acidic after taking in carbon dioxide.', 'It flows very fast through underground passages.', 'It contains small pieces of sand that wear away rock.', 'It becomes warm deep underground.'], a: 0, cue: 'carbonic acid',
        explain: "Nước mưa hấp thụ CO₂ từ không khí và nhất là từ đất, trở nên \"slightly acidic\" (chứa axit cacbonic yếu) nên hòa tan được canxit trong đá vôi. Giáo sư nhấn mạnh công cụ chính KHÔNG phải dòng nước chảy xiết." },
      { n: 57, q: 'Why does the professor say "Slowly is the key word"?', options: ['To stress that caves take a very long time to form', 'To warn students to move carefully in caves', 'To explain why caves are usually small', 'To suggest that the process has recently stopped'], a: 0, cue: 'fraction of a millimeter a year',
        explain: "Câu hỏi mục đích: sau câu này giáo sư nói khe nứt chỉ rộng thêm một phần nhỏ milimét mỗi năm, phải qua hàng chục, hàng trăm nghìn năm mới thành hang lớn → nhấn mạnh quá trình diễn ra rất lâu." },
      { n: 58, q: 'According to the professor, how do stalactites form?', options: ['Dripping water loses carbon dioxide and leaves calcite behind.', 'Acid in the water cuts holes in the cave ceiling.', 'Pieces of the ceiling break off and harden.', 'Plants on the surface push roots into the cave.'], a: 0, cue: 'releases some of its carbon dioxide',
        explain: "Nước nhỏ giọt từ trần hang \"releases some of its carbon dioxide\", không giữ được nhiều canxit nữa nên để lại một lượng nhỏ → tích tụ dần thành thạch nhũ treo trên trần. Đây là quá trình ngược với hòa tan." },
      { n: 59, q: 'Why does the professor compare cave formations to tree rings?', options: ['Both grow in layers that record information about the past.', 'Both grow at exactly the same speed.', 'Both are made of the same material.', 'Both are damaged by carbon dioxide.'], a: 0, cue: 'grow in layers',
        explain: "Măng đá, thạch nhũ \"grow in layers, a bit like tree rings\", nên các nhà khoa học dùng chúng để nghiên cứu khí hậu trong quá khứ → giống vòng gỗ ở chỗ phát triển theo lớp và lưu lại thông tin quá khứ." },
      { n: 60, q: 'Why does the professor ask students not to touch cave formations?', options: ['Oil from skin can stop them from growing.', 'They may contain harmful acid.', 'They are often too sharp to touch safely.', 'Touching them is illegal in most countries.'], a: 0, cue: 'Oils from human skin',
        explain: "\"Oils from human skin can stop the calcite from building up\" – dầu trên da ngăn canxit bám tiếp, nên một khối mất hàng nghìn năm để hình thành có thể bị hỏng trong vài giây." },
    ])],
  });
  TF.listening.push({
    id: 'tf4-lt2', set: 4, task: 'talk', title: 'History of Science: The Problem of Longitude',
    speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to part of a talk in a history of science class.' }, { pause: 1 },
      { s: 'P', t: "For centuries, sailors could find their latitude – how far north or south they were – fairly easily, by measuring the height of the sun or certain stars. But longitude, their east–west position, was a much harder problem, and mistakes could send a ship onto rocks." },
      { s: 'P', t: "The basic idea was actually simple. The Earth turns 360 degrees in 24 hours, so every hour of time difference equals 15 degrees of longitude. If a sailor knew the local time on the ship, from the position of the sun, and also the time at home port, the difference would show how far east or west the ship had travelled." },
      { s: 'P', t: "The difficulty was keeping the home-port time. Pendulum clocks, the most accurate clocks of the period, simply didn't work on a rolling ship. And changes in temperature and humidity made other clocks run fast or slow." },
      { s: 'P', t: "In 1714, the British government offered a large prize for a practical solution. Many experts expected the answer to come from astronomy, by observing the moon's position against the stars. But a self-taught clockmaker named John Harrison spent decades building sea clocks that could keep time accurately despite the movement of the ship. His most successful design was surprisingly small – about the size of a large pocket watch." },
      { s: 'P', t: "Harrison's clocks performed well in sea trials, but the officials who judged the prize were slow to accept a mechanical solution, and he received his money only in stages, late in his life. Eventually, though, marine clocks – called chronometers – became standard equipment on ships." },
    ],
    groups: [mcq('Answer the questions about the talk.', [
      { n: 61, q: 'What is the main topic of the talk?', options: ['How sailors solved the problem of finding longitude at sea', 'Why pendulum clocks were invented', 'How sailors measured latitude using the stars', 'The history of the British navy'], a: 0, cue: 'longitude',
        explain: "Câu hỏi ý chính: bài nói giải thích vì sao xác định kinh độ trên biển khó, nguyên lý dựa vào chênh lệch giờ, và chiếc đồng hồ đi biển của John Harrison đã giải quyết vấn đề ra sao. Vĩ độ chỉ được nhắc để so sánh." },
      { n: 62, q: 'According to the professor, what does a time difference of one hour represent?', options: ['15 degrees of longitude', '24 degrees of longitude', '360 degrees of latitude', '1 degree of latitude'], a: 0, cue: '15 degrees of longitude',
        explain: "Trái Đất quay 360 độ trong 24 giờ → 360 : 24 = 15, nên \"every hour of time difference equals 15 degrees of longitude\"." },
      { n: 63, q: 'Why does the professor mention pendulum clocks?', options: ['To show why accurate timekeeping at sea was difficult', 'To explain how Harrison designed his first clock', 'To describe how astronomers observed the moon', 'To argue that they were more accurate than chronometers'], a: 0, cue: "didn't work on a rolling ship",
        explain: "Câu hỏi mục đích: đồng hồ quả lắc là loại chính xác nhất thời đó nhưng \"didn't work on a rolling ship\" → minh họa vì sao giữ được giờ chính xác trên biển là việc rất khó." },
      { n: 64, q: 'What can be inferred about the officials who judged the prize?', options: ['They had expected a solution based on astronomy.', 'They designed sea clocks themselves.', 'They paid Harrison the full prize immediately.', 'They did not believe longitude was important.'], a: 0, cue: 'slow to accept a mechanical solution',
        explain: "Câu suy luận: nhiều chuyên gia \"expected the answer to come from astronomy\", và hội đồng \"slow to accept a mechanical solution\", chỉ trả tiền thưởng từng phần, muộn màng → suy ra họ đã kỳ vọng một giải pháp thiên văn học hơn là đồng hồ cơ." },
    ])],
  });

  /* ===================================================================
   * Xoay vị trí đáp án đúng (chỉ các unit của bộ 3 và 4): dữ liệu soạn với a = 0,
   * xoay theo mẫu cố định cho từng dạng bài → A/B/C/D phân bố đều.
   * Cờ _rot ngăn xoay lặp (data1/data2 cũng dùng cờ này).
   * =================================================================== */
  const PAT = [2, 0, 3, 1, 1, 3, 0, 2, 3, 2, 1, 0];
  const counter = {};
  [...TF.reading, ...TF.listening].filter(u => /^tf[34]-/.test(u.id)).forEach(u => (u.groups || []).forEach(gr => {
    if (gr.type !== 'mcq' || gr._rot) return; gr._rot = 1;
    gr.items.forEach(it => {
      const k = counter[u.task] = (counter[u.task] || 0) + 1;
      const n = it.options.length, want = PAT[(k - 1) % PAT.length] % n, r = (it.a - want + n) % n;
      if (r) { it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want; }
    });
  }));
})(typeof self !== 'undefined' ? self : this);
