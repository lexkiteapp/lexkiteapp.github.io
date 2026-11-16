/* TOEFL iBT (định dạng từ 21/01/2026) – Bộ luyện tập 9. Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
* Chủ đề: di cư của động vật, máy in, kinh tế học hành vi, sông băng, kiến trúc & âm học, thuê nhà/bạn cùng phòng, phạt thư viện, đăng ký hội nghị.
* Nạp SAU data1.js: chỉ BỔ SUNG vào window.TOEFL, cùng định dạng và cấu trúc như bộ 1 (đủ Reading, Listening, Writing, Speaking). */
(function (g) {
const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });
const mcq = (instr, items) => ({ type: 'mcq', instr, items });

/* Helper: o[0] là đáp án đúng, đặt vào vị trí lấy từ dãy xoay vòng (mỗi 12 câu đủ 3 lần A–D, không quá 2 liền nhau). */
const SEQ = [1, 3, 0, 2, 2, 0, 3, 1, 0, 3, 1, 2];
let _k = 0;
const Q = (n, lv, type, q, o, cue, explain) => { const a = SEQ[_k++ % SEQ.length]; const w = o.slice(1); w.splice(a, 0, o[0]); const r = { n, q, options: w, a }; if (type) r.type = type; r.lv = lv; r.cue = cue; r.explain = explain; return r; };

/* ===================================================================
* READING · Complete the Words
* =================================================================== */
TF.reading.push({
id: 'tf9-cw1', set: 9, task: 'cw', title: 'Animal Migration',
instr: 'Fill in the missing letters in the paragraph.',
text: 'Every year, millions of animals {tra|vel} great {dist|ances} in search of food or safe places {t|o} breed. Arctic terns, for instance, {f|ly} from the Arctic to Antarctica and {ba|ck}, a round trip {o|f} about seventy thousand kilometers. Scientists believe {th|at} migrating birds find {the|ir} way by {us|ing} the position of the sun, the stars, and the magnetic field of the Earth. Young animals {oft|en} follow experienced adults on their first journey.',
explain: [
'Chủ ngữ số nhiều "millions of animals" → động từ không thêm -s: "travel" (di chuyển).',
'"great distances" = quãng đường rất xa; danh từ số nhiều đi sau tính từ "great".',
'"places to breed" = nơi để sinh sản; dùng "to + V" để chỉ mục đích của địa điểm.',
'"fly from … to …" = bay từ … đến …; chủ ngữ số nhiều "Arctic terns" nên giữ động từ nguyên mẫu.',
'"and back" = rồi quay trở lại; nối với "from the Arctic to Antarctica" để mô tả chuyến đi khứ hồi.',
'"a round trip of about seventy thousand kilometers" = chuyến đi khứ hồi dài khoảng 70.000 km; giới từ "of" chỉ độ dài.',
'"believe that …" = tin rằng; "that" mở đầu mệnh đề tân ngữ.',
'"their way" = đường đi của chúng; tính từ sở hữu số nhiều thay cho "migrating birds".',
'"by using" = bằng cách sử dụng; giới từ "by" + V-ing chỉ phương tiện.',
'"often follow" = thường đi theo; trạng từ tần suất đứng trước động từ thường.',
],
});
TF.reading.push({
id: 'tf9-cw2', set: 9, task: 'cw', title: 'How Glaciers Form',
instr: 'Fill in the missing letters in the paragraph.',
text: 'A glacier is a huge {ma|ss} of ice that moves {slo|wly} downhill under {i|ts} own weight. It forms {wh|ere} more snow falls in {win|ter} than melts in summer, {s|o} the snow {gra|dually} turns into {de|nse} ice. As a glacier moves, it {car|ries} rocks that {scr|ape} the ground beneath it and carve wide valleys. When the ice finally melts, it leaves behind lakes and ridges of rock.',
explain: [
'"a huge mass of ice" = một khối băng khổng lồ; "mass" là danh từ chỉ khối lượng lớn.',
'"moves slowly" = di chuyển chậm; cần trạng từ bổ nghĩa cho động từ "moves".',
'"its own weight" = sức nặng của chính nó; tính từ sở hữu số ít thay cho "a glacier".',
'"where" mở đầu mệnh đề quan hệ chỉ nơi chốn: nơi tuyết rơi nhiều hơn lượng tan.',
'"in winter … in summer" = vào mùa đông … vào mùa hè; hai mùa đối lập trong so sánh.',
'"so" chỉ kết quả: tuyết rơi nhiều hơn tan, VÌ VẬY tuyết dần biến thành băng.',
'"gradually" = dần dần; trạng từ đứng trước động từ "turns".',
'"dense ice" = băng đặc; tính từ đứng trước danh từ, đối lập với tuyết xốp.',
'Chủ ngữ số ít "it" → động từ thêm -s: "carries" (mang theo) những tảng đá.',
'"rocks that scrape the ground" = những tảng đá cào xuống mặt đất; "that" thay cho "rocks" (số nhiều) nên động từ giữ nguyên mẫu.',
],
});

/* ===================================================================
* READING · Read in Daily Life (câu 1–10)
* =================================================================== */
TF.reading.push({
id: 'tf9-dl1', set: 9, task: 'daily', title: 'Library Fines and Loan Notice',
text: "MERIDIAN COLLEGE LIBRARY – LOAN AND FINE NOTICE\n\nBeginning September 1, overdue books will be charged 25 cents per day, up to a maximum of $10 per item. Items from the two-hour reserve shelf will be charged $2 for each hour they are late.\n\nStudents may renew a book twice online, but a book cannot be renewed if another patron has requested it. Fines above $20 will block the student's account until they are paid at the circulation desk.\n\nA student's first late fee in each academic year will be waived if the book is returned within three days of its due date.",
groups: [mcq('Read the notice and answer the questions.', [
Q(1, 'B1', '', 'What is the most a student can be charged for one overdue book?', ['$10', '$20', '$2', '$25'], 'up to a maximum of $10 per item', `Dạng FACTUAL. "up to a maximum of $10 per item" → mức phạt tối đa cho một cuốn sách quá hạn là 10 đô. 20 đô là ngưỡng khóa tài khoản, còn 2 đô là phí mỗi giờ của sách trong kho đặt trước.`),
Q(2, 'B2', '', 'Which student would have his or her account blocked?', ['A student who owes $24 in fines', 'A student who renewed a book twice', 'A student who returned a book two days late for the first time this year', 'A student who asked for a book that another patron has checked out'], 'Fines above $20 will block the student', `Dạng INFERENCE. "Fines above $20 will block the student's account" → chỉ người nợ trên 20 đô mới bị khóa. Gia hạn hai lần được phép, và trả trễ hai ngày lần đầu trong năm sẽ được miễn phạt.`),
Q(3, 'B2', 'vocab', 'The word "waived" in the third paragraph is closest in meaning to', ['cancelled', 'postponed', 'increased', 'recorded'], 'will be waived if the book is returned within three days', `Dạng VOCAB. Lần phạt đầu tiên "will be waived" nếu trả sách trong vòng ba ngày, nghĩa là khoản phạt không phải trả → sát nghĩa nhất với "cancelled" (bị hủy bỏ).`),
])],
});
TF.reading.push({
id: 'tf9-dl2', set: 9, task: 'daily', title: 'Email about Conference Registration',
text: "Subject: Your registration for the Northwest Regional Teaching Conference\n\nDear Dr. Okonkwo,\n\nThank you for registering for the conference, which will take place on October 17 and 18 at the Harbor View Convention Center. Your early-bird fee of $180 has been received. Please note that the fee does not include the gala dinner on Friday evening; tickets are $45 and can be added to your registration until October 3.\n\nYour badge and program will be available at the check-in desk beginning at 8 a.m. on Friday. To avoid long lines, we encourage you to check in on Thursday between 4 and 7 p.m. If you cannot attend, a full refund is available until September 26; after that date, you may send a colleague in your place at no charge.\n\nSincerely,\nPriya Raman, Registration Coordinator",
groups: [mcq('Read the email and answer the questions.', [
Q(4, 'B1', '', 'Why is Priya Raman writing to Dr. Okonkwo?', ['To confirm a registration and give details about the event', 'To invite Dr. Okonkwo to speak at the conference', 'To announce that the conference dates have changed', 'To ask Dr. Okonkwo to pay an extra fee'], 'Thank you for registering for the conference', `Dạng PURPOSE. Thư mở đầu bằng "Thank you for registering for the conference" rồi cung cấp địa điểm, lệ phí, giờ làm thủ tục → mục đích là xác nhận đăng ký và thông báo chi tiết.`),
Q(5, 'B1', 'negative', 'What is NOT included in the $180 fee?', ['The gala dinner on Friday', 'A conference badge', 'A printed program', 'The early-bird discount'], 'the fee does not include the gala dinner', `Dạng NEGATIVE FACTUAL. "the fee does not include the gala dinner on Friday evening" → bữa tối gala phải mua riêng với giá 45 đô. Thẻ và chương trình được phát tại bàn làm thủ tục.`),
Q(6, 'C1', 'inference', 'What can be inferred about a registered guest who cancels on October 1?', ['The guest cannot get a refund but may send a colleague instead.', 'The guest will receive a refund after paying a small fee.', 'The guest must still pay for the gala dinner.', 'The guest must check in on Thursday.'], 'a full refund is available until September 26', `Dạng INFERENCE. Hoàn tiền đầy đủ chỉ đến hết 26/9; sau ngày đó "you may send a colleague in your place at no charge" → hủy ngày 1/10 thì không được hoàn tiền nhưng được cử đồng nghiệp đi thay.`),
])],
});
TF.reading.push({
id: 'tf9-dl3', set: 9, task: 'daily', title: 'Lease Renewal Notice',
text: "PARKSIDE APARTMENTS – LEASE RENEWAL\n\nYour current lease ends on July 31. To stay another year, please sign and return the renewal form by June 15. The monthly rent for a twelve-month lease will rise from $1,150 to $1,205. Residents who choose a six-month lease will pay $1,260 instead.\n\nIf you do not plan to renew, you must give written notice at least 30 days before the end of your lease. Otherwise, your lease will continue month to month at a higher rate of $1,400.",
groups: [mcq('Read the notice and answer the questions.', [
Q(7, 'A2', '', 'By what date should residents return the renewal form?', ['June 15', 'July 1', 'June 30', 'July 31'], 'return the renewal form by June 15', `Dạng FACTUAL. "please sign and return the renewal form by June 15" → hạn nộp mẫu gia hạn là 15/6. Ngày 31/7 là lúc hợp đồng hiện tại hết hạn.`),
Q(8, 'B2', 'inference', 'What will happen if a resident neither renews nor gives notice?', ['The lease will continue month to month at a higher rent.', 'The resident will have to leave on July 31.', 'The rent will stay at $1,150.', 'The resident will pay the six-month rate.'], 'continue month to month at a higher rate', `Dạng INFERENCE. "Otherwise, your lease will continue month to month at a higher rate of $1,400" → nếu không gia hạn cũng không báo trước thì hợp đồng tiếp tục theo tháng với giá cao hơn.`),
])],
});
TF.reading.push({
id: 'tf9-dl4', set: 9, task: 'daily', title: 'Text Messages between Roommates',
text: "Tomas (6:40 p.m.): Hey Jules, the landlord emailed. He's coming Thursday morning to fix the leaking bathroom faucet.\nJules (6:44 p.m.): Thursday? I have an exam until noon. Can you let him in?\nTomas (6:45 p.m.): I'm working a double shift that day. What if I ask him to come on Friday instead?\nJules (6:47 p.m.): Friday works. I'll clean the bathroom before he arrives so he can reach the pipes under the sink.",
groups: [mcq('Read the messages and answer the questions.', [
Q(9, 'A2', '', 'Why can Jules NOT be at home on Thursday morning?', ['He has an exam.', 'He is working a double shift.', 'He will be cleaning the bathroom.', 'He is meeting the landlord elsewhere.'], 'I have an exam until noon', `Dạng FACTUAL. Jules viết "I have an exam until noon" → anh thi đến trưa thứ Năm. Ca làm đôi là của Tomas, không phải của Jules.`),
Q(10, 'B2', 'function', 'What does Jules mean when he writes "Friday works"?', ['He agrees to the new day for the repair.', 'He thinks Friday is a bad day for the visit.', 'He wants the landlord to come twice.', 'He will be working on Friday.'], 'Friday works', `Dạng FUNCTION. "Friday works" là cách nói thân mật nghĩa là "thứ Sáu thì được", đáp lại đề nghị đổi sang thứ Sáu của Tomas → anh đồng ý với ngày mới.`),
])],
});

/* ===================================================================
* READING · Read an Academic Passage (câu 1–20)
* =================================================================== */
TF.reading.push({
id: 'tf9-ap1', set: 9, task: 'academic', title: 'The Printing Press and the Spread of Knowledge',
text: [
'Before the middle of the fifteenth century, books in Europe were copied by hand, usually by monks working in monasteries. A single Bible could take a scribe more than a year to finish, so books were expensive and rare; a small library might own fewer than a hundred volumes. Literacy was largely limited to the clergy and to wealthy families.',
'Around 1450, the German goldsmith Johannes Gutenberg combined several existing technologies into a practical printing system. His most important contribution was movable metal type: individual letters cast from an alloy of lead, tin, and antimony that could be arranged into a page, inked, pressed onto paper, and then rearranged for the next page. Printers in East Asia had earlier used movable type made of clay or wood, but those materials wore out quickly, and the thousands of characters required for Chinese made the method laborious. The small European alphabet suited movable type far better.',
'The consequences were rapid. Within fifty years, printing shops had opened in more than two hundred European cities, and an estimated twenty million books had been produced. Prices fell sharply, and ordinary merchants and craftsmen began to buy books. Printers also adopted standard spellings and punctuation, since a single edition would be read by people in many regions, and this helped to fix the written forms of several European languages.',
'Printing also changed how knowledge spread. Scholars could now compare identical copies of a text, which made it easier to find errors and to build on one another\'s work. Maps, anatomical drawings, and astronomical tables could be reproduced accurately, rather than being gradually distorted by repeated hand copying. Many historians argue that this reliability helped speed the development of modern science. At the same time, authorities worried about the circulation of ideas they could not control, and they began to license printers and to ban certain books.',
'Not every effect was welcome. Some contemporaries complained that cheap books would lower the quality of ideas, and printers who competed for readers sometimes rushed their work, producing editions full of mistakes. Nevertheless, by 1500 the press had become an established industry, and the idea that knowledge should be widely available had begun to take root.',
].join('\n\n'),
groups: [mcq('Read the passage and answer the questions.', [
Q(1, 'B1', 'factual', 'According to paragraph 1, why were books rare before the printing press?', ['Each copy took a long time to make by hand.', 'Few people wanted to own books.', 'Monks refused to share their manuscripts.', 'Paper was not yet available in Europe.'], 'could take a scribe more than a year to finish', `Dạng FACTUAL. Đoạn 1: "A single Bible could take a scribe more than a year to finish" → mỗi bản chép tay mất rất nhiều thời gian nên sách đắt và hiếm. Bài không nói về việc thiếu giấy hay nhu cầu.`),
Q(2, 'B2', 'vocab', 'The word "laborious" in paragraph 2 is closest in meaning to', ['requiring much effort', 'completely new', 'extremely expensive', 'unreliable'], 'made the method laborious', `Dạng VOCABULARY. Chữ Hán có hàng nghìn ký tự nên phương pháp chữ rời "laborious" = tốn nhiều công sức → "requiring much effort".`),
Q(3, 'B1', 'factual', 'According to paragraph 2, what made movable type difficult to use for Chinese?', ['The large number of characters needed', 'The poor quality of the ink', 'The shortage of metal alloys', 'The small size of the alphabet'], 'the thousands of characters required for Chinese', `Dạng FACTUAL. "the thousands of characters required for Chinese made the method laborious" → số lượng ký tự quá lớn là trở ngại. Bảng chữ cái nhỏ lại là lợi thế của châu Âu.`),
Q(4, 'B1', 'purpose', 'Why does the author mention "lead, tin, and antimony" in paragraph 2?', ['To identify the materials used to make Gutenberg\'s type', 'To explain why metal was cheaper than clay', 'To argue that Gutenberg invented a new alloy', 'To compare European mining with Asian mining'], 'an alloy of lead, tin, and antimony', `Dạng RHETORICAL PURPOSE. Ba kim loại được nêu để cho biết chữ rời của Gutenberg được đúc bằng hợp kim gì ("cast from an alloy of…"). Bài không so sánh giá cả hay khẳng định ông phát minh hợp kim.`),
Q(5, 'B2', 'negative', 'According to paragraph 3, all of the following resulted from the spread of printing EXCEPT', ['printers began charging higher prices', 'books became affordable to merchants and craftsmen', 'the written forms of some languages became more uniform', 'printing shops opened in many cities'], 'Prices fell sharply', `Dạng NEGATIVE FACTUAL. Đoạn 3 nói "Prices fell sharply" → giá sách GIẢM, không tăng. Các ý còn lại (thợ buôn mua sách, chính tả thống nhất, xưởng in mở rộng) đều được nêu.`),
Q(6, 'B1', 'factual', 'According to paragraph 3, why did printers adopt standard spellings?', ['Their books were read by people in many regions.', 'Governments required them to do so.', 'Scribes had already agreed on standard forms.', 'Readers wanted books in foreign languages.'], 'a single edition would be read by people in many regions', `Dạng FACTUAL. Lý do: "a single edition would be read by people in many regions" → một ấn bản có độc giả ở nhiều vùng nên cần chính tả thống nhất.`),
Q(7, 'B2', 'inference', 'What can be inferred from paragraph 4 about hand-copied maps and tables?', ['Copying errors could build up over time.', 'They were more accurate than printed ones.', 'Scholars never used them.', 'They were made only in monasteries.'], 'gradually distorted by repeated hand copying', `Dạng INFERENCE. Bản in giúp tránh việc bản đồ và bảng số "gradually distorted by repeated hand copying" → suy ra: chép tay lặp lại khiến sai sót tích tụ dần.`),
Q(8, 'C1', 'function', 'What is the function of the last sentence of paragraph 4?', ['To show that printing led to attempts at official control', 'To argue that governments opposed science', 'To explain why books became more reliable', 'To describe how printers earned a profit'], 'began to license printers and to ban certain books', `Dạng SENTENCE FUNCTION. Câu cuối cho thấy nhà cầm quyền lo ngại và bắt đầu "license printers and … ban certain books" → minh họa việc in ấn dẫn đến các nỗ lực kiểm soát của nhà nước.`),
Q(9, 'B2', 'vocab', 'The word "established" in paragraph 5 is closest in meaning to', ['firmly settled', 'temporary', 'expensive', 'foreign'], 'had become an established industry', `Dạng VOCABULARY. "an established industry" = một ngành đã được hình thành vững chắc → "firmly settled". "temporary" trái nghĩa với ý bài.`),
Q(10, 'B2', 'purpose', 'What is the main purpose of paragraph 5?', ['To note some drawbacks of printing while concluding that it succeeded', 'To argue that printing harmed intellectual life', 'To describe how books were sold in 1500', 'To compare printers with scribes'], 'Nevertheless, by 1500 the press had become an established industry', `Dạng RHETORICAL PURPOSE. Đoạn 5 nêu những mặt trái (sách rẻ, in ẩu) rồi chuyển bằng "Nevertheless" để kết luận máy in vẫn thành công và ý tưởng phổ biến tri thức bén rễ.`),
])],
});
TF.reading.push({
id: 'tf9-ap2', set: 9, task: 'academic', title: 'Behavioral Economics: Why We Do Not Always Choose Rationally',
text: [
'Classical economics long assumed that people make decisions by carefully weighing costs and benefits and choosing whatever serves their interests best. Behavioral economics, a field that grew rapidly from the 1970s, challenges this assumption by combining economics with findings from psychology. Its researchers have shown that real decisions are shaped by mental shortcuts, emotions, and the way choices are presented, often in ways that people do not notice.',
'One well-documented pattern is loss aversion: the tendency to feel the pain of losing something more strongly than the pleasure of gaining something of equal value. In experiments, people often refuse a coin toss that offers a chance to win $120 or lose $100, even though the average outcome is positive. Loss aversion helps explain why consumers hesitate to switch to cheaper service providers and why investors sometimes hold on to losing stocks for too long, hoping to avoid admitting a loss.',
'A second pattern is the power of defaults. When a choice is made automatically unless a person acts to change it, most people simply accept it. A well-known study of retirement savings compared companies that enrolled employees in a savings plan automatically, allowing them to opt out, with companies that required employees to sign up. Participation was above ninety percent in the first group but far lower in the second, even though the plan and its cost were the same. Researchers concluded that the difference came not from different preferences but from the effort that signing up demanded.',
'Such findings have inspired "nudges": small changes in how choices are presented that guide people toward better outcomes without forbidding any option. A cafeteria that places fruit at eye level and sweets on a lower shelf, for example, has changed nothing about what is available, yet it may increase fruit sales. Supporters value nudging because it preserves freedom of choice.',
'Critics raise two objections. Some argue that the idea of "irrational" behavior is exaggerated, since shortcuts often produce good decisions at a low mental cost. Others worry that nudges could be used to manipulate people, especially when those designing them are not accountable to the public. Even so, many governments and companies now employ teams of behavioral specialists, which suggests that the field\'s influence is likely to keep growing.',
].join('\n\n'),
groups: [mcq('Read the passage and answer the questions.', [
Q(11, 'B1', 'factual', 'According to paragraph 1, how does behavioral economics differ from classical economics?', ['It uses findings from psychology to study real decisions.', 'It ignores the costs of products.', 'It studies only the decisions of investors.', 'It assumes that people always choose carefully.'], 'combining economics with findings from psychology', `Dạng FACTUAL. Đoạn 1: kinh tế học hành vi thách thức giả định cũ "by combining economics with findings from psychology" → kết hợp kinh tế với tâm lý học để nghiên cứu quyết định thực tế. Giả định luôn cân nhắc kỹ là của kinh tế học cổ điển.`),
Q(12, 'B2', 'vocab', 'The word "hesitate" in paragraph 2 is closest in meaning to', ['delay acting', 'refuse completely', 'complain loudly', 'calculate carefully'], 'consumers hesitate to switch to cheaper service providers', `Dạng VOCABULARY. Người tiêu dùng "hesitate to switch" = ngần ngại chưa chuyển sang nhà cung cấp rẻ hơn → "delay acting" (chần chừ hành động).`),
Q(13, 'B2', 'purpose', 'Why does the author describe the coin toss in paragraph 2?', ['To illustrate that losses affect people more than equal gains', 'To prove that most people enjoy gambling', 'To explain how averages are calculated', 'To show that investors rarely lose money'], 'win $120 or lose $100', `Dạng RHETORICAL PURPOSE. Ví dụ tung đồng xu "win $120 or lose $100" cho thấy dù kỳ vọng dương, nhiều người vẫn từ chối vì sợ mất → minh họa sự ác cảm với mất mát (loss aversion).`),
Q(14, 'B1', 'factual', 'According to paragraph 2, what is one effect of loss aversion on consumers?', ['They may hesitate to change to cheaper providers.', 'They spend more money on luxury goods.', 'They buy stocks more often.', 'They avoid saving for retirement.'], 'hesitate to switch to cheaper service providers', `Dạng FACTUAL. Đoạn 2 nói loss aversion giải thích vì sao người tiêu dùng "hesitate to switch to cheaper service providers" → họ ngại đổi sang nhà cung cấp rẻ hơn.`),
Q(15, 'B1', 'factual', 'According to paragraph 3, what explains the different participation rates in the savings study?', ['The effort required to sign up', 'Employees\' different attitudes toward saving', 'The different costs of the plans', 'The different ages of the employees'], 'the effort that signing up demanded', `Dạng FACTUAL. Các nhà nghiên cứu kết luận chênh lệch đến "not from different preferences but from the effort that signing up demanded" → do công sức đăng ký, không phải do sở thích hay chi phí (chi phí giống nhau).`),
Q(16, 'C1', 'inference', 'What can be inferred about employees who were not enrolled automatically?', ['Many probably wanted to save but never signed up.', 'Most of them disliked the savings plan.', 'They earned less than other employees.', 'They misunderstood the cost of the plan.'], 'not from different preferences', `Dạng INFERENCE. Vì khác biệt "not from different preferences" mà từ công sức đăng ký, nhiều nhân viên không được ghi danh tự động có lẽ vẫn muốn tiết kiệm nhưng không đăng ký.`),
Q(17, 'B2', 'negative', 'According to paragraph 4, all of the following are true of the cafeteria example EXCEPT', ['sweets are no longer sold', 'fruit is placed at eye level', 'the available food stays the same', 'fruit sales may rise'], 'changed nothing about what is available', `Dạng NEGATIVE FACTUAL. Căng-tin chỉ đổi vị trí đặt, "changed nothing about what is available" → đồ ngọt vẫn được bán, vẫn xếp ở kệ thấp hơn. Ý "không còn bán đồ ngọt" là sai.`),
Q(18, 'B2', 'vocab', 'The word "exaggerated" in paragraph 5 is closest in meaning to', ['made to seem greater than it is', 'carefully measured', 'deliberately hidden', 'widely accepted'], 'is exaggerated, since shortcuts often produce good decisions', `Dạng VOCABULARY. Nhà phê bình cho rằng ý niệm hành vi "phi lý" bị "exaggerated" vì lối tắt thường cho quyết định tốt → bị phóng đại, tức là làm cho có vẻ lớn hơn thực tế.`),
Q(19, 'C1', 'function', 'Why does the author mention that governments and companies employ behavioral specialists?', ['To suggest that the field is likely to keep gaining influence', 'To prove that the critics are mistaken', 'To show that nudges are cheap to design', 'To argue that governments should regulate nudges'], 'employ teams of behavioral specialists', `Dạng SENTENCE FUNCTION. Câu cuối dùng việc nhiều chính phủ và công ty "employ teams of behavioral specialists" làm bằng chứng cho nhận định ảnh hưởng của lĩnh vực này sẽ còn tăng. Tác giả không khẳng định các nhà phê bình sai.`),
Q(20, 'B2', 'main', 'Which statement best expresses the main idea of the passage?', ['Real decisions are influenced by psychological factors that classical theory overlooked.', 'People are always irrational when they spend money.', 'Governments should ban nudges.', 'Retirement savings are best left entirely to individuals.'], 'real decisions are shaped by mental shortcuts', `Dạng MAIN IDEA. Cả bài trình bày rằng quyết định thực tế bị chi phối bởi "mental shortcuts, emotions, and the way choices are presented" – những yếu tố tâm lý mà kinh tế học cổ điển bỏ qua. Bài không nói con người "luôn" phi lý hay đòi cấm nudge.`),
])],
});

/* ===================================================================
* LISTENING · Listen and Choose a Response (câu 1–8)
* =================================================================== */
const RESP = [
{ s: 'A', lv: 'B2', t: 'I\'m thinking about dropping my statistics class. Do you think that\'s a bad idea?',
options: ['It depends. Have you talked to your advisor about it yet?', 'Statistics is the study of numbers and data.', 'Yes, I dropped my phone in the lake yesterday.', 'The class meets in Room 204 on Tuesdays.'],
explain: 'Người nói xin ý kiến về việc bỏ môn → phản hồi hợp lý là "tùy trường hợp" và hỏi đã trao đổi với cố vấn học tập chưa. Các phương án khác chỉ lặp "statistics", "dropping/dropped" hoặc nói về phòng học.' },
{ s: 'B', lv: 'B1', t: 'The cafeteria ran out of vegetarian options again.',
options: ['Maybe we should send them a suggestion online.', 'It is a very large cafeteria.', 'I ran out of the room when the alarm rang.', 'Vegetables are on sale at the market today.'],
explain: 'Câu phàn nàn về căng-tin hết món chay → phản hồi tự nhiên là đề xuất giải pháp: gửi góp ý trực tuyến. "ran out of the room" là bẫy lặp cụm "ran out of" với nghĩa khác.' },
{ s: 'A', lv: 'B1', t: 'Could you tell me how late the print center stays open?',
options: ['Until eleven on weekdays, but only until six on Saturdays.', 'I printed my essay last night.', 'It costs five cents a page.', 'The center is next to the gym.'],
explain: 'Câu hỏi "how late … open" cần giờ đóng cửa → đáp án đưa ra giờ cụ thể. Giá tiền và vị trí là câu trả lời cho "How much" và "Where".' },
{ s: 'B', lv: 'B1', t: 'I\'m sorry I\'m late. My alarm didn\'t go off this morning.',
options: ['No worries. We\'ve only just started.', 'Yes, the alarm is on the kitchen table.', 'I don\'t think you should be sorry about the weather.', 'It was a loud alarm clock.'],
explain: 'Người nói xin lỗi vì đến muộn → phản hồi lịch sự là "đừng lo, chúng tôi vừa mới bắt đầu". Các lựa chọn khác chỉ bám vào từ "alarm" hoặc "sorry" mà không đáp lại lời xin lỗi.' },
{ s: 'A', lv: 'B1', t: 'Do you want to split a taxi to the airport on Friday?',
options: ['Sure, as long as we leave before nine.', 'The airport is the largest in the country.', 'I took the train last Friday.', 'Taxis in this city are painted yellow.'],
explain: '"Do you want to…?" là lời rủ → đồng ý kèm điều kiện về giờ khởi hành là phản hồi trực tiếp. Các phương án khác lặp "airport", "Friday", "taxi" nhưng không trả lời lời rủ.' },
{ s: 'B', lv: 'B2', t: 'What did you think of the guest lecture on urban farming?',
options: ['It was more practical than I expected.', 'The farm is about two hours from here.', 'I thought you were speaking tomorrow.', 'Guests are welcome to sit in the front.'],
explain: 'Câu hỏi xin nhận xét → trả lời bằng đánh giá: "thực tế hơn tôi mong đợi". Các phương án khác lặp "farm", "speaking", "guests" mà không nêu cảm nhận về bài giảng.' },
{ s: 'A', lv: 'B1', t: 'I still haven\'t received my scholarship payment.',
options: ['You should call the financial aid office and ask about it.', 'The scholarship ceremony starts at noon.', 'I always pay with my card.', 'Yes, I received a letter from my aunt.'],
explain: 'Câu nêu vấn đề chưa nhận được học bổng → lời khuyên hợp lý là gọi văn phòng hỗ trợ tài chính. Lễ trao học bổng hay cách trả tiền bằng thẻ không giải quyết tình huống.' },
{ s: 'B', lv: 'B2', t: 'Would it be all right if I turned in the assignment a day late?',
options: ['You had better check the syllabus. Late work may lose points.', 'It is all right, thanks for asking how I am.', 'I turned it in yesterday, so I am a day ahead.', 'The assignment was about a day in the life of a farmer.'],
explain: '"Would it be all right if…?" là câu xin phép → phản hồi khuyên kiểm tra đề cương vì nộp muộn có thể bị trừ điểm. Phương án còn lại bám theo "all right", "turned in", "a day" nhưng không trả lời lời xin phép.' },
];
const respScript = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
RESP.forEach((r, i) => { respScript.push({ say: 'Number ' + (i + 1) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
TF.listening.push({
id: 'tf9-lr', set: 9, task: 'response', title: 'Choose a Response · Set 9',
speakers: { A: { name: 'Speaker 1', accent: 'en-US', gender: 'f' }, B: { name: 'Speaker 2', accent: 'en-US', gender: 'm' } },
script: respScript,
groups: [mcq('Listen to each sentence and choose the best response.', RESP.map((r, i) => Q(i + 1, r.lv, '', 'Choose the best response to sentence ' + (i + 1) + '.', r.options, r.t, r.explain)))],
});

/* ===================================================================
* LISTENING · Listen to a Conversation (câu 1–8)
* =================================================================== */
TF.listening.push({
id: 'tf9-lc1', set: 9, task: 'conversation', title: 'At the Library Circulation Desk',
speakers: { S: { name: 'Student (Dara)', accent: 'en-US', gender: 'f' }, W: { name: 'Librarian', accent: 'en-US', gender: 'm' } },
script: [
{ say: 'Listen to a conversation between a student and a librarian.' }, { pause: 1 },
{ s: 'S', t: 'Excuse me. I just got an email saying I owe eleven dollars for an overdue book, but I\'m sure I returned it before the due date.' },
{ s: 'W', t: 'Let me look at your account. Which book was it?' },
{ s: 'S', t: 'A used textbook on microeconomics. I dropped it into the outdoor return box last Friday evening.' },
{ s: 'W', t: 'I see it here. We don\'t empty that box over the weekend, so the book was scanned in on Monday morning and recorded as three days late.' },
{ s: 'S', t: 'But the box is outside. Doesn\'t it count as returned once I put it in?' },
{ s: 'W', t: 'Actually, it does, as long as the library was closed at the time. Items placed in the box after closing are counted on the day they were dropped off. Last Friday we closed at five, so your book should have been recorded as on time.' },
{ s: 'S', t: 'Oh, good. Can you fix it now?' },
{ s: 'W', t: 'Sure. I\'ll remove the fine right now and add a note to your account explaining that it was our mistake.' },
{ s: 'S', t: 'Thank you. Is there anything I should do differently next time?' },
{ s: 'W', t: 'If you ever want proof, take a quick photo of the book in the box with your phone. That makes things simple if there\'s a dispute.' },
],
groups: [mcq('Answer the questions about the conversation.', [
Q(1, 'B1', '', 'Why does the student speak to the librarian?', ['She believes a late fee was charged by mistake.', 'She wants to renew a textbook.', 'She lost a book from the library.', 'She needs help finding a microeconomics book.'], 'I\'m sure I returned it before the due date', `Sinh viên nói nhận email báo nợ 11 đô nhưng "I'm sure I returned it before the due date" → cô cho rằng khoản phạt bị tính nhầm. Cô không làm mất sách hay muốn gia hạn.`),
Q(2, 'B2', '', 'According to the librarian, why was the book recorded as late?', ['Staff did not scan the return box until Monday morning.', 'The student returned it on Monday.', 'The return box was broken.', 'The book had already been renewed twice.'], 'don\'t empty that box over the weekend', `Thủ thư giải thích "We don't empty that box over the weekend" nên sách chỉ được quét vào sáng thứ Hai và bị ghi là trễ ba ngày, dù sinh viên đã bỏ vào hộp từ tối thứ Sáu.`),
Q(3, 'B1', '', 'What will the librarian do about the fine?', ['Remove it and note the library\'s error on the account', 'Reduce it to five dollars', 'Ask the student to pay it first and return the money later', 'Send the student to the financial aid office'], 'remove the fine right now', `Thủ thư nói "I'll remove the fine right now and add a note to your account" → xóa phạt và ghi chú đó là lỗi của thư viện. Ông không giảm một phần hay yêu cầu trả trước.`),
Q(4, 'B1', 'inference', 'What does the librarian suggest the student do to prove a return in the future?', ['Take a photo of the book in the return box', 'Hand the book to a staff member only', 'Email the library after returning it', 'Return books only on Mondays'], 'take a quick photo of the book in the box', `Câu hỏi chi tiết: để có bằng chứng, thủ thư khuyên "take a quick photo of the book in the box with your phone" – chụp ảnh sách trong hộp trả.`),
])],
});
TF.listening.push({
id: 'tf9-lc2', set: 9, task: 'conversation', title: 'Office Hours: A Class Survey',
speakers: { S: { name: 'Student (Hugo)', accent: 'en-US', gender: 'm' }, P: { name: 'Professor Whitaker', accent: 'en-GB', gender: 'f' } },
script: [
{ say: 'Listen to a conversation between a student and his sociology professor.' }, { pause: 1 },
{ s: 'S', t: 'Professor Whitaker, thanks for seeing me. I\'d like to ask about my research proposal. I want to survey about three hundred students on how they spend their free time.' },
{ s: 'P', t: 'That\'s an interesting topic, Hugo. But three hundred responses in five weeks is ambitious. How were you planning to reach them?' },
{ s: 'S', t: 'I was going to post the link in the student forum and wait for people to respond.' },
{ s: 'P', t: 'The trouble with that approach is that only students who check the forum, and who care about the topic, will answer. Your results wouldn\'t represent the whole campus.' },
{ s: 'S', t: 'I hadn\'t thought of that. So should I ask people in person?' },
{ s: 'P', t: 'That would be better. Stand in different places at different times: the cafeteria at noon, the library in the evening, the gym in the morning. And aim for about eighty people. A smaller sample collected carefully is more useful than a large one collected carelessly.' },
{ s: 'S', t: 'Eighty sounds much easier. Should I still include the forum?' },
{ s: 'P', t: 'You can, but treat those answers as a separate group and explain the difference in your report.' },
],
groups: [mcq('Answer the questions about the conversation.', [
Q(5, 'B1', '', 'How did the student originally plan to find participants?', ['By posting a link in an online forum', 'By asking friends in his dorm', 'By visiting classrooms during lectures', 'By emailing every student on campus'], 'post the link in the student forum', `Hugo nói "I was going to post the link in the student forum and wait for people to respond" → dự định đăng đường dẫn khảo sát lên diễn đàn sinh viên.`),
Q(6, 'B2', '', 'Why does the professor object to the student\'s plan?', ['Only certain kinds of students would respond.', 'The forum is not allowed for research.', 'Three hundred people is too few.', 'The survey would take too long to write.'], 'only students who check the forum', `Giáo sư chỉ ra "only students who check the forum, and who care about the topic, will answer" → kết quả không đại diện cho cả trường vì chỉ một nhóm nhất định trả lời.`),
Q(7, 'B1', '', 'What does the professor recommend?', ['Surveying about eighty students in several places and at different times', 'Surveying only students in the library', 'Dropping the forum completely', 'Waiting until the next term'], 'aim for about eighty people', `Giáo sư gợi ý đứng ở nhiều nơi, nhiều thời điểm và "aim for about eighty people". Diễn đàn vẫn có thể dùng nhưng tách thành một nhóm riêng.`),
Q(8, 'C1', 'inference', 'What does the professor imply about sample size?', ['A careful small sample can be more useful than a large careless one.', 'Large samples are always unreliable.', 'Eighty is the minimum the course requires.', 'Online surveys are no longer permitted.'], 'A smaller sample collected carefully is more useful', `Câu hàm ý: "A smaller sample collected carefully is more useful than a large one collected carelessly" → mẫu nhỏ nhưng thu thập cẩn thận có giá trị hơn mẫu lớn làm cẩu thả.`),
])],
});

/* ===================================================================
* LISTENING · Listen to an Announcement (câu 1–6)
* =================================================================== */
TF.listening.push({
id: 'tf9-la1', set: 9, task: 'announcement', title: 'Library Hours During Final Exams',
speakers: { A: { name: 'Announcer', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to an announcement on a university campus.' }, { pause: 1 },
{ s: 'A', t: 'Attention, students. This is an announcement from the Harrow University Library.' },
{ s: 'A', t: 'Beginning Monday, December first, the main library will extend its hours for final exams. It will stay open until two a.m. from Sunday through Thursday, and until midnight on Friday and Saturday.' },
{ s: 'A', t: 'Please remember that the quiet floors on Levels 3 and 4 remain silent zones. Group work is only allowed on Level 1 and in reserved study rooms. Rooms can be booked through the library app, but each group may reserve a room for no more than two hours a day.' },
{ s: 'A', t: 'Finally, free tea and hot chocolate will be served in the lobby every evening between ten and eleven. Good luck with your exams, everyone.' },
],
groups: [mcq('Answer the questions about the announcement.', [
Q(1, 'B1', '', 'What is the main purpose of the announcement?', ['To inform students about longer library hours', 'To announce a new library building', 'To explain how to reserve a laptop', 'To ask students to return overdue books'], 'extend its hours for final exams', `Thông báo mở đầu bằng "the main library will extend its hours for final exams" → mục đích là báo giờ mở cửa kéo dài trong mùa thi cuối kỳ.`),
Q(2, 'B1', '', 'Where is group work permitted?', ['On Level 1 and in reserved study rooms', 'On Levels 3 and 4', 'Only in the lobby', 'In any area after midnight'], 'Group work is only allowed on Level 1', `"Group work is only allowed on Level 1 and in reserved study rooms" – làm việc nhóm chỉ ở tầng 1 và phòng học đã đặt. Tầng 3 và 4 là khu vực yên tĩnh.`),
Q(3, 'B1', '', 'What limit is placed on room reservations?', ['Each group may book a room for two hours a day.', 'Rooms must be booked a week ahead.', 'Only four groups may reserve rooms.', 'Rooms can be booked only in person.'], 'no more than two hours a day', `Mỗi nhóm được đặt phòng "no more than two hours a day" – tối đa hai giờ mỗi ngày. Việc đặt phòng làm qua ứng dụng của thư viện.`),
])],
});
TF.listening.push({
id: 'tf9-la2', set: 9, task: 'announcement', title: 'Conference Volunteer Briefing',
speakers: { A: { name: 'Event coordinator', accent: 'en-GB', gender: 'm' } },
script: [
{ say: 'Listen to a coordinator speaking to a group of volunteers.' }, { pause: 1 },
{ s: 'A', t: 'Good morning, volunteers, and thank you for helping with the Regional Education Conference.' },
{ s: 'A', t: 'Most of you will be at the registration desk. When guests arrive, ask for their confirmation email, find their name on the list, and hand them a badge and a program. If someone has not registered in advance, send them to the table by the window, where a staff member will take their payment.' },
{ s: 'A', t: 'Please do not let anyone walk through to the sessions without a badge. Security will check badges at every door.' },
{ s: 'A', t: 'Your shifts are two hours long, and there is a break room behind the stage with sandwiches. If a problem comes up that you can\'t solve, call me on channel two of your radio.' },
],
groups: [mcq('Answer the questions about the announcement.', [
Q(4, 'B1', '', 'What should volunteers ask guests for when they arrive?', ['Their confirmation email', 'Their payment receipt', 'A photo identification card', 'Their conference program'], 'ask for their confirmation email', `Người điều phối dặn "ask for their confirmation email, find their name on the list" → hỏi email xác nhận trước, rồi mới phát thẻ và chương trình.`),
Q(5, 'B1', '', 'Where should guests who have not registered go?', ['To the table by the window', 'To the break room', 'To the security desk', 'To channel two'], 'send them to the table by the window', `"send them to the table by the window, where a staff member will take their payment" – khách chưa đăng ký được chuyển tới bàn cạnh cửa sổ để nhân viên thu phí.`),
Q(6, 'B1', 'inference', 'What should volunteers do if they cannot solve a problem?', ['Contact the coordinator by radio', 'Ask a security guard to decide', 'Leave the desk and look for a staff member', 'Wait until the end of their shift'], 'call me on channel two of your radio', `Người điều phối nói "call me on channel two of your radio" → gọi trực tiếp cho ông qua bộ đàm, không tự bỏ bàn đi tìm người.`),
])],
});

/* ===================================================================
* LISTENING · Listen to an Academic Talk (câu 1–10)
* =================================================================== */
TF.listening.push({
id: 'tf9-lt1', set: 9, task: 'talk', title: 'Architecture: How Buildings Shape Sound',
speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to part of a talk in an architecture class.' }, { pause: 1 },
{ s: 'P', t: 'Today we\'re going to look at how architects shape sound, a field called architectural acoustics. The key idea is reverberation: the sound that lingers in a room after the source has stopped, because sound waves keep bouncing off the walls, the floor, and the ceiling.' },
{ s: 'P', t: 'Reverberation time, the number of seconds a sound takes to fade away, has to match what the room is used for. A lecture hall needs a short reverberation time, about one second, so that each word dies away before the next one arrives. Otherwise speech becomes muddy. A concert hall for orchestral music, in contrast, benefits from a longer time, around two seconds, which blends the notes together and gives the music a sense of fullness.' },
{ s: 'P', t: 'So how do designers control it? Hard, smooth surfaces such as glass, stone, and polished wood reflect sound and lengthen reverberation. Soft, porous materials such as carpet, curtains, and padded seats absorb sound and shorten it.' },
{ s: 'P', t: 'Here\'s an interesting complication. An audience is itself an absorber, because people\'s bodies and clothes soak up sound. That\'s why engineers often choose seats that absorb about as much sound as a seated person does, so that an empty hall tested before opening day behaves much like a full one.' },
{ s: 'P', t: 'Finally, shape matters too. Curved ceilings can focus sound into hot spots, so designers often add angled panels that scatter it evenly. The result is that someone in the back row can hear a single violin as clearly as someone in the front.' },
],
groups: [mcq('Answer the questions about the talk.', [
Q(1, 'B1', '', 'What is the talk mainly about?', ['How architects control sound inside buildings', 'How musicians choose their instruments', 'Why some cities are noisier than others', 'The history of concert halls'], 'how architects shape sound', `Câu hỏi ý chính: bài giảng mở đầu bằng "how architects shape sound, a field called architectural acoustics" rồi nói về thời gian vang, vật liệu và hình dạng phòng.`),
Q(2, 'B2', '', 'Why does a lecture hall need a short reverberation time?', ['So that words do not blend into one another', 'So that music sounds fuller', 'So that the room feels larger', 'So that fewer seats are needed'], 'each word dies away before the next one arrives', `Giáo sư giải thích giảng đường cần thời gian vang ngắn "so that each word dies away before the next one arrives", nếu không lời nói sẽ bị "muddy" (lẫn lộn).`),
Q(3, 'B1', '', 'According to the professor, which materials lengthen reverberation?', ['Glass, stone, and polished wood', 'Carpet and curtains', 'Padded seats', 'Porous panels'], 'reflect sound and lengthen reverberation', `"Hard, smooth surfaces such as glass, stone, and polished wood reflect sound and lengthen reverberation" → vật liệu cứng, nhẵn làm tăng độ vang. Thảm, rèm và ghế đệm hấp thụ âm thanh.`),
Q(4, 'C1', 'purpose', 'Why does the professor mention that an audience absorbs sound?', ['To explain why designers use absorbent seats when testing empty halls', 'To argue that concert halls should be smaller', 'To show that audiences make rooms noisier', 'To recommend that engineers avoid testing halls'], 'an empty hall tested before opening day behaves much like a full one', `Giáo sư nói khán giả cũng hấp thụ âm thanh nên kỹ sư chọn ghế hấp thụ tương đương để "an empty hall tested before opening day behaves much like a full one" – lý do dùng ghế hấp thụ khi thử phòng trống.`),
Q(5, 'B1', '', 'What is the purpose of angled panels on a ceiling?', ['To spread sound evenly around the room', 'To make the ceiling look higher', 'To increase reverberation time', 'To block sound from outside'], 'angled panels that scatter it evenly', `"Curved ceilings can focus sound into hot spots, so designers often add angled panels that scatter it evenly" → tấm nghiêng giúp âm thanh lan đều, tránh điểm tập trung âm.`),
])],
});
TF.listening.push({
id: 'tf9-lt2', set: 9, task: 'talk', title: 'Biology: How Sea Turtles Find Their Way',
speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'm' } },
script: [
{ say: 'Listen to part of a talk in a biology class.' }, { pause: 1 },
{ s: 'P', t: 'Let\'s turn to one of the great puzzles in animal behavior: how do sea turtles find their way back to the beach where they hatched? A female loggerhead may swim thousands of kilometers across open ocean and still return, decades later, to within a few kilometers of her birthplace to lay her eggs.' },
{ s: 'P', t: 'The leading explanation is called magnetic memory. As hatchlings, the turtles seem to record the magnetic signature of their home beach. The Earth\'s magnetic field varies from place to place, both in its angle and in its strength, so every stretch of coastline has a slightly different magnetic address.' },
{ s: 'P', t: 'Researchers tested this idea in tanks. Hatchlings placed in a field that matched one at the edge of a warm ocean current swam in the direction that would keep them inside the current, while hatchlings in a field from the middle of the current simply kept swimming in their original direction.' },
{ s: 'P', t: 'But the magnetic map doesn\'t get an adult all the way home. Once she reaches the right stretch of coast, she seems to switch to other cues, such as the smell of the water and the sound of the surf, to find the exact beach. So it\'s a two-step process: a magnetic map for the long journey and local cues for the final approach.' },
{ s: 'P', t: 'Some details are still unsettled. For example, scientists still don\'t know exactly how the turtles\' bodies detect magnetic fields.' },
],
groups: [mcq('Answer the questions about the talk.', [
Q(6, 'B1', '', 'What is the main topic of the talk?', ['How sea turtles use the Earth\'s magnetic field to navigate', 'Why female turtles lay fewer eggs each year', 'How ocean currents change the temperature of beaches', 'How scientists tag animals for study'], 'magnetic memory', `Giáo sư giới thiệu câu hỏi rùa biển tìm đường về bãi sinh ra rồi giải thích bằng "magnetic memory" – ghi nhớ dấu từ trường của bãi biển quê nhà.`),
Q(7, 'B2', '', 'Why does each stretch of coastline have a different magnetic "address"?', ['The Earth\'s magnetic field varies from place to place.', 'Each beach has its own type of rock.', 'Turtles leave magnetic marks on the sand.', 'Ocean currents change the field every day.'], 'varies from place to place', `Giáo sư nói từ trường Trái Đất "varies from place to place, both in its angle and in its strength" nên mỗi đoạn bờ biển có "địa chỉ từ trường" hơi khác nhau.`),
Q(8, 'B2', 'purpose', 'Why does the professor describe the experiment with hatchlings in tanks?', ['To show that hatchlings respond to magnetic signatures', 'To prove that turtles prefer warm water', 'To explain how tanks are built', 'To compare young and adult turtles'], 'Researchers tested this idea in tanks', `Thí nghiệm trong bể "tested this idea" – kiểm tra giả thuyết rùa con phản ứng với dấu từ trường: bơi đúng hướng khi gặp từ trường khớp với rìa dòng hải lưu.`),
Q(9, 'B1', '', 'According to the professor, how does an adult turtle find the exact beach?', ['By using local cues such as smell and the sound of surf', 'By following other adult turtles', 'By using the position of the sun', 'By repeating the same route every year'], 'the smell of the water and the sound of the surf', `Khi đã đến đúng đoạn bờ biển, rùa chuyển sang tín hiệu địa phương: "the smell of the water and the sound of the surf" – mùi nước và tiếng sóng.`),
Q(10, 'B2', 'inference', 'What does the professor imply about research on sea turtles?', ['Some questions about their abilities remain unanswered.', 'All the details of their navigation are now understood.', 'Experiments have given inconsistent results.', 'Turtles rely only on the smell of the water.'], 'scientists still don\'t know exactly how the turtles\' bodies detect magnetic fields', `Câu cuối: "scientists still don't know exactly how the turtles' bodies detect magnetic fields" → vẫn còn câu hỏi chưa có lời đáp. Giáo sư nói rõ rùa dùng cả bản đồ từ trường lẫn tín hiệu địa phương.`),
])],
});

TF.listening.push({
id: 'tf9-lc3', set: 9, task: 'conversation', title: 'A Broken Laptop at the IT Help Desk',
speakers: { S: { name: 'Student (Noah)', accent: 'en-US', gender: 'm' }, W: { name: 'IT technician', accent: 'en-GB', gender: 'f' } },
script: [
{ say: 'Listen to a conversation between a student and a technician at a campus help desk.' }, { pause: 1 },
{ s: 'S', t: 'Hi. My laptop stopped turning on yesterday, and I have a big paper due on Friday. I\'m kind of panicking, to be honest.' },
{ s: 'W', t: 'Okay, let\'s not panic yet. Did anything happen before it stopped working? Did you drop it, or spill anything on it?' },
{ s: 'S', t: 'No, nothing like that. I just left it charging overnight, and in the morning the screen stayed black.' },
{ s: 'W', t: 'Mm, that sounds like it could be the charger or the battery. Let me test it with one of ours. Give me a second.' },
{ s: 'S', t: 'Sure. Oh, and I should say, it\'s a few years old, so I don\'t know if it\'s still under warranty.' },
{ s: 'W', t: 'Right, it\'s working with our charger, so your charger is the problem, not the laptop. That\'s good news. The warranty doesn\'t matter here, because we can lend you a charger for a week, free of charge.' },
{ s: 'S', t: 'Really? That would be amazing. Do I need to leave anything as a deposit?' },
{ s: 'W', t: 'Just your student ID, and you get it back when you return the charger. But I\'d recommend buying a new one at the bookstore. Yours has a frayed cable, see? That can be a fire risk.' },
{ s: 'S', t: 'Oh, I hadn\'t noticed that. I\'ll go to the bookstore this afternoon, then. And is there anywhere I can finish my paper tonight in case something else goes wrong?' },
{ s: 'W', t: 'The computer lab on the second floor is open until midnight. Just save your work to the cloud so you can open it on any machine.' },
],
groups: [mcq('Answer the questions about the conversation.', [
Q(9, 'B1', '', 'Why does the student go to the help desk?', ['His laptop will not turn on and he has a paper due.', 'He wants to buy a new laptop at a discount.', 'He spilled a drink on his computer.', 'He needs to renew his warranty.'], 'My laptop stopped turning on yesterday', `Sinh viên nói "My laptop stopped turning on yesterday" và có bài viết hạn thứ Sáu nên đến nhờ kiểm tra. Anh khẳng định máy không bị rơi hay đổ nước.`),
Q(10, 'B2', '', 'What does the technician discover?', ['The laptop works with a different charger.', 'The battery has to be replaced.', 'The screen is broken.', 'The laptop is no longer under warranty.'], 'it\'s working with our charger, so your charger is the problem', `Kỹ thuật viên thử bằng sạc của trường và nói "your charger is the problem, not the laptop" – máy vẫn hoạt động nên lỗi nằm ở bộ sạc.`),
Q(11, 'B1', '', 'What must the student leave if he borrows a charger?', ['His student ID', 'A cash deposit', 'His laptop', 'His phone number'], 'Just your student ID', `Cô nói chỉ cần "Just your student ID", sẽ trả lại khi anh mang sạc về. Không cần đặt cọc tiền.`),
Q(12, 'B2', 'inference', 'Why does the technician mention the frayed cable?', ['To suggest that the old charger is unsafe to keep using', 'To explain why the laptop is under warranty', 'To show that the student damaged the laptop', 'To argue that the school charger is better'], 'That can be a fire risk', `Cô chỉ ra dây sạc bị sờn và nói "That can be a fire risk" – ngụ ý nên thay sạc mới chứ không nên tiếp tục dùng cái cũ.`),
Q(13, 'B1', '', 'What does the technician advise the student to do with his paper?', ['Save it to the cloud so he can use any computer', 'Print it before going to the bookstore', 'Email it to the professor tonight', 'Ask for an extension on Friday'], 'save your work to the cloud', `Cô khuyên "save your work to the cloud so you can open it on any machine" – lưu lên đám mây để mở được trên bất kỳ máy nào, đề phòng sự cố khác.`),
])],
});
TF.listening.push({
id: 'tf9-la3', set: 9, task: 'announcement', title: 'Campus Bike Share Launch',
speakers: { A: { name: 'Announcer', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to an announcement on a university campus.' }, { pause: 1 },
{ s: 'A', t: 'Attention, students and staff. The Office of Sustainability is happy to announce the launch of the campus bike share program.' },
{ s: 'A', t: 'Starting next Monday, one hundred bicycles will be available at six stations, including the student center, the science building, and the north parking lot. To use a bike, download the program\'s app and register with your university email. Registration is free, and the first thirty minutes of every ride cost nothing. After that, the fee is one dollar for each additional half hour or part of a half hour.' },
{ s: 'A', t: 'Please return each bike to any station. Bikes left outside a station may be charged an extra five dollars. Helmets are not provided, but students can pick one up for free at the sustainability office in the library basement.' },
{ s: 'A', t: 'To celebrate the launch, we will hold a free repair workshop this Thursday at noon on the lawn outside the student center. Hope to see you there.' },
],
groups: [mcq('Answer the questions about the announcement.', [
Q(7, 'B1', '', 'What is the main purpose of the announcement?', ['To introduce a new bike sharing program', 'To warn students about bicycle theft', 'To announce a change to parking rules', 'To advertise a bike race'], 'the launch of the campus bike share program', `Người thông báo mở đầu bằng "the launch of the campus bike share program" – giới thiệu chương trình xe đạp dùng chung mới của trường.`),
Q(8, 'B2', '', 'How much does it cost to ride for forty minutes?', ['One dollar, for the extra ten minutes', 'Nothing', 'Five dollars', 'Two dollars'], 'the first thirty minutes of every ride cost nothing', `Ba mươi phút đầu miễn phí, sau đó "one dollar for each additional half hour or part of a half hour". Chuyến bốn mươi phút chỉ vượt mười phút nên trả một đô.`),
Q(9, 'B1', '', 'What may happen if a bike is left outside a station?', ['The rider may be charged an extra fee.', 'The rider may lose the free registration.', 'The bike will be sent to the library basement.', 'The rider may be asked to attend a workshop.'], 'may be charged an extra five dollars', `Xe để ngoài trạm "may be charged an extra five dollars" – người dùng có thể bị tính thêm phí năm đô.`),
Q(10, 'B1', '', 'Where can students get a free helmet?', ['At the sustainability office in the library basement', 'At the student center', 'At any bike station', 'At the north parking lot'], 'free at the sustainability office in the library basement', `Mũ bảo hiểm không có sẵn tại trạm nhưng nhận miễn phí ở văn phòng phát triển bền vững dưới tầng hầm thư viện.`),
])],
});
TF.listening.push({
id: 'tf9-lt3', set: 9, task: 'talk', title: 'Physics: How Noise-Canceling Headphones Work',
speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to part of a talk in a physics class.' }, { pause: 1 },
{ s: 'P', t: 'Last time we talked about how sound travels as waves. Today I want to look at an everyday application of that idea: noise-canceling headphones. Many of you probably own a pair. Have you ever wondered how they make a loud airplane cabin suddenly seem quiet?' },
{ s: 'P', t: 'The key concept is interference. When two waves meet, they add together. If the peaks of one wave line up with the peaks of the other, the result is a louder sound. But if the peak of one wave meets the valley of another, they cancel each other out. Engineers call this destructive interference.' },
{ s: 'P', t: 'Now, here is how the headphones use it. A tiny microphone on the outside of the ear cup listens to the noise around you. A small computer chip then creates a new wave that is the mirror image of that noise. Where the noise has a peak, the new wave has a valley. The speaker inside the ear cup plays that mirror wave, and the two waves cancel each other. What reaches your ear is much quieter.' },
{ s: 'P', t: 'Let me give you a sense of the engineering challenge. Sound travels at about three hundred forty meters per second, which sounds fast, but the ear cup is only a few centimeters wide. So the chip has just a fraction of a millisecond to measure the noise, calculate the mirror wave, and play it. Early designs from the nineteen eighties were large, expensive, and mostly used by pilots, who needed to hear radio messages over loud engines. It was only when chips became small and cheap that ordinary travelers could buy them.' },
{ s: 'P', t: 'Of course, there is a catch. The chip needs a little time to analyze the sound and produce the mirror wave. If the noise changes too quickly, the headphones can\'t keep up. That\'s why they work best on steady, low sounds, like the hum of an engine or an air conditioner. A sudden sound, like a door slamming or a dog barking, passes straight through.' },
{ s: 'P', t: 'This is also why many models still use a second method called passive isolation. That simply means a thick cushion around the ear that physically blocks some of the sound, especially higher pitches that the electronics handle poorly. The best headphones combine both approaches.' },
{ s: 'P', t: 'There is one more interesting point. Some people report feeling a slight pressure in their ears when they first use noise-canceling headphones. In fact, nothing is pushing on the ear. The sensation seems to come from the brain being unused to such a complete lack of low-frequency sound. So when you put on a pair, remember that you are using wave physics, not magic. Next week, we\'ll examine how similar ideas are used in car design.' },
],
groups: [mcq('Answer the questions about the talk.', [
Q(11, 'B1', '', 'What is the main topic of the talk?', ['How noise-canceling headphones use wave interference', 'How microphones are manufactured', 'Why airplane cabins are so loud', 'How the ear detects different pitches'], 'noise-canceling headphones', `Giáo sư giới thiệu ứng dụng đời thường của sóng âm là tai nghe chống ồn rồi giải thích cơ chế giao thoa triệt tiêu.`),
Q(12, 'B1', '', 'What happens when the peak of one wave meets the valley of another?', ['The waves cancel each other out.', 'The sound becomes louder.', 'The waves change direction.', 'The sound travels more slowly.'], 'they cancel each other out', `Giáo sư nói khi đỉnh sóng gặp đáy sóng thì "they cancel each other out" – hai sóng triệt tiêu nhau, gọi là giao thoa triệt tiêu.`),
Q(13, 'B1', 'purpose', 'According to the professor, what does the computer chip do?', ['It makes a wave that is the mirror image of the noise.', 'It records the noise for later playback.', 'It raises the volume of the music.', 'It blocks sound with a physical cushion.'], 'the mirror image of that noise', `Chip tạo ra sóng "the mirror image of that noise" – sóng đối xứng với tiếng ồn, phát qua loa để triệt tiêu tiếng ồn bên ngoài.`),
Q(14, 'B2', 'inference', 'What can be inferred about a door slamming?', ['The headphones will not cancel it well.', 'The headphones will cancel it completely.', 'The headphones will make it louder.', 'The headphones will turn off because of it.'], 'passes straight through', `Chip cần thời gian xử lý nên không theo kịp âm thanh thay đổi nhanh; tiếng cửa đóng sầm "passes straight through" – lọt qua gần như nguyên vẹn.`),
Q(15, 'B1', '', 'Why do many models also use thick ear cushions?', ['They block some sound, especially higher pitches.', 'They make the electronics cheaper to build.', 'They improve the battery life.', 'They help the microphone hear better.'], 'especially higher pitches that the electronics handle poorly', `Đệm tai dày chặn bớt âm thanh, nhất là âm cao "that the electronics handle poorly" – phần mạch điện tử xử lý kém. Hai cách kết hợp cho kết quả tốt nhất.`),
Q(16, 'B2', 'inference', 'What does the professor suggest about the feeling of pressure in the ears?', ['It probably comes from the brain, not from physical pressure.', 'It is caused by a fault in the headphones.', 'It shows that the cushions are too tight.', 'It happens only on airplanes.'], 'nothing is pushing on the ear', `Giáo sư nói "nothing is pushing on the ear" và cảm giác dường như đến từ việc não chưa quen với việc thiếu hẳn âm thấp, chứ không phải áp lực thật.`),
])],
});

/* ===================================================================
* WRITING · Build a Sentence (câu 1–10)
* chunks: các cụm từ theo ĐÚNG thứ tự; giao diện tự xáo trộn.
* =================================================================== */
TF.writing.push({
id: 'tf9-bs', set: 9, task: 'sentence', title: 'Build a Sentence · Set 9',
instr: 'Put the words in the correct order to make a grammatical response.',
items: [
{ n: 1, prompt: 'Did you manage to register for the conference?', chunks: ['I was told', 'that', 'registration', 'closed', 'two days', 'ago'], end: '.', starter: 'Sadly,',
explain: 'Động từ tường thuật bị động "I was told that + mệnh đề" (tôi được báo rằng…). Mệnh đề sau "that" dùng thì quá khứ đơn "closed" với mốc "two days ago" đứng cuối câu.' },
{ n: 2, prompt: 'What is the penalty for returning a book late?', chunks: ['you will be', 'charged', 'a small fee', 'for each', 'day'], end: '.', alt: ['for each day you will be charged a small fee'],
explain: 'Bị động tương lai "will be charged + khoản phí" (sẽ bị tính phí). "for each day" (cho mỗi ngày) là trạng ngữ, có thể đứng cuối hoặc đầu câu.' },
{ n: 3, prompt: 'Is your roommate moving out?', chunks: ['she', 'has', 'already', 'found', 'a place', 'closer to work'], end: '.',
explain: 'Thì hiện tại hoàn thành "has already found" (đã tìm được rồi); trạng từ "already" đứng giữa trợ động từ và V3. "closer to work" bổ nghĩa cho "a place".' },
{ n: 4, prompt: 'Why do geese fly in a V shape?', chunks: ['it helps', 'them', 'save', 'energy', 'on', 'long journeys'], end: '.',
explain: 'Cấu trúc "help + O + V nguyên mẫu" (giúp ai làm gì): "it helps them save energy". Cụm "on long journeys" (trong những chuyến đi dài) đứng cuối.' },
{ n: 5, prompt: 'Could you explain what the lease says about pets?', chunks: ['it states', 'that', 'tenants', 'must', 'ask permission', 'first'], end: '.',
explain: '"state that + mệnh đề" (nêu rõ rằng…); mệnh đề sau gồm chủ ngữ "tenants" + modal "must" + V "ask permission"; trạng từ "first" (trước tiên) đứng cuối.' },
{ n: 6, prompt: 'How did the glacier look compared with last year?', chunks: ['the ice', 'had', 'shrunk', 'so much', 'that', 'the lake', 'was visible'], end: '.',
explain: 'Cấu trúc kết quả "so much that + mệnh đề" (nhiều đến mức…). "had shrunk" là quá khứ hoàn thành (đã thu nhỏ trước thời điểm được nhắc đến), "was visible" là kết quả.' },
{ n: 7, prompt: 'Do you know when the new exhibit opens?', chunks: ['I', 'have no idea', 'when', 'it', 'is', 'going to open'], end: '.',
explain: 'Câu hỏi lồng: "I have no idea + when + S + V". Trong mệnh đề lồng KHÔNG đảo chủ ngữ: "when it is going to open", không phải "when is it going to open".' },
{ n: 8, prompt: 'Has the schedule for the workshop been fixed yet?', chunks: ['the schedule', 'has been', 'changed', 'twice', 'since', 'last week'], end: '.',
explain: 'Hiện tại hoàn thành bị động "has been changed" (đã bị thay đổi); "twice" chỉ số lần, "since last week" (kể từ tuần trước) đi với hiện tại hoàn thành.' },
{ n: 9, prompt: 'Why is the print shop so crowded today?', chunks: ['everyone', 'is', 'trying', 'to print', 'their posters', 'before', 'noon'], end: '.',
explain: 'Thì hiện tại tiếp diễn "is trying to + V" (đang cố làm gì). "before noon" (trước buổi trưa) là trạng ngữ thời gian đặt cuối câu.' },
{ n: 10, prompt: 'Should I sign the lease or keep looking?', chunks: ['if I', 'were', 'you', 'I would', 'sign', 'the lease', 'today'], end: '.', alt: ['I would sign the lease today if I were you'],
explain: 'Lời khuyên bằng câu điều kiện loại 2: "If I were you, I would + V" (nếu tôi là bạn thì tôi sẽ…). Dùng "were" cho mọi ngôi trong mệnh đề if giả định.' },
],
});

/* ===================================================================
* WRITING · Write an Email
* =================================================================== */
TF.writing.push({
id: 'tf9-em1', set: 9, task: 'email', title: 'A Broken Heater in Your Apartment', minutes: 7,
scenario: 'You rent an apartment near campus. The heater in your living room stopped working five days ago, and it is now very cold at night. You have already left two voicemail messages for the property manager.',
to: 'Mr. Dawson, the property manager',
points: ['Explain the problem and how long it has lasted.', 'Describe how it is affecting you and what you have already done.', 'Ask for a specific repair date or another solution.'],
model: 'Dear Mr. Dawson,\n\nI am a tenant in apartment 4B, and I am writing about the heater in my living room. It stopped working five days ago, and since then the temperature in the apartment has dropped so low at night that I find it difficult to sleep or study.\n\nI left voicemail messages on Monday and Wednesday, but I have not yet received a reply. In the meantime, I have been using extra blankets and a small fan heater that I bought myself, although it is not a safe long-term solution.\n\nCould you please let me know when a technician can come to repair the heater? If that is not possible this week, I would appreciate it if you could lend me a portable heater until the repair is finished. I am available any afternoon after two o\'clock.\n\nThank you for your help.\n\nSincerely,\nAnh Pham',
checklist: ['Nêu rõ bạn là ai (căn hộ nào) và vấn đề gì ngay đoạn đầu', 'Có đủ cả 3 ý trong đề (vấn đề và thời gian – ảnh hưởng và việc đã làm – đề nghị cụ thể)', 'Giọng văn lịch sự nhưng rõ ràng, không giận dữ', 'Dùng câu đề nghị lịch sự: "Could you please…?", "I would appreciate it if…"', 'Có lời kết và ký tên', 'Khoảng 120–180 từ, không lỗi chính tả'],
tips: 'Với thư gửi chủ nhà, hãy nêu thời gian cụ thể (five days) và việc đã thử (voicemail) để người đọc thấy vấn đề nghiêm túc. Cuối thư luôn kèm một đề nghị có thể thực hiện (ngày sửa hoặc giải pháp tạm).',
});
TF.writing.push({
id: 'tf9-em2', set: 9, task: 'email', title: 'A Double Charge for Conference Registration', minutes: 7,
scenario: 'You registered online for a student research conference last week. Today you checked your bank statement and saw that the $95 registration fee was charged twice. The conference starts in nine days.',
to: 'the Conference Registration Office',
points: ['Explain the problem with your payment.', 'Give the details that will help them find your registration.', 'Ask for a specific solution and a reply before the conference.'],
model: 'Dear Registration Office,\n\nI am writing about my registration for the Student Research Conference. When I checked my bank statement today, I noticed that the $95 registration fee was charged twice on the same day, March 3.\n\nMy registration was confirmed under the name Carlos Mendez, with confirmation number SR-20418, and I paid by credit card. I have attached a screenshot of the two charges to make the problem easier to check.\n\nCould you please refund the second payment to my card? Because the conference begins in nine days, I would be grateful if you could confirm by email whether the refund has been approved, and whether my place at the conference is still secure.\n\nThank you very much for your help.\n\nBest regards,\nCarlos Mendez',
checklist: ['Nêu rõ vấn đề (bị trừ tiền hai lần) ngay đoạn đầu', 'Cung cấp thông tin giúp tra cứu: tên, mã xác nhận, ngày, cách thanh toán', 'Đề nghị cụ thể (hoàn tiền khoản thứ hai) kèm thời hạn mong muốn', 'Giọng điệu lịch sự, trang trọng', 'Có lời kết phù hợp ("Thank you very much for your help")', 'Khoảng 120–180 từ'],
tips: 'Thư khiếu nại hiệu quả khi cung cấp đủ chi tiết để người nhận xử lý ngay mà không phải hỏi lại. Nên nhắc mốc thời gian (nine days) để giải thích vì sao bạn cần trả lời sớm.',
});

/* ===================================================================
* WRITING · Write for an Academic Discussion
* =================================================================== */
TF.writing.push({
id: 'tf9-ad1', set: 9, task: 'discussion', title: 'Should Textbooks Be Printed or Digital?', minutes: 10,
professor: { name: 'Dr. Okafor', text: 'In our unit on the history of communication, we have seen how the printing press made books cheaper and more widely available. Today many universities are moving from printed textbooks to digital ones. Supporters say digital books are cheaper and easier to carry; critics say that students read less carefully on screens and are more easily distracted. Should universities replace printed textbooks with digital versions? Why or why not?' },
students: [
{ name: 'Marta', text: 'I think universities should switch. A digital textbook costs half as much, and I can search it in seconds. Carrying five heavy books every day is a real problem for students.' },
{ name: 'Joon', text: 'I disagree. When I read on a screen I check my messages every few minutes. With a printed book I focus much longer, and studies show that people remember more from paper.' },
],
model: 'Both Marta and Joon raise important points, but I believe universities should offer both formats instead of replacing one with the other. Marta is right that digital books reduce costs and make searching easy, which is especially useful for students who need to find a single definition quickly. However, Joon\'s concern about distraction is real. In my own experience, I use digital textbooks for reference, but I print the chapters I need to study carefully. Universities could therefore provide digital copies for everyone and low-cost printing for students who prefer paper. In this way, no student is forced to choose between saving money and learning effectively.',
checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Nhắc đến ý của ít nhất một bạn (Marta/Joon) và phản hồi', 'Đưa ra ý MỚI, không chỉ nhắc lại ý của bạn khác', 'Có ví dụ hoặc trải nghiệm cụ thể', 'Tối thiểu khoảng 100 từ, câu đa dạng', 'Câu kết tóm lại lập trường'],
tips: 'Khi hai bạn nêu hai lập trường đối lập, bạn có thể đề xuất giải pháp kết hợp (cả hai định dạng) và nêu lý do riêng. Dùng cụm "Marta is right that…, however…", "A better solution would be…".',
});
TF.writing.push({
id: 'tf9-ad2', set: 9, task: 'discussion', title: 'Should Governments Use Nudges?', minutes: 10,
professor: { name: 'Professor Reyes', text: 'In our behavioral economics unit, we have discussed "nudges": small changes in how choices are presented that guide people toward better decisions without forbidding anything. For example, some governments enroll workers in retirement savings plans automatically, although they can opt out. Supporters say nudges help people without limiting freedom; critics say they can be a hidden form of manipulation. Should governments use nudges to influence people\'s choices? Why or why not?' },
students: [
{ name: 'Dana', text: 'I support nudges. People can still opt out, so nobody is forced. And automatic enrollment has helped millions of workers save money they would otherwise never have saved.' },
{ name: 'Felix', text: 'I am uncomfortable with them. If people are not aware that they are being steered, it is not really a free choice. Governments should explain things openly and let citizens decide.' },
],
model: 'I agree with Dana that nudges can help people, but Felix\'s worry about hidden influence deserves attention. The best approach is to allow nudges only when they are transparent and easy to refuse. For instance, an employer that enrolls staff in a savings plan can send a clear letter explaining the default and how to opt out in one click. That keeps the benefit Dana describes, because most workers will still save, and it respects the openness Felix wants. Nudges should also aim at goals people themselves would support, such as saving for retirement, rather than at goals that mainly benefit the government. In short, nudges are acceptable if citizens know about them.',
checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Phản hồi ý của Dana hoặc Felix', 'Đưa ra lập luận/ý mới (ví dụ: nudge phải minh bạch)', 'Có ví dụ minh họa cụ thể', 'Dùng từ nối: For instance, In short, rather than', 'Tối thiểu khoảng 100 từ'],
tips: 'Chủ đề có hai phe rõ rệt: bạn có thể chọn một phe nhưng thêm điều kiện (ví dụ minh bạch), như vậy vừa thừa nhận phe kia vừa thể hiện ý riêng.',
});

/* ===================================================================
* SPEAKING · Listen and Repeat
* =================================================================== */
TF.speaking.push({
id: 'tf9-rp1', set: 9, task: 'repeat', title: 'Library Orientation', accent: 'en-US',
context: 'You are attending a library orientation for new students. Listen to the librarian and repeat exactly what you hear.',
sentences: [
{ t: 'Welcome to the library.', tip: 'Câu ngắn – đọc rõ âm cuối /i/ của "library" và nối "Welcome to".' },
{ t: 'The main desk is on your right.', tip: 'Nhấn "RIGHT"; "desk" kết thúc bằng cụm phụ âm /sk/, đọc dứt khoát.' },
{ t: 'You can borrow up to ten books for three weeks.', tip: '"up to ten" đọc liền; "three weeks" – âm /θr/ đầu lưỡi giữa răng rồi cuộn nhẹ.' },
{ t: 'Overdue items are charged twenty-five cents per day.', tip: 'Nhấn "OVerdue" ở âm đầu; "twenty-five cents" – âm cuối /s/ trong "cents" cần rõ.' },
{ t: 'Please keep your voice down on the third and fourth floors.', tip: 'Chia nhịp: "Please keep your voice down / on the third and fourth floors"; âm /θ/ ở "third" và /fɔːrθ/ ở "fourth".' },
{ t: 'Study rooms can be reserved online up to two days in advance.', tip: 'Bị động "can be reserved"; nối "up to" và nhấn "ONline", "adVANCE".' },
{ t: 'If you cannot find a book, any librarian will be happy to help you.', tip: 'Ngữ điệu lên ở "book," rồi xuống ở cuối câu; "librarian" nhấn âm thứ hai: /laɪˈbrɛriən/.' },
],
});
TF.speaking.push({
id: 'tf9-rp2', set: 9, task: 'repeat', title: 'Conference Registration Desk', accent: 'en-GB',
context: 'You are working at the registration desk of a conference. Listen to the manager and repeat exactly what you hear.',
sentences: [
{ t: 'Good morning, and welcome.', tip: 'Ngữ điệu xuống ở cuối câu thể hiện sự thân thiện; "morning" đọc /ˈmɔːnɪŋ/.' },
{ t: 'Could I see your confirmation email?', tip: 'Ngữ điệu lên ở cuối câu hỏi Yes/No; nhấn "conFIRmation".' },
{ t: 'Your badge is in the blue folder.', tip: 'Nối "badge is" → /ˈbædʒɪz/; phân biệt "blue" /bluː/ với "blow".' },
{ t: 'The opening session begins at nine thirty in the main hall.', tip: 'Đọc giờ "nine thirty"; nhấn "OPening" và "MAIN hall".' },
{ t: 'Lunch is not included, but there are several cafés nearby.', tip: 'Nhấn tương phản "NOT" và "several"; "included" nhấn âm thứ hai /ɪnˈkluːdɪd/.' },
{ t: 'Please wear your badge at all times so that security can see it.', tip: 'Câu dài – ngắt sau "times"; "security" nhấn âm thứ hai: /sɪˈkjʊərəti/.' },
{ t: 'If you would like to attend the dinner, you will need to buy a ticket by Friday.', tip: 'Ngữ điệu lên ở "dinner," rồi xuống ở cuối; "would like to" đọc nhẹ và nhanh.' },
],
});

/* ===================================================================
* SPEAKING · Take an Interview
* =================================================================== */
TF.speaking.push({
id: 'tf9-iv1', set: 9, task: 'interview', title: 'Housing and Roommates', seconds: 45, accent: 'en-US',
context: 'A researcher is interviewing students about where and how they live. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'To begin, could you describe where you live now and what you like about it?',
model: 'I live in a small shared apartment about fifteen minutes from campus. What I like most is the location, because I can walk to class and there are several cheap restaurants nearby. The living room also gets a lot of sunlight, which makes it a pleasant place to study.',
tip: 'Trả lời thẳng câu hỏi ở câu đầu (nơi ở), rồi thêm 2 điều bạn thích. Chi tiết cụ thể (thời gian đi bộ, ánh sáng) làm câu trả lời sinh động.' },
{ q: 'Would you rather live alone or with roommates? Please explain.',
model: 'I would rather live with roommates, mainly because it\'s cheaper and I don\'t feel lonely. We share the cooking and the cleaning, so nobody gets too tired. On the other hand, it can be noisy, so we made a rule that nobody invites guests during exam week.',
tip: 'Nêu lựa chọn + lý do, rồi thêm một mặt hạn chế ("On the other hand, …") và cách bạn giải quyết.' },
{ q: 'Some people say that signing a long lease is risky for students. Do you agree?',
model: 'I partly agree. A twelve-month lease can be risky if your plans might change, for example if you want to study abroad. But longer leases usually have lower rent, which saves money. So I think students should read the contract carefully and ask whether they can end the lease early.',
tip: 'Câu hỏi quan điểm: đồng ý một phần, nêu cả rủi ro lẫn lợi ích, rồi kết bằng lời khuyên cụ thể.' },
{ q: 'Finally, if your university could improve one thing about student housing, what should it be?',
model: 'I think the university should provide more quiet study areas inside the residence halls. Many students struggle to focus in their rooms at night, so they have to walk to the library, which is not always open. A small study lounge on every floor would help them concentrate and feel safer.',
tip: 'Đề xuất một ý cụ thể, giải thích vấn đề nó giải quyết và lợi ích. Dùng "I think … should …", "This would help …".' },
],
});
TF.speaking.push({
id: 'tf9-iv2', set: 9, task: 'interview', title: 'Money and Spending Habits', seconds: 45, accent: 'en-GB',
context: 'A researcher is interviewing young adults about how they handle money. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'How do you usually decide whether to buy something that is not a necessity?',
model: 'Usually I wait a few days before buying anything I don\'t really need. If I still want it after that, I compare prices online and read reviews. This habit has saved me from many impulse purchases, especially when I see a big discount that seems exciting at first.',
tip: 'Mô tả quy trình bằng các từ nối thời gian (usually, after that) và kết bằng lợi ích của thói quen.' },
{ q: 'Do you prefer to save money regularly or to spend it when you want to? Why?',
model: 'I prefer to save a fixed amount every month, because it gives me a sense of security. However, I also keep a small budget for fun, so I don\'t feel guilty when I go out with friends. I think a balance between the two works best for me.',
tip: 'Nêu lựa chọn + lý do, rồi cho thấy bạn linh hoạt ("However, …") để câu trả lời sâu hơn.' },
{ q: 'Some stores offer "buy one, get one free" deals. Do you think these deals really save people money?',
model: 'Sometimes, yes, but often they encourage people to buy more than they need. If I had not planned to buy the first item anyway, the deal makes me spend more, not less. So I only take these offers for products I use regularly, like shampoo or rice.',
tip: 'Dùng câu điều kiện để lập luận ("If I had not planned to…"); nêu ví dụ cụ thể (shampoo, rice).' },
{ q: 'How do you think young people\'s attitudes toward money will change in the next ten years?',
model: 'I expect young people to rely more on digital payments, so they might notice their spending less. That could make it easier to overspend, but it will also make it simpler to track expenses with apps. I hope schools will teach more about budgeting so that young people are prepared.',
tip: 'Câu hỏi dự đoán: dùng "I expect … to …", "might", "I hope …". Nêu cả mặt tích cực và tiêu cực.' },
],
});
})(typeof self !== 'undefined' ? self : this);
