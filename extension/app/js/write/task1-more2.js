/* Đề Writing Task 1 bổ sung (đợt 2) + bài mẫu band 8 có chú thích (tự biên soạn – số liệu giả định) */
(function (g) {
  g.TASK1_MORE = (g.TASK1_MORE || []).concat([
    // ---------- Biểu đồ đường ----------
    { id: 'bikeshare', type: 'line', title: 'The line graph shows the number of journeys (in millions) made using public bike-sharing schemes in three cities between 2014 and 2024.',
      x: ['2014', '2016', '2018', '2020', '2022', '2024'], unit: 'million',
      series: [['Harbourton', [2, 5, 9, 7, 14, 18]], ['Millbrook', [6, 7, 8, 6, 9, 10]], ['Westford', [1, 1, 3, 4, 8, 12]]],
      overview: 'Overall, bike-sharing journeys increased in all three cities over the decade, with Harbourton showing the most dramatic growth and leading from 2018 onwards, while both Harbourton and Millbrook experienced a temporary dip in 2020.' },
    { id: 'reading', type: 'line', title: 'The line graph shows the average number of minutes per day that adults in one country spent reading print books and e-books and listening to audiobooks between 2010 and 2025.',
      x: ['2010', '2013', '2016', '2019', '2022', '2025'], unit: 'minutes',
      series: [['Print books', [28, 25, 22, 20, 18, 17]], ['E-books', [3, 8, 12, 13, 12, 11]], ['Audiobooks', [1, 2, 4, 7, 12, 16]]],
      overview: 'Overall, print books remained the most popular format throughout, although the time spent on them fell steadily; e-book reading rose and then levelled off, whereas audiobooks grew continuously and had become the second most popular format by 2025.' },
    { id: 'rainfall', type: 'line', title: 'The line graph shows the average monthly rainfall (in millimetres) in two cities, Portavel and Dranmoor.',
      x: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], unit: 'mm',
      series: [['Portavel', [210, 180, 150, 90, 40, 15, 5, 8, 35, 110, 190, 230]], ['Dranmoor', [60, 55, 62, 58, 64, 70, 78, 75, 66, 70, 72, 68]]],
      overview: 'Overall, Portavel has a pronounced wet and dry season, with heavy rain in winter and almost none in summer, whereas rainfall in Dranmoor is fairly even throughout the year; Portavel is wetter for most of the year but drier from May to September.' },
    // ---------- Biểu đồ cột ----------
    { id: 'sleep', type: 'bar', title: 'The bar chart compares the average number of hours of sleep per night on weekdays and at weekends for five age groups in one country in 2024.',
      x: ['13–17', '18–25', '26–40', '41–60', '61+'], unit: 'hours',
      series: [['Weekdays', [6.8, 6.9, 6.6, 6.7, 7.1]], ['Weekends', [9.2, 8.6, 7.8, 7.3, 7.2]]],
      overview: 'Overall, every age group slept longer at weekends than on weekdays, but the difference shrank steadily with age, from well over two hours among teenagers to almost nothing for those over 60.' },
    { id: 'exports', type: 'bar', title: 'The bar chart shows the value of exports (in billions of dollars) in four product categories from one country in 2005, 2015 and 2025.',
      x: ['Machinery', 'Food products', 'Textiles', 'Software services'], unit: 'billion $',
      series: [['2005', [42, 18, 25, 4]], ['2015', [55, 24, 19, 15]], ['2025', [61, 30, 12, 38]]],
      overview: 'Overall, machinery was the leading export in all three years, but the most striking change was the rapid growth of software services, which rose from the smallest to the second-largest category, while textiles were the only category to decline.' },
    { id: 'volunteer', type: 'bar', title: 'The bar chart shows the percentage of men and women in five age groups who did unpaid volunteer work at least once a month in one country in 2023.',
      x: ['16–24', '25–34', '35–49', '50–64', '65+'], unit: '%',
      series: [['Men', [14, 10, 15, 19, 24]], ['Women', [18, 13, 21, 26, 29]]],
      overview: 'Overall, women were more likely than men to volunteer in every age group, and for both sexes participation was lowest among 25- to 34-year-olds and highest among people aged 65 and over.' },
    // ---------- Biểu đồ tròn ----------
    { id: 'homewater', type: 'pie', title: 'The pie charts show how water was used in an average household in one country in 1995 and 2025.',
      pies: [['1995', [['Toilet flushing', 31], ['Showers & baths', 27], ['Washing machine', 18], ['Kitchen & drinking', 10], ['Garden', 9], ['Other', 5]]], ['2025', [['Toilet flushing', 22], ['Showers & baths', 34], ['Washing machine', 12], ['Kitchen & drinking', 12], ['Garden', 6], ['Other', 14]]]],
      overview: 'Overall, showers and baths replaced toilet flushing as the largest use of household water, and the shares used by washing machines and gardens declined, while the proportion classified as other almost tripled.' },
    { id: 'uniincome', type: 'pie', title: 'The pie charts show the sources of income of a university in 2005 and 2025.',
      pies: [['2005', [['Government grants', 58], ['Tuition fees', 24], ['Research contracts', 10], ['Donations', 5], ['Commercial activities', 3]]], ['2025', [['Government grants', 36], ['Tuition fees', 41], ['Research contracts', 13], ['Donations', 4], ['Commercial activities', 6]]]],
      overview: 'Overall, the university became far less dependent on government grants, and by 2025 tuition fees had overtaken them as its main source of income, while the remaining sources contributed relatively small shares in both years.' },
    // ---------- Bảng số liệu ----------
    { id: 'evsales', type: 'table', title: 'The table shows the percentage of new cars sold that were electric in five countries in 2015, 2020 and 2025.',
      head: ['Country', '2015', '2020', '2025'], rows: [['Norland', 22, 54, 89], ['Estavia', 4, 11, 38], ['Corvania', 1, 6, 27], ['Belmark', 3, 5, 9], ['Tiralia', 0.5, 2, 4]],
      overview: 'Overall, the share of electric cars increased in all five countries, but Norland was far ahead of the others throughout, while growth in Belmark and Tiralia was much slower than elsewhere.' },
    { id: 'hotels', type: 'table', title: 'The table gives information about hotels in five coastal towns in 2024: the number of hotels, the average price of a room per night and the average occupancy rate.',
      head: ['Town', 'Number of hotels', 'Average room price per night ($)', 'Occupancy rate (%)'],
      rows: [['Sandhaven', 65, 72, 88], ['Bayford', 48, 85, 82], ['Gullwick', 30, 98, 79], ['Cliffmouth', 23, 140, 76], ['Port Elric', 12, 210, 61]],
      overview: 'Overall, the towns with the most hotels charged the lowest prices and had the highest occupancy rates, whereas Port Elric, the most expensive town, had the fewest hotels and the lowest occupancy.' },
    // ---------- Quy trình ----------
    { id: 'honey', type: 'process', title: 'The diagram shows how honey is produced by bees and prepared for sale.',
      steps: ['Bees collect nectar from flowers', 'Nectar is stored in honeycomb cells in the hive', 'Bees fan their wings to evaporate water until the honey thickens', 'Cells are sealed with a wax cap', 'Beekeepers remove the frames and cut off the wax caps', 'Honey is extracted in a spinning machine (centrifuge)', 'Honey is filtered to remove wax and impurities', 'Honey is poured into jars and labelled'],
      overview: 'Overall, honey production consists of eight stages, beginning with bees collecting nectar from flowers and ending with the honey being put into jars; the first four stages are carried out by the bees themselves, whereas the remaining four are performed by beekeepers.' },
    // ---------- Bản đồ ----------
    { id: 'campus', type: 'map', title: 'The maps show a university campus in 2005 and today.',
      maps: [['2005', [['Library', 1, 1, 2, 1, '#6d5dfc'], ['Sports field', 1, 2, 2, 2, '#16a34a'], ['Car park', 3, 1, 2, 1, '#94a3b8'], ['Lecture halls', 3, 2, 2, 1, '#f59e0b'], ['Woodland', 3, 3, 2, 1, '#15803d']]],
             ['Today', [['Library', 1, 1, 2, 1, '#6d5dfc'], ['Student housing', 1, 2, 2, 1, '#c026d3'], ['Sports hall', 1, 3, 2, 1, '#0ea5a4'], ['Science centre', 3, 1, 2, 1, '#e5484d'], ['Lecture halls', 3, 2, 2, 1, '#f59e0b'], ['Car park', 3, 3, 2, 1, '#94a3b8']]]],
      overview: 'Overall, the campus has been extensively redeveloped, with the sports field and the woodland disappearing to make way for new buildings such as student housing and a science centre, while the library and the lecture halls have remained in their original positions.' },
  ]);

  g.MODELS = (g.MODELS || []).concat([
    { id: 't1-bikeshare', task: 1, ref: 'bikeshare', band: '8.0', words: 171,
      text: `<<Mở bài>> The line graph [[illustrates|minh họa]] how many journeys were made [[using public bike-sharing schemes|bằng hệ thống xe đạp công cộng]] in Harbourton, Millbrook and Westford [[between 2014 and 2024|từ năm 2014 đến năm 2024]].

<<Tổng quan>> {{Overall}}, the use of shared bikes [[grew in all three cities|tăng ở cả ba thành phố]] over the decade. Harbourton [[saw by far the most dramatic growth|có mức tăng mạnh nhất với khoảng cách lớn]] and [[led the other two cities|dẫn đầu hai thành phố còn lại]] from 2018 onwards, {{while}} both Harbourton and Millbrook [[experienced a temporary dip|trải qua một đợt giảm tạm thời]] in 2020.

<<Thân bài 1>> In 2014, Millbrook [[recorded the highest number of journeys|ghi nhận số chuyến đi cao nhất]], at 6 million, {{compared with}} 2 million in Harbourton and just 1 million in Westford. {{However}}, Harbourton's figure [[rose rapidly|tăng nhanh]] to 9 million in 2018, [[overtaking|vượt qua]] Millbrook, which had [[edged up to|nhích lên]] 8 million. Both cities then [[saw a fall|chứng kiến sự sụt giảm]] in 2020, to 7 million and 6 million [[respectively|lần lượt]].

<<Thân bài 2>> {{After that}}, usage in Harbourton [[surged|tăng vọt]] to 14 million in 2022 and [[reached a peak of|đạt đỉnh]] 18 million in 2024, [[nine times its initial level|gấp chín lần mức ban đầu]]. Millbrook, {{by contrast}}, [[recovered only modestly|chỉ phục hồi nhẹ]], [[finishing the period at|kết thúc giai đoạn ở mức]] 10 million. {{Meanwhile}}, Westford [[got off to a slow start|khởi đầu chậm chạp]], with [[no change|không có thay đổi]] between 2014 and 2016, {{but}} its figure then [[climbed steadily|tăng đều đặn]] to 4 million in 2020 and 12 million in 2024, [[overtaking Millbrook in the final year|vượt Millbrook vào năm cuối]].` },

    { id: 't1-reading', task: 1, ref: 'reading', band: '8.0', words: 181,
      text: `<<Mở bài>> The line graph [[compares the average amount of time|so sánh lượng thời gian trung bình]] that adults in one country spent each day reading print books and e-books and listening to audiobooks [[from 2010 to 2025|từ năm 2010 đến năm 2025]].

<<Tổng quan>> {{Overall}}, print books [[remained the most popular format|vẫn là hình thức phổ biến nhất]] throughout the period, {{although}} the time devoted to them [[fell steadily|giảm đều đặn]]. E-book reading [[rose and then levelled off|tăng rồi chững lại]], {{whereas}} audiobooks [[grew continuously|tăng liên tục]] and [[had become the second most popular format|đã trở thành hình thức phổ biến thứ hai]] by the end of the period.

<<Thân bài 1>> In 2010, adults spent an average of 28 minutes a day on print books, [[dwarfing|vượt xa]] the figures for e-books and audiobooks, at 3 minutes and 1 minute [[respectively|lần lượt]]. {{Since then}}, print reading [[has declined gradually|đã giảm dần]], [[dropping to|giảm xuống]] 22 minutes in 2016 and 17 minutes in 2025, [[well below its original level|thấp hơn nhiều so với mức ban đầu]].

<<Thân bài 2>> E-books, {{by contrast}}, [[enjoyed rapid growth|tăng trưởng nhanh]] [[in the early years|trong những năm đầu]], with daily reading time [[quadrupling|tăng gấp bốn]] to 12 minutes in 2016. The figure [[peaked at|đạt đỉnh ở mức]] 13 minutes in 2019, {{however}}, {{before}} [[slipping back to|giảm trở lại]] 11 minutes in 2025. Audiobooks [[started from a very low base|xuất phát từ mức rất thấp]] {{but}} [[gained popularity steadily|ngày càng được ưa chuộng]], [[drawing level with|ngang bằng với]] e-books at 12 minutes in 2022. By 2025, listening time [[had reached|đã đạt]] 16 minutes, [[only one minute less than|chỉ ít hơn một phút so với]] the time spent on print books.` },

    { id: 't1-rainfall', task: 1, ref: 'rainfall', band: '8.0', words: 199,
      text: `<<Mở bài>> The line graph [[illustrates|minh họa]] the average amount of rain that [[falls|rơi]] each month in two cities, Portavel and Dranmoor, [[over the course of a year|trong suốt một năm]].

<<Tổng quan>> {{Overall}}, Portavel [[has a pronounced wet season and dry season|có mùa mưa và mùa khô rõ rệt]], with heavy rain in winter and [[almost none|gần như không có mưa]] in summer, {{whereas}} rainfall in Dranmoor is [[fairly evenly distributed|phân bố khá đều]] throughout the year. {{As a result}}, Portavel is [[the wetter of the two cities|thành phố mưa nhiều hơn]] for most of the year {{but}} the drier one from May to September.

<<Thân bài 1>> In January, Portavel receives 210 millimetres of rain, [[more than three times|hơn ba lần]] the figure for Dranmoor. Rainfall in Portavel [[falls sharply|giảm mạnh]] [[month by month|qua từng tháng]], to 90 millimetres in April and just 15 millimetres in June, {{before}} [[bottoming out at|chạm đáy ở mức]] 5 millimetres in July. [[From September onwards|Từ tháng Chín trở đi]], it [[climbs rapidly|tăng nhanh]], [[reaching|đạt]] 110 millimetres in October and a peak of 230 millimetres in December.

<<Thân bài 2>> {{In contrast}}, monthly rainfall in Dranmoor [[stays within a narrow range|dao động trong biên độ hẹp]], from 55 millimetres in February to 78 millimetres in July. {{Interestingly}}, the city [[is slightly wetter in summer than in winter|mưa nhiều hơn một chút vào mùa hè so với mùa đông]], [[the reverse of the pattern in Portavel|ngược lại với xu hướng ở Portavel]]. From May to September, Dranmoor [[records more rain than|ghi nhận lượng mưa nhiều hơn]] Portavel, with the gap [[at its widest|lớn nhất]] in July, when it receives 78 millimetres, {{compared with}} only 5 millimetres.` },

    { id: 't1-sleep', task: 1, ref: 'sleep', band: '8.0', words: 189,
      text: `<<Mở bài>> The bar chart [[compares the average length of sleep|so sánh thời lượng ngủ trung bình]] per night on weekdays and at weekends [[among|giữa]] five age groups in one country in 2024.

<<Tổng quan>> {{Overall}}, people [[in every age group|ở mọi nhóm tuổi]] slept longer at weekends than on weekdays. {{However}}, [[the gap between the two|khoảng chênh lệch giữa hai mức]] [[narrowed steadily with age|thu hẹp dần theo độ tuổi]], [[from well over two hours|từ hơn hai giờ]] among teenagers to [[almost nothing|gần như không đáng kể]] for those over 60.

<<Thân bài 1>> On weekdays, the figures were [[remarkably similar|khá tương đồng]] across the age groups, [[ranging from|dao động từ]] 6.6 hours for 26- to 40-year-olds to 7.1 hours for people aged 61 and over. Teenagers aged 13 to 17 and young adults aged 18 to 25 slept for 6.8 and 6.9 hours [[respectively|lần lượt]], {{while}} the figure for the 41–60 group was 6.7 hours.

<<Thân bài 2>> At weekends, {{by contrast}}, [[clear differences emerged|xuất hiện sự khác biệt rõ rệt]]. Teenagers slept for 9.2 hours, [[the highest figure on the chart|con số cao nhất trên biểu đồ]] and [[almost two and a half hours more|nhiều hơn gần hai tiếng rưỡi]] than on weekdays. The 18–25 group [[followed with|xếp tiếp theo với]] 8.6 hours, {{and}} the figure [[continued to decline|tiếp tục giảm]] [[with each older group|ở mỗi nhóm lớn tuổi hơn]], to 7.8 hours for the 26–40 group and 7.3 hours for those aged 41 to 60. {{Finally}}, people over 60 slept for 7.2 hours at weekends, [[virtually the same as|gần như bằng]] their weekday figure of 7.1 hours, {{so}} they were [[the only group whose sleep hardly varied|nhóm duy nhất có thời gian ngủ gần như không đổi]] [[across the week|trong cả tuần]].` },

    { id: 't1-exports', task: 1, ref: 'exports', band: '8.0', words: 174,
      text: `<<Mở bài>> The bar chart [[illustrates the value of exports|minh họa giá trị xuất khẩu]] [[in four product categories|ở bốn nhóm sản phẩm]] from one country in 2005, 2015 and 2025, [[measured in billions of dollars|tính bằng tỉ đô la]].

<<Tổng quan>> {{Overall}}, machinery [[was the country's leading export|là mặt hàng xuất khẩu chủ lực của quốc gia]] in all three years. {{However}}, [[the most striking change|thay đổi đáng chú ý nhất]] was [[the meteoric rise of|sự tăng trưởng vượt bậc của]] software services, {{while}} textiles were [[the only category to decline|nhóm duy nhất suy giảm]].

<<Thân bài 1>> In 2005, machinery exports were worth $42 billion, [[well ahead of|bỏ xa]] textiles ($25 billion) and food products ($18 billion). Over the next two decades, the value of machinery exports [[grew steadily|tăng đều]] to $55 billion in 2015 and $61 billion in 2025. Food exports [[followed a similar upward trend|có xu hướng tăng tương tự]], [[rising from|tăng từ]] $18 billion to $24 billion and then to $30 billion, {{although}} they [[remained well below|vẫn thấp hơn nhiều so với]] the value of machinery exports.

<<Thân bài 2>> Software services, {{by contrast}}, [[were negligible|không đáng kể]] in 2005, at only $4 billion, [[the lowest figure on the chart|con số thấp nhất trên biểu đồ]]. {{However}}, this figure [[almost quadrupled|tăng gần gấp bốn]] to $15 billion in 2015 and then [[more than doubled|tăng hơn gấp đôi]] to $38 billion in 2025, [[making it the second-largest category|đưa nhóm này lên vị trí lớn thứ hai]]. Textiles [[moved in the opposite direction|đi theo hướng ngược lại]]: their value [[fell from|giảm từ]] $25 billion to $19 billion and then [[slumped further to|lao dốc tiếp xuống]] $12 billion, [[less than half of|chưa bằng một nửa]] the 2005 figure.` },

    { id: 't1-volunteer', task: 1, ref: 'volunteer', band: '8.0', words: 179,
      text: `<<Mở bài>> The bar chart [[shows the proportion of|cho thấy tỉ lệ]] men and women in five age groups who [[did unpaid volunteer work|làm công việc tình nguyện không lương]] [[at least once a month|ít nhất mỗi tháng một lần]] in one country in 2023.

<<Tổng quan>> {{Overall}}, women [[were more likely than men to volunteer|có tỉ lệ tham gia tình nguyện cao hơn nam giới]] in every age group. {{In addition}}, [[for both sexes|ở cả hai giới]], participation was lowest among 25- to 34-year-olds and [[rose with age|tăng dần theo độ tuổi]] [[thereafter|sau đó]], [[peaking among|đạt đỉnh ở nhóm]] people aged 65 and over.

<<Thân bài 1>> Among the youngest group, aged 16 to 24, 18% of women volunteered, {{compared with}} 14% of men. These figures [[dipped to|giảm xuống]] 13% and 10% [[respectively|lần lượt]] for people aged 25 to 34, [[the lowest rates on the chart|những tỉ lệ thấp nhất trên biểu đồ]]. {{In other words}}, [[only around one in ten|chỉ khoảng một trên mười]] men in this age group [[took part in|tham gia]] volunteering on a regular basis.

<<Thân bài 2>> [[From the age of 35|Từ 35 tuổi trở đi]], volunteering [[became steadily more common|ngày càng phổ biến hơn]]. The rate for women [[climbed from|tăng từ]] 21% in the 35–49 group to 26% in the 50–64 group, {{while}} the corresponding figures for men were 15% and 19%. Volunteering was [[most widespread|phổ biến nhất]] among the over-65s, at 29% for women and 24% for men. {{Notably}}, [[the gap between the sexes|khoảng cách giữa hai giới]] was [[at its widest|lớn nhất]] in the 50–64 age group, where women [[outnumbered|vượt]] men by seven percentage points.` },

    { id: 't1-homewater', task: 1, ref: 'homewater', band: '8.0', words: 174,
      text: `<<Mở bài>> The pie charts [[illustrate how water was used|minh họa cách sử dụng nước]] in an average home in one country in 1995 and 2025, [[broken down into|được chia thành]] six categories.

<<Tổng quan>> {{Overall}}, showers and baths [[replaced|thay thế]] toilet flushing as [[the largest use of household water|mục đích sử dụng nước lớn nhất trong gia đình]]. {{In addition}}, [[the shares accounted for by|tỉ trọng của]] washing machines and gardens [[shrank|thu hẹp]], {{whereas}} the proportion [[classified as|được xếp vào nhóm]] other [[almost tripled|tăng gần gấp ba]].

<<Thân bài 1>> In 1995, toilet flushing [[accounted for|chiếm]] 31% of household water, [[slightly more than|nhiều hơn một chút so với]] showers and baths, at 27%. [[Three decades later|Ba thập kỷ sau]], {{however}}, [[the order had been reversed|thứ tự đã bị đảo ngược]]: showers and baths [[made up|chiếm]] 34%, [[roughly a third of|khoảng một phần ba]] the total, {{whereas}} the figure for toilets [[had fallen to|đã giảm xuống]] 22%. Washing machines [[followed a similar downward trend|có xu hướng giảm tương tự]], with their share [[dropping from|giảm từ]] 18% to 12%, [[a fall of one third|tức là giảm một phần ba]].

<<Thân bài 2>> [[Turning to the smaller categories|Xét đến các hạng mục nhỏ hơn]], water used in the kitchen and for drinking [[rose slightly|tăng nhẹ]] from 10% to 12%, [[so that it matched|bằng với]] the share for washing machines in 2025. {{By contrast}}, garden use [[fell from|giảm từ]] 9% to 6%, [[making it the smallest category|trở thành hạng mục nhỏ nhất]] in the later year. {{Finally}}, other uses [[grew the most in relative terms|tăng mạnh nhất xét theo tỉ lệ]], [[climbing from a mere|tăng từ mức chỉ vỏn vẹn]] 5% to 14%.` },

    { id: 't1-uniincome', task: 1, ref: 'uniincome', band: '8.0', words: 173,
      text: `<<Mở bài>> The two pie charts [[compare the sources of income|so sánh các nguồn thu]] of a university in 2005 and 2025.

<<Tổng quan>> {{Overall}}, the university [[became far less reliant on|trở nên ít phụ thuộc hơn nhiều vào]] government funding [[over the twenty-year period|trong giai đoạn hai mươi năm]], and by 2025 tuition fees [[had overtaken|đã vượt qua]] grants as its [[main source of income|nguồn thu chính]]. The other three sources [[contributed relatively small shares|đóng góp tỉ trọng tương đối nhỏ]] in both years.

<<Thân bài 1>> In 2005, government grants [[made up|chiếm]] 58% of the university's income, [[well over half|hơn một nửa khá nhiều]], {{while}} tuition fees [[accounted for|chiếm]] 24%, [[slightly less than a quarter|ít hơn một phần tư một chút]]. Two decades later, {{however}}, the share from grants [[had shrunk to|đã thu hẹp còn]] 36%, {{whereas}} the proportion from tuition fees [[had risen sharply to|đã tăng mạnh lên]] 41%, [[making them the largest single source|trở thành nguồn thu đơn lẻ lớn nhất]].

<<Thân bài 2>> [[As for the minor sources|Đối với các nguồn nhỏ hơn]], research contracts [[grew modestly|tăng nhẹ]] from 10% to 13%, {{and}} commercial activities [[doubled their share|tăng gấp đôi tỉ trọng]], [[rising from|tăng từ]] 3% to 6%. {{In contrast}}, donations were [[the only minor source to shrink|nguồn nhỏ duy nhất bị thu hẹp]], [[slipping from|giảm nhẹ từ]] 5% to 4%, {{so that}} they [[ranked last|xếp cuối cùng]] in 2025, [[having been overtaken by|sau khi bị vượt bởi]] commercial activities. {{As a result}}, [[the university's income became more diversified|nguồn thu của trường trở nên đa dạng hơn]], with [[no single source|không nguồn nào]] [[accounting for more than half of the total|chiếm hơn một nửa tổng thu]] by the end of the period.` },

    { id: 't1-evsales', task: 1, ref: 'evsales', band: '8.0', words: 181,
      text: `<<Mở bài>> The table [[gives information about|cung cấp thông tin về]] [[the proportion of new cars sold that were electric|tỉ lệ ô tô điện trong số ô tô mới bán ra]] in five countries in 2015, 2020 and 2025.

<<Tổng quan>> {{Overall}}, electric cars [[gained market share|giành thêm thị phần]] in all five countries, {{but}} Norland [[was far ahead of the others|bỏ xa các nước còn lại]] in every year. {{Meanwhile}}, growth in Belmark and Tiralia was [[much slower than elsewhere|chậm hơn nhiều so với các nước khác]].

<<Thân bài 1>> In 2015, 22% of new cars sold in Norland were electric, [[more than five times the figure for|cao hơn năm lần con số của]] Estavia, at 4%. The proportion in Norland [[more than doubled|tăng hơn gấp đôi]] to 54% in 2020 and [[soared to|tăng vọt lên]] 89% in 2025, {{meaning that}} [[almost nine in ten new cars|gần chín trên mười ô tô mới]] were electric. Estavia and Corvania [[also saw rapid growth|cũng tăng trưởng nhanh]], [[particularly|đặc biệt]] in the second half of the period: Estavia's figure [[rose from|tăng từ]] 11% to 38%, {{while}} Corvania's [[jumped from|tăng vọt từ]] 6% to 27%, [[having started at|sau khi khởi đầu ở mức]] just 1%.

<<Thân bài 2>> {{By contrast}}, the market for electric cars in Belmark [[developed slowly|phát triển chậm]]. Its share was 3% in 2015, [[only slightly below|chỉ thấp hơn một chút so với]] that of Estavia, {{but}} it [[had reached only|chỉ đạt]] 9% by 2025. Tiralia [[had the smallest share|có tỉ lệ thấp nhất]] [[throughout|trong suốt giai đoạn]], at a [[negligible|không đáng kể]] 0.5% in 2015, rising to 2% in 2020 and 4% in 2025. {{Consequently}}, [[fewer than one in twenty|chưa đến một phần hai mươi]] new cars in Tiralia were electric at the end of the period.` },

    { id: 't1-hotels', task: 1, ref: 'hotels', band: '8.0', words: 199,
      text: `<<Mở bài>> The table [[presents data on|trình bày số liệu về]] the hotel sector in five coastal towns in 2024, [[in terms of|xét về]] the number of hotels, the average nightly room price and the average occupancy rate.

<<Tổng quan>> {{Overall}}, [[there was a clear inverse relationship between|có mối quan hệ nghịch rõ ràng giữa]] the number of hotels and room prices. The towns with the most hotels [[charged the least|có giá phòng thấp nhất]] and [[had the highest occupancy rates|có tỉ lệ lấp đầy cao nhất]], {{whereas}} Port Elric, [[the most expensive destination|điểm đến đắt đỏ nhất]], had the fewest hotels and the lowest occupancy.

<<Thân bài 1>> Sandhaven had [[the most hotels|nhiều khách sạn nhất]], at 65, {{and}} [[it was also the cheapest|đây cũng là nơi rẻ nhất]], with an average room price of $72 per night. Its hotels were the fullest, with 88% of rooms occupied. Bayford [[ranked second|xếp thứ hai]] [[in terms of hotel numbers|về số lượng khách sạn]], at 48, {{and}} its rooms cost $85 on average, with an occupancy rate of 82%.

<<Thân bài 2>> [[At the other end of the scale|Ở thái cực ngược lại]], Port Elric had only 12 hotels, {{yet}} its rooms [[were the most expensive|đắt nhất]], at $210 a night, [[nearly three times the price in|gần gấp ba giá phòng ở]] Sandhaven. {{Despite}} [[this limited supply|nguồn cung hạn chế này]], only 61% of its rooms were filled. Cliffmouth, with 23 hotels, was [[the second most expensive town|thị trấn đắt đỏ thứ hai]], at $140, and [[recorded an occupancy rate of|ghi nhận tỉ lệ lấp đầy]] 76%, {{while}} the 30 hotels in Gullwick charged $98 on average and were 79% full, [[placing the town in the middle on every measure|đưa thị trấn này vào vị trí giữa ở mọi tiêu chí]].` },

    { id: 't1-honey', task: 1, ref: 'honey', band: '8.0', words: 198,
      text: `<<Mở bài>> The diagram [[illustrates the process by which|minh họa quy trình mà qua đó]] honey [[is produced by bees|được ong tạo ra]] and then [[prepared for sale|chuẩn bị để bán]].

<<Tổng quan>> {{Overall}}, the process [[consists of eight stages|gồm tám giai đoạn]], [[starting with|bắt đầu bằng]] the collection of nectar from flowers and [[ending with|kết thúc bằng]] the bottling of the finished honey. The first four stages [[are carried out by the bees themselves|do chính những con ong thực hiện]], {{whereas}} the remaining four [[are performed by beekeepers|do người nuôi ong thực hiện]].

<<Thân bài 1>> {{First}}, bees [[gather nectar|thu thập mật hoa]] from flowers and [[carry it back to|mang về]] the hive, where it [[is deposited in|được đưa vào]] the cells of the honeycomb. {{Next}}, the bees [[fan their wings|quạt cánh]] [[over the stored nectar|trên lớp mật hoa đã lưu trữ]] {{so that}} [[excess water evaporates|lượng nước thừa bay hơi]] and the liquid [[gradually thickens into honey|dần đặc lại thành mật ong]]. {{Once}} the honey [[is ready|đã sẵn sàng]], each cell [[is sealed with a cap of wax|được bịt kín bằng một nắp sáp]].

<<Thân bài 2>> {{At this point}}, the beekeeper [[takes over|tiếp quản]]. The frames of honeycomb [[are removed from the hive|được lấy ra khỏi tổ]], {{and}} the wax caps [[are sliced off|được cắt bỏ]] [[to expose the honey|để lộ phần mật]]. The frames [[are then placed in|sau đó được đặt vào]] a centrifuge, a machine which [[spins rapidly|quay rất nhanh]] [[in order to|để]] [[force the honey out of the cells|đẩy mật ra khỏi các ô]]. {{After that}}, the honey [[is filtered|được lọc]] to remove [[any remaining wax and impurities|phần sáp và tạp chất còn sót lại]]. {{Finally}}, it [[is poured into jars|được rót vào lọ]], which [[are labelled|được dán nhãn]] and [[made ready for sale|sẵn sàng để bán]] to consumers.` },

    { id: 't1-campus', task: 1, ref: 'campus', band: '8.0', words: 193,
      text: `<<Mở bài>> The maps [[illustrate the changes that have taken place|minh họa những thay đổi đã diễn ra]] on a university campus [[between 2005 and the present day|từ năm 2005 đến nay]].

<<Tổng quan>> {{Overall}}, the campus [[has been extensively redeveloped|đã được cải tạo trên diện rộng]], with the sports field and the woodland [[disappearing to make way for|biến mất để nhường chỗ cho]] new facilities, including student housing and a science centre. {{However}}, the library and the lecture halls [[have remained in their original positions|vẫn ở vị trí ban đầu]].

<<Thân bài 1>> In 2005, the area to the west of the main road [[was occupied by|có]] the library in the north and [[a large sports field|một sân thể thao rộng]] [[covering the rest of the land|chiếm phần đất còn lại]]. {{While}} the library [[is still standing|vẫn còn đó]], the sports field [[has been replaced by|đã được thay thế bằng]] two buildings: a block of student housing in the centre of the western side and an indoor sports hall [[to the south of it|ở phía nam của khu này]].

<<Thân bài 2>> On the eastern side, the car park in the north-east corner [[has been demolished|đã bị phá bỏ]] and a science centre [[has been constructed|đã được xây dựng]] [[in its place|ở vị trí đó]]. The lecture halls in the centre [[have been retained|được giữ lại]], {{but}} the woodland to the south [[has been cleared|đã bị phát quang]], {{and}} the car park [[has been relocated|đã được di dời]] there. {{In short}}, the campus [[now offers|giờ đây có]] more accommodation and teaching facilities, [[at the expense of|với cái giá là mất đi]] its green space.` },
  ]);
  /* ===== Lô 7 (tự biên soạn – DỮ LIỆU MINH HỌA, không phải số liệu thật): 6 đề đủ 6 dạng ===== */
  g.TASK1_MORE = g.TASK1_MORE.concat([
    { id: 'airports', type: 'line', title: 'The line graph shows the number of passengers (in millions) who used three airports in one country between 2000 and 2025.',
      x: ['2000', '2005', '2010', '2015', '2020', '2025'], unit: 'million',
      series: [['Northfield', [12, 15, 19, 24, 8, 26]], ['Eastport', [8, 9, 9, 10, 4, 11]], ['Lakeside', [2, 4, 7, 11, 3, 14]]],
      overview: 'Overall, passenger numbers at all three airports rose over the period despite a sharp fall in 2020; Northfield was the busiest airport throughout, while Lakeside grew the fastest and overtook Eastport from 2015 onwards.' },
    { id: 'crops', type: 'bar', title: 'The bar chart shows the production of wheat, rice and maize (in millions of tonnes) in four regions of a country in 2023.',
      x: ['North', 'South', 'East', 'West'], unit: 'million tonnes',
      series: [['Wheat', [24, 6, 15, 10]], ['Rice', [3, 21, 9, 4]], ['Maize', [8, 12, 18, 5]]],
      overview: 'Overall, each region specialised in a different crop: the North produced mainly wheat, the South mainly rice and the East mainly maize, and the East had the highest total output, whereas the West produced the least.' },
    { id: 'homepower', type: 'pie', title: 'The pie charts show how electricity was used in an average household in one country in 1995 and 2025.',
      pies: [['1995', [['Heating', 38], ['Kitchen appliances', 22], ['Lighting', 20], ['Electronics', 8], ['Other', 12]]], ['2025', [['Heating', 30], ['Kitchen appliances', 19], ['Lighting', 7], ['Electronics', 26], ['Other', 18]]]],
      overview: 'Overall, heating remained the largest use of household electricity in both years, but the most striking changes were the sharp rise in the share used by electronic devices and the steep fall in the proportion used for lighting.' },
    { id: 'ageing', type: 'table', title: 'The table shows the population, the percentage of people aged 65 and over, and the average life expectancy in five countries in 2024.',
      head: ['Country', 'Population (millions)', 'Aged 65+ (%)', 'Life expectancy (years)'],
      rows: [['Aldoria', 82, 23, 82.4], ['Bresnia', 47, 19, 80.1], ['Calvara', 31, 12, 76.5], ['Dunmore', 12, 27, 84.0], ['Elvany', 6, 8, 71.2]],
      overview: 'Overall, countries with a higher proportion of older people also tended to have a longer life expectancy; Dunmore had the oldest population and the longest-lived citizens despite its small size, whereas Elvany was the youngest country with the lowest life expectancy.' },
    { id: 'chocolate', type: 'process', title: 'The diagram shows how chocolate is produced from cocoa beans.',
      steps: ['Ripe cocoa pods are harvested from cocoa trees', 'The pods are split open and the beans are removed', 'The beans are fermented under banana leaves for about a week', 'The beans are dried in the sun', 'The dried beans are packed into sacks and shipped to factories', 'The beans are roasted and their shells are removed', 'The inner parts (nibs) are ground into a thick liquid called cocoa liquor', 'Sugar and milk are added, and the mixture is poured into moulds to form bars'],
      overview: 'Overall, chocolate production involves eight stages, starting with the harvesting of cocoa pods and ending with the moulding of chocolate bars; the first five stages take place on the farm, while the final three are carried out in a factory.' },
    { id: 'mainstreet', type: 'map', title: 'The maps show the area on either side of Main Street in a city in 1990 and today.',
      maps: [['1990', [['Factory', 1, 1, 2, 2, '#64748b'], ['Warehouses', 1, 3, 2, 1, '#94a3b8'], ['Houses', 3, 1, 2, 1, '#f59e0b'], ['Bus depot', 3, 2, 2, 1, '#0ea5a4'], ['Open land', 3, 3, 2, 1, '#16a34a']]],
             ['Today', [['Apartments', 1, 1, 2, 1, '#c026d3'], ['Shopping centre', 1, 2, 2, 1, '#e5484d'], ['Park', 1, 3, 2, 1, '#16a34a'], ['Houses', 3, 1, 2, 1, '#f59e0b'], ['Library', 3, 2, 2, 1, '#6d5dfc'], ['Car park', 3, 3, 2, 1, '#94a3b8']]]],
      overview: 'Overall, the industrial area to the west of Main Street has been completely transformed into a residential, shopping and leisure district, whereas the eastern side has changed less, with the houses remaining but the bus depot and the open land being replaced.' },
  ]);

  g.MODELS = g.MODELS.concat([
    { id: 't1-airports', task: 1, ref: 'airports', band: '8.0', words: 178,
      text: `<<Mở bài>> The line graph [[illustrates|minh họa]] how many passengers used three airports, Northfield, Eastport and Lakeside, [[at five-year intervals|cách nhau năm năm]] between 2000 and 2025.

<<Tổng quan>> {{Overall}}, passenger numbers at all three airports increased over the period, [[despite a sharp fall in 2020|mặc dù giảm mạnh vào năm 2020]]. Northfield was by far the busiest airport throughout, while Lakeside [[recorded the fastest growth|ghi nhận mức tăng nhanh nhất]].

<<Thân bài 1>> Northfield [[handled|tiếp nhận]] 12 million passengers in 2000, and this figure [[rose steadily|tăng đều]] to a peak of 24 million in 2015. {{After}} [[plummeting to|lao dốc xuống]] just 8 million in 2020, it [[recovered strongly|phục hồi mạnh]] to reach 26 million in 2025, the highest figure on the graph.

<<Thân bài 2>> Eastport and Lakeside began the period with much lower numbers, at 8 million and 2 million respectively. Eastport [[remained relatively stable|tương đối ổn định]] at around 9 to 10 million until 2015, {{whereas}} Lakeside grew rapidly and [[overtook|vượt qua]] Eastport in 2015, with 11 million passengers compared with 10 million. {{Both}} airports also [[experienced a dramatic drop|trải qua một đợt sụt giảm mạnh]] in 2020, to 4 million and 3 million, {{before}} recovering. By 2025, Lakeside had [[climbed to|tăng lên]] 14 million, seven times its 2000 level, while Eastport had reached only 11 million.`,
      pitfalls: ['Bỏ qua điểm bất thường năm 2020: phải nhắc trong tổng quan vì đó là đặc điểm nổi bật nhất của biểu đồ.', 'Liệt kê từng năm của từng sân bay → bài dài và rời rạc; nên nhóm Eastport và Lakeside để so sánh.', 'Dùng sai thì: số liệu quá khứ phải dùng quá khứ đơn (rose, fell), mốc "By 2025" dùng quá khứ hoàn thành (had climbed).', 'Viết "the passengers of Northfield increased" – sai chủ ngữ; đúng là "the number of passengers at Northfield increased".'],
      vocab: [['rise steadily', 'tăng đều'], ['plummet to', 'lao dốc xuống'], ['recover strongly', 'phục hồi mạnh'], ['reach a peak of', 'đạt đỉnh'], ['remain relatively stable', 'tương đối ổn định'], ['overtake', 'vượt qua'], ['respectively', 'lần lượt'], ['seven times its 2000 level', 'gấp bảy lần mức năm 2000']] },

    { id: 't1-crops', task: 1, ref: 'crops', band: '8.0', words: 210,
      text: `<<Mở bài>> The bar chart [[compares|so sánh]] the amount of wheat, rice and maize produced in four regions of a country in 2023, [[measured in millions of tonnes|tính bằng triệu tấn]].

<<Tổng quan>> {{Overall}}, each region [[specialised in a different crop|chuyên về một loại cây trồng khác nhau]]: wheat [[dominated|chiếm ưu thế]] in the North, rice in the South and maize in the East. The East had the highest [[total output|tổng sản lượng]], {{whereas}} the West produced the least.

<<Thân bài 1>> The North was [[by far the largest producer of wheat|nhà sản xuất lúa mì lớn nhất, bỏ xa các vùng khác]], with 24 million tonnes, which was four times the amount grown in the South. {{However}}, it produced only 8 million tonnes of maize and a [[negligible|không đáng kể]] 3 million tonnes of rice. {{In contrast}}, the South [[led the way in|dẫn đầu về]] rice production at 21 million tonnes, {{followed by}} 12 million tonnes of maize and just 6 million tonnes of wheat.

<<Thân bài 2>> The East had [[the most balanced output|sản lượng cân bằng nhất]] of the four regions. Maize was its main crop at 18 million tonnes, the highest figure for this crop, and it also produced 15 million tonnes of wheat and 9 million tonnes of rice, giving a total of 42 million tonnes. The West, {{meanwhile}}, [[lagged behind|tụt lại phía sau]] the other regions, producing 10 million tonnes of wheat but only 5 and 4 million tonnes of maize and rice respectively, a total of just 19 million tonnes.`,
      pitfalls: ['Mô tả từng cột theo thứ tự trên biểu đồ mà không so sánh – Task 1 chấm khả năng "make comparisons".', 'Tổng quan chỉ nói "there are differences" – quá chung; cần nêu đặc điểm cụ thể (mỗi vùng chuyên một cây, vùng nào tổng cao/thấp nhất).', 'Dùng "increase/decrease" cho biểu đồ cột một thời điểm – không có thay đổi theo thời gian nên không dùng từ chỉ xu hướng.', 'Thiếu đơn vị (million tonnes) hoặc viết "24 millions tonnes" – sai: "24 million tonnes".'],
      vocab: [['by far the largest producer', 'nhà sản xuất lớn nhất, bỏ xa'], ['four times the amount', 'gấp bốn lần lượng'], ['negligible', 'không đáng kể'], ['lead the way in', 'dẫn đầu về'], ['followed by', 'tiếp theo là'], ['lag behind', 'tụt lại phía sau'], ['respectively', 'lần lượt'], ['total output', 'tổng sản lượng']] },

    { id: 't1-homepower', task: 1, ref: 'homepower', band: '8.0', words: 160,
      text: `<<Mở bài>> The two pie charts [[illustrate|minh họa]] the proportion of electricity used for five purposes in an average household in one country in 1995 and 2025.

<<Tổng quan>> {{Overall}}, heating [[accounted for|chiếm]] the largest share of household electricity in both years. The most [[striking|nổi bật]] changes were [[a sharp rise in|sự tăng mạnh của]] the proportion used by electronic devices and [[a steep fall in|sự giảm mạnh của]] the share used for lighting.

<<Thân bài 1>> In 1995, heating [[made up|chiếm]] 38% of electricity use, followed by kitchen appliances at 22% and lighting at 20%. Electronics [[represented|chiếm]] only 8%, {{while}} other uses accounted for 12%.

<<Thân bài 2>> By 2025, the [[pattern had changed considerably|cơ cấu đã thay đổi đáng kể]]. {{Although}} heating was still the main use, its share had [[dropped to|giảm xuống]] 30%. The proportion used by electronic devices more than tripled to 26%, making them the second largest category, {{whereas}} lighting [[shrank to|thu hẹp còn]] just 7%, [[almost a third of its earlier level|gần bằng một phần ba mức trước đó]]. Kitchen appliances [[saw a slight decline|giảm nhẹ]] to 19%, and the share of other uses [[grew from|tăng từ]] 12% to 18%.`,
      pitfalls: ['Viết "electronics increased" – biểu đồ tròn cho TỈ LỆ, phải nói "the proportion/share of electricity used by electronics increased".', 'Không nhắc rằng heating vẫn lớn nhất ở cả hai năm – đây là điểm chung quan trọng cho tổng quan.', 'Liệt kê đủ 10 con số rời rạc; nên nhóm theo xu hướng (tăng: electronics, other; giảm: heating, lighting, kitchen).', 'Dùng thì hiện tại cho năm 1995 – phải dùng quá khứ đơn.'],
      vocab: [['account for', 'chiếm (tỉ lệ)'], ['make up', 'chiếm'], ['the proportion of', 'tỉ lệ của'], ['more than triple', 'tăng hơn gấp ba'], ['shrink to', 'thu hẹp còn'], ['a slight decline', 'sự giảm nhẹ'], ['the second largest category', 'hạng mục lớn thứ hai'], ['striking', 'nổi bật']] },

    { id: 't1-ageing', task: 1, ref: 'ageing', band: '8.0', words: 208,
      text: `<<Mở bài>> The table [[presents data on|trình bày số liệu về]] the population size, the percentage of people aged 65 or over and average life expectancy in five countries in 2024.

<<Tổng quan>> {{Overall}}, countries with [[a higher proportion of older people|tỉ lệ người cao tuổi cao hơn]] generally had a longer life expectancy. Dunmore had the oldest population and the longest-lived citizens {{despite}} its small size, {{whereas}} Elvany was the youngest country and had the lowest life expectancy.

<<Thân bài 1>> Aldoria was [[the most populous country|quốc gia đông dân nhất]], with 82 million people, [[far more than|nhiều hơn hẳn]] Bresnia, which had 47 million. In both countries, around a fifth of the population was aged 65 or over (23% and 19% respectively), and people could expect to live to just over 80. Calvara, with 31 million inhabitants, had a [[noticeably younger|trẻ hơn rõ rệt]] population, as only 12% of its citizens were over 65, and life expectancy was lower at 76.5 years.

<<Thân bài 2>> The two smallest countries [[stood at opposite ends of the scale|nằm ở hai thái cực]]. Dunmore, with a population of only 12 million, had the highest share of older people at 27%, and its citizens lived the longest, at 84 years on average. {{By contrast}}, in Elvany, which had just 6 million people, only 8% of the population was over 65, and life expectancy was 71.2 years, almost 13 years [[shorter than|ngắn hơn]] in Dunmore.`,
      pitfalls: ['Chép lại toàn bộ bảng thành câu – nên chọn số liệu nổi bật và so sánh.', 'Không tìm ra mối liên hệ giữa các cột (tỉ lệ người già cao ↔ tuổi thọ cao) – đây là ý tổng quan có giá trị nhất.', 'Viết "Dunmore has the highest people over 65" – thiếu danh từ: "the highest proportion of people aged over 65".', 'Thêm giải thích nguyên nhân (y tế tốt hơn…) – Task 1 chỉ mô tả, không suy đoán.'],
      vocab: [['the most populous', 'đông dân nhất'], ['life expectancy', 'tuổi thọ trung bình'], ['far more than', 'nhiều hơn hẳn'], ['around a fifth of', 'khoảng một phần năm'], ['stand at opposite ends of the scale', 'nằm ở hai thái cực'], ['by contrast', 'ngược lại'], ['inhabitants', 'cư dân'], ['respectively', 'lần lượt']] },

    { id: 't1-chocolate', task: 1, ref: 'chocolate', band: '8.0', words: 174,
      text: `<<Mở bài>> The diagram [[illustrates the stages involved in|minh họa các giai đoạn trong]] turning cocoa beans into chocolate.

<<Tổng quan>> {{Overall}}, the process consists of eight stages, beginning with the harvesting of cocoa pods and [[culminating in|kết thúc bằng]] the production of chocolate bars. The first five stages take place on the farm, {{while}} the final three [[are carried out|được thực hiện]] in a factory.

<<Thân bài 1>> {{At the first stage}}, ripe cocoa pods [[are harvested|được thu hoạch]] from cocoa trees. They are then split open so that the beans can be removed. {{Next}}, the beans are covered with banana leaves and [[left to ferment|để lên men]] for about a week, {{after which}} they are spread out and [[dried in the sun|phơi khô dưới nắng]]. {{Once}} they are dry, the beans are packed into sacks and shipped to chocolate factories.

<<Thân bài 2>> {{On arrival}}, the beans are roasted, and their shells [[are removed|được bóc bỏ]]. The inner parts, known as nibs, are {{then}} [[ground into|nghiền thành]] a thick liquid called cocoa liquor. {{In the final stage}}, sugar and milk are added to this liquid, and the mixture is [[poured into moulds|đổ vào khuôn]] to form chocolate bars, which are ready for sale.`,
      pitfalls: ['Dùng chủ động "farmers harvest the pods" khắp bài – mô tả quy trình nên dùng bị động (are harvested, are roasted).', 'Không có tổng quan (số giai đoạn, điểm đầu – điểm cuối, hai địa điểm) – mất điểm Task Achievement nặng.', 'Chép nguyên nhãn trên sơ đồ; cần biến thành câu hoàn chỉnh và nối bằng từ chỉ trình tự đa dạng.', 'Lặp "then… then… then"; thay bằng Next, After that, Once…, after which, In the final stage.'],
      vocab: [['consist of', 'gồm có'], ['culminate in', 'kết thúc bằng'], ['be carried out', 'được thực hiện'], ['after which', 'sau đó (mệnh đề quan hệ)'], ['once + mệnh đề', 'một khi, sau khi'], ['on arrival', 'khi được chuyển đến'], ['be ground into', 'được nghiền thành'], ['in the final stage', 'ở giai đoạn cuối']] },

    { id: 't1-mainstreet', task: 1, ref: 'mainstreet', band: '8.0', words: 171,
      text: `<<Mở bài>> The two maps [[illustrate the changes|minh họa những thay đổi]] that have taken place on either side of Main Street in a city [[since 1990|kể từ năm 1990]].

<<Tổng quan>> {{Overall}}, the industrial area to the west of Main Street [[has been completely transformed|đã được biến đổi hoàn toàn]] into a residential, shopping and leisure district. The eastern side has changed less, {{although}} two of its three sites have been [[put to new uses|chuyển sang mục đích sử dụng mới]].

<<Thân bài 1>> In 1990, the west of the area [[was dominated by|chủ yếu là]] a large factory, which [[occupied|chiếm]] the northern and central parts, with warehouses to the south. Today, both the factory and the warehouses [[have been demolished|đã bị phá bỏ]]. {{In their place}}, an apartment block [[has been built|đã được xây]] in the north, a shopping centre now stands in the middle, and the southern section [[has been converted into|đã được chuyển thành]] a park.

<<Thân bài 2>> On the eastern side of Main Street, the houses in the north [[have remained unchanged|vẫn giữ nguyên]]. {{However}}, the bus depot in the centre has been replaced by a library, and the open land in the south, which was previously undeveloped, [[has been turned into|đã được biến thành]] a car park.`,
      pitfalls: ['Dùng thì sai: tình trạng hiện tại so với quá khứ nên dùng hiện tại hoàn thành bị động (has been demolished, has been built).', 'Không dùng phương hướng (north, south, to the west of) → người đọc không hình dung được vị trí.', 'Mô tả hai bản đồ riêng rẽ từng cái; nên đối chiếu từng khu vực "trước – sau".', 'Quên nhắc phần không đổi (the houses) – nêu điều giữ nguyên cũng là một so sánh quan trọng.'],
      vocab: [['be demolished', 'bị phá bỏ'], ['be replaced by', 'được thay thế bằng'], ['be converted into', 'được chuyển đổi thành'], ['remain unchanged', 'giữ nguyên'], ['be dominated by', 'chủ yếu là'], ['in their place', 'ở vị trí của chúng'], ['to the west of', 'ở phía tây của'], ['previously undeveloped', 'trước đây chưa được xây dựng']] },
  ]);
})(typeof self !== 'undefined' ? self : this);
