/* TOEFL iBT (định dạng từ 21/01/2026) – Bộ luyện tập 2. Nội dung 100% tự biên soạn, không dùng tài liệu của ETS.
 * Nạp SAU data1.js: chỉ BỔ SUNG vào window.TOEFL (không ghi đè), cùng định dạng với data1.
 *  - Mỗi dạng bài hiển thị mọi unit trên cùng một trang (reading/listening/Build a Sentence), nên số câu `n`
 *    nối tiếp bộ 1 (vd. Daily Life 11–20, Academic 21–40…) để tên ô chọn (radio "q{n}") không trùng.
 *  - Email/Discussion/Repeat/Interview: hiện thành thẻ "Bộ 3", "Bộ 4" (chọn qua ?i=).
 *  - Trắc nghiệm soạn với đáp án đúng ở vị trí 0, cuối file xoay vòng (chỉ các unit tf2-) để A/B/C/D phân bố đều. */
(function (g) {
  const TF = g.TOEFL = g.TOEFL || { reading: [], listening: [], writing: [], speaking: [] };
  ['reading', 'listening', 'writing', 'speaking'].forEach(k => { if (!TF[k]) TF[k] = []; });
  const mcq = (instr, items) => ({ type: 'mcq', instr, items });

  /* ===================================================================
   * READING · Complete the Words
   * =================================================================== */
  TF.reading.push({
    id: 'tf2-cw1', set: 2, task: 'cw', title: 'How Migrating Birds Navigate',
    instr: 'Fill in the missing letters in the paragraph.',
    text: "Every autumn, millions of birds fly thousands of kilometers to warmer regions. Scientists {bel|ieve} that they use several clues {t|o} find their way. Many species {fo|llow} the position of the sun {du|ring} the day, while others {us|e} the stars at night. Some birds {ca|n} even sense the earth's magnetic {fi|eld}. Young birds often learn {th|e} route by travelling {wi|th} older, {exper|ienced} members of the flock.",
    explain: [
      "\"believe that\" = tin rằng; chủ ngữ số nhiều \"Scientists\" nên động từ giữ nguyên \"believe\".",
      "\"use … to find\" = dùng … để tìm; \"to + V\" chỉ mục đích.",
      "Chủ ngữ \"Many species\" (số nhiều) + \"follow\" (đi theo, dựa vào) vị trí mặt trời.",
      "\"during the day\" = suốt ban ngày; đối lập với \"at night\" ở vế sau.",
      "\"others use the stars\" – \"others\" là số nhiều nên dùng \"use\" (không thêm -s).",
      "Động từ khuyết thiếu \"can\" + V nguyên mẫu \"sense\" (có thể cảm nhận).",
      "\"magnetic field\" = từ trường; collocation cố định trong khoa học.",
      "Mạo từ \"the\" trước \"route\" vì là tuyến đường di cư cụ thể của loài đó.",
      "\"travelling with\" = bay cùng với; giới từ \"with\" chỉ sự đi kèm.",
      "\"experienced\" = giàu kinh nghiệm; tính từ đứng trước danh từ \"members\", đối lập với \"Young birds\".",
    ],
  });
  TF.reading.push({
    id: 'tf2-cw2', set: 2, task: 'cw', title: 'The Spread of Papermaking',
    instr: 'Fill in the missing letters in the paragraph.',
    text: "Paper was first produced in China about two thousand years ago. Early papermakers {bo|iled} plant fibers in water, {pre|ssed} the mixture into thin sheets, {a|nd} left them to dry. For {cent|uries}, the technique was kept {sec|ret}. It slowly spread {wes|t} along trade routes and {rea|ched} Europe much later. Paper {wa|s} cheaper than animal skin, {s|o} books became easier to {pro|duce}.",
    explain: [
      "Thì quá khứ đơn \"boiled\" (đun sôi), cùng dạng với \"pressed\" và \"left\" trong chuỗi hành động.",
      "\"pressed the mixture into thin sheets\" = ép hỗn hợp thành tấm mỏng; động từ quá khứ có quy tắc.",
      "\"and\" nối hành động cuối cùng trong chuỗi liệt kê: boiled…, pressed…, and left….",
      "\"For centuries\" = trong nhiều thế kỷ; danh từ số nhiều sau \"For\" chỉ khoảng thời gian dài.",
      "\"kept secret\" = được giữ bí mật; cấu trúc \"keep + O + adj\" ở dạng bị động.",
      "\"spread west\" = lan về phía tây; \"west\" là trạng từ chỉ hướng.",
      "\"reached Europe\" = đến được châu Âu; quá khứ đơn, nối với \"spread\" bằng \"and\".",
      "Chủ ngữ số ít \"Paper\" + \"was\" (quá khứ của to be).",
      "\"so\" = vì vậy; nối nguyên nhân (giấy rẻ hơn) với kết quả (sách dễ làm hơn).",
      "\"easier to produce\" = dễ sản xuất hơn; cấu trúc \"adj + to V\".",
    ],
  });

  /* ===================================================================
   * READING · Read in Daily Life (câu 11–20, nối tiếp bộ 1)
   * =================================================================== */
  TF.reading.push({
    id: 'tf2-dl1', set: 2, task: 'daily', title: 'Bike Share Notice',
    text: "METRO BIKE SHARE – NEW STUDENT PLAN\n\nStarting September 1, students can buy an annual pass for $30 instead of the regular price of $50. To qualify, register with your university email address.\n\nWith the student pass, the first 45 minutes of every ride are free. After that, an extra $2 is charged for each additional 30 minutes.\n\nPlease note: the docking station outside the Engineering Building has been moved to the corner of Clark Street until construction on the building's entrance is finished.",
    groups: [mcq('Read the notice and answer the questions.', [
      { n: 11, q: 'How can students get the lower price for the annual pass?', options: ['By registering with a university email address', 'By buying the pass before September 1', 'By using the Clark Street station', 'By riding less than 45 minutes a day'], a: 0,
        explain: "\"To qualify, register with your university email address\" – muốn được giá $30 phải đăng ký bằng email của trường. Thông báo không nói phải mua trước ngày 1/9; đó là ngày bắt đầu áp dụng." },
      { n: 12, q: 'Why has one docking station been moved?', options: ['Work is being done on a building entrance.', 'Too many bikes were parked there.', 'Clark Street is closer to campus.', 'The station was damaged in an accident.'], a: 0,
        explain: "Trạm được dời \"until construction on the building's entrance is finished\" → do đang thi công lối vào tòa nhà Kỹ thuật. Các lý do khác không được nhắc tới." },
      { n: 13, q: 'What can be inferred about a student who rides for 40 minutes?', options: ['The student will not pay any extra charge.', 'The student will pay an extra $2.', 'The student must return the bike to Clark Street.', 'The student needs to buy a regular pass.'], a: 0,
        explain: "Câu suy luận: với vé sinh viên, \"the first 45 minutes of every ride are free\". Chuyến 40 phút nằm trong 45 phút miễn phí → không mất thêm tiền. Phí $2 chỉ tính sau 45 phút." },
    ])],
  });
  TF.reading.push({
    id: 'tf2-dl2', set: 2, task: 'daily', title: 'Email about a Guest Lecture',
    text: "From: Department of Marine Science\nTo: All Marine Science students\nSubject: Guest lecture – change of day and room\n\nDear students,\n\nDr. Imani Ross's lecture on plastic pollution in the ocean has been moved from Tuesday to Thursday at 4 p.m. Because far more people registered than we expected, the talk will now take place in the Main Auditorium instead of Room 104.\n\nFor Marine Science majors, attending the lecture counts as one of the three seminar credits required each year. Please bring your student card so that it can be scanned at the door. Unfortunately, Dr. Ross has asked that the lecture not be recorded, so this will be the only chance to hear it.\n\nBest wishes,\nAnna Kowalski, Department Coordinator",
    groups: [mcq('Read the email and answer the questions.', [
      { n: 14, q: 'What is the main purpose of the email?', options: ['To announce a new time and place for a lecture', 'To invite students to register for a seminar', 'To introduce a new faculty member', 'To explain the rules for earning seminar credits'], a: 0,
        explain: "Tiêu đề \"change of day and room\" và đoạn đầu cho biết buổi giảng dời sang thứ Năm, chuyển sang Hội trường chính → mục đích là thông báo thời gian và địa điểm mới. Tín chỉ seminar chỉ là thông tin phụ." },
      { n: 15, q: 'Why was the lecture moved to the Main Auditorium?', options: ['More people signed up than had been expected.', 'Room 104 is being repaired.', 'Dr. Ross requested a larger screen.', 'The lecture will be recorded there.'], a: 0,
        explain: "\"Because far more people registered than we expected\" – số người đăng ký nhiều hơn dự kiến nên cần phòng lớn hơn. Bài giảng KHÔNG được ghi hình." },
      { n: 16, q: 'What is true about the lecture?', options: ['It will not be available to watch later.', 'Only Marine Science majors may attend.', 'Students must pay at the door.', 'It replaces all three seminar credits.'], a: 0,
        explain: "\"Dr. Ross has asked that the lecture not be recorded, so this will be the only chance to hear it\" → không thể xem lại sau. Buổi giảng chỉ tính là MỘT trong ba tín chỉ seminar, và thẻ sinh viên được quét để điểm danh, không phải trả tiền." },
    ])],
  });
  TF.reading.push({
    id: 'tf2-dl3', set: 2, task: 'daily', title: 'Campus Market Flyer',
    text: "FRIDAY FARMERS' MARKET ON THE QUAD\n\nEvery Friday, 11 a.m.–3 p.m., from September to November\nFresh fruit and vegetables, bread, honey, and flowers from local farms. Cash and cards accepted.\n\nSave money and reduce waste: bring your own shopping bag and receive 10% off your purchase at any stall.\n\nVolunteers wanted! Help set up tables from 9:30 to 11:00 a.m. and receive a free lunch voucher for the campus café. Contact the Student Sustainability Office to sign up.",
    groups: [mcq('Read the flyer and answer the questions.', [
      { n: 17, q: 'How can shoppers get a discount at the market?', options: ['By bringing a bag from home', 'By paying in cash', 'By arriving before 11 a.m.', 'By buying from more than one stall'], a: 0,
        explain: "\"bring your own shopping bag and receive 10% off\" – mang túi riêng được giảm 10%. Tờ rơi nói chấp nhận cả tiền mặt và thẻ, không có ưu đãi cho tiền mặt." },
      { n: 18, q: 'What do volunteers receive?', options: ['A free meal at a campus café', 'A free shopping bag', 'Fresh produce from local farms', 'A 10% discount on flowers'], a: 0,
        explain: "Tình nguyện viên dựng bàn từ 9:30 đến 11:00 và \"receive a free lunch voucher for the campus café\" → được phiếu ăn trưa miễn phí." },
    ])],
  });
  TF.reading.push({
    id: 'tf2-dl4', set: 2, task: 'daily', title: 'Online Chat with a Repair Shop',
    text: "Jonas (10:02 a.m.): Hi, my laptop screen keeps flickering, and sometimes it goes completely black. Is it worth repairing, or should I just get a new one?\nTech support – Rosa (10:05 a.m.): Hi Jonas! That usually means a loose display cable, which is a simple fix. Our diagnosis fee is $40, but we drop it if you go ahead with the repair.\nJonas (10:06 a.m.): OK. How long would it take?\nRosa (10:08 a.m.): If you bring it in today, it should be ready by Wednesday. I'd hold off on buying a new one until we've had a look.",
    groups: [mcq('Read the messages and answer the questions.', [
      { n: 19, q: 'Under what condition will Jonas NOT pay the $40 fee?', options: ['If he has the laptop repaired at the shop', 'If he brings the laptop in today', 'If the problem is a loose cable', 'If he buys a new laptop from the shop'], a: 0,
        explain: "\"we drop it if you go ahead with the repair\" – phí kiểm tra $40 được bỏ nếu khách đồng ý sửa tại cửa hàng. Mang máy đến hôm nay chỉ liên quan đến thời gian sửa xong (thứ Tư)." },
      { n: 20, q: "What does Rosa mean when she writes, \"I'd hold off on buying a new one\"?", options: ['Jonas should wait before deciding to replace his laptop.', 'Jonas should buy a new laptop immediately.', 'The shop does not sell new laptops.', 'New laptops will be cheaper on Wednesday.'], a: 0,
        explain: "\"hold off on + V-ing\" = tạm hoãn việc gì. Rosa khuyên Jonas chưa nên mua máy mới cho tới khi cửa hàng kiểm tra, vì lỗi có thể chỉ là cáp màn hình lỏng." },
    ])],
  });

  /* ===================================================================
   * READING · Read an Academic Passage (câu 21–40)
   * =================================================================== */
  TF.reading.push({
    id: 'tf2-ap1', set: 2, task: 'academic', title: 'Mangroves: Forests at the Edge of the Sea',
    text: [
      "Along many tropical and subtropical coastlines, a narrow band of forest grows in a place where few trees could survive: the zone between high and low tide. These forests are made up of mangroves, a group of roughly seventy species of trees and shrubs that have independently adapted to life in salt water. Twice a day, the tide floods their roots with seawater; twice a day, it drains away and leaves them standing in soft, airless mud. Understanding how mangroves cope with these harsh conditions helps explain why they are so valuable to the coastlines they occupy.",
      "The first challenge is salt. Seawater contains enough salt to kill most land plants, because salt draws water out of plant cells. Mangroves have developed several different solutions to this problem. Some species filter seawater at the surface of their roots, allowing water to enter while blocking most of the salt. Others take in salt but then excrete it through special glands on their leaves; on a dry day, small white crystals can be seen on the leaf surface. A third group stores excess salt in older leaves, which eventually turn yellow and fall off, carrying the salt away with them.",
      "The second challenge is a lack of oxygen. Roots need oxygen to function, but the waterlogged mud of a mangrove forest contains almost none. Many mangroves therefore send part of their root system into the air. The black mangrove produces hundreds of pencil-like roots that grow upward out of the mud, while the red mangrove supports itself on curved prop roots that arch out from its trunk like the legs of a table. These aerial roots are covered with tiny pores that take in air when the tide is low, and the oxygen is then transported to the parts of the roots buried below.",
      "Mangroves also reproduce in an unusual way. In many species, the seed begins to grow while it is still attached to the parent tree, developing into a long, spear-shaped seedling called a propagule. When the propagule finally drops, it may plant itself in the mud directly below, or it may fall into the water and drift away. Propagules can float for weeks or even months without dying, and they begin to put down roots once they are stranded in a suitable spot. This ability allows mangroves to colonize new shorelines far from the parent tree.",
      "The same features that help mangroves survive also make them valuable to people. The dense tangle of roots slows incoming waves and traps sediment, building up the shoreline and reducing erosion. Studies conducted after major tropical storms have found that villages sheltered by wide belts of mangroves often suffered less damage than nearby villages without them. The calm water among the roots also serves as a nursery where young fish and shellfish can feed and hide from predators, supporting local fisheries. In addition, mangrove soils store large amounts of carbon, which would otherwise contribute to climate change.",
      "Despite these benefits, a large share of the world's mangroves has been cleared over the past century, mainly for shrimp farms, rice fields, and coastal construction. Many governments and organizations now fund restoration projects, but early efforts were often disappointing. Volunteers planted millions of seedlings on open mudflats where mangroves had never grown, and most of the young trees drowned or were washed away. More successful projects begin by studying why mangroves disappeared from a site in the first place. By restoring the natural flow of tides, they create conditions in which floating propagules can arrive and settle on their own, often producing healthier forests at a lower cost.",
    ].join('\n\n'),
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 21, q: 'According to paragraph 1, what do mangrove species have in common?', options: ['They have adapted to growing in salt water.', 'They all belong to a single species.', 'They grow only above the high-tide line.', 'They are found mainly in cold regions.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Đoạn 1: mangroves là khoảng 70 loài cây \"that have independently adapted to life in salt water\" – điểm chung là thích nghi với nước mặn. Chúng mọc giữa mức triều cao và thấp, ở vùng nhiệt đới và cận nhiệt đới." },
      { n: 22, q: 'According to paragraph 2, all of the following are ways mangroves deal with salt EXCEPT', options: ['storing salt in their trunks for many years', 'filtering seawater at their roots', 'removing salt through glands on their leaves', 'dropping old leaves that contain salt'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 2 nêu 3 cách: lọc muối ở rễ, thải muối qua tuyến trên lá, dồn muối vào lá già rồi rụng. Việc trữ muối trong thân cây nhiều năm không hề được nhắc tới → đáp án." },
      { n: 23, q: 'Why does the author mention "small white crystals" in paragraph 2?', options: ['To give visible evidence that some mangroves excrete salt', 'To explain how mangroves attract insects', 'To show that mangrove leaves are damaged by the sun', 'To describe the color of mangrove flowers'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Chi tiết tinh thể trắng trên lá vào ngày khô là bằng chứng mắt thường thấy được cho việc một số loài \"excrete it through special glands on their leaves\" (thải muối qua lá)." },
      { n: 24, q: 'The word "waterlogged" in paragraph 3 is closest in meaning to', options: ['saturated with water', 'protected from water', 'cleaned by water', 'surrounded by rocks'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"waterlogged mud\" = bùn ngập/đẫm nước, vì thế gần như không có oxy → \"saturated with water\"." },
      { n: 25, q: 'According to paragraph 3, how do aerial roots help mangroves?', options: ['They take in air that is carried to the roots underground.', 'They store fresh water for dry periods.', 'They keep the tide from reaching the trunk.', 'They absorb salt from the mud.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Rễ khí có lỗ nhỏ \"that take in air when the tide is low, and the oxygen is then transported to the parts of the roots buried below\" → hút không khí rồi đưa oxy xuống phần rễ dưới bùn." },
      { n: 26, q: 'The word "colonize" in paragraph 4 is closest in meaning to', options: ['establish themselves in', 'move away from', 'protect', 'measure'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. Mầm cây trôi xa rồi bén rễ ở bờ biển mới → \"colonize new shorelines\" = đến sinh sống, chiếm chỗ ở vùng mới → \"establish themselves in\"." },
      { n: 27, q: 'What can be inferred from paragraph 4 about propagules?', options: ['Their ability to survive in water helps mangroves spread over long distances.', 'They must reach the mud within a few hours or they die.', 'They can grow only directly below the parent tree.', 'They are produced only by red mangroves.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Mầm có thể nổi \"for weeks or even months without dying\" và nhờ vậy cây \"colonize new shorelines far from the parent tree\" → suy ra khả năng sống sót trong nước giúp rừng ngập mặn lan rộng. Phương án \"vài giờ\" mâu thuẫn trực tiếp với đoạn văn." },
      { n: 28, q: 'According to paragraph 5, why are mangrove roots important for fisheries?', options: ['Young sea animals find food and shelter among them.', 'They filter salt out of the water for fish.', 'They attract fishing boats to the shore.', 'They prevent fish from leaving the coast.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Vùng nước lặng giữa các rễ là \"a nursery where young fish and shellfish can feed and hide from predators\" – nơi cá và động vật có vỏ non kiếm ăn, ẩn nấp → hỗ trợ nghề cá." },
      { n: 29, q: 'What can be inferred from paragraph 5 about villages without mangroves nearby?', options: ['They were more exposed to damage from storm waves.', 'They had larger fishing industries.', 'They were built farther from the sea.', 'They stored more carbon in their soil.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Làng có dải rừng ngập mặn che chắn \"suffered less damage than nearby villages without them\" → suy ra làng không có rừng dễ bị sóng bão tàn phá hơn." },
      { n: 30, q: 'According to paragraph 6, why did many early restoration projects fail?', options: ['Seedlings were planted in places unsuitable for mangroves.', 'There was not enough money to buy seedlings.', 'Shrimp farmers destroyed the new trees.', 'The propagules floated away before they could be planted.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Tình nguyện viên trồng cây \"on open mudflats where mangroves had never grown\" nên phần lớn cây non bị ngập chết hoặc cuốn trôi → trồng sai chỗ. Dự án thành công bắt đầu bằng việc khôi phục dòng triều tự nhiên." },
    ])],
  });
  TF.reading.push({
    id: 'tf2-ap2', set: 2, task: 'academic', title: 'Railroads and the Standardization of Time',
    text: [
      "Today, it seems natural that every clock in a large region shows the same time. For most of human history, however, time was a local matter. Each town set its clocks by the sun, declaring it to be noon when the sun reached its highest point in the sky. Because the sun appears to move from east to west, noon arrived a few minutes earlier in a town to the east than in a town to the west. A city one hundred kilometers away might therefore keep a time that differed from its neighbor's by several minutes. As long as people traveled by horse or on foot, these small differences caused few problems.",
      "The arrival of the railroad in the nineteenth century changed the situation dramatically. Trains covered in a few hours distances that had previously taken days, and they ran according to printed timetables. A timetable is only useful if everyone agrees on what time it is, yet each station along a line might be keeping its own local time. In Britain, railway companies responded during the 1840s by adopting a single time, based on the observatory at Greenwich near London, for all their stations. This \"railway time\" spread quickly, and within about fifteen years most public clocks in the country had been adjusted to match it. For a while, some town clocks were built with two minute hands, one showing local time and the other showing railway time.",
      "In North America, the problem was far more complicated. The United States stretched across a continent, and dozens of independent railroad companies each chose their own standard, usually the local time of the city where the company had its headquarters. A large station might display several clocks, each showing the time used by a different railroad. Travelers who needed to change trains had to calculate the difference between these times, and missed connections were common. Railroad managers recognized that the confusion was also a safety concern, since two trains using different times could end up on the same track at the same moment.",
      "The solution came not from the government but from the railroads themselves. After years of discussion, the major companies agreed to divide the country into a small number of time zones, each one hour apart. On November 18, 1883, stations across the country reset their clocks at noon. In places near the eastern edge of a zone, clocks were turned back several minutes, so that residents experienced noon twice on the same day. The following year, an international conference held in Washington chose the meridian passing through Greenwich as the starting point for measuring longitude, which made it easier to coordinate time zones around the world.",
      "Not everyone welcomed the change. Some newspapers complained that private companies had no right to decide what time it was, and a number of towns continued to follow their own local time for years. Critics argued that time should be determined by nature, not by business schedules. In fact, the railroads' system did not become official national law in the United States until 1918, more than three decades after it had been adopted in practice.",
      "Historians see the standardization of time as a turning point in modern life. Combined with the telegraph, which could send exact time signals across great distances, standard time allowed factories, schools, and offices to coordinate their activities precisely. The idea that time is a shared public standard rather than a local observation now seems so obvious that it is hard to imagine the world without it. Yet it emerged largely as a practical response to a new form of transportation, a reminder that technologies can reshape even the most basic aspects of how people experience the world.",
    ].join('\n\n'),
    groups: [mcq('Read the passage and answer the questions.', [
      { n: 31, q: 'According to paragraph 1, how did towns set their clocks before the railroad era?', options: ['According to the position of the sun', 'According to the time in the nearest large city', 'According to signals sent by telegraph', 'According to national law'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. \"Each town set its clocks by the sun, declaring it to be noon when the sun reached its highest point\" → mỗi thị trấn chỉnh đồng hồ theo vị trí mặt trời. Điện báo và luật quốc gia xuất hiện muộn hơn nhiều." },
      { n: 32, q: 'Why does the author mention that people "traveled by horse or on foot" in paragraph 1?', options: ['To explain why differences in local time were not a serious problem', 'To show that travel was dangerous before the railroad', 'To describe how clocks were carried between towns', 'To argue that walking was healthier than train travel'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Khi người ta còn đi ngựa hay đi bộ, \"these small differences caused few problems\" → chi tiết này giải thích vì sao chênh lệch giờ địa phương trước đây không gây rắc rối, làm nền cho đoạn 2." },
      { n: 33, q: 'The word "adopting" in paragraph 2 is closest in meaning to', options: ['beginning to use', 'refusing to accept', 'carefully measuring', 'officially reporting'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. Các công ty đường sắt \"responded … by adopting a single time\" = bắt đầu áp dụng một giờ chung → \"beginning to use\"." },
      { n: 34, q: 'What can be inferred from paragraph 2 about town clocks with two minute hands?', options: ['For a time, people needed to know both local time and railway time.', 'They were more accurate than ordinary clocks.', 'They were required by the railway companies.', 'They showed the time in London and in Greenwich.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Một kim chỉ giờ địa phương, kim kia chỉ giờ đường sắt → suy ra trong giai đoạn chuyển tiếp người dân vẫn cần biết cả hai loại giờ. Đoạn văn không nói đồng hồ này chính xác hơn hay bị bắt buộc." },
      { n: 35, q: 'According to paragraph 3, why was the situation in North America more complicated than in Britain?', options: ['Many separate railroad companies each used their own time.', 'North American trains traveled more slowly.', 'The government controlled all railroad timetables.', 'There were no clocks in most stations.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Nước Mỹ rộng lớn và \"dozens of independent railroad companies each chose their own standard\" – hàng chục công ty, mỗi công ty dùng giờ riêng. Nhà ga lớn thậm chí có nhiều đồng hồ." },
      { n: 36, q: 'According to paragraph 3, all of the following were problems caused by multiple railroad times EXCEPT', options: ['higher ticket prices for travelers', 'missed train connections', 'the need for travelers to calculate time differences', 'the risk of two trains being on the same track'], a: 0, type: 'negative',
        explain: "Dạng NEGATIVE FACTUAL. Đoạn 3 nêu: hành khách phải tự tính chênh lệch giờ, lỡ chuyến nối tiếp, nguy cơ hai tàu cùng chạy trên một đường ray. Giá vé tăng không được đề cập → đáp án." },
      { n: 37, q: 'According to paragraph 4, why did some residents experience noon twice on November 18, 1883?', options: ['Their clocks were set back several minutes after noon.', 'They lived on the border between two countries.', 'The railroads made a mistake in their timetables.', 'Their town refused to change its clocks.'], a: 0, type: 'factual',
        explain: "Dạng FACTUAL. Ở rìa phía đông của múi giờ, \"clocks were turned back several minutes\" nên khi đồng hồ được lùi lại, họ trải qua 12 giờ trưa hai lần trong cùng một ngày." },
      { n: 38, q: 'The word "coordinate" in paragraph 4 is closest in meaning to', options: ['organize so that they work together', 'reduce in number', 'keep secret', 'divide into parts'], a: 0, type: 'vocab',
        explain: "Dạng VOCABULARY. \"coordinate time zones around the world\" = phối hợp, sắp xếp để các múi giờ khớp với nhau → \"organize so that they work together\"." },
      { n: 39, q: 'What can be inferred from paragraph 5 about the critics of standard time?', options: ['They believed private businesses should not control something as basic as time.', 'They wanted the railroads to create even more time zones.', 'They supported the law passed in 1918.', 'They worked for rival railroad companies.'], a: 0, type: 'inference',
        explain: "Dạng INFERENCE. Báo chí phàn nàn rằng \"private companies had no right to decide what time it was\" và thời gian phải do tự nhiên quyết định → suy ra họ phản đối việc doanh nghiệp tư nhân kiểm soát một điều cơ bản như thời gian." },
      { n: 40, q: 'What is the main purpose of paragraph 6?', options: ['To explain the broader importance of standard time in modern life', 'To describe how the telegraph was invented', 'To compare railroad travel with modern air travel', 'To argue that local time was more accurate'], a: 0, type: 'purpose',
        explain: "Dạng RHETORICAL PURPOSE. Đoạn 6 mở bằng \"Historians see the standardization of time as a turning point in modern life\" và nêu tác động tới nhà máy, trường học, văn phòng → giải thích ý nghĩa rộng lớn của giờ chuẩn." },
    ])],
  });

  /* ===================================================================
   * LISTENING · Listen and Choose a Response (câu 9–16)
   * =================================================================== */
  const RESP = [
    { s: 'A', t: "Is the writing center open during the winter break?",
      options: ["Only for online appointments, I think.", "I wrote my essay over the break.", "It gets really cold here in winter.", "The center of campus is near the library."],
      explain: "Câu hỏi Yes/No về giờ mở cửa trung tâm viết trong kỳ nghỉ đông → \"chỉ nhận hẹn trực tuyến\" trả lời đúng trọng tâm. Các phương án khác lặp \"winter\", \"center\", \"break\" để gây nhiễu." },
    { s: 'B', t: "I'm thinking about dropping my statistics class.",
      options: ["Have you talked to your advisor about it?", "Statistics show that most students pass.", "I dropped my phone yesterday.", "The class meets on Tuesdays."],
      explain: "Người nói chia sẻ ý định bỏ môn → phản hồi tự nhiên là hỏi lại/khuyên: \"Bạn đã hỏi cố vấn học tập chưa?\". \"dropped my phone\" là bẫy nghĩa khác của \"drop\"." },
    { s: 'A', t: "Who's in charge of booking rooms for the club meetings?",
      options: ["Kevin usually takes care of that.", "The meeting lasted two hours.", "I booked a room at a hotel downtown.", "We charge a small membership fee."],
      explain: "Câu hỏi \"Who\" (ai) → cần tên người: \"Kevin thường lo việc đó\". \"charge\" và \"booked\" chỉ là bẫy lặp âm/từ." },
    { s: 'B', t: "You've been working on that poster all afternoon.",
      options: ["I know – I just want it to look perfect.", "The post office closes at five.", "I'll work there next summer.", "It's been sunny all afternoon."],
      explain: "Câu nhận xét (bạn làm tấm áp phích cả buổi chiều rồi) → đáp lại bằng cách giải thích: muốn nó thật hoàn hảo. \"post office\" là bẫy âm gần giống \"poster\"." },
    { s: 'A', t: "Should I print the report or just send it by email?",
      options: ["Email is fine – the professor prefers digital copies.", "The printer is next to the copy machine.", "I reported it to the front desk.", "Yes, I'll send you a postcard."],
      explain: "Câu hỏi lựa chọn (A hay B) → không trả lời \"Yes/No\" mà chọn một phương án kèm lý do: gửi email vì giáo sư thích bản điện tử." },
    { s: 'B', t: "I can't find my calculator anywhere.",
      options: ["You can use mine for the test.", "It calculates very quickly.", "I found the answer on page ten.", "Anywhere is fine with me."],
      explain: "Người nói gặp vấn đề (mất máy tính) → phản hồi hợp lý là đề nghị giúp: cho mượn máy của mình. \"Anywhere is fine with me\" lặp từ nhưng lạc nghĩa." },
    { s: 'A', t: "How about joining us for dinner after the seminar?",
      options: ["I'd love to, but I have a shift at work.", "The seminar was about urban planning.", "About seven people, I think.", "I already joined the gym."],
      explain: "\"How about + V-ing?\" là lời MỜI → trả lời nhận lời hoặc từ chối lịch sự: \"Mình rất muốn, nhưng có ca làm\". \"About seven people\" là bẫy lặp từ \"about\"." },
    { s: 'B', t: "Didn't the bookstore say the books would arrive this week?",
      options: ["They did, but the shipment was delayed.", "I'd like to buy two notebooks.", "The store is on the second floor.", "This week has been very busy."],
      explain: "Câu hỏi phủ định để xác nhận (\"Chẳng phải hiệu sách nói…?\") → \"Đúng vậy, nhưng lô hàng bị trễ\" vừa xác nhận vừa giải thích. Các phương án khác chỉ lặp \"store\", \"this week\"." },
  ];
  const respScript = [{ say: 'Listen and choose the best response. You will hear each sentence once.' }, { pause: 2 }];
  RESP.forEach((r, i) => { respScript.push({ say: 'Number ' + (i + 9) + '.' }, { s: r.s, t: r.t }, { pause: 4 }); });
  TF.listening.push({
    id: 'tf2-lr', set: 2, task: 'response', title: 'Choose a Response · Set 2',
    speakers: { A: { name: 'Speaker 1', accent: 'en-GB', gender: 'm' }, B: { name: 'Speaker 2', accent: 'en-US', gender: 'f' } },
    script: respScript,
    groups: [mcq('Listen to each sentence and choose the best response.', RESP.map((r, i) => ({ n: i + 9, q: 'Choose the best response to sentence ' + (i + 9) + '.', options: r.options, a: 0, cue: r.t, explain: r.explain })))],
  });

  /* ===================================================================
   * LISTENING · Listen to a Conversation (câu 9–16)
   * =================================================================== */
  TF.listening.push({
    id: 'tf2-lc1', set: 2, task: 'conversation', title: 'At the Study Abroad Office',
    speakers: { S: { name: 'Student (Daniel)', accent: 'en-US', gender: 'm' }, A: { name: 'Study abroad advisor', accent: 'en-GB', gender: 'f' } },
    script: [
      { say: 'Listen to a conversation between a student and a study abroad advisor.' }, { pause: 1 },
      { s: 'S', t: "Hi. I'm interested in spending next spring semester in Japan. I saw on the website that we have a partner university in Osaka." },
      { s: 'A', t: "We do, and it's a very popular program. Have you studied Japanese before?" },
      { s: 'S', t: "Just one semester so far. Is that going to be a problem?" },
      { s: 'A', t: "For the regular exchange, unfortunately, yes. Students need at least one full year of Japanese, because the classes are taught in Japanese." },
      { s: 'S', t: "Oh. That's disappointing." },
      { s: 'A', t: "Don't give up yet. The same university runs an English-taught program in international business. You'd take your main courses in English, plus a Japanese language class every day. A lot of students in your situation choose it." },
      { s: 'S', t: "That actually sounds perfect. I'm an economics major, so business courses would fit." },
      { s: 'A', t: "Good. The application deadline is March first. But before you leave, there's one important step: you need your department to approve the courses you plan to take, so the credits transfer back here. There's a course approval form, and your department chair has to sign it." },
      { s: 'S', t: "I'll go to the economics office this week, then. Is there any financial aid?" },
      { s: 'A', t: "There's a travel scholarship. It only requires a short essay about your goals, so it's definitely worth applying." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 9, q: 'Why does the student go to see the advisor?', options: ['To ask about studying at a university in Japan', 'To complain about a Japanese language class', 'To change his major to international business', 'To apply for a job in Osaka'], a: 0, cue: 'spending next spring semester in Japan',
        explain: "Daniel nói ngay câu đầu: \"I'm interested in spending next spring semester in Japan\" → hỏi về chương trình học một học kỳ ở trường đối tác tại Nhật." },
      { n: 10, q: 'What problem does the student have with the regular exchange program?', options: ['He has not studied enough Japanese.', 'He missed the application deadline.', 'His grades are too low.', 'The program is full this year.'], a: 0, cue: 'at least one full year of Japanese',
        explain: "Chương trình trao đổi thông thường yêu cầu \"at least one full year of Japanese\" nhưng Daniel mới học một học kỳ → chưa đủ trình độ tiếng Nhật. Hạn nộp (1/3) vẫn chưa qua." },
      { n: 11, q: 'What does the advisor suggest?', options: ['Applying to a program taught in English', 'Waiting another year before going abroad', 'Taking an online Japanese course first', 'Choosing a different partner university'], a: 0, cue: 'English-taught program',
        explain: "Cố vấn gợi ý \"an English-taught program in international business\" – học chuyên ngành bằng tiếng Anh, kèm lớp tiếng Nhật hằng ngày, ngay tại trường đối tác đó." },
      { n: 12, q: 'What must the student do before he leaves?', options: ['Get his department to approve his planned courses', 'Write an essay for the partner university', 'Pass a Japanese language test', 'Pay a deposit to the study abroad office'], a: 0, cue: 'course approval form',
        explain: "\"before you leave… you need your department to approve the courses\" – phải có mẫu phê duyệt môn học do trưởng khoa ký để chuyển tín chỉ. Bài luận ngắn là cho học bổng, không bắt buộc." },
    ])],
  });
  TF.listening.push({
    id: 'tf2-lc2', set: 2, task: 'conversation', title: 'Joining the Campus Radio Station',
    speakers: { S: { name: 'Student (Priya)', accent: 'en-GB', gender: 'f' }, M: { name: 'Station manager', accent: 'en-US', gender: 'm' } },
    script: [
      { say: 'Listen to a conversation between a student and the manager of the campus radio station.' }, { pause: 1 },
      { s: 'S', t: "Hi, are you the station manager? I'd really like to host my own show this semester." },
      { s: 'M', t: "That's me. Great to hear! Have you done any radio before?" },
      { s: 'S', t: "Not really, but I've made a few podcasts with friends." },
      { s: 'M', t: "That helps. Everyone who wants to go on air has to complete our training first, though. It's two workshops on Saturday mornings, where you learn the equipment and the broadcasting rules." },
      { s: 'S', t: "No problem. What times are available for shows?" },
      { s: 'M', t: "I'll be honest: new hosts usually start with a late-night slot, like eleven to midnight. The daytime slots go to hosts who've been with us at least a semester." },
      { s: 'S', t: "I guess that's fair. My idea is a show about local musicians – bands that play in small venues around town." },
      { s: 'M', t: "I like that. We have plenty of music shows, but nobody focuses on local artists. You could even invite musicians to the studio for short interviews – listeners love that." },
      { s: 'S', t: "Oh, that would be fun. So what do I need to apply?" },
      { s: 'M', t: "Send me a sample playlist and a one-minute recording of yourself introducing the show. Then we'll sign you up for the next training." },
    ],
    groups: [mcq('Answer the questions about the conversation.', [
      { n: 13, q: 'What does the student want to do?', options: ['Host her own radio show', 'Repair the station equipment', 'Interview the station manager', 'Start a podcast with friends'], a: 0, cue: 'host my own show',
        explain: "Priya nói: \"I'd really like to host my own show this semester\" → muốn dẫn chương trình riêng trên đài phát thanh của trường. Podcast chỉ là kinh nghiệm cô đã có." },
      { n: 14, q: 'Why will the student probably be given a late-night slot?', options: ['Daytime slots are reserved for more experienced hosts.', 'She has classes during the day.', 'Late-night shows have more listeners.', 'Her show is about music.'], a: 0, cue: 'new hosts usually start with a late-night slot',
        explain: "Quản lý giải thích người mới thường bắt đầu với khung giờ khuya, còn \"The daytime slots go to hosts who've been with us at least a semester\" → khung ban ngày dành cho người có kinh nghiệm." },
      { n: 15, q: "What is the manager's opinion of the student's idea?", options: ['He thinks it would fill a gap in the station\'s programs.', 'He thinks there are already too many music shows.', 'He thinks local musicians would not want to take part.', 'He thinks it would be better as a podcast.'], a: 0, cue: 'nobody focuses on local artists',
        explain: "Câu hỏi thái độ: \"I like that… nobody focuses on local artists\" → anh ủng hộ vì ý tưởng lấp được khoảng trống, chưa ai làm chương trình về nghệ sĩ địa phương." },
      { n: 16, q: 'What does the student need to send the manager?', options: ['A playlist and a short recording of herself', 'A list of local bands and their contact details', 'A certificate from the training workshops', 'A written plan for the whole semester'], a: 0, cue: 'sample playlist',
        explain: "\"Send me a sample playlist and a one-minute recording of yourself introducing the show\" – cần danh sách bài hát mẫu và đoạn ghi âm một phút giới thiệu chương trình." },
    ])],
  });

  /* ===================================================================
   * LISTENING · Listen to an Announcement (câu 7–12)
   * =================================================================== */
  TF.listening.push({
    id: 'tf2-la1', set: 2, task: 'announcement', title: 'Reusable Container Program',
    speakers: { A: { name: 'Announcer', accent: 'en-US', gender: 'm' } },
    script: [
      { say: 'Listen to an announcement in a university dining hall.' }, { pause: 1 },
      { s: 'A', t: "Attention, please. Starting next Monday, the dining hall will stop offering disposable takeout boxes. Instead, we're introducing a reusable container program to cut down on waste." },
      { s: 'A', t: "Here's how it works. Pay a one-time deposit of five dollars at the cashier, and you'll receive a sturdy plastic container that you can fill with any meal." },
      { s: 'A', t: "When you're done, simply drop the container in one of the return bins – you'll find them at the library, the gym, and right here by the main entrance. Each time you return one, you'll get a token that you can exchange for a clean container on your next visit." },
      { s: 'A', t: "Last year, the dining hall threw away more than eighty thousand takeout boxes. With your help, we hope to bring that number close to zero." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 7, q: 'What is the main purpose of the announcement?', options: ['To explain a new system for takeout meals', 'To announce new opening hours for the dining hall', 'To ask students to volunteer in the kitchen', 'To introduce new items on the menu'], a: 0, cue: 'reusable container program',
        explain: "Thông báo giới thiệu \"a reusable container program\" thay cho hộp dùng một lần → giải thích hệ thống mới cho bữa ăn mang đi." },
      { n: 8, q: 'How can students get a container?', options: ['By paying a deposit one time', 'By showing their student ID card', 'By returning a disposable box', 'By buying a meal at the library'], a: 0, cue: 'one-time deposit of five dollars',
        explain: "\"Pay a one-time deposit of five dollars at the cashier\" – đặt cọc 5 đô một lần duy nhất tại quầy thu ngân để nhận hộp." },
      { n: 9, q: 'What happens when students return a container?', options: ['They receive a token for a clean container.', 'They get their five dollars back.', 'They receive a free meal.', 'They must wash it first.'], a: 0, cue: 'get a token',
        explain: "Mỗi lần trả hộp \"you'll get a token that you can exchange for a clean container\" – nhận một thẻ để đổi hộp sạch lần sau. Không nói trả lại tiền cọc." },
    ])],
  });
  TF.listening.push({
    id: 'tf2-la2', set: 2, task: 'announcement', title: 'Midterm Exam Information',
    speakers: { A: { name: 'Instructor', accent: 'en-GB', gender: 'f' } },
    script: [
      { say: 'Listen to an instructor talking to a statistics class.' }, { pause: 1 },
      { s: 'A', t: "Before you go, some information about next Wednesday's midterm. It will no longer be in this room. So many of you are enrolled this term that we simply don't have enough seats, so we've moved the exam to Hall B in the Humanities Building." },
      { s: 'A', t: "You'll need a basic calculator. Please note that phones cannot be used as calculators during the exam, and they must stay in your bags." },
      { s: 'A', t: "You don't need to memorize formulas – a formula sheet will be provided with the exam paper." },
      { s: 'A', t: "Finally, I'll post a practice exam online on Friday, with the answers, so you can check your work over the weekend." },
    ],
    groups: [mcq('Answer the questions about the announcement.', [
      { n: 10, q: 'Why has the location of the exam changed?', options: ['The usual room is too small for the class.', 'The usual room is being renovated.', 'Another class needs the room on Wednesday.', 'Hall B has better equipment for exams.'], a: 0, cue: "don't have enough seats",
        explain: "\"So many of you are enrolled… we simply don't have enough seats\" – lớp quá đông, phòng hiện tại không đủ chỗ nên dời sang Hall B." },
      { n: 11, q: 'What does the instructor say about calculators?', options: ['Students may not use their phones as calculators.', 'Calculators will be provided in the exam room.', 'Calculators are not allowed at all.', 'Students should use the calculator app on their phones.'], a: 0, cue: 'phones cannot be used as calculators',
        explain: "Sinh viên cần mang máy tính cầm tay cơ bản, nhưng \"phones cannot be used as calculators\" – không được dùng điện thoại thay máy tính." },
      { n: 12, q: 'What will the instructor post online on Friday?', options: ['A practice exam with answers', 'The formula sheet', 'The seating plan for Hall B', 'The students\' midterm grades'], a: 0, cue: 'practice exam online',
        explain: "\"I'll post a practice exam online on Friday, with the answers\" – đề luyện tập kèm đáp án. Bảng công thức sẽ được phát cùng đề thi chứ không đăng trước." },
    ])],
  });

  /* ===================================================================
   * LISTENING · Listen to an Academic Talk (câu 11–20)
   * =================================================================== */
  TF.listening.push({
    id: 'tf2-lt1', set: 2, task: 'talk', title: 'Business: The Anchoring Effect',
    speakers: { P: { name: 'Professor', accent: 'en-US', gender: 'm' } },
    script: [
      { say: 'Listen to part of a talk in a business class.' }, { pause: 1 },
      { s: 'P', t: "Let's start with a question. When you see a price, how do you decide whether it's reasonable? Most of us like to think we judge prices logically. But research on something called the anchoring effect suggests otherwise." },
      { s: 'P', t: "Anchoring means that the first number we see strongly influences our later estimates – even when that number has nothing to do with the question. In one classic type of experiment, people spin a wheel that lands on a random number, and then they're asked to estimate something unrelated, like the population of a country. People who got a high number on the wheel give noticeably higher estimates. The random number becomes an anchor." },
      { s: 'P', t: "Businesses use this all the time. Think about a sale tag that shows the original price crossed out. The original price is the anchor, so the sale price looks like a bargain. Some restaurants place one extremely expensive dish at the top of the menu. They don't expect to sell many, but next to it, the other dishes suddenly seem reasonably priced." },
      { s: 'P', t: "Anchoring matters in negotiations too. Whoever names the first number often sets the range for the whole discussion. That's why many negotiation experts advise making the first offer yourself, if you've done your research." },
      { s: 'P', t: "So can we protect ourselves? It's hard, because anchoring works even on experts. But one technique helps: before you accept a number, deliberately think of reasons why it might be wrong. That pulls your judgment away from the anchor." },
    ],
    groups: [mcq('Answer the questions about the talk.', [
      { n: 11, q: 'What is the talk mainly about?', options: ['How an initial number can influence people\'s judgments', 'How restaurants decide the prices of their dishes', 'Why people prefer to shop during sales', 'How to calculate the population of a country'], a: 0, cue: 'anchoring effect',
        explain: "Câu hỏi ý chính: bài giảng giải thích \"the anchoring effect\" – con số đầu tiên ta thấy ảnh hưởng mạnh đến các ước lượng sau đó, rồi đưa ví dụ trong kinh doanh và cách phòng tránh." },
      { n: 12, q: 'Why does the professor describe the experiment with a wheel?', options: ['To show that even a random number can affect estimates', 'To explain how prices are chosen at random', 'To show that people are good at estimating populations', 'To describe a popular game used in marketing'], a: 0, cue: 'spin a wheel',
        explain: "Con số từ vòng quay là ngẫu nhiên, không liên quan câu hỏi, nhưng người được số cao vẫn ước lượng cao hơn → minh họa rằng ngay cả số ngẫu nhiên cũng trở thành \"mỏ neo\"." },
      { n: 13, q: 'According to the professor, why do some restaurants put a very expensive dish on the menu?', options: ['To make the other dishes seem cheaper by comparison', 'To attract wealthy customers', 'To earn most of their profit from that dish', 'To show the quality of their ingredients'], a: 0, cue: 'extremely expensive dish',
        explain: "\"They don't expect to sell many, but next to it, the other dishes suddenly seem reasonably priced\" – món đắt làm mỏ neo khiến các món khác trông có vẻ hợp lý. Nhà hàng không trông chờ bán được nhiều món đó." },
      { n: 14, q: 'What advice does the professor mention about negotiations?', options: ['Make the first offer if you are well prepared.', 'Always wait for the other side to name a price.', 'Avoid mentioning any numbers.', 'Accept the first offer to save time.'], a: 0, cue: 'making the first offer yourself',
        explain: "Người nêu con số đầu tiên thường định khung cho cả cuộc đàm phán, nên chuyên gia khuyên \"making the first offer yourself, if you've done your research\" – tự đưa ra đề nghị trước nếu đã chuẩn bị kỹ." },
      { n: 15, q: 'What technique does the professor recommend for reducing the anchoring effect?', options: ['Thinking of reasons why a number might be incorrect', 'Asking an expert for advice', 'Ignoring all prices on sale tags', 'Making decisions as quickly as possible'], a: 0, cue: 'reasons why it might be wrong',
        explain: "\"deliberately think of reasons why it might be wrong\" – chủ động nghĩ lý do con số có thể sai giúp kéo phán đoán ra khỏi mỏ neo. Giáo sư nói hiệu ứng tác động cả với chuyên gia, nên hỏi chuyên gia không phải giải pháp." },
    ])],
  });
  TF.listening.push({
    id: 'tf2-lt2', set: 2, task: 'talk', title: 'Ecology: Beavers as Ecosystem Engineers',
    speakers: { P: { name: 'Professor', accent: 'en-GB', gender: 'f' } },
    script: [
      { say: 'Listen to part of a talk in an ecology class.' }, { pause: 1 },
      { s: 'P', t: "Today we're looking at what ecologists call ecosystem engineers – animals that physically change their environment in ways that affect many other species. And the classic example is the beaver." },
      { s: 'P', t: "Beavers build dams across streams using branches, mud, and stones. The dam blocks the flow, and a pond forms behind it. Over time, a single family of beavers can turn a narrow, fast stream into a series of ponds and wetlands." },
      { s: 'P', t: "Why does that matter? Well, these wetlands become habitat for fish, frogs, insects, and water birds that couldn't live in the original stream. The dams also slow down water during heavy rain, which reduces flooding downstream. And because the ponds soak water into the ground, the area stays green during droughts, when nearby land dries out." },
      { s: 'P', t: "Here's a striking example. After some large wildfires in the western United States, aerial photos showed bright green strips of vegetation running through blackened landscapes. Those green strips were beaver wetlands. They were simply too wet to burn, so they became refuges for animals escaping the fire." },
      { s: 'P', t: "Of course, beavers can cause problems for people. Their ponds sometimes flood roads or farmland. One common solution is a device called a pond leveler – basically a pipe that runs through the dam and keeps the water from rising above a certain level. The beavers stay, and the flooding stops." },
    ],
    groups: [mcq('Answer the questions about the talk.', [
      { n: 16, q: 'What is the main topic of the talk?', options: ['How beavers change their environment and affect other species', 'How beavers raise their young', 'Why beavers are disappearing from many rivers', 'How wildfires spread across dry land'], a: 0, cue: 'ecosystem engineers',
        explain: "Giáo sư giới thiệu khái niệm \"ecosystem engineers\" và lấy hải ly làm ví dụ điển hình: chúng làm thay đổi môi trường, ảnh hưởng tới nhiều loài khác." },
      { n: 17, q: 'According to the professor, what is an ecosystem engineer?', options: ['An animal that physically changes its surroundings', 'A scientist who designs new habitats', 'An animal that eats many different species', 'A plant that grows only near water'], a: 0, cue: 'physically change their environment',
        explain: "Định nghĩa trong bài: \"animals that physically change their environment in ways that affect many other species\" – động vật làm biến đổi môi trường sống về mặt vật lý." },
      { n: 18, q: 'How do beaver ponds help during droughts?', options: ['Water soaks into the ground and keeps the area green.', 'Beavers dig wells for other animals.', 'The ponds attract more rain clouds.', 'The dams release all their water at once.'], a: 0, cue: 'stays green during droughts',
        explain: "\"because the ponds soak water into the ground, the area stays green during droughts\" – nước ngấm xuống đất giúp khu vực vẫn xanh tươi khi hạn hán." },
      { n: 19, q: 'Why does the professor mention aerial photos taken after wildfires?', options: ['To show that beaver wetlands can resist fire', 'To explain how scientists count beavers', 'To show that beavers caused the fires', 'To describe damage to beaver dams'], a: 0, cue: 'aerial photos',
        explain: "Những dải xanh giữa vùng cháy đen chính là đầm lầy của hải ly – \"too wet to burn\" → ví dụ cho thấy vùng đất ngập nước do hải ly tạo ra có thể chống cháy và làm nơi trú ẩn." },
      { n: 20, q: 'What is the purpose of a pond leveler?', options: ['To control the water level without removing the beavers', 'To drain the pond completely', 'To keep beavers away from roads', 'To help beavers build stronger dams'], a: 0, cue: 'pond leveler',
        explain: "Ống dẫn xuyên qua đập \"keeps the water from rising above a certain level. The beavers stay, and the flooding stops\" → kiểm soát mực nước mà vẫn giữ hải ly lại." },
    ])],
  });

  /* ===================================================================
   * WRITING · Build a Sentence (câu 11–20)
   * chunks: các cụm từ theo ĐÚNG thứ tự; giao diện tự xáo trộn.
   * =================================================================== */
  TF.writing.push({
    id: 'tf2-bs', set: 2, task: 'sentence', title: 'Build a Sentence · Set 2',
    instr: 'Put the words in the correct order to make a grammatical response.',
    items: [
      { n: 11, prompt: 'Is the computer lab open this weekend?', chunks: ['it', 'is', 'open', 'on Saturday', 'but not', 'on Sunday'], end: '.',
        explain: "Trật tự S + be + adj: \"it is open\"; hai cụm thời gian đối lập nối bằng \"but not\": \"on Saturday but not on Sunday\"." },
      { n: 12, prompt: 'What did you think of the guest speaker?', chunks: ['I', 'found', 'her talk', 'surprisingly', 'easy', 'to follow'], end: '.',
        explain: "Cấu trúc \"find + O + adj + to V\" (thấy cái gì như thế nào): \"found her talk easy to follow\"; trạng từ \"surprisingly\" đứng trước tính từ \"easy\" để bổ nghĩa." },
      { n: 13, prompt: "I'm looking for the career center.", chunks: ['could you', 'tell me', 'which', 'building', 'it', 'is in'], end: '?', starter: 'Excuse me.',
        explain: "Câu hỏi lồng lịch sự: \"Could you tell me + which building + S + V\". Trong mệnh đề lồng KHÔNG đảo ngữ: \"which building it is in\", giới từ \"in\" đứng cuối." },
      { n: 14, prompt: 'Do you know when the assignment is due?', chunks: ['the professor', 'said', 'that', 'it', 'is due', 'next Friday'], end: '.', starter: 'Yes,',
        explain: "Câu tường thuật: \"S + said + that + mệnh đề\". \"be due\" = đến hạn; trạng từ thời gian \"next Friday\" đứng cuối câu." },
      { n: 15, prompt: 'Could you help me move this weekend?', chunks: ['I', 'would love to', 'but', 'I have', 'already promised', 'to work'], end: '.',
        explain: "Từ chối lịch sự: \"I would love to, but…\". Hiện tại hoàn thành \"I have already promised\"; \"already\" đứng giữa \"have\" và V3; \"promise + to V\"." },
      { n: 16, prompt: 'Have you ever been to the new art museum?', chunks: ['no', 'but', 'I', 'have heard', 'that', 'it is', 'amazing'], end: '.',
        explain: "Trả lời \"No\" rồi bổ sung: \"but I have heard that it is amazing\" – hiện tại hoàn thành \"have heard\" + mệnh đề \"that\"." },
      { n: 17, prompt: 'Which book should I read first?', chunks: ['the one', 'that', 'the professor', 'recommended', 'is', 'the most useful'], end: '.', alt: ['the most useful is the one that the professor recommended'],
        explain: "Chủ ngữ dài có mệnh đề quan hệ: \"The one that the professor recommended\" + \"is the most useful\". \"the one\" thay cho \"the book\"." },
      { n: 18, prompt: 'Why is the road by the river closed?', chunks: ['it', 'has been', 'closed', 'because of', 'the flooding', 'last night'], end: '.',
        explain: "Bị động hiện tại hoàn thành \"has been + V3\" (đã bị đóng). \"because of + danh từ\" (vì) – không dùng \"because\" trước cụm danh từ." },
      { n: 19, prompt: 'How often do you go to the gym?', chunks: ['I', 'try', 'to go', 'at least', 'three times', 'a week'], end: '.',
        explain: "\"try + to V\" (cố gắng làm gì); cụm tần suất \"at least three times a week\" (ít nhất ba lần một tuần) đứng cuối câu." },
      { n: 20, prompt: 'Did you enjoy the field trip?', chunks: ['it', 'was', 'the most', 'interesting', 'trip', 'I have', 'ever taken'], end: '.',
        explain: "So sánh nhất + hiện tại hoàn thành với \"ever\": \"the most interesting trip I have ever taken\" (chuyến đi thú vị nhất tôi từng đi); mệnh đề quan hệ rút gọn bỏ \"that\"." },
    ],
  });

  /* ===================================================================
   * WRITING · Write an Email
   * =================================================================== */
  TF.writing.push({
    id: 'tf2-em1', set: 2, task: 'email', title: 'A Mistake on Your Tuition Bill', minutes: 7,
    scenario: 'Your latest tuition bill includes a charge of $450 for a course that you dropped during the first week of the semester, before the official deadline.',
    to: 'Mr. Grant at the Student Billing Office',
    points: ['Explain the problem with your bill.', 'Describe what you did when you dropped the course.', 'Ask what you should do next and when the problem can be fixed.'],
    model: "Dear Mr. Grant,\n\nI am writing about an error on my tuition bill for the fall semester. My bill includes a charge of $450 for Introduction to Marketing (MKT 101), but I am no longer enrolled in this course.\n\nI dropped the course online on September 4, which was during the first week of classes and before the drop deadline of September 10. I received a confirmation email from the registrar's office that day, and the course no longer appears on my schedule. I have attached a copy of that email to this message.\n\nCould you please let me know whether I need to submit any other documents? I would also like to know when the charge will be removed, because the payment deadline is at the end of this month and I do not want to receive a late fee.\n\nThank you very much for your help.\n\nSincerely,\nHoang Le\nStudent ID: 20481736",
    checklist: ['Nêu rõ vấn đề ngay đoạn đầu (khoản phí sai, số tiền, tên môn)', 'Đưa bằng chứng: ngày bỏ môn, hạn chót, email xác nhận', 'Hỏi cụ thể: cần làm gì thêm và khi nào được sửa', 'Giọng văn lịch sự, khách quan, không trách móc', 'Ký tên kèm mã số sinh viên', 'Khoảng 120–180 từ, không lỗi chính tả'],
    tips: 'Email gửi phòng hành chính nên ngắn gọn, có số liệu cụ thể (ngày tháng, số tiền, mã môn) để người đọc xử lý ngay. Nhắc tới tài liệu đính kèm ("I have attached…") làm thư thuyết phục hơn.',
  });
  TF.writing.push({
    id: 'tf2-em2', set: 2, task: 'email', title: 'Inviting a Guest Speaker', minutes: 7,
    scenario: 'You are the president of a student sustainability club. You would like to invite Dr. Rivera, a local scientist who studies water quality in the city\'s rivers, to speak at one of your club meetings.',
    to: 'Dr. Rivera',
    points: ['Introduce yourself and your club.', 'Explain why you would like Dr. Rivera to speak.', 'Give details about the event and ask about her availability.'],
    model: "Dear Dr. Rivera,\n\nMy name is Thu Pham, and I am the president of the Green Campus Club at Westfield University. Our club has about forty members, and we organize monthly talks and volunteer activities related to the environment.\n\nThis semester, our members have chosen water pollution as our main theme. We recently read a local newspaper article about your research on water quality in the Ashton River, and we were very impressed. Many of our members join river clean-up events, so we would love to learn more about the science behind the problem and what students can do to help.\n\nOur meetings take place on Thursday evenings from 6 to 7:30 p.m. in the Student Center. A talk of about thirty minutes, followed by questions, would be ideal. Would you be available on any Thursday in October or November? We would be happy to arrange parking for you.\n\nThank you for considering our invitation.\n\nBest regards,\nThu Pham",
    checklist: ['Giới thiệu bản thân và câu lạc bộ (quy mô, hoạt động)', 'Giải thích lý do mời: liên hệ cụ thể với công trình của diễn giả', 'Cung cấp chi tiết: thời gian, địa điểm, độ dài bài nói', 'Hỏi lịch trống bằng câu hỏi lịch sự ("Would you be available…?")', 'Thể hiện sự trân trọng, có lời cảm ơn và ký tên', 'Khoảng 120–180 từ'],
    tips: 'Thư mời hiệu quả cho người nhận thấy vì sao CHÍNH họ được mời và việc nhận lời dễ dàng thế nào (thời gian cụ thể, hỗ trợ đỗ xe…). Tránh chỉ khen chung chung.',
  });

  /* ===================================================================
   * WRITING · Write for an Academic Discussion
   * =================================================================== */
  TF.writing.push({
    id: 'tf2-ad1', set: 2, task: 'discussion', title: 'Will Remote Work Change Cities?', minutes: 10,
    professor: { name: 'Dr. Okonkwo', text: 'In our urban studies course, we have been looking at how technology shapes where people live. Since many companies now allow employees to work from home, some experts predict that large cities will lose population as people move to smaller towns with lower costs. Others believe big cities will remain as attractive as ever. What do you think: will remote work cause large cities to decline? Explain your view.' },
    students: [
      { name: 'Omar', text: 'I think big cities will shrink. If I can do my job from anywhere, why pay high rent for a tiny apartment? Several of my cousins have already moved to smaller towns and are much happier.' },
      { name: 'Lena', text: 'I don\'t agree. Cities offer much more than offices – restaurants, concerts, universities, and the chance to meet new people. Young people especially will keep moving to cities for that lifestyle.' },
    ],
    model: "I think Lena is right that cities offer more than jobs, but I believe remote work will change cities rather than make them decline. Omar's cousins show that some families, especially those with children, will move to cheaper areas. However, this could actually help large cities in the long run. If demand for downtown office space falls, empty office buildings can be converted into apartments, which would lower housing costs and attract young people who want the urban lifestyle Lena describes. For example, several cities have already turned old office towers into student housing. As a result, city centers may become places where people live and enjoy themselves, not just places where they commute to work. In my view, the cities that adapt in this way will remain strong.",
    checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Phản hồi ý của Omar và/hoặc Lena', 'Đóng góp ý MỚI (vd. văn phòng trống chuyển thành nhà ở)', 'Có ví dụ cụ thể hỗ trợ lập luận', 'Dùng từ nối: However, For example, As a result, In my view', 'Tối thiểu khoảng 100 từ'],
    tips: 'Một cách hay để "thêm ý mới" là chỉ ra hệ quả gián tiếp mà hai bạn chưa nghĩ tới (ví dụ: làm việc từ xa → văn phòng trống → nhà ở rẻ hơn). Đừng chỉ chọn phe đúng/sai.',
  });
  TF.writing.push({
    id: 'tf2-ad2', set: 2, task: 'discussion', title: 'Digital or Printed Books in Libraries?', minutes: 10,
    professor: { name: 'Professor Lindqvist', text: 'This week we are discussing how public institutions adapt to new technology. Many public libraries have limited budgets, and they must decide how to spend them. Some people argue that libraries should spend most of their money on e-books and online databases, because that is how people read today. Others say libraries should continue to focus on printed books. Which approach do you think libraries should take, and why?' },
    students: [
      { name: 'Grace', text: 'Libraries should go digital. E-books never get damaged or lost, and people can borrow them at midnight from home. It also saves a lot of shelf space.' },
      { name: 'Tomás', text: 'I think printed books are still important. Not everyone has a tablet or fast internet at home, and many studies say people remember more when they read on paper.' },
    ],
    model: "Both Grace and Tomás raise good points, but I believe libraries should decide based on who actually uses them rather than following a single trend. Tomás is right that not everyone owns a device, and for those people, a library that only offers e-books would be useless. On the other hand, Grace's argument about convenience is convincing for students and working adults who cannot visit during opening hours. A sensible solution is for each library to study its own borrowing data. For instance, if children's picture books are borrowed far more in print, the library should keep buying them on paper, while popular novels and reference works could move online. Libraries could also lend tablets to families who need them. This flexible approach would serve everyone better than choosing only one format.",
    checklist: ['Nêu rõ quan điểm ngay câu đầu', 'Phản hồi ý của cả Grace và Tomás', 'Đưa giải pháp/ý mới (dựa vào dữ liệu mượn sách, cho mượn máy tính bảng)', 'Có ví dụ minh họa cụ thể', 'Dùng từ nối: On the other hand, For instance, while', 'Tối thiểu khoảng 100 từ'],
    tips: 'Khi đề hỏi "Which approach…?", bạn có thể đề xuất tiêu chí lựa chọn (dựa vào nhu cầu người dùng) thay vì chọn cứng một bên – miễn là lập luận rõ ràng và có ví dụ.',
  });

  /* ===================================================================
   * SPEAKING · Listen and Repeat
   * =================================================================== */
  TF.speaking.push({
    id: 'tf2-rp1', set: 2, task: 'repeat', title: 'Dining Hall Staff Training', accent: 'en-US',
    context: 'You are starting a part-time job in the campus dining hall. Listen to the supervisor and repeat exactly what you hear.',
    sentences: [
      { t: 'Please wash your hands first.', tip: 'Nối âm "wash your" → /wɑːʃər/; âm cuối /st/ trong "first" phải rõ.' },
      { t: 'Aprons are hanging by the door.', tip: 'Nối "Aprons are" → /ˈeɪprənzɑːr/; nhấn "HANGing" và "DOOR".' },
      { t: 'Breakfast is served from seven until ten.', tip: 'Bị động "is served"; phân biệt "seven" /ˈsevən/ và "ten" rõ ràng, nhấn số.' },
      { t: 'Always check the temperature of the soup.', tip: '"temperature" đọc 3 âm tiết /ˈtemprətʃər/; nối "of the" đọc nhẹ.' },
      { t: 'Label every container with the date you opened it.', tip: 'Nhấn "LAbel", "DATE"; "opened it" nối âm /ˈoʊpəndɪt/.' },
      { t: 'If a customer asks about allergies, call the manager on duty.', tip: 'Ngắt nhịp sau "allergies,"; "allergies" /ˈælərdʒiz/ nhấn âm đầu.' },
      { t: 'Before you leave, make sure the counters are clean and the lights are off.', tip: 'Câu dài – chia nhịp: "Before you leave / make sure the counters are clean / and the lights are off".' },
    ],
  });
  TF.speaking.push({
    id: 'tf2-rp2', set: 2, task: 'repeat', title: 'Botanical Garden Guide', accent: 'en-GB',
    context: 'You are training as a guide at a botanical garden. Listen to the head gardener and repeat exactly what you hear.',
    sentences: [
      { t: 'Good morning, everyone.', tip: 'Nhấn "MORning" và "EVeryone"; giọng Anh-Anh không phát âm rõ /r/ cuối âm tiết.' },
      { t: 'The garden covers twelve acres.', tip: 'Âm /v/ trong "covers" và "twelve"; "acres" /ˈeɪkəz/.' },
      { t: 'Please keep to the paths at all times.', tip: 'Âm /θ/ trong "paths" /pɑːθs/; "at all times" nối âm /ətɔːl/.' },
      { t: 'The glasshouse contains plants from tropical forests.', tip: 'Nhấn "GLASShouse"; "tropical" /ˈtrɒpɪkəl/ nhấn âm đầu.' },
      { t: 'Some of these trees are more than two hundred years old.', tip: '"Some of" nối âm /sʌməv/; nhấn "TWO HUNdred".' },
      { t: 'Visitors are welcome to take photographs, but they must not pick the flowers.', tip: 'Nhấn tương phản "WELcome" và "must NOT"; "photographs" nhấn âm đầu /ˈfəʊtəɡrɑːfs/.' },
      { t: 'The café near the lake serves lunch until half past two in the afternoon.', tip: 'Câu dài – ngắt sau "lake"; "half past two" theo cách nói giờ của Anh.' },
    ],
  });

  /* ===================================================================
   * SPEAKING · Take an Interview
   * =================================================================== */
  TF.speaking.push({
    id: 'tf2-iv1', set: 2, task: 'interview', title: 'Technology in Everyday Life', seconds: 45, accent: 'en-US',
    context: 'A researcher is interviewing young adults about how they use technology. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'To begin, what is one app or device that you use every day, and what do you use it for?',
        model: "I use a calendar app on my phone every single day. I put all my classes, deadlines, and work shifts into it, and it reminds me about thirty minutes before each one. Before I started using it, I sometimes forgot assignments, so it has really helped me stay organized.",
        tip: 'Gọi tên một ứng dụng/thiết bị cụ thể, nói dùng để làm gì và lợi ích. Kết bằng so sánh trước – sau giúp câu trả lời có chiều sâu.' },
      { q: 'Do you prefer to shop online or in physical stores? Why?',
        model: "For most things, I prefer shopping online, because it saves time and I can compare prices easily. However, when I buy clothes or shoes, I'd rather go to a store, since I want to try them on first. Returning items that don't fit is usually more trouble than it's worth.",
        tip: 'Nêu lựa chọn chính + lý do, rồi thêm ngoại lệ với "However…". Dùng "I\'d rather…" để đa dạng cấu trúc.' },
      { q: 'Some people believe that children under twelve should not have their own smartphones. What is your opinion?',
        model: "I mostly agree. Young children can easily become addicted to games and social media, and they may see content that isn't suitable for them. That said, a simple phone for calling parents can be useful for safety. So I think children should have a basic phone, but not a smartphone with full internet access until they're older.",
        tip: 'Câu hỏi quan điểm: đồng ý/không đồng ý, đưa lý do, thừa nhận mặt còn lại ("That said…"), rồi kết bằng đề xuất cân bằng.' },
      { q: 'In your opinion, how will technology change the way students learn in the future?',
        model: "I think learning will become much more personalized. AI tutors will probably be able to notice what each student finds difficult and give extra practice on exactly those topics. Teachers will still be important, though, because they motivate students and help them work together. I expect classrooms to combine both.",
        tip: 'Câu hỏi dự đoán: dùng "will probably", "I expect…". Một dự đoán chính + ví dụ + một ý cân bằng là đủ cho 45 giây.' },
    ],
  });
  TF.speaking.push({
    id: 'tf2-iv2', set: 2, task: 'interview', title: 'Travel and Tourism', seconds: 45, accent: 'en-GB',
    context: 'A tourism board is interviewing people about their travel habits. Answer each question. You will have about 45 seconds for each answer.',
    questions: [
      { q: 'Could you describe a trip that you particularly enjoyed?',
        model: "Last year I went to Da Lat with three friends from university. We rented bicycles and rode around the lakes and pine forests, and in the evenings we tried street food at the night market. What I enjoyed most was the cool weather, because it was such a nice change from the heat in my city.",
        tip: 'Kể ngắn gọn: đi đâu, với ai, làm gì, và điều thích nhất. Dùng thì quá khứ nhất quán.' },
      { q: 'When you travel, do you prefer to plan everything in advance or decide things as you go?',
        model: "I usually plan the important things in advance, like transport and accommodation, because prices go up at the last minute. But I don't like having a strict schedule for every day. Some of my best experiences happened when we just followed a local person's recommendation.",
        tip: 'Có thể chọn "kết hợp" nhưng phải nói rõ phần nào lên kế hoạch, phần nào linh hoạt và vì sao.' },
      { q: 'Some people say that tourism does more harm than good to popular destinations. Do you agree?',
        model: "I don't fully agree. It's true that too many tourists can cause pollution and make housing expensive for local residents. But tourism also creates jobs and helps preserve historic sites, because there's money to maintain them. I think the solution is to manage it better, for example by limiting visitor numbers at the busiest places.",
        tip: 'Thừa nhận tác hại ("It\'s true that…"), nêu lợi ích ("But…"), rồi đề xuất giải pháp cụ thể.' },
      { q: 'If you could visit any country in the world, where would you go, and why?',
        model: "I would love to visit New Zealand. I've seen many photos of its mountains and lakes, and I'd like to go hiking there. I'm also interested in learning about Maori culture, because I know very little about it. It would be a great chance to practise my English, too.",
        tip: 'Câu điều kiện loại 2: "If I could…, I would…". Đưa 2–3 lý do cụ thể (thiên nhiên, văn hóa, luyện tiếng Anh).' },
    ],
  });

  /* ===================================================================
   * Xoay vị trí đáp án đúng (chỉ các unit của bộ 2): dữ liệu soạn với a = 0,
   * xoay theo mẫu cố định cho từng dạng bài → A/B/C/D phân bố đều.
   * Cờ _rot ngăn xoay lặp (data1 cũng dùng cờ này).
   * =================================================================== */
  const PAT = [1, 3, 0, 2, 2, 0, 3, 1, 0, 1, 2, 3];
  const counter = {};
  [...TF.reading, ...TF.listening].filter(u => /^tf2-/.test(u.id)).forEach(u => (u.groups || []).forEach(gr => {
    if (gr.type !== 'mcq' || gr._rot) return; gr._rot = 1;
    gr.items.forEach(it => {
      const k = counter[u.task] = (counter[u.task] || 0) + 1;
      const n = it.options.length, want = PAT[(k - 1) % PAT.length] % n, r = (it.a - want + n) % n;
      if (r) { it.options = it.options.slice(r).concat(it.options.slice(0, r)); it.a = want; }
    });
  }));
})(typeof self !== 'undefined' ? self : this);
