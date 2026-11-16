/* TOEFL iBT (định dạng từ 21/01/2026) – Bộ luyện tập 7. Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
* Cùng cấu trúc bộ 1: Reading (cw ×2, daily ×4, academic ×2), Listening (response, conversation ×2, announcement ×2, talk ×2),
* Writing (sentence, email ×2, discussion ×2), Speaking (repeat ×2, interview ×2).
* Nạp SAU data1.js: chỉ BỔ SUNG vào window.TOEFL. Đáp án đúng soạn ở vị trí 0 rồi đặt theo mẫu xoay (A–D đều, không chạy quá 2 liên tiếp). */
(function (g) {
const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });
const mcq = (instr, items) => ({ type: 'mcq', instr, items });
const PAT = [2, 0, 3, 1, 1, 3, 0, 2, 3, 2, 1, 0];
const HARD = ['inference', 'purpose', 'negative', '!'];
const LVE = ['B1', 'B2', 'B2', 'B1', 'B2', 'C1', 'B1', 'B2', 'B2', 'B1', 'B2', 'B2', 'B1'];
const cnt = { all: 0, easy: 0 };
/* Q(n, câu hỏi, [đúng, sai, sai, sai], cue, lời giải, type): đặt đáp án đúng theo PAT, gán lv (câu suy luận/mục đích/ngoại trừ = C1; còn lại xoay B1/B2, thỉnh thoảng C1 → ≈30/50/20). */
const Q = (n, q, o, cue, explain, type, lvo) => {
const a = PAT[cnt.all++ % PAT.length], w = o.slice(1); w.splice(a, 0, o[0]);
const hard = HARD.includes(type), lv = lvo || (hard ? 'C1' : LVE[cnt.easy++ % LVE.length]);
const r = { n, q, options: w, a, lv };
if (type && type !== '!') r.type = type;
r.cue = cue; r.explain = explain; return r;
};

/* ===================================================================
* READING · Complete the Words
* =================================================================== */
TF.reading.push({
id: 'tf7-cw1', set: 7, task: 'cw', title: 'Wildlife in the City',
instr: 'Fill in the missing letters in the paragraph.',
text: `Cities are not empty of wildlife; many animals have learned to live alongside people. Peregrine falcons, for example, {ne|st} on skyscraper ledges that {res|emble} the cliffs where their ancestors once lived. Foxes {sea|rch} bins and gardens {fo|r} food, {wh|ile} bees {col|lect} nectar from rooftop flowers. Biologists {stu|dy} these animals {t|o} learn how species adapt to noise and heat. Some city birds now sing {hi|gher} than rural birds so that their songs can be {he|ard} above the traffic.`,
explain: [
'"nest" = làm tổ; động từ chia số nhiều theo chủ ngữ "Peregrine falcons" (chim cắt lớn), tổ trên gờ nhà chọc trời.',
'"resemble" = giống với; mệnh đề quan hệ "that resemble the cliffs" mô tả gờ nhà giống vách đá.',
'"search bins" = lục lọi thùng rác; chủ ngữ "Foxes" số nhiều nên động từ giữ nguyên "search".',
'"for food" = để tìm thức ăn; giới từ "for" chỉ mục đích sau động từ "search".',
'"while" = trong khi; nối hai hành động song song của cáo và ong.',
'"collect nectar" = thu thập mật hoa; "collect" đi với tân ngữ "nectar".',
'"study" = nghiên cứu; chủ ngữ "Biologists" số nhiều nên dùng "study".',
'"to learn" = để tìm hiểu; "to + V" chỉ mục đích của việc nghiên cứu.',
'"higher" = cao hơn; so sánh hơn với "than rural birds" (chim ở nông thôn).',
'"be heard" = được nghe thấy; bị động sau "can": "their songs can be heard above the traffic".',
],
});
TF.reading.push({
id: 'tf7-cw2', set: 7, task: 'cw', title: 'Microfinance',
instr: 'Fill in the missing letters in the paragraph.',
text: `Microfinance means offering very small loans to people who cannot borrow from ordinary banks. A street vendor, {fo|r} instance, might {bor|row} fifty dollars to buy more goods. Many lenders {req|uire} borrowers to form {sm|all} groups whose {mem|bers} promise to {he|lp} one another repay their loans. Because {nei|ghbors} know each {ot|her} well, repayment {ra|tes} are often high. Critics, {how|ever}, warn that small loans alone seldom end poverty.`,
explain: [
'"for instance" = ví dụ; cụm cố định dùng sau danh từ đứng đầu câu để đưa ra minh họa.',
'"borrow" = vay; "might borrow fifty dollars" – người bán hàng rong có thể vay 50 đô.',
'"require" = yêu cầu; chủ ngữ "Many lenders" số nhiều nên động từ giữ nguyên dạng.',
'"small groups" = nhóm nhỏ; tính từ đứng trước danh từ "groups".',
'"members" = các thành viên; danh từ số nhiều làm chủ ngữ của "promise" trong mệnh đề "whose…".',
'"promise to help" = hứa giúp đỡ; "promise + to V", rồi "one another" là tân ngữ.',
'"neighbors" = hàng xóm; vì hàng xóm biết rõ nhau nên khoản vay dễ được hoàn trả.',
'"each other" = nhau; đại từ tương hỗ đứng sau động từ "know".',
'"repayment rates" = tỷ lệ hoàn trả; danh từ ghép, đi với "are often high".',
'"however" = tuy nhiên; trạng từ chèn giữa dấu phẩy để chuyển sang ý phản biện của giới phê bình.',
],
});

/* ===================================================================
* READING · Read in Daily Life (câu 1–10)
* =================================================================== */
TF.reading.push({
id: 'tf7-dl1', set: 7, task: 'daily', title: 'Lab Safety Notice',
text: `CHEMISTRY TEACHING LAB – SAFETY NOTICE\nEffective Monday, October 6\n\nAll students must now complete the online safety quiz before their first lab session. Anyone who has not passed the quiz will not be allowed to enter the lab.\n\nClosed-toe shoes and splash goggles are required at all times. Goggles can be borrowed from the stockroom, but contact lenses are discouraged because chemicals can become trapped behind them. Long hair must be tied back.\n\nEating and drinking are not permitted in the lab, even if a bottle is sealed. Report any spills or broken glass to your teaching assistant immediately; do not clean them up yourself.\n\nQuestions? Contact the lab coordinator, Dr. Ibarra, at 555-0142.`,
groups: [mcq('Read the notice and answer the questions.', [
Q(1, 'What must students do before their first lab session?', ['Pass an online safety quiz', 'Buy their own goggles', 'Meet the lab coordinator in person', 'Attend a training session in the stockroom'], 'complete the online safety quiz before their first lab session', 'Thông báo nói mọi sinh viên phải "complete the online safety quiz before their first lab session" – phải làm bài kiểm tra an toàn trực tuyến, ai chưa đạt thì không được vào phòng thí nghiệm.', undefined, 'A2'),
Q(2, 'According to the notice, what can a student do who does not own goggles?', ['Borrow a pair from the stockroom', 'Wear contact lenses instead', 'Work without them if no chemicals are in use', 'Ask the teaching assistant to buy a pair'], 'Goggles can be borrowed from the stockroom', '"Goggles can be borrowed from the stockroom" – kính bảo hộ có thể mượn ở kho. Kính áp tròng không thay thế được, và kính bảo hộ "required at all times" (bắt buộc mọi lúc).', undefined, 'A2'),
Q(3, 'What can be inferred about a student who brings a sealed water bottle to the lab?', ['The student will not be allowed to drink from it in the lab.', 'The student may drink as long as the bottle stays closed.', 'The student must pass the safety quiz a second time.', 'The student will be asked to clean the lab afterward.'], 'even if a bottle is sealed', 'Quy định ghi ăn uống không được phép "even if a bottle is sealed" (kể cả chai còn đóng kín) → sinh viên không được uống nước trong phòng thí nghiệm dù chai đã đậy nắp.', '!', 'B1'),
])],
});
TF.reading.push({
id: 'tf7-dl2', set: 7, task: 'daily', title: 'Email from the Residence Hall Director',
text: `From: Tomas Weber, Residence Hall Director, Larch Hall\nTo: All Larch Hall residents\nSubject: Fire alarm testing and winter break housing\n\nDear residents,\n\nTechnicians will test the fire alarms on every floor this Wednesday between 1 p.m. and 4 p.m. The alarms will sound for a few seconds in each room, so please do not be alarmed, and do not call the fire department. You do not need to be in your room, but a staff member must be able to enter, so please remove any items blocking the door.\n\nAlso, the form for winter break housing is now open. Students who plan to stay in the building over the break must submit it by November 20. Those who miss the deadline will have to pay a late fee of thirty dollars, and rooms cannot be guaranteed.\n\nThank you,\nTomas`,
groups: [mcq('Read the email and answer the questions.', [
Q(4, 'What is the main purpose of the email?', ['To inform residents about an alarm test and a housing deadline', 'To announce that the hall will close for the winter', 'To ask residents to leave the building on Wednesday', 'To introduce a new late fee for all students'], 'Technicians will test the fire alarms', 'Email nêu hai việc: kỹ thuật viên sẽ kiểm tra chuông báo cháy vào thứ Tư, và biểu mẫu ở lại ký túc xá dịp nghỉ đông đã mở với hạn nộp 20/11. Phí trễ hạn chỉ áp dụng cho người nộp muộn.', undefined, 'B1'),
Q(5, 'What are residents asked to do before the alarm test?', ['Clear anything that blocks their door', 'Stay in their rooms during the test', 'Call the fire department to report it', 'Turn off the alarm in their room'], 'remove any items blocking the door', 'Email viết "please remove any items blocking the door" – hãy dọn đồ chắn cửa để nhân viên vào được. Cư dân KHÔNG cần ở trong phòng và không được gọi cứu hỏa.', undefined, 'A2'),
Q(6, 'What will happen to a student who submits the winter housing form after November 20?', ['The student must pay a fee and may not get a room.', 'The student must move to a different building.', 'The student will be told to leave in November.', 'The student must deliver the form in person.'], 'late fee of thirty dollars', 'Người nộp muộn phải trả "a late fee of thirty dollars" và "rooms cannot be guaranteed" – phòng không được đảm bảo, tức là có thể không có chỗ ở.', undefined, 'B1'),
])],
});
TF.reading.push({
id: 'tf7-dl3', set: 7, task: 'daily', title: 'Community Library Flyer',
text: `MAPLE STREET BRANCH LIBRARY\nReading Buddies: Homework Help for Kids\n\nMondays and Thursdays, 3:30–5:00 p.m., starting September 15 (free)\n\nVolunteer tutors from Westfield College help children in grades 2 to 6 with reading and math. No library card is needed, and children may drop in at any time during the session. A parent or guardian must stay in the building while the child is in the program.\n\nAdults who would like to volunteer as tutors should attend a short training on September 8 at 6 p.m. Register at the front desk.`,
groups: [mcq('Read the flyer and answer the questions.', [
Q(7, 'What must a parent or guardian do while a child attends Reading Buddies?', ['Remain somewhere in the building', 'Sit beside the child in the session', 'Sign a form at the front desk each week', 'Pay a small weekly fee'], 'must stay in the building', 'Tờ rơi ghi phụ huynh "must stay in the building" – phải ở lại trong tòa nhà, không nhất thiết ngồi cạnh con. Chương trình miễn phí nên không có khoản phí hằng tuần.', undefined, 'A2'),
Q(8, 'What can be inferred about the program?', ['Families do not have to sign up before each session.', 'Only college students may attend as learners.', 'Children need a library card to take part.', 'It is held on weekend mornings.'], 'may drop in at any time', 'Trẻ "may drop in at any time during the session" (đến lúc nào cũng được) → gia đình không cần đăng ký trước từng buổi. Chương trình vào thứ Hai và thứ Năm, không cần thẻ thư viện.', '!', 'B2'),
])],
});
TF.reading.push({
id: 'tf7-dl4', set: 7, task: 'daily', title: 'Text Messages',
text: `Priya (8:40 p.m.): Hey, did you see the dorm email? Quiet hours will start at 10 p.m. on weeknights instead of midnight.\nJonas (8:43 p.m.): Seriously? That's going to be rough. I usually practice guitar after dinner.\nPriya (8:45 p.m.): There are soundproof practice rooms in the basement, I think. You just have to book a slot.\nJonas (8:46 p.m.): Good to know. I'll check it out tomorrow. Thanks for the heads-up!`,
groups: [mcq('Read the messages and answer the questions.', [
Q(9, 'Why does Jonas think the new quiet hours will be difficult?', ['He likes to play guitar in the evening.', 'He usually goes to bed before ten.', 'He lives next to the practice rooms.', 'He works late on weeknights.'], 'I usually practice guitar after dinner', 'Jonas nói "I usually practice guitar after dinner" – anh thường tập guitar sau bữa tối, nên giờ yên tĩnh bắt đầu từ 10 giờ tối làm anh khó tập.', undefined, 'A2'),
Q(10, 'What does Jonas mean when he writes "Thanks for the heads-up!"?', ['He is grateful that Priya warned him in advance.', 'He wants Priya to reserve a room for him.', 'He thinks Priya is too noisy at night.', 'He plans to ask for a different dorm.'], 'Thanks for the heads-up', '"heads-up" là lời báo trước. Priya báo tin về giờ yên tĩnh mới và phòng tập cách âm, nên Jonas cảm ơn vì được thông báo sớm.', undefined, 'B1'),
])],
});

/* ===================================================================
* READING · Read an Academic Passage (câu 1–20)
* =================================================================== */
TF.reading.push({
id: 'tf7-ap1', set: 7, task: 'academic', title: 'The Champagne Fairs of Medieval Europe',
text: [
`In the twelfth and thirteenth centuries, the county of Champagne in northeastern France hosted some of the busiest markets in medieval Europe. Six fairs, held in four towns, followed one another in a cycle that lasted nearly the whole year, so a merchant could always find a market open somewhere in the region. Traders arrived from Italy, Flanders, and England, carrying woolen cloth, spices, leather, and furs. The fairs were not simply places to buy and sell; they were also the main meeting points where merchants from distant regions settled accounts.`,
`Champagne succeeded in part because of its location. It lay between the cloth-making towns of Flanders in the north and the Italian cities that received luxury goods from the eastern Mediterranean in the south. Roads from both directions crossed there, which made the fairs convenient for everyone. The counts of Champagne also understood that merchants would attend only if they felt safe. They guaranteed protection to travelers on the roads leading to the fairs, and they set up special courts to resolve disputes quickly. A merchant who had been cheated could expect a judgment within days rather than waiting months.`,
`Money posed a problem. Coins were heavy, many different currencies circulated, and carrying large amounts on the road invited robbers. Merchants therefore developed new methods. Instead of paying in cash for every purchase, they recorded debts and credits during the first weeks of a fair and then canceled them against each other in a final settlement period. Only the remaining balance had to be paid in coins. Money changers also issued written promises to pay in another town, a forerunner of the modern bank check. These practices reduced the amount of silver that had to be transported.`,
`The fairs began to decline in the late thirteenth century. When Champagne came under the control of the French crown, the special privileges that had attracted foreign traders were gradually weakened. At the same time, ships in the Mediterranean and the Atlantic grew larger and safer, so Italian merchants could carry goods by sea to Flanders without crossing France. Permanent trading houses with agents stationed in foreign cities made it unnecessary to wait for a fair at all. By around 1320, the great cycle had mostly ended.`,
`Historians value the Champagne fairs not only as a chapter in the history of commerce but also as a model of how trust is built. Reliable courts, safe roads, and shared accounting rules did as much to encourage trade as the goods themselves. When these supports disappeared, the trade simply found a different route.`,
].join('\n\n'),
groups: [mcq('Read the passage and answer the questions.', [
Q(1, 'According to paragraph 1, why could a merchant always find a market open in Champagne?', ['The six fairs followed one another through most of the year.', 'Each town held a fair every week of the year.', 'Merchants could set up stalls in any town they chose.', 'The fairs took place only during the summer months.'], 'followed one another in a cycle that lasted nearly the whole year', 'Dạng FACTUAL. Sáu phiên chợ ở bốn thị trấn "followed one another in a cycle that lasted nearly the whole year" – nối tiếp nhau gần như quanh năm nên lúc nào cũng có chợ mở.', 'factual', 'B1'),
Q(2, 'The word "settled" in paragraph 1 is closest in meaning to', ['paid off', 'moved to', 'calmed down', 'argued over'], 'settled accounts', 'Dạng VOCABULARY. "settled accounts" = thanh toán các khoản nợ giữa các thương nhân → "paid off". Các nghĩa khác của "settle" (định cư, bình tĩnh lại) không hợp với "accounts".', 'vocab', 'B2'),
Q(3, 'According to paragraph 2, what made Champagne a convenient meeting place?', ['Trade routes from Flanders and Italy crossed there.', 'It had the busiest harbors in Europe.', 'It produced most of the cloth sold at the fairs.', 'Its rulers owned most of the goods for sale.'], 'Roads from both directions crossed there', 'Dạng FACTUAL. Champagne nằm giữa Flanders và các thành phố Ý, "Roads from both directions crossed there" – đường từ hai phía giao nhau ở đó nên ai cũng đến thuận tiện.', 'factual', 'B1'),
Q(4, 'Why does the author mention that a cheated merchant could expect a judgment within days?', ['To show how the counts made the fairs attractive to traders', 'To suggest that merchants were often dishonest', 'To argue that medieval courts were stricter than modern ones', 'To explain why the fairs lasted for most of the year'], 'special courts to resolve disputes quickly', 'Dạng RHETORICAL PURPOSE. Tòa án đặc biệt "to resolve disputes quickly" là một cách các bá tước tạo cảm giác an toàn, giúp hội chợ hấp dẫn thương nhân. Đoạn văn không so sánh với tòa án hiện đại.', 'purpose', 'B2'),
Q(5, 'According to paragraph 3, all of the following were methods merchants used to reduce the risk of carrying coins EXCEPT', ['hiring armed guards to travel with the silver', 'canceling debts against credits at the end of a fair', 'paying only the remaining balance in coins', 'using written promises to pay in another town'], 'canceled them against each other in a final settlement period', 'Dạng NEGATIVE FACTUAL. Đoạn 3 nêu: ghi nợ và có rồi bù trừ vào cuối hội chợ, chỉ trả phần chênh lệch bằng tiền xu, và dùng giấy hứa trả ở thị trấn khác. Việc thuê vệ sĩ không được nhắc → đáp án.', 'negative', 'B2'),
Q(6, 'The word "forerunner" in paragraph 3 is closest in meaning to', ['earlier version', 'strong competitor', 'complete opposite', 'official replacement'], 'a forerunner of the modern bank check', 'Dạng VOCABULARY. Giấy hứa trả tiền thời trung cổ là "a forerunner of the modern bank check" = hình thức có trước của tấm séc ngân hàng hiện đại → "earlier version".', 'vocab', 'B2'),
Q(7, 'What can be inferred from paragraph 3 about merchants who paid for every purchase in cash?', ['They faced a greater danger of being robbed.', 'They received lower prices from sellers.', 'They were not allowed to attend the fairs.', 'They usually traveled in larger groups.'], 'carrying large amounts on the road invited robbers', 'Dạng INFERENCE. Mang nhiều tiền xu trên đường "invited robbers" (mời gọi bọn cướp); các phương pháp bù trừ ra đời để giảm lượng bạc phải vận chuyển → ai trả tiền mặt cho mọi giao dịch sẽ gặp nguy cơ bị cướp cao hơn.', 'inference', 'B2'),
Q(8, 'According to paragraph 4, how did improvements in shipping affect the fairs?', ['Italian merchants could reach Flanders by sea without crossing France.', 'Ships carried more goods to the towns of Champagne.', 'The French crown used ships to collect taxes from the fairs.', 'Flemish merchants stopped buying goods from Italy.'], 'without crossing France', 'Dạng FACTUAL. Tàu lớn và an toàn hơn nên thương nhân Ý có thể chở hàng bằng đường biển tới Flanders "without crossing France" – không còn phải đi qua vùng hội chợ.', 'factual', 'B1'),
Q(9, 'Why does the author mention permanent trading houses in paragraph 4?', ['To give another reason merchants no longer needed the fairs', 'To show that the fairs had never been profitable', 'To describe how the French crown raised money', 'To compare the cities of Italy with those of Flanders'], 'unnecessary to wait for a fair at all', 'Dạng RHETORICAL PURPOSE. Các thương điếm thường trực có đại diện ở nước ngoài khiến thương nhân thấy "unnecessary to wait for a fair at all" – thêm một nguyên nhân khiến hội chợ suy tàn.', 'purpose', 'B2'),
Q(10, 'What is the main purpose of paragraph 5?', ['To explain why the fairs are valuable as an example of how trust supports trade', 'To criticize historians who ignore the history of commerce', 'To argue that the goods mattered more than the rules', 'To predict that such fairs will return in the future'], 'a model of how trust is built', 'Dạng RHETORICAL PURPOSE. Đoạn cuối coi hội chợ là "a model of how trust is built" – tòa án đáng tin, đường an toàn, quy tắc kế toán chung góp phần ngang với hàng hóa. Đoạn không dự đoán hội chợ sẽ quay lại.', 'purpose', 'C1'),
])],
});
TF.reading.push({
id: 'tf7-ap2', set: 7, task: 'academic', title: 'Why the Brain Needs Sleep',
text: [
`For most of human history, sleep was regarded as a period of simple rest in which the brain turned off. Beginning in the 1950s, however, researchers who recorded the electrical activity of sleeping volunteers found that the brain remains remarkably busy. During a night's sleep, a person cycles several times through two main states: non-rapid eye movement (NREM) sleep and rapid eye movement (REM) sleep. Each full cycle lasts about ninety minutes, and a healthy adult usually completes four to six of them.`,
`NREM sleep includes a deep stage, often called slow-wave sleep, in which large, slow waves of neural activity sweep across the brain. Deep sleep dominates the first half of the night. REM sleep, in which the eyes move rapidly beneath the lids and vivid dreams are common, becomes longer as the night goes on, so the final cycles before waking contain the most. Because the two states occur at different times, cutting a night short by two hours does not remove sleep evenly; it removes mainly REM.`,
`Why would the brain invest so much time in this activity? One leading explanation is that sleep helps to consolidate memories, that is, to turn fragile new impressions into lasting ones. In a well-known type of experiment, volunteers learn a list of word pairs in the evening. Some are allowed to sleep afterward, while others stay awake for the same number of hours. When everyone is tested later, those who slept typically remember noticeably more. The effect is not simply due to tiredness, because the sleepers and the others are tested under similar conditions.`,
`Researchers believe that during slow-wave sleep the brain replays recent experiences. In studies of rats, for example, the pattern of neurons that fired as an animal ran through a maze was repeated, in a faster form, while the animal slept. This replay is thought to move information from the hippocampus, which stores new memories temporarily, to the cortex, where long-term memories are kept. REM sleep appears to play a different role, helping to link new information with what a person already knows, which may be why some people find creative solutions after a night's sleep.`,
`The practical lesson is that sleeping is part of learning, not time taken away from it. Students who sacrifice sleep to study extra hours may gain little, since the material they have just reviewed is less likely to be fixed in memory. Sleep scientists therefore recommend that learners review important material shortly before bed and then allow a full night's sleep. Still, researchers caution that sleep is only one factor; the quality of the original studying also matters a great deal.`,
].join('\n\n'),
groups: [mcq('Read the passage and answer the questions.', [
Q(11, 'Why does the author mention research from the 1950s in paragraph 1?', ['To show when scientists learned that the sleeping brain is active', 'To explain why adults complete four to six cycles', 'To suggest that sleep was first studied in hospitals', 'To prove that dreaming occurs only during REM sleep'], 'found that the brain remains remarkably busy', 'Dạng RHETORICAL PURPOSE. Nghiên cứu từ thập niên 1950 được nêu để cho biết khi nào khoa học phát hiện não "remains remarkably busy" lúc ngủ, đối lập với quan niệm cũ rằng não nghỉ hoàn toàn.', 'purpose', 'B2'),
Q(12, 'According to paragraph 2, when does REM sleep last the longest?', ['In the final cycles before waking', 'In the first cycle of the night', 'During the deepest stage of NREM sleep', 'Evenly throughout the night'], 'the final cycles before waking contain the most', 'Dạng FACTUAL. REM "becomes longer as the night goes on, so the final cycles before waking contain the most" – dài nhất ở các chu kỳ cuối trước khi thức dậy.', 'factual', 'B1'),
Q(13, 'What can be inferred from paragraph 2 about a person who is woken two hours earlier than usual?', ['The person will lose mostly REM sleep.', 'The person will lose mostly deep sleep.', 'The person will lose both kinds of sleep equally.', 'The person will not be able to dream that night.'], 'it removes mainly REM', 'Dạng INFERENCE. REM tập trung ở cuối đêm nên rút ngắn giấc ngủ "removes mainly REM" → người bị đánh thức sớm hai tiếng mất chủ yếu giấc REM. Giấc ngủ sâu tập trung ở nửa đầu đêm.', 'inference', 'B2'),
Q(14, 'The word "consolidate" in paragraph 3 is closest in meaning to', ['strengthen', 'erase', 'divide', 'compare'], 'to consolidate memories', 'Dạng VOCABULARY. "turn fragile new impressions into lasting ones" giải thích "consolidate" = biến ấn tượng mong manh thành ký ức bền → "strengthen" (củng cố).', 'vocab', 'B2'),
Q(15, 'Why does the author describe the experiment with word pairs?', ['To provide evidence that sleep improves memory', 'To prove that tiredness damages memory', 'To show that people learn best in the evening', 'To explain how long a sleep cycle lasts'], 'those who slept typically remember noticeably more', 'Dạng RHETORICAL PURPOSE. Thí nghiệm cho thấy nhóm ngủ "typically remember noticeably more" – bằng chứng cho giả thuyết rằng giấc ngủ giúp củng cố trí nhớ.', 'purpose', 'B2'),
Q(16, 'According to paragraph 3, why is the better memory of the sleepers not simply due to tiredness?', ['Both groups are tested under similar conditions.', 'The sleepers had slept fewer hours than the others.', 'The other group was given more time to learn.', 'Tiredness is known to improve memory.'], 'tested under similar conditions', 'Dạng FACTUAL. Tác giả loại trừ yếu tố mệt mỏi vì người ngủ và người không ngủ "are tested under similar conditions" – được kiểm tra trong điều kiện tương tự.', 'factual', 'B2'),
Q(17, 'Why does the author mention studies of rats in paragraph 4?', ['To give evidence that the brain replays experiences during sleep', 'To show that rats sleep less than people do', 'To explain how the hippocampus is damaged', 'To prove that animals learn faster than humans'], 'was repeated, in a faster form, while the animal slept', 'Dạng RHETORICAL PURPOSE. Mẫu hoạt động thần kinh khi chuột chạy mê cung "was repeated, in a faster form, while the animal slept" – bằng chứng cho việc não phát lại trải nghiệm trong lúc ngủ.', 'purpose', 'B2'),
Q(18, 'According to paragraph 4, all of the following are associated with slow-wave sleep EXCEPT', ['linking new facts with older knowledge', 'replaying recent experiences', 'moving information out of the hippocampus', 'repeating neural patterns at a faster speed'], 'helping to link new information with what a person already knows', 'Dạng NEGATIVE FACTUAL. Giấc ngủ sóng chậm gắn với việc phát lại trải nghiệm, chuyển thông tin từ hồi hải mã sang vỏ não và lặp mẫu thần kinh nhanh hơn. Việc liên kết thông tin mới với kiến thức cũ là vai trò của REM → đáp án.', 'negative', 'C1'),
Q(19, 'The word "sacrifice" in paragraph 5 is closest in meaning to', ['give up', 'hold back', 'make up', 'put off'], 'Students who sacrifice sleep', 'Dạng VOCABULARY. "Students who sacrifice sleep to study extra hours" = sinh viên bỏ bớt giấc ngủ để học thêm → "give up" (từ bỏ).', 'vocab', 'B2'),
Q(20, 'What does paragraph 5 suggest about a student who studies all night before an exam?', ['The student may remember less of the material than expected.', 'The student will certainly fail the exam.', 'The student will remember more because of the extra hours.', 'The student will no longer need sleep the next day.'], 'less likely to be fixed in memory', 'Dạng INFERENCE. Học thâu đêm thì nội dung vừa ôn "is less likely to be fixed in memory" → có thể nhớ ít hơn dự tính. Đoạn văn không khẳng định chắc chắn sẽ trượt.', 'inference', 'B2'),
])],
});

/* ===================================================================
* LISTENING · Listen and Choose a Response (câu 1–8)
* =================================================================== */
const RESP = [
{ lv: 'B1', s: 'A', t: 'I\'m having trouble finding a quiet spot to study in the dormitory.',
options: ['The ground-floor lounge is usually empty after dinner.', 'I think the dormitory was built in the sixties.', 'Yes, I studied biology there last year.', 'She quietly closed the door behind her.'],
explain: 'Người nói than khó tìm chỗ yên tĩnh để học → phản hồi hữu ích là gợi ý một nơi: phòng sinh hoạt tầng trệt thường vắng sau bữa tối. Các phương án khác chỉ lặp từ "dormitory", "study", "quiet".' },
{ lv: 'A2', s: 'B', t: 'Do you think the museum will still be open when we get there?',
options: ['The website says it stays open until eight on Fridays.', 'I opened a new account at that bank.', 'Museums have existed for hundreds of years.', 'We got there about an hour ago.'],
explain: 'Câu hỏi về giờ mở cửa → trả lời bằng thông tin giờ: trang web ghi mở đến tám giờ tối thứ Sáu. "opened" và "got there" chỉ là bẫy lặp từ.' },
{ lv: 'B1', s: 'A', t: 'I can\'t decide whether to take the night class or the morning one.',
options: ['Which one fits better with your work schedule?', 'I took the night train to the capital.', 'The morning is the best time for coffee.', 'Yes, you decided that last week.'],
explain: 'Người nói đang phân vân giữa hai lớp → phản hồi tự nhiên là hỏi tiêu chí để chọn (lịch làm việc). Các phương án còn lại lặp "night", "morning", "decide" mà không giúp gì.' },
{ lv: 'A2', s: 'B', t: 'Excuse me, is anyone sitting in this seat?',
options: ['No, it\'s free. Please go ahead.', 'Yes, the seats are made of leather.', 'I usually sit by the window.', 'The show starts in ten minutes.'],
explain: 'Câu hỏi xin phép ngồi ghế → trả lời "No, it\'s free" nghĩa là không có ai, mời ngồi. "Yes, the seats are made of leather" trả lời lạc đề dù có chữ "Yes".' },
{ lv: 'B1', s: 'A', t: 'The printer on the second floor has run out of paper again.',
options: ['I\'ll ask the front desk to send someone with a new pack.', 'I printed my essay on very thin paper.', 'The second floor has a nice view.', 'Yes, the paper was published in a journal.'],
explain: 'Câu báo sự cố (máy in hết giấy) → phản hồi hợp lý là đề nghị xử lý: nhờ quầy lễ tân gửi người mang giấy mới. "paper" ở phương án sai mang nghĩa khác hoặc lạc đề.' },
{ lv: 'A2', s: 'B', t: 'Thanks so much for lending me your charger yesterday.',
options: ['Don\'t mention it. I wasn\'t using it anyway.', 'I charge my phone every night.', 'The store charges ten dollars for one.', 'Yes, I lent my money to the bank.'],
explain: 'Lời cảm ơn → đáp lại bằng câu xã giao như "Don\'t mention it" (không có gì). "charge", "lent" chỉ là bẫy lặp từ, không phản hồi lời cảm ơn.' },
{ lv: 'B1', s: 'A', t: 'Which day does the registration deadline fall on for the spring semester?',
options: ['I believe it\'s at midnight on the fifteenth.', 'Registration took me about twenty minutes.', 'The spring semester is my favorite time of year.', 'You always leave everything until the last moment.'],
explain: 'Câu hỏi "Which day" (ngày nào) → cần một mốc ngày: nửa đêm ngày 15. Các phương án khác lặp "registration", "spring semester" nhưng không nêu ngày.' },
{ lv: 'B1', s: 'B', t: 'I\'m thinking of joining the hiking club. Have you ever been on one of their trips?',
options: ['Twice – the one to the lake was my favorite.', 'I hike in boots that are too small.', 'The club meets every Tuesday evening, I think.', 'Yes, I would like to join the choir.'],
explain: 'Câu hỏi "Have you ever been…?" → trả lời trực tiếp: hai lần, chuyến đi hồ là yêu thích nhất. Lịch họp của câu lạc bộ hay chuyện hợp xướng không trả lời câu hỏi.' },
];
const respScript = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
RESP.forEach((r, i) => { respScript.push({ say: 'Number ' + (i + 1) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
TF.listening.push({
id: 'tf7-lr', set: 7, task: 'response', title: 'Choose a Response · Set 7',
speakers: { A: { name: 'Speaker 1', accent: 'en-US', gender: 'f' }, B: { name: 'Speaker 2', accent: 'en-US', gender: 'm' } },
script: respScript,
groups: [mcq('Listen to each sentence and choose the best response.', RESP.map((r, i) => Q(i + 1, 'Choose the best response to sentence ' + (i + 1) + '.', r.options, r.t, r.explain, undefined, r.lv)))],
});

/* ===================================================================
* LISTENING · Listen to a Conversation (câu 1–8)
* =================================================================== */
TF.listening.push({
id: 'tf7-lc1', set: 7, task: 'conversation', title: 'At the Library Desk',
speakers: { S: { name: 'Student (Hana)', accent: 'en-US', gender: 'f' }, L: { name: 'Librarian', accent: 'en-US', gender: 'm' } },
script: [
{ say: 'Listen to a conversation between a student and a librarian.' }, { pause: 1 },
{ s: 'S', t: 'Hi, I saw a flyer about the community reading program, and I\'d like to help out. Is it too late to sign up as a volunteer?' },
{ s: 'L', t: 'Not at all, we\'re always glad to have more people. Have you worked with children before?' },
{ s: 'S', t: 'Um, not really. I tutored classmates in high school, though. Does that count?' },
{ s: 'L', t: 'It certainly helps. The program runs on Saturday mornings from ten to noon. Volunteers read a story aloud, and then they help the kids with a short activity.' },
{ s: 'S', t: 'Oh, Saturdays are a bit tricky. I have a part-time job every other weekend.' },
{ s: 'L', t: 'That\'s fine. Most volunteers pick two Saturdays a month. You\'d just write your dates on the sign-up sheet.' },
{ s: 'S', t: 'Okay. Is there any training?' },
{ s: 'L', t: 'Yes, a one-hour session this Thursday evening. We cover how to choose books for different ages and what to do if a child gets upset. And since you\'d be working with kids, we also run a background check, which takes about a week.' },
{ s: 'S', t: 'Right, that makes sense. Can I fill out the form today?' },
{ s: 'L', t: 'Sure. Let\'s start with the form now, and I\'ll put you down for Thursday.' },
],
groups: [mcq('Answer the questions about the conversation.', [
Q(1, 'Why does the student talk to the librarian?', ['She wants to volunteer in a children\'s reading program.', 'She needs help finding a book for a class.', 'She hopes to get a part-time job at the library.', 'She wants to organize a reading club for her classmates.'], 'I\'d like to help out', 'Sinh viên nói đã thấy tờ rơi về chương trình đọc sách cộng đồng và "I\'d like to help out" – muốn làm tình nguyện viên. Công việc bán thời gian chỉ là lý do khiến thứ Bảy khó sắp xếp.', undefined, 'A2'),
Q(2, 'What concern does the student raise about the schedule?', ['She works on some weekends.', 'She has class on Saturday mornings.', 'She cannot attend the training session.', 'She does not want to read aloud.'], 'part-time job every other weekend', 'Cô nói "I have a part-time job every other weekend" – đi làm cách tuần vào cuối tuần. Thủ thư giải quyết bằng cách chọn hai ngày thứ Bảy mỗi tháng.', undefined, 'B1'),
Q(3, 'What will be covered in the training session?', ['How to choose books and calm an upset child', 'How to fill out a background check form', 'How to teach reading to adults', 'How to organize the library\'s collection'], 'what to do if a child gets upset', 'Buổi tập huấn dạy "how to choose books for different ages and what to do if a child gets upset" – chọn sách theo độ tuổi và xử lý khi trẻ buồn. Kiểm tra lý lịch là việc riêng, mất khoảng một tuần.', undefined, 'B1'),
Q(4, 'What will the student probably do next?', ['Complete the sign-up form', 'Begin the background check on Thursday', 'Choose her dates for next month', 'Read a story to the children'], 'Let\'s start with the form now', 'Thủ thư nói "Let\'s start with the form now, and I\'ll put you down for Thursday" → bước tiếp theo là điền biểu mẫu đăng ký ngay lúc đó.', undefined, 'B2'),
])],
});
TF.listening.push({
id: 'tf7-lc2', set: 7, task: 'conversation', title: 'The Missed Safety Orientation',
speakers: { S: { name: 'Student (Daniel)', accent: 'en-GB', gender: 'm' }, M: { name: 'Lab manager', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to a conversation between a student and a laboratory manager.' }, { pause: 1 },
{ s: 'S', t: 'Hi, I\'m Daniel. I\'m in the organic chemistry lab this term, and I think I missed the safety orientation. I was away at a conference.' },
{ s: 'M', t: 'Ah, yes, I see your name on the absent list. Unfortunately, you can\'t start any experiments until you\'ve done it.' },
{ s: 'S', t: 'Oh no. When\'s the next session?' },
{ s: 'M', t: 'Not until the end of the month. But there\'s an alternative: you can watch the recorded version and then take a short practical check with me.' },
{ s: 'S', t: 'What does the practical check involve?' },
{ s: 'M', t: 'I\'ll ask you to find the eyewash station, the fire blanket, and the nearest exit, and to show me how to put on goggles and a lab coat properly. It takes about ten minutes.' },
{ s: 'S', t: 'That sounds doable. Do I need to bring anything?' },
{ s: 'M', t: 'Just your own lab coat. We have goggles here. And, um, do watch the video first. Last term, a student skipped it and couldn\'t find the eyewash. He failed the check.' },
{ s: 'S', t: 'Got it. I\'ll watch it tonight and come by tomorrow afternoon.' },
{ s: 'M', t: 'Perfect. I\'m in room one-eighteen after two o\'clock.' },
],
groups: [mcq('Answer the questions about the conversation.', [
Q(5, 'Why does the student need to talk to the lab manager?', ['He missed a required safety session.', 'He lost his lab coat during a conference.', 'He wants to change to a different lab.', 'He broke some equipment last week.'], 'missed the safety orientation', 'Daniel nói "I think I missed the safety orientation" vì đi hội nghị; quản lý cho biết anh không thể làm thí nghiệm cho đến khi hoàn thành buổi định hướng an toàn.', undefined, 'A2'),
Q(6, 'What alternative does the manager offer?', ['Watching a recording and passing a short practical check', 'Attending a session in another lab', 'Taking a written exam in her office', 'Working with a partner who has completed the orientation'], 'watch the recorded version and then take a short practical check', 'Buổi tiếp theo mãi cuối tháng mới có, nên bà đề nghị "watch the recorded version and then take a short practical check" – xem video ghi hình rồi làm bài kiểm tra thực hành ngắn.', undefined, 'B1'),
Q(7, 'What does the student have to bring to the practical check?', ['His own lab coat', 'A pair of splash goggles', 'A signed form from his professor', 'A copy of the video'], 'Just your own lab coat', 'Bà nói "Just your own lab coat. We have goggles here." – chỉ cần tự mang áo thí nghiệm; kính bảo hộ đã có sẵn ở phòng.', undefined, 'B1'),
Q(8, 'Why does the manager mention a student from last term?', ['To stress that the video should be watched first', 'To explain why the check was introduced', 'To warn that the check is very difficult', 'To show that most students fail the first time'], 'a student skipped it and couldn\'t find the eyewash', 'Câu chuyện về sinh viên bỏ qua video rồi không tìm ra vòi rửa mắt, kèm "do watch the video first", cho thấy bà muốn nhấn mạnh phải xem video trước khi đi kiểm tra.', '!', 'B2'),
])],
});

/* ===================================================================
* LISTENING · Listen to an Announcement (câu 1–6)
* =================================================================== */
TF.listening.push({
id: 'tf7-la1', set: 7, task: 'announcement', title: 'Residence Hall Announcement',
speakers: { A: { name: 'Announcer', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to an announcement in a university residence hall.' }, { pause: 1 },
{ s: 'A', t: 'Attention, residents of Birchwood Hall. This is a reminder about two changes this week.' },
{ s: 'A', t: 'First, the laundry room on the ground floor will be closed on Tuesday while new machines are installed. Please use the laundry room in the basement of Cedar Hall, which will stay open until midnight.' },
{ s: 'A', t: 'Second, package pickup is moving. Starting Wednesday, parcels will be held at the front desk instead of the mailroom, and you\'ll need to show your student ID to collect them. Parcels left for more than seven days are returned to the sender, so please collect yours promptly. Thank you.' },
],
groups: [mcq('Answer the questions about the announcement.', [
Q(1, 'What is the main purpose of the announcement?', ['To inform residents about changes to two services', 'To announce that the hall will get new rooms', 'To ask residents to help install laundry machines', 'To explain a new rule about guests'], 'two changes this week', 'Câu mở đầu: "This is a reminder about two changes this week" – nhắc cư dân về hai thay đổi: phòng giặt và nơi nhận bưu kiện.', undefined, 'B1'),
Q(2, 'Where can residents do their laundry on Tuesday?', ['In the basement of Cedar Hall', 'In the ground-floor room of Birchwood Hall', 'At the front desk of the hall', 'In the mailroom'], 'laundry room in the basement of Cedar Hall', 'Phòng giặt tầng trệt đóng cửa thứ Ba, nên cư dân được hướng dẫn dùng "the laundry room in the basement of Cedar Hall", mở đến nửa đêm.', undefined, 'A2'),
Q(3, 'What happens to a parcel that is not collected within a week?', ['It is sent back to the sender.', 'It is moved to the mailroom.', 'It is thrown away by staff.', 'It is delivered to the resident\'s room.'], 'returned to the sender', 'Bưu kiện để quá bảy ngày sẽ "returned to the sender" – bị gửi trả người gửi.', undefined, 'B1'),
])],
});
TF.listening.push({
id: 'tf7-la2', set: 7, task: 'announcement', title: 'Urban Bird Survey Instructions',
speakers: { A: { name: 'Instructor', accent: 'en-GB', gender: 'm' } },
script: [
{ say: 'Listen to an instructor talking to an ecology class.' }, { pause: 1 },
{ s: 'A', t: 'Okay, before you leave, a few details about next week\'s bird survey. We\'ll be counting birds in three city parks, and you\'ll work in pairs.' },
{ s: 'A', t: 'Each pair is assigned a fixed route, and you\'ll walk it slowly for forty-five minutes, starting at a quarter to seven. We begin early because birds are most active just after sunrise, and the traffic noise is lowest then.' },
{ s: 'A', t: 'Bring binoculars if you own a pair; there are some in the lab for those who don\'t. Please record every bird you see or hear, but don\'t count the same bird twice. If you\'re not sure of a species, write a short description instead of guessing.' },
{ s: 'A', t: 'I\'ll collect the sheets at the end, and we\'ll compare the results with last year\'s numbers in class on Thursday.' },
],
groups: [mcq('Answer the questions about the announcement.', [
Q(4, 'Why will the survey begin early in the morning?', ['Birds are most active and there is less noise.', 'The parks close to visitors at eight.', 'The instructor has a class at nine.', 'The binoculars must be returned early.'], 'birds are most active just after sunrise', 'Giảng viên nói bắt đầu sớm vì "birds are most active just after sunrise, and the traffic noise is lowest then" – chim hoạt động nhiều nhất và tiếng ồn giao thông thấp nhất.', undefined, 'B1'),
Q(5, 'What should students do if they cannot identify a species?', ['Write a short description of the bird', 'Skip that bird in the count', 'Take a photograph of it', 'Ask their partner to guess'], 'write a short description instead of guessing', 'Giảng viên dặn "write a short description instead of guessing" – nếu không chắc loài thì ghi mô tả ngắn thay vì đoán.', undefined, 'B1'),
Q(6, 'What will the class do on Thursday?', ['Compare the new counts with last year\'s results', 'Return to the parks to count again', 'Hand in their binoculars', 'Plan a survey for another city'], 'compare the results with last year', 'Giảng viên thu phiếu và "we\'ll compare the results with last year\'s numbers in class on Thursday" – thứ Năm sẽ so sánh kết quả với số liệu năm ngoái.', undefined, 'A2'),
])],
});

/* ===================================================================
* LISTENING · Listen to an Academic Talk (câu 1–10)
* =================================================================== */
TF.listening.push({
id: 'tf7-lt1', set: 7, task: 'talk', title: 'Volcanology: Can We Predict Eruptions?',
speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to part of a talk in a geology class.' }, { pause: 1 },
{ s: 'P', t: 'Today I\'d like to look at a question people often ask volcanologists: can we predict eruptions? The honest answer is that we can often say an eruption is likely, but we usually can\'t say exactly when.' },
{ s: 'P', t: 'Let\'s start with what scientists monitor. First, earthquakes. As magma pushes upward through the crust, it fractures rock, producing swarms of small earthquakes. A sudden increase in these tremors is one of the most reliable warning signs.' },
{ s: 'P', t: 'Second, ground deformation. A volcano that\'s filling with magma can swell like a balloon, and instruments such as tiltmeters and satellite radar can detect changes of just a few centimeters.' },
{ s: 'P', t: 'Third, gas. Rising magma releases gases like sulfur dioxide, and when the amount of gas changes sharply, it can mean that magma is close to the surface.' },
{ s: 'P', t: 'Now, here\'s the complication. A volcano can show every one of these signs and then settle down without erupting. Sometimes the magma simply stops rising and cools underground. That\'s why officials rarely rely on a single signal. They combine several, and they issue alert levels rather than exact dates.' },
{ s: 'P', t: 'A famous success story is the 1991 eruption of Mount Pinatubo in the Philippines. Scientists noticed rising gas and earthquakes weeks in advance, and tens of thousands of people were evacuated before the main eruption. Many lives were saved. The key lesson is that clear communication with communities matters as much as the science.' },
],
groups: [mcq('Answer the questions about the talk.', [
Q(1, 'What is the main topic of the talk?', ['How scientists judge whether a volcano is likely to erupt', 'Why some volcanoes produce more lava than others', 'How people can rebuild towns near a volcano', 'The history of volcano research in the Philippines'], 'can we predict eruptions', 'Giáo sư mở đầu bằng câu hỏi "can we predict eruptions?" và đi qua các dấu hiệu được theo dõi (động đất, biến dạng mặt đất, khí) → chủ đề là cách khoa học đánh giá nguy cơ phun trào.', undefined, 'B1'),
Q(2, 'According to the professor, what can tiltmeters and satellite radar detect?', ['Small swelling of the volcano\'s surface', 'Changes in the amount of gas released', 'Swarms of tiny earthquakes', 'The temperature of the magma'], 'instruments such as tiltmeters and satellite radar can detect changes of just a few centimeters', 'Núi lửa chứa đầy magma có thể "swell like a balloon", và các thiết bị như tiltmeter, radar vệ tinh phát hiện những thay đổi chỉ vài centimet – tức là sự phồng lên nhỏ của bề mặt.', undefined, 'B1'),
Q(3, 'Why might a volcano show warning signs but not erupt?', ['The magma may stop rising and cool underground.', 'The earthquakes may damage the instruments.', 'Gas may escape through the crater too quickly.', 'Officials may lower the alert level too early.'], 'the magma simply stops rising and cools underground', 'Giáo sư giải thích núi lửa có thể "settle down without erupting" vì magma "simply stops rising and cools underground" – ngừng dâng và nguội đi dưới lòng đất.', undefined, 'B1'),
Q(4, 'Why does the professor mention Mount Pinatubo?', ['To give an example of a warning that saved many lives', 'To show that scientists can name the exact date of an eruption', 'To explain how gas is measured from space', 'To compare two kinds of volcanic eruption'], 'tens of thousands of people were evacuated', 'Pinatubo được nêu như "success story": phát hiện khí và động đất từ trước hàng tuần, hàng chục nghìn người được sơ tán và "Many lives were saved" – ví dụ về cảnh báo cứu được nhiều mạng sống.', undefined, 'B2'),
Q(5, 'What does the professor imply when she says communication "matters as much as the science"?', ['Warnings save lives only if people understand and act on them.', 'Scientists should spend less time on measurements.', 'Communities usually ignore scientific advice.', 'Alert levels are more reliable than instruments.'], 'matters as much as the science', 'Khi nói giao tiếp với cộng đồng "matters as much as the science", giáo sư hàm ý dữ liệu khoa học chỉ cứu được người khi người dân hiểu cảnh báo và hành động. Bà không bảo giảm đo đạc.', undefined, 'C1'),
])],
});
TF.listening.push({
id: 'tf7-lt2', set: 7, task: 'talk', title: 'Art History: Blue Pigments and Trade',
speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'f' } },
script: [
{ say: 'Listen to part of a talk in an art history class.' }, { pause: 1 },
{ s: 'P', t: 'Today I want to connect two things that students sometimes keep separate: the history of art and the history of trade. Take the blue pigment called ultramarine. In medieval Europe, it was made by grinding a stone called lapis lazuli, and the main source of that stone was a set of mines in what is now Afghanistan. So the stone had to travel thousands of kilometers, passing through many merchants, before it reached an artist\'s workshop in Italy or France.' },
{ s: 'P', t: 'That journey explains the price. Good ultramarine could cost more than gold by weight. Because of this, contracts between painters and their patrons sometimes specified exactly how much of the blue was to be used, and where. It was typically reserved for the most important figure in a painting, such as the robe of the Virgin Mary. In other words, the blue wasn\'t just decoration; it signaled value and respect.' },
{ s: 'P', t: 'Now compare that with azurite, a blue copper mineral found much closer to Europe. Azurite was cheaper, but it has a greener tone and tends to darken with time, so painters used it for skies and backgrounds.' },
{ s: 'P', t: 'This is why art historians pay attention to pigments. When we know where a pigment came from and what it cost, we can read a painting almost like a receipt. We can see which colors the patron paid extra for, and so what they wanted the viewer to notice.' },
],
groups: [mcq('Answer the questions about the talk.', [
Q(6, 'What is the main point of the talk?', ['Knowing the trade history of a pigment helps explain how it was used in paintings.', 'Medieval painters preferred blue to every other color.', 'Artists in Italy traveled to Afghanistan to find materials.', 'Modern pigments are better than medieval ones.'], 'the history of art and the history of trade', 'Giáo sư muốn nối "the history of art and the history of trade": lịch sử buôn bán của một loại bột màu giải thích vì sao họa sĩ dùng nó như vậy. Bà không nói họa sĩ chuộng màu xanh hơn mọi màu.', undefined, 'B2'),
Q(7, 'According to the professor, why was ultramarine so expensive?', ['Its source stone came from far away through many merchants.', 'It was made from rare copper minerals.', 'It was banned in most workshops.', 'It faded quickly and had to be replaced.'], 'passing through many merchants', 'Đá lapis lazuli chỉ có ở mỏ xa xôi và phải đi hàng nghìn km, "passing through many merchants" – qua tay nhiều thương nhân → giá cao, có khi đắt hơn vàng theo cân nặng.', undefined, 'B1'),
Q(8, 'Why did some contracts say how much blue pigment to use?', ['The pigment was costly and meant for the most important figure.', 'Patrons wanted every part of the painting to be blue.', 'Painters often ran out of pigment during the work.', 'The law required a fixed amount of blue in each painting.'], 'specified exactly how much of the blue was to be used', 'Vì ultramarine rất đắt, hợp đồng quy định rõ lượng dùng và chỗ dùng; nó thường dành cho nhân vật quan trọng nhất, như áo choàng của Đức Mẹ.', undefined, 'B2'),
Q(9, 'Why did painters use azurite for skies and backgrounds?', ['It was cheaper, greener, and tended to darken over time.', 'It was more valuable than ultramarine.', 'It came from the same mines as lapis lazuli.', 'Patrons asked for it to be used on faces.'], 'Azurite was cheaper', 'Azurite "was cheaper, but it has a greener tone and tends to darken with time" – rẻ hơn nhưng ngả xanh lục và sẫm dần, nên được dùng cho bầu trời và phông nền.', undefined, 'B2'),
Q(10, 'What does the professor imply by saying a painting can be read "almost like a receipt"?', ['The pigments show what the patron paid extra for and valued.', 'Painters kept written records of every color they used.', 'Paintings were often sold for the price of the pigments.', 'Receipts were attached to medieval paintings.'], 'read a painting almost like a receipt', 'Bà nói biết nguồn gốc và giá bột màu thì có thể đọc tranh "almost like a receipt" – nhìn ra màu nào người đặt tranh trả thêm tiền, tức là điều họ coi trọng. Đây là hình ảnh so sánh, không phải biên lai thật.', undefined, 'C1'),
])],
});

/* ===================================================================
* LISTENING · bổ sung để đủ 47 câu như bộ 1 (conversation 33–37, announcement 38–41, talk 42–47)
* =================================================================== */
TF.listening.push({
id: 'tf7-lc3', set: 7, task: 'conversation', title: 'Sharing a Dorm Room',
speakers: { S: { name: 'Student (Maya)', accent: 'en-US', gender: 'f' }, P: { name: 'Student (Ben)', accent: 'en-GB', gender: 'm' } },
script: [
{ say: 'Listen to a conversation between two roommates.' }, { pause: 1 },
{ s: 'S', t: 'Hey Ben, do you have a minute? I wanted to talk about our schedules.' },
{ s: 'P', t: 'Sure. Is something bothering you?' },
{ s: 'S', t: 'Not exactly bothering. It\'s just that I\'ve started a six a.m. lab, so I have to be in bed by ten. And you usually study at your desk until after midnight, with the big lamp on.' },
{ s: 'P', t: 'Oh, I didn\'t realize that kept you awake. I\'m sorry.' },
{ s: 'S', t: 'It\'s no big deal, but I\'m really struggling in the mornings. I wondered if there\'s some way to work around it.' },
{ s: 'P', t: 'Well, I could use a small clip-on light instead of the lamp. Or I could study in the lounge downstairs. It\'s open until one.' },
{ s: 'S', t: 'The lounge might be better, if you don\'t mind. A clip-on light is still pretty bright, and my bed is right next to your desk.' },
{ s: 'P', t: 'No problem. The lounge has better chairs anyway. Although, on Sundays I\'d rather stay here, since it gets crowded down there with people watching games.' },
{ s: 'S', t: 'That works. Sundays I can wear an eye mask.' },
{ s: 'P', t: 'Deal. Thanks for telling me, instead of just getting annoyed.' },
],
groups: [mcq('Answer the questions about the conversation.', [
Q(33, 'Why does Maya start the conversation?', ['Light from Ben\'s desk is disturbing her sleep.', 'She wants to borrow his desk lamp.', 'She is planning to move to another room.', 'She is annoyed that he leaves the lounge late.'], 'you usually study at your desk until after midnight, with the big lamp on', 'Maya nói Ben thường học đến quá nửa đêm "with the big lamp on" – bật đèn lớn, trong khi cô phải đi ngủ sớm → ánh sáng ảnh hưởng giấc ngủ của cô.', undefined, 'B1'),
Q(34, 'Why does Maya have to be in bed by ten?', ['She has a lab at six in the morning.', 'She works at night in the library.', 'She feels ill in the evenings.', 'Her professor requires it.'], 'I\'ve started a six a.m. lab', 'Cô giải thích "I\'ve started a six a.m. lab, so I have to be in bed by ten" – bắt đầu buổi thực hành lúc sáu giờ sáng nên phải đi ngủ lúc mười giờ.', undefined, 'A2'),
Q(35, 'What does Ben first offer to do?', ['Use a smaller light or study downstairs', 'Move his desk to another wall', 'Stop studying after ten at night', 'Buy curtains for Maya\'s bed'], 'small clip-on light', 'Ben đề nghị "a small clip-on light instead of the lamp" hoặc học ở phòng sinh hoạt tầng dưới – dùng đèn nhỏ hơn hoặc xuống tầng dưới học.', undefined, 'B1'),
Q(36, 'Why does Maya prefer the lounge to the clip-on light?', ['The small light would still be too bright near her bed.', 'The lounge has better chairs for Ben.', 'The clip-on light is too expensive.', 'The lounge is open all night.'], 'my bed is right next to your desk', 'Cô giải thích đèn kẹp "is still pretty bright, and my bed is right next to your desk" – giường cô sát bàn Ben nên đèn nhỏ vẫn chói. Ben mới là người nhắc ghế ở lounge tốt hơn.', undefined, 'B2'),
Q(37, 'What will probably happen on Sundays?', ['Ben will study in the room and Maya will wear an eye mask.', 'Both of them will study in the lounge.', 'Maya will study downstairs while Ben sleeps.', 'Ben will turn off all the lights at ten.'], 'Sundays I can wear an eye mask', 'Ben muốn ở lại phòng vào Chủ nhật vì lounge đông, và Maya đồng ý: "Sundays I can wear an eye mask" – cô đeo bịt mắt, còn Ben học tại phòng.', undefined, 'B2'),
])],
});
TF.listening.push({
id: 'tf7-la3', set: 7, task: 'announcement', title: 'Library Book Sale and Reading Challenge',
speakers: { A: { name: 'Announcer', accent: 'en-US', gender: 'm' } },
script: [
{ say: 'Listen to an announcement at a public library.' }, { pause: 1 },
{ s: 'A', t: 'Good evening, library visitors. This is an announcement about two events at the Harbor Street Library.' },
{ s: 'A', t: 'First, our annual book sale takes place this Saturday in the main reading room, from nine until four. Hardcover books cost two dollars, paperbacks cost one dollar, and all children\'s books are fifty cents. Anything left at four o\'clock will be donated to local schools.' },
{ s: 'A', t: 'Second, registration is now open for the Summer Reading Challenge. Each child receives a reading log at the front desk, and every time a child finishes ten books, he or she earns a free ticket to the science museum. The challenge starts on June first, but you can sign up at any time before then. All money raised at the book sale supports the challenge. Thank you.' },
],
groups: [mcq('Answer the questions about the announcement.', [
Q(38, 'What is the main purpose of the announcement?', ['To tell visitors about two upcoming library events', 'To announce that the library will close for summer', 'To ask visitors to donate books to schools', 'To explain how to get a library card'], 'two events at the Harbor Street Library', 'Người thông báo mở đầu: "an announcement about two events at the Harbor Street Library" – hội sách và Thử thách Đọc sách Mùa hè.', undefined, 'B1'),
Q(39, 'How much does a paperback cost at the book sale?', ['One dollar', 'Fifty cents', 'Two dollars', 'Ten dollars'], 'paperbacks cost one dollar', 'Giá được nêu rõ: "paperbacks cost one dollar". Sách bìa cứng hai đô, sách thiếu nhi năm mươi xu.', undefined, 'A2'),
Q(40, 'What will be done with the books left at four o\'clock?', ['They will be given to local schools.', 'They will be sold at a lower price online.', 'They will be returned to the shelves.', 'They will be stored for next year\'s sale.'], 'donated to local schools', 'Sách còn lại lúc bốn giờ chiều sẽ "donated to local schools" – được tặng cho các trường địa phương.', undefined, 'A2'),
Q(41, 'How can a child earn a free museum ticket?', ['By finishing ten books', 'By buying a book at the sale', 'By signing up before June first', 'By visiting the front desk each week'], 'every time a child finishes ten books', 'Mỗi lần trẻ đọc xong mười cuốn, "he or she earns a free ticket to the science museum" – nhận vé miễn phí vào bảo tàng khoa học.', undefined, 'A2'),
])],
});
TF.listening.push({
id: 'tf7-lt3', set: 7, task: 'talk', title: 'Economics: Group Lending',
speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'm' } },
script: [
{ say: 'Listen to part of a talk in an economics class.' }, { pause: 1 },
{ s: 'P', t: 'Last week we discussed why poor households often cannot get loans from regular banks. Today, let\'s look at one solution: microfinance, and in particular, group lending.' },
{ s: 'P', t: 'The traditional problem is collateral. A bank wants something valuable it can claim if the loan isn\'t repaid, such as a house or land. A poor entrepreneur, say a woman who wants to buy a sewing machine, usually has no such property to offer.' },
{ s: 'P', t: 'Group lending changes the arrangement. Instead of lending to one person, the lender lends to a small group of, say, five neighbors. Each member receives her own loan, but the whole group is responsible. If one member can\'t pay, the others are expected to help, or the group as a whole can\'t borrow again.' },
{ s: 'P', t: 'Why does this work? Notice that neighbors know things the lender can\'t easily find out. They know who is hardworking and who spends carelessly. So people tend to form groups with reliable partners, and members have a strong reason to keep an eye on each other. Social pressure replaces property.' },
{ s: 'P', t: 'Now, the results are mixed. Repayment rates in many programs have been very high, often above ninety percent. But studies that compare borrowers with similar people who didn\'t borrow find that the loans increase business activity only modestly. They rarely lift families out of poverty on their own. One reason is that many borrowers use loans for everyday needs, like food or school fees, rather than for a business.' },
{ s: 'P', t: 'So microfinance is best seen as a useful tool, not a cure-all.' },
],
groups: [mcq('Answer the questions about the talk.', [
Q(42, 'What is the main topic of the talk?', ['How group lending lets poor borrowers get loans without property', 'Why banks refuse to lend money to anyone', 'How to start a business from home', 'The history of banking in developing countries'], 'microfinance, and in particular, group lending', 'Giáo sư giới thiệu "microfinance, and in particular, group lending" – vay theo nhóm giúp người nghèo vay được mà không cần tài sản thế chấp.', undefined, 'B1'),
Q(43, 'What problem do poor entrepreneurs face with regular banks?', ['They have no property to offer as collateral.', 'They do not know how to write a business plan.', 'They live too far from the nearest bank.', 'They refuse to pay any interest.'], 'usually has no such property to offer', 'Ngân hàng cần tài sản thế chấp, còn người kinh doanh nghèo "usually has no such property to offer" – thường không có tài sản để đưa ra.', undefined, 'B1'),
Q(44, 'What happens if one member of a lending group cannot pay?', ['The others are expected to help, or the group cannot borrow again.', 'The bank takes the house of that member.', 'The member is replaced by a new neighbor.', 'The loan is forgiven for the whole group.'], 'the others are expected to help', 'Mỗi người có khoản vay riêng nhưng cả nhóm chịu trách nhiệm: "the others are expected to help, or the group as a whole can\'t borrow again".', undefined, 'B1'),
Q(45, 'What does the professor say about repayment rates in many programs?', ['They have often been above ninety percent.', 'They have always been below half.', 'They are lower than for regular banks.', 'They have not been measured.'], 'often above ninety percent', 'Giáo sư nói tỷ lệ hoàn trả ở nhiều chương trình "very high, often above ninety percent" – thường trên chín mươi phần trăm.', undefined, 'B1'),
Q(46, 'What does the professor imply by saying "Social pressure replaces property"?', ['The group\'s expectations take the place of collateral.', 'Borrowers must give up their homes to the group.', 'Neighbors are forced to buy each other\'s goods.', 'Lenders no longer need to check who borrows.'], 'Social pressure replaces property', 'Hàng xóm biết rõ nhau và giám sát lẫn nhau, nên áp lực xã hội của nhóm đóng vai trò thay cho tài sản thế chấp – đó là ý của "Social pressure replaces property".', undefined, 'C1'),
Q(47, 'According to the professor, why do loans rarely lift families out of poverty?', ['Many borrowers spend the money on everyday needs.', 'Most borrowers fail to repay the loans.', 'The loans are too large for small businesses.', 'Lenders charge much more than regular banks.'], 'rather than for a business', 'Một lý do là nhiều người vay dùng tiền cho nhu cầu hằng ngày như thức ăn, học phí, "rather than for a business" – chứ không đầu tư kinh doanh.', undefined, 'B2'),
])],
});

/* ===================================================================
* WRITING · Build a Sentence (câu 1–10)
* =================================================================== */
TF.writing.push({
id: 'tf7-bs', set: 7, task: 'sentence', title: 'Build a Sentence · Set 7',
instr: 'Put the words in the correct order to make a grammatical response.',
items: [
{ n: 1, prompt: 'I could not attend the orientation.', chunks: ['could you', 'tell me', 'where', 'the schedule', 'is posted'], end: '?', starter: 'Oh, that is a pity.',
explain: 'Câu hỏi lồng lịch sự: "Could you tell me + where + S + V". Trong mệnh đề lồng không đảo trợ động từ: "where the schedule is posted", không phải "where is the schedule posted".' },
{ n: 2, prompt: 'Is the lab report due tomorrow?', chunks: ['no', 'it', 'has been', 'postponed', 'until', 'next Friday'], end: '.', alt: ['no it has been postponed until next Friday'],
explain: 'Thì hiện tại hoàn thành bị động "has been postponed" (đã được hoãn). Giới từ "until" + mốc thời gian "next Friday" đứng cuối câu.' },
{ n: 3, prompt: 'Which seminar are you attending?', chunks: ['the one', 'that', 'is', 'taught', 'by', 'Professor Silva'], end: '.',
explain: 'Mệnh đề quan hệ ở thể bị động: "the one that is taught by Professor Silva" (buổi hội thảo do giáo sư Silva dạy). "by + người" đứng sau V3.' },
{ n: 4, prompt: 'Why were you late for class?', chunks: ['my bus', 'broke down', 'on', 'the way', 'to campus'], end: '.', alt: ['on the way to campus my bus broke down'],
explain: '"break down" (hỏng giữa đường) là cụm động từ. "on the way to campus" (trên đường đến trường) là cụm trạng ngữ có thể đứng cuối hoặc đầu câu.' },
{ n: 5, prompt: 'What did your advisor recommend?', chunks: ['she', 'recommended', 'that', 'I', 'take', 'fewer courses', 'next term'], end: '.', alt: ['next term she recommended that I take fewer courses'],
explain: 'Sau "recommend that" dùng động từ nguyên mẫu không "to" (lối giả định): "recommended that I take". "fewer" đi với danh từ đếm được "courses".' },
{ n: 6, prompt: 'Would you like to join our hiking group?', chunks: ['I', 'wish', 'I', 'had', 'more free time', 'on weekends'], end: '.',
explain: 'Cấu trúc ước muốn không có thật ở hiện tại: "I wish + S + V2" (had). "on weekends" là trạng ngữ thời gian đặt cuối câu.' },
{ n: 7, prompt: 'Do you know whose backpack this is?', chunks: ['it', 'must', 'belong', 'to', 'the student', 'who', 'left', 'early'], end: '.',
explain: '"must belong to" = chắc hẳn thuộc về (suy đoán chắc chắn). "who left early" là mệnh đề quan hệ bổ nghĩa cho "the student".' },
{ n: 8, prompt: 'How did the interview go?', chunks: ['it was', 'not', 'as', 'difficult', 'as', 'I', 'had feared'], end: '.',
explain: 'So sánh bằng phủ định "not as + adj + as": "not as difficult as I had feared" (không khó như tôi lo). "had feared" là quá khứ hoàn thành vì nỗi lo có trước.' },
{ n: 9, prompt: 'Are you still working on your presentation?', chunks: ['I', 'have just', 'finished', 'revising', 'the last slide'], end: '.',
explain: '"finish + V-ing" (hoàn thành việc gì): "finished revising". "have just" đứng trước V3, nhấn mạnh hành động vừa xảy ra.' },
{ n: 10, prompt: 'Is the cafeteria open during the holiday?', chunks: ['I', 'am', 'not', 'sure', 'whether', 'it', 'will open', 'at all'], end: '.',
explain: '"I am not sure whether + S + V" – mệnh đề danh từ với "whether" (liệu có hay không). "at all" nhấn mạnh và đứng cuối câu.' },
],
});

/* ===================================================================
* WRITING · Write an Email
* =================================================================== */
TF.writing.push({
id: 'tf7-em1', set: 7, task: 'email', title: 'A Heating Problem in Your Dorm', minutes: 7,
scenario: 'You live in a university residence hall. The heating in your room has worked poorly for several days, and the nights have been very cold. You have already reported the problem once.',
to: 'the Residence Hall Director, Ms. Okonkwo',
points: ['Explain the problem.', 'Describe what you have already done about it.', 'Ask for a specific action.'],
model: 'Dear Ms. Okonkwo,\n\nI am a first-year student in Room 214 of Larch Hall, and I am writing about the heating in my room. For the past five days, the radiator has stayed lukewarm even when it is set to the highest level, and at night the temperature drops so low that I find it hard to sleep.\n\nI reported the problem through the maintenance website on Monday, and a technician looked at the radiator on Tuesday. Unfortunately, nothing has changed since then, and I have not received any further message. In the meantime, I have been using extra blankets and studying in the common room.\n\nCould you please arrange for a second inspection this week? If the radiator cannot be repaired quickly, I would be grateful if I could borrow a small heater or move temporarily to another room.\n\nThank you for your help.\n\nSincerely,\nDavid Park',
checklist: ['Nêu rõ bạn là ai (năm học, số phòng) và vấn đề ngay đoạn đầu', 'Có đủ cả 3 ý trong đề (vấn đề – đã làm gì – yêu cầu cụ thể)', 'Mô tả chi tiết cụ thể (số ngày, ảnh hưởng đến giấc ngủ)', 'Dùng câu đề nghị lịch sự: "Could you please…?", "I would be grateful if…"', 'Có lời kết và ký tên', 'Khoảng 120–180 từ, không lỗi chính tả'],
tips: 'Thư phản ánh nên kể ngắn gọn những gì bạn đã thử (báo qua website, kỹ thuật viên đã đến) để người nhận thấy bạn hợp tác, rồi đưa ra yêu cầu rõ ràng kèm giải pháp tạm thời.',
});
TF.writing.push({
id: 'tf7-em2', set: 7, task: 'email', title: 'An Idea for the Community Library', minutes: 7,
scenario: 'You often use your neighborhood library. You would like the library to start a weekend program that brings neighbors together. You are writing to the branch manager.',
to: 'the Branch Manager, Mr. Adeyemi',
points: ['Describe your idea for a weekend program.', 'Explain how the community would benefit.', 'Offer to help in a specific way.'],
model: 'Dear Mr. Adeyemi,\n\nI have been a regular visitor to the Maple Street Library for three years, and I would like to suggest a new weekend program. My idea is a monthly "Skills Swap" on Saturday afternoons, where residents teach each other a practical skill, such as basic sewing, using a spreadsheet, or cooking a simple meal.\n\nI believe the community would benefit in several ways. Many older residents have knowledge to share but few chances to meet younger people, while students and new arrivals could learn useful skills for free. The program could also bring more families into the library, which might encourage them to borrow books.\n\nI would be happy to help. I could design the posters, contact local volunteers, and lead the first session on photo editing myself.\n\nThank you for considering my suggestion. I look forward to hearing from you.\n\nBest regards,\nAnna Lopez',
checklist: ['Nêu rõ ý tưởng cụ thể (tên chương trình, khi nào, làm gì)', 'Giải thích lợi ích cho cộng đồng bằng ít nhất hai lý do', 'Đề nghị giúp đỡ bằng việc làm cụ thể, không nói chung chung', 'Giọng điệu lịch sự, tích cực, mang tính xây dựng', 'Có lời kết ("Thank you for considering…") và ký tên', 'Khoảng 120–180 từ'],
tips: 'Thư đề xuất thuyết phục khi ý tưởng nhỏ gọn, dễ thực hiện và bạn tự nguyện đóng góp công sức – người quản lý sẽ dễ nói "có" hơn.',
});

/* ===================================================================
* WRITING · Write for an Academic Discussion
* =================================================================== */
TF.writing.push({
id: 'tf7-ad1', set: 7, task: 'discussion', title: 'Should Public Libraries Be Funded by Local Taxes?', minutes: 10,
professor: { name: 'Dr. Mehta', text: 'In our unit on public services, we have looked at how cities pay for libraries. Libraries are usually funded by local taxes, which means that everyone pays, even people who rarely or never visit. Some residents say this is fair because libraries benefit the whole community; others say that only people who use them should pay, for example through membership fees. What is your view: should public libraries be funded by local taxes? Why or why not?' },
students: [
{ name: 'Rosa', text: 'I think taxes are the right way. A library is like a road or a park: you may not use it every day, but the neighborhood is better because it exists. Fees would keep out the people who need it most.' },
{ name: 'Tariq', text: 'I am not so sure. Many people now read online and never go to the library. It seems unfair to make them pay. A small yearly membership fee would match the cost to real use.' },
],
model: 'I agree with Rosa that libraries should be funded mainly through local taxes, but Tariq raises a fair point about how people use libraries today. The key advantage of tax funding is that it keeps the library open to everyone. A family that cannot afford a membership fee could still borrow books, use free internet, and attend classes. However, libraries should also adapt to how people live now. For instance, they could offer more digital services, such as e-books and online homework help, so that residents who rarely visit in person still receive real value for their taxes. In this way, the library stays free to enter and becomes useful to more people, which answers Tariq\'s concern without charging anyone a fee.',
checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Nhắc đến ý của Rosa hoặc Tariq và phản hồi', 'Đưa ra ý MỚI (ví dụ: dịch vụ số), không chỉ lặp lại ý bạn khác', 'Có ví dụ hoặc lý do cụ thể', 'Tối thiểu khoảng 100 từ, câu đa dạng', 'Câu kết tóm lại lập trường'],
tips: 'Khi hai bạn bất đồng, hãy chọn một phía nhưng ghi nhận điều hợp lý của phía kia, rồi thêm một giải pháp riêng. Cụm hữu ích: "I agree with … that …", "However, …", "In this way, …".',
});
TF.writing.push({
id: 'tf7-ad2', set: 7, task: 'discussion', title: 'Should Universities Start Classes Later?', minutes: 10,
professor: { name: 'Professor Nakamura', text: 'This week we are discussing health and student life. Research suggests that many young adults sleep best when they go to bed and wake up later than the typical school schedule allows. Some universities are therefore moving their first classes from 8 a.m. to 10 a.m. Others worry that later classes would shorten the day and make it harder for students to hold jobs. Should universities start classes later in the morning? Explain your opinion.' },
students: [
{ name: 'Mei', text: 'Yes, I would support it. When I have an 8 a.m. class, I am tired for the whole day and I learn much less. A later start would help me concentrate.' },
{ name: 'Omar', text: 'I disagree. I work in a restaurant in the afternoons, so I need morning classes. If classes start later, they will also end later, and I will lose my job.' },
],
model: 'I think universities should start classes later, but they should not force the change on everyone. Mei is right that sleep affects learning, and students who are tired remember less. At the same time, Omar shows that a later schedule can create problems for students who work. A sensible compromise is to keep some morning sections for those who prefer them while moving most required courses to start at nine or ten. For example, a student who works in the afternoon could choose an early section, whereas a student who stays up late could choose a later one. This way, the university supports healthy sleep and still protects students with jobs. Offering choice is better than setting one schedule for everybody.',
checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Phản hồi ý của Mei hoặc Omar', 'Đưa ra giải pháp/ý mới (ví dụ: nhiều ca học để chọn)', 'Có ví dụ minh họa cụ thể', 'Dùng từ nối: At the same time, For example, This way', 'Tối thiểu khoảng 100 từ'],
tips: 'Một chiến lược mạnh là đề xuất giải pháp dung hòa: thừa nhận lợi ích của bên này và khó khăn của bên kia, rồi đưa ra một lựa chọn cho phép cả hai cùng được đáp ứng.',
});

/* ===================================================================
* SPEAKING · Listen and Repeat
* =================================================================== */
TF.speaking.push({
id: 'tf7-rp1', set: 7, task: 'repeat', title: 'Library Volunteer Orientation', accent: 'en-US',
context: 'You are joining a library as a volunteer. Listen to the coordinator and repeat exactly what you hear.',
sentences: [
{ t: 'Welcome to the library.', tip: 'Câu ngắn – nhấn "WELcome" và "LIbrary"; đọc đủ ba âm tiết /ˈlaɪbreri/.' },
{ t: 'The children\'s section is on the first floor.', tip: 'Âm cuối /z/ trong "children\'s"; nhấn "CHILdren\'s" và "FIRST floor".' },
{ t: 'Please check in at the front desk every morning.', tip: 'Nối âm "check in at" → /tʃekɪnæt/; ngữ điệu xuống ở cuối câu.' },
{ t: 'Volunteers can borrow up to ten books at a time.', tip: '"up to ten" đọc liền; "at a time" nối thành /ætəˈtaɪm/; "volunteers" nhấn âm cuối /ˌvɒlənˈtɪərz/.' },
{ t: 'The story hour for toddlers begins at ten thirty on Saturdays.', tip: 'Đọc giờ "ten thirty"; "Saturdays" đọc /ˈsætədeɪz/ với âm cuối /z/.' },
{ t: 'Please return every book to its proper shelf before you leave.', tip: 'Chia nhịp: "Please return every book / to its proper shelf / before you leave"; nhấn "reTURN" và "PROPer".' },
{ t: 'If a child seems upset, speak calmly and let me know right away.', tip: 'Ngữ điệu lên ở "upset," rồi xuống cuối câu; "calmly" /ˈkɑːmli/ – chữ "l" đứng trước "m" là âm câm, giống trong "calm".' },
],
});
TF.speaking.push({
id: 'tf7-rp2', set: 7, task: 'repeat', title: 'Volcano Observatory Visitor Center', accent: 'en-GB',
context: 'You are visiting a volcano observatory. Listen to the guide and repeat exactly what you hear.',
sentences: [
{ t: 'Good afternoon and welcome.', tip: 'Nhấn "AfterNOON"; nối "and welcome" nhẹ, nhanh.' },
{ t: 'The observatory opens at nine.', tip: 'Nối "opens at" → /ˈəʊpənzət/; âm /z/ cuối "opens".' },
{ t: 'Please stay behind the yellow line.', tip: 'Nhấn "STAY" và "YELlow"; đọc rõ /l/ đầu của "line" /laɪn/ và "yellow" /ˈjeləʊ/.' },
{ t: 'Instruments here measure tiny movements in the ground.', tip: 'Nhấn "INstruments" và "MEAsure" /ˈmeʒə/; "tiny" /ˈtaɪni/.' },
{ t: 'The last major eruption took place more than two hundred years ago.', tip: 'Đọc số "two hundred"; nhấn "erUPtion"; "ago" nhấn âm thứ hai.' },
{ t: 'Visitors are welcome to look at the monitors, but please do not touch the screens.', tip: 'Nhấn tương phản "LOOK" và "TOUCH"; ngắt nhịp sau "monitors,".' },
{ t: 'If you hear the siren, walk calmly to the nearest exit.', tip: 'Âm /s/ trong "siren" /ˈsaɪrən/; "nearest" /ˈnɪərɪst/; ngữ điệu xuống ở cuối.' },
],
});

/* ===================================================================
* SPEAKING · Take an Interview
* =================================================================== */
TF.speaking.push({
id: 'tf7-iv1', set: 7, task: 'interview', title: 'Sleep and Daily Routine', seconds: 45, accent: 'en-US',
context: 'A researcher is interviewing students about their sleep habits. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'To begin, what time do you usually go to bed and wake up, and are you happy with that routine?',
model: 'I usually go to bed around midnight and wake up at seven. Honestly, I\'m not completely happy with it, because I often feel tired in the afternoon. I\'d like to sleep a little earlier, but I tend to stay up finishing assignments.',
tip: 'Trả lời cả hai vế: giờ giấc cụ thể và mức độ hài lòng, kèm một lý do. Dùng "I tend to…" để nói về thói quen.' },
{ q: 'What do you usually do in the hour before you go to sleep?',
model: 'In the last hour, I try to relax. I put my phone on the charger across the room, take a warm shower, and read a few pages of a novel. That routine helps my mind slow down, so I fall asleep much faster.',
tip: 'Kể theo trình tự (first, then…) và nêu tác dụng của thói quen. Chi tiết nhỏ (phòng khác, tắm nước ấm) giúp bài sinh động.' },
{ q: 'Some people believe students should be allowed to take a short nap during the school or work day. Do you agree?',
model: 'Yes, I do. A twenty-minute nap can make me more alert, and I study better afterward. Of course, it\'s not easy for everyone, since many classrooms and offices don\'t have a quiet place. So I think schools should provide a small rest room for students who need it.',
tip: 'Nêu quan điểm, một lý do cá nhân, một khó khăn thực tế, rồi đề xuất giải pháp. Dùng "Of course, …" để thừa nhận mặt trái.' },
{ q: 'Finally, if you could give one piece of advice about sleep to a new university student, what would it be?',
model: 'I would tell them to keep the same sleep schedule even on weekends. When I changed my bedtime a lot, I felt exhausted on Mondays. A steady routine gives your body a rhythm, and it makes it easier to wake up for early classes.',
tip: 'Nêu lời khuyên bằng "I would tell them to…", dẫn trải nghiệm thật để chứng minh và kết bằng lợi ích.' },
],
});
TF.speaking.push({
id: 'tf7-iv2', set: 7, task: 'interview', title: 'Money, Saving and Small Businesses', seconds: 45, accent: 'en-GB',
context: 'An economics student is interviewing people about money and small businesses. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'To start, how do you usually decide whether to buy something that is expensive?',
model: 'I usually wait a few days before buying anything expensive. During that time, I compare prices online and ask myself whether I will really use it. If I still want it after a week, then I feel more confident that it\'s a good decision.',
tip: 'Mô tả quy trình ra quyết định theo trình tự và dùng từ nối "During that time", "If … then". Câu mở đầu nên trả lời thẳng.' },
{ q: 'Do you think it is better to save money regularly or to spend it on experiences while you are young? Why?',
model: 'I think a balance is best. Saving a small amount every month builds a safety net for emergencies. However, experiences like traveling teach you things that you can\'t learn in a classroom. So I would save about half of my extra money and use the rest for new experiences.',
tip: 'Với câu hỏi so sánh hai lựa chọn, đừng chỉ chọn một – nêu lợi ích của cả hai rồi đề xuất tỷ lệ cân bằng cụ thể.' },
{ q: 'Imagine you could lend a small amount of money to help a local entrepreneur start a business. What kind of business would you support, and why?',
model: 'I would support a small bakery in my neighborhood. Bakeries are simple to start, and they create jobs for local people. I would also like the owner to use local ingredients, because that supports farmers as well. It would be nice to watch the business grow over time.',
tip: 'Gọi tên loại hình kinh doanh, rồi đưa ít nhất hai lý do (việc làm, nguyên liệu địa phương). Dùng "I would…" cho tình huống giả định.' },
{ q: 'Some people say that small businesses make a neighborhood more interesting than large chains do. What is your opinion?',
model: 'I agree, to a large extent. Small shops often reflect the character of the people who live nearby, and the owners usually know their customers by name. Large chains can be cheaper and convenient, but every street ends up looking the same. I would rather support a local shop when I can.',
tip: 'Đồng ý có mức độ ("to a large extent"), thừa nhận ưu điểm của bên kia (rẻ, tiện) rồi khẳng định lập trường cá nhân.' },
],
});
})(typeof self !== 'undefined' ? self : this);
