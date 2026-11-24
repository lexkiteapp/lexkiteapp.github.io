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
      summaryEn: 'About a third of the world\'s food is wasted; the article explains the causes, the harm to the environment and the small habits that help reduce waste.',
      text: `Every year, people around the world throw away a huge amount of food. Experts say that about one third of all the food we produce is never eaten. Some of it is lost on farms or during transport, but a large part is wasted in our own homes.

Why does this happen? One common reason is that people buy too much. When food is on special offer in the supermarket, it is easy to fill the basket with more than we need. Another reason is confusion about the dates on packets. Many people think that food must go in the bin after its "best before" date, but this date is only about quality, not safety. Food is often still good to eat after it.

Food waste is also a problem for the environment. When old food goes to a landfill, it slowly breaks down and produces gases that make the planet warmer. In addition, a lot of water, energy and land was used to grow the food in the first place, so all of these resources are wasted too.

The good news is that small changes can help. Before going shopping, you can check your fridge and write a list. You can keep leftovers in a box and eat them the next day. Some families freeze bread and fruit so that they last longer. In several countries, there are now apps that let shops and cafés sell unsold meals cheaply at the end of the day.

If everyone wasted a little less, the total amount would fall a lot. And there is one more reason to try: saving food also means saving money.`,
      keywords: ['amount', 'produce', 'transport', 'quality', 'safety', 'environment', 'landfill', 'resources', 'confusion', 'freeze'],
      questions: [
        { type: 'tfng', q: 'About one third of the food produced in the world is never eaten.', answer: 'TRUE', explain: 'Bài viết: "about one third of all the food we produce is never eaten" → TRUE.' },
        { type: 'tfng', q: 'The "best before" date tells you when food becomes dangerous to eat.', answer: 'FALSE', explain: 'Bài viết nói ngày "best before" chỉ liên quan đến chất lượng: "this date is only about quality, not safety" → FALSE.' },
        { type: 'tfng', q: 'Supermarkets in most countries give unsold food to poor families.', answer: 'NOT GIVEN', explain: 'Bài chỉ nhắc đến ứng dụng giúp cửa hàng bán rẻ đồ ăn còn thừa, không nói siêu thị tặng thực phẩm cho gia đình nghèo → NOT GIVEN.' },
        { type: 'mcq', q: 'According to the text, why do people often buy too much food?', options: ['They cook hot meals only on weekends.', 'Food delivery apps are too convenient.', 'Food is on special offer in the supermarket.', 'Local supermarkets close earlier than usual.'], answer: 2, explain: 'Bài đọc giải thích rằng mọi người hay mua quá nhiều khi thực phẩm có chương trình giảm giá đặc biệt (on special offer). Các yếu tố như thói quen nấu ăn hay thời gian đóng cửa của siêu thị không phải là nguyên nhân được tác giả đề cập.' },
        { type: 'mcq', q: 'Which tip is NOT mentioned in the text?', options: ['Checking the fridge before shopping', 'Freezing bread and fruit', 'Eating leftovers the next day', 'Growing vegetables at home'], answer: 3, explain: 'Bài có nhắc kiểm tra tủ lạnh, cấp đông bánh mì và trái cây, ăn đồ thừa hôm sau; không hề nói đến việc tự trồng rau → đáp án đúng: Growing vegetables at home.' },
      ],
    },
    {
      id: 'citizen-science',
      title: 'Science for Everyone: Citizen Scientists',
      topic: 'science',
      level: 'A2',
      emoji: '🔭',
      summaryVi: 'Người bình thường có thể giúp các nhà khoa học đếm chim, phân loại thiên hà hay ghi lại thời tiết – đó là khoa học công dân, với nhiều kết quả thật và lợi ích cho cả người tham gia.',
      summaryEn: 'Ordinary people can help scientists count birds, classify galaxies or record the weather – this is citizen science, with many real results and benefits for the volunteers too.',
      text: `You do not need a laboratory or a university degree to help scientists. Today, thousands of ordinary people take part in research projects in their free time. This is called citizen science.

The idea is simple. Scientists often need to collect a lot of information, but they do not have enough time or staff to do it alone. Volunteers can help by counting birds in their garden, taking photos of insects or measuring rainfall. Many projects use a mobile phone app, so people can send their results in a few seconds.

Some projects do not even require you to go outside. On certain websites, volunteers look at pictures of distant galaxies and sort them into groups. Others read old handwritten weather records so that the data can be stored on computers. Computers are fast, but people are still better at some tasks, such as noticing unusual shapes.

Citizen science has already produced real results. Volunteers have discovered new planets, found rare plants and helped scientists understand how animals move when the climate changes. In one bird count, families recorded which birds visited their gardens over a single weekend, and the results showed that some species were becoming less common.

There are benefits for the volunteers too. Many say that they learn new skills and feel more connected to nature. Children who join projects often become more interested in science at school.

Of course, there are some challenges. Volunteers sometimes make mistakes, so scientists must check the data carefully. Even so, most researchers agree that citizen science is a valuable way to involve the public in discovery.`,
      keywords: ['research', 'collect', 'volunteers', 'require', 'data', 'climate', 'species', 'valuable', 'involve', 'discovery'],
      questions: [
        { type: 'tfng', q: 'Citizen scientists need a university degree.', answer: 'FALSE', explain: 'Ngay câu đầu: "You do not need a laboratory or a university degree to help scientists" → FALSE.' },
        { type: 'tfng', q: 'Volunteers have helped to discover new planets.', answer: 'TRUE', explain: 'Bài viết: "Volunteers have discovered new planets" → TRUE.' },
        { type: 'tfng', q: 'Most citizen science projects pay volunteers a small fee.', answer: 'NOT GIVEN', explain: 'Bài không nói gì về việc trả tiền cho tình nguyện viên → NOT GIVEN.' },
        { type: 'mcq', q: 'Why do scientists need help from volunteers?', options: ['They do not have enough time or staff to collect all the information.', 'Computers are unable to process large volumes of observational data.', 'Volunteers sometimes submit incorrect data, so scientists must carefully review each entry.', 'Universities have reduced research funding, limiting laboratory availability for large projects.'], answer: 0, explain: 'Bài viết: scientists "do not have enough time or staff to do it alone".' },
        { type: 'mcq', q: 'What must scientists do because volunteers sometimes make mistakes?', options: ['Stop using mobile apps', 'Check the data carefully', 'Only work with children', 'Pay for extra training'], answer: 1, explain: 'Bài viết: "Volunteers sometimes make mistakes, so scientists must check the data carefully" → đáp án đúng: Check the data carefully.' },
      ],
    },
    {
      id: 'remote-work',
      title: 'Working from Home: The New Normal?',
      topic: 'work',
      level: 'B1',
      emoji: '💻',
      summaryVi: 'Làm việc từ xa giúp tiết kiệm thời gian đi lại và linh hoạt hơn, nhưng cũng gây cô đơn và khó tách công việc khỏi đời sống riêng; mô hình kết hợp đang trở nên phổ biến.',
      summaryEn: 'Remote working saves commuting time and offers more flexibility, but it can also cause loneliness and make it hard to separate work from private life; hybrid models are becoming common.',
      text: `Not long ago, working from home was a rare privilege. Most employees travelled to an office every morning and returned in the evening. In recent years, however, remote work has become normal for millions of people, thanks to fast internet connections and online meeting tools.

For many workers, the biggest advantage is time. Without a daily commute, they can save an hour or more each day, which they may spend with their families, doing exercise or simply sleeping longer. Remote work also gives people more flexibility. Parents can collect their children from school, and people who live far from big cities can apply for jobs that were once out of reach.

Employers can benefit as well. Some companies have moved to smaller offices and reduced their costs. Several surveys suggest that many staff are just as productive at home, and in some cases more productive, because there are fewer interruptions.

However, working from home is not perfect. Some people find it hard to separate their job from their private life, especially if they work at the kitchen table. They may answer emails late at night and feel that they are never really off duty. Others feel lonely and miss chatting with colleagues. Managers also worry that new employees learn more slowly when they cannot watch experienced staff at work.

Because of these problems, many organisations now use a hybrid model. Employees spend part of the week in the office for meetings and teamwork, and the rest at home for tasks that need concentration. This approach seems to combine the best of both worlds, although it requires careful planning.

In the end, remote work is likely to remain part of modern life. The challenge is to make sure that it supports both the company and the wellbeing of its workers.`,
      keywords: ['privilege', 'employees', 'commute', 'flexibility', 'productive', 'remote', 'colleagues', 'separate', 'concentration', 'approach', 'surveys'],
      questions: [
        { type: 'tfng', q: 'Working from home used to be common for most employees.', answer: 'FALSE', explain: 'Bài viết: "Not long ago, working from home was a rare privilege" – trước đây đó là đặc quyền hiếm hoi → FALSE.' },
        { type: 'tfng', q: 'Some surveys suggest that people working at home can be more productive.', answer: 'TRUE', explain: 'Bài viết: many staff are "just as productive at home, and in some cases more productive" → TRUE.' },
        { type: 'tfng', q: 'Most companies plan to close their offices completely.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói một số công ty chuyển sang văn phòng nhỏ hơn, không nhắc đến việc đóng cửa hoàn toàn → NOT GIVEN.' },
        { type: 'mcq', q: 'Which problem of remote work is mentioned in the text?', options: ['Commuting costs increase significantly for remote employees.', 'Office buildings are completely shut down by modern employers.', 'Workers waste valuable time attending unnecessary team meetings.', 'Some people find it hard to separate work from private life.'], answer: 3, explain: 'Đoạn 4 nêu rõ một điểm bất lợi là một số người cảm thấy khó tách biệt công việc với cuộc sống riêng tư khi làm việc tại nhà.' },
        { type: 'mcq', q: 'What is a hybrid model?', options: ['Allowing two colleagues to share one specific position and salary', 'Spending part of the week in the office and the rest at home', 'Working exclusively during evening hours to maintain flexibility', 'Handling tasks entirely online for employers based in other regions'], answer: 1, explain: 'Theo bài đọc, mô hình kết hợp (hybrid model) là việc nhân viên làm việc một phần thời gian trong tuần tại văn phòng và phần còn lại ở nhà ("spend part of the week in the office... and the rest at home").' },
      ],
    },
    {
      id: 'minimalism',
      title: 'Living with Less',
      topic: 'lifestyle',
      level: 'B1',
      emoji: '🪴',
      summaryVi: 'Lối sống tối giản – sở hữu ít đồ hơn – mang lại lợi ích về tiền bạc, tinh thần và môi trường, nhưng cũng bị phê phán là dễ dàng hơn với người giàu.',
      summaryEn: 'Minimalism – owning fewer things – brings financial, mental and environmental benefits, but it is also criticised as easier for the wealthy.',
      text: `Walk into the home of a minimalist and you may be surprised by how empty it looks. There might be a sofa, a table and a few books, but very little else. Minimalism is a lifestyle based on owning fewer things and focusing on what really matters.

The idea is not new. Many philosophers and religious traditions have taught that happiness does not come from possessions. However, minimalism has become especially popular in the last decade. Books and online videos show people clearing out their wardrobes and giving away boxes of items they no longer use.

Supporters say the benefits are both practical and emotional. A home with fewer objects is quicker to clean and easier to organise. People who buy less often save money, and some use these savings to travel or pay off debts. Many minimalists also report feeling calmer, because they spend less time looking after their belongings and less energy deciding what to buy.

There may be environmental benefits too. If people buy fewer products, factories need fewer raw materials, and less rubbish is created. Some minimalists choose to repair old items instead of replacing them, which helps to reduce waste.

Critics, however, point out some problems. They argue that minimalism can be easier for wealthy people, who can afford to throw things away and buy them again later if necessary. For families with low incomes, keeping extra items may be a sensible way to prepare for the future. Others feel that the style can become a fashion in itself, with people spending large sums on expensive "simple" furniture.

Perhaps the most useful lesson of minimalism is not to own as little as possible, but to think carefully before each purchase. Asking "Do I really need this?" can help anyone make wiser choices.`,
      keywords: ['lifestyle', 'possessions', 'emotional', 'organise', 'debts', 'decade', 'raw', 'repair', 'wealthy', 'traditions', 'purchase'],
      questions: [
        { type: 'tfng', q: 'Minimalism is a completely new idea.', answer: 'FALSE', explain: 'Bài viết: "The idea is not new" – nhiều triết gia và truyền thống tôn giáo đã nói điều này từ lâu → FALSE.' },
        { type: 'tfng', q: 'Some minimalists say that they feel calmer.', answer: 'TRUE', explain: 'Bài viết: "Many minimalists also report feeling calmer" → TRUE.' },
        { type: 'tfng', q: 'Minimalists usually live in smaller homes than other people.', answer: 'NOT GIVEN', explain: 'Bài không so sánh diện tích nhà của người theo lối sống tối giản với người khác → NOT GIVEN.' },
        { type: 'mcq', q: 'Why do critics say minimalism can be easier for wealthy people?', options: ['They have enough space to store items until they are needed.', 'They can hire professional cleaners to organise their belongings.', 'They can afford to throw things away and buy them again later.', 'They spend much less time worrying about their monthly expenses.'], answer: 2, explain: 'Đoạn văn nêu rõ những người giàu có "can afford to throw things away and buy them again later if necessary", trong khi các phương án khác chỉ nêu suy đoán sai về diện tích nhà hay chi phí dọn dẹp.' },
        { type: 'mcq', q: 'What does the writer see as the most useful lesson of minimalism?', options: ['Thinking carefully before each purchase', 'Owning as few physical items as possible', 'Spending large sums on simple furniture', 'Repairing damaged goods to prevent waste'], answer: 0, explain: 'Đoạn cuối nêu rõ bài học hữu ích nhất là \'think carefully before each purchase\' thay vì sở hữu ít đồ nhất có thể (owning as few items as possible).' },
      ],
    },
    {
      id: 'fast-fashion',
      title: 'The Hidden Cost of Cheap Clothes',
      topic: 'environment',
      level: 'B1',
      emoji: '👕',
      summaryVi: 'Thời trang nhanh giúp quần áo rẻ và hợp mốt, nhưng phải trả giá về nước, ô nhiễm, điều kiện lao động và lượng rác dệt may khổng lồ.',
      summaryEn: 'Fast fashion makes clothes cheap and trendy, but the price is paid in water use, pollution, working conditions and huge amounts of textile waste.',
      text: `A T-shirt that costs less than a sandwich sounds like a great deal. In the past twenty years, clothing has become cheaper and faster to produce than ever before. Large brands now release new designs every few weeks, encouraging shoppers to buy more often. This business model is known as fast fashion.

For consumers, the attraction is clear. Fast fashion allows people to follow the latest trends without spending much money. However, the low price on the label hides a number of other costs.

The first is environmental. The fashion industry uses enormous quantities of water; growing the cotton for a single pair of jeans can require thousands of litres. Dyeing fabric can pollute rivers if factories do not treat their wastewater. In addition, many cheap garments are made from synthetic materials such as polyester, which is produced from oil and sheds tiny fibres when it is washed.

The second cost is human. To keep prices low, some brands rely on factories where workers earn very low wages and work long hours. Safety standards in some buildings have been poor, and serious accidents have drawn global attention to the issue.

Finally, there is the problem of what happens to unwanted clothes. Because cheap items are often worn only a few times, a huge amount ends up in landfill or is shipped abroad. Only a small proportion of textiles is recycled into new clothing.

Some changes are taking place. Second-hand shopping has become fashionable among young people, and a number of brands now offer repair services or collect old garments. Shoppers can also help by choosing quality over quantity and asking where and how their clothes are made.`,
      keywords: ['consumers', 'trends', 'enormous', 'pollute', 'garments', 'fabric', 'wages', 'standards', 'proportion', 'textiles', 'recycled'],
      questions: [
        { type: 'tfng', q: 'Large fast-fashion brands release new designs only once a year.', answer: 'FALSE', explain: 'Bài viết: "Large brands now release new designs every few weeks" → FALSE.' },
        { type: 'tfng', q: 'Polyester is made from oil.', answer: 'TRUE', explain: 'Bài viết: polyester "is produced from oil" → TRUE.' },
        { type: 'tfng', q: 'Most second-hand shops are run by charities.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói mua đồ cũ trở nên thời thượng với giới trẻ, không nhắc ai điều hành các cửa hàng đó → NOT GIVEN.' },
        { type: 'mcq', q: 'According to the text, why might dyeing fabric harm rivers?', options: ['Synthetic fibres are washed into the sea.', 'Growing raw cotton consumes lots of water.', 'Old garments are discarded in landfills.', 'Factories may not treat their wastewater.'], answer: 3, explain: 'Bài viết nêu rõ: "Dyeing fabric can pollute rivers if factories do not treat their wastewater" (việc nhuộm vải gây ô nhiễm sông ngòi nếu nhà máy không xử lý nước thải).' },
        { type: 'mcq', q: 'What happens to many cheap clothes after they are worn a few times?', options: ['They are usually recycled into high-quality textiles.', 'They end up in landfill or are shipped abroad.', 'They are cleaned and returned to the retail stores.', 'They are collected by manufacturers for free repairs.'], answer: 1, explain: 'Đoạn 5 nêu rõ: "a huge amount ends up in landfill or is shipped abroad" sau khi chỉ được mặc vài lần; việc tái chế hay sửa chữa chỉ chiếm tỉ lệ rất nhỏ hoặc mới bắt đầu xuất hiện.' },
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
      summaryEn: 'The app-based gig economy offers flexibility but lacks insurance, pensions and a stable income; governments are looking for a balance between efficiency and protection for workers.',
      text: `In many cities, the person who delivers your dinner, drives you home or assembles your new furniture may not be an employee of any company. Instead, they are likely to be part of the so-called gig economy, in which individuals take on short-term tasks through digital platforms and are paid separately for each job.

Advocates of this model emphasise its flexibility. Workers can, in theory, choose when and how much they work, logging on to an app for a few hours in the evening or at weekends. For students, carers and people seeking a second source of income, this freedom can be extremely valuable. Platforms also lower the barriers to entering the labour market: a person with a bicycle and a smartphone can begin earning almost immediately, without a formal interview.

Yet the arrangement has attracted growing criticism. Because most gig workers are classified as self-employed contractors rather than employees, they are generally not entitled to sick pay, holiday pay or a pension. Their income can be highly unpredictable, rising and falling with customer demand, the weather and changes to the app's pricing. Critics also point out that the flexibility may be less real than it seems. Algorithms often reward workers who accept every job and penalise those who decline, which puts pressure on drivers and couriers to remain online for long periods.

Governments have responded in different ways. Courts in several countries have ruled that some platform workers should be treated as employees, giving them the right to a minimum wage. Other policymakers favour a third category, which would offer basic protections while preserving the independence that many workers say they value. Platforms, for their part, argue that strict regulation would raise prices for consumers and reduce the number of available jobs.

The debate reflects a wider question about the future of work. As technology makes it easier to divide labour into small, separate tasks, societies must decide how to balance economic efficiency with security for the people who perform those tasks. There is unlikely to be a single solution, but the outcome will shape the working lives of millions.`,
      keywords: ['platforms', 'flexibility', 'income', 'barriers', 'contractors', 'entitled', 'pension', 'advocates', 'algorithms', 'regulation', 'efficiency'],
      questions: [
        { type: 'tfng', q: 'Gig workers are paid separately for each task.', answer: 'TRUE', explain: 'Bài viết: individuals "are paid separately for each job" → TRUE.' },
        { type: 'tfng', q: 'Most gig workers receive holiday pay.', answer: 'FALSE', explain: 'Bài viết: gig workers "are generally not entitled to sick pay, holiday pay or a pension" → FALSE.' },
        { type: 'tfng', q: 'The majority of gig workers are university students.', answer: 'NOT GIVEN', explain: 'Bài chỉ nêu sinh viên là một nhóm có thể hưởng lợi, không cho biết tỉ lệ sinh viên trong lực lượng này → NOT GIVEN.' },
        { type: 'mcq', q: 'Why might the flexibility of gig work be "less real than it seems"?', options: ['Platforms restrict working shifts to specific evening hours.', 'Workers are required to complete demanding formal interviews.', 'Algorithms may penalise workers who decline jobs.', 'Regulations limit the number of hours contractors can log on.'], answer: 2, explain: 'Tác giả chỉ ra tính linh hoạt bị hạn chế vì thuật toán thưởng cho người nhận việc và phạt người từ chối ("penalise those who decline"), chứ không phải do luật pháp giới hạn giờ làm hay thủ tục phỏng vấn.' },
        { type: 'mcq', q: 'What do platforms argue about strict regulation?', options: ['It would raise prices and reduce the number of available jobs.', 'It would decrease worker flexibility and lower consumer demand.', 'It would harm platform profits and eliminate digital contracts.', 'It would create unfair competition and discourage innovation.'], answer: 0, explain: 'Bài đọc nêu rõ các nền tảng lập luận rằng quy định nghiêm ngặt \'would raise prices for consumers and reduce the number of available jobs\'.' },
      ],
    },
    {
      id: 'coral-restoration',
      title: 'Can We Rebuild Coral Reefs?',
      topic: 'environment',
      level: 'B2',
      emoji: '🪸',
      summaryVi: 'Rạn san hô đang suy giảm nghiêm trọng do nước biển nóng lên; các nhà khoa học thử trồng, nhân giống và “gọi cá” về rạn, nhưng giải pháp gốc rễ vẫn là cắt giảm khí thải.',
      summaryEn: 'Coral reefs are declining sharply as the sea warms; scientists are trying to plant and breed coral and to "call" fish back to the reefs, but the root solution is still cutting emissions.',
      text: `Coral reefs cover less than one per cent of the ocean floor, yet they support around a quarter of all marine species. They also protect coastlines from storms and provide food and income for hundreds of millions of people. Unfortunately, reefs are in serious decline, and scientists are now experimenting with ways to help them recover.

The main threat is rising sea temperature. Corals live in partnership with tiny algae that supply them with energy and give them their colour. When the water becomes too warm for a prolonged period, the corals expel the algae and turn white, a process known as bleaching. If temperatures return to normal quickly, the coral may survive; if not, it often dies. Pollution, overfishing and damage from boats and anchors add further pressure.

One of the most common restoration methods is coral gardening. Divers collect small fragments of healthy coral and grow them on underwater frames or ropes, where they are protected and monitored. Once the fragments have grown large enough, they are transplanted onto damaged sections of reef. Some projects have also discovered that breaking coral into very small pieces can make it grow much faster than normal, a technique called micro-fragmenting.

Other researchers are trying to breed corals that can tolerate higher temperatures. By selecting colonies that survived previous heatwaves and crossing them in laboratories, they hope to produce offspring that are more resilient. Some teams are even using underwater speakers to play the sounds of a healthy reef, which appears to attract young fish to degraded areas.

Despite these innovations, many marine biologists warn that restoration alone cannot save reefs. The area that can realistically be replanted is tiny compared with the scale of the damage, and restored coral will still be vulnerable if the oceans continue to warm. In their view, restoration should be seen as a way of buying time, while the fundamental solution lies in cutting greenhouse gas emissions.

Nevertheless, restoration projects offer real local benefits, such as supporting tourism and fisheries, and they raise public awareness. For communities that depend on reefs, even small successes can make a significant difference.`,
      keywords: ['marine', 'decline', 'threat', 'bleaching', 'fragments', 'monitored', 'offspring', 'resilient', 'restoration', 'vulnerable', 'fundamental', 'emissions'],
      questions: [
        { type: 'tfng', q: 'Coral reefs cover about a quarter of the ocean floor.', answer: 'FALSE', explain: 'Rạn san hô chỉ chiếm "less than one per cent of the ocean floor"; con số một phần tư là tỉ lệ loài sinh vật biển mà chúng nuôi dưỡng → FALSE.' },
        { type: 'tfng', q: 'Bleaching happens when corals expel the algae that live with them.', answer: 'TRUE', explain: 'Bài viết: "the corals expel the algae and turn white, a process known as bleaching" → TRUE.' },
        { type: 'tfng', q: 'Micro-fragmenting has been banned in some countries.', answer: 'NOT GIVEN', explain: 'Bài chỉ giới thiệu kỹ thuật micro-fragmenting, không nói nước nào cấm → NOT GIVEN.' },
        { type: 'mcq', q: 'What is the purpose of playing reef sounds underwater?', options: ['To warn marine animals about approaching boats', 'To measure changes in surrounding water depths', 'To attract young fish to degraded areas', 'To help researchers communicate with divers'], answer: 2, explain: 'Bài viết: việc phát âm thanh của rạn san hô khỏe mạnh "appears to attract young fish to degraded areas" → đáp án đúng: To attract young fish to degraded areas.' },
        { type: 'mcq', q: 'What do many marine biologists believe?', options: ['Breeding programs alone will fully safeguard reefs against warming.', 'Coral gardening is far too costly and impractical to be maintained.', 'Ocean acidification no longer represents an active danger to corals.', 'Restoration buys time, but cutting emissions is the real solution.'], answer: 3, explain: 'Đoạn 5 khẳng định các nhà sinh học cảnh báo phục hồi san hô chỉ là giải pháp tạm thời ("buying time"), trong khi giải pháp căn cốt là cắt giảm khí thải nhà kính.' },
      ],
    },
    {
      id: 'sports-psychology',
      title: 'Winning in the Mind: Sports Psychology',
      topic: 'sport',
      level: 'B2',
      emoji: '🏅',
      summaryVi: 'Ở đỉnh cao thể thao, yếu tố tâm lý thường quyết định thắng thua: hình dung, kiểm soát lo âu, tự nhủ tích cực, động lực và sức khỏe tinh thần.',
      summaryEn: 'At the top level of sport, the mental side often decides who wins: visualisation, controlling anxiety, positive self-talk, motivation and mental health.',
      text: `At the highest level of sport, the physical differences between competitors are often extremely small. Elite athletes train for similar hours, follow similar diets and use similar equipment. What frequently separates a champion from the rest of the field is not strength or speed, but mental preparation. This is the territory of sports psychology.

One of the most widely used techniques is visualisation. Before a race or match, athletes imagine themselves performing each movement successfully, often in great detail. Research suggests that this mental rehearsal activates some of the same areas of the brain as physical practice, helping to strengthen the patterns needed during competition. Divers and gymnasts, for example, may mentally run through a routine dozens of times before attempting it.

Another key area is the management of anxiety. A certain level of nervousness can sharpen attention, but too much may cause muscles to tense and decisions to become rushed. Psychologists teach breathing exercises and short routines to help athletes stay calm under pressure. A tennis player who bounces the ball the same number of times before every serve is using a routine to focus the mind and block out distractions.

Self-talk is also important. Athletes are encouraged to notice negative thoughts, such as "I always miss this shot", and replace them with more constructive statements. Studies have found that positive or instructional self-talk can improve performance, particularly in tasks requiring precision.

Sports psychologists pay close attention to motivation as well. Athletes who focus on improving their own performance, rather than only on winning, tend to cope better with setbacks and are less likely to give up. Setting specific, achievable goals for each training session can help maintain this focus over a long season.

Increasingly, the field also addresses mental health more broadly. Several high-profile athletes have spoken openly about depression and burnout, encouraging teams to provide psychological support rather than treating such problems as signs of weakness. As a result, sports psychology is no longer seen as an optional extra but as an essential part of preparing for competition.`,
      keywords: ['competitors', 'techniques', 'rehearsal', 'anxiety', 'distractions', 'psychological', 'precision', 'motivation', 'setbacks', 'cope', 'depression', 'essential'],
      questions: [
        { type: 'tfng', q: 'Elite athletes usually differ greatly in their physical abilities.', answer: 'FALSE', explain: 'Bài viết: "the physical differences between competitors are often extremely small" → FALSE.' },
        { type: 'tfng', q: 'A certain amount of nervousness can help athletes concentrate.', answer: 'TRUE', explain: 'Bài viết: "A certain level of nervousness can sharpen attention" → TRUE.' },
        { type: 'tfng', q: 'Visualisation works better for team sports than for individual sports.', answer: 'NOT GIVEN', explain: 'Bài không so sánh hiệu quả của kỹ thuật hình dung giữa môn đồng đội và môn cá nhân → NOT GIVEN.' },
        { type: 'mcq', q: 'Why might a tennis player bounce the ball the same number of times before every serve?', options: ['To use a routine that focuses the mind', 'To test how high the ball will bounce', 'To break the concentration of the rival', 'To check for uneven spots on the court'], answer: 0, explain: 'Đoạn văn nêu rõ việc đập bóng lặp đi lặp lại là cách vận động viên "using a routine to focus the mind and block out distractions", chứ không nhằm mục đích gây phân tâm đối thủ hay kiểm tra mặt sân.' },
        { type: 'mcq', q: 'According to the text, athletes who focus on improving their own performance…', options: ['win more often than others.', 'cope better with setbacks.', 'need less training.', 'never feel anxious.'], answer: 1, explain: 'Bài viết: they "tend to cope better with setbacks and are less likely to give up" → đáp án đúng: cope better with setbacks..' },
      ],
    },
    {
      id: 'water-scarcity',
      title: 'A Thirsty Planet: Managing Water Scarcity',
      topic: 'environment',
      level: 'B2',
      emoji: '💧',
      summaryVi: 'Nước ngọt dễ tiếp cận rất hạn chế trong khi nhu cầu tăng nhanh; tưới nhỏ giọt, sửa đường ống, tái sử dụng nước thải, khử mặn và chính sách giá là những giải pháp đang được áp dụng.',
      summaryEn: 'Easily accessible fresh water is very limited while demand is rising fast; drip irrigation, fixing leaking pipes, reusing wastewater, desalination and pricing policies are some of the solutions being used.',
      text: `Water covers most of the Earth's surface, so it may seem strange that scarcity is one of the most pressing problems of the century. The difficulty is that only a tiny fraction of the planet's water is fresh and easily accessible; the rest is salty or locked in ice. As populations grow and economies develop, demand for this limited supply is rising quickly.

Agriculture is by far the largest user, accounting for roughly 70 per cent of the fresh water withdrawn worldwide. Irrigation allows farmers to grow crops in dry regions, but inefficient methods, such as flooding entire fields, lose large quantities through evaporation. Industry and growing cities place further demands on rivers and underground reserves. In some regions, groundwater is being pumped out far faster than rain can replace it, causing water tables to fall and, in certain cities, the ground itself to sink.

Climate change is adding to the pressure. Rising temperatures increase evaporation, and changing rainfall patterns mean that some areas experience longer droughts, while others suffer intense floods that are difficult to capture and store. Communities that rely on glaciers for their summer water supply face particular uncertainty as the ice retreats.

There is, however, considerable scope for improvement. Drip irrigation, which delivers water directly to the roots of plants, can significantly reduce consumption on farms. Many cities lose a large share of their treated water through leaking pipes, so repairing infrastructure can save enormous volumes. Wastewater, once regarded simply as a problem, is increasingly being treated and reused for irrigation, industry and even drinking. Coastal countries are also investing in desalination, which removes salt from seawater, although the process requires a great deal of energy and produces a salty by-product that must be disposed of carefully.

Pricing is another tool, though a controversial one. Economists argue that when water is very cheap, people have little incentive to conserve it. Critics respond that access to clean water is a human right and that higher charges could harm the poorest households. Many governments therefore use tiered systems, in which a basic quantity is provided at low cost and heavy users pay more.

Ultimately, managing water scarcity will require cooperation between farmers, industries, city authorities and neighbouring countries that share the same rivers.`,
      keywords: ['scarcity', 'accessible', 'irrigation', 'reserves', 'groundwater', 'droughts', 'consumption', 'infrastructure', 'desalination', 'incentive', 'glaciers', 'cooperation'],
      questions: [
        { type: 'tfng', q: 'Agriculture uses about 70 per cent of the fresh water taken worldwide.', answer: 'TRUE', explain: 'Bài viết: agriculture accounts for "roughly 70 per cent of the fresh water withdrawn worldwide" → TRUE.' },
        { type: 'tfng', q: 'Desalination needs very little energy.', answer: 'FALSE', explain: 'Bài viết: the process "requires a great deal of energy" → FALSE.' },
        { type: 'tfng', q: 'Drip irrigation is now used on most farms in the world.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói tưới nhỏ giọt có thể giảm lượng nước tiêu thụ, không cho biết mức độ phổ biến → NOT GIVEN.' },
        { type: 'mcq', q: 'Why do some economists support higher water prices?', options: ['Because higher prices would fund large‑scale dam construction projects in the region', 'Because increased fees would discourage agricultural irrigation and reduce crop yields', 'Because charging more would ensure that water is treated as a luxury commodity', 'Because very cheap water gives people little incentive to conserve it'], answer: 3, explain: 'Bài viết: "when water is very cheap, people have little incentive to conserve it" → đáp án đúng: Because very cheap water gives people little incentive to conserve it.' },
        { type: 'mcq', q: 'What is a tiered pricing system?', options: ['A basic quantity is cheap and heavy users pay more.', 'Every single household pays the exact same flat fee.', 'Farmers receive unlimited free water for all crops.', 'Charges fluctuate continuously depending on the day.'], answer: 0, explain: 'Bài viết nêu: "tiered systems, in which a basic quantity is provided at low cost and heavy users pay more" (lượng dùng cơ bản có giá thấp và người dùng nhiều phải trả nhiều hơn).' },
      ],
    },
    {
      id: 'smart-cities',
      title: 'How Smart Should a City Be?',
      topic: 'technology',
      level: 'B2',
      emoji: '🏙️',
      summaryVi: 'Thành phố thông minh dùng cảm biến và dữ liệu để điều phối giao thông, năng lượng, nước; nhưng cũng đặt ra vấn đề quyền riêng tư, an ninh mạng và sự công bằng.',
      summaryEn: 'Smart cities use sensors and data to manage traffic, energy and water, but they also raise concerns about privacy, cybersecurity and fairness.',
      text: `Imagine a city where streetlights dim automatically when no one is around, where bins send a message when they need emptying, and where traffic signals adjust to the flow of cars in real time. This is the vision of the smart city: an urban area that uses sensors, data and digital networks to run services more efficiently.

Transport is often the first area to benefit. By analysing information from cameras, mobile phones and public transport cards, city authorities can identify where congestion builds up and change the timing of traffic lights accordingly. Some cities provide apps that show exactly when the next bus will arrive or where free parking spaces can be found, reducing the time drivers spend circling the streets.

Energy and resources are another focus. Smart meters allow households to monitor their electricity use, while sensors in water pipes can detect leaks before they become serious. Lighting systems that respond to movement can significantly cut the energy consumed by street lamps. Supporters argue that these improvements not only save money but also help cities meet their environmental targets.

However, the smart city raises important concerns. The most widely discussed is privacy. When cameras, sensors and apps constantly gather information about people's movements, there is a risk that this data could be misused, sold or stolen. Citizens may not know what is being collected or who has access to it. Security is a related issue: if essential systems such as traffic control or water supply are connected to the internet, they could become targets for hackers.

There is also a question of fairness. Expensive technology projects might concentrate on wealthy districts, leaving poorer neighbourhoods behind. People who do not own smartphones or are not comfortable with digital services, who are often older, may find it harder to use public services that move online.

For these reasons, many experts argue that a truly smart city is not simply one with the most technology. Instead, it is one that uses technology transparently, protects personal data and involves citizens in decisions about how their city should develop. Technology, in this view, should be a tool to serve people rather than an end in itself.`,
      keywords: ['sensors', 'efficiently', 'authorities', 'congestion', 'monitor', 'privacy', 'detect', 'citizens', 'concentrate', 'wealthy', 'urban'],
      questions: [
        { type: 'tfng', q: 'In a smart city, traffic signals can change according to the flow of cars.', answer: 'TRUE', explain: 'Bài viết: "traffic signals adjust to the flow of cars in real time" → TRUE.' },
        { type: 'tfng', q: 'Privacy is rarely discussed in debates about smart cities.', answer: 'FALSE', explain: 'Bài viết: "The most widely discussed is privacy" – đây là mối lo được bàn nhiều nhất → FALSE.' },
        { type: 'tfng', q: 'Most smart city projects are paid for by private companies.', answer: 'NOT GIVEN', explain: 'Bài không đề cập nguồn tài trợ cho các dự án thành phố thông minh → NOT GIVEN.' },
        { type: 'mcq', q: 'How can apps reduce the time drivers spend circling the streets?', options: ['By automatically adjusting the timing of traffic lights', 'By showing where free parking spaces can be found', 'By charging higher congestion fees during peak hours', 'By alerting drivers whenever public transit is delayed'], answer: 1, explain: 'Đoạn 2 nêu rõ ứng dụng thông báo vị trí các chỗ đỗ xe còn trống ("where free parking spaces can be found"), giúp người lái xe giảm bớt thời gian đi lòng vòng tìm chỗ.' },
        { type: 'mcq', q: 'According to many experts, a truly smart city is one that…', options: ['deploys the most advanced equipment across the entire urban area.', 'transfers all essential public administrative services onto the web.', 'uses technology transparently and involves citizens in decisions.', 'prioritises large infrastructure investments in high-income zones.'], answer: 2, explain: 'Theo đoạn cuối, thành phố thông minh thực sự không chỉ có nhiều công nghệ nhất mà phải "uses technology transparently, protects personal data and involves citizens in decisions".' },
      ],
    },
    {
      id: 'bilingual-brains',
      title: 'The Bilingual Brain',
      topic: 'language',
      level: 'B2',
      emoji: '🧠',
      summaryVi: 'Song ngữ từng bị cho là gây rối cho trẻ, nay lại được gắn với lợi ích nhận thức và trì hoãn triệu chứng sa sút trí tuệ – dù các nhà khoa học vẫn tranh luận về mức độ của những lợi ích này.',
      summaryEn: 'Bilingualism was once thought to confuse children; it is now linked to cognitive benefits and to delaying the symptoms of dementia – although scientists still debate how large these benefits are.',
      text: `For much of the twentieth century, many parents and teachers believed that learning two languages at once could confuse young children and delay their development. Today, that view has largely been reversed. A growing body of research suggests that bilingualism may bring a range of cognitive benefits, although scientists still disagree about how large these benefits are.

When a bilingual person speaks, both languages appear to be active in the brain at the same time, even if only one is being used. To avoid mixing them, the brain must constantly select the correct language and suppress the other. Some researchers believe that this regular mental exercise strengthens executive function, the set of skills we use to plan, switch between tasks and ignore distractions. In several experiments, bilingual children performed better than monolingual children on tasks that required them to change rules quickly.

Perhaps the most striking claims concern ageing. Studies in a number of countries have found that bilingual people who develop dementia tend to show symptoms several years later than monolingual people with similar levels of brain damage. One explanation is the idea of cognitive reserve: a lifetime of managing two languages may build extra connections that help the brain compensate for decline.

However, the picture is not entirely clear. Some large studies have failed to find any advantage in executive function, and critics argue that earlier research involved small samples or did not fully account for other factors, such as education, income or immigration background. There is also concern that studies showing positive results are more likely to be published than those that find nothing.

What is less controversial is that early childhood is an excellent time to acquire a second language, particularly its pronunciation. Children exposed to two languages from birth typically reach the main stages of language development at roughly the same ages as their monolingual peers. Their vocabulary in each separate language may be slightly smaller at first, but their total vocabulary across both languages is usually comparable.

Regardless of the debate about cognitive advantages, the practical and cultural benefits of speaking more than one language are undeniable. Bilingual people can communicate with a wider range of people, access different media and, in many careers, enjoy better employment opportunities.`,
      keywords: ['bilingual', 'cognitive', 'executive', 'distractions', 'striking', 'exposed', 'symptoms', 'compensate', 'controversial', 'acquire', 'peers', 'regardless'],
      questions: [
        { type: 'tfng', q: 'In the past, some people believed that learning two languages could delay children\'s development.', answer: 'TRUE', explain: 'Bài viết: many believed learning two languages "could confuse young children and delay their development" → TRUE.' },
        { type: 'tfng', q: 'All studies have found that bilingual people have better executive function.', answer: 'FALSE', explain: 'Bài viết: "Some large studies have failed to find any advantage in executive function" → FALSE.' },
        { type: 'tfng', q: 'Bilingual children usually learn to read earlier than monolingual children.', answer: 'NOT GIVEN', explain: 'Bài không đề cập thời điểm biết đọc của trẻ song ngữ → NOT GIVEN.' },
        { type: 'mcq', q: 'According to the text, what is "cognitive reserve"?', options: ['A second language learned in old age', 'A type of dementia', 'A test of executive function', 'Extra connections that may help the brain compensate for decline'], answer: 3, explain: 'Bài viết: managing two languages "may build extra connections that help the brain compensate for decline" → đáp án đúng: Extra connections that may help the brain compensate for decline.' },
        { type: 'mcq', q: 'Why do critics question earlier research?', options: ['It used small samples or ignored factors such as education and income.', 'It failed to study bilingual children and focused entirely on adults.', 'It collected data exclusively from individuals who lived in poverty.', 'It relied solely on self-reported surveys instead of mental tests.'], answer: 0, explain: 'Đoạn 4 nêu rõ các nhà phê bình cho rằng nghiên cứu trước đây "involved small samples or did not fully account for other factors, such as education, income or immigration background".' },
      ],
    },
    {
      id: 'volcano-monitoring',
      title: 'Listening to Volcanoes',
      topic: 'science',
      level: 'B2',
      emoji: '🌋',
      summaryVi: 'Địa chấn kế, vệ tinh và đo khí giúp nhận ra dấu hiệu núi lửa sắp phun, nhưng dự báo vẫn khó; kế hoạch khẩn cấp và niềm tin của cộng đồng cũng quan trọng không kém công nghệ.',
      summaryEn: 'Seismometers, satellites and gas measurements help detect signs that a volcano is about to erupt, but prediction is still difficult; emergency plans and community trust matter as much as technology.',
      text: `Around 800 million people live within 100 kilometres of an active volcano. For them, the ability to predict an eruption can be a matter of life and death. Although scientists cannot yet say exactly when a volcano will erupt, modern monitoring techniques have greatly improved their ability to recognise the warning signs.

The most important tool is the seismometer, which detects vibrations in the ground. As magma rises towards the surface, it forces its way through rock, creating swarms of small earthquakes. A sudden increase in the number or strength of these tremors often indicates that molten rock is on the move. Experienced volcanologists can also distinguish between different types of signals, some of which are linked to the movement of gas and fluids rather than breaking rock.

Changes in the shape of the ground provide further clues. When magma accumulates beneath a volcano, the surface may swell by several centimetres or even metres. Satellites using radar can now measure these tiny changes over large areas, while GPS stations placed on the volcano's slopes record movements continuously. In addition, scientists measure the gases released from vents and cracks. A rise in sulphur dioxide, for example, may suggest that fresh magma is approaching the surface.

Despite these advances, forecasting remains difficult. Each volcano behaves differently, and many show signs of unrest for months or years without erupting. If authorities order an evacuation too early or too often, residents may lose trust in the warnings and refuse to leave next time. On the other hand, a delayed decision can be catastrophic. Scientists must therefore communicate uncertainty clearly, often using alert levels that indicate the degree of danger rather than precise dates.

Many of the world's most dangerous volcanoes are located in developing countries, where funding for monitoring equipment is limited. International cooperation, cheaper sensors and satellite data that is freely available have begun to narrow this gap. Even so, experts stress that technology is only part of the solution: clear emergency plans, education and trust between scientists and local communities are just as essential in reducing the risk to human life.`,
      keywords: ['eruption', 'monitoring', 'detects', 'magma', 'indicates', 'accumulates', 'satellites', 'forecasting', 'distinguish', 'precise', 'uncertainty', 'cooperation'],
      questions: [
        { type: 'tfng', q: 'Scientists can now predict the exact date of most eruptions.', answer: 'FALSE', explain: 'Bài viết: "scientists cannot yet say exactly when a volcano will erupt" → FALSE.' },
        { type: 'tfng', q: 'The ground above a volcano may swell when magma accumulates.', answer: 'TRUE', explain: 'Bài viết: "When magma accumulates beneath a volcano, the surface may swell by several centimetres or even metres" → TRUE.' },
        { type: 'tfng', q: 'Sulphur dioxide is the most dangerous gas released by volcanoes.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói lượng sulphur dioxide tăng có thể là dấu hiệu magma đang lên, không so sánh độ nguy hiểm của các loại khí → NOT GIVEN.' },
        { type: 'mcq', q: 'Why can frequent early evacuations be a problem?', options: ['They disrupt long-term seismic monitoring projects.', 'They deplete the financial resources of local teams.', 'Residents may lose trust in warnings and refuse to leave next time.', 'Emergency crews become too exhausted to respond to real threats.'], answer: 2, explain: 'Đoạn 4 chỉ rõ nếu sơ tán quá sớm hoặc quá thường xuyên khi núi lửa chưa phun trào, người dân có thể mất niềm tin vào cảnh báo và từ chối rời đi ở những lần sau.' },
        { type: 'mcq', q: 'Apart from technology, what do experts say is needed to reduce the risk?', options: ['Permanent relocation of all large settlements away from peaks', 'Emergency plans, education and trust with local communities', 'Strict legal bans on commercial and tourism activities nearby', 'Increased numbers of professional volcanologists in every city'], answer: 1, explain: 'Bài đọc khẳng định bên cạnh công nghệ, các yếu tố thiết yếu gồm "clear emergency plans, education and trust between scientists and local communities", chứ không đề cập đến việc cấm du lịch hay di dời dân cư.' },
      ],
    },
    {
      id: 'overtourism',
      title: 'When Tourism Becomes Too Much',
      topic: 'travel',
      level: 'B2',
      emoji: '🧳',
      summaryVi: 'Du lịch quá tải khiến phố cổ chật chội, giá thuê nhà tăng và thiên nhiên bị tổn hại; các nơi đang thử thuế du lịch, giới hạn khách và quảng bá điểm đến ít người biết.',
      summaryEn: 'Overtourism crowds old town centres, pushes up rents and damages nature; destinations are trying tourist taxes, visitor limits and promoting lesser-known places.',
      text: `Tourism is one of the world's largest industries, providing jobs and income in almost every country. Cheaper flights, online booking and social media have made it easier than ever to visit distant places. Yet in some of the most popular destinations, the sheer number of visitors has become a source of tension. The term "overtourism" is now used to describe situations in which tourism damages the quality of life of local people or the very places that attract visitors in the first place.

The effects are most visible in historic city centres. Narrow streets designed for pedestrians can become so crowded that local people struggle to walk to work. Shops that once sold everyday goods are replaced by souvenir stalls and fast-food outlets. In several cities, the growth of short-term holiday rentals has reduced the number of homes available to local families, pushing up rents and forcing some of them to move away. As a result, certain neighbourhoods risk turning into what critics call "theme parks" with few permanent inhabitants.

Natural sites face different pressures. Popular beaches, mountain trails and coral reefs can suffer from erosion, litter and disturbance to wildlife. In some places, a single photograph shared widely online has drawn crowds to locations that lack the infrastructure to cope.

Authorities have tried a variety of responses. Some cities have introduced tourist taxes, using the revenue to maintain public spaces. Others limit the number of cruise ships allowed to dock each day or require visitors to book in advance for famous attractions. A few destinations have restricted new holiday rentals in residential areas. Tourism boards are also promoting lesser-known regions and encouraging travel outside the peak season, in the hope of spreading visitors more evenly.

These measures are not without controversy. Businesses that depend on tourism worry that restrictions will reduce their income, and some argue that charging fees makes travel accessible only to the wealthy. Finding the right balance is not easy. However, most experts agree that the aim should not be to stop tourism, but to manage it so that it benefits both visitors and the communities who host them.`,
      keywords: ['destinations', 'tension', 'pedestrians', 'residential', 'outlets', 'infrastructure', 'revenue', 'restricted', 'peak', 'controversy', 'accessible'],
      questions: [
        { type: 'tfng', q: 'Short-term holiday rentals have caused rents to rise in some cities.', answer: 'TRUE', explain: 'Bài viết: the growth of short-term holiday rentals has reduced available homes, "pushing up rents" → TRUE.' },
        { type: 'tfng', q: 'Overtourism only affects historic cities.', answer: 'FALSE', explain: 'Bài viết: "Natural sites face different pressures" – bãi biển, đường mòn, rạn san hô cũng bị ảnh hưởng → FALSE.' },
        { type: 'tfng', q: 'Tourist taxes have reduced visitor numbers in most cities.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói tiền thuế được dùng để duy tu không gian công cộng, không nói thuế làm giảm lượng khách → NOT GIVEN.' },
        { type: 'mcq', q: 'How are tourism boards trying to spread visitors more evenly?', options: ['By closing famous attractions', 'By banning all cruise ships', 'By raising the price of flights', 'By promoting lesser-known regions and travel outside the peak season'], answer: 3, explain: 'Bài viết: tourism boards are "promoting lesser-known regions and encouraging travel outside the peak season" → đáp án đúng: By promoting lesser-known regions and travel outside the peak season.' },
        { type: 'mcq', q: 'What is the writer\'s main conclusion?', options: ['Tourism should be managed to benefit both visitors and host communities.', 'Popular cities should completely ban international tourists during peaks.', 'Holiday rentals ought to be prohibited across all residential districts.', 'High travel taxes should be imposed strictly to deter budget travellers.'], answer: 0, explain: 'Câu cuối bài viết nêu rõ: "the aim should not be to stop tourism, but to manage it so that it benefits both visitors and the communities who host them".' },
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
      summaryEn: 'Artificial intelligence can read medical images as well as specialists, but it depends on its training data, lacks transparency and leaves responsibility unclear; experts see AI as an assistant, not a replacement for doctors.',
      text: `Few fields illustrate both the promise and the pitfalls of artificial intelligence as vividly as medicine. Algorithms trained on vast collections of medical images can now identify certain cancers, eye diseases and fractures with an accuracy that rivals, and occasionally surpasses, that of experienced specialists. Enthusiasts envisage a future in which AI relieves overstretched doctors of routine tasks, catches diseases earlier and extends high-quality diagnosis to regions where specialists are scarce.

The appeal is easy to understand. A radiologist may examine hundreds of scans in a single shift, and fatigue inevitably increases the risk of error. An algorithm does not tire, and it can be deployed to flag suspicious images for priority review, allowing human experts to concentrate their attention where it is most needed. Beyond imaging, machine-learning systems are being used to predict which hospital patients are at risk of sudden deterioration, to speed up the discovery of new drugs and to transcribe consultations so that clinicians spend less time on paperwork.

Nevertheless, translating impressive laboratory results into real clinical benefit has proved more difficult than early headlines suggested. An algorithm is only as reliable as the data on which it was trained. If those data come predominantly from one population, the system may perform poorly for patients of different ethnic backgrounds, ages or sexes, thereby reinforcing existing inequalities in care. Systems that perform well in the hospital where they were developed have, in several documented cases, deteriorated markedly when introduced elsewhere, owing to differences in equipment or patient populations.

Transparency poses a further challenge. Many advanced models operate as so-called "black boxes", producing a conclusion without a readily interpretable explanation. Clinicians may be reluctant to act on a recommendation they cannot scrutinise, and patients are entitled to understand how decisions about their care are reached. There is also the unresolved question of accountability: if an AI-assisted diagnosis proves wrong, it is not obvious whether responsibility lies with the doctor, the hospital or the developer.

For these reasons, most experts envisage AI as an assistant rather than a replacement. Studies suggest that the combination of human judgement and algorithmic support frequently outperforms either alone, provided that clinicians remain alert to the risk of automation bias, the tendency to accept a machine's output uncritically. Regulators, meanwhile, are developing frameworks that require rigorous testing across diverse populations and continuous monitoring after deployment.

The ultimate test of medical AI will not be its performance in controlled trials, but whether it measurably improves outcomes for patients while preserving the trust on which the relationship between doctor and patient depends.`,
      keywords: ['algorithms', 'accuracy', 'specialists', 'diagnosis', 'fatigue', 'deterioration', 'predominantly', 'inequalities', 'transparency', 'reluctant', 'automation', 'rigorous', 'outcomes'],
      questions: [
        { type: 'tfng', q: 'Some algorithms can identify certain diseases as accurately as experienced specialists.', answer: 'TRUE', explain: 'Bài viết: algorithms identify some diseases "with an accuracy that rivals, and occasionally surpasses, that of experienced specialists" → TRUE.' },
        { type: 'tfng', q: 'An AI system that works well in one hospital will perform equally well in every other hospital.', answer: 'FALSE', explain: 'Bài viết: some systems "deteriorated markedly when introduced elsewhere" → FALSE.' },
        { type: 'tfng', q: 'Most hospitals have already replaced radiologists with algorithms.', answer: 'NOT GIVEN', explain: 'Bài chỉ nêu quan điểm của giới chuyên môn rằng AI là trợ lý, không cho biết các bệnh viện đã thay thế bác sĩ hay chưa → NOT GIVEN.' },
        { type: 'mcq', q: 'What is "automation bias"?', options: ['The failure of algorithms to explain their diagnostic decisions', 'The reliance on training data drawn from a single population', 'The tendency to accept a machine\'s output uncritically', 'The diagnostic errors caused by physician fatigue during shifts'], answer: 2, explain: 'Đoạn 5 định nghĩa trực tiếp \'automation bias\' là "the tendency to accept a machine\'s output uncritically" (khuynh hướng tin theo kết quả của máy móc mà thiếu sự phản biện).' },
        { type: 'mcq', q: 'Why might an algorithm reinforce inequalities in care?', options: ['It requires costly equipment that many low‑budget hospitals cannot afford.', 'Its training data may come mainly from one population.', 'Physicians often distrust the system and decline to adopt it.', 'The algorithm is unable to interpret complex radiological scans accurately.'], answer: 1, explain: 'Bài viết: "If those data come predominantly from one population, the system may perform poorly for patients of different ethnic backgrounds, ages or sexes" → đáp án đúng: Its training data may come mainly from one population..' },
      ],
    },
    {
      id: 'silk-road',
      title: 'Beyond Silk: The Ancient Trade Routes of Asia',
      topic: 'history',
      level: 'C1',
      emoji: '🐫',
      summaryVi: 'Con đường tơ lụa thực chất là mạng lưới tuyến đường bộ và biển kéo dài hàng thế kỷ, truyền bá không chỉ hàng hóa mà cả tôn giáo, kỹ thuật làm giấy – và cả dịch bệnh.',
      summaryEn: 'The Silk Road was really a network of land and sea routes lasting for centuries, spreading not only goods but also religions, papermaking – and even disease.',
      text: `The term "Silk Road" conjures up images of camel caravans crossing deserts laden with precious fabric. The reality was considerably more complex. Rather than a single road, it was a shifting network of overland and maritime routes that, over roughly fifteen centuries, linked China with Central Asia, India, the Middle East and the Mediterranean. Silk was merely one commodity among many; spices, horses, paper, glass, precious metals and ceramics all changed hands along the way.

Strikingly, few merchants ever travelled the entire distance. Goods typically passed through a relay of traders, each covering a particular segment before selling to the next. Oasis cities such as Samarkand flourished as hubs where merchants rested, exchanged goods and gathered intelligence about prices and political conditions further along the route. This fragmented structure meant that prices multiplied with every transaction, which is partly why silk commanded such extraordinary value in Rome.

The significance of these routes, however, extended far beyond commerce. Ideas, technologies and beliefs travelled alongside merchandise. Buddhism spread from India into China via Central Asian trading communities, while papermaking techniques gradually moved westward, eventually transforming record-keeping and scholarship in the Islamic world and later in Europe. Musical instruments, artistic motifs and agricultural crops were similarly diffused, leaving traces that historians still detect in surviving artefacts.

Not every exchange was beneficial. Many historians believe that the trade networks facilitated the transmission of disease, most notoriously the plague that devastated Europe and parts of Asia in the fourteenth century. The very connectivity that enabled prosperity also rendered distant populations vulnerable to shared catastrophes.

The decline of the overland routes is often attributed to the expansion of European sea voyages from the late fifteenth century, which allowed goods to be transported in bulk more cheaply by ship. Yet scholars increasingly emphasise that maritime trade across the Indian Ocean had long been substantial, and that political fragmentation and conflict in Central Asia also played a role. The story, once again, resists simple explanations.

Today the Silk Road enjoys renewed prominence, not least because modern infrastructure projects deliberately invoke its legacy. Historians caution, however, against romanticising the past. The ancient routes were neither centrally planned nor consistently peaceful; their enduring importance lies instead in demonstrating how sustained contact between distant societies can reshape economies, cultures and even the course of history itself.`,
      keywords: ['network', 'merchandise', 'commodity', 'merchants', 'prosperity', 'transaction', 'commerce', 'transmission', 'artefacts', 'facilitated', 'scholars', 'attributed'],
      questions: [
        { type: 'tfng', q: 'Most merchants travelled the whole distance between China and the Mediterranean.', answer: 'FALSE', explain: 'Bài viết: "few merchants ever travelled the entire distance" – hàng hóa được chuyển qua nhiều chặng thương nhân → FALSE.' },
        { type: 'tfng', q: 'Papermaking techniques moved gradually westward along the trade routes.', answer: 'TRUE', explain: 'Bài viết: "papermaking techniques gradually moved westward" → TRUE.' },
        { type: 'tfng', q: 'Samarkand was the largest city on the Silk Road.', answer: 'NOT GIVEN', explain: 'Bài chỉ nêu Samarkand là một trung tâm phát triển mạnh, không so sánh quy mô với các thành phố khác → NOT GIVEN.' },
        { type: 'mcq', q: 'Why did silk become so valuable in Rome?', options: ['Roman authorities strictly limited the entry of foreign textiles.', 'Dangerous sea routes frequently resulted in lost merchant fleets.', 'The Chinese empire produced only tiny amounts of fine fabrics.', 'Prices multiplied with every transaction along the relay of traders.'], answer: 3, explain: 'Đoạn văn chỉ rõ cấu trúc trung chuyển phân mảnh khiến "prices multiplied with every transaction", giải thích vì sao lụa có giá rất cao ở Rome; các lý do về hạn chế nhập khẩu hay vận chuyển đường biển đều không được nêu.' },
        { type: 'mcq', q: 'What does the writer say about the decline of the overland routes?', options: ['It had several causes, including conflict in Central Asia.', 'It was entirely due to the rise of European naval routes.', 'It resulted primarily from outbreaks of fourteenth-century plague.', 'It happened abruptly following the collapse of Chinese dynasties.'], answer: 0, explain: 'Đoạn 5 nêu rõ sự suy giảm không chỉ do các chuyến hải hành của châu Âu mà còn vì phân mảnh chính trị và xung đột ở Trung Á ("political fragmentation and conflict in Central Asia also played a role"), bác bỏ quan điểm cho rằng nó chỉ bắt nguồn từ đường biển.' },
      ],
    },
    {
      id: 'attention-economy',
      title: 'The Attention Economy',
      topic: 'media',
      level: 'C1',
      emoji: '📱',
      summaryVi: 'Khi sự chú ý trở thành tài nguyên khan hiếm, các nền tảng số được thiết kế để giữ chân người dùng – gây phân mảnh sự tập trung và lan truyền tin sai; giải pháp bền vững có thể nằm ở mô hình kinh doanh.',
      summaryEn: 'When attention becomes a scarce resource, digital platforms are designed to keep users hooked – fragmenting concentration and spreading misinformation; a lasting solution may lie in the business model.',
      text: `In an age of information abundance, the scarce resource is no longer information itself but the human attention required to consume it. This insight, articulated by economists decades before the smartphone, underpins what is now termed the attention economy. Many of the most valuable companies in the world offer their core services free of charge; their revenue derives instead from capturing users' time and selling access to it, chiefly through advertising.

The commercial logic has profound consequences for design. If profit depends on engagement, platforms have a powerful incentive to maximise the time users spend on them. Features such as infinite scrolling, autoplaying videos and notifications delivered at unpredictable intervals have been criticised for exploiting well-documented psychological tendencies. Variable rewards, such as the uncertain prospect of a new message or a burst of approval, are known to be particularly compelling, a principle long familiar to designers of gambling machines.

Critics contend that the cumulative effect is a fragmentation of attention. Constant switching between tasks appears to impose a cognitive cost, reducing the capacity for the sustained, deep concentration on which complex reasoning and creative work depend. Some researchers have linked heavy social media use to anxiety and poor sleep, particularly among adolescents, although establishing causation remains notoriously difficult: it is plausible that people who are already anxious gravitate towards their screens.

Moreover, the content that captures attention most effectively is not necessarily the most accurate or valuable. Algorithms that prioritise engagement may inadvertently amplify sensational, divisive or misleading material, since such content provokes strong reactions. This dynamic has prompted concern about the health of public debate and the spread of misinformation.

Responses have emerged on several fronts. Some technology companies have introduced tools that allow users to monitor their screen time or disable certain features. Legislators in various jurisdictions are scrutinising design practices that may be manipulative, especially where children are concerned. At the individual level, a growing movement advocates "digital minimalism", which means deliberately limiting the role of technology to activities that genuinely serve one's values.

Yet framing the issue purely as a matter of individual willpower may be misguided. When some of the most sophisticated engineering in history is devoted to capturing attention, expecting each user to resist unaided seems unrealistic. A more durable solution may require rethinking the underlying business models, so that the commercial success of digital services is aligned with, rather than opposed to, the wellbeing of the people who use them.`,
      keywords: ['cognitive', 'revenue', 'engagement', 'incentive', 'consequences', 'cumulative', 'fragmentation', 'causation', 'plausible', 'prioritise', 'misinformation', 'jurisdictions'],
      questions: [
        { type: 'tfng', q: 'Many companies in the attention economy earn money mainly from advertising.', answer: 'TRUE', explain: 'Bài viết: their revenue comes from "capturing users\' time and selling access to it, chiefly through advertising" → TRUE.' },
        { type: 'tfng', q: 'Researchers have proved that social media directly causes anxiety in adolescents.', answer: 'FALSE', explain: 'Bài viết: "establishing causation remains notoriously difficult" – chưa chứng minh được quan hệ nhân quả → FALSE.' },
        { type: 'tfng', q: 'Digital minimalism is more popular among older adults than among young people.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói phong trào này đang phát triển, không so sánh theo độ tuổi → NOT GIVEN.' },
        { type: 'mcq', q: 'Why are variable rewards described as compelling?', options: ['Their regular delivery provides a soothing routine, helping people relax.', 'Their uncertainty makes them particularly attractive, as in gambling machines.', 'Their educational value encourages deeper reflection, enhancing personal growth.', 'Their financial value guarantees substantial returns, benefiting users directly.'], answer: 1, explain: 'Bài đọc nêu rõ variable rewards là \'particularly compelling\' vì người dùng đối mặt với \'uncertain prospect\', tương tự cách thức hoạt động của máy đánh bạc; các phương án còn lại miêu tả sai bản chất ngẫu nhiên này.' },
        { type: 'mcq', q: 'What does the writer suggest in the final paragraph?', options: ['Individuals must rely on stronger self‑discipline to limit usage.', 'Regulators ought to prohibit smartphone ownership for people over eighteen.', 'Business models may need to be rethought to align with users\' wellbeing.', 'Companies should eliminate all advertising revenue from their platforms.'], answer: 2, explain: 'Bài viết: "A more durable solution may require rethinking the underlying business models" → đáp án đúng: Business models may need to be rethought to align with users\' wellbeing..' },
      ],
    },
    {
      id: 'rewilding',
      title: 'Rewilding: Letting Nature Take the Lead',
      topic: 'environment',
      level: 'C1',
      emoji: '🦫',
      summaryVi: 'Tái hoang dã khôi phục các quá trình tự nhiên bằng cách đưa loài như hải ly, sói trở lại; cách tiếp cận này đầy tham vọng nhưng gây tranh cãi và cần sự đồng thuận của cộng đồng.',
      summaryEn: 'Rewilding restores natural processes by bringing back species such as beavers and wolves; the approach is ambitious but controversial and needs the agreement of local communities.',
      text: `For much of the twentieth century, nature conservation in many countries focused on protecting particular species or preserving landscapes in a carefully managed state. Rewilding represents a markedly different philosophy. Rather than intervening continually to maintain a fixed condition, it seeks to restore natural processes and then, as far as possible, allow ecosystems to regulate themselves.

Central to rewilding is the reintroduction of species that once shaped their environments but disappeared because of hunting or habitat loss. Large predators and so-called ecosystem engineers often attract the most attention. The beaver, for instance, builds dams that slow the flow of rivers, creating wetlands that store water, reduce downstream flooding and support a remarkable diversity of insects, birds and amphibians. Similarly, the return of grazing animals such as wild cattle or horses can create a patchwork of open ground and woodland that benefits a wide range of plants.

The most frequently cited example is the reintroduction of wolves to Yellowstone National Park in the 1990s. According to a widely publicised account, wolves reduced the number of elk and altered their behaviour, allowing riverside vegetation to recover, which in turn stabilised riverbanks. Subsequent research, however, has suggested that this "trophic cascade" was considerably more complex and less dramatic than popular versions implied, with factors such as human hunting and drought also playing significant roles. The episode serves as a reminder that ecological outcomes are rarely as tidy as compelling narratives suggest.

Rewilding is not without its detractors. Farmers sometimes fear that returning predators will attack livestock, and beavers can flood valuable agricultural land. Critics also question whether a "wild" state can meaningfully be defined in landscapes that have been shaped by humans for thousands of years. Which point in history, they ask, should serve as the baseline? Proponents generally respond that the aim is not to recreate a specific past, but to increase the complexity and resilience of ecosystems.

Practical success therefore depends as much on social acceptance as on ecology. Projects that compensate farmers for losses, involve local communities in planning and create opportunities in nature tourism tend to encounter less opposition. In densely populated regions, rewilding may take more modest forms, such as allowing rivers to follow their natural courses or leaving parts of farmland to regenerate naturally.

As biodiversity continues to decline globally, rewilding offers an ambitious, if contested, vision: one in which human beings act less as managers of nature and more as facilitators of its recovery.`,
      keywords: ['conservation', 'ecosystems', 'habitat', 'predators', 'diversity', 'regulate', 'subsequent', 'narratives', 'livestock', 'complexity', 'opposition', 'resilience', 'biodiversity'],
      questions: [
        { type: 'tfng', q: 'Rewilding aims to keep landscapes in a fixed, carefully managed state.', answer: 'FALSE', explain: 'Bài viết: rewilding seeks to restore natural processes "rather than intervening continually to maintain a fixed condition" → FALSE.' },
        { type: 'tfng', q: 'Later research suggested that the effects of wolves in Yellowstone were more complex than popular accounts claimed.', answer: 'TRUE', explain: 'Bài viết: nghiên cứu sau này cho thấy "trophic cascade" ở Yellowstone "was considerably more complex and less dramatic than popular versions implied" → TRUE.' },
        { type: 'tfng', q: 'Beavers have been reintroduced to every country in Europe.', answer: 'NOT GIVEN', explain: 'Bài chỉ giải thích vai trò của hải ly, không nói chúng được đưa trở lại những quốc gia nào → NOT GIVEN.' },
        { type: 'mcq', q: 'Why is the beaver described as an ecosystem engineer?', options: ['Its feeding habits control invasive vegetation throughout rivers.', 'Its predation directly limits the numbers of browsing herbivores.', 'Its dams create wetlands that support many species.', 'Its burrows aerate surrounding soil and prevent massive erosion.'], answer: 2, explain: 'Tác giả gọi hải ly là kỹ sư hệ sinh thái vì hoạt động đắp đập của chúng tạo ra các vùng đất ngập nước giúp duy trì đa dạng sinh học phong phú.' },
        { type: 'mcq', q: 'According to the text, which factor helps rewilding projects meet less opposition?', options: ['Compensating farmers for losses', 'Keeping local people out of planning', 'Introducing as many predators as possible', 'Avoiding nature tourism'], answer: 0, explain: 'Bài viết: "Projects that compensate farmers for losses, involve local communities in planning and create opportunities in nature tourism tend to encounter less opposition" → đáp án đúng: Compensating farmers for losses.' },
      ],
    },
    {
      id: 'placebo-effect',
      title: 'The Curious Power of the Placebo',
      topic: 'health',
      level: 'C1',
      emoji: '💊',
      summaryVi: 'Hiệu ứng giả dược cho thấy kỳ vọng và bối cảnh điều trị có thể tạo ra thay đổi sinh lý thật; mặt trái của nó là hiệu ứng nocebo, và giả dược không thể thay thế thuốc thật.',
      summaryEn: 'The placebo effect shows that expectations and the treatment setting can cause real physical changes; its downside is the nocebo effect, and placebos cannot replace real medicine.',
      text: `In clinical research, the placebo, an inert substance such as a sugar pill, has traditionally been regarded as little more than a methodological tool. By comparing a new drug with a placebo, researchers can determine whether any improvement is attributable to the medication itself. Yet the placebo effect, the genuine improvement that some patients experience after receiving an inactive treatment, has increasingly become an object of study in its own right.

The phenomenon is most pronounced for symptoms that are subjective and influenced by the brain, such as pain, nausea and fatigue. Brain-imaging studies have shown that when patients expect pain relief, regions associated with the body's own pain-control system become more active, and the release of natural painkilling chemicals can increase. In other words, expectation is not merely imaginary; it can produce measurable physiological changes.

Context appears to matter enormously. Experiments have found that injections tend to produce stronger placebo responses than pills, that two pills can outperform one, and that branded or more expensive-looking tablets may be more effective than plain ones. The manner of the practitioner also plays a part: patients treated by a warm, attentive clinician frequently report greater improvement than those receiving identical treatment in a brisk, impersonal manner.

Perhaps the most counterintuitive findings concern so-called open-label placebos. In several trials, patients with conditions such as irritable bowel syndrome were explicitly told that they were receiving inactive pills, yet many still reported significant relief. Researchers speculate that the ritual of taking medication, combined with a credible explanation of how placebos can work, may be sufficient to trigger beneficial responses, although these studies have generally been small.

The placebo effect has a less welcome counterpart: the nocebo effect, in which negative expectations produce real side effects. Participants warned about possible symptoms are more likely to experience them, even when they have been given an inactive substance. This poses a genuine dilemma for doctors, who are obliged to inform patients of risks while avoiding the unintended creation of symptoms.

It is important not to overstate the power of placebos. They do not shrink tumours or cure infections, and relying on them in place of effective treatment would be dangerous. Their relevance lies elsewhere. A clearer understanding of how expectation and context influence recovery could help clinicians communicate more effectively and design care that maximises the benefits of genuinely active treatments.`,
      keywords: ['placebo', 'phenomenon', 'attributable', 'expectation', 'sufficient', 'participants', 'practitioner', 'counterintuitive', 'explicitly', 'speculate', 'obliged', 'overstate'],
      questions: [
        { type: 'tfng', q: 'Placebo effects are strongest for subjective symptoms such as pain and nausea.', answer: 'TRUE', explain: 'Bài viết: the phenomenon "is most pronounced for symptoms that are subjective and influenced by the brain, such as pain, nausea and fatigue" → TRUE.' },
        { type: 'tfng', q: 'Placebos can cure infections if patients believe in them.', answer: 'FALSE', explain: 'Bài viết: placebos "do not shrink tumours or cure infections" → FALSE.' },
        { type: 'tfng', q: 'Open-label placebos are now widely prescribed by family doctors.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói về một số thử nghiệm nhỏ, không đề cập việc bác sĩ gia đình kê đơn giả dược → NOT GIVEN.' },
        { type: 'mcq', q: 'What is the nocebo effect?', options: ['Improvement observed after receiving an inactive substance', 'Real side effects caused by negative expectations', 'Severe pain triggered by physical nerve damage', 'The body\'s natural system for relieving pain'], answer: 1, explain: 'Bài viết định nghĩa nocebo effect là hiện tượng "in which negative expectations produce real side effects", trái ngược với placebo effect mang lại cải thiện tích cực sau khi dùng giả dược.' },
        { type: 'mcq', q: 'Which factor is said to strengthen the placebo response?', options: ['A brisk, impersonal clinician', 'Taking one pill rather than two', 'Plain, unbranded tablets', 'A warm, attentive clinician'], answer: 3, explain: 'Bài viết: "patients treated by a warm, attentive clinician frequently report greater improvement" → đáp án đúng: A warm, attentive clinician.' },
      ],
    },
    {
      id: 'basic-income',
      title: 'Universal Basic Income: Utopia or Necessity?',
      topic: 'economy',
      level: 'C1',
      emoji: '💰',
      summaryVi: 'Thu nhập cơ bản phổ quát hứa hẹn xóa bỏ thủ tục rườm rà và “bẫy phúc lợi”, nhưng chi phí rất lớn; các thí điểm cho kết quả tích cực song chưa đủ để kết luận.',
      summaryEn: 'A universal basic income promises to remove complicated paperwork and the "welfare trap", but it is very expensive; pilot schemes have shown positive results that are not yet enough to draw conclusions.',
      text: `The proposal that every citizen should receive a regular cash payment from the state, regardless of employment or wealth, has a surprisingly long and varied intellectual history. Advocated at different times by radical reformers and free-market economists alike, universal basic income (UBI) has re-emerged in recent years as a response to concerns about automation, insecure work and the complexity of existing welfare systems.

Proponents advance several distinct arguments. First, because the payment is unconditional, it eliminates the bureaucracy involved in assessing eligibility, as well as the stigma that sometimes deters people from claiming support to which they are entitled. Second, it avoids the so-called welfare trap, whereby people who take on paid work lose benefits at such a rate that they gain little or nothing financially. Third, supporters contend that a guaranteed income floor would provide security in a labour market increasingly characterised by short-term contracts and, potentially, by the displacement of jobs through artificial intelligence.

Critics raise equally substantial objections. The most immediate is cost. A payment generous enough to live on, distributed to an entire adult population, would require large increases in taxation or the dismantling of other public services. If, conversely, the payment is set at a modest level, it may be insufficient to replace targeted benefits for people with disabilities or high housing costs, potentially leaving the most vulnerable worse off. Others worry that an unconditional income might weaken the incentive to work, although the strength of this effect is fiercely disputed.

Empirical evidence remains limited, partly because genuinely universal schemes have rarely been tested. Pilot projects in countries including Finland, Kenya and Canada have typically involved selected groups rather than whole populations, and for fixed periods. Their findings have nonetheless been instructive. Recipients have generally reported improved wellbeing and reduced stress, and most studies have found little evidence of a significant decline in employment. Sceptics point out, however, that temporary experiments cannot reveal how behaviour or prices might change if a payment were permanent and nationwide.

Ultimately, the debate about UBI reflects deeper disagreements about the purpose of the welfare state: whether it should primarily provide a safety net for those in need, or guarantee every citizen a baseline of economic independence. Until larger and longer-term trials are conducted, the question is likely to be settled as much by political values as by evidence.`,
      keywords: ['welfare', 'bureaucracy', 'taxation', 'conversely', 'displacement', 'substantial', 'radical', 'vulnerable', 'incentive', 'empirical', 'recipients', 'whereby'],
      questions: [
        { type: 'tfng', q: 'Support for UBI has come from people with very different political views.', answer: 'TRUE', explain: 'Bài viết: UBI has been "Advocated at different times by radical reformers and free-market economists alike" → TRUE.' },
        { type: 'tfng', q: 'Pilot projects have shown a sharp fall in employment among recipients.', answer: 'FALSE', explain: 'Bài viết: "most studies have found little evidence of a significant decline in employment" → FALSE.' },
        { type: 'tfng', q: 'Finland has decided to introduce UBI for its entire population.', answer: 'NOT GIVEN', explain: 'Bài chỉ nhắc Phần Lan có dự án thí điểm với nhóm chọn lọc, không nói nước này quyết định áp dụng toàn quốc → NOT GIVEN.' },
        { type: 'mcq', q: 'What is the "welfare trap"?', options: ['When people who start paid work lose benefits so quickly that they gain little', 'When people who apply for unemployment relief face excessive official paperwork', 'When people who lack formal qualifications are unable to secure any employment', 'When people who live in economically deprived regions must rely on private charity'], answer: 0, explain: 'Theo bài viết, \'welfare trap\' là tình trạng người bắt đầu đi làm có lương bị cắt giảm phúc lợi nhanh đến mức hầu như không cải thiện được thu nhập; các đáp án khác chỉ các khó khăn thủ tục hoặc tìm việc làm thông thường.' },
        { type: 'mcq', q: 'Why do sceptics doubt the results of the pilot projects?', options: ['The pilot projects required a budget that exceeded the allocated funds for the study.', 'Participants indicated that the cash payments increased their anxiety about future financial stability.', 'Temporary experiments cannot show how behaviour or prices would change under a permanent scheme.', 'The experiments were conducted across entire cities rather than limited test groups.'], answer: 2, explain: 'Bài viết: "temporary experiments cannot reveal how behaviour or prices might change if a payment were permanent and nationwide" → đáp án đúng: Temporary experiments cannot show how behaviour or prices would change under a permanent scheme..' },
      ],
    },
    {
      id: 'antibiotic-resistance',
      title: 'The Slow Pandemic: Antibiotic Resistance',
      topic: 'health',
      level: 'C1',
      emoji: '🦠',
      summaryVi: 'Việc lạm dụng kháng sinh ở người và vật nuôi đẩy nhanh tình trạng vi khuẩn kháng thuốc, trong khi thuốc mới ngày càng ít; cần quản lý kê đơn, chẩn đoán nhanh và mô hình tài trợ mới.',
      summaryEn: 'The overuse of antibiotics in people and farm animals speeds up drug resistance in bacteria, while fewer new drugs are being developed; better prescribing, rapid diagnosis and new funding models are needed.',
      text: `When penicillin entered widespread use in the 1940s, it transformed medicine. Infections that had routinely killed, such as pneumonia, infected wounds and complications of childbirth, suddenly became treatable. Antibiotics also made possible many modern procedures, from major surgery to cancer chemotherapy, which depend on the ability to prevent or control bacterial infection. Yet even Alexander Fleming, who discovered penicillin, warned that its misuse could render bacteria resistant. That warning has proved remarkably prescient.

Resistance is, at its core, a matter of natural selection. Whenever bacteria are exposed to an antibiotic, the most susceptible are killed, while any that happen to carry a resistance mechanism survive and multiply. Bacteria can also exchange genetic material with one another, allowing resistance to spread between different species. Consequently, every use of an antibiotic, however justified, exerts some selective pressure; unnecessary use simply accelerates the process.

Such unnecessary use is widespread. Antibiotics are frequently prescribed for viral illnesses such as colds and influenza, against which they are entirely ineffective. In some countries they can be purchased without a prescription, and patients who stop a course early or share leftover tablets may contribute further. Agriculture is another major factor: in many parts of the world, large quantities are administered to livestock not to treat disease but to promote growth or to compensate for crowded conditions.

The consequences are already severe. Drug-resistant infections are estimated to be directly responsible for over a million deaths a year, and some strains have emerged that resist almost every available treatment. Compounding the problem, the pipeline of new antibiotics has slowed dramatically. Because new antibiotics would ideally be used sparingly, to preserve their effectiveness, pharmaceutical companies have little prospect of recovering development costs, and many have withdrawn from the field.

Addressing the crisis therefore requires action on several levels. Stewardship programmes in hospitals aim to ensure that antibiotics are prescribed only when necessary and that the right drug is chosen. Rapid diagnostic tests can help clinicians distinguish bacterial from viral infections. Improved sanitation and vaccination reduce the number of infections in the first place. Some governments are experimenting with new funding models, such as paying companies a fixed annual fee for access to a new antibiotic, regardless of how much is sold, thereby separating profit from sales volume.

Because bacteria do not respect borders, no single country can solve the problem alone. Experts describe antimicrobial resistance as a slow-moving pandemic: less visible than a sudden outbreak, but potentially just as dangerous if left unchecked.`,
      keywords: ['widespread', 'susceptible', 'mechanism', 'antibiotics', 'prescribed', 'resistance', 'administered', 'livestock', 'strains', 'pharmaceutical', 'vaccination', 'pandemic'],
      questions: [
        { type: 'tfng', q: 'Alexander Fleming warned that misuse of penicillin could lead to resistance.', answer: 'TRUE', explain: 'Bài viết: Fleming "warned that its misuse could render bacteria resistant" → TRUE.' },
        { type: 'tfng', q: 'Antibiotics are effective against colds and influenza.', answer: 'FALSE', explain: 'Bài viết: antibiotics are prescribed for colds and influenza, "against which they are entirely ineffective" → FALSE.' },
        { type: 'tfng', q: 'Most new antibiotics are now developed by universities.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói nhiều công ty dược đã rút khỏi lĩnh vực này, không nhắc đến vai trò của các trường đại học → NOT GIVEN.' },
        { type: 'mcq', q: 'Why have many pharmaceutical companies withdrawn from developing antibiotics?', options: ['Clinical trials for infectious illnesses have become strictly forbidden.', 'Common bacteria rarely cause life-threatening symptoms in patients.', 'Modern synthesising processes are excessively simple and unpatented.', 'New antibiotics would be used sparingly, so costs are hard to recover.'], answer: 3, explain: 'Bài đọc nêu rõ vì các loại kháng sinh mới cần được sử dụng hạn chế để tránh kháng thuốc, các hãng dược khó có thể thu hồi chi phí nghiên cứu và phát triển.' },
        { type: 'mcq', q: 'What is the purpose of paying companies a fixed annual fee?', options: ['To increase sales of antibiotics', 'To separate profit from sales volume', 'To replace vaccination programmes', 'To promote growth in livestock'], answer: 1, explain: 'Bài viết: the fee is paid "regardless of how much is sold, thereby separating profit from sales volume" → đáp án đúng: To separate profit from sales volume.' },
      ],
    },
    /* ===================== A2 (bổ sung) ===================== */
    {
      id: 'school-gardens', title: 'Learning in the School Garden', topic: 'environment', level: 'A2', emoji: '🥕',
      summaryVi: 'Nhiều trường học có vườn rau nhỏ; học sinh học về thiên nhiên, ăn uống lành mạnh và làm việc nhóm qua việc trồng cây.',
      summaryEn: 'Many schools have small vegetable gardens, where students learn about nature, healthy eating and teamwork by growing plants.',
      text: "In many countries, more and more schools now have a small garden. Children plant seeds, water the plants and pick vegetables when they are ready. For some pupils, it is the first time they have seen how food grows.\n\nTeachers say that a garden is like an outdoor classroom. In science lessons, pupils can watch insects and learn why plants need sun and water. In maths, they measure how tall the plants are each week and draw charts. Even reading and writing lessons can use the garden: children write diaries about what they see.\n\nThe garden can also change what children like to eat. Many young people say they do not like vegetables. However, teachers often notice that children are happy to try a carrot or a tomato that they have grown themselves. Some schools use the vegetables in the school kitchen, so the pupils can eat them at lunch.\n\nWorking in the garden is a team activity, too. Pupils share jobs, such as watering, digging and taking away weeds, and they must help each other. Quiet children sometimes feel more confident outside than in the classroom.\n\nOf course, a garden needs care during the summer holidays, when the school is closed. In some schools, families take turns to visit and water the plants. Without this help, many of the plants would die before the new school year starts.",
      keywords: ['plant', 'seed', 'pupil', 'outdoor', 'measure', 'chart', 'diary', 'confident', 'weed', 'take turns'],
      questions: [
        { type: 'tfng', q: 'Some children see how food grows for the first time in a school garden.', answer: 'TRUE', explain: 'Bài viết: "For some pupils, it is the first time they have seen how food grows" → TRUE.' },
        { type: 'tfng', q: 'Pupils use the garden only in science lessons.', answer: 'FALSE', explain: 'Khu vườn được dùng cả trong giờ toán (đo chiều cao cây, vẽ biểu đồ) và giờ đọc – viết (viết nhật ký), không chỉ môn khoa học → FALSE.' },
        { type: 'tfng', q: 'Schools with gardens get better exam results.', answer: 'NOT GIVEN', explain: 'Bài viết không nhắc đến kết quả thi của học sinh → NOT GIVEN.' },
        { type: 'mcq', q: 'What do teachers often notice about children and vegetables?', options: ['They refuse to eat any vegetables cooked at school.', 'They are happy to try vegetables they grew themselves.', 'They show a strong preference for raw vegetables.', 'They only eat vegetables bought from supermarkets.'], answer: 1, explain: 'Đoạn 3 chỉ ra rằng trẻ em thường sẵn sàng ăn thử rau củ tự trồng ("happy to try a carrot or a tomato that they have grown themselves"), dù trước đó nhiều em nói không thích ăn rau.' },
        { type: 'mcq', q: 'How do some schools look after the garden in the summer holidays?', options: ['Local companies pay someone to look after it.', 'Teachers come in every weekend to do the work.', 'Families take turns to water the plants.', 'Pupils leave special machines to water everything.'], answer: 2, explain: 'Bài đọc nói rõ rằng \'families take turns to visit and water the plants\'; các phương án về thuê mướn hay giáo viên/máy móc tự làm đều không xuất hiện trong bài.' },
      ],
    },
    {
      id: 'libraries-today', title: 'What Do Libraries Do Today?', topic: 'culture', level: 'A2', emoji: '📚',
      summaryVi: 'Thư viện ngày nay không chỉ cho mượn sách mà còn có máy tính, lớp học, hoạt động cho trẻ em và là nơi gặp gỡ miễn phí của cộng đồng.',
      summaryEn: 'Libraries today do more than lend books: they offer computers, classes and activities for children, and they are a free meeting place for the community.',
      text: "Some people think that libraries are not important any more. After all, we can read the news, find information and even borrow e-books on our phones. But in many towns, the local library is busier than ever. So what do people do there?\n\nOf course, people still go to the library to borrow books. Borrowing is usually free, and you can take home books, magazines, films and sometimes even games. If the library does not have the book you want, the staff can often order it from another library.\n\nBut libraries are not only about books. Most libraries have computers and free internet, which is very useful for people who do not have these at home. Some people use them to look for jobs or to fill in forms for the government. Library staff can help people who are not confident with technology.\n\nLibraries also offer many activities. There are story times for small children, homework clubs for school pupils and language classes for adults. Some libraries lend tools or musical instruments, and a few even have rooms where people can use 3D printers.\n\nFinally, a library is one of the few places in a town where you can sit inside for a long time without paying anything. Students come to study in a quiet place, and older people come to read the newspaper and meet friends. For many people, the library is an important part of community life.",
      keywords: ['borrow', 'e-book', 'staff', 'order', 'confident', 'activity', 'homework club', 'lend', 'instrument', 'community'],
      questions: [
        { type: 'tfng', q: 'Many local libraries are now busier than before.', answer: 'TRUE', explain: 'Bài viết: "in many towns, the local library is busier than ever" → TRUE.' },
        { type: 'tfng', q: 'Library staff can sometimes get books from other libraries.', answer: 'TRUE', explain: 'Bài viết: "the staff can often order it from another library" → TRUE.' },
        { type: 'tfng', q: 'Most libraries charge money for using the internet.', answer: 'FALSE', explain: 'Bài viết nói hầu hết thư viện có "computers and free internet" – internet miễn phí → FALSE.' },
        { type: 'mcq', q: 'Which activity for adults is mentioned in the text?', options: ['Language classes', 'Cooking lessons', 'Story times', 'Sports clubs'], answer: 0, explain: 'Bài viết: "language classes for adults". Story times dành cho trẻ nhỏ; nấu ăn và thể thao không được nhắc đến → đáp án đúng: Language classes.' },
        { type: 'mcq', q: 'According to the last paragraph, why is a library special?', options: ['The library operates around the clock, never closing its doors.', 'It occupies the largest footprint of any structure in the municipality.', 'It offers inexpensive newspapers for purchase at the front desk.', 'People can stay there for a long time without paying.'], answer: 3, explain: 'Bài viết: thư viện là một trong số ít nơi "where you can sit inside for a long time without paying anything".' },
      ],
    },
    {
      id: 'daily-walk', title: 'The Power of a Daily Walk', topic: 'health', level: 'A2', emoji: '🚶',
      summaryVi: 'Đi bộ mỗi ngày là cách vận động đơn giản, miễn phí, tốt cho tim, tâm trạng và giấc ngủ; bài viết gợi ý cách biến đi bộ thành thói quen.',
      summaryEn: 'Walking every day is a simple, free form of exercise that is good for the heart, mood and sleep; the article suggests ways to make walking a habit.',
      text: "Many people want to be healthier, but they do not have time or money for a gym. Doctors often say that one of the best kinds of exercise is also one of the easiest: walking.\n\nWalking is good for the heart, and it helps to keep a healthy weight. Health organisations usually advise adults to do at least 150 minutes of moderate exercise every week. A brisk walk of about 30 minutes on five days a week is one simple way to reach this goal. 'Brisk' means that you walk fast enough to breathe a little harder, but you can still talk.\n\nWalking is good for the mind, too. People who walk regularly often say that they feel calmer and less stressed. Walking outside in daylight may also help you to sleep better at night.\n\nIt is easy to make walking part of your day. You can get off the bus one stop early, take the stairs instead of the lift, or walk with a friend or colleague at lunchtime. Some people like to count their steps with a phone app, but you do not need any special equipment – just comfortable shoes.\n\nThe most important thing is to start slowly and keep going. A short walk every day is better than one very long walk once a month. After a few weeks, many people find that they look forward to their daily walk.",
      keywords: ['exercise', 'healthy weight', 'moderate', 'brisk', 'breathe', 'regularly', 'stressed', 'daylight', 'colleague', 'equipment'],
      questions: [
        { type: 'tfng', q: 'Health organisations usually advise adults to do at least 150 minutes of moderate exercise a week.', answer: 'TRUE', explain: 'Bài viết: "advise adults to do at least 150 minutes of moderate exercise every week" → TRUE.' },
        { type: 'tfng', q: 'During a brisk walk, you should be too out of breath to talk.', answer: 'FALSE', explain: 'Bài viết giải thích "brisk" là đi đủ nhanh để thở mạnh hơn một chút "but you can still talk" – vẫn nói chuyện được → FALSE.' },
        { type: 'tfng', q: 'Walking in the morning is better than walking in the evening.', answer: 'NOT GIVEN', explain: 'Bài viết chỉ nói đi bộ ngoài trời lúc có ánh sáng ban ngày có thể giúp ngủ ngon, không so sánh buổi sáng với buổi tối → NOT GIVEN.' },
        { type: 'mcq', q: 'Which of these is NOT given as a way to walk more?', options: ['Getting off the bus one stop early', 'Taking the stairs instead of the lift', 'Walking with a colleague at lunchtime', 'Walking the dog every evening'], answer: 3, explain: 'Bài viết gợi ý xuống xe buýt sớm một trạm, đi cầu thang bộ, đi bộ cùng đồng nghiệp giờ trưa; không nhắc đến việc dắt chó đi dạo → đáp án đúng: Walking the dog every evening.' },
        { type: 'mcq', q: 'What is the writer\'s main advice in the last paragraph?', options: ['Walk a very long way once a month.', 'Buy special equipment before you start.', 'Start slowly and walk regularly.', 'Always use a phone app.'], answer: 2, explain: 'Bài viết: "start slowly and keep going. A short walk every day is better than one very long walk once a month" → đáp án đúng: Start slowly and walk regularly..' },
      ],
    },
    {
      id: 'street-food', title: 'Street Food Around the World', topic: 'culture', level: 'A2', emoji: '🍜',
      summaryVi: 'Đồ ăn đường phố có mặt ở khắp nơi trên thế giới: rẻ, nhanh, mang đậm văn hóa địa phương; bài viết cũng nhắc đến vấn đề vệ sinh và cách chọn quầy ăn an toàn.',
      summaryEn: 'Street food can be found all over the world: it is cheap, fast and full of local culture; the article also mentions hygiene and how to choose a safe stall.',
      text: "In cities all over the world, you can buy food on the street. In Mexico, people eat tacos from small stands. In Turkey, you can buy hot bread rings covered in sesame seeds. And in Vietnam, many people start the day with a bowl of noodle soup at a small stall on the pavement.\n\nWhy is street food so popular? First, it is usually cheap, so students and workers can eat well without spending much money. Second, it is fast. You can buy something on your way to work and eat it in a few minutes. Third, many people say that street food is the best way to learn about a country's culture, because the recipes are often very old and are passed down in families.\n\nFor many sellers, a food stall is also an important business. With a small cart and a few pots, a person can earn money for the whole family. In some cities, street food is so famous that it attracts tourists from other countries.\n\nHowever, some visitors worry about food safety. Here are a few simple tips. Choose a stall where many local people are eating, because busy stalls usually sell fresh food. Watch how the food is cooked, and choose dishes that are served very hot. If you have a weak stomach, be careful with ice and raw vegetables.\n\nWith a little care, street food can be one of the most enjoyable parts of any trip.",
      keywords: ['stand', 'stall', 'pavement', 'recipe', 'pass down', 'cart', 'earn', 'attract', 'food safety', 'raw'],
      questions: [
        { type: 'tfng', q: 'Street food is usually expensive.', answer: 'FALSE', explain: 'Bài viết: "it is usually cheap" – đồ ăn đường phố thường rẻ → FALSE.' },
        { type: 'tfng', q: 'Many street food recipes are passed down in families.', answer: 'TRUE', explain: 'Bài viết: "the recipes are often very old and are passed down in families" → TRUE.' },
        { type: 'tfng', q: 'Street food sellers must have a licence in most cities.', answer: 'NOT GIVEN', explain: 'Bài viết không nói gì về giấy phép bán hàng → NOT GIVEN.' },
        { type: 'mcq', q: 'Why does the writer suggest choosing a busy stall?', options: ['Busy stalls are usually cheaper.', 'Busy stalls usually sell fresh food.', 'Busy stalls have more seats.', 'Busy stalls serve bigger portions.'], answer: 1, explain: 'Bài viết: chọn quầy có nhiều người địa phương ăn "because busy stalls usually sell fresh food".' },
        { type: 'mcq', q: 'What should people with a weak stomach be careful with?', options: ['Ice and raw vegetables', 'Noodle soup', 'Very hot dishes', 'Bread with sesame seeds'], answer: 0, explain: 'Bài viết: "If you have a weak stomach, be careful with ice and raw vegetables". Món nóng thì lại được khuyên nên chọn.' },
      ],
    },
    /* ===================== B1 (bổ sung) ===================== */
    {
      id: 'teen-sleep', title: 'Why Teenagers Find It Hard to Wake Up', topic: 'health', level: 'B1', emoji: '😴',
      summaryVi: 'Đồng hồ sinh học của thanh thiếu niên lùi muộn hơn nên khó ngủ sớm và khó dậy sớm; bài viết giải thích nguyên nhân và các cách giúp ngủ đủ giấc.',
      summaryEn: 'Teenagers\' body clocks shift later, so they find it hard to fall asleep early and to get up early; the article explains why and suggests ways to get enough sleep.',
      text: "Many parents complain that their teenage children stay up late and then cannot get out of bed in the morning. It is easy to think that teenagers are simply lazy. However, sleep scientists say that the real reason is biological.\n\nEveryone has a body clock that tells us when to feel sleepy and when to feel awake. During the teenage years, this clock moves later. As a result, many teenagers do not feel tired until eleven o'clock at night or even later. At the same time, most still need around eight to ten hours of sleep a night. If school starts early, they simply do not get enough rest.\n\nLack of sleep can have serious effects. Tired students find it harder to concentrate and remember new information. They may also feel more stressed or get angry more easily. Some research suggests that sleepy teenagers are more likely to have accidents when they ride a bike or drive.\n\nFor this reason, some schools have experimented with starting lessons later in the morning. Teachers in these schools often report that students are more alert in class.\n\nTeenagers can also help themselves. Experts recommend going to bed at the same time every night, even at weekends, and avoiding bright screens for an hour before sleep. Getting some daylight in the morning can also help the body clock to stay on time.",
      keywords: ['complain', 'biological', 'body clock', 'sleepy', 'rest', 'concentrate', 'stressed', 'alert', 'recommend', 'daylight'],
      questions: [
        { type: 'tfng', q: 'Sleep scientists believe that teenagers who sleep late are usually lazy.', answer: 'FALSE', explain: 'Bài viết: dễ nghĩ rằng thanh thiếu niên lười, "However, sleep scientists say that the real reason is biological" – lý do là sinh học, không phải lười → FALSE.' },
        { type: 'tfng', q: 'Most teenagers need around eight to ten hours of sleep a night.', answer: 'TRUE', explain: 'Bài viết: "most still need around eight to ten hours of sleep a night" → TRUE.' },
        { type: 'tfng', q: 'All schools in the country now start lessons later in the morning.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói "some schools have experimented with starting lessons later"; không có thông tin tất cả các trường đã đổi giờ → NOT GIVEN.' },
        { type: 'mcq', q: 'According to the text, what happens to the body clock during the teenage years?', options: ['It stops working properly.', 'It moves later.', 'It moves earlier.', 'It becomes the same as an adult\'s.'], answer: 1, explain: 'Bài viết: "During the teenage years, this clock moves later" – đồng hồ sinh học lùi muộn hơn, nên các phương án còn lại sai.' },
        { type: 'mcq', q: 'Which piece of advice is given to teenagers?', options: ['Sleep in late whenever you feel tired.', 'Check your phone in bed before sleeping.', 'Go to bed at the same time every night.', 'Stay in dark rooms through the morning.'], answer: 2, explain: 'Chuyên gia khuyên thanh thiếu niên nên đi ngủ vào cùng một giờ mỗi tối (kể cả cuối tuần) để giữ đồng hồ sinh học ổn định.' },
      ],
    },
    {
      id: 'night-markets', title: 'The Magic of Night Markets', topic: 'culture', level: 'B1', emoji: '🏮',
      summaryVi: 'Chợ đêm là nơi mua sắm, ăn uống và gặp gỡ ở nhiều nước châu Á; bài viết nói về sức hút, lợi ích kinh tế và những thách thức như rác thải, tiếng ồn.',
      summaryEn: 'Night markets are places to shop, eat and meet people in many Asian countries; the article describes their appeal, their economic benefits and challenges such as litter and noise.',
      text: "When the sun goes down in many Asian cities, quiet streets and car parks suddenly come to life. Stalls appear, lights are switched on, and the smell of grilled food fills the air. Welcome to the night market.\n\nNight markets have a long history in countries such as Taiwan, Thailand and Vietnam. In hot climates, it makes sense to shop and eat in the evening, when the temperature is lower. For many families, a trip to the night market is a weekly tradition.\n\nThe main attraction for most visitors is the food. Visitors can try dozens of local dishes in one evening, often for very low prices. But night markets also sell clothes, phone cases, toys and handmade souvenirs, and many people enjoy bargaining with the sellers.\n\nNight markets are important for the local economy, too. Renting a stall is much cheaper than opening a shop, so they give young people and small businesses a chance to start their own business. Some successful sellers later open restaurants.\n\nHowever, night markets also create problems. Residents who live nearby sometimes complain about noise and traffic late at night. Large amounts of plastic bags and food boxes are thrown away every evening. In response, some markets now ask sellers to use paper packaging and have added more bins and recycling points.\n\nDespite these challenges, night markets remain one of the best ways to experience the everyday life of a city.",
      keywords: ['stall', 'come to life', 'grilled', 'tradition', 'attraction', 'souvenir', 'bargain', 'economy', 'packaging', 'recycling'],
      questions: [
        { type: 'tfng', q: 'In hot countries, the evening is a comfortable time to shop.', answer: 'TRUE', explain: 'Bài viết: "In hot climates, it makes sense to shop and eat in the evening, when the temperature is lower" → TRUE.' },
        { type: 'tfng', q: 'Food at night markets is usually expensive.', answer: 'FALSE', explain: 'Bài viết nói khách có thể thử nhiều món "often for very low prices" – giá thường rất rẻ → FALSE.' },
        { type: 'tfng', q: 'Most night markets open every day of the year.', answer: 'NOT GIVEN', explain: 'Bài viết không nói chợ đêm mở bao nhiêu ngày trong năm; chỉ nói với nhiều gia đình, đi chợ đêm là thói quen hằng tuần → NOT GIVEN.' },
        { type: 'mcq', q: 'Why are night markets good for young people who want to start a business?', options: ['Renting a stall costs much less than opening a shop.', 'They receive direct financial grants from the city.', 'They do not need to register or pay any daily fees.', 'Operating a stall guarantees immediate high profits.'], answer: 0, explain: 'Đoạn 4 nêu rõ "Renting a stall is much cheaper than opening a shop, so they give young people and small businesses a chance to start their own business"; các thông tin về hỗ trợ tài chính hay miễn phí hoàn toàn không có trong bài.' },
        { type: 'mcq', q: 'How have some markets responded to the problem of waste?', options: ['By stopping people from bringing plastic bottles', 'By hiring extra workers to clean nearby streets', 'By closing down all stalls that prepare hot food', 'By asking sellers to use paper packaging'], answer: 3, explain: 'Bài đọc đề cập chợ đêm ứng phó bằng cách \'ask sellers to use paper packaging and have added more bins\'; các phương án cấm bán đồ ăn hay cấm mang chai nhựa là suy diễn sai.' },
      ],
    },
    {
      id: 'learning-apps', title: 'Can an App Teach You a Language?', topic: 'technology', level: 'B1', emoji: '📱',
      summaryVi: 'Ứng dụng học ngoại ngữ giúp luyện tập đều đặn và tiện lợi, nhưng khó thay thế hoàn toàn việc nói chuyện thật; bài viết gợi ý cách kết hợp hiệu quả.',
      summaryEn: 'Language-learning apps make regular practice easy and convenient, but they cannot fully replace real conversation; the article suggests how to combine the two effectively.',
      text: "Millions of people now use apps on their phones to learn a new language. They complete short lessons on the bus, during their lunch break or just before bed. But can an app really teach you to speak a language?\n\nApps have some clear advantages. They are usually cheap or free, and you can study whenever you have a few minutes. Many apps send reminders and give points or rewards, which encourages users to practise every day. Regular practice is important, because the brain remembers new words better when it sees them several times over a period of days.\n\nApps are especially good for building vocabulary and learning basic grammar. Some also use speech recognition to check your pronunciation.\n\nHowever, there are limits to what an app can do. Real conversations are fast and unpredictable. People speak with different accents, use slang and interrupt each other. An app cannot fully prepare you for this. In addition, some learners collect points every day without making much real progress, because the lessons are too easy for them.\n\nMost teachers believe that the best approach is to combine an app with other activities. You could use the app for ten minutes a day to learn new words, then use them in real situations: chatting with a language partner, watching videos without subtitles or writing short messages. In this way, the app becomes a useful tool rather than the whole course.",
      keywords: ['complete', 'advantage', 'reminder', 'reward', 'encourage', 'vocabulary', 'speech recognition', 'unpredictable', 'accent', 'subtitles'],
      questions: [
        { type: 'tfng', q: 'Language apps are usually cheap or free.', answer: 'TRUE', explain: 'Bài viết: "They are usually cheap or free" → TRUE.' },
        { type: 'tfng', q: 'Apps fully prepare learners for real conversations.', answer: 'FALSE', explain: 'Bài viết: hội thoại thật nhanh và khó đoán, "An app cannot fully prepare you for this" → FALSE.' },
        { type: 'tfng', q: 'Most language app users stop using the app after one month.', answer: 'NOT GIVEN', explain: 'Bài viết không đưa thông tin về việc người dùng bỏ ứng dụng sau bao lâu → NOT GIVEN.' },
        { type: 'mcq', q: 'Why does the writer say regular practice is important?', options: ['Apps give more points for daily practice.', 'The brain remembers words better after seeing them several times over some days.', 'Teachers check the app every day.', 'Lessons become easier every day.'], answer: 1, explain: 'Bài viết: "the brain remembers new words better when it sees them several times over a period of days". Điểm thưởng chỉ là cách ứng dụng khuyến khích, không phải lý do việc luyện đều quan trọng.' },
        { type: 'mcq', q: 'What do most teachers recommend?', options: ['Using an app instead of a teacher', 'Studying only with an app for several hours a day', 'Combining an app with real communication', 'Avoiding apps completely'], answer: 2, explain: 'Bài viết: "the best approach is to combine an app with other activities", ví dụ nói chuyện với bạn học, xem video không phụ đề → đáp án đúng: Combining an app with real communication.' },
      ],
    },
    /* ===================== A2/B1 (bổ sung đợt 3) ===================== */
    {
      id: 'first-job', title: 'My First Part-Time Job', topic: 'work', level: 'A2', emoji: '☕',
      summaryVi: 'Một sinh viên kể về công việc làm thêm đầu tiên ở quán cà phê: những khó khăn ban đầu, kỹ năng học được và lời khuyên cho người mới đi làm.',
      summaryEn: 'A student describes their first part-time job in a café: the early difficulties, the skills they learned and advice for people starting work.',
      text: "When I was eighteen, I got my first part-time job in a small café near my university. I worked there three evenings a week and on Saturday mornings.\n\nThe first week was very difficult. I had to remember the names of more than twenty drinks, and the coffee machine looked very complicated. On my second day, I gave a customer tea instead of hot chocolate. I felt terrible, but the manager just smiled and said, \"Everyone makes mistakes at the beginning.\"\n\nAfter a month, the job became much easier. I learned how to make drinks quickly, how to use the cash register and how to talk politely to customers, even when they were in a hurry. I also learned to plan my time better, because I had to finish my homework before my evening shifts.\n\nThe money was not very good, but it was enough to pay for my books and my bus pass. The best part of the job was my colleagues. We often had dinner together after work, and some of them are still my good friends today.\n\nMy advice for anyone starting their first job is simple: ask questions when you don't understand something, and don't worry too much about small mistakes.",
      keywords: ['part-time', 'shift', 'complicated', 'customer', 'manager', 'cash register', 'politely', 'in a hurry', 'colleague', 'advice'],
      questions: [
        { type: 'tfng', q: 'The writer worked at the café every evening.', answer: 'FALSE', explain: 'Bài viết: "I worked there three evenings a week and on Saturday mornings" – chỉ ba buổi tối mỗi tuần, không phải tối nào cũng làm → FALSE.' },
        { type: 'tfng', q: 'The manager was angry about the mistake with the drinks.', answer: 'FALSE', explain: 'Người quản lý "just smiled and said, Everyone makes mistakes at the beginning" – không hề tức giận → FALSE.' },
        { type: 'tfng', q: 'The café was the most popular one near the university.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói đây là "a small café near my university"; không có thông tin quán có đông khách nhất hay không → NOT GIVEN.' },
        { type: 'mcq', q: 'What did the writer use the money for?', options: ['Books and a bus pass', 'Rent and food', 'A new phone', 'A holiday with friends'], answer: 0, explain: 'Bài viết: tiền lương "was enough to pay for my books and my bus pass". Tiền thuê nhà, điện thoại hay kỳ nghỉ không được nhắc tới → đáp án đúng: Books and a bus pass.' },
        { type: 'mcq', q: 'What does the writer say was the best part of the job?', options: ['The money', 'The free drinks', 'The short hours', 'The colleagues'], answer: 3, explain: 'Bài viết: "The best part of the job was my colleagues". Tác giả còn nói lương "not very good", nên phương án tiền lương sai.' },
      ],
    },
    {
      id: 'home-recycling', title: 'Recycling Starts at Home', topic: 'environment', level: 'A2', emoji: '♻️',
      summaryVi: 'Hướng dẫn phân loại rác tại nhà: giấy, nhựa, kim loại, thủy tinh và rác hữu cơ; vì sao cần rửa sạch vật dụng và những thứ không nên bỏ vào thùng tái chế.',
      summaryEn: 'A guide to sorting rubbish at home: paper, plastic, metal, glass and food waste; why items should be rinsed and what should not go in the recycling bin.',
      text: "Many cities now ask people to separate their rubbish at home. This helps more materials to be recycled instead of going to landfill. But what should go in each bin?\n\nPaper and cardboard are usually easy to recycle. Newspapers, cereal boxes and old letters can all go in the paper bin. However, paper that is dirty with food, such as a pizza box with oil on it, should go in the normal rubbish.\n\nMany plastic bottles and food containers can be recycled too, but they need to be empty and clean. A quick rinse with water is usually enough. Metal cans and glass jars are also accepted in most places. Remember to take off the lids first, because they are often made of a different material.\n\nFood waste, such as fruit peel and vegetable leftovers, can be collected separately in some cities. It is turned into compost, which farmers and gardeners use to help plants grow.\n\nSome things should never go in a recycling bin. Batteries, light bulbs and old phones can be dangerous and need special collection points. Many supermarkets have boxes for batteries near the entrance.\n\nIt can take a few weeks to get used to sorting your rubbish, but after that it becomes a normal habit.",
      keywords: ['separate', 'landfill', 'cardboard', 'container', 'rinse', 'jar', 'lid', 'leftovers', 'compost', 'collection point'],
      questions: [
        { type: 'tfng', q: 'A pizza box with oil on it should go in the paper bin.', answer: 'FALSE', explain: 'Bài viết: giấy bẩn dính thức ăn "such as a pizza box with oil on it, should go in the normal rubbish" – phải bỏ vào rác thường → FALSE.' },
        { type: 'tfng', q: 'Plastic bottles should be cleaned before they are recycled.', answer: 'TRUE', explain: 'Bài viết: chai nhựa "need to be empty and clean. A quick rinse with water is usually enough" → TRUE.' },
        { type: 'tfng', q: 'All cities collect food waste separately.', answer: 'FALSE', explain: 'Bài viết: rác thực phẩm được thu gom riêng "in some cities" – chỉ ở một số thành phố, không phải tất cả → FALSE.' },
        { type: 'mcq', q: 'Why should you take the lids off jars?', options: ['They are usually too sharp to handle.', 'They are often made of a different material.', 'They will break glass jars inside bins.', 'They trap dirty air inside the containers.'], answer: 1, explain: 'Đoạn văn hướng dẫn tháo nắp lọ thủy tinh vì chúng thường được làm từ một loại vật liệu khác, không cùng loại để tái chế chung.' },
        { type: 'mcq', q: 'Where can you often take old batteries?', options: ['To standard household recycling bins', 'To ordinary general rubbish containers', 'To boxes in many supermarkets', 'To local food waste compost bins'], answer: 2, explain: 'Đoạn 5 nêu rõ pin cần điểm thu gom riêng và "Many supermarkets have boxes for batteries near the entrance", đồng thời nhấn mạnh không được vứt pin vào thùng tái chế hay rác thông thường vì nguy hiểm.' },
      ],
    },
    {
      id: 'learning-to-swim', title: 'Learning to Swim as an Adult', topic: 'sport', level: 'A2', emoji: '🏊',
      summaryVi: 'Nhiều người lớn chưa biết bơi vì ngại hoặc sợ nước; bài viết chia sẻ lợi ích của việc học bơi và cách bắt đầu từ từ để tự tin hơn.',
      summaryEn: 'Many adults cannot swim because they feel embarrassed or are afraid of water; the article shares the benefits of learning to swim and how to start slowly and build confidence.',
      text: "Not everyone learns to swim as a child. Some people grew up far from the sea or a swimming pool, and others had a bad experience in the water when they were young. As adults, many of them feel embarrassed to start.\n\nHowever, it is never too late to learn. Swimming is a useful life skill, and it is also excellent exercise. It works almost every muscle in the body, but it is gentle on the knees and back, so it is suitable for people of all ages.\n\nMany swimming pools offer special classes for adult beginners. These classes are usually small, and the teachers understand that some students are nervous. In the first lessons, students often stay in the shallow end of the pool. They practise breathing out under the water and floating on their backs before they try to swim any distance.\n\nProgress can be slow at first, and that is normal. Instructors say the most important thing is to come regularly, for example once or twice a week. Many adult learners say that they feel proud and more confident after a few months, not only in the water but also in other parts of their lives.\n\nIf you would like to learn, start by asking at your local pool. You might be surprised how many other adults are learning too.",
      keywords: ['embarrassed', 'life skill', 'muscle', 'gentle', 'beginner', 'nervous', 'shallow', 'float', 'instructor', 'confident'],
      questions: [
        { type: 'tfng', q: 'Some adults cannot swim because they had a bad experience in the water as children.', answer: 'TRUE', explain: 'Bài viết: "others had a bad experience in the water when they were young" → TRUE.' },
        { type: 'tfng', q: 'Swimming is bad for people with knee problems.', answer: 'FALSE', explain: 'Bài viết: bơi "is gentle on the knees and back, so it is suitable for people of all ages" – nhẹ nhàng với đầu gối → FALSE.' },
        { type: 'tfng', q: 'Adult swimming classes are cheaper than children\'s classes.', answer: 'NOT GIVEN', explain: 'Bài viết không so sánh học phí giữa lớp người lớn và lớp trẻ em → NOT GIVEN.' },
        { type: 'mcq', q: 'What do students usually do in their first lessons?', options: ['Practise breathing and floating in the shallow end', 'Try to jump safely into the deep water alone', 'Complete a series of short races across the pool', 'Learn how to dive properly from the high board'], answer: 0, explain: 'Đoạn văn nêu rõ ở các buổi học đầu tiên người lớn ở \'the shallow end\' và tập thở, nổi ngửa; các hoạt động như nhảy cầu, bơi thi hay bơi ở vùng nước sâu chỉ diễn ra sau đó.' },
        { type: 'mcq', q: 'According to instructors, what is the most important thing?', options: ['Practising breathing correctly', 'Gaining confidence rapidly', 'Exercising every single day', 'Coming to lessons regularly'], answer: 3, explain: 'Bài đọc nêu rõ: "Instructors say the most important thing is to come regularly, for example once or twice a week". Các lựa chọn khác như tập mỗi ngày hay tiến bộ nhanh không phải là điều quan trọng nhất theo lời giáo viên.' },
      ],
    },
    {
      id: 'volunteering', title: 'Why People Volunteer', topic: 'society', level: 'B1', emoji: '🤝',
      summaryVi: 'Vì sao nhiều người dành thời gian làm tình nguyện: giúp cộng đồng, học kỹ năng mới, gặp gỡ bạn bè và cải thiện sức khỏe tinh thần; kèm lời khuyên chọn hoạt động phù hợp.',
      summaryEn: 'Why many people give their time as volunteers: to help the community, learn new skills, make friends and improve their mental health – with tips on choosing the right activity.',
      text: "Every weekend, millions of people around the world give their time for free. They clean beaches, help in hospitals, teach children to read or cook meals for people who are homeless. Why do they do it?\n\nThe most common reason is simple: people want to help others and to make their community a better place. Many volunteers say that they feel they are giving something back, especially if they once received help themselves.\n\nVolunteering can also be useful for the volunteers. Young people often gain skills and experience that look good on a job application, such as teamwork, organisation and communication. Some organisations even provide training, for example in first aid.\n\nThere are social benefits, too. Volunteering is a good way to meet people with similar interests, which can be especially valuable for someone who has just moved to a new city or retired from work.\n\nFinally, several studies have found that people who volunteer regularly tend to report higher levels of happiness. Researchers think this may be because helping others gives people a sense of purpose, although they point out that happier people may also be more likely to volunteer in the first place.\n\nIf you are thinking about volunteering, choose something that matches your interests and the time you really have. It is better to give two hours a month for a year than ten hours a week for only a few weeks.",
      keywords: ['volunteer', 'homeless', 'community', 'give something back', 'gain', 'application', 'organisation', 'retire', 'sense of purpose', 'in the first place'],
      questions: [
        { type: 'tfng', q: 'Most volunteers say their main reason is to help other people.', answer: 'TRUE', explain: 'Bài viết: "The most common reason is simple: people want to help others and to make their community a better place" → TRUE.' },
        { type: 'tfng', q: 'All volunteer organisations provide first aid training.', answer: 'FALSE', explain: 'Bài viết: "Some organisations even provide training" – chỉ một số tổ chức, không phải tất cả → FALSE.' },
        { type: 'tfng', q: 'Researchers are sure that volunteering makes people happier.', answer: 'FALSE', explain: 'Bài viết nói các nhà nghiên cứu "think this may be because…" và lưu ý người vốn đã hạnh phúc có thể dễ đi tình nguyện hơn – họ không chắc chắn về quan hệ nhân quả → FALSE.' },
        { type: 'mcq', q: 'Why might volunteering be especially valuable for someone who has just retired?', options: ['It provides formal training in job application skills.', 'It is a way to meet people with similar interests.', 'It offers regular financial support for daily expenses.', 'It requires a fixed commitment of ten hours every week.'], answer: 1, explain: 'Đoạn 4 nêu rõ tình nguyện là cách tốt "to meet people with similar interests", điều này đặc biệt ý nghĩa với người vừa mới nghỉ hưu. Các phương án về đào tạo xin việc hay hỗ trợ tài chính không đúng với hoàn cảnh người đã về hưu.' },
        { type: 'mcq', q: 'What advice does the writer give at the end?', options: ['Volunteer as many hours as possible.', 'Only volunteer in hospitals.', 'Choose an activity that fits your interests and available time.', 'Volunteer only when you are young.'], answer: 2, explain: 'Bài viết: "choose something that matches your interests and the time you really have", và làm đều đặn ít giờ tốt hơn làm nhiều trong vài tuần – trái với phương án "càng nhiều giờ càng tốt" → đáp án đúng: Choose an activity that fits your interests and available time..' },
      ],
    },
    {
      id: 'why-we-dream', title: 'Why Do We Dream?', topic: 'science', level: 'B1', emoji: '🌙',
      summaryVi: 'Giấc mơ thường xuất hiện trong giai đoạn ngủ REM; các nhà khoa học đưa ra nhiều giả thuyết về chức năng của giấc mơ nhưng chưa có câu trả lời chắc chắn.',
      summaryEn: 'Dreams usually happen during REM sleep; scientists have put forward many theories about what dreams are for, but there is no definite answer yet.',
      text: "Almost everyone dreams, even people who say they never do. The difference is that some people remember their dreams and others forget them within minutes of waking up.\n\nScientists know that many of our most vivid dreams happen during a stage of sleep called REM sleep. REM stands for \"rapid eye movement\", because during this stage our eyes move quickly behind our closed eyelids. Our brain is very active during REM sleep, but most of the muscles in our body are relaxed and cannot move. Many researchers believe this stops us from acting out our dreams.\n\nBut why do we dream at all? There is still no single answer. One popular idea is that dreams help the brain to process memories and emotions from the day. Another suggests that dreams allow us to practise reacting to difficult situations in a safe way. A third theory says that dreams may simply be a side effect of the brain's activity during sleep, with no special purpose.\n\nWhat scientists do agree on is that good sleep is important for both the body and the mind. Adults who regularly sleep too little often find it harder to concentrate and control their mood.\n\nSo, the next time you have a strange dream, you can enjoy the mystery. Even the experts are still trying to understand it.",
      keywords: ['vivid', 'stage', 'rapid', 'eyelid', 'relaxed', 'act out', 'process', 'emotion', 'side effect', 'mystery'],
      questions: [
        { type: 'tfng', q: 'People who say they never dream probably do dream but forget it.', answer: 'TRUE', explain: 'Bài viết: "Almost everyone dreams, even people who say they never do" – khác biệt là có người quên giấc mơ ngay sau khi thức dậy → TRUE.' },
        { type: 'tfng', q: 'During REM sleep, the brain is not very active.', answer: 'FALSE', explain: 'Bài viết: "Our brain is very active during REM sleep" – não hoạt động mạnh, chỉ có cơ bắp là thả lỏng → FALSE.' },
        { type: 'tfng', q: 'Children dream more often than adults.', answer: 'NOT GIVEN', explain: 'Bài viết không so sánh tần suất mơ giữa trẻ em và người lớn → NOT GIVEN.' },
        { type: 'mcq', q: 'What do many researchers believe is the purpose of relaxed muscles during REM sleep?', options: ['To stop us from acting out our dreams', 'To help our brain process daily memories', 'To allow the body to recover from stress', 'To keep our breathing steady during sleep'], answer: 0, explain: 'Đoạn văn nêu rõ cơ bắp thư giãn để ngăn cản việc cử động theo giấc mơ: \'Many researchers believe this stops us from acting out our dreams.\' Các phương án khác nói về chức năng chung của giấc ngủ hoặc giả thuyết khác về giấc mơ chứ không giải thích cho cơ bắp thả lỏng.' },
        { type: 'mcq', q: 'What does the text say about the reason why we dream?', options: ['Scientists have proved that dreams process memories.', 'Dreams only happen when we are stressed.', 'Dreams have no purpose at all.', 'There are several theories but no single answer.'], answer: 3, explain: 'Bài viết: "There is still no single answer" rồi nêu ba giả thuyết. Ý "xử lý ký ức" và "không có mục đích" chỉ là các giả thuyết, chưa được chứng minh.' },
      ],
    },
    /* ===== Lô 16 (tự biên soạn): 15 bài đọc ngắn – ưu tiên đời sống Mỹ & công sở ===== */
    {
      id: 'farmers-market', title: 'A Morning at the Farmers\' Market', topic: 'food', level: 'A2', emoji: '🥕',
      summaryVi: 'Một buổi sáng thứ Bảy ở chợ nông sản: người bán là nông dân địa phương, rau quả theo mùa, có thể nếm thử và nói chuyện với người trồng.',
      summaryEn: 'A Saturday morning at a farmers\' market: the sellers are local farmers, the fruit and vegetables are seasonal, and you can taste them and talk to the growers.',
      text: "Every Saturday morning, Elena walks to the farmers' market in the center of her town. The market opens at eight o'clock and closes at one, but she likes to go early because the best fruit sells out quickly.\n\nAt a farmers' market, the sellers are usually the people who grew the food. Elena buys tomatoes and lettuce from an old farmer called Mr. Diaz, who has a farm about thirty minutes away. He always tells her which vegetables are best that week.\n\nThe food changes with the seasons. In summer, there are strawberries, peaches and corn. In autumn, there are apples and pumpkins. Some sellers also bring fresh bread, honey and cheese.\n\nElena likes the market because she can taste things before she buys them, and she knows that the food is fresh. It is sometimes a little more expensive than the supermarket, but she thinks it is worth it. She also enjoys meeting her neighbors there and listening to the music of a local band.",
      keywords: ['farmers\' market', 'sell out', 'grow', 'lettuce', 'season', 'peach', 'pumpkin', 'honey', 'taste', 'worth it'],
      questions: [
        { type: 'tfng', q: 'The market is open all day on Saturday.', answer: 'FALSE', explain: 'Bài viết: "The market opens at eight o\'clock and closes at one" – chợ chỉ mở buổi sáng đến 1 giờ chiều → FALSE.' },
        { type: 'tfng', q: 'Mr. Diaz grows the vegetables that he sells.', answer: 'TRUE', explain: 'Bài viết: người bán "are usually the people who grew the food", và Mr. Diaz có trang trại cách khoảng 30 phút → TRUE.' },
        { type: 'tfng', q: 'Elena always pays with cash at the market.', answer: 'NOT GIVEN', explain: 'Bài viết không nhắc đến cách Elena trả tiền → NOT GIVEN.' },
        { type: 'mcq', q: 'Why does Elena go to the market early?', options: ['Because the market is less crowded', 'Because the best fruit sells out quickly', 'Because the band plays in the morning', 'Because she works in the afternoon'], answer: 1, explain: 'Bài viết: "she likes to go early because the best fruit sells out quickly" – trái cây ngon nhất bán hết nhanh.' },
        { type: 'mcq', q: 'What does Elena think about the prices at the market?', options: ['They are far lower than prices in the grocery store.', 'They are far too expensive compared to supermarkets.', 'They are sometimes higher, but the food is worth it.', 'They are exactly the same as in ordinary grocery stores.'], answer: 2, explain: 'Bài đọc viết: "It is sometimes a little more expensive than the supermarket, but she thinks it is worth it", nghĩa là giá đôi khi cao hơn nhưng đồ ăn hoàn toàn xứng đáng.' },
      ],
    },
    {
      id: 'bank-account', title: 'Opening a Bank Account', topic: 'society', level: 'A2', emoji: '🏦',
      summaryVi: 'Kenji mở tài khoản ngân hàng lần đầu ở Mỹ: chuẩn bị giấy tờ, chọn tài khoản thanh toán và tiết kiệm, nhận thẻ ghi nợ.',
      summaryEn: 'Kenji opens a bank account in the US for the first time: preparing documents, choosing a checking and a savings account, and getting a debit card.',
      text: "When Kenji moved to the United States for his new job, one of the first things he needed was a bank account. His company wanted to pay his salary directly into an account every two weeks.\n\nKenji made an appointment at a bank near his apartment. Before he went, he checked the bank's website to see what documents he needed. He took his passport, a letter from his employer and his lease, which showed his new address.\n\nAt the bank, a friendly employee called Mrs. Lopez explained the different accounts. A checking account is for everyday spending and paying bills. A savings account is for money that you want to keep for the future. Kenji decided to open both.\n\nMrs. Lopez told him that his debit card would arrive by mail in about a week. Until then, he could use the bank's app on his phone to check his balance. Kenji was happy that everything took less than an hour.",
      keywords: ['bank account', 'salary', 'appointment', 'document', 'employer', 'lease', 'checking account', 'savings account', 'debit card', 'balance'],
      questions: [
        { type: 'tfng', q: 'Kenji\'s company pays his salary every month.', answer: 'FALSE', explain: 'Bài viết: công ty trả lương "every two weeks" – hai tuần một lần, không phải hằng tháng → FALSE.' },
        { type: 'tfng', q: 'Kenji used his lease to prove his address.', answer: 'TRUE', explain: 'Bài viết: anh mang "his lease, which showed his new address" → TRUE.' },
        { type: 'tfng', q: 'Mrs. Lopez has worked at the bank for many years.', answer: 'NOT GIVEN', explain: 'Bài viết chỉ nói bà là nhân viên thân thiện, không nói bà làm ở ngân hàng bao lâu → NOT GIVEN.' },
        { type: 'mcq', q: 'What is a checking account used for?', options: ['Everyday spending and paying bills', 'Saving money for the future', 'Sending money to other countries', 'Borrowing money from the bank'], answer: 0, explain: 'Bài viết: "A checking account is for everyday spending and paying bills." → đáp án đúng: Everyday spending and paying bills.' },
        { type: 'mcq', q: 'How could Kenji check his balance before his card arrived?', options: ['By requesting regular updates via postal letters', 'By asking Mrs. Lopez directly over the telephone', 'By speaking with bank staff in the local branch', 'By using the bank\'s app on his phone'], answer: 3, explain: 'Bài viết: "he could use the bank\'s app on his phone to check his balance" → đáp án đúng: By using the bank\'s app on his phone.' },
      ],
    },
    {
      id: 'taking-the-bus', title: 'Taking the Bus in a New City', topic: 'travel', level: 'A2', emoji: '🚌',
      summaryVi: 'Hướng dẫn đơn giản để đi xe buýt ở thành phố mới: xem lộ trình trên ứng dụng, mua vé/thẻ, bấm chuông xuống xe, nhường chỗ.',
      summaryEn: 'A simple guide to taking the bus in a new city: checking the route in an app, buying a ticket or card, pressing the bell to get off and giving up your seat.',
      text: "Taking the bus in a new city can feel difficult at first, but it is usually cheap and easy once you know how it works.\n\nFirst, find out which bus you need. Most cities have a free app or website that shows bus routes and times. You type where you are and where you want to go, and the app tells you which bus to take and where to wait.\n\nNext, think about your ticket. In some cities, you pay the driver with exact change when you get on. In many others, you can buy a travel card and tap it on a machine near the door. A travel card is often cheaper if you take the bus every day.\n\nOn the bus, watch the screen or listen for the name of your stop. When your stop is next, press the button or pull the cord to tell the driver. If the bus is busy, offer your seat to older passengers or people with small children. It is a small thing, but it makes the trip nicer for everyone.",
      keywords: ['route', 'exact change', 'travel card', 'tap', 'stop', 'press the button', 'cord', 'passenger', 'offer your seat', 'trip'],
      questions: [
        { type: 'tfng', q: 'Bus apps can show you where to wait for your bus.', answer: 'TRUE', explain: 'Bài viết: ứng dụng "tells you which bus to take and where to wait" → TRUE.' },
        { type: 'tfng', q: 'In every city, you must pay the driver in cash.', answer: 'FALSE', explain: 'Bài viết: chỉ "In some cities" trả tiền mặt cho tài xế; nhiều nơi khác dùng thẻ đi lại → FALSE.' },
        { type: 'tfng', q: 'Travel cards can also be used on trains.', answer: 'NOT GIVEN', explain: 'Bài viết không nói thẻ đi lại có dùng cho tàu hỏa hay không → NOT GIVEN.' },
        { type: 'mcq', q: 'Why might a travel card be a good choice?', options: ['It is cheaper if you take the bus every day.', 'It gives you a free seat at the front.', 'It lets you pay with exact cash to the driver.', 'It works automatically without tapping.'], answer: 0, explain: 'Bài viết nêu rõ thẻ đi lại (travel card) thường rẻ hơn nếu bạn đi xe buýt mỗi ngày ("A travel card is often cheaper if you take the bus every day").' },
        { type: 'mcq', q: 'What should you do when your stop is next?', options: ['Stand next to the driver', 'Press the button or pull the cord', 'Wait until the bus stops and then shout', 'Show your travel card again'], answer: 1, explain: 'Bài viết: "When your stop is next, press the button or pull the cord to tell the driver." → đáp án đúng: Press the button or pull the cord.' },
      ],
    },
    {
      id: 'new-neighbors', title: 'Meeting the Neighbors', topic: 'society', level: 'A2', emoji: '🏘️',
      summaryVi: 'Gia đình Amira chuyển đến khu phố mới và làm quen hàng xóm: mang bánh tặng, tiệc nướng cuối tuần, giúp đỡ lẫn nhau.',
      summaryEn: 'Amira\'s family moves to a new neighbourhood and gets to know the neighbours: bringing a cake as a gift, a weekend barbecue and helping each other out.',
      text: "Last spring, Amira and her family moved into a new house on Maple Street. For the first few weeks, they did not know anyone, and the children felt a little lonely.\n\nOne afternoon, their neighbor Mrs. Carter knocked on the door with a plate of cookies. She welcomed them to the street and told them about the park nearby and the best place to buy pizza. Amira was very surprised and happy.\n\nA few days later, Amira baked a cake and took it to the family on the other side of her house. They had two children of the same age as hers, and soon the children were playing together after school.\n\nIn July, the neighbors held a barbecue in the street. Everyone brought some food, and Amira's family made rice and chicken. Now, when Amira goes on vacation, Mrs. Carter waters her plants, and when Mrs. Carter is sick, Amira does her shopping. Amira says that good neighbors make a house feel like home.",
      keywords: ['move into', 'lonely', 'knock on the door', 'welcome', 'nearby', 'bake', 'barbecue', 'water (v)', 'vacation', 'feel like home'],
      questions: [
        { type: 'tfng', q: 'Amira\'s children felt lonely at first.', answer: 'TRUE', explain: 'Bài viết: "the children felt a little lonely" trong những tuần đầu → TRUE.' },
        { type: 'tfng', q: 'Mrs. Carter brought a cake to Amira\'s family.', answer: 'FALSE', explain: 'Bài viết: bà Carter mang "a plate of cookies" (bánh quy); chính Amira mới là người nướng bánh kem → FALSE.' },
        { type: 'tfng', q: 'The street barbecue happens every year.', answer: 'NOT GIVEN', explain: 'Bài viết chỉ nói hàng xóm tổ chức tiệc nướng vào tháng Bảy, không nói có diễn ra hằng năm → NOT GIVEN.' },
        { type: 'mcq', q: 'What did Mrs. Carter tell the family about?', options: ['The local schools and family doctors', 'A nearby playground and bus stations', 'The park and a good place to buy pizza', 'A quiet library and food supermarkets'], answer: 2, explain: 'Bài viết nêu rõ bà Carter \'told them about the park nearby and the best place to buy pizza\' khi đến chào gia đình mới. Các phương án khác đưa ra những địa điểm tiện ích khác nhưng không được nhắc tới.' },
        { type: 'mcq', q: 'How do Amira and Mrs. Carter help each other now?', options: ['They take turns driving each other to the market.', 'They prepare meals together for street parties.', 'They watch each other\'s kids during the summer.', 'They water plants and do shopping for each other.'], answer: 3, explain: 'Đoạn văn nêu rõ: "when Amira goes on vacation, Mrs. Carter waters her plants, and when Mrs. Carter is sick, Amira does her shopping."' },
      ],
    },
    {
      id: 'tipping-us', title: 'Tipping in the United States', topic: 'culture', level: 'B1', emoji: '💵',
      summaryVi: 'Văn hóa tiền boa ở Mỹ: vì sao nhân viên phục vụ phụ thuộc vào tiền boa, mức thường gặp, khi nào cần và không cần boa, tranh luận hiện nay.',
      summaryEn: 'Tipping culture in the US: why restaurant staff depend on tips, the usual amounts, when you should and should not tip, and the current debate.',
      text: "For many visitors, tipping is one of the most confusing parts of life in the United States. In many countries, a service charge is included in the bill or tipping is optional. In the US, however, a tip is often expected, especially in restaurants.\n\nOne reason is that many restaurant servers earn a low basic wage, and tips make up a large part of their income. For table service in a restaurant, customers commonly leave between fifteen and twenty percent of the bill before tax. People also usually tip taxi drivers, hairdressers and hotel staff who carry luggage.\n\nOther situations are less clear. When you buy a coffee at a counter, the payment screen may suggest a tip of fifteen, twenty or twenty-five percent. Many customers feel uncomfortable about this, because they are not receiving table service. Tipping in these situations is generally optional, and choosing \"no tip\" is not considered rude.\n\nIn recent years, some Americans have complained about \"tipping fatigue\" as more businesses ask for tips. A few restaurants have responded by raising their prices and paying staff a higher wage instead. Whether this approach will spread is still uncertain, but for now, visitors should be ready to add a tip when they eat out.",
      keywords: ['tip', 'service charge', 'optional', 'expected', 'basic wage', 'income', 'table service', 'luggage', 'counter', 'tipping fatigue'],
      questions: [
        { type: 'tfng', q: 'In US restaurants, tips are often an important part of servers\' income.', answer: 'TRUE', explain: 'Bài viết: nhiều nhân viên phục vụ có lương cơ bản thấp và "tips make up a large part of their income" → TRUE.' },
        { type: 'tfng', q: 'It is rude not to tip when you buy coffee at a counter.', answer: 'FALSE', explain: 'Bài viết: boa ở quầy thường là tùy chọn và chọn "no tip" "is not considered rude" → FALSE.' },
        { type: 'tfng', q: 'Most American restaurants have stopped asking for tips.', answer: 'FALSE', explain: 'Bài viết chỉ nói "A few restaurants" tăng giá thay cho tiền boa, và du khách vẫn nên sẵn sàng boa khi ăn ngoài → FALSE.' },
        { type: 'mcq', q: 'How much do customers commonly tip for table service?', options: ['Around ten to fifteen percent of the total check', 'Fifteen to twenty percent of the bill before tax', 'Exactly twenty percent including local sales tax', 'About twenty-five percent for general table care'], answer: 1, explain: 'Bài viết: khách thường để lại "between fifteen and twenty percent of the bill before tax" → đáp án đúng: Fifteen to twenty percent of the bill before tax.' },
        { type: 'mcq', q: 'What does "tipping fatigue" refer to?', options: ['Customers feeling annoyed that more businesses ask for tips', 'Restaurant staff feeling exhausted after working long hours', 'Business owners refusing to accept cash payments', 'Foreign tourists forgetting to pay for their meals'], answer: 0, explain: 'Thuật ngữ "tipping fatigue" dùng để chỉ sự mệt mỏi, khó chịu của khách hàng khi ngày càng có nhiều doanh nghiệp gợi ý tiền boa ("complained about \'tipping fatigue\' as more businesses ask for tips").' },
      ],
    },

    {
      id: 'interview-prep', title: 'Getting Ready for a Job Interview', topic: 'work', level: 'B1', emoji: '💼',
      summaryVi: 'Cách chuẩn bị phỏng vấn xin việc: tìm hiểu công ty, chuẩn bị ví dụ theo cách STAR, chuẩn bị câu hỏi cho nhà tuyển dụng, gửi thư cảm ơn.',
      summaryEn: 'How to prepare for a job interview: research the company, prepare examples using the STAR method, prepare questions for the employer and send a thank-you note.',
      text: "A job interview can be stressful, but good preparation makes a big difference. The first step is to learn about the company. Read its website, look at recent news and try to understand what the company does and what it values. Interviewers are often impressed when candidates can connect their own experience to the company's goals.\n\nNext, think about the questions you are likely to hear, such as \"Tell me about yourself\" or \"Describe a problem you solved at work.\" Many career advisers recommend the STAR method for answering questions about experience: describe the Situation, the Task, the Action you took and the Result. Practising a few examples out loud, with a friend or in front of a mirror, can help you speak more confidently.\n\nIt is also important to prepare some questions of your own. Asking about the team, the training or the first few months in the job shows that you are seriously interested. However, it is usually better not to ask about salary in a first interview unless the interviewer mentions it.\n\nFinally, the interview does not end when you leave the room. Sending a short thank-you email the same day is a polite way to remind the interviewer of your interest.",
      keywords: ['interview', 'candidate', 'impressed', 'values', 'career adviser', 'method', 'out loud', 'confidently', 'seriously', 'thank-you email'],
      questions: [
        { type: 'tfng', q: 'The STAR method is used for answering questions about past experience.', answer: 'TRUE', explain: 'Bài viết: chuyên gia khuyên dùng STAR "for answering questions about experience" → TRUE.' },
        { type: 'tfng', q: 'Candidates should always ask about salary in the first interview.', answer: 'FALSE', explain: 'Bài viết: "it is usually better not to ask about salary in a first interview unless the interviewer mentions it" → FALSE.' },
        { type: 'tfng', q: 'Most interviews last about one hour.', answer: 'NOT GIVEN', explain: 'Bài viết không nhắc đến độ dài buổi phỏng vấn → NOT GIVEN.' },
        { type: 'mcq', q: 'Why should candidates prepare their own questions?', options: ['To make the interview shorter', 'To find out about the interviewer\'s salary', 'To show that they are seriously interested', 'To avoid answering difficult questions'], answer: 2, explain: 'Bài viết: hỏi về nhóm, đào tạo, những tháng đầu "shows that you are seriously interested" → đáp án đúng: To show that they are seriously interested.' },
        { type: 'mcq', q: 'What does the writer suggest doing after the interview?', options: ['Checking the company\'s social media pages', 'Calling the office to ask for quick feedback', 'Waiting a week before contacting the team', 'Sending a short thank-you email the same day'], answer: 3, explain: 'Tác giả khuyên gửi thư cảm ơn ngay trong ngày phỏng vấn: \'Sending a short thank-you email the same day is a polite way to remind the interviewer of your interest.\' Việc gọi điện đòi hỏi phản hồi ngay lập tức hoặc kiểm tra mạng xã hội không được khuyên làm.' },
      ],
    },
    {
      id: 'learning-to-cook', title: 'Why It Pays to Learn to Cook', topic: 'food', level: 'B1', emoji: '🍳',
      summaryVi: 'Lợi ích của việc tự nấu ăn: tiết kiệm tiền, kiểm soát nguyên liệu, kỹ năng sống, gắn kết; cách bắt đầu từ vài món đơn giản.',
      summaryEn: 'The benefits of cooking for yourself: saving money, controlling the ingredients, life skills and bringing people together; how to start with a few simple dishes.',
      text: "Many young adults leave home without knowing how to cook more than a few simple dishes. With food delivery apps on every phone, it can seem unnecessary to learn. Yet cooking is one of the most useful skills a person can have.\n\nThe most obvious benefit is money. A meal cooked at home usually costs much less than the same meal from a restaurant or delivery service, especially when you add delivery fees and tips. Cooking also lets you control what goes into your food. You can decide how much salt, sugar and oil to use, which makes it easier to eat a balanced diet.\n\nCooking has social benefits too. Preparing a meal for friends or family is a way of showing care, and eating together gives people time to talk without screens.\n\nThe good news is that you do not need to be an expert to start. Begin with three or four dishes that you enjoy, such as a pasta sauce, a stir-fry or a soup, and cook them until you feel confident. Online videos can be helpful, but it is also worth asking older relatives to teach you family recipes. Within a few months, most beginners find that cooking becomes faster, easier and even relaxing.",
      keywords: ['dish', 'delivery app', 'unnecessary', 'obvious', 'delivery fee', 'balanced diet', 'social', 'stir-fry', 'recipe', 'relaxing'],
      questions: [
        { type: 'tfng', q: 'Delivery fees and tips can make food delivery more expensive.', answer: 'TRUE', explain: 'Bài viết: nấu ở nhà rẻ hơn nhiều "especially when you add delivery fees and tips" → TRUE.' },
        { type: 'tfng', q: 'You need to take a cooking course before you start cooking at home.', answer: 'FALSE', explain: 'Bài viết: "you do not need to be an expert to start" – bắt đầu với 3–4 món quen thuộc → FALSE.' },
        { type: 'tfng', q: 'Young adults today cook less than their grandparents did.', answer: 'NOT GIVEN', explain: 'Bài viết không so sánh thói quen nấu ăn giữa các thế hệ → NOT GIVEN.' },
        { type: 'mcq', q: 'How does cooking help people eat a balanced diet?', options: ['It encourages them to prepare meals with relatives.', 'It lets them control the amount of salt, sugar and oil.', 'It prevents them from spending too much on deliveries.', 'It makes them include several new recipes every week.'], answer: 1, explain: 'Bài viết giải thích nấu ăn giúp người ta có chế độ ăn cân đối vì "You can decide how much salt, sugar and oil to use, which makes it easier to eat a balanced diet".' },
        { type: 'mcq', q: 'What does the writer recommend for beginners?', options: ['Memorizing complex restaurant recipes from cookbooks', 'Relying exclusively on instructional video channels', 'Practising a few favorite dishes until they feel confident', 'Preparing multi-course meals for large family gatherings'], answer: 2, explain: 'Bài viết: bắt đầu với "three or four dishes that you enjoy" và nấu "until you feel confident" → đáp án đúng: Practising a few favorite dishes until they feel confident.' },
      ],
    },
    {
      id: 'cafe-offices', title: 'When the Coffee Shop Becomes the Office', topic: 'work', level: 'B1', emoji: '☕',
      summaryVi: 'Vì sao nhiều người làm việc ở quán cà phê: tiếng ồn nền vừa phải, cảm giác có người xung quanh; nhưng cũng có bất tiện và phép lịch sự cần giữ.',
      summaryEn: 'Why many people work in cafés: a moderate level of background noise and the feeling of having people around – but there are also drawbacks and some etiquette to follow.',
      text: "Walk into almost any coffee shop on a weekday morning and you will see people working on laptops. Since more people began working from home, cafés have become popular \"third places\" – spaces that are neither home nor the office.\n\nWhy do people choose to work there? Some say that the gentle background noise of a café helps them concentrate better than the silence of an empty apartment. Others simply like being around people. Working alone at home all day can feel lonely, and seeing others busy at their tables can be motivating.\n\nHowever, cafés are not perfect offices. Wi-Fi can be slow, power sockets are often limited, and it is difficult to make private phone calls. There are also unwritten rules. Most café owners are happy for customers to work, but they expect them to buy something every few hours, especially at busy times. Taking up a large table for a whole day after buying one small coffee is generally seen as unfair.\n\nSome cafés have responded by offering special tables for laptop users or by limiting Wi-Fi time during lunch. For many remote workers, the solution is to use cafés for a few hours of focused work and keep video meetings for home.",
      keywords: ['weekday', 'third place', 'background noise', 'concentrate', 'motivating', 'power socket', 'private', 'unwritten rule', 'take up', 'remote worker'],
      questions: [
        { type: 'tfng', q: 'Some people find a little noise helps them concentrate.', answer: 'TRUE', explain: 'Bài viết: "the gentle background noise of a café helps them concentrate better than the silence" → TRUE.' },
        { type: 'tfng', q: 'Café owners usually do not allow customers to work on laptops.', answer: 'FALSE', explain: 'Bài viết: "Most café owners are happy for customers to work" – chỉ mong khách mua thêm đồ → FALSE.' },
        { type: 'tfng', q: 'Coffee shops make more money from remote workers than from other customers.', answer: 'NOT GIVEN', explain: 'Bài viết không so sánh doanh thu từ người làm việc từ xa với khách khác → NOT GIVEN.' },
        { type: 'mcq', q: 'What is a "third place", according to the text?', options: ['A quiet coffee shop that is open all night', 'A space that is neither home nor the office', 'A shared office building for large companies', 'A private meeting room inside a public library'], answer: 1, explain: 'Đoạn văn định nghĩa rõ ràng "third places" là những không gian làm việc không phải ở nhà cũng không phải ở văn phòng ("spaces that are neither home nor the office").' },
        { type: 'mcq', q: 'What is generally seen as unfair?', options: ['Using a large table all day after buying one small coffee', 'Staying for several hours without making any phone calls', 'Sitting near the power sockets during busy morning hours', 'Connecting multiple devices to the free café internet'], answer: 0, explain: 'Bài viết nêu rõ hành vi bị coi là bất công: \'Taking up a large table for a whole day after buying one small coffee is generally seen as unfair.\' Việc ngồi làm việc vài tiếng hay dùng thiết bị bình thường vẫn được chấp nhận nếu tuân thủ quy tắc.' },
      ],
    },
    {
      id: 'cost-of-a-car', title: 'The Hidden Cost of Owning a Car', topic: 'economy', level: 'B2', emoji: '🚗',
      summaryVi: 'Chi phí thật của việc sở hữu ô tô vượt xa giá mua: khấu hao, bảo hiểm, bảo dưỡng, đỗ xe, nhiên liệu; so sánh với phương án đi chung và giao thông công cộng.',
      summaryEn: 'The real cost of owning a car goes far beyond the purchase price: depreciation, insurance, maintenance, parking and fuel; a comparison with car sharing and public transport.',
      text: "When people decide whether they can afford a car, they usually focus on the purchase price or the monthly loan payment. Yet the price of the car is only the beginning of what it really costs to own one.\n\nThe largest hidden expense is often depreciation – the loss in value as a car gets older. A new car can lose a significant share of its value in its first few years, which matters a great deal when the owner eventually sells it. Insurance is another major cost, and it can be especially high for young drivers or people living in cities where accidents and theft are more common.\n\nThen there are the running costs. Fuel or electricity, regular servicing, new tyres and unexpected repairs all add up. In many city centers, parking can cost as much each month as a basic phone and internet plan combined, and some apartment buildings charge extra for a parking space.\n\nNone of this means that owning a car is a bad decision. For people in rural areas or with irregular working hours, a car may be essential. But for city dwellers, it is worth comparing the total annual cost of a car with the alternatives: public transport passes, occasional taxis and car-sharing services that charge by the hour. Many people who do this calculation are surprised by how much they could save.",
      keywords: ['afford', 'purchase price', 'loan payment', 'depreciation', 'insurance', 'theft', 'running costs', 'servicing', 'city dweller', 'car-sharing'],
      questions: [
        { type: 'tfng', q: 'Depreciation means that a car loses value as it gets older.', answer: 'TRUE', explain: 'Bài viết: "depreciation – the loss in value as a car gets older" → TRUE.' },
        { type: 'tfng', q: 'Insurance costs are the same for all drivers.', answer: 'FALSE', explain: 'Bài viết: bảo hiểm có thể "especially high for young drivers or people living in cities" → không giống nhau → FALSE.' },
        { type: 'tfng', q: 'Electric cars are cheaper to insure than petrol cars.', answer: 'NOT GIVEN', explain: 'Bài viết không so sánh phí bảo hiểm xe điện và xe xăng → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the writer suggest city dwellers should do?', options: ['Calculate the unexpected repairs and parking charges', 'Rely entirely on local car-sharing companies for travel', 'Avoid buying an expensive vehicle with high insurance', 'Compare the total yearly cost of a car with other options'], answer: 3, explain: 'Tác giả khuyên: "for city dwellers, it is worth comparing the total annual cost of a car with the alternatives" (các lựa chọn thay thế).' },
        { type: 'mcq', q: 'For whom might a car be essential, according to the text?', options: ['People in rural areas or with irregular working hours', 'City dwellers trying to reduce monthly parking costs', 'Young drivers facing high rates for car insurance', 'Commuters who prefer using hourly car-sharing clubs'], answer: 0, explain: 'Bài viết nêu rõ: "For people in rural areas or with irregular working hours, a car may be essential." Các nhóm còn lại sống ở thành phố hoặc được tác giả khuyên nên cân nhắc giải pháp thay thế xe cá nhân.' },
      ],
    },
    {
      id: 'habits-stick', title: 'Why Some Habits Stick', topic: 'science', level: 'B2', emoji: '🔁',
      summaryVi: 'Thói quen hình thành qua lặp lại trong cùng bối cảnh; tín hiệu – hành động – phần thưởng; mẹo xây thói quen tốt: bắt đầu nhỏ, gắn với thói quen có sẵn, thay đổi môi trường.',
      summaryEn: 'Habits form through repetition in the same context – cue, action, reward; tips for building good habits: start small, attach them to an existing habit and change your environment.',
      text: "Why is it so easy to check our phones without thinking, yet so hard to start exercising regularly? Psychologists who study habits explain that a habit is a behavior that has become automatic through repetition in a stable context.\n\nA useful way to think about habits is as a loop with three parts: a cue, a routine and a reward. The cue might be a time, a place or a feeling – for example, finishing lunch at your desk. The routine is the behavior itself, such as scrolling through social media. The reward is the small pleasure that follows, which makes the brain more likely to repeat the loop next time.\n\nThis explains why good intentions alone rarely change our behavior. Deciding to \"exercise more\" does not create a cue, and the benefits of exercise often appear weeks later, so there is little immediate reward.\n\nResearchers suggest several practical strategies. First, start small: a five-minute walk is easier to repeat than an hour at the gym. Second, link the new habit to an existing one, such as doing stretches right after brushing your teeth. Third, change your environment so that the good choice is easier – putting running shoes by the door, for example – and the bad choice is harder. How long it takes for a new behavior to feel automatic varies greatly from person to person, so patience is essential.",
      keywords: ['automatic', 'repetition', 'context', 'loop', 'cue', 'routine', 'reward', 'intention', 'immediate', 'environment'],
      questions: [
        { type: 'tfng', q: 'According to the text, a habit is a behavior that has become automatic.', answer: 'TRUE', explain: 'Bài viết: "a habit is a behavior that has become automatic through repetition in a stable context" → TRUE.' },
        { type: 'tfng', q: 'Deciding to exercise more is usually enough to create a new habit.', answer: 'FALSE', explain: 'Bài viết: "good intentions alone rarely change our behavior" vì không tạo ra tín hiệu và phần thưởng tức thì → FALSE.' },
        { type: 'tfng', q: 'Every new habit becomes automatic after exactly 21 days.', answer: 'FALSE', explain: 'Bài viết: thời gian để hành vi thành tự động "varies greatly from person to person" – không có con số cố định → FALSE.' },
        { type: 'mcq', q: 'In the example of finishing lunch at your desk, what part of the habit loop is this?', options: ['The reward', 'The routine', 'The cue', 'The context'], answer: 2, explain: 'Bài viết: tín hiệu (cue) có thể là thời gian, địa điểm hay cảm giác – "for example, finishing lunch at your desk".' },
        { type: 'mcq', q: 'Which strategy involves linking a new habit to an existing one?', options: ['Putting your running shoes right by the door', 'Making a strong decision to exercise regularly', 'Going for a short five-minute walk every day', 'Doing stretches right after brushing your teeth'], answer: 3, explain: 'Gắn thói quen mới với một thói quen sẵn có được minh họa trực tiếp qua ví dụ tập giãn cơ ngay sau khi đánh răng ("link the new habit to an existing one, such as doing stretches right after brushing your teeth").' },
      ],
    },
    {
      id: 'procrastination', title: 'Understanding Procrastination', topic: 'science', level: 'B2', emoji: '⏳',
      summaryVi: 'Trì hoãn không đơn thuần là lười hay quản lý thời gian kém mà thường liên quan đến cảm xúc khó chịu với nhiệm vụ; cách vượt qua: chia nhỏ, bắt đầu 10 phút, tự thông cảm với bản thân.',
      summaryEn: 'Procrastination is not simply laziness or poor time management; it is often linked to unpleasant feelings about a task. Ways to overcome it: break the task down, start with 10 minutes and be kind to yourself.',
      text: "Almost everyone procrastinates sometimes, delaying a task even though they know they will probably regret it later. It is easy to blame laziness or poor time management, but many psychologists now see procrastination mainly as a problem of managing emotions.\n\nWhen a task makes us feel anxious, bored or uncertain – writing a difficult report, for example – avoiding it brings immediate relief. Checking messages or tidying the desk feels better in the moment. Unfortunately, the relief is short-lived, and as the deadline approaches, stress increases. Some people then feel guilty, which makes the task even more unpleasant and the cycle continues.\n\nUnderstanding this pattern suggests a different approach. Instead of simply trying harder to be disciplined, it helps to reduce the negative feelings connected with the task. Breaking a large project into small, concrete steps makes it seem less overwhelming. Committing to work on something for just ten minutes can also help, because starting is often the hardest part, and many people continue once they have begun.\n\nInterestingly, being kind to yourself may also reduce procrastination. People who forgive themselves for delaying a task, rather than criticizing themselves harshly, are often more likely to return to it. Procrastination is a common human habit, not a sign of personal failure, and it can be changed with the right strategies.",
      keywords: ['procrastinate', 'regret', 'laziness', 'anxious', 'relief', 'short-lived', 'guilty', 'disciplined', 'overwhelming', 'harshly'],
      questions: [
        { type: 'tfng', q: 'Many psychologists see procrastination mainly as a problem of managing emotions.', answer: 'TRUE', explain: 'Bài viết: "many psychologists now see procrastination mainly as a problem of managing emotions" → TRUE.' },
        { type: 'tfng', q: 'Avoiding an unpleasant task brings long-lasting relief.', answer: 'FALSE', explain: 'Bài viết: cảm giác nhẹ nhõm "is short-lived" và căng thẳng tăng khi gần hạn → FALSE.' },
        { type: 'tfng', q: 'Students procrastinate more than office workers.', answer: 'NOT GIVEN', explain: 'Bài viết không so sánh mức độ trì hoãn giữa sinh viên và nhân viên văn phòng → NOT GIVEN.' },
        { type: 'mcq', q: 'Why can committing to work for just ten minutes help?', options: ['Because ten minutes is enough to finish most tasks', 'Because starting is often the hardest part', 'Because it reduces the deadline', 'Because it makes people feel guilty'], answer: 1, explain: 'Bài viết: "starting is often the hardest part, and many people continue once they have begun" → đáp án đúng: Because starting is often the hardest part.' },
        { type: 'mcq', q: 'What does the writer say about being kind to yourself?', options: ['It may help people return to the task they delayed.', 'It allows workers to avoid boring and stressful jobs.', 'It shows that a person lacks proper self-discipline.', 'It prevents negative feelings from appearing at work.'], answer: 0, explain: 'Theo bài viết, người biết tha thứ cho bản thân thường dễ quay lại hoàn thành công việc hơn (\'often more likely to return to it\'). Các ý còn lại hiểu sai rằng tự tha thứ là thiếu kỷ luật hoặc né tránh hoàn toàn công việc.' },
      ],
    },
    {
      id: 'free-shipping', title: 'The Economics of "Free" Shipping', topic: 'economy', level: 'C1', emoji: '📦',
      summaryVi: 'Giao hàng "miễn phí" thực chất có chi phí: được tính vào giá, ngưỡng đơn tối thiểu, gói thành viên; tác động tới hành vi mua sắm, lượng hàng trả lại và môi trường.',
      summaryEn: '"Free" delivery actually has costs: they are built into prices, minimum order thresholds and membership schemes; it affects shopping behaviour, the number of returns and the environment.',
      text: "Few words are as powerful in online retail as \"free shipping\". Shoppers are often more willing to pay a slightly higher price for a product with free delivery than a lower price plus a separate shipping fee, even when the total cost is the same. Retailers understand this well, which is why free shipping has become one of the most common features of online shopping.\n\nOf course, delivering a parcel is never actually free. Someone has to pay for warehouses, packaging, fuel and drivers. In practice, retailers recover these costs in several ways. Some build them into the prices of their products. Others set a minimum order value, encouraging customers to add extra items to their basket in order to qualify. Membership programs that offer unlimited free delivery for an annual fee are another strategy; once customers have paid, they tend to shop more often with that retailer to get value from their membership.\n\nFree shipping also changes how people shop. When delivery and returns cost nothing, customers may order several sizes of the same item and send back those that do not fit. Handling returns is expensive for retailers, and many returned products cannot be resold as new.\n\nThere are environmental consequences as well. Fast, free delivery encourages frequent small orders, which can mean more half-empty vans on the road and more packaging. In response, some companies now offer customers the option of slower delivery or of grouping orders into a single weekly shipment. Whether shoppers will choose these options when speed is still free remains an open question.",
      keywords: ['retail', 'shipping fee', 'parcel', 'warehouse', 'recover costs', 'minimum order value', 'qualify', 'membership program', 'resell', 'shipment'],
      questions: [
        { type: 'tfng', q: 'Shoppers may prefer a higher price with free delivery to a lower price plus a shipping fee.', answer: 'TRUE', explain: 'Bài viết: người mua thường "more willing to pay a slightly higher price for a product with free delivery than a lower price plus a separate shipping fee" → TRUE.' },
        { type: 'tfng', q: 'Retailers do not need to pay anything for free deliveries.', answer: 'FALSE', explain: 'Bài viết: "delivering a parcel is never actually free" – phải trả kho, bao bì, nhiên liệu, tài xế → FALSE.' },
        { type: 'tfng', q: 'Most customers choose slower delivery when it is offered.', answer: 'NOT GIVEN', explain: 'Bài viết nói việc khách có chọn giao chậm hay không "remains an open question" – không có thông tin rằng đa số chọn → NOT GIVEN.' },
        { type: 'mcq', q: 'How do minimum order values help retailers?', options: ['They limit the number of items per purchase.', 'They require customers to pay a handling fee.', 'They encourage customers to buy extra items.', 'They decrease the need for promotional discounts.'], answer: 2, explain: 'Bài viết: ngưỡng đơn tối thiểu khuyến khích khách "add extra items to their basket in order to qualify" → đáp án đúng: They encourage customers to buy extra items..' },
        { type: 'mcq', q: 'Why are returns a problem for retailers?', options: ['Customers rarely return items.', 'Returns increase delivery speed.', 'Returned items are always damaged.', 'Returns are expensive and many items cannot be resold as new.'], answer: 3, explain: 'Bài viết: "Handling returns is expensive for retailers, and many returned products cannot be resold as new." → đáp án đúng: Returns are expensive and many items cannot be resold as new..' },
      ],
    },
    {
      id: 'noise-pollution', title: 'Noise: The Invisible Pollutant', topic: 'environment', level: 'C1', emoji: '🔊',
      summaryVi: 'Ô nhiễm tiếng ồn ảnh hưởng giấc ngủ, căng thẳng và sức khỏe tim mạch; nguồn chính là giao thông; các giải pháp quy hoạch, vật liệu, quy định và hành vi.',
      summaryEn: 'Noise pollution affects sleep, stress levels and heart health; the main source is traffic; solutions include urban planning, materials, regulations and changes in behaviour.',
      text: "When people think about pollution, they usually imagine dirty air or plastic in the sea. Noise is rarely mentioned, partly because it leaves no visible trace. Yet health authorities, including the World Health Organization, recognize environmental noise as a significant risk to public health, particularly in cities.\n\nThe most obvious effect of noise is disturbed sleep. Even when people do not fully wake up, noise from traffic or aircraft at night can interrupt the deeper stages of sleep, leaving them tired the next day. Over time, constant noise is associated with chronic stress, and researchers have linked long-term exposure to higher risks of high blood pressure and heart disease. Children's concentration and learning can also be affected when schools are located near busy roads or airports.\n\nIn most cities, the main source of environmental noise is road traffic. This suggests a range of solutions. Lower speed limits reduce tyre and engine noise, and quieter road surfaces can make a noticeable difference. Electric vehicles are much quieter at low speeds, although at higher speeds most of the noise comes from tyres rather than engines. Planners can also place offices or shops, rather than bedrooms, along the busiest streets, and use trees and barriers to absorb sound.\n\nIndividual choices matter too, from using headphones on public transport to keeping noisy household tasks to daytime hours. Unlike many environmental problems, noise disappears the moment its source stops – which means that, with the right policies, cities can become quieter remarkably quickly.",
      keywords: ['pollutant', 'trace', 'recognize', 'disturbed sleep', 'interrupt', 'chronic stress', 'exposure', 'speed limit', 'road surface', 'absorb'],
      questions: [
        { type: 'tfng', q: 'Noise can disturb sleep even when people do not fully wake up.', answer: 'TRUE', explain: 'Bài viết: "Even when people do not fully wake up, noise … can interrupt the deeper stages of sleep" → TRUE.' },
        { type: 'tfng', q: 'At high speeds, most noise from electric vehicles comes from their engines.', answer: 'FALSE', explain: 'Bài viết: ở tốc độ cao "most of the noise comes from tyres rather than engines" → FALSE.' },
        { type: 'tfng', q: 'Noise pollution is worse in Europe than in Asia.', answer: 'NOT GIVEN', explain: 'Bài viết không so sánh mức ô nhiễm tiếng ồn giữa các châu lục → NOT GIVEN.' },
        { type: 'mcq', q: 'What is the main source of environmental noise in most cities?', options: ['Aircraft', 'Construction', 'Road traffic', 'Household tasks'], answer: 2, explain: 'Bài viết: "In most cities, the main source of environmental noise is road traffic." → đáp án đúng: Road traffic.' },
        { type: 'mcq', q: 'Why does the writer say cities can become quieter "remarkably quickly"?', options: ['Because noise disappears as soon as its source stops', 'Because noise is louder at night', 'Because people become accustomed to background sounds', 'Because planting trees reduces sound instantly'], answer: 0, explain: 'Bài viết: "noise disappears the moment its source stops" nên với chính sách đúng, thành phố có thể yên tĩnh hơn rất nhanh.' },
      ],
    },
    {
      id: 'history-of-weekend', title: 'How the Weekend Was Invented', topic: 'history', level: 'C1', emoji: '📅',
      summaryVi: 'Cuối tuần hai ngày là phát minh khá mới: từ ngày nghỉ tôn giáo, thói quen "Thứ Hai thánh", phong trào công đoàn đến tuần làm việc 5 ngày ở thế kỷ 20.',
      summaryEn: 'The two-day weekend is a fairly recent invention: from religious days of rest and the habit of "Saint Monday" to the trade union movement and the five-day working week of the 20th century.',
      text: "For most office workers today, the two-day weekend seems like a natural part of life. Historically, however, it is a fairly recent invention. For centuries, many societies observed a single weekly day of rest, usually for religious reasons, while the other six days were working days.\n\nThe change began during the Industrial Revolution in Britain. Factory work was long and exhausting, and some workers simply failed to appear on Mondays, a habit that became known jokingly as \"Saint Monday\". Employers disliked these unpredictable absences, and over time a compromise emerged: workers would come in reliably on Monday in exchange for finishing early on Saturday afternoon. The \"half-holiday\" on Saturday gradually spread during the nineteenth century, helped by campaigns from trade unions.\n\nIn the United States, a major step came in the 1920s, when some large employers introduced a five-day working week for factory workers. The industrialist Henry Ford was among the best known, adopting a five-day, forty-hour week in his factories in 1926. Supporters argued that rested workers were more productive, and that people with free time would also spend more money – including on leisure activities and consumer goods. During the following decades, the two-day weekend became standard across much of the industrialized world.\n\nToday, some companies are experimenting with four-day weeks, and the debate echoes earlier arguments about productivity and well-being. History suggests that the length of the working week is not fixed but reflects the economic and social choices of each era.",
      keywords: ['invention', 'observe', 'day of rest', 'Industrial Revolution', 'exhausting', 'absence', 'compromise', 'trade union', 'productive', 'era'],
      questions: [
        { type: 'tfng', q: 'For centuries, many societies had only one weekly day of rest.', answer: 'TRUE', explain: 'Bài viết: "many societies observed a single weekly day of rest" → TRUE.' },
        { type: 'tfng', q: '"Saint Monday" was an official holiday created by employers.', answer: 'FALSE', explain: 'Bài viết: "Saint Monday" là cách gọi đùa thói quen công nhân tự nghỉ thứ Hai, và chủ lao động "disliked these unpredictable absences" → không phải ngày nghỉ chính thức → FALSE.' },
        { type: 'tfng', q: 'Henry Ford was the first employer in the world to introduce a five-day week.', answer: 'NOT GIVEN', explain: 'Bài viết chỉ nói Ford "was among the best known" trong số các chủ lao động áp dụng tuần 5 ngày, không nói ông là người đầu tiên → NOT GIVEN.' },
        { type: 'mcq', q: 'What compromise developed between workers and employers in Britain?', options: ['Employees would be required to labor on Sundays in return for additional wages.', 'Workers would come on Monday in exchange for finishing early on Saturday.', 'Factory owners decided to suspend production every Monday to reduce operational costs.', 'Laborers were allowed to extend their midday break by an extra hour.'], answer: 1, explain: 'Bài viết: công nhân đi làm đều vào thứ Hai "in exchange for finishing early on Saturday afternoon" → đáp án đúng: Workers would come on Monday in exchange for finishing early on Saturday..' },
        { type: 'mcq', q: 'Which argument did supporters of the five-day week make?', options: ['Workers would require shorter training periods under a five‑day week', 'Trade unions might lose influence if work hours were reduced', 'Factories could lower energy consumption by operating fewer days each week', 'Rested workers would be more productive and spend more money.'], answer: 3, explain: 'Bài viết: người ủng hộ cho rằng "rested workers were more productive" và người có thời gian rảnh "would also spend more money" → đáp án đúng: Rested workers would be more productive and spend more money..' },
      ],
    },
    {
      id: 'decision-fatigue', title: 'Too Many Choices?', topic: 'science', level: 'C1', emoji: '🤔',
      summaryVi: 'Ý tưởng "mệt mỏi vì quyết định" và "quá nhiều lựa chọn": bằng chứng còn tranh cãi; cách đơn giản hóa lựa chọn hằng ngày một cách thực tế.',
      summaryEn: 'The ideas of "decision fatigue" and "too much choice": the evidence is still debated; practical ways to simplify everyday choices.',
      text: "Modern life involves a remarkable number of decisions, from which of dozens of breakfast cereals to buy to which of hundreds of streaming shows to watch. Some writers argue that this abundance comes at a cost. They point to two popular ideas: that making many decisions gradually wears down our ability to choose well – often called \"decision fatigue\" – and that having too many options can make people less satisfied, or even unable to choose at all.\n\nBoth ideas have intuitive appeal. Most of us have felt exhausted after a long day of choices, or stood in front of a supermarket shelf unsure what to pick. However, the scientific evidence is more mixed than popular articles sometimes suggest. Some well-known experiments have proved difficult to repeat, and reviews of the research suggest that the effect of large choice sets depends heavily on the situation – for example, on whether people already know what they like and how easy the options are to compare.\n\nThis does not mean the ideas are useless. Even if the effects are smaller and less universal than once claimed, many people find that reducing unnecessary decisions makes daily life feel calmer. Common strategies include planning meals for the week in advance, keeping a simple routine for mornings, and deciding in advance on a few trusted brands. Businesses, too, have learned that presenting options clearly – with sensible defaults and helpful comparisons – can make customers more comfortable with their choices.\n\nThe broader lesson may be that choice itself is neither good nor bad. What matters is whether people have the information and structure they need to choose with confidence.",
      keywords: ['abundance', 'wear down', 'decision fatigue', 'option', 'intuitive', 'appeal', 'evidence', 'universal', 'default', 'confidence'],
      questions: [
        { type: 'tfng', q: 'According to the text, the scientific evidence for decision fatigue is completely clear.', answer: 'FALSE', explain: 'Bài viết: "the scientific evidence is more mixed than popular articles sometimes suggest" – chưa rõ ràng → FALSE.' },
        { type: 'tfng', q: 'Some well-known experiments on choice have been difficult to repeat.', answer: 'TRUE', explain: 'Bài viết: "Some well-known experiments have proved difficult to repeat" → TRUE.' },
        { type: 'tfng', q: 'People who plan their meals in advance are healthier.', answer: 'NOT GIVEN', explain: 'Bài viết chỉ nói lên kế hoạch bữa ăn giúp cuộc sống "feel calmer", không nói gì về sức khỏe → NOT GIVEN.' },
        { type: 'mcq', q: 'According to research reviews, what does the effect of large choice sets depend on?', options: ['The price of the products', 'The situation, such as whether people know what they like', 'The time of day', 'The age of the shoppers'], answer: 1, explain: 'Bài viết: tác động "depends heavily on the situation – for example, on whether people already know what they like and how easy the options are to compare" → đáp án đúng: The situation, such as whether people know what they like.' },
        { type: 'mcq', q: 'What is the writer\'s main conclusion?', options: ['People should avoid making choices.', 'More choice always makes people happier.', 'Choice is neither good nor bad; information and structure matter.', 'Businesses should offer fewer products.'], answer: 2, explain: 'Bài viết kết luận: "choice itself is neither good nor bad. What matters is whether people have the information and structure they need" → đáp án đúng: Choice is neither good nor bad; information and structure matter..' },
      ],
    },

    /* ===================== A1 ===================== */
{
      id: 'my-morning',
      title: 'My Morning',
      topic: 'daily life',
      level: 'A1',
      emoji: '🌅',
      summaryVi: 'Một buổi sáng bận rộn: dậy lúc sáu giờ, làm bữa sáng cho cả nhà và đi bộ đến trường.',
      summaryEn: 'A busy morning: getting up at six, making breakfast for the family and walking to school.',
      text: `I get up at six o'clock. First, I wash my face and brush my teeth. Then I go to the kitchen. I make breakfast for my family. I eat bread and eggs, and I drink milk. My brother drinks tea. My sister sleeps until seven. At seven, I take my bag and go to school. I walk because school is near my house. I am never late. Every morning is busy, but I like it.`,
      keywords: ['get up', 'wash', 'brush', 'kitchen', 'breakfast', 'bread', 'bag', 'school', 'walk', 'morning'],
      questions: [
        { type: 'tfng', q: 'The writer gets up at six o\'clock.', answer: 'TRUE', explain: 'Bài viết: "I get up at six o\'clock" → TRUE.' },
        { type: 'tfng', q: 'The writer goes to school by bus.', answer: 'FALSE', explain: 'Bài viết: "I walk because school is near my house" – người viết đi bộ, không đi xe buýt → FALSE.' },
        { type: 'tfng', q: 'The writer\'s sister has breakfast with the writer.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói "My sister sleeps until seven"; văn bản không đề cập em gái có ăn sáng cùng hay không → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the writer drink for breakfast?', options: ['Milk', 'Water', 'Tea', 'Juice'], answer: 0, explain: 'Bài viết: "I eat bread and eggs, and I drink milk" – người viết uống sữa (em trai mới uống trà) → đáp án đúng: Milk.' },
        { type: 'mcq', q: 'How does the writer go to school?', options: ['By bus', 'By bike', 'By car', 'On foot'], answer: 3, explain: 'Bài viết: "I walk because school is near my house" – đi bộ đến trường.' },
        { type: 'tfng', q: 'The writer makes breakfast for the family.', answer: 'TRUE', explain: 'Bài viết: "I make breakfast for my family" → TRUE.' },
        { type: 'mcq', q: 'What does the writer\'s brother drink?', options: ['Milk', 'Water', 'Juice', 'Tea'], answer: 3, explain: 'Bài viết: "My brother drinks tea" – em trai uống trà → đáp án đúng: Tea.' },
        { type: 'mcq', q: 'Why does the writer walk to school?', options: ['The bus is full today.', 'It is snowing heavily.', 'School is near the house.', 'My shoes are tight.'], answer: 2, explain: 'Bài viết: "I walk because school is near my house" – đi bộ vì trường gần nhà.' },
      ],
    },
    {
      id: 'my-family',
      title: 'My Family',
      topic: 'family',
      level: 'A1',
      emoji: '👨‍👩‍👧‍👦',
      summaryVi: 'Giới thiệu sáu người trong một gia đình: bố, mẹ, anh em và bà.',
      summaryEn: 'An introduction to six people in one family: father, mother, brother, sister and grandmother.',
      text: `There are six people in my family. My father is a driver. My mother is a nurse. I have one brother and one sister. My brother is ten years old. He likes football. My sister is small. She is two. She can walk, but she cannot read. My grandmother lives with us too. She is old, but she can cook very well. We eat dinner together every evening. I love my family.`,
      keywords: ['family', 'father', 'driver', 'mother', 'nurse', 'brother', 'sister', 'grandmother', 'cook', 'dinner'],
      questions: [
        { type: 'tfng', q: 'The writer\'s mother is a nurse.', answer: 'TRUE', explain: 'Bài viết: "My mother is a nurse" → TRUE.' },
        { type: 'tfng', q: 'The writer\'s sister can read.', answer: 'FALSE', explain: 'Bài viết: "She can walk, but she cannot read" – em gái chưa biết đọc → FALSE.' },
        { type: 'tfng', q: 'The writer\'s father is tall.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói "My father is a driver"; văn bản không đề cập bố có cao hay không → NOT GIVEN.' },
        { type: 'mcq', q: 'Who can cook very well?', options: ['The grandmother', 'The mother', 'The brother', 'The father'], answer: 0, explain: 'Bài viết: "My grandmother lives with us too. She is old, but she can cook very well" – người nấu ăn giỏi là bà.' },
        { type: 'mcq', q: 'How old is the writer\'s brother?', options: ['Two', 'Ten', 'Twelve', 'Six'], answer: 1, explain: 'Bài viết: "My brother is ten years old" – anh/em trai mười tuổi (em gái mới hai tuổi) → đáp án đúng: Ten.' },
        { type: 'tfng', q: 'The family eats dinner together every evening.', answer: 'TRUE', explain: 'Bài viết: "We eat dinner together every evening" → TRUE.' },
        { type: 'mcq', q: 'What is the writer\'s father\'s job?', options: ['A nurse', 'A driver', 'A teacher', 'A cook'], answer: 1, explain: 'Bài viết: "My father is a driver" – bố làm nghề lái xe (mẹ mới là y tá).' },
        { type: 'mcq', q: 'Who is old?', options: ['The grandmother', 'The older sister', 'The younger brother', 'The mother'], answer: 0, explain: 'Bài viết: "She is old, but she can cook very well" – câu này nói về bà ("My grandmother lives with us too") → đáp án đúng: The grandmother.' },
      ],
    },
    {
      id: 'at-the-market',
      title: 'At the Market',
      topic: 'shopping',
      level: 'A1',
      emoji: '🍎',
      summaryVi: 'Hai mẹ con mua táo và chuối ở chợ; bài nêu giá tiền bằng đô la.',
      summaryEn: 'A mother and child buy apples and bananas at the market; the prices are in dollars.',
      text: `Today I am at the market with my mother. There are many fruit stalls. The apples are two dollars a kilo. The bananas are one dollar a kilo. The oranges are three dollars. My mother wants apples and bananas. She buys two kilos of apples. She pays four dollars. Then she buys one kilo of bananas. That is one dollar. So she pays five dollars in all. The seller is friendly. He gives me a small orange. I say, "Thank you!"`,
      keywords: ['market', 'fruit', 'apples', 'bananas', 'oranges', 'dollars', 'kilo', 'buys', 'pays', 'seller'],
      questions: [
        { type: 'tfng', q: 'Bananas are one dollar a kilo.', answer: 'TRUE', explain: 'Bài viết: "The bananas are one dollar a kilo" → TRUE.' },
        { type: 'tfng', q: 'Oranges are two dollars.', answer: 'FALSE', explain: 'Bài viết: "The oranges are three dollars" – cam giá ba đô la, không phải hai → FALSE.' },
        { type: 'tfng', q: 'The seller is a young man.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói "The seller is friendly"; văn bản không đề cập người bán trẻ hay già → NOT GIVEN.' },
        { type: 'mcq', q: 'How much are two kilos of apples?', options: ['Five dollars', 'Two dollars', 'Four dollars', 'One dollar'], answer: 2, explain: 'Bài viết: "She buys two kilos of apples. She pays four dollars" – hai ký táo giá bốn đô la → đáp án đúng: Four dollars.' },
        { type: 'mcq', q: 'What does the seller give the writer?', options: ['A big banana', 'A red apple', 'A ten cent coin', 'A small orange'], answer: 3, explain: 'Bài viết: "He gives me a small orange" – người bán tặng một quả cam nhỏ → đáp án đúng: A small orange.' },
        { type: 'tfng', q: 'The mother buys two kilos of bananas.', answer: 'FALSE', explain: 'Bài viết: "Then she buys one kilo of bananas" – mẹ mua một ký chuối, không phải hai → FALSE.' },
        { type: 'mcq', q: 'How much does the mother pay in all?', options: ['Three dollars', 'Four dollars', 'Six dollars', 'Five dollars'], answer: 3, explain: 'Bài viết: "So she pays five dollars in all" – tổng cộng năm đô la → đáp án đúng: Five dollars.' },
        { type: 'mcq', q: 'What is the seller like?', options: ['Angry', 'Friendly', 'Tired', 'Quiet'], answer: 1, explain: 'Bài viết: "The seller is friendly" – người bán thân thiện → đáp án đúng: Friendly.' },
      ],
    },
    {
      id: 'weather-today',
      title: 'Weather Today',
      topic: 'weather',
      level: 'A1',
      emoji: '☀️',
      summaryVi: 'Hôm nay trời nắng nóng nên người viết ra công viên; ngày mai trời mưa.',
      summaryEn: 'Today is sunny and hot, so the writer goes to the park; tomorrow it is rainy.',
      text: `It is a sunny day today. The sky is blue and there are no clouds. It is hot, about thirty degrees. Children are playing in the park. Some people are eating ice cream. I am wearing a T-shirt and a hat. Tomorrow it is rainy. I need a coat and an umbrella. It is a good day for the park. I can see my friends there. We can play football. I am happy.`,
      keywords: ['sunny', 'sky', 'clouds', 'hot', 'degrees', 'park', 'ice cream', 'rainy', 'coat', 'umbrella'],
      questions: [
        { type: 'tfng', q: 'It is hot today.', answer: 'TRUE', explain: 'Bài viết: "It is hot, about thirty degrees" → TRUE.' },
        { type: 'tfng', q: 'There are many clouds in the sky today.', answer: 'FALSE', explain: 'Bài viết: "The sky is blue and there are no clouds" – hôm nay không có mây → FALSE.' },
        { type: 'tfng', q: 'The writer has a dog.', answer: 'NOT GIVEN', explain: 'Văn bản không đề cập người viết có nuôi chó hay không → NOT GIVEN.' },
        { type: 'mcq', q: 'What are the children doing?', options: ['Playing in the park', 'Cleaning a bike', 'Drawing pictures', 'Riding a bike daily'], answer: 0, explain: 'Bài viết: "Children are playing in the park" – bọn trẻ đang chơi trong công viên → đáp án đúng: Playing in the park.' },
        { type: 'mcq', q: 'What does the writer need tomorrow?', options: ['A pair of sunglasses', 'A pair of sandals', 'A coat and an umbrella', 'A chocolate bar'], answer: 2, explain: 'Bài viết: "Tomorrow it is rainy. I need a coat and an umbrella" – ngày mai cần áo khoác và ô → đáp án đúng: A coat and an umbrella.' },
        { type: 'tfng', q: 'The writer is wearing a hat.', answer: 'TRUE', explain: 'Bài viết: "I am wearing a T-shirt and a hat" → TRUE.' },
        { type: 'mcq', q: 'What are some people eating?', options: ['Bread', 'Apples', 'Eggs', 'Ice cream'], answer: 3, explain: 'Bài viết: "Some people are eating ice cream" – một số người đang ăn kem → đáp án đúng: Ice cream.' },
        { type: 'mcq', q: 'What is the weather like tomorrow?', options: ['Sunny', 'Hot', 'Rainy', 'Windy'], answer: 2, explain: 'Bài viết: "Tomorrow it is rainy" – ngày mai trời mưa → đáp án đúng: Rainy.' },
      ],
    },
{
      id: 'my-school-day',
      title: 'My School Day',
      topic: 'school',
      level: 'A1',
      emoji: '🏫',
      summaryVi: 'Một bạn học sinh kể về ngày đi học của mình: đi bộ đến trường, học các môn, ăn trưa và chơi bóng đá.',
      summaryEn: 'A student describes a school day: walking to school, lessons, lunch and playing football.',
      text: `I go to school at eight o'clock. My school is near my house. I walk with my friend Lan.

We have four lessons in the morning. My favourite lesson is English. At twelve o'clock, we eat lunch in the school room. I have rice and fish.

In the afternoon, we have two more lessons. Then we play football in the yard. I go home at four o'clock. I like my school day. It is a good day.`,
      keywords: ['school', 'walk', 'friend', 'lessons', 'morning', 'favourite', 'lunch', 'rice', 'afternoon', 'football'],
      questions: [
        { type: 'tfng', q: 'The writer walks to school with a friend.', answer: 'TRUE', explain: 'Bài viết: "I walk with my friend Lan" → TRUE.' },
        { type: 'tfng', q: 'There are six lessons in the morning.', answer: 'FALSE', explain: 'Bài viết nói: "We have four lessons in the morning", không phải sáu bài → FALSE.' },
        { type: 'tfng', q: 'Lan likes English too.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói môn yêu thích của người viết là tiếng Anh, không đề cập Lan có thích tiếng Anh hay không → NOT GIVEN.' },
        { type: 'mcq', q: "What is the writer's favourite lesson?", options: ['Maths', 'English', 'Music', 'Sport'], answer: 1, explain: 'Bài viết: "My favourite lesson is English" → đáp án đúng: English.' },
        { type: 'mcq', q: 'When does the writer go home?', options: ["At four o'clock", "At two o'clock", "At three o'clock", "At twelve o'clock"], answer: 0, explain: 'Bài viết: "I go home at four o\'clock" → đáp án đúng: At four o\'clock.' },
        { type: 'tfng', q: 'The writer plays football in the morning.', answer: 'FALSE', explain: 'Bài viết nói: "In the afternoon, we have two more lessons. Then we play football in the yard" → chơi bóng buổi chiều, không phải buổi sáng → FALSE.' },
        { type: 'mcq', q: 'How many lessons are there in the afternoon?', options: ['One', 'Two', 'Three', 'Four'], answer: 1, explain: 'Bài viết: "In the afternoon, we have two more lessons" → đáp án đúng: Two.' },
        { type: 'mcq', q: "Where is the writer's school?", options: ['Far from his house', 'Near the park', 'Near his house', 'Near the market'], answer: 2, explain: 'Bài viết: "My school is near my house" → đáp án đúng: Near his house.' },
      ],
    },
    {
      id: 'a-day-at-the-beach',
      title: 'A Day at the Beach',
      topic: 'travel',
      level: 'A1',
      emoji: '🏖️',
      summaryVi: 'Một gia đình có một ngày vui ở bãi biển: bơi, đọc sách, xây nhà cát và ăn kem.',
      summaryEn: 'A family enjoys a day at the beach: swimming, reading, building a sand house and eating ice cream.',
      text: `It is a hot, sunny day. We are at the beach. The sea is blue and warm. The sand is hot.

My brother is swimming. My mother is sitting under a big umbrella. She is reading a book. I am making a sand house.

There are many people on the beach. Some children are playing with a ball. My father is buying ice cream for us. We are very happy today. I love the sea.`,
      keywords: ['sunny', 'beach', 'sea', 'brother', 'swimming', 'umbrella', 'book', 'sand', 'children', 'ice cream'],
      questions: [
        { type: 'tfng', q: "The writer's brother is swimming.", answer: 'TRUE', explain: 'Bài viết: "My brother is swimming" → TRUE.' },
        { type: 'tfng', q: "The writer's mother is swimming in the sea.", answer: 'FALSE', explain: 'Bài viết nói mẹ đang ngồi dưới ô lớn và đọc sách: "My mother is sitting under a big umbrella. She is reading a book" → FALSE.' },
        { type: 'tfng', q: "The beach is far from the writer's house.", answer: 'NOT GIVEN', explain: 'Bài không nói bãi biển gần hay xa nhà người viết → NOT GIVEN.' },
        { type: 'mcq', q: 'What is the writer making?', options: ['A sand house', 'A sandcastle', 'A beach towel', 'A seashell collection'], answer: 0, explain: 'Bài viết: "I am making a sand house" → đáp án đúng: A sand house.' },
        { type: 'mcq', q: "What is the writer's father doing?", options: ['Reading a book', 'Swimming', 'Playing with a ball', 'Buying ice cream'], answer: 3, explain: 'Bài viết: "My father is buying ice cream for us" → đáp án đúng: Buying ice cream.' },
        { type: 'tfng', q: 'Some children are playing with a ball.', answer: 'TRUE', explain: 'Bài viết: "Some children are playing with a ball" → TRUE.' },
        { type: 'mcq', q: 'What is the weather like?', options: ['Cold and rainy', 'Windy and cold', 'Warm and cloudy', 'Hot and sunny'], answer: 3, explain: 'Bài viết: "It is a hot, sunny day" → đáp án đúng: Hot and sunny.' },
        { type: 'mcq', q: 'What is the sea like?', options: ['Blue and warm', 'Green and cold', 'Big and dirty', 'Small and quiet'], answer: 0, explain: 'Bài viết: "The sea is blue and warm" → đáp án đúng: Blue and warm.' },
      ],
    },
    {
      id: 'my-best-friend',
      title: 'My Best Friend',
      topic: 'people',
      level: 'A1',
      emoji: '🤝',
      summaryVi: 'Người viết giới thiệu người bạn thân Nam: ngoại hình, tính cách, tài năng và những việc họ làm cùng nhau.',
      summaryEn: 'The writer introduces his best friend Nam: his looks, personality, talents and what they do together.',
      text: `My best friend is Nam. He is twelve years old. He is tall and he has short black hair. He is kind and funny. Everyone likes him.

We are in the same class. Nam can play the guitar. He can also sing very well.

After school, we do our homework together. At the weekend, we play games. I like Nam because he is always happy. He is a good friend.`,
      keywords: ['best friend', 'twelve', 'tall', 'short', 'hair', 'kind', 'funny', 'class', 'guitar', 'homework'],
      questions: [
        { type: 'tfng', q: 'Nam can play the guitar.', answer: 'TRUE', explain: 'Bài viết: "Nam can play the guitar" → TRUE.' },
        { type: 'tfng', q: 'Nam has long hair.', answer: 'FALSE', explain: 'Bài viết nói Nam có tóc đen ngắn: "he has short black hair" → FALSE.' },
        { type: 'tfng', q: 'Nam has a brother.', answer: 'NOT GIVEN', explain: 'Bài không nhắc gì đến anh em của Nam → NOT GIVEN.' },
        { type: 'mcq', q: 'How old is Nam?', options: ['Ten', 'Twelve', 'Thirteen', 'Eleven'], answer: 1, explain: 'Bài viết: "He is twelve years old" → đáp án đúng: Twelve.' },
        { type: 'mcq', q: 'When do the two friends play games?', options: ['After school', 'In the morning', 'At the weekend', 'At lunch'], answer: 2, explain: 'Bài viết: "At the weekend, we play games" → đáp án đúng: At the weekend.' },
        { type: 'tfng', q: 'Nam and the writer are in the same class.', answer: 'TRUE', explain: 'Bài viết: "We are in the same class" → TRUE.' },
        { type: 'mcq', q: 'What is Nam like?', options: ['Shy and quiet', 'Angry and loud', 'Kind and funny', 'Lazy and slow'], answer: 2, explain: 'Bài viết: "He is kind and funny" → đáp án đúng: Kind and funny.' },
        { type: 'mcq', q: 'What else can Nam do very well?', options: ['Sing', 'Dance', 'Draw', 'Cook'], answer: 0, explain: 'Bài viết: "He can also sing very well" → đáp án đúng: Sing.' },
      ],
    },
    {
      id: 'in-the-kitchen',
      title: 'In the Kitchen',
      topic: 'home',
      level: 'A1',
      emoji: '🍳',
      summaryVi: 'Người viết tả căn bếp nhỏ của gia đình và giúp mẹ nấu bữa tối.',
      summaryEn: 'The writer describes the family kitchen and helps his mother cook dinner.',
      text: `This is my kitchen. It is small, but it is clean. I like it. There is a table and four chairs. There is a big fridge near the door.

My mother is cooking dinner now. She is making soup. There are some eggs and vegetables on the table. I am helping her. I wash the vegetables.

My father is not here. He is at work. We eat dinner at six o'clock. I love my family.`,
      keywords: ['kitchen', 'small', 'clean', 'table', 'chairs', 'fridge', 'door', 'cooking', 'soup', 'vegetables'],
      questions: [
        { type: 'tfng', q: 'There are four chairs in the kitchen.', answer: 'TRUE', explain: 'Bài viết: "There is a table and four chairs" → TRUE.' },
        { type: 'tfng', q: "The writer's father is cooking dinner.", answer: 'FALSE', explain: 'Bài viết nói mẹ đang nấu ăn: "My mother is cooking dinner now", còn bố đang đi làm: "He is at work" → FALSE.' },
        { type: 'tfng', q: "The writer's mother works in a hospital.", answer: 'NOT GIVEN', explain: 'Bài không nói mẹ làm nghề gì hay làm ở đâu → NOT GIVEN.' },
        { type: 'mcq', q: 'What is the writer doing?', options: ['Cooking soup', 'Washing vegetables', 'Eating dinner', 'Cleaning the fridge'], answer: 1, explain: 'Bài viết: "I am helping her. I wash the vegetables" → đáp án đúng: Washing vegetables.' },
        { type: 'mcq', q: 'Where is the big fridge?', options: ['Next to the table', 'Under the window', 'In the garden', 'Near the door'], answer: 3, explain: 'Bài viết: "There is a big fridge near the door" → đáp án đúng: Near the door.' },
        { type: 'tfng', q: 'The family has a dog.', answer: 'NOT GIVEN', explain: 'Bài không nhắc gì đến con chó hay thú nuôi nào trong nhà → NOT GIVEN.' },
        { type: 'mcq', q: 'What is on the table?', options: ['Eggs and vegetables', 'Fish and potatoes', 'Bread and cheese', 'Fruit and cookies'], answer: 0, explain: 'Bài viết: "There are some eggs and vegetables on the table" → đáp án đúng: Eggs and vegetables.' },
        { type: 'mcq', q: 'When does the family eat dinner?', options: ["At five o'clock", "At seven o'clock", "At eight o'clock", "At six o'clock"], answer: 3, explain: 'Bài viết: "We eat dinner at six o\'clock" → đáp án đúng: At six o\'clock.' },
      ],
    },
{
      id: 'my-bedroom',
      title: 'My Bedroom',
      topic: 'home',
      level: 'A1',
      emoji: '🛏️',
      summaryVi: 'Một bạn nhỏ tả phòng ngủ của mình: có giường, bàn học, đèn, tranh và một chiếc ghế đỏ để đọc sách.',
      summaryEn: 'A young person describes a small bedroom with a bed, a desk, a lamp, pictures and a red chair for reading.',
      text: `This is my bedroom. It is small, but I like it. There is a bed next to the window. The bed is blue. There is a desk near the door. On the desk, there is a lamp and some books. I do my homework at the desk every evening. There are two pictures on the wall. There is a big red chair in the corner. I read books on the chair. I sleep well in my bedroom.`,
      keywords: ['bedroom', 'small', 'bed', 'window', 'desk', 'lamp', 'homework', 'pictures', 'wall', 'chair'],
      questions: [
        { type: 'tfng', q: 'The bed is next to the window.', answer: 'TRUE', explain: 'Bài viết: "There is a bed next to the window" → TRUE.' },
        { type: 'tfng', q: 'The desk is near the window.', answer: 'FALSE', explain: 'Bài viết: "There is a desk near the door" – bàn học ở gần cửa ra vào, không phải cửa sổ → FALSE.' },
        { type: 'tfng', q: 'There is a computer on the desk.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói trên bàn có đèn và sách, không nhắc đến máy tính → NOT GIVEN.' },
        { type: 'mcq', q: 'Where does the writer read books?', options: ['On the bed', 'At the desk', 'On the chair', 'In the kitchen'], answer: 2, explain: 'Bài viết: "I read books on the chair" → đọc sách trên ghế.' },
        { type: 'mcq', q: 'What colour is the bed?', options: ['Red', 'Blue', 'Yellow', 'Green'], answer: 1, explain: 'Bài viết: "The bed is blue" → giường màu xanh dương (chiếc ghế mới là màu đỏ).' },
        { type: 'tfng', q: 'There are two pictures on the wall.', answer: 'TRUE', explain: 'Bài viết: "There are two pictures on the wall" → TRUE.' },
        { type: 'mcq', q: 'Where is the lamp?', options: ['On the bed', 'On the chair', 'On the desk', 'On the wall'], answer: 2, explain: 'Bài viết: "On the desk, there is a lamp and some books" → đèn ở trên bàn học.' },
        { type: 'mcq', q: 'When does the writer do homework?', options: ['At night', 'Every evening', 'In the morning', 'On Sunday'], answer: 1, explain: 'Bài viết: "I do my homework at the desk every evening" → làm bài tập mỗi buổi tối.' },
      ],
    },
    {
      id: 'a-birthday-party',
      title: 'A Birthday Party',
      topic: 'family',
      level: 'A1',
      emoji: '🎂',
      summaryVi: 'Hôm nay là sinh nhật em gái người kể: có bánh, bóng bay, pizza, trò chơi và quà.',
      summaryEn: 'Today is the writer\'s sister\'s birthday: there is a cake, balloons, pizza, games and presents.',
      text: `Today is my sister's birthday. She is ten years old. Our friends are at our house. There is a big cake on the table. It has ten candles. My mother is in the kitchen. She makes pizza for everyone. My father puts balloons on the wall. The children play games in the garden. My sister opens her presents. She is very happy. We sing a birthday song. Then we eat the cake together.`,
      keywords: ['birthday', 'sister', 'friends', 'cake', 'candles', 'kitchen', 'pizza', 'balloons', 'games', 'presents'],
      questions: [
        { type: 'tfng', q: 'There is a big cake on the table.', answer: 'TRUE', explain: 'Bài viết: "There is a big cake on the table" → TRUE.' },
        { type: 'tfng', q: 'The mother is in the garden.', answer: 'FALSE', explain: 'Bài viết: "My mother is in the kitchen" – mẹ ở trong bếp, còn bọn trẻ mới chơi ở vườn → FALSE.' },
        { type: 'tfng', q: 'The sister gets a new bicycle.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói cô bé mở quà ("opens her presents"), không nói đó là xe đạp → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the mother make?', options: ['Pizza', 'Soup', 'Rice', 'Bread'], answer: 0, explain: 'Bài viết: "She makes pizza for everyone" → mẹ làm pizza.' },
        { type: 'mcq', q: 'Who puts balloons on the wall?', options: ['The mother', 'The sister', 'A friend', 'The father'], answer: 3, explain: 'Bài viết: "My father puts balloons on the wall" → bố treo bóng bay.' },
        { type: 'tfng', q: 'The cake has ten candles.', answer: 'TRUE', explain: 'Bài viết: "It has ten candles" → bánh có mười cây nến → TRUE.' },
        { type: 'mcq', q: 'Where do the children play games?', options: ['In the kitchen', 'In the garden', 'On the table', 'At school'], answer: 1, explain: 'Bài viết: "The children play games in the garden" → bọn trẻ chơi ở trong vườn.' },
        { type: 'mcq', q: 'What do they do after the birthday song?', options: ['They eat the cake', 'They play games', 'They open presents', 'They go home'], answer: 0, explain: 'Bài viết: "We sing a birthday song. Then we eat the cake together" → sau bài hát họ cùng ăn bánh.' },
      ],
    },
    {
      id: 'at-the-doctor',
      title: 'At the Doctor',
      topic: 'health',
      level: 'A1',
      emoji: '🩺',
      summaryVi: 'Anna bị đau đầu và đau họng, đến gặp bác sĩ; bác sĩ nói cô bị cảm và cho thuốc.',
      summaryEn: 'Anna has a headache and a sore throat; the doctor says she has a cold and gives her medicine.',
      text: `Anna is at the doctor's today. She has a headache and a sore throat. The doctor is a kind woman. She looks at Anna's throat. She says, "You have a cold." Anna must stay at home. She must drink warm water and rest. The doctor gives her some medicine. Anna takes it three times a day. She says thank you and goes home. The doctor says she can go to school in two days.`,
      keywords: ['doctor', 'headache', 'sore', 'throat', 'kind', 'cold', 'rest', 'medicine', 'school', 'warm'],
      questions: [
        { type: 'tfng', q: 'Anna has a sore throat.', answer: 'TRUE', explain: 'Bài viết: "She has a headache and a sore throat" → TRUE.' },
        { type: 'tfng', q: 'The doctor is a man.', answer: 'FALSE', explain: 'Bài viết: "The doctor is a kind woman" – bác sĩ là phụ nữ → FALSE.' },
        { type: 'tfng', q: 'Anna\'s mother goes to the doctor with her.', answer: 'NOT GIVEN', explain: 'Bài không nhắc đến mẹ của Anna hay ai đi cùng cô → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the doctor say Anna has?', options: ['A stomachache', 'A broken leg', 'A cold', 'A toothache'], answer: 2, explain: 'Bài viết: "You have a cold" → bác sĩ nói Anna bị cảm.' },
        { type: 'mcq', q: 'How often does Anna take the medicine?', options: ['Every hour', 'Once a day', 'Two times a day', 'Three times a day'], answer: 3, explain: 'Bài viết: "Anna takes it three times a day" → uống ba lần một ngày.' },
        { type: 'tfng', q: 'Anna has a fever.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói Anna đau đầu, đau họng và bị cảm ("a headache and a sore throat"), không nhắc đến sốt → NOT GIVEN.' },
        { type: 'mcq', q: 'What must Anna drink?', options: ['Cold milk', 'Warm water', 'Orange juice', 'Hot tea'], answer: 1, explain: 'Bài viết: "She must drink warm water and rest" → Anna phải uống nước ấm.' },
        { type: 'mcq', q: 'When can Anna go to school?', options: ['Today', 'Tomorrow', 'In two days', 'In a week'], answer: 2, explain: 'Bài viết: "The doctor says she can go to school in two days" → hai ngày nữa Anna có thể đi học.' },
      ],
    },
    {
      id: 'my-pet-dog',
      title: 'My Pet Dog',
      topic: 'animals',
      level: 'A1',
      emoji: '🐶',
      summaryVi: 'Người kể giới thiệu chú chó Max: màu nâu trắng, thích chạy ở công viên, chơi bóng và ngủ trong bếp.',
      summaryEn: 'The writer introduces a dog called Max: brown and white, he likes running in the park, playing with a ball and sleeping in the kitchen.',
      text: `I have a dog. His name is Max. He is two years old. Max is brown and white. He has big ears and a long tail. He likes to run in the park. He also likes to play with a ball. Every morning I give him food and water. In the evening, we go for a walk. Max sleeps in a small bed in the kitchen. I love my dog very much.`,
      keywords: ['dog', 'name', 'brown', 'white', 'ears', 'tail', 'park', 'ball', 'morning', 'walk'],
      questions: [
        { type: 'tfng', q: 'Max is two years old.', answer: 'TRUE', explain: 'Bài viết: "He is two years old" → TRUE.' },
        { type: 'tfng', q: 'Max sleeps in the garden.', answer: 'FALSE', explain: 'Bài viết: "Max sleeps in a small bed in the kitchen" – Max ngủ trong bếp → FALSE.' },
        { type: 'tfng', q: 'Max can swim.', answer: 'NOT GIVEN', explain: 'Bài không nhắc đến việc Max biết bơi → NOT GIVEN.' },
        { type: 'mcq', q: 'What does Max like to play with?', options: ['A ball', 'A stick', 'A bone', 'A toy cat'], answer: 0, explain: 'Bài viết: "He also likes to play with a ball" → Max thích chơi với quả bóng.' },
        { type: 'mcq', q: 'Where does Max like to run?', options: ['In the garden', 'On the beach', 'In the house', 'In the park'], answer: 3, explain: 'Bài viết: "He likes to run in the park" → Max thích chạy ở công viên.' },
        { type: 'tfng', q: 'Max has small ears.', answer: 'FALSE', explain: 'Bài viết: "He has big ears and a long tail" – tai Max to, không nhỏ → FALSE.' },
        { type: 'mcq', q: 'What does the writer give Max every morning?', options: ['A quick bath', 'A short walk', 'A squeaky toy', 'Food and water'], answer: 3, explain: 'Bài viết: "Every morning I give him food and water" → sáng nào cũng cho Max ăn và uống (đi dạo là vào buổi tối).' },
        { type: 'mcq', q: 'What is Max\'s tail like?', options: ['Short', 'Black', 'Long', 'Small'], answer: 2, explain: 'Bài viết: "He has big ears and a long tail" → đuôi của Max dài.' },
      ],
    },
{
      id: 'my-town',
      title: 'My Town',
      topic: 'places',
      level: 'A1',
      emoji: '🏘️',
      summaryVi: 'Một người giới thiệu thị trấn nhỏ, yên tĩnh và sạch sẽ của mình với công viên, trường học, cửa hàng và trạm xe buýt.',
      summaryEn: 'A person describes a small, quiet and clean town with a park, a school, shops and a bus station.',
      text: `I live in a small town. There is a big park in the centre. There are many trees and flowers in it. There is a school near the park.

My mother works in a shop on Main Street. There are two banks and a post office too. There is no airport, but there is a bus station.

People in my town are friendly. I like my town because it is quiet and clean.`,
      keywords: ['town', 'park', 'centre', 'flowers', 'school', 'shop', 'airport', 'station', 'friendly', 'quiet'],
      questions: [
        { type: 'tfng', q: 'There is a big park in the centre of the town.', answer: 'TRUE', explain: 'Bài viết: "There is a big park in the centre" → TRUE.' },
        { type: 'tfng', q: 'There is an airport in the town.', answer: 'FALSE', explain: 'Bài viết nói: "There is no airport, but there is a bus station" → không có sân bay → FALSE.' },
        { type: 'tfng', q: "The writer's father works in a bank.", answer: 'NOT GIVEN', explain: 'Bài chỉ nói mẹ làm việc ở một cửa hàng; bài không nhắc đến bố hay nghề của bố → NOT GIVEN.' },
        { type: 'mcq', q: "Where does the writer's mother work?", options: ['In a shop', 'In a school', 'In a bank', 'In a post office'], answer: 0, explain: 'Bài viết: "My mother works in a shop on Main Street" → mẹ làm ở một cửa hàng.' },
        { type: 'mcq', q: 'Why does the writer like the town?', options: ['It is big and busy.', 'It is quiet and clean.', 'It has an airport.', 'It has many banks.'], answer: 1, explain: 'Bài viết: "I like my town because it is quiet and clean" → yên tĩnh và sạch sẽ.' },
        { type: 'tfng', q: 'There are three banks in the town.', answer: 'FALSE', explain: 'Bài viết: "There are two banks and a post office too" → có hai ngân hàng, không phải ba → FALSE.' },
        { type: 'mcq', q: 'What is near the park?', options: ['A bank', 'A school', 'A shop', 'A post office'], answer: 1, explain: 'Bài viết: "There is a school near the park" → trường học ở gần công viên.' },
        { type: 'mcq', q: 'In the text, "friendly" means', options: ['not nice to people', 'very big', 'kind to other people', 'very old'], answer: 2, explain: 'Bài viết: "People in my town are friendly" → người dân thân thiện, tức là tử tế với người khác.' },
      ],
    },
    {
      id: 'a-train-trip',
      title: 'A Train Trip',
      topic: 'travel',
      level: 'A1',
      emoji: '🚆',
      summaryVi: 'Một người đang đi tàu ra biển, ngồi cạnh cửa sổ, ngắm cánh đồng xanh và mong được nhìn thấy biển.',
      summaryEn: 'A person is on a train to the coast, sits by the window, sees green fields and is excited to see the sea.',
      text: `Today I am on a train to the coast. The train is fast and clean. I have a window seat. I can see green fields and small houses.

A woman sits next to me. She is reading a book. A man sells tea and cakes. The ticket is cheap, only ten pounds. The journey takes two hours. The train stops at three stations.

I am happy because I want to see the sea.`,
      keywords: ['train', 'coast', 'fast', 'window', 'seat', 'fields', 'ticket', 'cheap', 'journey', 'hours'],
      questions: [
        { type: 'tfng', q: 'The writer has a window seat.', answer: 'TRUE', explain: 'Bài viết: "I have a window seat" → TRUE.' },
        { type: 'tfng', q: 'The ticket is expensive.', answer: 'FALSE', explain: 'Bài viết: "The ticket is cheap, only ten pounds" → vé rẻ, không đắt → FALSE.' },
        { type: 'tfng', q: 'The woman next to the writer is a teacher.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói người phụ nữ đang đọc sách; bài không nhắc đến nghề nghiệp của bà → NOT GIVEN.' },
        { type: 'mcq', q: 'What can the writer see from the window?', options: ['Green fields and small houses', 'Big cities and tall buildings', 'Mountains and snow', 'A river and boats'], answer: 0, explain: 'Bài viết: "I can see green fields and small houses" → đáp án đúng: Green fields and small houses.' },
        { type: 'mcq', q: 'Why is the writer happy?', options: ['The train is late.', 'The tea is free.', 'The seat is next to a friend.', 'The writer wants to see the sea.'], answer: 3, explain: 'Bài viết: "I am happy because I want to see the sea" → vì muốn nhìn thấy biển.' },
        { type: 'tfng', q: 'The train stops at three stations.', answer: 'TRUE', explain: 'Bài viết: "The train stops at three stations" → TRUE.' },
        { type: 'mcq', q: 'How long is the journey?', options: ['One hour', 'Three hours', 'Two hours', 'Ten hours'], answer: 2, explain: 'Bài viết: "The journey takes two hours" → hành trình mất hai giờ.' },
        { type: 'mcq', q: 'What does the man on the train sell?', options: ['Tea and cakes', 'Books and tickets', 'Water and fruit', 'Bread and milk'], answer: 0, explain: 'Bài viết: "A man sells tea and cakes" → bán trà và bánh.' },
      ],
    },
    {
      id: 'my-favourite-food',
      title: 'My Favourite Food',
      topic: 'food',
      level: 'A1',
      emoji: '🍗',
      summaryVi: 'Một người kể về món cơm gà yêu thích do bà nấu mỗi Chủ nhật và cả nhà cùng ăn.',
      summaryEn: 'A person talks about a favourite dish of rice and chicken that their grandmother cooks every Sunday for the family.',
      text: `My favourite food is rice with chicken. My grandmother cooks it every Sunday. She uses garlic, onions and a little salt. The smell is very good.

We sit at a big table. I eat it with fresh vegetables. I also drink a glass of water. My brother does not like chicken, so he eats fish. After lunch, we have fruit.

I think home food is the best food. It is healthy and it makes everyone happy.`,
      keywords: ['favourite', 'rice', 'chicken', 'grandmother', 'Sunday', 'garlic', 'onions', 'vegetables', 'fish', 'healthy'],
      questions: [
        { type: 'tfng', q: 'The writer\'s grandmother cooks the dish every Sunday.', answer: 'TRUE', explain: 'Bài viết: "My grandmother cooks it every Sunday" → TRUE.' },
        { type: 'tfng', q: 'The writer\'s brother likes chicken.', answer: 'FALSE', explain: 'Bài viết: "My brother does not like chicken, so he eats fish" → em/anh không thích gà → FALSE.' },
        { type: 'tfng', q: 'The writer learns to cook from his grandmother.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói bà nấu món ăn; bài không nhắc đến việc người viết học nấu ăn → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the grandmother use in the dish?', options: ['Milk and sugar', 'Tomatoes and cheese', 'Eggs and bread', 'Garlic and onions'], answer: 3, explain: 'Bài viết: "She uses garlic, onions and a little salt" → tỏi và hành.' },
        { type: 'mcq', q: 'What does the writer\'s brother eat?', options: ['Eggs', 'Fish', 'Beef', 'Soup'], answer: 1, explain: 'Bài viết: "My brother does not like chicken, so he eats fish" → ăn cá.' },
        { type: 'tfng', q: 'The writer drinks water with the meal.', answer: 'TRUE', explain: 'Bài viết: "I also drink a glass of water" → TRUE.' },
        { type: 'mcq', q: 'What does the family have after lunch?', options: ['Fruit', 'Cake', 'Ice cream', 'Tea'], answer: 0, explain: 'Bài viết: "After lunch, we have fruit" → ăn trái cây sau bữa trưa.' },
        { type: 'mcq', q: 'Why does the writer think home food is the best?', options: ['It is cheap and fast.', 'It has a lot of salt.', 'It is healthy and makes everyone happy.', 'It is always chicken.'], answer: 2, explain: 'Bài viết: "It is healthy and it makes everyone happy" → tốt cho sức khỏe và làm mọi người vui.' },
      ],
    },
    {
      id: 'my-weekend',
      title: 'My Weekend',
      topic: 'daily-life',
      level: 'A1',
      emoji: '🗓️',
      summaryVi: 'Một người kể về cuối tuần của mình: đá bóng, dọn phòng, xem phim và thăm ông bà.',
      summaryEn: 'A person describes their weekend: playing football, cleaning, watching a film and visiting grandparents.',
      text: `I like my weekend. On Saturday morning, I play football with my friends. In the afternoon, I clean my room and do my homework. In the evening, we watch a film at home.

On Sunday, I visit my grandparents. We have lunch together and talk. Then I walk home. At night, I read a book and go to bed early.

I am tired on Monday, but I am happy.`,
      keywords: ['weekend', 'Saturday', 'morning', 'football', 'friends', 'homework', 'evening', 'film', 'Sunday', 'grandparents'],
      questions: [
        { type: 'tfng', q: 'The writer plays football on Saturday morning.', answer: 'TRUE', explain: 'Bài viết: "On Saturday morning, I play football with my friends" → TRUE.' },
        { type: 'tfng', q: 'The writer visits his grandparents on Saturday.', answer: 'FALSE', explain: 'Bài viết: "On Sunday, I visit my grandparents" → đi thăm ông bà vào Chủ nhật, không phải thứ Bảy → FALSE.' },
        { type: 'tfng', q: 'The writer\'s friends play football very well.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói người viết chơi bóng với bạn; bài không nhắc đến việc các bạn chơi giỏi hay không → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the writer do on Saturday afternoon?', options: ['Plays soccer with friends in the park', 'Cleans the room and does homework', 'Views a movie together with the family', 'Enjoys reading a novel before bedtime'], answer: 1, explain: 'Bài viết: "In the afternoon, I clean my room and do my homework".' },
        { type: 'mcq', q: 'What does the writer do at night?', options: ['Watches a movie and stays up late', 'Plays games with friends and chats online', 'Walks home and stops at a shop', 'Reads a book and goes to bed early'], answer: 3, explain: 'Bài viết: "At night, I read a book and go to bed early" → đáp án đúng: Reads a book and goes to bed early.' },
        { type: 'tfng', q: 'The writer goes to bed late at night.', answer: 'FALSE', explain: 'Bài viết: "At night, I read a book and go to bed early" → đi ngủ sớm, không phải muộn → FALSE.' },
        { type: 'mcq', q: 'Who does the writer visit on Sunday?', options: ['His neighbours', 'His grandparents', 'His auntie Mary', 'His uncles nearby'], answer: 1, explain: 'Bài viết: "On Sunday, I visit my grandparents" → thăm ông bà.' },
        { type: 'mcq', q: 'How does the writer feel on Monday?', options: ['Sad and angry', 'Hungry and sleepy', 'Tired but happy', 'Ill and sad'], answer: 2, explain: 'Bài viết: "I am tired on Monday, but I am happy" → mệt nhưng vui.' },
      ],
    },

    /* ===================== C2 ===================== */
    {
      id: 'falsification-limits',
      title: 'The Limits of Falsification',
      topic: 'science',
      level: 'C2',
      emoji: '🔭',
      summaryVi: 'Tiêu chí bác bỏ được của Popper rất thanh nhã nhưng nghiên cứu thực tế hiếm khi tuân theo; vì lý thuyết luôn được kiểm tra cùng các giả định phụ, nó nên là một lý tưởng điều chỉnh hơn là một phép thử máy móc.',
      summaryEn: 'Popper\'s falsifiability criterion is elegant, but real research seldom follows it; because theories are tested with auxiliary assumptions, it works better as a regulative ideal than as a mechanical test.',
      text: `Few ideas have shaped the popular image of science as profoundly as Karl Popper's claim that a theory is scientific only if it could, in principle, be refuted by observation. The criterion is elegant, and it has the merit of excluding doctrines that accommodate every conceivable outcome. Yet historians of science have long observed that actual research seldom conforms to so austere a model.

Consider what happens when a prediction fails. A theory never confronts the evidence alone; it arrives accompanied by auxiliary assumptions about instruments, background conditions and the behaviour of the materials under study. A discordant result therefore tells us only that something in this whole bundle is mistaken, not which strand should be discarded. In the nineteenth century, irregularities in the orbit of Uranus were met not by abandoning Newtonian mechanics but by postulating an unseen planet, and the gamble paid off with the discovery of Neptune. When an analogous anomaly in Mercury's orbit was blamed on a second hypothetical planet, however, the strategy came to nothing, and the problem was eventually resolved only by a different theory of gravity altogether.

The moral is not that falsifiability is worthless, but that it works better as a regulative ideal than as a mechanical test. Scientists are rational to protect a fruitful theory from a single awkward datum, provided the protective manoeuvres themselves generate new, testable predictions. What distinguishes a healthy research programme from a degenerating one is, on this view, whether its adjustments expand its empirical reach or merely patch over its failures.`,
      keywords: ['falsifiability', 'refuted', 'austere', 'auxiliary', 'discordant', 'postulating', 'anomaly', 'regulative', 'degenerating', 'empirical'],
      questions: [
        { type: 'mcq', q: 'According to the passage, what does Popper\'s criterion require of a scientific theory?', options: ['It must be possible, in principle, to refute it by observation', 'It must be verified through multiple laboratory tests', 'It must explain all known phenomena without exception', 'It must receive unanimous endorsement from the scientific community'], answer: 0, explain: 'Đoạn văn nhấn mạnh tiêu chí falsifiability của Popper là lý thuyết phải có khả năng bị phản bác bằng quan sát, không phải phải đã được lặp lại, dự đoán mọi kết quả, hay được đa số nhà sử học chấp nhận.' },
        { type: 'mcq', q: 'Why does a failed prediction not simply refute a theory?', options: ['Researchers often dismiss data that challenge their hypotheses', 'Measurements are always too imprecise to reveal flaws', 'Unsuccessful forecasts occur so infrequently they lack significance', 'The theory is always tested together with auxiliary assumptions'], answer: 3, explain: 'Bài viết: "A theory never confronts the evidence alone" → đáp án đúng: The theory is always tested together with auxiliary assumptions.' },
        { type: 'tfng', q: 'The search for an unseen planet to explain the orbit of Uranus ultimately succeeded.', answer: 'TRUE', explain: 'Bài viết: "the gamble paid off with the discovery of Neptune" → TRUE.' },
        { type: 'tfng', q: 'The anomaly in the orbit of Mercury was resolved by discovering a second planet.', answer: 'FALSE', explain: 'Bài viết: "the problem was eventually resolved only by a different theory of gravity altogether" → FALSE.' },
        { type: 'tfng', q: 'Popper himself later abandoned the falsifiability criterion.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói về tiêu chí của Popper và những hạn chế của nó, không cho biết chính Popper có từ bỏ tiêu chí này hay không → NOT GIVEN.' },
        { type: 'mcq', q: 'How does the writer suggest falsifiability is best treated?', options: ['As a regulative ideal rather than a mechanical test', 'As a mandatory checkpoint that all theories must clear immediately', 'As a historical notion that no longer influences research', 'As a principle limited exclusively to astronomical investigations'], answer: 0, explain: 'Bài viết: "it works better as a regulative ideal than as a mechanical test" → đáp án đúng: As a regulative ideal rather than a mechanical test.' },
        { type: 'mcq', q: 'What distinguishes a healthy research programme from a degenerating one?', options: ['Whether it avoids making any predictions', 'Whether it has attracted the largest number of researchers', 'Whether its adjustments widen its empirical reach rather than merely patch over failures', 'Whether it keeps its original assumptions unchanged'], answer: 2, explain: 'Bài viết: "whether its adjustments expand its empirical reach or merely patch over its failures" → đáp án đúng: Whether its adjustments widen its empirical reach rather than merely patch over failures.' },
        { type: 'mcq', q: 'In the first paragraph, "austere" suggests that Popper\'s model is', options: ['pleasantly simple and easy to apply', 'strictly demanding and unadorned', 'old-fashioned but widely loved', 'fiercely disputed by scientists'], answer: 1, explain: 'Bài viết: "actual research seldom conforms to so austere a model" → đáp án đúng: strictly demanding and unadorned.' },
      ],
    },
    {
      id: 'language-and-thought',
      title: 'Does Language Shape Thought?',
      topic: 'language',
      level: 'C2',
      emoji: '🗣️',
      summaryVi: 'Giả thuyết mạnh rằng ngôn ngữ quy định tư duy đã thất bại, còn giả thuyết yếu có bằng chứng nhưng khiêm tốn và còn tranh cãi; ngôn ngữ giống những lối mòn giúp một số hướng nghĩ dễ đi hơn.',
      summaryEn: 'The strong claim that language dictates thought has failed, while the weak version has modest but contested evidence; language is better seen as well-worn paths that make some routes of thinking easier.',
      text: `The proposition that the language we speak shapes the way we think has enjoyed a chequered career. In its strong form, associated with early twentieth-century formulations, it held that speakers of different languages inhabit incommensurable mental worlds, so that certain thoughts are literally unthinkable without the appropriate words. This version has fared poorly. Infants plainly perceive distinctions long before they acquire vocabulary, and translators routinely convey ideas across languages that carve up experience differently.

A weaker thesis has proved far more durable. Experiments suggest that habitual patterns of expression can nudge attention and memory in subtle, measurable ways. Speakers of languages that mark grammatical gender, for instance, sometimes describe the same object with different adjectives depending on whether their language treats it as masculine or feminine. Russian speakers, whose language obliges them to distinguish light from dark blue with separate basic terms, tend to discriminate between those shades marginally faster than English speakers do.

Such effects are real but modest, and their interpretation remains contested. Critics point out that laboratory tasks may themselves invite speakers to consult their linguistic habits, which would exaggerate the influence of language in everyday cognition. Proponents reply that small biases, repeated across countless moments of perception, could accumulate into something more significant. What seems safe to conclude is that language does not imprison thought, yet neither is it a transparent window onto a universal mental reality: it is better understood as a set of well-worn paths that make some routes of thinking easier to follow than others.`,
      keywords: ['chequered', 'incommensurable', 'unthinkable', 'discriminate', 'habitual', 'contested', 'exaggerate', 'proponents', 'accumulate', 'transparent'],
      questions: [
        { type: 'mcq', q: 'Why has the strong version of the proposition "fared poorly"?', options: ['Translators have never managed to convey ideas across languages', 'No experiment has ever been designed to test it', 'It was proposed too recently to be assessed', 'Infants perceive distinctions before they have words for them'], answer: 3, explain: 'Bài viết: "Infants plainly perceive distinctions long before they acquire vocabulary" → đáp án đúng: Infants perceive distinctions before they have words for them.' },
        { type: 'tfng', q: 'The strong version claims that some thoughts are impossible without the corresponding words.', answer: 'TRUE', explain: 'Bài viết: "certain thoughts are literally unthinkable without the appropriate words" → TRUE.' },
        { type: 'tfng', q: 'Russian speakers are noticeably slower than English speakers at telling light blue from dark blue.', answer: 'FALSE', explain: 'Bài viết: "tend to discriminate between those shades marginally faster than English speakers do" → FALSE.' },
        { type: 'tfng', q: 'Bilingual speakers show stronger effects of language on thought than monolingual speakers.', answer: 'NOT GIVEN', explain: 'Bài không so sánh người song ngữ với người đơn ngữ → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the example of grammatical gender suggest?', options: ['Habitual grammatical categories may influence which adjectives speakers choose', 'Masculine objects are always described more positively', 'Gender is the most important feature of any language', 'Speakers ignore grammatical gender when they describe objects'], answer: 0, explain: 'Bài viết: "sometimes describe the same object with different adjectives" → đáp án đúng: Habitual grammatical categories may influence which adjectives speakers choose.' },
        { type: 'mcq', q: 'What is the critics\' objection to the experimental evidence?', options: ['The experiments involved too few languages', 'The effects were too large to be believable', 'The participants were all native speakers of English', 'The tasks may prompt speakers to rely on their language, inflating the effect'], answer: 3, explain: 'Bài viết: "which would exaggerate the influence of language in everyday cognition" → đáp án đúng: The tasks may prompt speakers to rely on their language, inflating the effect.' },
        { type: 'mcq', q: 'How do proponents answer the critics?', options: ['Every daily thought operates independently of any linguistic influence', 'Small biases repeated many times may add up to something significant', 'Experimental findings consistently mirror everyday actions without deviation', 'Opponents claim the original studies were never examined thoroughly'], answer: 1, explain: 'Bài viết: "small biases, repeated across countless moments of perception, could accumulate into something more significant" → đáp án đúng: Small biases repeated many times may add up to something significant.' },
        { type: 'mcq', q: 'Which statement best captures the writer\'s conclusion?', options: ['Language has no effect whatsoever on thought', 'Thought is completely determined by vocabulary', 'Language neither imprisons thought nor mirrors reality, but eases some paths of thinking', 'All languages share a single universal way of thinking'], answer: 2, explain: 'Bài viết: "it is better understood as a set of well-worn paths that make some routes of thinking easier to follow than others" → đáp án đúng: Language neither imprisons thought nor mirrors reality, but eases some paths of thinking.' },
      ],
    },
    {
      id: 'goodhart-metrics',
      title: 'When a Measure Becomes a Target',
      topic: 'economy',
      level: 'C2',
      emoji: '📊',
      summaryVi: 'Định luật Goodhart: một chỉ số khi bị biến thành mục tiêu sẽ hết còn đo tốt; bài giải thích cơ chế, ví dụ trong bệnh viện và đại học, và khuyên dùng nhiều chỉ số như gợi ý để tìm hiểu chứ không phải phán quyết.',
      summaryEn: 'Goodhart\'s law: a measure that becomes a target stops being a good measure; the article explains the mechanism, with hospital and university examples, and recommends using several indicators as prompts for inquiry.',
      text: `In 1975 the economist Charles Goodhart observed that any statistical regularity tends to collapse once it is pressed into service for control purposes. The principle, since generalised into the maxim that a measure which becomes a target ceases to be a good measure, explains an astonishing range of institutional pathologies. Hospitals instructed to reduce waiting times have been known to keep patients in ambulances outside the building, where the clock has not yet started. Universities rewarded for publication counts oblige researchers to divide a single study into several slender papers.

The underlying mechanism is not mere cynicism. A metric is a proxy: it stands in for something harder to observe, such as quality of care or depth of scholarship, because the real object resists direct quantification. So long as nobody's livelihood depends on the proxy, it tracks the underlying reality tolerably well. Once rewards and penalties attach to it, however, rational agents redirect their effort toward whatever the indicator captures, and the correlation that made it useful erodes.

None of this implies that organisations should abandon measurement; judgement unaided by evidence has its own, rather well-documented, vices. A more defensible conclusion is that indicators should be plural, difficult to game and treated as prompts for inquiry rather than as verdicts. Managers who ask why a figure has moved, rather than how to move it, preserve the information the number was meant to supply. The temptation to do the opposite is considerable, because a single figure is easy to publish, to compare and to defend, whereas understanding is slow, qualitative and awkward to put on a chart.`,
      keywords: ['regularity', 'pathologies', 'slender', 'proxy', 'quantification', 'livelihood', 'indicator', 'erodes', 'verdicts', 'qualitative'],
      questions: [
        { type: 'mcq', q: 'What did Goodhart observe?', options: ['A statistical regularity tends to collapse when it is used for control', 'Governments should avoid gathering statistical data for policy decisions', 'Economic indicators are frequently misleading when used to predict growth', 'Hospitals often report waiting times inaccurately to improve public image'], answer: 0, explain: 'Bài viết: "any statistical regularity tends to collapse once it is pressed into service for control purposes" → đáp án đúng: A statistical regularity tends to collapse when it is used for control.' },
        { type: 'tfng', q: 'Some hospitals have kept patients waiting in ambulances so that waiting-time clocks have not started.', answer: 'TRUE', explain: 'Bài viết: "keep patients in ambulances outside the building" → TRUE.' },
        { type: 'tfng', q: 'The writer claims that researchers who split studies into several papers are acting out of simple cynicism.', answer: 'FALSE', explain: 'Bài viết: "The underlying mechanism is not mere cynicism" → FALSE.' },
        { type: 'tfng', q: 'Goodhart spent most of his career working at a central bank.', answer: 'NOT GIVEN', explain: 'Bài chỉ nêu Goodhart là nhà kinh tế học và năm 1975 ông đưa ra nhận xét; không nói gì về nơi ông làm việc → NOT GIVEN.' },
        { type: 'mcq', q: 'Why does the writer describe a metric as a "proxy"?', options: ['It originates from an external source', 'It costs less than gathering the actual information', 'Its application is limited to health and schooling fields', 'It stands in for something that is hard to measure directly'], answer: 3, explain: 'Bài viết: "because the real object resists direct quantification" → đáp án đúng: It stands in for something that is hard to measure directly.' },
        { type: 'mcq', q: 'What happens once rewards and penalties are attached to an indicator?', options: ['People treat the indicator as a suggestion, rarely basing decisions on it', 'People redirect effort towards the indicator, weakening its link to reality', 'The indicator becomes more precise, leading to better measurement of performance', 'Organisations keep gathering data, but they do not change any policies based on the indicator'], answer: 1, explain: 'Bài viết: "rational agents redirect their effort toward whatever the indicator captures" → đáp án đúng: People redirect effort towards the indicator, weakening its link to reality.' },
        { type: 'mcq', q: 'What does the writer recommend about indicators?', options: ['Abandon formal metrics in favour of pure qualitative assessment', 'Select a single straightforward metric to guide organizational policy', 'Use several that are hard to game and treat them as prompts for inquiry', 'Tie all financial incentives directly to the most precise indicator'], answer: 2, explain: 'Tác giả khuyên nên dùng nhiều chỉ số khó bị thao túng và xem chúng như gợi ý để tìm hiểu thay vì kết luận (đáp án C). Các phương án A, B, D đi ngược lại lời khuyên duy trì nhiều chỉ số mang tính định hướng này.' },
        { type: 'mcq', q: 'Why are managers tempted to rely on a single figure?', options: ['It is easy to publish, compare and defend', 'It always reflects the truth', 'Understanding is quick and easy to chart', 'Regulators forbid the use of other evidence'], answer: 0, explain: 'Bài viết: "a single figure is easy to publish, to compare and to defend" → đáp án đúng: It is easy to publish, compare and defend.' },
      ],
    },
    {
      id: 'aura-of-original',
      title: 'The Aura of the Original',
      topic: 'culture',
      level: 'C2',
      emoji: '🖼️',
      summaryVi: 'Khái niệm "hào quang" của Walter Benjamin nhìn lại sau gần một thế kỷ: bản sao số không xóa hào quang mà còn quảng bá nó, và hào quang có lẽ nằm ở những câu chuyện ta tin hơn là ở vật thể.',
      summaryEn: 'Walter Benjamin\'s "aura" revisited after nearly a century: digital copies have advertised rather than abolished it, and it may reside in the stories we believe rather than in the object.',
      text: `When Walter Benjamin wrote in the 1930s of the "aura" that withers when a work is mechanically reproduced, he had in mind something more elusive than mere rarity. The aura, as he conceived it, was the unique presence of an object in time and space, its embeddedness in a tradition of ritual and cult that no photograph could transmit. A reproduction, however faithful, could bring a painting to the viewer, but only by detaching it from the place where it had accrued its authority.

Almost a century later the argument looks both prescient and incomplete. The digital image has made masterpieces universally accessible, yet queues outside major museums have lengthened rather than dwindled. Familiarity with a reproduction appears to whet, not satisfy, the desire to stand before the thing itself. One might say that the copy has not abolished the aura so much as advertised it, converting an obscure object into a destination.

It would be unwise, though, to romanticise the original. Much of what visitors prize in a canvas is the knowledge of its provenance, of the hand that made it, and such knowledge is a cultural construction rather than a perceptual fact. Forgers have occasionally deceived experts for years, and the paintings they produced were not seen differently once the deception was exposed; they were merely judged differently. If aura survives, then, it may reside less in the object than in the stories we are prepared to believe about it, and these stories, unlike the pigment, are renewed with every generation of viewers.`,
      keywords: ['aura', 'reproduced', 'elusive', 'embeddedness', 'accrued', 'prescient', 'whet', 'provenance', 'forgers', 'romanticise'],
      questions: [
        { type: 'mcq', q: 'What did Benjamin mean by the "aura" of a work?', options: ['The historical significance and market value of a painting', 'The intensity of its colour palette', 'The reputation of its artist', 'The unique presence of an object in time and space'], answer: 3, explain: 'Bài viết: "the unique presence of an object in time and space" → đáp án đúng: The unique presence of an object in time and space.' },
        { type: 'mcq', q: 'Why, in Benjamin\'s view, can a reproduction not carry the aura?', options: ['It is always of poor technical quality', 'It detaches the work from the place where it gained its authority', 'It is seen only by experts', 'It is too expensive to distribute'], answer: 1, explain: 'Bài viết: "only by detaching it from the place where it had accrued its authority" → đáp án đúng: It detaches the work from the place where it gained its authority.' },
        { type: 'tfng', q: 'Queues outside major museums have become longer despite the spread of digital images.', answer: 'TRUE', explain: 'Bài viết: "queues outside major museums have lengthened rather than dwindled" → TRUE.' },
        { type: 'tfng', q: 'Benjamin believed that a good photograph could fully preserve the aura of a painting.', answer: 'FALSE', explain: 'Bài viết: "no photograph could transmit" → FALSE.' },
        { type: 'tfng', q: 'Benjamin\'s essay was first published in a German newspaper.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói Benjamin viết vào những năm 1930, không nêu nơi bài được đăng lần đầu → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the writer mean by saying the copy has "advertised" the aura?', options: ['Museums have begun funding commercial advertising campaigns', 'Replicas have taken the place of authentic works in exhibition spaces', 'Seeing reproductions makes people want to see the original', 'Authentic pieces have lost their monetary worth over time'], answer: 2, explain: 'Bài viết: "Familiarity with a reproduction appears to whet, not satisfy, the desire to stand before the thing itself" → đáp án đúng: Seeing reproductions makes people want to see the original.' },
        { type: 'mcq', q: 'What does the example of forgeries show?', options: ['Experts are able to identify every counterfeit immediately, without error', 'Judgements of a work change with knowledge of its origin, not with what is seen', 'Fake artworks appear visibly inferior to genuine pieces, regardless of context', 'Museums must never exhibit works whose authenticity is questioned, to protect visitors'], answer: 1, explain: 'Bài viết: "were not seen differently once the deception was exposed; they were merely judged differently" → đáp án đúng: Judgements of a work change with knowledge of its origin, not with what is seen.' },
        { type: 'mcq', q: 'Where does the writer suggest aura may ultimately reside?', options: ['In the stories people are willing to believe about the object', 'In the pigments and canvas that compose the original artwork', 'In the number of visitors that a museum regularly receives', 'In the technical quality of the reproduced image or print'], answer: 0, explain: 'Bài viết: "it may reside less in the object than in the stories we are prepared to believe about it" → đáp án đúng: In the stories people are willing to believe about the object.' },
      ],
    },
    {
      id: 'precedent-dead-hand',
      title: 'The Dead Hand and the Living Law',
      topic: 'society',
      level: 'C2',
      emoji: '⚖️',
      summaryVi: 'Học thuyết án lệ buộc thẩm phán theo các phán quyết cũ nhưng luật vẫn phải thích ứng; kỹ thuật phân biệt vụ việc vừa được ca ngợi vì tính ổn định, vừa bị chỉ trích vì che giấu những lựa chọn giá trị.',
      summaryEn: 'The doctrine of precedent binds judges to old decisions while law must adapt; the technique of distinguishing cases is praised for stability and criticised for hiding contested value judgments.',
      text: `Common-law systems rest upon a principle that can seem faintly paradoxical: judges are bound by decisions made long ago, often in circumstances that no one now living would recognise, and yet the body of law they administer is expected to adapt to a changing society. The doctrine of precedent, known by its Latin tag stare decisis, resolves the tension, if it resolves it at all, through the technique of distinguishing. A court that finds an earlier ruling inconvenient need not overrule it; it may instead identify some material difference of fact that renders the older decision inapplicable.

Defenders of this method praise its restraint. Predictability is itself a form of justice, since citizens arrange their affairs on the assumption that like cases will be treated alike, and a judiciary free to rewrite doctrine at will would resemble a legislature without the discipline of electoral accountability. Gradual adjustment, moreover, allows rules to be tested against concrete disputes rather than imposed in the abstract.

Detractors reply that the pretence of continuity can obscure what is really happening. When a court distinguishes a precedent on grounds so slight that no reasonable observer would find them persuasive, the judgment preserves the form of fidelity while abandoning its substance. The result is a body of case law of bewildering subtlety, accessible only to specialists, and an appearance of inevitability that serves to shield contested value judgments from scrutiny. Whether these costs outweigh the benefits of stability is a question on which jurists continue to disagree, and perhaps ought to.`,
      keywords: ['precedent', 'paradoxical', 'overrule', 'material', 'inapplicable', 'predictability', 'judiciary', 'doctrine', 'fidelity', 'jurists', 'scrutiny'],
      questions: [
        { type: 'mcq', q: 'What is the apparent paradox at the heart of common-law systems?', options: ['Judges can overturn statutes whenever they disagree with the policy', 'Courts frequently use archaic Latin terminology that confuses many litigants', 'Judges are bound by old decisions, yet the law must adapt to change', 'Legislatures are unable to modify rulings that have already been issued by the courts'], answer: 2, explain: 'Bài viết: "judges are bound by decisions made long ago" → đáp án đúng: Judges are bound by old decisions, yet the law must adapt to change.' },
        { type: 'tfng', q: 'A court can avoid an inconvenient precedent without formally overruling it.', answer: 'TRUE', explain: 'Bài viết: "need not overrule it; it may instead identify some material difference of fact" → TRUE.' },
        { type: 'tfng', q: 'Defenders claim that judges are answerable to voters in the same way that legislators are.', answer: 'FALSE', explain: 'Bài viết: "a legislature without the discipline of electoral accountability" → FALSE.' },
        { type: 'tfng', q: 'Stare decisis is applied more strictly in the United States than in Britain.', answer: 'NOT GIVEN', explain: 'Bài không so sánh mức độ áp dụng nguyên tắc này giữa Mỹ và Anh → NOT GIVEN.' },
        { type: 'mcq', q: 'Why do defenders regard predictability as "a form of justice"?', options: ['It suggests lawmakers can abandon the process of drafting statutes', 'It enables jurists to reach verdicts in a shorter timeframe', 'It stops attorneys from demanding excessive remuneration', 'People organise their lives expecting like cases to be treated alike'], answer: 3, explain: 'Bài viết: "citizens arrange their affairs on the assumption that like cases will be treated alike" → đáp án đúng: People organise their lives expecting like cases to be treated alike.' },
        { type: 'mcq', q: 'What is the detractors\' main complaint about distinguishing precedents on slight grounds?', options: ['It produces legal judgments that are too brief to explain the decision', 'It keeps the form of fidelity to precedent but not the substance', 'It compels appellate courts to overrule far too many established cases', 'It grants legislative bodies excessive oversight over judicial rulings'], answer: 1, explain: 'Những người chỉ trích cho rằng việc phân biệt tiền lệ dựa trên lý do quá nhỏ nhặt sẽ "preserves the form of fidelity while abandoning its substance" (đáp án B). Các đáp án khác đưa ra những lời phàn nàn không được đề cập trong bài.' },
        { type: 'mcq', q: 'According to the detractors, what does the "appearance of inevitability" achieve?', options: ['It simplifies the presentation of legal arguments for laypeople', 'It stops judges from reconsidering previous rulings', 'It accelerates the resolution of cases in the judicial system', 'It protects contested value judgments from close examination'], answer: 3, explain: 'Bài viết: "an appearance of inevitability that serves to shield contested value judgments from scrutiny" → đáp án đúng: It protects contested value judgments from close examination.' },
        { type: 'mcq', q: 'How does the writer treat the final question about costs and benefits?', options: ['As settled in favour of stability', 'As settled in favour of reform', 'As an open question on which disagreement is appropriate', 'As too trivial to discuss'], answer: 2, explain: 'Bài viết: "a question on which jurists continue to disagree, and perhaps ought to" → đáp án đúng: As an open question on which disagreement is appropriate.' },
      ],
    },
    {
      id: 'invention-of-progress',
      title: 'The Invention of Progress',
      topic: 'history',
      level: 'C2',
      emoji: '📜',
      summaryVi: 'Niềm tin vào tiến bộ không có từ thuở xa xưa mà hình thành ở thế kỷ 17-18; thế kỷ 20 làm nó lung lay, nhưng nó tồn tại vì không phải là một tuyên bố duy nhất.',
      summaryEn: 'Belief in progress is not ancient but crystallised in the 17th and 18th centuries; the 20th century shook it, yet it survives because it is not a single claim.',
      text: `It is tempting to assume that the belief in progress is as old as civilisation, a natural response to the accumulation of tools and knowledge. The historical record suggests otherwise. For most of antiquity, thinkers were more inclined to picture time as cyclical, or as a slow decline from a golden age, than as an ascent. Hesiod lamented the degeneration from gold to iron; Christian theology, for its part, located the decisive event of history in the past and the consummation beyond history altogether.

The conviction that human affairs might improve through collective effort here on earth crystallised only in the seventeenth and eighteenth centuries, and it owed much to the conspicuous success of the new natural philosophy. If Newton could unravel the motions of the heavens, why should the ordering of society resist comparable inquiry? Enlightenment writers such as Condorcet drew the optimistic inference with remarkable confidence, sketching a future of expanding knowledge, diminishing inequality and moral refinement.

The twentieth century dealt this faith heavy blows. Industrialised warfare and genocide made it difficult to sustain the notion that scientific advance and moral advance travel together. Yet the idea has proved resilient, partly because it is not a single claim. One may reasonably maintain that technical capacity grows cumulatively while denying that wisdom does, and much contemporary argument consists of people talking past one another about which sense of progress is at issue. To ask whether history has a direction is thus less a factual question than a request to specify what counts as an improvement, and by whose lights.`,
      keywords: ['antiquity', 'cyclical', 'degeneration', 'consummation', 'crystallised', 'Enlightenment', 'refinement', 'resilient', 'cumulatively', 'improvement'],
      questions: [
        { type: 'mcq', q: 'How did most ancient thinkers picture time, according to the passage?', options: ['As cyclical or as a decline from a golden age', 'As a steady ascent towards perfection', 'As a series of random events', 'As something controlled by scientific laws'], answer: 0, explain: 'Bài viết: "more inclined to picture time as cyclical, or as a slow decline from a golden age" → đáp án đúng: As cyclical or as a decline from a golden age.' },
        { type: 'tfng', q: 'The belief that society can improve through human effort took shape in the seventeenth and eighteenth centuries.', answer: 'TRUE', explain: 'Bài viết: "crystallised only in the seventeenth and eighteenth centuries" → TRUE.' },
        { type: 'tfng', q: 'Condorcet was pessimistic about the prospects for human society.', answer: 'FALSE', explain: 'Bài viết: "drew the optimistic inference with remarkable confidence" → FALSE.' },
        { type: 'tfng', q: 'Hesiod\'s picture of decline was influenced by Persian myths.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói Hesiod than thở về sự suy thoái từ vàng sang sắt, không nhắc đến nguồn ảnh hưởng nào → NOT GIVEN.' },
        { type: 'mcq', q: 'Why did Newton\'s success matter for the idea of progress?', options: ['It implied that scientific breakthroughs could predict political revolutions', 'It argued that moral doctrines were irrelevant to societal development', 'It suggested that social order could also be understood through inquiry', 'It encouraged states to allocate additional resources toward experimental research'], answer: 2, explain: 'Bài viết: "why should the ordering of society resist comparable inquiry" → đáp án đúng: It suggested that social order could also be understood through inquiry.' },
        { type: 'mcq', q: 'What effect did the twentieth century have on faith in progress?', options: ['It made it hard to believe that scientific and moral advance go together', 'It cast doubt on the idea that technical capacity leads to greater wisdom', 'It led scholars to abandon traditional views of history as a slow decline', 'It proved conclusively that human affairs improve through collective effort'], answer: 0, explain: 'Bài viết: "industrialised warfare and genocide made it difficult to sustain the notion that scientific advance and moral advance travel together" → đáp án đúng: It made it hard to believe that scientific and moral advance go together.' },
        { type: 'mcq', q: 'Why, according to the writer, has the idea of progress proved resilient?', options: ['It has been tested and confirmed by historians', 'It is protected by religious institutions', 'It was never seriously criticised', 'It is not a single claim'], answer: 3, explain: 'Bài viết: "it is not a single claim" → đáp án đúng: It is not a single claim.' },
        { type: 'mcq', q: 'What is the writer\'s conclusion about whether history has a direction?', options: ['It can be settled by collecting more facts', 'It depends on what we count as an improvement', 'It is clearly true', 'It is clearly false'], answer: 1, explain: 'Bài viết: "a request to specify what counts as an improvement, and by whose lights" → đáp án đúng: It depends on what we count as an improvement.' },
      ],
    },
    {
      id: 'shifting-baselines',
      title: 'Shifting Baselines',
      topic: 'environment',
      level: 'C2',
      emoji: '🐠',
      summaryVi: 'Mỗi thế hệ nhà nghiên cứu coi hệ sinh thái mình gặp đầu tiên là bình thường, nên mức chuẩn tụt dần; bài nói về hệ quả cho bảo tồn và vai trò của tư liệu lịch sử.',
      summaryEn: 'Each generation of researchers treats the ecosystem it first met as normal, so the baseline sinks; the article covers the consequences for conservation and the role of historical evidence.',
      text: `In 1995 the fisheries scientist Daniel Pauly described a problem that has since become a touchstone of conservation biology. Each generation of researchers, he noted, takes as its point of reference the state of the ecosystem it first encountered, and therefore regards as normal a condition that its predecessors would have judged grievously depleted. Across several generations, the accepted baseline sinks, and with it the ambition of restoration.

The consequences are easy to illustrate. A diver who first explored a Caribbean reef in the 1980s, after its large predatory fish had already been decimated, sees an abundance of small species and finds nothing amiss. Historical sources, from ships' logs to the records of medieval fishing communities, depict waters teeming with creatures now scarcely seen. Without such evidence, scientists risk setting recovery targets that amount to little more than the preservation of an impoverished present.

The phenomenon is not confined to science. Public expectations shift in the same way, which helps to explain why gradual degradation provokes so little alarm: no single year looks markedly worse than the last, so there is never a moment at which the loss feels urgent. Some ecologists have accordingly turned to archaeology, oral testimony and even old photographs in an effort to reconstruct earlier conditions. Their findings do not dictate what should be restored, since a return to some pristine past is neither feasible nor always desirable, but they at least make it possible to debate the question with open eyes rather than with the amnesia built into individual lifetimes.`,
      keywords: ['baseline', 'depleted', 'grievously', 'decimated', 'predatory', 'teeming', 'impoverished', 'degradation', 'testimony', 'pristine', 'amnesia'],
      questions: [
        { type: 'mcq', q: 'What problem did Pauly describe?', options: ['Estimating fish numbers is practically unfeasible', 'Scientists cannot agree on the important species', 'Funding for conservation initiatives is insufficient to maintain them', 'Each generation treats the ecosystem it first saw as the normal state'], answer: 3, explain: 'Bài viết: "takes as its point of reference the state of the ecosystem it first encountered" → đáp án đúng: Each generation treats the ecosystem it first saw as the normal state.' },
        { type: 'tfng', q: 'Historical records describe waters containing many more fish than are seen today.', answer: 'TRUE', explain: 'Bài viết: "waters teeming with creatures now scarcely seen" → TRUE.' },
        { type: 'tfng', q: 'The writer argues that restoring ecosystems to a pristine past is always the right goal.', answer: 'FALSE', explain: 'Bài viết: "neither feasible nor always desirable" → FALSE.' },
        { type: 'tfng', q: 'Pauly\'s research was funded by an international fisheries agency.', answer: 'NOT GIVEN', explain: 'Bài không nói gì về nguồn kinh phí cho nghiên cứu của Pauly → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the example of the diver on the Caribbean reef illustrate?', options: ['Observers who arrive after depletion see nothing wrong', 'Divers now struggle to locate any small organisms', 'Reefs were fully restored in the early 1990s', 'Predatory fish damage coral structures directly in ecosystems'], answer: 0, explain: 'Bài viết: "finds nothing amiss" → đáp án đúng: Observers who arrive after depletion see nothing wrong.' },
        { type: 'mcq', q: 'Why does gradual degradation cause so little alarm?', options: ['Scientists often hide data to avoid public concern about decline', 'The public typically shows little curiosity about environmental change', 'No single year looks much worse than the one before', 'Ecological damage often occurs in remote areas away from humans'], answer: 2, explain: 'Bài viết: "no single year looks markedly worse than the last" → đáp án đúng: No single year looks much worse than the one before.' },
        { type: 'mcq', q: 'What risk do historical sources help scientists avoid?', options: ['Assuming that marine ecosystems have always remained largely unchanged', 'Setting recovery targets that merely preserve a depleted present', 'Focusing exclusively on short-term fluctuation in predatory species', 'Underestimating the time required for damaged reefs to regenerate'], answer: 1, explain: 'Bài viết: "Without such evidence, scientists risk setting recovery targets that amount to little more than the preservation of an impoverished present" → đáp án đúng: Setting recovery targets that merely preserve a depleted present.' },
        { type: 'mcq', q: 'What does "the amnesia built into individual lifetimes" refer to?', options: ['Researchers often overlook previous experimental findings', 'Historical photographs are frequently missing', 'The public quickly loses recall of past environmental drives', 'People can only remember what they themselves have experienced'], answer: 3, explain: 'Bài viết: "the amnesia built into individual lifetimes" → đáp án đúng: People can only remember what they themselves have experienced.' },
      ],
    },
    {
      id: 'predictive-brain',
      title: 'The Brain as Prediction Machine',
      topic: 'science',
      level: 'C2',
      emoji: '🧠',
      summaryVi: 'Thuyết não là cỗ máy dự đoán đảo ngược mô hình tri giác thụ động: não liên tục đưa ra giả thuyết và chỉ cần báo sai lệch; thuyết hấp dẫn nhưng bị nghi ngờ vì khó bác bỏ.',
      summaryEn: 'The brain-as-prediction-machine theory inverts the passive model of perception: the brain generates hypotheses and registers errors; it is attractive but criticised as hard to falsify.',
      text: `The traditional picture of perception portrays the brain as a passive receiver: light falls on the retina, signals travel inward, and a representation of the world is assembled step by step. A rival account, now ascendant in cognitive neuroscience, inverts the sequence. On this view the brain is fundamentally a prediction engine, continuously generating hypotheses about the causes of its sensory input and using incoming signals chiefly to register where those hypotheses are wrong.

The theory draws support from phenomena that the passive model handles awkwardly. Optical illusions, for example, persist even when we know perfectly well that they are illusions, as though prior expectation were overriding explicit knowledge. A further attraction is efficiency: if only the discrepancy between expectation and reality needs to be transmitted, the volume of information that must travel through the system is greatly reduced. Proponents extend the framework to emotion and even to psychiatric conditions, suggesting that certain disorders reflect predictions that are held too rigidly or too loosely.

Sceptics, however, caution that so capacious a theory risks becoming unfalsifiable. If every observation can be redescribed as the minimisation of prediction error, it is not clear what observation would count against it. The most promising reply is to insist upon precise, mechanistic models whose particular claims about neural circuitry can be tested, and a number of laboratories are now attempting exactly that. Until such work matures, the framework is perhaps best regarded as a fertile organising idea rather than a settled finding.`,
      keywords: ['perception', 'ascendant', 'inverts', 'hypotheses', 'illusions', 'discrepancy', 'rigidly', 'capacious', 'unfalsifiable', 'mechanistic', 'fertile'],
      questions: [
        { type: 'mcq', q: 'How does the rival account differ from the traditional picture of perception?', options: ['The brain merely records signals without forming any interpretations', 'The brain generates hypotheses and uses signals mainly to detect errors', 'The eyes transmit full pictures straight into long‑term memory', 'Perception is driven primarily by emotional states, not sensory input'], answer: 1, explain: 'Bài viết: "using incoming signals chiefly to register where those hypotheses are wrong" → đáp án đúng: The brain generates hypotheses and uses signals mainly to detect errors.' },
        { type: 'tfng', q: 'Optical illusions can persist even when we know that they are illusions.', answer: 'TRUE', explain: 'Bài viết: "persist even when we know perfectly well that they are illusions" → TRUE.' },
        { type: 'tfng', q: 'On the predictive account, the brain must transmit the full detail of every sensory input.', answer: 'FALSE', explain: 'Bài viết: "only the discrepancy between expectation and reality needs to be transmitted" → FALSE.' },
        { type: 'tfng', q: 'Most neuroscientists have now abandoned the passive-receiver model.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói cách giải thích mới đang chiếm ưu thế ("ascendant"), không cho biết đa số nhà thần kinh học đã từ bỏ mô hình cũ hay chưa → NOT GIVEN.' },
        { type: 'mcq', q: 'What efficiency advantage does the theory offer?', options: ['Signals propagate more rapidly along neural pathways', 'The brain uses reduced energy during periods of sleep', 'Less information needs to travel through the system', 'Fewer retinal cells are necessary for basic visual perception'], answer: 2, explain: 'Bài viết: "the volume of information that must travel through the system is greatly reduced" → đáp án đúng: Less information needs to travel through the system.' },
        { type: 'mcq', q: 'How do proponents apply the theory to psychiatric conditions?', options: ['They suggest some disorders involve predictions held too rigidly or too loosely', 'They claim that conditions stem from a total failure to register sensory input', 'They propose that neural circuitry ceases to function during emotional crisis', 'They argue that mental illnesses are best treated through physical therapy'], answer: 0, explain: 'Bài viết: "suggesting that certain disorders reflect predictions that are held too rigidly or too loosely" → đáp án đúng: They suggest some disorders involve predictions held too rigidly or too loosely.' },
        { type: 'mcq', q: 'What is the sceptics\' main worry?', options: ['The hypothesis directly opposes every previous study on perception', 'Current experimental setups cannot measure the predictions the theory makes', 'It fails to consider how feelings influence the brain\'s predictive processes', 'The theory is so broad that it may be impossible to refute'], answer: 3, explain: 'Bài viết: "risks becoming unfalsifiable" → đáp án đúng: The theory is so broad that it may be impossible to refute.' },
        { type: 'mcq', q: 'What status does the writer give the framework for now?', options: ['A universally accepted principle confirmed by numerous experiments', 'A fertile organising idea rather than a settled finding', 'A hypothesis that has been disproved by recent studies', 'A speculative notion limited to philosophical debate'], answer: 1, explain: 'Bài viết: "a fertile organising idea rather than a settled finding" → đáp án đúng: A fertile organising idea rather than a settled finding.' },
      ],
    },
    {
      id: 'algorithmic-responsibility',
      title: 'Who Answers for the Algorithm?',
      topic: 'technology',
      level: 'C2',
      emoji: '🤖',
      summaryVi: 'Khi hệ thống tự động gây hại mà không ai thỏa điều kiện quy trách nhiệm truyền thống, xuất hiện "khoảng trống trách nhiệm"; bài so sánh các quan điểm và cho rằng nghĩa vụ giải trình là điều gần nhất với trách nhiệm có thể đạt được.',
      summaryEn: 'When automated systems cause harm and nobody meets the traditional conditions for blame, a "responsibility gap" appears; the article weighs the views and concludes that a duty to give an account is the nearest thing to accountability.',
      text: `When an automated system denies a mortgage, flags a traveller as a security risk or recommends a prison sentence, the question of who is responsible has no obvious answer. The programmers wrote code they could not fully anticipate in operation; the institution deployed a tool it did not design; the officials who relied on it deferred to an output they were scarcely in a position to challenge. Philosophers have begun to speak of a "responsibility gap", a situation in which harm occurs, yet no individual satisfies the traditional conditions for blame, namely control over the outcome and foreknowledge of it.

Some argue that the gap is illusory, a product of fascination with the technology. We have long attributed responsibility to organisations whose actions cannot be traced to a single agent, and we hold employers liable for the conduct of staff they could not directly supervise. Corporate and institutional liability may therefore suffice, provided regulation insists that those who profit from a system also bear the cost of its errors.

Others consider this too complacent. Where a model learns from data in ways that even its designers cannot interpret, they contend, the notion of foreseeability itself begins to fray, and liability rules built upon it may reward negligence by making ignorance a defence. A growing body of legislation consequently demands documentation, auditing and a right to human review. These measures do not settle the philosophical problem, but they have the practical virtue of ensuring that someone, somewhere, is obliged to give an account, and that obligation may be the nearest thing to accountability that complex systems permit.`,
      keywords: ['responsibility', 'deployed', 'deferred', 'foreknowledge', 'illusory', 'liable', 'complacent', 'foreseeability', 'negligence', 'auditing', 'accountability'],
      questions: [
        { type: 'mcq', q: 'What is meant by a "responsibility gap"?', options: ['A time lag exists between system malfunction and its detection', 'A conflict arises between developers and project overseers', 'Harm occurs but no one meets the traditional conditions for blame', 'An absence of specific regulations governing autonomous technologies'], answer: 2, explain: 'Bài viết: "no individual satisfies the traditional conditions for blame" → đáp án đúng: Harm occurs but no one meets the traditional conditions for blame.' },
        { type: 'tfng', q: 'Traditional blame requires both control over the outcome and foreknowledge of it.', answer: 'TRUE', explain: 'Bài viết: "namely control over the outcome and foreknowledge of it" → TRUE.' },
        { type: 'tfng', q: 'Those who think the gap is illusory say that organisations can never be held responsible.', answer: 'FALSE', explain: 'Bài viết: "We have long attributed responsibility to organisations" → FALSE.' },
        { type: 'tfng', q: 'The first law requiring human review of automated decisions was passed in the European Union.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói một loạt luật đang tăng lên đòi hỏi tài liệu, kiểm toán và quyền xem xét của con người, không nêu luật đầu tiên ở đâu → NOT GIVEN.' },
        { type: 'mcq', q: 'What conclusion do those who see the gap as illusory reach?', options: ['Corporate liability may be enough if those who profit bear the cost of errors', 'Individual programmers must be held accountable for unintended system outputs', 'Automated decision tools should be entirely removed from high-stakes contexts', 'Institutional regulations ought to impose strict oversight on software developers'], answer: 0, explain: 'Bài viết: "Corporate and institutional liability may therefore suffice, provided regulation insists that those who profit from a system also bear the cost of its errors" → đáp án đúng: Corporate liability may be enough if those who profit bear the cost of errors.' },
        { type: 'mcq', q: 'Why do the other critics think liability rules may reward negligence?', options: ['When designers cannot interpret a model, ignorance can become a defence', 'Companies often conceal the inner workings of their models to protect trade secrets', 'Judges sometimes reject technical testimony when it challenges established procedures', 'Employers are exempt from responsibility for any mistakes made by their employees'], answer: 0, explain: 'Bài viết: "liability rules built upon it may reward negligence by making ignorance a defence" → đáp án đúng: When designers cannot interpret a model, ignorance can become a defence.' },
        { type: 'mcq', q: 'In the third paragraph, "too complacent" means that the argument is', options: ['too complicated to understand', 'too critical of technology', 'too new to be tested', 'too satisfied that existing arrangements are adequate'], answer: 3, explain: 'Bài viết: "Others consider this too complacent" → đáp án đúng: too satisfied that existing arrangements are adequate.' },
        { type: 'mcq', q: 'What practical benefit do documentation, auditing and human review bring?', options: ['They completely eliminate the underlying philosophical dilemma', 'They guarantee flawless performance of computational models', 'They ensure that someone is obliged to give an account', 'They eliminate the necessity for any form of legislative oversight'], answer: 2, explain: 'Bài viết: "ensuring that someone, somewhere, is obliged to give an account" → đáp án đúng: They ensure that someone is obliged to give an account.' },
      ],
    },
    {
      id: 'eyes-on-the-street',
      title: 'Eyes on the Street',
      topic: 'society',
      level: 'C2',
      emoji: '🏙️',
      summaryVi: 'Jane Jacobs phê phán quy hoạch tách chức năng, cho rằng an toàn đường phố đến từ sự hiện diện thường xuyên của người dân; di sản của bà vừa có ảnh hưởng lớn vừa gây tranh cãi, kể cả hệ quả gentrification.',
      summaryEn: 'Jane Jacobs attacked functional zoning, arguing that street safety comes from the constant presence of ordinary people; her legacy is hugely influential yet contested, including gentrification.',
      text: `Mid-century planning orthodoxy held that cities worked best when their functions were separated: housing here, commerce there, industry elsewhere, all linked by arterial roads and softened by green space. In 1961 Jane Jacobs mounted a celebrated assault on this vision, arguing that it mistook visual order for social health. What makes a street safe, she contended, is not policing or open space but the continuous presence of ordinary people with reasons to be there at different hours: shopkeepers, residents, passers-by. This informal surveillance, which she called "eyes on the street", depends on mixed uses and short blocks that keep pedestrians circulating.

Her influence has been immense, but admirers sometimes overlook the ambiguities of her legacy. The vibrant, fine-grained neighbourhoods she defended proved so attractive that they were colonised by wealthier residents, whose arrival pushed rents beyond the reach of the very communities that had created the vitality. Gentrification is thus, in a sense, the price of her success.

Her method also invites criticism. Jacobs generalised from a handful of districts in a few American cities, and her insistence that planning should emulate the self-organising complexity of living systems rested more on observation and rhetorical force than on systematic evidence. Nevertheless, subsequent research on walkability and mixed-use development has largely vindicated her central intuition. The more difficult lesson, which urban theory is still absorbing, is that the qualities she praised cannot simply be designed into existence; they emerge from patterns of use that planners can encourage but never fully command.`,
      keywords: ['orthodoxy', 'arterial', 'surveillance', 'fine-grained', 'colonised', 'vitality', 'gentrification', 'vindicated', 'intuition', 'self-organising'],
      questions: [
        { type: 'mcq', q: 'What did mid-century planning orthodoxy recommend?', options: ['Mixing housing, shops and industry on the same streets', 'Separating the functions of a city into distinct zones', 'Abolishing roads in city centres', 'Leaving neighbourhoods to plan themselves'], answer: 1, explain: 'Bài viết: "cities worked best when their functions were separated" → đáp án đúng: Separating the functions of a city into distinct zones.' },
        { type: 'mcq', q: 'According to Jacobs, what makes a street safe?', options: ['The frequent presence of law enforcement officers patrolling the neighborhood', 'The installation of open green spaces to separate residential zones', 'The construction of wide arterial roads that allow traffic to flow smoothly', 'The continuous presence of ordinary people with reasons to be there'], answer: 3, explain: 'Bài viết: "What makes a street safe... is not policing or open space but the continuous presence of ordinary people with reasons to be there" → đáp án đúng: The continuous presence of ordinary people with reasons to be there.' },
        { type: 'tfng', q: 'Jacobs launched her attack on planning orthodoxy in 1961.', answer: 'TRUE', explain: 'Bài viết: "In 1961 Jane Jacobs mounted a celebrated assault on this vision" → TRUE.' },
        { type: 'tfng', q: 'Jacobs argued that open green space is the main factor in street safety.', answer: 'FALSE', explain: 'Bài viết: "not policing or open space" → FALSE.' },
        { type: 'tfng', q: 'Jacobs grew up in a fine-grained neighbourhood in New York.', answer: 'NOT GIVEN', explain: 'Bài không nói gì về nơi Jacobs lớn lên → NOT GIVEN.' },
        { type: 'mcq', q: 'Why is gentrification described as "the price of her success"?', options: ['Her ideas led to the demolition of old districts', 'The neighbourhoods she praised attracted wealthier residents and rents rose', 'She profited financially from rising rents', 'Her critics prevented any development'], answer: 1, explain: 'Bài viết: "pushed rents beyond the reach of the very communities that had created the vitality" → đáp án đúng: The neighbourhoods she praised attracted wealthier residents and rents rose.' },
        { type: 'mcq', q: 'What criticism is made of her method?', options: ['She ignored the experience of American cities', 'She used too many statistics', 'She generalised from a few districts and relied on observation more than systematic evidence', 'She never proposed any alternative to zoning'], answer: 2, explain: 'Bài viết: "generalised from a handful of districts in a few American cities" → đáp án đúng: She generalised from a few districts and relied on observation more than systematic evidence.' },
        { type: 'mcq', q: 'What is described as the "more difficult lesson" for urban theory?', options: ['Valued urban qualities cannot be designed into existence but emerge from use', 'Planners must prioritize strict zoning over mixed-use districts in cities', 'Walkability is irrelevant to economic productivity in urban areas', 'Mixed-use development should be replaced by single-purpose zones throughout the city'], answer: 0, explain: 'Bài viết: "cannot simply be designed into existence; they emerge from patterns of use" → đáp án đúng: Valued urban qualities cannot be designed into existence but emerge from use.' },
      ],
    },
  );
})(typeof self !== 'undefined' ? self : this);
/* Bài đọc bổ sung (tự biên soạn): 16 bài C2 + 3 bài A2 + 2 bài C1. Nạp SAU readings.js và more.js – nối thêm vào mảng READINGS, không ghi đè. */
(function (g) {
  const list = g.READINGS || (g.READINGS = []);
  list.push(
    /* ===================== C2 ===================== */
    {
      id: 'c2-linguistic-relativity',
      title: `Does Language Shape Thought?`,
      topic: 'language',
      level: 'C2',
      emoji: '🗣️',
      summaryVi: `Giả thuyết cho rằng ngôn ngữ định hình tư duy từng bị bác bỏ rồi được xem xét lại dưới dạng nhẹ hơn: ngôn ngữ ảnh hưởng đến chú ý và trí nhớ chứ không giam hãm nhận thức.`,
      summaryEn: `The claim that language shapes thought was once dismissed and later revived in a weaker form: language nudges attention and memory rather than imprisoning cognition.`,
      text: `Few ideas in the human sciences have had such a turbulent career as linguistic relativity, the proposition that the language one speaks influences how one thinks. In its strongest formulation, popularly associated with Benjamin Lee Whorf, it held that speakers of different languages inhabit incommensurable mental worlds. This deterministic version collapsed under scrutiny: infants plainly reason before they speak, and translators routinely convey ideas across linguistic boundaries, which would be impossible if thought were wholly captive to grammar.

Yet the idea was never entirely interred. In recent decades, experimentalists have resurrected it in a chastened form. Languages that describe space in absolute terms, such as north and south, rather than relative terms such as left and right, appear to produce speakers who keep an unusually precise sense of direction even indoors. Languages that mark obligatory distinctions between, say, light and dark blue seem to sharpen speakers' ability to discriminate those shades fractionally faster.

The crucial qualification is that these effects are modest, context-dependent and, above all, reversible. Bilinguals shift their performance according to the language in which a task is administered, which suggests that language operates less as a cage than as a habit of attention, a groove along which thought tends to run when no other consideration intervenes. The relevant question, then, is no longer whether language constrains what can be thought, but which aspects of experience it makes habitually salient, and at what cost to others.`,
      keywords: [`proposition`, `incommensurable`, `deterministic`, `scrutiny`, `interred`, `chastened`, `discriminate`, `qualification`, `salient`, `captive`],
      questions: [
        { type: 'tfng', q: `The strongest version of linguistic relativity is still accepted by most researchers today.`, answer: 'FALSE', explain: `Bài viết: phiên bản mạnh "collapsed under scrutiny" (sụp đổ khi bị xem xét kỹ) → FALSE.` },
        { type: 'tfng', q: `Speakers of languages that use compass directions may keep a precise sense of direction indoors.`, answer: 'TRUE', explain: `Bài viết: những ngôn ngữ dùng north/south "appear to produce speakers who keep an unusually precise sense of direction even indoors" → TRUE.` },
        { type: 'tfng', q: `Whorf conducted experiments with bilingual speakers in several countries.`, answer: 'NOT GIVEN', explain: `Bài chỉ nhắc Whorf gắn với phiên bản mạnh của giả thuyết, không nói ông thí nghiệm với người song ngữ → NOT GIVEN.` },
        { type: 'mcq', q: `Why does the writer mention translators?`, options: [`To show that translating ideas across languages is often impossible`, `To argue against a deterministic view of language and thought`, `To denounce faulty translations that distort Whorf’s main ideas`, `To explain why bilinguals often excel on particular tasks`], answer: 1, explain: `Dịch giả truyền đạt ý tưởng qua ranh giới ngôn ngữ, điều không thể xảy ra nếu tư duy hoàn toàn bị ngữ pháp giam giữ → đáp án đúng: To argue against a deterministic view of language and thought.` },
        { type: 'mcq', q: `What does the writer suggest about the effects of language on thought?`, options: [`They are permanent and unavoidable.`, `They have never been demonstrated.`, `They are limited and can change with the language used.`, `They only affect children.`], answer: 2, explain: `Bài viết: các hiệu ứng "modest, context-dependent and, above all, reversible", và người song ngữ đổi kết quả theo ngôn ngữ làm bài → đáp án đúng: They are limited and can change with the language used.` },
      ],
    },
    {
      id: 'c2-tragedy-commons',
      title: `The Commons Revisited`,
      topic: 'economics',
      level: 'C2',
      emoji: '🐑',
      summaryVi: `Mô hình "bi kịch của tài sản chung" tưởng như không thể tránh khỏi, nhưng nghiên cứu thực địa cho thấy nhiều cộng đồng tự xây dựng quy tắc để quản lý tài nguyên bền vững.`,
      summaryEn: `The "tragedy of the commons" seemed inevitable, but field research shows that many communities devise their own rules to manage shared resources sustainably.`,
      text: `In 1968 the ecologist Garrett Hardin popularised a parable that has haunted environmental policy ever since. Imagine a pasture open to all herders. Each, reasoning rationally, adds one more animal, since the benefit accrues entirely to him while the cost of overgrazing is spread among everyone. The inevitable outcome is ruin. For decades this logic served as a justification for two remedies: either privatise the resource or place it under centralised state control.

The political scientist Elinor Ostrom made her reputation by asking an inconvenient question: if the tragedy is inescapable, why do so many commons survive? Studying Alpine meadows, Japanese forests and irrigation systems in Spain and the Philippines, she documented communities that had husbanded shared resources for centuries without either a landlord or a distant bureaucracy. What distinguished them was not altruism but institutional design: clearly defined boundaries, rules adapted to local conditions, inexpensive means of resolving disputes, graduated penalties for those who cheat, and, crucially, a say for the people affected in the making of the rules.

Her work did not refute Hardin so much as expose the hidden assumption in his parable, namely that the herders cannot communicate. Where they can talk, monitor one another and sanction defectors, cooperation is not a miracle but a predictable equilibrium. This is not to say that every commons can be saved; large, anonymous and fast-changing systems, such as the atmosphere, lack precisely the features that sustain local arrangements. Ostrom's legacy is therefore a more demanding kind of realism, one that treats governance as something to be designed rather than something to be either assumed or abandoned.`,
      keywords: [`parable`, `accrues`, `overgrazing`, `privatise`, `centralised`, `husbanded`, `altruism`, `refute`, `sanction`, `equilibrium`],
      questions: [
        { type: 'tfng', q: `In Hardin's parable, each herder gains the full benefit of an extra animal but shares the cost of overgrazing.`, answer: 'TRUE', explain: `Bài viết: "the benefit accrues entirely to him while the cost of overgrazing is spread among everyone" → TRUE.` },
        { type: 'tfng', q: `Ostrom found that successful commons depended mainly on the generosity of individual members.`, answer: 'FALSE', explain: `Bài viết: điều phân biệt các cộng đồng này "was not altruism but institutional design" → FALSE.` },
        { type: 'tfng', q: `Ostrom received an international prize for her research on irrigation systems.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói bà nghiên cứu hệ thống tưới tiêu, không nhắc đến giải thưởng nào → NOT GIVEN.` },
        { type: 'mcq', q: `What does the writer identify as the hidden assumption in Hardin's parable?`, options: [`That the herders cannot communicate`, `That herders are irrational`, `That the pasture is too small`, `That the state is unwilling to intervene`], answer: 0, explain: `Bài viết: giả định ẩn là "the herders cannot communicate" → đáp án đúng: That the herders cannot communicate.` },
        { type: 'mcq', q: `According to the passage, why might the atmosphere be difficult to manage as a commons?`, options: [`Scientists disagree about its condition.`, `It belongs to no country.`, `It cannot be measured.`, `It lacks the features that make local arrangements work.`], answer: 3, explain: `Bài viết: hệ thống lớn, vô danh, thay đổi nhanh như khí quyển "lack precisely the features that sustain local arrangements" → đáp án đúng: It lacks the features that make local arrangements work.` },
      ],
    },
    {
      id: 'c2-neuroplasticity',
      title: `The Brain That Rewires Itself`,
      topic: 'science',
      level: 'C2',
      emoji: '🧠',
      summaryVi: `Khả năng tự điều chỉnh của não, từ tái tổ chức vùng vỏ não sau tổn thương đến lập trình lại khi học kỹ năng mới, nhưng cũng bị thổi phồng bởi các sản phẩm "rèn luyện trí não".`,
      summaryEn: `The brain's capacity to reorganise itself, from cortical remapping after injury to learning new skills, is real, but it is also exaggerated by commercial "brain-training" products.`,
      text: `For much of the twentieth century, neuroscience held that the adult brain was essentially fixed: neurons, once lost, were irreplaceable, and the circuitry laid down in childhood was immutable. The accumulated evidence of the past thirty years has dismantled that orthodoxy. Following a stroke, undamaged regions can assume functions previously handled by injured tissue. In people who lose their sight, areas normally devoted to vision are recruited for touch and hearing. London taxi drivers, who must memorise a labyrinth of streets, develop a measurably enlarged hippocampus, a region implicated in spatial memory.

Such findings gave rise to the term neuroplasticity, and with it a cottage industry. Companies now promise that a few minutes of daily puzzles will sharpen memory, stave off dementia and raise intelligence. The evidence for such claims is, to put it charitably, thin. People certainly improve at the games they practise, but the gains tend to be narrow and rarely transfer to unrelated abilities, a point confirmed by several large reviews.

The sober reading is that plasticity is a general property of the nervous system, not a lever that can be pulled at will. It is greatest in early life, diminishes with age and responds most reliably to sustained, effortful engagement with demanding and varied tasks, such as learning a language or a musical instrument, rather than to brief, repetitive exercises. The brain adapts to what it is asked to do; the difficulty lies in persuading it to adapt in ways that matter.`,
      keywords: [`immutable`, `orthodoxy`, `dismantled`, `recruited`, `hippocampus`, `implicated`, `stave off`, `charitably`, `diminishes`, `sustained`],
      questions: [
        { type: 'tfng', q: `Until recently, scientists generally believed that the adult brain could not change.`, answer: 'TRUE', explain: `Bài viết: nhiều thập kỷ thế kỷ XX, ngành thần kinh học cho rằng não người lớn "essentially fixed" → TRUE.` },
        { type: 'tfng', q: `Brain-training games reliably improve people's performance on unrelated mental tasks.`, answer: 'FALSE', explain: `Bài viết: lợi ích thường hẹp và "rarely transfer to unrelated abilities" → FALSE.` },
        { type: 'tfng', q: `Learning a musical instrument can reverse the symptoms of dementia.`, answer: 'NOT GIVEN', explain: `Bài chỉ nêu học nhạc cụ là hoạt động đòi hỏi nỗ lực, không nói gì về đảo ngược chứng mất trí → NOT GIVEN.` },
        { type: 'mcq', q: `What is the purpose of the example of London taxi drivers?`, options: [`To demonstrate that older adults experience a steady loss of memory`, `To illustrate that the brain can change through experience`, `To argue that the expenses of professional training are unjustified`, `To claim that patients recover from strokes more quickly than expected`], answer: 1, explain: `Tài xế taxi học thuộc mê cung đường phố và hippocampus lớn hơn đo được, minh họa não thay đổi theo trải nghiệm → đáp án đúng: To illustrate that the brain can change through experience.` },
        { type: 'mcq', q: `According to the writer, what kind of activity produces the most reliable plasticity?`, options: [`Brief, repetitive drills`, `Passive auditory exposure`, `Sustained and demanding activity`, `Highly competitive gaming sessions`], answer: 2, explain: `Bài viết: phản ứng đáng tin nhất với "sustained, effortful engagement with demanding and varied tasks" → đáp án đúng: Sustained and demanding activity.` },
      ],
    },
    {
      id: 'c2-translation-untranslatable',
      title: `The Myth of the Untranslatable Word`,
      topic: 'language',
      level: 'C2',
      emoji: '📖',
      summaryVi: `Những danh sách "từ không thể dịch" rất hấp dẫn nhưng gây hiểu lầm: mọi khái niệm đều có thể diễn đạt, chỉ là mất nhiều từ hơn và mất sắc thái.`,
      summaryEn: `Lists of "untranslatable words" are charming but misleading: any concept can be expressed, though it may take more words and lose some nuance.`,
      text: `Every few months, a list of "untranslatable" words goes viral: the Portuguese saudade, the Japanese komorebi, the German Schadenfreude. Each is presented as proof that some peoples feel what others cannot even name. The charm of such lists is undeniable; their implications are largely spurious.

To begin with, nobody has ever suggested that English speakers are incapable of feeling pleasure at another's misfortune; we have simply borrowed the German word for it, as we have borrowed many others. What differs between languages is not the repertoire of human experience but the packaging, that is, which experiences are bundled into a single word and which require a phrase. The Japanese komorebi, sunlight filtering through leaves, loses nothing conceptually when rendered in English, only brevity.

Translators know that genuine difficulty lies elsewhere. A pun, a rhyme, a register of formality or the cultural associations of a dish cannot be carried across by dictionary equivalence, and the translator must choose what to sacrifice. Paradoxically, the very word "untranslatable" is a poor description of this predicament, since the same texts are translated every day, albeit imperfectly. Perhaps it would be more accurate, and certainly more modest, to say that translation is never lossless but rarely impossible, and that the most interesting words are not those with no equivalent, but those whose equivalents leave something unsaid.`,
      keywords: [`untranslatable`, `spurious`, `misfortune`, `repertoire`, `conceptually`, `rendered`, `register`, `equivalence`, `predicament`, `lossless`],
      questions: [
        { type: 'tfng', q: `The writer believes that lists of untranslatable words prove that some cultures experience unique emotions.`, answer: 'FALSE', explain: `Bài viết gọi các hàm ý của danh sách đó là "largely spurious" (phần lớn sai lạc) → FALSE.` },
        { type: 'tfng', q: `English has borrowed words from other languages to describe feelings.`, answer: 'TRUE', explain: `Bài viết: người nói tiếng Anh "have simply borrowed the German word for it, as we have borrowed many others" → TRUE.` },
        { type: 'tfng', q: `Translators generally prefer to translate puns literally.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói chơi chữ khó chuyển ngữ và dịch giả phải chọn hy sinh điều gì, không nói họ thích dịch từng chữ → NOT GIVEN.` },
        { type: 'mcq', q: `According to the writer, what differs between languages?`, options: [`The way experiences are packaged into words`, `The breadth of human experiences`, `The rate at which people acquire vocabulary`, `The proportion of loanwords in the language`], answer: 0, explain: `Đoạn văn nhấn mạnh sự khác nhau nằm ở cách các trải nghiệm được gói lại trong một từ, chứ không phải độ rộng của các trải nghiệm. Vì vậy đáp án đúng là ‘The way experiences are packaged into words’, chứ không phải phạm vi của trải nghiệm con người, điều mà bài viết không đề cập.` },
        { type: 'mcq', q: `What is the writer's final conclusion about translation?`, options: [`It can never convey the original rhythm of a poem.`, `It always yields perfect results when done by experts.`, `It almost never omits any nuance from the source text.`, `It is seldom impossible but never without loss.`], answer: 3, explain: `Bài viết: "translation is never lossless but rarely impossible" → đáp án đúng: It is seldom impossible but never without loss.` },
      ],
    },
    {
      id: 'c2-medieval-plague',
      title: `After the Black Death`,
      topic: 'history',
      level: 'C2',
      emoji: '🏰',
      summaryVi: `Đại dịch hạch thế kỷ XIV giết hàng chục triệu người nhưng cũng làm thay đổi cán cân quyền lực: lao động khan hiếm, tiền công tăng, chế độ nông nô suy yếu.`,
      summaryEn: `The fourteenth-century plague killed tens of millions yet shifted the balance of power: labour became scarce, wages rose and serfdom weakened.`,
      text: `Between 1347 and 1351, the plague swept across Europe with a ferocity that defies easy comprehension; contemporary estimates suggest that between a third and a half of the population perished. It would be perverse to describe such a catastrophe as beneficial, and historians are wary of the temptation to find silver linings in mass death. Yet the demographic collapse indisputably altered the economic order.

Before the epidemic, land was scarce and labour abundant, a condition that favoured landowners, who could extract rents and services from peasants with few alternatives. Afterwards, the ratio was inverted. Fields lay untended, and surviving workers discovered that their labour commanded a premium. In England, the authorities responded with the Ordinance of Labourers in 1349, which attempted to freeze wages at pre-plague levels. The legislation was widely evaded; employers desperate for hands paid more regardless, and the statute became an object of resentment that contributed to the Peasants' Revolt of 1381.

The long-term consequences varied by region. In western Europe, serfdom, already eroding, declined sharply as tenants bargained for money rents in place of obligatory labour. In parts of eastern Europe, by contrast, landlords responded to scarcity by tightening their control, and serfdom intensified for several centuries. The same shock, in other words, produced opposite outcomes depending on the relative strength of those who owned the land and those who worked it, a reminder that demography shapes history only through the institutions that mediate it.`,
      keywords: [`ferocity`, `perished`, `perverse`, `demographic`, `indisputably`, `extract`, `inverted`, `premium`, `statute`, `mediate`],
      questions: [
        { type: 'tfng', q: `Historians are generally cautious about describing the Black Death as having positive effects.`, answer: 'TRUE', explain: `Bài viết: các sử gia "are wary of the temptation to find silver linings in mass death" → TRUE.` },
        { type: 'tfng', q: `The Ordinance of Labourers succeeded in keeping wages at their pre-plague level.`, answer: 'FALSE', explain: `Bài viết: đạo luật "was widely evaded; employers ... paid more regardless" → FALSE.` },
        { type: 'tfng', q: `The Peasants' Revolt of 1381 was led by a former soldier.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói đạo luật góp phần gây ra cuộc nổi dậy, không nêu ai lãnh đạo → NOT GIVEN.` },
        { type: 'mcq', q: `What happened to the balance between land and labour after the plague?`, options: [`Labour became scarce relative to land.`, `Land became scarce relative to labour.`, `Both became equally abundant.`, `It stayed the same.`], answer: 0, explain: `Bài viết: trước dịch đất khan hiếm, lao động dồi dào; sau đó "the ratio was inverted" → đáp án đúng: Labour became scarce relative to land.` },
        { type: 'mcq', q: `What point does the final paragraph make about serfdom?`, options: [`Serfdom vanished uniformly across all regions within a few decades.`, `The pandemic had no influence on the status of serf labor.`, `The effect of the plague depended on local institutions and power.`, `It was formally ended by the 1350 Statute of Manorial Duties.`], answer: 2, explain: `Bài viết: cùng một cú sốc cho ra kết quả trái ngược tùy sức mạnh tương đối của địa chủ và người lao động → đáp án đúng: The effect of the plague depended on local institutions and power.` },
      ],
    },
    {
      id: 'c2-modern-architecture',
      title: `Form, Function and the Fate of Concrete`,
      topic: 'architecture',
      level: 'C2',
      emoji: '🏛️',
      summaryVi: `Kiến trúc Brutalist từng được ca ngợi vì sự trung thực của vật liệu, sau đó bị ghét bỏ, rồi nay được bảo tồn trở lại; cuộc tranh luận phản ánh câu hỏi ai quyết định điều gì là đẹp.`,
      summaryEn: `Brutalist architecture was praised for honesty of materials, then reviled, and is now being preserved again; the debate reflects the question of who decides what is beautiful.`,
      text: `Few architectural styles have inspired such polarised affections as Brutalism. The name derives from the French béton brut, raw concrete, and its practitioners in the postwar decades regarded the unconcealed material as a moral stance: buildings, they argued, should declare how they are made rather than cloak themselves in decorative veneer. Housing estates, libraries and universities rose in sculptural masses of poured concrete, expressing a confident faith in public institutions.

That faith proved difficult to sustain. Concrete weathers unevenly, streaked by rain and stained by pollution, and many of the buildings were poorly maintained once the optimism that produced them had evaporated. By the 1980s, they were widely denounced as cold and oppressive, and demolition was the preferred fate of many, sometimes to the relief of the residents and sometimes to their dismay.

The pendulum has since swung. A younger generation, unburdened by the original associations, finds in these structures a bold integrity, and campaigns to list threatened buildings have gained momentum. Preservationists confront genuine dilemmas, however. Concrete is notoriously difficult to repair without altering its appearance, and its production generates considerable carbon emissions, so adapting a building may be more sustainable than replacing it, while demolishing it forfeits the energy already invested.

What the controversy reveals is how contingent aesthetic judgement is. A building does not change, yet the verdict on it can reverse within a generation, which should counsel humility to anyone confident that taste is settled.`,
      keywords: [`polarised`, `veneer`, `sculptural`, `evaporated`, `denounced`, `dismay`, `integrity`, `preservationists`, `forfeits`, `contingent`],
      questions: [
        { type: 'tfng', q: `The name Brutalism comes from a French phrase meaning raw concrete.`, answer: 'TRUE', explain: `Bài viết: tên gọi bắt nguồn từ "béton brut, raw concrete" → TRUE.` },
        { type: 'tfng', q: `All residents were pleased when Brutalist buildings were demolished.`, answer: 'FALSE', explain: `Bài viết: việc phá dỡ đôi khi khiến cư dân nhẹ nhõm "and sometimes to their dismay" (có lúc họ thất vọng) → FALSE.` },
        { type: 'tfng', q: `The most famous Brutalist building in the world is in London.`, answer: 'NOT GIVEN', explain: `Bài không nêu công trình Brutalist nổi tiếng nhất hay vị trí của nó → NOT GIVEN.` },
        { type: 'mcq', q: `Why did the buildings decline in popularity by the 1980s?`, options: [`They were deemed too expensive to build.`, `They were badly maintained and weathered unattractively.`, `They were abandoned by architects after construction.`, `They were considered unsafe for occupants.`], answer: 1, explain: `Bài viết: bê tông phong hóa không đều, nhiều tòa nhà ít được bảo trì khi sự lạc quan đã tan biến → đáp án đúng: They were badly maintained and weathered unattractively.` },
        { type: 'mcq', q: `What does the writer conclude from the history of Brutalism?`, options: [`Modern architects lack skill.`, `Old buildings should always be preserved.`, `Concrete should never be used again.`, `Aesthetic judgements can change over time.`], answer: 3, explain: `Bài viết: tòa nhà không đổi nhưng phán xét có thể đảo ngược trong một thế hệ → đáp án đúng: Aesthetic judgements can change over time.` },
      ],
    },
    {
      id: 'c2-moral-luck',
      title: `Moral Luck`,
      topic: 'philosophy',
      level: 'C2',
      emoji: '⚖️',
      summaryVi: `Nghịch lý "may rủi đạo đức": ta đánh giá con người theo hậu quả họ không kiểm soát được, dù ta tin rằng chỉ những gì kiểm soát được mới đáng bị khen trách.`,
      summaryEn: `The paradox of "moral luck": we judge people by outcomes beyond their control, even though we believe only what is under control deserves praise or blame.`,
      text: `Consider two drivers who are equally tired and equally careless. One reaches home unscathed; the other, through no fault of his own timing, strikes a child who steps into the road. Almost everyone judges the second driver more harshly, and he will probably judge himself more harshly too. Yet the only difference between them is luck, and a principle many of us hold dear says that people should be assessed only for what lies within their control.

This is the puzzle that the philosophers Thomas Nagel and Bernard Williams brought to prominence under the label moral luck. The tension is stubborn because both intuitions seem compelling. If we abandon the principle of control, we must accept that people may be blamed for outcomes they could not have foreseen. If we adhere to it, we must say that the two drivers are equally culpable, a verdict that sits uneasily with the visceral horror we feel at the child's death.

Some philosophers resolve the conflict by denying the data, insisting that our reactions to outcomes are mere emotion rather than moral judgement. Others accept that responsibility has several dimensions: the drivers may be equally blameworthy for their carelessness but not equally responsible for what followed, and the second may owe compensation or an apology that the first does not. Whether such distinctions dissolve the paradox or merely relabel it remains contested, which is perhaps why the problem has endured.`,
      keywords: [`unscathed`, `puzzle`, `prominence`, `intuitions`, `compelling`, `foreseen`, `culpable`, `visceral`, `blameworthy`, `contested`],
      questions: [
        { type: 'tfng', q: `The two drivers in the example behave in equally careless ways.`, answer: 'TRUE', explain: `Bài viết: cả hai tài xế "equally tired and equally careless" → TRUE.` },
        { type: 'tfng', q: `Nagel and Williams agreed completely on how to solve the problem of moral luck.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói hai ông đưa vấn đề này lên hàng đầu, không nói họ có cùng giải pháp hay không → NOT GIVEN.` },
        { type: 'tfng', q: `The writer claims that the paradox of moral luck has been fully solved.`, answer: 'FALSE', explain: `Bài viết: liệu các phân biệt có hóa giải nghịch lý hay chỉ đổi tên nó "remains contested" (còn tranh cãi) → FALSE.` },
        { type: 'mcq', q: `What principle makes the situation puzzling?`, options: [`People should be judged only for what they control.`, `Negligent behavior must be penalized in every case.`, `Innocent victims should never bear responsibility.`, `Random events are fundamentally impossible to quantify.`], answer: 0, explain: `Bài viết: nguyên tắc nhiều người coi trọng là con người chỉ nên bị đánh giá về những gì "within their control" → đáp án đúng: People should be judged only for what they control.` },
        { type: 'mcq', q: `How do some philosophers try to resolve the conflict?`, options: [`By abolishing the idea of responsibility`, `By distinguishing different dimensions of responsibility`, `By proving that luck does not exist`, `By treating both drivers identically in every respect`], answer: 1, explain: `Bài viết: trách nhiệm có nhiều chiều, hai tài xế có thể đáng trách như nhau về sự bất cẩn nhưng không chịu trách nhiệm như nhau về hậu quả → đáp án đúng: By distinguishing different dimensions of responsibility.` },
      ],
    },
    {
      id: 'c2-antibiotic-resistance',
      title: `The Slow Failure of Antibiotics`,
      topic: 'health',
      level: 'C2',
      emoji: '💊',
      summaryVi: `Kháng kháng sinh là hệ quả tất yếu của chọn lọc tự nhiên; vấn đề thật sự nằm ở kinh tế học: thuốc mới ít sinh lời, nên cần cơ chế khuyến khích mới.`,
      summaryEn: `Antibiotic resistance is the inevitable result of natural selection; the real problem is economic: new drugs earn little, so new incentives are needed.`,
      text: `When Alexander Fleming noticed in 1928 that a mould had killed the bacteria around it, he inaugurated an era in which infections that had been routinely fatal became trivial to treat. Less than a century later, that era is under threat. Resistance is not a malfunction but an inevitable consequence of natural selection: when a population of bacteria is exposed to an antibiotic, the few individuals that happen to carry protective mutations survive and multiply, and the drug gradually loses its force.

Every use of an antibiotic accelerates this process, and many uses are unnecessary. Antibiotics are prescribed for viral illnesses on which they have no effect, taken for incomplete courses, and administered in vast quantities to livestock to promote growth. Resistant strains then travel readily across borders, so that careless prescribing in one country becomes everyone's problem.

Scientific ingenuity alone will not resolve the matter, because the obstacle is largely economic. A new antibiotic that is held in reserve for the most dangerous infections, precisely as stewardship demands, will sell in small volumes, while a drug for a chronic condition taken daily for decades is far more lucrative. Several large companies have consequently withdrawn from the field. Proposals to remedy this include paying developers a fixed annual sum for access to a new drug irrespective of how much of it is used, thereby separating revenue from volume. Such schemes are costly, but the alternative, a return to a world in which minor surgery carries mortal risk, would be costlier still.`,
      keywords: [`inaugurated`, `trivial`, `malfunction`, `mutations`, `livestock`, `ingenuity`, `stewardship`, `lucrative`, `irrespective`, `mortal`],
      questions: [
        { type: 'tfng', q: `Bacterial resistance to antibiotics results from natural selection.`, answer: 'TRUE', explain: `Bài viết: kháng thuốc là "an inevitable consequence of natural selection" → TRUE.` },
        { type: 'tfng', q: `Antibiotics are effective against most viral illnesses when taken for a full course.`, answer: 'FALSE', explain: `Bài viết: kháng sinh bị kê cho bệnh do virus "on which they have no effect" → FALSE.` },
        { type: 'tfng', q: `Fleming received the Nobel Prize for his discovery in 1945.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói Fleming quan sát được năm 1928, không nhắc giải Nobel → NOT GIVEN.` },
        { type: 'mcq', q: `Why have several large companies stopped developing antibiotics?`, options: [`Bacterial strains have become too complex for current laboratory methods.`, `Regulators have barred the commercial sale of new antibiotics.`, `New antibiotics are used sparingly and so earn little.`, `Livestock producers choose older drugs over newly developed antibiotics.`], answer: 2, explain: `Bài viết: thuốc kháng sinh mới được giữ dự trữ nên "will sell in small volumes", kém sinh lời hơn thuốc bệnh mạn tính → đáp án đúng: New antibiotics are used sparingly and so earn little.` },
        { type: 'mcq', q: `What does the proposed payment scheme aim to do?`, options: [`Lower the cost of antibiotics for agricultural producers`, `Declare antibiotic resistance a criminal offense under law`, `Replace antibiotics with vaccines`, `Separate developers' income from the quantity of drug sold`], answer: 3, explain: `Bài viết: trả một khoản cố định hằng năm "thereby separating revenue from volume" → đáp án đúng: Separate developers' income from the quantity of drug sold.` },
      ],
    },
    {
      id: 'c2-novel-form',
      title: `Why We Still Read Novels`,
      topic: 'literature',
      level: 'C2',
      emoji: '📚',
      summaryVi: `Tiểu thuyết bị tuyên bố là "sắp chết" nhiều lần nhưng vẫn tồn tại vì nó cho ta trải nghiệm hiếm có: sống trong ý thức của người khác trong thời gian dài.`,
      summaryEn: `The novel has been declared dying many times yet survives because it offers a rare experience: inhabiting another consciousness at length.`,
      text: `The death of the novel has been announced with such regularity that the announcement has become a literary genre in its own right. Cinema was supposed to kill it, then television, then the internet; each, in turn, has failed to do so. The persistence of a form so demanding of time and attention, in an age of limitless distraction, invites explanation.

One answer lies in what the novel does uniquely well. A film can show what a character does and, with a skilful actor, what he seems to feel. Only prose can render the continuous, self-contradicting texture of consciousness itself: the half-formed thought, the memory that interrupts a conversation, the gap between what a person says and what she means. To read a long novel is to live inside another mind for days, an intimacy that few other media can match.

Some researchers claim that this immersion has measurable benefits, citing studies in which readers of literary fiction perform slightly better on tests of empathy. The findings, however, have proved difficult to replicate, and it would be unwise to treat them as settled. A more modest claim may be sturdier: that the novel trains a certain kind of patience, an ability to withhold judgement while a perspective unfolds. Whether or not it makes us better people, it makes us, at the very least, more attentive ones, and that would be quite enough to justify its survival.`,
      keywords: [`persistence`, `distraction`, `render`, `texture`, `consciousness`, `intimacy`, `immersion`, `replicate`, `sturdier`, `withhold`],
      questions: [
        { type: 'tfng', q: `Announcements of the death of the novel have been very frequent.`, answer: 'TRUE', explain: `Bài viết: lời tuyên bố được lặp lại "with such regularity" đến mức thành một thể loại văn học → TRUE.` },
        { type: 'tfng', q: `The writer considers the studies on literary fiction and empathy to be fully reliable.`, answer: 'FALSE', explain: `Bài viết: các phát hiện "difficult to replicate" và "unwise to treat them as settled" → FALSE.` },
        { type: 'tfng', q: `Most novel readers today are under thirty.`, answer: 'NOT GIVEN', explain: `Bài không cung cấp thông tin về tuổi của độc giả → NOT GIVEN.` },
        { type: 'mcq', q: `According to the writer, what can prose do that film cannot easily do?`, options: [`Tell a longer story`, `Represent the texture of a mind's inner life`, `Reach a wider audience`, `Entertain without effort`], answer: 1, explain: `Bài viết: chỉ văn xuôi mới "render the continuous, self-contradicting texture of consciousness itself" → đáp án đúng: Represent the texture of a mind's inner life.` },
        { type: 'mcq', q: `What is the writer's own view of the benefits of reading novels?`, options: [`They probably encourage patience and attentiveness.`, `They definitely improve readers' vocabulary skills.`, `They replace the need for any other narrative forms.`, `They are mainly useful for teaching grammar rules.`], answer: 0, explain: `Bài viết đề xuất khẳng định khiêm tốn hơn: tiểu thuyết rèn "a certain kind of patience" và khiến ta chú tâm hơn → đáp án đúng: They probably encourage patience and attentiveness.` },
      ],
    },
    {
      id: 'c2-gig-economy',
      title: `Flexibility at a Price`,
      topic: 'work',
      level: 'C2',
      emoji: '🛵',
      summaryVi: `Nền kinh tế "gig" hứa hẹn tự do nhưng chuyển rủi ro từ doanh nghiệp sang người lao động; tranh luận pháp lý xoay quanh việc họ là nhân viên hay người làm tự do.`,
      summaryEn: `The gig economy promises autonomy but shifts risk from companies to workers; the legal debate turns on whether they are employees or contractors.`,
      text: `The platforms that connect drivers, couriers and freelancers with customers through a smartphone have been celebrated as engines of flexibility. Workers choose their hours; customers enjoy convenience; companies avoid the overheads of a permanent workforce. It is an arrangement in which, at first sight, everyone gains.

On closer inspection, the advantages are unevenly distributed. Because gig workers are classified as independent contractors, they typically have no entitlement to sick pay, holiday pay or a minimum wage, and they bear the costs of vehicles, fuel and insurance themselves. The platform, meanwhile, retains considerable control: it sets prices, monitors performance through ratings and may suspend accounts without explanation. A worker who is nominally free to decline a job but penalised for doing so enjoys a freedom of a rather theoretical kind.

Courts in several countries have been asked to determine whether this classification reflects reality. Some have ruled that, where a company directs the work in substance, the people performing it are entitled to the protections of employment; others have upheld the contractor model. Companies argue that reclassification would destroy the flexibility that workers value and reduce the number of jobs available.

There is likely to be no single answer. A student earning supplementary income on weekends has different needs from a parent who depends on the platform for her livelihood. The more productive debate may concern not the label but the floor of protection beneath all work, whatever the label happens to be.`,
      keywords: [`overheads`, `entitlement`, `nominally`, `penalised`, `contractors`, `upheld`, `reclassification`, `supplementary`, `livelihood`, `floor`],
      questions: [
        { type: 'tfng', q: `Gig workers usually pay for their own vehicles and insurance.`, answer: 'TRUE', explain: `Bài viết: họ "bear the costs of vehicles, fuel and insurance themselves" → TRUE.` },
        { type: 'tfng', q: `All courts that have considered the issue have decided that gig workers are employees.`, answer: 'FALSE', explain: `Bài viết: một số tòa phán quyết như vậy, nhưng "others have upheld the contractor model" → FALSE.` },
        { type: 'tfng', q: `The majority of gig workers in Europe earn less than the minimum wage.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói họ thường không có quyền hưởng lương tối thiểu, không đưa tỉ lệ thu nhập dưới mức đó → NOT GIVEN.` },
        { type: 'mcq', q: `What does the phrase "a freedom of a rather theoretical kind" suggest?`, options: [`Workers are enthusiastic about abstract concepts.`, `Freedom means the same as schedule flexibility.`, `Workers can refuse jobs only at a cost.`, `Workers cannot decide their own working hours.`], answer: 2, explain: `Người "nominally free to decline a job but penalised for doing so" chỉ có tự do trên danh nghĩa → đáp án đúng: Workers can refuse jobs only at a cost.` },
        { type: 'mcq', q: `What is the writer's view at the end of the passage?`, options: [`All platform services should be completely prohibited by law.`, `The name of the job is the most important factor.`, `Temporary gig positions provide more advantages than traditional full‑time roles.`, `The basic protections for all work matter more than the label.`], answer: 3, explain: `Bài viết: cuộc tranh luận hiệu quả hơn nên bàn về "the floor of protection beneath all work, whatever the label" → đáp án đúng: The basic protections for all work matter more than the label.` },
      ],
    },
    {
      id: 'c2-dead-languages',
      title: `The Last Speakers`,
      topic: 'language',
      level: 'C2',
      emoji: '🌍',
      summaryVi: `Một nửa trong khoảng bảy nghìn ngôn ngữ trên thế giới có thể biến mất trong thế kỷ này; vấn đề không chỉ là mất từ vựng mà còn là mất cả kho tri thức bản địa.`,
      summaryEn: `Perhaps half of the world's roughly seven thousand languages may vanish this century; what is lost is not only vocabulary but whole stores of local knowledge.`,
      text: `Of the roughly seven thousand languages spoken today, linguists estimate that as many as half will fall silent before the century is out. Languages do not typically perish through persecution, although that has happened; more commonly they decline because parents, judging that a dominant language offers their children better prospects, cease to pass on their own. Within a generation, a community's mother tongue can shrink to a handful of elderly speakers.

The loss is sometimes dismissed as sentimental. If the speakers are bilingual, the argument goes, nothing practical is forfeited. This overlooks the fact that languages are repositories of knowledge accumulated over centuries. Speakers of a small Amazonian language may possess a classification of medicinal plants that no botanist has recorded; a Pacific island vocabulary may encode generations of observation of tides and fish migration. When the last fluent speaker dies, such understanding frequently goes with her.

Revival efforts offer cautious grounds for hope. Hebrew, once confined to liturgy, was reborn as an everyday language, and Welsh and Maori have been strengthened through immersion schools and broadcasting. Success, however, demands more than goodwill: it requires that children encounter the language in settings that matter to them, and that speaking it carries social rewards rather than stigma. Without these, even generously funded programmes tend to produce speakers who can recite but not converse. A language survives not in archives but in the mouths of the young.`,
      keywords: [`persecution`, `dominant`, `prospects`, `sentimental`, `forfeited`, `repositories`, `encode`, `liturgy`, `immersion`, `stigma`],
      questions: [
        { type: 'tfng', q: `Most languages disappear because speakers are forbidden to use them.`, answer: 'FALSE', explain: `Bài viết: ngôn ngữ ít khi mất do đàn áp; thường là do cha mẹ không truyền lại ("more commonly they decline because parents ... cease to pass on their own") → FALSE.` },
        { type: 'tfng', q: `Some small languages contain detailed knowledge of the natural environment.`, answer: 'TRUE', explain: `Bài viết nêu ngôn ngữ Amazon với phân loại cây thuốc và ngôn ngữ đảo Thái Bình Dương với quan sát thủy triều, cá → TRUE.` },
        { type: 'tfng', q: `Welsh is now spoken by more than half the population of Wales.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói tiếng Wales được củng cố nhờ trường học và truyền thông, không nêu tỉ lệ người nói → NOT GIVEN.` },
        { type: 'mcq', q: `Why do some people regard the loss of languages as unimportant?`, options: [`They believe bilingual speakers lose nothing practical.`, `They assume new tongues spread faster than old ones.`, `They argue scholars overstate the extinction rates.`, `They value oral traditions over texts.`], answer: 0, explain: `Bài viết: lập luận là nếu người nói song ngữ thì "nothing practical is forfeited" → đáp án đúng: They believe bilingual speakers lose nothing practical.` },
        { type: 'mcq', q: `According to the writer, what does revival need above all?`, options: [`Providing large financial endowments to language projects alone`, `Compiling extensive written grammars without community use`, `Children using the language in meaningful settings`, `Using foreign government aid without involving the community`], answer: 2, explain: `Bài viết: cần trẻ em gặp ngôn ngữ trong bối cảnh có ý nghĩa với chúng và nói nó mang lại phần thưởng xã hội → đáp án đúng: Children using the language in meaningful settings.` },
      ],
    },
    {
      id: 'c2-music-cognition',
      title: `Why Music Moves Us`,
      topic: 'arts',
      level: 'C2',
      emoji: '🎼',
      summaryVi: `Âm nhạc gây cảm xúc mạnh dù không có chức năng sinh tồn rõ ràng; một giả thuyết cho rằng nó vận hành bằng cách tạo rồi thỏa mãn hoặc trì hoãn những kỳ vọng.`,
      summaryEn: `Music provokes strong emotion despite having no obvious survival function; one theory holds that it works by creating, and then fulfilling or delaying, expectations.`,
      text: `That a sequence of organised sounds can bring a person to tears or raise the hairs on the back of her neck is, from an evolutionary perspective, odd. Unlike food or sex, music satisfies no evident biological need, yet every known human society makes it. Theories abound: that it facilitated bonding in early groups, that it grew out of the intonation of speech, or that it is a by-product of other cognitive faculties, a kind of "auditory cheesecake" that happens to tickle pleasure circuits designed for other purposes.

A more empirical line of inquiry concerns how music produces feeling. The composer and theorist Leonard Meyer argued that emotion in music arises from expectation. As we listen, we continually predict what will come next, drawing on a lifetime's exposure to the conventions of our culture. When the prediction is confirmed, we feel satisfaction; when it is thwarted, we feel surprise; and when resolution is withheld for a while and then granted, the effect can be exhilarating. Brain-imaging studies have found that moments of anticipation before a favourite passage trigger the release of dopamine, the neurotransmitter associated with reward.

This account has the merit of explaining why unfamiliar traditions can initially sound strange or even unpleasant: our predictive machinery has not been trained on them. It also explains why the greatest music rarely does what we expect, but does something we recognise, immediately afterwards, as inevitable.`,
      keywords: [`evolutionary`, `facilitated`, `intonation`, `by-product`, `faculties`, `empirical`, `thwarted`, `withheld`, `exhilarating`, `dopamine`],
      questions: [
        { type: 'tfng', q: `Every known human society produces music.`, answer: 'TRUE', explain: `Bài viết: "every known human society makes it" → TRUE.` },
        { type: 'tfng', q: `Leonard Meyer believed that musical emotion has nothing to do with expectation.`, answer: 'FALSE', explain: `Bài viết: Meyer cho rằng cảm xúc trong âm nhạc "arises from expectation" → FALSE.` },
        { type: 'tfng', q: `Musicians show stronger dopamine responses than non-musicians.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói giai đoạn chờ đợi trước đoạn nhạc yêu thích kích hoạt dopamine, không so sánh nhạc sĩ với người thường → NOT GIVEN.` },
        { type: 'mcq', q: `What does "auditory cheesecake" refer to?`, options: [`A traditional folk melody performed at celebrations in rural communities`, `A pleasant by-product of faculties that evolved for other purposes`, `A rare auditory disorder affecting pitch perception in some individuals`, `A kind of musical instrument used in orchestras`], answer: 1, explain: `Đó là cách nói ví von: âm nhạc là "by-product of other cognitive faculties" làm thỏa mãn các mạch khoái cảm → đáp án đúng: A pleasant by-product of faculties that evolved for other purposes.` },
        { type: 'mcq', q: `How does the expectation theory explain why unfamiliar music may sound strange?`, options: [`The instruments used are unfamiliar to most listeners.`, `The recording quality is poor and distorts the sound.`, `The rhythms follow patterns that are unusually complex.`, `Listeners lack the habits needed to predict it.`], answer: 3, explain: `Bài viết: "our predictive machinery has not been trained on them" → đáp án đúng: Listeners lack the habits needed to predict it.` },
      ],
    },
    {
      id: 'c2-urban-heat',
      title: `Cities Under Heat`,
      topic: 'environment',
      level: 'C2',
      emoji: '🌡️',
      summaryVi: `Đô thị nóng hơn vùng nông thôn quanh nó; giải pháp như cây xanh và mái nhà sáng màu hiệu quả nhưng chỉ thành công nếu đặt đúng nơi dễ tổn thương nhất.`,
      summaryEn: `Cities run hotter than the countryside around them; remedies such as trees and pale roofs work, but only when directed to the most vulnerable neighbourhoods.`,
      text: `On a still summer night, the centre of a large city can be several degrees warmer than the surrounding countryside. This urban heat island effect arises because dark surfaces such as asphalt and roofing absorb sunlight by day and release it slowly after dusk, because buildings obstruct the wind that would otherwise carry heat away, and because air conditioners, vehicles and industry add heat of their own. As global temperatures climb, the effect compounds the danger of heatwaves, which already kill more people in many countries than any other weather event.

The remedies are well understood. Trees shade pavements and cool the air through evaporation; pale roofs and road surfaces reflect sunlight; green roofs and parks provide refuges. Experiments suggest that a determined programme of planting and resurfacing can lower local temperatures by a degree or two, a modest figure with a considerable effect on mortality.

What matters, however, is where the effort goes. Heat is distributed with a striking inequity: poorer districts typically have fewer trees, more paving and less access to cooling, so that the residents with the least capacity to adapt endure the highest temperatures. Planting in already leafy suburbs, however attractive, does little for those at greatest risk. The technical problem of cooling a city is, in short, easier than the political one of deciding who should be cooled first, and cities that answer the second question honestly are likely to save the most lives.`,
      keywords: [`asphalt`, `obstruct`, `compounds`, `evaporation`, `refuges`, `resurfacing`, `mortality`, `inequity`, `paving`, `adapt`],
      questions: [
        { type: 'tfng', q: `Dark surfaces in cities release stored heat slowly after sunset.`, answer: 'TRUE', explain: `Bài viết: bề mặt tối "absorb sunlight by day and release it slowly after dusk" → TRUE.` },
        { type: 'tfng', q: `Planting trees can lower temperatures by about ten degrees across an entire city.`, answer: 'FALSE', explain: `Bài viết: chương trình trồng cây và lát lại đường có thể giảm nhiệt "by a degree or two", một con số khiêm tốn → FALSE.` },
        { type: 'tfng', q: `Air conditioning has been banned in several cities because of its heat output.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói điều hòa góp thêm nhiệt, không nhắc đến lệnh cấm → NOT GIVEN.` },
        { type: 'mcq', q: `According to the passage, why are poorer districts more at risk?`, options: [`They contain more factories.`, `They have fewer trees and less cooling.`, `They are located closer to the coast.`, `They have older residents only.`], answer: 1, explain: `Bài viết: khu nghèo thường "fewer trees, more paving and less access to cooling" → đáp án đúng: They have fewer trees and less cooling.` },
        { type: 'mcq', q: `What is the writer's main argument in the last paragraph?`, options: [`The political decision of whom to help first is the harder part.`, `The technical challenge of cooling a city is already solved.`, `The financial benefit of planting trees in suburbs outweighs other measures.`, `The inevitability of heatwaves makes any mitigation effort pointless.`], answer: 0, explain: `Bài viết: vấn đề kỹ thuật dễ hơn "the political one of deciding who should be cooled first" → đáp án đúng: The political decision of whom to help first is the harder part.` },
      ],
    },
    {
      id: 'c2-scientific-method',
      title: `Falsification and Its Discontents`,
      topic: 'science',
      level: 'C2',
      emoji: '🔬',
      summaryVi: `Tiêu chí "có thể bác bỏ" của Popper là chuẩn mực hấp dẫn để phân định khoa học, nhưng các nhà triết học chỉ ra rằng thực tế nghiên cứu phức tạp hơn một phép thử đơn giản.`,
      summaryEn: `Popper's criterion of falsifiability is an appealing yardstick for science, but philosophers point out that real research is more tangled than any single test.`,
      text: `Ask a scientist what distinguishes science from pseudoscience and the chances are she will invoke Karl Popper. Popper observed that no quantity of confirming instances can prove a universal claim, since the next observation might contradict it, whereas a single counterexample can refute it. Genuine theories, he concluded, are those that forbid certain outcomes and so expose themselves to refutation; a doctrine that can accommodate any evidence whatsoever, as he thought certain schools of psychoanalysis could, is not thereby strong but empty.

The criterion has a bracing clarity, and it has served as a useful corrective against theories that explain everything and therefore nothing. Yet historians and philosophers have argued that it misdescribes how research proceeds. When an experiment contradicts a theory, scientists rarely discard the theory forthwith. They may suspect the instrument, the sample or an auxiliary assumption, and they are often right to do so. The discovery of the planet Neptune is the classic illustration: astronomers who found Uranus straying from its predicted orbit did not abandon Newtonian mechanics but posited an unseen planet, and were vindicated.

The more defensible conclusion is that falsifiability is a virtue rather than a rule. A theory that can never in principle be tested deserves suspicion, but the verdict on any particular theory emerges from a web of evidence, auxiliary assumptions and competing explanations, not from a single decisive experiment. Science, it seems, is messier than its philosophers, and rather more successful.`,
      keywords: [`pseudoscience`, `invoke`, `universal`, `counterexample`, `refute`, `accommodate`, `bracing`, `forthwith`, `auxiliary`, `vindicated`],
      questions: [
        { type: 'tfng', q: `Popper argued that many confirming observations can prove a universal claim.`, answer: 'FALSE', explain: `Bài viết: "no quantity of confirming instances can prove a universal claim" → FALSE.` },
        { type: 'tfng', q: `The discovery of Neptune is used to show that scientists sometimes keep a theory despite contradicting evidence.`, answer: 'TRUE', explain: `Các nhà thiên văn không bỏ cơ học Newton mà giả định một hành tinh chưa thấy rồi được chứng minh đúng → TRUE.` },
        { type: 'tfng', q: `Popper wrote his main work on falsification while living in exile.`, answer: 'NOT GIVEN', explain: `Bài không cho biết hoàn cảnh sống của Popper khi viết tác phẩm → NOT GIVEN.` },
        { type: 'mcq', q: `What is the writer's main criticism of Popper's criterion?`, options: [`It is too difficult to understand.`, `It favours psychology over physics.`, `It ignores the way scientists actually handle contradictory results.`, `It has been proved wrong by Neptune.`], answer: 2, explain: `Bài viết: tiêu chí này "misdescribes how research proceeds", vì nhà khoa học hiếm khi bỏ ngay lý thuyết khi gặp kết quả trái ngược → đáp án đúng: It ignores the way scientists actually handle contradictory results.` },
        { type: 'mcq', q: `What does the writer mean by saying falsifiability is "a virtue rather than a rule"?`, options: [`It is mandated by official statutes and regulations`, `It should be completely disregarded in scientific research`, `It applies exclusively within the discipline of physics`, `It is a desirable quality but not an absolute test.`], answer: 3, explain: `Lý thuyết không thể kiểm chứng đáng ngờ, nhưng phán quyết đến từ cả mạng lưới bằng chứng chứ không từ một thí nghiệm quyết định → đáp án đúng: It is a desirable quality but not an absolute test.` },
      ],
    },
    {
      id: 'c2-attention-economy',
      title: `The Price of Attention`,
      topic: 'technology',
      level: 'C2',
      emoji: '📵',
      summaryVi: `Các nền tảng miễn phí kiếm tiền bằng cách bán sự chú ý của người dùng; thiết kế để giữ chân gây ra câu hỏi về quyền tự quyết, nhưng cũng cần tránh lối kể chuyện hoảng loạn.`,
      summaryEn: `Free platforms earn money by selling users' attention; designing to hold it raises questions about autonomy, though panicky narratives should also be avoided.`,
      text: `The business model of many digital services can be summarised in an adage: if you are not paying for the product, you are the product. More precisely, what is sold to advertisers is not the user but her attention, and the longer a platform can hold it, the more revenue it earns. This simple incentive has shaped the architecture of the apps on which a large part of the world now spends its waking hours: infinite scrolling, autoplaying videos and notifications calibrated to summon a lapsed user back.

Critics contend that these features exploit psychological vulnerabilities, particularly the susceptibility of human beings to intermittent rewards, the same principle that makes slot machines compelling. Defenders reply that people are not helpless: they can switch off alerts, set limits and walk away, and the services provide real value, from keeping families in touch to disseminating knowledge.

Both positions contain truth, and the evidence on harm is less conclusive than headlines suggest. Large studies have found associations between heavy use and poorer wellbeing, particularly among adolescents, but the effects are small on average and the direction of causation is disputed: unhappy people may turn to screens as much as screens make people unhappy.

Where the critique is strongest is not in its claims about addiction but in its observation about asymmetry. Behind every screen stand teams of engineers testing thousands of variations to see what retains users, while the individual brings only her willpower. Regulating the most manipulative techniques, such as design that makes cancelling a subscription deliberately arduous, is therefore less a matter of paternalism than of levelling an uneven contest.`,
      keywords: [`adage`, `calibrated`, `lapsed`, `susceptibility`, `intermittent`, `disseminating`, `conclusive`, `causation`, `asymmetry`, `paternalism`],
      questions: [
        { type: 'tfng', q: `According to the passage, advertisers are buying the attention of users.`, answer: 'TRUE', explain: `Bài viết: thứ được bán cho nhà quảng cáo "is not the user but her attention" → TRUE.` },
        { type: 'tfng', q: `The writer states that large studies have proved that social media causes unhappiness.`, answer: 'FALSE', explain: `Bài viết: tác động nhỏ và "the direction of causation is disputed" → FALSE.` },
        { type: 'tfng', q: `Slot machine manufacturers have helped design some social media features.`, answer: 'NOT GIVEN', explain: `Bài chỉ so sánh nguyên lý phần thưởng ngắt quãng giống máy đánh bạc, không nói có sự hợp tác thiết kế → NOT GIVEN.` },
        { type: 'mcq', q: `What do defenders of the platforms argue?`, options: [`Users are not helpless and receive real benefits.`, `Notifications never cause any negative effects for users.`, `Adolescents are required to avoid using these platforms.`, `All advertising on the platforms must be completely removed.`], answer: 0, explain: `Bài viết: người ta có thể tắt thông báo, đặt giới hạn, và dịch vụ mang giá trị thật → đáp án đúng: Users are not helpless and receive real benefits.` },
        { type: 'mcq', q: `According to the writer, where is the critique of the platforms strongest?`, options: [`In its claims about addiction`, `In its claims about advertising revenue`, `In its observation that the contest between engineers and individuals is unequal`, `In its predictions about teenagers`], answer: 2, explain: `Bài viết: điểm mạnh nhất là nhận xét về "asymmetry": đội kỹ sư thử hàng nghìn biến thể còn cá nhân chỉ có ý chí → đáp án đúng: In its observation that the contest between engineers and individuals is unequal.` },
      ],
    },
    {
      id: 'c2-memory-reliability',
      title: `The Unreliable Witness`,
      topic: 'psychology',
      level: 'C2',
      emoji: '🕵️',
      summaryVi: `Trí nhớ không phải bản ghi mà là sự tái dựng nên dễ bị nhiễu; lời khai nhân chứng tự tin chưa chắc chính xác, dẫn đến cải cách thẩm vấn và nhận diện nghi phạm.`,
      summaryEn: `Memory is a reconstruction, not a recording, and so is prone to distortion; a confident eyewitness is not necessarily an accurate one, prompting reforms in questioning and line-ups.`,
      text: `Popular intuition holds that memory resembles a video camera that, with sufficient prompting, can replay the past. Decades of experimental work suggest something closer to the opposite. Remembering is an act of reconstruction: the mind assembles fragments of what was perceived and fills the gaps with inference and expectation, and the result feels vivid whether or not it is accurate.

The psychologist Elizabeth Loftus demonstrated how easily the process can be nudged. In her classic experiments, participants who watched footage of a collision and were then asked how fast the cars were going when they "smashed into" one another gave higher estimates than those asked about cars that had "hit", and a week later were more likely to recall broken glass that had not been there. Subtle wording, it seemed, could alter the memory itself rather than merely the report of it.

These findings have unsettling implications for courtrooms, where an eyewitness's confident identification can be decisive. Analyses of cases in which convicted people were later exonerated by DNA evidence have repeatedly found that mistaken identification played a part. Confidence, crucially, is a poor guide to accuracy, especially when it has been inflated by feedback after the event.

Reforms have followed. Many police forces now present suspects sequentially rather than in a group, record the witness's confidence immediately, and avoid leading questions. None of this implies that witnesses lie, merely that honesty and accuracy are different things, and that a system relying on the second should not assume it from the first.`,
      keywords: [`intuition`, `prompting`, `reconstruction`, `inference`, `nudged`, `exonerated`, `identification`, `inflated`, `sequentially`, `leading questions`],
      questions: [
        { type: 'tfng', q: `The writer says that memory works like a video camera.`, answer: 'FALSE', explain: `Bài viết bác quan niệm đó: nghiên cứu cho thấy điều "closer to the opposite", trí nhớ là sự tái dựng → FALSE.` },
        { type: 'tfng', q: `In Loftus's experiments, the choice of verb influenced the speed estimates.`, answer: 'TRUE', explain: `Bài viết: người được hỏi với "smashed into" đưa ra ước tính tốc độ cao hơn người được hỏi với "hit" → TRUE.` },
        { type: 'tfng', q: `Most eyewitnesses who identify the wrong person are deliberately lying.`, answer: 'FALSE', explain: `Bài viết: "None of this implies that witnesses lie" (không nói nhân chứng nói dối) → FALSE.` },
        { type: 'mcq', q: `Why is confidence a poor guide to accuracy?`, options: [`Because confident people never make mistakes`, `Because it can be inflated by later feedback`, `Because it is difficult to measure`, `Because it is lower in older witnesses`], answer: 1, explain: `Bài viết: độ tự tin có thể bị thổi phồng "by feedback after the event" → đáp án đúng: Because it can be inflated by later feedback.` },
        { type: 'mcq', q: `Which reform is mentioned in the passage?`, options: [`Banning eyewitness evidence`, `Showing witnesses video footage`, `Interviewing witnesses after a week`, `Presenting suspects one at a time`], answer: 3, explain: `Bài viết: nhiều lực lượng cảnh sát "present suspects sequentially rather than in a group" → đáp án đúng: Presenting suspects one at a time.` },
      ],
    },
    {
      id: 'c2-economic-growth',
      title: `Is Growth Everything?`,
      topic: 'economics',
      level: 'C2',
      emoji: '📈',
      summaryVi: `GDP đo sản lượng chứ không đo phúc lợi; các nhà kinh tế bất đồng về việc tăng trưởng có thể tách khỏi tác động môi trường hay không, và nên đo gì thay thế.`,
      summaryEn: `GDP measures output, not wellbeing; economists disagree on whether growth can be decoupled from environmental damage and on what should replace it as a yardstick.`,
      text: `For three-quarters of a century, gross domestic product has served as the principal scoreboard of national success. Its appeal is obvious: it is a single figure, computed consistently, that rises when more is produced and sold. Yet its architects never intended it as a measure of wellbeing, and its shortcomings are well documented. It counts the cost of cleaning up an oil spill as an addition to output, ignores unpaid labour such as caring for relatives, and is indifferent to how income is distributed.

Such objections have prompted a search for alternatives, from indices that incorporate health and education to surveys of life satisfaction. These are illuminating but have not displaced GDP, partly because they are harder to compare and easier to manipulate.

A deeper controversy concerns whether growth is compatible with environmental limits. Advocates of "green growth" contend that output can be decoupled from resource use through efficiency and clean technology, and they point to countries whose emissions have fallen while their economies have expanded. Sceptics reply that such reductions are too slow and too small, partly because production is often simply exported to other countries, and that infinite expansion on a finite planet is a contradiction.

The evidence permits no easy verdict. What can be said is that the choice is not between growth and its abandonment but between kinds of growth, and that a society which cannot say what it is trying to achieve will find any measure inadequate.`,
      keywords: [`gross domestic product`, `principal`, `shortcomings`, `indifferent`, `illuminating`, `displaced`, `compatible`, `decoupled`, `sceptics`, `finite`],
      questions: [
        { type: 'tfng', q: `GDP was originally designed to measure the wellbeing of citizens.`, answer: 'FALSE', explain: `Bài viết: những người xây dựng GDP "never intended it as a measure of wellbeing" → FALSE.` },
        { type: 'tfng', q: `GDP counts the cost of cleaning up an oil spill as part of output.`, answer: 'TRUE', explain: `Bài viết: GDP "counts the cost of cleaning up an oil spill as an addition to output" → TRUE.` },
        { type: 'tfng', q: `Surveys of life satisfaction have been adopted by every government as the main measure of success.`, answer: 'FALSE', explain: `Bài viết: các chỉ số thay thế "have not displaced GDP" → FALSE.` },
        { type: 'mcq', q: `Why do sceptics doubt that green growth is working?`, options: [`Clean technology is still theoretical and has yet to be deployed at scale worldwide.`, `Emission cuts are too small and slow, and production may simply be moved abroad.`, `Some economists claim that global economies have reached a plateau and can no longer grow.`, `Consumers often choose cheaper items, refusing to buy products labeled as energy‑saving.`], answer: 1, explain: `Bài viết: mức giảm "too slow and too small", và sản xuất thường chỉ được xuất sang nước khác → đáp án đúng: Emission cuts are too small and slow, and production may simply be moved abroad.` },
        { type: 'mcq', q: `What does the writer conclude?`, options: [`Growth should be completely abandoned by all nations`, `GDP is regarded as the perfect economic measure`, `The real issue is what kind of growth a society wants.`, `Alternatives to GDP are considered impossible to develop`], answer: 2, explain: `Bài viết: lựa chọn không phải giữa tăng trưởng và từ bỏ nó mà giữa "kinds of growth" → đáp án đúng: The real issue is what kind of growth a society wants.` },
      ],
    },
    /* ===================== A2 ===================== */
    {
      id: 'a2-lost-phone',
      title: `A Lost Phone`,
      topic: 'daily life',
      level: 'A2',
      emoji: '📱',
      summaryVi: `Mai làm mất điện thoại trên xe buýt và được một người lạ giúp tìm lại; bài học là nên cài mật khẩu và ghi số điện thoại của người thân.`,
      summaryEn: `Mai loses her phone on the bus and a stranger helps her get it back; the lesson is to set a password and note a relative's number.`,
      text: `Last Friday, Mai took the bus home from work. She was tired, so she closed her eyes for a few minutes. When she got off the bus, she put her hand in her bag and felt nothing. Her phone was gone!

Mai was very worried. All her photos, messages and phone numbers were on it. She ran back to the bus stop, but the bus had already left. A kind woman at the stop said, "Use my phone to call yours. Maybe somebody will answer."

Mai called her own number. After four rings, a man answered. "Hello? Is this the owner?" he asked. "I found this phone on seat number twelve. I am the driver." Mai was so happy. The driver told her that the bus would return to the station at eight o'clock, and she could collect the phone there.

At eight, Mai went to the station. The driver gave her the phone, and she thanked him again and again. He smiled and said, "It is good that you did not have a password on your phone. I could see your mother's name on the screen." Mai laughed, but she understood the problem. Now she has a password, and she writes her mother's number in her notebook, too.`,
      keywords: [`worried`, `photos`, `messages`, `bus stop`, `driver`, `station`, `collect`, `password`, `screen`, `notebook`],
      questions: [
        { type: 'tfng', q: `Mai took the bus home on Friday.`, answer: 'TRUE', explain: `Bài viết: "Last Friday, Mai took the bus home from work" → TRUE.` },
        { type: 'tfng', q: `The bus driver found the phone on seat number twelve.`, answer: 'TRUE', explain: `Người lái xe nói: "I found this phone on seat number twelve" → TRUE.` },
        { type: 'tfng', q: `Mai's brother helped her find her phone.`, answer: 'NOT GIVEN', explain: `Bài chỉ nhắc một người phụ nữ tốt bụng và người lái xe, không nhắc anh trai của Mai → NOT GIVEN.` },
        { type: 'mcq', q: `How did Mai call her own phone?`, options: [`She used the phone of a kind woman.`, `She used a phone at the station.`, `She asked the driver to call.`, `She used her computer.`], answer: 0, explain: `Bài viết: người phụ nữ nói "Use my phone to call yours" → đáp án đúng: She used the phone of a kind woman.` },
        { type: 'mcq', q: `What does Mai do now?`, options: [`She always prefers walking instead of ever taking the bus.`, `She recently purchased a brand‑new smartphone with advanced features.`, `She only stores her phone in her bag when traveling.`, `She has a password and writes her mother's number in a notebook.`], answer: 3, explain: `Bài viết: "Now she has a password, and she writes her mother's number in her notebook" → đáp án đúng: She has a password and writes her mother's number in a notebook.` },
      ],
    },
    {
      id: 'a2-new-neighbours',
      title: `Meeting the New Neighbours`,
      topic: 'community',
      level: 'A2',
      emoji: '🏠',
      summaryVi: `Một gia đình mới chuyển đến chung cư; cư dân tổ chức bữa ăn nhỏ để chào đón họ và mọi người nhanh chóng trở thành bạn.`,
      summaryEn: `A new family moves into an apartment block; the residents organise a small meal to welcome them and everyone soon becomes friends.`,
      text: `Last month, a new family moved into the flat next to mine. There are four of them: a father, a mother and two small children. On the first day, I heard a lot of noise, and I saw boxes and furniture in the corridor. I wanted to say hello, but they looked very busy.

The next evening, I knocked on their door and gave them a plate of sweet rice cakes. The mother, whose name is Rosa, was surprised and very happy. "Thank you! We don't know anyone here yet," she said. She told me that they came from a small town in the south, and that her husband had found a new job in the city.

I had an idea. I asked the other people in our building to come to a small dinner on Saturday. Everyone brought one dish: soup, salad, noodles, fruit and a big cake. We ate in the courtyard under the trees. The children played games together, and the adults talked for hours.

At the end of the evening, Rosa said, "In our old town, it was easy to meet people. I was afraid that it would be difficult here." Now we say hello to each other every morning, and her little daughter calls me "Auntie". It is wonderful to have friends so close to home.`,
      keywords: [`neighbours`, `flat`, `corridor`, `knocked`, `surprised`, `courtyard`, `dish`, `afraid`, `building`, `wonderful`],
      questions: [
        { type: 'tfng', q: `The new family has four people.`, answer: 'TRUE', explain: `Bài viết: "There are four of them: a father, a mother and two small children" → TRUE.` },
        { type: 'tfng', q: `The dinner was held in the writer's flat.`, answer: 'FALSE', explain: `Bài viết: "We ate in the courtyard under the trees" (ăn ngoài sân), không phải trong căn hộ → FALSE.` },
        { type: 'tfng', q: `Rosa's husband works in a hospital.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói chồng của Rosa tìm được việc mới trong thành phố, không nói làm ở bệnh viện → NOT GIVEN.` },
        { type: 'mcq', q: `What did the writer give Rosa on the second evening?`, options: [`A plate of sweet rice cakes`, `A slice of chocolate cake`, `A bowl of vegetable soup`, `A basket of fresh fruit`], answer: 0, explain: `Bài viết: "I knocked on their door and gave them a plate of sweet rice cakes" → đáp án đúng: A plate of sweet rice cakes.` },
        { type: 'mcq', q: `Why was Rosa afraid before the dinner?`, options: [`She found the apartment's architecture unappealing and uncomfortable for her family.`, `She thought it would be hard to meet people in the city.`, `Her two young children were suffering from a cold.`, `She had not yet purchased any furniture for the new home.`], answer: 1, explain: `Bài viết: Rosa nói "I was afraid that it would be difficult here" (ở đây khó làm quen) → đáp án đúng: She thought it would be hard to meet people in the city.` },
      ],
    },
    {
      id: 'a2-weekend-market',
      title: `A Saturday at the Market`,
      topic: 'food',
      level: 'A2',
      emoji: '🧺',
      summaryVi: `Một buổi sáng thứ Bảy ở chợ nông sản: người kể mua rau, trái cây và bánh mì, và học cách mặc cả lịch sự với người bán.`,
      summaryEn: `A Saturday morning at a farmers' market: the writer buys vegetables, fruit and bread, and learns to bargain politely with the sellers.`,
      text: `Every Saturday morning, my grandfather and I go to the market near our house. It opens at six o'clock, and we like to arrive early because the vegetables are fresh and the streets are quiet.

First, we visit Mrs Lan, who sells vegetables. Today, she had beautiful tomatoes and green beans. My grandfather asked, "How much are the tomatoes?" She said, "Thirty thousand dong a kilo." He smiled and said, "Can you make it twenty-five? We are buying two kilos." Mrs Lan laughed and agreed. My grandfather says that you should always ask politely, and never be angry.

Next, we went to the fruit seller. I chose a big, sweet mango, and my grandfather bought some small bananas. Then we stopped at a small stall that sells fresh bread. The smell was so good that I bought two loaves and ate one hot piece on the way.

At eight o'clock, our bags were heavy, and we were hungry. We sat in a little café, and my grandfather ordered coffee. I had a glass of orange juice. He told me stories about the market when he was young. In those days, there were no plastic bags, and everyone brought a basket from home. I think this is a good idea, so now I use a basket, too.`,
      keywords: [`market`, `fresh`, `vegetables`, `tomatoes`, `kilo`, `politely`, `mango`, `stall`, `loaves`, `basket`],
      questions: [
        { type: 'tfng', q: `The market opens at six o'clock.`, answer: 'TRUE', explain: `Bài viết: "It opens at six o'clock" → TRUE.` },
        { type: 'tfng', q: `Mrs Lan refused to lower the price of the tomatoes.`, answer: 'FALSE', explain: `Ông hỏi giá 25 nghìn và bà Lan "laughed and agreed" (cười và đồng ý) → FALSE.` },
        { type: 'tfng', q: `The writer's grandmother usually comes to the market too.`, answer: 'NOT GIVEN', explain: `Bài chỉ nói người kể đi cùng ông, không nhắc đến bà → NOT GIVEN.` },
        { type: 'mcq', q: `What does the writer's grandfather say about asking for a lower price?`, options: [`You should do it quickly.`, `You should never do it.`, `You should ask politely and not be angry.`, `You should do it only in the afternoon.`], answer: 2, explain: `Bài viết: ông nói "you should always ask politely, and never be angry" → đáp án đúng: You should ask politely and not be angry.` },
        { type: 'mcq', q: `What did people use instead of plastic bags in the past?`, options: [`Paper boxes`, `Cloth hats`, `Bottles`, `Baskets`], answer: 3, explain: `Bài viết: ngày xưa "everyone brought a basket from home" → đáp án đúng: Baskets.` },
      ],
    },
    /* ===================== C1 ===================== */
    {
      id: 'c1-remote-work',
      title: `The Office Reconsidered`,
      topic: 'work',
      level: 'C1',
      emoji: '🏢',
      summaryVi: `Làm việc từ xa đem lại tự chủ và tiết kiệm thời gian đi lại nhưng làm yếu tương tác ngẫu nhiên và việc học nghề của người mới; mô hình kết hợp đang được thử nghiệm.`,
      summaryEn: `Remote work brings autonomy and saved commuting time but weakens chance encounters and newcomers' learning on the job; hybrid models are being tested.`,
      text: `Before 2020, remote work was an occasional perk granted to trusted employees. Within a matter of weeks, it became the norm for millions, and the surprise was how smoothly many organisations adapted. Productivity, by most measures, held up, and employees welcomed the savings in time and money that came from abolishing the daily commute.

As the novelty faded, however, the drawbacks became clearer. Much of what happens in an office is unplanned: a casual remark overheard at a neighbouring desk, a quick question put to a colleague in a corridor. Such exchanges are rarely recorded in any plan, yet they transmit tacit knowledge and cement relationships. Junior staff, who learn largely by observing others, appear to lose most from their absence, and managers report that mentoring is harder to sustain through a screen.

Hybrid arrangements, in which employees spend part of the week on site, have emerged as a compromise, but they bring complications of their own. If colleagues choose different days, the office may be empty precisely when it was meant to be useful; if attendance is mandated, those who prized flexibility may leave.

The most successful firms seem to be those that treat the question as one of purpose rather than policy. They ask what particular activities, such as onboarding, brainstorming or resolving conflict, genuinely benefit from being in the same room, and design their schedules around them, rather than defending a location for its own sake.`,
      keywords: [`perk`, `abolishing`, `commute`, `novelty`, `tacit`, `cement`, `mentoring`, `hybrid`, `mandated`, `onboarding`],
      questions: [
        { type: 'tfng', q: `Productivity fell sharply when many people began working from home.`, answer: 'FALSE', explain: `Bài viết: năng suất "by most measures, held up" (nhìn chung được giữ vững) → FALSE.` },
        { type: 'tfng', q: `Junior employees are described as losing the most from the absence of the office.`, answer: 'TRUE', explain: `Bài viết: nhân viên mới học chủ yếu bằng cách quan sát nên "appear to lose most" → TRUE.` },
        { type: 'tfng', q: `Most companies now require employees to attend the office five days a week.`, answer: 'NOT GIVEN', explain: `Bài không cung cấp thông tin về chính sách đi làm đủ năm ngày → NOT GIVEN.` },
        { type: 'mcq', q: `Why does the writer mention a casual remark overheard at a neighbouring desk?`, options: [`To show that office environments are frequently noisy`, `To illustrate how informal exchanges pass on knowledge`, `To criticise the prevalence of unplanned meetings in modern workplaces`, `To explain why managers often prefer remote work arrangements`], answer: 1, explain: `Những trao đổi không kế hoạch như vậy "transmit tacit knowledge and cement relationships" → đáp án đúng: To illustrate how informal exchanges pass on knowledge.` },
        { type: 'mcq', q: `What do the most successful firms do, according to the passage?`, options: [`They abolish the office completely.`, `They choose a policy and apply it strictly.`, `They decide which activities benefit from being together and plan around them.`, `They allow employees to choose any schedule.`], answer: 2, explain: `Bài viết: họ hỏi hoạt động nào "genuinely benefit from being in the same room" và thiết kế lịch quanh đó → đáp án đúng: They decide which activities benefit from being together and plan around them.` },
      ],
    },
    {
      id: 'c1-microplastics',
      title: `The Particles We Cannot See`,
      topic: 'environment',
      level: 'C1',
      emoji: '🧪',
      summaryVi: `Vi nhựa đã được tìm thấy từ biển sâu đến cơ thể người; tác hại đối với sức khỏe vẫn chưa rõ, nên việc giảm phát thải ngay từ nguồn là hướng thận trọng hợp lý.`,
      summaryEn: `Microplastics have been found from the deep sea to the human body; the health effects remain unclear, so cutting emissions at source is the sensible precaution.`,
      text: `Plastic does not disappear; it fragments. Bottles, packaging and synthetic textiles break down into ever smaller pieces, and those under five millimetres in length are known as microplastics. They have been detected in the deepest ocean trenches, in Arctic snow and, more recently and more disquietingly, in human blood, lungs and placentas.

What these particles do to living organisms is far from settled. Laboratory studies show that they can cause inflammation in cells and carry toxic chemicals on their surfaces, but the doses used often exceed those found in the environment, and extrapolating to human health is hazardous. Researchers also struggle with the sheer diversity of the material: particles differ in size, shape and chemical composition, so that conclusions about one type may not apply to another.

Given such uncertainty, some argue that alarm is premature. Others invoke the precautionary principle, the view that when an activity threatens harm, lack of conclusive proof should not delay sensible measures. Since plastic is so persistent that anything released now will remain for generations, waiting for certainty would be a gamble.

Fortunately, the measures that would reduce exposure are not especially controversial. Filters on washing machines can capture fibres from clothing, better waste management prevents litter from degrading in rivers, and redesigning products to use less plastic addresses the problem at its source. Cleaning up what is already in the environment is far harder, which is the strongest argument for acting before the evidence is complete.`,
      keywords: [`fragments`, `synthetic`, `detected`, `disquietingly`, `inflammation`, `extrapolating`, `premature`, `precautionary`, `persistent`, `fibres`],
      questions: [
        { type: 'tfng', q: `Microplastics have been found inside the human body.`, answer: 'TRUE', explain: `Bài viết: đã phát hiện vi nhựa "in human blood, lungs and placentas" → TRUE.` },
        { type: 'tfng', q: `It has been conclusively proved that microplastics cause serious disease in humans.`, answer: 'FALSE', explain: `Bài viết: tác động lên sinh vật sống "is far from settled" (còn lâu mới rõ ràng) → FALSE.` },
        { type: 'tfng', q: `Most microplastics in the ocean come from car tyres.`, answer: 'NOT GIVEN', explain: `Bài không nêu nguồn chính của vi nhựa ở đại dương; chỉ nhắc chai, bao bì và dệt tổng hợp → NOT GIVEN.` },
        { type: 'mcq', q: `Why is it difficult to apply laboratory results to human health?`, options: [`The doses used are often higher than real exposure.`, `The equipment in many labs lacks proper calibration.`, `The microplastics tend to aggregate when mixed with water.`, `The human body can metabolize plastic without any effect.`], answer: 0, explain: `Bài viết: liều dùng trong phòng thí nghiệm "often exceed those found in the environment" → đáp án đúng: The doses used are often higher than real exposure.` },
        { type: 'mcq', q: `What does the precautionary principle suggest here?`, options: [`Waiting for complete proof before acting`, `Ignoring the risks until they are proven`, `Banning all plastics immediately`, `Acting sensibly despite incomplete evidence`], answer: 3, explain: `Bài viết: khi một hoạt động đe dọa gây hại, việc thiếu bằng chứng kết luận không nên trì hoãn biện pháp hợp lý → đáp án đúng: Acting sensibly despite incomplete evidence.` },
      ],
    },
  );
})(typeof self !== 'undefined' ? self : this);
