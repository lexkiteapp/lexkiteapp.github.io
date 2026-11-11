/* Ngữ pháp – Khởi đầu A1 (tự biên soạn). Điểm ngữ pháp: content/framework/grammar-inventory.json; hàng chờ: content/pipeline/targets.json "Ngữ pháp – bài A1" */
(function (g) {
const G = g.GRAMMAR = g.GRAMMAR || [];

/* A1-1. be: am / is / are – khẳng định, phủ định, câu hỏi */
G.push({
id: 'be-am-is-are', unit: 'foundation', order: 14,
title: 'Động từ be: am / is / are', en: 'The Verb "be": am / is / are', level: 'A1', emoji: '🙋',
summary: 'Dùng am / is / are để nói mình là ai, đến từ đâu, đang ở đâu và cảm thấy thế nào; thêm not để phủ định, đưa am / is / are lên trước chủ ngữ để hỏi.',
blocks: [
{ type: 'sort', caption: 'Chủ ngữ nào đi với am, is hay are?', groups: [
{ title: 'am', emoji: '🙋', items: ['I'] },
{ title: 'is (một người / một vật)', emoji: '👤', items: ['he', 'she', 'it', 'my mother', 'the room', 'Lan'] },
{ title: 'are (you & số nhiều)', emoji: '👥', items: ['you', 'we', 'they', 'my parents', 'the books', 'Lan and Minh'] }
] },
{ type: 'formula', rows: [
{ label: 'Khẳng định: S + am / is / are + …', parts: [ { t: 'S', c: 'subj' }, { t: 'am / is / are', c: 'verb' }, { t: 'tên / quê / tính từ / nơi chốn', c: 'obj' } ], ex: '[[I\'m]] Lan and [[I\'m]] from Hanoi.' },
{ label: 'Phủ định: S + am / is / are + not', parts: [ { t: 'S', c: 'subj' }, { t: 'am not / isn\'t / aren\'t', c: 'verb' }, { t: '…', c: 'obj' } ], ex: 'My brother [[isn\'t]] at home today.' },
{ label: 'Câu hỏi: Am / Is / Are + S + …?', parts: [ { t: 'Am / Is / Are', c: 'verb' }, { t: 'S', c: 'subj' }, { t: '…?', c: 'obj' } ], ex: '[[Are]] you a new student here?' },
{ label: 'Trả lời ngắn: Yes / No + S + be', parts: [ { t: 'Yes, / No,', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'am / is / are (not)', c: 'verb' } ], ex: 'Is she your teacher? Yes, she [[is]].' }
] },
{ type: 'uses', items: [
{ title: 'Nói tên, nghề nghiệp, quê quán', ex: '[[She\'s]] a nurse from Da Nang.', vi: 'Cô ấy là y tá, quê ở Đà Nẵng.' },
{ title: 'Nói tuổi (tiếng Anh dùng be, không dùng have)', ex: 'My son [[is]] seven years old.', vi: 'Con trai tôi bảy tuổi.' },
{ title: 'Tả cảm xúc, tính chất bằng tính từ', ex: 'We [[are]] tired but very happy.', vi: 'Chúng tôi mệt nhưng rất vui.' },
{ title: 'Nói ai, cái gì đang ở đâu', ex: 'The keys [[are]] on the kitchen table.', vi: 'Chùm chìa khóa ở trên bàn bếp.' },
{ title: 'Hỏi để kiểm tra một thông tin', ex: '[[Is]] this seat free, please?', vi: 'Ghế này còn trống không ạ?' }
] },
{ type: 'table', head: ['Chủ ngữ', 'Khẳng định', 'Rút gọn', 'Phủ định', 'Câu hỏi'], rows: [
['I', 'I am', 'I\'m', 'I\'m not', 'Am I …?'],
['he / she / it', 'he is', 'he\'s', 'he isn\'t', 'Is he …?'],
['you / we / they', 'you are', 'you\'re', 'you aren\'t', 'Are you …?']
] },
{ type: 'tip', text: 'Tiếng Việt hay bỏ "là" trước tính từ ("Tôi mệt"), nhưng tiếng Anh luôn cần be: I am tired, không nói I tired.' },
{ type: 'tip', text: 'Khi nói, người bản xứ gần như luôn rút gọn: I\'m, you\'re, he\'s, it\'s. Riêng câu trả lời ngắn khẳng định thì KHÔNG rút gọn: Yes, I am (không nói Yes, I\'m).' },
{ type: 'mistake', wrong: 'I tired after work.', right: 'I am tired after work.', why: 'Trước tính từ phải có be; thiếu am thì câu không có động từ.' },
{ type: 'mistake', wrong: 'She has 20 years old.', right: 'She is 20 years old.', why: 'Nói tuổi dùng be + số + years old, không dùng have.' },
{ type: 'mistake', wrong: 'Are you is a student?', right: 'Are you a student?', why: 'Câu hỏi chỉ cần một động từ be, đặt lên trước chủ ngữ.' },
{ type: 'mistake', wrong: 'My parents is teachers.', right: 'My parents are teachers.', why: 'Chủ ngữ số nhiều (my parents) đi với are.' },
{ type: 'ielts', text: 'IELTS Speaking Part 1 mở đầu bằng câu hỏi về bản thân. Trả lời trọn câu với be và thêm một chi tiết, đừng chỉ nói một từ.', ex: '[[I\'m]] a student. [[I\'m]] in my second year at university.' }
],
quiz: [
{ q: 'My sister ___ a doctor.', options: ['am', 'is', 'are', 'be'], answer: 1, explain: 'My sister là một người (ngôi thứ ba số ít) → is. am chỉ đi với I; are đi với you, we, they và danh từ số nhiều; be là nguyên mẫu, không đứng ngay sau chủ ngữ.' },
{ q: 'We ___ from Vietnam.', options: ['is', 'am', 'are', 'be'], answer: 2, explain: 'We đi với are. is dành cho he, she, it và danh từ số ít; am chỉ dành cho I; be là nguyên mẫu nên không dùng ở đây.' },
{ q: 'I ___ hungry. Let\'s have lunch!', options: ['am', 'is', 'are', 'have'], answer: 0, explain: 'I đi với am → I am hungry. is và are không đi với I; "đói" trong tiếng Anh là be hungry, không dùng have.' },
{ q: '___ your parents at home now?', options: ['Is', 'Are', 'Am', 'Do'], answer: 1, explain: 'Your parents là số nhiều → Are đứng đầu câu hỏi. Is dành cho số ít; Am chỉ đi với I; Do không đi cùng be – câu hỏi với be chỉ cần đưa be lên đầu.' },
{ q: 'Tom ___ at school today. He is ill.', options: ['isn\'t', 'aren\'t', 'not', 'don\'t'], answer: 0, explain: 'Tom là một người → is not = isn\'t. aren\'t dành cho số nhiều; not đứng một mình thì thiếu động từ; don\'t không dùng với be.' },
{ q: '"Are you a teacher?" – "Yes, I ___."', options: ['am', '\'m', 'are', 'is'], answer: 0, explain: 'Trả lời ngắn khẳng định không rút gọn → Yes, I am. Dạng rút gọn \'m không đứng cuối câu; are và is không đi với I.' },
{ q: '"Is it cold outside?" – "No, it ___."', options: ['isn\'t', 'aren\'t', 'not', 'doesn\'t'], answer: 0, explain: 'Câu hỏi dùng is → trả lời phủ định No, it isn\'t. aren\'t dành cho số nhiều; not thiếu động từ; doesn\'t chỉ dùng khi câu hỏi có does.' },
{ q: 'Câu nào đúng?', options: ['She is 25 years old.', 'She has 25 years old.', 'She 25 years old.', 'She are 25 years old.'], answer: 0, explain: 'Nói tuổi: be + số + years old → She is 25 years old. has là sai động từ; câu thứ ba thiếu be; are không đi với she.' },
{ q: 'Câu nào đúng?', options: ['My phone not is on the desk.', 'My phone does not on the desk.', 'My phone is not on the desk.', 'My phone are not on the desk.'], answer: 2, explain: 'Phủ định với be: S + is + not → My phone is not on the desk. not phải đứng sau is; does not không đi với be; are không đi với my phone (số ít).' },
{ q: 'Câu nào đúng?', options: ['Where your keys are?', 'Where are your keys?', 'Where is your keys?', 'Where your keys?'], answer: 1, explain: 'Câu hỏi với be: từ để hỏi + be + chủ ngữ → Where are your keys? Keys là số nhiều nên dùng are, không dùng is; hai câu còn lại sai trật tự hoặc thiếu be.' },
{ q: 'Phần nào sai? "My brother (A) and I (B) is (C) at the cinema (D)."', options: ['My brother', 'and I', 'is', 'at the cinema'], answer: 2, explain: 'My brother and I = we (số nhiều) → phải dùng are, nên phần sai là (C). My brother, and I và at the cinema đều đúng.' },
{ q: 'Phần nào sai? "I (A) am not (B) hungry, but my friends (C) is hungry (D)."', options: ['I', 'am not', 'hungry, but my friends', 'is hungry'], answer: 3, explain: 'My friends là số nhiều → are hungry, nên phần sai là (D). I am not hungry là câu phủ định đúng.' }
],
drills: [
{ t: 'fill', q: "My best friend ___ from Hue.", a: ["is"], ex: 'My best friend là một người → is.' },
{ t: 'fill', q: "You and Minh ___ in the same class.", a: ["are"], ex: 'You and Minh là hai người (số nhiều) → are.' },
{ t: 'fill', q: "I ___ a student at Hanoi University.", a: ["am"], ex: 'Chủ ngữ I luôn đi với am.' },
{ t: 'fill', q: "It ___ very hot today, so take some water.", a: ["is"], ex: 'Nói thời tiết dùng it + is.' },
{ t: 'fill', q: "The children ___ in the garden.", a: ["are"], ex: 'Children là số nhiều (của child) → are.' },
{ t: 'verb', q: "My mother ___ (be/not) at work today.", a: ["isn't", "is not"], ex: 'Phủ định với chủ ngữ số ít: is not, rút gọn isn\'t.' },
{ t: 'verb', q: "We ___ (be/not) late. The film starts at eight.", a: ["aren't", "are not"], ex: 'Phủ định với we: are not, rút gọn aren\'t.' },
{ t: 'verb', q: "I ___ (be/not) ready yet. Wait a minute!", a: ["am not", "'m not"], ex: 'Phủ định với I: am not (rút gọn I\'m not; không có dạng amn\'t).' },
{ t: 'fill', q: "___ your brother a doctor?", a: ["Is"], ex: 'Câu hỏi: đưa be lên trước chủ ngữ; your brother là số ít → Is.' },
{ t: 'error', parts: ["My little sister", "has", "five years old."], w: 1, fix: "is", ex: 'Nói tuổi dùng be: My little sister is five years old.' },
{ t: 'fill', q: "\"Are you tired?\" – \"Yes, I ___.\"", a: ["am"], ex: 'Trả lời ngắn khẳng định không rút gọn: Yes, I am.' },
{ t: 'fill', q: "\"Is the shop open?\" – \"No, it ___.\"", a: ["isn't", "is not"], ex: 'Câu hỏi dùng is → trả lời phủ định No, it isn\'t.' },
{ t: 'rewrite', q: "She is a nurse.", start: "Is", a: ["Is she a nurse?"], ex: 'Đổi sang câu hỏi: đưa is lên trước chủ ngữ she.' },
{ t: 'rewrite', q: "They are at the bus stop. (phủ định)", start: "They", a: ["They aren't at the bus stop.", "They are not at the bus stop."], ex: 'Phủ định: thêm not ngay sau are.' },
{ t: 'rewrite', q: "My age is twelve.", start: "I am", a: ["I am twelve.", "I am twelve years old.", "I am 12.", "I am 12 years old."], ex: 'Nói tuổi tự nhiên: I am + số (+ years old).' },
{ t: 'combine', q: "My father is a farmer. My mother is a farmer.", hint: "are", a: ["My father and mother are farmers.", "My father and my mother are farmers.", "My parents are farmers."], ex: 'Hai người làm chủ ngữ → số nhiều → are + danh từ số nhiều farmers.' },
{ t: 'combine', q: "Lan is my classmate. Lan is very kind.", hint: "and", a: ["Lan is my classmate and she is very kind.", "Lan is my classmate and she's very kind.", "Lan is my classmate and very kind."], ex: 'Nối hai câu bằng and; lần nhắc thứ hai thay Lan bằng she cho tự nhiên.' },
{ t: 'error', parts: ["My parents", "is", "at home", "this evening."], w: 1, fix: "are", ex: 'My parents là số nhiều → are.' },
{ t: 'error', parts: ["I", "tired", "after", "the long trip."], w: 1, fix: "am tired", ex: 'Trước tính từ tired phải có be: I am tired.' },
{ t: 'error', parts: ["Is", "you", "a new student", "here?"], w: 0, fix: "Are", ex: 'You luôn đi với are: Are you a new student here?' }
]
});

/* A1-2. a / an & danh từ số nhiều (có quy tắc + bất quy tắc thường gặp) */
G.push({
id: 'a-an-plurals', unit: 'foundation', order: 15,
title: 'A / an & danh từ số nhiều', en: 'A / An & Plural Nouns', level: 'A1', emoji: '📦',
summary: 'Dùng a trước âm phụ âm, an trước âm nguyên âm khi nói về một người, một vật; thêm -s, -es hoặc đổi y → ies khi có từ hai trở lên, và nhớ các dạng bất quy tắc hay gặp: men, women, children, people, feet, teeth.',
blocks: [
{ type: 'sort', caption: 'A hay an? Nghe âm đầu, đừng nhìn chữ cái', groups: [
{ title: 'a + âm phụ âm', emoji: '🅰️', items: ['a book', 'a dog', 'a banana', 'a university', 'a uniform'] },
{ title: 'an + âm nguyên âm', emoji: '🍎', items: ['an apple', 'an egg', 'an orange', 'an umbrella', 'an hour'] }
] },
{ type: 'sort', caption: 'Bốn cách tạo số nhiều', groups: [
{ title: '+ s', emoji: '➕', items: ['books', 'cars', 'days', 'keys'] },
{ title: '+ es (sau s, ss, sh, ch, x, một số -o)', emoji: '➕', items: ['buses', 'classes', 'dishes', 'watches', 'boxes', 'tomatoes'] },
{ title: 'phụ âm + y → ies', emoji: '🔁', items: ['cities', 'babies', 'families', 'countries'] },
{ title: 'bất quy tắc', emoji: '⚠️', items: ['men', 'women', 'children', 'people', 'feet', 'teeth'] }
] },
{ type: 'formula', rows: [
{ label: 'a + danh từ số ít (âm đầu là phụ âm)', parts: [ { t: 'a', c: 'adv' }, { t: 'N số ít', c: 'obj' } ], ex: 'I have [[a]] brother and [[a]] sister.' },
{ label: 'an + danh từ số ít (âm đầu là nguyên âm)', parts: [ { t: 'an', c: 'adv' }, { t: 'N số ít', c: 'obj' } ], ex: 'She eats [[an]] apple every morning.' },
{ label: 'a / an + tính từ + danh từ: chọn theo âm của tính từ', parts: [ { t: 'a / an', c: 'adv' }, { t: 'tính từ', c: 'verb' }, { t: 'N số ít', c: 'obj' } ], ex: 'It is [[an]] old house with [[a]] big garden.' },
{ label: 'Số đếm (từ 2) + danh từ số nhiều', parts: [ { t: 'two / three / many', c: 'adv' }, { t: 'N + s / es / ies', c: 'obj' } ], ex: 'We have two [[cats]] and three [[puppies]].' }
] },
{ type: 'uses', items: [
{ title: 'a / an = "một", khi nhắc tới lần đầu', ex: 'Can I have [[a]] cup of tea, please?', vi: 'Cho tôi một tách trà nhé.' },
{ title: 'a / an trước nghề nghiệp (tiếng Việt không cần)', ex: 'My mother is [[an]] engineer.', vi: 'Mẹ tôi là kỹ sư.' },
{ title: 'Từ hai trở lên: danh từ phải ở số nhiều', ex: 'There are four [[bedrooms]] in our house.', vi: 'Nhà chúng tôi có bốn phòng ngủ.' },
{ title: 'Danh từ số nhiều KHÔNG đi với a / an', ex: 'I bought [[apples]] and [[eggs]] at the market.', vi: 'Tôi mua táo và trứng ở chợ.' },
{ title: 'Số nhiều bất quy tắc: không thêm -s', ex: 'Five [[people]] live in this small house.', vi: 'Năm người sống trong ngôi nhà nhỏ này.' }
] },
{ type: 'table', head: ['Quy tắc', 'Số ít', 'Số nhiều'], rows: [
['Hầu hết danh từ: + s', 'book, car, day', 'books, cars, days'],
['Tận cùng -s, -ss, -sh, -ch, -x: + es', 'bus, class, dish, watch, box', 'buses, classes, dishes, watches, boxes'],
['Phụ âm + y: y → ies', 'city, baby, family', 'cities, babies, families'],
['Nguyên âm + y: chỉ + s', 'boy, key, toy', 'boys, keys, toys'],
['Một số từ -o: + es', 'tomato, potato', 'tomatoes, potatoes'],
['Nhiều từ -f / -fe: → ves', 'knife, wife, leaf', 'knives, wives, leaves'],
['Bất quy tắc', 'man, woman, child, person, foot, tooth, mouse', 'men, women, children, people, feet, teeth, mice'],
['Giữ nguyên', 'fish, sheep', 'fish, sheep']
] },
{ type: 'tip', text: 'Chọn a / an theo ÂM đầu khi đọc, không theo chữ cái: a university, a uniform (đọc /juː/ như phụ âm), nhưng an hour (h câm), an umbrella.' },
{ type: 'tip', text: 'Đuôi số nhiều phải đọc thành tiếng: books /s/, dogs /z/, buses /ɪz/. Nuốt mất âm cuối thì người nghe tưởng bạn nói số ít.' },
{ type: 'mistake', wrong: 'My father is engineer.', right: 'My father is an engineer.', why: 'Nghề nghiệp số ít cần a / an; engineer bắt đầu bằng âm nguyên âm → an.' },
{ type: 'mistake', wrong: 'I have two brother.', right: 'I have two brothers.', why: 'Sau số đếm từ 2 trở lên, danh từ đếm được phải ở số nhiều.' },
{ type: 'mistake', wrong: 'There are three childs in the park.', right: 'There are three children in the park.', why: 'Child có số nhiều bất quy tắc là children.' },
{ type: 'mistake', wrong: 'She has a apple and a orange.', right: 'She has an apple and an orange.', why: 'Apple và orange bắt đầu bằng âm nguyên âm → an.' },
{ type: 'ielts', text: 'Trong IELTS Listening, thiếu đuôi -s ở đáp án số nhiều bị tính là SAI. Nghe kỹ âm cuối và kiểm lại xem chỗ trống cần một hay nhiều.', ex: 'The tour includes two [[museums]] and [[a]] boat trip.' }
],
quiz: [
{ q: 'I need ___ umbrella. It is raining.', options: ['a', 'an', 'many', 'two'], answer: 1, explain: 'Umbrella bắt đầu bằng âm nguyên âm /ʌ/ → an umbrella. a chỉ dùng trước âm phụ âm; many và two cần danh từ số nhiều (umbrellas), không đi với umbrella.' },
{ q: 'She is ___ university student.', options: ['a', 'an', 'many', 'two'], answer: 0, explain: 'University đọc /juː/ – âm đầu là phụ âm /j/ → a, dù chữ cái đầu là u. an sai vì âm đầu không phải nguyên âm; many và two cần danh từ số nhiều.' },
{ q: 'We waited for ___ hour at the station.', options: ['a', 'an', 'many', 'two'], answer: 1, explain: 'Chữ h trong hour câm, âm đầu là nguyên âm → an hour. a sai vì phải chọn theo âm, không theo chữ; many và two cần hours.' },
{ q: 'There are three ___ in my family.', options: ['child', 'childs', 'children', 'childrens'], answer: 2, explain: 'Số nhiều bất quy tắc của child là children. child là số ít, không đi với three; childs và childrens không tồn tại.' },
{ q: 'The ___ in this city are very friendly.', options: ['peoples', 'person', 'persons', 'people'], answer: 3, explain: 'People là số nhiều thông dụng của person, đi với are. person là số ít; peoples nghĩa là "các dân tộc"; persons chỉ gặp trong văn bản pháp lý, trang trọng.' },
{ q: 'I brush my ___ twice a day.', options: ['tooth', 'teeth', 'tooths', 'teeths'], answer: 1, explain: 'Đánh cả hàm răng → số nhiều bất quy tắc teeth. tooth là một chiếc răng; tooths và teeths không tồn tại.' },
{ q: 'Can I have two ___, please?', options: ['sandwich', 'sandwichs', 'sandwiches', 'sandwichies'], answer: 2, explain: 'Sandwich tận cùng -ch → thêm es: sandwiches. Số ít sai sau two; chỉ thêm s là thiếu; -ies chỉ dùng cho phụ âm + y.' },
{ q: 'Câu nào đúng?', options: ['My aunt is nurse.', 'My aunt is a nurse.', 'My aunt is an nurse.', 'My aunt is nurses.'], answer: 1, explain: 'Nghề nghiệp số ít cần a / an; nurse bắt đầu bằng âm phụ âm /n/ → a nurse. Thiếu mạo từ là sai; an chỉ đứng trước âm nguyên âm; nurses là số nhiều, không hợp với my aunt.' },
{ q: 'Câu nào đúng?', options: ['There are many citys in Vietnam.', 'There are many city in Vietnam.', 'There are many cities in Vietnam.', 'There are many cityes in Vietnam.'], answer: 2, explain: 'City: phụ âm t + y → đổi y thành ies: cities. Sau many phải là số nhiều nên city sai; citys và cityes sai chính tả.' },
{ q: 'Câu nào đúng?', options: ['I have a keys.', 'I have two keies.', 'I have two keys.', 'I have an key.'], answer: 2, explain: 'Key: nguyên âm e + y → chỉ thêm s: keys. a không đi với danh từ số nhiều; keies sai chính tả; an key sai vì key bắt đầu bằng âm phụ âm.' },
{ q: 'Phần nào sai? "Two woman (A) are waiting (B) for the bus (C) outside the school (D)."', options: ['Two woman', 'are waiting', 'for the bus', 'outside the school'], answer: 0, explain: 'Sau two cần số nhiều; số nhiều của woman là women → Two women, nên phần sai là (A). Các phần còn lại đều đúng.' },
{ q: 'Phần nào sai? "There are (A) five box (B) on the table (C) in the kitchen (D)."', options: ['There are', 'five box', 'on the table', 'in the kitchen'], answer: 1, explain: 'Box tận cùng -x → thêm es: five boxes, nên phần sai là (B). There are, on the table và in the kitchen đều đúng.' }
],
drills: [
{ t: 'fill', q: "I eat ___ egg for breakfast every day.", a: ["an"], ex: 'Egg bắt đầu bằng âm nguyên âm → an.' },
{ t: 'fill', q: "My father is ___ taxi driver.", a: ["a"], ex: 'Nghề nghiệp số ít cần a / an; taxi bắt đầu bằng âm phụ âm → a.' },
{ t: 'fill', q: "It is ___ easy question.", a: ["an"], ex: 'Chọn theo âm của từ đứng ngay sau: easy bắt đầu bằng âm nguyên âm → an.' },
{ t: 'fill', q: "He wears ___ uniform to school.", a: ["a"], ex: 'Uniform đọc /ˈjuː-/ – âm đầu là phụ âm /j/ → a.' },
{ t: 'form', q: "There are two ___ in the drawer. (KNIFE)", a: ["knives"], ex: 'Đuôi -fe đổi thành -ves: knife → knives.' },
{ t: 'form', q: "I have three ___ of old photos. (BOX)", a: ["boxes"], ex: 'Tận cùng -x → thêm es: boxes.' },
{ t: 'form', q: "Many ___ visit Hoi An every summer. (FAMILY)", a: ["families"], ex: 'Phụ âm l + y → đổi y thành ies: families.' },
{ t: 'form', q: "The ___ are playing football in the yard. (CHILD)", a: ["children"], ex: 'Số nhiều bất quy tắc: child → children.' },
{ t: 'form', q: "Two ___ are waiting at the door. (MAN)", a: ["men"], ex: 'Số nhiều bất quy tắc: man → men.' },
{ t: 'form', q: "My little brother has three ___. (TOY)", a: ["toys"], ex: 'Nguyên âm o + y → chỉ thêm s: toys.' },
{ t: 'form', q: "I need four ___ for the soup. (TOMATO)", a: ["tomatoes"], ex: 'Tomato thuộc nhóm -o thêm es: tomatoes.' },
{ t: 'form', q: "Please clean your ___ before you come in. (FOOT)", a: ["feet"], ex: 'Số nhiều bất quy tắc: foot → feet.' },
{ t: 'rewrite', q: "I have one sister.", start: "I have two", a: ["I have two sisters."], ex: 'Từ hai trở lên → danh từ thêm s: sisters.' },
{ t: 'rewrite', q: "There is a bus at the station.", start: "There are three", a: ["There are three buses at the station."], ex: 'Bus tận cùng -s → thêm es: buses; there is đổi thành there are.' },
{ t: 'rewrite', q: "She has a baby.", start: "She has two", a: ["She has two babies."], ex: 'Phụ âm b + y → ies: babies.' },
{ t: 'rewrite', q: "A woman is in the shop.", start: "Two", a: ["Two women are in the shop."], ex: 'Woman → women (bất quy tắc); động từ đổi is → are.' },
{ t: 'error', parts: ["My mother", "is", "engineer", "at a big company."], w: 2, fix: "an engineer", ex: 'Nghề nghiệp số ít cần a / an; engineer bắt đầu bằng âm nguyên âm → an engineer.' },
{ t: 'error', parts: ["There are", "five person", "in my family."], w: 1, fix: "five people", ex: 'Số nhiều của person là people.' },
{ t: 'error', parts: ["I", "have", "a new shoes", "for the party."], w: 2, fix: "new shoes", ex: 'Shoes là số nhiều nên không đi với a.' },
{ t: 'error', parts: ["She", "eats", "a apple", "every morning."], w: 2, fix: "an apple", ex: 'Apple bắt đầu bằng âm nguyên âm → an apple.' }
]
});

/* A1-3. Giới từ thời gian at / on / in & nơi chốn in / on / under / next to */
G.push({
id: 'prepositions-time-place-basic', unit: 'foundation', order: 16,
title: 'Giới từ cơ bản: at / on / in & in / on / under / next to', en: 'Basic Prepositions of Time & Place', level: 'A1', emoji: '📍',
summary: 'Thời gian: at + giờ, on + thứ và ngày, in + tháng, năm, mùa, buổi. Nơi chốn: in (bên trong), on (trên bề mặt), under (bên dưới), next to, behind, in front of, between để nói đồ vật ở đâu.',
blocks: [
{ type: 'sort', caption: 'At – on – in cho thời gian: từ điểm nhỏ đến khoảng lớn', groups: [
{ title: 'at + giờ, thời điểm', emoji: '🕰️', items: ['at 7 o\'clock', 'at 6:30', 'at noon', 'at night', 'at midnight'] },
{ title: 'on + thứ, ngày', emoji: '📅', items: ['on Monday', 'on Sunday morning', 'on 2 September', 'on my birthday'] },
{ title: 'in + tháng, năm, mùa, buổi', emoji: '🍂', items: ['in June', 'in 2025', 'in summer', 'in the morning', 'in the evening'] }
] },
{ type: 'sort', caption: 'Đồ vật ở đâu?', groups: [
{ title: 'in – bên trong', emoji: '📦', items: ['in the box', 'in the kitchen', 'in my bag'] },
{ title: 'on – trên bề mặt', emoji: '🔹', items: ['on the table', 'on the wall', 'on the floor'] },
{ title: 'under – bên dưới', emoji: '⬇️', items: ['under the bed', 'under the chair'] },
{ title: 'next to / behind / in front of', emoji: '↔️', items: ['next to the door', 'behind the sofa', 'in front of the school'] }
] },
{ type: 'formula', rows: [
{ label: 'at + giờ', parts: [ { t: 'at', c: 'adv' }, { t: 'giờ / noon / night', c: 'obj' } ], ex: 'The class starts [[at]] eight o\'clock.' },
{ label: 'on + thứ / ngày', parts: [ { t: 'on', c: 'adv' }, { t: 'Monday / 5 May / my birthday', c: 'obj' } ], ex: 'We have English [[on]] Monday and Thursday.' },
{ label: 'in + tháng / năm / mùa / buổi', parts: [ { t: 'in', c: 'adv' }, { t: 'June / 2025 / summer / the morning', c: 'obj' } ], ex: 'My birthday is [[in]] October.' },
{ label: 'Vật + be + giới từ nơi chốn + nơi', parts: [ { t: 'N', c: 'subj' }, { t: 'is / are', c: 'verb' }, { t: 'in / on / under / next to', c: 'adv' }, { t: 'the + N', c: 'obj' } ], ex: 'The cat is [[under]] the table.' }
] },
{ type: 'uses', items: [
{ title: 'at: giờ cụ thể, noon, night, midnight', ex: 'I go to bed [[at]] eleven o\'clock.', vi: 'Tôi đi ngủ lúc mười một giờ.' },
{ title: 'on: thứ trong tuần, ngày tháng, ngày đặc biệt', ex: 'The shop is closed [[on]] Sundays.', vi: 'Cửa hàng đóng cửa vào các ngày Chủ nhật.' },
{ title: 'in: tháng, năm, mùa, buổi sáng / chiều / tối', ex: 'It is very hot here [[in]] summer.', vi: 'Ở đây mùa hè rất nóng.' },
{ title: 'in / on / under: bên trong, trên bề mặt, bên dưới', ex: 'Your phone is [[on]] the sofa, not [[in]] your bag.', vi: 'Điện thoại của bạn ở trên ghế sofa, không phải trong túi.' },
{ title: 'next to / behind / in front of / between: vị trí so với vật khác', ex: 'The bank is [[between]] the café and the hotel.', vi: 'Ngân hàng nằm giữa quán cà phê và khách sạn.' }
] },
{ type: 'table', head: ['Giới từ', 'Dùng với', 'Ví dụ'], rows: [
['at', 'giờ; noon, night, midnight', 'at 9:15, at noon, at night'],
['on', 'thứ; ngày tháng; thứ + buổi', 'on Friday, on 20 May, on Monday morning'],
['in', 'tháng; năm; mùa; buổi trong ngày', 'in May, in 2024, in winter, in the afternoon'],
['in', 'bên trong một không gian', 'in the room, in the car, in Hanoi'],
['on', 'trên bề mặt', 'on the desk, on the wall, on the floor'],
['under', 'bên dưới', 'under the bed'],
['next to', 'sát bên cạnh', 'next to the window'],
['behind / in front of', 'phía sau / phía trước', 'behind the door, in front of the school'],
['between', 'ở giữa hai người / vật', 'between the bank and the post office']
] },
{ type: 'tip', text: 'Không dùng at / on / in trước this, next, last, every, today, tomorrow: See you next Monday (không nói on next Monday).' },
{ type: 'tip', text: 'Buổi nói chung dùng in (in the morning), nhưng buổi của một ngày cụ thể dùng on: on Monday morning, on Friday evening.' },
{ type: 'mistake', wrong: 'The meeting is in 3 o\'clock.', right: 'The meeting is at 3 o\'clock.', why: 'Giờ cụ thể dùng at.' },
{ type: 'mistake', wrong: 'I was born on 2005.', right: 'I was born in 2005.', why: 'Năm dùng in; on chỉ dùng khi có ngày cụ thể (on 5 May 2005).' },
{ type: 'mistake', wrong: 'See you on next Friday.', right: 'See you next Friday.', why: 'Trước next không dùng giới từ.' },
{ type: 'mistake', wrong: 'The book is in the table.', right: 'The book is on the table.', why: 'Nằm trên mặt bàn dùng on; in là bên trong.' },
{ type: 'ielts', text: 'Trong IELTS Listening phần điền thông tin, at / on / in đứng trước chỗ trống là đầu mối đoán loại đáp án: nghe "at" → chuẩn bị ghi giờ; nghe "on" → chuẩn bị ghi thứ hoặc ngày.', ex: 'The museum tour starts [[at]] 10:30 [[on]] Saturday.' }
],
quiz: [
{ q: 'The film starts ___ 8 p.m.', options: ['in', 'on', 'at', 'to'], answer: 2, explain: 'Giờ cụ thể dùng at → at 8 p.m. in dùng cho tháng, năm, buổi; on cho thứ và ngày; to không dùng để nói giờ bắt đầu.' },
{ q: 'We don\'t go to school ___ Sunday.', options: ['in', 'on', 'at', 'to'], answer: 1, explain: 'Thứ trong tuần dùng on → on Sunday. in dùng cho tháng, năm; at cho giờ; to chỉ hướng đi (go to school), không đứng trước tên thứ.' },
{ q: 'It often rains here ___ July.', options: ['at', 'on', 'in', 'to'], answer: 2, explain: 'Tháng dùng in → in July. at dành cho giờ; on dành cho thứ và ngày cụ thể; to không dùng để chỉ thời gian ở đây.' },
{ q: 'My grandmother usually sleeps ___ the afternoon.', options: ['in', 'on', 'at', 'to'], answer: 0, explain: 'Buổi trong ngày dùng in the afternoon. on chỉ dùng khi có thứ đi kèm (on Monday afternoon); at dùng cho giờ, noon, night; to không chỉ thời gian.' },
{ q: 'Her birthday is ___ 14 February.', options: ['in', 'at', 'on', 'to'], answer: 2, explain: 'Ngày cụ thể (có số ngày) dùng on → on 14 February. in chỉ dùng cho tháng không có ngày (in February); at dùng cho giờ; to không chỉ ngày tháng.' },
{ q: 'I keep my pen ___ my bag, with my books and keys.', options: ['in', 'on', 'at', 'under'], answer: 0, explain: 'Bên trong một vật chứa (túi) dùng in. on là trên bề mặt túi; at chỉ một điểm, không dùng cho túi; under là phía dưới cái túi, không hợp với "cùng sách vở".' },
{ q: 'There is a clock ___ the wall.', options: ['in', 'on', 'at', 'under'], answer: 1, explain: 'Đồng hồ treo trên bề mặt tường → on the wall. in là bên trong bức tường; at không tả vị trí trên bề mặt; under là bên dưới.' },
{ q: 'The cat is sleeping ___ the bed, so I can\'t see it.', options: ['on', 'under', 'next to', 'at'], answer: 1, explain: 'Không nhìn thấy vì con mèo nằm dưới gầm giường → under. on là trên mặt giường (sẽ thấy ngay); next to là bên cạnh (vẫn thấy); at không dùng để tả vị trí so với cái giường.' },
{ q: 'Câu nào đúng?', options: ['See you on next Tuesday.', 'See you next Tuesday.', 'See you in next Tuesday.', 'See you at next Tuesday.'], answer: 1, explain: 'Trước next không dùng giới từ → See you next Tuesday. Ba câu còn lại thừa on, in hoặc at.' },
{ q: 'Câu nào đúng?', options: ['We have a party in Saturday evening.', 'We have a party at Saturday evening.', 'We have a party on Saturday evening.', 'We have a party on Saturday in evening.'], answer: 2, explain: 'Buổi của một thứ cụ thể dùng on → on Saturday evening. in và at sai với thứ; câu cuối tách rời "in evening" và thiếu the.' },
{ q: 'Phần nào sai? "My brother (A) was born (B) on 2010 (C) in Da Nang (D)."', options: ['My brother', 'was born', 'on 2010', 'in Da Nang'], answer: 2, explain: 'Năm dùng in → in 2010, nên phần sai là (C). In Da Nang đúng vì thành phố là một không gian bên trong.' },
{ q: 'Phần nào sai? "The bus stop (A) is in front (B) the hotel (C), next to the bank (D)."', options: ['The bus stop', 'is in front', 'the hotel', 'next to the bank'], answer: 1, explain: 'In front phải có of: is in front of the hotel, nên phần sai là (B). The bus stop, the hotel và next to the bank đều đúng.' }
],
drills: [
{ t: 'fill', q: "The bank opens ___ 8:30 in the morning.", a: ["at"], ex: 'Giờ cụ thể (8:30, 3 o\'clock) dùng at → at 8:30.' },
{ t: 'fill', q: "We play football ___ Saturdays.", a: ["on"], ex: 'Thứ trong tuần dùng on, kể cả số nhiều → on Saturdays.' },
{ t: 'fill', q: "My sister was born ___ 2015.", a: ["in"], ex: 'Năm, tháng dùng in (khoảng thời gian dài) → in 2015.' },
{ t: 'fill', q: "It is very cold here ___ winter.", a: ["in"], ex: 'Mùa trong năm dùng in (in summer, in winter) → in winter.' },
{ t: 'fill', q: "Let's meet ___ Friday evening.", a: ["on"], ex: 'Buổi của một thứ cụ thể dùng on: on Friday evening.' },
{ t: 'fill', q: "I usually read a book ___ night.", a: ["at"], ex: 'Cụm cố định: at night (nhưng in the morning, in the evening).' },
{ t: 'fill', q: "Our summer holiday starts ___ 1 June.", a: ["on"], ex: 'Ngày cụ thể trong tháng dùng on → on 1 June.' },
{ t: 'fill', q: "I have English lessons ___ the morning.", a: ["in"], ex: 'Buổi nói chung dùng in: in the morning.' },
{ t: 'fill', q: "Your glasses are ___ the table, next to the lamp.", a: ["on"], ex: 'Nằm trên mặt bàn dùng on.' },
{ t: 'fill', q: "The children are ___ the classroom now.", a: ["in"], ex: 'Ở bên trong một căn phòng dùng in.' },
{ t: 'fill', q: "The dog is sleeping ___ the chair. I can only see its tail.", a: ["under"], ex: 'Nằm phía dưới ghế → under.' },
{ t: 'fill', q: "The pharmacy is ___ to the bakery.", a: ["next"], ex: 'next to là ngay bên cạnh; luôn đi đủ hai từ next + to → next to the bakery.' },
{ t: 'fill', q: "Please wait ___ front of the school gate.", a: ["in"], ex: 'In front of = phía trước.' },
{ t: 'fill', q: "The post office is ___ the bank and the supermarket.", a: ["between"], ex: 'Ở giữa hai nơi dùng between … and ….' },
{ t: 'combine', q: "The lesson is on Monday. It starts at seven.", hint: "at", a: ["The lesson is on Monday at seven.", "The lesson starts at seven on Monday.", "The lesson is at seven on Monday."], ex: 'Gộp hai câu → giữ cả hai giới từ: at + giờ, on + thứ; thường nói giờ trước, thứ sau hoặc ngược lại đều được.' },
{ t: 'rewrite', q: "The ball is not on the bed. It is below the bed.", start: "The ball is", a: ["The ball is under the bed."], ex: 'Below the bed (bên dưới giường) → under the bed.' },
{ t: 'rewrite', q: "The cat is sleeping. The sofa is above it.", start: "The cat is sleeping", a: ["The cat is sleeping under the sofa."], ex: 'Vật ở bên dưới vật khác dùng under → The cat is sleeping under the sofa.' },
{ t: 'rewrite', q: "My birthday is in 12 May.", start: "My birthday is", a: ["My birthday is on 12 May.", "My birthday is on May 12.", "My birthday is on the 12th of May."], ex: 'Có ngày cụ thể thì dùng on, không dùng in → on 12 May.' },
{ t: 'rewrite', q: "I'll see you on next Monday.", start: "I'll see you", a: ["I'll see you next Monday."], ex: 'Trước next/last/this không dùng giới từ → see you next Monday (không nói on next Monday).' },
{ t: 'error', parts: ["The concert", "starts", "in 9 p.m.", "tonight."], w: 2, fix: "at 9 p.m.", ex: 'Giờ cụ thể dùng at, không dùng in → at 9 p.m.' },
{ t: 'error', parts: ["I", "visit my grandparents", "in", "Sunday."], w: 2, fix: "on", ex: 'Thứ trong tuần dùng on, không dùng in → on Sunday.' },
{ t: 'error', parts: ["There is", "a picture", "in", "the wall of my bedroom."], w: 2, fix: "on", ex: 'Treo trên bề mặt tường → on the wall.' }
]
});
})(typeof self !== 'undefined' ? self : this);
