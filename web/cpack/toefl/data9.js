/* TOEFL iBT (định dạng từ 21/01/2026) – Bộ luyện tập 8. Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
* Nạp SAU data1.js: chỉ BỔ SUNG vào window.TOEFL, cùng định dạng và cùng cấu trúc đơn vị với bộ 1
* (Reading 50 câu, Listening 47 câu, Writing, Speaking). Chủ đề: lưu trữ năng lượng tái tạo, thiên văn cổ đại, song ngữ và nhận thức,
* chuỗi cung ứng, rạn san hô, thông báo câu lạc bộ, lịch phòng khám/phòng gym, tin tuyển thực tập.
* Trắc nghiệm soạn với đáp án đúng ở vị trí 0, cuối file xoay vòng (chỉ các unit tf8-) để A/B/C/D phân bố đều. */
(function (g) {
const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });
const mc = (instr, items) => ({ type: 'mcq', instr, items });
/* Q(số câu, đề, [đúng, sai, sai, sai], mức, cue, lời giải, dạng) – đáp án đúng ở vị trí 0, xoay ở cuối file. */
const Q = (n, q, o, lv, cue, explain, type) => { const r = { n, q, options: o, a: 0, lv }; if (type) r.type = type; r.cue = cue; r.explain = explain; return r; };
const L = (s, t) => ({ s, t });
const say = t => ({ say: t });
const pz = { pause: 1 };

/* ===================================================================
* READING · Complete the Words (10 ô trống mỗi bài)
* =================================================================== */
TF.reading.push({
id: 'tf8-cw1', set: 8, task: 'cw', title: 'Coral Reefs',
instr: 'Fill in the missing letters in the paragraph.',
text: `Coral reefs cover less than one percent of the ocean floor, yet they {she|lter} about a quarter of all marine species. A reef is built by tiny animals called polyps, which {pro|duce} a hard skeleton of limestone. Inside each polyp {li|ve} microscopic algae {th|at} make food from sunlight {an|d} share it {wi|th} their host. In return, {the|y} receive a safe home. Because {th|is} partnership depends on light, reefs {gr|ow} mainly in warm, {cl|ear} shallow water.`,
explain: [
`"shelter" = che chở, làm nơi trú ngụ; chủ ngữ "they" (rạn san hô) nên động từ giữ nguyên, nghĩa là rạn là nơi ở của khoảng một phần tư số loài biển.`,
`"which produce" = mà tạo ra; mệnh đề quan hệ có chủ ngữ số nhiều "polyps" nên động từ không thêm -s.`,
`"live" = sống; đảo ngữ sau "Inside each polyp", chủ ngữ thật là "algae" (số nhiều) nên dùng "live".`,
`"that" là đại từ quan hệ thay cho "algae", mở đầu mệnh đề "that make food from sunlight".`,
`"and" nối hai động từ cùng chủ ngữ: "make food … and share it".`,
`"share it with their host" = chia sẻ nó với vật chủ; "share … with" là cấu trúc đi cùng nhau.`,
`"they" thay cho "microscopic algae" ở câu trước; "In return, they receive a safe home" = đổi lại, chúng nhận được nơi ở an toàn.`,
`"this partnership" = mối quan hệ hợp tác này; "this" chỉ đúng điều vừa mô tả ở các câu trước.`,
`"grow" = phát triển; chủ ngữ số nhiều "reefs" nên động từ không thêm -s.`,
`"clear" = trong suốt; tính từ đứng trước "shallow water", cùng với "warm" tạo điều kiện cho ánh sáng đi xuống.`,
],
});
TF.reading.push({
id: 'tf8-cw2', set: 8, task: 'cw', title: 'The Shipping Container',
instr: 'Fill in the missing letters in the paragraph.',
text: `Nearly everything in a modern store traveled in a steel shipping container. Before containers {we|re} invented, workers loaded cargo piece by piece, {wh|ich} was slow and {exp|ensive}. Standard boxes changed that. A crane can {li|ft} a container from a ship {dir|ectly} onto a train or truck, {wh|ile} the goods inside {rem|ain} untouched. As a result, shipping costs {fe|ll} sharply, and factories {be|gan} to sell their products {ac|ross} the world.`,
explain: [
`"were invented" = bị động quá khứ; chủ ngữ số nhiều "containers" nên dùng "were".`,
`"which" thay cho cả mệnh đề trước ("workers loaded cargo piece by piece") và mở đầu mệnh đề "which was slow and expensive".`,
`"expensive" = đắt đỏ; tính từ nối bằng "and" với "slow", cùng đứng sau "was".`,
`"lift" = nhấc lên; động từ nguyên mẫu sau động từ khuyết thiếu "can".`,
`"directly" = trực tiếp; trạng từ bổ nghĩa cho cả hành động chuyển container từ tàu sang tàu hỏa hoặc xe tải.`,
`"while" = trong khi; nối hai việc xảy ra đồng thời (cẩu nhấc container, hàng bên trong không bị động tới).`,
`"remain untouched" = vẫn không bị chạm tới; chủ ngữ "the goods" số nhiều nên dùng "remain".`,
`"fell" = giảm (quá khứ của "fall"); "As a result" cho biết kết quả: chi phí vận chuyển giảm mạnh.`,
`"began to sell" = bắt đầu bán; "began" là quá khứ, song song với "fell" trong cùng câu.`,
`"across the world" = khắp thế giới; giới từ "across" đi với "the world" để nói về phạm vi thị trường.`,
],
});

/* ===================================================================
* READING · Read in Daily Life (câu 1–10)
* =================================================================== */
TF.reading.push({
id: 'tf8-dl1', set: 8, task: 'daily', title: 'Student Club Notice',
text: `NORTHGATE BIRD & PHOTO CLUB – SPRING SEMESTER\n\nNew members are welcome at our first meeting on Tuesday, February 11, at 6 p.m. in Room 214 of the Arts Annex. No experience is needed, and the club lends beginner cameras and binoculars to members for the semester.\n\nOur first outing is a sunrise walk at Heron Marsh on Saturday, February 22. The group will leave from the Arts Annex at 5:45 a.m. by minivan; sign up by Friday so we know how many vans to reserve. Dues are $10 per semester and cover transportation.\n\nQuestions? Message club president Dana at birdphoto@northgate.edu.`,
groups: [mc('Read the notice and answer the questions.', [
Q(1, 'What is the main purpose of the notice?', ['To invite students to a club meeting and a first outing', 'To inform visitors that Heron Marsh will temporarily close down', 'To sell discounted camera equipment to newly admitted club members', 'To urge undergraduate students to vote for the next club president'], 'B1', 'New members are welcome at our first meeting', `Dạng MAIN IDEA. Thông báo mở đầu bằng lời chào đón thành viên mới đến buổi họp đầu tiên và sau đó giới thiệu chuyến đi sáng sớm đầu tiên. Không có nội dung nào về việc đóng cửa đầm lầy, bán máy ảnh hay bầu chủ tịch.`),
Q(2, 'Why are students asked to sign up by Friday?', ['The club needs to know how many vans to reserve.', 'The meeting room will be full by then.', 'The dues must be paid in advance.', 'The marsh requires a permit for each visitor.'], 'B1', 'sign up by Friday so we know how many vans to reserve', `Dạng FACTUAL. "sign up by Friday so we know how many vans to reserve" – đăng ký trước thứ Sáu để câu lạc bộ biết cần thuê bao nhiêu xe. Hạn đóng phí và giấy phép không được nhắc tới.`),
Q(3, 'What can be inferred about a student who does not own a camera?', ['The student can still take part in the club.', 'The student must buy a camera before the outing.', 'The student will pay extra dues.', 'The student cannot join until next semester.'], 'B1', 'lends beginner cameras and binoculars to members', `Dạng INFERENCE. Câu lạc bộ "lends beginner cameras and binoculars to members" và "No experience is needed" → người chưa có máy ảnh vẫn tham gia được vì có thể mượn thiết bị.`),
])],
});
TF.reading.push({
id: 'tf8-dl2', set: 8, task: 'daily', title: 'Internship Posting',
text: `SUMMER INTERNSHIP – LOGISTICS ASSISTANT\nHarbor Freight Partners, Port City\n\nHarbor Freight Partners is looking for two interns to support our shipping coordination team from June 2 to August 8. Interns will track containers, update delivery schedules, and prepare weekly reports for customers.\n\nRequirements: sophomore standing or higher; strong skills in spreadsheets; ability to work 20 hours per week. Majors in business, engineering, or geography are preferred, but all majors may apply.\n\nThis position is paid at $18 per hour. Housing is not provided, but interns receive a monthly transit pass.\n\nTo apply, send a résumé and a one-page cover letter to careers@harborfreight.example by April 15. Late applications will not be considered.`,
groups: [mc('Read the posting and answer the questions.', [
Q(4, 'Which task is NOT mentioned as part of the job?', ['Negotiating contracts with suppliers', 'Tracking containers', 'Updating delivery schedules', 'Preparing weekly reports for customers'], 'B1', 'Interns will track containers, update delivery schedules, and prepare weekly reports', `Dạng NEGATIVE FACTUAL. Bài liệt kê ba việc: theo dõi container, cập nhật lịch giao hàng và soạn báo cáo hàng tuần cho khách. Việc đàm phán hợp đồng với nhà cung cấp không hề được nhắc tới.`),
Q(5, 'What does the posting suggest about a student who is majoring in history?', ['The student is allowed to apply.', 'The student will receive priority.', 'The student must change majors first.', 'The student is too late to apply.'], 'B1', 'all majors may apply', `Dạng INFERENCE. Ngành kinh doanh, kỹ thuật, địa lý chỉ là ưu tiên ("preferred"), còn "all majors may apply" → sinh viên ngành lịch sử vẫn được nộp đơn, nhưng không được ưu tiên đặc biệt.`),
Q(6, 'What will happen to an application sent after April 15?', ['It will not be reviewed.', 'It will be reviewed for the next summer.', 'It will receive a lower salary offer.', 'It will be sent back to be corrected.'], 'A2', 'Late applications will not be considered.', `Dạng FACTUAL. "Late applications will not be considered" = đơn nộp trễ sẽ không được xem xét, tức là không được đánh giá.`),
])],
});
TF.reading.push({
id: 'tf8-dl3', set: 8, task: 'daily', title: 'Clinic and Fitness Center Hours',
text: `WESTLAKE UNIVERSITY – FINALS WEEK HOURS\n\nStudent Health Clinic\nMonday–Thursday: 8 a.m.–6 p.m. (last appointment at 5:30)\nFriday: 8 a.m.–1 p.m.\nSaturday and Sunday: closed. When the clinic is closed, call the nurse line at 555-0142.\n\nFitness Center\nMonday–Friday: 6 a.m.–11 p.m.\nSaturday: 9 a.m.–5 p.m.\nSunday: 10 a.m.–10 p.m. (pool closed)\n\nNo appointment is needed for flu shots on Wednesdays, 10 a.m.–2 p.m. Please return fitness center towels to the front desk at least 15 minutes before closing.`,
groups: [mc('Read the schedule and answer the questions.', [
Q(7, 'Which statement about Sunday is supported by the schedule?', ['The fitness center is open, but the pool is not.', 'The clinic is open in the afternoon only.', 'The fitness center closes at 5 p.m.', 'Flu shots are offered without an appointment.'], 'B1', 'Sunday: 10 a.m.–10 p.m. (pool closed)', `Dạng FACTUAL. Lịch ghi Chủ nhật phòng gym mở 10 giờ sáng đến 10 giờ tối nhưng "pool closed" (hồ bơi đóng). Phòng khám đóng cửa cuối tuần và tiêm cúm chỉ vào thứ Tư.`),
Q(8, 'A student arrives at the clinic at 5:45 p.m. on Tuesday. What can be inferred?', ['It is too late to book an appointment that day.', 'The entire facility has already locked its doors and closed down.', 'She can easily receive a routine flu shot without waiting in line.', 'She should immediately call the emergency nurse helpline instead.'], 'B2', 'last appointment at 5:30', `Dạng INFERENCE. Phòng khám mở đến 6 giờ chiều nhưng "last appointment at 5:30" (lượt hẹn cuối lúc 5 giờ 30) → đến lúc 5 giờ 45 đã quá muộn để đặt lượt khám trong ngày. Phòng khám chưa đóng cửa.`),
])],
});
TF.reading.push({
id: 'tf8-dl4', set: 8, task: 'daily', title: 'Text Messages about Club Fair Tables',
text: `Priya (2:05 p.m.): Did you pick up the folding tables for the club fair? The booth setup starts at noon tomorrow.\nOmar (2:09 p.m.): Not yet. The facilities office told me tables are only released with a signed form from the club advisor.\nPriya (2:11 p.m.): Ugh. Professor Kim is traveling until tonight. Can't you just say you're borrowing them for her?\nOmar (2:13 p.m.): I'd rather not. They check the signature. But I can email her now; she usually replies from her phone.\nPriya (2:14 p.m.): Good plan. If it comes through, I'll drive over and carry the tables myself.`,
groups: [mc('Read the messages and answer the questions.', [
Q(9, 'Why is Omar unable to get the tables yet?', ['The club advisor has not signed the release form.', 'The facilities office has completely run out of extra folding tables.', 'The annual student organization fair was postponed until next week.', 'He lacks a personal vehicle large enough to transport heavy equipment.'], 'B1', 'signed form from the club advisor', `Dạng FACTUAL. Omar nói bàn chỉ được cấp "with a signed form from the club advisor" (cần phiếu có chữ ký của cố vấn). Giáo sư Kim đang đi xa nên chưa ký. Phương tiện chở bàn là việc Priya sẽ lo sau.`),
Q(10, 'What does Omar mean when he writes "I\'d rather not"?', ['He does not want to pretend he has permission.', 'He wants to approach a different advisor for permission.', 'He would prefer that Priya pick up the tables herself.', 'He intends to cancel the club\'s reservation at the fair.'], 'B2', 'Can\'t you just say you\'re borrowing them for her?', `Dạng SENTENCE FUNCTION. Đáp lại gợi ý nói là đang mượn thay cho giáo sư, Omar viết "I'd rather not" và giải thích "They check the signature" → anh không muốn giả vờ được phép, mà muốn gửi email xin chữ ký thật.`),
])],
});

/* ===================================================================
* READING · Read an Academic Passage (câu 1–20)
* =================================================================== */
TF.reading.push({
id: 'tf8-ap1', set: 8, task: 'academic', title: 'Reading the Sky Without Telescopes',
text: [
`Long before telescopes, people in many parts of the world watched the sky closely, and they did so for practical reasons. Farmers needed to know when to plant, sailors needed landmarks at night, and rulers wanted calendars that would organize taxes and festivals. Because the stars return to the same positions every year, they offered a reliable clock. The challenge was to turn scattered observations into predictions that could be trusted.`,
`In Egypt, the key signal was the reappearance of Sirius, the brightest star in the night sky. For about seventy days each year, Sirius was hidden by the glare of the sun. When it finally rose again just before dawn, an event known as its heliacal rising, it arrived shortly before the Nile began to flood. Priests recorded the date, and farmers learned to prepare their fields. The star did not cause the flood; it simply warned of it.`,
`Babylonian astronomers took a different approach. They kept clay tablets listing the positions of planets and eclipses over many centuries. Rather than explaining why the planets moved, they searched these records for repeating patterns. They eventually learned to predict lunar eclipses by using a cycle of about eighteen years. Their method was arithmetic, not geometry: they added and subtracted numbers from the old records until a stable pattern emerged.`,
`The Maya of Central America also followed Venus, which they linked to war and kingship. Their Dresden Codex, a book of bark paper, contains tables that track Venus through its cycle of roughly 584 days. Some buildings were also aligned with the sky. At certain sites, the sun rises directly over a temple on a key day, such as an equinox. Historians still debate how many alignments were intentional, since a building facing the sunrise could also be a coincidence.`,
`Modern researchers combine this evidence with computer models that show how the sky looked thousands of years ago. The models help them test claims: if a monument is said to mark a particular star, the software can reveal whether that star was actually visible there when the monument was built. This approach has shown that some popular claims are weak, but it has also confirmed that many ancient peoples were careful observers. Their records remain useful today; for instance, ancient eclipse reports help scientists measure small changes in the speed of Earth's rotation over the centuries.`,
].join('\n\n'),
groups: [mc('Read the passage and answer the questions.', [
Q(1, 'According to paragraph 1, why were the stars useful as a clock?', ['They return to the same positions every year.', 'They are bright enough to be seen in daytime.', 'They were mapped first by farmers.', 'They change color with the seasons.'], 'B1', 'the stars return to the same positions every year', `Dạng FACTUAL. Đoạn 1 nói "the stars return to the same positions every year" nên chúng "offered a reliable clock" – vị trí lặp lại hằng năm khiến sao thành đồng hồ đáng tin cậy.`, 'factual'),
Q(2, 'The word "reliable" in paragraph 1 is closest in meaning to', ['dependable', 'impressive', 'ancient', 'visible'], 'B1', 'they offered a reliable clock', `Dạng VOCABULARY. "reliable clock" = đồng hồ đáng tin cậy, vì sao lặp lại đều đặn → "dependable". "visible" (nhìn thấy được) không nói về độ tin cậy.`, 'vocab'),
Q(3, 'What does paragraph 2 say about the heliacal rising of Sirius?', ['It occurred shortly before the Nile began to flood.', 'It directly triggered the massive annual flooding of the Nile.', 'It consistently marked the longest day of the summer calendar.', 'It remained visible continuously for about seventy entire days.'], 'B1', 'shortly before the Nile began to flood', `Dạng FACTUAL. Sirius mọc trở lại trước bình minh "shortly before the Nile began to flood" – ngay trước khi sông Nile dâng nước. "seventy days" là thời gian sao bị ẩn đi, không phải thời gian sự kiện kéo dài.`, 'factual'),
Q(4, 'Why does the author write "The star did not cause the flood; it simply warned of it"?', ['To distinguish a useful signal from a cause', 'To suggest that the Egyptians misunderstood the sky', 'To explain why Sirius disappears for seventy days', 'To show that priests disagreed about the calendar'], 'B2', 'The star did not cause the flood; it simply warned of it.', `Dạng SENTENCE FUNCTION. Câu này phân biệt sao Sirius chỉ là tín hiệu báo trước với nguyên nhân gây lũ. Tác giả không cho rằng người Ai Cập hiểu sai và cũng không nói tới bất đồng giữa các thầy tế.`, 'purpose'),
Q(5, 'According to paragraph 3, all of the following are true of Babylonian astronomers EXCEPT:', ['They built geometric models to explain planetary motion.', 'They kept clay tablets listing planetary positions, in Babylon.', 'They analyzed past records to identify recurring events for rituals.', 'They predicted lunar eclipses using a recurring cycle for calendars.'], 'B2', 'Their method was arithmetic, not geometry', `Dạng NEGATIVE FACTUAL. Đoạn 3 nhấn mạnh "Their method was arithmetic, not geometry" và họ không tìm cách giải thích vì sao các hành tinh chuyển động → việc xây mô hình hình học là điều KHÔNG đúng. Ba ý còn lại đều được nêu.`, 'negative'),
Q(6, 'The word "emerged" in paragraph 3 is closest in meaning to', ['became clear', 'was erased', 'grew larger', 'was copied'], 'B2', 'until a stable pattern emerged', `Dạng VOCABULARY. Họ cộng trừ các số trong tư liệu cũ "until a stable pattern emerged" = cho đến khi một quy luật ổn định lộ ra → "became clear".`, 'vocab'),
Q(7, 'What can be inferred from paragraph 4 about buildings that face the sunrise?', ['Their alignment does not always prove the builders intended it.', 'They were systematically positioned to observe the cyclical shifts of Venus.', 'They served purely ritual purposes during nighttime astronomical ceremonies.', 'They provide proof that ancient priests completely ignored solar cycles.'], 'B2', 'could also be a coincidence', `Dạng INFERENCE. Câu cuối đoạn 4 nói công trình hướng về mặt trời mọc "could also be a coincidence" → việc thẳng hàng với bầu trời chưa chắc là chủ ý của người xây, nên các nhà sử học còn tranh luận.`, 'inference'),
Q(8, 'Why does the author mention the Dresden Codex in paragraph 4?', ['To show that Maya astronomers wrote down tables of Venus\'s cycle', 'To argue that religious temples were constructed only after its writing', 'To demonstrate how ancient Mesoamerican bark paper was manufactured', 'To prove that Venus was venerated exclusively by Central American priests'], 'B2', 'contains tables that track Venus through its cycle', `Dạng RHETORICAL PURPOSE. Cuốn Dresden Codex được nêu như bằng chứng người Maya ghi chép bảng theo dõi chu kỳ của sao Kim ("tables that track Venus"). Bài không bàn về cách làm giấy hay thứ tự xây đền.`, 'purpose'),
Q(9, 'According to paragraph 5, how do computer models help researchers?', ['They show whether a claimed star could be seen at the site long ago.', 'They decipher inscriptions on ancient clay tablets quickly and accurately.', 'They confirm conclusively that nearly every monument aligns with a bright star.', 'They reconstruct planetary cycles to predict upcoming solar eclipses precisely.'], 'B2', 'whether that star was actually visible there', `Dạng FACTUAL. Phần mềm có thể cho thấy ngôi sao được cho là bị công trình đánh dấu "was actually visible there" – thực sự nhìn thấy được tại đó vào thời xây dựng hay không, từ đó kiểm tra các giả thuyết.`, 'factual'),
Q(10, 'What does the last sentence of paragraph 5 suggest about ancient eclipse reports?', ['They still have scientific value today.', 'They are less accurate than modern measurements.', 'They prove that Earth no longer rotates.', 'They were written only by Babylonian scholars.'], 'B2', 'ancient eclipse reports help scientists measure small changes', `Dạng INFERENCE. Tác giả nói "Their records remain useful today" và ví dụ các báo cáo nhật/nguyệt thực cổ giúp đo thay đổi nhỏ của tốc độ quay Trái Đất → chúng vẫn có giá trị khoa học. Không có ý nào nói Trái Đất ngừng quay.`, 'inference'),
])],
});
TF.reading.push({
id: 'tf8-ap2', set: 8, task: 'academic', title: 'The Bilingual Mind',
text: [
`For much of the twentieth century, many educators believed that raising a child with two languages would confuse the child and slow learning. Early studies seemed to support this view, but they often compared bilingual children from poor immigrant families with monolingual children from wealthier ones, so differences in schooling and income were mistaken for effects of language. Later research that controlled for such factors found little evidence of harm.`,
`Psychologists now think that bilingual people may gain an advantage in a specific mental skill known as executive control, the ability to focus attention and ignore distractions. Both languages remain partly active in a bilingual person's brain even when only one is being used. A Spanish-English speaker who hears the word "pan" may briefly think of both bread and a cooking container. To speak correctly, the brain must continually suppress the language that is not needed, and this daily practice may strengthen general attention-control systems.`,
`Evidence for this idea comes from tasks in which participants must respond to one feature of an image while ignoring another. In some studies, bilingual children and adults responded more quickly than monolinguals when the instructions changed unexpectedly. However, not all attempts to repeat these results have succeeded, and some researchers argue that the early positive findings were exaggerated because studies that found no difference were less likely to be published. The advantage, if it exists, is probably small.`,
`A more consistent finding concerns aging. Several studies of patients with dementia report that bilingual patients showed their first symptoms four to five years later, on average, than monolingual patients. Scientists do not claim that speaking two languages prevents dementia. Rather, they suggest that the extra mental exercise may build a "cognitive reserve", a buffer that allows the brain to keep working normally even as some of its tissue is damaged.`,
`Bilingualism also has costs, though they are minor. Bilingual speakers often have slightly smaller vocabularies in each language than monolinguals have in theirs, and they may take a fraction of a second longer to retrieve a word. Most researchers consider these effects trivial compared with the benefits of being able to communicate with more people, read more literature, and understand other cultures. The practical lesson for parents is simple: there is no scientific reason to avoid raising children with two languages.`,
].join('\n\n'),
groups: [mc('Read the passage and answer the questions.', [
Q(11, 'According to paragraph 1, why were some early studies of bilingual children misleading?', ['They compared groups that differed in income and schooling.', 'They focused primarily on fluent children who spoke three languages.', 'They restricted their sample entirely to children of wealthy elites.', 'They evaluated cognitive ability using outdated and biased tools.'], 'B2', 'differences in schooling and income were mistaken for effects of language', `Dạng FACTUAL. Các nghiên cứu đầu so sánh trẻ song ngữ nghèo, nhập cư với trẻ đơn ngữ khá giả hơn, nên "differences in schooling and income were mistaken for effects of language" – sai lệch do khác biệt học vấn và thu nhập.`, 'factual'),
Q(12, 'The word "suppress" in paragraph 2 is closest in meaning to', ['hold back', 'translate', 'imitate', 'strengthen'], 'B2', 'the brain must continually suppress the language that is not needed', `Dạng VOCABULARY. Não phải "suppress" ngôn ngữ không cần dùng = kìm lại, không cho nó chen vào → "hold back". "strengthen" (làm mạnh thêm) trái nghĩa với ngữ cảnh.`, 'vocab'),
Q(13, 'Why does the author mention the word "pan" in paragraph 2?', ['To illustrate that both languages are active at the same time', 'To show that foreign vocabulary items are noticeably easier to memorize', 'To explain why bilingual individuals hesitate slightly before answering', 'To compare specialized culinary terminology between two modern societies'], 'B2', 'may briefly think of both bread and a cooking container', `Dạng RHETORICAL PURPOSE. Từ "pan" nghĩa là bánh mì trong tiếng Tây Ban Nha và cái chảo trong tiếng Anh; người song ngữ "may briefly think of both" → minh họa việc cả hai ngôn ngữ cùng hoạt động trong não.`, 'purpose'),
Q(14, 'According to paragraph 2, what may strengthen the attention-control systems of bilingual people?', ['Daily practice at suppressing the language not in use', 'Learning the second language before the age of five', 'Reading books in two languages every night', 'Switching between languages only when abroad'], 'B1', 'this daily practice may strengthen general attention-control systems', `Dạng FACTUAL. Não liên tục kìm ngôn ngữ không cần dùng, và "this daily practice may strengthen general attention-control systems" – việc luyện tập hằng ngày này có thể củng cố hệ thống kiểm soát chú ý.`, 'factual'),
Q(15, 'According to paragraph 3, all of the following are reasons to doubt a bilingual advantage EXCEPT:', ['Bilingual participants were less accurate on every task.', 'Some researchers could not repeat the results, noting mixed outcomes.', 'Studies finding no difference were less likely to be published.', 'The advantage, if it exists, is probably small in most experiments.'], 'B2', 'not all attempts to repeat these results have succeeded', `Dạng NEGATIVE FACTUAL. Đoạn 3 nêu ba lý do nghi ngờ: một số nghiên cứu không lặp lại được kết quả, nghiên cứu không có khác biệt ít được công bố, và lợi thế nếu có thì nhỏ. Việc người song ngữ kém chính xác trong mọi bài tập không hề được nhắc.`, 'negative'),
Q(16, 'The word "exaggerated" in paragraph 3 is closest in meaning to', ['made to seem larger than they really were', 'carefully checked by other scientists', 'based on a very large number of children', 'published in many different countries'], 'B2', 'the early positive findings were exaggerated', `Dạng VOCABULARY. Các kết quả tích cực ban đầu bị "exaggerated" vì nghiên cứu không tìm thấy khác biệt ít được công bố → bị phóng đại, tức làm cho có vẻ lớn hơn thực tế.`, 'vocab'),
Q(17, 'What can be inferred from paragraph 4 about the later start of dementia symptoms in bilingual patients?', ['The brain may keep working normally for longer despite damage.', 'Speaking multiple languages permanently prevents the onset of brain dementia.', 'Monolingual individuals generally seek medical attention at an earlier stage.', 'The physical destruction of neural tissue tends to remain significantly milder.'], 'C1', 'a buffer that allows the brain to keep working normally', `Dạng INFERENCE. Tác giả cho rằng "cognitive reserve" là "a buffer that allows the brain to keep working normally even as some of its tissue is damaged" → não có thể hoạt động bình thường lâu hơn dù có tổn thương, chứ không hề ngăn được bệnh.`, 'inference'),
Q(18, 'What is the function of the sentence "Scientists do not claim that speaking two languages prevents dementia"?', ['To prevent readers from misunderstanding the findings', 'To propose an entirely new biological model of human memory', 'To challenge the validity of earlier scientific studies on aging', 'To suggest that bilingualism offers no measurable mental benefits'], 'B2', 'Scientists do not claim that speaking two languages prevents dementia.', `Dạng SENTENCE FUNCTION. Câu này giới hạn lại kết luận: nói hai ngôn ngữ chỉ làm triệu chứng xuất hiện muộn chứ không ngăn bệnh, nhằm tránh người đọc hiểu sai kết quả nghiên cứu.`, 'purpose'),
Q(19, 'According to paragraph 5, what is one small cost of being bilingual?', ['A slightly smaller vocabulary in each language', 'A significantly impaired capacity to remember unfamiliar faces', 'A measurable reduction in overall reading speed across contexts', 'Greater difficulty understanding the nuances of foreign cultures'], 'B1', 'slightly smaller vocabularies in each language', `Dạng FACTUAL. Đoạn 5 nói người song ngữ thường có "slightly smaller vocabularies in each language" – vốn từ mỗi ngôn ngữ hơi nhỏ hơn – và mất thêm một phần giây để nhớ từ.`, 'factual'),
Q(20, 'What does paragraph 5 suggest about the author\'s overall view of raising children bilingually?', ['It is safe and worthwhile for families.', 'It should be avoided until children read well.', 'It is useful only for future scientists.', 'It should replace instruction in the first language.'], 'B2', 'no scientific reason to avoid raising children with two languages', `Dạng INFERENCE. Tác giả kết luận "there is no scientific reason to avoid raising children with two languages" và coi các chi phí là nhỏ so với lợi ích → nuôi dạy con song ngữ an toàn và đáng làm.`, 'inference'),
])],
});

/* ===================================================================
* LISTENING · Listen and Choose a Response (câu 1–8)
* =================================================================== */
const RESP = [
{ s: 'A', t: `The gym is so crowded tonight that I can't find a free treadmill.`,
options: [`Let's try again after nine; it usually empties out then.`, `The treadmill was repaired last month.`, `I prefer to run outside in the summer.`, `Yes, the gym is on the second floor.`], lv: 'B1',
explain: `Câu than phiền phòng gym quá đông, không còn máy chạy → phản hồi hợp lý là đề xuất giải pháp: quay lại sau chín giờ khi vắng hơn. Các phương án khác chỉ lặp lại "treadmill" hoặc "gym" mà không đáp lại tình huống.` },
{ s: 'B', t: `I just heard that my internship application was accepted!`,
options: [`Congratulations! When do you start?`, `I accept your apology.`, `The application is available online.`, `He applied to three companies last year.`], lv: 'A2',
explain: `Người nói báo tin vui được nhận thực tập → phản hồi tự nhiên là chúc mừng và hỏi bao giờ bắt đầu. "I accept your apology" là bẫy lặp từ "accepted" với nghĩa khác.` },
{ s: 'A', t: `Would it be all right if I turned in the lab summary a day late?`,
options: [`I can accept it by Friday noon, but not later.`, `It was a long day for everyone.`, `The lab is open until eight tonight.`, `I submitted my summary last Friday.`], lv: 'B1',
explain: `Câu xin phép nộp bài trễ một ngày → phản hồi đúng là cho biết điều kiện: chấp nhận đến trưa thứ Sáu, không muộn hơn. Các phương án còn lại chỉ nhắc lại "day", "lab", "summary" nhưng không trả lời lời xin phép.` },
{ s: 'B', t: `Do you know whether the clinic takes walk-ins on Saturdays?`,
options: [`I think it's closed on weekends, but you can call the nurse line.`, `My walk to the clinic takes ten minutes.`, `Saturdays are my favorite days of the week.`, `Yes, the nurse is very friendly.`], lv: 'B2',
explain: `Câu hỏi gián tiếp về việc phòng khám có nhận khách không hẹn vào thứ Bảy không → trả lời trực tiếp: hình như đóng cửa cuối tuần nhưng có thể gọi đường dây y tá. "My walk … takes ten minutes" là bẫy lặp từ "walk".` },
{ s: 'A', t: `I've been trying to reach the shipping company all morning, but the line is always busy.`,
options: [`Maybe you could send them a message through their website.`, `I'll wait for the next ship.`, `The morning train is faster than the bus.`, `Yes, they have a new line of products.`], lv: 'B1',
explain: `Người nói gặp sự cố: gọi cả sáng mà máy bận → phản hồi hợp lý là gợi ý cách khác: nhắn tin qua trang web. "a new line of products" là bẫy lặp từ "line" với nghĩa khác.` },
{ s: 'B', t: `How come the coral exhibit is closed today?`,
options: [`They're changing the water filters, I think.`, `It closes at five o'clock every day.`, `Corals only live in warm water.`, `I'd like two tickets for the exhibit, please.`], lv: 'B1',
explain: `"How come" tương đương "Why" → hỏi lý do triển lãm san hô đóng cửa; câu trả lời đúng nêu lý do: họ đang thay bộ lọc nước. Phương án nói giờ đóng cửa hằng ngày không giải thích vì sao hôm nay đóng.` },
{ s: 'A', t: `Our group still hasn't decided who will present the budget.`,
options: [`Why don't we let Ravi do it? He has the clearest slides.`, `The budget meeting was very long.`, `I already chose a name for our group.`, `Present me with the schedule first.`], lv: 'B1',
explain: `Câu nêu một vấn đề chưa giải quyết → phản hồi tự nhiên là đề xuất người trình bày: "Why don't we let Ravi do it?" kèm lý do. Các phương án khác chỉ lặp "budget", "group", "present" mà không giải quyết vấn đề.` },
{ s: 'B', t: `Would you rather study in the quiet room or in the lounge?`,
options: [`The quiet room; I get distracted by conversation.`, `I study biology and chemistry this term.`, `The lounge was painted last year.`, `Yes, I would.`], lv: 'A2',
explain: `Câu hỏi lựa chọn "A or B" → phải chọn một và có thể nêu lý do: phòng yên tĩnh vì dễ bị phân tâm khi có người nói chuyện. "Yes, I would." không chọn phương án nào nên không trả lời được câu hỏi.` },
];
const respScript = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
RESP.forEach((r, i) => { respScript.push({ say: 'Number ' + (i + 1) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
TF.listening.push({
id: 'tf8-lr', set: 8, task: 'response', title: 'Choose a Response · Set 8',
speakers: { A: { name: 'Speaker 1', accent: 'en-US', gender: 'f' }, B: { name: 'Speaker 2', accent: 'en-US', gender: 'm' } },
script: respScript,
groups: [mc('Listen to each sentence and choose the best response.', RESP.map((r, i) => ({ n: i + 1, q: 'Choose the best response to sentence ' + (i + 1) + '.', options: r.options, a: 0, lv: r.lv, cue: r.t, explain: r.explain })))],
});

/* ===================================================================
* LISTENING · Listen to a Conversation (câu 1–8, 33–37)
* =================================================================== */
TF.listening.push({
id: 'tf8-lc1', set: 8, task: 'conversation', title: 'At the Fitness Center Desk',
speakers: { S: { name: 'Student (Hana)', accent: 'en-US', gender: 'f' }, W: { name: 'Desk attendant', accent: 'en-US', gender: 'm' } },
script: [
say('Listen to a conversation between a student and a fitness center attendant.'), pz,
L('S', `Hi, I'd like to sign up for the swimming lanes. Do I need to reserve a time?`),
L('W', `Lap swimming is first-come, first-served in the morning, but from five to eight in the evening you have to reserve a lane online. It gets crowded.`),
L('S', `Oh, I usually come after my seminar, around six. How far ahead can I book?`),
L('W', `Up to forty-eight hours. Just remember that a reservation is canceled if you're more than ten minutes late.`),
L('S', `Good to know. Also, I heard the pool will close for maintenance. Is that true?`),
L('W', `Yes, from the twentieth to the twenty-fourth of this month, the filters are being replaced. During that week, we recommend the indoor track instead, which is open until eleven.`),
L('S', `Do I need a separate pass for the track?`),
L('W', `No, your student ID covers everything. And if you want a locker, the small ones are free for the day; you just bring your own lock.`),
L('S', `Perfect. I'll book tomorrow at six, then.`),
],
groups: [mc('Answer the questions about the conversation.', [
Q(1, 'What does the student want to do?', ['Arrange a time to swim laps', 'Join a swimming class for beginners', 'Rent a locker for the semester', 'Buy a pass for the indoor track'], 'A2', 'sign up for the swimming lanes', `Sinh viên mở đầu bằng "I'd like to sign up for the swimming lanes" và hỏi có cần đặt giờ không → cô muốn sắp xếp giờ bơi theo làn. Khóa học cho người mới hay thuê tủ không phải mục đích chính.`),
Q(2, 'What happens if a swimmer arrives more than ten minutes late?', ['The lane reservation is canceled.', 'The swimmer must pay a late fee.', 'The swimmer is moved to the morning session.', 'The swimmer can only use the indoor track.'], 'B1', 'a reservation is canceled if you\'re more than ten minutes late', `Nhân viên nói rõ: "a reservation is canceled if you're more than ten minutes late" → đặt chỗ bị hủy nếu đến trễ hơn mười phút. Không có phí trễ nào được nhắc tới.`),
Q(3, 'What does the attendant recommend during the week of maintenance?', ['Using the indoor track', 'Swimming in the morning', 'Visiting a different campus', 'Booking a lane forty-eight hours ahead'], 'B1', 'we recommend the indoor track instead', `Khi hồ bơi đóng để thay bộ lọc, nhân viên nói "we recommend the indoor track instead" → khuyên dùng đường chạy trong nhà, mở đến 11 giờ đêm.`),
Q(4, 'What will the student probably do next?', ['Reserve a lane for the following evening', 'Buy a lock at the front desk', 'Bring a doctor\'s note on Monday', 'Come back during the maintenance week'], 'B1', 'I\'ll book tomorrow at six', `Câu cuối của sinh viên "I'll book tomorrow at six, then" → cô sẽ đặt làn bơi cho 6 giờ tối ngày mai. Ổ khóa phải tự mang, nên cô không mua ở quầy.`),
])],
});
TF.listening.push({
id: 'tf8-lc2', set: 8, task: 'conversation', title: 'Advice about an Internship Application',
speakers: { S: { name: 'Student (Callum)', accent: 'en-GB', gender: 'm' }, A: { name: 'Career advisor', accent: 'en-GB', gender: 'f' } },
script: [
say('Listen to a conversation between a student and a career advisor.'), pz,
L('S', `Hi, I wanted to ask about the museum education internship that was posted last week. I've never worked in a museum, so I'm not sure I'm qualified.`),
L('A', `Don't count yourself out. Employers tell us they care more about skills than experience. What have you done that involved explaining ideas to groups?`),
L('S', `I led campus tours for prospective students. Does that count?`),
L('A', `It absolutely does. Put it on your résumé with numbers: how many groups, how many visitors, how often you led a tour. Specifics persuade readers.`),
L('S', `Okay. Should I also write a long cover letter?`),
L('A', `The posting asks for one page, so keep it to one page. Mention the tours and say what you'd like to learn.`),
L('S', `And the deadline is the fifteenth. Can I send it a day early?`),
L('A', `I'd send it two days early, honestly. Systems fail at the last minute. And come back here before you submit; I'm happy to read it.`),
],
groups: [mc('Answer the questions about the conversation.', [
Q(5, 'Why is the student hesitant to apply?', ['He has no experience working in a museum.', 'He thinks the deadline has already passed.', 'He does not know how to write a cover letter.', 'He is unsure whether the position is paid.'], 'B1', 'I\'m not sure I\'m qualified', `Sinh viên nói "I've never worked in a museum, so I'm not sure I'm qualified" → anh e ngại vì chưa có kinh nghiệm làm việc ở bảo tàng. Hạn nộp và thư xin việc được bàn sau đó.`),
Q(6, 'According to the advisor, what do employers care about most?', ['Skills rather than experience', 'Long cover letters, beyond one page', 'The student\'s major, if unrelated', 'Previous museum visits, if brief'], 'B1', 'care more about skills than experience', `Cố vấn nói nhà tuyển dụng "care more about skills than experience" → họ coi trọng kỹ năng hơn là kinh nghiệm làm việc trước đó.`),
Q(7, 'What does the advisor suggest the student do on his résumé?', ['Describe his tour experience with specific numbers', 'List every academic course he has taken, even electives', 'Explain why he left his previous job, noting personal reasons', 'Add a photograph of a campus tour showing group and a landmark'], 'B1', 'Put it on your résumé with numbers', `Cố vấn khuyên đưa việc dẫn tour vào hồ sơ "with numbers: how many groups, how many visitors" vì "Specifics persuade readers" → mô tả bằng số liệu cụ thể.`),
Q(8, 'What does the advisor imply when she says "Systems fail at the last minute"?', ['Applying early avoids technical problems near the deadline.', 'The museum\'s website is often broken, especially on deadline days.', 'Applications sent early receive a higher score, as reviewers like them.', 'The student should apply by phone instead, since the website crashes.'], 'B2', 'Systems fail at the last minute', `Câu hỏi hàm ý: cô khuyên gửi sớm hai ngày vì hệ thống nộp đơn dễ trục trặc vào phút chót → nộp sớm để tránh lỗi kỹ thuật gần hạn. Cô không nói trang web hay hỏng, hay điểm cao hơn cho đơn nộp sớm.`),
])],
});
TF.listening.push({
id: 'tf8-lc3', set: 8, task: 'conversation', title: 'A Funding Request for the Hiking Club',
speakers: { S: { name: 'Student (Marco)', accent: 'en-US', gender: 'm' }, T: { name: 'Treasurer (Elena)', accent: 'en-GB', gender: 'f' } },
script: [
say('Listen to a conversation between a club president and a student government treasurer.'), pz,
L('T', `Hi Marco. You wanted to talk about the Hiking Club's funding request?`),
L('S', `Yes. We'd like money to rent a van for a trip to the national forest in October. I filled out the form, but I got an email saying it was incomplete.`),
L('T', `Let me look. Ah, the problem is the quote. We need an official price quote from the rental company, not just a screenshot of their website.`),
L('S', `I didn't realize that. How long does a quote take?`),
L('T', `Usually one business day if you call. Also, your request is for twelve hundred dollars, but our limit for a single trip is eight hundred.`),
L('S', `Oh. Then maybe we could cover the rest with membership dues?`),
L('T', `That works, and it actually helps your case, since committees like to see clubs contribute. The funding committee meets Thursday at five. If I get the quote by Wednesday evening, I can add you to the agenda.`),
L('S', `I'll call the company this afternoon.`),
],
groups: [mc('Answer the questions about the conversation.', [
Q(33, 'Why was the club\'s request sent back?', ['It did not include an official price quote.', 'It asked for more than the club has ever received.', 'It was submitted after the deadline.', 'It was missing the signature of the club advisor.'], 'B1', 'We need an official price quote from the rental company', `Elena giải thích "the problem is the quote": cần báo giá chính thức từ công ty cho thuê xe, không phải ảnh chụp màn hình trang web → đơn thiếu báo giá chính thức.`),
Q(34, 'What is the maximum amount the student government gives for one trip?', ['Eight hundred dollars', 'Twelve hundred dollars', 'Four hundred dollars', 'Five hundred dollars'], 'B1', 'our limit for a single trip is eight hundred', `Treasurer nói "our limit for a single trip is eight hundred" → mức tối đa cho một chuyến là 800 đô la. 1.200 đô la là số tiền câu lạc bộ xin, vượt mức cho phép.`),
Q(35, 'How does Marco propose to pay the remaining cost?', ['With the club\'s membership dues', 'With a loan from the treasurer', 'By renting a smaller van', 'By asking the national forest for support'], 'B1', 'cover the rest with membership dues', `Marco đề nghị "cover the rest with membership dues" → dùng phí thành viên của câu lạc bộ để trả phần còn lại.`),
Q(36, 'Why does the treasurer say the plan "helps your case"?', ['Committees prefer clubs that contribute their own money.', 'Membership dues are tax-free.', 'The committee has too little money to pay everything.', 'The plan removes the need for a quote.'], 'B2', 'committees like to see clubs contribute', `Elena giải thích "committees like to see clubs contribute" → ủy ban thích các câu lạc bộ tự đóng góp, nên đề xuất dùng phí thành viên củng cố hồ sơ. Báo giá vẫn bắt buộc.`),
Q(37, 'What must happen before Marco can be added to Thursday\'s agenda?', ['The treasurer must receive the quote by Wednesday evening.', 'The club must collect twelve hundred dollars in fees before the meeting.', 'The committee must meet on Wednesday to approve the budget for the trip.', 'Marco must call the committee on Thursday to confirm the van rental details.'], 'B1', 'If I get the quote by Wednesday evening', `Elena nói "If I get the quote by Wednesday evening, I can add you to the agenda" → cô phải nhận được báo giá trước tối thứ Tư thì mới đưa vào chương trình họp thứ Năm.`),
])],
});

/* ===================================================================
* LISTENING · Listen to an Announcement (câu 1–6, 38–41)
* =================================================================== */
TF.listening.push({
id: 'tf8-la1', set: 8, task: 'announcement', title: 'Club Showcase Announcement',
speakers: { A: { name: 'Announcer', accent: 'en-US', gender: 'f' } },
script: [
say('Listen to an announcement on a university campus.'), pz,
L('A', `Good afternoon, students. The Fall Club Showcase will take place this Thursday from noon to four on the central lawn. Over eighty student organizations will have tables, from the chess club to the robotics team.`),
L('A', `If it rains, the event will move indoors to the Student Union, and tables will be assigned by the first letter of each club's name. Club leaders, please collect your table number from the Activities Office before Wednesday at five, and remember that clubs cannot sell food without a permit.`),
L('A', `Students who visit at least five tables and collect stamps on the event flyer will be entered into a drawing for a campus bookstore gift card.`),
],
groups: [mc('Answer the questions about the announcement.', [
Q(1, 'What is the announcement mainly about?', ['A large event where student clubs present themselves', 'A new rule about selling food on campus, needing permits', 'A competition between two robotics teams, judged by faculty', 'A change in the hours of the Activities Office, starting term'], 'B1', 'Fall Club Showcase', `Người thông báo mở đầu bằng "The Fall Club Showcase will take place this Thursday" và nói hơn tám mươi tổ chức sinh viên sẽ có bàn giới thiệu → chủ đề chính là sự kiện giới thiệu các câu lạc bộ.`),
Q(2, 'What will happen if it rains on Thursday?', ['The event will move to the Student Union.', 'The event will be postponed to Friday.', 'Only half of the clubs will have tables.', 'Club leaders will receive a refund.'], 'A2', 'the event will move indoors to the Student Union', `"If it rains, the event will move indoors to the Student Union" → nếu mưa, sự kiện chuyển vào trong nhà ở Student Union, không hoãn sang ngày khác.`),
Q(3, 'How can a student enter the drawing for the gift card?', ['By visiting at least five tables and collecting stamps', 'By joining at least five clubs and attending a brief info session', 'By picking up a table number early from the Activities Office', 'By bringing a food permit to the lawn and showing it at the table'], 'B1', 'visit at least five tables and collect stamps', `Cuối thông báo: sinh viên "visit at least five tables and collect stamps on the event flyer" sẽ được tham gia bốc thăm thẻ quà tặng. Giấy phép bán thức ăn là yêu cầu dành cho các câu lạc bộ.`),
])],
});
TF.listening.push({
id: 'tf8-la2', set: 8, task: 'announcement', title: 'Recreation Center Finals Schedule',
speakers: { A: { name: 'Announcer', accent: 'en-GB', gender: 'm' } },
script: [
say('Listen to an announcement at a university recreation center.'), pz,
L('A', `Attention, members of the recreation center. Beginning next Monday, the center will follow its reduced finals-week schedule.`),
L('A', `The weight room will open at seven in the morning instead of six, but it will stay open until midnight. Group exercise classes are suspended for the week, except for the yoga class on Wednesday at noon, which will meet in the dance studio.`),
L('A', `Finally, the equipment checkout desk will close at nine every night. Please return any borrowed items, such as basketballs and jump ropes, before then to avoid a late fee of two dollars per item.`),
],
groups: [mc('Answer the questions about the announcement.', [
Q(4, 'What change is being made to the weight room?', ['It will open one hour later than usual and close at midnight.', 'It will be closed for the entire week, with no access for any members.', 'It will open at six and close at nine, limiting use to early hours only.', 'It will be used only for group classes, so personal workouts will be barred.'], 'B1', 'open at seven in the morning instead of six', `Phòng tạ "will open at seven in the morning instead of six" → mở trễ hơn một giờ so với thường lệ, nhưng "will stay open until midnight" → đóng cửa lúc nửa đêm.`),
Q(5, 'Which class will still be offered during finals week?', ['The yoga class on Wednesday', 'The swimming class on Monday', 'The dance class on Friday', 'The basketball class every evening'], 'A2', 'except for the yoga class on Wednesday at noon', `Các lớp tập nhóm bị hoãn cả tuần "except for the yoga class on Wednesday at noon" → chỉ lớp yoga trưa thứ Tư vẫn diễn ra, tại phòng khiêu vũ.`),
Q(6, 'Why should members return equipment before nine?', ['To avoid paying a late fee', 'Because the desk will be cleaned', 'To qualify for a free class', 'Because the items are being sold'], 'B1', 'to avoid a late fee of two dollars per item', `Người nói yêu cầu trả đồ trước chín giờ "to avoid a late fee of two dollars per item" → để tránh phí trễ hai đô la mỗi món.`),
])],
});
TF.listening.push({
id: 'tf8-la3', set: 8, task: 'announcement', title: 'Counseling Center Drop-In Hours',
speakers: { A: { name: 'Announcer', accent: 'en-US', gender: 'f' } },
script: [
say('Listen to an announcement on a university campus.'), pz,
L('A', `Hello, everyone. The Counseling Center is introducing a drop-in service this term. Every Tuesday and Thursday from one to three, any student can walk in and talk with a counselor for up to twenty minutes, with no appointment and no paperwork.`),
L('A', `This is not meant to replace regular therapy sessions, which still require an appointment. Instead, it's a quick way to get advice about stress, sleep, or time management.`),
L('A', `In addition, a free workshop on managing exam anxiety will be held in the library's seminar room on Monday at four. Seats are limited to thirty, so please sign up on the center's website. Everything you say at the center remains confidential.`),
],
groups: [mc('Answer the questions about the announcement.', [
Q(38, 'What new service is being introduced?', ['Short walk-in talks with a counselor', 'A weekly sleep clinic in the library', 'Free therapy sessions for all students', 'An online tutoring program'], 'B1', 'introducing a drop-in service', `"The Counseling Center is introducing a drop-in service" – dịch vụ mới là các buổi nói chuyện ngắn với cố vấn mà không cần hẹn trước.`),
Q(39, 'How long can a drop-in visit last?', ['Up to twenty minutes', 'Up to one hour', 'Up to thirty minutes', 'Up to three hours'], 'A2', 'for up to twenty minutes', `Sinh viên có thể nói chuyện với cố vấn "for up to twenty minutes" → tối đa hai mươi phút. Con số một đến ba giờ là khung giờ mở cửa của dịch vụ, không phải thời lượng mỗi lượt.`),
Q(40, 'What does the announcer say about regular therapy sessions?', ['They will continue and still require an appointment.', 'They will be replaced by the new service, which needs no appointments.', 'They will be offered only in the library, during limited weekday hours.', 'They will be free for the first twenty students who sign up online.'], 'B1', 'not meant to replace regular therapy sessions', `Người thông báo nói dịch vụ mới "is not meant to replace regular therapy sessions, which still require an appointment" → các buổi trị liệu thông thường vẫn tiếp tục và cần đặt lịch hẹn.`),
Q(41, 'How can students attend the exam anxiety workshop?', ['By signing up on the center\'s website', 'By arriving early on Monday', 'By calling the library', 'By bringing a note from a counselor'], 'A2', 'sign up on the center\'s website', `Hội thảo giới hạn ba mươi chỗ nên "please sign up on the center's website" → phải đăng ký trên trang web của trung tâm.`),
])],
});

/* ===================================================================
* LISTENING · Listen to an Academic Talk (câu 1–10, 42–47)
* =================================================================== */
TF.listening.push({
id: 'tf8-lt1', set: 8, task: 'talk', title: 'Business: The Bullwhip Effect',
speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'f' } },
script: [
say('Listen to part of a talk in a business class.'), pz,
L('P', `Let's talk about a puzzling problem in supply chains: why do small changes in customer demand create huge swings in orders further up the chain? Economists call this the bullwhip effect, because a small flick of the wrist at the handle of a whip becomes a violent crack at the tip.`),
L('P', `Here is an example. Suppose shoppers at a grocery store buy ten percent more yogurt one week. The store manager, worried about running out, orders twenty percent more from the distributor. The distributor, who also fears shortages, orders thirty percent more from the factory. By the time the signal reaches the factory, a small rise in demand looks like a boom, so the factory expands production.`),
L('P', `Then, the next week, shoppers go back to normal. Now everyone in the chain is holding too much yogurt, and orders collapse. The factory may even have to throw away product that spoils.`),
L('P', `Why does this happen? Mostly because each company sees only the orders from the company directly below it, not what customers are actually buying. And each one adds a safety margin, so the margins pile up.`),
L('P', `One solution is information sharing. When retailers share their daily sales data with suppliers, the factory can see real demand instead of exaggerated orders. Some companies have also shortened their ordering cycles, so they place small orders often instead of big orders rarely. Both changes reduce the swings.`),
],
groups: [mc('Answer the questions about the talk.', [
Q(1, 'What is the talk mainly about?', ['Why small changes in demand become large swings in orders', 'How grocery stores choose their suppliers, based on price', 'Why yogurt spoils faster than other foods, due to its moisture content', 'How factories train workers to expand production, using new automation'], 'B1', 'bullwhip effect', `Giáo sư mở đầu bằng câu hỏi vì sao thay đổi nhỏ của nhu cầu tạo dao động lớn của đơn hàng và gọi hiện tượng này là "the bullwhip effect" → đó là chủ đề chính; yogurt chỉ là ví dụ minh họa.`),
Q(2, 'Why does the professor mention a whip?', ['To show how a small movement becomes much larger at the end', 'To compare supply chains with farm work, highlighting harvest timing.', 'To explain why orders arrive late, attributing issue to shipping delays.', 'To suggest that managers should act more gently, urging a softer style.'], 'B2', 'a small flick of the wrist at the handle of a whip', `Ví dụ cái roi: cú vẩy nhỏ ở cán thành cú quất mạnh ở đầu roi → hình ảnh minh họa việc thay đổi nhỏ ở cuối chuỗi cung ứng bị khuếch đại dần khi đi ngược lên.`),
Q(3, 'In the yogurt example, why does the distributor order thirty percent more?', ['The distributor also fears running out of stock.', 'The factory offered a discount.', 'Customers asked for a new flavor.', 'The store manager ordered thirty percent more.'], 'B1', 'who also fears shortages', `Giáo sư nói nhà phân phối, "who also fears shortages", đặt thêm ba mươi phần trăm → cũng sợ thiếu hàng như người quản lý cửa hàng. Cửa hàng chỉ đặt thêm hai mươi phần trăm.`),
Q(4, 'According to the professor, what is one main cause of the bullwhip effect?', ['Each company sees only the orders of the company directly below it.', 'Customers change their minds about brands too often, causing retailers to overorder.', 'Factories refuse to share their prices, preventing downstream firms from planning.', 'Retailers order from several distributors at once, trying to secure better prices.'], 'B2', 'each company sees only the orders from the company directly below it', `Nguyên nhân chính được nêu: mỗi công ty chỉ thấy đơn hàng của công ty ngay phía dưới chứ không thấy "what customers are actually buying" – người mua thật sự mua gì, cộng với việc mỗi bên thêm một biên an toàn.`),
Q(5, 'What would most likely happen if a factory could see the supermarket\'s daily sales?', ['It would be less likely to produce too much.', 'It would raise the prices of its products.', 'It would stop selling to distributors.', 'It would order from more suppliers.'], 'B2', 'the factory can see real demand instead of exaggerated orders', `Câu suy luận: khi chia sẻ dữ liệu bán hàng hằng ngày, nhà máy "can see real demand instead of exaggerated orders" → ít có khả năng sản xuất dư thừa. Bài không nói về việc tăng giá hay đổi nhà cung cấp.`),
])],
});
TF.listening.push({
id: 'tf8-lt2', set: 8, task: 'talk', title: 'Marine Science: Restoring Coral Reefs',
speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'm' } },
script: [
say('Listen to part of a talk in a marine science class.'), pz,
L('P', `Last time we saw that corals bleach when the water gets too warm. Today's question: can we put reefs back together? One technique is called coral gardening, and it works a bit like a plant nursery.`),
L('P', `Divers collect small fragments of healthy coral that have been broken off by storms. These fragments would normally die on the sand, but in a nursery they're hung on frames or ropes in calm, clean water. Corals grow surprisingly fast under those conditions; some branching species can double in size within a year.`),
L('P', `When the fragments are large enough, divers attach them to damaged reef using cement or small plastic ties. The aim isn't just to add coral. It's to give the reef a head start, so fish and other organisms return and the ecosystem rebuilds itself.`),
L('P', `Now, a caution. Restoration works best for fast-growing branching corals. Slow, boulder-shaped corals can take decades, so planting them isn't practical on a large scale. Also, if the water stays too warm, even transplanted corals will bleach. No amount of gardening can solve that on its own.`),
L('P', `So most scientists see restoration as a way to buy time, while the bigger task is to reduce the carbon emissions that cause warming.`),
],
groups: [mc('Answer the questions about the talk.', [
Q(6, 'What is the main topic of the talk?', ['A technique for rebuilding damaged reefs', 'The causes of storms in the ocean', 'How to photograph coral safely', 'Why boulder corals are popular with divers'], 'B1', 'coral gardening', `Giáo sư hỏi "can we put reefs back together?" và giới thiệu kỹ thuật "coral gardening" → chủ đề là phương pháp phục hồi rạn san hô bị hư hại.`),
Q(7, 'Why are coral fragments placed in a nursery?', ['The conditions there let them survive and grow quickly.', 'Divers can sell them to aquariums, giving clubs a source of income.', 'The sand there is richer in minerals, giving corals extra nutrients.', 'Storms cannot reach the frames, protecting the fragments from damage.'], 'B1', 'in calm, clean water', `Mảnh san hô để trên bãi cát thường chết, còn trong vườn ương chúng được treo "in calm, clean water" và lớn khá nhanh → điều kiện ở đó giúp chúng sống sót và phát triển.`),
Q(8, 'What is the purpose of attaching fragments to the damaged reef?', ['To give the reef a head start so other organisms return', 'To protect the reef from divers, preventing damage during research', 'To measure how fast the cement hardens, using an ultrasonic device', 'To replace the ocean\'s natural currents, installing flow generators'], 'B2', 'give the reef a head start', `Giáo sư nói mục đích không chỉ là thêm san hô mà là "give the reef a head start, so fish and other organisms return" → tạo đà ban đầu để sinh vật khác quay lại và hệ sinh thái tự tái thiết.`),
Q(9, 'Why is it not practical to plant slow, boulder-shaped corals on a large scale?', ['They can take decades to grow.', 'They bleach at lower temperatures.', 'They cannot be attached with cement.', 'They are eaten by fish.'], 'B1', 'can take decades', `Giáo sư cảnh báo san hô khối chậm lớn "can take decades" → mất hàng chục năm để lớn nên không thực tế khi trồng quy mô lớn.`),
Q(10, 'What does the professor imply when he says restoration can "buy time"?', ['It does not fix the underlying cause of the damage.', 'It is cheaper in the short run than emissions reductions', 'It makes coral colonies reach maturity in just a single year', 'It allows divers to bypass the coral nursery phase entirely'], 'C1', 'buy time', `Câu hỏi hàm ý: phục hồi chỉ "buy time" (câu giờ) trong khi nhiệm vụ lớn hơn là giảm khí thải gây nóng lên → nó không giải quyết nguyên nhân gốc. Bài không so sánh chi phí.`),
])],
});
TF.listening.push({
id: 'tf8-lt3', set: 8, task: 'talk', title: 'Engineering: Storing Energy for the Grid',
speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
script: [
say('Listen to part of a talk in an engineering class.'), pz,
L('P', `Let's turn to a problem that every country building wind and solar power eventually faces: the sun sets, the wind drops, yet people still turn on their lights. So how do we store electricity? The honest answer is that no single technology does everything well, so grids use several.`),
L('P', `The oldest method is pumped storage. When electricity is cheap, pumps move water from a lower lake to an upper one. When demand rises, the water flows back down through turbines. It's efficient, since roughly three quarters of the energy comes back, and plants can last a century. But it needs the right geography, two lakes at different heights, and years of construction.`),
L('P', `The newer method is the lithium-ion battery, the same chemistry as in your phone, only in giant containers. They can be built almost anywhere, within months, and they react in a fraction of a second, which helps stabilize the grid. Their weakness is cost per hour of storage. Most are designed to deliver power for about four hours. Beyond that, they become expensive.`),
L('P', `Which brings us to a third group, long-duration storage: for example, batteries that keep energy in liquid tanks, or systems that compress air in underground caverns. These are slower and less efficient, but they can supply power for many hours or days, when a long windless spell arrives.`),
L('P', `Notice that the question to ask isn't which technology is best, but which one is best for a particular job: rapid response or long duration.`),
],
groups: [mc('Answer the questions about the talk.', [
Q(42, 'What is the talk mainly about?', ['The different ways electricity can be stored for the grid', 'How phone batteries are manufactured, covering raw material sourcing.', 'Why wind power is cheaper than solar power, because of lower costs.', 'The history of hydroelectric dams, from projects to modern plants.'], 'B1', 'how do we store electricity', `Giáo sư đặt câu hỏi "how do we store electricity?" rồi lần lượt trình bày ba nhóm công nghệ lưu trữ → chủ đề là các cách lưu trữ điện cho lưới điện.`),
Q(43, 'According to the professor, what is one disadvantage of pumped storage?', ['It needs suitable geography and years of construction.', 'It returns very little of the energy, sixty percent efficient.', 'It lasts only a few years, so it is less durable than plants.', 'It reacts too quickly to demand changes, leading to instability.'], 'B1', 'years of construction', `Nhược điểm của thủy điện tích năng: cần "the right geography, two lakes at different heights, and years of construction". Nó hiệu quả (khoảng ba phần tư năng lượng quay lại) và bền hàng thế kỷ.`),
Q(44, 'What advantage of lithium-ion batteries does the professor mention?', ['They can be built quickly almost anywhere.', 'They store energy for several days.', 'They cost less per hour of storage than lakes.', 'They use no chemicals.'], 'B1', 'They can be built almost anywhere, within months', `Pin lithium-ion "can be built almost anywhere, within months" và phản ứng trong một phần giây → ưu điểm là xây nhanh ở hầu hết mọi nơi. Chi phí theo giờ lưu trữ lại là điểm yếu.`),
Q(45, 'What is a limitation of most lithium-ion installations?', ['They are designed to supply power for only about four hours.', 'They cannot respond quickly to the grid.', 'They must be built near two lakes.', 'They are slower than compressed air systems.'], 'B1', 'about four hours', `Giáo sư nói "Most are designed to deliver power for about four hours. Beyond that, they become expensive" → hạn chế là chỉ cung cấp điện khoảng bốn giờ trước khi chi phí trở nên đắt đỏ.`),
Q(46, 'According to the professor, when is long-duration storage most useful?', ['During a long period with little wind', 'During sudden changes in phone use', 'When electricity is cheapest at noon', 'When lakes are frozen in winter'], 'B1', 'a long windless spell', `Hệ thống lưu trữ dài hạn cấp điện nhiều giờ hoặc nhiều ngày "when a long windless spell arrives" → hữu ích khi có thời gian dài gần như không có gió.`),
Q(47, 'What does the professor imply in her final statement?', ['Planners should choose a technology to match the job it must do.', 'One technology will soon replace all the others, making other devices useless.', 'Rapid response is more valuable than long duration, as quick fixes often win.', 'Students should avoid picking a technology, as choice may not fit assignment.'], 'B2', 'which one is best for a particular job', `Câu kết: câu hỏi cần đặt ra không phải công nghệ nào tốt nhất mà là "which one is best for a particular job" → nên chọn công nghệ phù hợp với nhiệm vụ cụ thể, vì không có công nghệ nào làm tốt mọi việc.`),
])],
});

/* ===================================================================
* WRITING · Build a Sentence (câu 1–10)
* =================================================================== */
TF.writing.push({
id: 'tf8-bs', set: 8, task: 'sentence', title: 'Build a Sentence · Set 8',
instr: 'Put the words in the correct order to make a grammatical response.',
items: [
{ n: 1, prompt: 'Did the clinic call you back about your appointment?', chunks: ['they', 'said', 'that', 'the doctor', 'would see me', 'on Thursday'], end: '.', alt: ['on Thursday they said that the doctor would see me'],
explain: `Câu tường thuật: "said that + mệnh đề"; "would" là dạng lùi thì của "will" khi tường thuật lời hẹn trong quá khứ. Cụm thời gian "on Thursday" đứng cuối câu.` },
{ n: 2, prompt: 'Why are you staying late at the library?', chunks: ['I need', 'to finish', 'the report', 'before', 'the deadline', 'tomorrow morning'], end: '.',
explain: `Cấu trúc "need + to V" (cần làm gì); "before + danh từ" chỉ thời điểm giới hạn; "tomorrow morning" bổ nghĩa cho "the deadline" nên đứng cuối.` },
{ n: 3, prompt: 'Do solar panels work at night?', chunks: ['they', 'do not', 'produce power', 'after', 'the sun', 'has set'], end: '.', alt: ['after the sun has set they do not produce power'],
explain: `"after + mệnh đề" = sau khi mặt trời lặn; mệnh đề thời gian dùng hiện tại hoàn thành "has set" (đã lặn). Có thể đưa "after the sun has set" lên đầu câu.` },
{ n: 4, prompt: 'Is the robotics club still accepting new members?', chunks: ['I', 'am not sure', 'whether', 'they', 'have', 'any spots left'], end: '.',
explain: `Câu hỏi lồng với "whether" (liệu có hay không): trật tự trần thuật "whether they have any spots left", không đảo "have" lên trước chủ ngữ.` },
{ n: 5, prompt: 'What did the coach say about Saturday\'s practice?', chunks: ['she', 'asked', 'us', 'to arrive', 'at least', 'ten minutes early'], end: '.',
explain: `Cấu trúc "ask + O + to V" (yêu cầu ai làm gì); "at least" (ít nhất) đứng trước cụm số lượng "ten minutes early".` },
{ n: 6, prompt: 'Could you tell me where the career center is?', chunks: ['it is', 'next to', 'the building', 'where', 'the clinic', 'is located'], end: '.',
explain: `"the building where the clinic is located" – mệnh đề quan hệ với "where" thay cho nơi chốn; trong mệnh đề này chủ ngữ "the clinic" đứng trước động từ "is located".` },
{ n: 7, prompt: 'Have the shipments arrived yet?', chunks: ['not all', 'of them', 'have', 'been delivered', 'since', 'the strike began'], end: '.', alt: ['since the strike began not all of them have been delivered'],
explain: `Hiện tại hoàn thành bị động "have been delivered" đi với "since + mệnh đề quá khứ đơn" ("the strike began"). "not all of them" là chủ ngữ phủ định một phần.` },
{ n: 8, prompt: 'Do you think bilingual children learn more slowly?', chunks: ['studies suggest', 'that', 'they', 'can', 'switch', 'between tasks', 'more easily'], end: '.',
explain: `"suggest that + mệnh đề" nêu kết quả nghiên cứu; trợ động từ "can" + động từ nguyên mẫu "switch"; so sánh hơn "more easily" đứng cuối câu.` },
{ n: 9, prompt: 'Which internship should I choose?', chunks: ['you', 'should', 'pick', 'the one', 'that', 'offers', 'more training'], end: '.',
explain: `Lời khuyên "you should + V"; "the one that offers more training" là mệnh đề quan hệ: "that" thay cho "the one" (chương trình thực tập), động từ "offers" chia số ít.` },
{ n: 10, prompt: 'Why was the concert moved indoors?', chunks: ['it', 'was', 'moved', 'because', 'heavy rain', 'was forecast', 'for the evening'], end: '.', alt: ['because heavy rain was forecast for the evening it was moved'],
explain: `Bị động quá khứ "was moved" cho kết quả, "because + mệnh đề" nêu nguyên nhân với bị động "was forecast". Mệnh đề "because …" có thể đứng đầu câu.` },
],
});

/* ===================================================================
* WRITING · Write an Email
* =================================================================== */
TF.writing.push({
id: 'tf8-em1', set: 8, task: 'email', title: 'Asking for a Recommendation Letter', minutes: 7,
scenario: 'You are applying for a summer internship at a natural history museum. The application requires a recommendation letter, and the deadline is in two weeks. You did well in a geology course taught by Professor Delgado.',
to: 'Professor Delgado',
points: ['Explain which internship you are applying for and why.', 'Describe the work you did in the professor\'s course that is relevant.', 'Ask her to write a letter and tell her the deadline.'],
model: `Dear Professor Delgado,\n\nI hope you are well. I am writing to ask whether you would be willing to write a recommendation letter for me. I am applying for a summer internship in the education department of the City Natural History Museum, where interns help lead tours and design activities for school groups. I would like to work there because I enjoy explaining science to non-experts.\n\nLast semester I took your Introduction to Geology course and earned an A. For my final project, I created a short guide to local rock formations for visitors to the state park, and you said it was clear and well organized. I believe this project shows the skills the museum is looking for.\n\nThe application is due on March 28, and the museum asks that letters be uploaded through an online form. I can send you my résumé and the internship description if that would help.\n\nThank you very much for considering my request.\n\nSincerely,\nAnh Pham`,
checklist: ['Lời chào lịch sự và nêu mục đích ngay đoạn đầu', 'Nêu rõ tên thực tập và lý do muốn ứng tuyển', 'Mô tả công việc cụ thể trong môn học liên quan (dự án, kết quả)', 'Đề nghị rõ ràng và ghi hạn nộp (28/3)', 'Giọng văn lịch sự, trang trọng với giảng viên', 'Có lời cảm ơn, kết thư và ký tên; khoảng 120–180 từ'],
tips: `Khi nhờ viết thư giới thiệu, hãy giúp giảng viên dễ làm: nói rõ vị trí, ngày hết hạn, cách nộp và chủ động gửi kèm tài liệu ("I can send you my résumé…"). Dùng câu hỏi lịch sự như "whether you would be willing to…".`,
});
TF.writing.push({
id: 'tf8-em2', set: 8, task: 'email', title: 'Confusing Clinic Hours', minutes: 7,
scenario: 'The online schedule for the Student Health Clinic said it was open until 5 p.m. on Fridays, but when you went there at 3 p.m., the door was locked and a sign said the clinic closes at 1 p.m. on Fridays.',
to: 'the clinic manager, Mr. Okoye',
points: ['Describe what happened.', 'Explain how this affected you.', 'Suggest how the clinic can prevent this problem.'],
model: `Dear Mr. Okoye,\n\nI am a first-year student, and I am writing about the Friday hours of the Student Health Clinic. The clinic's website says that it is open until 5 p.m. on Fridays. However, when I arrived at 3 p.m. last week, the door was locked, and a sign said the clinic closes at 1 p.m.\n\nI had planned my afternoon around this appointment because I had a fever and wanted to get a note for my professors. Because the clinic was closed, I had to wait until Monday, and I missed two classes. I later learned that other students had the same problem.\n\nI would like to suggest that the clinic update its website as soon as the hours change and post the same schedule on the door and in the student app. A short notice on the homepage would also help.\n\nThank you for looking into this.\n\nBest regards,\nLucas Meyer`,
checklist: ['Giới thiệu bản thân và nêu vấn đề ngay đầu thư', 'Mô tả sự việc cụ thể (giờ đăng, giờ thực tế, thời điểm đến)', 'Giải thích tác động bằng ví dụ (nghỉ học, trì hoãn khám)', 'Đề xuất giải pháp khả thi (đồng bộ lịch, thông báo)', 'Giọng điệu lịch sự, mang tính xây dựng', 'Lời kết phù hợp; khoảng 120–180 từ'],
tips: `Thư phàn nàn nên nêu sự việc bằng dữ kiện (giờ, ngày) thay vì cảm xúc, rồi chuyển sang đề xuất để người đọc thấy bạn muốn giải quyết vấn đề. Dùng "I would like to suggest that…" kèm động từ nguyên mẫu.`,
});

/* ===================================================================
* WRITING · Write for an Academic Discussion
* =================================================================== */
TF.writing.push({
id: 'tf8-ad1', set: 8, task: 'discussion', title: 'Should Children Begin a Second Language in Kindergarten?', minutes: 10,
professor: { name: 'Dr. Hartley', text: 'This week we are discussing language education. Some countries begin teaching a second language in kindergarten, when children are five years old, while others wait until secondary school. Supporters say young children learn languages more naturally; critics say the time would be better spent on reading and mathematics in the first language. What do you think: should schools begin second-language lessons in kindergarten? Why or why not?' },
students: [
{ name: 'Mei', text: 'I think they should start early. Young children copy sounds easily, and they are not afraid of making mistakes. By the time they reach secondary school, they would already be comfortable speaking.' },
{ name: 'Jorge', text: 'I disagree. If kindergartners are still learning to read in their own language, a second one could confuse them. It is better to build a strong base first and add the new language later.' },
],
model: `I agree with Mei that early exposure is valuable, but Jorge's concern about confusion is also reasonable. In my view, schools should begin in kindergarten, as long as the lessons are playful and short instead of formal. Songs, stories and games let children hear a new language without any pressure to read or write it, so they do not compete with first-language literacy. For example, a fifteen-minute daily song session in Spanish takes only a small part of the school day. Research on bilingual children also suggests that using two languages can improve attention, which supports the idea of starting early. Therefore, I believe the question is not whether to begin early, but how to design lessons that fit young children.`,
checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Nhắc đến ý của Mei hoặc Jorge và phản hồi', 'Thêm ý mới (ví dụ: bài học dạng trò chơi, ngắn)', 'Có ví dụ hoặc lý do cụ thể', 'Tối thiểu khoảng 100 từ, câu đa dạng', 'Câu kết tóm lại lập trường'],
tips: `Khi hai bạn bất đồng, hãy chọn một hướng nhưng thừa nhận lo ngại của bên kia, rồi đưa điều kiện hoặc giải pháp riêng ("as long as the lessons are…"). Ý mới giúp bài của bạn nổi bật hơn việc chỉ đồng ý.`,
});
TF.writing.push({
id: 'tf8-ad2', set: 8, task: 'discussion', title: 'Energy Storage or More Solar Panels?', minutes: 10,
professor: { name: 'Professor Nakamura', text: 'In our energy policy unit, we have seen that solar and wind power are growing quickly but produce electricity only at certain times. Some experts argue that governments should spend public money first on large batteries and other storage systems, so that clean power can be used whenever it is needed. Others argue that the money should go to building even more solar and wind farms, because more generation lowers prices. Which priority do you think is better, and why?' },
students: [
{ name: 'Tariq', text: 'I would choose storage. Without it, a lot of solar power is wasted at noon when nobody needs it, and then we burn gas in the evening. More panels will not fix that.' },
{ name: 'Elise', text: 'I prefer building more solar and wind. Storage is still expensive, and more generation brings the cost of electricity down quickly. We can add batteries later when they get cheaper.' },
],
model: `I agree with Tariq that storage deserves the first investment, but Elise is right that cost matters. When there is too much generation and no storage, extra solar power is simply wasted at midday, so new panels bring smaller and smaller benefits. A better plan is to link the two: governments could require every new solar farm to include a battery, which spreads the cost and ensures that the clean power is actually used in the evening. For instance, a farm with a four-hour battery can supply homes after sunset instead of forcing the grid to rely on gas plants. In my view, storage first, paired with steady growth in generation, is more effective than choosing only one of the two.`,
checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Phản hồi ý của Tariq hoặc Elise', 'Đưa ra lập luận mới (kết hợp pin vào mỗi dự án)', 'Có ví dụ minh họa cụ thể', 'Dùng từ nối: For instance, In my view, A better plan', 'Tối thiểu khoảng 100 từ'],
tips: `Chủ đề chính sách thường có cách dung hòa. Nêu lý do của bên bạn chọn, công nhận điểm đúng của bên kia, rồi đề xuất một giải pháp kết hợp kèm ví dụ cụ thể.`,
});

/* ===================================================================
* SPEAKING · Listen and Repeat
* =================================================================== */
TF.speaking.push({
id: 'tf8-rp1', set: 8, task: 'repeat', title: 'Club Fair Volunteer', accent: 'en-US',
context: 'You are volunteering at a student club fair. Listen to the organizer and repeat exactly what you hear.',
sentences: [
{ t: 'Please set up your table here.', tip: 'Câu ngắn – nhấn "TAble"; âm /eɪ/ trong "table" kéo dài hơn một chút.' },
{ t: 'The fair starts at noon.', tip: 'Nối "starts at" → /stɑːrtsət/; từ "noon" có âm /uː/ dài.' },
{ t: 'Each club has a banner and a sign-up sheet.', tip: 'Nối âm "has a" → /hæzə/; "banner" nhấn âm đầu /ˈbænər/.' },
{ t: 'Visitors can collect a stamp at every table.', tip: 'Nhấn "STAMP" và "EVery"; "every" thường đọc hai âm tiết /ˈevri/.' },
{ t: 'Please keep the walkways clear for people with wheelchairs.', tip: 'Nhấn "CLEAR" và "WHEELchairs"; âm cuối /z/ trong "wheelchairs".' },
{ t: 'If it starts to rain, we will move everything into the Student Union.', tip: 'Câu điều kiện – ngữ điệu lên ở "rain," rồi xuống ở cuối câu; "Student Union" nhấn "STUdent" và "UNion".' },
{ t: 'Clubs that want to sell snacks must show their permit to the organizers.', tip: 'Chia nhịp: "Clubs that want to sell snacks / must show their permit / to the organizers"; "permit" (danh từ) nhấn âm đầu /ˈpɜːrmɪt/.' },
],
});
TF.speaking.push({
id: 'tf8-rp2', set: 8, task: 'repeat', title: 'Clinic Reception Assistant', accent: 'en-GB',
context: 'You are starting a job at a campus clinic reception desk. Listen to the supervisor and repeat exactly what you hear.',
sentences: [
{ t: 'Good morning, how can I help you?', tip: 'Ngữ điệu xuống ở cuối câu hỏi mở "help you"; nối "can I" → /kənaɪ/.' },
{ t: 'Please fill out this form.', tip: 'Nối "fill out" → /fɪlaʊt/; "form" đọc âm /ɔː/ dài trong giọng Anh.' },
{ t: 'The doctor will see you shortly.', tip: 'Âm /ʃ/ trong "shortly"; nhấn "DOCtor" âm đầu.' },
{ t: 'Appointments can be changed up to a day in advance.', tip: 'Nhấn "apPOINTments"; "up to a day" nối nhanh /ʌptuːədeɪ/.' },
{ t: 'Students must bring their identification to every visit.', tip: 'Từ "identification" /aɪˌdentɪfɪˈkeɪʃn/ có 6 âm tiết, nhấn chính ở "CA"; âm /z/ cuối "students".' },
{ t: 'Please remind patients that the pharmacy closes at five thirty.', tip: 'Nhấn "PHARmacy" /ˈfɑːməsi/; "five thirty" đọc rõ âm /θ/ trong "thirty".' },
{ t: 'If a patient feels dizzy, ask them to sit down and call a nurse right away.', tip: 'Câu dài – ngắt sau "dizzy" và sau "sit down"; "nurse" /nɜːs/ không đọc âm /r/ trong giọng Anh.' },
],
});

/* ===================================================================
* SPEAKING · Take an Interview
* =================================================================== */
TF.speaking.push({
id: 'tf8-iv1', set: 8, task: 'interview', title: 'Clubs and Activities', seconds: 45, accent: 'en-US',
context: 'A researcher is interviewing students about clubs and activities on campus. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'To begin, are you a member of any clubs or groups, or is there one you would like to join?',
model: `I'm a member of the photography club, and I'd also like to join the hiking club next semester. I joined the photography club because I wanted to meet people who share my hobby. We meet every Tuesday evening, and we take short trips on weekends.`,
tip: 'Trả lời thẳng vào câu hỏi (đang tham gia hay muốn tham gia), rồi thêm lý do và một chi tiết cụ thể (lịch họp, hoạt động).' },
{ q: 'What do you think is the biggest benefit of joining a student club?',
model: `I think the biggest benefit is making friends outside your own major. In class, you usually meet people who study the same subject, but in a club you meet students from many fields. That helps you learn different ways of thinking, and sometimes it even leads to useful contacts later on.`,
tip: 'Chọn một lợi ích chính, giải thích bằng so sánh (lớp học và câu lạc bộ), rồi thêm kết quả. Tránh liệt kê quá nhiều ý ngắn.' },
{ q: 'Some students say they are too busy with classes to join any clubs. Do you agree that studying should come first?',
model: `I partly agree. Classes are the main reason we are at the university, so grades should be a priority. But I also think one or two hours a week in a club can actually help, because it gives you a break and reduces stress. The key is to choose just one activity and not to overcommit.`,
tip: 'Dùng "partly agree" để cho thấy hai mặt của vấn đề; kết bằng lời khuyên thực tế ("The key is to…").' },
{ q: 'If you could start a brand-new club on your campus, what kind of club would it be, and what would members do?',
model: `I would start a language exchange club. Members would be paired with a partner who speaks another language, and they would meet weekly to practice conversation, half the time in each language. I think many students would enjoy it, because international students could make friends and local students could practice for free.`,
tip: 'Nêu ý tưởng cụ thể, mô tả hoạt động ("Members would…") và lợi ích cho người tham gia. Dùng "would" để nói về điều giả định.' },
],
});
TF.speaking.push({
id: 'tf8-iv2', set: 8, task: 'interview', title: 'Work and Internships', seconds: 45, accent: 'en-GB',
context: 'A career counselor is interviewing students about work experience. Answer each question. You will have about 45 seconds for each answer.',
questions: [
{ q: 'Have you ever had a job or internship, or would you like to find one soon? Please tell me about it.',
model: `I worked part-time as a library assistant last year. I shelved books and helped students find materials. It wasn't a glamorous job, but it taught me to be organized and to stay calm when it was busy. Next summer I'd like to find an internship in my field.`,
tip: 'Nêu công việc, nhiệm vụ cụ thể, rồi điều bạn học được; kết bằng kế hoạch tương lai để câu trả lời đủ ý.' },
{ q: 'What qualities do you think make someone a good employee?',
model: `I think reliability is the most important quality. If a colleague arrives on time and finishes tasks as promised, the whole team can plan better. Good communication matters too, because people need to ask questions early instead of hiding problems. Those habits are more valuable than being the fastest worker.`,
tip: 'Chọn một phẩm chất chính, giải thích tại sao, rồi thêm một phẩm chất thứ hai ngắn gọn. Dùng "because" để nối lý do.' },
{ q: 'Some people prefer a stable job with the same company for many years, while others like to change jobs often. Which do you prefer?',
model: `I would prefer a stable job, at least early in my career. Staying with one company lets you build deeper skills and gain trust, and it makes it easier to be promoted. However, I would not stay if I stopped learning. So I'd look for a company that offers new projects and training.`,
tip: 'Nêu lựa chọn, đưa lý do, rồi một điều kiện ("However, I would not stay if…") để thể hiện chiều sâu quan điểm.' },
{ q: 'Imagine your university wanted to help students find internships. What is one service it could provide?',
model: `I think the university could organize short mock interviews with local employers. Many students feel nervous the first time, so practicing with a real manager would build confidence. The manager could also give feedback on the résumé. As a result, students would be better prepared when they apply for real positions.`,
tip: 'Đề xuất một dịch vụ cụ thể, giải thích vấn đề nó giải quyết và kết quả ("As a result, …"). Dùng "could" cho đề xuất.' },
],
});

/* ===================================================================
* Xoay vị trí đáp án đúng (chỉ unit tf8-): dữ liệu soạn với a = 0, xoay theo mẫu cố định
* trên toàn bộ câu Reading + Listening của bộ 8 → A/B/C/D phân bố đều, không có chuỗi dài.
* =================================================================== */
const PAT8 = [2, 0, 3, 1, 1, 3, 0, 2, 3, 2, 1, 0];
let k8 = 0;
[...TF.reading, ...TF.listening].filter(u => u.set === 8).forEach(u => (u.groups || []).forEach(gr => {
if (gr.type !== 'mcq' || gr._rot8) return; gr._rot8 = 1;
gr.items.forEach(it => {
const n = it.options.length, want = PAT8[k8++ % PAT8.length] % n, r = (it.a - want + n) % n;
if (r) { it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want; }
});
}));
})(typeof self !== 'undefined' ? self : this);
