/* TOEFL iBT (định dạng từ 21/01/2026) – bổ sung 6: Listening bổ sung cho bộ 4–6 (đủ 47 câu/bộ). Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
* Nạp SAU data1–4.js: chỉ BỔ SUNG vào window.TOEFL, cùng định dạng. Số câu n: bộ 4 → 65–79, bộ 5 → 33–47, bộ 6 → 41–47.
* Trắc nghiệm: m() chèn đáp án đúng ở vị trí pos (0–3) để A/B/C/D phân bố đều. */
(function (g) {
const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });
const mcq = (instr, items) => ({ type: 'mcq', instr, items });
const m = (n, q, right, wrong, pos, cue, explain) => ({ n, q, options: [...wrong.slice(0, pos), right, ...wrong.slice(pos)], a: pos, cue, explain });

/* ---------------- BỘ 4 (+15: câu 65–79) ---------------- */
TF.listening.push({
id: 'tf4-lc3', set: 4, task: 'conversation', title: 'Replacing a Lost Student ID',
speakers: { S: { name: 'Student (Mia)', accent: 'en-US', gender: 'f' }, C: { name: 'Service desk clerk', accent: 'en-GB', gender: 'm' } },
script: [
{ say: 'Listen to a conversation between a student and a clerk at a campus service desk.' }, { pause: 1 },
{ s: 'S', t: "Hi. I think I lost my student ID card yesterday, and I'm not sure what to do." },
{ s: 'C', t: "That happens a lot. First, have you checked the lost and found at the library? That's where most missing cards end up." },
{ s: 'S', t: "I went this morning. It wasn't there." },
{ s: 'C', t: "Then we'll issue a replacement. It costs fifteen dollars, but I'll deactivate your old card first, so nobody else can use it to enter the residence halls or pay at the cafeteria." },
{ s: 'S', t: "Fifteen dollars, OK. But I have a meal plan balance on that card. Will I lose it?" },
{ s: 'C', t: "No. The balance is stored in your account, not on the card, so it will carry over to the new one." },
{ s: 'S', t: "That's good. How long does it take to get the new card?" },
{ s: 'C', t: "If you come before noon, we can print it while you wait. After noon, it's ready the next morning. Oh, and bring a photo ID, like a passport or a driver's license." },
{ s: 'S', t: "I have my driver's license with me right now, so I'll do it today." },
],
groups: [mcq('Answer the questions about the conversation.', [
m(65, 'Why does the student go to the service desk?', 'She needs a replacement for a card she has lost.', ['She wants to pay a fee for the library.', 'She found a card and wants to return it.', 'She needs to add money to her meal plan.'], 2, 'I lost my student ID card',
 "Mia nói thẳng: \"I lost my student ID card yesterday\" → cô cần cấp lại thẻ. Cô đã tìm ở thư viện nhưng không thấy."),
m(66, 'Why will the clerk deactivate the old card?', 'To stop anyone else from using it', ['To make room for a new meal plan', 'To check how much money is on it', 'To make the replacement cheaper'], 0, 'so nobody else can use it',
 "Nhân viên hủy thẻ cũ trước \"so nobody else can use it\" để vào ký túc xá hay trả tiền ở căng-tin → ngăn người khác dùng thẻ."),
m(67, 'What does the clerk say about the meal plan balance?', 'It will move to the new card.', ['It will be reduced by fifteen dollars.', 'It will be lost with the old card.', 'It must be paid back before a new card is issued.'], 3, 'stored in your account, not on the card',
 "Số dư \"stored in your account, not on the card\", nên khi có thẻ mới thì \"carry over\" sang thẻ mới – Mia không bị mất tiền."),
m(68, 'When could the student get the new card on the same day?', 'If she comes before noon', ['If she pays extra', 'If she returns after the library closes', 'If she brings a friend with her'], 1, 'before noon, we can print it while you wait',
 "Nếu đến trước buổi trưa thì thẻ được in ngay khi chờ; sau 12 giờ thì sáng hôm sau mới có."),
m(69, 'What will the student most likely do next?', 'Apply for the replacement card today', ['Come back to the desk tomorrow morning', 'Call her bank about the fifteen-dollar fee', 'Go back to the library to search again'], 2, "I'll do it today",
 "Mia có sẵn bằng lái làm giấy tờ có ảnh và nói \"I'll do it today\" → cô sẽ làm thẻ thay thế ngay hôm nay."),
])],
});

TF.listening.push({
id: 'tf4-la3', set: 4, task: 'announcement', title: 'Campus Shuttle Route Changes',
speakers: { A: { name: 'Transportation office', accent: 'en-US', gender: 'm' } },
script: [
{ say: 'Listen to an announcement on a university campus.' }, { pause: 1 },
{ s: 'A', t: "Attention, students. Beginning Monday, the campus shuttle will follow a new route, and there are three changes to know about." },
{ s: 'A', t: "First, the shuttle will no longer stop at the north parking lot, because construction of the new science building will block the road there for the next year. Instead, it will stop at the corner of Maple Street, which is only a five-minute walk from the science building." },
{ s: 'A', t: "Second, the evening shuttle, which used to stop at midnight, will now run until one a.m. on Thursday, Friday and Saturday. This should make things safer for students who study late or work off campus." },
{ s: 'A', t: "Finally, printed schedules will no longer be available at the bus stops. Please download the free campus app, where you can see exactly where each shuttle is, or check the transportation website." },
],
groups: [mcq('Answer the questions about the announcement.', [
m(70, 'Why will the shuttle stop using the north parking lot?', 'A road there will be closed for construction.', ['The lot is being turned into a bus station.', 'Too few students use that stop.', 'The science building has moved.'], 1, 'construction of the new science building',
 "Vì \"construction of the new science building will block the road there for the next year\" → đường bị chặn nên xe buýt bỏ điểm dừng."),
m(71, 'What change is being made to the evening shuttle?', 'It will run later on three nights a week.', ['It will start earlier every evening.', 'It will stop running on weekends.', 'It will run only to the library.'], 0, 'until one a.m.',
 "Chuyến tối trước đây dừng lúc nửa đêm, nay chạy \"until one a.m.\" vào thứ Năm, thứ Sáu và thứ Bảy."),
m(72, 'According to the speaker, who will benefit from the longer evening service?', 'Students who study late or work off campus', ['Students who live near Maple Street', 'Staff who work in the science building', 'Visitors who arrive by train'], 3, 'study late or work off campus',
 "Người thông báo nói thay đổi này giúp an toàn hơn cho sinh viên \"who study late or work off campus\"."),
m(73, 'What does the speaker recommend students do instead of using printed schedules?', 'Use the campus app or the website', ['Ask the driver for a copy', 'Pick up a schedule at Maple Street', 'Call the transportation office'], 2, 'download the free campus app',
 "Lịch in sẽ không còn; sinh viên được khuyên \"download the free campus app\" hoặc xem website của bộ phận giao thông."),
])],
});

TF.listening.push({
id: 'tf4-lt3', set: 4, task: 'talk', title: 'Environmental Science: Green Roofs',
speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'm' } },
script: [
{ say: 'Listen to part of a talk in an environmental science class.' }, { pause: 1 },
{ s: 'P', t: "Today I want to talk about green roofs: roofs that are partly or completely covered with plants, grown over a waterproof layer. They aren't a new idea. People in Scandinavia covered their houses with turf centuries ago to keep out the cold. But modern cities have rediscovered green roofs for different reasons." },
{ s: 'P', t: "The first reason is stormwater. In a city, rain falls on roofs and pavement, can't soak into the ground, and rushes into the drains all at once. In a heavy storm, the drains can overflow. A green roof acts like a sponge. Its soil and plants hold much of the water, and some of it evaporates back into the air. Studies of some roofs show that they hold back more than half of the rain from a typical storm." },
{ s: 'P', t: "The second reason is temperature. A dark roof in summer can get thirty or forty degrees hotter than the air around it, and that heat passes into the building, so people use more air conditioning. A green roof stays cooler, because plants shade the surface and because water evaporating from the leaves takes heat away." },
{ s: 'P', t: "Of course, green roofs have drawbacks. They're heavy, especially when the soil is wet, so the building has to be strong enough to carry them. They cost more to install, and someone has to take care of the plants. That's why many designers choose a thin layer of low plants such as sedum, a hardy plant that needs little water, rather than a full garden with trees." },
{ s: 'P', t: "Over time, though, part of the extra cost can be paid back. A green roof protects the waterproof layer from sun and weather, so it may last twice as long as a normal roof. Next week we'll look at a case study from Chicago." },
],
groups: [mcq('Answer the questions about the talk.', [
m(74, 'What is the talk mainly about?', 'The benefits and limitations of green roofs', ['How to build a garden on the ground', 'Why Scandinavian houses were cold', 'How to design air conditioning systems'], 3, 'green roofs have drawbacks',
 "Giáo sư nêu lý do dùng mái xanh (nước mưa, nhiệt độ) rồi nói tới nhược điểm (nặng, đắt, cần chăm sóc) → chủ đề chính là lợi ích và hạn chế của mái xanh."),
m(75, 'Why does the professor mention houses in Scandinavia?', 'To show that green roofs are not a new idea', ['To explain why green roofs are heavy', 'To compare them with modern air conditioning', 'To describe a problem with stormwater'], 0, "They aren't a new idea",
 "Ví dụ nhà ở Scandinavia phủ cỏ từ nhiều thế kỷ trước đi liền với câu \"They aren't a new idea\" → ý tưởng mái xanh không mới."),
m(76, 'How does a green roof help reduce the risk of flooding?', 'It holds water like a sponge.', ['It sends water directly into the drains.', 'It keeps rain from touching the building.', 'It warms the water so it evaporates.'], 1, 'acts like a sponge',
 "Mái xanh \"acts like a sponge\": đất và cây giữ phần lớn nước mưa, một phần bay hơi → cống ít bị quá tải."),
m(77, 'Why does a green roof stay cooler than a dark roof in summer?', 'Plants shade it and evaporating water removes heat.', ['Its soil is much lighter in color.', 'It blocks all wind from reaching the building.', 'It stores heat for use in winter.'], 2, 'plants shade the surface',
 "Cây \"shade the surface\" và nước bốc hơi từ lá lấy bớt nhiệt, nên mái xanh mát hơn mái tối màu."),
m(78, 'Why do many designers choose sedum for green roofs?', 'It is hardy and needs little water.', ['It grows tall enough to shade the whole building.', 'It makes the roof lighter than any soil.', 'It produces food for the building residents.'], 0, 'hardy plant that needs little water',
 "Sedum là loại cây \"hardy plant that needs little water\" → hợp với lớp cây mỏng, ít chăm sóc, nhẹ cho mái."),
m(79, 'According to the professor, how can a green roof save money over time?', 'It may help the roof last much longer.', ['It lowers the price of installation.', 'It removes the need for any plants.', 'It makes the building lighter.'], 1, 'may last twice as long as a normal roof',
 "Mái xanh bảo vệ lớp chống thấm khỏi nắng gió nên \"may last twice as long as a normal roof\" → tuổi thọ dài gấp đôi bù một phần chi phí."),
])],
});

/* ---------------- BỘ 5 (+15: câu 33–47) ---------------- */
TF.listening.push({
id: 'tf5-lc3', set: 5, task: 'conversation', title: 'Finding an On-Campus Job',
speakers: { S: { name: 'Student (Daniel)', accent: 'en-US', gender: 'm' }, A: { name: 'Employment adviser', accent: 'en-GB', gender: 'f' } },
script: [
{ say: 'Listen to a conversation between a student and an employment adviser.' }, { pause: 1 },
{ s: 'S', t: "Hi. I saw a poster about on-campus jobs. I'm looking for something part-time, about ten hours a week." },
{ s: 'A', t: "You've come at a good time. We have openings at the library, the recreation center and the IT help desk. Do you have any experience?" },
{ s: 'S', t: "I worked at a bookstore last summer, but I have nothing technical." },
{ s: 'A', t: "Then the library might suit you. The job involves shelving books and helping students at the front desk. It pays fourteen dollars an hour." },
{ s: 'S', t: "That sounds good. But I have classes on Tuesday and Thursday mornings. Is the schedule flexible?" },
{ s: 'A', t: "Quite flexible. Supervisors build the schedule around your classes, but you'll need to work at least one weekend shift a month." },
{ s: 'S', t: "I can do that. What do I need to apply?" },
{ s: 'A', t: "A short application form and a reference from a former employer. Your bookstore manager would be perfect. Applications close on the fifteenth, so don't wait too long." },
{ s: 'S', t: "I'll email my old manager tonight." },
],
groups: [mcq('Answer the questions about the conversation.', [
m(33, 'What kind of job is the student looking for?', 'A part-time job with a few hours each week', ['A full-time job during the summer', 'A job at a bookstore off campus', 'A technical job at the IT help desk'], 1, 'part-time, about ten hours a week',
 "Daniel nói muốn việc \"part-time, about ten hours a week\" → làm bán thời gian khoảng mười giờ mỗi tuần."),
m(34, 'Why does the adviser think the library job might suit the student?', 'He has bookstore experience but no technical background.', ['He has already worked at the library.', 'He wants to work on weekends only.', 'He has studied library science.'], 3, 'nothing technical',
 "Daniel từng làm ở hiệu sách và \"nothing technical\" → việc ở thư viện (xếp sách, hỗ trợ sinh viên) hợp hơn quầy IT."),
m(35, 'How will the student’s class schedule be handled?', 'The supervisor will plan work hours around his classes.', ['He will skip classes on Tuesday and Thursday.', 'He will work only during the summer.', 'He will have to change his class times.'], 0, 'build the schedule around your classes',
 "Giám sát viên \"build the schedule around your classes\" → lịch làm việc được xếp quanh giờ học của em."),
m(36, 'What must employees at the library do?', 'Work at least one weekend shift a month', ['Work every weekend', 'Complete an IT course first', 'Find someone to cover their shifts'], 2, 'one weekend shift a month',
 "Yêu cầu duy nhất ngoài lịch linh hoạt là làm ít nhất \"one weekend shift a month\" – một ca cuối tuần mỗi tháng."),
m(37, 'What will the student probably do next?', 'Contact his former manager for a reference', ['Visit the library for an interview', 'Submit the application tomorrow morning', 'Ask the recreation center about openings'], 1, 'email my old manager tonight',
 "Cần thư giới thiệu từ chủ cũ nên Daniel nói \"I'll email my old manager tonight\"."),
])],
});

TF.listening.push({
id: 'tf5-la3', set: 5, task: 'announcement', title: 'Free Flu Vaccine Clinic',
speakers: { A: { name: 'Student Health Center', accent: 'en-GB', gender: 'f' } },
script: [
{ say: 'Listen to an announcement on a university campus.' }, { pause: 1 },
{ s: 'A', t: "Good afternoon, everyone. The Student Health Center is holding a free flu vaccine clinic next week, from Tuesday to Thursday, in the student union ballroom. No appointment is needed, but please bring your student ID card." },
{ s: 'A', t: "Each shot takes only a few minutes. Afterwards, the nurses will ask you to wait for fifteen minutes in case anyone feels dizzy. If you have a fever or you're feeling ill on the day, please wait until you've recovered before getting vaccinated." },
{ s: 'A', t: "Students who can't come next week can make an appointment at the health center on any weekday until the end of November. Getting vaccinated is the best way to protect yourself and the people around you, especially in crowded residence halls." },
],
groups: [mcq('Answer the questions about the announcement.', [
m(38, 'Where will the flu vaccine clinic be held?', 'In the student union ballroom', ['At the Student Health Center', 'In a residence hall lobby', 'In the university library'], 2, 'in the student union ballroom',
 "Phòng khiêu vũ của tòa nhà sinh viên – \"in the student union ballroom\", không phải trung tâm y tế."),
m(39, 'What should students bring to the clinic?', 'Their student ID card', ['A doctor’s letter', 'A receipt for payment', 'A form signed by a nurse'], 0, 'bring your student ID card',
 "Không cần hẹn trước nhưng cần \"bring your student ID card\"; vắc-xin miễn phí nên không cần biên lai."),
m(40, 'Why are students asked to wait for fifteen minutes after the shot?', 'Some people may feel dizzy.', ['The nurses need to clean the room.', 'The vaccine works only after a delay.', 'They must fill in a second form.'], 1, 'in case anyone feels dizzy',
 "Y tá yêu cầu chờ mười lăm phút \"in case anyone feels dizzy\" – phòng trường hợp ai đó bị chóng mặt."),
m(41, 'What can students do if they cannot attend the clinic next week?', 'Make an appointment at the health center', ['Get vaccinated at the library', 'Wait until next year', 'Ask a nurse to visit their room'], 3, 'make an appointment at the health center',
 "Ai không đến được tuần sau có thể \"make an appointment at the health center\" vào bất kỳ ngày thường nào đến hết tháng Mười Một."),
])],
});

TF.listening.push({
id: 'tf5-lt3', set: 5, task: 'talk', title: 'Marine Biology: Light in the Deep Sea',
speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
script: [
{ say: 'Listen to part of a talk in a marine biology class.' }, { pause: 1 },
{ s: 'P', t: "In our unit on deep-sea life, we've seen how little sunlight reaches the ocean below about two hundred meters. So today I want to look at how animals down there make their own light, which is called bioluminescence. By some estimates, most animals living in the open ocean can do it." },
{ s: 'P', t: "Bioluminescence is a chemical reaction. A molecule called luciferin reacts with oxygen, usually with the help of an enzyme, and the energy is released as light rather than heat. That's why it's sometimes called cold light. In some animals, the glow comes from bacteria that live inside the animal's body. The animal provides food and shelter, and the bacteria provide the light." },
{ s: 'P', t: "So why glow? One reason is defense. Some squid release a cloud of glowing liquid that confuses a predator, the way ink does in daylight. Another is camouflage. Many fish have light-producing organs on their bellies. A predator looking up from below sees faint light coming from the surface, and the fish's glow matches it, so the fish's outline disappears. This is called counter-illumination." },
{ s: 'P', t: "A third use is hunting. The anglerfish has a glowing lure that dangles in front of its mouth. Small fish are attracted to the light, and they swim close enough to be caught." },
{ s: 'P', t: "Finally, communication. Fireflies on land use flashing patterns to find a mate, and some deep-sea species probably do something similar. Most of the light in the ocean is blue, since blue travels farthest through water, and many deep-sea animals can see only blue light." },
],
groups: [mcq('Answer the questions about the talk.', [
m(42, 'What is the talk mainly about?', 'How and why deep-sea animals produce light', ['How sunlight reaches the deep ocean', 'Why fireflies flash at night', 'How squid produce ink'], 1, 'make their own light',
 "Giáo sư giải thích sinh vật biển sâu \"make their own light\" như thế nào (phản ứng hóa học) và vì sao (tự vệ, ngụy trang, săn mồi, giao tiếp)."),
m(43, 'Why is bioluminescence sometimes called cold light?', 'Its energy is released as light rather than heat.', ['It only happens in very cold water.', 'It is produced by animals that cannot move.', 'It needs no oxygen to be produced.'], 0, 'released as light rather than heat',
 "Năng lượng của phản ứng \"released as light rather than heat\" → ít tỏa nhiệt nên gọi là ánh sáng lạnh."),
m(44, 'What is the purpose of counter-illumination?', 'To hide the fish from predators below', ['To attract small fish to a lure', 'To confuse prey with a cloud of liquid', 'To help fish find a mate'], 2, "the fish's outline disappears",
 "Bụng cá phát sáng khớp với ánh sáng từ mặt nước nên \"the fish's outline disappears\" → kẻ săn mồi ở dưới không thấy cá."),
m(45, 'How does the anglerfish catch food?', 'It uses a glowing lure to attract small fish.', ['It releases a cloud of glowing liquid.', 'It lights up its belly to look like the surface.', 'It flashes in patterns like a firefly.'], 3, 'glowing lure',
 "Cá câu có \"glowing lure\" lủng lẳng trước miệng; cá nhỏ bị thu hút bơi lại gần nên bị bắt."),
m(46, 'Why does the professor mention fireflies?', 'To compare their signals with those of some deep-sea animals', ['To show that all light is produced by bacteria', 'To explain how fish hide from predators', 'To describe an animal that uses a lure'], 0, 'Fireflies on land use flashing patterns',
 "Đom đóm \"use flashing patterns to find a mate\" – ví dụ giao tiếp trên cạn, và một số loài biển sâu có lẽ làm tương tự."),
m(47, 'According to the professor, why is most light in the ocean blue?', 'Blue light travels farthest through water.', ['Most animals produce only blue pigment.', 'Sunlight changes color in deep water.', 'Blue light is the cheapest to produce.'], 1, 'blue travels farthest through water',
 "Ánh sáng xanh \"travels farthest through water\" nên phần lớn ánh sáng ở biển là màu xanh, và nhiều loài chỉ nhìn được màu này."),
])],
});

/* ---------------- BỘ 6 (+7: câu 41–47) ---------------- */
TF.listening.push({
id: 'tf6-lc4', set: 6, task: 'conversation', title: 'Questions about a Lab Report',
speakers: { S: { name: 'Student (Nora)', accent: 'en-GB', gender: 'f' }, T: { name: 'Teaching assistant', accent: 'en-US', gender: 'm' } },
script: [
{ say: 'Listen to a conversation between a student and a teaching assistant.' }, { pause: 1 },
{ s: 'S', t: "Hi. I'm in your Tuesday chemistry lab. I wanted to ask about the lab report that's due Friday." },
{ s: 'T', t: "Sure. What's confusing?" },
{ s: 'S', t: "I'm not sure whether I should include the raw data in the report itself, or just the summary table." },
{ s: 'T', t: "Put the summary table in the results section. The raw data goes at the end, in an appendix. That keeps the report easy to read, but your grader can still check your numbers." },
{ s: 'S', t: "OK. Also, my measurements were a bit different from my partner's. Should we report the same numbers?" },
{ s: 'T', t: "No, report what you measured yourself. If your results differ, mention it in the discussion and suggest a reason, such as a small error in timing. Graders like honest explanations more than perfect numbers." },
{ s: 'S', t: "That's a relief. I was about to change mine." },
{ s: 'T', t: "Please don't. Changing data is a serious violation of the academic honesty policy." },
],
groups: [mcq('Answer the questions about the conversation.', [
m(41, 'What is the student unsure about?', 'How much of her data to put in the report', ['When the report is due', 'Who her lab partner will be', 'Which chemicals to use'], 2, 'include the raw data in the report itself',
 "Nora không chắc nên \"include the raw data in the report itself\" hay chỉ bảng tóm tắt → băn khoăn về việc đưa dữ liệu thô vào đâu."),
m(42, 'Where does the teaching assistant say the raw data should go?', 'In an appendix at the end', ['In the results section', 'In the discussion section', 'In a separate email'], 0, 'goes at the end, in an appendix',
 "Bảng tóm tắt vào phần kết quả, còn dữ liệu thô \"goes at the end, in an appendix\" – giúp bài dễ đọc mà vẫn kiểm tra được số liệu."),
m(43, 'What does the teaching assistant advise about results that differ from the partner’s?', 'Report her own measurements and explain the difference.', ['Use her partner’s numbers instead.', 'Average the two sets of data.', 'Repeat the experiment alone.'], 1, 'report what you measured yourself',
 "Trợ giảng khuyên \"report what you measured yourself\" và giải thích khác biệt ở phần thảo luận; sửa số liệu là vi phạm liêm chính học thuật."),
])],
});

TF.listening.push({
id: 'tf6-lt3', set: 6, task: 'talk', title: 'Geography: How Monsoons Work',
speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'f' } },
script: [
{ say: 'Listen to part of a talk in a geography class.' }, { pause: 1 },
{ s: 'P', t: "Let's turn to monsoons. Many people think of a monsoon as a storm, but it's really a seasonal change in wind direction, and that brings a dramatic change in rainfall. The best-known example is in South Asia, where billions of people depend on it." },
{ s: 'P', t: "The cause is the different way land and sea heat up. In summer, the land warms much faster than the ocean. The air above the land rises, which creates an area of low pressure. Moist air from the ocean flows in to fill the space, and when it rises over the land and cools, its moisture condenses into heavy rain." },
{ s: 'P', t: "In winter, the pattern reverses. The land cools faster than the sea, so winds blow from the land toward the ocean, and the weather is dry for months." },
{ s: 'P', t: "This matters a great deal for farming. Rice grows well with the summer rains, and farmers plan their planting around the expected arrival date. But the monsoon isn't perfectly regular. If it arrives late or brings less rain than usual, crops can fail. That's why forecasting the arrival has become so important, and why weather agencies publish forecasts well in advance." },
],
groups: [mcq('Answer the questions about the talk.', [
m(44, 'How does the professor define a monsoon?', 'A seasonal change in wind direction that alters rainfall', ['A single violent storm over the ocean', 'A type of crop grown in South Asia', 'A long dry season caused by cold winds'], 3, 'seasonal change in wind direction',
 "Giáo sư sửa quan niệm \"cơn bão\": gió mùa thực chất là \"a seasonal change in wind direction\" kéo theo thay đổi lượng mưa."),
m(45, 'Why does moist air from the ocean move toward the land in summer?', 'Rising air over the land creates low pressure.', ['The ocean becomes warmer than the land.', 'Strong winds push it from the mountains.', 'The land cools and pulls the air down.'], 1, 'creates an area of low pressure',
 "Mùa hè đất nóng nhanh hơn, không khí bốc lên và \"creates an area of low pressure\" nên không khí ẩm từ biển tràn vào lấp chỗ."),
m(46, 'What is the weather like in winter in a monsoon region?', 'Dry for months', ['Stormy and cool', 'Wetter than in summer', 'Unpredictable from week to week'], 0, 'weather is dry for months',
 "Mùa đông gió thổi từ đất ra biển và \"the weather is dry for months\" – thời tiết khô kéo dài nhiều tháng."),
m(47, 'Why is forecasting the arrival of the monsoon so important?', 'A late or weak monsoon can ruin crops.', ['Storms are more dangerous when they arrive early.', 'Farmers cannot grow rice without forecasts.', 'The monsoon changes direction every few days.'], 2, 'arrives late or brings less rain',
 "Nếu gió mùa \"arrives late or brings less rain\" so với thường lệ thì mùa màng có thể thất bát; nên dự báo thời điểm đến rất quan trọng."),
])],
});
})(self);
