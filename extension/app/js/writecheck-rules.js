/* ✍️ Soát lỗi viết (offline): luật bắt các lỗi hay gặp của người học + gợi ý nâng cấp từ vựng theo CEFR.
 * Dùng cho add-on (soát lỗi trong ô đang gõ trên mọi trang – extension/writecheck.js); thuần JS, không mạng, không phụ thuộc gì.
 * LK_WRITE.check(text) → [{ s, e, type: spelling|grammar|punct|style, reps, rule, title, why, lesson }]
 * title/why là khóa tiếng Việt → dịch qua tx() (bản tiếng Anh: web/js/i18n/en/writecheck.js). lesson = id bài ngữ pháp (#/grammar/<id>). */
(function (g) {
  if (g.LK_WRITE) return;
  const cap = (src, rep) => (/^[A-Z]/.test(src) && rep ? rep[0].toUpperCase() + rep.slice(1) : rep);
  const ING = v => { v = v.toLowerCase(); if (/ie$/.test(v)) return v.slice(0, -2) + 'ying'; if (/[^aeiou]e$/.test(v) && v !== 'be') return v.slice(0, -1) + 'ing'; if (/^(stop|run|swim|get|sit|plan|shop|put|cut|set|begin|travel)$/.test(v)) return v + (v === 'travel' ? 'ling' : v.slice(-1) + 'ing'); return v + 'ing'; };
  const S3 = v => { v = v.toLowerCase(); if (v === 'have') return 'has'; if (v === 'be') return 'is'; if (v === 'do' || v === 'go') return v + 'es'; if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies'; if (/(s|sh|ch|x|z|o)$/.test(v)) return v + 'es'; return v + 's'; };
  const V3 = { went: 'gone', did: 'done', saw: 'seen', came: 'come', ate: 'eaten', took: 'taken', wrote: 'written', spoke: 'spoken', broke: 'broken', began: 'begun', drank: 'drunk', gave: 'given', ran: 'run', swam: 'swum', chose: 'chosen', drove: 'driven', forgot: 'forgotten', knew: 'known', rode: 'ridden', stole: 'stolen', threw: 'thrown', wore: 'worn', grew: 'grown', flew: 'flown', fell: 'fallen', sang: 'sung' };
  const BASE = { went: 'go', came: 'come', saw: 'see', did: 'do', took: 'take', got: 'get', made: 'make', had: 'have', said: 'say', ate: 'eat', wrote: 'write', gave: 'give', knew: 'know', thought: 'think', bought: 'buy', told: 'tell', found: 'find', left: 'leave', felt: 'feel', brought: 'bring', began: 'begin', ran: 'run', spoke: 'speak', understood: 'understand' };
  const SPELL = {
    recieve: 'receive', recieved: 'received', definately: 'definitely', definatly: 'definitely', seperate: 'separate', seperately: 'separately', occured: 'occurred', occurence: 'occurrence', untill: 'until', wich: 'which', becuase: 'because', beacuse: 'because', beleive: 'believe', belive: 'believe', acheive: 'achieve', acheived: 'achieved',
    enviroment: 'environment', enviromental: 'environmental', goverment: 'government', tommorow: 'tomorrow', tomorow: 'tomorrow', accomodation: 'accommodation', accomodate: 'accommodate', arguement: 'argument', begining: 'beginning', beautifull: 'beautiful', carefull: 'careful', wierd: 'weird', alot: 'a lot',
    truely: 'truly', adress: 'address', publically: 'publicly', existance: 'existence', independant: 'independent', neccessary: 'necessary', necesary: 'necessary', refered: 'referred', succesful: 'successful', sucessful: 'successful', successfull: 'successful', writting: 'writing', thier: 'their', noticable: 'noticeable',
    embarass: 'embarrass', calender: 'calendar', comming: 'coming', dissapoint: 'disappoint', dissapointed: 'disappointed', grammer: 'grammar', knowlege: 'knowledge', millenium: 'millennium', persue: 'pursue', posession: 'possession', recomend: 'recommend', recommand: 'recommend', responsability: 'responsibility', tounge: 'tongue',
    finaly: 'finally', realy: 'really', usualy: 'usually', especialy: 'especially', basicly: 'basically', bussiness: 'business', buisness: 'business', foriegn: 'foreign', freind: 'friend', freinds: 'friends', hieght: 'height', intrested: 'interested', langauge: 'language', languge: 'language', oppurtunity: 'opportunity', oportunity: 'opportunity',
    probaly: 'probably', studing: 'studying', sincerly: 'sincerely', developement: 'development', experiance: 'experience', expecially: 'especially', familar: 'familiar', futher: 'further', gaurd: 'guard', happend: 'happened', immediatly: 'immediately', importent: 'important', improvment: 'improvement', libary: 'library',
    maintainance: 'maintenance', mispell: 'misspell', occassion: 'occasion', paralell: 'parallel', particulary: 'particularly', peice: 'piece', populer: 'popular', prefered: 'preferred', priviledge: 'privilege', relevent: 'relevant', restaraunt: 'restaurant', rythm: 'rhythm', shedule: 'schedule', similiar: 'similar',
    strenght: 'strength', suprise: 'surprise', suprised: 'surprised', temperture: 'temperature', thru: 'through', togheter: 'together', tradditional: 'traditional', vaccum: 'vacuum', wheather: 'weather', wether: 'whether', writen: 'written', youre: "you're", dont: "don't", doesnt: "doesn't", didnt: "didn't", cant: "can't", wont: "won't", isnt: "isn't",
  };
  // Nâng cấp từ vựng (học thuật, IELTS Writing): cụm "very + adj" & từ chung chung → từ chính xác hơn. Cấp CEFR của từ gợi ý (khớp academic.json khi có).
  const UPG = {
    'very important': [['crucial', 'B2'], ['vital', 'B2'], ['essential', 'B1']], 'very big': [['enormous', 'B2'], ['huge', 'B1']], 'very large': [['vast', 'B2'], ['enormous', 'B2']], 'very small': [['tiny', 'B1'], ['minute', 'C1']],
    'very good': [['excellent', 'B1'], ['outstanding', 'B2']], 'very bad': [['terrible', 'B1'], ['dreadful', 'B2']], 'very tired': [['exhausted', 'B1']], 'very happy': [['delighted', 'B2'], ['thrilled', 'B2']], 'very sad': [['devastated', 'C1'], ['miserable', 'B2']],
    'very difficult': [['challenging', 'B2'], ['demanding', 'B2']], 'very easy': [['effortless', 'C1'], ['straightforward', 'B2']], 'very interesting': [['fascinating', 'B2'], ['compelling', 'C1']], 'very old': [['ancient', 'B1'], ['antique', 'B2']], 'very fast': [['rapid', 'B2'], ['swift', 'C1']],
    'very quick': [['rapid', 'B2'], ['swift', 'C1']], 'very clear': [['evident', 'B2'], ['obvious', 'B1']], 'very sure': [['certain', 'B1'], ['convinced', 'B2']], 'very angry': [['furious', 'B2']], 'very cold': [['freezing', 'B1']], 'very hot': [['scorching', 'C1'], ['boiling', 'B2']], 'very beautiful': [['stunning', 'B2'], ['gorgeous', 'B1']],
    'very scared': [['terrified', 'B1']], 'very surprised': [['astonished', 'B2'], ['amazed', 'B1']], 'very dangerous': [['hazardous', 'C1'], ['perilous', 'C2']], 'very useful': [['invaluable', 'C1'], ['beneficial', 'B2']], 'very expensive': [['costly', 'B2'], ['exorbitant', 'C2']], 'very cheap': [['inexpensive', 'B2'], ['affordable', 'B1']],
    'very different': [['distinct', 'B2'], ['dissimilar', 'C1']], 'very common': [['widespread', 'B2'], ['prevalent', 'C1']], 'very serious': [['severe', 'B2'], ['grave', 'C1']], 'very strong': [['powerful', 'B1'], ['robust', 'C1']], 'very poor': [['impoverished', 'C1'], ['destitute', 'C2']], 'very rich': [['wealthy', 'B1'], ['affluent', 'C1']],
    'very busy': [['hectic', 'B2']], 'very boring': [['tedious', 'C1'], ['dull', 'B2']], 'very many': [['numerous', 'B2'], ['countless', 'B2']], 'very much': [['greatly', 'B2'], ['considerably', 'B2']],
    'a lot of': [['a great deal of', 'B2'], ['numerous', 'B2'], ['a considerable amount of', 'B2']], 'lots of': [['a wide range of', 'B2'], ['numerous', 'B2']], 'big problem': [['major issue', 'B2'], ['serious concern', 'B2']], 'good point': [['valid point', 'B2']], 'bad effect': [['detrimental effect', 'C1'], ['adverse effect', 'C1']], 'bad effects': [['detrimental effects', 'C1'], ['adverse effects', 'C1']],
    'get better': [['improve', 'A2']], 'think about': [['consider', 'B1']], 'look at': [['examine', 'B1']], 'find out': [['discover', 'B1'], ['determine', 'B2']], 'go up': [['rise', 'B1'], ['increase', 'B1']], 'go down': [['decline', 'B2'], ['decrease', 'B1']], 'nowadays': [['in contemporary society', 'C1'], ['currently', 'B1']],
  };
  const T = { sp: 'spelling', gr: 'grammar', pu: 'punct', st: 'style' };
  // [mẫu, loại, tiêu đề, giải thích, bài học, hàm tạo (m, text) → { s, e, reps } | null]
  const R = [];
  const add = (id, re, type, title, why, lesson, fn) => R.push({ id, re, type, title, why, lesson, fn });
  const whole = m => ({ s: m.index, e: m.index + m[0].length });
  // --- Chính tả ---
  add('spell', /\b[A-Za-z]+\b/g, T.sp, 'Từ hay viết sai', 'Từ này viết sai chính tả. Hãy học cách viết đúng – từ hay sai sẽ được đưa vào thẻ ôn tập.', '', m => { const w = SPELL[m[0].toLowerCase()]; return w ? { ...whole(m), reps: [cap(m[0], w)] } : null; });
  add('i-lower', /(^|[\s(“"])(i)(?=['’]?(m|ve|ll|d)?\b)(?![-.])/g, T.pu, 'Viết hoa “I”', 'Đại từ “I” (tôi) luôn viết hoa, ở bất kỳ vị trí nào trong câu.', 'pronouns', (m, t) => { const s = m.index + m[1].length; if (/^i\.e\b/i.test(t.slice(s))) return null; return { s, e: s + 1, reps: ['I'] }; });
  // --- Mạo từ ---
  add('a-an', /\b(a|an)\s+([A-Za-z][\w-]*)/gi, T.gr, 'Mạo từ a/an', 'Dùng “an” trước từ bắt đầu bằng NGUYÊN ÂM (an apple, an hour – h câm), “a” trước PHỤ ÂM (a book, a university /juː/, a one-day trip). Quyết định theo âm đọc, không theo chữ cái.', 'articles', m => {
    const art = m[1].toLowerCase(), w = m[2].toLowerCase();
    if (/^[A-Z]{2,}/.test(m[2]) || w.length < 2 || /^(informations|advices|equipments|furnitures|knowledges|evidences|homeworks)$/.test(w)) return null; // từ viết tắt (an MBA, a UFO) – bỏ qua
    const silentH = /^(hour|honest|honou?r|heir)/.test(w), yu = /^(uni|use|usu|uti|ura|ure|eu|ewe|one\b|once|ubiq|ukr|ufo)/.test(w);
    const vowel = silentH || (/^[aeiou]/.test(w) && !yu);
    if (art === 'a' && vowel) return { s: m.index, e: m.index + m[1].length, reps: [cap(m[1], 'an')] };
    if (art === 'an' && !vowel) return { s: m.index, e: m.index + m[1].length, reps: [cap(m[1], 'a')] };
    return null;
  });
  // --- Lặp từ ---
  add('dup', /\b([A-Za-z]+)\s+\1\b/gi, T.gr, 'Lặp từ liền nhau', 'Từ này bị gõ lặp hai lần liên tiếp. Xóa bớt một từ.', '', m => (/^(had|that|is|do|very|bye|so|ha|no|knock|tut|bla|blah|can|will)$/i.test(m[1]) ? null : { s: m.index, e: m.index + m[0].length, reps: [m[1]] }));
  // --- Hòa hợp chủ ngữ – động từ ---
  const SVA = 'Chủ ngữ và động từ chưa hòa hợp: he/she/it và danh từ số ít đi với động từ thêm -s/-es (has, does, is, was); I/you/we/they và danh từ số nhiều đi với động từ nguyên mẫu (have, do, are, were).';
  add('sva-3', /\b(he|she|it)\s+(have|do|are|were|go|want|need|like|make|say|think|know|don't|get|seem|look|live|work|play|come)\b/gi, T.gr, 'Hòa hợp chủ ngữ – động từ', SVA, 'subject-verb-agreement', (m, t) => {
    if (/\b(does|did|will|would|can|could|should|must|may|might|to|let|make|help|see|hear|watch)\s+$/i.test(t.slice(Math.max(0, m.index - 12), m.index))) return null; // "did he go", "let it go", "make it work"
    const v = m[2].toLowerCase(), r = { are: 'is', were: 'was', "don't": "doesn't" }[v] || S3(v), s = m.index + m[0].length - m[2].length;
    return { s, e: m.index + m[0].length, reps: [r] };
  });
  add('sva-pl', /\b(they|we|you|people|children)\s+(is|was|has|does|doesn't|goes|wants|needs|likes|makes|says|thinks|knows)\b/gi, T.gr, 'Hòa hợp chủ ngữ – động từ', SVA, 'subject-verb-agreement', m => {
    const v = m[2].toLowerCase(), pl = /^(they|we|you|people|children)$/i.test(m[1]);
    if (!pl) return null;
    const r = { is: 'are', was: 'were', has: 'have', does: 'do', "doesn't": "don't", goes: 'go' }[v] || v.replace(/ies$/, 'y').replace(/s$/, '');
    const s = m.index + m[0].length - m[2].length; return { s, e: m.index + m[0].length, reps: [r] };
  });
  add('sva-i', /\bI\s+(is|has|does|was not|goes|wants|needs|likes|thinks|knows)\b/g, T.gr, 'Hòa hợp chủ ngữ – động từ', SVA, 'subject-verb-agreement', m => {
    const v = m[1], r = { is: 'am', has: 'have', does: 'do', 'was not': 'was not', goes: 'go' }[v] || v.replace(/s$/, '');
    if (r === v) return null; const s = m.index + 2; return { s, e: s + v.length, reps: [r] };
  });
  add('sva-every', /\b(everyone|everybody|someone|somebody|nobody|no one|anyone|anybody|each)\s+(are|have|were|do)\b/gi, T.gr, 'Hòa hợp chủ ngữ – động từ', 'Everyone, somebody, nobody, each… là chủ ngữ SỐ ÍT → động từ chia số ít: everyone is, each has.', 'subject-verb-agreement', m => {
    const r = { are: 'is', have: 'has', were: 'was', do: 'does' }[m[2].toLowerCase()]; const s = m.index + m[0].length - m[2].length; return { s, e: s + m[2].length, reps: [r] };
  });
  // --- Động từ khuyết thiếu & động từ ---
  add('modal-to', /\b(can|could|should|must|might|may|will|would)\s+to\s+(?=[a-z])/gi, T.gr, 'Động từ khuyết thiếu + V nguyên mẫu', 'Sau can/could/should/must/may/might/will/would là động từ nguyên mẫu KHÔNG “to”: You should study (không phải should to study).', 'modals-ability-permission', m => ({ s: m.index, e: m.index + m[0].length, reps: [m[1] + ' '] }));
  add('modal-s', /\b(can|could|should|must|might|may|will|would)\s+(not\s+)?(goes|has|does|is|was|wants|needs|makes|gets|takes|went|did|came)\b/gi, T.gr, 'Động từ khuyết thiếu + V nguyên mẫu', 'Sau can/could/should/must/may/might/will/would là động từ nguyên mẫu KHÔNG “to”: You should study (không phải should to study).', 'modals-ability-permission', m => {
    const v = m[3].toLowerCase(), r = { goes: 'go', has: 'have', does: 'do', is: 'be', was: 'be', went: 'go', did: 'do', came: 'come' }[v] || v.replace(/s$/, ''); const s = m.index + m[0].length - m[3].length; return { s, e: s + v.length, reps: [r] };
  });
  add('modal-of', /\b(could|should|would|must|might)\s+of\b/gi, T.gr, '“could of” → “could have”', '“could’ve / should’ve” nghe giống “of” nhưng phải viết là HAVE: could have + V3 (could have done).', 'modals-deduction', m => { const s = m.index + m[0].length - 2; return { s, e: s + 2, reps: ['have'] }; });
  add('perf-v2', /\b(have|has|had|having)\s+(not\s+|never\s+|already\s+|just\s+)?(went|did|saw|came|ate|took|wrote|spoke|broke|began|drank|gave|ran|swam|chose|drove|forgot|knew|rode|stole|threw|wore|grew|flew|fell|sang)\b/gi, T.gr, 'Thì hoàn thành: have + V3', 'Thì hoàn thành dùng have/has/had + QUÁ KHỨ PHÂN TỪ (V3), không dùng quá khứ đơn (V2): have gone, has eaten, had written.', 'present-perfect', m => {
    const v = m[3].toLowerCase(); const s = m.index + m[0].length - m[3].length; return { s, e: s + v.length, reps: [V3[v]] };
  });
  add('did-v2', /\b(didn't|did not|doesn't|does not|don't|do not|did|does)\s+(went|came|saw|took|got|made|had|said|ate|wrote|gave|knew|thought|bought|told|found|left|felt|brought|began|spoke|understood|goes|has|wants|likes|needs)\b/gi, T.gr, 'Trợ động từ do/does/did + V nguyên mẫu', 'Sau do/does/did (kể cả phủ định và câu hỏi) động từ chính để NGUYÊN MẪU: didn’t go, does she like (không phải didn’t went, does she likes).', 'past-simple', (m, t) => {
    if (/^(did|does)$/i.test(m[1]) && !/[?]/.test(t.slice(m.index, m.index + 80))) return null; // "did" khẳng định nhấn mạnh hiếm – chỉ bắt trong câu hỏi
    const v = m[2].toLowerCase(), r = BASE[v] || { goes: 'go', has: 'have' }[v] || v.replace(/s$/, ''); const s = m.index + m[0].length - m[2].length; return { s, e: s + v.length, reps: [r] };
  });
  add('do-subj-s', /\b(do|does|did|didn't|doesn't|don't)\s+(he|she|it|you|they|we|I|your \w+|the \w+)\s+(likes|wants|needs|goes|has|knows|thinks|went|came|saw|took|had|made|said|liked|wanted|needed|lived|worked|studied|played|finished)\b/gi, T.gr, 'Trợ động từ do/does/did + V nguyên mẫu', 'Sau do/does/did (kể cả phủ định và câu hỏi) động từ chính để NGUYÊN MẪU: didn’t go, does she like (không phải didn’t went, does she likes).', 'past-simple', m => {
    const v = m[3].toLowerCase(), r = BASE[v] || { goes: 'go', has: 'have', studied: 'study' }[v] || v.replace(/ied$/, 'y').replace(/(liv|lik)ed$/, '$1e').replace(/ed$/, '').replace(/s$/, ''); const s = m.index + m[0].length - m[3].length; return { s, e: s + v.length, reps: [r] };
  });
  add('make-to', /\b(make|makes|made|making|let|lets|letting)\s+(me|you|him|her|us|them|it|people|students|children)\s+to\s+(?=[a-z])/gi, T.gr, 'make/let + O + V nguyên mẫu', 'make/let + tân ngữ + động từ nguyên mẫu KHÔNG “to”: It made me laugh, Let him go.', 'gerund-infinitive', m => { const s = m.index + m[0].length - 3; return { s, e: s + 3, reps: [''] }; });
  add('ger', /\b(enjoy|avoid|finish|mind|consider|keep|practise|practice|miss|risk|deny|suggest|imagine|postpone|recommend)(s|ed|ing)?\s+to\s+([a-z]+)\b/gi, T.gr, 'Động từ đi với V-ing', 'Một số động từ luôn đi với V-ING, không đi với “to V”: enjoy, avoid, finish, mind, consider, keep, practise, miss, risk, suggest… → I enjoy reading.', 'gerund-infinitive', m => {
    if (/^(the|a|an|my|your|his|her|our|their|this|that|me|him|them|us|it)$/i.test(m[3])) return null;
    const s = m.index + m[0].length - m[3].length - 3; return { s, e: m.index + m[0].length, reps: [ING(m[3])] };
  });
  add('look-fwd', /\b(look|looks|looked|looking)\s+forward\s+to\s+(meet|see|hear|work|visit|receive|start|join|talk|speak|discuss|welcome|read|travel|study|go|get|have|learn|attend)\b/gi, T.gr, 'look forward to + V-ing', 'Trong “look forward to”, “to” là GIỚI TỪ nên theo sau là V-ING hoặc danh từ: I look forward to hearing from you.', 'gerund-infinitive', m => { const s = m.index + m[0].length - m[2].length; return { s, e: m.index + m[0].length, reps: [ING(m[2])] }; });
  add('be-agree', /\b(am|is|are|was|were)\s+(agree|disagree)\b/gi, T.gr, '“agree” là động từ', '“Agree / disagree” là ĐỘNG TỪ, không dùng với am/is/are: I agree (không phải I am agree).', 'verb-types', m => ({ s: m.index, e: m.index + m[0].length, reps: [m[2]] }));
  add('if-will', /\b(if|when|unless|as soon as)\s+(I|you|he|she|it|we|they)\s+will\s+([a-z]+)\b/gi, T.gr, 'Câu điều kiện loại 1', 'Trong mệnh đề if/when/unless nói về tương lai, dùng HIỆN TẠI ĐƠN, không dùng will: If it rains tomorrow, we will stay home.', 'conditionals-0-1', m => {
    const p = m[2].toLowerCase(), v = m[3].toLowerCase(), third = /^(he|she|it)$/.test(p);
    const r = v === 'be' ? (p === 'i' ? 'am' : third ? 'is' : 'are') : third ? S3(v) : v;
    const s = m.index + m[0].length - m[3].length - 5; return { s, e: m.index + m[0].length, reps: [r] };
  });
  // --- Danh từ, so sánh, giới từ ---
  add('uncount', /\b(informations|advices|equipments|furnitures|knowledges|evidences|homeworks|luggages|baggages|feedbacks|sceneries|machineries|vocabularies(?= is))\b/gi, T.gr, 'Danh từ không đếm được', 'Danh từ KHÔNG đếm được (information, advice, equipment, furniture, knowledge, evidence, homework, luggage, feedback) không có dạng số nhiều -s. Dùng “a piece of / some / much”.', 'countable-uncountable', m => ({ ...whole(m), reps: [cap(m[0], m[0].toLowerCase().replace(/ies$/, 'y').replace(/s$/, ''))] }));
  add('more-er', /\b(more|most)\s+(better|worse|bigger|smaller|faster|easier|cheaper|larger|higher|lower|older|younger|stronger|happier|harder|longer|shorter|best|worst|biggest|easiest|cheapest|largest|highest|happiest|taller|smarter|richer|poorer|warmer|colder|hotter|busier|wider|deeper|safer|nicer|simpler|quicker|slower|louder|cleaner|newer|greater|closer|earlier|heavier|darker|tallest|greatest|smallest|fastest|strongest|oldest|youngest|lowest|longest|shortest|hardest)\b/gi, T.gr, 'So sánh kép sai', 'Tính từ ngắn đã có đuôi -er/-est (better, bigger, easiest) thì KHÔNG thêm more/most: better (không phải more better).', 'comparatives-superlatives', m => ({ s: m.index, e: m.index + m[0].length, reps: [m[2]] }));
  add('then-than', /\b(more|less|better|worse|rather|other|[a-z]{3,}er)\s+then\b/gi, T.gr, '“than” trong so sánh', 'So sánh hơn dùng THAN (bigger than). “Then” nghĩa là “sau đó / khi ấy”.', 'comparatives-superlatives', m => (/^(other|rather|more|less|better|worse)$/i.test(m[1]) || /er$/i.test(m[1]) && !/^(after|never|whether|ever|over|under|together|however|either|neither|order|offer|enter|answer|consider|remember|wonder|matter|number|water|paper|later|layer|player|teacher|user|power|computer)$/i.test(m[1]) ? { s: m.index + m[0].length - 4, e: m.index + m[0].length, reps: ['than'] } : null));
  add('since-for', /\bsince\s+((?:\d+|a|one|two|three|four|five|six|seven|eight|nine|ten|many|several|a few)\s+(?:years?|months?|weeks?|days?|hours?|minutes?|decades?|centuries))\b/gi, T.gr, 'since / for', 'FOR + khoảng thời gian (for three years), SINCE + mốc thời gian (since 2020, since Monday).', 'present-perfect', m => ({ s: m.index, e: m.index + 5, reps: [cap(m[0], 'for')] }));
  const PREP = 'Một số động từ/tính từ đi với giới từ cố định – hoặc KHÔNG có giới từ. Hãy học cả cụm: discuss sth, depend on, interested in, on the other hand.';
  add('discuss-about', /\b(discuss|discussed|discusses|discussing|emphasi[sz]e|emphasi[sz]ed|emphasi[sz]es|mention|mentioned|mentions|reach|reached|enter|entered|marry|married|lack|lacks|lacked)\s+(about|on|to|with|of)\b(?!\s+(a|the)\s+(other|one)\b)/gi, T.gr, 'Giới từ thừa', PREP, 'dependent-prepositions', (m, t) => {
    const v = m[1].toLowerCase(), p = m[2].toLowerCase();
    if (/^(enter|entered)$/.test(v) && p !== 'to') return null; if (/^marr/.test(v) && p !== 'with') return null; if (/^lack/.test(v) && p !== 'of') return null; if (/^reach/.test(v) && p !== 'to') return null; if (/^mention/.test(v) && p !== 'about') return null; if (/^discuss/.test(v) && p !== 'about') return null;
    if (/^lack/.test(v) && /\b(a|the)\s+$/i.test(t.slice(Math.max(0, m.index - 6), m.index))) return null; // "a lack of" đúng
    const s = m.index + m[1].length; return { s, e: m.index + m[0].length, reps: [''] };
  });
  add('dep-prep', /\b(depend|depends|depended|depending|interested|good|famous|responsible|married|different|similar|consist|consists|arrive|arrived|arrives)\s+(of|on|in|at|to|from|with|for|about)\b/gi, T.gr, 'Giới từ đi kèm', PREP, 'dependent-prepositions', m => {
    const w0 = m[1].toLowerCase(), v = /^(interested|famous|married|responsible|different|similar|good)$/.test(w0) ? w0 : w0.replace(/(s|ed|ing)$/, '').replace(/^arriv$/, 'arrive'), p = m[2].toLowerCase(); // tính từ giữ nguyên (interested, famous, married – không cắt đuôi)
    const OK = { depend: ['on'], interested: ['in'], famous: ['for'], responsible: ['for', 'to'], married: ['to'], different: ['from', 'to'], similar: ['to'], consist: ['of', 'in'], arrive: ['at', 'in'], good: ['at', 'for', 'to', 'with', 'in', 'on', 'about', 'from', 'of'] }[v] || (v === 'depend' ? ['on'] : null);
    if (!OK || OK.includes(p) || v === 'good') return null;
    const s = m.index + m[0].length - m[2].length; return { s, e: m.index + m[0].length, reps: [OK[0]] };
  });
  add('other-hand', /\bin\s+the\s+other\s+hand\b/gi, T.gr, 'on the other hand', 'Cụm cố định là ON the other hand (mặt khác), không phải “in the other hand”.', 'reason-contrast', m => ({ s: m.index, e: m.index + 2, reps: [cap(m[0], 'on')] }));
  add('despite-of', /\bdespite\s+of\b/gi, T.gr, 'despite / in spite of', 'DESPITE không có “of” (despite the rain); còn IN SPITE OF thì có “of”.', 'reason-contrast', m => ({ s: m.index + 7, e: m.index + m[0].length, reps: [''] }));
  add('although-but', /\b(although|though|even though)\b[^.!?;]{3,120}?,\s*(but)\b/gi, T.gr, 'Although … but', 'Tiếng Việt nói “Mặc dù… nhưng…”, còn tiếng Anh chỉ dùng MỘT liên từ: Although it rained, we went out (bỏ “but”).', 'reason-contrast', m => ({ s: m.index + m[0].lastIndexOf(',') + 1, e: m.index + m[0].length, reps: [''] }));
  add('because-so', /\b(because|since|as)\b[^.!?;]{3,120}?,\s*(so)\b/gi, T.gr, 'Because … so', 'Tiếng Việt nói “Vì… nên…”, còn tiếng Anh chỉ dùng MỘT liên từ: Because it was late, we left (bỏ “so”).', 'purpose-result', m => (/^(as|since)$/i.test(m[1]) ? null : { s: m.index + m[0].lastIndexOf(',') + 1, e: m.index + m[0].length, reps: [''] }));
  add('explain-me', /\b(explain|explained|explains|describe|described|suggest|suggested)\s+(me|him|her|us|them)\b(?!\s+(to|as)\b)/gi, T.gr, 'explain to sb', 'Explain / describe / suggest + sth + TO + người: Please explain it to me (không phải explain me).', 'verb-types', m => { const s = m.index + m[1].length + 1; return { s, e: m.index + m[0].length, reps: ['to ' + m[2]] }; });
  // --- Đại từ & từ dễ nhầm ---
  add('your-welcome', /\byour\s+(welcome|right|wrong|going|so|not|being|very|too)\b/gi, T.gr, 'your / you’re', 'YOUR = của bạn (your book); YOU’RE = you are (you’re welcome, you’re right).', 'pronouns', m => ({ s: m.index, e: m.index + 4, reps: [cap(m[0], "you're")] }));
  add('its-a', /\bits\s+(a|an|the|very|not|been|going|important|true|easy|hard|difficult|time|clear|obvious|possible|necessary)\b/gi, T.gr, 'its / it’s', 'IT’S = it is / it has (it’s important); ITS = của nó (its tail) – không có dấu nháy.', 'possessive-case', m => ({ s: m.index, e: m.index + 3, reps: [cap(m[0], "it's")] }));
  add('there-their', /\b(there)\s+(own|house|home|children|parents|family|friends|car|money|life|lives|work|job|opinion|opinions|country|culture)\b/gi, T.gr, 'there / their / they’re', 'THEIR = của họ (their house), THERE = ở đó / there is, THEY’RE = they are.', 'pronouns', m => ({ s: m.index, e: m.index + 5, reps: [cap(m[0], 'their')] }));
  // --- Dấu câu & viết hoa ---
  const PUN = 'Quy tắc trình bày tiếng Anh: không có dấu cách TRƯỚC dấu phẩy/chấm/hỏi/chấm than, luôn có một dấu cách SAU chúng; đầu câu viết hoa.';
  add('sp-before', /(\S)( +)([,.;:!?])(?=\s|$|[A-Za-z])/g, T.pu, 'Dấu cách trước dấu câu', PUN, 'punctuation', (m, t) => {
    const nx = t[m.index + m[0].length] || '';
    if (/[A-Za-z]/.test(nx)) return /[,;!?]/.test(m[3]) && /[A-Za-z]/.test(m[1]) ? { s: m.index + 1, e: m.index + m[0].length, reps: [m[3] + ' '] } : null; // "sick ,so" → "sick, so" (bỏ qua ".com", ":)")
    return m[3] === '.' && /\.\s*$/.test(m[1]) || /[:;]/.test(m[3]) && /[=(]/.test(nx) ? null : { s: m.index + 1, e: m.index + 1 + m[2].length, reps: [''] };
  });
  add('sp-after', /([a-z]{2,})([,;!?])([A-Za-z]{2,})/g, T.pu, 'Thiếu dấu cách sau dấu câu', PUN, 'punctuation', m => { const s = m.index + m[1].length; return { s, e: s + 1, reps: [m[2] + ' '] }; });
  add('dbl-space', /(\S)( {2,})(?=\S)/g, T.pu, 'Thừa dấu cách', PUN, 'punctuation', m => ({ s: m.index + 1, e: m.index + 1 + m[2].length, reps: [' '] }));
  add('cap-start', /(^|[.!?]\s+|\n\s*)([a-z])([a-z]*)/g, T.pu, 'Viết hoa đầu câu', PUN, 'punctuation', (m, t) => {
    const s = m.index + m[1].length, before = t.slice(Math.max(0, m.index - 6), m.index + 1);
    if (m[1] && /\b(e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|St|No|approx|p|pp|cf|al|fig|ca)\.$/i.test(before.trim()) || /\.\.\.?$/.test(before.trim()) || /\d\.$/.test(before.trim())) return null; // viết tắt / số thứ tự
    if (!m[1] && m.index !== 0) return null;
    if (t[s + 1 + m[3].length] === '.' && m[3].length < 3) return null; // e.g., i.e. đầu văn bản
    if (/^(http|www|https)$/i.test(m[2] + m[3]) || /[@/:]/.test(t[s + m[2].length + m[3].length] || '')) return null; // URL, email
    return { s, e: s + 1, reps: [m[2].toUpperCase()] };
  });
  add('linker-comma', /(^|[.!?]\s+)(However|Therefore|Moreover|Furthermore|In addition|Nevertheless|Consequently|In conclusion|To conclude|Firstly|Secondly|Thirdly|Finally|On the other hand|For example|For instance|In my opinion|As a result|Overall)(?=\s+[a-zA-Z])/g, T.pu, 'Dấu phẩy sau từ nối', 'Từ/cụm nối đứng ĐẦU CÂU (However, Moreover, In conclusion, For example…) được ngăn với phần còn lại bằng dấu phẩy.', 'punctuation', m => { const e = m.index + m[0].length; return { s: e - m[2].length, e, reps: [m[2] + ','] }; });
  // --- Văn phong ---
  add('redund', /\b(return back|repeat again|revert back|in my opinion,? I think|I personally think|free gift|end result|past history|future plans|each and every|join together|combine together|true fact|final conclusion|still continue)\b/gi, T.st, 'Thừa ý', 'Cụm này lặp ý (return đã có nghĩa “back”; in my opinion = I think). Viết gọn để câu chuyên nghiệp hơn.', 'idioms-style', m => {
    const k = m[0].toLowerCase().replace(/,/, ''), r = { 'return back': 'return', 'repeat again': 'repeat', 'revert back': 'revert', 'in my opinion i think': 'in my opinion', 'i personally think': 'I think', 'free gift': 'gift', 'end result': 'result', 'past history': 'history', 'future plans': 'plans', 'each and every': 'every', 'join together': 'join', 'combine together': 'combine', 'true fact': 'fact', 'final conclusion': 'conclusion', 'still continue': 'continue' }[k];
    return r ? { ...whole(m), reps: [cap(m[0], r)] } : null;
  });
  const UPRE = new RegExp('\\b(' + Object.keys(UPG).sort((a, b) => b.length - a.length).map(k => k.replace(/ /g, '\\s+')).join('|') + ')\\b', 'gi');
  add('upgrade', UPRE, T.st, 'Nâng cấp từ (CEFR)', 'Câu đúng, nhưng từ này khá chung chung. Một từ chính xác hơn giúp bài viết tự nhiên và được điểm từ vựng cao hơn (IELTS Lexical Resource). Chọn từ hợp ngữ cảnh.', 'idioms-style', m => {
    const k = m[0].toLowerCase().replace(/\s+/g, ' '), opts = UPG[k]; if (!opts) return null;
    return { ...whole(m), reps: opts.map(o => cap(m[0], o[0])), levels: opts.map(o => o[1]) };
  });

  const PRIO = { spelling: 0, grammar: 1, punct: 2, style: 3 };
  function check(text) {
    text = String(text || '').slice(0, 20000);
    const out = [];
    for (const r of R) {
      r.re.lastIndex = 0; let m, guard = 0;
      while ((m = r.re.exec(text)) && guard++ < 400) {
        if (m[0] === '') { r.re.lastIndex++; continue; }
        let x = null; try { x = r.fn(m, text); } catch (e) { x = null; }
        if (!x || x.e <= x.s || x.s < 0) continue;
        if (x.reps && x.reps.length === 1 && x.reps[0] === text.slice(x.s, x.e)) continue;
        out.push({ s: x.s, e: x.e, type: r.type, reps: x.reps || [], levels: x.levels, rule: 'lk:' + r.id, title: r.title, why: r.why, lesson: r.lesson, src: 'rules' });
      }
    }
    // bỏ lỗi chồng lên nhau: giữ lỗi ưu tiên cao hơn (chính tả > ngữ pháp > dấu câu > văn phong), rồi lỗi đứng trước
    out.sort((a, b) => PRIO[a.type] - PRIO[b.type] || a.s - b.s);
    const keep = []; for (const x of out) if (!keep.some(k => x.s < k.e && k.s < x.e)) keep.push(x);
    return keep.sort((a, b) => a.s - b.s);
  }
  g.LK_WRITE = { check, rules: R, UPG, ING, S3 };
})(typeof self !== 'undefined' ? self : this);
