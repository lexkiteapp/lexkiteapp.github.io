/* Ngữ pháp – Các chương bổ sung (tự biên soạn) */
(function (g) {
  const G = g.GRAMMAR = g.GRAMMAR || [];

  /* 1. Sequence of tenses & time clauses */
  G.push({
    id: 'sequence-of-tenses', unit: 'tenses', order: 1,
    title: 'Sự phối hợp thì & mệnh đề thời gian', en: 'Sequence of Tenses & Time Clauses', level: 'B1', emoji: '🔗',
    summary: 'Sau when, as soon as, until, before, after, once… dùng thì HIỆN TẠI để nói về tương lai; thì của mệnh đề phụ phải "ăn khớp" với mệnh đề chính; by the time + quá khứ đơn → mệnh đề chính dùng quá khứ hoàn thành.',
    blocks: [
      { type: 'timeline', caption: 'By the time the lecture started (mốc quá khứ), most students had already arrived (xảy ra trước mốc).', marks: [ { kind: 'point', at: 18, label: 'had arrived' }, { kind: 'point', at: 34, label: 'lecture started' }, { kind: 'arrow', from: 18, to: 34, label: 'by the time' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Tương lai + mệnh đề thời gian', parts: [ { t: 'S', c: 'subj' }, { t: 'will', c: 'aux' }, { t: 'V', c: 'verb' }, { t: 'when / as soon as / until + hiện tại đơn', c: 'time' } ], ex: 'I will email you as soon as the results come out.' },
        { label: 'Hoàn tất trước khi…', parts: [ { t: 'after / once + hiện tại hoàn thành', c: 'time' }, { t: 'S', c: 'subj' }, { t: 'will', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'Once you have submitted the form, you will receive a reference number.' },
        { label: 'By the time (quá khứ)', parts: [ { t: 'By the time + quá khứ đơn', c: 'time' }, { t: 'S', c: 'subj' }, { t: 'had', c: 'aux' }, { t: 'V3/ed', c: 'verb' } ], ex: 'By the time the ambulance arrived, the crowd had dispersed.' },
        { label: 'By the time (tương lai)', parts: [ { t: 'By the time + hiện tại đơn', c: 'time' }, { t: 'S', c: 'subj' }, { t: 'will have', c: 'aux' }, { t: 'V3/ed', c: 'verb' } ], ex: 'By the time she graduates, she will have completed two internships.' }
      ] },
      { type: 'uses', items: [
        { title: 'Mệnh đề thời gian chỉ tương lai: KHÔNG dùng will', ex: 'We will start the meeting when everyone arrives.', vi: 'Chúng ta sẽ bắt đầu cuộc họp khi mọi người đến đủ.' },
        { title: 'Until / before + hiện tại đơn', ex: 'The road will stay closed until the repairs are finished.', vi: 'Con đường sẽ đóng cửa cho đến khi sửa xong.' },
        { title: 'Hai hành động quá khứ nối tiếp: quá khứ đơn + quá khứ đơn', ex: 'When the alarm went off, everyone left the building.', vi: 'Khi chuông báo động reo, mọi người rời khỏi tòa nhà.' },
        { title: 'Hành động xảy ra trước một mốc quá khứ: quá khứ hoàn thành', ex: 'After the committee had reviewed the evidence, it published its report.', vi: 'Sau khi ủy ban xem xét bằng chứng, họ công bố báo cáo.' },
        { title: 'Phối thì khi mệnh đề chính ở quá khứ (lùi thì)', ex: 'She said that she was preparing for the exam.', vi: 'Cô ấy nói rằng cô ấy đang ôn thi.' }
      ] },
      { type: 'table', head: ['Mệnh đề chính', 'Mệnh đề thời gian', 'Ví dụ'], rows: [
        ['will / can / imperative', 'hiện tại đơn / hiện tại hoàn thành', 'Call me when you get home.'],
        ['quá khứ đơn', 'quá khứ đơn / quá khứ tiếp diễn', 'The lights went out while we were eating.'],
        ['quá khứ hoàn thành', 'by the time / before + quá khứ đơn', 'The train had left before we reached the station.'],
        ['tương lai hoàn thành', 'by the time + hiện tại đơn', 'By the time you read this, I will have left.']
      ] },
      { type: 'signals', words: ['when', 'as soon as', 'once', 'until / till', 'before', 'after', 'while', 'by the time', 'the moment'] },
      { type: 'tip', text: 'Mẹo nhớ: trong mệnh đề thời gian, "will" bị cấm cửa. Nói tương lai thì vế chính mang will, vế thời gian mang hiện tại.' },
      { type: 'mistake', wrong: 'I will call you when I will arrive in London.', right: 'I will call you when I arrive in London.', why: 'Mệnh đề thời gian (when…) chỉ tương lai dùng hiện tại đơn, không dùng will.' },
      { type: 'mistake', wrong: 'By the time we got to the cinema, the film already started.', right: 'By the time we got to the cinema, the film had already started.', why: 'Hành động xảy ra trước mốc "by the time + quá khứ" cần quá khứ hoàn thành.' },
      { type: 'mistake', wrong: 'We will wait here until the rain will stop.', right: 'We will wait here until the rain stops.', why: 'Until cũng là liên từ thời gian → hiện tại đơn cho tương lai.' },
      { type: 'ielts', text: 'Trong Writing Task 1 dạng quy trình (process), dùng once / after / as soon as + hiện tại hoàn thành để nối các bước. Trong Task 2 khi dự đoán tương lai, nhớ: when + hiện tại.', ex: 'Once the beans have been dried, they are roasted at a high temperature.' }
    ],
    quiz: [
      { q: 'I will let you know as soon as I ___ my results.', options: ['will get', 'get', 'got', 'would get'], answer: 1, explain: 'as soon as nói về tương lai → dùng hiện tại đơn → as soon as I get. Không dùng will/would trong mệnh đề thời gian; got là quá khứ, sai thời điểm.' },
      { q: 'By the time the firefighters arrived, the fire ___ most of the warehouse.', options: ['destroys', 'has destroyed', 'destroyed', 'had destroyed'], answer: 3, explain: 'By the time + quá khứ đơn → mệnh đề chính quá khứ hoàn thành.' },
      { q: 'Don\'t leave the room until the examiner ___ you to.', options: ['tells', 'will tell', 'told', 'is going to tell'], answer: 0, explain: 'until nói về tương lai → hiện tại đơn → until the examiner tells you to. will tell và is going to tell không dùng trong mệnh đề thời gian; told là quá khứ.' },
      { q: 'By the time she retires, she ___ at the hospital for forty years.', options: ['works', 'will have worked', 'had worked', 'has worked'], answer: 1, explain: 'By the time + hiện tại đơn → tương lai hoàn thành.' },
      { q: 'Once the application ___, you will be contacted within ten days.', options: ['will be processed', 'was processed', 'has been processed', 'had been processed'], answer: 2, explain: 'Once + hiện tại hoàn thành để nhấn hành động hoàn tất trước tương lai.' },
      { q: 'While I ___ through the report, I noticed several errors.', options: ['read', 'was reading', 'have read', 'am reading'], answer: 1, explain: 'While + quá khứ tiếp diễn cho hành động đang diễn ra thì hành động khác xen vào.' },
      { q: 'Câu nào đúng?', options: ['I will phone you after I will finish work.', 'When the government will raise taxes, prices will rise.', 'Before you start the test, read the instructions carefully.', 'She will wait until he will apologise.'], answer: 2, explain: 'Before + hiện tại đơn là đúng. Các câu khác dùng will trong mệnh đề thời gian.' },
      { q: 'Câu nào đúng?', options: ['By the time I woke up, my flatmate had gone to work.', 'By the time I woke up, my flatmate has gone to work.', 'By the time I wake up, my flatmate had gone to work.', 'By the time I woke up, my flatmate goes to work.'], answer: 0, explain: 'By the time + quá khứ đơn, mệnh đề chính quá khứ hoàn thành.' },
      { q: 'Câu nào đúng?', options: ['After he has graduated last year, he moved to Manchester.', 'After he had graduated, he moved to Manchester.', 'After he will graduate, he moved to Manchester.', 'After he graduates, he moved to Manchester.'], answer: 1, explain: 'Chuỗi quá khứ: after + quá khứ hoàn thành (hoặc quá khứ đơn), mệnh đề chính quá khứ đơn.' },
      { q: 'Câu nào cùng nghĩa? "The guests arrived. Then we finished cooking."', options: ['By the time the guests arrived, we had finished cooking.', 'When the guests arrived, we had finished cooking.', 'We had finished cooking after the guests arrived.', 'By the time the guests arrived, we hadn\'t finished cooking yet.'], answer: 3, explain: 'Khách đến trước, nấu xong sau → lúc khách đến thì chưa nấu xong (hadn\'t finished yet).' },
      { q: 'Câu nào cùng nghĩa? "You must finish the essay. Then you can go out."', options: ['You can go out until you finish the essay.', 'You can go out before you finish the essay.', 'You can\'t go out until you have finished the essay.', 'You can go out while you are finishing the essay.'], answer: 2, explain: 'not… until = chỉ khi… xong thì mới → You can\'t go out until you have finished the essay. Các câu khác nói bạn có thể ra ngoài trước/trong khi làm bài, trái nghĩa.' },
      { q: 'Câu nào cùng nghĩa? "The meeting will end. Then I will send you the minutes."', options: ['I will send you the minutes as soon as the meeting ends.', 'I will send you the minutes before the meeting ends.', 'I sent you the minutes when the meeting ended.', 'I will send you the minutes while the meeting will end.'], answer: 0, explain: 'As soon as + hiện tại đơn, mệnh đề chính will: đúng thứ tự và đúng thì.' }
    ]
  });

  /* 2. Advanced quantifiers */
  G.push({
    id: 'quantity-advanced', unit: 'words', order: 2,
    title: 'Diễn tả số lượng nâng cao', en: 'Advanced Quantifiers', level: 'B2', emoji: '📊',
    summary: 'Phân biệt most / most of / the most / mostly, all / the whole, each / every, a number of / the number of, và dùng chính xác a great deal of, plenty of, several, a majority of, phân số + of – công cụ không thể thiếu khi mô tả số liệu.',
    blocks: [
      { type: 'scale', caption: 'Mức độ từ ít đến nhiều (ước lượng tỉ lệ trong một nhóm)', items: [ { t: 'all / every', v: 100 }, { t: 'the vast majority of', v: 90 }, { t: 'most (of)', v: 75 }, { t: 'a majority of', v: 60 }, { t: 'half of', v: 50 }, { t: 'a minority of', v: 30 }, { t: 'several / a few', v: 15 }, { t: 'hardly any', v: 5 } ] },
      { type: 'formula', rows: [
        { label: 'Most (chung chung)', parts: [ { t: 'Most', c: 'adv' }, { t: 'N số nhiều / không đếm được', c: 'subj' }, { t: 'V', c: 'verb' } ], ex: 'Most universities offer online courses.' },
        { label: 'Most of (nhóm xác định)', parts: [ { t: 'Most of', c: 'adv' }, { t: 'the / my / these + N', c: 'subj' }, { t: 'V', c: 'verb' } ], ex: 'Most of the students in my class passed.' },
        { label: 'A number of (= nhiều)', parts: [ { t: 'A number of', c: 'adv' }, { t: 'N số nhiều', c: 'subj' }, { t: 'V số nhiều', c: 'verb' } ], ex: 'A number of factors have contributed to the decline.' },
        { label: 'The number of (= con số)', parts: [ { t: 'The number of', c: 'adv' }, { t: 'N số nhiều', c: 'subj' }, { t: 'V số ít', c: 'verb' } ], ex: 'The number of cyclists has doubled since 2010.' },
        { label: 'Phân số + of', parts: [ { t: 'Two thirds of', c: 'adv' }, { t: 'the + N', c: 'subj' }, { t: 'V hòa hợp với N', c: 'verb' } ], ex: 'Two thirds of the budget was spent on healthcare.' }
      ] },
      { type: 'uses', items: [
        { title: 'The most = nhất (so sánh nhất); mostly = chủ yếu (trạng từ)', ex: 'The audience was mostly made up of teenagers.', vi: 'Khán giả chủ yếu là thanh thiếu niên.' },
        { title: 'The whole + N số ít đếm được (= toàn bộ); all + N số nhiều / không đếm được', ex: 'The whole village was flooded, and all the roads were closed.', vi: 'Cả ngôi làng bị ngập và tất cả các con đường bị đóng.' },
        { title: 'Each (từng cái, nhóm nhỏ, có thể đứng một mình) / every (mọi, nhóm lớn)', ex: 'Each of the candidates was given ten minutes.', vi: 'Mỗi thí sinh được cho mười phút.' },
        { title: 'A great deal of + N không đếm được; plenty of + cả hai loại', ex: 'The project required a great deal of effort, but we had plenty of volunteers.', vi: 'Dự án đòi hỏi rất nhiều công sức, nhưng chúng tôi có rất nhiều tình nguyện viên.' },
        { title: 'A majority / minority of + N số nhiều', ex: 'A small minority of respondents disagreed with the proposal.', vi: 'Một số ít người trả lời không đồng ý với đề xuất.' }
      ] },
      { type: 'table', head: ['Từ', 'Đi với', 'Ví dụ'], rows: [
        ['several', 'N đếm được số nhiều', 'several reasons'],
        ['a great deal of / a large amount of', 'N không đếm được', 'a great deal of money'],
        ['a large number of', 'N đếm được số nhiều', 'a large number of tourists'],
        ['plenty of / a lot of', 'cả hai', 'plenty of time / plenty of options'],
        ['each / every', 'N số ít + V số ít', 'Every student has a locker.'],
        ['each of / none of', 'the + N số nhiều (V số ít trang trọng)', 'Each of the rooms has a balcony.']
      ] },
      { type: 'tip', text: 'Every không đứng một mình và không đi trực tiếp với of: KHÔNG nói "every of the students" mà nói "every one of the students" hoặc "each of the students".' },
      { type: 'tip', text: 'Phân số / phần trăm + of + N: động từ chia theo N. 40% of the population IS… nhưng 40% of people ARE…' },
      { type: 'mistake', wrong: 'Most of people prefer living in cities.', right: 'Most people prefer living in cities.', why: 'Most of phải đi kèm từ hạn định (the, my, these…). Nói chung chung thì dùng most + N.' },
      { type: 'mistake', wrong: 'The number of students are increasing.', right: 'The number of students is increasing.', why: 'Chủ ngữ là "the number" (con số) → động từ số ít.' },
      { type: 'mistake', wrong: 'Every students must wear a uniform.', right: 'Every student must wear a uniform.', why: 'Every / each + danh từ SỐ ÍT.' },
      { type: 'ielts', text: 'Task 1 đánh giá cao việc chuyển phần trăm thành cụm số lượng: 52% → a slight majority, 75% → three quarters / the vast majority, 8% → a small minority. Dùng the number of (đếm được) và the amount of (không đếm được) cho chính xác.', ex: 'Just under three quarters of households owned a car in 2020, while the number of cyclists remained low.' }
    ],
    quiz: [
      { q: '___ the employees in our company work from home on Fridays.', options: ['Most', 'Most of', 'The most', 'Mostly'], answer: 1, explain: 'Có the employees (nhóm xác định) → most of the employees. Most đứng trực tiếp trước danh từ không có the; The most là so sánh nhất; Mostly là trạng từ.' },
      { q: 'The number of international students ___ risen sharply.', options: ['have', 'are', 'has', 'were'], answer: 2, explain: 'The number of… → động từ số ít: has risen. have chia số nhiều; are và were sai cả thì lẫn số.' },
      { q: 'The research required ___ funding from private companies.', options: ['a great deal of', 'a large number of', 'several', 'many'], answer: 0, explain: 'funding không đếm được → a great deal of. a large number of, several và many chỉ đi với danh từ đếm được số nhiều.' },
      { q: '___ of the four participants received a certificate.', options: ['Every', 'All', 'The whole', 'Each'], answer: 3, explain: 'Each of + the + N số nhiều; every không đi với of.' },
      { q: 'The festival attracts visitors ___ from neighbouring provinces.', options: ['most', 'the most', 'mostly', 'most of'], answer: 2, explain: 'Cần trạng từ nghĩa "chủ yếu" bổ nghĩa cho cụm from neighbouring provinces → mostly. most, the most và most of không phải trạng từ theo nghĩa này.' },
      { q: 'Roughly a third of the land ___ used for agriculture.', options: ['are', 'is', 'were', 'have been'], answer: 1, explain: 'Phân số + of + N không đếm được (land) → động từ số ít.' },
      { q: 'Câu nào đúng?', options: ['A number of problem has been reported.', 'The whole students were tired.', 'Every of the rooms has air conditioning.', 'A number of problems have been reported.'], answer: 3, explain: 'A number of + danh từ số nhiều + động từ số nhiều → A number of problems have been reported. Câu 1 sai số danh từ; "The whole students" sai (whole đi với danh từ số ít); "Every of" sai, phải là every one of / each of.' },
      { q: 'Câu nào đúng?', options: ['There is plenty of evidence to support this view.', 'There is plenty evidence to support this view.', 'There are a great deal of evidences.', 'There is several evidence to support this view.'], answer: 0, explain: 'Plenty of + N không đếm được (evidence). Evidence không có dạng số nhiều.' },
      { q: 'Câu nào đúng?', options: ['Most of teenagers use social media.', 'The most teenagers use social media.', 'Most teenagers use social media.', 'Mostly teenagers use social media daily is common.'], answer: 2, explain: 'Nói chung chung: most + N số nhiều, không có the/of.' },
      { q: 'Câu nào cùng nghĩa? "62% of the respondents supported the plan."', options: ['A minority of the respondents supported the plan.', 'A majority of the respondents supported the plan.', 'All of the respondents supported the plan.', 'Hardly any respondents supported the plan.'], answer: 1, explain: '62% là hơn một nửa → a majority (đa số). a minority = thiểu số; all = tất cả; hardly any = hầu như không ai.' },
      { q: 'Câu nào cùng nghĩa? "All the city was covered in snow."', options: ['The whole city was covered in snow.', 'Each city was covered in snow.', 'Most of the cities were covered in snow.', 'Every cities were covered in snow.'], answer: 0, explain: 'The whole + danh từ số ít = toàn bộ → The whole city. Each city và Most of the cities đổi nghĩa thành nhiều thành phố; "Every cities" sai số.' },
      { q: 'Câu nào cùng nghĩa? "Every student received a booklet."', options: ['Some students received a booklet.', 'The number of students received a booklet.', 'Most students received a booklet.', 'Each of the students received a booklet.'], answer: 3, explain: 'Every student = each of the students (không sót ai).' }
    ]
  });

  /* 3. Paraphrase structures */
  G.push({
    id: 'paraphrase-structures', unit: 'academic', order: 3,
    title: 'Viết lại câu (1): các cấu trúc tương đương', en: 'Sentence Transformation: Equivalent Structures', level: 'B2', emoji: '🔁',
    summary: 'Nắm các cặp cấu trúc cùng nghĩa: too…to ↔ so…that ↔ not…enough, although ↔ despite, because ↔ because of, it takes ↔ spend, prefer ↔ would rather, used to ↔ no longer, it was not until…that, this is the first time ↔ have never…before, chủ động ↔ bị động, so sánh hơn ↔ so sánh nhất.',
    blocks: [
      { type: 'diagram', caption: 'Một ý – ba cách diễn đạt', steps: [
        { t: 'The suitcase was very heavy. I couldn\'t lift it.', c: 'note' },
        { t: '↓ too + adj + (for sb) + to V', c: 'arrow' },
        { t: 'The suitcase was too heavy for me to lift.', c: 'result' },
        { t: '↓ so + adj + that + mệnh đề', c: 'arrow' },
        { t: 'The suitcase was so heavy that I couldn\'t lift it.', c: 'active' },
        { t: '↓ not + adj trái nghĩa + enough + to V', c: 'arrow' },
        { t: 'I wasn\'t strong enough to lift the suitcase.', c: 'passive' }
      ] },
      { type: 'formula', rows: [
        { label: 'Although → Despite', parts: [ { t: 'Despite / In spite of', c: 'adv' }, { t: 'N / V-ing / the fact that', c: 'obj' }, { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' } ], ex: 'Despite earning a high salary, he struggled to save money.' },
        { label: 'It takes ↔ spend', parts: [ { t: 'It takes', c: 'verb' }, { t: 'sb', c: 'obj' }, { t: 'thời gian', c: 'time' }, { t: 'to V', c: 'verb' } ], ex: 'It took me three hours to finish the assignment. = I spent three hours finishing the assignment.' },
        { label: 'Không còn nữa', parts: [ { t: 'S', c: 'subj' }, { t: 'no longer', c: 'neg' }, { t: 'V', c: 'verb' } ], ex: 'She used to smoke. → She no longer smokes. / She doesn\'t smoke any more.' },
        { label: 'Mãi đến khi', parts: [ { t: 'It was not until', c: 'neg' }, { t: 'mốc thời gian', c: 'time' }, { t: 'that', c: 'aux' }, { t: 'S + V2', c: 'verb' } ], ex: 'It was not until 2015 that the bridge was completed.' },
        { label: 'Lần đầu ↔ chưa từng', parts: [ { t: 'This is the first time', c: 'time' }, { t: 'S', c: 'subj' }, { t: 'have/has', c: 'aux' }, { t: 'V3', c: 'verb' } ], ex: 'This is the first time I have visited Scotland. = I have never visited Scotland before.' }
      ] },
      { type: 'uses', items: [
        { title: 'Because + mệnh đề ↔ because of / due to + cụm danh từ', ex: 'The flight was cancelled because of the storm.', vi: 'Chuyến bay bị hủy vì bão.' },
        { title: 'Prefer A to B ↔ would rather A than B', ex: 'I would rather cook at home than eat out.', vi: 'Tôi thích nấu ăn ở nhà hơn là ăn ngoài.' },
        { title: 'Chủ động ↔ bị động', ex: 'The new library was opened by the mayor.', vi: 'Thư viện mới được thị trưởng khai trương.' },
        { title: 'So sánh hơn ↔ so sánh nhất', ex: 'No other city in the country is as expensive as London.', vi: 'Không thành phố nào trong nước đắt đỏ bằng London.' },
        { title: 'Such + (a) + adj + N + that', ex: 'It was such a boring lecture that half the audience left.', vi: 'Đó là một bài giảng chán đến mức một nửa khán giả bỏ về.' }
      ] },
      { type: 'table', head: ['Câu gốc', 'Viết lại'], rows: [
        ['Although it rained, we played.', 'Despite the rain, we played.'],
        ['He was too young to vote.', 'He wasn\'t old enough to vote.'],
        ['I prefer tea to coffee.', 'I\'d rather drink tea than coffee.'],
        ['He used to live in Hue.', 'He no longer lives in Hue.'],
        ['This is the best film I have ever seen.', 'I have never seen a better film than this.'],
        ['He didn\'t learn to drive until he was 30.', 'It was not until he was 30 that he learnt to drive.']
      ] },
      { type: 'tip', text: 'Khi viết lại, kiểm tra 3 điều: (1) nghĩa giữ nguyên, (2) thì giữ nguyên, (3) loại từ đi sau cấu trúc mới (despite + N/V-ing, because + mệnh đề, would rather + V nguyên mẫu).' },
      { type: 'mistake', wrong: 'Despite it was expensive, she bought the dress.', right: 'Despite the fact that it was expensive / Although it was expensive, she bought the dress.', why: 'Despite không đi trực tiếp với mệnh đề; cần N, V-ing hoặc the fact that.' },
      { type: 'mistake', wrong: 'The coffee was too hot for me to drink it.', right: 'The coffee was too hot for me to drink.', why: 'Khi chủ ngữ cũng là tân ngữ của động từ sau too…to, bỏ tân ngữ "it".' },
      { type: 'mistake', wrong: 'I would rather to stay at home.', right: 'I would rather stay at home.', why: 'Would rather + V nguyên mẫu không to.' },
      { type: 'ielts', text: 'Kỹ năng viết lại câu giúp bạn tránh lặp cấu trúc trong Writing và nhận ra câu trả lời "đội lốt" trong Reading (đáp án thường là phiên bản viết lại của câu trong bài).', ex: 'Despite heavy investment, the scheme failed to attract enough users.' }
    ],
    quiz: [
      { q: 'The box was ___ heavy for the child to carry.', options: ['so', 'too', 'such', 'enough'], answer: 1, explain: 'too + tính từ + for sb + to V (quá… đến nỗi ai đó không thể…) → too heavy for the child to carry.' },
      { q: '___ the traffic, we arrived on time.', options: ['Although', 'Because', 'Despite', 'Even'], answer: 2, explain: 'Sau chỗ trống là cụm danh từ (the traffic) và ý tương phản → Despite. Although cần mệnh đề; Because sai nghĩa; Even phải là Even though + mệnh đề.' },
      { q: 'It ___ me two weeks to get used to the new job.', options: ['took', 'spent', 'cost', 'needed'], answer: 0, explain: 'It takes/took + sb + thời gian + to V → It took me two weeks. spend phải dùng người làm chủ ngữ (I spent…); cost dùng cho tiền; needed không đi với cấu trúc này.' },
      { q: 'I\'d rather ___ by train than by coach.', options: ['to travel', 'travelling', 'travelled', 'travel'], answer: 3, explain: 'would rather + V nguyên mẫu (… than + V) → I\'d rather travel. Sau would rather không dùng to V, V-ing hay V2.' },
      { q: 'It was not until midnight ___ the results were announced.', options: ['when', 'that', 'which', 'then'], answer: 1, explain: 'Cấu trúc cố định: It was not until… that… → that. when, which, then không dùng trong cấu trúc này.' },
      { q: 'This is the first time I ___ a presentation in English.', options: ['give', 'gave', 'have given', 'am giving'], answer: 2, explain: 'This is the first time + hiện tại hoàn thành → I have given. give và am giving sai thì; gave là quá khứ đơn, không dùng sau "This is the first time".' },
      { q: 'Câu nào đúng?', options: ['He isn\'t enough tall to join the team.', 'He isn\'t tall enough to join the team.', 'He is too short enough to join the team.', 'He isn\'t so tall to join the team.'], answer: 1, explain: 'enough đứng SAU tính từ: tall enough to V. "enough tall" sai vị trí; "too short enough" trộn hai cấu trúc; "so tall to" phải là so tall that…' },
      { q: 'Câu nào đúng?', options: ['In spite of feeling ill, she sat the exam.', 'In spite feeling ill, she sat the exam.', 'In spite of she felt ill, she sat the exam.', 'Despite of feeling ill, she sat the exam.'], answer: 0, explain: 'In spite of / Despite (không có of) + V-ing → In spite of feeling ill. "In spite feeling" thiếu of; "In spite of she felt" đặt mệnh đề sau giới từ; "Despite of" thừa of.' },
      { q: 'Câu nào đúng?', options: ['She no longer works at the bank any more.', 'She doesn\'t work at the bank no longer.', 'She used to working at the bank.', 'She doesn\'t work at the bank any more.'], answer: 3, explain: 'Not … any more HOẶC no longer – không dùng cả hai cùng lúc.' },
      { q: 'Câu nào cùng nghĩa? "I have never eaten durian before."', options: ['This is the last time I eat durian.', 'I ate durian for the first time a long time ago.', 'This is the first time I have eaten durian.', 'I have eaten durian many times.'], answer: 2, explain: 'Never … before = this is the first time + hiện tại hoàn thành.' },
      { q: 'Câu nào cùng nghĩa? "Mount Everest is the highest mountain in the world."', options: ['No mountain in the world is higher than Mount Everest.', 'Mount Everest is higher than some mountains.', 'Mount Everest is as high as other mountains.', 'Some mountains are higher than Mount Everest.'], answer: 0, explain: 'So sánh nhất ↔ No… + so sánh hơn + than → No mountain in the world is higher than Mount Everest. Các câu khác làm sai nghĩa (Everest chỉ cao hơn vài núi, bằng núi khác, hoặc thấp hơn).' },
      { q: 'Câu nào cùng nghĩa? "Because the instructions were unclear, many candidates made mistakes."', options: ['Although the instructions were unclear, few candidates made mistakes.', 'Many candidates made mistakes in spite of the unclear instructions.', 'The instructions were unclear because many candidates made mistakes.', 'Because of the unclear instructions, many candidates made mistakes.'], answer: 3, explain: 'Because + mệnh đề → because of + cụm danh từ, giữ nguyên quan hệ nhân quả.' }
    ]
  });

  /* 4. Paraphrasing for IELTS */
  G.push({
    id: 'paraphrase-ielts', unit: 'academic', order: 4,
    title: 'Viết lại câu (2): kỹ thuật paraphrase IELTS', en: 'Paraphrasing Techniques for IELTS', level: 'B2', emoji: '✍️',
    summary: 'Năm kỹ thuật paraphrase: đổi từ đồng nghĩa, đổi dạng từ, đổi cấu trúc câu, đổi chủ ngữ, danh từ hóa. Kết hợp 2–3 kỹ thuật để viết lại đề Task 1 và Task 2 mà không chép nguyên văn.',
    blocks: [
      { type: 'diagram', caption: 'Paraphrase một đề Task 2 qua từng bước', steps: [
        { t: 'Đề: Many people believe that children should learn a foreign language at primary school.', c: 'note' },
        { t: '① Đồng nghĩa: many people → a large number of people; children → young learners', c: 'arrow' },
        { t: '② Đổi cấu trúc: believe that… → it is widely believed that…', c: 'arrow' },
        { t: '③ Danh từ hóa: learn a foreign language → foreign language education', c: 'arrow' },
        { t: 'It is widely believed that foreign language education should begin in the first years of schooling.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Đổi chủ ngữ (Task 1)', parts: [ { t: 'The graph', c: 'subj' }, { t: 'shows', c: 'verb' }, { t: 'the number of…', c: 'obj' } ], ex: 'The line graph illustrates how many tourists visited three countries between 2000 and 2020.' },
        { label: 'Bị động khách quan', parts: [ { t: 'It', c: 'subj' }, { t: 'is', c: 'aux' }, { t: 'widely argued / often claimed', c: 'verb' }, { t: 'that + mệnh đề', c: 'obj' } ], ex: 'It is often claimed that technology has made people less sociable.' },
        { label: 'Danh từ hóa', parts: [ { t: 'The + N (từ động từ/tính từ)', c: 'subj' }, { t: 'of + N', c: 'obj' }, { t: 'V', c: 'verb' } ], ex: 'The rapid growth of cities has put pressure on housing.' },
        { label: 'Đổi dạng từ', parts: [ { t: 'adj + N', c: 'obj' }, { t: '↔', c: 'aux' }, { t: 'V + adv', c: 'verb' } ], ex: 'a sharp increase in sales → sales increased sharply' }
      ] },
      { type: 'uses', items: [
        { title: 'Từ đồng nghĩa (chọn từ cùng sắc thái, cùng văn phong)', ex: 'harmful → detrimental; important → crucial; help → assist', vi: 'có hại → gây hại nghiêm trọng; quan trọng → then chốt; giúp → hỗ trợ' },
        { title: 'Đổi dạng từ: động từ ↔ danh từ ↔ tính từ', ex: 'Prices rose dramatically. → There was a dramatic rise in prices.', vi: 'Giá tăng mạnh. → Có một sự tăng mạnh về giá.' },
        { title: 'Đổi cấu trúc: chủ động ↔ bị động, mệnh đề ↔ cụm từ', ex: 'Governments should fund public transport. → Public transport should be funded by the state.', vi: 'Chính phủ nên tài trợ giao thông công cộng.' },
        { title: 'Đổi chủ ngữ: con người ↔ sự vật / hiện tượng', ex: 'People are spending more on food. → Spending on food is rising.', vi: 'Người ta chi tiêu nhiều hơn cho thực phẩm.' },
        { title: 'Danh từ hóa để câu trang trọng, gọn', ex: 'Because unemployment increased, crime rose. → The increase in unemployment led to a rise in crime.', vi: 'Thất nghiệp tăng dẫn đến tội phạm tăng.' }
      ] },
      { type: 'table', head: ['Trong đề', 'Paraphrase gợi ý'], rows: [
        ['The chart shows', 'The bar chart compares / illustrates / gives information about'],
        ['from 1990 to 2010', 'over a 20-year period / between 1990 and 2010'],
        ['people in the UK', 'British residents / the UK population'],
        ['some people think', 'it is sometimes argued that / one school of thought holds that'],
        ['use the internet', 'internet usage / go online'],
        ['old people', 'the elderly / senior citizens']
      ] },
      { type: 'tip', text: 'Không cần đổi MỌI từ. Từ chuyên môn (carbon emissions, primary school, GDP) có thể giữ nguyên; thay bằng từ lạ nghĩa sai còn bị trừ điểm nặng hơn.' },
      { type: 'tip', text: 'Paraphrase an toàn nhất = đổi cấu trúc + đổi dạng từ, vì rủi ro sai nghĩa thấp hơn chỉ thay từ đồng nghĩa.' },
      { type: 'mistake', wrong: 'The graph shows the number of tourists → The graph indicates the amount of tourists.', right: 'The graph indicates the number of tourists / how many tourists…', why: 'Amount of đi với danh từ không đếm được; tourists đếm được nên giữ number.' },
      { type: 'mistake', wrong: 'Children should learn languages → Kids must study tongues.', right: 'Young learners ought to study foreign languages.', why: 'Kids là văn nói; tongues sai sắc thái; must mạnh hơn should → sai nghĩa.' },
      { type: 'mistake', wrong: 'Crime has increased → Crime has been increasement.', right: 'There has been an increase in crime.', why: 'Không có từ "increasement"; danh từ của increase vẫn là increase.' },
      { type: 'ielts', text: 'Câu mở bài Task 1 và Task 2 hầu như luôn là phiên bản paraphrase của đề. Giám khảo không chấm phần chép nguyên văn từ đề vào số từ, và chép nhiều làm giảm điểm Lexical Resource.', ex: 'The table provides a breakdown of household spending in five European countries in 2019.' }
    ],
    quiz: [
      { q: 'Paraphrase phù hợp nhất cho "The chart shows" là:', options: ['The chart tells', 'The chart illustrates', 'The chart speaks', 'The chart says about'], answer: 1, explain: 'Illustrates / compares / depicts là động từ học thuật chuẩn cho Task 1.' },
      { q: '"Unemployment fell slightly." → "There was a ___ fall in unemployment."', options: ['slightly', 'slight', 'slightness', 'slighter'], answer: 1, explain: 'Danh từ fall cần tính từ bổ nghĩa → a slight fall. slightly là trạng từ; slightness là danh từ; slighter là so sánh hơn, sai nghĩa.' },
      { q: '"Old people" có paraphrase trang trọng là:', options: ['old guys', 'the olds', 'the elderly', 'aged peoples'], answer: 2, explain: 'The elderly / senior citizens là cách diễn đạt chuẩn.' },
      { q: 'Danh từ hóa: "Because the city expanded, traffic increased." → "The ___ of the city led to more traffic."', options: ['expansion', 'expanding of', 'expand', 'expanded'], answer: 0, explain: 'Sau The cần danh từ: expand (mở rộng) → expansion (sự mở rộng); the expansion of the city.' },
      { q: '"Some people think…" → "It is sometimes ___ that…"', options: ['thinking', 'argued', 'argue', 'arguing'], answer: 1, explain: 'Bị động khách quan: It is + V3 + that… → It is sometimes argued that… thinking, argue, arguing không phải V3.' },
      { q: '"from 2005 to 2015" có thể viết lại là:', options: ['in a decade before', 'over a ten-year period', 'during ten years ago', 'since ten years'], answer: 1, explain: 'from 2005 to 2015 = over a ten-year period (trong giai đoạn 10 năm). "in a decade before" sai nghĩa; "during ten years ago" và "since ten years" sai ngữ pháp.' },
      { q: 'Câu nào đúng?', options: ['There was a dramatically increase in sales.', 'Sales increased dramatic.', 'There was a dramatic increase in sales.', 'Sales were dramatic increased.'], answer: 2, explain: 'tính từ + danh từ → a dramatic increase in sales. "dramatically increase" dùng trạng từ trước danh từ; "increased dramatic" cần trạng từ; "were dramatic increased" sai cấu trúc.' },
      { q: 'Câu nào đúng?', options: ['The proportion of people who owned a car rose.', 'The proportion of people who owned a car were rose.', 'The amount of people owning a car rose.', 'The number of people who owned car rose up.'], answer: 0, explain: 'The proportion of + V số ít; amount không dùng với people.' },
      { q: 'Câu nào đúng?', options: ['It is widely believe that exercise improves mood.', 'It widely believed that exercise improves mood.', 'It is widely believing that exercise improves mood.', 'It is widely believed that exercise improves mood.'], answer: 3, explain: 'It is + trạng từ + V3 + that… → It is widely believed that… "believe" chưa ở dạng V3; "It widely believed" thiếu is; "is widely believing" sai dạng.' },
      { q: 'Câu nào cùng nghĩa? "Governments should invest more money in renewable energy."', options: ['Renewable energy should receive greater investment from the state.', 'Governments invest a lot in renewable energy.', 'Renewable energy must pay for governments.', 'The state has invested enough in renewable energy.'], answer: 0, explain: 'Viết lại bằng cách đổi chủ ngữ và danh từ hóa nhưng giữ nghĩa "should" → Renewable energy should receive greater investment from the state. Các câu khác đổi nghĩa (đã đầu tư, phải trả tiền, đã đủ).' },
      { q: 'Câu nào cùng nghĩa? "The number of car owners rose sharply."', options: ['There was a slight rise in car ownership.', 'Car ownership fell considerably.', 'There was a sharp rise in car ownership.', 'Car owners remained stable.'], answer: 2, explain: 'Danh từ hóa: rose sharply → a sharp rise; the number of car owners → car ownership. A sai mức độ (slight), B sai xu hướng (fell), D sai (remained stable).' },
      { q: 'Câu nào cùng nghĩa? "Many young people find it hard to buy a house."', options: ['Young people never buy houses.', 'Most houses are bought by young people.', 'Young people prefer renting to buying.', 'Home ownership is difficult for a large number of young adults.'], answer: 3, explain: 'Đổi chủ ngữ (home ownership) + đồng nghĩa (many → a large number of), giữ nguyên nghĩa.' }
    ]
  });

  /* 5. Nouns */
  G.push({
    id: 'nouns', unit: 'words', order: 5,
    title: 'Danh từ: số nhiều đặc biệt, ghép, sở hữu, tập hợp', en: 'Nouns: Irregular Plurals, Compounds, Possessives, Collectives', level: 'B1', emoji: '📦',
    summary: 'Dùng đúng số nhiều gốc Latin/Hy Lạp (phenomenon → phenomena, criterion → criteria), danh từ ghép (the city centre, a ten-year plan), sở hữu \'s và of, và danh từ tập hợp như government, staff, police.',
    blocks: [
      { type: 'sort', caption: 'Bốn nhóm danh từ dễ sai trong bài viết học thuật', groups: [
        { title: 'Số nhiều đặc biệt', emoji: '🔤', items: ['phenomenon → phenomena', 'criterion → criteria', 'analysis → analyses', 'crisis → crises', 'datum → data'] },
        { title: 'Danh từ ghép', emoji: '🧷', items: ['traffic jam', 'city centre', 'air pollution', 'a five-year plan', 'mother-in-law'] },
        { title: 'Sở hữu cách', emoji: '🔑', items: ['the students\' union', 'children\'s health', 'the role of the media', 'a week\'s holiday'] },
        { title: 'Danh từ tập hợp', emoji: '👥', items: ['government', 'staff', 'police', 'audience', 'family'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Danh từ ghép', parts: [ { t: 'N1 (số ít, như tính từ)', c: 'adv' }, { t: 'N2 (danh từ chính)', c: 'subj' } ], ex: 'Road safety campaigns have reduced accidents.' },
        { label: 'Số + N ghép', parts: [ { t: 'a', c: 'aux' }, { t: 'số-N số ít', c: 'adv' }, { t: 'N', c: 'subj' } ], ex: 'The council approved a ten-year development plan.' },
        { label: 'Sở hữu \'s (người, tổ chức, thời gian)', parts: [ { t: 'N (người)', c: 'subj' }, { t: '\'s / s\'', c: 'aux' }, { t: 'N', c: 'obj' } ], ex: 'The government\'s decision surprised many economists.' },
        { label: 'Sở hữu of (vật, khái niệm)', parts: [ { t: 'the N', c: 'obj' }, { t: 'of', c: 'aux' }, { t: 'the N', c: 'subj' } ], ex: 'The cost of living in the capital has soared.' }
      ] },
      { type: 'uses', items: [
        { title: 'Phenomena / criteria / crises là SỐ NHIỀU → động từ số nhiều', ex: 'These criteria are used to assess applications.', vi: 'Các tiêu chí này được dùng để đánh giá hồ sơ.' },
        { title: 'Data: văn học thuật Anh có thể dùng số nhiều hoặc không đếm được', ex: 'The data suggest that obesity is rising. / The data suggests…', vi: 'Dữ liệu cho thấy béo phì đang gia tăng.' },
        { title: 'Police, people, cattle luôn số nhiều', ex: 'The police are investigating the incident.', vi: 'Cảnh sát đang điều tra vụ việc.' },
        { title: 'Government, staff, team: số ít (một khối) hoặc số nhiều (từng thành viên) – tiếng Anh Anh', ex: 'The staff are unhappy about the new rota.', vi: 'Nhân viên không hài lòng với lịch trực mới.' },
        { title: 'Sở hữu cách với thời gian, khoảng cách', ex: 'The museum is only ten minutes\' walk from the station.', vi: 'Bảo tàng chỉ cách nhà ga mười phút đi bộ.' }
      ] },
      { type: 'table', head: ['Số ít', 'Số nhiều', 'Ghi chú'], rows: [
        ['phenomenon', 'phenomena', 'hiện tượng'],
        ['criterion', 'criteria', 'tiêu chí'],
        ['hypothesis', 'hypotheses', 'giả thuyết (-is → -es)'],
        ['thesis', 'theses', 'luận văn'],
        ['medium', 'media', 'phương tiện truyền thông'],
        ['species / series', 'species / series', 'không đổi'],
        ['child / person', 'children / people', 'bất quy tắc thường gặp']
      ] },
      { type: 'tip', text: 'Trong danh từ ghép, danh từ đứng trước thường ở dạng SỐ ÍT, kể cả khi nghĩa là số nhiều: a shoe shop, a car park, a three-hour exam (không phải three-hours).' },
      { type: 'mistake', wrong: 'This phenomena is common in big cities.', right: 'This phenomenon is common in big cities. / These phenomena are common…', why: 'Phenomena là số nhiều; số ít là phenomenon.' },
      { type: 'mistake', wrong: 'He took a two-weeks holiday.', right: 'He took a two-week holiday. / He took two weeks\' holiday.', why: 'Cụm số + danh từ có gạch nối dùng danh từ số ít.' },
      { type: 'mistake', wrong: 'The police is looking for the suspect.', right: 'The police are looking for the suspect.', why: 'Police luôn đi với động từ số nhiều.' },
      { type: 'ielts', text: 'Danh từ ghép giúp viết gọn và học thuật hơn: "problems about traffic in cities" → "urban traffic problems". Dùng đúng criteria / phenomena / analyses thể hiện Grammatical Accuracy và Lexical Resource.', ex: 'Several criteria should be considered when allocating the healthcare budget.' }
    ],
    quiz: [
      { q: 'Global warming is a ___ that affects every continent.', options: ['phenomena', 'phenomenons', 'phenomenon', 'phenomenas'], answer: 2, explain: 'Có mạo từ a → danh từ số ít phenomenon. phenomena là số nhiều; "phenomenons", "phenomenas" sai dạng.' },
      { q: 'The selection ___ for the scholarship are very strict.', options: ['criteria', 'criterion', 'criterias', 'criterions'], answer: 0, explain: 'Động từ are → danh từ số nhiều criteria. criterion là số ít; "criterias", "criterions" sai dạng.' },
      { q: 'The police ___ arrested three men.', options: ['has', 'is', 'was', 'have'], answer: 3, explain: 'police luôn được coi là số nhiều → have arrested. has, is, was đều chia số ít.' },
      { q: 'We stayed in a ___ hotel near the beach.', options: ['five-stars', 'five-star', 'five stars', 'five-star\'s'], answer: 1, explain: 'Số + danh từ ghép làm tính từ → số ít có gạch nối.' },
      { q: 'The ___ union organised a protest against the fee increase.', options: ['students\'', 'student\'s', 'students', 'studentses\''], answer: 0, explain: 'Hội của nhiều sinh viên → students\' (sở hữu số nhiều). Student union cũng chấp nhận nhưng không có trong lựa chọn.' },
      { q: 'Several ___ were proposed to explain the results.', options: ['hypothesis', 'hypothesises', 'hypothesis\'', 'hypotheses'], answer: 3, explain: 'Danh từ tận cùng -is đổi thành -es ở số nhiều: hypothesis → hypotheses; Several đòi hỏi danh từ số nhiều.' },
      { q: 'Câu nào đúng?', options: ['The roof of the house was damaged.', 'The house\'s of roof was damaged.', 'The roof\'s house was damaged.', 'The roof of house\'s was damaged.'], answer: 0, explain: 'Vật sở hữu vật thường dùng of → the roof of the house. Các phương án khác dùng sở hữu cách \'s sai vị trí hoặc sai nghĩa.' },
      { q: 'Câu nào đúng?', options: ['The childrens\' playground is closed.', 'The children\'s playground is closed.', 'The childs\' playground is closed.', 'The childrens playground is closed.'], answer: 1, explain: 'Children đã là số nhiều bất quy tắc → thêm \'s: children\'s.' },
      { q: 'Câu nào đúng?', options: ['These data has been collected carefully.', 'This datas were collected carefully.', 'The datas were collected carefully.', 'These data were collected carefully.'], answer: 3, explain: 'Data không thêm -s; dùng số nhiều these data were (hoặc this data was).' },
      { q: 'Câu nào cùng nghĩa? "a plan that lasts for five years"', options: ['a five years plan', 'a five-year plan', 'a plan of five year', 'a five-years\' plan'], answer: 1, explain: 'Số + danh từ làm tính từ trước danh từ: dùng gạch nối và danh từ số ít → a five-year plan. "five years plan" sai số; "a plan of five year" thiếu s; "five-years\' plan" sai dạng.' },
      { q: 'Câu nào cùng nghĩa? "the pollution of the air in cities"', options: ['urban air pollution', 'city\'s airs pollution', 'air\'s urban pollutions', 'pollutions of air city'], answer: 0, explain: 'Danh từ ghép gọn và học thuật: urban air pollution.' },
      { q: 'Câu nào cùng nghĩa? "The decision that the government made was unpopular."', options: ['The decision\'s government was unpopular.', 'The government decision\'s was unpopular.', 'The government of decision was unpopular.', 'The government\'s decision was unpopular.'], answer: 3, explain: 'Tổ chức sở hữu → \'s: the government\'s decision. Các phương án khác đặt \'s sai vị trí hoặc đảo nghĩa.' }
    ]
  });

  /* 6. Verb types */
  G.push({
    id: 'verb-types', unit: 'verbs', order: 6,
    title: 'Các loại động từ', en: 'Verb Types: Transitive, Intransitive, Linking, Ditransitive', level: 'B1', emoji: '⚙️',
    summary: 'Phân biệt nội động từ (rise, happen) và ngoại động từ (raise, reduce), động từ nối + tính từ (become, seem, remain), động từ bất quy tắc thường gặp trong IELTS và động từ có hai tân ngữ (give sb sth / give sth to sb).',
    blocks: [
      { type: 'sort', caption: 'Bốn nhóm động từ theo cách đi với tân ngữ', groups: [
        { title: 'Nội động từ (không tân ngữ)', emoji: '🚶', items: ['rise', 'fall', 'happen', 'occur', 'arrive', 'remain stable'] },
        { title: 'Ngoại động từ (cần tân ngữ)', emoji: '🎯', items: ['raise prices', 'reduce costs', 'discuss a topic', 'affect health', 'lay the table'] },
        { title: 'Động từ nối (+ tính từ)', emoji: '🔗', items: ['become', 'seem', 'remain', 'appear', 'grow', 'look'] },
        { title: 'Hai tân ngữ', emoji: '🎁', items: ['give', 'offer', 'lend', 'send', 'show', 'teach'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Nội động từ', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: '(adv / cụm giới từ)', c: 'adv' } ], ex: 'The population rose steadily over the decade.' },
        { label: 'Ngoại động từ', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'The bank raised interest rates.' },
        { label: 'Động từ nối', parts: [ { t: 'S', c: 'subj' }, { t: 'become / seem / remain', c: 'verb' }, { t: 'adj / N', c: 'obj' } ], ex: 'Unemployment remained high throughout 2021.' },
        { label: 'Hai tân ngữ', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'O người', c: 'obj' }, { t: 'O vật', c: 'obj' } ], ex: 'The university offered her a full scholarship.' },
        { label: 'Hai tân ngữ (đảo)', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'O vật', c: 'obj' }, { t: 'to / for + người', c: 'adv' } ], ex: 'The university offered a full scholarship to her.' }
      ] },
      { type: 'uses', items: [
        { title: 'Rise / fall / increase: nội động từ trong mô tả biểu đồ', ex: 'Sales fell to their lowest point in March.', vi: 'Doanh số giảm xuống mức thấp nhất vào tháng Ba.' },
        { title: 'Raise / lower / reduce: ngoại động từ – có người tác động', ex: 'The company lowered its prices to attract customers.', vi: 'Công ty hạ giá để thu hút khách hàng.' },
        { title: 'Động từ nối + TÍNH TỪ, không + trạng từ', ex: 'The figures remained relatively stable.', vi: 'Số liệu duy trì tương đối ổn định.' },
        { title: 'Give / show / send + người + vật', ex: 'Could you send me the reading list?', vi: 'Bạn có thể gửi cho tôi danh sách bài đọc không?' },
        { title: 'Buy / make / cook + vật + FOR người', ex: 'She bought a dictionary for her brother.', vi: 'Cô ấy mua một cuốn từ điển cho em trai.' }
      ] },
      { type: 'table', head: ['V1', 'V2', 'V3', 'Ghi chú IELTS'], rows: [
        ['rise', 'rose', 'risen', 'nội động từ: prices rose'],
        ['raise', 'raised', 'raised', 'ngoại động từ: raise awareness'],
        ['fall', 'fell', 'fallen', 'đừng nhầm với feel – felt'],
        ['lie (nằm)', 'lay', 'lain', 'nội động từ'],
        ['lay (đặt)', 'laid', 'laid', 'ngoại động từ'],
        ['seek', 'sought', 'sought', 'seek advice'],
        ['undergo', 'underwent', 'undergone', 'undergo changes (Task 1 bản đồ)'],
        ['forecast', 'forecast', 'forecast', 'không đổi']
      ] },
      { type: 'tip', text: 'Nội động từ KHÔNG có bị động: không nói "The accident was happened". Chỉ ngoại động từ mới có thể chuyển sang bị động.' },
      { type: 'tip', text: 'Explain, describe, suggest, introduce, announce KHÔNG có hai tân ngữ: explain sth TO sb, describe sth TO sb.' },
      { type: 'mistake', wrong: 'The number of visitors raised in 2019.', right: 'The number of visitors rose in 2019.', why: 'Không có tân ngữ → dùng nội động từ rise (rose). Raise cần tân ngữ.' },
      { type: 'mistake', wrong: 'The accident was happened at night.', right: 'The accident happened at night.', why: 'Happen là nội động từ, không có dạng bị động.' },
      { type: 'mistake', wrong: 'Prices remained steadily.', right: 'Prices remained steady.', why: 'Remain là động từ nối → theo sau là tính từ steady.' },
      { type: 'ielts', text: 'Task 1 bản đồ và biểu đồ dùng nhiều nội động từ (rise, decline, fluctuate) và động từ nối (remain, become). Task 2 cần ngoại động từ mạnh (reduce, tackle, raise awareness). Nhầm rise/raise là lỗi phổ biến làm mất điểm Grammatical Accuracy.', ex: 'The village underwent dramatic changes, and the old school became a community centre.' }
    ],
    quiz: [
      { q: 'Oil prices ___ significantly in the first quarter.', options: ['raised', 'rose', 'were risen', 'rised'], answer: 1, explain: 'Không có tân ngữ → nội động từ rise, quá khứ rose.' },
      { q: 'The campaign aims to ___ awareness of mental health.', options: ['rise', 'arise', 'raise', 'risen'], answer: 2, explain: 'Có tân ngữ (awareness) → ngoại động từ raise (nâng cao). rise và arise là nội động từ, không có tân ngữ; risen là V3.' },
      { q: 'The number of members remained ___ over the period.', options: ['constantly', 'constancy', 'constants', 'constant'], answer: 3, explain: 'remain là động từ nối → theo sau là tính từ constant. constantly là trạng từ; constancy và constants là danh từ.' },
      { q: 'The library ___ several renovations since it opened.', options: ['has undergone', 'has underwent', 'has undergo', 'undergoed'], answer: 0, explain: 'Undergo – underwent – undergone; hiện tại hoàn thành dùng V3.' },
      { q: 'Could you lend ___?', options: ['to me your notes', 'me your notes', 'your notes me', 'for me your notes'], answer: 1, explain: 'lend + người + vật → lend me your notes (hoặc lend your notes to me). "to me your notes", "your notes me", "for me your notes" sai trật tự/giới từ.' },
      { q: 'He ___ down on the sofa and fell asleep.', options: ['laid', 'lied', 'lay', 'layed'], answer: 2, explain: 'Lie (nằm) – lay – lain. Laid là quá khứ của lay (đặt).' },
      { q: 'Câu nào đúng?', options: ['The teacher explained us the rule.', 'The teacher explained the rule to us.', 'The teacher explained to us about the rule.', 'The teacher explained for us the rule.'], answer: 1, explain: 'explain không có hai tân ngữ: explain sth TO sb (không nói explain sb sth) → explained the rule to us.' },
      { q: 'Câu nào đúng?', options: ['The problem was occurred last week.', 'The problem occurred last week.', 'The problem was occur last week.', 'The problem occured by last week.'], answer: 1, explain: 'Occur là nội động từ, không bị động; quá khứ viết occurred (gấp đôi r).' },
      { q: 'Câu nào đúng?', options: ['The situation became worse.', 'The situation became worsely.', 'The situation became badly.', 'The situation became more bad.'], answer: 0, explain: 'become là động từ nối + tính từ → became worse. "worsely" không tồn tại; badly là trạng từ; "more bad" sai dạng so sánh.' },
      { q: 'Câu nào cùng nghĩa? "The company gave each employee a bonus."', options: ['The company gave a bonus for each employee.', 'Each employee gave the company a bonus.', 'The company gave a bonus to each employee.', 'The company was given a bonus by each employee.'], answer: 2, explain: 'give sb sth = give sth TO sb → gave a bonus to each employee. Không dùng for với give.' },
      { q: 'Câu nào cùng nghĩa? "The government increased the tax on cigarettes."', options: ['The tax on cigarettes was raised by the government.', 'The tax on cigarettes raised by the government.', 'The government rose the tax on cigarettes.', 'The cigarettes increased the government\'s tax.'], answer: 0, explain: 'Chuyển sang bị động: raise là ngoại động từ nên viết was raised; rose không đi với tân ngữ.' },
      { q: 'Câu nào cùng nghĩa? "My aunt made a cake for me."', options: ['My aunt made to me a cake.', 'My aunt made me a cake.', 'My aunt made a cake me.', 'I made my aunt a cake.'], answer: 1, explain: 'make sth FOR sb = make sb sth (làm cái gì cho ai) → My aunt made me a cake.' }
    ]
  });

  /* 7. Conjunctions */
  G.push({
    id: 'conjunctions', unit: 'sentences', order: 7,
    title: 'Liên từ', en: 'Conjunctions: Coordinating, Correlative, Subordinating', level: 'B1', emoji: '🪢',
    summary: 'Ba loại liên từ: kết hợp (FANBOYS: for, and, nor, but, or, yet, so), tương liên (both…and, either…or, neither…nor, not only…but also) và phụ thuộc (because, although, if, when, while…). Kèm quy tắc dấu phẩy.',
    blocks: [
      { type: 'sort', caption: 'Ba nhóm liên từ', groups: [
        { title: 'Kết hợp – FANBOYS', emoji: '➕', items: ['for', 'and', 'nor', 'but', 'or', 'yet', 'so'] },
        { title: 'Tương liên (đi theo cặp)', emoji: '👯', items: ['both … and', 'either … or', 'neither … nor', 'not only … but also', 'whether … or'] },
        { title: 'Phụ thuộc', emoji: '🧲', items: ['because', 'although', 'if', 'unless', 'when', 'while', 'since'] },
        { title: 'KHÔNG phải liên từ (trạng từ nối)', emoji: '🚫', items: ['however', 'therefore', 'moreover', 'nevertheless'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Câu ghép với FANBOYS', parts: [ { t: 'Mệnh đề 1', c: 'subj' }, { t: ', but / so / yet', c: 'aux' }, { t: 'Mệnh đề 2', c: 'verb' } ], ex: 'The course was demanding, but most students enjoyed it.' },
        { label: 'Liên từ phụ thuộc đứng đầu', parts: [ { t: 'Although / Because + mệnh đề phụ', c: 'adv' }, { t: ',', c: 'aux' }, { t: 'mệnh đề chính', c: 'subj' } ], ex: 'Although the flat is small, it is very well located.' },
        { label: 'Liên từ phụ thuộc đứng giữa', parts: [ { t: 'Mệnh đề chính', c: 'subj' }, { t: 'because / although (không phẩy)', c: 'adv' }, { t: 'mệnh đề phụ', c: 'verb' } ], ex: 'Many people cycle to work because it saves money.' },
        { label: 'Neither … nor', parts: [ { t: 'Neither A', c: 'subj' }, { t: 'nor B', c: 'subj' }, { t: 'V (hòa hợp với B)', c: 'verb' } ], ex: 'Neither the manager nor the employees were informed.' },
        { label: 'Not only … but also', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'not only A', c: 'obj' }, { t: 'but also B', c: 'obj' } ], ex: 'Cycling is not only cheap but also good for your health.' }
      ] },
      { type: 'uses', items: [
        { title: 'Yet = nhưng (bất ngờ, trang trọng hơn but)', ex: 'The city is wealthy, yet many residents live in poverty.', vi: 'Thành phố giàu có, vậy mà nhiều cư dân sống trong nghèo đói.' },
        { title: 'Nor sau mệnh đề phủ định → đảo ngữ', ex: 'The plan was not popular, nor was it affordable.', vi: 'Kế hoạch không được ủng hộ, cũng không hợp túi tiền.' },
        { title: 'Both … and → động từ số nhiều', ex: 'Both the cost and the quality matter to consumers.', vi: 'Cả giá cả lẫn chất lượng đều quan trọng với người tiêu dùng.' },
        { title: 'Either … or: lựa chọn một trong hai', ex: 'Applicants can either apply online or send a paper form.', vi: 'Ứng viên có thể nộp trực tuyến hoặc gửi đơn giấy.' },
        { title: 'While / whereas: so sánh đối lập', ex: 'Coal use declined, whereas solar power grew rapidly.', vi: 'Việc dùng than giảm, trong khi năng lượng mặt trời tăng nhanh.' }
      ] },
      { type: 'table', head: ['Tình huống', 'Dấu phẩy?', 'Ví dụ'], rows: [
        ['FANBOYS nối hai mệnh đề độc lập', 'Có (trước liên từ)', 'It was late, so we went home.'],
        ['FANBOYS nối hai từ/cụm', 'Không', 'tea and coffee'],
        ['Mệnh đề phụ đứng đầu câu', 'Có (sau mệnh đề phụ)', 'If it rains, we will stay in.'],
        ['Mệnh đề phụ đứng sau', 'Thường không', 'We will stay in if it rains.'],
        ['However / therefore giữa hai câu', 'Dùng dấu chấm hoặc chấm phẩy', 'It was late; however, we stayed.']
      ] },
      { type: 'tip', text: 'Người Việt hay nói "Tuy… nhưng…" nên viết "Although…, but…". Tiếng Anh chỉ dùng MỘT liên từ: hoặc although, hoặc but.' },
      { type: 'mistake', wrong: 'Although the test was hard, but I passed.', right: 'Although the test was hard, I passed. / The test was hard, but I passed.', why: 'Although và but không dùng cùng nhau trong một câu.' },
      { type: 'mistake', wrong: 'The rent is high, however many people still live here.', right: 'The rent is high; however, many people still live here.', why: 'However là trạng từ nối, không nối hai mệnh đề bằng dấu phẩy (lỗi comma splice).' },
      { type: 'mistake', wrong: 'Neither the students nor the teacher were there.', right: 'Neither the students nor the teacher was there.', why: 'Với neither…nor / either…or, động từ hòa hợp với danh từ gần nhất (the teacher → was).' },
      { type: 'ielts', text: 'Dùng đúng và đa dạng liên từ ảnh hưởng trực tiếp đến tiêu chí Coherence and Cohesion. Not only…but also và whereas giúp câu Task 2 và Task 1 vừa mạch lạc vừa thể hiện cấu trúc phức tạp.', ex: 'Not only does remote work cut commuting time, but it also reduces office costs.' }
    ],
    quiz: [
      { q: 'The hotel was expensive, ___ the service was poor.', options: ['so', 'or', 'yet', 'for'], answer: 2, explain: 'Hai ý trái ngược, bất ngờ (đắt mà dịch vụ kém) → yet. so chỉ kết quả; or chỉ lựa chọn; for chỉ lý do.' },
      { q: 'You can pay ___ by card or in cash.', options: ['either', 'neither', 'both', 'whether'], answer: 0, explain: 'either… or… = một trong hai → either by card or in cash. neither đi với nor; both đi với and; whether không dùng như vậy.' },
      { q: 'Neither my parents nor my brother ___ to the ceremony.', options: ['are coming', 'were coming', 'have come', 'is coming'], answer: 3, explain: 'Động từ hòa hợp với danh từ gần nhất (my brother) → is.' },
      { q: 'Public transport is ___ cheaper but also greener than driving.', options: ['both', 'not only', 'either', 'neither'], answer: 1, explain: 'Cặp liên từ not only … but also (không những… mà còn) → not only. both đi với and; either đi với or; neither đi với nor.' },
      { q: 'The roads were icy, ___ the race was postponed.', options: ['so', 'but', 'nor', 'yet'], answer: 0, explain: 'Kết quả (đường đóng băng → hoãn cuộc đua) → so. but và yet chỉ tương phản; nor dùng cho phủ định.' },
      { q: '___ the north is mountainous, the south is mostly flat.', options: ['Because', 'Whereas', 'So', 'And'], answer: 1, explain: 'So sánh đối lập hai vùng → Whereas. Because chỉ nguyên nhân; So và And không đứng đầu mệnh đề phụ như vậy.' },
      { q: 'Câu nào đúng?', options: ['Because it was raining, so we stayed home.', 'Although he is rich, but he is unhappy.', 'Although he is rich, he is unhappy.', 'He is rich, however he is unhappy.'], answer: 2, explain: 'Chỉ một liên từ: although. Câu cuối là comma splice.' },
      { q: 'Câu nào đúng?', options: ['Both the teacher and the students was surprised.', 'Both the teacher and the students were surprised.', 'Both the teacher or the students were surprised.', 'Both of the teacher and students was surprised.'], answer: 1, explain: 'Both… and… + động từ số nhiều → were surprised. was chia số ít; "Both… or" sai cặp liên từ; "Both of the teacher and students" sai cấu trúc.' },
      { q: 'Câu nào đúng?', options: ['The report was late; therefore, it was not included.', 'The report was late, therefore it was not included.', 'The report was late therefore, it was not included.', 'Therefore the report was late, it was not included.'], answer: 0, explain: 'Therefore là trạng từ nối → chấm phẩy trước, phẩy sau.' },
      { q: 'Câu nào cùng nghĩa? "He doesn\'t eat meat. He doesn\'t eat fish either."', options: ['He eats either meat or fish.', 'He eats both meat and fish.', 'He eats not only meat but also fish.', 'He eats neither meat nor fish.'], answer: 3, explain: 'Không ăn cả hai → neither… nor… Các phương án khác nói anh ấy ăn ít nhất một hoặc cả hai, trái nghĩa.' },
      { q: 'Câu nào cùng nghĩa? "The museum is free. It is also open late."', options: ['The museum is either free or open late.', 'The museum is not only free but also open late.', 'The museum is free, so it is open late.', 'Although the museum is free, it is open late.'], answer: 1, explain: 'Hai ưu điểm cộng thêm → not only… but also… either… or là lựa chọn; so là kết quả; although là tương phản, đều sai quan hệ ý.' },
      { q: 'Câu nào cùng nghĩa? "She studied hard. She failed the exam."', options: ['She studied hard, so she failed the exam.', 'Because she studied hard, she failed the exam.', 'She failed the exam, for she studied hard.', 'Although she studied hard, she failed the exam.'], answer: 3, explain: 'Hai ý tương phản (học chăm mà vẫn trượt) → Although. so, because và for diễn tả quan hệ nguyên nhân – kết quả, sai logic.' }
    ]
  });

  /* 8. Advanced reported speech */
  G.push({
    id: 'reported-advanced', unit: 'verbs', order: 8,
    title: 'Câu tường thuật nâng cao', en: 'Advanced Reported Speech', level: 'B2', emoji: '🗣️',
    summary: 'Tường thuật câu hỏi Yes/No (if/whether) và Wh- (trật tự câu khẳng định), mệnh lệnh – yêu cầu (tell/ask sb to V), và các động từ tường thuật đi kèm cấu trúc riêng: suggest, advise, deny, accuse, apologise, promise.',
    blocks: [
      { type: 'diagram', caption: 'Tường thuật câu hỏi: bỏ trợ động từ đảo, đưa về trật tự S + V', steps: [
        { t: '"Where do you live?" she asked me.', c: 'note' },
        { t: 'Câu hỏi Wh- → giữ từ để hỏi; Yes/No → if / whether', c: 'if' },
        { t: '↓ Bỏ do/does/did, đảo lại thành S + V, lùi thì', c: 'arrow' },
        { t: 'She asked me where I lived.', c: 'result' },
        { t: '"Are you ready?" → He asked if/whether I was ready.', c: 'active' },
        { t: '"Please close the door." → She asked me to close the door.', c: 'passive' }
      ] },
      { type: 'formula', rows: [
        { label: 'Câu hỏi Yes/No', parts: [ { t: 'S', c: 'subj' }, { t: 'asked (sb)', c: 'verb' }, { t: 'if / whether', c: 'aux' }, { t: 'S + V (lùi thì)', c: 'obj' } ], ex: 'The examiner asked whether I had studied abroad.' },
        { label: 'Câu hỏi Wh-', parts: [ { t: 'S', c: 'subj' }, { t: 'asked / wanted to know', c: 'verb' }, { t: 'Wh-', c: 'aux' }, { t: 'S + V (lùi thì)', c: 'obj' } ], ex: 'She wanted to know how long the course lasted.' },
        { label: 'Mệnh lệnh / yêu cầu', parts: [ { t: 'S', c: 'subj' }, { t: 'told / asked', c: 'verb' }, { t: 'sb', c: 'obj' }, { t: '(not) to V', c: 'neg' } ], ex: 'The invigilator told us not to turn over the paper.' },
        { label: 'Động từ + V-ing', parts: [ { t: 'S', c: 'subj' }, { t: 'denied / admitted / suggested', c: 'verb' }, { t: 'V-ing', c: 'obj' } ], ex: 'The minister denied knowing about the payments.' },
        { label: 'Động từ + sb + giới từ + V-ing', parts: [ { t: 'S', c: 'subj' }, { t: 'accused', c: 'verb' }, { t: 'sb', c: 'obj' }, { t: 'of + V-ing', c: 'adv' } ], ex: 'The journalist accused the company of hiding the truth.' }
      ] },
      { type: 'uses', items: [
        { title: 'Suggest + V-ing / suggest that + S + (should) V', ex: 'My tutor suggested that I (should) read more editorials.', vi: 'Gia sư gợi ý tôi nên đọc nhiều bài xã luận hơn.' },
        { title: 'Advise / warn / remind / encourage + sb + to V', ex: 'The doctor advised him to cut down on sugar.', vi: 'Bác sĩ khuyên anh ấy giảm đường.' },
        { title: 'Apologise (to sb) for + V-ing', ex: 'The airline apologised for cancelling the flight.', vi: 'Hãng bay xin lỗi vì đã hủy chuyến bay.' },
        { title: 'Promise / agree / refuse / offer + to V', ex: 'The council promised to repair the road by June.', vi: 'Hội đồng hứa sửa đường trước tháng Sáu.' },
        { title: 'Thank / blame / congratulate + sb + for / on + V-ing', ex: 'They congratulated her on winning the award.', vi: 'Họ chúc mừng cô ấy đã giành giải thưởng.' }
      ] },
      { type: 'table', head: ['Cấu trúc', 'Động từ'], rows: [
        ['+ to V', 'promise, agree, refuse, offer, threaten'],
        ['+ sb + to V', 'tell, ask, advise, warn, remind, encourage, persuade'],
        ['+ V-ing', 'deny, admit, suggest, recommend'],
        ['+ (sb) + giới từ + V-ing', 'apologise for, accuse sb of, blame sb for, insist on, congratulate sb on'],
        ['+ that + mệnh đề', 'explain, suggest, admit, insist, complain']
      ] },
      { type: 'tip', text: 'Câu hỏi tường thuật KHÔNG còn dấu hỏi và KHÔNG đảo trợ động từ: He asked where the station WAS (không phải "where was the station?").' },
      { type: 'mistake', wrong: 'She asked me where did I live.', right: 'She asked me where I lived.', why: 'Câu hỏi tường thuật dùng trật tự câu khẳng định, bỏ did.' },
      { type: 'mistake', wrong: 'He suggested me to apply for the job.', right: 'He suggested that I apply for the job. / He suggested applying for the job.', why: 'Suggest không theo mẫu sb + to V.' },
      { type: 'mistake', wrong: 'The man denied to steal the wallet.', right: 'The man denied stealing the wallet.', why: 'Deny + V-ing.' },
      { type: 'ielts', text: 'Động từ tường thuật (claim, argue, suggest, deny, admit) giúp trình bày quan điểm người khác trong Task 2 thay vì chỉ "say". Trong Speaking Part 3, tường thuật lại ý kiến người khác cũng là cách thể hiện range.', ex: 'Some experts have suggested introducing a tax on sugary drinks.' }
    ],
    quiz: [
      { q: 'The interviewer asked me ___ I had any experience.', options: ['that', 'whether', 'what', 'do'], answer: 1, explain: 'Câu hỏi Yes/No khi tường thuật → whether/if. that dùng cho câu trần thuật; what dùng cho câu hỏi Wh-; do không đứng trong câu gián tiếp.' },
      { q: 'She asked me what time the train ___.', options: ['did leave', 'does leave', 'left', 'leaves it'], answer: 2, explain: 'Câu hỏi gián tiếp: S + V, lùi thì → the train left. "did leave", "does leave" giữ trợ động từ; "leaves it" sai thì và thừa it.' },
      { q: 'The teacher told us ___ our phones during the test.', options: ['not to use', 'don\'t use', 'not using', 'to not using'], answer: 0, explain: 'Câu mệnh lệnh phủ định khi tường thuật: tell sb (not) to V → told us not to use.' },
      { q: 'The company apologised ___ the delay.', options: ['about causing', 'to cause', 'for cause', 'for causing'], answer: 3, explain: 'apologise FOR + V-ing (xin lỗi vì đã…) → apologised for causing.' },
      { q: 'The police accused him ___ the documents.', options: ['for forging', 'of forging', 'to forge', 'about forging'], answer: 1, explain: 'accuse sb OF + V-ing (buộc tội ai đã…) → accused him of forging.' },
      { q: 'My friend promised ___ me with the move.', options: ['helping', 'to help', 'me to help', 'help'], answer: 1, explain: 'promise + to V (hứa sẽ làm gì) → promised to help.' },
      { q: 'Câu nào đúng?', options: ['He asked me why was I late.', 'He asked me why I was late.', 'He asked me why I was late?', 'He asked to me why I was late.'], answer: 1, explain: 'Wh- + S + V (không đảo), không có dấu hỏi, ask sb (không dùng to) → He asked me why I was late. Câu 1 đảo ngữ; câu 3 thừa dấu hỏi; câu 4 thừa to.' },
      { q: 'Câu nào đúng?', options: ['She advised me to see a specialist.', 'She advised me seeing a specialist.', 'She advised to me to see a specialist.', 'She advised me that see a specialist.'], answer: 0, explain: 'advise sb + to V (khuyên ai làm gì) → advised me to see a specialist.' },
      { q: 'Câu nào đúng?', options: ['They suggested to take a taxi.', 'They suggested us to take a taxi.', 'They suggested taking a taxi.', 'They suggested take a taxi.'], answer: 2, explain: 'suggest + V-ing (hoặc suggest that we take…) → suggested taking. "suggested to take", "suggested us to take", "suggested take" đều sai cấu trúc.' },
      { q: 'Câu nào cùng nghĩa? "I didn\'t break the window," said Tom.', options: ['Tom admitted breaking the window.', 'Tom refused to break the window.', 'Tom apologised for breaking the window.', 'Tom denied breaking the window.'], answer: 3, explain: 'Phủ nhận việc đã làm → deny + V-ing → Tom denied breaking the window. admitted là thừa nhận (trái nghĩa); refused là từ chối làm; apologised là xin lỗi vì đã làm.' },
      { q: 'Câu nào cùng nghĩa? "Why don\'t we visit the museum?" said Lan.', options: ['Lan suggested visiting the museum.', 'Lan asked why we didn\'t visit the museum.', 'Lan refused to visit the museum.', 'Lan told us visit the museum.'], answer: 0, explain: '"Why don\'t we…?" là lời gợi ý → suggest + V-ing → Lan suggested visiting the museum. Câu 2 hiểu sai thành câu hỏi lý do; refused trái nghĩa; "told us visit" sai cấu trúc.' },
      { q: 'Câu nào cùng nghĩa? "Do you live near the campus?" he asked me.', options: ['He asked me do I live near the campus.', 'He asked me that I lived near the campus.', 'He asked me if I lived near the campus.', 'He asked me whether did I live near the campus.'], answer: 2, explain: 'Câu hỏi Yes/No → if + S + V lùi thì → asked me if I lived near the campus. Câu 1 và 4 giữ trật tự câu hỏi; câu 2 dùng that sai.' }
    ]
  });

  /* 9. Sentence types */
  G.push({
    id: 'sentence-types', unit: 'sentences', order: 9,
    title: 'Phân loại câu & "range of structures"', en: 'Sentence Types and Grammatical Range', level: 'B1', emoji: '🏗️',
    summary: 'Câu đơn, câu ghép, câu phức, câu ghép-phức; câu cảm thán (What a…! / How…!); câu khẳng định, phủ định, nghi vấn, mệnh lệnh. Hiểu vì sao IELTS chấm "a wide range of structures" và cách phối hợp các loại câu.',
    blocks: [
      { type: 'diagram', caption: 'Từ câu đơn đến câu ghép-phức', steps: [
        { t: 'Câu đơn: Tuition fees have risen.', c: 'note' },
        { t: '↓ + FANBOYS + mệnh đề độc lập', c: 'arrow' },
        { t: 'Câu ghép: Tuition fees have risen, so fewer students are applying.', c: 'active' },
        { t: '↓ + liên từ phụ thuộc + mệnh đề phụ', c: 'arrow' },
        { t: 'Câu phức: Because tuition fees have risen, fewer students are applying.', c: 'passive' },
        { t: '↓ kết hợp cả hai', c: 'arrow' },
        { t: 'Câu ghép-phức: Because tuition fees have risen, fewer students are applying, and some universities are cutting courses.', c: 'result' }
      ] },
      { type: 'formula', rows: [
        { label: 'Câu đơn', parts: [ { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' }, { t: '(O / C)', c: 'obj' } ], ex: 'Online learning has become popular.' },
        { label: 'Câu ghép', parts: [ { t: 'S + V', c: 'subj' }, { t: ', and / but / so', c: 'aux' }, { t: 'S + V', c: 'verb' } ], ex: 'Rents are high, but wages have not kept pace.' },
        { label: 'Câu phức', parts: [ { t: 'S + V', c: 'subj' }, { t: 'because / which / that / if', c: 'aux' }, { t: 'S + V', c: 'verb' } ], ex: 'People who exercise regularly tend to sleep better.' },
        { label: 'Cảm thán với What', parts: [ { t: 'What', c: 'adv' }, { t: '(a/an) + adj + N', c: 'obj' }, { t: '(S + V)', c: 'subj' }, { t: '!', c: 'aux' } ], ex: 'What a stunning view it is!' },
        { label: 'Cảm thán với How', parts: [ { t: 'How', c: 'adv' }, { t: 'adj / adv', c: 'obj' }, { t: 'S + V', c: 'subj' }, { t: '!', c: 'aux' } ], ex: 'How quickly the city has changed!' }
      ] },
      { type: 'uses', items: [
        { title: 'Câu khẳng định: trình bày thông tin, quan điểm', ex: 'Public libraries remain valuable community spaces.', vi: 'Thư viện công cộng vẫn là không gian cộng đồng quý giá.' },
        { title: 'Câu phủ định: bác bỏ, giới hạn', ex: 'Technology does not always improve productivity.', vi: 'Công nghệ không phải lúc nào cũng nâng cao năng suất.' },
        { title: 'Câu nghi vấn: dùng ít trong Writing, nhiều trong Speaking', ex: 'But is economic growth the only measure of success?', vi: 'Nhưng liệu tăng trưởng kinh tế có phải thước đo thành công duy nhất?' },
        { title: 'Câu mệnh lệnh: hướng dẫn, General Training Task 1', ex: 'Please let me know if you need any further information.', vi: 'Vui lòng cho tôi biết nếu bạn cần thêm thông tin.' },
        { title: 'Câu cảm thán: tự nhiên trong Speaking, tránh trong Writing học thuật', ex: 'What an amazing experience that was!', vi: 'Đó thật là một trải nghiệm tuyệt vời!' }
      ] },
      { type: 'table', head: ['Loại câu', 'Số mệnh đề độc lập', 'Số mệnh đề phụ thuộc'], rows: [
        ['Câu đơn', '1', '0'],
        ['Câu ghép', '≥ 2', '0'],
        ['Câu phức', '1', '≥ 1'],
        ['Câu ghép-phức', '≥ 2', '≥ 1']
      ] },
      { type: 'tip', text: '"Range of structures" không có nghĩa là câu càng dài càng tốt. Band 7 cần "a variety of complex structures" VÀ "frequent error-free sentences". Hãy xen kẽ câu đơn ngắn (nhấn mạnh) với câu phức chính xác.' },
      { type: 'mistake', wrong: 'Because many people moved to cities.', right: 'Because many people moved to cities, housing prices rose.', why: 'Mệnh đề phụ đứng một mình là câu cụt (sentence fragment) – thiếu mệnh đề chính.' },
      { type: 'mistake', wrong: 'What beautiful the beach is!', right: 'How beautiful the beach is! / What a beautiful beach it is!', why: 'How + tính từ; What + (a/an) + tính từ + danh từ.' },
      { type: 'mistake', wrong: 'The bus was late, I missed the lecture.', right: 'The bus was late, so I missed the lecture.', why: 'Hai mệnh đề độc lập không nối bằng dấu phẩy đơn thuần (comma splice); cần liên từ hoặc dấu chấm.' },
      { type: 'ielts', text: 'Tiêu chí Grammatical Range and Accuracy (25% điểm Writing và Speaking) chấm cả độ đa dạng cấu trúc lẫn độ chính xác. Một đoạn văn tốt nên có câu đơn, câu ghép, câu phức (mệnh đề quan hệ, điều kiện, nhượng bộ) xen kẽ.', ex: 'Although remote work offers flexibility, it can blur the line between home and office, and many employees struggle to switch off.' }
    ],
    quiz: [
      { q: '"Prices rose, and demand fell." là loại câu gì?', options: ['Câu đơn', 'Câu ghép', 'Câu phức', 'Câu ghép-phức'], answer: 1, explain: 'Hai mệnh đề độc lập nối bằng liên từ đẳng lập and → câu ghép. Câu đơn chỉ có một mệnh đề; câu phức cần mệnh đề phụ (although, because…); câu ghép-phức cần cả hai loại.' },
      { q: '"Students who work part-time often have less time to study." là loại câu gì?', options: ['Câu đơn', 'Câu ghép', 'Câu phức', 'Câu mệnh lệnh'], answer: 2, explain: 'Một mệnh đề chính + một mệnh đề quan hệ (who work part-time).' },
      { q: '___ an interesting talk it was!', options: ['How', 'What', 'Such', 'So'], answer: 1, explain: 'Câu cảm thán với danh từ: What + a/an + tính từ + danh từ (+ S + V)! → What an interesting talk it was!' },
      { q: '___ fast technology develops!', options: ['How', 'What', 'What a', 'Such'], answer: 0, explain: 'How + tính từ/trạng từ + S + V! → How fast technology develops! What/What a đi với danh từ; Such cần danh từ theo sau.' },
      { q: '"Although it was cold, we went out, and we had a great time." là loại câu gì?', options: ['Câu đơn', 'Câu ghép', 'Câu phức', 'Câu ghép-phức'], answer: 3, explain: 'Hai mệnh đề độc lập + một mệnh đề phụ (although…).' },
      { q: '"Please submit your essay by Friday." là câu:', options: ['khẳng định', 'nghi vấn', 'mệnh lệnh', 'cảm thán'], answer: 2, explain: 'Bắt đầu bằng động từ nguyên mẫu, đưa yêu cầu → câu mệnh lệnh.' },
      { q: 'Câu nào đúng?', options: ['What a crowded the market is!', 'How a crowded market!', 'What crowded is the market!', 'How crowded the market is!'], answer: 3, explain: 'Câu cảm thán với tính từ: How + tính từ + S + V! → How crowded the market is! (What a + adj + N, không có the).' },
      { q: 'Câu nào đúng?', options: ['Many people work from home, this saves time.', 'Many people work from home. This saves time.', 'Because many people work from home.', 'Many people work from home, saves time.'], answer: 1, explain: 'Hai mệnh đề độc lập tách bằng dấu chấm; các câu khác là comma splice hoặc câu cụt.' },
      { q: 'Câu nào đúng?', options: ['Although cars are convenient, they cause pollution.', 'Although cars are convenient, but they cause pollution.', 'Cars are convenient, although, they cause pollution.', 'Although cars are convenient.'], answer: 0, explain: 'Một liên từ phụ thuộc + mệnh đề chính đầy đủ → Although cars are convenient, they cause pollution. Câu 2 thừa but; câu 3 đặt although sai; câu 4 thiếu mệnh đề chính.' },
      { q: 'Câu nào cùng nghĩa? "The scenery is extremely beautiful."', options: ['What beautiful scenery it is!', 'What a beautiful scenery it is!', 'How a beautiful scenery!', 'How scenery is beautiful!'], answer: 0, explain: 'Scenery không đếm được → What + adj + N (không có a).' },
      { q: 'Câu nào cùng nghĩa (câu phức)? "The factory closed. Hundreds of workers lost their jobs."', options: ['The factory closed, hundreds of workers lost their jobs.', 'The factory closed and hundreds of workers.', 'When the factory closed, hundreds of workers lost their jobs.', 'The factory closed, because of hundreds of workers lost their jobs.'], answer: 2, explain: 'Mệnh đề phụ (when…) + mệnh đề chính, giữ đúng quan hệ thời gian/nguyên nhân.' },
      { q: 'Câu nào cùng nghĩa (câu ghép)? "Although the course was expensive, it was worth it."', options: ['The course was expensive, so it was worth it.', 'The course was expensive or it was worth it.', 'Because the course was expensive, it was worth it.', 'The course was expensive, but it was worth it.'], answer: 3, explain: 'Although (câu phức) ↔ but (câu ghép), giữ quan hệ nhượng bộ.' }
    ]
  });
})(typeof self !== 'undefined' ? self : this);
