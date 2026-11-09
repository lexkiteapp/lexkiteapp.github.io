/* Ngữ pháp – Thành thạo C2 (tự biên soạn). Điểm ngữ pháp: content/framework/grammar-inventory.json (lessons) */
(function (g) {
const G = g.GRAMMAR = g.GRAMMAR || [];
// Gói lười (lazy-*.js): bài rút gọn cùng id được thay tại chỗ (giữ thứ tự), bài tập/câu hỏi gắn thêm lúc đó (drills-own…) được nối vào; nạp lại không nhân đôi
const put = x => { const i = G.findIndex(y => y.id === x.id), o = G[i]; if (i < 0) return G.push(x); if (!o.lazy) return; for (const k of ['drills', 'quiz']) if (o[k]) x[k] = (x[k] || []).concat(o[k]); G[i] = x; };

/* C2-1. Đảo ngữ trọn bộ: so / such, as / than, nơi chốn, bổ ngữ đặt trước */
put({
id: 'inversion-range-c2', unit: 'academic', order: 20,
title: 'Đảo ngữ trọn bộ: so, such, as, nơi chốn, bổ ngữ', en: 'The Full Range of Inversion', level: 'C2', emoji: '🔀',
summary: 'Ngoài đảo ngữ sau trạng từ phủ định, C2 còn có đảo ngữ sau so / such, as / than, trạng ngữ nơi chốn và bổ ngữ đặt lên đầu. Mỗi kiểu có luật riêng: đảo cả động từ chính hay chỉ trợ động từ, đại từ có đảo không.',
blocks: [
{ type: 'formula', rows: [
{ label: 'So + tính từ / Such + be + danh từ → be + S', parts: [ { t: 'So / Such', c: 'adv' }, { t: 'adj / be', c: 'verb' }, { t: 'S', c: 'subj' }, { t: 'that…', c: 'obj' } ], ex: '[[So severe was]] the drought [[that]] the river dried up. [[Such was]] the pace of change that nobody could keep up.' },
{ label: 'as / than + trợ động từ + S (so sánh, đồng điệu)', parts: [ { t: '… , as / than', c: 'adv' }, { t: 'aux / be', c: 'aux' }, { t: 'S', c: 'subj' } ], ex: 'Rents rose faster than [[did]] wages. She was gifted, as [[was]] her brother.' },
{ label: 'Trạng ngữ nơi chốn / hướng + động từ chính + S', parts: [ { t: 'Into / On / Here', c: 'adv' }, { t: 'V (không do)', c: 'verb' }, { t: 'S (danh từ)', c: 'subj' } ], ex: 'Into the room [[walked a tall stranger]]. On the shelf [[lay a dusty map]].' },
{ label: 'Bổ ngữ đặt lên đầu + be + S', parts: [ { t: 'Adj / V-ed', c: 'adv' }, { t: 'be', c: 'verb' }, { t: 'S', c: 'subj' } ], ex: '[[Particularly worrying is]] the lack of data. [[Gone are]] the days of cheap housing.' }
] },
{ type: 'uses', items: [
{ title: 'Nhấn mạnh mức độ rồi đưa hậu quả (so / such)', ex: '[[So complete was]] his failure that he left the country.', vi: 'Thất bại hoàn toàn đến mức ông rời khỏi đất nước.' },
{ title: 'Đồng điệu nhẹ nhàng trong văn viết trang trọng (as / than)', ex: 'The first author is Dutch, as [[is]] the second.', vi: 'Tác giả thứ nhất là người Hà Lan, tác giả thứ hai cũng vậy.' },
{ title: 'Tạo cảnh trong văn kể, tường thuật', ex: 'Round the corner [[came]] a lorry the size of a house.', vi: 'Quanh góc đường lao ra một chiếc xe tải to bằng cả căn nhà.' },
{ title: 'Đặt thông tin mới ở cuối, bổ ngữ nổi lên', ex: 'Among the guests [[were]] two former prime ministers.', vi: 'Trong số khách có hai cựu thủ tướng.' },
{ title: 'Đảo sau Nowhere / Not once / On no account', ex: 'Nowhere in the contract [[is there]] any mention of damages.', vi: 'Không nơi nào trong hợp đồng nhắc đến bồi thường.' }
] },
{ type: 'table', head: ['Kiểu đảo', 'Điều kiện then chốt', 'Ví dụ'], rows: [
['Sau trạng từ phủ định / hạn chế', 'trợ động từ trước S; thì đơn cần do / does / did', 'Not once did she complain.'],
['Nơi chốn / hướng', 'động từ chính trước S; KHÔNG dùng do; S là đại từ thì không đảo', 'Here comes the bus. / Here he comes.'],
['So / Such', 'be (hoặc trợ động từ) trước S', 'Such was the demand that…'],
['as / than', 'trợ động từ hoặc be, S là danh từ', '…than did the others.'],
['Bổ ngữ đặt lên đầu', 'be hoặc động từ ở trạng thái, hòa hợp với S đứng SAU', 'Present were the minister and his aides.']
] },
{ type: 'tip', text: 'Khi đảo ngữ, động từ hòa hợp với chủ ngữ đứng SAU nó, không phải với bổ ngữ ở đầu câu: Among the guests were two prime ministers (số nhiều), nhưng Among the guests was a prime minister. Đây là chỗ người học trình độ cao hay sai.' },
{ type: 'tip', text: 'Chỉ đảo với chủ ngữ là danh từ. Với đại từ, giữ trật tự thường: Here he comes! Away they went! Off I go! (không nói Here comes he). Văn kể có thể đảo đủ, nhưng đảo quá nhiều làm văn phong giả tạo.' },
{ type: 'mistake', wrong: 'Into the room did walk a stranger.', right: 'Into the room walked a stranger.', why: 'Đảo nơi chốn là đảo động từ chính (không có do). Do chỉ xuất hiện với trạng từ phủ định: Never did he return.' },
{ type: 'mistake', wrong: 'Here comes he!', right: 'Here he comes!', why: 'Chủ ngữ đại từ không đảo trong cấu trúc Here / There / Away / Off.' },
{ type: 'mistake', wrong: 'Particularly worrying are the lack of funds.', right: 'Particularly worrying is the lack of funds.', why: 'Chủ ngữ thật là the lack (số ít), nên động từ là is, dù funds đứng gần.' },
{ type: 'mistake', wrong: 'So loud the noise was that nobody slept.', right: 'So loud was the noise that nobody slept. / The noise was so loud that nobody slept.', why: 'Khi so + tính từ đứng đầu câu phải đảo be lên trước chủ ngữ.' },
{ type: 'ielts', text: 'Trong bài viết band 8–9, một câu đảo ngữ ở mở bài hoặc kết luận nhấn ý chính. Dùng đúng loại (so / such, hoặc Not only…) sẽ nổi bật hơn là dùng nhiều lần.', ex: '[[So profound has been]] the impact of mobile technology [[that]] few industries remain untouched.' }
],
quiz: [
{ q: 'So ___ the noise that nobody could sleep.', options: ['loud was', 'was loud', 'loud did', 'loudly was'], answer: 0, explain: 'So + tính từ đứng đầu câu thì đảo be: So loud was the noise. was loud giữ trật tự thường; loud did và loudly was sai dạng.' },
{ q: 'Hoàn thành bằng đảo ngữ: "Into the hall ___."', options: ['did a group of children run', 'a group of children ran', 'ran a group of children', 'ran did a group of children'], answer: 2, explain: 'Trạng ngữ hướng + động từ chính + chủ ngữ: ran a group of children. Không dùng do (câu 1), câu 2 giữ trật tự thường, câu 4 sai cấu trúc.' },
{ q: 'Câu nào đúng khi chủ ngữ là đại từ?', options: ['Here comes he!', 'Here he comes!', 'Here does he come!', 'Here is coming he!'], answer: 1, explain: 'Đại từ không đảo: Here he comes! Các câu còn lại đảo sai hoặc dùng do / tiếp diễn không cần thiết.' },
{ q: 'Prices rose faster than ___ wages.', options: ['did', 'do', 'have', 'are'], answer: 0, explain: 'Quá khứ → than did wages (đảo sau than, trang trọng). do và are là hiện tại; have cần phân từ phía sau.' },
{ q: 'Nowhere in the report ___ any evidence of fraud.', options: ['there is', 'is there', 'does there', 'has there'], answer: 1, explain: 'Nowhere + be + there → is there. there is giữ trật tự thường; does there và has there sai trợ động từ.' },
{ q: 'Seated opposite me ___ a man in a grey coat.', options: ['were', 'did sit', 'was', 'sat were'], answer: 2, explain: 'Chủ ngữ a man (số ít) → was. were sai hòa hợp; did sit và sat were sai cấu trúc.' },
{ q: 'Among the guests ___ two former ministers.', options: ['was', 'were', 'is', 'has been'], answer: 1, explain: 'Chủ ngữ thật two former ministers (số nhiều) đứng sau → were. Các dạng còn lại số ít hoặc sai thì.' },
{ q: 'Nowadays, gone ___ the days when we could leave the door unlocked.', options: ['are', 'is', 'were been', 'has'], answer: 0, explain: 'Gone are the days (when…) là cụm cố định; the days số nhiều → are. is sai hòa hợp; hai dạng còn lại sai cấu trúc.' },
{ q: 'She is highly qualified, and ___ her brother.', options: ['so is', 'as is', 'so does', 'is so'], answer: 0, explain: 'Đồng điệu với and: so + be + S → so is her brother. as is dùng sau dấu phẩy mà không có and; so does cần động từ thường; is so sai trật tự.' },
{ q: 'On no account ___ the door be left unlocked.', options: ['should', 'does', 'is', 'will not'], answer: 0, explain: 'On no account + trợ động từ + S + V: should the door be left. does / is / will not không đi được với be left theo cấu trúc này.' },
{ q: 'Phần nào sai? "Particularly worrying (A) are (B) the lack (C) of funds (D)."', options: ['Particularly worrying', 'are', 'the lack', 'of funds'], answer: 1, explain: 'Chủ ngữ thật là the lack (số ít) → is. Phần sai là (B).' },
{ q: 'Phần nào sai? "Rarely (A) did (B) she (C) complained (D)."', options: ['Rarely', 'did', 'she', 'complained'], answer: 3, explain: 'Sau did là nguyên mẫu: complain. Phần sai là (D).' }
],
drills: [
{ t: 'fill', q: "So rapid ___ the change that many firms failed. (be)", a: ["was"], ex: 'So + adj + be + S: was. Câu hoàn chỉnh: So rapid was the change that many firms failed.' },
{ t: 'fill', q: "Such ___ his anger that he left the room. (be)", a: ["was"], ex: 'Such was his anger… (be trước S).' },
{ t: 'fill', q: "Output rose more slowly than ___ demand. (do, quá khứ)", a: ["did"], ex: 'than did demand (quá khứ). Câu hoàn chỉnh: Output rose more slowly than did demand.' },
{ t: 'fill', q: "On the wall ___ a portrait of the founder. (hang)", a: ["hung"], ex: 'Nơi chốn + động từ chính quá khứ hung + S.' },
{ t: 'fill', q: "Nowhere ___ there more evidence of this than in Asia. (be)", a: ["is"], ex: 'Nowhere + is there + S; hiện tại.' },
{ t: 'verb', q: "Present at the meeting ___ (be) the director and her two deputies.", a: ["were"], ex: 'Chủ ngữ thật số nhiều (the director and her two deputies) → were.' },
{ t: 'rewrite', q: "The silence was so deep that you could hear a pin drop.", start: "So", a: ["So deep was the silence that you could hear a pin drop."], ex: 'So + adj + was + the silence + that… → So deep was the silence that you could hear a pin drop..' },
{ t: 'rewrite', q: "A stranger walked into the room.", start: "Into", a: ["Into the room walked a stranger."], ex: 'Hướng + động từ chính + S. Câu hoàn chỉnh: Into the room walked a stranger.' },
{ t: 'rewrite', q: "The days of cheap oil are gone.", start: "Gone", a: ["Gone are the days of cheap oil."], ex: 'Bổ ngữ gone lên đầu, be hòa hợp với the days. → Gone are the days of cheap oil..' },
{ t: 'rewrite', q: "The bus is coming. (Here)", start: "Here", a: ["Here comes the bus."], ex: 'Chủ ngữ danh từ → đảo: Here comes the bus.' },
{ t: 'combine', q: "She speaks French fluently. Her sister speaks French fluently.", hint: "as", a: ["She speaks French fluently, as does her sister."], ex: 'as + does + S (trang trọng). → She speaks French fluently, as does her sister..' },
{ t: 'error', parts: ["Here", "comes he", "now."], w: 1, fix: "he comes", ex: 'Đại từ không đảo: Here he comes now.' },
{ t: 'error', parts: ["Into the room", "did walk", "a stranger."], w: 1, fix: "walked", ex: 'Không dùng do với đảo nơi chốn: Into the room walked a stranger.' },
{ t: 'error', parts: ["Among the visitors", "was", "two", "journalists."], w: 1, fix: "were", ex: 'Hòa hợp với chủ ngữ thật số nhiều two journalists.' }
]
});

/* C2-2. Đóng gói thông tin: câu chẻ, end-focus, extraposition */
put({
id: 'information-packaging-c2', unit: 'academic', order: 21,
title: 'Đóng gói thông tin: câu chẻ, end-focus & extraposition', en: 'Information Packaging: Clefts, End-Focus and Extraposition', level: 'C2', emoji: '📦',
summary: 'Thông tin cũ đứng đầu, thông tin mới đứng cuối (end-focus), thành phần nặng đứng cuối (end-weight). Câu chẻ, câu chẻ đảo và it-extraposition là công cụ để sắp lại câu cho đúng nhịp.',
blocks: [
{ type: 'formula', rows: [
{ label: 'It-cleft: It + be + phần nhấn + that / who', parts: [ { t: 'It was', c: 'subj' }, { t: 'phần nhấn', c: 'adv' }, { t: 'that / who…', c: 'obj' } ], ex: 'It was [[the delay]] that annoyed me, not the cost. It was not until midnight that they arrived.' },
{ label: 'Wh-cleft: What + S + V + be + phần nhấn', parts: [ { t: 'What S V', c: 'subj' }, { t: 'is / was', c: 'verb' }, { t: 'phần nhấn', c: 'obj' } ], ex: '[[What I resent]] is [[being treated like a child]]. All I did was [[ask]].' },
{ label: 'Wh-cleft đảo: phần nhấn + be + what…', parts: [ { t: 'phần nhấn', c: 'obj' }, { t: 'is / was', c: 'verb' }, { t: 'what S V', c: 'subj' } ], ex: '[[A fresh start]] is [[what we need]].' },
{ label: 'Extraposition: It + be + adj / V-ed + that / how / to', parts: [ { t: 'It', c: 'subj' }, { t: 'is surprising', c: 'verb' }, { t: 'that / how / to', c: 'obj' } ], ex: '[[It is surprising]] how few people voted. I find [[it]] hard to believe that he resigned.' }
] },
{ type: 'uses', items: [
{ title: 'Sửa một hiểu lầm bằng it-cleft', ex: '"Was it the price?" "No, it was the quality that put me off."', vi: 'Không phải giá, chính chất lượng làm tôi nản.' },
{ title: 'Nêu vấn đề rồi mới đưa đáp án (wh-cleft)', ex: '[[What the report lacks]] is a clear recommendation.', vi: 'Điều bản báo cáo thiếu là một khuyến nghị rõ ràng.' },
{ title: 'Giới hạn bằng All / The only thing', ex: '[[The only thing I ask]] is that you keep me informed.', vi: 'Điều duy nhất tôi xin là các bạn cập nhật cho tôi.' },
{ title: 'Đưa mệnh đề dài ra cuối (end-weight)', ex: '[[It is unclear]] whether the proposal will be accepted.', vi: 'Chưa rõ đề xuất có được chấp nhận không.' },
{ title: 'Ở thể tân ngữ với it', ex: 'She made [[it]] clear [[that]] she would not return.', vi: 'Cô nói rõ là sẽ không quay lại.' }
] },
{ type: 'table', head: ['Cách sắp', 'Hiệu quả', 'Ví dụ'], rows: [
['Thường', 'thông tin mới nằm cuối tự nhiên', 'The delay annoyed me most.'],
['It-cleft', 'sửa đối lập, nhấn một thành phần', 'It was the delay that annoyed me.'],
['Wh-cleft', 'chuẩn bị rồi tiết lộ điều quan trọng', 'What annoyed me was the delay.'],
['Extraposition', 'tránh chủ ngữ dài đứng đầu', 'It annoyed me that nobody told us.']
] },
{ type: 'tip', text: 'Người Việt có sẵn "chính … mới": Chính cái chậm trễ làm tôi bực = It was the delay that annoyed me. Nhưng it-cleft tiếng Anh nhấn mạnh (và thường ngầm đối lập), nên đừng dùng liên tục; 1–2 lần mỗi đoạn.' },
{ type: 'tip', text: 'Chủ ngữ dài đứng đầu câu thì nặng đầu: That he had resigned surprised everyone. Văn viết tự nhiên hơn: It surprised everyone that he had resigned. Quy tắc end-weight: thành phần nặng, mới → cuối câu.' },
{ type: 'mistake', wrong: 'It was in 1998 when the company was founded.', right: 'It was in 1998 that the company was founded.', why: 'It-cleft nhấn trạng ngữ thời gian bằng that, không dùng when.' },
{ type: 'mistake', wrong: 'It is surprising what so few people voted.', right: 'It is surprising that so few people voted. / It is surprising how few people voted.', why: 'Sau tính từ cảm xúc dùng that hoặc how; không dùng what.' },
{ type: 'mistake', wrong: 'I find hard to believe that he resigned.', right: 'I find it hard to believe that he resigned.', why: 'Tân ngữ giả it bắt buộc khi mệnh đề that ra cuối.' },
{ type: 'mistake', wrong: 'A quiet life is that she wants.', right: 'A quiet life is what she wants.', why: 'Câu chẻ đảo dùng what, không dùng that.' },
{ type: 'ielts', text: 'Trong bài viết, wh-cleft rất hợp ở kết luận hoặc để nêu giải pháp: bạn dẫn dắt rồi mới đưa điểm chính ở cuối câu, đúng chỗ người đọc nhớ nhất.', ex: '[[What the government should prioritise is]] [[affordable housing]].' }
],
quiz: [
{ q: 'All I ___ was ask a simple question.', options: ['did', 'do is', 'done', 'doing'], answer: 0, explain: 'All (that) I did was (to) ask… là câu chẻ với All; did phù hợp quá khứ. do is và doing sai cấu trúc; done thiếu trợ động từ.' },
{ q: 'It was not until 2015 ___ the law changed.', options: ['that', 'when', 'which', 'than'], answer: 0, explain: 'It-cleft dùng that. when, which, than không tạo câu chẻ đúng.' },
{ q: 'A quiet life is ___ she really wants.', options: ['that', 'what', 'which', 'as'], answer: 1, explain: 'Câu chẻ đảo dùng what. that, which, as không nối đúng.' },
{ q: 'I find ___ hard to believe that he resigned.', options: ['it', 'that', 'this', 'he'], answer: 0, explain: 'Tân ngữ giả it bắt buộc: find it hard to believe that… that, this, he không thay được.' },
{ q: 'It is hardly surprising ___ so few people turned up.', options: ['that', 'what', 'which', 'when'], answer: 0, explain: 'It is + adj + that-clause. what / which / when không dùng sau tính từ trong cấu trúc extraposition.' },
{ q: 'It was John ___ broke the window, not Peter.', options: ['who', 'whom', 'whose', 'which'], answer: 0, explain: 'Chủ ngữ là người → who (hoặc that). whom là tân ngữ; whose và which không phù hợp.' },
{ q: 'Câu nào tự nhiên nhất theo nguyên tắc end-weight?', options: ['They gave to the committee the long report that the consultants had prepared.', 'They gave the committee the long report that the consultants had prepared.', 'They gave the long report that the consultants had prepared the committee.', 'They the committee gave the long report that the consultants had prepared.'], answer: 1, explain: 'Cụm ngắn the committee đứng trước, cụm nặng (the long report that…) đứng cuối. Các câu khác đặt cụm nặng ở giữa hoặc sai trật tự. → câu đúng: They gave the committee the long report that the consultants had prepared..' },
{ q: 'Điều tôi cần là thời gian: "___ I need is time."', options: ['It', 'That', 'What', 'Which'], answer: 2, explain: 'Wh-cleft: What I need is time. It / That / Which không tạo cấu trúc chẻ.' },
{ q: 'Câu nào dùng extraposition đúng?', options: ['It annoyed me that nobody told us.', 'That annoyed me nobody told us.', 'It annoyed that nobody told us me.', 'Nobody told us it annoyed me that.'], answer: 0, explain: 'It + V + tân ngữ + that-clause ở cuối. Các câu khác thiếu it hoặc sai trật tự. → câu đúng: It annoyed me that nobody told us..' },
{ q: 'Phần nào sai? "It was in 1998 (A) when (B) the company (C) was founded (D)."', options: ['It was in 1998', 'when', 'the company', 'was founded'], answer: 1, explain: 'It-cleft dùng that: It was in 1998 that… Phần sai là (B).' },
{ q: 'Phần nào sai? "It is no surprise (A) what (B) she was (C) angry (D)."', options: ['It is no surprise', 'what', 'she was', 'angry'], answer: 1, explain: 'Sau no surprise dùng that: It is no surprise that she was angry. Phần sai là (B).' },
{ q: 'Phần nào sai? "A fresh start (A) is (B) that (C) we need (D)."', options: ['A fresh start', 'is', 'that', 'we need'], answer: 2, explain: 'Câu chẻ đảo dùng what: A fresh start is what we need. Phần sai là (C).' }
],
drills: [
{ t: 'fill', q: "It was the manager ___ made the final decision.", a: ["who", "that"], ex: 'It-cleft nhấn người: who / that.' },
{ t: 'fill', q: "___ I'd like you to do is review the figures.", a: ["What"], ex: 'Wh-cleft: What I\'d like you to do is…' },
{ t: 'fill', q: "The only thing we ask ___ that you arrive on time.", a: ["is"], ex: 'Câu chẻ nối bằng is. Câu hoàn chỉnh: The only thing we ask is that you arrive on time.' },
{ t: 'fill', q: "It is unclear ___ the plan will work.", a: ["whether", "if"], ex: 'Extraposition với whether / if.' },
{ t: 'fill', q: "She made it clear ___ she would not accept the offer.", a: ["that"], ex: 'made it clear that… Câu hoàn chỉnh: She made it clear that she would not accept the offer.' },
{ t: 'rewrite', q: "The lack of funding caused the failure.", start: "It was", a: ["It was the lack of funding that caused the failure."], ex: 'It was + phần nhấn + that. Câu hoàn chỉnh: It was the lack of funding that caused the failure.' },
{ t: 'rewrite', q: "The noise bothered me most.", start: "What", a: ["What bothered me most was the noise."], ex: 'Wh-cleft: What bothered me most was the noise.' },
{ t: 'rewrite', q: "That so few people attended is surprising.", start: "It", a: ["It is surprising that so few people attended."], ex: 'Extraposition đưa mệnh đề that ra cuối. → It is surprising that so few people attended..' },
{ t: 'rewrite', q: "I just asked a question.", start: "All", a: ["All I did was ask a question.", "All I did was to ask a question."], ex: 'All I did was ask… (động từ nguyên mẫu hoặc to). → All I did was ask a question..' },
{ t: 'combine', q: "She wants peace and quiet. That is all.", hint: "All she", a: ["All she wants is peace and quiet."], ex: 'Dồn thành câu chẻ All she wants is… → All she wants is peace and quiet..' },
{ t: 'error', parts: ["It was", "in Paris", "when", "we first met."], w: 2, fix: "that", ex: 'It-cleft dùng that. Câu đúng: It was in Paris that we first met.' },
{ t: 'error', parts: ["I find", "hard", "to believe", "his story."], w: 1, fix: "it hard", ex: 'Cần tân ngữ giả it. Câu đúng: I find it hard to believe his story.' },
{ t: 'error', parts: ["A fresh start", "is", "that", "we need."], w: 2, fix: "what", ex: 'Cấu trúc đảo: A fresh start is what we need.' }
]
});

/* C2-3. Thức giả định trang trọng & cấu trúc cố định */
put({
id: 'subjunctive-formal-c2', unit: 'academic', order: 22,
title: 'Thức giả định trang trọng & cụm cố định', en: 'The Formal Subjunctive and Fixed Expressions', level: 'C2', emoji: '🎩',
summary: 'Ngoài mandative that + V nguyên mẫu, C2 gặp were-giả định, lest, whether it be…, be he… và các cụm cố định (be that as it may, come what may, suffice it to say, far be it from me). Dùng chuẩn xác thể hiện độ chín của văn phong.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Mandative: S + demand / insist + that + S + V (nguyên mẫu / not V)', parts: [ { t: 'insist / vital', c: 'verb' }, { t: 'that S', c: 'subj' }, { t: '(not) V', c: 'verb' } ], ex: 'It is vital that she [[not be]] told. The board insisted that he [[resign]].' },
{ label: 'Were-subjunctive: if / as if / were it not for', parts: [ { t: 'if / as if', c: 'if' }, { t: 'S + were', c: 'verb' } ], ex: 'He spoke as if he [[were]] the owner. [[Were it not for]] her help, we would be lost.' },
{ label: 'Lest + (should) + V', parts: [ { t: 'lest', c: 'adv' }, { t: 'S (should) V', c: 'verb' } ], ex: 'She wrote it down [[lest she forget]].' },
{ label: 'Nhượng bộ cố định: Be that as it may · Come what may · Try as I might', parts: [ { t: 'cụm cố định', c: 'adv' }, { t: 'mệnh đề chính', c: 'obj' } ], ex: '[[Be that as it may]], the rule stands. [[Try as I might]], I could not open it.' }
] },
{ type: 'uses', items: [
{ title: 'Quy định, điều lệ, khuyến nghị chính thức', ex: 'The committee recommended that the fee [[be waived]].', vi: 'Ủy ban khuyến nghị miễn phí.' },
{ title: 'Giả định trái thực tế, trang trọng', ex: 'If the evidence [[were]] to emerge, the case would collapse.', vi: 'Nếu bằng chứng xuất hiện thì vụ kiện sụp đổ.' },
{ title: 'Nhượng bộ trang trọng rồi tiếp tục lập luận', ex: '[[Be that as it may]], we cannot ignore the cost.', vi: 'Dù thế nào đi nữa, ta không thể bỏ qua chi phí.' },
{ title: 'Lời lẽ nhún nhường, khéo léo', ex: '[[Far be it from me]] to criticise, but the figures are wrong.', vi: 'Tôi không dám chê, nhưng số liệu sai rồi.' },
{ title: 'Rào đón trước khi nói điều khó nghe', ex: '[[Suffice it to say]] that the project failed.', vi: 'Chỉ cần nói rằng dự án đã thất bại.' }
] },
{ type: 'table', head: ['Cụm cố định', 'Nghĩa', 'Ví dụ'], rows: [
['Be that as it may', 'dù vậy', 'Be that as it may, we must continue.'],
['Come what may', 'dù điều gì xảy ra', 'I will support you, come what may.'],
['Suffice it to say', 'chỉ cần nói là', 'Suffice it to say, it was a disaster.'],
['Far be it from me to…', 'tôi không dám…', 'Far be it from me to interfere.'],
['So be it', 'được thôi, chấp nhận', 'If they refuse, so be it.'],
['Whether it be A or B', 'dù là A hay B', 'Whether it be rain or shine, we go.']
] },
{ type: 'tip', text: 'Phủ định mandative: that + not + V (that he not be told). Anh-Anh thường dùng should: that he should not be told. Chủ ngữ ngôi ba vẫn không thêm -s: it is vital that she tell him (không nói she tells).' },
{ type: 'tip', text: 'Cẩn thận ý nghĩa: insist that he submit = đòi anh ta nộp (mandative); insist that he submitted = khăng khăng rằng anh ta đã nộp (khẳng định, chỉ sự việc). Hai câu khác hẳn nhau về nghĩa.' },
{ type: 'mistake', wrong: 'The committee recommended that the fee is waived.', right: 'The committee recommended that the fee be waived.', why: 'Mandative subjunctive dùng be (nguyên mẫu), không dùng is.' },
{ type: 'mistake', wrong: 'It is essential that she tells him.', right: 'It is essential that she tell him.', why: 'Không thêm -s với chủ ngữ ngôi ba trong mandative.' },
{ type: 'mistake', wrong: 'Come what will, I stay.', right: 'Come what may, I stay.', why: 'Cụm cố định là come what may.' },
{ type: 'mistake', wrong: 'Try as I might to, I could not open it.', right: 'Try as I might, I could not open it.', why: 'Cấu trúc Try as I might không thêm to.' },
{ type: 'ielts', text: 'Trong Task 2 (và Speaking Part 3), mandative subjunctive tạo giọng đề xuất chuẩn mực: It is essential that governments invest… Dùng một lần ở phần kiến nghị là đủ ấn tượng.', ex: 'It is essential that governments [[invest]] in early education.' }
],
quiz: [
{ q: 'Be that ___ it may, we must continue.', options: ['as', 'so', 'how', 'what'], answer: 0, explain: 'Cụm cố định Be that as it may. so / how / what không tạo cụm này.' },
{ q: 'Come what ___, I will support you.', options: ['will', 'may', 'does', 'is'], answer: 1, explain: 'Cụm cố định come what may. Các dạng còn lại không tạo cụm đúng.' },
{ q: 'The board insisted (đòi hỏi) that the director ___ the report.', options: ['submit', 'submits', 'submitted', 'is submitting'], answer: 0, explain: 'Đòi hỏi → mandative: submit. submits sai thức giả định; submitted nghĩa khác (khăng khăng đã nộp); is submitting sai.' },
{ q: 'It is vital that she ___ told before Monday.', options: ['not be', 'is not', 'does not be', 'not is'], answer: 0, explain: 'Mandative phủ định: not + be → not be told. Các dạng còn lại sai cấu trúc.' },
{ q: '___ it not for your help, we would be in trouble now.', options: ['Were', 'Had', 'Should', 'Was'], answer: 0, explain: 'Hiện tại giả định → Were it not for. Had cần been; Should và Was không dùng trong đảo ngữ này.' },
{ q: 'Try ___ I might, I could not lift it.', options: ['as', 'so', 'what', 'that'], answer: 0, explain: 'Try as I might là cấu trúc nhượng bộ cố định. so / what / that không dùng.' },
{ q: 'Far ___ it from me to criticise.', options: ['be', 'is', 'was', 'been'], answer: 0, explain: 'Cụm cố định Far be it from me. Is / was / been không dùng.' },
{ q: 'She spoke as if she ___ the owner.', options: ['were', 'is being', 'had be', 'would be'], answer: 0, explain: 'As if + were giả định, trang trọng. Các dạng còn lại sai hình thái.' },
{ q: 'He wrote down the address lest he ___ it.', options: ['forget', 'forgets', 'forgot', 'will forget'], answer: 0, explain: 'Lest + (should) + nguyên mẫu: lest he forget. Các dạng khác không hợp lest.' },
{ q: 'Suffice it ___ that the plan failed.', options: ['to say', 'saying', 'to be said', 'say'], answer: 0, explain: 'Suffice it to say là cụm cố định. Các dạng khác sai.' },
{ q: 'Phần nào sai? "The committee recommended (A) that the fee (B) is (C) waived (D)."', options: ['recommended', 'that the fee', 'is', 'waived'], answer: 2, explain: 'Mandative cần be: be waived. Phần sai là (C).' },
{ q: 'Phần nào sai? "It is essential (A) that every employee (B) completes (C) the form (D)."', options: ['essential', 'every employee', 'completes', 'the form'], answer: 2, explain: 'Mandative: complete (không -s). Phần sai là (C).' }
],
drills: [
{ t: 'rewrite', q: "The panel said: \"The report must be published.\" (insisted that)", start: "The panel insisted that the report", a: ["The panel insisted that the report be published."], ex: "Mandative: that + S + be + V-ed." },
{ t: 'rewrite', q: "If it were not for her help, we would be lost. (Were)", start: "Were", a: ["Were it not for her help, we would be lost."], ex: "Đảo ngữ giả định hiện tại: Were it not for…" },
{ t: 'fill', q: "Be that ___ it may, the rule stands.", a: ["as"], ex: 'Be that as it may. Câu hoàn chỉnh: Be that as it may, the rule stands.' },
{ t: 'fill', q: "Come what ___, we will go ahead.", a: ["may"], ex: 'come what may. Câu hoàn chỉnh: Come what may, we will go ahead.' },
{ t: 'fill', q: "It is essential that every student ___ the form. (complete)", a: ["complete"], ex: 'Mandative: complete (không -s).' },
{ t: 'fill', q: "She suggested that he ___ the report earlier. (submit)", a: ["submit"], ex: 'Mandative sau suggest: submit.' },
{ t: 'fill', q: "___ it not for the rain, we would have a picnic. (Were / Had)", a: ["Were"], ex: 'Hiện tại giả định: Were it not for…' },
{ t: 'verb', q: "The council demanded that the road ___ (be) repaired at once.", a: ["be"], ex: 'Mandative với bị động: be repaired.' },
{ t: 'verb', q: "He behaves as if he ___ (be) the owner.", a: ["were"], ex: 'As if + were. Câu hoàn chỉnh: He behaves as if he were the owner.' },
{ t: 'rewrite', q: "It is vital that nobody should enter. (mandative)", start: "It is vital that nobody", a: ["It is vital that nobody enter."], ex: 'Bỏ should: nobody enter. Câu hoàn chỉnh: It is vital that nobody enter.' },
{ t: 'rewrite', q: "However hard I tried, I could not open it. (Try)", start: "Try", a: ["Try as I might, I could not open it.", "Try as I may, I could not open it."], ex: 'Try as I might… Câu hoàn chỉnh: Try as I might, I could not open it.' },
{ t: 'combine', q: "She wrote it down. She didn't want to forget it.", hint: "lest", a: ["She wrote it down lest she forget it.", "She wrote it down lest she should forget it."], ex: 'lest + (should) + nguyên mẫu. → She wrote it down lest she forget it..' },
{ t: 'error', parts: ["The panel", "insisted", "that he", "pays", "the fine."], w: 3, fix: "pay", ex: 'Mandative không thêm -s. Câu đúng: The panel insisted that he pay the fine.' },
{ t: 'error', parts: ["Come", "what will,", "I stay."], w: 1, fix: "what may,", ex: 'Cụm cố định come what may. Câu đúng: Come what may, I stay.' },
{ t: 'error', parts: ["It is vital", "that she", "is not told."], w: 2, fix: "not be told.", ex: 'Mandative phủ định: not be told.' }
]
});

/* C2-4. Điều kiện nâng cao & điều kiện ngầm */
put({
id: 'conditionals-nuance-c2', unit: 'academic', order: 23,
title: 'Điều kiện sắc thái & điều kiện ngầm', en: 'Conditional Nuance and Implied Conditions', level: 'C2', emoji: '🔑',
summary: 'Điều kiện C2 không chỉ If + thì: should / happen to / were to đổi mức độ khả năng; will / would trong mệnh đề if mang sắc thái lịch sự hay bực bội; but for, given, left alone và "One more… and…" mang nghĩa điều kiện mà không có if.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Khả năng thấp: If + should / happen to / were to', parts: [ { t: 'If S should', c: 'if' }, { t: 'V', c: 'verb' }, { t: ', imperative / will', c: 'result' } ], ex: 'If you [[should]] see her, tell her to ring me. [[Should you happen]] to see her, tell her…' },
{ label: 'Giả định xa vời: If + were to (+ would)', parts: [ { t: 'If S were to', c: 'if' }, { t: 'V', c: 'verb' }, { t: ', would V', c: 'result' } ], ex: 'If the bank [[were to]] fail, the whole system would be at risk.' },
{ label: 'Điều kiện ngầm: Given / But for / Left alone / One more … and', parts: [ { t: 'Given / But for', c: 'adv' }, { t: 'N / V-ed', c: 'obj' }, { t: ', S would / will', c: 'result' } ], ex: '[[Given more time]], we could have finished. [[But for]] his help, we would have failed.' },
{ label: 'Cụm danh từ / lệnh + and / or + kết quả', parts: [ { t: 'imperative', c: 'verb' }, { t: 'and / or', c: 'adv' }, { t: 'kết quả', c: 'result' } ], ex: '[[One more mistake and]] you\'re out. [[Say that again and]] I\'ll leave.' }
] },
{ type: 'uses', items: [
{ title: 'Lịch sự khi nhờ: will / would trong mệnh đề if', ex: 'If you [[would]] take a seat, the doctor will see you shortly.', vi: 'Xin mời ngồi, bác sĩ sẽ khám cho ông ngay.' },
{ title: 'Bực bội vì thói quen: will trong mệnh đề if', ex: 'If you [[will]] keep leaving the door open, don\'t be surprised when it\'s cold.', vi: 'Nếu cứ để cửa mở thì đừng ngạc nhiên khi lạnh.' },
{ title: 'Hạn chế điều kiện: if anything, if at all, if ever', ex: 'She rarely, [[if ever]], complains. If anything, I\'m too cautious.', vi: 'Cô hiếm khi, nếu có, than phiền. Nếu có gì, thì là tôi quá thận trọng.' },
{ title: 'Điều kiện không cần if: Without / Given / Provided / Left alone', ex: '[[Left alone]], the plant will die within a week.', vi: 'Để yên thì cây chết trong một tuần.' },
{ title: 'Điều kiện hỗn hợp (mixed)', ex: 'If it [[hadn\'t been]] for her advice, I\'d still be unemployed.', vi: 'Nếu không có lời khuyên của cô, giờ tôi vẫn thất nghiệp.' }
] },
{ type: 'table', head: ['Cấu trúc', 'Sắc thái', 'Ví dụ'], rows: [
['If + should', 'khả năng thấp, thường nói lịch sự', 'If you should need help, call me.'],
['If + happen to', 'tình cờ, ngẫu nhiên', 'If you happen to pass a bank…'],
['If + were to', 'giả định xa vời / lý thuyết', 'If prices were to double…'],
['But for / Without', 'nếu không có … thì đã …', 'But for the storm, we\'d have arrived.'],
['Provided / Given', 'với điều kiện, xét rằng', 'Given the cost, we declined.']
] },
{ type: 'tip', text: 'Mệnh đề if không dùng will chỉ tương lai (If it rains, not If it will rain). Ngoại lệ có ý nghĩa: will = chịu / sẵn lòng (If you will wait) hoặc = cứ khăng khăng (If he will insist). Đây là điểm phân biệt người học C2.' },
{ type: 'tip', text: 'Mixed conditional (đảo thì): nguyên nhân quá khứ → kết quả hiện tại. If I had taken the job, I would be living in Berlin now. Ngược lại: If she were more careful, she wouldn\'t have made that mistake.' },
{ type: 'mistake', wrong: 'If you will see her, tell her to ring me.', right: 'If you should see her, tell her to ring me. / Should you see her, tell her…', why: 'Khả năng thấp dùng should; will trong mệnh đề if không chỉ tương lai đơn thuần.' },
{ type: 'mistake', wrong: 'Should you to change your mind, call me.', right: 'Should you change your mind, call me.', why: 'Sau Should đảo ngữ là nguyên mẫu, không có to.' },
{ type: 'mistake', wrong: 'If I would have known, I would have told you.', right: 'If I had known, I would have told you.', why: 'Mệnh đề if quá khứ không có thật dùng had + V-ed, không dùng would have.' },
{ type: 'mistake', wrong: 'Without your help, we would fail. (kể chuyện đã xảy ra)', right: 'Without your help, we would have failed. / But for your help, we would have failed.', why: 'Điều kiện quá khứ không có thật cần would have + V-ed.' },
{ type: 'ielts', text: 'Trong Task 2, một câu điều kiện đảo (Should governments fail to act, …) hoặc Were + to thể hiện kiểm soát cấu trúc. Dùng chỉ để nêu giả thiết, không thay cho lập luận.', ex: '[[Should governments fail to act]], emissions will continue to rise.' }
],
quiz: [
{ q: '___ you happen to see Anna, please tell her to call me.', options: ['Should', 'Would', 'Might', 'Did'], answer: 0, explain: 'Đảo ngữ khả năng thấp: Should you happen to see… Would, Might, Did không tạo cấu trúc này.' },
{ q: '___ more time, we could have finished the project.', options: ['Given', 'Giving', 'Having given', 'To give'], answer: 0, explain: 'Given + danh từ = nếu được cho / xét đến. Giving và Having given sai nghĩa; To give không dùng để mở điều kiện.' },
{ q: 'One more delay and the contract ___ cancelled.', options: ['will be', 'is being', 'has', 'were being'], answer: 0, explain: 'Điều kiện ngầm: One more delay and… + will be. Các dạng còn lại sai thì hoặc sai cấu trúc.' },
{ q: '___ it not been for the rain, we would have gone.', options: ['Had', 'Were', 'Should', 'If'], answer: 0, explain: 'Quá khứ giả định đảo ngữ: Had it not been for… Were dùng hiện tại; Should và If không đảo ngữ như vậy.' },
{ q: 'If it ___ been for her advice, I would still be unemployed.', options: ['hadn\'t', 'weren\'t', 'isn\'t', 'wasn\'t'], answer: 0, explain: 'If it hadn\'t been for… (nguyên nhân quá khứ); weren\'t / isn\'t / wasn\'t không đi với been.' },
{ q: 'If you ___ any questions, don\'t hesitate to ask.', options: ['should have', 'will have', 'would have', 'would be having'], answer: 0, explain: 'If you should have… (khả năng thấp, lịch sự). will have / would have sai thì; are having sai nghĩa.' },
{ q: '___ your support, the project would have collapsed.', options: ['But for', 'Unless', 'Despite', 'Except'], answer: 0, explain: 'But for = nếu không có. Unless / Despite / Except không phù hợp cấu trúc.' },
{ q: 'She rarely, if ___, complains.', options: ['ever', 'never', 'once', 'sometimes'], answer: 0, explain: 'rarely, if ever = hiếm khi, nếu có. never lặp phủ định; once và sometimes sai nghĩa.' },
{ q: 'Câu nào dùng will đúng nghĩa lịch sự?', options: ['If you will wait a moment, I\'ll find him.', 'If it will rain, I\'ll stay.', 'If he will win, he\'ll be rich.', 'If prices will rise, we\'ll lose.'], answer: 0, explain: 'If you will wait = nếu bạn vui lòng chờ. Các câu còn lại dùng will chỉ tương lai trong mệnh đề if, sai.' },
{ q: 'Câu nào sai?', options: ['If the bank were to fail, many would suffer.', 'Should you change your mind, let me know.', 'Without your help, I would have failed.', 'Should you to change your mind, let me know.'], answer: 3, explain: 'Sau Should đảo ngữ là nguyên mẫu, không to. Ba câu còn lại đúng.' },
{ q: 'Phần nào sai? "Should (A) you to (B) change your mind, (C) call me (D)."', options: ['Should', 'you to', 'change your mind', 'call me'], answer: 1, explain: 'Bỏ to: Should you change your mind. Phần sai là (B).' },
{ q: 'Phần nào sai? "But for (A) his advice, (B) I would fail (C) the exam (D)." (chuyện đã xảy ra)', options: ['But for', 'his advice', 'I would fail', 'the exam'], answer: 2, explain: 'Quá khứ cần would have failed. Phần sai là (C).' }
],
drills: [
{ t: 'rewrite', q: "If you happen to see him, say hello. (Should)", start: "Should", a: ["Should you happen to see him, say hello."], ex: "Đảo ngữ: Should + you + happen to + V." },
{ t: 'fill', q: "If you ___ happen to see him, give him my regards.", a: ["should"], ex: 'If you should happen to… khả năng thấp.' },
{ t: 'fill', q: "___ you need any help, just call. (Should / If)", a: ["Should"], ex: 'Đảo ngữ không if: Should you need…' },
{ t: 'fill', q: "If prices ___ to double, many families would struggle.", a: ["were"], ex: 'If + were to + V. Câu hoàn chỉnh: If prices were to double, many families would struggle.' },
{ t: 'fill', q: "___ for the storm, we would have arrived on time.", a: ["But"], ex: 'But for + danh từ. Câu hoàn chỉnh: But for the storm, we would have arrived on time.' },
{ t: 'fill', q: "He rarely, if ___, loses his temper.", a: ["ever"], ex: 'rarely, if ever. Câu hoàn chỉnh: He rarely, if ever, loses his temper.' },
{ t: 'fill', q: "One more mistake and you ___ out.", a: ["are", "'re"], ex: 'Điều kiện ngầm: One more mistake and you\'re out.' },
{ t: 'rewrite', q: "If we had been given more time, we could have finished.", start: "Given", a: ["Given more time, we could have finished."], ex: 'Given + danh từ. Câu hoàn chỉnh: Given more time, we could have finished.' },
{ t: 'rewrite', q: "If you should change your mind, let me know. (đảo ngữ)", start: "Should", a: ["Should you change your mind, let me know."], ex: 'Bỏ If, đảo should lên đầu. Câu hoàn chỉnh: Should you change your mind, let me know.' },
{ t: 'rewrite', q: "If it hadn't been for her help, we would have failed.", start: "But for", a: ["But for her help, we would have failed."], ex: 'But for + danh từ. Câu hoàn chỉnh: But for her help, we would have failed.' },
{ t: 'combine', q: "If you leave it alone, the plant will die.", hint: "Left", a: ["Left alone, the plant will die."], ex: 'Mệnh đề phân từ với nghĩa điều kiện. → Left alone, the plant will die..' },
{ t: 'error', parts: ["Should", "you to", "need help,", "ask me."], w: 1, fix: "you", ex: 'Bỏ to sau Should đảo ngữ. Câu đúng: Should you need help, ask me.' },
{ t: 'error', parts: ["Without", "your help,", "we would", "fail."], w: 3, fix: "have failed.", ex: 'Quá khứ cần would have failed.' },
{ t: 'error', parts: ["If it", "will rain,", "I'll stay."], w: 1, fix: "rains,", ex: 'Không dùng will chỉ tương lai trong mệnh đề if.' }
]
});

/* C2-5. Tỉnh lược & thay thế, ngữ pháp văn nói */
put({
id: 'ellipsis-substitution-c2', unit: 'academic', order: 24,
title: 'Tỉnh lược & thay thế, ngữ pháp văn nói', en: 'Ellipsis, Substitution and Spoken Grammar', level: 'C2', emoji: '✂️',
summary: 'Người bản xứ bỏ từ nào được tự hiểu và thay cụm dài bằng từ ngắn (so, not, do so, one, to). C2 cần biết chỗ nào được lược, chỗ nào gây mơ hồ, và các nét văn nói như left dislocation, tail, vague language.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Lược trợ động từ / động từ chính sau and, but, or', parts: [ { t: 'S + aux V', c: 'subj' }, { t: ', and S + aux (V lược)', c: 'aux' } ], ex: 'She can sing and [[dance]]. I haven\'t seen it, but Tom [[has]].' },
{ label: 'Stranded to / aux: lặp lại phần ngắn nhất', parts: [ { t: '… to', c: 'adv' }, { t: '(V lược)', c: 'note' } ], ex: 'I\'d love [[to]]. She said she would, and she [[did]]. I didn\'t, but I should [[have]].' },
{ label: 'Thay thế: so / not / do so / one(s)', parts: [ { t: 'think / hope / do', c: 'verb' }, { t: 'so / not / so', c: 'obj' } ], ex: 'Will it rain? I [[hope so]] / I\'m afraid [[so]] / I [[hope not]]. He was asked to leave but refused to [[do so]].' },
{ label: 'Tương đồng: so + aux + S / nor + aux + S', parts: [ { t: 'So / Neither / Nor', c: 'adv' }, { t: 'aux', c: 'aux' }, { t: 'S', c: 'subj' } ], ex: 'She can swim, and [[so can]] I. He didn\'t apologise, [[nor did]] she.' }
] },
{ type: 'uses', items: [
{ title: 'Lược đầu câu trong văn nói', ex: '(It) sounds good. (I) hope you\'re well. (Have you) seen Anna?', vi: 'Bỏ chủ ngữ it, I ở đầu câu thân mật.' },
{ title: 'Trả lời ngắn mà vẫn đủ nghĩa', ex: '"Will they come?" "I think [[so]]." / "I\'d say [[not]]."', vi: 'Tôi nghĩ là có. / Tôi cho là không.' },
{ title: 'Thay thế trang trọng: do so / such / the former', ex: 'She was asked to leave and declined [[to do so]].', vi: 'Cô được yêu cầu rời đi và từ chối.' },
{ title: 'Left dislocation & tail trong văn nói', ex: 'That new teacher, [[she\'s]] brilliant. / It\'s lovely, [[that]].', vi: 'Cô giáo mới ấy, cô tuyệt lắm.' },
{ title: 'Vague language làm mềm lời nói', ex: 'Let\'s grab a coffee [[or something]]. We bought chairs [[and stuff]].', vi: 'Mình đi cà phê hay gì đó. Mua ghế các thứ.' }
] },
{ type: 'table', head: ['Kiểu', 'Ví dụ', 'Lưu ý'], rows: [
['Lược động từ chính', 'I\'ve read it; she hasn\'t.', 'giữ trợ động từ khớp dạng'],
['Giữ to', 'I\'d love to. / I didn\'t want to.', 'không lặp động từ'],
['so / not thay mệnh đề that', 'I hope so. / I hope not.', 'không nói I hope it'],
['do so', 'He failed to do so.', 'trang trọng; do it là tự nhiên hơn'],
['one / ones', 'the red one; those ones', 'thay danh từ đếm được']
] },
{ type: 'tip', text: 'Phần lược phải khôi phục được và khớp hình thức: She has finished and I haven\'t (khớp). Không nói She has finished and I don\'t; phải khớp trợ động từ: and I haven\'t. Phép thử: thêm đầy đủ phần lược, câu có đúng không?' },
{ type: 'tip', text: 'Cẩn thận mơ hồ: She likes the dog more than me = hơn tôi thích, hoặc hơn cô ấy thích tôi. Muốn rõ, thêm phần lược: than I do / than she likes me.' },
{ type: 'mistake', wrong: 'Will they come? I hope it.', right: 'Will they come? I hope so.', why: 'Thay mệnh đề that bằng so / not, không dùng it.' },
{ type: 'mistake', wrong: 'He hasn\'t finished yet, and neither I have.', right: 'He hasn\'t finished yet, and neither have I.', why: 'Neither / nor đòi hỏi đảo trợ động từ trước chủ ngữ.' },
{ type: 'mistake', wrong: 'I didn\'t go, but I wish I did.', right: 'I didn\'t go, but I wish I had.', why: 'Tiếc việc quá khứ dùng wish + had + V-ed; lược V-ed nhưng giữ had.' },
{ type: 'mistake', wrong: 'A: Will it rain? B: I\'m afraid yes.', right: 'A: Will it rain? B: I\'m afraid so.', why: 'Sau afraid, hope, think, suppose dùng so / not, không dùng yes / no.' },
{ type: 'ielts', text: 'Trong Speaking Part 3, lược và thay thế giúp trả lời lưu loát, không lặp. Một lược đúng chỗ nghe như người bản xứ; lược sai nghe như câu hỏng.', ex: '"Do you think children should use phones?" "I\'d say [[not]], at least until they\'re twelve."' }
],
quiz: [
{ q: '"Will she come?" "I hope ___."', options: ['so', 'it', 'that', 'to'], answer: 0, explain: 'Sau hope thay mệnh đề bằng so. it, that, to đều sai cấu trúc.' },
{ q: 'He asked her to sign, but she refused to do ___ (trang trọng, pháp lý).', options: ['so', 'such', 'thus', 'thereby'], answer: 0, explain: 'refuse to do so là dạng trang trọng, thay cụm đã nhắc. such, thus, thereby không thay được động từ ở vị trí này.' },
{ q: 'Anna didn\'t want to join us, but I think she ___.', options: ['should have', 'should to', 'did to', 'has'], answer: 0, explain: 'Lược động từ chính: she should have (joined). should to và did to sai; has thiếu động từ trước.' },
{ q: 'I haven\'t seen the film, but Tom ___.', options: ['has', 'is', 'does', 'did'], answer: 0, explain: 'Lược khớp trợ động từ haven\'t → has. is, does, did không khớp.' },
{ q: 'She can play the violin, and ___ her sister.', options: ['so can', 'as can', 'so does', 'can so'], answer: 0, explain: 'Đồng điệu: so + can + S. as can và so does sai; can so sai trật tự.' },
{ q: 'He didn\'t apologise, and ___ did she.', options: ['nor', 'so', 'also', 'either'], answer: 0, explain: 'Nor + trợ động từ + S. so và also sai nghĩa; either không đứng đầu mệnh đề đảo.' },
{ q: 'Câu nào là văn nói thân mật điển hình (left dislocation)?', options: ['That new teacher, she\'s brilliant.', 'The new teacher is brilliant.', 'It is claimed that the teacher is brilliant.', 'Brilliant is the new teacher.'], answer: 0, explain: 'Left dislocation: nhắc chủ ngữ ra đầu rồi lặp bằng đại từ she. Ba câu còn lại là chuẩn viết hoặc đảo ngữ.' },
{ q: 'Câu nào mơ hồ?', options: ['She likes the dog more than me.', 'She likes the dog more than she likes me.', 'She likes the dog more than I do.', 'She likes the dog.'], answer: 0, explain: 'than me có thể là than tôi thích, hoặc than cô ấy thích tôi. Ba câu còn lại rõ nghĩa.' },
{ q: 'Trong "Let\'s grab a coffee or something", cụm or something có tác dụng gì?', options: ['làm mềm lời rủ, không áp đặt', 'chỉ đồ uống thứ hai', 'là câu hỏi phụ', 'là lệnh'], answer: 0, explain: 'Vague language làm mềm lời đề nghị, cho thấy không nhất thiết là cà phê.' },
{ q: 'I\'d go if I ___.', options: ['could', 'can', 'will', 'was going'], answer: 0, explain: 'If I could (go) lược động từ lặp. can / will / was going sai thì cho giả định.' },
{ q: 'Phần nào sai? "He hasn\'t finished yet (A), and (B) neither (C) I have (D)."', options: ['He hasn\'t finished yet', 'and', 'neither', 'I have'], answer: 3, explain: 'Neither + trợ động từ + S: neither have I. Phần sai là (D).' },
{ q: 'Phần nào sai? "A: Will it rain? B: I\'m (A) afraid (B) yes (C)."', options: ['I\'m', 'afraid', 'yes', 'rain'], answer: 2, explain: 'Sau afraid dùng so / not, không dùng yes. Phần sai là (C).' }
],
drills: [
{ t: 'rewrite', q: "She can cook, and he can cook too. (so)", start: "She", a: ["She can cook, and so can he."], ex: "so + can + S thay cho can cook too." },
{ t: 'fill', q: "\"Is it going to rain?\" \"I'm afraid ___.\"", a: ["so"], ex: 'afraid so. Câu hoàn chỉnh: "Is it going to rain?" "I\'m afraid so."' },
{ t: 'fill', q: "\"Will he be late?\" \"I hope ___.\"", a: ["not"], ex: 'hope not. Câu hoàn chỉnh: "Will he be late?" "I hope not."' },
{ t: 'fill', q: "She can speak Chinese, and so ___ her brother.", a: ["can"], ex: 'so + can + S. Câu hoàn chỉnh: She can speak Chinese, and so can her brother.' },
{ t: 'fill', q: "She didn't ask, and ___ did he.", a: ["nor", "neither"], ex: 'nor / neither + did + S. Câu hoàn chỉnh: She didn\'t ask, and nor did he.' },
{ t: 'fill', q: "I'd love ___. (come)", a: ["to"], ex: 'Giữ to, bỏ động từ. Câu hoàn chỉnh: I\'d love to.' },
{ t: 'fill', q: "I've seen it, but he ___.", a: ["hasn't"], ex: 'Lược khớp: hasn\'t. Câu hoàn chỉnh: I\'ve seen it, but he hasn\'t.' },
{ t: 'rewrite', q: "She promised to call and then she called.", start: "She promised to call and then she", a: ["She promised to call and then she did."], ex: 'Lược động từ chính, giữ did. → She promised to call and then she did..' },
{ t: 'rewrite', q: "He was asked to leave, but he refused to leave. (trang trọng)", start: "He was asked to leave, but he refused", a: ["He was asked to leave, but he refused to do so."], ex: 'to do so thay cụm đã nêu. Câu hoàn chỉnh: He was asked to leave, but he refused to do so.' },
{ t: 'rewrite', q: "I expect that it won't rain. (dùng not)", start: "I", a: ["I expect not.", "I don't expect so."], ex: 'Rút gọn bằng so / not. Câu hoàn chỉnh: I expect not.' },
{ t: 'combine', q: "Tom can't swim. Mai can't swim.", hint: "nor", a: ["Tom can't swim, nor can Mai.", "Tom can't swim, and nor can Mai.", "Tom can't swim, and neither can Mai.", "Tom can't swim, neither can Mai."], ex: 'nor / neither + can + S. Câu hoàn chỉnh: Tom can\'t swim, nor can Mai.' },
{ t: 'error', parts: ["Will they come?", "I hope", "it."], w: 2, fix: "so.", ex: 'Thay bằng so. Câu đúng: Will they come? I hope so' },
{ t: 'error', parts: ["He has left,", "and", "so I have."], w: 2, fix: "so have I.", ex: 'so + trợ động từ + S. Câu đúng: He has left, and so have I' },
{ t: 'error', parts: ["I'd like to go,", "but I can't to."], w: 1, fix: "but I can't.", ex: 'Sau can\'t không có to; chỉ giữ to sau want / like / love.' }
]
});

/* C2-6. Rào đón tinh tế, giữ khoảng cách & động từ tường thuật */
put({
id: 'hedging-distance-c2', unit: 'academic', order: 25,
title: 'Rào đón tinh tế, giữ khoảng cách & động từ tường thuật', en: 'Nuanced Hedging, Distance and Reporting Verbs', level: 'C2', emoji: '🌫️',
summary: 'C2 điều chỉnh mức chắc chắn bằng thì quá khứ, would, trạng từ, và chọn động từ tường thuật cho thấy người viết tin hay nghi ngờ (admit, point out vs claim, allege, purport).',
blocks: [
{ type: 'formula', rows: [
{ label: 'Tăng khoảng cách: quá khứ / would / could', parts: [ { t: 'was wondering / would seem', c: 'aux' }, { t: 'if / that…', c: 'obj' } ], ex: 'I [[was wondering]] whether you could help. It [[would seem]] that the data are flawed.' },
{ label: 'Thang chắc chắn của trạng từ & cụm', parts: [ { t: 'possibly < probably < almost certainly', c: 'adv' } ], ex: 'The cause is [[almost certainly]] structural. It is [[conceivable]] that…' },
{ label: 'Tường thuật trung tính vs hoài nghi', parts: [ { t: 'admit / reveal', c: 'verb' }, { t: 'vs claim / allege', c: 'verb' } ], ex: 'She [[admitted]] the error. He [[claims]] the money was lost.' },
{ label: 'Giới hạn phạm vi: on the face of it, by and large, to the best of my knowledge', parts: [ { t: 'cụm giới hạn', c: 'adv' }, { t: 'mệnh đề', c: 'obj' } ], ex: '[[On the face of it]], the plan seems sound. [[To the best of my knowledge]], no complaint was made.' }
] },
{ type: 'uses', items: [
{ title: 'Lịch sự, giảm áp lực khi nhờ', ex: 'I [[was wondering]] if you [[might]] have a moment.', vi: 'Không biết anh có chút thời gian không ạ.' },
{ title: 'Đưa kết luận dè dặt trong bài học thuật', ex: 'The results [[would appear to]] suggest a link, though the sample is small.', vi: 'Kết quả dường như gợi ý một mối liên hệ, dù mẫu nhỏ.' },
{ title: 'Giữ khoảng cách với một khẳng định', ex: 'The letter [[purports to]] come from the minister.', vi: 'Bức thư được cho là của bộ trưởng (nhưng có thể không thật).' },
{ title: 'Tường thuật có thái độ', ex: 'The company [[conceded]] that the figures were wrong.', vi: 'Công ty thừa nhận con số sai.' },
{ title: 'Gắn nhãn hoài nghi', ex: 'The [[so-called]] experts failed to agree. The [[alleged]] fraud involved millions.', vi: 'Những "chuyên gia" ấy không thống nhất. Vụ gian lận bị cáo buộc liên quan hàng triệu.' }
] },
{ type: 'table', head: ['Nhóm động từ', 'Ví dụ', 'Thái độ người viết'], rows: [
['Thực tế (factive)', 'admit, acknowledge, point out, reveal, confirm', 'tin điều được nói là đúng'],
['Không thực tế (non-factive)', 'claim, allege, contend, maintain, purport, profess', 'giữ khoảng cách; có thể nghi ngờ'],
['Trung tính', 'say, state, report, note', 'không bình luận'],
['Dè dặt', 'suggest, imply, indicate, appear to', 'chỉ gợi ý, không khẳng định']
] },
{ type: 'tip', text: 'Quá khứ không phải lúc nào cũng chỉ quá khứ: I was wondering / I wanted to ask / I thought you might… giữ khoảng cách để lịch sự. Thêm would / could / might làm lời đề nghị mềm hơn nữa.' },
{ type: 'tip', text: 'Đừng rào đón mọi câu. Ở C2, hedge chính xác (một chỗ đáng ngờ) hơn là hedge hết. Câu quan trọng nhất (thesis) cần rõ ràng.' },
{ type: 'mistake', wrong: 'The minister admitted that the funds were safe.', right: 'The minister insisted that the funds were safe.', why: 'Admit nghĩa là thừa nhận điều bất lợi; lời bảo đảm dùng insist / claim / maintain.' },
{ type: 'mistake', wrong: 'It definitely seems that the data may be flawed.', right: 'It would seem that the data are flawed. / The data may be flawed.', why: 'Tránh chồng rào đón và khẳng định (definitely + may). Chọn một mức.' },
{ type: 'mistake', wrong: 'He purports that the figures are correct.', right: 'He claims that the figures are correct. / He purports to show that…', why: 'Purport dùng với to + động từ (purports to be / to show), không đi với that.' },
{ type: 'mistake', wrong: 'Studies suggest that sleep definitely improves memory.', right: 'Studies suggest that sleep improves memory. / Studies suggest that sleep may improve memory.', why: 'Suggest đã là rào đón; definitely mâu thuẫn.' },
{ type: 'ielts', text: 'IELTS Writing band 8–9 chấm cao khả năng dùng hedging chính xác (tend to, would appear to, to some extent) và chọn động từ tường thuật phù hợp với độ tin cậy của nguồn.', ex: 'Some critics [[contend]] that the policy is flawed, though evidence [[suggests]] otherwise.' }
],
quiz: [
{ q: 'The minister ___ that the funds had been misused, though no evidence has been produced.', options: ['claimed', 'admitted', 'revealed', 'confirmed'], answer: 0, explain: 'Chưa có bằng chứng → động từ không thực tế: claimed. admitted, revealed, confirmed ngầm nói điều đúng.' },
{ q: 'The letter ___ to come from the Treasury, but the signature is forged.', options: ['purports', 'admits', 'reveals', 'proves'], answer: 0, explain: 'Purports to + V (được cho là, thực ra có thể giả). Các dạng khác không nối to + động từ.' },
{ q: 'Câu nào lịch sự, ngập ngừng nhất?', options: ['I wonder if you can help.', 'I am wondering if you can help.', 'I was wondering if you could help.', 'Can you help?'], answer: 2, explain: 'Quá khứ + could tăng khoảng cách, lịch sự nhất. Các câu khác trực tiếp hơn. → câu đúng: I was wondering if you could help..' },
{ q: 'Cụm nào thể hiện mức chắc chắn cao nhất?', options: ['It is conceivable that', 'It is likely that', 'It is almost certain that', 'It may be that'], answer: 2, explain: 'Almost certain là mức cao nhất. Conceivable thấp nhất; likely và may be ở giữa.' },
{ q: 'On the ___ of it, the plan seems sound, but the details are missing.', options: ['face', 'look', 'top', 'head'], answer: 0, explain: 'Cụm cố định on the face of it = thoạt nhìn. Các từ khác không tạo cụm này.' },
{ q: 'To the best of my ___, no complaints have been made.', options: ['knowledge', 'knowing', 'known', 'knows'], answer: 0, explain: 'Cụm cố định to the best of my knowledge. Các dạng khác sai.' },
{ q: 'Từ nào cho thấy người viết nghi ngờ nhãn mác?', options: ['so-called', 'leading', 'renowned', 'respected'], answer: 0, explain: 'The so-called experts ngụ ý nghi ngờ. leading, renowned, respected đều tích cực.' },
{ q: 'He ___ his mistake only after the audit.', options: ['acknowledged', 'alleged', 'contended', 'professed'], answer: 0, explain: 'Acknowledged: thừa nhận điều đúng. alleged, contended, professed ngụ ý nghi vấn hoặc tuyên bố.' },
{ q: 'Câu nào tự nhiên và nhất quán?', options: ['It would seem that the data are flawed.', 'It definitely would seem that the data may be flawed.', 'It would definitely may seem that the data are flawed.', 'It seems certainly may be that data are flawed.'], answer: 0, explain: 'Chỉ câu 1 dùng một mức rào đón rõ ràng. Các câu còn lại chồng chéo hoặc sai cấu trúc.' },
{ q: 'The sample is small, so the findings ___ be treated with caution.', options: ['should', 'will', 'did', 'are'], answer: 0, explain: 'should be treated là lời khuyên dè dặt. will quá mạnh; did và are sai cấu trúc bị động.' },
{ q: 'Phần nào sai? "Studies suggest (A) that sleep definitely (B) improves (C) memory (D)."', options: ['suggest', 'definitely', 'improves', 'memory'], answer: 1, explain: 'Suggest là rào đón, definitely mâu thuẫn. Phần sai là (B).' },
{ q: 'Phần nào sai? "He purports (A) that (B) the figures (C) are accurate (D)."', options: ['purports', 'that', 'the figures', 'are accurate'], answer: 1, explain: 'Purports đi với to + động từ (purports to show). Phần sai là (B).' }
],
drills: [
{ t: 'rewrite', q: "I want to ask a favour. (ngập ngừng hơn, was wondering)", start: "I was wondering", a: ["I was wondering if I could ask a favour.","I was wondering whether I could ask a favour.","I was wondering if I might ask a favour."], ex: "Quá khứ tiếp diễn + could / might tăng khoảng cách lịch sự." },
{ t: 'rewrite', q: "She claims to be the author. (purports)", start: "She", a: ["She purports to be the author."], ex: "Purports to + V giữ khoảng cách như claims to." },
{ t: 'fill', q: "She ___ that the plan had failed, which surprised nobody. (admitted / claimed)", a: ["admitted"], ex: 'Thừa nhận điều đúng: admitted.' },
{ t: 'fill', q: "He ___ that he was innocent, but nobody believed him. (claimed / confirmed)", a: ["claimed"], ex: 'Giữ khoảng cách: claimed. Câu hoàn chỉnh: He claimed that he was innocent, but nobody believed him.' },
{ t: 'fill', q: "The document ___ to be an official record. (purports)", a: ["purports"], ex: 'purports to be. Câu hoàn chỉnh: The document purports to be an official record.' },
{ t: 'fill', q: "On the ___ of it, the offer looks generous.", a: ["face"], ex: 'on the face of it. Câu hoàn chỉnh: On the face of it, the offer looks generous.' },
{ t: 'fill', q: "To the best of my ___, nothing was changed.", a: ["knowledge"], ex: 'to the best of my knowledge.' },
{ t: 'rewrite', q: "I wonder if you can help me. (lịch sự hơn)", start: "I was", a: ["I was wondering if you could help me."], ex: 'was wondering + could. Câu hoàn chỉnh: I was wondering if you could help me.' },
{ t: 'rewrite', q: "It seems that the data are unreliable. (dè dặt hơn bằng would)", start: "It would", a: ["It would seem that the data are unreliable."], ex: 'would seem tăng khoảng cách. → It would seem that the data are unreliable..' },
{ t: 'combine', q: "The firm said the profits had risen. We have not checked this.", hint: "claimed", a: ["The firm claimed that the profits had risen.", "The firm claimed profits had risen."], ex: 'Claimed giữ khoảng cách vì chưa kiểm chứng.' },
{ t: 'error', parts: ["He", "purports", "that", "the figures are correct."], w: 2, fix: "to show that", ex: 'Purports to show that… Câu đúng: He purports to show that the figures are correct.' },
{ t: 'error', parts: ["Studies suggest that sleep", "definitely improves", "memory."], w: 1, fix: "may improve", ex: 'Suggest đã là rào đón; definitely mâu thuẫn.' }
]
});

/* C2-7. Trạng từ thái độ, đánh giá & nói giảm */
put({
id: 'stance-irony-c2', unit: 'academic', order: 26,
title: 'Trạng từ thái độ, đánh giá & nói giảm', en: 'Stance Adverbials, Evaluation and Understatement', level: 'C2', emoji: '🎭',
summary: 'Trạng từ thái độ (admittedly, tellingly, regrettably) cho thấy người nói nghĩ gì về nội dung. Nói giảm (not unreasonable, no mean feat, hardly the most tactful) và mỉa mai tạo sắc thái tinh vi bằng ngữ pháp, không cần từ mạnh.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Stance adverb + , + mệnh đề', parts: [ { t: 'Tellingly / Regrettably', c: 'adv' }, { t: ',', c: 'arrow' }, { t: 'S V', c: 'subj' } ], ex: '[[Tellingly]], no one objected. [[Regrettably]], the funding was cut.' },
{ label: 'Nói giảm bằng phủ định: not + adj trái nghĩa / no + adj + N', parts: [ { t: 'not un- / no mean', c: 'neg' }, { t: 'N / adj', c: 'obj' } ], ex: 'It was [[not an unreasonable]] request. Finishing was [[no mean feat]].' },
{ label: 'Hardly / scarcely + the most + adj', parts: [ { t: 'hardly the most', c: 'adv' }, { t: 'adj + N', c: 'obj' } ], ex: 'That was [[hardly the most tactful]] remark.' },
{ label: 'Mức độ làm mềm: somewhat / a touch / rather / faintly', parts: [ { t: 'a touch / faintly', c: 'adv' }, { t: 'adj', c: 'obj' } ], ex: 'She sounded [[faintly amused]]. The soup is [[a touch]] salty.' }
] },
{ type: 'uses', items: [
{ title: 'Thể hiện thái độ với nội dung (khách quan hóa)', ex: '[[Mercifully]], the rain held off.', vi: 'May thay, trời không mưa.' },
{ title: 'Nhượng bộ trước khi phản bác (admittedly)', ex: '[[Admittedly]], the plan is costly, but it will last decades.', vi: 'Đúng là kế hoạch tốn kém, nhưng sẽ bền hàng thập kỷ.' },
{ title: 'Báo hiệu điều thú vị / đáng chú ý', ex: '[[Curiously]], she never mentioned it.', vi: 'Lạ là cô ấy không bao giờ nhắc đến.' },
{ title: 'Nói giảm để khen hoặc chê kín đáo', ex: 'Winning by forty points was [[not a bad result]].', vi: 'Thắng cách biệt bốn mươi điểm thì là kết quả "không tệ".' },
{ title: 'Mỉa mai bằng cú pháp', ex: '"Well, [[that went well]]," she said as the stage collapsed.', vi: '"Ổn quá nhỉ," cô nói khi sân khấu sập.' }
] },
{ type: 'table', head: ['Trạng từ', 'Nghĩa thái độ', 'Ví dụ'], rows: [
['admittedly', 'đúng là (nhượng bộ)', 'Admittedly, it is expensive.'],
['arguably', 'có thể cho rằng', 'She is arguably the best.'],
['regrettably / mercifully', 'đáng tiếc / may thay', 'Regrettably, it failed.'],
['predictably / understandably', 'như dự đoán / dễ hiểu', 'Predictably, prices rose.'],
['tellingly / notably', 'đáng chú ý, nói lên điều gì đó', 'Tellingly, he left early.'],
['ironically', 'trớ trêu thay', 'Ironically, the fire station burned down.']
] },
{ type: 'tip', text: 'Trạng từ thái độ thường đứng đầu câu + dấu phẩy. Cũng có thể đứng giữa (She had, regrettably, resigned) hoặc cuối (…, admittedly). Đừng nhầm với trạng từ cách thức: He spoke frankly (cách) ≠ Frankly, he spoke too long (thái độ).' },
{ type: 'tip', text: 'Nói giảm không phải nói dối: not unhappy = hơi hài lòng, dè dặt; không đồng nghĩa với happy. Hiệu ứng nằm ở khoảng trống giữa lời nói và điều bạn thực nghĩ.' },
{ type: 'mistake', wrong: 'Frankly spoken, I didn\'t enjoy the film.', right: 'Frankly speaking, I didn\'t enjoy the film. / Frankly, I didn\'t enjoy the film.', why: 'Cố định là frankly speaking hoặc chỉ frankly; frankly spoken không dùng.' },
{ type: 'mistake', wrong: 'Coincidentally, the fire station burned down. (ý trớ trêu)', right: 'Ironically, the fire station burned down.', why: 'Trớ trêu (ngược với điều mong đợi) dùng ironically; coincidentally chỉ trùng hợp.' },
{ type: 'mistake', wrong: 'It was not a mean feat.', right: 'It was no mean feat.', why: 'Cụm cố định no mean feat, không phải not a mean.' },
{ type: 'mistake', wrong: 'Ironic, the fire station burned down.', right: 'Ironically, the fire station burned down.', why: 'Trạng từ thái độ cần đuôi -ly: ironically.' },
{ type: 'ielts', text: 'Trong bài Task 2, một trạng từ thái độ đặt đúng chỗ (Admittedly / Arguably / Regrettably) giúp thể hiện lập trường mà không viết "I think" lặp lại.', ex: '[[Arguably]], public transport is the most effective solution.' }
],
quiz: [
{ q: 'Chọn trạng từ biểu thị người nói thấy điều đó đáng tiếc: "___, the funding was cut."', options: ['Regrettably', 'Predictably', 'Admittedly', 'Frankly'], answer: 0, explain: 'Regrettably = đáng tiếc. Predictably = như dự đoán; Admittedly = nhượng bộ; Frankly = thẳng thắn.' },
{ q: '"Winning by forty points was not a bad result." Đây là gì?', options: ['nói giảm', 'nói quá', 'ẩn dụ', 'lời nói dối'], answer: 0, explain: 'Not a bad = rất tốt, nói giảm bằng phủ định.' },
{ q: '"I was not unhappy with the offer" hàm ý:', options: ['khá hài lòng, dè dặt', 'rất vui', 'rất buồn', 'không quan tâm'], answer: 0, explain: 'Not unhappy là litotes: hài lòng ở mức dè dặt.' },
{ q: '___ the plan is expensive, but it will last for decades.', options: ['Admittedly', 'Mercifully', 'Predictably', 'Ironically'], answer: 0, explain: 'Admittedly nhượng bộ trước khi phản bác. Các trạng từ khác không có chức năng nhượng bộ.' },
{ q: '___, the fire station burned down.', options: ['Ironically', 'Admittedly', 'Frankly', 'Notably'], answer: 0, explain: 'Trớ trêu (ngược mong đợi) → ironically.' },
{ q: '"That was hardly the most diplomatic remark" ngầm nói lời đó:', options: ['rất thiếu khéo léo', 'rất khéo léo', 'bình thường', 'không liên quan'], answer: 0, explain: 'Hardly the most… nói giảm: thực ra thiếu tế nhị. → câu đúng: rất thiếu khéo léo.' },
{ q: 'Finishing the marathon in the heat was no ___ feat.', options: ['mean', 'average', 'mere', 'meaning'], answer: 0, explain: 'Cụm cố định no mean feat = một thành tích đáng nể. Các từ khác sai.' },
{ q: '"Well, that went well!" sau khi sân khấu sập là:', options: ['mỉa mai', 'nói giảm', 'nhượng bộ', 'khen thật'], answer: 0, explain: 'Nói điều tích cực về chuyện tệ = mỉa mai.' },
{ q: 'Câu nào đúng?', options: ['Frankly speaking, I disagree.', 'Frankly spoken, I disagree.', 'Frank speaking, I disagree.', 'Frankness, I disagree.'], answer: 0, explain: 'Frankly speaking hoặc Frankly là dạng chuẩn.' },
{ q: 'Mercifully, the rain held off. Mercifully nghĩa là:', options: ['may thay', 'thật đáng tiếc', 'như dự đoán', 'trớ trêu'], answer: 0, explain: 'Mercifully = may thay. → câu đúng: may thay.' },
{ q: 'Phần nào sai? "Frankly spoken (A), I didn\'t (B) enjoy (C) the film (D)."', options: ['Frankly spoken', 'I didn\'t', 'enjoy', 'the film'], answer: 0, explain: 'Cần Frankly speaking / Frankly. Phần sai là (A).' },
{ q: 'Phần nào sai? "Winning the title (A) was not a mean (B) feat (C) for a small club (D)."', options: ['Winning the title', 'was not a mean', 'feat', 'for a small club'], answer: 1, explain: 'Cụm cố định no mean feat → was no mean feat. Phần sai là (B).' }
],
drills: [
{ t: 'rewrite', q: "Sadly, the plan failed. (Regrettably)", start: "Regrettably", a: ["Regrettably, the plan failed."], ex: "Regrettably đứng đầu câu + dấu phẩy." },
{ t: 'rewrite', q: "It was a good result. (nói giảm với bad)", start: "It was", a: ["It was not a bad result."], ex: "Nói giảm bằng not + từ trái nghĩa bad." },
{ t: 'rewrite', q: "It is hard to finish a marathon. (no mean feat)", start: "Finishing", a: ["Finishing a marathon is no mean feat."], ex: "no mean feat = thành tích đáng nể." },
{ t: 'fill', q: "___, the project cost twice as much as planned. (Predictably / Mercifully)", a: ["Predictably"], ex: 'Như dự đoán → Predictably. Câu hoàn chỉnh: Predictably, the project cost twice as much as planned.' },
{ t: 'fill', q: "___, the rain stopped just before the ceremony. (Mercifully / Regrettably)", a: ["Mercifully"], ex: 'Điều may mắn → Mercifully. Câu hoàn chỉnh: Mercifully, the rain stopped just before the ceremony.' },
{ t: 'fill', q: "___, the film is long, but it is also beautiful. (Admittedly)", a: ["Admittedly"], ex: 'Nhượng bộ → Admittedly. Câu hoàn chỉnh: Admittedly, the film is long, but it is also beautiful.' },
{ t: 'fill', q: "It was no ___ feat to climb the mountain in a day.", a: ["mean"], ex: 'no mean feat. Câu hoàn chỉnh: It was no mean feat to climb the mountain in a day.' },
{ t: 'fill', q: "That was hardly the most ___ answer. (tactful)", a: ["tactful"], ex: 'Hardly the most tactful. Câu hoàn chỉnh: That was hardly the most tactful answer.' },
{ t: 'fill', q: "It was ___ a bad result. (nói giảm: khá tốt)", a: ["not"], ex: 'Not a bad result là nói giảm.' },
{ t: 'rewrite', q: "I speak frankly: I disagree. (Frankly)", start: "Frankly", a: ["Frankly, I disagree."], ex: 'Frankly + dấu phẩy. Câu hoàn chỉnh: Frankly, I disagree.' },
{ t: 'combine', q: "The plan is expensive. It will last for decades.", hint: "Admittedly", a: ["Admittedly, the plan is expensive, but it will last for decades."], ex: 'Admittedly + but. Câu hoàn chỉnh: Admittedly, the plan is expensive, but it will last for decades.' },
{ t: 'error', parts: ["Frankly", "spoken,", "I disagree."], w: 1, fix: "speaking,", ex: 'Frankly speaking. Câu đúng: Frankly speaking, I disagree.' },
{ t: 'error', parts: ["It was", "not a mean", "feat."], w: 1, fix: "no mean", ex: 'no mean feat. Câu đúng: It was no mean feat.' }
]
});

/* C2-8. Văn phong danh từ dày đặc & bị động tu từ */
put({
id: 'nominal-style-c2', unit: 'academic', order: 27,
title: 'Văn phong danh từ dày đặc & bị động tu từ', en: 'Dense Nominal Style and the Stylistic Passive', level: 'C2', emoji: '🏛️',
summary: 'Văn viết trang trọng nén thông tin vào cụm danh từ (the government\'s controversial decision to raise the retirement age) và dùng bị động để giữ mạch, giấu tác nhân, hoặc đưa thông tin mới về cuối. Biết cả hai phía: nén đúng chỗ, mở ra khi quá dày.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Cụm danh từ: det + tính từ + danh từ phân loại + N + hậu bổ nghĩa', parts: [ { t: 'the recent', c: 'adv' }, { t: 'government-funded research project', c: 'obj' }, { t: 'on sleep', c: 'adv' } ], ex: '[[The recent government-funded research project on sleep]] challenged old assumptions.' },
{ label: 'Nén mệnh đề thành danh từ hóa', parts: [ { t: 'The failure of / rapid expansion of', c: 'subj' }, { t: 'V', c: 'verb' }, { t: '…', c: 'obj' } ], ex: '[[The failure of the talks]] led to renewed violence. [[Rapid expansion]] exposed the firm to risk.' },
{ label: 'Bị động giữ mạch & giấu tác nhân', parts: [ { t: 'N (cũ)', c: 'subj' }, { t: 'be + V-ed', c: 'passive' }, { t: '(by + tác nhân mới)', c: 'obj' } ], ex: 'The results were published last year. They [[were later confirmed by an independent team]].' },
{ label: 'Bị động tường thuật / giả chủ ngữ', parts: [ { t: 'It is / S is + said / believed', c: 'passive' }, { t: 'that / to V', c: 'obj' } ], ex: 'It is widely believed that the policy failed. The council is thought [[to have misused]] the grant.' }
] },
{ type: 'uses', items: [
{ title: 'Gói nguyên nhân thành chủ ngữ', ex: '[[Growing dependence on imports]] has weakened the economy.', vi: 'Sự phụ thuộc ngày càng tăng vào hàng nhập đã làm yếu nền kinh tế.' },
{ title: 'Bị động khi tác nhân không quan trọng / không rõ', ex: 'Several samples [[were contaminated]] during transport.', vi: 'Một số mẫu bị nhiễm bẩn trong quá trình vận chuyển.' },
{ title: 'Bị động để đưa thông tin mới ra cuối (end-focus)', ex: 'The dam [[was designed by a young engineer from Hue]].', vi: 'Con đập do một kỹ sư trẻ ở Huế thiết kế.' },
{ title: 'Động từ + giới từ ở thể bị động', ex: 'The matter [[will be looked into]]. He [[was made to wait]] for hours.', vi: 'Vấn đề sẽ được xem xét. Ông bị bắt chờ hàng giờ.' },
{ title: 'Causative have / get', ex: 'She [[had her bag stolen]] at the station.', vi: 'Cô bị mất túi ở nhà ga.' }
] },
{ type: 'table', head: ['Mệnh đề', 'Danh từ hóa', 'Lưu ý'], rows: [
['The army destroyed the city.', 'the destruction of the city by the army', 'tác nhân sau by'],
['People distrust the media.', 'growing distrust of the media', 'tính từ thay trạng từ'],
['They decided to raise taxes.', 'the decision to raise taxes', 'giữ to-infinitive'],
['The talks failed.', 'the failure of the talks', 'of thay chủ ngữ']
] },
{ type: 'tip', text: 'Danh từ hóa dày đặc nghe học thuật nhưng khó đọc nếu xếp nhiều of liên tiếp (the implementation of the reduction of the cost of…). Quy tắc thực hành: tối đa 2 of liền nhau, rồi mở bằng động từ.' },
{ type: 'tip', text: 'Bị động không phải để tránh trách nhiệm. Dùng khi tác nhân (a) không quan trọng, (b) không rõ, (c) vừa nhắc đến, hoặc (d) bạn muốn đưa tác nhân mới ra cuối. Nếu người đọc cần biết ai làm, giữ chủ động hoặc thêm by.' },
{ type: 'mistake', wrong: 'The destruction of the forest by the logging companies were condemned.', right: 'The destruction of the forest by the logging companies was condemned.', why: 'Chủ ngữ là the destruction (số ít), không phải companies.' },
{ type: 'mistake', wrong: 'The council is thought to misuse the grant last year.', right: 'The council is thought to have misused the grant last year.', why: 'Sự việc trước thời điểm nói cần to have + V-ed.' },
{ type: 'mistake', wrong: 'She had stolen her bag at the station.', right: 'She had her bag stolen at the station.', why: 'Causative have + tân ngữ + V-ed; had stolen her bag nghĩa là cô ấy ăn cắp.' },
{ type: 'mistake', wrong: 'The matter will be looked.', right: 'The matter will be looked into.', why: 'Động từ cụm bị động giữ giới từ: look into → be looked into.' },
{ type: 'ielts', text: 'Trong Writing Task 1 và 2, bị động tường thuật (It is widely believed that…) và một cụm danh từ hóa nén (the rapid expansion of urban areas) cho thấy văn phong học thuật mà không làm câu quá dài.', ex: '[[It is widely acknowledged that]] [[the rapid expansion of cities]] has increased pressure on housing.' }
],
quiz: [
{ q: 'The council is thought ___ the grant last year.', options: ['to have misused', 'having misused', 'to misuse', 'misusing'], answer: 0, explain: 'Sự việc ở quá khứ → to have + V-ed. to misuse nói hiện tại; having misused và misusing sai cấu trúc.' },
{ q: 'He was made ___ for two hours.', options: ['to wait', 'wait', 'waiting', 'waited'], answer: 0, explain: 'Bị động của make + tân ngữ + V thì có to: was made to wait. Các dạng còn lại sai.' },
{ q: 'The matter will be looked ___.', options: ['into', 'at it', 'by', 'to'], answer: 0, explain: 'look into → be looked into. Các lựa chọn khác sai giới từ.' },
{ q: 'The ___ of the old bridge by the army shocked residents.', options: ['destroying', 'destruction', 'destroyed', 'destroy'], answer: 1, explain: 'Danh từ hóa: the destruction of… by… Các dạng khác không làm danh từ với of / by.' },
{ q: 'She had her bag ___ at the station.', options: ['stolen', 'stealing', 'steal', 'to steal'], answer: 0, explain: 'Causative: have + tân ngữ + V-ed. Các dạng khác sai. → câu đúng: She had her bag stolen at the station..' },
{ q: 'Cụm danh từ nào đúng trật tự?', options: ['the recent government-funded research project', 'the government-funded recent research project', 'recent the government-funded research project', 'the research project recent government-funded'], answer: 0, explain: 'Trật tự: mạo từ → tính từ chỉ thời gian → tính từ ghép phân loại → danh từ. Các câu khác sai trật tự.' },
{ q: 'It is widely believed ___ the policy has failed.', options: ['that', 'what', 'which', 'to'], answer: 0, explain: 'It is believed that + mệnh đề. what / which / to không đúng.' },
{ q: 'Câu nào dùng bị động tạo mạch tốt? "The results were published last year. ___"', options: ['They were later confirmed by an independent team.', 'An independent team later confirmed them by.', 'Later confirming an independent team them.', 'They confirmed later independent.'], answer: 0, explain: 'Giữ the results (cũ) làm chủ ngữ, đưa tác nhân mới ra cuối. Các câu khác sai cấu trúc. → câu đúng: Câu nào dùng bị động tạo mạch tốt? "The results were published last year. They were later confirmed by an independent team.".' },
{ q: 'Câu nào mở được danh từ hóa dày đặc để dễ đọc hơn?', options: ['Because the cost rose, many families could no longer afford housing.', 'The rise of the cost of housing of families made affording impossible.', 'Housing cost rise nonaffordability.', 'Rising of costs housing unaffordable families.'], answer: 0, explain: 'Mở thành mệnh đề với because. Các câu còn lại nén quá mức hoặc sai ngữ pháp.' },
{ q: 'Phần nào sai? "The destruction (A) of the forest (B) by the companies (C) were (D) condemned."', options: ['The destruction', 'of the forest', 'by the companies', 'were'], answer: 3, explain: 'Chủ ngữ the destruction số ít → was. Phần sai là (D).' },
{ q: 'Phần nào sai? "The matter (A) will (B) be (C) looked (D)."', options: ['The matter', 'will', 'be', 'looked'], answer: 3, explain: 'Cần looked into: giới từ thiếu. Phần sai là (D).' },
{ q: 'Phần nào sai? "She had (A) her bag (B) steal (C) at the station (D)."', options: ['She had', 'her bag', 'steal', 'at the station'], answer: 2, explain: 'Causative: had her bag stolen (V-ed). Phần sai là (C).' }
],
drills: [
{ t: 'rewrite', q: "Experts believe that the dam leaks. (bị động)", start: "The dam", a: ["The dam is believed to leak.","The dam is believed to be leaking."], ex: "Bị động tường thuật: S + is believed + to V." },
{ t: 'fill', q: "The matter will be looked ___.", a: ["into"], ex: 'be looked into. Câu hoàn chỉnh: The matter will be looked into.' },
{ t: 'fill', q: "She had her phone ___ on the train. (steal)", a: ["stolen"], ex: 'have + tân ngữ + V-ed. Câu hoàn chỉnh: She had her phone stolen on the train.' },
{ t: 'fill', q: "He was made ___ for an hour. (wait)", a: ["to wait"], ex: 'was made to wait. Câu hoàn chỉnh: He was made to wait for an hour.' },
{ t: 'fill', q: "It is widely ___ that the policy has failed. (believe)", a: ["believed"], ex: 'It is believed that. Câu hoàn chỉnh: It is widely believed that the policy has failed.' },
{ t: 'fill', q: "The ___ of the talks led to violence. (fail)", a: ["failure"], ex: 'Danh từ hóa: failure. Câu hoàn chỉnh: The failure of the talks led to violence.' },
{ t: 'rewrite', q: "The army destroyed the city, and this shocked residents.", start: "The destruction", a: ["The destruction of the city by the army shocked residents."], ex: 'Danh từ hóa + by làm chủ ngữ. → The destruction of the city by the army shocked residents..' },
{ t: 'rewrite', q: "People believe that the dam was built in 1950.", start: "The dam", a: ["The dam is believed to have been built in 1950."], ex: 'Bị động tường thuật với to have been. → The dam is believed to have been built in 1950..' },
{ t: 'rewrite', q: "They decided to raise taxes, and this angered voters.", start: "The decision", a: ["The decision to raise taxes angered voters."], ex: 'Danh từ hóa giữ to + V. Câu hoàn chỉnh: The decision to raise taxes angered voters.' },
{ t: 'combine', q: "A researcher designed the dam. The researcher was young.", hint: "by", a: ["The dam was designed by a young researcher."], ex: 'Bị động với tác nhân mới ở cuối. → The dam was designed by a young researcher..' },
{ t: 'error', parts: ["The destruction", "of the cities", "were", "condemned."], w: 2, fix: "was", ex: 'Chủ ngữ the destruction số ít.' },
{ t: 'error', parts: ["The council", "is thought", "to misuse", "the grant last year."], w: 2, fix: "to have misused", ex: 'Quá khứ cần to have misused.' }
]
});

/* C2-9. Liên kết trang trọng, siêu diễn ngôn, thang văn phong */
put({
id: 'discourse-register-c2', unit: 'academic', order: 28,
title: 'Liên kết trang trọng, tín hiệu dẫn dắt & thang văn phong', en: 'Formal Cohesion, Signposting and the Register Ladder', level: 'C2', emoji: '🧭',
summary: 'C2 chọn liên từ theo thang văn phong (but → however → notwithstanding), dùng tín hiệu dẫn dắt (as noted above, in what follows), và nối ý bằng danh từ tóm tắt (this trend, such developments) để văn bản liền mạch dù rất dài.',
blocks: [
{ type: 'formula', rows: [
{ label: 'Notwithstanding / albeit / insofar as', parts: [ { t: 'Notwithstanding + N', c: 'adv' }, { t: ', S V', c: 'obj' } ], ex: '[[Notwithstanding]] these objections, the plan was approved. The gain was real, [[albeit]] modest.' },
{ label: 'Hence / thereby / whereby / thereof', parts: [ { t: 'hence + N', c: 'adv' }, { t: 'thereby + V-ing', c: 'verb' } ], ex: 'The mine closed; [[hence]] the rise in unemployment. The firm cut costs, [[thereby]] raising profits.' },
{ label: 'Tín hiệu dẫn dắt: as noted above · in what follows · to return to', parts: [ { t: 'cụm dẫn dắt', c: 'adv' }, { t: 'mệnh đề', c: 'obj' } ], ex: '[[As noted above]], costs have risen. [[In what follows]], I argue that the policy fails.' },
{ label: 'Danh từ tóm tắt: this + trend / such + developments', parts: [ { t: 'This / Such / These', c: 'adv' }, { t: 'N tóm tắt', c: 'obj' } ], ex: 'Rents have doubled. [[This trend]] has forced families out. [[Such developments]] require action.' }
] },
{ type: 'uses', items: [
{ title: 'Nhượng bộ bằng giới từ (notwithstanding)', ex: '[[Notwithstanding]] the risks, the board proceeded.', vi: 'Bất chấp rủi ro, hội đồng vẫn tiến hành.' },
{ title: 'Nhượng bộ không cần động từ (albeit)', ex: 'A small [[albeit]] significant improvement.', vi: 'Một cải thiện nhỏ nhưng đáng kể.' },
{ title: 'Nguyên nhân – kết quả cô đọng', ex: 'Demand fell; [[hence]] the layoffs.', vi: 'Cầu giảm; vì thế mới có sa thải.' },
{ title: 'Báo trước và nhắc lại (metadiscourse)', ex: 'This point is developed in Section 4; [[for the moment]], it suffices to note…', vi: 'Điểm này được triển khai ở Mục 4; hiện tại chỉ cần lưu ý rằng…' },
{ title: 'Gói ý trước bằng danh từ tóm tắt', ex: 'Wages stagnated. [[This stagnation]] fuelled resentment.', vi: 'Lương trì trệ. Sự trì trệ ấy làm dấy lên bất mãn.' }
] },
{ type: 'table', head: ['Chức năng', 'Thân mật', 'Trung tính', 'Trang trọng'], rows: [
['Đối lập', 'but', 'however', 'nevertheless, notwithstanding'],
['Kết quả', 'so', 'therefore', 'accordingly, hence, consequently'],
['Bổ sung', 'and, plus', 'also, in addition', 'moreover, furthermore'],
['Tương phản song song', 'while', 'whereas', 'whereas, by contrast'],
['Phạm vi', 'as far as', 'to the extent that', 'insofar as']
] },
{ type: 'tip', text: 'Notwithstanding là giới từ (đứng trước hoặc sau danh từ): notwithstanding the delay / the delay notwithstanding; However là trạng từ nối cần dấu phẩy. Albeit đi với tính từ, cụm ngắn, không đi với mệnh đề đầy đủ.' },
{ type: 'tip', text: 'Đừng dồn quá nhiều từ trang trọng vào một đoạn. Một tín hiệu dẫn dắt mỗi mục và một danh từ tóm tắt mỗi đoạn là đủ. Thang văn phong chỉ có ích khi bạn chọn đúng độ cho người đọc.' },
{ type: 'mistake', wrong: 'It was a modest albeit it was significant gain.', right: 'It was a modest albeit significant gain.', why: 'Albeit không đi cùng mệnh đề có động từ; dùng although nếu cần mệnh đề.' },
{ type: 'mistake', wrong: 'Notwithstanding of these objections, the plan passed.', right: 'Notwithstanding these objections, the plan passed.', why: 'Notwithstanding là giới từ, không có of.' },
{ type: 'mistake', wrong: 'The mine closed, hence it was the rise in unemployment.', right: 'The mine closed; hence the rise in unemployment.', why: 'Hence đi với cụm danh từ, không với mệnh đề hoàn chỉnh.' },
{ type: 'mistake', wrong: 'Rents doubled, however families stayed.', right: 'Rents doubled; however, families stayed.', why: 'However cần dấu chấm phẩy trước và dấu phẩy sau, nếu không là lỗi nối câu.' },
{ type: 'ielts', text: 'Band 8–9 đòi hỏi liên kết đa dạng nhưng không máy móc. Dùng một albeit hoặc notwithstanding đúng chỗ, và danh từ tóm tắt (this trend) thay vì lặp lại then, also.', ex: 'Emissions fell, [[albeit]] slowly. [[This trend]] is likely to continue.' }
],
quiz: [
{ q: 'The results were encouraging, ___ limited in scope.', options: ['albeit', 'although it', 'despite', 'whereas'], answer: 0, explain: 'Albeit + tính từ / cụm: albeit limited. although it cần động từ; despite và whereas sai.' },
{ q: '___ these objections, the committee approved the plan.', options: ['Notwithstanding', 'Nevertheless', 'However', 'Whereas'], answer: 0, explain: 'Notwithstanding là giới từ, đi với danh từ. Nevertheless và However là trạng từ cần dấu phẩy; Whereas nối mệnh đề.' },
{ q: 'The mine was closed; ___ the sharp rise in unemployment.', options: ['hence', 'therefore it was', 'thus is', 'so that'], answer: 0, explain: 'Hence + cụm danh từ. Các lựa chọn khác sai cấu trúc.' },
{ q: 'The issue is examined in Section 4; ___, it is enough to note that costs have risen.', options: ['for the moment', 'moreover', 'conversely', 'thereby'], answer: 0, explain: 'For the moment = hiện tại; Các từ khác không đúng chức năng dẫn dắt này.' },
{ q: 'Cách nói trang trọng nhất để bổ sung ý?', options: ['Furthermore', 'On top of that', 'Plus', 'And another thing'], answer: 0, explain: 'Furthermore là trang trọng nhất. Các cách còn lại thân mật.' },
{ q: '___ as the policy reduces waste, it deserves support.', options: ['Insofar', 'Whereas', 'Albeit', 'Hence'], answer: 0, explain: 'Insofar as = đến mức mà. Các từ khác không đi với as.' },
{ q: 'Some regions flourished, ___ others declined.', options: ['whereas', 'hence', 'albeit', 'thereby'], answer: 0, explain: 'Whereas nối hai vế tương phản. Các từ còn lại sai nghĩa.' },
{ q: 'The firm cut costs, ___ increasing profits.', options: ['thereby', 'whereby', 'hereby', 'therein'], answer: 0, explain: 'Thereby + V-ing = nhờ đó. Các từ khác sai chức năng.' },
{ q: 'Rents have doubled. ___ has forced many families out.', options: ['This trend', 'Those trends', 'Such trends is', 'These trend'], answer: 0, explain: 'This trend gói ý trước, hòa hợp số ít với has. Các dạng khác sai.' },
{ q: 'Từ nào là thân mật nhất trong "accordingly / so / hence / consequently"?', options: ['so', 'hence', 'accordingly', 'consequently'], answer: 0, explain: 'So thân mật nhất; ba từ còn lại trang trọng.' },
{ q: 'Phần nào sai? "It was a modest (A) albeit (B) it was (C) significant (D) gain."', options: ['modest', 'albeit', 'it was', 'significant'], answer: 2, explain: 'Albeit không đi với mệnh đề đầy đủ; bỏ it was. Phần sai là (C).' },
{ q: 'Phần nào sai? "Notwithstanding (A) of (B) these objections (C), the plan passed (D)."', options: ['Notwithstanding', 'of', 'these objections', 'the plan passed'], answer: 1, explain: 'Notwithstanding là giới từ, không có of. Phần sai là (B).' }
],
drills: [
{ t: 'rewrite', q: "Although the improvement was slight, it was real. (albeit)", start: "The improvement was real,", a: ["The improvement was real, albeit slight."], ex: "albeit + tính từ, không cần mệnh đề." },
{ t: 'rewrite', q: "Despite the objections, the plan passed. (Notwithstanding)", start: "Notwithstanding", a: ["Notwithstanding the objections, the plan passed."], ex: "Notwithstanding là giới từ trang trọng, đi với danh từ." },
{ t: 'fill', q: "The gain was real, ___ modest. (albeit)", a: ["albeit"], ex: 'albeit + tính từ. Câu hoàn chỉnh: The gain was real, albeit modest.' },
{ t: 'fill', q: "___ the risks, the board went ahead. (Notwithstanding)", a: ["Notwithstanding"], ex: 'Notwithstanding + N. Câu hoàn chỉnh: Notwithstanding the risks, the board went ahead.' },
{ t: 'fill', q: "Demand fell; ___ the layoffs. (hence)", a: ["hence"], ex: 'hence + N. Câu hoàn chỉnh: Demand fell; hence the layoffs.' },
{ t: 'fill', q: "The firm cut costs, ___ raising profits. (thereby)", a: ["thereby"], ex: 'thereby + V-ing. Câu hoàn chỉnh: The firm cut costs, thereby raising profits.' },
{ t: 'fill', q: "___ as the plan is cheap, it should be adopted. (Insofar)", a: ["Insofar"], ex: 'Insofar as. Câu hoàn chỉnh: Insofar as the plan is cheap, it should be adopted.' },
{ t: 'fill', q: "A small ___ significant gain. (albeit)", a: ["albeit"], ex: 'albeit đứng giữa hai tính từ.' },
{ t: 'rewrite', q: "Even though there were objections, the plan passed. (Notwithstanding)", start: "Notwithstanding", a: ["Notwithstanding these objections, the plan passed.", "Notwithstanding the objections, the plan passed.", "Notwithstanding objections, the plan passed."], ex: 'Notwithstanding + N. Câu hoàn chỉnh: Notwithstanding these objections, the plan passed.' },
{ t: 'rewrite', q: "Rents rose and prices rose. (formal)", start: "Rents rose;", a: ["Rents rose; moreover, prices rose.", "Rents rose; furthermore, prices rose."], ex: 'Nối trang trọng bằng moreover / furthermore. → Rents rose; moreover, prices rose..' },
{ t: 'combine', q: "The mine closed. Many people lost their jobs.", hint: "hence", a: ["The mine closed; hence the job losses.", "The mine closed; hence many people lost their jobs."], ex: 'hence + N. Câu hoàn chỉnh: The mine closed; hence the job losses.' },
{ t: 'error', parts: ["Notwithstanding of", "the risks,", "they went on."], w: 0, fix: "Notwithstanding", ex: 'Notwithstanding không có of.' },
{ t: 'error', parts: ["It was a modest gain,", "albeit it was", "real."], w: 1, fix: "albeit", ex: 'Albeit không đi với mệnh đề có động từ.' }
]
});

/* C2-10. Khuyết thiếu & thể: suy đoán quá khứ, hành vi quen thuộc, thể tiếp diễn thái độ */
put({
id: 'modal-aspect-c2', unit: 'academic', order: 29,
title: 'Khuyết thiếu & thể: suy đoán, thói quen, thái độ', en: 'Modals and Aspect: Deduction, Habit and Attitude', level: 'C2', emoji: '🧩',
summary: 'C2 dùng modal perfect (continuous) để suy đoán chuyện quá khứ, will / would cho hành vi đặc trưng, needn\'t have với didn\'t need to, was to have, và thể tiếp diễn cho thái độ (always V-ing, be being).',
blocks: [
{ type: 'formula', rows: [
{ label: 'Suy đoán quá khứ: must / can\'t / might + have + V-ed / been + V-ing', parts: [ { t: 'S', c: 'subj' }, { t: 'must / can\'t / might', c: 'aux' }, { t: 'have been + V-ing', c: 'verb' } ], ex: 'She [[must have been waiting]] for hours. He [[can\'t have been working]]; the lights were off.' },
{ label: 'needn\'t have vs didn\'t need to', parts: [ { t: 'needn\'t have + V-ed', c: 'neg' }, { t: 'didn\'t need to + V', c: 'neg' } ], ex: 'We [[needn\'t have rushed]] (we rushed, unnecessarily). We [[didn\'t need to rush]] (no need; unclear if we did).' },
{ label: 'Hành vi đặc trưng: will / would + V', parts: [ { t: 'S', c: 'subj' }, { t: 'will / would', c: 'aux' }, { t: 'V', c: 'verb' } ], ex: 'He [[will talk]] for hours if you let him. She [[would sit]] by the window every evening.' },
{ label: 'Kế hoạch không thành: was / were to have + V-ed', parts: [ { t: 'S', c: 'subj' }, { t: 'was to have', c: 'aux' }, { t: 'V-ed', c: 'verb' } ], ex: 'He [[was to have signed]] on Friday (but did not).' }
] },
{ type: 'uses', items: [
{ title: 'Suy luận từ bằng chứng quá khứ', ex: 'The ground is wet. It [[must have rained]] overnight.', vi: 'Đất ướt. Chắc đêm qua đã mưa.' },
{ title: 'Phủ nhận khả năng quá khứ', ex: 'She [[can\'t have meant]] it. She loves him.', vi: 'Không thể nào cô có ý đó. Cô yêu anh ấy.' },
{ title: 'Bực bội vì thói quen (always + tiếp diễn)', ex: 'He\'s [[always borrowing]] my pen.', vi: 'Anh ta cứ mượn bút của tôi suốt.' },
{ title: 'Tạm thời cư xử khác thường (be being)', ex: 'He\'s [[being]] rude today. (He is not normally rude.)', vi: 'Hôm nay anh ta đang cư xử thô lỗ (khác mọi khi).' },
{ title: 'Suy luận từ vẻ ngoài (present perfect continuous)', ex: 'Her eyes are red. [[Has she been crying]]?', vi: 'Mắt cô đỏ hoe. Có phải cô vừa khóc?' }
] },
{ type: 'table', head: ['Hình thức', 'Nghĩa', 'Ví dụ'], rows: [
['must have + V-ed', 'chắc chắn đã (suy luận)', 'She must have left.'],
['can\'t / couldn\'t have + V-ed', 'không thể đã', 'He can\'t have known.'],
['might / may have + V-ed', 'có thể đã', 'They might have lied.'],
['might have been + V-ing', 'có thể đang … lúc đó', 'He might have been joking.'],
['should / ought to have + V-ed', 'lẽ ra đã (không làm)', 'You should have called.'],
['needn\'t have + V-ed', 'đã làm mà không cần', 'You needn\'t have come.']
] },
{ type: 'tip', text: 'Must có hai nghĩa: bắt buộc (You must go) và suy luận (He must be tired). Khi suy luận quá khứ, dùng must have + V-ed, không dùng had to. Đối nghĩa phủ định của suy luận là can\'t, không phải mustn\'t.' },
{ type: 'tip', text: 'Will / would đặc trưng chỉ dùng với hành vi tự nhiên, không phải trạng thái: He will sit for hours (đúng) nhưng không nói He will be tall. Would mô tả thói quen quá khứ lặp lại; used to dùng cả trạng thái.' },
{ type: 'mistake', wrong: 'He must had left early.', right: 'He must have left early.', why: 'Sau modal là have (nguyên mẫu), không phải had.' },
{ type: 'mistake', wrong: 'She mustn\'t have been home; the lights were off.', right: 'She can\'t have been home; the lights were off.', why: 'Phủ định suy luận dùng can\'t / couldn\'t; mustn\'t dùng cho cấm đoán.' },
{ type: 'mistake', wrong: 'I needn\'t to have gone.', right: 'I needn\'t have gone.', why: 'Needn\'t là modal, không dùng to.' },
{ type: 'mistake', wrong: 'He is being tall today.', right: 'He is tall.', why: 'Be being chỉ dùng cho hành vi tạm thời (rude, silly, difficult), không dùng cho đặc điểm cố định như tall.' },
{ type: 'ielts', text: 'Trong Speaking Part 2 và 3, modal perfect giúp bạn suy đoán lịch sự và tinh tế: It might have been the weather, or perhaps the cost. Tránh nói chắc quá.', ex: 'It [[might have been]] a misunderstanding, but it [[can\'t have been]] deliberate.' }
],
quiz: [
{ q: 'She ___ been waiting long, because her coffee was still full.', options: ['can\'t have', 'mustn\'t have', 'shouldn\'t have', 'needn\'t have'], answer: 0, explain: 'Suy luận phủ định → can\'t have been. mustn\'t là cấm; shouldn\'t và needn\'t sai nghĩa.' },
{ q: 'The ground is wet. It ___ rained overnight.', options: ['must have', 'must have been', 'must been', 'must be'], answer: 0, explain: 'Must have + V-ed (rained). Các dạng còn lại sai hình thái.' },
{ q: 'They ___ rushed; the flight was delayed.', options: ['needn\'t have', 'didn\'t need', 'mustn\'t have', 'shan\'t have'], answer: 0, explain: 'Đã vội mà không cần → needn\'t have rushed. didn\'t need thiếu to; mustn\'t và shan\'t sai.' },
{ q: 'He ___ talk for hours if you let him.', options: ['will', 'shall', 'can', 'is'], answer: 0, explain: 'Will chỉ hành vi đặc trưng. shall, can, is không có nghĩa này.' },
{ q: '"He was to have signed the contract on Friday" hàm ý anh ta:', options: ['không ký đúng kế hoạch', 'đã ký vào thứ Sáu', 'sẽ ký vào thứ Sáu', 'từ chối ký'], answer: 0, explain: 'Was to have + V-ed = kế hoạch không thành. → câu đúng: không ký đúng kế hoạch.' },
{ q: '"He\'s being rude" khác "He is rude" ở chỗ:', options: ['hôm nay cư xử thô lỗ, khác mọi khi', 'luôn thô lỗ', 'có thể thô lỗ', 'không thô lỗ'], answer: 0, explain: 'Be being + tính từ = cư xử tạm thời khác thường. → câu đúng: hôm nay cư xử thô lỗ, khác mọi khi.' },
{ q: 'Her eyes are red. ___ she been crying?', options: ['Has', 'Is', 'Does', 'Had'], answer: 0, explain: 'Present perfect continuous suy luận từ bằng chứng nhìn thấy: Has she been crying?' },
{ q: 'You ___ as well tell him the truth; he\'ll find out anyway.', options: ['might', 'should as', 'could well', 'must'], answer: 0, explain: 'Might as well = nên làm cũng được. Các dạng khác sai cấu trúc.' },
{ q: 'Câu nào đúng?', options: ['I needn\'t have gone.', 'I needn\'t to have gone.', 'I didn\'t need have gone.', 'I mustn\'t have gone.'], answer: 0, explain: 'Needn\'t have + V-ed. Các câu khác sai cấu trúc hoặc nghĩa. → câu đúng: I needn\'t have gone..' },
{ q: 'Câu nào dùng will sai?', options: ['He will talk for hours.', 'She will go for walks alone.', 'He will be tall.', 'They will argue about nothing.'], answer: 2, explain: 'Will đặc trưng chỉ hành vi, không dùng cho trạng thái be tall.' },
{ q: 'Phần nào sai? "She must (A) have been (B) work (C) all night (D)."', options: ['must', 'have been', 'work', 'all night'], answer: 2, explain: 'Must have been + V-ing: working. Phần sai là (C).' },
{ q: 'Phần nào sai? "He mustn\'t (A) have (B) known (C) the answer (D)." (suy luận)', options: ['mustn\'t', 'have', 'known', 'the answer'], answer: 0, explain: 'Suy luận phủ định dùng can\'t / couldn\'t. Phần sai là (A).' }
],
drills: [
{ t: 'rewrite', q: "I am sure he has been working all night.", start: "He", a: ["He must have been working all night."], ex: "Suy luận chắc chắn đã đang: must have been + V-ing." },
{ t: 'fill', q: "He ___ have known the answer; he looked surprised.", a: ["can't", "couldn't"], ex: 'Phủ định suy luận: can\'t have.' },
{ t: 'fill', q: "The lights are on. They ___ have been working late.", a: ["must", "might", "may"], ex: 'Suy luận: must / might have been working.' },
{ t: 'fill', q: "You ___ have come. I was fine on my own.", a: ["needn't"], ex: 'needn\'t have + V-ed. Câu hoàn chỉnh: You needn\'t have come. I was fine on my own.' },
{ t: 'fill', q: "He ___ sit for hours reading when he was a boy.", a: ["would"], ex: 'Thói quen quá khứ lặp lại: would.' },
{ t: 'fill', q: "He was ___ have arrived at six. (plan failed)", a: ["to"], ex: 'was to have + V-ed. Câu hoàn chỉnh: He was to have arrived at six.' },
{ t: 'rewrite', q: "I am sure she was joking.", start: "She", a: ["She must have been joking."], ex: 'Suy luận chắc chắn đang: must have been + V-ing. → She must have been joking..' },
{ t: 'rewrite', q: "It is impossible that he knew.", start: "He", a: ["He can't have known.", "He couldn't have known."], ex: 'Không thể đã: can\'t / couldn\'t have + V-ed. → He can\'t have known..' },
{ t: 'rewrite', q: "You didn't call me, and that was a mistake.", start: "You", a: ["You should have called me.", "You ought to have called me."], ex: 'Lẽ ra đã: should have. Câu hoàn chỉnh: You should have called me.' },
{ t: 'combine', q: "He borrows my pen all the time. It annoys me.", hint: "always", a: ["He's always borrowing my pen.", "He is always borrowing my pen."], ex: 'Always + tiếp diễn diễn tả bực bội. → He\'s always borrowing my pen..' },
{ t: 'error', parts: ["He", "must had", "left", "early."], w: 1, fix: "must have", ex: 'Sau modal là have. Câu đúng: He must have left early.' },
{ t: 'error', parts: ["She", "mustn't", "have been", "home."], w: 1, fix: "can't", ex: 'Suy luận phủ định dùng can\'t.' },
{ t: 'error', parts: ["I", "needn't to", "have gone."], w: 1, fix: "needn't", ex: 'Needn\'t không có to. Câu đúng: I needn\'t have gone.' }
]
});
})(typeof self !== 'undefined' ? self : this);
