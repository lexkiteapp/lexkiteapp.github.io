/* TOEFL iBT (định dạng từ 21/01/2026) – Bộ luyện tập 1. Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
 * Cấu trúc: window.TOEFL = { reading: [...], listening: [...], writing: [...], speaking: [...] }
 *  - reading/listening: mỗi phần tử là 1 "unit" { id, task, title, text|script, groups (định dạng qengine) }.
 *    Trắc nghiệm được soạn với đáp án đúng ở vị trí 0, cuối file xoay vòng để A/B/C/D phân bố đều.
 *  - Complete the Words: text chứa {phần còn lại|phần bị xóa}; explain[] theo đúng thứ tự ô trống.
 *  - writing: task 'sentence' (items), 'email', 'discussion'; speaking: 'repeat', 'interview'. */
(function (g) {
  const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
  ['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });
  const mcq = (instr, items) => ({ type: 'mcq', instr, items });

  /* ===================================================================
   * READING · Complete the Words
   * =================================================================== */
  TF.reading.push({
    id: 'tf1-cw1', set: 1, task: 'cw', title: 'Desert Plants',
    instr: 'Fill in the missing letters in the paragraph.',
    text: 'Many desert plants survive long dry periods by storing water in their tissues. Cacti, {f|or} example, {ha|ve} thick stems {th|at} expand after {he|avy} rain and {shr|ink} slowly as {th|e} stored water {i|s} used. Their {spi|nes} are actually modified {lea|ves}, which lose {mu|ch} less moisture than broad, flat leaves would.',
    explain: [
      'for example = ví dụ; cụm cố định đứng sau dấu phẩy để đưa ra minh họa (Cacti).',
      'Chủ ngữ số nhiều "Cacti" (xương rồng) + động từ "have" (có) thân dày.',
      '"that" là đại từ quan hệ thay cho "thick stems", mở đầu mệnh đề "that expand…".',
      '"heavy rain" = mưa lớn; collocation quen thuộc, cần tính từ trước danh từ "rain".',
      '"expand … and shrink" = phình ra … và co lại; hai động từ trái nghĩa nối bằng "and".',
      'Mạo từ xác định "the" trước "stored water" vì đang nói đến lượng nước đã trữ cụ thể.',
      'Cấu trúc bị động hiện tại: "the stored water is used" (nước được sử dụng).',
      '"spines" = gai; ý đoạn: gai của xương rồng thực chất là lá biến đổi.',
      '"modified leaves" = lá biến đổi; số nhiều của "leaf" là "leaves", khớp với "which lose…".',
      '"much less" = ít hơn nhiều; "much" bổ nghĩa cho so sánh hơn "less moisture".',
    ],
  });
  TF.reading.push({
    id: 'tf1-cw2', set: 1, task: 'cw', title: 'Urban Heat Islands',
    instr: 'Fill in the missing letters in the paragraph.',
    text: 'Cities are often several degrees warmer than the countryside around them. This effect, {kn|own} as an urban heat island, {occ|urs} because concrete and asphalt {abs|orb} sunlight during the day {a|nd} release it slowly at {nig|ht}. Tall buildings {al|so} trap warm air, {wh|ile} the lack of trees {red|uces} natural cooling. Planting {gre|en} roofs is one {wa|y} to reduce the problem.',
    explain: [
      '"known as" = được gọi là; phân từ bị động rút gọn: "This effect, (which is) known as…".',
      'Chủ ngữ số ít "This effect" → động từ chia "occurs" (xảy ra).',
      '"absorb sunlight" = hấp thụ ánh nắng; đối lập với "release it" (tỏa ra) ở vế sau.',
      '"and" nối hai động từ cùng chủ ngữ: absorb … and release.',
      '"at night" = vào ban đêm; đối lập với "during the day".',
      '"also" = cũng; bổ sung thêm một nguyên nhân khác (nhà cao tầng giữ khí nóng).',
      '"while" = trong khi; nối hai mệnh đề song song nêu thêm nguyên nhân.',
      'Chủ ngữ "the lack of trees" (số ít) → "reduces" (làm giảm) khả năng làm mát tự nhiên.',
      '"green roofs" = mái nhà phủ cây xanh, một giải pháp giảm hiệu ứng đảo nhiệt.',
      '"one way to + V" = một cách để làm gì.',
    ],
  });

  /* ===================================================================
   * READING · Read in Daily Life (câu 1–10)
   * =================================================================== */
  TF.reading.push({
    id: 'tf1-dl1', set: 1, task: 'daily', title: 'Library Notice',
    text: 'HOLLIS LIBRARY – SUMMER HOURS\n\nFrom June 10 to August 25, the library will open at 9 a.m. and close at 6 p.m. on weekdays. Weekend hours are cancelled during this period because of floor renovations on Levels 2 and 3.\n\nThe group study rooms on Level 1 remain available, but they must now be reserved online at least 24 hours in advance. Laptops can still be borrowed from the front desk with a valid student ID.\n\nQuestions? Email circulation@hollislib.edu.',
    groups: [mcq('Read the notice and answer the questions.', [
      { n: 1, q: 'Why will the library be closed on weekends this summer?', options: ['Two floors are being renovated.', 'Fewer students are on campus.', 'The staff are on vacation.', 'The building is being moved.'], a: 0,
        explain: 'Thông báo nói rõ cuối tuần đóng cửa "because of floor renovations on Levels 2 and 3" – do sửa chữa tầng 2 và 3. Các lý do khác (ít sinh viên, nhân viên nghỉ) không được nhắc tới.' },
      { n: 2, q: 'What is new about the group study rooms?', options: ['They must be booked a day ahead.', 'They have moved to Level 2.', 'They are open only on weekends.', 'They now include laptops.'], a: 0,
        explain: '"must now be reserved online at least 24 hours in advance" = giờ phải đặt trước ít nhất 24 giờ, tức là trước một ngày. Phòng vẫn ở tầng 1, không phải tầng 2.' },
      { n: 3, q: 'What do students need in order to borrow a laptop?', options: ['A valid student ID', 'An online reservation', 'An email from circulation', 'A deposit at the front desk'], a: 0,
        explain: '"Laptops can still be borrowed from the front desk with a valid student ID" → chỉ cần thẻ sinh viên còn hiệu lực. Đặt chỗ trực tuyến là quy định cho phòng học nhóm.' },
    ])],
  });
  TF.reading.push({
    id: 'tf1-dl2', set: 1, task: 'daily', title: 'Email from Building Management',
    text: 'From: Marta Ruiz, Building Manager\nTo: All residents of Elm Court\nSubject: Water shut-off on Thursday\n\nDear residents,\n\nPlumbers will replace the main water valve this Thursday. Water will be turned off in all apartments from 10 a.m. until approximately 2 p.m. We recommend filling a few bottles the night before.\n\nThe laundry room will also be closed that day, but it will reopen on Friday morning. If you notice any leaks after the water is turned back on, please call the maintenance line rather than sending an email, so that we can respond quickly.\n\nThank you for your patience,\nMarta',
    groups: [mcq('Read the email and answer the questions.', [
      { n: 4, q: 'What is the main purpose of the email?', options: ['To inform residents about a temporary loss of water', 'To announce new laundry room hours', 'To ask residents to report leaks by email', 'To introduce a new building manager'], a: 0,
        explain: 'Tiêu đề và đoạn đầu cho biết nước sẽ bị ngắt từ 10 giờ đến khoảng 2 giờ chiều thứ Năm → mục đích là báo việc cắt nước tạm thời. Phòng giặt chỉ là chi tiết phụ.' },
      { n: 5, q: 'What does Marta suggest residents do?', options: ['Store some water in advance', 'Do their laundry on Thursday', 'Leave their apartments by 10 a.m.', 'Check their own water valves'], a: 0,
        explain: '"We recommend filling a few bottles the night before" = nên đổ sẵn vài chai nước từ tối hôm trước → trữ nước trước. Phòng giặt đóng cửa thứ Năm nên không thể giặt hôm đó.' },
      { n: 6, q: 'Why should residents call instead of emailing about leaks?', options: ['So that the problem is handled faster', 'Because the email system will be down', 'Because Marta will be away on Friday', 'So that the plumbers can be paid'], a: 0,
        explain: '"…call the maintenance line rather than sending an email, so that we can respond quickly" – gọi điện để được xử lý nhanh hơn. Thư không nhắc tới việc hệ thống email bị hỏng.' },
    ])],
  });
  TF.reading.push({
    id: 'tf1-dl3', set: 1, task: 'daily', title: 'Community Center Flyer',
    text: 'RIVERSIDE COMMUNITY CENTER\nBeginner Cooking: Meals Under 30 Minutes\n\nTuesdays, 6:30–8:00 p.m., starting March 4 (six weeks)\nFee: $60 for the full course ($45 for center members)\n\nLearn to prepare quick, healthy dinners using simple ingredients. All ingredients and equipment are provided – just bring a container to take your food home. Space is limited to 12 participants. Sign up at the reception desk or on our website.',
    groups: [mcq('Read the flyer and answer the questions.', [
      { n: 7, q: 'What are participants asked to bring?', options: ['A container for leftovers', 'Their own ingredients', 'A cooking knife', 'A membership card'], a: 0,
        explain: '"just bring a container to take your food home" = chỉ cần mang hộp đựng để mang đồ ăn về. Nguyên liệu và dụng cụ đã được cung cấp ("All ingredients and equipment are provided").' },
      { n: 8, q: 'What can be inferred about the course?', options: ['Members pay less than non-members.', 'It is designed for professional chefs.', 'It meets twice a week.', 'Anyone who arrives can join without registering.'], a: 0,
        explain: 'Phí $60, thành viên trung tâm chỉ $45 → thành viên trả ít hơn. Khóa học dành cho người mới (Beginner), học mỗi thứ Ba (một lần/tuần) và giới hạn 12 người nên phải đăng ký.' },
    ])],
  });
  TF.reading.push({
    id: 'tf1-dl4', set: 1, task: 'daily', title: 'Text Messages',
    text: 'Leo (4:12 p.m.): Hey, are you still driving to the conference tomorrow? My train got cancelled.\nNadia (4:15 p.m.): Yes! I\'m leaving at 7 sharp. I can pick you up at the corner of Pine and 5th.\nLeo (4:16 p.m.): That would be amazing. I\'ll pay for the parking.\nNadia (4:18 p.m.): Deal. Just don\'t be late – registration closes at 9.',
    groups: [mcq('Read the messages and answer the questions.', [
      { n: 9, q: 'Why does Leo contact Nadia?', options: ['He needs another way to get to the conference.', 'He wants to change the meeting place.', 'He forgot when registration closes.', 'He wants to borrow her car.'], a: 0,
        explain: '"My train got cancelled" (chuyến tàu bị hủy) và hỏi Nadia có lái xe đi hội nghị không → Leo cần phương tiện khác. Anh không mượn xe mà đi nhờ.' },
      { n: 10, q: 'What does Nadia mean when she writes "Deal"?', options: ['She accepts Leo\'s offer to pay for parking.', 'She thinks the price of parking is too high.', 'She wants to discuss the plan later.', 'She will register for Leo.'], a: 0,
        explain: '"Deal" là cách nói thân mật nghĩa là "đồng ý/chốt vậy", đáp lại lời Leo "I\'ll pay for the parking" → cô chấp nhận đề nghị trả tiền gửi xe.' },
    ])],
  });

  /* ===================================================================
   * READING · Read an Academic Passage (câu 1–20)
   * =================================================================== */
  TF.reading.push({
    id: 'tf1-ap1', set: 1, task: 'academic', title: 'How Honeybee Swarms Choose a Home',
    text: [
      'In late spring, a thriving honeybee colony often becomes too crowded for its nest. The colony solves this problem by dividing. The old queen leaves the nest together with roughly half of the workers – often more than ten thousand bees – while a newly raised queen stays behind with the rest. The departing group, known as a swarm, does not fly directly to a new home. Instead, it settles temporarily on a tree branch, where the bees hang together in a dense cluster. From this exposed position the swarm must quickly find a permanent cavity, because the bees carry only a few days\' worth of honey in their stomachs and cannot survive long without shelter.',
      'The task of finding a new home falls to a small minority of the swarm. A few hundred of the oldest and most experienced foragers become scouts. They leave the cluster and search the surrounding landscape, sometimes several kilometers away, for hollow trees, holes in walls, or other suitable spaces. When a scout finds a promising site, she inspects it carefully, walking around the interior for many minutes. Researchers who have built artificial nest boxes of different sizes have found that scouts strongly favor cavities with a volume of about forty liters, an entrance smaller than a few square centimeters, and an opening located well above the ground. Each of these features has a practical value: a cavity of that size can store enough honey for winter, a narrow entrance is easy to defend, and a high opening is less accessible to predators.',
      'After inspecting a site, a scout returns to the cluster and advertises it by performing a waggle dance on the surface of the swarm. The direction of the dance indicates the direction of the site relative to the sun, and the duration of the waggling indicates its distance. Crucially, the strength of the advertisement depends on the quality of the site. A scout that has found an excellent cavity dances enthusiastically and repeats her dance many times, while a scout that has found a mediocre site dances only briefly. Other scouts that watch the dances are recruited to visit the advertised sites, evaluate them independently, and then return to dance themselves if they agree that the site is good.',
      'Over several hours or days, this process produces a kind of competition among sites. Because good sites receive longer and more frequent dances, they attract more and more visiting scouts, while support for poorer sites gradually fades. Individual scouts also lose enthusiasm over time: each time a scout returns to dance for the same site, she performs fewer waggle runs, until she eventually stops. This built-in decay prevents the swarm from becoming locked into an early choice simply because it was discovered first. In addition, scouts supporting one site sometimes deliver brief "stop signals" – a short vibration accompanied by a head butt – to scouts dancing for a rival site, which speeds up the elimination of weaker options.',
      'Remarkably, the swarm does not wait until every scout agrees. The decision appears to be made at the nest site itself. When the number of scouts present at a single cavity at the same time reaches a threshold – roughly twenty to thirty bees – those scouts sense that a quorum has been reached. They then return to the cluster and begin producing a high-pitched piping sound, which signals the rest of the swarm to warm up their flight muscles. Within an hour, the entire swarm lifts off and flies to the chosen site, guided by the scouts that already know the way.',
      'Biologists find this system interesting not only because of what it reveals about insects but also because it resembles successful decision-making in human groups. No single bee compares all the options, and no leader directs the outcome. Instead, a large group reaches an accurate decision through independent evaluation, open sharing of information, and a fair method for combining many opinions. Some researchers have even suggested that committees and organizations could improve their own decisions by borrowing these principles, for example by encouraging members to investigate options independently before discussion begins.',
    ].join('\n\n'),
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 1, q: 'According to paragraph 1, why must a swarm find a new nest quickly?', options: ['The bees have only a limited supply of food.', 'The new queen will attack the swarm.', 'Tree branches cannot support the weight of the cluster.', 'Scouts lose their sense of direction after a few days.'], a: 0, type: 'factual',
        explain: 'Dạng FACTUAL (thông tin chi tiết). Đoạn 1: "the bees carry only a few days\' worth of honey in their stomachs" – ong chỉ mang theo lượng mật đủ vài ngày → nguồn thức ăn có hạn. Các phương án khác không được nêu.' },
      { n: 2, q: 'The word "exposed" in paragraph 1 is closest in meaning to', options: ['unprotected', 'temporary', 'crowded', 'elevated'], a: 0, type: 'vocab',
        explain: 'Dạng VOCABULARY. "exposed position" = vị trí không được che chắn (cành cây ngoài trời) → "unprotected". "temporary" (tạm thời) đúng với tình huống nhưng không phải nghĩa của từ.' },
      { n: 3, q: 'According to paragraph 2, which bees become scouts?', options: ['Older bees with foraging experience', 'Bees that are newly hatched', 'Bees chosen by the queen', 'Bees that guard the nest entrance'], a: 0, type: 'factual',
        explain: 'Dạng FACTUAL. "A few hundred of the oldest and most experienced foragers become scouts" – trinh sát là những ong kiếm ăn lớn tuổi, nhiều kinh nghiệm nhất.' },
      { n: 4, q: 'According to paragraph 2, all of the following are features that scouts prefer EXCEPT', options: ['a location close to flowers', 'a volume of about forty liters', 'a small entrance', 'an opening high above the ground'], a: 0, type: 'negative',
        explain: 'Dạng NEGATIVE FACTUAL (tìm ý KHÔNG được nhắc). Đoạn 2 liệt kê: thể tích ~40 lít, lối vào nhỏ, cửa ở cao. Việc "gần hoa" không hề được đề cập → đáp án.' },
      { n: 5, q: 'Why does the author mention "artificial nest boxes of different sizes" in paragraph 2?', options: ['To explain how scientists learned about scouts\' preferences', 'To suggest that bees prefer man-made nests', 'To show that scouts often choose the wrong site', 'To describe how beekeepers prevent swarming'], a: 0, type: 'purpose',
        explain: 'Dạng RHETORICAL PURPOSE (mục đích tu từ). Chi tiết hộp tổ nhân tạo được nêu để cho biết các nhà nghiên cứu đã phát hiện sở thích của ong trinh sát bằng cách nào ("have found that scouts strongly favor…").' },
      { n: 6, q: 'According to paragraph 3, how does a scout show that a site is of high quality?', options: ['By dancing longer and repeating the dance more often', 'By changing the direction of her dance', 'By flying directly to the site with other scouts', 'By waggling faster than other scouts'], a: 0, type: 'factual',
        explain: 'Dạng FACTUAL. "A scout that has found an excellent cavity dances enthusiastically and repeats her dance many times" → nhảy hăng hái và lặp lại nhiều lần. Hướng điệu nhảy chỉ cho biết phương hướng, không phải chất lượng.' },
      { n: 7, q: 'What can be inferred from paragraph 4 about the gradual decline in each scout\'s dancing?', options: ['It allows a better site found later to win support.', 'It is caused by the scouts becoming tired.', 'It makes the swarm choose the first site discovered.', 'It happens only to scouts supporting poor sites.'], a: 0, type: 'inference',
        explain: 'Dạng INFERENCE (suy luận). Tác giả viết sự suy giảm "prevents the swarm from becoming locked into an early choice simply because it was discovered first" → suy ra: một địa điểm tốt hơn tìm thấy muộn vẫn có thể giành ủng hộ. Đoạn văn nói "each scout" nên không chỉ xảy ra với địa điểm kém.' },
      { n: 8, q: 'The word "threshold" in paragraph 5 is closest in meaning to', options: ['minimum level', 'final decision', 'exact location', 'loud signal'], a: 0, type: 'vocab',
        explain: 'Dạng VOCABULARY. "reaches a threshold – roughly twenty to thirty bees" = đạt tới một ngưỡng, tức mức tối thiểu cần có → "minimum level".' },
      { n: 9, q: 'According to paragraph 5, what is the function of the piping sound?', options: ['To prepare the swarm for flight', 'To guide the swarm to the new site', 'To announce that a scout has found a site', 'To stop scouts from dancing for rival sites'], a: 0, type: 'factual',
        explain: 'Dạng FACTUAL. Tiếng "piping" báo hiệu cả đàn "warm up their flight muscles" – làm nóng cơ bay, tức là chuẩn bị bay. Việc dẫn đường là do các ong trinh sát biết đường; ngăn đối thủ là "stop signals" ở đoạn 4.' },
      { n: 10, q: 'What is the main purpose of paragraph 6?', options: ['To relate the swarm\'s method to decision-making in human groups', 'To argue that bees are more intelligent than humans', 'To describe a leader that controls the swarm', 'To criticize the way committees make decisions'], a: 0, type: 'purpose',
        explain: 'Dạng RHETORICAL PURPOSE. Đoạn 6 so sánh cách đàn ong quyết định với việc ra quyết định hiệu quả của nhóm người ("resembles successful decision-making in human groups"). Đoạn văn nhấn mạnh KHÔNG có thủ lĩnh và không chê trách các ủy ban.' },
    ])],
  });
  TF.reading.push({
    id: 'tf1-ap2', set: 1, task: 'academic', title: 'How Sand Dunes Move',
    text: [
      'Sand dunes are among the few landforms that visibly change position within a human lifetime. In some deserts, dunes advance tens of meters each year, burying roads, fields, and occasionally entire villages. Although a dune may look like a solid hill, it is better understood as a moving wave of sand grains, each of which is shifted repeatedly by the wind. To understand how a dune travels, it is necessary to look first at how individual grains move.',
      'Wind can transport sand in several ways, but the most important is a bouncing motion called saltation. When the wind reaches a certain speed near the ground, it lifts a grain briefly into the air. The grain is carried forward a short distance, usually rising no more than a meter, and then falls back to the surface. When it lands, it strikes other grains and may knock them into the air in turn, creating a chain reaction. Grains that are too heavy to be lifted are pushed or rolled along the surface by these impacts, a process called creep. Very fine particles, by contrast, may be lifted high into the atmosphere and carried hundreds of kilometers as dust, but these particles play little role in building dunes.',
      'A typical dune has two distinct sides. The side facing the wind, called the windward slope, rises gently, usually at an angle of less than fifteen degrees. Grains are carried up this slope by saltation and creep until they reach the crest, the highest point of the dune. Beyond the crest lies the steeper downwind side, known as the slip face. Here the wind is suddenly sheltered, so it loses speed and drops the sand it was carrying. Sand accumulates near the top of the slip face until the slope becomes too steep to remain stable – at roughly thirty-four degrees for dry sand. At that point, a small avalanche occurs, and sand slides down to the base of the slope.',
      'This cycle of erosion and deposition is what allows the dune to migrate. Sand is constantly removed from the windward slope and redeposited on the slip face, so the dune as a whole moves forward in the direction of the wind, even though no individual grain travels very far in a single step. One consequence is that small dunes generally move faster than large ones. Because a large dune contains much more sand, the wind must move far more material to shift it the same distance. In regions with strong winds, small dunes may therefore catch up with and merge into larger ones.',
      'Dunes take on different shapes depending on the supply of sand and the pattern of the wind. Where sand is scarce and the wind blows mainly from one direction, crescent-shaped dunes called barchans form, with their horns pointing downwind. Where sand is abundant, the barchans tend to join together into long, wavy ridges that lie at right angles to the wind. When winds blow from two different directions during different seasons, dunes may instead stretch out into long, straight lines parallel to the average wind direction. And in places where the wind direction changes frequently, sand may pile up into star-shaped dunes, which can be the tallest of all because the shifting winds keep the sand in one place.',
      'For people living near deserts, understanding dune movement has practical importance. Engineers have tried many methods to protect roads and railways, including building fences that make the wind drop its sand before it reaches the road and covering dunes with gravel or plants to keep grains from being lifted. Such methods can be effective, but they require constant maintenance, because the wind never stops supplying new sand. As a result, many planners now prefer to route new roads around the most active dune fields rather than attempt to hold the sand in place.',
    ].join('\n\n'),
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 11, q: 'In paragraph 1, why does the author mention roads, fields, and villages?', options: ['To show that moving dunes can affect human settlements', 'To list places where dunes usually form', 'To explain why dunes look like solid hills', 'To compare the size of dunes with man-made structures'], a: 0, type: 'purpose',
        explain: 'Dạng RHETORICAL PURPOSE. Các ví dụ đường sá, cánh đồng, làng mạc bị "burying" (vùi lấp) nhằm minh họa tác động của cồn cát di chuyển lên khu dân cư, nhấn mạnh tốc độ di chuyển đáng kể.' },
      { n: 12, q: 'According to paragraph 2, what happens when a saltating grain lands?', options: ['It can push other grains into the air.', 'It immediately stops moving.', 'It breaks into fine dust.', 'It rises higher than one meter.'], a: 0, type: 'factual',
        explain: 'Dạng FACTUAL. "When it lands, it strikes other grains and may knock them into the air in turn" – hạt rơi xuống va vào hạt khác và hất chúng lên, tạo phản ứng dây chuyền.' },
      { n: 13, q: 'According to paragraph 2, which of the following is true of very fine particles?', options: ['They contribute little to the formation of dunes.', 'They move mainly by creep.', 'They are too heavy to be lifted by the wind.', 'They form the crest of the dune.'], a: 0, type: 'factual',
        explain: 'Dạng FACTUAL. Câu cuối đoạn 2: hạt rất mịn bay xa như bụi "but these particles play little role in building dunes" → đóng góp rất ít vào việc tạo cồn cát. "Creep" là cách di chuyển của hạt quá nặng.' },
      { n: 14, q: 'The word "sheltered" in paragraph 3 is closest in meaning to', options: ['blocked', 'reversed', 'strengthened', 'cooled'], a: 0, type: 'vocab',
        explain: 'Dạng VOCABULARY. Ở sườn khuất gió, gió bị "sheltered" = bị che chắn/chặn lại nên mất tốc độ → "blocked". "strengthened" ngược nghĩa với ngữ cảnh "loses speed".' },
      { n: 15, q: 'According to paragraph 3, what causes an avalanche on the slip face?', options: ['The slope becomes steeper than it can remain.', 'The wind suddenly changes direction.', 'Wet sand becomes too heavy.', 'Grains roll up the windward slope.'], a: 0, type: 'factual',
        explain: 'Dạng FACTUAL. Cát tích tụ "until the slope becomes too steep to remain stable – at roughly thirty-four degrees" rồi xảy ra lở cát → do độ dốc vượt quá mức ổn định. Đoạn văn nói về cát khô, không phải cát ướt.' },
      { n: 16, q: 'Which of the following can be inferred from paragraph 4 about a large dune?', options: ['It requires stronger or longer winds to move the same distance as a small dune.', 'Its grains travel farther in each step than those of a small dune.', 'It never merges with other dunes.', 'It moves against the direction of the wind.'], a: 0, type: 'inference',
        explain: 'Dạng INFERENCE. Cồn lớn chứa nhiều cát hơn nên "the wind must move far more material to shift it the same distance" → suy ra cần gió mạnh hơn hoặc lâu hơn để dịch chuyển cùng quãng đường. Đoạn văn nói cồn nhỏ nhập vào cồn lớn, nên "never merges" sai.' },
      { n: 17, q: 'The word "abundant" in paragraph 5 is closest in meaning to', options: ['plentiful', 'coarse', 'moist', 'distant'], a: 0, type: 'vocab',
        explain: 'Dạng VOCABULARY. "abundant" đối lập với "scarce" (khan hiếm) ở câu trước → nghĩa là dồi dào, "plentiful".' },
      { n: 18, q: 'According to paragraph 5, all of the following influence the shape of a dune EXCEPT', options: ['the color of the sand', 'the amount of sand available', 'whether the wind comes from one or several directions', 'how often the wind direction changes'], a: 0, type: 'negative',
        explain: 'Dạng NEGATIVE FACTUAL. Hình dạng cồn phụ thuộc "the supply of sand and the pattern of the wind": lượng cát, gió một hay hai hướng, gió đổi hướng thường xuyên. Màu cát không được nhắc tới.' },
      { n: 19, q: 'According to paragraph 5, why can star dunes become very tall?', options: ['Changing winds keep the sand in the same place.', 'They form only where sand is scarce.', 'They lie at right angles to a single wind.', 'Their horns point in the downwind direction.'], a: 0, type: 'factual',
        explain: 'Dạng FACTUAL. Cồn hình sao có thể cao nhất "because the shifting winds keep the sand in one place" – gió đổi hướng liên tục giữ cát ở một chỗ. "Horns point downwind" là đặc điểm của barchan.' },
      { n: 20, q: 'What does paragraph 6 suggest about methods for holding dunes in place?', options: ['They work but are costly to maintain over time.', 'They have never been successful.', 'They are now required for all new roads.', 'They stop the wind from supplying new sand.'], a: 0, type: 'inference',
        explain: 'Dạng INFERENCE. "Such methods can be effective, but they require constant maintenance" – có hiệu quả nhưng phải bảo trì liên tục (tốn kém) → nhiều nhà quy hoạch chọn đi đường vòng. "never been successful" mâu thuẫn với "can be effective".' },
    ])],
  });

  /* ===================================================================
   * LISTENING · Listen and Choose a Response (câu 1–8)
   * =================================================================== */
  const RESP = [
    { s: 'A', t: 'Do you know if the bookstore is still selling the chemistry lab manual?',
      options: ['I think they sold out yesterday, but the library has a copy.', 'Chemistry was my favorite subject in high school.', 'Yes, I already returned my lab coat.', 'The lab is on the third floor.'],
      explain: 'Câu hỏi gián tiếp: hiệu sách còn bán sách hướng dẫn thí nghiệm không → trả lời đúng trọng tâm: đã bán hết hôm qua, nhưng thư viện có bản. Các phương án còn lại chỉ lặp từ "chemistry", "lab".' },
    { s: 'B', t: 'I can\'t believe the professor moved the exam to Monday.',
      options: ['At least we have the whole weekend to review.', 'Yes, he moved here from Canada.', 'The exam room holds about fifty people.', 'I\'ll believe it when I see the grade.'],
      explain: 'Câu cảm thán về việc dời lịch thi sang thứ Hai → phản hồi tự nhiên là nhìn mặt tích cực: có cả cuối tuần để ôn. "moved here from Canada" là bẫy lặp từ "moved" với nghĩa khác.' },
    { s: 'A', t: 'Would you mind if I borrowed your notes from Thursday\'s lecture?',
      options: ['Not at all – I\'ll email you a copy tonight.', 'Yes, the lecture started at nine.', 'I borrowed them from the library.', 'Thursday is usually my busiest day.'],
      explain: '"Would you mind if…?" – trả lời "Not at all" nghĩa là ĐỒNG Ý (không phiền). Trả lời "Yes" với câu này lại mang nghĩa phiền/từ chối, và phần sau cũng không liên quan.' },
    { s: 'B', t: 'Where should I go to get a replacement student ID card?',
      options: ['The registration office in Founders Hall handles that.', 'It costs about fifteen dollars.', 'You should replace the batteries.', 'I got mine during orientation week.'],
      explain: 'Câu hỏi "Where" (ở đâu) → cần nơi chốn: văn phòng đăng ký ở Founders Hall. Giá tiền trả lời "How much", "replace the batteries" là bẫy từ "replacement".' },
    { s: 'A', t: 'The shuttle bus is running twenty minutes late again.',
      options: ['Maybe we should just walk to campus.', 'It runs every Monday and Wednesday.', 'The bus driver was very friendly.', 'Twenty students signed up for it.'],
      explain: 'Câu thông báo sự cố (xe buýt trễ 20 phút) → phản hồi hợp lý là đề xuất giải pháp: đi bộ tới trường. Các phương án khác lặp "runs", "twenty" nhưng không phản hồi tình huống.' },
    { s: 'B', t: 'Have you decided which topic you\'re choosing for the research paper?',
      options: ['I\'m still deciding between two ideas.', 'The paper is due at the end of the term.', 'Yes, I printed it on recycled paper.', 'Research shows that sleep is important.'],
      explain: 'Câu hỏi đã chọn đề tài chưa → "vẫn đang phân vân giữa hai ý tưởng" trả lời trực tiếp. Hạn nộp bài không trả lời câu hỏi; "recycled paper" là bẫy nghĩa khác của "paper".' },
    { s: 'A', t: 'Why don\'t we meet at the café instead of the library?',
      options: ['Sure, it\'s easier to talk there.', 'Because the library closed early.', 'I\'d like a large coffee, please.', 'We met last semester, didn\'t we?'],
      explain: '"Why don\'t we…?" là lời ĐỀ NGHỊ, không hỏi lý do → đồng ý kèm lý do: ở quán cà phê dễ nói chuyện hơn. "Because…" là bẫy trả lời như câu hỏi Why thật.' },
    { s: 'B', t: 'How long did it take you to finish the online application?',
      options: ['About an hour, but the essay took longer.', 'You can apply online or in person.', 'It was a very long line.', 'I finished my degree last year.'],
      explain: '"How long" hỏi khoảng thời gian → "khoảng một giờ, nhưng bài luận mất lâu hơn". "a very long line" là bẫy lặp từ "long".' },
  ];
  const respScript = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
  RESP.forEach((r, i) => { respScript.push({ say: 'Number ' + (i + 1) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
  TF.listening.push({
    id: 'tf1-lr', set: 1, task: 'response', title: 'Choose a Response · Set 1',
    speakers: { A: { name: 'Speaker 1', accent: 'en-US', gender: 'f' }, B: { name: 'Speaker 2', accent: 'en-US', gender: 'm' } },
    script: respScript,
    groups: [mcq('Listen to each sentence and choose the best response.', RESP.map((r, i) => ({ n: i + 1, q: 'Choose the best response to sentence ' + (i + 1) + '.', options: r.options, a: 0, cue: r.t, explain: r.explain })))],
  });

  /* ===================================================================
   * LISTENING · Listen to a Conversation (câu 1–8)
   * =================================================================== */
  TF.listening.push({
    id: 'tf1-lc1', set: 1, task: 'conversation', title: 'At the Housing Office',
    speakers: { S: { name: 'Student (Ethan)', accent: 'en-US', gender: 'm' }, W: { name: 'Housing officer', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to a conversation between a student and a housing officer.' }, { pause: 1 },
      { s: 'S', t: 'Hi. I\'m hoping to change my dorm room for next semester. Is that possible?' },
      { s: 'W', t: 'It can be. Can I ask why you want to move?' },
      { s: 'S', t: 'Well, my room is right above the dining hall, and the delivery trucks arrive at five every morning. I haven\'t had a full night\'s sleep in weeks.' },
      { s: 'W', t: 'I see. That\'s actually a common complaint about that building. The good news is that room change requests open next Monday.' },
      { s: 'S', t: 'Do I have to come back here to apply?' },
      { s: 'W', t: 'No, it\'s all done through the housing portal. You\'ll list three buildings you\'d prefer, in order. Requests are processed on a first-come, first-served basis, so I\'d submit yours early on Monday.' },
      { s: 'S', t: 'Got it. Is there a fee for changing rooms?' },
      { s: 'W', t: 'There\'s a fifty-dollar processing fee, but it\'s waived if the reason is related to health. Lack of sleep could count, actually, if you bring a note from the campus health center.' },
      { s: 'S', t: 'Oh, I didn\'t know that. I have an appointment there on Friday anyway, so I\'ll ask about it.' },
      { s: 'W', t: 'Great. Just upload the note with your request.' },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 1, q: 'Why does the student want to change rooms?', options: ['Noise early in the morning keeps him from sleeping.', 'His room is too far from the dining hall.', 'He does not get along with his roommate.', 'His building is going to be renovated.'], a: 0, cue: 'delivery trucks arrive at five',
        explain: 'Sinh viên nói phòng ở ngay trên nhà ăn và "the delivery trucks arrive at five every morning… I haven\'t had a full night\'s sleep" → tiếng ồn sáng sớm làm mất ngủ. Phòng ở NGAY TRÊN nhà ăn chứ không xa.' },
      { n: 2, q: 'What does the officer advise the student to do?', options: ['Submit his request as early as possible on Monday', 'Return to the office on Monday to fill out a form', 'Choose only one preferred building', 'Wait until the end of the semester to apply'], a: 0, cue: 'first-come, first-served',
        explain: 'Yêu cầu được xử lý "first-come, first-served" (ai nộp trước xét trước) nên bà khuyên "submit yours early on Monday". Việc nộp làm qua cổng trực tuyến, không cần quay lại văn phòng, và phải chọn 3 tòa nhà.' },
      { n: 3, q: 'Under what condition will the fee not be charged?', options: ['If the move is for a health-related reason', 'If the student moves within the same building', 'If the request is made online', 'If the student pays before Monday'], a: 0, cue: 'waived if the reason is related to health',
        explain: '"it\'s waived if the reason is related to health" – phí 50 đô được miễn nếu lý do liên quan đến sức khỏe (cần giấy của trung tâm y tế).' },
      { n: 4, q: 'What will the student probably do on Friday?', options: ['Ask the health center for a supporting note', 'Pay the processing fee', 'Visit several dorm buildings', 'Meet the officer again'], a: 0, cue: 'appointment there on Friday',
        explain: 'Câu suy luận: sinh viên đã có lịch hẹn ở trung tâm y tế thứ Sáu và nói "I\'ll ask about it" → nhiều khả năng sẽ xin giấy xác nhận để được miễn phí.' },
    ])],
  });
  TF.listening.push({
    id: 'tf1-lc2', set: 1, task: 'conversation', title: 'Office Hours: A Lab Report',
    speakers: { S: { name: 'Student (Mia)', accent: 'en-GB', gender: 'f' }, P: { name: 'Professor Okafor', accent: 'en-US', gender: 'm' } },
    script: [
      { say: 'Listen to a conversation between a student and her biology professor.' }, { pause: 1 },
      { s: 'S', t: 'Professor Okafor, do you have a minute? It\'s about my lab report on plant growth.' },
      { s: 'P', t: 'Of course, Mia. Have a seat. What\'s the problem?' },
      { s: 'S', t: 'My results don\'t match what I expected. The plants that got more light actually grew less than the ones in partial shade. I\'m worried I did something wrong.' },
      { s: 'P', t: 'Unexpected results aren\'t necessarily wrong results. Did you keep the other conditions the same – water, temperature, soil?' },
      { s: 'S', t: 'I think so. Although, now that you mention it, the sunny shelf is right next to the heating vent.' },
      { s: 'P', t: 'Ah. That could be important. Extra heat can dry out the soil quickly, which might slow growth even with plenty of light.' },
      { s: 'S', t: 'So should I repeat the experiment?' },
      { s: 'P', t: 'There isn\'t time before the deadline. Instead, write up your results honestly and add a section discussing the heating vent as a possible source of error. Suggest how a future experiment could control for it.' },
      { s: 'S', t: 'I thought a report with unexpected results would get a low grade.' },
      { s: 'P', t: 'Not at all. What I\'m grading is your reasoning. A clear explanation of what might have gone wrong shows real scientific thinking.' },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 5, q: 'Why does the student go to see the professor?', options: ['She is concerned about unexpected experiment results.', 'She wants an extension on her deadline.', 'She needs permission to use a different lab.', 'She lost the data from her experiment.'], a: 0, cue: 'My results don\'t match',
        explain: 'Mia nói kết quả "don\'t match what I expected" và "I\'m worried I did something wrong" → lo lắng về kết quả bất ngờ. Cô không xin gia hạn hạn nộp.' },
      { n: 6, q: 'What does the professor suggest might explain the results?', options: ['Heat from a vent may have dried the soil.', 'The plants received too little water on purpose.', 'The shaded plants were a different species.', 'The light was measured incorrectly.'], a: 0, cue: 'heating vent',
        explain: 'Giáo sư nói "Extra heat can dry out the soil quickly, which might slow growth" – hơi nóng từ lỗ thông sưởi có thể làm đất khô, khiến cây chậm lớn.' },
      { n: 7, q: 'What does the professor tell the student to do?', options: ['Discuss the possible error in her report', 'Repeat the experiment next week', 'Remove the unexpected data', 'Change the topic of her report'], a: 0, cue: 'possible source of error',
        explain: 'Không đủ thời gian làm lại, nên giáo sư bảo viết trung thực và "add a section discussing the heating vent as a possible source of error" → thảo luận nguồn sai số trong báo cáo.' },
      { n: 8, q: 'What is the professor\'s attitude toward unexpected results?', options: ['They can show good scientific reasoning if explained well.', 'They usually mean the student was careless.', 'They should be avoided by repeating experiments.', 'They are less interesting than expected results.'], a: 0, cue: 'real scientific thinking',
        explain: 'Câu hỏi thái độ: "What I\'m grading is your reasoning… shows real scientific thinking" → kết quả bất ngờ vẫn có giá trị nếu được giải thích tốt.' },
    ])],
  });

  /* ===================================================================
   * LISTENING · Listen to an Announcement (câu 1–6)
   * =================================================================== */
  TF.listening.push({
    id: 'tf1-la1', set: 1, task: 'announcement', title: 'Career Fair Announcement',
    speakers: { A: { name: 'Announcer', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to an announcement on a university campus.' }, { pause: 1 },
      { s: 'A', t: 'Good morning, everyone. This is a reminder that the spring career fair takes place this Wednesday from ten to three in the Student Union ballroom.' },
      { s: 'A', t: 'More than sixty employers will attend, including several engineering firms that are hiring for summer internships.' },
      { s: 'A', t: 'Please note one change from previous years: you\'ll need to register on the career center website before the event. Registration is free, and it lets employers view your résumé in advance.' },
      { s: 'A', t: 'If you\'d like feedback on your résumé first, the career center is offering fifteen-minute drop-in reviews on Monday and Tuesday afternoons. No appointment is needed. We hope to see you there.' },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 1, q: 'What is the main purpose of the announcement?', options: ['To remind students about an upcoming career event', 'To announce new engineering courses', 'To explain how to apply for a campus job', 'To introduce a new career center director'], a: 0, cue: 'spring career fair',
        explain: 'Câu mở đầu: "This is a reminder that the spring career fair takes place this Wednesday" → nhắc sinh viên về hội chợ việc làm sắp diễn ra.' },
      { n: 2, q: 'What is different about the event this year?', options: ['Students must register online beforehand.', 'It will be held in a new location.', 'There is a fee to attend.', 'Only engineering firms will attend.'], a: 0, cue: 'one change from previous years',
        explain: '"one change from previous years: you\'ll need to register on the career center website before the event" – năm nay phải đăng ký trực tuyến trước. Đăng ký miễn phí, và có hơn 60 nhà tuyển dụng thuộc nhiều ngành.' },
      { n: 3, q: 'What can students do on Monday and Tuesday afternoons?', options: ['Get quick feedback on their résumés', 'Meet employers in the ballroom', 'Sign up for internship interviews', 'Book a long appointment with an advisor'], a: 0, cue: 'drop-in reviews',
        explain: 'Trung tâm hướng nghiệp có "fifteen-minute drop-in reviews" vào chiều thứ Hai và thứ Ba – góp ý nhanh cho CV, không cần hẹn trước.' },
    ])],
  });
  TF.listening.push({
    id: 'tf1-la2', set: 1, task: 'announcement', title: 'Field Trip Instructions',
    speakers: { A: { name: 'Instructor', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to an instructor talking to a geology class.' }, { pause: 1 },
      { s: 'A', t: 'Before we finish, a few details about Saturday\'s field trip to Granite Point.' },
      { s: 'A', t: 'The bus will leave from the parking lot behind the science building at seven thirty. Please don\'t be late – we need to reach the coast while the tide is low, or the rock layers we\'re studying will be under water.' },
      { s: 'A', t: 'Wear sturdy boots; the rocks are slippery. And bring a notebook rather than a laptop, since you\'ll be sketching the formations by hand.' },
      { s: 'A', t: 'Lunch isn\'t provided, but we\'ll stop at a small market on the way back. Your sketches will be due the following Thursday.' },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 4, q: 'Why is it important for students to arrive on time?', options: ['The site can only be studied at low tide.', 'The bus driver cannot wait.', 'The market closes early.', 'The trip has a strict time limit for safety reasons.'], a: 0, cue: 'tide is low',
        explain: 'Giảng viên giải thích phải tới bờ biển "while the tide is low, or the rock layers… will be under water" → chỉ quan sát được khi thủy triều thấp.' },
      { n: 5, q: 'Why are students asked to bring a notebook?', options: ['They will draw the rock formations by hand.', 'Laptops are not allowed on the bus.', 'They will take a written test.', 'The instructor will collect their notes.'], a: 0, cue: 'sketching the formations by hand',
        explain: '"bring a notebook rather than a laptop, since you\'ll be sketching the formations by hand" – sẽ vẽ phác các khối đá bằng tay.' },
      { n: 6, q: 'What does the instructor say about lunch?', options: ['Students will have a chance to buy food.', 'Lunch will be served on the bus.', 'Students should eat before leaving.', 'The department will pay for lunch.'], a: 0, cue: 'small market',
        explain: '"Lunch isn\'t provided, but we\'ll stop at a small market on the way back" → không phát đồ ăn nhưng sẽ dừng ở chợ nhỏ để mua.' },
    ])],
  });

  /* ===================================================================
   * LISTENING · Listen to an Academic Talk (câu 1–10)
   * =================================================================== */
  TF.listening.push({
    id: 'tf1-lt1', set: 1, task: 'talk', title: 'Psychology: The Spacing Effect',
    speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'f' } },
    script: [
      { say: 'Listen to part of a talk in a psychology class.' }, { pause: 1 },
      { s: 'P', t: 'Today I want to talk about something that every one of you can use right away: the spacing effect.' },
      { s: 'P', t: 'The spacing effect is the finding that we remember information better when our study sessions are spread out over time, rather than packed into one long session. So, three one-hour sessions on different days usually beat a single three-hour session the night before an exam – even though the total time is the same.' },
      { s: 'P', t: 'This was first described in the late nineteenth century, by a researcher who tested his own memory using lists of meaningless syllables. He found that he needed far fewer repetitions to relearn a list if his practice had been spread across several days.' },
      { s: 'P', t: 'Now, why does spacing work? One explanation is that when some time has passed, the memory has started to fade a little. Retrieving it then takes more effort, and that effort seems to strengthen the memory more than easy repetition does.' },
      { s: 'P', t: 'Interestingly, cramming often feels more effective. Right after a long session, the material seems very familiar, so students feel confident. But that familiarity fades quickly. In experiments, students who crammed often predicted they would do better than students who spaced their study – and then performed worse on a test a week later.' },
      { s: 'P', t: 'So my practical advice: review your notes briefly the day after each lecture, then again a few days later. It feels harder. That\'s the point.' },
    ],
    groups: [mcq('Answer the questions about the talk.', [
      { n: 1, q: 'What is the talk mainly about?', options: ['Why spreading study over time improves memory', 'How memory changes in old age', 'The history of nineteenth-century psychology', 'Different ways of taking lecture notes'], a: 0, cue: 'the spacing effect',
        explain: 'Câu hỏi ý chính: bài giảng tập trung vào "the spacing effect" – học rải đều theo thời gian giúp nhớ tốt hơn, kèm lịch sử, lý giải và lời khuyên.' },
      { n: 2, q: 'Why does the professor mention three one-hour sessions and a single three-hour session?', options: ['To show that the total study time is equal in both cases', 'To recommend studying for three hours a day', 'To explain how long a typical exam lasts', 'To compare two different subjects'], a: 0, cue: 'total time is the same',
        explain: 'Ví dụ dùng để làm rõ: cùng tổng thời gian ("even though the total time is the same"), cách học chia nhỏ vẫn hiệu quả hơn → nhấn mạnh yếu tố khoảng cách chứ không phải thời lượng.' },
      { n: 3, q: 'What did the early researcher use in his experiments?', options: ['Lists of syllables with no meaning', 'Groups of student volunteers', 'Pictures of everyday objects', 'Short stories in a foreign language'], a: 0, cue: 'meaningless syllables',
        explain: 'Nhà nghiên cứu tự kiểm tra trí nhớ "using lists of meaningless syllables" – danh sách âm tiết vô nghĩa, không dùng tình nguyện viên.' },
      { n: 4, q: 'According to the professor, why does spacing strengthen memory?', options: ['Recalling partly forgotten information requires extra effort.', 'The brain needs sleep to store new words.', 'Shorter sessions are less boring.', 'Students take better notes when they are rested.'], a: 0, cue: 'takes more effort',
        explain: 'Giáo sư giải thích: sau một thời gian ký ức hơi mờ đi, "Retrieving it then takes more effort, and that effort seems to strengthen the memory" → nỗ lực nhớ lại làm ký ức bền hơn.' },
      { n: 5, q: 'What does the professor imply about students who cram?', options: ['They tend to overestimate how well they will remember.', 'They usually study for less total time.', 'They perform better on tests a week later.', 'They are aware that cramming is ineffective.'], a: 0, cue: 'predicted they would do better',
        explain: 'Câu suy luận: học dồn "often feels more effective", sinh viên dự đoán sẽ làm tốt hơn nhưng kết quả sau một tuần lại kém → họ đánh giá quá cao khả năng ghi nhớ của mình.' },
    ])],
  });
  TF.listening.push({
    id: 'tf1-lt2', set: 1, task: 'talk', title: 'Astronomy: Why Mars Lost Its Water',
    speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'm' } },
    script: [
      { say: 'Listen to part of a talk in an astronomy class.' }, { pause: 1 },
      { s: 'P', t: 'Last week we looked at the evidence that Mars once had liquid water on its surface – dry river valleys, ancient lake beds, and minerals that only form in water. Today\'s question is: where did that water go?' },
      { s: 'P', t: 'The key factor is Mars\'s size. Mars is only about half the diameter of Earth, so its interior cooled much faster. As it cooled, the planet seems to have lost the global magnetic field that it probably had early in its history.' },
      { s: 'P', t: 'Why does that matter? A magnetic field acts like a shield against the solar wind – the stream of charged particles flowing out from the sun. Without that shield, the solar wind gradually stripped gas from the upper atmosphere and carried it off into space.' },
      { s: 'P', t: 'As the atmosphere became thinner, the air pressure dropped. And at very low pressure, liquid water can\'t remain stable on the surface. It either freezes or evaporates. So the remaining water ended up mostly as ice – in the polar caps and buried underground.' },
      { s: 'P', t: 'We actually have spacecraft measurements of gas escaping from Mars today. The rate is small, but over billions of years, it adds up. Now, some of the details are still debated – for instance, how much water simply soaked into the rocks. But the overall picture is fairly clear.' },
    ],
    groups: [mcq('Answer the questions about the talk.', [
      { n: 6, q: 'What is the main topic of the talk?', options: ['The processes that caused Mars to lose most of its surface water', 'Evidence that life once existed on Mars', 'How spacecraft land safely on Mars', 'The differences between Mars\'s two moons'], a: 0, cue: 'where did that water go',
        explain: 'Giáo sư đặt câu hỏi trung tâm "where did that water go?" và giải thích chuỗi nguyên nhân khiến sao Hỏa mất nước bề mặt.' },
      { n: 7, q: 'According to the professor, why did Mars lose its magnetic field?', options: ['Its interior cooled quickly because the planet is small.', 'It was struck by a large asteroid.', 'The solar wind became stronger over time.', 'Its polar caps grew too large.'], a: 0, cue: 'cooled much faster',
        explain: '"Mars is only about half the diameter of Earth, so its interior cooled much faster. As it cooled… lost the global magnetic field" → kích thước nhỏ khiến lõi nguội nhanh và mất từ trường.' },
      { n: 8, q: 'What role did the solar wind play?', options: ['It removed gas from the planet\'s atmosphere.', 'It heated the surface and melted the ice.', 'It created the river valleys on Mars.', 'It protected Mars from charged particles.'], a: 0, cue: 'stripped gas from the upper atmosphere',
        explain: 'Không có từ trường che chắn, gió Mặt Trời "stripped gas from the upper atmosphere and carried it off into space" – tước đi khí của tầng khí quyển. Chính TỪ TRƯỜNG mới là lá chắn.' },
      { n: 9, q: 'Why could liquid water no longer remain on the surface?', options: ['The air pressure became too low.', 'The planet moved farther from the sun.', 'The water was used up by living things.', 'The rocks became too hot.'], a: 0, cue: 'at very low pressure',
        explain: 'Khí quyển mỏng đi → áp suất giảm, và "at very low pressure, liquid water can\'t remain stable on the surface" → nước đóng băng hoặc bốc hơi.' },
      { n: 10, q: 'What does the professor imply when he says "it adds up"?', options: ['A slow process can have a large effect over a long time.', 'Scientists have calculated the exact amount of lost water.', 'The rate of gas loss is increasing rapidly.', 'The spacecraft measurements were incorrect.'], a: 0, cue: 'it adds up',
        explain: 'Câu hỏi hàm ý: tốc độ thoát khí "is small, but over billions of years, it adds up" – một quá trình chậm nhưng tích lũy qua thời gian rất dài sẽ tạo tác động lớn.' },
    ])],
  });

  /* ===================================================================
   * WRITING · Build a Sentence (câu 1–10)
   * chunks: các cụm từ theo ĐÚNG thứ tự; giao diện tự xáo trộn.
   * =================================================================== */
  TF.writing.push({
    id: 'tf1-bs', set: 1, task: 'sentence', title: 'Build a Sentence · Set 1',
    instr: 'Put the words in the correct order to make a grammatical response.',
    items: [
      { n: 1, prompt: 'I missed the meeting this morning.', chunks: ['do you', 'know', 'what', 'they', 'decided', 'about the budget'], end: '?', starter: 'Oh no!',
        explain: 'Câu hỏi lồng (embedded question): "Do you know + what + S + V". Trong mệnh đề lồng KHÔNG đảo trợ động từ: "what they decided", không phải "what did they decide".' },
      { n: 2, prompt: 'Have you finished the reading for Monday?', chunks: ['not yet', 'but', 'I', 'am planning', 'to finish it', 'tonight'], end: '.', alt: ['not yet but tonight I am planning to finish it'],
        explain: '"Not yet" trả lời câu hỏi hoàn thành; vế sau "but I am planning to finish it tonight" – "plan + to V", trạng từ thời gian "tonight" đứng cuối câu.' },
      { n: 3, prompt: 'Why is the lab closed today?', chunks: ['the equipment', 'is', 'being', 'repaired', 'by', 'a technician'], end: '.',
        explain: 'Bị động tiếp diễn hiện tại: "is being + V3" (đang được sửa). "by a technician" (bởi một kỹ thuật viên) đứng sau động từ bị động.' },
      { n: 4, prompt: 'Can you recommend a good place to study?', chunks: ['you should', 'try', 'the café', 'on the corner', 'because', 'it is', 'quieter'], end: '.', alt: ['because it is quieter you should try the café on the corner'],
        explain: 'Lời khuyên "You should + V" (bạn nên…). Cụm giới từ "on the corner" đứng ngay sau danh từ nó bổ nghĩa ("the café"); mệnh đề lý do "because it is quieter" đặt cuối câu.' },
      { n: 5, prompt: 'What did the professor say about the essay?', chunks: ['she', 'told us', 'to', 'focus on', 'one main argument'], end: '.',
        explain: 'Câu tường thuật mệnh lệnh: "tell + O + to V" (bảo ai làm gì) → "told us to focus on…".' },
      { n: 6, prompt: 'Are you going to the concert on Friday?', chunks: ['I would', 'go', 'if', 'I', 'did not have', 'to work'], end: '.', alt: ['if I did not have to work I would go'],
        explain: 'Câu điều kiện loại 2 (điều không có thật ở hiện tại): "I would + V if + S + V2/did not". "have to work" = phải đi làm.' },
      { n: 7, prompt: 'Where can I find the application form?', chunks: ['you', 'can', 'download it', 'from', 'the department', 'website'], end: '.', alt: ['from the department website you can download it'],
        explain: 'Trật tự cơ bản S + modal + V + O: "you can download it". "the department website" là danh từ ghép (website của khoa).' },
      { n: 8, prompt: 'How was your trip to the museum?', chunks: ['it was', 'much', 'more', 'interesting', 'than', 'I', 'expected'], end: '.',
        explain: '"much" nhấn mạnh so sánh hơn: "much more interesting than I expected" (thú vị hơn nhiều so với tôi nghĩ).' },
      { n: 9, prompt: 'Did you hear that Professor Lin is retiring?', chunks: ['I', 'wonder', 'who', 'will', 'teach', 'her course', 'next year'], end: '.',
        explain: '"I wonder + who + will + V" – câu hỏi lồng trong câu trần thuật, kết thúc bằng dấu chấm. "who" làm chủ ngữ nên đứng ngay trước "will teach".' },
      { n: 10, prompt: 'Should we take the bus or walk?', chunks: ['it', 'is', 'not', 'worth', 'waiting', 'for the bus'], end: '.',
        explain: 'Cấu trúc "be (not) worth + V-ing" (đáng/không đáng làm gì): "it is not worth waiting for the bus".' },
    ],
  });

  /* ===================================================================
   * WRITING · Write an Email
   * =================================================================== */
  TF.writing.push({
    id: 'tf1-em1', set: 1, task: 'email', title: 'A Problem with a Group Project', minutes: 7,
    scenario: 'You are working on a group project for your sociology class. One member of your group has not responded to messages for a week, and the presentation is in ten days.',
    to: 'Professor Hammond',
    points: ['Explain the situation.', 'Describe what your group has already done to solve the problem.', 'Ask for specific advice or a possible change.'],
    model: 'Dear Professor Hammond,\n\nI am writing about our group project for Sociology 210. One of our four members has not replied to any of our messages for the past week, and we have not seen him in class either. Since our presentation is in ten days, we are worried about completing his section on time.\n\nSo far, we have sent him two emails and a message in the class group chat, and we also asked his lab partner whether he was all right, but we have not received any news. To be safe, the other three of us have already divided his part of the research among ourselves.\n\nWould it be possible for our group to present as three members, or would you prefer that we wait until you have contacted him? We would also appreciate any advice on how the grading would work in this situation.\n\nThank you for your time.\n\nBest regards,\nLinh Tran',
    checklist: ['Lời chào và câu nêu mục đích ngay đoạn đầu', 'Có đủ cả 3 ý trong đề (tình huống – đã làm gì – đề nghị cụ thể)', 'Giọng văn lịch sự, trang trọng vừa phải với giảng viên', 'Dùng câu hỏi lịch sự: "Would it be possible…?", "I would appreciate…"', 'Có lời kết và ký tên', 'Khoảng 120–180 từ, không lỗi chính tả'],
    tips: 'Mỗi gạch đầu dòng của đề nên thành một đoạn ngắn. Giảng viên cần biết vấn đề, những gì bạn đã thử và điều bạn muốn họ làm – đừng chỉ phàn nàn.',
  });
  TF.writing.push({
    id: 'tf1-em2', set: 1, task: 'email', title: 'Feedback on a Campus Service', minutes: 7,
    scenario: 'Your university recently changed the opening hours of the campus fitness center. It now opens at 9 a.m. instead of 6 a.m., which is a problem for you and other students.',
    to: 'the Director of Campus Recreation, Ms. Patel',
    points: ['Explain why the new hours are a problem.', 'Describe how the change affects you and other students.', 'Suggest a solution.'],
    model: 'Dear Ms. Patel,\n\nI am a second-year engineering student, and I am writing about the new opening hours of the campus fitness center. Since the start of this month, the center has opened at 9 a.m. instead of 6 a.m.\n\nThis change is difficult for many students. My classes begin at 8 a.m. every day, and I work at the library in the evenings, so early morning was the only time I could exercise. Several classmates with similar schedules have told me they have also stopped going to the gym.\n\nI understand that the change may be related to staffing costs. If so, perhaps the center could open early on three days a week, or allow students to enter with their ID cards while only one staff member is on duty. I believe even a partial return to early hours would help many people.\n\nThank you for considering this suggestion.\n\nSincerely,\nMinh Nguyen',
    checklist: ['Nêu rõ bạn là ai và viết về vấn đề gì', 'Giải thích tác động bằng ví dụ cụ thể (lịch học, công việc…)', 'Đề xuất giải pháp khả thi, thể hiện sự thấu hiểu', 'Giọng điệu lịch sự, mang tính xây dựng', 'Có lời kết phù hợp ("Thank you for considering…")', 'Khoảng 120–180 từ'],
    tips: 'Thư góp ý hiệu quả khi thể hiện bạn hiểu lý do của nhà trường ("I understand that…") rồi mới đưa đề xuất – người đọc dễ chấp nhận hơn.',
  });

  /* ===================================================================
   * WRITING · Write for an Academic Discussion
   * =================================================================== */
  TF.writing.push({
    id: 'tf1-ad1', set: 1, task: 'discussion', title: 'Should Universities Require Internships?', minutes: 10,
    professor: { name: 'Dr. Alvarez', text: 'This week we are discussing the transition from university to work. Some universities now require every student to complete an internship before graduating. Supporters say this prepares students for real jobs; critics say it takes time away from academic study and may be unfair to students who must work for pay. What do you think: should internships be a graduation requirement? Why or why not?' },
    students: [
      { name: 'Kenji', text: 'I think they should be required. In my internship last summer, I learned more about teamwork and deadlines than in any course. Many students would never apply for one unless they had to.' },
      { name: 'Sara', text: 'I disagree. Many internships are unpaid, so students from low-income families cannot afford them. Making them compulsory would give an advantage to students who already have money.' },
    ],
    model: 'Both Kenji and Sara make valid points, but I believe universities should require internships only if they also make them accessible to everyone. Sara is right that unpaid positions exclude students who need to earn money. However, simply removing the requirement would mean that many students graduate with no workplace experience at all. A better solution would be for universities to count paid part-time jobs or on-campus research positions as internships, and to offer small grants for students who take unpaid placements. For example, a student working at a local accounting firm on weekends is already learning the professional skills Kenji describes. In this way, the requirement could prepare all students for work without favoring the wealthy.',
    checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Nhắc đến ý của ít nhất một bạn (Kenji/Sara) và phản hồi', 'Đưa ra ý MỚI, không chỉ nhắc lại ý của bạn khác', 'Có ví dụ hoặc lý do cụ thể', 'Tối thiểu khoảng 100 từ, câu đa dạng', 'Câu kết tóm lại lập trường'],
    tips: 'Bài thảo luận học thuật được đánh giá cao khi bạn ĐÓNG GÓP thêm (ví dụ: một giải pháp dung hòa) chứ không chỉ đồng ý với một bạn. Dùng cụm "Kenji is right that…, but…", "A better solution would be…".',
  });
  TF.writing.push({
    id: 'tf1-ad2', set: 1, task: 'discussion', title: 'Protecting Endangered Species', minutes: 10,
    professor: { name: 'Professor Chen', text: 'In our environmental policy unit, we have seen that governments have limited budgets for conservation. Some experts argue that money should go to protecting a few well-known animals, such as tigers or pandas, because they attract public support. Others argue that funds should protect entire habitats, including less famous species like insects and plants. Which approach do you think is more effective, and why?' },
    students: [
      { name: 'Amira', text: 'Focusing on famous animals makes sense. People donate when they see a panda, not a beetle. That money can then be used to protect the forest where the panda lives anyway.' },
      { name: 'Lucas', text: 'I prefer protecting whole habitats. Ecosystems depend on small species like pollinating insects. If they disappear, even the famous animals will not survive in the long run.' },
    ],
    model: 'I agree with Lucas that protecting entire habitats should be the main goal, but I think Amira\'s point about public support is too important to ignore. The most effective strategy is to use famous animals as the "face" of a campaign while spending the money on the whole ecosystem. For instance, a campaign to save tigers can also fund the protection of rivers and grasslands that hundreds of other species depend on. This approach has two advantages. First, it raises far more money than a campaign about insects or soil quality would. Second, it ensures that the funds actually address the root problem, which is habitat loss. In my view, combining the two ideas is better than choosing between them.',
    checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Phản hồi ý của Amira hoặc Lucas', 'Đưa ra lập luận/ý mới (ví dụ: kết hợp hai cách)', 'Có ví dụ minh họa cụ thể', 'Dùng từ nối: First, Second, For instance, In my view', 'Tối thiểu khoảng 100 từ'],
    tips: 'Khi hai bạn đưa ra hai lập trường đối lập, một chiến lược an toàn là chọn một bên nhưng thừa nhận điểm hợp lý của bên kia, rồi bổ sung lý do riêng của bạn.',
  });

  /* ===================================================================
   * SPEAKING · Listen and Repeat
   * =================================================================== */
  TF.speaking.push({
    id: 'tf1-rp1', set: 1, task: 'repeat', title: 'Campus Tour Guide', accent: 'en-US',
    context: 'You are training to be a student tour guide. Listen to the trainer and repeat exactly what you hear.',
    sentences: [
      { t: 'Welcome to the campus.', tip: 'Câu ngắn – chú ý nối âm "Welcome to" và nhấn "CAMpus".' },
      { t: 'The tour will take about an hour.', tip: 'Nối âm "take about an hour" → /teɪkəbaʊtənaʊər/; chữ "h" trong "hour" câm.' },
      { t: 'On your left is the main library.', tip: 'Nhấn "LEFT" và "MAIN LIbrary"; đọc "library" đủ 3 âm tiết /ˈlaɪbreri/.' },
      { t: 'Students can borrow up to twenty books at a time.', tip: 'Cụm "up to twenty" đọc liền; "at a time" nối âm thành /ætəˈtaɪm/.' },
      { t: 'The science building was completed in two thousand eighteen.', tip: 'Đọc số năm: "two thousand eighteen"; nhấn "eighTEEN" để không nhầm với "eighty".' },
      { t: 'Please stay with the group while we walk through the gardens.', tip: 'Câu dài – chia nhịp: "Please stay with the group / while we walk / through the gardens".' },
      { t: 'If you have any questions, feel free to ask me at the end of the tour.', tip: 'Ngữ điệu đi lên ở "questions," rồi xuống ở cuối câu; "feel free to" đọc nhẹ, nhanh.' },
    ],
  });
  TF.speaking.push({
    id: 'tf1-rp2', set: 1, task: 'repeat', title: 'Science Museum Volunteer', accent: 'en-GB',
    context: 'You are volunteering at a science museum. Listen to the coordinator and repeat exactly what you hear.',
    sentences: [
      { t: 'Thank you for helping today.', tip: 'Âm /θ/ trong "Thank" – đặt đầu lưỡi giữa hai răng.' },
      { t: 'The museum opens at ten.', tip: 'Nối "opens at" → /ˈəʊpənzət/; âm cuối /z/ trong "opens".' },
      { t: 'Visitors should leave their bags in the lockers.', tip: 'Phân biệt "leave" /iː/ (dài) với "live"; âm cuối /z/ trong "bags", "lockers".' },
      { t: 'The dinosaur exhibit is on the second floor.', tip: 'Nhấn "DInosaur" và "exHIBit"; "second floor" nhấn "SECond".' },
      { t: 'Children must be accompanied by an adult at all times.', tip: 'Bị động "must be accompanied"; "at all times" nối âm /ətɔːl/.' },
      { t: 'Please remind guests that photography is allowed, but flash is not.', tip: 'Nhấn tương phản "ALLOWED" và "NOT"; "photography" nhấn âm thứ hai: /fəˈtɒɡrəfi/.' },
      { t: 'If anyone feels unwell, contact the information desk immediately.', tip: 'Câu dài – ngắt sau "unwell"; "immediately" /ɪˈmiːdiətli/ nhấn âm thứ hai.' },
    ],
  });

  /* ===================================================================
   * SPEAKING · Take an Interview
   * =================================================================== */
  TF.speaking.push({
    id: 'tf1-iv1', set: 1, task: 'interview', title: 'Study Habits Survey', seconds: 45, accent: 'en-US',
    context: 'A researcher is interviewing students about how they study. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'To start, could you tell me where you usually study, and why you like studying there?',
        model: 'I usually study in a small café near my apartment. It\'s quieter than the library in the evenings, and having a little background noise actually helps me concentrate. Also, I can get a coffee when I start feeling tired, so I can stay focused for longer.',
        tip: 'Trả lời thẳng câu hỏi ở câu đầu, rồi thêm 2 lý do. Câu hỏi mở đầu thường đơn giản – đừng trả lời quá ngắn.' },
      { q: 'Do you prefer to study alone or with other people? Please explain.',
        model: 'I generally prefer studying alone, because I can work at my own pace and I don\'t get distracted by conversations. That said, before a big exam I like to meet one or two classmates to quiz each other, since explaining ideas out loud shows me what I don\'t understand yet.',
        tip: 'Nêu lựa chọn + lý do, rồi thêm một ngoại lệ ("That said, …") để câu trả lời sâu hơn.' },
      { q: 'Some people say that technology, such as phones and laptops, makes it harder for students to concentrate. Do you agree?',
        model: 'Partly, yes. Notifications on my phone definitely interrupt me if I leave it on the desk. But technology also helps – I use apps to organize my notes and practice vocabulary. So I think the problem is how we use technology, not the technology itself. Personally, I put my phone in another room when I need to focus.',
        tip: 'Câu hỏi quan điểm: có thể đồng ý một phần, đưa ví dụ cá nhân, rồi kết bằng nhận định chung.' },
      { q: 'Finally, if your university could offer one new service to help students study more effectively, what should it be?',
        model: 'I think the university should offer free study-skills workshops in the first semester. Many new students don\'t know how to plan their time or take good notes, and they only learn through bad grades. A short workshop on these skills could save students a lot of stress and help them succeed earlier.',
        tip: 'Đề xuất một ý cụ thể, giải thích vấn đề nó giải quyết và lợi ích. Dùng "I think … should …", "This could …".' },
    ],
  });
  TF.speaking.push({
    id: 'tf1-iv2', set: 1, task: 'interview', title: 'Community and City Life', seconds: 45, accent: 'en-GB',
    context: 'A city planner is interviewing residents about life in their community. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'How do you usually get around your city, and are you happy with it?',
        model: 'I usually get around by motorbike because it\'s fast and convenient, especially in heavy traffic. However, I\'m not completely happy with it, since the air pollution is quite bad during rush hour. If public transport were more reliable, I would use it more often.',
        tip: 'Trả lời cả hai vế của câu hỏi (cách đi lại + có hài lòng không). Câu điều kiện loại 2 giúp ghi điểm ngữ pháp.' },
      { q: 'What is one place in your community that you think people should visit, and why?',
        model: 'I\'d recommend the old riverside market. It has been there for more than fifty years, and you can try local dishes that are hard to find anywhere else. It\'s also a great place to see everyday life, because local families shop there every morning.',
        tip: 'Gọi tên địa điểm, rồi đưa 2 lý do cụ thể. Chi tiết (năm, món ăn, con người) làm câu trả lời sinh động.' },
      { q: 'Some people think cities should create more parks, even if it means building fewer apartments. What is your opinion?',
        model: 'I think parks should be a priority, but not at any cost. Green spaces improve people\'s health and give children somewhere to play. However, if housing becomes too expensive, many young people will have to move away. So the city should build taller apartment buildings with parks between them, instead of choosing only one option.',
        tip: 'Với câu hỏi hai mặt, nêu lợi ích của một bên, thừa nhận rủi ro, rồi đề xuất giải pháp dung hòa.' },
      { q: 'How do you think your community will change over the next ten years?',
        model: 'I expect my community to become much more crowded, because many new offices are opening nearby. That will probably bring more jobs and better shops, but also more traffic. I hope the city will build a metro line before that happens, so people won\'t have to depend on cars and motorbikes.',
        tip: 'Câu hỏi dự đoán: dùng "will probably", "I expect … to …", "I hope …". Nêu cả mặt tích cực và tiêu cực.' },
    ],
  });

  /* ===================================================================
   * Xoay vị trí đáp án đúng: dữ liệu soạn với a = 0, xoay theo mẫu cố định
   * cho từng dạng bài → A/B/C/D phân bố đều. Chấm theo chỉ số nên luôn đúng.
   * =================================================================== */
  const PAT = [2, 0, 3, 1, 1, 3, 0, 2, 3, 2, 1, 0];
  const counter = {};
  [...TF.reading, ...TF.listening].forEach(u => (u.groups || []).forEach(gr => {
    if (gr.type !== 'mcq' || gr._rot) return; gr._rot = 1;
    gr.items.forEach(it => {
      const k = counter[u.task] = (counter[u.task] || 0) + 1;
      const n = it.options.length, want = PAT[(k - 1) % PAT.length] % n, r = (it.a - want + n) % n;
      if (r) { it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want; }
    });
  }));
})(typeof self !== 'undefined' ? self : this);
