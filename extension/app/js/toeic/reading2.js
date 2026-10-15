/* TOEIC Reading – Test 2 (tự biên soạn) */
(function (g) {
  const T = g.TOEIC = g.TOEIC || { reading: [], listening: [] };
  T.reading.push({ id: 'tr2', test: 2, title: 'TOEIC Reading Test 2', parts: [

    /* ================= PART 5 ================= */
    { part: 5, title: 'Incomplete Sentences', instr: 'A word or phrase is missing in each of the sentences below. Four answer choices are given below each sentence. Select the best answer to complete the sentence.',
      groups: [ { type: 'mcq', instr: '', items: [
        { n: 101, q: 'Dr. Alvarez reviewed the clinical data ------- before approving the final report.', options: ['careful', 'carefully', 'care', 'carefulness'], a: 1, cue: 'reviewed the clinical data',
          explain: 'Cần trạng từ bổ nghĩa cho động từ "reviewed" → "carefully" (một cách cẩn thận). "careful" là tính từ, "care/carefulness" là danh từ.' },
        { n: 102, q: 'Silverline Airways ------- three new routes to Southeast Asia last quarter.', options: ['launches', 'will launch', 'launched', 'is launching'], a: 2, cue: 'last quarter',
          explain: '"last quarter" (quý trước) chỉ quá khứ → quá khứ đơn "launched".' },
        { n: 103, q: 'Please forward any questions about the new travel policy ------- Ms. Delacroix in Human Resources.', options: ['to', 'at', 'from', 'with'], a: 0, cue: 'forward any questions',
          explain: 'Cụm "forward something TO somebody" = chuyển cái gì đến ai → "to".' },
        { n: 104, q: 'The conference organizers thanked ------- volunteers for their hard work during the three-day event.', options: ['they', 'them', 'themselves', 'their'], a: 3, cue: 'volunteers',
          explain: 'Trước danh từ "volunteers" cần tính từ sở hữu → "their". "they/them/themselves" không đứng trước danh từ.' },
        { n: 105, q: 'The quarterly sales figures will be ------- to all regional managers on Friday.', options: ['distributed', 'distributing', 'distribute', 'distribution'], a: 0, cue: 'will be',
          explain: 'Sau "will be" và có tân ngữ gián tiếp "to all regional managers" → bị động "will be distributed" (sẽ được phân phát).' },
        { n: 106, q: 'Orders placed after 3:00 P.M. will not be processed ------- the following business day.', options: ['since', 'until', 'by', 'within'], a: 1, cue: 'will not be processed',
          explain: '"not ... until" = mãi đến ... mới. Đơn đặt sau 15h sẽ không được xử lý cho đến ngày làm việc kế tiếp. "by" chỉ hạn chót, "since" đi với hoàn thành.' },
        { n: 107, q: 'Mapleton Hardware is ------- the largest supplier of building materials in the region.', options: ['easy', 'ease', 'easiest', 'easily'], a: 3, cue: 'the largest supplier',
          explain: '"easily + so sánh nhất" = rõ ràng là, chắc chắn là (easily the largest). Cần trạng từ bổ nghĩa cho cụm so sánh nhất.' },
        { n: 108, q: 'Neither the sales director ------- her assistant was available to meet with the client yesterday.', options: ['or', 'and', 'nor', 'but'], a: 2, cue: 'Neither the sales director',
          explain: 'Cặp liên từ cố định "Neither ... nor ..." (cả ... lẫn ... đều không).' },
        { n: 109, q: 'Applicants should include a cover letter that ------- their relevant experience.', options: ['describes', 'describing', 'description', 'to describe'], a: 0, cue: 'a cover letter that',
          explain: 'Mệnh đề quan hệ "that ..." cần động từ chia, chủ ngữ là "a cover letter" (số ít) → "describes".' },
        { n: 110, q: 'Because of the ------- storm warning, the outdoor concert has been moved to the community hall.', options: ['severely', 'severity', 'severe', 'severing'], a: 2, cue: 'storm warning',
          explain: 'Trước cụm danh từ "storm warning" cần tính từ → "severe" (nghiêm trọng). "severity" là danh từ, "severely" là trạng từ.' },
        { n: 111, q: 'The finance team will ------- the costs of the two proposals before making a recommendation.', options: ['agree', 'depend', 'belong', 'compare'], a: 3, cue: 'the costs of the two proposals',
          explain: '"compare the costs" = so sánh chi phí của hai đề xuất. "agree, depend, belong" là nội động từ, cần giới từ (agree on, depend on, belong to).' },
        { n: 112, q: 'The museum\'s new wing, ------- opened in May, features works by local sculptors.', options: ['who', 'which', 'what', 'where'], a: 1, cue: 'The museum\'s new wing,',
          explain: 'Mệnh đề quan hệ không xác định (có dấu phẩy) bổ nghĩa cho vật "new wing" và làm chủ ngữ → "which". "what" không dùng sau danh từ; "where" cần mệnh đề đủ chủ ngữ.' },
        { n: 113, q: 'Ms. Haverford ------- at Tresco Engineering for twelve years when she was promoted to vice president.', options: ['works', 'has worked', 'is working', 'had worked'], a: 3, cue: 'when she was promoted',
          explain: 'Hành động kéo dài đến một thời điểm trong quá khứ ("when she was promoted") → quá khứ hoàn thành "had worked".' },
        { n: 114, q: 'The training manual provides ------- instructions for setting up the new payroll software.', options: ['detail', 'detailed', 'detailing', 'details'], a: 1, cue: 'instructions',
          explain: 'Trước danh từ "instructions" cần tính từ → "detailed instructions" (hướng dẫn chi tiết).' },
        { n: 115, q: 'All employees must wear their identification badges ------- they are inside the factory.', options: ['whereas', 'so that', 'whenever', 'unless'], a: 2, cue: 'they are inside the factory',
          explain: '"whenever" = bất cứ khi nào: phải đeo thẻ bất cứ khi nào ở trong nhà máy. "unless" (trừ khi) và "whereas" (trong khi đó) sai nghĩa.' },
        { n: 116, q: 'Customers can track the ------- of their packages by entering the order number on our Web site.', options: ['statement', 'stature', 'status', 'statue'], a: 2, cue: 'track the',
          explain: '"track the status of packages" = theo dõi tình trạng gói hàng. Các từ còn lại có hình thức giống nhưng sai nghĩa.' },
        { n: 117, q: 'The new branch manager is known for ------- quickly to customer complaints.', options: ['respond', 'responds', 'responded', 'responding'], a: 3, cue: 'is known for',
          explain: 'Sau giới từ "for" cần V-ing → "responding".' },
        { n: 118, q: '------- the delay in shipping, the retailer offered all affected customers a 10 percent discount.', options: ['Although', 'Because of', 'Even though', 'In order to'], a: 1, cue: 'the delay in shipping',
          explain: 'Sau chỗ trống là cụm danh từ "the delay in shipping" → giới từ "Because of". "Although/Even though" cần mệnh đề; "In order to" + V.' },
        { n: 119, q: 'The renovation of the lobby was completed ------- ahead of schedule.', options: ['slightly', 'slight', 'slighter', 'slightest'], a: 0, cue: 'ahead of schedule',
          explain: 'Cần trạng từ bổ nghĩa cho cụm "ahead of schedule" → "slightly" (hơi, một chút).' },
        { n: 120, q: 'Dunmore Textiles has decided to ------- its production to a larger facility outside the city.', options: ['remain', 'reside', 'rely', 'relocate'], a: 3, cue: 'its production to a larger facility',
          explain: '"relocate something to ..." = di dời cái gì đến nơi khác. "remain, reside, rely" không có tân ngữ trực tiếp theo nghĩa này.' },
        { n: 121, q: 'Only ------- who have completed the safety course may operate the forklifts.', options: ['that', 'those', 'this', 'these'], a: 1, cue: 'who have completed the safety course',
          explain: '"those who ..." = những người mà ... Đại từ "those" đứng trước mệnh đề quan hệ chỉ người.' },
        { n: 122, q: 'The hotel\'s rooftop restaurant is ------- for its views of the harbor.', options: ['renowning', 'renowned', 'renown', 'renownedly'], a: 1, cue: 'for its views of the harbor',
          explain: '"be renowned for" = nổi tiếng về. Cần tính từ sau "is".' },
        { n: 123, q: 'The marketing proposal was well received; -------, the budget will need to be reduced.', options: ['therefore', 'similarly', 'however', 'for example'], a: 2, cue: 'was well received',
          explain: 'Hai vế tương phản (được đón nhận tốt NHƯNG phải giảm ngân sách) → "however".' },
        { n: 124, q: 'Ms. Ito asked that the meeting minutes be sent to ------- by the end of the day.', options: ['she', 'her', 'hers', 'herself'], a: 1, cue: 'be sent to',
          explain: 'Sau giới từ "to" cần đại từ tân ngữ → "her". "herself" chỉ dùng khi chủ ngữ và tân ngữ của cùng một mệnh đề trùng nhau.' },
        { n: 125, q: 'The contract will be renewed automatically ------- either party provides written notice of cancellation.', options: ['unless', 'despite', 'whether', 'during'], a: 0, cue: 'provides written notice of cancellation',
          explain: '"unless" = trừ khi: hợp đồng tự gia hạn TRỪ KHI một bên gửi thông báo hủy. "despite/during" + danh từ; "whether" sai nghĩa.' },
        { n: 126, q: 'Several staff members have volunteered to ------- the visiting delegation around the plant.', options: ['show', 'tell', 'speak', 'say'], a: 0, cue: 'the visiting delegation around the plant',
          explain: '"show somebody around a place" = dẫn ai đi tham quan nơi nào. Các động từ còn lại không đi với cấu trúc này.' },
        { n: 127, q: 'The more customers use the loyalty app, ------- rewards they earn.', options: ['many', 'most', 'the more', 'more than'], a: 2, cue: 'The more customers use the loyalty app',
          explain: 'So sánh kép "The more ..., the more ..." (càng ... càng ...).' },
        { n: 128, q: 'Please refer to the attached document for a ------- list of participating hotels.', options: ['comprehend', 'comprehensively', 'comprehension', 'comprehensive'], a: 3, cue: 'list of participating hotels',
          explain: 'Trước danh từ "list" cần tính từ → "comprehensive list" (danh sách đầy đủ).' },
        { n: 129, q: 'Under no circumstances ------- confidential client files be removed from the office.', options: ['should', 'do', 'have', 'are'], a: 0, cue: 'Under no circumstances',
          explain: 'Đảo ngữ sau "Under no circumstances": trợ động từ đứng trước chủ ngữ; động từ "be removed" ở dạng nguyên mẫu → cần động từ khuyết thiếu "should".' },
        { n: 130, q: 'Had the supplier delivered the parts on time, the assembly line ------- for two days.', options: ['would not stop', 'did not stop', 'will not have stopped', 'would not have stopped'], a: 3, cue: 'Had the supplier delivered',
          explain: 'Câu điều kiện loại 3 đảo ngữ ("Had + S + V3") → mệnh đề chính "would have + V3": "would not have stopped".' }
      ] } ] },

    /* ================= PART 6 ================= */
    { part: 6, title: 'Text Completion', instr: 'Read the texts that follow. A word, phrase, or sentence is missing in parts of each text. Four answer choices for each question are given below the text. Select the best answer to complete the text.',
      passages: [
        { title: 'Notice', text:
`ATTENTION, PATRONS OF THE ELMWOOD PUBLIC LIBRARY

Beginning on June 1, the library will -----(131)----- its opening hours on weekdays. The main building will now open at 8:00 A.M. instead of 9:30 A.M., giving students and early commuters more time to study, read, or use our computers.

To support this change, we have hired two additional staff members. -----(132)-----. In addition, the self-checkout machines on the ground floor have been -----(133)-----, so borrowing items will be faster than ever.

Weekend hours will remain the same. We look forward to -----(134)----- you at the library soon.`,
          groups: [ { type: 'mcq', instr: 'Questions 131-134 refer to the following notice.', items: [
            { n: 131, q: '(131)', options: ['shorten', 'extend', 'cancel', 'delay'], a: 1, cue: 'open at 8:00 A.M. instead of 9:30 A.M.',
              explain: 'Mở cửa sớm hơn (8h thay vì 9h30) → giờ mở cửa được KÉO DÀI → "extend". "shorten" ngược nghĩa.' },
            { n: 132, q: '(132)', options: ['They will be available at the information desk to assist visitors.', 'The library was founded more than a century ago.', 'Overdue fines will be doubled next year.', 'The parking lot will be closed for repaving.'], a: 0, cue: 'we have hired two additional staff members',
              explain: 'Câu trước nói thuê thêm hai nhân viên; câu (A) dùng "They" chỉ hai nhân viên này và nêu nhiệm vụ của họ → liền mạch. Các câu khác lạc đề.' },
            { n: 133, q: '(133)', options: ['upgrade', 'upgrading', 'upgrades', 'upgraded'], a: 3, cue: 'have been',
              explain: '"have been + V3" → bị động hiện tại hoàn thành: máy đã được nâng cấp → "upgraded".' },
            { n: 134, q: '(134)', options: ['see', 'seen', 'seeing', 'saw'], a: 2, cue: 'We look forward to',
              explain: '"look forward to + V-ing" ("to" là giới từ) → "seeing".' }
          ] } ] },
        { title: 'E-mail', text:
`To: Arjun Mehta <amehta@quillpress.com>
From: Sofia Brandt <sbrandt@nordicprint.com>
Date: August 18
Subject: Your quote request

Dear Mr. Mehta,

Thank you for contacting Nordic Print Solutions. As requested, I have attached a quote for printing 2,000 copies of your company's annual catalog. -----(135)-----, the price includes full-color printing on recycled paper and delivery to your office.

Please note that this quote is -----(136)----- for 30 days. -----(137)-----. If you decide to proceed, we will send you a proof within three business days of receiving your files.

I would be happy to answer any questions you may have. I look forward to -----(138)----- with Quill Press.

Best regards,
Sofia Brandt
Account Executive`,
          groups: [ { type: 'mcq', instr: 'Questions 135-138 refer to the following e-mail.', items: [
            { n: 135, q: '(135)', options: ['However', 'In addition', 'Instead', 'Nevertheless'], a: 1, cue: 'the price includes full-color printing on recycled paper',
              explain: 'Câu này BỔ SUNG thông tin cho báo giá vừa gửi (giá đã bao gồm in màu và giao hàng) → "In addition" (ngoài ra). "However/Nevertheless/Instead" chỉ sự tương phản/thay thế, không hợp mạch.' },
            { n: 136, q: '(136)', options: ['valid', 'validate', 'validity', 'validly'], a: 0, cue: 'this quote is',
              explain: 'Sau động từ "is" cần tính từ → "valid for 30 days" (có hiệu lực trong 30 ngày).' },
            { n: 137, q: '(137)', options: ['Our printing plant is located in Hamburg.', 'Our catalog features more than 500 products.', 'After that date, prices may change because of rising paper costs.', 'Thank you for attending our trade show.'], a: 2, cue: 'for 30 days',
              explain: 'Câu trước nói báo giá có hiệu lực 30 ngày; câu (C) giải thích sau thời hạn đó giá có thể thay đổi → mạch lạc. (B) sai vì catalog là của khách.' },
            { n: 138, q: '(138)', options: ['work', 'worked', 'have worked', 'working'], a: 3, cue: 'I look forward to',
              explain: '"look forward to + V-ing" → "working".' }
          ] } ] },
        { title: 'Article', text:
`DA LAT (February 9) — Highland Bloom Farms, one of the region's largest flower growers, has begun selling its products directly to consumers through a new online store. Until now, the company had sold its roses and lilies -----(139)----- to wholesalers and hotels.

"Many customers told us they wanted fresher flowers delivered straight to their homes," said marketing director Pham Thu Ha. "The online store makes that -----(140)-----."

Orders placed before noon are delivered the same day within Da Lat and the next day to Ho Chi Minh City. -----(141)-----. The company also plans to offer weekly flower subscriptions -----(142)----- the end of the year.`,
          groups: [ { type: 'mcq', instr: 'Questions 139-142 refer to the following article.', items: [
            { n: 139, q: '(139)', options: ['exclusively', 'exclusive', 'exclusion', 'excluding'], a: 0, cue: 'had sold its roses and lilies',
              explain: 'Cần trạng từ bổ nghĩa cho động từ "had sold" → "exclusively" (chỉ, độc quyền) bán cho nhà bán buôn và khách sạn.' },
            { n: 140, q: '(140)', options: ['possibility', 'possibly', 'possible', 'possibilities'], a: 2, cue: 'The online store makes that',
              explain: 'Cấu trúc "make + tân ngữ + tính từ" → "makes that possible" (biến điều đó thành có thể).' },
            { n: 141, q: '(141)', options: ['Roses grow best in warm, dry climates.', 'Ms. Pham joined the company last month.', 'Hotels in the area are fully booked during the festival.', 'Each bouquet is packed in a special box that keeps the flowers fresh for up to 48 hours.'], a: 3, cue: 'the next day to Ho Chi Minh City',
              explain: 'Đoạn nói về giao hàng (cả giao hàng xa tới TP.HCM); câu (D) giải thích cách giữ hoa tươi khi vận chuyển → hợp mạch nhất.' },
            { n: 142, q: '(142)', options: ['by', 'since', 'along', 'among'], a: 0, cue: 'the end of the year',
              explain: '"by the end of the year" = trước/chậm nhất là cuối năm. "since" đi với thì hoàn thành; "along/among" sai nghĩa.' }
          ] } ] },
        { title: 'Letter', text:
`Ridgeway Apartments
42 Lakeview Road

October 3

Dear Residents,

As part of our ongoing effort to improve the building, the elevators in the east wing will be replaced next month. Work will begin on November 2 and is scheduled to -----(143)----- by November 20.

While the work is in progress, residents of the east wing are asked to use the elevators in the west wing. -----(144)-----. We understand that this may be inconvenient, -----(145)----- for residents on the upper floors.

Residents who need help carrying heavy items during this period may contact the management office to request -----(146)-----. Thank you for your understanding.

Sincerely,
Gareth Lowell
Property Manager`,
          groups: [ { type: 'mcq', instr: 'Questions 143-146 refer to the following letter.', items: [
            { n: 143, q: '(143)', options: ['finish', 'finishing', 'finished', 'finishes'], a: 0, cue: 'is scheduled to',
              explain: '"be scheduled to + V nguyên mẫu" → "finish".' },
            { n: 144, q: '(144)', options: ['The rent will increase on January 1.', 'Both wings are connected by a hallway on every floor.', 'The swimming pool is open until 10 P.M.', 'New residents must register their vehicles.'], a: 1, cue: 'use the elevators in the west wing',
              explain: 'Câu trước yêu cầu cư dân cánh đông dùng thang máy cánh tây; câu (B) giải thích hai cánh được nối bằng hành lang ở mỗi tầng → hợp lý nhất.' },
            { n: 145, q: '(145)', options: ['especially', 'special', 'specialize', 'specialty'], a: 0, cue: 'for residents on the upper floors',
              explain: '"especially for ..." = đặc biệt là đối với. Cần trạng từ đứng trước cụm giới từ.' },
            { n: 146, q: '(146)', options: ['permission', 'assistance', 'refunds', 'directions'], a: 1, cue: 'need help carrying heavy items',
              explain: 'Cần giúp mang đồ nặng → liên hệ để yêu cầu "assistance" (sự hỗ trợ).' }
          ] } ] }
      ] },

    /* ================= PART 7 ================= */
    { part: 7, title: 'Reading Comprehension', instr: 'In this part you will read a selection of texts, such as magazine and newspaper articles, e-mails, and instant messages. Each text or set of texts is followed by several questions. Select the best answer for each question.',
      passages: [
        { title: 'Invoice', text:
`Copperfield Catering Co.
88 Nguyen Hue Boulevard, District 1

INVOICE #C-3391
Date: April 7
Client: Sundara Consulting (Attn: Ms. Kavya Iyer)
Event: Staff appreciation luncheon, April 5

Buffet lunch (60 guests × $18) .............. $1,080
Dessert table ................................ $210
Beverage package ............................ $150
Service staff (4 servers × 5 hours) ......... $400
Subtotal .................................. $1,840
Deposit paid (March 20) ................... –$500
Balance due ............................... $1,340

Payment is due within 14 days of the invoice date. Clients who pay within 7 days will receive a 3% discount on the balance. Please note that the rental of tables and chairs was provided free of charge as a courtesy for first-time clients.`,
          groups: [ { type: 'mcq', instr: 'Questions 147-148 refer to the following invoice.', items: [
            { n: 147, q: 'What is indicated about Sundara Consulting?', options: ['It has hired Copperfield Catering before.', 'It held an event for its employees.', 'It canceled part of its order.', 'It has not paid a deposit.'], a: 1, cue: 'Staff appreciation luncheon',
              explain: '"Staff appreciation luncheon" = bữa trưa tri ân nhân viên → sự kiện cho nhân viên. (A) sai vì bàn ghế miễn phí cho khách lần đầu; (D) sai vì đã trả cọc $500.' },
            { n: 148, q: 'How can Ms. Iyer reduce the amount she pays?', options: ['By returning the tables and chairs', 'By paying the balance by April 14', 'By reducing the number of servers', 'By paying in cash'], a: 1, cue: 'Clients who pay within 7 days will receive a 3% discount',
              explain: 'Hóa đơn ngày 7/4; trả trong vòng 7 ngày (tức trước 14/4) được giảm 3% → đáp án (B).' }
          ] } ] },
        { title: 'Text-message chain', text:
`Hana Kowalski [2:03 P.M.]: Bilal, the projector in Conference Room B isn't turning on. The board members arrive at 3:00.
Bilal Haddad [2:05 P.M.]: Did you check whether it's plugged in? The cleaning crew sometimes unplugs it.
Hana Kowalski [2:06 P.M.]: Yes, that was the first thing I tried. The power light doesn't come on at all.
Bilal Haddad [2:08 P.M.]: Then it might be the bulb or the power supply. I can't fix either before 3:00.
Hana Kowalski [2:09 P.M.]: What should I do, then?
Bilal Haddad [2:10 P.M.]: Room D has a large wall screen, and nobody has booked it this afternoon. I'll move the reservation now and put a sign on the door of Room B.
Hana Kowalski [2:11 P.M.]: Perfect. I'll copy my slides onto a flash drive and head over there.`,
          groups: [ { type: 'mcq', instr: 'Questions 149-150 refer to the following text-message chain.', items: [
            { n: 149, q: 'At 2:06 P.M., what does Ms. Kowalski mean when she writes, "Yes, that was the first thing I tried"?', options: ['She already confirmed that the projector has power connected.', 'She has asked the cleaning crew for help.', 'She has used the projector before.', 'She has already moved the meeting.'], a: 0, cue: 'Did you check whether it\'s plugged in?',
              explain: 'Đáp lại câu hỏi "có kiểm tra phích cắm chưa?", cô nói đó là việc đầu tiên đã thử → đã kiểm tra máy được cắm điện.' },
            { n: 150, q: 'What will Mr. Haddad most likely do next?', options: ['Replace a bulb', 'Contact the board members', 'Change a room booking', 'Buy a new projector'], a: 2, cue: 'I\'ll move the reservation now',
              explain: 'Anh nói sẽ chuyển đặt phòng sang Room D ngay → thay đổi việc đặt phòng. Anh nói không thể sửa máy trước 3h.' }
          ] } ] },
        { title: 'Job advertisement', text:
`Position Available: Bilingual Tour Coordinator
Lantern Path Travel — Hoi An Office

Lantern Path Travel, a leading provider of small-group cultural tours in central Vietnam, is seeking a full-time tour coordinator. The successful candidate will arrange transportation and accommodations, communicate with local guides, and respond to customer inquiries in English and Vietnamese.

Requirements:
• At least two years of experience in the travel or hospitality industry
• Fluency in English and Vietnamese; knowledge of Korean or Japanese is a plus
• Strong organizational skills and the ability to work some weekends

We offer a competitive salary, health insurance, and two free tours per year for employees and a family member.

To apply, send a résumé and a short statement explaining why you are interested in the position to careers@lanternpath.vn by May 15. Interviews will be held in Hoi An during the last week of May.`,
          groups: [ { type: 'mcq', instr: 'Questions 151-153 refer to the following job advertisement.', items: [
            { n: 151, q: 'What is NOT listed as a duty of the tour coordinator?', options: ['Booking hotels', 'Leading tours personally', 'Answering customer questions', 'Contacting local guides'], a: 1, cue: 'communicate with local guides',
              explain: 'Nhiệm vụ: sắp xếp phương tiện/chỗ ở, liên lạc với hướng dẫn viên địa phương, trả lời khách. KHÔNG có việc tự mình dẫn tour.' },
            { n: 152, q: 'What is a preferred but not required qualification?', options: ['Experience in hospitality', 'Ability to work on weekends', 'Knowledge of an Asian language other than Vietnamese', 'A university degree in tourism'], a: 2, cue: 'knowledge of Korean or Japanese is a plus',
              explain: '"is a plus" = là điểm cộng (ưu tiên, không bắt buộc) → biết tiếng Hàn hoặc Nhật.' },
            { n: 153, q: 'What are applicants asked to submit?', options: ['A list of references', 'A copy of their passport', 'A sample tour itinerary', 'A statement of interest'], a: 3, cue: 'a short statement explaining why you are interested in the position',
              explain: 'Ứng viên gửi CV và một bản tuyên bố ngắn giải thích lý do quan tâm đến vị trí → "statement of interest".' }
          ] } ] },
        { title: 'E-mail', text:
`To: All Marlowe Pharmaceuticals staff
From: Yusuf Demir, IT Department
Date: January 14
Subject: Password update required

Dear colleagues,

As part of our annual security review, all employees will be required to change their network passwords by Friday, January 24. —[1]— Passwords that are not updated by this date will expire, and affected users will be unable to log in until they contact the IT help desk.

New passwords must contain at least twelve characters, including at least one number and one symbol. —[2]— You may not reuse any of your previous five passwords.

To change your password, log in to the employee portal and select "Account Settings." —[3]— The process takes less than five minutes.

We will also be introducing two-step verification next month. —[4]— Further details will be shared in a separate message.

Thank you for helping us keep our systems secure.

Yusuf Demir`,
          groups: [ { type: 'mcq', instr: 'Questions 154-157 refer to the following e-mail.', items: [
            { n: 154, q: 'Why was the e-mail sent?', options: ['To announce a required security measure', 'To introduce a new IT employee', 'To report a problem with the employee portal', 'To request feedback on a software program'], a: 0, cue: 'all employees will be required to change their network passwords',
              explain: 'Email yêu cầu mọi nhân viên đổi mật khẩu trong đợt rà soát bảo mật → thông báo biện pháp bảo mật bắt buộc.' },
            { n: 155, q: 'What will happen to employees who miss the deadline?', options: ['They will receive a warning letter.', 'They will be assigned a new password automatically.', 'They will be unable to access the network.', 'They will need to attend a training session.'], a: 2, cue: 'will be unable to log in until they contact the IT help desk',
              explain: 'Mật khẩu hết hạn và người dùng không đăng nhập được cho đến khi liên hệ bộ phận hỗ trợ IT.' },
            { n: 156, q: 'Which of the following passwords would be accepted?', options: ['A ten-character password with a number and a symbol', 'A twelve-character password with no symbols', 'A password used three months ago', 'A fourteen-character password with a number and a symbol'], a: 3, cue: 'at least twelve characters, including at least one number and one symbol',
              explain: 'Cần ≥ 12 ký tự, có ít nhất 1 số và 1 ký hiệu, không trùng 5 mật khẩu gần nhất → chỉ (D) hợp lệ.' },
            { n: 157, q: 'In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? "Then click \'Change Password\' and follow the instructions on the screen."', options: ['[1]', '[2]', '[3]', '[4]'], a: 2, cue: 'select "Account Settings."',
              explain: '"Then click ..." là bước tiếp theo sau khi đăng nhập và chọn "Account Settings" → vị trí [3].' }
          ] } ] },
        { title: 'Article', text:
`Cargo Bikes Gain Ground in City Deliveries
By Rosalind Achebe

MANILA (September 12) — A growing number of delivery companies in Metro Manila are replacing small vans with electric cargo bikes. Swiftline Couriers, which began testing the bikes last year, now operates a fleet of 85 of them.

"In heavy traffic, a cargo bike can complete almost twice as many deliveries per day as a van," said Swiftline's operations director, Miguel Santos. The bikes also cost far less to maintain and can be parked almost anywhere, he added.

Not everyone is convinced, however. Some businesses point out that the bikes can carry only about 150 kilograms, which limits them to smaller parcels. Others worry about riders' safety during the rainy season.

To address these concerns, Swiftline has provided its riders with waterproof gear and requires them to complete a two-day safety course. The company is also working with city officials on a plan to add protected bike lanes along major roads by 2028.`,
          groups: [ { type: 'mcq', instr: 'Questions 158-160 refer to the following article.', items: [
            { n: 158, q: 'What is the article mainly about?', options: ['A new traffic law in Metro Manila', 'The opening of a bicycle factory', 'The use of an alternative delivery vehicle', 'A decline in online shopping'], a: 2, cue: 'replacing small vans with electric cargo bikes',
              explain: 'Bài viết nói về việc các công ty giao hàng thay xe tải nhỏ bằng xe đạp chở hàng điện → phương tiện giao hàng thay thế.' },
            { n: 159, q: 'According to Mr. Santos, what is an advantage of cargo bikes?', options: ['They can carry heavier loads than vans.', 'They can make more deliveries in congested areas.', 'They are popular with older customers.', 'They are manufactured locally.'], a: 1, cue: 'In heavy traffic, a cargo bike can complete almost twice as many deliveries per day as a van',
              explain: 'Khi kẹt xe, xe đạp chở hàng giao được gần gấp đôi số đơn so với xe tải. (A) ngược lại – chỉ chở được khoảng 150 kg.' },
            { n: 160, q: 'What has Swiftline done to respond to concerns about its riders?', options: ['It has reduced their working hours.', 'It has built new bike lanes.', 'It has increased their salaries.', 'It has required them to receive safety training.'], a: 3, cue: 'requires them to complete a two-day safety course',
              explain: 'Công ty bắt buộc tài xế học khóa an toàn hai ngày. Làn xe đạp mới chỉ là kế hoạch với thành phố, chưa xây.' }
          ] } ] },
        { title: 'Online chat discussion', text:
`Celeste Moreau [10:02 A.M.]: Good morning, everyone. Just a reminder that the Ortega Hotels presentation has been moved up to Thursday.
Darnell Price [10:03 A.M.]: Thursday? I thought it was next Monday.
Celeste Moreau [10:04 A.M.]: It was, but their CEO is flying to Madrid on Saturday and wants to see our proposal first.
Yuki Tanabe [10:05 A.M.]: The design mock-ups are almost finished. I just need to adjust the color scheme for the lobby.
Darnell Price [10:07 A.M.]: The cost estimates are a different story. I'm still waiting for prices from two of our furniture suppliers.
Celeste Moreau [10:08 A.M.]: Can you call them today and explain the new deadline?
Darnell Price [10:09 A.M.]: I'll try. If they can't respond by Wednesday morning, I'll use last year's prices and add a note.
Yuki Tanabe [10:10 A.M.]: Celeste, would you like to do a practice run on Wednesday afternoon?
Celeste Moreau [10:11 A.M.]: Good idea. Let's meet in my office at 3:00. I'll send everyone a calendar invitation.`,
          groups: [ { type: 'mcq', instr: 'Questions 161-164 refer to the following online chat discussion.', items: [
            { n: 161, q: 'Why was the presentation rescheduled?', options: ['A client executive will be traveling.', 'The design team needs more time.', 'A meeting room is unavailable.', 'A supplier changed its prices.'], a: 0, cue: 'their CEO is flying to Madrid on Saturday',
              explain: 'CEO của khách hàng sẽ bay đi Madrid thứ Bảy và muốn xem đề xuất trước → lịch được dời sớm hơn.' },
            { n: 162, q: 'What is suggested about Ms. Tanabe?', options: ['She will contact the suppliers.', 'She works on visual designs.', 'She is meeting the CEO in Madrid.', 'She has finished her cost estimates.'], a: 1, cue: 'The design mock-ups are almost finished',
              explain: 'Cô nói bản mô phỏng thiết kế gần xong, chỉ cần chỉnh phối màu sảnh → cô làm thiết kế hình ảnh.' },
            { n: 163, q: 'At 10:07 A.M., what does Mr. Price imply when he writes, "The cost estimates are a different story"?', options: ['He has found a cheaper supplier.', 'He disagrees with the design.', 'His part of the work is not close to being finished.', 'He wants to write a story for the client.'], a: 2, cue: 'I\'m still waiting for prices from two of our furniture suppliers',
              explain: 'Trái với phần thiết kế "gần xong", phần dự toán chi phí còn đang chờ giá từ nhà cung cấp → chưa gần hoàn thành.' },
            { n: 164, q: 'What will Ms. Moreau most likely do next?', options: ['Call the furniture suppliers', 'Book a flight to Madrid', 'Revise the color scheme', 'Schedule a rehearsal'], a: 3, cue: 'I\'ll send everyone a calendar invitation',
              explain: 'Cô đồng ý tập dượt (practice run) chiều thứ Tư và sẽ gửi lời mời lịch → lên lịch buổi tập dượt.' }
          ] } ] },
        { title: 'Web page and E-mail', text:
`www.brightharborgym.com/classes

Bright Harbor Fitness Center – Group Classes (March)

Class | Day and Time | Instructor | Room
Morning Yoga | Mon/Wed, 6:30 A.M. | Nadia Okoye | Studio 1
Indoor Cycling | Tue/Thu, 7:00 P.M. | Leon Varga | Cycle Room
Strength Basics | Wed/Fri, 12:15 P.M. | Leon Varga | Studio 2
Aqua Fitness | Sat, 9:00 A.M. | Marisol Ruiz | Pool

Classes are free for Premium members. Standard members may attend for $8 per class. Space in Indoor Cycling is limited to 20 participants, so advance booking through our app is required. All other classes are first come, first served.

* * *

To: Members Services, Bright Harbor Fitness Center
From: Tomasz Wilk
Date: March 9
Subject: Class question

Hello,

I joined Bright Harbor as a Standard member last month, and I have really enjoyed the instructor who leads the evening class on Tuesdays and Thursdays. Unfortunately, I have tried to book a place three times this week, and each time the class was already full.

Since I work near the gym, I was thinking of trying a lunchtime class taught by the same instructor instead. Could you tell me whether that class also requires a reservation? I would also like to know how much it would cost to upgrade my membership, as I am now attending classes several times a week.

Regards,
Tomasz Wilk`,
          groups: [ { type: 'mcq', instr: 'Questions 165-170 refer to the following Web page and e-mail.', items: [
            { n: 165, q: 'What is indicated about Aqua Fitness?', options: ['It is held on a weekend.', 'It is taught by Ms. Okoye.', 'It requires advance booking.', 'It takes place in Studio 2.'], a: 0, cue: 'Sat, 9:00 A.M.',
              explain: 'Aqua Fitness diễn ra thứ Bảy 9h sáng → cuối tuần. Giảng viên là Marisol Ruiz, tổ chức ở hồ bơi.' },
            { n: 166, q: 'Which class has Mr. Wilk had trouble joining?', options: ['Morning Yoga', 'Indoor Cycling', 'Strength Basics', 'Aqua Fitness'], a: 1, cue: 'the evening class on Tuesdays and Thursdays',
              explain: 'Kết hợp 2 văn bản: lớp buổi tối thứ Ba/thứ Năm là Indoor Cycling (19h, Tue/Thu), lớp giới hạn 20 người nên hay kín chỗ.' },
            { n: 167, q: 'What class is Mr. Wilk considering trying?', options: ['Morning Yoga', 'Aqua Fitness', 'Indoor Cycling', 'Strength Basics'], a: 3, cue: 'a lunchtime class taught by the same instructor',
              explain: 'Cùng giảng viên Leon Varga, lớp giờ trưa (12:15) là Strength Basics.' },
            { n: 168, q: 'What answer will Mr. Wilk most likely receive to his question about reservations?', options: ['Bookings must be made through the app.', 'Reservations are required one week ahead.', 'No reservation is needed for the class.', 'The class is open only to Premium members.'], a: 2, cue: 'All other classes are first come, first served',
              explain: 'Chỉ Indoor Cycling bắt buộc đặt trước; các lớp khác (gồm Strength Basics) "first come, first served" → không cần đặt chỗ.' },
            { n: 169, q: 'How much does Mr. Wilk currently pay to attend a group class?', options: ['$8', 'Nothing', '$20', '$12'], a: 0, cue: 'Standard members may attend for $8 per class',
              explain: 'Ông là hội viên Standard; hội viên Standard trả $8 mỗi lớp.' },
            { n: 170, q: 'Why is Mr. Wilk interested in changing his membership?', options: ['He is moving closer to the gym.', 'He wants access to the pool.', 'He is unhappy with his instructor.', 'He goes to classes frequently.'], a: 3, cue: 'I am now attending classes several times a week',
              explain: 'Ông muốn nâng cấp vì đi học nhiều lần mỗi tuần; gói Premium được học miễn phí.' }
          ] } ] }
      ] }
  ] });
})(typeof self !== 'undefined' ? self : this);
