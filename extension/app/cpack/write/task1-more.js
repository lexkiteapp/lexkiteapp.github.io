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
    { id: 'island', type: 'map', road: 'Main road', title: 'The maps show a small island before and after the construction of a tourist resort.',
      maps: [['Before', [['Forest', 1, 1, 2, 2, '#16a34a'], ['Farmland', 1, 3, 2, 1, '#84cc16'], ['Beach', 3, 1, 2, 1, '#f59e0b'], ['Fishing huts', 3, 2, 2, 1, '#94a3b8'], ['Jetty', 3, 3, 2, 1, '#64748b']]],
             ['After', [['Hotel', 1, 1, 2, 1, '#6d5dfc'], ['Forest', 1, 2, 2, 1, '#16a34a'], ['Car park', 1, 3, 2, 1, '#94a3b8'], ['Beach', 3, 1, 2, 1, '#f59e0b'], ['Chalets', 3, 2, 2, 1, '#c026d3'], ['Ferry pier', 3, 3, 2, 1, '#0ea5a4']]]],
      overview: 'Overall, the island has been transformed from a quiet fishing and farming area into a tourist destination with new accommodation and transport facilities, although the beach, the main road and part of the forest have been retained.' },
  ]);

  g.MODELS = (g.MODELS || []).concat([
    { id: 't1-water', task: 1, ref: 'water', band: '8.0', words: 203,
      text: `<<Mở bài>> The line graph [[illustrates|minh họa]] [[how much water was used per person each day|lượng nước mỗi người sử dụng hằng ngày]] in three cities [[over a thirty-year period|trong giai đoạn ba mươi năm]], from 1990 to 2020.

<<Tổng quan>> {{Overall}}, consumption in City A [[rose to a peak|tăng lên đạt đỉnh]] {{before}} falling, {{whereas}} the figure for City B [[climbed steadily|tăng đều đặn]] and eventually [[overtook|vượt qua]] that of City A. City C [[consistently recorded the lowest levels|liên tục ghi nhận mức thấp nhất]] throughout the period.

<<Thân bài 1>> In 1990, residents of City A used 180 litres a day, [[considerably more than|nhiều hơn đáng kể so với]] those in City B, at 120 litres. Consumption in City A increased to [[a high of|mức cao nhất là]] 210 litres in 2000, {{but}} it then [[went into a steady decline|bắt đầu giảm đều]], dropping to 170 litres in 2015 and 150 litres in 2020. {{By contrast}}, the figure for City B [[rose continuously|tăng liên tục]], reaching 165 litres in 2010 and 175 litres in 2015, when it [[surpassed|vượt qua]] City A for the first time.

<<Thân bài 2>> City B [[ended the period at|kết thúc giai đoạn ở mức]] 180 litres, [[exactly the same as|bằng đúng]] City A's starting point. {{Meanwhile}}, water use in City C [[remained relatively stable|tương đối ổn định]], [[edging up|nhích lên]] from 90 litres in 1990 to a peak of 100 litres in 2005 {{before}} [[dipping slightly|giảm nhẹ]] to 95 litres in 2020. {{As a result}}, it [[stayed well below|luôn thấp hơn nhiều so với]] the other two cities at every point.` },

    { id: 't1-onlineshop', task: 1, ref: 'onlineshop', band: '8.0', words: 201,
      text: `<<Mở bài>> The line graph [[shows the proportion of|cho thấy tỉ lệ]] adults in one country who [[purchased|mua]] clothing, electronics and groceries online between 2008 and 2023.

<<Tổng quan>> {{Overall}}, online shopping [[became increasingly popular|ngày càng phổ biến]] in all three categories, with [[a particularly sharp rise|một sự tăng vọt đặc biệt]] in 2020. Electronics [[was the most commonly bought item|là mặt hàng được mua nhiều nhất]] at the beginning and end of the period, {{while}} groceries [[remained the least common|vẫn ít phổ biến nhất]] online purchase.

<<Thân bài 1>> In 2008, 20% of adults bought electronics online, {{compared with}} 12% for clothing. Both figures [[grew at a similar pace|tăng với tốc độ tương tự]] over the next nine years, reaching 38% and 35% [[respectively|lần lượt]] in 2017. Clothing then [[surged to|tăng vọt lên]] 52% in 2020, [[briefly overtaking|tạm thời vượt qua]] electronics, which stood at 49%. {{However}}, by 2023 the positions [[had been reversed again|lại bị đảo ngược]], {{as}} clothing [[fell back slightly to|giảm nhẹ trở lại còn]] 48% {{whereas}} electronics [[edged up to|nhích lên]] 51%.

<<Thân bài 2>> Groceries, {{by contrast}}, [[were rarely bought online|hiếm khi được mua trực tuyến]] for most of the period, with the proportion rising only from 3% to 9% between 2008 and 2017. {{Nevertheless}}, the figure [[tripled to|tăng gấp ba lên]] 27% in 2020 {{before}} [[dipping to|giảm xuống]] 24% in the final year, [[still far higher than|vẫn cao hơn nhiều so với]] its initial level. {{Even so}}, [[fewer than a quarter of|chưa đến một phần tư]] adults bought groceries online at the end of the period, exactly half the figure for clothing.` },

    { id: 't1-resorts', task: 1, ref: 'resorts', band: '8.0', words: 190,
      text: `<<Mở bài>> The line graph [[compares the monthly number of visitors|so sánh số lượng du khách theo tháng]] to a mountain resort and a beach resort [[over the course of|trong suốt]] 2023.

<<Tổng quan>> {{Overall}}, the two resorts [[displayed opposite seasonal patterns|có xu hướng theo mùa trái ngược nhau]]. The mountain resort was [[at its busiest|đông khách nhất]] in the winter months, {{whereas}} the beach resort attracted most of its visitors in summer, when it also recorded [[the highest monthly figure of the year|con số theo tháng cao nhất trong năm]].

<<Thân bài 1>> The mountain resort welcomed 42 thousand visitors in January and [[peaked at|đạt đỉnh]] 45 thousand in February. {{After that}}, numbers [[fell sharply|giảm mạnh]], [[hitting a low of|chạm đáy ở mức]] 12 thousand in May. There was [[a modest recovery|một sự phục hồi nhẹ]] in the summer, to 28 thousand in August, {{but}} the figure [[dropped back to|giảm trở lại]] 14 thousand in October {{before}} [[rebounding to|bật tăng trở lại]] 40 thousand in December.

<<Thân bài 2>> {{In contrast}}, the beach resort received [[a mere|chỉ vỏn vẹn]] 8 thousand visitors in January. Its numbers [[rose steadily|tăng đều]] through the spring and then [[soared to|tăng vọt lên]] 72 thousand in July and a peak of 75 thousand in August, [[considerably higher than|cao hơn đáng kể so với]] the mountain resort's busiest month. {{Subsequently}}, visitor numbers [[plummeted|lao dốc]], falling to 20 thousand in October and just 9 thousand by December, when the mountain resort was [[far more popular|đông khách hơn hẳn]].`,
      band7: {
  "words": 166,
  "text": "The line graph compares the monthly visitor figures for a mountain resort and a beach resort throughout 2023.\n\nOverall, the two resorts exhibited contrasting seasonal patterns. The mountain destination was particularly favoured during the winter months, whereas the beach resort attracted significantly higher numbers during the summer, reaching the overall peak of the year.\n\nRegarding the mountain resort, visitor numbers stood at 42 thousand in January before climbing to a peak of 45 thousand in February. A sharp decline followed, with figures hitting a low of 12 thousand in May. Following a brief recovery to 28 thousand in August, attendance dropped back to 14 thousand in October before rebounding strongly to 40 thousand by the end of the year.\n\nIn stark contrast, the beach resort started with a modest 8 thousand visitors in January. Numbers rose progressively throughout spring and soared to 75 thousand in August. However, this was followed by a steep decrease, falling to 20 thousand in October and just 9 thousand in December.",
  "notes": {
    "TA": "Bao quát đầy đủ các biến động theo tháng, chỉ rõ đỉnh mùa đông của mountain resort và đỉnh mùa hè vượt trội của beach resort; so sánh đối lập sắc nét.",
    "CC": "Mạch lạc chặt chẽ với các cụm nối linh hoạt (Regarding..., In stark contrast, Following a brief recovery, However, this was followed by...).",
    "LR": "Vốn từ phong phú và học thuật: exhibited contrasting seasonal patterns, favoured, sharp decline, brief recovery, rebounding strongly, modest, progressively, soared.",
    "GRA": "Đa dạng các cấu trúc câu phức, sử dụng thành thạo cụm phân từ (hitting a low..., reaching the overall peak...) và giới từ chỉ thời gian."
  }
},
      band6: {
  "words": 163,
  "text": "The line graph gives information about how many people visited two different resorts, a mountain resort and a beach resort, in every month of 2023.\n\nOverall, both resorts had very different trends throughout the year. The mountain resort was more popular in winter months, while the beach resort had much more tourists in summer time.\n\nIn January, the mountain resort welcomed 42 thousand people and then increased to 45 thousand in February. After that, the number went down quickly to 12 thousand in May, which was the lowest point. In August it increased again to 28 thousand, but decreased to 14 thousand in October, and finally rose to 40 thousand in December.\n\nOn the other hand, the beach resort had only 8 thousand visitors in January. Then the number grew steadily and peaked at 75 thousand in August, which was more higher than the mountain resort. After August, the visitors decreased to 20 thousand in October and finished at 9 thousand in December.",
  "notes": {
    "TA": "Số liệu chính đúng (42/45/12/28/14/40 và 8/75/20/9); so sánh hai khu nghỉ còn đơn giản, chưa nêu độ chênh mùa hè.",
    "CC": "Bố cục 4 đoạn có overview; liên từ cơ bản (while, After that, On the other hand, but, finally) dùng theo trình tự thời gian máy móc.",
    "LR": "Từ vựng vừa đủ: went down quickly, lowest point, increased again; lặp increased/decreased.",
    "GRA": "Lỗi điển hình band 6: (1) 'much more tourists' (tourists đếm được → many); (2) 'the mountain resort ... then increased to 45 thousand' (chủ ngữ sai: số khách mới tăng, không phải khu nghỉ); (3) 'more higher' (so sánh kép); chủ yếu câu ghép đơn giản."
  }
} },

    { id: 't1-waste', task: 1, ref: 'waste', band: '8.0', words: 180,
      text: `<<Mở bài>> The bar chart [[compares the proportions of|so sánh tỉ lệ]] municipal waste that were [[sent to landfill|đưa đến bãi chôn lấp]], recycled or incinerated in four countries in 2022.

<<Tổng quan>> {{Overall}}, landfill was [[the predominant method of disposal|phương thức xử lý chủ yếu]] in Country P and Country S, {{whereas}} recycling [[accounted for the largest share|chiếm tỉ trọng lớn nhất]] in Country Q and Country R. {{Notably}}, Country Q [[relied far less on|phụ thuộc ít hơn nhiều vào]] landfill than any other nation.

<<Thân bài 1>> In Country S, [[a massive|con số rất lớn là]] 70% of waste ended up in landfill, [[the highest figure on the chart|con số cao nhất trên biểu đồ]], {{while}} only 18% was recycled and 12% was burned in incinerators. The pattern was similar in Country P, where landfill [[made up|chiếm]] 55% of the total, [[just over half|hơn một nửa một chút]], {{compared with}} 30% for recycling and 15% for incineration.

<<Thân bài 2>> {{By contrast}}, Country Q recycled 48% of its waste, [[nearly half|gần một nửa]], and incinerated 42%, [[leaving a mere|chỉ còn lại vỏn vẹn]] 10% for landfill. Country R [[had a more balanced profile|có cơ cấu cân bằng hơn]]: recycling was the most common method, at 40%, {{followed by}} landfill (32%) and incineration (28%). {{In other words}}, Country Q [[burned more than three times as much of its waste as|đốt tỉ lệ rác nhiều gấp hơn ba lần so với]] Country S [[in percentage terms|xét theo tỉ lệ phần trăm]].`,
      band7: {
  "words": 154,
  "text": "The bar chart compares the proportions of municipal waste disposed of through landfill, recycling, and incineration across four countries in 2022.\n\nOverall, landfill was the predominant disposal method in Countries P and S, whereas recycling accounted for the largest share in Countries Q and R. Notably, Country Q demonstrated the lowest reliance on landfill sites.\n\nLooking first at the nations heavily reliant on landfill, Country S deposited 70% of its total waste into landfill sites, representing the highest figure in the chart. Only 18% was recycled, while 12% was incinerated. In Country P, landfill also constituted the majority at 55%, compared with 30% for recycling and 15% for incineration.\n\nConversely, recycling was the preferred route in Country Q, capturing 48% of waste, closely followed by incineration at 42%, leaving a mere 10% for landfill. Country R presented a more balanced distribution, with recycling at 40%, followed by landfill at 32% and incineration at 28%.",
  "notes": {
    "TA": "Tổng quan và các nhóm số liệu được gom nhóm mạch lạc theo phương thức xử lý chính; làm bật tỉ lệ thấp kỷ lục của bãi rác ở Country Q.",
    "CC": "Chuyển ý tự nhiên: Looking first at..., Conversely, closely followed by..., while.",
    "LR": "Từ vựng chính xác và mang tính chuyên môn cao: predominant disposal method, reliance, deposited, constituted the majority, preferred route, balanced distribution.",
    "GRA": "Đa dạng cấu trúc: cụm phân từ (representing the highest figure..., leaving a mere 10%), so sánh với compared with, và mệnh đề phân tích chính xác."
  }
},
      band6: {
  "words": 153,
  "text": "The bar chart shows how municipal waste was handled in four countries in the year 2022. The waste was sent to landfill, recycled or incinerated.\n\nOverall, landfill was the most common method in Country P and Country S. In contrast, recycling was more popular in Country Q and Country R. Country Q use landfill much less than the other countries.\n\nIn Country S, 70% of waste went to landfill, which was the highest percentage. Only 18% of rubbish was recycled and 12% was incinerated. In Country P, landfill is 55% of the total waste, recycling is 30% and incineration is 15%.\n\nIn Country Q, they recycled 48% of waste and burned 42%, so only 10% was left for landfill. This is the smallest share of landfill in the chart. Country R was more equal, recycling was 40%, landfill 32% and incineration 28%. To sum up, the waste management are different in these countries.",
  "notes": {
    "TA": "Số liệu đúng cho 3 phương pháp ở 4 nước; overview đúng nhưng so sánh còn theo từng nước, ít đối chiếu giữa các nước.",
    "CC": "Chia đoạn hợp lý; từ nối cơ bản (In contrast, so, To sum up); câu kết lặp ý mơ hồ.",
    "LR": "Từ vựng đủ dùng nhưng đơn giản: rubbish, burned, equal, most common; thiếu từ chuyên môn (predominant, disposal).",
    "GRA": "Lỗi điển hình band 6: (1) 'Country Q use' (hòa hợp chủ–vị); (2) lệch thì: 'landfill is 55%'; (3) lỗi nối câu bằng dấu phẩy: 'Country R was more equal, recycling was 40%'; (4) 'the waste management are'."
  }
} },

    { id: 't1-phones', task: 1, ref: 'phones', band: '8.0', words: 187,
      text: `<<Mở bài>> The bar chart [[illustrates the rate of smartphone ownership|minh họa tỉ lệ sở hữu điện thoại thông minh]] among four age groups in one country in 2013 and 2023.

<<Tổng quan>> {{Overall}}, ownership [[rose across all age groups|tăng ở tất cả các nhóm tuổi]] over the decade. {{Although}} younger adults [[remained the most likely to|vẫn là nhóm có khả năng cao nhất]] own a smartphone, [[the gap between the generations|khoảng cách giữa các thế hệ]] [[narrowed considerably|thu hẹp đáng kể]].

<<Thân bài 1>> In 2013, 78% of people aged 18 to 29 owned a smartphone, [[considerably higher than|cao hơn đáng kể so với]] the figure for the 30–49 group, at 64%. The proportion was lower again for those aged 50 to 64, at 42%, and only 18% of people aged 65 and over had one. Ten years later, ownership among the two youngest groups [[had reached near-saturation levels|đã đạt mức gần bão hòa]], at 97% and 95% [[respectively|lần lượt]].

<<Thân bài 2>> [[The most dramatic growth|Mức tăng mạnh mẽ nhất]] was seen among older people. Ownership in the 50–64 age group [[doubled|tăng gấp đôi]] from 42% to 84%, {{while}} the proportion of over-65s [[more than tripled|tăng hơn gấp ba]], [[climbing from|tăng từ]] 18% to 61%. {{As a result}}, [[well over half of|hơn hẳn một nửa]] the oldest group owned a smartphone by 2023, {{compared with}} [[fewer than one in five|chưa đến một phần năm]] a decade earlier. {{Nevertheless}}, this group [[still lagged well behind|vẫn tụt lại khá xa so với]] the youngest adults, [[among whom ownership was almost universal|nhóm mà gần như ai cũng sở hữu]].`,
      band7: {
  "words": 159,
  "text": "The bar chart illustrates the rates of smartphone ownership across four age groups in one country in 2013 and 2023.\n\nOverall, ownership rose in every age group over the ten-year period. Although younger adults consistently maintained the highest rates, the generational gap narrowed considerably by 2023 as older people caught up.\n\nIn 2013, smartphone adoption was led by 18-to-29-year-olds at 78%, followed by the 30–49 bracket at 64%. By contrast, figures for older groups were noticeably lower, standing at 42% for those aged 50–64 and a modest 18% among people aged 65 and above.\n\nA decade later, ownership among the two younger groups approached saturation, at 97% and 95% respectively. The most remarkable progression, however, occurred in older people. The 50–64 bracket doubled to 84%, while ownership among the over-65s more than tripled to 61%, which meant that well over half of the oldest group now owned a smartphone, compared with fewer than one in five a decade earlier.",
  "notes": {
    "TA": "Số liệu khớp đề (78/64/42/18 → 97/95/84/61); nêu rõ khoảng cách thế hệ thu hẹp và mức tăng mạnh nhất ở nhóm lớn tuổi (50–64 gấp đôi, 65+ hơn gấp ba).",
    "CC": "Liên kết mượt: Although..., By contrast, A decade later, ..., however, while.",
    "LR": "Từ vựng phong phú: adoption, bracket, generational gap, approached saturation, remarkable progression, more than tripled.",
    "GRA": "Dùng mệnh đề nhượng bộ (Although...), mệnh đề quan hệ mở rộng (which meant that...) và cụm phân từ (followed by...); còn lỗi giới từ nhỏ ('occurred in older people' thay vì 'among')."
  }
},
      band6: {
  "words": 158,
  "text": "The bar chart shows the percentage of people who owned a smartphone in four age groups in one country in 2013 and 2023.\n\nOverall, smartphone ownership increased in all four age groups over the ten years. Younger people always had higher rates of ownership than older people, but the older groups had the fastest growth.\n\nIn 2013, 78% of people aged 18 to 29 owned a smartphone, compared to 64% in the 30-49 group. The percentage was lower for those aged 50 to 64, at 42%, and only 18% of people aged 65 and over has a smartphone.\n\nIn 2023, ownership in the two younger groups reached 97% and 95%, so almost everyone in these groups had a smartphone. The rate for people aged 50 to 64 increased to 84%, and the rate for the oldest group increase to 61%, which is more than three times higher than in 2013. These two groups increased more than the others.",
  "notes": {
    "TA": "Số liệu đúng và đủ (78/64/42/18 → 97/95/84/61), có overview; so sánh khoảng cách thế hệ còn sơ lược, chỉ nói older groups growth nhanh nhất.",
    "CC": "Bố cục 4 đoạn rõ ràng nhưng từ nối cơ bản (but, so, compared to); các câu thiếu liên kết chặt giữa hai năm.",
    "LR": "Từ vựng đủ dùng nhưng lặp: increased/increase nhiều lần, rate, group; thiếu từ thay thế như rose/climbed/doubled.",
    "GRA": "Lỗi điển hình band 6: (1) hòa hợp chủ–vị sai: '18% of people ... has a smartphone'; (2) sai dạng động từ: 'the rate for the oldest group increase to 61%'; câu cấu trúc lặp 'the rate for ... increased to'."
  }
} },

    { id: 't1-travel', task: 1, ref: 'travel', band: '8.0', words: 185,
      text: `<<Mở bài>> The bar chart [[compares the average weekly distance|so sánh quãng đường trung bình mỗi tuần]] that people in one country travelled by car, train, bus and bicycle in 2000 and 2020.

<<Tổng quan>> {{Overall}}, the car was [[by far the most popular means of transport|là phương tiện phổ biến nhất với khoảng cách lớn]] in both years, {{although}} its use [[declined noticeably|giảm đáng kể]]. {{Meanwhile}}, train travel and cycling [[gained in popularity|ngày càng được ưa chuộng]], {{whereas}} the distance covered by bus fell.

<<Thân bài 1>> In 2000, the average person travelled 140 kilometres a week by car, [[four times the figure for|gấp bốn lần con số của]] the train, at 35 kilometres. By 2020, car travel [[had dropped to|đã giảm xuống]] 118 kilometres, {{yet}} it [[still dwarfed|vẫn lớn hơn rất nhiều so với]] every other mode. Train travel, {{on the other hand}}, [[rose significantly|tăng đáng kể]] to 52 kilometres, [[consolidating its position as|củng cố vị trí là]] the second most common option.

<<Thân bài 2>> [[Turning to|Xét đến]] the remaining modes, the distance travelled by bus [[fell from|giảm từ]] 28 to 20 kilometres, so that it [[lagged further behind|tụt lại xa hơn]] the train. Cycling, {{by contrast}}, [[saw the most dramatic relative increase|có mức tăng tương đối mạnh nhất]]: {{although}} it [[remained the least used mode|vẫn là phương tiện ít được dùng nhất]], the figure [[more than doubled|tăng hơn gấp đôi]], from 6 to 15 kilometres per week. {{Consequently}}, by 2020 people [[covered more than twice as many kilometres by|đi quãng đường dài gấp hơn hai lần bằng]] train as by bus.`,
      band7: {
  "words": 157,
  "text": "The bar chart illustrates the average distance travelled per person each week by four modes of transport in one country in 2000 and 2020.\n\nOverall, the car accounted for by far the greatest distance in both years, although its use declined. While train travel and cycling became more popular, the distance covered by bus fell.\n\nCar travel dominated throughout, but the average weekly distance dropped from 140 km in 2000 to 118 km in 2020, a figure that still exceeded the combined distance of the other three modes. Meanwhile, bus travel witnessed a noticeable decline, falling from 28 km to 20 km per person over the same period.\n\nIn contrast to buses, trains gained popularity, as the average distance rose from 35 km to 52 km, widening its lead over bus usage by 2020. Lastly, although cycling remained the least used mode, the weekly distance covered by bicycle more than doubled, from 6 km to 15 km.",
  "notes": {
    "TA": "Số liệu khớp đề (car 140→118, train 35→52, bus 28→20, bicycle 6→15); overview nêu đúng: car giảm nhưng vẫn dẫn đầu, train và bicycle tăng, bus giảm.",
    "CC": "Từ nối đa dạng: While, but, Meanwhile, In contrast to buses, as, Lastly, although.",
    "LR": "Từ vựng xu hướng tự nhiên: accounted for, dominated, witnessed a noticeable decline, gained popularity, widening its lead, more than doubled.",
    "GRA": "Câu phức đa dạng: mệnh đề quan hệ (a figure that still exceeded...), mệnh đề nhượng bộ (although...), cụm phân từ (falling from...)."
  }
},
      band6: {
  "words": 156,
  "text": "The bar chart shows the average weekly distance travelled per person by car, train, bus and bicycle in one country in 2000 and 2020.\n\nOverall, the car was the most popular mode of transport in both years, although it decreased. Train and bicycle travel increased, but bus travel went down.\n\nIn 2000, people travelled 140 kilometres per week by car. This fell to 118 kilometres in 2020, but it was still much higher than the other modes of transport. The distance travelled by bus also decreased, from 28 kilometres in 2000 to 20 kilometres in 2020.\n\nTrain travel increased from 35 kilometres to 52 kilometres, so it was far more popular than bus in 2020. Bicycle was the least used transport in both years, but the distance grow from 6 kilometres to 15 kilometres, which is more than double. In conclusion, car is still the main transport but other kinds of transport are become more important.",
  "notes": {
    "TA": "Số liệu đúng, overview đúng (car giảm nhưng dẫn đầu; train, bicycle tăng; bus giảm); thiếu so sánh định lượng (vd. car gấp mấy lần train).",
    "CC": "Bố cục rõ, nhưng nối câu đơn giản (but, so) và đoạn kết 'In conclusion' lặp lại overview.",
    "LR": "Từ vựng cơ bản, lặp: decreased/went down, increased, travel; dùng 'transport' như danh từ đếm được không chính xác ('the least used transport', 'the main transport').",
    "GRA": "Lỗi điển hình band 6: (1) 'the distance grow' (chia động từ); (2) 'are become' (sai cấu trúc); (3) thiếu mạo từ: 'Bicycle was...', 'car is still...'."
  }
} },

    { id: 't1-power', task: 1, ref: 'power', band: '8.0', words: 192,
      text: `<<Mở bài>> The two pie charts [[illustrate the breakdown of|minh họa cơ cấu]] electricity generation [[by source|theo nguồn]] in one country in 2000 and 2020.

<<Tổng quan>> {{Overall}}, coal [[lost its position as|mất vị trí là]] the main source of electricity, {{while}} wind and solar power [[expanded dramatically|mở rộng mạnh mẽ]]. By 2020, natural gas [[had become the largest single source|đã trở thành nguồn đơn lẻ lớn nhất]], {{although}} [[no source accounted for|không nguồn nào chiếm]] more than a third of the total.

<<Thân bài 1>> In 2000, coal [[made up almost half of|chiếm gần một nửa]] all electricity, at 48%, [[nearly twice the share of|gần gấp đôi tỉ trọng của]] natural gas (25%). Twenty years later, {{however}}, its contribution [[had more than halved|đã giảm hơn một nửa]] to 22%. {{At the same time}}, natural gas [[grew moderately|tăng vừa phải]] to 30%, [[overtaking|vượt qua]] coal as the leading source. {{Thus}}, the two fossil fuels [[together accounted for|cộng lại chiếm]] just over half of all electricity in 2020, {{compared with}} almost three quarters twenty years earlier.

<<Thân bài 2>> [[The most striking change|Thay đổi nổi bật nhất]] was in renewable energy. Wind and solar [[accounted for a mere|chỉ chiếm vỏn vẹn]] 4% in 2000, {{but}} this figure [[rose more than sixfold|tăng hơn sáu lần]] to 25%, exactly a quarter of the total. {{By contrast}}, the shares of the other two sources [[remained virtually unchanged|gần như không đổi]]: nuclear power [[dipped marginally|giảm nhẹ]] from 15% to 14%, {{while}} hydroelectricity [[edged up|nhích lên]] from 8% to 9%.`,
      band7: {
  "words": 177,
  "text": "The two pie charts illustrate the proportions of electricity generated from five sources in one country in 2000 and 2020.\n\nOverall, coal lost its dominant position, whereas wind and solar power expanded dramatically. By 2020, natural gas had become the largest single source of electricity.\n\nIn 2000, coal generated nearly half of the country's electricity, at 48%, followed by natural gas at 25% and nuclear energy with 15%. Hydroelectric power contributed 8%, while wind and solar combined supplied a mere 4%, which made them the smallest contributors in the national supply.\n\nOver the following two decades, the share of coal more than halved, to 22%. Natural gas rose moderately to 30%, overtaking coal as the leading source. The most striking change concerned wind and solar power, which climbed more than sixfold to 25%. By contrast, nuclear power dipped slightly to 14%, and hydropower edged up to 9%, so that these two sources accounted for broadly the same share as before. As a result, fossil fuels together fell from almost three quarters of output to just over half.",
  "notes": {
    "TA": "Số liệu khớp đề (coal 48→22, gas 25→30, nuclear 15→14, hydro 8→9, wind & solar 4→25); overview nêu đúng việc gas vượt coal và wind & solar tăng vọt.",
    "CC": "Liên kết rõ: whereas, followed by, Over the following two decades, By contrast, while.",
    "LR": "Từ vựng chính xác: dominant position, generated, contributed, more than halved, overtaking, climbed more than sixfold, edged up.",
    "GRA": "Dùng mệnh đề quan hệ (which climbed...), cụm phân từ (followed by..., overtaking...) và so sánh bội số (more than sixfold); còn vài lỗi giới từ nhỏ ('nuclear energy with 15%', 'contributors in the national supply') nên chưa tới band 8."
  }
},
      band6: {
  "words": 154,
  "text": "The two pie charts show the percentage of electricity produced by different sources in a country in 2000 and 2020.\n\nOverall, coal was the biggest source in 2000, but in 2020 gas was the biggest. Wind and solar power also grew a lot during the twenty years.\n\nIn 2000, coal produced 48% of electricity, which was nearly half of the total. Gas was the second at 25%, and nuclear produced 15%. Hydro made up 8% and wind and solar was only 4%, so these was the smallest sources at that time.\n\nIn 2020, the percentage of coal decreased to 22%. Gas increased to 30%, so it become the largest source. Wind and solar had the biggest change, they rose from 4% to 25%. Nuclear and hydro did not change much, being 14% and 9%. In total, coal and gas made up 52% of the electricity in 2020, and in 2000 they made up 73%.",
  "notes": {
    "TA": "Số liệu đúng cho cả năm nguồn và hai năm; overview nêu đúng gas vượt coal, nhưng chưa nhấn mạnh mức tăng gấp hơn sáu lần của wind & solar.",
    "CC": "Bố cục 2 thân bài theo năm; từ nối cơ bản (but, so, Overall); câu 'they rose' nối bằng dấu phẩy gây đứt mạch.",
    "LR": "Từ vựng lặp và chung chung: biggest (3 lần), produced, grew a lot, did not change much.",
    "GRA": "Lỗi điển hình band 6: (1) 'it become' (sai chia động từ); (2) lỗi nối câu bằng dấu phẩy: 'Wind and solar had the biggest change, they rose...'; (3) 'these was the smallest sources' (hòa hợp chủ–vị)."
  }
} },

    { id: 't1-coffee', task: 1, ref: 'coffee', band: '8.0', words: 197,
      text: `<<Mở bài>> The table [[provides information about|cung cấp thông tin về]] [[per capita coffee consumption|lượng tiêu thụ cà phê bình quân đầu người]] in five countries in 2000, 2010 and 2020.

<<Tổng quan>> {{Overall}}, Country A [[consumed by far the most coffee|tiêu thụ nhiều cà phê nhất với khoảng cách lớn]] per person in all three years. Consumption grew in most countries, [[most notably|đáng chú ý nhất là]] in Country D and Country E, {{whereas}} Country C was the only one to [[experience a continuous decline|giảm liên tục]].

<<Thân bài 1>> In 2000, the average person in Country A drank 9.8 kilograms of coffee, [[more than double the figure for|hơn gấp đôi con số của]] Country B, at 4.5 kilograms. Consumption in Country A [[rose slightly|tăng nhẹ]] to 10.4 kilograms in 2010 {{before}} [[falling back marginally|giảm nhẹ trở lại]] to 10.1 kilograms. Country B, {{meanwhile}}, [[saw steady growth|tăng trưởng đều đặn]], reaching 6.9 kilograms by 2020. {{In contrast}}, the figure for Country C [[fell continuously|giảm liên tục]], from 6.2 to 5.1 kilograms, [[falling behind|bị tụt lại sau]] Country B by the end of the period.

<<Thân bài 2>> The lowest levels of consumption were found in Country D and Country E, {{but}} these countries [[recorded the fastest growth|ghi nhận mức tăng nhanh nhất]]. In Country D, the amount [[more than tripled|tăng hơn gấp ba]], from 1.2 to 3.8 kilograms, {{while}} in Country E it [[increased more than fourfold|tăng hơn bốn lần]], from just 0.4 to 1.7 kilograms. {{Nevertheless}}, even after this growth, both still consumed [[considerably less than|ít hơn đáng kể so với]] the other three nations.`,
      band7: {
  "words": 160,
  "text": "The table provides data on per capita coffee consumption, measured in kilograms, in five countries in 2000, 2010 and 2020.\n\nOverall, Country A consumed the most coffee per person in all three years by a wide margin. Consumption rose in four of the five countries, with Country C the sole exception, as its figure declined throughout the period.\n\nCitizens of Country A drank 9.8 kg in 2000, after which intake climbed to 10.4 kg in 2010 before falling back slightly to 10.1 kg in 2020. Country B saw steady growth, from 4.5 kg to 6.9 kg, and so overtook Country C, whose consumption fell from 6.2 kg to 5.1 kg.\n\nAmong the lowest consumers, Country D and Country E recorded the fastest growth. Consumption in Country D more than tripled, from 1.2 kg to 3.8 kg, while Country E's figure rose more than fourfold, from just 0.4 kg to 1.7 kg, although both remained well below the other three nations.",
  "notes": {
    "TA": "Số liệu 2000 và 2020 khớp đề (A 9.8→10.1 qua đỉnh 10.4; B 4.5→6.9; C 6.2→5.1; D 1.2→3.8; E 0.4→1.7); chỉ ra C là nước duy nhất giảm liên tục và B vượt C vào 2020.",
    "CC": "Liên kết tốt: with Country C the sole exception, after which, before, and so, whose, Among the lowest consumers, while.",
    "LR": "Từ vựng học thuật: per capita, by a wide margin, sole exception, intake, more than tripled, more than fourfold.",
    "GRA": "Dùng mệnh đề quan hệ (after which..., whose consumption...), mệnh đề nhượng bộ (although...), cụm phân từ (measured in kilograms) và cụm V-ing sau giới từ (before falling back slightly)."
  }
},
      band6: {
  "words": 155,
  "text": "The table compares how much coffee was drunk per person in five countries in 2000, 2010 and 2020.\n\nOverall, Country A had the highest consumption in all three years. Coffee consumption increased in most countries, but Country C was the only country that went down.\n\nIn 2000, people in Country A drank 9.8 kg of coffee, then it went up to 10.4 kg in 2010 and went down a little to 10.1 kg in 2020. Country B increase steadily from 4.5 kg to 6.9 kg. In Country C, the consumption fell from 6.2 kg to 5.9 kg and then 5.1 kg, so Country B was higher than Country C in 2020.\n\nCountry D and Country E had the lowest figures. Country D rose from 1.2 kg to 3.8 kg, and Country E rose from 0.4 kg to 1.7 kg. These two countries had the fastest growth but they are still much lower than the others.",
  "notes": {
    "TA": "Số liệu đúng cả 5 nước, 3 mốc; overview đúng (A cao nhất, C duy nhất giảm); còn liệt kê, ít so sánh định lượng (vd. D tăng hơn gấp ba).",
    "CC": "Chia đoạn hợp lý; từ nối cơ bản (but, then, so); chuyển ý cơ học.",
    "LR": "Từ vựng hạn chế và lặp: went up/went down, rose, figures; chưa có từ như per capita, intake.",
    "GRA": "Lỗi điển hình band 6: (1) 'Country B increase' (thiếu -s); (2) lỗi nối câu bằng dấu phẩy: 'drank 9.8 kg of coffee, then it went up'; (3) lệch thì: 'they are still much lower'."
  }
} },

    { id: 't1-metro', task: 1, ref: 'metro', band: '8.0', words: 197,
      text: `<<Mở bài>> The table [[compares|so sánh]] the underground railway systems in five cities [[in terms of|xét về]] the year they opened, [[the total length of their routes|tổng chiều dài tuyến]] and [[the number of passengers they carry annually|số lượng hành khách vận chuyển mỗi năm]].

<<Tổng quan>> {{Overall}}, the oldest network, in Northport, is [[by far the longest and busiest|dài nhất và đông khách nhất với khoảng cách lớn]], {{whereas}} the most recent one, in Sunhill, is the smallest [[on every measure|trên mọi tiêu chí]]. {{In general}}, [[there is a clear link between|có mối liên hệ rõ ràng giữa]] route length and passenger numbers.

<<Thân bài 1>> Northport's underground opened in 1902 and has 410 kilometres of routes, [[more than twice the length of|dài hơn gấp đôi]] the second-largest system, in Riverton. It carries 1,950 million passengers a year, [[well over double|hơn gấp đôi khá nhiều]] Riverton's figure of 890 million. The Riverton network, which [[dates back to|có từ]] 1935, covers 185 kilometres.

<<Thân bài 2>> The remaining three systems are [[considerably smaller|nhỏ hơn đáng kể]]. Eastvale's network, opened in 1999, is 96 kilometres long and serves 610 million passengers annually, {{while}} Lakeside's older system, which began operating in 1968, has only 64 kilometres of track and carries 320 million people, [[roughly half as many as|khoảng một nửa so với]] Eastvale. {{Finally}}, Sunhill's underground, [[the most recent addition|công trình mới nhất]], opened in 2012 and [[consists of just|chỉ gồm]] 27 kilometres of routes, carrying 140 million passengers a year, [[less than a tenth of|chưa bằng một phần mười]] Northport's total.`,
      band7: {
  "words": 153,
  "text": "The table compares five underground railway systems in terms of their year of opening, total route length and annual passenger numbers.\n\nOverall, the oldest network, in Northport, is by far the longest and busiest, whereas the newest, in Sunhill, is the smallest on every measure. The ranking by route length matches the ranking by passenger numbers exactly.\n\nNorthport's system, which opened in 1902, extends for 410 kilometres, more than twice the length of the second-largest network, in Riverton, and carries 1,950 million passengers a year, well over double Riverton's 890 million. Riverton opened in 1935 and covers 185 kilometres.\n\nOf the remaining three, Eastvale (opened in 1999) has 96 kilometres of routes and serves 610 million passengers, nearly twice the 320 million of Lakeside, whose 64-kilometre network dates from 1968. Finally, Sunhill, opened in 2012, spans only 27 kilometres and handles just 140 million passengers annually, less than a tenth of Northport's total.",
  "notes": {
    "TA": "Dùng đúng 5 thành phố và số liệu của đề (Northport 1902/410/1,950 ... Sunhill 2012/27/140); overview nêu cực trị và tương quan giữa chiều dài tuyến và lượng khách.",
    "CC": "Liên kết tốt: whereas, which opened in..., Of the remaining three, whose, Finally.",
    "LR": "Từ vựng học thuật: in terms of, extends for, spans, handles, well over double, the second-largest network.",
    "GRA": "Dùng mệnh đề quan hệ (which opened..., whose 64-kilometre network...), cụm so sánh bội số (more than twice, nearly twice) và câu phức chính xác."
  }
},
      band6: {
  "words": 155,
  "text": "The table gives information about the underground railway systems in five cities, including the year they opened, the length of routes and the number of passengers per year.\n\nOverall, Northport has the oldest system and it is the longest and busiest. Sunhill is the newest and it have the smallest route and the fewest passengers of all the cities in the table.\n\nNorthport opened in 1902 and have 410 kilometres of routes, carrying 1,950 million passengers each year. This is much more than Riverton, which opened in 1935 and has 185 kilometres and 890 million passengers.\n\nEastvale opened in 1999 and has 96 kilometres with 610 million passengers. Lakeside opened earlier, in 1968, but it only has 64 kilometres and carry 320 million passengers. Finally Sunhill opened in 2012 and it has only 27 kilometres and 140 million passengers a year. We can see that the longer the system is, the more passengers it carries.",
  "notes": {
    "TA": "Đủ 5 thành phố và 3 tiêu chí, số liệu đúng; overview nêu Northport lớn nhất, Sunhill nhỏ nhất và mối liên hệ; còn ít so sánh định lượng (gấp bao nhiêu lần).",
    "CC": "Bố cục rõ; từ nối đơn giản (but, Finally) và lặp công thức 'opened in... and has...'; 'We can see that' không phù hợp văn phong báo cáo.",
    "LR": "Từ vựng đủ dùng nhưng lặp: has, passengers, kilometres; ít cách diễn đạt thay thế.",
    "GRA": "Lỗi điển hình band 6: (1) 'Northport ... have' và 'it have' (sai chia động từ); (2) 'it ... carry' sai chia động từ; cấu trúc câu lặp 'opened in... and has...'."
  }
} },

    { id: 't1-salmon', task: 1, ref: 'salmon', band: '8.0', words: 186,
      text: `<<Mở bài>> The diagram [[illustrates the various stages in|minh họa các giai đoạn trong]] [[the life cycle of|vòng đời của]] the salmon, from the laying of eggs to the return of adult fish to their birthplace.

<<Tổng quan>> {{Overall}}, there are seven [[distinct stages|giai đoạn riêng biệt]], [[some of which take place in fresh water|một số diễn ra ở nước ngọt]] and others in the ocean. The process [[forms a continuous cycle|tạo thành một vòng tuần hoàn liên tục]], [[beginning and ending|bắt đầu và kết thúc]] in the upper reaches of a river.

<<Thân bài 1>> {{First}}, adult salmon [[lay their eggs|đẻ trứng]] [[among the gravel|giữa lớp sỏi]] of the upper river. {{After}} about 6 weeks, these eggs [[hatch into|nở thành]] tiny young fish [[known as|được gọi là]] alevins. {{As}} the alevins grow, they [[develop into|phát triển thành]] fry and move to calmer water, where they [[gradually mature|dần dần lớn lên]] over a period of 1 to 4 years {{until}} they become smolts.

<<Thân bài 2>> {{At this point}}, the smolts [[make their way downstream|di chuyển xuôi dòng]] to the sea. They then spend between 1 and 3 years in the ocean, where they [[reach adulthood|trưởng thành]]. {{Finally}}, the mature adults [[swim back upstream|bơi ngược dòng trở lại]] to the upper river [[in order to|để]] spawn, {{and}} the eggs they lay there mark [[the start of a new cycle|sự khởi đầu của một chu trình mới]]. {{In this way}}, each generation [[returns to the place where it was born|quay về nơi nó được sinh ra]].`,
      band7: {
  "words": 153,
  "text": "The diagram illustrates the sequential stages in the natural life cycle of the salmon, spanning its journey between freshwater rivers and the open ocean.\n\nOverall, the cycle comprises seven distinct stages, progressing from eggs laid in the riverbed, through maturation in marine waters, and culminating in the adult fish returning to their spawning grounds.\n\nThe cycle commences when adult salmon deposit their eggs amongst gravel in the upper reaches of a river. Approximately six weeks later, these eggs hatch into alevins. As they grow, they transition into fry and migrate to calmer water, and over the following one to four years they mature before transforming into smolts.\n\nAt this stage, the smolts migrate downstream towards the ocean, where they spend between one and three years growing into full adulthood. Ultimately, the mature salmon undertake an upstream journey back to the upper river to spawn, thereby initiating the cycle anew for the next generation.",
  "notes": {
    "TA": "Miêu tả đầy đủ từng giai đoạn kèm khung thời gian (6 tuần, 1–4 năm, 1–3 năm), làm bật vòng lặp tuần hoàn.",
    "CC": "Từ nối thật trong bài: The cycle commences when, Approximately six weeks later, As they grow..., where, before, At this stage, Ultimately, thereby.",
    "LR": "Từ vựng sinh học học thuật: comprises, spawning grounds, deposit, upper reaches, transition, migrate, upstream journey, initiating the cycle anew.",
    "GRA": "Dùng mệnh đề trạng ngữ thời gian, mệnh đề quan hệ (where they mature...) và cụm phân từ (progressing..., culminating in..., thereby initiating...)."
  }
},
      band6: {
  "words": 151,
  "text": "The diagram shows the different stages in the life cycle of a salmon, from laying eggs to adult fish.\n\nOverall, the life cycle have seven stages. It starts in the fresh water of a river, then the fish move to the ocean to grow, and finally they return to the river to lay eggs.\n\nFirst, adult salmon lay many eggs in the gravel in upper river. After around 6 weeks, the eggs hatch and become very small fish called alevins. These small fish grow bigger and become fry, and they move to slower water where they live for 1 to 4 years until they turn into smolts.\n\nNext, the smolts swim downstream to the ocean. In the ocean they spend between 1 and 3 years to feeding and growing into adult salmon. Finally, the adult fish swim back upstream to the upper river to lay eggs and the cycle begins again.",
  "notes": {
    "TA": "Đủ các giai đoạn và mốc thời gian (6 tuần, 1–4 năm, 1–3 năm), nêu được thay đổi môi trường sông – biển – sông.",
    "CC": "Theo trình tự thời gian với First, After, Next, Finally và and/until/where; cơ học nhưng rõ.",
    "LR": "Từ vựng quy trình cơ bản, lặp: small fish, grow bigger, swim; chưa dùng spawn, migrate.",
    "GRA": "Lỗi điển hình band 6: (1) 'the life cycle have'; (2) thiếu mạo từ 'in upper river'; (3) 'to feeding' (sai dạng động từ sau to)."
  }
} },

    { id: 't1-tea', task: 1, ref: 'tea', band: '8.0', words: 178,
      text: `<<Mở bài>> The diagram [[illustrates the process by which|minh họa quy trình mà qua đó]] black tea [[is manufactured|được sản xuất]], from the picking of fresh leaves on the plantation to the delivery of the finished product.

<<Tổng quan>> {{Overall}}, the production of black tea [[involves seven main stages|gồm bảy giai đoạn chính]], [[starting with|bắt đầu bằng]] the harvesting of fresh leaves and [[culminating in|kết thúc bằng]] the packing and shipping of the tea. {{Unlike}} a natural cycle, it is [[a linear process|một quy trình tuyến tính]].

<<Thân bài 1>> {{Initially}}, fresh tea leaves [[are picked by hand|được hái bằng tay]]. {{After that}}, they [[are spread out on racks|được trải ra trên giàn]] and [[left to wither|để cho héo]] for 12 to 18 hours. The withered leaves [[are then rolled|sau đó được vò]] [[in order to|để]] release their juices, {{and}} they are subsequently [[left to oxidise|để lên men (oxy hóa)]] for a further 2 to 4 hours, [[during which they are simply left to stand|trong thời gian đó lá chỉ được để yên]].

<<Thân bài 2>> {{Once}} oxidation [[is complete|hoàn tất]], the leaves [[are dried using hot air|được sấy bằng khí nóng]] at a temperature of 120°C. {{Next}}, the dried tea [[is sorted and graded according to|được phân loại và xếp hạng theo]] the size of the leaves, {{so that}} leaves of a similar size are grouped together. {{Finally}}, the tea [[is packed|được đóng gói]] and shipped to buyers, [[ready to be sold|sẵn sàng để bán]] to consumers.`,
      band7: {
  "words": 158,
  "text": "The diagram delineates the multi-stage manufacturing process involved in the production of black tea, from the initial harvesting of leaves to the final shipping.\n\nOverall, the manufacture of black tea comprises seven sequential stages, forming a linear process that begins with manual harvesting and concludes with packing and shipping, with no stage repeated.\n\nInitially, fresh leaves are picked by hand. These leaves are subsequently laid out on racks to wither for 12 to 18 hours. Once sufficiently withered, they undergo rolling to release their juices, followed by an oxidation period lasting between 2 and 4 hours, during which the leaves are simply left to oxidise.\n\nFollowing oxidation, the leaves are dried with hot air at a temperature of 120°C. Thereafter, the dried product is sorted and graded according to leaf size. Finally, the processed tea is packed and shipped to buyers, completing the production chain. In total, therefore, the product passes through seven stages before it reaches buyers.",
  "notes": {
    "TA": "Bao quát đủ 7 giai đoạn và thông số kỹ thuật (12–18 giờ, 2–4 giờ, 120°C); làm rõ tính chất tuyến tính.",
    "CC": "Từ nối thật trong bài: Initially, subsequently, Once sufficiently withered, followed by, Following oxidation, Thereafter, Finally.",
    "LR": "Từ vựng trang trọng cho quy trình: delineates, comprises, sequential stages, manual harvesting, undergo rolling, oxidation period, production chain.",
    "GRA": "Thể bị động nhuần nhuyễn, mệnh đề phụ và mệnh đề quan hệ (that begins..., during which...), cụm phân từ (forming..., completing...)."
  }
},
      band6: {
  "words": 156,
  "text": "The diagram illustrates the process of making black tea, from collecting the fresh leaves to shipping the final product to buyers.\n\nOverall, the tea production process consists of seven main stages. It is a linear process that begins with hand-picking the leaves and ends with packing and shipping the tea to buyers. The whole process has no repeated stage.\n\nIn the first step, fresh tea leaves are picked by hand. After that, the leaves are spread on racks to wither for 12 to 18 hours. Then, the withered leaves is rolled to release their juices, and they are left to oxidise for 2 to 4 hours.\n\nOnce oxidation is finished, the tea leaves is dried with hot air at 120 degrees Celsius. Next, the dried tea is sorted and graded in different sizes. Finally, the finished tea is packed and shipped to buyers, ready to be sold. Each step follows directly from the one before it.",
  "notes": {
    "TA": "Đủ 7 bước và thông số (12–18 giờ, 2–4 giờ, 120°C); overview nêu được quy trình tuyến tính.",
    "CC": "Tuần tự bằng In the first step, After that, Then, Once, Next, Finally; cơ học.",
    "LR": "Từ vựng đủ dùng: withered, oxidise, dried, packed; còn đơn giản, lặp cấu trúc bị động.",
    "GRA": "Lỗi điển hình band 6: (1) 'the withered leaves is rolled' và (2) 'the tea leaves is dried' sai hòa hợp chủ–vị; (3) sai giới từ 'graded in different sizes'; câu ngắn, mẫu lặp."
  }
} },

    { id: 't1-island', task: 1, ref: 'island', band: '8.0', words: 190,
      text: `<<Mở bài>> The maps [[illustrate how|minh họa cách]] a small island [[was transformed|được biến đổi]] [[following the construction of|sau khi xây dựng]] a tourist resort.

<<Tổng quan>> {{Overall}}, the island [[changed from a quiet fishing and farming area into|chuyển từ một vùng đánh cá và làm nông yên tĩnh thành]] a tourist destination, with [[new accommodation and transport facilities|cơ sở lưu trú và giao thông mới]]. {{However}}, the beach and the main road [[remained unchanged|vẫn giữ nguyên]], and [[part of the forest was preserved|một phần khu rừng được bảo tồn]].

<<Thân bài 1>> {{Before}} the development, the land to the west of the main road, which [[runs from north to south|chạy theo hướng bắc – nam]], was [[largely covered by|phần lớn được bao phủ bởi]] forest, with farmland [[to the south|ở phía nam]]. {{Afterwards}}, the northern section of the forest [[was cleared to make way for|bị phát quang để nhường chỗ cho]] a hotel, {{while}} the remaining woodland was kept in the centre of the western side. The farmland in the south-west [[was replaced by|được thay thế bằng]] a car park.

<<Thân bài 2>> On the eastern side of the island, the beach in the north-east [[was left untouched|được giữ nguyên]]. {{However}}, the fishing huts to its south [[were demolished|bị phá bỏ]] and tourist chalets [[were built in their place|được xây dựng thay thế]]. {{Similarly}}, the jetty in the south-east [[was converted into|được chuyển đổi thành]] a ferry pier, [[presumably to cater for|có lẽ để phục vụ]] the arrival of visitors. {{As a result}}, [[the focus of the island appears to have shifted|trọng tâm của hòn đảo dường như đã chuyển dịch]] from fishing and farming towards tourism.`,
      band7: {
  "words": 154,
  "text": "The two maps illustrate the redevelopment of a small island before and after the construction of a tourist resort.\n\nOverall, the island transitioned from an undeveloped rural area focused on fishing and farming into a modern holiday destination. Although the island was extensively modernised, the beach, the central road, and portions of the original woodland were preserved.\n\nTo the west of the central road, significant alterations occurred. The northern sector of the forest was cleared to accommodate a hotel, while the southern farmland was converted into a car park. The main road, which runs from north to south, was unchanged. The woodland in the central section was retained, providing natural greenery between the new facilities.\n\nOn the eastern side, the north-eastern beach was left untouched. In contrast, the former fishing huts to the south were demolished and replaced with tourist chalets. Furthermore, the existing jetty in the south-east was converted into a ferry pier.",
  "notes": {
    "TA": "Mô tả đúng các thay đổi ở phía tây và phía đông đường chính (khách sạn, bãi đỗ xe, nhà nghỉ, bến phà) và phần giữ nguyên (bãi biển, đường, một phần rừng).",
    "CC": "Định vị và chuyển ý rõ: To the west of..., while, On the eastern side, In contrast, Furthermore.",
    "LR": "Từ vựng bản đồ: redevelopment, transitioned, rural area, woodland, alterations, accommodate, converted into, demolished, replaced with, retained.",
    "GRA": "Dùng thể bị động linh hoạt, mệnh đề nhượng bộ (Although the island was extensively modernised...) và cụm phân từ (providing...)."
  }
},
      band6: {
  "words": 158,
  "text": "The two maps show the changes that took place on a small island before and after a tourist resort was built.\n\nOverall, the island was transformed from an area used for fishing and farming into a tourist resort. However, some features like the beach and the main road remained the same.\n\nBefore the development, the western side of the road had a large forest in the north and farmland in the south. After construction, the northern forest was cut down to build a hotel, while the southern farmland become a car park. Only the middle section of the forest was kept.\n\nOn the eastern side of island, the beach in the north-east was not change. However, the old fishing huts were removed to build tourist chalets. In the south-east, the old jetty was turned into a ferry pier The main road did not change. In general, the island became much more developed after the construction of the resort.",
  "notes": {
    "TA": "Mô tả thay đổi chính ở cả hai phía con đường và phần giữ nguyên (bãi biển, đường chính, một phần rừng).",
    "CC": "Chia đoạn theo phía đông/tây rõ ràng; liên từ cơ bản (However, Before, After construction, while).",
    "LR": "Từ vựng bản đồ cơ bản: cut down, removed, turned into; chưa dùng demolished, converted, preserved.",
    "GRA": "Lỗi điển hình band 6: (1) 'farmland become' (sai thì); (2) thiếu mạo từ 'eastern side of island'; (3) 'was not change' (bị động sai dạng)."
  }
} },
  ]);
})(typeof self !== 'undefined' ? self : this);
