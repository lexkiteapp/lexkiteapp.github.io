/* Ngữ pháp – Cấu trúc động từ (tự biên soạn) */
(function (g) {
  const G = g.GRAMMAR = g.GRAMMAR || [];

  /* 1. Modal verbs of ability & permission */
  G.push({
    id: 'modals-ability-permission', unit: 'verbs', order: 1,
    title: 'Động từ khuyết thiếu: khả năng & sự cho phép', en: 'Modals of Ability & Permission', level: 'A2', emoji: '💪',
    summary: 'Dùng can, could, be able to và may để nói về khả năng (hiện tại, quá khứ, tương lai) và để xin hoặc cho phép một cách lịch sự.',
    blocks: [
      { type: 'scale', caption: 'Mức độ trang trọng khi xin phép (0 = thân mật, 100 = rất trang trọng)', items: [ { t: 'Can I…?', v: 25 }, { t: 'Could I…?', v: 55 }, { t: 'May I…?', v: 80 }, { t: 'Might I…?', v: 95 } ] },
      { type: 'formula', rows: [
        { label: 'Khả năng hiện tại', parts: [ { t: 'S', c: 'subj' }, { t: 'can / can\'t', c: 'aux' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: 'Many teenagers can code basic websites.' },
        { label: 'Khả năng chung trong quá khứ', parts: [ { t: 'S', c: 'subj' }, { t: 'could', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'My grandmother could speak three languages.' },
        { label: 'Làm được một việc cụ thể', parts: [ { t: 'S', c: 'subj' }, { t: 'was/were able to', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'Despite the storm, the team was able to finish the survey.' },
        { label: 'Xin phép', parts: [ { t: 'Can/Could/May', c: 'aux' }, { t: 'I', c: 'subj' }, { t: 'V', c: 'verb' }, { t: '…?', c: 'obj' } ], ex: 'May I borrow your notes for the lecture?' }
      ] },
      { type: 'uses', items: [
        { title: 'Khả năng ở hiện tại', ex: 'Solar panels can now generate power even on cloudy days.', vi: 'Pin mặt trời giờ có thể tạo ra điện ngay cả vào những ngày nhiều mây.' },
        { title: 'Khả năng chung trong quá khứ (could)', ex: 'In the 1990s, few people could afford a mobile phone.', vi: 'Vào những năm 1990, rất ít người có đủ tiền mua điện thoại di động.' },
        { title: 'Thành công trong một tình huống cụ thể (was able to / managed to)', ex: 'After three attempts, she was able to get a band 7.5.', vi: 'Sau ba lần thi, cô ấy đã đạt được band 7.5.' },
        { title: 'Khả năng ở tương lai / hoàn thành (dùng be able to)', ex: 'By 2030, most cities will be able to recycle 60% of their waste.', vi: 'Đến năm 2030, hầu hết các thành phố sẽ có thể tái chế 60% rác thải.' },
        { title: 'Xin phép và cho phép', ex: 'Students may use a dictionary during the first part of the test.', vi: 'Thí sinh được phép dùng từ điển trong phần đầu của bài thi.' }
      ] },
      { type: 'table', head: ['Thời điểm', 'Khả năng', 'Phủ định'], rows: [
        ['Hiện tại', 'can / am able to', 'can\'t / cannot'],
        ['Quá khứ (chung)', 'could / was able to', 'couldn\'t'],
        ['Quá khứ (một lần cụ thể)', 'was able to / managed to', 'couldn\'t / wasn\'t able to'],
        ['Tương lai', 'will be able to', 'won\'t be able to'],
        ['Hiện tại hoàn thành', 'have been able to', 'haven\'t been able to']
      ] },
      { type: 'tip', text: 'Can không có dạng nguyên mẫu hay V3, nên sau will, have, might… phải dùng be able to: will be able to, have been able to, might be able to.' },
      { type: 'tip', text: 'Ở dạng phủ định, couldn\'t dùng được cho cả khả năng chung lẫn một lần cụ thể: I couldn\'t open the file yesterday.' },
      { type: 'mistake', wrong: 'I will can attend the seminar next week.', right: 'I will be able to attend the seminar next week.', why: 'Không dùng hai động từ khuyết thiếu liền nhau; thay can bằng be able to.' },
      { type: 'mistake', wrong: 'The firefighters could rescue everyone yesterday.', right: 'The firefighters were able to rescue everyone yesterday.', why: 'Với một thành công cụ thể trong quá khứ, dùng was/were able to hoặc managed to, không dùng could.' },
      { type: 'mistake', wrong: 'She can to play the violin.', right: 'She can play the violin.', why: 'Sau động từ khuyết thiếu là động từ nguyên mẫu không to.' },
      { type: 'ielts', text: 'Trong Writing Task 2, dùng can/could để đưa ra khả năng một cách thận trọng (hedging) thay vì khẳng định tuyệt đối. Trong Speaking Part 1, kết hợp used to be able to để so sánh quá khứ với hiện tại.', ex: 'Online courses can give people in rural areas access to high-quality education.' }
    ],
    quiz: [
      { q: 'Last night the internet went down, but luckily I ___ submit my essay before midnight.', options: ['could', 'was able to', 'can', 'am able to'], answer: 1, explain: 'Một thành công cụ thể trong quá khứ → was able to. could chỉ khả năng chung, không dùng cho một thành công cụ thể; can và am able to là hiện tại.' },
      { q: 'When I was five, I ___ read simple stories.', options: ['could', 'can', 'will be able to', 'may'], answer: 0, explain: 'Khả năng chung trong quá khứ → could. can là hiện tại; will be able to là tương lai; may diễn tả sự cho phép/khả năng xảy ra, không phải năng lực.' },
      { q: 'If you practise every day, you ___ speak more fluently in a few months.', options: ['will can', 'are able', 'will be able to', 'were able to'], answer: 2, explain: 'Khả năng ở tương lai (in a few months) → will be able to. "will can" sai vì hai động từ khuyết thiếu không đứng liền nhau; "are able" thiếu to; were able to là quá khứ.' },
      { q: '___ I leave the room for a moment, please? (rất lịch sự với giám khảo)', options: ['May', 'Must', 'Will', 'Should'], answer: 0, explain: 'May I…? là cách xin phép trang trọng, lịch sự nhất. Must I…? hỏi về nghĩa vụ; Will I…? hỏi về tương lai; Should I…? xin lời khuyên.' },
      { q: 'Since she moved to London, she ___ improve her listening skills a lot.', options: ['can', 'could', 'has been able to', 'is able'], answer: 2, explain: 'Thì hiện tại hoàn thành (since…) → has been able to. can và could không dùng với since; "is able" thiếu to và sai thì.' },
      { q: 'Câu nào ĐÚNG?', options: ['He musts can swim.', 'He might be able to help us.', 'He can to drive.', 'He will can come.'], answer: 1, explain: 'Sau might phải dùng be able to; các câu còn lại sai cấu trúc. "musts can", "can to drive", "will can" đều sai vì hai động từ khuyết thiếu không đứng liền nhau hoặc thừa to/-s.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She can to speak three languages.', 'She cans speak three languages.', 'She can speak three languages.', 'She can speaking three languages.'], answer: 2, explain: 'can + V nguyên mẫu không có to và không thêm -s → She can speak. "can to speak", "cans", "can speaking" đều sai cấu trúc động từ khuyết thiếu.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I will can drive next year.', 'I will be able to drive next year.', 'I will able to drive next year.', 'I can be able drive next year.'], answer: 1, explain: 'Hai động từ khuyết thiếu không đứng liền nhau (will can sai) → dùng will be able to + V. "will able to" thiếu be; "can be able" sai cấu trúc.' },
      { q: 'Phần nào sai? Despite the storm, the pilot (A) could (B) land the plane (C) safely (D) last night.', options: ['(A) could', '(B) land', '(C) safely', '(D) last night'], answer: 0, explain: 'Thành công trong một tình huống cụ thể ở quá khứ dùng was able to / managed to, không dùng could.' },
      { q: 'Phần nào sai? Visitors (A) may (B) to use the library, (C) but they cannot (D) borrow books.', options: ['(A) may', '(B) to use', '(C) but', '(D) borrow'], answer: 1, explain: 'Sau may dùng V nguyên mẫu không to → sửa to use thành use. may, but và borrow đều đúng.' },
      { q: 'Speaking (lời xin phép): "___ I borrow your pen for a moment?" – "Of course, here you are."', options: ['Must', 'Should', 'Am', 'Could'], answer: 3, explain: 'Xin phép lịch sự dùng Could/May I + V → Could I borrow…? Must hỏi nghĩa vụ; Should hỏi lời khuyên; "Am I borrow" sai cấu trúc.' },
      { q: 'Task 2: Thanks to online learning, students in remote areas ___ access high-quality courses.', options: ['can', 'can to', 'are able', 'could to'], answer: 0, explain: 'Diễn tả khả năng: can + V nguyên mẫu (are able cần thêm to). "can to" thừa to; "are able" thiếu to; "could to" thừa to.' }
    ]
  });

  /* 2. Modals of obligation & advice */
  G.push({
    id: 'modals-obligation-advice', unit: 'verbs', order: 2,
    title: 'Động từ khuyết thiếu: bắt buộc & lời khuyên', en: 'Modals of Obligation & Advice', level: 'B1', emoji: '📏',
    summary: 'Phân biệt must, have to, should, ought to và need để diễn tả nghĩa vụ, sự cần thiết, điều cấm và lời khuyên.',
    blocks: [
      { type: 'scale', caption: 'Độ mạnh của nghĩa vụ (0 = chỉ là gợi ý, 100 = bắt buộc tuyệt đối)', items: [ { t: 'must / have to', v: 95 }, { t: 'need to', v: 75 }, { t: 'had better', v: 65 }, { t: 'should / ought to', v: 50 }, { t: 'could (gợi ý)', v: 20 } ] },
      { type: 'formula', rows: [
        { label: 'Bắt buộc', parts: [ { t: 'S', c: 'subj' }, { t: 'must / have to', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'All applicants must submit their passports.' },
        { label: 'Cấm', parts: [ { t: 'S', c: 'subj' }, { t: 'mustn\'t', c: 'neg' }, { t: 'V', c: 'verb' } ], ex: 'You mustn\'t use your phone in the exam room.' },
        { label: 'Không cần thiết', parts: [ { t: 'S', c: 'subj' }, { t: 'don\'t have to / needn\'t', c: 'neg' }, { t: 'V', c: 'verb' } ], ex: 'You don\'t have to bring a pencil; we provide one.' },
        { label: 'Lời khuyên', parts: [ { t: 'S', c: 'subj' }, { t: 'should / ought to', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'Governments should invest more in public transport.' },
        { label: 'Lời khuyên muộn (quá khứ)', parts: [ { t: 'S', c: 'subj' }, { t: 'should have', c: 'aux' }, { t: 'V3', c: 'verb' } ], ex: 'I should have read the instructions more carefully.' }
      ] },
      { type: 'uses', items: [
        { title: 'Must: nghĩa vụ do người nói đặt ra / quy định viết', ex: 'I must remember to book the speaking test this week.', vi: 'Tôi phải nhớ đăng ký thi nói trong tuần này.' },
        { title: 'Have to: nghĩa vụ từ bên ngoài (luật, nội quy, hoàn cảnh)', ex: 'Nurses often have to work night shifts.', vi: 'Y tá thường phải làm ca đêm.' },
        { title: 'Mustn\'t ≠ don\'t have to', ex: 'You mustn\'t cheat, but you don\'t have to answer the questions in order.', vi: 'Bạn không được gian lận, nhưng bạn không bắt buộc phải trả lời câu hỏi theo thứ tự.' },
        { title: 'Should / ought to: lời khuyên, ý kiến', ex: 'Parents ought to limit the time children spend on screens.', vi: 'Cha mẹ nên hạn chế thời gian trẻ em dùng màn hình.' },
        { title: 'Needn\'t have V3 ≠ didn\'t need to V', ex: 'We needn\'t have hurried – the lecture started late.', vi: 'Lẽ ra chúng tôi không cần vội – buổi giảng bắt đầu muộn (nhưng đã vội rồi).' }
      ] },
      { type: 'table', head: ['Ý nghĩa', 'Hiện tại', 'Quá khứ'], rows: [
        ['Bắt buộc', 'must / have to', 'had to'],
        ['Không cần thiết', 'don\'t have to / needn\'t', 'didn\'t have to / didn\'t need to'],
        ['Cấm', 'mustn\'t / can\'t', 'wasn\'t allowed to / couldn\'t'],
        ['Lời khuyên', 'should / ought to', 'should have V3 (hối tiếc, phê bình)'],
        ['Cảnh báo mạnh', 'had better (not)', '—']
      ] },
      { type: 'tip', text: 'Must không có dạng quá khứ để chỉ nghĩa vụ. Muốn nói "đã phải" thì dùng had to: Yesterday I had to queue for an hour.' },
      { type: 'tip', text: 'Had better mạnh hơn should và hàm ý hậu quả xấu nếu không làm: You\'d better leave now or you\'ll miss the train.' },
      { type: 'mistake', wrong: 'You mustn\'t bring food; the canteen is open. (ý: không cần mang)', right: 'You don\'t have to bring food; the canteen is open.', why: 'Mustn\'t = cấm; "không cần" phải dùng don\'t have to hoặc needn\'t. Người Việt hay dịch "không phải" thành mustn\'t.' },
      { type: 'mistake', wrong: 'Yesterday I must finish my assignment.', right: 'Yesterday I had to finish my assignment.', why: 'Nghĩa vụ trong quá khứ dùng had to.' },
      { type: 'mistake', wrong: 'Students should to wear uniforms.', right: 'Students should wear uniforms.', why: 'Should đi với V nguyên mẫu không to (chỉ ought to và have to mới có to).' },
      { type: 'ielts', text: 'Writing Task 2 dạng "Should…?" hoặc đưa giải pháp: dùng should / ought to / need to để đề xuất; dùng must cho điều bạn cho là bắt buộc. Tránh lặp lại should – xen kẽ it is essential that…, it is vital to….', ex: 'Local authorities need to provide safer cycling routes, and drivers ought to be more aware of cyclists.' }
    ],
    quiz: [
      { q: 'In many countries, drivers ___ wear a seatbelt by law.', options: ['have to', 'should', 'needn\'t', 'could'], answer: 0, explain: 'Nghĩa vụ do luật pháp (yếu tố bên ngoài) → have to. should chỉ là lời khuyên; needn\'t = không cần; could chỉ khả năng.' },
      { q: 'You ___ smoke inside the hospital. It\'s strictly forbidden.', options: ['don\'t have to', 'mustn\'t', 'needn\'t', 'ought to'], answer: 1, explain: 'Bị cấm (strictly forbidden) → mustn\'t. don\'t have to và needn\'t nghĩa là không cần thiết (không phải cấm); ought to là lời khuyên nên làm.' },
      { q: 'It\'s a free event, so you ___ buy a ticket.', options: ['mustn\'t', 'have to', 'don\'t have to', 'must'], answer: 2, explain: 'Sự kiện miễn phí nên không cần mua vé → don\'t have to. mustn\'t là cấm (sai nghĩa); have to và must là bắt buộc phải mua.' },
      { q: 'I failed the test. I ___ more vocabulary.', options: ['should learn', 'should have learnt', 'must learn', 'had to learn'], answer: 1, explain: 'Hối tiếc về việc lẽ ra nên làm trong quá khứ → should have + V3. should learn và must learn nói về hiện tại/tương lai; had to learn là đã bắt buộc phải học, không diễn tả hối tiếc.' },
      { q: 'Last year, all staff ___ attend a safety course.', options: ['must', 'had to', 'have to', 'should'], answer: 1, explain: 'Nghĩa vụ trong quá khứ (Last year) → had to. must và have to là hiện tại; should chỉ lời khuyên, không phải nghĩa vụ.' },
      { q: 'We ___ have taken a taxi – the station was only five minutes away.', options: ['mustn\'t', 'needn\'t', 'shouldn\'t to', 'didn\'t need'], answer: 1, explain: 'needn\'t have + V3: đã làm nhưng hóa ra không cần (ga chỉ cách 5 phút) → needn\'t have taken. mustn\'t là cấm; "shouldn\'t to" sai cấu trúc; "didn\'t need" phải đi với to V (didn\'t need to take).' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['You mustn\'t to pay; the museum is free.', 'You don\'t must pay; the museum is free.', 'You haven\'t to paying; the museum is free.', 'You don\'t have to pay; the museum is free.'], answer: 3, explain: 'Không cần thiết (miễn phí) dùng don\'t have to + V; mustn\'t là cấm. "mustn\'t to" thừa to (và mustn\'t là cấm); "don\'t must" sai cấu trúc; "haven\'t to paying" sai.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Students should to submit essays on time.', 'Students should submit essays on time.', 'Students should submitting essays on time.', 'Students shoulds submit essays on time.'], answer: 1, explain: 'should + V nguyên mẫu, không to, không thêm -s → should submit. "should to submit", "should submitting", "shoulds" đều sai.' },
      { q: 'Phần nào sai? Yesterday I (A) must (B) leave work early (C) because my son (D) was ill.', options: ['(A) must', '(B) leave', '(C) because', '(D) was'], answer: 0, explain: 'must không có dạng quá khứ → dùng had to: I had to leave. leave, because và was đều đúng.' },
      { q: 'Phần nào sai? In my opinion, the government (A) ought invest more (B) in (C) public transport (D) than in roads.', options: ['(A) ought invest', '(B) in', '(C) public', '(D) than'], answer: 0, explain: 'ought luôn đi với to → ought to invest, nên phần sai là (A). in, public transport và than (so sánh more… than) đều đúng.' },
      { q: 'Task 2: To reduce pollution, factories ___ meet strict environmental standards by law.', options: ['should to', 'has to', 'must', 'mustn\'t'], answer: 2, explain: 'Bắt buộc theo luật dùng must + V nguyên mẫu (factories số nhiều nên không dùng has to). "should to" thừa to; has to sai hòa hợp với factories; mustn\'t là cấm, sai nghĩa.' },
      { q: 'Speaking Part 1: "Do you wear a uniform at work?" – "No, we ___ – we can wear whatever we like."', options: ['mustn\'t', 'don\'t have to', 'shouldn\'t', 'haven\'t to'], answer: 1, explain: 'Không bắt buộc dùng don\'t have to; mustn\'t nghĩa là bị cấm. mustn\'t là bị cấm (sai nghĩa); shouldn\'t là lời khuyên; "haven\'t to" sai cấu trúc.' }
    ]
  });

  /* 3. Modals of possibility & deduction */
  G.push({
    id: 'modals-deduction', unit: 'verbs', order: 3,
    title: 'Động từ khuyết thiếu: khả năng xảy ra & suy đoán', en: 'Modals of Possibility & Deduction', level: 'B2', emoji: '🔍',
    summary: 'Dùng must, may, might, could, can\'t (+ have V3) để suy luận mức độ chắc chắn về hiện tại và quá khứ.',
    blocks: [
      { type: 'scale', caption: 'Mức độ chắc chắn của người nói (%)', items: [ { t: 'must (chắc chắn đúng)', v: 95 }, { t: 'should / will probably', v: 75 }, { t: 'may', v: 50 }, { t: 'might / could', v: 35 }, { t: 'can\'t / couldn\'t', v: 3 } ] },
      { type: 'formula', rows: [
        { label: 'Suy đoán hiện tại', parts: [ { t: 'S', c: 'subj' }, { t: 'must/may/might/can\'t', c: 'aux' }, { t: 'V / be V-ing', c: 'verb' } ], ex: 'The lights are off – they must be asleep.' },
        { label: 'Suy đoán quá khứ', parts: [ { t: 'S', c: 'subj' }, { t: 'must/might/can\'t', c: 'aux' }, { t: 'have', c: 'aux' }, { t: 'V3', c: 'verb' } ], ex: 'She can\'t have seen the email; she was on a flight.' },
        { label: 'Phủ định không chắc', parts: [ { t: 'S', c: 'subj' }, { t: 'may not / might not', c: 'neg' }, { t: 'V', c: 'verb' } ], ex: 'The results might not be reliable.' }
      ] },
      { type: 'uses', items: [
        { title: 'Must: kết luận gần như chắc chắn dựa trên bằng chứng', ex: 'He has lived in Tokyo for ten years, so he must speak Japanese.', vi: 'Anh ấy sống ở Tokyo mười năm rồi nên chắc chắn nói được tiếng Nhật.' },
        { title: 'Can\'t: gần như chắc chắn là không', ex: 'That can\'t be the right answer – it\'s far too high.', vi: 'Đó không thể là đáp án đúng – nó cao quá.' },
        { title: 'May / might / could: có thể (không chắc)', ex: 'Rising temperatures could lead to more frequent floods.', vi: 'Nhiệt độ tăng có thể dẫn đến lũ lụt thường xuyên hơn.' },
        { title: 'Must have V3: chắc hẳn đã', ex: 'The road is wet. It must have rained overnight.', vi: 'Đường ướt. Chắc hẳn đêm qua trời đã mưa.' },
        { title: 'Might have / could have V3: có lẽ đã (hoặc suýt nữa)', ex: 'The ancient city might have been destroyed by an earthquake.', vi: 'Thành cổ có lẽ đã bị phá hủy bởi một trận động đất.' }
      ] },
      { type: 'table', head: ['Mức độ', 'Hiện tại', 'Quá khứ'], rows: [
        ['Chắc chắn có', 'must + V', 'must have + V3'],
        ['Có thể', 'may / might / could + V', 'may / might / could have + V3'],
        ['Có thể không', 'may not / might not + V', 'may not / might not have + V3'],
        ['Chắc chắn không', 'can\'t / couldn\'t + V', 'can\'t / couldn\'t have + V3']
      ] },
      { type: 'tip', text: 'Phủ định của must (suy đoán) KHÔNG phải mustn\'t mà là can\'t. Mustn\'t chỉ mang nghĩa cấm.' },
      { type: 'tip', text: 'Could have V3 còn có nghĩa "lẽ ra đã có thể" (nhưng không làm): You could have asked me for help.' },
      { type: 'mistake', wrong: 'He mustn\'t be at home – his car isn\'t there.', right: 'He can\'t be at home – his car isn\'t there.', why: 'Suy đoán phủ định dùng can\'t; mustn\'t là cấm đoán.' },
      { type: 'mistake', wrong: 'She must forget the meeting yesterday.', right: 'She must have forgotten the meeting yesterday.', why: 'Suy đoán về quá khứ phải dùng modal + have + V3.' },
      { type: 'mistake', wrong: 'Maybe the data might be wrong.', right: 'The data might be wrong. / Maybe the data is wrong.', why: 'Maybe và might cùng nghĩa; dùng cả hai là thừa – lỗi rất hay gặp do dịch "có lẽ có thể".' },
      { type: 'ielts', text: 'Writing Task 1 và Task 2: dùng may/might/could để hedging khi đưa ra nguyên nhân hoặc dự đoán, tránh khẳng định quá mức. Speaking Part 2/3: dùng must have/might have khi suy đoán về lý do trong quá khứ.', ex: 'The sharp drop in visitor numbers in 2020 must have been caused by travel restrictions.' }
    ],
    quiz: [
      { q: 'She\'s been studying all night. She ___ be exhausted.', options: ['must', 'can\'t', 'mustn\'t', 'needn\'t'], answer: 0, explain: 'Suy luận chắc chắn dựa trên bằng chứng (học cả đêm) → must be exhausted. can\'t là chắc chắn không; mustn\'t là cấm; needn\'t là không cần.' },
      { q: 'That ___ be Tom; he\'s in Australia this month.', options: ['must', 'might', 'can\'t', 'should'], answer: 2, explain: 'Tom đang ở Úc nên chắc chắn không phải anh ấy → can\'t. must là chắc chắn có; might là có thể; should là nên/dự đoán, đều mâu thuẫn với bằng chứng.' },
      { q: 'I can\'t find my keys. I ___ them at the library.', options: ['might leave', 'might have left', 'must leave', 'can\'t have leave'], answer: 1, explain: 'Phỏng đoán về quá khứ (có thể đã để quên) → might have + V3 → might have left. might leave và must leave nói về hiện tại/tương lai; "can\'t have leave" sai dạng V3 và sai nghĩa.' },
      { q: 'The museum looks completely different now. It ___ have been renovated.', options: ['must', 'can\'t', 'mustn\'t', 'should'], answer: 0, explain: 'Kết luận chắc chắn về quá khứ (bảo tàng trông khác hẳn → chắc đã được sửa) → must have been renovated. can\'t have là chắc chắn không; mustn\'t là cấm; should have là lẽ ra nên.' },
      { q: 'He ___ have written this essay alone – it\'s full of advanced vocabulary he never uses.', options: ['must', 'might', 'can\'t', 'should'], answer: 2, explain: 'Bằng chứng cho thấy gần như chắc chắn không phải tự viết → can\'t have written. must have và might have mâu thuẫn với bằng chứng; should have là lẽ ra nên.' },
      { q: 'Electric cars ___ become cheaper than petrol cars in the next decade. (không chắc)', options: ['must', 'could', 'can\'t', 'mustn\'t'], answer: 1, explain: 'Khả năng không chắc chắn trong tương lai → could/might/may. must là chắc chắn có; can\'t là chắc chắn không; mustn\'t là cấm – đều mâu thuẫn với "không chắc".' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She must be tired after such a long flight.', 'She must to be tired after such a long flight.', 'She musts be tired after such a long flight.', 'She must being tired after such a long flight.'], answer: 0, explain: 'Suy đoán chắc chắn ở hiện tại: must + be + tính từ → must be tired. "must to be", "musts", "must being" đều sai cấu trúc động từ khuyết thiếu.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['He can\'t have went home already.', 'He can\'t have gone home already.', 'He mustn\'t have gone home already.', 'He can\'t has gone home already.'], answer: 1, explain: 'Suy đoán phủ định về quá khứ: can\'t have + V3 (gone); không dùng mustn\'t để suy đoán. "have went" sai V3; mustn\'t không dùng để suy đoán; "can\'t has" sai dạng sau động từ khuyết thiếu.' },
      { q: 'Phần nào sai? The lights are off, so they (A) mustn\'t (B) be (C) at home (D) right now.', options: ['(A) mustn\'t', '(B) be', '(C) at home', '(D) right now'], answer: 0, explain: 'Suy đoán chắc chắn là không dùng can\'t, không dùng mustn\'t → sửa thành can\'t be. be, at home và right now đều đúng.' },
      { q: 'Phần nào sai? Linh didn\'t answer the phone; she (A) might (B) have (C) fell asleep (D) early.', options: ['(A) might', '(B) have', '(C) fell', '(D) early'], answer: 2, explain: 'might have + V3 → fallen, nên phần sai là (C) fell. might, have và early đều đúng.' },
      { q: 'Task 2: The decline in bee populations ___ be caused by pesticides, although scientists are not yet certain.', options: ['must', 'can\'t', 'may', 'should to'], answer: 2, explain: 'Chưa chắc chắn (not yet certain) → dùng may để diễn tả khả năng. must và can\'t diễn tả sự chắc chắn, mâu thuẫn với "not yet certain"; "should to" thừa to.' },
      { q: 'Speaking Part 3: "Why do you think the old cinema closed?" – "I\'m not sure. It ___ lost customers to streaming services."', options: ['must', 'can\'t have', 'might has', 'might have'], answer: 3, explain: 'Suy đoán không chắc chắn về quá khứ (I\'m not sure) → might have + V3. must là chắc chắn; "can\'t have" là chắc chắn không; "might has" sai dạng.' }
    ]
  });

  /* 4. Passive voice */
  G.push({
    id: 'passive-voice', unit: 'verbs', order: 4,
    title: 'Câu bị động', en: 'Passive Voice', level: 'B1', emoji: '🔄',
    summary: 'Câu bị động (be + V3) đưa đối tượng chịu tác động lên làm chủ ngữ, rất phổ biến trong văn viết học thuật và IELTS Writing.',
    blocks: [
      { type: 'diagram', caption: 'Biến đổi từ chủ động sang bị động', steps: [
        { t: 'Engineers built the bridge in 2015.', c: 'active' },
        { t: '↓ tân ngữ (the bridge) lên làm chủ ngữ', c: 'arrow' },
        { t: '↓ động từ → be (chia theo thì gốc) + V3', c: 'arrow' },
        { t: 'The bridge was built (by engineers) in 2015.', c: 'passive' },
        { t: 'by + tác nhân thường bị lược bỏ nếu không quan trọng', c: 'note' }
      ] },
      { type: 'formula', rows: [
        { label: 'Bị động', parts: [ { t: 'S', c: 'subj' }, { t: 'be', c: 'aux' }, { t: 'V3/V-ed', c: 'verb' }, { t: '(by O)', c: 'obj' } ], ex: 'The report was published in 2023.' },
        { label: 'Với modal', parts: [ { t: 'S', c: 'subj' }, { t: 'modal + be', c: 'aux' }, { t: 'V3', c: 'verb' } ], ex: 'Plastic bags should be banned.' },
        { label: 'Phủ định', parts: [ { t: 'S', c: 'subj' }, { t: 'be + not', c: 'neg' }, { t: 'V3', c: 'verb' } ], ex: 'The data was not collected properly.' }
      ] },
      { type: 'uses', items: [
        { title: 'Tác nhân không rõ, không quan trọng hoặc hiển nhiên', ex: 'Thousands of trees are cut down every day.', vi: 'Hàng nghìn cây bị chặt hạ mỗi ngày.' },
        { title: 'Nhấn mạnh hành động/kết quả hơn người làm', ex: 'A new vaccine has been developed.', vi: 'Một loại vắc-xin mới đã được phát triển.' },
        { title: 'Mô tả quy trình (IELTS Task 1 – process)', ex: 'The clay is shaped, and then it is fired in a kiln.', vi: 'Đất sét được tạo hình, sau đó được nung trong lò.' },
        { title: 'Văn phong khách quan, trang trọng', ex: 'It has been argued that tourism damages local cultures.', vi: 'Người ta lập luận rằng du lịch gây tổn hại cho văn hóa địa phương.' },
        { title: 'Giữ chủ đề nhất quán trong đoạn văn', ex: 'The Eiffel Tower is in Paris. It was completed in 1889.', vi: 'Tháp Eiffel nằm ở Paris. Nó được hoàn thành năm 1889.' }
      ] },
      { type: 'table', head: ['Thì', 'Chủ động', 'Bị động'], rows: [
        ['Hiện tại đơn', 'They make cars here.', 'Cars are made here.'],
        ['Hiện tại tiếp diễn', 'They are building a dam.', 'A dam is being built.'],
        ['Hiện tại hoàn thành', 'They have closed the factory.', 'The factory has been closed.'],
        ['Quá khứ đơn', 'They invented it in 1876.', 'It was invented in 1876.'],
        ['Quá khứ tiếp diễn', 'They were repairing the road.', 'The road was being repaired.'],
        ['Quá khứ hoàn thành', 'They had sold all the tickets.', 'All the tickets had been sold.'],
        ['Tương lai đơn', 'They will announce the results.', 'The results will be announced.'],
        ['Modal', 'We must reduce emissions.', 'Emissions must be reduced.']
      ] },
      { type: 'tip', text: 'Chỉ ngoại động từ (có tân ngữ) mới chuyển được sang bị động. Các động từ như happen, occur, arrive, die, rise, fall không có dạng bị động.' },
      { type: 'tip', text: 'Chỉ giữ "by + tác nhân" khi nó mang thông tin mới hoặc quan trọng: The novel was written by a 17-year-old student.' },
      { type: 'mistake', wrong: 'The accident was happened at night.', right: 'The accident happened at night.', why: 'Happen là nội động từ, không có bị động. Người Việt hay thêm "bị/được" theo thói quen.' },
      { type: 'mistake', wrong: 'The houses are build of wood.', right: 'The houses are built of wood.', why: 'Sau be phải là V3 (built), không phải V nguyên mẫu.' },
      { type: 'mistake', wrong: 'Unemployment was risen sharply in 2010.', right: 'Unemployment rose sharply in 2010.', why: 'Rise là nội động từ; khi mô tả số liệu tăng/giảm dùng chủ động. (Raise mới là ngoại động từ.)' },
      { type: 'ielts', text: 'Task 1 dạng process / map gần như bắt buộc dùng bị động (is collected, was replaced, has been converted). Task 2 dùng bị động để khách quan hóa lập luận, nhưng đừng lạm dụng – xen kẽ với câu chủ động cho rõ nghĩa.', ex: 'Between 1995 and 2015, the old warehouses were demolished and a shopping centre was constructed.' }
    ],
    quiz: [
      { q: 'English ___ in many countries as an official language.', options: ['uses', 'is used', 'is using', 'used'], answer: 1, explain: 'Sự thật chung, chủ ngữ chịu tác động → hiện tại đơn bị động: is used. uses và is using là chủ động (ngôn ngữ không tự dùng); used thiếu is.' },
      { q: 'A new hospital ___ at the moment.', options: ['is built', 'is being built', 'has built', 'builds'], answer: 1, explain: 'At the moment → hiện tại tiếp diễn bị động: is being built. is built không diễn tả việc đang diễn ra; has built và builds là chủ động.' },
      { q: 'The results ___ next Monday.', options: ['will announce', 'will be announced', 'are announcing', 'announced'], answer: 1, explain: 'Kết quả được công bố (bị động) vào thứ Hai tới → will be + V3 → will be announced. will announce và are announcing là chủ động; announced là quá khứ.' },
      { q: 'Câu nào SAI?', options: ['The letter was sent yesterday.', 'The problem has been solved.', 'The earthquake was occurred in 2011.', 'Rice is grown in the Mekong Delta.'], answer: 2, explain: 'Occur là nội động từ, không có bị động → The earthquake occurred in 2011. Ba câu còn lại đều là bị động đúng cấu trúc với ngoại động từ send, solve, grow.' },
      { q: 'By the time we arrived, all the seats ___.', options: ['had taken', 'had been taken', 'were taking', 'have been taken'], answer: 1, explain: 'Hành động xảy ra trước một mốc quá khứ → quá khứ hoàn thành bị động. had taken là chủ động (ghế tự lấy); were taking là chủ động tiếp diễn; have been taken sai thì.' },
      { q: 'Carbon emissions must ___ significantly.', options: ['reduce', 'be reduced', 'reduced', 'being reduced'], answer: 1, explain: 'Bị động với động từ khuyết thiếu: modal + be + V3 → must be reduced (khí thải bị cắt giảm).' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['The bridge was build in 1990.', 'The bridge built in 1990.', 'The bridge was built in 1990.', 'The bridge is built in 1990 ago.'], answer: 2, explain: 'Bị động quá khứ đơn: was/were + V3 → was built. "was build" sai dạng V3; "built" thiếu be nên thành chủ động; "is built… ago" sai thì.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['A new hospital is building near my house.', 'A new hospital is been built near my house.', 'A new hospital being built near my house.', 'A new hospital is being built near my house.'], answer: 3, explain: 'Bị động hiện tại tiếp diễn: is/are being + V3 → is being built. "is building" là chủ động; "is been" sai; "being built" thiếu is.' },
      { q: 'Phần nào sai? The results (A) will (B) announce (C) on the website (D) next week.', options: ['(A) will', '(B) announce', '(C) on', '(D) next week'], answer: 1, explain: 'Kết quả được công bố → bị động tương lai: will be announced. will, on và next week đều đúng.' },
      { q: 'Phần nào sai? English (A) is (B) spoke (C) as a first language (D) in many countries.', options: ['(A) is', '(B) spoke', '(C) as', '(D) in'], answer: 1, explain: 'Bị động cần V3 → spoken, nên phần sai là (B) spoke. is, as a first language và in many countries đều đúng.' },
      { q: 'Task 1 (quy trình): After the beans are roasted, they ___ into a fine powder.', options: ['grind', 'are ground', 'are grinded', 'ground'], answer: 1, explain: 'Quy trình dùng bị động hiện tại đơn; grind là bất quy tắc: ground. grind là chủ động; "are grinded" sai dạng V3; ground thiếu are.' },
      { q: 'Task 2: In recent years, many traditional shops ___ by large supermarket chains.', options: ['have been replaced', 'have replaced', 'were replace', 'has been replaced'], answer: 0, explain: 'In recent years + chủ ngữ số nhiều bị tác động → bị động hiện tại hoàn thành: have been replaced.' }
    ]
  });

  /* 5. Passive reporting & causative */
  G.push({
    id: 'passive-reporting-causative', unit: 'verbs', order: 5,
    title: 'Bị động tường thuật & thể sai khiến', en: 'Passive Reporting & Causative', level: 'B2', emoji: '📰',
    summary: 'Dùng It is said that… / S is believed to… để nêu ý kiến chung một cách khách quan, và have/get something done để nói việc được người khác làm cho mình.',
    blocks: [
      { type: 'diagram', caption: 'Hai cách viết bị động với động từ tường thuật', steps: [
        { t: 'People believe that coffee improves concentration.', c: 'active' },
        { t: '↓ Cách 1: It + be + V3 + that…', c: 'arrow' },
        { t: 'It is believed that coffee improves concentration.', c: 'passive' },
        { t: '↓ Cách 2: chủ ngữ mệnh đề sau + be + V3 + to V', c: 'arrow' },
        { t: 'Coffee is believed to improve concentration.', c: 'passive' },
        { t: 'Sự việc xảy ra trước → to have V3: He is said to have left the country.', c: 'note' }
      ] },
      { type: 'formula', rows: [
        { label: 'Cách 1', parts: [ { t: 'It', c: 'subj' }, { t: 'is/was', c: 'aux' }, { t: 'said/thought/reported', c: 'verb' }, { t: 'that + mệnh đề', c: 'obj' } ], ex: 'It is reported that the company will cut 500 jobs.' },
        { label: 'Cách 2 (cùng thời)', parts: [ { t: 'S', c: 'subj' }, { t: 'is/was', c: 'aux' }, { t: 'said/believed', c: 'verb' }, { t: 'to V', c: 'obj' } ], ex: 'The painting is thought to be worth millions.' },
        { label: 'Cách 2 (xảy ra trước)', parts: [ { t: 'S', c: 'subj' }, { t: 'is/was', c: 'aux' }, { t: 'said/believed', c: 'verb' }, { t: 'to have V3', c: 'obj' } ], ex: 'The temple is believed to have been built in the 11th century.' },
        { label: 'Thể sai khiến', parts: [ { t: 'S', c: 'subj' }, { t: 'have/get', c: 'aux' }, { t: 'something', c: 'obj' }, { t: 'V3', c: 'verb' } ], ex: 'I had my eyes tested last week.' }
      ] },
      { type: 'uses', items: [
        { title: 'Trình bày quan điểm phổ biến mà không nêu nguồn cụ thể', ex: 'It is widely accepted that exercise reduces stress.', vi: 'Mọi người đều thừa nhận rằng tập thể dục giúp giảm căng thẳng.' },
        { title: 'Tin tức, báo cáo chưa được xác nhận', ex: 'The suspect is reported to have fled abroad.', vi: 'Nghi phạm được cho là đã trốn ra nước ngoài.' },
        { title: 'Have something done: thuê/nhờ người khác làm', ex: 'We are having our flat redecorated.', vi: 'Chúng tôi đang thuê người sửa sang lại căn hộ.' },
        { title: 'Get something done: thân mật hơn, đôi khi hàm ý nỗ lực', ex: 'I finally got my visa approved.', vi: 'Cuối cùng tôi cũng được duyệt visa.' },
        { title: 'Have something done: chuyện không may xảy ra với mình', ex: 'She had her wallet stolen on the bus.', vi: 'Cô ấy bị lấy cắp ví trên xe buýt.' }
      ] },
      { type: 'table', head: ['Chủ động', 'It + bị động', 'S + bị động + to V'], rows: [
        ['People say he is rich.', 'It is said that he is rich.', 'He is said to be rich.'],
        ['Experts think the virus came from bats.', 'It is thought that the virus came from bats.', 'The virus is thought to have come from bats.'],
        ['Police believed she was lying.', 'It was believed that she was lying.', 'She was believed to be lying.'],
        ['They expect prices to rise.', 'It is expected that prices will rise.', 'Prices are expected to rise.']
      ] },
      { type: 'tip', text: 'Các động từ hay dùng: say, think, believe, know, report, expect, consider, estimate, claim, allege. Với estimate thường dùng cách 1: It is estimated that 40% of…' },
      { type: 'tip', text: 'Thể sai khiến chủ động: have somebody do something (I had the technician check my laptop) / get somebody to do something (I got my brother to fix it).' },
      { type: 'mistake', wrong: 'I cut my hair yesterday. (ý: đi cắt ở tiệm)', right: 'I had my hair cut yesterday.', why: 'Khi người khác làm cho bạn, dùng have/get + O + V3. "I cut my hair" nghĩa là tự cắt.' },
      { type: 'mistake', wrong: 'He is said that he is a genius.', right: 'It is said that he is a genius. / He is said to be a genius.', why: 'Không trộn hai cấu trúc: hoặc It … that, hoặc S … to V.' },
      { type: 'mistake', wrong: 'The castle is believed to built in 1200.', right: 'The castle is believed to have been built in 1200.', why: 'Sự việc ở quá khứ và lâu đài bị xây → to have been V3.' },
      { type: 'ielts', text: 'Task 2: It is often argued / It is widely believed that… là cách mở bài và nêu quan điểm đối lập rất tự nhiên. Speaking Part 3: dùng is thought to / is said to để nói về xu hướng chung mà không cần dẫn nguồn.', ex: 'It is commonly claimed that social media isolates young people, yet it is also known to help them find supportive communities.' }
    ],
    quiz: [
      { q: '___ that the new policy will reduce traffic congestion.', options: ['It is expected', 'It expects', 'They are expected', 'Is expected'], answer: 0, explain: 'Bị động tường thuật: It + is + V3 + that + mệnh đề → It is expected that… "It expects" là chủ động, sai nghĩa; "They are expected" phải đi với to V; "Is expected" thiếu chủ ngữ It.' },
      { q: 'The Great Wall is said ___ visible from space, but this is a myth.', options: ['being', 'to be', 'that it is', 'be'], answer: 1, explain: 'S + be said + to V (cùng thời điểm hiện tại) → is said to be visible. Sau said không dùng being hay be; "that it is" phải đi với It is said that…' },
      { q: 'The pyramid is thought ___ over 4,000 years ago.', options: ['to build', 'to be built', 'to have been built', 'having built'], answer: 2, explain: 'Việc xây kim tự tháp xảy ra trong quá khứ và ở dạng bị động → to have been + V3. "to build" và "having built" là chủ động; "to be built" chỉ cùng thời điểm, không phải quá khứ.' },
      { q: 'I need to ___ before the trip.', options: ['have my car serviced', 'have serviced my car', 'have my car service', 'get serviced my car'], answer: 0, explain: 'Thể nhờ bảo: have + tân ngữ (vật) + V3 (nhờ người khác làm) → have my car serviced. "have serviced my car" là tự làm (chủ động); "have my car service" thiếu V3; "get serviced my car" sai trật tự.' },
      { q: 'She ___ her phone stolen at the airport.', options: ['got', 'made', 'let', 'was'], answer: 0, explain: 'Get/have + O + V3 cũng diễn tả việc không may xảy ra với mình. made và let cần V nguyên mẫu (make sb do); "was her phone stolen" sai cấu trúc.' },
      { q: 'Chọn câu ĐÚNG.', options: ['He is known that he is honest.', 'It is known to be honest.', 'He is known to be honest.', 'He knows to be honest.'], answer: 2, explain: 'S + is known + to V → He is known to be honest. "He is known that…" sai cấu trúc; "It is known to be honest" sai chủ ngữ; "He knows to be" là chủ động, sai nghĩa.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['It said that the castle is haunted.', 'It is said that the castle is haunted.', 'It is saying that the castle is haunted.', 'It is said the castle to be haunted.'], answer: 1, explain: 'Bị động tường thuật: It is said that + mệnh đề. "It said" là chủ động; "It is saying" sai thì; "It is said the castle to be" trộn hai cấu trúc.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I had my hair cutting yesterday.', 'I had cut my hair by a hairdresser yesterday.', 'I had my hair cut yesterday.', 'I had my hair to cut yesterday.'], answer: 2, explain: 'Thể nhờ bảo: have + vật + V3 → I had my hair cut. "hair cutting", "hair to cut" sai dạng; "had cut my hair by…" là quá khứ hoàn thành chủ động, sai nghĩa.' },
      { q: 'Phần nào sai? The suspect (A) is believed (B) to (C) leave the country (D) last week.', options: ['(A) is believed', '(B) to', '(C) leave', '(D) last week'], answer: 2, explain: 'Hành động xảy ra trước thời điểm tường thuật → to have + V3: to have left. is believed, to và last week đều đúng.' },
      { q: 'Phần nào sai? We (A) are going to (B) have our kitchen (C) redecorate (D) next month.', options: ['(A) are going to', '(B) have', '(C) redecorate', '(D) next month'], answer: 2, explain: 'have + vật + V3 → sửa redecorate thành redecorated. are going to, have và next month đều đúng.' },
      { q: 'Task 2: Coffee ___ to have originated in Ethiopia.', options: ['thinks', 'is thinking', 'is think', 'is thought'], answer: 3, explain: 'Bị động tường thuật: S + is thought + to have V3 → is thought to have originated. thinks và is thinking là chủ động; "is think" thiếu V3.' },
      { q: 'Speaking Part 1: "How often do you check your eyesight?" – "I ___ my eyes tested once a year."', options: ['get', 'make', 'do', 'am'], answer: 0, explain: 'Thể sai khiến: get + vật + V3 (get my eyes tested). make, do và am không tạo thể sai khiến với V3 theo cách này.' }
    ]
  });

  /* 6. Conditionals type 0 & 1 */
  G.push({
    id: 'conditionals-0-1', unit: 'verbs', order: 6,
    title: 'Câu điều kiện loại 0 và loại 1', en: 'Zero & First Conditionals', level: 'A2', emoji: '🔁',
    summary: 'Loại 0 diễn tả sự thật luôn đúng; loại 1 diễn tả điều kiện có thật và kết quả có khả năng xảy ra trong tương lai.',
    blocks: [
      { type: 'diagram', caption: 'Mệnh đề điều kiện → kết quả', steps: [
        { t: 'If you heat ice, it melts.', c: 'if' },
        { t: 'Loại 0: hiện tại đơn → hiện tại đơn (luôn đúng)', c: 'note' },
        { t: '↓', c: 'arrow' },
        { t: 'If it rains tomorrow, the match will be cancelled.', c: 'if' },
        { t: 'Loại 1: hiện tại đơn → will + V (có thể xảy ra)', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Loại 0', parts: [ { t: 'If', c: 'adv' }, { t: 'S + V (hiện tại)', c: 'subj' }, { t: ',', c: 'adv' }, { t: 'S + V (hiện tại)', c: 'verb' } ], ex: 'If people don\'t sleep enough, their memory suffers.' },
        { label: 'Loại 1', parts: [ { t: 'If', c: 'adv' }, { t: 'S + V (hiện tại)', c: 'subj' }, { t: ',', c: 'adv' }, { t: 'S + will/can/may', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'If you revise every day, you will feel more confident.' },
        { label: 'Loại 1 + mệnh lệnh', parts: [ { t: 'If', c: 'adv' }, { t: 'S + V (hiện tại)', c: 'subj' }, { t: ',', c: 'adv' }, { t: 'V (mệnh lệnh)', c: 'verb' } ], ex: 'If you finish early, check your answers.' }
      ] },
      { type: 'uses', items: [
        { title: 'Loại 0: sự thật khoa học, quy luật', ex: 'If water reaches 100°C, it boils.', vi: 'Nếu nước đạt 100°C, nó sôi.' },
        { title: 'Loại 0: thói quen, điều luôn xảy ra', ex: 'If I drink coffee after 4 p.m., I can\'t sleep.', vi: 'Nếu tôi uống cà phê sau 4 giờ chiều, tôi không ngủ được.' },
        { title: 'Loại 1: dự đoán có cơ sở', ex: 'If the government raises taxes, consumers will spend less.', vi: 'Nếu chính phủ tăng thuế, người tiêu dùng sẽ chi tiêu ít hơn.' },
        { title: 'Loại 1: lời hứa, cảnh báo, đe dọa', ex: 'If you miss another deadline, you will lose the scholarship.', vi: 'Nếu bạn trễ hạn thêm lần nữa, bạn sẽ mất học bổng.' },
        { title: 'When vs If: when = chắc chắn sẽ xảy ra', ex: 'When I get my results, I\'ll call you.', vi: 'Khi nào có kết quả, tôi sẽ gọi cho bạn (chắc chắn sẽ có).' }
      ] },
      { type: 'table', head: ['Loại', 'Mệnh đề If', 'Mệnh đề chính', 'Ý nghĩa'], rows: [
        ['0', 'Hiện tại đơn', 'Hiện tại đơn', 'Luôn đúng'],
        ['1', 'Hiện tại đơn / hiện tại tiếp diễn / HTHT', 'will / can / may / might + V', 'Có thể xảy ra trong tương lai'],
        ['1 (lịch sự)', 'should + V (đảo ngữ: Should you…)', 'please + V', 'Trang trọng, ít khả năng hơn']
      ] },
      { type: 'tip', text: 'Không dùng will trong mệnh đề if (và sau when, as soon as, before, until khi nói về tương lai): As soon as I arrive, I will text you.' },
      { type: 'tip', text: 'Khi mệnh đề if đứng đầu thì có dấu phẩy; khi đứng sau thì thường không: The match will be cancelled if it rains.' },
      { type: 'mistake', wrong: 'If it will rain tomorrow, we will stay home.', right: 'If it rains tomorrow, we will stay home.', why: 'Mệnh đề if dùng hiện tại đơn dù nói về tương lai – người Việt hay thêm will vì có chữ "ngày mai".' },
      { type: 'mistake', wrong: 'If you will heat metal, it expands.', right: 'If you heat metal, it expands.', why: 'Sự thật khoa học → loại 0, cả hai vế hiện tại đơn.' },
      { type: 'ielts', text: 'Task 2: dùng loại 1 để trình bày hệ quả của một chính sách hoặc giải pháp. Speaking Part 3: dùng loại 0 để nói về xu hướng chung trong xã hội.', ex: 'If governments subsidise public transport, fewer people will rely on private cars, and air quality will improve.' }
    ],
    quiz: [
      { q: 'If you mix red and blue, you ___ purple.', options: ['got', 'will got', 'get', 'would get'], answer: 2, explain: 'Sự thật luôn đúng → câu điều kiện loại 0: if + hiện tại đơn, hiện tại đơn → get. got là quá khứ; "will got" sai dạng; would get là loại 2.' },
      { q: 'If she ___ hard, she will pass the exam.', options: ['studies', 'will study', 'studied', 'would study'], answer: 0, explain: 'Mệnh đề if của câu điều kiện loại 1 dùng hiện tại đơn → studies. Không dùng will trong mệnh đề if; studied/would study là cấu trúc loại 2.' },
      { q: 'If the price of fuel rises, airlines ___ their fares.', options: ['increased', 'will increase', 'would have increased', 'increasing'], answer: 1, explain: 'Kết quả có thể xảy ra ở tương lai (loại 1) → will + V → will increase. increased là quá khứ; would have increased là loại 3; increasing thiếu động từ chính.' },
      { q: 'I\'ll lend you my book as soon as I ___ it.', options: ['will finish', 'finish', 'would finish', 'finished'], answer: 1, explain: 'Sau as soon as (nói về tương lai) dùng hiện tại đơn → finish. Không dùng will/would trong mệnh đề thời gian; finished là quá khứ, sai thời điểm.' },
      { q: '___ you need any help, please contact the reception.', options: ['Should', 'Would', 'Will', 'Had'], answer: 0, explain: 'Đảo ngữ loại 1 trang trọng: Should you need… = If you need… Would và Will không đảo ngữ trong câu điều kiện loại 1; Had dùng cho loại 3.' },
      { q: 'If plants don\'t get enough light, they ___.', options: ['will died', 'die', 'would die', 'had died'], answer: 1, explain: 'Quy luật tự nhiên → câu điều kiện loại 0, hiện tại đơn → die. "will died" sai dạng; would die là loại 2; had died là quá khứ hoàn thành.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['If it will rain tomorrow, we will cancel the trip.', 'If it rains tomorrow, we will cancel the trip.', 'If it rains tomorrow, we cancel will the trip.', 'If it rain tomorrow, we will cancel the trip.'], answer: 1, explain: 'Loại 1: If + hiện tại đơn, S + will + V; không dùng will trong mệnh đề if. Không dùng will trong mệnh đề if; "we cancel will" sai trật tự; "it rain" thiếu -s.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['If you will heat ice, it melts.', 'If you heat ice, it will melted.', 'If you heated ice, it melts.', 'If you heat ice, it melts.'], answer: 3, explain: 'Loại 0 (sự thật chung): If + hiện tại đơn, hiện tại đơn. "will heat" sai vì mệnh đề if không dùng will; "will melted" sai dạng; "heated… melts" trộn thì.' },
      { q: 'Phần nào sai? If the government (A) will raise taxes, many people (B) will (C) be (D) unhappy.', options: ['(A) will raise', '(B) will', '(C) be', '(D) unhappy'], answer: 0, explain: 'Mệnh đề if loại 1 dùng hiện tại đơn → sửa will raise thành raises. will, be và unhappy đều đúng.' },
      { q: 'Phần nào sai? If you (A) mix blue and yellow, you (B) get green, (C) but if you (D) adds red, it turns brown.', options: ['(A) mix', '(B) get', '(C) but', '(D) adds'], answer: 3, explain: 'Chủ ngữ you dùng động từ nguyên mẫu → sửa adds thành add. mix, get và but đều đúng.' },
      { q: 'Task 2: If cities invest in cycle lanes, more people ___ to work by bike.', options: ['travelled', 'would travelled', 'will travel', 'will travelling'], answer: 2, explain: 'Loại 1 (kết quả có thể xảy ra): If + hiện tại đơn, will + V nguyên mẫu. travelled là quá khứ; "would travelled" sai dạng; "will travelling" sai dạng.' },
      { q: 'Speaking Part 1: "What do you do when you feel stressed?" – "If I ___ stressed, I usually go for a run."', options: ['will feel', 'feel', 'felt', 'am feel'], answer: 1, explain: 'Thói quen/sự thật chung (loại 0): If + hiện tại đơn, hiện tại đơn. "will feel" sai vì mệnh đề if không dùng will; felt là quá khứ; "am feel" sai cấu trúc.' }
    ]
  });

  /* 7. Conditionals type 2 & 3 */
  G.push({
    id: 'conditionals-2-3', unit: 'verbs', order: 7,
    title: 'Câu điều kiện loại 2 và loại 3', en: 'Second & Third Conditionals', level: 'B1', emoji: '💭',
    summary: 'Loại 2 nói về tình huống giả định, không có thật ở hiện tại/tương lai; loại 3 nói về quá khứ không có thật và kết quả tưởng tượng.',
    blocks: [
      { type: 'diagram', caption: 'Lùi thì để thể hiện sự "không có thật"', steps: [
        { t: 'Thực tế: I don\'t have enough money, so I can\'t travel.', c: 'note' },
        { t: '↓ Loại 2: lùi một thì (hiện tại → quá khứ)', c: 'arrow' },
        { t: 'If I had enough money, I would travel the world.', c: 'if' },
        { t: 'Thực tế: I didn\'t revise, so I failed.', c: 'note' },
        { t: '↓ Loại 3: lùi về quá khứ hoàn thành', c: 'arrow' },
        { t: 'If I had revised, I would have passed.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Loại 2', parts: [ { t: 'If', c: 'adv' }, { t: 'S + V2/were', c: 'subj' }, { t: ',', c: 'adv' }, { t: 'S + would/could/might', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'If public transport were free, more people would use it.' },
        { label: 'Loại 3', parts: [ { t: 'If', c: 'adv' }, { t: 'S + had V3', c: 'subj' }, { t: ',', c: 'adv' }, { t: 'S + would/could/might have', c: 'aux' }, { t: 'V3', c: 'verb' } ], ex: 'If the warning had come earlier, fewer people would have been injured.' },
        { label: 'Đảo ngữ', parts: [ { t: 'Were / Had', c: 'aux' }, { t: 'S', c: 'subj' }, { t: '(to V / V3)', c: 'verb' }, { t: ', S + would…', c: 'obj' } ], ex: 'Had I known about the strike, I would have taken a taxi.' }
      ] },
      { type: 'uses', items: [
        { title: 'Loại 2: tình huống trái với hiện tại', ex: 'If I lived closer to the city centre, I wouldn\'t need a car.', vi: 'Nếu tôi sống gần trung tâm hơn, tôi sẽ không cần xe hơi.' },
        { title: 'Loại 2: giả định khó xảy ra ở tương lai', ex: 'If I won the lottery, I would set up a charity.', vi: 'Nếu trúng xổ số, tôi sẽ lập một quỹ từ thiện.' },
        { title: 'Loại 2: lời khuyên (If I were you…)', ex: 'If I were you, I would focus on Writing Task 2.', vi: 'Nếu tôi là bạn, tôi sẽ tập trung vào Writing Task 2.' },
        { title: 'Loại 3: tiếc nuối hoặc phê bình quá khứ', ex: 'If she had applied on time, she would have got the job.', vi: 'Nếu cô ấy nộp hồ sơ đúng hạn thì đã được nhận việc rồi.' },
        { title: 'Loại 3: phân tích nguyên nhân lịch sử', ex: 'If the printing press hadn\'t been invented, knowledge would have spread much more slowly.', vi: 'Nếu máy in không được phát minh, tri thức đã lan truyền chậm hơn nhiều.' }
      ] },
      { type: 'table', head: ['Loại', 'Thời gian', 'Mệnh đề If', 'Mệnh đề chính'], rows: [
        ['2', 'Hiện tại / tương lai (không thật)', 'V2 / were', 'would / could / might + V'],
        ['3', 'Quá khứ (không thật)', 'had + V3', 'would / could / might have + V3'],
        ['Đảo ngữ 2', 'Trang trọng', 'Were S to V… / Were S…', 'would + V'],
        ['Đảo ngữ 3', 'Trang trọng', 'Had S (not) V3…', 'would have + V3']
      ] },
      { type: 'tip', text: 'Trong loại 2, văn trang trọng dùng were cho mọi ngôi: If she were the manager… (was chấp nhận trong văn nói thân mật).' },
      { type: 'tip', text: 'Khi viết tắt, \'d có thể là had hoặc would: If I\'d known (= had), I\'d have helped (= would).' },
      { type: 'mistake', wrong: 'If I would have more time, I would learn French.', right: 'If I had more time, I would learn French.', why: 'Không dùng would trong mệnh đề if.' },
      { type: 'mistake', wrong: 'If I had studied harder, I would pass the exam last year.', right: 'If I had studied harder, I would have passed the exam last year.', why: 'Kết quả ở quá khứ → would have + V3.' },
      { type: 'mistake', wrong: 'If I was you, I will take the course.', right: 'If I were you, I would take the course.', why: 'Lời khuyên giả định → loại 2: were + would. Không trộn will với loại 2.' },
      { type: 'ielts', text: 'Task 2: loại 2 giúp đưa ví dụ giả định thuyết phục (If every household recycled…). Speaking Part 3 câu hỏi kiểu "What would happen if…?" bắt buộc trả lời bằng loại 2. Đảo ngữ (Were…/Had…) giúp tăng điểm Grammatical Range.', ex: 'Were the government to ban single-use plastics, manufacturers would be forced to find greener alternatives.' }
    ],
    quiz: [
      { q: 'If I ___ a car, I would drive to work.', options: ['have', 'had', 'would have', 'had had'], answer: 1, explain: 'Giả định không có thật ở hiện tại (loại 2): If + V2, would + V → had. have là loại 1; would have không dùng trong mệnh đề if; had had là loại 3 (quá khứ).' },
      { q: 'If they had left earlier, they ___ the flight.', options: ['wouldn\'t miss', 'won\'t miss', 'wouldn\'t have missed', 'didn\'t miss'], answer: 2, explain: 'Giả định trái với quá khứ (loại 3): If + had V3, would have + V3 → wouldn\'t have missed. wouldn\'t miss là loại 2; won\'t miss là loại 1; didn\'t miss sai cấu trúc câu điều kiện.' },
      { q: 'If I ___ you, I would accept the offer.', options: ['am', 'were', 'had been', 'would be'], answer: 1, explain: 'Lời khuyên dùng loại 2: If I were you (were dùng cho mọi ngôi). am là loại 1; had been là loại 3; would be không dùng trong mệnh đề if.' },
      { q: '___ the doctors acted faster, the patient might have survived.', options: ['If', 'Had', 'Were', 'Should'], answer: 1, explain: 'Đảo ngữ loại 3: Had + S + V3 (= If the doctors had acted) → Had. If phải đi với had acted; Were dùng cho loại 2; Should dùng cho loại 1.' },
      { q: 'What would you do if you ___ a wallet in the street?', options: ['find', 'found', 'will find', 'had found'], answer: 1, explain: 'Tình huống giả định khó xảy ra ở hiện tại → loại 2: if + V2 → found. find/will find là loại 1; had found là loại 3, không khớp với would do.' },
      { q: 'If the bridge ___ properly before the storm, it wouldn\'t have collapsed.', options: ['was maintained', 'had been maintained', 'would be maintained', 'is maintained'], answer: 1, explain: 'Loại 3 ở dạng bị động: If + had been + V3 → had been maintained. was maintained là loại 2; would be không dùng sau if; is maintained là loại 1.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['If I had more time, I would learn Japanese.', 'If I would have more time, I would learn Japanese.', 'If I have more time, I would learn Japanese.', 'If I had more time, I will learn Japanese.'], answer: 0, explain: 'Loại 2: If + quá khứ đơn, S + would + V. Không dùng would trong mệnh đề if; "If I have… would" và "If I had… will" là trộn sai loại 1 với loại 2.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['If she studied harder, she would have passed the exam.', 'If she had studied harder, she would passed the exam.', 'If she had studied harder, she would have passed the exam.', 'If she would have studied harder, she had passed the exam.'], answer: 2, explain: 'Loại 3: If + had V3, S + would have V3. Câu 1 trộn loại 2 với loại 3; câu 2 thiếu have (would passed); câu 4 đặt would have sai mệnh đề.' },
      { q: 'Phần nào sai? If we (A) had left earlier, we (B) would (C) not miss the flight (D) yesterday.', options: ['(A) had left', '(B) would', '(C) not miss', '(D) yesterday'], answer: 2, explain: 'Loại 3 về quá khứ → sửa thành would not have missed. had left, would và yesterday đều đúng.' },
      { q: 'Phần nào sai? If people (A) would recycle more, there (B) would be (C) less waste (D) in landfill sites.', options: ['(A) would recycle', '(B) would be', '(C) less', '(D) in'], answer: 0, explain: 'Mệnh đề if loại 2 dùng quá khứ đơn, không dùng would → sửa thành recycled. would be, less và in đều đúng.' },
      { q: 'Task 2: If governments banned single-use plastics, ocean pollution ___ significantly.', options: ['will fall', 'falls', 'would have fall', 'would fall'], answer: 3, explain: 'Giả định loại 2: If + quá khứ đơn, would + V nguyên mẫu. will fall và falls là loại 1/0; "would have fall" sai dạng V3 và sai loại.' },
      { q: 'Speaking Part 3: "If you could live anywhere, where ___?" – "Probably in New Zealand."', options: ['will you live', 'would you live', 'did you live', 'would you lived'], answer: 1, explain: 'Câu hỏi giả định loại 2: would + S + V nguyên mẫu. "will you live" là loại 1; "did you live" là quá khứ; "would you lived" sai dạng.' }
    ]
  });

  /* 8. Mixed conditionals, unless, wish */
  G.push({
    id: 'mixed-conditionals-wish', unit: 'verbs', order: 8,
    title: 'Điều kiện hỗn hợp, unless & wish', en: 'Mixed Conditionals, Unless & Wish', level: 'B2', emoji: '🌗',
    summary: 'Kết hợp quá khứ – hiện tại trong câu điều kiện hỗn hợp; dùng unless, provided that, as long as thay cho if; và wish / if only để diễn tả mong ước, hối tiếc.',
    blocks: [
      { type: 'diagram', caption: 'Điều kiện hỗn hợp: nguyên nhân quá khứ → hệ quả hiện tại', steps: [
        { t: 'Thực tế: I didn\'t learn to swim as a child, so I\'m afraid of water now.', c: 'note' },
        { t: 'If I had learnt to swim as a child,', c: 'if' },
        { t: '↓ had V3 (quá khứ) → would V (hiện tại)', c: 'arrow' },
        { t: 'I wouldn\'t be afraid of water now.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Hỗn hợp 3 → 2', parts: [ { t: 'If S + had V3', c: 'subj' }, { t: ', S + would', c: 'aux' }, { t: 'V', c: 'verb' }, { t: '(now)', c: 'time' } ], ex: 'If she had taken that job, she would be living in Singapore now.' },
        { label: 'Hỗn hợp 2 → 3', parts: [ { t: 'If S + V2', c: 'subj' }, { t: ', S + would have', c: 'aux' }, { t: 'V3', c: 'verb' } ], ex: 'If he were more organised, he wouldn\'t have lost the documents.' },
        { label: 'Unless', parts: [ { t: 'Unless', c: 'neg' }, { t: 'S + V (khẳng định)', c: 'subj' }, { t: ', S + will', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'Unless we act now, many species will disappear.' },
        { label: 'Wish (hiện tại)', parts: [ { t: 'S', c: 'subj' }, { t: 'wish / If only', c: 'adv' }, { t: 'S + V2 / were', c: 'verb' } ], ex: 'I wish I spoke English more fluently.' },
        { label: 'Wish (quá khứ)', parts: [ { t: 'S', c: 'subj' }, { t: 'wish / If only', c: 'adv' }, { t: 'S + had V3', c: 'verb' } ], ex: 'If only I had started preparing earlier!' }
      ] },
      { type: 'uses', items: [
        { title: 'Unless = if … not', ex: 'You won\'t get a high score unless you manage your time well.', vi: 'Bạn sẽ không đạt điểm cao trừ khi biết quản lý thời gian tốt.' },
        { title: 'Provided (that) / as long as / on condition that: với điều kiện là', ex: 'You can use the lab as long as you follow the safety rules.', vi: 'Bạn có thể dùng phòng thí nghiệm miễn là tuân thủ quy tắc an toàn.' },
        { title: 'Wish + V2: mong điều trái với hiện tại', ex: 'Many workers wish they had more flexible hours.', vi: 'Nhiều người lao động ước họ có giờ làm linh hoạt hơn.' },
        { title: 'Wish + had V3: hối tiếc về quá khứ', ex: 'I wish I hadn\'t chosen such a difficult topic.', vi: 'Tôi ước mình đã không chọn một đề tài khó như vậy.' },
        { title: 'Wish + would: phàn nàn về hành vi người khác / mong thay đổi', ex: 'I wish my neighbours would stop playing loud music.', vi: 'Tôi ước hàng xóm thôi bật nhạc to.' }
      ] },
      { type: 'table', head: ['Cấu trúc', 'Thời điểm', 'Ví dụ'], rows: [
        ['wish + V2 / were', 'Hiện tại', 'I wish I were taller.'],
        ['wish + had V3', 'Quá khứ', 'I wish I had listened to my teacher.'],
        ['wish + would V', 'Tương lai / phàn nàn', 'I wish it would stop raining.'],
        ['wish + could V', 'Khả năng', 'I wish I could play the guitar.'],
        ['If only…', 'Giống wish nhưng mạnh hơn', 'If only we had more time!']
      ] },
      { type: 'tip', text: 'Không dùng wish + would cho chính mình (I wish I would…). Muốn nói về khả năng của bản thân, dùng wish I could.' },
      { type: 'tip', text: 'Muốn mong một điều có khả năng xảy ra trong tương lai thì dùng hope, không dùng wish: I hope you pass the test.' },
      { type: 'mistake', wrong: 'Unless you don\'t hurry, you will be late.', right: 'Unless you hurry, you will be late.', why: 'Unless đã mang nghĩa phủ định (= if not); thêm don\'t thành phủ định kép.' },
      { type: 'mistake', wrong: 'I wish I can speak Japanese.', right: 'I wish I could speak Japanese.', why: 'Sau wish phải lùi thì: can → could.' },
      { type: 'mistake', wrong: 'I wish you will pass the exam.', right: 'I hope you pass / will pass the exam.', why: 'Chúc ai điều có thể xảy ra → hope. Lỗi do dịch "chúc/mong" thành wish.' },
      { type: 'ielts', text: 'Speaking Part 2 (kể chuyện quá khứ) và Part 1 (hỏi về hối tiếc, mong muốn) là nơi lý tưởng để dùng wish / if only và điều kiện hỗn hợp. Task 2: provided that / as long as giúp đưa điều kiện cho lập luận một cách tinh tế.', ex: 'Technology benefits students, provided that it is used to support rather than replace face-to-face teaching.' }
    ],
    quiz: [
      { q: 'If I had saved money last year, I ___ able to buy a laptop now.', options: ['would be', 'would have been', 'will be', 'had been'], answer: 0, explain: 'Hỗn hợp: điều kiện quá khứ → kết quả hiện tại (now) → would + V. would have been là kết quả quá khứ (không hợp với now); will be là loại 1; had been sai cấu trúc.' },
      { q: '___ you apply before Friday, you won\'t be considered.', options: ['If', 'Unless', 'Provided', 'As long as'], answer: 1, explain: 'Unless = if… not: nếu KHÔNG nộp trước thứ Sáu thì sẽ không được xét. If, Provided và As long as đều mang nghĩa khẳng định nên làm câu vô nghĩa.' },
      { q: 'I wish I ___ more time to prepare for the interview yesterday.', options: ['have', 'had', 'had had', 'would have'], answer: 2, explain: 'Hối tiếc về quá khứ (yesterday) → wish + had V3 → had had (động từ have ở dạng quá khứ hoàn thành). have và had chỉ hiện tại; would have không dùng sau wish cho quá khứ.' },
      { q: 'You can borrow my notes ___ you return them tomorrow.', options: ['unless', 'as long as', 'even if', 'in case'], answer: 1, explain: 'as long as = miễn là (đặt điều kiện) → as long as you return them. unless (trừ khi), even if (ngay cả khi) và in case (phòng khi) đều sai nghĩa.' },
      { q: 'I wish my brother ___ borrowing my things without asking.', options: ['stops', 'would stop', 'stopped had', 'will stop'], answer: 1, explain: 'Phàn nàn, mong người khác thay đổi hành vi → wish + S + would + V → would stop. stops và will stop không dùng sau wish; "stopped had" sai cấu trúc.' },
      { q: 'If he weren\'t so shy, he ___ to the party last night.', options: ['would go', 'will go', 'would have gone', 'had gone'], answer: 2, explain: 'Hỗn hợp: tính cách hiện tại (V2) → kết quả quá khứ (would have V3). would go là kết quả hiện tại (không hợp với last night); will go là loại 1; had gone sai cấu trúc.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['If I had taken that job, I will be rich now.', 'If I had taken that job, I would be rich now.', 'If I would have taken that job, I would be rich now.', 'If I have taken that job, I would be rich now.'], answer: 1, explain: 'Điều kiện hỗn hợp: If + had V3 (quá khứ), would + V (kết quả hiện tại, now). will be không hợp với điều kiện quá khứ; không dùng would have trong mệnh đề if; "have taken" sai thì.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I wish I can speak English fluently.', 'I wish I would can speak English fluently.', 'I wish I spoken English fluently.', 'I wish I could speak English fluently.'], answer: 3, explain: 'Ước điều trái hiện tại: wish + quá khứ đơn / could + V. can không lùi thì sau wish; "would can" sai; "spoken" thiếu had.' },
      { q: 'Phần nào sai? (A) Unless you (B) don\'t (C) practise regularly, your speaking (D) will not improve.', options: ['(A) Unless', '(B) don\'t', '(C) practise', '(D) will not improve'], answer: 1, explain: 'Unless đã mang nghĩa phủ định (= if not) → bỏ don\'t: Unless you practise… Unless, practise và will not improve đều đúng.' },
      { q: 'Phần nào sai? I wish I (A) didn\'t spend so (B) much money (C) on clothes (D) last month.', options: ['(A) didn\'t spend', '(B) much', '(C) on', '(D) last month'], answer: 0, explain: 'Ước điều trái quá khứ (last month) → wish + had V3: hadn\'t spent. much, on và last month đều đúng.' },
      { q: 'Task 2: ___ governments take urgent action, climate change will continue to accelerate.', options: ['If not', 'Unless', 'Wish', 'Despite'], answer: 1, explain: 'Unless = if … not: trừ khi chính phủ hành động khẩn cấp. If not thiếu chủ ngữ và sai cấu trúc; Wish và Despite không nối mệnh đề điều kiện.' },
      { q: 'Speaking Part 2: "Is there anything you regret?" – "Yes, I wish I ___ harder at school."', options: ['studied', 'have studied', 'had studied', 'would study'], answer: 2, explain: 'Tiếc nuối về quá khứ (thời đi học) → wish + had V3: had studied. studied là ước cho hiện tại; have studied không dùng sau wish; would study chỉ mong muốn thay đổi trong tương lai.' }
    ]
  });

  /* 9. Reported speech */
  G.push({
    id: 'reported-speech', unit: 'verbs', order: 9,
    title: 'Câu tường thuật', en: 'Reported Speech', level: 'B1', emoji: '🗣️',
    summary: 'Chuyển lời nói trực tiếp sang gián tiếp bằng cách lùi thì, đổi đại từ, trạng từ thời gian – nơi chốn và chọn động từ tường thuật phù hợp.',
    blocks: [
      { type: 'diagram', caption: 'Từ lời nói trực tiếp sang gián tiếp', steps: [
        { t: '"I am preparing for my test this week," Linh said.', c: 'active' },
        { t: '↓ bỏ ngoặc kép, đổi I → she', c: 'arrow' },
        { t: '↓ lùi thì: am preparing → was preparing', c: 'arrow' },
        { t: '↓ đổi trạng từ: this week → that week', c: 'arrow' },
        { t: 'Linh said (that) she was preparing for her test that week.', c: 'passive' }
      ] },
      { type: 'formula', rows: [
        { label: 'Câu kể', parts: [ { t: 'S', c: 'subj' }, { t: 'said / told sb', c: 'verb' }, { t: '(that)', c: 'adv' }, { t: 'S + V (lùi thì)', c: 'obj' } ], ex: 'He told me (that) he had lost his passport.' },
        { label: 'Câu hỏi Yes/No', parts: [ { t: 'S', c: 'subj' }, { t: 'asked', c: 'verb' }, { t: 'if / whether', c: 'adv' }, { t: 'S + V (lùi thì)', c: 'obj' } ], ex: 'The examiner asked if I enjoyed reading.' },
        { label: 'Câu hỏi Wh-', parts: [ { t: 'S', c: 'subj' }, { t: 'asked', c: 'verb' }, { t: 'Wh-', c: 'adv' }, { t: 'S + V (không đảo)', c: 'obj' } ], ex: 'She asked me where I lived.' },
        { label: 'Mệnh lệnh / yêu cầu', parts: [ { t: 'S', c: 'subj' }, { t: 'told / asked', c: 'verb' }, { t: 'sb', c: 'obj' }, { t: '(not) to V', c: 'verb' } ], ex: 'The teacher told us not to use our phones.' }
      ] },
      { type: 'uses', items: [
        { title: 'Lùi thì khi động từ tường thuật ở quá khứ', ex: 'She said she would call me later.', vi: 'Cô ấy nói sẽ gọi cho tôi sau.' },
        { title: 'Không cần lùi thì khi điều đó vẫn còn đúng', ex: 'Our lecturer said that the Earth orbits the Sun.', vi: 'Giảng viên nói rằng Trái Đất quay quanh Mặt Trời.' },
        { title: 'Động từ tường thuật + to V: promise, agree, refuse, offer', ex: 'The company promised to reduce its plastic packaging.', vi: 'Công ty hứa sẽ giảm bao bì nhựa.' },
        { title: 'Động từ + sb + to V: advise, warn, remind, encourage', ex: 'My tutor advised me to read more academic articles.', vi: 'Gia sư khuyên tôi đọc nhiều bài báo học thuật hơn.' },
        { title: 'Động từ + V-ing: admit, deny, suggest, recommend', ex: 'The minister denied taking any bribes.', vi: 'Bộ trưởng phủ nhận đã nhận hối lộ.' }
      ] },
      { type: 'table', head: ['Trực tiếp', 'Gián tiếp'], rows: [
        ['Hiện tại đơn (do)', 'Quá khứ đơn (did)'],
        ['Hiện tại tiếp diễn (am doing)', 'Quá khứ tiếp diễn (was doing)'],
        ['Hiện tại hoàn thành / Quá khứ đơn', 'Quá khứ hoàn thành (had done); quá khứ đơn thường có thể giữ nguyên'],
        ['will / can / may', 'would / could / might'],
        ['must', 'had to (hoặc giữ must)'],
        ['now / today / tomorrow', 'then / that day / the next day'],
        ['yesterday / ago / here', 'the day before / before / there']
      ] },
      { type: 'tip', text: 'Say không có tân ngữ người trực tiếp (said to me), còn tell bắt buộc có: told me. Không viết "said me" hay "told that".' },
      { type: 'tip', text: 'Suggest không đi với to V: He suggested going / He suggested that we (should) go.' },
      { type: 'mistake', wrong: 'She asked me where did I live.', right: 'She asked me where I lived.', why: 'Câu hỏi gián tiếp dùng trật tự câu kể (S + V), không đảo trợ động từ.' },
      { type: 'mistake', wrong: 'He said me that he was tired.', right: 'He told me that he was tired. / He said that he was tired.', why: 'Say không đi trực tiếp với tân ngữ người.' },
      { type: 'mistake', wrong: 'My friend suggested me to take a gap year.', right: 'My friend suggested (that) I take / taking a gap year.', why: 'Suggest không theo mẫu suggest sb to V.' },
      { type: 'ielts', text: 'Writing Task 2: dùng động từ tường thuật đa dạng (claim, argue, suggest, point out, maintain) thay vì chỉ say để trình bày quan điểm của người khác. Speaking Part 2: kể lại lời khuyên ai đó từng nói với bạn.', ex: 'Some experts argue that homework should be abolished, while others maintain that it builds discipline.' }
    ],
    quiz: [
      { q: '"I am tired," she said. → She said that she ___ tired.', options: ['is', 'was', 'has been', 'will be'], answer: 1, explain: 'Tường thuật lùi thì: am → was. is và will be không lùi thì; has been là hiện tại hoàn thành, sai thì.' },
      { q: '"Where do you work?" he asked. → He asked me where I ___.', options: ['do work', 'did work', 'worked', 'work did'], answer: 2, explain: 'Câu hỏi gián tiếp lùi thì và không đảo ngữ: where + S + V2 → where I worked. "do work", "did work" giữ trợ động từ của câu hỏi trực tiếp; "work did" sai trật tự.' },
      { q: '"Don\'t touch the screen," the guide said. → The guide told us ___ the screen.', options: ['don\'t touch', 'not to touch', 'to not touching', 'not touch'], answer: 1, explain: 'Mệnh lệnh phủ định khi tường thuật: tell + sb + not to + V → told us not to touch. "don\'t touch" giữ nguyên câu trực tiếp; "to not touching" và "not touch" sai dạng.' },
      { q: '"I will help you tomorrow," he said. → He said he ___ help me ___.', options: ['will / tomorrow', 'would / the next day', 'would / yesterday', 'will / the next day'], answer: 1, explain: 'Lùi thì và đổi trạng từ khi tường thuật: will → would; tomorrow → the next day/the following day.' },
      { q: 'She ___ breaking the vase.', options: ['denied', 'refused', 'promised', 'told'], answer: 0, explain: 'deny + V-ing = phủ nhận đã làm → denied breaking. refuse và promise đi với to V; tell cần tân ngữ người (told sb).' },
      { q: '"Can you swim?" she asked. → She asked ___ I could swim.', options: ['that', 'what', 'if', 'did'], answer: 2, explain: 'Câu hỏi Yes/No khi tường thuật dùng if/whether → asked if I could swim. that dùng cho câu trần thuật; what dùng cho câu hỏi Wh-; did không đứng trong câu gián tiếp.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She said me that she was tired.', 'She told that she was tired.', 'She told me that she was tired.', 'She told to me that she was tired.'], answer: 2, explain: 'tell + người + that…; say không có tân ngữ người trực tiếp (say to sb). "said me" thiếu to; "told that" thiếu tân ngữ người; "told to me" thừa to.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['He asked me where did I live.', 'He asked me where I lived.', 'He asked me where I did live.', 'He asked me where do I live.'], answer: 1, explain: 'Câu hỏi tường thuật dùng trật tự câu khẳng định và lùi thì: where I lived. Câu 1 và 4 giữ trật tự câu hỏi; "where I did live" thừa trợ động từ.' },
      { q: 'Phần nào sai? The teacher (A) told us (B) that the exam (C) will be held (D) the following week.', options: ['(A) told', '(B) that', '(C) will be', '(D) the following'], answer: 2, explain: 'Tường thuật lùi thì: will → would (would be held). told, that và the following đều đúng.' },
      { q: 'Phần nào sai? My manager (A) asked me (B) whether (C) could I (D) work late on Friday.', options: ['(A) asked', '(B) whether', '(C) could I', '(D) work'], answer: 2, explain: 'Câu hỏi tường thuật không đảo ngữ → sửa thành whether I could work. asked, whether và work đều đúng.' },
      { q: 'Speaking Part 2: "Describe some advice you received." – "My grandfather told me ___ give up on my dreams."', options: ['don\'t', 'didn\'t', 'not', 'not to'], answer: 3, explain: 'Tường thuật lời khuyên/mệnh lệnh phủ định: told + sb + not to + V. don\'t, didn\'t, not không đi trực tiếp sau told + tân ngữ trong câu tường thuật mệnh lệnh.' },
      { q: 'Speaking: "What did your friend say about the film?" – "She said she ___ it the week before."', options: ['had seen', 'has seen', 'sees', 'will see'], answer: 0, explain: 'Lùi thì quá khứ đơn → quá khứ hoàn thành; the week before là dấu hiệu tường thuật: had seen.' }
    ]
  });

  /* 10. Gerund vs to-infinitive */
  G.push({
    id: 'gerund-infinitive', unit: 'verbs', order: 10,
    title: 'Danh động từ và động từ nguyên mẫu có to', en: 'Gerund vs To-infinitive', level: 'B1', emoji: '⚖️',
    summary: 'Một số động từ đi với V-ing, số khác đi với to V, và một nhóm (stop, remember, forget, try, regret) đổi nghĩa tùy theo dạng theo sau.',
    blocks: [
      { type: 'diagram', caption: 'Cùng động từ, khác nghĩa: stop', steps: [
        { t: 'He stopped smoking.', c: 'if' },
        { t: '→ ngừng hẳn thói quen hút thuốc (V-ing = hành động bị dừng)', c: 'note' },
        { t: '↓ so sánh', c: 'arrow' },
        { t: 'He stopped to smoke.', c: 'result' },
        { t: '→ dừng việc khác lại để hút thuốc (to V = mục đích)', c: 'note' }
      ] },
      { type: 'formula', rows: [
        { label: 'Động từ + V-ing', parts: [ { t: 'S', c: 'subj' }, { t: 'enjoy/avoid/finish…', c: 'verb' }, { t: 'V-ing', c: 'obj' } ], ex: 'Many students avoid speaking in class.' },
        { label: 'Động từ + to V', parts: [ { t: 'S', c: 'subj' }, { t: 'decide/hope/plan…', c: 'verb' }, { t: 'to V', c: 'obj' } ], ex: 'She decided to study abroad.' },
        { label: 'Giới từ + V-ing', parts: [ { t: 'S', c: 'subj' }, { t: 'be interested in / look forward to', c: 'verb' }, { t: 'V-ing', c: 'obj' } ], ex: 'I look forward to hearing from you.' },
        { label: 'V-ing làm chủ ngữ', parts: [ { t: 'V-ing', c: 'subj' }, { t: 'is/helps…', c: 'verb' }, { t: '…', c: 'obj' } ], ex: 'Reading widely improves your vocabulary.' }
      ] },
      { type: 'uses', items: [
        { title: 'Remember / forget + to V: nhớ/quên phải làm (việc chưa làm)', ex: 'Remember to write at least 250 words.', vi: 'Nhớ viết ít nhất 250 từ.' },
        { title: 'Remember / forget + V-ing: nhớ/quên đã làm (việc đã xảy ra)', ex: 'I remember visiting Ha Long Bay as a child.', vi: 'Tôi nhớ đã đến Vịnh Hạ Long hồi nhỏ.' },
        { title: 'Try + to V: cố gắng; try + V-ing: thử làm xem sao', ex: 'I tried to sleep, but the noise was too loud. / Try drinking warm milk before bed.', vi: 'Tôi cố ngủ nhưng ồn quá. / Thử uống sữa ấm trước khi ngủ xem.' },
        { title: 'Regret + V-ing: hối tiếc đã làm; regret + to V: lấy làm tiếc phải báo', ex: 'We regret to inform you that your application was unsuccessful.', vi: 'Chúng tôi rất tiếc phải thông báo rằng hồ sơ của bạn không được chấp nhận.' },
        { title: 'Like / love / hate / prefer / begin / start: cả hai, nghĩa gần như nhau', ex: 'It started raining / to rain just after we left.', vi: 'Trời bắt đầu mưa ngay sau khi chúng tôi rời đi.' }
      ] },
      { type: 'table', head: ['+ V-ing', '+ to V', 'Cả hai (đổi nghĩa)'], rows: [
        ['enjoy, avoid, finish, mind, consider', 'decide, hope, plan, agree, refuse', 'stop, remember, forget'],
        ['suggest, recommend, deny, admit, risk', 'manage, afford, offer, promise, fail', 'try, regret'],
        ['keep, practise, delay, postpone, miss', 'expect, want, would like, tend, seem', 'go on, mean, need'],
        ['can\'t help, can\'t stand, it\'s worth', 'learn, aim, attempt, intend', '—']
      ] },
      { type: 'tip', text: 'Sau giới từ luôn dùng V-ing – kể cả "to" là giới từ trong look forward to, be used to, object to, when it comes to, contribute to: This contributes to reducing pollution.' },
      { type: 'tip', text: 'Need + V-ing mang nghĩa bị động: The roof needs repairing (= needs to be repaired).' },
      { type: 'mistake', wrong: 'I look forward to meet you.', right: 'I look forward to meeting you.', why: 'To trong look forward to là giới từ → V-ing. Lỗi rất phổ biến trong thư IELTS General Task 1.' },
      { type: 'mistake', wrong: 'Students should avoid to use informal language.', right: 'Students should avoid using informal language.', why: 'Avoid luôn đi với V-ing.' },
      { type: 'mistake', wrong: 'I forgot locking the door, so a thief got in.', right: 'I forgot to lock the door, so a thief got in.', why: 'Quên làm việc cần làm → forget + to V.' },
      { type: 'ielts', text: 'Task 2: dùng V-ing làm chủ ngữ để câu súc tích, học thuật (Investing in education…). Kết hợp các động từ như tend to, fail to, be worth V-ing, contribute to V-ing để tăng độ đa dạng ngữ pháp.', ex: 'Encouraging children to read for pleasure is worth prioritising, as it tends to improve their academic performance.' }
    ],
    quiz: [
      { q: 'Most candidates want ___ a band 7 or higher.', options: ['achieving', 'to achieve', 'achieve', 'achieved'], answer: 1, explain: 'want + to V (muốn làm gì) → to achieve. Sau want không dùng V-ing (achieving), V nguyên mẫu không to (achieve) hay V3 (achieved).' },
      { q: 'Would you mind ___ the window?', options: ['to open', 'open', 'opening', 'opened'], answer: 2, explain: 'mind + V-ing (phiền làm gì) → Would you mind opening…? Sau mind không dùng to open, open hay opened.' },
      { q: 'On the way home, I stopped ___ some bread.', options: ['buying', 'to buy', 'buy', 'bought'], answer: 1, explain: 'stop + to V = dừng lại ĐỂ làm việc khác (mục đích: mua bánh mì) → stopped to buy. stop + V-ing nghĩa là ngừng hẳn việc đang làm, sai nghĩa ở đây; buy và bought sai dạng.' },
      { q: 'I don\'t remember ___ this film before, but the ending seems familiar.', options: ['to watch', 'watching', 'watch', 'to have watch'], answer: 1, explain: 'remember + V-ing = nhớ việc ĐÃ làm trong quá khứ (đã xem phim) → watching. remember + to V là nhớ để làm việc sắp làm; watch và "to have watch" sai dạng.' },
      { q: 'If you can\'t sleep, try ___ a book instead of using your phone.', options: ['reading', 'to reading', 'read', 'reads'], answer: 0, explain: 'Thử làm một cách để xem có hiệu quả không → try + V-ing. "to reading" sai dạng (to ở đây không phải giới từ); read và reads sai dạng sau try.' },
      { q: 'Scientists are committed to ___ a cure for the disease.', options: ['find', 'finding', 'found', 'to finding a'], answer: 1, explain: 'be committed to: to là giới từ → theo sau là V-ing → finding. find và found sai dạng; "to finding a" thừa to và a.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I enjoy to read novels.', 'I enjoy reading novels.', 'I enjoy read novels.', 'I enjoy to reading novels.'], answer: 1, explain: 'enjoy + V-ing (thích làm gì) → I enjoy reading novels. "enjoy to read", "enjoy read", "enjoy to reading" đều sai dạng sau enjoy.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She decided studying abroad.', 'She decided study abroad.', 'She decided for studying abroad.', 'She decided to study abroad.'], answer: 3, explain: 'decide + to V (quyết định làm gì) → She decided to study abroad. decide không đi với V-ing, V nguyên mẫu không to hay "for studying".' },
      { q: 'Phần nào sai? Many people (A) avoid (B) to use public transport (C) because it (D) is unreliable.', options: ['(A) avoid', '(B) to use', '(C) because', '(D) is'], answer: 1, explain: 'avoid + V-ing → avoid using, nên phần sai là (B) to use. avoid, because và is đều đúng.' },
      { q: 'Phần nào sai? I (A) look forward (B) to (C) hear (D) from you soon.', options: ['(A) look forward', '(B) to', '(C) hear', '(D) from'], answer: 2, explain: 'look forward to: to là giới từ nên theo sau là V-ing → hearing. look forward, to và from đều đúng.' },
      { q: 'Task 2: Governments should encourage people ___ more environmentally friendly products.', options: ['to buy', 'buying', 'buy', 'for buying'], answer: 0, explain: 'encourage + sb + to V (khuyến khích ai làm gì) → encourage people to buy. encourage không đi với V-ing, V nguyên mẫu không to hay "for buying" theo nghĩa này.' },
      { q: 'Speaking Part 1: "Do you like cooking?" – "Not really. I\'m not very good at ___."', options: ['cook', 'to cook', 'cooking', 'cooked'], answer: 2, explain: 'Sau giới từ (good at) dùng V-ing → cooking. cook và to cook không đứng sau giới từ; cooked sai dạng.' }
    ]
  });
})(typeof self !== 'undefined' ? self : this);
