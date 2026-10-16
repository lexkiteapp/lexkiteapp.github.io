/* TOEIC Speaking & Writing – đề luyện tự biên soạn theo cấu trúc bài thi công khai của ETS (không phải đề thật).
 * Speaking: read (đọc to), respond (trả lời 3 câu hỏi), info (trả lời dựa trên thông tin), opinion (nêu ý kiến).
 * Writing: request (trả lời email), essay (bài nêu ý kiến). Picture tasks sẽ thêm khi có ảnh nội bộ Lexkite.
 * checklist: [{ c: tiêu chí (tiếng Việt – app dịch theo ngôn ngữ người học), ex: ví dụ sửa câu ❌ → ✅ }]. */
(function (g) {
  const S = g.TOEIC_SW = g.TOEIC_SW || { speaking: [], writing: [] };
  const CK_RESP = [
    { c: 'Trả lời đúng trọng tâm câu hỏi ngay câu đầu', ex: '❌ "Well, libraries are very interesting places…" → ✅ "I visit the library about twice a month."' },
    { c: 'Câu hoàn chỉnh, có chủ ngữ – động từ', ex: '❌ "Twice a month. Study." → ✅ "I go twice a month, mostly to study."' },
    { c: 'Có lý do hoặc chi tiết hỗ trợ (đặc biệt câu 30 giây)', ex: '❌ "I prefer stores." → ✅ "I prefer stores because I can try clothes on before I buy them."' },
    { c: 'Phát âm rõ, không ngừng quá lâu giữa các ý', ex: '❌ "I… um… go… um… by bus." → ✅ "I usually go by bus. It takes about twenty minutes."' },
  ];
  const CK_INFO = [
    { c: 'Thông tin chính xác theo bảng (giờ, tên, địa điểm)', ex: '❌ "Registration is at ten." → ✅ "Registration starts at nine a.m. in the lobby."' },
    { c: 'Sửa thông tin sai của người hỏi một cách lịch sự', ex: '❌ "No, you are wrong." → ✅ "Actually, I\'m afraid that\'s not correct. Lunch is included."' },
    { c: 'Câu 10: nêu đủ mọi mục liên quan, có từ nối', ex: '❌ "Workshop at 10:45. Workshop at 2:15." → ✅ "He\'s leading two workshops. The first is at 10:45, and the second starts at 2:15."' },
    { c: 'Giọng lịch sự như nhân viên trả lời điện thoại', ex: '❌ "Read the schedule." → ✅ "Sure, let me check that for you."' },
  ];
  const CK_OP = [
    { c: 'Nêu quan điểm rõ trong câu đầu', ex: '❌ "There are many opinions about this." → ✅ "I strongly believe that salary is less important than learning."' },
    { c: 'Hai lý do, mỗi lý do có giải thích', ex: '❌ "Because it is good. And it is useful." → ✅ "First, … because … Second, …"' },
    { c: 'Ví dụ cụ thể (bản thân, người quen, công ty)', ex: '❌ "Many people think so." → ✅ "For example, my sister took a lower-paid job at a start-up and was promoted within a year."' },
    { c: 'Từ nối rõ ràng và câu kết', ex: '❌ "…and also… and also…" → ✅ "First… In addition… For these reasons, …"' },
    { c: 'Nói liên tục gần đủ 60 giây, ít lặp từ', ex: '❌ Dừng ở giây 30 → ✅ thêm ví dụ hoặc nhắc lại quan điểm bằng từ khác' },
  ];

  /* ───────── SPEAKING · Read a text aloud ───────── */
  S.speaking.push(
    { id: 'tsw-rd1', task: 'read', title: 'Store Announcement', accent: 'en-US', prep: 45, secs: 45,
      text: "Attention, shoppers. Thank you for visiting Greenfield Market. This week only, all fresh fruit and vegetables are fifteen percent off, and customers who spend more than fifty dollars will receive a free reusable shopping bag. Our bakery, deli and seafood counters are open until nine o'clock this evening. If you need help finding an item, please ask any member of our staff, who will be happy to assist you. We appreciate your business.",
      tips: ['Danh sách "bakery, deli and seafood counters": lên giọng ở "bakery", "deli", xuống giọng ở "seafood counters".', '"fifteen" nhấn âm cuối /fɪfˈtiːn/, "fifty" nhấn âm đầu /ˈfɪfti/ – đọc sai sẽ đổi nghĩa con số.', 'Ngắt hơi sau "This week only," và trước mệnh đề "who will be happy to assist you".'] },
    { id: 'tsw-rd2', task: 'read', title: 'Radio Traffic Report', accent: 'en-GB', prep: 45, secs: 45,
      text: "Good morning, and here is your traffic update for the city centre. Because of road works on Bridge Street, drivers are advised to use Mill Road or the ring road instead. Delays of up to twenty minutes are expected until early afternoon. Trains on the northern line are running normally, but buses on routes six, nine and twelve may be slightly late. For the latest information, visit our website or follow us on social media.",
      tips: ['Câu lựa chọn "Mill Road or the ring road": lên giọng ở vế đầu, xuống giọng ở vế sau.', 'Liệt kê số "six, nine and twelve": ngắt nhẹ giữa các số, xuống giọng ở "twelve".', '"advised" đọc /ədˈvaɪzd/ (đuôi -ed là /d/), "expected" /ɪkˈspektɪd/ (đuôi -ed là /ɪd/).'] },
    { id: 'tsw-rd3', task: 'read', title: 'Office Voicemail Greeting', accent: 'en-US', prep: 45, secs: 45,
      text: "You have reached the offices of Carter and Lee Accounting. Our office hours are Monday through Friday, from eight thirty a.m. to five thirty p.m. If you are calling about an existing appointment, please press one. To speak to an accountant about tax returns, payroll or business planning, please press two. Otherwise, leave your name, phone number and a brief message after the tone, and we will return your call within one business day.",
      tips: ['Đọc giờ tự nhiên: "eight thirty a.m." /eɪt ˈθɜːrti eɪ em/.', 'Hai danh sách "tax returns, payroll or business planning" và "your name, phone number and a brief message": lên – lên – xuống.', 'Nhấn từ chứa thông tin: "press ONE", "press TWO", "ONE business day".'] },
    { id: 'tsw-rd4', task: 'read', title: 'Introducing a Guest Speaker', accent: 'en-GB', prep: 45, secs: 45,
      text: "Good evening, everyone, and welcome to the annual Small Business Awards. Before we present tonight's prizes, I would like to introduce our guest speaker, Dr. Amelia Grant. Dr. Grant has spent over twenty years helping local companies grow, first as a bank manager, then as a consultant, and now as the director of the Regional Enterprise Centre. Tonight she will share practical advice on attracting new customers. Please join me in giving her a warm welcome.",
      tips: ['"annual" /ˈænjuəl/ ba âm tiết; "consultant" nhấn âm thứ hai /kənˈsʌltənt/.', 'Chuỗi "first as…, then as…, and now as…" – ngắt nhịp sau mỗi vế, xuống giọng ở vế cuối.', 'Tên riêng "Dr. Amelia Grant" đọc chậm, rõ; nhấn "WARM welcome" ở câu cuối.'] },
  );

  /* ───────── SPEAKING · Respond to questions ───────── */
  S.speaking.push(
    { id: 'tsw-rq1', task: 'respond', title: 'Public Libraries', accent: 'en-US',
      context: 'Imagine that a researcher is conducting a telephone survey in your area. You have agreed to answer some questions about public libraries.',
      questions: [
        { q: 'How often do you visit a public library, and what do you usually do there?', secs: 15, prep: 3,
          model: "I visit the public library about twice a month. I usually borrow novels, and sometimes I use the quiet study room when I need to concentrate.",
          tip: 'Trả lời đủ hai ý của câu hỏi (how often + what you do) trong 2 câu ngắn.' },
        { q: 'How far is the nearest library from your home, and how do you get there?', secs: 15, prep: 3,
          model: "The nearest library is about two kilometres from my home. I usually get there by bike, and it only takes around ten minutes.",
          tip: 'Nêu khoảng cách bằng con số cụ thể + phương tiện + thời gian.' },
        { q: 'What changes would encourage you to use your local library more often? Why?', secs: 30, prep: 3,
          model: "I think longer opening hours would make the biggest difference. At the moment, my library closes at six o'clock, which is before I finish work. If it stayed open until nine, I could go in the evenings. I'd also like more new books and a small café, because then it would be a comfortable place to spend time.",
          tip: 'Câu 30 giây: nêu 1 thay đổi chính + giải thích bằng hoàn cảnh thật + thêm 1 ý phụ.' },
      ], checklist: CK_RESP },
    { id: 'tsw-rq2', task: 'respond', title: 'Online Shopping', accent: 'en-GB',
      context: 'Imagine that a marketing company is doing research in your country. You have agreed to participate in a telephone interview about online shopping.',
      questions: [
        { q: 'When was the last time you bought something online, and what was it?', secs: 15, prep: 3,
          model: "The last time I bought something online was last weekend. I ordered a pair of running shoes because they were cheaper than in the shops.",
          tip: 'Dùng thì quá khứ đơn (bought, ordered) cho sự việc đã xảy ra.' },
        { q: 'Do you usually read customer reviews before you buy something online? Why or why not?', secs: 15, prep: 3,
          model: "Yes, I always read reviews first, especially for electronics. They tell me about problems that the product description doesn't mention.",
          tip: 'Trả lời Yes/No rõ ràng rồi đưa ngay một lý do.' },
        { q: 'Some people prefer to shop in stores rather than online. Which do you prefer, and why?', secs: 30, prep: 3,
          model: "For most things, I prefer shopping online. It saves me a lot of time, because I don't have to travel to different shops, and it's easy to compare prices. However, for clothes I still prefer stores, since I like to try things on to check the size and the quality before I pay.",
          tip: 'Chọn một bên, đưa 2 lý do, có thể thêm ngoại lệ bằng "However" để câu trả lời tự nhiên.' },
      ], checklist: CK_RESP },
    { id: 'tsw-rq3', task: 'respond', title: 'Commuting', accent: 'en-US',
      context: 'Imagine that the city transportation department is conducting research. You have agreed to participate in a telephone interview about commuting.',
      questions: [
        { q: 'How long does it take you to get to work or school, and how do you travel?', secs: 15, prep: 3,
          model: "It takes me about forty minutes to get to work. I take the subway for most of the way, and then I walk for about ten minutes.",
          tip: 'Dùng cấu trúc "It takes me + thời gian + to V".' },
        { q: 'What do you usually do while you are commuting?', secs: 15, prep: 3,
          model: "I usually listen to podcasts about business or technology. Sometimes I read the news on my phone or reply to emails.",
          tip: 'Dùng hiện tại đơn + trạng từ tần suất (usually, sometimes).' },
        { q: 'If the city wanted to improve public transportation, what should it do first? Why?', secs: 30, prep: 3,
          model: "I think the city should make buses and trains run more frequently during rush hour. At the moment, they're so crowded in the morning that many people can't get on and have to wait for the next one. More frequent services would reduce waiting times and encourage more people to leave their cars at home.",
          tip: 'Đề xuất 1 việc ưu tiên, mô tả vấn đề hiện tại, rồi nêu lợi ích khi thay đổi.' },
      ], checklist: CK_RESP },
  );

  /* ───────── SPEAKING · Respond to questions using information provided ───────── */
  S.speaking.push(
    { id: 'tsw-in1', task: 'info', title: 'Marketing Conference Schedule', accent: 'en-US',
      context: 'You will answer three questions from a person who is planning to attend the conference below.',
      info: { title: 'Regional Marketing Conference · Saturday, May 14 · Harbor Hotel',
        rows: [['9:00 – 9:30', 'Registration and coffee (Hotel lobby)'], ['9:30 – 10:30', 'Keynote: Building a Brand Online – Julia Park'], ['10:45 – 11:45', 'Workshop: Social Media Advertising – Mark Evans (Room B)'], ['12:00 – 1:00', 'Lunch (included in registration fee)'], ['1:00 – 2:00', 'Panel discussion: Marketing to Young Customers'], ['2:15 – 3:15', 'Workshop: Writing Effective Emails – Mark Evans (Room C)']],
        note: 'Registration fee: $120 (association members: $90)' },
      questions: [
        { q: 'What time does registration start, and where should I go?', secs: 15, prep: 3,
          model: "Registration starts at nine a.m. You should go to the hotel lobby, where coffee will also be served.",
          tip: 'Trả lời đúng hai thông tin: giờ và địa điểm.' },
        { q: "I heard that I'll have to pay extra for lunch. Is that right?", secs: 15, prep: 3,
          model: "Actually, I'm afraid that's not correct. Lunch is included in the registration fee, so you won't have to pay anything extra.",
          tip: 'Câu 9 thường chứa thông tin SAI – sửa lại lịch sự bằng "Actually, I\'m afraid…".' },
        { q: "I'm especially interested in Mark Evans. Could you tell me about the sessions he's leading?", secs: 30, prep: 3,
          model: "Sure. Mark Evans is leading two workshops. The first one is on social media advertising, from ten forty-five to eleven forty-five in Room B. The second is on writing effective emails, from two fifteen to three fifteen in the afternoon, and that one is in Room C.",
          tip: 'Nêu đủ mọi mục liên quan (2 buổi), mỗi buổi: chủ đề + giờ + phòng; nối bằng "The first… The second…".' },
      ], checklist: CK_INFO },
    { id: 'tsw-in2', task: 'info', title: 'Job Interview Schedule', accent: 'en-GB',
      context: 'You work in the human resources department. You will answer three questions from the manager who is conducting the interviews below.',
      info: { title: 'Interview Schedule · Sales Assistant Position · Tuesday, March 3 · Interviewer: Rachel Moore',
        rows: [['9:00 a.m.', 'Kevin Wu – current position: cashier, BestMart'], ['10:00 a.m.', 'Laura Simms – sales intern, Tech World (CANCELLED)'], ['11:00 a.m.', 'Omar Haddad – store supervisor, City Books'], ['1:30 p.m.', 'Nina Patel – customer service agent, SkyAir'], ['2:30 p.m.', 'Daniel Ruiz – sales assistant, Home Plus (second interview)']],
        note: 'All interviews take place in Meeting Room 2.' },
      questions: [
        { q: 'What time is my first interview, and who is it with?', secs: 15, prep: 3,
          model: "Your first interview is at nine a.m. with Kevin Wu. He's currently working as a cashier at BestMart.",
          tip: 'Giờ + tên + thêm 1 chi tiết hữu ích (vị trí hiện tại).' },
        { q: "I think I'm meeting Laura Simms at ten. Is that correct?", secs: 15, prep: 3,
          model: "Actually, that interview has been cancelled, so you won't be meeting Laura Simms. Your next interview after Kevin Wu is at eleven with Omar Haddad.",
          tip: 'Báo thông tin thay đổi (cancelled) và gợi ý lịch kế tiếp.' },
        { q: 'Could you give me the details of the interviews I have in the afternoon?', secs: 30, prep: 3,
          model: "Of course. You have two interviews in the afternoon. At one thirty, you're meeting Nina Patel, who works as a customer service agent at SkyAir. Then at two thirty, you'll see Daniel Ruiz, a sales assistant at Home Plus. That will be his second interview. Both interviews are in Meeting Room 2.",
          tip: 'Liệt kê theo thứ tự giờ, mỗi ứng viên có tên + công việc; nhắc chi tiết đặc biệt (second interview) và phòng họp.' },
      ], checklist: CK_INFO },
    { id: 'tsw-in3', task: 'info', title: 'Business Trip Itinerary', accent: 'en-US',
      context: 'You are an assistant at a travel agency. You will answer three questions from a client about the itinerary below.',
      info: { title: 'Itinerary for Mr. David Lin · Business Trip to Singapore',
        rows: [['Mon, Apr 7', 'Depart Sydney 8:15 a.m. (Flight SQ 212) – arrive Singapore 2:05 p.m.; check in at Marina View Hotel (3 nights)'], ['Tue, Apr 8', '10:00 a.m. Meeting with Tan & Co. (their office); 7:00 p.m. Dinner with the sales team'], ['Wed, Apr 9', '9:00 a.m. – 4:00 p.m. Trade fair, Expo Centre, Hall 3'], ['Thu, Apr 10', 'Depart Singapore 11:40 a.m. (Flight SQ 231) – arrive Sydney 9:10 p.m.']],
        note: 'Airport transfers are included.' },
      questions: [
        { q: 'What time does my flight leave on Monday, and when do I arrive?', secs: 15, prep: 3,
          model: "Your flight leaves Sydney at eight fifteen on Monday morning, and you'll arrive in Singapore at five past two in the afternoon.",
          tip: 'Đọc giờ và a.m./p.m. chính xác; dùng "leave… arrive…".' },
        { q: "I'll be staying at the Harbour Inn, won't I?", secs: 15, prep: 3,
          model: "No, actually you'll be staying at the Marina View Hotel. You've booked it for three nights, and your airport transfers are included.",
          tip: 'Câu hỏi đuôi chứa thông tin sai – trả lời "No, actually…" rồi nêu thông tin đúng.' },
        { q: 'Can you tell me what I am doing on Tuesday and Wednesday?', secs: 30, prep: 3,
          model: "Sure. On Tuesday, you have a meeting with Tan and Company at ten a.m. at their office, and in the evening, at seven, you're having dinner with the sales team. Then on Wednesday, you'll spend the whole day at the trade fair, from nine to four, at the Expo Centre in Hall 3.",
          tip: 'Chia theo ngày, theo thứ tự thời gian; dùng hiện tại tiếp diễn/tương lai cho lịch đã sắp xếp.' },
      ], checklist: CK_INFO },
  );

  /* ───────── SPEAKING · Express an opinion ───────── */
  S.speaking.push(
    { id: 'tsw-op1', task: 'opinion', title: 'Working from Home', accent: 'en-US', prep: 45, secs: 60,
      q: 'Do you agree or disagree with the following statement? Employees should be allowed to work from home whenever they want. Give specific reasons and examples to support your opinion.',
      model: "I partly agree with this statement, but I don't think employees should be able to work from home whenever they want. First, working from home clearly has benefits. Staff save time on commuting and can often concentrate better without office noise. For example, my brother finishes his reports much faster on the days he works from home. However, complete freedom can cause problems for teamwork. If everyone chooses different days, it becomes difficult to hold meetings or train new employees. In my opinion, the best policy is a fixed schedule, such as two days at home and three in the office, so that teams still spend time together. For these reasons, I support flexible working, but with some clear rules.",
      mid: "I agree. Working from home is good. People don't need to go to the office, so they save time and money. Also they can work in a quiet place. My friend works from home and he likes it very much. So employees should work from home when they want.",
      midNote: 'Bài trung bình chỉ nói được khoảng 25 giây; lý do đúng nhưng chỉ liệt kê, không giải thích; ví dụ "he likes it very much" không chứng minh được lợi ích; không xét mặt hạn chế của chữ "whenever they want". Bài mẫu có lập trường tinh tế, 2 ý triển khai đầy đủ và một đề xuất cụ thể.',
      outline: ['Quan điểm: đồng ý một phần', 'Lợi ích + ví dụ người anh làm báo cáo nhanh hơn', 'Hạn chế khi tự do hoàn toàn: họp, đào tạo', 'Đề xuất lịch cố định 2/3', 'Kết luận'],
      checklist: CK_OP },
    { id: 'tsw-op2', task: 'opinion', title: 'Salary or Learning?', accent: 'en-GB', prep: 45, secs: 60,
      q: 'When choosing a job, which is more important: a high salary or the opportunity to learn new skills? Give specific reasons and examples to support your opinion.',
      model: "For me, the opportunity to learn new skills is more important, especially at the start of a career. The main reason is that skills last much longer than a salary. If I learn how to manage projects or use new software, I can take those abilities to any future job, and they will help me earn more later. For example, my sister accepted a lower-paid position at a small start-up because she could work on many different tasks. Within two years, she was promoted and was earning more than her friends who chose higher salaries. In addition, learning keeps work interesting, and people who enjoy their jobs usually perform better. So I would choose development over a high salary.",
      mid: "I think a high salary is more important. Life is very expensive now, and we need money for rent, food and travel. If the salary is low, people feel unhappy. Also, with more money I can help my family. So salary is the most important.",
      midNote: 'Bài trung bình có quan điểm và lý do nhưng rất ngắn (khoảng 25–30 giây), không có ví dụ cụ thể; câu "people feel unhappy" chung chung; kết luận "the most important" lặp lại đề. Bài mẫu có lý do chính được giải thích sâu, ví dụ người chị có kết quả cụ thể, và lý do bổ sung.',
      outline: ['Quan điểm: cơ hội học hỏi quan trọng hơn', 'Lý do chính: kỹ năng dùng lâu dài, tăng thu nhập về sau', 'Ví dụ người chị ở công ty khởi nghiệp', 'Lý do phụ: công việc thú vị → làm tốt hơn', 'Kết luận'],
      checklist: CK_OP },
    { id: 'tsw-op3', task: 'opinion', title: 'Company-Paid Fitness', accent: 'en-US', prep: 45, secs: 60,
      q: 'Do you agree or disagree with the following statement? Companies should pay for their employees to take part in sports or fitness activities. Give specific reasons and examples.',
      model: "I agree that companies should pay for fitness activities. First, it is a good investment for the company itself. Healthy employees take fewer sick days and usually have more energy at work. For instance, a friend of mine works for a bank that pays for staff gym memberships, and she says absences in her department have fallen noticeably. Second, team sports can improve relationships between colleagues. When people from different departments play football or join a running club together, they communicate more easily in the office as well. Of course, the activities should be optional, because not everyone enjoys sport. Overall, I believe the benefits for both workers and the company are greater than the cost.",
      mid: "I agree with this. Sports is good for health. If employees are healthy, they can work better. Also sports is fun and people can relax after work. Companies have a lot of money so they can pay for it.",
      midNote: 'Bài trung bình có ý đúng nhưng lý do mơ hồ, không ví dụ; "Sports is good" sai hòa hợp (→ Sport is / Sports are); "Companies have a lot of money" là giả định yếu. Bài mẫu có 2 lý do từ góc độ công ty, ví dụ cụ thể và một điều kiện hợp lý (không bắt buộc).',
      outline: ['Đồng ý', 'Lý do 1: đầu tư tốt – ít nghỉ ốm + ví dụ ngân hàng trả phí gym', 'Lý do 2: thể thao đồng đội gắn kết đồng nghiệp', 'Điều kiện: hoạt động tự nguyện', 'Kết luận'],
      checklist: CK_OP },
    { id: 'tsw-op4', task: 'opinion', title: 'Learning About a New Company', accent: 'en-GB', prep: 45, secs: 60,
      q: 'What is the best way for a new employee to learn about a company: attending formal training sessions, reading company documents, or working alongside an experienced colleague? Why?',
      model: "In my opinion, the best way is working alongside an experienced colleague. Training sessions and documents explain the official rules, but they can't show you how things really work day to day. An experienced colleague can answer questions immediately and show you practical shortcuts. For example, in my first job at a hotel, the training manual was very long, but I learned much more by shadowing a senior receptionist for a week. She showed me how to deal with difficult guests, which no document could teach. Working with someone also helps new staff build relationships and feel part of the team more quickly. That's why I think learning from a colleague is the most effective option.",
      mid: "I think the best way is working with an experienced colleague. Because he can teach many things. Documents are boring and training is too long. When I started my job, my colleague helped me a lot. So this way is the best.",
      midNote: 'Bài trung bình chọn đúng một phương án nhưng không giải thích "teach many things" là gì; "Because he can teach…" là câu không hoàn chỉnh; chê hai phương án kia bằng tính từ cảm tính ("boring", "too long"). Bài mẫu so sánh có lý do, ví dụ cụ thể (lễ tân khách sạn) và thêm một lợi ích (hòa nhập nhóm).',
      outline: ['Chọn: làm cùng đồng nghiệp có kinh nghiệm', 'So sánh: tài liệu/đào tạo chỉ có quy định chính thức', 'Lợi ích: hỏi ngay, mẹo thực tế + ví dụ khách sạn', 'Lợi ích phụ: xây dựng quan hệ', 'Kết luận'],
      checklist: CK_OP },
  );

  /* ───────── WRITING · Respond to a written request ───────── */
  const CK_REQ = [
    { c: 'Làm ĐỦ đúng số nhiệm vụ đề yêu cầu (ví dụ 1 mối lo + 2 yêu cầu)', ex: '❌ Chỉ nêu 1 yêu cầu → ✅ "First, could you… Second, I would also like…"' },
    { c: 'Mỗi nhiệm vụ có chi tiết cụ thể', ex: '❌ "I need some things." → ✅ "I would need a second monitor for my design work."' },
    { c: 'Lời chào, câu mở đầu nêu mục đích, lời kết và ký tên', ex: '❌ Bắt đầu ngay "I want…" → ✅ "Dear Ms. Brooks, Thank you for your email about…"' },
    { c: 'Giọng lịch sự, dùng could/would khi yêu cầu', ex: '❌ "Give me a parking space." → ✅ "Would it be possible to reserve a parking space for me?"' },
    { c: 'Ngữ pháp và chính tả chính xác', ex: '❌ "I am worry about the parking." → ✅ "I am worried about parking."' },
  ];
  const CK_ESSAY = [
    { c: 'Quan điểm rõ ở mở bài và nhất quán đến kết bài', ex: '❌ "There are advantages and disadvantages." → ✅ "I believe flexible hours are a good policy for most companies."' },
    { c: 'Ít nhất 2 lý do, mỗi lý do một đoạn có câu chủ đề', ex: '❌ Một đoạn dài gộp mọi ý → ✅ "The main reason is… / Another advantage is…"' },
    { c: 'Ví dụ cụ thể, có chi tiết (người, công ty, số liệu)', ex: '❌ "Many companies do this." → ✅ "When my company introduced flexible hours, late arrivals fell by half."' },
    { c: 'Tối thiểu 300 từ, chia đoạn rõ ràng', ex: '❌ 220 từ, một đoạn → ✅ 4–5 đoạn, khoảng 300–350 từ' },
    { c: 'Câu đa dạng, từ nối chính xác, ít lỗi ngữ pháp', ex: '❌ "Because it is good for workers." (câu cụt) → ✅ "This is because it gives workers more control over their time."' },
  ];
  S.writing.push(
    { id: 'tsw-wr1', task: 'request', title: 'Office Move', minutes: 10, maxScore: 4,
      email: { from: 'Diane Brooks, Office Manager', to: 'All staff', subject: 'Office move next month',
        body: "As you know, our team will move to the new building on Elm Street on June 1. Before we finalize the plans, I'd like to hear from everyone. Please let me know if you have any concerns about the new location or anything you will need for your new workspace." },
      directions: 'Respond to the email as if you are an employee of the company. In your email, describe ONE concern and make TWO requests.',
      model: "Dear Ms. Brooks,\n\nThank you for asking for our input about the move to Elm Street.\n\nMy main concern is parking. The new building has a much smaller car park than our current office, and since I live outside the city, I usually drive to work. I am worried that there will not be enough spaces for everyone, especially in the mornings.\n\nI also have two requests. First, would it be possible to reserve a small number of parking spaces for staff who live far away, or to provide information about nearby public car parks? Second, because I work on design projects, I would need a second monitor at my new desk, as I currently use two screens.\n\nThank you for considering these points.\n\nBest regards,\nKevin Lam",
      mid: "Dear Diane,\n\nI am worry about the parking in the new building because it is small. Can you give me a parking space? I also need a new chair because my chair is old.\n\nThanks,\nKevin",
      midNote: 'Bài trung bình có 1 mối lo và 2 yêu cầu nhưng mỗi ý chỉ một câu, thiếu chi tiết; "I am worry" sai (→ worried); "Can you give me" hơi thẳng thừng; không có câu mở đầu nêu mục đích. Thang ETS: khoảng 2/4. Bài mẫu đạt 4/4 nhờ đủ nhiệm vụ, mỗi ý có lý do và giọng văn lịch sự.',
      checklist: CK_REQ },
    { id: 'tsw-wr2', task: 'request', title: 'Internet Service Feedback', minutes: 10, maxScore: 4,
      email: { from: 'Customer Service, Brightline Internet', to: 'You', subject: 'Your recent service call',
        body: "Thank you for contacting Brightline Internet last week about your connection problem. A technician visited your home on Tuesday, and we hope the issue has been resolved. We would appreciate any feedback about your experience." },
      directions: 'Respond to the email as if you are the customer. In your email, describe ONE problem that you still have and ask TWO questions.',
      model: "Dear Brightline Customer Service,\n\nThank you for sending a technician so quickly last Tuesday. He was polite and replaced the router in less than an hour.\n\nUnfortunately, I am still having a problem. The connection is fast during the day, but every evening between about 7 and 10 p.m. it becomes very slow and sometimes stops completely. This is a serious issue for me because I often work from home in the evenings.\n\nI have two questions. First, is this problem caused by heavy use in my area, and if so, is there anything you can do about it? Second, since I have not received the speed I am paying for, will I receive a partial refund for this month?\n\nI look forward to your reply.\n\nKind regards,\nMaria Gomez",
      mid: "Hello,\n\nThe technician came but the internet is still bad. It is very slow in the evening. Why is it slow? Can I get my money back?\n\nMaria",
      midNote: 'Bài trung bình đủ 1 vấn đề và 2 câu hỏi nên vẫn được tính điểm, nhưng mô tả "still bad" mơ hồ, câu hỏi cụt, thiếu lời chào/kết lịch sự và không có câu mở đầu → khoảng 2/4. Bài mẫu mô tả vấn đề cụ thể (giờ, mức độ, ảnh hưởng) và đặt câu hỏi rõ ràng, có lý do.',
      checklist: CK_REQ },
    { id: 'tsw-wr3', task: 'request', title: 'Volunteering at a Festival', minutes: 10, maxScore: 4,
      email: { from: 'Paul Mendes, Event Coordinator, Riverside Community Center', to: 'Community members', subject: 'Volunteers needed for spring festival',
        body: "We are looking for volunteers to help at our spring festival on Saturday, April 26. Tasks include setting up tables, selling tickets and helping with children's activities. If you are interested, please reply with a little information about yourself." },
      directions: 'Respond to the email as if you are interested in volunteering. In your email, give TWO pieces of information about yourself and ask ONE question.',
      model: "Dear Mr. Mendes,\n\nI saw your email about the spring festival, and I would be very happy to help as a volunteer.\n\nI think I would be most useful with the children's activities. I work as a primary school teaching assistant, so I have a lot of experience organizing games and crafts for young children. I am also available for the whole day on April 26, so I could help with setting up the tables in the morning as well.\n\nI have one question. Will volunteers receive any training or instructions before the festival, or should we simply arrive early on the day?\n\nThank you, and I look forward to hearing from you.\n\nBest wishes,\nSophie Turner",
      mid: "Dear Paul,\n\nI want to be a volunteer. I like children and I am free on Saturday. What time I should come?\n\nSophie",
      midNote: 'Bài trung bình có 2 thông tin và 1 câu hỏi nhưng rất sơ sài; câu hỏi sai trật tự ("What time I should come?" → "What time should I come?"); thiếu lời mở đầu và lời kết lịch sự → khoảng 2/4. Bài mẫu nêu kinh nghiệm cụ thể liên quan đến nhiệm vụ và thời gian rảnh rõ ràng.',
      checklist: CK_REQ },
  );

  /* ───────── WRITING · Write an opinion essay ───────── */
  S.writing.push(
    { id: 'tsw-es1', task: 'essay', title: 'Flexible Working Hours', minutes: 30, maxScore: 5,
      q: 'Some companies allow employees to choose their own working hours. Do you think this is a good policy? Give reasons or examples to support your opinion.',
      model: "In recent years, an increasing number of companies have allowed employees to decide when they start and finish work. In my opinion, this is a good policy for most organizations, as long as some basic rules are in place.\n\nThe main advantage of flexible hours is that they help employees balance work with their personal lives. Many workers have responsibilities outside the office, such as taking children to school or caring for elderly parents. When they can adjust their schedules, they feel less stressed and are less likely to take unplanned days off. For example, when my company introduced flexible hours two years ago, the number of late arrivals fell by about half, simply because people were no longer rushing to arrive at exactly nine o'clock.\n\nAnother benefit is that flexible schedules can increase productivity. Not everyone does their best work at the same time of day. Some people concentrate best early in the morning, while others are more creative in the afternoon. Allowing staff to work during their most productive hours means that the company gets better results from the same number of hours. In addition, if employees can avoid the morning and evening rush hours, they spend less time commuting and arrive at work feeling more energetic.\n\nOf course, complete freedom could cause problems. If team members are never in the office at the same time, it becomes difficult to hold meetings or answer customers quickly. For this reason, I believe the best approach is to set \"core hours\", for example from ten to three, when everyone must be available, while allowing people to choose their own start and finish times.\n\nIn conclusion, flexible working hours benefit both employees and employers by reducing stress and improving productivity. With sensible core hours, this policy can work well in almost any company.",
      mid: "Nowadays some companies let workers choose their working hours. I think this is a good policy because it has many advantages.\n\nFirst, workers can have more free time. They can do their housework or go shopping when they want. Also they can take care of their children. This makes them happy.\n\nSecond, workers can work at the time they like. Some people like to work in the morning and some people like to work at night. If they work at the time they like, they can work better.\n\nBut there are some problems. If workers come at different times, it is difficult to have meetings. The manager doesn't know where the workers are.\n\nIn conclusion, I think letting workers choose their hours is a good policy because they will be happy and work better.",
      midNote: 'Bài trung bình có quan điểm và bố cục rõ nhưng chỉ khoảng 150 từ – dưới mức 300 từ; lý do chung chung ("This makes them happy") và không có ví dụ cụ thể; đoạn nêu vấn đề không được giải quyết, khiến lập luận kém thuyết phục. Thang ETS khoảng 3/5. Bài mẫu đạt 5/5: đủ dài, mỗi lý do có giải thích và ví dụ, có nhượng bộ và giải pháp "core hours".',
      outline: ['Mở bài: bối cảnh + quan điểm (chính sách tốt nếu có quy tắc cơ bản)', 'Thân 1: cân bằng công việc – cuộc sống + ví dụ công ty giảm đi muộn', 'Thân 2: năng suất – làm vào giờ hiệu quả nhất, tránh giờ cao điểm', 'Thân 3: nhượng bộ – khó họp; giải pháp "core hours"', 'Kết bài'],
      checklist: CK_ESSAY },
    { id: 'tsw-es2', task: 'essay', title: 'Large or Small Company?', minutes: 30, maxScore: 5,
      q: 'Do you agree or disagree with the following statement? It is better to work for a large company than for a small company. Give reasons or examples to support your opinion.',
      model: "Choosing an employer is one of the most important decisions in a person's career. Although large companies offer security and status, I disagree that they are always the better choice. In my view, small companies often provide more valuable experience, especially for young employees.\n\nFirst of all, employees in small companies usually have a much wider range of responsibilities. In a large corporation, jobs tend to be narrowly defined, and a junior marketing employee might spend months working only on social media posts. In a small firm, the same person might write advertisements, talk to customers, plan events and even help with sales. This variety helps people discover what they are good at and develop skills much faster.\n\nSecond, it is easier to make a visible contribution in a small company. Because there are fewer layers of management, employees often work directly with the owner or senior managers, and their ideas can be put into practice quickly. For example, a friend of mine joined a small software company after graduating. Within a year, a feature she had suggested was added to the company's main product, and she was asked to lead a small team. In a large company, it might have taken her many years to reach that level of responsibility.\n\nIt is true that large companies have important advantages, such as higher salaries, better training programs and more job security. However, these benefits matter less at the start of a career than the experience and confidence that come from taking on real responsibility.\n\nIn conclusion, while large companies are attractive for their stability, I believe that small companies offer more opportunities to learn and to make a difference. For many people, particularly those early in their careers, working for a small company is the better option, because it builds a strong foundation for the rest of their working lives.",
      mid: "Some people think it is better to work for a large company. I disagree with this idea because small companies have many good points.\n\nIn a small company, everyone knows each other. The atmosphere is friendly like a family. People help each other and they are not stressed. In a large company, there are too many people and nobody knows you.\n\nAlso, in a small company you can do many different jobs. You can learn many things. For example, you can do marketing and sales at the same time.\n\nOf course large companies pay more money. But money is not everything. Happiness at work is more important.\n\nIn conclusion, I think working for a small company is better than a large company.",
      midNote: 'Bài trung bình (khoảng 140 từ) quá ngắn so với yêu cầu 300 từ; khái quát hóa ("nobody knows you", "they are not stressed") không có căn cứ; ví dụ chung chung; "Happiness at work is more important" là khẳng định không giải thích. Thang ETS khoảng 3/5. Bài mẫu có hai lý do phát triển đầy đủ, ví dụ thật, nhượng bộ công bằng và lập luận vì sao lợi ích kia ít quan trọng hơn.',
      outline: ['Mở bài: không đồng ý – công ty nhỏ cho kinh nghiệm giá trị hơn', 'Thân 1: nhiều trách nhiệm đa dạng → phát triển kỹ năng nhanh', 'Thân 2: đóng góp dễ thấy, làm việc trực tiếp với lãnh đạo + ví dụ người bạn', 'Nhượng bộ: lương, đào tạo, ổn định – nhưng kém quan trọng lúc đầu sự nghiệp', 'Kết bài'],
      checklist: CK_ESSAY },
    { id: 'tsw-es3', task: 'essay', title: 'Qualities of a Good Manager', minutes: 30, maxScore: 5,
      q: 'What is the most important quality of a good manager? Use specific reasons and examples to support your answer.',
      model: "Managers have a strong influence on how employees feel about their jobs and how well a team performs. A good manager needs many qualities, including knowledge, organization and decisiveness. However, I believe the most important quality is the ability to communicate clearly and listen to others.\n\nFirst, clear communication prevents mistakes and wasted effort. When a manager explains goals, deadlines and priorities clearly, every team member understands what is expected. In contrast, unclear instructions often lead people to work on the wrong tasks or to repeat work that has already been done. At my previous job, our team once spent two weeks preparing a detailed report, only to discover that the manager had wanted a short summary. A five-minute conversation at the beginning would have saved a great deal of time.\n\nSecond, a manager who listens builds trust and motivation. Employees often know about problems with products, customers or processes before senior staff do. If they feel that their manager will listen to them, they are more likely to share these concerns early, when problems are easier to solve. Listening also shows respect, and people who feel respected usually work harder and stay with the company longer. My current manager, for example, holds a short meeting with each team member every two weeks, and many of our best improvements have come from ideas raised in those meetings.\n\nSome people might argue that technical knowledge is more important, since a manager must understand the work. While this is helpful, a manager can rely on experts in the team for technical details. What they cannot delegate is the responsibility to keep everyone informed and to make people feel heard.\n\nIn conclusion, although managers need a variety of skills, clear communication and good listening are the most important, because they help teams avoid mistakes and keep employees motivated.",
      mid: "There are many qualities of a good manager, but I think the most important is to be kind.\n\nA kind manager makes workers happy. When the manager is kind, workers are not afraid to ask questions. They can talk about their problems. For example, my manager is very kind and everyone likes her.\n\nAlso, a kind manager helps workers when they make mistakes. He does not shout at them. So workers feel relaxed and they work better.\n\nSome people think a manager must be strict. But I think if a manager is too strict, workers will leave the company.\n\nIn conclusion, the most important quality of a good manager is kindness, because it makes workers happy and they work better.",
      midNote: 'Bài trung bình (khoảng 130 từ) chọn một phẩm chất hợp lý nhưng chỉ lặp lại ý "workers are happy"; ví dụ "everyone likes her" không chứng minh được lợi ích cho công việc; dùng lẫn "He/her" cho manager; thiếu độ dài 300 từ. Thang ETS khoảng 3/5. Bài mẫu giải thích cơ chế (giao tiếp rõ → tránh sai sót; lắng nghe → tin tưởng, ý tưởng cải tiến) với hai ví dụ cụ thể và phản biện quan điểm khác.',
      outline: ['Mở bài: nhiều phẩm chất, quan trọng nhất là giao tiếp rõ ràng & lắng nghe', 'Thân 1: giao tiếp rõ tránh sai sót + ví dụ báo cáo hai tuần', 'Thân 2: lắng nghe xây dựng lòng tin, động lực + ví dụ họp 1-1', 'Phản biện: kiến thức chuyên môn – có thể dựa vào chuyên gia trong nhóm', 'Kết bài'],
      checklist: CK_ESSAY },
  );
})(typeof self !== 'undefined' ? self : this);
