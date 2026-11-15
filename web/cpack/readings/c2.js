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
        { type: 'mcq', q: `Why does the writer mention translators?`, options: [`To show that translation is nearly impossible`, `To argue against a deterministic view of language and thought`, `To criticise inaccurate translations of Whorf`, `To explain why bilinguals perform better`], answer: 1, explain: `Dịch giả truyền đạt ý tưởng qua ranh giới ngôn ngữ, điều không thể xảy ra nếu tư duy hoàn toàn bị ngữ pháp giam giữ → đáp án đúng: To argue against a deterministic view of language and thought.` },
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
        { type: 'mcq', q: `What does the writer identify as the hidden assumption in Hardin's parable?`, options: [`That the pasture is too small`, `That herders are irrational`, `That the herders cannot communicate`, `That the state is unwilling to intervene`], answer: 2, explain: `Bài viết: giả định ẩn là "the herders cannot communicate" → đáp án đúng: That the herders cannot communicate.` },
        { type: 'mcq', q: `According to the passage, why might the atmosphere be difficult to manage as a commons?`, options: [`It lacks the features that make local arrangements work.`, `It belongs to no country.`, `It cannot be measured.`, `Scientists disagree about its condition.`], answer: 0, explain: `Bài viết: hệ thống lớn, vô danh, thay đổi nhanh như khí quyển "lack precisely the features that sustain local arrangements" → đáp án đúng: It lacks the features that make local arrangements work.` },
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
        { type: 'mcq', q: `What is the purpose of the example of London taxi drivers?`, options: [`To show that memory declines with age`, `To illustrate that the brain can change through experience`, `To criticise the cost of training`, `To prove that stroke recovery is fast`], answer: 1, explain: `Tài xế taxi học thuộc mê cung đường phố và hippocampus lớn hơn đo được, minh họa não thay đổi theo trải nghiệm → đáp án đúng: To illustrate that the brain can change through experience.` },
        { type: 'mcq', q: `According to the writer, what kind of activity produces the most reliable plasticity?`, options: [`Short, repeated exercises`, `Passive listening`, `Sustained and demanding activity`, `Competitive games`], answer: 2, explain: `Bài viết: phản ứng đáng tin nhất với "sustained, effortful engagement with demanding and varied tasks" → đáp án đúng: Sustained and demanding activity.` },
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
        { type: 'mcq', q: `According to the writer, what differs between languages?`, options: [`The range of human experiences`, `The way experiences are packaged into words`, `The speed at which words are learnt`, `The number of borrowed words`], answer: 1, explain: `Bài viết: khác nhau là "the packaging", tức trải nghiệm nào được gói trong một từ, chứ không phải kho trải nghiệm → đáp án đúng: The way experiences are packaged into words.` },
        { type: 'mcq', q: `What is the writer's final conclusion about translation?`, options: [`It is impossible for poetry.`, `It is always perfect when done by experts.`, `It rarely loses anything.`, `It is seldom impossible but never without loss.`], answer: 3, explain: `Bài viết: "translation is never lossless but rarely impossible" → đáp án đúng: It is seldom impossible but never without loss.` },
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
        { type: 'mcq', q: `What point does the final paragraph make about serfdom?`, options: [`It disappeared everywhere at the same speed.`, `It had no connection with the plague.`, `The effect of the plague depended on local institutions and power.`, `It was abolished by the Ordinance of Labourers.`], answer: 2, explain: `Bài viết: cùng một cú sốc cho ra kết quả trái ngược tùy sức mạnh tương đối của địa chủ và người lao động → đáp án đúng: The effect of the plague depended on local institutions and power.` },
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
        { type: 'mcq', q: `Why did the buildings decline in popularity by the 1980s?`, options: [`Concrete became too expensive.`, `They were badly maintained and weathered unattractively.`, `Architects stopped designing them.`, `They were found to be unsafe.`], answer: 1, explain: `Bài viết: bê tông phong hóa không đều, nhiều tòa nhà ít được bảo trì khi sự lạc quan đã tan biến → đáp án đúng: They were badly maintained and weathered unattractively.` },
        { type: 'mcq', q: `What does the writer conclude from the history of Brutalism?`, options: [`Modern architects lack skill.`, `Aesthetic judgements can change over time.`, `Concrete should never be used again.`, `Old buildings should always be preserved.`], answer: 1, explain: `Bài viết: tòa nhà không đổi nhưng phán xét có thể đảo ngược trong một thế hệ → đáp án đúng: Aesthetic judgements can change over time.` },
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
        { type: 'mcq', q: `What principle makes the situation puzzling?`, options: [`People should be judged only for what they control.`, `Careless driving should always be punished.`, `Children should never be blamed.`, `Luck cannot be measured.`], answer: 0, explain: `Bài viết: nguyên tắc nhiều người coi trọng là con người chỉ nên bị đánh giá về những gì "within their control" → đáp án đúng: People should be judged only for what they control.` },
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
        { type: 'mcq', q: `Why have several large companies stopped developing antibiotics?`, options: [`Bacteria have become impossible to study.`, `New antibiotics are used sparingly and so earn little.`, `Governments have banned their sale.`, `Livestock farmers refuse to buy them.`], answer: 1, explain: `Bài viết: thuốc kháng sinh mới được giữ dự trữ nên "will sell in small volumes", kém sinh lời hơn thuốc bệnh mạn tính → đáp án đúng: New antibiotics are used sparingly and so earn little.` },
        { type: 'mcq', q: `What does the proposed payment scheme aim to do?`, options: [`Reduce the price of antibiotics for farmers`, `Make resistance illegal`, `Separate developers' income from the quantity of drug sold`, `Replace antibiotics with vaccines`], answer: 2, explain: `Bài viết: trả một khoản cố định hằng năm "thereby separating revenue from volume" → đáp án đúng: Separate developers' income from the quantity of drug sold.` },
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
        { type: 'mcq', q: `What is the writer's own view of the benefits of reading novels?`, options: [`They definitely make people more empathetic.`, `They probably encourage patience and attentiveness.`, `They replace the need for other media.`, `They are mainly useful for exams.`], answer: 1, explain: `Bài viết đề xuất khẳng định khiêm tốn hơn: tiểu thuyết rèn "a certain kind of patience" và khiến ta chú tâm hơn → đáp án đúng: They probably encourage patience and attentiveness.` },
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
        { type: 'mcq', q: `What does the phrase "a freedom of a rather theoretical kind" suggest?`, options: [`Workers love theory.`, `Workers can refuse jobs only at a cost.`, `Freedom is the same as flexibility.`, `Workers cannot choose their hours.`], answer: 1, explain: `Người "nominally free to decline a job but penalised for doing so" chỉ có tự do trên danh nghĩa → đáp án đúng: Workers can refuse jobs only at a cost.` },
        { type: 'mcq', q: `What is the writer's view at the end of the passage?`, options: [`Platforms should be banned.`, `The label matters more than anything else.`, `Gig work is better than permanent employment.`, `The basic protections for all work matter more than the label.`], answer: 3, explain: `Bài viết: cuộc tranh luận hiệu quả hơn nên bàn về "the floor of protection beneath all work, whatever the label" → đáp án đúng: The basic protections for all work matter more than the label.` },
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
        { type: 'mcq', q: `Why do some people regard the loss of languages as unimportant?`, options: [`They believe bilingual speakers lose nothing practical.`, `They think languages are always replaced quickly.`, `They claim linguists exaggerate the numbers.`, `They prefer written records.`], answer: 0, explain: `Bài viết: lập luận là nếu người nói song ngữ thì "nothing practical is forfeited" → đáp án đúng: They believe bilingual speakers lose nothing practical.` },
        { type: 'mcq', q: `According to the writer, what does revival need above all?`, options: [`Large sums of money`, `Written grammars`, `Children using the language in meaningful settings`, `Support from foreign governments`], answer: 2, explain: `Bài viết: cần trẻ em gặp ngôn ngữ trong bối cảnh có ý nghĩa với chúng và nói nó mang lại phần thưởng xã hội → đáp án đúng: Children using the language in meaningful settings.` },
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
        { type: 'mcq', q: `What does "auditory cheesecake" refer to?`, options: [`A traditional dessert song`, `A pleasant by-product of faculties that evolved for other purposes`, `A rare form of hearing loss`, `A kind of instrument`], answer: 1, explain: `Đó là cách nói ví von: âm nhạc là "by-product of other cognitive faculties" làm thỏa mãn các mạch khoái cảm → đáp án đúng: A pleasant by-product of faculties that evolved for other purposes.` },
        { type: 'mcq', q: `How does the expectation theory explain why unfamiliar music may sound strange?`, options: [`The instruments are different.`, `Listeners lack the habits needed to predict it.`, `The rhythms are always faster.`, `The music is badly recorded.`], answer: 1, explain: `Bài viết: "our predictive machinery has not been trained on them" → đáp án đúng: Listeners lack the habits needed to predict it.` },
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
        { type: 'mcq', q: `What is the writer's main argument in the last paragraph?`, options: [`Cooling technology is still too crude.`, `The political decision of whom to help first is the harder part.`, `Suburban planting is the best use of money.`, `Heatwaves are unavoidable.`], answer: 1, explain: `Bài viết: vấn đề kỹ thuật dễ hơn "the political one of deciding who should be cooled first" → đáp án đúng: The political decision of whom to help first is the harder part.` },
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
        { type: 'mcq', q: `What is the writer's main criticism of Popper's criterion?`, options: [`It is too difficult to understand.`, `It ignores the way scientists actually handle contradictory results.`, `It favours psychology over physics.`, `It has been proved wrong by Neptune.`], answer: 1, explain: `Bài viết: tiêu chí này "misdescribes how research proceeds", vì nhà khoa học hiếm khi bỏ ngay lý thuyết khi gặp kết quả trái ngược → đáp án đúng: It ignores the way scientists actually handle contradictory results.` },
        { type: 'mcq', q: `What does the writer mean by saying falsifiability is "a virtue rather than a rule"?`, options: [`It is a desirable quality but not an absolute test.`, `It should be ignored.`, `It applies only to physics.`, `It is required by law.`], answer: 0, explain: `Lý thuyết không thể kiểm chứng đáng ngờ, nhưng phán quyết đến từ cả mạng lưới bằng chứng chứ không từ một thí nghiệm quyết định → đáp án đúng: It is a desirable quality but not an absolute test.` },
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
        { type: 'mcq', q: `What do defenders of the platforms argue?`, options: [`Users are not helpless and receive real benefits.`, `Notifications are harmless in every case.`, `Adolescents should not use them.`, `Advertising should be banned.`], answer: 0, explain: `Bài viết: người ta có thể tắt thông báo, đặt giới hạn, và dịch vụ mang giá trị thật → đáp án đúng: Users are not helpless and receive real benefits.` },
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
        { type: 'mcq', q: `Which reform is mentioned in the passage?`, options: [`Banning eyewitness evidence`, `Presenting suspects one at a time`, `Interviewing witnesses after a week`, `Showing witnesses video footage`], answer: 1, explain: `Bài viết: nhiều lực lượng cảnh sát "present suspects sequentially rather than in a group" → đáp án đúng: Presenting suspects one at a time.` },
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
        { type: 'mcq', q: `Why do sceptics doubt that green growth is working?`, options: [`Clean technology does not exist.`, `Emission cuts are too small and slow, and production may simply be moved abroad.`, `Economies have stopped expanding.`, `Consumers refuse to buy efficient products.`], answer: 1, explain: `Bài viết: mức giảm "too slow and too small", và sản xuất thường chỉ được xuất sang nước khác → đáp án đúng: Emission cuts are too small and slow, and production may simply be moved abroad.` },
        { type: 'mcq', q: `What does the writer conclude?`, options: [`Growth should be abandoned.`, `GDP is the perfect measure.`, `The real issue is what kind of growth a society wants.`, `Alternatives to GDP are impossible to create.`], answer: 2, explain: `Bài viết: lựa chọn không phải giữa tăng trưởng và từ bỏ nó mà giữa "kinds of growth" → đáp án đúng: The real issue is what kind of growth a society wants.` },
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
        { type: 'mcq', q: `What does Mai do now?`, options: [`She never takes the bus.`, `She has a password and writes her mother's number in a notebook.`, `She keeps her phone in her pocket only.`, `She has bought a new phone.`], answer: 1, explain: `Bài viết: "Now she has a password, and she writes her mother's number in her notebook" → đáp án đúng: She has a password and writes her mother's number in a notebook.` },
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
        { type: 'mcq', q: `What did the writer give Rosa on the second evening?`, options: [`A plate of sweet rice cakes`, `A big cake`, `A bowl of soup`, `Some fruit`], answer: 0, explain: `Bài viết: "I knocked on their door and gave them a plate of sweet rice cakes" → đáp án đúng: A plate of sweet rice cakes.` },
        { type: 'mcq', q: `Why was Rosa afraid before the dinner?`, options: [`She did not like the building.`, `She thought it would be hard to meet people in the city.`, `Her children were ill.`, `She had no furniture.`], answer: 1, explain: `Bài viết: Rosa nói "I was afraid that it would be difficult here" (ở đây khó làm quen) → đáp án đúng: She thought it would be hard to meet people in the city.` },
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
        { type: 'mcq', q: `What does the writer's grandfather say about asking for a lower price?`, options: [`You should do it quickly.`, `You should ask politely and not be angry.`, `You should never do it.`, `You should do it only in the afternoon.`], answer: 1, explain: `Bài viết: ông nói "you should always ask politely, and never be angry" → đáp án đúng: You should ask politely and not be angry.` },
        { type: 'mcq', q: `What did people use instead of plastic bags in the past?`, options: [`Paper boxes`, `Cloth hats`, `Baskets`, `Bottles`], answer: 2, explain: `Bài viết: ngày xưa "everyone brought a basket from home" → đáp án đúng: Baskets.` },
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
        { type: 'mcq', q: `Why does the writer mention a casual remark overheard at a neighbouring desk?`, options: [`To show that offices are noisy`, `To illustrate how informal exchanges pass on knowledge`, `To criticise unplanned meetings`, `To explain why managers prefer remote work`], answer: 1, explain: `Những trao đổi không kế hoạch như vậy "transmit tacit knowledge and cement relationships" → đáp án đúng: To illustrate how informal exchanges pass on knowledge.` },
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
        { type: 'mcq', q: `Why is it difficult to apply laboratory results to human health?`, options: [`The laboratories are poorly equipped.`, `The doses used are often higher than real exposure.`, `The particles dissolve in water.`, `Humans do not absorb plastic.`], answer: 1, explain: `Bài viết: liều dùng trong phòng thí nghiệm "often exceed those found in the environment" → đáp án đúng: The doses used are often higher than real exposure.` },
        { type: 'mcq', q: `What does the precautionary principle suggest here?`, options: [`Waiting for complete proof before acting`, `Acting sensibly despite incomplete evidence`, `Banning all plastics immediately`, `Ignoring the risks until they are proven`], answer: 1, explain: `Bài viết: khi một hoạt động đe dọa gây hại, việc thiếu bằng chứng kết luận không nên trì hoãn biện pháp hợp lý → đáp án đúng: Acting sensibly despite incomplete evidence.` },
      ],
    },
  );
})(typeof self !== 'undefined' ? self : this);
