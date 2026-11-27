/* TOEFL iBT (định dạng từ 21/01/2026) – bổ sung 5: Listening bổ sung cho bộ 1–3 (đủ 47 câu/bộ). Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
* Nạp SAU data1–4.js: chỉ BỔ SUNG vào window.TOEFL, cùng định dạng. Câu n = 33–47 của mỗi bộ (sau 32 câu có sẵn). */
(function (g) {
const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });
const mcq = (instr, items) => ({ type: 'mcq', instr, items });
const Q = (n, q, options, cue, explain) => ({ n, q, options, a: 0, cue, explain });
const S2 = (a, b) => ({ S: { name: a[0], accent: a[1], gender: a[2] }, P: { name: b[0], accent: b[1], gender: b[2] } });
const A1 = (name, accent, gender) => ({ A: { name, accent, gender } });
const say = t => ({ say: t }), pz = { pause: 1 };
const L = (s, t) => ({ s, t });

/* ============================ BỘ 1 ============================ */
TF.listening.push({
id: 'tf1-lc3', set: 1, task: 'conversation', title: 'Joining a Study Group',
speakers: S2(['Student (Lena)', 'en-US', 'f'], ['Student (Omar)', 'en-GB', 'm']),
script: [
say('Listen to a conversation between two students.'), pz,
L('S', 'Hey Omar, I saw your note on the board. You\'re starting a study group for statistics?'),
L('P', 'Yes! The midterm is in three weeks, and I\'d rather not cram alone. Do you want to join?'),
L('S', 'Definitely. When do you meet?'),
L('P', 'Right now, Tuesday and Thursday evenings at seven. But we haven\'t found a room yet. The library study rooms are fully booked until next month.'),
L('S', 'What about the basement lounge in my dorm? Nobody uses it after six, and it has a big whiteboard.'),
L('P', 'That would be perfect. Is it open to people who don\'t live there?'),
L('S', 'You just have to sign in at the front desk. I can put everyone\'s names on a list so it takes a minute.'),
L('P', 'Great. One more thing: I\'d like each person to prepare one practice problem to explain to the group. Teaching something is the best way to find out whether you really understand it.'),
L('S', 'Good idea. I\'ll bring my laptop, too, in case we want to run the examples in the software.'),
],
groups: [mcq('Answer the questions about the conversation.', [
Q(33, 'Why is Omar starting a study group?', ['He wants to avoid studying for the midterm alone.', 'Professor asked him to lead one, assuming his GPA would aid.', 'He needs help finding a tutor for the statistics portion.', 'He missed several statistics classes because he was abroad.'], 'rather not cram alone', 'Dạng REASON. Omar nói anh "rather not cram alone" (không muốn học nhồi một mình) trước kỳ thi giữa kỳ, nên lập nhóm để học cùng. Không có ai yêu cầu anh dẫn nhóm, nên các phương án còn lại sai.'),
Q(34, 'What problem do the students have at the beginning?', ['They have no room to meet in yet.', 'They cannot agree on a meeting time.', 'They do not have enough members.', 'They have lost the practice problems.'], 'haven\'t found a room yet', 'Dạng DETAIL. Omar thừa nhận "we haven\'t found a room yet" vì phòng thư viện đã kín chỗ → chưa có phòng. Giờ họp đã được chốt, nên phương án về giờ giấc sai.'),
Q(35, 'What does Lena suggest?', ['Using the lounge in her dormitory', 'Booking a room in the library next month', 'Meeting in a classroom after lectures', 'Moving the group to the weekend'], 'basement lounge in my dorm', 'Dạng DETAIL. Lena đề nghị "the basement lounge in my dorm" (phòng sinh hoạt tầng hầm ký túc xá), nơi vắng người sau 6 giờ và có bảng trắng lớn.'),
Q(36, 'What must people who do not live in the dorm do to use the lounge?', ['Sign in at the front desk', 'Pay a small fee', 'Ask a resident adviser for a key', 'Make a reservation online'], 'sign in at the front desk', 'Dạng DETAIL. Lena nói người ở ngoài "just have to sign in at the front desk" (chỉ cần đăng ký ở quầy lễ tân), và cô sẽ lập sẵn danh sách tên. Không nhắc đến phí hay chìa khóa.'),
Q(37, 'Why does Omar want each person to explain a practice problem?', ['Teaching shows whether someone truly understands the topic.', 'It will shorten each meeting by letting members focus on one example', 'The professor requires it because it fits the course\'s goals', 'It helps the group choose a leader by showing who can explain problems'], 'best way to find out whether you really understand it', 'Dạng REASON. Omar nói dạy lại cho người khác là "the best way to find out whether you really understand it" → kiểm tra mình có hiểu thật không. Phần này không nhắc đến giáo sư hay việc chọn trưởng nhóm.'),
])],
});
TF.listening.push({
id: 'tf1-la3', set: 1, task: 'announcement', title: 'Campus Recycling Week',
speakers: A1('Announcer', 'en-GB', 'f'),
script: [
say('Listen to an announcement on a university campus.'), pz,
L('A', 'Attention, students. Next week is Recycling Week, and the Sustainability Office has planned several activities.'),
L('A', 'On Monday, new colour-coded bins will appear in every residence hall. Blue bins are for paper and cardboard, green bins are for plastic and cans, and food waste goes into the brown bins.'),
L('A', 'On Wednesday, you can bring broken electronics to the Student Union lobby. Technicians will repair what they can, and the rest will be sent to a company that recycles the metals inside.'),
L('A', 'Finally, the residence hall that collects the most recyclable material per student by Friday will win a pizza party. Results will be posted on the Sustainability Office website, so check back often. Thank you for helping keep our campus clean.'),
],
groups: [mcq('Answer the questions about the announcement.', [
Q(38, 'What is the announcement mainly about?', ['A week of recycling activities on campus', 'A change in the schedule for waste collection', 'A new recycling company hired by the university', 'A repair service for student laptops'], 'Next week is Recycling Week', 'Dạng MAIN IDEA. Người thông báo mở đầu bằng "Next week is Recycling Week" rồi liệt kê nhiều hoạt động → chủ đề chính là tuần lễ tái chế. Các phương án khác chỉ là chi tiết sai hoặc không được nhắc.'),
Q(39, 'What goes into the green bins?', ['Plastic and cans', 'Paper and cardboard', 'Food waste', 'Old electronics'], 'green bins are for plastic and cans', 'Dạng DETAIL. Người nói nêu rõ "green bins are for plastic and cans" → thùng xanh lá đựng nhựa và lon. Giấy là thùng xanh dương, thức ăn thừa là thùng nâu.'),
Q(40, 'What will happen to electronics that cannot be repaired?', ['The metals inside them will be recycled.', 'They will be donated to students.', 'They will be thrown away on campus.', 'They will be returned to their owners.'], 'recycles the metals inside', 'Dạng DETAIL. Kỹ thuật viên sửa những gì sửa được, phần còn lại gửi cho công ty "that recycles the metals inside" → kim loại bên trong được tái chế. Không nói tặng sinh viên hay vứt bỏ.'),
Q(41, 'How can a residence hall win the pizza party?', ['By collecting the most recyclable material per student', 'By using the fewest bins for waste type during recycling week.', 'By holding the biggest event during recycling week.', 'By reporting the most broken electronics for repair by Friday.'], 'most recyclable material per student', 'Dạng DETAIL. Giải thưởng thuộc về ký túc xá thu gom "the most recyclable material per student by Friday" (nhiều vật liệu tái chế nhất tính theo đầu sinh viên). Quy mô tổng của ký túc xá không quan trọng.'),
])],
});
TF.listening.push({
id: 'tf1-lt3', set: 1, task: 'talk', title: 'Geology: How Caves Form',
speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'm' } },
script: [
say('Listen to part of a talk in a geology class.'), pz,
L('P', 'Let\'s turn to caves. Many of the largest caves in the world formed in limestone, and the surprising part is that the main tool is not a river or a tunnel-digging animal. It is slightly acidic water.'),
L('P', 'Here is how it works. Rain absorbs a little carbon dioxide from the air and from the soil, which makes it a weak acid. As this water seeps down through cracks in limestone, it slowly dissolves the rock.'),
L('P', 'At first the cracks are tiny. But the more water flows through, the wider they become, and wider cracks allow even more water to pass. This process can continue for hundreds of thousands of years until a large passage has opened up.'),
L('P', 'Interestingly, most of this dissolving happens below the water table, where the rock is completely underwater. Only later, when the water level drops, does the passage fill with air and become a cave we can walk through.'),
L('P', 'And then a second process begins. Water dripping from the ceiling carries dissolved minerals. When a drop hangs there, a little carbon dioxide escapes and a tiny ring of mineral is left behind. Over thousands of years, those rings build the icicle-shaped formations called stalactites.'),
L('P', 'Notice the pattern: the same chemistry that carves a cave also decorates it, just in reverse. Next time, we will look at the cave systems of Kentucky.'),
],
groups: [mcq('Answer the questions about the talk.', [
Q(42, 'What is the talk mainly about?', ['How caves are formed and decorated by water', 'Why limestone is a valuable building material', 'How animals use caves as shelter', 'The history of cave exploration'], 'slightly acidic water', 'Dạng MAIN IDEA. Giáo sư giải thích nước có tính axit hòa tan đá vôi tạo thành hang động, rồi sau đó tạo nhũ đá bên trong → chủ đề là cách hang được hình thành và trang trí bởi nước.'),
Q(43, 'According to the professor, how does rain become able to dissolve limestone?', ['It absorbs carbon dioxide and becomes a weak acid.', 'It is heated by underground rocks, raising water temperature', 'It mixes with salt from the ocean, a brine that erodes rock', 'It freezes and expands inside cracks, forcing the rock apart'], 'makes it a weak acid', 'Dạng DETAIL. Nước mưa hấp thụ khí CO2 từ không khí và đất, điều đó "makes it a weak acid" (biến nó thành axit yếu) nên hòa tan được đá. Các cơ chế khác không được nhắc.'),
Q(44, 'Why do cracks in limestone grow wider over time?', ['More flowing water dissolves more of the rock.', 'Frequent regional earthquakes break the solid stone into smaller pieces.', 'Small tunnel-digging animals widen them while searching for shelter.', 'The surface rock becomes much softer during extremely cold winter weather.'], 'the more water flows through, the wider they become', 'Dạng CAUSE. Bài giảng giải thích: "the more water flows through, the wider they become, and wider cracks allow even more water to pass" → nước chảy qua càng nhiều thì đá càng bị hòa tan.'),
Q(45, 'When does most of the dissolving take place?', ['While the rock is completely underwater', 'After the cave has filled with air in spring', 'During the dry season only, when water is scarce', 'When the cave is open to visitors on weekends'], 'below the water table', 'Dạng DETAIL. Ông nói phần lớn quá trình hòa tan xảy ra "below the water table, where the rock is completely underwater" → khi đá hoàn toàn ngập nước. Các phương án khác không có trong bài.'),
Q(46, 'How do stalactites form?', ['Minerals are left behind as water drips from the ceiling.', 'Pieces of the ceiling fall and harden, forming stalagmites on the floor.', 'Rivers deposit sand and sediments that accumulate in the cave.', 'Animals leave minerals on the rock as they crawl and secrete fluids.'], 'a tiny ring of mineral is left behind', 'Dạng PROCESS. Nước nhỏ giọt từ trần mất bớt CO2 và để lại "a tiny ring of mineral" (một vòng khoáng chất nhỏ), tích tụ qua hàng nghìn năm thành nhũ đá. Cát, động vật hay trần rơi xuống đều sai.'),
Q(47, 'What does the professor imply when he says the chemistry decorates the cave "just in reverse"?', ['Cave formation removes rock, while decoration adds mineral.', 'Decorations form faster than the cave itself, since mineral layers appear', 'Stalactites dissolve the limestone below them, slowly widening drip path', 'Cave decoration happens before the passage opens, implying minerals settle'], 'just in reverse', 'Dạng INFERENCE. Hòa tan làm hang hình thành bằng cách lấy bớt đá; về sau nước nhỏ giọt lại lắng đọng khoáng chất → cùng một hóa học nhưng tác dụng ngược chiều. Các phương án còn lại trái với bài giảng.'),
])],
});

/* ============================ BỘ 2 ============================ */
TF.listening.push({
id: 'tf2-lc3', set: 2, task: 'conversation', title: 'A Problem with a Course Registration',
speakers: S2(['Student (Priya)', 'en-US', 'f'], ['Registrar staff', 'en-US', 'm']),
script: [
say('Listen to a conversation between a student and a staff member in the registrar\'s office.'), pz,
L('S', 'Hi, I\'m trying to register for a second-year chemistry course, but the system keeps saying I haven\'t met the requirements.'),
L('P', 'Let me look at your record. Which course is it?'),
L('S', 'Organic Chemistry. I took the introductory course last year at a community college before I transferred here.'),
L('P', 'I see the problem. Your credits from the community college were transferred, but the department hasn\'t approved them as equal to our introductory course yet.'),
L('S', 'Oh no. Does that mean I can\'t take Organic Chemistry this term? The class fills up fast, and I need it to stay on schedule for my major.'),
L('P', 'Not necessarily. If the department approves your credits this week, the system will let you register automatically. I\'d suggest emailing the department adviser today and attaching your syllabus from the community college.'),
L('S', 'I think I still have that. Is there anything else I can do?'),
L('P', 'You can add yourself to the waiting list now. It won\'t guarantee a spot, but it holds your place in line while you wait for the approval.'),
L('S', 'That\'s a good idea. I\'ll do both right away. Thank you!'),
],
groups: [mcq('Answer the questions about the conversation.', [
Q(33, 'Why can the student not register for the course?', ['Her transferred credits have not been approved by the department.', 'She did not pay her tuition on time, causing a hold on her student account.', 'The class is only open to first-year students, limiting enrollment to freshmen.', 'She registered for too many courses, exceeding the semester\'s credit limit.'], 'hasn\'t approved them as equal', 'Dạng DETAIL. Nhân viên nói khoa "hasn\'t approved them as equal to our introductory course yet" → tín chỉ chuyển từ nơi khác chưa được khoa công nhận. Không có chuyện học phí hay năm học.'),
Q(34, 'Why is the course important to the student?', ['She needs it to stay on schedule for her major.', 'She wants to change her major after talking with advisor', 'It is required for scholarship, which mandates chemistry', 'Her friends are taking it to stay on track for graduation'], 'stay on schedule for my major', 'Dạng REASON. Cô nói cần môn này "to stay on schedule for my major" (để theo kịp lộ trình ngành học). Học bổng không được nhắc đến.'),
Q(35, 'What does the staff member suggest the student email to the department adviser?', ['Her syllabus from the community college', 'A copy of her tuition receipt with the fee paid.', 'A letter from professor confirming equivalence.', 'A list of courses she wants for her degree.'], 'attaching your syllabus', 'Dạng DETAIL. Anh gợi ý "attaching your syllabus from the community college" (đính kèm đề cương môn từ trường cao đẳng cộng đồng) để chứng minh nội dung tương đương.'),
Q(36, 'What will happen if the department approves the credits this week?', ['The system will let her register automatically.', 'She will receive a refund, processed by the office', 'She must visit the office again to verify the approval', 'She will be moved to another course, needing a new schedule'], 'let you register automatically', 'Dạng DETAIL. Nhân viên giải thích khi khoa duyệt, hệ thống "will let you register automatically" → cô được đăng ký tự động. Không nói hoàn tiền hay đổi môn.'),
Q(37, 'What is the purpose of joining the waiting list?', ['It holds her place in line while she waits.', 'It guarantees her a seat, ensuring she can enroll.', 'It lowers the cost of the course, easing finances.', 'It replaces the need for approval, cutting steps.'], 'holds your place in line', 'Trong đoạn hội thoại, danh sách chờ "holds your place in line" chứ không bảo đảm chỗ; vì vậy đáp án C là đúng. Các đáp án A, B, D mô tả chức năng sai (giảm chi phí, thay thế phê duyệt, hoặc bảo đảm chỗ).'),
])],
});
TF.listening.push({
id: 'tf2-la3', set: 2, task: 'announcement', title: 'Library Hours During Finals',
speakers: A1('Librarian', 'en-US', 'm'),
script: [
say('Listen to an announcement made by a university librarian.'), pz,
L('A', 'Good afternoon. I\'d like to let you know about some changes to library hours during final exams, which begin on December first.'),
L('A', 'Starting next Monday, the main library will stay open until two in the morning, Sunday through Thursday. On Friday and Saturday, we will close at ten as usual.'),
L('A', 'Also, the quiet floors on levels three and four will be reserved for individual study only. Group work should take place on the first two floors, where there are small rooms you can book online for up to three hours at a time.'),
L('A', 'One last thing: the café on the ground floor will be giving free coffee after ten p.m. on weeknights. Please bring your own cup, because we are trying to reduce paper waste. Good luck with your exams!'),
],
groups: [mcq('Answer the questions about the announcement.', [
Q(38, 'What is the main purpose of the announcement?', ['To explain changes to library services during exams', 'To announce the date of final exams and suggest early sign‑up', 'To ask students to return library books before the break', 'To introduce a new study room booking system for online use'], 'changes to library hours during final exams', 'Dạng PURPOSE. Thủ thư mở đầu bằng thông báo "changes to library hours during final exams" (thay đổi giờ mở cửa thư viện mùa thi) rồi nêu thêm chi tiết liên quan → mục đích là giải thích các thay đổi dịch vụ.'),
Q(39, 'When will the library close at two in the morning?', ['Sunday through Thursday', 'Friday and Saturday', 'Every day of the week', 'Only on the night before exams'], 'Sunday through Thursday', 'Dạng DETAIL. Giờ mở rộng áp dụng "Sunday through Thursday" (Chủ nhật đến thứ Năm). Thứ Sáu và thứ Bảy thư viện vẫn đóng cửa lúc 10 giờ như thường lệ.'),
Q(40, 'Where should students work in groups?', ['On the first two floors', 'On levels three and four', 'In the café', 'In the basement'], 'first two floors', 'Dạng DETAIL. Tầng ba và bốn dành cho học một mình, nên học nhóm nên ở "the first two floors" (hai tầng đầu).'),
Q(41, 'What does the librarian ask students to bring to the café?', ['Their own cup', 'A student ID', 'A reservation slip', 'A small donation'], 'bring your own cup', 'Dạng DETAIL. Người nói bảo "bring your own cup, because we are trying to reduce paper waste" → mang theo cốc riêng để giảm rác giấy.'),
])],
});
TF.listening.push({
id: 'tf2-lt3', set: 2, task: 'talk', title: 'Economics: The Sunk Cost Fallacy',
speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'f' } },
script: [
say('Listen to part of a talk in an economics class.'), pz,
L('P', 'Imagine you buy a ticket to a concert for fifty dollars. On the day of the show, you feel sick and there is a heavy storm outside. Do you go anyway? Many people say yes, because they have already paid. That reasoning has a name: the sunk cost fallacy.'),
L('P', 'A sunk cost is money, time, or effort that has already been spent and cannot be recovered. Economists argue that sunk costs should not influence future decisions, because whether you go or stay home, the fifty dollars is gone either way.'),
L('P', 'What matters is what you will gain or lose from now on. If staying home is the better choice, the ticket price should not change your mind.'),
L('P', 'But we do not always think this way. Businesses are guilty too. A company may keep investing in a failing product just because it has already spent millions on it. Managers feel that stopping would mean admitting a mistake.'),
L('P', 'So how can we avoid this trap? One strategy is to ask, "If I were starting from zero today, would I choose this option?" If the answer is no, it may be time to stop.'),
L('P', 'Of course, this does not mean past investments never matter. Sometimes they tell us something useful, like how much a project really costs. The fallacy is when the past cost is the only reason for continuing.'),
],
groups: [mcq('Answer the questions about the talk.', [
Q(42, 'What is the talk mainly about?', ['A common mistake in making decisions about spending', 'How to obtain concert tickets when a storm threatens the event', 'The evolution of modern economics from Adam Smith onward', 'Why companies sometimes lose money after launching a product'], 'the sunk cost fallacy', 'Dạng MAIN IDEA. Giáo sư giới thiệu và giải thích "the sunk cost fallacy" (ngụy biện chi phí chìm), một lỗi tư duy về khoản đã chi → chủ đề là sai lầm phổ biến khi ra quyết định chi tiêu.'),
Q(43, 'Why does the professor describe the concert ticket?', ['To give an everyday example of the sunk cost fallacy', 'To explain how tickets are priced, supply and demand effects', 'To show that storms are dangerous, noting the risk of going out', 'To compare live and recorded music, noting audience commitment'], 'Do you go anyway', 'Dạng FUNCTION. Bà dùng chuyện vé hòa nhạc để cho thấy người ta vẫn đi vì đã trả tiền rồi → ví dụ đời thường minh họa cho ngụy biện chi phí chìm.'),
Q(44, 'According to the professor, what is a sunk cost?', ['Money or effort already spent that cannot be recovered', 'Money that you plan to spend on upcoming projects next year', 'A cost that gradually shrinks as the market adjusts over years', 'A price that falls below the typical market average for goods'], 'cannot be recovered', 'Dạng DEFINITION. Chi phí chìm là "money, time, or effort that has already been spent and cannot be recovered" → tiền, thời gian hay công sức đã bỏ ra và không thể lấy lại.'),
Q(45, 'Why might managers continue investing in a failing product?', ['They feel stopping would admit a mistake.', 'They expect the product to become cheaper.', 'Customers have asked them to continue.', 'The law requires them to finish it.'], 'admitting a mistake', 'Dạng REASON. Giáo sư nói các nhà quản lý cảm thấy "stopping would mean admitting a mistake" (dừng lại nghĩa là nhận sai) nên tiếp tục chi tiền.'),
Q(46, 'What question does the professor suggest asking to avoid the trap?', ['Would I choose this option if I were starting from zero today?', 'How much money have I already spent on this ticket, and does that matter?', 'What would my friends likely do, given they attend events despite rain?', 'Can I get a refund for the ticket because I’m sick and the weather is bad?'], 'starting from zero today', 'Dạng DETAIL. Cách tránh bẫy là tự hỏi có chọn phương án này không "if I were starting from zero today" (nếu hôm nay bắt đầu từ con số không).'),
Q(47, 'What does the professor imply at the end of the talk?', ['Past costs can still be useful as information.', 'Past investments should always be ignored, despite data.', 'Businesses should never stop a project, when losses mount.', 'It may affect decisions in everyday life, but rarely.'], 'tell us something useful', 'Dạng INFERENCE. Bà nói khoản đầu tư quá khứ đôi khi "tell us something useful" (cho ta thông tin hữu ích), như chi phí thực; lỗi chỉ nằm ở chỗ chỉ dựa vào chúng.'),
])],
});

/* ============================ BỘ 3 ============================ */
TF.listening.push({
id: 'tf3-lc3', set: 3, task: 'conversation', title: 'Choosing a Research Topic',
speakers: S2(['Student (Daniel)', 'en-US', 'm'], ['Professor Chen', 'en-GB', 'f']),
script: [
say('Listen to a conversation between a student and his professor.'), pz,
L('S', 'Professor Chen, thank you for seeing me. I\'m stuck on choosing a topic for my history research paper.'),
L('P', 'Happy to help. What areas interest you?'),
L('S', 'I like the history of transportation, maybe how the railways changed small towns. But I\'m worried that\'s too broad for a ten-page paper.'),
L('P', 'You\'re right to worry. A good approach is to choose one specific town and one specific period. Is there a place you have a connection with?'),
L('S', 'My grandparents live in a town that got a railway station in the eighteen-sixties. I could use their local museum.'),
L('P', 'That\'s ideal. Local archives often have photographs and newspapers that few people have studied. That makes it easier to say something original.'),
L('S', 'What if I can\'t find enough sources?'),
L('P', 'Then we change direction early. Please send me a one-page outline by next Friday, listing your question and the three main sources you plan to use. That way, we can catch problems before you spend weeks on them.'),
L('S', 'That sounds good. I\'ll email the outline on Thursday.'),
],
groups: [mcq('Answer the questions about the conversation.', [
Q(33, 'Why does the student visit the professor?', ['He cannot decide on a research topic.', 'He hopes to switch to another major next term.', 'He asks for a brief deadline extension.', 'He disputes the professor’s grading on a test.'], 'stuck on choosing a topic', 'Dạng DETAIL. Daniel nói mình đang "stuck on choosing a topic" (bí khi chọn đề tài) cho bài nghiên cứu. Các vấn đề khác không được nhắc.'),
Q(34, 'What worries the student about his idea?', ['It may be too broad for a ten-page paper.', 'It focuses on modern engineering, not history.', 'It has already been covered many times.', 'It would need a foreign trip and costs.'], 'too broad for a ten-page paper', 'Dạng DETAIL. Anh lo việc đường sắt thay đổi các thị trấn nhỏ là "too broad for a ten-page paper" (quá rộng cho bài mười trang).'),
Q(35, 'What does the professor advise him to do?', ['Focus on one town and one period', 'Compare several countries’ railways', 'Choose a recent time period for analysis', 'Write a longer paper on several towns'], 'one specific town and one specific period', 'Dạng DETAIL. Cô khuyên chọn "one specific town and one specific period" (một thị trấn và một giai đoạn cụ thể) để thu hẹp đề tài.'),
Q(36, 'Why does the professor like the idea of using the local museum?', ['It may contain sources that few people have studied.', 'It is close to the university, only a short walk from campus.', 'It offers free access for students, allowing visits semesterly.', 'It has expert historians on staff, focusing on local archives.'], 'few people have studied', 'Dạng REASON. Kho lưu trữ địa phương thường có tư liệu "that few people have studied" (ít người nghiên cứu), giúp anh nói được điều mới mẻ.'),
Q(37, 'What does the professor ask the student to send her?', ['A one-page outline with his question and main sources', 'So they can receive a certificate for volunteering.', 'A handwritten note from his grandparents about their hometown.', 'A list of library books he plans to use for his research.'], 'one-page outline', 'Dạng DETAIL. Cô yêu cầu "a one-page outline by next Friday" (dàn ý một trang trước thứ Sáu tới) gồm câu hỏi nghiên cứu và ba nguồn. Không cần bản nháp đầy đủ.'),
])],
});
TF.listening.push({
id: 'tf3-la3', set: 3, task: 'announcement', title: 'Volunteer Day at the Community Garden',
speakers: A1('Event coordinator', 'en-US', 'f'),
script: [
say('Listen to an announcement made by a student volunteer coordinator.'), pz,
L('A', 'Hello, everyone. This Saturday, the Student Volunteer Office is organizing a work day at the community garden on Maple Street, and we need your help.'),
L('A', 'We will meet at nine o\'clock in front of the campus bookstore, and a free shuttle will take us to the garden. The work will last until about one, with a short lunch break.'),
L('A', 'Tasks include planting vegetables, building new wooden boxes for flowers, and clearing weeds. You don\'t need any experience. Just wear old clothes and closed shoes. We will provide gloves, tools, and a sandwich lunch.'),
L('A', 'To sign up, please send an email to the volunteer office by Thursday so we can order enough food. Volunteers will also receive a certificate that you can add to your résumé.'),
],
groups: [mcq('Answer the questions about the announcement.', [
Q(38, 'What is the purpose of the announcement?', ['To recruit volunteers for a garden work day', 'To announce a gardening class for community members.', 'To sell fresh vegetables grown in the garden.', 'To report on a garden project that ended recently.'], 'we need your help', 'Dạng PURPOSE. Điều phối viên thông báo ngày làm vườn và nói "we need your help" (cần bạn giúp) → mục đích là tuyển tình nguyện viên.'),
Q(39, 'How will volunteers travel to the garden?', ['By a free shuttle from the bookstore', 'By a public bus that stops near the campus', 'By bicycle from the dormitory across campus', 'By their own cars, parking near the garden'], 'free shuttle', 'Dạng DETAIL. Mọi người tập trung trước hiệu sách, và "a free shuttle will take us to the garden" → có xe đưa đón miễn phí.'),
Q(40, 'What do volunteers need to bring?', ['Nothing except old clothes and closed shoes', 'Their own gloves and tools, cleaned first.', 'Packed lunches, supplied by the campus cafeteria.', 'Gardening experience, like prior work in plots.'], 'wear old clothes and closed shoes', 'Dạng DETAIL. Người nói chỉ yêu cầu "wear old clothes and closed shoes" (mặc đồ cũ, giày kín); găng tay, dụng cụ và bữa trưa đã được cung cấp.'),
Q(41, 'Why do volunteers need to sign up by Thursday?', ['So the organizers can order enough food', 'So they can select a specific volunteer task.', 'So the shuttle can be reserved for the garden.', 'So they can receive a volunteer certificate.'], 'order enough food', 'Dạng REASON. Đăng ký trước thứ Năm để văn phòng có thể "order enough food" (đặt đủ đồ ăn) cho bữa trưa.'),
])],
});
TF.listening.push({
id: 'tf3-lt3', set: 3, task: 'talk', title: 'Environmental Science: Why Bees Matter for Crops',
speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
script: [
say('Listen to part of a talk in an environmental science class.'), pz,
L('P', 'When we think about food, we usually think about farmers and soil. But a surprising amount of what we eat depends on pollination, the movement of pollen from one flower to another so that the plant can produce fruit or seeds.'),
L('P', 'Some crops, like wheat and rice, are pollinated by the wind. But many others, including apples, almonds, and blueberries, rely on animals, and bees are the most important of these.'),
L('P', 'Why bees in particular? First, they visit a very large number of flowers every day. Second, their bodies are covered with tiny hairs that trap pollen. And third, bees are loyal visitors. During one trip, a bee usually collects from only one kind of flower, which means the pollen reaches the right plant.'),
L('P', 'Now, here is the concern. In many regions, bee populations have dropped because of pesticides, habitat loss, and disease. In some orchards, farmers now rent hives from beekeepers during the blooming season to make sure there are enough pollinators.'),
L('P', 'That solution works for now, but it is expensive, and it depends on only one species of bee. Scientists suggest a more lasting answer: planting wildflowers around fields, which gives wild bees food and a place to nest.'),
L('P', 'So the lesson here is simple. Protecting wild pollinators is not only about nature. It is also a way to protect our food supply.'),
],
groups: [mcq('Answer the questions about the talk.', [
Q(42, 'What is the main topic of the talk?', ['The importance of bees for growing food', 'How farmers add compost to boost soil quality.', 'The best drought‑tolerant crops for dry regions.', 'How honey is produced by bees in their hives.'], 'depends on pollination', 'Dạng MAIN IDEA. Giáo sư giải thích phần lớn thức ăn của ta "depends on pollination" (phụ thuộc vào thụ phấn) và tập trung vào loài ong.'),
Q(43, 'According to the professor, which crops do not need animals for pollination?', ['Wheat and rice', 'Apples and almonds', 'Blueberries and apples', 'All fruits'], 'pollinated by the wind', 'Dạng DETAIL. Lúa mì và gạo "pollinated by the wind" (thụ phấn nhờ gió), còn táo, hạnh nhân và việt quất cần động vật thụ phấn.'),
Q(44, 'Why are tiny hairs on a bee\'s body important?', ['They trap pollen that can be carried to other flowers.', 'They keep the bee warm by insulating its body against cold.', 'They help the bee locate flowers by improving its sense of smell.', 'They protect the bee from pesticides by acting as a shield.'], 'tiny hairs that trap pollen', 'Dạng DETAIL. Giáo sư nói ong có "tiny hairs that trap pollen" (lông nhỏ giữ phấn hoa) nên mang được phấn từ hoa này sang hoa khác.'),
Q(45, 'What does the professor mean by calling bees "loyal visitors"?', ['A bee usually collects from one kind of flower per trip.', 'Bees return to the same hive every night, guided by polarized light.', 'Bees protect the flowers from other insects by defending their sites.', 'Bees only visit flowers that are close to the hive.'], 'only one kind of flower', 'Dạng INFERENCE (ý nghĩa cụm từ). Mỗi chuyến ong chỉ lấy phấn "from only one kind of flower" (một loại hoa), nên phấn tới đúng cây cùng loại → "loyal visitors".'),
Q(46, 'Why is renting hives not a perfect solution?', ['It is costly and depends on one species of bee.', 'It harms the wild bee population, lowering their numbers.', 'It reduces the amount of fruit that can be harvested.', 'It is illegal in most regions, so it cannot be used.'], 'it is expensive', 'Dạng DETAIL. Bà nói giải pháp này "is expensive, and it depends on only one species of bee" → tốn kém và phụ thuộc một loài ong.'),
Q(47, 'What do scientists recommend as a more lasting answer?', ['Planting wildflowers around fields', 'Using fewer farms to protect habitats', 'Building artificial flowers as a quick aid', 'Moving hives every month to follow bloom'], 'planting wildflowers around fields', 'Dạng DETAIL. Hoa dại quanh ruộng cho ong hoang "food and a place to nest" (thức ăn và chỗ làm tổ), hỗ trợ côn trùng thụ phấn lâu dài.'),
])],
});

/* Xoay vị trí đáp án đúng (soạn a = 0) – mẫu riêng cho các unit trong file này; chấm theo chỉ số nên luôn đúng. */
const PAT = [1, 3, 0, 2, 2, 0, 3, 1, 0, 1, 2, 3, 3, 2, 1];
let k = 0;
TF.listening.filter(u => /^tf[123]-l[cat]3$/.test(u.id)).forEach(u => (u.groups || []).forEach(gr => {
if (gr._rot) return; gr._rot = 1;
gr.items.forEach(it => {
const n = it.options.length, want = PAT[k++ % PAT.length] % n, r = (it.a - want + n) % n;
if (r) { it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want; }
});
}));
})(typeof self !== 'undefined' ? self : this);
