/* Đề Writing Task 1 bổ sung + bài mẫu có chú thích (tự biên soạn – số liệu giả định) */
(function (g) {
  g.TASK1_MORE = (g.TASK1_MORE || []).concat([
    // ---------- Biểu đồ đường ----------
    { id: 'water', type: 'line', title: 'The line graph shows the average daily water consumption per person (in litres) in three cities between 1990 and 2020.',
      x: ['1990', '1995', '2000', '2005', '2010', '2015', '2020'], unit: 'litres',
      series: [['City A', [180, 195, 210, 205, 190, 170, 150]], ['City B', [120, 125, 135, 150, 165, 175, 180]], ['City C', [90, 92, 95, 100, 98, 96, 95]]],
      overview: 'Overall, water use per person in City A rose to a peak and then declined, whereas consumption in City B grew steadily and overtook City A by the end of the period; City C consistently recorded the lowest figures.' },
    { id: 'onlineshop', type: 'line', title: 'The line graph shows the percentage of adults in one country who bought clothing, electronics and groceries online between 2008 and 2023.',
      x: ['2008', '2011', '2014', '2017', '2020', '2023'], unit: '%',
      series: [['Clothing', [12, 18, 26, 35, 52, 48]], ['Electronics', [20, 24, 30, 38, 49, 51]], ['Groceries', [3, 4, 6, 9, 27, 24]]],
      overview: 'Overall, online shopping became more popular in all three categories, with a particularly sharp rise in 2020; electronics was the leading category at the start and end of the period, while groceries remained the least common online purchase.' },
    { id: 'resorts', type: 'line', title: 'The line graph shows the number of visitors (in thousands) to a mountain resort and a beach resort in each month of 2023.',
      x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], unit: 'thousand',
      series: [['Mountain resort', [42, 45, 30, 18, 12, 20, 26, 28, 15, 14, 22, 40]], ['Beach resort', [8, 9, 14, 22, 35, 58, 72, 75, 46, 20, 10, 9]]],
      overview: 'Overall, the two resorts had opposite seasonal patterns: the mountain resort was busiest in winter, whereas the beach resort attracted most of its visitors in summer, when it also recorded the highest monthly figure of the year.' },
    // ---------- Biểu đồ cột ----------
    { id: 'waste', type: 'bar', title: 'The bar chart shows the percentage of municipal waste that was sent to landfill, recycled or incinerated in four countries in 2022.',
      x: ['Country P', 'Country Q', 'Country R', 'Country S'], unit: '%',
      series: [['Landfill', [55, 10, 32, 70]], ['Recycling', [30, 48, 40, 18]], ['Incineration', [15, 42, 28, 12]]],
      overview: 'Overall, landfill was the main method of waste disposal in Country P and Country S, whereas recycling accounted for the largest share in Country Q and Country R; Country Q relied far less on landfill than any other country.' },
    { id: 'phones', type: 'bar', title: 'The bar chart shows the percentage of people in four age groups who owned a smartphone in one country in 2013 and 2023.',
      x: ['18–29', '30–49', '50–64', '65+'], unit: '%',
      series: [['2013', [78, 64, 42, 18]], ['2023', [97, 95, 84, 61]]],
      overview: 'Overall, smartphone ownership increased in every age group over the decade, and although younger adults remained the most likely to own one, the gap between the generations narrowed considerably.' },
    { id: 'travel', type: 'bar', title: 'The bar chart compares the average distance (in kilometres) travelled per person per week by four modes of transport in one country in 2000 and 2020.',
      x: ['Car', 'Train', 'Bus', 'Bicycle'], unit: 'km',
      series: [['2000', [140, 35, 28, 6]], ['2020', [118, 52, 20, 15]]],
      overview: 'Overall, the car remained by far the most important means of transport in both years, although its use declined, while train travel and cycling became more popular and the distance covered by bus fell.' },
    // ---------- Biểu đồ tròn ----------
    { id: 'power', type: 'pie', title: 'The pie charts show the sources of electricity generated in one country in 2000 and 2020.',
      pies: [['2000', [['Coal', 48], ['Natural gas', 25], ['Nuclear', 15], ['Hydro', 8], ['Wind & solar', 4]]], ['2020', [['Coal', 22], ['Natural gas', 30], ['Nuclear', 14], ['Hydro', 9], ['Wind & solar', 25]]]],
      overview: 'Overall, coal lost its position as the leading source of electricity, while wind and solar power expanded dramatically; by 2020, natural gas had become the largest single source.' },
    // ---------- Bảng số liệu ----------
    { id: 'coffee', type: 'table', title: 'The table shows the average amount of coffee consumed per person (in kilograms) in five countries in 2000, 2010 and 2020.',
      head: ['Country', '2000', '2010', '2020'], rows: [['Country A', 9.8, 10.4, 10.1], ['Country B', 4.5, 5.6, 6.9], ['Country C', 6.2, 5.9, 5.1], ['Country D', 1.2, 2.3, 3.8], ['Country E', 0.4, 0.9, 1.7]],
      overview: 'Overall, Country A consumed by far the most coffee per person in all three years, and consumption grew in most countries, most notably in Country D and Country E, whereas Country C was the only one to see a continuous decline.' },
    { id: 'metro', type: 'table', title: 'The table gives information about the underground railway systems in five cities: the year they opened, the length of their routes and their annual passenger numbers.',
      head: ['City', 'Year opened', 'Route length (km)', 'Passengers per year (millions)'],
      rows: [['Northport', 1902, 410, '1,950'], ['Riverton', 1935, 185, 890], ['Lakeside', 1968, 64, 320], ['Eastvale', 1999, 96, 610], ['Sunhill', 2012, 27, 140]],
      overview: 'Overall, the oldest network, in Northport, is by far the longest and busiest, whereas the newest, in Sunhill, is the smallest on every measure, and there is a clear link between route length and passenger numbers.' },
    // ---------- Quy trình ----------
    { id: 'salmon', type: 'process', title: 'The diagram shows the life cycle of the salmon.',
      steps: ['Adult salmon lay eggs in gravel in the upper river', 'Eggs hatch into alevins after about 6 weeks', 'Alevins grow into fry and move to calmer water', 'Fry develop into smolts over 1 to 4 years', 'Smolts swim downstream to the sea', 'Salmon live in the ocean for 1 to 3 years and become adults', 'Mature adults swim back upstream to spawn'],
      overview: 'Overall, the life cycle of the salmon consists of seven stages, which take place partly in fresh water and partly in the ocean, and it forms a continuous cycle that begins and ends in the upper river.' },
    { id: 'tea', type: 'process', title: 'The diagram shows how black tea is produced.',
      steps: ['Fresh tea leaves are picked by hand', 'Leaves are withered on racks for 12 to 18 hours', 'Withered leaves are rolled to release their juices', 'Rolled leaves are left to oxidise for 2 to 4 hours', 'Leaves are dried with hot air at 120°C', 'Dried tea is sorted and graded by size', 'Tea is packed and shipped to buyers'],
      overview: 'Overall, the production of black tea involves seven main stages, beginning with the picking of fresh leaves and ending with the packing and shipping of the finished product.' },
    // ---------- Bản đồ ----------
    { id: 'island', type: 'map', title: 'The maps show a small island before and after the construction of a tourist resort.',
      maps: [['Before', [['Forest', 1, 1, 2, 2, '#16a34a'], ['Farmland', 1, 3, 2, 1, '#84cc16'], ['Beach', 3, 1, 2, 1, '#f59e0b'], ['Fishing huts', 3, 2, 2, 1, '#94a3b8'], ['Jetty', 3, 3, 2, 1, '#64748b']]],
             ['After', [['Hotel', 1, 1, 2, 1, '#6d5dfc'], ['Forest', 1, 2, 2, 1, '#16a34a'], ['Car park', 1, 3, 2, 1, '#94a3b8'], ['Beach', 3, 1, 2, 1, '#f59e0b'], ['Chalets', 3, 2, 2, 1, '#c026d3'], ['Ferry pier', 3, 3, 2, 1, '#0ea5a4']]]],
      overview: 'Overall, the island has been transformed from a quiet fishing and farming area into a tourist destination with new accommodation and transport facilities, although the beach, the main road and part of the forest have been retained.' },
  ]);

  g.MODELS = (g.MODELS || []).concat([
    { id: 't1-water', task: 1, ref: 'water', band: '8.0', words: 181,
      text: `<<Mở bài>> The line graph [[illustrates|minh họa]] [[how much water was used per person each day|lượng nước mỗi người sử dụng hằng ngày]] in three cities [[over a thirty-year period|trong giai đoạn ba mươi năm]], from 1990 to 2020.

<<Tổng quan>> {{Overall}}, consumption in City A [[rose to a peak|tăng lên đạt đỉnh]] {{before}} falling, {{whereas}} the figure for City B [[climbed steadily|tăng đều đặn]] and eventually [[overtook|vượt qua]] that of City A. City C [[consistently recorded the lowest levels|liên tục ghi nhận mức thấp nhất]] throughout the period.

<<Thân bài 1>> In 1990, residents of City A used 180 litres a day, [[considerably more than|nhiều hơn đáng kể so với]] those in City B, at 120 litres. Consumption in City A increased to [[a high of|mức cao nhất là]] 210 litres in 2000, {{but}} it then [[went into a steady decline|bắt đầu giảm đều]], dropping to 170 litres in 2015 and 150 litres in 2020. {{By contrast}}, the figure for City B [[rose continuously|tăng liên tục]], reaching 165 litres in 2010 and 175 litres in 2015, when it [[surpassed|vượt qua]] City A for the first time.

<<Thân bài 2>> City B [[ended the period at|kết thúc giai đoạn ở mức]] 180 litres, [[exactly the same as|bằng đúng]] City A's starting point. {{Meanwhile}}, water use in City C [[remained relatively stable|tương đối ổn định]], [[edging up|nhích lên]] from 90 litres in 1990 to a peak of 100 litres in 2005 {{before}} [[dipping slightly|giảm nhẹ]] to 95 litres in 2020. {{As a result}}, it [[stayed well below|luôn thấp hơn nhiều so với]] the other two cities at every point.` },

    { id: 't1-onlineshop', task: 1, ref: 'onlineshop', band: '8.0', words: 179,
      text: `<<Mở bài>> The line graph [[shows the proportion of|cho thấy tỉ lệ]] adults in one country who [[purchased|mua]] clothing, electronics and groceries online between 2008 and 2023.

<<Tổng quan>> {{Overall}}, online shopping [[became increasingly popular|ngày càng phổ biến]] in all three categories, with [[a particularly sharp rise|một sự tăng vọt đặc biệt]] in 2020. Electronics [[was the most commonly bought item|là mặt hàng được mua nhiều nhất]] at the beginning and end of the period, {{while}} groceries [[remained the least common|vẫn ít phổ biến nhất]] online purchase.

<<Thân bài 1>> In 2008, 20% of adults bought electronics online, {{compared with}} 12% for clothing. Both figures [[grew at a similar pace|tăng với tốc độ tương tự]] over the next nine years, reaching 38% and 35% [[respectively|lần lượt]] in 2017. Clothing then [[surged to|tăng vọt lên]] 52% in 2020, [[briefly overtaking|tạm thời vượt qua]] electronics, which stood at 49%. {{However}}, by 2023 the positions [[had been reversed again|lại bị đảo ngược]], {{as}} clothing [[fell back slightly to|giảm nhẹ trở lại còn]] 48% {{whereas}} electronics [[edged up to|nhích lên]] 51%.

<<Thân bài 2>> Groceries, {{by contrast}}, [[were rarely bought online|hiếm khi được mua trực tuyến]] for most of the period, with the proportion rising only from 3% to 9% between 2008 and 2017. {{Nevertheless}}, the figure [[tripled to|tăng gấp ba lên]] 27% in 2020 {{before}} [[dipping to|giảm xuống]] 24% in the final year, [[still far higher than|vẫn cao hơn nhiều so với]] its initial level. {{Even so}}, [[fewer than a quarter of|chưa đến một phần tư]] adults bought groceries online at the end of the period, exactly half the figure for clothing.` },

    { id: 't1-resorts', task: 1, ref: 'resorts', band: '8.0', words: 178,
      text: `<<Mở bài>> The line graph [[compares the monthly number of visitors|so sánh số lượng du khách theo tháng]] to a mountain resort and a beach resort [[over the course of|trong suốt]] 2023.

<<Tổng quan>> {{Overall}}, the two resorts [[displayed opposite seasonal patterns|có xu hướng theo mùa trái ngược nhau]]. The mountain resort was [[at its busiest|đông khách nhất]] in the winter months, {{whereas}} the beach resort attracted most of its visitors in summer, when it also recorded [[the highest monthly figure of the year|con số theo tháng cao nhất trong năm]].

<<Thân bài 1>> The mountain resort welcomed 42 thousand visitors in January and [[peaked at|đạt đỉnh]] 45 thousand in February. {{After that}}, numbers [[fell sharply|giảm mạnh]], [[hitting a low of|chạm đáy ở mức]] 12 thousand in May. There was [[a modest recovery|một sự phục hồi nhẹ]] in the summer, to 28 thousand in August, {{but}} the figure [[dropped back to|giảm trở lại]] 14 thousand in October {{before}} [[rebounding to|bật tăng trở lại]] 40 thousand in December.

<<Thân bài 2>> {{In contrast}}, the beach resort received [[a mere|chỉ vỏn vẹn]] 8 thousand visitors in January. Its numbers [[rose steadily|tăng đều]] through the spring and then [[soared to|tăng vọt lên]] 72 thousand in July and a peak of 75 thousand in August, [[considerably higher than|cao hơn đáng kể so với]] the mountain resort's busiest month. {{Subsequently}}, visitor numbers [[plummeted|lao dốc]], falling to 20 thousand in October and just 9 thousand by December, when the mountain resort was [[far more popular|đông khách hơn hẳn]].` },

    { id: 't1-waste', task: 1, ref: 'waste', band: '8.0', words: 167,
      text: `<<Mở bài>> The bar chart [[compares the proportions of|so sánh tỉ lệ]] municipal waste that were [[sent to landfill|đưa đến bãi chôn lấp]], recycled or incinerated in four countries in 2022.

<<Tổng quan>> {{Overall}}, landfill was [[the predominant method of disposal|phương thức xử lý chủ yếu]] in Country P and Country S, {{whereas}} recycling [[accounted for the largest share|chiếm tỉ trọng lớn nhất]] in Country Q and Country R. {{Notably}}, Country Q [[relied far less on|phụ thuộc ít hơn nhiều vào]] landfill than any other nation.

<<Thân bài 1>> In Country S, [[a massive|con số rất lớn là]] 70% of waste ended up in landfill, [[the highest figure on the chart|con số cao nhất trên biểu đồ]], {{while}} only 18% was recycled and 12% was burned in incinerators. The pattern was similar in Country P, where landfill [[made up|chiếm]] 55% of the total, [[just over half|hơn một nửa một chút]], {{compared with}} 30% for recycling and 15% for incineration.

<<Thân bài 2>> {{By contrast}}, Country Q recycled 48% of its waste, [[nearly half|gần một nửa]], and incinerated 42%, [[leaving a mere|chỉ còn lại vỏn vẹn]] 10% for landfill. Country R [[had a more balanced profile|có cơ cấu cân bằng hơn]]: recycling was the most common method, at 40%, {{followed by}} landfill (32%) and incineration (28%). {{In other words}}, Country Q [[burned more than three times as much of its waste as|đốt tỉ lệ rác nhiều gấp hơn ba lần so với]] Country S [[in percentage terms|xét theo tỉ lệ phần trăm]].` },

    { id: 't1-phones', task: 1, ref: 'phones', band: '8.0', words: 167,
      text: `<<Mở bài>> The bar chart [[illustrates the rate of smartphone ownership|minh họa tỉ lệ sở hữu điện thoại thông minh]] among four age groups in one country in 2013 and 2023.

<<Tổng quan>> {{Overall}}, ownership [[rose across all age groups|tăng ở tất cả các nhóm tuổi]] over the decade. {{Although}} younger adults [[remained the most likely to|vẫn là nhóm có khả năng cao nhất]] own a smartphone, [[the gap between the generations|khoảng cách giữa các thế hệ]] [[narrowed considerably|thu hẹp đáng kể]].

<<Thân bài 1>> In 2013, 78% of people aged 18 to 29 owned a smartphone, [[considerably higher than|cao hơn đáng kể so với]] the figure for the 30–49 group, at 64%. The proportion was lower again for those aged 50 to 64, at 42%, and only 18% of people aged 65 and over had one. Ten years later, ownership among the two youngest groups [[had reached near-saturation levels|đã đạt mức gần bão hòa]], at 97% and 95% [[respectively|lần lượt]].

<<Thân bài 2>> [[The most dramatic growth|Mức tăng mạnh mẽ nhất]] was seen among older people. Ownership in the 50–64 age group [[doubled|tăng gấp đôi]] from 42% to 84%, {{while}} the proportion of over-65s [[more than tripled|tăng hơn gấp ba]], [[climbing from|tăng từ]] 18% to 61%. {{As a result}}, [[well over half of|hơn hẳn một nửa]] the oldest group owned a smartphone by 2023, {{compared with}} [[fewer than one in five|chưa đến một phần năm]] a decade earlier. {{Nevertheless}}, this group [[still lagged well behind|vẫn tụt lại khá xa so với]] the youngest adults, [[among whom ownership was almost universal|nhóm mà gần như ai cũng sở hữu]].` },

    { id: 't1-travel', task: 1, ref: 'travel', band: '8.0', words: 172,
      text: `<<Mở bài>> The bar chart [[compares the average weekly distance|so sánh quãng đường trung bình mỗi tuần]] that people in one country travelled by car, train, bus and bicycle in 2000 and 2020.

<<Tổng quan>> {{Overall}}, the car was [[by far the most popular means of transport|là phương tiện phổ biến nhất với khoảng cách lớn]] in both years, {{although}} its use [[declined noticeably|giảm đáng kể]]. {{Meanwhile}}, train travel and cycling [[gained in popularity|ngày càng được ưa chuộng]], {{whereas}} the distance covered by bus fell.

<<Thân bài 1>> In 2000, the average person travelled 140 kilometres a week by car, [[four times the figure for|gấp bốn lần con số của]] the train, at 35 kilometres. By 2020, car travel [[had dropped to|đã giảm xuống]] 118 kilometres, {{yet}} it [[still dwarfed|vẫn lớn hơn rất nhiều so với]] every other mode. Train travel, {{on the other hand}}, [[rose significantly|tăng đáng kể]] to 52 kilometres, [[consolidating its position as|củng cố vị trí là]] the second most common option.

<<Thân bài 2>> [[Turning to|Xét đến]] the remaining modes, the distance travelled by bus [[fell from|giảm từ]] 28 to 20 kilometres, so that it [[lagged further behind|tụt lại xa hơn]] the train. Cycling, {{by contrast}}, [[saw the most dramatic relative increase|có mức tăng tương đối mạnh nhất]]: {{although}} it [[remained the least used mode|vẫn là phương tiện ít được dùng nhất]], the figure [[more than doubled|tăng hơn gấp đôi]], from 6 to 15 kilometres per week. {{Consequently}}, by 2020 people [[covered more than twice as many kilometres by|đi quãng đường dài gấp hơn hai lần bằng]] train as by bus.` },

    { id: 't1-power', task: 1, ref: 'power', band: '8.0', words: 176,
      text: `<<Mở bài>> The two pie charts [[illustrate the breakdown of|minh họa cơ cấu]] electricity generation [[by source|theo nguồn]] in one country in 2000 and 2020.

<<Tổng quan>> {{Overall}}, coal [[lost its position as|mất vị trí là]] the main source of electricity, {{while}} wind and solar power [[expanded dramatically|mở rộng mạnh mẽ]]. By 2020, natural gas [[had become the largest single source|đã trở thành nguồn đơn lẻ lớn nhất]], {{although}} [[no source accounted for|không nguồn nào chiếm]] more than a third of the total.

<<Thân bài 1>> In 2000, coal [[made up almost half of|chiếm gần một nửa]] all electricity, at 48%, [[nearly twice the share of|gần gấp đôi tỉ trọng của]] natural gas (25%). Twenty years later, {{however}}, its contribution [[had more than halved|đã giảm hơn một nửa]] to 22%. {{At the same time}}, natural gas [[grew moderately|tăng vừa phải]] to 30%, [[overtaking|vượt qua]] coal as the leading source. {{Thus}}, the two fossil fuels [[together accounted for|cộng lại chiếm]] just over half of all electricity in 2020, {{compared with}} almost three quarters twenty years earlier.

<<Thân bài 2>> [[The most striking change|Thay đổi nổi bật nhất]] was in renewable energy. Wind and solar [[accounted for a mere|chỉ chiếm vỏn vẹn]] 4% in 2000, {{but}} this figure [[rose more than sixfold|tăng hơn sáu lần]] to 25%, exactly a quarter of the total. {{By contrast}}, the shares of the other two sources [[remained virtually unchanged|gần như không đổi]]: nuclear power [[dipped marginally|giảm nhẹ]] from 15% to 14%, {{while}} hydroelectricity [[edged up|nhích lên]] from 8% to 9%.` },

    { id: 't1-coffee', task: 1, ref: 'coffee', band: '8.0', words: 180,
      text: `<<Mở bài>> The table [[provides information about|cung cấp thông tin về]] [[per capita coffee consumption|lượng tiêu thụ cà phê bình quân đầu người]] in five countries in 2000, 2010 and 2020.

<<Tổng quan>> {{Overall}}, Country A [[consumed by far the most coffee|tiêu thụ nhiều cà phê nhất với khoảng cách lớn]] per person in all three years. Consumption grew in most countries, [[most notably|đáng chú ý nhất là]] in Country D and Country E, {{whereas}} Country C was the only one to [[experience a continuous decline|giảm liên tục]].

<<Thân bài 1>> In 2000, the average person in Country A drank 9.8 kilograms of coffee, [[more than double the figure for|hơn gấp đôi con số của]] Country B, at 4.5 kilograms. Consumption in Country A [[rose slightly|tăng nhẹ]] to 10.4 kilograms in 2010 {{before}} [[falling back marginally|giảm nhẹ trở lại]] to 10.1 kilograms. Country B, {{meanwhile}}, [[saw steady growth|tăng trưởng đều đặn]], reaching 6.9 kilograms by 2020. {{In contrast}}, the figure for Country C [[fell continuously|giảm liên tục]], from 6.2 to 5.1 kilograms, [[falling behind|bị tụt lại sau]] Country B by the end of the period.

<<Thân bài 2>> The lowest levels of consumption were found in Country D and Country E, {{but}} these countries [[recorded the fastest growth|ghi nhận mức tăng nhanh nhất]]. In Country D, the amount [[more than tripled|tăng hơn gấp ba]], from 1.2 to 3.8 kilograms, {{while}} in Country E it [[increased more than fourfold|tăng hơn bốn lần]], from just 0.4 to 1.7 kilograms. {{Nevertheless}}, even after this growth, both still consumed [[considerably less than|ít hơn đáng kể so với]] the other three nations.` },

    { id: 't1-metro', task: 1, ref: 'metro', band: '8.0', words: 182,
      text: `<<Mở bài>> The table [[compares|so sánh]] the underground railway systems in five cities [[in terms of|xét về]] the year they opened, [[the total length of their routes|tổng chiều dài tuyến]] and [[the number of passengers they carry annually|số lượng hành khách vận chuyển mỗi năm]].

<<Tổng quan>> {{Overall}}, the oldest network, in Northport, is [[by far the longest and busiest|dài nhất và đông khách nhất với khoảng cách lớn]], {{whereas}} the most recent one, in Sunhill, is the smallest [[on every measure|trên mọi tiêu chí]]. {{In general}}, [[there is a clear link between|có mối liên hệ rõ ràng giữa]] route length and passenger numbers.

<<Thân bài 1>> Northport's underground opened in 1902 and has 410 kilometres of routes, [[more than twice the length of|dài hơn gấp đôi]] the second-largest system, in Riverton. It carries 1,950 million passengers a year, [[well over double|hơn gấp đôi khá nhiều]] Riverton's figure of 890 million. The Riverton network, which [[dates back to|có từ]] 1935, covers 185 kilometres.

<<Thân bài 2>> The remaining three systems are [[considerably smaller|nhỏ hơn đáng kể]]. Eastvale's network, opened in 1999, is 96 kilometres long and serves 610 million passengers annually, {{while}} Lakeside's older system, which began operating in 1968, has only 64 kilometres of track and carries 320 million people, [[roughly half as many as|khoảng một nửa so với]] Eastvale. {{Finally}}, Sunhill's underground, [[the most recent addition|công trình mới nhất]], opened in 2012 and [[consists of just|chỉ gồm]] 27 kilometres of routes, carrying 140 million passengers a year, [[less than a tenth of|chưa bằng một phần mười]] Northport's total.` },

    { id: 't1-salmon', task: 1, ref: 'salmon', band: '8.0', words: 181,
      text: `<<Mở bài>> The diagram [[illustrates the various stages in|minh họa các giai đoạn trong]] [[the life cycle of|vòng đời của]] the salmon, from the laying of eggs to the return of adult fish to their birthplace.

<<Tổng quan>> {{Overall}}, there are seven [[distinct stages|giai đoạn riêng biệt]], [[some of which take place in fresh water|một số diễn ra ở nước ngọt]] and others in the ocean. The process [[forms a continuous cycle|tạo thành một vòng tuần hoàn liên tục]], [[beginning and ending|bắt đầu và kết thúc]] in the upper reaches of a river.

<<Thân bài 1>> {{First}}, adult salmon [[lay their eggs|đẻ trứng]] [[among the gravel|giữa lớp sỏi]] of the upper river. {{After}} about 6 weeks, these eggs [[hatch into|nở thành]] tiny young fish [[known as|được gọi là]] alevins. {{As}} the alevins grow, they [[develop into|phát triển thành]] fry and move to calmer water, where they [[gradually mature|dần dần lớn lên]] over a period of 1 to 4 years {{until}} they become smolts.

<<Thân bài 2>> {{At this point}}, the smolts [[make their way downstream|di chuyển xuôi dòng]] to the sea. They then spend between 1 and 3 years in the ocean, where they [[reach adulthood|trưởng thành]]. {{Finally}}, the mature adults [[swim back upstream|bơi ngược dòng trở lại]] to the upper river [[in order to|để]] spawn, {{and}} the eggs they lay there mark [[the start of a new cycle|sự khởi đầu của một chu trình mới]]. {{In this way}}, each generation [[returns to the place where it was born|quay về nơi nó được sinh ra]].` },

    { id: 't1-tea', task: 1, ref: 'tea', band: '8.0', words: 174,
      text: `<<Mở bài>> The diagram [[illustrates the process by which|minh họa quy trình mà qua đó]] black tea [[is manufactured|được sản xuất]], from the picking of fresh leaves on the plantation to the delivery of the finished product.

<<Tổng quan>> {{Overall}}, the production of black tea [[involves seven main stages|gồm bảy giai đoạn chính]], [[starting with|bắt đầu bằng]] the harvesting of fresh leaves and [[culminating in|kết thúc bằng]] the packing and shipping of the tea. {{Unlike}} a natural cycle, it is [[a linear process|một quy trình tuyến tính]].

<<Thân bài 1>> {{Initially}}, fresh tea leaves [[are picked by hand|được hái bằng tay]]. {{After that}}, they [[are spread out on racks|được trải ra trên giàn]] and [[left to wither|để cho héo]] for 12 to 18 hours. The withered leaves [[are then rolled|sau đó được vò]] [[in order to|để]] release their juices, {{and}} they are subsequently [[left to oxidise|để lên men (oxy hóa)]] for a further 2 to 4 hours, [[during which they are simply left to stand|trong thời gian đó lá chỉ được để yên]].

<<Thân bài 2>> {{Once}} oxidation [[is complete|hoàn tất]], the leaves [[are dried using hot air|được sấy bằng khí nóng]] at a temperature of 120°C. {{Next}}, the dried tea [[is sorted and graded according to|được phân loại và xếp hạng theo]] the size of the leaves, {{so that}} leaves of a similar size are grouped together. {{Finally}}, the tea [[is packed|được đóng gói]] and shipped to buyers, [[ready to be sold|sẵn sàng để bán]] to consumers.` },

    { id: 't1-island', task: 1, ref: 'island', band: '8.0', words: 190,
      text: `<<Mở bài>> The maps [[illustrate how|minh họa cách]] a small island [[was transformed|được biến đổi]] [[following the construction of|sau khi xây dựng]] a tourist resort.

<<Tổng quan>> {{Overall}}, the island [[changed from a quiet fishing and farming area into|chuyển từ một vùng đánh cá và làm nông yên tĩnh thành]] a tourist destination, with [[new accommodation and transport facilities|cơ sở lưu trú và giao thông mới]]. {{However}}, the beach and the main road [[remained unchanged|vẫn giữ nguyên]], and [[part of the forest was preserved|một phần khu rừng được bảo tồn]].

<<Thân bài 1>> {{Before}} the development, the land to the west of the main road, which [[runs from north to south|chạy theo hướng bắc – nam]], was [[largely covered by|phần lớn được bao phủ bởi]] forest, with farmland [[to the south|ở phía nam]]. {{Afterwards}}, the northern section of the forest [[was cleared to make way for|bị phát quang để nhường chỗ cho]] a hotel, {{while}} the remaining woodland was kept in the centre of the western side. The farmland in the south-west [[was replaced by|được thay thế bằng]] a car park.

<<Thân bài 2>> On the eastern side of the island, the beach in the north-east [[was left untouched|được giữ nguyên]]. {{However}}, the fishing huts to its south [[were demolished|bị phá bỏ]] and tourist chalets [[were built in their place|được xây dựng thay thế]]. {{Similarly}}, the jetty in the south-east [[was converted into|được chuyển đổi thành]] a ferry pier, [[presumably to cater for|có lẽ để phục vụ]] the arrival of visitors. {{As a result}}, [[the focus of the island appears to have shifted|trọng tâm của hòn đảo dường như đã chuyển dịch]] from fishing and farming towards tourism.` },
  ]);
})(typeof self !== 'undefined' ? self : this);
