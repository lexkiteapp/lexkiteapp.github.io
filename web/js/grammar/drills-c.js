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
      { t: 'verb', q: "The doctor recommended that he ___ less salt. (eat)", a: ['eat', 'should eat'], ex: 'Sau recommend that dùng V nguyên mẫu cho mọi chủ ngữ.' },
      { t: 'verb', q: "It is essential that every applicant ___ a valid passport. (have)", a: ['have', 'should have'], ex: 'It is essential that + S + V nguyên mẫu (không chia theo ngôi).' },
      { t: 'verb', q: "The committee proposed that the deadline ___ by one week. (extend)", a: ['be extended', 'should be extended'], ex: 'Bị động của thức giả định: be + V3.' },
      { t: 'rewrite', q: "\"You should apply for the scholarship,\" my tutor said to me.", start: 'My tutor suggested that I', a: ['My tutor suggested that I apply for the scholarship.', 'My tutor suggested that I should apply for the scholarship.'], ex: 'suggest that + S + (should) + V nguyên mẫu.' },
      { t: 'rewrite', q: "Students must submit their essays on time. This is vital.", start: 'It is vital that', a: ['It is vital that students submit their essays on time.', 'It is vital that students should submit their essays on time.'], ex: 'It is vital that + S + V nguyên mẫu.' },
      { t: 'rewrite', q: "The manager insisted on everyone attending the meeting.", start: 'The manager insisted that', a: ['The manager insisted that everyone attend the meeting.', 'The manager insisted that everyone should attend the meeting.'], ex: 'insist that + S + V nguyên mẫu (attend, không phải attends).' },
      { t: 'rewrite', q: "\"Don't drive after taking this medicine,\" the doctor told the patient.", start: 'The doctor insisted that the patient', a: ['The doctor insisted that the patient not drive after taking this medicine.', 'The doctor insisted that the patient should not drive after taking this medicine.', 'The doctor insisted that the patient not drive after taking that medicine.', 'The doctor insisted that the patient should not drive after taking that medicine.'], ex: 'Phủ định của thức giả định: that + S + not + V.' },
      { t: 'rewrite', q: "The university requires each applicant to submit two references.", start: 'The university requires that each applicant', a: ['The university requires that each applicant submit two references.', 'The university requires that each applicant should submit two references.'], ex: 'require that + S + V nguyên mẫu (submit, không thêm -s).' },
      { t: 'error', parts: ['My tutor', 'suggested me to rewrite', 'the conclusion', 'before Friday.'], w: 1, fix: 'suggested that I rewrite', ex: 'Không dùng suggest + sb + to V; dùng suggest that + S + V hoặc suggest + V-ing.' },
      { t: 'error', parts: ['The board recommended', 'that the fee', 'was reduced', 'for low-income students.'], w: 2, fix: 'be reduced', ex: 'Sau recommend that, bị động dùng be + V3, không lùi thì.' }
    ],

    'preference-advice': [
      { t: 'verb', q: "You'd better ___ your password with anyone. (not / share)", a: ['not share'], ex: 'had better + not + V nguyên mẫu.' },
      { t: 'verb', q: "It's high time the council ___ the broken streetlights. (repair)", a: ['repaired'], ex: "It's high time + S + V2/ed để nói về hiện tại." },
      { t: 'verb', q: "Most commuters would prefer ___ from home two days a week. (work)", a: ['to work'], ex: 'would prefer + to V (muốn hơn) → would prefer to work.' },
      { t: 'rewrite', q: "I prefer cycling to driving to work.", start: 'I would rather', a: ['I would rather cycle than drive to work.', 'I would rather cycle to work than drive.', 'I would rather cycle to work than drive to work.'], ex: 'would rather + V + than + V (nguyên mẫu).' },
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
      { t: 'fill', q: "Excessive screen time can contribute ___ poor sleep.", a: ['to'], ex: 'contribute to sth = góp phần gây ra/dẫn đến → contribute to poor sleep.' },
      { t: 'fill', q: "Parents are responsible ___ their children's safety online.", a: ['for'], ex: 'be responsible for sth = chịu trách nhiệm về → responsible for.' },
      { t: 'fill', q: "There has been a sharp increase ___ the number of electric cars.", a: ['in'], ex: 'increase/rise/fall in + thứ thay đổi.' },
      { t: 'rewrite', q: "Tourism affects the local environment significantly.", start: 'Tourism has a significant', a: ['Tourism has a significant impact on the local environment.', 'Tourism has a significant effect on the local environment.'], ex: 'Đổi động từ affect thành danh từ: have an impact/effect ON sth; trạng từ significantly → tính từ significant đứng trước danh từ.' },
      { t: 'rewrite', q: "Women make up 60% of the workforce.", start: 'Women account', a: ['Women account for 60% of the workforce.'], ex: 'account for = chiếm (tỉ lệ).' },
      { t: 'rewrite', q: "Many residents oppose the construction of a new airport.", start: 'Many residents object', a: ['Many residents object to the construction of a new airport.'], ex: 'oppose sth = object TO sth (phản đối); sau to là danh từ hoặc V-ing → object to the construction.' },
      { t: 'rewrite', q: "A poor diet often causes heart disease.", start: 'A poor diet often leads', a: ['A poor diet often leads to heart disease.'], ex: 'lead to = dẫn đến.' },
      { t: 'rewrite', q: "Most people know about the dangers of smoking.", start: 'Most people are aware', a: ['Most people are aware of the dangers of smoking.'], ex: 'know about = be aware OF sth (nhận thức được) → are aware of the dangers.' },
      { t: 'error', parts: ['The new policy', 'will have', 'a positive effect', 'to small businesses.'], w: 3, fix: 'on small businesses.', ex: 'effect on, không phải effect to.' },
      { t: 'error', parts: ['Many students', 'find it hard', 'to cope', 'about exam pressure.'], w: 3, fix: 'with exam pressure.', ex: 'cope WITH sth = đối phó, xoay xở với → cope with exam pressure, không dùng about.' }
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
      { t: 'rewrite', q: "Because it rained heavily, the game was canceled.", start: 'Due to', a: ['Due to the heavy rain, the game was canceled.', 'Due to heavy rain, the game was canceled.', 'Due to heavy rainfall, the game was canceled.', 'Due to the heavy rainfall, the game was canceled.', 'Due to the heavy rain, the game was cancelled.', 'Due to heavy rain, the game was cancelled.', 'Due to the heavy rain, the game was canceled.', 'Due to heavy rain, the game was canceled.', 'Due to heavy rainfall, the game was canceled.', 'Due to the heavy rainfall, the game was canceled.'], ex: 'Due to + cụm danh từ thay cho because + mệnh đề.' },
      { t: 'rewrite', q: "The city expanded rapidly, which put pressure on housing.", start: 'The rapid', a: ['The rapid expansion of the city put pressure on housing.', "The rapid expansion of the city has put pressure on housing."], ex: 'expanded rapidly → the rapid expansion of the city làm chủ ngữ.' },
      { t: 'rewrite', q: "The government decided to raise taxes, and this led to protests.", start: "The government's", a: ["The government's decision to raise taxes led to protests."], ex: 'decided → decision; chủ ngữ thành sở hữu cách.' },
      { t: 'rewrite', q: "Tuition fees were introduced, and as a result applications fell.", start: 'The introduction', a: ['The introduction of tuition fees led to a fall in applications.', 'The introduction of tuition fees led to a drop in applications.', 'The introduction of tuition fees led to a decline in applications.', 'The introduction of tuition fees led to a decrease in applications.', 'The introduction of tuition fees reduced applications.', 'The introduction of tuition fees caused applications to fall.', 'The introduction of tuition fees resulted in a fall in applications.'], ex: 'Danh từ hóa: were introduced → the introduction of; fell → a fall/drop/decline in; nối nguyên nhân – kết quả bằng led to/resulted in + danh từ.' },
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
      { t: 'rewrite', q: "The toys belonging to the children were left in the yard.", start: "The children's", a: ["The children's toys were left in the yard."], ex: "Danh từ số nhiều bất quy tắc (children) → thêm 's." },
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
      { t: 'rewrite', q: "The plane was on the point of taking off when the engine failed.", start: 'The plane was about', a: ['The plane was about to take off when the engine failed.'], ex: 'be on the point of + V-ing = be about to + V nguyên mẫu (sắp sửa làm gì) → was about to take off.' },
      { t: 'combine', q: "The council intended to build a parking garage. Residents protested.", hint: 'was going to …, but', start: 'The council was going to', a: ['The council was going to build a parking garage, but residents protested.', 'The council was going to build a parking garage, but the residents protested.'], ex: 'was going to + but: dự định bị thay đổi.' },
      { t: 'combine', q: "We were ready to leave at that moment. Then the phone rang.", hint: 'about to … when', start: 'We were about to', a: ['We were about to leave when the phone rang.'], ex: 'was/were about to … when …: sắp làm thì có việc xen vào.' },
      { t: 'error', parts: ['In 2010,', 'experts predicted', 'that the economy', 'will recover by 2012.'], w: 3, fix: 'would recover by 2012.', ex: 'Dự đoán trong quá khứ → would, không dùng will.' },
      { t: 'error', parts: ['I was', 'about', 'leave the office', 'when my boss called me.'], w: 1, fix: 'about to', ex: 'Cấu trúc: be about to + V.' }
    ],

    'alternatives-to-if': [
      { t: 'fill', q: "___ we act now, the problem will get worse. (= if … not)", a: ['Unless'], ex: 'Unless = if … not (trừ khi): Nếu chúng ta không hành động ngay thì vấn đề sẽ tệ hơn → Unless.' },
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
      { t: 'fill', q: "Public transportation ___ reduce congestion, despite what its critics say.", a: ['does'], ex: 'Chủ ngữ số ít, hiện tại: does + V nguyên mẫu.' },
      { t: 'fill', q: "The reason why sales fell is ___ prices went up.", a: ['that'], ex: 'The reason why … is that + mệnh đề (không dùng because sau is) → that.' },
      { t: 'rewrite', q: "Governments need stricter laws.", start: 'What governments need', a: ['What governments need is stricter laws.'], ex: 'Câu chẻ: What + S + V + is + N.' },
      { t: 'rewrite', q: "The cost of housing concerns me most.", start: 'What concerns me most', a: ['What concerns me most is the cost of housing.'], ex: 'What + V + is + thông tin được nhấn mạnh.' },
      { t: 'rewrite', q: "Young people move to cities because wages are higher there.", start: 'The reason why young people move to cities', a: ['The reason why young people move to cities is that wages are higher there.'], ex: 'Câu nhấn mạnh lý do: The reason why + S + V + is that + S + V.' },
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
      { t: 'combine', q: "We will wait here. The rain will stop.", hint: 'until', start: 'We will wait here until', a: ['We will wait here until the rain stops.', 'We will wait here until the rain has stopped.'], ex: 'until + hiện tại đơn khi nói về tương lai.' },
      { t: 'error', parts: ['I will call you', 'as soon as', 'the meeting', 'will finish.'], w: 3, fix: 'finishes.', ex: 'Sau as soon as dùng hiện tại đơn, không dùng will.' },
      { t: 'error', parts: ['By the time', 'we got to the cinema,', 'the film', 'has already started.'], w: 3, fix: 'had already started.', ex: 'By the time + quá khứ đơn → quá khứ hoàn thành.' }
    ],

    'quantity-advanced': [
      { t: 'fill', q: "___ of the employees in our company work from home on Fridays. (hầu hết)", a: ['Most'], ex: 'Most of + the + N (nhóm xác định).' },
      { t: 'verb', q: "The number of international students ___ sharply since 2015. (rise)", a: ['has risen'], ex: 'The number of → động từ số ít; since → hiện tại hoàn thành.' },
      { t: 'fill', q: "The research project required a great ___ of funding.", a: ['deal'], ex: 'a great deal of + danh từ không đếm được.' },
      { t: 'rewrite', q: "Many factors have contributed to the decline.", start: 'A number of', a: ['A number of factors have contributed to the decline.'], ex: 'A number of (= nhiều) + N số nhiều + V số nhiều.' },
      { t: 'rewrite', q: "All the participants received a certificate.", start: 'Every', a: ['Every participant received a certificate.', 'Every one of the participants received a certificate.', 'Every single participant received a certificate.'], ex: 'Every + N số ít + V số ít.' },
      { t: 'rewrite', q: "Two thirds of the budget was spent on healthcare.", start: 'The government spent two thirds', a: ['The government spent two thirds of the budget on healthcare.'], ex: 'Phân số + of + the + N.' },
      { t: 'rewrite', q: "Most of the audience were teenagers.", start: 'The audience was mostly', a: ['The audience was mostly teenagers.', 'The audience was mostly made up of teenagers.', 'The audience was mostly composed of teenagers.'], ex: 'mostly = chủ yếu (trạng từ), khác most of.' },
      { t: 'rewrite', q: "Each of the four candidates gave a presentation.", start: 'All', a: ['All four candidates gave a presentation.', 'All of the four candidates gave a presentation.', 'All four candidates gave presentations.'], ex: 'Each of + N số nhiều ↔ All + N số nhiều.' },
      { t: 'error', parts: ['A large number of', 'residents', 'has complained', 'about the noise.'], w: 2, fix: 'have complained', ex: 'A (large) number of + N số nhiều → động từ số nhiều.' },
      { t: 'error', parts: ['The vast majority of', 'the respondent', 'said they', 'preferred online shopping.'], w: 1, fix: 'the respondents', ex: 'The majority of + N số nhiều.' }
    ],

    'paraphrase-structures': [
      { t: 'fill', q: "The box was ___ heavy for the child to carry.", a: ['too'], ex: 'too + tính từ + for sb + to V (quá… để ai làm gì) → too.' },
      { t: 'fill', q: "___ the heavy traffic, we arrived on time. (mặc dù)", a: ['Despite'], ex: 'Despite + cụm danh từ (không dùng although).' },
      { t: 'verb', q: "It ___ me two weeks to get used to the new job. (take)", a: ['took'], ex: 'It takes/took + sb + thời gian + to V.' },
      { t: 'rewrite', q: "Although he earned a high salary, he struggled to save money.", start: 'Despite', a: ['Despite earning a high salary, he struggled to save money.', 'Despite his high salary, he struggled to save money.', 'Despite the fact that he earned a high salary, he struggled to save money.', 'Despite having a high salary, he struggled to save money.'], ex: 'Although + mệnh đề → Despite + V-ing / N / the fact that.' },
      { t: 'rewrite', q: "I spent three hours finishing the assignment.", start: 'It took me', a: ['It took me three hours to finish the assignment.'], ex: 'spend + thời gian + V-ing ↔ It takes/took + sb + thời gian + to V → It took me three hours to finish the assignment.' },
      { t: 'rewrite', q: "She used to smoke, but she has stopped.", start: 'She no longer', a: ['She no longer smokes.'], ex: 'used to (nhưng nay không) ↔ no longer + V hiện tại.' },
      { t: 'rewrite', q: "The bridge was not completed until 2015.", start: 'It was not until 2015 that', a: ['It was not until 2015 that the bridge was completed.'], ex: 'It was not until + mốc thời gian + that + S + V2.' },
      { t: 'rewrite', q: "This is the first time I have visited London.", start: 'I have never', a: ['I have never visited London before.', 'I have never been to London before.'], ex: 'This is the first time + S + have V3 ↔ S + have never + V3 + before (chưa từng… trước đây).' },
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
      { t: 'rewrite', q: "The graph shows how many students enrolled in three courses.", start: 'The graph illustrates the number of', a: ['The graph illustrates the number of students who enrolled in three courses.', 'The graph illustrates the number of students enrolling in three courses.', 'The graph illustrates the number of students enrolled in three courses.', 'The graph illustrates the number of students that enrolled in three courses.'], ex: 'Viết lại câu mở bài Task 1: shows → illustrates; how many students → the number of students (who) enrolled.' },
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
      { t: 'rewrite', q: "My uncle lent me his car for the weekend.", start: 'My uncle lent his car', a: ['My uncle lent his car to me for the weekend.'], ex: 'lend sb sth = lend sth TO sb (cho ai mượn cái gì) → lent his car to me.' },
      { t: 'rewrite', q: "The company raised its prices by 5%.", start: 'The company\'s prices rose', a: ["The company's prices rose by 5%."], ex: 'Bỏ tân ngữ → dùng nội động từ rise.' },
      { t: 'rewrite', q: "The teacher showed the class a short video.", start: 'The teacher showed a short video', a: ['The teacher showed a short video to the class.'], ex: 'show sb sth = show sth TO sb (cho ai xem cái gì) → showed a short video to the class.' },
      { t: 'rewrite', q: "Sales fell because of the recession.", start: 'The recession reduced', a: ['The recession reduced sales.'], ex: 'fall (nội động từ) ↔ reduce + tân ngữ (ngoại động từ).' },
      { t: 'error', parts: ['The number of tourists', 'was risen', 'sharply', 'after the airport opened.'], w: 1, fix: 'rose', ex: 'rise là nội động từ, không dùng bị động.' },
      { t: 'error', parts: ['The situation', 'seems', 'increasingly', 'seriously.'], w: 3, fix: 'serious.', ex: 'Sau động từ nối seem dùng tính từ.' }
    ],

    'conjunctions': [
      { t: 'fill', q: "The hotel was expensive, ___ the service was surprisingly poor. (trái ngược)", a: ['yet', 'but'], ex: 'yet / but nối hai ý trái ngược.' },
      { t: 'fill', q: "You can pay ___ by card or in cash.", a: ['either'], ex: 'either … or: một trong hai.' },
      { t: 'fill', q: "Neither my parents ___ my brother is coming to the ceremony.", a: ['nor'], ex: 'Cặp liên từ neither … nor (không… cũng không) → nor.' },
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
      { t: 'verb', q: "The minister denied ___ about the payments. (know)", a: ['knowing', 'having known'], ex: 'deny + V-ing (phủ nhận đã làm gì) → denied knowing.' },
      { t: 'rewrite', q: "\"Where do you live?\" she asked me.", start: 'She asked me where', a: ['She asked me where I lived.'], ex: 'Bỏ do, đưa về S + V, lùi thì.' },
      { t: 'rewrite', q: "\"Don't use your phones during the test,\" the teacher said to us.", start: 'The teacher told us', a: ['The teacher told us not to use our phones during the test.'], ex: 'Mệnh lệnh phủ định → tell sb not to V.' },
      { t: 'rewrite', q: "\"I'm sorry I was late,\" Tom said.", start: 'Tom apologised for', a: ['Tom apologised for being late.', 'Tom apologised for having been late.'], ex: 'Lời xin lỗi tường thuật bằng apologise FOR + V-ing (hoặc having V3 để nhấn mạnh việc đã xảy ra) → Tom apologised for being late.' },
      { t: 'rewrite', q: "\"You stole the documents!\" the police said to him.", start: 'The police accused him', a: ['The police accused him of stealing the documents.', 'The police accused him of having stolen the documents.'], ex: 'Lời buộc tội tường thuật bằng accuse sb OF + V-ing → The police accused him of stealing the documents.' },
      { t: 'rewrite', q: "\"Have you studied abroad?\" the examiner asked me.", start: 'The examiner asked me', a: ['The examiner asked me whether I had studied abroad.', 'The examiner asked me if I had studied abroad.'], ex: 'Yes/No → if/whether; hiện tại hoàn thành → quá khứ hoàn thành.' },
      { t: 'error', parts: ['She asked me', 'where', 'did I live', 'before moving to Hanoi.'], w: 2, fix: 'I had lived', ex: 'Câu hỏi tường thuật không đảo trợ động từ: S + V, lùi thì.' },
      { t: 'error', parts: ['My friend', 'suggested', 'to go', 'to the museum together.'], w: 2, fix: 'going', ex: 'suggest + V-ing, không dùng to V.' }
    ],

    'sentence-types': [
      { t: 'fill', q: "___ an interesting talk it was!", a: ['What'], ex: 'Câu cảm thán có danh từ (talk): What + a/an + tính từ + danh từ (+ S + V)! → What.' },
      { t: 'fill', q: "___ fast technology develops!", a: ['How'], ex: 'Câu cảm thán với trạng từ/tính từ (fast) không có danh từ: How + adj/adv + S + V! → How.' },
      { t: 'fill', q: "Tuition fees have risen, ___ fewer students are applying. (kết quả)", a: ['so'], ex: 'Câu ghép với FANBOYS: so chỉ kết quả.' },
      { t: 'rewrite', q: "It was a really stunning view.", start: 'What', a: ['What a stunning view it was!', 'What a stunning view!'], ex: 'Cảm thán với danh từ đếm được số ít: What a + adj + N!' },
      { t: 'rewrite', q: "The students worked very hard.", start: 'How', a: ['How hard the students worked!'], ex: 'Cảm thán với trạng từ: How + adv + S + V!' },
      { t: 'rewrite', q: "Tuition fees have risen, so fewer students are applying.", start: 'Because', a: ['Because tuition fees have risen, fewer students are applying.'], ex: 'Câu ghép → câu phức: Because + mệnh đề phụ, bỏ so.' },
      { t: 'combine', q: "Some people exercise regularly. They tend to sleep better.", hint: 'who', start: 'People who', a: ['People who exercise regularly tend to sleep better.'], ex: 'Câu phức với mệnh đề quan hệ who.' },
      { t: 'combine', q: "Rents are high. Wages have not kept pace.", hint: 'but', start: 'Rents are high', a: ['Rents are high, but wages have not kept pace.'], ex: 'Câu ghép: mệnh đề + , but + mệnh đề.' },
      { t: 'error', parts: ['What', 'beautiful city', 'Hanoi', 'is!'], w: 0, fix: 'What a', ex: 'Danh từ đếm được số ít → What a + adj + N.' },
      { t: 'error', parts: ['Although', 'the course was demanding,', 'but', 'most students enjoyed it.'], w: 2, fix: '(bỏ but)', ex: 'Although và but không dùng cùng nhau trong một câu.' }
    ]
  };
  (g.GRAMMAR || []).forEach(l => { if (D[l.id]) l.drills = D[l.id]; });
  /* Bổ sung tự luận C1 (tự biên soạn): nối thêm vào bài tập sẵn có của chương, không thay thế */
  const X = {
    'inversion-cleft': [
      { t: 'rewrite', q: "I had never seen such a beautiful sunset before.", start: 'Never before', a: ['Never before had I seen such a beautiful sunset.'], ex: 'Never before đứng đầu câu → đảo trợ động từ had lên trước chủ ngữ: Never before had I seen…' },
      { t: 'rewrite', q: "He didn't realize his mistake until he got home.", start: 'Not until', a: ['Not until he got home did he realize his mistake.', 'Not until he got home did he realise his mistake.'], ex: 'Not until + mệnh đề đứng đầu → mệnh đề chính đảo ngữ với did: did he realise.' },
      { t: 'rewrite', q: 'The location of the hotel impressed us most.', start: 'What', a: ['What impressed us most was the location of the hotel.', 'What impressed us the most was the location of the hotel.'], ex: 'Câu chẻ với What: What + V + was + điều được nhấn mạnh.' },
      { t: 'fill', q: 'Little ___ they know that the shop would close the next day.', a: ['did'], ex: 'Little (hầu như không) đứng đầu câu mang nghĩa phủ định → đảo ngữ với trợ động từ did.' },
      { t: 'error', parts: ['Hardly', 'we had sat down', 'when the fire alarm', 'went off.'], w: 1, fix: 'had we sat down', ex: 'Hardly… when đứng đầu câu → phải đảo ngữ: Hardly had we sat down when…' },
    ],
    'subjunctive': [
      { t: 'verb', q: 'The landlord demanded that the rent ___ on time every month. (pay – bị động)', a: ['be paid', 'should be paid'], ex: 'demand that + S + be + V3 (thể giả định, bị động); không chia theo chủ ngữ.' },
      { t: 'verb', q: 'It is crucial that every member ___ the safety rules. (follow)', a: ['follow', 'should follow'], ex: 'It is crucial that + S + V nguyên mẫu (thể giả định) → follow, không thêm -s.' },
      { t: 'rewrite', q: 'If it were not for your support, I would give up.', start: 'Were it not', a: ['Were it not for your support, I would give up.'], ex: 'Đảo ngữ điều kiện loại 2: Were it not for + N = If it were not for + N.' },
      { t: 'rewrite', q: '"You should apply early," the adviser said to us.', start: 'The adviser recommended that', a: ['The adviser recommended that we apply early.', 'The adviser recommended that we should apply early.'], ex: 'recommend that + S + (should) + V nguyên mẫu → that we apply early.' },
      { t: 'error', parts: ['The committee insisted', 'that the report', 'is rewritten', 'before Friday.'], w: 2, fix: 'be rewritten', ex: 'insist that + S + be + V3 (thể giả định) → be rewritten, không dùng is.' },
    ],
    'hedging': [
      { t: 'rewrite', q: 'Social media causes anxiety in teenagers.', start: 'Social media may', a: ['Social media may cause anxiety in teenagers.'], ex: 'Rào đón bằng động từ khuyết thiếu may + V nguyên mẫu để giảm mức khẳng định.' },
      { t: 'rewrite', q: 'Perhaps the results are wrong.', start: 'The results appear', a: ['The results appear to be wrong.'], ex: 'appear + to be + tính từ (dường như…) là cách rào đón trang trọng.' },
      { t: 'fill', q: 'The data ___ to suggest that older drivers are safer. (khuynh hướng)', a: ['tends', 'seems', 'appears', 'tend', 'seem', 'appear'], ex: 'tend/seem/appear + to V để làm nhẹ mức khẳng định; data có thể coi là số ít (tends) hoặc số nhiều trong văn học thuật (tend).' },
      { t: 'fill', q: 'It is ___ that the new policy will reduce traffic. (có khả năng)', a: ['likely', 'possible', 'probable'], ex: 'It is likely/possible that… (có khả năng là…) – cách rào đón quen thuộc trong văn học thuật.' },
      { t: 'error', parts: ['The evidence', 'proves', 'that exercise may', 'improve memory.'], w: 1, fix: 'suggests', ex: '"may" cho thấy kết luận còn dè dặt; "proves" khẳng định chắc chắn nên mâu thuẫn → suggests.' },
    ],
    'nominalisation': [
      { t: 'form', q: 'The ___ of the new airport has created thousands of jobs. (CONSTRUCT)', a: ['construction'], ex: 'Sau The và trước of cần danh từ: construct → construction.' },
      { t: 'form', q: 'There has been a sharp ___ in the cost of housing. (RISE)', a: ['rise', 'increase'], ex: 'a + tính từ + danh từ: a sharp rise (sự tăng mạnh) in…' },
      { t: 'rewrite', q: 'Prices increased rapidly, so many families struggled.', start: 'The rapid', a: ['The rapid increase in prices caused many families to struggle.', 'The rapid increase in prices meant that many families struggled.', 'The rapid rise in prices caused many families to struggle.'], ex: 'Danh từ hóa: increased rapidly → the rapid increase in prices; nối kết quả bằng caused + O + to V.' },
      { t: 'rewrite', q: 'The council decided to close the library, and residents were angry.', start: "The council's decision", a: ["The council's decision to close the library angered residents.", "The council's decision to close the library made residents angry."], ex: 'decided to → decision to + V; were angry → động từ angered/made… angry.' },
      { t: 'error', parts: ['The analyse', 'of the data', 'took', 'three weeks.'], w: 0, fix: 'The analysis', ex: 'Sau The cần danh từ: analyse (động từ) → analysis.' },
    ],
    'alternatives-to-if': [
      { t: 'rewrite', q: 'If you need more information, please contact us.', start: 'Should', a: ['Should you need more information, please contact us.'], ex: 'Đảo ngữ loại 1: Should + S + V = If + S + V.' },
      { t: 'rewrite', q: 'If she had studied harder, she would have passed.', start: 'Had', a: ['Had she studied harder, she would have passed.'], ex: 'Đảo ngữ loại 3: Had + S + V3 = If + S + had V3.' },
      { t: 'fill', q: 'You can use the car ___ long as you fill up the tank.', a: ['as', 'so'], ex: 'as long as / so long as = miễn là.' },
      { t: 'fill', q: 'Take a map with you ___ case your phone battery runs out.', a: ['in'], ex: 'in case + mệnh đề = phòng khi.' },
      { t: 'error', parts: ['Unless', "you don't book", 'in advance,', "you won't get a seat."], w: 1, fix: 'you book', ex: 'Unless đã mang nghĩa phủ định (= if… not) nên mệnh đề sau ở dạng khẳng định: Unless you book…' },
    ],
    'emphasis-variety': [
      { t: 'rewrite', q: 'The noise kept me awake.', start: 'It was', a: ['It was the noise that kept me awake.'], ex: 'Câu chẻ It was + cụm danh từ + that + V để nhấn mạnh nguyên nhân.' },
      { t: 'rewrite', q: 'We need more time.', start: 'What we need', a: ['What we need is more time.'], ex: 'Câu chẻ What-cleft: What + S + V + is + điều được nhấn mạnh.' },
      { t: 'fill', q: 'She ___ finish the report on time, although nobody believed she would.', a: ['did'], ex: 'Trợ động từ nhấn mạnh did + V nguyên mẫu (thật sự đã…).' },
      { t: 'fill', q: '___ was the demand that the store ran out of stock in a day.', a: ['Such'], ex: 'Đảo ngữ nhấn mạnh Such + be + N + that… (… đến mức mà).' },
      { t: 'error', parts: ['It was', 'in Hanoi', 'where', 'I first met her.'], w: 2, fix: 'that', ex: 'Câu chẻ nhấn mạnh trạng ngữ nơi chốn dùng It was + in Hanoi + that…; dạng chuẩn là that.' },
    ],
  };
  (g.GRAMMAR || []).forEach(l => { if (X[l.id]) l.drills = (l.drills || []).concat(X[l.id]); });
  /* Lô 3 (tự biên soạn): +10 câu tự luận ngữ cảnh học thuật/IELTS cho 6 chủ đề academic – nối thêm, không thay thế */
  const X3 = {
    'participle-clauses': [
      { t: 'verb', q: '___ by the results of the pilot study, the team applied for a larger grant. (encourage)', a: ['Encouraged'], ex: 'Nhóm nghiên cứu ĐƯỢC kết quả khích lệ → nghĩa bị động → V3/ed: Encouraged. "Encouraging" sai vì khi đó nhóm là người đi khích lệ người khác.' },
      { t: 'verb', q: '___ for over a decade, the survey provides a reliable picture of household spending. (conduct)', a: ['Conducted', 'Having been conducted'], ex: 'Cuộc khảo sát ĐƯỢC tiến hành → bị động → Conducted (hoặc Having been conducted để nhấn mạnh đã xảy ra trước). "Conducting" sai vì khảo sát không tự tiến hành.' },
      { t: 'verb', q: 'The figures, ___ from twelve hospitals, show a steady decline in waiting times. (collect)', a: ['collected'], ex: 'Mệnh đề quan hệ rút gọn bị động: the figures (which were) collected → collected. "collecting" sai vì số liệu không tự thu thập.' },
      { t: 'verb', q: '___ the lecture twice, I finally understood the theory. (watch – xong trước)', a: ['Having watched'], ex: 'Hành động chủ động hoàn tất TRƯỚC hành động chính → Having + V3. "Watched" sai vì mang nghĩa bị động (bài giảng được xem), không hợp với chủ ngữ "I".' },
      { t: 'rewrite', q: 'As the author lives in Kenya, she writes mainly about East African politics.', start: 'Living', a: ['Living in Kenya, the author writes mainly about East African politics.'], ex: 'Mệnh đề lý do chủ động, cùng chủ ngữ → V-ing. Chủ ngữ "the author" phải đứng ngay sau dấu phẩy; viết "Living in Kenya, she…" mà chưa nêu "the author" sẽ làm mất thông tin.' },
      { t: 'rewrite', q: 'The essay was written in a hurry, so it contained several careless errors.', start: 'Written', a: ['Written in a hurry, the essay contained several careless errors.'], ex: 'Vế bị động rút gọn thành V3 ở đầu câu; chủ ngữ chung "the essay" đứng ngay sau dấu phẩy, bỏ "so".' },
      { t: 'combine', q: 'The participants were divided into two groups. They completed the same memory test.', start: 'Divided', a: ['Divided into two groups, the participants completed the same memory test.'], ex: 'Hai câu cùng chủ ngữ; câu đầu bị động → rút gọn thành V3 (Divided), chủ ngữ "the participants" đứng sau dấu phẩy.' },
      { t: 'combine', q: 'The researchers had analysed the interviews. They identified three main themes.', start: 'Having', a: ['Having analysed the interviews, the researchers identified three main themes.'], ex: 'Hành động phân tích xong trước → Having + V3; giữ chủ ngữ "the researchers" ở mệnh đề chính.' },
      { t: 'error', parts: ['The students', 'interviewing for the study', 'were all aged', 'between 18 and 25.'], w: 1, fix: 'interviewed for the study', ex: 'Sinh viên ĐƯỢC phỏng vấn → mệnh đề quan hệ rút gọn bị động dùng V3: (who were) interviewed. "interviewing" mang nghĩa chủ động – sinh viên đi phỏng vấn người khác.' },
      { t: 'error', parts: ['Publishing', 'in 1859,', 'Darwin\'s book', 'changed biology forever.'], w: 0, fix: 'Published', ex: 'Cuốn sách ĐƯỢC xuất bản → bị động → Published. "Publishing" ngụ ý cuốn sách tự xuất bản – sai nghĩa.' },
    ],
    'subjunctive': [
      { t: 'verb', q: 'The examiners require that each candidate ___ photo identification on the test day. (show)', a: ['show', 'should show'], ex: 'require that + S + V nguyên mẫu cho mọi ngôi → show. Lỗi phổ biến "shows" sai vì thức giả định không thêm -s.' },
      { t: 'verb', q: 'It is imperative that the samples ___ at a low temperature. (store – bị động)', a: ['be stored', 'should be stored'], ex: 'It is imperative that + S + be + V3 (giả định, bị động). "are stored" sai vì sau cấu trúc này không chia thì.' },
      { t: 'fill', q: 'The report recommends that the government ___ not reduce funding for public libraries.', a: ['should'], ex: 'Giả định phủ định: that + S + (should) + not + V. Chỗ trống đứng trước "not reduce" nên điền should; "does" hay "do" sai vì thức giả định không dùng trợ động từ do.' },
      { t: 'fill', q: 'The professor asked ___ the assignment be submitted electronically.', a: ['that'], ex: 'ask that + S + V nguyên mẫu (be submitted). Không dùng "to" vì sau chỗ trống là một mệnh đề có chủ ngữ riêng.' },
      { t: 'rewrite', q: 'The council must consult local residents first. It is important.', start: 'It is important that the council', a: ['It is important that the council consult local residents first.', 'It is important that the council should consult local residents first.'], ex: 'It is important that + S + (should) + V nguyên mẫu → consult, không phải consults.' },
      { t: 'rewrite', q: '"Students should not use phones during the exam," the invigilator said.', start: 'The invigilator insisted that students', a: ['The invigilator insisted that students not use phones during the exam.', 'The invigilator insisted that students should not use phones during the exam.'], ex: 'Phủ định của giả định: that + S + not + V (không dùng do not/did not).' },
      { t: 'rewrite', q: 'The panel suggested a review of the admissions policy.', start: 'The panel suggested that the admissions policy', a: ['The panel suggested that the admissions policy be reviewed.', 'The panel suggested that the admissions policy should be reviewed.'], ex: 'suggest that + S + be + V3 khi chủ ngữ là đối tượng chịu tác động → be reviewed. "was reviewed" sai vì không lùi thì sau suggest that.' },
      { t: 'rewrite', q: 'The supervisor wants every intern to attend the training session. She has demanded this.', start: 'The supervisor has demanded that every intern', a: ['The supervisor has demanded that every intern attend the training session.', 'The supervisor has demanded that every intern should attend the training session.'], ex: 'demand that + S + V nguyên mẫu → attend (không attends dù chủ ngữ số ít).' },
      { t: 'error', parts: ['It is essential', 'that the data', 'is checked', 'by an independent expert.'], w: 2, fix: 'be checked', ex: 'Sau It is essential that dùng be + V3 cho bị động giả định; "is checked" là cách chia thông thường, không đúng chuẩn trang trọng.' },
      { t: 'error', parts: ['The ethics committee', 'proposed', 'that the study to be paused', 'until further notice.'], w: 2, fix: 'that the study be paused', ex: 'propose that + S + be + V3; không chèn "to" vì đây là mệnh đề có chủ ngữ, không phải cấu trúc to-V.' },
    ],
    'hedging': [
      { t: 'fill', q: 'These findings ___ indicate that sleep quality affects exam performance. (có thể – mức dè dặt)', a: ['may', 'might', 'could'], ex: 'Động từ khuyết thiếu may/might/could + V nguyên mẫu làm giảm mức chắc chắn. "must" sai vì lại khẳng định mạnh.' },
      { t: 'fill', q: 'There is ___ evidence that bilingual children are better at switching tasks. (một số – không tuyệt đối)', a: ['some'], ex: 'some evidence (một số bằng chứng) dè dặt hơn "clear/strong evidence". "a" sai vì evidence là danh từ không đếm được.' },
      { t: 'form', q: 'The new tax is ___ to affect low-income families the most. (LIKE)', a: ['likely'], ex: 'be likely to + V (có khả năng) – tính từ likely. "like" sai vì không có cấu trúc be like to V.' },
      { t: 'form', q: 'This is ___ the most important discovery of the decade. (ARGUE)', a: ['arguably'], ex: 'Trạng từ arguably (có thể cho rằng) đứng trước so sánh nhất để rào đón. "arguable" là tính từ, không bổ nghĩa cho cả cụm.' },
      { t: 'rewrite', q: 'Remote work increases productivity.', start: 'There is some evidence that', a: ['There is some evidence that remote work increases productivity.', 'There is some evidence that remote work can increase productivity.', 'There is some evidence that remote work may increase productivity.'], ex: 'There is some evidence that + mệnh đề: trình bày kết luận như một phát hiện có giới hạn thay vì sự thật tuyệt đối.' },
      { t: 'rewrite', q: 'The decline in bee populations is caused by pesticides.', start: 'The decline in bee populations may', a: ['The decline in bee populations may be caused by pesticides.', 'The decline in bee populations may be partly caused by pesticides.'], ex: 'may + be + V3 (bị động dè dặt). Không viết "may is caused" – sau may phải là V nguyên mẫu "be".' },
      { t: 'rewrite', q: 'Everyone agrees that university education should be free.', start: 'It could be argued that', a: ['It could be argued that university education should be free.'], ex: 'It could be argued that… thay cho "Everyone agrees" – tránh khái quát quá mức, một lỗi hay bị trừ điểm Task Response.' },
      { t: 'rewrite', q: 'Video games make children violent.', start: 'Video games can', a: ['Video games can make some children more aggressive.', 'Video games can make children more aggressive.', 'Video games can make some children violent.', 'Video games can make children violent.'], ex: 'can + V nói về khả năng chứ không phải luôn luôn; thêm "some" giúp tránh khái quát cho mọi trẻ em.' },
      { t: 'error', parts: ['The results', 'seem', 'proving', 'that the drug is effective.'], w: 2, fix: 'to suggest', ex: 'seem + to V; và "prove" quá chắc chắn, mâu thuẫn với "seem". Dùng: seem to suggest.' },
      { t: 'error', parts: ['It is', 'possibly', 'that prices', 'will fall next year.'], w: 1, fix: 'possible', ex: 'Cấu trúc It is + tính từ + that…: possible. "possibly" là trạng từ, không đứng sau be làm vị ngữ.' },
    ],
    'nominalisation': [
      { t: 'form', q: 'The ___ of plastic bags fell by half after the charge was introduced. (CONSUME)', a: ['consumption'], ex: 'The … of cần danh từ: consume → consumption. Lỗi hay gặp "consumation" – sai chính tả.' },
      { t: 'form', q: 'A lack of ___ between departments delayed the project. (COMMUNICATE)', a: ['communication'], ex: 'Sau of cần danh từ: communication. "communicate" là động từ, không đứng sau giới từ.' },
      { t: 'form', q: 'The ___ of the results to other countries is limited. (APPLY)', a: ['applicability', 'application'], ex: 'applicability (khả năng áp dụng) là danh từ chính xác nhất; application cũng chấp nhận. "apply" là động từ nên sai vị trí.' },
      { t: 'form', q: 'There has been growing ___ of the risks of fast fashion. (AWARE)', a: ['awareness'], ex: 'Tính từ aware → danh từ awareness (sự nhận thức). Đuôi -ness tạo danh từ chỉ trạng thái.' },
      { t: 'rewrite', q: 'Researchers measured the noise carefully, and this showed it was harmful.', start: 'Careful measurement of', a: ['Careful measurement of the noise showed that it was harmful.', 'Careful measurement of the noise showed it was harmful.'], ex: 'Động từ measured → danh từ measurement; trạng từ carefully → tính từ careful đứng trước danh từ.' },
      { t: 'rewrite', q: 'Because the population is aging, health costs are rising.', start: 'The aging of the population', a: ['The aging of the population is causing health costs to rise.', 'The aging of the population is leading to rising health costs.', 'The aging of the population is driving up health costs.', 'The ageing of the population is causing health costs to rise.', 'The ageing of the population is leading to rising health costs.', 'The ageing of the population is driving up health costs.'], ex: 'Biến mệnh đề lý do thành cụm danh từ làm chủ ngữ, dùng động từ quan hệ nhân quả (cause/lead to/drive up).' },
      { t: 'rewrite', q: 'Companies failed to protect user data, which damaged public trust.', start: "Companies' failure", a: ["Companies' failure to protect user data damaged public trust."], ex: 'failed to V → failure to V (danh từ giữ nguyên cấu trúc to V); mệnh đề "which damaged" trở thành động từ chính.' },
      { t: 'combine', q: 'The school introduced free breakfasts. Attendance improved noticeably.', start: 'The introduction of', a: ['The introduction of free breakfasts led to a noticeable improvement in attendance.', 'The introduction of free breakfasts resulted in a noticeable improvement in attendance.'], ex: 'introduced → introduction; improved noticeably → a noticeable improvement in; nối bằng led to/resulted in.' },
      { t: 'error', parts: ['The rapid', 'grow', 'of online shopping', 'has hurt small stores.'], w: 1, fix: 'growth', ex: 'Sau tính từ rapid và trước of cần danh từ: growth. "grow" là động từ.' },
      { t: 'error', parts: ['The government', 'announced', 'the reduce of', 'public transit fares.'], w: 2, fix: 'a reduction in', ex: 'Danh từ của reduce là reduction và đi với giới từ in (a reduction in fares), không dùng "reduce of".' },
    ],
    'paraphrase-ielts': [
      { t: 'form', q: '"Car ownership doubled." → There was a ___ in car ownership. (DOUBLE)', a: ['doubling', 'twofold increase'], ex: 'Danh từ hóa: double → a doubling in; hoặc a twofold increase. Viết "a double in" là sai từ loại.' },
      { t: 'form', q: '"Exports fell steadily." → Exports experienced a ___ decline. (STEADILY)', a: ['steady'], ex: 'Bổ nghĩa cho danh từ decline cần tính từ steady; trạng từ steadily chỉ đi với động từ (fell steadily).' },
      { t: 'fill', q: '"Most people prefer shopping online." → The ___ of people prefer shopping online.', a: ['majority'], ex: 'Most people = the majority of people. "major" là tính từ, không dùng thay danh từ.' },
      { t: 'fill', q: '"About a third of students walk to school." → ___ one in three students walk to school.', a: ['Roughly', 'Approximately', 'Around', 'Nearly', 'Almost'], ex: 'Đổi phân số thành tỉ lệ "one in three" và giữ ý xấp xỉ bằng roughly/approximately/around.' },
      { t: 'rewrite', q: 'Some people think that zoos should be closed.', start: 'It is argued by some that', a: ['It is argued by some that zoos should be closed.', 'It is argued by some that zoos should close.'], ex: 'Đổi "Some people think" sang cấu trúc bị động khách quan It is argued by some that… để paraphrase câu đề.' },
      { t: 'rewrite', q: 'The number of cyclists in the city went up from 2,000 to 5,000.', start: 'The city saw', a: ['The city saw an increase in the number of cyclists from 2,000 to 5,000.', 'The city saw a rise in the number of cyclists from 2,000 to 5,000.', 'The city saw growth in the number of cyclists from 2,000 to 5,000.', 'The city saw an increase in the number of cyclists from 2,000 to 5,000.', 'The city saw a rise in the number of cyclists from 2,000 to 5,000.'], ex: 'Cấu trúc "X saw an increase in…" thay chủ ngữ và danh từ hóa động từ went up.' },
      { t: 'rewrite', q: 'Young people spend less time reading books than in the past.', start: 'Compared with', a: ['Compared with the past, young people spend less time reading books.', 'Compared with the past, young people now spend less time reading books.'], ex: 'Đưa phần so sánh lên đầu bằng Compared with…; tránh lặp nguyên văn câu đề.' },
      { t: 'rewrite', q: 'The pie chart shows how the budget was spent.', start: 'The pie chart illustrates', a: ['The pie chart illustrates how the budget was spent.', 'The pie chart illustrates the way the budget was spent.', 'The pie chart illustrates how the budget was allocated.'], ex: 'Mở bài Task 1: đổi động từ shows → illustrates; có thể đổi spent → allocated.' },
      { t: 'error', parts: ['The bar chart', 'compares', 'the amount of', 'students in five countries.'], w: 2, fix: 'the number of', ex: 'students là danh từ đếm được → the number of; the amount of chỉ dùng với danh từ không đếm được (the amount of money/water).' },
      { t: 'error', parts: ['The proportion of', 'elderly people', 'are expected', 'to rise by 2050.'], w: 2, fix: 'is expected', ex: 'Chủ ngữ chính là "The proportion" (số ít), không phải "people" → is expected. Lỗi hòa hợp chủ – vị này rất hay gặp trong IELTS Task 1.' },
    ],
    'alternatives-to-if': [
      { t: 'fill', q: 'The data can be shared, ___ that participants\' names are removed.', a: ['provided', 'providing'], ex: 'provided/providing that = với điều kiện là. "provide" (nguyên mẫu) sai vì cần dạng phân từ làm liên từ.' },
      { t: 'fill', q: '___ the experiment fail, the team will repeat it with a larger sample. (đảo ngữ, không dùng If)', a: ['Should'], ex: 'Should + S + V nguyên mẫu (fail, không fails) = If the experiment fails.' },
      { t: 'fill', q: '___ for the scholarship, I could not have afforded the course.', a: ['But', 'Had it not been'], ex: 'But for + N = nếu không có (loại 3 ở đây vì vế sau là could not have). Cũng có thể dùng Had it not been for.' },
      { t: 'fill', q: 'Bring a printed copy of your essay ___ the projector does not work.', a: ['in case'], ex: 'in case = phòng khi (chuẩn bị trước). Không dùng "if" vì nghĩa là luôn mang theo, không phụ thuộc vào máy chiếu.' },
      { t: 'rewrite', q: 'If the university were to raise fees, applications would fall.', start: 'Were', a: ['Were the university to raise fees, applications would fall.'], ex: 'Đảo ngữ loại 2 với were to: Were + S + to V. Không viết "Were the university raise" – thiếu "to".' },
      { t: 'rewrite', q: 'If the researchers had not received extra funding, the project would have stopped.', start: 'Had', a: ['Had the researchers not received extra funding, the project would have stopped.'], ex: 'Đảo ngữ loại 3 phủ định: Had + S + not + V3. Không viết "Hadn\'t the researchers" trong văn trang trọng.' },
      { t: 'rewrite', q: 'You can join the seminar only if you have read the article.', start: 'You can join the seminar on condition that', a: ['You can join the seminar on condition that you have read the article.'], ex: 'on condition that = chỉ khi/với điều kiện là – trang trọng, thay cho only if.' },
      { t: 'rewrite', q: 'Imagine that robots did all manual jobs. What would workers do?', start: 'Supposing', a: ['Supposing robots did all manual jobs, what would workers do?', 'Supposing that robots did all manual jobs, what would workers do?'], ex: 'Supposing (that) + quá khứ đơn = giả sử… (giả định không có thật ở hiện tại), dùng như If.' },
      { t: 'error', parts: ['In case', 'it rains,', 'the graduation ceremony', 'will be moved indoors.'], w: 0, fix: 'If', ex: 'in case = phòng khi (làm trước để đề phòng); ở đây việc chuyển vào trong nhà là HỆ QUẢ khi trời mưa → dùng If. Lỗi thường gặp là coi in case = if.' },
      { t: 'error', parts: ['As long as', 'the government will invest', 'in public transportation,', 'traffic will improve.'], w: 1, fix: 'the government invests', ex: 'Sau as long as (giống If loại 1) dùng hiện tại đơn, không dùng will.' },
    ],
  };
  (g.GRAMMAR || []).forEach(l => { if (X3[l.id]) l.drills = (l.drills || []).concat(X3[l.id]); });
  /* Lô 18 (tự biên soạn): +10 câu trắc nghiệm C1 cho mỗi chủ đề academic – nối thêm vào quiz sẵn có */
  const Q4 = {
    'inversion-cleft': [
      { q: 'Only after the results were published ___ how serious the problem was.', options: ['did the public realize', 'the public realized', 'the public did realize', 'realized the public'], answer: 0, explain: 'Only after + mệnh đề đứng đầu câu → đảo ngữ ở mệnh đề chính: did + S + V. "the public realised" và "the public did realise" không đảo; "realised the public" đảo sai (phải đảo trợ động từ did).' },
      { q: 'Not once ___ the manager thank the team for their extra work.', options: ['did', 'has', 'was', 'does'], answer: 0, explain: 'Not once đứng đầu → đảo trợ động từ; động từ chính thank ở dạng nguyên mẫu nên cần did (quá khứ). "has" cần V3 (thanked); "was" không đi với V nguyên mẫu; "does" sai thì vì câu kể chuyện đã qua.' },
      { q: 'So complex ___ that few readers understood it.', options: ['was the argument', 'the argument was', 'did the argument', 'the argument did'], answer: 0, explain: 'So + tính từ đứng đầu câu → đảo be lên trước chủ ngữ: So complex was the argument that… Hai phương án không đảo sai cấu trúc; "did the argument" sai vì complex là tính từ, cần be.' },
      { q: '___ the new software that caused the delays, not the staff.', options: ['It was', 'What was', 'There was', 'That was'], answer: 0, explain: 'Câu chẻ nhấn mạnh danh từ: It was + N + that… "What was" dùng cho câu chẻ What (What caused the delays was…); "There was" và "That was" không tạo câu chẻ với mệnh đề that.' },
      { q: 'What the committee needs ___ a clear plan.', options: ['is', 'are', 'were', 'being'], answer: 0, explain: 'Câu chẻ What-clause làm chủ ngữ được coi là số ít → is. "are/were" sai hòa hợp (dù data có thể số nhiều, chủ ngữ là cả mệnh đề What…); "being" không phải động từ chính.' },
      { q: 'Under no circumstances ___ personal data be shared without consent.', options: ['should', 'we should', 'it should', 'should not'], answer: 0, explain: 'Under no circumstances (đã mang nghĩa phủ định) đứng đầu → đảo should lên trước chủ ngữ personal data. "we should", "it should" thừa chủ ngữ và không đảo; "should not" tạo phủ định kép.' },
      { q: 'Little ___ that the decision would change the company forever.', options: ['did they suspect', 'they suspected', 'they did suspect', 'suspected they'], answer: 0, explain: 'Little (hầu như không) đứng đầu với nghĩa phủ định → đảo: did + S + V. Hai phương án giữ trật tự thường là sai; "suspected they" đảo động từ chính – sai.' },
      { q: 'It was not until 2010 ___ the policy was finally introduced.', options: ['that', 'when', 'which', 'since'], answer: 0, explain: 'Cấu trúc cố định: It was not until + thời gian + that + mệnh đề. "when" và "which" không dùng trong câu chẻ này; "since" sai nghĩa.' },
      { q: 'Hardly ___ the meeting started when the fire alarm went off.', options: ['had', 'did', 'has', 'was'], answer: 0, explain: 'Hardly … when diễn tả hai việc nối tiếp trong quá khứ → đảo quá khứ hoàn thành: Hardly had + S + V3. "did" đi với V nguyên mẫu (start), "has" sai thì, "was" không tạo được V3 chủ động "started".' },
      { q: 'All I want ___ a clear explanation of the costs.', options: ['is', 'are', 'be', 'to be'], answer: 0, explain: 'Câu chẻ All + mệnh đề làm chủ ngữ (= the only thing) → động từ số ít is. "are" sai hòa hợp; "be" và "to be" không phải động từ chia.' },
    ],
    'subjunctive': [
      { q: 'The doctor advised that the patient ___ heavy lifting for six weeks.', options: ['avoid', 'avoids', 'avoided', 'will avoid'], answer: 0, explain: 'advise that + S + V nguyên mẫu (thức giả định) → avoid. "avoids" thêm -s theo ngôi là sai trong giả định; "avoided" và "will avoid" lùi/chia thì sai cấu trúc.' },
      { q: 'It is vital that every employee ___ informed of the new rules.', options: ['be', 'is', 'was', 'being'], answer: 0, explain: 'It is vital that + S + be + V3 (giả định bị động) → be informed. "is" là cách chia thông thường không chuẩn trang trọng; "was" lùi thì; "being" không phải động từ chính.' },
      { q: 'If I ___ in your position, I would accept the offer.', options: ['were', 'am', 'will be', 'be'], answer: 0, explain: 'Điều kiện loại 2 trang trọng dùng were cho mọi ngôi (giả định quá khứ). "am" và "will be" sai loại câu; "be" là giả định hiện tại, không dùng sau if loại 2.' },
      { q: 'I wish the report ___ shorter – nobody has time to read 80 pages.', options: ['were', 'is', 'will be', 'has been'], answer: 0, explain: 'wish + quá khứ giả định cho điều ước trái thực tế ở hiện tại → were (văn trang trọng). "is", "will be", "has been" không diễn tả điều ước trái thực tế.' },
      { q: 'It\'s high time the government ___ action on air pollution.', options: ['took', 'takes', 'take', 'will take'], answer: 0, explain: "It's high time + S + V quá khứ (giả định) → took: đáng lẽ phải làm từ lâu. Các dạng hiện tại/tương lai sai cấu trúc này." },
      { q: 'The committee recommended that the proposal ___ until next year.', options: ['be postponed', 'is postponed', 'postpones', 'was postponing'], answer: 0, explain: 'recommend that + S + be + V3 (giả định bị động) vì đề xuất bị hoãn. "is postponed" chia thì; "postpones" sai thể (đề xuất không tự hoãn); "was postponing" sai cả thì lẫn thể.' },
      { q: 'She speaks as though she ___ the director, but she is only an assistant.', options: ['were', 'is', 'has been', 'will be'], answer: 0, explain: 'as though + quá khứ giả định cho điều không đúng sự thật → were. "is" ngụ ý cô ấy thật sự là giám đốc – trái với vế sau; các thì khác sai nghĩa.' },
      { q: 'We would rather you ___ the details with anyone outside the team.', options: ['didn\'t discuss', 'don\'t discuss', 'not discuss', 'won\'t discuss'], answer: 0, explain: "would rather + S khác + V quá khứ (giả định) cho mong muốn ở hiện tại → didn't discuss. \"don't/won't discuss\" chia thì thường; \"not discuss\" là giả định hiện tại, không dùng sau would rather + S." },
      { q: 'The law requires that all drivers ___ insurance.', options: ['have', 'has', 'had', 'having'], answer: 0, explain: 'require that + S + V nguyên mẫu → have (dù all drivers số nhiều, quy tắc giả định vẫn là nguyên mẫu). "has" sai hòa hợp; "had" lùi thì; "having" không phải động từ chính.' },
      { q: 'Suppose the experiment ___ – what would you do then?', options: ['failed', 'would fail', 'will fail', 'has failed'], answer: 0, explain: 'Suppose + quá khứ đơn cho giả định khó xảy ra, đi với would ở vế sau → failed. "would fail/will fail/has failed" không khớp với "what would you do".' },
    ],
    'hedging': [
      { q: 'The results ___ that the treatment is effective, but further studies are needed.', options: ['suggest', 'prove', 'confirm absolutely', 'show without doubt'], answer: 0, explain: '"further studies are needed" cho thấy kết luận còn dè dặt → suggest (gợi ý). "prove", "confirm absolutely", "show without doubt" quá chắc chắn, mâu thuẫn với vế sau.' },
      { q: 'It ___ be argued that remote work increases productivity. (chọn cách nói rào đón)', options: ['could', 'must', 'will', 'should always'], answer: 0, explain: 'It could be argued that… là cách rào đón trang trọng khi đưa một quan điểm. "must", "will", "should always" làm khẳng định quá mạnh, không phải hedging.' },
      { q: 'Online learning ___ to be more popular among working adults than among teenagers. (chọn cách nói rào đón)', options: ['appears', 'is certainly', 'always is', 'definitely seems'], answer: 0, explain: 'appear + to V là cách nói dè dặt (có vẻ). "is certainly" và "always is" khẳng định tuyệt đối; "definitely seems" đúng ngữ pháp nhưng definitely làm mất tính rào đón.' },
      { q: 'There is ___ evidence that the new policy has reduced crime. (chọn cách nói rào đón)', options: ['limited', 'every', 'complete', 'total'], answer: 0, explain: 'limited evidence (bằng chứng còn hạn chế) phù hợp văn học thuật thận trọng. "every evidence" sai ngữ pháp (evidence không đếm được); "complete/total evidence" quá tuyệt đối và không tự nhiên.' },
      { q: 'Prices are ___ to rise if demand continues to grow.', options: ['likely', 'probably', 'possibly', 'perhaps'], answer: 0, explain: 'Cấu trúc be likely to + V. "probably/possibly/perhaps" là trạng từ, không đi với "are … to rise" theo cấu trúc này (phải nói "will probably rise").' },
      { q: 'This difference ___ partly explained by the age of the participants. (chọn cách nói rào đón)', options: ['may be', 'is surely', 'must always be', 'is completely'], answer: 0, explain: 'may be + V3 kết hợp partly tạo kết luận dè dặt. "is surely", "must always be", "is completely" quá chắc chắn và mâu thuẫn với partly (một phần).' },
      { q: 'Most researchers ___ that climate change affects bird migration. (chọn cách nói rào đón)', options: ['tend to agree', 'all agree', 'agree without exception', 'must agree'], answer: 0, explain: 'tend to agree (có xu hướng đồng ý) – rào đón phù hợp với "Most researchers". "all agree" và "without exception" mâu thuẫn với most; "must agree" sai nghĩa (bắt buộc).' },
      { q: 'The data ___ a link between screen time and poor sleep. (chọn cách nói rào đón)', options: ['indicate', 'prove beyond doubt', 'guarantee', 'establish forever'], answer: 0, explain: 'indicate (cho thấy) là động từ báo cáo dè dặt. Các phương án còn lại khẳng định tuyệt đối, không phù hợp với văn học thuật thận trọng.' },
      { q: 'In ___ cases, the side effects were mild. (chọn cách nói rào đón)', options: ['most', 'all of the', 'every', 'the whole'], answer: 0, explain: 'In most cases giới hạn phạm vi khẳng định (hedging bằng lượng từ). "all of the cases" và "every case" tuyệt đối hóa; "every cases" còn sai ngữ pháp; "the whole cases" sai.' },
      { q: 'This approach ___ not be suitable for very small companies. (chọn cách nói rào đón)', options: ['might', 'will', 'must', 'can never'], answer: 0, explain: 'might not be suitable (có thể không phù hợp) – rào đón nhẹ nhàng. "will not" và "must not" khẳng định/cấm đoán; "can never" quá tuyệt đối (không bao giờ).' },
    ],
    'nominalisation': [
      { q: 'The ___ of the new tax caused widespread protests.', options: ['introduction', 'introduce', 'introduced', 'introducing'], answer: 0, explain: 'Sau The và trước of cần danh từ: introduction. "introduce" là động từ; "introduced" là quá khứ/phân từ; "introducing" là V-ing, không đi với The … of trong cấu trúc này.' },
      { q: 'There has been a significant ___ in the number of electric cars.', options: ['increase', 'increasing', 'increased', 'increasingly'], answer: 0, explain: 'a + tính từ + danh từ: a significant increase in… "increasing" (V-ing/tính từ), "increased" (V3), "increasingly" (trạng từ) đều sai từ loại.' },
      { q: 'The ___ of the bridge took longer than expected.', options: ['construction', 'construct', 'constructive', 'constructed'], answer: 0, explain: 'Danh từ construction đứng sau The. "construct" (động từ), "constructive" (tính từ: mang tính xây dựng), "constructed" (V3) sai từ loại.' },
      { q: 'A lack of ___ between departments led to repeated mistakes.', options: ['communication', 'communicate', 'communicative', 'communicating'], answer: 0, explain: 'Sau giới từ of cần danh từ: communication. "communicate" là động từ; "communicative" là tính từ; "communicating" về hình thức có thể đứng sau of nhưng không tự nhiên trong cụm "a lack of … between departments".' },
      { q: 'The government\'s ___ to raise fuel prices was unpopular.', options: ['decision', 'decide', 'decisive', 'decided'], answer: 0, explain: "Sở hữu cách The government's + danh từ → decision (to V). \"decide\" động từ; \"decisive\" tính từ (quyết đoán); \"decided\" V3." },
      { q: 'Rapid ___ has put pressure on housing in many cities.', options: ['urbanization', 'urbanize', 'urban', 'urbanized'], answer: 0, explain: 'Tính từ Rapid bổ nghĩa cho danh từ làm chủ ngữ → urbanization. "urbanize" động từ; "urban" tính từ; "urbanized" V3/tính từ.' },
      { q: 'The ___ of fresh water is a major concern in dry regions.', options: ['availability', 'available', 'avail', 'availably'], answer: 0, explain: 'Danh từ của available là availability. "available" tính từ; "avail" động từ/danh từ với nghĩa khác (to no avail); "availably" không tồn tại.' },
      { q: 'Choose the most academic version: "Because prices rose sharply, sales fell."', options: ['The sharp rise in prices led to a fall in sales.', 'Prices rose sharply so sales fell down.', 'Because of prices rose, sales fell.', 'The prices sharply rising made sales falling.'], answer: 0, explain: 'Danh từ hóa: rose sharply → the sharp rise in; fell → a fall in; nối bằng led to. "fell down" sai collocation; "Because of prices rose" sai (because of + cụm danh từ); câu cuối sai cấu trúc "made sales falling".' },
      { q: 'The ___ of the study is that sleep affects memory.', options: ['conclusion', 'conclude', 'conclusive', 'concluding'], answer: 0, explain: 'Danh từ conclusion sau The và trước of. "conclude" động từ; "conclusive" tính từ (mang tính quyết định); "concluding" V-ing/tính từ.' },
      { q: 'Public ___ of the risks of smoking has increased.', options: ['awareness', 'aware', 'awarely', 'awaring'], answer: 0, explain: 'Tính từ Public bổ nghĩa cho danh từ chủ ngữ → awareness. "aware" là tính từ; "awarely" và "awaring" không tồn tại.' },
    ],
    'alternatives-to-if': [
      { q: '___ you need any further information, please do not hesitate to contact us.', options: ['Should', 'Would', 'Had', 'Were'], answer: 0, explain: 'Đảo ngữ điều kiện loại 1 trang trọng: Should + S + V nguyên mẫu = If you need… "Had" cho loại 3 (cần V3); "Were" cho loại 2 (cần were to/were + tính từ); "Would" không dùng để đảo điều kiện.' },
      { q: '___ the company to invest more in training, staff turnover would fall.', options: ['Were', 'Should', 'Had', 'Did'], answer: 0, explain: 'Đảo ngữ điều kiện loại 2 trang trọng: Were + S + to V = If the company invested… "Should" dùng cho loại 1 (Should + S + V nguyên mẫu, không có to); "Had" cho loại 3 (Had + S + V3); "Did" không dùng để đảo câu điều kiện.' },
      { q: '___ the weather been better, the event would have attracted more visitors.', options: ['Had', 'Should', 'Were', 'If'], answer: 0, explain: 'Đảo ngữ loại 3: Had + S + V3 = If the weather had been better. "Should" (loại 1) và "Were" (loại 2) sai loại; "If" cần "had": If the weather had been…' },
      { q: 'You can borrow my notes ___ you return them by Friday.', options: ['as long as', 'unless', 'in case', 'otherwise'], answer: 0, explain: 'as long as = miễn là (điều kiện). "unless" = trừ khi (nghĩa ngược); "in case" = phòng khi; "otherwise" = nếu không thì, không nối mệnh đề điều kiện như vậy.' },
      { q: 'Take an umbrella ___ it rains later.', options: ['in case', 'unless', 'provided that', 'as long as'], answer: 0, explain: 'in case = phòng khi (chuẩn bị trước cho khả năng xảy ra). "unless" sai nghĩa; "provided that/as long as" là điều kiện bắt buộc, không hợp nghĩa mang ô đề phòng.' },
      { q: '___ your help, we would never have finished on time.', options: ['Without', 'Unless', 'Otherwise', 'Except'], answer: 0, explain: 'Without + danh từ = If it had not been for (nếu không có). "Unless" cần mệnh đề; "Otherwise" là trạng từ nối câu; "Except" nghĩa là ngoại trừ.' },
      { q: 'We will hold the event outdoors, ___ it rains.', options: ['unless', 'if', 'provided', 'as long as'], answer: 0, explain: 'unless = trừ khi (= if … not): tổ chức ngoài trời trừ khi trời mưa. "if/provided/as long as it rains" đảo ngược ý nghĩa.' },
      { q: 'Save your work regularly; ___, you might lose everything.', options: ['otherwise', 'unless', 'in case', 'provided'], answer: 0, explain: 'otherwise = nếu không thì, đứng sau dấu chấm phẩy để nối hai mệnh đề độc lập. "unless", "in case", "provided" là liên từ cần một mệnh đề theo sau ngay.' },
      { q: '___ that all members agree, the proposal will be approved.', options: ['Provided', 'Unless', 'Otherwise', 'In case'], answer: 0, explain: 'Provided that = với điều kiện là. "Unless that" và "In case that" sai cấu trúc; "Otherwise that" không tồn tại.' },
      { q: '___ it not been for the new manager, the project would have failed.', options: ['Had', 'Were', 'Should', 'Did'], answer: 0, explain: 'Đảo ngữ loại 3: Had it not been for + N = If it had not been for. "Were it not for" dùng cho loại 2 (hiện tại); "Should", "Did" không đúng cấu trúc.' },
    ],
    'emphasis-variety': [
      { q: 'I ___ appreciate your help – it made a huge difference.', options: ['do', 'am', 'have', 'does'], answer: 0, explain: 'Trợ động từ nhấn mạnh do + V nguyên mẫu (thật sự…) với chủ ngữ I. "am appreciate" và "have appreciate" sai cấu trúc; "does" sai hòa hợp với I.' },
      { q: 'Such ___ the demand that the tickets sold out in an hour.', options: ['was', 'did', 'were', 'had'], answer: 0, explain: 'Such + be + N + that… (đảo ngữ nhấn mạnh mức độ) → Such was the demand. "were" sai hòa hợp với the demand (số ít); "did/had" không dùng trong cấu trúc này.' },
      { q: 'The problem is not the cost; it is ___ the system is too slow.', options: ['that', 'what', 'which', 'because of'], answer: 0, explain: 'Sau "it is" cần mệnh đề danh từ: that + S + V. "what" thừa (what the system is too slow sai); "which" không mở mệnh đề danh từ; "because of" cần cụm danh từ.' },
      { q: 'The thing ___ worries me most is the lack of planning.', options: ['that', 'what', 'who', 'where'], answer: 0, explain: 'Mệnh đề quan hệ bổ nghĩa cho "The thing" → that/which. "what" đã bao hàm "the thing" nên lặp; "who" cho người; "where" cho nơi chốn.' },
      { q: 'Never before ___ so many people applied for the course.', options: ['have', 'did', 'had been', 'were'], answer: 0, explain: 'Never before + đảo ngữ hiện tại hoàn thành: have + S + V3 (applied). "did" đi với V nguyên mẫu (apply); "had been applied" sai thể; "were applied" sai thể và nghĩa.' },
      { q: 'Which sentence puts the most emphasis on "the location"?', options: ['It was the location that convinced us.', 'The location convinced us.', 'We were convinced by the location.', 'The location was convincing for us.'], answer: 0, explain: 'Câu chẻ It was + N + that… đưa "the location" vào vị trí nhấn mạnh. Các câu còn lại đúng ngữ pháp nhưng là câu trần thuật thông thường, không nhấn mạnh đặc biệt.' },
      { q: 'What surprised the researchers ___ how quickly the patients recovered.', options: ['was', 'were', 'is being', 'have been'], answer: 0, explain: 'What-clause làm chủ ngữ → động từ số ít, thì quá khứ khớp với surprised → was. "were" sai hòa hợp; "is being", "have been" sai thì và cấu trúc.' },
      { q: 'Not only ___ late, but he also forgot the documents.', options: ['did he arrive', 'he arrived', 'he did arrive', 'arrived he'], answer: 0, explain: 'Not only đứng đầu câu → đảo trợ động từ: did + S + V. "he arrived" không đảo; "he did arrive" là nhấn mạnh nhưng không đảo; "arrived he" đảo động từ chính – sai.' },
      { q: 'The more we practice, ___ we become.', options: ['the more confident', 'more confident', 'the most confident', 'the confident more'], answer: 0, explain: 'So sánh kép: The + so sánh hơn…, the + so sánh hơn… → the more confident. Thiếu "the", dùng so sánh nhất hoặc đảo trật tự đều sai.' },
      { q: 'Only by working together ___ solve this problem.', options: ['can we', 'we can', 'we could', 'could'], answer: 0, explain: 'Only by + V-ing đứng đầu → đảo trợ động từ: can we. "we can/we could" không đảo; "could" thiếu chủ ngữ.' },
    ],
  };
  // Đáp án viết ở vị trí 0 → xoay theo mẫu cố định để A/B/C/D phân bố đều (lời giải không nhắc chữ cái nên không cần sửa)
  const PAT4 = [2, 0, 3, 1, 1, 3, 0, 2, 3, 1];
  Object.values(Q4).forEach(list => list.forEach((q, k) => { const want = PAT4[k % PAT4.length], r = (q.answer - want + 4) % 4; if (r) { q.options = q.options.slice(r).concat(q.options.slice(0, r)); q.answer = want; } }));
  (g.GRAMMAR || []).forEach(l => { if (Q4[l.id]) l.quiz = (l.quiz || []).concat(Q4[l.id]); });
  /* Lô 19 (tự biên soạn): +10 câu tự luận cho 6 chủ đề B2 thường gặp trong IELTS – nối thêm, không thay thế */
  const X5 = {
    'modals-deduction': [
      { t: 'verb', q: 'The lights are off and nobody is answering. They ___ out. (go – suy đoán chắc chắn về hiện tại hoàn thành)', a: ['must have gone'], ex: 'Suy luận chắc chắn về việc đã xảy ra → must have + V3. "must go" là bắt buộc ở hiện tại; "must went" sai dạng.' },
      { t: 'verb', q: 'He ___ the email yet – he only got back from vacation an hour ago. (read – gần như chắc chắn là không)', a: ["can't have read", 'cannot have read', "couldn't have read"], ex: "Suy luận phủ định chắc chắn về quá khứ → can't/couldn't have + V3. \"mustn't have read\" sai vì mustn't nghĩa là cấm, không dùng để suy luận." },
      { t: 'fill', q: 'Take an umbrella. It ___ rain later – the sky is getting darker. (có thể)', a: ['might', 'may', 'could'], ex: 'Khả năng ở tương lai: might/may/could + V nguyên mẫu. "can" không dùng cho khả năng cụ thể ở tương lai như thế này.' },
      { t: 'rewrite', q: 'I\'m sure she forgot about the meeting.', start: 'She must', a: ['She must have forgotten about the meeting.'], ex: 'I\'m sure + quá khứ → must have + V3 (forgotten). Không viết "must have forgot" – V3 của forget là forgotten.' },
      { t: 'rewrite', q: 'It is possible that the parcel was delivered to the wrong address.', start: 'The parcel', a: ['The parcel may have been delivered to the wrong address.', 'The parcel might have been delivered to the wrong address.'], ex: 'Khả năng về quá khứ + bị động → may/might have been + V3.' },
      { t: 'rewrite', q: 'I\'m sure he isn\'t telling the truth.', start: 'He can\'t', a: ["He can't be telling the truth."], ex: "Suy luận phủ định ở hiện tại tiếp diễn → can't be + V-ing. \"He mustn't tell the truth\" sai nghĩa (cấm)." },
      { t: 'rewrite', q: 'Perhaps the researchers made a mistake in the calculation.', start: 'The researchers might', a: ['The researchers might have made a mistake in the calculation.', 'The researchers might have made a mistake in their calculation.'], ex: 'Perhaps + quá khứ → might have + V3: có lẽ đã…' },
      { t: 'fill', q: 'You ___ have told me the exam was canceled! I studied all night for nothing. (lẽ ra nên – trách móc)', a: ['could', 'should', 'might'], ex: 'Trách nhẹ về việc đáng lẽ đã làm: could/should/might have + V3. "must have told" là suy luận, sai nghĩa.' },
      { t: 'error', parts: ['She', 'must be', 'very tired yesterday', 'after the long flight.'], w: 1, fix: 'must have been', ex: 'Suy luận về quá khứ ("yesterday") → must have been, không dùng must be (hiện tại).' },
      { t: 'error', parts: ['The museum', 'couldn\'t be', 'closed last Monday', 'because I visited it then.'], w: 1, fix: "can't have been", ex: "Suy luận phủ định về quá khứ → can't/couldn't have been + tính từ/V3. \"couldn't be\" chỉ dùng cho hiện tại." },
    ],
    'passive-reporting-causative': [
      { t: 'rewrite', q: 'People believe that the painting is worth millions.', start: 'The painting is believed', a: ['The painting is believed to be worth millions.'], ex: 'Bị động tường thuật: S + is believed + to V (sự việc cùng thời điểm) → to be worth.' },
      { t: 'rewrite', q: 'Experts say that the bridge was built in the 12th century.', start: 'The bridge is said', a: ['The bridge is said to have been built in the 12th century.'], ex: 'Sự việc xảy ra TRƯỚC thời điểm nói → to have + V3; bị động nên "to have been built".' },
      { t: 'rewrite', q: 'It is reported that the company is planning to close two factories.', start: 'The company is reported', a: ['The company is reported to be planning to close two factories.'], ex: 'Hành động đang diễn ra → to be + V-ing: is reported to be planning.' },
      { t: 'rewrite', q: 'A technician repaired my laptop yesterday.', start: 'I had', a: ['I had my laptop repaired yesterday.'], ex: 'Thể sai khiến: have + O + V3 – nhờ/thuê người khác làm. Không viết "I had repaired my laptop" (= tự sửa, quá khứ hoàn thành).' },
      { t: 'rewrite', q: 'The hairdresser is going to cut Tom\'s hair tomorrow.', start: 'Tom is going to get', a: ["Tom is going to get his hair cut tomorrow."], ex: 'get + O + V3 (sai khiến, thân mật hơn have): get his hair cut. V3 của cut là cut.' },
      { t: 'verb', q: 'The suspect ___ to have left the country last week. (think – bị động tường thuật, hiện tại)', a: ['is thought'], ex: 'Bị động tường thuật hiện tại: is thought + to have left (rời đi trước thời điểm nói).' },
      { t: 'rewrite', q: 'A lawyer should check the contract before we sign it.', start: 'We should get the contract', a: ['We should get the contract checked by a lawyer before we sign it.', 'We should get the contract checked before we sign it.'], ex: 'Thể sai khiến get + O + V3: get the contract checked (by a lawyer) – nhờ người khác kiểm tra.' },
      { t: 'fill', q: 'It ___ widely accepted that regular exercise improves mental health.', a: ['is'], ex: 'Cấu trúc It is + V3 + that…: It is widely accepted that… (người ta chấp nhận rộng rãi rằng).' },
      { t: 'error', parts: ['The new drug', 'is said', 'to be tested', 'on 500 patients last year.'], w: 2, fix: 'to have been tested', ex: 'Hành động ở quá khứ ("last year") trước thời điểm nói → to have been tested.' },
      { t: 'error', parts: ['I', 'am going to', 'have repaired my car', 'at the garage next week.'], w: 2, fix: 'have my car repaired', ex: 'Thể sai khiến: have + O + V3 – tân ngữ đứng trước V3: have my car repaired.' },
    ],
    'mixed-conditionals-wish': [
      { t: 'verb', q: 'If I ___ harder at school, I would have a better job now. (study – quá khứ)', a: ['had studied'], ex: 'Điều kiện hỗn hợp: giả định quá khứ (had + V3) → kết quả hiện tại (would + V).' },
      { t: 'verb', q: 'If she were more organized, she ___ the deadline last week. (not miss)', a: ["wouldn't have missed", 'would not have missed'], ex: 'Hỗn hợp ngược: đặc điểm hiện tại (were) → kết quả quá khứ (would have + V3).' },
      { t: 'verb', q: 'I wish I ___ the job offer last year – it was a great opportunity. (accept)', a: ['had accepted'], ex: 'Hối tiếc về quá khứ: wish + had + V3.' },
      { t: 'verb', q: 'I wish my neighbors ___ so much noise every night. (not make)', a: ["wouldn't make", 'would not make'], ex: 'Phàn nàn về thói quen gây khó chịu của người khác: wish + would/wouldn\'t + V.' },
      { t: 'rewrite', q: 'I didn\'t book the tickets early, so we have bad seats now.', start: 'If I had', a: ['If I had booked the tickets early, we would have better seats now.', "If I had booked the tickets early, we wouldn't have bad seats now.", 'If I had booked the tickets early, we would not have bad seats now.', "If I had booked the tickets early, we would have good seats now.", "If I had booked the tickets early, we wouldn't have such bad seats now."], ex: 'Quá khứ không có thật (had booked) → kết quả hiện tại (would have / wouldn\'t have + N now).' },
      { t: 'rewrite', q: 'It\'s a pity I can\'t speak Spanish.', start: 'I wish', a: ['I wish I could speak Spanish.'], ex: 'Ước điều trái với hiện tại: wish + could + V.' },
      { t: 'rewrite', q: 'You will fail unless you revise regularly.', start: 'If you', a: ["If you don't revise regularly, you will fail.", 'If you do not revise regularly, you will fail.'], ex: 'unless = if … not → If you don\'t revise regularly… Không giữ "not" thêm lần nữa với unless.' },
      { t: 'rewrite', q: 'I regret saying that to my manager.', start: 'If only', a: ["If only I hadn't said that to my manager.", 'If only I had not said that to my manager.'], ex: 'If only + had (not) + V3: hối tiếc mạnh về quá khứ.' },
      { t: 'error', parts: ['If I', 'would have known', 'about the traffic,', 'I would have left earlier.'], w: 1, fix: 'had known', ex: 'Mệnh đề if loại 3 dùng had + V3, không dùng would have trong mệnh đề if.' },
      { t: 'error', parts: ['I wish', 'I have', 'more time', 'to read for pleasure.'], w: 1, fix: 'had', ex: 'wish + quá khứ đơn cho điều ước ở hiện tại: I wish I had more time.' },
    ],
    'noun-clauses': [
      { t: 'rewrite', q: '"Where does the professor work?" I don\'t know.', start: "I don't know where", a: ["I don't know where the professor works."], ex: 'Câu hỏi gián tiếp: trật tự S + V như câu khẳng định, bỏ does và chia động từ: the professor works.' },
      { t: 'rewrite', q: '"Is the library open on Sundays?" Can you tell me?', start: 'Can you tell me whether', a: ['Can you tell me whether the library is open on Sundays?', 'Can you tell me whether the library is open on Sunday?'], ex: 'Câu hỏi Yes/No gián tiếp: whether/if + S + V (the library is open).' },
      { t: 'combine', q: 'The results were surprising. This was clear to everyone.', start: 'That the results', a: ['That the results were surprising was clear to everyone.'], ex: 'Mệnh đề That-clause làm chủ ngữ: That + S + V + động từ chính (was clear).' },
      { t: 'combine', q: 'Something worries me. It is the cost of the project.', start: 'What worries me', a: ['What worries me is the cost of the project.'], ex: 'What-clause làm chủ ngữ (= the thing that) + is + bổ ngữ.' },
      { t: 'fill', q: 'The fact ___ the company made a profit surprised investors.', a: ['that'], ex: 'the fact that + mệnh đề: mệnh đề danh từ đồng vị. Không dùng "which" vì không phải mệnh đề quan hệ.' },
      { t: 'fill', q: 'Nobody knows ___ the ancient city was abandoned. (vì sao)', a: ['why'], ex: 'Mệnh đề danh từ bắt đầu bằng từ để hỏi why làm tân ngữ của knows.' },
      { t: 'fill', q: 'Students can choose ___ topic they prefer. (bất kỳ … nào)', a: ['whichever', 'whatever'], ex: 'whichever/whatever + N = bất cứ … nào – mở mệnh đề danh từ làm tân ngữ.' },
      { t: 'rewrite', q: '"How much does the course cost?" She asked me.', start: 'She asked me how much', a: ['She asked me how much the course cost.', "She asked me how much the course costs."], ex: 'Câu hỏi tường thuật: lùi thì (cost giữ nguyên dạng quá khứ), trật tự S + V, bỏ does.' },
      { t: 'error', parts: ['I am not sure', 'what time', 'does the train leave', 'from the main station.'], w: 2, fix: 'the train leaves', ex: 'Câu hỏi gián tiếp không đảo ngữ: what time the train leaves.' },
      { t: 'error', parts: ['What', 'the survey shows', 'are', 'that young people read less.'], w: 2, fix: 'is', ex: 'What-clause làm chủ ngữ được coi là số ít → is.' },
    ],
    'complex-sentences': [
      { t: 'combine', q: 'The city built new bike lanes. Traffic accidents fell by 20%.', start: 'After the city', a: ['After the city built new bike lanes, traffic accidents fell by 20%.', 'After the city had built new bike lanes, traffic accidents fell by 20%.'], ex: 'Mệnh đề trạng ngữ thời gian After + S + V, dấu phẩy khi đứng đầu câu.' },
      { t: 'combine', q: 'Online courses are flexible. Many students find it hard to stay motivated.', start: 'Although online courses', a: ['Although online courses are flexible, many students find it hard to stay motivated.'], ex: 'Although nối hai ý tương phản; không dùng thêm "but" ở vế sau.' },
      { t: 'combine', q: 'The report was published in 2021. It changed government policy.', start: 'The report, which', a: ['The report, which was published in 2021, changed government policy.'], ex: 'Mệnh đề quan hệ không xác định (có dấu phẩy) bổ sung thông tin: , which + V…,' },
      { t: 'combine', q: 'Prices rose sharply. As a result, many families reduced their spending.', start: 'Prices rose so sharply that', a: ['Prices rose so sharply that many families reduced their spending.'], ex: 'so + trạng từ + that: diễn tả kết quả.' },
      { t: 'combine', q: 'Some people prefer public transport. Others prefer to drive.', start: 'While some people', a: ['While some people prefer public transport, others prefer to drive.'], ex: 'While (trong khi) nối hai ý đối lập, thường dùng trong IELTS Task 2 khi nêu hai quan điểm.' },
      { t: 'combine', q: 'The government should invest in renewable energy. This will reduce pollution.', start: 'If the government', a: ['If the government invests in renewable energy, pollution will be reduced.', 'If the government invests in renewable energy, it will reduce pollution.'], ex: 'Câu điều kiện loại 1: If + hiện tại đơn, will + V.' },
      { t: 'rewrite', q: 'Because of the heavy rain, the game was canceled.', start: 'Because it', a: ['Because it rained heavily, the game was canceled.', 'Because it was raining heavily, the game was canceled.'], ex: 'Because + mệnh đề (S + V); because of + cụm danh từ. Đổi heavy rain → it rained heavily.' },
      { t: 'rewrite', q: 'Despite having little experience, she was promoted quickly.', start: 'Even though she', a: ['Even though she had little experience, she was promoted quickly.'], ex: 'Even though + mệnh đề thay cho despite + V-ing/N.' },
      { t: 'error', parts: ['Although', 'the plan was expensive,', 'but', 'the council approved it.'], w: 2, fix: '(bỏ "but")', ex: 'Although và but không dùng cùng nhau trong một câu; chỉ giữ một liên từ.' },
      { t: 'error', parts: ['The students', 'who they took part', 'in the study', 'were all volunteers.'], w: 1, fix: 'who took part', ex: 'Trong mệnh đề quan hệ, who đã làm chủ ngữ nên không thêm "they".' },
    ],
    'dependent-prepositions': [
      { t: 'fill', q: 'The success of the project depends ___ the support of local residents.', a: ['on', 'upon'], ex: 'depend on/upon + N. Không dùng "depend of" hay "depend from".' },
      { t: 'fill', q: 'Many young people are concerned ___ the cost of housing.', a: ['about'], ex: 'be concerned about = lo lắng về. "concerned with" mang nghĩa liên quan đến – khác nghĩa.' },
      { t: 'fill', q: 'There has been a sharp rise ___ the number of tourists.', a: ['in'], ex: 'a rise/increase/fall in + N (số liệu). "of" dùng khi nói mức tăng: a rise of 10%.' },
      { t: 'fill', q: 'The new law has had a significant impact ___ small businesses.', a: ['on'], ex: 'have an impact/effect/influence on + N (tác động lên). Không dùng "impact to" hay "impact for".' },
      { t: 'fill', q: 'She was responsible ___ organising the conference.', a: ['for'], ex: 'be responsible for + V-ing/N (chịu trách nhiệm về). Không dùng "responsible of" hay "responsible to organise".' },
      { t: 'fill', q: 'The study focuses ___ the effects of social media on sleep.', a: ['on'], ex: 'focus on + N (tập trung vào). Không dùng "focus in" hay "focus about".' },
      { t: 'fill', q: 'Most residents objected ___ the plan to build a new airport.', a: ['to'], ex: 'object to + N/V-ing (to là giới từ): object to building…' },
      { t: 'fill', q: 'Access ___ clean water is a basic human right.', a: ['to'], ex: 'access to + N (danh từ access đi với to).' },
      { t: 'error', parts: ['The survey', 'consisted', 'from 20 questions', 'about daily habits.'], w: 2, fix: 'of 20 questions', ex: 'consist of + N (gồm có). Không dùng "consist from".' },
      { t: 'error', parts: ['Children', 'should be encouraged', 'for reading', 'every day.'], w: 2, fix: 'to read', ex: 'encourage sb to do sth (to + V nguyên mẫu), không dùng "for reading".' },
    ],
  };
  (g.GRAMMAR || []).forEach(l => { if (X5[l.id]) l.drills = (l.drills || []).concat(X5[l.id]); });
})(typeof self !== 'undefined' ? self : this);
