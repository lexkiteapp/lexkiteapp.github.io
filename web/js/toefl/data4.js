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

  /* ===================================================================
   * BỘ 5 · WRITING (tự biên soạn). Build a Sentence câu 41–48;
   * email/discussion có thêm: outline (dàn ý), vocab (từ nên dùng),
   * mid + midNote (bài mức trung bình và lý do kém hơn bài mẫu).
   * =================================================================== */
  TF.writing.push({
    id: 'tf5-bs', set: 5, task: 'sentence', title: 'Build a Sentence · Set 5',
    instr: 'Put the words in the correct order to make a grammatical response.',
    items: [
      { n: 41, prompt: 'Where did you find that article?', chunks: ['I', 'found', 'it', 'in a journal', 'that my professor', 'recommended'], end: '.',
        explain: "S + V + O: \"I found it\"; nơi chốn \"in a journal\" rồi mệnh đề quan hệ \"that my professor recommended\" bổ nghĩa cho \"a journal\" nên phải đứng ngay sau nó." },
      { n: 42, prompt: 'Why didn\'t you come to the meeting?', chunks: ['nobody', 'told me', 'that', 'it had been', 'moved', 'to Tuesday'], end: '.',
        explain: "tell + sb + that + mệnh đề: \"nobody told me that…\"; bị động quá khứ hoàn thành \"it had been moved\" (cuộc họp đã bị dời TRƯỚC lúc đó); \"move to + thời điểm mới\"." },
      { n: 43, prompt: 'How long have you been learning English?', chunks: ['I', 'have been', 'studying', 'it', 'since', 'I was ten'], end: '.',
        explain: "Hiện tại hoàn thành tiếp diễn \"have been + V-ing\" cho hành động kéo dài đến nay; \"since + mốc thời gian/mệnh đề quá khứ\": \"since I was ten\"." },
      { n: 44, prompt: 'Do you know if the library is open on Sunday?', chunks: ['I\'m not sure', 'whether', 'it', 'opens', 'on weekends'], end: '.',
        explain: "Câu hỏi gián tiếp sau \"I'm not sure\": whether + S + V theo trật tự câu khẳng định (\"whether it opens\", không đảo \"does it open\"); \"on weekends\" đứng cuối." },
      { n: 45, prompt: 'What did your advisor suggest?', chunks: ['she', 'suggested', 'that', 'I', 'take', 'an extra writing course'], end: '.',
        explain: "suggest + that + S + V nguyên mẫu (giả định cách): \"that I take\", không dùng \"took\" hay \"to take\"." },
      { n: 46, prompt: 'I can\'t open the file you sent me.', chunks: ['which', 'program', 'are you', 'using', 'to open', 'it'], end: '?', starter: 'Oh no!',
        explain: "Câu hỏi Wh- với \"which + danh từ\": \"which program\" + trợ động từ đảo lên \"are you using\"; \"to open it\" chỉ mục đích đứng cuối." },
      { n: 47, prompt: 'Which apartment did you decide to rent?', chunks: ['the one', 'with', 'a balcony', 'that', 'faces', 'the park'], end: '.',
        explain: "Đại từ \"the one\" + cụm giới từ \"with a balcony\"; mệnh đề quan hệ \"that faces the park\" bổ nghĩa cho \"a balcony\" – chủ ngữ số ít nên \"faces\" thêm -s." },
      { n: 48, prompt: 'Would you mind if I borrowed your notes?', chunks: ['you', 'can', 'keep', 'them', 'until', 'the end of the week'], end: '.', starter: 'Not at all.',
        explain: "Động từ khuyết thiếu \"can + V nguyên mẫu\": \"you can keep them\"; \"until + mốc thời gian\" đứng cuối: \"until the end of the week\"." },
    ],
  });
  TF.writing.push({
    id: 'tf5-em1', set: 5, task: 'email', title: 'Asking to Join a Research Project', minutes: 7,
    scenario: 'Your biology professor, Dr. Lin, mentioned in class that she is looking for undergraduate assistants for a summer project on local river pollution. You are very interested, but you have never worked in a research lab.',
    to: 'Dr. Lin, your biology professor',
    points: ['Explain why you are interested in the project.', 'Describe skills or experience that could be useful.', 'Ask about the next steps for applying.'],
    model: "Dear Dr. Lin,\n\nMy name is Sara Ahmed, and I am a second-year student in your Introduction to Ecology course. In class on Tuesday, you mentioned that you are looking for assistants for your summer project on river pollution, and I would very much like to be considered.\n\nI grew up near the Clearwater River, and I have seen how much its condition has changed in recent years, so the topic is personally important to me. Although I have not worked in a research lab before, I earned an A in the chemistry lab course last semester, and I am comfortable using spreadsheets to organize data. I am also available full-time from June to August.\n\nCould you tell me how to apply and whether you need any documents, such as a transcript or a reference? I would also be happy to meet during your office hours.\n\nThank you for your time.\n\nSincerely,\nSara Ahmed",
    mid: "Dear Dr. Lin,\n\nI heard about your summer project in class. I am very interested in it because I like biology and the environment is important. I think it would be a great experience for me.\n\nI don't have research experience, but I am a hard worker and I learn quickly. I am also good at working with other people.\n\nPlease tell me if I can join the project. Thank you.\n\nBest regards,\nSara",
    midNote: 'Bài trung bình đủ ba ý nhưng chung chung: lý do quan tâm ("environment is important") và kỹ năng ("hard worker") không có chi tiết kiểm chứng; không giới thiệu mình là ai; chỉ xin "join" thay vì hỏi bước nộp đơn cụ thể. Bài mẫu nêu môn học, điểm phòng thí nghiệm, kỹ năng bảng tính, thời gian rảnh và hỏi rõ giấy tờ cần nộp.',
    outline: ['Giới thiệu bản thân + nơi nghe về dự án + mục đích thư', 'Lý do quan tâm (gắn với trải nghiệm thật)', 'Kỹ năng liên quan dù chưa làm nghiên cứu (môn học, công cụ, thời gian)', 'Hỏi cách nộp đơn, giấy tờ cần có; đề nghị gặp; cảm ơn'],
    vocab: ['I would very much like to be considered – rất mong được xem xét', 'personally important to me – có ý nghĩa với cá nhân tôi', 'Although I have not… before – dù tôi chưa từng…', 'be comfortable using… – sử dụng thành thạo…', 'Could you tell me how to apply…? – xin cô cho biết cách nộp đơn…'],
    checklist: ['Giới thiệu bản thân và nêu mục đích thư ngay đoạn đầu', 'Lý do quan tâm cụ thể, có chi tiết cá nhân', 'Nêu kỹ năng liên quan có bằng chứng (điểm, công cụ, thời gian rảnh)', 'Hỏi rõ bước tiếp theo (cách nộp, giấy tờ)', 'Giọng trang trọng với giáo sư; có lời cảm ơn và ký tên đầy đủ', 'Khoảng 120–180 từ'],
    tips: 'Khi thiếu kinh nghiệm, đừng giấu – hãy dùng "Although I have not…" rồi chuyển ngay sang điểm mạnh có bằng chứng.',
  });
  TF.writing.push({
    id: 'tf5-em2', set: 5, task: 'email', title: 'A Lost Jacket at the Campus Gym', minutes: 7,
    scenario: 'Yesterday you left your jacket in the locker room of the campus gym. When you went back this morning, it was not there, and the student at the front desk was not sure what happens to lost items.',
    to: 'Mr. Russo, the manager of the campus gym',
    points: ['Describe the item and when and where you lost it.', 'Explain why it is important to you.', 'Ask what you should do next.'],
    model: "Dear Mr. Russo,\n\nI am writing to ask for your help in finding a jacket that I left in the men's locker room at the campus gym yesterday evening, at around 7 p.m.\n\nIt is a dark green waterproof jacket with a black hood and a small tear near the left pocket. My student ID card was in the inside pocket, which is why I am especially worried. Without the card, I cannot enter the library or pay for meals in the dining hall.\n\nWhen I returned this morning, the student at the front desk was not sure where lost items are kept. Could you let me know whether the jacket has been handed in, and if not, whether there is a lost-and-found form I should fill out? I can come to the gym at any time this week.\n\nThank you for your help.\n\nBest regards,\nOmar Haddad",
    mid: "Dear Mr. Russo,\n\nYesterday I lost my jacket at the gym. It is green. I went back today but it was not there and the person at the desk did not know anything, which was not very helpful.\n\nThe jacket is important because my student card is inside it. I need it every day.\n\nCan you please find my jacket and send it to me? Thank you.\n\nOmar",
    midNote: 'Bài trung bình mô tả quá sơ sài ("It is green"), thiếu nơi và giờ cụ thể nên người quản lý khó tìm; câu chê nhân viên trực ("not very helpful") làm giọng thư kém lịch sự; yêu cầu "find my jacket and send it" không thực tế. Bài mẫu mô tả đặc điểm nhận dạng, hậu quả cụ thể khi mất thẻ và hỏi đúng quy trình (mẫu báo mất đồ).',
    outline: ['Mục đích thư + nơi, thời điểm để quên', 'Mô tả chi tiết để nhận dạng (màu, chất liệu, dấu hiệu riêng)', 'Vì sao quan trọng (thẻ sinh viên bên trong → hậu quả)', 'Hỏi đã có ai nộp chưa / thủ tục báo mất; thời gian có thể đến; cảm ơn'],
    vocab: ['I am writing to ask for your help in… – tôi viết thư để nhờ ông giúp…', 'a dark green waterproof jacket – áo khoác chống nước màu xanh lá đậm', 'which is why I am especially worried – đó là lý do tôi đặc biệt lo lắng', 'be handed in – được (ai đó) nộp lại', 'a lost-and-found form – mẫu khai báo mất đồ'],
    checklist: ['Nêu mục đích, nơi và thời điểm để quên ngay đoạn đầu', 'Mô tả đồ vật đủ chi tiết để nhận dạng', 'Giải thích vì sao đồ vật quan trọng bằng hậu quả cụ thể', 'Hỏi bước tiếp theo hợp lý (đã có ai nộp chưa, mẫu khai báo)', 'Không chê trách nhân viên; giọng lịch sự', 'Khoảng 120–180 từ'],
    tips: 'Thông tin càng cụ thể (giờ, màu, dấu hiệu riêng) thì người nhận càng dễ giúp – đó cũng là tiêu chí "development" của giám khảo.',
  });
  TF.writing.push({
    id: 'tf5-em3', set: 5, task: 'email', title: 'Rescheduling a Job Interview', minutes: 7,
    scenario: 'A local company has invited you to an interview for a part-time marketing assistant job next Wednesday at 10 a.m. However, you have just learned that you have a final exam at the same time.',
    to: 'Ms. Grant, the hiring coordinator at the company',
    points: ['Thank her for the invitation and confirm your interest.', 'Explain why you cannot attend at the scheduled time.', 'Suggest other times when you are available.'],
    model: "Dear Ms. Grant,\n\nThank you very much for inviting me to interview for the part-time marketing assistant position. I am still very interested in the role and was pleased to hear from you.\n\nUnfortunately, I have just found out that my final exam in statistics has been scheduled for next Wednesday at 10 a.m., the same time as the interview. Because the exam is worth forty percent of my grade, I am not able to move it.\n\nWould it be possible to reschedule the interview? I am free on Wednesday afternoon after 2 p.m., all day on Thursday, and on Friday morning. If none of these times are convenient, I would be happy to have the interview by video call instead.\n\nI apologize for any inconvenience, and I look forward to hearing from you.\n\nKind regards,\nMinh Tran",
    mid: "Dear Ms. Grant,\n\nThanks for the invitation. I can't come to the interview on Wednesday because I have an exam. Exams at my university are very important and we cannot change them.\n\nCan we do the interview another day? I am free next week.\n\nI hope this is OK. I really want this job.\n\nBest,\nMinh",
    midNote: 'Bài trung bình ngắn (khoảng 60 từ) và giọng quá thân mật với nhà tuyển dụng ("Thanks", "OK", "Best"); "I am free next week" không đưa khung giờ cụ thể, buộc người nhận phải hỏi lại; thiếu lời xin lỗi vì gây bất tiện. Bài mẫu nêu thời gian thi chính xác, ba khung giờ thay thế và cả phương án gọi video.',
    outline: ['Cảm ơn lời mời + khẳng định vẫn rất quan tâm', 'Lý do không thể đến: lịch thi trùng, không đổi được (kèm chi tiết)', 'Đề xuất 2–3 khung giờ cụ thể + phương án dự phòng (video call)', 'Xin lỗi vì bất tiện; mong phản hồi'],
    vocab: ['I have just found out that… – tôi vừa biết rằng…', 'has been scheduled for… – đã được xếp lịch vào…', 'Would it be possible to reschedule…? – liệu có thể dời lịch… không?', 'If none of these times are convenient… – nếu các khung giờ này đều không tiện…', 'I apologize for any inconvenience – xin lỗi vì sự bất tiện'],
    checklist: ['Cảm ơn và khẳng định vẫn muốn ứng tuyển', 'Lý do vắng mặt rõ ràng, có chi tiết (môn, giờ, tỉ trọng điểm)', 'Đưa ít nhất hai khung giờ thay thế cụ thể', 'Có phương án linh hoạt (phỏng vấn online)', 'Giọng trang trọng, có lời xin lỗi; ký tên đầy đủ', 'Khoảng 120–180 từ'],
    tips: 'Thư xin đổi lịch tốt luôn giúp người nhận ra quyết định ngay: đưa sẵn các lựa chọn cụ thể thay vì "another day".',
  });
  TF.writing.push({
    id: 'tf5-em4', set: 5, task: 'email', title: 'Construction Noise near the Library', minutes: 7,
    scenario: 'Construction work has started next to the main library. The noise begins at 7 a.m. and continues all day, and it is now very difficult to study there during the exam period.',
    to: 'Mr. Bell, the director of campus facilities',
    points: ['Describe the problem.', 'Explain how it affects students.', 'Suggest one or two possible solutions.'],
    model: "Dear Mr. Bell,\n\nI am a third-year student, and I am writing about the construction work beside the main library, which began on Monday.\n\nThe drilling starts at 7 a.m. and continues until about 6 p.m., and it can be heard clearly on every floor, even in the silent study rooms. Because final exams begin in two weeks, many students rely on the library as a quiet place to revise. Several of my classmates and I have stopped going there, and the other study spaces on campus are already full.\n\nI understand that the work is necessary, but I would like to suggest two possible solutions. First, the noisiest work could be done in the early morning before the library opens. Second, the university could open some empty classrooms in the Arts Building as extra quiet study areas during the exam period.\n\nThank you for considering these ideas.\n\nYours sincerely,\nAnna Kowalski",
    mid: "Dear Mr. Bell,\n\nThe construction near the library is too loud. Nobody can study there anymore and everybody is very angry about it. It is the worst time because exams are coming.\n\nI think you should stop the construction until the exams finish. Or you can tell the workers to be more quiet.\n\nPlease do something soon.\n\nAnna",
    midNote: 'Bài trung bình nêu đúng vấn đề nhưng phóng đại ("Nobody", "everybody is very angry") thay vì đưa chi tiết (giờ khoan, tầng nào nghe thấy); giải pháp thiếu thực tế (dừng hẳn công trình) và giọng ra lệnh ("Please do something soon"); "more quiet" nên là "quieter". Bài mẫu thừa nhận công trình cần thiết, rồi đề xuất hai giải pháp khả thi.',
    outline: ['Giới thiệu + vấn đề (vị trí, thời điểm bắt đầu)', 'Mô tả mức độ (giờ giấc, nghe thấy ở đâu)', 'Ảnh hưởng: mùa thi, sinh viên mất chỗ học, chỗ khác đã kín', 'Thừa nhận công trình cần thiết + 2 giải pháp khả thi; cảm ơn'],
    vocab: ['can be heard clearly on every floor – nghe rõ ở mọi tầng', 'rely on… as a quiet place to revise – dựa vào… làm nơi ôn bài yên tĩnh', 'I understand that…, but… – tôi hiểu rằng…, nhưng…', 'I would like to suggest two possible solutions – tôi xin đề xuất hai giải pháp', 'Thank you for considering these ideas – cảm ơn ông đã xem xét'],
    checklist: ['Nêu rõ vấn đề với chi tiết (giờ, vị trí, mức độ)', 'Giải thích ảnh hưởng cụ thể, gắn với mùa thi', 'Đưa một đến hai giải pháp khả thi', 'Giọng góp ý xây dựng, không phóng đại hay ra lệnh', 'Mở và kết thư trang trọng', 'Khoảng 120–180 từ'],
    tips: 'Thư phàn nàn đạt điểm cao khi người viết tỏ ra hiểu vị trí của bên kia ("I understand that…") rồi mới đề xuất.',
  });
  TF.writing.push({
    id: 'tf5-em5', set: 5, task: 'email', title: 'Recommending a Book for the Library', minutes: 7,
    scenario: 'The university library asks students to recommend books it should buy. You recently read a book that helped you a lot in one of your courses, but the library does not have a copy.',
    to: 'Ms. Ortiz, the library\'s collections librarian',
    points: ['Identify the book you want to recommend.', 'Explain how it helped you.', 'Explain why other students would benefit from it.'],
    model: "Dear Ms. Ortiz,\n\nI saw the library's request for book suggestions, and I would like to recommend Thinking with Data, an introduction to statistics for social science students.\n\nI borrowed a copy from a friend while I was taking Research Methods last semester. The textbook for the course was quite technical, but this book explains each method using everyday examples, such as surveys about sleep and exercise. After reading the chapter on sampling, I finally understood a topic I had struggled with for weeks, and my grade on the next assignment improved considerably.\n\nI believe many other students would benefit from it as well. Research Methods is required for every psychology and sociology major, so more than two hundred students take it each year, and many of them find statistics difficult. Having two or three copies in the library would make the book available to everyone.\n\nThank you for considering my suggestion.\n\nBest regards,\nLeo Martins",
    mid: "Dear Ms. Ortiz,\n\nI want to recommend a book called Thinking with Data. It is a very good book and I liked it a lot.\n\nIt helped me in my Research Methods class. It is easier than our textbook and it has many examples, so I understood the course better.\n\nI think other students will also like it, because statistics is difficult for many people. Please buy this book for the library.\n\nThank you,\nLeo",
    midNote: 'Bài trung bình đủ ba ý nhưng mỗi ý chỉ một câu chung chung ("very good", "many examples"); không có ví dụ cụ thể về việc sách giúp thế nào; lý do cho sinh viên khác thiếu số liệu. Bài mẫu mô tả loại sách, cho ví dụ (chương chọn mẫu, điểm tăng) và lập luận bằng quy mô người học (môn bắt buộc, hơn 200 sinh viên/năm).',
    outline: ['Mở: phản hồi lời kêu gọi + tên và loại sách', 'Sách đã giúp thế nào: bối cảnh môn học, so sánh với giáo trình, kết quả cụ thể', 'Lợi ích cho người khác: môn bắt buộc, số sinh viên, độ khó', 'Đề xuất số bản; cảm ơn'],
    vocab: ['I would like to recommend… – tôi muốn giới thiệu…', 'explains each method using everyday examples – giải thích mỗi phương pháp bằng ví dụ đời thường', 'a topic I had struggled with for weeks – chủ đề tôi vật lộn suốt nhiều tuần', 'improved considerably – tiến bộ đáng kể', 'would benefit from it as well – cũng sẽ được lợi từ nó'],
    checklist: ['Nêu tên và giới thiệu ngắn về cuốn sách', 'Kể sách giúp bạn bằng ví dụ và kết quả cụ thể', 'Lý do cho sinh viên khác có lập luận (môn bắt buộc, số lượng)', 'Có đề xuất cụ thể (số bản)', 'Giọng trang trọng, mạch lạc theo đoạn', 'Khoảng 120–180 từ'],
    tips: 'Thay tính từ chung chung ("very good") bằng một kết quả đo được – giám khảo đánh giá cao chi tiết làm bằng chứng.',
  });
  TF.writing.push({
    id: 'tf5-em6', set: 5, task: 'email', title: 'Asking a Coworker to Swap Shifts', minutes: 7,
    scenario: 'You work part-time at the campus café. Your cousin is getting married next Saturday, but you are scheduled to work that morning. Your coworker Jamie usually works on Sundays.',
    to: 'Jamie, a coworker at the café',
    points: ['Explain your situation.', 'Ask Jamie to swap shifts with you.', 'Offer something to make the swap easier for Jamie.'],
    model: "Hi Jamie,\n\nI hope your week is going well. I have a favor to ask. My cousin is getting married next Saturday, and I only found out the date for the ceremony yesterday. Unfortunately, I'm scheduled to work the 7 a.m. to 1 p.m. shift at the café that day.\n\nWould you be willing to swap shifts with me? I could take your Sunday shift on the same weekend, from 9 a.m. to 3 p.m., so you would still work the same number of hours. If Sunday doesn't suit you, I'd also be happy to cover one of your weekday evening shifts later this month.\n\nI know it's short notice, so please don't feel any pressure to say yes. If you agree, I'll let our manager know and update the schedule myself.\n\nThanks so much!\n\nCheers,\nPriya",
    mid: "Hi Jamie,\n\nCan you work my shift next Saturday? My cousin is getting married and I have to go. I will work your shift on Sunday.\n\nPlease tell me soon because I need to know.\n\nThanks,\nPriya",
    midNote: 'Bài trung bình quá ngắn (khoảng 40 từ) và mở đầu bằng yêu cầu thẳng thừng; thiếu giờ ca làm, thiếu phương án nếu Chủ nhật không tiện; câu "Please tell me soon because I need to know" gây áp lực. Bài mẫu giải thích hoàn cảnh, đưa hai lựa chọn đổi ca, chủ động báo quản lý và tôn trọng quyền từ chối của Jamie.',
    outline: ['Lời chào thân mật + "I have a favor to ask"', 'Hoàn cảnh: đám cưới, ca làm bị trùng (giờ cụ thể)', 'Đề nghị đổi ca + hai phương án bù lại', 'Thông cảm vì báo gấp; tự lo việc báo quản lý; cảm ơn'],
    vocab: ['I have a favor to ask – mình có việc muốn nhờ', 'Would you be willing to…? – bạn có sẵn lòng… không?', 'swap shifts / cover a shift – đổi ca / làm thay ca', 'If Sunday doesn\'t suit you… – nếu Chủ nhật không tiện cho bạn…', 'It\'s short notice – báo hơi gấp'],
    checklist: ['Nêu hoàn cảnh rõ ràng, có thời gian cụ thể', 'Đề nghị đổi ca lịch sự (Would you be willing…?)', 'Đưa ít nhất một cách bù lại, tốt hơn là hai lựa chọn', 'Tôn trọng quyền từ chối; tự lo phần thủ tục', 'Giọng thân mật phù hợp đồng nghiệp', 'Khoảng 120–180 từ'],
    tips: 'Nhờ vả hiệu quả = lý do rõ + đề nghị cụ thể + giảm phiền cho người kia. Với đồng nghiệp, dùng giọng thân mật nhưng vẫn lịch sự.',
  });
  TF.writing.push({
    id: 'tf5-ad1', set: 5, task: 'discussion', title: 'Should Lectures Be Replaced by Videos?', minutes: 10,
    professor: { name: 'Dr. Patel', text: 'Many universities now record lectures and put them online. Some instructors have gone further: students watch short video lectures at home and use class time only for discussion and problem-solving. Should universities replace traditional lectures with recorded videos? Why or why not?' },
    students: [
      { name: 'Hana', text: 'Yes. With videos, I can pause and rewatch difficult parts, and I can study at the time of day when I concentrate best. Class time is much more useful for asking questions.' },
      { name: 'Marcus', text: 'I\'m not convinced. Many students never watch the videos, so they arrive unprepared and the discussion doesn\'t work. Live lectures at least make sure everyone hears the material.' },
    ],
    model: "I believe universities should replace most lectures with videos, but only if the courses are designed to make students watch them. Hana is right that the ability to pause and replay a video helps students understand difficult material at their own pace. Still, Marcus raises a real concern, since a discussion falls apart when half the class is unprepared. One practical solution is to add a short online quiz after each video that counts toward the final grade. For example, in my chemistry course, a three-question quiz is due before every seminar, and almost everyone now comes prepared. In this way, videos and active class time can work together.",
    mid: "I agree with Hana that videos are better than lectures. When I watch a video I can stop it and watch again, so I understand better. Also I can study at night when I am free. Marcus says students don't watch the videos, but I think this is their problem, not the university's problem. Students are adults and they should be responsible. So universities should use videos.",
    midNote: 'Bài trung bình (khoảng 70 từ, dưới mức ~100 từ) chủ yếu lặp lại ý của Hana; bác bỏ Marcus bằng một câu cảm tính ("their problem") mà không đưa ý mới; câu ngắn, từ nối đơn giản (Also, So). Bài mẫu thừa nhận mối lo của Marcus và đóng góp giải pháp mới (quiz tính điểm) kèm ví dụ thực tế.',
    outline: ['Câu chủ đề: đồng ý có điều kiện', 'Ghi nhận ý Hana (tự điều chỉnh tốc độ học)', 'Thừa nhận lo ngại của Marcus', 'Ý mới: quiz ngắn tính điểm sau mỗi video + ví dụ cá nhân', 'Câu kết: video và giờ học chủ động bổ trợ nhau'],
    vocab: ['at their own pace – theo tốc độ của riêng mình', 'raise a real concern – nêu một mối lo chính đáng', 'fall apart – đổ vỡ, không hiệu quả', 'count toward the final grade – được tính vào điểm cuối kỳ', 'In this way, … – bằng cách này, …'],
    checklist: ['Nêu quan điểm rõ ngay câu đầu', 'Phản hồi cả Hana và Marcus', 'Đóng góp ý MỚI: quiz tính điểm để bảo đảm sinh viên xem video', 'Có ví dụ cụ thể hỗ trợ', 'Dùng từ nối đa dạng: Still, since, For example, In this way', 'Tối thiểu khoảng 100 từ'],
    tips: 'Khi đồng ý với một bạn, hãy dùng ý của bạn kia làm "vấn đề" rồi giải quyết nó – cách nhanh nhất để có ý mới.',
  });
  TF.writing.push({
    id: 'tf5-ad2', set: 5, task: 'discussion', title: 'Is a Gap Year a Good Idea?', minutes: 10,
    professor: { name: 'Dr. Romero', text: 'In some countries, it is common for young people to take a "gap year" between high school and university. They may work, travel, or volunteer before starting their degree. Is taking a gap year a good idea for most students? Explain your opinion.' },
    students: [
      { name: 'Chloe', text: 'Definitely. After twelve years of school, many students are tired and unsure about what to study. A year of work or travel helps them understand what they really want.' },
      { name: 'Ravi', text: 'I think it\'s risky. Once students stop studying, it can be hard to get back into the habit. Also, not every family can afford to let their child spend a year traveling.' },
    ],
    model: "In my view, a gap year can be valuable, but only when students plan it with a clear purpose. I agree with Chloe that a break can help students choose a major more carefully, which may prevent them from switching programs later and wasting time and money. However, Ravi's point about cost is important, because a year of travel is a luxury many families cannot afford. That is why I think the most useful gap years involve paid work or a structured volunteer program rather than travel. For instance, a student who works in a hospital for a year can save money and also find out whether a career in medicine really suits them.",
    mid: "I think a gap year is a good idea. Chloe is right that students are tired after school and they need a rest. During a gap year they can travel and see new places, which is very interesting. Ravi thinks it is expensive, but students can work and save money. In conclusion, I believe a gap year is good for most students.",
    midNote: 'Bài trung bình (khoảng 65 từ) có quan điểm và nhắc cả hai bạn, nhưng phần lớn diễn đạt lại ý của Chloe; phản hồi Ravi chỉ một mệnh đề, chưa phát triển; không có ví dụ; "very interesting", "good" là từ chung chung. Bài mẫu đặt điều kiện (có mục đích rõ), chỉ ra lợi ích kinh tế gián tiếp và đưa ví dụ làm việc ở bệnh viện.',
    outline: ['Câu chủ đề: có giá trị NẾU có mục đích rõ', 'Đồng ý Chloe + mở rộng (tránh đổi ngành, đỡ tốn kém)', 'Thừa nhận ý chi phí của Ravi', 'Ý mới: ưu tiên đi làm có lương / tình nguyện có tổ chức thay vì du lịch', 'Ví dụ: làm ở bệnh viện → vừa tiết kiệm vừa thử nghề'],
    vocab: ['with a clear purpose – với mục đích rõ ràng', 'switch programs – đổi ngành học', 'a luxury many families cannot afford – điều xa xỉ nhiều gia đình không kham nổi', 'a structured volunteer program – chương trình tình nguyện có tổ chức', 'suit someone – phù hợp với ai'],
    checklist: ['Nêu quan điểm rõ (có điều kiện) ngay câu đầu', 'Phản hồi cả Chloe và Ravi, không chỉ nhắc tên', 'Đóng góp ý MỚI: loại gap year hữu ích nhất', 'Ví dụ cụ thể (làm việc ở bệnh viện)', 'Dùng từ nối: However, That is why, For instance', 'Tối thiểu khoảng 100 từ'],
    tips: 'Thêm điều kiện ("only when…") giúp quan điểm tinh tế hơn và mở đường cho ý mới của riêng bạn.',
  });
  TF.writing.push({
    id: 'tf5-ad3', set: 5, task: 'discussion', title: 'Specialize Early or Study Broadly?', minutes: 10,
    professor: { name: 'Dr. Whitfield', text: 'University systems differ in how quickly students specialize. In some, students choose a single subject from their first day. In others, they spend the first one or two years taking courses in many different fields. Which approach do you think prepares students better for their future? Why?' },
    students: [
      { name: 'Jonas', text: 'Specializing early is better. Students who start their major immediately can study it in much more depth, and they graduate with stronger skills in their field.' },
      { name: 'Amara', text: 'I prefer a broad start. Many of today\'s jobs didn\'t exist ten years ago, so it\'s more important to learn how to think in different ways than to know one subject very deeply.' },
    ],
    model: "I find Amara's argument more convincing, although Jonas makes a fair point about depth. It is true that students who specialize early gain detailed knowledge sooner. However, because careers now change so quickly, the ability to connect ideas from different fields has become extremely valuable. In fact, many important problems today, such as climate change, require people who understand science, economics, and policy at the same time. A broad first year also gives students a chance to discover interests they did not know they had. For example, my roommate entered university planning to study law, but an introductory geology course changed her mind, and she is now very happy as an earth science major.",
    mid: "I agree with Amara. Jobs are changing very fast because of technology, so students need to learn many different things. If students only study one subject, they will have problems in the future when their job disappears. Jonas says students can study in depth, but I think depth is not so important now. Studying broadly is also more interesting for students.",
    midNote: 'Bài trung bình (khoảng 65 từ) có lập trường nhưng bác bỏ Jonas quá dễ dãi ("depth is not so important"); lập luận "their job disappears" phóng đại và thiếu ví dụ; câu cuối thêm lý do mới mà không giải thích. Bài mẫu công nhận giá trị chiều sâu, rồi bổ sung hai ý mới (vấn đề liên ngành như biến đổi khí hậu; khám phá sở thích) kèm ví dụ thực tế.',
    outline: ['Câu chủ đề: nghiêng về Amara, ghi nhận Jonas', 'Nhượng bộ: chuyên sâu sớm có lợi gì', 'Lập luận chính: nghề nghiệp thay đổi → cần kết nối liên ngành (ví dụ biến đổi khí hậu)', 'Ý mới thứ hai: năm đầu rộng giúp khám phá sở thích + ví dụ bạn cùng phòng'],
    vocab: ['find… more convincing – thấy… thuyết phục hơn', 'make a fair point about… – có lý ở điểm…', 'connect ideas from different fields – kết nối ý tưởng giữa các lĩnh vực', 'In fact, … – thực tế là, …', 'discover interests they did not know they had – khám phá sở thích chưa từng biết'],
    checklist: ['Nêu lựa chọn rõ ngay câu đầu', 'Phản hồi cả hai bạn, có nhượng bộ công bằng', 'Đóng góp ít nhất một ý MỚI (liên ngành / khám phá sở thích)', 'Ví dụ cụ thể (biến đổi khí hậu, người bạn cùng phòng)', 'Từ nối đa dạng: It is true that, However, In fact, For example', 'Tối thiểu khoảng 100 từ'],
    tips: 'Mẫu câu nhượng bộ "It is true that…, However…" giúp bài cân bằng và tự nhiên – rất được chuộng trong phần thảo luận học thuật.',
  });
  TF.writing.push({
    id: 'tf5-ad4', set: 5, task: 'discussion', title: 'Should Museums Be Free?', minutes: 10,
    professor: { name: 'Dr. Nakamura', text: 'Next week we will look at how cultural institutions are funded. In some cities, national museums are free to enter, while in others visitors pay a ticket price that helps cover the museum\'s costs. Should public museums be free for everyone? Explain your position.' },
    students: [
      { name: 'Sofia', text: 'Yes. Art and history belong to everyone. If museums charge high prices, families with low incomes will never visit, and they miss out on an important part of education.' },
      { name: 'Ben', text: 'I disagree. Museums are expensive to run. If they don\'t sell tickets, they have to rely on government money, and in difficult years their budgets will be cut.' },
    ],
    model: "I support free entry for permanent collections, but I think museums should be allowed to charge for special exhibitions. Sofia makes an excellent point that ticket prices keep many families away, and I would add that free access matters most for children, whose interest in science or art often begins with a single visit. At the same time, Ben is correct that museums need a stable source of income. A mixed model can address both concerns. Special exhibitions, which attract tourists and dedicated visitors, could have ticket prices, while the main galleries remain free. Several museums in London already work this way, and they continue to attract millions of visitors every year.",
    mid: "Museums should be free because everyone should be able to learn about history and art. I agree with Sofia. Some families have little money and they cannot pay for tickets. Ben thinks museums need money, but the government can give them money because culture is important for the country. If museums are free, more people will visit them and learn new things.",
    midNote: 'Bài trung bình (khoảng 65 từ) chọn một phía và lặp lại lập luận của Sofia; trả lời Ben bằng giả định "the government can give them money" – đúng điều Ben đã lo ngại, nên phản biện yếu; không có ví dụ. Bài mẫu đưa ra mô hình kết hợp (miễn phí khu thường trực, thu phí triển lãm đặc biệt) giải quyết được cả hai mối lo, kèm ví dụ thực tế.',
    outline: ['Câu chủ đề: miễn phí khu trưng bày thường trực, thu phí triển lãm đặc biệt', 'Đồng ý Sofia + mở rộng (trẻ em)', 'Ghi nhận Ben: cần nguồn thu ổn định', 'Ý mới: mô hình kết hợp + ví dụ các bảo tàng ở London'],
    vocab: ['free entry / admission – vào cửa miễn phí', 'permanent collections – bộ sưu tập thường trực', 'a stable source of income – nguồn thu ổn định', 'a mixed model can address both concerns – mô hình kết hợp giải quyết được cả hai mối lo', 'attract dedicated visitors – thu hút khách tham quan tâm huyết'],
    checklist: ['Nêu quan điểm rõ và cụ thể ngay câu đầu', 'Phản hồi cả Sofia và Ben, có mở rộng ý', 'Đóng góp ý MỚI: mô hình miễn phí + thu phí kết hợp', 'Có ví dụ thực tế', 'Từ nối: At the same time, while, already', 'Tối thiểu khoảng 100 từ'],
    tips: 'Kiểm tra phản biện của bạn: nếu nó lặp lại đúng điều người kia lo ngại (ví dụ "chính phủ chi tiền"), đó chưa phải phản biện.',
  });
  TF.writing.push({
    id: 'tf5-ad5', set: 5, task: 'discussion', title: 'A Four-Day Workweek?', minutes: 10,
    professor: { name: 'Dr. Adeyemi', text: 'Several companies have tested a four-day workweek, in which employees work fewer hours for the same pay. Supporters say it improves well-being and productivity; critics say it is unrealistic for many businesses. Should more companies adopt a four-day workweek? Why or why not?' },
    students: [
      { name: 'Elena', text: 'Yes. People who have more time to rest make fewer mistakes and are more creative. I have read that some companies in the trials did not lose any productivity at all.' },
      { name: 'Tom', text: 'It works for office jobs, maybe. But hospitals, schools, and shops need staff every day. You can\'t simply close a hospital on Fridays.' },
    ],
    model: "I think more companies should try a four-day week, but the way it is organized has to depend on the industry. Elena is right that well-rested employees often work more efficiently, and the results of recent trials suggest that the change does not have to reduce output. Tom, however, is correct that many services must stay open every day. The solution is not for everyone to take Friday off. Instead, staff could work in rotating teams, so that each person has a three-day weekend while the business stays open. For example, a hospital department could divide nurses into two groups with different days off. This approach would bring the benefits Elena describes without the problem Tom identifies.",
    mid: "I agree with Elena. A four-day week is better for workers because they can rest more and spend time with their family. When people are happy, they work harder. Tom talks about hospitals, but hospitals are only a small part of all jobs, so most companies can still do it. I think in the future every company will have a four-day week.",
    midNote: 'Bài trung bình (khoảng 65 từ) gạt bỏ ý Tom ("only a small part") thay vì giải quyết; câu kết dự đoán "every company" thiếu căn cứ; không có ví dụ cụ thể. Bài mẫu thừa nhận cả hai phía và đưa ý mới (luân phiên nhóm trực để vẫn mở cửa hằng ngày) kèm ví dụ khoa trong bệnh viện.',
    outline: ['Câu chủ đề: nên thử, nhưng cách tổ chức tùy ngành', 'Ghi nhận Elena (nghỉ ngơi → hiệu quả; thử nghiệm không giảm năng suất)', 'Thừa nhận Tom (dịch vụ phải mở mỗi ngày)', 'Ý mới: nhóm luân phiên ngày nghỉ + ví dụ khoa bệnh viện', 'Kết: giữ lợi ích, tránh vấn đề'],
    vocab: ['well-rested employees – nhân viên được nghỉ ngơi đầy đủ', 'reduce output – làm giảm sản lượng', 'work in rotating teams – làm theo nhóm luân phiên', 'a three-day weekend – kỳ nghỉ cuối tuần ba ngày', 'without the problem … identifies – mà không gặp vấn đề … nêu ra'],
    checklist: ['Nêu quan điểm có điều kiện ngay câu đầu', 'Phản hồi Elena và Tom một cách công bằng', 'Đóng góp ý MỚI: lịch luân phiên', 'Ví dụ cụ thể (khoa bệnh viện)', 'Từ nối: however, Instead, For example', 'Tối thiểu khoảng 100 từ'],
    tips: 'Biến phản đối của một bạn thành "thiết kế" cho giải pháp: "The solution is not…, Instead…" là khung câu rất hiệu quả.',
  });
  TF.writing.push({
    id: 'tf5-ad6', set: 5, task: 'discussion', title: 'Should Young Children Learn to Code?', minutes: 10,
    professor: { name: 'Dr. Sato', text: 'Some countries have made computer programming a required subject in primary school, starting at around age seven. Others believe young children should focus on reading, writing, and mathematics first. Should coding be taught in primary school? Explain why or why not.' },
    students: [
      { name: 'Lucas', text: 'Yes. Computers are part of almost every job now. If children start early, coding will feel natural to them, just like learning a second language at a young age.' },
      { name: 'Mei', text: 'I\'m worried it will take time away from basic skills. Programming languages change all the time, but reading and maths will always be essential.' },
    ],
    model: "I believe primary schools should teach the basic ideas behind coding, but not specific programming languages. Mei is right that the languages professionals use today may be outdated by the time young children grow up. However, the logical thinking behind coding, such as breaking a big problem into small steps, will stay useful for life. Lucas also has a point that early exposure makes technology less intimidating. Importantly, these skills do not have to replace maths or reading. For example, children can practise giving step-by-step instructions to a small robot during a maths lesson, which builds both number skills and logical thinking. In this way, schools can prepare children for the future without neglecting the basics.",
    mid: "I agree with Mei. Children in primary school are very young, and the most important thing for them is reading and maths. If they learn coding, they will have less time for these subjects. Also, coding is difficult and some children will not like it. Lucas says coding is important for jobs, but children can learn it later in high school.",
    midNote: 'Bài trung bình (khoảng 60 từ) chỉ đứng về phía Mei và thêm lý do "coding is difficult" không có giải thích; trả lời Lucas bằng một câu ngắn; thiếu ví dụ và không có ý mới thật sự. Bài mẫu phân biệt "tư duy lập trình" với "ngôn ngữ lập trình", cho thấy hai bên không mâu thuẫn và minh họa bằng hoạt động robot trong giờ toán.',
    outline: ['Câu chủ đề: dạy tư duy lập trình, không dạy ngôn ngữ cụ thể', 'Đồng ý Mei: ngôn ngữ lập trình sẽ lỗi thời', 'Ý mới: tư duy chia nhỏ vấn đề dùng suốt đời', 'Ghi nhận Lucas + cho thấy không cần thay thế môn cơ bản', 'Ví dụ: robot trong giờ toán; câu kết'],
    vocab: ['the basic ideas behind… – ý tưởng nền tảng của…', 'be outdated – lỗi thời', 'break a big problem into small steps – chia vấn đề lớn thành các bước nhỏ', 'early exposure – được tiếp xúc sớm', 'without neglecting the basics – mà không bỏ bê kiến thức nền'],
    checklist: ['Nêu quan điểm rõ và tinh tế ngay câu đầu', 'Phản hồi cả Lucas và Mei', 'Đóng góp ý MỚI: phân biệt tư duy và ngôn ngữ lập trình', 'Ví dụ cụ thể (robot trong giờ toán)', 'Từ nối: However, Importantly, For example, In this way', 'Tối thiểu khoảng 100 từ'],
    tips: 'Một ý mới mạnh thường đến từ việc tách khái niệm ("coding" = tư duy hay ngôn ngữ?) để hòa giải hai quan điểm tưởng như đối lập.',
  });

  /* BỘ 5 · SPEAKING (tự biên soạn): 3 Listen and Repeat × 6 câu, 3 Interview × 4 câu (mẫu ~45 giây + tiêu chí chấm trong tip). */
  TF.speaking.push({
    id: 'tf5-rp1', set: 5, task: 'repeat', title: 'Fitness Center Orientation', accent: 'en-US',
    context: 'You are starting a part-time job at the campus fitness center. Listen to the manager and repeat exactly what you hear.',
    sentences: [
      { t: 'Please wipe down each machine after use.', tip: '"wipe down" nối âm /waɪpdaʊn/; nhấn "EACH MACHINE".' },
      { t: 'Towels are available at the front desk.', tip: '"available" /əˈveɪləbəl/ nhấn âm tiết thứ hai; "front desk" giữ rõ /nt/ và /sk/.' },
      { t: 'The swimming pool closes at nine on weekdays.', tip: 'Nhấn "NINE" và "WEEKDAYS"; "closes" /ˈkloʊzɪz/ có hai âm tiết.' },
      { t: 'New members must complete a short safety course.', tip: '"complete a" nối âm /kəmˈpliːtə/; nhấn "SAFETY COURSE".' },
      { t: 'If a machine is broken, put a sign on it and tell a staff member.', tip: 'Ngắt nhịp sau "broken,"; "put a sign on it" đọc liền; giọng Mỹ biến /t/ thành âm bật nhẹ: /pʊɾə saɪn ɑnɪt/.' },
      { t: 'During exam week, the center stays open until midnight so that students can take a break from studying.', tip: 'Câu dài – chia nhịp: "During exam week / the center stays open until midnight / so that students can take a break from studying".' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-rp2', set: 5, task: 'repeat', title: 'Admissions Office Assistant', accent: 'en-GB',
    context: 'You are helping at the university admissions office during an open day. Listen to the coordinator and repeat exactly what you hear.',
    sentences: [
      { t: 'Welcome to our open day.', tip: 'Nhấn "OPEN DAY"; "to our" đọc lướt /tʊˈaʊə/.' },
      { t: 'Campus tours leave every half hour.', tip: '"half" giọng Anh /hɑːf/ không có /l/; nhấn "HALF HOUR".' },
      { t: 'Applications for next year close in January.', tip: '"Applications" /ˌæplɪˈkeɪʃənz/ nhấn âm tiết thứ ba; "January" /ˈdʒænjuəri/.' },
      { t: 'You can speak to current students in the main hall.', tip: '"current" /ˈkʌrənt/; "main hall" – giữ âm cuối /n/ trước /h/.' },
      { t: 'Information about scholarships is available on our website.', tip: '"scholarships" /ˈskɒləʃɪps/ giọng Anh; nhấn "SCHOLARSHIPS" và "WEBSITE".' },
      { t: 'Visitors who would like to attend a sample lecture should collect a ticket from this desk before eleven o\'clock.', tip: 'Câu dài – chia nhịp: "Visitors who would like to attend a sample lecture / should collect a ticket from this desk / before eleven o\'clock".' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-rp3', set: 5, task: 'repeat', title: 'Nature Reserve Field Trip', accent: 'en-US',
    context: 'You are assisting on a biology field trip to a nature reserve. Listen to the guide and repeat exactly what you hear.',
    sentences: [
      { t: 'Stay on the marked trails.', tip: '"marked" /mɑrkt/ – đuôi -ed đọc /t/; nhấn "MARKED TRAILS".' },
      { t: 'The bus will leave at four sharp.', tip: '"four sharp" = đúng 4 giờ; nhấn "FOUR SHARP", giữ rõ /ʃ/.' },
      { t: 'Do not feed the birds or other animals.', tip: 'Nhấn "NOT" để rõ ý cấm; "birds" /bɜrdz/ giữ âm cuối /dz/.' },
      { t: 'Record the time and location of each sighting.', tip: '"Record" là động từ nên nhấn âm tiết sau /rɪˈkɔrd/; "sighting" /ˈsaɪtɪŋ/, Mỹ đọc /ˈsaɪɾɪŋ/.' },
      { t: 'If you see a nest, observe it quietly from a distance.', tip: 'Ngắt nhịp sau "nest,"; "observe it" nối âm /əbˈzɜrvɪt/.' },
      { t: 'Before we leave the reserve, please check that you have collected all of your equipment and trash.', tip: 'Câu dài – chia nhịp: "Before we leave the reserve / please check that you have collected / all of your equipment and trash".' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-iv1', set: 5, task: 'interview', title: 'Music and the Arts', seconds: 45, accent: 'en-US',
    context: 'A researcher from the arts department is interviewing students about the role of music and the arts in their lives. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'What kind of music do you usually listen to, and when?',
        model: "I mostly listen to jazz and some pop music. I usually put on music when I'm walking to campus or cooking dinner, because it makes those routine tasks more enjoyable. When I'm studying, though, I switch to instrumental music without lyrics, since words distract me. On weekends I sometimes go to small concerts at a café near my apartment, which is a nice way to discover new local musicians.",
        tip: 'Tiêu chí: trả lời thẳng (thể loại + thời điểm) · 2–3 tình huống cụ thể · có "though" để đối lập · khoảng 70–100 từ, nói trôi chảy.' },
      { q: 'Do you think art classes are as important as science classes in schools?',
        model: "I think they're important, but in a different way. Science classes teach students how the world works, while art classes help them express ideas and think creatively. For example, in my high school art class, we designed posters for a local festival, and I learned how to plan a project and accept criticism. Those skills are useful in any job, so I believe schools should keep a balance between the two.",
        tip: 'Tiêu chí: nêu quan điểm rõ ngay câu đầu · so sánh hai môn bằng "while" · 1 ví dụ cá nhân · câu kết quay lại quan điểm.' },
      { q: 'How has technology changed the way people enjoy music or art?',
        model: "Technology has made music and art much easier to access. Today, anyone with a phone can stream millions of songs or visit a museum's online collection for free. It has also changed how art is created, because young artists can share their work on social media without needing a gallery or a record company. However, I think something is lost when everything is on a screen, so I still try to see live performances when I can.",
        tip: 'Tiêu chí: 2 thay đổi rõ ràng (tiếp cận + sáng tác) · có ví dụ cụ thể · thêm ý cân bằng bằng "However" · khoảng 80–110 từ.' },
      { q: 'Should governments spend public money to support artists? Why or why not?',
        model: "Yes, I think governments should provide some support. Many artists earn very little, especially at the beginning of their careers, and without help, only people from wealthy families could afford to become artists. Public funding also benefits society, because it pays for free concerts, public sculptures, and community workshops that everyone can enjoy. Of course, the money should be distributed fairly, perhaps through grants that are decided by independent experts.",
        tip: 'Tiêu chí: lập trường rõ · 2 lý do (công bằng cho nghệ sĩ + lợi ích xã hội) · đề xuất điều kiện ("Of course…") · từ vựng chủ đề: funding, grants, afford.' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-iv2', set: 5, task: 'interview', title: 'Volunteering and Helping Others', seconds: 45, accent: 'en-GB',
    context: 'A staff member from the student volunteering office is interviewing students about community service. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'Have you ever done any volunteer work? Tell me about it.',
        model: "Yes, last summer I volunteered at a food bank in my hometown for about two months. I worked there twice a week, sorting donations and packing boxes for families who needed support. At first it was just physical work, but over time I started talking to the people who came in, and I realised how many of them had jobs but still struggled to pay for food. That experience changed how I think about poverty.",
        tip: 'Tiêu chí: thời gian, nơi chốn, việc làm cụ thể · kể theo diễn biến (At first… over time…) · kết bằng điều bạn học được.' },
      { q: 'Why do you think some students choose not to volunteer?',
        model: "I think the main reason is time. Many students have part-time jobs as well as their studies, so it's hard to find a free afternoon every week. Another reason is that some people simply don't know where to start, because volunteering opportunities aren't always advertised clearly. If universities shared a simple list of short, flexible projects, I believe more students would get involved.",
        tip: 'Tiêu chí: 2 lý do rõ ràng (The main reason… Another reason…) · giải thích mỗi lý do · thêm một đề xuất giải pháp ngắn.' },
      { q: 'Should volunteering be a requirement for graduating from university?',
        model: "I don't think it should be compulsory. Volunteering works best when people choose to do it, because they're more motivated and more helpful to the organisation. If it became a requirement, some students might just do the minimum hours to get a certificate. Instead, universities could encourage it by giving academic credit or recognising volunteer work on students' records.",
        tip: 'Tiêu chí: lập trường rõ ngay câu đầu · lý do + hệ quả nếu bắt buộc · phương án thay thế bằng "Instead" · khoảng 70–100 từ.' },
      { q: 'In your opinion, what is the best way for young people to help their local community?',
        model: "I think the best way is to use the skills they already have. For example, students who are good with technology could teach older people how to use video calls or online banking, which can make a big difference to someone who lives alone. Young people could also tutor children from families who can't afford private lessons. Help like this is practical and builds connections between generations.",
        tip: 'Tiêu chí: một ý chính rõ ràng · 2 ví dụ cụ thể · giải thích tác động ("which can make a big difference") · câu kết tổng quát.' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-iv3', set: 5, task: 'interview', title: 'Money and Spending Habits', seconds: 45, accent: 'en-US',
    context: 'An economics researcher is interviewing university students about how they manage money. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'How do you usually keep track of your spending?',
        model: "I use a free budgeting app on my phone. At the start of each month, I set limits for categories like food, transport, and entertainment, and the app shows me how much I have left. I also check my bank account every Sunday evening. It only takes five minutes, but it helps me notice if I've been spending too much on things like coffee or takeaway food.",
        tip: 'Tiêu chí: nêu công cụ/cách làm cụ thể · mô tả các bước · nêu lợi ích bằng ví dụ · khoảng 70–100 từ, dùng thì hiện tại đơn cho thói quen.' },
      { q: 'What is something you spent money on recently that you think was worth it?',
        model: "Recently I bought a good pair of noise-cancelling headphones. They were quite expensive, but I share an apartment with three people, and it's often noisy in the evenings. Now I can concentrate on my assignments at home instead of going to the library every night, which saves me time. So even though the price was high, I think it was a very good investment.",
        tip: 'Tiêu chí: món đồ cụ thể · lý do mua (hoàn cảnh) · lợi ích đo được · kết luận bằng "even though…" thể hiện cân nhắc.' },
      { q: 'Do you think schools should teach students how to manage money?',
        model: "Yes, definitely. Many young people leave school without knowing how to make a budget, how interest on a loan works, or how to avoid debt from credit cards. These are skills everyone needs, but not every family talks about money at home. A short course in the last year of high school, with practical exercises like planning a monthly budget, could prevent a lot of problems later in life.",
        tip: 'Tiêu chí: lập trường rõ · liệt kê 2–3 kỹ năng cụ thể · lý do vì sao trường học cần dạy · đề xuất hình thức cụ thể.' },
      { q: 'Some people say that young people today spend too much money on things they don\'t need. Do you agree?',
        model: "I partly agree. Online shopping and social media advertising make it very easy to buy things on impulse, and I've definitely done that myself. However, I don't think it's only a problem for young people, and many students actually spend very carefully because they have limited income. A simple habit that helps is waiting twenty-four hours before buying anything that isn't essential.",
        tip: 'Tiêu chí: quan điểm có mức độ ("I partly agree") · nguyên nhân + ví dụ bản thân · phản biện bằng "However" · kết bằng lời khuyên thực tế.' },
    ],
  });

  /* BỘ 5 · SPEAKING lô 5 (tự biên soạn): 4 Listen and Repeat × 5 câu (8 → 20 từ), 3 Interview × 4 câu (mẫu ~45 giây + tiêu chí chấm trong tip). */
  TF.speaking.push({
    id: 'tf5-rp4', set: 5, task: 'repeat', title: 'Campus IT Help Desk', accent: 'en-US',
    context: 'You are training to work at the campus IT help desk. Listen to your supervisor and repeat exactly what you hear.',
    sentences: [
      { t: 'Please restart your laptop before you call us.', tip: 'Nhấn "RESTART" và "CALL"; "before you" đọc lướt /bɪˈfɔr jə/.' },
      { t: 'You can reset your password on the student portal.', tip: '"password" /ˈpæswɜrd/ – không đọc âm /w/ rõ; "portal" Mỹ đọc /ˈpɔrɾəl/.' },
      { t: 'The campus Wi-Fi is usually slower in the library during exam week.', tip: 'Nhấn "SLOWER" và "EXAM WEEK"; "usually" /ˈjuːʒuəli/.' },
      { t: 'If your screen is cracked, we can send the laptop to the manufacturer for repair.', tip: 'Ngắt nhịp sau "cracked,"; "manufacturer" /ˌmænjəˈfæktʃərər/ nhấn âm tiết thứ ba.' },
      { t: 'Students who forget to back up their files should save their work to the university cloud storage every evening.', tip: 'Câu dài – chia nhịp: "Students who forget to back up their files / should save their work / to the university cloud storage / every evening".' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-rp5', set: 5, task: 'repeat', title: 'Student Health Centre Reception', accent: 'en-GB',
    context: 'You are starting a part-time job at the reception desk of the student health centre. Listen to the practice manager and repeat exactly what you hear.',
    sentences: [
      { t: 'Please take a seat and wait to be called.', tip: '"take a seat" nối âm /teɪkəsiːt/; nhấn "SEAT" và "CALLED".' },
      { t: 'Appointments can be booked online or by telephone from eight.', tip: '"Appointments" /əˈpɔɪntmənts/ nhấn âm tiết thứ hai; giọng Anh "telephone" /ˈtelɪfəʊn/.' },
      { t: 'If you need to cancel, let us know at least a day in advance.', tip: 'Ngắt nhịp sau "cancel,"; "let us know" đọc liền; nhấn "a DAY in ADVANCE".' },
      { t: 'New students should register with the centre as soon as possible after they arrive on campus.', tip: '"register" /ˈredʒɪstə/ (giọng Anh không phát âm r cuối); "as soon as possible" đọc liền /əzˈsuːnəzˈpɒsəbl/.' },
      { t: 'For urgent problems outside opening hours, students should phone the national helpline, which is available twenty-four hours a day.', tip: 'Câu dài – chia nhịp: "For urgent problems outside opening hours / students should phone the national helpline / which is available twenty-four hours a day".' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-rp6', set: 5, task: 'repeat', title: 'Art Gallery Volunteer', accent: 'en-US',
    context: 'You are volunteering at the university art gallery. Listen to the gallery coordinator and repeat exactly what you hear.',
    sentences: [
      { t: 'Photographs are allowed, but please turn off the flash.', tip: 'Ngắt nhịp sau "allowed,"; "turn off the" nối âm /tɜrnɔfðə/.' },
      { t: 'Large bags must be left in the lockers near the entrance.', tip: '"lockers" /ˈlɑkərz/ giọng Mỹ; nhấn "LARGE BAGS" và "LOCKERS".' },
      { t: 'The new exhibition features paintings by students from the Department of Fine Arts.', tip: '"exhibition" /ˌeksɪˈbɪʃən/ – không đọc /h/; "features" /ˈfiːtʃərz/.' },
      { t: 'Free guided tours start at the information desk every Saturday at eleven and last about forty minutes.', tip: 'Nhấn "FREE GUIDED TOURS"; "every Saturday at eleven" giữ nhịp đều, "about forty minutes" Mỹ đọc /ˈfɔrɾi/.' },
      { t: 'Visitors are asked not to touch the sculptures, because oils from their hands can damage the surface over time.', tip: 'Câu dài – chia nhịp: "Visitors are asked not to touch the sculptures / because oils from their hands / can damage the surface over time".' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-rp7', set: 5, task: 'repeat', title: 'Campus Bike Repair Workshop', accent: 'en-GB',
    context: 'You are helping at a free bike repair workshop on campus. Listen to the mechanic and repeat exactly what you hear.',
    sentences: [
      { t: 'Check your tyre pressure at least once a week.', tip: '"tyre" giọng Anh /taɪə/; "pressure" /ˈpreʃə/; nhấn "ONCE a WEEK".' },
      { t: 'Our workshop is open every Wednesday afternoon in the sports hall car park.', tip: 'Nhấn "WEDNESDAY" /ˈwenzdeɪ/ (chữ d đầu câm); "car park" giọng Anh /ˈkɑː pɑːk/.' },
      { t: 'We provide the tools for free, but you will need to buy any new parts.', tip: 'Ngắt nhịp sau "free,"; nhấn "TOOLS", "FREE" và "NEW PARTS".' },
      { t: 'Before you ride at night, make sure your front and rear lights are working properly.', tip: '"rear" /rɪə/; "properly" /ˈprɒpəli/ giọng Anh; nhấn "FRONT" và "REAR".' },
      { t: 'If your brakes squeal when you stop, bring the bike in so that we can replace the pads.', tip: 'Câu dài – chia nhịp: "If your brakes squeal when you stop / bring the bike in / so that we can replace the pads".' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-iv4', set: 5, task: 'interview', title: 'Sports and Exercise', seconds: 45, accent: 'en-US',
    context: 'A researcher from the sports science department is interviewing students about exercise and physical activity. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'How do you usually stay active during the semester?',
        model: "My main form of exercise is cycling, because I ride my bike to campus every day, which is about twenty minutes each way. On top of that, I go to the university pool twice a week, usually early in the morning before my classes. I find that swimming helps me clear my head, so I tend to concentrate better for the rest of the day.",
        tip: 'Tiêu chí: hoạt động cụ thể + tần suất · thêm lợi ích cá nhân · dùng hiện tại đơn cho thói quen · khoảng 70–100 từ.' },
      { q: 'Do you prefer exercising alone or with other people? Why?',
        model: "I generally prefer exercising with other people. When I go running with a friend, we push each other to go a little further, and it's harder to skip a session when someone is waiting for you. That said, I sometimes enjoy running alone with music, especially when I've had a stressful day and just need some quiet time to think.",
        tip: 'Tiêu chí: lựa chọn rõ · 2 lý do có ví dụ · nhượng bộ bằng "That said" · kết thúc tự nhiên, không lặp lại câu hỏi.' },
      { q: 'Why do you think many young adults do not get enough exercise?',
        model: "I think the biggest reason is that daily life has become very sedentary. Students sit in lectures, then sit at a desk to study, and often relax by watching videos on their phones. Another factor is cost, since gym memberships can be expensive. If universities offered more free, short activities between classes, I believe more students would take part.",
        tip: 'Tiêu chí: 2 nguyên nhân rõ ràng (The biggest reason… Another factor…) · ví dụ cụ thể · đề xuất giải pháp ngắn · từ vựng: sedentary, membership.' },
      { q: 'Should schools spend more time on physical education? Explain your view.',
        model: "Yes, I think they should. Regular exercise improves both physical health and concentration, so more PE could actually help students perform better in other subjects. It also teaches teamwork and how to deal with losing. However, PE lessons should offer a wider range of activities, like dance or climbing, so that students who don't enjoy competitive sports can still find something they like.",
        tip: 'Tiêu chí: lập trường rõ · 2 lợi ích có giải thích · điều kiện/góp ý bằng "However" · khoảng 80–110 từ, phát âm rõ từ khóa.' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-iv5', set: 5, task: 'interview', title: 'Reading and Books', seconds: 45, accent: 'en-GB',
    context: 'A librarian is interviewing students about their reading habits for a report on campus library services. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'What kinds of things do you enjoy reading in your free time?',
        model: "In my free time I mostly read novels, especially detective stories, because I enjoy trying to solve the mystery before the end. I also read a lot of articles online about science and technology, usually on my phone while I'm on the bus. I'd like to read more non-fiction books, but during term I rarely have the energy for anything too serious.",
        tip: 'Tiêu chí: thể loại cụ thể + lý do thích · bối cảnh đọc (khi nào, ở đâu) · thêm một mong muốn hoặc hạn chế cá nhân.' },
      { q: 'Do you prefer printed books or e-books? Why?',
        model: "I prefer printed books for reading at home. I find it easier to concentrate on paper, and I like being able to see how far I've got and to make notes in the margins. However, e-books are much more practical when I'm travelling, because I can carry dozens of them on one small device. So I'd say each format has its place.",
        tip: 'Tiêu chí: lựa chọn rõ kèm 2 lý do · ghi nhận ưu điểm của lựa chọn còn lại bằng "However" · câu kết cân bằng.' },
      { q: 'How could the university library encourage students to read more for pleasure?',
        model: "One idea would be to create a relaxed reading area with comfortable chairs and a shelf of popular novels near the entrance, so that students notice them. The library could also run a book club once a month, perhaps with free coffee, because people are more likely to read a book if they can discuss it with others afterwards.",
        tip: 'Tiêu chí: 2 đề xuất cụ thể · giải thích vì sao mỗi đề xuất hiệu quả · dùng "could/would" để đưa ý kiến lịch sự.' },
      { q: 'Some people say that reading books is less important now that we have the internet. Do you agree?',
        model: "I don't really agree. The internet is excellent for finding quick facts, but most online content is short and designed to be read quickly. Books, on the other hand, train us to follow a long argument or story and to think about it deeply. In my opinion, that ability to concentrate for a long time is more valuable than ever.",
        tip: 'Tiêu chí: nêu rõ đồng ý/không · thừa nhận mặt mạnh của internet · so sánh bằng "on the other hand" · kết bằng nhận định riêng.' },
    ],
  });
  TF.speaking.push({
    id: 'tf5-iv6', set: 5, task: 'interview', title: 'The Environment in Daily Life', seconds: 45, accent: 'en-US',
    context: 'A researcher from the campus sustainability office is interviewing students about environmental habits. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'What do you do in your daily life to protect the environment?',
        model: "I try to make a few small changes that add up over time. For example, I always carry a reusable water bottle and coffee cup, so I hardly ever buy drinks in plastic. I also walk or take the bus instead of driving, and I've started buying second-hand clothes online. None of these things are difficult, but they reduce the amount of waste I produce.",
        tip: 'Tiêu chí: 2–3 hành động cụ thể · có ví dụ cho mỗi hành động · câu kết nêu tác động chung · khoảng 70–100 từ.' },
      { q: 'Is it difficult for students to live in an environmentally friendly way? Why?',
        model: "In some ways, yes. Environmentally friendly products are often more expensive, and students usually have limited budgets. Also, people who live in shared housing can't always control things like heating or recycling. On the other hand, many green habits actually save money, such as cooking at home or repairing things instead of replacing them, so it isn't impossible.",
        tip: 'Tiêu chí: trả lời có mức độ ("In some ways") · 2 khó khăn cụ thể · mặt ngược lại bằng "On the other hand" · kết luận rõ.' },
      { q: 'What could your university do to become more sustainable?',
        model: "I think the university could start with food. The dining halls could offer more plant-based meals and give a discount to students who bring their own containers. Another idea would be to install solar panels on the large flat roofs of the sports buildings. These changes would reduce emissions and also show students that sustainability is taken seriously.",
        tip: 'Tiêu chí: 2 đề xuất cụ thể, khả thi · ví dụ rõ (bữa ăn, pin mặt trời) · nêu lợi ích kép trong câu kết · từ vựng: plant-based, emissions.' },
      { q: 'Who should be most responsible for protecting the environment: individuals, companies, or governments?',
        model: "I believe governments should take the most responsibility, because they can set rules that apply to everyone, such as limits on pollution or taxes on plastic packaging. Companies will usually change their practices only when the law or their customers require it. Individuals still have a role to play, but personal choices alone can't solve problems on the scale of climate change.",
        tip: 'Tiêu chí: chọn một bên rõ ràng · lý do + ví dụ chính sách · nhắc vai trò của hai bên còn lại · câu kết khái quát.' },
    ],
  });

  /* BỘ 6 · WRITING (tự biên soạn): Build a Sentence câu 49–56; 6 email + 6 academic discussion có outline/vocab/mid/midNote. */
  TF.writing.push({
    id: 'tf6-bs', set: 6, task: 'sentence', title: 'Build a Sentence · Set 6',
    instr: 'Put the words in the correct order to make a grammatical response.',
    items: [
      { n: 49, prompt: 'Have you finished the reading for tomorrow?', chunks: ['I', 'still', 'have', 'two chapters', 'left', 'to read'], end: '.',
        explain: "Trạng từ \"still\" đứng trước động từ thường \"have\"; cấu trúc \"have + danh từ + left + to V\" = còn lại … phải làm: \"two chapters left to read\"." },
      { n: 50, prompt: 'Why is the library so crowded today?', chunks: ['most students', 'are', 'preparing', 'for', 'the final exams', 'next week'], end: '.',
        explain: "Hiện tại tiếp diễn \"are preparing\" cho việc đang diễn ra; \"prepare for + kỳ thi\"; mốc thời gian \"next week\" bổ nghĩa cho \"the final exams\" nên đứng cuối." },
      { n: 51, prompt: 'Did you hear back about the scholarship?', chunks: ['they', 'told me', 'that', 'I would', 'hear from them', 'within two weeks'], end: '.',
        explain: "Câu tường thuật lùi thì: \"will\" → \"would\" sau \"told me that\"; \"hear from sb\" = nhận tin từ ai; \"within two weeks\" (trong vòng hai tuần) đứng cuối." },
      { n: 52, prompt: 'What should I bring to the lab tomorrow?', chunks: ['make sure', 'you', 'bring', 'your safety goggles', 'with you'], end: '.',
        explain: "Mệnh lệnh \"make sure (that) + S + V\": \"make sure you bring\" (không dùng \"to bring\"); \"bring sth with you\" = mang theo bên mình, \"with you\" đứng cuối." },
      { n: 53, prompt: 'Is the bookstore still open?', chunks: ['it', 'closed', 'about', 'ten minutes', 'ago'], end: '.', starter: 'No,',
        explain: "Quá khứ đơn \"closed\" đi với \"ago\"; \"about ten minutes ago\" = khoảng mười phút trước – \"about\" đứng trước con số." },
      { n: 54, prompt: 'Could you explain why the experiment failed?', chunks: ['we', 'think', 'the samples', 'were', 'not stored', 'at the right temperature'], end: '.',
        explain: "Mệnh đề sau \"we think\" giữ trật tự câu khẳng định; bị động quá khứ phủ định \"were not stored\" (mẫu không được bảo quản); \"at the right temperature\" đứng cuối." },
      { n: 55, prompt: 'How was your trip to the conference?', chunks: ['I', 'met', 'several researchers', 'whose work', 'I had', 'cited in my thesis'], end: '.', starter: 'Great!',
        explain: "Mệnh đề quan hệ sở hữu \"whose work\" bổ nghĩa cho \"researchers\"; quá khứ hoàn thành \"I had cited\" – việc trích dẫn xảy ra TRƯỚC lần gặp." },
      { n: 56, prompt: 'Which room is the seminar in?', chunks: ['do you know', 'if', 'it', 'has been', 'moved', 'to the main hall'], end: '?', starter: 'I\'m not sure.',
        explain: "Câu hỏi gián tiếp \"Do you know if + S + V\" – sau \"if\" giữ trật tự khẳng định \"it has been moved\" (bị động hiện tại hoàn thành), không đảo thành \"has it been\"." },
    ],
  });
  TF.writing.push({
    id: 'tf6-em1', set: 6, task: 'email', title: 'Asking for Feedback on an Exam', minutes: 7,
    scenario: 'You received a much lower grade than you expected on your midterm exam in economics. You studied hard and want to understand what went wrong before the final exam.',
    to: 'Professor Haddad, your economics professor',
    points: ['Explain why you are writing.', 'Describe how you prepared for the exam.', 'Ask for a meeting or specific feedback.'],
    model: "Dear Professor Haddad,\n\nI am a student in your Introduction to Macroeconomics class, and I am writing about my midterm exam. I received a C, which was much lower than I expected, and I would like to understand where I went wrong so that I can improve before the final.\n\nTo prepare, I reviewed all of the lecture slides and completed the practice questions at the end of each chapter. I felt confident about the multiple-choice section, so I suspect that I lost most of my marks on the two essay questions, possibly because my answers were not detailed enough.\n\nWould it be possible to meet during your office hours next week to go through my paper? If that is not convenient, I would also be grateful for a few written comments on what a stronger answer would have included.\n\nThank you for your time.\n\nBest regards,\nAna Lopes",
    mid: "Dear Professor Haddad,\n\nI got a C on the midterm exam and I am very disappointed because I studied a lot. I think the grade is not fair because I read all the slides and did the exercises.\n\nCan you check my exam again? I want to know my mistakes.\n\nThank you,\nAna",
    midNote: 'Bài trung bình ngắn (khoảng 50 từ) và có câu "the grade is not fair" mang tính khiếu nại, dễ gây phản cảm khi mục đích là xin góp ý; không giới thiệu lớp học; yêu cầu "check my exam again" mơ hồ. Bài mẫu thừa nhận có thể mình sai ở phần tự luận, đưa hai lựa chọn cụ thể (gặp trong giờ tiếp sinh viên hoặc nhận xét viết).',
    outline: ['Giới thiệu (lớp nào) + mục đích: hiểu vì sao điểm thấp để cải thiện', 'Cách đã ôn tập + tự đánh giá phần có thể bị mất điểm', 'Đề nghị gặp trong giờ tiếp sinh viên hoặc xin nhận xét viết', 'Cảm ơn, ký tên đầy đủ'],
    vocab: ['I would like to understand where I went wrong – em muốn hiểu mình sai ở đâu', 'I suspect that… – em đoán rằng…', 'go through my paper – xem lại bài thi của em', 'If that is not convenient… – nếu không tiện…', 'I would be grateful for… – em sẽ rất biết ơn nếu…'],
    checklist: ['Nêu lớp học và mục đích ngay đoạn đầu', 'Mô tả cách ôn tập cụ thể', 'Tự nhận định phần có thể yếu – thể hiện thái độ cầu tiến', 'Đề nghị cụ thể, có phương án thay thế', 'Giọng lịch sự, không khiếu nại hay đổ lỗi', 'Khoảng 120–180 từ'],
    tips: 'Khi xin góp ý về điểm, tập trung vào "làm sao để tiến bộ" thay vì "điểm này không công bằng" – giọng văn quyết định thiện cảm của người nhận.',
  });
  TF.writing.push({
    id: 'tf6-em2', set: 6, task: 'email', title: 'A Damaged Textbook Delivery', minutes: 7,
    scenario: 'You ordered a new textbook from an online bookstore. When it arrived, the cover was torn and about twenty pages were badly creased. Your course starts in five days.',
    to: 'The customer service team at the online bookstore',
    points: ['Give details of your order and the problem.', 'Explain why the timing is important.', 'Say what you would like the store to do.'],
    model: "Dear Customer Service Team,\n\nI am writing about order number 48213, which I received yesterday. The order was for a new copy of Principles of Organic Chemistry (fifth edition), but unfortunately the book arrived in poor condition. The front cover is torn, and around twenty pages in the middle are badly creased, which makes some of the diagrams difficult to read.\n\nThe timing is important because my chemistry course begins next Monday, and I will need the textbook from the first class. I paid the full price for a new book, so I would like a replacement rather than a partial refund.\n\nCould you please send a replacement copy by express delivery so that it arrives before Monday? I am happy to return the damaged book, but I would be grateful if you could provide a prepaid return label. I have attached two photos of the damage.\n\nThank you for your help.\n\nKind regards,\nJonas Weber",
    mid: "Hello,\n\nI bought a chemistry book from your website and it came yesterday. The book is damaged. The cover is broken and many pages are bad. I am not happy because I paid a lot of money.\n\nMy class starts soon so I need the book quickly. Please send me a new book.\n\nThanks,\nJonas",
    midNote: 'Bài trung bình thiếu thông tin để cửa hàng xử lý: không có mã đơn, tên sách, mức độ hư hỏng cụ thể; "cover is broken", "pages are bad" dùng từ thiếu chính xác; "soon" không cho biết thời hạn. Bài mẫu nêu mã đơn, mô tả hư hỏng, mốc thứ Hai, đề nghị gửi nhanh và nhãn trả hàng trả trước, có ảnh đính kèm.',
    outline: ['Mã đơn + tên sách + mô tả hư hỏng cụ thể', 'Vì sao gấp: khóa học bắt đầu thứ Hai', 'Yêu cầu: gửi bản thay thế bằng chuyển phát nhanh', 'Đề nghị trả lại sách hỏng với nhãn trả trước; ảnh đính kèm; cảm ơn'],
    vocab: ['arrived in poor condition – đến nơi trong tình trạng hư hỏng', 'badly creased – bị nhàu nặng', 'a replacement rather than a refund – đổi sách mới thay vì hoàn tiền', 'by express delivery – bằng chuyển phát nhanh', 'a prepaid return label – nhãn gửi trả đã trả phí'],
    checklist: ['Có mã đơn hàng và tên sản phẩm', 'Mô tả hư hỏng chính xác', 'Giải thích mốc thời gian cấp bách', 'Đề xuất giải pháp cụ thể (đổi mới, gửi nhanh)', 'Giọng phàn nàn lịch sự, có bằng chứng (ảnh)', 'Khoảng 120–180 từ'],
    tips: 'Thư khiếu nại hiệu quả = thông tin nhận dạng (mã đơn) + bằng chứng + yêu cầu cụ thể + thời hạn. Thiếu một trong bốn, người nhận phải hỏi lại.',
  });
  TF.writing.push({
    id: 'tf6-em3', set: 6, task: 'email', title: 'Thanking an Internship Supervisor', minutes: 7,
    scenario: 'You have just finished a three-month summer internship at an engineering company. Your supervisor, Ms. Chen, helped you a great deal, and you hope to stay in contact with her.',
    to: 'Ms. Chen, your internship supervisor',
    points: ['Thank her for her support.', 'Mention something specific that you learned.', 'Ask about staying in touch or future opportunities.'],
    model: "Dear Ms. Chen,\n\nNow that my internship has ended, I wanted to thank you for all of your support over the past three months. I learned a great deal from working in your team, and I really appreciated how patient you were with my questions, especially during my first few weeks.\n\nThe most valuable experience for me was helping to test the new water-filter design. Before the internship, I had only studied testing methods in theory, but you showed me how to plan an experiment, record results carefully and explain them clearly to the rest of the team. I am sure these skills will help me in my final-year project.\n\nI would love to stay in touch. Would it be all right if I contacted you next spring, when I start applying for graduate positions? I would also be very interested to hear about any future openings at the company.\n\nThank you again for everything.\n\nWarm regards,\nPriya Nair",
    mid: "Dear Ms. Chen,\n\nThank you very much for the internship. It was a great experience and I learned a lot of things. You were very kind and helpful to me.\n\nI hope we can stay in contact in the future. If there is a job in your company, please tell me.\n\nBest wishes,\nPriya",
    midNote: 'Bài trung bình có ý cảm ơn nhưng hoàn toàn chung chung ("learned a lot of things"), không nêu điều cụ thể đã học như đề yêu cầu; câu "If there is a job…, please tell me" hơi đường đột. Bài mẫu kể một dự án cụ thể, kỹ năng học được và cách áp dụng, rồi xin giữ liên lạc một cách lịch sự với thời điểm rõ ràng.',
    outline: ['Mục đích: cảm ơn sau kỳ thực tập + điểm cụ thể đáng trân trọng', 'Một trải nghiệm cụ thể đã học (dự án, kỹ năng, áp dụng sau này)', 'Xin giữ liên lạc với mốc thời gian + hỏi cơ hội tương lai', 'Lời cảm ơn kết'],
    vocab: ['I really appreciated how… – tôi rất trân trọng việc…', 'The most valuable experience for me was… – trải nghiệm quý giá nhất là…', 'in theory – trên lý thuyết', 'stay in touch – giữ liên lạc', 'future openings – vị trí tuyển dụng sắp tới'],
    checklist: ['Lời cảm ơn rõ ràng ngay đoạn đầu', 'Ít nhất một điều cụ thể đã học, có chi tiết', 'Liên hệ với kế hoạch tương lai', 'Đề nghị giữ liên lạc lịch sự (Would it be all right if…?)', 'Giọng trân trọng, trang trọng vừa phải', 'Khoảng 120–180 từ'],
    tips: 'Lời cảm ơn có sức nặng khi gắn với một chi tiết cụ thể – người nhận biết bạn thật sự nhớ điều họ đã làm.',
  });
  TF.writing.push({
    id: 'tf6-em4', set: 6, task: 'email', title: 'Proposing a New Student Club', minutes: 7,
    scenario: 'You want to start a board game club on campus, but new clubs must be approved by the student union. You need a room and a small budget to buy games.',
    to: 'Mr. Alvarez, the student union activities officer',
    points: ['Describe the club you want to start.', 'Explain why it would benefit students.', 'Ask about the approval process and support available.'],
    model: "Dear Mr. Alvarez,\n\nI am a second-year history student, and I would like to start a board game club on campus. The idea is to hold a relaxed weekly session, probably on Thursday evenings, where students can play strategy and cooperative games together.\n\nI believe the club would benefit students in two ways. First, it would give people a chance to meet others outside their own courses, which is especially helpful for first-year and international students who may feel isolated. Second, it would offer a screen-free way to relax during busy periods. When I mentioned the idea in an online student group, more than forty people said they would be interested.\n\nCould you tell me what the approval process involves and whether there is a deadline this semester? I would also like to know if the union could provide a room once a week and a small budget, perhaps around £150, to buy an initial set of games.\n\nThank you for considering this proposal.\n\nBest regards,\nTomás Rivera",
    mid: "Dear Mr. Alvarez,\n\nI want to start a board game club because I love board games. I think many students also like board games and it will be very fun. We can play every week.\n\nPlease tell me how to make a new club. We also need a room and some money to buy games. I hope you can help us.\n\nThank you,\nTomás",
    midNote: 'Bài trung bình chỉ nói lý do cá nhân ("I love board games"), thiếu lợi ích cho sinh viên – ý trọng tâm của đề; "many students also like board games" không có bằng chứng; yêu cầu về phòng và kinh phí không cụ thể. Bài mẫu nêu hai lợi ích, có số liệu quan tâm (hơn 40 người) và đề xuất ngân sách rõ ràng.',
    outline: ['Giới thiệu bản thân + ý tưởng câu lạc bộ (thời gian, hình thức)', 'Hai lợi ích cho sinh viên + bằng chứng có nhu cầu', 'Hỏi quy trình duyệt, hạn chót; đề nghị phòng và ngân sách cụ thể', 'Cảm ơn'],
    vocab: ['I would like to start… – tôi muốn thành lập…', 'feel isolated – cảm thấy lạc lõng', 'a screen-free way to relax – cách thư giãn không cần màn hình', 'the approval process – quy trình phê duyệt', 'an initial set of… – bộ … ban đầu'],
    checklist: ['Mô tả câu lạc bộ rõ ràng (gì, khi nào)', 'Lợi ích cho sinh viên, không chỉ sở thích cá nhân', 'Có bằng chứng nhu cầu', 'Câu hỏi cụ thể về quy trình và hỗ trợ (phòng, kinh phí)', 'Giọng trang trọng, thuyết phục', 'Khoảng 120–180 từ'],
    tips: 'Khi đề xuất, hãy viết từ góc nhìn của người duyệt: điều này giúp ích gì cho tập thể và cần bao nhiêu nguồn lực.',
  });
  TF.writing.push({
    id: 'tf6-em5', set: 6, task: 'email', title: 'Requesting a Refund for a Cancelled Trip', minutes: 7,
    scenario: 'You paid $120 for a geology department field trip, but the trip was cancelled because of bad weather. A month has passed, and you have not received a refund.',
    to: 'Ms. Barker, the geology department administrator',
    points: ['Remind her about the trip and your payment.', 'Explain the situation.', 'Ask when and how you will receive the refund.'],
    model: "Dear Ms. Barker,\n\nI am writing about the geology field trip to Redstone Canyon that was planned for 12 October. I paid the $120 fee online on 20 September, and my payment reference number is GEO-5571.\n\nAs you know, the trip was cancelled because of the storm warning, and the email announcing the cancellation said that all students would receive a full refund within two weeks. However, more than a month has now passed, and the money has not yet appeared in my account. I have checked my bank statements carefully to make sure I have not missed it.\n\nCould you please let me know when I can expect the refund and whether I need to complete any form? If it would help, I can send a copy of my payment receipt.\n\nThank you for looking into this.\n\nBest regards,\nDaniel Osei",
    mid: "Dear Ms. Barker,\n\nI paid for the field trip but it was cancelled. It is now one month and I still don't get my money back. This is a long time and I need the money.\n\nPlease give me my refund as soon as possible.\n\nDaniel",
    midNote: 'Bài trung bình thiếu thông tin nhận dạng (chuyến đi nào, ngày, số tiền, mã thanh toán) nên người nhận khó tra cứu; câu "I still don\'t get my money back" sai thì (→ haven\'t got); giọng thúc ép, không có lời chào kết lịch sự. Bài mẫu dẫn lại lời hứa hoàn tiền trong hai tuần làm căn cứ và đề nghị gửi biên lai.',
    outline: ['Nhắc chuyến đi (tên, ngày) + thông tin thanh toán (số tiền, mã)', 'Tình hình: chuyến đi bị hủy, đã hứa hoàn tiền trong 2 tuần, nay quá 1 tháng', 'Hỏi thời điểm hoàn tiền và thủ tục; đề nghị gửi biên lai', 'Cảm ơn'],
    vocab: ['payment reference number – mã tham chiếu thanh toán', 'As you know, … – như cô đã biết, …', 'has not yet appeared in my account – vẫn chưa vào tài khoản', 'when I can expect the refund – khi nào em sẽ nhận được tiền hoàn', 'Thank you for looking into this – cảm ơn cô đã xem xét việc này'],
    checklist: ['Thông tin nhận dạng đầy đủ (chuyến đi, ngày, số tiền, mã)', 'Nêu lời hứa trước đó làm căn cứ', 'Cho thấy đã tự kiểm tra (sao kê ngân hàng)', 'Câu hỏi cụ thể: khi nào, có cần điền mẫu không', 'Giọng lịch sự, không thúc ép', 'Khoảng 120–180 từ'],
    tips: 'Dùng thì hiện tại hoàn thành cho việc "chưa xảy ra tới giờ": has not yet appeared, more than a month has passed.',
  });
  TF.writing.push({
    id: 'tf6-em6', set: 6, task: 'email', title: 'Sharing Chores with a Roommate', minutes: 7,
    scenario: 'You share an apartment with a roommate, Sam. Recently, the kitchen has often been left dirty, and you have been doing most of the cleaning. You want to solve the problem without an argument.',
    to: 'Sam, your roommate',
    points: ['Explain the problem politely.', 'Suggest a fair way to share the chores.', 'Invite Sam to respond with ideas.'],
    model: "Hi Sam,\n\nI hope your exams are going well. I wanted to mention something small before it turns into a bigger issue. Over the last few weeks, the kitchen has often been left with dishes in the sink, and I've ended up doing most of the cleaning. I know we've both been really busy, so I'm sure it isn't deliberate.\n\nI was thinking we could make a simple weekly rota to keep things fair. For example, one of us could be responsible for the dishes and the kitchen counters, and the other could take care of the bathroom and the rubbish, and then we could swap each week. We could stick the rota on the fridge so we both remember.\n\nWhat do you think? If you have a different idea, I'm happy to hear it. Maybe we could talk about it over dinner this weekend?\n\nThanks,\nAlex",
    mid: "Hi Sam,\n\nI am tired of cleaning the kitchen every day. You never wash your dishes and the kitchen is always dirty. It is not fair for me.\n\nFrom now on you should clean the kitchen on Monday, Wednesday and Friday. I will clean on the other days. Please do it.\n\nAlex",
    midNote: 'Bài trung bình đúng chủ đề nhưng giọng buộc tội ("You never…", "always dirty") – trái với yêu cầu "politely" và "without an argument"; áp đặt lịch thay vì đề xuất; không mời Sam góp ý. Bài mẫu làm dịu vấn đề ("I\'m sure it isn\'t deliberate"), đề xuất lịch luân phiên công bằng và mở lời bàn bạc.',
    outline: ['Mở đầu thân thiện + nêu vấn đề nhẹ nhàng, không đổ lỗi', 'Đề xuất lịch phân việc luân phiên cụ thể', 'Mời Sam góp ý + hẹn nói chuyện trực tiếp'],
    vocab: ['before it turns into a bigger issue – trước khi thành chuyện lớn', "I've ended up doing… – rốt cuộc mình toàn phải…", "it isn't deliberate – không phải cố ý", 'a weekly rota – lịch phân công hằng tuần', 'take care of – lo, phụ trách'],
    checklist: ['Nêu vấn đề nhẹ nhàng, dùng "I" thay vì buộc tội "you"', 'Đề xuất cụ thể và công bằng', 'Mời đối phương đóng góp ý kiến', 'Giọng thân mật phù hợp bạn cùng phòng', 'Có lời chào và kết thân thiện', 'Khoảng 120–180 từ'],
    tips: 'Mẹo giảm căng thẳng: nói về tình huống ("the kitchen has been left…") thay vì về con người ("you never…").',
  });
  TF.writing.push({
    id: 'tf6-ad1', set: 6, task: 'discussion', title: 'Should Laptops Be Banned in Lectures?', minutes: 10,
    professor: { name: 'Dr. Fischer', text: 'Some professors have started banning laptops and tablets in their lectures, arguing that students who take notes by hand pay more attention. Others believe students should be free to choose the tools that work best for them. Should universities allow laptops in lecture halls? Explain your view.' },
    students: [
      { name: 'Kenji', text: 'Laptops should be allowed. I type much faster than I write, so I can record more of the lecture, and my notes are easier to organize and search later.' },
      { name: 'Olivia', text: 'I support a ban. When students around me are on social media or shopping websites, it distracts me too, even though I am not using a laptop.' },
    ],
    model: "I believe laptops should be allowed, but with clear rules about how they are used. Kenji is right that typed notes are faster to produce and easier to search, which is especially helpful for students with learning difficulties who may struggle to write quickly. However, Olivia raises an important point that is often ignored: a laptop distracts not only its user but also everyone sitting behind. One fair solution would be to create laptop sections at the back or sides of lecture halls, so that students who prefer handwriting can sit at the front without seeing other people's screens. In addition, professors could ask students to close all applications except their note-taking program. This approach respects students' choices while protecting the attention of the whole class.",
    mid: "I think laptops should be allowed in lectures. I agree with Kenji that typing is faster than writing. Also, students are adults and they can decide what is good for them. Olivia says laptops distract other students, but I think she can just sit in another place. Laptops are also useful to search information during the lecture. So universities should not ban laptops.",
    midNote: 'Bài trung bình (khoảng 65 từ) có quan điểm nhưng gạt ý của Olivia đi khá hời hợt ("she can just sit in another place") mà không phát triển thành giải pháp; ý "search information during the lecture" lại có thể gây xao nhãng – tự làm yếu lập luận. Bài mẫu biến chính ý đó thành đề xuất có tổ chức (khu vực dành cho laptop) và bổ sung quy tắc sử dụng.',
    outline: ['Quan điểm: cho phép nhưng có quy tắc', 'Ủng hộ Kenji + mở rộng (sinh viên khó khăn khi viết tay)', 'Ghi nhận Olivia: xao nhãng lan sang người khác', 'Ý mới: khu vực ngồi riêng cho laptop + chỉ mở ứng dụng ghi chép', 'Câu kết: cân bằng quyền chọn và sự tập trung chung'],
    vocab: ['learning difficulties – khó khăn trong học tập', 'raise an important point – nêu một ý quan trọng', 'not only… but also… – không chỉ… mà còn…', 'a fair solution – giải pháp công bằng', "respect students' choices – tôn trọng lựa chọn của sinh viên"],
    checklist: ['Nêu quan điểm rõ ngay câu đầu', 'Phản hồi cả Kenji và Olivia', 'Đóng góp ý MỚI: khu vực laptop riêng, quy tắc dùng', 'Giải thích vì sao giải pháp hiệu quả', 'Từ nối: However, In addition, so that', 'Tối thiểu khoảng 100 từ'],
    tips: 'Khi ý của bạn kia khiến bạn chỉ muốn nói "cứ ngồi chỗ khác", hãy biến nó thành một giải pháp có tổ chức – đó chính là "ý mới".',
  });
  TF.writing.push({
    id: 'tf6-ad2', set: 6, task: 'discussion', title: 'Living On Campus or Off Campus?', minutes: 10,
    professor: { name: 'Dr. Mbeki', text: 'For students who move away from home to attend university, housing is an important decision. Some live in campus residence halls, while others rent apartments in the city. Which option do you think is better for first-year students, and why?' },
    students: [
      { name: 'Grace', text: 'Campus housing is better. Everything is close by, and it is much easier to make friends when you live with other first-year students.' },
      { name: 'Ahmed', text: 'I would choose an apartment. Residence halls are noisy and have lots of rules. Living off campus teaches you how to manage money and look after yourself.' },
    ],
    model: "In my view, first-year students benefit more from living on campus. Grace makes an important point about friendship: the first months of university can be lonely, and sharing a hall with people who are going through the same experience makes it much easier to build a support network. Ahmed is correct that renting an apartment develops independence, but I think that lesson can wait a year. New students already have to adapt to a different style of studying, and adding responsibilities such as paying bills, dealing with landlords and commuting may affect their grades. For example, a friend of mine who rented a flat in his first year spent so much time travelling that he rarely joined study groups. Living off campus is therefore a better choice for the second year, once students feel settled.",
    mid: "I think living on campus is better for first-year students. Grace is right that it is easy to make friends. Also, the classrooms and library are near, so students don't waste time. Ahmed thinks students can learn to be independent in an apartment, but apartments are expensive and students don't have much money. So I agree with Grace.",
    midNote: 'Bài trung bình (khoảng 60 từ) có quan điểm nhưng chủ yếu nhắc lại ý của Grace; phản biện Ahmed bằng một lý do mới (giá thuê) nhưng không phát triển; không có ví dụ; câu kết "So I agree with Grace" không đóng góp gì. Bài mẫu thừa nhận giá trị của sự tự lập rồi lập luận về THỜI ĐIỂM (để sang năm hai), có ví dụ cụ thể.',
    outline: ['Quan điểm: năm nhất nên ở ký túc xá', 'Ủng hộ Grace: mạng lưới hỗ trợ khi mới xa nhà', 'Nhượng bộ Ahmed: tự lập quan trọng nhưng có thể chờ', 'Ý mới: năm nhất đã nhiều áp lực thích nghi + ví dụ người bạn đi lại xa', 'Kết: ra ngoài thuê nhà phù hợp từ năm hai'],
    vocab: ['build a support network – xây dựng mạng lưới hỗ trợ', 'adapt to – thích nghi với', 'deal with landlords – làm việc với chủ nhà', 'commute – đi lại xa (đến trường/chỗ làm)', 'feel settled – cảm thấy ổn định'],
    checklist: ['Nêu lựa chọn rõ ngay câu đầu', 'Phản hồi cả Grace và Ahmed', 'Đóng góp ý MỚI: vấn đề thời điểm (năm nhất vs năm hai)', 'Có ví dụ cụ thể', 'Từ nối: but, For example, therefore', 'Tối thiểu khoảng 100 từ'],
    tips: 'Một cách tạo ý mới tinh tế: đồng ý với lợi ích bạn kia nêu nhưng tranh luận về "khi nào" thay vì "có hay không".',
  });
  TF.writing.push({
    id: 'tf6-ad3', set: 6, task: 'discussion', title: 'Should Supermarkets Ban Plastic Packaging?', minutes: 10,
    professor: { name: 'Dr. Larsen', text: 'Supermarkets sell many products wrapped in plastic, from fruit to sandwiches. Some environmental groups want governments to ban most plastic packaging in supermarkets. Do you think such a ban would be a good idea? Why or why not?' },
    students: [
      { name: 'Mia', text: 'Yes. Most of this plastic is used for a few minutes and then thrown away. A ban would force companies to find better alternatives quickly.' },
      { name: 'Carlos', text: 'I am not sure. Plastic keeps food fresh for longer. If we remove it, more food might go to waste, which is also bad for the environment.' },
    ],
    model: "I think a complete ban would go too far, but governments should ban plastic where it serves no real purpose. Mia is right that a huge amount of packaging is used briefly and then thrown away; for example, bananas and oranges already have natural protective skins, so wrapping them in plastic is pointless. On the other hand, Carlos makes a valid point, because plastic film can keep products such as meat or cucumbers fresh for several extra days, and wasted food also produces greenhouse gases. A sensible approach would therefore be a targeted ban: plastic would be prohibited for loose fruit and vegetables, while remaining packaging would have to be recyclable. Supermarkets could also offer discounts to customers who bring their own containers. This would cut unnecessary waste without increasing food loss.",
    mid: "I agree with Mia that plastic packaging should be banned. Plastic is very bad for the environment because it pollutes the ocean and kills animals. Carlos says plastic keeps food fresh, but people can use paper or glass instead. I think the government should ban plastic in all supermarkets as soon as possible, because the environment is the most important thing.",
    midNote: 'Bài trung bình (khoảng 65 từ) lặp lại ý chung về ô nhiễm nhựa thay vì trả lời trực tiếp lập luận của Carlos (giấy hay thủy tinh không giữ thực phẩm tươi tốt bằng); kết luận cực đoan "ban plastic in all supermarkets as soon as possible" thiếu cân nhắc. Bài mẫu phân loại khi nào nhựa vô ích, khi nào hữu ích, rồi đề xuất cấm có chọn lọc.',
    outline: ['Quan điểm: không cấm toàn bộ, cấm khi nhựa vô ích', 'Ủng hộ Mia + ví dụ (chuối, cam có vỏ tự nhiên)', 'Ghi nhận Carlos: màng bọc giữ tươi, lãng phí thực phẩm cũng phát thải', 'Ý mới: cấm có mục tiêu + bao bì còn lại phải tái chế được + giảm giá khi mang hộp riêng', 'Câu kết'],
    vocab: ['go too far – đi quá xa', 'serve no real purpose – không có tác dụng thực sự', 'a targeted ban – lệnh cấm có mục tiêu', 'food loss – thất thoát thực phẩm', 'greenhouse gases – khí nhà kính'],
    checklist: ['Nêu quan điểm rõ, có giới hạn', 'Phản hồi cả Mia và Carlos', 'Đóng góp ý MỚI: lệnh cấm có chọn lọc', 'Có ví dụ cụ thể (trái cây có vỏ, thịt, dưa chuột)', 'Từ nối: On the other hand, therefore, while', 'Tối thiểu khoảng 100 từ'],
    tips: 'Đừng phản bác bằng câu khẩu hiệu ("the environment is the most important thing"); hãy trả lời đúng cơ chế mà bạn kia nêu ra.',
  });
  TF.writing.push({
    id: 'tf6-ad4', set: 6, task: 'discussion', title: 'Should Employers Monitor Remote Workers?', minutes: 10,
    professor: { name: 'Dr. Grant', text: 'As more people work from home, some companies use software that tracks employees\' keyboard activity, takes screenshots or records how long they spend on each website. Is it acceptable for employers to monitor remote workers in this way? Explain your opinion.' },
    students: [
      { name: 'Lily', text: 'I think it is reasonable. The company pays for your time, so it has a right to check that you are actually working and not doing personal things.' },
      { name: 'Nathan', text: 'This kind of monitoring shows a lack of trust. People who feel watched all the time become stressed, and some good employees will simply leave.' },
    ],
    model: "In my opinion, detailed monitoring of keyboard activity and screenshots is not acceptable, although employers do need some way to assess work. Lily is correct that companies pay for their employees' time and need to know that work is being done. However, measuring activity is a poor way to measure productivity: someone thinking carefully about a difficult problem may barely touch the keyboard, while someone moving the mouse all day may achieve very little. Nathan's concern about trust is also important, since constant surveillance can damage morale. A better solution is to judge remote employees by results, such as finished tasks, deadlines met and feedback from clients. Regular short check-ins with managers can show whether someone is struggling without making them feel watched. In this way, companies protect their interests while respecting workers' privacy.",
    mid: "I agree with Nathan. Monitoring software is not good because employees feel stressed when the company watches them all the time. It is also bad for privacy. Lily thinks the company has a right to check, but I think people can work well without being watched. Companies should trust their workers more, because happy workers work better.",
    midNote: 'Bài trung bình (khoảng 60 từ) đứng về Nathan nhưng chưa trả lời được mối lo chính đáng của Lily (công ty cần biết công việc có được làm không); ý "happy workers work better" chung chung, không ví dụ. Bài mẫu chỉ ra điểm yếu của việc đo hoạt động bàn phím và đề xuất đánh giá theo kết quả – vừa đáp ứng Lily vừa giải quyết lo ngại của Nathan.',
    outline: ['Quan điểm: không chấp nhận giám sát chi tiết, nhưng cần cách đánh giá', 'Ghi nhận Lily: công ty trả tiền cho thời gian', 'Ý mới: hoạt động ≠ năng suất (ví dụ người suy nghĩ vs người lướt chuột)', 'Ủng hộ Nathan: lòng tin và tinh thần làm việc', 'Giải pháp: đánh giá theo kết quả + trao đổi định kỳ; câu kết'],
    vocab: ['assess work – đánh giá công việc', 'productivity – năng suất', 'constant surveillance – sự giám sát liên tục', 'damage morale – làm giảm tinh thần làm việc', 'judge by results – đánh giá theo kết quả'],
    checklist: ['Nêu quan điểm rõ ngay câu đầu', 'Phản hồi cả Lily và Nathan', 'Đóng góp ý MỚI: hoạt động không phản ánh năng suất; đánh giá theo kết quả', 'Có ví dụ minh họa', 'Từ nối: However, while, since, In this way', 'Tối thiểu khoảng 100 từ'],
    tips: 'Tìm "giả định ẩn" trong lập luận của bạn kia (ở đây: hoạt động = làm việc) rồi chỉ ra nó sai – đó là cách phản biện rất được đánh giá cao.',
  });
  TF.writing.push({
    id: 'tf6-ad5', set: 6, task: 'discussion', title: 'Should National Parks Charge Entry Fees?', minutes: 10,
    professor: { name: 'Dr. Ito', text: 'National parks protect important natural areas, but maintaining trails, visitor centers and wildlife programs is expensive. Some countries charge visitors an entry fee, while others keep parks free for everyone. Should national parks charge entry fees? Why or why not?' },
    students: [
      { name: 'Emma', text: 'Parks should be free. Nature belongs to everyone, and fees would stop families with low incomes from enjoying these places.' },
      { name: 'Raj', text: 'A small fee makes sense. Visitors are the ones who wear down the trails and leave litter, so they should help pay for the damage.' },
    ],
    model: "I believe national parks should charge a modest fee, as long as there are clear exceptions for people who cannot afford it. Raj makes a strong point that the people who use the parks directly create costs, from eroded trails to rubbish collection, so it is fair for them to contribute. At the same time, Emma is right that nature should not become a luxury. The solution is a fee system designed with fairness in mind. For instance, children and local residents could enter for free, and low-income families could receive free annual passes. Parks could also offer free entry on certain days each month. Furthermore, fees can help with overcrowding at the most popular parks, because higher prices at peak times would encourage some visitors to come during quieter periods.",
    mid: "I think national parks should charge a small fee. Raj is right that visitors damage the parks and leave rubbish, so they should pay money to fix it. Emma says poor families cannot go, but the fee is small so most people can pay it. The money can be used to protect animals and clean the parks. So a fee is a good idea.",
    midNote: 'Bài trung bình (khoảng 60 từ) đồng ý với Raj nhưng gạt lo ngại của Emma bằng giả định "most people can pay it" – chưa giải quyết đúng nhóm thu nhập thấp; không có ý mới thật sự. Bài mẫu đề xuất hệ thống phí công bằng (miễn phí cho trẻ em, người địa phương, thẻ năm cho gia đình thu nhập thấp) và thêm lợi ích mới: điều tiết lượng khách vào giờ cao điểm.',
    outline: ['Quan điểm: thu phí nhỏ, có ngoại lệ', 'Ủng hộ Raj: người dùng tạo chi phí', 'Ghi nhận Emma: thiên nhiên không nên thành xa xỉ', 'Giải pháp: miễn phí cho trẻ em, cư dân, thẻ năm cho gia đình thu nhập thấp, ngày miễn phí', 'Ý mới: phí điều tiết quá tải giờ cao điểm'],
    vocab: ['a modest fee – mức phí vừa phải', 'eroded trails – đường mòn bị xói mòn', 'become a luxury – trở thành thứ xa xỉ', 'an annual pass – thẻ vào cửa cả năm', 'overcrowding at peak times – quá tải vào giờ cao điểm'],
    checklist: ['Nêu quan điểm có điều kiện ngay câu đầu', 'Phản hồi cả Emma và Raj', 'Đóng góp ý MỚI: hệ thống phí công bằng + điều tiết lượng khách', 'Có ví dụ cụ thể', 'Từ nối: At the same time, For instance, Furthermore', 'Tối thiểu khoảng 100 từ'],
    tips: 'Thêm một lợi ích mà cả hai bạn đều chưa nhắc (ở đây: giảm quá tải) là cách nhanh nhất để bài thảo luận nổi bật.',
  });
  TF.writing.push({
    id: 'tf6-ad6', set: 6, task: 'discussion', title: 'Do Group Projects Help Students Learn?', minutes: 10,
    professor: { name: 'Dr. Reyes', text: 'Many university courses include group projects in which students share a grade. Supporters say these projects build teamwork skills that employers want, but many students complain about them. Do you think group projects are an effective way for students to learn? Explain why or why not.' },
    students: [
      { name: 'Sophie', text: 'They are useful. In almost every job, you have to work with people you did not choose, so it is good practice for the real world.' },
      { name: 'Ben', text: 'In my experience, one or two people do most of the work while others do almost nothing, but everyone gets the same grade. That is not fair.' },
    ],
    model: "I believe group projects can be very effective, but only if they are designed to make every member accountable. Sophie is right that working with people we did not choose is an important skill, since most careers involve teamwork, compromise and dealing with different working styles. Nevertheless, Ben describes a real problem: when everyone receives the same grade, some students have little reason to contribute. The answer is not to abandon group work but to assess it more carefully. For example, professors could combine a group grade with an individual grade based on each student's own section of the report. Peer evaluations, in which members confidentially rate each other's contributions, would also discourage free riding. With these changes, group projects could teach both cooperation and individual responsibility.",
    mid: "I think group projects are useful for students. As Sophie says, in the future we will have to work with other people in our job, so we need to practise. Group projects also help students to share ideas and learn from each other. Ben is right that some students are lazy, but this also happens in real jobs, so students must learn to deal with it.",
    midNote: 'Bài trung bình (khoảng 65 từ) đồng ý với Sophie và thừa nhận vấn đề của Ben, nhưng "students must learn to deal with it" không phải giải pháp, bỏ qua bất công về điểm số mà Ben nêu; thiếu ví dụ. Bài mẫu giữ giá trị làm việc nhóm nhưng đề xuất cách chấm mới (điểm nhóm + điểm cá nhân, đánh giá chéo bí mật) để giải quyết chính vấn đề của Ben.',
    outline: ['Quan điểm: hiệu quả nếu có cơ chế trách nhiệm cá nhân', 'Ủng hộ Sophie: kỹ năng làm việc với người không tự chọn', 'Thừa nhận Ben: cùng điểm → ít động lực', 'Ý mới: điểm nhóm + điểm cá nhân, đánh giá chéo bí mật', 'Câu kết: hợp tác + trách nhiệm cá nhân'],
    vocab: ['make every member accountable – khiến mỗi thành viên chịu trách nhiệm', 'compromise – sự thỏa hiệp', 'abandon – từ bỏ', 'peer evaluation – đánh giá chéo giữa các thành viên', 'free riding – ăn theo, hưởng lợi mà không đóng góp'],
    checklist: ['Nêu quan điểm có điều kiện ngay câu đầu', 'Phản hồi cả Sophie và Ben', 'Đóng góp ý MỚI: cách chấm điểm kết hợp + đánh giá chéo', 'Có ví dụ cụ thể', 'Từ nối: Nevertheless, For example, also, With these changes', 'Tối thiểu khoảng 100 từ'],
    tips: 'Mẫu câu "The answer is not to… but to…" giúp bạn vừa giữ quan điểm vừa giải quyết phản đối – rất hợp với dạng bài thảo luận.',
  });

  /* ===================================================================
   * BỘ 5 · LISTENING (tự biên soạn): Choose a Response 1–8, 2 hội thoại, 2 thông báo, 2 bài giảng = 32 câu.
   * Đáp án đúng viết ở vị trí 0, được xoay ở cuối file.
   * =================================================================== */
  const RESP5 = [
    { s: 'B', t: "Has anyone seen the charger for the projector?",
      options: ["I think Maria put it in the top drawer.", "The projector shows very clear images.", "Yes, I've seen that film twice.", "It charges ten dollars an hour."],
      explain: "Hỏi có ai thấy bộ sạc không → trả lời nơi có thể tìm: \"Hình như Maria để nó trong ngăn kéo trên cùng\". \"seen that film\", \"charges ten dollars\" là bẫy lặp từ \"seen\", \"charge\"." },
    { s: 'A', t: "When is the deadline for the scholarship application?",
      options: ["It's the fifteenth of next month.", "I applied for two scholarships.", "The application is four pages long.", "At the student services office."],
      explain: "Câu hỏi \"When\" → cần mốc thời gian: \"Ngày 15 tháng sau\". \"At the student services office\" trả lời cho \"Where\"; các câu khác lặp từ \"applied\", \"application\"." },
    { s: 'B', t: "I'm thinking of dropping my statistics class.",
      options: ["Really? You might want to talk to your adviser first.", "I dropped my phone on the stairs.", "Statistics show that prices are rising.", "The class meets on Tuesdays and Thursdays."],
      explain: "Người nói định bỏ môn thống kê → lời khuyên phù hợp: \"Thật à? Có lẽ bạn nên nói chuyện với cố vấn học tập trước\". \"dropped my phone\" lặp từ \"drop\" với nghĩa khác (làm rơi)." },
    { s: 'A', t: "Who's giving the keynote speech at the conference?",
      options: ["A professor from the medical school, I believe.", "The speech lasted about an hour.", "I gave my keys to the receptionist.", "It's in the main auditorium."],
      explain: "Câu hỏi \"Who\" → cần một người: \"Một giáo sư trường y, mình nghĩ vậy\". \"keys\" là bẫy âm gần giống \"keynote\"; \"main auditorium\" trả lời cho \"Where\"." },
    { s: 'B', t: "Didn't you say you'd already finished the reading?",
      options: ["I did, but I want to go over it again.", "No, I don't like reading novels.", "The reading room is on the third floor.", "I'll finish it by next year."],
      explain: "Câu hỏi phủ định để xác nhận (\"Chẳng phải bạn nói đã đọc xong rồi sao?\") → xác nhận và giải thích: \"Đúng vậy, nhưng mình muốn đọc lại\". Các phương án khác lặp \"reading\", \"finish\"." },
    { s: 'A', t: "How about ordering pizza for the study group tonight?",
      options: ["Sounds good – I'll ask everyone what they want.", "About twelve dollars each.", "We studied until midnight.", "The group has five members."],
      explain: "\"How about…?\" là lời đề nghị → đồng ý/từ chối: \"Nghe hay đấy – để mình hỏi mọi người muốn gì\". \"About twelve dollars\" trả lời cho \"How much\" – bẫy từ \"about\"." },
    { s: 'B', t: "The printer in the computer lab is out of paper again.",
      options: ["I'll let the lab assistant know.", "I printed my essay yesterday.", "The paper was due on Monday.", "Computers are getting cheaper."],
      explain: "Người nói báo máy in hết giấy → phản hồi hành động: \"Để mình báo trợ lý phòng máy\". \"paper was due\" dùng \"paper\" theo nghĩa bài luận – bẫy đa nghĩa." },
    { s: 'A', t: "Should I submit the report by email or print it out?",
      options: ["Email is fine – the professor prefers digital copies.", "Yes, you should submit it.", "The printer is next to the door.", "I reported the problem yesterday."],
      explain: "Câu hỏi lựa chọn (email hay bản in) → chọn một: \"Email là được – giáo sư thích bản điện tử\". Không trả lời Yes/No cho câu hỏi lựa chọn; \"reported\" là bẫy lặp từ." },
  ];
  const respScript5 = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
  RESP5.forEach((r, i) => { respScript5.push({ say: 'Number ' + (i + 1) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
  TF.listening.push({
    id: 'tf5-lr', set: 5, task: 'response', title: 'Choose a Response · Set 5',
    speakers: { A: { name: 'Speaker 1', accent: 'en-US', gender: 'm' }, B: { name: 'Speaker 2', accent: 'en-GB', gender: 'f' } },
    script: respScript5,
    groups: [mcq('Listen to each sentence and choose the best response.', RESP5.map((r, i) => ({ n: i + 1, q: 'Choose the best response to sentence ' + (i + 1) + '.', options: r.options, a: 0, cue: r.t, explain: r.explain })))],
  });

  TF.listening.push({
    id: 'tf5-lc1', set: 5, task: 'conversation', title: 'Booking a Group Study Room',
    speakers: { S: { name: 'Student (Leo)', accent: 'en-US', gender: 'm' }, L: { name: 'Librarian', accent: 'en-GB', gender: 'f' } },
    script: [
      { say: 'Listen to a conversation between a student and a librarian.' }, { pause: 1 },
      { s: 'S', t: "Hi. I'd like to book a group study room for Thursday afternoon. There are five of us working on a marketing presentation." },
      { s: 'L', t: "Let me check. I'm afraid all the rooms are taken on Thursday afternoon – it's the week before exams. But room 4B is free on Thursday morning from nine to twelve." },
      { s: 'S', t: "Hmm, two of my group have a lecture until ten. Could we book it from ten?" },
      { s: 'L', t: "Yes, that's fine. Rooms can be booked for a maximum of three hours, so you could have it from ten until one, if one o'clock is still free… Yes, it is." },
      { s: 'S', t: "Great. Does the room have a screen? We need to practise with our slides." },
      { s: 'L', t: "It has a large screen, but you'll need to bring your own laptop cable. The library ran out of spare ones last month, and the new ones haven't arrived yet." },
      { s: 'S', t: "OK, I'll remind everyone. And do I need to do anything else?" },
      { s: 'L', t: "Just show your student card at the desk when you arrive. If you're more than fifteen minutes late, the room may be given to someone on the waiting list." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 9, q: 'Why can the student not have a room on Thursday afternoon?', options: ['All the rooms have already been reserved.', 'The library closes early on Thursdays.', 'His group is too large for the rooms.', 'Rooms cannot be booked during exams.'], a: 0, cue: 'all the rooms are taken on Thursday afternoon',
        explain: "Thủ thư nói \"all the rooms are taken on Thursday afternoon\" vì là tuần trước kỳ thi → mọi phòng đã có người đặt. Thư viện không đóng cửa sớm và vẫn cho đặt phòng buổi sáng." },
      { n: 10, q: 'Why does the student ask to start at ten o\'clock?', options: ['Some group members are in a lecture until then.', 'The room is being cleaned before ten.', 'The library opens at ten.', 'He has an exam at nine.'], a: 0, cue: 'two of my group have a lecture until ten',
        explain: "\"two of my group have a lecture until ten\" → hai thành viên bận học đến 10 giờ nên xin bắt đầu từ 10 giờ." },
      { n: 11, q: 'What does the librarian say about laptop cables?', options: ['Students must bring their own because the library has none at the moment.', 'They can be borrowed from the front desk.', 'They are not needed for the screen.', 'New cables were delivered last month.'], a: 0, cue: "you'll need to bring your own laptop cable",
        explain: "\"you'll need to bring your own laptop cable\" vì thư viện hết cáp dự phòng và cáp mới \"haven't arrived yet\" → hiện không có cáp để mượn. Phương án \"delivered last month\" sai: tháng trước là lúc hết cáp." },
      { n: 12, q: 'What will happen if the group arrives more than fifteen minutes late?', options: ['The room might be given to other students.', 'They will have to pay a fine.', 'Their booking will be moved to the afternoon.', 'They will lose their library cards.'], a: 0, cue: 'the room may be given to someone on the waiting list',
        explain: "Đến trễ hơn 15 phút thì \"the room may be given to someone on the waiting list\" → phòng có thể bị chuyển cho người khác. Không có tiền phạt hay thu thẻ." },
    ])],
  });
  TF.listening.push({
    id: 'tf5-lc2', set: 5, task: 'conversation', title: 'Asking About a Late Assignment',
    speakers: { S: { name: 'Student (Nadia)', accent: 'en-GB', gender: 'f' }, T: { name: 'Teaching assistant', accent: 'en-US', gender: 'm' } },
    script: [
      { say: 'Listen to a conversation between a student and a teaching assistant.' }, { pause: 1 },
      { s: 'S', t: "Hi, Mark. I wanted to talk to you about the history essay. I'm afraid I won't be able to hand it in on Friday." },
      { s: 'T', t: "OK. What's happened?" },
      { s: 'S', t: "My grandmother is in hospital, and I'm going home this weekend to see her. I've written about half of the essay, but I don't think I can finish it properly before I leave." },
      { s: 'T', t: "I'm sorry to hear that. Normally, late essays lose five percent for each day they're late. But in a family emergency like this, you can apply for an extension, and then there's no penalty." },
      { s: 'S', t: "How do I apply?" },
      { s: 'T', t: "There's a short form on the department website. You'll need to explain the situation briefly, and it has to be submitted before the original deadline, so try to do it by Thursday." },
      { s: 'S', t: "I'll do it tonight. How much extra time do people usually get?" },
      { s: 'T', t: "Usually one week. If you need longer than that, you'd have to speak to Professor Daly directly." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 13, q: 'Why does the student want to speak to the teaching assistant?', options: ['She cannot submit her essay by the deadline.', 'She wants feedback on her essay plan.', 'She has lost part of her essay.', 'She wants to change her essay topic.'], a: 0, cue: "I won't be able to hand it in on Friday",
        explain: "Nadia nói ngay: \"I won't be able to hand it in on Friday\" → không kịp nộp bài đúng hạn. Cô đã viết được một nửa, không làm mất bài hay đổi đề tài." },
      { n: 14, q: 'What is the usual penalty for a late essay?', options: ['Five percent is taken off for each day.', 'The essay receives a grade of zero.', 'The student must write a second essay.', 'There is no penalty for the first day.'], a: 0, cue: "late essays lose five percent for each day they're late",
        explain: "\"late essays lose five percent for each day they're late\" → trừ 5% mỗi ngày nộp muộn." },
      { n: 15, q: 'What must the student do to avoid a penalty?', options: ['Submit an online form before the original deadline', 'Bring a letter from the hospital', 'Finish the essay before the weekend', 'Ask her grandmother to contact the department'], a: 0, cue: 'it has to be submitted before the original deadline',
        explain: "Phải điền \"a short form on the department website\" và \"it has to be submitted before the original deadline\" → nộp đơn xin gia hạn trực tuyến trước hạn chót ban đầu. Không nhắc đến giấy của bệnh viện." },
      { n: 16, q: 'What does the teaching assistant say about extensions longer than one week?', options: ['The student would need to talk to the professor.', 'They are never allowed.', 'They are given automatically.', 'They require a second form.'], a: 0, cue: "you'd have to speak to Professor Daly directly",
        explain: "Gia hạn thường là một tuần; nếu cần lâu hơn \"you'd have to speak to Professor Daly directly\" → phải gặp giáo sư. Không nói là bị cấm hay tự động được duyệt." },
    ])],
  });

  TF.listening.push({
    id: 'tf5-la1', set: 5, task: 'announcement', title: 'New Dining Hall Hours',
    speakers: { A: { name: 'Dining services manager', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to an announcement from the campus dining services.' }, { pause: 1 },
      { s: 'A', t: "Good morning, everyone. Starting next Monday, the main dining hall will open an hour later on weekdays, at eight a.m. instead of seven. Very few students were using the hall before eight, so we're moving staff to the evening, when it's much busier." },
      { s: 'A', t: "As a result, dinner will now be served until nine p.m., an hour later than before. If you have an early class and need breakfast before eight, the café in the library will start serving hot breakfasts from seven." },
      { s: 'A', t: "Please note that meal plan cards can now be used at the library café as well, so you won't need to pay extra." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 17, q: 'Why is the dining hall changing its morning opening time?', options: ['Few students used it early in the morning.', 'The kitchen is being repaired.', 'Staff asked to start work later.', 'Breakfast will no longer be served.'], a: 0, cue: 'Very few students were using the hall before eight',
        explain: "\"Very few students were using the hall before eight\" nên nhà ăn mở muộn hơn và chuyển nhân viên sang buổi tối đông khách → ít người dùng buổi sáng sớm." },
      { n: 18, q: 'What change will be made to dinner?', options: ['It will be served for an extra hour.', 'It will start an hour earlier.', 'It will only be served in the café.', 'It will cost more than before.'], a: 0, cue: 'dinner will now be served until nine p.m., an hour later than before',
        explain: "\"dinner will now be served until nine p.m., an hour later than before\" → bữa tối kéo dài thêm một giờ." },
      { n: 19, q: 'What does the speaker say about the library café?', options: ['Students can use their meal plan cards there.', 'It will close at seven a.m.', 'It will only serve cold food.', 'It is moving to the dining hall.'], a: 0, cue: 'meal plan cards can now be used at the library café',
        explain: "\"meal plan cards can now be used at the library café as well\" → dùng thẻ suất ăn ở quán cà phê thư viện, không phải trả thêm. Quán MỞ từ 7 giờ và phục vụ đồ ăn sáng nóng." },
    ])],
  });
  TF.listening.push({
    id: 'tf5-la2', set: 5, task: 'announcement', title: 'Water Supply Interruption',
    speakers: { A: { name: 'Facilities office', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to an announcement in a university building.' }, { pause: 1 },
      { s: 'A', t: "This is an announcement from the facilities office. On Wednesday, the water supply to the science building will be turned off from one p.m. to five p.m. while engineers replace a damaged pipe." },
      { s: 'A', t: "During this time, the toilets and sinks in the building won't work, and laboratory experiments that need running water must not take place. Lab classes scheduled for Wednesday afternoon have been moved to Friday morning." },
      { s: 'A', t: "Drinking water will be available from bottles at the main entrance. We apologise for the inconvenience and thank you for your patience." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 20, q: 'Why will the water be turned off?', options: ['So that a damaged pipe can be replaced', 'Because of a shortage in the city', 'To test the fire safety system', 'Because the building will be closed'], a: 0, cue: 'while engineers replace a damaged pipe',
        explain: "Nước bị cắt \"while engineers replace a damaged pipe\" → để thay một đoạn ống hỏng." },
      { n: 21, q: 'What will happen to the lab classes on Wednesday afternoon?', options: ['They will take place on Friday morning instead.', 'They will be cancelled without replacement.', 'They will be held in another building.', 'They will start at five p.m.'], a: 0, cue: 'have been moved to Friday morning',
        explain: "\"Lab classes scheduled for Wednesday afternoon have been moved to Friday morning\" → dời sang sáng thứ Sáu, không bị hủy." },
      { n: 22, q: 'Where can people get drinking water?', options: ['At the main entrance', 'In the laboratories', 'From the facilities office', 'In the building next door'], a: 0, cue: 'Drinking water will be available from bottles at the main entrance',
        explain: "\"Drinking water will be available from bottles at the main entrance\" → nước uống đóng chai ở lối vào chính." },
    ])],
  });

  TF.listening.push({
    id: 'tf5-lt1', set: 5, task: 'talk', title: 'Economics: The Tragedy of the Commons',
    speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'm' } },
    script: [
      { say: 'Listen to part of a lecture in an economics class.' }, { pause: 1 },
      { s: 'P', t: "Today I want to look at a famous idea called the tragedy of the commons. It was made popular by the ecologist Garrett Hardin in 1968. Hardin asked us to imagine a pasture – a field of grass – that is open to all the herders in a village." },
      { s: 'P', t: "Each herder benefits from adding one more cow, because he gets all the profit from that animal. But the cost – the damage to the grass – is shared by everyone. So each person has a reason to keep adding animals, and eventually the pasture is overgrazed and destroyed. Everyone loses, even though each decision seemed sensible on its own." },
      { s: 'P', t: "Hardin argued that the only solutions were government control or dividing the land into private property. But that conclusion was later challenged. The political scientist Elinor Ostrom studied fishing grounds, forests and irrigation systems around the world, and she found many communities that had managed shared resources successfully for centuries." },
      { s: 'P', t: "What did these communities have in common? Clear rules about who could use the resource, ways of monitoring each other, and gradual punishments for people who broke the rules. In 2009, Ostrom became the first woman to win the Nobel Prize in Economics, largely for this work." },
      { s: 'P', t: "So the lesson isn't that shared resources are always doomed. It's that they need well-designed rules – and those rules don't always have to come from the government." },
    ],
    groups: [mcq('Answer the questions about the lecture.', [
      { n: 23, q: 'What is the lecture mainly about?', options: ['A theory about shared resources and a challenge to its conclusions', 'The history of farming in European villages', 'Why governments should own all natural resources', 'How cows damage different types of grass'], a: 0, cue: 'a famous idea called the tragedy of the commons',
        explain: "Bài giảng trình bày ý tưởng \"the tragedy of the commons\" của Hardin rồi đến nghiên cứu của Ostrom phản bác kết luận của ông → lý thuyết về tài nguyên chung và sự thách thức kết luận của nó." },
      { n: 24, q: 'According to the professor, why does each herder add more cows?', options: ['He receives all the benefit, but the cost is shared.', 'The village rules require it.', 'The grass grows faster with more animals.', 'He wants to damage other herders\' land.'], a: 0, cue: 'he gets all the profit from that animal',
        explain: "Mỗi người \"gets all the profit from that animal\" còn thiệt hại cho đồng cỏ \"is shared by everyone\" → lợi ích riêng, chi phí chung." },
      { n: 25, q: 'What did Elinor Ostrom discover?', options: ['Many communities had managed shared resources well for a long time.', 'Private property always protects resources better.', 'Hardin\'s pasture example was based on a real village.', 'Fishing grounds cannot be shared successfully.'], a: 0, cue: 'found many communities that had managed shared resources successfully for centuries',
        explain: "Ostrom \"found many communities that had managed shared resources successfully for centuries\" → nhiều cộng đồng quản lý tài nguyên chung tốt trong thời gian dài." },
      { n: 26, q: 'Which of the following was a feature of the successful communities?', options: ['Gradual punishments for people who broke the rules', 'Complete government control of the resource', 'Unlimited access for all users', 'Dividing the resource into private plots'], a: 0, cue: 'gradual punishments for people who broke the rules',
        explain: "Đặc điểm chung: quy định rõ ai được dùng, giám sát lẫn nhau và \"gradual punishments for people who broke the rules\". Kiểm soát của chính phủ và chia đất tư nhân là giải pháp của Hardin – chính điều bị Ostrom thách thức." },
      { n: 27, q: 'What is the professor\'s main conclusion?', options: ['Shared resources can survive if there are well-designed rules.', 'Shared resources are always destroyed in the end.', 'Only governments can protect natural resources.', 'Hardin\'s idea should no longer be taught.'], a: 0, cue: 'they need well-designed rules',
        explain: "Kết luận: tài nguyên chung không phải lúc nào cũng diệt vong – \"they need well-designed rules\", và luật lệ đó không nhất thiết đến từ chính phủ." },
    ])],
  });
  TF.listening.push({
    id: 'tf5-lt2', set: 5, task: 'talk', title: 'Art History: Painting with Oil',
    speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'f' } },
    script: [
      { say: 'Listen to part of a lecture in an art history class.' }, { pause: 1 },
      { s: 'P', t: "Before the fifteenth century, most European painters worked with tempera, which is pigment mixed with egg yolk. Tempera dries very quickly, in a matter of minutes, so artists had to apply it in small, precise strokes. It's very difficult to blend one colour smoothly into another." },
      { s: 'P', t: "Oil paint – pigment mixed with oils such as linseed oil – had been known for centuries, but in the early fifteenth century, painters in Flanders, in what is now Belgium, developed it to an extraordinary level. The best-known example is Jan van Eyck. You'll sometimes read that he invented oil painting, but that isn't true. What he and his contemporaries did was refine the technique." },
      { s: 'P', t: "The key advantage of oil is that it dries slowly – over days rather than minutes. That gave artists time to blend colours and to make changes. They also applied paint in thin, transparent layers called glazes. Light passes through each layer and reflects back from the layers beneath, which gives the colours a deep, glowing quality." },
      { s: 'P', t: "Over the next century, the technique spread to Italy, and by the sixteenth century oil had largely replaced tempera. Another reason was practical: oil paint could be used on canvas, which was lighter and cheaper than the wooden panels used for tempera, so paintings became larger and easier to transport." },
    ],
    groups: [mcq('Answer the questions about the lecture.', [
      { n: 28, q: 'What problem with tempera does the professor mention?', options: ['It dries so quickly that colours are hard to blend.', 'It could only be used on canvas.', 'It was more expensive than oil paint.', 'Its colours faded after a few years.'], a: 0, cue: 'Tempera dries very quickly',
        explain: "\"Tempera dries very quickly, in a matter of minutes\" nên \"It's very difficult to blend one colour smoothly into another\" → khô quá nhanh, khó hòa màu." },
      { n: 29, q: 'What does the professor say about Jan van Eyck?', options: ['He improved oil painting but did not invent it.', 'He was the first artist to use linseed oil.', 'He refused to use oil paint.', 'He brought oil painting from Italy to Flanders.'], a: 0, cue: "You'll sometimes read that he invented oil painting, but that isn't true",
        explain: "Giảng viên nói rõ: \"You'll sometimes read that he invented oil painting, but that isn't true\" – ông và những người cùng thời đã \"refine the technique\" (hoàn thiện kỹ thuật)." },
      { n: 30, q: 'Why does the professor mention glazes?', options: ['To explain how oil paintings achieved deep, glowing colours', 'To show why oil paint dried slowly', 'To describe how tempera was prepared', 'To explain why canvas was cheaper than wood'], a: 0, cue: 'gives the colours a deep, glowing quality',
        explain: "Lớp sơn mỏng trong suốt (glazes) cho ánh sáng xuyên qua và phản chiếu lại, \"which gives the colours a deep, glowing quality\" → giải thích màu sắc sâu và rực rỡ." },
      { n: 31, q: 'According to the professor, what was one practical advantage of oil paint?', options: ['It could be used on canvas, which was lighter and cheaper.', 'It required no special preparation.', 'It could be applied with fingers instead of brushes.', 'It was easier to remove from paintings.'], a: 0, cue: 'oil paint could be used on canvas, which was lighter and cheaper',
        explain: "\"oil paint could be used on canvas, which was lighter and cheaper than the wooden panels\" → tranh lớn hơn và dễ vận chuyển hơn." },
      { n: 32, q: 'What can be inferred about tempera paintings?', options: ['They were usually painted on wooden panels.', 'They were larger than most oil paintings.', 'They were mainly produced in Flanders.', 'They took several days to dry.'], a: 0, cue: 'the wooden panels used for tempera',
        explain: "Câu \"canvas, which was lighter and cheaper than the wooden panels used for tempera\" cho thấy tranh tempera thường vẽ trên tấm gỗ. Tempera khô trong vài phút, không phải vài ngày." },
    ])],
  });

  /* ===================================================================
   * BỘ 6 · LISTENING (tự biên soạn): 8 response, 3 hội thoại × 4, 3 thông báo × 3, 2 bài giảng (5 + 6) = 40 câu.
   * Đáp án đúng viết ở vị trí 0, được xoay ở cuối file.
   * =================================================================== */
  const RESP6 = [
    { s: 'A', t: "Are you going to the career fair on Thursday?",
      options: ["I'm planning to, if my lab finishes on time.", "The fair price was very reasonable.", "I went to Thursday's lecture.", "Careers in finance are popular."],
      explain: "Hỏi có đi hội chợ việc làm không → trả lời dự định kèm điều kiện: \"Mình định đi, nếu buổi thí nghiệm xong kịp\". \"fair price\" là bẫy đồng âm khác nghĩa (fair = công bằng)." },
    { s: 'B', t: "Where did you park your bike?",
      options: ["In the rack behind the gym.", "About fifteen minutes ago.", "I rode it to the park yesterday.", "It's a mountain bike."],
      explain: "Câu hỏi \"Where\" → địa điểm: \"Ở giá để xe sau phòng gym\". \"fifteen minutes ago\" trả lời \"When\"; \"the park\" là bẫy lặp âm \"park\"." },
    { s: 'A', t: "I can't find my notes from yesterday's seminar.",
      options: ["You can borrow mine if you like.", "The seminar starts tomorrow.", "I found it very interesting.", "Notes are usually written by hand."],
      explain: "Người nói không tìm thấy ghi chép → phản hồi giúp đỡ: \"Bạn mượn của mình nếu muốn\". \"I found it\" lặp từ \"find\" nhưng nói về buổi seminar." },
    { s: 'B', t: "Which textbook do we need for this course?",
      options: ["The professor said the third edition is fine.", "It costs about sixty dollars.", "I need to book a room.", "The course ends in May."],
      explain: "Câu hỏi \"Which textbook\" → xác định cuốn sách: \"Giáo sư nói bản thứ ba là được\". Giá tiền và thời gian không trả lời câu hỏi; \"book a room\" là bẫy từ \"book\"." },
    { s: 'A', t: "Would you mind closing the window? It's a bit cold.",
      options: ["Not at all – I was feeling cold too.", "Yes, it's a nice window.", "I mind my own business.", "The weather report said rain."],
      explain: "\"Would you mind…?\" là lời nhờ; đồng ý thì trả lời \"Not at all\" (không phiền gì). \"Yes\" ở đây lại mang nghĩa là phiền – sai; \"mind my own business\" là bẫy lặp từ." },
    { s: 'B', t: "How did your presentation go?",
      options: ["Better than I expected, actually.", "I went by subway.", "It's next Monday at ten.", "I presented it to the manager."],
      explain: "\"How did … go?\" hỏi kết quả → \"Tốt hơn mình nghĩ\". \"I went by subway\" bẫy từ \"go/went\" (phương tiện); \"next Monday\" trả lời \"When\"." },
    { s: 'A', t: "Isn't the deadline for the scholarship today?",
      options: ["No, they extended it until Friday.", "The scholarship is for science students.", "Yes, I read it yesterday.", "Dead plants should be removed."],
      explain: "Câu hỏi phủ định để kiểm tra thông tin → \"Không, họ đã gia hạn đến thứ Sáu\". \"Dead plants\" là bẫy âm gần giống \"deadline\"." },
    { s: 'B', t: "Let's take a short break before we continue.",
      options: ["Good idea – I could use some coffee.", "I broke my phone last week.", "The break-in happened at night.", "We continued until midnight."],
      explain: "Đề nghị nghỉ giải lao → đồng ý: \"Ý hay – mình đang cần chút cà phê\". \"broke\", \"break-in\" là bẫy biến thể của \"break\"." },
  ];
  const respScript6 = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
  RESP6.forEach((r, i) => { respScript6.push({ say: 'Number ' + (i + 1) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
  TF.listening.push({
    id: 'tf6-lr', set: 6, task: 'response', title: 'Choose a Response · Set 6',
    speakers: { A: { name: 'Speaker 1', accent: 'en-GB', gender: 'f' }, B: { name: 'Speaker 2', accent: 'en-US', gender: 'm' } },
    script: respScript6,
    groups: [mcq('Listen to each sentence and choose the best response.', RESP6.map((r, i) => ({ n: i + 1, q: 'Choose the best response to sentence ' + (i + 1) + '.', options: r.options, a: 0, cue: r.t, explain: r.explain })))],
  });

  TF.listening.push({
    id: 'tf6-lc1', set: 6, task: 'conversation', title: 'Choosing a Minor',
    speakers: { S: { name: 'Student (Jake)', accent: 'en-US', gender: 'm' }, A: { name: 'Academic adviser', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to a conversation between a student and an academic adviser.' }, { pause: 1 },
      { s: 'S', t: "Hi, Dr. Morales. I'm majoring in biology, and I have to choose a minor by the end of the month. I'm stuck between chemistry and computer science." },
      { s: 'A', t: "Both are good choices. What do you want to do after you graduate?" },
      { s: 'S', t: "I'm interested in genetics research. A lot of the job ads I've seen ask for experience analyzing large data sets." },
      { s: 'A', t: "Then computer science might be more useful than you think. Modern genetics depends heavily on programming. Chemistry would overlap a lot with the courses you're already taking for your major." },
      { s: 'S', t: "That's true. I've already done two chemistry courses. But I'm worried computer science will be too hard. I've never written any code." },
      { s: 'A', t: "Most students in the introductory course haven't, either. It's designed for beginners. And the department runs free tutoring sessions every evening if you get stuck." },
      { s: 'S', t: "OK, that's reassuring. Is there a deadline to sign up for the intro course?" },
      { s: 'A', t: "Registration closes this Friday, so I'd do it today if I were you." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 9, q: 'What is the student trying to decide?', options: ['Which minor to choose', 'Whether to change his major', 'Which job to apply for', 'Which professor to work with'], a: 0, cue: "I have to choose a minor by the end of the month",
        explain: "Jake nói \"I have to choose a minor by the end of the month\" và đang phân vân giữa hóa học và khoa học máy tính → chọn ngành phụ. Ngành chính sinh học giữ nguyên." },
      { n: 10, q: 'Why does the adviser recommend computer science?', options: ['It is important for modern genetics research.', 'It is easier than chemistry.', 'It has more job openings than biology.', 'It requires fewer courses.'], a: 0, cue: 'Modern genetics depends heavily on programming',
        explain: "\"Modern genetics depends heavily on programming\" – phù hợp mục tiêu nghiên cứu di truyền và yêu cầu phân tích dữ liệu lớn của Jake. Cố vấn không nói khoa học máy tính dễ hơn." },
      { n: 11, q: 'What is the student worried about?', options: ['He has no programming experience.', 'He failed a chemistry course.', 'The tutoring sessions are expensive.', 'The intro course is already full.'], a: 0, cue: "I've never written any code",
        explain: "\"I'm worried computer science will be too hard. I've never written any code\" → lo vì chưa từng lập trình. Buổi kèm học là miễn phí (free tutoring)." },
      { n: 12, q: 'What does the adviser suggest the student do?', options: ['Register for the course today', 'Wait until the end of the month', 'Talk to the chemistry department first', 'Attend a tutoring session before deciding'], a: 0, cue: "I'd do it today if I were you",
        explain: "Đăng ký đóng vào thứ Sáu nên cố vấn khuyên \"I'd do it today if I were you\" → đăng ký ngay hôm nay." },
    ])],
  });
  TF.listening.push({
    id: 'tf6-lc2', set: 6, task: 'conversation', title: 'Applying to Be a Resident Assistant',
    speakers: { S: { name: 'Student (Mia)', accent: 'en-GB', gender: 'f' }, C: { name: 'Housing coordinator', accent: 'en-US', gender: 'm' } },
    script: [
      { say: 'Listen to a conversation between a student and a housing coordinator.' }, { pause: 1 },
      { s: 'S', t: "Hi. I saw a poster saying you're looking for resident assistants for next year. Could you tell me a bit more about the job?" },
      { s: 'C', t: "Sure. RAs live in the residence halls and support a floor of about thirty students. You'd organize social events, help solve problems between roommates, and be on call some evenings in case of emergencies." },
      { s: 'S', t: "Is it paid?" },
      { s: 'C', t: "Not with a salary, but RAs get free accommodation for the year, which saves most students around nine thousand dollars." },
      { s: 'S', t: "That's a lot. I'm a bit worried about the time, though. I'm in the nursing program, and my schedule is pretty heavy." },
      { s: 'C', t: "That's a fair concern. RAs usually spend about fifteen hours a week on the role. Several of our current RAs are nursing students, and they manage, but you'd need to be organized." },
      { s: 'S', t: "How do I apply?" },
      { s: 'C', t: "Fill in the online form and ask one professor to write you a short reference. After that, there's a group interview in March, where we watch how applicants work with other people." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 13, q: 'Why does the student go to see the housing coordinator?', options: ['To find out about a job as a resident assistant', 'To complain about a problem with her roommate', 'To ask about a room for next year', 'To organize a social event'], a: 0, cue: "you're looking for resident assistants for next year",
        explain: "Mia thấy áp phích tuyển trợ lý ký túc xá và hỏi \"Could you tell me a bit more about the job?\" → tìm hiểu công việc RA." },
      { n: 14, q: 'How are resident assistants rewarded for their work?', options: ['They receive free accommodation.', 'They are paid a monthly salary.', 'They receive extra course credit.', 'They get free meals.'], a: 0, cue: 'RAs get free accommodation for the year',
        explain: "\"Not with a salary, but RAs get free accommodation for the year\" → được ở miễn phí, không nhận lương." },
      { n: 15, q: 'What does the coordinator say about nursing students?', options: ['Some current RAs study nursing and cope with the workload.', 'They are not allowed to become RAs.', 'They need to work fewer hours.', 'They usually live off campus.'], a: 0, cue: 'Several of our current RAs are nursing students, and they manage',
        explain: "\"Several of our current RAs are nursing students, and they manage, but you'd need to be organized\" → vẫn có sinh viên điều dưỡng làm được, miễn là biết sắp xếp." },
      { n: 16, q: 'What happens at the group interview?', options: ['Staff observe how applicants work with others.', 'Applicants take a written test.', 'Professors give their references.', 'Applicants choose their floor.'], a: 0, cue: 'we watch how applicants work with other people',
        explain: "Buổi phỏng vấn nhóm tháng Ba là nơi \"we watch how applicants work with other people\" → quan sát khả năng làm việc với người khác." },
    ])],
  });
  TF.listening.push({
    id: 'tf6-lc3', set: 6, task: 'conversation', title: 'A Problem with a Lab Partner',
    speakers: { S: { name: 'Student (Omar)', accent: 'en-US', gender: 'm' }, P: { name: 'Professor', accent: 'en-GB', gender: 'f' } },
    script: [
      { say: 'Listen to a conversation between a student and a professor.' }, { pause: 1 },
      { s: 'S', t: "Professor Clarke, can I talk to you about the physics lab? It's a bit awkward. My lab partner hasn't come to the last three sessions." },
      { s: 'P', t: "I see. Have you been able to contact him?" },
      { s: 'S', t: "I sent him a couple of messages, but he hasn't replied. I've been doing the experiments alone, and it's hard to take measurements and record them at the same time." },
      { s: 'P', t: "That's not fair on you. Let me check the attendance records… Yes, he's missed several lectures too. I'll get in touch with him through his academic adviser to make sure he's all right." },
      { s: 'S', t: "Thanks. What should I do about next week's experiment?" },
      { s: 'P', t: "There's a group of two in your section that could take a third person, so I'll move you there. And for the reports you completed alone, I'll take that into account when I grade them." },
      { s: 'S', t: "That would really help. Should I tell the other group?" },
      { s: 'P', t: "No, I'll email all three of you this afternoon so everyone's clear about the change." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 17, q: 'What problem does the student have?', options: ['His lab partner has stopped attending the sessions.', 'He does not understand the experiments.', 'He lost the results of an experiment.', 'His lab partner does most of the work.'], a: 0, cue: "My lab partner hasn't come to the last three sessions",
        explain: "\"My lab partner hasn't come to the last three sessions\" → bạn cùng nhóm vắng mặt nhiều buổi, Omar phải làm một mình." },
      { n: 18, q: 'Why does the professor plan to contact the student\'s academic adviser?', options: ['To make sure the missing student is all right', 'To give Omar a better grade', 'To change the lab schedule', 'To report Omar for missing lectures'], a: 0, cue: "to make sure he's all right",
        explain: "Giáo sư liên hệ qua cố vấn học tập \"to make sure he's all right\" → quan tâm sinh viên vắng mặt có ổn không." },
      { n: 19, q: 'What will happen in next week\'s experiment?', options: ['The student will join another group.', 'The student will work alone again.', 'The experiment will be cancelled.', 'The professor will help the student.'], a: 0, cue: "I'll move you there",
        explain: "Có một nhóm hai người có thể nhận thêm, nên \"I'll move you there\" → Omar chuyển sang nhóm khác." },
      { n: 20, q: 'What does the professor say about the reports Omar completed alone?', options: ['She will consider the situation when grading them.', 'He must rewrite them with his new group.', 'They will not be graded.', 'His partner must sign them.'], a: 0, cue: "I'll take that into account when I grade them",
        explain: "\"I'll take that into account when I grade them\" → khi chấm sẽ tính đến việc Omar phải làm một mình." },
    ])],
  });

  TF.listening.push({
    id: 'tf6-la1', set: 6, task: 'announcement', title: 'Textbook Buyback Week',
    speakers: { A: { name: 'Bookstore manager', accent: 'en-US', gender: 'm' } },
    script: [
      { say: 'Listen to an announcement from the campus bookstore.' }, { pause: 1 },
      { s: 'A', t: "Hello, students. Textbook buyback week starts next Monday at the campus bookstore. You can sell back textbooks you no longer need and receive up to half of the original price." },
      { s: 'A', t: "The amount we pay depends on the condition of the book and on whether it will be used in a course next semester. Books with a lot of highlighting or missing pages can't be accepted." },
      { s: 'A', t: "Please bring your student ID card. Payment will be added to your campus card instead of being given in cash, and it can be spent anywhere on campus." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 21, q: 'What is the purpose of the announcement?', options: ['To tell students they can sell back used textbooks', 'To announce a sale on new textbooks', 'To explain how to order books online', 'To remind students to return library books'], a: 0, cue: 'You can sell back textbooks you no longer need',
        explain: "Thông báo tuần thu mua lại sách: \"You can sell back textbooks you no longer need\" → sinh viên bán lại sách đã dùng." },
      { n: 22, q: 'Which book would NOT be accepted?', options: ['A book with missing pages', 'A book used in next semester\'s course', 'A book bought last year', 'A book with a student\'s name inside'], a: 0, cue: "Books with a lot of highlighting or missing pages can't be accepted",
        explain: "\"Books with a lot of highlighting or missing pages can't be accepted\" → sách thiếu trang không được nhận." },
      { n: 23, q: 'How will students receive their money?', options: ['It will be added to their campus card.', 'In cash at the bookstore', 'By bank transfer', 'As a discount on next semester\'s books only'], a: 0, cue: 'Payment will be added to your campus card instead of being given in cash',
        explain: "\"Payment will be added to your campus card instead of being given in cash\" → tiền được nạp vào thẻ sinh viên, dùng được mọi nơi trong trường." },
    ])],
  });
  TF.listening.push({
    id: 'tf6-la2', set: 6, task: 'announcement', title: 'New Library Printing System',
    speakers: { A: { name: 'Librarian', accent: 'en-GB', gender: 'f' } },
    script: [
      { say: 'Listen to an announcement in the university library.' }, { pause: 1 },
      { s: 'A', t: "Good afternoon. From next week, the library is introducing a new printing system. Instead of printing directly from the library computers, you'll send documents from any device, including your own laptop or phone, and then collect them at any printer by tapping your student card." },
      { s: 'A', t: "Documents you send will be stored for twenty-four hours. If they aren't collected by then, they'll be deleted, and you won't be charged." },
      { s: 'A', t: "Printing prices will stay the same. If you need help setting up your device, library staff will be at the information desk from ten to two every day next week." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 24, q: 'What is the main advantage of the new system?', options: ['Students can print from their own devices.', 'Printing will be cheaper.', 'Printing will be free for one week.', 'Students no longer need a student card.'], a: 0, cue: "you'll send documents from any device, including your own laptop or phone",
        explain: "Hệ thống mới cho phép \"send documents from any device, including your own laptop or phone\". Giá in giữ nguyên và vẫn phải chạm thẻ sinh viên." },
      { n: 25, q: 'What happens to documents that are not collected within 24 hours?', options: ['They are deleted without a charge.', 'They are printed automatically.', 'They are emailed back to the student.', 'The student is charged a fee.'], a: 0, cue: "they'll be deleted, and you won't be charged",
        explain: "Quá 24 giờ chưa lấy thì \"they'll be deleted, and you won't be charged\" → bị xóa, không tính tiền." },
      { n: 26, q: 'Where can students get help next week?', options: ['At the information desk', 'In the computer lab', 'By calling the IT office', 'At any printer'], a: 0, cue: 'library staff will be at the information desk',
        explain: "\"library staff will be at the information desk from ten to two every day next week\" → hỗ trợ tại quầy thông tin." },
    ])],
  });
  TF.listening.push({
    id: 'tf6-la3', set: 6, task: 'announcement', title: 'Changes to Gym Membership',
    speakers: { A: { name: 'Recreation center director', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to an announcement at the campus recreation center.' }, { pause: 1 },
      { s: 'A', t: "Attention, everyone. Starting in January, gym membership will be included in student fees, so all full-time students will be able to use the recreation center at no extra cost." },
      { s: 'A', t: "Students who have already paid for a spring membership will receive a full refund automatically – you don't need to apply for it. Part-time students and staff can still buy memberships at the front desk." },
      { s: 'A', t: "Because we expect the center to be much busier, fitness classes will now require online booking, and you can reserve a place up to three days in advance." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 27, q: 'What change is being announced?', options: ['Full-time students will no longer pay separately for the gym.', 'The recreation center will close in January.', 'Gym fees will increase for all students.', 'Staff will no longer be able to use the gym.'], a: 0, cue: 'gym membership will be included in student fees',
        explain: "\"gym membership will be included in student fees\" → sinh viên chính quy dùng phòng tập không phải trả thêm. Nhân viên vẫn mua thẻ được." },
      { n: 28, q: 'What should students who already paid for a spring membership do?', options: ['Nothing – their refund will be automatic.', 'Apply for a refund online', 'Visit the front desk', 'Exchange it for a fitness class'], a: 0, cue: "you don't need to apply for it",
        explain: "\"will receive a full refund automatically – you don't need to apply for it\" → không cần làm gì." },
      { n: 29, q: 'Why will fitness classes require online booking?', options: ['The center is expected to be busier.', 'Some classes have been cancelled.', 'The front desk will close.', 'Classes will now cost extra.'], a: 0, cue: 'we expect the center to be much busier',
        explain: "\"Because we expect the center to be much busier, fitness classes will now require online booking\" → dự kiến đông hơn." },
    ])],
  });

  TF.listening.push({
    id: 'tf6-lt1', set: 6, task: 'talk', title: 'Botany: How Plants Defend Themselves',
    speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to part of a lecture in a botany class.' }, { pause: 1 },
      { s: 'P', t: "Plants can't run away from animals that want to eat them, so they've developed other ways to protect themselves. Some defenses are physical. Thorns and spines are obvious examples, but many plants also have tiny hairs on their leaves that make it difficult for small insects to walk or feed." },
      { s: 'P', t: "Other defenses are chemical. Many plants produce substances that taste bitter or are poisonous. Caffeine, for instance, probably evolved partly because it is toxic to many insects. Interestingly, some plants only increase production of these chemicals after they've been attacked. That saves energy, because making defensive chemicals is expensive for the plant." },
      { s: 'P', t: "Perhaps the most surprising strategy is calling for help. When caterpillars chew the leaves of a corn plant, for example, the plant releases particular chemicals into the air. These signals attract small wasps that lay their eggs inside the caterpillars, and the wasp larvae eventually kill them. In other words, the plant recruits the enemy of its enemy." },
      { s: 'P', t: "Researchers are now looking at whether farmers could use these natural signals, for example by breeding crops that release stronger signals, so that they'd need fewer chemical pesticides." },
    ],
    groups: [mcq('Answer the questions about the lecture.', [
      { n: 30, q: 'What is the lecture mainly about?', options: ['Different ways plants protect themselves from being eaten', 'How insects choose which plants to eat', 'Why caffeine is popular with humans', 'How farmers breed new types of corn'], a: 0, cue: "they've developed other ways to protect themselves",
        explain: "Bài giảng trình bày các cách cây tự vệ: vật lý (gai, lông), hóa học (chất đắng, độc) và \"gọi trợ giúp\" → chủ đề là cơ chế tự vệ của thực vật." },
      { n: 31, q: 'Why does the professor mention tiny hairs on leaves?', options: ['As an example of a physical defense', 'To explain how plants absorb water', 'To show how plants attract wasps', 'As an example of a chemical defense'], a: 0, cue: 'tiny hairs on their leaves that make it difficult for small insects to walk or feed',
        explain: "Lông nhỏ trên lá được nêu sau \"Some defenses are physical\" → ví dụ cho tự vệ vật lý, khiến côn trùng khó bò và ăn." },
      { n: 32, q: 'Why do some plants produce defensive chemicals only after an attack?', options: ['Making these chemicals uses a lot of energy.', 'The chemicals lose their effect over time.', 'Insects cannot detect the chemicals before an attack.', 'The chemicals also harm the plant.'], a: 0, cue: 'making defensive chemicals is expensive for the plant',
        explain: "\"That saves energy, because making defensive chemicals is expensive for the plant\" → tiết kiệm năng lượng." },
      { n: 33, q: 'What happens when caterpillars chew the leaves of a corn plant?', options: ['The plant releases chemicals that attract wasps.', 'The plant grows more thorns.', 'The plant stops producing caffeine.', 'The caterpillars become poisonous.'], a: 0, cue: 'the plant releases particular chemicals into the air',
        explain: "Cây ngô \"releases particular chemicals into the air\", thu hút ong bắp cày nhỏ đẻ trứng vào sâu → cây \"gọi\" kẻ thù của kẻ thù." },
      { n: 34, q: 'What does the professor imply about the corn plant\'s strategy?', options: ['It uses another species to fight its attackers.', 'It works only against large animals.', 'It is too expensive for most plants.', 'It harms the wasps as well as the caterpillars.'], a: 0, cue: 'the plant recruits the enemy of its enemy',
        explain: "\"the plant recruits the enemy of its enemy\" → cây dùng một loài khác (ong bắp cày) để chống lại sâu ăn lá." },
    ])],
  });
  TF.listening.push({
    id: 'tf6-lt2', set: 6, task: 'talk', title: 'Psychology: The Bystander Effect',
    speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to part of a lecture in a psychology class.' }, { pause: 1 },
      { s: 'P', t: "Today we're looking at the bystander effect – the finding that people are often less likely to help someone in an emergency when other people are present. Research on this began in the 1960s with the psychologists John Darley and Bibb Latané." },
      { s: 'P', t: "Their interest was partly sparked by newspaper reports about a crime in New York, which claimed that dozens of neighbors had watched and done nothing. Later investigations found that those reports were greatly exaggerated, but the question they raised was a good one." },
      { s: 'P', t: "In one well-known experiment, students filled out questionnaires in a room when smoke began coming through a vent. When they were alone, most of them left to report the smoke within a few minutes. But when they were with two other people who had been told to ignore the smoke, only a small minority reported it." },
      { s: 'P', t: "Psychologists explain this in two ways. First, there's diffusion of responsibility: in a group, each person feels less personally responsible for acting. Second, there's social influence. In an unclear situation, we look at how others react, and if they seem calm, we assume nothing is wrong." },
      { s: 'P', t: "The good news is that knowing about the effect seems to reduce it. And if you ever need help in a crowd, experts suggest pointing to one specific person and asking them directly. That removes the uncertainty about who should act." },
    ],
    groups: [mcq('Answer the questions about the lecture.', [
      { n: 35, q: 'What is the bystander effect?', options: ['People are less likely to help when others are present.', 'People help more quickly in large groups.', 'People copy the behavior of strangers.', 'People exaggerate emergencies they have witnessed.'], a: 0, cue: 'people are often less likely to help someone in an emergency when other people are present',
        explain: "Định nghĩa trong bài: \"people are often less likely to help someone in an emergency when other people are present\"." },
      { n: 36, q: 'What does the professor say about the newspaper reports from New York?', options: ['They were later found to be exaggerated.', 'They were based on Darley and Latané\'s experiments.', 'They were completely accurate.', 'They were published after the research ended.'], a: 0, cue: 'those reports were greatly exaggerated',
        explain: "\"Later investigations found that those reports were greatly exaggerated\", dù câu hỏi chúng đặt ra vẫn có giá trị." },
      { n: 37, q: 'In the smoke experiment, what happened when participants were alone?', options: ['Most of them reported the smoke quickly.', 'Most of them ignored the smoke.', 'They waited for someone else to act.', 'They continued filling out the questionnaire.'], a: 0, cue: 'most of them left to report the smoke within a few minutes',
        explain: "Khi ở một mình, \"most of them left to report the smoke within a few minutes\"; còn khi ở cùng hai người được dặn phớt lờ thì chỉ số ít báo." },
      { n: 38, q: 'What is "diffusion of responsibility"?', options: ['Each person in a group feels less responsible for acting.', 'People copy the calm reactions of others.', 'People avoid helping strangers they do not trust.', 'Responsibility is given to the oldest person present.'], a: 0, cue: 'each person feels less personally responsible for acting',
        explain: "\"diffusion of responsibility: in a group, each person feels less personally responsible for acting\". Phương án \"copy the calm reactions\" là cơ chế thứ hai (social influence)." },
      { n: 39, q: 'Why does the professor mention people who "seem calm"?', options: ['To explain how social influence can stop people from acting', 'To show that calm people help more often', 'To describe the people who filled the room with smoke', 'To suggest that emergencies are rarely serious'], a: 0, cue: 'if they seem calm, we assume nothing is wrong',
        explain: "Trong tình huống không rõ ràng, ta nhìn phản ứng của người khác – \"if they seem calm, we assume nothing is wrong\" → minh họa ảnh hưởng xã hội khiến người ta không hành động." },
      { n: 40, q: 'What advice does the professor give for getting help in a crowd?', options: ['Ask one specific person directly.', 'Shout as loudly as possible.', 'Wait for the crowd to notice.', 'Call the people who seem calmest.'], a: 0, cue: 'pointing to one specific person and asking them directly',
        explain: "Chuyên gia khuyên \"pointing to one specific person and asking them directly\" để không ai còn băn khoăn ai phải hành động." },
    ])],
  });

  TF.writing.push({
    id: 'tf6-em7', set: 6, task: 'email', title: 'Asking to Audit a Class', minutes: 7,
    scenario: 'You are a business student, but you are very interested in a philosophy course, Ethics in Technology. Your schedule is already full, so you would like to attend the lectures without receiving credit (to "audit" the course).',
    to: 'Professor Nwosu, who teaches Ethics in Technology',
    points: ['Introduce yourself and explain your interest in the course.', 'Explain why you cannot take it for credit.', 'Ask whether you may audit it and what this would involve.'],
    model: "Dear Professor Nwosu,\n\nMy name is Lucas Ferreira, and I am a third-year business student. I am writing to ask whether I could audit your course, Ethics in Technology, this semester.\n\nI became interested in the subject during an internship last summer, when my team had to decide how much customer data an app should collect. I realized that I had no framework for thinking about questions like this, and your course description seems to cover exactly these issues.\n\nUnfortunately, I cannot take the course for credit because my schedule already includes five required business courses, which is the maximum allowed. However, your lectures on Tuesdays fit around my other classes.\n\nWould it be possible for me to attend the lectures as an auditor? I would be happy to do the readings and to sit quietly at the back if seminar places are limited. Please let me know if there is a form I need to complete.\n\nThank you for considering my request.\n\nSincerely,\nLucas Ferreira",
    mid: "Dear Professor,\n\nI want to join your ethics class but I can't take it for credit because I am too busy. Can I come to the lectures? I am very interested in technology and ethics.\n\nThank you,\nLucas",
    midNote: 'Bài trung bình đủ ba ý nhưng mỗi ý một câu: không giới thiệu ngành học, lý do quan tâm chung chung, "too busy" không giải thích được vì sao không đăng ký tín chỉ; không hỏi thủ tục "audit" gồm những gì. Bài mẫu có trải nghiệm cụ thể (thực tập), lý do rõ (đã tối đa 5 môn) và cam kết tham gia nghiêm túc.',
    outline: ['Giới thiệu + mục đích: xin dự thính (audit)', 'Lý do quan tâm gắn với trải nghiệm thực tập', 'Vì sao không đăng ký tín chỉ: đã tối đa số môn; giờ học vẫn phù hợp', 'Hỏi có được không, cần làm gì; cam kết; cảm ơn'],
    vocab: ['audit a course – dự thính một môn học', 'a framework for thinking about… – khung tư duy về…', 'which is the maximum allowed – mức tối đa được phép', 'fit around my other classes – xếp được cùng các lớp khác', 'Would it be possible for me to…? – em có thể … được không ạ?'],
    checklist: ['Giới thiệu bản thân và mục đích thư ngay đoạn đầu', 'Lý do quan tâm có trải nghiệm cụ thể', 'Giải thích rõ vì sao không học lấy tín chỉ', 'Câu hỏi lịch sự về việc dự thính và thủ tục', 'Giọng trang trọng với giáo sư; ký tên đầy đủ', 'Khoảng 120–180 từ'],
    tips: 'Khi xin một ngoại lệ, hãy cho người nhận thấy bạn đã tính đến công sức của họ ("sit quietly at the back if seminar places are limited").',
  });
  TF.writing.push({
    id: 'tf6-em8', set: 6, task: 'email', title: 'Organizing a Building Clean-Up Day', minutes: 7,
    scenario: 'You live in a small apartment building. The shared garden and bike storage area have become messy, and you would like to organize a clean-up day with your neighbors.',
    to: 'All residents of your building',
    points: ['Explain the problem and your idea.', 'Give details of the date, time and what people should bring.', 'Encourage people to take part.'],
    model: "Dear neighbors,\n\nI'm Hannah from Flat 4. Over the past few months, our shared garden and the bike storage area have become quite messy. There are old flower pots, broken bikes that nobody seems to use, and a lot of leaves blocking the path. I thought it might be nice to fix this together.\n\nI'd like to suggest a clean-up morning on Saturday, May 10, from 10 a.m. to 12 p.m. If you can, please bring gardening gloves and a broom. I'll provide rubbish bags and some coffee and snacks. If any of the bikes in storage belong to you, please put a name tag on them by May 8, so we know which ones can be donated.\n\nEven an hour of help would make a big difference, and it would be a great chance to get to know each other better. Please reply to this email or leave a note under my door if you can join.\n\nThanks, and I hope to see you there!\nHannah (Flat 4)",
    mid: "Hello everyone,\n\nThe garden is very dirty and there are many old bikes. We should clean it. Let's do it on Saturday morning. Please bring some tools.\n\nHannah",
    midNote: 'Bài trung bình nêu vấn đề nhưng mơ hồ ("very dirty", "some tools"); thiếu ngày giờ cụ thể; không có kế hoạch cho xe đạp cũ; không khuyến khích hàng xóm tham gia ngoài một câu ra lệnh "We should clean it". Bài mẫu có chi tiết rõ ràng, phân công đồ dùng, xử lý xe bỏ không và lời mời thân thiện.',
    outline: ['Giới thiệu bản thân + mô tả vấn đề cụ thể', 'Đề xuất: ngày, giờ, đồ cần mang, việc mình chuẩn bị, xử lý xe đạp cũ', 'Khuyến khích tham gia + cách phản hồi'],
    vocab: ['shared garden – vườn chung', 'I thought it might be nice to… – mình nghĩ sẽ thật hay nếu…', 'put a name tag on – gắn thẻ tên', 'make a big difference – tạo khác biệt lớn', 'get to know each other – làm quen với nhau'],
    checklist: ['Nêu vấn đề với chi tiết cụ thể', 'Ngày, giờ, đồ cần mang rõ ràng', 'Có kế hoạch cho các vấn đề cụ thể (xe đạp bỏ không)', 'Lời khuyến khích thân thiện, nêu lợi ích', 'Giọng thân thiện phù hợp hàng xóm', 'Khoảng 120–180 từ'],
    tips: 'Thư kêu gọi tham gia hiệu quả khi người đọc biết chính xác họ cần làm gì, lúc nào, mang theo gì.',
  });
  TF.writing.push({
    id: 'tf6-ad7', set: 6, task: 'discussion', title: 'Should Universities Require a Foreign Language?', minutes: 10,
    professor: { name: 'Dr. Haas', text: 'Some universities require all students, regardless of their major, to study a foreign language for at least one year. Others believe students should spend that time on courses related to their future careers. Should a foreign language be a requirement for all university students? Why or why not?' },
    students: [
      { name: 'Priya', text: 'Yes. Learning a language helps you understand another culture, and many employers value people who can work with international clients.' },
      { name: 'Tom', text: 'I don\'t think so. One year is not long enough to become useful in a language, and translation apps are getting better every year.' },
    ],
    model: "I believe a language requirement is valuable, but it should be designed differently from traditional grammar courses. Priya is right that studying a language opens a window into another culture, and even basic ability shows international clients respect. However, Tom makes a fair point that one year rarely produces real fluency, and translation apps can now handle simple conversations. The solution, in my view, is to focus the requirement on practical communication and cultural understanding rather than grammar tests. For example, students could take a course that combines basic conversation with lessons on how business and politeness differ across cultures. Such skills cannot be replaced by an app, because they involve understanding people, not just words. This approach would make the requirement useful for students of every major.",
    mid: "I agree with Priya that students should learn a foreign language. Languages are important in the modern world because of globalization. Tom says that translation apps are good, but apps make mistakes and they cannot understand culture. So I think universities should require a foreign language for all students.",
    midNote: 'Bài trung bình (khoảng 55 từ) đồng ý với Priya và phản biện Tom bằng một câu, nhưng bỏ qua ý chính của Tom (một năm quá ngắn); lý do "because of globalization" chung chung; không có ý mới. Bài mẫu thừa nhận hạn chế đó và đề xuất thiết kế lại môn học theo hướng giao tiếp và văn hóa – điều ứng dụng dịch không thay thế được.',
    outline: ['Quan điểm: nên bắt buộc nhưng thiết kế lại', 'Ủng hộ Priya: văn hóa, tôn trọng khách hàng quốc tế', 'Ghi nhận Tom: một năm không đủ trôi chảy, app dịch', 'Ý mới: môn học tập trung giao tiếp thực tế + khác biệt văn hóa + ví dụ', 'Câu kết'],
    vocab: ['regardless of – bất kể', 'opens a window into – mở ra cánh cửa tìm hiểu', 'real fluency – sự trôi chảy thực sự', 'cannot be replaced by – không thể bị thay thế bởi', 'cultural understanding – hiểu biết văn hóa'],
    checklist: ['Nêu quan điểm rõ ngay câu đầu', 'Phản hồi cả Priya và Tom', 'Đóng góp ý MỚI: thay đổi nội dung của môn bắt buộc', 'Có ví dụ cụ thể', 'Từ nối: However, For example, because', 'Tối thiểu khoảng 100 từ'],
    tips: 'Thay vì tranh luận "có hay không", hãy hỏi "nếu có thì nên làm thế nào" – câu hỏi đó thường dẫn tới ý mới.',
  });
  TF.writing.push({
    id: 'tf6-ad8', set: 6, task: 'discussion', title: 'Are Self-Driving Cars Good for Cities?', minutes: 10,
    professor: { name: 'Dr. Okoro', text: 'Several companies are testing self-driving taxis in large cities. Supporters say they could reduce accidents and traffic, while critics worry about safety, jobs and the cost to cities. Overall, do you think self-driving cars would be good for cities? Explain your view.' },
    students: [
      { name: 'Leah', text: 'I think they would be very good. Most accidents are caused by human mistakes like speeding or texting, and a computer never gets tired or distracted.' },
      { name: 'Marco', text: 'I am worried about jobs. Thousands of taxi and delivery drivers could lose their income, and cities would have to deal with the consequences.' },
    ],
    model: "I think self-driving cars could benefit cities, but only if they are introduced gradually and combined with good public transport. Leah is right that human error causes most accidents, so well-tested automated vehicles could save many lives. On the other hand, Marco's concern about drivers' jobs is serious, since a sudden change could leave many families without income. A gradual introduction, perhaps starting with routes at night or in specific zones, would give workers time to retrain for related jobs, such as maintaining vehicles or supervising fleets remotely. I would also add a point that neither of them mentioned: if self-driving taxis are cheap and convenient, people might use them instead of buses and trains, which could actually increase traffic. Therefore, cities should encourage shared rides and keep investing in public transport.",
    mid: "I agree with Leah. Self-driving cars are safer because computers don't make mistakes. Marco is worried about jobs, but technology always changes jobs and people can find new jobs. In the future all cars will be self-driving, so cities should prepare now.",
    midNote: 'Bài trung bình (khoảng 50 từ) khẳng định quá mức ("computers don\'t make mistakes", "all cars will be self-driving") và gạt ý của Marco đi bằng một câu khái quát; không có ý mới. Bài mẫu đồng ý có điều kiện, đề xuất triển khai dần để giải quyết vấn đề việc làm, và thêm một rủi ro mà cả hai bạn chưa nghĩ tới (tăng ùn tắc nếu thay thế giao thông công cộng).',
    outline: ['Quan điểm: có lợi nếu triển khai dần + kết hợp giao thông công cộng', 'Ủng hộ Leah: lỗi con người gây phần lớn tai nạn', 'Ghi nhận Marco: việc làm; giải pháp triển khai dần, đào tạo lại', 'Ý mới: nguy cơ tăng ùn tắc nếu người dân bỏ xe buýt/tàu', 'Kết: khuyến khích đi chung xe, đầu tư giao thông công cộng'],
    vocab: ['introduced gradually – được đưa vào dần dần', 'human error – lỗi con người', 'retrain for – được đào tạo lại cho', 'supervise fleets remotely – giám sát đội xe từ xa', 'a point that neither of them mentioned – một ý mà cả hai đều chưa nhắc'],
    checklist: ['Nêu quan điểm có điều kiện ngay câu đầu', 'Phản hồi cả Leah và Marco', 'Đóng góp ý MỚI: triển khai dần; rủi ro tăng ùn tắc', 'Có ví dụ/đề xuất cụ thể', 'Từ nối: On the other hand, since, Therefore', 'Tối thiểu khoảng 100 từ'],
    tips: 'Cụm "I would also add a point that neither of them mentioned" là cách tự nhiên để báo hiệu ý mới cho giám khảo.',
  });

  /* ===================================================================
   * BỘ 5 · READING (tự biên soạn): 2 Complete the Words × 10 ô + 2 Academic × 10 câu = 40 câu.
   * =================================================================== */
  TF.reading.push({
    id: 'tf5-cw1', set: 5, task: 'cw', title: 'Why the Sky Is Blue',
    instr: 'Fill in the missing letters in the paragraph.',
    text: "Sunlight looks white, but it is actually a mixture {o|f} all the colors of the rainbow. When {th|is} light enters the atmosphere, it hits {ti|ny} gas molecules in the air. These {mole|cules} scatter short wavelengths of light, such {a|s} blue, much more strongly than long wavelengths, {su|ch} as red. As a result, blue light {spr|eads} across the whole sky and reaches {o|ur} eyes from every direction. At sunset, sunlight {trav|els} through more of the atmosphere, so most of the blue is {scat|tered} away and the sky turns orange and red.",
    explain: [
      "\"a mixture of\" = hỗn hợp của; giới từ \"of\" sau \"mixture\".",
      "\"this light\" = ánh sáng này (ánh sáng mặt trời vừa nhắc); đại từ chỉ định số ít.",
      "Tính từ \"tiny\" (rất nhỏ) bổ nghĩa cho \"gas molecules\".",
      "\"These molecules\" lặp lại danh từ số nhiều ở câu trước làm chủ ngữ.",
      "\"such as\" = chẳng hạn như; cụm cố định.",
      "Cấu trúc song song \"such as blue … such as red\".",
      "Chủ ngữ số ít \"blue light\" + hiện tại đơn → \"spreads\" (lan ra).",
      "Tính từ sở hữu \"our eyes\" (mắt chúng ta).",
      "Chủ ngữ số ít \"sunlight\" → \"travels\" (đi qua).",
      "Bị động \"is scattered away\" (bị tán xạ đi mất) sau \"most of the blue is\"."
    ],
  });
  TF.reading.push({
    id: 'tf5-cw2', set: 5, task: 'cw', title: 'The First Maps',
    instr: 'Fill in the missing letters in the paragraph.',
    text: "People have drawn maps for thousands of years. Some {o|f} the earliest known maps were scratched {in|to} clay tablets or painted on walls. {Th|ese} early maps usually showed small areas, {su|ch} as fields, rivers or the streets {o|f} a town. Over time, travelers and {trad|ers} needed maps that covered much larger {regi|ons}. Mapmakers began to collect information {fr|om} sailors and explorers and to combine it {in|to} single images of the known world. Even {tod|ay}, every map is a simplified picture of a far more complex reality.",
    explain: [
      "\"Some of the earliest known maps\" = một số bản đồ sớm nhất; \"some of\" + danh từ xác định.",
      "\"scratched into clay tablets\" = khắc vào phiến đất sét; giới từ \"into\" chỉ chuyển động vào bề mặt.",
      "Đại từ chỉ định số nhiều \"These\" đi với \"early maps\".",
      "\"such as\" = chẳng hạn như, mở đầu danh sách ví dụ.",
      "\"the streets of a town\" = các con phố của một thị trấn.",
      "Danh từ số nhiều \"traders\" (thương nhân) song song với \"travelers\".",
      "Sau tính từ \"larger\" cần danh từ số nhiều \"regions\" (vùng).",
      "\"collect information from sailors\" = thu thập thông tin TỪ thủy thủ.",
      "\"combine it into single images\" = gộp lại THÀNH một hình ảnh; \"into\" chỉ kết quả biến đổi.",
      "\"Even today\" = ngay cả ngày nay."
    ],
  });
  TF.reading.push({
    id: 'tf5-ap1', set: 5, task: 'academic', title: 'The Long Journey of the Monarch Butterfly',
    paras: [
      "Every autumn, millions of monarch butterflies leave the northern United States and southern Canada and fly south. Many of the butterflies from eastern North America travel thousands of kilometers to a small number of mountain forests in central Mexico, where they spend the winter clustered together on fir trees. This migration is remarkable not only because of its distance but also because of the size of the travelers: a monarch weighs less than a gram.",
      "What makes the journey even more puzzling is that no single butterfly makes the complete round trip. The monarchs that fly south in autumn belong to a special generation that lives much longer than usual – up to eight or nine months, compared with a few weeks for summer butterflies. In spring, these long-lived butterflies begin the flight north, but they lay eggs and die along the way. Their offspring continue the journey, and it takes several generations to reach the northern breeding areas again.",
      "Because the butterflies that arrive in Mexico have never been there before, scientists have long wondered how they find their way. Research suggests that monarchs use the position of the sun as a compass. Since the sun moves across the sky during the day, the butterflies must also keep track of the time, and studies indicate that a clock in their antennae helps them adjust their direction. On cloudy days, they may rely on other cues, possibly including the Earth's magnetic field.",
      "The migration faces serious threats. The caterpillars of monarch butterflies feed only on milkweed plants, which have declined in many agricultural areas. Logging has damaged parts of the forests where the butterflies spend the winter, and extreme weather can kill large numbers of them. Counts of the area occupied by monarchs in Mexico have varied greatly from year to year but have generally been much lower in recent decades than in the 1990s.",
      "Conservation efforts now involve three countries. In Mexico, many of the wintering sites are protected, and local communities have been supported in developing tourism rather than cutting trees. In the United States and Canada, farmers, schools and home gardeners have been encouraged to plant milkweed and other flowering plants along the migration route. Scientists hope that these combined efforts will allow future generations of monarchs to continue one of the most extraordinary journeys in the natural world.",
    ],
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 61, q: 'According to paragraph 1, why is the monarch migration considered remarkable?', options: ['Because of the long distance and the small size of the butterflies', 'Because the butterflies fly only at night', 'Because the butterflies travel in a straight line', 'Because the migration happens twice a year'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"This migration is remarkable not only because of its distance but also because of the size of the travelers: a monarch weighs less than a gram\" → vì quãng đường dài và kích thước rất nhỏ." },
      { n: 62, q: 'The word "clustered" in paragraph 1 is closest in meaning to', options: ['grouped closely', 'hidden separately', 'flying quickly', 'resting alone'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"clustered together on fir trees\" = tụ lại sát nhau thành cụm → grouped closely. \"together\" là gợi ý trực tiếp." },
      { n: 63, q: 'According to paragraph 2, what is special about the generation that flies south in autumn?', options: ['It lives much longer than other generations.', 'It completes the full round trip.', 'It does not lay any eggs.', 'It is larger than other generations.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Thế hệ bay về phương nam \"lives much longer than usual – up to eight or nine months, compared with a few weeks for summer butterflies\". Đoạn 2 nói rõ \"no single butterfly makes the complete round trip\"." },
      { n: 64, q: 'What can be inferred from paragraph 2 about the butterflies that arrive in the north in summer?', options: ['They are descendants of the butterflies that wintered in Mexico.', 'They have already visited Mexico once.', 'They are the same butterflies that left in autumn.', 'They never lay eggs.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Bướm mùa xuân đẻ trứng rồi chết dọc đường, \"Their offspring continue the journey, and it takes several generations\" → bướm đến phương bắc là con cháu của đàn trú đông." },
      { n: 65, q: 'According to paragraph 3, why must monarchs keep track of the time?', options: ['Because the sun\'s position changes during the day', 'Because they fly only in the morning', 'Because they need to arrive before winter', 'Because they rest at the same time every day'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"Since the sun moves across the sky during the day, the butterflies must also keep track of the time\" → vị trí mặt trời thay đổi theo giờ nên phải biết giờ để giữ hướng." },
      { n: 66, q: 'The word "cues" in paragraph 3 is closest in meaning to', options: ['signals', 'dangers', 'partners', 'routes'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"rely on other cues, possibly including the Earth's magnetic field\" – từ trường là một loại tín hiệu định hướng → cues = signals." },
      { n: 67, q: 'Why does the author mention milkweed in paragraph 4?', options: ['To explain one reason why the migration is threatened', 'To describe what adult butterflies eat in Mexico', 'To show where monarchs spend the winter', 'To compare monarchs with other butterflies'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Sâu bướm \"feed only on milkweed plants, which have declined\" → đây là một trong các mối đe dọa được liệt kê ở đoạn 4." },
      { n: 68, q: 'According to paragraph 4, all of the following are threats to monarchs EXCEPT', options: ['competition with other butterfly species', 'the decline of milkweed', 'logging in wintering forests', 'extreme weather'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 4 nêu: milkweed giảm, khai thác gỗ (logging), thời tiết cực đoan. Cạnh tranh với loài bướm khác KHÔNG được nhắc tới." },
      { n: 69, q: 'According to paragraph 5, how have communities in Mexico been helped?', options: ['They have been supported in developing tourism instead of cutting trees.', 'They have been paid to plant milkweed.', 'They have been moved away from the forests.', 'They have been trained to count butterflies.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"local communities have been supported in developing tourism rather than cutting trees\". Trồng milkweed là việc ở Mỹ và Canada." },
      { n: 70, q: 'Which of the following best describes the organization of the passage?', options: ['It describes a migration, explains how it works, and discusses threats and conservation.', 'It compares two theories and rejects both.', 'It tells the history of research in chronological order.', 'It argues that the migration will soon end.'], a: 0, type: 'inference',
        explain: "Dạng ORGANIZATION. Đoạn 1 mô tả cuộc di cư, đoạn 2–3 giải thích cơ chế (nhiều thế hệ, định hướng), đoạn 4 nêu mối đe dọa, đoạn 5 nói về bảo tồn. Bài không khẳng định di cư sắp chấm dứt." },
    ])],
  });
  TF.reading.push({
    id: 'tf5-ap2', set: 5, task: 'academic', title: 'The Telegraph and the Shrinking World',
    paras: [
      "For most of human history, information could travel no faster than a person, a horse or a ship could carry it. A letter between Europe and North America might take weeks to arrive. In the nineteenth century, the electric telegraph changed this situation dramatically, making it possible to send messages across great distances almost instantly.",
      "Several inventors in different countries worked on electric telegraph systems in the 1830s. In the United States, Samuel Morse and his colleagues developed a system that sent pulses of electric current along a wire. These pulses were recorded as short and long signals, which represented letters according to a code that became known as Morse code. In 1844, Morse sent a famous message from Washington, D.C., to Baltimore, demonstrating that the system could work over a long distance.",
      "Telegraph lines spread rapidly along railways and roads. Railway companies used them to coordinate train movements, which improved safety, and newspapers used them to report events from distant cities on the same day. Businesses benefited as well: merchants could check prices in other markets before deciding where to buy or sell goods, which made trade more efficient.",
      "Connecting continents was far more difficult. The first cable laid across the floor of the Atlantic Ocean in 1858 carried messages for only a few weeks before it failed. Engineers learned from this failure, and in 1866 a stronger and better-insulated cable established a lasting connection between Britain and North America. Messages that had once taken about ten days by ship could now be delivered within minutes.",
      "Historians often describe the telegraph as an early form of the communication networks we rely on today. It changed expectations about how quickly news should arrive and how closely distant places could be connected. At the same time, sending messages was expensive, so they were usually short, and most ordinary people continued to rely on letters for personal communication well into the twentieth century.",
    ],
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 71, q: 'According to paragraph 1, what limited the speed of communication before the telegraph?', options: ['Messages could travel only as fast as people, animals or ships', 'Governments controlled the delivery of letters', 'Most people could not read', 'Paper was very expensive'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"information could travel no faster than a person, a horse or a ship could carry it\" → tốc độ bị giới hạn bởi người, ngựa, tàu." },
      { n: 72, q: 'The word "instantly" in paragraph 1 is closest in meaning to', options: ['immediately', 'cheaply', 'secretly', 'regularly'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"almost instantly\" đối lập với \"weeks\" ở câu trước → gần như ngay lập tức = immediately." },
      { n: 73, q: 'According to paragraph 2, how did Morse\'s system represent letters?', options: ['With combinations of short and long signals', 'With different colors of light', 'With printed symbols on paper rolls only', 'With sounds of different musical notes'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Xung điện \"were recorded as short and long signals, which represented letters according to a code\" → tổ hợp tín hiệu ngắn và dài." },
      { n: 74, q: 'Why does the author mention the 1844 message from Washington to Baltimore?', options: ['To show that the system worked over a long distance', 'To explain why Morse moved to Baltimore', 'To show that other inventors had failed', 'To describe the first telephone call'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Bức điện năm 1844 được nêu \"demonstrating that the system could work over a long distance\"." },
      { n: 75, q: 'According to paragraph 3, how did railway companies use the telegraph?', options: ['To coordinate train movements and improve safety', 'To sell tickets to passengers', 'To advertise new routes in newspapers', 'To pay their workers'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"Railway companies used them to coordinate train movements, which improved safety\"." },
      { n: 76, q: 'According to paragraph 3, all of the following benefited from the telegraph EXCEPT', options: ['farmers who sold goods only in their own village', 'railway companies', 'newspapers', 'merchants'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 3 nêu đường sắt, báo chí và thương nhân (merchants) được lợi. Nông dân chỉ bán trong làng KHÔNG được nhắc tới." },
      { n: 77, q: 'What can be inferred from paragraph 4 about the 1858 cable?', options: ['Its failure provided lessons for later engineers.', 'It was never used to send any messages.', 'It was stronger than the 1866 cable.', 'It connected Britain and North America permanently.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Cáp 1858 hỏng sau vài tuần, \"Engineers learned from this failure\" và cáp 1866 \"stronger and better-insulated\" → thất bại trở thành bài học. Cáp 1858 có gửi được tin trong vài tuần." },
      { n: 78, q: 'The word "lasting" in paragraph 4 is closest in meaning to', options: ['permanent', 'expensive', 'experimental', 'temporary'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"a lasting connection\" đối lập với cáp 1858 chỉ hoạt động vài tuần → lâu dài, bền vững = permanent." },
      { n: 79, q: 'According to paragraph 5, why did most people continue to use letters for personal communication?', options: ['Telegraph messages were expensive.', 'Telegraph lines did not reach cities.', 'Letters were faster than telegrams.', 'Telegrams could not include names.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"sending messages was expensive, so they were usually short, and most ordinary people continued to rely on letters\"." },
      { n: 80, q: 'Which of the following best states the main idea of the passage?', options: ['The telegraph greatly increased the speed of long-distance communication and changed society\'s expectations.', 'Samuel Morse was the only inventor of the telegraph.', 'The telegraph immediately replaced letters for everyone.', 'Underwater cables were easier to build than land lines.'], a: 0, type: 'inference',
        explain: "Dạng MAIN IDEA. Bài nói điện báo giúp gửi tin gần như tức thì, lan rộng, nối các châu lục và \"changed expectations about how quickly news should arrive\". Bài nói nhiều nhà phát minh cùng nghiên cứu, thư tay vẫn phổ biến, và cáp dưới biển khó hơn nhiều." },
    ])],
  });


  /* Xoay vị trí đáp án đúng (chỉ các unit của bộ 4–6) */
  const PAT = [2, 0, 3, 1, 1, 3, 0, 2, 3, 2, 1, 0];
  const counter = {};
  [...TF.reading, ...TF.listening].filter(u => /^tf[456]-/.test(u.id)).forEach(u => (u.groups || []).forEach(gr => {
    if (gr.type !== 'mcq' || gr._rot) return; gr._rot = 1;
    gr.items.forEach(it => {
      const k = counter[u.task] = (counter[u.task] || 0) + 1;
      const n = it.options.length, want = PAT[(k - 1) % PAT.length] % n, r = (it.a - want + n) % n;
      if (r) { it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want; }
    });
  }));
})(typeof self !== 'undefined' ? self : this);
