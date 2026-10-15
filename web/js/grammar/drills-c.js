/* Bài tập tự luận (tự biên soạn) */
(function (g) {
  const D = {
    'participle-clauses': [
      { t: 'verb', q: "___ in 1902, the library is the oldest building on campus. (build)", a: ['Built'], ex: 'Thư viện được xây → nghĩa bị động → V3/ed.' },
      { t: 'verb', q: "___ the survey in March, the researchers spent April analysing the data. (complete – xong trước)", a: ['Having completed'], ex: 'Hành động chủ động xảy ra trước → Having + V3.' },
      { t: 'verb', q: "Many students, ___ the high cost of living in the city, choose to share flats. (face)", a: ['facing'], ex: 'Chủ động, cùng lúc/nguyên nhân → V-ing.' },
      { t: 'rewrite', q: "After she had graduated from university, she moved to Singapore.", start: 'Having', a: ['Having graduated from university, she moved to Singapore.'], ex: 'Cùng chủ ngữ, hành động xảy ra trước → Having + V3.' },
      { t: 'rewrite', q: "Because he did not know the answer, he left the question blank.", start: 'Not', a: ['Not knowing the answer, he left the question blank.'], ex: 'Phủ định của mệnh đề phân từ: Not + V-ing đứng đầu.' },
      { t: 'rewrite', q: "The bridge was designed by a local engineer, and it has won several awards.", start: 'Designed', a: ['Designed by a local engineer, the bridge has won several awards.'], ex: 'Vế bị động rút gọn thành V3/ed, chủ ngữ chung đặt ở vế chính.' },
      { t: 'combine', q: "The students realised the exam would be difficult. They started revising earlier.", hint: 'V-ing …,', start: 'Realising', a: ['Realising the exam would be difficult, the students started revising earlier.', 'Realising that the exam would be difficult, the students started revising earlier.'], ex: 'Hai câu cùng chủ ngữ, chủ động → V-ing ở vế đầu.' },
      { t: 'combine', q: "The report was published in 2020. It highlights the risks of air pollution.", hint: 'V3/ed …,', start: 'Published', a: ['Published in 2020, the report highlights the risks of air pollution.'], ex: 'Báo cáo được xuất bản → bị động → V3/ed.' },
      { t: 'error', parts: ['Having been finished', 'the essay,', 'she submitted it', 'before the deadline.'], w: 0, fix: 'Having finished', ex: 'Cô ấy tự viết xong bài (chủ động) → Having finished, không dùng bị động.' },
      { t: 'error', parts: ['Building', 'in the 1960s,', 'the stadium', 'now needs major repairs.'], w: 0, fix: 'Built', ex: 'Sân vận động được xây → bị động → Built.' }
    ],

    'subjunctive': [
      { t: 'verb', q: "The doctor recommended that he ___ less salt. (eat)", a: ['eat'], ex: 'Sau recommend that dùng V nguyên mẫu cho mọi chủ ngữ.' },
      { t: 'verb', q: "It is essential that every applicant ___ a valid passport. (have)", a: ['have'], ex: 'It is essential that + S + V nguyên mẫu (không chia theo ngôi).' },
      { t: 'verb', q: "The committee proposed that the deadline ___ by one week. (extend)", a: ['be extended'], ex: 'Bị động của thức giả định: be + V3.' },
      { t: 'rewrite', q: "\"You should apply for the scholarship,\" my tutor said to me.", start: 'My tutor suggested that I', a: ['My tutor suggested that I apply for the scholarship.', 'My tutor suggested that I should apply for the scholarship.'], ex: 'suggest that + S + (should) + V nguyên mẫu.' },
      { t: 'rewrite', q: "Students must submit their essays on time. This is vital.", start: 'It is vital that', a: ['It is vital that students submit their essays on time.', 'It is vital that students should submit their essays on time.'], ex: 'It is vital that + S + V nguyên mẫu.' },
      { t: 'rewrite', q: "The manager insisted on everyone attending the meeting.", start: 'The manager insisted that', a: ['The manager insisted that everyone attend the meeting.', 'The manager insisted that everyone should attend the meeting.'], ex: 'insist that + S + V nguyên mẫu (attend, không phải attends).' },
      { t: 'rewrite', q: "\"Don't drive after taking this medicine,\" the doctor told the patient.", start: 'The doctor insisted that the patient', a: ['The doctor insisted that the patient not drive after taking this medicine.', 'The doctor insisted that the patient should not drive after taking this medicine.'], ex: 'Phủ định của thức giả định: that + S + not + V.' },
      { t: 'rewrite', q: "The university requires each applicant to submit two references.", start: 'The university requires that each applicant', a: ['The university requires that each applicant submit two references.', 'The university requires that each applicant should submit two references.'], ex: 'require that + S + V nguyên mẫu (submit, không thêm -s).' },
      { t: 'error', parts: ['My tutor', 'suggested me to rewrite', 'the conclusion', 'before Friday.'], w: 1, fix: 'suggested that I rewrite', ex: 'Không dùng suggest + sb + to V; dùng suggest that + S + V hoặc suggest + V-ing.' },
      { t: 'error', parts: ['The board recommended', 'that the fee', 'was reduced', 'for low-income students.'], w: 2, fix: 'be reduced', ex: 'Sau recommend that, bị động dùng be + V3, không lùi thì.' }
    ],

    'preference-advice': [
      { t: 'verb', q: "You'd better ___ your password with anyone. (not / share)", a: ['not share'], ex: 'had better + not + V nguyên mẫu.' },
      { t: 'verb', q: "It's high time the council ___ the broken streetlights. (repair)", a: ['repaired'], ex: "It's high time + S + V2/ed để nói về hiện tại." },
      { t: 'verb', q: "Most commuters would prefer ___ from home two days a week. (work)", a: ['to work'], ex: 'would prefer + to V.' },
      { t: 'rewrite', q: "I prefer cycling to driving to work.", start: 'I would rather', a: ['I would rather cycle than drive to work.', 'I would rather cycle to work than drive.'], ex: 'would rather + V + than + V (nguyên mẫu).' },
      { t: 'rewrite', q: "I'd like you not to use your phone during dinner.", start: 'I would rather you', a: ['I would rather you did not use your phone during dinner.'], ex: 'would rather + S2 + V quá khứ (didn\'t) để nói về hiện tại.' },
      { t: 'rewrite', q: "The government should have tackled traffic congestion long ago.", start: 'It is high time', a: ['It is high time the government tackled traffic congestion.', 'It is high time that the government tackled traffic congestion.', 'It is high time for the government to tackle traffic congestion.'], ex: 'It is high time + S + V2 (hoặc for sb to V): việc lẽ ra phải làm từ lâu.' },
      { t: 'rewrite', q: "Leave now, or you will miss the last train.", start: 'You had better', a: ['You had better leave now, or you will miss the last train.', 'You had better leave now or you will miss the last train.'], ex: 'had better + V: lời khuyên kèm hậu quả nếu không làm.' },
      { t: 'rewrite', q: "My parents want me to study medicine rather than art.", start: 'My parents would rather I', a: ['My parents would rather I studied medicine than art.', 'My parents would rather I studied medicine rather than art.'], ex: 'would rather + S + V quá khứ khi muốn người khác làm gì.' },
      { t: 'error', parts: ['You had better', 'to book', 'your tickets early', 'because the concert is popular.'], w: 1, fix: 'book', ex: 'had better + V nguyên mẫu, không có to.' },
      { t: 'error', parts: ['I would rather', 'you', "don't tell", 'anyone about the plan.'], w: 2, fix: "didn't tell", ex: 'would rather + S + quá khứ đơn (didn\'t), dù nói về hiện tại.' }
    ],

    'phrasal-verbs-grammar': [
      { t: 'fill', q: "Scientists have come up ___ a new way to store solar energy.", a: ['with'], ex: 'come up with (nghĩ ra) – cụm ba thành phần, luôn liền.' },
      { t: 'fill', q: "The government plans to phase ___ coal-fired power stations by 2035.", a: ['out'], ex: 'phase out = loại bỏ dần.' },
      { t: 'fill', q: "Many families are struggling to keep up ___ rising rents.", a: ['with'], ex: 'keep up with = theo kịp.' },
      { t: 'rewrite', q: "The company set up a new branch in Da Nang last year.", start: 'The company set a new branch', a: ['The company set a new branch up in Da Nang last year.'], ex: 'set up tách được: tân ngữ danh từ có thể đứng giữa.' },
      { t: 'rewrite', q: "Researchers will investigate the causes of the outbreak.", start: 'Researchers will look', a: ['Researchers will look into the causes of the outbreak.'], ex: 'look into = điều tra; không tách được, tân ngữ đứng sau into.' },
      { t: 'rewrite', q: "She tolerated the noise from the construction site for months.", start: 'She put', a: ['She put up with the noise from the construction site for months.'], ex: 'put up with = chịu đựng; cụm ba thành phần.' },
      { t: 'rewrite', q: "The manager received an offer from a rival firm but rejected it.", start: 'The manager received an offer from a rival firm but turned', a: ['The manager received an offer from a rival firm but turned it down.'], ex: 'Đại từ phải đứng giữa động từ và tiểu từ: turned it down.' },
      { t: 'rewrite', q: "We have no milk left.", start: 'We have run', a: ['We have run out of milk.'], ex: 'run out of = hết (cái gì).' },
      { t: 'error', parts: ['The form was confusing,', 'so the receptionist', 'filled in it', 'for me.'], w: 2, fix: 'filled it in', ex: 'Với cụm tách được, đại từ đứng giữa: fill it in.' },
      { t: 'error', parts: ['Parents', 'often have to', 'deal it with', 'when their children refuse to study.'], w: 2, fix: 'deal with it', ex: 'deal with không tách được: tân ngữ đặt sau with.' }
    ],

    'dependent-prepositions': [
      { t: 'fill', q: "Excessive screen time can contribute ___ poor sleep.", a: ['to'], ex: 'contribute to sth.' },
      { t: 'fill', q: "Parents are responsible ___ their children's safety online.", a: ['for'], ex: 'responsible for sth.' },
      { t: 'fill', q: "There has been a sharp increase ___ the number of electric cars.", a: ['in'], ex: 'increase/rise/fall in + thứ thay đổi.' },
      { t: 'rewrite', q: "Tourism affects the local environment significantly.", start: 'Tourism has a significant', a: ['Tourism has a significant impact on the local environment.', 'Tourism has a significant effect on the local environment.'], ex: 'have an impact/effect on sth.' },
      { t: 'rewrite', q: "Women make up 60% of the workforce.", start: 'Women account', a: ['Women account for 60% of the workforce.'], ex: 'account for = chiếm (tỉ lệ).' },
      { t: 'rewrite', q: "Many residents oppose the construction of a new airport.", start: 'Many residents object', a: ['Many residents object to the construction of a new airport.'], ex: 'object to + N / V-ing.' },
      { t: 'rewrite', q: "A poor diet often causes heart disease.", start: 'A poor diet often leads', a: ['A poor diet often leads to heart disease.'], ex: 'lead to = dẫn đến.' },
      { t: 'rewrite', q: "Most people know about the dangers of smoking.", start: 'Most people are aware', a: ['Most people are aware of the dangers of smoking.'], ex: 'be aware of sth.' },
      { t: 'error', parts: ['The new policy', 'will have', 'a positive effect', 'to small businesses.'], w: 3, fix: 'on small businesses.', ex: 'effect on, không phải effect to.' },
      { t: 'error', parts: ['Many students', 'find it hard', 'to cope', 'about exam pressure.'], w: 3, fix: 'with exam pressure.', ex: 'cope with sth.' }
    ],

    'reference-substitution': [
      { t: 'fill', q: "Salaries in the private sector are higher than ___ in the public sector.", a: ['those'], ex: 'Thay cho danh từ số nhiều (salaries) → those.' },
      { t: 'fill', q: "Small classes are usually more effective than large ___.", a: ['ones'], ex: 'Thay danh từ đếm được số nhiều sau tính từ → ones.' },
      { t: 'fill', q: "Trains and planes are both popular; the ___ is cheaper, but the latter is faster.", a: ['former'], ex: 'the former = cái thứ nhất, the latter = cái thứ hai.' },
      { t: 'rewrite', q: "Some cities have banned cars from the centre. Banning cars from the centre has reduced pollution.", start: 'Some cities have banned cars from the centre. This', a: ['Some cities have banned cars from the centre. This policy has reduced pollution.', 'Some cities have banned cars from the centre. This measure has reduced pollution.', 'Some cities have banned cars from the centre. This ban has reduced pollution.', 'Some cities have banned cars from the centre. This has reduced pollution.'], ex: 'This + danh từ tóm tắt thay cho cả ý vừa nêu.' },
      { t: 'rewrite', q: "The government promised to build more schools, but it has not built more schools.", start: 'The government promised to build more schools, but it has not', a: ['The government promised to build more schools, but it has not done so.'], ex: 'do so thay cho cụm động từ đã nhắc.' },
      { t: 'rewrite', q: "The population of Hanoi is larger than the population of Da Nang.", start: 'The population of Hanoi is larger than', a: ['The population of Hanoi is larger than that of Da Nang.'], ex: 'that of thay cho danh từ số ít đã nhắc (population).' },
      { t: 'rewrite', q: "Fines for littering are common. However, fines like these rarely change behaviour.", start: 'Fines for littering are common. However, such', a: ['Fines for littering are common. However, such fines rarely change behaviour.', 'Fines for littering are common. However, such penalties rarely change behaviour.', 'Fines for littering are common. However, such measures rarely change behaviour.'], ex: 'such + N = những … như vậy.' },
      { t: 'rewrite', q: "If companies are asked to cut emissions, most companies will cut emissions.", start: 'If companies are asked to cut emissions, most will', a: ['If companies are asked to cut emissions, most will do so.'], ex: 'do so tránh lặp lại hành động cut emissions.' },
      { t: 'error', parts: ['Old laptops', 'are slower than', 'new one,', 'so many people upgrade.'], w: 2, fix: 'new ones,', ex: 'laptops số nhiều → ones.' },
      { t: 'error', parts: ['The prices of houses', 'in cities', 'are higher than', 'that in rural areas.'], w: 3, fix: 'those in rural areas.', ex: 'prices số nhiều → those.' }
    ],

    'hedging': [
      { t: 'fill', q: "Students from wealthier families ___ to perform better in exams. (có xu hướng)", a: ['tend'], ex: 'tend to + V: nói về xu hướng chung.' },
      { t: 'fill', q: "Demand for electric cars is ___ to rise over the next decade. (có khả năng)", a: ['likely'], ex: 'be likely to + V: có khả năng cao.' },
      { t: 'fill', q: "I agree with this view to some ___.", a: ['extent'], ex: 'Cụm cố định: to some extent.' },
      { t: 'rewrite', q: "Social media makes teenagers anxious.", start: 'Social media tends', a: ['Social media tends to make teenagers anxious.'], ex: 'tend to + V làm nhận định bớt tuyệt đối.' },
      { t: 'rewrite', q: "People believe that exercise improves mental health.", start: 'It is widely believed that', a: ['It is widely believed that exercise improves mental health.'], ex: 'Bị động khách quan: It is widely believed that + mệnh đề.' },
      { t: 'rewrite', q: "The new law has clearly failed to reduce crime.", start: 'It appears that', a: ['It appears that the new law has failed to reduce crime.'], ex: 'It appears that + mệnh đề: kết luận dè dặt, bỏ clearly.' },
      { t: 'rewrite', q: "Older people use social media less than younger people.", start: 'Older people tend', a: ['Older people tend to use social media less than younger people.', 'Older people tend to use social media less than younger people do.'], ex: 'tend to + V: không khẳng định cho mọi trường hợp.' },
      { t: 'rewrite', q: "Automation will replace many office jobs.", start: 'Automation is likely', a: ['Automation is likely to replace many office jobs.'], ex: 'be likely to + V thay cho will tuyệt đối.' },
      { t: 'error', parts: ['Children', 'who read regularly', 'tends to', 'have a wider vocabulary.'], w: 2, fix: 'tend to', ex: 'Chủ ngữ số nhiều (children) → tend to.' },
      { t: 'error', parts: ['It', 'is appeared', 'that the policy', 'has had little effect.'], w: 1, fix: 'appears', ex: 'appear là nội động từ: It appears that…, không dùng bị động.' }
    ],

    'nominalisation': [
      { t: 'form', q: "The ___ of the new metro line took six years. (CONSTRUCT)", a: ['construction'], ex: 'Sau the … of cần danh từ: construction.' },
      { t: 'form', q: "There was a slight ___ in unemployment in 2020. (REDUCE)", a: ['reduction'], ex: 'a + tính từ + danh từ: a slight reduction.' },
      { t: 'form', q: "The ___ of cheap flights has boosted tourism. (AVAILABLE)", a: ['availability'], ex: 'Danh từ của available là availability.' },
      { t: 'rewrite', q: "Unemployment fell sharply in 2019.", start: 'There was a sharp', a: ['There was a sharp fall in unemployment in 2019.', 'There was a sharp drop in unemployment in 2019.', 'There was a sharp decline in unemployment in 2019.', 'There was a sharp decrease in unemployment in 2019.'], ex: 'Động từ fell → danh từ a fall in; trạng từ sharply → tính từ sharp.' },
      { t: 'rewrite', q: "Because it rained heavily, the match was cancelled.", start: 'Due to', a: ['Due to the heavy rain, the match was cancelled.', 'Due to heavy rain, the match was cancelled.', 'Due to heavy rainfall, the match was cancelled.', 'Due to the heavy rainfall, the match was cancelled.'], ex: 'Due to + cụm danh từ thay cho because + mệnh đề.' },
      { t: 'rewrite', q: "The city expanded rapidly, which put pressure on housing.", start: 'The rapid', a: ['The rapid expansion of the city put pressure on housing.', "The rapid expansion of the city has put pressure on housing."], ex: 'expanded rapidly → the rapid expansion of the city làm chủ ngữ.' },
      { t: 'rewrite', q: "The government decided to raise taxes, and this led to protests.", start: "The government's", a: ["The government's decision to raise taxes led to protests."], ex: 'decided → decision; chủ ngữ thành sở hữu cách.' },
      { t: 'rewrite', q: "Tuition fees were introduced, and as a result applications fell.", start: 'The introduction', a: ['The introduction of tuition fees led to a fall in applications.', 'The introduction of tuition fees led to a drop in applications.', 'The introduction of tuition fees led to a decline in applications.', 'The introduction of tuition fees led to a decrease in applications.', 'The introduction of tuition fees reduced applications.', 'The introduction of tuition fees caused applications to fall.', 'The introduction of tuition fees resulted in a fall in applications.'], ex: 'were introduced → the introduction of; fell → a fall in.' },
      { t: 'error', parts: ['The develop', 'of renewable energy', 'has created', 'thousands of jobs.'], w: 0, fix: 'The development', ex: 'Sau the … of cần danh từ: development.' },
      { t: 'error', parts: ['There was', 'a significant', 'improve', 'in air quality last year.'], w: 2, fix: 'improvement', ex: 'a + tính từ + danh từ: a significant improvement.' }
    ],

    'parallel-structure': [
      { t: 'form', q: "The new library is spacious, modern and ___. (COMFORT)", a: ['comfortable'], ex: 'Ba tính từ song song: spacious, modern, comfortable.' },
      { t: 'verb', q: "Good teachers inspire students, explain clearly and ___ useful feedback. (give)", a: ['give'], ex: 'Các động từ hiện tại đơn song song: inspire, explain, give.' },
      { t: 'verb', q: "In my free time, I enjoy hiking, swimming and ___. (cycle)", a: ['cycling'], ex: 'Sau enjoy, các thành phần cùng dạng V-ing.' },
      { t: 'rewrite', q: "The course is affordable. It is also flexible.", start: 'The course is both', a: ['The course is both affordable and flexible.'], ex: 'both A and B: A, B cùng loại từ (tính từ).' },
      { t: 'rewrite', q: "The policy is unfair, and it is also ineffective.", start: 'The policy is not only', a: ['The policy is not only unfair but also ineffective.', 'The policy is not only unfair but ineffective as well.'], ex: 'not only … but also nối hai thành phần cùng dạng.' },
      { t: 'rewrite', q: "The scheme aims to cut traffic, improving air quality and safer roads.", start: 'The scheme aims to cut traffic,', a: ['The scheme aims to cut traffic, improve air quality and make roads safer.', 'The scheme aims to cut traffic, improve air quality and make the roads safer.'], ex: 'Sau aims to, cả ba thành phần đều là V nguyên mẫu.' },
      { t: 'combine', q: "You can pay online. You can also pay at the counter.", hint: 'either … or', start: 'You can either pay', a: ['You can either pay online or pay at the counter.', 'You can either pay online or at the counter.'], ex: 'either … or nối hai thành phần cùng dạng.' },
      { t: 'combine', q: "The birth rate in Japan is low. The birth rate in India is higher.", hint: 'lower than that …', start: 'The birth rate in Japan is lower than', a: ['The birth rate in Japan is lower than that in India.', 'The birth rate in Japan is lower than that of India.'], ex: 'So sánh hai thứ cùng loại: birth rate với that (= the birth rate).' },
      { t: 'error', parts: ['Students need to', 'manage their time,', 'setting goals', 'and ask for help.'], w: 2, fix: 'set goals', ex: 'manage, set, ask cùng là V nguyên mẫu sau need to.' },
      { t: 'error', parts: ['The population of Vietnam', 'is larger', 'than', 'Thailand.'], w: 3, fix: 'that of Thailand.', ex: 'So sánh dân số với dân số → that of Thailand.' }
    ],

    'punctuation': [
      { t: 'fill', q: "The firm cut ___ workforce by 10% last year. (it / its / it's)", a: ['its'], ex: 'its = của nó; it\'s = it is.' },
      { t: 'form', q: "All the ___ results were published online. (STUDENT – nhiều sinh viên)", a: ["students'"], ex: "Sở hữu của danh từ số nhiều tận cùng -s → thêm dấu nháy sau s: students'." },
      { t: 'form', q: "The government launched a ___ plan to improve rural roads. (TEN / YEAR)", a: ['ten-year'], ex: 'Tính từ ghép số + danh từ trước danh từ: có gạch nối, danh từ số ít.' },
      { t: 'rewrite', q: "Prices rose sharply, but demand remained strong.", start: 'Prices rose sharply; however', a: ['Prices rose sharply; however, demand remained strong.'], ex: 'Chấm phẩy trước however, phẩy sau however.' },
      { t: 'rewrite', q: "The council approved the scheme even though it was expensive.", start: 'Although', a: ['Although the scheme was expensive, the council approved it.', 'Although it was expensive, the council approved the scheme.'], ex: 'Mệnh đề phụ đứng đầu câu → dấu phẩy sau nó.' },
      { t: 'rewrite', q: "The toys belonging to the children were left in the garden.", start: "The children's", a: ["The children's toys were left in the garden."], ex: "Danh từ số nhiều bất quy tắc (children) → thêm 's." },
      { t: 'combine', q: "Hanoi is the capital of Vietnam. It has a population of over eight million.", hint: ', which …,', start: 'Hanoi, which', a: ['Hanoi, which is the capital of Vietnam, has a population of over eight million.'], ex: 'Mệnh đề quan hệ không xác định đặt giữa hai dấu phẩy.' },
      { t: 'combine', q: "Some people work to live. Others live to work.", hint: '; (dấu chấm phẩy)', start: 'Some people work to live;', a: ['Some people work to live; others live to work.'], ex: 'Dấu chấm phẩy nối hai câu độc lập có ý liên quan chặt.' },
      { t: 'error', parts: ['The scheme was costly, however,', 'it was', 'a great success', 'in the end.'], w: 0, fix: 'The scheme was costly; however,', ex: 'Phẩy + however nối hai câu là lỗi comma splice → dùng chấm phẩy.' },
      { t: 'error', parts: ['The company', 'increased', "it's profits", 'by 15% last year.'], w: 2, fix: 'its profits', ex: "it's = it is; sở hữu dùng its." }
    ],

    'future-in-past': [
      { t: 'verb', q: "I ___ you, but my phone battery died. (call – định làm)", a: ['was going to call'], ex: 'Dự định trong quá khứ không thành → was/were going to + V.' },
      { t: 'verb', q: "We ___ the building when the fire alarm went off. (leave – sắp sửa)", a: ['were about to leave'], ex: 'Sắp xảy ra ngay lúc đó → was/were about to + V.' },
      { t: 'verb', q: "In 1990, few people believed the internet ___ shopping so dramatically. (change)", a: ['would change'], ex: 'Dự đoán nhìn từ quá khứ → would + V.' },
      { t: 'rewrite', q: "I planned to study law, but I changed my mind.", start: 'I was going to', a: ['I was going to study law, but I changed my mind.'], ex: 'was going to + V: kế hoạch trong quá khứ không thành.' },
      { t: 'rewrite', q: "\"Prices will fall next year,\" the experts said.", start: 'The experts said that prices', a: ['The experts said that prices would fall the following year.', 'The experts said that prices would fall the next year.', 'The experts said that prices would fall the year after.'], ex: 'Tường thuật dự đoán: will → would.' },
      { t: 'rewrite', q: "The plane was on the point of taking off when the engine failed.", start: 'The plane was about', a: ['The plane was about to take off when the engine failed.'], ex: 'be on the point of V-ing = be about to V.' },
      { t: 'combine', q: "The council intended to build a car park. Residents protested.", hint: 'was going to …, but', start: 'The council was going to', a: ['The council was going to build a car park, but residents protested.', 'The council was going to build a car park, but the residents protested.'], ex: 'was going to + but: dự định bị thay đổi.' },
      { t: 'combine', q: "We were ready to leave at that moment. Then the phone rang.", hint: 'about to … when', start: 'We were about to', a: ['We were about to leave when the phone rang.'], ex: 'was/were about to … when …: sắp làm thì có việc xen vào.' },
      { t: 'error', parts: ['In 2010,', 'experts predicted', 'that the economy', 'will recover by 2012.'], w: 3, fix: 'would recover by 2012.', ex: 'Dự đoán trong quá khứ → would, không dùng will.' },
      { t: 'error', parts: ['I was', 'about', 'leave the office', 'when my boss called me.'], w: 1, fix: 'about to', ex: 'Cấu trúc: be about to + V.' }
    ],

    'alternatives-to-if': [
      { t: 'fill', q: "___ we act now, the problem will get worse. (= if … not)", a: ['Unless'], ex: 'Unless = if … not.' },
      { t: 'fill', q: "Take an umbrella in ___ it rains this afternoon.", a: ['case'], ex: 'in case = phòng khi.' },
      { t: 'fill', q: "___ you need further help, please contact the office. (đảo ngữ loại 1)", a: ['Should'], ex: 'Đảo ngữ loại 1 trang trọng: Should + S + V.' },
      { t: 'rewrite', q: "If you don't hurry, you'll miss the last bus.", start: 'Unless', a: ['Unless you hurry, you will miss the last bus.'], ex: 'Unless + mệnh đề khẳng định (bỏ don\'t).' },
      { t: 'rewrite', q: "If the government raised taxes, people would protest.", start: 'Were', a: ['Were the government to raise taxes, people would protest.'], ex: 'Đảo ngữ loại 2: Were + S + to V.' },
      { t: 'rewrite', q: "If I had known about the strike, I would have taken a taxi.", start: 'Had', a: ['Had I known about the strike, I would have taken a taxi.'], ex: 'Đảo ngữ loại 3: Had + S + V3.' },
      { t: 'rewrite', q: "You can borrow my laptop, but only if you return it by Friday.", start: 'You can borrow my laptop as long as', a: ['You can borrow my laptop as long as you return it by Friday.'], ex: 'as long as = với điều kiện là.' },
      { t: 'rewrite', q: "Save your work regularly. If you don't, you might lose it.", start: 'Save your work regularly', a: ['Save your work regularly; otherwise, you might lose it.', 'Save your work regularly, or else you might lose it.', 'Save your work regularly or you might lose it.'], ex: 'otherwise / or else = nếu không thì.' },
      { t: 'error', parts: ['Unless', "you don't apply", 'before Friday,', 'you will miss the chance.'], w: 1, fix: 'you apply', ex: 'Unless đã mang nghĩa phủ định → không dùng thêm not.' },
      { t: 'error', parts: ['Provided that', 'the weather', 'will be good,', 'we will hold the event outdoors.'], w: 2, fix: 'is good,', ex: 'Sau provided that dùng hiện tại đơn để nói về tương lai.' }
    ],

    'emphasis-variety': [
      { t: 'fill', q: "I know you think I forgot, but I ___ send the email.", a: ['did'], ex: 'Nhấn mạnh hành động quá khứ: did + V.' },
      { t: 'fill', q: "Public transport ___ reduce congestion, despite what its critics say.", a: ['does'], ex: 'Chủ ngữ số ít, hiện tại: does + V nguyên mẫu.' },
      { t: 'fill', q: "The reason why sales fell is ___ prices went up.", a: ['that'], ex: 'The reason why … is that …' },
      { t: 'rewrite', q: "Governments need stricter laws.", start: 'What governments need', a: ['What governments need is stricter laws.'], ex: 'Câu chẻ: What + S + V + is + N.' },
      { t: 'rewrite', q: "The cost of housing concerns me most.", start: 'What concerns me most', a: ['What concerns me most is the cost of housing.'], ex: 'What + V + is + thông tin được nhấn mạnh.' },
      { t: 'rewrite', q: "Young people move to cities because wages are higher there.", start: 'The reason why young people move to cities', a: ['The reason why young people move to cities is that wages are higher there.'], ex: 'The reason why + S + V + is that + S + V.' },
      { t: 'rewrite', q: "Governments, not individuals, should tackle climate change.", start: 'It is governments', a: ['It is governments that should tackle climate change.', 'It is governments who should tackle climate change.'], ex: 'Câu chẻ It is … that … nhấn mạnh chủ thể.' },
      { t: 'rewrite', q: "Regular exercise really improves mood.", start: 'Regular exercise does', a: ['Regular exercise does improve mood.'], ex: 'does + V nguyên mẫu thay cho really + V-s để nhấn mạnh.' },
      { t: 'error', parts: ['What the city needs', 'are', 'more affordable', 'housing.'], w: 1, fix: 'is', ex: 'Mệnh đề What … làm chủ ngữ → động từ số ít is.' },
      { t: 'error', parts: ['Online learning', 'does', 'saves', 'students a lot of time.'], w: 2, fix: 'save', ex: 'Sau do/does/did nhấn mạnh dùng V nguyên mẫu.' }
    ],

    'sequence-of-tenses': [
      { t: 'verb', q: "I will let you know as soon as I ___ my results. (get)", a: ['get'], ex: 'Mệnh đề thời gian chỉ tương lai → hiện tại đơn.' },
      { t: 'verb', q: "By the time the firefighters arrived, the fire ___ most of the warehouse. (destroy)", a: ['had destroyed'], ex: 'By the time + quá khứ đơn → quá khứ hoàn thành.' },
      { t: 'verb', q: "By the time she graduates, she ___ two internships. (complete)", a: ['will have completed'], ex: 'By the time + hiện tại đơn → tương lai hoàn thành.' },
      { t: 'rewrite', q: "The ambulance arrived. The crowd had left before that.", start: 'By the time the ambulance arrived', a: ['By the time the ambulance arrived, the crowd had left.', 'By the time the ambulance arrived, the crowd had already left.'], ex: 'By the time + quá khứ đơn, mệnh đề chính quá khứ hoàn thành.' },
      { t: 'rewrite', q: "Submit the form, and then you will receive a reference number.", start: 'Once you have submitted', a: ['Once you have submitted the form, you will receive a reference number.'], ex: 'once + hiện tại hoàn thành: việc hoàn tất trước.' },
      { t: 'rewrite', q: "She will retire in 2030. At that point she will have worked here for forty years.", start: 'By the time she retires', a: ['By the time she retires, she will have worked here for forty years.'], ex: 'By the time + hiện tại đơn → will have + V3.' },
      { t: 'combine', q: "Everyone will arrive. Then we will start the meeting.", hint: 'when', start: 'We will start the meeting when', a: ['We will start the meeting when everyone arrives.', 'We will start the meeting when everyone has arrived.'], ex: 'Sau when chỉ tương lai: hiện tại đơn/hiện tại hoàn thành, không dùng will.' },
      { t: 'combine', q: "We will wait here. The rain will stop.", hint: 'until', start: 'We will wait here until', a: ['We will wait here until the rain stops.'], ex: 'until + hiện tại đơn khi nói về tương lai.' },
      { t: 'error', parts: ['I will call you', 'as soon as', 'the meeting', 'will finish.'], w: 3, fix: 'finishes.', ex: 'Sau as soon as dùng hiện tại đơn, không dùng will.' },
      { t: 'error', parts: ['By the time', 'we got to the cinema,', 'the film', 'has already started.'], w: 3, fix: 'had already started.', ex: 'By the time + quá khứ đơn → quá khứ hoàn thành.' }
    ],

    'quantity-advanced': [
      { t: 'fill', q: "___ of the employees in our company work from home on Fridays. (hầu hết)", a: ['Most'], ex: 'Most of + the + N (nhóm xác định).' },
      { t: 'verb', q: "The number of international students ___ sharply since 2015. (rise)", a: ['has risen'], ex: 'The number of → động từ số ít; since → hiện tại hoàn thành.' },
      { t: 'fill', q: "The research project required a great ___ of funding.", a: ['deal'], ex: 'a great deal of + danh từ không đếm được.' },
      { t: 'rewrite', q: "Many factors have contributed to the decline.", start: 'A number of', a: ['A number of factors have contributed to the decline.'], ex: 'A number of (= nhiều) + N số nhiều + V số nhiều.' },
      { t: 'rewrite', q: "All the participants received a certificate.", start: 'Every', a: ['Every participant received a certificate.'], ex: 'Every + N số ít + V số ít.' },
      { t: 'rewrite', q: "Two thirds of the budget was spent on healthcare.", start: 'The government spent two thirds', a: ['The government spent two thirds of the budget on healthcare.'], ex: 'Phân số + of + the + N.' },
      { t: 'rewrite', q: "Most of the audience were teenagers.", start: 'The audience was mostly', a: ['The audience was mostly teenagers.', 'The audience was mostly made up of teenagers.', 'The audience was mostly composed of teenagers.'], ex: 'mostly = chủ yếu (trạng từ), khác most of.' },
      { t: 'rewrite', q: "Each of the four candidates gave a presentation.", start: 'All', a: ['All four candidates gave a presentation.', 'All of the four candidates gave a presentation.', 'All four candidates gave presentations.'], ex: 'Each of + N số nhiều ↔ All + N số nhiều.' },
      { t: 'error', parts: ['A large number of', 'residents', 'has complained', 'about the noise.'], w: 2, fix: 'have complained', ex: 'A (large) number of + N số nhiều → động từ số nhiều.' },
      { t: 'error', parts: ['The vast majority of', 'the respondent', 'said they', 'preferred online shopping.'], w: 1, fix: 'the respondents', ex: 'The majority of + N số nhiều.' }
    ],

    'paraphrase-structures': [
      { t: 'fill', q: "The box was ___ heavy for the child to carry.", a: ['too'], ex: 'too + adj + for sb + to V.' },
      { t: 'fill', q: "___ the heavy traffic, we arrived on time. (mặc dù)", a: ['Despite'], ex: 'Despite + cụm danh từ (không dùng although).' },
      { t: 'verb', q: "It ___ me two weeks to get used to the new job. (take)", a: ['took'], ex: 'It takes/took + sb + thời gian + to V.' },
      { t: 'rewrite', q: "Although he earned a high salary, he struggled to save money.", start: 'Despite', a: ['Despite earning a high salary, he struggled to save money.', 'Despite his high salary, he struggled to save money.', 'Despite the fact that he earned a high salary, he struggled to save money.', 'Despite having a high salary, he struggled to save money.'], ex: 'Although + mệnh đề → Despite + V-ing / N / the fact that.' },
      { t: 'rewrite', q: "I spent three hours finishing the assignment.", start: 'It took me', a: ['It took me three hours to finish the assignment.'], ex: 'spend + time + V-ing ↔ It takes sb + time + to V.' },
      { t: 'rewrite', q: "She used to smoke, but she has stopped.", start: 'She no longer', a: ['She no longer smokes.'], ex: 'used to (nhưng nay không) ↔ no longer + V hiện tại.' },
      { t: 'rewrite', q: "The bridge was not completed until 2015.", start: 'It was not until 2015 that', a: ['It was not until 2015 that the bridge was completed.'], ex: 'It was not until + mốc thời gian + that + S + V2.' },
      { t: 'rewrite', q: "This is the first time I have visited London.", start: 'I have never', a: ['I have never visited London before.', 'I have never been to London before.'], ex: 'This is the first time … ↔ have never … before.' },
      { t: 'error', parts: ['The suitcase was', 'such heavy', 'that I', 'could not lift it.'], w: 1, fix: 'so heavy', ex: 'so + adj + that; such đi với cụm danh từ.' },
      { t: 'error', parts: ['It took', 'me', 'two hours', 'finishing the report.'], w: 3, fix: 'to finish the report.', ex: 'It takes sb + thời gian + to V.' }
    ],

    'paraphrase-ielts': [
      { t: 'form', q: "\"Unemployment fell slightly.\" → There was a ___ fall in unemployment. (SLIGHTLY)", a: ['slight'], ex: 'Danh từ fall cần tính từ bổ nghĩa: slight.' },
      { t: 'form', q: "\"Sales increased dramatically.\" → Sales saw a ___ increase. (DRAMATICALLY)", a: ['dramatic'], ex: 'Đổi trạng từ → tính từ khi động từ thành danh từ.' },
      { t: 'form', q: "\"Cities have grown rapidly.\" → The rapid ___ of cities has put pressure on housing. (GROW)", a: ['growth'], ex: 'Danh từ hóa: grow → growth.' },
      { t: 'rewrite', q: "Many people believe that children should learn a foreign language at primary school.", start: 'It is widely believed that', a: ['It is widely believed that children should learn a foreign language at primary school.'], ex: 'Đổi cấu trúc: many people believe → It is widely believed that.' },
      { t: 'rewrite', q: "The number of tourists rose sharply between 2000 and 2020.", start: 'There was a sharp', a: ['There was a sharp rise in the number of tourists between 2000 and 2020.', 'There was a sharp increase in the number of tourists between 2000 and 2020.'], ex: 'rose sharply → a sharp rise in (đổi dạng từ).' },
      { t: 'rewrite', q: "Because the city expanded, traffic increased.", start: 'The expansion of the city', a: ['The expansion of the city led to an increase in traffic.', 'The expansion of the city led to a rise in traffic.', 'The expansion of the city resulted in an increase in traffic.', 'The expansion of the city led to increased traffic.', 'The expansion of the city increased traffic.', 'The expansion of the city caused traffic to increase.'], ex: 'Danh từ hóa nguyên nhân thành chủ ngữ + led to.' },
      { t: 'rewrite', q: "The graph shows how many students enrolled in three courses.", start: 'The graph illustrates the number of', a: ['The graph illustrates the number of students who enrolled in three courses.', 'The graph illustrates the number of students enrolling in three courses.', 'The graph illustrates the number of students enrolled in three courses.', 'The graph illustrates the number of students that enrolled in three courses.'], ex: 'shows → illustrates; how many → the number of.' },
      { t: 'rewrite', q: "Sales of electric cars increased slightly in 2022.", start: 'Electric car sales saw a', a: ['Electric car sales saw a slight increase in 2022.', 'Electric car sales saw a slight rise in 2022.'], ex: 'Đổi chủ ngữ + danh từ hóa: increased slightly → saw a slight increase.' },
      { t: 'error', parts: ['The chart shows', 'a', 'dramatically', 'increase in house prices.'], w: 2, fix: 'dramatic', ex: 'Bổ nghĩa cho danh từ increase phải là tính từ dramatic.' },
      { t: 'error', parts: ['It is widely', 'believe', 'that exercise', 'improves mental health.'], w: 1, fix: 'believed', ex: 'Bị động khách quan: It is widely believed that…' }
    ],

    'nouns': [
      { t: 'form', q: "Global warming is a ___ that affects every continent. (PHENOMENA)", a: ['phenomenon'], ex: 'Có mạo từ a → số ít phenomenon.' },
      { t: 'form', q: "The selection ___ for the scholarship are very strict. (CRITERION)", a: ['criteria'], ex: 'Động từ are → số nhiều criteria.' },
      { t: 'verb', q: "The police ___ three men in connection with the robbery. (arrest – hiện tại hoàn thành)", a: ['have arrested'], ex: 'Police luôn là danh từ số nhiều → have.' },
      { t: 'rewrite', q: "The plan will last ten years.", start: 'It is a', a: ['It is a ten-year plan.'], ex: 'Số + danh từ làm tính từ: có gạch nối, danh từ số ít.' },
      { t: 'rewrite', q: "The decision of the government surprised many economists.", start: "The government's", a: ["The government's decision surprised many economists."], ex: "Sở hữu 's dùng cho người, tổ chức." },
      { t: 'rewrite', q: "Our holiday lasted one week.", start: 'We had a', a: ["We had a week's holiday.", 'We had a one-week holiday.'], ex: "Sở hữu cách với thời gian: a week's holiday (= a one-week holiday)." },
      { t: 'rewrite', q: "Pollution of the air is a serious problem in big cities.", start: 'Air', a: ['Air pollution is a serious problem in big cities.'], ex: 'Danh từ ghép: N1 (như tính từ) + N2.' },
      { t: 'rewrite', q: "The union for students organised a protest.", start: "The students'", a: ["The students' union organised a protest."], ex: "Danh từ số nhiều tận cùng -s → sở hữu thêm dấu nháy: students'." },
      { t: 'error', parts: ['These', 'phenomenon', 'have been studied', 'for decades.'], w: 1, fix: 'phenomena', ex: 'These + số nhiều → phenomena.' },
      { t: 'error', parts: ['We stayed in', 'a five-stars', 'hotel', 'near the beach.'], w: 1, fix: 'a five-star', ex: 'Danh từ ghép làm tính từ: danh từ giữ số ít (five-star).' }
    ],

    'verb-types': [
      { t: 'verb', q: "Oil prices ___ significantly in the first quarter of last year. (rise)", a: ['rose'], ex: 'Không có tân ngữ → nội động từ rise, quá khứ rose.' },
      { t: 'verb', q: "The central bank ___ interest rates twice last year. (raise)", a: ['raised'], ex: 'Có tân ngữ (interest rates) → ngoại động từ raise.' },
      { t: 'form', q: "Unemployment remained ___ throughout 2021. (HIGHLY)", a: ['high'], ex: 'remain là động từ nối → theo sau là tính từ.' },
      { t: 'rewrite', q: "The university offered her a full scholarship.", start: 'The university offered a full scholarship', a: ['The university offered a full scholarship to her.'], ex: 'V + O vật + to + người.' },
      { t: 'rewrite', q: "My uncle lent me his car for the weekend.", start: 'My uncle lent his car', a: ['My uncle lent his car to me for the weekend.'], ex: 'lend sb sth = lend sth to sb.' },
      { t: 'rewrite', q: "The company raised its prices by 5%.", start: 'The company\'s prices rose', a: ["The company's prices rose by 5%."], ex: 'Bỏ tân ngữ → dùng nội động từ rise.' },
      { t: 'rewrite', q: "The teacher showed the class a short video.", start: 'The teacher showed a short video', a: ['The teacher showed a short video to the class.'], ex: 'show sb sth = show sth to sb.' },
      { t: 'rewrite', q: "Sales fell because of the recession.", start: 'The recession reduced', a: ['The recession reduced sales.'], ex: 'fall (nội động từ) ↔ reduce + tân ngữ (ngoại động từ).' },
      { t: 'error', parts: ['The number of tourists', 'was risen', 'sharply', 'after the airport opened.'], w: 1, fix: 'rose', ex: 'rise là nội động từ, không dùng bị động.' },
      { t: 'error', parts: ['The situation', 'seems', 'increasingly', 'seriously.'], w: 3, fix: 'serious.', ex: 'Sau động từ nối seem dùng tính từ.' }
    ],

    'conjunctions': [
      { t: 'fill', q: "The hotel was expensive, ___ the service was surprisingly poor. (trái ngược)", a: ['yet', 'but'], ex: 'yet / but nối hai ý trái ngược.' },
      { t: 'fill', q: "You can pay ___ by card or in cash.", a: ['either'], ex: 'either … or: một trong hai.' },
      { t: 'fill', q: "Neither my parents ___ my brother is coming to the ceremony.", a: ['nor'], ex: 'neither … nor.' },
      { t: 'rewrite', q: "Public transport is cheaper than driving, and it is also greener.", start: 'Public transport is not only', a: ['Public transport is not only cheaper but also greener than driving.', 'Public transport is not only cheaper than driving but also greener.'], ex: 'not only … but also nối hai tính từ.' },
      { t: 'rewrite', q: "The flat is small, but it is very well located.", start: 'Although', a: ['Although the flat is small, it is very well located.', 'Although it is small, the flat is very well located.'], ex: 'Although đứng đầu → phẩy sau mệnh đề phụ, bỏ but.' },
      { t: 'rewrite', q: "My sister doesn't like fish, and I don't like fish either.", start: 'Neither my sister nor I', a: ['Neither my sister nor I like fish.'], ex: 'Neither A nor B; động từ hòa hợp với B (I → like).' },
      { t: 'combine', q: "The roads were icy. The race was postponed.", hint: 'so', start: 'The roads were icy', a: ['The roads were icy, so the race was postponed.'], ex: 'so chỉ kết quả, có dấu phẩy trước.' },
      { t: 'combine', q: "Many people cycle to work. It saves money.", hint: 'because', start: 'Many people cycle to work', a: ['Many people cycle to work because it saves money.'], ex: 'because đứng giữa câu, không cần dấu phẩy.' },
      { t: 'error', parts: ['Both the teacher', 'or', 'the students', 'were surprised by the results.'], w: 1, fix: 'and', ex: 'both … and, không dùng both … or.' },
      { t: 'error', parts: ['Neither the manager', 'nor the employees', 'was', 'informed about the changes.'], w: 2, fix: 'were', ex: 'Động từ hòa hợp với danh từ gần nhất (the employees) → were.' }
    ],

    'reported-advanced': [
      { t: 'fill', q: "The interviewer asked me ___ I had any experience. (câu hỏi Yes/No)", a: ['whether', 'if'], ex: 'Tường thuật câu hỏi Yes/No → if/whether.' },
      { t: 'verb', q: "She asked me what time the train ___. (leave)", a: ['left'], ex: 'Trật tự S + V và lùi thì: the train left.' },
      { t: 'verb', q: "The minister denied ___ about the payments. (know)", a: ['knowing'], ex: 'deny + V-ing.' },
      { t: 'rewrite', q: "\"Where do you live?\" she asked me.", start: 'She asked me where', a: ['She asked me where I lived.'], ex: 'Bỏ do, đưa về S + V, lùi thì.' },
      { t: 'rewrite', q: "\"Don't use your phones during the test,\" the teacher said to us.", start: 'The teacher told us', a: ['The teacher told us not to use our phones during the test.'], ex: 'Mệnh lệnh phủ định → tell sb not to V.' },
      { t: 'rewrite', q: "\"I'm sorry I was late,\" Tom said.", start: 'Tom apologised for', a: ['Tom apologised for being late.', 'Tom apologised for having been late.'], ex: 'apologise for + V-ing.' },
      { t: 'rewrite', q: "\"You stole the documents!\" the police said to him.", start: 'The police accused him', a: ['The police accused him of stealing the documents.', 'The police accused him of having stolen the documents.'], ex: 'accuse sb of + V-ing.' },
      { t: 'rewrite', q: "\"Have you studied abroad?\" the examiner asked me.", start: 'The examiner asked me', a: ['The examiner asked me whether I had studied abroad.', 'The examiner asked me if I had studied abroad.'], ex: 'Yes/No → if/whether; hiện tại hoàn thành → quá khứ hoàn thành.' },
      { t: 'error', parts: ['She asked me', 'where', 'did I live', 'before moving to Hanoi.'], w: 2, fix: 'I had lived', ex: 'Câu hỏi tường thuật không đảo trợ động từ: S + V, lùi thì.' },
      { t: 'error', parts: ['My friend', 'suggested', 'to go', 'to the museum together.'], w: 2, fix: 'going', ex: 'suggest + V-ing, không dùng to V.' }
    ],

    'sentence-types': [
      { t: 'fill', q: "___ an interesting talk it was!", a: ['What'], ex: 'What + a/an + adj + N (+ S + V)!' },
      { t: 'fill', q: "___ fast technology develops!", a: ['How'], ex: 'How + adj/adv + S + V!' },
      { t: 'fill', q: "Tuition fees have risen, ___ fewer students are applying. (kết quả)", a: ['so'], ex: 'Câu ghép với FANBOYS: so chỉ kết quả.' },
      { t: 'rewrite', q: "It was a very stunning view.", start: 'What', a: ['What a stunning view it was!', 'What a stunning view!'], ex: 'Cảm thán với danh từ đếm được số ít: What a + adj + N!' },
      { t: 'rewrite', q: "The students worked very hard.", start: 'How', a: ['How hard the students worked!'], ex: 'Cảm thán với trạng từ: How + adv + S + V!' },
      { t: 'rewrite', q: "Tuition fees have risen, so fewer students are applying.", start: 'Because', a: ['Because tuition fees have risen, fewer students are applying.'], ex: 'Câu ghép → câu phức: Because + mệnh đề phụ, bỏ so.' },
      { t: 'combine', q: "Some people exercise regularly. They tend to sleep better.", hint: 'who', start: 'People who', a: ['People who exercise regularly tend to sleep better.'], ex: 'Câu phức với mệnh đề quan hệ who.' },
      { t: 'combine', q: "Rents are high. Wages have not kept pace.", hint: 'but', start: 'Rents are high', a: ['Rents are high, but wages have not kept pace.'], ex: 'Câu ghép: mệnh đề + , but + mệnh đề.' },
      { t: 'error', parts: ['What', 'beautiful city', 'Hanoi', 'is!'], w: 0, fix: 'What a', ex: 'Danh từ đếm được số ít → What a + adj + N.' },
      { t: 'error', parts: ['Although', 'the course was demanding,', 'but', 'most students enjoyed it.'], w: 2, fix: '(bỏ but)', ex: 'Although và but không dùng cùng nhau trong một câu.' }
    ]
  };
  (g.GRAMMAR || []).forEach(l => { if (D[l.id]) l.drills = D[l.id]; });
})(typeof self !== 'undefined' ? self : this);
