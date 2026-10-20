/* Ngữ pháp – Bộ bài bổ sung 2: danh từ, sở hữu, tính từ, so sánh, đuôi -ed/-s, mục đích – kết quả, nguyên nhân – tương phản, quá khứ giả định, văn phong (tự biên soạn) */
(function (g) {
  const G = g.GRAMMAR = g.GRAMMAR || [];

  /* 1. Noun plurals */
  G.push({
    id: 'noun-plurals', unit: 'words', order: 7,
    title: 'Số nhiều của danh từ', en: 'Plural Nouns', level: 'B1', emoji: '👥',
    summary: 'Đa số thêm -s; sau s/sh/ch/x/z thêm -es; phụ âm + y → -ies; -f/-fe → -ves (trừ roof, chief, belief…); -o lúc +es lúc +s; nhóm bất quy tắc (men, teeth, mice), nhóm không đổi (sheep, species, series), nhóm luôn số nhiều (trousers, goods, earnings) và số nhiều gốc Latin/Hy Lạp rất hay gặp trong IELTS (phenomena, criteria, analyses, data).',
    blocks: [
      { type: 'sort', caption: 'Bốn nhóm quy tắc chính tả cơ bản – nhìn chữ cuối của danh từ để chọn nhóm', groups: [
        { title: '+ s (đa số danh từ)', emoji: '➕', items: ['book → books', 'idea → ideas', 'day → days', 'journey → journeys'] },
        { title: '+ es (sau s, ss, sh, ch, x, z)', emoji: '🔊', items: ['bus → buses', 'class → classes', 'dish → dishes', 'church → churches', 'box → boxes', 'quiz → quizzes'] },
        { title: 'Phụ âm + y → ies', emoji: '🔁', items: ['city → cities', 'study → studies', 'policy → policies', 'country → countries'] },
        { title: '-f / -fe → ves', emoji: '🍂', items: ['leaf → leaves', 'knife → knives', 'half → halves', 'life → lives', 'shelf → shelves'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Phụ âm + y → -ies', parts: [ { t: 'phụ âm + y', c: 'subj' }, { t: 'bỏ y', c: 'neg' }, { t: '+ ies', c: 'verb' } ], ex: 'Several [[studies]] have examined the [[effects]] of noise.' },
        { label: '-f / -fe → -ves', parts: [ { t: 'N tận cùng -f / -fe', c: 'subj' }, { t: 'bỏ f / fe', c: 'neg' }, { t: '+ ves', c: 'verb' } ], ex: 'Autumn [[leaves]] cover the paths in the park.' },
        { label: 'Nguyên âm + y → giữ y', parts: [ { t: 'nguyên âm + y', c: 'subj' }, { t: '+ s', c: 'verb' } ], ex: 'The [[boys]] spent their [[holidays]] in the mountains.' },
        { label: 'Tận cùng s, ss, sh, ch, x, z', parts: [ { t: 'N tận cùng s / sh / ch / x / z', c: 'subj' }, { t: '+ es', c: 'verb' } ], ex: 'She packed the [[glasses]] into two large [[boxes]].' },
        { label: 'Phụ âm + o (một số từ)', parts: [ { t: 'phụ âm + o', c: 'subj' }, { t: '+ es', c: 'verb' } ], ex: 'The [[farmers]] grow [[potatoes]] and [[tomatoes]] on the hills.' }
      ] },
      { type: 'table', head: ['Nhóm', 'Quy tắc', 'Ví dụ'], rows: [
        ['-o (thêm -es)', 'Một số từ quen thuộc tận cùng phụ âm + o', 'potatoes, tomatoes, heroes, echoes, vetoes'],
        ['-o (chỉ thêm -s)', 'Từ rút gọn, từ vay mượn, nguyên âm + o', 'photos, pianos, kilos, radios, videos, zoos'],
        ['-o (cả hai đều được)', 'Chấp nhận -s hoặc -es', 'volcanoes / volcanos, mosquitoes / mosquitos, zeros / zeroes'],
        ['-f ngoại lệ (chỉ + s)', 'Không đổi f thành v', 'roofs, chiefs, beliefs, proofs, cliffs, safes'],
        ['-f hai dạng', 'Cả -s và -ves đều đúng', 'scarfs / scarves, hoofs / hooves, dwarfs / dwarves'],
        ['Bất quy tắc', 'Đổi nguyên âm hoặc thêm -en', 'man → men, woman → women, tooth → teeth, foot → feet, goose → geese, mouse → mice, child → children, person → people, ox → oxen'],
        ['Không đổi', 'Số ít = số nhiều', 'sheep, deer, fish, species, series, means, aircraft, crossroads'],
        ['Luôn số nhiều', 'Đồ vật hai phần hoặc nghĩa đặc biệt → động từ số nhiều', 'trousers, jeans, scissors, glasses, goods, outskirts, earnings, surroundings, belongings'],
        ['Danh từ ghép', 'Số nhiều đặt ở danh từ CHÍNH', 'passer-by → passers-by, mother-in-law → mothers-in-law, toothbrush → toothbrushes, woman doctor → women doctors'],
        ['Chữ cái, con số', 'Thêm s (chữ cái thường hay thêm \'s cho dễ đọc)', 'two 7s, the 1990s, dot your i\'s and cross your t\'s']
      ] },
      { type: 'table', head: ['Số ít', 'Số nhiều', 'Ghi chú IELTS'], rows: [
        ['phenomenon', 'phenomena', 'hiện tượng – rất hay gặp trong Task 2 & Reading'],
        ['criterion', 'criteria', 'tiêu chí – "these criteria ARE…"'],
        ['analysis', 'analyses', '-is → -es: analysis, hypothesis → hypotheses, crisis → crises, thesis → theses, basis → bases'],
        ['datum', 'data', 'data thường dùng như danh từ không đếm được (the data shows) hoặc số nhiều (the data show) – cả hai được chấp nhận'],
        ['medium', 'media', 'the media = truyền thông; mediums dùng cho nghĩa "người đồng cốt"'],
        ['stimulus', 'stimuli', '-us → -i: stimulus, nucleus → nuclei, fungus → fungi'],
        ['curriculum', 'curricula / curriculums', 'cả hai dạng đều được dùng'],
        ['appendix', 'appendices / appendixes', 'phụ lục (sách) thường dùng appendices']
      ] },
      { type: 'uses', items: [
        { title: 'Số nhiều mang nghĩa khác: custom (phong tục) → customs (hải quan)', ex: 'It took us an hour to get through [[customs]] at the airport.', vi: 'Chúng tôi mất một tiếng để qua hải quan ở sân bay.' },
        { title: 'glass (thủy tinh, không đếm được) → glasses (kính đeo mắt / cốc)', ex: 'She cannot read the timetable without her [[glasses]].', vi: 'Cô ấy không đọc được bảng giờ nếu không đeo kính.' },
        { title: 'Một danh từ – hai dạng số nhiều, hai nghĩa: cloth → cloths (mảnh vải lau) / clothes (quần áo); penny → pennies (đồng xu) / pence (giá tiền)', ex: 'Wipe the table with one of the clean [[cloths]].', vi: 'Hãy lau bàn bằng một trong những mảnh vải sạch.' },
        { title: 'species, series, means: số ít và số nhiều cùng một dạng – nhìn từ hạn định để chia động từ', ex: 'This [[species]] is found only on two small [[islands]].', vi: 'Loài này chỉ được tìm thấy trên hai hòn đảo nhỏ.' },
        { title: 'Danh từ luôn số nhiều → động từ số nhiều; muốn đếm đồ vật hai phần (trousers, scissors, glasses…) thì dùng a pair of', ex: 'The [[goods were]] damaged during shipping.', vi: 'Hàng hóa bị hư hỏng trong quá trình vận chuyển.' },
        { title: 'Phenomena, criteria là số nhiều – đi với these / are', ex: 'These [[phenomena]] are difficult to explain.', vi: 'Những hiện tượng này rất khó giải thích.' }
      ] },
      { type: 'tip', text: 'Y đứng sau NGUYÊN ÂM (a, e, i, o, u) thì giữ nguyên: key → keys, journey → journeys, toy → toys. Tên riêng cũng giữ y: the Kennedys.' },
      { type: 'tip', text: 'Hundred, thousand, million đứng sau con số thì KHÔNG thêm s: two hundred people, three million dollars. Chỉ thêm s khi đi với of và không có số cụ thể: hundreds of people, millions of dollars.' },
      { type: 'mistake', wrong: 'These criterias are used to assess candidates.', right: 'These criteria are used to assess candidates.', why: 'Criteria đã là số nhiều (số ít: criterion), không thêm s.' },
      { type: 'mistake', wrong: 'Two passer-bys stopped to help the driver.', right: 'Two passers-by stopped to help the driver.', why: 'Danh từ ghép: thêm s vào danh từ chính (passer), không phải cuối cụm.' },
      { type: 'mistake', wrong: 'My new trouser is too long.', right: 'My new trousers are too long.', why: 'Trousers luôn ở dạng số nhiều và đi với động từ số nhiều.' },
      { type: 'mistake', wrong: 'There were three hundreds people at the meeting.', right: 'There were three hundred people at the meeting.', why: 'Sau con số cụ thể, hundred không thêm s.' },
      { type: 'ielts', text: 'Trong Writing Task 1 và Task 2, các danh từ học thuật như data, criteria, phenomena, analyses, the media xuất hiện thường xuyên. Viết đúng dạng số ít/số nhiều và chia động từ thống nhất giúp tăng điểm Grammatical Range & Accuracy.', ex: 'Several recent [[analyses]] suggest that these [[phenomena]] are linked to climate change.' }
    ],
    quiz: [
      { q: 'The museum has a collection of ancient ___.', options: ['knifes', 'knives', 'knive', 'knifees'], answer: 1, explain: 'Danh từ tận cùng -fe/-f thường đổi thành -ves khi ở số nhiều: knife → knives. knifes, knive, knifees đều sai dạng số nhiều.' },
      { q: 'Scientists are still trying to explain these strange ___.', options: ['phenomenon', 'phenomenons', 'phenomenas', 'phenomena'], answer: 3, explain: 'Số nhiều của phenomenon là phenomena (gốc Hy Lạp, these đi với số nhiều). phenomenon là số ít; "phenomenons", "phenomenas" sai dạng.' },
      { q: 'The farm has about two hundred ___.', options: ['sheep', 'sheeps', 'sheepes', 'sheepies'], answer: 0, explain: 'sheep có số nhiều giống số ít → two hundred sheep. "sheeps", "sheepes", "sheepies" đều sai.' },
      { q: 'Both of my ___ live in Da Nang.', options: ['brother-in-laws', 'brother-ins-law', 'brothers-in-law', 'brothers-in-laws'], answer: 2, explain: 'Danh từ ghép: số nhiều ở danh từ chính → brothers-in-law. Ba phương án còn lại thêm -s sai vị trí hoặc thừa -s.' },
      { q: 'The report compares the ___ of three different countries.', options: ['economys', 'economies', 'economyes', 'economis'], answer: 1, explain: 'Phụ âm (m) + y → đổi y thành -ies: economies. "economys", "economyes", "economis" sai quy tắc.' },
      { q: 'The ___ of several police departments met to discuss the issue.', options: ['chieves', 'chief', 'chiefes', 'chiefs'], answer: 3, explain: 'chief là ngoại lệ của quy tắc -f → -ves: chỉ thêm -s → chiefs. "chieves", "chiefes" sai; chief là số ít, không hợp với several departments.' },
      { q: 'Câu nào đúng?', options: ['My new scissors is very sharp.', 'The goods was shipped from Japan.', 'The outskirts of the city are growing quickly.', 'His earning has doubled since 2020.'], answer: 2, explain: 'Outskirts luôn số nhiều → are. Sửa: scissors are, goods were, his earnings have.' },
      { q: 'Câu nào đúng?', options: ['The two analyses produced different results.', 'The two analysis produced different results.', 'The two analysises produced different results.', 'The two analysis\'s produced different results.'], answer: 0, explain: 'Danh từ gốc Hy Lạp tận cùng -is đổi thành -es khi ở số nhiều: analysis → analyses. "two" yêu cầu danh từ số nhiều.' },
      { q: 'Câu nào đúng?', options: ['There were three hundreds people at the concert.', 'There were hundred of people at the concert.', 'There were three hundreds of people at the concert.', 'There were hundreds of people at the concert.'], answer: 3, explain: 'Không có số cụ thể: hundreds of + N. Có số: three hundred people. "three hundreds" sai (có số thì không thêm s); "hundred of" thiếu s; "three hundreds of" sai cả hai.' },
      { q: 'Chọn dạng số nhiều ĐÚNG của "potato", "photo", "hero":', options: ['potatos, photoes, heros', 'potatoes, photos, heroes', 'potatoes, photoes, heroes', 'potatos, photos, heros'], answer: 1, explain: 'potatoes, heroes (+es); photo là từ rút gọn → photos. potatos và heros thiếu -es; photoes thừa -e.' },
      { q: 'Câu nào đúng?', options: ['The teeths of the child were checked.', 'The farmer keeps gooses and ducks.', 'Several men and women were interviewed.', 'Most childs enjoy outdoor games.'], answer: 2, explain: 'Men, women là số nhiều bất quy tắc. Sửa: teeth, geese, children.' },
      { q: 'Từ "customs" trong câu "We went through customs quickly." nghĩa là gì?', options: ['phong tục', 'khách hàng', 'hải quan', 'thói quen'], answer: 2, explain: 'Customs (số nhiều) = hải quan; custom (số ít) = phong tục. phong tục là custom (số ít); khách hàng là customers; thói quen là habits.' }
    ],
    drills: [
      { t: 'form', q: 'Recent ___ show that sleep has a strong effect on memory. (STUDY)', a: ['studies'], ex: 'Phụ âm + y → -ies: study → studies.' },
      { t: 'form', q: 'The two main ___ for the scholarship are academic results and motivation. (CRITERION)', a: ['criteria'], ex: 'Criterion → criteria (số nhiều gốc Hy Lạp).' },
      { t: 'form', q: 'The dentist said that two of my ___ need to be removed. (TOOTH)', a: ['teeth'], ex: 'Tooth → teeth (bất quy tắc, đổi nguyên âm).' },
      { t: 'rewrite', q: 'This species of bird is rare.', start: 'These species', a: ['These species of bird are rare.', 'These species of birds are rare.'], ex: 'Species không đổi dạng; these → động từ số nhiều are.' },
      { t: 'rewrite', q: 'That woman doctor works at the city hospital.', start: 'Those', a: ['Those women doctors work at the city hospital.'], ex: 'Danh từ ghép với man/woman: cả hai phần đều đổi sang số nhiều → women doctors.' },
      { t: 'rewrite', q: 'This analysis is based on a new hypothesis.', start: 'These', a: ['These analyses are based on new hypotheses.', 'These analyses are based on a new hypothesis.'], ex: 'Đổi sang số nhiều: this → these, is → are; analysis → analyses, hypothesis → hypotheses (-is → -es).' },
      { t: 'combine', q: 'Tom has a mother-in-law. Mark also has a mother-in-law.', hint: 'Both … have …', start: 'Both Tom and Mark', a: ['Both Tom and Mark have mothers-in-law.'], ex: 'Số nhiều của mother-in-law là mothers-in-law.' },
      { t: 'combine', q: 'There was one sheep in the field. Then four more sheep arrived.', hint: 'There were …', start: 'There were five', a: ['There were five sheep in the field.', 'There were five sheep in the field then.'], ex: 'Sheep không đổi ở số nhiều: five sheep.' },
      { t: 'error', parts: ['The scissors', 'is on', 'the top shelf', 'in the kitchen.'], w: 1, fix: 'are on', ex: 'Scissors luôn số nhiều → động từ are.' },
      { t: 'error', parts: ['Both', 'passer-bys', 'stopped to help', 'the injured cyclist.'], w: 1, fix: 'passers-by', ex: 'Số nhiều đặt ở danh từ chính: passers-by.' }
    ]
  });

  /* 2. Possessive case */
  G.push({
    id: 'possessive-case', unit: 'words', order: 8,
    title: 'Sở hữu cách', en: 'The Possessive Case', level: 'B1', emoji: '🔑',
    summary: 'Người/động vật/tổ chức + \'s (số nhiều tận cùng -s chỉ thêm \'); vật và khái niệm thường dùng "of"; sở hữu kép a friend of mine; thời gian – đo lường (a week\'s holiday, two hours\' delay); cửa hàng (at the dentist\'s); sở hữu chung (Tom and Anna\'s) và riêng (Tom\'s and Anna\'s).',
    blocks: [
      { type: 'diagram', caption: 'Chọn cách diễn đạt sở hữu theo loại danh từ', steps: [
        { t: 'the car of my father', c: 'note' },
        { t: '↓ người sở hữu + \'s', c: 'arrow' },
        { t: 'my father\'s car', c: 'result' },
        { t: '↓ danh từ số nhiều tận cùng -s: chỉ thêm \'', c: 'arrow' },
        { t: 'my parents\' car', c: 'active' },
        { t: '↓ vật hoặc khái niệm: dùng of', c: 'arrow' },
        { t: 'the roof of the house / the cost of living', c: 'passive' }
      ] },
      { type: 'formula', rows: [
        { label: 'Số ít / số nhiều bất quy tắc', parts: [ { t: 'Người sở hữu', c: 'subj' }, { t: '\'s', c: 'aux' }, { t: 'Vật được sở hữu', c: 'obj' } ], ex: 'The [[children\'s]] playground was closed for repairs.' },
        { label: 'Số nhiều tận cùng -s', parts: [ { t: 'N số nhiều -s', c: 'subj' }, { t: '\' (chỉ dấu nháy)', c: 'aux' }, { t: 'N', c: 'obj' } ], ex: 'The [[students\']] essays were marked by two examiners.' },
        { label: 'Cấu trúc of (vật, ý trừu tượng)', parts: [ { t: 'the + N (bộ phận)', c: 'obj' }, { t: 'of', c: 'aux' }, { t: 'the + N (tổng thể)', c: 'subj' } ], ex: '[[The main cause of the problem]] is poor planning.' },
        { label: 'Sở hữu kép', parts: [ { t: 'a / an / this + N', c: 'obj' }, { t: 'of', c: 'aux' }, { t: 'mine / Tom\'s', c: 'subj' } ], ex: '[[A colleague of mine]] recommended this course.' },
        { label: 'Thời gian & đo lường', parts: [ { t: 'số lượng + đơn vị thời gian', c: 'time' }, { t: '\'s / \'', c: 'aux' }, { t: 'N', c: 'obj' } ], ex: 'She took [[a week\'s holiday]] after the exams.' }
      ] },
      { type: 'uses', items: [
        { title: 'Danh từ riêng số ít tận cùng -s: thêm \'s (phổ biến) hoặc chỉ \'', ex: 'We stayed at [[James\'s flat]] for the weekend.', vi: 'Chúng tôi ở căn hộ của James cuối tuần đó.' },
        { title: 'Tổ chức, quốc gia, thành phố cũng dùng \'s', ex: '[[The government\'s]] new policy has been widely criticised.', vi: 'Chính sách mới của chính phủ bị chỉ trích rộng rãi.' },
        { title: 'Cửa hàng, phòng khám, nhà ai đó: bỏ danh từ sau \'s', ex: 'I have an appointment at [[the dentist\'s]] tomorrow morning.', vi: 'Sáng mai tôi có lịch hẹn ở phòng khám nha khoa.' },
        { title: 'Sở hữu CHUNG: chỉ thêm \'s vào người cuối', ex: '[[Tom and Anna\'s house]] is near the river.', vi: 'Ngôi nhà (chung) của Tom và Anna ở gần sông.' },
        { title: 'Sở hữu RIÊNG: thêm \'s cho từng người', ex: '[[Tom\'s and Anna\'s phones]] are both broken.', vi: 'Điện thoại của Tom và điện thoại của Anna đều hỏng.' },
        { title: 'Mốc thời gian: today\'s, last year\'s, next week\'s', ex: '[[Today\'s lecture]] focuses on urban planning.', vi: 'Bài giảng hôm nay tập trung vào quy hoạch đô thị.' }
      ] },
      { type: 'table', head: ['Trường hợp', 'Cách viết', 'Ví dụ'], rows: [
        ['Danh từ số ít', '+ \'s', 'the teacher\'s desk'],
        ['Số nhiều tận cùng -s', '+ \'', 'the teachers\' room'],
        ['Số nhiều bất quy tắc', '+ \'s', 'women\'s rights, people\'s opinions, children\'s books'],
        ['Danh từ ghép', '\'s ở từ cuối', 'my sister-in-law\'s car'],
        ['Vật / khái niệm', 'of', 'the end of the film, the cost of living'],
        ['Thời gian, khoảng cách', '\'s / \'', 'a week\'s holiday, two hours\' delay, ten minutes\' walk'],
        ['Sở hữu kép', 'of + đại từ sở hữu / N\'s', 'a friend of mine, a cousin of Tom\'s']
      ] },
      { type: 'tip', text: 'Its (của nó) KHÔNG có dấu nháy; it\'s = it is / it has. Đại từ sở hữu hers, ours, yours, theirs cũng không bao giờ có dấu nháy.' },
      { type: 'tip', text: 'Với đồ vật, tiếng Anh hay dùng danh từ ghép thay cho sở hữu cách: the car door, a table leg, the kitchen window – tự nhiên hơn "the car\'s door".' },
      { type: 'mistake', wrong: 'The childrens\' toys were everywhere.', right: 'The children\'s toys were everywhere.', why: 'Children đã là số nhiều bất quy tắc (không tận cùng -s) → thêm \'s.' },
      { type: 'mistake', wrong: 'She is a good friend of me.', right: 'She is a good friend of mine.', why: 'Sở hữu kép: of + đại từ sở hữu (mine, yours, his…).' },
      { type: 'mistake', wrong: 'The company has changed it\'s logo.', right: 'The company has changed its logo.', why: 'Tính từ sở hữu its không có dấu nháy.' },
      { type: 'mistake', wrong: 'Nam\'s and Lan\'s flat is very small. (họ ở chung một căn)', right: 'Nam and Lan\'s flat is very small.', why: 'Sở hữu chung một vật: chỉ thêm \'s vào người cuối.' },
      { type: 'ielts', text: 'Task 1 thường dùng sở hữu cách cho quốc gia, thành phố và mốc thời gian: the country\'s population, the city\'s residents, the UK\'s share, in ten years\' time. Ngắn gọn hơn so với cấu trúc of.', ex: 'In [[ten years\' time]], the [[country\'s]] elderly population is expected to double.' }
    ],
    quiz: [
      { q: 'The ___ changing room is on the left.', options: ['womens\'', 'women\'s', 'women\'', 'womans\''], answer: 1, explain: 'women là số nhiều bất quy tắc (không tận cùng -s) → thêm \'s: women\'s. "womens\'", "women\'", "womans\'" đều sai cách thêm dấu sở hữu.' },
      { q: 'All the ___ bags must be checked before boarding.', options: ['passengers\'', 'passenger\'s', 'passengers\'s', 'passenger\''], answer: 0, explain: 'passengers là số nhiều tận cùng -s → chỉ thêm dấu nháy: passengers\'. passenger\'s là một hành khách (không hợp với All); "passengers\'s" và "passenger\'" sai.' },
      { q: 'I\'m going to the ___ to buy some medicine.', options: ['chemist', 'chemists\'', 'chemist of', 'chemist\'s'], answer: 3, explain: 'Chỉ cửa hàng dùng sở hữu cách: the chemist\'s (= the chemist\'s shop, hiệu thuốc). chemist là người dược sĩ; "chemists\'" là nhiều dược sĩ; "chemist of" sai cấu trúc.' },
      { q: 'Peter is an old friend of ___.', options: ['me', 'my', 'mine', 'I'], answer: 2, explain: 'Sở hữu kép: a friend of + đại từ sở hữu → a friend of mine. me, my, I không dùng sau of trong cấu trúc này.' },
      { q: 'The town is only ten ___ drive from the coast.', options: ['minutes\'', 'minute\'s', 'minutes', 'minute'], answer: 0, explain: 'Khoảng thời gian số nhiều làm bổ ngữ → ten minutes\' drive. minute\'s là số ít; "minutes" và "minute" thiếu dấu sở hữu.' },
      { q: 'The company announced ___ annual profits yesterday.', options: ['it\'s', 'its\'', 'its', 'it is'], answer: 2, explain: 'Tính từ sở hữu của it: its (không dấu nháy) → its annual profits. it\'s = it is; "its\'" không tồn tại; "it is" sai nghĩa.' },
      { q: 'Câu nào đúng? (Nam và Lan cùng sở hữu MỘT căn hộ)', options: ['Nam\'s and Lan\'s flat is small.', 'Nam and Lan\'s flat is small.', 'Nam\' and Lan\' flat is small.', 'Nam and Lan flat\'s is small.'], answer: 1, explain: 'Hai người cùng sở hữu một vật → chỉ thêm \'s ở người cuối: Nam and Lan\'s flat. "Nam\'s and Lan\'s" là sở hữu riêng; hai phương án còn lại đặt dấu sai.' },
      { q: 'Câu nào đúng? (Mỗi người có một chiếc xe riêng)', options: ['Mark and Ben\'s cars are both red.', 'Mark and Ben cars\' are both red.', 'Marks\' and Bens\' cars are both red.', 'Mark\'s and Ben\'s cars are both red.'], answer: 3, explain: 'Mỗi người sở hữu riêng → thêm \'s cho từng người: Mark\'s and Ben\'s cars. "Mark and Ben\'s" là sở hữu chung; "Marks\'" sai dạng; "Ben cars\'" sai vị trí.' },
      { q: 'Câu nào đúng?', options: ['I took a week\'s holiday in June.', 'I took a weeks\' holiday in June.', 'I took a week holiday\'s in June.', 'I took one weeks holiday in June.'], answer: 0, explain: 'Một tuần (số ít) làm bổ ngữ cho holiday → a week\'s holiday. "a weeks\'" sai số; "week holiday\'s" sai vị trí; "one weeks holiday" thiếu dấu sở hữu.' },
      { q: 'Câu nào đúng?', options: ['The tickets\'s price has gone up.', 'The price of the tickets has gone up.', 'The price\'s tickets has gone up.', 'The tickets of price has gone up.'], answer: 1, explain: 'Với vật, dùng the price of the tickets (hoặc the tickets\' price). "tickets\'s" thừa s; "price\'s tickets" đảo nghĩa; "tickets of price" sai trật tự.' },
      { q: 'Câu nào cùng nghĩa? "This laptop belongs to my brother-in-law."', options: ['This is my brother\'s-in-law laptop.', 'This is my brothers-in-law laptop.', 'This is my brother-in-law\'s laptop.', 'This is my brother-in-laws\' laptop.'], answer: 2, explain: 'Danh từ ghép: \'s đặt ở cuối cả cụm → my brother-in-law\'s laptop. Các phương án khác đặt \'s giữa cụm hoặc dùng sai số nhiều.' },
      { q: 'Câu nào cùng nghĩa? "The opinions of the residents matter."', options: ['The resident\'s opinions matter.', 'The residents opinions matter.', 'The residents\'s opinions matter.', 'The residents\' opinions matter.'], answer: 3, explain: 'residents là số nhiều tận cùng -s → residents\'. resident\'s là một cư dân (sai nghĩa); "residents" thiếu dấu sở hữu; "residents\'s" sai.' }
    ],
    drills: [
      { t: 'form', q: 'Linh has been a close friend of ___ since primary school. (I)', a: ['mine'], ex: 'Sở hữu kép: a friend of + đại từ sở hữu → mine.' },
      { t: 'form', q: 'The ___ section of the library is full of picture books. (CHILDREN)', a: ['children\'s'], ex: 'Số nhiều bất quy tắc (không tận cùng -s) → thêm \'s.' },
      { t: 'form', q: 'We spent the summer at our ___ house in the countryside. (GRANDPARENTS)', a: ['grandparents\''], ex: 'Số nhiều tận cùng -s → chỉ thêm dấu nháy: grandparents\'.' },
      { t: 'rewrite', q: 'The opinions of the students were ignored.', start: 'The students\'', a: ['The students\' opinions were ignored.'], ex: 'Students (số nhiều -s) → students\'.' },
      { t: 'rewrite', q: 'The holiday lasted for two weeks.', start: 'It was', a: ['It was two weeks\' holiday.', 'It was a two-week holiday.', 'It was a two week holiday.'], ex: 'Thời gian: two weeks\' holiday; hoặc tính từ ghép a two-week holiday (week không có s).' },
      { t: 'rewrite', q: 'Huy and Mai share a flat. The flat is near the university.', start: 'Huy and Mai\'s', a: ['Huy and Mai\'s flat is near the university.'], ex: 'Sở hữu chung một căn hộ → \'s chỉ ở người cuối.' },
      { t: 'combine', q: 'Anna has a laptop. Ben has a different laptop. Both laptops are new.', hint: '\'s … \'s', start: 'Anna\'s', a: ['Anna\'s and Ben\'s laptops are new.', 'Anna\'s and Ben\'s laptops are both new.'], ex: 'Hai vật riêng → \'s cho từng người, danh từ số nhiều laptops.' },
      { t: 'combine', q: 'I have a cousin. She works for an airline.', hint: 'a … of mine', start: 'A cousin of mine', a: ['A cousin of mine works for an airline.'], ex: 'Sở hữu kép: a cousin of mine.' },
      { t: 'error', parts: ['The company', 'has updated', 'it\'s', 'privacy policy.'], w: 2, fix: 'its', ex: 'Tính từ sở hữu its không có dấu nháy; it\'s = it is.' },
      { t: 'error', parts: ['The childrens\'', 'toys', 'were left', 'in the garden.'], w: 0, fix: 'The children\'s', ex: 'Children đã là số nhiều → children\'s.' }
    ]
  });

  /* 3. Special adjectives */
  G.push({
    id: 'adjectives-special', unit: 'words', order: 9,
    title: 'Tính từ đặc biệt', en: 'Special Uses of Adjectives', level: 'B2', emoji: '🎨',
    summary: 'Phân từ làm tính từ (a broken window, a growing number), danh từ ghép số đếm không có s (a ten-year-old girl, a five-minute walk), the + tính từ chỉ một nhóm người (the elderly, the unemployed), tính từ chỉ đứng sau động từ (afraid, asleep, alone), tính từ đứng sau danh từ/đại từ (something new, the people involved) và trật tự tính từ trước danh từ.',
    blocks: [
      { type: 'diagram', caption: 'Trật tự tính từ trước danh từ (thực tế thường chỉ dùng 2–3 tính từ): a lovely old Italian dining table', steps: [
        { t: '1. Ý kiến – lovely, useful', c: 'note' },
        { t: '2. Kích thước – large, tiny', c: 'active' },
        { t: '3. Tuổi – old, new', c: 'active' },
        { t: '4. Hình dạng – round, square', c: 'if' },
        { t: '5. Màu sắc – red, green', c: 'if' },
        { t: '6. Nguồn gốc – Italian, Japanese', c: 'passive' },
        { t: '7. Chất liệu – wooden, cotton', c: 'passive' },
        { t: '8. Mục đích – dining, running', c: 'result' },
        { t: '→ DANH TỪ (table, shoes…)', c: 'arrow' }
      ] },
      { type: 'sort', caption: 'Bốn nhóm tính từ đặc biệt', groups: [
        { title: 'Chỉ đứng SAU động từ', emoji: '➡️', items: ['afraid', 'asleep', 'awake', 'alive', 'alone', 'aware', 'ashamed', 'alike'] },
        { title: 'Chỉ đứng TRƯỚC danh từ', emoji: '⬅️', items: ['main', 'chief', 'only', 'mere', 'sheer', 'upper', 'elder', 'outdoor'] },
        { title: 'The + tính từ = nhóm người', emoji: '👨‍👩‍👧', items: ['the elderly', 'the poor', 'the rich', 'the unemployed', 'the homeless', 'the young', 'the disabled'] },
        { title: 'Số + danh từ làm tính từ (không s)', emoji: '🔢', items: ['a ten-year-old girl', 'a five-minute walk', 'a two-day course', 'a 500-page report'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Số + danh từ làm tính từ', parts: [ { t: 'a / an', c: 'aux' }, { t: 'số – N số ít (gạch nối)', c: 'adv' }, { t: 'N chính', c: 'subj' } ], ex: 'It is only a [[five-minute walk]] to the station.' },
        { label: 'The + tính từ = nhóm người', parts: [ { t: 'The', c: 'aux' }, { t: 'adj', c: 'adv' }, { t: 'V số nhiều', c: 'verb' } ], ex: '[[The elderly]] need better access to healthcare.' },
        { label: 'Phân từ làm tính từ', parts: [ { t: 'V-ing (chủ động) / V3-ed (bị động)', c: 'verb' }, { t: 'N', c: 'subj' } ], ex: '[[A growing number of]] people work from home.' },
        { label: 'Đại từ bất định + tính từ', parts: [ { t: 'something / anyone / nothing…', c: 'subj' }, { t: 'adj', c: 'adv' } ], ex: 'Let\'s try [[something different]] this weekend.' },
        { label: 'Tính từ đứng sau danh từ', parts: [ { t: 'the + N', c: 'subj' }, { t: 'involved / concerned / present / available', c: 'adv' } ], ex: '[[All the people involved]] were questioned by the police.' }
      ] },
      { type: 'uses', items: [
        { title: 'Phân từ hiện tại (-ing): đang diễn ra, mang nghĩa chủ động', ex: '[[Rising sea levels]] threaten many coastal cities.', vi: 'Mực nước biển dâng đe dọa nhiều thành phố ven biển.' },
        { title: 'Phân từ quá khứ (-ed / V3): bị tác động hoặc đã hoàn tất', ex: 'Many of [[the stolen paintings]] were never recovered.', vi: 'Nhiều bức tranh bị đánh cắp không bao giờ được tìm lại.' },
        { title: 'Danh từ đứng trước danh từ đóng vai trò tính từ', ex: 'The [[city council]] approved a new [[car park]].', vi: 'Hội đồng thành phố đã duyệt một bãi đỗ xe mới.' },
        { title: 'Tính từ bắt đầu bằng a- chỉ đứng sau động từ; trước danh từ phải đổi từ (asleep → sleeping, alive → living)', ex: 'The baby is [[asleep]], so please keep quiet.', vi: 'Em bé đang ngủ, vì vậy hãy giữ yên lặng. (trước danh từ: a sleeping baby)' },
        { title: 'Một số tính từ đổi nghĩa theo vị trí: the people concerned (người liên quan) ≠ concerned people (người lo lắng)', ex: 'The manager spoke to [[the staff concerned]].', vi: 'Quản lý đã nói chuyện với những nhân viên có liên quan.' }
      ] },
      { type: 'table', head: ['Thứ tự', 'Loại', 'Ví dụ cụm danh từ'], rows: [
        ['1', 'Ý kiến (opinion)', 'a useful little guide'],
        ['2', 'Kích thước (size)', 'a huge old building'],
        ['3', 'Tuổi (age)', 'a new round table'],
        ['4', 'Hình dạng (shape)', 'a square blue box'],
        ['5', 'Màu sắc (colour)', 'a white Japanese car'],
        ['6', 'Nguồn gốc (origin)', 'a French silk scarf'],
        ['7', 'Chất liệu (material)', 'a plastic shopping bag'],
        ['8', 'Mục đích (purpose)', 'a pair of comfortable running shoes']
      ] },
      { type: 'tip', text: 'Mẹo nhớ trật tự tính từ: "Ý – Cỡ – Tuổi – Hình – Màu – Gốc – Chất – Dụng" (opinion → purpose). Trong bài viết, hiếm khi dùng quá 3 tính từ trước một danh từ.' },
      { type: 'tip', text: 'The + tính từ KHÔNG thêm s và luôn đi với động từ số nhiều: the rich ARE…, the unemployed NEED… Muốn nói một người, dùng an elderly person, a homeless man.' },
      { type: 'mistake', wrong: 'She has a five-years-old son.', right: 'She has a five-year-old son.', why: 'Cụm số + danh từ đứng trước danh từ đóng vai trò tính từ → danh từ không thêm s.' },
      { type: 'mistake', wrong: 'The unemployeds needs more support.', right: 'The unemployed need more support.', why: 'The + tính từ không thêm s và đi với động từ số nhiều.' },
      { type: 'mistake', wrong: 'I saw an asleep cat on the sofa.', right: 'I saw a sleeping cat on the sofa.', why: 'Asleep chỉ đứng sau động từ; trước danh từ dùng sleeping.' },
      { type: 'mistake', wrong: 'She bought a leather black expensive bag.', right: 'She bought an expensive black leather bag.', why: 'Trật tự: ý kiến (expensive) → màu (black) → chất liệu (leather).' },
      { type: 'ielts', text: 'Task 2 thường bàn về các nhóm xã hội: the elderly, the unemployed, the disabled, the homeless, the young. Task 1 hay dùng phân từ làm tính từ và tính từ ghép: a growing number, a declining population, a ten-year period.', ex: 'Governments should provide more affordable housing for [[the young]] and [[the homeless]].' }
    ],
    quiz: [
      { q: 'It was a ___ journey, so we stopped twice for a rest.', options: ['six-hours', 'six-hour', 'six hours\'s', 'six-hours\''], answer: 1, explain: 'Tính từ ghép số + danh từ: không thêm s → a six-hour journey. "six-hours" sai số; "six hours\'s" và "six-hours\'" sai sở hữu.' },
      { q: 'The government has introduced new measures to help ___.', options: ['the poors', 'poor', 'the poor people\'s', 'the poor'], answer: 3, explain: 'The + tính từ = cả nhóm người: the poor (người nghèo), mang nghĩa số nhiều. "the poors" sai (không thêm s); poor thiếu the; "the poor people\'s" thừa sở hữu cách.' },
      { q: 'There is a ___ demand for electric cars.', options: ['growing', 'grown', 'grow', 'growth'], answer: 0, explain: 'Nhu cầu đang tăng (chủ động, đang diễn ra) → growing. grown mang nghĩa đã xong; grow là động từ; growth là danh từ.' },
      { q: 'Is there ___ in the newspaper today?', options: ['interesting anything', 'anything interesting', 'something interested', 'interesting something'], answer: 1, explain: 'Đại từ bất định (anything, something…) đứng trước tính từ → anything interesting. "interesting anything" sai trật tự; "something interested" sai tính từ (-ed); "interesting something" sai trật tự.' },
      { q: 'Don\'t wake him up – he is still ___.', options: ['sleep', 'slept', 'asleep', 'sleeps'], answer: 2, explain: 'asleep là tính từ chỉ đứng sau động từ be (vị ngữ) → is still asleep. sleep là động từ/danh từ; slept là V2/V3; sleeps là động từ chia ngôi ba.' },
      { q: 'She was wearing a ___ dress.', options: ['red beautiful long', 'long beautiful red', 'red long beautiful', 'beautiful long red'], answer: 3, explain: 'Ý kiến (beautiful) → kích thước (long) → màu (red). Ba phương án còn lại sai trật tự ý kiến – kích thước – màu sắc.' },
      { q: 'Câu nào đúng?', options: ['The elderly is often lonely.', 'The elderlies are often lonely.', 'The elderly are often lonely.', 'An elderly are often lonely.'], answer: 2, explain: 'The elderly (người cao tuổi nói chung) + động từ số nhiều → are. "is" chia số ít; "elderlies" sai (không thêm s); "An elderly are" sai mạo từ.' },
      { q: 'Câu nào đúng?', options: ['He lives alone in a small flat.', 'He is an alone man.', 'The alone students stayed behind.', 'She felt alonely at night.'], answer: 0, explain: 'Alone chỉ đứng sau động từ. Trước danh từ dùng lonely / single… alone không đứng trước danh từ; "alonely" không tồn tại.' },
      { q: 'Câu nào đúng?', options: ['They bought an old lovely wooden house.', 'They bought a wooden lovely old house.', 'They bought a lovely wooden old house.', 'They bought a lovely old wooden house.'], answer: 3, explain: 'Trật tự tính từ: ý kiến (lovely) → tuổi (old) → chất liệu (wooden) → a lovely old wooden house. Ba phương án kia sai trật tự.' },
      { q: 'Câu nào đúng?', options: ['We need a 2000-word essay.', 'We need a 2000-words essay.', 'We need a 2000 words\'s essay.', 'We need an essay 2000-words.'], answer: 0, explain: 'Tính từ ghép số + danh từ số ít: a 2000-word essay. "2000-words" sai số; "2000 words\'s" sai sở hữu; "essay 2000-words" sai vị trí.' },
      { q: 'Câu nào cùng nghĩa? "The people who were responsible for the error were dismissed."', options: ['The responsible people for the error were dismissed.', 'The people responsible for the error were dismissed.', 'The responsibles were dismissed for the error.', 'The people were responsible dismissed.'], answer: 1, explain: 'Tính từ có cụm bổ nghĩa đi kèm đứng SAU danh từ: the people responsible for… "responsible people for" đặt tính từ sai vị trí; "The responsibles" sai; câu 4 đổi nghĩa.' },
      { q: 'Câu nào cùng nghĩa? "Prices are rising, and this worries consumers."', options: ['Risen prices worry consumers.', 'Prices risen worry consumers.', 'Rising prices worry consumers.', 'Rise prices worry consumers.'], answer: 2, explain: 'Giá đang tăng (quá trình đang diễn ra) → hiện tại phân từ: rising prices. risen/Prices risen mang nghĩa đã tăng xong; "Rise prices" dùng động từ làm tính từ, sai.' }
    ],
    drills: [
      { t: 'form', q: 'Many charities provide free meals for ___ in winter. (HOMELESS)', a: ['the homeless'], ex: 'The + tính từ = nhóm người: the homeless.' },
      { t: 'form', q: 'The police found the ___ car abandoned in a car park. (STEAL)', a: ['stolen'], ex: 'Chiếc xe bị đánh cắp (bị động) → phân từ quá khứ stolen.' },
      { t: 'form', q: 'A ___ number of students are choosing online courses. (GROW)', a: ['growing'], ex: 'Số lượng đang tăng → phân từ hiện tại growing.' },
      { t: 'rewrite', q: 'The walk to the station takes five minutes.', start: 'It is a', a: ['It is a five-minute walk to the station.', 'It is a five minute walk to the station.'], ex: 'Tính từ ghép số + danh từ số ít: a five-minute walk.' },
      { t: 'rewrite', q: 'People who have no job need more support from the state.', start: 'The', a: ['The unemployed need more support from the state.', 'The jobless need more support from the state.'], ex: 'The + tính từ (unemployed) + động từ số nhiều need.' },
      { t: 'rewrite', q: 'The course lasts three days.', start: 'It is a', a: ['It is a three-day course.', 'It is a three day course.'], ex: 'Day giữ dạng số ít khi làm tính từ ghép.' },
      { t: 'combine', q: 'She has a son. He is ten years old.', hint: 'a …-year-old', start: 'She has a', a: ['She has a ten-year-old son.', 'She has a ten year old son.'], ex: 'Year không có s trong tính từ ghép.' },
      { t: 'combine', q: 'Some managers were involved in the project. They were invited to the meeting.', hint: 'the … involved', start: 'The managers', a: ['The managers involved in the project were invited to the meeting.', 'The managers who were involved in the project were invited to the meeting.'], ex: 'Phân từ involved (+ cụm bổ nghĩa) đứng sau danh từ.' },
      { t: 'error', parts: ['She bought', 'a', 'leather black', 'handbag.'], w: 2, fix: 'black leather', ex: 'Màu sắc đứng trước chất liệu.' },
      { t: 'error', parts: ['My uncle', 'has', 'a seven-years-old', 'daughter.'], w: 2, fix: 'a seven-year-old', ex: 'Tính từ ghép: year không thêm s.' }
    ]
  });

  /* 4. Special comparisons */
  G.push({
    id: 'comparison-special', unit: 'words', order: 10,
    title: 'So sánh đặc biệt', en: 'Special Comparative Structures', level: 'B2', emoji: '⚖️',
    summary: 'So sánh bằng as…as / không bằng not as…as, so sánh gấp nhiều lần (twice as high as, three times more than), càng…càng (the more…, the more…), ngày càng (more and more), further/farther, elder/older, less/fewer, the same as, different from, so sánh nhất với ever/in/of và trạng từ mức độ much/far/slightly – bộ công cụ chính của IELTS Task 1.',
    blocks: [
      { type: 'scale', caption: 'Mức độ chênh lệch khi so sánh – chọn từ đúng với khoảng cách giữa hai số liệu', items: [
        { t: 'far / much / considerably + so sánh hơn', v: 90 },
        { t: 'significantly / substantially', v: 75 },
        { t: 'noticeably', v: 55 },
        { t: 'somewhat / a little', v: 30 },
        { t: 'slightly / marginally', v: 15 },
        { t: 'almost / nearly as … as', v: 5 }
      ] },
      { type: 'formula', rows: [
        { label: 'So sánh bằng', parts: [ { t: 'S + V', c: 'subj' }, { t: 'as + adj / adv + as', c: 'adv' }, { t: 'N / mệnh đề', c: 'obj' } ], ex: 'This year\'s exam was [[just as difficult as]] last year\'s.' },
        { label: 'So sánh không bằng', parts: [ { t: 'S + be', c: 'subj' }, { t: 'not as / not so + adj + as', c: 'neg' }, { t: 'N', c: 'obj' } ], ex: 'The second film was [[not as exciting as]] the first.' },
        { label: 'Gấp nhiều lần', parts: [ { t: 'S + V', c: 'subj' }, { t: 'twice / three times', c: 'adv' }, { t: 'as + adj + as', c: 'verb' }, { t: 'N', c: 'obj' } ], ex: 'Car sales in 2020 were [[twice as high as]] in 2010.' },
        { label: 'Càng … càng …', parts: [ { t: 'The + so sánh hơn', c: 'adv' }, { t: 'S + V', c: 'subj' }, { t: 'the + so sánh hơn', c: 'adv' }, { t: 'S + V', c: 'verb' } ], ex: '[[The more you practise, the more confident]] you become.' },
        { label: 'Ngày càng …', parts: [ { t: 'S + V', c: 'subj' }, { t: 'so sánh hơn + and + so sánh hơn', c: 'adv' } ], ex: 'Cities are becoming [[more and more crowded]].' },
        { label: 'Mức độ + so sánh hơn', parts: [ { t: 'much / far / slightly', c: 'adv' }, { t: 'so sánh hơn', c: 'verb' }, { t: 'than', c: 'aux' }, { t: 'N', c: 'obj' } ], ex: 'Online sales were [[slightly higher than]] in-store sales.' }
      ] },
      { type: 'uses', items: [
        { title: 'Farther / further: cả hai chỉ khoảng cách; chỉ further mang nghĩa "thêm, hơn nữa"', ex: 'For [[further information]], please contact the front desk.', vi: 'Để biết thêm thông tin, vui lòng liên hệ quầy lễ tân.' },
        { title: 'Elder / eldest: chỉ dùng cho anh chị em trong gia đình và đứng trước danh từ; older dùng mọi trường hợp (có than)', ex: 'My [[elder sister]] is three years [[older than]] me.', vi: 'Chị gái tôi lớn hơn tôi ba tuổi.' },
        { title: 'Less + N không đếm được; fewer + N đếm được số nhiều', ex: 'People today spend [[less time]] reading books.', vi: 'Ngày nay mọi người dành ít thời gian đọc sách hơn.' },
        { title: 'The same (+ N) as; similar to; different from (Anh–Anh còn dùng different to, Anh–Mỹ dùng cả different than)', ex: 'My answer was [[the same as]] yours.', vi: 'Câu trả lời của tôi giống của bạn.' },
        { title: 'So sánh nhất + ever (từng) / in + nơi chốn / of + nhóm', ex: 'It was [[the most exciting]] match [[I have ever watched]].', vi: 'Đó là trận đấu hấp dẫn nhất tôi từng xem.' },
        { title: 'Số lần + so sánh hơn + than (Task 1)', ex: 'Coffee consumption in 2022 was [[three times higher than]] in 2000.', vi: 'Lượng cà phê tiêu thụ năm 2022 cao gấp ba lần năm 2000.' }
      ] },
      { type: 'table', head: ['Cấu trúc', 'Ý nghĩa', 'Ví dụ Task 1'], rows: [
        ['twice as many / much … as', 'gấp đôi', 'twice as many visitors as in 2015'],
        ['three times as high as / three times the figure for', 'gấp ba', 'three times the figure for 2010'],
        ['half as much … as', 'bằng một nửa', 'half as much money as before'],
        ['the same as / similar to', 'bằng / tương tự', 'the same as the previous year'],
        ['by far the + so sánh nhất', 'nhất, bỏ xa phần còn lại', 'by far the most popular option'],
        ['the second / third + so sánh nhất', 'đứng thứ hai / ba', 'the second largest category'],
        ['much / far / considerably + so sánh hơn', 'hơn nhiều', 'considerably lower than in March']
      ] },
      { type: 'tip', text: 'Không dùng very trước so sánh hơn: very taller ✗ → much / far / a lot taller ✓. Very chỉ đi với tính từ nguyên mẫu (very tall).' },
      { type: 'tip', text: '"Three times higher than" và "three times as high as" thường được hiểu như nhau trong Task 1. Cách an toàn và rõ nghĩa nhất là as … as hoặc "three times the figure for …".' },
      { type: 'mistake', wrong: 'The figure for 2020 was very higher than in 2010.', right: 'The figure for 2020 was much higher than in 2010.', why: 'Nhấn mạnh so sánh hơn dùng much / far / considerably, không dùng very.' },
      { type: 'mistake', wrong: 'More you read, more you know.', right: 'The more you read, the more you know.', why: 'Cấu trúc càng…càng cần the ở cả hai vế.' },
      { type: 'mistake', wrong: 'His answer was the same like mine.', right: 'His answer was the same as mine.', why: 'The same đi với as, không đi với like.' },
      { type: 'mistake', wrong: 'Sales were twice higher as in the previous year.', right: 'Sales were twice as high as in the previous year.', why: 'Gấp nhiều lần: twice + as + tính từ nguyên mẫu + as.' },
      { type: 'ielts', text: 'Task 1 cần so sánh liên tục: dùng trạng từ mức độ (slightly, considerably, by far), cấu trúc gấp nhiều lần và thứ hạng (the second largest) để tránh lặp "higher than".', ex: 'Spending on food was [[by far the largest]] category, [[almost twice as much as]] spending on housing.' }
    ],
    quiz: [
      { q: 'This laptop is ___ my old one.', options: ['as lighter as', 'as light as', 'lighter as', 'the lightest than'], answer: 1, explain: 'So sánh bằng: as + tính từ nguyên mẫu + as → as light as. "as lighter as" sai dạng; "lighter as" sai từ so sánh; "the lightest than" trộn hai cấu trúc.' },
      { q: 'The museum had ___ visitors in July as in March.', options: ['twice more', 'two times many', 'twice as many', 'double as many'], answer: 2, explain: 'Gấp đôi với danh từ đếm được: twice as many… as… "twice more" và "two times many" sai cấu trúc; "double as many" không dùng như vậy.' },
      { q: '___ you start, the sooner you will finish.', options: ['Earlier', 'The earliest', 'As earlier', 'The earlier'], answer: 3, explain: 'Càng…càng: The + so sánh hơn …, the + so sánh hơn … Earlier thiếu the; The earliest là so sánh nhất; "As earlier" sai cấu trúc.' },
      { q: 'Please let me know if you need ___ help.', options: ['further', 'farther', 'farthest', 'more far'], answer: 0, explain: 'Nghĩa "thêm, hơn nữa" chỉ dùng further → further help. farther/farthest chỉ khoảng cách; "more far" sai dạng.' },
      { q: 'The second test was ___ more difficult than the first.', options: ['very', 'too', 'much', 'most'], answer: 2, explain: 'Nhấn mạnh so sánh hơn dùng much → much more difficult. very và too không đứng trước so sánh hơn; most là so sánh nhất.' },
      { q: 'Today, ___ people buy printed newspapers than twenty years ago.', options: ['less', 'fewer', 'little', 'the fewest'], answer: 1, explain: 'people là danh từ đếm được số nhiều → fewer. less và little dùng cho danh từ không đếm được; the fewest là so sánh nhất, không đi với than.' },
      { q: 'Câu nào đúng?', options: ['My elder brother is two years elder than me.', 'My older brother is two years elder than me.', 'My eldest brother is two years elder than me.', 'My elder brother is two years older than me.'], answer: 3, explain: 'elder chỉ đứng trước danh từ (my elder brother); khi có than phải dùng older → two years older than me. Ba câu kia dùng elder trước than là sai.' },
      { q: 'Câu nào đúng?', options: ['Traffic is getting worse and worse.', 'Traffic is getting more and more worse.', 'Traffic is getting worst and worst.', 'Traffic is getting the worse and worse.'], answer: 0, explain: 'Ngày càng tệ hơn: so sánh hơn lặp lại → worse and worse. "more and more worse" thừa more; worst là so sánh nhất; "the worse and worse" thừa the.' },
      { q: 'Câu nào đúng?', options: ['It is the tallest building of the city.', 'It is the most tall building in the city.', 'It is the tallest building in the city.', 'It is tallest building in the city.'], answer: 2, explain: 'So sánh nhất + in + nơi chốn → the tallest building in the city. "of the city" sai giới từ; "most tall" sai dạng (tall là tính từ ngắn); thiếu the trước tallest là sai.' },
      { q: 'Câu nào đúng?', options: ['Her bag is the same like mine.', 'Her bag is the same as mine.', 'Her bag is same as mine.', 'Her bag is the same than mine.'], answer: 1, explain: 'So sánh giống nhau: the same as (có the, dùng as) → the same as mine. Không dùng like/than sau the same.' },
      { q: 'Câu nào cùng nghĩa? "The train is not as fast as the plane."', options: ['The plane is slower than the train.', 'The train is faster than the plane.', 'The train is as fast as the plane.', 'The plane is faster than the train.'], answer: 3, explain: 'Tàu không nhanh bằng máy bay = máy bay nhanh hơn tàu. "slower" và "the train is faster" đảo nghĩa; "as fast as" trái với câu gốc.' },
      { q: 'Câu nào cùng nghĩa? "As the population grows, there is more pollution."', options: ['The larger population becomes, more pollution there is.', 'The larger the population becomes, the less pollution there is.', 'The larger the population becomes, the more pollution there is.', 'The population grows more and the pollution less.'], answer: 2, explain: 'Càng…càng: the + so sánh hơn ở cả hai vế, cùng chiều tăng. Câu 1 thiếu the; câu 2 đổi nghĩa (less); câu 4 sai cấu trúc.' }
    ],
    drills: [
      { t: 'fill', q: 'The more you read, ___ more words you learn.', a: ['the'], ex: 'Cấu trúc càng…càng cần the ở cả hai vế.' },
      { t: 'fill', q: 'Her answer was exactly the same ___ mine.', a: ['as'], ex: 'the same as = giống như → as.' },
      { t: 'form', q: 'For ___ details, please visit our website. (FAR)', a: ['further'], ex: 'Nghĩa "thêm" → further.' },
      { t: 'rewrite', q: 'The red car is not as expensive as the blue car.', start: 'The blue car is', a: ['The blue car is more expensive than the red car.', 'The blue car is more expensive than the red one.'], ex: 'Not as…as ↔ so sánh hơn theo chiều ngược lại.' },
      { t: 'rewrite', q: 'If you practise more, you will become more confident.', start: 'The more', a: ['The more you practise, the more confident you will become.', 'The more you practise, the more confident you become.', 'The more you practice, the more confident you will become.', 'The more you practice, the more confident you become.'], ex: 'So sánh kép (càng… càng…): The more + S + V, the more + adj + S + V → The more you practise, the more confident you will become.' },
      { t: 'rewrite', q: 'The figure for 2020 was double the figure for 2010.', start: 'The figure for 2020 was twice', a: ['The figure for 2020 was twice as high as the figure for 2010.', 'The figure for 2020 was twice as high as that for 2010.', 'The figure for 2020 was twice as high as the one for 2010.', 'The figure for 2020 was twice as large as the figure for 2010.', 'The figure for 2020 was twice as large as that for 2010.'], ex: 'Gấp đôi: twice as + adj + as.' },
      { t: 'combine', q: 'Traffic is getting bad. It gets worse every year.', hint: 'so sánh hơn + and + so sánh hơn', start: 'Traffic is getting', a: ['Traffic is getting worse and worse every year.', 'Traffic is getting worse and worse.'], ex: 'Ngày càng tệ: worse and worse.' },
      { t: 'combine', q: 'Everest is very high. No other mountain in the world is as high.', hint: 'so sánh nhất + in', start: 'Everest is', a: ['Everest is the highest mountain in the world.'], ex: 'So sánh nhất + in + nơi chốn.' },
      { t: 'error', parts: ['There were', 'less', 'cars on the road', 'than usual.'], w: 1, fix: 'fewer', ex: 'Cars đếm được số nhiều → fewer.' },
      { t: 'error', parts: ['This test', 'was', 'very easier', 'than the last one.'], w: 2, fix: 'much easier', ex: 'Không dùng very trước so sánh hơn.' }
    ]
  });

  /* 5. -ed / -ing / -s endings: spelling & pronunciation */
  G.push({
    id: 'ed-s-endings', unit: 'foundation', order: 13,
    title: 'Quy tắc thêm -ed/-ing/-s và cách phát âm', en: 'Spelling & Pronunciation of -ed, -ing and -s', level: 'A2', emoji: '🔤',
    summary: 'Chính tả: gấp đôi phụ âm cuối (stop → stopped, prefer → preferred nhưng visit → visited), bỏ e câm, phụ âm + y → ied/ies, -ie → -ying. Phát âm: -ed đọc /ɪd/ sau /t/ /d/, /t/ sau âm vô thanh, /d/ sau âm hữu thanh; -s/-es đọc /ɪz/ sau âm gió, /s/ sau âm vô thanh, /z/ sau âm hữu thanh – và các bẫy như naked, learned, houses.',
    blocks: [
      { type: 'sort', caption: 'Phát âm đuôi -ed: nhìn ÂM cuối của động từ, không nhìn chữ cái', groups: [
        { title: '/ɪd/ – sau âm /t/ và /d/', emoji: '🟣', items: ['wanted', 'needed', 'decided', 'visited', 'added', 'started'] },
        { title: '/t/ – sau âm vô thanh /p k f s ʃ tʃ θ/', emoji: '🔵', items: ['stopped', 'looked', 'laughed', 'missed', 'washed', 'watched', 'fixed'] },
        { title: '/d/ – sau nguyên âm & âm hữu thanh còn lại', emoji: '🟢', items: ['played', 'opened', 'lived', 'called', 'changed', 'cleaned'] },
        { title: 'Bẫy: tính từ -ed đọc /ɪd/', emoji: '⚠️', items: ['naked', 'wicked', 'crooked', 'rugged', 'learned (uyên bác)', 'beloved', 'aged (già)'] }
      ] },
      { type: 'sort', caption: 'Phát âm đuôi -s / -es', groups: [
        { title: '/ɪz/ – sau /s z ʃ ʒ tʃ dʒ/', emoji: '🟣', items: ['buses', 'washes', 'watches', 'changes', 'boxes', 'houses'] },
        { title: '/s/ – sau âm vô thanh /p t k f θ/', emoji: '🔵', items: ['stops', 'cats', 'books', 'laughs', 'months'] },
        { title: '/z/ – sau nguyên âm & âm hữu thanh còn lại', emoji: '🟢', items: ['dogs', 'plays', 'cities', 'lives', 'cleans', 'tries'] }
      ] },
      { type: 'formula', rows: [
        { label: 'Gấp đôi phụ âm cuối', parts: [ { t: '1 âm tiết / trọng âm ở âm tiết cuối', c: 'subj' }, { t: '1 nguyên âm + 1 phụ âm', c: 'adv' }, { t: 'gấp đôi phụ âm', c: 'aux' }, { t: '+ ed / ing', c: 'verb' } ], ex: 'The trip was [[planned]] weeks ago but never [[happened]].' },
        { label: 'Bỏ e câm', parts: [ { t: 'V tận cùng -e', c: 'subj' }, { t: 'bỏ e', c: 'neg' }, { t: '+ ing', c: 'verb' } ], ex: 'She is [[writing]] an essay about renewable energy.' },
        { label: 'Phụ âm + y', parts: [ { t: 'phụ âm + y', c: 'subj' }, { t: 'y → i', c: 'neg' }, { t: '+ ed / es', c: 'verb' } ], ex: 'He [[studied]] hard and [[tried]] every practice test.' },
        { label: '-ie + ing', parts: [ { t: 'V tận cùng -ie', c: 'subj' }, { t: 'ie → y', c: 'neg' }, { t: '+ ing', c: 'verb' } ], ex: 'The child was [[lying]] on the grass and [[looking]] at the clouds.' }
      ] },
      { type: 'table', head: ['Âm cuối của từ gốc', 'Đuôi -ed đọc là', 'Ví dụ'], rows: [
        ['/t/, /d/', '/ɪd/', 'wanted /ˈwɒntɪd/, needed /ˈniːdɪd/, decided /dɪˈsaɪdɪd/'],
        ['Vô thanh: /p/, /k/, /f/, /s/, /ʃ/, /tʃ/, /θ/', '/t/', 'stopped /stɒpt/, looked /lʊkt/, laughed /lɑːft/, missed /mɪst/, washed /wɒʃt/, watched /wɒtʃt/'],
        ['Nguyên âm & hữu thanh còn lại', '/d/', 'played /pleɪd/, lived /lɪvd/, called /kɔːld/, changed /tʃeɪndʒd/'],
        ['Bẫy (tính từ)', '/ɪd/', 'naked /ˈneɪkɪd/, wicked /ˈwɪkɪd/, learned /ˈlɜːnɪd/, beloved /bɪˈlʌvɪd/']
      ] },
      { type: 'table', head: ['Âm cuối của từ gốc', 'Đuôi -s/-es đọc là', 'Ví dụ'], rows: [
        ['/s/, /z/, /ʃ/, /ʒ/, /tʃ/, /dʒ/', '/ɪz/', 'buses /ˈbʌsɪz/, washes /ˈwɒʃɪz/, watches /ˈwɒtʃɪz/, changes /ˈtʃeɪndʒɪz/'],
        ['Vô thanh: /p/, /t/, /k/, /f/, /θ/', '/s/', 'stops /stɒps/, cats /kæts/, books /bʊks/, laughs /lɑːfs/, months /mʌnθs/'],
        ['Nguyên âm & hữu thanh còn lại', '/z/', 'dogs /dɒɡz/, plays /pleɪz/, cities /ˈsɪtiz/, lives (động từ) /lɪvz/'],
        ['Bẫy', '—', 'houses /ˈhaʊzɪz/ (âm /s/ đổi thành /z/), says /sez/, does /dʌz/']
      ] },
      { type: 'table', head: ['Động từ', '-ed', '-ing', '-s'], rows: [
        ['stop (1 âm tiết)', 'stopped', 'stopping', 'stops'],
        ['prefer (trọng âm cuối)', 'preferred', 'preferring', 'prefers'],
        ['visit (trọng âm đầu)', 'visited', 'visiting', 'visits'],
        ['decide (e câm)', 'decided', 'deciding', 'decides'],
        ['study (phụ âm + y)', 'studied', 'studying', 'studies'],
        ['play (nguyên âm + y)', 'played', 'playing', 'plays'],
        ['lie (nói dối)', 'lied', 'lying', 'lies'],
        ['fix (không gấp đôi x)', 'fixed', 'fixing', 'fixes'],
        ['travel (Anh / Mỹ)', 'travelled / traveled', 'travelling / traveling', 'travels'],
        ['panic (-ic → -ick)', 'panicked', 'panicking', 'panics'],
        ['agree (ee giữ nguyên)', 'agreed', 'agreeing', 'agrees']
      ] },
      { type: 'uses', items: [
        { title: 'Tính từ -ed đọc /ɪd/: naked, wicked, crooked, rugged', ex: 'The hikers crossed a [[rugged]] mountain range.', vi: 'Những người leo núi đã băng qua một dãy núi hiểm trở. (rugged /ˈrʌɡɪd/)' },
        { title: 'learned: động từ đọc /lɜːnd/ hoặc /lɜːnt/; tính từ "uyên bác" đọc /ˈlɜːnɪd/', ex: 'She is a [[learned]] professor of ancient history.', vi: 'Bà ấy là một giáo sư uyên bác về lịch sử cổ đại.' },
        { title: 'aged: "ở độ tuổi" đọc /eɪdʒd/; "già, cao tuổi" đọc /ˈeɪdʒɪd/', ex: 'The survey included children [[aged]] ten to fifteen.', vi: 'Cuộc khảo sát gồm trẻ em từ mười đến mười lăm tuổi. (aged /eɪdʒd/)' },
        { title: 'house /haʊs/ → houses /ˈhaʊzɪz/: âm /s/ chuyển thành /z/', ex: 'Many old houses in the area have been [[renovated]].', vi: 'Nhiều ngôi nhà cũ trong khu vực đã được cải tạo.' },
        { title: 'Tính theo ÂM, không theo chữ: fixed /fɪkst/ (x = /ks/), laughed /lɑːft/ (gh = /f/)', ex: 'She [[fixed]] the printer before the meeting [[started]].', vi: 'Cô ấy đã sửa máy in trước khi cuộc họp bắt đầu.' }
      ] },
      { type: 'tip', text: 'Mẹo phân biệt vô thanh / hữu thanh: đặt tay lên cổ họng rồi phát âm phụ âm cuối. Không rung → vô thanh → -ed đọc /t/, -s đọc /s/. Có rung → hữu thanh → /d/ và /z/.' },
      { type: 'tip', text: 'Không gấp đôi w, x, y: show → showed, fix → fixed, play → played. Tiếng Anh–Anh gấp đôi l dù trọng âm ở âm tiết đầu: travel → travelled, cancel → cancelled (Anh–Mỹ: traveled, canceled).' },
      { type: 'mistake', wrong: 'He visitted his grandparents last week.', right: 'He visited his grandparents last week.', why: 'Visit có trọng âm ở âm tiết đầu → không gấp đôi t.' },
      { type: 'mistake', wrong: 'She is studing for her final exams.', right: 'She is studying for her final exams.', why: 'Thêm -ing thì giữ nguyên y: studying.' },
      { type: 'mistake', wrong: 'The workshop was planed for months.', right: 'The workshop was planned for months.', why: 'Plan là động từ 1 âm tiết (1 nguyên âm + 1 phụ âm) → gấp đôi n. "Planed" là bào (gỗ).' },
      { type: 'mistake', wrong: 'They are lieing about the results.', right: 'They are lying about the results.', why: 'Động từ tận cùng -ie: đổi ie → y rồi thêm -ing.' },
      { type: 'ielts', text: 'Trong Speaking, đọc thiếu hoặc sai đuôi -ed/-s ảnh hưởng cả tiêu chí Pronunciation lẫn Grammatical Accuracy, vì giám khảo không nghe được bạn dùng quá khứ hay số nhiều. Luyện kỹ các từ hay dùng khi mô tả số liệu: increased /ɪnˈkriːst/, dropped /drɒpt/, rises /ˈraɪzɪz/.', ex: 'Sales [[increased]] steadily and then [[dropped]] sharply in the final quarter.' }
    ],
    quiz: [
      { q: 'Chọn từ có đuôi -ed đọc là /ɪd/:', options: ['stopped', 'played', 'watched', 'decided'], answer: 3, explain: 'decide tận cùng bằng âm /d/ → đuôi -ed đọc /ɪd/. stopped và watched đọc /t/ (âm vô thanh); played đọc /d/.' },
      { q: 'Chọn từ có đuôi -ed đọc là /t/:', options: ['cleaned', 'laughed', 'ended', 'opened'], answer: 1, explain: 'laugh tận cùng âm /f/ (vô thanh) → -ed đọc /t/. cleaned và opened đọc /d/ (âm hữu thanh); ended đọc /ɪd/ (tận cùng /d/).' },
      { q: 'Chọn từ có đuôi -s/-es đọc là /ɪz/:', options: ['changes', 'books', 'dogs', 'plays'], answer: 0, explain: 'change tận cùng âm /dʒ/ (âm xuýt) → -es đọc /ɪz/. books đọc /s/; dogs và plays đọc /z/.' },
      { q: 'Chọn từ có đuôi -s đọc là /s/:', options: ['cities', 'lives', 'months', 'rooms'], answer: 2, explain: 'month tận cùng âm /θ/ (vô thanh) → -s đọc /s/. cities, lives, rooms đều tận cùng âm hữu thanh nên đọc /z/.' },
      { q: 'She ___ a different approach to the problem.', options: ['prefered', 'preferd', 'preferrd', 'preferred'], answer: 3, explain: 'prefer có trọng âm ở âm tiết cuối và tận cùng phụ âm + nguyên âm + phụ âm → gấp đôi r: preferred. "prefered", "preferd", "preferrd" đều sai chính tả.' },
      { q: 'They are ___ a new campaign for next month.', options: ['planning', 'planing', 'planeing', 'plannig'], answer: 0, explain: 'Plan: 1 âm tiết, 1 nguyên âm + 1 phụ âm → planning. planing, planeing, plannig đều sai chính tả.' },
      { q: 'Câu nào viết đúng chính tả?', options: ['He was lieing on the beach.', 'He was lyeing on the beach.', 'He was lying on the beach.', 'He was liing on the beach.'], answer: 2, explain: 'Động từ tận cùng -ie đổi ie → y rồi thêm -ing: lie → lying (tương tự die → dying, tie → tying).' },
      { q: 'Câu nào viết đúng chính tả?', options: ['She studied economics at university.', 'She studyed economics at university.', 'She studieed economics at university.', 'She studed economics at university.'], answer: 0, explain: 'Phụ âm + y → đổi y thành i rồi thêm -ed: studied. "studyed", "studieed", "studed" sai chính tả.' },
      { q: 'Câu nào viết đúng chính tả?', options: ['The concert happenned last night.', 'The concert happend last night.', 'The concert hapenned last night.', 'The concert happened last night.'], answer: 3, explain: 'Happen có trọng âm ở âm tiết đầu → không gấp đôi n. happenned, happend, hapenned đều sai chính tả.' },
      { q: 'Trong "a naked flame" và "a wicked plan", đuôi -ed đọc là:', options: ['/t/', '/ɪd/', '/d/', 'không đọc'], answer: 1, explain: 'Một số tính từ -ed đặc biệt đọc /ɪd/: naked, wicked, crooked… /t/ và /d/ là cách đọc thông thường của -ed ở động từ, không áp dụng cho các tính từ đặc biệt này.' },
      { q: 'Từ nào có cách đọc đuôi -ed KHÁC các từ còn lại?', options: ['fixed', 'missed', 'called', 'washed'], answer: 2, explain: 'called tận cùng âm /l/ (hữu thanh) → -ed đọc /d/, khác các từ còn lại. fixed, missed, washed tận cùng âm vô thanh nên đọc /t/.' },
      { q: '"houses" (danh từ số nhiều) được phát âm là:', options: ['/ˈhaʊsɪz/', '/haʊss/', '/ˈhaʊzs/', '/ˈhaʊzɪz/'], answer: 3, explain: 'House /haʊs/ → houses /ˈhaʊzɪz/: âm /s/ đổi thành /z/. /ˈhaʊsɪz/ giữ /s/ là sai; hai cách đọc còn lại thiếu nguyên âm /ɪ/.' }
    ],
    drills: [
      { t: 'verb', q: 'The train ___ suddenly in the middle of the tunnel yesterday. (stop)', a: ['stopped'], ex: 'Stop: 1 âm tiết, 1 nguyên âm + 1 phụ âm → gấp đôi p.' },
      { t: 'verb', q: 'Look! The children ___ in the lake. (swim)', a: ['are swimming'], ex: 'Hiện tại tiếp diễn; swim → swimming (gấp đôi m).' },
      { t: 'verb', q: 'She has always ___ tea to coffee. (prefer)', a: ['preferred'], ex: 'Prefer có trọng âm cuối → preferred.' },
      { t: 'rewrite', q: 'They plan the trip carefully.', start: 'Last month, they', a: ['Last month, they planned the trip carefully.'], ex: 'Plan → planned (gấp đôi n).' },
      { t: 'rewrite', q: 'She tries to visit her grandparents every week.', start: 'Last year, she', a: ['Last year, she tried to visit her grandparents every week.'], ex: 'Phụ âm + y → ied: tried.' },
      { t: 'rewrite', q: 'The dog lies on the sofa every afternoon.', start: 'At the moment, the dog', a: ['At the moment, the dog is lying on the sofa.'], ex: 'At the moment → hiện tại tiếp diễn; lie → lying (đổi ie → y trước -ing).' },
      { t: 'combine', q: 'He admitted his mistake. He apologised to the team.', hint: 'and', start: 'He admitted', a: ['He admitted his mistake and apologised to the team.', 'He admitted his mistake and apologized to the team.'], ex: 'Admit có trọng âm cuối → admitted.' },
      { t: 'combine', q: 'She was writing an email. The phone rang.', hint: 'while', start: 'While she was', a: ['While she was writing an email, the phone rang.', 'While she was writing an email the phone rang.'], ex: 'Write → writing (bỏ e câm).' },
      { t: 'error', parts: ['The company', 'offerred', 'me a job', 'last week.'], w: 1, fix: 'offered', ex: 'Offer có trọng âm ở âm tiết đầu → không gấp đôi r.' },
      { t: 'error', parts: ['They are', 'planing', 'a trip', 'to Hue.'], w: 1, fix: 'planning', ex: 'Plan → planning (gấp đôi n).' }
    ]
  });

  /* 6. Purpose & result */
  G.push({
    id: 'purpose-result', unit: 'sentences', order: 12,
    title: 'Cụm từ & mệnh đề chỉ mục đích và kết quả', en: 'Clauses & Phrases of Purpose and Result', level: 'B2', emoji: '🎯',
    summary: 'Mục đích: to / in order to / so as to + V (phủ định: in order not to / so as not to), for + N / V-ing (công dụng), so that / in order that + S + can/could/will/would. Kết quả: so + adj/adv + that, such (a/an) + adj + N + that, so many/much/few/little + N + that, và các từ nối therefore / as a result / consequently / thus.',
    blocks: [
      { type: 'diagram', caption: 'Một ý mục đích – nhiều cách diễn đạt', steps: [
        { t: 'I left early. I wanted to catch the first bus.', c: 'note' },
        { t: '↓ to / in order to / so as to + V', c: 'arrow' },
        { t: 'I left early in order to catch the first bus.', c: 'result' },
        { t: '↓ so that + S + could + V', c: 'arrow' },
        { t: 'I left early so that I could catch the first bus.', c: 'active' },
        { t: '↓ phủ định: so as not to / in order not to', c: 'arrow' },
        { t: 'I left early so as not to miss the first bus.', c: 'passive' }
      ] },
      { type: 'formula', rows: [
        { label: 'Mục đích (cùng chủ ngữ)', parts: [ { t: 'S + V', c: 'subj' }, { t: 'to / in order to / so as to', c: 'aux' }, { t: 'V nguyên mẫu', c: 'verb' } ], ex: 'Many students work part-time [[in order to pay]] their fees.' },
        { label: 'Mục đích phủ định', parts: [ { t: 'S + V', c: 'subj' }, { t: 'in order not to / so as not to', c: 'neg' }, { t: 'V nguyên mẫu', c: 'verb' } ], ex: 'We spoke quietly [[so as not to wake]] the baby.' },
        { label: 'Mục đích (khác chủ ngữ)', parts: [ { t: 'S + V', c: 'subj' }, { t: 'so that / in order that', c: 'aux' }, { t: 'S2 + can / could / will / would', c: 'obj' }, { t: 'V', c: 'verb' } ], ex: 'She wrote the steps down [[so that her team could follow]] them.' },
        { label: 'Kết quả với so', parts: [ { t: 'S + be / V', c: 'subj' }, { t: 'so + adj / adv', c: 'adv' }, { t: 'that + mệnh đề', c: 'obj' } ], ex: 'The lecture was [[so long that]] several people fell asleep.' },
        { label: 'Kết quả với such', parts: [ { t: 'S + V', c: 'subj' }, { t: 'such (a / an) + adj + N', c: 'adv' }, { t: 'that + mệnh đề', c: 'obj' } ], ex: 'It was [[such a hot day that]] the park was almost empty.' },
        { label: 'So many / much / few / little', parts: [ { t: 'S + V', c: 'subj' }, { t: 'so many / few + N đếm được; so much / little + N không đếm được', c: 'adv' }, { t: 'that + mệnh đề', c: 'obj' } ], ex: 'There were [[so many applicants that]] the deadline was extended.' }
      ] },
      { type: 'uses', items: [
        { title: 'For + danh từ: mục đích là một thứ cần có', ex: 'We went to the library [[for some peace and quiet]].', vi: 'Chúng tôi đến thư viện để có chút yên tĩnh.' },
        { title: 'For + V-ing: công dụng của đồ vật', ex: 'This app is used [[for tracking]] daily expenses.', vi: 'Ứng dụng này dùng để theo dõi chi tiêu hằng ngày.' },
        { title: 'So that: hiện tại / tương lai → can / will; quá khứ → could / would', ex: 'I will save some money [[so that I can travel]] next summer.', vi: 'Tôi sẽ tiết kiệm tiền để có thể đi du lịch hè tới.' },
        { title: 'Therefore / As a result / Consequently / Thus: nối hai câu chỉ kết quả', ex: 'Fuel prices rose sharply. [[As a result]], more people used buses.', vi: 'Giá nhiên liệu tăng mạnh. Do đó, nhiều người đi xe buýt hơn.' },
        { title: 'So (liên từ) + mệnh đề: kết quả, thường dùng trong văn nói', ex: 'The museum was closed[[, so]] we visited the market instead.', vi: 'Bảo tàng đóng cửa nên chúng tôi đi chợ thay vào đó.' }
      ] },
      { type: 'table', head: ['Loại', 'Từ / cụm từ', 'Theo sau là'], rows: [
        ['Mục đích', 'to / in order to / so as to', 'V nguyên mẫu'],
        ['Mục đích (phủ định)', 'in order not to / so as not to', 'V nguyên mẫu'],
        ['Mục đích', 'so that / in order that', 'S + can / could / will / would + V'],
        ['Mục đích / công dụng', 'for', 'N hoặc V-ing'],
        ['Kết quả', 'so … that', 'adj / adv'],
        ['Kết quả', 'such (a / an) … that', '(adj) + N'],
        ['Kết quả', 'so many / few … that', 'N đếm được số nhiều'],
        ['Kết quả', 'so much / little … that', 'N không đếm được'],
        ['Từ nối kết quả', 'therefore / as a result / consequently / thus', 'đầu câu mới (hoặc sau dấu chấm phẩy), theo sau là dấu phẩy']
      ] },
      { type: 'tip', text: 'KHÔNG viết "for + V nguyên mẫu" hay "for to + V" để chỉ mục đích: I came here to study ✓, for study ✗. Trong văn trang trọng, phủ định mục đích nên dùng so as not to / in order not to thay vì chỉ "not to".' },
      { type: 'tip', text: 'So + adj/adv (không có danh từ); such + (a/an) + adj + N. Với many / much / few / little luôn dùng so: so many people ✓, such many people ✗ (nhưng such a lot of people ✓).' },
      { type: 'mistake', wrong: 'I came to this city for improve my English.', right: 'I came to this city to improve my English.', why: 'Chỉ mục đích bằng động từ: to + V, không dùng for + V.' },
      { type: 'mistake', wrong: 'It was so an interesting book that I read it twice.', right: 'It was such an interesting book that I read it twice.', why: 'Có danh từ (book) → dùng such a/an + adj + N.' },
      { type: 'mistake', wrong: 'She saved money so that she buys a car.', right: 'She saved money so that she could buy a car.', why: 'So that thường đi với modal; mệnh đề chính ở quá khứ → could.' },
      { type: 'mistake', wrong: 'There were such many cars that we couldn\'t park.', right: 'There were so many cars that we couldn\'t park.', why: 'Many đi với so, không đi với such.' },
      { type: 'ielts', text: 'Task 2: dùng so that / in order to khi đề xuất giải pháp và as a result / consequently khi nêu hệ quả – thể hiện mối quan hệ logic rõ ràng giữa các ý, tăng điểm Coherence & Cohesion.', ex: 'Governments should invest in cheaper public transport [[so that fewer people rely]] on private cars. [[As a result]], air quality in cities is likely to improve.' }
    ],
    quiz: [
      { q: 'He turned off his phone ___ disturbed during the exam.', options: ['not so as to be', 'so as not to be', 'so that not to be', 'in order to not being'], answer: 1, explain: 'Mục đích phủ định: so as not to + V → so as not to be disturbed. "not so as to" sai vị trí not; "so that not to" sai cấu trúc; "in order to not being" sai dạng.' },
      { q: 'She speaks slowly ___ her students can understand her.', options: ['in order to', 'so as to', 'so that', 'for'], answer: 2, explain: 'Sau chỗ trống là mệnh đề (her students can…) → so that. in order to và so as to cần V nguyên mẫu; for không nối mệnh đề chỉ mục đích.' },
      { q: 'This knife is used ___ bread.', options: ['to cutting', 'for cut', 'so that cut', 'for cutting'], answer: 3, explain: 'Nói về công dụng của vật: for + V-ing → used for cutting bread. "to cutting" sai dạng; "for cut" thiếu -ing; "so that cut" thiếu chủ ngữ.' },
      { q: 'It was ___ difficult question that nobody could answer it.', options: ['such a', 'so', 'so a', 'such'], answer: 0, explain: 'Danh từ đếm được số ít + tính từ → such a + adj + N + that → such a difficult question. so không đứng trước a + N; "so a" sai; "such" thiếu a.' },
      { q: 'There was ___ traffic that we missed the start of the film.', options: ['so many', 'such', 'so much', 'such many'], answer: 2, explain: 'traffic không đếm được → so much + N + that → so much traffic. so many dùng cho danh từ đếm được; such không đi với much/many; "such many" sai.' },
      { q: 'The company lost its biggest client. ___, it had to cut costs.', options: ['Although', 'Consequently', 'Despite', 'In order to'], answer: 1, explain: 'Câu sau nêu kết quả của câu trước → Consequently (do đó). Although và Despite chỉ tương phản; In order to chỉ mục đích.' },
      { q: 'Câu nào đúng?', options: ['I went to the bank for withdraw some cash.', 'I went to the bank for to withdraw some cash.', 'I went to the bank so that withdraw some cash.', 'I went to the bank to withdraw some cash.'], answer: 3, explain: 'Chỉ mục đích: to + V → went to the bank to withdraw. "for withdraw", "for to withdraw" sai cấu trúc; "so that withdraw" thiếu chủ ngữ và động từ khuyết thiếu.' },
      { q: 'Câu nào đúng?', options: ['The film was so boring that we left.', 'The film was such boring that we left.', 'The film was so a boring one that we left.', 'The film was such boring film that we left.'], answer: 0, explain: 'Không có danh từ theo sau → so + tính từ + that → so boring that. such cần danh từ (such a boring film); "so a boring one" và "such boring film" sai mạo từ.' },
      { q: 'Câu nào đúng?', options: ['We left early so that we avoid could the rush hour.', 'We left early in order that avoid the rush hour.', 'We left early so that we could avoid the rush hour.', 'We left early so as we could avoid the rush hour.'], answer: 2, explain: 'so that + S + can/could + V nguyên mẫu (để mà) → so that we could avoid. "in order that" phải có chủ ngữ; "so as" đi với to V, không đi với mệnh đề.' },
      { q: 'Câu nào cùng nghĩa? "The box was very heavy. Nobody could lift it."', options: ['The box was such heavy that nobody could lift it.', 'The box was so heavy that nobody could lift it.', 'The box was heavy so nobody lift it.', 'The box was too heavy that nobody could lift it.'], answer: 1, explain: 'so + tính từ + that + mệnh đề kết quả → so heavy that nobody could lift it. "such heavy" thiếu danh từ; "so nobody lift" sai cấu trúc; "too heavy that" sai (too đi với to V).' },
      { q: 'Câu nào cùng nghĩa? "She studied hard because she wanted to win a scholarship."', options: ['She studied hard so that to win a scholarship.', 'She studied hard for winning a scholarship.', 'She studied hard in order that winning a scholarship.', 'She studied hard so as to win a scholarship.'], answer: 3, explain: 'Cùng chủ ngữ, chỉ mục đích → so as to + V → so as to win. "so that to win" sai; "for winning" chỉ công dụng; "in order that winning" thiếu mệnh đề.' },
      { q: 'Câu nào cùng nghĩa? "The hotel was so comfortable that we stayed an extra night."', options: ['It was such a comfortable hotel that we stayed an extra night.', 'It was so comfortable hotel that we stayed an extra night.', 'It was such comfortable a hotel that we stayed an extra night.', 'The hotel was such comfortable that we stayed an extra night.'], answer: 0, explain: 'so + tính từ + that ↔ such + a/an + tính từ + danh từ + that → It was such a comfortable hotel that…' }
    ],
    drills: [
      { t: 'fill', q: 'We left early ___ as not to miss the train.', a: ['so'], ex: 'So as not to + V: phủ định mục đích.' },
      { t: 'fill', q: 'It was ___ a long film that I fell asleep halfway through.', a: ['such'], ex: 'such + a/an + tính từ + danh từ + that (quá… đến nỗi) → such a long film.' },
      { t: 'fill', q: 'This brush is used ___ cleaning the keyboard.', a: ['for'], ex: 'Công dụng: for + V-ing.' },
      { t: 'rewrite', q: 'He went to Japan because he wanted to study robotics.', start: 'He went to Japan in order', a: ['He went to Japan in order to study robotics.'], ex: 'Cùng chủ ngữ → in order to + V.' },
      { t: 'rewrite', q: 'The coffee was so hot that I couldn\'t drink it.', start: 'It was such', a: ['It was such hot coffee that I couldn\'t drink it.', 'It was such hot coffee that I could not drink it.'], ex: 'Coffee không đếm được → such + adj + N (không có a).' },
      { t: 'rewrite', q: 'She whispered because she didn\'t want to wake the baby.', start: 'She whispered so as', a: ['She whispered so as not to wake the baby.', 'She whispered so as not to wake up the baby.'], ex: 'Chỉ mục đích phủ định: so as not to + V nguyên mẫu (để không…) → so as not to wake the baby.' },
      { t: 'combine', q: 'She saved money. She wanted to buy a laptop.', hint: 'so that … could', start: 'She saved money so that', a: ['She saved money so that she could buy a laptop.'], ex: 'Mệnh đề chính quá khứ → so that + S + could + V.' },
      { t: 'combine', q: 'There were a lot of people at the concert. We couldn\'t see the stage.', hint: 'so many … that', start: 'There were so many people', a: ['There were so many people at the concert that we couldn\'t see the stage.', 'There were so many people at the concert that we could not see the stage.'], ex: 'So many + N đếm được số nhiều + that.' },
      { t: 'error', parts: ['I came', 'to this city', 'for find', 'a better job.'], w: 2, fix: 'to find', ex: 'Mục đích bằng động từ: to + V.' },
      { t: 'error', parts: ['It was', 'so an interesting', 'lecture', 'that nobody left early.'], w: 1, fix: 'such an interesting', ex: 'Có danh từ → such an + adj + N.' }
    ]
  });

  /* 7. Reason & contrast */
  G.push({
    id: 'reason-contrast', unit: 'sentences', order: 13,
    title: 'Cụm từ & mệnh đề chỉ nguyên nhân và tương phản', en: 'Clauses & Phrases of Reason and Contrast', level: 'B2', emoji: '⚡',
    summary: 'Nguyên nhân: because / as / since / now that + MỆNH ĐỀ ↔ because of / due to / owing to / on account of + DANH TỪ / V-ing. Tương phản: although / even though / though / while / whereas + MỆNH ĐỀ ↔ despite / in spite of + DANH TỪ / V-ing. Khi bí, dùng "the fact that + mệnh đề". Nối hai câu: however, nevertheless, on the other hand.',
    blocks: [
      { type: 'diagram', caption: 'Mệnh đề (S + V) ↔ cụm danh từ – dạng biến đổi rất hay gặp trong đề thi', steps: [
        { t: 'The match was cancelled because it rained heavily.', c: 'note' },
        { t: '↓ because + mệnh đề → because of + cụm danh từ', c: 'arrow' },
        { t: 'The match was cancelled because of the heavy rain.', c: 'result' },
        { t: '↓ although + mệnh đề', c: 'arrow' },
        { t: 'Although it rained heavily, they kept playing.', c: 'active' },
        { t: '↓ despite + cụm danh từ', c: 'arrow' },
        { t: 'Despite the heavy rain, they kept playing.', c: 'passive' }
      ] },
      { type: 'formula', rows: [
        { label: 'Nguyên nhân + cụm danh từ', parts: [ { t: 'S + V', c: 'subj' }, { t: 'because of / due to / owing to', c: 'aux' }, { t: 'N / V-ing', c: 'obj' } ], ex: 'The flight was delayed [[because of strong winds]].' },
        { label: 'Nguyên nhân + mệnh đề', parts: [ { t: 'Because / As / Since / Now that', c: 'aux' }, { t: 'S + V', c: 'obj' }, { t: ', S + V', c: 'subj' } ], ex: '[[Now that]] I have a car, I rarely take the bus.' },
        { label: 'Tương phản + mệnh đề', parts: [ { t: 'Although / Even though / Though', c: 'aux' }, { t: 'S + V', c: 'obj' }, { t: ', S + V', c: 'subj' } ], ex: '[[Although]] the hotel was expensive, the service was poor.' },
        { label: 'Tương phản + cụm danh từ', parts: [ { t: 'Despite / In spite of', c: 'aux' }, { t: 'N / V-ing', c: 'obj' }, { t: ', S + V', c: 'subj' } ], ex: '[[Despite feeling tired]], she finished the report.' },
        { label: '… the fact that + mệnh đề', parts: [ { t: 'Despite / Due to', c: 'aux' }, { t: 'the fact that', c: 'adv' }, { t: 'S + V', c: 'obj' }, { t: ', S + V', c: 'subj' } ], ex: '[[Despite the fact that]] it was raining, the event went ahead.' },
        { label: 'Đối lập hai vế', parts: [ { t: 'S + V', c: 'subj' }, { t: ', whereas / while', c: 'aux' }, { t: 'S + V', c: 'obj' } ], ex: 'Some people prefer cities, [[whereas]] others enjoy rural life.' }
      ] },
      { type: 'uses', items: [
        { title: 'As / since: lý do người nghe đã biết, thường đứng đầu câu', ex: '[[As]] it was getting late, we decided to take a taxi.', vi: 'Vì trời đã muộn, chúng tôi quyết định đi taxi.' },
        { title: 'Due to thường đứng sau be; owing to trang trọng hơn because of', ex: 'The delay was [[due to]] a technical problem.', vi: 'Sự chậm trễ là do một sự cố kỹ thuật.' },
        { title: 'Even though nhấn mạnh hơn although (dù thực tế là…)', ex: '[[Even though]] he had studied hard, he failed the test.', vi: 'Dù đã học rất chăm, anh ấy vẫn trượt.' },
        { title: 'However / Nevertheless: trạng từ nối HAI câu, theo sau là dấu phẩy', ex: 'The plan was expensive. [[However]], it was approved.', vi: 'Kế hoạch tốn kém. Tuy nhiên, nó vẫn được duyệt.' },
        { title: 'On the other hand: nêu mặt còn lại của vấn đề', ex: 'Cities offer more jobs. [[On the other hand]], they are often polluted.', vi: 'Thành phố có nhiều việc làm hơn. Mặt khác, chúng thường ô nhiễm.' }
      ] },
      { type: 'table', head: ['Nghĩa', '+ Mệnh đề (S + V)', '+ Cụm danh từ / V-ing'], rows: [
        ['Nguyên nhân', 'because, as, since, now that, due to the fact that', 'because of, due to, owing to, on account of'],
        ['Nhượng bộ (mặc dù)', 'although, even though, though, despite the fact that', 'despite, in spite of'],
        ['Đối lập (trong khi)', 'while, whereas', '—'],
        ['Nối hai câu', 'However, … / Nevertheless, … / On the other hand, …', '—']
      ] },
      { type: 'table', head: ['Mệnh đề', 'Cụm từ tương đương'], rows: [
        ['because the price was high', 'because of the high price'],
        ['because he was ill', 'because of his illness / because of being ill'],
        ['although she is young', 'despite her youth / despite being young'],
        ['although it was raining heavily', 'in spite of the heavy rain'],
        ['since the economy is weak', 'due to the weak economy'],
        ['although they tried hard', 'despite their efforts / despite trying hard']
      ] },
      { type: 'tip', text: 'Bốn cách đổi mệnh đề → cụm danh từ: (1) tính từ + danh từ (it was cold → the cold weather); (2) tính từ sở hữu + danh từ (he was absent → his absence); (3) V-ing khi CÙNG chủ ngữ (she was tired → being tired); (4) the fact that + mệnh đề – cách an toàn khi không tìm được danh từ.' },
      { type: 'tip', text: 'Although / because nối hai mệnh đề trong MỘT câu; however / therefore nối HAI câu. Không dùng although và but trong cùng một câu, và không viết "despite of".' },
      { type: 'mistake', wrong: 'Despite of the rain, we went out.', right: 'Despite the rain, we went out.', why: 'Despite không có of (in spite of mới có of).' },
      { type: 'mistake', wrong: 'Although he was tired, but he kept working.', right: 'Although he was tired, he kept working.', why: 'Không dùng although và but cùng lúc.' },
      { type: 'mistake', wrong: 'Because of the traffic was heavy, I was late.', right: 'Because the traffic was heavy, I was late.', why: 'Sau because of là cụm danh từ; có mệnh đề (S + V) thì dùng because.' },
      { type: 'mistake', wrong: 'In spite of she was ill, she went to work.', right: 'In spite of being ill, she went to work.', why: 'In spite of + V-ing / N; hoặc in spite of the fact that she was ill.' },
      { type: 'ielts', text: 'Task 2: dùng while / whereas để so sánh hai quan điểm, although / despite the fact that để nhượng bộ trước khi phản biện, owing to / due to cho văn phong trang trọng. Xen kẽ mệnh đề và cụm danh từ giúp tăng Grammatical Range.', ex: '[[Although]] online learning offers flexibility, many students still benefit from face-to-face interaction.' }
    ],
    quiz: [
      { q: 'The match was postponed ___ the heavy snow.', options: ['because', 'although', 'due to', 'despite'], answer: 2, explain: 'Sau chỗ trống là cụm danh từ, nghĩa nguyên nhân → due to the heavy snow. because cần mệnh đề; although và despite chỉ tương phản.' },
      { q: '___ the high cost, many families still choose private schools.', options: ['Despite', 'Although', 'Because of', 'Even though'], answer: 0, explain: 'Cụm danh từ (the high cost) + nghĩa tương phản → Despite. Although và Even though cần mệnh đề; Because of chỉ nguyên nhân.' },
      { q: '___ he had a map, he got lost in the old town.', options: ['Despite', 'In spite of', 'Due to', 'Even though'], answer: 3, explain: 'Sau chỗ trống là mệnh đề (he had a map) + nghĩa tương phản → Even though. Despite và In spite of cần danh từ/V-ing; Due to chỉ nguyên nhân.' },
      { q: 'Some students learn best by reading, ___ others prefer hands-on activities.', options: ['despite', 'whereas', 'because of', 'so'], answer: 1, explain: 'Đối lập hai vế (người thích đọc / người thích thực hành) → whereas. despite và because of cần danh từ; so chỉ kết quả.' },
      { q: '___ you have finished your exams, you can relax a bit.', options: ['Due to', 'In spite of', 'Now that', 'Because of'], answer: 2, explain: 'Now that + mệnh đề = vì bây giờ đã… → Now that you have finished. Due to, In spite of, Because of đều phải đi với danh từ, không đi với mệnh đề.' },
      { q: 'The new policy is popular. ___, it is very expensive to implement.', options: ['Although', 'Despite', 'Because', 'However'], answer: 3, explain: 'Nối hai câu, nghĩa tương phản → However, đứng đầu câu sau có dấu phẩy. Although nối trong cùng một câu; Despite cần danh từ; Because chỉ nguyên nhân.' },
      { q: 'Câu nào đúng?', options: ['Although it was late, we kept talking.', 'Although it was late, but we kept talking.', 'Despite it was late, we kept talking.', 'In spite of it was late, we kept talking.'], answer: 0, explain: 'Although + mệnh đề, không dùng kèm but → Although it was late, we kept talking. Câu 2 thừa but; Despite và In spite of không đi trực tiếp với mệnh đề.' },
      { q: 'Câu nào đúng?', options: ['Due to he was sick, he stayed home.', 'Due to sick, he stayed home.', 'Due to the fact that he was sick, he stayed home.', 'Due to of his sickness, he stayed home.'], answer: 2, explain: 'Due to the fact that + mệnh đề → Due to the fact that he was sick. "Due to he was sick" đặt mệnh đề sau giới từ; "Due to sick" thiếu danh từ; "Due to of" thừa of.' },
      { q: 'Câu nào đúng?', options: ['Despite of the noise, I slept well.', 'Despite the noise, I slept well.', 'In spite the noise, I slept well.', 'Despite there was noise, I slept well.'], answer: 1, explain: 'Despite + danh từ (không có of) → Despite the noise. "Despite of" thừa of; "In spite the noise" thiếu of; "Despite there was" đặt mệnh đề sau despite.' },
      { q: 'Câu nào cùng nghĩa? "Although she was nervous, she gave an excellent speech."', options: ['Despite nervous, she gave an excellent speech.', 'Because of her nerves, she gave an excellent speech.', 'In spite she was nervous, she gave an excellent speech.', 'Despite being nervous, she gave an excellent speech.'], answer: 3, explain: 'Cùng chủ ngữ → despite + being + tính từ → Despite being nervous. "Despite nervous" thiếu being; "Because of" đổi quan hệ thành nguyên nhân; "In spite she was" thiếu of và đặt mệnh đề sau.' },
      { q: 'Câu nào cùng nghĩa? "The road was closed because it had flooded."', options: ['The road was closed due to flooding.', 'The road was closed despite the flooding.', 'The road was closed because of flood it.', 'The road was closed although flooding.'], answer: 0, explain: 'because + mệnh đề ↔ due to + cụm danh từ → due to flooding. despite và although đổi nghĩa thành tương phản; "because of flood it" sai cấu trúc.' },
      { q: 'Câu nào cùng nghĩa? "Despite his lack of experience, he got the job."', options: ['Because he had no experience, he got the job.', 'He got the job, so he lacked experience.', 'Although he lacked experience, he got the job.', 'He lacked experience; therefore, he got the job.'], answer: 2, explain: 'Despite + N ↔ although + mệnh đề, giữ nghĩa tương phản. Because, so và therefore đổi quan hệ thành nguyên nhân – kết quả, sai logic.' }
    ],
    drills: [
      { t: 'fill', q: '___ spite of the cold weather, they went swimming in the sea.', a: ['in'], ex: 'In spite of + danh từ/V-ing = mặc dù → In spite of the cold weather.' },
      { t: 'fill', q: 'Some people love city life, ___ others prefer the peace of the countryside.', a: ['whereas', 'while'], ex: 'Đối lập hai vế: whereas / while.' },
      { t: 'fill', q: 'The concert was cancelled on account ___ the storm.', a: ['of'], ex: 'on account of + danh từ = because of (vì, do) → on account of the storm.' },
      { t: 'rewrite', q: 'Although it was raining, the match continued.', start: 'Despite', a: ['Despite the rain, the match continued.', 'Despite the fact that it was raining, the match continued.', 'Despite it raining, the match continued.'], ex: 'Although + mệnh đề → despite + cụm danh từ / the fact that.' },
      { t: 'rewrite', q: 'Because he was ill, he missed the exam.', start: 'Because of', a: ['Because of his illness, he missed the exam.', 'Because of being ill, he missed the exam.'], ex: 'Because + mệnh đề → because of + cụm danh từ / V-ing.' },
      { t: 'rewrite', q: 'In spite of his lack of experience, he got the job.', start: 'Although', a: ['Although he lacked experience, he got the job.', 'Although he had no experience, he got the job.', 'Although he did not have experience, he got the job.', 'Although he did not have any experience, he got the job.', 'Although he was inexperienced, he got the job.', 'Although he had little experience, he got the job.'], ex: 'In spite of + N → although + mệnh đề.' },
      { t: 'combine', q: 'The tickets were expensive. We bought them anyway.', hint: 'even though', start: 'Even though', a: ['Even though the tickets were expensive, we bought them.', 'Even though the tickets were expensive, we bought them anyway.'], ex: 'Even though + mệnh đề nhượng bộ.' },
      { t: 'combine', q: 'Traffic was heavy. We arrived on time.', hint: 'in spite of', start: 'In spite of', a: ['In spite of the heavy traffic, we arrived on time.', 'In spite of the fact that traffic was heavy, we arrived on time.', 'In spite of the fact that the traffic was heavy, we arrived on time.'], ex: 'In spite of + cụm danh từ (the heavy traffic).' },
      { t: 'error', parts: ['Although she studied hard,', 'but she', 'failed', 'the test.'], w: 1, fix: 'she', ex: 'Không dùng although và but trong cùng một câu.' },
      { t: 'error', parts: ['Despite of', 'the heavy traffic,', 'we arrived', 'on time.'], w: 0, fix: 'Despite', ex: 'Despite không có of (hoặc dùng In spite of).' }
    ]
  });

  /* 8. As if / It's time / would rather – unreal past */
  G.push({
    id: 'as-if-unreal-past', unit: 'verbs', order: 11,
    title: 'As if, It\'s time, would rather + quá khứ giả định', en: 'As if, It\'s Time, Would Rather & the Unreal Past', level: 'B2', emoji: '🎭',
    summary: 'Khi nói điều KHÔNG có thật hoặc mong muốn, ta lùi thì: as if / as though + quá khứ (hiện tại không thật) hoặc quá khứ hoàn thành (quá khứ không thật); It\'s (high / about) time + S + V2; would rather + S2 + V2 (hiện tại) / had V3 (quá khứ); If only + V2 / had V3. Cùng nguyên tắc với wish.',
    blocks: [
      { type: 'diagram', caption: 'As if: thì thường = có thể đúng; lùi thì = không có thật', steps: [
        { t: 'He looks as if he is tired. (có thể anh ấy mệt thật)', c: 'active' },
        { t: '↓ biết rõ là không thật → lùi một thì', c: 'arrow' },
        { t: 'He talks as if he knew everything. (thật ra không biết hết)', c: 'result' },
        { t: '↓ không thật trong quá khứ → had + V3', c: 'arrow' },
        { t: 'She talked about Paris as if she had lived there. (chưa từng sống ở đó)', c: 'passive' }
      ] },
      { type: 'formula', rows: [
        { label: 'As if – không thật ở hiện tại', parts: [ { t: 'S + V', c: 'subj' }, { t: 'as if / as though', c: 'aux' }, { t: 'S + V2-ed / were', c: 'verb' } ], ex: 'He talks [[as if he knew]] everything.' },
        { label: 'As if – không thật trong quá khứ', parts: [ { t: 'S + V', c: 'subj' }, { t: 'as if / as though', c: 'aux' }, { t: 'S + had + V3', c: 'verb' } ], ex: 'She looked [[as if she had seen]] a ghost.' },
        { label: 'It\'s time + to V', parts: [ { t: 'It\'s time', c: 'time' }, { t: '(for sb)', c: 'obj' }, { t: 'to V', c: 'verb' } ], ex: '[[It\'s time for us to leave]].' },
        { label: 'It\'s (high / about) time + S + V2', parts: [ { t: 'It\'s high / about time', c: 'time' }, { t: 'S', c: 'subj' }, { t: 'V2-ed', c: 'verb' } ], ex: '[[It\'s high time the government took]] action on housing.' },
        { label: 'Would rather (cùng chủ ngữ)', parts: [ { t: 'S', c: 'subj' }, { t: 'would rather', c: 'aux' }, { t: 'V nguyên mẫu', c: 'verb' }, { t: '(than V)', c: 'obj' } ], ex: 'I [[would rather stay]] at home tonight.' },
        { label: 'Would rather + người khác (hiện tại / tương lai)', parts: [ { t: 'S', c: 'subj' }, { t: 'would rather', c: 'aux' }, { t: 'S2', c: 'obj' }, { t: 'V2-ed', c: 'verb' } ], ex: 'I [[would rather you didn\'t smoke]] in here.' },
        { label: 'Would rather + người khác (quá khứ)', parts: [ { t: 'S', c: 'subj' }, { t: 'would rather', c: 'aux' }, { t: 'S2', c: 'obj' }, { t: 'had + V3', c: 'verb' } ], ex: 'I [[would rather you had told]] me the truth.' },
        { label: 'If only', parts: [ { t: 'If only', c: 'if' }, { t: 'S', c: 'subj' }, { t: 'V2 (hiện tại) / had V3 (quá khứ)', c: 'verb' } ], ex: '[[If only I had]] more free time!' }
      ] },
      { type: 'uses', items: [
        { title: 'As if + thì bình thường: điều có thể đúng (dựa vào dấu hiệu)', ex: 'It looks [[as if it is going to rain]].', vi: 'Trông có vẻ trời sắp mưa.' },
        { title: 'As if + quá khứ đơn: tưởng tượng, trái với hiện tại', ex: 'She treats me [[as if I were]] a child.', vi: 'Cô ấy đối xử với tôi như thể tôi là trẻ con.' },
        { title: 'As if + quá khứ hoàn thành: trái với sự thật đã xảy ra', ex: 'He acted [[as if nothing had happened]].', vi: 'Anh ta cư xử như thể chưa có chuyện gì xảy ra.' },
        { title: 'It\'s time + S + V2: lẽ ra đã phải làm rồi (hàm ý phàn nàn, thúc giục)', ex: '[[It\'s time you went]] to bed.', vi: 'Đến giờ con phải đi ngủ rồi đấy.' },
        { title: 'Would rather + S2 + V2: muốn người khác làm gì', ex: 'My parents [[would rather I studied]] medicine.', vi: 'Bố mẹ tôi muốn tôi học ngành y hơn.' },
        { title: 'If only = I wish nhưng cảm xúc mạnh hơn', ex: '[[If only I had listened]] to your advice!', vi: 'Giá mà tôi đã nghe lời khuyên của bạn!' }
      ] },
      { type: 'table', head: ['Cấu trúc', 'Không thật ở hiện tại / tương lai', 'Không thật trong quá khứ'], rows: [
        ['as if / as though', 'S + V2 / were', 'S + had V3'],
        ['would rather + S2', 'S2 + V2 / were', 'S2 + had V3'],
        ['If only / I wish', 'S + V2 / were (could, would)', 'S + had V3'],
        ['It\'s (high / about) time', 'S + V2 (hoặc for sb + to V)', '—']
      ] },
      { type: 'tip', text: 'Trong as if / if only / wish / would rather, "were" dùng được cho mọi ngôi trong văn trang trọng (as if he were…); văn nói thường dùng was.' },
      { type: 'tip', text: 'Liên hệ bài Câu điều kiện hỗn hợp & wish: I wish I knew = If only I knew – cùng nguyên tắc lùi thì. Would rather + V nguyên mẫu (cùng chủ ngữ) KHÔNG lùi thì: I\'d rather walk.' },
      { type: 'mistake', wrong: 'I\'d rather you don\'t tell anyone.', right: 'I\'d rather you didn\'t tell anyone.', why: 'Would rather + người khác → động từ lùi về quá khứ dù nói về hiện tại/tương lai.' },
      { type: 'mistake', wrong: 'It\'s time we go home.', right: 'It\'s time we went home.', why: 'It\'s time + S + V2 (quá khứ giả định).' },
      { type: 'mistake', wrong: 'I would rather to walk than take a taxi.', right: 'I would rather walk than take a taxi.', why: 'Would rather + V nguyên mẫu không có to.' },
      { type: 'mistake', wrong: 'He behaves as if he is the boss, but he isn\'t.', right: 'He behaves as if he were the boss, but he isn\'t.', why: 'Biết rõ là không thật → lùi thì (were).' },
      { type: 'ielts', text: 'Speaking: "I\'d rather…" là cách tự nhiên để nói về sở thích (Part 1). Writing Task 2: "It is high time (that) governments + V2" nêu mạnh một đề xuất cấp thiết.', ex: '[[It is high time that governments invested]] more in renewable energy.' }
    ],
    quiz: [
      { q: 'He spends money as if he ___ a millionaire. (thật ra anh ấy không giàu)', options: ['is', 'has been', 'were', 'will be'], answer: 2, explain: 'Điều không có thật ở hiện tại (thật ra không giàu) → as if + lùi thì: were. is và will be diễn tả điều có thật; has been sai thì.' },
      { q: 'She described the city as if she ___ there, but she had never visited it.', options: ['had been', 'has been', 'was being', 'would be'], answer: 0, explain: 'Điều không có thật trong quá khứ (chưa từng đến) → as if + had + V3 → had been. has been, was being, would be không diễn tả quá khứ không có thật.' },
      { q: 'It\'s about time you ___ a job.', options: ['find', 'will find', 'finding', 'found'], answer: 3, explain: 'It\'s about time + S + V2 (đã đến lúc… – hàm ý lẽ ra phải làm rồi) → found. find và will find không lùi thì; finding sai dạng.' },
      { q: 'It\'s time ___ the meeting.', options: ['starting', 'to start', 'for start', 'started'], answer: 1, explain: 'It\'s time + to V (đến lúc làm gì, không có chủ ngữ riêng) → to start. Nếu có chủ ngữ thì dùng It\'s time + S + V2.' },
      { q: 'I\'d rather you ___ your phone during dinner.', options: ['don\'t use', 'not use', 'didn\'t use', 'won\'t use'], answer: 2, explain: 'would rather + S2 + V2 (phủ định: didn\'t + V) → I\'d rather you didn\'t use. "don\'t use" và "won\'t use" không lùi thì; "not use" thiếu trợ động từ.' },
      { q: 'I\'d rather ___ at home than go to the party.', options: ['stay', 'to stay', 'staying', 'stayed'], answer: 0, explain: 'Cùng chủ ngữ: would rather + V nguyên mẫu (… than + V) → I\'d rather stay. Không dùng to V, V-ing hay V2 sau would rather khi cùng chủ ngữ.' },
      { q: 'Câu nào đúng?', options: ['I\'d rather you told me about it yesterday.', 'I\'d rather you have told me about it yesterday.', 'I\'d rather you had told me about it yesterday.', 'I\'d rather you tell me about it yesterday.'], answer: 2, explain: 'Mong muốn trái với quá khứ → would rather + S2 + had V3. told nói về hiện tại; "have told" và "tell" không lùi thì.' },
      { q: 'Câu nào đúng?', options: ['If only I knew the answer!', 'If only I know the answer!', 'If only I will know the answer!', 'If only I am knowing the answer!'], answer: 0, explain: 'If only + V2 cho điều ước không có thật ở hiện tại → If only I knew the answer! know, will know, am knowing không lùi thì nên không diễn tả điều ước.' },
      { q: 'Câu nào đúng?', options: ['It\'s high time the city builds more parks.', 'It\'s high time the city has built more parks.', 'It\'s high time the city to build more parks.', 'It\'s high time the city built more parks.'], answer: 3, explain: 'It\'s high time + S + V2 (quá khứ đơn, dù nói về hiện tại) → the city built. builds và has built không lùi thì; "to build" thiếu for.' },
      { q: 'Câu nào cùng nghĩa? "I want you to stay here tonight."', options: ['I\'d rather stay here tonight.', 'I\'d rather you stayed here tonight.', 'I\'d rather you to stay here tonight.', 'I\'d rather you had stayed here tonight.'], answer: 1, explain: 'Muốn người khác làm gì → would rather + S2 + V2 → I\'d rather you stayed. "I\'d rather stay" đổi người thực hiện; "you to stay" sai cấu trúc; "had stayed" nói về quá khứ.' },
      { q: 'Câu nào cùng nghĩa? "He isn\'t the manager, but he gives orders like one."', options: ['He gives orders as if he is not the manager.', 'He gives orders as if he had been the manager.', 'He gives orders as though being the manager.', 'He gives orders as if he were the manager.'], answer: 3, explain: 'Không có thật ở hiện tại (anh ấy không phải quản lý) → as if + were → as if he were the manager. Câu 1 đảo nghĩa; "had been" chỉ quá khứ; "as though being" sai cấu trúc.' },
      { q: 'Câu nào cùng nghĩa? "I regret not studying harder."', options: ['If only I had studied harder.', 'If only I studied harder.', 'If only I study harder.', 'It\'s time I studied harder.'], answer: 0, explain: 'Hối tiếc về quá khứ → If only + had V3 → If only I had studied harder. "studied" là ước cho hiện tại; "study" không lùi thì; "It\'s time I studied" là lời khuyên nên làm ngay.' }
    ],
    drills: [
      { t: 'verb', q: 'He acts as if he ___ the owner of the company, but he is only an intern. (be)', a: ['were', 'was'], ex: 'Không thật ở hiện tại → lùi thì: were (trang trọng) / was.' },
      { t: 'verb', q: 'It\'s high time we ___ home. It\'s nearly midnight. (go)', a: ['went'], ex: 'It\'s high time + S + V2 (đã đến lúc phải…) → we went.' },
      { t: 'verb', q: 'I\'d rather you ___ me the truth yesterday. (tell)', a: ['had told', '\'d told'], ex: 'Mong muốn trái với quá khứ → had + V3.' },
      { t: 'rewrite', q: 'You should go to bed now; it\'s late.', start: 'It\'s time you', a: ['It\'s time you went to bed.', 'It\'s time you went to bed now.'], ex: 'Lời khuyên "nên làm ngay" → It\'s time + S + V2: It\'s time you went to bed.' },
      { t: 'rewrite', q: 'I want you to stay here tonight.', start: 'I\'d rather you', a: ['I\'d rather you stayed here tonight.'], ex: 'Muốn người khác làm gì: would rather + S2 + V2 (quá khứ giả định) → I\'d rather you stayed here tonight.' },
      { t: 'rewrite', q: 'I prefer walking to taking the bus.', start: 'I\'d rather', a: ['I\'d rather walk than take the bus.'], ex: 'Would rather + V nguyên mẫu + than + V nguyên mẫu.' },
      { t: 'combine', q: 'She isn\'t a celebrity. But she behaves like one.', hint: 'as if', start: 'She behaves as if', a: ['She behaves as if she were a celebrity.', 'She behaves as if she was a celebrity.'], ex: 'Không thật ở hiện tại → as if + were/was.' },
      { t: 'combine', q: 'I didn\'t listen to my teacher. I regret it now.', hint: 'If only', start: 'If only', a: ['If only I had listened to my teacher.', 'If only I\'d listened to my teacher.', 'If only I had listened to my teacher!'], ex: 'Hối tiếc quá khứ → If only + had V3.' },
      { t: 'error', parts: ['I\'d rather', 'you', 'don\'t tell', 'anyone about this.'], w: 2, fix: 'didn\'t tell', ex: 'Would rather + S2 → động từ lùi về quá khứ.' },
      { t: 'error', parts: ['It\'s', 'about time', 'the council repairs', 'this road.'], w: 2, fix: 'the council repaired', ex: 'It\'s about time + S + V2 (đã đến lúc…) → the council repaired, không dùng hiện tại repairs.' }
    ]
  });

  /* 9. Idioms & register */
  G.push({
    id: 'idioms-style', unit: 'academic', order: 14,
    title: 'Thành ngữ & văn phong', en: 'Idioms & Register', level: 'B2', emoji: '🎩',
    summary: 'Văn phong (register) quyết định chọn từ: Writing cần trang trọng – từ một chữ thay cụm động từ thân mật (find out → discover), không rút gọn (do not), câu khách quan (It could be argued that…), tránh thành ngữ sáo rỗng. Speaking cho phép thân mật hơn, và 1–2 thành ngữ tự nhiên, đúng ngữ cảnh sẽ giúp tăng điểm Lexical Resource.',
    blocks: [
      { type: 'scale', caption: 'Cùng một ý – mức độ trang trọng khác nhau', items: [
        { t: 'It could be argued that…', v: 95 },
        { t: 'There is considerable evidence that…', v: 85 },
        { t: 'Many people believe that…', v: 60 },
        { t: 'I think…', v: 35 },
        { t: 'Loads of people reckon…', v: 10 }
      ] },
      { type: 'diagram', caption: 'Nâng văn phong một câu từ văn nói lên văn viết học thuật', steps: [
        { t: 'Kids these days get loads of homework.', c: 'note' },
        { t: '↓ thay từ lóng / thân mật bằng từ trang trọng', c: 'arrow' },
        { t: 'Children nowadays receive a considerable amount of homework.', c: 'result' },
        { t: '↓ chuyển sang câu khách quan (impersonal)', c: 'arrow' },
        { t: 'It could be argued that children today are given excessive homework.', c: 'passive' }
      ] },
      { type: 'formula', rows: [
        { label: 'Ý kiến cá nhân → khách quan', parts: [ { t: 'It', c: 'subj' }, { t: 'could be / is often', c: 'aux' }, { t: 'argued / claimed / believed', c: 'verb' }, { t: 'that + mệnh đề', c: 'obj' } ], ex: '[[It could be argued that]] technology has made people less patient.' },
        { label: 'There is + bằng chứng / mối lo ngại', parts: [ { t: 'There is', c: 'aux' }, { t: 'growing / considerable', c: 'adv' }, { t: 'evidence / concern', c: 'subj' }, { t: 'that + mệnh đề', c: 'obj' } ], ex: '[[There is growing concern that]] young people spend too long online.' },
        { label: 'Bị động khách quan', parts: [ { t: 'N', c: 'subj' }, { t: 'is widely', c: 'aux' }, { t: 'believed / accepted', c: 'verb' }, { t: 'to V / to be', c: 'obj' } ], ex: 'Regular exercise [[is widely believed to improve]] mental health.' }
      ] },
      { type: 'table', head: ['Thân mật (Speaking)', 'Trang trọng (Writing)', 'Ví dụ trang trọng'], rows: [
        ['get', 'obtain / receive', 'Applicants must obtain a visa in advance.'],
        ['find out', 'discover / establish', 'Researchers discovered a link between diet and sleep.'],
        ['a lot of', 'a considerable number of / a great deal of', 'A considerable number of graduates move abroad.'],
        ['kids', 'children', 'Children learn languages quickly.'],
        ['go up / go down', 'increase / decrease', 'Unemployment decreased slightly in 2019.'],
        ['cut down on', 'reduce', 'Cities must reduce traffic emissions.'],
        ['look into', 'investigate / examine', 'The committee will investigate the complaint.'],
        ['put off', 'postpone', 'The conference was postponed until May.'],
        ['get rid of', 'eliminate / remove', 'The aim is to eliminate unnecessary paperwork.'],
        ['big / bad', 'significant / harmful', 'Smoking has a harmful effect on health.'],
        ['like (ví dụ)', 'such as', 'renewable sources such as wind and solar power'],
        ['but / so (đầu câu)', 'However, / Therefore,', 'However, this approach has limitations.']
      ] },
      { type: 'uses', items: [
        { title: 'a piece of cake – rất dễ', ex: 'The first part of the test was [[a piece of cake]].', vi: 'Phần đầu bài kiểm tra dễ như ăn bánh.' },
        { title: 'once in a blue moon – rất hiếm khi', ex: 'I eat fast food [[once in a blue moon]].', vi: 'Hiếm lắm tôi mới ăn đồ ăn nhanh.' },
        { title: 'hit the books – học hành chăm chỉ', ex: 'I need to [[hit the books]] before my exam next week.', vi: 'Tôi cần học chăm trước kỳ thi tuần sau.' },
        { title: 'under the weather – hơi mệt, không khỏe', ex: 'I was feeling a bit [[under the weather]] last weekend.', vi: 'Cuối tuần trước tôi thấy hơi mệt.' },
        { title: 'over the moon – vô cùng vui sướng', ex: 'My mum was [[over the moon]] when I passed my driving test.', vi: 'Mẹ tôi vui mừng khôn xiết khi tôi thi đỗ bằng lái.' },
        { title: 'cost an arm and a leg – rất đắt', ex: 'Renting a flat in the city centre [[costs an arm and a leg]].', vi: 'Thuê căn hộ ở trung tâm thành phố đắt cắt cổ.' },
        { title: 'on the same page – cùng quan điểm, hiểu ý nhau', ex: 'My friends and I are usually [[on the same page]] about music.', vi: 'Tôi và bạn bè thường hợp gu âm nhạc.' },
        { title: 'a breath of fresh air – điều mới mẻ, dễ chịu', ex: 'The new teacher was [[a breath of fresh air]] for our class.', vi: 'Thầy giáo mới như một làn gió mới với lớp tôi.' },
        { title: 'up to my ears (in work) – ngập đầu công việc', ex: 'I am [[up to my ears]] in work at the moment.', vi: 'Dạo này tôi ngập đầu trong công việc.' },
        { title: 'learn the ropes – học những điều cơ bản của một công việc', ex: 'It took me a few weeks to [[learn the ropes]] at my new job.', vi: 'Tôi mất vài tuần để làm quen với công việc mới.' },
        { title: 'go the extra mile – nỗ lực hơn mức cần thiết', ex: 'The staff at that hotel always [[go the extra mile]] for guests.', vi: 'Nhân viên khách sạn đó luôn tận tâm hơn mong đợi.' },
        { title: 'take something with a pinch of salt – không tin hoàn toàn', ex: 'I take online reviews [[with a pinch of salt]].', vi: 'Tôi không tin hoàn toàn vào các đánh giá trên mạng.' }
      ] },
      { type: 'tip', text: 'Rút gọn (contractions): Writing Task 1 & 2 viết đầy đủ do not, it is, cannot, will not thay vì don\'t, it\'s, can\'t, won\'t. Trong Speaking, dạng rút gọn là tự nhiên và nên dùng.' },
      { type: 'tip', text: 'Phrasal verb không bị cấm trong Writing – carry out, set up, point out, rely on đều trang trọng. Nhưng khi có động từ một chữ tương đương, hãy ưu tiên: look into → investigate, put up with → tolerate, come up with → devise / propose.' },
      { type: 'mistake', wrong: 'Kids nowadays get way too much homework.', right: 'Children nowadays are given an excessive amount of homework.', why: 'Writing: tránh kids, get, way too much – dùng từ vựng trang trọng.' },
      { type: 'mistake', wrong: 'Pollution is a big problem and governments should do something about it ASAP.', right: 'Pollution is a serious problem, and governments should take action as soon as possible.', why: 'Tránh từ viết tắt (ASAP) và cụm mơ hồ (do something) trong văn học thuật.' },
      { type: 'mistake', wrong: 'Every cloud has a silver lining, so unemployment can be good.', right: 'Although unemployment has serious drawbacks, it may encourage some people to retrain.', why: 'Thành ngữ sáo rỗng trong Task 2 bị coi là thiếu học thuật; hãy diễn đạt ý cụ thể.' },
      { type: 'mistake', wrong: 'The government can\'t ignore this issue, and it\'s time to act.', right: 'The government cannot ignore this issue, and it is time to act.', why: 'Không dùng dạng rút gọn trong bài viết học thuật.' },
      { type: 'ielts', text: 'Speaking: dùng 1–2 thành ngữ tự nhiên, đúng ngữ cảnh để tăng Lexical Resource; dùng gượng ép hoặc sai nghĩa sẽ bị trừ điểm. Writing Task 2: tránh thành ngữ sáo rỗng (every cloud has a silver lining, at the end of the day), tránh từ lóng và dạng rút gọn; ưu tiên câu khách quan.', ex: '[[It is widely accepted that]] regular exercise [[has a positive effect on]] mental health.' }
    ],
    quiz: [
      { q: 'Chọn từ trang trọng nhất cho bài Writing: "Researchers wanted to ___ why the birds had left."', options: ['find out', 'figure out', 'discover', 'suss out'], answer: 2, explain: 'Discover là động từ một chữ, trang trọng hơn find out. find out, figure out và suss out là cụm động từ thân mật.' },
      { q: 'Chọn cách mở câu phù hợp Writing Task 2: "___ that university education should be free."', options: ['It could be argued', 'I reckon', 'Loads of people say', 'To be honest, I think'], answer: 0, explain: 'Câu khách quan It could be argued that… phù hợp văn học thuật. I reckon, Loads of people say và To be honest đều là văn nói.' },
      { q: 'The government should ___ the amount of plastic waste. (văn trang trọng)', options: ['cut down', 'reduce', 'cut down on', 'get rid'], answer: 1, explain: 'Văn trang trọng (Writing) nên dùng động từ một chữ → reduce. cut down và cut down on là cụm động từ thân mật (cut down còn sai nghĩa "chặt"); "get rid" thiếu of.' },
      { q: '"I\'m feeling a bit under the weather today." nghĩa là:', options: ['Tôi thích thời tiết hôm nay', 'Tôi đang đứng dưới mưa', 'Tôi rất vui', 'Tôi thấy hơi mệt, không khỏe'], answer: 3, explain: 'under the weather (thành ngữ) = hơi mệt, không khỏe. Thành ngữ không mang nghĩa đen về thời tiết hay mưa, cũng không có nghĩa là vui.' },
      { q: '"Eating out in this city costs an arm and a leg." nghĩa là:', options: ['rất rẻ', 'rất đắt', 'rất ngon', 'rất nguy hiểm'], answer: 1, explain: 'cost an arm and a leg (thành ngữ) = rất đắt. Thành ngữ không nói về độ rẻ, độ ngon hay sự nguy hiểm.' },
      { q: 'Cụm nào nên TRÁNH trong Writing Task 2?', options: ['a considerable number of', 'consequently', 'it is widely believed that', 'at the end of the day'], answer: 3, explain: 'at the end of the day là cụm văn nói sáo rỗng, nên tránh trong Writing Task 2. a considerable number of, consequently và it is widely believed that đều phù hợp văn học thuật.' },
      { q: 'Câu nào phù hợp nhất cho Writing Task 2?', options: ['Kids get loads of stuff from ads.', 'Kids are like totally influenced by ads.', 'Children are heavily influenced by advertising.', 'Ads mess with kids\' heads big time.'], answer: 2, explain: 'Dùng từ vựng trang trọng: children, heavily influenced, advertising. Ba câu còn lại dùng từ lóng/thân mật (loads of stuff, totally, mess with).' },
      { q: 'Câu nào phù hợp nhất cho Writing Task 1?', options: ['The number of visitors rose significantly in 2015.', 'The number of visitors went up a lot in 2015.', 'Loads more visitors came in 2015.', 'Visitor numbers kind of jumped in 2015.'], answer: 0, explain: 'Rose significantly trang trọng và chính xác hơn went up a lot. went up a lot, loads more và kind of jumped là văn nói.' },
      { q: 'Câu nào dùng thành ngữ ĐÚNG ngữ cảnh (Speaking)?', options: ['I was over the moon when my phone broke.', 'I was over the moon when I got my exam results.', 'My hometown is a piece of cake.', 'I hit the books when I went to the beach.'], answer: 1, explain: 'Over the moon = rất vui → hợp với tin vui như có kết quả thi tốt. over the moon không hợp với tin xấu; "a piece of cake" và "hit the books" dùng sai ngữ cảnh.' },
      { q: 'Câu nào cùng nghĩa, văn phong trang trọng hơn? "Lots of people think the internet is bad for kids."', options: ['Tons of people think the net is bad for kids.', 'People reckon the internet is rubbish for kids.', 'A lot of folks say the internet is bad for kids.', 'Many people believe that the internet is harmful to children.'], answer: 3, explain: 'Many people believe / harmful / children là từ vựng trang trọng. tons of, reckon, folks đều là văn nói thân mật.' },
      { q: 'Câu nào cùng nghĩa, trang trọng hơn? "The company put off the meeting."', options: ['The company cancelled the meeting.', 'The company called the meeting.', 'The company postponed the meeting.', 'The company held the meeting.'], answer: 2, explain: 'Put off = postpone (hoãn), không phải cancel (hủy). cancel là hủy (khác hoãn); call và hold là triệu tập/tổ chức.' },
      { q: 'Câu nào cùng nghĩa? "I only eat sweets once in a blue moon."', options: ['I very rarely eat sweets.', 'I eat sweets every day.', 'I eat sweets when I feel sad.', 'I eat sweets at night.'], answer: 0, explain: 'once in a blue moon = rất hiếm khi → I very rarely eat sweets. Các phương án còn lại nói về tần suất thường xuyên hoặc thời điểm, sai nghĩa.' }
    ],
    drills: [
      { t: 'form', q: 'Researchers are trying to ___ the main cause of the disease. (DISCOVERY)', a: ['discover'], ex: 'Cần động từ (sau to): discover – trang trọng hơn find out.' },
      { t: 'form', q: 'Air pollution can have a ___ effect on children\'s health. (HARM)', a: ['harmful'], ex: 'Cần tính từ trước danh từ effect: harmful (trang trọng hơn bad).' },
      { t: 'form', q: 'Many experts ___ that the new policy will fail. (BELIEF)', a: ['believe', 'believed'], ex: 'Cần động từ sau chủ ngữ: believe (trang trọng hơn think).' },
      { t: 'rewrite', q: 'I think that homework is useless.', start: 'It could be argued that', a: ['It could be argued that homework is useless.'], ex: 'Chuyển ý kiến cá nhân sang câu khách quan.' },
      { t: 'rewrite', q: 'The government should cut down on plastic waste.', start: 'The government should', a: ['The government should reduce plastic waste.', 'The government should reduce the amount of plastic waste.'], ex: 'Cut down on → reduce (động từ một chữ, trang trọng).' },
      { t: 'rewrite', q: 'Scientists found out that the drug was effective.', start: 'Scientists', a: ['Scientists discovered that the drug was effective.', 'Scientists discovered the drug was effective.', 'Scientists established that the drug was effective.'], ex: 'Thay phrasal verb thân mật found out bằng động từ trang trọng hơn cho văn học thuật: discovered / established.' },
      { t: 'combine', q: 'A lot of people believe this. Exercise improves mental health.', hint: 'It is widely believed that', start: 'It is widely believed that', a: ['It is widely believed that exercise improves mental health.'], ex: 'Câu bị động khách quan: It is widely believed that…' },
      { t: 'combine', q: 'Prices rose sharply. Many families could not afford basic food.', hint: 'As a result / Consequently', start: 'Prices rose sharply', a: ['Prices rose sharply. As a result, many families could not afford basic food.', 'Prices rose sharply; as a result, many families could not afford basic food.', 'Prices rose sharply. Consequently, many families could not afford basic food.', 'Prices rose sharply; consequently, many families could not afford basic food.', 'Prices rose sharply and as a result many families could not afford basic food.', 'Prices rose sharply, and as a result, many families could not afford basic food.'], ex: 'Từ nối trang trọng chỉ kết quả: As a result / Consequently.' },
      { t: 'error', parts: ['It', 'could be', 'argue', 'that technology isolates people.'], w: 2, fix: 'argued', ex: 'Bị động: could be + V3 → argued.' },
      { t: 'error', parts: ['There is', 'growing', 'evidences', 'that sleep affects memory.'], w: 2, fix: 'evidence', ex: 'Evidence là danh từ không đếm được, không thêm s.' }
    ]
  });
})(typeof self !== 'undefined' ? self : this);
