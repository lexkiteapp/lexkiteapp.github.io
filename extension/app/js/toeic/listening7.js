/* TOEIC Listening – Test 7 (tự biên soạn) */
(function (g) {
  const T = g.TOEIC = g.TOEIC || { reading: [], listening: [] };
  if (!T.listening) T.listening = [];

  /* ---------------- Part 1: Photographs (Q1–6) ---------------- */
  // Ảnh CC0/public domain (web/img/toeic/CREDITS.md). Phương án KHÔNG xoay (photo: true) vì audio đọc sẵn (A)–(D).
  const P1 = [
    { n: 1, img: 'img/toeic/t7-p1-1.jpg', a: 2,
      s: ['A man is washing a cup.', 'A man is grinding some coffee beans.', 'Some milk is being poured into a cup.', 'A customer is paying for a drink.'],
      explain: 'Ảnh: cận cảnh tay nhân viên pha chế đang rót sữa từ ca inox vào cốc giấy cà phê, tạo hình trên mặt; phía sau là máy pha cà phê. (C) đúng: "is being poured into a cup" = đang được rót vào cốc (bị động tiếp diễn, có người đang làm). (A) có cốc nhưng không ai rửa. (B) không ai đang xay hạt cà phê. (D) không thấy khách hàng nào trả tiền.' },
    { n: 2, img: 'img/toeic/t7-p1-2.jpg', a: 1,
      s: ['A boat is being rowed across a canal.', 'Some wooden crates have been loaded onto a boat.', 'Some people are diving into the water.', 'A tent is being taken down.'],
      explain: 'Ảnh: một chiếc thuyền neo sát bờ kênh được dùng làm sạp bán rau, trên thuyền chất nhiều thùng gỗ, có mái bạt che; khách đứng trên bờ mua hàng. (B) đúng: "have been loaded onto a boat" = đã được chất lên thuyền. (A) thuyền đang neo, không ai chèo. (C) không ai nhảy xuống nước. (D) mái bạt vẫn đang căng, không ai tháo xuống.' },
    { n: 3, img: 'img/toeic/t7-p1-3.jpg', a: 3,
      s: ['A vehicle is being towed away.', 'Some workers are sweeping the street with brooms.', 'A taxi is picking up a passenger.', 'A vehicle is equipped with a brush.'],
      explain: 'Ảnh: một chiếc xe quét đường màu trắng có chổi quét gắn phía trước, đang ở trên con phố lát gạch; phía sau là một chiếc taxi vàng. (D) đúng: "equipped with a brush" = được trang bị chổi quét. (A) không có xe kéo nào. (B) bẫy liên tưởng: việc quét đường do xe làm, không có công nhân cầm chổi. (C) có taxi nhưng không thấy hành khách lên xe.' },
    { n: 4, img: 'img/toeic/t7-p1-4.jpg', a: 0,
      s: ['Some medical equipment has been set up in a room.', 'A doctor is examining a patient.', 'A woman is pulling a curtain closed.', 'Some people are sitting in a waiting area.'],
      explain: 'Ảnh: trong một phòng bệnh viện, một người đàn ông đeo khẩu trang đứng cạnh một người phụ nữ, bên cạnh là các máy móc y tế và một màn hình theo dõi đặt trên xe đẩy. (A) đúng: "medical equipment has been set up" = thiết bị y tế đã được lắp đặt. (B) không thấy bệnh nhân nào đang được khám. (C) có rèm trong ảnh nhưng không ai đang kéo. (D) mọi người đều đứng, không ai ngồi chờ.' },
    { n: 5, img: 'img/toeic/t7-p1-5.jpg', a: 2,
      s: ['Some musicians are packing up their instruments.', 'A woman is playing a drum.', 'Some people are seated outdoors.', 'A man is tuning a guitar.'],
      explain: 'Ảnh: dưới một mái lều ngoài trời, các thành viên ban nhạc mặc áo xanh ngồi trên ghế bên bãi cỏ, cạnh họ là một chiếc trống lớn và kèn đồng; một bà cụ đang mỉm cười nhìn về phía máy ảnh. (C) đúng: "seated outdoors" = ngồi ngoài trời. (A) không ai đang cất nhạc cụ. (B) bà cụ ngồi cạnh trống nhưng không chơi trống. (D) không có cây đàn guitar nào.' },
    { n: 6, img: 'img/toeic/t7-p1-6.jpg', a: 3,
      s: ['Some posters are being hung on a wall.', 'A worker is repairing an escalator.', 'Both escalators are crowded with people.', 'Some people are riding an escalator.'],
      explain: 'Ảnh: đường hầm ga tàu điện ngầm với hai thang cuốn dài song song; thang bên phải có nhiều người đang đi, thang bên trái trống; trên tường có các tấm áp phích quảng cáo. (D) đúng: "riding an escalator" = đi thang cuốn. (A) áp phích đã treo sẵn, không ai đang treo. (B) không thấy công nhân sửa thang. (C) sai vì thang bên trái không có người.' },
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
    id: 'tl7p1', test: 7, part: 1, title: 'Photographs', titleVi: 'Mô tả tranh',
    speakers: { N: { name: 'Narrator', accent: 'en-US', gender: 'm' } },
    script: p1script,
    groups: [
      { type: 'mcq', photo: true, instr: 'Look at the photograph and choose the statement that best describes it (A, B, C or D).',
        items: P1.map(it => ({ n: it.n, img: it.img, q: '', options: it.s, a: it.a, cue: it.s[it.a], explain: it.explain })) },
    ],
    vocab: [
      { w: 'pour', vi: 'rót' },
      { w: 'crate', vi: 'thùng (gỗ) đựng hàng' },
      { w: 'be equipped with', vi: 'được trang bị' },
      { w: 'medical equipment', vi: 'thiết bị y tế' },
      { w: 'seated outdoors', vi: 'ngồi ngoài trời' },
      { w: 'ride an escalator', vi: 'đi thang cuốn' },
    ],
  });

  /* ---------------- Part 2: Question–Response (Q7–21) ---------------- */
  const P2 = [
    { n: 7, qs: 'A', rs: 'B', q: 'Where should I leave these returned packages?',
      r: ['By Thursday at the latest.', 'On the cart beside the loading dock.', 'Yes, I packed them myself.'], a: 1,
      explain: 'Câu hỏi "Where" (ở đâu) → nêu vị trí: "On the cart beside the loading dock" (trên xe đẩy cạnh khu bốc dỡ hàng). "By Thursday at the latest" trả lời thời hạn (When). "Yes, I packed them myself" trả lời Yes cho câu hỏi Wh- và bẫy âm "packages" – "packed".' },
    { n: 8, qs: 'B', rs: 'C', q: 'When is the inspection of the apartment on Hargrove Road?',
      r: ['A two-bedroom unit.', 'The inspector was very thorough.', 'Tomorrow at ten thirty.'], a: 2,
      explain: 'Câu hỏi "When" (khi nào) → cần mốc thời gian: "Tomorrow at ten thirty" (10 giờ 30 sáng mai). "A two-bedroom unit" chỉ mô tả căn hộ. "The inspector was very thorough" bẫy âm "inspection" – "inspector" và nói về việc đã qua.' },
    { n: 9, qs: 'C', rs: 'A', q: "Who's responsible for updating the patient records?",
      r: ["That's Ms. Okonjo's job.", 'He recorded the meeting.', 'Twice a week, usually.'], a: 0,
      explain: 'Câu hỏi "Who" (ai) → chỉ ra người cụ thể: "That\'s Ms. Okonjo\'s job" (đó là việc của chị Okonjo). "He recorded the meeting" bẫy âm "records" (hồ sơ) – "recorded" (ghi âm). "Twice a week, usually" trả lời tần suất (How often).' },
    { n: 10, qs: 'D', rs: 'B', q: 'Why is the server room so warm today?',
      r: ['Please serve the guests first.', 'The air conditioner stopped working overnight.', 'About twenty-eight degrees.'], a: 1,
      explain: 'Câu hỏi "Why" (tại sao) → nêu lý do: "The air conditioner stopped working overnight" (máy điều hòa ngừng chạy trong đêm). "Please serve the guests first" bẫy âm "server" – "serve". "About twenty-eight degrees" trả lời nhiệt độ bao nhiêu, không giải thích nguyên nhân.' },
    { n: 11, qs: 'A', rs: 'D', q: 'Would you like to sign the lease now or take it home to review?',
      r: ['The lease ends in May.', 'Yes, I signed up for it.', "I'd prefer to read it at home first."], a: 2,
      explain: 'Câu hỏi lựa chọn "A or B?" → chọn một phương án: "I\'d prefer to read it at home first" (tôi muốn mang về nhà đọc trước). "The lease ends in May" lặp từ "lease" nhưng nói về thời hạn hợp đồng. "Yes, I signed up for it" trả lời Yes/No cho câu hỏi lựa chọn và bẫy âm "sign" – "signed up" (đăng ký).' },
    { n: 12, qs: 'B', rs: 'A', q: 'How many pallets are we sending to the Winnipeg warehouse?',
      r: ['Forty-two, according to the order.', 'On a refrigerated truck.', 'I sent them an e-mail yesterday.'], a: 0,
      explain: '"How many" hỏi số lượng → "Forty-two, according to the order" (42 kiện, theo đơn hàng). "On a refrigerated truck" trả lời phương tiện (How). "I sent them an e-mail yesterday" bẫy âm "sending" – "sent".' },
    { n: 13, qs: 'C', rs: 'D', q: "Didn't the software license expire last week?",
      r: ["A driver's license.", "No, it's valid until December.", 'The week went by quickly.'], a: 1,
      explain: 'Câu hỏi phủ định "Didn\'t … expire…?" (giấy phép phần mềm chẳng phải đã hết hạn tuần trước sao?) → "No, it\'s valid until December" (không, nó còn hiệu lực đến tháng 12). "A driver\'s license" lặp từ "license" với nghĩa bằng lái xe. "The week went by quickly" lặp từ "week".' },
    { n: 14, qs: 'D', rs: 'C', q: 'The tenants in unit 4B are complaining about the noise again.',
      r: ['The unit price is lower.', "No, it isn't for sale.", "I'll speak to the residents upstairs."], a: 2,
      explain: 'Câu trần thuật nêu vấn đề (người thuê căn 4B lại phàn nàn về tiếng ồn) → đưa ra hành động giải quyết: "I\'ll speak to the residents upstairs" (tôi sẽ nói chuyện với cư dân tầng trên). "The unit price is lower" lặp từ "unit" với nghĩa đơn giá. "No, it isn\'t for sale" không liên quan đến tiếng ồn.' },
    { n: 15, qs: 'A', rs: 'C', q: 'Is Dr. Sandoval seeing patients this afternoon?',
      r: ['See you this afternoon.', "She's at a medical conference until Friday.", 'The patients filled out the forms.'], a: 1,
      explain: 'Câu hỏi Yes/No → trả lời gián tiếp: "She\'s at a medical conference until Friday" (bác sĩ dự hội nghị y khoa đến thứ Sáu – tức là chiều nay không khám). "See you this afternoon" bẫy âm "seeing" – "see" và lặp "this afternoon". "The patients filled out the forms" lặp từ "patients".' },
    { n: 16, qs: 'B', rs: 'D', q: 'Could you help me install the new printer driver?',
      r: ['Sure, give me five minutes.', 'The driver is waiting outside.', 'It prints in color.'], a: 0,
      explain: 'Lời nhờ vả "Could you help me…?" → đồng ý: "Sure, give me five minutes" (được, cho tôi năm phút). "The driver is waiting outside" bẫy nghĩa "driver" (trình điều khiển máy in) – "driver" (tài xế). "It prints in color" chỉ liên tưởng đến máy in.' },
    { n: 17, qs: 'C', rs: 'B', q: 'Which of the listings did the buyers like best?',
      r: ['They listened carefully.', 'Most of them were sold.', 'The one with the large backyard.'], a: 2,
      explain: '"Which of the listings" (căn nào trong số nhà đang rao bán) → "The one with the large backyard" (căn có sân sau rộng; "the one" = the listing). "They listened carefully" bẫy âm "listings" – "listened". "Most of them were sold" không trả lời người mua thích căn nào.' },
    { n: 18, qs: 'D', rs: 'A', q: "Why don't we offer our patients online check-in?",
      r: ['Because it was checked twice.', 'Good idea. It would shorten the line at reception.', "Online, at nine o'clock."], a: 1,
      explain: '"Why don\'t we…?" là lời ĐỀ NGHỊ (sao ta không cho bệnh nhân làm thủ tục trực tuyến?) → đồng ý: "Good idea. It would shorten the line at reception" (ý hay, sẽ bớt xếp hàng ở quầy lễ tân). "Because it was checked twice" là bẫy trả lời "Why" bằng "Because" và bẫy âm "check-in" – "checked". "Online, at nine o\'clock" lặp từ "online".' },
    { n: 19, qs: 'A', rs: 'B', q: "The courier already picked up the contracts, didn't he?",
      r: ['Yes, about an hour ago.', 'Pick any color you like.', 'The contractor is here.'], a: 0,
      explain: 'Câu hỏi đuôi "…, didn\'t he?" (người giao hàng đã lấy hợp đồng rồi phải không?) → "Yes, about an hour ago" (rồi, khoảng một tiếng trước). "Pick any color you like" lặp âm "picked up" (lấy) – "pick" (chọn). "The contractor is here" bẫy âm "contracts" – "contractor" (nhà thầu).' },
    { n: 20, qs: 'B', rs: 'C', q: "My laptop won't connect to the office Wi-Fi.",
      r: ["It's a very light laptop.", 'Have you tried restarting it?', 'The office opens at eight.'], a: 1,
      explain: 'Câu trần thuật nêu sự cố (máy tính không kết nối được Wi-Fi) → đưa ra gợi ý: "Have you tried restarting it?" (anh đã thử khởi động lại chưa?). "It\'s a very light laptop" lặp từ "laptop" nhưng nói về trọng lượng. "The office opens at eight" lặp từ "office".' },
    { n: 21, qs: 'C', rs: 'A', q: 'How was the open house on Saturday?',
      r: ['The door is open.', "It's on Saturday.", 'We had over forty visitors.'], a: 2,
      explain: '"How was…?" hỏi diễn biến, kết quả của buổi mở cửa xem nhà → "We had over forty visitors" (có hơn 40 người đến xem). "The door is open" lặp từ "open". "It\'s on Saturday" lặp "Saturday" và trả lời thời gian, trong khi sự kiện đã diễn ra.' },
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
    id: 'tl7p2', test: 7, part: 2, title: 'Question–Response', titleVi: 'Hỏi – đáp',
    speakers: {
      A: { name: 'Fergus', accent: 'en-GB', gender: 'm' },
      B: { name: 'Anouk', accent: 'en-US', gender: 'f' },
      C: { name: 'Rhys', accent: 'en-AU', gender: 'm' },
      D: { name: 'Philippa', accent: 'en-GB', gender: 'f' },
    },
    script: p2script,
    groups: [
      { type: 'mcq', instr: 'Listen and choose the best response (A, B or C).',
        items: P2.map(it => ({ n: it.n, q: 'Mark your answer.', options: ['A', 'B', 'C'], a: it.a, cue: it.r[it.a], explain: it.explain })) },
    ],
    vocab: [
      { w: 'loading dock', vi: 'khu bốc dỡ hàng' },
      { w: 'lease', vi: 'hợp đồng thuê (nhà, văn phòng)' },
      { w: 'pallet', vi: 'tấm kê hàng, kiện hàng trên pallet' },
      { w: 'listing', vi: 'bất động sản được rao bán/cho thuê' },
      { w: 'courier', vi: 'người/dịch vụ chuyển phát' },
      { w: 'open house', vi: 'buổi mở cửa cho khách xem nhà' },
    ],
  });

  /* ---------------- Part 3: Conversations (Q32–46) ---------------- */
  T.listening.push({
    id: 'tl7p3', test: 7, part: 3, title: 'Conversations', titleVi: 'Hội thoại',
    speakers: {
      W1: { name: 'Paloma', accent: 'en-US', gender: 'f' },
      M1: { name: 'Ingmar', accent: 'en-GB', gender: 'm' },
      M2: { name: 'Cyrus', accent: 'en-US', gender: 'm' },
      W2: { name: 'Noor', accent: 'en-GB', gender: 'f' },
      M3: { name: 'Thaddeus', accent: 'en-AU', gender: 'm' },
      W3: { name: 'Henrietta', accent: 'en-AU', gender: 'f' },
      M4: { name: 'Crispin', accent: 'en-GB', gender: 'm' },
      M5: { name: 'Ewan', accent: 'en-US', gender: 'm' },
      W4: { name: 'Yasmin', accent: 'en-US', gender: 'f' },
      W5: { name: 'Greta', accent: 'en-GB', gender: 'f' },
      W6: { name: 'Constance', accent: 'en-GB', gender: 'f' },
      M6: { name: 'Matteo', accent: 'en-AU', gender: 'm' },
    },
    script: [
      { say: 'Part 3. In this part, you will hear several conversations between two or more people. After each conversation, answer the three questions printed in your test book.' }, { pause: 3 },

      { say: 'Questions 32 through 34 refer to the following conversation.' }, { pause: 1 },
      { s: 'W1', t: 'Galloway Freight, customer service. This is Paloma speaking.' },
      { s: 'M1', t: "Hi, Paloma. This is Ingmar Sallis from Bluefern Ceramics. Our shipment of pottery from Porto was supposed to arrive at our warehouse yesterday, but it still hasn't come. Could you tell me what's going on?" },
      { s: 'W1', t: 'Let me look up your order. It looks like the container is being held at customs because the commercial invoice is missing from the paperwork.' },
      { s: 'M1', t: 'Oh, I thought our supplier had sent that. What should I do?' },
      { s: 'W1', t: "If you upload a copy to our online portal today, customs should release the container tomorrow. And since the delay wasn't your fault, I'll waive the storage fee for the extra day at the port." },
      { s: 'M1', t: "I appreciate that. I'll contact the supplier right away." },
      { pause: 6 },

      { say: 'Questions 35 through 37 refer to the following conversation with three speakers.' }, { pause: 1 },
      { s: 'M2', t: "Noor, Thaddeus, thanks for meeting with me. I've been looking at last month's numbers, and almost fifteen percent of our patients didn't show up for their appointments." },
      { s: 'W2', t: 'That matches what I see at the front desk. When I call them afterward, most of them say they simply forgot.' },
      { s: 'M3', t: "Our scheduling software can actually send patients a text message reminder the day before their appointment. We just never turned that feature on. It costs an extra thirty dollars a month." },
      { s: 'M2', t: "That's a small price compared with the cost of empty appointment slots. Let's try it for three months and see if it helps." },
      { s: 'W2', t: "Then I'll start asking patients to confirm their mobile phone numbers when they check in. A lot of the numbers in our system are out of date." },
      { pause: 6 },

      { say: 'Questions 38 through 40 refer to the following conversation.' }, { pause: 1 },
      { s: 'W3', t: 'Crispin, the Kowalczyk family called this morning. They loved the house on Juniper Lane, but they think the price is too high.' },
      { s: 'M4', t: 'The seller already lowered it once in March.' },
      { s: 'W3', t: 'I know, but the inspection report showed that the roof needs major repairs. That could cost the buyers about twelve thousand dollars.' },
      { s: 'M4', t: "Then let's suggest that they offer the asking price minus the cost of the roof repairs. The seller might accept that." },
      { s: 'W3', t: "Good idea. I'll get a written estimate from a roofing company before we make the offer." },
      { s: 'M4', t: "And I'll call the seller's agent to find out how flexible they are." },
      { pause: 6 },

      { say: 'Questions 41 through 43 refer to the following conversation with three speakers.' }, { pause: 1 },
      { s: 'M5', t: "Yasmin, Greta, we start moving Quenby Law's files to the cloud this Friday night. Is everything ready?" },
      { s: 'W4', t: "Almost. Our test transfers went well, but their old accounting database is much larger than we expected, so the move will take about two extra hours." },
      { s: 'M5', t: "That's fine, as long as everything is finished before their staff log in on Monday at eight." },
      { s: 'W5', t: "I've also scheduled two training sessions for their employees next Tuesday, to show them how to find their files in the new system." },
      { s: 'M5', t: 'Good. Could you also put together a one-page guide that they can keep at their desks?' },
      { s: 'W5', t: "Sure. I'll have a draft ready for you by Thursday." },
      { pause: 6 },

      { say: 'Questions 44 through 46 refer to the following conversation.' }, { pause: 1 },
      { s: 'W6', t: 'Hi. I need to send these product samples to a client in Kuala Lumpur. Can they get there by tomorrow?' },
      { s: 'M6', t: "I'm afraid we don't offer overnight delivery for international packages. The fastest option is our two-day express service." },
      { s: 'W6', t: "Hmm. My client's presentation is on Thursday morning, so two days should still work." },
      { s: 'M6', t: "Then it'll arrive on Wednesday afternoon. Since the box contains samples, you'll also need to complete a customs declaration describing what's inside." },
      { s: 'W6', t: 'No problem. How much will it cost?' },
      { s: 'M6', t: 'That depends on the weight. Could you put the box on the scale for me?' },
      { pause: 6 },
    ],
    groups: [
      { type: 'mcq', instr: 'Questions 32–34. Choose the best answer (A, B, C or D).',
        items: [
          { n: 32, q: 'Why is the man calling?', options: ['To schedule a pickup', 'To ask about a late shipment', 'To order more pottery', 'To complain about damaged goods'], a: 1, cue: "Our shipment of pottery from Porto was supposed to arrive at our warehouse yesterday, but it still hasn't come.",
            explain: 'Anh gọi vì lô gốm từ Porto "was supposed to arrive … yesterday, but it still hasn\'t come" (lẽ ra phải đến hôm qua nhưng vẫn chưa tới) → hỏi về lô hàng bị trễ. Anh không đặt thêm hàng, không hẹn lấy hàng và hàng cũng không bị hỏng.' },
          { n: 33, q: 'According to the woman, why is the container being held?', options: ['A fee has not been paid.', 'The port is closed.', 'A document is missing.', 'The address is incorrect.'], a: 2, cue: 'the commercial invoice is missing from the paperwork',
            explain: 'Container bị hải quan giữ lại "because the commercial invoice is missing from the paperwork" (vì bộ chứng từ thiếu hóa đơn thương mại) → thiếu một chứng từ. Phí lưu kho được miễn chứ không phải chưa thanh toán; cảng vẫn hoạt động.' },
          { n: 34, q: 'What does the woman offer to do?', options: ['Waive a fee', 'Contact the supplier', 'Send a new container', 'Deliver on the weekend'], a: 0, cue: "I'll waive the storage fee for the extra day at the port",
            explain: '"I\'ll waive the storage fee for the extra day at the port" (tôi sẽ miễn phí lưu kho cho ngày nằm thêm ở cảng) → miễn một khoản phí. Người liên hệ nhà cung cấp là người đàn ông ("I\'ll contact the supplier"), nên "Contact the supplier" là bẫy.' },
        ] },
      { type: 'mcq', instr: 'Questions 35–37. Choose the best answer (A, B, C or D).',
        items: [
          { n: 35, q: 'What problem are the speakers discussing?', options: ['The clinic is short of doctors.', 'Patients are missing appointments.', 'The waiting room is too crowded.', 'A computer system has crashed.'], a: 1, cue: "almost fifteen percent of our patients didn't show up for their appointments",
            explain: '"almost fifteen percent of our patients didn\'t show up for their appointments" (gần 15% bệnh nhân không đến theo lịch hẹn) → bệnh nhân lỡ hẹn. Phòng khám không thiếu bác sĩ; phần mềm vẫn hoạt động, chỉ chưa bật tính năng nhắc lịch.' },
          { n: 36, q: 'What does Thaddeus say about the scheduling software?', options: ['It is difficult to use.', 'It was recently installed.', 'It has a feature that has not been used.', 'It will be replaced next month.'], a: 2, cue: 'We just never turned that feature on.',
            explain: 'Thaddeus nói phần mềm có thể gửi tin nhắn nhắc lịch nhưng "We just never turned that feature on" (chúng ta chưa bao giờ bật tính năng đó) → có tính năng chưa được sử dụng. Không có thông tin phần mềm khó dùng, mới cài hay sắp bị thay.' },
          { n: 37, q: 'What does the woman say she will start doing?', options: ['Calling patients the day before', 'Asking patients to confirm phone numbers', 'Working longer hours', 'Training new receptionists'], a: 1, cue: "I'll start asking patients to confirm their mobile phone numbers when they check in",
            explain: 'Noor nói "I\'ll start asking patients to confirm their mobile phone numbers when they check in" (tôi sẽ đề nghị bệnh nhân xác nhận số di động khi làm thủ tục) vì nhiều số đã cũ → xác nhận số điện thoại. Tin nhắn nhắc lịch do phần mềm tự gửi; cô chỉ gọi cho bệnh nhân SAU khi họ lỡ hẹn.' },
        ] },
      { type: 'mcq', instr: 'Questions 38–40. Choose the best answer (A, B, C or D).',
        items: [
          { n: 38, q: 'Who most likely are the speakers?', options: ['Bank employees', 'Home inspectors', 'Real estate agents', 'Roofers'], a: 2, cue: "I'll call the seller's agent to find out how flexible they are",
            explain: 'Họ bàn về gia đình khách hàng muốn mua nhà, giá chào bán, việc trả giá và gọi cho "the seller\'s agent" (người môi giới bên bán) → họ là nhân viên môi giới bất động sản. Báo cáo kiểm định và công ty sửa mái chỉ là bên thứ ba được nhắc đến.' },
          { n: 39, q: 'Why does the man say, "The seller already lowered it once in March"?', options: ['To suggest that another price cut may be difficult', 'To explain why a sale was delayed', 'To recommend a different house', 'To correct a mistake in a listing'], a: 0, cue: 'The seller already lowered it once in March.',
            explain: 'Khách chê giá cao; người đàn ông đáp người bán đã giảm giá một lần hồi tháng 3 → ngụ ý khó thuyết phục người bán giảm tiếp. Người phụ nữ đáp "I know, but…" rồi đưa ra lý do (mái nhà cần sửa) để vẫn đề nghị giảm giá. Không có chuyện trì hoãn giao dịch hay sửa lỗi tin rao.' },
          { n: 40, q: 'What will the woman do?', options: ['Repair a roof', 'Get a repair estimate', "Call the seller's agent", 'Schedule another viewing'], a: 1, cue: "I'll get a written estimate from a roofing company before we make the offer",
            explain: '"I\'ll get a written estimate from a roofing company" (tôi sẽ lấy bảng báo giá bằng văn bản từ công ty sửa mái) → lấy báo giá sửa chữa. Người gọi cho môi giới bên bán là người đàn ông; cô không tự sửa mái.' },
        ] },
      { type: 'mcq', instr: 'Questions 41–43. Choose the best answer (A, B, C or D).',
        items: [
          { n: 41, q: 'What project are the speakers discussing?', options: ['Opening a new law office', 'Hiring accounting staff', 'Repairing office computers', "Moving a client's files to the cloud"], a: 3, cue: "we start moving Quenby Law's files to the cloud this Friday night",
            explain: '"we start moving Quenby Law\'s files to the cloud this Friday night" (tối thứ Sáu này bắt đầu chuyển dữ liệu của công ty luật Quenby lên đám mây) → chuyển dữ liệu khách hàng lên đám mây. Quenby Law là khách hàng, không phải văn phòng mới; "accounting database" chỉ là cơ sở dữ liệu, không liên quan tuyển kế toán.' },
          { n: 42, q: 'According to Yasmin, why will the task take longer than planned?', options: ['A database is larger than expected.', 'Some staff are on vacation.', 'The internet connection is slow.', 'A contract has not been signed.'], a: 0, cue: 'their old accounting database is much larger than we expected',
            explain: 'Yasmin cho biết "their old accounting database is much larger than we expected, so the move will take about two extra hours" → cơ sở dữ liệu lớn hơn dự kiến nên mất thêm khoảng hai giờ. Các lý do khác không được nhắc đến.' },
          { n: 43, q: 'What does the man ask Greta to do?', options: ['Lead a training session', 'Create a short reference guide', 'Test a database', 'Contact the law firm'], a: 1, cue: 'Could you also put together a one-page guide that they can keep at their desks?',
            explain: 'Ewan đề nghị "put together a one-page guide that they can keep at their desks" (soạn một bản hướng dẫn một trang để nhân viên để ở bàn) → tạo tài liệu hướng dẫn ngắn. Các buổi đào tạo Greta đã tự lên lịch từ trước, không phải điều được yêu cầu – bẫy.' },
        ] },
      { type: 'mcq', instr: 'Questions 44–46. Choose the best answer (A, B, C or D).',
        items: [
          { n: 44, q: 'What does the woman want to do?', options: ['Pick up some samples', 'Open a business account', 'Send a package overseas', 'Return a damaged item'], a: 2, cue: 'I need to send these product samples to a client in Kuala Lumpur.',
            explain: 'Cô cần "send these product samples to a client in Kuala Lumpur" (gửi hàng mẫu cho khách ở Kuala Lumpur) → gửi bưu kiện ra nước ngoài. Cô mang hàng mẫu đến để gửi, không phải đến nhận.' },
          { n: 45, q: 'What problem does the man mention?', options: ['A form has been lost.', 'A service is not available.', 'A package is too heavy.', 'A price has increased.'], a: 1, cue: "we don't offer overnight delivery for international packages",
            explain: '"we don\'t offer overnight delivery for international packages" (không có dịch vụ giao qua đêm cho hàng quốc tế) → dịch vụ cô muốn không có. Trọng lượng chỉ dùng để tính phí, không có thông tin hàng quá nặng.' },
          { n: 46, q: 'What does the man ask the woman to do?', options: ['Show some identification', 'Come back on Thursday', 'Describe a presentation', 'Place a box on a scale'], a: 3, cue: 'Could you put the box on the scale for me?',
            explain: '"Could you put the box on the scale for me?" (chị đặt hộp lên cân giúp tôi nhé) → đặt hộp lên cân để tính cước. Thứ Năm là ngày khách hàng của cô thuyết trình; anh không yêu cầu giấy tờ tùy thân.' },
        ] },
    ],
    vocab: [
      { w: 'customs', vi: 'hải quan' },
      { w: 'commercial invoice', vi: 'hóa đơn thương mại' },
      { w: 'waive a fee', vi: 'miễn một khoản phí' },
      { w: 'no-show / not show up', vi: 'không đến (theo lịch hẹn)' },
      { w: 'asking price', vi: 'giá chào bán' },
      { w: 'estimate', vi: 'bản ước tính chi phí, báo giá' },
      { w: 'customs declaration', vi: 'tờ khai hải quan' },
      { w: 'out of date', vi: 'lỗi thời, không còn đúng' },
    ],
  });

  /* ---------------- Part 4: Talks (Q71–82) ---------------- */
  T.listening.push({
    id: 'tl7p4', test: 7, part: 4, title: 'Talks', titleVi: 'Bài nói ngắn',
    speakers: {
      A: { name: 'Supervisor', accent: 'en-AU', gender: 'm' },
      B: { name: 'Clarissa', accent: 'en-GB', gender: 'f' },
      C: { name: 'Announcer', accent: 'en-US', gender: 'm' },
      D: { name: 'Ottilie', accent: 'en-US', gender: 'f' },
    },
    script: [
      { say: 'Part 4. In this part, you will hear several short talks given by a single speaker. After each talk, answer the three questions printed in your test book.' }, { pause: 3 },

      { say: 'Questions 71 through 73 refer to the following talk.' }, { pause: 1 },
      { s: 'A', t: 'Good morning, everyone, and welcome to the Monday briefing here at the Tamsworth Distribution Center.' },
      { s: 'A', t: "Starting with today's shift, we're replacing the old barcode scanners with new handheld devices. They're lighter, and they'll show you the exact shelf location of every item you need to pick." },
      { s: 'A', t: "Two trainers from the manufacturer are with us today. They'll be walking around the warehouse floor all morning, so if you have trouble with the new devices, just wave one of them over." },
      { s: 'A', t: 'One more thing. Last week, a safety inspector noticed several workers on the loading dock without their safety vests. Please remember that vests must be worn at all times in the loading area.' },
      { s: 'A', t: "All right, let's have a safe and productive week." },
      { pause: 6 },

      { say: 'Questions 74 through 76 refer to the following telephone message.' }, { pause: 1 },
      { s: 'B', t: 'Hello, this message is for Mr. Anselm Petrakis. This is Clarissa calling from Oakhaven Medical Group.' },
      { s: 'B', t: "I'm calling about your appointment with Dr. Lyndhurst on Thursday at two P.M. Unfortunately, Dr. Lyndhurst will be away at a training course that day, so we need to change your appointment." },
      { s: 'B', t: 'We can offer you the same time on Thursday with Dr. Amadi, or you can see Dr. Lyndhurst next Tuesday morning. Please call us back at five five five, zero one eight three, to let us know which you prefer. Our schedule is filling up quickly.' },
      { s: 'B', t: 'Also, our records show that your insurance information is two years old. When you come in, please bring your current insurance card so we can update your file. Thank you, and have a good day.' },
      { pause: 6 },

      { say: 'Questions 77 through 79 refer to the following advertisement.' }, { pause: 1 },
      { s: 'C', t: 'Is your small business spending too much time fixing computer problems? Let Quillstone I T Services handle them for you.' },
      { s: 'C', t: 'For one low monthly fee, our certified technicians will monitor your network around the clock, install security updates automatically, and back up your files every night.' },
      { s: 'C', t: "And if something does go wrong, our help desk can usually fix the problem remotely in under thirty minutes. There's no need to wait for a technician to visit your office." },
      { s: 'C', t: 'Right now, new customers who sign a one-year contract will receive a free security check of their entire network. To schedule a consultation, call us today or visit quillstone dot com.' },
      { pause: 6 },

      { say: 'Questions 80 through 82 refer to the following talk.' }, { pause: 1 },
      { s: 'D', t: "Hello, everyone, and thank you for coming to today's tour of Saltmere Commons. My name is Ottilie, and I'm the leasing manager here." },
      { s: 'D', t: 'Saltmere Commons was completed just last month, and it is the first apartment building in the city to get all of its electricity from solar panels on the roof.' },
      { s: 'D', t: 'That means our residents pay about forty percent less for electricity than people living in a typical building of this size.' },
      { s: 'D', t: "In a moment, we'll take the elevator to the sixth floor, where you can see our model two-bedroom apartment. After that, we'll stop by the fitness room and the bicycle storage area." },
      { s: 'D', t: 'And if you decide to apply today, the application fee will be waived.' },
      { pause: 6 },
    ],
    groups: [
      { type: 'mcq', instr: 'Questions 71–73. Choose the best answer (A, B, C or D).',
        items: [
          { n: 71, q: 'Where does the talk most likely take place?', options: ['At an electronics store', 'At a training center', 'At a distribution center', 'At a factory that makes scanners'], a: 2, cue: 'welcome to the Monday briefing here at the Tamsworth Distribution Center',
            explain: '"the Monday briefing here at the Tamsworth Distribution Center", cùng các chi tiết "warehouse floor", "loading dock", "shelf location" → bài nói diễn ra tại trung tâm phân phối (kho hàng). Nhà sản xuất máy quét chỉ cử người đến hướng dẫn – bẫy cho "At a factory that makes scanners".' },
          { n: 72, q: 'What change does the speaker announce?', options: ['New handheld devices will be used.', 'The warehouse will close earlier.', 'A new shift will be added.', 'Some shelves will be moved.'], a: 0, cue: "we're replacing the old barcode scanners with new handheld devices",
            explain: '"we\'re replacing the old barcode scanners with new handheld devices" (thay máy quét mã vạch cũ bằng thiết bị cầm tay mới) → sẽ dùng thiết bị cầm tay mới. Kệ hàng không bị di chuyển – thiết bị chỉ hiển thị vị trí kệ.' },
          { n: 73, q: 'What does the speaker remind the listeners to do?', options: ['Attend a training session', 'Report damaged items', 'Return their old scanners', 'Wear safety vests'], a: 3, cue: 'vests must be worn at all times in the loading area',
            explain: '"Please remember that vests must be worn at all times in the loading area" (luôn phải mặc áo bảo hộ ở khu bốc xếp) → nhắc mặc áo bảo hộ. Người hướng dẫn sẽ đi quanh kho để hỗ trợ khi cần, không có buổi đào tạo bắt buộc.' },
        ] },
      { type: 'mcq', instr: 'Questions 74–76. Choose the best answer (A, B, C or D).',
        items: [
          { n: 74, q: 'Why is the speaker calling?', options: ['To confirm a payment', 'To change an appointment', 'To share some test results', 'To introduce a new doctor'], a: 1, cue: 'so we need to change your appointment',
            explain: 'Bác sĩ Lyndhurst vắng mặt hôm thứ Năm "so we need to change your appointment" (nên cần đổi lịch hẹn của anh) → gọi để đổi lịch hẹn. Bác sĩ Amadi chỉ là lựa chọn thay thế, không phải bác sĩ mới được giới thiệu.' },
          { n: 75, q: 'Why does the speaker say, "Our schedule is filling up quickly"?', options: ['To encourage the listener to respond soon', 'To explain why a doctor is busy', 'To apologize for a long wait', 'To suggest visiting another clinic'], a: 0, cue: 'Please call us back at five five five, zero one eight three, to let us know which you prefer. Our schedule is filling up quickly.',
            explain: 'Ngay sau khi đề nghị gọi lại để chọn lịch, chị nói lịch hẹn đang kín dần → ngụ ý thúc giục người nghe trả lời sớm kẻo hết chỗ. Bác sĩ Lyndhurst vắng vì đi học, không phải vì bận khám; không có lời xin lỗi hay gợi ý đến phòng khám khác.' },
          { n: 76, q: 'What is the listener asked to bring?', options: ['A list of medications', 'A completed form', 'An insurance card', 'A payment receipt'], a: 2, cue: 'please bring your current insurance card so we can update your file',
            explain: '"please bring your current insurance card so we can update your file" (mang theo thẻ bảo hiểm hiện tại để cập nhật hồ sơ) → thẻ bảo hiểm. Danh sách thuốc, biểu mẫu hay biên lai không được nhắc đến.' },
        ] },
      { type: 'mcq', instr: 'Questions 77–79. Choose the best answer (A, B, C or D).',
        items: [
          { n: 77, q: 'What is being advertised?', options: ['A computer store', 'An office cleaning company', 'A software training course', 'A technical support service'], a: 3, cue: 'Let Quillstone I T Services handle them for you.',
            explain: 'Quillstone IT Services nhận xử lý sự cố máy tính, giám sát mạng, cài bản cập nhật bảo mật và sao lưu dữ liệu cho doanh nghiệp nhỏ → dịch vụ hỗ trợ kỹ thuật (IT). Họ không bán máy tính hay mở khóa đào tạo phần mềm.' },
          { n: 78, q: 'According to the speaker, how are most problems solved?', options: ['By replacing equipment', 'By sending a technician', 'Through remote assistance', 'Through online tutorials'], a: 2, cue: 'our help desk can usually fix the problem remotely in under thirty minutes',
            explain: '"our help desk can usually fix the problem remotely in under thirty minutes" (bộ phận hỗ trợ thường sửa lỗi từ xa trong chưa đến 30 phút) → hỗ trợ từ xa. Câu "There\'s no need to wait for a technician to visit" loại trừ phương án cử kỹ thuật viên đến.' },
          { n: 79, q: 'How can new customers receive a free security check?', options: ['By signing a one-year contract', 'By visiting a Web site', 'By referring another business', 'By calling before Friday'], a: 0, cue: 'new customers who sign a one-year contract will receive a free security check',
            explain: '"new customers who sign a one-year contract will receive a free security check" → ký hợp đồng một năm. Gọi điện hay vào trang web chỉ là cách đặt lịch tư vấn, không phải điều kiện nhận ưu đãi; không có hạn chót thứ Sáu.' },
        ] },
      { type: 'mcq', instr: 'Questions 80–82. Choose the best answer (A, B, C or D).',
        items: [
          { n: 80, q: 'Who is the speaker?', options: ['A leasing manager', 'An architect', 'A building inspector', 'An electrician'], a: 0, cue: "I'm the leasing manager here",
            explain: 'Người nói tự giới thiệu: "My name is Ottilie, and I\'m the leasing manager here" → quản lý cho thuê. Các tấm pin mặt trời hay việc xây dựng tòa nhà không cho thấy cô là kiến trúc sư hay thợ điện.' },
          { n: 81, q: 'What is special about Saltmere Commons?', options: ['It has the largest apartments in the city.', 'It is powered entirely by solar energy.', 'It was designed by a famous architect.', 'It offers free bicycle rentals.'], a: 1, cue: 'the first apartment building in the city to get all of its electricity from solar panels on the roof',
            explain: 'Đây là "the first apartment building in the city to get all of its electricity from solar panels" (tòa căn hộ đầu tiên trong thành phố lấy toàn bộ điện từ pin mặt trời) → dùng hoàn toàn năng lượng mặt trời. Khu để xe đạp chỉ là nơi cất xe, không có dịch vụ cho thuê xe miễn phí.' },
          { n: 82, q: 'What will the listeners do next?', options: ['Fill out an application', 'Visit the fitness room', 'Watch a short video', 'View a model apartment'], a: 3, cue: "we'll take the elevator to the sixth floor, where you can see our model two-bedroom apartment",
            explain: '"In a moment, we\'ll take the elevator to the sixth floor, where you can see our model two-bedroom apartment" → tiếp theo đi xem căn hộ mẫu. Phòng thể dục được ghé SAU đó ("After that"); việc nộp đơn chỉ được nhắc như một ưu đãi nếu họ quyết định thuê.' },
        ] },
    ],
    vocab: [
      { w: 'distribution center', vi: 'trung tâm phân phối (kho trung chuyển hàng)' },
      { w: 'handheld device', vi: 'thiết bị cầm tay' },
      { w: 'safety vest', vi: 'áo phản quang bảo hộ' },
      { w: 'insurance card', vi: 'thẻ bảo hiểm' },
      { w: 'around the clock', vi: 'suốt ngày đêm, 24/7' },
      { w: 'remotely', vi: 'từ xa' },
      { w: 'leasing manager', vi: 'quản lý cho thuê (bất động sản)' },
      { w: 'application fee', vi: 'phí nộp hồ sơ' },
    ],
  });
})(typeof self !== 'undefined' ? self : this);
