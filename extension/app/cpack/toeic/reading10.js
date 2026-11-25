/* TOEIC Reading – Test 10 (tự biên soạn) */
(function (g) {
  const T = g.TOEIC = g.TOEIC || { reading: [], listening: [] };
  T.reading.push({ id: 'tr10', test: 10, title: 'TOEIC Reading Test 10', parts: [

    /* ================= PART 5 ================= */
    { part: 5, title: 'Incomplete Sentences', instr: g.TQR[2],
      groups: [ { type: 'mcq', instr: '', items: [
        { n: 101, lv: 'B1', q: 'Our new filing system allows employees to retrieve documents more ------- than before.', options: ['efficient', 'efficiently', 'efficiency', 'efficiencies'], a: 1, cue: 'retrieve documents more -------',
          explain: `Cần trạng từ bổ nghĩa cho động từ "retrieve" (lấy tài liệu ra) → "efficiently"; "more efficiently than before" là so sánh hơn của trạng từ. "efficient" là tính từ, "efficiency" và "efficiencies" là danh từ nên không đứng được ở vị trí này.` },
        { n: 102, lv: 'B2', q: 'Each of the departments moving to the fourth floor ------- required to submit a floor plan by Friday.', options: ['are', 'were', 'is', 'have been'], a: 2, cue: 'Each of the departments',
          explain: `Chủ ngữ thật là "Each" (mỗi một) nên động từ chia số ít, thì hiện tại → "is required". "are" và "have been" chia số nhiều theo "departments" (bẫy gần chủ ngữ); "were" sai thì vì câu nói về việc phải nộp sơ đồ trước thứ Sáu sắp tới.` },
        { n: 103, lv: 'B2', q: 'Customers ------- to receive statements online should update their e-mail address with the bank.', options: ['wishing', 'wished', 'wish', 'wishes'], a: 0, cue: 'Customers ------- to receive statements online',
          explain: `Câu đã có động từ chính "should update", nên chỗ trống phải là phân từ rút gọn mệnh đề quan hệ chủ động: "Customers wishing to receive…" (những khách hàng muốn nhận…) → "wishing". "wished", "wish", "wishes" đều tạo thêm một động từ chia thì nữa, làm câu sai cấu trúc.` },
        { n: 104, lv: 'B1', q: '------- Corvane Air could not operate the 6:40 flight, it rebooked all passengers on a later departure.', options: ['Despite', 'Due to', 'Regardless', 'Because'], a: 3, cue: 'Corvane Air could not operate the 6:40 flight',
          explain: `Sau chỗ trống là một mệnh đề đầy đủ (S + V) và quan hệ nguyên nhân – kết quả (không bay được nên xếp lại chuyến) → liên từ "Because". "Despite" và "Due to" là giới từ, chỉ đi với danh từ/cụm danh từ; "Regardless" không đi trực tiếp với mệnh đề và cũng sai nghĩa.` },
        { n: 105, lv: 'B1', q: "The cooperative's apples are sorted ------- size before they are packed in crates.", options: ['to', 'by', 'at', 'through'], a: 1, cue: 'are sorted ------- size',
          explain: `"sort by size" = phân loại theo kích cỡ → giới từ "by" chỉ tiêu chí phân loại. "to", "at", "through" không tạo thành cụm nghĩa này với "sorted … size".` },
        { n: 106, lv: 'B1', q: 'Policyholders must submit a claim within 30 days of the ------- to be eligible for reimbursement.', options: ['inventory', 'incentive', 'inclusion', 'incident'], a: 3, cue: 'within 30 days of the -------',
          explain: `Khách hàng phải nộp yêu cầu bồi thường trong 30 ngày kể từ "the incident" (sự cố xảy ra). "incentive" (sự khuyến khích), "inclusion" (sự bao gồm) và "inventory" (hàng tồn kho) không hợp nghĩa với việc yêu cầu bảo hiểm.` },
        { n: 107, lv: 'B2', q: 'All vendors are required to ------- with the data protection rules that took effect in January.', options: ['comply', 'cooperate', 'adhere', 'obey'], a: 0, cue: 'data protection rules that took effect in January',
          explain: `Cụm cố định "comply with + quy định" = tuân thủ. "obey" là ngoại động từ, đi thẳng với tân ngữ, không có "with"; "adhere" đi với "to" (adhere to the rules); "cooperate with" nghĩa là hợp tác với ai, không dùng cho quy định.` },
        { n: 108, lv: 'B1', q: 'Members who ------- their annual plan before March 1 will receive two free personal training sessions.', options: ['renovate', 'repeat', 'renew', 'refuse'], a: 2, cue: 'their annual plan before March 1',
          explain: `Hội viên "renew" (gia hạn) gói năm trước ngày 1/3 sẽ được tặng buổi tập → "renew". "renovate" (sửa sang tòa nhà), "repeat" (lặp lại) không đi với "plan" theo nghĩa này; "refuse" (từ chối) trái logic vì người từ chối gói thì không được thưởng.` },
        { n: 109, lv: 'B2', q: 'The style guide, ------- was revised last spring, is now required reading for all Brannock Press editors.', options: ['which', 'that', 'whom', 'whose'], a: 0, cue: 'was revised last spring',
          explain: `Câu dùng mệnh đề không xác định, vì vậy cần đại từ quan hệ 'which' để chỉ vật; các đại từ còn lại như 'that', 'whom', 'whose' không phù hợp vì chúng không dùng cho mệnh đề không giới hạn hoặc không chỉ vật.` },
        { n: 110, lv: 'B2', q: 'The rental agency ------- more than 400 vehicles to its fleet since the start of the year.', options: ['adds', 'will add', 'has added', 'was adding'], a: 2, cue: 'since the start of the year',
          explain: `"since the start of the year" (từ đầu năm đến nay) đi với hiện tại hoàn thành → "has added". "adds" (hiện tại đơn) và "will add" (tương lai) sai thì; "was adding" là quá khứ tiếp diễn, không dùng với "since" tính đến hiện tại.` },
        { n: 111, lv: 'B1', q: 'The city council will vote ------- the proposed parking fee on October 12.', options: ['of', 'on', 'at', 'in'], a: 1, cue: 'will vote -------',
          explain: `Cụm động từ "vote on" = biểu quyết về (một đề xuất) → "on". "of", "at", "in" không kết hợp với "vote" để chỉ nội dung được biểu quyết.` },
        { n: 112, lv: 'B1', q: 'Dr. Amadi asked ------- to run the stability test again before the report was sent.', options: ['we', 'ourselves', 'our', 'us'], a: 3, cue: 'Dr. Amadi asked -------',
          explain: `Cấu trúc "ask + tân ngữ + to V": sau "asked" cần đại từ tân ngữ → "us". "we" là đại từ chủ ngữ; "our" là tính từ sở hữu, phải đi trước danh từ; "ourselves" là đại từ phản thân, không hợp vì Dr. Amadi không phải là "we".` },
        { n: 113, lv: 'B2', q: 'The sensor must be ------- before each test to ensure that the readings are accurate.', options: ['calibrated', 'commissioned', 'congratulated', 'contained'], a: 0, cue: 'to ensure that the readings are accurate',
          explain: `Để số đo chính xác, cảm biến phải được "calibrated" (hiệu chuẩn) trước mỗi lần thử. "commissioned" (được đặt làm/giao nhiệm vụ), "congratulated" (được chúc mừng), "contained" (được chứa) không hợp nghĩa với việc đảm bảo độ chính xác.` },
        { n: 114, lv: 'C1', q: 'If the baggage handlers ------- the delay sooner, passengers would have been informed before reaching the gate.', options: ['report', 'reported', 'were reporting', 'had reported'], a: 3, cue: 'passengers would have been informed',
          explain: `Mệnh đề chính "would have been informed" là câu điều kiện loại 3 (giả định trái với quá khứ) → mệnh đề "if" phải dùng quá khứ hoàn thành "had reported". "report", "reported" và "were reporting" không khớp với "would have + V3".` },
        { n: 115, lv: 'B2', q: 'Ms. Daruwalla was ------- to the position of managing editor after five years at the newspaper.', options: ['proposed', 'promoted', 'promised', 'prompted'], a: 1, cue: 'to the position of managing editor',
          explain: `"be promoted to the position of …" = được thăng chức lên vị trí → "promoted" (sau năm năm làm việc). "proposed" (được đề xuất), "promised" (được hứa) và "prompted" (được thúc đẩy) không đi với "to the position of" theo nghĩa thăng tiến.` },
        { n: 116, lv: 'B1', q: 'The Elmstead Wellness Center encourages members ------- a short health assessment before starting a new program.', options: ['complete', 'completing', 'to complete', 'completed'], a: 2, cue: 'encourages members -------',
          explain: `Cấu trúc "encourage somebody to do something" (khuyến khích ai làm gì) → "to complete". "complete" (nguyên mẫu không "to"), "completing" và "completed" không đi sau "encourage + tân ngữ".` },
        { n: 117, lv: 'B2', q: 'Premium members may upgrade to a larger vehicle at no ------- charge.', options: ['addition', 'additionally', 'additive', 'additional'], a: 3, cue: 'at no ------- charge',
          explain: `Trước danh từ "charge" cần tính từ → "additional" (phụ thêm); "at no additional charge" = không mất thêm phí. "addition" là danh từ, "additionally" là trạng từ, "additive" (chất phụ gia/có tính cộng thêm) sai nghĩa.` },
        { n: 118, lv: 'B2', q: 'The bank will ------- a processing fee of $15 for each international wire transfer.', options: ['cost', 'charge', 'spend', 'tax'], a: 1, cue: 'a processing fee of $15',
          explain: `"charge a fee" = thu một khoản phí → "charge". "cost" cần chủ ngữ là vật và đi với số tiền, không có tân ngữ là "fee"; "spend" là chi tiêu; "tax" là đánh thuế, không đi với "a processing fee".` },
        { n: 119, lv: 'B1', q: 'The number of certified organic farms in the Tamsin Valley ------- risen steadily since 2015.', options: ['has', 'have', 'are', 'will'], a: 0, cue: 'The number of certified organic farms',
          explain: `Chủ ngữ là "The number of …" (con số) luôn chia số ít, và "since 2015" cần hiện tại hoàn thành → "has risen". "have" chia số nhiều theo "farms" nên sai; "are" và "will" không ghép được với "risen" để đúng thì.` },
        { n: 120, lv: 'B2', q: 'A compliance officer must ------- all contracts for legal accuracy before they are signed.', options: ['recall', 'release', 'review', 'reveal'], a: 2, cue: 'for legal accuracy before they are signed',
          explain: `Chuyên viên tuân thủ phải "review" (rà soát) hợp đồng để kiểm tra tính chính xác về pháp lý trước khi ký. "recall" (thu hồi/nhớ lại), "release" (công bố) và "reveal" (tiết lộ) không hợp nghĩa.` },
        { n: 121, lv: 'C1', q: 'The new packaging line is ------- more efficient than the one it replaced.', options: ['far', 'very', 'so', 'too'], a: 0, cue: 'more efficient than the one it replaced',
          explain: `Để nhấn mạnh so sánh hơn ("more efficient than") ta dùng trạng từ "far" (hơn hẳn) hoặc "much". "very", "so" và "too" không đứng trước dạng so sánh hơn.` },
        { n: 122, lv: 'B2', q: 'Staff members ------- need extra ink cartridges should contact the supply coordinator.', options: ['whom', 'where', 'which', 'who'], a: 3, cue: 'should contact the supply coordinator',
          explain: `Đại từ quan hệ thay cho người ("Staff members") và làm chủ ngữ của "need" → "who". "whose" chỉ sở hữu và phải có danh từ theo sau; "whom" là tân ngữ; "which" chỉ dùng cho vật.` },
        { n: 123, lv: 'B2', q: 'Employees are asked to ------- unneeded files to the archive room before moving day.', options: ['transform', 'transmit', 'transfer', 'translate'], a: 2, cue: 'unneeded files to the archive room',
          explain: `"transfer … to" = chuyển (tệp) sang nơi khác → "transfer". "transform" (biến đổi), "transmit" (truyền tín hiệu/dữ liệu) và "translate" (dịch) không hợp với việc đem hồ sơ cũ đến phòng lưu trữ.` },
        { n: 124, lv: 'B2', q: 'Ms. Vance is considering ------- her home insurance policy to a different provider.', options: ['to switch', 'switching', 'switch', 'switched'], a: 1, cue: 'her home insurance policy to a different provider',
          explain: `Động từ "consider" (cân nhắc) đi với danh động từ → "considering switching". "to switch" và "switch" không đúng sau "consider"; "switched" là dạng quá khứ/phân từ, không hợp cấu trúc.` },
        { n: 125, lv: 'B2', q: 'The city will hold a public meeting ------- residents can comment on the proposed bike lanes.', options: ['who', 'which', 'what', 'where'], a: 3, cue: 'residents can comment on the proposed bike lanes',
          explain: `Mệnh đề sau chỗ trống đã đủ chủ ngữ và động từ, và bổ nghĩa cho nơi/sự kiện "a public meeting" → trạng từ quan hệ "where" (nơi mà cư dân có thể góp ý). "who" chỉ người; "which" cần giới từ đi kèm (at which); "what" không đứng sau danh từ.` },
        { n: 126, lv: 'C1', q: 'The rental agreement ------- that drivers must be at least 25 years old.', options: ['stipulates', 'stimulates', 'simulates', 'stipends'], a: 0, cue: 'drivers must be at least 25 years old',
          explain: `"stipulate that …" = quy định rõ rằng (trong hợp đồng) → "stipulates". "stimulates" (kích thích), "simulates" (mô phỏng) là động từ nhưng sai nghĩa; "stipends" là danh từ (khoản trợ cấp), không làm động từ ở đây.` },
        { n: 127, lv: 'B2', q: 'Unless a member cancels in writing, the subscription ------- automatically each month.', options: ['renewed', 'renews', 'renewing', 'renewal'], a: 1, cue: 'Unless a member cancels in writing',
          explain: `Mệnh đề "Unless a member cancels" nói về một quy tắc chung nên mệnh đề chính dùng hiện tại đơn → "renews" (tự động gia hạn). "renewed" (quá khứ), "renewing" (V-ing) và "renewal" (danh từ) không làm được động từ chính.` },
        { n: 128, lv: 'C1', q: "The firm's lawyers advised the board to ------- the merger until the regulatory review was complete.", options: ['hasten', 'revoke', 'postpone', 'enforce'], a: 2, cue: 'until the regulatory review was complete',
          explain: `"until the regulatory review was complete" cho thấy cần hoãn lại → "postpone" (trì hoãn) vụ sáp nhập. "hasten" (thúc đẩy) trái nghĩa; "revoke" (thu hồi) và "enforce" (thi hành) không hợp với việc chờ kết quả thẩm định.` },
        { n: 129, lv: 'C1', q: 'Not only ------- the new irrigation system reduce water use, but it also raised crop yields.', options: ['did', 'is', 'has', 'does'], a: 0, cue: 'but it also raised crop yields',
          explain: `"Not only" đứng đầu câu thì đảo trợ động từ lên trước chủ ngữ; vế sau "raised" ở quá khứ nên dùng "did" + động từ nguyên mẫu "reduce". "has" cần V3, "is" cần V-ing/V3, còn "does" sai thì (hiện tại).` },
        { n: 130, lv: 'C1', q: "------- the account holder's written consent, the bank is not permitted to share transaction records with third parties.", options: ['Besides', 'Regarding', 'Throughout', 'Without'], a: 3, cue: 'the bank is not permitted to share transaction records',
          explain: `Ngân hàng không được chia sẻ hồ sơ giao dịch nếu thiếu sự đồng ý bằng văn bản → "Without" (không có). "Besides" (ngoài ra), "Regarding" (liên quan đến) và "Throughout" (suốt) không tạo ra điều kiện hợp lý này.` }
      ] } ] },

    /* ================= PART 6 ================= */
    { part: 6, title: 'Text Completion', instr: g.TQR[1],
      passages: [
        { title: 'E-mail', text:
`To: All Hollin & Reeve staff
From: Facilities Office
Date: May 27
Subject: Moving day instructions

Our offices will move to the ninth floor of Larkspur Tower on Friday, June 20. To make the transition as -----(131)----- as possible, please pack your belongings in the boxes that were delivered to your desk this week.

Label every box with your name and your new room number. -----(132)-----. Movers will not be able to deliver unlabeled boxes to the correct desk.

Standard supplies, such as pens, notepads, and printer paper, will be -----(133)----- in the new supply room, so there is no need to pack them. -----(134)----- you need a nonstandard item, such as a second monitor or a footrest, please tell Ms. Yoon in Facilities by Wednesday, June 11.`,
          groups: [ { type: 'mcq', instr: g.TQR[12], items: [
            { n: 131, lv: 'B1', q: '(131)', options: ['smoothly', 'smoothness', 'smooth', 'smoothen'], a: 2, cue: 'To make the transition as',
              explain: `Cấu trúc "make + tân ngữ + tính từ" (làm cho việc chuyển đổi trở nên …) → "as smooth as possible". "smoothly" là trạng từ, "smoothness" là danh từ, "smoothen" là động từ nên không đứng được trong cấu trúc so sánh bằng "as … as".` },
            { n: 132, lv: 'B2', q: '(132)', options: ['Colored stickers for this purpose are available at the facilities desk.', 'The conference room on the second floor will be closed for cleaning.', 'The company\'s annual inventory will be completed by the end of April.', 'A new ergonomic chair has been ordered for the marketing department.'], a: 0, cue: 'Movers will not be able to deliver unlabeled boxes to the correct desk.',
              explain: `Câu trước yêu cầu dán nhãn mọi thùng, câu sau nói thùng không nhãn sẽ không được giao đúng bàn → câu cần điền hỗ trợ việc dán nhãn: "Colored stickers … are available at the facilities desk" (nhãn dán có sẵn ở bộ phận cơ sở vật chất). Các câu về phòng tập, kho năm ngoái hay màn hình lớn hơn lạc đề.` },
            { n: 133, lv: 'B1', q: '(133)', options: ['stocking', 'stocked', 'stocks', 'stock'], a: 1, cue: 'in the new supply room, so there is no need to pack them',
              explain: `Văn phòng phẩm "sẽ được" bổ sung sẵn trong phòng vật tư → bị động tương lai "will be stocked" (be + V3). "stocking", "stocks" và "stock" không ghép được với "will be" để tạo câu bị động.` },
            { n: 134, lv: 'B1', q: '(134)', options: ['Whether', 'Unless', 'Although', 'If'], a: 3, cue: 'you need a nonstandard item',
              explain: `Mệnh đề điều kiện: nếu cần món không tiêu chuẩn thì báo cô Yoon → "If". "Whether" cần "or not"/hai khả năng; "Unless" (trừ khi) và "Although" (mặc dù) làm câu sai nghĩa.` }
          ] } ] },
        { title: 'Article', text:
`FARNLEY (March 4) – Dunmoor Growers, a cooperative of 60 vegetable farms, has opened a processing plant in Farnley. The facility will wash, trim, and -----(135)----- fresh produce for supermarkets across the region.

Cooperative manager Lena Brask said the plant is expected to -----(136)----- the time between harvest and store shelf by about two days. Previously, vegetables had to be trucked 200 kilometers to a plant in the north. -----(137)-----. Member farmers will also earn more because they no longer pay long-distance freight charges.

The plant will -----(138)----- 85 people, most of them from the Farnley area. Hiring begins in April.`,
          groups: [ { type: 'mcq', instr: 'Questions 135-138 refer to the following article.', items: [
            { n: 135, lv: 'B1', q: '(135)', options: ['packaging', 'package', 'packages', 'packaged'], a: 1, cue: 'The facility will wash, trim, and',
              explain: `Cấu trúc song song sau "will": "will wash, trim, and package" – cả ba đều là động từ nguyên mẫu → "package" (đóng gói). "packaging", "packages" và "packaged" không song song với "wash" và "trim".` },
            { n: 136, lv: 'B2', q: '(136)', options: ['shorter', 'shortly', 'shorten', 'shortness'], a: 2, cue: 'the time between harvest and store shelf',
              explain: `Sau "is expected to" cần động từ nguyên mẫu có tân ngữ "the time" → "shorten" (rút ngắn). "shorter" là tính từ so sánh, "shortly" là trạng từ, "shortness" là danh từ.` },
            { n: 137, lv: 'B2', q: '(137)', options: ['The new plant is only ten minutes from most member farms, so produce arrives fresher.', 'Tickets for the opening ceremony have sold out.', 'Some farmers have started growing herbs in greenhouses.', 'Supermarkets raised their prices at the start of this year.'], a: 0, cue: 'Previously, vegetables had to be trucked 200 kilometers to a plant in the north.',
              explain: `Câu trước nói rau từng phải chở 200 km; câu sau mở đầu bằng "also" về lợi ích khác cho nông dân (không còn trả cước vận chuyển xa) → câu cần điền nêu lợi ích khác của nhà máy mới: gần các trang trại nên rau tươi hơn. Vé khai mạc, trồng thảo mộc hay giá siêu thị tăng đều không liên quan.` },
            { n: 138, lv: 'B1', q: '(138)', options: ['employee', 'employer', 'employment', 'employ'], a: 3, cue: 'most of them from the Farnley area',
              explain: `Sau "will" cần động từ nguyên mẫu có tân ngữ "85 people" → "employ" (thuê, tuyển dụng). "employee" (nhân viên) và "employer" (người thuê) là danh từ chỉ người, "employment" là danh từ chỉ việc làm.` }
          ] } ] },
        { title: 'Letter', text:
`Calder Trust Bank
Insurance Services
June 24

Dear Valued Customer,

Thank you for choosing Calder Trust for your home insurance. We are writing to let you know that your policy is due for -----(139)----- on August 1.

The most important -----(140)----- this year is that your coverage for water damage has been raised from $20,000 to $35,000. Your premium will increase by $4 per month to reflect the added protection. -----(141)-----. Customers who prefer to keep their current coverage must contact us by July 15.

If you have any questions, please call us -----(142)----- 8:00 A.M. and 6:00 P.M., Monday through Friday.`,
          groups: [ { type: 'mcq', instr: 'Questions 139-142 refer to the following letter.', items: [
            { n: 139, lv: 'B2', q: '(139)', options: ['renew', 'renewal', 'renewing', 'renewed'], a: 1, cue: 'your policy is due for',
              explain: `Sau giới từ "for" cần danh từ → "due for renewal" (đến hạn gia hạn). "renew" là động từ nguyên mẫu, "renewed" là phân từ, "renewing" là V-ing nên không hợp với cụm "be due for + danh từ".` },
            { n: 140, lv: 'B2', q: '(140)', options: ['purchase', 'delay', 'change', 'complaint'], a: 2, cue: 'coverage for water damage has been raised',
              explain: `"The most important change this year is that …" (thay đổi quan trọng nhất là mức bảo hiểm thiệt hại do nước đã tăng) → "change". "purchase" (việc mua), "delay" (sự chậm trễ) và "complaint" (lời phàn nàn) không hợp nội dung thông báo điều khoản mới.` },
            { n: 141, lv: 'C1', q: '(141)', options: ['Our downtown office on Oak Avenue was freshly painted last month.', 'Current interest rates for all savings accounts stay at the same level.', 'You do not need to take any action to receive the additional coverage.', 'State regulations determine the filing deadline for any insurance claim.'], a: 2, cue: 'Customers who prefer to keep their current coverage must contact us by July 15.',
              explain: `Câu sau nói chỉ khách muốn giữ mức bảo hiểm cũ mới phải liên hệ → câu trước phải là: khách không cần làm gì vẫn nhận mức bảo hiểm mới ("You do not need to take any action…"). Chi nhánh sơn lại, lãi suất tiết kiệm hay hạn nộp yêu cầu bồi thường theo luật không nối được mạch.` },
            { n: 142, lv: 'B2', q: '(142)', options: ['between', 'during', 'from', 'within'], a: 0, cue: '8:00 A.M. and 6:00 P.M.',
              explain: `Cấu trúc "between … and …" chỉ khoảng thời gian giữa hai mốc → "between 8:00 A.M. and 6:00 P.M.". "from" phải đi với "to"; "during" và "within" không đi với hai mốc nối bằng "and".` }
          ] } ] },
        { title: 'Memo', text:
`To: Terminal 2 ground crew supervisors
From: Natalia Brandt, Director of Operations, Pelham Regional Airport
Date: February 10
Subject: New baggage-scanning procedure

Beginning March 3, baggage handlers at Terminal 2 will use handheld scanners to -----(143)----- every checked bag as it is loaded onto the aircraft. The change is meant to reduce misrouted bags, which rose 12 percent last quarter.

-----(144)-----. The second scan, at the aircraft door, will confirm that each bag is on the correct flight.

Supervisors are -----(145)----- for making sure that every handler completes training during one of the sessions on February 24 or 25. Handlers who do not complete the training by February 28 will not be -----(146)----- to work at the loading gates.`,
          groups: [ { type: 'mcq', instr: 'Questions 143-146 refer to the following memo.', items: [
            { n: 143, lv: 'B2', q: '(143)', options: ['verifies', 'verify', 'verified', 'verification'], a: 1, cue: 'handheld scanners to',
              explain: `Sau "to" (chỉ mục đích "use scanners to …") cần động từ nguyên mẫu có tân ngữ "every checked bag" → "verify" (kiểm tra xác nhận). "verifies" và "verified" đã chia thì/phân từ, "verification" là danh từ.` },
            { n: 144, lv: 'C1', q: '(144)', options: ['Baggage claim hours will be extended on weekends.', 'Handlers will receive new uniforms next month.', 'The scanners were purchased from a supplier in Denmark.', 'Each bag will now be scanned twice: once at the belt and again at the aircraft door.'], a: 3, cue: 'The second scan, at the aircraft door, will confirm that each bag is on the correct flight.',
              explain: `Câu sau nhắc "The second scan, at the aircraft door" → trước đó phải giới thiệu việc quét hai lần: "Each bag will now be scanned twice: once at the belt and again at the aircraft door". Giờ lấy hành lý, đồng phục hay nhà cung cấp máy quét không giải thích được cụm "the second scan".` },
            { n: 145, lv: 'B2', q: '(145)', options: ['relevant', 'accessible', 'reliable', 'responsible'], a: 3, cue: 'for making sure that every handler completes training',
              explain: `"be responsible for + V-ing" = chịu trách nhiệm làm gì → giám sát viên chịu trách nhiệm bảo đảm mọi nhân viên hoàn tất đào tạo. "relevant" (liên quan), "accessible" (dễ tiếp cận) và "reliable" (đáng tin) không đi với "for making sure" theo nghĩa này.` },
            { n: 146, lv: 'C1', q: '(146)', options: ['permit', 'permitted', 'permission', 'permitting'], a: 1, cue: 'Handlers who do not complete the training',
              explain: `Cấu trúc bị động "will not be permitted to work" (sẽ không được phép làm việc) → "permitted" (be + V3). "permit" là nguyên mẫu, "permission" là danh từ, "permitting" là V-ing, đều không hợp với "be … to work".` }
          ] } ] }
      ] },

    /* ================= PART 7 ================= */
    { part: 7, title: 'Reading Comprehension', instr: g.TQR[0],
      passages: [
        { title: 'Notice', text:
`CITY OF BRANTWICK – PUBLIC WORKS NOTICE

Water Main Replacement on Halvorsen Avenue

Beginning Monday, September 8, crews will replace the aging water main beneath Halvorsen Avenue between Pike Street and the Orrin River Bridge. The work is scheduled to take approximately three weeks.

During construction, Halvorsen Avenue will be closed to through traffic from 7:00 A.M. to 5:00 P.M. on weekdays. Residents and delivery vehicles will be permitted to enter the work zone for local access. Buses on Route 14 will use Pike Street and will not stop at the Halvorsen Avenue stops until the project is completed.

Water service to nearby homes and businesses may be shut off for up to four hours on one day during the project. Affected addresses will receive a door hanger 48 hours in advance. For updates, visit the city's Web site or call the Public Works hotline.`,
          groups: [ { type: 'mcq', instr: g.TQR[14], items: [
            { n: 147, lv: 'B1', q: 'What is the purpose of the notice?', options: ['To inform residents about upcoming road work', 'To announce a new bus route', 'To request volunteers for a river cleanup', 'To explain a change in water prices'], a: 0, cue: 'crews will replace the aging water main beneath Halvorsen Avenue',
              explain: `Thông báo cho biết đội thi công sẽ thay ống nước chính dưới đường Halvorsen và đường sẽ bị đóng một phần → mục đích là báo cho cư dân về công trình đường sắp tới. Tuyến buýt chỉ bị đổi lộ trình tạm thời (không phải tuyến mới); không nói về tình nguyện dọn sông hay giá nước.` },
            { n: 148, lv: 'B1', q: 'What is indicated about Halvorsen Avenue during construction?', options: ['It will be closed to all traffic.', 'It will be closed for three months.', 'Route 14 buses will continue to stop there.', 'Residents will still be able to enter the work zone.'], a: 3, cue: 'Residents and delivery vehicles will be permitted to enter the work zone for local access.',
              explain: `Bài nêu "Residents and delivery vehicles will be permitted to enter the work zone" → cư dân vẫn vào được khu thi công. Đường chỉ đóng với "through traffic" (xe đi xuyên qua), không phải mọi xe; công trình kéo dài khoảng ba tuần, không phải ba tháng; xe buýt tuyến 14 sẽ không dừng ở các trạm trên đường này.` }
          ] } ] },
        { title: 'Text-message chain', text:
`Nadia Orlov [9:02 A.M.]: Good morning, Pablo. I'm at the Tidewater Auto Rentals counter at the airport, but my reservation isn't showing up.
Pablo Reyes [9:04 A.M.]: Hi, Nadia. Did you book through our travel portal or directly with the company?
Nadia Orlov [9:05 A.M.]: Through the portal. The confirmation number is TW-20417.
Pablo Reyes [9:08 A.M.]: Got it. I see the problem. The portal booked the car for next Tuesday, not today. I'll call the agent now.
Nadia Orlov [9:09 A.M.]: Thanks. They have a compact available, but I need an SUV for the site visit.
Pablo Reyes [9:12 A.M.]: Take the compact for now. They'll swap it for an SUV this afternoon at no extra charge.
Nadia Orlov [9:13 A.M.]: OK, that works. I'll do the swap after my 1:00 meeting.`,
          groups: [ { type: 'mcq', instr: g.TQR[5], items: [
            { n: 149, lv: 'B1', q: 'Why is Ms. Orlov unable to pick up her car right away?', options: ['The rental office is currently unattended.', 'Her payment method was rejected.', 'Her reservation is dated for a different day.', 'Her identification document has lapsed.'], a: 2, cue: 'The portal booked the car for next Tuesday, not today.',
              explain: `Ông Reyes tìm ra lỗi: "The portal booked the car for next Tuesday, not today" → đặt chỗ bị ghi sai ngày. Quầy vẫn mở (cô đang đứng ở quầy), và không ai nhắc đến thẻ tín dụng hay bằng lái.` },
            { n: 150, lv: 'B2', q: 'What will Ms. Orlov most likely do this afternoon?', options: ['Cancel a booking', 'Pay an extra charge', 'Exchange a vehicle', 'Book a flight'], a: 2, cue: "I'll do the swap after my 1:00 meeting.",
              explain: `Ông Reyes nói công ty sẽ đổi xe nhỏ lấy SUV "this afternoon at no extra charge", và cô đáp "I'll do the swap after my 1:00 meeting" → chiều nay cô sẽ đổi xe. Việc đổi xe không mất thêm phí; cô không hủy đặt chỗ và không nhắc đến vé máy bay.` }
          ] } ] },
        { title: 'Advertisement', text:
`Peak & Pace Fitness – Spring Membership Offer

Ready to make this the year you finally stick to your goals? Join Peak & Pace Fitness before April 30 and get your first two months free.

What you get:
• Unlimited access to our three Dunwell locations, open 5:00 A.M. to 11:00 P.M. daily
• More than 60 weekly classes, from beginner yoga to high-intensity interval training
• A complimentary 45-minute assessment with a certified trainer
• Free child care at our Eastgate location during morning classes

New members who bring a coworker will each receive a Peak & Pace water bottle. Corporate groups of ten or more qualify for a further 15 percent discount on monthly fees. Mention this advertisement at the front desk to claim the offer. Terms apply: membership requires a 12-month commitment, and the free months are applied at the end of the contract.`,
          groups: [ { type: 'mcq', instr: 'Questions 151-152 refer to the following advertisement.', items: [
            { n: 151, lv: 'B1', q: 'What benefit is available only at the Eastgate location?', options: ['Child care during morning classes', 'A complimentary health evaluation session', 'A discounted rate for group memberships', 'Longer operating hours on weekends'], a: 0, cue: 'Free child care at our Eastgate location during morning classes',
              explain: `Chỉ có một ưu đãi gắn với cơ sở Eastgate: "Free child care at our Eastgate location during morning classes" (trông trẻ miễn phí trong các lớp buổi sáng). Giờ mở cửa, buổi đánh giá và giảm giá nhóm áp dụng chung, không riêng cho Eastgate.` },
            { n: 152, lv: 'B2', q: 'According to the advertisement, what must new members do to receive the free months?', options: ['Attend 60 classes', 'Sign a 12-month agreement', 'Bring a coworker', 'Pay for the first month in advance'], a: 1, cue: 'membership requires a 12-month commitment',
              explain: `Điều khoản cuối quảng cáo: "membership requires a 12-month commitment, and the free months are applied at the end of the contract" → phải cam kết hợp đồng 12 tháng mới được hai tháng miễn phí. Mang theo đồng nghiệp chỉ để nhận bình nước; "60 classes" là số lớp học mỗi tuần của phòng tập; không có yêu cầu trả trước tháng đầu.` }
          ] } ] },
        { title: 'E-mail', text:
`To: Marguerite Voss
From: Ibrahim Okonkwo, Business Services, Harbourline Bank
Date: October 6
Subject: Your merchant account application

Dear Ms. Voss,

Thank you for visiting our Calloway branch last week to discuss opening a merchant account for Voss Bakery. I am pleased to let you know that your application has been approved.

Once the account is active, you will be able to accept card payments in both of your shops. The terminal for the Rennick Street shop was shipped yesterday and should arrive by Friday. Because the second terminal is being configured for contactless payments, it will follow next week.

Please note that a processing fee of 1.9 percent applies to each card transaction. As we discussed, the fee will be reduced to 1.5 percent if your monthly sales exceed $20,000 for three consecutive months.

Before you begin accepting payments, I ask that you return the signed agreement attached to this message. You can scan it and send it by e-mail, which would avoid delays.

Sincerely,
Ibrahim Okonkwo`,
          groups: [ { type: 'mcq', instr: 'Questions 153-155 refer to the following e-mail.', items: [
            { n: 153, lv: 'B1', q: 'Why did Mr. Okonkwo write to Ms. Voss?', options: ['To notify her that her application was accepted', 'To request additional documentation for the account', 'To inform her of a temporary service interruption', 'To invite her to a promotional baking workshop'], a: 0, cue: 'your application has been approved',
              explain: `Câu thứ hai của thư: "your application has been approved" → mục đích chính là báo đơn mở tài khoản đã được chấp thuận. Phí chỉ được nhắc thêm (không phải thay đổi); cô đã ghé chi nhánh tuần trước; thư không nói về việc mở tiệm mới.` },
            { n: 154, lv: 'B2', q: 'The word "exceed" in paragraph 3 is closest in meaning to', options: ['equal', 'approach', 'surpass', 'calculate'], a: 2, cue: 'if your monthly sales exceed $20,000',
              explain: `"monthly sales exceed $20,000" = doanh số hằng tháng vượt quá 20.000 đô la → "surpass" (vượt qua). "equal" (bằng), "approach" (tiến gần tới) và "calculate" (tính toán) không có nghĩa "vượt hơn".` },
            { n: 155, lv: 'C1', q: 'What is suggested about Voss Bakery?', options: ['It recently changed its name.', 'It has two locations.', 'It processes more than $20,000 monthly.', 'It has banked with Harbourline for years.'], a: 1, cue: 'accept card payments in both of your shops',
              explain: `Cụm "both of your shops" và việc cần hai máy quẹt thẻ (một cho tiệm đường Rennick, một cho tiệm thứ hai) cho thấy tiệm bánh có hai địa điểm. Mức 20.000 đô la chỉ là điều kiện giảm phí; thư không nói đã đổi tên hay đã có quan hệ với ngân hàng nhiều năm (cô vừa mở tài khoản).` }
          ] } ] },
        { title: 'Invoice', text:
`Ledgerline Office Supply
Invoice No. 70418 | Date: November 3 | Terms: Net 30
Bill to: Fenwick & Aldous Architects, 88 Garrick Lane, Suite 400
Delivery date: November 5

Item | Qty | Unit price | Amount
Ergonomic desk chair, model C20 | 6 | $149.00 | $894.00
Whiteboard, 4 x 6 ft | 2 | $85.00 | $170.00
Laser printer toner, black | 8 | $62.50 | $500.00
Recycled copy paper (case of 10 reams) | 5 | $38.00 | $190.00

Subtotal: $1,754.00
Loyalty discount (5%): -$87.70
Delivery: $0.00 (free on orders over $1,500)
Total due: $1,666.30

Note: Chairs require assembly. Ledgerline technicians will assemble them on November 7 at no additional charge. Payment is due by December 3. A 2 percent monthly late fee applies to unpaid balances. Returns are accepted within 14 days of delivery, except for opened toner cartridges.`,
          groups: [ { type: 'mcq', instr: 'Questions 156-158 refer to the following invoice.', items: [
            { n: 156, lv: 'B1', q: 'Why was no delivery charge applied?', options: ['Fenwick & Aldous paid in advance.', 'The items were picked up at the store.', 'The customer is a new account.', 'The order exceeded a minimum amount.'], a: 3, cue: 'free on orders over $1,500',
              explain: `Hóa đơn ghi "Delivery: $0.00 (free on orders over $1,500)" → miễn phí giao hàng vì đơn hàng vượt mức tối thiểu 1.500 đô la. Hóa đơn có ngày giao hàng và hạn thanh toán là 3/12 (chưa trả trước), và khách hưởng "Loyalty discount" nên không phải khách mới.` },
            { n: 157, lv: 'B2', q: 'What is NOT stated on the invoice?', options: ['When the items will be delivered', 'Who will assemble the chairs', 'How late payments are penalized', 'Which payment methods are accepted'], a: 3, cue: 'A 2 percent monthly late fee applies to unpaid balances.',
              explain: `Câu hỏi tìm thông tin KHÔNG có. Hóa đơn ghi rõ ngày giao ("Delivery date: November 5"), người lắp ghế ("Ledgerline technicians"), và phạt trả chậm ("2 percent monthly late fee"). Chỉ có phương thức thanh toán được chấp nhận là không được đề cập.` },
            { n: 158, lv: 'B1', q: 'What will happen on November 7?', options: ['Some furniture will be put together.', 'The invoice will be processed.', 'Some chairs will be shipped.', 'The delivery will be scheduled for November 5.'], a: 0, cue: 'will assemble them on November 7',
              explain: `Ghi chú nói kỹ thuật viên "will assemble them on November 7" (lắp ráp ghế) → đồ nội thất sẽ được lắp ráp. Hàng được giao ngày 5/11, hạn thanh toán là 3/12, còn việc trả hàng được chấp nhận trong 14 ngày kể từ khi giao.` }
          ] } ] },
        { title: 'Article', text:
`Harrow Valley Gazette to Launch Digital Edition

HARROW VALLEY (June 12) – The Harrow Valley Gazette, the region's oldest newspaper, will begin publishing a digital edition in September, its owner announced Tuesday. —[1]—

Publisher Odile Marchetti said the edition will be available through a mobile app and a redesigned Web site. Subscribers to the print edition will receive access at no extra charge, while digital-only subscriptions will cost $7 per month. —[2]—

"Our readers told us in a survey that they want local news the moment it happens," Ms. Marchetti said. "A weekly print paper cannot do that." The Gazette, which has printed on Thursdays since 1921, will continue its weekly print run. —[3]—

To staff the new project, the Gazette will hire two reporters and a video producer. Applications are being accepted through July 15. —[4]— The newspaper also plans to partner with students from Dellmont College, who will contribute photographs and event listings as part of a credit-earning internship program.`,
          groups: [ { type: 'mcq', instr: 'Questions 159-161 refer to the following article.', items: [
            { n: 159, lv: 'B1', q: g.TQR[3], options: ["A newspaper's decision to increase page size", "A newspaper's plan to add an online edition", "A college's new journalism workshop", "A change in a newspaper's editorial staff"], a: 1, cue: 'will begin publishing a digital edition in September',
              explain: `Câu mở đầu: tờ báo "will begin publishing a digital edition in September" → bài nói về kế hoạch thêm ấn bản trực tuyến. Báo vẫn tiếp tục in hằng tuần nên không phải ngừng in; chương trình thực tập với trường đại học chỉ là chi tiết phụ; không có đổi chủ sở hữu.` },
            { n: 160, lv: 'B1', q: 'What will happen in September?', options: ['New editors will start next month.', 'The weekly print run will cease.', 'A digital edition will be introduced.', 'A community outreach will launch.'], a: 2, cue: 'will begin publishing a digital edition in September',
              explain: `Tháng 9 là thời điểm tờ báo bắt đầu phát hành ấn bản số. Ấn bản in vẫn tiếp tục ("will continue its weekly print run"); đơn xin việc nhận đến 15/7 và không nói ngày nhận việc; chương trình thực tập sinh không có mốc thời gian cụ thể.` },
            { n: 161, lv: 'B2', q: 'In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? "Interested candidates should send a résumé and three writing samples to the editor."', options: ['[1]', '[2]', '[3]', '[4]'], a: 3, cue: 'Applications are being accepted through July 15.',
              explain: `Câu cần chèn hướng dẫn gửi hồ sơ ("send a résumé and three writing samples") nên phải đứng ngay sau câu "Applications are being accepted through July 15" → vị trí [4]. Các vị trí còn lại nằm sau thông báo ấn bản số, giá thuê bao và ấn bản in, không liên quan đến tuyển dụng.` }
          ] } ] },
        { title: 'Online chat discussion', text:
`Karsten Lund [6:41 A.M.]: Flight AR 308 to Dalhaven is showing a 50-minute delay. Is the aircraft still in Merrow?
Yasmin Odell [6:43 A.M.]: Yes. A crew member found a warning light on the hydraulic panel during the overnight check. Maintenance is inspecting it now.
Tomás Ferreira [6:44 A.M.]: Gate B12 is the only one with a free slot for a replacement jet if we have to swap.
Karsten Lund [6:46 A.M.]: Is a swap likely?
Yasmin Odell [6:48 A.M.]: Too early to say. Maintenance will update us at 7:15.
Karsten Lund [6:49 A.M.]: OK. In the meantime I'll tell the gate agents to let the 112 connecting passengers know they may be rebooked.
Tomás Ferreira [6:50 A.M.]: Good idea. I'll hold B12 until we hear.
Yasmin Odell [6:51 A.M.]: I'll send everyone the update the moment I have it.`,
          groups: [ { type: 'mcq', instr: 'Questions 162-164 refer to the following online chat discussion.', items: [
            { n: 162, lv: 'B1', q: 'Why is the flight delayed?', options: ['A crew member missed the briefing.', 'The gate is closed for cleaning.', 'A mechanical warning needs to be checked.', 'Severe turbulence is forecast over Dalhaven.'], a: 2, cue: 'A crew member found a warning light on the hydraulic panel during the overnight check.',
              explain: `Cô Odell cho biết nhân viên phát hiện đèn cảnh báo trên bảng thủy lực và bộ phận bảo trì đang kiểm tra → chuyến bay trễ vì cảnh báo kỹ thuật cần kiểm tra. Nhân viên đó chỉ phát hiện lỗi chứ không vắng mặt; cổng B12 chỉ dùng nếu phải đổi máy bay; không nhắc đến thời tiết.` },
            { n: 163, lv: 'B2', q: 'At 6:48 A.M., what does Ms. Odell most likely mean when she writes, "Too early to say"?', options: ['She cannot yet assess whether the crew will be changed.', 'She cannot yet predict whether the plane will be replaced.', 'She cannot yet confirm if the gate agents have arrived.', 'She cannot yet state whether passengers have been informed.'], a: 1, cue: 'Is a swap likely?',
              explain: `Ông Lund hỏi "Is a swap likely?" (có phải đổi máy bay không?) và cô Odell đáp "Too early to say", rồi cho biết bảo trì sẽ báo lại lúc 7:15 → cô chưa thể dự đoán có thay máy bay hay không. Câu trả lời không nói về độ dài của chậm chuyến, việc nhân viên cổng hay việc báo hành khách.` },
            { n: 164, lv: 'B2', q: 'What will Mr. Ferreira most likely do next?', options: ['Keep a gate available', 'Contact connecting passengers', 'Send an update to the team', 'Inspect the hydraulic panel'], a: 0, cue: "I'll hold B12 until we hear.",
              explain: `Ông Ferreira nói "I'll hold B12 until we hear" (sẽ giữ cổng B12 cho đến khi có tin) → ông sẽ giữ cổng trống. Việc kiểm tra thuộc bộ phận bảo trì, việc báo hành khách nối chuyến do ông Lund nhận, còn việc gửi cập nhật do cô Odell nhận.` }
          ] } ] },
        { title: 'Web page', text:
`Kestrel Test Labs – Join Our Product Testing Panel

Kestrel Test Labs evaluates household products before they reach store shelves. We are looking for volunteers aged 18 and over to join our consumer panel in Ostrand.

How it works
Panelists visit our lab twice a month for sessions of about 90 minutes. During a session you may try a cordless vacuum, a kitchen blender, or a new brand of laundry detergent, then answer short questionnaires about performance and ease of use.

What you receive
Panelists are paid $35 per completed session. Those who attend every session in a quarter receive a $50 bonus. We do not require any technical knowledge, but all participants must sign a confidentiality agreement, as some products have not yet been released.

Who cannot join
Employees of appliance manufacturers and members of other panels run by Kestrel are not eligible, in order to keep results unbiased.

To apply, complete the short form on this page. Successful applicants are contacted within two weeks to schedule an orientation.`,
          groups: [ { type: 'mcq', instr: 'Questions 165-167 refer to the following Web page.', items: [
            { n: 165, lv: 'B1', q: 'What are panelists required to do?', options: ['Sign a confidentiality agreement', 'Complete a technical survey', 'Order a product sample for review', 'Prepare a short written report'], a: 0, cue: 'all participants must sign a confidentiality agreement',
              explain: `Trang web ghi "all participants must sign a confidentiality agreement" (mọi người tham gia phải ký thỏa thuận bảo mật). Chỉ cần "answer short questionnaires" (bảng hỏi ngắn), không cần báo cáo dài; "We do not require any technical knowledge" nên không phải học khóa kỹ thuật; không có yêu cầu mua sản phẩm.` },
            { n: 166, lv: 'C1', q: 'How much would a panelist earn for attending every session in one quarter?', options: ['$35', '$210', '$260', '$300'], a: 2, cue: 'Those who attend every session in a quarter receive a $50 bonus.',
              explain: `Mỗi tháng có hai buổi ("twice a month") nên một quý (3 tháng) có 6 buổi: 6 × $35 = $210; cộng thêm thưởng $50 cho người đi đủ mọi buổi trong quý → $260. "$210" quên tiền thưởng; "$35" chỉ là một buổi; "$300" không có cách tính nào dựa trên bài.` },
            { n: 167, lv: 'B2', q: 'Who would be ineligible to join the panel?', options: ['A 20‑year‑old university graduate', 'A former civil servant', 'A high school teacher residing in Ostrand', 'A person employed by a blender manufacturer'], a: 3, cue: 'Employees of appliance manufacturers and members of other panels run by Kestrel are not eligible',
              explain: `Bài loại trừ "Employees of appliance manufacturers" (nhân viên các hãng sản xuất thiết bị gia dụng); máy xay sinh tố là thiết bị gia dụng nên người làm cho hãng sản xuất máy xay không đủ điều kiện. Sinh viên 19 tuổi (trên 18), kỹ sư đã nghỉ hưu và giáo viên ở Ostrand đều đáp ứng điều kiện.` }
          ] } ] },
        { title: 'Article', text:
`Salt Marsh Rice Makes a Comeback
By Teodora Wenzel

BAYMOOR (April 9) – Eleven years ago, farmer Anselm Kroll stood in a flooded field and wondered whether his family's land was finished. Seawater had crept into the soil, and his rice yields had fallen by half. Today the same field is producing a salt-tolerant rice variety that is drawing buyers from three countries. —[1]—

Mr. Kroll's harvest last autumn was 40 tons. —[2]— He has contracted to sell all of this year's crop to Brightmeal Foods, a cereal maker, and some 25 other farmers in the area have asked to plant the variety next season.

The variety, called Baymoor Gold, was developed by researchers at the Tessaly Agricultural Institute, who crossed a traditional local strain with a hardier relative. It grows well in soil that would ruin most grains. "We did not expect it to taste better, too," said Institute scientist Prisca Adeyemi. "It has a nutty flavor that chefs love." —[3]—

Seed supplies, however, remain limited. The Institute says it can provide enough seed for only 300 hectares this year, so planting will be rationed. —[4]— Ms. Adeyemi said the Institute hopes to triple production by 2027. Meanwhile, Mr. Kroll says he is happy to wait. "I used to look at that field with dread," he said. "Now I look at it with pride."`,
          groups: [ { type: 'mcq', instr: 'Questions 168-171 refer to the following article.', items: [
            { n: 168, lv: 'B2', q: g.TQR[3], options: ["A cereal company's plan to launch a new product.", 'The development of a rice variety for salty soil', "A farmer's choice to lease his equipment.", 'A new technique for drying grain.'], a: 1, cue: 'a salt-tolerant rice variety',
              explain: `Bài kể về giống lúa chịu mặn Baymoor Gold giúp ông Kroll phục hồi cánh đồng nhiễm mặn → chủ đề là việc phát triển giống lúa cho đất mặn. Công ty ngũ cốc chỉ là nơi mua lúa; ông Kroll không bán đất; bài không nói về phương pháp thu hoạch mới.` },
            { n: 169, lv: 'B2', q: 'What is NOT stated about Baymoor Gold?', options: ['It was developed at a research institute.', 'It has a nutty flavor.', 'It was first grown in another country.', 'Its seed is in limited supply.'], a: 2, cue: 'was developed by researchers at the Tessaly Agricultural Institute',
              explain: `Câu hỏi tìm điều KHÔNG được nêu. Bài nêu giống lúa do viện nghiên cứu tạo ra ("developed by researchers at the Tessaly Agricultural Institute"), có vị béo bùi ("nutty flavor") và hạt giống còn hạn chế ("Seed supplies … remain limited"). Chỉ chi tiết được trồng đầu tiên ở nước khác là không có trong bài.` },
            { n: 170, lv: 'C1', q: 'The word "rationed" in paragraph 4 is closest in meaning to', options: ['restricted', 'postponed', 'recorded', 'encouraged'], a: 0, cue: 'planting will be rationed',
              explain: `Hạt giống chỉ đủ cho 300 ha nên việc gieo trồng "will be rationed" = bị giới hạn, phân phối có hạn → "restricted". "postponed" (hoãn lại) không đúng vì vẫn trồng trong năm nay; "recorded" (ghi lại) và "encouraged" (khuyến khích) trái với ngữ cảnh khan hiếm.` },
            { n: 171, lv: 'C1', q: 'In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? "That is nearly double what he harvested in the worst year of the flooding."', options: ['[1]', '[2]', '[3]', '[4]'], a: 1, cue: "Mr. Kroll's harvest last autumn was 40 tons.",
              explain: `"That" phải chỉ một con số vừa nêu: sản lượng "40 tons" của ông Kroll mùa thu năm ngoái, và câu so sánh với năm lũ tệ nhất → vị trí [2], ngay sau câu đó. Các vị trí khác đứng sau câu về người mua, hương vị hay hạt giống, không có số liệu để "That" quy chiếu.` }
          ] } ] },
        { title: 'Letter', text:
`Whitcombe & Sato LLP
14 Parkgate Road, Linwood
April 22

Mr. Rafael Duarte
Chief Operating Officer, Oakhaven Dairy Cooperative

Dear Mr. Duarte,

Following our meeting on April 15, I am writing to summarize the steps your cooperative should take to meet the new food labeling regulations that take effect on January 1. —[1]—

Under the regulations, every product must list its ingredients in descending order by weight and must name any of the nine major allergens in bold type. Packaging that does not comply may not be sold after the deadline, even if it was printed before the rules were issued. —[2]— I therefore recommend that you stop ordering new packaging until our review of your label designs is finished.

We have examined 14 of your 31 product labels so far. Eleven of these need minor changes, mainly in how allergens are displayed. —[3]— The remaining labels, including those for your cheese range, will be reviewed by May 10.

Please also note that the regulations require companies to keep records of label approvals for at least five years. I suggest assigning one person in your quality department to maintain these files. —[4]—

I am available to discuss any of these points at your convenience.

Sincerely,
Henrietta Sato, Partner`,
          groups: [ { type: 'mcq', instr: 'Questions 172-175 refer to the following letter.', items: [
            { n: 172, lv: 'B2', q: 'Why did Ms. Sato write to Mr. Duarte?', options: ['To invite him to a conference', 'To report a lawsuit against his company', 'To recommend a new supplier', 'To describe how to comply with new regulations'], a: 3, cue: 'I am writing to summarize the steps your cooperative should take to meet the new food labeling regulations',
              explain: `Mở đầu thư: "I am writing to summarize the steps your cooperative should take to meet the new food labeling regulations" → mục đích là nêu các bước để tuân thủ quy định mới về nhãn thực phẩm. Thư không mời dự hội nghị, không nói về vụ kiện hay nhà cung cấp mới.` },
            { n: 173, lv: 'B2', q: 'What does Ms. Sato advise Oakhaven to do?', options: ['Postpone ordering new packaging', 'Hire an additional lawyer', 'Reprint all labels immediately', 'Remove allergens from products'], a: 0, cue: 'stop ordering new packaging until our review of your label designs is finished',
              explain: `Bà Sato khuyên "stop ordering new packaging until our review … is finished" → tạm hoãn đặt bao bì mới. Bà không bảo thuê thêm luật sư, không bảo in lại toàn bộ nhãn ngay (mới rà 14/31 nhãn) và quy định chỉ yêu cầu ghi chất gây dị ứng, không yêu cầu bỏ chúng khỏi sản phẩm.` },
            { n: 174, lv: 'B1', q: 'The word "maintain" in paragraph 4 is closest in meaning to', options: ['repair', 'argue', 'keep', 'claim'], a: 2, cue: 'to maintain these files',
              explain: `"maintain these files" = duy trì, quản lý hồ sơ → "keep" (giữ, lưu trữ). "repair" (sửa chữa), "argue" (tranh luận) và "claim" (khẳng định/đòi) không đi với tân ngữ "files" theo nghĩa này.` },
            { n: 175, lv: 'C1', q: 'In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? "In practice, any unused stock of such packaging may have to be discarded."', options: ['[1]', '[2]', '[3]', '[4]'], a: 1, cue: 'even if it was printed before the rules were issued',
              explain: `Cụm "such packaging" (bao bì như vậy) phải quy chiếu về "Packaging that does not comply" (bao bì không tuân thủ) → vị trí [2], ngay sau câu nói loại bao bì này không được bán dù in trước khi có quy định, và trước câu "I therefore recommend…". Các vị trí khác không có bao bì để "such packaging" thay thế.` }
          ] } ] },
        { title: 'Web page and E-mail', text:
`Teldane Mutual – Renters Insurance Plans

Protect your belongings, your liability, and your peace of mind.

Plan | Personal property | Liability | Monthly premium
Basic | $15,000 | $100,000 | $12
Standard | $30,000 | $200,000 | $19
Plus | $50,000 | $300,000 | $27

All plans include coverage for fire, theft, and water damage from burst pipes. Flood damage is covered only under the Plus plan. Customers who bundle renters insurance with a Teldane auto policy save 10 percent on both. Claims can be filed online or by phone, and most are settled within 10 business days. Policyholders can change plans at any time; the new premium applies from the next billing date.

* * *

To: service@teldanemutual.example
From: Callum Brightwell
Date: May 14
Subject: Policy upgrade and claim

Hello,

I currently have the Basic plan. Last week, a pipe burst in the apartment above mine and water ruined my sofa, a rug, and my laptop. I estimate the total value at about $4,800. I filed a claim online on May 9 (reference RN-5521) but haven't heard anything yet.

I'm also moving to a larger apartment on June 1, and I'd like to switch to the plan that covers up to $30,000 in belongings. I have a Teldane auto policy, so please confirm whether the discount applies.

Thank you,
Callum Brightwell`,
          groups: [ { type: 'mcq', instr: g.TQR[20], items: [
            { n: 176, lv: 'B1', q: 'Why did Mr. Brightwell write to Teldane Mutual?', options: ['To cancel his renters insurance policy', 'To dispute the monthly premium amount', 'To report water damage to his laptop', 'To ask about a claim and a plan change'], a: 3, cue: "I'd like to switch to the plan that covers up to $30,000 in belongings",
              explain: `Thư vừa hỏi về yêu cầu bồi thường đã nộp ("I filed a claim online … haven't heard anything yet") vừa muốn đổi gói bảo hiểm ("I'd like to switch to the plan…"). Ông vẫn muốn giữ chính sách xe hơi (hỏi về giảm giá), không tranh cãi phí bảo hiểm, và laptop bị hỏng do nước chứ không bị trộm.` },
            { n: 177, lv: 'B2', q: 'What is indicated about the damage described in the e-mail?', options: ['It is covered under his current plan.', 'It is included only in the Plus plan.', 'It exceeds the liability coverage of his plan.', 'It was caused by a recent power outage.'], a: 0, cue: 'All plans include coverage for fire, theft, and water damage from burst pipes.',
              explain: `Kết hợp hai văn bản: ống nước vỡ gây hỏng đồ → trang web nói mọi gói đều bảo hiểm "water damage from burst pipes", và thiệt hại khoảng $4,800 thấp hơn hạn mức $15,000 của gói Basic. Chỉ gói Plus mới bao lũ lụt, nhưng đây không phải lũ; thiệt hại cũng không vượt hạn mức.` },
            { n: 178, lv: 'C1', q: 'How much will Mr. Brightwell most likely pay per month after he switches plans and the discount applies?', options: ['$12.00', '$19.00', '$24.30', '$17.10'], a: 3, cue: 'save 10 percent on both',
              explain: `Ông muốn gói bảo hiểm tài sản $30,000, tức gói Standard giá $19; có chính sách xe Teldane nên được giảm 10% ("save 10 percent on both") → $19 × 0,9 = $17,10. "$12.00" là gói Basic hiện tại, "$19.00" là giá chưa giảm, "$24.30" là giá gói Plus ($27) sau khi giảm.` },
            { n: 179, lv: 'B2', q: 'The word "settled" in the Web page is closest in meaning to', options: ['relocated', 'resolved', 'calmed', 'occupied'], a: 1, cue: 'most are settled within 10 business days',
              explain: `"claims … are settled within 10 business days" = các yêu cầu bồi thường được giải quyết, xử lý xong trong 10 ngày làm việc → "resolved". "relocated" (chuyển chỗ), "calmed" (làm dịu) và "occupied" (chiếm chỗ) không hợp nghĩa của "settle" trong bảo hiểm.` },
            { n: 180, lv: 'C1', q: "What can be inferred about Mr. Brightwell's claim?", options: ['It was rejected by the adjuster.', 'It was submitted via fax.', 'It is still within the usual processing time.', 'It requires an upgrade to the Standard plan.'], a: 2, cue: 'I filed a claim online on May 9',
              explain: `Ông nộp yêu cầu ngày 9/5 và viết thư ngày 14/5, tức mới vài ngày làm việc, trong khi trang web nói đa số được giải quyết trong 10 ngày làm việc → vẫn trong thời gian xử lý thông thường. Ông nộp trực tuyến (không phải qua điện thoại), chưa có thông tin bị từ chối, và gói Basic đã bao bồi thường nước nên không cần gói Plus.` }
          ] } ] },
        { title: 'Memo, E-mail, and E-mail', text:
`To: All Staff, Oriel Design Group
From: Maya Fenn, Facilities Manager
Date: August 19
Subject: Moving to 220 Tannery Row

Our move to the new office is set for the weekend of September 6–7. Each department has been assigned a packing day (see below). Please pack personal items only; the movers will handle furniture and equipment. Boxes will be delivered to your desk on August 28. Anything left on your desk or in drawers after your packing day cannot be guaranteed to arrive.

Tuesday, Sept. 2 – Finance and Human Resources
Wednesday, Sept. 3 – Marketing and Sales
Thursday, Sept. 4 – Design Studio
Friday, Sept. 5 – Administration

IT will relocate the servers on Friday afternoon, which will mean two hours of network downtime.

* * *

To: Maya Fenn
From: Dmitri Salazar
Date: August 21
Subject: Packing day

Maya,
I manage the Design Studio. Our team has a client presentation on Thursday, September 4, and several of us will need our computers and large printed boards until the end of that day. Could our department pack on a later day? Our large-format printer is also scheduled for delivery to the new building on September 8. Will it be installed before we start work there?
Thanks,
Dmitri

* * *

To: Dmitri Salazar
From: Maya Fenn
Date: August 22
Subject: RE: Packing day

Dmitri, Administration has agreed to swap with you, so your department will now pack on Friday, September 5. The printer will be installed on the morning of September 9, and I will ask IT to test it right away.
Maya`,
          groups: [ { type: 'mcq', instr: 'Questions 181-185 refer to the following memo and e-mails.', items: [
            { n: 181, lv: 'B1', q: 'What does Ms. Fenn ask the employees to do?', options: ['Pack personal items on an assigned day', 'Schedule a moving company for your department', 'Deliver cardboard boxes to the reception area', 'Copy all important documents to a backup drive'], a: 0, cue: 'Please pack personal items only',
              explain: `Bản ghi nhớ viết: "Please pack personal items only" và mỗi phòng ban có một "packing day" → nhân viên đóng gói đồ cá nhân vào ngày được chỉ định. Người vận chuyển lo đồ nội thất, hộp được phát tận bàn, còn việc sao lưu máy tính không được nhắc đến.` },
            { n: 182, lv: 'B2', q: 'Why does Mr. Salazar request a change?', options: ['His staff will be away on a trip.', 'His office will not have network access.', 'His department has been assigned the wrong boxes.', 'His team needs its equipment for a presentation.'], a: 3, cue: 'several of us will need our computers and large printed boards until the end of that day',
              explain: `Ông Salazar giải thích nhóm có buổi thuyết trình với khách vào thứ Năm và cần máy tính cùng bảng in lớn "until the end of that day" → cần thiết bị cho buổi thuyết trình. Thư không nói nhân viên đi công tác, mất mạng (downtime là việc của IT vào thứ Sáu) hay phát nhầm hộp.` },
            { n: 183, lv: 'B2', q: 'When will the Design Studio pack its belongings?', options: ['Wednesday, September 3', 'Friday, September 5', 'Thursday, September 4', 'Monday, September 8'], a: 1, cue: 'so your department will now pack on Friday, September 5',
              explain: `Lịch ban đầu xếp Design Studio vào thứ Năm 4/9, nhưng bà Fenn trả lời là phòng Administration đồng ý đổi chỗ nên "your department will now pack on Friday, September 5". Thứ Năm 4/9 là ngày cũ, thứ Tư 3/9 là của Marketing and Sales, còn thứ Hai 8/9 sau khi đã chuyển.` },
            { n: 184, lv: 'C1', q: 'What is suggested about the large-format printer?', options: ['It will be delivered before the move.', 'It will be packed by the movers on September 2.', 'It will be installed after the first workday at the new office.', 'It will be replaced with a newer model.'], a: 2, cue: 'The printer will be installed on the morning of September 9',
              explain: `Việc chuyển diễn ra cuối tuần 6–7/9 nên ngày làm việc đầu tiên ở văn phòng mới là 8/9; máy in giao ngày 8/9 và "will be installed on the morning of September 9" → lắp sau ngày làm việc đầu tiên. Máy in không giao trước khi chuyển, không do thợ đóng gói ngày 2/9 và không có kế hoạch thay máy mới.` },
            { n: 185, lv: 'B2', q: 'The word "guaranteed" in the memo is closest in meaning to', options: ['promised', 'permitted', 'supposed', 'insured'], a: 0, cue: 'cannot be guaranteed to arrive',
              explain: `"cannot be guaranteed to arrive" = không thể bảo đảm sẽ được chuyển đến nơi → "promised" (hứa chắc, bảo đảm). "permitted" (được phép), "supposed" (được cho là) và "insured" (được bảo hiểm) không phản ánh ý đảm bảo chắc chắn.` }
          ] } ] },
        { title: 'Advertisement, E-mail, and E-mail', text:
`Pinewhistle Press – First Chapter Prize

Calling all unpublished novelists! Pinewhistle Press, an independent publisher of literary fiction, invites submissions for its annual First Chapter Prize.

• Submit the first chapter (5,000 words maximum) and a one-page summary of your complete novel.
• Entries must be received by March 31 and may not have been published in any form.
• There is a $15 entry fee, which is waived for students.
• Three finalists will be announced on May 12. The winner will receive a $2,000 advance and a publishing contract for the full manuscript.
• Entries are read anonymously, so please leave your name off the manuscript pages and include it only on the cover form.

* * *

To: contests@pinewhistlepress.example
From: Aurelio Banda
Date: March 28
Subject: Question about my entry

Hello,
I submitted my entry last night but then realized I typed my name at the top of the first page of the chapter. Can I replace the file? Also, I am a part-time graduate student, but I paid the entry fee before reading the rules carefully. Is a refund possible? Finally, my chapter is about 5,400 words because I did not want to cut the ending of the scene. I hope that is acceptable.
Thank you,
Aurelio Banda

* * *

To: Aurelio Banda
From: Soledad Park, Contest Coordinator
Date: March 29
Subject: RE: Question about my entry

Dear Mr. Banda,
Thank you for your message. You may upload a new file until March 31; the old one will be deleted. Because students are exempt from the fee, I have refunded your $15; please send a copy of your student ID. Unfortunately, entries over the word limit cannot be considered, so please trim your chapter to 5,000 words when you resubmit.
Best wishes,
Soledad Park`,
          groups: [ { type: 'mcq', instr: 'Questions 186-190 refer to the following advertisement and e-mails.', items: [
            { n: 186, lv: 'B1', q: 'Why did Mr. Banda write to Pinewhistle Press?', options: ['To cancel his participation in the competition', 'To inquire about the eligibility criteria', 'To submit a new manuscript for consideration', 'To request changes to an entry he submitted'], a: 3, cue: 'Can I replace the file?',
              explain: `Ông Banda hỏi "Can I replace the file?" và hỏi về hoàn phí, độ dài chương → ông muốn xin sửa đổi bài đã nộp. Ông không rút lui khỏi cuộc thi, không hỏi về luật chơi và không thông báo tiểu thuyết mới.` },
            { n: 187, lv: 'B2', q: 'What problem did Mr. Banda notice about his entry?', options: ['It arrived after the deadline.', 'It included information that should have been left out.', 'It was sent to the wrong address.', 'It was missing a one-page summary.'], a: 1, cue: 'I typed my name at the top of the first page of the chapter',
              explain: `Ông gõ tên mình ở đầu trang một, trong khi quảng cáo yêu cầu "leave your name off the manuscript pages" vì bài được chấm ẩn danh → bài có thông tin lẽ ra phải bỏ đi. Ông nộp đêm trước khi viết thư (còn trước hạn 31/3), không nhắc đến địa chỉ gửi hay bản tóm tắt.` },
            { n: 188, lv: 'B2', q: 'What is indicated about Mr. Banda?', options: ['He has already won a literary award.', 'He was selected as a contest judge.', 'He is enrolled in a university program.', 'He volunteers at the local library.'], a: 2, cue: 'I am a part-time graduate student',
              explain: `Ông tự nói "I am a part-time graduate student" (sinh viên cao học bán thời gian) → ông đang theo học một chương trình đại học, và cô Park xác nhận ông được miễn phí vì là sinh viên. Cuộc thi dành cho tác giả chưa xuất bản; danh sách chung kết chưa công bố; ông không làm việc cho nhà xuất bản.` },
            { n: 189, lv: 'B2', q: 'What does Ms. Park ask Mr. Banda to send?', options: ['Proof of his student status', 'An additional entry fee', 'A brief manuscript summary', 'An updated submission form'], a: 0, cue: 'please send a copy of your student ID',
              explain: `Cô Park viết "please send a copy of your student ID" → yêu cầu gửi bằng chứng ông là sinh viên. Cô đã hoàn lại $15 nên không cần phí mới; không yêu cầu gửi bản tóm tắt hay phiếu bìa chỉnh sửa.` },
            { n: 190, lv: 'C1', q: 'By March 31, what must Mr. Banda most likely do?', options: ['Pay an additional fee', 'Sign a publishing contract', 'Attend an announcement event', 'Submit a shortened chapter'], a: 3, cue: 'please trim your chapter to 5,000 words when you resubmit',
              explain: `Kết hợp: hạn nộp là 31/3, cô Park cho phép tải tệp mới đến hết ngày đó nhưng bài vượt giới hạn 5.000 chữ không được xét ("trim your chapter to 5,000 words") → ông phải nộp lại chương đã rút ngắn. Ông đã được hoàn phí, ngày công bố là 12/5 và hợp đồng chỉ dành cho người thắng cuộc.` }
          ] } ] },
        { title: 'Schedule and E-mails', text:
`Lakeshore Wellness Studio – Fall Class Schedule (September–November)

Monday | 6:30 A.M. | Sunrise Yoga (Studio A, 60 min)
Monday | 6:00 P.M. | Core Strength (Studio B, 45 min)
Tuesday | 12:15 P.M. | Lunchtime Cycling (Cycle Room, 45 min)
Wednesday | 6:30 A.M. | Sunrise Yoga (Studio A, 60 min)
Thursday | 6:00 P.M. | Gentle Stretch (Studio A, 60 min)
Saturday | 9:00 A.M. | Family Fitness (Studio B, 60 min; children 8 and over)

Drop-in price: $18. Class pass (10 classes): $140, valid for three months. Registration is required for Cycle Room classes because space is limited to 12 riders.

* * *

To: info@lakeshorewellness.example
From: Joanne Pruitt
Date: September 12
Subject: Class pass and cycling

Hello,
I recently moved to the area and am looking for classes that fit around my work. I am in the office from 9:00 to 5:30 on weekdays, so I need early-morning or evening options. I would like to try yoga and cycling. Also, my 10-year-old son wants to join me at some point. I am planning to buy the class pass tomorrow.
Thank you,
Joanne Pruitt

* * *

To: Joanne Pruitt
From: Lakeshore Wellness Studio
Date: September 13
Subject: RE: Class pass and cycling

Dear Ms. Pruitt,
Welcome to the neighborhood! Two of our yoga classes fit your hours. Cycling is currently held at lunchtime only, so beginning October 1 we are adding an evening cycling class on Wednesdays at 6:00 P.M. Your son may join you at the Saturday family class on a drop-in basis. Please remember that registration is required for any cycling class.`,
          groups: [ { type: 'mcq', instr: 'Questions 191-195 refer to the following schedule and e-mails.', items: [
            { n: 191, lv: 'B1', q: 'Why did Ms. Pruitt write to the studio?', options: ['To sign up for a yoga membership today', 'To request a refund for the class pass', 'To ask about classes that suit her schedule', 'To inquire about the studio’s next holiday hours'], a: 2, cue: 'looking for classes that fit around my work',
              explain: `Cô Pruitt viết "looking for classes that fit around my work" và nêu giờ làm việc để hỏi về lớp học phù hợp → cô hỏi về các lớp hợp với lịch của mình. Đăng ký lớp gia đình, yêu cầu hoàn tiền, hoặc hỏi giờ nghỉ lễ không phải mục đích của cô.` },
            { n: 192, lv: 'B2', q: 'Which class could Ms. Pruitt attend on a weekday morning?', options: ['Core Strength', 'Sunrise Yoga', 'Gentle Stretch', 'Lunchtime Cycling'], a: 1, cue: 'I am in the office from 9:00 to 5:30 on weekdays',
              explain: `Lớp duy nhất vào buổi sáng ngày thường là "Sunrise Yoga" (6:30 sáng thứ Hai và thứ Tư), trước giờ cô vào văn phòng lúc 9:00. Core Strength và Gentle Stretch diễn ra lúc 6 giờ chiều, còn Lunchtime Cycling vào giữa trưa khi cô đang làm việc.` },
            { n: 193, lv: 'B2', q: 'What does Ms. Pruitt probably need to do to take the new cycling class?', options: ['Register in advance', 'Buy a membership', 'Pay a $140 deposit', 'Bring her own bicycle'], a: 0, cue: 'registration is required for any cycling class',
              explain: `Thư trả lời nhắc "registration is required for any cycling class" và lịch ghi "Registration is required for Cycle Room classes" (chỉ có 12 chỗ) → cô cần đăng ký trước. Lớp tính phí theo giá thả cửa hoặc thẻ lớp học (không có khoản đặt cọc $140), không yêu cầu hội viên, và xe đạp có sẵn trong phòng.` },
            { n: 194, lv: 'B2', q: "What is suggested about Ms. Pruitt's son?", options: ['He is enrolled as a studio member.', 'He is old enough to attend a family class.', 'He must purchase a class pass.', 'He is interested in joining a yoga session.'], a: 1, cue: 'children 8 and over',
              explain: `Lịch ghi lớp Family Fitness dành cho trẻ "8 and over" (từ 8 tuổi), còn con cô Pruitt 10 tuổi → cậu đủ tuổi tham gia. Cậu có thể đến lớp theo hình thức thả cửa ("drop-in basis") nên không cần thẻ lớp học, không phải hội viên và không có thông tin cậu muốn học yoga.` },
            { n: 195, lv: 'C1', q: 'If Ms. Pruitt buys a class pass on September 13, by about when must she use all of its classes?', options: ['By the end of September', 'By the end of October', 'By the end of November', 'By mid-December'], a: 3, cue: 'valid for three months',
              explain: `Cô nói sẽ mua thẻ vào ngày mai (13/9) và lịch ghi thẻ 10 buổi "valid for three months" (có hiệu lực ba tháng) → hết hạn vào khoảng giữa tháng 12. Các mốc cuối tháng 9, tháng 10 và tháng 11 đều ngắn hơn ba tháng.` }
          ] } ] },
        { title: 'Web page and E-mails', text:
`Gantry Car & Van Rental – Weekend Specials

Vehicle | Daily rate | Mileage per day
Compact (seats 4) | $39 | 150 miles
Midsize SUV (seats 5) | $62 | 200 miles
Passenger van (seats 12) | $95 | 250 miles
Cargo van | $88 | 250 miles

Weekend special: Rent from Friday after 3:00 P.M. and return by Monday at 10:00 A.M. and pay for only two days. The mileage allowance is based on the number of days charged. Additional miles cost $0.40 each. A refundable security deposit of $200 is charged at pickup. Drivers must be at least 23 years old and present a valid license. Child seats are available for $8 per day. Reservations can be changed free of charge up to 24 hours before pickup.

* * *

To: reservations@gantryrental.example
From: Vanessa Lindqvist
Date: June 3
Subject: Reservation for June 13–16

Hello,
I would like to reserve a vehicle for our club's trip to the lake. Eight members will travel, with camping gear. We will pick up the vehicle on Friday, June 13, at about 4:30 P.M. and return it Monday morning by 9:30. I expect to drive about 560 miles in total. Please let me know the price.

* * *

To: Vanessa Lindqvist
From: Gantry Reservations
Date: June 4
Subject: RE: Reservation for June 13–16

Dear Ms. Lindqvist,
Thank you for choosing Gantry. For eight passengers plus gear, we recommend a passenger van. It is available for your dates, and the weekend special applies to your pickup and return times. The $200 deposit will be taken at pickup and refunded when the van is returned in good condition.`,
          groups: [ { type: 'mcq', instr: 'Questions 196-200 refer to the following Web page and e-mails.', items: [
            { n: 196, lv: 'B2', q: "What is the purpose of Ms. Lindqvist's e-mail?", options: ['To report damage to a vehicle', 'To change an existing reservation', 'To request a rental for a group trip', 'To ask about a driver position'], a: 2, cue: "I would like to reserve a vehicle for our club's trip to the lake",
              explain: `Cô viết "I would like to reserve a vehicle for our club's trip to the lake" → yêu cầu thuê xe cho chuyến đi của nhóm. Đây là đặt chỗ mới (không phải thay đổi đặt chỗ cũ), không có xe nào bị hỏng và không nói đến việc làm tài xế.` },
            { n: 197, lv: 'B2', q: 'Which vehicle does Gantry recommend?', options: ['Compact', 'Midsize SUV', 'Passenger van', 'Cargo van'], a: 2, cue: 'we recommend a passenger van',
              explain: `Thư trả lời nêu rõ: "For eight passengers plus gear, we recommend a passenger van" (xe 12 chỗ). Xe nhỏ chỉ có 4 chỗ, SUV có 5 chỗ nên không đủ cho 8 người; xe tải chở hàng không phải xe chở khách.` },
            { n: 198, lv: 'C1', q: 'How much will Ms. Lindqvist most likely pay in rental charges, not counting the deposit?', options: ['$214.00', '$190.00', '$285.00', '$314.00'], a: 0, cue: 'pay for only two days',
              explain: `Xe 12 chỗ giá $95/ngày, ưu đãi cuối tuần chỉ tính hai ngày → $190, hạn mức quãng đường tính theo số ngày tính phí: 2 × 250 = 500 dặm. Cô đi khoảng 560 dặm nên vượt 60 dặm × $0,40 = $24 → tổng $214. "$190.00" quên phí vượt dặm; "$285.00" là ba ngày; "$314.00" tính hạn mức chỉ một ngày.` },
            { n: 199, lv: 'B2', q: "What is true about Ms. Lindqvist's pickup and return times?", options: ["They are outside the rental office's hours.", 'They require an additional fee.', 'They have been changed by the company.', 'They meet the conditions of a special rate.'], a: 3, cue: 'the weekend special applies to your pickup and return times',
              explain: `Bà nhận xe thứ Sáu lúc 4:30 chiều (sau 3:00 chiều) và trả thứ Hai trước 9:30 sáng (trước 10:00 sáng), đúng điều kiện ưu đãi cuối tuần; công ty cũng xác nhận "the weekend special applies". Không có phí bổ sung, công ty không đổi giờ, và bài không nói về giờ làm việc của văn phòng.` },
            { n: 200, lv: 'B2', q: 'According to the Web page, what can Ms. Lindqvist do at no charge?', options: ['Add a second driver', 'Return the vehicle to another city', 'Change her booking more than a day before pickup', 'Rent a child seat'], a: 2, cue: 'Reservations can be changed free of charge up to 24 hours before pickup.',
              explain: `Trang web ghi "Reservations can be changed free of charge up to 24 hours before pickup" → có thể đổi đặt chỗ miễn phí nếu trước giờ nhận xe hơn một ngày. Ghế trẻ em tính $8 mỗi ngày, còn việc thêm tài xế và trả xe ở thành phố khác không được nhắc đến.` }
          ] } ] }
      ] }
  ] });
})(typeof self !== 'undefined' ? self : this);
