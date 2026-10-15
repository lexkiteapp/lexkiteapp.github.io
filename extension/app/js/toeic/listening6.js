/* TOEIC Listening – Test 6 (tự biên soạn) */
(function (g) {
  const T = g.TOEIC = g.TOEIC || { reading: [], listening: [] };
  if (!T.listening) T.listening = [];

  /* ---------------- Part 1: Photographs (Q1–6) ---------------- */
  // Ảnh CC0/public domain (web/img/toeic/CREDITS.md). Phương án KHÔNG xoay (photo: true) vì audio đọc sẵn (A)–(D).
  const P1 = [
    { n: 1, img: 'img/toeic/t6-p1-1.jpg', a: 0,
      s: ['Some flowers are on display.', 'A florist is wrapping a bouquet.', 'Some flowers are being watered.', 'Some plants are being planted in a garden.'],
      explain: 'Ảnh: trước một cửa hàng hoa, nhiều xô hoa cúc vàng, tím và hoa tulip được bày bán, có thẻ ghi tên và giá. (A) đúng: "on display" = được trưng bày. (B) không thấy người bán hoa nào đang gói bó hoa. (C) không ai đang tưới hoa. (D) hoa cắm trong xô, không phải đang được trồng trong vườn.' },
    { n: 2, img: 'img/toeic/t6-p1-2.jpg', a: 2,
      s: ['A man is repairing a flat tire.', 'Some cars are stopped at a traffic light.', 'A man is carrying a bag on his back.', 'A man is crossing the street on foot.'],
      explain: 'Ảnh: một người giao đồ ăn đội mũ lưỡi trai, đeo thùng giao hàng màu vàng sau lưng, đang ngồi trên xe đạp điện ở góc phố. (C) đúng: "carrying a bag on his back" = đeo túi sau lưng. (A) không ai đang sửa lốp xe. (B) không thấy hàng xe dừng ở đèn giao thông. (D) anh ấy đang ngồi trên xe, không đi bộ qua đường ("on foot").' },
    { n: 3, img: 'img/toeic/t6-p1-3.jpg', a: 1,
      s: ['Some boats are sailing out to sea.', 'Some fishing nets are piled on the ground.', 'Some people are swimming in a river.', 'Some men are hanging nets on a fence.'],
      explain: 'Ảnh: dưới một mái che, vài người đàn ông đang gỡ và vá lưới đánh cá; lưới trắng và lưới xanh chất thành đống trên mặt đất. (B) đúng: "piled on the ground" = chất đống trên mặt đất. (A) không có con thuyền nào. (C) không ai đang bơi. (D) lưới nằm dưới đất, không ai treo lưới lên hàng rào.' },
    { n: 4, img: 'img/toeic/t6-p1-4.jpg', a: 3,
      s: ['A car is being driven out of a garage.', 'A man is lying under a vehicle.', 'Some tires are stacked in a corner.', 'A man is kneeling beside a car.'],
      explain: 'Ảnh: trong xưởng sửa ô tô, một người mặc áo đỏ đang quỳ cạnh chiếc xe cũ đã tháo cửa để sửa chữa; xung quanh là dụng cụ, dây điện và kệ chứa hộp sơn. (D) đúng: "kneeling beside a car" = quỳ cạnh xe. (A) xe đang được sửa, không ai lái ra khỏi xưởng. (B) bẫy tư thế: anh ấy quỳ, không nằm dưới gầm xe. (C) không thấy lốp xe xếp chồng ở góc.' },
    { n: 5, img: 'img/toeic/t6-p1-5.jpg', a: 1,
      s: ['A scientist is examining a sample.', 'Some containers have been arranged in a row.', 'Some plants are being watered in a garden.', 'Some glasses are being washed in a sink.'],
      explain: 'Ảnh: trong phòng thí nghiệm, một dãy bình thủy tinh chứa cây non được đặt thẳng hàng trên giá kim loại. (B) đúng: "arranged in a row" = xếp thành một hàng. (A) không có nhà khoa học nào trong ảnh. (C) có cây nhưng đặt trong bình thí nghiệm, không phải ở vườn, và không ai tưới. (D) bình thủy tinh đặt trên giá, không ai rửa trong bồn.' },
    { n: 6, img: 'img/toeic/t6-p1-6.jpg', a: 2,
      s: ['Some children are climbing a tree.', 'Two people are sitting under a tree.', 'Two people are walking along a path.', 'Some leaves are being raked into a pile.'],
      explain: 'Ảnh: hai đứa trẻ đi bộ cạnh nhau trên con đường đất xuyên qua khu rừng, hai bên có nhiều cây lớn. (C) đúng: "walking along a path" = đi dọc con đường. (A) không ai đang trèo cây. (B) hai người đang đi, không ngồi. (D) không ai đang cào lá.' },
  ];
  const p1script = [
    { say: 'Part 1. For each question in this part, you will look at a photograph and hear four short statements. The statements are read only once and are not printed. Choose the statement that best describes the photograph.' }, { pause: 3 },
  ];
  P1.forEach(it => {
    p1script.push({ say: 'Number ' + it.n + '. Look at the photograph for number ' + it.n + '.' }); p1script.push({ pause: 1 });
    it.s.forEach((txt, i) => p1script.push({ s: 'N', t: '(' + 'ABCD'[i] + ') ' + txt }));
    p1script.push({ pause: 3 });
  });

  T.listening.push({
    id: 'tl6p1', test: 6, part: 1, title: 'Photographs', titleVi: 'Mô tả tranh',
    speakers: { N: { name: 'Narrator', accent: 'en-US', gender: 'm' } },
    script: p1script,
    groups: [
      { type: 'mcq', photo: true, instr: 'Look at the photograph and choose the statement that best describes it (A, B, C or D).',
        items: P1.map(it => ({ n: it.n, img: it.img, q: '', options: it.s, a: it.a, cue: it.s[it.a], explain: it.explain })) },
    ],
    vocab: [
      { w: 'on display', vi: 'được trưng bày' },
      { w: 'florist', vi: 'người bán hoa' },
      { w: 'pile', vi: 'chất đống' },
      { w: 'kneel', vi: 'quỳ' },
      { w: 'in a row', vi: 'thành một hàng' },
      { w: 'walk along', vi: 'đi dọc theo' },
    ],
  });

  /* ---------------- Part 2: Question–Response (Q7–21) ---------------- */
  const P2 = [
    { n: 7, qs: 'A', rs: 'B', q: 'What time is checkout on Sunday?',
      r: ['Noon, but you can request a later time.', 'Please check the receipt.', 'Room four twelve.'], a: 0,
      explain: 'Câu hỏi "What time" (mấy giờ) → nêu giờ: "Noon, but you can request a later time" (12 giờ trưa, nhưng quý khách có thể xin trả phòng muộn hơn). "Please check the receipt" bẫy âm "checkout" – "check". "Room four twelve" trả lời số phòng, không phải giờ.' },
    { n: 8, qs: 'B', rs: 'C', q: 'Where should I put these new display shelves?',
      r: ["They're on sale this week.", 'Next to the checkout counters.', 'I bought one yesterday.'], a: 1,
      explain: 'Câu hỏi "Where" (ở đâu) → nêu vị trí: "Next to the checkout counters" (cạnh các quầy thanh toán). "They\'re on sale this week" chỉ liên tưởng đến hàng hóa trong cửa hàng. "I bought one yesterday" không trả lời vị trí.' },
    { n: 9, qs: 'C', rs: 'A', q: 'Who approved the overtime for the weekend shift?',
      r: ['Over the weekend.', 'About twelve hours.', 'The plant manager did.'], a: 2,
      explain: 'Câu hỏi "Who" (ai) → chỉ ra người: "The plant manager did" (quản lý nhà máy đã duyệt). "Over the weekend" lặp từ "weekend" và bẫy âm "overtime" – "over". "About twelve hours" trả lời khoảng thời gian (How long).' },
    { n: 10, qs: 'D', rs: 'B', q: 'Why is the bank closing early today?',
      r: ['For staff training this afternoon.', 'Close the door, please.', "I'd like to open an account."], a: 0,
      explain: 'Câu hỏi "Why" (tại sao) → nêu lý do: "For staff training this afternoon" (để đào tạo nhân viên chiều nay). "Close the door, please" bẫy âm "closing" – "close" (đóng cửa). "I\'d like to open an account" chỉ liên tưởng đến ngân hàng.' },
    { n: 11, qs: 'A', rs: 'D', q: 'Would you prefer a room with a garden view or a city view?',
      r: ['The garden center opens at nine.', 'Whichever is quieter.', 'I reviewed it yesterday.'], a: 1,
      explain: 'Câu hỏi lựa chọn "A or B?" → "Whichever is quieter" (phòng nào yên tĩnh hơn cũng được) là câu trả lời tự nhiên, không nhất thiết chọn hẳn A hay B. "The garden center opens at nine" lặp từ "garden". "I reviewed it yesterday" bẫy âm "view" – "reviewed".' },
    { n: 12, qs: 'B', rs: 'A', q: 'How often is the packaging machinery inspected?',
      r: ['By a certified technician.', 'In the main factory.', 'Every six months.'], a: 2,
      explain: '"How often" hỏi tần suất → "Every six months" (sáu tháng một lần). "By a certified technician" trả lời ai kiểm tra (By whom). "In the main factory" trả lời địa điểm (Where).' },
    { n: 13, qs: 'C', rs: 'D', q: "Didn't the new Fernwood store open last weekend?",
      r: ['The store sells shoes.', "No, it's been postponed until May.", 'Please open the window.'], a: 1,
      explain: 'Câu hỏi phủ định "Didn\'t … open?" (cửa hàng mới chẳng phải đã khai trương cuối tuần trước sao?) → "No, it\'s been postponed until May" (chưa, đã hoãn đến tháng 5). "The store sells shoes" lặp từ "store". "Please open the window" lặp từ "open" với nghĩa mở cửa sổ.' },
    { n: 14, qs: 'D', rs: 'C', q: 'The cash machine in the lobby is out of order again.',
      r: ['In alphabetical order.', "I'll put up a sign and call the repair company.", 'Some cash and a credit card.'], a: 1,
      explain: 'Câu trần thuật nêu sự cố (máy rút tiền ở sảnh lại hỏng) → đáp lại bằng hành động xử lý: "I\'ll put up a sign and call the repair company" (tôi sẽ dán biển báo và gọi công ty sửa chữa). "In alphabetical order" bẫy từ "order" (out of order = hỏng; in order = theo thứ tự). "Some cash and a credit card" lặp từ "cash".' },
    { n: 15, qs: 'A', rs: 'C', q: 'Are the safety goggles in the supply room?',
      r: ['Our goals for this quarter.', 'Safety is very important.', 'I saw a box of them on the top shelf.'], a: 2,
      explain: 'Câu hỏi Yes/No → trả lời gián tiếp: "I saw a box of them on the top shelf" (tôi thấy một hộp trên kệ trên cùng – tức là có). "Our goals for this quarter" bẫy âm "goggles" – "goals". "Safety is very important" lặp từ "safety" nhưng không trả lời câu hỏi.' },
    { n: 16, qs: 'B', rs: 'D', q: 'Could you help me carry these boxes to the stockroom?',
      r: ['Stock prices went up.', 'They carry a large selection.', 'Sure, where do you want them?'], a: 2,
      explain: 'Lời nhờ vả "Could you help me…?" → đồng ý: "Sure, where do you want them?" (được thôi, anh muốn để chúng ở đâu?). "Stock prices went up" bẫy âm "stockroom" – "stock" (cổ phiếu). "They carry a large selection" lặp từ "carry" với nghĩa "bày bán".' },
    { n: 17, qs: 'C', rs: 'B', q: 'Which loan option did the client decide on?',
      r: ["She's on the phone right now.", 'The one with lower monthly payments.', 'Alone, I think.'], a: 1,
      explain: '"Which loan option" (phương án vay nào) → "The one with lower monthly payments" (phương án có khoản trả hằng tháng thấp hơn; "the one" = the option). "She\'s on the phone right now" chỉ nói về khách hàng. "Alone, I think" bẫy âm "loan" – "alone".' },
    { n: 18, qs: 'D', rs: 'A', q: "Why don't we offer guests a free shuttle to the convention center?",
      r: ['Because it was crowded.', 'In the center of town.', "Good idea. Let's check the cost first."], a: 2,
      explain: '"Why don\'t we…?" là lời ĐỀ NGHỊ (sao ta không đưa đón khách miễn phí đến trung tâm hội nghị?) → hưởng ứng: "Good idea. Let\'s check the cost first" (ý hay, kiểm tra chi phí trước đã). "Because it was crowded" là bẫy trả lời "Why" bằng "Because". "In the center of town" lặp từ "center".' },
    { n: 19, qs: 'A', rs: 'B', q: "You've received the updated production schedule, haven't you?",
      r: ['I updated my phone.', 'Yes, it arrived this morning.', 'The schedule is in production.'], a: 1,
      explain: 'Câu hỏi đuôi "…, haven\'t you?" (anh đã nhận lịch sản xuất mới rồi phải không?) → "Yes, it arrived this morning" (rồi, sáng nay tôi nhận được). "I updated my phone" bẫy âm "updated". "The schedule is in production" lặp từ "schedule", "production" nhưng vô nghĩa.' },
    { n: 20, qs: 'B', rs: 'C', q: "I'd like to open a savings account for my daughter.",
      r: ['Certainly. Is she here with you today?', 'She saved the file.', 'It opens at nine.'], a: 0,
      explain: 'Câu trần thuật nêu yêu cầu (muốn mở tài khoản tiết kiệm cho con gái) → nhân viên đáp lại và hỏi thêm thông tin: "Certainly. Is she here with you today?" (vâng, hôm nay cháu có đi cùng không ạ?). "She saved the file" bẫy âm "savings" – "saved". "It opens at nine" lặp từ "open" với nghĩa giờ mở cửa.' },
    { n: 21, qs: 'C', rs: 'A', q: "How was the turnout at the store's anniversary sale?",
      r: ['Turn left at the corner.', 'Every year in June.', 'We had record crowds.'], a: 2,
      explain: '"How was the turnout…?" hỏi số người đến dự → "We had record crowds" (lượng khách đông kỷ lục). "Turn left at the corner" bẫy âm "turnout" – "turn". "Every year in June" chỉ liên tưởng đến "anniversary" (dịp kỷ niệm hằng năm).' },
  ];
  const p2script = [
    { say: 'Part 2. In this part, you will hear a question or a statement, followed by three spoken responses. Choose the best response. The responses are not printed in your test book.' }, { pause: 3 },
  ];
  P2.forEach(it => {
    p2script.push({ say: 'Number ' + it.n + '.' });
    p2script.push({ s: it.qs, t: it.q });
    it.r.forEach((txt, i) => p2script.push({ s: it.rs, t: 'ABC'[i] + '. ' + txt }));
    p2script.push({ pause: 2 });
  });

  T.listening.push({
    id: 'tl6p2', test: 6, part: 2, title: 'Question–Response', titleVi: 'Hỏi – đáp',
    speakers: {
      A: { name: 'Graeme', accent: 'en-GB', gender: 'm' },
      B: { name: 'Paloma', accent: 'en-US', gender: 'f' },
      C: { name: 'Declan', accent: 'en-AU', gender: 'm' },
      D: { name: 'Fenella', accent: 'en-GB', gender: 'f' },
    },
    script: p2script,
    groups: [
      { type: 'mcq', instr: 'Listen and choose the best response (A, B or C).',
        items: P2.map(it => ({ n: it.n, q: 'Mark your answer.', options: ['A', 'B', 'C'], a: it.a, cue: it.r[it.a], explain: it.explain })) },
    ],
    vocab: [
      { w: 'checkout', vi: 'việc trả phòng (khách sạn)' },
      { w: 'overtime', vi: 'giờ làm thêm' },
      { w: 'out of order', vi: '(máy móc) bị hỏng' },
      { w: 'safety goggles', vi: 'kính bảo hộ' },
      { w: 'stockroom', vi: 'kho hàng (của cửa hàng)' },
      { w: 'turnout', vi: 'số người tham dự' },
    ],
  });

  /* ---------------- Part 3: Conversations (Q32–46) ---------------- */
  T.listening.push({
    id: 'tl6p3', test: 6, part: 3, title: 'Conversations', titleVi: 'Hội thoại',
    speakers: {
      M1: { name: 'Nolan', accent: 'en-US', gender: 'm' },
      W1: { name: 'Beatrix', accent: 'en-GB', gender: 'f' },
      M2: { name: 'Kofi', accent: 'en-GB', gender: 'm' },
      W2: { name: 'Annette', accent: 'en-US', gender: 'f' },
      M3: { name: 'Jovan', accent: 'en-AU', gender: 'm' },
      W3: { name: 'Leonie', accent: 'en-AU', gender: 'f' },
      M4: { name: 'Ewan', accent: 'en-GB', gender: 'm' },
      M5: { name: 'Tristan', accent: 'en-US', gender: 'm' },
      W4: { name: 'Yasmin', accent: 'en-GB', gender: 'f' },
      W5: { name: 'Philippa', accent: 'en-AU', gender: 'f' },
      W6: { name: 'Clarissa', accent: 'en-US', gender: 'f' },
      M6: { name: 'Gideon', accent: 'en-AU', gender: 'm' },
    },
    script: [
      { say: 'Part 3. In this part, you will hear several conversations between two or more people. After each conversation, answer the three questions printed in your test book.' }, { pause: 3 },

      { say: 'Questions 32 through 34 refer to the following conversation.' }, { pause: 1 },
      { s: 'M1', t: "Good morning. I'm checking out of room six oh eight, but my flight doesn't leave until nine tonight. Is there somewhere I can leave my suitcases?" },
      { s: 'W1', t: "Of course. We can keep them in our luggage room behind the front desk. I'll give you a claim ticket, and you can pick them up any time today." },
      { s: 'M1', t: "Thanks. Also, I noticed a charge on my bill for the minibar, but I didn't take anything from it." },
      { s: 'W1', t: "I'm sorry about that. Let me take a look. Yes, it seems it was entered by mistake. I've removed it from your bill." },
      { s: 'M1', t: 'Great. And what is the best way to get to the airport this evening?' },
      { s: 'W1', t: "Our airport shuttle leaves from the main entrance every hour, on the hour. It's twelve dollars, and you can buy a ticket right here at the desk." },
      { pause: 6 },

      { say: 'Questions 35 through 37 refer to the following conversation with three speakers.' }, { pause: 1 },
      { s: 'W2', t: "Kofi, Jovan, thanks for coming. I wanted to talk about the new self-checkout machines at the Harwick Road store. They've been in place for a month now. How are customers reacting?" },
      { s: 'M2', t: "Honestly, it's mixed. Younger shoppers love them, but a lot of our regular customers find the screens confusing, and they end up waiting in line for a cashier anyway." },
      { s: 'M3', t: "I've noticed the same thing. What if we assigned one employee to stand near the machines during busy hours? They could show people how to use them." },
      { s: 'W2', t: "That's a good idea, and it shouldn't cost much. Jovan, could you put together a staff schedule for that?" },
      { s: 'M3', t: "Sure. I'll have it ready by Friday." },
      { s: 'W2', t: "Thanks. And I'll mention the confusing screens to the head office. Maybe the manufacturer can make the instructions clearer." },
      { pause: 6 },

      { say: 'Questions 38 through 40 refer to the following conversation.' }, { pause: 1 },
      { s: 'W3', t: 'Ewan, I just checked the samples from machine three. About ten percent of the bottle caps are too tight to screw onto the bottles.' },
      { s: 'M4', t: "That's strange. Machine three was serviced only last month." },
      { s: 'W3', t: 'The mold looks worn, though. I think it needs to be replaced.' },
      { s: 'M4', t: "We've got a truck coming at four o'clock to pick up the Danvers order." },
      { s: 'W3', t: 'I know. But machines one and two are running fine. If we move the remaining work to them, we can still finish on time.' },
      { s: 'M4', t: "Let's do that. I'll call the maintenance team right now and ask them to bring a spare mold this afternoon." },
      { pause: 6 },

      { say: 'Questions 41 through 43 refer to the following conversation with three speakers.' }, { pause: 1 },
      { s: 'M5', t: "Yasmin, Philippa, as you know, our updated mobile banking app launches on the first of next month. I'd like our branch to help customers get comfortable with it." },
      { s: 'W4', t: "Many of our older customers have told me they find banking apps confusing. What if we held a free workshop here at the branch?" },
      { s: 'M5', t: 'I like that. We could run it on a Saturday morning, before the branch opens.' },
      { s: 'W5', t: 'I can lead it. I helped test the new app last month, so I already know all the features.' },
      { s: 'M5', t: 'Wonderful. Yasmin, could you design a flyer that we can hand out at the counters?' },
      { s: 'W4', t: "Sure. I'll have a draft for you by Thursday." },
      { pause: 6 },

      { say: 'Questions 44 through 46 refer to the following conversation.' }, { pause: 1 },
      { s: 'W6', t: "Hello. I'm calling from Halvard Architects. We'd like to book your private dining room for a retirement dinner on Friday the twelfth, for about twenty-five guests." },
      { s: 'M6', t: "Let me check. I'm afraid the private room is already reserved that evening. It is available on Saturday the thirteenth, though." },
      { s: 'W6', t: 'Hmm, Saturday might actually work better, since several of our staff travel on Fridays. But I need to check with my manager first.' },
      { s: 'M6', t: "No problem. I can hold the room for you until noon tomorrow. I should also mention that for groups of more than twenty, we ask guests to choose from a set menu." },
      { s: 'W6', t: 'Could you e-mail me a copy of the set menu? I would like to show it to my manager.' },
      { s: 'M6', t: "Certainly. What's your e-mail address?" },
      { pause: 6 },
    ],
    groups: [
      { type: 'mcq', instr: 'Questions 32–34. Choose the best answer (A, B, C or D).',
        items: [
          { n: 32, q: 'What does the man ask about?', options: ['Changing his flight', 'Extending his stay', 'Storing his luggage', 'Upgrading his room'], a: 2, cue: 'Is there somewhere I can leave my suitcases?',
            explain: 'Anh trả phòng nhưng tối mới bay nên hỏi "Is there somewhere I can leave my suitcases?" (có chỗ nào để gửi vali không?) → gửi hành lý. Chuyến bay vẫn giữ nguyên lúc 9 giờ tối; anh không xin ở thêm hay nâng hạng phòng.' },
          { n: 33, q: 'What problem does the man mention?', options: ['His room was not cleaned.', 'The minibar was empty.', 'His claim ticket is missing.', 'He was charged for something he did not use.'], a: 3, cue: "I noticed a charge on my bill for the minibar, but I didn't take anything from it",
            explain: '"a charge on my bill for the minibar, but I didn\'t take anything from it" (hóa đơn tính tiền minibar nhưng tôi không lấy gì) → bị tính phí cho thứ không dùng. "minibar" xuất hiện nhưng không ai nói nó trống; vé gửi đồ là thứ lễ tân sẽ đưa, không bị mất.' },
          { n: 34, q: 'What does the woman say about the airport shuttle?', options: ['It is free for hotel guests.', 'It must be booked a day in advance.', 'It leaves from a parking garage.', 'Tickets can be bought at the front desk.'], a: 3, cue: 'you can buy a ticket right here at the desk',
            explain: 'Xe đưa đón chạy mỗi giờ từ lối vào chính, giá 12 đô la và "you can buy a ticket right here at the desk" → mua vé ngay tại quầy lễ tân. Xe có thu phí (không miễn phí), khởi hành từ lối vào chính chứ không phải bãi đỗ xe.' },
        ] },
      { type: 'mcq', instr: 'Questions 35–37. Choose the best answer (A, B, C or D).',
        items: [
          { n: 35, q: 'What are the speakers mainly discussing?', options: ['A cashier training program', 'The opening of a new store', 'A decline in sales', 'Customer reactions to new machines'], a: 3, cue: 'How are customers reacting?',
            explain: 'Annette hỏi về máy tự thanh toán mới ở cửa hàng Harwick Road: "How are customers reacting?" và cả nhóm bàn về phản ứng của khách → phản ứng của khách hàng với máy mới. Cửa hàng đã có sẵn, không phải khai trương; không ai nhắc đến doanh số giảm.' },
          { n: 36, q: 'What does Jovan suggest?', options: ['Removing the machines', 'Hiring more cashiers', 'Assigning an employee to help customers', 'Extending the store hours'], a: 2, cue: 'What if we assigned one employee to stand near the machines during busy hours?',
            explain: 'Jovan đề xuất "assigned one employee to stand near the machines during busy hours" để hướng dẫn khách → bố trí một nhân viên hỗ trợ khách hàng. Việc phân công nhân viên hiện có không phải tuyển thêm thu ngân; không ai đề nghị bỏ máy.' },
          { n: 37, q: 'What does the woman say she will do?', options: ['Contact the head office', 'Prepare a staff schedule', 'Visit the Harwick Road store', 'Test the machines herself'], a: 0, cue: "I'll mention the confusing screens to the head office",
            explain: '"I\'ll mention the confusing screens to the head office" → cô sẽ báo với trụ sở chính về màn hình khó hiểu. Người lập lịch làm việc cho nhân viên là Jovan (hạn thứ Sáu) – bẫy cho phương án "Prepare a staff schedule".' },
        ] },
      { type: 'mcq', instr: 'Questions 38–40. Choose the best answer (A, B, C or D).',
        items: [
          { n: 38, q: 'Where do the speakers most likely work?', options: ['At a delivery company', 'At a repair shop', 'At a beverage store', 'At a manufacturing plant'], a: 3, cue: 'I just checked the samples from machine three',
            explain: 'Các chi tiết "samples from machine three" (mẫu từ máy số ba), "bottle caps" (nắp chai), "mold" (khuôn), "maintenance team" → họ làm ở nhà máy sản xuất. Xe tải chỉ đến lấy đơn hàng – bẫy cho "delivery company".' },
          { n: 39, q: 'Why does the man say, "We\'ve got a truck coming at four o\'clock"?', options: ['To ask for help unloading', 'To explain why he must leave early', 'To point out that an order must be ready soon', 'To suggest changing the delivery company'], a: 2, cue: "We've got a truck coming at four o'clock to pick up the Danvers order.",
            explain: 'Khi biết phải thay khuôn máy số ba, Ewan nhắc xe tải sẽ đến lúc 4 giờ để lấy đơn hàng Danvers → nhấn mạnh rằng đơn hàng phải sẵn sàng sớm, thời gian rất gấp; người phụ nữ đáp "I know" rồi đề xuất cách vẫn kịp tiến độ. Không ai nói đến việc dỡ hàng, về sớm hay đổi đơn vị vận chuyển.' },
          { n: 40, q: 'What will the man do next?', options: ['Inspect machine one', 'Call the maintenance team', 'Repair a mold himself', 'Contact a customer'], a: 1, cue: "I'll call the maintenance team right now and ask them to bring a spare mold",
            explain: '"I\'ll call the maintenance team right now and ask them to bring a spare mold" → gọi cho đội bảo trì. Máy một và hai đang chạy tốt nên không cần kiểm tra; anh không tự sửa khuôn hay liên hệ khách hàng Danvers.' },
        ] },
      { type: 'mcq', instr: 'Questions 41–43. Choose the best answer (A, B, C or D).',
        items: [
          { n: 41, q: 'What will happen next month?', options: ['A new branch will open.', 'An updated app will be released.', 'Branch hours will change.', 'A new manager will start.'], a: 1, cue: 'our updated mobile banking app launches on the first of next month',
            explain: '"our updated mobile banking app launches on the first of next month" (ứng dụng ngân hàng di động bản cập nhật ra mắt ngày mùng một tháng sau) → một ứng dụng được cập nhật sẽ phát hành. Buổi hội thảo tổ chức trước giờ mở cửa sáng thứ Bảy, giờ làm việc của chi nhánh không đổi.' },
          { n: 42, q: 'Why does Philippa say she can lead the workshop?', options: ['She designed the app.', 'She has taught classes before.', 'She works on Saturdays.', 'She helped test the app.'], a: 3, cue: 'I helped test the new app last month',
            explain: 'Philippa nói "I helped test the new app last month, so I already know all the features" → cô từng tham gia thử nghiệm ứng dụng nên nắm rõ các tính năng. Cô không thiết kế ứng dụng; kinh nghiệm dạy học hay lịch làm thứ Bảy không được nhắc đến.' },
          { n: 43, q: 'What is Yasmin asked to do?', options: ['Create a flyer', 'Call some customers', 'Book a meeting room', 'Write a user guide'], a: 0, cue: 'Yasmin, could you design a flyer that we can hand out at the counters?',
            explain: 'Tristan nhờ "Yasmin, could you design a flyer that we can hand out at the counters?" (thiết kế tờ rơi phát tại quầy) → tạo tờ rơi; cô hứa gửi bản nháp trước thứ Năm. Hướng dẫn sử dụng hay gọi điện cho khách không được nhắc đến.' },
        ] },
      { type: 'mcq', instr: 'Questions 44–46. Choose the best answer (A, B, C or D).',
        items: [
          { n: 44, q: 'What event is the woman planning?', options: ['A product launch', 'An awards ceremony', 'A client meeting', 'A retirement dinner'], a: 3, cue: 'book your private dining room for a retirement dinner',
            explain: 'Cô muốn đặt phòng ăn riêng "for a retirement dinner" (tiệc chia tay nghỉ hưu) cho khoảng 25 khách. Halvard Architects là công ty nơi cô làm việc, không có sự kiện ra mắt sản phẩm hay trao giải.' },
          { n: 45, q: 'What does the man offer to do?', options: ['Hold a reservation until tomorrow', 'Reduce the price of a meal', 'Open the room on Friday', 'Add more guests to a booking'], a: 0, cue: 'I can hold the room for you until noon tomorrow',
            explain: '"I can hold the room for you until noon tomorrow" (tôi có thể giữ phòng cho chị đến trưa mai) → giữ chỗ đến ngày mai. Phòng tối thứ Sáu đã có người đặt nên không thể mở; không có giảm giá.' },
          { n: 46, q: 'What does the woman request?', options: ['Directions to the restaurant', 'A list of available dates', 'A menu sent by e-mail', 'A discount for a large group'], a: 2, cue: 'Could you e-mail me a copy of the set menu?',
            explain: '"Could you e-mail me a copy of the set menu?" → cô đề nghị gửi thực đơn cố định qua email để cho quản lý xem. Ngày trống (thứ Bảy 13) đã được nhân viên cho biết; cô không hỏi đường hay xin giảm giá.' },
        ] },
    ],
    vocab: [
      { w: 'claim ticket', vi: 'phiếu nhận lại đồ (gửi hành lý)' },
      { w: 'minibar', vi: 'tủ lạnh nhỏ đựng đồ uống trong phòng khách sạn' },
      { w: 'self-checkout machine', vi: 'máy tự thanh toán' },
      { w: 'mold', vi: 'khuôn đúc' },
      { w: 'spare', vi: '(đồ) dự phòng' },
      { w: 'flyer', vi: 'tờ rơi quảng cáo' },
      { w: 'set menu', vi: 'thực đơn cố định (theo suất)' },
      { w: 'retirement dinner', vi: 'tiệc chia tay người nghỉ hưu' },
    ],
  });

  /* ---------------- Part 4: Talks (Q71–82) ---------------- */
  T.listening.push({
    id: 'tl6p4', test: 6, part: 4, title: 'Talks', titleVi: 'Bài nói ngắn',
    speakers: {
      A: { name: 'Announcer', accent: 'en-US', gender: 'f' },
      B: { name: 'Dorian', accent: 'en-GB', gender: 'm' },
      C: { name: 'Guide', accent: 'en-AU', gender: 'f' },
      D: { name: 'Manager', accent: 'en-US', gender: 'm' },
    },
    script: [
      { say: 'Part 4. In this part, you will hear several short talks given by a single speaker. After each talk, answer the three questions printed in your test book.' }, { pause: 3 },

      { say: 'Questions 71 through 73 refer to the following announcement.' }, { pause: 1 },
      { s: 'A', t: "Good afternoon, shoppers, and thank you for visiting Garrick's Department Store." },
      { s: 'A', t: 'For the next two hours only, all outdoor furniture on our third floor is thirty percent off. That includes patio tables, garden chairs, and sun umbrellas.' },
      { s: 'A', t: "If you're a member of our Garrick's Rewards program, there's even more good news. Members receive free home delivery on any furniture purchase today." },
      { s: 'A', t: 'Not a member yet? You can sign up in just a few minutes at the customer service desk near the main entrance.' },
      { s: 'A', t: 'Happy shopping, and enjoy the rest of your afternoon.' },
      { pause: 6 },

      { say: 'Questions 74 through 76 refer to the following telephone message.' }, { pause: 1 },
      { s: 'B', t: "Hello, Ms. Okwuosa. This is Dorian Pike, a loan officer at Westcliff Bank. I'm calling about your application for a small business loan to buy new printing equipment for your shop." },
      { s: 'B', t: "I'm pleased to tell you that our review committee has given your application initial approval. Before we can release the funds, though, I still need a copy of your business's tax return from last year." },
      { s: 'B', t: "You mentioned that your equipment supplier needs payment by the end of the month. That doesn't leave us much time." },
      { s: 'B', t: 'So, if you could upload the document through our secure Web portal by Wednesday, I can have the money in your account by Friday.' },
      { s: 'B', t: 'If you have any questions, please call me at five five five, oh one six two. Thank you.' },
      { pause: 6 },

      { say: 'Questions 77 through 79 refer to the following talk.' }, { pause: 1 },
      { s: 'C', t: "Welcome to Larkfield Glassworks, everyone. I'm Ruth, and I'll be your guide for this morning's factory tour." },
      { s: 'C', t: "We'll begin in the furnace hall, where our glassblowers shape every vase and bowl by hand. It gets very hot in there, so please stay behind the yellow line at all times." },
      { s: 'C', t: "After that, we'll visit our design studio. Please note that photography is not allowed in the studio, because many of the pieces you'll see there haven't been released yet." },
      { s: 'C', t: "The tour ends in our showroom, where each of you will receive a voucher for twenty percent off any purchase in our gift shop." },
      { s: 'C', t: "All right, if everyone is ready, please follow me." },
      { pause: 6 },

      { say: 'Questions 80 through 82 refer to the following excerpt from a meeting.' }, { pause: 1 },
      { s: 'D', t: "Good morning, everyone. Before we start our shifts, I have a few updates." },
      { s: 'D', t: "First, as you know, the National Chess Championship begins here next Thursday. We'll have more than three hundred guests checking in on the same day, so it will be one of our busiest weeks of the year." },
      { s: 'D', t: "To help with the crowds, we're introducing mobile check-in. Guests will be able to check in on their phones and use them as room keys, so lines at the front desk should be much shorter." },
      { s: 'D', t: "All front desk and concierge staff need to learn the new system before Thursday. Training sessions will be held on Monday and Tuesday afternoon. Please sign up for one of them on the sheet outside my office by the end of today." },
      { pause: 6 },
    ],
    groups: [
      { type: 'mcq', instr: 'Questions 71–73. Choose the best answer (A, B, C or D).',
        items: [
          { n: 71, q: 'Where is the announcement being made?', options: ['At a garden center', 'At a furniture factory', 'At a department store', 'At a hotel'], a: 2, cue: "thank you for visiting Garrick's Department Store",
            explain: '"thank you for visiting Garrick\'s Department Store" → thông báo diễn ra tại cửa hàng bách hóa. "garden chairs" chỉ là một mặt hàng giảm giá – bẫy cho "garden center"; đồ nội thất được bán chứ không sản xuất ở đây.' },
          { n: 72, q: 'What is being offered at a discount?', options: ['Winter clothing', 'Kitchen appliances', 'Home delivery service', 'Outdoor furniture'], a: 3, cue: 'all outdoor furniture on our third floor is thirty percent off',
            explain: '"all outdoor furniture on our third floor is thirty percent off" → đồ nội thất ngoài trời giảm 30%, gồm bàn hiên, ghế vườn, ô che nắng. Giao hàng tận nhà là MIỄN PHÍ cho hội viên, không phải "giảm giá" – bẫy.' },
          { n: 73, q: 'What can members of the rewards program receive today?', options: ['A gift card', 'Free delivery', 'An extra discount', 'A free umbrella'], a: 1, cue: 'Members receive free home delivery on any furniture purchase today',
            explain: '"Members receive free home delivery on any furniture purchase today" → hội viên được giao hàng tận nhà miễn phí. "sun umbrellas" nằm trong danh sách hàng giảm giá, không phải quà tặng.' },
        ] },
      { type: 'mcq', instr: 'Questions 74–76. Choose the best answer (A, B, C or D).',
        items: [
          { n: 74, q: 'Why is the speaker calling?', options: ['To schedule an interview', 'To advertise a new type of account', 'To request a payment', 'To give an update on a loan application'], a: 3, cue: "I'm calling about your application for a small business loan",
            explain: 'Ông gọi về "your application for a small business loan" và báo hồ sơ đã được duyệt sơ bộ → cập nhật tình trạng hồ sơ vay. Khoản thanh toán là của nhà cung cấp thiết bị đòi bà Okwuosa, không phải ngân hàng đòi tiền.' },
          { n: 75, q: 'Why does the speaker say, "That doesn\'t leave us much time"?', options: ['To apologize for a delay', 'To stress the need to act quickly', 'To explain why an application was rejected', 'To suggest choosing a different supplier'], a: 1, cue: "You mentioned that your equipment supplier needs payment by the end of the month. That doesn't leave us much time.",
            explain: 'Nhà cung cấp cần được thanh toán trước cuối tháng → "That doesn\'t leave us much time" (không còn nhiều thời gian) nhằm nhấn mạnh phải hành động nhanh, ngay sau đó ông đề nghị nộp tài liệu trước thứ Tư. Hồ sơ đã được duyệt sơ bộ chứ không bị từ chối; ông không xin lỗi hay khuyên đổi nhà cung cấp.' },
          { n: 76, q: 'What does the speaker ask the listener to do?', options: ['Visit a branch', 'Sign a contract', 'Call the equipment supplier', 'Upload a document'], a: 3, cue: 'if you could upload the document through our secure Web portal by Wednesday',
            explain: '"upload the document through our secure Web portal by Wednesday" → tải tờ khai thuế năm trước lên cổng trực tuyến bảo mật. Số điện thoại chỉ để gọi NẾU có thắc mắc; không có yêu cầu đến chi nhánh hay ký hợp đồng.' },
        ] },
      { type: 'mcq', instr: 'Questions 77–79. Choose the best answer (A, B, C or D).',
        items: [
          { n: 77, q: 'Who most likely are the listeners?', options: ['New factory employees', 'Glassblowing students', 'Visitors on a tour', 'Gift shop staff'], a: 2, cue: "I'll be your guide for this morning's factory tour",
            explain: '"I\'ll be your guide for this morning\'s factory tour" → người nghe là khách tham quan nhà máy. Thợ thổi thủy tinh là người làm việc trong xưởng; người nghe nhận phiếu giảm giá ở cửa hàng quà tặng, nên không phải nhân viên cửa hàng.' },
          { n: 78, q: 'What are listeners asked not to do in the design studio?', options: ['Touch the glass pieces', 'Take photographs', 'Cross a yellow line', 'Talk to the designers'], a: 1, cue: 'photography is not allowed in the studio',
            explain: '"photography is not allowed in the studio, because many of the pieces … haven\'t been released yet" → không chụp ảnh trong xưởng thiết kế. Vạch vàng là quy định ở khu lò nung (furnace hall), không phải xưởng thiết kế – bẫy.' },
          { n: 79, q: 'What will listeners receive at the end of the tour?', options: ['A free lunch', 'A glass vase', 'A product catalog', 'A discount voucher'], a: 3, cue: 'each of you will receive a voucher for twenty percent off any purchase in our gift shop',
            explain: '"each of you will receive a voucher for twenty percent off any purchase in our gift shop" → phiếu giảm giá 20%. Bình hoa (vase) là sản phẩm được làm trong nhà máy, không phải quà tặng cho khách.' },
        ] },
      { type: 'mcq', instr: 'Questions 80–82. Choose the best answer (A, B, C or D).',
        items: [
          { n: 80, q: 'Where most likely does the speaker work?', options: ['At a hotel', 'At a sports stadium', 'At a travel agency', 'At a phone company'], a: 0, cue: "We'll have more than three hundred guests checking in on the same day",
            explain: 'Các chi tiết "guests checking in" (khách nhận phòng), "room keys" (chìa khóa phòng), "front desk and concierge staff" (lễ tân và nhân viên hỗ trợ khách) → người nói làm ở khách sạn. Giải vô địch cờ vua là sự kiện tổ chức tại khách sạn, không phải sân vận động.' },
          { n: 81, q: 'What new system is being introduced?', options: ['Online room booking', 'A guest rewards program', 'A new payment method', 'Mobile check-in'], a: 3, cue: "we're introducing mobile check-in",
            explain: '"we\'re introducing mobile check-in" → khách nhận phòng bằng điện thoại và dùng điện thoại làm chìa khóa phòng. Đặt phòng trực tuyến, phương thức thanh toán hay chương trình khách hàng thân thiết không được nhắc đến.' },
          { n: 82, q: 'What does the speaker ask listeners to do by the end of the day?', options: ['Check in some guests', 'Read a user manual', 'Sign up for a training session', 'Update their work schedules'], a: 2, cue: 'Please sign up for one of them on the sheet outside my office by the end of today.',
            explain: '"Please sign up for one of them on the sheet outside my office by the end of today" ("them" = các buổi đào tạo) → đăng ký một buổi đào tạo. Các buổi học diễn ra chiều thứ Hai và thứ Ba; hạn đăng ký là cuối ngày hôm nay.' },
        ] },
    ],
    vocab: [
      { w: 'patio', vi: 'hiên, sân lát gạch ngoài trời' },
      { w: 'loan officer', vi: 'nhân viên tín dụng (ngân hàng)' },
      { w: 'initial approval', vi: 'sự phê duyệt sơ bộ' },
      { w: 'tax return', vi: 'tờ khai thuế' },
      { w: 'furnace', vi: 'lò nung' },
      { w: 'voucher', vi: 'phiếu giảm giá, phiếu quà tặng' },
      { w: 'concierge', vi: 'nhân viên hỗ trợ khách (khách sạn)' },
      { w: 'check in', vi: 'làm thủ tục nhận phòng' },
    ],
  });
})(typeof self !== 'undefined' ? self : this);
