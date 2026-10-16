/* Bài đọc IELTS (tự biên soạn). Người học chạm vào từ để tra & lưu kèm ngữ cảnh. */
(function (g) {
  g.READINGS = [
    {
      id: 'urban-farming',
      title: 'The Rise of Urban Farming',
      topic: 'environment',
      level: 'B1',
      emoji: '🌱',
      summaryVi: 'Nông nghiệp đô thị đang phát triển ở nhiều thành phố, mang lại thực phẩm tươi và lợi ích xã hội nhưng vẫn gặp khó khăn về chi phí và đất đai.',
      text: `For most of history, food was grown in the countryside and carried into towns. Today, however, a growing number of people are producing fruit and vegetables inside cities. This practice, known as urban farming, can take many forms, from small gardens on rooftops to large indoor farms in old warehouses.

One reason for its popularity is the wish to eat fresh, local food. When vegetables are grown close to where people live, they do not need to travel long distances by lorry or plane. Supporters argue that this can reduce pollution and help cities become more sustainable. In addition, food that is picked on the same day it is sold often tastes better and keeps more of its nutrients.

Urban farms also bring social benefits. In many neighbourhoods, community gardens give residents a place to meet, share skills and spend time outdoors. Teachers sometimes use school gardens to show children where their food comes from, and some studies suggest that young people who take part are more willing to try new vegetables. For older residents, gardening can be a gentle form of exercise.

Nevertheless, urban farming faces several challenges. Land in cities is expensive, so farmers may struggle to find suitable space. Indoor farms, which use artificial light instead of sunlight, can consume a great deal of electricity. As a result, the yield from these farms must be high enough to cover their costs. Soil in some urban areas may also contain harmful substances left by old factories, which means it has to be tested carefully before anything is planted.

Despite these problems, many experts believe that urban farming will continue to expand. It is unlikely to replace traditional agriculture completely, but it could become an important supplement, especially in crowded cities where fresh produce is hard to find.`,
      keywords: ['sustainable', 'yield', 'residents', 'nutrients', 'pollution', 'artificial', 'consume', 'supplement', 'produce', 'agriculture', 'expand'],
      questions: [
        { type: 'tfng', q: 'Urban farming only takes place on the roofs of buildings.', answer: 'FALSE', explain: 'Bài nói nông nghiệp đô thị có nhiều dạng "from small gardens on rooftops to large indoor farms in old warehouses", không chỉ trên mái nhà → FALSE.' },
        { type: 'tfng', q: 'Vegetables picked on the day they are sold may contain more nutrients.', answer: 'TRUE', explain: 'Bài viết: food picked on the same day "often tastes better and keeps more of its nutrients" → TRUE.' },
        { type: 'tfng', q: 'Most city governments provide free land for community gardens.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói đất đô thị đắt ("Land in cities is expensive"), không đề cập chính quyền cấp đất miễn phí → NOT GIVEN.' },
        { type: 'mcq', q: 'Why might soil in some urban areas need to be tested?', options: ['It lacks sunlight.', 'It may contain harmful substances from old factories.', 'It is too expensive to buy.', 'It uses too much electricity.'], answer: 1, explain: 'Bài viết: soil "may also contain harmful substances left by old factories".' },
        { type: 'mcq', q: 'What do many experts think about the future of urban farming?', options: ['It will completely replace traditional agriculture.', 'It will soon disappear because of high costs.', 'It will grow and act as a supplement to traditional farming.', 'It will only be found in schools.'], answer: 2, explain: 'Bài viết: "unlikely to replace traditional agriculture completely, but it could become an important supplement".' },
      ],
    },
    {
      id: 'four-day-week',
      title: 'The Four-Day Working Week',
      topic: 'work',
      level: 'B2',
      emoji: '📅',
      summaryVi: 'Tuần làm việc bốn ngày được thử nghiệm ở nhiều nơi; kết quả ban đầu khả quan về năng suất và sức khỏe, nhưng không phù hợp với mọi ngành.',
      text: `The idea that people should work five days a week is so familiar that it is easy to forget it is a relatively recent invention. In the early twentieth century, many factory workers laboured for six days, and the two-day weekend was only gradually adopted. Today, a new proposal is attracting attention: reducing the standard week to four days without cutting pay.

Advocates of the four-day week claim that it can boost productivity rather than reduce it. Their reasoning is that employees who are well rested tend to concentrate better and waste less time. Trials carried out by companies and researchers in several countries have reported encouraging results, with many participating firms stating that output remained stable while staff reported lower levels of stress and burnout. Some organisations also found it easier to recruit and retain skilled workers, as the shorter week was seen as an attractive benefit.

However, critics point out that these trials have limitations. Most of the businesses involved volunteered to take part, which suggests they may have been particularly well suited to the change. In addition, the findings often rely on self-reported data, which can be influenced by participants' enthusiasm for the scheme. It is therefore difficult to know whether the same outcomes would be achieved across the wider economy.

Certain sectors face particular obstacles. Hospitals, schools and public transport, for example, must provide services every day, so a reduced week would require more staff or complex rotas. In such cases, the cost of implementation could be considerable. Small businesses with only a handful of employees may also struggle to cover absences.

For these reasons, many analysts expect a gradual and uneven shift rather than a sudden transformation. Some companies may adopt a full four-day week, while others experiment with flexible arrangements, such as compressed hours or reduced Friday shifts. Whatever form it takes, the debate reflects a broader question about how societies balance economic growth with wellbeing.`,
      keywords: ['productivity', 'burnout', 'retain', 'recruit', 'advocates', 'implementation', 'sectors', 'self-reported', 'wellbeing', 'compressed', 'gradual', 'output'],
      questions: [
        { type: 'tfng', q: 'The two-day weekend was introduced suddenly in the early twentieth century.', answer: 'FALSE', explain: 'Bài viết nói cuối tuần hai ngày "was only gradually adopted" (được áp dụng dần dần), không phải đột ngột → FALSE.' },
        { type: 'tfng', q: 'Some organisations in the trials found it easier to keep skilled staff.', answer: 'TRUE', explain: 'Bài viết: "Some organisations also found it easier to recruit and retain skilled workers" → TRUE.' },
        { type: 'tfng', q: 'Employees in the trials were required to work longer hours on the remaining four days.', answer: 'NOT GIVEN', explain: 'Bài chỉ nhắc "compressed hours" như một lựa chọn trong tương lai, không nói người tham gia thử nghiệm phải làm thêm giờ → NOT GIVEN.' },
        { type: 'mcq', q: 'Why do critics doubt the trial results?', options: ['The trials lasted only a few days.', 'Participating companies volunteered and data were often self-reported.', 'Workers were paid less during the trials.', 'Only hospitals took part.'], answer: 1, explain: 'Bài viết: "Most of the businesses involved volunteered" và "findings often rely on self-reported data".' },
        { type: 'mcq', q: 'According to the passage, why might hospitals find a four-day week difficult?', options: ['They must operate every day.', 'Their staff dislike flexible hours.', 'They cannot measure productivity.', 'They have too few patients.'], answer: 0, explain: 'Bài viết: hospitals, schools and public transport "must provide services every day".' },
      ],
    },
    {
      id: 'ocean-microplastics',
      title: 'Microplastics in the Ocean',
      topic: 'environment',
      level: 'B2',
      emoji: '🌊',
      summaryVi: 'Vi nhựa xuất hiện khắp đại dương từ nhiều nguồn khác nhau; tác động lâu dài còn chưa rõ và cần giải pháp từ gốc.',
      text: `Plastic has transformed modern life, but its durability has created a serious environmental problem. Once plastic reaches the sea, it does not simply disappear. Instead, sunlight, waves and changes in temperature gradually break it into smaller and smaller fragments. Pieces less than five millimetres across are known as microplastics, and scientists now detect them in almost every marine environment they examine, from coastal waters to the deep ocean floor.

Microplastics come from a variety of sources. Some are the result of larger items, such as bottles and fishing nets, breaking down over time. Others are released directly in tiny form. Synthetic clothing, for instance, can shed fibres when it is washed, and these may pass through water treatment systems and eventually flow into rivers and seas. Vehicle tyres also wear away on roads, producing particles that are carried by rainwater into drainage systems.

The consequences for marine life are a cause of growing concern. Small animals such as plankton and shellfish can mistake microplastics for food. Researchers worry that the particles may accumulate as they move up the food chain, potentially affecting larger fish and, ultimately, humans who eat seafood. Laboratory studies suggest that some organisms grow more slowly when exposed to high concentrations, although it remains unclear whether similar effects occur in natural conditions.

Tackling the problem is complicated because microplastics are extremely difficult to remove once they are dispersed in the water. Cleaning the open ocean on a large scale is generally considered impractical. Consequently, many experts argue that prevention is more effective than cure. Proposed measures include improving waste management, designing washing machines with better filters, and encouraging manufacturers to use materials that degrade more safely.

Ultimately, the issue highlights the hidden costs of convenience. Reducing microplastic pollution will require cooperation between governments, industry and consumers, as well as further research into the long-term effects on ecosystems.`,
      keywords: ['durability', 'fragments', 'synthetic', 'shed', 'accumulate', 'concentrations', 'dispersed', 'impractical', 'degrade', 'ecosystems', 'organisms', 'marine'],
      questions: [
        { type: 'tfng', q: 'Microplastics have been found in the deep ocean as well as in coastal waters.', answer: 'TRUE', explain: 'Bài viết: scientists detect them "from coastal waters to the deep ocean floor" → TRUE.' },
        { type: 'tfng', q: 'Water treatment systems remove all fibres released from synthetic clothing.', answer: 'FALSE', explain: 'Bài viết nói sợi vải "may pass through water treatment systems" để ra sông biển, nên không bị loại bỏ hết → FALSE.' },
        { type: 'tfng', q: 'Microplastics from tyres are more harmful than those from clothing.', answer: 'NOT GIVEN', explain: 'Bài chỉ liệt kê lốp xe và quần áo là nguồn vi nhựa, không so sánh mức độ gây hại → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the passage say about laboratory studies?', options: ['They prove humans are harmed by seafood.', 'They show some organisms grow more slowly at high concentrations.', 'They found no effect on marine life.', 'They were carried out in the open ocean.'], answer: 1, explain: 'Bài viết: "some organisms grow more slowly when exposed to high concentrations".' },
        { type: 'mcq', q: 'Why do many experts favour prevention?', options: ['Cleaning the open ocean on a large scale is impractical.', 'Microplastics disappear naturally.', 'Prevention is cheaper for consumers.', 'Governments have banned plastic.'], answer: 0, explain: 'Bài viết: "Cleaning the open ocean on a large scale is generally considered impractical. Consequently... prevention is more effective".' },
      ],
    },
    {
      id: 'sleep-memory',
      title: 'How Sleep Affects Memory',
      topic: 'health',
      level: 'B1',
      emoji: '😴',
      summaryVi: 'Giấc ngủ giúp não củng cố trí nhớ; thiếu ngủ làm giảm khả năng học tập, nên học sinh không nên thức khuya ôn bài.',
      text: `Many students believe that staying up late to study is the best way to prepare for an exam. However, scientists who study the brain increasingly suggest that this habit may do more harm than good. Sleep, it seems, plays an essential role in helping us remember what we have learned.

When we learn something new, the information is first stored in a temporary form. During sleep, the brain appears to replay and organise these new memories, moving them into longer-term storage. This process is often called consolidation. Researchers believe that different stages of sleep may support different types of memory. For example, deep sleep may help us remember facts, while the dreaming stage may be linked to skills and creative thinking.

Experiments in several countries have compared people who slept after learning with people who stayed awake. In many of these studies, the participants who slept were better at recalling the information later. Some research also suggests that a short nap during the day can improve performance on simple memory tasks, although the benefits of napping may depend on its length and timing.

A lack of sleep, on the other hand, can make learning more difficult. People who are tired often find it hard to concentrate, and they may feel irritable or anxious. Over time, regular sleep deprivation has been associated with a range of health problems, which can further affect a person's ability to study and work effectively.

So what can learners do? Experts generally recommend keeping a regular routine, going to bed and waking up at similar times each day. They also advise avoiding bright screens late in the evening, as the light may make it harder to fall asleep. Rather than studying all night before an exam, students might achieve better results by reviewing their notes earlier and then getting a full night's rest.`,
      keywords: ['essential', 'temporary', 'consolidation', 'recalling', 'performance', 'concentrate', 'irritable', 'deprivation', 'routine', 'associated', 'participants'],
      questions: [
        { type: 'tfng', q: 'New information is first stored in the brain in a temporary form.', answer: 'TRUE', explain: 'Bài viết: "the information is first stored in a temporary form" → TRUE.' },
        { type: 'tfng', q: 'Scientists agree that all naps improve memory, whatever their length.', answer: 'FALSE', explain: 'Bài viết nói lợi ích của ngủ trưa "may depend on its length and timing", nên không phải mọi giấc ngủ trưa đều có ích → FALSE.' },
        { type: 'tfng', q: 'Students who sleep well usually choose to study in the morning.', answer: 'NOT GIVEN', explain: 'Bài không đề cập thời điểm học ưa thích của những người ngủ đủ giấc → NOT GIVEN.' },
        { type: 'mcq', q: 'According to the passage, which type of memory may deep sleep help?', options: ['Physical skills', 'Creative thinking', 'Facts', 'Dreams'], answer: 2, explain: 'Bài viết: "deep sleep may help us remember facts".' },
        { type: 'mcq', q: 'Why do experts advise avoiding bright screens late in the evening?', options: ['They damage the eyes permanently.', 'The light may make it harder to fall asleep.', 'They reduce the time for studying.', 'They cause people to forget facts.'], answer: 1, explain: 'Bài viết: "the light may make it harder to fall asleep".' },
      ],
    },
    {
      id: 'language-extinction',
      title: 'The Silent Loss of Languages',
      topic: 'language',
      level: 'C1',
      emoji: '🗣️',
      summaryVi: 'Nhiều ngôn ngữ đang biến mất do áp lực kinh tế và xã hội; mất ngôn ngữ là mất tri thức văn hóa, và nỗ lực phục hồi cần cộng đồng chủ động tham gia.',
      text: `Linguists broadly agree that a substantial proportion of the world's languages are at risk of disappearing within the coming generations. Unlike the extinction of a plant or animal species, however, the loss of a language rarely attracts headlines. It tends to occur quietly, as each successive generation uses the ancestral tongue a little less until, eventually, no fluent speakers remain.

The forces driving this decline are rarely a matter of deliberate prohibition alone, although historical policies of forced assimilation have certainly played a part in many regions. More commonly, the shift is propelled by economic and social pressures. Parents who perceive a dominant language as the key to education and employment may choose not to pass on their own, believing they are acting in their children's best interests. Urban migration, mass media and the internet can accelerate this process by exposing young people predominantly to a handful of global languages.

Why should such losses matter? One argument is that each language encodes a distinctive way of categorising experience. Vocabulary relating to local plants, weather patterns or kinship structures may embody knowledge accumulated over centuries, some of which is not documented anywhere else. When a language vanishes, this intangible heritage may disappear with it. Moreover, for many communities, language is inseparable from identity, and its erosion can be experienced as a profound cultural dislocation.

Efforts at revitalisation have produced mixed outcomes. Documentation projects, in which researchers record speakers and compile dictionaries, preserve valuable material but do not in themselves create new speakers. More ambitious initiatives, such as immersion schools where children are taught entirely in the endangered language, have reportedly achieved notable success in certain contexts. Nevertheless, such programmes demand sustained funding and, crucially, the commitment of the community itself.

The prevailing view among specialists is that external intervention can support, but never substitute for, local motivation. A language survives not because it is archived, but because people continue to choose to speak it in their daily lives.`,
      keywords: ['substantial', 'ancestral', 'assimilation', 'propelled', 'perceive', 'accelerate', 'encodes', 'intangible', 'erosion', 'revitalisation', 'immersion', 'prevailing'],
      questions: [
        { type: 'tfng', q: 'Language loss usually receives as much media attention as species extinction.', answer: 'FALSE', explain: 'Bài viết: the loss of a language "rarely attracts headlines", trái với ý của câu → FALSE.' },
        { type: 'tfng', q: 'Some parents stop passing on their language because they think it will help their children.', answer: 'TRUE', explain: 'Bài viết: parents may choose not to pass on their own, "believing they are acting in their children\'s best interests" → TRUE.' },
        { type: 'tfng', q: 'Immersion schools are cheaper to run than documentation projects.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói trường immersion "demand sustained funding", không so sánh chi phí với dự án ghi chép → NOT GIVEN.' },
        { type: 'mcq', q: 'What is the main limitation of documentation projects, according to the passage?', options: ['They are too expensive.', 'They do not in themselves create new speakers.', 'They record inaccurate information.', 'They are opposed by communities.'], answer: 1, explain: 'Bài viết: documentation projects "preserve valuable material but do not in themselves create new speakers".' },
        { type: 'mcq', q: 'What is the writer\'s main conclusion?', options: ['Archiving is the most effective way to save a language.', 'Global languages should be taught less in schools.', 'A language survives only if people keep choosing to use it.', 'Governments should forbid dominant languages.'], answer: 2, explain: 'Câu cuối: "A language survives not because it is archived, but because people continue to choose to speak it".' },
      ],
    },
    {
      id: 'space-debris',
      title: 'The Growing Problem of Space Debris',
      topic: 'space',
      level: 'C1',
      emoji: '🛰️',
      summaryVi: 'Rác vũ trụ quanh Trái Đất ngày càng nhiều, đe dọa vệ tinh và đòi hỏi cả giải pháp kỹ thuật lẫn hợp tác quốc tế.',
      text: `Since the first artificial satellite was launched in the late 1950s, the region of space surrounding the Earth has become increasingly congested. Alongside functioning spacecraft, it now contains a vast quantity of debris: defunct satellites, discarded rocket stages, and countless fragments produced by collisions and explosions. Because these objects travel at extremely high velocities, even a fragment no larger than a fingernail can inflict serious damage on an operational satellite.

Of particular concern is a scenario sometimes referred to as cascading collisions. The theory proposes that, once the density of debris in a given orbit exceeds a critical threshold, each collision would generate further fragments, which would in turn trigger additional collisions. In its most extreme form, this chain reaction could render certain orbits unusable for decades, jeopardising services on which modern societies have come to depend, including weather forecasting, navigation and global communications.

The rapid expansion of commercial activity has intensified these anxieties. Several companies are deploying large constellations of small satellites to provide internet access, and while operators generally design these craft to descend and burn up in the atmosphere at the end of their lifespan, the sheer number of launches inevitably raises the probability of accidents.

Engineers have proposed an array of mitigation strategies. Some focus on prevention, such as ensuring that satellites carry sufficient fuel to move themselves out of busy orbits once their missions conclude. Others concentrate on active removal, with concepts ranging from robotic arms and nets to harpoons capable of capturing derelict objects. Most of these techniques, however, remain at an experimental stage, and their cost is considerable relative to the size of the problem.

Perhaps the most formidable obstacle is not technical but political. Space is a shared environment, yet no single authority has the power to enforce rules across all nations and companies. Existing guidelines are largely voluntary, and compliance varies. Many analysts therefore contend that meaningful progress will depend on stronger international cooperation and a shared recognition that orbital space is a finite resource.`,
      keywords: ['congested', 'defunct', 'velocities', 'inflict', 'threshold', 'jeopardising', 'constellations', 'mitigation', 'derelict', 'formidable', 'compliance', 'finite'],
      questions: [
        { type: 'tfng', q: 'Even very small fragments of debris can damage working satellites.', answer: 'TRUE', explain: 'Bài viết: "even a fragment no larger than a fingernail can inflict serious damage on an operational satellite" → TRUE.' },
        { type: 'tfng', q: 'Commercial satellite operators usually design their craft to remain in orbit permanently.', answer: 'FALSE', explain: 'Bài viết: operators design craft "to descend and burn up in the atmosphere at the end of their lifespan" → FALSE.' },
        { type: 'tfng', q: 'Harpoons have already been used successfully to remove large amounts of debris.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói các kỹ thuật như harpoon "remain at an experimental stage", không đề cập đã thành công trên quy mô lớn → NOT GIVEN.' },
        { type: 'mcq', q: 'What does the theory of cascading collisions suggest?', options: ['Debris will soon fall back to Earth naturally.', 'Collisions could produce more fragments and further collisions.', 'Satellites will become cheaper to launch.', 'Only old satellites are at risk.'], answer: 1, explain: 'Bài viết: "each collision would generate further fragments, which would in turn trigger additional collisions".' },
        { type: 'mcq', q: 'According to the writer, what is the greatest obstacle to solving the problem?', options: ['A lack of engineers', 'The high speed of debris', 'Political issues and the absence of a single authority', 'Public lack of interest'], answer: 2, explain: 'Bài viết: "the most formidable obstacle is not technical but political... no single authority has the power to enforce rules".' },
      ],
    },
    {
      id: 'advertising-children',
      title: 'The Psychology of Advertising to Children',
      topic: 'media',
      level: 'B2',
      emoji: '📺',
      summaryVi: 'Trẻ em dễ bị quảng cáo tác động vì chưa hiểu hết mục đích thuyết phục; quảng cáo trực tuyến khiến việc quản lý khó hơn, cần cả luật lệ và giáo dục.',
      text: `Children have long been an important audience for advertisers. They not only spend their own pocket money but also influence many of the purchases made by their parents, from breakfast cereals to family holidays. This has led psychologists and policymakers to ask whether young people are able to understand advertising in the same way as adults.

Research into child development suggests that the answer depends largely on age. Very young children often struggle to distinguish between an advertisement and an ordinary programme. Even when they can tell the difference, they may not grasp that the purpose of an advert is to persuade them to buy something. This ability to recognise persuasive intent appears to develop gradually, and some researchers argue that it is not fully established until children are well into their school years.

Advertisers use a range of techniques that may be especially effective with young audiences. Bright colours, catchy songs and familiar cartoon characters can create positive emotional associations with a product. Free toys and collectable items encourage repeated purchases, while the use of celebrities or popular influencers may make a product appear desirable and fashionable.

The shift from television to digital media has made the issue more complex. Online, commercial content is frequently blended with entertainment, for example when a video creator promotes a product during an apparently casual review. Such content can be difficult even for adults to identify. Furthermore, digital platforms may collect data about users' interests and display targeted advertisements, raising additional concerns about privacy.

Governments have responded in different ways. Some have introduced restrictions on advertising certain foods during children's programmes, while others rely mainly on voluntary codes agreed by the industry. Critics argue that regulation has struggled to keep pace with new technology. Many educators therefore believe that alongside legal measures, schools should teach media literacy, helping children to question the messages they see and to make more informed choices as consumers.`,
      keywords: ['policymakers', 'distinguish', 'grasp', 'persuasive', 'intent', 'associations', 'collectable', 'influencers', 'blended', 'targeted', 'regulation', 'literacy'],
      questions: [
        { type: 'tfng', q: 'Children can affect what their parents buy.', answer: 'TRUE', explain: 'Bài viết: children "influence many of the purchases made by their parents" → TRUE.' },
        { type: 'tfng', q: 'Most children understand the persuasive purpose of advertising by the age of three.', answer: 'FALSE', explain: 'Bài viết nói khả năng này phát triển dần và có thể chưa hoàn thiện "until children are well into their school years" → FALSE.' },
        { type: 'tfng', q: 'Advertisements featuring cartoon characters are banned in some countries.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói một số nước hạn chế quảng cáo "certain foods", không đề cập cấm nhân vật hoạt hình → NOT GIVEN.' },
        { type: 'mcq', q: 'Why is online advertising particularly difficult to identify?', options: ['It is shown only late at night.', 'It is often mixed with entertainment content.', 'It never uses celebrities.', 'It is always very short.'], answer: 1, explain: 'Bài viết: "Online, commercial content is frequently blended with entertainment".' },
        { type: 'mcq', q: 'What do many educators recommend?', options: ['Banning all advertising aimed at children', 'Relying only on industry codes', 'Teaching media literacy in schools alongside legal measures', 'Stopping children from using the internet'], answer: 2, explain: 'Bài viết: "alongside legal measures, schools should teach media literacy".' },
      ],
    },
    {
      id: 'ev-power-grid',
      title: 'Electric Vehicles and the Power Grid',
      topic: 'energy',
      level: 'B2',
      emoji: '🔌',
      summaryVi: 'Xe điện tăng nhanh tạo áp lực lên lưới điện, nhưng sạc thông minh và công nghệ xe-về-lưới có thể biến xe điện thành nguồn hỗ trợ cho hệ thống.',
      text: `As governments seek to cut carbon emissions from transport, electric vehicles are becoming an increasingly common sight on the roads. This transition, however, raises an important question: can existing electricity networks cope with millions of cars that need to be charged every day?

The challenge is not simply the total amount of electricity required. In many places, energy analysts suggest that overall generation capacity could expand to meet the additional demand over time. The more pressing issue is timing. If large numbers of drivers return home in the early evening and plug in their cars at the same moment, they could create a sharp peak in demand, coinciding with the period when households are already cooking, heating and using appliances. Local distribution networks, particularly in older residential areas, may not have been designed to handle such loads.

One promising solution is smart charging. Instead of drawing power immediately, a smart charger can delay charging until demand is lower, such as late at night, or adjust its rate according to signals from the grid operator. Drivers may be offered cheaper tariffs in exchange for allowing this flexibility. Since most cars remain parked for many hours, the delay is usually inconvenient for only a small number of users.

A more ambitious idea is known as vehicle-to-grid technology. In this system, the batteries of parked electric cars could not only receive electricity but also return it to the network when needed. Collectively, these vehicles could act as a large, distributed storage system, helping to balance supply from renewable sources such as wind and solar power, which fluctuate with the weather. Pilot projects have explored the concept, although concerns remain about battery wear and the complexity of coordinating thousands of vehicles.

In summary, electric vehicles present both a challenge and an opportunity for power systems. With careful planning, investment in infrastructure and appropriate incentives, they could become a valuable asset rather than a burden.`,
      keywords: ['emissions', 'transition', 'capacity', 'coinciding', 'appliances', 'distribution', 'tariffs', 'flexibility', 'renewable', 'fluctuate', 'infrastructure', 'incentives'],
      questions: [
        { type: 'tfng', q: 'The writer believes the main problem is the timing of charging rather than total demand.', answer: 'TRUE', explain: 'Bài viết: "The challenge is not simply the total amount... The more pressing issue is timing." → TRUE.' },
        { type: 'tfng', q: 'Smart charging always charges a car immediately when it is plugged in.', answer: 'FALSE', explain: 'Bài viết: smart charger "can delay charging until demand is lower", ngược với "immediately" → FALSE.' },
        { type: 'tfng', q: 'Vehicle-to-grid technology is already used in most countries.', answer: 'NOT GIVEN', explain: 'Bài chỉ nói có "pilot projects" thử nghiệm, không nói về mức độ phổ biến ở các nước → NOT GIVEN.' },
        { type: 'mcq', q: 'Why might older residential areas face difficulties?', options: ['They have no access to renewable energy.', 'Their local networks may not be designed for such loads.', 'Residents there do not own cars.', 'Electricity is more expensive there.'], answer: 1, explain: 'Bài viết: local networks in older residential areas "may not have been designed to handle such loads".' },
        { type: 'mcq', q: 'What concern about vehicle-to-grid technology is mentioned?', options: ['Battery wear', 'Noise pollution', 'Higher car prices', 'Lack of wind power'], answer: 0, explain: 'Bài viết: "concerns remain about battery wear and the complexity of coordinating thousands of vehicles".' },
      ],
    },
    {
      id: 'digital-museums',
      title: 'Museums in the Digital Age',
      topic: 'culture',
      level: 'B1',
      emoji: '🏛️',
      summaryVi: 'Bảo tàng dùng công nghệ số để mở rộng tiếp cận, nhưng trải nghiệm xem hiện vật thật vẫn có giá trị riêng.',
      text: `Museums have traditionally been quiet places where visitors walk slowly past glass cases and read small labels. In recent years, however, technology has started to change the way people experience art, history and science. Many museums now offer a wide range of digital services, both inside their buildings and online.

One major development is the online collection. By photographing objects and putting the images on their websites, museums allow people to explore their collections from anywhere in the world. This is especially useful for students, researchers and people who live far away or cannot travel. Some institutions also create virtual tours, which let users move through the galleries on a computer or phone as if they were really there.

Inside museums, technology can make exhibitions more interactive. Touch screens, audio guides and smartphone apps provide extra information about each object. Some exhibitions use augmented reality, where a phone or headset adds digital images to the real world. A visitor might, for example, see an ancient building appear in its original colours. Museum staff often say that these tools are popular with younger visitors, who are used to learning through screens.

Not everyone is convinced, though. Some critics worry that too much technology can distract visitors from the objects themselves. Instead of looking closely at a painting, people may spend their time staring at their phones. There are also practical concerns: digital equipment can be expensive to buy and maintain, and smaller museums may not have enough money or staff to keep it working.

Most experts agree that technology should support, not replace, the traditional museum visit. Seeing a real object, with its true size, texture and age, can be a powerful experience that a screen cannot fully reproduce. The challenge for museums is to find the right balance between the physical and the digital, so that they remain relevant to new generations.`,
      keywords: ['traditionally', 'collections', 'institutions', 'virtual', 'exhibitions', 'interactive', 'augmented', 'distract', 'maintain', 'reproduce', 'relevant'],
      questions: [
        { type: 'tfng', q: 'Online collections help people who live far from a museum.', answer: 'TRUE', explain: 'Bài viết: online collections are "especially useful for... people who live far away or cannot travel" → TRUE.' },
        { type: 'tfng', q: 'Museum staff say that digital tools are unpopular with younger visitors.', answer: 'FALSE', explain: 'Bài viết: staff say these tools "are popular with younger visitors" → FALSE.' },
        { type: 'tfng', q: 'Virtual tours attract more visitors than real museum visits.', answer: 'NOT GIVEN', explain: 'Bài không so sánh số lượng người dùng tour ảo với khách tham quan trực tiếp → NOT GIVEN.' },
        { type: 'mcq', q: 'What is one practical concern about digital equipment?', options: ['It damages the objects.', 'It is expensive to buy and maintain.', 'It is too difficult for children.', 'It makes museums too noisy.'], answer: 1, explain: 'Bài viết: "digital equipment can be expensive to buy and maintain".' },
        { type: 'mcq', q: 'What do most experts believe about technology in museums?', options: ['It should replace traditional visits.', 'It should be removed from galleries.', 'It should support, not replace, the traditional visit.', 'It is only useful for researchers.'], answer: 2, explain: 'Bài viết: "technology should support, not replace, the traditional museum visit".' },
      ],
    },
    {
      id: 'ageing-healthcare',
      title: 'Ageing Populations and Healthcare',
      topic: 'society',
      level: 'C1',
      emoji: '👵',
      summaryVi: 'Dân số già hóa gây áp lực lên hệ thống y tế; các giải pháp gồm phòng bệnh, chăm sóc tại cộng đồng và công nghệ, nhưng đều có hạn chế.',
      text: `Across much of the world, populations are growing older. Rising life expectancy, combined with declining birth rates, means that the proportion of people over the age of sixty-five is increasing steadily in many countries. While this demographic shift is in many respects a testament to advances in medicine and living standards, it also poses profound challenges for healthcare systems that were largely designed around the treatment of acute, short-term illness.

Older adults are more likely to live with chronic conditions, such as heart disease, diabetes and arthritis, and many experience several of these simultaneously. Managing multiple long-term conditions tends to be both complex and costly, requiring ongoing monitoring, numerous medications and coordination between different specialists. Consequently, health economists frequently warn that expenditure may rise faster than the revenue available to fund it, particularly where a shrinking working-age population contributes a smaller share of taxes.

In response, many policymakers advocate a reorientation towards prevention. Encouraging physical activity, balanced nutrition and social engagement throughout life may postpone the onset of disability and reduce dependence on hospital services. Equally, there is growing interest in delivering care within the community rather than in hospitals. Home visits, local clinics and support for family carers are often regarded as more humane and potentially less expensive, although their effectiveness depends heavily on adequate staffing and funding.

Technology is frequently presented as part of the solution. Remote monitoring devices, for instance, can alert medical teams to changes in a patient's condition, while telemedicine allows consultations without the need to travel. Nevertheless, such innovations are not a panacea. Some older people lack the confidence or resources to use digital tools, and there is a risk that technology could exacerbate isolation if it replaces, rather than complements, human contact.

Ultimately, adapting to an ageing society will require more than incremental adjustments. It calls for a fundamental rethinking of how care is organised, financed and delivered, so that longer lives can also be healthier and more fulfilling ones.`,
      keywords: ['demographic', 'testament', 'acute', 'chronic', 'simultaneously', 'expenditure', 'reorientation', 'onset', 'humane', 'panacea', 'exacerbate', 'incremental'],
      questions: [
        { type: 'tfng', q: 'Many current healthcare systems were mainly designed to treat short-term illness.', answer: 'TRUE', explain: 'Bài viết: systems "were largely designed around the treatment of acute, short-term illness" → TRUE.' },
        { type: 'tfng', q: 'Community-based care is always cheaper than hospital treatment.', answer: 'FALSE', explain: 'Bài viết chỉ nói "potentially less expensive" và hiệu quả phụ thuộc vào nhân lực, kinh phí, nên không phải "always" → FALSE.' },
        { type: 'tfng', q: 'Most older people prefer telemedicine to face-to-face appointments.', answer: 'NOT GIVEN', explain: 'Bài không đề cập sở thích của người cao tuổi giữa khám từ xa và khám trực tiếp → NOT GIVEN.' },
        { type: 'mcq', q: 'Why might healthcare spending become difficult to fund?', options: ['Medicines are becoming less effective.', 'A smaller working-age population contributes a smaller share of taxes.', 'Hospitals are closing.', 'Older people refuse treatment.'], answer: 1, explain: 'Bài viết: "a shrinking working-age population contributes a smaller share of taxes".' },
        { type: 'mcq', q: 'What risk of technology does the writer mention?', options: ['It may increase isolation if it replaces human contact.', 'It is too slow to detect changes.', 'It requires patients to travel more.', 'It is banned in some hospitals.'], answer: 0, explain: 'Bài viết: technology "could exacerbate isolation if it replaces, rather than complements, human contact".' },
      ],
    },
  ];
})(typeof self !== 'undefined' ? self : this);
