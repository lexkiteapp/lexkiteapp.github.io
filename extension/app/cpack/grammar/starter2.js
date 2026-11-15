/* Ngữ pháp – Khởi đầu A1, phần 2 (tự biên soạn). Điểm ngữ pháp: content/framework/grammar-inventory.json (lessons) */
(function (g) {
const G = g.GRAMMAR = g.GRAMMAR || [];
// Gói lười (lazy-*.js): bài rút gọn cùng id được thay tại chỗ (giữ thứ tự), bài tập/câu hỏi gắn thêm lúc đó (drills-own…) được nối vào; nạp lại không nhân đôi
const put = x => { const i = G.findIndex(y => y.id === x.id), o = G[i]; if (i < 0) return G.push(x); if (!o.lazy) return; for (const k of ['drills', 'quiz']) if (o[k]) x[k] = (x[k] || []).concat(o[k]); G[i] = x; };

/* A1-4. Hiện tại đơn: thói quen, he/she/it + -s, trạng từ tần suất */
put({
id: 'present-simple-a1', unit: 'foundation', order: 17,
title: 'Hiện tại đơn: thói quen & quy tắc -s', en: 'Present Simple: Routines and the -s Rule', level: 'A1', emoji: '⏰',
summary: 'Dùng hiện tại đơn để nói về thói quen, lịch cố định và sự thật; với he / she / it, động từ thêm -s / -es; always, usually, sometimes, never đứng trước động từ thường.',
blocks: [
{ type: 'formula', rows: [
{ label: 'I / you / we / they + động từ nguyên mẫu', parts: [ { t: 'I / you / we / they', c: 'subj' }, { t: 'V', c: 'verb' }, { t: 'thời gian, nơi chốn', c: 'adv' } ], ex: 'We [[get up]] at six and [[walk]] to work.' },
{ label: 'he / she / it + động từ + s / es', parts: [ { t: 'he / she / it', c: 'subj' }, { t: 'V + s / es', c: 'verb' }, { t: '…', c: 'obj' } ], ex: 'My brother [[works]] in a bank. He [[watches]] TV at night.' },
{ label: 'Trạng từ tần suất: trước động từ thường, sau be', parts: [ { t: 'S', c: 'subj' }, { t: 'always / usually / never', c: 'adv' }, { t: 'V', c: 'verb' } ], ex: 'She [[usually]] has tea. He is [[never]] late.' }
] },
{ type: 'uses', items: [
{ title: 'Thói quen hằng ngày', ex: 'I [[drink]] coffee every morning.', vi: 'Tôi uống cà phê mỗi sáng.' },
{ title: 'Sự thật luôn đúng', ex: 'The sun [[rises]] in the east.', vi: 'Mặt trời mọc ở hướng đông.' },
{ title: 'Lịch cố định', ex: 'The shop [[opens]] at eight.', vi: 'Cửa hàng mở cửa lúc tám giờ.' },
{ title: 'Nói công việc, nơi sống', ex: 'Hoa [[lives]] in Hue and [[teaches]] music.', vi: 'Hoa sống ở Huế và dạy nhạc.' }
] },
{ type: 'table', head: ['Động từ', 'Cách thêm', 'he / she / it'], rows: [
['play, work, eat', '+ s', 'plays, works, eats'],
['go, do, watch, wash, miss, fix', '+ es (tận cùng o, ch, sh, ss, x)', 'goes, does, watches, washes'],
['study, try, carry', 'phụ âm + y → ies', 'studies, tries, carries'],
['have', 'bất quy tắc', 'has']
] },
{ type: 'signals', words: ['every day', 'on Mondays', 'in the morning', 'always', 'usually', 'often', 'sometimes', 'never', 'once a week'] },
{ type: 'tip', text: 'Tiếng Việt không chia động từ ("anh ấy đi", "tôi đi"). Tiếng Anh thì có: chỉ với he / she / it (một người, một vật), động từ mới thêm -s. Với I, you, we, they thì giữ nguyên.' },
{ type: 'tip', text: 'Trạng từ tần suất đứng ngay trước động từ thường (I often walk) nhưng đứng sau be (I am often tired). Sometimes còn đứng được ở đầu câu: Sometimes I walk.' },
{ type: 'mistake', wrong: 'My sister work in a hospital.', right: 'My sister works in a hospital.', why: 'My sister = she, nên động từ phải thêm -s.' },
{ type: 'mistake', wrong: 'He go to school by bus.', right: 'He goes to school by bus.', why: 'Go tận cùng o → thêm -es: goes (tương tự does, watches).' },
{ type: 'mistake', wrong: 'She is work at a bank.', right: 'She works at a bank.', why: 'Hiện tại đơn không dùng be trước động từ thường; be + V thuộc thì khác.' },
{ type: 'mistake', wrong: 'I go usually to bed late.', right: 'I usually go to bed late.', why: 'Trạng từ tần suất đứng trước động từ thường, không chen vào giữa động từ và nơi chốn như tiếng Việt.' },
{ type: 'ielts', text: 'IELTS Speaking Part 1 hỏi nhiều về thói quen. Trả lời bằng hiện tại đơn, thêm một trạng từ tần suất và nhớ -s khi nói về người khác.', ex: 'I [[usually]] get up at six. My father [[leaves]] home at seven.' }
],
quiz: [
{ q: 'My brother ___ football every Saturday.', options: ['play', 'plays', 'playing', 'is play'], answer: 1, explain: 'My brother = he → thêm -s: plays. play là dạng cho I / you / we / they; playing và is play không dùng trong hiện tại đơn.' },
{ q: 'She ___ to school by bike.', options: ['go', 'gos', 'goes', 'going'], answer: 2, explain: 'Go tận cùng bằng o → thêm -es: goes. gos sai chính tả; go dành cho I / you / we / they; going không phải hiện tại đơn.' },
{ q: 'We ___ breakfast at seven.', options: ['has', 'haves', 'having', 'have'], answer: 3, explain: 'We đi với động từ nguyên mẫu → have. has chỉ dùng cho he / she / it; haves không tồn tại.' },
{ q: 'My sister ___ English at university.', options: ['studyes', 'studies', 'study', 'studys'], answer: 1, explain: 'Study tận cùng phụ âm + y → bỏ y, thêm -ies: studies. studyes và studys sai quy tắc; study thiếu -s vì my sister = she.' },
{ q: 'He ___ his homework in the evening.', options: ['does', 'do', 'is do', 'doing'], answer: 0, explain: 'He + do → does (thêm -es sau o). do dành cho I / you / we / they; is do và doing sai cấu trúc.' },
{ q: 'I ___ get up late.', options: ['am never', 'never', 'never am', 'don\'t never'], answer: 1, explain: 'Never đứng trước động từ thường: I never get up late. am never dùng khi sau đó là tính từ; never am và don\'t never sai.' },
{ q: 'Lan ___ late for school.', options: ['never is', 'does never', 'never does', 'is never'], answer: 3, explain: 'Trạng từ tần suất đứng sau be: Lan is never late. never is đặt sai vị trí; does never và never does không có động từ chính nào.' },
{ q: 'Câu nào đúng?', options: ['He watch TV every night.', 'He watchs TV every night.', 'He watches TV every night.', 'He is watch TV every night.'], answer: 2, explain: 'Watch tận cùng ch → thêm -es: watches. watch thiếu đuôi, watchs sai chính tả, is watch sai cấu trúc.' },
{ q: 'Câu nào đúng?', options: ['They walk usually to work.', 'They usually walks to work.', 'They are usually walk to work.', 'They usually walk to work.'], answer: 3, explain: 'They + usually trước động từ nguyên mẫu: They usually walk. Câu 2 sai vì they không thêm -s; câu 3 thừa be; câu 1 đặt usually sai chỗ.' },
{ q: 'Câu nào đúng?', options: ['She have a big family.', 'She has a big family.', 'She is have a big family.', 'She haves a big family.'], answer: 1, explain: 'Have bất quy tắc: she has. have chỉ đi với I / you / we / they; is have và haves đều sai. → câu đúng: She has a big family.' },
{ q: 'Phần nào sai? "My father (A) work (B) in a hospital (C) near our house (D)."', options: ['My father', 'work', 'in a hospital', 'near our house'], answer: 1, explain: 'My father = he nên phải là works, phần sai là (B). Các phần còn lại đúng.' },
{ q: 'Phần nào sai? "Tom and Anna (A) goes (B) to the gym (C) on Fridays (D)."', options: ['Tom and Anna', 'goes', 'to the gym', 'on Fridays'], answer: 1, explain: 'Tom and Anna = they (số nhiều) → go, không có -es. Phần sai là (B).' }
],
drills: [
{ t: 'rewrite', q: "I walk to school every day. (My sister)", start: "My sister", a: ["My sister walks to school every day."], ex: "My sister = she → walk thêm -s thành walks." },
{ t: 'fill', q: "My uncle ___ in a small village.", a: ["lives"], ex: 'My uncle = he (ngôi thứ ba số ít) → live + s = lives.' },
{ t: 'fill', q: "They ___ lunch at noon.", a: ["have"], ex: 'They đi với dạng nguyên mẫu have.' },
{ t: 'fill', q: "The bus ___ at nine o'clock.", a: ["leaves"], ex: 'The bus = it (ngôi thứ ba số ít) → leave + s = leaves.' },
{ t: 'verb', q: "My mother ___ (watch) the news every evening.", a: ["watches"], ex: 'Tận cùng ch → thêm -es: watches.' },
{ t: 'verb', q: "He ___ (study) in the library after class.", a: ["studies"], ex: 'Phụ âm + y → -ies: studies. Câu hoàn chỉnh: He studies in the library after class.' },
{ t: 'verb', q: "Ana ___ (have) two cats.", a: ["has"], ex: 'Have bất quy tắc: she has. Câu hoàn chỉnh: Ana has two cats.' },
{ t: 'verb', q: "We ___ (not / go) out on weekdays. (dùng don't)", a: ["don't go", "do not go"], ex: 'Với we: don\'t + nguyên mẫu. (Phần phủ định chi tiết ở bài tiếp theo.) → don\'t go.' },
{ t: 'fill', q: "He ___ goes to bed before ten. (never)", a: ["never"], ex: 'Trạng từ tần suất đứng trước động từ thường goes. → never.' },
{ t: 'rewrite', q: "I get up at six. (Tom)", start: "Tom", a: ["Tom gets up at six."], ex: 'Tom = he → get thêm -s: gets.' },
{ t: 'rewrite', q: "She is tired. (usually)", start: "She", a: ["She is usually tired."], ex: 'Trạng từ tần suất đứng sau be. → She is usually tired.' },
{ t: 'rewrite', q: "We eat out. (sometimes)", start: "We", a: ["We sometimes eat out."], ex: 'Trạng từ tần suất đứng trước động từ thường eat. → We sometimes eat out.' },
{ t: 'combine', q: "Lan gets up early. Lan goes jogging.", hint: "and", a: ["Lan gets up early and goes jogging.", "Lan gets up early and she goes jogging.", "Lan gets up early and then goes jogging."], ex: 'Nối hai động từ cùng chủ ngữ bằng and; cả hai đều thêm -s / -es. → Lan gets up early and goes jogging.' },
{ t: 'error', parts: ["My brother", "teach", "maths", "at a high school."], w: 1, fix: "teaches", ex: 'My brother = he; teach tận cùng ch → teaches.' },
{ t: 'error', parts: ["She", "go usually", "to the market", "on Sundays."], w: 1, fix: "usually goes", ex: 'Trạng từ đứng trước động từ, và she cần goes.' },
{ t: 'error', parts: ["My parents", "is work", "in Da Nang."], w: 1, fix: "work", ex: 'Hiện tại đơn không dùng be trước động từ thường: My parents work in Da Nang.' }
]
});

/* A1-5. do / does: câu hỏi, phủ định, trả lời ngắn */
put({
id: 'do-does-a1', unit: 'foundation', order: 18,
title: 'Do / does: phủ định, câu hỏi & trả lời ngắn', en: 'Do / Does: Negatives, Questions and Short Answers', level: 'A1', emoji: '❓',
summary: 'Hiện tại đơn phủ định và nghi vấn dùng trợ động từ do / does; sau do / does động từ luôn ở dạng nguyên mẫu, không thêm -s.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Phủ định: S + do / does + not + V', parts: [ { t: 'S', c: 'subj' }, { t: 'don\'t / doesn\'t', c: 'neg' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: 'I [[don\'t]] drink coffee. She [[doesn\'t]] drink tea.' },
{ label: 'Nghi vấn: Do / Does + S + V?', parts: [ { t: 'Do / Does', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: '[[Do]] you live near here? [[Does]] he speak English?' },
{ label: 'Trả lời ngắn: Yes / No + S + do / does (not)', parts: [ { t: 'Yes, / No,', c: 'adv' }, { t: 'S', c: 'subj' }, { t: 'do / does (n\'t)', c: 'aux' } ], ex: 'Does she work here? No, she [[doesn\'t]].' }
] },
{ type: 'uses', items: [
{ title: 'Nói điều mình không làm', ex: 'We [[don\'t have]] a car.', vi: 'Chúng tôi không có xe hơi.' },
{ title: 'Hỏi về thói quen', ex: '[[Do you walk]] to work?', vi: 'Bạn đi bộ đi làm à?' },
{ title: 'Hỏi về người thứ ba', ex: '[[Does your sister like]] spicy food?', vi: 'Chị bạn có thích đồ cay không?' },
{ title: 'Trả lời ngắn, lịch sự', ex: '"Do they know you?" "Yes, they [[do]]."', vi: 'Họ có biết bạn không? Có.' }
] },
{ type: 'table', head: ['Chủ ngữ', 'Phủ định', 'Câu hỏi', 'Trả lời ngắn'], rows: [
['I / you / we / they', 'don\'t + V', 'Do + S + V?', 'Yes, I do. / No, I don\'t.'],
['he / she / it', 'doesn\'t + V', 'Does + S + V?', 'Yes, he does. / No, he doesn\'t.']
] },
{ type: 'tip', text: 'Chỉ có MỘT chỗ mang -s: trợ động từ does. Khi đã có does / doesn\'t thì động từ chính trở về nguyên mẫu: Does she work? (không phải Does she works?).' },
{ type: 'tip', text: 'Với be thì không dùng do: Are you tired? (không phải Do you tired?). Tiếng Việt chỉ cần lên giọng để hỏi; tiếng Anh phải đưa trợ động từ lên đầu: Do you like tea?' },
{ type: 'mistake', wrong: 'You like coffee?', right: 'Do you like coffee?', why: 'Câu hỏi hiện tại đơn cần Do / Does ở đầu; chỉ lên giọng như tiếng Việt thì chưa chuẩn.' },
{ type: 'mistake', wrong: 'Does she works here?', right: 'Does she work here?', why: 'Does đã mang -s; động từ chính giữ nguyên mẫu.' },
{ type: 'mistake', wrong: 'He don\'t like fish.', right: 'He doesn\'t like fish.', why: 'He đi với doesn\'t; don\'t chỉ dùng với I / you / we / they.' },
{ type: 'mistake', wrong: '"Do you like tea?" "Yes, I like."', right: '"Do you like tea?" "Yes, I do."', why: 'Trả lời ngắn lặp lại trợ động từ do, không lặp động từ chính.' },
{ type: 'ielts', text: 'Giám khảo IELTS Part 1 hay hỏi Do you…? / Does your family…? Trả lời Yes, I do. rồi nói thêm một câu; tránh chỉ đáp Yes.', ex: '"Do you enjoy cooking?" "Yes, I [[do]]. I [[cook]] dinner every night."' }
],
quiz: [
{ q: '___ you speak French?', options: ['Does', 'Are', 'Do', 'Is'], answer: 2, explain: 'You đi với Do. Does dành cho he / she / it; Are và Is là be, không đi với động từ thường speak.' },
{ q: '___ your father work on Sundays?', options: ['Do', 'Does', 'Is', 'Are'], answer: 1, explain: 'Your father = he → Does. Do dành cho I / you / we / they; Is và Are không dùng với động từ work.' },
{ q: 'My cat ___ like milk.', options: ['don\'t', 'isn\'t', 'doesn\'t', 'not'], answer: 2, explain: 'My cat = it → doesn\'t. don\'t dành cho số nhiều; isn\'t cần tính từ phía sau; not đứng một mình thì thiếu trợ động từ.' },
{ q: 'We ___ watch TV in the morning.', options: ['doesn\'t', 'aren\'t', 'don\'t', 'not'], answer: 2, explain: 'We đi với don\'t + nguyên mẫu. doesn\'t dành cho he / she / it; aren\'t không dùng với động từ thường.' },
{ q: 'Does he ___ a car?', options: ['has', 'have', 'having', 'haves'], answer: 1, explain: 'Sau Does động từ giữ nguyên mẫu: have. has đã mang -s (Does đã gánh); having và haves sai.' },
{ q: '"Do you like pizza?" "No, I ___."', options: ['don\'t', 'doesn\'t', 'not', 'don\'t like'], answer: 0, explain: 'Trả lời ngắn: No, I don\'t. doesn\'t sai với I; not thiếu trợ động từ; don\'t like là câu trả lời dài, không phải trả lời ngắn.' },
{ q: '"Does Mai live in Hue?" "Yes, she ___."', options: ['do', 'does', 'is', 'lives'], answer: 1, explain: 'Câu hỏi dùng Does → Yes, she does. do sai với she; is thuộc be; lives không dùng trong trả lời ngắn.' },
{ q: 'Câu nào đúng?', options: ['Do she play the piano?', 'Does she plays the piano?', 'Does she play the piano?', 'She does play the piano?'], answer: 2, explain: 'Does + she + nguyên mẫu: Does she play…? Câu 1 sai trợ động từ, câu 2 giữ -s thừa, câu 4 là câu kể.' },
{ q: 'Câu nào đúng?', options: ['He doesn\'t likes jazz.', 'He doesn\'t like jazz.', 'He don\'t like jazz.', 'He not like jazz.'], answer: 1, explain: 'Sau doesn\'t là nguyên mẫu: like. Câu 1 thừa -s, câu 3 sai trợ động từ, câu 4 thiếu doesn\'t.' },
{ q: 'Câu nào đúng?', options: ['Where you live?', 'Where does you live?', 'Where do you live?', 'Where you do live?'], answer: 2, explain: 'Từ để hỏi + do + chủ ngữ + nguyên mẫu: Where do you live? Câu 2 sai does với you, hai câu còn lại sai trật tự.' },
{ q: 'Phần nào sai? "Does (A) your brother (B) plays (C) the guitar (D)?"', options: ['Does', 'your brother', 'plays', 'the guitar'], answer: 2, explain: 'Sau Does động từ nguyên mẫu: play. Phần sai là (C).' },
{ q: 'Phần nào sai? "My parents (A) doesn\'t (B) eat (C) meat (D)."', options: ['My parents', 'doesn\'t', 'eat', 'meat'], answer: 1, explain: 'My parents = they → don\'t. Phần sai là (B).' }
],
drills: [
{ t: 'rewrite', q: "They live in London. (câu hỏi)", start: "Do", a: ["Do they live in London?"], ex: "Câu hỏi hiện tại đơn: Do + they + live (nguyên mẫu)." },
{ t: 'fill', q: "___ your friends play tennis?", a: ["Do"], ex: 'Your friends = they → Do. Câu hoàn chỉnh: Do your friends play tennis?' },
{ t: 'fill', q: "___ Linh drive to work?", a: ["Does"], ex: 'Linh = she → Does. Câu hoàn chỉnh: Does Linh drive to work?' },
{ t: 'fill', q: "I ___ eat meat. I am vegetarian.", a: ["don't", "do not"], ex: 'I + don\'t + nguyên mẫu. Câu hoàn chỉnh: I don\'t eat meat. I am vegetarian.' },
{ t: 'fill', q: "The shop ___ open on Sundays.", a: ["doesn't", "does not"], ex: 'The shop = it → doesn\'t. Câu hoàn chỉnh: The shop doesn\'t open on Sundays.' },
{ t: 'verb', q: "She doesn't ___ (like) horror films.", a: ["like"], ex: 'Sau doesn\'t là nguyên mẫu like.' },
{ t: 'verb', q: "Does your teacher ___ (speak) Vietnamese?", a: ["speak"], ex: 'Sau Does là nguyên mẫu speak.' },
{ t: 'fill', q: "\"Do you live here?\" \"Yes, I ___.\"", a: ["do"], ex: 'Trả lời ngắn lặp lại do. Câu hoàn chỉnh: "Do you live here?" "Yes, I do."' },
{ t: 'fill', q: "\"Does Tom smoke?\" \"No, he ___.\"", a: ["doesn't", "does not"], ex: 'Does → No, he doesn\'t. Câu hoàn chỉnh: "Does Tom smoke?" "No, he doesn\'t."' },
{ t: 'rewrite', q: "You like spicy food.", start: "Do", a: ["Do you like spicy food?"], ex: 'Thêm Do và đổi thành câu hỏi.' },
{ t: 'rewrite', q: "He plays the guitar.", start: "Does", a: ["Does he play the guitar?"], ex: 'Does + he + play (bỏ -s). Câu hoàn chỉnh: Does he play the guitar?' },
{ t: 'rewrite', q: "My sister likes fish. (phủ định)", start: "My sister", a: ["My sister doesn't like fish.", "My sister does not like fish."], ex: 'Phủ định: doesn\'t + like (bỏ -s). → My sister doesn\'t like fish.' },
{ t: 'combine', q: "I don't like tea. I don't like coffee.", hint: "or", a: ["I don't like tea or coffee.", "I don't like coffee or tea."], ex: 'Trong câu phủ định nối hai danh từ bằng or. → I don\'t like tea or coffee.' },
{ t: 'error', parts: ["Does", "she", "likes", "chocolate?"], w: 2, fix: "like", ex: 'Does đã mang -s nên like giữ nguyên mẫu.' },
{ t: 'error', parts: ["My father", "don't", "drink", "coffee."], w: 1, fix: "doesn't", ex: 'My father = he → doesn\'t. Câu đúng: My father doesn\'t drink coffee.' },
{ t: 'error', parts: ["You speak", "English", "well?"], w: 0, fix: "Do you speak", ex: 'Câu hỏi cần Do: Do you speak English well?' }
]
});

/* A1-6. Đại từ chủ ngữ, tân ngữ & tính từ sở hữu */
put({
id: 'pronouns-a1', unit: 'foundation', order: 19,
title: 'I / me / my: đại từ & tính từ sở hữu', en: 'Pronouns: I / me / my', level: 'A1', emoji: '🧑‍🤝‍🧑',
summary: 'Mỗi người có ba dạng: I (chủ ngữ, trước động từ), me (tân ngữ, sau động từ hoặc giới từ), my (tính từ sở hữu, trước danh từ).',
blocks: [
{ type: 'table', head: ['Chủ ngữ', 'Tân ngữ', 'Tính từ sở hữu', 'Ví dụ'], rows: [
['I', 'me', 'my', 'I love my job. Call me.'],
['you', 'you', 'your', 'Is this your bag?'],
['he', 'him', 'his', 'I know him. His name is Nam.'],
['she', 'her', 'her', 'She likes her teacher.'],
['it', 'it', 'its', 'The dog wags its tail.'],
['we', 'us', 'our', 'Come with us. It\'s our house.'],
['they', 'them', 'their', 'I help them. Their car is new.']
] },
{ type: 'formula', rows: [
{ label: 'Chủ ngữ + động từ', parts: [ { t: 'Chủ ngữ', c: 'subj' }, { t: 'V', c: 'verb' } ], ex: '[[She]] knows Tom.' },
{ label: 'Động từ / giới từ + tân ngữ', parts: [ { t: 'V / giới từ', c: 'verb' }, { t: 'me / him / her / us / them', c: 'obj' } ], ex: 'Tom knows [[her]]. Sit next to [[me]].' },
{ label: 'Tính từ sở hữu + danh từ', parts: [ { t: 'my / your / his…', c: 'adv' }, { t: 'N', c: 'obj' } ], ex: '[[Their]] daughter is eight.' }
] },
{ type: 'uses', items: [
{ title: 'Tránh lặp tên người', ex: 'Lan is a nurse. [[She]] works at night.', vi: 'Lan là y tá. Cô ấy làm ca đêm.' },
{ title: 'Người nhận hành động', ex: 'Please help [[us]].', vi: 'Làm ơn giúp chúng tôi.' },
{ title: 'Nói vật thuộc về ai', ex: '[[My]] phone is on the table.', vi: 'Điện thoại của tôi ở trên bàn.' },
{ title: 'Nói về quan hệ', ex: 'This is [[my]] sister. [[Her]] name is Mai.', vi: 'Đây là chị tôi. Tên chị ấy là Mai.' }
] },
{ type: 'tip', text: 'Tiếng Việt dùng "của" ("điện thoại của tôi") và đổi cách xưng hô theo tuổi tác. Tiếng Anh gọn hơn: chỉ cần my + danh từ; và I / you luôn chỉ có một dạng, không đổi theo người nghe.' },
{ type: 'tip', text: 'Chú ý: her vừa là tân ngữ (I know her) vừa là tính từ sở hữu (her bag). Nhìn vị trí: đứng trước danh từ là sở hữu, đứng sau động từ là tân ngữ. Its (sở hữu) khác it\'s (= it is).' },
{ type: 'mistake', wrong: 'Me am a student.', right: 'I am a student.', why: 'Làm chủ ngữ trước động từ phải dùng I, không dùng me.' },
{ type: 'mistake', wrong: 'Give I the book.', right: 'Give me the book.', why: 'Sau động từ dùng tân ngữ me.' },
{ type: 'mistake', wrong: 'He is my friend. I like he.', right: 'He is my friend. I like him.', why: 'Sau động từ like cần tân ngữ him, không dùng he.' },
{ type: 'mistake', wrong: 'This is I phone. / She love she mother.', right: 'This is my phone. / She loves her mother.', why: 'Trước danh từ dùng tính từ sở hữu my / her; không dùng I hay she.' },
{ type: 'ielts', text: 'Trong IELTS Speaking, chuyển nhanh từ I sang my khi nói về gia đình và nhà cửa cho tự nhiên, thay vì lặp I mãi.', ex: '[[I]] live with [[my]] parents. [[They]] cook for [[me]] every day.' }
],
quiz: [
{ q: '___ am a teacher.', options: ['Me', 'My', 'I', 'Mine'], answer: 2, explain: 'Làm chủ ngữ của am → I. Me là tân ngữ, My là tính từ sở hữu, Mine không đứng trước động từ như vậy.' },
{ q: 'Can you help ___, please?', options: ['I', 'me', 'my', 'mine'], answer: 1, explain: 'Sau động từ help cần tân ngữ: me. I là chủ ngữ; my cần danh từ phía sau.' },
{ q: 'This is Tom. ___ is my brother.', options: ['Him', 'His', 'He', 'He\'s a'], answer: 2, explain: 'Chủ ngữ thay Tom là He. Him là tân ngữ, His cần danh từ; He\'s a thiếu danh từ phía sau.' },
{ q: 'I like Anna. I often talk to ___.', options: ['she', 'her', 'hers', 'herself'], answer: 1, explain: 'Sau giới từ to dùng tân ngữ: her. she là chủ ngữ; hers và herself không phù hợp nghĩa câu.' },
{ q: 'We love ___ new flat.', options: ['we', 'us', 'our', 'ours'], answer: 2, explain: 'Trước danh từ flat cần tính từ sở hữu: our. we / us không đứng trước danh từ để chỉ sở hữu.' },
{ q: 'Mai and Hoa are sisters. ___ parents live in Hue.', options: ['They', 'Them', 'Their', 'Her'], answer: 2, explain: 'Trước danh từ parents cần Their (của họ). They là chủ ngữ; Them là tân ngữ; Her chỉ một người.' },
{ q: 'My dog is old. ___ tail is white.', options: ['It\'s', 'Its', 'Her', 'He'], answer: 1, explain: 'Its là tính từ sở hữu của it. It\'s = it is; her / he không dùng cho con vật theo cách tự nhiên ở đây.' },
{ q: 'Câu nào đúng?', options: ['She love he.', 'Her loves him.', 'She loves him.', 'She loves he.'], answer: 2, explain: 'Chủ ngữ she, sau động từ dùng tân ngữ him. Các câu còn lại sai chủ ngữ, tân ngữ hoặc thiếu -s.' },
{ q: 'Câu nào đúng?', options: ['I phone is new.', 'Me phone is new.', 'My phone is new.', 'Mine phone is new.'], answer: 2, explain: 'Trước danh từ phone dùng my. I, me, mine đều sai vị trí này.' },
{ q: 'Câu nào đúng?', options: ['Their live in London.', 'They live in London.', 'Them live in London.', 'They\'re live in London.'], answer: 1, explain: 'They là chủ ngữ của live. Their là sở hữu; Them là tân ngữ; They\'re live thiếu cấu trúc đúng.' },
{ q: 'Phần nào sai? "Please call (A) I (B) when you (C) arrive (D)."', options: ['call', 'I', 'when you', 'arrive'], answer: 1, explain: 'Sau call cần tân ngữ me. Phần sai là (B).' },
{ q: 'Phần nào sai? "Tom is (A) a good friend, and I like (B) he (C) very much (D)."', options: ['Tom is', 'and I like', 'he', 'very much'], answer: 2, explain: 'Sau like cần tân ngữ him, không dùng he. Phần sai là (C).' }
],
drills: [
{ t: 'rewrite', q: "Tom's sister is a doctor. (thay Tom's bằng his)", start: "His", a: ["His sister is a doctor."], ex: "His là tính từ sở hữu của Tom, đứng trước danh từ sister." },
{ t: 'fill', q: "Ana is my friend. ___ is from Spain.", a: ["She"], ex: 'Chủ ngữ thay Ana là She. Câu hoàn chỉnh: Ana is my friend. She is from Spain.' },
{ t: 'fill', q: "Tom is shy. I often help ___.", a: ["him"], ex: 'Sau help cần tân ngữ him. Câu hoàn chỉnh: Tom is shy. I often help him.' },
{ t: 'fill', q: "We love ___ teacher. She is great.", a: ["our"], ex: 'Trước danh từ teacher dùng our.' },
{ t: 'fill', q: "The students are late, so the teacher is waiting for ___.", a: ["them"], ex: 'Sau giới từ for dùng them. Câu hoàn chỉnh: The students are late, so the teacher is waiting for them.' },
{ t: 'fill', q: "Is this ___ pen? (you)", a: ["your"], ex: 'Trước danh từ pen dùng your.' },
{ t: 'fill', q: "I have a sister. ___ name is Hoa.", a: ["Her"], ex: 'Sở hữu của sister (nữ) là Her.' },
{ t: 'fill', q: "Linh and I are classmates. ___ sit together.", a: ["We"], ex: 'Linh and I = we (chủ ngữ). Câu hoàn chỉnh: Linh and I are classmates. We sit together.' },
{ t: 'rewrite', q: "I like Mr Park. (đổi Mr Park)", start: "I like", a: ["I like him."], ex: 'Mr Park là nam, làm tân ngữ → him.' },
{ t: 'rewrite', q: "The book belongs to my parents. (their)", start: "It is", a: ["It is their book."], ex: 'Dùng their trước danh từ book.' },
{ t: 'rewrite', q: "Mai and Lan are my cousins. (Thay bằng they)", start: "They", a: ["They are my cousins.", "They're my cousins."], ex: 'Thay Mai and Lan bằng They. Câu hoàn chỉnh: They are my cousins.' },
{ t: 'combine', q: "Anna has a brother. The brother is a doctor.", hint: "Her", a: ["Anna has a brother. Her brother is a doctor.", "Anna has a brother and her brother is a doctor.", "Anna has a brother and he is a doctor."], ex: 'Thay Anna\'s bằng her; hoặc thay the brother bằng he. → Anna has a brother. Her brother is a doctor.' },
{ t: 'error', parts: ["Please", "call", "I", "tomorrow."], w: 2, fix: "me", ex: 'Sau call cần tân ngữ me. Câu đúng: Please call me tomorrow.' },
{ t: 'error', parts: ["This is", "he", "bag,", "not mine."], w: 1, fix: "his", ex: 'Trước danh từ bag dùng tính từ sở hữu his.' },
{ t: 'error', parts: ["Me", "name", "is", "Hoa."], w: 0, fix: "My", ex: 'Trước danh từ name cần My. Câu đúng: My name is Hoa.' }
]
});

/* A1-7. this / that / these / those & 's */
put({
id: 'this-that-possessive-a1', unit: 'foundation', order: 20,
title: 'This / that / these / those & sở hữu \'s', en: 'This / That / These / Those and Possessive \'s', level: 'A1', emoji: '👆',
summary: 'This / these chỉ vật gần, that / those chỉ vật xa (số ít → this / that, số nhiều → these / those); \'s sau tên người để chỉ vật thuộc về ai.',
blocks: [
{ type: 'table', head: ['', 'Gần', 'Xa'], rows: [
['Số ít', 'this (cái này)', 'that (cái kia)'],
['Số nhiều', 'these (những cái này)', 'those (những cái kia)']
] },
{ type: 'formula', rows: [
{ label: 'This / That + is + danh từ số ít', parts: [ { t: 'This / That', c: 'subj' }, { t: 'is', c: 'verb' }, { t: 'N (số ít)', c: 'obj' } ], ex: '[[This is]] my bag. [[That\'s]] his car.' },
{ label: 'These / Those + are + danh từ số nhiều', parts: [ { t: 'These / Those', c: 'subj' }, { t: 'are', c: 'verb' }, { t: 'N (số nhiều)', c: 'obj' } ], ex: '[[These are]] my keys. [[Those are]] your shoes.' },
{ label: 'Chủ sở hữu + \'s + danh từ', parts: [ { t: 'Tom\'s', c: 'subj' }, { t: 'N', c: 'obj' } ], ex: 'This is [[Tom\'s]] phone and that is [[my mother\'s]] car.' }
] },
{ type: 'uses', items: [
{ title: 'Giới thiệu ai / cái gì ở gần', ex: '[[This is]] my friend Hoa.', vi: 'Đây là bạn tôi, Hoa.' },
{ title: 'Chỉ vật ở xa', ex: 'Who\'s [[that]] man by the door?', vi: 'Người đàn ông ở cạnh cửa kia là ai?' },
{ title: 'Hỏi giá khi mua hàng', ex: 'How much [[are these]] apples?', vi: 'Những quả táo này bao nhiêu tiền?' },
{ title: 'Nói vật của ai', ex: 'That is [[Lan\'s]] umbrella.', vi: 'Kia là cái ô của Lan.' }
] },
{ type: 'tip', text: 'Giới thiệu người gần bạn dùng This is…: This is my friend Hoa. Khi nghe điện thoại, người Anh nói This is Nam (speaking) để giới thiệu mình, và hỏi lại Who is this?' },
{ type: 'tip', text: '\'s đọc /s/, /z/ hoặc /ɪz/ như số nhiều: Tom\'s, Lan\'s, James\'s. Tiếng Việt đặt chủ sở hữu SAU ("điện thoại của Tom"), tiếng Anh đặt TRƯỚC: Tom\'s phone. Với vật, dùng of: the door of the room.' },
{ type: 'mistake', wrong: 'This are my friends.', right: 'These are my friends.', why: 'Friends là số nhiều → these / those, và đi với are.' },
{ type: 'mistake', wrong: 'Those is my book.', right: 'That is my book.', why: 'Book số ít; those là số nhiều. Dùng that / this với is.' },
{ type: 'mistake', wrong: 'This is the phone of Tom.', right: 'This is Tom\'s phone.', why: 'Với người, tiếng Anh dùng \'s và đặt tên người trước danh từ.' },
{ type: 'mistake', wrong: 'This is Tom phone.', right: 'This is Tom\'s phone.', why: 'Thiếu \'s thì chưa chỉ ra Tom là chủ sở hữu.' },
{ type: 'ielts', text: 'Trong Speaking Part 2, mô tả ảnh hay đồ vật: this / that giúp bạn chỉ rõ vật nào, và \'s giúp nói ai sở hữu.', ex: '[[This is]] my grandfather\'s watch. [[These are]] my cousins\' toys.' }
],
quiz: [
{ q: '___ is my brother, next to me.', options: ['That', 'This', 'These', 'Those'], answer: 1, explain: 'Một người ở gần: This is… Those và These là số nhiều; That chỉ người ở xa.' },
{ q: '___ shoes over there are expensive.', options: ['This', 'That', 'These', 'Those'], answer: 3, explain: 'Shoes là số nhiều và ở xa (over there) → Those. This / That là số ít; These chỉ vật ở gần.' },
{ q: '___ are my keys. Here they are.', options: ['This', 'That', 'These', 'Those'], answer: 2, explain: 'Keys số nhiều, đang cầm ở gần → These. This / That chỉ số ít; Those chỉ vật xa.' },
{ q: 'Look at ___ tree over there!', options: ['this', 'that', 'these', 'those'], answer: 1, explain: 'Tree số ít, ở xa (over there) → that. This gần; these / those là số nhiều.' },
{ q: 'Is ___ your umbrella here on the chair?', options: ['these', 'those', 'this', 'that\'s'], answer: 2, explain: 'Umbrella số ít, ở gần → this. These / those là số nhiều; that\'s thừa is trong cấu trúc hỏi.' },
{ q: 'This is ___ bicycle.', options: ['Anna', 'Anna\'s', 'of Anna', 'Annas'], answer: 1, explain: 'Chủ sở hữu + \'s + danh từ: Anna\'s bicycle. Anna thiếu \'s; of Anna sai trật tự; Annas là số nhiều.' },
{ q: 'Đây là sách của bố mẹ tôi: These are my ___ books.', options: ['parent', 'parents', 'parent\'s', 'parents\''], answer: 3, explain: 'Bố mẹ (số nhiều có -s) → thêm dấu nháy đơn: parents\' books. parent\'s chỉ sách của một người; parent và parents không chỉ sở hữu.' },
{ q: 'Câu nào đúng?', options: ['This are my shoes.', 'These is my shoes.', 'These are my shoes.', 'Those is my shoes.'], answer: 2, explain: 'Shoes số nhiều → These are… Các câu khác sai hòa hợp giữa this/these và is/are.' },
{ q: 'Câu nào đúng?', options: ['That is Lan\'s room.', 'That is the room of Lan.', 'That is Lan room.', 'That Lan\'s is room.'], answer: 0, explain: 'Với người dùng \'s: Lan\'s room. Câu 2 không tự nhiên với người; câu 3 thiếu \'s; câu 4 sai trật tự.' },
{ q: 'Câu nào đúng?', options: ['How much is these oranges?', 'How much are these oranges?', 'How much are this oranges?', 'How much is this oranges?'], answer: 1, explain: 'Oranges số nhiều → are these oranges. Các câu khác sai hòa hợp.' },
{ q: 'Phần nào sai? "That (A) are (B) my teacher\'s (C) books (D)."', options: ['That', 'are', 'my teacher\'s', 'books'], answer: 0, explain: 'Are và books đều số nhiều, nên That phải đổi thành Those: Those are my teacher\'s books. Phần sai là (A).' },
{ q: 'Phần nào sai? "This is (A) my sister (B) friend (C) Hoa (D)."', options: ['This is', 'my sister', 'friend', 'Hoa'], answer: 1, explain: 'Cần sở hữu: my sister\'s friend. Phần sai là (B) vì thiếu \'s.' }
],
drills: [
{ t: 'rewrite', q: "This is Lan's umbrella. (số nhiều)", start: "These", a: ["These are Lan's umbrellas."], ex: "Số nhiều: these + are + danh từ số nhiều umbrellas." },
{ t: 'rewrite', q: "That is my brother's room. (câu hỏi)", start: "Is", a: ["Is that my brother's room?"], ex: "Đưa is lên trước chủ ngữ that để hỏi." },
{ t: 'fill', q: "___ is my cup. (gần, số ít)", a: ["This"], ex: 'Vật số ít ở gần → This. Câu hoàn chỉnh: This is my cup.' },
{ t: 'fill', q: "___ are my parents. (gần, số nhiều)", a: ["These"], ex: 'Số nhiều ở gần → These. Câu hoàn chỉnh: These are my parents.' },
{ t: 'fill', q: "Who is ___ girl over there?", a: ["that"], ex: 'Một người ở xa → that. Câu hoàn chỉnh: Who is that girl over there?' },
{ t: 'fill', q: "How much are ___ trousers in the window? (xa)", a: ["those"], ex: 'Trousers số nhiều, ở xa → those.' },
{ t: 'fill', q: "This is my ___ house. (my grandmother)", a: ["grandmother's"], ex: 'Chủ sở hữu + \'s: my grandmother\'s house.' },
{ t: 'fill', q: "These are the ___ toys. (children)", a: ["children's"], ex: 'Children là số nhiều bất quy tắc, không có -s nên thêm \'s.' },
{ t: 'verb', q: "That ___ (be) my teacher over there.", a: ["is"], ex: 'That số ít → is. Câu hoàn chỉnh: That is my teacher over there.' },
{ t: 'verb', q: "Those ___ (be) my friends.", a: ["are"], ex: 'Those số nhiều → are. Câu hoàn chỉnh: Those are my friends.' },
{ t: 'rewrite', q: "This book is Tom's. (these)", start: "These", a: ["These books are Tom's."], ex: 'Đổi sang số nhiều: these books are. → These books are Tom\'s.' },
{ t: 'rewrite', q: "That is Lan's bag. (hỏi)", start: "Is", a: ["Is that Lan's bag?"], ex: 'Đưa is lên trước that. Câu hoàn chỉnh: Is that Lan\'s bag?' },
{ t: 'combine', q: "This is Hoa. Hoa is my sister's friend.", hint: "friend", a: ["This is Hoa, my sister's friend.", "This is my sister's friend, Hoa.", "This is my sister's friend Hoa."], ex: 'Dùng \'s: my sister\'s friend.' },
{ t: 'error', parts: ["This", "are", "my", "new shoes."], w: 0, fix: "These", ex: 'Shoes số nhiều → These are. Câu đúng: These are my new shoes.' },
{ t: 'error', parts: ["That", "is", "Tom", "phone."], w: 2, fix: "Tom's", ex: 'Cần \'s để chỉ sở hữu. Câu đúng: That is Tom\'s phone.' },
{ t: 'error', parts: ["Those", "is", "my", "book."], w: 0, fix: "That", ex: 'Book số ít: That is my book.' }
]
});

/* A1-8. have (got) & there is / there are */
put({
id: 'have-got-there-is', unit: 'foundation', order: 21,
title: 'Have (got) & There is / There are', en: 'Have (got) and There is / There are', level: 'A1', emoji: '🏠',
summary: 'Have / have got nói ai SỞ HỮU gì; there is / there are nói CÓ gì ở đâu. Tiếng Việt dùng chung một chữ "có" cho cả hai, tiếng Anh thì không.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Sở hữu: S + have / has (got) + N', parts: [ { t: 'S', c: 'subj' }, { t: 'have / has (got)', c: 'verb' }, { t: 'N', c: 'obj' } ], ex: 'I [[have]] two sisters. She [[has got]] a new laptop.' },
{ label: 'Hiện hữu: There is + số ít / There are + số nhiều', parts: [ { t: 'There is / are', c: 'subj' }, { t: 'N', c: 'obj' }, { t: 'nơi chốn', c: 'adv' } ], ex: '[[There is]] a bank near here. [[There are]] three chairs in the room.' },
{ label: 'Phủ định & hỏi', parts: [ { t: 'There isn\'t / aren\'t', c: 'neg' }, { t: 'Is / Are there…?', c: 'aux' } ], ex: '[[Is there]] a shop nearby? No, [[there isn\'t]].' }
] },
{ type: 'table', head: ['', 'Phủ định', 'Câu hỏi'], rows: [
['have (got)', 'don\'t have / haven\'t got', 'Do you have…? / Have you got…?'],
['has (got)', 'doesn\'t have / hasn\'t got', 'Does she have…? / Has she got…?'],
['there is / are', 'there isn\'t / aren\'t', 'Is / Are there…?']
] },
{ type: 'uses', items: [
{ title: 'Nói mình có gì (đồ vật, người thân)', ex: 'We [[have]] a small garden.', vi: 'Nhà tôi có một khu vườn nhỏ.' },
{ title: 'Mô tả đặc điểm, ngoại hình', ex: 'He [[has got]] short black hair.', vi: 'Anh ấy có mái tóc đen ngắn.' },
{ title: 'Nói ở đâu có gì', ex: '[[There\'s]] a café opposite the station.', vi: 'Đối diện nhà ga có một quán cà phê.' },
{ title: 'Hỏi nơi nào có gì', ex: '[[Are there]] any parks in your town?', vi: 'Thị trấn bạn có công viên nào không?' }
] },
{ type: 'tip', text: 'Have got = have trong nghĩa sở hữu, thường dùng trong tiếng Anh-Anh khi nói. Cả hai đều đúng: I have a car = I\'ve got a car. Have got chia như have: has got với he / she / it, nhưng không dùng quá khứ như nghĩa này.' },
{ type: 'tip', text: 'There is / are hòa hợp với danh từ đứng ngay sau: There is a cat and two dogs. Nơi chốn thường đứng cuối câu: There is a bed in my room. Khi nói nhanh, người ta dùng There\'s cho số ít.' },
{ type: 'mistake', wrong: 'In my room has a bed.', right: 'There is a bed in my room.', why: 'Tiếng Việt "Trong phòng có…" cần there is trong tiếng Anh; have chỉ dùng khi chủ ngữ SỞ HỮU một thứ.' },
{ type: 'mistake', wrong: 'Have a bank near my house.', right: 'There is a bank near my house.', why: 'Không có chủ ngữ thì tiếng Anh cần There làm chủ ngữ giả.' },
{ type: 'mistake', wrong: 'There is two chairs in the kitchen.', right: 'There are two chairs in the kitchen.', why: 'Chairs số nhiều → there are.' },
{ type: 'mistake', wrong: 'Do you got a pen?', right: 'Have you got a pen? / Do you have a pen?', why: 'Have got dùng have đảo lên đầu câu hỏi; do chỉ đi với have (không got).' },
{ type: 'ielts', text: 'Mô tả nhà, thành phố, bức tranh trong IELTS Speaking: There is / There are giới thiệu từng thứ trong khung cảnh; have (got) nói người sở hữu gì.', ex: '[[There are]] many shops in my town. [[It has]] a big market.' }
],
quiz: [
{ q: 'I ___ two brothers.', options: ['am', 'has', 'have', 'there are'], answer: 2, explain: 'I sở hữu hai người anh em → have. has chỉ đi với he / she / it; am thuộc be; there are không có chủ ngữ I.' },
{ q: 'She ___ got a new bike.', options: ['have', 'has', 'is', 'does'], answer: 1, explain: 'She + has got. have sai ngôi; is và does không đi với got.' },
{ q: '___ a park near my school.', options: ['It is', 'There is', 'There are', 'Have'], answer: 1, explain: 'Hiện hữu số ít: There is a park. It is chỉ vật đã biết; There are cho số nhiều; Have cần chủ ngữ sở hữu.' },
{ q: '___ three eggs in the fridge.', options: ['There is', 'There are', 'It is', 'Have'], answer: 1, explain: 'Three eggs số nhiều → There are. There is cho số ít; It is và Have không phù hợp.' },
{ q: '___ any milk in the cup?', options: ['Are there', 'Is there', 'Have you', 'Does there'], answer: 1, explain: 'Milk không đếm được → Is there. Are there cho số nhiều; Have you và Does there sai cấu trúc.' },
{ q: 'There ___ a lift in the building.', options: ['isn\'t', 'aren\'t', 'doesn\'t', 'hasn\'t'], answer: 0, explain: 'Số ít phủ định: there isn\'t. aren\'t cho số nhiều; doesn\'t và hasn\'t không đi với there.' },
{ q: '___ you got a pen?', options: ['Do', 'Have', 'Are', 'Does'], answer: 1, explain: 'Have got → câu hỏi bắt đầu bằng Have. Do chỉ dùng với have, không có got; Are và Does sai.' },
{ q: 'Câu nào đúng?', options: ['In the garden has a tree.', 'There is a tree in the garden.', 'There has a tree in the garden.', 'Is a tree in the garden.'], answer: 1, explain: 'Có thứ gì ở đâu → There is a tree in the garden. Câu 1 và 3 dùng have sai, câu 4 thiếu There.' },
{ q: 'Câu nào đúng?', options: ['My father has got a car.', 'My father have got a car.', 'My father has a got car.', 'My father is got a car.'], answer: 0, explain: 'My father = he → has got. Câu 2 sai ngôi; câu 3 sai trật tự; câu 4 sai động từ.' },
{ q: 'Câu nào đúng?', options: ['There is five students.', 'There are five students.', 'There have five students.', 'They are five students there.'], answer: 1, explain: 'Five students số nhiều → There are. There is sai hòa hợp; there have không tồn tại; câu 4 không giới thiệu "có" tự nhiên.' },
{ q: 'Phần nào sai? "In my class (A) has (B) twenty (C) students (D)."', options: ['In my class', 'has', 'twenty', 'students'], answer: 1, explain: 'Cần There are: There are twenty students in my class. Phần sai là (B).' },
{ q: 'Phần nào sai? "Has (A) your sister (B) get (C) a laptop (D)?"', options: ['Has', 'your sister', 'get', 'a laptop'], answer: 2, explain: 'Cấu trúc là have got: Has your sister got a laptop? Phần sai là (C): got, không phải get.' }
],
drills: [
{ t: 'rewrite', q: "There is a bank near here. (phủ định)", start: "There", a: ["There isn't a bank near here.","There is not a bank near here."], ex: "Phủ định: There isn't + a bank (số ít)." },
{ t: 'fill', q: "We ___ a big family.", a: ["have"], ex: 'We + have (sở hữu). Câu hoàn chỉnh: We have a big family.' },
{ t: 'fill', q: "My teacher ___ a red car.", a: ["has"], ex: 'My teacher = she / he (ngôi thứ ba số ít) → has.' },
{ t: 'fill', q: "There ___ a hotel on this street.", a: ["is"], ex: 'A hotel số ít → There is. Câu hoàn chỉnh: There is a hotel on this street.' },
{ t: 'fill', q: "There ___ many people in the square.", a: ["are"], ex: 'Many people số nhiều → There are.' },
{ t: 'fill', q: "___ there a bank near here?", a: ["Is"], ex: 'Số ít → Is there. Câu hoàn chỉnh: Is there a bank near here?' },
{ t: 'fill', q: "There ___ any shops in my village.", a: ["aren't", "are not"], ex: 'Shops số nhiều, phủ định: aren\'t any.' },
{ t: 'verb', q: "Lan ___ (have got) long hair.", a: ["has got", "'s got"], ex: 'Lan = she → has got. Câu hoàn chỉnh: Lan has got long hair.' },
{ t: 'rewrite', q: "I have a bike. (have got)", start: "I", a: ["I have got a bike.", "I've got a bike."], ex: 'Have = have got. Câu hoàn chỉnh: I have got a bike.' },
{ t: 'rewrite', q: "A cat is under the table.", start: "There", a: ["There is a cat under the table.", "There's a cat under the table."], ex: 'Có + vật + nơi chốn = There is… → There is a cat under the table.' },
{ t: 'rewrite', q: "There are some chairs. (câu hỏi)", start: "Are", a: ["Are there any chairs?", "Are there some chairs?"], ex: 'Câu hỏi: Are there…? Câu hoàn chỉnh: Are there any chairs?' },
{ t: 'combine', q: "I have a small flat. There are two bedrooms in it.", hint: "with", a: ["I have a small flat with two bedrooms.", "I have a small flat with two bedrooms in it."], ex: 'Nối bằng with: a flat with two bedrooms. → I have a small flat with two bedrooms.' },
{ t: 'error', parts: ["In the room", "has", "a table", "and two chairs."], w: 1, fix: "there is", ex: 'Hiện hữu nơi chốn: There is a table and two chairs in the room.' },
{ t: 'error', parts: ["Does", "he", "got", "a car?"], w: 0, fix: "Has", ex: 'Have got: Has he got a car? Câu đúng: Has he got a car?' },
{ t: 'error', parts: ["There", "is", "three", "windows."], w: 1, fix: "are", ex: 'Three windows số nhiều → there are.' }
]
});

/* A1-9. can / can't: khả năng, xin phép, nhờ */
put({
id: 'can-a1', unit: 'foundation', order: 22,
title: 'Can / can\'t: khả năng, xin phép, nhờ vả', en: 'Can / Can\'t: Ability, Permission and Requests', level: 'A1', emoji: '💪',
summary: 'Can + động từ nguyên mẫu nói khả năng (I can swim); Can I…? xin phép; Can you…? nhờ ai làm gì. Can không thêm -s, không có to.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Khẳng định: S + can + V', parts: [ { t: 'S', c: 'subj' }, { t: 'can', c: 'aux' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: 'My sister [[can speak]] three languages.' },
{ label: 'Phủ định: S + can\'t / cannot + V', parts: [ { t: 'S', c: 'subj' }, { t: 'can\'t', c: 'neg' }, { t: 'V', c: 'verb' } ], ex: 'I [[can\'t swim]], but I can run.' },
{ label: 'Câu hỏi: Can + S + V?', parts: [ { t: 'Can', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V', c: 'verb' } ], ex: '[[Can you play]] the guitar?' }
] },
{ type: 'uses', items: [
{ title: 'Nói mình biết / làm được gì', ex: 'He [[can cook]] very well.', vi: 'Anh ấy nấu ăn rất giỏi.' },
{ title: 'Xin phép (Can I…?)', ex: '[[Can I open]] the window?', vi: 'Tôi mở cửa sổ được không?' },
{ title: 'Nhờ ai làm giúp (Can you…?)', ex: '[[Can you help]] me, please?', vi: 'Bạn giúp tôi được không?' },
{ title: 'Nói việc không được làm', ex: 'You [[can\'t park]] here.', vi: 'Bạn không được đỗ xe ở đây.' }
] },
{ type: 'table', head: ['Mục đích', 'Câu', 'Trả lời'], rows: [
['Khả năng', 'Can you swim?', 'Yes, I can. / No, I can\'t.'],
['Xin phép', 'Can I sit here?', 'Sure. / Sorry, it\'s taken.'],
['Nhờ vả', 'Can you open the door?', 'Of course. / Sorry, I can\'t.']
] },
{ type: 'tip', text: 'Can là động từ khuyết thiếu: mọi chủ ngữ đều dùng can (he can, she can), sau can là nguyên mẫu không to, và câu hỏi chỉ cần đảo can lên đầu — không cần do / does.' },
{ type: 'tip', text: 'Lịch sự hơn: Could you open the door, please? Could là dạng quá khứ của can, ở đây dùng để nhờ lịch sự; Can vẫn tự nhiên với bạn bè, người thân, nơi mua sắm.' },
{ type: 'mistake', wrong: 'I can to swim.', right: 'I can swim.', why: 'Sau can là nguyên mẫu KHÔNG có to.' },
{ type: 'mistake', wrong: 'She cans speak English.', right: 'She can speak English.', why: 'Can không thêm -s dù chủ ngữ là she.' },
{ type: 'mistake', wrong: 'Do you can swim?', right: 'Can you swim?', why: 'Can đã là trợ động từ; không dùng do với can.' },
{ type: 'mistake', wrong: 'He can swimming. / I can\'t not go.', right: 'He can swim. / I can\'t go.', why: 'Sau can là nguyên mẫu, không -ing; can\'t đã mang nghĩa phủ định nên không thêm not.' },
{ type: 'ielts', text: 'Speaking Part 1 hỏi về kỹ năng (Can you cook? Can you play an instrument?). Trả lời bằng can / can\'t rồi thêm ví dụ.', ex: 'Yes, I [[can]]. I [[can cook]] fried rice and soup, but I [[can\'t bake]].' }
],
quiz: [
{ q: 'My brother ___ play the piano.', options: ['cans', 'can', 'is can', 'cans to'], answer: 1, explain: 'Can không thêm -s: He can play. cans và cans to sai; is can sai vì can đã là trợ động từ.' },
{ q: 'I can ___ a bike.', options: ['to ride', 'riding', 'rides', 'ride'], answer: 3, explain: 'Sau can là nguyên mẫu không to: ride. to ride, riding và rides đều sai.' },
{ q: '___ you swim?', options: ['Do', 'Are', 'Does', 'Can'], answer: 3, explain: 'Câu hỏi về khả năng: Can you swim? Do / Does / Are không đi với can theo cách này.' },
{ q: 'She ___ drive. She is only fourteen.', options: ['can', 'can\'t', 'doesn\'t', 'not'], answer: 1, explain: 'Mười bốn tuổi chưa lái xe được → can\'t. can ngược nghĩa; doesn\'t và not không đứng trực tiếp trước drive để thành câu đúng.' },
{ q: '"Can I borrow your pen?" "Yes, ___."', options: ['you can', 'you do', 'you are', 'I can'], answer: 0, explain: 'Người hỏi nói Can I…, người đáp nói Yes, you can. you do / you are không phải trả lời ngắn cho can; I can sai ngôi.' },
{ q: '"Can you help me?" "Sorry, I ___."', options: ['don\'t', 'can\'t', 'am not', 'doesn\'t'], answer: 1, explain: 'Trả lời ngắn lặp lại can → I can\'t. don\'t / am not / doesn\'t không đúng cấu trúc.' },
{ q: 'Câu nào đúng?', options: ['He can speaks French.', 'He cans speak French.', 'He can speak French.', 'He can to speak French.'], answer: 2, explain: 'Can + nguyên mẫu: can speak. Các câu khác thêm -s, to hoặc cans sai. → câu đúng: He can speak French.' },
{ q: 'Câu nào đúng?', options: ['Can he swims?', 'Does he can swim?', 'Can he swim?', 'He can swim?'], answer: 2, explain: 'Đảo can lên đầu, động từ nguyên mẫu. Câu 1 thừa -s, câu 2 sai do, câu 4 thiếu đảo. → câu đúng: Can he swim?.' },
{ q: 'Câu nào đúng?', options: ['I can\'t not see you.', 'I not can see you.', 'I can\'t see you.', 'I don\'t can see you.'], answer: 2, explain: 'Phủ định: can\'t + nguyên mẫu. Các câu khác thừa not hoặc sai vị trí. → câu đúng: I can\'t see you.' },
{ q: 'Câu nào nhờ ai giúp?', options: ['Can I help you?', 'Can you help me?', 'I can help you.', 'You can help.'], answer: 1, explain: 'Nhờ ai làm gì cho mình: Can you…? Câu 1 là lời đề nghị giúp, câu 3 là lời nói mình có thể giúp, câu 4 là câu kể.' },
{ q: 'Phần nào sai? "She (A) can (B) cooking (C) very well (D)."', options: ['She', 'can', 'cooking', 'very well'], answer: 2, explain: 'Sau can là nguyên mẫu: cook. Phần sai là (C).' },
{ q: 'Phần nào sai? "Can (A) she (B) plays (C) the guitar (D)?"', options: ['Can', 'she', 'plays', 'the guitar'], answer: 2, explain: 'Sau can là nguyên mẫu: play. Phần sai là (C).' }
],
drills: [
{ t: 'rewrite', q: "I can swim. (hỏi bạn)", start: "Can", a: ["Can you swim?"], ex: "Hỏi khả năng: Can + you + swim." },
{ t: 'fill', q: "I ___ speak Spanish, but I can speak English.", a: ["can't", "cannot"], ex: 'Phủ định: can\'t / cannot. Câu hoàn chỉnh: I can\'t speak Spanish, but I can speak English.' },
{ t: 'fill', q: "She can ___ very fast. (run)", a: ["run"], ex: 'Sau can là nguyên mẫu run. Câu hoàn chỉnh: She can run very fast.' },
{ t: 'fill', q: "___ I use your phone?", a: ["Can"], ex: 'Xin phép: Can I…? Câu hoàn chỉnh: Can I use your phone?' },
{ t: 'fill', q: "___ you please close the door?", a: ["Can"], ex: 'Nhờ ai: Can you…? Câu hoàn chỉnh: Can you please close the door?' },
{ t: 'fill', q: "\"Can you cook?\" \"Yes, I ___.\"", a: ["can"], ex: 'Trả lời ngắn lặp lại can. Câu hoàn chỉnh: "Can you cook?" "Yes, I can."' },
{ t: 'fill', q: "\"Can he swim?\" \"No, he ___.\"", a: ["can't", "cannot"], ex: 'No, he can\'t. Câu hoàn chỉnh: "Can he swim?" "No, he can\'t."' },
{ t: 'rewrite', q: "You speak English. (Can)", start: "Can", a: ["Can you speak English?"], ex: 'Đảo can lên đầu. Câu hoàn chỉnh: Can you speak English?' },
{ t: 'rewrite', q: "My dad can drive. (phủ định)", start: "My dad", a: ["My dad can't drive.", "My dad cannot drive."], ex: 'Phủ định: can\'t / cannot + nguyên mẫu. → My dad can\'t drive.' },
{ t: 'rewrite', q: "I am able to swim. (can)", start: "I", a: ["I can swim."], ex: 'Can = be able to ở nghĩa khả năng. → I can swim.' },
{ t: 'combine', q: "Tom can play the guitar. Tom can sing.", hint: "and", a: ["Tom can play the guitar and sing.", "Tom can play the guitar and he can sing.", "Tom can sing and play the guitar."], ex: 'Hai động từ dùng chung can, nối bằng and.' },
{ t: 'error', parts: ["She", "can", "to cook", "Italian food."], w: 2, fix: "cook", ex: 'Sau can không có to. Câu đúng: She can cook Italian food.' },
{ t: 'error', parts: ["Can", "you", "swimming", "very fast?"], w: 2, fix: "swim", ex: 'Sau can là nguyên mẫu swim. Câu đúng: Can you swim very fast?' },
{ t: 'error', parts: ["He", "cans", "speak", "German."], w: 1, fix: "can", ex: 'Can không thêm -s. Câu đúng: He can speak German.' }
]
});

/* A1-10. Câu mệnh lệnh & Let's */
put({
id: 'imperatives-lets-a1', unit: 'foundation', order: 23,
title: 'Câu mệnh lệnh & Let\'s', en: 'Imperatives and Let\'s', level: 'A1', emoji: '📢',
summary: 'Câu mệnh lệnh dùng động từ nguyên mẫu, không cần chủ ngữ (Open the door); thêm please cho lịch sự, don\'t để cấm; Let\'s + V để rủ cùng làm.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Khẳng định: V + …', parts: [ { t: 'V (nguyên mẫu)', c: 'verb' }, { t: '…', c: 'obj' } ], ex: '[[Open]] your books. [[Come]] in.' },
{ label: 'Phủ định: Don\'t + V', parts: [ { t: 'Don\'t', c: 'neg' }, { t: 'V', c: 'verb' }, { t: '…', c: 'obj' } ], ex: '[[Don\'t touch]] that! [[Don\'t be]] late.' },
{ label: 'Rủ rê: Let\'s (not) + V', parts: [ { t: 'Let\'s', c: 'aux' }, { t: 'V', c: 'verb' }, { t: '…', c: 'obj' } ], ex: '[[Let\'s have]] lunch. [[Let\'s not wait]].' }
] },
{ type: 'uses', items: [
{ title: 'Chỉ dẫn, hướng dẫn', ex: '[[Turn]] left at the bank.', vi: 'Rẽ trái ở ngân hàng.' },
{ title: 'Yêu cầu lịch sự (thêm please)', ex: '[[Please sit]] down. / [[Sit]] down, [[please]].', vi: 'Xin mời ngồi.' },
{ title: 'Cấm đoán, cảnh báo', ex: '[[Don\'t run]] in the corridor.', vi: 'Đừng chạy trong hành lang.' },
{ title: 'Rủ ai cùng làm', ex: '[[Let\'s go]] to the beach!', vi: 'Mình đi biển đi!' },
{ title: 'Nói người mình gọi', ex: '[[Lan, wait]] for me!', vi: 'Lan, đợi tôi với!' }
] },
{ type: 'tip', text: 'Câu mệnh lệnh ngắn rất mạnh. Bạn bè thân dùng được, còn với người lạ hoặc người lớn hơn, hãy thêm Please hoặc chuyển sang Can you…? / Could you…?' },
{ type: 'tip', text: 'Let\'s = let us. Phủ định là Let\'s not + V (không phải Don\'t let\'s). Đáp lại: Good idea! / Sure! / Sorry, I can\'t. Hỏi lại: Shall we…? (Shall we go?)' },
{ type: 'mistake', wrong: 'Please to open the window.', right: 'Please open the window.', why: 'Sau please vẫn là nguyên mẫu không to; mệnh lệnh không cần chủ ngữ you.' },
{ type: 'mistake', wrong: 'Don\'t to touch it.', right: 'Don\'t touch it.', why: 'Sau don\'t là nguyên mẫu không to.' },
{ type: 'mistake', wrong: 'Let\'s to go home.', right: 'Let\'s go home.', why: 'Sau let\'s là nguyên mẫu không to.' },
{ type: 'mistake', wrong: 'Let\'s going to the cinema.', right: 'Let\'s go to the cinema.', why: 'Sau let\'s dùng nguyên mẫu, không -ing.' },
{ type: 'ielts', text: 'Trong bài Speaking có yêu cầu đóng vai hay chỉ đường, dùng mệnh lệnh có please và first, then, next để hướng dẫn rõ, lịch sự.', ex: '[[Go]] straight on, [[then turn]] right. [[Please don\'t forget]] your ticket.' }
],
quiz: [
{ q: '___ your hands before lunch.', options: ['Washing', 'You wash', 'Wash', 'To wash'], answer: 2, explain: 'Mệnh lệnh dùng nguyên mẫu: Wash. Washing và To wash không dùng cho lệnh; You wash nghe không phải mệnh lệnh chuẩn.' },
{ q: '___ the door, please. It\'s cold.', options: ['Closing', 'Close', 'Closed', 'To close'], answer: 1, explain: 'Nguyên mẫu Close. Closing, Closed, To close không đúng cho mệnh lệnh.' },
{ q: '___ late for the exam!', options: ['Not be', 'Don\'t be', 'No be', 'Be not'], answer: 1, explain: 'Phủ định mệnh lệnh: Don\'t + V → Don\'t be late. Các dạng còn lại không chuẩn.' },
{ q: '___ forget your passport.', options: ['Don\'t', 'Not', 'No', 'Doesn\'t'], answer: 0, explain: 'Don\'t + nguyên mẫu: Don\'t forget. Not / No / Doesn\'t không dùng ở đầu mệnh lệnh phủ định.' },
{ q: '___ go to the park!', options: ['Let', 'Let\'s', 'Lets to', 'We let'], answer: 1, explain: 'Rủ cùng làm: Let\'s go. Let thiếu us; Lets to và We let sai cấu trúc.' },
{ q: 'It\'s raining. Let\'s ___ outside.', options: ['not go', 'don\'t go', 'not to go', 'no go'], answer: 0, explain: 'Phủ định của let\'s là Let\'s not + V. don\'t go và not to go sai.' },
{ q: '"Let\'s have pizza tonight." "___"', options: ['Good idea!', 'Yes, I let.', 'You are welcome.', 'I am fine.'], answer: 0, explain: 'Đồng ý với lời rủ: Good idea! Các câu còn lại không trả lời đúng lời đề nghị.' },
{ q: 'Câu nào đúng?', options: ['Don\'t to run here.', 'Don\'t run here.', 'Not run here.', 'Don\'t you run here.'], answer: 1, explain: 'Don\'t + nguyên mẫu. Các câu khác thừa to, thiếu don\'t hoặc không phải mệnh lệnh chuẩn. → câu đúng: Don\'t run here.' },
{ q: 'Câu nào đúng?', options: ['Let\'s going home.', 'Let\'s go home.', 'Let\'s to go home.', 'Let\'s goes home.'], answer: 1, explain: 'Let\'s + nguyên mẫu: Let\'s go. Các câu còn lại sai dạng động từ. → câu đúng: Let\'s go home.' },
{ q: 'Câu nào lịch sự nhất khi nói với người lạ?', options: ['Give me that pen.', 'Pen!', 'Could you give me that pen, please?', 'You give me the pen.'], answer: 2, explain: 'Could you… please là cách nhờ lịch sự. Các câu còn lại cộc, bất lịch sự với người lạ.' },
{ q: 'Phần nào sai? "Please (A) don\'t (B) to (C) shout (D)."', options: ['Please', 'don\'t', 'to', 'shout'], answer: 2, explain: 'Sau don\'t là nguyên mẫu không to. Phần sai là (C).' },
{ q: 'Phần nào sai? "Let\'s (A) to (B) meet (C) at six (D)."', options: ['Let\'s', 'to', 'meet', 'at six'], answer: 1, explain: 'Let\'s meet… không có to. Phần sai là (B).' }
],
drills: [
{ t: 'rewrite', q: "You must not run in the corridor. (Don't)", start: "Don't", a: ["Don't run in the corridor."], ex: "Cấm đoán: Don't + nguyên mẫu, bỏ chủ ngữ you." },
{ t: 'fill', q: "___ quiet in the library! (be)", a: ["Be"], ex: 'Mệnh lệnh với be: Be quiet. Câu hoàn chỉnh: Be quiet in the library!' },
{ t: 'fill', q: "___ me your name, please. (tell)", a: ["Tell"], ex: 'Nguyên mẫu Tell. Câu hoàn chỉnh: Tell me your name, please.' },
{ t: 'fill', q: "___ eat in the lab. (cấm)", a: ["Don't", "Do not"], ex: 'Cấm: Don\'t + V. Câu hoàn chỉnh: Don\'t eat in the lab.' },
{ t: 'fill', q: "___ play football after school! (rủ)", a: ["Let's"], ex: 'Let\'s + nguyên mẫu. Câu hoàn chỉnh: Let\'s play football after school!' },
{ t: 'fill', q: "It is late. Let's ___ a taxi. (take)", a: ["take"], ex: 'Sau let\'s là nguyên mẫu. Câu hoàn chỉnh: It is late. Let\'s take a taxi.' },
{ t: 'verb', q: "___ (not / open) the box. It's fragile.", a: ["Don't open", "Do not open"], ex: 'Don\'t + open. Câu hoàn chỉnh: Don\'t open the box. It\'s fragile.' },
{ t: 'rewrite', q: "You must sit down. (lệnh lịch sự)", start: "Please", a: ["Please sit down."], ex: 'Bỏ you must; dùng Please + V.' },
{ t: 'rewrite', q: "I want you to be quiet. (mệnh lệnh)", start: "Be", a: ["Be quiet.", "Be quiet, please."], ex: 'Mệnh lệnh: Be quiet. Câu hoàn chỉnh: Be quiet.' },
{ t: 'rewrite', q: "Why don't we eat out tonight? (Let's)", start: "Let's", a: ["Let's eat out tonight."], ex: 'Rủ cùng làm: Let\'s eat out. Câu hoàn chỉnh: Let\'s eat out tonight.' },
{ t: 'combine', q: "Take the first road. Turn left.", hint: "then", a: ["Take the first road, then turn left.", "Take the first road and then turn left.", "Take the first road then turn left."], ex: 'Nối hai bước bằng then. Câu hoàn chỉnh: Take the first road, then turn left.' },
{ t: 'error', parts: ["Please", "to open", "your books", "to page ten."], w: 1, fix: "open", ex: 'Mệnh lệnh dùng nguyên mẫu, không to.' },
{ t: 'error', parts: ["Let's", "going", "to the", "market."], w: 1, fix: "go", ex: 'Let\'s + nguyên mẫu. Câu đúng: Let\'s go to the market.' },
{ t: 'error', parts: ["Please", "closing", "the window."], w: 1, fix: "close", ex: 'Mệnh lệnh dùng nguyên mẫu: Please close the window.' }
]
});

/* A1-11. Từ để hỏi: what, where, who, when, why, how… */
put({
id: 'wh-questions-a1', unit: 'foundation', order: 24,
title: 'Từ để hỏi: what, where, who, when, why, how', en: 'Wh- Questions: what, where, who, when, why, how', level: 'A1', emoji: '🔎',
summary: 'Đặt từ để hỏi lên đầu câu, rồi tới trợ động từ / be và chủ ngữ: Where do you live? Với how many (đếm được) và how much (không đếm được / giá).',
blocks: [
{ type: 'formula', rows: [
{ label: 'Wh- + be + S', parts: [ { t: 'Wh-', c: 'adv' }, { t: 'am / is / are', c: 'verb' }, { t: 'S', c: 'subj' } ], ex: '[[Where is]] the station? [[Who are]] they?' },
{ label: 'Wh- + do / does + S + V', parts: [ { t: 'Wh-', c: 'adv' }, { t: 'do / does', c: 'aux' }, { t: 'S + V', c: 'subj' } ], ex: '[[What do]] you [[do]]? [[Where does]] she [[work]]?' },
{ label: 'Wh- làm chủ ngữ: Who / What + V', parts: [ { t: 'Who / What', c: 'subj' }, { t: 'V (+s)', c: 'verb' }, { t: '…', c: 'obj' } ], ex: '[[Who lives]] here? [[What happens]] next?' }
] },
{ type: 'table', head: ['Từ', 'Hỏi về', 'Ví dụ'], rows: [
['what', 'cái gì', 'What is your name?'],
['where', 'ở đâu', 'Where do you live?'],
['who', 'ai', 'Who is that man?'],
['when / what time', 'khi nào / mấy giờ', 'What time does it start?'],
['why', 'tại sao', 'Why are you late?'],
['how', 'như thế nào', 'How do you go to school?'],
['how many / how much', 'bao nhiêu (đếm được / không đếm được)', 'How many books? How much is it?'],
['how old', 'bao nhiêu tuổi', 'How old are you?']
] },
{ type: 'uses', items: [
{ title: 'Hỏi thông tin cá nhân', ex: '[[What\'s]] your phone number?', vi: 'Số điện thoại của bạn là gì?' },
{ title: 'Hỏi địa điểm, giờ giấc', ex: '[[Where does]] the class [[start]]?', vi: 'Lớp học bắt đầu ở đâu?' },
{ title: 'Hỏi giá và số lượng', ex: '[[How much is]] this shirt? [[How many]] eggs do we need?', vi: 'Áo này bao nhiêu? Mình cần bao nhiêu quả trứng?' },
{ title: 'Hỏi lý do', ex: '[[Why do]] you study English?', vi: 'Tại sao bạn học tiếng Anh?' }
] },
{ type: 'tip', text: 'Tiếng Việt để từ hỏi ở CUỐI ("Bạn sống ở đâu?"); tiếng Anh đưa lên ĐẦU và đảo trợ động từ: Where do you live? Đừng nói You live where? trừ khi nhắc lại một thông tin vừa nghe thấy.' },
{ type: 'tip', text: 'How many + danh từ đếm được (số nhiều): How many students? How much + danh từ không đếm được hoặc hỏi giá: How much water? How much is it? Hỏi giờ: What time is it? (không dùng How many hours để hỏi giờ hiện tại).' },
{ type: 'mistake', wrong: 'Where you live?', right: 'Where do you live?', why: 'Câu hỏi hiện tại đơn cần do / does sau từ để hỏi.' },
{ type: 'mistake', wrong: 'What your name is?', right: 'What is your name?', why: 'Be đảo lên trước chủ ngữ your name.' },
{ type: 'mistake', wrong: 'How many money do you have?', right: 'How much money do you have?', why: 'Money không đếm được → how much.' },
{ type: 'mistake', wrong: 'Where does she lives?', right: 'Where does she live?', why: 'Does đã mang -s; động từ chính giữ nguyên mẫu.' },
{ type: 'ielts', text: 'Part 1 giám khảo hỏi: Where are you from? What do you do? Why do you like…? Nghe kỹ từ để hỏi để biết cần trả lời về nơi chốn, nghề nghiệp hay lý do.', ex: '"Why do you study English?" "[[Because]] I want to work abroad."' }
],
quiz: [
{ q: '___ is your birthday? – On 5 May.', options: ['What', 'When', 'Where', 'Who'], answer: 1, explain: 'Trả lời bằng ngày tháng → hỏi When. What hỏi cái gì, Where hỏi nơi chốn, Who hỏi người.' },
{ q: '___ do you live? – In Hue.', options: ['Who', 'Why', 'Where', 'How'], answer: 2, explain: 'Trả lời bằng nơi chốn → Where. Who, Why, How hỏi người, lý do, cách thức.' },
{ q: '___ is that woman? – She is my aunt.', options: ['What', 'When', 'Why', 'Who'], answer: 3, explain: 'Hỏi về người → Who. What hỏi vật / việc; When hỏi thời gian; Why hỏi lý do.' },
{ q: '___ are you late? – The bus was slow.', options: ['Why', 'Who', 'Where', 'What'], answer: 0, explain: 'Trả lời nêu lý do → Why. Các từ hỏi còn lại không hỏi lý do.' },
{ q: '___ do you go to school? – By bike.', options: ['What', 'How', 'Who', 'Where'], answer: 1, explain: 'Cách thức đi lại → How. What, Who, Where không hỏi cách thức.' },
{ q: '___ eggs do we need? – Six.', options: ['How much', 'How many', 'How old', 'What'], answer: 1, explain: 'Eggs đếm được → How many. How much dùng cho không đếm được hoặc giá.' },
{ q: '___ is this jacket? – Forty dollars.', options: ['How many', 'How old', 'How much', 'What'], answer: 2, explain: 'Hỏi giá → How much. How many hỏi số lượng; How old hỏi tuổi.' },
{ q: 'Câu nào đúng?', options: ['Where you work?', 'Where does you work?', 'Where do you work?', 'You work where do?'], answer: 2, explain: 'Wh- + do + you + V. Câu 1 thiếu do, câu 2 sai does với you, câu 4 sai trật tự.' },
{ q: 'Câu nào đúng?', options: ['What time starts the film?', 'What time the film starts?', 'What time does the film start?', 'What time the film does start?'], answer: 2, explain: 'What time + does + chủ ngữ + nguyên mẫu. Các câu khác sai trật tự hoặc thiếu trợ động từ. → câu đúng: What time does the film start?.' },
{ q: 'Câu nào đúng?', options: ['How much people are there?', 'How many people are there?', 'How many people is there?', 'How much people is there?'], answer: 1, explain: 'People đếm được, số nhiều → How many people are there? Các câu khác dùng much hoặc is sai.' },
{ q: 'Phần nào sai? "Where (A) does (B) your sister (C) lives (D)?"', options: ['Where', 'does', 'your sister', 'lives'], answer: 3, explain: 'Sau does động từ nguyên mẫu: live. Phần sai là (D).' },
{ q: 'Phần nào sai? "Where (A) you (B) live (C) now (D)?"', options: ['Where', 'you', 'live', 'now'], answer: 1, explain: 'Thiếu trợ động từ: Where do you live now? Phần sai là (B): you cần đi sau do.' }
],
drills: [
{ t: 'rewrite', q: "You go to school by bus. (How)", start: "How", a: ["How do you go to school?"], ex: "Hỏi cách thức: How + do + you + go." },
{ t: 'fill', q: "___ is the bank? It's next to the post office.", a: ["Where"], ex: 'Nơi chốn → Where. Câu hoàn chỉnh: Where is the bank? It\'s next to the post office.' },
{ t: 'fill', q: "___ is your teacher? Mr Brown.", a: ["Who"], ex: 'Hỏi người → Who. Câu hoàn chỉnh: Who is your teacher? Mr Brown.' },
{ t: 'fill', q: "___ time is it? It's half past four.", a: ["What"], ex: 'Hỏi giờ: What time. Câu hoàn chỉnh: What time is it? It\'s half past four.' },
{ t: 'fill', q: "___ are you sad? I lost my keys.", a: ["Why"], ex: 'Lý do → Why. Câu hoàn chỉnh: Why are you sad? I lost my keys.' },
{ t: 'fill', q: "How ___ is this book? Ten dollars.", a: ["much"], ex: 'Giá → how much. Câu hoàn chỉnh: How much is this book? Ten dollars.' },
{ t: 'fill', q: "How ___ sisters do you have? Two.", a: ["many"], ex: 'Sisters đếm được → how many.' },
{ t: 'fill', q: "How ___ is your brother? He is nine.", a: ["old"], ex: 'Tuổi → how old. Câu hoàn chỉnh: How old is your brother? He is nine.' },
{ t: 'rewrite', q: "You live in Hanoi. (Where)", start: "Where", a: ["Where do you live?"], ex: 'Where + do + you + live. Câu hoàn chỉnh: Where do you live?' },
{ t: 'rewrite', q: "Lan works at a school. (Where)", start: "Where", a: ["Where does Lan work?"], ex: 'Where + does + Lan + work. Câu hoàn chỉnh: Where does Lan work?' },
{ t: 'rewrite', q: "The meeting is at ten. (What time)", start: "What time", a: ["What time is the meeting?"], ex: 'What time + is + chủ ngữ. Câu hoàn chỉnh: What time is the meeting?' },
{ t: 'combine', q: "You are tired. Why?", hint: "Why", a: ["Why are you tired?"], ex: 'Why + be + chủ ngữ. Câu hoàn chỉnh: Why are you tired?' },
{ t: 'error', parts: ["Where", "you", "go", "every morning?"], w: 1, fix: "do you", ex: 'Cần do: Where do you go…? Câu đúng: Where do you go every morning?' },
{ t: 'error', parts: ["How many", "water", "do you", "drink?"], w: 0, fix: "How much", ex: 'Water không đếm được. Câu đúng: How much water do you drink?' },
{ t: 'error', parts: ["What", "does", "he", "wants?"], w: 3, fix: "want?", ex: 'Does đã mang -s. Câu đúng: What does he want' }
]
});

/* A1-12. Hiện tại tiếp diễn & be going to */
put({
id: 'now-and-next-a1', unit: 'foundation', order: 25,
title: 'Đang làm gì & sắp làm gì: am doing / going to', en: 'Now and Next: am doing / going to', level: 'A1', emoji: '🎬',
summary: 'Hiện tại tiếp diễn (am / is / are + V-ing) nói việc đang xảy ra lúc nói; be going to + V nói kế hoạch, dự định sắp tới.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Đang làm: be + V-ing', parts: [ { t: 'S', c: 'subj' }, { t: 'am / is / are', c: 'aux' }, { t: 'V-ing', c: 'verb' } ], ex: 'I [[am cooking]] dinner. They [[are playing]] outside.' },
{ label: 'Phủ định & hỏi: be (not) / Be + S + V-ing', parts: [ { t: 'S + be not', c: 'neg' }, { t: 'V-ing', c: 'verb' } ], ex: 'He [[isn\'t working]]. [[Are]] you [[listening]]?' },
{ label: 'Kế hoạch: be going to + V', parts: [ { t: 'S', c: 'subj' }, { t: 'am / is / are going to', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'We [[are going to visit]] my grandma on Sunday.' }
] },
{ type: 'uses', items: [
{ title: 'Việc đang diễn ra lúc nói', ex: 'Be quiet! The baby [[is sleeping]].', vi: 'Im lặng nào! Em bé đang ngủ.' },
{ title: 'Giai đoạn tạm thời quanh lúc này', ex: 'I [[am reading]] a good book this week.', vi: 'Tuần này tôi đang đọc một cuốn sách hay.' },
{ title: 'Kế hoạch đã dự định', ex: 'I [[am going to buy]] a new phone.', vi: 'Tôi định mua điện thoại mới.' },
{ title: 'Nói sự việc sắp xảy ra thấy rõ', ex: 'Look at the clouds. It [[is going to rain]].', vi: 'Nhìn mây kìa. Trời sắp mưa.' }
] },
{ type: 'table', head: ['Quy tắc thêm -ing', 'Ví dụ'], rows: [
['Phần lớn: V + ing', 'play → playing, eat → eating'],
['Tận cùng e câm: bỏ e', 'make → making, write → writing'],
['Một âm tiết, nguyên âm + phụ âm: gấp đôi phụ âm', 'run → running, sit → sitting']
] },
{ type: 'signals', words: ['now', 'right now', 'at the moment', 'today', 'this week', 'tonight', 'tomorrow', 'next week', 'soon'] },
{ type: 'tip', text: 'Hiện tại đơn là thói quen (I cook every day); tiếp diễn là lúc này (I am cooking now). Một số động từ chỉ trạng thái (know, like, want, have nghĩa "có") thường không dùng tiếp diễn: I know the answer (không nói I am knowing).' },
{ type: 'tip', text: 'Tiếng Việt dùng "đang" và "sắp" để phân biệt, tiếng Anh dùng be + V-ing và be going to. Nhớ cả hai cần be, và dạng sau luôn là nguyên mẫu (going to go / going to buy).' },
{ type: 'mistake', wrong: 'I cooking dinner now.', right: 'I am cooking dinner now.', why: 'V-ing luôn cần be phía trước.' },
{ type: 'mistake', wrong: 'She is cook in the kitchen.', right: 'She is cooking in the kitchen.', why: 'Sau be phải là V-ing, không phải nguyên mẫu.' },
{ type: 'mistake', wrong: 'I am going to buying a bike.', right: 'I am going to buy a bike.', why: 'Sau going to là nguyên mẫu.' },
{ type: 'mistake', wrong: 'I go to the cinema tomorrow.', right: 'I am going to go to the cinema tomorrow. / I am going to the cinema tomorrow.', why: 'Kế hoạch cho ngày mai cần going to hoặc tiếp diễn, không dùng hiện tại đơn như tiếng Việt "mai tôi đi xem phim".' },
{ type: 'ielts', text: 'Part 1 có câu hỏi về kế hoạch (What are you going to do this weekend?). Trả lời bằng be going to + một chi tiết cụ thể.', ex: 'I\'m [[going to meet]] my friends and we\'re [[going to try]] a new restaurant.' }
],
quiz: [
{ q: 'Be quiet! The baby ___.', options: ['sleeps', 'is sleeping', 'sleeping', 'is sleep'], answer: 1, explain: 'Việc đang xảy ra: is sleeping. sleeps là thói quen; sleeping thiếu be; is sleep sai dạng.' },
{ q: 'I ___ dinner now.', options: ['am cooking', 'cooking', 'cook', 'am cook'], answer: 0, explain: 'Đang nấu lúc này → am cooking. cooking thiếu be; cook là thói quen; am cook sai dạng.' },
{ q: 'They ___ football in the park.', options: ['is playing', 'plays', 'are playing', 'playing'], answer: 2, explain: 'They + are + V-ing. is sai ngôi; plays sai thì và ngôi; playing thiếu be.' },
{ q: '___ you watching TV?', options: ['Do', 'Are', 'Is', 'Does'], answer: 1, explain: 'You + are → Are you watching…? Do / Does dùng cho hiện tại đơn; Is dành cho he / she / it.' },
{ q: 'She ___ working today. She is ill.', options: ['isn\'t', 'doesn\'t', 'aren\'t', 'not'], answer: 0, explain: 'Phủ định tiếp diễn: she isn\'t working. doesn\'t dùng cho hiện tại đơn; aren\'t sai ngôi; not thiếu be.' },
{ q: 'Look! It ___ snow.', options: ['is going to', 'goes to', 'going to', 'will to'], answer: 0, explain: 'Dự đoán dựa trên dấu hiệu hiện tại → is going to snow. goes to và going to / will to sai cấu trúc.' },
{ q: 'We ___ visit my grandmother on Sunday.', options: ['go to', 'are going to', 'going to', 'will to'], answer: 1, explain: 'Kế hoạch → are going to visit. go to thiếu động từ visit sau đó; going to thiếu be.' },
{ q: 'Câu nào đúng?', options: ['I am writing a letter now.', 'I writing a letter now.', 'I am write a letter now.', 'I write a letter now. (đang viết)'], answer: 0, explain: 'Đang viết lúc này: am writing. Câu 2 thiếu be, câu 3 sai dạng, câu 4 là hiện tại đơn (thói quen).' },
{ q: 'Câu nào đúng?', options: ['He is runing.', 'He is running.', 'He is runing fast.', 'He running.'], answer: 1, explain: 'Run → running (gấp đôi n). Các dạng khác sai chính tả hoặc thiếu be.' },
{ q: 'Câu nào đúng?', options: ['I am going to buy a car.', 'I am going to buying a car.', 'I going to buy a car.', 'I am going buy a car.'], answer: 0, explain: 'be going to + nguyên mẫu. Các câu khác thừa -ing hoặc thiếu be / to. → câu đúng: I am going to buy a car.' },
{ q: 'Phần nào sai? "She (A) is (B) make (C) a cake (D) now."', options: ['She', 'is', 'make', 'a cake'], answer: 2, explain: 'Sau is cần V-ing: making (bỏ e + ing). Phần sai là (C).' },
{ q: 'Phần nào sai? "We (A) is (B) going to (C) have a party (D)."', options: ['We', 'is', 'going to', 'have a party'], answer: 1, explain: 'We đi với are: We are going to have a party. Phần sai là (B).' }
],
drills: [
{ t: 'rewrite', q: "They watch TV every night. (now)", start: "They", a: ["They are watching TV now.","They're watching TV now."], ex: "Lúc này → are watching." },
{ t: 'rewrite', q: "I will visit my aunt next week. (be going to)", start: "I", a: ["I am going to visit my aunt next week.","I'm going to visit my aunt next week."], ex: "Kế hoạch → am going to + nguyên mẫu." },
{ t: 'verb', q: "Tom ___ (watch) TV right now.", a: ["is watching", "'s watching"], ex: 'Tom = he → is watching. Câu hoàn chỉnh: Tom is watching TV right now.' },
{ t: 'verb', q: "We ___ (study) at the moment.", a: ["are studying", "'re studying"], ex: 'We + are studying. Câu hoàn chỉnh: We are studying at the moment.' },
{ t: 'verb', q: "I ___ (not / sleep). I'm just resting.", a: ["am not sleeping", "'m not sleeping"], ex: 'Phủ định: am not + V-ing. Câu hoàn chỉnh: I am not sleeping. I\'m just resting.' },
{ t: 'fill', q: "___ she cooking dinner now?", a: ["Is"], ex: 'Câu hỏi: Is she cooking? Câu hoàn chỉnh: Is she cooking dinner now?' },
{ t: 'verb', q: "He is ___ (run) in the park.", a: ["running"], ex: 'Run → running. Câu hoàn chỉnh: He is running in the park.' },
{ t: 'verb', q: "She is ___ (make) tea.", a: ["making"], ex: 'Make → making (bỏ e). Câu hoàn chỉnh: She is making tea.' },
{ t: 'fill', q: "I'm going ___ visit my uncle next week.", a: ["to"], ex: 'be going to + nguyên mẫu. Câu hoàn chỉnh: I\'m going to visit my uncle next week.' },
{ t: 'fill', q: "They are going to ___ a new house. (buy)", a: ["buy"], ex: 'Sau going to là nguyên mẫu. Câu hoàn chỉnh: They are going to buy a new house.' },
{ t: 'rewrite', q: "I cook dinner every day. (now)", start: "I", a: ["I am cooking dinner now.", "I'm cooking dinner now."], ex: 'Lúc này → am cooking. Câu hoàn chỉnh: I am cooking dinner now.' },
{ t: 'rewrite', q: "She plays tennis on Sundays. (tomorrow, going to)", start: "She", a: ["She is going to play tennis tomorrow.", "She's going to play tennis tomorrow."], ex: 'Kế hoạch ngày mai: is going to play. → She is going to play tennis tomorrow.' },
{ t: 'combine', q: "I am tired. I am going to sleep.", hint: "so", a: ["I am tired, so I am going to sleep.", "I'm tired, so I'm going to sleep.", "I am tired so I am going to sleep."], ex: 'Nối nguyên nhân – kết quả bằng so. → I am tired, so I am going to sleep.' },
{ t: 'error', parts: ["I", "cooking", "lunch", "now."], w: 1, fix: "am cooking", ex: 'Cần be trước V-ing. Câu đúng: I am cooking lunch now.' },
{ t: 'error', parts: ["She", "is", "go", "to school now."], w: 2, fix: "going", ex: 'Sau is cần V-ing: going. Câu đúng: She is going to school now.' },
{ t: 'error', parts: ["We", "are going to", "visiting", "Hue."], w: 2, fix: "visit", ex: 'Sau going to dùng nguyên mẫu.' }
]
});

/* A1-13. Quá khứ: was / were & động từ có quy tắc */
put({
id: 'past-basics-a1', unit: 'foundation', order: 26,
title: 'Quá khứ cơ bản: was / were & -ed', en: 'Past Basics: was / were and -ed', level: 'A1', emoji: '⏪',
summary: 'Quá khứ của be là was / were; động từ có quy tắc thêm -ed (worked); phủ định và câu hỏi dùng did + nguyên mẫu. Tiếng Anh luôn phải đổi động từ, không chỉ thêm "hôm qua".',
blocks: [
{ type: 'formula', rows: [
{ label: 'be: was (I / he / she / it), were (you / we / they)', parts: [ { t: 'S', c: 'subj' }, { t: 'was / were', c: 'verb' }, { t: '…', c: 'obj' } ], ex: 'I [[was]] at home. We [[were]] tired.' },
{ label: 'Khẳng định: S + V-ed', parts: [ { t: 'S', c: 'subj' }, { t: 'V-ed', c: 'verb' }, { t: 'yesterday, last week', c: 'time' } ], ex: 'I [[watched]] a film [[last night]].' },
{ label: 'Phủ định & hỏi: didn\'t + V / Did + S + V?', parts: [ { t: 'did / didn\'t', c: 'aux' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: 'She [[didn\'t call]]. [[Did]] you [[enjoy]] it?' }
] },
{ type: 'table', head: ['Động từ', 'Cách thêm -ed', 'Quá khứ'], rows: [
['work, play, visit', '+ ed', 'worked, played, visited'],
['live, like, dance', '+ d (đã có e)', 'lived, liked, danced'],
['study, try, carry', 'phụ âm + y → ied', 'studied, tried, carried'],
['stop, plan, shop', 'gấp đôi phụ âm cuối', 'stopped, planned, shopped']
] },
{ type: 'uses', items: [
{ title: 'Nói việc đã xảy ra, có mốc thời gian', ex: 'We [[visited]] Hue last summer.', vi: 'Hè năm ngoái chúng tôi đi thăm Huế.' },
{ title: 'Nói ai đã ở đâu, thế nào', ex: 'The weather [[was]] great yesterday.', vi: 'Hôm qua thời tiết rất đẹp.' },
{ title: 'Kể một chuỗi việc', ex: 'I [[cooked]] dinner and [[cleaned]] the kitchen.', vi: 'Tôi nấu bữa tối và dọn bếp.' },
{ title: 'Hỏi về trải nghiệm vừa qua', ex: '[[Did]] you [[like]] the concert?', vi: 'Bạn có thích buổi hòa nhạc không?' }
] },
{ type: 'signals', words: ['yesterday', 'last night', 'last week', 'two days ago', 'in 2020', 'when I was a child'] },
{ type: 'tip', text: 'Tiếng Việt không đổi động từ khi nói quá khứ ("hôm qua tôi xem phim"). Tiếng Anh bắt buộc đổi: I watched. Có dấu hiệu quá khứ trong câu (yesterday, last…) mà động từ chưa chia là lỗi rất hay gặp.' },
{ type: 'tip', text: 'Chỉ MỘT chỗ chứa quá khứ: nếu có did / didn\'t thì động từ chính trở về nguyên mẫu: Did you watch…? I didn\'t watch… (không nói didn\'t watched). Các động từ bất quy tắc như go → went học riêng ở trình độ cao hơn.' },
{ type: 'mistake', wrong: 'I am at home yesterday.', right: 'I was at home yesterday.', why: 'Mốc quá khứ → was, không dùng am.' },
{ type: 'mistake', wrong: 'We was tired.', right: 'We were tired.', why: 'We / you / they đi với were.' },
{ type: 'mistake', wrong: 'I watch TV last night.', right: 'I watched TV last night.', why: 'Quá khứ cần V-ed; tiếng Việt không đổi nhưng tiếng Anh thì có.' },
{ type: 'mistake', wrong: 'I didn\'t watched the film. / Did you liked it?', right: 'I didn\'t watch the film. / Did you like it?', why: 'Sau did / didn\'t động từ về nguyên mẫu.' },
{ type: 'ielts', text: 'Speaking Part 1 hỏi cả quá khứ (Did you enjoy school?). Dùng was / were và -ed, thêm một chi tiết về lý do.', ex: 'Yes, I [[did]]. I [[loved]] my teachers and we [[played]] football every day.' }
],
quiz: [
{ q: 'I ___ at home last night.', options: ['am', 'was', 'were', 'be'], answer: 1, explain: 'I + was ở quá khứ. am là hiện tại, were dành cho you / we / they, be là nguyên mẫu.' },
{ q: 'They ___ in London last year.', options: ['was', 'are', 'were', 'is'], answer: 2, explain: 'They + were. was sai ngôi; are / is là hiện tại.' },
{ q: 'She ___ a nurse in 2020.', options: ['is', 'were', 'be', 'was'], answer: 3, explain: 'She + was cho quá khứ. were sai ngôi, is là hiện tại.' },
{ q: 'We ___ football yesterday.', options: ['play', 'plays', 'played', 'playing'], answer: 2, explain: 'Mốc yesterday → played. play / plays là hiện tại; playing thiếu be.' },
{ q: 'He ___ English at university last year.', options: ['studys', 'studied', 'studyed', 'study'], answer: 1, explain: 'Study → studied (phụ âm + y → ied). studyed và studys sai chính tả; study là hiện tại.' },
{ q: 'I ___ the film. It was boring.', options: ['didn\'t like', 'don\'t liked', 'didn\'t liked', 'no like'], answer: 0, explain: 'Did + not + nguyên mẫu: didn\'t like. Các câu khác sai hoặc thêm -ed thừa.' },
{ q: '___ you enjoy the party?', options: ['Do', 'Are', 'Did', 'Does'], answer: 2, explain: 'Quá khứ → Did you enjoy? Do / Does là hiện tại; Are không đi với enjoy.' },
{ q: 'Câu nào đúng?', options: ['I am tired yesterday.', 'I was tired yesterday.', 'I were tired yesterday.', 'I be tired yesterday.'], answer: 1, explain: 'Yesterday → was. am sai thì, were sai ngôi, be sai dạng.' },
{ q: 'Câu nào đúng?', options: ['We was in Hue.', 'We were in Hue.', 'We are in Hue yesterday.', 'We be in Hue.'], answer: 1, explain: 'We đi với were ở quá khứ. Các câu khác sai. → câu đúng: We were in Hue.' },
{ q: 'Câu nào đúng?', options: ['Did you watched the match?', 'Did you watch the match?', 'You did watch?', 'Do you watched the match?'], answer: 1, explain: 'Did + nguyên mẫu. Câu 1 thừa -ed, câu 3 thiếu trật tự, câu 4 sai trợ động từ. → câu đúng: Did you watch the match?.' },
{ q: 'Phần nào sai? "We (A) visit (B) our grandparents (C) last Sunday (D)."', options: ['We', 'visit', 'our grandparents', 'last Sunday'], answer: 1, explain: 'Last Sunday → visited. Phần sai là (B).' },
{ q: 'Phần nào sai? "She (A) didn\'t (B) called (C) me (D)."', options: ['She', 'didn\'t', 'called', 'me'], answer: 2, explain: 'Sau didn\'t là nguyên mẫu: call. Phần sai là (C).' }
],
drills: [
{ t: 'rewrite', q: "We are at the cinema. (yesterday)", start: "We", a: ["We were at the cinema yesterday."], ex: "Quá khứ của are với we là were." },
{ t: 'rewrite', q: "She cooked dinner. (phủ định)", start: "She", a: ["She didn't cook dinner.","She did not cook dinner."], ex: "Phủ định quá khứ: didn't + nguyên mẫu cook." },
{ t: 'fill', q: "My parents ___ at home yesterday.", a: ["were"], ex: 'Parents = they → were. Câu hoàn chỉnh: My parents were at home yesterday.' },
{ t: 'fill', q: "It ___ cold last night.", a: ["was"], ex: 'It + was. Câu hoàn chỉnh: It was cold last night.' },
{ t: 'verb', q: "She ___ (work) in a bank last year.", a: ["worked"], ex: 'Work + ed. Câu hoàn chỉnh: She worked in a bank last year.' },
{ t: 'verb', q: "We ___ (stop) at a café.", a: ["stopped"], ex: 'Stop → stopped (gấp đôi p). Câu hoàn chỉnh: We stopped at a café.' },
{ t: 'verb', q: "He ___ (try) the soup and liked it.", a: ["tried"], ex: 'Try → tried. Câu hoàn chỉnh: He tried the soup and liked it.' },
{ t: 'verb', q: "I ___ (not / watch) TV last night.", a: ["didn't watch", "did not watch"], ex: 'Phủ định: didn\'t + nguyên mẫu. → didn\'t watch.' },
{ t: 'fill', q: "___ you play football yesterday?", a: ["Did"], ex: 'Quá khứ → Did. Câu hoàn chỉnh: Did you play football yesterday?' },
{ t: 'fill', q: "\"Did she call?\" \"Yes, she ___.\"", a: ["did"], ex: 'Trả lời ngắn lặp lại did. Câu hoàn chỉnh: "Did she call?" "Yes, she did."' },
{ t: 'rewrite', q: "I clean my room every day. (yesterday)", start: "I", a: ["I cleaned my room yesterday."], ex: 'Yesterday → cleaned. Câu hoàn chỉnh: I cleaned my room yesterday.' },
{ t: 'rewrite', q: "We play football. (hỏi, quá khứ)", start: "Did", a: ["Did we play football?"], ex: 'Did + we + play. Câu hoàn chỉnh: Did we play football?' },
{ t: 'combine', q: "We visited a museum. We took photos.", hint: "and", a: ["We visited a museum and took photos.", "We visited a museum and we took photos."], ex: 'Hai động từ quá khứ nối bằng and. → We visited a museum and took photos.' },
{ t: 'error', parts: ["I", "am", "very tired", "yesterday."], w: 1, fix: "was", ex: 'Yesterday → was. Câu đúng: I was very tired yesterday.' },
{ t: 'error', parts: ["They", "was", "late", "for the bus."], w: 1, fix: "were", ex: 'They đi với were. Câu đúng: They were late for the bus.' },
{ t: 'error', parts: ["Did", "you", "liked", "the film?"], w: 2, fix: "like", ex: 'Sau Did là nguyên mẫu. Câu đúng: Did you like the film?' }
]
});

/* A1-14. a / the / some / any */
put({
id: 'the-some-any-a1', unit: 'foundation', order: 27,
title: 'The, some, any: nói về cái đã biết & số lượng', en: 'The, Some and Any', level: 'A1', emoji: '🛒',
summary: 'The dùng cho vật cả hai người đã biết hoặc duy nhất; some dùng trong câu khẳng định, any trong câu phủ định và câu hỏi với danh từ số nhiều / không đếm được.',
blocks: [
{ type: 'formula', rows: [
{ label: 'a / an: lần đầu nhắc đến, số ít', parts: [ { t: 'a / an', c: 'adv' }, { t: 'N số ít', c: 'obj' } ], ex: 'I have [[a]] dog. [[A]] neighbour gave it to me.' },
{ label: 'the: đã biết hoặc duy nhất', parts: [ { t: 'the', c: 'adv' }, { t: 'N', c: 'obj' } ], ex: '[[The]] dog is very friendly. Open [[the]] window, please.' },
{ label: 'some (khẳng định) / any (phủ định, hỏi)', parts: [ { t: 'some / any', c: 'adv' }, { t: 'N số nhiều / không đếm được', c: 'obj' } ], ex: 'We have [[some]] milk. We don\'t have [[any]] eggs. Is there [[any]] bread?' }
] },
{ type: 'uses', items: [
{ title: 'The: cả hai cùng biết', ex: 'Pass me [[the]] salt, please.', vi: 'Đưa tôi lọ muối nhé.' },
{ title: 'The: chỉ có một trong hoàn cảnh', ex: '[[The]] sun is hot today.', vi: 'Hôm nay mặt trời nóng.' },
{ title: 'Some: một ít, vài (câu khẳng định)', ex: 'I bought [[some]] bananas.', vi: 'Tôi mua vài quả chuối.' },
{ title: 'Any: phủ định và câu hỏi', ex: 'There isn\'t [[any]] sugar. Do you have [[any]] brothers?', vi: 'Không còn đường. Bạn có anh em không?' },
{ title: 'Some trong lời mời, đề nghị', ex: 'Would you like [[some]] tea?', vi: 'Bạn dùng chút trà nhé?' }
] },
{ type: 'table', head: ['', 'Khẳng định', 'Phủ định', 'Câu hỏi'], rows: [
['Số nhiều', 'some apples', 'not any apples', 'any apples?'],
['Không đếm được', 'some rice', 'not any rice', 'any rice?']
] },
{ type: 'tip', text: 'Tiếng Việt không có mạo từ, nên dễ bỏ qua the hoặc nhầm với a. Mẹo: lần đầu nhắc một vật dùng a / an; từ lần thứ hai, hoặc khi người nghe đã biết, dùng the.' },
{ type: 'tip', text: 'Khi nói chung chung về mọi người / mọi vật, thường KHÔNG dùng the: I like music. People love dogs. Thêm the khi nói về cái cụ thể: The music in this café is relaxing.' },
{ type: 'mistake', wrong: 'Sun is very hot today.', right: 'The sun is very hot today.', why: 'Vật duy nhất cần the.' },
{ type: 'mistake', wrong: 'I have a some friends in Hanoi.', right: 'I have some friends in Hanoi.', why: 'Không dùng a cùng some.' },
{ type: 'mistake', wrong: 'We don\'t have some milk.', right: 'We don\'t have any milk.', why: 'Câu phủ định dùng any.' },
{ type: 'mistake', wrong: 'I like the music. (nói chung)', right: 'I like music.', why: 'Nói chung chung thì bỏ the; the dành cho thứ cụ thể.' },
{ type: 'ielts', text: 'Trong Speaking Part 1, dùng a / an lần đầu giới thiệu một thứ, rồi the khi nhắc lại; dùng some / any chính xác sẽ tự nhiên hơn.', ex: 'There is [[a]] park near my house. I walk in [[the]] park every morning.' }
],
quiz: [
{ q: 'I have a cat. ___ cat is black.', options: ['A', 'An', 'The', 'Some'], answer: 2, explain: 'Con mèo đã được nhắc đến → The cat. A / An dùng khi nhắc lần đầu; Some không đi với số ít.' },
{ q: 'Please close ___ door.', options: ['a', 'some', 'any', 'the'], answer: 3, explain: 'Cánh cửa cả hai cùng biết → the door. a chưa xác định; some / any dùng cho số nhiều hoặc không đếm được.' },
{ q: '___ sun rises in the east.', options: ['A', 'The', 'Some', 'An'], answer: 1, explain: 'Chỉ có một mặt trời → The sun. A / An / Some không phù hợp.' },
{ q: 'There is ___ milk in the fridge.', options: ['a', 'an', 'some', 'many'], answer: 2, explain: 'Milk không đếm được, câu khẳng định → some milk. a / an dùng với số ít; many cần đếm được.' },
{ q: 'We don\'t have ___ bread.', options: ['some', 'any', 'a', 'an'], answer: 1, explain: 'Phủ định → any bread. some thường dùng trong khẳng định; a / an không đi với bread.' },
{ q: 'Do you have ___ brothers?', options: ['some', 'a', 'any', 'an'], answer: 2, explain: 'Câu hỏi với số nhiều → any brothers. some dùng khẳng định; a / an chỉ số ít.' },
{ q: 'Would you like ___ coffee?', options: ['some', 'any', 'a', 'the'], answer: 0, explain: 'Lời mời dùng some: Would you like some coffee? any dùng cho câu hỏi thông tin; a / the không phù hợp.' },
{ q: 'Câu nào đúng?', options: ['I don\'t have some money.', 'I don\'t have any money.', 'I don\'t have a money.', 'I don\'t have the some money.'], answer: 1, explain: 'Phủ định → any money. Các câu khác dùng some / a / the some sai.' },
{ q: 'Câu nào đúng?', options: ['The life is beautiful.', 'Life is beautiful.', 'A life is beautiful.', 'Lives is beautiful.'], answer: 1, explain: 'Nói chung chung không dùng the: Life is beautiful. Các câu khác sai.' },
{ q: 'Câu nào đúng?', options: ['I bought a apple and an orange.', 'I bought an apple and a orange.', 'I bought an apple and an orange.', 'I bought apple and orange.'], answer: 2, explain: 'Apple và orange đều bắt đầu bằng nguyên âm → an apple, an orange. Các câu khác sai a / an hoặc thiếu mạo từ.' },
{ q: 'Phần nào sai? "She has (A) a some (B) books (C) in her bag (D)."', options: ['She has', 'a some', 'books', 'in her bag'], answer: 1, explain: 'Không dùng a và some cùng nhau: some books. Phần sai là (B).' },
{ q: 'Phần nào sai? "Is there (A) some (B) milk (C) in the fridge (D)?"', options: ['Is there', 'some', 'milk', 'in the fridge'], answer: 1, explain: 'Câu hỏi dùng any: any milk. Phần sai là (B).' }
],
drills: [
{ t: 'rewrite', q: "I have some money. (phủ định)", start: "I", a: ["I don't have any money.","I do not have any money."], ex: "Phủ định dùng any thay some." },
{ t: 'fill', q: "I saw a man and a woman. ___ man was tall.", a: ["The"], ex: 'Đã nhắc → The man. Câu hoàn chỉnh: I saw a man and a woman. The man was tall.' },
{ t: 'fill', q: "There isn't ___ juice in the glass.", a: ["any"], ex: 'Phủ định → any. Câu hoàn chỉnh: There isn\'t any juice in the glass.' },
{ t: 'fill', q: "I'd like ___ water, please.", a: ["some"], ex: 'Lời đề nghị → some. Câu hoàn chỉnh: I\'d like some water, please.' },
{ t: 'fill', q: "Is there ___ cheese left?", a: ["any"], ex: 'Câu hỏi → any. Câu hoàn chỉnh: Is there any cheese left?' },
{ t: 'fill', q: "Look at ___ moon tonight!", a: ["the"], ex: 'Vật duy nhất → the moon. Câu hoàn chỉnh: Look at the moon tonight!' },
{ t: 'fill', q: "We bought ___ onion at the market.", a: ["an"], ex: 'Onion bắt đầu bằng nguyên âm → an.' },
{ t: 'rewrite', q: "We have some bread. (phủ định)", start: "We", a: ["We don't have any bread.", "We do not have any bread."], ex: 'Phủ định → any. Câu hoàn chỉnh: We don\'t have any bread.' },
{ t: 'rewrite', q: "There are some books on the shelf. (hỏi)", start: "Are", a: ["Are there any books on the shelf?"], ex: 'Hỏi → any. Câu hoàn chỉnh: Are there any books on the shelf?' },
{ t: 'combine', q: "I bought a shirt. The shirt is red.", hint: "which", a: ["I bought a shirt which is red.", "I bought a shirt that is red.", "I bought a red shirt."], ex: 'Nhắc lần đầu dùng a, nhắc lại dùng the hoặc bỏ gọn bằng tính từ.' },
{ t: 'combine', q: "I have a dog. I love the dog.", hint: "and", a: ["I have a dog and I love the dog.", "I have a dog and I love it.", "I have a dog and love it."], ex: 'Nhắc lại thì dùng the hoặc đại từ it.' },
{ t: 'error', parts: ["Sun", "is", "very hot", "today."], w: 0, fix: "The sun", ex: 'Duy nhất → the. Câu đúng: The sun is very hot today.' },
{ t: 'error', parts: ["I don't", "have", "some", "money."], w: 2, fix: "any", ex: 'Phủ định → any. Câu đúng: I don\'t have any money.' },
{ t: 'error', parts: ["She has", "a some", "friends", "in London."], w: 1, fix: "some", ex: 'Bỏ a. Câu đúng: She has some friends in London.' }
]
});

/* A1-15. would like / like + -ing */
put({
id: 'would-like-a1', unit: 'foundation', order: 28,
title: 'Would like & like + -ing: muốn gì, thích gì', en: 'Would Like and Like + -ing', level: 'A1', emoji: '☕',
summary: 'I\'d like… (muốn, lịch sự) dùng khi gọi món, hỏi giá, đưa lời mời; I like + V-ing nói sở thích lâu dài. Hai cấu trúc có nghĩa khác nhau.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Muốn: I\'d like + N / to + V', parts: [ { t: 'S', c: 'subj' }, { t: 'would like', c: 'aux' }, { t: 'N / to V', c: 'obj' } ], ex: '[[I\'d like]] a coffee. We\'d like [[to book]] a table.' },
{ label: 'Mời / hỏi: Would you like + N / to + V?', parts: [ { t: 'Would', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'like', c: 'verb' }, { t: 'N / to V', c: 'obj' } ], ex: '[[Would you like]] some tea? [[Would you like to]] sit down?' },
{ label: 'Thích: like / love / hate + V-ing', parts: [ { t: 'S', c: 'subj' }, { t: 'like / love / hate', c: 'verb' }, { t: 'V-ing', c: 'obj' } ], ex: 'I [[love swimming]]. He [[hates getting]] up early.' }
] },
{ type: 'uses', items: [
{ title: 'Gọi món, đề nghị lịch sự', ex: 'I\'d like a glass of water, please.', vi: 'Làm ơn cho tôi một ly nước.' },
{ title: 'Mời ai', ex: 'Would you like to come to my party?', vi: 'Bạn có muốn đến bữa tiệc của tôi không?' },
{ title: 'Nói sở thích chung', ex: 'My sister loves reading and drawing.', vi: 'Em gái tôi thích đọc sách và vẽ.' },
{ title: 'Nói điều không thích', ex: 'I don\'t like waiting in queues.', vi: 'Tôi không thích xếp hàng chờ.' }
] },
{ type: 'table', head: ['Cấu trúc', 'Nghĩa', 'Ví dụ'], rows: [
['I like tea.', 'sở thích chung, luôn luôn', 'I like tea. (tôi thích trà)'],
['I\'d like tea.', 'bây giờ muốn, lịch sự', 'I\'d like tea. (cho tôi trà)'],
['I like swimming.', 'thích làm hoạt động', 'I like swimming. (nói chung)'],
['I\'d like to swim.', 'muốn bơi (lúc này)', 'I\'d like to swim now.']
] },
{ type: 'tip', text: 'Would like KHÔNG đổi theo ngôi: she would like (không phải she woulds like); dạng rút gọn là \'d: I\'d like. Phủ định ít dùng; muốn từ chối, nói No, thank you.' },
{ type: 'tip', text: 'Do you like…? hỏi về sở thích chung (Do you like tea?), còn Would you like…? là lời mời (Would you like some tea?). Trả lời lời mời: Yes, please. / No, thank you. — không chỉ nói Yes.' },
{ type: 'mistake', wrong: 'I want a coffee, please. (với nhân viên)', right: 'I\'d like a coffee, please.', why: 'I want… nghe thẳng và hơi cộc; I\'d like… là cách gọi món lịch sự.' },
{ type: 'mistake', wrong: 'I would like going to the cinema.', right: 'I\'d like to go to the cinema.', why: 'Sau would like dùng to + nguyên mẫu, không dùng V-ing.' },
{ type: 'mistake', wrong: 'I like to swimming.', right: 'I like swimming.', why: 'Like + V-ing, không có to trước V-ing.' },
{ type: 'mistake', wrong: 'Do you like a tea? / Would you like drinking tea?', right: 'Would you like some tea? / Would you like to drink tea?', why: 'Lời mời dùng some; would like + N hoặc to + V, không V-ing.' },
{ type: 'ielts', text: 'Part 1 hay hỏi sở thích: Do you like…? Dùng like / love + V-ing và thêm lý do. Part 3 hay hỏi mong muốn: dùng would like to… cho tương lai.', ex: 'I [[love cooking]] because it relaxes me. One day I\'d [[like to open]] a café.' }
],
quiz: [
{ q: 'Cách gọi món lịch sự nhất: "I ___ a cup of tea, please."', options: ['want', '\'d like', 'like', 'am wanting'], answer: 1, explain: 'I\'d like… là cách gọi món lịch sự. want nghe cộc; like nói sở thích chung; am wanting sai vì want không dùng tiếp diễn.' },
{ q: '___ you like some coffee?', options: ['Do', 'Would', 'Are', 'Does'], answer: 1, explain: 'Lời mời: Would you like some coffee? Do you like… hỏi sở thích chung.' },
{ q: 'She ___ like to visit Paris.', options: ['woulds', 'would', 'does', 'is'], answer: 1, explain: 'Would không đổi theo ngôi: She would like to visit. woulds không tồn tại.' },
{ q: 'I\'d like ___ a taxi.', options: ['take', 'taking', 'to take', 'took'], answer: 2, explain: 'Would like + to + nguyên mẫu: to take. take, taking, took sai dạng.' },
{ q: 'My brother loves ___ football.', options: ['play', 'to playing', 'playing', 'plays'], answer: 2, explain: 'Love + V-ing: loves playing. play, to playing, plays sai dạng.' },
{ q: 'I don\'t like ___ early.', options: ['get up', 'getting up', 'to getting up', 'gets up'], answer: 1, explain: 'Like + V-ing: getting up. get up, to getting up, gets up sai dạng.' },
{ q: '"Would you like some water?" "___"', options: ['Yes, please.', 'Yes, I like.', 'Yes, I would like.', 'I do.'], answer: 0, explain: 'Chấp nhận lịch sự: Yes, please. Các câu còn lại không tự nhiên.' },
{ q: 'Câu nào đúng?', options: ['I would like going home.', 'I would like to go home.', 'I like to going home.', 'I would like go home.'], answer: 1, explain: 'Would like to + nguyên mẫu. Các câu khác sai. → câu đúng: I would like to go home.' },
{ q: 'Câu nào đúng?', options: ['She like swimming.', 'She likes to swimming.', 'She likes swimming.', 'She is like swimming.'], answer: 2, explain: 'She likes + V-ing. Câu 1 thiếu -s, câu 2 sai to + V-ing, câu 4 sai be. → câu đúng: She likes swimming.' },
{ q: 'Câu nào là lời mời?', options: ['Do you like pizza?', 'Would you like some pizza?', 'You like pizza.', 'I like pizza.'], answer: 1, explain: 'Would you like…? là lời mời; Do you like…? hỏi sở thích chung.' },
{ q: 'Phần nào sai? "I (A) would like (B) swimming (C) now (D)."', options: ['I', 'would like', 'swimming', 'now'], answer: 2, explain: 'Would like + to + nguyên mẫu: to swim. Phần sai là (C).' },
{ q: 'Phần nào sai? "He (A) likes (B) to swimming (C) in the sea (D)."', options: ['He', 'likes', 'to swimming', 'in the sea'], answer: 2, explain: 'Like + V-ing: swimming, không có to. Phần sai là (C).' }
],
drills: [
{ t: 'rewrite', q: "She wants a coffee. (would like)", start: "She", a: ["She would like a coffee.","She'd like a coffee."], ex: "Would like không đổi theo ngôi, lịch sự hơn want." },
{ t: 'fill', q: "I'd ___ a table for two, please.", a: ["like"], ex: 'I\'d like + danh từ. Câu hoàn chỉnh: I\'d like a table for two, please.' },
{ t: 'fill', q: "___ you like some tea? (lời mời)", a: ["Would"], ex: 'Lời mời: Would you like…? Câu hoàn chỉnh: Would you like some tea?' },
{ t: 'fill', q: "I'd like ___ a doctor. (be)", a: ["to be"], ex: 'Would like + to + nguyên mẫu. → to be.' },
{ t: 'fill', q: "My dad loves ___ in the garden. (work)", a: ["working"], ex: 'Love + V-ing. Câu hoàn chỉnh: My dad loves working in the garden.' },
{ t: 'fill', q: "They don't like ___ in the rain. (walk)", a: ["walking"], ex: 'Like + V-ing. Câu hoàn chỉnh: They don\'t like walking in the rain.' },
{ t: 'verb', q: "She ___ (like) dancing.", a: ["likes"], ex: 'She + likes + V-ing. Câu hoàn chỉnh: She likes dancing.' },
{ t: 'rewrite', q: "I want a glass of water. (lịch sự)", start: "I'd", a: ["I'd like a glass of water.", "I'd like a glass of water, please."], ex: 'Dùng I\'d like. Câu hoàn chỉnh: I\'d like a glass of water.' },
{ t: 'rewrite', q: "Do you want some coffee? (lời mời lịch sự)", start: "Would", a: ["Would you like some coffee?"], ex: 'Would you like…? Câu hoàn chỉnh: Would you like some coffee?' },
{ t: 'rewrite', q: "I love to swim.", start: "I love", a: ["I love swimming."], ex: 'Love + V-ing. Câu hoàn chỉnh: I love swimming.' },
{ t: 'combine', q: "I like reading. I like cooking.", hint: "and", a: ["I like reading and cooking.", "I like cooking and reading."], ex: 'Hai V-ing nối bằng and. Câu hoàn chỉnh: I like reading and cooking.' },
{ t: 'error', parts: ["I", "would like", "going", "to the beach."], w: 2, fix: "to go", ex: 'Would like + to + nguyên mẫu.' },
{ t: 'error', parts: ["She", "likes", "to swimming", "every day."], w: 2, fix: "swimming", ex: 'Like + V-ing, không có to. Câu đúng: She likes swimming every day.' },
{ t: 'error', parts: ["Do you", "like", "a", "tea?"], w: 0, fix: "Would you", ex: 'Lời mời: Would you like some tea?' }
]
});
})(typeof self !== 'undefined' ? self : this);
