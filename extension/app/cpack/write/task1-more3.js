/* Đề Writing Task 1 Academic bổ sung (đợt 3: 14 đề đủ 6 dạng) + bài mẫu band 8 có chú thích (tự biên soạn – DỮ LIỆU MINH HỌA, không phải số liệu thật) */
(function (g) {
  g.TASK1_MORE = (g.TASK1_MORE || []).concat([
    { id: 'smartwatch', type: 'line', title: 'The line graph shows the percentage of adults in three age groups who owned a smartwatch or fitness tracker in one country between 2015 and 2025.',
      x: ['2015', '2017', '2019', '2021', '2023', '2025'], unit: '%',
      series: [['Aged 18–34', [4, 10, 19, 31, 42, 50]], ['Aged 35–54', [2, 5, 10, 18, 27, 36]], ['Aged 55+', [1, 2, 4, 7, 12, 19]]],
      overview: 'Overall, ownership of wearable devices rose in every age group; adults aged 18–34 were the most likely to own one throughout, while the over-55s remained the least likely despite the fastest proportional growth.' },
    { id: 'cinema', type: 'line', title: 'The line graph shows the number of cinema tickets sold (in millions) in three countries between 2000 and 2025.',
      x: ['2000', '2005', '2010', '2015', '2020', '2025'], unit: 'million',
      series: [['Avonia', [62, 58, 55, 52, 14, 41]], ['Beltran', [30, 34, 39, 45, 11, 40]], ['Corvale', [18, 17, 16, 14, 4, 9]]],
      overview: 'Overall, cinema attendance fell sharply in all three countries in 2020 and only partly recovered; Avonia remained the largest market for most of the period, but Beltran almost caught up by 2025, whereas Corvale stayed the smallest.' },
    { id: 'commuting', type: 'bar', title: 'The bar chart shows the percentage of workers using four different ways of travelling to work in four cities in 2024.',
      x: ['Aldport', 'Brenham', 'Corwick', 'Dunsby'], unit: '%',
      series: [['Car', [62, 41, 28, 15]], ['Public transport', [22, 35, 40, 38]], ['Bicycle', [4, 12, 22, 30]], ['Walking', [12, 12, 10, 17]]],
      overview: 'Overall, the car was the most common way of getting to work in Aldport and Brenham, whereas public transport led in Corwick and Dunsby, where cycling was also far more popular than in the other two cities.' },
    { id: 'studyabroad', type: 'bar', title: 'The bar chart compares the number of international students (in thousands) hosted by four countries in 2010 and 2024.',
      x: ['Eastland', 'Northia', 'Southmark', 'Westerly'], unit: 'thousand',
      series: [['2010', [220, 150, 90, 60]], ['2024', [310, 240, 95, 180]]],
      overview: 'Overall, all four countries hosted more international students in 2024 than in 2010; Eastland remained the most popular destination, but Westerly showed by far the greatest proportional growth, while Southmark barely changed.' },
    { id: 'budget', type: 'pie', title: 'The pie charts show how an average family in one country spent its income in 2000 and in 2024.',
      pies: [['2000', [['Housing', 28], ['Food', 30], ['Transport', 14], ['Leisure', 10], ['Other', 18]]], ['2024', [['Housing', 36], ['Food', 18], ['Transport', 15], ['Leisure', 15], ['Other', 16]]]],
      overview: 'Overall, the biggest change was the shift from food to housing as the main item of expenditure, while the share spent on leisure grew and transport and other costs stayed fairly stable.' },
    { id: 'library', type: 'pie', title: 'The pie charts show the main reasons why people visited a city library in 2010 and in 2024.',
      pies: [['2010', [['Borrowing books', 46], ['Studying', 24], ['Using computers', 14], ['Attending events', 6], ['Other', 10]]], ['2024', [['Borrowing books', 22], ['Studying', 34], ['Using computers', 12], ['Attending events', 20], ['Other', 12]]]],
      overview: 'Overall, borrowing books ceased to be the dominant reason for visiting, replaced by studying as the main purpose, while attending events became far more significant and computer use declined slightly.' },
    { id: 'rentcity', type: 'table', title: 'The table shows the average monthly rent, the percentage of income spent on rent and the average journey to work in five cities in 2024.',
      head: ['City', 'Average rent ($)', 'Rent as % of income', 'Journey to work (minutes)'],
      rows: [['Arden', 1450, 41, 52], ['Brisk', 980, 32, 38], ['Calder', 1120, 36, 45], ['Dovan', 760, 27, 29], ['Esker', 1320, 39, 48]],
      overview: 'Overall, the cities with the highest rents also tended to have the longest journeys to work; Arden was the most expensive and had the longest commute, whereas Dovan was the cheapest and the most convenient.' },
    { id: 'sportsgender', type: 'table', title: 'The table shows the percentage of men and women who took part in five sports in one country in 2024, together with the average time spent per week.',
      head: ['Sport', 'Men (%)', 'Women (%)', 'Hours per week'],
      rows: [['Swimming', 18, 24, 2.1], ['Running', 22, 19, 2.6], ['Football', 31, 9, 3.4], ['Yoga', 6, 21, 1.8], ['Cycling', 17, 11, 3.0]],
      overview: 'Overall, men were more likely to take part in most of the sports, with football the most popular among them, whereas women preferred swimming and yoga; football also demanded the most weekly time and yoga the least.' },
    { id: 'recycling', type: 'process', title: 'The diagram shows how waste paper is recycled to make new paper.',
      steps: ['Used paper is collected from homes and offices', 'The paper is sorted by quality and taken to a recycling plant', 'It is mixed with water and broken down into a soft pulp', 'The pulp is passed through screens to remove staples, plastic and glue', 'The pulp is washed with chemicals so that the ink is removed', 'The clean pulp is pressed and rolled into thin sheets', 'The sheets are dried by heated rollers', 'The finished paper is cut and wound into large rolls'],
      overview: 'Overall, the recycling of paper involves eight stages, beginning with the collection of waste paper and ending with the production of large rolls of new paper; the middle stages are concerned with cleaning the pulp.' },
    { id: 'rainwater', type: 'process', title: 'The diagram shows how rainwater is collected and used in a household.',
      steps: ['Rain falls on the roof of the house', 'The water runs along the gutters into a downpipe', 'A filter removes leaves and other debris from the water', 'The water flows into an underground storage tank', 'A pump sends the stored water to a smaller tank in the loft', 'The water is used for flushing toilets, running washing machines and watering the garden', 'Any excess water drains into a soakaway in the garden'],
      overview: 'Overall, the system has seven stages, beginning with rain falling on the roof and ending either with the use of the water in the home or with its release into the ground; filtering and storage take place before the water is used.' },
    { id: 'bricks', type: 'process', title: 'The diagram shows how bricks are made in a factory.',
      steps: ['Clay is dug from a quarry', 'The clay is crushed and mixed with water in a mixer', 'The mixture is pressed through a machine and cut into brick shapes with wires', 'The bricks are dried in a drying chamber for about two days', 'The dried bricks are fired in a kiln at around 1,000 degrees Celsius', 'The bricks are cooled slowly', 'They are packed onto pallets and delivered to building sites'],
      overview: 'Overall, brick-making is a seven-stage process that turns raw clay into finished bricks, with the preparation of the clay at the start, drying and firing in the middle, and cooling and delivery at the end.' },
    { id: 'harbour', type: 'map', title: 'The maps show a fishing village in 2000 and today.',
      maps: [['2000', [['Fish market', 1, 1, 2, 1, '#0ea5a4'], ['Fishermen’s cottages', 1, 2, 2, 2, '#f59e0b'], ['Farmland', 3, 1, 2, 2, '#84cc16'], ['Beach', 3, 3, 2, 1, '#fcd34d']]],
             ['Today', [['Marina', 1, 1, 2, 1, '#0ea5a4'], ['Restaurants', 1, 2, 2, 1, '#e5484d'], ['Holiday apartments', 1, 3, 2, 1, '#c026d3'], ['Car park', 3, 1, 2, 1, '#94a3b8'], ['Hotel', 3, 2, 2, 1, '#6d5dfc'], ['Beach', 3, 3, 2, 1, '#fcd34d']]]],
      overview: 'Overall, the village has changed from a working fishing community into a tourist resort, with new leisure and accommodation facilities replacing the fish market, the cottages and the farmland, while the beach has been kept.' },
    { id: 'townsquare', type: 'map', title: 'The maps show the centre of a town in 1985 and today.',
      maps: [['1985', [['Cinema', 1, 1, 2, 1, '#6d5dfc'], ['Open-air market', 1, 2, 2, 2, '#f59e0b'], ['Bus station', 3, 1, 2, 1, '#0ea5a4'], ['Offices', 3, 2, 2, 2, '#64748b']]],
             ['Today', [['Cinema', 1, 1, 2, 1, '#6d5dfc'], ['Pedestrian plaza', 1, 2, 2, 2, '#16a34a'], ['Tram stop', 3, 1, 2, 1, '#0ea5a4'], ['Offices', 3, 2, 2, 1, '#64748b'], ['Cafes', 3, 3, 2, 1, '#e5484d']]]],
      overview: 'Overall, the town centre has become more attractive to pedestrians, with the market replaced by a plaza and the bus station by a tram stop, while the cinema and part of the offices have remained in place.' },
    { id: 'schoolsite', type: 'map', title: 'The maps show the site of a school before and after a redevelopment.',
      maps: [['Before', [['Main building', 1, 1, 2, 2, '#6d5dfc'], ['Car park', 1, 3, 2, 1, '#94a3b8'], ['Playground', 3, 1, 2, 1, '#f59e0b'], ['Football pitch', 3, 2, 2, 2, '#16a34a']]],
             ['After', [['Main building', 1, 1, 2, 2, '#6d5dfc'], ['Car park', 1, 3, 2, 1, '#94a3b8'], ['New library', 3, 1, 2, 1, '#c026d3'], ['Sports hall', 3, 2, 2, 1, '#0ea5a4'], ['Garden', 3, 3, 2, 1, '#84cc16']]]],
      overview: 'Overall, the school has expanded its facilities for study and indoor sport at the expense of its outdoor play areas, while the main building and the car park have stayed exactly the same.' },
  ]);

  g.MODELS = (g.MODELS || []).concat([
    { id: 't1-smartwatch', task: 1, ref: 'smartwatch', band: '8.0', words: 185,
      text: `<<Mở bài>> The line graph [[compares|so sánh]] the proportion of adults aged 18–34, 35–54 and 55 or over who owned a smartwatch or fitness tracker in one country [[between 2015 and 2025|từ năm 2015 đến năm 2025]].

<<Tổng quan>> {{Overall}}, ownership of wearable devices [[rose in every age group|tăng ở mọi nhóm tuổi]]. Young adults were [[consistently the most likely|luôn có nhiều khả năng nhất]] to own one, {{while}} people aged 55 and over remained the least likely, [[despite|dù có]] the fastest growth in relative terms.

<<Thân bài 1>> In 2015, just 4% of 18–34-year-olds owned such a device, {{compared with}} 2% of those aged 35–54 and only 1% of the oldest group. {{By 2019}}, the figure for the youngest group had [[climbed steeply|tăng mạnh]] to 19%, and it reached 31% in 2021, {{while}} the 35–54 group [[followed a similar pattern at a lower level|có xu hướng tương tự ở mức thấp hơn]], reaching 10% in 2019 and 18% in 2021.

<<Thân bài 2>> {{By contrast}}, ownership among the over-55s [[stayed below 5%|vẫn dưới 5%]] until 2019, {{but}} it then began to rise more quickly, to 12% in 2023. {{By 2025}}, half of all 18–34-year-olds [[owned a device|sở hữu một thiết bị]], {{as against}} 36% of the middle group and 19% of the oldest group, {{although}} growth among the youngest adults [[had slowed|đã chậm lại]] [[noticeably|đáng kể]] since 2021.` },
    { id: 't1-cinema', task: 1, ref: 'cinema', band: '8.0', words: 171,
      text: `<<Mở bài>> The line graph [[illustrates|minh họa]] how many cinema tickets were sold, in millions, in Avonia, Beltran and Corvale [[over a 25-year period|trong khoảng thời gian 25 năm]].

<<Tổng quan>> {{Overall}}, attendance [[fell dramatically|giảm mạnh]] in all three countries in 2020 and [[recovered only partially|chỉ phục hồi một phần]] afterwards. Avonia was the biggest market for most of the period, {{but}} Beltran [[narrowed the gap|thu hẹp khoảng cách]] and had almost caught up by 2025, {{whereas}} Corvale remained the smallest.

<<Thân bài 1>> In 2000, Avonia sold 62 million tickets, [[roughly double|gấp đôi xấp xỉ]] the figure for Beltran (30 million) and more than three times that of Corvale (18 million). Over the next fifteen years, Avonia's sales [[declined gradually|giảm dần]] to 52 million, {{while}} Beltran's [[rose steadily|tăng đều]] to 45 million. Corvale, {{meanwhile}}, [[edged down|giảm nhẹ]] to 14 million.

<<Thân bài 2>> {{In 2020}}, all three countries [[experienced a collapse|trải qua sự sụt giảm mạnh]], with sales of 14 million in Avonia, 11 million in Beltran and just 4 million in Corvale. {{Five years later}}, Avonia [[bounced back to|hồi phục lên]] 41 million, {{and}} Beltran [[recovered to|phục hồi lên]] 40 million, {{leaving}} the two countries [[virtually level|gần như ngang nhau]], {{whereas}} Corvale managed only 9 million, [[half its level in 2000|bằng một nửa mức năm 2000]].` },
    { id: 't1-commuting', task: 1, ref: 'commuting', band: '8.0', words: 188,
      text: `<<Mở bài>> The bar chart [[compares|so sánh]] the proportion of workers who travelled to work by car, public transport, bicycle and on foot in four cities in 2024.

<<Tổng quan>> {{Overall}}, the car was the [[dominant mode of transport|phương tiện thống trị]] in Aldport and Brenham, {{whereas}} public transport was the most popular choice in Corwick and Dunsby. {{In addition}}, cycling was [[far more common|phổ biến hơn nhiều]] in the last two cities than in the first two.

<<Thân bài 1>> Aldport was the most car-dependent city, with 62% of workers driving, {{followed by}} Brenham at 41%. By contrast, only 28% of commuters in Corwick and a mere 15% in Dunsby used a car. Public transport [[showed the opposite pattern|cho thấy xu hướng ngược lại]]: it was used by 22% of workers in Aldport, {{rising}} to 35% in Brenham and [[peaking at|đạt đỉnh ở]] 40% in Corwick, {{before}} [[dipping slightly to|giảm nhẹ xuống]] 38% in Dunsby.

<<Thân bài 2>> Cycling [[accounted for|chiếm]] just 4% of journeys in Aldport and 12% in Brenham, {{but}} the figure [[climbed to|tăng lên]] 22% in Corwick and 30% in Dunsby, {{where}} it was almost [[twice as popular as|phổ biến gấp đôi]] the car. Walking was [[relatively stable|tương đối ổn định]] at between 10% and 12% in three cities, {{with}} a higher figure of 17% in Dunsby.` },
    { id: 't1-studyabroad', task: 1, ref: 'studyabroad', band: '8.0', words: 160,
      text: `<<Mở bài>> The bar chart [[compares|so sánh]] the number of international students, in thousands, who studied in Eastland, Northia, Southmark and Westerly in 2010 and 2024.

<<Tổng quan>> {{Overall}}, every country [[attracted more overseas students|thu hút nhiều sinh viên nước ngoài hơn]] in 2024 than in 2010, with Eastland remaining the most popular destination. Westerly saw the [[greatest proportional increase|mức tăng theo tỷ lệ lớn nhất]], {{whereas}} the figure for Southmark was [[almost unchanged|gần như không đổi]].

<<Thân bài 1>> In 2010, Eastland hosted 220,000 international students, {{followed by}} Northia with 150,000, Southmark with 90,000 and Westerly with only 60,000. By 2024, Eastland's total had [[risen by around 90,000|tăng khoảng 90.000]] to 310,000, {{and}} Northia's had [[increased by the same margin|tăng với mức tương đương]], reaching 240,000.

<<Thân bài 2>> {{In contrast}}, Southmark [[recorded a negligible rise|ghi nhận mức tăng không đáng kể]] from 90,000 to 95,000, {{which meant that}} it fell from third to last place. Westerly, {{on the other hand}}, [[tripled its intake|tăng gấp ba lượng tiếp nhận]] to 180,000, {{and}} therefore [[overtook|vượt qua]] Southmark to become the third most popular destination. {{In summary}}, the gap between the leading destination and the others [[widened|nới rộng]] over the period, {{apart from}} the case of Westerly.` },
    { id: 't1-budget', task: 1, ref: 'budget', band: '8.0', words: 167,
      text: `<<Mở bài>> The pie charts [[show how|cho thấy cách]] an average family [[allocated its income|phân bổ thu nhập]] across five categories in 2000 and 2024.

<<Tổng quan>> {{Overall}}, the most significant change was the [[shift|sự chuyển dịch]] from food to housing as the largest item of spending. {{In addition}}, the proportion spent on leisure [[increased noticeably|tăng đáng kể]], {{while}} transport and miscellaneous costs [[remained broadly stable|nhìn chung ổn định]].

<<Thân bài 1>> In 2000, food was the main expense, [[accounting for|chiếm]] 30% of the family budget, {{closely followed by}} housing at 28%. {{By 2024}}, however, the share of income spent on food had [[fallen sharply to|giảm mạnh xuống]] 18%, {{whereas}} housing [[had risen to|đã tăng lên]] 36% and [[become the biggest expense|trở thành khoản chi lớn nhất]].

<<Thân bài 2>> Spending on leisure [[rose from|tăng từ]] 10% to 15% over the period. {{By comparison}}, the proportion allocated to transport changed [[only slightly|chỉ một chút]], from 14% to 15%, {{and}} the share of other items [[dipped marginally|giảm nhẹ]] from 18% to 16%. {{In other words}}, families in 2024 devoted [[a far larger share|một tỷ lệ lớn hơn nhiều]] of their income to a place to live than to food, {{which was the reverse of}} the situation in 2000.` },
    { id: 't1-library', task: 1, ref: 'library', band: '8.0', words: 168,
      text: `<<Mở bài>> The pie charts [[illustrate|minh họa]] the main reasons why people used a city library in 2010 and in 2024.

<<Tổng quan>> {{Overall}}, the role of the library [[changed markedly|thay đổi rõ rệt]]. Borrowing books, which was by far the leading reason in 2010, was [[overtaken by|bị vượt qua bởi]] studying in 2024, {{while}} attending events became [[considerably more important|quan trọng hơn đáng kể]].

<<Thân bài 1>> In 2010, almost half of all visits (46%) were to borrow books, {{and}} a further 24% were for studying. Using computers [[accounted for|chiếm]] 14% of visits, {{whereas}} events were [[a minor reason|một lý do nhỏ]] at just 6%, {{with}} the remaining 10% [[falling into the "other" category|thuộc nhóm "khác"]].

<<Thân bài 2>> {{By 2024}}, the share of visitors who came for books had [[more than halved|giảm hơn một nửa]] to 22%, {{and}} studying [[had become the most common purpose|đã trở thành mục đích phổ biến nhất]] at 34%. The proportion attending events [[more than tripled|tăng hơn gấp ba]] to 20%, {{whereas}} computer use [[dropped slightly to|giảm nhẹ xuống]] 12% and other reasons rose slightly to 12%. {{Taken together}}, these figures suggest that the library [[is now valued|hiện được đánh giá cao]] more as a place to study and meet than as a source of books.` },
    { id: 't1-rentcity', task: 1, ref: 'rentcity', band: '8.0', words: 157,
      text: `<<Mở bài>> The table [[provides data on|cung cấp số liệu về]] average monthly rent, the percentage of income that rent [[represents|chiếm]] and the typical journey to work in five cities in 2024.

<<Tổng quan>> {{Overall}}, the cities with the highest rents also tended to have the longest commuting times. Arden was the [[most expensive|đắt đỏ nhất]] and had the longest journeys, {{whereas}} Dovan was the cheapest and the [[most convenient|thuận tiện nhất]].

<<Thân bài 1>> Arden had the highest average rent, at $1,450 per month, which [[amounted to|lên tới]] 41% of income, {{and}} its workers spent 52 minutes travelling to work. Esker [[came second on all three measures|đứng thứ hai ở cả ba chỉ số]], with rent of $1,320, a rent-to-income ratio of 39% and a commute of 48 minutes.

<<Thân bài 2>> Calder [[occupied a middle position|ở vị trí trung bình]], with figures of $1,120, 36% and 45 minutes. {{At the other end of the scale}}, residents of Brisk paid $980, or 32% of their income, and travelled for 38 minutes, {{while}} Dovan [[recorded the lowest figures in every category|ghi nhận các chỉ số thấp nhất ở mọi mục]]: $760, 27% and just 29 minutes.` },
    { id: 't1-sportsgender', task: 1, ref: 'sportsgender', band: '8.0', words: 184,
      text: `<<Mở bài>> The table [[shows|cho thấy]] the percentage of men and women who played five sports in 2024, {{as well as}} the average number of hours per week devoted to each one.

<<Tổng quan>> {{Overall}}, men were more likely than women to take part in three of the five sports, with football the most popular among them, {{whereas}} swimming and yoga [[appealed more to|thu hút nhiều hơn với]] women. Football also took up the most time each week, {{while}} yoga took up the least.

<<Thân bài 1>> The [[gender gap|khoảng cách giới tính]] was widest in football: 31% of men played, {{compared with}} only 9% of women, {{and}} participants spent an average of 3.4 hours a week on the game. Running was [[fairly evenly balanced|khá cân bằng]], at 22% of men and 19% of women, {{with}} 2.6 hours per week.

<<Thân bài 2>> Women [[outnumbered men|đông hơn nam]] in swimming (24% against 18%) and, {{most noticeably}}, in yoga, {{where}} 21% of women took part but only 6% of men. Yoga was the least time-consuming activity, at 1.8 hours per week, {{followed by}} swimming at 2.1 hours. Cycling [[fell somewhere in between|nằm ở khoảng giữa]], with 17% of men and 11% of women taking part for three hours a week.` },
    { id: 't1-recycling', task: 1, ref: 'recycling', band: '8.0', words: 151,
      text: `<<Mở bài>> The diagram [[illustrates|minh họa]] the process by which waste paper is [[recycled into|tái chế thành]] new paper.

<<Tổng quan>> {{Overall}}, the process has eight stages, beginning with the collection of used paper and ending with the production of large rolls of new paper. {{In between}}, most of the stages are concerned with [[cleaning|làm sạch]] the paper pulp.

<<Thân bài 1>> {{First}}, used paper is [[collected|được thu gom]] from homes and offices {{and then}} sorted according to quality before being taken to a recycling plant. {{Once there}}, it is mixed with water and [[broken down into|được phân rã thành]] a soft pulp. {{Next}}, the pulp passes through a series of screens, {{which}} remove staples, plastic and glue.

<<Thân bài 2>> {{After that}}, the pulp is washed with chemicals {{so that}} the ink [[can be removed|có thể được loại bỏ]]. The clean pulp is {{then}} pressed and [[rolled into|cán thành]] thin sheets, {{which}} are dried by heated rollers. {{In the final stage}}, the finished paper is cut and wound into large rolls, [[ready for|sẵn sàng để]] use.` },
    { id: 't1-rainwater', task: 1, ref: 'rainwater', band: '8.0', words: 155,
      text: `<<Mở bài>> The diagram [[shows how|cho thấy cách]] rainwater is collected, stored and used in a household.

<<Tổng quan>> {{Overall}}, the system consists of seven stages. Rain is [[collected from the roof|được thu từ mái nhà]] and filtered before being stored, {{and}} it is {{then}} used for a range of household purposes, {{with}} any surplus water [[released into the ground|thoát xuống đất]].

<<Thân bài 1>> The process begins when rain falls on the roof of the house. The water [[runs along|chảy dọc theo]] the gutters and flows into a downpipe, {{from where}} it passes through a filter {{that}} removes leaves and other debris. {{After this}}, the filtered water enters an underground storage tank.

<<Thân bài 2>> {{Subsequently}}, a pump [[transfers|chuyển]] water from the tank to a smaller tank in the loft, {{and}} from there it is supplied to the house. It is used for flushing toilets and running washing machines {{as well as}} for watering the garden. {{Finally}}, {{if}} the underground tank becomes full, the [[excess water|lượng nước dư]] drains away into a soakaway in the garden.` },
    { id: 't1-bricks', task: 1, ref: 'bricks', band: '8.0', words: 165,
      text: `<<Mở bài>> The diagram [[illustrates|minh họa]] how bricks are manufactured in a factory.

<<Tổng quan>> {{Overall}}, the process involves seven stages, {{starting with}} the extraction of clay {{and ending with}} the delivery of finished bricks. The clay is [[shaped|được tạo hình]] and dried before it is fired at a high temperature.

<<Thân bài 1>> {{At the beginning of the process}}, clay is dug from a quarry. It is {{then}} crushed and mixed with water in a mixer to form a [[uniform|đồng nhất]] mixture. {{Next}}, this mixture is pressed through a machine, {{and}} wires cut it into brick shapes.

<<Thân bài 2>> The newly formed bricks are {{then}} placed in a drying chamber, {{where}} they remain for about two days. {{Following this}}, they are fired in a kiln at around 1,000 degrees Celsius, {{which}} makes them hard and strong. {{Once}} the bricks have been cooled slowly, they are packed onto pallets and [[delivered to|giao đến]] building sites, [[where they are ready for use|nơi chúng sẵn sàng để sử dụng]]. {{In total}}, the process takes [[several days|vài ngày]] to complete, {{since}} the drying and cooling stages cannot be [[rushed|làm vội]].` },
    { id: 't1-harbour', task: 1, ref: 'harbour', band: '8.0', words: 160,
      text: `<<Mở bài>> The maps [[illustrate|minh họa]] the changes that have taken place in a fishing village between 2000 and the present day.

<<Tổng quan>> {{Overall}}, the village has [[changed from|chuyển từ]] a working fishing community {{into}} a tourist resort, with leisure and accommodation facilities [[replacing|thay thế]] the traditional buildings and farmland. {{However}}, the beach has been [[retained|được giữ lại]].

<<Thân bài 1>> In 2000, the western side of the village [[consisted of|gồm]] a fish market in the north and a large area of fishermen's cottages in the south. {{Today}}, the market has been replaced by a marina, {{while}} the cottages have been [[demolished|bị phá bỏ]] to make way for restaurants in the middle and holiday apartments in the south.

<<Thân bài 2>> On the eastern side, the farmland {{that}} once [[occupied|chiếm]] the north and centre has been [[converted into|chuyển thành]] a car park in the north and a hotel in the centre. {{By contrast}}, the beach in the south-east has [[remained unchanged|không thay đổi]], {{and}} it is {{now}} [[bordered by|nằm cạnh]] the new hotel, {{which}} is likely to [[cater for|phục vụ]] visitors.` },
    { id: 't1-townsquare', task: 1, ref: 'townsquare', band: '8.0', words: 160,
      text: `<<Mở bài>> The maps [[show|cho thấy]] how the centre of a town changed between 1985 and today.

<<Tổng quan>> {{Overall}}, the centre has become [[more pedestrian-friendly|thân thiện hơn với người đi bộ]], with the open-air market and the bus station [[giving way to|nhường chỗ cho]] a plaza and a tram stop. {{However}}, the cinema and part of the offices [[have stayed where they were|vẫn ở nguyên vị trí cũ]].

<<Thân bài 1>> In 1985, the west side of the town centre contained a cinema in the north and a large open-air market [[occupying the rest of the land|chiếm phần đất còn lại]]. {{Today}}, the cinema is [[still in the same position|vẫn ở vị trí cũ]], {{but}} the market has been replaced by a pedestrian plaza of the same size.

<<Thân bài 2>> On the eastern side, the bus station in the north {{has been|đã được}} replaced by a tram stop, {{which suggests}} a [[shift|sự chuyển dịch]] in public transport. The offices {{that}} originally [[extended across|trải dài khắp]] the centre and south [[have been reduced to|đã bị thu hẹp còn]] the central section, {{and}} a row of cafes has been built in the south-east corner, {{where}} workers and visitors can [[relax|thư giãn]].` },
    { id: 't1-schoolsite', task: 1, ref: 'schoolsite', band: '8.0', words: 162,
      text: `<<Mở bài>> The maps [[compare|so sánh]] the site of a school before and after it was redeveloped.

<<Tổng quan>> {{Overall}}, the school [[has expanded its facilities|đã mở rộng cơ sở vật chất]] for study and indoor sport, {{but}} this has been done [[at the expense of|với cái giá là mất đi]] its outdoor play areas. The main building and the car park have [[not changed at all|hoàn toàn không thay đổi]].

<<Thân bài 1>> {{Before}} the redevelopment, the main building [[stood on the western side of the site|nằm ở phía tây khu đất]], {{with}} a car park to its south. {{Both of these features}} [[remain unchanged|giữ nguyên]] in the second map, [[occupying|chiếm]] exactly the same positions.

<<Thân bài 2>> The eastern side, {{by contrast}}, has been [[completely transformed|biến đổi hoàn toàn]]. The playground in the north-east has been replaced by a new library, {{while}} the large football pitch, {{which}} used to cover the centre and south, has been [[divided into|chia thành]] a sports hall and a garden. {{As a result}}, students {{now}} have [[better indoor facilities|cơ sở vật chất trong nhà tốt hơn]] but much less outdoor space. {{In short}}, the redevelopment has [[shifted the emphasis|chuyển trọng tâm]] of the site from outdoor play to indoor activities.` },
  ]);
})(typeof self !== 'undefined' ? self : this);
