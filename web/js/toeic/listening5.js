/* TOEIC Listening – Test 5 (tự biên soạn) */
(function (g) {
  const T = g.TOEIC = g.TOEIC || { reading: [], listening: [] };
  if (!T.listening) T.listening = [];

  /* ---------------- Part 1: Photographs (Q1–6) ---------------- */
  // Ảnh CC0/public domain (web/img/toeic/CREDITS.md). Phương án KHÔNG xoay (photo: true) vì audio đọc sẵn (A)–(D).
  const P1 = [
    { n: 1, img: 'img/toeic/t5-p1-1.jpg', a: 3,
      s: ['Passengers are waiting in line at a counter.', 'Some luggage is being weighed.', 'Some workers are cleaning the floor.', 'The check-in area is unoccupied.'],
      explain: 'Ảnh: khu làm thủ tục ở sân bay với dãy quầy check-in và các cột chắn xếp hàng, hoàn toàn không có người. (D) đúng: "unoccupied" = không có người. (A) không có hành khách nào xếp hàng. (B) có băng cân hành lý nhưng không ai đang cân. (C) sàn sạch bóng nhưng không có ai đang lau.' },
    { n: 2, img: 'img/toeic/t5-p1-2.jpg', a: 1,
      s: ['A woman is folding some clothes.', 'A woman is seated at a sewing machine.', 'A man is trying on a jacket.', 'Some fabric is being cut with scissors.'],
      explain: 'Ảnh: trên vỉa hè, một người phụ nữ mặc áo đỏ ngồi bên chiếc máy khâu đặt trên bàn gỗ, trò chuyện với một người đàn ông đội mũ lưỡi trai đứng cạnh. (B) đúng: "seated at a sewing machine" = ngồi bên máy khâu. (A) không ai đang gấp quần áo. (C) người đàn ông đang mặc áo khoác sẵn, không phải đang thử áo. (D) có cây kéo trên bàn nhưng không ai đang cắt vải.' },
    { n: 3, img: 'img/toeic/t5-p1-3.jpg', a: 2,
      s: ['Some cars are parked in a row.', 'Some bicycles are being repaired.', 'The parking spaces are empty.', 'Lines are being painted on the pavement.'],
      explain: 'Ảnh: bãi đỗ xe trước một tòa nhà kính nhiều tầng, các ô đỗ kẻ vạch trắng đều trống; dọc chân tòa nhà có giá để xe đạp. (C) đúng: "the parking spaces are empty" = các chỗ đỗ xe đều trống. (A) không có chiếc ô tô nào. (B) chỉ có giá để xe, không có xe đạp đang được sửa. (D) vạch kẻ đã có sẵn, không ai đang sơn.' },
    { n: 4, img: 'img/toeic/t5-p1-4.jpg', a: 0,
      s: ['Some cooking utensils have been laid out on a table.', 'Some vegetables are being chopped on a cutting board.', 'A pan is sitting on a stove.', 'Some knives are hanging on a wall.'],
      explain: 'Ảnh chụp từ trên xuống: trên mặt bàn gỗ có thớt, chảo gang, cối chày, dao, các chén gia vị và thảo mộc được bày sẵn. (A) đúng: "cooking utensils have been laid out" = dụng cụ nấu ăn đã được bày ra. (B) có thớt nhưng không ai đang thái rau. (C) chảo đặt trên bàn, không phải trên bếp. (D) dao nằm trên bàn, không treo trên tường.' },
    { n: 5, img: 'img/toeic/t5-p1-5.jpg', a: 3,
      s: ['A man is taking off his jacket.', 'A man is tying his tie.', 'A man is typing a message.', 'A man is holding a phone to his ear.'],
      explain: 'Ảnh: một người đàn ông để râu, mặc vest và thắt cà vạt đỏ, đang mỉm cười và áp điện thoại lên tai. (D) đúng: "holding a phone to his ear" = áp điện thoại vào tai (đang nghe gọi). (A) anh ấy vẫn mặc áo vest, không cởi ra. (B) cà vạt đã thắt sẵn, không phải đang thắt. (C) anh ấy đang gọi điện, không nhắn tin.' },
    { n: 6, img: 'img/toeic/t5-p1-6.jpg', a: 1,
      s: ['Some boxes are being unloaded from a truck.', 'A truck has been parked next to a building.', 'A driver is getting out of a vehicle.', 'A truck is being washed.'],
      explain: 'Ảnh: một chiếc xe tải thùng kiểu cũ đỗ sát bến bốc dỡ hàng của một nhà kho, không thấy người. (B) đúng: "has been parked next to a building" = đã được đỗ cạnh tòa nhà. (A) bị động tiếp diễn "are being unloaded" cần có người đang dỡ hàng – không có. (C) không thấy tài xế. (D) không ai đang rửa xe.' },
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
    id: 'tl5p1', test: 5, part: 1, title: 'Photographs', titleVi: 'Mô tả tranh',
    speakers: { N: { name: 'Narrator', accent: 'en-US', gender: 'm' } },
    script: p1script,
    groups: [
      { type: 'mcq', photo: true, instr: 'Look at the photograph and choose the statement that best describes it (A, B, C or D).',
        items: P1.map(it => ({ n: it.n, img: it.img, q: '', options: it.s, a: it.a, cue: it.s[it.a], explain: it.explain })) },
    ],
    vocab: [
      { w: 'unoccupied', vi: 'không có người' },
      { w: 'sewing machine', vi: 'máy khâu' },
      { w: 'parking space', vi: 'chỗ đỗ xe' },
      { w: 'utensil', vi: 'dụng cụ (nhà bếp)' },
      { w: 'lay out', vi: 'bày ra, sắp đặt' },
      { w: 'loading dock', vi: 'bến bốc dỡ hàng' },
    ],
  });

  /* ---------------- Part 2: Question–Response (Q7–21) ---------------- */
  const P2 = [
    { n: 7, qs: 'A', rs: 'B', q: 'When does the new parking policy take effect?',
      r: ['Starting on the first of next month.', 'In the employee lot.', 'It was very effective.'], a: 0,
      explain: 'Câu hỏi "When" (khi nào) → cần mốc thời gian: "Starting on the first of next month" (bắt đầu từ ngày mùng một tháng sau). "In the employee lot" trả lời địa điểm (Where) và chỉ liên tưởng đến "parking". "It was very effective" bẫy âm "effect" – "effective" (hiệu quả).' },
    { n: 8, qs: 'B', rs: 'C', q: 'Where can I find extra toner cartridges?',
      r: ['About forty dollars each.', 'In the supply closet next to the copier.', 'Yes, I printed them already.'], a: 1,
      explain: 'Câu hỏi "Where" (ở đâu) → nêu vị trí: "In the supply closet next to the copier" (trong tủ đồ dùng cạnh máy photocopy). "About forty dollars each" trả lời giá tiền (How much). "Yes, I printed them already" trả lời Yes cho câu hỏi Wh- và chỉ liên tưởng đến mực in.' },
    { n: 9, qs: 'C', rs: 'A', q: "Who's going to pick up the clients from the airport?",
      r: ['Flight 208 from Denver.', 'They picked the blue design.', 'Mr. Adebayo volunteered to go.'], a: 2,
      explain: 'Câu hỏi "Who" (ai) → chỉ ra người cụ thể: "Mr. Adebayo volunteered to go" (anh Adebayo đã tình nguyện đi). "Flight 208 from Denver" chỉ liên tưởng đến sân bay. "They picked the blue design" bẫy âm "pick up" (đón) – "picked" (chọn).' },
    { n: 10, qs: 'D', rs: 'B', q: 'Why was the shipment to Rotterdam delayed?',
      r: ['There was a strike at the port.', 'Ship it by express mail.', 'Not until next Monday.'], a: 0,
      explain: 'Câu hỏi "Why" (tại sao) → nêu lý do: "There was a strike at the port" (đã có cuộc đình công ở cảng). "Ship it by express mail" bẫy âm "shipment" – "ship". "Not until next Monday" trả lời thời gian, không giải thích nguyên nhân.' },
    { n: 11, qs: 'A', rs: 'D', q: 'Should we print the brochures in color or in black and white?',
      r: ['The printer is on the third floor.', 'I read it last night.', 'Color would look more professional.'], a: 2,
      explain: 'Câu hỏi lựa chọn "A or B?" → chọn một phương án: "Color would look more professional" (in màu trông chuyên nghiệp hơn). "The printer is on the third floor" lặp ý "print" – "printer" nhưng trả lời vị trí. "I read it last night" bẫy âm "red" (đỏ, liên tưởng màu sắc) – "read" (đọc, quá khứ).' },
    { n: 12, qs: 'B', rs: 'A', q: 'How long will the system upgrade take?',
      r: ["It's quite a long way from here.", 'About three hours, I think.', 'Upgrade to first class.'], a: 1,
      explain: '"How long" hỏi khoảng thời gian → "About three hours, I think" (khoảng ba tiếng, tôi nghĩ vậy). "It\'s quite a long way from here" lặp từ "long" nhưng nói về khoảng cách. "Upgrade to first class" lặp từ "upgrade" với nghĩa nâng hạng ghế.' },
    { n: 13, qs: 'C', rs: 'D', q: "Haven't you submitted your travel expense report yet?",
      r: ['I did it this morning.', 'A business trip to Seoul.', 'The report was very long.'], a: 0,
      explain: 'Câu hỏi phủ định "Haven\'t you submitted…?" (anh vẫn chưa nộp báo cáo chi phí công tác à?) → "I did it this morning" (tôi nộp sáng nay rồi). "A business trip to Seoul" chỉ liên tưởng đến "travel". "The report was very long" lặp từ "report" nhưng không trả lời đã nộp hay chưa.' },
    { n: 14, qs: 'D', rs: 'C', q: 'The projector in Conference Room B keeps shutting off.',
      r: ['We should project higher sales.', 'Let me ask the IT department to look at it.', 'The room was booked for two hours.'], a: 1,
      explain: 'Câu trần thuật nêu sự cố (máy chiếu liên tục tự tắt) → đáp lại bằng giải pháp: "Let me ask the IT department to look at it" (để tôi nhờ phòng IT kiểm tra). "We should project higher sales" bẫy âm "projector" – "project" (dự báo). "The room was booked for two hours" lặp ý "room" nhưng không xử lý sự cố.' },
    { n: 15, qs: 'A', rs: 'C', q: 'Is the quarterly sales report ready for review?',
      r: ['Sales were up eight percent.', 'Please review the menu.', 'Gerald is adding the final charts now.'], a: 2,
      explain: 'Câu hỏi Yes/No → trả lời gián tiếp: "Gerald is adding the final charts now" (Gerald đang thêm các biểu đồ cuối cùng – tức là sắp xong nhưng chưa sẵn sàng). "Sales were up eight percent" lặp từ "sales". "Please review the menu" lặp từ "review" trong ngữ cảnh khác.' },
    { n: 16, qs: 'B', rs: 'D', q: 'Can you cover my shift at the front desk on Saturday?',
      r: ['Sorry, I already have plans.', 'The desk is made of oak.', 'Yes, it shifted to the left.'], a: 0,
      explain: 'Lời nhờ vả "Can you cover my shift…?" (làm thay ca giúp tôi được không?) → từ chối lịch sự: "Sorry, I already have plans" (xin lỗi, tôi có kế hoạch rồi). "The desk is made of oak" lặp từ "desk". "Yes, it shifted to the left" bẫy âm "shift" (ca làm) – "shifted" (dịch chuyển).' },
    { n: 17, qs: 'C', rs: 'B', q: 'Which supplier did we choose for the office furniture?',
      r: ['The chairs are very comfortable.', 'The one that offered free assembly.', 'In the storage room.'], a: 1,
      explain: '"Which supplier" (nhà cung cấp nào) → "The one that offered free assembly" (nhà cung cấp đã đề nghị lắp ráp miễn phí; "the one" = the supplier). "The chairs are very comfortable" chỉ liên tưởng đến đồ nội thất. "In the storage room" trả lời địa điểm.' },
    { n: 18, qs: 'D', rs: 'A', q: "Why don't we move the team lunch to Thursday?",
      r: ['Because I had lunch already.', 'We moved here in 2019.', 'Sure, Thursday works better for me.'], a: 2,
      explain: '"Why don\'t we…?" là lời ĐỀ NGHỊ (sao ta không dời bữa trưa của nhóm sang thứ Năm?) → đồng ý: "Sure, Thursday works better for me" (được, thứ Năm hợp với tôi hơn). "Because I had lunch already" là bẫy trả lời "Why" bằng "Because". "We moved here in 2019" lặp âm "move" – "moved" (chuyển đến).' },
    { n: 19, qs: 'A', rs: 'B', q: "You've met our new accountant, haven't you?",
      r: ['Please open an account.', 'Yes, at the orientation last week.', 'We met the deadline.'], a: 1,
      explain: 'Câu hỏi đuôi "…, haven\'t you?" (anh đã gặp kế toán mới rồi phải không?) → "Yes, at the orientation last week" (rồi, tại buổi định hướng tuần trước). "Please open an account" bẫy âm "accountant" – "account" (tài khoản). "We met the deadline" lặp từ "met" với nghĩa "kịp thời hạn".' },
    { n: 20, qs: 'B', rs: 'C', q: "I can't find the agenda for this afternoon's meeting.",
      r: ["I'll send it to you again.", 'He found a new job.', 'The afternoon is better for me.'], a: 0,
      explain: 'Câu trần thuật nêu vấn đề (không tìm thấy chương trình họp) → đưa ra giúp đỡ: "I\'ll send it to you again" (tôi sẽ gửi lại cho anh; "it" = the agenda). "He found a new job" bẫy âm "find" – "found" và sai chủ ngữ. "The afternoon is better for me" lặp từ "afternoon" như thể đang hẹn giờ.' },
    { n: 21, qs: 'C', rs: 'A', q: 'How did the product launch go yesterday?',
      r: ['Go straight down this hall.', 'Better than we expected.', 'Lunch is served at noon.'], a: 1,
      explain: '"How did … go?" hỏi kết quả, diễn biến → "Better than we expected" (tốt hơn chúng tôi mong đợi). "Go straight down this hall" lặp từ "go" với nghĩa chỉ đường. "Lunch is served at noon" bẫy âm "launch" – "lunch".' },
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
    id: 'tl5p2', test: 5, part: 2, title: 'Question–Response', titleVi: 'Hỏi – đáp',
    speakers: {
      A: { name: 'Desmond', accent: 'en-GB', gender: 'm' },
      B: { name: 'Leila', accent: 'en-US', gender: 'f' },
      C: { name: 'Bradley', accent: 'en-AU', gender: 'm' },
      D: { name: 'Moira', accent: 'en-GB', gender: 'f' },
    },
    script: p2script,
    groups: [
      { type: 'mcq', instr: 'Listen and choose the best response (A, B or C).',
        items: P2.map(it => ({ n: it.n, q: 'Mark your answer.', options: ['A', 'B', 'C'], a: it.a, cue: it.r[it.a], explain: it.explain })) },
    ],
    vocab: [
      { w: 'take effect', vi: 'có hiệu lực' },
      { w: 'toner cartridge', vi: 'hộp mực in' },
      { w: 'expense report', vi: 'báo cáo chi phí (để thanh toán lại)' },
      { w: 'cover a shift', vi: 'làm thay ca (cho ai)' },
      { w: 'assembly', vi: 'việc lắp ráp' },
      { w: 'orientation', vi: 'buổi định hướng (cho nhân viên mới)' },
    ],
  });

  /* ---------------- Part 3: Conversations (Q32–46) ---------------- */
  T.listening.push({
    id: 'tl5p3', test: 5, part: 3, title: 'Conversations', titleVi: 'Hội thoại',
    speakers: {
      W1: { name: 'Serena', accent: 'en-US', gender: 'f' },
      M1: { name: 'Aldo', accent: 'en-GB', gender: 'm' },
      M2: { name: 'Joaquin', accent: 'en-US', gender: 'm' },
      W2: { name: 'Margot', accent: 'en-GB', gender: 'f' },
      M3: { name: 'Dmitri', accent: 'en-AU', gender: 'm' },
      W3: { name: 'Tessa', accent: 'en-AU', gender: 'f' },
      M4: { name: 'Adrian', accent: 'en-US', gender: 'm' },
      M5: { name: 'Rupert', accent: 'en-GB', gender: 'm' },
      W4: { name: 'Wendy', accent: 'en-US', gender: 'f' },
      W5: { name: 'Imani', accent: 'en-US', gender: 'f' },
      W6: { name: 'Odile', accent: 'en-GB', gender: 'f' },
      M6: { name: 'Rowan', accent: 'en-AU', gender: 'm' },
    },
    script: [
      { say: 'Part 3. In this part, you will hear several conversations between two or more people. After each conversation, answer the three questions printed in your test book.' }, { pause: 3 },

      { say: 'Questions 32 through 34 refer to the following conversation.' }, { pause: 1 },
      { s: 'M1', t: 'Thistledown Conference Center, events office. This is Aldo.' },
      { s: 'W1', t: "Hi, Aldo. My name is Serena, and I work for Brackwell Insurance. We're planning a one-day training seminar on October eighth, and I'd like to reserve a room for about sixty people." },
      { s: 'M1', t: 'Let me check. Yes, our Lakeside Room is available that day. It can hold up to eighty people, and it comes with a projector and a sound system.' },
      { s: 'W1', t: "That sounds perfect. We'll also need lunch for everyone. Do you provide catering?" },
      { s: 'M1', t: "We do. I'll e-mail you our catering menu along with the rental contract." },
      { s: 'W1', t: 'Great. Is there anything else I need to do to confirm the booking?' },
      { s: 'M1', t: 'Just return the signed contract with a twenty percent deposit by Friday, and the room will be yours.' },
      { pause: 6 },

      { say: 'Questions 35 through 37 refer to the following conversation with three speakers.' }, { pause: 1 },
      { s: 'M2', t: "Margot, Dmitri, thanks for joining me. Since we released the update to our budgeting app on Monday, customers have been reporting that the app freezes when they try to pay a bill." },
      { s: 'W2', t: "It's serious. Calls to the help line have doubled since Monday, and most of them are about this problem." },
      { s: 'M3', t: "My team found the cause yesterday. It's a bug in the new payment screen. We're testing a fix now, and it should be ready by tomorrow morning." },
      { s: 'M2', t: "Good. In the meantime, let's post a notice on our Web site explaining the problem, so customers know we're working on it." },
      { s: 'W2', t: "I'll write it right away. Should we offer anything to the customers who were affected?" },
      { s: 'M2', t: "Yes. Let's give them one month of our premium service for free." },
      { pause: 6 },

      { say: 'Questions 38 through 40 refer to the following conversation.' }, { pause: 1 },
      { s: 'W3', t: 'Adrian, how was the first week at our new location on Pruitt Street?' },
      { s: 'M4', t: "Busier than I imagined. We ran out of croissants by nine o'clock every morning." },
      { s: 'W3', t: "That's great news. But we can't keep disappointing customers. Maybe we need another baker on the early shift." },
      { s: 'M4', t: "I agree. Right now, Felipe starts at four A.M. by himself, and he can only make so many batches before we open at six." },
      { s: 'W3', t: "Let's hire someone part-time for now and see if sales stay this strong." },
      { s: 'M4', t: "All right. I'll post a job advertisement on our social media pages this afternoon." },
      { pause: 6 },

      { say: 'Questions 41 through 43 refer to the following conversation with three speakers.' }, { pause: 1 },
      { s: 'M5', t: "Wendy, Imani, we're now just two weeks away from moving into the new office on Calder Street. How are the preparations going?" },
      { s: 'W4', t: "The moving company is confirmed. Their team will arrive here at seven A.M. on Saturday the twenty-first, and they expect to finish by early afternoon." },
      { s: 'M5', t: 'Good. And what about the computers and phones?' },
      { s: 'W5', t: "Our IT contractor will set everything up on Sunday, so it'll all be working by Monday morning." },
      { s: 'M5', t: "Excellent. The only thing left is to let everyone know where they'll be sitting." },
      { s: 'W5', t: "I can take care of that. I'll make a floor plan with everyone's desk marked on it and e-mail it to the staff by Wednesday." },
      { pause: 6 },

      { say: 'Questions 44 through 46 refer to the following conversation.' }, { pause: 1 },
      { s: 'W6', t: "Hello. I ordered this rain jacket from your online store, but it's too small. I'd like to exchange it for a medium." },
      { s: 'M6', t: "I'm sorry about that. Let me check our inventory. Unfortunately, we're out of the medium in that color at this store." },
      { s: 'W6', t: "Oh, that's disappointing. I'm going hiking in two weeks, and I really wanted this jacket for the trip." },
      { s: 'M6', t: "Our Westgate branch has two in stock. I can have one sent directly to your home free of charge. It should arrive within three days." },
      { s: 'W6', t: 'That would be wonderful.' },
      { s: 'M6', t: 'Great. Could you write down your mailing address on this form for me?' },
      { pause: 6 },
    ],
    groups: [
      { type: 'mcq', instr: 'Questions 32–34. Choose the best answer (A, B, C or D).',
        items: [
          { n: 32, q: 'Why is the woman calling?', options: ['To cancel a training seminar', 'To reserve a meeting space', 'To ask about a job opening', 'To request an insurance quote'], a: 1, cue: "I'd like to reserve a room for about sixty people",
            explain: 'Cô gọi vì "I\'d like to reserve a room for about sixty people" (tôi muốn đặt một phòng cho khoảng 60 người) → đặt chỗ phòng họp. Hội thảo đào tạo là sự kiện cô đang lên kế hoạch, không phải hủy; "Brackwell Insurance" chỉ là nơi cô làm việc – bẫy cho phương án báo giá bảo hiểm.' },
          { n: 33, q: 'What does the man say about the Lakeside Room?', options: ['It has a view of the garden.', 'It is being renovated.', 'It can hold up to eighty people.', 'It is available only in the morning.'], a: 2, cue: 'It can hold up to eighty people',
            explain: '"It can hold up to eighty people, and it comes with a projector and a sound system" → phòng chứa được tối đa 80 người. Phòng còn trống cả ngày cho buổi hội thảo một ngày; không có thông tin về cảnh quan hay việc sửa chữa.' },
          { n: 34, q: 'What must the woman do by Friday?', options: ['Choose a lunch menu', 'Send a list of participants', 'Visit the conference center', 'Return a signed contract'], a: 3, cue: 'Just return the signed contract with a twenty percent deposit by Friday',
            explain: '"return the signed contract with a twenty percent deposit by Friday" → gửi lại hợp đồng đã ký (kèm 20% tiền đặt cọc) trước thứ Sáu. Thực đơn ăn trưa sẽ được gửi qua email nhưng không có hạn chót chọn món; danh sách người tham dự và việc đến xem địa điểm không được nhắc đến.' },
        ] },
      { type: 'mcq', instr: 'Questions 35–37. Choose the best answer (A, B, C or D).',
        items: [
          { n: 35, q: 'What problem are the speakers discussing?', options: ['A software update is causing errors.', 'A help line is closed.', 'A bill was paid twice.', 'A product launch was delayed.'], a: 0, cue: 'customers have been reporting that the app freezes when they try to pay a bill',
            explain: 'Từ khi phát hành bản cập nhật ứng dụng hôm thứ Hai, "the app freezes when they try to pay a bill" (ứng dụng bị đơ khi khách thanh toán hóa đơn) → bản cập nhật phần mềm gây lỗi. Đường dây hỗ trợ vẫn hoạt động (số cuộc gọi tăng gấp đôi); "pay a bill" là bẫy cho phương án "A bill was paid twice".' },
          { n: 36, q: 'What does Dmitri say about the problem?', options: ['It affects only older phones.', 'A fix will be ready soon.', 'It was reported by a competitor.', 'It cannot be solved this month.'], a: 1, cue: "We're testing a fix now, and it should be ready by tomorrow morning",
            explain: 'Dmitri cho biết nhóm đã tìm ra nguyên nhân và "We\'re testing a fix now, and it should be ready by tomorrow morning" (bản sửa lỗi sẽ sẵn sàng vào sáng mai) → sắp có bản sửa. Không có thông tin về điện thoại đời cũ hay đối thủ cạnh tranh.' },
          { n: 37, q: 'What does the man suggest offering to affected customers?', options: ['A full refund', 'A gift card', 'A free month of a service', 'A training session'], a: 2, cue: "Let's give them one month of our premium service for free",
            explain: 'Joaquin nói "Let\'s give them one month of our premium service for free" → tặng một tháng dịch vụ cao cấp miễn phí. Hoàn tiền, thẻ quà tặng hay buổi đào tạo không được đề xuất.' },
        ] },
      { type: 'mcq', instr: 'Questions 38–40. Choose the best answer (A, B, C or D).',
        items: [
          { n: 38, q: 'Where do the speakers most likely work?', options: ['At a bakery', 'At a hotel', 'At a grocery store', 'At a coffee supplier'], a: 0, cue: "We ran out of croissants by nine o'clock every morning",
            explain: 'Các chi tiết "croissants" (bánh sừng bò), "another baker on the early shift" (thêm một thợ làm bánh ca sớm), "make so many batches" (làm từng mẻ bánh) → họ làm ở tiệm bánh. Không có chi tiết nào về khách sạn, siêu thị hay nhà cung cấp cà phê.' },
          { n: 39, q: 'Why does the man say, "We ran out of croissants by nine o\'clock every morning"?', options: ['To complain about a supplier', 'To explain why a store closed early', 'To show that demand is higher than expected', 'To suggest removing an item from the menu'], a: 2, cue: "Busier than I imagined. We ran out of croissants by nine o'clock every morning.",
            explain: 'Ngay trước đó Adrian nói tuần đầu "Busier than I imagined" (đông khách hơn tôi tưởng) → việc hết bánh sừng bò lúc 9 giờ sáng cho thấy nhu cầu cao hơn dự kiến; người phụ nữ đáp "That\'s great news". Không ai phàn nàn về nhà cung cấp, cửa hàng không đóng cửa sớm và họ cũng không định bỏ món này.' },
          { n: 40, q: 'What will the man do this afternoon?', options: ['Train a new employee', 'Post a job advertisement', 'Order more ingredients', 'Change the opening hours'], a: 1, cue: "I'll post a job advertisement on our social media pages this afternoon",
            explain: '"I\'ll post a job advertisement on our social media pages this afternoon" → đăng tin tuyển dụng. Họ mới quyết định tuyển người bán thời gian nên chưa có nhân viên mới để đào tạo; giờ mở cửa (6 giờ sáng) không thay đổi.' },
        ] },
      { type: 'mcq', instr: 'Questions 41–43. Choose the best answer (A, B, C or D).',
        items: [
          { n: 41, q: 'What are the speakers preparing for?', options: ['A building inspection', 'A staff training day', 'An office relocation', 'A technology conference'], a: 2, cue: "we're now just two weeks away from moving into the new office on Calder Street",
            explain: '"two weeks away from moving into the new office on Calder Street" (còn hai tuần nữa là chuyển vào văn phòng mới ở phố Calder), cùng các chi tiết công ty vận chuyển, lắp đặt máy tính → chuẩn bị chuyển văn phòng. Nhà thầu IT chỉ lắp đặt thiết bị, không có hội nghị công nghệ.' },
          { n: 42, q: 'According to Wendy, what will happen on Saturday?', options: ['Movers will arrive in the morning.', 'Computers will be installed.', 'A lease will be signed.', 'The office will be cleaned.'], a: 0, cue: 'Their team will arrive here at seven A.M. on Saturday the twenty-first',
            explain: 'Wendy cho biết đội vận chuyển "will arrive here at seven A.M. on Saturday" (sẽ đến lúc 7 giờ sáng thứ Bảy) → người chuyển đồ đến vào buổi sáng. Máy tính và điện thoại được lắp đặt vào Chủ nhật (theo lời Imani), nên "Computers will be installed" là bẫy.' },
          { n: 43, q: 'What does Imani offer to do?', options: ['Contact the moving company', 'Test the phone system', 'Pack some equipment', 'Prepare a seating plan'], a: 3, cue: "I'll make a floor plan with everyone's desk marked on it",
            explain: 'Việc còn lại là cho mọi người biết chỗ ngồi; Imani nhận làm: "I\'ll make a floor plan with everyone\'s desk marked on it" (vẽ sơ đồ mặt bằng đánh dấu bàn của từng người) → chuẩn bị sơ đồ chỗ ngồi. Công ty vận chuyển đã được xác nhận rồi; hệ thống điện thoại do nhà thầu IT phụ trách.' },
        ] },
      { type: 'mcq', instr: 'Questions 44–46. Choose the best answer (A, B, C or D).',
        items: [
          { n: 44, q: 'Why did the woman come to the store?', options: ['To buy hiking boots', 'To exchange an item', 'To pick up an online order', 'To apply for a job'], a: 1, cue: "I'd like to exchange it for a medium",
            explain: 'Chiếc áo mưa đặt online bị chật nên cô muốn "exchange it for a medium" (đổi sang cỡ M) → đổi một món hàng. Cô đã nhận hàng đặt online rồi, không phải đến lấy; chuyến đi bộ đường dài chỉ là lý do cô cần áo, không phải mua giày.' },
          { n: 45, q: 'What problem does the man mention?', options: ['A size is not available in the store.', 'A jacket was damaged.', 'An online payment failed.', 'A branch has closed.'], a: 0, cue: "we're out of the medium in that color at this store",
            explain: '"we\'re out of the medium in that color at this store" (cửa hàng này hết cỡ M màu đó) → cỡ cô cần không có tại cửa hàng. Chi nhánh Westgate vẫn hoạt động và còn hai chiếc; áo không bị hỏng mà chỉ chật.' },
          { n: 46, q: 'What does the man ask the woman to do?', options: ['Show a receipt', 'Pay a delivery fee', 'Visit another branch', 'Write down her address'], a: 3, cue: 'Could you write down your mailing address on this form for me?',
            explain: '"Could you write down your mailing address on this form for me?" → ghi địa chỉ nhận hàng. Hàng được gửi đến nhà miễn phí ("free of charge"), nên cô không phải trả phí giao hàng hay tự đến chi nhánh khác.' },
        ] },
    ],
    vocab: [
      { w: 'catering', vi: 'dịch vụ cung cấp đồ ăn (cho sự kiện)' },
      { w: 'deposit', vi: 'tiền đặt cọc' },
      { w: 'freeze', vi: '(máy, ứng dụng) bị đơ, treo' },
      { w: 'in the meantime', vi: 'trong lúc chờ đợi' },
      { w: 'batch', vi: 'mẻ (bánh), lô (hàng)' },
      { w: 'floor plan', vi: 'sơ đồ mặt bằng' },
      { w: 'inventory', vi: 'hàng tồn kho' },
      { w: 'free of charge', vi: 'miễn phí' },
    ],
  });

  /* ---------------- Part 4: Talks (Q71–82) ---------------- */
  T.listening.push({
    id: 'tl5p4', test: 5, part: 4, title: 'Talks', titleVi: 'Bài nói ngắn',
    speakers: {
      A: { name: 'Conductor', accent: 'en-GB', gender: 'm' },
      B: { name: 'Leonard', accent: 'en-US', gender: 'm' },
      C: { name: 'Announcer', accent: 'en-US', gender: 'f' },
      D: { name: 'Host', accent: 'en-AU', gender: 'f' },
    },
    script: [
      { say: 'Part 4. In this part, you will hear several short talks given by a single speaker. After each talk, answer the three questions printed in your test book.' }, { pause: 3 },

      { say: 'Questions 71 through 73 refer to the following announcement.' }, { pause: 1 },
      { s: 'A', t: 'Attention, passengers on the ten fifteen Coastal Express to Port Delmar. This is your conductor speaking.' },
      { s: 'A', t: "Because of a signal problem near Ashby Junction, we'll be held here at Millbrook Station for approximately twenty-five minutes. We apologize for the inconvenience." },
      { s: 'A', t: "While we wait, the café car in the middle of the train will be serving complimentary coffee and tea to all passengers." },
      { s: 'A', t: "If you're connecting to the shuttle bus at Port Delmar, please don't worry. The bus company has agreed to wait for our arrival." },
      { s: 'A', t: 'If you have any other questions, please speak to a member of staff in car four.' },
      { pause: 6 },

      { say: 'Questions 74 through 76 refer to the following telephone message.' }, { pause: 1 },
      { s: 'B', t: "Hi, this is Leonard Fairbanks, the property manager at Wexford Apartments. I'm calling all residents about some work in the building." },
      { s: 'B', t: "On Wednesday, the water will be shut off from nine A.M. to one P.M. so that a plumber can replace the main pipe in the basement." },
      { s: 'B', t: "I know this is short notice. The plumber only told us this morning that the old pipe could start leaking at any time." },
      { s: 'B', t: "To prepare, I recommend filling a few bottles or containers with water on Tuesday night for drinking and cooking." },
      { s: 'B', t: "If you have any concerns, you can reach me at the management office on the ground floor. Thanks for your understanding." },
      { pause: 6 },

      { say: 'Questions 77 through 79 refer to the following advertisement.' }, { pause: 1 },
      { s: 'C', t: "Tired of working at your kitchen table? Copperleaf Workspaces has just opened its third location, on Brennan Avenue, right in the heart of downtown." },
      { s: 'C', t: "Rent a desk by the day or by the month, and enjoy high-speed internet, free printing, and private phone booths for your important calls." },
      { s: 'C', t: "Our members also get access to monthly networking events, where you can meet other local professionals." },
      { s: 'C', t: "And here's a special offer: sign up for a monthly membership before the end of this month, and your first two weeks are free." },
      { s: 'C', t: 'Visit copperleafworkspaces dot com to take a virtual tour today.' },
      { pause: 6 },

      { say: 'Questions 80 through 82 refer to the following introduction.' }, { pause: 1 },
      { s: 'D', t: "Good morning, and welcome to the second day of the Regional Agriculture Technology Forum." },
      { s: 'D', t: "I'm delighted to introduce our keynote speaker, Dr. Marguerite Ndiaye. Dr. Ndiaye designed a system that uses small drones to check soil moisture and crop health from the air." },
      { s: 'D', t: "Her system is now used by more than three hundred farms, and many of them have reduced their water use by almost a third." },
      { s: 'D', t: "After her talk, Dr. Ndiaye will be signing copies of her new book in the main lobby." },
      { s: 'D', t: "Also, please remember to rate today's sessions using the forum app. Your feedback helps us plan next year's program. And now, please join me in welcoming Dr. Ndiaye." },
      { pause: 6 },
    ],
    groups: [
      { type: 'mcq', instr: 'Questions 71–73. Choose the best answer (A, B, C or D).',
        items: [
          { n: 71, q: 'Where most likely are the listeners?', options: ['On a bus', 'On a train', 'At an airport', 'On a ferry'], a: 1, cue: 'Attention, passengers on the ten fifteen Coastal Express to Port Delmar. This is your conductor speaking.',
            explain: '"passengers on the ten fifteen Coastal Express", "your conductor" (trưởng tàu), "Millbrook Station", "the café car in the middle of the train" → người nghe đang ở trên tàu hỏa. "shuttle bus" chỉ là xe buýt nối chuyến ở điểm đến – bẫy cho "On a bus"; "Port Delmar" là tên địa danh, không phải cảng phà.' },
          { n: 72, q: 'What has caused the delay?', options: ['Bad weather', 'A staff shortage', 'A signal problem', 'Track construction'], a: 2, cue: 'Because of a signal problem near Ashby Junction',
            explain: '"Because of a signal problem near Ashby Junction" (do sự cố tín hiệu gần ga đầu mối Ashby) → nguyên nhân là sự cố tín hiệu. Thời tiết, thiếu nhân viên hay thi công đường ray không được nhắc đến.' },
          { n: 73, q: 'What are the listeners offered?', options: ['Free hot drinks', 'A partial refund', 'Seats in another car', 'A bus ticket'], a: 0, cue: 'serving complimentary coffee and tea to all passengers',
            explain: '"complimentary coffee and tea" (cà phê và trà miễn phí; "complimentary" = free) → đồ uống nóng miễn phí. Xe buýt nối chuyến sẽ chờ tàu nhưng hành khách không được tặng vé xe buýt; không có hoàn tiền hay đổi toa.' },
        ] },
      { type: 'mcq', instr: 'Questions 74–76. Choose the best answer (A, B, C or D).',
        items: [
          { n: 74, q: 'What is the message mainly about?', options: ['A rent increase', 'A planned water shutoff', 'A new laundry room', 'A change of property managers'], a: 1, cue: 'the water will be shut off from nine A.M. to one P.M.',
            explain: 'Nội dung chính: nước sẽ bị cắt từ 9 giờ sáng đến 1 giờ chiều thứ Tư để thay đường ống chính → lịch cắt nước theo kế hoạch. Leonard chỉ giới thiệu mình là quản lý tòa nhà, không có thay đổi người quản lý; tiền thuê hay phòng giặt không được nhắc đến.' },
          { n: 75, q: 'Why does the speaker say, "I know this is short notice"?', options: ['To acknowledge that residents have little time to prepare', 'To request a quick reply', 'To correct an earlier message', 'To complain about a plumber'], a: 0, cue: 'I know this is short notice.',
            explain: '"short notice" = báo gấp, báo sát ngày → người nói thừa nhận cư dân có ít thời gian chuẩn bị, sau đó giải thích lý do (thợ sửa ống nước mới báo sáng nay). Ông không phàn nàn về thợ, không yêu cầu trả lời gấp và không đính chính tin nhắn nào trước đó.' },
          { n: 76, q: 'What does the speaker recommend that residents do?', options: ['Leave their doors unlocked', 'Visit the management office', 'Report any leaks', 'Store some water in advance'], a: 3, cue: 'I recommend filling a few bottles or containers with water on Tuesday night',
            explain: '"I recommend filling a few bottles or containers with water on Tuesday night" (nên đổ nước vào chai, thùng từ tối thứ Ba) → trữ sẵn nước. Văn phòng quản lý chỉ là nơi liên hệ NẾU có thắc mắc; "leaking" được nhắc đến như lý do thay ống, không phải yêu cầu báo rò rỉ.' },
        ] },
      { type: 'mcq', instr: 'Questions 77–79. Choose the best answer (A, B, C or D).',
        items: [
          { n: 77, q: 'What is being advertised?', options: ['A furniture store', 'An internet provider', 'A shared office space', 'A printing service'], a: 2, cue: 'Copperleaf Workspaces has just opened its third location',
            explain: '"Copperleaf Workspaces", "Rent a desk by the day or by the month" (thuê bàn làm việc theo ngày hoặc tháng) → không gian làm việc chung. Internet tốc độ cao và in ấn miễn phí chỉ là tiện ích đi kèm; "kitchen table" chỉ là hình ảnh làm việc ở nhà.' },
          { n: 78, q: 'What feature does the speaker mention?', options: ['Free parking', 'Private phone booths', 'A rooftop café', 'Twenty-four-hour access'], a: 1, cue: 'private phone booths for your important calls',
            explain: 'Các tiện ích được nêu: internet tốc độ cao, in miễn phí, "private phone booths for your important calls" (buồng gọi điện riêng) và sự kiện kết nối hằng tháng → đáp án là buồng điện thoại riêng. Bãi đỗ xe, quán cà phê sân thượng hay mở cửa 24 giờ đều không được nhắc đến.' },
          { n: 79, q: 'How can listeners receive two free weeks?', options: ['By attending a networking event', 'By referring a friend', 'By taking a virtual tour', 'By signing up before the end of the month'], a: 3, cue: 'sign up for a monthly membership before the end of this month, and your first two weeks are free',
            explain: '"sign up for a monthly membership before the end of this month, and your first two weeks are free" → đăng ký gói tháng trước cuối tháng này. Tham quan ảo trên web chỉ là lời mời tìm hiểu thêm, không phải điều kiện nhận ưu đãi.' },
        ] },
      { type: 'mcq', instr: 'Questions 80–82. Choose the best answer (A, B, C or D).',
        items: [
          { n: 80, q: 'Where is the talk taking place?', options: ['At a farm', 'At a university lecture', 'At a product store', 'At a forum'], a: 3, cue: 'welcome to the second day of the Regional Agriculture Technology Forum',
            explain: '"welcome to the second day of the Regional Agriculture Technology Forum" (ngày thứ hai của Diễn đàn Công nghệ Nông nghiệp khu vực) → bài nói diễn ra tại một diễn đàn. Các trang trại chỉ là nơi sử dụng hệ thống của Dr. Ndiaye – bẫy cho "At a farm".' },
          { n: 81, q: 'What did Dr. Ndiaye develop?', options: ['A type of drought-resistant seed', 'A system for monitoring crops', 'A new watering schedule', 'A training course for farmers'], a: 1, cue: 'a system that uses small drones to check soil moisture and crop health from the air',
            explain: 'Bà thiết kế "a system that uses small drones to check soil moisture and crop health" (hệ thống dùng máy bay không người lái nhỏ để kiểm tra độ ẩm đất và tình trạng cây trồng) → hệ thống giám sát cây trồng. Việc giảm lượng nước tưới là KẾT QUẢ của hệ thống, không phải một lịch tưới mới.' },
          { n: 82, q: 'What will happen after the talk?', options: ['A book signing', 'A lunch reception', 'A farm tour', 'A product demonstration'], a: 0, cue: 'Dr. Ndiaye will be signing copies of her new book in the main lobby',
            explain: '"After her talk, Dr. Ndiaye will be signing copies of her new book in the main lobby" → buổi ký tặng sách. Tiệc trưa, tham quan trang trại hay trình diễn sản phẩm không được nhắc đến; ứng dụng diễn đàn chỉ dùng để đánh giá các phiên.' },
        ] },
    ],
    vocab: [
      { w: 'conductor', vi: 'trưởng tàu, người soát vé' },
      { w: 'complimentary', vi: 'miễn phí, được tặng kèm' },
      { w: 'short notice', vi: 'thông báo gấp, sát giờ' },
      { w: 'shut off', vi: 'ngắt, cắt (điện, nước)' },
      { w: 'networking event', vi: 'sự kiện giao lưu, mở rộng quan hệ' },
      { w: 'keynote speaker', vi: 'diễn giả chính' },
      { w: 'soil moisture', vi: 'độ ẩm của đất' },
      { w: 'feedback', vi: 'ý kiến phản hồi' },
    ],
  });
})(typeof self !== 'undefined' ? self : this);
