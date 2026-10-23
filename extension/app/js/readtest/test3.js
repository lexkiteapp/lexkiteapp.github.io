/* IELTS Academic Reading – Test 3 (tự biên soạn) */
(function (g) {
  const R = g.READTESTS = g.READTESTS || [];
  R.push({
    id: 'rt3', test: 3,
    passages: [
      /* ---------------- PASSAGE 1 ---------------- */
      { n: 1, title: "Surviving the Furnace: How Desert Plants Endure", titleVi: "Sống sót giữa lò lửa: Cách thực vật sa mạc chịu đựng", topic: "Biology", level: "B1-B2",
        paras: [
          { k: "A", t: "Deserts cover roughly a third of the planet's land surface, and many of them combine two challenges that would kill most plants within days: daytime temperatures that can exceed 45°C and long periods with almost no rainfall. Yet deserts are far from empty. From the giant cacti of the Americas to the low shrubs of central Asia, thousands of plant species have found ways not only to survive these conditions but also to reproduce and spread. Botanists generally group their strategies into three broad categories: avoiding drought, tolerating it, and storing water for later use. Each of these solutions has advantages, but each also involves a trade-off of some kind." },
          { k: "B", t: "The simplest strategy is avoidance. Many desert annuals spend most of their lives as seeds buried in the soil, where they can remain dormant for years. When a heavy rain finally arrives, they germinate, grow, flower and produce new seeds in as little as six weeks, completing their entire life cycle before the ground dries out again. These plants, sometimes called ephemerals, are responsible for the spectacular 'super blooms' that occasionally carpet deserts with colour. Their seeds often contain chemicals that prevent germination after a light shower; only a soaking of several centimetres washes these inhibitors away, ensuring that the young plants have enough moisture to reach maturity. A seed that responded to every passing cloud would be likely to die before it could flower." },
          { k: "C", t: "Succulents take the opposite approach: they collect water when it is available and hold on to it. Cacti, agaves and aloes have thick, fleshy tissues that act as reservoirs. A large saguaro cactus, for example, can absorb hundreds of litres after a single storm, and its ribbed stem expands like an accordion to make room for the extra volume. To reduce loss, most succulents have a waxy outer layer and few or no leaves; in cacti, leaves have been reduced to spines, which also shade the stem and discourage thirsty animals from feeding on it. Some species are pale or covered in fine hairs, which reflect part of the sunlight that would otherwise heat the plant." },
          { k: "D", t: "Many succulents also use a special form of photosynthesis known as CAM. Most plants open small pores on their leaves, called stomata, during the day to take in carbon dioxide, but this also lets water vapour escape. CAM plants keep their stomata closed during the heat of the day and open them only at night, when the air is cooler and more humid. They store the carbon dioxide as an acid and use it for photosynthesis once the sun rises. This method can reduce water loss by as much as 90 per cent compared with ordinary plants, although it comes at a cost: CAM plants generally grow much more slowly." },
          { k: "E", t: "A third group, the drought-tolerant shrubs, neither hides nor stores water but simply endures. The creosote bush of North America is a well-known example. Its small leaves are coated in resin, which reflects sunlight and slows evaporation, and during severe drought it can drop most of its leaves and enter a state close to dormancy. Remarkably, some of its cells can survive losing more than half of their water content, a level of dehydration that would be fatal to crop plants. Creosote bushes also grow in rings, as the original plant dies in the centre and new stems spread outwards; one ring in California is thought to be around 11,700 years old." },
          { k: "F", t: "Roots play an equally important role. Some desert plants, such as the mesquite tree, send a taproot deep underground in search of permanent water; mesquite roots have been found more than 50 metres below the surface. Others, including many cacti, do the reverse, spreading a dense network of shallow roots just a few centimetres beneath the soil. These can absorb water from even a brief shower before it evaporates, and some cacti can grow new fine roots within hours of rain, then let them wither when the soil dries. In this way the plant avoids spending energy on roots that would be useless for most of the year." },
          { k: "G", t: "Understanding these adaptations is becoming increasingly important. As climate change brings hotter summers and less predictable rainfall to many farming regions, plant scientists are studying desert species for ideas that could help crops cope. Researchers are investigating whether CAM photosynthesis could be introduced into food crops, and whether genes linked to dehydration tolerance could be transferred to cereals. Such work is still at an early stage, and some experts warn that the slow growth of desert plants may make their strategies difficult to apply to agriculture, where high yields are essential. Nevertheless, the plants that have mastered life in the world's harshest environments may yet offer valuable lessons for feeding a warming planet." }
        ],
        groups: [
          { type: "tfng",
            instr: "Do the following statements agree with the information given in Reading Passage 1? Write TRUE if the statement agrees with the information, FALSE if the statement contradicts the information, NOT GIVEN if there is no information on this.",
            items: [
              { n: 1, text: "Deserts make up approximately one-third of the Earth's land area.", a: "TRUE", cue: "Deserts cover roughly a third of the planet's land surface" },
              { n: 2, text: "The seeds of ephemerals will germinate after any amount of rain.", a: "FALSE", cue: "Their seeds often contain chemicals that prevent germination after a light shower" },
              { n: 3, text: "Super blooms attract large numbers of tourists to desert areas.", a: "NOT GIVEN", cue: "the spectacular 'super blooms' that occasionally carpet deserts with colour" },
              { n: 4, text: "Cactus spines help to protect the plant from animals.", a: "TRUE", cue: "discourage thirsty animals from feeding on it" },
              { n: 5, text: "Plants that use CAM photosynthesis tend to grow faster than ordinary plants.", a: "FALSE", cue: "CAM plants generally grow much more slowly" }
            ] },
          { type: "table", title: "Survival strategies of desert plants",
            instr: "Complete the table below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            limit: 2,
            items: [
              { n: 6, text: "Avoidance – desert annuals (ephemerals): spend years in the soil as dormant ___ and complete their life cycle in about six weeks.", a: ["seeds"], cue: "spend most of their lives as seeds buried in the soil" },
              { n: 7, text: "Storage – saguaro cactus: ribbed stem stretches like an ___ to hold extra water.", a: ["accordion"], cue: "its ribbed stem expands like an accordion" },
              { n: 8, text: "Tolerance – creosote bush: small leaves covered in ___ to reflect sunlight and reduce water loss.", a: ["resin"], cue: "Its small leaves are coated in resin" },
              { n: 9, text: "Deep roots – mesquite tree: a ___ that may reach more than 50 metres below ground.", a: ["taproot"], cue: "send a taproot deep underground in search of permanent water" }
            ] },
          { type: "match",
            instr: "Reading Passage 1 has seven paragraphs, A–G. Which paragraph contains the following information? Write the correct letter, A–G. NB You may use any letter more than once.",
            options: ["A", "B", "C", "D", "E", "F", "G"],
            items: [
              { n: 10, text: "a reference to the estimated age of a particular plant", a: "E", cue: "one ring in California is thought to be around 11,700 years old" },
              { n: 11, text: "a description of plants taking in a gas at a specific time of day", a: "D", cue: "open them only at night, when the air is cooler and more humid" },
              { n: 12, text: "a concern about applying desert plant strategies to food production", a: "G", cue: "some experts warn that the slow growth of desert plants may make their strategies difficult to apply to agriculture" },
              { n: 13, text: "an example of plant parts that are produced quickly and then allowed to die", a: "F", cue: "some cacti can grow new fine roots within hours of rain, then let them wither when the soil dries" }
            ] }
        ],
        vocab: [
          { w: "dormant", vi: "ở trạng thái ngủ, không hoạt động" },
          { w: "germinate", vi: "nảy mầm" },
          { w: "inhibitor", vi: "chất ức chế" },
          { w: "reservoir", vi: "bể chứa, nơi dự trữ" },
          { w: "evaporation", vi: "sự bay hơi" },
          { w: "photosynthesis", vi: "quang hợp" },
          { w: "drought-tolerant", vi: "chịu hạn" },
          { w: "dehydration", vi: "sự mất nước" },
          { w: "taproot", vi: "rễ cái" },
          { w: "wither", vi: "héo, tàn" },
          { w: "adaptation", vi: "sự thích nghi" },
          { w: "trade-off", vi: "sự đánh đổi" },
          { w: "high yields", vi: "năng suất cao" }
        ]
      },

      /* ---------------- PASSAGE 2 ---------------- */
      { n: 2, title: "Working Less, Achieving More? The Four-Day Week Experiment", titleVi: "Làm ít hơn, đạt nhiều hơn? Thử nghiệm tuần làm việc bốn ngày", topic: "Work & Society", level: "B2",
        paras: [
          { k: "A", t: "For most of the twentieth century, the five-day, forty-hour week was treated as a natural feature of working life. It had been won through decades of campaigning by trade unions, and few people imagined that it would change again. In the past decade, however, a growing number of employers have begun experimenting with a shorter week, typically offering staff four days of work for the same pay as five. Supporters claim that the model improves wellbeing without harming output; critics suspect that the benefits are exaggerated, or that they cannot last. Until recently, the evidence on either side consisted largely of individual success stories, which made it difficult to judge whether the idea could work beyond a few enthusiastic firms." },
          { k: "B", t: "Interest accelerated after the pandemic, when millions of office workers discovered that routines they had taken for granted could be rearranged almost overnight. In this climate, a group of researchers at the Northbridge Institute for Work Studies organised a coordinated trial involving 48 organisations, ranging from a software developer to a regional chain of bakeries. Each organisation agreed to reduce working hours by around 20 per cent for six months while maintaining salaries, and to share data on productivity, staff absence and employee satisfaction with the research team. Participants also completed regular surveys, so that changes in mood and sleep could be compared with the figures collected before the trial began." },
          { k: "C", t: "The structure of the trial was deliberately flexible. Rather than imposing a single model, the organisers allowed each employer to design its own version. Some closed entirely on Fridays; others kept their doors open five days a week by staggering the days off taken by different members of staff. Halvard Logistics, a medium-sized freight company, chose to reduce hours gradually, cutting thirty minutes a day for the first two months before moving to a full extra day off. According to Dr Imogen Reyes, the trial's lead researcher, this freedom was essential: 'A hospital ward and a design studio simply cannot reorganise their time in the same way.'" },
          { k: "D", t: "When the six months ended, the headline results were striking. Of the 48 organisations, 41 chose to continue with the shorter week, and only two returned fully to the old schedule. Revenue across the group remained broadly stable, and in several firms it rose slightly. Staff reported lower levels of stress and fatigue, and sick days fell by roughly a third. At Pellwood Design, a small architecture practice, managers found that the number of job applications they received more than doubled once the four-day week was advertised, which allowed them to recruit more experienced staff than before." },
          { k: "E", t: "Researchers were keen to understand how the same work could be completed in less time. The most common explanation was that the trial forced organisations to remove inefficiencies they had long tolerated. Meetings were shortened or cancelled, and several firms introduced 'focus periods' during which emails and messages were not answered. Dr Tomasz Weller, an economist who analysed the data, argued that the gains came less from employees working harder than from managers finally questioning habits that nobody had examined for years. 'Most offices are full of rituals,' he noted, 'and a deadline like this makes them visible.' In some firms, staff themselves proposed the changes, which may help to explain why they were accepted so readily." },
          { k: "F", t: "Not every participant had a smooth experience, however. Brannock Bakeries, which depended on staff being present during long opening hours, struggled to cover shifts and had to hire additional part-time workers, increasing its costs. Some employees elsewhere admitted that their four days had become more intense, with fewer opportunities for informal conversation with colleagues. Dr Aisha Okonjo, a sociologist who interviewed staff at the end of the trial, warned that this intensity could gradually erode the sense of community within teams, even if it was not yet showing up in the productivity figures." },
          { k: "G", t: "Critics also point to the limitations of the evidence. The participating organisations volunteered to take part, which suggests their managers were already sympathetic to the idea and motivated to make it succeed. Six months may also be too short to reveal whether the improvements will fade once the novelty wears off. The Northbridge team accepts these concerns and plans to follow the organisations for a further three years. Even so, the trial has shifted the debate. The question many employers now ask is no longer whether a shorter week is possible at all, but which kinds of work it suits best, and how it can be introduced without placing new pressures on staff." }
        ],
        groups: [
          { type: "match",
            instr: "Reading Passage 2 has seven paragraphs, A–G. Choose the correct heading for paragraphs B–G from the list of headings below. Write the correct number, i–ix.",
            options: [
              "i Reasons to doubt how far the findings can be trusted",
              "ii A decision to let each participant find its own approach",
              "iii The historical origins of the five-day week",
              "iv Encouraging outcomes for most of the organisations involved",
              "v Practical difficulties and social pressures",
              "vi The circumstances that led to a large-scale study",
              "vii Changing habits rather than increasing effort",
              "viii Government plans to reform working-time laws",
              "ix Why employees prefer working from home"
            ],
            items: [
              { n: 14, text: "Paragraph B", a: "vi", cue: "Interest accelerated after the pandemic" },
              { n: 15, text: "Paragraph C", a: "ii", cue: "the organisers allowed each employer to design its own version" },
              { n: 16, text: "Paragraph D", a: "iv", cue: "Of the 48 organisations, 41 chose to continue with the shorter week" },
              { n: 17, text: "Paragraph E", a: "vii", cue: "the gains came less from employees working harder than from managers finally questioning habits" },
              { n: 18, text: "Paragraph F", a: "v", cue: "Not every participant had a smooth experience, however" },
              { n: 19, text: "Paragraph G", a: "i", cue: "Critics also point to the limitations of the evidence" }
            ] },
          { type: "mcq",
            instr: "Choose the correct letter, A, B, C or D.",
            items: [
              { n: 20, q: "What did each organisation in the Northbridge trial agree to do?",
                options: ["reduce salaries in line with the shorter hours", "cut working time without lowering pay", "hire extra staff for a period of six months", "share its productivity data with other companies"],
                a: 1, cue: "reduce working hours by around 20 per cent for six months while maintaining salaries" },
              { n: 21, q: "How did Halvard Logistics introduce the shorter week?",
                options: ["It closed every Friday from the beginning of the trial.", "It allowed staff to choose which day they took off.", "It shortened each working day before giving a whole day off.", "It kept its doors open by staggering staff days off."],
                a: 2, cue: "cutting thirty minutes a day for the first two months before moving to a full extra day off" },
              { n: 22, q: "What happened at Pellwood Design after the four-day week was advertised?",
                options: ["It received far more applications from job seekers.", "Its revenue more than doubled.", "It had to recruit less experienced staff.", "It went back to the five-day schedule."],
                a: 0, cue: "the number of job applications they received more than doubled once the four-day week was advertised" },
              { n: 23, q: "What does the writer suggest about the fact that organisations volunteered for the trial?",
                options: ["It made the trial less expensive to run.", "It allowed results to be collected more quickly.", "It meant the trial could be extended to three years.", "It may have increased the chances of a positive result."],
                a: 3, cue: "which suggests their managers were already sympathetic to the idea and motivated to make it succeed" }
            ] },
          { type: "match",
            instr: "Look at the following statements (Questions 24–26) and the list of researchers below. Match each statement with the correct researcher, A, B or C. NB You may use any letter more than once.",
            options: ["A Imogen Reyes", "B Tomasz Weller", "C Aisha Okonjo"],
            items: [
              { n: 24, text: "Improvements were mainly the result of re-examining long-established practices.", a: "B", cue: "managers finally questioning habits that nobody had examined for years" },
              { n: 25, text: "Less informal contact between staff could weaken team relationships over time.", a: "C", cue: "this intensity could gradually erode the sense of community within teams" },
              { n: 26, text: "Different kinds of workplace require different arrangements.", a: "A", cue: "A hospital ward and a design studio simply cannot reorganise their time in the same way" }
            ] }
        ],
        vocab: [
          { w: "take for granted", vi: "coi là điều hiển nhiên" },
          { w: "coordinated trial", vi: "thử nghiệm có phối hợp" },
          { w: "productivity", vi: "năng suất" },
          { w: "wellbeing", vi: "sức khỏe, hạnh phúc (tinh thần và thể chất)" },
          { w: "stagger", vi: "bố trí so le, xen kẽ" },
          { w: "revenue", vi: "doanh thu" },
          { w: "fatigue", vi: "sự mệt mỏi" },
          { w: "recruit", vi: "tuyển dụng" },
          { w: "inefficiency", vi: "sự kém hiệu quả" },
          { w: "intensity", vi: "cường độ" },
          { w: "erode", vi: "làm xói mòn, làm suy yếu dần" },
          { w: "sympathetic to", vi: "có thiện cảm với, ủng hộ" },
          { w: "the novelty wears off", vi: "hết cảm giác mới lạ" }
        ]
      },

      /* ---------------- PASSAGE 3 ---------------- */
      { n: 3, title: "Whose Heritage? The Case for Returning Museum Collections", titleVi: "Di sản của ai? Lập luận về việc hoàn trả hiện vật bảo tàng", topic: "Culture & Ethics", level: "C1",
        paras: [
          { k: "A", t: "Few debates in the cultural world have become as heated in recent years as the question of restitution: whether museums in Europe and North America should return objects that were removed from other parts of the world, often during periods of colonial rule. For much of the twentieth century, the major museums treated their collections as permanent and their ownership as beyond dispute. That confidence has now largely evaporated. Requests for return have multiplied, and a number of institutions have quietly transferred objects back to the communities from which they came. It is my contention that this trend, while far from straightforward, is broadly to be welcomed, though not for all the reasons usually given." },
          { k: "B", t: "The strongest argument for restitution concerns the circumstances of acquisition. A substantial proportion of the objects in question were not bought or exchanged on equal terms but seized during military campaigns, or obtained from people who had little real power to refuse. The bronze sculptures taken by British forces from Benin City in 1897 are a frequently cited example, though there are thousands of less famous cases. To argue that such objects were legally acquired because the law of the time permitted it is to accept that the conquering power was entitled to write the rules in its own favour. Few people would find that reasoning persuasive if it were applied to stolen property in any other context." },
          { k: "C", t: "Defenders of the existing arrangement typically make three counter-arguments. The first is that museums such as those in London, Paris or Berlin are 'universal' institutions, allowing visitors to compare the achievements of many civilisations under one roof. The second is that the objects are safer where they currently are, since museums in some countries of origin lack the resources to conserve them. The third is practical: if every claim were granted, the great collections would be emptied, and the public would lose access to works that millions currently see each year. These arguments deserve to be taken seriously, not least because they are often made in good faith by curators who care deeply about the objects in their charge." },
          { k: "D", t: "None of these arguments seems to me decisive. The idea of the universal museum has genuine intellectual appeal, but it is difficult to sustain when the visitors best able to benefit from it are those who can afford to travel to a handful of wealthy capitals. A young person in West Africa wishing to see the finest examples of her own region's art must, at present, obtain a visa and an expensive plane ticket. The conservation argument, meanwhile, is increasingly out of date. Several countries have built modern, climate-controlled museums specifically to receive returned objects, and it is worth remembering that European museums have themselves suffered fires, floods and wartime losses." },
          { k: "E", t: "The fear that collections will be emptied is, I think, the weakest of the three. In practice, claims for return tend to concern a relatively small number of objects of exceptional cultural or religious significance, not entire collections. Many communities have expressed willingness to lend returned items back to foreign museums, or to share them through jointly organised exhibitions. Restitution, in other words, need not be a matter of all or nothing; it can be the beginning of a more equal relationship rather than the end of one." },
          { k: "F", t: "That said, I am uneasy with some of the arguments made on the side of restitution. It is sometimes suggested that an object can only be properly understood in its place of origin, as though meaning were fixed to geography. This is plainly an overstatement: objects have always travelled, through trade, gift and migration, and their histories abroad are part of what they are. Nor is it always clear who the rightful recipient should be. Modern national borders frequently cut across the territories of the peoples who made the objects, and a national government may not represent the community with the strongest claim. Restitution carried out carelessly could simply transfer an object from one distant authority to another." },
          { k: "G", t: "What is needed, therefore, is not a blanket rule but a careful process. Museums should begin by researching the provenance of their holdings openly and publishing what they find, including uncomfortable details. Claims should be assessed case by case, with the participation of the communities concerned rather than governments alone. Where an object was clearly taken by force, the presumption should be in favour of return. Museums that adopt this approach may well find that their reputations are strengthened rather than diminished, and that the relationships they build prove more valuable than any single object they give up." }
        ],
        groups: [
          { type: "ynng",
            instr: "Do the following statements agree with the claims of the writer in Reading Passage 3? Write YES if the statement agrees with the claims of the writer, NO if the statement contradicts the claims of the writer, NOT GIVEN if it is impossible to say what the writer thinks about this.",
            items: [
              { n: 27, text: "Leading museums once considered their right to their collections to be unquestionable.", a: "YES", cue: "treated their collections as permanent and their ownership as beyond dispute" },
              { n: 28, text: "If an object was acquired lawfully under the rules of its time, this is enough to justify keeping it.", a: "NO", cue: "To argue that such objects were legally acquired because the law of the time permitted it is to accept that the conquering power was entitled to write the rules in its own favour" },
              { n: 29, text: "Visitor numbers at the major universal museums have fallen in recent years.", a: "NOT GIVEN", cue: "works that millions currently see each year" },
              { n: 30, text: "The claim that objects are safer in their current museums is now less convincing than it once was.", a: "YES", cue: "The conservation argument, meanwhile, is increasingly out of date" },
              { n: 31, text: "An object's meaning is determined entirely by the place where it was made.", a: "NO", cue: "This is plainly an overstatement" },
              { n: 32, text: "Returned objects are generally seen by more visitors than when they were held abroad.", a: "NOT GIVEN", cue: "Several countries have built modern, climate-controlled museums specifically to receive returned objects" }
            ] },
          { type: "summary", title: "The writer's proposed approach",
            instr: "Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
            limit: 2,
            items: [
              { n: 33, text: "The writer believes that restitution should not be governed by a ___ but handled through a careful process.", a: ["blanket rule"], cue: "not a blanket rule but a careful process" },
              { n: 34, text: "Museums should start by openly investigating the ___ of the objects they hold and making the results public.", a: ["provenance"], cue: "researching the provenance of their holdings openly" },
              { n: 35, text: "Decisions about claims should involve the ___ affected, not only national governments.", a: ["communities"], cue: "with the participation of the communities concerned rather than governments alone" },
              { n: 36, text: "When an item has clearly been taken ___, its return should be the default position.", a: ["by force"], cue: "Where an object was clearly taken by force" },
              { n: 37, text: "Rather than suffering, the ___ of museums that follow this approach could actually improve.", a: ["reputations"], cue: "their reputations are strengthened rather than diminished" },
              { n: 38, text: "The ___ that museums develop in the process may prove worth more than the objects they return.", a: ["relationships"], cue: "the relationships they build prove more valuable than any single object they give up" }
            ] },
          { type: "multi",
            instr: "Choose TWO letters, A–E.",
            q: "Which TWO points does the writer make about communities that request the return of objects?",
            n: [39, 40],
            options: [
              "A They usually ask for whole collections to be handed back.",
              "B Their requests mostly concern a limited number of highly significant items.",
              "C They prefer objects to be returned through national governments.",
              "D Many are willing to lend returned objects to museums abroad.",
              "E They have generally refused to take part in joint exhibitions."
            ],
            a: ["B", "D"],
            cue: "claims for return tend to concern a relatively small number of objects of exceptional cultural or religious significance" }
        ],
        vocab: [
          { w: "restitution", vi: "sự hoàn trả (tài sản cho chủ cũ)" },
          { w: "contention", vi: "luận điểm, quan điểm" },
          { w: "acquisition", vi: "sự thu nhận, sự sở hữu" },
          { w: "seize", vi: "chiếm đoạt, tịch thu" },
          { w: "counter-argument", vi: "lập luận phản bác" },
          { w: "conserve", vi: "bảo tồn" },
          { w: "decisive", vi: "mang tính quyết định" },
          { w: "intellectual appeal", vi: "sức hấp dẫn về mặt trí tuệ" },
          { w: "overstatement", vi: "sự cường điệu, nói quá" },
          { w: "rightful recipient", vi: "người nhận hợp pháp, chính đáng" },
          { w: "blanket rule", vi: "quy tắc áp dụng đồng loạt" },
          { w: "provenance", vi: "nguồn gốc xuất xứ" },
          { w: "case by case", vi: "xét từng trường hợp" },
          { w: "presumption", vi: "giả định mặc nhiên" }
        ]
      }
    ]
  });
})(typeof self !== 'undefined' ? self : this);
