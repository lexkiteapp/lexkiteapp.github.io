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
