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
