/* TOEFL iBT (định dạng từ 21/01/2026) – bổ sung 7: Reading bộ 5 (Daily Life) + Reading và Speaking bộ 6. Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
* Nạp SAU data1–4.js: chỉ BỔ SUNG vào window.TOEFL, cùng định dạng. */
(function (g) {
const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });

/* Helper: o[0] là đáp án đúng, đặt vào vị trí a (xen kẽ A–D). */
const Q = (n, q, o, a, cue, explain, type) => { const w = o.slice(1); w.splice(a, 0, o[0]); const r = { n, q, options: w, a }; if (type) r.type = type; r.cue = cue; r.explain = explain; return r; };
const mc = (instr, items) => ({ type: 'mcq', instr, items });
const P = (p) => p.join('\n\n');

/* ===== BỘ 5 · Reading · Read in Daily Life (câu 31–40) ===== */
TF.reading.push({
id: 'tf5-dl1', set: 5, task: 'daily', title: 'Campus Shuttle Changes',
text: "CAMPUS SHUTTLE – CHANGES STARTING MONDAY\n\nThe North Loop shuttle will now run every 15 minutes instead of every 30 minutes between 7 a.m. and 10 a.m. The last evening shuttle will leave the Science Building at 9:30 p.m. rather than 11 p.m.\n\nThe stop outside the old gym is closed for construction. Passengers should use the new stop beside the Student Union, which is a two-minute walk away.\n\nShuttle passes are no longer sold on the bus. They can be bought at the Transportation Office or through the campus app.",
groups: [mc('Read the notice and answer the questions.', [
Q(31, 'What is the main change for morning riders?', ['Shuttles will come more often.', 'Shuttles will start earlier.', 'Shuttles will stop at the old gym.', 'Passes will become cheaper.'], 0, 'every 15 minutes instead of every 30 minutes', 'Dạng FACTUAL. "every 15 minutes instead of every 30 minutes" → từ 7 đến 10 giờ sáng xe chạy 15 phút một chuyến thay vì 30, tức là đến thường xuyên gấp đôi.'),
Q(32, 'Why should passengers use the stop beside the Student Union?', ['The old gym stop is closed for construction.', 'It is closer to the Science Building.', 'It has a ticket machine.', 'It is the only stop on the North Loop.'], 1, 'closed for construction', 'Dạng FACTUAL. "closed for construction" → điểm dừng cũ trước nhà thể chất đang đóng vì thi công, nên hành khách phải dùng điểm mới cạnh Student Union.'),
Q(33, 'What can be inferred about a student who finishes a lab in the Science Building at 10 p.m.?', ['The student will not be able to take the shuttle home.', 'The student can ride the shuttle for free.', 'The student must buy a pass on the bus.', 'The student should use the stop at the old gym.'], 3, '9:30 p.m. rather than 11 p.m.', 'Dạng INFERENCE. "9:30 p.m. rather than 11 p.m." → chuyến cuối rời Science Building lúc 9:30 tối, nên sinh viên ra lúc 10 giờ tối đã lỡ xe.'),
])],
});
TF.reading.push({
id: 'tf5-dl2', set: 5, task: 'daily', title: 'Email about a Final Report Extension',
text: "Subject: Extension for the Final Report\n\nDear Ms. Alvarez,\n\nThank you for your message about your final report. I understand that your laboratory partner left the course, and I am happy to give you a one-week extension. The new deadline is Friday, December 12, at noon.\n\nPlease note that the extension applies only to the written report. The oral presentation will still take place on December 8, because the schedule for the whole class cannot change. If you have trouble preparing your part alone, you can meet me during office hours on Tuesday afternoon.\n\nBest regards,\nProfessor Daniels",
groups: [mc('Read the email and answer the questions.', [
Q(34, 'Why did Ms. Alvarez ask for more time?', ['Her lab partner left the course.', 'She was ill for a week.', 'She did not understand the topic.', 'Her presentation was cancelled.'], 2, 'your laboratory partner left the course', 'Dạng FACTUAL. "your laboratory partner left the course" → giáo sư nêu rõ bạn thực hành đã bỏ môn là lý do được gia hạn.'),
Q(35, 'What will NOT change because of the extension?', ['The date of the oral presentation', 'The deadline for the written report', 'The time of office hours', 'The length of the report'], 0, 'The oral presentation will still take place on December 8', 'Dạng FACTUAL. "The oral presentation will still take place on December 8" → gia hạn chỉ áp dụng cho bài báo cáo viết; buổi thuyết trình vẫn giữ nguyên ngày 8/12.'),
Q(36, 'The phrase "applies only to" in the second paragraph is closest in meaning to', ['covers just', 'depends on', 'is similar to', 'is explained by'], 1, 'applies only to the written report', 'Dạng VOCAB. "applies only to the written report" → "applies only to" nghĩa là chỉ áp dụng cho, sát nghĩa nhất với "covers just" (chỉ bao gồm).', 'vocab'),
])],
});
TF.reading.push({
id: 'tf5-dl3', set: 5, task: 'daily', title: 'Community Garden Volunteer Day',
text: "GREEN HILLS COMMUNITY GARDEN – VOLUNTEER DAY\n\nSaturday, April 12, 9 a.m. to 1 p.m.\n\nJoin us to plant vegetables and prepare the beds for the growing season. Tools and gloves are provided, but please wear closed shoes and bring a water bottle. Volunteers who stay until noon will receive a free lunch.\n\nChildren under twelve are welcome if they come with an adult. In case of heavy rain, the event will be moved to the following Saturday.",
groups: [mc('Read the flyer and answer the questions.', [
Q(37, 'What should volunteers bring?', ['A water bottle', 'Gardening gloves', 'Their own tools', 'A packed lunch'], 0, 'bring a water bottle', 'Dạng FACTUAL. "bring a water bottle" → dụng cụ và găng tay đã được cung cấp; tình nguyện viên chỉ cần mang bình nước và đi giày kín.'),
Q(38, 'What will happen if there is heavy rain on April 12?', ['The event will be held a week later.', 'The event will be cancelled for the year.', 'The event will move indoors.', 'Only adults will be allowed to work.'], 3, 'moved to the following Saturday', 'Dạng FACTUAL. "moved to the following Saturday" → nếu mưa lớn, sự kiện dời sang thứ Bảy tuần sau, tức là muộn hơn một tuần.'),
])],
});
TF.reading.push({
id: 'tf5-dl4', set: 5, task: 'daily', title: 'Group Chat about an Internet Bill',
text: "Maya: Did you see the internet bill? It's $60 this month.\nLeo: Yes. Last month it was $45. I think the extra charge is for the faster plan we chose.\nMaya: Right, but the new plan is only $10 more. What's the other $5?\nLeo: There's a late fee. Nobody paid on time, so the company added it.\nMaya: OK. Let's set up automatic payment so this doesn't happen again.\nLeo: Good idea. I'll do it tonight and send you both the confirmation.",
groups: [mc('Read the messages and answer the questions.', [
Q(39, 'Why is the bill higher than last month?', ['The plan costs more and a late fee was added.', 'The company raised all its prices.', 'A new roommate joined the plan.', 'The bill includes two months.'], 1, "There's a late fee", 'Dạng FACTUAL. "There\'s a late fee" → gói nhanh hơn thêm 10 đô và phí trả trễ thêm 5 đô, nên hóa đơn là 60 đô thay vì 45 đô.'),
Q(40, 'What does Leo agree to do tonight?', ['Set up automatic payment', 'Call the internet company', 'Change to a cheaper plan', 'Pay the late fee in cash'], 2, "I'll do it tonight", 'Dạng FACTUAL. "I\'ll do it tonight" → Maya đề nghị thanh toán tự động, Leo nhận làm ngay tối nay và gửi xác nhận cho cả hai.'),
])],
});

/* ===== BỘ 6 · READING ===== */
TF.reading.push({
id: 'tf6-cw1', set: 6, task: 'cw', title: 'How Honeybees Communicate',
instr: 'Fill in the missing letters in the paragraph.',
text: "Honeybees live in large colonies, and each colony {de|pends} on cooperation among thousands of individuals. When a worker bee finds a good source {o|f} flowers, she returns to the hive and performs a short dance. The {dir|ection} of the dance shows where the food is, {wh|ile} its length tells the other bees how far {aw|ay} they must fly. Scientists {dis|covered} this system in the twentieth century, {an|d} it is still studied today. Bees can also {sh|are} information about water and new nest sites. Because {suc|h} communication is so precise, a colony can {ga|ther} food much more quickly than a single bee ever could.",
explain: [
'"depends on" = phụ thuộc vào; chủ ngữ số ít "each colony" nên động từ thêm -s.',
'"a source of flowers" = nguồn hoa; giới từ "of" nối "source" với "flowers".',
'"direction" (hướng) là danh từ chỉ điều "shows where the food is".',
'"while" (trong khi) đối chiếu hướng của điệu nhảy với độ dài của nó.',
'"how far away" = bao xa; cụm cố định nói về khoảng cách.',
'Thì quá khứ "discovered" hợp với mốc thời gian "in the twentieth century".',
'"and" nối hai mệnh đề: nó được phát hiện, và vẫn còn được nghiên cứu.',
'"share information" = chia sẻ thông tin; động từ nguyên mẫu sau "can also".',
'"such communication" = kiểu giao tiếp như vậy.',
'"gather food" = thu gom thức ăn; động từ nguyên mẫu sau "can".'
],
});
TF.reading.push({
id: 'tf6-cw2', set: 6, task: 'cw', title: 'How Glaciers Shape the Land',
instr: 'Fill in the missing letters in the paragraph.',
text: "Glaciers are huge masses of ice that move slowly {do|wnhill} under their own weight. Over thousands of years, they change {th|e} land in dramatic ways. As a glacier advances, it picks up rocks {an|d} soil and drags them along its base, {wh|ich} wears away the surface beneath. This process {cre|ates} deep valleys with steep sides and flat {flo|ors}. When the ice finally melts, {the|se} valleys may fill with water and become lakes. Large {pi|les} of rock and gravel, called moraines, are often left behind {a|s} a record of where the glacier once {ex|tended}.",
explain: [
'"downhill" = xuống dốc, hướng di chuyển của sông băng.',
'"the land" (vùng đất) cần mạo từ xác định "the".',
'"rocks and soil" là hai danh từ nối bằng "and".',
'"which" thay cho cả hành động kéo đá đi dọc đáy.',
'Chủ ngữ số ít "This process" + động từ thêm -s: "creates".',
'"floors" (đáy thung lũng) ở số nhiều để khớp với "valleys".',
'"these valleys" chỉ lại những thung lũng vừa nhắc đến.',
'"piles of rock" = các đống đá lớn; "of" đi sau "piles".',
'"as a record" = đóng vai trò như một bằng chứng ghi lại.',
'Thì quá khứ "extended" (trải rộng) hợp với "once" chỉ quá khứ.'
],
});

TF.reading.push({
id: 'tf6-dl1', set: 6, task: 'daily', title: 'Aquatic Center Schedule',
text: "UNIVERSITY AQUATIC CENTER – NEW SEMESTER SCHEDULE\n\nLap swimming is available from 6 a.m. to 8 a.m. and from 5 p.m. to 9 p.m. on weekdays. Between 12 p.m. and 2 p.m., the pool is reserved for swimming classes, and the public may not use it.\n\nAll swimmers must shower before entering the water. Lockers are free, but you must bring your own lock; the center cannot be responsible for items left unattended.\n\nStudents may bring one guest per week by showing their student card at the front desk. Guests must pay a $5 entrance fee.",
groups: [mc('Read the notice and answer the questions.', [
Q(31, 'When can the general public NOT use the pool on weekdays?', ['At midday, when classes are held', 'Early in the morning', 'In the evening', 'During the whole day'], 0, 'reserved for swimming classes', 'Dạng FACTUAL. "reserved for swimming classes" → từ 12 đến 2 giờ chiều hồ dành cho lớp bơi nên công chúng không được dùng.'),
Q(32, 'What must swimmers provide if they want to use a locker?', ['Their own lock', 'A student card', 'A $5 fee', 'A towel from the front desk'], 1, 'bring your own lock', 'Dạng FACTUAL. "bring your own lock" → tủ khóa miễn phí nhưng bạn phải tự mang ổ khóa.'),
Q(33, 'What can be inferred about a student\'s guest?', ['The guest will have to pay to enter.', 'The guest can swim only at noon.', 'The guest does not need to shower.', 'The guest must be a student.'], 2, 'Guests must pay a $5 entrance fee', 'Dạng INFERENCE. "Guests must pay a $5 entrance fee" → sinh viên được đưa một khách đến, nhưng khách phải trả phí vào cửa 5 đô.'),
])],
});
TF.reading.push({
id: 'tf6-dl2', set: 6, task: 'daily', title: 'Email about a Water Shutoff',
text: "Subject: Water Shutoff on Thursday\n\nDear residents of Maple Court,\n\nThe city will repair a water pipe on our street this Thursday, March 6. As a result, the water in all apartments will be turned off from 9 a.m. until about 3 p.m.\n\nWe recommend that you store some drinking water the night before and avoid doing laundry in the morning. After the water returns, it may look cloudy for a short time. This is harmless, and it will clear up if you let the taps run for a few minutes.\n\nIf you have a medical need for running water during the repair, please contact the building office by Wednesday so that we can arrange a solution.\n\nSincerely,\nRita Cole, Property Manager",
groups: [mc('Read the email and answer the questions.', [
Q(34, 'Why will the water be turned off on Thursday?', ['A pipe on the street will be repaired.', 'The building will be cleaned.', 'The water bill has not been paid.', 'New taps will be installed.'], 1, 'repair a water pipe', 'Dạng FACTUAL. "repair a water pipe" → thành phố sửa ống nước nên nước bị cắt từ 9 giờ sáng đến khoảng 3 giờ chiều.'),
Q(35, 'What does the manager suggest residents do the night before?', ['Save some drinking water', 'Do their laundry', 'Call the city', 'Clean their taps'], 0, 'store some drinking water the night before', 'Dạng FACTUAL. "store some drinking water the night before" → quản lý khuyên cư dân trữ sẵn nước uống từ tối hôm trước.'),
Q(36, 'What should a resident with a medical need for water do?', ['Contact the building office by Wednesday', 'Call the city on Thursday morning', 'Wait until the water is cloudy', 'Move out for the day'], 3, 'contact the building office by Wednesday', 'Dạng FACTUAL. "contact the building office by Wednesday" → người cần nước vì lý do y tế phải liên hệ văn phòng tòa nhà trước thứ Tư để được sắp xếp giải pháp.'),
])],
});
TF.reading.push({
id: 'tf6-dl3', set: 6, task: 'daily', title: 'Textbook Buyback Flyer',
text: "BOOKSTORE TEXTBOOK BUYBACK\n\nSell your used textbooks back to us during finals week, December 15 to 19, at the table outside the main entrance. We pay up to 50 percent of the original price for books that will be used again next semester.\n\nBooks must be in good condition, with no water damage or missing pages. Notes written in pencil are fine, but we cannot accept books with heavy highlighting. Please bring a photo ID.\n\nBooks that we cannot buy back may be donated to the campus literacy program.",
groups: [mc('Read the flyer and answer the questions.', [
Q(37, 'Which book would the bookstore most likely refuse to buy?', ['A book with heavy highlighting', 'A book with a few pencil notes', 'A book used again next semester', 'A book in good condition'], 2, 'cannot accept books with heavy highlighting', 'Dạng INFERENCE. "cannot accept books with heavy highlighting" → ghi chú bút chì thì được, nhưng sách bị tô dạ quang nhiều sẽ bị từ chối.'),
Q(38, 'What can students do with books the store does not buy back?', ['Donate them to a literacy program', 'Sell them at a higher price', 'Exchange them for new books', 'Leave them at the main entrance'], 1, 'donated to the campus literacy program', 'Dạng FACTUAL. "donated to the campus literacy program" → sách không thu mua lại có thể quyên tặng cho chương trình xóa mù chữ của trường.'),
])],
});
TF.reading.push({
id: 'tf6-dl4', set: 6, task: 'daily', title: 'Group Chat about a Study Session',
text: "Dana: Are we still meeting at the library at 4?\nIsaac: I can't make 4. My lab runs late. Can we do 5:30 instead?\nDana: 5:30 works for me, but Priya has a class until 6.\nIsaac: Then let's ask Priya to join us online when her class ends. We can share the document in the meantime.\nDana: Good plan. I'll book a study room for 5:30 and send the link to Priya.",
groups: [mc('Read the messages and answer the questions.', [
Q(39, 'Why does Isaac want to change the meeting time?', ['His lab will finish late.', 'The library closes at 4.', 'Priya cannot join online.', 'He has to book a room.'], 0, 'My lab runs late', 'Dạng FACTUAL. "My lab runs late" → Isaac nói buổi thực hành kết thúc muộn nên anh không thể đến lúc 4 giờ.'),
Q(40, 'What will Dana do?', ['Book a room and send Priya a link', 'Cancel the study session', 'Ask Priya to leave class early', 'Share the document in the library'], 3, "I'll book a study room for 5:30", 'Dạng FACTUAL. "I\'ll book a study room for 5:30" → Dana sẽ đặt phòng học lúc 5:30 và gửi đường link cho Priya.'),
])],
});

TF.reading.push({
id: 'tf6-ap1', set: 6, task: 'academic', title: 'The Intelligence of the Octopus',
text: P([
"The octopus is often described as the most intelligent invertebrate. Unlike clams or snails, which have simple nervous systems, an octopus has about five hundred million neurons, a number comparable to that of a dog. Surprisingly, most of these neurons are not in its brain but in its eight arms, which means that each arm can make some decisions on its own.",
"Evidence of octopus intelligence comes largely from laboratory experiments. Octopuses can learn to unscrew the lid of a jar to reach food inside, and they quickly learn to solve mazes. In one famous case, an octopus in an aquarium repeatedly escaped from its tank at night, caught fish in a neighboring tank, and returned home before the staff arrived in the morning.",
"Octopuses also use tools. Researchers in Indonesia observed individuals collecting coconut shell halves, carrying them across the sea floor, and later assembling them into a shelter. Because the shells were useful only in the future, some scientists argue that this behavior shows planning, an ability once thought to be limited to humans and a few other mammals and birds.",
"However, octopuses live short lives, usually only one to two years, and most never meet their parents. This is puzzling, since intelligence in many animals develops through learning from others. One explanation is that the octopus's intelligence evolved to help it survive in a complex habitat full of predators, where flexible problem-solving and camouflage are essential.",
"Not every researcher agrees that these behaviors prove high intelligence. Some point out that simple trial and error can explain many results, and that it is difficult to compare animals whose bodies and senses are so different from ours. Nevertheless, the study of octopuses is changing how scientists think about the origins of intelligence."]),
groups: [mc('Read the passage and answer the questions.', [
Q(61, 'According to paragraph 1, what is surprising about the neurons of an octopus?', ['Most of them are in its arms.', 'There are more than in a dog.', 'They are found only in its brain.', 'They are larger than those of snails.'], 0, 'most of these neurons are not in its brain but in its eight arms', 'Dạng FACTUAL. "most of these neurons are not in its brain but in its eight arms" → phần lớn nơ-ron nằm ở tám xúc tu, nên mỗi xúc tu tự quyết định được một số việc.', 'factual'),
Q(62, 'The word "comparable" in paragraph 1 is closest in meaning to', ['similar', 'opposite', 'smaller', 'unknown'], 2, 'comparable to that of a dog', 'Dạng VOCAB. "comparable to that of a dog" → bạch tuộc có số nơ-ron tương đương chó, nên "comparable" nghĩa là tương tự (similar).', 'vocab'),
Q(63, 'What can be inferred from the aquarium case in paragraph 2?', ['The octopus could solve problems without being taught.', 'The octopus was unhappy in its tank.', 'The staff wanted the octopus to escape.', 'The octopus preferred to hunt in the morning.'], 1, 'returned home before the staff arrived in the morning', 'Dạng INFERENCE. "returned home before the staff arrived in the morning" → vượt khỏi bể, bắt cá rồi quay về mà không bị phát hiện cho thấy bạch tuộc tự giải quyết vấn đề.', 'inference'),
Q(64, 'Why does the author mention unscrewing the lid of a jar?', ['To give an example of learning in experiments', 'To show that octopuses eat from jars', 'To explain how octopuses escape', 'To compare octopuses with dogs'], 0, 'unscrew the lid of a jar', 'Dạng PURPOSE. "unscrew the lid of a jar" → vặn nắp lọ là một ví dụ thí nghiệm trong phòng lab, dùng làm bằng chứng cho khả năng học hỏi.', 'purpose'),
Q(65, 'According to paragraph 3, what did researchers in Indonesia observe?', ['Octopuses building shelters from coconut shells', 'Octopuses eating coconuts', 'Octopuses fighting over shells', 'Octopuses burying shells in sand'], 3, 'assembling them into a shelter', 'Dạng FACTUAL. "assembling them into a shelter" → bạch tuộc gom nửa vỏ dừa rồi ghép lại thành nơi trú ẩn.', 'factual'),
Q(66, 'The word "assembling" in paragraph 3 is closest in meaning to', ['putting together', 'taking apart', 'searching for', 'hiding from'], 1, 'assembling them into a shelter', 'Dạng VOCAB. "assembling them into a shelter" → dựng nơi trú ẩn từ các nửa vỏ nghĩa là ghép các mảnh lại với nhau (putting together).', 'vocab'),
Q(67, 'Why does the author say the shells were "useful only in the future"?', ['To suggest the octopuses were planning ahead', 'To show the shells were of low quality', 'To explain why shells are rare', 'To argue octopuses forget quickly'], 2, 'useful only in the future', 'Dạng PURPOSE. "useful only in the future" → mang vỏ chỉ có ích về sau được dùng làm bằng chứng cho khả năng lên kế hoạch trước.', 'purpose'),
Q(68, 'According to paragraph 4, all of the following are true of octopuses EXCEPT', ['they learn most skills from their parents', 'they live only one to two years', 'most never meet their parents', 'they live among many predators'], 0, 'most never meet their parents', 'Dạng NEGATIVE. "most never meet their parents" → bạch tuộc hiếm khi gặp bố mẹ nên chúng không học kỹ năng từ bố mẹ; đây là phương án sai (EXCEPT).', 'negative'),
Q(69, 'According to paragraph 5, why do some researchers doubt that octopuses are highly intelligent?', ['Simple trial and error can explain many results.', 'Octopuses live in very deep water.', 'Experiments have never been repeated.', 'Octopuses have too few neurons.'], 3, 'simple trial and error can explain many results', 'Dạng FACTUAL. "simple trial and error can explain many results" → một số nhà nghiên cứu cho rằng chỉ cần thử và sai cũng giải thích được nhiều kết quả.', 'factual'),
Q(70, 'Which of the following best describes the organization of the passage?', ['It makes a claim, gives evidence, raises a puzzle, and notes doubts.', 'It compares two animals and ends with a prediction.', 'It tells the history of octopus research.', 'It lists rules for keeping octopuses in aquariums.'], 1, 'Not every researcher agrees', 'Dạng ORGANIZATION. "Not every researcher agrees" → đoạn 1–3 nêu luận điểm và bằng chứng, đoạn 4 nêu điều khó hiểu, đoạn 5 nêu những nghi ngờ.', 'organization'),
])],
});
TF.reading.push({
id: 'tf6-ap2', set: 6, task: 'academic', title: 'The Durability of Roman Concrete',
text: P([
"Many buildings constructed by the ancient Romans are still standing after two thousand years. The Pantheon in Rome, completed around 125 CE, has the largest unreinforced concrete dome in the world and has survived earthquakes, floods, and centuries of neglect. By comparison, modern concrete structures often need major repairs after only fifty years.",
"Roman concrete was made from lime, volcanic ash, and chunks of rock. The volcanic ash, found near the Bay of Naples, was a key ingredient. When mixed with lime and seawater, it caused chemical reactions that strengthened the material over time instead of weakening it. Roman engineers used this property to build harbors, some of which remain solid today.",
"In recent years, researchers have discovered another reason for its durability. Small white lumps, long thought to be the result of poor mixing, appear throughout the concrete. Analysis showed that the lumps are pieces of lime that were deliberately added in a very hot form. When cracks form and water enters, the lime dissolves and then hardens again, filling the gap. In effect, the concrete can heal itself.",
"This finding has attracted the attention of engineers who are searching for ways to reduce the environmental cost of modern construction. Producing cement, the main ingredient of modern concrete, releases a large amount of carbon dioxide, so longer-lasting buildings would mean fewer replacements and lower emissions.",
"Nevertheless, Roman concrete is not a perfect model. It was weaker than modern concrete in the first weeks, and it could not be combined with steel bars, which allow modern buildings to be tall. Most researchers therefore expect to adapt the Roman ideas rather than copy them exactly."]),
groups: [mc('Read the passage and answer the questions.', [
Q(71, 'According to paragraph 1, what is notable about the Pantheon?', ['It has the largest unreinforced concrete dome in the world.', 'It was built near the Bay of Naples.', 'It needed major repairs after fifty years.', 'It was built with steel bars.'], 1, 'largest unreinforced concrete dome in the world', 'Dạng FACTUAL. "largest unreinforced concrete dome in the world" → Pantheon có mái vòm bê tông không cốt thép lớn nhất thế giới và đã tồn tại qua nhiều thế kỷ.', 'factual'),
Q(72, 'The word "neglect" in paragraph 1 is closest in meaning to', ['lack of care', 'careful repair', 'heavy use', 'strong protection'], 0, 'centuries of neglect', 'Dạng VOCAB. "centuries of neglect" → chịu được "neglect" nghĩa là chịu được sự thiếu chăm sóc, bảo dưỡng (lack of care).', 'vocab'),
Q(73, 'According to paragraph 2, why was volcanic ash important to Roman concrete?', ['It strengthened the material over time with lime and seawater.', 'It made the concrete dry faster.', 'It gave the concrete a white color.', 'It replaced the need for lime.'], 2, 'strengthened the material over time', 'Dạng FACTUAL. "strengthened the material over time" → tro núi lửa trộn với vôi và nước biển gây phản ứng hóa học làm bê tông cứng hơn theo thời gian.', 'factual'),
Q(74, 'What can be inferred from paragraph 2 about Roman harbors?', ['Seawater did not destroy the concrete used in them.', 'They were built far from the sea.', 'They were later rebuilt with modern cement.', 'They were weaker than the Pantheon.'], 3, 'some of which remain solid today', 'Dạng INFERENCE. "some of which remain solid today" → các bến cảng xây dưới nước biển vẫn còn vững, nên nước biển không phá hỏng bê tông.', 'inference'),
Q(75, 'According to paragraph 3, what did analysis show about the small white lumps?', ['They are pieces of lime added on purpose.', 'They are mistakes caused by poor mixing.', 'They are pieces of volcanic ash.', 'They appear only on the surface.'], 1, 'deliberately added in a very hot form', 'Dạng FACTUAL. "deliberately added in a very hot form" → phân tích cho thấy các cục trắng là vôi được cố ý thêm vào, không phải do trộn kém.', 'factual'),
Q(76, 'Why does the author write "In effect, the concrete can heal itself"?', ['To summarize what the lime does when cracks form', 'To suggest that concrete is a living material', 'To introduce a new ingredient', 'To criticize earlier research'], 0, 'In effect, the concrete can heal itself', 'Dạng PURPOSE. "In effect, the concrete can heal itself" → câu này tóm tắt quá trình vôi hòa tan rồi cứng lại, lấp đầy vết nứt.', 'purpose'),
Q(77, 'The word "deliberately" in paragraph 3 is closest in meaning to', ['on purpose', 'by accident', 'slowly', 'secretly'], 2, 'deliberately added in a very hot form', 'Dạng VOCAB. "deliberately added in a very hot form" → vôi được thêm có chủ ý, tức là "on purpose" (cố ý).', 'vocab'),
Q(78, 'Why does the author mention that producing cement releases carbon dioxide?', ['To explain why engineers are interested in lasting concrete', 'To prove that Roman concrete was clean', 'To argue that cement should be banned', 'To describe how cement is made'], 3, 'releases a large amount of carbon dioxide', 'Dạng PURPOSE. "releases a large amount of carbon dioxide" → công trình bền hơn thì ít phải xây lại, khí thải thấp hơn, nên giải thích vì sao kỹ sư quan tâm.', 'purpose'),
Q(79, 'According to paragraph 5, all of the following are weaknesses of Roman concrete EXCEPT', ['it was more expensive to produce than modern concrete', 'it was weaker in the first weeks', 'it could not be combined with steel bars', 'it was less suitable for tall buildings'], 0, 'could not be combined with steel bars', 'Dạng NEGATIVE. "could not be combined with steel bars" → đoạn 5 không nhắc đến chi phí; ba nhược điểm còn lại đều có trong đoạn, nên chi phí là phương án sai (EXCEPT).', 'negative'),
Q(80, 'What can be inferred about what researchers will probably do with Roman concrete?', ['Adapt its ideas for modern use', 'Copy it exactly in new buildings', 'Stop studying it', 'Use it only for harbors'], 1, 'adapt the Roman ideas rather than copy them exactly', 'Dạng INFERENCE. "adapt the Roman ideas rather than copy them exactly" → đa số nhà nghiên cứu dự kiến điều chỉnh ý tưởng La Mã chứ không sao chép nguyên xi.', 'inference'),
])],
});

/* ===== BỘ 6 · SPEAKING ===== */
TF.speaking.push({
id: 'tf6-rp1', set: 6, task: 'repeat', title: 'Orientation Leader', accent: 'en-US',
context: 'You are attending a campus orientation. Listen to the student leader and repeat exactly what you hear.',
sentences: [
{ t: 'Welcome to campus, everyone.', tip: 'Nhấn "WEL" trong welcome và "CAM" trong campus.' },
{ t: 'Please pick up your schedule at the front table.', tip: 'Nối âm "pick up" /pɪkʌp/; nhấn "SCHEDULE" và "FRONT TABLE".' },
{ t: 'Your student card also works as a library card.', tip: '"also works as a" đọc lướt nhanh; nhấn "STUDENT CARD" và "LIBRARY CARD".' },
{ t: 'The dining hall is open from seven until nine every day.', tip: 'Đọc "seven until nine" liền mạch; giữ âm /l/ cuối ở "hall".' },
{ t: 'If you have any questions, ask one of the volunteers in the red shirts.', tip: 'Ngắt nhịp sau "questions,"; nhấn "RED SHIRTS".' },
{ t: 'We will divide into small groups and tour the main buildings.', tip: '"divide" /dɪˈvaɪd/; nhấn "SMALL GROUPS" và "MAIN BUILDINGS".' },
{ t: 'After the tour, there will be a short meeting about safety and student services.', tip: 'Chia cụm: "After the tour, / there will be a short meeting / about safety and student services".' },
],
});
TF.speaking.push({
id: 'tf6-rp2', set: 6, task: 'repeat', title: 'Campus Café Manager', accent: 'en-GB',
context: 'You have a new job at the campus café. Listen to the manager and repeat exactly what you hear.',
sentences: [
{ t: 'Please put on your apron before you start.', tip: 'Nối âm "put on" /pʊtɒn/; nhấn "APRON" và "START".' },
{ t: 'The coffee machine needs to be cleaned every evening.', tip: '"coffee" giọng Anh /ˈkɒfi/; nhấn "COFFEE MACHINE" và "EVENING".' },
{ t: 'Customers can pay by card or with the campus app.', tip: 'Nhấn "CARD" và "APP"; "or with the" đọc yếu.' },
{ t: 'Always ask if a customer has any food allergies.', tip: 'Nhấn "ASK" và "ALLERGIES" /ˈælədʒiz/.' },
{ t: 'The busiest time is between noon and one o\'clock.', tip: '"busiest" /ˈbɪziəst/; nhấn "NOON" và "ONE".' },
{ t: 'If something spills, tell me immediately so that nobody slips.', tip: 'Ngắt nhịp sau "spills,"; nhấn "IMMEDIATELY" và "SLIPS".' },
{ t: 'At the end of your shift, please count the money in the register and write down the total.', tip: 'Câu dài: "At the end of your shift, / count the money in the register / and write down the total".' },
],
});
TF.speaking.push({
id: 'tf6-iv1', set: 6, task: 'interview', title: 'Technology in Daily Life', seconds: 45, accent: 'en-US',
context: 'A researcher is interviewing university students about technology in their daily lives. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'To begin, which technology do you use most often every day, and what do you use it for?',
model: "The technology I use most is my smartphone. In the morning I check the weather and my schedule, and during the day I use it to take notes, look up words, and message my classmates. In the evening I sometimes watch videos or call my family. It's like a small computer that I carry everywhere.",
tip: 'Nêu rõ một thiết bị, rồi kể 3 công dụng theo trình tự thời gian.' },
{ q: 'How has technology changed the way you study compared with the way your parents studied?',
model: "My parents mostly studied from printed books and went to the library for information. I can search for articles in seconds and watch lessons online at any time. I can also work on group projects with classmates through shared documents, even when we are not together. The main change is speed, although I think I get distracted more easily.",
tip: 'Đối chiếu "my parents" với "I", rồi thêm một mặt hạn chế.' },
{ q: 'Some people say students spend too much time on their phones. Do you agree?',
model: "I partly agree. Many students check their phones every few minutes, and that makes it difficult to concentrate. However, phones are also useful for learning, for example with dictionary apps and online lectures. I think the problem is not the phone itself but how we use it, so students should set limits such as turning off notifications while studying.",
tip: 'Dùng "partly agree", nêu cả hai phía, rồi đưa giải pháp.' },
{ q: 'What new technology would you like to see in schools in the future, and why?',
model: "I would like schools to use translation tools in real time. Many international students find lectures hard to follow, and subtitles in their own language could help them understand the content. It would also make group discussions easier. Of course, students would still need to practice speaking, but this tool would give them confidence at the beginning.",
tip: 'Nêu một ý tưởng, một lý do, một lợi ích, một hạn chế.' },
],
});
TF.speaking.push({
id: 'tf6-iv2', set: 6, task: 'interview', title: 'Free Time and Hobbies', seconds: 45, accent: 'en-GB',
context: 'A student magazine is interviewing students about their free time. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'First, what do you usually do in your free time during the week?',
model: "During the week I don't have much free time, but I try to go for a walk or play basketball with friends after classes. It helps me relax after studying. At night I sometimes read a novel or watch an episode of a series. On weekends I have more time, so I like to cook something new.",
tip: 'Đối chiếu ngày thường và cuối tuần để đủ thời lượng.' },
{ q: 'Tell me about a hobby that you started recently. Why did you start it?',
model: "Recently I started learning the guitar. A friend of mine plays in a small band, and I enjoyed listening to him, so I decided to try it myself. I practice for about twenty minutes every evening using online videos. It is difficult at first, but I feel proud when I can play a whole song.",
tip: 'Nói rõ cái gì, vì sao, tần suất và cảm xúc của bạn.' },
{ q: 'Do you prefer spending free time alone or with other people? Why?',
model: "I prefer a mix, but if I have to choose, I like being with other people. When I spend time with friends, we share ideas and laugh, and I feel more energetic. However, after a busy week I need some time alone to rest and think. So I choose company when I want fun and quiet when I am tired.",
tip: 'Nêu sở thích, đưa lý do, rồi thừa nhận một ngoại lệ.' },
{ q: 'Should universities provide more activities for students outside of class? What kind?',
model: "Yes, I think they should. Activities help students meet new people and reduce stress. For example, universities could organize weekend sports tournaments, music nights, and volunteer projects in the community. These events would be especially helpful for new students who don't know anyone yet, and they would make the campus feel more like a community.",
tip: 'Đồng ý, đưa 2–3 ví dụ và nêu ai được hưởng lợi.' },
],
});

/* ===== BỘ 5–6 · Writing · Build a Sentence (bổ sung cho đủ 10 câu/bộ; tự biên soạn) ===== */
TF.writing.push({
id: 'tf5-bs2', set: 5, task: 'sentence', title: 'Build a Sentence · Set 5 (more)',
instr: 'Put the words in the correct order to make a grammatical response.',
items: [
{ n: 57, prompt: 'When does the registration period end?', chunks: ['it', 'ends', 'on Friday', 'unless', 'the university', 'extends the deadline'], end: '.', alt: ['unless the university extends the deadline it ends on Friday'],
explain: 'Mệnh đề chính "it ends on Friday" + điều kiện "unless + S + V" (hiện tại đơn cho sự việc có thể xảy ra). Mệnh đề "unless" cũng có thể đứng trước mệnh đề chính.' },
{ n: 58, prompt: 'Why was the field trip cancelled?', chunks: ['the guide', 'told us', 'that', 'the road', 'had been', 'blocked', 'by the snow'], end: '.',
explain: 'Câu tường thuật: "told us that + mệnh đề". Quá khứ hoàn thành bị động "had been blocked" cho thấy việc bị chặn xảy ra trước khi hủy; "by the snow" nêu nguyên nhân và đứng cuối.' },
],
});
TF.writing.push({
id: 'tf6-bs2', set: 6, task: 'sentence', title: 'Build a Sentence · Set 6 (more)',
instr: 'Put the words in the correct order to make a grammatical response.',
items: [
{ n: 59, prompt: 'Can we meet to discuss my grade?', chunks: ['I am', 'free', 'after lunch', 'if', 'that', 'works for you'], end: '.', alt: ['if that works for you I am free after lunch', 'after lunch I am free if that works for you'],
explain: 'Mệnh đề chính "I am free" + cụm thời gian "after lunch" + điều kiện "if that works for you". Điều kiện hoặc cụm thời gian có thể đưa lên đầu câu mà nghĩa không đổi.' },
{ n: 60, prompt: 'What was the most surprising result of your survey?', chunks: ['fewer', 'students', 'than', 'we', 'had expected', 'said', 'they', 'read for fun'], end: '.',
explain: 'So sánh "fewer + danh từ số nhiều + than" với mệnh đề quá khứ hoàn thành "we had expected"; động từ tường thuật "said" đi trực tiếp với mệnh đề "they read for fun" mà không cần "that".' },
],
});
})(self);
/* TOEFL iBT (định dạng từ 21/01/2026) – bổ sung 8: Writing (Build a Sentence, Email, Academic Discussion) và Speaking (Listen and Repeat, Interview), gắn vào bộ 1–6 (mỗi bộ vẫn đủ chuẩn; chỉ thêm đề). Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
* Nạp SAU data1–7.js: chỉ BỔ SUNG vào window.TOEFL, cùng định dạng. */
(function (g) {
const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });
const INSTR = 'Put the words in the correct order to make a grammatical response.';
const bs = (id, set, items) => TF.writing.push({ id, set, task: 'sentence', title: 'Build a Sentence · Set ' + set + ' (extra)', instr: INSTR, items });

/* ===================================================================
* WRITING · Build a Sentence (câu 61–100)
* =================================================================== */
bs('tf7-bs3', 1, [
{ n: 61, prompt: 'Did you submit the lab report?', chunks: ['I', 'submitted it', 'before', 'the deadline', 'passed'], end: '.', alt: ['before the deadline passed I submitted it'],
explain: 'Mệnh đề chính "I submitted it" + mệnh đề thời gian "before + S + V (quá khứ)". Mệnh đề "before…" có thể đứng đầu câu mà nghĩa không đổi.' },
{ n: 62, prompt: 'Why are you leaving early today?', chunks: ['I', 'have', 'an appointment', 'with', 'my academic advisor'], end: '.',
explain: 'Cấu trúc "have an appointment with + người" (có hẹn với ai). "academic advisor" là cố vấn học tập, đứng cuối câu sau giới từ "with".' },
{ n: 63, prompt: 'What does the new library policy say?', chunks: ['visitors', 'are not', 'allowed', 'to enter', 'after ten p.m.'], end: '.',
explain: 'Bị động với "allow": "are not allowed to + V" (không được phép làm gì). Cụm thời gian "after ten p.m." đứng cuối.' },
{ n: 64, prompt: 'Where did you find this article?', chunks: ['my professor', 'recommended it', 'in', 'last week\'s lecture'], end: '.', alt: ['in last week\'s lecture my professor recommended it'],
explain: 'Trật tự S + V + O: "my professor recommended it". "last week\'s lecture" là sở hữu cách (bài giảng của tuần trước); cụm giới từ có thể đứng đầu câu.' },
{ n: 65, prompt: 'Is the cafeteria still open?', chunks: ['I am afraid', 'it', 'closed', 'ten minutes ago'], end: '.',
explain: '"I am afraid (that) …" dùng để báo tin không vui một cách lịch sự. "ten minutes ago" (cách đây mười phút) đi với thì quá khứ đơn "closed".' },
{ n: 66, prompt: 'Could you tell me about the scholarship?', chunks: ['applicants', 'must submit', 'two', 'recommendation letters'], end: '.',
explain: '"must + V" diễn tả yêu cầu bắt buộc. Số từ "two" đứng trước danh từ số nhiều "recommendation letters" (thư giới thiệu).' },
{ n: 67, prompt: 'How do you like your new apartment?', chunks: ['it would be', 'perfect', 'if', 'it were', 'closer to campus'], end: '.', alt: ['if it were closer to campus it would be perfect'],
explain: 'Câu điều kiện loại 2: "would + V … if + S + were/V2". Với "if", dùng "were" cho mọi ngôi. Mệnh đề "if" có thể đứng trước.' },
{ n: 68, prompt: 'Do you know where the seminar is?', chunks: ['it', 'has been moved', 'to', 'Room 204'], end: '.',
explain: 'Hiện tại hoàn thành bị động: "has been moved" (đã được chuyển). Giới từ "to" chỉ nơi đến mới: "to Room 204".' },
{ n: 69, prompt: 'What are you doing this weekend?', chunks: ['I am going to', 'visit', 'the art museum', 'with my sister'], end: '.',
explain: 'Kế hoạch đã định: "be going to + V". Thứ tự: động từ → tân ngữ ("the art museum") → cụm giới từ đi cùng ("with my sister").' },
{ n: 70, prompt: 'Why did the experiment fail?', chunks: ['the samples', 'had not been', 'stored', 'properly'], end: '.',
explain: 'Quá khứ hoàn thành bị động phủ định: "had not been stored" (đã không được bảo quản) – xảy ra trước khi thí nghiệm hỏng. Trạng từ "properly" đứng cuối.' },
]);
bs('tf8-bs3', 2, [
{ n: 71, prompt: 'Have you ever taken a public speaking course?', chunks: ['I', 'have never', 'taken one', 'before'], end: '.',
explain: 'Hiện tại hoàn thành phủ định với "never": "have never + V3". "one" thay cho "a public speaking course" để tránh lặp.' },
{ n: 72, prompt: 'What time does the museum open?', chunks: ['it opens', 'at nine', 'on weekdays', 'and', 'at ten', 'on weekends'], end: '.', alt: ['on weekdays it opens at nine and at ten on weekends'],
explain: 'Hiện tại đơn cho lịch cố định. Hai cụm "at nine on weekdays" và "at ten on weekends" nối bằng "and", giữ song song về cấu trúc.' },
{ n: 73, prompt: 'Who is giving the keynote speech?', chunks: ['I heard', 'that', 'a famous', 'marine biologist', 'will give it'], end: '.',
explain: '"I heard that + mệnh đề" (tôi nghe nói rằng…). Mạo từ "a" đi trước tính từ "famous", rồi tới danh từ "marine biologist" (nhà sinh vật biển).' },
{ n: 74, prompt: 'Why was the lecture so crowded?', chunks: ['many students', 'attended', 'because', 'the speaker', 'had won', 'a national award'], end: '.', alt: ['because the speaker had won a national award many students attended'],
explain: 'Mệnh đề chỉ nguyên nhân "because + S + V". "had won" (quá khứ hoàn thành) cho thấy giải thưởng có trước buổi giảng.' },
{ n: 75, prompt: 'Do you think we should postpone the event?', chunks: ['I think', 'we should', 'wait', 'until', 'the weather improves'], end: '.',
explain: '"should + V" nêu đề nghị. Sau "until" dùng hiện tại đơn ("improves") dù nói về tương lai.' },
{ n: 76, prompt: 'What did the coach tell the team?', chunks: ['he asked', 'them', 'to arrive', 'an hour', 'earlier than usual'], end: '.',
explain: 'Cấu trúc "ask + O + to V" (yêu cầu ai làm gì). "an hour earlier than usual" = sớm hơn thường lệ một giờ, so sánh hơn với "than".' },
{ n: 77, prompt: 'How is your thesis going?', chunks: ['I have', 'finished', 'two chapters', 'so far'], end: '.', alt: ['so far I have finished two chapters'],
explain: 'Hiện tại hoàn thành "have finished" đi với "so far" (cho đến nay). "so far" có thể đứng đầu hoặc cuối câu.' },
{ n: 78, prompt: 'Can I borrow your notes from yesterday?', chunks: ['of course', 'as long as', 'you', 'return them', 'by Friday'], end: '.',
explain: '"as long as + S + V" = miễn là, nêu điều kiện. "by Friday" nghĩa là chậm nhất đến thứ Sáu; "return them" dùng "them" thay cho "my notes".' },
{ n: 79, prompt: 'What was the main point of the documentary?', chunks: ['it showed', 'how', 'plastic waste', 'affects', 'ocean life'], end: '.',
explain: 'Mệnh đề danh từ với "how": "how + S + V" – KHÔNG đảo trợ động từ. "plastic waste" (số ít, không đếm được) → "affects".' },
{ n: 80, prompt: 'Why do you want to join the debate club?', chunks: ['I hope', 'to become', 'a more', 'confident speaker'], end: '.',
explain: '"hope to + V" (hy vọng làm gì). So sánh hơn với tính từ dài: "a more confident speaker" (một người nói tự tin hơn).' },
]);
bs('tf9-bs3', 3, [
{ n: 81, prompt: 'Where should we hold the study session?', chunks: ['the quiet room', 'on the third floor', 'is', 'usually', 'available'], end: '.',
explain: 'Trạng từ tần suất "usually" đứng sau "be" và trước tính từ: "is usually available". Cụm "on the third floor" bổ nghĩa cho "the quiet room".' },
{ n: 82, prompt: 'Why didn\'t you answer my message?', chunks: ['my phone', 'had run out', 'of battery', 'before', 'I saw it'], end: '.', alt: ['before I saw it my phone had run out of battery'],
explain: 'Quá khứ hoàn thành "had run out of" cho việc xảy ra trước. "run out of battery" = hết pin. Mệnh đề "before…" dùng quá khứ đơn.' },
{ n: 83, prompt: 'What happens if I miss the deadline?', chunks: ['your grade', 'will be lowered', 'by', 'ten percent', 'for each late day'], end: '.',
explain: 'Tương lai bị động "will be lowered" (sẽ bị hạ). "by ten percent" chỉ mức giảm; "for each late day" = cho mỗi ngày nộp muộn.' },
{ n: 84, prompt: 'Is the professor available today?', chunks: ['she will be', 'in her office', 'until', 'four o\'clock'], end: '.',
explain: '"until" chỉ thời điểm kết thúc của một trạng thái kéo dài: ở văn phòng cho tới 4 giờ. "will be" diễn tả dự kiến trong tương lai.' },
{ n: 85, prompt: 'Do you know who designed the building?', chunks: ['it was designed', 'by', 'a local architect', 'in 1998'], end: '.', alt: ['in 1998 it was designed by a local architect'],
explain: 'Quá khứ đơn bị động "was designed" + "by + tác nhân". Mốc thời gian "in 1998" có thể đứng cuối hoặc đầu câu.' },
{ n: 86, prompt: 'What do you think of the new schedule?', chunks: ['it is', 'much', 'more convenient', 'than', 'the old one'], end: '.',
explain: '"much" nhấn mạnh so sánh hơn: "much more convenient than…". "the old one" thay cho "the old schedule".' },
{ n: 87, prompt: 'How can I improve my pronunciation?', chunks: ['you should', 'record', 'yourself', 'and', 'listen carefully'], end: '.',
explain: 'Lời khuyên "should + V". Đại từ phản thân "yourself" đứng sau động từ khi chủ ngữ và tân ngữ là cùng một người; "and" nối hai động từ song song.' },
{ n: 88, prompt: 'Why is the street closed?', chunks: ['workers', 'are repairing', 'a broken', 'water pipe'], end: '.',
explain: 'Hiện tại tiếp diễn cho việc đang diễn ra: "are repairing". Danh từ ghép "water pipe" (ống nước) đứng sau tính từ "broken".' },
{ n: 89, prompt: 'Would you like to join our hiking trip?', chunks: ['I would join you', 'if', 'I', 'were not', 'so busy', 'this month'], end: '.', alt: ['if I were not so busy this month I would join you'],
explain: 'Điều kiện loại 2: "would + V if + S + were not…". "so busy" = bận đến vậy; trạng ngữ "this month" đứng cuối mệnh đề điều kiện.' },
{ n: 90, prompt: 'What did the survey find?', chunks: ['most students', 'said', 'that', 'they prefer', 'studying', 'in the morning'], end: '.',
explain: 'Câu tường thuật "said that + mệnh đề". Sau "prefer" dùng V-ing để nói về sở thích chung: "prefer studying in the morning".' },
]);
bs('tf10-bs3', 4, [
{ n: 91, prompt: 'Where is the nearest printer?', chunks: ['there is', 'one', 'next to', 'the information desk'], end: '.',
explain: '"there is + danh từ số ít" để chỉ sự tồn tại; "one" thay cho "a printer". Giới từ chỉ vị trí "next to" + cụm danh từ.' },
{ n: 92, prompt: 'Did the team finish the project?', chunks: ['they would have finished', 'earlier', 'if', 'they had received', 'more funding'], end: '.', alt: ['if they had received more funding they would have finished earlier'],
explain: 'Điều kiện loại 3 (trái với quá khứ): "would have + V3 … if + S + had + V3". Hai vế có thể đổi chỗ.' },
{ n: 93, prompt: 'Why is Maria absent today?', chunks: ['she is', 'recovering', 'from', 'a minor surgery'], end: '.',
explain: '"recover from + danh từ" = hồi phục sau điều gì. "minor surgery" = ca tiểu phẫu; tính từ "minor" đứng trước danh từ.' },
{ n: 94, prompt: 'What do you recommend for a first-year student?', chunks: ['I recommend', 'taking', 'fewer', 'courses', 'in your first semester'], end: '.',
explain: '"recommend + V-ing" (khuyên làm gì). "fewer" dùng với danh từ đếm được số nhiều ("courses").' },
{ n: 95, prompt: 'How long have you studied Japanese?', chunks: ['I have been studying', 'it', 'for about', 'three years'], end: '.',
explain: 'Hiện tại hoàn thành tiếp diễn "have been studying" nhấn mạnh quá trình kéo dài; "for + khoảng thời gian" trả lời "How long".' },
{ n: 96, prompt: 'Is the report ready?', chunks: ['I am still waiting', 'for', 'the final data', 'from the lab'], end: '.',
explain: '"wait for + danh từ" (chờ cái gì). Cụm giới từ "from the lab" bổ nghĩa cho "the final data" nên đứng ngay sau nó.' },
{ n: 97, prompt: 'Who will lead the discussion?', chunks: ['whoever finishes', 'the reading', 'first', 'will lead it'], end: '.',
explain: '"whoever" mở đầu mệnh đề danh từ làm chủ ngữ (bất kỳ ai…). Cả mệnh đề "whoever finishes the reading first" đi với động từ "will lead".' },
{ n: 98, prompt: 'What is the library\'s new rule?', chunks: ['students', 'must show', 'their ID', 'to borrow', 'laptops'], end: '.',
explain: '"to + V" chỉ mục đích: "to borrow laptops" (để mượn máy tính xách tay). "must show" diễn tả quy định bắt buộc.' },
{ n: 99, prompt: 'Do you want to eat out tonight?', chunks: ['I would rather', 'stay home', 'because', 'I have', 'an exam', 'tomorrow'], end: '.', alt: ['because I have an exam tomorrow I would rather stay home'],
explain: '"would rather + V nguyên mẫu" (thà làm gì hơn). Mệnh đề lý do "because I have an exam tomorrow" có thể đứng đầu hoặc cuối.' },
{ n: 100, prompt: 'What did you learn from the field trip?', chunks: ['I learned', 'how', 'scientists', 'collect', 'soil samples', 'in the field'], end: '.',
explain: 'Mệnh đề danh từ "how + S + V" làm tân ngữ của "learned". "in the field" = ngoài thực địa, đứng cuối câu.' },
]);

/* ===================================================================
* WRITING · Write an Email
* =================================================================== */
TF.writing.push({
id: 'tf7-em1', set: 1, task: 'email', title: 'Asking for a Recommendation Letter', minutes: 7,
scenario: 'You are applying for a summer research program, and the application requires a letter from a professor who knows your work. You took two courses with Professor Reyes and did well in both.',
to: 'Professor Reyes',
points: ['Explain why you are writing.', 'Describe why you think she is a good person to ask.', 'Give the deadline and offer to send any materials she needs.'],
model: 'Dear Professor Reyes,\n\nI hope you are well. I am writing to ask whether you would be willing to write a recommendation letter for my application to the Summer Research Program at the Coastal Institute.\n\nI took your courses in Ecology and Statistics last year, and I believe you know my work well. In particular, my final project on river pollution was one you commented on in detail, and I have continued to develop that research since then.\n\nThe deadline for the letter is March 15. I would be happy to send you my résumé, my personal statement, and a short summary of the project to make the process easier.\n\nThank you very much for considering my request.\n\nSincerely,\nAn Pham',
checklist: ['Nêu mục đích viết thư ngay đoạn đầu', 'Giải thích vì sao giáo sư là người phù hợp (khóa học, dự án cụ thể)', 'Nêu hạn nộp và đề nghị gửi tài liệu hỗ trợ', 'Lịch sự: "Would you be willing to…", "I would be happy to…"', 'Có lời cảm ơn và ký tên', 'Khoảng 120–180 từ'],
tips: 'Thư xin giới thiệu nên làm giáo sư dễ nhận lời: nêu cụ thể mối quan hệ học thuật, hạn chót rõ ràng và tài liệu bạn sẽ chuẩn bị sẵn.',
});
TF.writing.push({
id: 'tf7-em2', set: 2, task: 'email', title: 'Noise from Construction Near the Library', minutes: 7,
scenario: 'Construction work next to the main library has been very loud every morning for two weeks. You and other students find it impossible to concentrate during exam preparation.',
to: 'the Facilities Office',
points: ['Describe the problem.', 'Explain how it affects students.', 'Suggest a reasonable solution.'],
model: 'Dear Facilities Office,\n\nI am a third-year student, and I am writing about the construction next to the main library. For the past two weeks, drilling and hammering have started at 8 a.m. and continued until noon.\n\nThis is a serious problem during exam season. The library\'s quiet floors are the best place to study, but the noise comes through the windows, and many students have told me they cannot concentrate. Some have started leaving early or moving to cafés, which costs money.\n\nI understand that the building work is necessary. Perhaps the loudest tasks could be scheduled for the afternoon, when fewer students are studying, or the library could provide free earplugs and open a temporary study room in the Student Union.\n\nThank you for looking into this.\n\nSincerely,\nDavid Lee',
checklist: ['Mô tả vấn đề cụ thể (ở đâu, từ khi nào, giờ nào)', 'Nêu tác động lên sinh viên bằng ví dụ', 'Thể hiện sự thấu hiểu ("I understand that…") trước khi đề xuất', 'Đề xuất giải pháp khả thi, có thể hơn một cách', 'Giọng điệu lịch sự, mang tính xây dựng', 'Khoảng 120–180 từ'],
tips: 'Khi phản ánh, hãy nêu số liệu nhỏ (hai tuần, 8 giờ đến trưa) để vấn đề nghe có thật và đáng giải quyết; kết thư bằng đề xuất thay vì than phiền.',
});
TF.writing.push({
id: 'tf8-em1', set: 3, task: 'email', title: 'Changing Your Laboratory Section', minutes: 7,
scenario: 'You were placed in a chemistry lab section that meets on Thursday afternoons, but you recently started a part-time job that begins at 3 p.m. on Thursdays. Other sections still have space.',
to: 'Dr. Okafor, the lab coordinator',
points: ['Explain the schedule conflict.', 'Describe what you have already tried.', 'Ask politely for a specific change.'],
model: 'Dear Dr. Okafor,\n\nI am a student in Chemistry 102, and I am writing to ask about changing my laboratory section. I am currently in the Thursday 2 p.m. section, but I recently began a part-time job at the campus bookstore, and my shift starts at 3 p.m. on Thursdays.\n\nI spoke with my supervisor, but she could not move my shift because that is the busiest time of the week. I also checked the registration system and saw that the Tuesday 10 a.m. section still has several open places.\n\nWould it be possible for you to transfer me to that section? I can attend the first meeting this Tuesday if the change is approved in time. I would be grateful for your help.\n\nThank you for your time.\n\nBest regards,\nNina Alvarez',
checklist: ['Nêu rõ môn học, nhóm hiện tại và lý do xung đột lịch', 'Cho biết đã thử giải quyết gì (nói với quản lý, kiểm tra hệ thống)', 'Đề nghị cụ thể: nhóm nào, thời điểm nào', 'Dùng câu hỏi lịch sự "Would it be possible…?"', 'Có lời cảm ơn, ký tên', 'Khoảng 120–180 từ'],
tips: 'Yêu cầu càng cụ thể (đúng nhóm, đúng giờ) thì người nhận càng dễ đồng ý. Việc cho thấy bạn đã tự thử giải quyết cũng tạo thiện cảm.',
});
TF.writing.push({
id: 'tf8-em2', set: 4, task: 'email', title: 'Proposing a New Student Club', minutes: 7,
scenario: 'You and several classmates want to start a photography club at your university, but you need approval and a small room for weekly meetings.',
to: 'Mr. Brooks, Director of Student Activities',
points: ['Introduce the idea for the club.', 'Explain how the club would benefit students.', 'Ask for what you need and offer to meet.'],
model: 'Dear Mr. Brooks,\n\nMy name is Hana Kim, and I am writing on behalf of a group of eleven students who would like to start a photography club on campus.\n\nOur club would meet once a week to share photos, practice new techniques, and plan outings around the city. We believe it would help students relax, make friends outside their majors, and develop a useful creative skill. We also plan to organize an exhibition at the end of each semester so that the whole university can enjoy our work.\n\nTo begin, we would need official approval and a classroom for one hour on Wednesday evenings. We would be glad to meet with you at any time to explain our plan in more detail.\n\nThank you for your consideration.\n\nSincerely,\nHana Kim',
checklist: ['Giới thiệu bản thân và ý tưởng ngay đầu thư', 'Nêu lợi ích cho sinh viên (kết bạn, kỹ năng, triển lãm)', 'Nêu rõ nhu cầu cụ thể (phê duyệt, phòng, giờ)', 'Đề nghị gặp trực tiếp', 'Giọng văn trang trọng, tích cực', 'Khoảng 120–180 từ'],
tips: 'Thư đề xuất nên trả lời hai câu hỏi của người duyệt: "Điều này có ích cho sinh viên không?" và "Cần gì từ nhà trường?". Hãy nêu cả hai thật rõ.',
});
TF.writing.push({
id: 'tf9-em1', set: 5, task: 'email', title: 'Explaining a Missed Midterm Exam', minutes: 7,
scenario: 'You missed your history midterm exam yesterday because you had a high fever and went to the health center. You have a doctor\'s note from the health center.',
to: 'Professor Lang',
points: ['Explain why you missed the exam.', 'Say what documents you can provide.', 'Ask about taking a make-up exam.'],
model: 'Dear Professor Lang,\n\nI am writing to apologize for missing the History 140 midterm exam yesterday morning. I woke up with a high fever and felt too weak to leave my room, so I went to the campus health center instead.\n\nThe doctor there gave me a note confirming that I was ill and advised me to rest for two days. I have attached a copy to this email, and I can bring the original to your office hours if you would like to see it.\n\nWould it be possible to take a make-up exam? I am free on Monday and Tuesday afternoons, and I have already reviewed all of the material, so I can take the exam as soon as it is convenient for you.\n\nThank you for your understanding.\n\nSincerely,\nTom Becker',
checklist: ['Xin lỗi ngắn gọn và nêu lý do vắng mặt', 'Nhắc đến giấy tờ (giấy khám) và cách cung cấp', 'Hỏi về bài thi bù một cách lịch sự', 'Nêu thời gian rảnh để giảng viên dễ sắp xếp', 'Có lời cảm ơn và ký tên', 'Khoảng 120–180 từ'],
tips: 'Với giảng viên, hãy nêu lý do thật ngắn gọn, đính kèm bằng chứng, rồi tập trung vào giải pháp (thi bù) cùng lịch rảnh của bạn.',
});
TF.writing.push({
id: 'tf9-em2', set: 6, task: 'email', title: 'Asking the Career Center about Internships', minutes: 7,
scenario: 'You are a second-year business student and want to find a summer internship, but you do not know how to start. Your university has a career center.',
to: 'the Career Center',
points: ['Introduce yourself and your goal.', 'Explain what you have already done.', 'Ask for specific help.'],
model: 'Dear Career Center,\n\nMy name is Lucas Meyer, and I am a second-year business student. I am writing because I would like to find an internship for next summer, preferably in marketing.\n\nSo far, I have updated my résumé and created a profile on the university job website, but I have not received any replies. I am not sure whether my résumé is strong enough or whether I should be applying in a different way.\n\nCould I make an appointment with an advisor to review my résumé and discuss which companies hire interns in marketing? I am available on Tuesday and Thursday afternoons. I would also welcome any information about workshops on interviewing.\n\nThank you for your help.\n\nBest regards,\nLucas Meyer',
checklist: ['Giới thiệu bản thân, ngành học và mục tiêu', 'Kể những việc đã làm (cập nhật CV, tạo hồ sơ)', 'Yêu cầu giúp đỡ cụ thể (hẹn gặp cố vấn, xem CV)', 'Nêu lịch rảnh', 'Giọng văn lịch sự, chuyên nghiệp', 'Khoảng 120–180 từ'],
tips: 'Hãy cho thấy bạn đã chủ động thử trước rồi mới nhờ giúp; nhờ vả cụ thể ("xem CV", "gặp cố vấn") được phản hồi nhanh hơn "tôi cần giúp tìm việc".',
});

/* ===================================================================
* WRITING · Write for an Academic Discussion
* =================================================================== */
TF.writing.push({
id: 'tf7-ad1', set: 1, task: 'discussion', title: 'Should Museums Be Free?', minutes: 10,
professor: { name: 'Professor Haddad', text: 'In our unit on arts and public life, we are discussing access to culture. Some cities make public museums free for everyone, paying for them with taxes. Others charge admission so that visitors, rather than all taxpayers, cover the costs. Which approach do you think is better, and why?' },
students: [
{ name: 'Elena', text: 'Museums should be free. Culture is part of education, and ticket prices keep out families with low incomes. Everyone should have the chance to see great art.' },
{ name: 'Jamal', text: 'I think a small fee is fair. Free entry does not mean free costs, and people value what they pay for. The money can also help museums buy and protect new works.' },
],
model: 'I agree with Elena that museums should be open to everyone, but Jamal is right that they need reliable income. The best solution may be free admission on certain days or for certain groups, such as students and children, while other visitors pay a small fee. For example, many museums are free on the first Sunday of the month, and this brings in people who would otherwise never visit. In this way, families with low incomes can enjoy the collection, and the museum still receives money from visitors who can afford a ticket. A mixed system protects both access and quality.',
checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Phản hồi ý của Elena và Jamal', 'Đưa ra ý mới: giải pháp kết hợp', 'Có ví dụ cụ thể (miễn phí ngày đầu tháng)', 'Tối thiểu khoảng 100 từ, câu đa dạng', 'Câu kết tóm lại lập trường'],
tips: 'Khi hai bạn đối lập, một giải pháp dung hòa có ví dụ thực tế thường thuyết phục hơn việc chọn hẳn một phía.',
});
TF.writing.push({
id: 'tf7-ad2', set: 2, task: 'discussion', title: 'Nuclear Energy and Climate Change', minutes: 10,
professor: { name: 'Dr. Sato', text: 'In our environmental science course, we have been studying ways to reduce carbon emissions. Some experts say countries should build more nuclear power plants because they produce large amounts of electricity without burning fossil fuels. Others worry about safety, cost, and radioactive waste, and prefer solar and wind power. What is your view?' },
students: [
{ name: 'Priya', text: 'Nuclear power is necessary. Solar and wind do not work when the weather is bad, but nuclear plants run all day and night. We cannot reach climate goals without them.' },
{ name: 'Marcus', text: 'I disagree. Nuclear plants take many years and billions of dollars to build, and nobody has solved the problem of waste. Renewable energy is cheaper and growing fast.' },
],
model: 'Both students raise important points, but I think the strongest plan combines the two. Marcus is right that nuclear plants are expensive and slow to build, so most new investment should go to wind and solar. However, Priya\'s point about reliability matters, because a power grid needs electricity on cloudy, windless days. Rather than building many new reactors, countries could keep their existing plants running safely while they develop better batteries. This would reduce emissions now, and it would give time to find long-term solutions for waste.',
checklist: ['Nêu rõ quan điểm', 'Nhắc và phản hồi cả Priya lẫn Marcus', 'Có ý mới (giữ nhà máy hiện có, phát triển pin lưu trữ)', 'Lập luận có logic: chi phí, độ tin cậy, chất thải', 'Từ nối: However, Rather than, This would…', 'Khoảng 100 từ trở lên'],
tips: 'Với đề khoa học – chính sách, hãy cân nhắc ít nhất hai tiêu chí (chi phí, độ tin cậy) thay vì chỉ nói "tốt" hay "xấu".',
});
TF.writing.push({
id: 'tf8-ad1', set: 3, task: 'discussion', title: 'Learning History: Dates or Stories?', minutes: 10,
professor: { name: 'Professor Walker', text: 'This week we are looking at how history should be taught. Some teachers say students need to memorize key dates and events so that they have a shared factual base. Others say history is best learned through personal stories and primary sources, such as letters and diaries. Which approach do you think helps students learn more, and why?' },
students: [
{ name: 'Chloe', text: 'Stories work better for me. When I read a soldier\'s letter, I remembered the war for years. A list of dates is forgotten after the exam.' },
{ name: 'Ahmed', text: 'You still need the facts. Without knowing when and in what order things happened, stories do not make sense, and it is easy to misunderstand the past.' },
],
model: 'I think stories help students care about history, but Ahmed is right that facts give those stories a frame. A student who reads a farmer\'s diary from 1930 will understand it much better if she already knows about the economic crisis of that decade. So I would teach the main dates briefly at the beginning of a unit and then use letters and diaries to explore them in depth. Chloe\'s experience shows that personal sources make memory last, while Ahmed\'s concern reminds us that stories alone can mislead. Combining both gives students knowledge and understanding.',
checklist: ['Nêu quan điểm rõ', 'Phản hồi cả Chloe và Ahmed', 'Đưa ra ý mới (dạy mốc chính trước, rồi dùng nguồn cá nhân)', 'Có ví dụ cụ thể (nhật ký người nông dân)', 'Câu đa dạng, từ nối tốt', 'Khoảng 100 từ trở lên'],
tips: 'Ví dụ cụ thể (một cuốn nhật ký, một thập niên) làm lập luận trừu tượng trở nên thuyết phục; hãy gắn ví dụ vào ý chính của bạn.',
});
TF.writing.push({
id: 'tf8-ad2', set: 4, task: 'discussion', title: 'AI Tools in Writing Classes', minutes: 10,
professor: { name: 'Dr. Morgan', text: 'Many students now use AI writing assistants. Some instructors allow them for brainstorming and grammar checks, while others ban them completely because they believe students should develop their own writing skills. What rule would you recommend for writing classes, and why?' },
students: [
{ name: 'Sofia', text: 'I think they should be banned. If a tool writes the sentences, students never learn to organize their own ideas, and grades stop meaning anything.' },
{ name: 'Daniel', text: 'A complete ban is unrealistic. Professionals use these tools every day, so students should learn to use them well, as long as they are honest about it.' },
],
model: 'I agree with Daniel that a complete ban is unrealistic, but Sofia\'s concern about learning is serious. A sensible rule would separate the stages of writing. Students could use an assistant to find ideas or check grammar after they have written a draft, but the first draft and the final argument should be their own work. Teachers could also ask students to explain their choices in class, which shows whether they truly understand the text. This keeps the benefits of the technology while protecting the skills that writing courses are meant to teach.',
checklist: ['Nêu rõ quy tắc đề xuất', 'Phản hồi Sofia và Daniel', 'Ý mới: phân tách các giai đoạn viết, giải thích trên lớp', 'Lập luận mạch lạc', 'Từ nối: but, Could, This keeps…', 'Khoảng 100 từ trở lên'],
tips: 'Đề "nên đặt quy tắc gì" cần một đề xuất cụ thể (ai làm gì, lúc nào), không chỉ ủng hộ hay phản đối.',
});
TF.writing.push({
id: 'tf9-ad1', set: 5, task: 'discussion', title: 'Should Cities Ban Cars from Downtown?', minutes: 10,
professor: { name: 'Professor Ito', text: 'In our urban sociology unit, we are discussing the future of city centers. Some cities have banned private cars from their downtown areas to reduce pollution and make streets safer. Business owners often worry that customers will stay away. Do you think cities should ban cars from downtown? Why or why not?' },
students: [
{ name: 'Grace', text: 'Yes. Streets without cars are quieter and cleaner, and people walk more. Shops often do better when people can stroll instead of rushing past.' },
{ name: 'Omar', text: 'It is not that simple. Elderly and disabled people may not be able to walk far, and delivery workers need access. A ban could make downtown harder to reach.' },
],
model: 'Grace is right that a car-free center can be pleasant and healthy, but Omar identifies a problem that cities must solve. Rather than a complete ban, I would suggest limiting private cars while keeping access for buses, taxis, deliveries at early hours, and drivers with disabilities. For instance, a city could create a few car-free streets first and measure the effect on shops and air quality before expanding. If the results are positive, more streets could follow. This gradual approach would reduce pollution without leaving anyone behind.',
checklist: ['Nêu quan điểm (cấm một phần, có ngoại lệ)', 'Phản hồi Grace và Omar', 'Ý mới: thí điểm từng đoạn phố và đo kết quả', 'Ví dụ cụ thể về ngoại lệ (xe buýt, người khuyết tật)', 'Câu đa dạng, từ nối rõ ràng', 'Khoảng 100 từ trở lên'],
tips: 'Với vấn đề chính sách, đề xuất lộ trình từng bước (thí điểm → đo → mở rộng) cho thấy tư duy thực tế và thường được đánh giá cao.',
});
TF.writing.push({
id: 'tf9-ad2', set: 6, task: 'discussion', title: 'Is Studying Abroad Worth the Cost?', minutes: 10,
professor: { name: 'Dr. Fernandez', text: 'Our class is discussing international education. Studying abroad for a semester can be expensive, and some students worry that it delays their graduation. Supporters say it builds independence and language skills. Do you think universities should encourage all students to study abroad? Explain your opinion.' },
students: [
{ name: 'Lena', text: 'Absolutely. Living in another country taught me to solve problems alone and made my language skills much stronger. It changed how I see the world.' },
{ name: 'Victor', text: 'It is a great experience, but not everyone can afford it. Encouraging everybody may put pressure on students who have no money or family duties at home.' },
],
model: 'Lena describes real benefits, and Victor is right that cost is a barrier. I think universities should encourage studying abroad but not treat it as an expectation for everyone. They can offer scholarships, short summer programs, and exchange agreements with cheaper partner universities. For students who cannot travel, schools could create virtual exchange projects with classes overseas, which provide some intercultural experience at almost no cost. In this way, the opportunity grows without creating pressure on those with limited money or time.',
checklist: ['Nêu quan điểm rõ ràng', 'Phản hồi Lena và Victor', 'Ý mới: chương trình hè, trao đổi ảo', 'Lập luận về chi phí và công bằng', 'Từ nối: In this way, For students who…', 'Khoảng 100 từ trở lên'],
tips: 'Thừa nhận lợi ích của một bên và mối lo của bên kia, rồi đưa phương án giải quyết cả hai, là khuôn mẫu an toàn cho dạng bài này.',
});

/* ===================================================================
* SPEAKING · Listen and Repeat (bộ 7)
* =================================================================== */
TF.speaking.push({
id: 'tf7-rp1', set: 5, task: 'repeat', title: 'Art Gallery Docent', accent: 'en-US',
context: 'You are a volunteer guide at a small art gallery. Listen to the curator and repeat exactly what you hear.',
sentences: [
{ t: 'Good morning, and welcome to the gallery.', tip: 'Nối âm "Good morning" /gʊdˈmɔːrnɪŋ/; nhấn "WEL" trong welcome.' },
{ t: 'This painting was created in nineteen twenty.', tip: 'Đọc năm "nineteen twenty"; nhấn "NINEteen" và "TWENty".' },
{ t: 'The artist used only three colors.', tip: 'Âm /θ/ trong "three": đầu lưỡi giữa hai răng; "colors" /ˈkʌlərz/.' },
{ t: 'Please do not touch the sculptures.', tip: '"sculptures" /ˈskʌlptʃərz/; nhấn mạnh "NOT" để giữ ý cấm.' },
{ t: 'The exhibit about ancient pottery is on the lower level.', tip: '"exhibit" /ɪɡˈzɪbɪt/; nhấn "POTtery" và "LOWer LEVel".' },
{ t: 'Guests are welcome to take photographs without flash.', tip: 'Nhấn âm đầu "PHOtographs" /ˈfoʊtəɡræfs/; nối "without flash" thành một cụm.' },
{ t: 'If you would like to learn more, a guided tour starts every hour on the hour.', tip: 'Ngắt nhịp sau "more,"; "on the hour" đọc liền /ɒnðiˈaʊər/.' },
],
});
TF.speaking.push({
id: 'tf7-rp2', set: 6, task: 'repeat', title: 'Lab Safety Instructor', accent: 'en-GB',
context: 'You are attending a laboratory safety briefing. Listen to the instructor and repeat exactly what you hear.',
sentences: [
{ t: 'Please put on your safety glasses.', tip: 'Cụm "put on" nối âm /pʊtɒn/; nhấn "SAFety GLASSes".' },
{ t: 'Never taste any chemical in the lab.', tip: 'Nhấn "NEver"; "chemical" /ˈkemɪkəl/, âm /k/ đầu.' },
{ t: 'Tie back long hair before you begin.', tip: 'Âm /aɪ/ trong "tie"; nối "back long" nhẹ và rõ.' },
{ t: 'If you spill anything, tell me right away.', tip: 'Ngữ điệu lên ở "anything," rồi xuống ở cuối câu; "right away" đọc liền.' },
{ t: 'The fire extinguisher is located next to the door.', tip: '"extinguisher" /ɪkˈstɪŋɡwɪʃər/; nhấn "exTINguisher" và "loCAted".' },
{ t: 'Wash your hands thoroughly after handling any samples.', tip: '"thoroughly" /ˈθʌrəli/ – âm /θ/ đầu; nhấn "HANdling".' },
{ t: 'In an emergency, leave the room calmly and gather in the parking area outside.', tip: 'Chia nhịp: "In an emergency, / leave the room calmly / and gather in the parking area outside".' },
],
});
TF.speaking.push({
id: 'tf7-rp3', set: 1, task: 'repeat', title: 'Study Abroad Advisor', accent: 'en-US',
context: 'You are visiting the study abroad office. Listen to the advisor and repeat exactly what you hear.',
sentences: [
{ t: 'Thanks for stopping by the office.', tip: '"Thanks" /θæŋks/ – âm /θ/; "stopping by" nối nhẹ.' },
{ t: 'Applications are due on October first.', tip: '"due" /duː/; ngày tháng "October FIRST" nhấn thứ tự "first".' },
{ t: 'You will need a valid passport and a letter of acceptance.', tip: '"valid" /ˈvælɪd/ nhấn âm đầu; "letter of" nối /ˈletərəv/.' },
{ t: 'Most exchange programs last for one semester.', tip: '"exchange" /ɪksˈtʃeɪndʒ/; nhấn "EXchange PROgrams" và "SeMESter".' },
{ t: 'Scholarships are available for students with strong grades.', tip: '"scholarships" /ˈskɑːlərʃɪps/ nhấn âm đầu; "strong grades" hai phụ âm đầu liền.' },
{ t: 'You should also check whether your credits will transfer to this university.', tip: '"whether" /ˈweðər/ có /ð/; "credits will transfer" nhấn "CREDits" và "transFER" (động từ).' },
{ t: 'I strongly recommend meeting with your academic advisor before you submit the form.', tip: 'Câu dài: "I strongly recommend / meeting with your academic advisor / before you submit the form".' },
],
});

/* ===================================================================
* SPEAKING · Take an Interview (bộ 7)
* =================================================================== */
TF.speaking.push({
id: 'tf7-iv1', set: 2, task: 'interview', title: 'Learning a New Skill', seconds: 45, accent: 'en-GB',
context: 'A researcher is interviewing students about learning new skills. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'To begin, what is one new skill you have learned recently?',
model: 'Recently I learned to cook simple meals. I started because eating out was getting expensive. Now I can make about ten dishes.',
tip: 'Nêu một kỹ năng cụ thể, lý do bắt đầu và kết quả hiện tại. Ba câu ngắn là đủ cho phần mở đầu.' },
{ q: 'How did you learn it, and what was the most difficult part?',
model: 'I watched online videos and practiced every evening. The hardest part was timing, because things burned when I was not careful. Over time I learned to plan each step.',
tip: 'Trả lời cả hai vế: cách học và khó khăn. Dùng "The hardest part was…" rồi kể cách vượt qua.' },
{ q: 'Some people learn best by studying alone, while others prefer learning in a group. Which do you prefer?',
model: 'I prefer a mix. I like to study alone first, so I can go at my own speed. Then I practice with friends, because they notice mistakes I miss.',
tip: 'Câu hỏi lựa chọn: có thể chọn "kết hợp" nếu giải thích rõ lý do cho từng phần.' },
{ q: 'If your university offered a free class on any skill, which one should it be, and why?',
model: 'I think it should be a class on managing money. Many students struggle with budgets for the first time. A short course could prevent a lot of stress.',
tip: 'Đề xuất một lớp cụ thể, nêu vấn đề nó giải quyết và lợi ích. Dùng "I think it should…", "could prevent…".' },
],
});

})(self);
