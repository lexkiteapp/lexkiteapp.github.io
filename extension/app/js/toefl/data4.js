/* TOEFL iBT (định dạng từ 21/01/2026) – Bộ luyện tập 4. Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
 * Nạp SAU data1–3.js: chỉ BỔ SUNG vào window.TOEFL, cùng định dạng. Số câu n: Daily 31–40, Academic 61–80, Listening 41–64, Build a Sentence 31–40.
 * Trắc nghiệm soạn với đáp án đúng ở vị trí 0, cuối file xoay vòng (chỉ các unit tf4-) để A/B/C/D phân bố đều. */
(function (g) {
  const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
  ['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });
  const mcq = (instr, items) => ({ type: 'mcq', instr, items });

  /* ===================================================================
   * BỘ 4 · READING (tự biên soạn). Daily Life câu 31–40, Academic 61–80.
   * =================================================================== */
  TF.reading.push({
    id: 'tf4-cw1', set: 4, task: 'cw', title: 'Why Leaves Change Color in Autumn',
    instr: 'Fill in the missing letters in the paragraph.',
    text: "In summer, most leaves look green because they contain large amounts of chlorophyll, the pigment {th|at} plants use to capture energy {fr|om} sunlight. As the days become shorter {a|nd} cooler in autumn, many trees stop {prod|ucing} new chlorophyll. The green color slowly {fa|des}, and yellow and orange pigments that {we|re} there all along become visible. {So|me} trees also make red pigments at {th|is} time of year. Bright, sunny days {foll|owed} by cool nights tend to produce the most colorful {disp|lays}.",
    explain: [
      "Đại từ quan hệ \"that\" thay cho \"the pigment\", mở đầu mệnh đề quan hệ \"that plants use…\".",
      "\"capture energy from sunlight\" = thu năng lượng TỪ ánh sáng mặt trời; giới từ \"from\" chỉ nguồn gốc.",
      "Hai tính từ song song \"shorter and cooler\" nối bằng \"and\".",
      "\"stop + V-ing\" = ngừng làm gì → \"stop producing\" (ngừng tạo ra).",
      "Chủ ngữ số ít \"The green color\" + động từ hiện tại đơn thêm -s → \"fades\" (nhạt dần).",
      "Mệnh đề quan hệ \"that were there all along\" (vốn đã có sẵn từ trước); chủ ngữ số nhiều \"pigments\" → \"were\".",
      "\"Some trees\" = một số cây; \"some\" đứng trước danh từ số nhiều.",
      "\"at this time of year\" = vào thời điểm này trong năm; cụm cố định.",
      "Phân từ bị động rút gọn \"followed by\" (được tiếp nối bởi) = days which are followed by cool nights.",
      "Sau tính từ \"colorful\" cần danh từ số nhiều \"displays\" (những cảnh sắc màu)."
    ],
  });
  TF.reading.push({
    id: 'tf4-cw2', set: 4, task: 'cw', title: 'The Printing Press',
    instr: 'Fill in the missing letters in the paragraph.',
    text: "Before the fifteenth century, books in Europe were usually copied {b|y} hand, so they were rare {a|nd} expensive. Around 1450, Johannes Gutenberg developed a printing {sys|tem} that used movable metal type. Each letter {w|as} cast as a separate piece, and the {pie|ces} could be arranged to form a page, inked, {a|nd} pressed onto paper. After printing, the {let|ters} could be taken apart and used {ag|ain} for the next page. As a result, books {bec|ame} cheaper, and ideas spread far more {qui|ckly} than before.",
    explain: [
      "\"by hand\" = bằng tay; cụm cố định với giới từ \"by\".",
      "Hai tính từ song song \"rare and expensive\" (hiếm và đắt).",
      "Sau \"a printing\" cần danh từ \"system\" (hệ thống in).",
      "Bị động quá khứ: \"Each letter was cast\" (mỗi chữ được đúc); chủ ngữ số ít → \"was\".",
      "\"the pieces\" = các con chữ (mảnh) đã nhắc ở trước; danh từ số nhiều.",
      "Chuỗi ba động từ song song \"arranged…, inked, and pressed\" nối bằng \"and\".",
      "\"the letters could be taken apart\" = các con chữ có thể được tháo rời; danh từ số nhiều.",
      "\"used again\" = được dùng lại; trạng từ \"again\".",
      "Quá khứ đơn \"became cheaper\" (trở nên rẻ hơn).",
      "Trạng từ \"quickly\" bổ nghĩa cho động từ \"spread\"; \"far more quickly than before\" = nhanh hơn nhiều so với trước."
    ],
  });
  TF.reading.push({
    id: 'tf4-dl1', set: 4, task: 'daily', title: 'Recycling Center Holiday Hours',
    text: "GREENFIELD RECYCLING CENTER – HOLIDAY HOURS\n\nThe center will be closed on December 25 and January 1. On all other days between December 20 and January 5, it will close at 3 p.m. instead of the usual 5 p.m.\n\nGift wrapping paper with glitter or metallic foil cannot be recycled and should be placed in regular trash. Plain paper and cardboard boxes are accepted as usual, but boxes must be flattened before drop-off.\n\nResidents may drop off natural holiday trees free of charge from January 2 to January 15. Please remove all lights and decorations first.",
    groups: [mcq('Read the notice and answer the questions.', [
      { n: 31, q: 'What will change about the center\'s hours during the holiday period?', options: ['It will close two hours earlier on most days.', 'It will open two hours later on most days.', 'It will be closed every weekend.', 'It will stay open later on December 31.'], a: 0,
        explain: "\"it will close at 3 p.m. instead of the usual 5 p.m.\" → trong dịp lễ trung tâm đóng cửa sớm hơn hai tiếng vào hầu hết các ngày (trừ hai ngày nghỉ hẳn 25/12 và 1/1). Giờ mở cửa không đổi." },
      { n: 32, q: 'What should residents do with wrapping paper that has glitter on it?', options: ['Put it in the regular trash', 'Flatten it before drop-off', 'Bring it in after January 2', 'Separate it from plain paper at the center'], a: 0,
        explain: "Giấy gói có kim tuyến hoặc lớp kim loại \"cannot be recycled and should be placed in regular trash\" → bỏ vào thùng rác thường. Việc làm phẳng chỉ áp dụng cho hộp các-tông." },
      { n: 33, q: 'What can be inferred about a resident who brings a decorated holiday tree on January 10?', options: ['The resident will need to take off the decorations first.', 'The resident will have to pay a small fee.', 'The tree will not be accepted on that date.', 'The resident must also bring cardboard boxes.'], a: 0,
        explain: "Câu suy luận: cây thông được nhận miễn phí từ 2/1 đến 15/1 (ngày 10/1 nằm trong khoảng này), nhưng \"Please remove all lights and decorations first\" → người dân phải tháo đồ trang trí trước. Không mất phí (\"free of charge\")." },
    ])],
  });
  TF.reading.push({
    id: 'tf4-dl2', set: 4, task: 'daily', title: 'Email about a Course Waitlist',
    text: "To: Students on the waitlist for PSYC 210\nFrom: Dr. Hana Okafor\nSubject: Waitlist update\n\nDear students,\n\nBecause of high demand, the department has agreed to open a second section of Introduction to Social Psychology. The new section will meet on Mondays and Wednesdays from 4:00 to 5:15 p.m. in Room 118 of Carver Hall.\n\nIf you would like a seat in the new section, please reply to this email by Friday at noon. Seats will be given in the order that replies are received. Students who do not reply will stay on the waitlist for the original section, but I should warn you that very few students drop the course after the first week.\n\nBest regards,\nDr. Okafor",
    groups: [mcq('Read the email and answer the questions.', [
      { n: 34, q: 'What is the main purpose of the email?', options: ['To offer students places in a newly created class section', 'To announce that a course has been cancelled', 'To change the room for the original section', 'To remind students about a Friday exam'], a: 0,
        explain: "Mục đích chính: khoa mở thêm \"a second section\" vì nhu cầu cao, và giáo sư mời sinh viên trong danh sách chờ trả lời để nhận chỗ ở lớp mới. Không có thông tin hủy môn hay thi cử." },
      { n: 35, q: 'How will seats in the new section be assigned?', options: ['On a first-come, first-served basis', 'By students\' grades in earlier courses', 'By a random drawing on Friday', 'According to students\' year of study'], a: 0,
        explain: "\"Seats will be given in the order that replies are received\" → ai trả lời trước được xếp trước (first-come, first-served)." },
      { n: 36, q: 'What does Dr. Okafor suggest about staying on the waitlist for the original section?', options: ['It is unlikely to result in getting a seat.', 'It guarantees a seat in the second week.', 'It is required for all psychology majors.', 'It gives students priority in the next term.'], a: 0,
        explain: "Giáo sư cảnh báo \"very few students drop the course after the first week\" → hầu như không có ai bỏ lớp, nên ở lại danh sách chờ khó có chỗ. Không có thông tin về ưu tiên học kỳ sau." },
    ])],
  });
  TF.reading.push({
    id: 'tf4-dl3', set: 4, task: 'daily', title: 'Language Exchange Flyer',
    text: "JOIN THE CAMPUS LANGUAGE EXCHANGE!\n\nWant to practice a new language with a native speaker? Our program matches you with a partner who wants to learn your language. You meet for one hour a week: thirty minutes in your language and thirty minutes in theirs.\n\nMeetings take place in the International Lounge, Student Union, 2nd floor, but partners may also agree to meet online.\n\nTo sign up, complete the short form at the International Office by September 15. Please list up to three languages you would like to practice, in order of preference.",
    groups: [mcq('Read the flyer and answer the questions.', [
      { n: 37, q: 'How is each weekly meeting organized?', options: ['The time is divided equally between two languages.', 'A teacher leads the first half of the session.', 'Partners speak only the language they are learning.', 'Each meeting focuses on a different language.'], a: 0,
        explain: "\"thirty minutes in your language and thirty minutes in theirs\" → một tiếng mỗi tuần chia đều cho hai ngôn ngữ. Tờ rơi không nhắc đến giáo viên." },
      { n: 38, q: 'According to the flyer, what must students do on the sign-up form?', options: ['Rank the languages they want to practice', 'Choose a meeting time', 'Describe their current language level', 'Name the partner they want'], a: 0,
        explain: "\"list up to three languages you would like to practice, in order of preference\" → liệt kê tối đa ba ngôn ngữ theo thứ tự ưu tiên, tức là xếp hạng các ngôn ngữ muốn luyện." },
    ])],
  });
  TF.reading.push({
    id: 'tf4-dl4', set: 4, task: 'daily', title: 'Group Chat about a Presentation',
    text: "Priya (8:02 p.m.): Hi both! Our presentation is on Thursday. Can we meet tomorrow to rehearse?\nCarlos (8:05 p.m.): Tomorrow works, but I've got a lab until 3. Anytime after that?\nJun (8:07 p.m.): I'm working at the café until 4:30, sorry.\nPriya (8:08 p.m.): How about 5 in the library? I'll book a group room with a screen.\nCarlos (8:09 p.m.): Perfect. I'll bring my laptop.\nJun (8:10 p.m.): Sounds good. I still need to finish the last two slides, though, so they might be a bit rough.\nPriya (8:11 p.m.): No worries. That's what the rehearsal is for!",
    groups: [mcq('Read the messages and answer the questions.', [
      { n: 39, q: 'Why do the students agree to meet at 5 p.m.?', options: ['Both Carlos and Jun are busy earlier in the afternoon.', 'The library opens at 5 p.m.', 'Their presentation starts at 5 p.m. on Thursday.', 'Priya cannot book a room before then.'], a: 0,
        explain: "Carlos có giờ thực hành đến 3 giờ, Jun làm ở quán cà phê đến 4:30 → 5 giờ là thời điểm cả nhóm đều rảnh. Không có thông tin về giờ mở cửa thư viện." },
      { n: 40, q: 'What does Priya mean when she writes, "That\'s what the rehearsal is for"?', options: ['The practice session is a chance to improve unfinished work.', 'Jun should finish the slides before the meeting.', 'The rehearsal will be cancelled if the slides are not ready.', 'She will make the last two slides herself.'], a: 0,
        explain: "Jun lo hai trang cuối còn \"rough\" (thô, chưa hoàn chỉnh); Priya trấn an rằng buổi tập dượt chính là để chỉnh sửa những phần chưa xong. Cô không yêu cầu Jun phải làm xong trước." },
    ])],
  });

  TF.reading.push({
    id: 'tf4-ap1', set: 4, task: 'academic', title: 'Sea Otters and Kelp Forests',
    text: [
      "Along the rocky coasts of the North Pacific, kelp forests grow in cool, shallow water. Kelp is a large brown seaweed that can grow tens of centimeters in a single day and reach the surface from depths of more than twenty meters. These underwater forests provide food and shelter for hundreds of species, from small invertebrates to fish and marine mammals. Yet their survival depends, to a surprising degree, on a single predator: the sea otter.",
      "Sea otters feed heavily on sea urchins, spiny animals that graze on kelp. Because otters have no thick layer of fat to keep them warm, they must eat a large amount of food every day, often around a quarter of their body weight. When otters are present, they keep urchin numbers low, and the urchins that survive tend to hide in cracks in the rocks, feeding mainly on pieces of kelp that drift past. When otters disappear, however, urchin populations can grow rapidly. The urchins leave their hiding places and move across the sea floor, eating the bases of the kelp. In some places, this has turned thick forests into so-called urchin barrens, areas where little except urchins remains.",
      "The importance of otters became clear partly because of a historical accident. During the eighteenth and nineteenth centuries, sea otters were hunted intensively for their fur, which is the densest of any mammal. By the early twentieth century, they had disappeared from most of their original range, and only small groups survived. In 1911, an international agreement gave otters protection, and their numbers slowly began to recover. Scientists who later compared coastlines with and without otters found striking differences: where otters had returned, kelp was plentiful; where they were still absent, urchins were common and kelp was scarce.",
      "An effect of this kind, in which a predator influences plants indirectly by controlling the animals that eat them, is known as a trophic cascade. The sea otter is therefore often described as a keystone species. Like the central stone that holds an arch together, a keystone species has an effect on its ecosystem that is much larger than its numbers alone would suggest.",
      "Healthy kelp forests also benefit people. They reduce the force of waves that reach the shore, support fisheries, and take up carbon dioxide as they grow. For these reasons, some researchers argue that protecting sea otters may be one of the most effective ways to protect coastal ecosystems as a whole. Others caution that the relationship is not always simple. Water temperature, storms, and disease can also affect kelp and urchins, so the return of otters does not automatically restore every forest.",
    ].join('\n\n'),
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 61, q: 'According to paragraph 1, which of the following is true of kelp?', options: ['It can grow very quickly.', 'It grows mainly in warm water.', 'It provides food for only a few species.', 'It grows only in water deeper than twenty meters.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Đoạn 1: tảo bẹ \"can grow tens of centimeters in a single day\" → mọc rất nhanh. Tảo sống ở nước \"cool, shallow\" (lạnh, nông), là nơi sống của \"hundreds of species\", nên các phương án còn lại đều sai." },
      { n: 62, q: 'According to paragraph 2, why must sea otters eat a large amount of food?', options: ['They lack a thick layer of fat to keep them warm.', 'Sea urchins contain very little food value.', 'They must compete with fish for food.', 'They spend most of the day swimming long distances.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"Because otters have no thick layer of fat to keep them warm, they must eat a large amount of food every day\" → rái cá không có lớp mỡ dày giữ ấm nên phải ăn nhiều." },
      { n: 63, q: 'The word "graze" in paragraph 2 is closest in meaning to', options: ['feed', 'climb', 'rest', 'hide'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"sea urchins, spiny animals that graze on kelp\" = những con vật gặm/ăn tảo bẹ → \"feed\". Đoạn văn sau đó nói rõ nhím biển \"eating the bases of the kelp\"." },
      { n: 64, q: 'According to paragraph 2, what happens when sea otters are present?', options: ['Sea urchins stay hidden and eat mostly drifting kelp.', 'Sea urchins move freely across the sea floor.', 'Kelp forests turn into urchin barrens.', 'Sea urchins begin to eat other animals.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Khi có rái cá, nhím biển ít đi và những con sống sót \"tend to hide in cracks in the rocks, feeding mainly on pieces of kelp that drift past\" → ẩn nấp, chủ yếu ăn tảo trôi dạt. Việc bò khắp đáy biển và tạo \"urchin barrens\" chỉ xảy ra khi KHÔNG có rái cá." },
      { n: 65, q: 'Why does the author mention that sea otter fur "is the densest of any mammal" in paragraph 3?', options: ['To explain why otters were hunted so intensively', 'To show how otters survive without body fat', 'To compare otters with other marine mammals', 'To explain why the 1911 agreement was signed'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Chi tiết bộ lông dày nhất trong các loài thú nằm ngay trong câu nói rái cá \"were hunted intensively for their fur\" → tác giả nêu ra để giải thích vì sao chúng bị săn bắt ráo riết đến gần tuyệt chủng." },
      { n: 66, q: 'What can be inferred from paragraph 3 about the scientists\' comparison of coastlines?', options: ['It provided evidence that otters help kelp forests survive.', 'It showed that urchins prefer warmer coastlines.', 'It was carried out before otters were protected.', 'It proved that hunting otters had no effect on kelp.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Nơi rái cá quay lại thì tảo bẹ dày đặc, nơi vắng rái cá thì nhiều nhím biển và ít tảo → so sánh này là bằng chứng cho thấy rái cá giúp rừng tảo bẹ tồn tại. Cuộc so sánh diễn ra \"later\", tức là sau khi rái cá được bảo vệ." },
      { n: 67, q: 'According to paragraph 4, a trophic cascade occurs when', options: ['a predator affects plants by controlling the animals that eat them', 'plants grow faster than animals can eat them', 'a species disappears because of hunting', 'many predators compete for the same prey'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Định nghĩa trong đoạn 4: \"a predator influences plants indirectly by controlling the animals that eat them\" → động vật săn mồi tác động gián tiếp lên thực vật thông qua việc kiểm soát loài ăn thực vật." },
      { n: 68, q: 'Why does the author compare a keystone species to "the central stone that holds an arch together" in paragraph 4?', options: ['To illustrate that one species can be essential to a whole ecosystem', 'To show that sea otters live among rocks', 'To explain how kelp is attached to the sea floor', 'To suggest that ecosystems are built slowly over time'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Viên đá đỉnh vòm giữ cả vòm đứng vững; tương tự, loài then chốt có ảnh hưởng \"much larger than its numbers alone would suggest\" → minh họa rằng một loài có thể quyết định sự tồn tại của cả hệ sinh thái." },
      { n: 69, q: 'According to paragraph 5, all of the following are benefits of kelp forests EXCEPT', options: ['they increase the water temperature near the coast', 'they reduce the force of waves', 'they support fisheries', 'they take up carbon dioxide'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 5 liệt kê lợi ích: giảm lực sóng, hỗ trợ nghề cá, hấp thụ CO₂. Nhiệt độ nước chỉ được nhắc như một yếu tố ẢNH HƯỞNG đến tảo bẹ, không phải lợi ích do tảo mang lại → đáp án." },
      { n: 70, q: 'What can be inferred from paragraph 5 about the return of sea otters to an area?', options: ['It may not be enough on its own to restore a kelp forest.', 'It always leads to more storms and disease.', 'It reduces the number of fish in the area.', 'It has no effect on sea urchin populations.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Một số nhà khoa học lưu ý nhiệt độ nước, bão và dịch bệnh cũng ảnh hưởng, nên \"the return of otters does not automatically restore every forest\" → chỉ riêng việc rái cá quay lại có thể chưa đủ để phục hồi rừng tảo." },
    ])],
  });
  TF.reading.push({
    id: 'tf4-ap2', set: 4, task: 'academic', title: 'The Origins of Writing in Mesopotamia',
    text: [
      "Writing was invented independently in several parts of the world, but one of the earliest known systems developed in southern Mesopotamia, in what is now Iraq. By the late fourth millennium BCE, cities such as Uruk had grown large and complex. Temple and palace officials had to keep track of goods such as grain, livestock, and textiles, as well as the workers who produced them. Many scholars believe that writing grew out of this practical need to record economic information.",
      "For thousands of years before writing appeared, people in the region had used small clay tokens of different shapes to represent goods. A cone or a sphere, for example, might stand for a particular measure of grain. Some researchers have argued that writing developed gradually from these tokens: at first they were sealed inside hollow clay containers, and their shapes were pressed into the outside so that the contents could be checked without breaking the container. Eventually, people may have realized that the marks alone were sufficient, and the tokens were no longer needed. This theory is influential but not universally accepted, and the exact steps remain a subject of debate.",
      "The earliest tablets from Uruk, dating to around 3300–3000 BCE, contain mainly numbers and simple pictures. A drawing of an animal's head might represent the animal itself, and marks beside it showed how many. These records were limited in what they could express. They could show that ten sheep had been delivered, but they could not easily record a story, a law, or the name of a person.",
      "Over the following centuries, the system changed in two important ways. First, the signs became more abstract. Scribes wrote by pressing the end of a cut reed into soft clay, which produced wedge-shaped marks, and the original pictures gradually turned into combinations of wedges. This style is called cuneiform, from the Latin word for \"wedge.\" Second, many signs came to represent sounds rather than only objects or ideas. A sign that originally meant one thing could be used for another word that sounded similar, much as a picture of an eye and a saw might be used to write the English phrase \"I saw.\" This development allowed scribes to write names, grammatical endings, and eventually whole sentences.",
      "Learning cuneiform was difficult. The system used hundreds of signs, and many of them had more than one possible reading. Scribes trained for years in schools, copying lists of signs and model texts again and again. As a result, literacy remained limited to a relatively small group of specialists. Nevertheless, cuneiform proved remarkably adaptable. It was used to write several different languages over a period of about three thousand years, and the documents that survive include not only economic records but also letters, laws, scientific observations, and literature.",
    ].join('\n\n'),
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 71, q: 'According to paragraph 1, what do many scholars believe led to the development of writing in Mesopotamia?', options: ['The need to record economic information', 'The desire to preserve religious stories', 'Contact with other writing systems', 'The need to communicate with distant cities'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"Many scholars believe that writing grew out of this practical need to record economic information\" → nhu cầu ghi chép thông tin kinh tế (hàng hóa, nhân công). Đoạn 1 còn nói chữ viết ra đời độc lập ở nhiều nơi, không do tiếp xúc với hệ chữ khác." },
      { n: 72, q: 'The word "sufficient" in paragraph 2 is closest in meaning to', options: ['enough', 'permanent', 'accurate', 'attractive'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"the marks alone were sufficient, and the tokens were no longer needed\" = chỉ riêng các dấu in đã ĐỦ, không cần thẻ đất sét nữa → \"enough\"." },
      { n: 73, q: 'Why were the shapes of tokens pressed into the outside of clay containers, according to paragraph 2?', options: ['So that the contents could be checked without opening the container', 'So that the containers would be easier to carry', 'So that the tokens could be reused later', 'So that the containers could be sold as decorations'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Hình dạng thẻ được ấn ra mặt ngoài \"so that the contents could be checked without breaking the container\" → để kiểm tra bên trong có gì mà không phải đập vỡ vật chứa." },
      { n: 74, q: 'What does the author suggest about the theory that writing developed from clay tokens?', options: ['It is widely discussed, but scholars still disagree about it.', 'It has been proven by the earliest tablets.', 'It has been rejected by most researchers.', 'It applies to every early writing system.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Tác giả viết \"This theory is influential but not universally accepted, and the exact steps remain a subject of debate\" → giả thuyết có ảnh hưởng lớn nhưng các học giả vẫn còn tranh luận; chưa được chứng minh, cũng không bị đa số bác bỏ." },
      { n: 75, q: 'Why does the author mention "ten sheep" in paragraph 3?', options: ['To illustrate the kind of information the earliest tablets could record', 'To show that sheep were the most valuable animals in Uruk', 'To explain how numbers were written with wedges', 'To argue that the earliest tablets recorded laws'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Ví dụ \"ten sheep had been delivered\" minh họa loại thông tin đơn giản (số lượng + vật) mà những tấm bảng đầu tiên ghi được, đối lập với việc chúng không ghi được truyện, luật hay tên người." },
      { n: 76, q: 'According to paragraph 3, the earliest tablets could NOT easily record which of the following?', options: ['The name of a person', 'The number of animals delivered', 'The type of goods received', 'Quantities of grain'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 3: các tấm bảng sớm nhất ghi được số lượng và vật (ví dụ mười con cừu) nhưng \"could not easily record a story, a law, or the name of a person\" → tên người là thứ KHÔNG ghi được dễ dàng." },
      { n: 77, q: 'According to paragraph 4, why is the writing system called cuneiform?', options: ['Because its signs were made of wedge-shaped marks', 'Because it was first used in a city called Cunei', 'Because it was written on pieces of reed', 'Because it was based on pictures of objects'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Bút sậy ấn vào đất sét tạo ra \"wedge-shaped marks\"; tên cuneiform đến \"from the Latin word for 'wedge'\" (cái nêm) → gọi theo hình dạng nét chữ hình nêm. Chữ viết trên đất sét, không phải trên sậy." },
      { n: 78, q: 'Why does the author mention the English phrase "I saw" in paragraph 4?', options: ['To explain how a sign could be used for a word that sounded similar', 'To show that cuneiform was later used to write English', 'To compare the difficulty of English and cuneiform', 'To give an example of an abstract wedge-shaped sign'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Ví dụ hình con mắt (eye) + cái cưa (saw) để viết \"I saw\" minh họa nguyên tắc dùng một ký hiệu cho một từ khác ĐỒNG ÂM/gần âm – tức là ký hiệu bắt đầu biểu thị âm thanh. Chữ hình nêm không dùng để viết tiếng Anh." },
      { n: 79, q: 'What can be inferred from paragraph 5 about literacy in ancient Mesopotamia?', options: ['Most ordinary people could not read or write cuneiform.', 'Children learned cuneiform easily at home.', 'Cuneiform had only a few signs to remember.', 'Scribes did not need any formal training.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Chữ hình nêm có hàng trăm ký hiệu, người học phải được đào tạo nhiều năm, nên \"literacy remained limited to a relatively small group of specialists\" → phần lớn người bình thường không biết đọc viết." },
      { n: 80, q: 'According to paragraph 5, all of the following types of documents survive in cuneiform EXCEPT', options: ['maps of trade routes', 'letters', 'laws', 'scientific observations'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 5 liệt kê văn bản còn lại gồm hồ sơ kinh tế, \"letters, laws, scientific observations, and literature\". Bản đồ tuyến đường buôn bán KHÔNG được nhắc tới → đáp án." },
    ])],
  });

  /* ===================================================================
   * BỘ 4 · LISTENING (tự biên soạn). Response 41–48, Conversation 41–48,
   * Announcement 49–54, Academic Talk 55–64.
   * =================================================================== */
  const RESP4 = [
    { s: 'A', t: "Do you know where I can get my student ID card replaced?",
      options: ["Try the registration office in Building C.", "I replaced my phone last month.", "My student number starts with 24.", "The card was blue and white."],
      explain: "Câu hỏi \"where\" (ở đâu) → cần một địa điểm: \"Thử phòng đăng ký ở tòa C xem\". Các phương án khác chỉ lặp từ \"replace\", \"student\", \"card\" để gây nhiễu." },
    { s: 'B', t: "I can't believe the library is closed this weekend.",
      options: ["I know – we'll have to study at the café instead.", "It was built in the 1960s.", "Yes, I believe in hard work.", "I closed the window before I left."],
      explain: "Người nói than phiền thư viện đóng cửa cuối tuần → phản hồi đồng tình và đưa phương án thay thế: \"Ừ – chắc phải học ở quán cà phê thôi\". \"believe\", \"closed\" chỉ là bẫy lặp từ." },
    { s: 'A', t: "How long did it take you to finish the lab report?",
      options: ["About three hours, but the graphs took the longest.", "It's due next Tuesday.", "The lab is on the second floor.", "I took the long way home."],
      explain: "Câu hỏi \"How long\" (mất bao lâu) → cần khoảng thời gian: \"Khoảng ba tiếng\". \"due next Tuesday\" trả lời cho \"When\"; \"took the long way\" là bẫy lặp từ." },
    { s: 'B', t: "Shouldn't we start the presentation with the survey results?",
      options: ["Good point – they're the most interesting part.", "The survey had twenty questions.", "I present the weather on the radio.", "We started at nine o'clock."],
      explain: "Câu hỏi phủ định dùng để đề xuất (\"Chẳng phải ta nên mở đầu bằng kết quả khảo sát sao?\") → phản hồi đồng ý kèm lý do. Các phương án khác lặp \"survey\", \"present\", \"start\"." },
    { s: 'A', t: "Would you rather meet in the morning or after lunch?",
      options: ["After lunch works better for me.", "Yes, I'd like to meet.", "I had a sandwich for lunch.", "The meeting was very useful."],
      explain: "Câu hỏi lựa chọn (A hay B) → chọn một phương án: \"Sau bữa trưa thì tiện hơn cho mình\". Không trả lời Yes/No cho câu hỏi lựa chọn." },
    { s: 'B', t: "The professor posted the exam grades online.",
      options: ["Really? I'll check mine right now.", "The post office closes at five.", "She's a very good professor.", "I'm going to grade school next year."],
      explain: "Người nói thông báo đã có điểm thi trên mạng → phản hồi tự nhiên: \"Thật à? Để mình xem điểm ngay\". \"post office\", \"grade school\" là bẫy đồng âm/khác nghĩa." },
    { s: 'A', t: "Why don't you join the hiking club this semester?",
      options: ["I'd love to, but my schedule is already full.", "Because the club meets on Fridays.", "I joined two pieces of wood together.", "The mountains are very high."],
      explain: "\"Why don't you…?\" là lời RỦ/gợi ý, không phải hỏi lý do → đáp lại bằng nhận lời hoặc từ chối lịch sự: \"Mình rất muốn, nhưng lịch đã kín rồi\". Phương án bắt đầu bằng \"Because\" là bẫy." },
    { s: 'B', t: "Excuse me, is this seat taken?",
      options: ["No, go ahead.", "I took the bus this morning.", "Yes, I'd like a seat by the window.", "The seats are made of plastic."],
      explain: "Hỏi chỗ có người ngồi chưa → \"No, go ahead\" (Chưa, bạn cứ ngồi). Phương án \"Yes, I'd like a seat…\" nghe như trả lời nhưng sai ý; các câu khác lặp \"took\", \"seats\"." },
  ];
  const respScript4 = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
  RESP4.forEach((r, i) => { respScript4.push({ say: 'Number ' + (i + 41) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
  TF.listening.push({
    id: 'tf4-lr', set: 4, task: 'response', title: 'Choose a Response · Set 4',
    speakers: { A: { name: 'Speaker 1', accent: 'en-GB', gender: 'm' }, B: { name: 'Speaker 2', accent: 'en-US', gender: 'f' } },
    script: respScript4,
    groups: [mcq('Listen to each sentence and choose the best response.', RESP4.map((r, i) => ({ n: i + 41, q: 'Choose the best response to sentence ' + (i + 41) + '.', options: r.options, a: 0, cue: r.t, explain: r.explain })))],
  });

  TF.listening.push({
    id: 'tf4-lc1', set: 4, task: 'conversation', title: 'Getting Feedback on a Résumé',
    speakers: { S: { name: 'Student (Aisha)', accent: 'en-US', gender: 'f' }, C: { name: 'Career adviser', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to a conversation between a student and a career adviser.' }, { pause: 1 },
      { s: 'S', t: "Hi. I'm applying for a summer internship at an engineering firm, and I was hoping you could look at my résumé." },
      { s: 'C', t: "Of course. Let's see… Well, the layout is clear, but it's three pages long. For an internship, one page is usually best. Recruiters often spend less than a minute on each résumé." },
      { s: 'S', t: "Oh. I wasn't sure what to leave out." },
      { s: 'C', t: "I'd start with the list of high school awards. They're impressive, but they're quite old now. Your university project on solar panels is much more relevant to an engineering firm, so give that more space." },
      { s: 'S', t: "OK. Should I describe what I did on the project in detail?" },
      { s: 'C', t: "Yes, but focus on results. Instead of writing that you 'worked on' the panels, say what you achieved – for example, that your design improved efficiency by twelve percent. Numbers catch a recruiter's eye." },
      { s: 'S', t: "That makes sense. The deadline is next Friday. Could I bring you a new version on Wednesday?" },
      { s: 'C', t: "Sure. Book a slot online, and I'll check it again before you send it." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 41, q: 'Why does the student visit the career adviser?', options: ['To get advice on her résumé for an internship', 'To find out which companies offer internships', 'To ask about a job at the career center', 'To prepare for an interview next Friday'], a: 0, cue: 'look at my résumé',
        explain: "Aisha nói ngay từ đầu: cô nộp đơn thực tập mùa hè ở một công ty kỹ thuật và muốn cố vấn \"look at my résumé\" → xin góp ý cho bản lý lịch. Thứ Sáu tới là hạn nộp hồ sơ, không phải ngày phỏng vấn." },
      { n: 42, q: 'What does the adviser say about the length of the résumé?', options: ['It should be reduced to one page.', 'It should include more pages about awards.', 'Three pages is the usual length.', 'Length does not matter to recruiters.'], a: 0, cue: 'one page is usually best',
        explain: "Lý lịch dài ba trang, trong khi với hồ sơ thực tập \"one page is usually best\" vì nhà tuyển dụng chỉ đọc mỗi bản chưa tới một phút → nên rút xuống một trang." },
      { n: 43, q: 'Why does the adviser suggest removing the high school awards?', options: ['They are less relevant than her recent project.', 'They are not impressive enough.', 'Recruiters do not trust awards.', 'They are already listed on another page.'], a: 0, cue: 'much more relevant',
        explain: "Cố vấn nói các giải thưởng thời phổ thông \"impressive, but quite old\", còn dự án pin mặt trời ở đại học \"much more relevant to an engineering firm\" → nên bỏ giải thưởng cũ để nhường chỗ cho nội dung liên quan hơn. Ông không chê chúng kém ấn tượng." },
      { n: 44, q: 'Why does the adviser mention "twelve percent"?', options: ['To give an example of describing a measurable result', 'To show how much the firm pays interns', 'To explain how recruiters score résumés', 'To describe the cost of solar panels'], a: 0, cue: 'improved efficiency by twelve percent',
        explain: "Con số 12% là ví dụ minh họa cho lời khuyên \"focus on results\": thay vì viết chung chung \"worked on\", hãy nêu kết quả đo được vì \"Numbers catch a recruiter's eye\"." },
    ])],
  });
  TF.listening.push({
    id: 'tf4-lc2', set: 4, task: 'conversation', title: 'Changing a Research Paper Topic',
    speakers: { S: { name: 'Student (Ben)', accent: 'en-GB', gender: 'm' }, P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to a conversation between a student and a professor during office hours.' }, { pause: 1 },
      { s: 'S', t: "Professor Lin, do you have a minute? It's about my research paper on urban gardens." },
      { s: 'P', t: "Sure, Ben. How's it going?" },
      { s: 'S', t: "Not great, honestly. I wanted to interview people who run community gardens in the city, but most of them haven't replied to my emails. I'm thinking about changing my topic." },
      { s: 'P', t: "I understand, but you've already done a lot of reading. Before you change everything, have you tried visiting a garden in person? Many of the volunteers are there on Saturday mornings, and people are often happier to talk face to face than to answer an email from a stranger." },
      { s: 'S', t: "I hadn't thought of that. There's one near my apartment." },
      { s: 'P', t: "Good. And if you still can't get enough interviews, you could use the city's survey of community gardens. It was published last year, and it's in the library database. That way your paper would be based on published data instead of interviews." },
      { s: 'S', t: "That's a relief. So I don't have to start from scratch." },
      { s: 'P', t: "Exactly. Just send me a short note next week to let me know which approach you're taking." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 45, q: 'What problem does the student have?', options: ['People he wants to interview have not responded.', 'He cannot find any reading about his topic.', 'He missed the deadline for his paper.', 'The community garden near him has closed.'], a: 0, cue: "haven't replied to my emails",
        explain: "Ben muốn phỏng vấn người quản lý vườn cộng đồng nhưng \"most of them haven't replied to my emails\" → người cần phỏng vấn không phản hồi. Giáo sư còn nói cậu đã đọc tài liệu khá nhiều." },
      { n: 46, q: 'Why does the professor suggest visiting a garden on Saturday morning?', options: ['People may be more willing to talk in person.', 'The gardens are closed on weekdays.', 'She will be there to help him.', 'Saturday is the only day volunteers are paid.'], a: 0, cue: 'face to face',
        explain: "Tình nguyện viên thường có mặt sáng thứ Bảy và \"people are often happier to talk face to face than to answer an email from a stranger\" → gặp trực tiếp thì dễ được nhận lời hơn." },
      { n: 47, q: 'What does the professor say about the city survey?', options: ['It could replace the interviews as a source of data.', 'It is too old to be useful.', 'It is not available to students.', 'It must be included in every research paper.'], a: 0, cue: 'based on published data',
        explain: "Nếu vẫn không đủ người phỏng vấn, Ben có thể dùng khảo sát của thành phố (xuất bản năm ngoái, có trong cơ sở dữ liệu thư viện) để bài viết \"based on published data instead of interviews\" → thay thế cho phỏng vấn." },
      { n: 48, q: 'What does the student mean when he says, "So I don\'t have to start from scratch"?', options: ['He is glad he can keep the work he has already done.', 'He wants to choose a completely new topic.', 'He thinks the paper will take longer than expected.', 'He has not started any reading yet.'], a: 0, cue: 'start from scratch',
        explain: "\"start from scratch\" = làm lại từ đầu. Ben nhẹ nhõm (\"That's a relief\") vì không phải đổi đề tài, giữ được phần đã đọc và đã làm." },
    ])],
  });

  TF.listening.push({
    id: 'tf4-la1', set: 4, task: 'announcement', title: 'Fire Drill in the Residence Hall',
    speakers: { A: { name: 'Residence hall director', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to an announcement in a university residence hall.' }, { pause: 1 },
      { s: 'A', t: "Attention, residents. There will be a fire drill in this building tomorrow, Thursday, at some point between ten a.m. and noon. We don't announce the exact time, because the goal is to practise reacting to a real emergency." },
      { s: 'A', t: "When the alarm sounds, leave your room immediately and use the stairs, not the elevators. Please don't stop to collect your belongings. Close your door behind you, since a closed door slows the spread of smoke." },
      { s: 'A', t: "Once you're outside, go to the meeting point in the parking lot across the street and wait there until a staff member gives you permission to return. We'll take attendance, so please don't leave the area early." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 49, q: 'Why is the exact time of the drill not announced?', options: ['So that residents practise responding as in a real emergency', 'Because the staff have not decided on the time yet', 'Because the alarm system might not work', 'So that fewer residents leave the building'], a: 0, cue: 'practise reacting to a real emergency',
        explain: "\"We don't announce the exact time, because the goal is to practise reacting to a real emergency\" → không báo giờ chính xác để cư dân tập phản ứng như khi có sự cố thật." },
      { n: 50, q: 'Why should residents close their doors?', options: ['A closed door slows the spread of smoke.', 'It prevents things from being stolen.', 'Staff need to check which rooms are empty.', 'It keeps the stairs clear.'], a: 0, cue: 'slows the spread of smoke',
        explain: "\"Close your door behind you, since a closed door slows the spread of smoke\" → đóng cửa để làm chậm khói lan." },
      { n: 51, q: 'What must residents do at the meeting point?', options: ['Wait until a staff member allows them to go back', 'Collect their belongings from staff', 'Sign up for a fire safety course', 'Return to the building after ten minutes'], a: 0, cue: 'wait there until a staff member',
        explain: "Tại điểm tập trung phải \"wait there until a staff member gives you permission to return\" và không rời đi sớm vì sẽ điểm danh." },
    ])],
  });
  TF.listening.push({
    id: 'tf4-la2', set: 4, task: 'announcement', title: 'Guest Lecture Moved',
    speakers: { A: { name: 'Department assistant', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to an announcement at the beginning of a class.' }, { pause: 1 },
      { s: 'A', t: "Before your lecture starts, a quick update about Friday's guest talk by Dr. Emma Ruiz on ocean plastics. So many people have registered that we're moving it from Room 204 to the main auditorium in the Hartley Building. The time hasn't changed – it still starts at four." },
      { s: 'A', t: "Students in this course will receive extra credit for attending, but only if you scan your student card at the entrance. Unfortunately, we can't add your name afterwards." },
      { s: 'A', t: "The talk will also be recorded, and the video will be posted on the department website next week. However, watching the recording doesn't count for extra credit." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 52, q: 'Why has the guest lecture been moved?', options: ['More people signed up than the original room can hold.', 'Room 204 is being repaired.', 'The speaker asked for a larger screen.', 'The time of the lecture has changed.'], a: 0, cue: 'So many people have registered',
        explain: "\"So many people have registered that we're moving it… to the main auditorium\" → số người đăng ký vượt sức chứa phòng cũ. Giờ bắt đầu không đổi, vẫn 4 giờ." },
      { n: 53, q: 'What must students do to receive extra credit?', options: ['Scan their student card when they arrive', 'Register on the department website', 'Write a summary of the talk', 'Watch the recording next week'], a: 0, cue: 'scan your student card',
        explain: "Được cộng điểm \"only if you scan your student card at the entrance\" và không thể bổ sung tên sau → phải quét thẻ khi vào cửa. Xem video ghi lại thì không được cộng điểm." },
      { n: 54, q: 'What does the speaker imply about students who cannot attend on Friday?', options: ['They can watch the talk later but will not get extra credit.', 'They can attend a second talk next week.', 'They should ask Dr. Ruiz for her notes.', 'They will lose points in the course.'], a: 0, cue: 'recording doesn\'t count',
        explain: "Câu suy luận: bài nói được ghi hình và đăng lên web tuần sau, nhưng \"watching the recording doesn't count for extra credit\" → người vắng mặt vẫn xem lại được nhưng không được cộng điểm. Không có thông tin bị trừ điểm." },
    ])],
  });

  TF.listening.push({
    id: 'tf4-lt1', set: 4, task: 'talk', title: 'Geology: How Limestone Caves Form',
    speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to part of a talk in a geology class.' }, { pause: 1 },
      { s: 'P', t: "Last week we looked at how rivers shape valleys. Today we're going underground, to look at how most large caves form. And the surprising answer is that the main tool isn't rushing water cutting through rock. It's chemistry." },
      { s: 'P', t: "Most of the world's large caves form in limestone, a rock made mainly of a mineral called calcite. Now, rainwater picks up a small amount of carbon dioxide from the air, and even more from the soil it passes through. That makes the water slightly acidic – it contains a weak acid called carbonic acid. When this water seeps into cracks in limestone, it slowly dissolves the calcite." },
      { s: 'P', t: "Slowly is the key word. The cracks widen by perhaps a fraction of a millimeter a year. But over tens or hundreds of thousands of years, small cracks can become passages, and passages can become huge chambers." },
      { s: 'P', t: "Interestingly, the same chemistry also works in reverse. When water containing dissolved calcite drips from a cave ceiling, it releases some of its carbon dioxide into the cave air. As a result, it can't hold as much calcite, so a tiny amount is left behind. Drop by drop, this builds up formations hanging from the ceiling, called stalactites. Where the drops land on the floor, formations called stalagmites grow upward." },
      { s: 'P', t: "Because these formations grow in layers, a bit like tree rings, scientists can use them to study past climates. But please don't touch them if you visit a cave. Oils from human skin can stop the calcite from building up, and a formation that took thousands of years to grow can be damaged in seconds." },
    ],
    groups: [mcq('Answer the questions about the talk.', [
      { n: 55, q: 'What is the talk mainly about?', options: ['The chemical processes that form limestone caves and their features', 'How rivers cut deep valleys through rock', 'Why limestone is used as a building material', 'How to explore caves safely'], a: 0, cue: "It's chemistry",
        explain: "Câu hỏi ý chính: giáo sư giải thích hang lớn hình thành chủ yếu nhờ phản ứng hóa học (nước có tính axit hòa tan đá vôi) và cùng cơ chế đó tạo ra thạch nhũ, măng đá. Sông tạo thung lũng chỉ là bài tuần trước." },
      { n: 56, q: 'Why is rainwater able to dissolve limestone?', options: ['It becomes slightly acidic after taking in carbon dioxide.', 'It flows very fast through underground passages.', 'It contains small pieces of sand that wear away rock.', 'It becomes warm deep underground.'], a: 0, cue: 'carbonic acid',
        explain: "Nước mưa hấp thụ CO₂ từ không khí và nhất là từ đất, trở nên \"slightly acidic\" (chứa axit cacbonic yếu) nên hòa tan được canxit trong đá vôi. Giáo sư nhấn mạnh công cụ chính KHÔNG phải dòng nước chảy xiết." },
      { n: 57, q: 'Why does the professor say "Slowly is the key word"?', options: ['To stress that caves take a very long time to form', 'To warn students to move carefully in caves', 'To explain why caves are usually small', 'To suggest that the process has recently stopped'], a: 0, cue: 'fraction of a millimeter a year',
        explain: "Câu hỏi mục đích: sau câu này giáo sư nói khe nứt chỉ rộng thêm một phần nhỏ milimét mỗi năm, phải qua hàng chục, hàng trăm nghìn năm mới thành hang lớn → nhấn mạnh quá trình diễn ra rất lâu." },
      { n: 58, q: 'According to the professor, how do stalactites form?', options: ['Dripping water loses carbon dioxide and leaves calcite behind.', 'Acid in the water cuts holes in the cave ceiling.', 'Pieces of the ceiling break off and harden.', 'Plants on the surface push roots into the cave.'], a: 0, cue: 'releases some of its carbon dioxide',
        explain: "Nước nhỏ giọt từ trần hang \"releases some of its carbon dioxide\", không giữ được nhiều canxit nữa nên để lại một lượng nhỏ → tích tụ dần thành thạch nhũ treo trên trần. Đây là quá trình ngược với hòa tan." },
      { n: 59, q: 'Why does the professor compare cave formations to tree rings?', options: ['Both grow in layers that record information about the past.', 'Both grow at exactly the same speed.', 'Both are made of the same material.', 'Both are damaged by carbon dioxide.'], a: 0, cue: 'grow in layers',
        explain: "Măng đá, thạch nhũ \"grow in layers, a bit like tree rings\", nên các nhà khoa học dùng chúng để nghiên cứu khí hậu trong quá khứ → giống vòng gỗ ở chỗ phát triển theo lớp và lưu lại thông tin quá khứ." },
      { n: 60, q: 'Why does the professor ask students not to touch cave formations?', options: ['Oil from skin can stop them from growing.', 'They may contain harmful acid.', 'They are often too sharp to touch safely.', 'Touching them is illegal in most countries.'], a: 0, cue: 'Oils from human skin',
        explain: "\"Oils from human skin can stop the calcite from building up\" – dầu trên da ngăn canxit bám tiếp, nên một khối mất hàng nghìn năm để hình thành có thể bị hỏng trong vài giây." },
    ])],
  });
  TF.listening.push({
    id: 'tf4-lt2', set: 4, task: 'talk', title: 'History of Science: The Problem of Longitude',
    speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to part of a talk in a history of science class.' }, { pause: 1 },
      { s: 'P', t: "For centuries, sailors could find their latitude – how far north or south they were – fairly easily, by measuring the height of the sun or certain stars. But longitude, their east–west position, was a much harder problem, and mistakes could send a ship onto rocks." },
      { s: 'P', t: "The basic idea was actually simple. The Earth turns 360 degrees in 24 hours, so every hour of time difference equals 15 degrees of longitude. If a sailor knew the local time on the ship, from the position of the sun, and also the time at home port, the difference would show how far east or west the ship had travelled." },
      { s: 'P', t: "The difficulty was keeping the home-port time. Pendulum clocks, the most accurate clocks of the period, simply didn't work on a rolling ship. And changes in temperature and humidity made other clocks run fast or slow." },
      { s: 'P', t: "In 1714, the British government offered a large prize for a practical solution. Many experts expected the answer to come from astronomy, by observing the moon's position against the stars. But a self-taught clockmaker named John Harrison spent decades building sea clocks that could keep time accurately despite the movement of the ship. His most successful design was surprisingly small – about the size of a large pocket watch." },
      { s: 'P', t: "Harrison's clocks performed well in sea trials, but the officials who judged the prize were slow to accept a mechanical solution, and he received his money only in stages, late in his life. Eventually, though, marine clocks – called chronometers – became standard equipment on ships." },
    ],
    groups: [mcq('Answer the questions about the talk.', [
      { n: 61, q: 'What is the main topic of the talk?', options: ['How sailors solved the problem of finding longitude at sea', 'Why pendulum clocks were invented', 'How sailors measured latitude using the stars', 'The history of the British navy'], a: 0, cue: 'longitude',
        explain: "Câu hỏi ý chính: bài nói giải thích vì sao xác định kinh độ trên biển khó, nguyên lý dựa vào chênh lệch giờ, và chiếc đồng hồ đi biển của John Harrison đã giải quyết vấn đề ra sao. Vĩ độ chỉ được nhắc để so sánh." },
      { n: 62, q: 'According to the professor, what does a time difference of one hour represent?', options: ['15 degrees of longitude', '24 degrees of longitude', '360 degrees of latitude', '1 degree of latitude'], a: 0, cue: '15 degrees of longitude',
        explain: "Trái Đất quay 360 độ trong 24 giờ → 360 : 24 = 15, nên \"every hour of time difference equals 15 degrees of longitude\"." },
      { n: 63, q: 'Why does the professor mention pendulum clocks?', options: ['To show why accurate timekeeping at sea was difficult', 'To explain how Harrison designed his first clock', 'To describe how astronomers observed the moon', 'To argue that they were more accurate than chronometers'], a: 0, cue: "didn't work on a rolling ship",
        explain: "Câu hỏi mục đích: đồng hồ quả lắc là loại chính xác nhất thời đó nhưng \"didn't work on a rolling ship\" → minh họa vì sao giữ được giờ chính xác trên biển là việc rất khó." },
      { n: 64, q: 'What can be inferred about the officials who judged the prize?', options: ['They had expected a solution based on astronomy.', 'They designed sea clocks themselves.', 'They paid Harrison the full prize immediately.', 'They did not believe longitude was important.'], a: 0, cue: 'slow to accept a mechanical solution',
        explain: "Câu suy luận: nhiều chuyên gia \"expected the answer to come from astronomy\", và hội đồng \"slow to accept a mechanical solution\", chỉ trả tiền thưởng từng phần, muộn màng → suy ra họ đã kỳ vọng một giải pháp thiên văn học hơn là đồng hồ cơ." },
    ])],
  });

  /* ===================================================================
   * BỘ 4 · WRITING & SPEAKING (tự biên soạn). Build a Sentence câu 31–40.
   * =================================================================== */
  TF.writing.push({
    id: 'tf4-bs', set: 4, task: 'sentence', title: 'Build a Sentence · Set 4',
    instr: 'Put the words in the correct order to make a grammatical response.',
    items: [
      { n: 31, prompt: 'Why were you late for class?', chunks: ['the bus', 'was', 'delayed', 'because of', 'the heavy snow'], end: '.',
        explain: "Câu bị động quá khứ S + was + V3: \"the bus was delayed\"; \"because of + cụm danh từ\" chỉ nguyên nhân đứng sau: \"because of the heavy snow\"." },
      { n: 32, prompt: 'Have you decided which course to take?', chunks: ['I', 'haven\'t', 'made up', 'my mind', 'yet'], end: '.',
        explain: "Hiện tại hoàn thành phủ định \"haven't + V3\"; cụm \"make up my mind\" = quyết định; \"yet\" đứng cuối câu phủ định." },
      { n: 33, prompt: 'Can you tell me where the computer lab is?', chunks: ['it\'s', 'on the third floor', 'next to', 'the library entrance'], end: '.',
        explain: "S + be + nơi chốn: \"it's on the third floor\"; cụm vị trí bổ sung \"next to the library entrance\" đứng sau." },
      { n: 34, prompt: 'What did the professor say about the project?', chunks: ['she', 'told us', 'to', 'finish', 'the first draft', 'by Friday'], end: '.',
        explain: "Câu tường thuật mệnh lệnh: tell + sb + to V → \"she told us to finish the first draft\"; mốc thời hạn \"by Friday\" đứng cuối." },
      { n: 35, prompt: 'Do you know when the café opens?', chunks: ['I', 'think', 'it', 'opens', 'at', 'seven thirty'], end: '.',
        explain: "Câu trả lời dùng mệnh đề sau \"I think\": \"I think it opens at seven thirty\" – chủ ngữ \"it\" số ít nên \"opens\" thêm -s; \"at\" + giờ." },
      { n: 36, prompt: 'Is the new dormitory better than the old one?', chunks: ['it\'s', 'much', 'quieter', 'than', 'the one', 'I lived in', 'last year'], end: '.',
        explain: "So sánh hơn có từ nhấn mạnh: \"much + quieter + than\"; \"the one (that) I lived in last year\" là mệnh đề quan hệ rút gọn đại từ." },
      { n: 37, prompt: 'Could you help me move these chairs?', chunks: ['where', 'would you like', 'me', 'to put', 'them'], end: '?', starter: 'Sure!',
        explain: "Câu hỏi Wh- với \"would you like + sb + to V\": \"where would you like me to put them?\" (bạn muốn mình đặt chúng ở đâu?)." },
      { n: 38, prompt: 'Did you enjoy the guest lecture?', chunks: ['it was', 'more interesting', 'than', 'I had expected'], end: '.', starter: 'Yes!',
        explain: "So sánh hơn \"more interesting than\"; quá khứ hoàn thành \"I had expected\" diễn tả điều đã nghĩ TRƯỚC buổi giảng." },
      { n: 39, prompt: 'Why did you choose this university?', chunks: ['it', 'offers', 'one of', 'the best', 'engineering programs', 'in the country'], end: '.',
        explain: "Cấu trúc \"one of + the + so sánh nhất + danh từ số nhiều\": \"one of the best engineering programs\"; nơi chốn \"in the country\" đứng cuối." },
      { n: 40, prompt: 'Should I bring anything to the study group?', chunks: ['you', 'might', 'want', 'to bring', 'your notes', 'from last week'], end: '.',
        explain: "Lời khuyên nhẹ nhàng \"might want to + V\" (có lẽ bạn nên…): \"you might want to bring your notes from last week\"." },
    ],
  });
  TF.writing.push({
    id: 'tf4-em1', set: 4, task: 'email', title: 'Reporting a Problem in Your Dormitory', minutes: 7,
    scenario: 'The heating in your dormitory room has not worked properly for a week. It is getting colder, and you have already told the front desk once, but nothing has happened.',
    to: 'Ms. Patel, the housing services manager',
    points: ['Describe the problem and how long it has lasted.', 'Explain how it is affecting you.', 'Ask for a specific action and suggest a time.'],
    model: "Dear Ms. Patel,\n\nI am writing about a problem with the heating in my room, 314 in Maple Hall. For the past week, the radiator has only produced a little heat, and the temperature in the room has dropped to around 15°C at night.\n\nI reported the problem at the front desk last Monday, but no one has come to look at it yet. The cold is making it difficult for me to sleep and to study in my room, and I have had to spend most evenings in the library.\n\nCould you please arrange for a technician to check the radiator as soon as possible? I am available every morning before 11 a.m. this week, and I am happy for staff to enter the room if I am not there.\n\nThank you very much for your help.\n\nBest regards,\nDaniel Kim",
    checklist: ['Nêu rõ vấn đề (lò sưởi hỏng), địa điểm (số phòng) và thời gian kéo dài ngay đoạn đầu', 'Cho biết đã báo trước đó nhưng chưa được xử lý – nêu sự việc, không trách móc', 'Giải thích ảnh hưởng cụ thể (khó ngủ, khó học)', 'Đề xuất hành động cụ thể và khung giờ thuận tiện', 'Giọng văn lịch sự, trang trọng; có lời cảm ơn và ký tên', 'Khoảng 120–180 từ'],
    tips: 'Thư phản ánh hiệu quả khi có chi tiết kiểm chứng được (số phòng, nhiệt độ, ngày đã báo) và một đề nghị rõ ràng, thay vì chỉ than phiền chung chung.',
  });
  TF.writing.push({
    id: 'tf4-em2', set: 4, task: 'email', title: 'Inviting a Classmate to a Study Group', minutes: 7,
    scenario: 'You are organizing a study group for your statistics course before the final exam. A classmate, Lena, missed the last two classes but is good at statistics.',
    to: 'Lena, a classmate in your statistics course',
    points: ['Explain why you are writing.', 'Give details about the study group.', 'Explain why you would like her to join.'],
    model: "Hi Lena,\n\nI hope you're doing well. I noticed you missed the last two statistics classes, so I wanted to let you know about a study group a few of us are starting before the final exam.\n\nWe're planning to meet every Tuesday and Thursday from 6 to 8 p.m. in Room 12 of the library, starting next week. Each session, we'll review one chapter and work through practice problems together. I can also share my notes from the classes you missed.\n\nIt would be great if you could join us. You always explain the difficult formulas so clearly in class, and I think the rest of us could learn a lot from you. Of course, it would also help you catch up on the material.\n\nLet me know if you're interested!\n\nBest,\nTom",
    checklist: ['Mở đầu thân thiện và nêu lý do viết thư', 'Cung cấp chi tiết cụ thể: thời gian, địa điểm, nội dung buổi học', 'Nêu lý do mời (bạn giỏi môn này) và lợi ích cho cả hai bên', 'Đề nghị hỗ trợ (chia sẻ ghi chép) – thể hiện thiện chí', 'Giọng văn thân mật nhưng rõ ràng; có câu kết mời phản hồi', 'Khoảng 120–180 từ'],
    tips: 'Với thư gửi bạn cùng lớp, giọng văn thân mật hơn (Hi…, Best,…) nhưng vẫn cần đủ ba ý của đề và chi tiết cụ thể.',
  });
  TF.writing.push({
    id: 'tf4-ad1', set: 4, task: 'discussion', title: 'Should Homework Be Graded?', minutes: 10,
    professor: { name: 'Dr. Owens', text: 'This week in our education course, we are looking at how teachers assess learning. Some teachers grade every homework assignment, while others give feedback but no grades, arguing that homework should be a chance to practise without pressure. Should homework count toward students\' final grades? Explain why or why not.' },
    students: [
      { name: 'Maya', text: 'Yes. If homework doesn\'t count, many students simply won\'t do it. Grades give people a reason to practise regularly instead of studying only before exams.' },
      { name: 'Luis', text: 'I disagree. When homework is graded, students copy answers or use AI tools just to get points. Without grades, they would be more honest about what they don\'t understand.' },
    ],
    model: "I think homework should count toward final grades, but only for a small percentage. Maya is right that many students need some motivation to practise regularly; without any reward, homework often gets pushed aside by other deadlines. However, Luis makes a good point about copying. To solve this, teachers could grade homework mainly for completion and effort rather than for correct answers. For example, if each assignment were worth just one or two percent, students would still have a reason to do it, but there would be little benefit in copying. As a result, homework could remain a low-pressure way to practise while still encouraging good study habits.",
    checklist: ['Nêu quan điểm rõ ngay câu đầu (đồng ý có điều kiện)', 'Phản hồi cả ý của Maya và Luis', 'Đóng góp ý MỚI: chấm theo mức độ hoàn thành, tỉ trọng điểm nhỏ', 'Có ví dụ cụ thể (1–2% mỗi bài) hỗ trợ lập luận', 'Dùng từ nối: However, For example, As a result', 'Tối thiểu khoảng 100 từ'],
    tips: 'Một cách mạnh để đóng góp ý mới là đề xuất giải pháp dung hòa giải quyết mối lo của người phản đối, thay vì chỉ chọn một bên.',
  });
  TF.writing.push({
    id: 'tf4-ad2', set: 4, task: 'discussion', title: 'Are Online Reviews Reliable?', minutes: 10,
    professor: { name: 'Dr. Mensah', text: 'In our marketing class, we have discussed how online customer reviews influence what people buy. Some people rely heavily on star ratings and reviews, while others believe reviews are often fake or extreme. How much should consumers trust online reviews when making a purchase? Explain your view.' },
    students: [
      { name: 'Aiko', text: 'I trust them a lot. When hundreds of people say a product is good, it is probably good. Reviews also mention problems that advertisements never tell you about.' },
      { name: 'David', text: 'I am more careful. Some companies pay for positive reviews, and people who had a bad experience are much more likely to write one than satisfied customers.' },
    ],
    model: "In my opinion, online reviews are useful, but consumers should read them carefully rather than trust the star rating alone. Aiko is correct that a large number of reviews can reveal real strengths and weaknesses that advertisements hide. On the other hand, David is right that some reviews are fake or written only by very angry customers. A good strategy is to focus on detailed reviews from verified buyers and to look for problems that many different people mention. For instance, if several reviewers say that a laptop battery lasts only two hours, that is probably true. In short, reviews are most reliable when we look for patterns instead of single opinions.",
    checklist: ['Nêu quan điểm rõ ngay câu đầu', 'Phản hồi cả Aiko và David', 'Đóng góp ý MỚI: đọc đánh giá chi tiết, người mua đã xác minh, tìm điểm lặp lại', 'Có ví dụ cụ thể (pin laptop)', 'Dùng từ nối: On the other hand, For instance, In short', 'Tối thiểu khoảng 100 từ'],
    tips: 'Tránh chỉ tóm tắt lại hai bạn; giám khảo chấm cao khi bạn đưa thêm tiêu chí hay cách làm cụ thể của riêng mình.',
  });
  TF.speaking.push({
    id: 'tf4-rp1', set: 4, task: 'repeat', title: 'Library Help Desk', accent: 'en-GB',
    context: 'You are training to work at the university library help desk. Listen to the supervisor and repeat exactly what you hear.',
    sentences: [
      { t: 'Good morning, how can I help?', tip: 'Nhấn "HELP"; "how can I" đọc lướt, nối âm /haʊkənaɪ/.' },
      { t: 'Books are due back in three weeks.', tip: '"due back" giọng Anh /djuː bæk/; nhấn "THREE WEEKS".' },
      { t: 'You can renew them online up to twice.', tip: '"renew" /rɪˈnjuː/; "up to" đọc lướt /ʌptə/.' },
      { t: 'Quiet study rooms are on the fourth floor.', tip: '"Quiet" có hai âm tiết /ˈkwaɪət/, khác "quite"; "fourth floor" giữ rõ /θ/ và /fl/.' },
      { t: 'Please keep food and drinks out of the reading room.', tip: 'Nối âm "out of" /aʊtəv/; nhấn "FOOD", "DRINKS", "READING ROOM".' },
      { t: 'If a book is missing from the shelf, you can request it at this desk.', tip: 'Ngắt nhịp sau "shelf,"; "request it" nối âm /rɪˈkwestɪt/.' },
      { t: 'Students who return books late will not be able to borrow anything until the fine is paid.', tip: 'Câu dài – chia nhịp: "Students who return books late / will not be able to borrow anything / until the fine is paid".' },
    ],
  });
  TF.speaking.push({
    id: 'tf4-rp2', set: 4, task: 'repeat', title: 'Science Lab Assistant', accent: 'en-US',
    context: 'You are starting work as an assistant in a chemistry teaching lab. Listen to the lab manager and repeat exactly what you hear.',
    sentences: [
      { t: 'Safety glasses are required at all times.', tip: 'Nhấn "SAFETY GLASSES" và "ALL TIMES"; "required" /rɪˈkwaɪərd/.' },
      { t: 'Check the gas valves before you leave.', tip: '"valves" /vælvz/ – giữ rõ âm cuối /vz/.' },
      { t: 'Label every bottle with the date and your initials.', tip: '"Label" /ˈleɪbəl/; "initials" /ɪˈnɪʃəlz/, nhấn âm tiết thứ hai.' },
      { t: 'Broken glass goes in the yellow container.', tip: '"Broken glass" có cụm /k/ + /gl/; nhấn "YELLOW".' },
      { t: 'Students should wash their hands before leaving the lab.', tip: 'Nối âm "wash their" – giữ âm /ʃ/ rồi chuyển sang /ð/.' },
      { t: 'If anything spills, tell the instructor immediately.', tip: 'Ngắt nhịp sau "spills,"; "immediately" /ɪˈmiːdiətli/.' },
      { t: 'At the end of each session, return all equipment to the cabinet and wipe down the benches.', tip: 'Câu dài – chia nhịp: "At the end of each session / return all equipment to the cabinet / and wipe down the benches".' },
    ],
  });
  TF.speaking.push({
    id: 'tf4-iv1', set: 4, task: 'interview', title: 'Sleep and Daily Routines', seconds: 45, accent: 'en-GB',
    context: 'A health researcher is interviewing university students about their sleep and daily routines. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'To start, could you describe a typical evening for you during the semester?',
        model: "On most evenings I get back from campus around six and cook a simple dinner. After that, I usually study for two or three hours, either in my room or in the library. I try to stop working by ten so that I have some time to relax, maybe by reading or calling my family, before I go to bed.",
        tip: 'Kể theo trình tự thời gian (around six → after that → by ten) để câu trả lời mạch lạc.' },
      { q: 'How many hours do you usually sleep, and do you think it is enough?',
        model: "I usually sleep about six and a half hours on weekdays, which honestly isn't quite enough. I often feel tired in my morning classes, especially on Mondays. On weekends I sleep longer, around eight hours, but I've read that it's better to keep the same schedule every day, so I'm trying to go to bed a little earlier.",
        tip: 'Trả lời thẳng câu hỏi (con số cụ thể) rồi đánh giá và nêu bằng chứng (thấy mệt buổi sáng).' },
      { q: 'What do you think is the biggest cause of poor sleep among students?',
        model: "I think the biggest cause is using phones late at night. Many students check social media or watch videos in bed, and it's easy to lose track of time. The bright screen also makes it harder to fall asleep. Stress about deadlines plays a role too, but I believe phones are the main problem because the habit is so common.",
        tip: 'Nêu một nguyên nhân chính, giải thích hai cơ chế (mất thời gian + ánh sáng màn hình), rồi so sánh ngắn với nguyên nhân khác.' },
      { q: 'Should universities do more to help students sleep better? What could they do?',
        model: "Yes, I think they should. For example, universities could avoid scheduling exams very early in the morning, and libraries could close earlier so students aren't tempted to stay up all night. They could also run short workshops on healthy sleep habits during orientation week. Small changes like these could improve both health and grades.",
        tip: 'Đồng ý rồi đưa 2–3 đề xuất cụ thể, kết bằng lợi ích chung.' },
    ],
  });
  TF.speaking.push({
    id: 'tf4-iv2', set: 4, task: 'interview', title: 'Learning Languages', seconds: 45, accent: 'en-US',
    context: 'A researcher from the language center is interviewing students about their experience of learning languages. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'What languages have you studied, and how did you start learning them?',
        model: "Apart from my first language, I've studied English and a little Japanese. I started English in primary school, mostly through songs and simple games. I began Japanese at university because I was interested in Japanese films, and I wanted to understand them without subtitles one day.",
        tip: 'Liệt kê ngắn gọn rồi kể cách bắt đầu cho từng ngôn ngữ, kèm động lực cá nhân.' },
      { q: 'Which part of learning a language do you find most difficult?',
        model: "For me, listening is the hardest part. When people speak quickly, they connect words together, and I miss important details. Reading is much easier because I can go back and check. To improve, I've started listening to short podcasts every day and repeating sentences out loud.",
        tip: 'Chọn một kỹ năng, giải thích vì sao khó, so sánh với kỹ năng dễ hơn và nêu cách bạn đang khắc phục.' },
      { q: 'Do you think it is better to learn a language in a classroom or by living abroad?',
        model: "I think living abroad is more effective, because you have to use the language every day in real situations, like shopping or asking for directions. However, a classroom is still useful at the beginning, since a teacher can explain grammar clearly and correct mistakes. Ideally, learners should combine both.",
        tip: 'Đưa lựa chọn chính kèm lý do, sau đó thừa nhận ưu điểm của phương án còn lại bằng "However…" và kết luận dung hòa.' },
      { q: 'How might technology change the way people learn languages in the future?',
        model: "Technology will probably make practice much easier. AI tutors can already hold conversations and correct pronunciation at any time of day. In the future, people might use smart glasses that show translations or vocabulary in real situations. Still, I believe human teachers will remain important for motivation and cultural understanding.",
        tip: 'Nêu thay đổi hiện tại → dự đoán tương lai → một ý cân bằng về vai trò của con người.' },
    ],
  });


  /* Xoay vị trí đáp án đúng (chỉ các unit của bộ 4) */
  const PAT = [2, 0, 3, 1, 1, 3, 0, 2, 3, 2, 1, 0];
  const counter = {};
  [...TF.reading, ...TF.listening].filter(u => /^tf4-/.test(u.id)).forEach(u => (u.groups || []).forEach(gr => {
    if (gr.type !== 'mcq' || gr._rot) return; gr._rot = 1;
    gr.items.forEach(it => {
      const k = counter[u.task] = (counter[u.task] || 0) + 1;
      const n = it.options.length, want = PAT[(k - 1) % PAT.length] % n, r = (it.a - want + n) % n;
      if (r) { it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want; }
    });
  }));
})(typeof self !== 'undefined' ? self : this);
