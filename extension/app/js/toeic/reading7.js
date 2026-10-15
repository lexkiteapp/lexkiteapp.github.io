/* TOEIC Reading – Test 7 (tự biên soạn) */
(function (g) {
  const T = g.TOEIC = g.TOEIC || { reading: [], listening: [] };
  T.reading.push({ id: 'tr7', test: 7, title: 'TOEIC Reading Test 7', parts: [

    /* ================= PART 5 ================= */
    { part: 5, title: 'Incomplete Sentences', instr: 'A word or phrase is missing in each of the sentences below. Four answer choices are given below each sentence. Select the best answer to complete the sentence.',
      groups: [ { type: 'mcq', instr: '', items: [
        { n: 101, q: 'Ms. Feldmann ------- reviewed the lease agreement before signing it.', options: ['careful', 'carefully', 'care', 'carefulness'], a: 1, cue: '------- reviewed',
          explain: 'Cần trạng từ đứng trước và bổ nghĩa cho động từ "reviewed" → "carefully" (cẩn thận). "careful" là tính từ; "care" là danh từ/động từ; "carefulness" là danh từ.' },
        { n: 102, q: 'Patients who arrive late may be asked to reschedule ------- appointments.', options: ['they', 'them', 'their', 'themselves'], a: 2, cue: '------- appointments',
          explain: 'Trước danh từ "appointments" cần tính từ sở hữu → "their" (lịch hẹn của họ). "they" là đại từ chủ ngữ; "them" là đại từ tân ngữ, không đứng trước danh từ; "themselves" là đại từ phản thân.' },
        { n: 103, q: 'The new warehouse management software ------- next Monday.', options: ['will be installed', 'installed', 'is installing', 'to install'], a: 0, cue: 'next Monday',
          explain: 'Phần mềm "sẽ được cài đặt" vào thứ Hai tới → bị động tương lai "will be installed". "installed" (quá khứ) sai thì với "next Monday"; "is installing" mang nghĩa chủ động (phần mềm tự cài cái gì) – vô lý; "to install" không làm động từ chính.' },
        { n: 104, q: '------- the rise in fuel prices, Tarrow Freight has kept its shipping rates unchanged.', options: ['Although', 'Because', 'Unless', 'Despite'], a: 3, cue: 'the rise in fuel prices',
          explain: 'Theo sau là cụm danh từ "the rise in fuel prices" và ý nghĩa tương phản (giá nhiên liệu tăng nhưng giá cước không đổi) → giới từ "Despite" (mặc dù). "Although", "Because", "Unless" là liên từ, phải đi với mệnh đề (S + V); "Because" và "Unless" còn sai nghĩa.' },
        { n: 105, q: 'Tenants must give written ------- at least 60 days before moving out.', options: ['notify', 'notice', 'noticeable', 'notified'], a: 1, cue: 'give written -------',
          explain: 'Sau tính từ "written" cần danh từ làm tân ngữ của "give" → "notice" (thông báo); "give written notice" = gửi thông báo bằng văn bản. "notify" là động từ; "noticeable" là tính từ (dễ nhận thấy); "notified" là phân từ.' },
        { n: 106, q: 'The quarterly software update will be released ------- the first week of April.', options: ['while', 'between', 'during', 'since'], a: 2, cue: 'the first week of April',
          explain: '"during + khoảng thời gian" = trong (suốt) khoảng đó → "during the first week of April" (trong tuần đầu tháng 4). "while" là liên từ, cần mệnh đề; "between" cần hai mốc (between … and …); "since" đi với thì hoàn thành.' },
        { n: 107, q: 'The two-bedroom unit on the fifth floor is ------- than the one on the second floor.', options: ['more spacious', 'spacious', 'most spacious', 'spaciously'], a: 0, cue: 'than the one',
          explain: 'Có "than" → so sánh hơn; "spacious" là tính từ dài nên dùng "more spacious" (rộng rãi hơn). "spacious" là dạng nguyên; "most spacious" là so sánh nhất; "spaciously" là trạng từ.' },
        { n: 108, q: 'Dr. Rautio asked the nurses ------- the patients\' blood pressure every four hours.', options: ['check', 'checking', 'checked', 'to check'], a: 3, cue: 'asked the nurses -------',
          explain: 'Cấu trúc "ask somebody to do something" (yêu cầu ai làm gì) → "to check". "check", "checking", "checked" không đứng sau "ask + tân ngữ" theo cấu trúc này.' },
        { n: 109, q: 'Ms. Oduya was ------- for negotiating the lease renewal with the property owner.', options: ['dependent', 'responsible', 'capable', 'eligible'], a: 1, cue: '------- for negotiating',
          explain: '"be responsible for + V-ing" = chịu trách nhiệm làm gì → cô Oduya phụ trách đàm phán gia hạn hợp đồng thuê. "dependent" đi với "on"; "capable" đi với "of"; "eligible for" (đủ điều kiện hưởng) không hợp nghĩa với việc đàm phán.' },
        { n: 110, q: 'Since the clinic introduced online booking, the number of missed appointments ------- by 30 percent.', options: ['falls', 'will fall', 'has fallen', 'had fallen'], a: 2, cue: 'Since the clinic introduced online booking',
          explain: '"Since + mốc quá khứ (introduced)" → mệnh đề chính dùng hiện tại hoàn thành "has fallen" (đã giảm, tính đến nay). "falls" và "will fall" sai thì; "had fallen" là quá khứ hoàn thành, không đi với "since" chỉ mốc tính đến hiện tại.' },
        { n: 111, q: 'Your package can be delivered to your office ------- left at the building\'s front desk.', options: ['or', 'nor', 'so', 'yet'], a: 0, cue: 'can be delivered to your office',
          explain: 'Hai phương án giao hàng thay thế nhau (giao đến văn phòng HOẶC để ở quầy lễ tân) → "or". "nor" phải đi với "neither" hoặc câu phủ định; "so" chỉ kết quả; "yet" chỉ tương phản.' },
        { n: 112, q: 'The technician ------- repaired our network last week has been promoted to team leader.', options: ['which', 'whose', 'whom', 'who'], a: 3, cue: 'The technician ------- repaired',
          explain: 'Đại từ quan hệ thay cho danh từ chỉ người "The technician" và làm chủ ngữ cho "repaired" → "who". "which" dùng cho vật; "whose" chỉ sở hữu, phải đi kèm danh từ; "whom" làm tân ngữ, không làm chủ ngữ.' },
        { n: 113, q: '------- of the apartments in the new building has a private balcony.', options: ['All', 'Each', 'Every', 'Both'], a: 1, cue: 'has a private balcony',
          explain: '"Each of + danh từ số nhiều" đi với động từ số ít "has" → "Each" (mỗi căn hộ). "All of" và "Both of" đi với động từ số nhiều (have); "Every" không đứng trước "of".' },
        { n: 114, q: 'The real estate agent described the neighborhood as quiet and ------- located near public transportation.', options: ['convenient', 'convenience', 'conveniently', 'conveniences'], a: 2, cue: '------- located',
          explain: 'Cần trạng từ bổ nghĩa cho phân từ "located" → "conveniently located" (ở vị trí thuận tiện). "convenient" là tính từ; "convenience/conveniences" là danh từ.' },
        { n: 115, q: 'Please ------- the attached invoice and let us know if you notice any errors.', options: ['review', 'reply', 'respond', 'remark'], a: 0, cue: '------- the attached invoice',
          explain: '"review the invoice" = xem lại, kiểm tra hóa đơn – hợp với vế sau "let us know if you notice any errors". "reply" và "respond" là nội động từ, cần "to" trước tân ngữ; "remark" (nhận xét) không hợp nghĩa.' },
        { n: 116, q: 'The logistics team is considering ------- a second distribution center in the north.', options: ['open', 'opened', 'to open', 'opening'], a: 3, cue: 'is considering -------',
          explain: '"consider + V-ing" = cân nhắc việc làm gì → "opening" (mở thêm trung tâm phân phối thứ hai). "consider" không đi với "to V"; "open" và "opened" sai dạng.' },
        { n: 117, q: 'Customer data is stored ------- on servers protected by multiple layers of encryption.', options: ['secure', 'securely', 'security', 'secures'], a: 1, cue: 'is stored -------',
          explain: 'Cần trạng từ bổ nghĩa cho động từ bị động "is stored" → "securely" (một cách an toàn). "secure" là tính từ/động từ; "security" là danh từ; "secures" là động từ chia.' },
        { n: 118, q: 'The development team worked overtime to ------- the project deadline.', options: ['join', 'attend', 'meet', 'gain'], a: 2, cue: 'the project deadline',
          explain: 'Cụm kết hợp cố định "meet a deadline" = kịp thời hạn → nhóm làm thêm giờ để kịp hạn chót dự án. "join" (tham gia), "attend" (tham dự), "gain" (đạt được, tăng) không đi với "deadline".' },
        { n: 119, q: 'Residents ------- into the new building will receive their keys on Monday.', options: ['moving', 'moved', 'move', 'moves'], a: 0, cue: 'Residents ------- into the new building',
          explain: 'Câu đã có động từ chính "will receive" → chỗ trống là mệnh đề quan hệ rút gọn mang nghĩa chủ động (Residents who are moving into…) → "moving". "moved" mang nghĩa bị động; "move/moves" là động từ chia, khiến câu có hai động từ chính.' },
        { n: 120, q: 'If we ------- more storage space, we could accept larger orders from retailers.', options: ['have', 'will have', 'would have', 'had'], a: 3, cue: 'we could accept',
          explain: 'Mệnh đề chính dùng "could accept" → câu điều kiện loại 2 (giả định không có thật ở hiện tại), mệnh đề "If" dùng quá khứ đơn → "had". "have" thuộc loại 1; không dùng "will/would" trong mệnh đề "If".' },
        { n: 121, q: 'The new patient portal has been ------- received by both doctors and patients.', options: ['warm', 'warmly', 'warmth', 'warmer'], a: 1, cue: 'has been ------- received',
          explain: 'Cần trạng từ bổ nghĩa cho động từ "received" → "warmly received" (được đón nhận nồng nhiệt). "warm/warmer" là tính từ; "warmth" là danh từ.' },
        { n: 122, q: '------- the bids from three suppliers, the committee selected Brackenfield Couriers.', options: ['Having reviewed', 'Reviewed', 'To be reviewed', 'Being reviewed'], a: 0, cue: 'the committee selected',
          explain: 'Cụm phân từ đầu câu có cùng chủ ngữ "the committee"; ủy ban xem xét các hồ sơ thầu (chủ động, có tân ngữ "the bids") XONG rồi mới chọn → phân từ hoàn thành "Having reviewed". "Reviewed", "To be reviewed", "Being reviewed" mang nghĩa bị động, không đi với tân ngữ "the bids".' },
        { n: 123, q: 'Merriden Plaza is one of the ------- office buildings in the downtown area.', options: ['tall', 'taller', 'tallest', 'tallness'], a: 2, cue: 'one of the -------',
          explain: 'Cấu trúc "one of the + so sánh nhất + danh từ số nhiều" → "tallest" (một trong những tòa nhà cao nhất). "tall" là dạng nguyên; "taller" là so sánh hơn; "tallness" là danh từ.' },
        { n: 124, q: 'Shipping costs are calculated ------- on the weight and size of each package.', options: ['basis', 'basic', 'basically', 'based'], a: 3, cue: '------- on the weight',
          explain: '"(be) based on" = dựa trên → chi phí vận chuyển được tính dựa trên trọng lượng và kích thước. "basis" là danh từ (on the basis of); "basic" là tính từ; "basically" (về cơ bản) không đi với "on".' },
        { n: 125, q: 'The clinic\'s billing office is located ------- the pharmacy and the main entrance.', options: ['among', 'between', 'through', 'across'], a: 1, cue: 'the pharmacy and the main entrance',
          explain: '"between A and B" = ở giữa hai vị trí → phòng thanh toán nằm giữa nhà thuốc và lối vào chính. "among" dùng cho từ ba đối tượng trở lên và không đi với "and" như vậy; "through" (xuyên qua) và "across" (băng qua, đối diện) sai nghĩa.' },
        { n: 126, q: 'By the end of this year, Corvane Systems ------- more than 500 cloud migration projects.', options: ['completes', 'has completed', 'will have completed', 'completing'], a: 2, cue: 'By the end of this year',
          explain: '"By + mốc thời gian tương lai (the end of this year)" → hành động sẽ hoàn tất trước mốc đó dùng tương lai hoàn thành "will have completed". "completes" và "has completed" sai thì; "completing" không làm động từ chính.' },
        { n: 127, q: 'Not only ------- the new lease cheaper, but it also includes free parking.', options: ['is', 'does', 'has', 'was'], a: 0, cue: 'Not only',
          explain: '"Not only" đứng đầu câu → đảo ngữ; câu gốc là "the new lease is cheaper" (be + tính từ) ở hiện tại (khớp với "includes") → "is". "does/has" phải đi với động từ chính; "was" sai thì so với vế sau.' },
        { n: 128, q: 'Our software company offers a full ------- to customers who cancel their subscription within 30 days.', options: ['refundable', 'refund', 'refunded', 'refunding'], a: 1, cue: 'a full -------',
          explain: 'Sau mạo từ "a" và tính từ "full" cần danh từ → "refund" (khoản hoàn tiền); "a full refund" = hoàn tiền toàn bộ. "refundable" là tính từ; "refunded/refunding" là dạng phân từ của động từ.' },
        { n: 129, q: 'The property manager will ------- tenants about the planned power outage by e-mail.', options: ['explain', 'announce', 'say', 'inform'], a: 3, cue: '------- tenants about',
          explain: '"inform somebody about something" = thông báo cho ai về việc gì → "inform tenants about…". "explain", "announce", "say" không nhận trực tiếp tân ngữ chỉ người (phải là "explain/announce/say something to somebody").' },
        { n: 130, q: 'The warehouse has run out of packing boxes; -------, some orders will be shipped a day late.', options: ['in contrast', 'as a result', 'for example', 'in addition'], a: 1, cue: 'some orders will be shipped a day late',
          explain: 'Kho hết thùng đóng gói → hệ quả là một số đơn hàng giao trễ một ngày → cụm nối chỉ kết quả "as a result" (do đó). "in contrast" chỉ tương phản; "for example" đưa ví dụ; "in addition" bổ sung thông tin.' }
      ] } ] },

    /* ================= PART 6 ================= */
    { part: 6, title: 'Text Completion', instr: 'Read the texts that follow. A word, phrase, or sentence is missing in parts of each text. Four answer choices for each question are given below the text. Select the best answer to complete the text.',
      passages: [
        { title: 'E-mail', text:
`To: All Lumacrest Cloud customers
From: Lumacrest Support Team
Date: February 9
Subject: Scheduled maintenance

On Saturday, February 21, Lumacrest Cloud will perform scheduled maintenance on its data servers. The work will begin at 11:00 P.M. and is expected to last -----(131)----- four hours. During this time, customers will not be able to access their files or the online dashboard.

-----(132)-----. However, any changes made in the hour before the maintenance begins may not be saved. We strongly recommend that you -----(133)----- your work before 10:00 P.M.

We will send you a confirmation e-mail -----(134)----- the maintenance has been completed. We apologize for any inconvenience.`,
          groups: [ { type: 'mcq', instr: 'Questions 131-134 refer to the following e-mail.', items: [
            { n: 131, q: '(131)', options: ['approximate', 'approximately', 'approximation', 'approximated'], a: 1, cue: 'four hours. During this time',
              explain: 'Cần trạng từ bổ nghĩa cho số lượng "four hours" → "approximately" (khoảng chừng). "approximate" là tính từ/động từ; "approximation" là danh từ; "approximated" là phân từ.' },
            { n: 132, q: '(132)', options: ['Our new office opened last month.', 'Prices will increase next year.', 'All of your stored files will remain safe.', 'Please update your billing address.'], a: 2, cue: 'However, any changes made in the hour before the maintenance begins may not be saved.',
              explain: 'Câu sau mở đầu bằng "However" và nói về rủi ro (thay đổi trong một giờ trước bảo trì có thể không được lưu) → câu trước phải là thông tin trấn an trái ngược: "All of your stored files will remain safe" (mọi tệp đã lưu vẫn an toàn). Các câu về văn phòng mới, tăng giá hay địa chỉ thanh toán lạc đề.' },
            { n: 133, q: '(133)', options: ['save', 'saved', 'saving', 'will save'], a: 0, cue: 'We strongly recommend that you',
              explain: 'Sau "recommend that + chủ ngữ" dùng động từ nguyên mẫu (thể giả định) → "save" (lưu lại công việc). "saved", "saving", "will save" không đúng cấu trúc này.' },
            { n: 134, q: '(134)', options: ['during', 'until', 'despite', 'once'], a: 3, cue: 'the maintenance has been completed',
              explain: '"once" (ngay khi, một khi) + mệnh đề → sẽ gửi email xác nhận khi việc bảo trì hoàn tất. "during" và "despite" là giới từ, không đi với mệnh đề; "until" (cho đến khi) sai nghĩa – không thể gửi email liên tục đến lúc xong.' }
          ] } ] },
        { title: 'Notice', text:
`Notice to Patients

Beginning on April 1, Riverbend Family Clinic will introduce self-service check-in kiosks in our main lobby. Patients will simply scan their appointment card and -----(135)----- their contact details on the touch screen.

The kiosks are designed to reduce waiting times at the front desk. -----(136)-----, our reception staff will still be available to assist anyone who needs help.

Patients are asked to arrive at least ten minutes before their scheduled appointment. -----(137)-----.

Comments about the new system are welcome and can be -----(138)----- at the front desk or through our Web site.`,
          groups: [ { type: 'mcq', instr: 'Questions 135-138 refer to the following notice.', items: [
            { n: 135, q: '(135)', options: ['confirms', 'confirmed', 'confirm', 'confirming'], a: 2, cue: 'Patients will simply scan their appointment card and',
              explain: 'Cấu trúc song song sau "will": "will simply scan … and confirm …" – cả hai đều là động từ nguyên mẫu → "confirm" (xác nhận). "confirms", "confirmed", "confirming" không song song với "scan".' },
            { n: 136, q: '(136)', options: ['However', 'Therefore', 'For instance', 'Similarly'], a: 0, cue: 'our reception staff will still be available',
              explain: 'Máy tự phục vụ nhằm giảm việc ở quầy lễ tân, NHƯNG nhân viên vẫn sẵn sàng hỗ trợ (chú ý "still") → ý tương phản "However". "Therefore" (vì vậy), "For instance" (ví dụ), "Similarly" (tương tự) không hợp logic.' },
            { n: 137, q: '(137)', options: ['Our clinic was founded in 1998.', 'This allows time to complete the check-in process.', 'The pharmacy is closed on Sundays.', 'Several new doctors have joined our staff.'], a: 1, cue: 'Patients are asked to arrive at least ten minutes before their scheduled appointment.',
              explain: 'Câu trước yêu cầu đến sớm ít nhất 10 phút → câu tiếp giải thích lý do: "This allows time to complete the check-in process" (để có thời gian làm thủ tục). "This" thay cho việc đến sớm. Năm thành lập, giờ nhà thuốc hay bác sĩ mới đều lạc mạch.' },
            { n: 138, q: '(138)', options: ['submit', 'submission', 'submitting', 'submitted'], a: 3, cue: 'at the front desk or through our Web site',
              explain: 'Ý kiến "có thể được gửi" → bị động "can be + V3" → "submitted". "submit" là nguyên mẫu (chủ động); "submission" là danh từ; "submitting" là V-ing.' }
          ] } ] },
        { title: 'Article', text:
`HOLLISFORD (August 18) – Construction has begun on Quaymont Square, a mixed-use development that will include 240 apartments, ground-floor shops, and a public park. The project is -----(139)----- to be completed in the spring of 2028.

The developer, Ardley Partners, said that 20 percent of the apartments will be offered at below-market rents to -----(140)----- with moderate incomes.

-----(141)-----. Some residents have expressed concern about increased traffic on nearby streets. In response, Ardley Partners has agreed to pay for a new bus stop and to widen Corran Street -----(142)----- the construction period.`,
          groups: [ { type: 'mcq', instr: 'Questions 139-142 refer to the following article.', items: [
            { n: 139, q: '(139)', options: ['expected', 'expecting', 'expectation', 'expects'], a: 0, cue: 'to be completed in the spring of 2028',
              explain: 'Cấu trúc bị động "be expected to + V" = được dự kiến sẽ → "is expected to be completed". "expecting" mang nghĩa chủ động (dự án đang mong đợi) – vô lý; "expectation" là danh từ; "expects" là động từ chia, không đứng sau "is".' },
            { n: 140, q: '(140)', options: ['familiar', 'families', 'familiarize', 'familiarity'], a: 1, cue: 'with moderate incomes',
              explain: 'Sau giới từ "to" cần danh từ chỉ đối tượng thuê nhà, được bổ nghĩa bởi "with moderate incomes" → "families" (các gia đình có thu nhập trung bình). "familiar" là tính từ; "familiarize" là động từ; "familiarity" (sự quen thuộc) sai nghĩa.' },
            { n: 141, q: '(141)', options: ['Ardley Partners was founded in 1990.', 'The shops will sell locally made goods.', 'Rents in the city have remained stable.', 'Not everyone in the area supports the project, however.'], a: 3, cue: 'Some residents have expressed concern about increased traffic',
              explain: 'Câu sau nêu mối lo của một số cư dân về giao thông → câu cần điền phải chuyển ý sang mặt trái của dự án: "Not everyone in the area supports the project, however" (tuy nhiên, không phải ai trong khu vực cũng ủng hộ dự án). Ba câu còn lại không dẫn tới ý "concern".' },
            { n: 142, q: '(142)', options: ['while', 'unless', 'during', 'although'], a: 2, cue: 'the construction period',
              explain: 'Theo sau là cụm danh từ "the construction period" → giới từ "during" (trong thời gian thi công). "while", "unless", "although" là liên từ, phải đi với mệnh đề (S + V).' }
          ] } ] },
        { title: 'Letter', text:
`Dear Ms. Kalnins,

Thank you for your continued business with Pellbrook Logistics. I am writing to inform you that, -----(143)----- March 3, our trucks will collect shipments from your warehouse on Tuesdays and Fridays instead of Mondays and Thursdays.

This change will allow us to combine your shipments with those of other customers in your area, -----(144)----- reducing your transportation costs by about 8 percent.

-----(145)-----. If the new days are not convenient for you, please let me know, and I will do my best to find an -----(146)----- arrangement.

Sincerely,
Gideon Ashworth-Reyes
Account Manager, Pellbrook Logistics`,
          groups: [ { type: 'mcq', instr: 'Questions 143-146 refer to the following letter.', items: [
            { n: 143, q: '(143)', options: ['started', 'starts', 'start', 'starting'], a: 3, cue: 'March 3, our trucks will collect shipments',
              explain: '"starting + mốc thời gian" = bắt đầu từ (ngày) → "starting March 3" (kể từ ngày 3/3). "started", "starts", "start" là dạng động từ chia/nguyên mẫu, không đứng trước mốc thời gian theo cách này.' },
            { n: 144, q: '(144)', options: ['whereas', 'thereby', 'despite', 'unless'], a: 1, cue: 'reducing your transportation costs',
              explain: '"thereby + V-ing" = nhờ đó mà → gộp chuyến hàng, nhờ đó giảm khoảng 8% chi phí vận chuyển. "whereas" và "unless" là liên từ, cần mệnh đề; "despite reducing" (mặc dù giảm chi phí) sai logic.' },
            { n: 145, q: '(145)', options: ['Please make sure your shipments are ready by 9:00 A.M. on pickup days.', 'Our trucks are cleaned every week.', 'Pellbrook Logistics opened a new office last year.', 'Fuel prices rose sharply last year.'], a: 0, cue: 'If the new days are not convenient for you, please let me know',
              explain: 'Đoạn này nói về việc khách hàng thích ứng với lịch lấy hàng mới → câu hợp lý là lời dặn: "Please make sure your shipments are ready by 9:00 A.M. on pickup days" (vui lòng chuẩn bị hàng sẵn trước 9 giờ sáng vào ngày lấy hàng). Câu tiếp theo ("If the new days are not convenient…") tiếp nối tự nhiên. Các câu về rửa xe, văn phòng mới hay giá nhiên liệu lạc đề.' },
            { n: 146, q: '(146)', options: ['alternatively', 'alternation', 'alternative', 'alternatives'], a: 2, cue: 'arrangement',
              explain: 'Giữa mạo từ "an" và danh từ "arrangement" cần tính từ → "alternative" (thay thế, khác). "alternatively" là trạng từ; "alternation" (sự luân phiên) và "alternatives" là danh từ.' }
          ] } ] }
      ] },

    /* ================= PART 7 ================= */
    { part: 7, title: 'Reading Comprehension', instr: 'In this part you will read a selection of texts, such as magazine and newspaper articles, e-mails, and instant messages. Each text or set of texts is followed by several questions. Select the best answer for each question.',
      passages: [
        { title: 'Notice', text:
`Brindle & Moss Accounting
IT Department Notice

Beginning on Monday, May 4, the IT Help Desk will move from Room 112 to Room 318 on the third floor. The move is part of the renovation of the first floor.

On Friday, May 1, while equipment is being moved, walk-in support will not be available. Employees who experience technical problems on that day should submit a request through the online ticket system, and a technician will respond within two hours.

Normal walk-in hours, 8:00 A.M. to 5:00 P.M., will resume on Monday in the new location.`,
          groups: [ { type: 'mcq', instr: 'Questions 147-148 refer to the following notice.', items: [
            { n: 147, q: 'What is the main purpose of the notice?', options: ['To introduce new IT staff', 'To announce a change in location', 'To describe a new phone system', 'To explain a renovation budget'], a: 1, cue: 'the IT Help Desk will move from Room 112 to Room 318 on the third floor',
              explain: 'Thông báo chính: bộ phận hỗ trợ IT "will move from Room 112 to Room 318" (chuyển từ phòng 112 lên phòng 318) → thông báo đổi địa điểm. Việc cải tạo tầng một chỉ là lý do; không nhắc đến chi phí, nhân viên mới hay hệ thống điện thoại.' },
            { n: 148, q: 'How should employees report a technical problem on May 1?', options: ['By visiting Room 318', 'By calling a technician at home', 'By sending a text message', 'By submitting an online request'], a: 3, cue: 'should submit a request through the online ticket system',
              explain: 'Ngày 1/5 không có hỗ trợ trực tiếp; nhân viên "should submit a request through the online ticket system" (gửi yêu cầu qua hệ thống trực tuyến) → gửi yêu cầu trực tuyến. Phòng 318 chỉ mở từ thứ Hai 4/5, nên "By visiting Room 318" là bẫy.' }
          ] } ] },
        { title: 'Text-message chain', text:
`Dalia Kerimova [2:15 P.M.]: Hi, Ivo. I'm at the Fairhaven Market loading dock, but their receiving manager says they weren't expecting a delivery today.
Ivo Vasconcelos [2:17 P.M.]: That's strange. The order says Thursday, the 14th.
Dalia Kerimova [2:18 P.M.]: Today's the 13th.
Ivo Vasconcelos [2:20 P.M.]: You're right. My mistake. I entered the wrong date in the route planner.
Dalia Kerimova [2:21 P.M.]: Should I bring the load back to the depot?
Ivo Vasconcelos [2:23 P.M.]: Let me call the store first. They may agree to take it a day early.
Dalia Kerimova [2:24 P.M.]: OK. I'll wait here for ten minutes.`,
          groups: [ { type: 'mcq', instr: 'Questions 149-150 refer to the following text-message chain.', items: [
            { n: 149, q: 'What problem does Ms. Kerimova report?', options: ['A delivery has arrived a day early.', 'A truck has broken down.', 'A loading dock is closed.', 'Some goods are damaged.'], a: 0, cue: "they weren't expecting a delivery today",
              explain: 'Cửa hàng "weren\'t expecting a delivery today" (không chờ giao hàng hôm nay) vì đơn hàng ghi thứ Năm ngày 14, trong khi hôm nay mới ngày 13 → hàng đến sớm một ngày. Xe không hỏng, khu bốc dỡ vẫn mở, hàng không bị hư hại.' },
            { n: 150, q: 'At 2:18 P.M., what does Ms. Kerimova most likely mean when she writes, "Today\'s the 13th"?', options: ['She needs more time to finish her route.', 'She wants to change the delivery date.', 'She is explaining why the store was not expecting her.', 'She is asking for a day off tomorrow.'], a: 2, cue: "The order says Thursday, the 14th.",
              explain: 'Ivo nói đơn hàng ghi ngày 14; Dalia đáp "Today\'s the 13th" (hôm nay mới ngày 13) → cô chỉ ra lý do cửa hàng chưa chờ hàng: cô đến sớm một ngày. Ivo hiểu ngay và nhận lỗi nhập sai ngày. Cô không xin nghỉ hay muốn đổi ngày giao.' }
          ] } ] },
        { title: 'Web page', text:
`Sorrelwood Dental Care – Evening and Weekend Appointments

To better serve working patients, Sorrelwood Dental Care now offers appointments on Tuesday and Thursday evenings until 8:00 P.M. and on Saturday mornings from 9:00 A.M. to 1:00 P.M.

Evening and weekend appointments are available for routine checkups and cleanings only. Treatments such as fillings and root canals will continue to be scheduled on weekdays between 8:00 A.M. and 5:00 P.M.

Appointments can be booked online or by phone. Because these new time slots are very popular, we ask patients to cancel at least 48 hours in advance so that others can use them. Patients who fail to do so twice may be asked to book only weekday appointments in the future.`,
          groups: [ { type: 'mcq', instr: 'Questions 151-153 refer to the following Web page.', items: [
            { n: 151, q: 'What is the purpose of the Web page?', options: ['To introduce a new dentist', 'To announce extended opening hours', 'To advertise a teeth-whitening service', 'To explain a change in fees'], a: 1, cue: 'now offers appointments on Tuesday and Thursday evenings until 8:00 P.M. and on Saturday mornings',
              explain: 'Phòng nha "now offers appointments on Tuesday and Thursday evenings … and on Saturday mornings" (nay nhận hẹn vào tối thứ Ba, thứ Năm và sáng thứ Bảy) → thông báo kéo dài giờ làm việc. Không có nha sĩ mới, dịch vụ tẩy trắng hay thay đổi giá.' },
            { n: 152, q: 'What can patients receive on a Saturday morning?', options: ['A filling', 'A root canal', 'A consultation with a specialist', 'A routine cleaning'], a: 3, cue: 'Evening and weekend appointments are available for routine checkups and cleanings only.',
              explain: 'Lịch hẹn buổi tối và cuối tuần "are available for routine checkups and cleanings only" (chỉ dành cho khám định kỳ và làm sạch răng) → cạo vôi, làm sạch răng định kỳ. Trám răng và chữa tủy chỉ làm vào các ngày trong tuần – bẫy.' },
            { n: 153, q: 'What is indicated about patients who fail to cancel in time twice?', options: ['They may be limited to weekday appointments.', 'They must pay a cancellation fee.', 'They will be removed from the patient list.', 'They must book appointments by phone.'], a: 0, cue: 'Patients who fail to do so twice may be asked to book only weekday appointments in the future.',
              explain: 'Bệnh nhân hai lần không hủy trước 48 giờ "may be asked to book only weekday appointments" (có thể chỉ được đặt lịch vào ngày thường) → bị giới hạn lịch hẹn. Không có phí hủy hay bị xóa khỏi danh sách; đặt lịch vẫn được cả trực tuyến lẫn qua điện thoại.' }
          ] } ] },
        { title: 'Letter', text:
`Dear Ms. Vandersloot,

Your lease for Apartment 7C at Wisteria Court expires on June 30. We would be pleased to have you stay, and we are offering you a new 12-month lease at a monthly rent of $1,640, an increase of 3 percent. —[1]—

As a resident of more than five years, you are also eligible for our loyalty program. If you sign the renewal by April 30, we will have the carpets in your apartment professionally cleaned at no charge. —[2]—

Please note that we will be replacing the windows on the north side of the building this summer. —[3]— Our maintenance team will contact affected residents at least one week before work begins in their apartments.

To renew, simply sign the enclosed agreement and return it to the leasing office. —[4]— If you plan to move out, we require 60 days' written notice.

Sincerely,
Odette Rennick
Leasing Manager, Wisteria Court`,
          groups: [ { type: 'mcq', instr: 'Questions 154-157 refer to the following letter.', items: [
            { n: 154, q: 'Why did Ms. Rennick send the letter?', options: ['To request overdue rent', 'To welcome a new tenant', 'To offer a lease renewal', 'To announce the sale of a building'], a: 2, cue: 'we are offering you a new 12-month lease',
              explain: 'Hợp đồng thuê sắp hết hạn và bên quản lý "are offering you a new 12-month lease" (đề nghị hợp đồng mới 12 tháng) → đề nghị gia hạn hợp đồng thuê. Bà Vandersloot đã ở hơn 5 năm nên không phải người thuê mới; không có tiền thuê quá hạn hay việc bán tòa nhà.' },
            { n: 155, q: 'What is offered to Ms. Vandersloot if she signs by April 30?', options: ['A reduced rent', 'A parking space', 'New windows', 'Free carpet cleaning'], a: 3, cue: 'we will have the carpets in your apartment professionally cleaned at no charge',
              explain: '"If you sign the renewal by April 30, we will have the carpets … professionally cleaned at no charge" → giặt thảm miễn phí. Tiền thuê tăng 3% chứ không giảm; việc thay cửa sổ là kế hoạch bảo trì của tòa nhà, không phải ưu đãi.' },
            { n: 156, q: 'What is indicated about Wisteria Court?', options: ['It has a new owner.', 'Some of its windows will be replaced.', 'It has a fitness center.', 'Its rents will decrease.'], a: 1, cue: 'we will be replacing the windows on the north side of the building this summer',
              explain: '"we will be replacing the windows on the north side of the building this summer" → một số cửa sổ (phía bắc) sẽ được thay. Tiền thuê tăng chứ không giảm; chủ sở hữu mới hay phòng thể dục không được nhắc đến.' },
            { n: 157, q: 'In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? "You may also drop it in the secure box beside the office door after hours."', options: ['[1]', '[2]', '[3]', '[4]'], a: 3, cue: 'simply sign the enclosed agreement and return it to the leasing office',
              explain: '"drop it" (bỏ nó vào hộp) – "it" phải chỉ bản hợp đồng cần gửi lại, và "also" cho thấy đây là cách nộp thêm bên cạnh cách vừa nêu → đặt ngay sau "sign the enclosed agreement and return it to the leasing office", tức vị trí [4]. Ở các vị trí khác chưa có thứ gì cần nộp.' }
          ] } ] },
        { title: 'Article', text:
`BRAXTON (October 2) – Velloran Software, a provider of scheduling software for hospitals and clinics, announced yesterday that it will open a customer support center in Halbury next spring, creating about 150 jobs.

"Our customer base has tripled in the last two years, and our clients expect help at any time of day or night," said chief executive Brigitta Grunewald. "The Halbury center will allow us to offer support 24 hours a day."

The company chose Halbury because of its strong technical college, which trains hundreds of IT students every year. Velloran also plans to offer paid internships to students at the college beginning in the fall.

Hiring for the new center will begin in January.`,
          groups: [ { type: 'mcq', instr: 'Questions 158-160 refer to the following article.', items: [
            { n: 158, q: 'What is the article mainly about?', options: ['The opening of a new support center', 'A review of scheduling software', 'A merger of two companies', 'The expansion of a hospital'], a: 0, cue: 'it will open a customer support center in Halbury next spring',
              explain: 'Câu chủ đề: Velloran Software "will open a customer support center in Halbury next spring" (sẽ mở trung tâm hỗ trợ khách hàng ở Halbury vào mùa xuân tới) → mở trung tâm hỗ trợ mới. Bệnh viện và phòng khám là khách hàng của công ty, không phải đối tượng mở rộng.' },
            { n: 159, q: 'According to Ms. Grunewald, why is the new center needed?', options: ['The company\'s software is outdated.', 'Clients want help at any time of day.', 'The company\'s office rent has increased.', 'Current staff need more training.'], a: 1, cue: 'our clients expect help at any time of day or night',
              explain: 'Bà Grunewald nói "our clients expect help at any time of day or night" và trung tâm mới giúp hỗ trợ 24 giờ mỗi ngày → khách hàng muốn được hỗ trợ bất cứ lúc nào. Các lý do khác không được nhắc đến.' },
            { n: 160, q: 'What is indicated about Halbury?', options: ['It is where Velloran\'s headquarters is located.', 'It has the lowest office rents in the region.', 'It has a college that trains IT students.', 'It already has 150 IT workers.'], a: 2, cue: 'its strong technical college, which trains hundreds of IT students every year',
              explain: 'Công ty chọn Halbury vì "its strong technical college, which trains hundreds of IT students every year" → Halbury có trường cao đẳng kỹ thuật đào tạo sinh viên IT. Con số 150 là số việc làm sẽ được tạo ra – bẫy số liệu; trụ sở chính và giá thuê không được nhắc đến (bài báo đề ngày tại Braxton).' }
          ] } ] },
        { title: 'Online chat discussion', text:
`Adaeze Nwosu [9:01 A.M.]: We now have 260 patients registered for Saturday's flu vaccination day. We planned for 200.
Teodor Lisowski [9:03 A.M.]: Do we have enough vaccine?
Liesel Solvang [9:05 A.M.]: We have 220 doses. I can ask the distributor for another 50, but they need the order by noon today.
Adaeze Nwosu [9:06 A.M.]: Go ahead.
Teodor Lisowski [9:08 A.M.]: Staffing worries me more. With only three nurses, some patients will wait more than an hour.
Liesel Solvang [9:10 A.M.]: Saoirse in pediatrics mentioned that she'd like some extra hours this month.
Adaeze Nwosu [9:11 A.M.]: Great. I'll ask her this morning. Teodor, could you set up a second waiting area in the conference room?
Teodor Lisowski [9:12 A.M.]: Consider it done.`,
          groups: [ { type: 'mcq', instr: 'Questions 161-164 refer to the following online chat discussion.', items: [
            { n: 161, q: 'What are the writers mainly discussing?', options: ['Hiring a new doctor', 'Preparing for a busy vaccination day', 'Choosing a new distributor', 'Renovating a conference room'], a: 1, cue: "We now have 260 patients registered for Saturday's flu vaccination day. We planned for 200.",
              explain: 'Số người đăng ký tiêm cúm thứ Bảy (260) vượt kế hoạch (200), cả nhóm bàn về vắc-xin, nhân sự và chỗ chờ → chuẩn bị cho ngày tiêm chủng đông người. Họ vẫn dùng nhà phân phối hiện tại; phòng họp chỉ được dùng tạm làm chỗ chờ, không cải tạo.' },
            { n: 162, q: 'What does Ms. Solvang say about the distributor?', options: ['It has run out of vaccine.', 'It delivers only on weekdays.', 'It needs orders by noon.', 'It has raised its prices.'], a: 2, cue: 'they need the order by noon today',
              explain: '"I can ask the distributor for another 50, but they need the order by noon today" → nhà phân phối cần nhận đơn trước 12 giờ trưa. Nhà phân phối vẫn có thể cung cấp thêm 50 liều, không hết hàng; ngày giao và giá cả không được nhắc đến.' },
            { n: 163, q: 'At 9:06 A.M., what does Ms. Nwosu mean when she writes, "Go ahead"?', options: ['She approves ordering more vaccine.', 'She wants Ms. Solvang to call a nurse.', 'She agrees to cancel the event.', 'She will contact the distributor herself.'], a: 0, cue: 'I can ask the distributor for another 50, but they need the order by noon today.',
              explain: 'Liesel đề nghị đặt thêm 50 liều từ nhà phân phối; "Go ahead" (cứ làm đi) → Adaeze đồng ý cho đặt thêm vắc-xin. Việc liên hệ y tá do chính Adaeze nhận làm sau đó (9:11); sự kiện không bị hủy.' },
            { n: 164, q: 'What will Mr. Lisowski most likely do?', options: ['Order more doses', 'Contact a pediatric nurse', 'Register more patients', 'Set up an extra waiting area'], a: 3, cue: 'Teodor, could you set up a second waiting area in the conference room?',
              explain: 'Adaeze nhờ Teodor "set up a second waiting area in the conference room" và anh đáp "Consider it done" (coi như xong) → anh sẽ bố trí thêm khu chờ. Đặt thêm vắc-xin là việc của Liesel; hỏi y tá khoa nhi là việc của Adaeze.' }
          ] } ] },
        { title: 'Advertisement', text:
`Crestline Linen Services
Clean linens, delivered on your schedule

Restaurants, hotels, and spas across the Marlow Valley rely on Crestline Linen Services for spotless tablecloths, napkins, towels, and kitchen uniforms. Our trucks collect your used items and return them freshly washed and pressed within 48 hours.

Why choose Crestline?
- Flexible pickups up to six days a week
- Eco-friendly detergents certified by the Green Hospitality Council
- Free replacement of items that become torn or stained beyond repair
- No long-term contracts: cancel anytime with 30 days' notice

New customers who sign up before March 31 will receive their first two weeks of service free of charge. To arrange a free on-site consultation, call 555-0148 or visit www.crestlinelinen.com.`,
          groups: [ { type: 'mcq', instr: 'Questions 165-166 refer to the following advertisement.', items: [
            { n: 165, q: 'For whom is the advertisement most likely intended?', options: ['Owners of hospitality businesses', 'People who are moving to a new home', 'Clothing store managers', 'Manufacturers of washing machines'], a: 0, cue: 'Restaurants, hotels, and spas across the Marlow Valley rely on Crestline Linen Services',
              explain: 'Quảng cáo nói "Restaurants, hotels, and spas … rely on Crestline Linen Services" (nhà hàng, khách sạn, spa tin dùng dịch vụ) và nhắc đến khăn trải bàn, đồng phục nhà bếp → đối tượng là chủ doanh nghiệp ngành dịch vụ – khách sạn. Không hướng đến hộ gia đình, cửa hàng quần áo hay nhà sản xuất máy giặt.' },
            { n: 166, q: "What is NOT mentioned as a benefit of Crestline's service?", options: ['Environmentally friendly cleaning products', 'Free replacement of damaged items', 'Same-day return of laundered items', 'The option to cancel without a long contract'], a: 2, cue: 'return them freshly washed and pressed within 48 hours',
              explain: 'Đồ được trả lại "within 48 hours" (trong vòng 48 giờ), không phải trong ngày → trả đồ trong ngày KHÔNG được nhắc đến. Chất tẩy thân thiện môi trường ("Eco-friendly detergents"), thay miễn phí đồ hỏng ("Free replacement") và hủy bất cứ lúc nào ("No long-term contracts") đều có trong quảng cáo.' }
          ] } ] },
        { title: 'Memo', text:
`MEMO
To: All editorial staff
From: Graciela Mendonça, Office Manager
Date: Thursday, September 10
Subject: Printing changes

Over the past year, Halvard Press has spent nearly twice its budget on paper and toner. To address this, the following changes will take effect on Monday, September 21.

First, all printers will be set to print on both sides of the page by default. Staff who need single-sided copies may still change this setting manually.

Second, color printing will be available only on the printer in the design department on the fourth floor. Editors who need color proofs of book covers should send their files to Kwame Asante, who will print them and deliver them by the end of the day.

Finally, each employee will be given a personal code to enter at the printer. This will allow us to monitor usage by department. We are not trying to limit anyone's work; we simply want a clearer picture of where our resources go.

Thank you for your cooperation.`,
          groups: [ { type: 'mcq', instr: 'Questions 167-168 refer to the following memo.', items: [
            { n: 167, q: 'What is the purpose of the memo?', options: ['To announce the purchase of new printers', 'To introduce new rules for printing', 'To request suggestions for reducing costs', "To explain a delay in a book's publication"], a: 1, cue: 'the following changes will take effect on Monday, September 21',
              explain: 'Bản ghi nhớ thông báo "the following changes will take effect on Monday, September 21" rồi liệt kê in hai mặt, giới hạn in màu, mã cá nhân → giới thiệu quy định in ấn mới. Công ty không mua máy in mới, không xin góp ý, cũng không nói về việc chậm xuất bản sách.' },
            { n: 168, q: 'In the memo, the word "picture" in paragraph 4 is closest in meaning to', options: ['photograph', 'drawing', 'frame', 'understanding'], a: 3, cue: 'we simply want a clearer picture of where our resources go',
              explain: '"a clearer picture of where our resources go" nghĩa là có cái nhìn rõ hơn về việc tài nguyên được dùng vào đâu → "picture" ở đây là "sự hiểu biết, hình dung" (understanding). Các nghĩa ảnh chụp, bức vẽ, khung tranh là nghĩa đen, không hợp ngữ cảnh.' }
          ] } ] },
        { title: 'Online chat discussion', text:
`Lorenzo Bianchi [10:02 A.M.]: Hi, all. The shipping company just told me our display furniture for the Hamburg Interior Design Fair won't arrive until Thursday morning.
Solveig Halvorsen [10:04 A.M.]: The fair opens Thursday at 9:00. That's cutting it close.
Lorenzo Bianchi [10:05 A.M.]: I know. The delivery window is 7:00 to 8:00 A.M., so we'd have about an hour to set everything up.
Solveig Halvorsen [10:07 A.M.]: Can we rent a few pieces locally just in case?
Mei Hirose [10:09 A.M.]: I checked with the fair organizers last week. They have a rental service, but the deadline to order was yesterday.
Lorenzo Bianchi [10:11 A.M.]: Then let's make the most of Wednesday. Mei, could you set up the lighting and the product posters that afternoon?
Mei Hirose [10:12 A.M.]: Sure. I'll be in Hamburg by noon.
Solveig Halvorsen [10:14 A.M.]: And I'll ask two people from our Hamburg sales office to come in early on Thursday to help unpack.
Lorenzo Bianchi [10:15 A.M.]: Perfect. That should do it.`,
          groups: [ { type: 'mcq', instr: 'Questions 169-171 refer to the following online chat discussion.', items: [
            { n: 169, q: 'What are the writers mainly discussing?', options: ['Choosing a booth location at a fair', 'Hiring staff for a sales office', 'A delay in the delivery of display furniture', 'Canceling their participation in a fair'], a: 2, cue: "our display furniture for the Hamburg Interior Design Fair won't arrive until Thursday morning",
              explain: 'Lorenzo báo đồ nội thất trưng bày "won\'t arrive until Thursday morning" (phải đến sáng thứ Năm mới tới), cả nhóm bàn cách xoay xở → chủ đề là việc giao đồ trưng bày bị chậm. Họ không chọn vị trí gian hàng, không tuyển người và không hủy tham gia hội chợ.' },
            { n: 170, q: 'At 10:04 A.M., what does Ms. Halvorsen most likely mean when she writes, "That\'s cutting it close"?', options: ['She thinks there may not be enough time to prepare.', 'She wants to move the booth closer to the entrance.', 'She believes the fair will be canceled.', 'She wants to use a different shipping company.'], a: 0, cue: "The fair opens Thursday at 9:00. That's cutting it close.",
              explain: 'Hội chợ mở cửa 9 giờ sáng thứ Năm, cũng là ngày hàng mới đến; "That\'s cutting it close" (sát giờ quá) → cô lo sẽ không đủ thời gian chuẩn bị. Câu này không liên quan đến vị trí gian hàng ("close" không mang nghĩa "gần lối vào"), hủy hội chợ hay đổi hãng vận chuyển.' },
            { n: 171, q: 'What will Ms. Hirose most likely do on Wednesday?', options: ['Order rental furniture', 'Unpack the display furniture', 'Meet with the fair organizers', 'Set up lighting and posters'], a: 3, cue: 'Mei, could you set up the lighting and the product posters that afternoon?',
              explain: 'Lorenzo nhờ Mei "set up the lighting and the product posters" vào chiều thứ Tư và cô đồng ý ("Sure") → cô sẽ lắp đèn và treo áp phích. Hạn thuê đồ đã qua; việc mở thùng đồ là của nhân viên văn phòng Hamburg vào sáng thứ Năm.' }
          ] } ] },
        { title: 'Article', text:
`Electric Ferries Coming to Kessick Island Route
By Farida Benali

PORT ALDER (June 8) – Cobalt Strait Ferries announced on Tuesday that it will replace two of the diesel-powered vessels on its Port Alder–Kessick Island route with battery-electric ferries by next summer. —[1]—

The new ferries, which are being built by Norvik Marine in Bergen, will each carry up to 300 passengers and 40 vehicles. They will be recharged at the Port Alder terminal during the ten-minute stops between crossings. —[2]—

According to the company's operations director, Henrik Engström, the switch will cut fuel costs by around 60 percent. "Electricity is far cheaper than diesel, and electric motors require much less maintenance," he said. —[3]— The company also expects passengers to appreciate the quieter and smoother ride.

Not everyone is pleased, however. Some Kessick Island residents have raised concerns that ticket prices may rise to cover the cost of the new vessels and charging equipment. Mr. Engström said that fares will remain unchanged for at least two years. —[4]—

The crossing currently takes 35 minutes, and the company operates 22 round trips each day.`,
          groups: [ { type: 'mcq', instr: 'Questions 172-175 refer to the following article.', items: [
            { n: 172, q: 'What is the article mainly about?', options: ['A new ferry terminal on Kessick Island', "A ferry company's plan to introduce electric vessels", 'A drop in the number of ferry passengers', "A shipbuilder's expansion in Bergen"], a: 1, cue: 'it will replace two of the diesel-powered vessels on its Port Alder–Kessick Island route with battery-electric ferries by next summer',
              explain: 'Câu mở đầu: Cobalt Strait Ferries "will replace two of the diesel-powered vessels … with battery-electric ferries" (sẽ thay hai tàu chạy dầu bằng phà điện) → kế hoạch đưa tàu điện vào sử dụng. Norvik Marine ở Bergen chỉ là nơi đóng tàu; bài không nói về bến mới hay lượng khách giảm.' },
            { n: 173, q: 'What is indicated about the new ferries?', options: ['They will be faster than the current ferries.', 'They will carry more vehicles than the current ferries.', 'They are being built in Port Alder.', 'They will be recharged between crossings.'], a: 3, cue: 'They will be recharged at the Port Alder terminal during the ten-minute stops between crossings.',
              explain: 'Bài viết nêu phà mới "will be recharged … during the ten-minute stops between crossings" (được sạc trong 10 phút nghỉ giữa các chuyến) → sạc điện giữa các chuyến. Tàu được đóng ở Bergen, không phải Port Alder; bài không so sánh tốc độ hay sức chở với phà hiện tại.' },
            { n: 174, q: 'What concern have some Kessick Island residents raised?', options: ['Ticket prices could increase.', 'The ferries could be too noisy.', 'Fewer trips may be offered.', 'The crossing may take longer.'], a: 0, cue: 'ticket prices may rise to cover the cost of the new vessels and charging equipment',
              explain: 'Một số cư dân lo rằng "ticket prices may rise" (giá vé có thể tăng) để bù chi phí tàu và thiết bị sạc → lo ngại về giá vé. Phà điện được cho là êm hơn ("quieter"), nên lo ngại tiếng ồn là sai; số chuyến và thời gian đi không bị phàn nàn.' },
            { n: 175, q: 'In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? "Such quick charging means the ferries will not need to be taken out of service during the day."', options: ['[1]', '[2]', '[3]', '[4]'], a: 1, cue: 'They will be recharged at the Port Alder terminal during the ten-minute stops between crossings.',
              explain: '"Such quick charging" (việc sạc nhanh như vậy) phải đứng ngay sau câu nói về việc sạc trong "the ten-minute stops between crossings" → vị trí [2]. Các vị trí khác nói về kế hoạch thay tàu, chi phí nhiên liệu và giá vé, không có ý "sạc nhanh" để từ "Such" quy chiếu.' }
          ] } ] },
        { title: 'Rate table and E-mail', text:
`Tollgate Couriers
Domestic Shipping Rates (effective January 1)

Service | Delivery time | Price (packages up to 5 kg)
Economy | 4–6 business days | $9.50
Standard | 2–3 business days | $14.00
Priority | Next business day | $26.00
Priority Plus | Next business day by 10:00 A.M. | $34.00

Packages over 5 kg are charged an additional $2.00 per kilogram. Business account holders receive a 10 percent discount on all services. Pickups from your location can be scheduled online for a fee of $5.00; drop-off at any Tollgate counter is free.

* * *

To: support@tollgatecouriers.com
From: Elowen Tregenza
Date: March 9
Subject: Shipment TC-48213

Hello,

On Monday, March 2, I sent a 4-kilogram package of printed brochures from my shop to a client in Ashfield. I chose next-day delivery by 10:00 A.M. because my client needed the brochures for a trade show that opened at noon on March 3.

According to your tracking page, the package was not delivered until 3:40 P.M. on March 3, after the show had started. My client had to begin the event without the brochures.

I dropped the package off at your Bayliss Road counter myself, so no pickup fee was charged. I would like a full refund of the shipping charge. As I have had a business account with Tollgate for four years, I would also like to know whether you can offer a credit toward future shipments.

Elowen Tregenza
Tregenza Print Works`,
          groups: [ { type: 'mcq', instr: 'Questions 176-180 refer to the following rate table and e-mail.', items: [
            { n: 176, q: 'Which service did Ms. Tregenza most likely use?', options: ['Priority', 'Priority Plus', 'Standard', 'Economy'], a: 1, cue: 'I chose next-day delivery by 10:00 A.M.',
              explain: 'Kết hợp hai văn bản: cô chọn "next-day delivery by 10:00 A.M." (giao ngày hôm sau trước 10 giờ sáng), khớp với dịch vụ "Priority Plus" trong bảng giá. "Priority" cũng giao ngày hôm sau nhưng không cam kết trước 10 giờ – bẫy.' },
            { n: 177, q: 'What problem does Ms. Tregenza describe?', options: ['A package arrived later than promised.', 'A package was sent to the wrong city.', 'Some brochures were damaged.', 'A driver did not pick up a package.'], a: 0, cue: 'the package was not delivered until 3:40 P.M. on March 3',
              explain: 'Gói hàng lẽ ra đến trước 10 giờ sáng nhưng "was not delivered until 3:40 P.M." (mãi 3 giờ 40 chiều mới giao) → giao trễ hơn cam kết. Cô tự mang hàng đến quầy nên không có chuyện tài xế không đến lấy; hàng không bị gửi nhầm hay hư hỏng.' },
            { n: 178, q: 'What does Ms. Tregenza request?', options: ['A replacement shipment', 'A free pickup', 'A full refund of the shipping charge', 'A meeting with a manager'], a: 2, cue: 'I would like a full refund of the shipping charge.',
              explain: '"I would like a full refund of the shipping charge" → yêu cầu hoàn lại toàn bộ cước phí (ngoài ra cô hỏi thêm về khoản tín dụng cho lần gửi sau). Cô không yêu cầu gửi lại hàng, lấy hàng miễn phí hay gặp quản lý.' },
            { n: 179, q: 'In the e-mail, the word "opened" in paragraph 1 is closest in meaning to', options: ['unlocked', 'revealed', 'unfolded', 'began'], a: 3, cue: 'a trade show that opened at noon on March 3',
              explain: '"a trade show that opened at noon" = hội chợ thương mại khai mạc lúc 12 giờ trưa → "opened" ≈ "began" (bắt đầu). "unlocked" (mở khóa), "revealed" (tiết lộ), "unfolded" (mở ra, trải ra) là các nghĩa khác của "open", không hợp ngữ cảnh sự kiện.' },
            { n: 180, q: 'How much was Ms. Tregenza most likely charged for the shipment?', options: ['$26.00', '$30.60', '$34.00', '$39.00'], a: 1, cue: 'Business account holders receive a 10 percent discount on all services.',
              explain: 'Kết hợp hai văn bản: gói hàng nặng 4 kg (dưới 5 kg, không tính phụ phí) gửi bằng Priority Plus giá $34.00; cô có tài khoản doanh nghiệp nên được giảm 10% → $34.00 − $3.40 = $30.60. Cô tự mang đến quầy nên không mất phí lấy hàng $5. "$34.00" là giá chưa giảm; "$39.00" là giá cộng thêm phí lấy hàng – đều là bẫy.' }
          ] } ] },
        { title: 'Web page and Online review', text:
`www.verbalistranslations.com/services

Verbalis Translation Services – Service Levels

Service | Price | What is included | Delivery
Standard | $0.10 per word | Translation by one professional translator | Within 5 business days
Professional | $0.14 per word | Translation plus a full review by a second translator | Within 4 business days
Premium | $0.20 per word | Translation, review, and formatting to match your original layout | Within 3 business days

Rush delivery (within 24 hours) is available for documents of up to 3,000 words for an additional fee of 30 percent.

All clients receive a free quote within one hour of uploading a document. First-time clients may enter the code WELCOME10 to receive 10 percent off their first order. We currently translate between English and 28 other languages, and we can assign translators who specialize in legal, medical, and technical texts.

* * *

Customer Review – Verbalis Translation Services
Posted by: Sun-hee Park, Marketing Coordinator, Tavira Outdoor Gear
Rating: 4 out of 5 stars

Our company needed a 2,500-word product catalog translated from English into Portuguese for a trade fair in Lisbon. Because this was our first time using Verbalis, I applied the discount code, and I chose the service that includes a second translator's review, since accuracy was essential.

The translation itself was excellent. Our colleagues in Lisbon said it read naturally, and the translator handled the technical vocabulary for our tents and climbing equipment very well. The quote arrived within twenty minutes, which was impressive.

My only disappointment was that the formatting did not match our original design, so our designer had to spend an extra day adjusting the layout. In fairness, I later realized that formatting is only included in a more expensive package. Next time, I will read the service descriptions more carefully. I would still recommend Verbalis to other businesses.`,
          groups: [ { type: 'mcq', instr: 'Questions 181-185 refer to the following Web page and online review.', items: [
            { n: 181, q: 'What is indicated about Verbalis Translation Services?', options: ['It translates between English and more than 50 languages.', 'It charges extra for technical documents.', 'It offers rush service for documents of any length.', 'It provides price quotes at no cost.'], a: 3, cue: 'All clients receive a free quote within one hour of uploading a document.',
              explain: 'Trang web viết "All clients receive a free quote" (mọi khách hàng được báo giá miễn phí) → báo giá không mất phí. Công ty dịch 28 ngôn ngữ, không phải hơn 50; dịch gấp chỉ áp dụng cho tài liệu tối đa 3.000 từ; không có phụ phí cho tài liệu kỹ thuật.' },
            { n: 182, q: 'How much did Ms. Park most likely pay for the translation?', options: ['$225', '$250', '$315', '$350'], a: 2, cue: "I applied the discount code, and I chose the service that includes a second translator's review",
              explain: 'Kết hợp hai văn bản: bài đánh giá cho biết cô dịch 2.500 từ, chọn gói có người thứ hai rà soát (gói Professional, $0.14/từ theo trang web) và dùng mã giảm 10% cho khách lần đầu → 2.500 × $0.14 = $350, giảm 10% còn $315. $350 là giá chưa giảm; $225 và $250 tính theo gói Standard.' },
            { n: 183, q: "Which service level would have included the work that Ms. Park's designer had to do?", options: ['Rush delivery', 'Premium', 'Standard', 'Professional'], a: 1, cue: 'Translation, review, and formatting to match your original layout',
              explain: 'Kết hợp hai văn bản: nhà thiết kế của cô phải mất thêm một ngày chỉnh bố cục vì định dạng không khớp bản gốc; theo trang web, chỉ gói Premium có "formatting to match your original layout" (định dạng giống bố cục gốc). Gói Professional cô đã dùng không gồm định dạng; dịch gấp chỉ rút ngắn thời gian.' },
            { n: 184, q: 'In the online review, the word "handled" in paragraph 2, line 2, is closest in meaning to', options: ['dealt with', 'touched', 'carried', 'sold'], a: 0, cue: 'the translator handled the technical vocabulary for our tents and climbing equipment very well',
              explain: '"the translator handled the technical vocabulary … very well" nghĩa là người dịch xử lý thuật ngữ kỹ thuật rất tốt → "handled" = "dealt with" (xử lý). Các nghĩa "chạm vào", "mang vác", "bán" là nghĩa khác của "handle", không hợp với việc dịch từ vựng.' },
            { n: 185, q: 'What is suggested about Ms. Park?', options: ['She plans to use a different translation agency.', 'She translated part of the catalog herself.', 'She misunderstood what her service level included.', 'She needed the translation within 24 hours.'], a: 2, cue: 'In fairness, I later realized that formatting is only included in a more expensive package.',
              explain: 'Cô thừa nhận "I later realized that formatting is only included in a more expensive package" (sau đó mới nhận ra định dạng chỉ có ở gói đắt hơn) → cô đã hiểu nhầm gói dịch vụ mình chọn. Cô vẫn giới thiệu Verbalis nên không định đổi công ty; không có chi tiết cô tự dịch hay cần bản dịch trong 24 giờ.' }
          ] } ] },
        { title: 'Web page, E-mail and Form', text:
`www.coastalretailforum.org/register

Coastal Retail Forum – Halverton Convention Center, June 8–9

Registration options:
Full pass (both days, includes lunch and the June 8 evening reception): $395
One-day pass (lunch included): $240
Reception only: $60

Register before May 1 to receive $50 off a full pass. Groups of four or more from the same company save an additional 10% on all passes.

This year's keynote speaker, retail analyst Corinne Matsuda, will open the forum at 9:00 A.M. on June 8. Workshops on store design, online sales, and staff training will run throughout both days. A full program will be posted on May 15.

* * *

To: registration@coastalretailforum.org
From: Arjun Mehta
Date: May 20
Subject: Registration question

Hello,

I registered for a full pass last month, but a client meeting has now been scheduled for the morning of June 8, and I will not be able to arrive in Halverton until about 2:00 P.M. that day. I am disappointed to miss the opening talk, as I have followed Ms. Matsuda's research for years.

Would it be possible to receive recordings of any sessions I miss? Also, I see from the program that the store design workshop is offered on both days. Could I switch my place to the June 9 session?

Thank you,
Arjun Mehta
Store Planning Manager, Tidewell Outlets

* * *

Coastal Retail Forum – Participant Feedback

Name: Arjun Mehta
Company: Tidewell Outlets
Pass type: Full pass

Please rate the following (1 = poor, 5 = excellent):
Workshops: 5
Venue: 4
Meals and reception: 3
Registration process: 5

Comments: The store design workshop was the highlight of the forum for me, and I was glad the organizers were able to move me to the second day without any trouble. The online recordings also helped me catch up on what I missed. My only suggestion is to provide more vegetarian dishes at lunch, as they had run out by the time I reached the buffet on the second day.`,
          groups: [ { type: 'mcq', instr: 'Questions 186-190 refer to the following web page, e-mail, and form.', items: [
            { n: 186, q: 'What is indicated about the full pass?', options: ['It includes an evening event.', 'It is available only to groups.', 'It costs $240.', 'It must be purchased by May 1.'], a: 0, cue: 'includes lunch and the June 8 evening reception',
              explain: 'Trang web: vé Full pass "includes lunch and the June 8 evening reception" → có sự kiện buổi tối. $240 là giá vé một ngày; mua trước 1/5 chỉ để được giảm $50, không bắt buộc; ưu đãi nhóm là giảm thêm, không giới hạn người mua.' },
            { n: 187, q: 'Why did Mr. Mehta send the e-mail?', options: ['To cancel his registration', 'To make requests because of a schedule conflict', 'To ask for a refund', 'To propose a workshop topic'], a: 1, cue: 'Could I switch my place to the June 9 session',
              explain: 'Vì có cuộc họp với khách sáng 8/6, ông hỏi xin bản ghi các phiên bị lỡ và "Could I switch my place to the June 9 session?" → đưa ra yêu cầu do trùng lịch. Ông không hủy đăng ký hay đòi hoàn tiền.' },
            { n: 188, q: 'What is probably true about Mr. Mehta?', options: ['He registered as part of a group.', 'He gave a presentation at the forum.', 'He paid for a one-day pass.', 'He did not see the keynote speech in person.'], a: 3, cue: 'will open the forum at 9:00 A.M. on June 8',
              explain: 'Kết hợp 2 tài liệu: trang web – bài phát biểu chính của Ms. Matsuda bắt đầu "at 9:00 A.M. on June 8"; email – ông chỉ đến Halverton khoảng 2 giờ chiều hôm đó → không nghe trực tiếp. Phiếu góp ý ghi "Full pass", không phải vé một ngày; không có thông tin đăng ký theo nhóm hay thuyết trình.' },
            { n: 189, q: "What is suggested about Mr. Mehta's requests?", options: ['Neither of them could be accommodated.', 'Only the request for recordings was granted.', 'Both of them were granted.', 'They were handled by Ms. Matsuda.'], a: 2, cue: 'move me to the second day without any trouble',
              explain: 'Email có 2 yêu cầu: xin bản ghi và đổi sang buổi workshop ngày 9/6. Phiếu góp ý: ban tổ chức "move me to the second day without any trouble" và "The online recordings also helped me" → cả hai đều được đáp ứng. Ms. Matsuda là diễn giả, không xử lý đăng ký.' },
            { n: 190, q: 'In the form, the word "highlight" in the comments is closest in meaning to', options: ['final event', 'main topic', 'brightest light', 'best part'], a: 3, cue: 'the highlight of the forum',
              explain: '"The store design workshop was the highlight of the forum for me" = phần hay nhất của diễn đàn → "best part". "brightest light" là nghĩa đen sai ngữ cảnh; "final event" và "main topic" không đúng nghĩa.' }
          ] } ] },
        { title: 'Itinerary, E-mail and Expense report', text:
`Travel Itinerary – Prepared by Skyward Corporate Travel
Traveler: Joaquín Arriaga, Senior Engineer, Halberg Water Systems
Purpose: Installation inspection, Brackenford Municipal Water Plant

Date | Details
Monday, November 9 | Flight HW 412 departs Rexford 7:40 A.M., arrives Brackenford 10:15 A.M.
Monday, November 9 – Wednesday, November 11 | Granby Suites Brackenford (2 nights), $145 per night
Tuesday, November 10 | Site inspection with plant manager, 9:00 A.M. – 4:00 P.M.
Wednesday, November 11 | Flight HW 419 departs Brackenford 6:30 P.M., arrives Rexford 9:05 P.M.

Car rental: Ridewell, compact car, pick up and return at Brackenford Airport

* * *

To: Annika Sørensen
From: Joaquín Arriaga
Date: November 11
Subject: Change of plans in Brackenford

Hi Annika,

The inspection at the Brackenford plant went well overall, but during yesterday's testing, one of the filtration pumps we installed in August failed to reach full pressure. The plant manager, Mr. Mwangi, asked me to stay until a replacement part arrives from our supplier. It is expected tomorrow morning, and I should be able to complete the repair and retest the system by early afternoon.

I have therefore extended my hotel stay by one night and moved my return flight to Thursday evening. The airline charged a $60 change fee. I have also kept the rental car for an extra day.

I will submit my expense report as soon as I am back. Please let me know if you need anything else from me before then.

Best regards,
Joaquín

* * *

Halberg Water Systems – Travel Expense Report
Employee: Joaquín Arriaga | Department: Field Engineering
Trip dates: November 9–12 | Approved by: Annika Sørensen

Item | Amount
Airfare (round-trip) | $386.00
Flight change fee | $60.00
Hotel | $435.00
Car rental (4 days) | $172.00
Meals | $118.50
Total | $1,171.50

Note: Receipts are not required for meals under $25. All other expenses must be supported by original receipts.`,
          groups: [ { type: 'mcq', instr: 'Questions 191-195 refer to the following itinerary, e-mail, and expense report.', items: [
            { n: 191, q: 'Why did Mr. Arriaga extend his trip?', options: ['The plant manager was unavailable on Tuesday.', 'A pump requires a replacement part.', 'His original return flight was canceled.', "He was asked to train the plant's staff."], a: 1, cue: 'one of the filtration pumps we installed in August failed to reach full pressure',
              explain: 'Trong e-mail, một máy bơm lọc "failed to reach full pressure" (không đạt đủ áp suất) và quản lý nhà máy nhờ anh ở lại chờ linh kiện thay thế → anh kéo dài chuyến đi để sửa máy bơm. Chuyến bay không bị hủy mà do anh tự đổi; không có việc đào tạo nhân viên.' },
            { n: 192, q: 'In the e-mail, the word "reach" in paragraph 1, line 2, is closest in meaning to', options: ['contact', 'stretch', 'achieve', 'hand over'], a: 2, cue: 'failed to reach full pressure',
              explain: '"failed to reach full pressure" nghĩa là không đạt được áp suất tối đa → "reach" = "achieve" (đạt tới). Nghĩa "liên lạc" (reach someone), "vươn ra" hay "đưa cho" không phù hợp khi nói về áp suất của máy bơm.' },
            { n: 193, q: 'What is indicated about the hotel charge in the expense report?', options: ['It includes a late checkout fee.', 'It was paid by Skyward Corporate Travel.', 'It is for a different hotel than the one in the itinerary.', 'It covers three nights at the rate shown in the itinerary.'], a: 3, cue: 'Hotel | $435.00',
              explain: 'Kết hợp ba văn bản: lịch trình đặt Granby Suites 2 đêm, giá $145/đêm; e-mail cho biết anh ở thêm một đêm → tổng 3 đêm; báo cáo chi phí ghi khách sạn $435 = 3 × $145. Không có phí trả phòng muộn, không đổi khách sạn, và chi phí do chính anh kê khai.' },
            { n: 194, q: 'On what date did Mr. Arriaga most likely fly back to Rexford?', options: ['November 12', 'November 11', 'November 13', 'November 10'], a: 0, cue: 'moved my return flight to Thursday evening',
              explain: 'Kết hợp ba văn bản: lịch trình cho thấy thứ Tư là ngày 11/11, nên thứ Năm là 12/11; e-mail nói anh đổi chuyến về sang "Thursday evening"; báo cáo chi phí ghi "Trip dates: November 9–12" → anh bay về ngày 12/11. Ngày 11/11 là ngày bay về theo kế hoạch ban đầu – bẫy.' },
            { n: 195, q: 'What is suggested about Ms. Sørensen?', options: ["She is responsible for approving Mr. Arriaga's travel expenses.", 'She works for Skyward Corporate Travel.', 'She met Mr. Mwangi at the Brackenford plant.', "She changed Mr. Arriaga's flight for him."], a: 0, cue: 'Approved by: Annika Sørensen',
              explain: 'Kết hợp hai văn bản: anh Arriaga gửi e-mail báo cáo thay đổi kế hoạch cho Annika Sørensen, và báo cáo chi phí ghi "Approved by: Annika Sørensen" → bà là người duyệt chi phí công tác của anh. Skyward là công ty du lịch lập lịch trình; chính anh đổi chuyến bay; bà không có mặt ở nhà máy.' }
          ] } ] },
        { title: 'Advertisement, Order form and E-mail', text:
`Threadmark Workwear – Custom Uniforms for Every Team

Give your staff a polished, professional look with Threadmark's durable workwear. All items can be embroidered with your company logo.

Item | Price per piece
Chef jacket | $32
Bib apron | $14
Polo shirt | $21
Baseball cap | $11

Embroidery: $4 per item (plus a one-time setup fee of $50 for each new logo design)
Orders of 50 or more garments receive 15 percent off the price of the garments.
Standard production time is 10 business days. Need it sooner? Express production (5 business days) is available for an additional $75.

* * *

Threadmark Workwear – Order Form
Customer: Pebblestone Café Group
Contact: Oluwaseun Balogun, Operations Manager
Order date: Monday, April 6

Item | Color | Quantity | Unit price | Subtotal
Bib apron | Forest green | 30 | $14 | $420
Polo shirt | White | 30 | $21 | $630
Embroidery | – | 60 | $4 | $240
Logo setup fee | – | 1 | $50 | $50
Total | | | | $1,340

Production: Standard
Ship to: Pebblestone Café Group, 17 Marrow Lane, Marrowfield

* * *

To: orders@threadmarkworkwear.com
From: Oluwaseun Balogun
Date: April 8
Subject: Order for Pebblestone Café Group

Hello,

I placed an order on your Web site on Monday for aprons and polo shirts for the staff of our three cafés. When I reviewed the confirmation, I noticed that the total did not reflect the discount advertised for large orders. Could you please correct the amount before charging our account?

In addition, we are opening a fourth café on April 16, and our new employees will need their uniforms before then. If the order cannot be completed in time with standard production, please upgrade it to express production and add the charge to our invoice.

Finally, please make sure the logo is stitched in white thread on the aprons and in green thread on the polo shirts, as shown in the design file I attached.

Thank you,
Oluwaseun Balogun`,
          groups: [ { type: 'mcq', instr: 'Questions 196-200 refer to the following advertisement, order form, and e-mail.', items: [
            { n: 196, q: 'What is indicated about Threadmark Workwear?', options: ['It offers free shipping on large orders.', 'It sells only chef jackets and aprons.', 'It can complete any order within five days at no extra cost.', 'It charges a one-time fee for each new logo design.'], a: 3, cue: 'plus a one-time setup fee of $50 for each new logo design',
              explain: 'Quảng cáo ghi "a one-time setup fee of $50 for each new logo design" (phí thiết lập một lần $50 cho mỗi mẫu logo mới) → công ty thu phí một lần cho mỗi logo. Sản xuất nhanh 5 ngày phải trả thêm $75; công ty bán cả áo polo và mũ; không nhắc đến miễn phí vận chuyển.' },
            { n: 197, q: 'By how much should the total on the order form most likely be reduced?', options: ['$50.00', '$157.50', '$201.00', '$240.00'], a: 1, cue: 'Orders of 50 or more garments receive 15 percent off the price of the garments.',
              explain: 'Kết hợp ba văn bản: đơn hàng có 60 sản phẩm may mặc (30 tạp dề + 30 áo polo), đủ điều kiện giảm 15% "off the price of the garments" theo quảng cáo, nhưng tổng tiền chưa trừ, như ông Balogun phàn nàn trong e-mail. Giảm 15% của $420 + $630 = $1.050 → $157.50. $201 là 15% của cả tổng $1.340 – sai vì phí thêu và phí logo không được giảm.' },
            { n: 198, q: "What will Threadmark most likely add to Pebblestone's invoice?", options: ['A second $50 logo setup fee', 'A charge for 60 more embroidered items', 'A $75 fee for express production', 'A delivery fee for the fourth café'], a: 2, cue: 'please upgrade it to express production and add the charge to our invoice',
              explain: 'Kết hợp ba văn bản: đặt hàng thứ Hai 6/4 với sản xuất tiêu chuẩn 10 ngày làm việc → xong khoảng 20/4, muộn hơn ngày khai trương 16/4. Vì vậy theo yêu cầu trong e-mail, đơn sẽ được nâng lên sản xuất nhanh (5 ngày làm việc, xong khoảng 13/4) với phụ phí $75 ghi trong quảng cáo. Các khoản khác không được yêu cầu.' },
            { n: 199, q: 'In the e-mail, the word "reflect" in paragraph 1, line 2, is closest in meaning to', options: ['consider', 'copy', 'return', 'show'], a: 3, cue: 'the total did not reflect the discount advertised for large orders',
              explain: '"the total did not reflect the discount" nghĩa là tổng tiền không thể hiện khoản giảm giá → "reflect" = "show" (thể hiện). Nghĩa "suy ngẫm", "phản chiếu ánh sáng", "sao chép" không phù hợp khi nói về con số trên hóa đơn.' },
            { n: 200, q: 'What is suggested about Pebblestone Café Group?', options: ['It has ordered from Threadmark many times before.', 'It wants all logos stitched in green thread.', 'It currently operates three cafés.', 'It is moving its main office to Marrowfield.'], a: 2, cue: 'aprons and polo shirts for the staff of our three cafés',
              explain: 'Ông Balogun đặt đồng phục cho "the staff of our three cafés" và sắp mở quán thứ tư → hiện công ty có ba quán cà phê. Logo màu trắng trên tạp dề và xanh trên áo polo, không phải toàn bộ màu xanh; việc phải trả phí logo mới cho thấy không chắc đã đặt hàng nhiều lần; không có chuyện chuyển văn phòng.' }
          ] } ] }
      ] }
  ] });
})(typeof self !== 'undefined' ? self : this);
