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
        { title: 'Notice', text:
`Halvorsen Kitchenware – Important Safety Notice

Halvorsen Kitchenware has identified a possible defect in a limited number of its Brio 1.7-liter electric kettles sold between August 1 and October 31. In some units, the switch may fail to turn off automatically after the water boils. No injuries have been reported, but we are asking customers to stop using affected kettles immediately.

To find out whether your kettle is affected, check the serial number printed on the base. Kettles with serial numbers beginning with BK-22 are included in this notice. All other models and serial numbers are safe to use.

Customers with an affected kettle may return it to any Halvorsen retail store for a full refund, even without a receipt. Alternatively, customers may request a free replacement kettle by completing the form at www.halvorsenkitchen.com/brio. Replacements will be shipped at no cost within ten business days.

We apologize for the inconvenience and thank you for your understanding.`,
          groups: [ { type: 'mcq', instr: 'Questions 165-166 refer to the following notice.', items: [
            { n: 165, q: 'What is the purpose of the notice?', options: ['To announce the launch of a new kettle model', 'To warn customers about a possible problem with a product', 'To explain how to clean an electric appliance', 'To advertise a seasonal discount on kitchenware'], a: 1, cue: 'the switch may fail to turn off automatically after the water boils',
              explain: 'Thông báo nói một số ấm đun "may fail to turn off automatically" (có thể không tự ngắt sau khi nước sôi) và đề nghị ngừng sử dụng → cảnh báo lỗi sản phẩm. Không hề giới thiệu mẫu mới, hướng dẫn vệ sinh hay khuyến mãi.' },
            { n: 166, q: 'What is NOT mentioned as an option for customers with an affected kettle?', options: ['Returning it to a store for a refund', 'Requesting a replacement online', 'Receiving a new kettle by mail at no charge', 'Having it repaired by a technician'], a: 3, cue: 'may return it to any Halvorsen retail store for a full refund',
              explain: 'Khách có thể "return it to any Halvorsen retail store for a full refund" (trả lại cửa hàng để hoàn tiền) hoặc điền form trực tuyến để nhận ấm thay thế gửi miễn phí. Thông báo KHÔNG nhắc đến việc nhờ kỹ thuật viên sửa chữa.' }
          ] } ] },
        { title: 'Letter', text:
`Dear Ms. Okonkwo,

On behalf of the Brantwood Maritime Museum, I would like to thank you for your generous donation of your grandfather's ship models and navigation instruments. Our curators were delighted to receive such well-preserved items, and they believe the collection will be of great interest to our visitors.

As we discussed by telephone, the items will first be cleaned and photographed by our conservation team. We plan to feature the collection in a new exhibit, "Charting the Coast," which is scheduled to open on March 14. Your family's contribution will be acknowledged on a display panel at the entrance to the exhibit.

We would also be honored if you and your family could attend a private preview of the exhibit on the evening of March 12. A formal invitation will be mailed to you in February.

Sincerely,
Graham Whitlock
Director of Collections
Brantwood Maritime Museum`,
          groups: [ { type: 'mcq', instr: 'Questions 167-168 refer to the following letter.', items: [
            { n: 167, q: 'Why did Mr. Whitlock write the letter?', options: ['To express thanks for a gift', 'To request a financial donation', 'To ask for permission to sell some items', 'To announce the closing of an exhibit'], a: 0, cue: 'thank you for your generous donation',
              explain: '"thank you for your generous donation" = cảm ơn món quà hiến tặng hào phóng (mô hình tàu và dụng cụ hàng hải) → thư cảm ơn. Bảo tàng không xin tiền, không bán hiện vật, và triển lãm sắp mở chứ không đóng cửa.' },
            { n: 168, q: 'In the letter, the word "feature" in paragraph 2, line 2, is closest in meaning to', options: ['characterize', 'resemble', 'showcase', 'appear'], a: 2, cue: 'We plan to feature the collection in a new exhibit',
              explain: '"feature the collection in a new exhibit" = trưng bày nổi bật bộ sưu tập trong triển lãm mới → "showcase". "characterize" (mô tả đặc điểm), "resemble" (giống) và "appear" (xuất hiện, nội động từ) không hợp ngữ cảnh.' }
          ] } ] },
        { title: 'Online chat discussion', text:
`Leticia Ferraz [10:02 A.M.]: Quick update: Dunmore Printing just called. Their main press broke down, so the first 2,000 copies of "Market Table" won't be ready until next Friday.
Arjun Mehta [10:04 A.M.]: That's a problem. The launch event at Pellham Books is this coming Thursday.
Leticia Ferraz [10:05 A.M.]: I know. They said they could print 300 copies on a smaller press by Tuesday, though.
Sofia Lindgren [10:07 A.M.]: Pellham only ordered 250 copies for the event, so 300 would cover it. The online orders can wait a few days.
Arjun Mehta [10:09 A.M.]: Good point. Do we need to tell the customers who preordered online?
Sofia Lindgren [10:10 A.M.]: Yes. I'd rather they hear it from us than notice the delay on their own.
Kwame Asante [10:13 A.M.]: I can draft an e-mail to those customers this morning. Should we offer them anything for the inconvenience?
Leticia Ferraz [10:15 A.M.]: A free shipping code would be a nice gesture. Kwame, please send me the draft before it goes out.
Kwame Asante [10:16 A.M.]: Sure thing. You'll have it by noon.`,
          groups: [ { type: 'mcq', instr: 'Questions 169-171 refer to the following online chat discussion.', items: [
            { n: 169, q: 'What problem are the writers discussing?', options: ['A printing company cannot deliver an order on time.', 'A bookstore has canceled a launch event.', 'An author is unable to attend an event.', 'Some books were printed with errors.'], a: 0, cue: 'Their main press broke down',
              explain: '"Their main press broke down" (máy in chính bị hỏng) nên 2.000 cuốn sẽ trễ đến thứ Sáu tuần sau → nhà in không giao đúng hạn. Sự kiện ra mắt vẫn diễn ra, không có chuyện tác giả vắng mặt hay sách in lỗi.' },
            { n: 170, q: 'At 10:09 A.M., what does Mr. Mehta most likely mean when he writes, "Good point"?', options: ['He thinks the event should be moved to a larger venue.', 'He wants Pellham Books to order more copies.', 'He plans to cancel all of the online orders.', 'He agrees that the smaller print run will meet the immediate need.'], a: 3, cue: 'Pellham only ordered 250 copies for the event, so 300 would cover it',
              explain: 'Ngay trước đó Ms. Lindgren nói Pellham chỉ đặt 250 cuốn nên 300 cuốn "would cover it" (là đủ), đơn online có thể chờ. "Good point" = ý hay đấy → anh đồng ý rằng lô in nhỏ đủ đáp ứng nhu cầu trước mắt. Không ai đề nghị đổi địa điểm, đặt thêm hay hủy đơn.' },
            { n: 171, q: 'What will Mr. Asante most likely do next?', options: ['Call Dunmore Printing', 'Visit Pellham Books', 'Write a message to customers', 'Update the company Web site'], a: 2, cue: 'I can draft an e-mail to those customers this morning',
              explain: 'Mr. Asante nói "I can draft an e-mail to those customers this morning" (soạn email gửi khách đặt trước) và hứa gửi bản nháp trước trưa → anh sẽ viết thư cho khách hàng. Các việc khác không được nhắc đến.' }
          ] } ] },
        { title: 'Article', text:
`Rooftop Solar Takes Off at Port Elmsworth Warehouses
By Ingrid Solberg

PORT ELMSWORTH (February 18) – Logistics firm Tavera Freight has completed the installation of solar panels on the roofs of its three warehouses near the Port Elmsworth harbor. —[1]— The panels, which cover a combined area of about 22,000 square meters, are expected to supply roughly 60 percent of the electricity used at the sites.

"Our warehouses have huge, flat roofs that were doing nothing but collecting rain," said Tavera's facilities manager, Rodrigo Esposito. "Now they are working for us." —[2]— The company estimates that it will recover the cost of the project within seven years through lower energy bills.

The project was partly funded by a regional grant program that supports businesses switching to renewable energy. —[3]— Tavera received about one-third of the project's total cost through the program.

Mr. Esposito said the company is now considering adding battery storage so that power generated during the day can be used for night shifts. —[4]— A decision is expected later this year.`,
          groups: [ { type: 'mcq', instr: 'Questions 172-175 refer to the following article.', items: [
            { n: 172, q: 'What is the article mainly about?', options: ['The construction of a new harbor', 'A shortage of warehouse space', 'A rise in electricity prices', "A company's use of renewable energy at its facilities"], a: 3, cue: 'has completed the installation of solar panels on the roofs of its three warehouses',
              explain: 'Bài viết nói Tavera Freight "has completed the installation of solar panels" trên mái ba nhà kho → công ty dùng năng lượng tái tạo tại cơ sở của mình. Không nói về xây cảng, thiếu kho hay giá điện tăng.' },
            { n: 173, q: 'What is indicated about the solar panels?', options: ['They were manufactured by Tavera Freight.', "They are expected to meet more than half of the sites' power needs.", 'They took seven years to install.', 'They will be used to charge delivery trucks.'], a: 1, cue: 'supply roughly 60 percent of the electricity used at the sites',
              explain: '"supply roughly 60 percent of the electricity" = cung cấp khoảng 60% lượng điện → hơn một nửa nhu cầu. "Seven years" là thời gian hoàn vốn, không phải thời gian lắp đặt; bài không nói công ty tự sản xuất tấm pin hay sạc xe tải.' },
            { n: 174, q: 'What is NOT mentioned about the project?', options: ['How long it will take to recover its cost', 'Where some of its funding came from', 'Which company installed the panels', 'A possible future addition to it'], a: 2, cue: 'recover the cost of the project within seven years',
              explain: 'Bài có nêu thời gian hoàn vốn ("recover the cost ... within seven years"), nguồn tài trợ (chương trình trợ cấp vùng) và khả năng bổ sung pin lưu trữ. Bài KHÔNG cho biết công ty nào lắp đặt tấm pin.' },
            { n: 175, q: 'In which of the positions marked [1], [2], [3], and [4] does the following sentence best belong? "Such grants are available to companies of any size in the region."', options: ['[1]', '[2]', '[3]', '[4]'], a: 2, cue: 'supports businesses switching to renewable energy.',
              explain: '"Such grants" (những khoản trợ cấp như vậy) phải đứng sau câu nhắc đến "a regional grant program that supports businesses switching to renewable energy" → vị trí [3]. Các vị trí khác chưa hề nói đến trợ cấp.' }
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
          groups: [ { type: 'mcq', instr: 'Questions 176-180 refer to the following Web page and e-mail.', items: [
            { n: 176, q: 'Which class has Mr. Wilk had trouble joining?', options: ['Morning Yoga', 'Indoor Cycling', 'Strength Basics', 'Aqua Fitness'], a: 1, cue: 'the evening class on Tuesdays and Thursdays',
              explain: 'Kết hợp 2 văn bản: lớp buổi tối thứ Ba/thứ Năm là Indoor Cycling (19h, Tue/Thu), lớp giới hạn 20 người nên hay kín chỗ.' },
            { n: 177, q: 'What class is Mr. Wilk considering trying?', options: ['Morning Yoga', 'Aqua Fitness', 'Indoor Cycling', 'Strength Basics'], a: 3, cue: 'a lunchtime class taught by the same instructor',
              explain: 'Cùng giảng viên Leon Varga, lớp giờ trưa (12:15) là Strength Basics.' },
            { n: 178, q: 'What answer will Mr. Wilk most likely receive to his question about reservations?', options: ['Bookings must be made through the app.', 'Reservations are required one week ahead.', 'No reservation is needed for the class.', 'The class is open only to Premium members.'], a: 2, cue: 'All other classes are first come, first served',
              explain: 'Chỉ Indoor Cycling bắt buộc đặt trước; các lớp khác (gồm Strength Basics) "first come, first served" → không cần đặt chỗ.' },
            { n: 179, q: 'How much does Mr. Wilk currently pay to attend a group class?', options: ['$8', 'Nothing', '$20', '$12'], a: 0, cue: 'Standard members may attend for $8 per class',
              explain: 'Ông là hội viên Standard; hội viên Standard trả $8 mỗi lớp.' },
            { n: 180, q: 'Why is Mr. Wilk interested in changing his membership?', options: ['He is moving closer to the gym.', 'He wants access to the pool.', 'He is unhappy with his instructor.', 'He goes to classes frequently.'], a: 3, cue: 'I am now attending classes several times a week',
              explain: 'Ông muốn nâng cấp vì đi học nhiều lần mỗi tuần; gói Premium được học miễn phí.' }
          ] } ] },
        { title: 'Memo and Schedule', text:
`MEMO
To: All warehouse staff, Oberlin Distribution Center
From: Natasha Volkova, Safety Coordinator
Date: June 3
Subject: Forklift recertification

As required by our insurance provider, every employee who operates a forklift must complete a recertification course this month. Each course consists of a classroom session followed by a practical driving test on the same day.

Please sign up for one session on the schedule below by Friday, June 7. Employees on the night shift should choose an afternoon session so that they do not have to come in early in the morning. Sessions are limited to eight participants, so register early.

Staff who passed the course within the past twelve months are exempt but must submit a copy of their certificate to me. Employees who do not complete recertification by June 30 will be temporarily reassigned to duties that do not involve operating a forklift.

* * *

Forklift Recertification – June Sessions
Training Room 2, Oberlin Distribution Center

Date | Time | Instructor | Spaces left
Tuesday, June 11 | 8:00 A.M.–12:00 P.M. | Marcus Bell | 0
Thursday, June 13 | 1:00 P.M.–5:00 P.M. | Marcus Bell | 3
Monday, June 17 | 8:00 A.M.–12:00 P.M. | Aiko Tanaka | 5
Wednesday, June 26 | 1:00 P.M.–5:00 P.M. | Aiko Tanaka | 6`,
          groups: [ { type: 'mcq', instr: 'Questions 181-185 refer to the following memo and schedule.', items: [
            { n: 181, q: 'What is the purpose of the memo?', options: ['To announce a required training course', 'To introduce a new safety coordinator', 'To report an accident in the warehouse', 'To explain changes to shift schedules'], a: 0, cue: 'must complete a recertification course this month',
              explain: 'Memo yêu cầu mọi nhân viên lái xe nâng "must complete a recertification course this month" (phải hoàn thành khóa cấp lại chứng nhận trong tháng) → thông báo khóa đào tạo bắt buộc. Không có tai nạn, nhân sự mới hay thay đổi ca làm.' },
            { n: 182, q: 'In the memo, the word "exempt" in paragraph 3, line 1, is closest in meaning to', options: ['released', 'excused', 'prepared', 'promoted'], a: 1, cue: 'are exempt but must submit a copy of their certificate',
              explain: '"are exempt" ở đây = được miễn (không phải học lại khóa) → "excused". "released" (được thả, phát hành), "prepared" (đã chuẩn bị), "promoted" (được thăng chức) không hợp nghĩa.' },
            { n: 183, q: 'A night-shift employee who has not registered yet wants to take the course with Ms. Tanaka. On which date will he most likely attend?', options: ['June 11', 'June 13', 'June 17', 'June 26'], a: 3, cue: 'Employees on the night shift should choose an afternoon session',
              explain: 'Kết hợp hai văn bản: memo yêu cầu nhân viên ca đêm "choose an afternoon session" (chọn buổi chiều); theo lịch, buổi chiều do Aiko Tanaka dạy là thứ Tư, 26/6. Ngày 17/6 là buổi sáng; ngày 11 và 13 do Marcus Bell dạy.' },
            { n: 184, q: 'What is suggested about the June 11 session?', options: ['It will be led by Ms. Volkova.', 'It has been moved to another room.', 'Eight employees have signed up for it.', 'It is intended for night-shift workers.'], a: 2, cue: 'Sessions are limited to eight participants',
              explain: 'Kết hợp hai văn bản: memo nói mỗi buổi "limited to eight participants" (tối đa 8 người); lịch cho thấy buổi 11/6 còn 0 chỗ → đã có 8 người đăng ký. Buổi này do Marcus Bell dạy, vào buổi sáng và không đổi phòng.' },
            { n: 185, q: 'According to the memo, what will happen to employees who do not complete recertification by June 30?', options: ['They will be given different tasks for a period of time.', 'They will have to pay for the course themselves.', 'They will lose their insurance coverage.', 'They will be required to take a written exam.'], a: 0, cue: 'will be temporarily reassigned to duties that do not involve operating a forklift',
              explain: '"temporarily reassigned to duties that do not involve operating a forklift" = tạm thời chuyển sang công việc không lái xe nâng → được giao nhiệm vụ khác một thời gian. Memo không nhắc đến tự trả phí, mất bảo hiểm hay thi viết.' }
          ] } ] },
        { title: 'E-mail, Itinerary and Online review', text:
`To: Tomas Lindqvist
From: reservations@harbourviewsuites.com
Date: May 2
Subject: Booking confirmation HV-5521

Dear Mr. Lindqvist,

Thank you for choosing Harbourview Suites in Sydney. We are pleased to confirm your reservation of a Business King room for three nights, arriving on May 19 and departing on May 22, at a rate of AUD 245 per night. Breakfast in our Level 2 restaurant is included.

As a member of our Blue Anchor loyalty program, you are entitled to complimentary airport transfers. To arrange one, simply reply to this e-mail with your flight details at least 48 hours before arrival. Late checkout until 2:00 P.M. is also available to members on request.

Reservations Team, Harbourview Suites

* * *

Travel Itinerary – Tomas Lindqvist, Regional Sales Director, Norrby Instruments

May 19 | Arrive Sydney, flight NI 482, 7:40 A.M. | Transfer to hotel
May 20 | 9:00 A.M.–5:00 P.M. | Meetings with distributors, Norrby Sydney office
May 21 | 10:00 A.M. | Product demonstration, Pacific Medical Expo, Darling Harbour
May 22 | Depart Sydney, flight NI 487, 6:15 P.M.

Note: All taxi and meal expenses not covered by the hotel should be paid with the corporate card, and receipts must be submitted within ten days of your return.

* * *

Harbourview Suites – Guest Review
Posted by T. Lindqvist, May 24
Rating: 4 out of 5

I stayed here for three nights on a business trip. The driver who collected me from the airport was waiting when I landed, which was a relief after a long overnight flight. My room was spacious and quiet, and the desk was large enough to spread out my documents. The location is ideal, as the expo center is a short walk away.

My only complaint concerns breakfast. The restaurant was so crowded on my first morning that I had to wait twenty minutes for a table. Staff told me that a large tour group was staying at the hotel. On my last day, I appreciated being able to keep my room until the afternoon before heading to the airport.`,
          groups: [ { type: 'mcq', instr: 'Questions 186-190 refer to the following e-mail, itinerary, and online review.', items: [
            { n: 186, q: 'What is the purpose of the e-mail?', options: ['To confirm a hotel reservation', 'To announce a room upgrade', 'To request payment of a deposit', 'To advertise a loyalty program'], a: 0, cue: 'pleased to confirm your reservation',
              explain: 'Ngay đoạn 1 của email: "We are pleased to confirm your reservation" → xác nhận đặt phòng. Chương trình Blue Anchor chỉ được nhắc như quyền lợi của khách, không phải mục đích chính; không có nâng hạng phòng hay yêu cầu đặt cọc.' },
            { n: 187, q: 'In the e-mail, the word "arrange" in paragraph 2 is closest in meaning to', options: ['decorate', 'organize', 'adjust', 'sort'], a: 1, cue: 'To arrange one',
              explain: '"To arrange one" (one = an airport transfer) = sắp xếp/đặt một chuyến đưa đón → "organize". "decorate" (trang trí), "sort" (phân loại), "adjust" (điều chỉnh) không hợp ngữ cảnh đặt dịch vụ.' },
            { n: 188, q: 'What is probably true about Mr. Lindqvist?', options: ['He sent his flight details to the hotel in advance.', 'He paid for a taxi from the airport.', 'He changed his departure date.', 'He stayed at the hotel for four nights.'], a: 0, cue: 'The driver who collected me from the airport was waiting',
              explain: 'Email: muốn được đưa đón miễn phí thì phải gửi "flight details at least 48 hours before arrival"; bài đánh giá: "The driver who collected me from the airport was waiting" → ông đã gửi thông tin chuyến bay trước. Vì có xe đón nên không phải đi taxi; ông ở đúng ba đêm và rời đi 22/5 như dự kiến.' },
            { n: 189, q: 'Why did Mr. Lindqvist have to wait for breakfast?', options: ['The restaurant opened late.', 'He arrived before breakfast was served.', 'Many other guests were eating at the same time.', 'His room did not include breakfast.'], a: 2, cue: 'a large tour group was staying at the hotel',
              explain: 'Bài đánh giá: nhà hàng "so crowded" vì "a large tour group was staying at the hotel" → nhiều khách ăn cùng lúc. Email cho biết bữa sáng đã bao gồm trong giá phòng; không có thông tin nhà hàng mở cửa muộn.' },
            { n: 190, q: "What is suggested about Mr. Lindqvist's last day in Sydney?", options: ['He gave a product demonstration that day.', 'He missed his flight.', 'He met distributors in the morning.', 'He used a benefit available to loyalty program members.'], a: 3, cue: 'keep my room until the afternoon',
              explain: 'Bài đánh giá: ngày cuối ông được "keep my room until the afternoon"; email cho biết "Late checkout until 2:00 P.M." là quyền lợi dành cho thành viên → ông đã dùng ưu đãi thành viên. Theo lịch trình, buổi giới thiệu sản phẩm là 21/5 và gặp nhà phân phối là 20/5, không phải ngày cuối (22/5).' }
          ] } ] },
        { title: 'Price list, Order form and E-mail', text:
`Leafline Office Plants – Monthly Rental Plans

Plan | Plants included | Maintenance visits | Monthly fee
Starter | Up to 10 small plants | Once a month | $85
Standard | Up to 20 small or medium plants | Twice a month | $160
Premium | Up to 40 plants of any size | Every week | $290

All plans include delivery, decorative pots, and free replacement of any plant that becomes unhealthy. Customers who sign a twelve-month agreement receive one month free. Large floor plants (over 1.5 meters tall) are available only with the Premium plan.

* * *

Leafline Office Plants – Rental Order Form

Company: Castellan Legal Partners
Contact: Mei-Lin Zhou, Office Manager
Address: 410 Ridgeway Avenue, Suite 900
Plan selected: Standard
Agreement length: 12 months
Number of plants: 18 (12 small, 6 medium)
Preferred delivery date: Monday, September 8
Special requests: Please also include two large palm trees (about 2 meters tall) for our reception area.

* * *

To: Mei-Lin Zhou
From: Oskar Brandt, Leafline Office Plants
Date: September 2
Subject: Your rental order

Dear Ms. Zhou,

Thank you for choosing Leafline. Before we finalize your order, I need to point out one issue. The two plants you requested for your reception area are available only with a higher-level plan. If you would like to keep them, I can switch your order to that plan, which would also cover the other 18 plants you selected. Alternatively, I can recommend some attractive medium-sized plants that would suit the space under your current plan.

Also, please note that our delivery team does not work on Mondays in September because of our seasonal stock deliveries. Would Tuesday, September 9, be acceptable instead?

I look forward to hearing from you.

Oskar Brandt
Customer Accounts`,
          groups: [ { type: 'mcq', instr: 'Questions 191-195 refer to the following price list, order form, and e-mail.', items: [
            { n: 191, q: "Which plan does Mr. Brandt offer to switch Ms. Zhou's order to?", options: ['Starter', 'Standard', 'Premium', 'A custom plan'], a: 2, cue: 'Large floor plants (over 1.5 meters tall) are available only with the Premium plan',
              explain: 'Kết hợp ba văn bản: phiếu đặt hàng xin thêm hai cây cọ cao khoảng 2 mét; bảng giá ghi cây lớn trên 1,5 mét "available only with the Premium plan"; email nói các cây này chỉ có ở gói cao hơn → gói Premium. Standard là gói cô đang chọn.' },
            { n: 192, q: 'If Ms. Zhou keeps her current plan, how much will she pay for the first year of the agreement?', options: ['$1,600', '$1,760', '$1,920', '$3,190'], a: 1, cue: 'Customers who sign a twelve-month agreement receive one month free',
              explain: 'Kết hợp hai văn bản: phiếu đặt hàng chọn gói Standard ($160/tháng) với hợp đồng 12 tháng; bảng giá cho biết hợp đồng 12 tháng được "one month free" → trả 11 tháng × $160 = $1,760. $1,920 là giá đủ 12 tháng; $3,190 là 11 tháng gói Premium.' },
            { n: 193, q: 'What is suggested about Leafline Office Plants?', options: ['It charges extra for decorative pots.', 'It changes its delivery schedule at certain times of the year.', 'It replaces unhealthy plants for a small fee.', 'It has recently moved to Ridgeway Avenue.'], a: 1, cue: 'does not work on Mondays in September because of our seasonal stock deliveries',
              explain: 'Email cho biết đội giao hàng "does not work on Mondays in September" vì nhận hàng theo mùa → lịch giao hàng thay đổi vào một số thời điểm trong năm. Chậu trang trí và thay cây yếu đều miễn phí; Ridgeway Avenue là địa chỉ của khách hàng.' },
            { n: 194, q: 'In the e-mail, the word "suit" in paragraph 1, line 5, is closest in meaning to', options: ['dress', 'request', 'follow', 'fit'], a: 3, cue: 'that would suit the space under your current plan',
              explain: '"plants that would suit the space" = cây phù hợp với không gian → "fit". Nghĩa "bộ com-lê, mặc đồ" ("dress") hay "request", "follow" không hợp ngữ cảnh.' },
            { n: 195, q: 'What does Mr. Brandt ask Ms. Zhou to do?', options: ['Approve a different delivery date', 'Pay a deposit in advance', 'Send a floor plan of her office', 'Reduce the number of plants'], a: 0, cue: 'Would Tuesday, September 9, be acceptable instead?',
              explain: 'Anh hỏi "Would Tuesday, September 9, be acceptable instead?" (thứ Ba 9/9 có được không?) vì không giao vào thứ Hai → đề nghị cô chấp thuận ngày giao khác. Không yêu cầu đặt cọc, gửi sơ đồ hay giảm số cây.' }
          ] } ] },
        { title: 'Brochure, E-mail and Receipt', text:
`Kingfisher River Cruises – Private Group Charters

Planning a company outing, client reception, or team celebration? Charter one of our three riverboats for an unforgettable afternoon or evening on the Varne River.

Boat | Capacity | Rate per hour
Heron | 30 guests | $220
Osprey | 60 guests | $380
Albatross | 120 guests | $600

Minimum charter: 3 hours. Catering can be arranged through our partner, Saltmarsh Kitchen, at $25 per guest. All charters depart from Pier 4 in the Old Town district. Groups booking at least 30 days in advance receive a 10% discount on the boat rental (catering not included).

* * *

To: bookings@kingfishercruises.com
From: Renata Duarte <rduarte@solisanalytics.com>
Date: April 28
Subject: Charter inquiry

Hello,

Solis Analytics would like to charter a boat for our staff summer party on Friday, June 20, from 6:00 P.M. to 9:00 P.M. We expect about 45 employees, and we would like dinner to be provided for everyone. Several of our team members use wheelchairs, so please let me know whether the boat has step-free access.

Also, our office is in Linwood, about 40 minutes from the Old Town. Could the boat pick us up at a location closer to us?

Best regards,
Renata Duarte
Human Resources Coordinator

* * *

Kingfisher River Cruises – Payment Receipt

Receipt No.: KR-5817
Date: May 2
Customer: Solis Analytics (Renata Duarte)
Event date: June 20

Boat rental: Osprey, 3 hours ($380 × 3) ........ $1,140
Advance booking discount (10%) ................. –$114
Catering, Saltmarsh Kitchen (45 guests × $25) .. $1,125
Total paid ..................................... $2,151

Note: Departure from Pier 4, Old Town. Boarding begins 30 minutes before departure. Step-free boarding ramp available.`,
          groups: [ { type: 'mcq', instr: 'Questions 196-200 refer to the following brochure, e-mail, and receipt.', items: [
            { n: 196, q: 'What is indicated about Kingfisher River Cruises?', options: ['It operates boats on several rivers.', 'It offers discounts on catering.', 'It requires a minimum of 30 guests per charter.', 'It works with another company to provide food.'], a: 3, cue: 'Catering can be arranged through our partner, Saltmarsh Kitchen',
              explain: 'Tờ quảng cáo ghi "Catering can be arranged through our partner, Saltmarsh Kitchen" → hợp tác với công ty khác để cung cấp đồ ăn. Giảm giá chỉ áp dụng cho tiền thuê thuyền ("catering not included"); mức tối thiểu là 3 giờ, không phải 30 khách.' },
            { n: 197, q: 'In the e-mail, the word "provided" in paragraph 1, line 2, is closest in meaning to', options: ['supplied', 'allowed', 'predicted', 'returned'], a: 0, cue: 'we would like dinner to be provided for everyone',
              explain: '"dinner to be provided for everyone" = bữa tối được cung cấp cho mọi người → "supplied". Nghĩa "provided (that)" = với điều kiện, hay "allowed" (cho phép) không hợp; "predicted", "returned" sai nghĩa.' },
            { n: 198, q: 'Why was the Osprey most likely chosen for the Solis Analytics event?', options: ['It is the least expensive boat.', 'It is the only boat with a step-free ramp.', 'It can hold all of the expected guests.', 'It departs from a pier near Linwood.'], a: 2, cue: 'We expect about 45 employees',
              explain: 'Kết hợp ba văn bản: email dự kiến khoảng 45 nhân viên; tờ quảng cáo cho biết Heron chỉ chở 30 khách, Osprey chở 60 khách; biên lai ghi thuê Osprey → chọn vì chứa đủ số khách. Heron rẻ hơn nhưng quá nhỏ; mọi chuyến đều khởi hành từ Pier 4 ở Old Town.' },
            { n: 199, q: "What is suggested about Ms. Duarte's request to be picked up closer to her office?", options: ['It was approved for an additional fee.', 'It could not be accommodated.', 'It was forwarded to Saltmarsh Kitchen.', 'It caused the event date to change.'], a: 1, cue: 'Note: Departure from Pier 4, Old Town.',
              explain: 'Kết hợp ba văn bản: email xin đón gần Linwood; tờ quảng cáo nói "All charters depart from Pier 4 in the Old Town district"; biên lai vẫn ghi khởi hành từ Pier 4, Old Town và không có phí đón thêm → yêu cầu không được đáp ứng. Ngày sự kiện vẫn là 20/6.' },
            { n: 200, q: 'At what time can the Solis Analytics guests begin boarding on June 20?', options: ['5:00 P.M.', '5:30 P.M.', '6:00 P.M.', '6:30 P.M.'], a: 1, cue: 'Boarding begins 30 minutes before departure',
              explain: 'Kết hợp hai văn bản: email cho biết chuyến đi bắt đầu lúc 6:00 P.M.; biên lai ghi "Boarding begins 30 minutes before departure" (bắt đầu lên tàu 30 phút trước giờ khởi hành) → 5:30 P.M. 6:00 P.M. là giờ khởi hành.' }
          ] } ] }
      ] }
  ] });
})(typeof self !== 'undefined' ? self : this);
