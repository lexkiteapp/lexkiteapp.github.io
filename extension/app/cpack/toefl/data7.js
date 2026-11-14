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
