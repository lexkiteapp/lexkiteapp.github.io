/* TOEIC Reading – Test 9 (tự biên soạn) */
(function (g) {
  const T = g.TOEIC = g.TOEIC || { reading: [], listening: [] };
  T.reading.push({ id: 'tr9', test: 9, title: 'TOEIC Reading Test 9', parts: [

    /* ================= PART 5 ================= */
    { part: 5, title: 'Incomplete Sentences', instr: g.TQR[2],
      groups: [ { type: 'mcq', instr: '', items: [
        { n: 101, lv: 'B1', q: 'Attendees can access the session recordings ------- through the conference app after the event.', options: ['easy', 'easily', 'ease', 'easier'], a: 1, cue: 'access the session recordings',
          explain: 'Cần trạng từ bổ nghĩa cho động từ "access" → "easily" (một cách dễ dàng). "easy" là tính từ, "ease" là danh từ, "easier" là dạng so sánh hơn của tính từ.' },
        { n: 102, lv: 'B1', q: 'Mr. Okafor will personally greet the guests and introduce ------- to each table.', options: ['he', 'him', 'his', 'himself'], a: 3, cue: 'introduce -------',
          explain: 'Chủ ngữ và tân ngữ cùng chỉ một người (ông Okafor tự giới thiệu bản thân) → đại từ phản thân "himself". "he" là đại từ chủ ngữ, "him" chỉ một người khác, "his" là tính từ sở hữu cần danh từ theo sau.' },
        { n: 103, lv: 'B2', q: 'The construction crew ------- the roof of the east wing by the time the winter storms arrive.', options: ['will have finished', 'finished', 'is finished', 'finishing'], a: 0, cue: 'by the time the winter storms arrive',
          explain: '"by the time + mệnh đề hiện tại" chỉ mốc tương lai, hành động phải hoàn tất trước mốc đó → tương lai hoàn thành "will have finished". "finished" (quá khứ) sai thì; "is finished" thiếu tân ngữ và sai nghĩa; "finishing" không phải động từ chính.' },
        { n: 104, lv: 'B2', q: '------- the new tram line opens, commuters from Eastgate will save about twenty minutes each way.', options: ['During', 'Despite', 'Once', 'Throughout'], a: 2, cue: 'the new tram line opens',
          explain: 'Theo sau là một mệnh đề (S + V: "the new tram line opens") nên cần liên từ → "Once" (khi, ngay khi). "During", "Despite", "Throughout" là giới từ, chỉ đi với cụm danh từ.' },
        { n: 105, lv: 'B1', q: 'Students may ------- for a refund of the laboratory fee within thirty days of enrolling.', options: ['pay', 'apply', 'charge', 'reserve'], a: 1, cue: 'for a refund of the laboratory fee',
          explain: 'Collocation "apply for" (xin, đề nghị được hưởng) → "apply for a refund" (xin hoàn tiền). "pay for a refund", "charge for a refund", "reserve for a refund" không tạo thành cụm có nghĩa.' },
        { n: 106, lv: 'B2', q: "The agency's new campaign is intended to ------- awareness of the city's recycling program.", options: ['raise', 'rise', 'arise', 'reach'], a: 0, cue: "awareness of the city's recycling program",
          explain: 'Collocation "raise awareness" (nâng cao nhận thức). "rise" và "arise" là nội động từ, không nhận tân ngữ; "reach awareness" không phải cụm quen thuộc.' },
        { n: 107, lv: 'B1', q: 'The power outage on Maple Street was caused ------- a fallen tree on the main line.', options: ['of', 'at', 'for', 'by'], a: 3, cue: 'was caused -------',
          explain: 'Bị động "be caused by + nguyên nhân" (do cái gì gây ra) → "by". "of", "at", "for" không đi sau "caused" để chỉ nguyên nhân.' },
        { n: 108, lv: 'B2', q: 'Customers ------- orders after 8:00 P.M. will receive them on the next business day.', options: ['place', 'placed', 'placing', 'places'], a: 2, cue: 'Customers ------- orders',
          explain: 'Câu đã có động từ chính "will receive", nên chỗ trống cần phân từ rút gọn mệnh đề quan hệ chủ động (= who place) → "placing". "place" và "places" là động từ chia, tạo thêm động từ chính thứ hai; "placed" mang nghĩa bị động, không hợp (khách hàng đặt đơn chứ không bị đặt).' },
        { n: 109, lv: 'B1', q: 'Please keep your receipt as ------- of purchase in case you need to return the item.', options: ['proof', 'prove', 'proving', 'provable'], a: 0, cue: 'as ------- of purchase',
          explain: 'Sau "as" và trước "of purchase" cần danh từ → "proof" (bằng chứng): "proof of purchase" (chứng từ mua hàng). "prove" là động từ, "proving" là V-ing, "provable" là tính từ.' },
        { n: 110, lv: 'B2', q: 'The list of attendees, along with the speaker biographies, ------- posted on the conference Web site.', options: ['are', 'were', 'have been', 'has been'], a: 3, cue: 'The list of attendees, along with the speaker biographies',
          explain: 'Chủ ngữ chính là "The list" (số ít); cụm "along with ..." không làm đổi số của động từ → "has been posted". "are", "were", "have been" đều là dạng số nhiều.' },
        { n: 111, lv: 'B2', q: 'Kestrel Rail has ------- its weekend timetable to add more late-night departures.', options: ['resolved', 'conducted', 'revised', 'awarded'], a: 2, cue: 'its weekend timetable to add more late-night departures',
          explain: '"revised its timetable" (điều chỉnh lịch chạy) hợp nghĩa với việc thêm chuyến đêm muộn. "resolved" (giải quyết), "conducted" (tiến hành), "awarded" (trao tặng) không đi với "timetable".' },
        { n: 112, lv: 'B1', q: 'Passengers ------- tickets were purchased online can board through the priority gate.', options: ['who', 'whose', 'whom', 'which'], a: 1, cue: 'tickets were purchased online',
          explain: 'Quan hệ sở hữu (vé của hành khách) đứng trước danh từ "tickets" → "whose". "who" và "whom" không đứng trước danh từ để chỉ sở hữu; "which" dùng cho vật, không thay cho người.' },
        { n: 113, lv: 'B1', q: 'The new mobile app allows riders to ------- their bus arrival times in real time.', options: ['declare', 'submit', 'argue', 'track'], a: 3, cue: 'their bus arrival times in real time',
          explain: '"track arrival times in real time" (theo dõi giờ xe đến theo thời gian thực) hợp ngữ cảnh ứng dụng di động. "declare" (tuyên bố), "submit" (nộp), "argue" (tranh cãi) không hợp nghĩa.' },
        { n: 114, lv: 'B1', q: 'Harlow Pharmaceuticals supplies medical equipment ------- more than 200 hospitals across the region.', options: ['to', 'at', 'on', 'from'], a: 0, cue: 'supplies medical equipment',
          explain: '"supply something to somebody" (cung cấp cái gì cho ai) → "to". "at", "on", "from" không tạo nghĩa cung cấp thiết bị cho bệnh viện.' },
        { n: 115, lv: 'C1', q: 'Should the delivery ------- delayed, please notify our dispatch office immediately.', options: ['is', 'be', 'been', 'being'], a: 1, cue: 'Should the delivery',
          explain: 'Câu điều kiện đảo ngữ "Should + chủ ngữ + động từ nguyên mẫu" (= If the delivery is delayed) → "be delayed". "is", "been", "being" không dùng sau "Should + chủ ngữ".' },
        { n: 116, lv: 'B1', q: 'Of the three contractors, Dunmore Builders submitted the ------- estimate.', options: ['low', 'lower', 'lowest', 'lowly'], a: 2, cue: 'Of the three contractors',
          explain: '"Of the three" và mạo từ "the" → so sánh nhất "the lowest" (thấp nhất). "low" là dạng nguyên, "lower" dùng khi so sánh hai đối tượng (kèm "than"), "lowly" nghĩa là hèn mọn.' },
        { n: 117, lv: 'B2', q: 'The foundation is considering ------- its annual gala to a larger venue.', options: ['moving', 'to move', 'move', 'moved'], a: 0, cue: 'is considering -------',
          explain: '"consider + V-ing" (cân nhắc làm gì) → "moving". "to move", "move", "moved" không theo sau "consider".' },
        { n: 118, lv: 'B2', q: 'Because of the ------- of the work, the contractor requested two additional weeks.', options: ['complex', 'complexly', 'complexed', 'complexity'], a: 3, cue: 'Because of the -------',
          explain: 'Sau "the" và trước "of the work" cần danh từ → "complexity" (độ phức tạp). "complex" là tính từ, "complexly" là trạng từ, "complexed" không phải dạng dùng được ở đây.' },
        { n: 119, lv: 'B2', q: 'The pharmacy will ------- a ten percent discount on prescription refills for senior customers.', options: ['order', 'offer', 'occur', 'appear'], a: 1, cue: 'a ten percent discount on prescription refills',
          explain: '"offer a discount" (đưa ra mức giảm giá) → "offer". "order" nghĩa là đặt hàng/ra lệnh, "occur" và "appear" là nội động từ, không nhận tân ngữ.' },
        { n: 120, lv: 'C1', q: '------- the high demand, Brightline Energy has hired twenty new installers this spring.', options: ['Because', 'Whereas', 'Given', 'Although'], a: 2, cue: 'the high demand',
          explain: 'Theo sau là cụm danh từ "the high demand" → giới từ "Given" (xét đến, do). "Because", "Whereas", "Although" là liên từ, cần mệnh đề; "Whereas" và "Although" còn sai nghĩa.' },
        { n: 121, lv: 'B2', q: 'Employees are ------- to attend the safety briefing before the plant tour begins.', options: ['exceeded', 'proposed', 'committed', 'required'], a: 3, cue: 'to attend the safety briefing',
          explain: '"be required to + V" (bị bắt buộc phải làm gì) → "required". "exceeded" (vượt quá) và "proposed" (được đề xuất) không hợp cấu trúc này; "committed" đi với "to + V-ing".' },
        { n: 122, lv: 'C1', q: 'Not only ------- the new insulation lower heating costs, but it also makes the building quieter.', options: ['does', 'is', 'has', 'do'], a: 0, cue: 'Not only -------',
          explain: '"Not only" đứng đầu câu gây đảo ngữ; chủ ngữ số ít "the new insulation" và động từ chính "lower" ở dạng nguyên mẫu → trợ động từ "does". "do" sai số; "is" và "has" không đi với động từ nguyên mẫu "lower".' },
        { n: 123, lv: 'B2', q: "Ms. Ibarra's team will ------- the findings of the customer survey at Thursday's meeting.", options: ['prevent', 'recover', 'present', 'permit'], a: 2, cue: 'the findings of the customer survey',
          explain: '"present the findings" (trình bày kết quả khảo sát) → "present". "prevent" (ngăn chặn), "recover" (lấy lại), "permit" (cho phép) không hợp với "findings".' },
        { n: 124, lv: 'B2', q: 'There are ------- vacancies in the nursing department than there were last year.', options: ['few', 'fewer', 'least', 'fewest'], a: 1, cue: 'than there were last year',
          explain: 'Có "than" → so sánh hơn; "vacancies" là danh từ đếm được số nhiều → "fewer" (ít hơn). "few" là dạng nguyên, "least" dùng cho danh từ không đếm được, "fewest" là so sánh nhất.' },
        { n: 125, lv: 'B2', q: 'The restaurant, ------- opened only six months ago, has already received a regional award.', options: ['which', 'where', 'what', 'who'], a: 0, cue: 'opened only six months ago',
          explain: 'Mệnh đề quan hệ không xác định thay cho "The restaurant" (vật) và làm chủ ngữ của "opened" → "which". "where" chỉ nơi chốn và cần chủ ngữ riêng; "what" không đứng sau danh từ; "who" dùng cho người.' },
        { n: 126, lv: 'C1', q: "The charity's fundraising dinner ------- over $40,000, exceeding its target by a wide margin.", options: ['borrowed', 'owed', 'donated', 'raised'], a: 3, cue: 'exceeding its target by a wide margin',
          explain: '"raised over $40,000" (quyên góp được hơn 40.000 đô la) → "raised", hợp với việc vượt chỉ tiêu. "borrowed" (vay), "owed" (nợ), "donated" (tặng) không hợp với chủ ngữ là một buổi tiệc gây quỹ.' },
        { n: 127, lv: 'C1', q: "Applications will be considered ------- they are received by the registrar's office before the deadline.", options: ['even though', 'provided that', 'according to', 'instead of'], a: 1, cue: 'before the deadline',
          explain: 'Điều kiện "với điều kiện là" + mệnh đề → "provided that". "even though" (mặc dù) sai logic; "according to" và "instead of" là giới từ, không đi với mệnh đề.' },
        { n: 128, lv: 'B2', q: 'The maintenance supervisor is ------- for scheduling all elevator inspections.', options: ['responsive', 'respective', 'responsible', 'responding'], a: 2, cue: 'for scheduling all elevator inspections',
          explain: '"be responsible for + V-ing" (chịu trách nhiệm làm gì) → "responsible". "responsive" (nhạy bén) đi với "to"; "respective" (tương ứng) và "responding" không tạo cụm với "for".' },
        { n: 129, lv: 'C1', q: 'The company ------- all of its delivery vans with electric models since last January.', options: ['has been replacing', 'will be replacing', 'replaces', 'is replaced'], a: 0, cue: 'since last January',
          explain: '"since + mốc quá khứ" → hiện tại hoàn thành tiếp diễn "has been replacing". "will be replacing" là tương lai; "replaces" (hiện tại đơn) không đi với "since"; "is replaced" là bị động, trong khi câu có tân ngữ "all of its delivery vans".' },
        { n: 130, lv: 'B2', q: 'Please submit your expense report ------- Friday so that payments can be processed next week.', options: ['during', 'since', 'while', 'by'], a: 3, cue: 'so that payments can be processed next week',
          explain: '"by + mốc thời gian" = chậm nhất vào lúc đó → "by Friday" (nộp chậm nhất thứ Sáu). "during" đi với khoảng thời gian, "since" đi với thì hoàn thành, "while" là liên từ cần mệnh đề.' }
      ] } ] },

    /* ================= PART 6 ================= */
    { part: 6, title: 'Text Completion', instr: g.TQR[1],
      passages: [
        { title: 'E-mail', text:
`To: All new sales associates
From: Delphine Arkwright, Learning and Development
Date: August 18
Subject: Orientation workshop

Welcome to Halvorsen Retail Group! Your two-day orientation workshop will take place on September 8 and 9 at our training center, 410 Marlow Street. Sessions begin at 9:00 A.M. and -----(131)----- at 4:30 P.M. each day.

-----(132)-----. Lunch will be provided on both days, so please let us know about any dietary needs by August 29.

On the first day, you will learn about our product lines and customer service standards. On the second day, senior associates will -----(133)----- you through the point-of-sale system. Please bring a photo ID, -----(134)----- you will need it to receive your building access card.`,
          groups: [ { type: 'mcq', instr: g.TQR[12], items: [
            { n: 131, lv: 'B1', q: '(131)', options: ['conclusion', 'concluding', 'conclude', 'concluded'], a: 2, cue: 'Sessions begin at 9:00 A.M. and',
              explain: 'Hai động từ nối bằng "and" phải song song; chủ ngữ số nhiều "Sessions" + "begin … and conclude" → "conclude" (kết thúc). "conclusion" là danh từ; "concluding" và "concluded" không song song với "begin".' },
            { n: 132, lv: 'B2', q: '(132)', options: ['There is no charge for the workshop, and all materials will be supplied.', 'The orientation has been moved to a later date.', 'Our annual sales report is attached.', 'Applications for management positions close soon.'], a: 0, cue: 'Lunch will be provided on both days, so please let us know about any dietary needs by August 29.',
              explain: 'Câu sau nói bữa trưa được cung cấp cả hai ngày → câu cần điền cũng nói về những thứ được cung cấp: "no charge … all materials will be supplied" (miễn phí, có đủ tài liệu). Việc dời lịch mâu thuẫn với "September 8 and 9"; báo cáo đính kèm và tuyển quản lý lạc đề.' },
            { n: 133, lv: 'B2', q: '(133)', options: ['bring', 'pass', 'hold', 'guide'], a: 3, cue: 'through the point-of-sale system',
              explain: '"guide somebody through something" (hướng dẫn ai từng bước) → các nhân viên cấp cao hướng dẫn bạn dùng hệ thống bán hàng. "bring", "pass", "hold" không tạo cụm hợp nghĩa với "through the point-of-sale system".' },
            { n: 134, lv: 'B1', q: '(134)', options: ['although', 'because', 'unless', 'whereas'], a: 1, cue: 'you will need it to receive your building access card',
              explain: 'Mệnh đề sau nêu lý do phải mang giấy tờ tùy thân (để nhận thẻ ra vào) → "because" (vì). "although" (mặc dù), "unless" (trừ khi), "whereas" (trong khi) sai logic.' }
          ] } ] },
        { title: 'Notice', text:
`Notice of Water Service Interruption
Redfern Municipal Water Department

Crews will be replacing an aging water main on Quillan Avenue between Fifth and Ninth Streets. As a result, water service to homes and businesses in that area will be -----(135)----- from 8:00 A.M. to 2:00 P.M. on Tuesday, October 14.

Residents are advised to store enough water for drinking and cooking before the work begins. -----(136)-----, water may look cloudy for a short time after service is restored. This is harmless, and running the cold tap for a few minutes will clear it.

-----(137)-----. Restaurants and other businesses that cannot operate without water may call 555-0148 to arrange a tanker delivery.

We apologize for any -----(138)----- and thank you for your patience.`,
          groups: [ { type: 'mcq', instr: 'Questions 135-138 refer to the following notice.', items: [
            { n: 135, lv: 'B1', q: '(135)', options: ['interrupts', 'interrupted', 'interrupting', 'interruption'], a: 1, cue: 'water service to homes and businesses in that area will be',
              explain: 'Sau "will be" dùng phân từ quá khứ để tạo bị động: dịch vụ nước "will be interrupted" (sẽ bị gián đoạn). "interrupts" không đi sau "will be"; "interrupting" mang nghĩa chủ động, sai nghĩa; "interruption" là danh từ, thiếu mạo từ.' },
            { n: 136, lv: 'B2', q: '(136)', options: ['Instead', 'For example', 'Consequently', 'In addition'], a: 3, cue: 'water may look cloudy for a short time after service is restored',
              explain: 'Câu này nêu thêm một lưu ý nữa (nước có thể đục) bên cạnh lời khuyên trữ nước → "In addition" (ngoài ra). "Instead" (thay vào đó), "For example" (ví dụ), "Consequently" (do đó) không hợp mạch.' },
            { n: 137, lv: 'B2', q: '(137)', options: ['The water department was established in 1952.', 'Water rates will rise next January.', 'Free bottled water will be available at the fire station on Quillan Avenue during the shutoff.', 'Residents on Fifth Street should replace their water filters.'], a: 2, cue: 'Restaurants and other businesses that cannot operate without water may call 555-0148 to arrange a tanker delivery.',
              explain: 'Câu sau nói doanh nghiệp có thể gọi để nhờ xe bồn chở nước → câu trước cũng phải nói về nguồn nước thay thế trong lúc cắt nước: "Free bottled water will be available …" (có nước đóng chai miễn phí). Năm thành lập, giá nước tăng và thay bộ lọc đều lạc đề.' },
            { n: 138, lv: 'B1', q: '(138)', options: ['inconvenience', 'inconvenient', 'inconveniently', 'inconvenienced'], a: 0, cue: 'We apologize for any',
              explain: 'Sau "any" và giới từ "for" cần danh từ → "inconvenience" (sự bất tiện): "apologize for any inconvenience". "inconvenient" là tính từ, "inconveniently" là trạng từ, "inconvenienced" là phân từ.' }
          ] } ] },
        { title: 'Article', text:
`PORTSMOUTH-ON-DEE (March 3) – Chef Imani Castellano will open her long-awaited restaurant, Saltgrass Kitchen, on Harbor Row on March 22. The 60-seat restaurant -----(139)----- regional seafood and vegetables from nearby farms.

Ms. Castellano spent ten years cooking in Lisbon and Chicago before returning home. -----(140)-----. "I want people to feel comfortable stopping in on a Tuesday night, not just for special occasions," she said.

Saltgrass will also -----(141)----- a catering service for weddings and corporate events, starting in June. Reservations -----(142)----- through the restaurant's Web site, and the opening menu will be posted there next week.`,
          groups: [ { type: 'mcq', instr: g.TQR[6], items: [
            { n: 139, lv: 'B2', q: '(139)', options: ['will feature', 'featured', 'featuring', 'to feature'], a: 0, cue: 'regional seafood and vegetables from nearby farms',
              explain: 'Câu cần động từ chính chia ở thì tương lai (nhà hàng sắp khai trương) → "will feature" (sẽ có món…). "featured" sai thì; "featuring" và "to feature" không phải động từ chia nên câu thiếu động từ chính.' },
            { n: 140, lv: 'B2', q: '(140)', options: ['The restaurant will be closed on Mondays.', 'Prices for the lunch menu have not yet been set.', 'Her goal is to create a neighborhood restaurant rather than a formal dining destination.', 'Reservations can be made by telephone only.'], a: 2, cue: 'I want people to feel comfortable stopping in on a Tuesday night',
              explain: 'Câu sau là lời trích của bà muốn khách thấy thoải mái ghé vào tối thường → câu cần điền nêu mục tiêu: "neighborhood restaurant rather than a formal dining destination" (nhà hàng của khu phố, không phải nơi sang trọng). Đóng cửa thứ Hai, giá bữa trưa không dẫn vào lời trích; "telephone only" còn mâu thuẫn với việc đặt chỗ qua Web site.' },
            { n: 141, lv: 'B2', q: '(141)', options: ['inspect', 'launch', 'invite', 'depart'], a: 1, cue: 'a catering service for weddings and corporate events',
              explain: '"launch a catering service" (tung ra dịch vụ ăn uống theo hợp đồng) → "launch". "inspect" (kiểm tra), "invite" (mời) không hợp với tân ngữ này; "depart" (khởi hành) là nội động từ.' },
            { n: 142, lv: 'C1', q: '(142)', options: ['accepting', 'accepted', 'will accept', 'are being accepted'], a: 3, cue: "through the restaurant's Web site",
              explain: 'Chủ ngữ "Reservations" (việc đặt chỗ) là đối tượng được nhận → bị động tiếp diễn "are being accepted". "will accept" mang nghĩa chủ động, sai chủ ngữ; "accepting" và "accepted" thiếu trợ động từ nên câu không có động từ chính.' }
          ] } ] },
        { title: 'Letter', text:
`Dear Friend of the Greenhaven Youth Library,

Thank you for your generous gift of $150 to our summer reading campaign. Because of supporters like you, we -----(143)----- more than 2,000 books to children in Greenhaven's public schools so far this year.

Your contribution is tax-deductible, and the enclosed receipt -----(144)----- for your records.

We invite you to our Autumn Gala on October 11 at the Wexford Hotel. -----(145)-----. All proceeds will fund new computers for our reading rooms.

We look forward to -----(146)----- you at the gala.

Sincerely,
Beatriz Montoya
Executive Director`,
          groups: [ { type: 'mcq', instr: g.TQR[13], items: [
            { n: 143, lv: 'C1', q: '(143)', options: ['distribute', 'distributes', 'were distributing', 'have distributed'], a: 3, cue: 'so far this year',
              explain: '"so far this year" (tính đến nay trong năm) → hiện tại hoàn thành "have distributed", chủ ngữ "we". "distribute" và "distributes" không diễn tả kết quả tính đến nay (và "distributes" sai số); "were distributing" là quá khứ tiếp diễn, không đi với "so far".' },
            { n: 144, lv: 'C1', q: '(144)', options: ['keep', 'should be kept', 'is keeping', 'kept'], a: 1, cue: 'the enclosed receipt',
              explain: 'Chủ ngữ "the enclosed receipt" (biên nhận) là vật được giữ lại → bị động "should be kept for your records" (nên được lưu lại). "keep" và "is keeping" chủ động, sai nghĩa; "kept" thiếu trợ động từ nên không làm động từ chính.' },
            { n: 145, lv: 'B2', q: '(145)', options: ['Tickets are $60 and include dinner and live music.', 'The library will be closed for renovation in November.', 'Your receipt is enclosed with this letter.', 'Many volunteers have joined us this year.'], a: 0, cue: 'All proceeds will fund new computers for our reading rooms.',
              explain: 'Câu sau nói "All proceeds" (toàn bộ số tiền thu được) → câu trước phải nói về nguồn thu của buổi gala, tức giá vé: "Tickets are $60 …". Việc đóng cửa thư viện, biên nhận (đã nhắc ở đoạn trên) và tình nguyện viên không liên quan đến "proceeds".' },
            { n: 146, lv: 'B1', q: '(146)', options: ['see', 'seen', 'seeing', 'saw'], a: 2, cue: 'We look forward to',
              explain: '"look forward to + V-ing" (mong được làm gì) → "seeing". "see", "seen", "saw" không đi sau "look forward to" (ở đây "to" là giới từ).' }
          ] } ] }
      ] },

    /* ================= PART 7 ================= */
    { part: 7, title: 'Reading Comprehension', instr: g.TQR[0],
      passages: [
        { title: 'Notice', text:
`NOTICE TO TENANTS – Calloway Business Center

Beginning Monday, November 3, contractors will resurface the parking garage on Levels 1 and 2. Work will be done in sections so that part of each level remains open, but about 60 spaces will be unavailable at any time. The project is expected to last three weeks.

Tenants who normally park on Level 1 are asked to use Level 3 or the surface lot behind the building during this period. To reduce congestion at the entrance, the garage's main gate will open at 7:00 A.M. instead of 7:30 A.M.

Please be aware that the work will involve some noise between 9:00 A.M. and 3:00 P.M. Tenants who would like to arrange a temporary parking space for visitors may contact the property manager, Lars Eklund, at extension 214.`,
          groups: [ { type: 'mcq', instr: g.TQR[14], items: [
            { n: 147, lv: 'B1', q: g.TQR[19], options: ['To request payment of parking fees', 'To inform tenants of upcoming garage work', 'To introduce a new property manager', 'To explain a change in a bus route'], a: 1, cue: 'contractors will resurface the parking garage on Levels 1 and 2',
              explain: 'Thông báo cho biết "contractors will resurface the parking garage on Levels 1 and 2" (nhà thầu sẽ trải lại mặt sàn bãi xe tầng hầm) → thông báo về công việc sắp diễn ra ở bãi xe. Không có yêu cầu trả phí đỗ xe, quản lý mới hay tuyến xe buýt.' },
            { n: 148, lv: 'B1', q: 'What are tenants who usually park on Level 1 asked to do?', options: ['Pay a temporary fee', 'Carpool with colleagues', 'Leave before 7:00 A.M.', 'Use a different parking area'], a: 3, cue: 'are asked to use Level 3 or the surface lot behind the building',
              explain: 'Người thường đậu xe ở Level 1 "are asked to use Level 3 or the surface lot behind the building" (được đề nghị dùng tầng 3 hoặc bãi xe phía sau) → đổi sang khu đậu xe khác. Không nhắc phí tạm thời hay đi chung xe; 7:00 A.M. chỉ là giờ cổng mở sớm hơn, không phải giờ phải rời đi.' }
          ] } ] },
        { title: 'Text-message chain', text:
`Pavel Dragan [10:42 A.M.]: Hi Rosalind. We just got the final headcount for Friday's partners' luncheon. It's 48, not 40.
Rosalind Quist [10:44 A.M.]: Thanks for letting me know. That's fine, but I'll need to adjust the order with our kitchen by 1:00 P.M. today.
Pavel Dragan [10:45 A.M.]: Understood. Are the vegetarian options still in the plan?
Rosalind Quist [10:47 A.M.]: Yes. We're planning on six vegetarian plates, as you requested. With eight more guests, would you like to increase that number?
Pavel Dragan [10:49 A.M.]: Let me check with the partners. Can I get back to you by noon?
Rosalind Quist [10:50 A.M.]: Of course. Also, our servers will arrive at 11:00 A.M. for setup. Will the conference room be open then?
Pavel Dragan [10:52 A.M.]: I'll ask building security to unlock it at 10:45 to be safe.
Rosalind Quist [10:53 A.M.]: Perfect. That would help.`,
          groups: [ { type: 'mcq', instr: 'Questions 149-151 refer to the following text-message chain.', items: [
            { n: 149, lv: 'B1', q: 'Why does Mr. Dragan contact Ms. Quist?', options: ['To report a change in the number of guests', 'To cancel a lunch order', 'To ask about vegetarian prices', 'To request a different venue'], a: 0, cue: "It's 48, not 40.",
              explain: 'Ông Dragan báo "It\'s 48, not 40" (48 người chứ không phải 40) → số khách thay đổi. Ông không hủy đơn, không hỏi giá món chay và không đổi địa điểm.' },
            { n: 150, lv: 'B2', q: 'At 10:50 A.M., what does Ms. Quist most likely mean when she writes, "Of course"?', options: ['She will arrive early for the setup.', 'She will order more vegetarian plates.', 'She is willing to wait until noon for an answer.', 'She can unlock the conference room.'], a: 2, cue: 'Can I get back to you by noon?',
              explain: 'Ông Dragan hỏi "Can I get back to you by noon?" (tôi trả lời bà trước 12 giờ trưa được không?) → "Of course" nghĩa là bà đồng ý chờ đến trưa. Việc đến sớm, đặt thêm món chay hay mở phòng không phải điều bà đang đáp lại.' },
            { n: 151, lv: 'B1', q: 'What does Mr. Dragan offer to arrange?', options: ['Additional servers', 'A revised menu', 'Early access to a conference room', 'A parking permit'], a: 2, cue: "I'll ask building security to unlock it at 10:45",
              explain: 'Ông viết "I\'ll ask building security to unlock it at 10:45" (sẽ nhờ bảo vệ mở khóa phòng lúc 10:45) → cho nhân viên vào phòng hội nghị sớm hơn giờ dự kiến 11:00. Không nhắc thêm nhân viên phục vụ, thực đơn sửa đổi hay giấy phép đỗ xe.' }
          ] } ] },
        { title: 'Advertisement', text:
`Is your brand getting lost in the noise?
Northgate Creative – Branding and Digital Marketing for Growing Businesses

For over twelve years, Northgate Creative has helped small and mid-sized companies stand out. Our team of designers, writers, and data analysts builds campaigns that are as measurable as they are memorable.

What we offer:
• Brand Audit – a two-week review of your logo, messaging, and customer feedback (flat fee of $1,800)
• Social Media Management – monthly plans starting at $950
• Website Redesign – custom quotes based on the number of pages

New this spring: Book any service before April 30 and receive a free one-hour consultation with our creative director, Tamsin Okoro, to plan your next steps. Clients who refer a new customer to us will also receive a 10 percent credit toward future work.

Call 555-0173 to schedule a free introductory call. Our offices are open Monday through Friday, 8:30 A.M. to 5:30 P.M.`,
          groups: [ { type: 'mcq', instr: 'Questions 152-154 refer to the following advertisement.', items: [
            { n: 152, lv: 'B1', q: 'What is indicated about Northgate Creative?', options: ['It has been in business for more than ten years.', 'It works mainly with large corporations.', 'It recently opened a second office.', 'It is hiring additional data analysts.'], a: 0, cue: 'For over twelve years',
              explain: '"For over twelve years" (hơn mười hai năm) → công ty đã hoạt động hơn một thập kỷ. Công ty phục vụ doanh nghiệp "small and mid-sized", không phải tập đoàn lớn; quảng cáo không nhắc văn phòng thứ hai hay tuyển nhân viên.' },
            { n: 153, lv: 'B2', q: 'How can a client earn a credit toward future work?', options: ['By signing a two-year contract', 'By booking a brand audit', 'By attending a free workshop', 'By referring a new customer'], a: 3, cue: 'Clients who refer a new customer to us will also receive a 10 percent credit toward future work',
              explain: '"Clients who refer a new customer … will also receive a 10 percent credit" → giới thiệu khách hàng mới. Đặt dịch vụ trước 30/4 chỉ nhận buổi tư vấn miễn phí, không phải khoản tín dụng; không nhắc hợp đồng hai năm hay hội thảo.' },
            { n: 154, lv: 'B2', q: 'Which of the following services is NOT offered by Northgate Creative?', options: ['A brand audit', 'Print advertising', 'Social media management', 'Website redesign'], a: 1, cue: 'Social Media Management',
              explain: 'Danh sách dịch vụ gồm "Brand Audit", "Social Media Management" và "Website Redesign"; quảng cáo in ấn không được nhắc đến → "Print advertising" là đáp án không được cung cấp.' }
          ] } ] },
        { title: 'E-mail', text:
`To: Registered Attendees, Pinecrest Leadership Summit
From: Odalys Brandt, Event Coordinator
Date: September 2
Subject: Important information for your arrival

Dear attendees,

Thank you for registering for the Pinecrest Leadership Summit, which will be held September 24–26 at the Lakeshore Conference Hotel. —[1]— We are pleased to report that more than 400 professionals from 18 countries will be joining us.

Check-in will open at 7:30 A.M. on Wednesday, September 24, in the hotel's main lobby. Please bring a photo ID to collect your badge and program. —[2]— Attendees who arrive after 5:00 P.M. may collect these items at the hotel's front desk.

Because of limited space, workshop seats are assigned on a first-come, first-served basis. You may select up to three workshops by logging in to your account on the summit Web site before September 15. —[3]— Those who do not make a selection by then will be placed in sessions that still have openings.

A limited number of rooms are available at a discounted summit rate of $149 per night. To receive this rate, you must reserve your room by September 10 and mention the summit when booking. —[4]—

We look forward to seeing you in Lakeshore.`,
          groups: [ { type: 'mcq', instr: 'Questions 155-158 refer to the following e-mail.', items: [
            { n: 155, lv: 'B1', q: 'Why did Ms. Brandt write to the attendees?', options: ['To request payment of a registration fee', 'To provide details about an upcoming event', 'To announce a change of venue', 'To recruit workshop speakers'], a: 1, cue: 'Thank you for registering for the Pinecrest Leadership Summit',
              explain: 'Thư cảm ơn việc đăng ký rồi cung cấp thông tin về nhận thẻ, chọn hội thảo và đặt phòng → cung cấp chi tiết về một sự kiện sắp tới. Thư không đòi lệ phí, không đổi địa điểm và không tuyển diễn giả.' },
            { n: 156, lv: 'B2', q: 'What will happen if an attendee does not choose workshops by September 15?', options: ['The attendee will be assigned to an available session.', "The attendee's registration will be canceled.", 'The attendee will be charged a late fee.', 'The attendee will receive a refund.'], a: 0, cue: 'Those who do not make a selection by then will be placed in sessions that still have openings.',
              explain: '"Those who do not make a selection by then will be placed in sessions that still have openings" → người không chọn sẽ được xếp vào buổi còn chỗ trống. Thư không nói đến việc hủy đăng ký, phí trễ hạn hay hoàn tiền.' },
            { n: 157, lv: 'C1', q: 'In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? "Rooms not reserved by that date will be offered at the regular rate."', options: ['[1]', '[2]', '[3]', '[4]'], a: 3, cue: 'you must reserve your room by September 10 and mention the summit when booking',
              explain: '"that date" phải chỉ một ngày đã nêu → 10/9, hạn đặt phòng giá ưu đãi ở đoạn cuối; câu thêm vào nêu hậu quả của việc đặt trễ nên phải đứng ngay sau câu đó, tức vị trí [4]. Ba vị trí còn lại nói về đăng ký, thẻ tên và chọn hội thảo, không liên quan đến phòng.' },
            { n: 158, lv: 'B2', q: 'The word “collect” in the second paragraph is closest in meaning to', options: ['accumulate', 'save', 'pick up', 'repay'], a: 2, cue: 'Please bring a photo ID to collect your badge and program.',
              explain: '"collect your badge and program" = đến nhận thẻ tên và chương trình → "pick up" (lấy, nhận). "accumulate" (tích lũy), "save" (tiết kiệm), "repay" (hoàn trả) không hợp ngữ cảnh.' }
          ] } ] },
        { title: 'Article', text:
`Westmark to Add Late-Night Bus Service
By Ingrid Soleil

WESTMARK (June 12) – Starting July 7, the Westmark Transit Authority will extend service on its four busiest bus routes until 1:00 A.M. on Friday and Saturday nights. —[1]— The decision follows a six-month pilot program in which Route 12, which links the university district to the downtown entertainment area, carried an average of 340 riders per night.

"Many shift workers and students told us they were stranded when events ended late," said director Hector Valdivia. "We heard that message loudly." —[2]—

The late service will be paid for in part by a $1.2 million state grant. Fares will stay the same, but riders will need to purchase tickets before boarding on late-night routes because drivers will not carry change after 10:00 P.M. —[3]— Tickets may be bought through the Westmark Go app or at any of the 60 vending machines located at major stops.

Authority officials noted that the program is not permanent. —[4]— Ridership will be reviewed in December, and routes with fewer than 100 riders per night may be discontinued.`,
          groups: [ { type: 'mcq', instr: 'Questions 159-162 refer to the following article.', items: [
            { n: 159, lv: 'B1', q: g.TQR[3], options: ['A plan to extend bus service at night', 'A fare increase on major routes', 'The results of a rider survey', 'The opening of a new bus route'], a: 0, cue: 'will extend service on its four busiest bus routes until 1:00 A.M.',
              explain: 'Câu mở đầu: Cơ quan vận tải "will extend service on its four busiest bus routes until 1:00 A.M." (sẽ kéo dài giờ chạy đến 1 giờ sáng) → kế hoạch mở rộng dịch vụ xe buýt ban đêm. Giá vé giữ nguyên, khảo sát chỉ là thông tin phụ, và không có tuyến mới.' },
            { n: 160, lv: 'B2', q: 'What will riders need to do on late-night buses?', options: ['Show a student identification card', 'Pay the driver exact change', 'Reserve a seat by telephone', 'Buy a ticket before boarding'], a: 3, cue: 'riders will need to purchase tickets before boarding on late-night routes',
              explain: '"riders will need to purchase tickets before boarding" → phải mua vé trước khi lên xe. Tài xế "will not carry change" nên không trả tiền mặt trên xe; không nhắc thẻ sinh viên hay đặt chỗ bằng điện thoại.' },
            { n: 161, lv: 'C1', q: 'In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? "Several options for buying them will be available."', options: ['[1]', '[2]', '[3]', '[4]'], a: 2, cue: 'Tickets may be bought through the Westmark Go app or at any of the 60 vending machines located at major stops.',
              explain: '"them" phải chỉ danh từ số nhiều đã nêu → "tickets" ở câu trước vị trí [3]; câu sau liệt kê các cách mua (ứng dụng, máy bán vé) nên câu thêm vào làm cầu nối, đặt ở [3]. Ở các vị trí khác không có danh từ số nhiều nào để "them" thay thế.' },
            { n: 162, lv: 'B2', q: 'What will happen in December?', options: ['The state grant will be renewed.', 'Ridership numbers will be evaluated.', 'A fare increase will take effect.', 'Route 12 will be extended.'], a: 1, cue: 'Ridership will be reviewed in December',
              explain: '"Ridership will be reviewed in December" → số lượng hành khách sẽ được xem xét, đánh giá. Bài không nói gia hạn khoản trợ cấp, tăng giá vé; Route 12 chỉ được nhắc trong chương trình thử nghiệm.' }
          ] } ] },
        { title: 'Memo', text:
`MEMO
To: All Faculty and Department Administrators
From: Office of the Registrar
Date: November 10
Re: Changes to final grade submission

Beginning with the winter term, final grades must be submitted through the new Student Records Portal rather than by e-mail to the Registrar's Office. —[1]— The change is intended to reduce errors and to speed up the release of grades to students.

Instructors will receive login instructions by e-mail on December 1. —[2]— Those who have not received them by December 5 should contact the IT Service Desk. All grades must be entered no later than 5:00 P.M. on January 12. —[3]— Late submissions will delay students' access to their transcripts and may affect scholarship decisions.

Training sessions will be offered on December 8 and 9 in Hartley Hall, Room 204. —[4]— Faculty who cannot attend may view a recorded tutorial on the registrar's Web page.`,
          groups: [ { type: 'mcq', instr: 'Questions 163-165 refer to the following memo.', items: [
            { n: 163, lv: 'B1', q: g.TQR[11], options: ['To announce a new way of submitting grades', 'To request changes to a transcript', 'To explain a scholarship process', 'To schedule a staff meeting'], a: 0, cue: 'final grades must be submitted through the new Student Records Portal',
              explain: 'Từ học kỳ mùa đông, "final grades must be submitted through the new Student Records Portal" (điểm cuối kỳ phải nộp qua cổng thông tin mới) → thông báo cách nộp điểm mới. Bảng điểm và học bổng chỉ nhắc như hệ quả; không có cuộc họp nào được lên lịch.' },
            { n: 164, lv: 'C1', q: 'What can be inferred about instructors who cannot attend a training session?', options: ['They will lose access to the portal.', 'They must submit grades by e-mail.', 'They will be asked to repeat the course.', 'They can learn the system on their own time.'], a: 3, cue: "Faculty who cannot attend may view a recorded tutorial on the registrar's Web page.",
              explain: '"Faculty who cannot attend may view a recorded tutorial" → giảng viên vắng buổi tập huấn có thể xem video hướng dẫn, tự học vào lúc thuận tiện. Không có chuyện mất quyền truy cập; việc nộp điểm qua e-mail đã bị thay thế; "repeat the course" không được nhắc.' },
            { n: 165, lv: 'C1', q: 'In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? "Extensions will be granted only in cases of documented illness."', options: ['[1]', '[2]', '[3]', '[4]'], a: 2, cue: 'All grades must be entered no later than 5:00 P.M. on January 12.',
              explain: '"Extensions" (gia hạn) chỉ có nghĩa sau khi đã nêu một hạn chót → đặt sau câu "All grades must be entered no later than … January 12", ngay trước câu cảnh báo hậu quả của việc nộp muộn, tức vị trí [3]. Các vị trí khác chưa có hạn chót nào để gia hạn.' }
          ] } ] },
        { title: 'Online chat discussion', text:
`Joaquim Reis [1:05 P.M.]: Hi all. The solar installation at Dunmore Elementary School is on hold. The utility says our interconnection permit is still pending.
Yara Haddad [1:07 P.M.]: Again? They told us it would be approved by the 15th.
Joaquim Reis [1:08 P.M.]: I know. Now they say a final inspection must be done before they will issue it.
Colin Bayless [1:10 P.M.]: Can the panels be installed in the meantime? Just not connected?
Joaquim Reis [1:11 P.M.]: Yes, that's what I'm proposing. We'd finish the roof work this week and wire everything up once the permit arrives.
Yara Haddad [1:13 P.M.]: The school principal won't love another delay, but at least the crew stays busy.
Colin Bayless [1:14 P.M.]: I'll call the utility's permitting office tomorrow and ask them to schedule the inspection for Monday.
Joaquim Reis [1:15 P.M.]: Thanks, Colin. I'll update the school tonight.`,
          groups: [ { type: 'mcq', instr: 'Questions 166-168 refer to the following online chat discussion.', items: [
            { n: 166, lv: 'B1', q: 'What problem does Mr. Reis report?', options: ['Some solar panels are damaged.', 'A permit has not yet been issued.', 'The school has changed its plans.', 'The crew is short of workers.'], a: 1, cue: 'our interconnection permit is still pending',
              explain: 'Ông Reis nói "our interconnection permit is still pending" (giấy phép kết nối lưới điện vẫn chưa xong) → giấy phép chưa được cấp. Tấm pin không hỏng, nhà trường không đổi kế hoạch và không ai nói thiếu nhân công.' },
            { n: 167, lv: 'B2', q: 'At 1:13 P.M., what does Ms. Haddad imply when she writes, "at least the crew stays busy"?', options: ['The crew will work overtime.', 'The crew needs more training.', 'The crew may be sent to another school.', 'The crew will have tasks to do during the delay.'], a: 3, cue: 'at least the crew stays busy',
              explain: 'Ông Reis đề xuất cứ lắp pin trên mái trước, nối điện sau khi có giấy phép; bà Haddad nói "at least the crew stays busy" (ít nhất đội thi công vẫn có việc) → đội vẫn có việc làm trong thời gian chờ. Không có ý làm thêm giờ, đào tạo hay điều sang trường khác.' },
            { n: 168, lv: 'B1', q: 'What will Mr. Bayless do tomorrow?', options: ['Contact a permitting office', 'Inspect the roof', 'Meet with the school principal', 'Order more panels'], a: 0, cue: "I'll call the utility's permitting office tomorrow",
              explain: 'Ông Bayless viết "I\'ll call the utility\'s permitting office tomorrow" (ngày mai sẽ gọi văn phòng cấp phép của công ty điện) → liên hệ văn phòng cấp phép. Việc báo cho nhà trường là của ông Reis; không ai nhắc kiểm tra mái hay đặt thêm tấm pin.' }
          ] } ] },
        { title: 'Review', text:
`Customer review – Orchard & Oak Home Goods
Rating: 3 out of 5 stars
Posted by: Denise Ayala, June 19

I ordered a set of four oak dining chairs from Orchard & Oak after seeing them advertised as "ships in 5–7 business days." My chairs actually arrived in nine days, and one of the boxes had been crushed. When I reported the damage through the Web site's help chat, the agent, Karim, was courteous and replied within two minutes. He arranged a replacement chair at no cost and refunded my shipping fee as an apology for the delay.

The chairs themselves are sturdy and beautifully finished, and assembly took only about twenty minutes. My one criticism is that the replacement did not match the color of the other three exactly; it is slightly lighter. Karim said that natural wood varies and offered a 15 percent discount on a future purchase, which I appreciated, but I would have preferred a matching chair.

I would buy from this company again, but I hope they will improve their packaging and shipping estimates.`,
          groups: [ { type: 'mcq', instr: 'Questions 169-171 refer to the following review.', items: [
            { n: 169, lv: 'B1', q: 'What problem did Ms. Ayala first report to the company?', options: ['An order was never delivered.', 'A chair was the wrong size.', 'A discount code did not work.', 'A package was damaged.'], a: 3, cue: 'one of the boxes had been crushed',
              explain: 'Bà viết "one of the boxes had been crushed" (một thùng bị móp) và đã báo hư hại qua khung chat → gói hàng bị hỏng. Hàng vẫn đến (sau chín ngày), không nói sai kích cỡ, và mã giảm giá không được nhắc đến.' },
            { n: 170, lv: 'B2', q: 'What does Ms. Ayala say about the replacement chair?', options: ['It was delivered the next day.', 'It was larger than the other chairs.', 'It was slightly different in color.', 'It came already assembled.'], a: 2, cue: 'the replacement did not match the color of the other three exactly',
              explain: 'Bà nói "the replacement did not match the color of the other three exactly; it is slightly lighter" → chiếc ghế thay thế hơi khác màu. Bài không nói giao hôm sau, kích thước lớn hơn hay đã lắp sẵn.' },
            { n: 171, lv: 'B2', q: 'The word “courteous” in the review is closest in meaning to', options: ['quick', 'polite', 'knowledgeable', 'formal'], a: 1, cue: 'the agent, Karim, was courteous and replied within two minutes',
              explain: '"courteous" = lịch sự, nhã nhặn → "polite". "quick" nói về tốc độ và đã được thể hiện riêng bằng "replied within two minutes"; "knowledgeable" (hiểu biết) và "formal" (trang trọng) không đồng nghĩa.' }
          ] } ] },
        { title: 'Invoice', text:
`INVOICE
Calder Medical Supply, 1180 Ferris Road, Ashbury

Invoice No.: 40871 | Date: March 4 | Terms: payment due within 30 days
Bill to: Meadowlane Family Clinic, Attn: Patricia Whitcomb

Item | Qty | Unit price | Amount
Disposable exam gloves (box of 100, medium) | 20 | $9.50 | $190.00
Digital thermometers | 6 | $14.00 | $84.00
Adhesive bandages (box of 200) | 10 | $6.25 | $62.50
Blood pressure cuffs, adult | 3 | $38.00 | $114.00

Subtotal: $450.50
Shipping: $12.00 (free on orders over $500)

Please note: the blood pressure cuffs are on back order and will ship separately by March 15 at no additional shipping charge.`,
          groups: [ { type: 'mcq', instr: 'Questions 172-173 refer to the following invoice.', items: [
            { n: 172, lv: 'B2', q: 'What is indicated about the blood pressure cuffs?', options: ['They will be shipped separately.', 'They are no longer sold.', 'They come in boxes of 100.', 'They were not ordered by the clinic.'], a: 0, cue: 'will ship separately by March 15',
              explain: 'Ghi chú viết các băng đo huyết áp "are on back order and will ship separately by March 15" → sẽ được gửi riêng. Chúng vẫn nằm trong đơn hàng (3 chiếc, 114 đô la), không bị ngừng bán; "box of 100" là của găng tay.' },
            { n: 173, lv: 'B2', q: 'What is the total amount that Meadowlane Family Clinic must pay?', options: ['$450.50', '$456.50', '$462.50', '$474.50'], a: 2, cue: 'Shipping: $12.00 (free on orders over $500)',
              explain: 'Tạm tính $450.50, đơn dưới $500 nên vẫn tính phí vận chuyển "Shipping: $12.00" → tổng $450.50 + $12.00 = $462.50. $450.50 bỏ sót phí vận chuyển; các số còn lại không khớp phép cộng.' }
          ] } ] },
        { title: 'Press release', text:
`FOR IMMEDIATE RELEASE
Contact: Nadia Perrin, Communications Director, Harborlight Food Bank, 555-0126

HARBORLIGHT FOOD BANK LAUNCHES "FILL THE TRUCK" CAMPAIGN

Fairmont, October 6 – Harborlight Food Bank today announced a four-week campaign to collect 50,000 pounds of non-perishable food before the holiday season. Beginning October 13, volunteers will staff collection points at 12 supermarkets and libraries in the Fairmont area. Local business Delmar Hardware has pledged to donate one dollar for every pound collected, up to $10,000.

"Demand at our pantries has risen by nearly a third since last year," said executive director Winston Achterberg. "Every can on the truck means one more family at the table."

Fresh produce cannot be accepted at collection points, but residents may drop it directly at Harborlight's warehouse at 90 Dock Street on weekdays between 9:00 A.M. and 4:00 P.M. Volunteers are still needed; information is available on the food bank's Web site.`,
          groups: [ { type: 'mcq', instr: 'Questions 174-175 refer to the following press release.', items: [
            { n: 174, lv: 'B2', q: 'What will Delmar Hardware do?', options: ['Provide a truck for the campaign', 'Contribute money based on the amount of food collected', 'Host a collection point at its store', 'Recruit volunteers for the food bank'], a: 1, cue: 'Delmar Hardware has pledged to donate one dollar for every pound collected',
              explain: '"Delmar Hardware has pledged to donate one dollar for every pound collected" → góp tiền theo số cân thực phẩm thu được. Bài không nói công ty cho mượn xe tải, làm điểm thu gom hay tuyển tình nguyện viên.' },
            { n: 175, lv: 'B2', q: 'What is indicated about Harborlight Food Bank?', options: ['The demand for its services has grown.', 'It plans to open a new warehouse.', 'It accepts fresh produce at supermarkets.', 'It has received a state grant.'], a: 0, cue: 'Demand at our pantries has risen by nearly a third since last year',
              explain: '"Demand at our pantries has risen by nearly a third since last year" → nhu cầu đối với dịch vụ đã tăng. Nông sản tươi "cannot be accepted at collection points" (kể cả siêu thị) nên không nhận ở đó; không nhắc kho mới hay khoản trợ cấp nhà nước.' }
          ] } ] },
        { title: 'E-mail and Invoice', text:
`To: Gustavo Perea
From: Marisol Fenn
Date: April 22
Subject: Your invoice for the Orlov retirement dinner

Dear Mr. Perea,

Thank you for choosing Bayleaf Catering for Ms. Orlov's retirement dinner on April 18. I have attached the invoice. After reviewing your feedback, I want to explain two items. First, the guest count was 62 rather than the 55 on your original order, and we charged the per-person rate for the additional guests. Second, you were also charged for a second chef because the vegetarian tasting menu you requested on April 10 required extra preparation.

If you believe any charge is incorrect, reply to this e-mail before April 30. Payment is due on May 6. Clients who pay by electronic transfer receive a 2 percent reduction, which I have not applied since I do not yet have your payment method.

I would be happy to cater your next event as well.

Marisol Fenn, Bayleaf Catering

* * *

BAYLEAF CATERING – INVOICE #2208
Client: Linden Hall Events | Event date: April 18

Description | Amount
Dinner service, 55 guests at $42 | $2,310.00
Additional guests, 7 at $42 | $294.00
Vegetarian tasting menu (supplement) | $180.00
Second chef | $250.00
Serving staff (4) | $360.00
Subtotal | $3,394.00
Less: deposit received | -$500.00
Balance due: $2,894.00`,
          groups: [ { type: 'mcq', instr: 'Questions 176-180 refer to the following e-mail and invoice.', items: [
            { n: 176, lv: 'B1', q: 'Why did Ms. Fenn write to Mr. Perea?', options: ['To confirm a booking for a future event', 'To explain charges on an invoice', 'To request a deposit', 'To apologize for a late delivery'], a: 1, cue: 'I want to explain two items',
              explain: 'Bà Fenn đính kèm hóa đơn và viết "I want to explain two items" (muốn giải thích hai khoản) → giải thích các khoản phí. Thư không xác nhận sự kiện tương lai, không đòi tiền đặt cọc (đã nhận rồi) và không xin lỗi vì giao trễ.' },
            { n: 177, lv: 'B1', q: 'According to the invoice, how much is the balance due?', options: ['$2,310.00', '$2,604.00', '$3,394.00', '$2,894.00'], a: 3, cue: 'Balance due: $2,894.00',
              explain: 'Hóa đơn ghi "Balance due: $2,894.00" (số dư phải trả) sau khi trừ khoản đặt cọc $500 khỏi tạm tính $3,394. $3,394.00 là chưa trừ cọc; $2,310 chỉ là phần 55 khách; $2,604 chỉ là tiền bữa tối của 62 khách.' },
            { n: 178, lv: 'B2', q: 'Why was Mr. Perea charged for a second chef?', options: ['The guest count increased.', 'The event ran later than planned.', 'A special menu needed extra preparation.', 'The serving staff was too small.'], a: 2, cue: 'you were also charged for a second chef because the vegetarian tasting menu you requested on April 10 required extra preparation',
              explain: 'Thư giải thích khoản đầu bếp thứ hai tính phí "because the vegetarian tasting menu … required extra preparation" → thực đơn chay đặc biệt cần chuẩn bị thêm. Số khách tăng được tính riêng theo đầu người; thư không nhắc sự kiện kéo dài hay thiếu nhân viên phục vụ.' },
            { n: 179, lv: 'B2', q: 'How much was Mr. Perea charged for the additional guests?', options: ['$294.00', '$180.00', '$250.00', '$360.00'], a: 0, cue: 'Additional guests, 7 at $42',
              explain: 'Thư cho biết khách tăng từ 55 lên 62 và được tính theo giá đầu người; hóa đơn có dòng "Additional guests, 7 at $42" → $294.00. $180 là thực đơn chay, $250 là đầu bếp thứ hai, $360 là nhân viên phục vụ.' },
            { n: 180, lv: 'C1', q: 'What is suggested about Mr. Perea?', options: ['He has paid the invoice in full.', 'He has not told Ms. Fenn how he will pay.', 'He is planning another event soon.', 'He disagrees with the guest count.'], a: 1, cue: 'I do not yet have your payment method',
              explain: 'Bà Fenn nói chưa áp dụng khoản giảm 2% vì "I do not yet have your payment method" (chưa biết cách thanh toán của ông) → ông chưa báo cách trả tiền. Hạn thanh toán là 6/5 nên chưa trả đủ; chỉ có lời mong được phục vụ lần sau, không nói ông đang lên kế hoạch; bà nêu số khách để giải thích chứ không có tranh cãi.' }
          ] } ] },
        { title: 'Web page and E-mail', text:
`Wexley Business Institute – Spring Professional Development Courses
All courses run from 9:00 A.M. to 4:30 P.M. at 22 Pell Street, Fairview.

• Effective Presentations (one day, March 12): $320
• Project Management Basics (two days, March 19–20): $590
• Conflict Resolution at Work (one day, March 26): $300

Group discount: Companies that enroll five or more employees in the same course receive 15% off each registration.

Cancellation policy: Cancel at least 14 days before the course starts for a full refund. Cancellations made 4 to 13 days before are eligible for a 50% refund. No refund is available for cancellations made within 3 days of the course.

* * *

To: Registrar, Wexley Business Institute
From: Ruth Abernethy, Human Resources, Oakridge Tools
Date: March 15
Subject: Spring registrations

Hello,

Please register six members of our customer service team for Conflict Resolution at Work on March 26. Their names are attached. Please invoice our accounting department.

I also have a question about another course. One of our managers, Dennis Ko, would like to take Project Management Basics, but he will be traveling on the dates listed. Is it possible for him to join a later session of the course instead? If so, please let me know when it will be offered.

Thank you,
Ruth Abernethy`,
          groups: [ { type: 'mcq', instr: 'Questions 181-185 refer to the following Web page and e-mail.', items: [
            { n: 181, lv: 'B2', q: 'How much will Oakridge Tools pay for each employee who takes the conflict resolution course?', options: ['$300', '$270', '$255', '$240'], a: 2, cue: 'receive 15% off each registration',
              explain: 'Oakridge đăng ký 6 nhân viên (từ 5 người trở lên) nên được "15% off each registration"; học phí khóa Conflict Resolution là $300 → $300 × 0,85 = $255. $300 là giá chưa giảm; $270 (giảm 10%) và $240 (giảm 20%) sai mức giảm.' },
            { n: 182, lv: 'B1', q: 'What does Ms. Abernethy want to know?', options: ['Whether lunch is provided', 'Whether a manager can attend a later session', 'How to pay by credit card', 'Where the institute is located'], a: 1, cue: 'Is it possible for him to join a later session of the course instead?',
              explain: 'Bà hỏi "Is it possible for him to join a later session of the course instead?" → liệu một quản lý có thể học đợt sau không. Thư không hỏi về bữa trưa, cách trả tiền hay địa chỉ (địa chỉ đã có trên trang web).' },
            { n: 183, lv: 'B2', q: 'What is indicated about Wexley Business Institute?', options: ['It offers courses only in the evening.', 'It requires full payment in advance.', "It provides training at clients' offices.", 'It gives refunds depending on when a cancellation is made.'], a: 3, cue: 'Cancel at least 14 days before the course starts for a full refund.',
              explain: 'Chính sách hủy: hủy trước ít nhất 14 ngày được hoàn đủ, 4–13 ngày hoàn 50%, trong 3 ngày không hoàn → mức hoàn tiền phụ thuộc thời điểm hủy. Các khóa học chạy từ "9:00 A.M. to 4:30 P.M." nên không phải chỉ buổi tối; không nhắc yêu cầu trả trước toàn bộ hay đào tạo tại văn phòng khách hàng.' },
            { n: 184, lv: 'B1', q: 'How long is the course that Mr. Ko wants to take?', options: ['Two days', 'One day', 'Three days', 'Half a day'], a: 0, cue: 'Project Management Basics (two days, March 19–20): $590',
              explain: 'E-mail cho biết ông Ko muốn học "Project Management Basics"; trang web ghi khóa này "two days, March 19–20" → kéo dài hai ngày. Các khóa một ngày là Effective Presentations và Conflict Resolution.' },
            { n: 185, lv: 'C1', q: 'If Oakridge Tools cancels its registrations on March 20, what will it most likely receive?', options: ['A full refund', 'A credit for a future course', 'A 50 percent refund', 'No refund'], a: 2, cue: 'Cancellations made 4 to 13 days before are eligible for a 50% refund.',
              explain: 'Khóa Conflict Resolution diễn ra ngày 26/3; hủy ngày 20/3 tức là trước 6 ngày, nằm trong khoảng "4 to 13 days" → được hoàn 50%. Hoàn đủ cần hủy trước ít nhất 14 ngày; "không hoàn" chỉ áp dụng trong 3 ngày cuối; chính sách không có khoản tín dụng cho khóa sau.' }
          ] } ] },
        { title: 'Notice and E-mails', text:
`Ashgrove Regional Rail – Service Change Notice

Effective June 2, the 7:15 A.M. express from Dunhill to Port Merriam will be replaced by two local trains. The 6:50 A.M. local will leave Dunhill and arrive in Port Merriam at 8:20 A.M. The 7:40 A.M. local will arrive at 9:10 A.M. Express service will continue to operate at 8:15 A.M., 12:15 P.M., and 5:15 P.M.

Monthly pass holders may ride all trains as before. Passengers who buy single tickets on board will pay a $3 surcharge starting June 2; tickets bought at stations or through the Ashgrove Rail app are not affected.

* * *

To: Customer Care, Ashgrove Regional Rail
From: Tobias Lindgren
Date: May 27
Subject: Morning commute

Hello,

I commute from Dunhill to Port Merriam every weekday and normally take the 7:15 express to arrive before my 8:30 meeting. After reading your notice, I'm worried that I will no longer be able to get to work on time. Is there any option that would get me there by 8:30? I currently buy my tickets on board because my schedule changes often.

* * *

To: Tobias Lindgren
From: Customer Care
Date: May 28
Subject: RE: Morning commute

Dear Mr. Lindgren,

Thank you for contacting us. Starting June 2, the earlier local train will allow you to reach Port Merriam before your meeting. Please note that, as of that date, a surcharge applies to tickets bought on board, so you may wish to consider the other purchasing options described in our notice.`,
          groups: [ { type: 'mcq', instr: 'Questions 186-190 refer to the following notice and e-mails.', items: [
            { n: 186, lv: 'B2', q: 'What change will take effect on June 2?', options: ['A fare reduction will begin.', 'An express train will be replaced by local trains.', 'A new station will open.', 'The Southern Line will close.'], a: 1, cue: 'will be replaced by two local trains',
              explain: 'Thông báo cho biết chuyến tốc hành 7:15 "will be replaced by two local trains" từ ngày 2/6 → tàu nhanh được thay bằng hai tàu chậm. Giá vé không giảm (còn có phụ phí mới), không có ga mới hay đóng tuyến nào.' },
            { n: 187, lv: 'B2', q: 'What is Mr. Lindgren worried about?', options: ['His monthly pass will expire.', 'A train will be canceled on his return trip.', 'He may arrive at work late.', 'Ticket prices will rise for all passengers.'], a: 2, cue: 'I will no longer be able to get to work on time',
              explain: 'Ông viết "I will no longer be able to get to work on time" (sẽ không kịp giờ làm) vì chuyến 7:15 bị thay → lo đi làm trễ. Ông mua vé lẻ chứ không có vé tháng; thư không nhắc chuyến về hay việc tăng giá cho mọi hành khách.' },
            { n: 188, lv: 'C1', q: 'Which train will Customer Care most likely recommend to Mr. Lindgren?', options: ['The 6:50 A.M. local', 'The 7:40 A.M. local', 'The 8:15 A.M. express', 'The 12:15 P.M. express'], a: 0, cue: 'the earlier local train will allow you to reach Port Merriam before your meeting',
              explain: 'Bộ phận chăm sóc khách hàng viết "the earlier local train will allow you to reach Port Merriam before your meeting"; theo thông báo, tàu chậm sớm hơn là chuyến 6:50 đến lúc 8:20, trước cuộc họp 8:30. Chuyến 7:40 đến 9:10 và các chuyến tốc hành khác đều muộn hơn 8:30.' },
            { n: 189, lv: 'C1', q: 'What will Mr. Lindgren most likely do to avoid the $3 surcharge?', options: ['Ask for a refund', 'Take a later train', 'Travel on the Southern Line', 'Buy his tickets through the app'], a: 3, cue: 'tickets bought at stations or through the Ashgrove Rail app are not affected',
              explain: 'Phụ phí 3 đô la chỉ áp dụng cho vé mua trên tàu; theo thông báo, "tickets bought at stations or through the Ashgrove Rail app are not affected". Ông thường mua vé trên tàu vì lịch hay đổi, nên mua qua ứng dụng là cách linh hoạt tránh phụ phí. Đi chuyến muộn hơn hay đổi tuyến không giúp tránh phụ phí, và không có khoản hoàn tiền nào.' },
            { n: 190, lv: 'B2', q: 'The word “operate” in the notice is closest in meaning to', options: ['sell', 'run', 'repair', 'guide'], a: 1, cue: 'Express service will continue to operate at 8:15 A.M., 12:15 P.M., and 5:15 P.M.',
              explain: '"Express service will continue to operate at …" nghĩa là dịch vụ tốc hành vẫn tiếp tục vận hành/chạy vào các giờ đó → "run". "sell" (bán), "repair" (sửa chữa), "guide" (hướng dẫn) không hợp nghĩa.' }
          ] } ] },
        { title: 'Advertisement, E-mail and Schedule', text:
`Stonebridge Builders – Commercial Renovations

Planning an office makeover? We handle everything from flooring to lighting.
• Free on-site estimates within five business days
• Fixed-price quotes, so there are no surprises
• Evening and weekend work available to avoid disrupting your business (a 12 percent surcharge applies to weekend work)
• Two-year warranty on all workmanship

To book an estimate, call Miriam Duquette, Project Coordinator, at 555-0192.

* * *

To: Miriam Duquette
From: Anselm Kurtz, Office Manager, Kurtz & Daley Architects
Date: February 3
Subject: Renovation quote

Dear Ms. Duquette,

Thank you for visiting our office on Friday. We have decided to proceed with the quote you gave us for new flooring in the reception area and replacement of the lighting in the main studio. However, we would like to postpone the lighting until the summer. The flooring must be completed by February 28, when a client from Singapore will visit us.

Because our staff works weekdays from 9:00 to 5:00, please schedule the flooring work for weekday evenings. We would like to avoid the weekend surcharge.

Anselm Kurtz

* * *

Stonebridge Builders – Work Schedule for Kurtz & Daley Architects (all work 6:00–10:00 P.M.)

Monday, February 17: Remove old carpet in reception
Tuesday, February 18: Prepare subfloor
Wednesday–Thursday, February 19–20: Install new flooring
Friday, February 21: Final walk-through and sign-off
Lighting replacement: date to be confirmed`,
          groups: [ { type: 'mcq', instr: 'Questions 191-195 refer to the following advertisement, e-mail, and schedule.', items: [
            { n: 191, lv: 'B1', q: 'What does the advertisement indicate about Stonebridge Builders?', options: ['It specializes in home kitchens.', 'It requires full payment in advance.', 'It works only on weekends.', 'It guarantees its work for two years.'], a: 3, cue: 'Two-year warranty on all workmanship',
              explain: 'Quảng cáo nêu "Two-year warranty on all workmanship" (bảo hành tay nghề hai năm) → công ty bảo đảm công việc trong hai năm. Họ làm văn phòng thương mại chứ không chuyên bếp gia đình; nhận cả buổi tối lẫn cuối tuần; không nhắc yêu cầu trả trước.' },
            { n: 192, lv: 'B2', q: 'Why did Mr. Kurtz write the e-mail?', options: ['To request a refund', 'To complain about a delay', 'To approve part of a proposed project', 'To ask for a different contractor'], a: 2, cue: 'We have decided to proceed with the quote you gave us',
              explain: 'Ông viết "We have decided to proceed with the quote" cho phần sàn nhưng hoãn phần đèn → chấp thuận một phần dự án đã báo giá. Ông không xin hoàn tiền, không phàn nàn chậm trễ (công việc chưa bắt đầu) và không đổi nhà thầu.' },
            { n: 193, lv: 'B2', q: 'Which part of the project will be delayed?', options: ['The installation of the flooring', 'The replacement of the studio lighting', 'The removal of the old carpet', 'The final walk-through'], a: 1, cue: 'we would like to postpone the lighting until the summer',
              explain: 'Ông Kurtz viết "we would like to postpone the lighting until the summer" và lịch ghi "Lighting replacement: date to be confirmed" → việc thay đèn phòng thiết kế bị hoãn. Các công đoạn về sàn đã có lịch từ 17 đến 21/2.' },
            { n: 194, lv: 'C1', q: 'What is suggested about the flooring project?', options: ['It will cost 12 percent more than estimated.', 'It will continue past February 28.', 'It will not require a weekend surcharge.', 'It will involve a second contractor.'], a: 2, cue: 'please schedule the flooring work for weekday evenings',
              explain: 'Ông Kurtz xin làm vào các buổi tối ngày thường để tránh phụ phí cuối tuần, và lịch chỉ xếp từ thứ Hai đến thứ Sáu → không phát sinh phụ phí 12% cuối tuần. Công việc xong ngày 21/2, trước 28/2; không có nhà thầu thứ hai.' },
            { n: 195, lv: 'B2', q: 'When will the installation of the new flooring be completed?', options: ['On February 20', 'On February 18', 'On February 21', 'On February 28'], a: 0, cue: 'Wednesday–Thursday, February 19–20: Install new flooring',
              explain: 'Lịch ghi "Wednesday–Thursday, February 19–20: Install new flooring" → lắp sàn xong ngày 20/2. Ngày 18/2 chỉ là chuẩn bị nền; ngày 21/2 là nghiệm thu; 28/2 là hạn chót của khách hàng, không phải ngày hoàn thành.' }
          ] } ] },
        { title: 'Letter, Program and E-mail', text:
`Brookhaven University – Office of Alumni Relations
March 3

Mr. Elias Varga
Tallis Structural
Dear Mr. Varga,

On behalf of the Alumni Relations office, I am writing to invite you to be the keynote speaker at our Scholarship Benefit Dinner on Saturday, May 17, at the Marlowe Hotel. This annual event raises money for first-generation students, and last year's dinner brought in $85,000. As a 2009 graduate who now leads the successful engineering firm Tallis Structural, you would be an inspiration to our students. Speakers receive a complimentary hotel room for the night of the event, and we would cover your travel expenses up to $500. The keynote would last about twenty minutes. Please let me know by April 1 if you can join us.

Sincerely,
Paloma Reyes, Director of Alumni Relations

* * *

Scholarship Benefit Dinner – Program (Saturday, May 17, Marlowe Hotel Grand Ballroom)

5:30 P.M. Reception and silent auction
6:45 P.M. Welcome – President Gordon Lyle
7:00 P.M. Dinner
7:45 P.M. Student speaker – Amara Cole
8:00 P.M. Keynote address
8:20 P.M. Live auction
9:00 P.M. Closing remarks

* * *

To: Paloma Reyes
From: Elias Varga
Date: March 12
Subject: Scholarship Benefit Dinner

Dear Ms. Reyes,

Thank you for the invitation. I would be honored to speak, and I can arrive in time for the reception. I also have an idea. My firm would like to match donations made at the dinner up to $10,000, and I hope you will let me announce this during my remarks.

Please send me the details for the hotel reservation.

Best regards,
Elias Varga`,
          groups: [ { type: 'mcq', instr: 'Questions 196-200 refer to the following letter, program, and e-mail.', items: [
            { n: 196, lv: 'B2', q: 'Why was Mr. Varga invited to the event?', options: ['He is a trustee of the university.', 'He donated to the fund last year.', 'He teaches an engineering course.', 'He is a successful graduate of the university.'], a: 3, cue: 'As a 2009 graduate who now leads the successful engineering firm Tallis Structural',
              explain: 'Thư mời viết "As a 2009 graduate who now leads the successful engineering firm" → ông là cựu sinh viên thành đạt, sẽ truyền cảm hứng cho sinh viên. Thư không nói ông là ủy viên hội đồng, từng quyên góp năm ngoái hay giảng dạy.' },
            { n: 197, lv: 'B2', q: 'What does Ms. Reyes offer Mr. Varga?', options: ['Reimbursement of some travel expenses', 'Payment for his speech', 'A seat on the university board', 'Tickets for his employees'], a: 0, cue: 'we would cover your travel expenses up to $500',
              explain: 'Bà Reyes viết "we would cover your travel expenses up to $500" (chi trả chi phí đi lại tối đa 500 đô la) → hoàn một phần chi phí đi lại. Thư còn cho phòng khách sạn miễn phí nhưng không nhắc thù lao diễn thuyết, ghế hội đồng hay vé cho nhân viên.' },
            { n: 198, lv: 'C1', q: 'At what time is Mr. Varga scheduled to speak?', options: ['7:00 P.M.', '7:45 P.M.', '8:00 P.M.', '8:20 P.M.'], a: 2, cue: '8:00 P.M. Keynote address',
              explain: 'Thư mời ông làm diễn giả chính (keynote); chương trình ghi "8:00 P.M. Keynote address" → ông phát biểu lúc 8 giờ tối. 7:00 là bữa tối, 7:45 là sinh viên phát biểu, 8:20 là đấu giá trực tiếp.' },
            { n: 199, lv: 'B2', q: 'What does Mr. Varga offer to do?', options: ['Sponsor the silent auction', 'Match donations made at the dinner', 'Hire a graduating student', 'Provide transportation for guests'], a: 1, cue: 'My firm would like to match donations made at the dinner up to $10,000',
              explain: 'Ông viết "My firm would like to match donations made at the dinner up to $10,000" → công ty ông đề nghị đóng góp tương ứng với tiền quyên góp tại buổi tiệc. Ông không nhắc tài trợ đấu giá, tuyển sinh viên hay đưa đón khách.' },
            { n: 200, lv: 'C1', q: 'What is suggested about Mr. Varga\'s e-mail?', options: ['It was sent to the wrong person.', 'It declines the invitation.', 'It was written after the event.', 'It was sent before the requested deadline.'], a: 3, cue: 'Please let me know by April 1 if you can join us.',
              explain: 'Thư mời đề nghị trả lời trước 1/4 ("Please let me know by April 1"), còn e-mail của ông Varga đề ngày 12/3 → gửi trước hạn. Ông gửi đúng cho bà Reyes, chấp nhận (không từ chối) lời mời, và buổi tiệc diễn ra ngày 17/5, sau đó.' }
          ] } ] }
      ] }
  ] });
})(typeof self !== 'undefined' ? self : this);
