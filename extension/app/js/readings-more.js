/* Bài đọc bổ sung (tự biên soạn, 32 bài A2–C1). Nạp SAU readings.js – nối thêm vào mảng READINGS, không ghi đè. */
(function (g) {
  const list = g.READINGS || (g.READINGS = []);
  list.push(
    /* ===================== A2 / B1 ===================== */
    {
      id: 'food-waste',
      title: 'Why We Throw Away So Much Food',
      topic: 'environment',
      level: 'A2',
      emoji: '🍎',
      summaryVi: 'Khoảng một phần ba lượng thực phẩm trên thế giới bị bỏ phí; bài viết giải thích nguyên nhân, tác hại với môi trường và những thói quen nhỏ giúp giảm lãng phí.',
      text: `Every year, people around the world throw away a huge amount of food. Experts say that about one third of all the food we produce is never eaten. Some of it is lost on farms or during transport, but a large part is wasted in our own homes.

Why does this happen? One common reason is that people buy too much. When food is on special offer in the supermarket, it is easy to fill the basket with more than we need. Another reason is confusion about the dates on packets. Many people think that food must go in the bin after its "best before" date, but this date is only about quality, not safety. Food is often still good to eat after it.

Food waste is also a problem for the environment. When old food goes to a landfill, it slowly breaks down and produces gases that make the planet warmer. In addition, a lot of water, energy and land was used to grow the food in the first place, so all of these resources are wasted too.

The good news is that small changes can help. Before going shopping, you can check your fridge and write a list. You can keep leftovers in a box and eat them the next day. Some families freeze bread and fruit so that they last longer. In several countries, there are now apps that let shops and cafés sell unsold meals cheaply at the end of the day.

If everyone wasted a little less, the total amount would fall a lot. And there is one more reason to try: saving food also means saving money.`,
      keywords: ['amount', 'produce', 'transport', 'quality', 'safety', 'environment', 'landfill', 'resources', 'confusion', 'freeze'],
      questions: [
        { type: 'tfng', q: 'About one third of the food produced in the world is never eaten.', answer: 'TRUE', explain: 'Bài viết: "about one third of all the food we produce is never eaten".' },
        { type: 'tfng', q: 'The "best before" date tells you when food becomes dangerous to eat.', answer: 'FALSE', explain: 'Bài viết nói ngày "best before" chỉ liên quan đến chất lượng: "this date is only about quality, not safety".' },
        { type: 'tfng', q: 'Supermarkets in most countries give unsold food to poor families.', answer: 'NOT GIVEN', explain: 'Bài chỉ nhắc đến ứng dụng giúp cửa hàng bán rẻ đồ ăn còn thừa, không nói siêu thị tặng thực phẩm cho gia đình nghèo.' },
        { type: 'mcq', q: 'According to the text, why do people often buy too much food?', options: ['They do not have a fridge.', 'They use apps to do their shopping.', 'Food is on special offer in the supermarket.', 'Shops close early in the evening.'], answer: 2, explain: 'Bài viết: "When food is on special offer in the supermarket, it is easy to fill the basket with more than we need".' },
        { type: 'mcq', q: 'Which tip is NOT mentioned in the text?', options: ['Checking the fridge before shopping', 'Freezing bread and fruit', 'Eating leftovers the next day', 'Growing vegetables at home'], answer: 3, explain: 'Bài có nhắc kiểm tra tủ lạnh, cấp đông bánh mì và trái cây, ăn đồ thừa hôm sau; không hề nói đến việc tự trồng rau.' },
      ],
    },
    {
      id: 'citizen-science',
      title: 'Science for Everyone: Citizen Scientists',
      topic: 'science',
      level: 'A2',
      emoji: '🔭',
      summaryVi: 'Người bình thường có thể giúp các nhà khoa học đếm chim, phân loại thiên hà hay ghi lại thời tiết – đó là khoa học công dân, với nhiều kết quả thật và lợi ích cho cả người tham gia.',
      text: `You do not need a laboratory or a university degree to help scientists. Today, thousands of ordinary people take part in research projects in their free time. This is called citizen science.

The idea is simple. Scientists often need to collect a lot of information, but they do not have enough time or staff to do it alone. Volunteers can help by counting birds in their garden, taking photos of insects or measuring rainfall. Many projects use a mobile phone app, so people can send their results in a few seconds.

Some projects do not even require you to go outside. On certain websites, volunteers look at pictures of distant galaxies and sort them into groups. Others read old handwritten weather records so that the data can be stored on computers. Computers are fast, but people are still better at some tasks, such as noticing unusual shapes.

Citizen science has already produced real results. Volunteers have discovered new planets, found rare plants and helped scientists understand how animals move when the climate changes. In one bird count, families recorded which birds visited their gardens over a single weekend, and the results showed that some species were becoming less common.

There are benefits for the volunteers too. Many say that they learn new skills and feel more connected to nature. Children who join projects often become more interested in science at school.

Of course, there are some challenges. Volunteers sometimes make mistakes, so scientists must check the data carefully. Even so, most researchers agree that citizen science is a valuable way to involve the public in discovery.`,
      keywords: ['research', 'collect', 'volunteers', 'require', 'data', 'climate', 'species', 'valuable', 'involve', 'discovery'],
      questions: [
        { type: 'tfng', q: 'Citizen scientists need a university degree.', answer: 'FALSE', explain: 'Ngay câu đầu: "You do not need a laboratory or a university degree to help scientists".' },
        { type: 'tfng', q: 'Volunteers have helped to discover new planets.', answer: 'TRUE', explain: 'Bài viết: "Volunteers have discovered new planets".' },
        { type: 'tfng', q: 'Most citizen science projects pay volunteers a small fee.', answer: 'NOT GIVEN', explain: 'Bài không nói gì về việc trả tiền cho tình nguyện viên.' },
        { type: 'mcq', q: 'Why do scientists need help from volunteers?', options: ['They do not have enough time or staff to collect all the information.', 'Computers cannot store data.', 'Volunteers never make mistakes.', 'Universities have closed their laboratories.'], answer: 0, explain: 'Bài viết: scientists "do not have enough time or staff to do it alone".' },
        { type: 'mcq', q: 'What must scientists do because volunteers sometimes make mistakes?', options: ['Stop using mobile apps', 'Check the data carefully', 'Only work with children', 'Pay for extra training'], answer: 1, explain: 'Bài viết: "Volunteers sometimes make mistakes, so scientists must check the data carefully".' },
      ],
    },
    {
      id: 'remote-work',
      title: 'Working from Home: The New Normal?',
      topic: 'work',
      level: 'B1',
      emoji: '💻',
      summaryVi: 'Làm việc từ xa giúp tiết kiệm thời gian đi lại và linh hoạt hơn, nhưng cũng gây cô đơn và khó tách công việc khỏi đời sống riêng; mô hình kết hợp đang trở nên phổ biến.',
      text: `Not long ago, working from home was a rare privilege. Most employees travelled to an office every morning and returned in the evening. In recent years, however, remote work has become normal for millions of people, thanks to fast internet connections and online meeting tools.

For many workers, the biggest advantage is time. Without a daily commute, they can save an hour or more each day, which they may spend with their families, doing exercise or simply sleeping longer. Remote work also gives people more flexibility. Parents can collect their children from school, and people who live far from big cities can apply for jobs that were once out of reach.

Employers can benefit as well. Some companies have moved to smaller offices and reduced their costs. Several surveys suggest that many staff are just as productive at home, and in some cases more productive, because there are fewer interruptions.

However, working from home is not perfect. Some people find it hard to separate their job from their private life, especially if they work at the kitchen table. They may answer emails late at night and feel that they are never really off duty. Others feel lonely and miss chatting with colleagues. Managers also worry that new employees learn more slowly when they cannot watch experienced staff at work.

Because of these problems, many organisations now use a hybrid model. Employees spend part of the week in the office for meetings and teamwork, and the rest at home for tasks that need concentration. This approach seems to combine the best of both worlds, although it requires careful planning.

In the end, remote work is likely to remain part of modern life. The challenge is to make sure that it supports both the company and the wellbeing of its workers.`,
      keywords: ['privilege', 'employees', 'commute', 'flexibility', 'productive', 'remote', 'colleagues', 'separate', 'concentration', 'approach', 'surveys'],
      questions: [
        { type: 'tfng', q: 'Working from home used to be common for most employees.', answer: 'FALSE', explain: 'Bài viết: "Not long ago, working from home was a rare privilege" – trước đây đó là đặc quyền hiếm hoi.' },
        { type: 'tfng', q: 'Some surveys suggest that people working at home can be more productive.', answer: 'TRUE', explain: 'Bài viết: many staff are "just as productive at home, and in some cases more productive".' },
        { type: 'tfng', q: 'Most companies plan to close their offices completely.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói một số công ty chuyển sang văn phòng nhỏ hơn, không nhắc đến việc đóng cửa hoàn toàn.' },
        { type: 'mcq', q: 'Which problem of remote work is mentioned in the text?', options: ['Internet connections are too slow.', 'Employees spend too much money on travel.', 'Managers cannot send emails.', 'Some people find it hard to separate work from private life.'], answer: 3, explain: 'Bài viết: "Some people find it hard to separate their job from their private life".' },
        { type: 'mcq', q: 'What is a hybrid model?', options: ['Working only at night', 'Spending part of the week in the office and the rest at home', 'Sharing one job between two people', 'Working for a company in another country'], answer: 1, explain: 'Bài viết: "Employees spend part of the week in the office for meetings and teamwork, and the rest at home".' },
      ],
    },
    {
      id: 'minimalism',
      title: 'Living with Less',
      topic: 'lifestyle',
      level: 'B1',
      emoji: '🪴',
      summaryVi: 'Lối sống tối giản – sở hữu ít đồ hơn – mang lại lợi ích về tiền bạc, tinh thần và môi trường, nhưng cũng bị phê phán là dễ dàng hơn với người giàu.',
      text: `Walk into the home of a minimalist and you may be surprised by how empty it looks. There might be a sofa, a table and a few books, but very little else. Minimalism is a lifestyle based on owning fewer things and focusing on what really matters.

The idea is not new. Many philosophers and religious traditions have taught that happiness does not come from possessions. However, minimalism has become especially popular in the last decade. Books and online videos show people clearing out their wardrobes and giving away boxes of items they no longer use.

Supporters say the benefits are both practical and emotional. A home with fewer objects is quicker to clean and easier to organise. People who buy less often save money, and some use these savings to travel or pay off debts. Many minimalists also report feeling calmer, because they spend less time looking after their belongings and less energy deciding what to buy.

There may be environmental benefits too. If people buy fewer products, factories need fewer raw materials, and less rubbish is created. Some minimalists choose to repair old items instead of replacing them, which helps to reduce waste.

Critics, however, point out some problems. They argue that minimalism can be easier for wealthy people, who can afford to throw things away and buy them again later if necessary. For families with low incomes, keeping extra items may be a sensible way to prepare for the future. Others feel that the style can become a fashion in itself, with people spending large sums on expensive "simple" furniture.

Perhaps the most useful lesson of minimalism is not to own as little as possible, but to think carefully before each purchase. Asking "Do I really need this?" can help anyone make wiser choices.`,
      keywords: ['lifestyle', 'possessions', 'emotional', 'organise', 'debts', 'decade', 'raw', 'repair', 'wealthy', 'traditions', 'purchase'],
      questions: [
        { type: 'tfng', q: 'Minimalism is a completely new idea.', answer: 'FALSE', explain: 'Bài viết: "The idea is not new" – nhiều triết gia và truyền thống tôn giáo đã nói điều này từ lâu.' },
        { type: 'tfng', q: 'Some minimalists say that they feel calmer.', answer: 'TRUE', explain: 'Bài viết: "Many minimalists also report feeling calmer".' },
        { type: 'tfng', q: 'Minimalists usually live in smaller homes than other people.', answer: 'NOT GIVEN', explain: 'Bài không so sánh diện tích nhà của người theo lối sống tối giản với người khác.' },
        { type: 'mcq', q: 'Why do critics say minimalism can be easier for wealthy people?', options: ['They have bigger homes.', 'They do not need to clean.', 'They can afford to throw things away and buy them again later.', 'They read more books about it.'], answer: 2, explain: 'Bài viết: wealthy people "can afford to throw things away and buy them again later if necessary".' },
        { type: 'mcq', q: 'What does the writer see as the most useful lesson of minimalism?', options: ['Thinking carefully before each purchase', 'Owning as little as possible', 'Buying expensive simple furniture', 'Repairing everything you own'], answer: 0, explain: 'Bài viết: the lesson is "not to own as little as possible, but to think carefully before each purchase".' },
      ],
    },
    {
      id: 'fast-fashion',
      title: 'The Hidden Cost of Cheap Clothes',
      topic: 'environment',
      level: 'B1',
      emoji: '👕',
      summaryVi: 'Thời trang nhanh giúp quần áo rẻ và hợp mốt, nhưng phải trả giá về nước, ô nhiễm, điều kiện lao động và lượng rác dệt may khổng lồ.',
      text: `A T-shirt that costs less than a sandwich sounds like a great deal. In the past twenty years, clothing has become cheaper and faster to produce than ever before. Large brands now release new designs every few weeks, encouraging shoppers to buy more often. This business model is known as fast fashion.

For consumers, the attraction is clear. Fast fashion allows people to follow the latest trends without spending much money. However, the low price on the label hides a number of other costs.

The first is environmental. The fashion industry uses enormous quantities of water; growing the cotton for a single pair of jeans can require thousands of litres. Dyeing fabric can pollute rivers if factories do not treat their wastewater. In addition, many cheap garments are made from synthetic materials such as polyester, which is produced from oil and sheds tiny fibres when it is washed.

The second cost is human. To keep prices low, some brands rely on factories where workers earn very low wages and work long hours. Safety standards in some buildings have been poor, and serious accidents have drawn global attention to the issue.

Finally, there is the problem of what happens to unwanted clothes. Because cheap items are often worn only a few times, a huge amount ends up in landfill or is shipped abroad. Only a small proportion of textiles is recycled into new clothing.

Some changes are taking place. Second-hand shopping has become fashionable among young people, and a number of brands now offer repair services or collect old garments. Shoppers can also help by choosing quality over quantity and asking where and how their clothes are made.`,
      keywords: ['consumers', 'trends', 'enormous', 'pollute', 'garments', 'fabric', 'wages', 'standards', 'proportion', 'textiles', 'recycled'],
      questions: [
        { type: 'tfng', q: 'Large fast-fashion brands release new designs only once a year.', answer: 'FALSE', explain: 'Bài viết: "Large brands now release new designs every few weeks".' },
        { type: 'tfng', q: 'Polyester is made from oil.', answer: 'TRUE', explain: 'Bài viết: polyester "is produced from oil".' },
        { type: 'tfng', q: 'Most second-hand shops are run by charities.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói mua đồ cũ trở nên thời thượng với giới trẻ, không nhắc ai điều hành các cửa hàng đó.' },
        { type: 'mcq', q: 'According to the text, why might dyeing fabric harm rivers?', options: ['Cotton needs too much water.', 'Polyester sheds tiny fibres.', 'Clothes are shipped abroad.', 'Factories may not treat their wastewater.'], answer: 3, explain: 'Bài viết: "Dyeing fabric can pollute rivers if factories do not treat their wastewater".' },
        { type: 'mcq', q: 'What happens to many cheap clothes after they are worn a few times?', options: ['They are always recycled into new clothes.', 'They end up in landfill or are shipped abroad.', 'They are sent back to the factory.', 'They are repaired by the brands.'], answer: 1, explain: 'Bài viết: "a huge amount ends up in landfill or is shipped abroad".' },
      ],
    },

    /* ===================== B2 ===================== */
    {
      id: 'gig-economy',
      title: 'The Gig Economy: Freedom or Insecurity?',
      topic: 'work',
      level: 'B2',
      emoji: '🛵',
      summaryVi: 'Kinh tế việc làm tự do qua ứng dụng mang lại sự linh hoạt nhưng thiếu bảo hiểm, lương hưu và thu nhập ổn định; các chính phủ đang tìm cách cân bằng giữa hiệu quả và an toàn cho người lao động.',
      text: `In many cities, the person who delivers your dinner, drives you home or assembles your new furniture may not be an employee of any company. Instead, they are likely to be part of the so-called gig economy, in which individuals take on short-term tasks through digital platforms and are paid separately for each job.

Advocates of this model emphasise its flexibility. Workers can, in theory, choose when and how much they work, logging on to an app for a few hours in the evening or at weekends. For students, carers and people seeking a second source of income, this freedom can be extremely valuable. Platforms also lower the barriers to entering the labour market: a person with a bicycle and a smartphone can begin earning almost immediately, without a formal interview.

Yet the arrangement has attracted growing criticism. Because most gig workers are classified as self-employed contractors rather than employees, they are generally not entitled to sick pay, holiday pay or a pension. Their income can be highly unpredictable, rising and falling with customer demand, the weather and changes to the app's pricing. Critics also point out that the flexibility may be less real than it seems. Algorithms often reward workers who accept every job and penalise those who decline, which puts pressure on drivers and couriers to remain online for long periods.

Governments have responded in different ways. Courts in several countries have ruled that some platform workers should be treated as employees, giving them the right to a minimum wage. Other policymakers favour a third category, which would offer basic protections while preserving the independence that many workers say they value. Platforms, for their part, argue that strict regulation would raise prices for consumers and reduce the number of available jobs.

The debate reflects a wider question about the future of work. As technology makes it easier to divide labour into small, separate tasks, societies must decide how to balance economic efficiency with security for the people who perform those tasks. There is unlikely to be a single solution, but the outcome will shape the working lives of millions.`,
      keywords: ['platforms', 'flexibility', 'income', 'barriers', 'contractors', 'entitled', 'pension', 'advocates', 'algorithms', 'regulation', 'efficiency'],
      questions: [
        { type: 'tfng', q: 'Gig workers are paid separately for each task.', answer: 'TRUE', explain: 'Bài viết: individuals "are paid separately for each job".' },
        { type: 'tfng', q: 'Most gig workers receive holiday pay.', answer: 'FALSE', explain: 'Bài viết: gig workers "are generally not entitled to sick pay, holiday pay or a pension".' },
        { type: 'tfng', q: 'The majority of gig workers are university students.', answer: 'NOT GIVEN', explain: 'Bài chỉ nêu sinh viên là một nhóm có thể hưởng lợi, không cho biết tỉ lệ sinh viên trong lực lượng này.' },
        { type: 'mcq', q: 'Why might the flexibility of gig work be "less real than it seems"?', options: ['Apps only work in the evening.', 'Workers must attend formal interviews.', 'Algorithms may penalise workers who decline jobs.', 'Governments limit working hours.'], answer: 2, explain: 'Bài viết: "Algorithms often reward workers who accept every job and penalise those who decline".' },
        { type: 'mcq', q: 'What do platforms argue about strict regulation?', options: ['It would raise prices and reduce the number of available jobs.', 'It would increase workers\' independence.', 'It would make algorithms fairer.', 'It would create a third category of worker.'], answer: 0, explain: 'Bài viết: platforms argue that strict regulation "would raise prices for consumers and reduce the number of available jobs".' },
      ],
    },
    {
      id: 'coral-restoration',
      title: 'Can We Rebuild Coral Reefs?',
      topic: 'environment',
      level: 'B2',
      emoji: '🪸',
      summaryVi: 'Rạn san hô đang suy giảm nghiêm trọng do nước biển nóng lên; các nhà khoa học thử trồng, nhân giống và “gọi cá” về rạn, nhưng giải pháp gốc rễ vẫn là cắt giảm khí thải.',
      text: `Coral reefs cover less than one per cent of the ocean floor, yet they support around a quarter of all marine species. They also protect coastlines from storms and provide food and income for hundreds of millions of people. Unfortunately, reefs are in serious decline, and scientists are now experimenting with ways to help them recover.

The main threat is rising sea temperature. Corals live in partnership with tiny algae that supply them with energy and give them their colour. When the water becomes too warm for a prolonged period, the corals expel the algae and turn white, a process known as bleaching. If temperatures return to normal quickly, the coral may survive; if not, it often dies. Pollution, overfishing and damage from boats and anchors add further pressure.

One of the most common restoration methods is coral gardening. Divers collect small fragments of healthy coral and grow them on underwater frames or ropes, where they are protected and monitored. Once the fragments have grown large enough, they are transplanted onto damaged sections of reef. Some projects have also discovered that breaking coral into very small pieces can make it grow much faster than normal, a technique called micro-fragmenting.

Other researchers are trying to breed corals that can tolerate higher temperatures. By selecting colonies that survived previous heatwaves and crossing them in laboratories, they hope to produce offspring that are more resilient. Some teams are even using underwater speakers to play the sounds of a healthy reef, which appears to attract young fish to degraded areas.

Despite these innovations, many marine biologists warn that restoration alone cannot save reefs. The area that can realistically be replanted is tiny compared with the scale of the damage, and restored coral will still be vulnerable if the oceans continue to warm. In their view, restoration should be seen as a way of buying time, while the fundamental solution lies in cutting greenhouse gas emissions.

Nevertheless, restoration projects offer real local benefits, such as supporting tourism and fisheries, and they raise public awareness. For communities that depend on reefs, even small successes can make a significant difference.`,
      keywords: ['marine', 'decline', 'threat', 'bleaching', 'fragments', 'monitored', 'offspring', 'resilient', 'restoration', 'vulnerable', 'fundamental', 'emissions'],
      questions: [
        { type: 'tfng', q: 'Coral reefs cover about a quarter of the ocean floor.', answer: 'FALSE', explain: 'Rạn san hô chỉ chiếm "less than one per cent of the ocean floor"; con số một phần tư là tỉ lệ loài sinh vật biển mà chúng nuôi dưỡng.' },
        { type: 'tfng', q: 'Bleaching happens when corals expel the algae that live with them.', answer: 'TRUE', explain: 'Bài viết: "the corals expel the algae and turn white, a process known as bleaching".' },
        { type: 'tfng', q: 'Micro-fragmenting has been banned in some countries.', answer: 'NOT GIVEN', explain: 'Bài chỉ giới thiệu kỹ thuật micro-fragmenting, không nói nước nào cấm.' },
        { type: 'mcq', q: 'What is the purpose of playing reef sounds underwater?', options: ['To frighten away boats', 'To measure water temperature', 'To attract young fish to degraded areas', 'To help divers communicate'], answer: 2, explain: 'Bài viết: âm thanh của một rạn san hô khỏe mạnh "appears to attract young fish to degraded areas".' },
        { type: 'mcq', q: 'What do many marine biologists believe?', options: ['Restoration can fully replace lost reefs.', 'Coral gardening is too expensive to continue.', 'Bleaching no longer threatens reefs.', 'Restoration buys time, but cutting emissions is the real solution.'], answer: 3, explain: 'Bài viết: restoration is "a way of buying time, while the fundamental solution lies in cutting greenhouse gas emissions".' },
      ],
    },
    {
      id: 'sports-psychology',
      title: 'Winning in the Mind: Sports Psychology',
      topic: 'sport',
      level: 'B2',
      emoji: '🏅',
      summaryVi: 'Ở đỉnh cao thể thao, yếu tố tâm lý thường quyết định thắng thua: hình dung, kiểm soát lo âu, tự nhủ tích cực, động lực và sức khỏe tinh thần.',
      text: `At the highest level of sport, the physical differences between competitors are often extremely small. Elite athletes train for similar hours, follow similar diets and use similar equipment. What frequently separates a champion from the rest of the field is not strength or speed, but mental preparation. This is the territory of sports psychology.

One of the most widely used techniques is visualisation. Before a race or match, athletes imagine themselves performing each movement successfully, often in great detail. Research suggests that this mental rehearsal activates some of the same areas of the brain as physical practice, helping to strengthen the patterns needed during competition. Divers and gymnasts, for example, may mentally run through a routine dozens of times before attempting it.

Another key area is the management of anxiety. A certain level of nervousness can sharpen attention, but too much may cause muscles to tense and decisions to become rushed. Psychologists teach breathing exercises and short routines to help athletes stay calm under pressure. A tennis player who bounces the ball the same number of times before every serve is using a routine to focus the mind and block out distractions.

Self-talk is also important. Athletes are encouraged to notice negative thoughts, such as "I always miss this shot", and replace them with more constructive statements. Studies have found that positive or instructional self-talk can improve performance, particularly in tasks requiring precision.

Sports psychologists pay close attention to motivation as well. Athletes who focus on improving their own performance, rather than only on winning, tend to cope better with setbacks and are less likely to give up. Setting specific, achievable goals for each training session can help maintain this focus over a long season.

Increasingly, the field also addresses mental health more broadly. Several high-profile athletes have spoken openly about depression and burnout, encouraging teams to provide psychological support rather than treating such problems as signs of weakness. As a result, sports psychology is no longer seen as an optional extra but as an essential part of preparing for competition.`,
      keywords: ['competitors', 'techniques', 'rehearsal', 'anxiety', 'distractions', 'psychological', 'precision', 'motivation', 'setbacks', 'cope', 'depression', 'essential'],
      questions: [
        { type: 'tfng', q: 'Elite athletes usually differ greatly in their physical abilities.', answer: 'FALSE', explain: 'Bài viết: "the physical differences between competitors are often extremely small".' },
        { type: 'tfng', q: 'A certain amount of nervousness can help athletes concentrate.', answer: 'TRUE', explain: 'Bài viết: "A certain level of nervousness can sharpen attention".' },
        { type: 'tfng', q: 'Visualisation works better for team sports than for individual sports.', answer: 'NOT GIVEN', explain: 'Bài không so sánh hiệu quả của kỹ thuật hình dung giữa môn đồng đội và môn cá nhân.' },
        { type: 'mcq', q: 'Why might a tennis player bounce the ball the same number of times before every serve?', options: ['To use a routine that focuses the mind', 'To warm up the ball', 'To annoy the opponent', 'To test the court surface'], answer: 0, explain: 'Bài viết: the player "is using a routine to focus the mind and block out distractions".' },
        { type: 'mcq', q: 'According to the text, athletes who focus on improving their own performance…', options: ['win more often than others.', 'need less training.', 'cope better with setbacks.', 'never feel anxious.'], answer: 2, explain: 'Bài viết: they "tend to cope better with setbacks and are less likely to give up".' },
      ],
    },
    {
      id: 'water-scarcity',
      title: 'A Thirsty Planet: Managing Water Scarcity',
      topic: 'environment',
      level: 'B2',
      emoji: '💧',
      summaryVi: 'Nước ngọt dễ tiếp cận rất hạn chế trong khi nhu cầu tăng nhanh; tưới nhỏ giọt, sửa đường ống, tái sử dụng nước thải, khử mặn và chính sách giá là những giải pháp đang được áp dụng.',
      text: `Water covers most of the Earth's surface, so it may seem strange that scarcity is one of the most pressing problems of the century. The difficulty is that only a tiny fraction of the planet's water is fresh and easily accessible; the rest is salty or locked in ice. As populations grow and economies develop, demand for this limited supply is rising quickly.

Agriculture is by far the largest user, accounting for roughly 70 per cent of the fresh water withdrawn worldwide. Irrigation allows farmers to grow crops in dry regions, but inefficient methods, such as flooding entire fields, lose large quantities through evaporation. Industry and growing cities place further demands on rivers and underground reserves. In some regions, groundwater is being pumped out far faster than rain can replace it, causing water tables to fall and, in certain cities, the ground itself to sink.

Climate change is adding to the pressure. Rising temperatures increase evaporation, and changing rainfall patterns mean that some areas experience longer droughts, while others suffer intense floods that are difficult to capture and store. Communities that rely on glaciers for their summer water supply face particular uncertainty as the ice retreats.

There is, however, considerable scope for improvement. Drip irrigation, which delivers water directly to the roots of plants, can significantly reduce consumption on farms. Many cities lose a large share of their treated water through leaking pipes, so repairing infrastructure can save enormous volumes. Wastewater, once regarded simply as a problem, is increasingly being treated and reused for irrigation, industry and even drinking. Coastal countries are also investing in desalination, which removes salt from seawater, although the process requires a great deal of energy and produces a salty by-product that must be disposed of carefully.

Pricing is another tool, though a controversial one. Economists argue that when water is very cheap, people have little incentive to conserve it. Critics respond that access to clean water is a human right and that higher charges could harm the poorest households. Many governments therefore use tiered systems, in which a basic quantity is provided at low cost and heavy users pay more.

Ultimately, managing water scarcity will require cooperation between farmers, industries, city authorities and neighbouring countries that share the same rivers.`,
      keywords: ['scarcity', 'accessible', 'irrigation', 'reserves', 'groundwater', 'droughts', 'consumption', 'infrastructure', 'desalination', 'incentive', 'glaciers', 'cooperation'],
      questions: [
        { type: 'tfng', q: 'Agriculture uses about 70 per cent of the fresh water taken worldwide.', answer: 'TRUE', explain: 'Bài viết: agriculture accounts for "roughly 70 per cent of the fresh water withdrawn worldwide".' },
        { type: 'tfng', q: 'Desalination needs very little energy.', answer: 'FALSE', explain: 'Bài viết: the process "requires a great deal of energy".' },
        { type: 'tfng', q: 'Drip irrigation is now used on most farms in the world.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói tưới nhỏ giọt có thể giảm lượng nước tiêu thụ, không cho biết mức độ phổ biến.' },
        { type: 'mcq', q: 'Why do some economists support higher water prices?', options: ['To pay for protecting glaciers', 'To reduce flooding in cities', 'Because water is a human right', 'Because very cheap water gives people little incentive to conserve it'], answer: 3, explain: 'Bài viết: "when water is very cheap, people have little incentive to conserve it".' },
        { type: 'mcq', q: 'What is a tiered pricing system?', options: ['A basic quantity is cheap and heavy users pay more.', 'Everyone pays exactly the same price.', 'Farmers do not pay anything.', 'Prices change every day.'], answer: 0, explain: 'Bài viết: "a basic quantity is provided at low cost and heavy users pay more".' },
      ],
    },
    {
      id: 'smart-cities',
      title: 'How Smart Should a City Be?',
      topic: 'technology',
      level: 'B2',
      emoji: '🏙️',
      summaryVi: 'Thành phố thông minh dùng cảm biến và dữ liệu để điều phối giao thông, năng lượng, nước; nhưng cũng đặt ra vấn đề quyền riêng tư, an ninh mạng và sự công bằng.',
      text: `Imagine a city where streetlights dim automatically when no one is around, where bins send a message when they need emptying, and where traffic signals adjust to the flow of cars in real time. This is the vision of the smart city: an urban area that uses sensors, data and digital networks to run services more efficiently.

Transport is often the first area to benefit. By analysing information from cameras, mobile phones and public transport cards, city authorities can identify where congestion builds up and change the timing of traffic lights accordingly. Some cities provide apps that show exactly when the next bus will arrive or where free parking spaces can be found, reducing the time drivers spend circling the streets.

Energy and resources are another focus. Smart meters allow households to monitor their electricity use, while sensors in water pipes can detect leaks before they become serious. Lighting systems that respond to movement can significantly cut the energy consumed by street lamps. Supporters argue that these improvements not only save money but also help cities meet their environmental targets.

However, the smart city raises important concerns. The most widely discussed is privacy. When cameras, sensors and apps constantly gather information about people's movements, there is a risk that this data could be misused, sold or stolen. Citizens may not know what is being collected or who has access to it. Security is a related issue: if essential systems such as traffic control or water supply are connected to the internet, they could become targets for hackers.

There is also a question of fairness. Expensive technology projects might concentrate on wealthy districts, leaving poorer neighbourhoods behind. People who do not own smartphones or are not comfortable with digital services, who are often older, may find it harder to use public services that move online.

For these reasons, many experts argue that a truly smart city is not simply one with the most technology. Instead, it is one that uses technology transparently, protects personal data and involves citizens in decisions about how their city should develop. Technology, in this view, should be a tool to serve people rather than an end in itself.`,
      keywords: ['sensors', 'efficiently', 'authorities', 'congestion', 'monitor', 'privacy', 'detect', 'citizens', 'concentrate', 'wealthy', 'urban'],
      questions: [
        { type: 'tfng', q: 'In a smart city, traffic signals can change according to the flow of cars.', answer: 'TRUE', explain: 'Bài viết: "traffic signals adjust to the flow of cars in real time".' },
        { type: 'tfng', q: 'Privacy is rarely discussed in debates about smart cities.', answer: 'FALSE', explain: 'Bài viết: "The most widely discussed is privacy" – đây là mối lo được bàn nhiều nhất.' },
        { type: 'tfng', q: 'Most smart city projects are paid for by private companies.', answer: 'NOT GIVEN', explain: 'Bài không đề cập nguồn tài trợ cho các dự án thành phố thông minh.' },
        { type: 'mcq', q: 'How can apps reduce the time drivers spend circling the streets?', options: ['By switching off streetlights', 'By showing where free parking spaces can be found', 'By selling data to companies', 'By closing busy roads'], answer: 1, explain: 'Bài viết: apps show "where free parking spaces can be found, reducing the time drivers spend circling the streets".' },
        { type: 'mcq', q: 'According to many experts, a truly smart city is one that…', options: ['has the most technology.', 'moves all public services online.', 'uses technology transparently and involves citizens in decisions.', 'focuses first on wealthy districts.'], answer: 2, explain: 'Bài viết: it is one that "uses technology transparently, protects personal data and involves citizens in decisions".' },
      ],
    },
    {
      id: 'bilingual-brains',
      title: 'The Bilingual Brain',
      topic: 'language',
      level: 'B2',
      emoji: '🧠',
      summaryVi: 'Song ngữ từng bị cho là gây rối cho trẻ, nay lại được gắn với lợi ích nhận thức và trì hoãn triệu chứng sa sút trí tuệ – dù các nhà khoa học vẫn tranh luận về mức độ của những lợi ích này.',
      text: `For much of the twentieth century, many parents and teachers believed that learning two languages at once could confuse young children and delay their development. Today, that view has largely been reversed. A growing body of research suggests that bilingualism may bring a range of cognitive benefits, although scientists still disagree about how large these benefits are.

When a bilingual person speaks, both languages appear to be active in the brain at the same time, even if only one is being used. To avoid mixing them, the brain must constantly select the correct language and suppress the other. Some researchers believe that this regular mental exercise strengthens executive function, the set of skills we use to plan, switch between tasks and ignore distractions. In several experiments, bilingual children performed better than monolingual children on tasks that required them to change rules quickly.

Perhaps the most striking claims concern ageing. Studies in a number of countries have found that bilingual people who develop dementia tend to show symptoms several years later than monolingual people with similar levels of brain damage. One explanation is the idea of cognitive reserve: a lifetime of managing two languages may build extra connections that help the brain compensate for decline.

However, the picture is not entirely clear. Some large studies have failed to find any advantage in executive function, and critics argue that earlier research involved small samples or did not fully account for other factors, such as education, income or immigration background. There is also concern that studies showing positive results are more likely to be published than those that find nothing.

What is less controversial is that early childhood is an excellent time to acquire a second language, particularly its pronunciation. Children exposed to two languages from birth typically reach the main stages of language development at roughly the same ages as their monolingual peers. Their vocabulary in each separate language may be slightly smaller at first, but their total vocabulary across both languages is usually comparable.

Regardless of the debate about cognitive advantages, the practical and cultural benefits of speaking more than one language are undeniable. Bilingual people can communicate with a wider range of people, access different media and, in many careers, enjoy better employment opportunities.`,
      keywords: ['bilingual', 'cognitive', 'executive', 'distractions', 'striking', 'exposed', 'symptoms', 'compensate', 'controversial', 'acquire', 'peers', 'regardless'],
      questions: [
        { type: 'tfng', q: 'In the past, some people believed that learning two languages could delay children\'s development.', answer: 'TRUE', explain: 'Bài viết: many believed learning two languages "could confuse young children and delay their development".' },
        { type: 'tfng', q: 'All studies have found that bilingual people have better executive function.', answer: 'FALSE', explain: 'Bài viết: "Some large studies have failed to find any advantage in executive function".' },
        { type: 'tfng', q: 'Bilingual children usually learn to read earlier than monolingual children.', answer: 'NOT GIVEN', explain: 'Bài không đề cập thời điểm biết đọc của trẻ song ngữ.' },
        { type: 'mcq', q: 'According to the text, what is "cognitive reserve"?', options: ['A second language learned in old age', 'A type of dementia', 'A test of executive function', 'Extra connections that may help the brain compensate for decline'], answer: 3, explain: 'Bài viết: managing two languages "may build extra connections that help the brain compensate for decline".' },
        { type: 'mcq', q: 'Why do critics question earlier research?', options: ['It used small samples or ignored factors such as education and income.', 'It only studied adults.', 'It was never published.', 'It focused only on pronunciation.'], answer: 0, explain: 'Bài viết: earlier research "involved small samples or did not fully account for other factors, such as education, income or immigration background".' },
      ],
    },
    {
      id: 'volcano-monitoring',
      title: 'Listening to Volcanoes',
      topic: 'science',
      level: 'B2',
      emoji: '🌋',
      summaryVi: 'Địa chấn kế, vệ tinh và đo khí giúp nhận ra dấu hiệu núi lửa sắp phun, nhưng dự báo vẫn khó; kế hoạch khẩn cấp và niềm tin của cộng đồng cũng quan trọng không kém công nghệ.',
      text: `Around 800 million people live within 100 kilometres of an active volcano. For them, the ability to predict an eruption can be a matter of life and death. Although scientists cannot yet say exactly when a volcano will erupt, modern monitoring techniques have greatly improved their ability to recognise the warning signs.

The most important tool is the seismometer, which detects vibrations in the ground. As magma rises towards the surface, it forces its way through rock, creating swarms of small earthquakes. A sudden increase in the number or strength of these tremors often indicates that molten rock is on the move. Experienced volcanologists can also distinguish between different types of signals, some of which are linked to the movement of gas and fluids rather than breaking rock.

Changes in the shape of the ground provide further clues. When magma accumulates beneath a volcano, the surface may swell by several centimetres or even metres. Satellites using radar can now measure these tiny changes over large areas, while GPS stations placed on the volcano's slopes record movements continuously. In addition, scientists measure the gases released from vents and cracks. A rise in sulphur dioxide, for example, may suggest that fresh magma is approaching the surface.

Despite these advances, forecasting remains difficult. Each volcano behaves differently, and many show signs of unrest for months or years without erupting. If authorities order an evacuation too early or too often, residents may lose trust in the warnings and refuse to leave next time. On the other hand, a delayed decision can be catastrophic. Scientists must therefore communicate uncertainty clearly, often using alert levels that indicate the degree of danger rather than precise dates.

Many of the world's most dangerous volcanoes are located in developing countries, where funding for monitoring equipment is limited. International cooperation, cheaper sensors and satellite data that is freely available have begun to narrow this gap. Even so, experts stress that technology is only part of the solution: clear emergency plans, education and trust between scientists and local communities are just as essential in reducing the risk to human life.`,
      keywords: ['eruption', 'monitoring', 'detects', 'magma', 'indicates', 'accumulates', 'satellites', 'forecasting', 'distinguish', 'precise', 'uncertainty', 'cooperation'],
      questions: [
        { type: 'tfng', q: 'Scientists can now predict the exact date of most eruptions.', answer: 'FALSE', explain: 'Bài viết: "scientists cannot yet say exactly when a volcano will erupt".' },
        { type: 'tfng', q: 'The ground above a volcano may swell when magma accumulates.', answer: 'TRUE', explain: 'Bài viết: "When magma accumulates beneath a volcano, the surface may swell by several centimetres or even metres".' },
        { type: 'tfng', q: 'Sulphur dioxide is the most dangerous gas released by volcanoes.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói lượng sulphur dioxide tăng có thể là dấu hiệu magma đang lên, không so sánh độ nguy hiểm của các loại khí.' },
        { type: 'mcq', q: 'Why can frequent early evacuations be a problem?', options: ['They are too expensive for satellites.', 'They damage monitoring equipment.', 'Residents may lose trust in warnings and refuse to leave next time.', 'They cause more earthquakes.'], answer: 2, explain: 'Bài viết: "residents may lose trust in the warnings and refuse to leave next time".' },
        { type: 'mcq', q: 'Apart from technology, what do experts say is needed to reduce the risk?', options: ['More volcanologists in every city', 'Emergency plans, education and trust with local communities', 'Walls built around volcanoes', 'A ban on tourism near volcanoes'], answer: 1, explain: 'Bài viết: "clear emergency plans, education and trust between scientists and local communities are just as essential".' },
      ],
    },
    {
      id: 'overtourism',
      title: 'When Tourism Becomes Too Much',
      topic: 'travel',
      level: 'B2',
      emoji: '🧳',
      summaryVi: 'Du lịch quá tải khiến phố cổ chật chội, giá thuê nhà tăng và thiên nhiên bị tổn hại; các nơi đang thử thuế du lịch, giới hạn khách và quảng bá điểm đến ít người biết.',
      text: `Tourism is one of the world's largest industries, providing jobs and income in almost every country. Cheaper flights, online booking and social media have made it easier than ever to visit distant places. Yet in some of the most popular destinations, the sheer number of visitors has become a source of tension. The term "overtourism" is now used to describe situations in which tourism damages the quality of life of local people or the very places that attract visitors in the first place.

The effects are most visible in historic city centres. Narrow streets designed for pedestrians can become so crowded that local people struggle to walk to work. Shops that once sold everyday goods are replaced by souvenir stalls and fast-food outlets. In several cities, the growth of short-term holiday rentals has reduced the number of homes available to local families, pushing up rents and forcing some of them to move away. As a result, certain neighbourhoods risk turning into what critics call "theme parks" with few permanent inhabitants.

Natural sites face different pressures. Popular beaches, mountain trails and coral reefs can suffer from erosion, litter and disturbance to wildlife. In some places, a single photograph shared widely online has drawn crowds to locations that lack the infrastructure to cope.

Authorities have tried a variety of responses. Some cities have introduced tourist taxes, using the revenue to maintain public spaces. Others limit the number of cruise ships allowed to dock each day or require visitors to book in advance for famous attractions. A few destinations have restricted new holiday rentals in residential areas. Tourism boards are also promoting lesser-known regions and encouraging travel outside the peak season, in the hope of spreading visitors more evenly.

These measures are not without controversy. Businesses that depend on tourism worry that restrictions will reduce their income, and some argue that charging fees makes travel accessible only to the wealthy. Finding the right balance is not easy. However, most experts agree that the aim should not be to stop tourism, but to manage it so that it benefits both visitors and the communities who host them.`,
      keywords: ['destinations', 'tension', 'pedestrians', 'residential', 'outlets', 'infrastructure', 'revenue', 'restricted', 'peak', 'controversy', 'accessible'],
      questions: [
        { type: 'tfng', q: 'Short-term holiday rentals have caused rents to rise in some cities.', answer: 'TRUE', explain: 'Bài viết: the growth of short-term holiday rentals has reduced available homes, "pushing up rents".' },
        { type: 'tfng', q: 'Overtourism only affects historic cities.', answer: 'FALSE', explain: 'Bài viết: "Natural sites face different pressures" – bãi biển, đường mòn, rạn san hô cũng bị ảnh hưởng.' },
        { type: 'tfng', q: 'Tourist taxes have reduced visitor numbers in most cities.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói tiền thuế được dùng để duy tu không gian công cộng, không nói thuế làm giảm lượng khách.' },
        { type: 'mcq', q: 'How are tourism boards trying to spread visitors more evenly?', options: ['By closing famous attractions', 'By banning all cruise ships', 'By raising the price of flights', 'By promoting lesser-known regions and travel outside the peak season'], answer: 3, explain: 'Bài viết: tourism boards are "promoting lesser-known regions and encouraging travel outside the peak season".' },
        { type: 'mcq', q: 'What is the writer\'s main conclusion?', options: ['Tourism should be managed to benefit both visitors and host communities.', 'Tourism should be stopped in crowded cities.', 'Only wealthy people should be allowed to travel.', 'Holiday rentals should be encouraged.'], answer: 0, explain: 'Bài viết: "the aim should not be to stop tourism, but to manage it so that it benefits both visitors and the communities who host them".' },
      ],
    },

    /* ===================== C1 ===================== */
    {
      id: 'ai-medicine',
      title: 'Artificial Intelligence at the Bedside',
      topic: 'health',
      level: 'C1',
      emoji: '🩺',
      summaryVi: 'Trí tuệ nhân tạo đọc ảnh y khoa ngang chuyên gia, nhưng phụ thuộc dữ liệu huấn luyện, thiếu minh bạch và chưa rõ trách nhiệm; giới chuyên môn xem AI là trợ lý chứ không thay thế bác sĩ.',
      text: `Few fields illustrate both the promise and the pitfalls of artificial intelligence as vividly as medicine. Algorithms trained on vast collections of medical images can now identify certain cancers, eye diseases and fractures with an accuracy that rivals, and occasionally surpasses, that of experienced specialists. Enthusiasts envisage a future in which AI relieves overstretched doctors of routine tasks, catches diseases earlier and extends high-quality diagnosis to regions where specialists are scarce.

The appeal is easy to understand. A radiologist may examine hundreds of scans in a single shift, and fatigue inevitably increases the risk of error. An algorithm does not tire, and it can be deployed to flag suspicious images for priority review, allowing human experts to concentrate their attention where it is most needed. Beyond imaging, machine-learning systems are being used to predict which hospital patients are at risk of sudden deterioration, to speed up the discovery of new drugs and to transcribe consultations so that clinicians spend less time on paperwork.

Nevertheless, translating impressive laboratory results into real clinical benefit has proved more difficult than early headlines suggested. An algorithm is only as reliable as the data on which it was trained. If those data come predominantly from one population, the system may perform poorly for patients of different ethnic backgrounds, ages or sexes, thereby reinforcing existing inequalities in care. Systems that perform well in the hospital where they were developed have, in several documented cases, deteriorated markedly when introduced elsewhere, owing to differences in equipment or patient populations.

Transparency poses a further challenge. Many advanced models operate as so-called "black boxes", producing a conclusion without a readily interpretable explanation. Clinicians may be reluctant to act on a recommendation they cannot scrutinise, and patients are entitled to understand how decisions about their care are reached. There is also the unresolved question of accountability: if an AI-assisted diagnosis proves wrong, it is not obvious whether responsibility lies with the doctor, the hospital or the developer.

For these reasons, most experts envisage AI as an assistant rather than a replacement. Studies suggest that the combination of human judgement and algorithmic support frequently outperforms either alone, provided that clinicians remain alert to the risk of automation bias, the tendency to accept a machine's output uncritically. Regulators, meanwhile, are developing frameworks that require rigorous testing across diverse populations and continuous monitoring after deployment.

The ultimate test of medical AI will not be its performance in controlled trials, but whether it measurably improves outcomes for patients while preserving the trust on which the relationship between doctor and patient depends.`,
      keywords: ['algorithms', 'accuracy', 'specialists', 'diagnosis', 'fatigue', 'deterioration', 'predominantly', 'inequalities', 'transparency', 'reluctant', 'automation', 'rigorous', 'outcomes'],
      questions: [
        { type: 'tfng', q: 'Some algorithms can identify certain diseases as accurately as experienced specialists.', answer: 'TRUE', explain: 'Bài viết: algorithms identify some diseases "with an accuracy that rivals, and occasionally surpasses, that of experienced specialists".' },
        { type: 'tfng', q: 'An AI system that works well in one hospital will perform equally well in every other hospital.', answer: 'FALSE', explain: 'Bài viết: some systems "deteriorated markedly when introduced elsewhere".' },
        { type: 'tfng', q: 'Most hospitals have already replaced radiologists with algorithms.', answer: 'NOT GIVEN', explain: 'Bài chỉ nêu quan điểm của giới chuyên môn rằng AI là trợ lý, không cho biết các bệnh viện đã thay thế bác sĩ hay chưa.' },
        { type: 'mcq', q: 'What is "automation bias"?', options: ['A preference for older medical equipment', 'Training data that comes from a single population', 'The tendency to accept a machine\'s output uncritically', 'Errors caused by fatigue during long shifts'], answer: 2, explain: 'Bài viết định nghĩa automation bias là "the tendency to accept a machine\'s output uncritically".' },
        { type: 'mcq', q: 'Why might an algorithm reinforce inequalities in care?', options: ['It is too expensive for poorer hospitals.', 'Its training data may come mainly from one population.', 'Doctors refuse to use it.', 'It cannot read medical images.'], answer: 1, explain: 'Bài viết: "If those data come predominantly from one population, the system may perform poorly for patients of different ethnic backgrounds, ages or sexes".' },
      ],
    },
    {
      id: 'silk-road',
      title: 'Beyond Silk: The Ancient Trade Routes of Asia',
      topic: 'history',
      level: 'C1',
      emoji: '🐫',
      summaryVi: 'Con đường tơ lụa thực chất là mạng lưới tuyến đường bộ và biển kéo dài hàng thế kỷ, truyền bá không chỉ hàng hóa mà cả tôn giáo, kỹ thuật làm giấy – và cả dịch bệnh.',
      text: `The term "Silk Road" conjures up images of camel caravans crossing deserts laden with precious fabric. The reality was considerably more complex. Rather than a single road, it was a shifting network of overland and maritime routes that, over roughly fifteen centuries, linked China with Central Asia, India, the Middle East and the Mediterranean. Silk was merely one commodity among many; spices, horses, paper, glass, precious metals and ceramics all changed hands along the way.

Strikingly, few merchants ever travelled the entire distance. Goods typically passed through a relay of traders, each covering a particular segment before selling to the next. Oasis cities such as Samarkand flourished as hubs where merchants rested, exchanged goods and gathered intelligence about prices and political conditions further along the route. This fragmented structure meant that prices multiplied with every transaction, which is partly why silk commanded such extraordinary value in Rome.

The significance of these routes, however, extended far beyond commerce. Ideas, technologies and beliefs travelled alongside merchandise. Buddhism spread from India into China via Central Asian trading communities, while papermaking techniques gradually moved westward, eventually transforming record-keeping and scholarship in the Islamic world and later in Europe. Musical instruments, artistic motifs and agricultural crops were similarly diffused, leaving traces that historians still detect in surviving artefacts.

Not every exchange was beneficial. Many historians believe that the trade networks facilitated the transmission of disease, most notoriously the plague that devastated Europe and parts of Asia in the fourteenth century. The very connectivity that enabled prosperity also rendered distant populations vulnerable to shared catastrophes.

The decline of the overland routes is often attributed to the expansion of European sea voyages from the late fifteenth century, which allowed goods to be transported in bulk more cheaply by ship. Yet scholars increasingly emphasise that maritime trade across the Indian Ocean had long been substantial, and that political fragmentation and conflict in Central Asia also played a role. The story, once again, resists simple explanations.

Today the Silk Road enjoys renewed prominence, not least because modern infrastructure projects deliberately invoke its legacy. Historians caution, however, against romanticising the past. The ancient routes were neither centrally planned nor consistently peaceful; their enduring importance lies instead in demonstrating how sustained contact between distant societies can reshape economies, cultures and even the course of history itself.`,
      keywords: ['network', 'merchandise', 'commodity', 'merchants', 'prosperity', 'transaction', 'commerce', 'transmission', 'artefacts', 'facilitated', 'scholars', 'attributed'],
      questions: [
        { type: 'tfng', q: 'Most merchants travelled the whole distance between China and the Mediterranean.', answer: 'FALSE', explain: 'Bài viết: "few merchants ever travelled the entire distance" – hàng hóa được chuyển qua nhiều chặng thương nhân.' },
        { type: 'tfng', q: 'Papermaking techniques moved gradually westward along the trade routes.', answer: 'TRUE', explain: 'Bài viết: "papermaking techniques gradually moved westward".' },
        { type: 'tfng', q: 'Samarkand was the largest city on the Silk Road.', answer: 'NOT GIVEN', explain: 'Bài chỉ nêu Samarkand là một trung tâm phát triển mạnh, không so sánh quy mô với các thành phố khác.' },
        { type: 'mcq', q: 'Why did silk become so valuable in Rome?', options: ['It was produced in very small quantities.', 'Roman law restricted imports.', 'It was always transported by sea.', 'Prices multiplied with every transaction along the relay of traders.'], answer: 3, explain: 'Bài viết: "prices multiplied with every transaction, which is partly why silk commanded such extraordinary value in Rome".' },
        { type: 'mcq', q: 'What does the writer say about the decline of the overland routes?', options: ['It had several causes, including conflict in Central Asia.', 'It was caused only by European sea voyages.', 'It was caused by the plague.', 'It happened suddenly in the tenth century.'], answer: 0, explain: 'Bài viết nói ngoài các chuyến đi biển của châu Âu, "political fragmentation and conflict in Central Asia also played a role".' },
      ],
    },
    {
      id: 'attention-economy',
      title: 'The Attention Economy',
      topic: 'media',
      level: 'C1',
      emoji: '📱',
      summaryVi: 'Khi sự chú ý trở thành tài nguyên khan hiếm, các nền tảng số được thiết kế để giữ chân người dùng – gây phân mảnh sự tập trung và lan truyền tin sai; giải pháp bền vững có thể nằm ở mô hình kinh doanh.',
      text: `In an age of information abundance, the scarce resource is no longer information itself but the human attention required to consume it. This insight, articulated by economists decades before the smartphone, underpins what is now termed the attention economy. Many of the most valuable companies in the world offer their core services free of charge; their revenue derives instead from capturing users' time and selling access to it, chiefly through advertising.

The commercial logic has profound consequences for design. If profit depends on engagement, platforms have a powerful incentive to maximise the time users spend on them. Features such as infinite scrolling, autoplaying videos and notifications delivered at unpredictable intervals have been criticised for exploiting well-documented psychological tendencies. Variable rewards, such as the uncertain prospect of a new message or a burst of approval, are known to be particularly compelling, a principle long familiar to designers of gambling machines.

Critics contend that the cumulative effect is a fragmentation of attention. Constant switching between tasks appears to impose a cognitive cost, reducing the capacity for the sustained, deep concentration on which complex reasoning and creative work depend. Some researchers have linked heavy social media use to anxiety and poor sleep, particularly among adolescents, although establishing causation remains notoriously difficult: it is plausible that people who are already anxious gravitate towards their screens.

Moreover, the content that captures attention most effectively is not necessarily the most accurate or valuable. Algorithms that prioritise engagement may inadvertently amplify sensational, divisive or misleading material, since such content provokes strong reactions. This dynamic has prompted concern about the health of public debate and the spread of misinformation.

Responses have emerged on several fronts. Some technology companies have introduced tools that allow users to monitor their screen time or disable certain features. Legislators in various jurisdictions are scrutinising design practices that may be manipulative, especially where children are concerned. At the individual level, a growing movement advocates "digital minimalism", which means deliberately limiting the role of technology to activities that genuinely serve one's values.

Yet framing the issue purely as a matter of individual willpower may be misguided. When some of the most sophisticated engineering in history is devoted to capturing attention, expecting each user to resist unaided seems unrealistic. A more durable solution may require rethinking the underlying business models, so that the commercial success of digital services is aligned with, rather than opposed to, the wellbeing of the people who use them.`,
      keywords: ['cognitive', 'revenue', 'engagement', 'incentive', 'consequences', 'cumulative', 'fragmentation', 'causation', 'plausible', 'prioritise', 'misinformation', 'jurisdictions'],
      questions: [
        { type: 'tfng', q: 'Many companies in the attention economy earn money mainly from advertising.', answer: 'TRUE', explain: 'Bài viết: their revenue comes from "capturing users\' time and selling access to it, chiefly through advertising".' },
        { type: 'tfng', q: 'Researchers have proved that social media directly causes anxiety in adolescents.', answer: 'FALSE', explain: 'Bài viết: "establishing causation remains notoriously difficult" – chưa chứng minh được quan hệ nhân quả.' },
        { type: 'tfng', q: 'Digital minimalism is more popular among older adults than among young people.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói phong trào này đang phát triển, không so sánh theo độ tuổi.' },
        { type: 'mcq', q: 'Why are variable rewards described as compelling?', options: ['They are completely predictable.', 'They pay users money.', 'They help reduce screen time.', 'Their uncertainty makes them particularly attractive, as in gambling machines.'], answer: 3, explain: 'Bài viết: variable rewards are "particularly compelling, a principle long familiar to designers of gambling machines".' },
        { type: 'mcq', q: 'What does the writer suggest in the final paragraph?', options: ['Users should simply show more willpower.', 'Business models may need to be rethought to align with users\' wellbeing.', 'Smartphones should be banned for adults.', 'Advertising should be made free.'], answer: 1, explain: 'Bài viết: "A more durable solution may require rethinking the underlying business models".' },
      ],
    },
    {
      id: 'rewilding',
      title: 'Rewilding: Letting Nature Take the Lead',
      topic: 'environment',
      level: 'C1',
      emoji: '🦫',
      summaryVi: 'Tái hoang dã khôi phục các quá trình tự nhiên bằng cách đưa loài như hải ly, sói trở lại; cách tiếp cận này đầy tham vọng nhưng gây tranh cãi và cần sự đồng thuận của cộng đồng.',
      text: `For much of the twentieth century, nature conservation in many countries focused on protecting particular species or preserving landscapes in a carefully managed state. Rewilding represents a markedly different philosophy. Rather than intervening continually to maintain a fixed condition, it seeks to restore natural processes and then, as far as possible, allow ecosystems to regulate themselves.

Central to rewilding is the reintroduction of species that once shaped their environments but disappeared because of hunting or habitat loss. Large predators and so-called ecosystem engineers often attract the most attention. The beaver, for instance, builds dams that slow the flow of rivers, creating wetlands that store water, reduce downstream flooding and support a remarkable diversity of insects, birds and amphibians. Similarly, the return of grazing animals such as wild cattle or horses can create a patchwork of open ground and woodland that benefits a wide range of plants.

The most frequently cited example is the reintroduction of wolves to Yellowstone National Park in the 1990s. According to a widely publicised account, wolves reduced the number of elk and altered their behaviour, allowing riverside vegetation to recover, which in turn stabilised riverbanks. Subsequent research, however, has suggested that this "trophic cascade" was considerably more complex and less dramatic than popular versions implied, with factors such as human hunting and drought also playing significant roles. The episode serves as a reminder that ecological outcomes are rarely as tidy as compelling narratives suggest.

Rewilding is not without its detractors. Farmers sometimes fear that returning predators will attack livestock, and beavers can flood valuable agricultural land. Critics also question whether a "wild" state can meaningfully be defined in landscapes that have been shaped by humans for thousands of years. Which point in history, they ask, should serve as the baseline? Proponents generally respond that the aim is not to recreate a specific past, but to increase the complexity and resilience of ecosystems.

Practical success therefore depends as much on social acceptance as on ecology. Projects that compensate farmers for losses, involve local communities in planning and create opportunities in nature tourism tend to encounter less opposition. In densely populated regions, rewilding may take more modest forms, such as allowing rivers to follow their natural courses or leaving parts of farmland to regenerate naturally.

As biodiversity continues to decline globally, rewilding offers an ambitious, if contested, vision: one in which human beings act less as managers of nature and more as facilitators of its recovery.`,
      keywords: ['conservation', 'ecosystems', 'habitat', 'predators', 'diversity', 'regulate', 'subsequent', 'narratives', 'livestock', 'complexity', 'opposition', 'resilience', 'biodiversity'],
      questions: [
        { type: 'tfng', q: 'Rewilding aims to keep landscapes in a fixed, carefully managed state.', answer: 'FALSE', explain: 'Bài viết: rewilding seeks to restore natural processes "rather than intervening continually to maintain a fixed condition".' },
        { type: 'tfng', q: 'Later research suggested that the effects of wolves in Yellowstone were more complex than popular accounts claimed.', answer: 'TRUE', explain: 'Bài viết: nghiên cứu sau này cho thấy "trophic cascade" ở Yellowstone "was considerably more complex and less dramatic than popular versions implied".' },
        { type: 'tfng', q: 'Beavers have been reintroduced to every country in Europe.', answer: 'NOT GIVEN', explain: 'Bài chỉ giải thích vai trò của hải ly, không nói chúng được đưa trở lại những quốc gia nào.' },
        { type: 'mcq', q: 'Why is the beaver described as an ecosystem engineer?', options: ['It hunts elk.', 'It eats agricultural crops.', 'Its dams create wetlands that support many species.', 'It increases flooding downstream.'], answer: 2, explain: 'Bài viết: beavers build dams, "creating wetlands that store water, reduce downstream flooding and support a remarkable diversity" of species.' },
        { type: 'mcq', q: 'According to the text, which factor helps rewilding projects meet less opposition?', options: ['Compensating farmers for losses', 'Keeping local people out of planning', 'Introducing as many predators as possible', 'Avoiding nature tourism'], answer: 0, explain: 'Bài viết: "Projects that compensate farmers for losses, involve local communities in planning and create opportunities in nature tourism tend to encounter less opposition".' },
      ],
    },
    {
      id: 'placebo-effect',
      title: 'The Curious Power of the Placebo',
      topic: 'health',
      level: 'C1',
      emoji: '💊',
      summaryVi: 'Hiệu ứng giả dược cho thấy kỳ vọng và bối cảnh điều trị có thể tạo ra thay đổi sinh lý thật; mặt trái của nó là hiệu ứng nocebo, và giả dược không thể thay thế thuốc thật.',
      text: `In clinical research, the placebo, an inert substance such as a sugar pill, has traditionally been regarded as little more than a methodological tool. By comparing a new drug with a placebo, researchers can determine whether any improvement is attributable to the medication itself. Yet the placebo effect, the genuine improvement that some patients experience after receiving an inactive treatment, has increasingly become an object of study in its own right.

The phenomenon is most pronounced for symptoms that are subjective and influenced by the brain, such as pain, nausea and fatigue. Brain-imaging studies have shown that when patients expect pain relief, regions associated with the body's own pain-control system become more active, and the release of natural painkilling chemicals can increase. In other words, expectation is not merely imaginary; it can produce measurable physiological changes.

Context appears to matter enormously. Experiments have found that injections tend to produce stronger placebo responses than pills, that two pills can outperform one, and that branded or more expensive-looking tablets may be more effective than plain ones. The manner of the practitioner also plays a part: patients treated by a warm, attentive clinician frequently report greater improvement than those receiving identical treatment in a brisk, impersonal manner.

Perhaps the most counterintuitive findings concern so-called open-label placebos. In several trials, patients with conditions such as irritable bowel syndrome were explicitly told that they were receiving inactive pills, yet many still reported significant relief. Researchers speculate that the ritual of taking medication, combined with a credible explanation of how placebos can work, may be sufficient to trigger beneficial responses, although these studies have generally been small.

The placebo effect has a less welcome counterpart: the nocebo effect, in which negative expectations produce real side effects. Participants warned about possible symptoms are more likely to experience them, even when they have been given an inactive substance. This poses a genuine dilemma for doctors, who are obliged to inform patients of risks while avoiding the unintended creation of symptoms.

It is important not to overstate the power of placebos. They do not shrink tumours or cure infections, and relying on them in place of effective treatment would be dangerous. Their relevance lies elsewhere. A clearer understanding of how expectation and context influence recovery could help clinicians communicate more effectively and design care that maximises the benefits of genuinely active treatments.`,
      keywords: ['placebo', 'phenomenon', 'attributable', 'expectation', 'sufficient', 'participants', 'practitioner', 'counterintuitive', 'explicitly', 'speculate', 'obliged', 'overstate'],
      questions: [
        { type: 'tfng', q: 'Placebo effects are strongest for subjective symptoms such as pain and nausea.', answer: 'TRUE', explain: 'Bài viết: the phenomenon "is most pronounced for symptoms that are subjective and influenced by the brain, such as pain, nausea and fatigue".' },
        { type: 'tfng', q: 'Placebos can cure infections if patients believe in them.', answer: 'FALSE', explain: 'Bài viết: placebos "do not shrink tumours or cure infections".' },
        { type: 'tfng', q: 'Open-label placebos are now widely prescribed by family doctors.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói về một số thử nghiệm nhỏ, không đề cập việc bác sĩ gia đình kê đơn giả dược.' },
        { type: 'mcq', q: 'What is the nocebo effect?', options: ['Improvement after an inactive treatment', 'Real side effects caused by negative expectations', 'A type of injection used in trials', 'The body\'s own pain-control system'], answer: 1, explain: 'Bài viết: the nocebo effect is one "in which negative expectations produce real side effects".' },
        { type: 'mcq', q: 'Which factor is said to strengthen the placebo response?', options: ['A brisk, impersonal clinician', 'Taking one pill rather than two', 'Plain, unbranded tablets', 'A warm, attentive clinician'], answer: 3, explain: 'Bài viết: "patients treated by a warm, attentive clinician frequently report greater improvement".' },
      ],
    },
    {
      id: 'basic-income',
      title: 'Universal Basic Income: Utopia or Necessity?',
      topic: 'economy',
      level: 'C1',
      emoji: '💰',
      summaryVi: 'Thu nhập cơ bản phổ quát hứa hẹn xóa bỏ thủ tục rườm rà và “bẫy phúc lợi”, nhưng chi phí rất lớn; các thí điểm cho kết quả tích cực song chưa đủ để kết luận.',
      text: `The proposal that every citizen should receive a regular cash payment from the state, regardless of employment or wealth, has a surprisingly long and varied intellectual history. Advocated at different times by radical reformers and free-market economists alike, universal basic income (UBI) has re-emerged in recent years as a response to concerns about automation, insecure work and the complexity of existing welfare systems.

Proponents advance several distinct arguments. First, because the payment is unconditional, it eliminates the bureaucracy involved in assessing eligibility, as well as the stigma that sometimes deters people from claiming support to which they are entitled. Second, it avoids the so-called welfare trap, whereby people who take on paid work lose benefits at such a rate that they gain little or nothing financially. Third, supporters contend that a guaranteed income floor would provide security in a labour market increasingly characterised by short-term contracts and, potentially, by the displacement of jobs through artificial intelligence.

Critics raise equally substantial objections. The most immediate is cost. A payment generous enough to live on, distributed to an entire adult population, would require large increases in taxation or the dismantling of other public services. If, conversely, the payment is set at a modest level, it may be insufficient to replace targeted benefits for people with disabilities or high housing costs, potentially leaving the most vulnerable worse off. Others worry that an unconditional income might weaken the incentive to work, although the strength of this effect is fiercely disputed.

Empirical evidence remains limited, partly because genuinely universal schemes have rarely been tested. Pilot projects in countries including Finland, Kenya and Canada have typically involved selected groups rather than whole populations, and for fixed periods. Their findings have nonetheless been instructive. Recipients have generally reported improved wellbeing and reduced stress, and most studies have found little evidence of a significant decline in employment. Sceptics point out, however, that temporary experiments cannot reveal how behaviour or prices might change if a payment were permanent and nationwide.

Ultimately, the debate about UBI reflects deeper disagreements about the purpose of the welfare state: whether it should primarily provide a safety net for those in need, or guarantee every citizen a baseline of economic independence. Until larger and longer-term trials are conducted, the question is likely to be settled as much by political values as by evidence.`,
      keywords: ['welfare', 'bureaucracy', 'taxation', 'conversely', 'displacement', 'substantial', 'radical', 'vulnerable', 'incentive', 'empirical', 'recipients', 'whereby'],
      questions: [
        { type: 'tfng', q: 'Support for UBI has come from people with very different political views.', answer: 'TRUE', explain: 'Bài viết: UBI has been "Advocated at different times by radical reformers and free-market economists alike".' },
        { type: 'tfng', q: 'Pilot projects have shown a sharp fall in employment among recipients.', answer: 'FALSE', explain: 'Bài viết: "most studies have found little evidence of a significant decline in employment".' },
        { type: 'tfng', q: 'Finland has decided to introduce UBI for its entire population.', answer: 'NOT GIVEN', explain: 'Bài chỉ nhắc Phần Lan có dự án thí điểm với nhóm chọn lọc, không nói nước này quyết định áp dụng toàn quốc.' },
        { type: 'mcq', q: 'What is the "welfare trap"?', options: ['When people who start paid work lose benefits so quickly that they gain little', 'When people cannot afford housing', 'When the state stops all payments', 'When taxes are set too low'], answer: 0, explain: 'Bài viết: people "who take on paid work lose benefits at such a rate that they gain little or nothing financially".' },
        { type: 'mcq', q: 'Why do sceptics doubt the results of the pilot projects?', options: ['The pilots were too expensive.', 'Recipients reported more stress.', 'Temporary experiments cannot show how behaviour or prices would change under a permanent scheme.', 'The pilots involved whole populations.'], answer: 2, explain: 'Bài viết: "temporary experiments cannot reveal how behaviour or prices might change if a payment were permanent and nationwide".' },
      ],
    },
    {
      id: 'antibiotic-resistance',
      title: 'The Slow Pandemic: Antibiotic Resistance',
      topic: 'health',
      level: 'C1',
      emoji: '🦠',
      summaryVi: 'Việc lạm dụng kháng sinh ở người và vật nuôi đẩy nhanh tình trạng vi khuẩn kháng thuốc, trong khi thuốc mới ngày càng ít; cần quản lý kê đơn, chẩn đoán nhanh và mô hình tài trợ mới.',
      text: `When penicillin entered widespread use in the 1940s, it transformed medicine. Infections that had routinely killed, such as pneumonia, infected wounds and complications of childbirth, suddenly became treatable. Antibiotics also made possible many modern procedures, from major surgery to cancer chemotherapy, which depend on the ability to prevent or control bacterial infection. Yet even Alexander Fleming, who discovered penicillin, warned that its misuse could render bacteria resistant. That warning has proved remarkably prescient.

Resistance is, at its core, a matter of natural selection. Whenever bacteria are exposed to an antibiotic, the most susceptible are killed, while any that happen to carry a resistance mechanism survive and multiply. Bacteria can also exchange genetic material with one another, allowing resistance to spread between different species. Consequently, every use of an antibiotic, however justified, exerts some selective pressure; unnecessary use simply accelerates the process.

Such unnecessary use is widespread. Antibiotics are frequently prescribed for viral illnesses such as colds and influenza, against which they are entirely ineffective. In some countries they can be purchased without a prescription, and patients who stop a course early or share leftover tablets may contribute further. Agriculture is another major factor: in many parts of the world, large quantities are administered to livestock not to treat disease but to promote growth or to compensate for crowded conditions.

The consequences are already severe. Drug-resistant infections are estimated to be directly responsible for over a million deaths a year, and some strains have emerged that resist almost every available treatment. Compounding the problem, the pipeline of new antibiotics has slowed dramatically. Because new antibiotics would ideally be used sparingly, to preserve their effectiveness, pharmaceutical companies have little prospect of recovering development costs, and many have withdrawn from the field.

Addressing the crisis therefore requires action on several levels. Stewardship programmes in hospitals aim to ensure that antibiotics are prescribed only when necessary and that the right drug is chosen. Rapid diagnostic tests can help clinicians distinguish bacterial from viral infections. Improved sanitation and vaccination reduce the number of infections in the first place. Some governments are experimenting with new funding models, such as paying companies a fixed annual fee for access to a new antibiotic, regardless of how much is sold, thereby separating profit from sales volume.

Because bacteria do not respect borders, no single country can solve the problem alone. Experts describe antimicrobial resistance as a slow-moving pandemic: less visible than a sudden outbreak, but potentially just as dangerous if left unchecked.`,
      keywords: ['widespread', 'susceptible', 'mechanism', 'antibiotics', 'prescribed', 'resistance', 'administered', 'livestock', 'strains', 'pharmaceutical', 'vaccination', 'pandemic'],
      questions: [
        { type: 'tfng', q: 'Alexander Fleming warned that misuse of penicillin could lead to resistance.', answer: 'TRUE', explain: 'Bài viết: Fleming "warned that its misuse could render bacteria resistant".' },
        { type: 'tfng', q: 'Antibiotics are effective against colds and influenza.', answer: 'FALSE', explain: 'Bài viết: antibiotics are prescribed for colds and influenza, "against which they are entirely ineffective".' },
        { type: 'tfng', q: 'Most new antibiotics are now developed by universities.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói nhiều công ty dược đã rút khỏi lĩnh vực này, không nhắc đến vai trò của các trường đại học.' },
        { type: 'mcq', q: 'Why have many pharmaceutical companies withdrawn from developing antibiotics?', options: ['Antibiotics are too easy to make.', 'Governments have banned new antibiotics.', 'Bacteria no longer cause serious infections.', 'New antibiotics would be used sparingly, so costs are hard to recover.'], answer: 3, explain: 'Bài viết: "Because new antibiotics would ideally be used sparingly", companies "have little prospect of recovering development costs".' },
        { type: 'mcq', q: 'What is the purpose of paying companies a fixed annual fee?', options: ['To increase sales of antibiotics', 'To separate profit from sales volume', 'To replace vaccination programmes', 'To promote growth in livestock'], answer: 1, explain: 'Bài viết: the fee is paid "regardless of how much is sold, thereby separating profit from sales volume".' },
      ],
    },
    /* ===================== A2 (bổ sung) ===================== */
    {
      id: 'school-gardens', title: 'Learning in the School Garden', topic: 'environment', level: 'A2', emoji: '🥕',
      summaryVi: 'Nhiều trường học có vườn rau nhỏ; học sinh học về thiên nhiên, ăn uống lành mạnh và làm việc nhóm qua việc trồng cây.',
      text: "In many countries, more and more schools now have a small garden. Children plant seeds, water the plants and pick vegetables when they are ready. For some pupils, it is the first time they have seen how food grows.\n\nTeachers say that a garden is like an outdoor classroom. In science lessons, pupils can watch insects and learn why plants need sun and water. In maths, they measure how tall the plants are each week and draw charts. Even reading and writing lessons can use the garden: children write diaries about what they see.\n\nThe garden can also change what children like to eat. Many young people say they do not like vegetables. However, teachers often notice that children are happy to try a carrot or a tomato that they have grown themselves. Some schools use the vegetables in the school kitchen, so the pupils can eat them at lunch.\n\nWorking in the garden is a team activity, too. Pupils share jobs, such as watering, digging and taking away weeds, and they must help each other. Quiet children sometimes feel more confident outside than in the classroom.\n\nOf course, a garden needs care during the summer holidays, when the school is closed. In some schools, families take turns to visit and water the plants. Without this help, many of the plants would die before the new school year starts.",
      keywords: ['plant', 'seed', 'pupil', 'outdoor', 'measure', 'chart', 'diary', 'confident', 'weed', 'take turns'],
      questions: [
        { type: 'tfng', q: 'Some children see how food grows for the first time in a school garden.', answer: 'TRUE', explain: 'Bài viết: "For some pupils, it is the first time they have seen how food grows".' },
        { type: 'tfng', q: 'Pupils use the garden only in science lessons.', answer: 'FALSE', explain: 'Khu vườn được dùng cả trong giờ toán (đo chiều cao cây, vẽ biểu đồ) và giờ đọc – viết (viết nhật ký), không chỉ môn khoa học.' },
        { type: 'tfng', q: 'Schools with gardens get better exam results.', answer: 'NOT GIVEN', explain: 'Bài viết không nhắc đến kết quả thi của học sinh.' },
        { type: 'mcq', q: 'What do teachers often notice about children and vegetables?', options: ['They refuse to eat any vegetables at school.', 'They are happy to try vegetables they grew themselves.', 'They prefer vegetables from the supermarket.', 'They only like carrots and tomatoes.'], answer: 1, explain: 'Bài viết: giáo viên nhận thấy trẻ "happy to try a carrot or a tomato that they have grown themselves".' },
        { type: 'mcq', q: 'How do some schools look after the garden in the summer holidays?', options: ['They close the garden until autumn.', 'Teachers stay at school every day.', 'Families take turns to water the plants.', 'They pay a gardener to do the work.'], answer: 2, explain: 'Bài viết: "families take turns to visit and water the plants" – các gia đình thay phiên nhau tưới cây.' },
      ],
    },
    {
      id: 'libraries-today', title: 'What Do Libraries Do Today?', topic: 'culture', level: 'A2', emoji: '📚',
      summaryVi: 'Thư viện ngày nay không chỉ cho mượn sách mà còn có máy tính, lớp học, hoạt động cho trẻ em và là nơi gặp gỡ miễn phí của cộng đồng.',
      text: "Some people think that libraries are not important any more. After all, we can read the news, find information and even borrow e-books on our phones. But in many towns, the local library is busier than ever. So what do people do there?\n\nOf course, people still go to the library to borrow books. Borrowing is usually free, and you can take home books, magazines, films and sometimes even games. If the library does not have the book you want, the staff can often order it from another library.\n\nBut libraries are not only about books. Most libraries have computers and free internet, which is very useful for people who do not have these at home. Some people use them to look for jobs or to fill in forms for the government. Library staff can help people who are not confident with technology.\n\nLibraries also offer many activities. There are story times for small children, homework clubs for school pupils and language classes for adults. Some libraries lend tools or musical instruments, and a few even have rooms where people can use 3D printers.\n\nFinally, a library is one of the few places in a town where you can sit inside for a long time without paying anything. Students come to study in a quiet place, and older people come to read the newspaper and meet friends. For many people, the library is an important part of community life.",
      keywords: ['borrow', 'e-book', 'staff', 'order', 'confident', 'activity', 'homework club', 'lend', 'instrument', 'community'],
      questions: [
        { type: 'tfng', q: 'Many local libraries are now busier than before.', answer: 'TRUE', explain: 'Bài viết: "in many towns, the local library is busier than ever".' },
        { type: 'tfng', q: 'Library staff can sometimes get books from other libraries.', answer: 'TRUE', explain: 'Bài viết: "the staff can often order it from another library".' },
        { type: 'tfng', q: 'Most libraries charge money for using the internet.', answer: 'FALSE', explain: 'Bài viết nói hầu hết thư viện có "computers and free internet" – internet miễn phí.' },
        { type: 'mcq', q: 'Which activity for adults is mentioned in the text?', options: ['Cooking lessons', 'Language classes', 'Story times', 'Sports clubs'], answer: 1, explain: 'Bài viết: "language classes for adults". Story times dành cho trẻ nhỏ; nấu ăn và thể thao không được nhắc đến.' },
        { type: 'mcq', q: 'According to the last paragraph, why is a library special?', options: ['It is open twenty-four hours a day.', 'People can stay there for a long time without paying.', 'It sells cheap newspapers.', 'It is the biggest building in town.'], answer: 1, explain: 'Bài viết: thư viện là một trong số ít nơi "where you can sit inside for a long time without paying anything".' },
      ],
    },
    {
      id: 'daily-walk', title: 'The Power of a Daily Walk', topic: 'health', level: 'A2', emoji: '🚶',
      summaryVi: 'Đi bộ mỗi ngày là cách vận động đơn giản, miễn phí, tốt cho tim, tâm trạng và giấc ngủ; bài viết gợi ý cách biến đi bộ thành thói quen.',
      text: "Many people want to be healthier, but they do not have time or money for a gym. Doctors often say that one of the best kinds of exercise is also one of the easiest: walking.\n\nWalking is good for the heart, and it helps to keep a healthy weight. Health organisations usually advise adults to do at least 150 minutes of moderate exercise every week. A brisk walk of about 30 minutes on five days a week is one simple way to reach this goal. 'Brisk' means that you walk fast enough to breathe a little harder, but you can still talk.\n\nWalking is good for the mind, too. People who walk regularly often say that they feel calmer and less stressed. Walking outside in daylight may also help you to sleep better at night.\n\nIt is easy to make walking part of your day. You can get off the bus one stop early, take the stairs instead of the lift, or walk with a friend or colleague at lunchtime. Some people like to count their steps with a phone app, but you do not need any special equipment – just comfortable shoes.\n\nThe most important thing is to start slowly and keep going. A short walk every day is better than one very long walk once a month. After a few weeks, many people find that they look forward to their daily walk.",
      keywords: ['exercise', 'healthy weight', 'moderate', 'brisk', 'breathe', 'regularly', 'stressed', 'daylight', 'colleague', 'equipment'],
      questions: [
        { type: 'tfng', q: 'Health organisations usually advise adults to do at least 150 minutes of moderate exercise a week.', answer: 'TRUE', explain: 'Bài viết: "advise adults to do at least 150 minutes of moderate exercise every week".' },
        { type: 'tfng', q: 'During a brisk walk, you should be too out of breath to talk.', answer: 'FALSE', explain: 'Bài viết giải thích "brisk" là đi đủ nhanh để thở mạnh hơn một chút "but you can still talk" – vẫn nói chuyện được.' },
        { type: 'tfng', q: 'Walking in the morning is better than walking in the evening.', answer: 'NOT GIVEN', explain: 'Bài viết chỉ nói đi bộ ngoài trời lúc có ánh sáng ban ngày có thể giúp ngủ ngon, không so sánh buổi sáng với buổi tối.' },
        { type: 'mcq', q: 'Which of these is NOT given as a way to walk more?', options: ['Getting off the bus one stop early', 'Taking the stairs instead of the lift', 'Walking with a colleague at lunchtime', 'Walking the dog every evening'], answer: 3, explain: 'Bài viết gợi ý xuống xe buýt sớm một trạm, đi cầu thang bộ, đi bộ cùng đồng nghiệp giờ trưa; không nhắc đến việc dắt chó đi dạo.' },
        { type: 'mcq', q: 'What is the writer\'s main advice in the last paragraph?', options: ['Walk a very long way once a month.', 'Buy special equipment before you start.', 'Start slowly and walk regularly.', 'Always use a phone app.'], answer: 2, explain: 'Bài viết: "start slowly and keep going. A short walk every day is better than one very long walk once a month".' },
      ],
    },
    {
      id: 'street-food', title: 'Street Food Around the World', topic: 'culture', level: 'A2', emoji: '🍜',
      summaryVi: 'Đồ ăn đường phố có mặt ở khắp nơi trên thế giới: rẻ, nhanh, mang đậm văn hóa địa phương; bài viết cũng nhắc đến vấn đề vệ sinh và cách chọn quầy ăn an toàn.',
      text: "In cities all over the world, you can buy food on the street. In Mexico, people eat tacos from small stands. In Turkey, you can buy hot bread rings covered in sesame seeds. And in Vietnam, many people start the day with a bowl of noodle soup at a small stall on the pavement.\n\nWhy is street food so popular? First, it is usually cheap, so students and workers can eat well without spending much money. Second, it is fast. You can buy something on your way to work and eat it in a few minutes. Third, many people say that street food is the best way to learn about a country's culture, because the recipes are often very old and are passed down in families.\n\nFor many sellers, a food stall is also an important business. With a small cart and a few pots, a person can earn money for the whole family. In some cities, street food is so famous that it attracts tourists from other countries.\n\nHowever, some visitors worry about food safety. Here are a few simple tips. Choose a stall where many local people are eating, because busy stalls usually sell fresh food. Watch how the food is cooked, and choose dishes that are served very hot. If you have a weak stomach, be careful with ice and raw vegetables.\n\nWith a little care, street food can be one of the most enjoyable parts of any trip.",
      keywords: ['stand', 'stall', 'pavement', 'recipe', 'pass down', 'cart', 'earn', 'attract', 'food safety', 'raw'],
      questions: [
        { type: 'tfng', q: 'Street food is usually expensive.', answer: 'FALSE', explain: 'Bài viết: "it is usually cheap" – đồ ăn đường phố thường rẻ.' },
        { type: 'tfng', q: 'Many street food recipes are passed down in families.', answer: 'TRUE', explain: 'Bài viết: "the recipes are often very old and are passed down in families".' },
        { type: 'tfng', q: 'Street food sellers must have a licence in most cities.', answer: 'NOT GIVEN', explain: 'Bài viết không nói gì về giấy phép bán hàng.' },
        { type: 'mcq', q: 'Why does the writer suggest choosing a busy stall?', options: ['Busy stalls are usually cheaper.', 'Busy stalls usually sell fresh food.', 'Busy stalls have more seats.', 'Busy stalls serve bigger portions.'], answer: 1, explain: 'Bài viết: chọn quầy có nhiều người địa phương ăn "because busy stalls usually sell fresh food".' },
        { type: 'mcq', q: 'What should people with a weak stomach be careful with?', options: ['Very hot dishes', 'Noodle soup', 'Ice and raw vegetables', 'Bread with sesame seeds'], answer: 2, explain: 'Bài viết: "If you have a weak stomach, be careful with ice and raw vegetables". Món nóng thì lại được khuyên nên chọn.' },
      ],
    },
    /* ===================== B1 (bổ sung) ===================== */
    {
      id: 'teen-sleep', title: 'Why Teenagers Find It Hard to Wake Up', topic: 'health', level: 'B1', emoji: '😴',
      summaryVi: 'Đồng hồ sinh học của thanh thiếu niên lùi muộn hơn nên khó ngủ sớm và khó dậy sớm; bài viết giải thích nguyên nhân và các cách giúp ngủ đủ giấc.',
      text: "Many parents complain that their teenage children stay up late and then cannot get out of bed in the morning. It is easy to think that teenagers are simply lazy. However, sleep scientists say that the real reason is biological.\n\nEveryone has a body clock that tells us when to feel sleepy and when to feel awake. During the teenage years, this clock moves later. As a result, many teenagers do not feel tired until eleven o'clock at night or even later. At the same time, most still need around eight to ten hours of sleep a night. If school starts early, they simply do not get enough rest.\n\nLack of sleep can have serious effects. Tired students find it harder to concentrate and remember new information. They may also feel more stressed or get angry more easily. Some research suggests that sleepy teenagers are more likely to have accidents when they ride a bike or drive.\n\nFor this reason, some schools have experimented with starting lessons later in the morning. Teachers in these schools often report that students are more alert in class.\n\nTeenagers can also help themselves. Experts recommend going to bed at the same time every night, even at weekends, and avoiding bright screens for an hour before sleep. Getting some daylight in the morning can also help the body clock to stay on time.",
      keywords: ['complain', 'biological', 'body clock', 'sleepy', 'rest', 'concentrate', 'stressed', 'alert', 'recommend', 'daylight'],
      questions: [
        { type: 'tfng', q: 'Sleep scientists believe that teenagers who sleep late are usually lazy.', answer: 'FALSE', explain: 'Bài viết: dễ nghĩ rằng thanh thiếu niên lười, "However, sleep scientists say that the real reason is biological" – lý do là sinh học, không phải lười.' },
        { type: 'tfng', q: 'Most teenagers need around eight to ten hours of sleep a night.', answer: 'TRUE', explain: 'Bài viết: "most still need around eight to ten hours of sleep a night".' },
        { type: 'tfng', q: 'All schools in the country now start lessons later in the morning.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói "some schools have experimented with starting lessons later"; không có thông tin tất cả các trường đã đổi giờ.' },
        { type: 'mcq', q: 'According to the text, what happens to the body clock during the teenage years?', options: ['It stops working properly.', 'It moves later.', 'It moves earlier.', 'It becomes the same as an adult\'s.'], answer: 1, explain: 'Bài viết: "During the teenage years, this clock moves later" – đồng hồ sinh học lùi muộn hơn, nên các phương án còn lại sai.' },
        { type: 'mcq', q: 'Which piece of advice is given to teenagers?', options: ['Sleep longer only at weekends.', 'Use a phone in bed to relax.', 'Go to bed at the same time every night.', 'Avoid daylight in the morning.'], answer: 2, explain: 'Chuyên gia khuyên "going to bed at the same time every night, even at weekends". Bài khuyên tránh màn hình sáng và NÊN đón ánh sáng buổi sáng, nên B và D sai; A trái với lời khuyên giữ giờ cố định.' },
      ],
    },
    {
      id: 'night-markets', title: 'The Magic of Night Markets', topic: 'culture', level: 'B1', emoji: '🏮',
      summaryVi: 'Chợ đêm là nơi mua sắm, ăn uống và gặp gỡ ở nhiều nước châu Á; bài viết nói về sức hút, lợi ích kinh tế và những thách thức như rác thải, tiếng ồn.',
      text: "When the sun goes down in many Asian cities, quiet streets and car parks suddenly come to life. Stalls appear, lights are switched on, and the smell of grilled food fills the air. Welcome to the night market.\n\nNight markets have a long history in countries such as Taiwan, Thailand and Vietnam. In hot climates, it makes sense to shop and eat in the evening, when the temperature is lower. For many families, a trip to the night market is a weekly tradition.\n\nThe main attraction for most visitors is the food. Visitors can try dozens of local dishes in one evening, often for very low prices. But night markets also sell clothes, phone cases, toys and handmade souvenirs, and many people enjoy bargaining with the sellers.\n\nNight markets are important for the local economy, too. Renting a stall is much cheaper than opening a shop, so they give young people and small businesses a chance to start their own business. Some successful sellers later open restaurants.\n\nHowever, night markets also create problems. Residents who live nearby sometimes complain about noise and traffic late at night. Large amounts of plastic bags and food boxes are thrown away every evening. In response, some markets now ask sellers to use paper packaging and have added more bins and recycling points.\n\nDespite these challenges, night markets remain one of the best ways to experience the everyday life of a city.",
      keywords: ['stall', 'come to life', 'grilled', 'tradition', 'attraction', 'souvenir', 'bargain', 'economy', 'packaging', 'recycling'],
      questions: [
        { type: 'tfng', q: 'In hot countries, the evening is a comfortable time to shop.', answer: 'TRUE', explain: 'Bài viết: "In hot climates, it makes sense to shop and eat in the evening, when the temperature is lower".' },
        { type: 'tfng', q: 'Food at night markets is usually expensive.', answer: 'FALSE', explain: 'Bài viết nói khách có thể thử nhiều món "often for very low prices" – giá thường rất rẻ.' },
        { type: 'tfng', q: 'Most night markets open every day of the year.', answer: 'NOT GIVEN', explain: 'Bài viết không nói chợ đêm mở bao nhiêu ngày trong năm; chỉ nói với nhiều gia đình, đi chợ đêm là thói quen hằng tuần.' },
        { type: 'mcq', q: 'Why are night markets good for young people who want to start a business?', options: ['They do not have to pay any taxes.', 'Renting a stall costs much less than opening a shop.', 'The government gives them free training.', 'They can sell only food.'], answer: 1, explain: 'Bài viết: "Renting a stall is much cheaper than opening a shop" nên chợ đêm cho người trẻ cơ hội khởi nghiệp. Các phương án khác không được nhắc tới.' },
        { type: 'mcq', q: 'How have some markets responded to the problem of waste?', options: ['By closing earlier at night', 'By banning food sellers', 'By asking sellers to use paper packaging', 'By charging visitors an entry fee'], answer: 2, explain: 'Bài viết: "some markets now ask sellers to use paper packaging and have added more bins and recycling points".' },
      ],
    },
    {
      id: 'learning-apps', title: 'Can an App Teach You a Language?', topic: 'technology', level: 'B1', emoji: '📱',
      summaryVi: 'Ứng dụng học ngoại ngữ giúp luyện tập đều đặn và tiện lợi, nhưng khó thay thế hoàn toàn việc nói chuyện thật; bài viết gợi ý cách kết hợp hiệu quả.',
      text: "Millions of people now use apps on their phones to learn a new language. They complete short lessons on the bus, during their lunch break or just before bed. But can an app really teach you to speak a language?\n\nApps have some clear advantages. They are usually cheap or free, and you can study whenever you have a few minutes. Many apps send reminders and give points or rewards, which encourages users to practise every day. Regular practice is important, because the brain remembers new words better when it sees them several times over a period of days.\n\nApps are especially good for building vocabulary and learning basic grammar. Some also use speech recognition to check your pronunciation.\n\nHowever, there are limits to what an app can do. Real conversations are fast and unpredictable. People speak with different accents, use slang and interrupt each other. An app cannot fully prepare you for this. In addition, some learners collect points every day without making much real progress, because the lessons are too easy for them.\n\nMost teachers believe that the best approach is to combine an app with other activities. You could use the app for ten minutes a day to learn new words, then use them in real situations: chatting with a language partner, watching videos without subtitles or writing short messages. In this way, the app becomes a useful tool rather than the whole course.",
      keywords: ['complete', 'advantage', 'reminder', 'reward', 'encourage', 'vocabulary', 'speech recognition', 'unpredictable', 'accent', 'subtitles'],
      questions: [
        { type: 'tfng', q: 'Language apps are usually cheap or free.', answer: 'TRUE', explain: 'Bài viết: "They are usually cheap or free".' },
        { type: 'tfng', q: 'Apps fully prepare learners for real conversations.', answer: 'FALSE', explain: 'Bài viết: hội thoại thật nhanh và khó đoán, "An app cannot fully prepare you for this".' },
        { type: 'tfng', q: 'Most language app users stop using the app after one month.', answer: 'NOT GIVEN', explain: 'Bài viết không đưa thông tin về việc người dùng bỏ ứng dụng sau bao lâu.' },
        { type: 'mcq', q: 'Why does the writer say regular practice is important?', options: ['Apps give more points for daily practice.', 'The brain remembers words better after seeing them several times over some days.', 'Teachers check the app every day.', 'Lessons become easier every day.'], answer: 1, explain: 'Bài viết: "the brain remembers new words better when it sees them several times over a period of days". Điểm thưởng chỉ là cách ứng dụng khuyến khích, không phải lý do việc luyện đều quan trọng.' },
        { type: 'mcq', q: 'What do most teachers recommend?', options: ['Using an app instead of a teacher', 'Studying only with an app for several hours a day', 'Combining an app with real communication', 'Avoiding apps completely'], answer: 2, explain: 'Bài viết: "the best approach is to combine an app with other activities", ví dụ nói chuyện với bạn học, xem video không phụ đề.' },
      ],
    },
    /* ===================== A2/B1 (bổ sung đợt 3) ===================== */
    {
      id: 'first-job', title: 'My First Part-Time Job', topic: 'work', level: 'A2', emoji: '☕',
      summaryVi: 'Một sinh viên kể về công việc làm thêm đầu tiên ở quán cà phê: những khó khăn ban đầu, kỹ năng học được và lời khuyên cho người mới đi làm.',
      text: "When I was eighteen, I got my first part-time job in a small café near my university. I worked there three evenings a week and on Saturday mornings.\n\nThe first week was very difficult. I had to remember the names of more than twenty drinks, and the coffee machine looked very complicated. On my second day, I gave a customer tea instead of hot chocolate. I felt terrible, but the manager just smiled and said, \"Everyone makes mistakes at the beginning.\"\n\nAfter a month, the job became much easier. I learned how to make drinks quickly, how to use the cash register and how to talk politely to customers, even when they were in a hurry. I also learned to plan my time better, because I had to finish my homework before my evening shifts.\n\nThe money was not very good, but it was enough to pay for my books and my bus pass. The best part of the job was my colleagues. We often had dinner together after work, and some of them are still my good friends today.\n\nMy advice for anyone starting their first job is simple: ask questions when you don't understand something, and don't worry too much about small mistakes.",
      keywords: ['part-time', 'shift', 'complicated', 'customer', 'manager', 'cash register', 'politely', 'in a hurry', 'colleague', 'advice'],
      questions: [
        { type: 'tfng', q: 'The writer worked at the café every evening.', answer: 'FALSE', explain: 'Bài viết: "I worked there three evenings a week and on Saturday mornings" – chỉ ba buổi tối mỗi tuần, không phải tối nào cũng làm.' },
        { type: 'tfng', q: 'The manager was angry about the mistake with the drinks.', answer: 'FALSE', explain: 'Người quản lý "just smiled and said, Everyone makes mistakes at the beginning" – không hề tức giận.' },
        { type: 'tfng', q: 'The café was the most popular one near the university.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói đây là "a small café near my university"; không có thông tin quán có đông khách nhất hay không.' },
        { type: 'mcq', q: 'What did the writer use the money for?', options: ['Rent and food', 'Books and a bus pass', 'A new phone', 'A holiday with friends'], answer: 1, explain: 'Bài viết: tiền lương "was enough to pay for my books and my bus pass". Tiền thuê nhà, điện thoại hay kỳ nghỉ không được nhắc tới.' },
        { type: 'mcq', q: 'What does the writer say was the best part of the job?', options: ['The money', 'The free drinks', 'The colleagues', 'The short hours'], answer: 2, explain: 'Bài viết: "The best part of the job was my colleagues". Tác giả còn nói lương "not very good", nên phương án tiền lương sai.' },
      ],
    },
    {
      id: 'home-recycling', title: 'Recycling Starts at Home', topic: 'environment', level: 'A2', emoji: '♻️',
      summaryVi: 'Hướng dẫn phân loại rác tại nhà: giấy, nhựa, kim loại, thủy tinh và rác hữu cơ; vì sao cần rửa sạch vật dụng và những thứ không nên bỏ vào thùng tái chế.',
      text: "Many cities now ask people to separate their rubbish at home. This helps more materials to be recycled instead of going to landfill. But what should go in each bin?\n\nPaper and cardboard are usually easy to recycle. Newspapers, cereal boxes and old letters can all go in the paper bin. However, paper that is dirty with food, such as a pizza box with oil on it, should go in the normal rubbish.\n\nMany plastic bottles and food containers can be recycled too, but they need to be empty and clean. A quick rinse with water is usually enough. Metal cans and glass jars are also accepted in most places. Remember to take off the lids first, because they are often made of a different material.\n\nFood waste, such as fruit peel and vegetable leftovers, can be collected separately in some cities. It is turned into compost, which farmers and gardeners use to help plants grow.\n\nSome things should never go in a recycling bin. Batteries, light bulbs and old phones can be dangerous and need special collection points. Many supermarkets have boxes for batteries near the entrance.\n\nIt can take a few weeks to get used to sorting your rubbish, but after that it becomes a normal habit.",
      keywords: ['separate', 'landfill', 'cardboard', 'container', 'rinse', 'jar', 'lid', 'leftovers', 'compost', 'collection point'],
      questions: [
        { type: 'tfng', q: 'A pizza box with oil on it should go in the paper bin.', answer: 'FALSE', explain: 'Bài viết: giấy bẩn dính thức ăn "such as a pizza box with oil on it, should go in the normal rubbish" – phải bỏ vào rác thường.' },
        { type: 'tfng', q: 'Plastic bottles should be cleaned before they are recycled.', answer: 'TRUE', explain: 'Bài viết: chai nhựa "need to be empty and clean. A quick rinse with water is usually enough".' },
        { type: 'tfng', q: 'All cities collect food waste separately.', answer: 'FALSE', explain: 'Bài viết: rác thực phẩm được thu gom riêng "in some cities" – chỉ ở một số thành phố, không phải tất cả.' },
        { type: 'mcq', q: 'Why should you take the lids off jars?', options: ['They are too heavy.', 'They are often made of a different material.', 'They can be used again at home.', 'They are dangerous.'], answer: 1, explain: 'Bài viết: "take off the lids first, because they are often made of a different material". Các lý do khác không được nhắc tới.' },
        { type: 'mcq', q: 'Where can you often take old batteries?', options: ['To the paper bin', 'To the normal rubbish', 'To boxes in many supermarkets', 'To any recycling bin'], answer: 2, explain: 'Bài viết: "Many supermarkets have boxes for batteries near the entrance". Pin không bao giờ được bỏ vào thùng tái chế hay rác thường vì có thể nguy hiểm.' },
      ],
    },
    {
      id: 'learning-to-swim', title: 'Learning to Swim as an Adult', topic: 'sport', level: 'A2', emoji: '🏊',
      summaryVi: 'Nhiều người lớn chưa biết bơi vì ngại hoặc sợ nước; bài viết chia sẻ lợi ích của việc học bơi và cách bắt đầu từ từ để tự tin hơn.',
      text: "Not everyone learns to swim as a child. Some people grew up far from the sea or a swimming pool, and others had a bad experience in the water when they were young. As adults, many of them feel embarrassed to start.\n\nHowever, it is never too late to learn. Swimming is a useful life skill, and it is also excellent exercise. It works almost every muscle in the body, but it is gentle on the knees and back, so it is suitable for people of all ages.\n\nMany swimming pools offer special classes for adult beginners. These classes are usually small, and the teachers understand that some students are nervous. In the first lessons, students often stay in the shallow end of the pool. They practise breathing out under the water and floating on their backs before they try to swim any distance.\n\nProgress can be slow at first, and that is normal. Instructors say the most important thing is to come regularly, for example once or twice a week. Many adult learners say that they feel proud and more confident after a few months, not only in the water but also in other parts of their lives.\n\nIf you would like to learn, start by asking at your local pool. You might be surprised how many other adults are learning too.",
      keywords: ['embarrassed', 'life skill', 'muscle', 'gentle', 'beginner', 'nervous', 'shallow', 'float', 'instructor', 'confident'],
      questions: [
        { type: 'tfng', q: 'Some adults cannot swim because they had a bad experience in the water as children.', answer: 'TRUE', explain: 'Bài viết: "others had a bad experience in the water when they were young".' },
        { type: 'tfng', q: 'Swimming is bad for people with knee problems.', answer: 'FALSE', explain: 'Bài viết: bơi "is gentle on the knees and back, so it is suitable for people of all ages" – nhẹ nhàng với đầu gối.' },
        { type: 'tfng', q: 'Adult swimming classes are cheaper than children\'s classes.', answer: 'NOT GIVEN', explain: 'Bài viết không so sánh học phí giữa lớp người lớn và lớp trẻ em.' },
        { type: 'mcq', q: 'What do students usually do in their first lessons?', options: ['Swim long distances', 'Practise breathing and floating in the shallow end', 'Dive from the side of the pool', 'Take a swimming test'], answer: 1, explain: 'Bài viết: học viên ở "the shallow end of the pool", tập thở ra dưới nước và nổi ngửa "before they try to swim any distance". Bơi xa, nhảy cầu, thi bơi không được nhắc tới.' },
        { type: 'mcq', q: 'According to instructors, what is the most important thing?', options: ['Buying good equipment', 'Learning quickly', 'Coming to lessons regularly', 'Swimming every day'], answer: 2, explain: 'Bài viết: "the most important thing is to come regularly, for example once or twice a week". Không cần bơi mỗi ngày hay học nhanh; tiến bộ chậm lúc đầu là bình thường.' },
      ],
    },
    {
      id: 'volunteering', title: 'Why People Volunteer', topic: 'society', level: 'B1', emoji: '🤝',
      summaryVi: 'Vì sao nhiều người dành thời gian làm tình nguyện: giúp cộng đồng, học kỹ năng mới, gặp gỡ bạn bè và cải thiện sức khỏe tinh thần; kèm lời khuyên chọn hoạt động phù hợp.',
      text: "Every weekend, millions of people around the world give their time for free. They clean beaches, help in hospitals, teach children to read or cook meals for people who are homeless. Why do they do it?\n\nThe most common reason is simple: people want to help others and to make their community a better place. Many volunteers say that they feel they are giving something back, especially if they once received help themselves.\n\nVolunteering can also be useful for the volunteers. Young people often gain skills and experience that look good on a job application, such as teamwork, organisation and communication. Some organisations even provide training, for example in first aid.\n\nThere are social benefits, too. Volunteering is a good way to meet people with similar interests, which can be especially valuable for someone who has just moved to a new city or retired from work.\n\nFinally, several studies have found that people who volunteer regularly tend to report higher levels of happiness. Researchers think this may be because helping others gives people a sense of purpose, although they point out that happier people may also be more likely to volunteer in the first place.\n\nIf you are thinking about volunteering, choose something that matches your interests and the time you really have. It is better to give two hours a month for a year than ten hours a week for only a few weeks.",
      keywords: ['volunteer', 'homeless', 'community', 'give something back', 'gain', 'application', 'organisation', 'retire', 'sense of purpose', 'in the first place'],
      questions: [
        { type: 'tfng', q: 'Most volunteers say their main reason is to help other people.', answer: 'TRUE', explain: 'Bài viết: "The most common reason is simple: people want to help others and to make their community a better place".' },
        { type: 'tfng', q: 'All volunteer organisations provide first aid training.', answer: 'FALSE', explain: 'Bài viết: "Some organisations even provide training" – chỉ một số tổ chức, không phải tất cả.' },
        { type: 'tfng', q: 'Researchers are sure that volunteering makes people happier.', answer: 'FALSE', explain: 'Bài viết nói các nhà nghiên cứu "think this may be because…" và lưu ý người vốn đã hạnh phúc có thể dễ đi tình nguyện hơn – họ không chắc chắn về quan hệ nhân quả.' },
        { type: 'mcq', q: 'Why might volunteering be especially valuable for someone who has just retired?', options: ['It pays a small salary.', 'It is a way to meet people with similar interests.', 'It helps them find a new job.', 'It is required by law.'], answer: 1, explain: 'Bài viết: tình nguyện là cách "to meet people with similar interests, which can be especially valuable for someone who has just moved… or retired". Tình nguyện không được trả lương và không bắt buộc.' },
        { type: 'mcq', q: 'What advice does the writer give at the end?', options: ['Volunteer as many hours as possible.', 'Only volunteer in hospitals.', 'Choose an activity that fits your interests and available time.', 'Volunteer only when you are young.'], answer: 2, explain: 'Bài viết: "choose something that matches your interests and the time you really have", và làm đều đặn ít giờ tốt hơn làm nhiều trong vài tuần – trái với phương án "càng nhiều giờ càng tốt".' },
      ],
    },
    {
      id: 'why-we-dream', title: 'Why Do We Dream?', topic: 'science', level: 'B1', emoji: '🌙',
      summaryVi: 'Giấc mơ thường xuất hiện trong giai đoạn ngủ REM; các nhà khoa học đưa ra nhiều giả thuyết về chức năng của giấc mơ nhưng chưa có câu trả lời chắc chắn.',
      text: "Almost everyone dreams, even people who say they never do. The difference is that some people remember their dreams and others forget them within minutes of waking up.\n\nScientists know that many of our most vivid dreams happen during a stage of sleep called REM sleep. REM stands for \"rapid eye movement\", because during this stage our eyes move quickly behind our closed eyelids. Our brain is very active during REM sleep, but most of the muscles in our body are relaxed and cannot move. Many researchers believe this stops us from acting out our dreams.\n\nBut why do we dream at all? There is still no single answer. One popular idea is that dreams help the brain to process memories and emotions from the day. Another suggests that dreams allow us to practise reacting to difficult situations in a safe way. A third theory says that dreams may simply be a side effect of the brain's activity during sleep, with no special purpose.\n\nWhat scientists do agree on is that good sleep is important for both the body and the mind. Adults who regularly sleep too little often find it harder to concentrate and control their mood.\n\nSo, the next time you have a strange dream, you can enjoy the mystery. Even the experts are still trying to understand it.",
      keywords: ['vivid', 'stage', 'rapid', 'eyelid', 'relaxed', 'act out', 'process', 'emotion', 'side effect', 'mystery'],
      questions: [
        { type: 'tfng', q: 'People who say they never dream probably do dream but forget it.', answer: 'TRUE', explain: 'Bài viết: "Almost everyone dreams, even people who say they never do" – khác biệt là có người quên giấc mơ ngay sau khi thức dậy.' },
        { type: 'tfng', q: 'During REM sleep, the brain is not very active.', answer: 'FALSE', explain: 'Bài viết: "Our brain is very active during REM sleep" – não hoạt động mạnh, chỉ có cơ bắp là thả lỏng.' },
        { type: 'tfng', q: 'Children dream more often than adults.', answer: 'NOT GIVEN', explain: 'Bài viết không so sánh tần suất mơ giữa trẻ em và người lớn.' },
        { type: 'mcq', q: 'What do many researchers believe is the purpose of relaxed muscles during REM sleep?', options: ['To help us breathe more slowly', 'To stop us from acting out our dreams', 'To help us remember dreams', 'To make our eyes move quickly'], answer: 1, explain: 'Bài viết: cơ bắp thả lỏng, không cử động được, và "this stops us from acting out our dreams". Các phương án khác không được nhắc tới hoặc nhầm với chuyển động của mắt.' },
        { type: 'mcq', q: 'What does the text say about the reason why we dream?', options: ['Scientists have proved that dreams process memories.', 'There are several theories but no single answer.', 'Dreams have no purpose at all.', 'Dreams only happen when we are stressed.'], answer: 1, explain: 'Bài viết: "There is still no single answer" rồi nêu ba giả thuyết. Ý "xử lý ký ức" và "không có mục đích" chỉ là các giả thuyết, chưa được chứng minh.' },
      ],
    },
  );
})(typeof self !== 'undefined' ? self : this);
