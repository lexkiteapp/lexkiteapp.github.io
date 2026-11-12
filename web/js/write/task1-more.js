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
  "words": 162,
  "text": "The line graph gives information about how many people visited two different resorts, a mountain resort and a beach resort, in every month of 2023.\n\nOverall, both resorts had very different trends throughout the year. The mountain resort was more popular in winter months, while the beach resort had much more tourists in summer time.\n\nIn January, the mountain resort welcomed 42 thousand people and then increased to 45 thousand in February. After that, the number went down quickly to 12 thousand in May, which was the lowest point. In August it increased again to 28 thousand, but decreased to 14 thousand in October, and finally rose to 40 thousand in December.\n\nOn the other hand, the beach resort had only 8 thousand visitors in January. Then the number grew steadily and peaked at 75 thousand in August, which was higher than the mountain resort. After August, the visitors decreased to 20 thousand in October and finished at 9 thousand in December.",
  "notes": {
    "TA": "Báo cáo đầy đủ các mốc chính và số liệu cao nhất/thấp nhất của 2 khu nghỉ dưỡng. Tuy nhiên phần so sánh giữa 2 địa điểm còn đơn giản, chưa làm nổi bật được độ chênh lệch rất lớn vào mùa hè.",
    "CC": "Bố cục 4 đoạn rõ ràng, có overview. Dùng liên từ cơ bản (while, After that, On the other hand, but, and finally); việc nối câu theo trình tự thời gian còn hơi máy móc.",
    "LR": "Từ vựng ở mức vừa đủ: people visited, went down quickly, lowest point, increased again, grew steadily. Thiếu các từ vựng tả xu hướng và biến động mùa đa dạng (fluctuation, sharp drop, seasonal pattern).",
    "GRA": "Cấu trúc ngữ pháp tương đối chính xác nhưng chủ yếu là các câu ghép hoặc câu đơn kết hợp mệnh đề quan hệ cơ bản. Chưa có cấu trúc nâng cao như phân từ hay đảo ngữ."
  }
} },

    { id: 't1-waste', task: 1, ref: 'waste', band: '8.0', words: 167,
      text: `<<Mở bài>> The bar chart [[compares the proportions of|so sánh tỉ lệ]] municipal waste that were [[sent to landfill|đưa đến bãi chôn lấp]], recycled or incinerated in four countries in 2022.

<<Tổng quan>> {{Overall}}, landfill was [[the predominant method of disposal|phương thức xử lý chủ yếu]] in Country P and Country S, {{whereas}} recycling [[accounted for the largest share|chiếm tỉ trọng lớn nhất]] in Country Q and Country R. {{Notably}}, Country Q [[relied far less on|phụ thuộc ít hơn nhiều vào]] landfill than any other nation.

<<Thân bài 1>> In Country S, [[a massive|con số rất lớn là]] 70% of waste ended up in landfill, [[the highest figure on the chart|con số cao nhất trên biểu đồ]], {{while}} only 18% was recycled and 12% was burned in incinerators. The pattern was similar in Country P, where landfill [[made up|chiếm]] 55% of the total, [[just over half|hơn một nửa một chút]], {{compared with}} 30% for recycling and 15% for incineration.

<<Thân bài 2>> {{By contrast}}, Country Q recycled 48% of its waste, [[nearly half|gần một nửa]], and incinerated 42%, [[leaving a mere|chỉ còn lại vỏn vẹn]] 10% for landfill. Country R [[had a more balanced profile|có cơ cấu cân bằng hơn]]: recycling was the most common method, at 40%, {{followed by}} landfill (32%) and incineration (28%). {{In other words}}, Country Q [[burned more than three times as much of its waste as|đốt tỉ lệ rác nhiều gấp hơn ba lần so với]] Country S [[in percentage terms|xét theo tỉ lệ phần trăm]].`,
      band7: {
  "words": 154,
  "text": "The bar chart compares the proportions of municipal waste disposed of through landfill, recycling, and incineration across four countries in 2022.\n\nOverall, landfill remained the predominant disposal method in Countries P and S, whereas recycling accounted for the largest share in Countries Q and R. Notably, Country Q demonstrated the lowest reliance on landfill sites.\n\nLooking first at the nations heavily reliant on landfill, Country S deposited 70% of its total waste into landfill sites, representing the highest figure in the chart. Only 18% was recycled, while 12% was incinerated. In Country P, landfill also constituted the majority at 55%, compared with 30% for recycling and 15% for incineration.\n\nConversely, recycling was the preferred route in Country Q, capturing 48% of waste, closely followed by incineration at 42%, leaving a mere 10% for landfill. Country R presented a more balanced distribution, with recycling at 40%, followed by landfill at 32% and incineration at 28%.",
  "notes": {
    "TA": "Tổng quan và các nhóm số liệu được gom nhóm mạch lạc theo phương thức xử lý chính; làm bật tỉ lệ thấp kỷ lục của bãi rác ở Country Q.",
    "CC": "Chuyển ý tự nhiên và học thuật (Looking first at..., Conversely, presenting a more balanced distribution...).",
    "LR": "Từ vựng chính xác và mang tính chuyên môn cao: predominant disposal method, reliance, deposited, constituted the majority, preferred route, balanced distribution.",
    "GRA": "Cấu trúc ngữ pháp đa dạng, phối hợp nhuần nhuyễn giữa mệnh đề quan hệ rút gọn, cụm phân từ và câu phức so sánh."
  }
},
      band6: {
  "words": 160,
  "text": "The bar chart shows how municipal waste was handled in four different countries in the year 2022. Waste was either sent to landfill, recycled, or incinerated.\n\nOverall, landfill was the most common method in Country P and Country S. In contrast, recycling was more popular in Country Q and Country R. Country Q used landfill much less than the other countries.\n\nIn Country S, 70% of waste went to landfill, which was the highest percentage on the whole chart. Only 18% of rubbish was recycled and 12% was incinerated. Similarly, in Country P, landfill accounted for 55% of the total waste, while recycling took 30% and incineration made up 15%.\n\nOn the other hand, Country Q recycled 48% of its waste and burned 42%, leaving only 10% for landfill. In Country R, the three methods were more equal: recycling was 40%, followed by landfill with 32% and incineration with 28%. In summary, waste management differed significantly between these four nations.",
  "notes": {
    "TA": "Cung cấp đầy đủ các số liệu về 3 phương pháp xử lý chất thải ở 4 quốc gia. Tuy nhiên phần so sánh giữa các quốc gia còn dừng ở việc liệt kê theo từng nước.",
    "CC": "Chia đoạn hợp lý theo 2 nhóm quốc gia. Các từ nối cơ bản (Overall, In contrast, Similarly, On the other hand) được dùng chính xác nhưng còn mang tính công thức.",
    "LR": "Vốn từ vựng tương đối đủ dùng (handled, municipal waste, common method, rubbish, equal). Ít cụm từ chuyên môn sâu về môi trường hoặc cơ cấu chất thải (predominant, disposal, reliance).",
    "GRA": "Ngữ pháp kiểm soát tốt thì quá khứ đơn và số liệu phần trăm. Chưa có nhiều biến đổi linh hoạt về câu bị động và câu phức nâng cao."
  }
} },

    { id: 't1-phones', task: 1, ref: 'phones', band: '8.0', words: 167,
      text: `<<Mở bài>> The bar chart [[illustrates the rate of smartphone ownership|minh họa tỉ lệ sở hữu điện thoại thông minh]] among four age groups in one country in 2013 and 2023.

<<Tổng quan>> {{Overall}}, ownership [[rose across all age groups|tăng ở tất cả các nhóm tuổi]] over the decade. {{Although}} younger adults [[remained the most likely to|vẫn là nhóm có khả năng cao nhất]] own a smartphone, [[the gap between the generations|khoảng cách giữa các thế hệ]] [[narrowed considerably|thu hẹp đáng kể]].

<<Thân bài 1>> In 2013, 78% of people aged 18 to 29 owned a smartphone, [[considerably higher than|cao hơn đáng kể so với]] the figure for the 30–49 group, at 64%. The proportion was lower again for those aged 50 to 64, at 42%, and only 18% of people aged 65 and over had one. Ten years later, ownership among the two youngest groups [[had reached near-saturation levels|đã đạt mức gần bão hòa]], at 97% and 95% [[respectively|lần lượt]].

<<Thân bài 2>> [[The most dramatic growth|Mức tăng mạnh mẽ nhất]] was seen among older people. Ownership in the 50–64 age group [[doubled|tăng gấp đôi]] from 42% to 84%, {{while}} the proportion of over-65s [[more than tripled|tăng hơn gấp ba]], [[climbing from|tăng từ]] 18% to 61%. {{As a result}}, [[well over half of|hơn hẳn một nửa]] the oldest group owned a smartphone by 2023, {{compared with}} [[fewer than one in five|chưa đến một phần năm]] a decade earlier. {{Nevertheless}}, this group [[still lagged well behind|vẫn tụt lại khá xa so với]] the youngest adults, [[among whom ownership was almost universal|nhóm mà gần như ai cũng sở hữu]].`,
      band7: {
  "words": 151,
  "text": "The bar chart illustrates the rates of smartphone ownership across four distinct age demographics in one country in 2013 and 2023.\n\nOverall, ownership experienced substantial growth across all generations over the ten-year period. Although younger cohorts consistently maintained higher adoption rates, the generational divide narrowed considerably by 2023 as older citizens caught up.\n\nIn 2013, smartphone adoption was led by 18-to-29-year-olds at 78%, followed closely by the 30–49 bracket at 64%. By contrast, figures for older citizens were noticeably lower, standing at 42% for those aged 50–64 and a modest 18% among individuals aged 65 and above.\n\nA decade later, ownership among the two younger groups approached near-saturation levels, recording 97% and 95% respectively. The most remarkable progression, however, occurred in the older demographics. The 50–64 age bracket surged to 81%, while adoption among senior citizens more than doubled to 45%, reducing the overall disparity between younger and older generations significantly.",
  "notes": {
    "TA": "Phân tích sắc bén về sự thu hẹp khoảng cách thế hệ (generational divide narrowed); gom nhóm số liệu trẻ tuổi và lớn tuổi rất logic.",
    "CC": "Liên kết câu và đoạn uyển chuyển: By contrast, A decade later, The most remarkable progression, however,...",
    "LR": "Hệ thống từ vựng phong phú: distinct age demographics, substantial growth, cohorts, adoption rates, generational divide, bracket, near-saturation, remarkable progression, senior citizens.",
    "GRA": "Kết hợp linh hoạt các thì và cấu trúc: mệnh đề trạng ngữ nhượng bộ, cụm phân từ (recording..., reducing...), và câu đảo ngữ nhẹ."
  }
},
      band6: {
  "words": 152,
  "text": "The bar chart compares the percentage of people who owned a smartphone across four different age groups in a particular country between 2013 and 2023.\n\nOverall, smartphone ownership increased in all four age categories over the ten-year period. Younger people always had higher rates of ownership, but the older age groups experienced noticeably faster growth.\n\nIn 2013, 78% of people aged 18 to 29 owned a smartphone, compared to 64% in the 30-49 age group. The percentage was considerably lower for people aged 50 to 64, at 42%, and only 18% of those aged 65 and over had one device.\n\nBy 2023, ownership in the two younger groups reached 97% and 95% respectively, showing that almost everyone in these cohorts had a smartphone. At the same time, the rate for people aged 50-64 rose dramatically to 81%. The oldest group saw the biggest relative increase, more than doubling to 45% in 2023.",
  "notes": {
    "TA": "Nêu được xu hướng tăng chung của tất cả các nhóm tuổi và dẫn chứng đầy đủ số liệu 2013 và 2023. So sánh khoảng cách thế hệ ở mức cơ bản.",
    "CC": "Tổ chức bài viết thành 4 đoạn hợp lý: mở bài, tổng quan, số liệu năm 2013, số liệu năm 2023. Sử dụng các từ nối quen thuộc (Overall, but, compared to, By 2023, At the same time).",
    "LR": "Sử dụng từ vựng ở mức đạt yêu cầu: smartphone ownership, age categories, younger people, rose dramatically, biggest increase. Thiếu các cụm từ đắt giá như near-saturation, digital divide.",
    "GRA": "Cấu trúc ngữ pháp chuẩn xác với thì quá khứ đơn và cấu trúc so sánh. Hơi ít cấu trúc phức tạp biểu thị sự thay đổi theo thời gian."
  }
} },

    { id: 't1-travel', task: 1, ref: 'travel', band: '8.0', words: 172,
      text: `<<Mở bài>> The bar chart [[compares the average weekly distance|so sánh quãng đường trung bình mỗi tuần]] that people in one country travelled by car, train, bus and bicycle in 2000 and 2020.

<<Tổng quan>> {{Overall}}, the car was [[by far the most popular means of transport|là phương tiện phổ biến nhất với khoảng cách lớn]] in both years, {{although}} its use [[declined noticeably|giảm đáng kể]]. {{Meanwhile}}, train travel and cycling [[gained in popularity|ngày càng được ưa chuộng]], {{whereas}} the distance covered by bus fell.

<<Thân bài 1>> In 2000, the average person travelled 140 kilometres a week by car, [[four times the figure for|gấp bốn lần con số của]] the train, at 35 kilometres. By 2020, car travel [[had dropped to|đã giảm xuống]] 118 kilometres, {{yet}} it [[still dwarfed|vẫn lớn hơn rất nhiều so với]] every other mode. Train travel, {{on the other hand}}, [[rose significantly|tăng đáng kể]] to 52 kilometres, [[consolidating its position as|củng cố vị trí là]] the second most common option.

<<Thân bài 2>> [[Turning to|Xét đến]] the remaining modes, the distance travelled by bus [[fell from|giảm từ]] 28 to 20 kilometres, so that it [[lagged further behind|tụt lại xa hơn]] the train. Cycling, {{by contrast}}, [[saw the most dramatic relative increase|có mức tăng tương đối mạnh nhất]]: {{although}} it [[remained the least used mode|vẫn là phương tiện ít được dùng nhất]], the figure [[more than doubled|tăng hơn gấp đôi]], from 6 to 15 kilometres per week. {{Consequently}}, by 2020 people [[covered more than twice as many kilometres by|đi quãng đường dài gấp hơn hai lần bằng]] train as by bus.`,
      band7: {
  "words": 152,
  "text": "The bar chart illustrates the average distance travelled per person each week by four different modes of transport in a specific nation in 2000 and 2020.\n\nOverall, passenger cars accounted for the greatest distance by a considerable margin in both surveyed years. While train travel and cycling exhibited an upward trajectory, bus usage experienced a clear downward trend.\n\nPrivate car journeys dominated throughout, with the average weekly distance rising from 120 km in 2000 to 150 km in 2020. Conversely, bus travel witnessed a noticeable decline, dropping from 40 km to 25 km per person weekly over the same period.\n\nIn contrast to buses, trains gained substantial popularity, as the average distance covered nearly doubled from 30 km to 55 km, comfortably surpassing bus usage by 2020. Lastly, although cycling remained by far the least favoured mode of transport, weekly distance covered by bicycle crept up from 5 km to 8 km.",
  "notes": {
    "TA": "Nhấn mạnh được vị thế áp đảo của ô tô (by a considerable margin), sự suy giảm của xe buýt và sự vượt lên rõ rệt của tàu hỏa.",
    "CC": "Mạch lạc và chuyển đổi thông tin mượt mà với While, Conversely, In contrast to buses, Lastly, although...",
    "LR": "Vốn từ miêu tả xu hướng và vận tải rất tự nhiên: passenger cars, upward trajectory, downward trend, private car journeys, witnessed a noticeable decline, gained substantial popularity, surpassing, least favoured, crept up.",
    "GRA": "Cấu trúc ngữ pháp phong phú với mệnh đề trạng từ thời gian, nhượng bộ và mệnh đề quan hệ rút gọn."
  }
},
      band6: {
  "words": 153,
  "text": "The bar chart shows the average weekly distance travelled by people using four modes of transport in a particular country in 2000 and 2020.\n\nOverall, the car was by far the most popular mode of transport in both years. Travelling by train and bicycle increased, while travelling by bus became clearly less popular over the twenty-year period.\n\nIn 2000, people travelled about 120 kilometres per week by car. This number rose steadily to 150 kilometres in 2020, remaining far ahead of any other mode of transport. In contrast, the average distance travelled by bus dropped from 40 kilometres in 2000 to 25 kilometres in 2020.\n\nTrain travel saw an increase from 30 kilometres per week in 2000 to 55 kilometres in 2020, overtaking the bus completely. Finally, the bicycle was the least used transport in both years, but its weekly distance grew slightly from 5 kilometres in 2000 to 8 kilometres in 2020.",
  "notes": {
    "TA": "Cung cấp đầy đủ thông tin về 4 phương tiện giao thông qua 2 năm. Nhận xét được vị trí số 1 của ô tô và sự hoán đổi giữa tàu hỏa và xe buýt.",
    "CC": "Các đoạn văn được bố cục rõ ràng; sử dụng liên từ nối đơn giản (Overall, In contrast, Finally, but) để kết nối các thông tin.",
    "LR": "Từ vựng cơ bản và lặp: travelled, mode of transport, popular, dropped, grew slightly. Cần thêm các từ vựng diễn tả khoảng cách và phương tiện linh hoạt hơn.",
    "GRA": "Cấu trúc ngữ pháp cơ bản, ít lỗi chính tả và ngữ pháp nhưng các mẫu câu có sự lặp lại (travelled about..., rose to..., saw an increase from... to...)."
  }
} },

    { id: 't1-power', task: 1, ref: 'power', band: '8.0', words: 176,
      text: `<<Mở bài>> The two pie charts [[illustrate the breakdown of|minh họa cơ cấu]] electricity generation [[by source|theo nguồn]] in one country in 2000 and 2020.

<<Tổng quan>> {{Overall}}, coal [[lost its position as|mất vị trí là]] the main source of electricity, {{while}} wind and solar power [[expanded dramatically|mở rộng mạnh mẽ]]. By 2020, natural gas [[had become the largest single source|đã trở thành nguồn đơn lẻ lớn nhất]], {{although}} [[no source accounted for|không nguồn nào chiếm]] more than a third of the total.

<<Thân bài 1>> In 2000, coal [[made up almost half of|chiếm gần một nửa]] all electricity, at 48%, [[nearly twice the share of|gần gấp đôi tỉ trọng của]] natural gas (25%). Twenty years later, {{however}}, its contribution [[had more than halved|đã giảm hơn một nửa]] to 22%. {{At the same time}}, natural gas [[grew moderately|tăng vừa phải]] to 30%, [[overtaking|vượt qua]] coal as the leading source. {{Thus}}, the two fossil fuels [[together accounted for|cộng lại chiếm]] just over half of all electricity in 2020, {{compared with}} almost three quarters twenty years earlier.

<<Thân bài 2>> [[The most striking change|Thay đổi nổi bật nhất]] was in renewable energy. Wind and solar [[accounted for a mere|chỉ chiếm vỏn vẹn]] 4% in 2000, {{but}} this figure [[rose more than sixfold|tăng hơn sáu lần]] to 25%, exactly a quarter of the total. {{By contrast}}, the shares of the other two sources [[remained virtually unchanged|gần như không đổi]]: nuclear power [[dipped marginally|giảm nhẹ]] from 15% to 14%, {{while}} hydroelectricity [[edged up|nhích lên]] from 8% to 9%.`,
      band7: {
  "words": 151,
  "text": "The two pie charts delineate the breakdown of electricity generation by fuel source in a given country between 2000 and 2020.\n\nOverall, the energy landscape underwent a major transition, with coal relinquishing its dominant position to green energy. Wind and solar power emerged as the primary source of power generation by 2020.\n\nIn 2000, coal generated nearly half of the country's electricity at 45%, followed by natural gas at 25% and nuclear energy at 20%. In stark comparison, wind and solar combined made up a negligible 5%, identical to the share contributed by other renewable sources.\n\nOver the following two decades, coal output plummeted by thirty percentage points to 15%. Conversely, wind and solar power expanded sevenfold to capture 35% of the total, becoming the leading electricity provider. Natural gas experienced a moderate rise to 28%, whereas nuclear power contracted to 14%, and other renewables saw a modest increase to 8%.",
  "notes": {
    "TA": "Khắc họa rõ nét sự chuyển dịch năng lượng (energy landscape transition), phân tích chuẩn xác mức tăng giảm của từng nguồn nhiên liệu.",
    "CC": "Dẫn dắt thông tin khéo léo với In stark comparison, Over the following two decades, Conversely, whereas...",
    "LR": "Từ vựng chính xác, giàu tính học thuật: delineate, energy landscape, transition, relinquishing its dominant position, negligible, plummeted, expanded sevenfold, contracted.",
    "GRA": "Kiểm soát xuất sắc các cấu trúc câu phức, sử dụng cụm phân từ (becoming the leading...) và so sánh gấp nhiều lần (expanded sevenfold)."
  }
},
      band6: {
  "words": 152,
  "text": "The two pie charts compare the proportion of electricity produced from different sources in a particular country in 2000 and 2020.\n\nOverall, coal was the main source of power in 2000, but renewable energy like wind and solar expanded significantly by 2020. Nuclear and gas also experienced notable changes during this twenty-year period.\n\nIn 2000, coal produced 45% of total electricity, making it the largest source by far. Natural gas came second at 25%, while nuclear power generated 20%. Wind and solar energy together only accounted for 5%, and other renewables made up the remaining 5% of the total output.\n\nBy 2020, the entire situation had changed dramatically. The share of coal dropped significantly to only 15%. In contrast, wind and solar power became the biggest source, rising sharply to 35%. Gas increased slightly to 28%, while nuclear fell to 14%. Other renewable energy sources accounted for 8% of total power generation.",
  "notes": {
    "TA": "Mô tả đầy đủ tỉ trọng các nguồn năng lượng ở cả 2 năm và chỉ ra sự thay đổi lớn nhất (sự hoán đổi vị trí giữa than đá và điện gió/mặt trời).",
    "CC": "Bố cục chia 2 đoạn thân bài theo năm 2000 và 2020. Các từ nối cơ bản (Overall, while, By 2020, In contrast) giúp duy trì mạch bài đọc.",
    "LR": "Từ vựng phù hợp chủ đề năng lượng nhưng lặp nhiều: main source, produced, accounted for, changed dramatically, dropped significantly.",
    "GRA": "Ngữ pháp ở mức an toàn, dùng thì quá khứ đơn chuẩn xác. Thiếu các cấu trúc so sánh phức tạp hoặc mệnh đề phân từ."
  }
} },

    { id: 't1-coffee', task: 1, ref: 'coffee', band: '8.0', words: 180,
      text: `<<Mở bài>> The table [[provides information about|cung cấp thông tin về]] [[per capita coffee consumption|lượng tiêu thụ cà phê bình quân đầu người]] in five countries in 2000, 2010 and 2020.

<<Tổng quan>> {{Overall}}, Country A [[consumed by far the most coffee|tiêu thụ nhiều cà phê nhất với khoảng cách lớn]] per person in all three years. Consumption grew in most countries, [[most notably|đáng chú ý nhất là]] in Country D and Country E, {{whereas}} Country C was the only one to [[experience a continuous decline|giảm liên tục]].

<<Thân bài 1>> In 2000, the average person in Country A drank 9.8 kilograms of coffee, [[more than double the figure for|hơn gấp đôi con số của]] Country B, at 4.5 kilograms. Consumption in Country A [[rose slightly|tăng nhẹ]] to 10.4 kilograms in 2010 {{before}} [[falling back marginally|giảm nhẹ trở lại]] to 10.1 kilograms. Country B, {{meanwhile}}, [[saw steady growth|tăng trưởng đều đặn]], reaching 6.9 kilograms by 2020. {{In contrast}}, the figure for Country C [[fell continuously|giảm liên tục]], from 6.2 to 5.1 kilograms, [[falling behind|bị tụt lại sau]] Country B by the end of the period.

<<Thân bài 2>> The lowest levels of consumption were found in Country D and Country E, {{but}} these countries [[recorded the fastest growth|ghi nhận mức tăng nhanh nhất]]. In Country D, the amount [[more than tripled|tăng hơn gấp ba]], from 1.2 to 3.8 kilograms, {{while}} in Country E it [[increased more than fourfold|tăng hơn bốn lần]], from just 0.4 to 1.7 kilograms. {{Nevertheless}}, even after this growth, both still consumed [[considerably less than|ít hơn đáng kể so với]] the other three nations.`,
      band7: {
  "words": 157,
  "text": "The table provides data on annual per capita coffee consumption, measured in kilograms, across five countries in 2000, 2010, and 2020.\n\nOverall, average coffee intake experienced an upward trend in four of the five nations, with Country A consistently registering the highest figures by a wide margin. Conversely, Country E was the sole exception to this growth pattern.\n\nCitizens in Country A consumed 9.5 kg of coffee in 2000, after which intake climbed steadily to 10.8 kg in 2010 and peaked at 12.1 kg in 2020. Country B occupied second place throughout, with its consumption rising from 6.2 kg to 7.8 kg over the two decades.\n\nAmong the lower-consuming nations, Country C saw its figure rise moderately from 4.1 kg to 5.4 kg. Despite remaining the lowest consumer, Country D recorded noticeable growth, increasing from 2.0 kg to 3.2 kg. In direct contrast, coffee consumption in Country E fell from 4.8 kg to 4.2 kg by 2020.",
  "notes": {
    "TA": "Báo cáo số liệu có trọng tâm, phân nhóm rõ ràng (nhóm dẫn đầu vs nhóm tiêu thụ thấp hơn), làm nổi bật ngoại lệ giảm ở Country E.",
    "CC": "Mạch liên kết mượt mà với with Country A consistently..., Conversely, after which, Among the lower-consuming nations, In direct contrast...",
    "LR": "Từ vựng mang tính học thuật cao: annual per capita coffee consumption, intake, consistently registering, wide margin, sole exception, occupied second place, in direct contrast.",
    "GRA": "Sử dụng câu phức tốt, kết hợp mệnh đề quan hệ (after which...), mệnh đề nhượng bộ (Despite remaining...) và cụm phân từ."
  }
},
      band6: {
  "words": 153,
  "text": "The table compares how much coffee was consumed per person in five European countries in 2000, 2010, and 2020.\n\nOverall, coffee consumption per person increased in all countries except Country E. Country A had by far the highest consumption in all three years, while Country D had the lowest consumption throughout the entire period.\n\nIn 2000, people in Country A drank 9.5 kg of coffee per year. This figure grew steadily to 10.8 kg in 2010 and reached 12.1 kg in 2020. Country B was second, starting at 6.2 kg, increasing to 7.0 kg, and finishing at 7.8 kg.\n\nIn Country C, coffee consumption rose from 4.1 kg to 5.4 kg over the period. Meanwhile, Country D had the lowest figures, but it also increased from 2.0 kg to 3.2 kg. In contrast, Country E was the only nation where consumption decreased, dropping from 4.8 kg in 2000 to 4.2 kg in 2020.",
  "notes": {
    "TA": "Cung cấp đầy đủ số liệu của cả 5 quốc gia qua 3 mốc thời gian; chỉ ra được nước tiêu thụ nhiều nhất, ít nhất và ngoại lệ giảm ở Country E.",
    "CC": "Chia đoạn hợp lý giữa nhóm tiêu thụ cao và nhóm tiêu thụ thấp; dùng các từ nối quen thuộc (Overall, Meanwhile, In contrast, over the period).",
    "LR": "Từ vựng còn đơn giản và lặp lại cấu trúc số liệu: drank, figure grew to, reached, starting at, increasing to, rose steadily.",
    "GRA": "Dùng thì quá khứ đơn tương đối chính xác. Các câu có cấu trúc tương tự nhau, ít biến hóa cú pháp."
  }
} },

    { id: 't1-metro', task: 1, ref: 'metro', band: '8.0', words: 182,
      text: `<<Mở bài>> The table [[compares|so sánh]] the underground railway systems in five cities [[in terms of|xét về]] the year they opened, [[the total length of their routes|tổng chiều dài tuyến]] and [[the number of passengers they carry annually|số lượng hành khách vận chuyển mỗi năm]].

<<Tổng quan>> {{Overall}}, the oldest network, in Northport, is [[by far the longest and busiest|dài nhất và đông khách nhất với khoảng cách lớn]], {{whereas}} the most recent one, in Sunhill, is the smallest [[on every measure|trên mọi tiêu chí]]. {{In general}}, [[there is a clear link between|có mối liên hệ rõ ràng giữa]] route length and passenger numbers.

<<Thân bài 1>> Northport's underground opened in 1902 and has 410 kilometres of routes, [[more than twice the length of|dài hơn gấp đôi]] the second-largest system, in Riverton. It carries 1,950 million passengers a year, [[well over double|hơn gấp đôi khá nhiều]] Riverton's figure of 890 million. The Riverton network, which [[dates back to|có từ]] 1935, covers 185 kilometres.

<<Thân bài 2>> The remaining three systems are [[considerably smaller|nhỏ hơn đáng kể]]. Eastvale's network, opened in 1999, is 96 kilometres long and serves 610 million passengers annually, {{while}} Lakeside's older system, which began operating in 1968, has only 64 kilometres of track and carries 320 million people, [[roughly half as many as|khoảng một nửa so với]] Eastvale. {{Finally}}, Sunhill's underground, [[the most recent addition|công trình mới nhất]], opened in 2012 and [[consists of just|chỉ gồm]] 27 kilometres of routes, carrying 140 million passengers a year, [[less than a tenth of|chưa bằng một phần mười]] Northport's total.`,
      band7: {
  "words": 157,
  "text": "The table evaluates five metropolitan underground railway networks based on their year of inception, total route length in kilometres, and annual passenger volume in millions.\n\nOverall, London boasts the oldest and most extensive underground network, whereas Tokyo is by far the busiest in terms of ridership. Conversely, Kyoto features the most recent and shortest system with the lowest passenger traffic.\n\nLondon's network, inaugurated in 1863, spans 394 kilometres and serves 775 million passengers annually. The Paris metro, established in 1900, covers roughly half that distance at 199 kilometres, yet accommodates a substantially larger passenger count of 1,191 million.\n\nAlthough Tokyo's system is comparatively shorter at 155 kilometres, it handles the heaviest commuter flow, transporting 1,927 million passengers each year. Washington DC, opened in 1976, features 126 kilometres of track and caters to 144 million riders. Lastly, Kyoto's network, founded in 1981, operates on just 11 kilometres of track and records the lowest annual ridership of 45 million.",
  "notes": {
    "TA": "So sánh đa chiều giữa chiều dài và lượng khách (đặc biệt là Tokyo tuy ngắn hơn London nhưng lượng khách gấp gần 2.5 lần; Paris chỉ bằng nửa chiều dài nhưng khách đông hơn).",
    "CC": "Liên kết câu mượt mà, sử dụng các từ chuyển đoạn uyển chuyển: based on, whereas, Conversely, yet accommodates, Although..., Lastly...",
    "LR": "Vốn từ học thuật, linh hoạt thay thế từ vựng: metropolitan underground railway networks, year of inception, ridership, boasts, spans, inaugurated, accommodates, commuter flow, caters to.",
    "GRA": "Kết hợp câu phức, câu ghép nhuần nhuyễn với các phân từ (inaugurated in 1863, transporting..., records...)."
  }
},
      band6: {
  "words": 154,
  "text": "The table compares five underground railway systems in London, Paris, Tokyo, Washington DC, and Kyoto in terms of their opening year, route length, and passenger numbers.\n\nOverall, London has the oldest and longest metro system, while Tokyo carries the largest number of passengers per year. In contrast, Kyoto is the newest and smallest network among all five cities shown in the table.\n\nThe London Underground opened first in 1863 and has a network of 394 kilometres, carrying 775 million passengers annually. Paris opened in 1900 with 199 kilometres of route and serves 1,191 million passengers, which is considerably more than London.\n\nTokyo has 155 kilometres of track, but it transports the most passengers at 1,927 million people each year. Washington DC opened in 1976 and covers 126 kilometres, serving 144 million riders. Finally, Kyoto opened in 1981 and has only 11 kilometres of route, carrying 45 million passengers, making it the smallest system overall.",
  "notes": {
    "TA": "Bao quát đầy đủ 5 thành phố và 3 tiêu chí trong bảng. Nêu được các điểm cực trị (London lâu đời/dài nhất, Tokyo đông khách nhất, Kyoto nhỏ nhất).",
    "CC": "Tổ chức đoạn theo nhóm các hệ thống lớn và nhỏ. Dùng từ nối cơ bản (Overall, In contrast, while, but, Finally).",
    "LR": "Từ vựng tương đối đủ (underground railway system, route length, carries, transports, passengers, track). Còn lặp từ passengers và các cụm đơn giản.",
    "GRA": "Cấu trúc câu đúng nhưng cấu trúc ngữ pháp tương đối đơn điệu, lặp đi lặp lại công thức 'City opened in... and has... carrying...'."
  }
} },

    { id: 't1-salmon', task: 1, ref: 'salmon', band: '8.0', words: 181,
      text: `<<Mở bài>> The diagram [[illustrates the various stages in|minh họa các giai đoạn trong]] [[the life cycle of|vòng đời của]] the salmon, from the laying of eggs to the return of adult fish to their birthplace.

<<Tổng quan>> {{Overall}}, there are seven [[distinct stages|giai đoạn riêng biệt]], [[some of which take place in fresh water|một số diễn ra ở nước ngọt]] and others in the ocean. The process [[forms a continuous cycle|tạo thành một vòng tuần hoàn liên tục]], [[beginning and ending|bắt đầu và kết thúc]] in the upper reaches of a river.

<<Thân bài 1>> {{First}}, adult salmon [[lay their eggs|đẻ trứng]] [[among the gravel|giữa lớp sỏi]] of the upper river. {{After}} about 6 weeks, these eggs [[hatch into|nở thành]] tiny young fish [[known as|được gọi là]] alevins. {{As}} the alevins grow, they [[develop into|phát triển thành]] fry and move to calmer water, where they [[gradually mature|dần dần lớn lên]] over a period of 1 to 4 years {{until}} they become smolts.

<<Thân bài 2>> {{At this point}}, the smolts [[make their way downstream|di chuyển xuôi dòng]] to the sea. They then spend between 1 and 3 years in the ocean, where they [[reach adulthood|trưởng thành]]. {{Finally}}, the mature adults [[swim back upstream|bơi ngược dòng trở lại]] to the upper river [[in order to|để]] spawn, {{and}} the eggs they lay there mark [[the start of a new cycle|sự khởi đầu của một chu trình mới]]. {{In this way}}, each generation [[returns to the place where it was born|quay về nơi nó được sinh ra]].`,
      band7: {
  "words": 158,
  "text": "The diagram illustrates the sequential stages in the natural life cycle of the salmon, spanning its journey between freshwater rivers and the open ocean.\n\nOverall, the cycle encompasses distinct development phases, progressing from eggs laid in the riverbed, through maturation in marine waters, and culminating in the adult fish returning to their spawning grounds.\n\nThe cycle commences when adult salmon deposit their eggs amongst gravel in the upper reaches of a river. Approximately six weeks later, these eggs hatch into tiny alevins. As they feed and develop, they transition into fry and migrate to calmer water, where they mature over a period of one to four years before transforming into smolts.\n\nAt this stage, the smolts migrate downstream towards the ocean, where they spend between one and three years growing into full adulthood. Ultimately, the mature salmon undertake a rigorous upstream journey back to their native river to spawn, thereby initiating the cycle anew for the next generation.",
  "notes": {
    "TA": "Miêu tả đầy đủ, chi tiết từng giai đoạn sinh trưởng kèm khung thời gian chính xác, làm bật vòng lặp tuần hoàn sinh học tự nhiên.",
    "CC": "Dòng chảy thông tin liền mạch với các cụm liên kết tự nhiên: sequential stages, commences when, Approximately six weeks later, As they feed..., At this stage, Ultimately, thereby...",
    "LR": "Vốn từ học thuật phong phú về chu trình sinh học: sequential stages, encompasses, spawning grounds, commences, deposit eggs, upper reaches, transition, migrate, rigorous upstream journey, initiating the cycle anew.",
    "GRA": "Cấu trúc câu phong phú với các mệnh đề trạng ngữ chỉ thời gian, cụm phân từ (spanning..., culminating in..., transforming into..., thereby initiating...)."
  }
},
      band6: {
  "words": 153,
  "text": "The diagram shows the different stages in the life cycle of a salmon, from laying eggs to becoming adult fish.\n\nOverall, the life cycle has several main stages. It starts in the fresh water of a river, then the fish move to the ocean to grow, and finally return to the river to lay eggs.\n\nFirst, adult salmon lay many eggs in the gravel in the upper river. After around 6 weeks, the eggs hatch into very small fish called alevins. These small fish grow bigger and become fry, moving to slower water where they live for 1 to 4 years until they turn into smolts.\n\nNext, the smolts swim downstream to the ocean. In the ocean, they spend between 1 and 3 years feeding and growing into mature adult salmon. Finally, the adult fish swim back upstream against the current to the upper river to lay eggs and begin the cycle again.",
  "notes": {
    "TA": "Mô tả đầy đủ tất cả các giai đoạn trong vòng đời cá hồi từ trứng đến cá trưởng thành và đẻ trứng. Nêu được sự thay đổi môi trường sống từ sông ra biển rồi về lại sông.",
    "CC": "Sắp xếp theo thứ tự thời gian tự nhiên của quy trình. Dùng các liên từ chỉ thứ tự quen thuộc (Overall, First, After, Next, Finally).",
    "LR": "Từ vựng quy trình cơ bản (stages, hatch, grow bigger, swim downstream, mature adult salmon, begin the cycle again). Thiếu các từ học thuật như spawn, estuary, migration.",
    "GRA": "Ngữ pháp dùng thì hiện tại đơn chuẩn cho quy trình. Cấu trúc câu đơn giản, chủ yếu là câu ghép với and, until, where."
  }
} },

    { id: 't1-tea', task: 1, ref: 'tea', band: '8.0', words: 174,
      text: `<<Mở bài>> The diagram [[illustrates the process by which|minh họa quy trình mà qua đó]] black tea [[is manufactured|được sản xuất]], from the picking of fresh leaves on the plantation to the delivery of the finished product.

<<Tổng quan>> {{Overall}}, the production of black tea [[involves seven main stages|gồm bảy giai đoạn chính]], [[starting with|bắt đầu bằng]] the harvesting of fresh leaves and [[culminating in|kết thúc bằng]] the packing and shipping of the tea. {{Unlike}} a natural cycle, it is [[a linear process|một quy trình tuyến tính]].

<<Thân bài 1>> {{Initially}}, fresh tea leaves [[are picked by hand|được hái bằng tay]]. {{After that}}, they [[are spread out on racks|được trải ra trên giàn]] and [[left to wither|để cho héo]] for 12 to 18 hours. The withered leaves [[are then rolled|sau đó được vò]] [[in order to|để]] release their juices, {{and}} they are subsequently [[left to oxidise|để lên men (oxy hóa)]] for a further 2 to 4 hours, [[during which they are simply left to stand|trong thời gian đó lá chỉ được để yên]].

<<Thân bài 2>> {{Once}} oxidation [[is complete|hoàn tất]], the leaves [[are dried using hot air|được sấy bằng khí nóng]] at a temperature of 120°C. {{Next}}, the dried tea [[is sorted and graded according to|được phân loại và xếp hạng theo]] the size of the leaves, {{so that}} leaves of a similar size are grouped together. {{Finally}}, the tea [[is packed|được đóng gói]] and shipped to buyers, [[ready to be sold|sẵn sàng để bán]] to consumers.`,
      band7: {
  "words": 151,
  "text": "The diagram delineates the multi-stage manufacturing process involved in the production of black tea, from the initial harvesting of leaves to the final delivery.\n\nOverall, the manufacture of black tea comprises seven sequential stages, forming a linear industrial process that begins with manual harvesting and concludes with packaging and commercial distribution.\n\nInitially, fresh leaves are picked by hand on tea plantations. These leaves are subsequently laid out on racks to wither for 12 to 18 hours. Once sufficiently withered, they undergo rolling to release essential juices, followed by an oxidation period lasting between 2 and 4 hours, during which the leaves are left undisturbed.\n\nFollowing oxidation, the leaves are transferred to a drying unit where they are treated with hot air at 120°C. Thereafter, the dried product is sorted and graded according to leaf size. Finally, the processed tea is packaged into containers and shipped to buyers, completing the production chain.",
  "notes": {
    "TA": "Bao quát chuẩn xác mọi giai đoạn chế biến và các thông số kỹ thuật; làm rõ tính chất công nghiệp tuyến tính (linear industrial process).",
    "CC": "Mạch văn gắn kết chặt chẽ với các từ nối đa dạng: delineates, Initially, subsequently, Once sufficiently withered, followed by, Following oxidation, Thereafter, Finally...",
    "LR": "Từ vựng trang trọng, phù hợp quy trình công nghiệp: multi-stage manufacturing process, comprises, sequential stages, manual harvesting, commercial distribution, undergo rolling, oxidation period, left undisturbed, production chain.",
    "GRA": "Sử dụng nhuần nhuyễn thể bị động và các mệnh đề phụ, mệnh đề quan hệ (during which..., where they are treated...) và cụm phân từ."
  }
},
      band6: {
  "words": 150,
  "text": "The diagram illustrates the process of making black tea, from collecting the fresh leaves on a farm to shipping the final product to market.\n\nOverall, the tea production process consists of seven main stages. It is a linear industrial process that begins with hand-picking the leaves and ends with packaging and delivering the tea to customers.\n\nIn the first step, farmers pick fresh tea leaves by hand. After that, the leaves are spread on racks to wither for 12 to 18 hours. Then, workers roll the withered leaves to release their juices, and leave them to oxidise for 2 to 4 hours.\n\nOnce oxidation is finished, the tea leaves are dried with hot air at 120 degrees Celsius. Next, the dried tea is sorted and graded into different sizes. Finally, the finished tea is packed into boxes and sent to buyers, ready to be sold in markets and shops worldwide.",
  "notes": {
    "TA": "Trình bày rõ ràng đầy đủ 7 bước của quy trình sản xuất trà đen. Nêu được các thông số kỹ thuật (12-18 giờ, 2-4 giờ, 120°C).",
    "CC": "Sắp xếp tuần tự theo các bước thực hiện. Các từ nối bước cơ bản (In the first step, After that, Then, Once oxidation is finished, Next, Finally).",
    "LR": "Sử dụng từ vựng ở mức vừa đủ cho đề quy trình: fresh tea leaves, hand-picking, withered, release juices, oxidise, dried, packed. Thiếu các cụm từ mô tả công nghiệp tinh tế hơn.",
    "GRA": "Sử dụng thể bị động tương đối đều đặn (are spread, are dried, is sorted, is packed). Các câu còn ngắn và có mẫu tương tự nhau."
  }
} },

    { id: 't1-island', task: 1, ref: 'island', band: '8.0', words: 190,
      text: `<<Mở bài>> The maps [[illustrate how|minh họa cách]] a small island [[was transformed|được biến đổi]] [[following the construction of|sau khi xây dựng]] a tourist resort.

<<Tổng quan>> {{Overall}}, the island [[changed from a quiet fishing and farming area into|chuyển từ một vùng đánh cá và làm nông yên tĩnh thành]] a tourist destination, with [[new accommodation and transport facilities|cơ sở lưu trú và giao thông mới]]. {{However}}, the beach and the main road [[remained unchanged|vẫn giữ nguyên]], and [[part of the forest was preserved|một phần khu rừng được bảo tồn]].

<<Thân bài 1>> {{Before}} the development, the land to the west of the main road, which [[runs from north to south|chạy theo hướng bắc – nam]], was [[largely covered by|phần lớn được bao phủ bởi]] forest, with farmland [[to the south|ở phía nam]]. {{Afterwards}}, the northern section of the forest [[was cleared to make way for|bị phát quang để nhường chỗ cho]] a hotel, {{while}} the remaining woodland was kept in the centre of the western side. The farmland in the south-west [[was replaced by|được thay thế bằng]] a car park.

<<Thân bài 2>> On the eastern side of the island, the beach in the north-east [[was left untouched|được giữ nguyên]]. {{However}}, the fishing huts to its south [[were demolished|bị phá bỏ]] and tourist chalets [[were built in their place|được xây dựng thay thế]]. {{Similarly}}, the jetty in the south-east [[was converted into|được chuyển đổi thành]] a ferry pier, [[presumably to cater for|có lẽ để phục vụ]] the arrival of visitors. {{As a result}}, [[the focus of the island appears to have shifted|trọng tâm của hòn đảo dường như đã chuyển dịch]] from fishing and farming towards tourism.`,
      band7: {
  "words": 158,
  "text": "The two maps illustrate the redevelopment of a small island before and after its transformation into a dedicated tourist resort.\n\nOverall, the island transitioned from an undeveloped rural area focused on fishing and farming into a modern holiday destination. Despite extensive modernisation, the beach, the central road, and portions of the original woodland were preserved.\n\nTo the west of the central road, significant alterations occurred. The northern sector of the forest was cleared to accommodate a hotel complex, while the southern farmland was converted into a car park. The woodland in the central section was retained, providing natural greenery between the new facilities.\n\nOn the eastern side, the north-eastern beach was left untouched for recreation. In contrast, the former fishing huts to the south were demolished and replaced with tourist chalets. Furthermore, the existing jetty in the south-east was upgraded into a ferry pier, facilitating the arrival of tourists and marking a complete shift towards a tourism-based economy.",
  "notes": {
    "TA": "Phân tích sắc sảo các thay đổi về công năng và quy hoạch, chỉ rõ các khu bảo tồn tự nhiên bên cạnh các công trình xây mới.",
    "CC": "Mạch lạc cao, sử dụng từ định hướng vị trí và chuyển tiếp mạch lạc: To the west of..., In contrast, Furthermore, facilitating...",
    "LR": "Từ vựng mô tả bản đồ quy hoạch xuất sắc: redevelopment, dedicated tourist resort, transitioned, rural area, extensive modernisation, woodland, alterations, accommodate, converted into, demolished, upgraded, facilitating.",
    "GRA": "Sử dụng linh hoạt thể bị động, câu phức nhượng bộ (Despite extensive modernisation...) và mệnh đề phân từ (facilitating..., providing...)."
  }
},
      band6: {
  "words": 150,
  "text": "The two maps show the changes that took place on a small island before and after a tourist resort was built.\n\nOverall, the island was transformed from a quiet natural place used for fishing and farming into a tourist resort. However, some features like the beach and the main road remained the same.\n\nBefore the development, the western side of the road had a large forest in the north and farmland in the south. After construction, the northern forest was cut down to build a hotel, while the southern farmland became a car park. Only the middle section of the forest was kept.\n\nOn the eastern side of the island, the beach in the north-east was not changed. However, the old fishing huts were removed to build tourist chalets. In the south-east, the old jetty was turned into a ferry pier so that visitors could arrive on the island easily.",
  "notes": {
    "TA": "Mô tả được các thay đổi chính ở cả 2 phía đông và tây của con đường, nhận diện được phần giữ nguyên (bãi biển, một phần rừng, con đường chính).",
    "CC": "Phân chia bố cục theo khu vực đông và tây của con đường một cách rõ ràng. Dùng liên từ cơ bản (Overall, However, Before, After construction, while).",
    "LR": "Từ vựng miêu tả bản đồ cơ bản: transformed, cut down, removed, turned into, arrived. Cần bổ sung các động từ học thuật hơn (demolished, converted, preserved).",
    "GRA": "Dùng thì quá khứ và thể bị động ở mức chuẩn xác cơ bản. Hơi ít cấu trúc chỉ phương hướng và vị trí không gian nâng cao."
  }
} },
  ]);
})(typeof self !== 'undefined' ? self : this);
