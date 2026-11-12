// Test bộ máy chia động từ (web/js/verbs-core.js): 5 dạng, quy tắc chính tả, cách đọc -ed/-s, nhận diện từ gốc,
// bảng 12 thì + tương lai trong quá khứ + modal perfect (khẳng định/phủ định/nghi vấn/rút gọn), bị động, động từ đặc biệt.
// Chạy: node scripts/test/verbs.mjs
import fs from 'node:fs';
import vm from 'node:vm';
const c = {}; c.self = c; vm.createContext(c);
vm.runInContext(fs.readFileSync(new URL('../../web/js/verbs-core.js', import.meta.url), 'utf8'), c);
const V = c.LK_VERBS;
let n = 0, fails = 0;
const eq = (got, want, msg) => { n++; if (JSON.stringify(got) !== JSON.stringify(want)) { fails++; console.log(`✗ ${msg}: ${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`); } };
const ok = (cond, msg) => { n++; if (!cond) { fails++; console.log('✗ ' + msg); } };
const W = l => l.map(x => x.w).join('/');
const F = (b, o) => V.forms(b, o);
const cell = (b, tense, p, k, o) => { for (const g of V.table(b, o)) for (const t of g.tenses) if (t.id === tense) { const r = t.rows.find(x => x.p === p); return r ? r[k] : undefined; } };
const pcell = (b, tense, p, k) => { for (const g of V.table(b)) for (const t of g.tenses) if (t.id === tense) return Array.isArray(t.passive) ? t.passive.find(x => x.p === p)[k] : t.passive; };

// ---------- 1) Có quy tắc: -ed / -ing / -s ----------
const REG = [
  // base, past, ing, s
  ['work', 'worked', 'working', 'works'], ['play', 'played', 'playing', 'plays'], ['study', 'studied', 'studying', 'studies'],
  ['stop', 'stopped', 'stopping', 'stops'], ['plan', 'planned', 'planning', 'plans'], ['love', 'loved', 'loving', 'loves'],
  ['make', null, 'making', 'makes'], ['agree', 'agreed', 'agreeing', 'agrees'], ['die', 'died', 'dying', 'dies'],
  ['lie', null, 'lying', 'lies'], ['tie', 'tied', 'tying', 'ties'], ['watch', 'watched', 'watching', 'watches'],
  ['fix', 'fixed', 'fixing', 'fixes'], ['wash', 'washed', 'washing', 'washes'], ['go', null, 'going', 'goes'],
  ['echo', 'echoed', 'echoing', 'echoes'], ['panic', 'panicked', 'panicking', 'panics'], ['picnic', 'picnicked', 'picnicking', 'picnics'],
  ['prefer', 'preferred', 'preferring', 'prefers'], ['occur', 'occurred', 'occurring', 'occurs'], ['admit', 'admitted', 'admitting', 'admits'],
  ['visit', 'visited', 'visiting', 'visits'], ['open', 'opened', 'opening', 'opens'], ['happen', 'happened', 'happening', 'happens'],
  ['offer', 'offered', 'offering', 'offers'], ['enter', 'entered', 'entering', 'enters'], ['listen', 'listened', 'listening', 'listens'],
  ['quiz', 'quizzed', 'quizzing', 'quizzes'], ['show', 'showed', 'showing', 'shows'], ['obey', 'obeyed', 'obeying', 'obeys'],
  ['argue', 'argued', 'arguing', 'argues'], ['free', 'freed', 'freeing', 'frees'], ['dye', 'dyed', 'dyeing', 'dyes'],
  ['hope', 'hoped', 'hoping', 'hopes'], ['hop', 'hopped', 'hopping', 'hops'], ['develop', 'developed', 'developing', 'develops'],
  ['control', 'controlled', 'controlling', 'controls'], ['commit', 'committed', 'committing', 'commits'], ['benefit', 'benefited', 'benefiting', 'benefits'],
  ['equip', 'equipped', 'equipping', 'equips'], ['kiss', 'kissed', 'kissing', 'kisses'], ['buzz', 'buzzed', 'buzzing', 'buzzes'],
  ['carry', 'carried', 'carrying', 'carries'], ['enjoy', 'enjoyed', 'enjoying', 'enjoys'], ['rain', 'rained', 'raining', 'rains'],
  ['quit', null, 'quitting', 'quits'], ['canoe', 'canoed', 'canoeing', 'canoes'], ['continue', 'continued', 'continuing', 'continues'],
];
for (const [b, past, ing, s] of REG) {
  const f = F(b);
  if (past) eq(W(f.past), past, `${b} → quá khứ`);
  eq(W(f.ing), ing, `${b} → -ing`); eq(W(f.s), s, `${b} → ngôi 3 số ít`);
}
// Anh–Anh / Anh–Mỹ: gấp đôi -l
eq(W(F('travel').past), 'travelled/traveled', 'travel: UK travelled / US traveled');
eq(F('travel').past.map(x => x.tag).join(), 'UK,US', 'travel: nhãn UK/US');
eq(F('cancel', { region: 'US' }).P, 'canceled', 'cancel (US) → canceled');
eq(F('cancel', { region: 'UK' }).P, 'cancelled', 'cancel (UK) → cancelled');
eq(F('travel', { region: 'US' }).ING, 'traveling', 'travel (US) → traveling');
eq(F('fuel', { region: 'UK' }).P, 'fuelled', 'fuel (UK) → fuelled');
eq(F('control', { region: 'US' }).P, 'controlled', 'control: gấp đôi cả Anh–Mỹ (trọng âm cuối)');
eq(F('worship', { region: 'US' }).P, 'worshiped', 'worship (US) → worshiped');
eq(W(F('age').ing), 'ageing/aging', 'age → ageing (UK) / aging (US)');
// Mã quy tắc chính tả
eq(F('stop').rules.ed, 'double', 'stop: quy tắc gấp đôi phụ âm');
eq(F('study').rules.ed, 'y', 'study: -y → -ied');
eq(F('study').rules.s, 'y', 'study: -y → -ies');
eq(F('make').rules.ing, 'e', 'make: bỏ -e câm');
eq(F('die').rules.ing, 'ie', 'die: -ie → -ying');
eq(F('panic').rules.ed, 'ic', 'panic: -ic → -cked');
eq(F('watch').rules.s, 'es', 'watch: thêm -es');
eq(F('work').rules.ed, '', 'work: thêm -ed bình thường');
eq(F('agree').rules.ing, 'keep-e', 'agree: giữ -ee');
eq(F('travel').rules.ed, 'double-uk', 'travel: gấp đôi l kiểu Anh');

// ---------- 2) Bất quy tắc ----------
const IRR = [['go', 'went', 'gone'], ['be', 'was/were', 'been'], ['have', 'had', 'had'], ['do', 'did', 'done'], ['take', 'took', 'taken'], ['write', 'wrote', 'written'],
  ['begin', 'began', 'begun'], ['swim', 'swam', 'swum'], ['buy', 'bought', 'bought'], ['teach', 'taught', 'taught'], ['cut', 'cut', 'cut'], ['put', 'put', 'put'],
  ['come', 'came', 'come'], ['run', 'ran', 'run'], ['lie', 'lay', 'lain'], ['lay', 'laid', 'laid'], ['rise', 'rose', 'risen'], ['bear', 'bore', 'borne/born'],
  ['get', 'got', 'got/gotten'], ['learn', 'learned/learnt', 'learned/learnt'], ['dream', 'dreamed/dreamt', 'dreamed/dreamt'], ['prove', 'proved', 'proved/proven'],
  ['read', 'read', 'read'], ['lead', 'led', 'led'], ['find', 'found', 'found'], ['fall', 'fell', 'fallen'], ['feel', 'felt', 'felt'], ['see', 'saw', 'seen'],
  ['choose', 'chose', 'chosen'], ['forget', 'forgot', 'forgotten'], ['understand', 'understood', 'understood'], ['say', 'said', 'said'], ['pay', 'paid', 'paid'],
  ['fly', 'flew', 'flown'], ['dive', 'dived/dove', 'dived'], ['fit', 'fitted/fit', 'fitted/fit'], ['hang', 'hung', 'hung'], ['wake', 'woke', 'woken'], ['show', 'showed', 'shown/showed']];
for (const [b, p, pp] of IRR) { eq(W(F(b).past), p, `${b} → V2`); eq(W(F(b).pp), pp, `${b} → V3`); }
ok(F('go').irregular && F('be').irregular && F('cut').irregular, 'go/be/cut: nhãn bất quy tắc');
ok(!F('work').irregular && !F('study').irregular, 'work/study: không phải bất quy tắc');
ok(F('learn').irregular && F('learn').partial, 'learn: bất quy tắc một phần (learned/learnt)');
eq(F('get', { region: 'US' }).PP, 'gotten', 'get (US) → have gotten');
eq(F('get', { region: 'UK' }).PP, 'got', 'get (UK) → have got');
eq(F('learn', { region: 'UK' }).P, 'learned', 'learn: bảng chia dùng learned (cả hai vùng)');
eq(F('fit', { region: 'US' }).P, 'fit', 'fit (US) → fit');
eq(F('fit', { region: 'UK' }).P, 'fitted', 'fit (UK) → fitted');
eq(W(F('run').ing), 'running', 'run → running');
eq(W(F('begin').ing), 'beginning', 'begin → beginning');
eq(W(F('lie').ing), 'lying', 'lie → lying');
eq(W(F('be').s), 'is', 'be → is');
eq(W(F('have').s), 'has', 'have → has');
eq(W(F('do').s), 'does', 'do → does');
eq(F('go').ed, null, 'go: không có đuôi -ed để đọc');
ok(F('learn').ed && F('learn').ed.ipa === '/d/', 'learn(ed): đọc /d/');
ok(V.irregularList().length >= 150, 'danh sách bất quy tắc ≥ 150 động từ');
eq(V.irregularList().find(x => x.base === 'cut').pattern, 'AAA', 'cut-cut-cut: mẫu AAA');
eq(V.irregularList().find(x => x.base === 'buy').pattern, 'ABB', 'buy-bought-bought: mẫu ABB');
eq(V.irregularList().find(x => x.base === 'come').pattern, 'ABA', 'come-came-come: mẫu ABA');
eq(V.irregularList().find(x => x.base === 'go').pattern, 'ABC', 'go-went-gone: mẫu ABC');

// ---------- 3) Cách đọc -ed / -s ----------
const ED = { want: '/ɪd/', need: '/ɪd/', decide: '/ɪd/', hate: '/ɪd/', wait: '/ɪd/', start: '/ɪd/', add: '/ɪd/', visit: '/ɪd/',
  work: '/t/', stop: '/t/', laugh: '/t/', kiss: '/t/', wash: '/t/', watch: '/t/', fix: '/t/', hope: '/t/', like: '/t/', dance: '/t/', cough: '/t/', panic: '/t/', ache: '/t/', promise: '/t/', increase: '/t/', focus: '/t/',
  play: '/d/', love: '/d/', clean: '/d/', call: '/d/', study: '/d/', open: '/d/', use: '/d/', close: '/d/', change: '/d/', judge: '/d/', breathe: '/d/', rob: '/d/', beg: '/d/', realise: '/d/', buzz: '/d/', weigh: '/d/', agree: '/d/', travel: '/d/' };
for (const [b, ipa] of Object.entries(ED)) eq(F(b).ed && F(b).ed.ipa, ipa, `${b}ed → ${ipa}`);
eq(F('want').ed.why, 'td', 'want: lý do /ɪd/ = âm cuối t/d');
eq(F('work').ed.why, 'vl', 'work: lý do /t/ = âm vô thanh');
eq(F('play').ed.why, 'vd', 'play: lý do /d/ = âm hữu thanh');
const SZ = { work: '/s/', stop: '/s/', laugh: '/s/', want: '/s/', like: '/s/', hope: '/s/',
  play: '/z/', love: '/z/', need: '/z/', call: '/z/', study: '/z/', breathe: '/z/', rob: '/z/', go: '/z/',
  watch: '/ɪz/', wash: '/ɪz/', kiss: '/ɪz/', fix: '/ɪz/', buzz: '/ɪz/', change: '/ɪz/', judge: '/ɪz/', dance: '/ɪz/', use: '/ɪz/', close: '/ɪz/', realise: '/ɪz/', promise: '/ɪz/' };
for (const [b, ipa] of Object.entries(SZ)) eq(F(b).sz.ipa, ipa, `${b}(e)s → ${ipa}`);
eq(F('say').sz.ipa, '/sez/', 'says đọc /sez/ (ngoại lệ)');
eq(F('do').sz.ipa, '/dʌz/', 'does đọc /dʌz/ (ngoại lệ)');

// ---------- 4) Nhận diện từ gốc ----------
const RES = { went: 'go', gone: 'go', studies: 'study', studied: 'study', studying: 'study', stopped: 'stop', stopping: 'stop', hoping: 'hope', hoped: 'hope',
  running: 'run', ran: 'run', making: 'make', makes: 'make', goes: 'go', watches: 'watch', uses: 'use', quizzes: 'quiz', dying: 'die', lying: 'lie', died: 'die',
  playing: 'play', panicked: 'panic', panicking: 'panic', travelled: 'travel', traveled: 'travel', learnt: 'learn', learned: 'learn', gotten: 'get', got: 'get',
  was: 'be', were: 'be', is: 'be', am: 'be', been: 'be', being: 'be', has: 'have', had: 'have', does: 'do', did: 'do', done: 'do', bought: 'buy', taught: 'teach',
  left: 'leave', saw: 'see', seen: 'see', fell: 'fall', writing: 'write', written: 'write', visiting: 'visit', agreeing: 'agree', changing: 'change', arguing: 'argue',
  'Went': 'go', ' to go ': 'go', "isn't": 'be', "doesn't": 'do', "can't": 'can', 'swum': 'swim', 'risen': 'rise', 'laid': 'lay', 'lain': 'lie', 'borne': 'bear' };
for (const [w, b] of Object.entries(RES)) eq(V.resolve(w).base, b, `“${w}” → ${b}`);
eq(V.resolve('went').from, 'past', 'went: nhận ra dạng quá khứ');
eq(V.resolve('gone').from, 'pp', 'gone: nhận ra phân từ II');
eq(V.resolve('studying').from, 'ing', 'studying: nhận ra -ing');
eq(V.resolve('studies').from, 's', 'studies: nhận ra -s');
eq(V.resolve('lay').base, 'lay', 'lay: ưu tiên động từ “lay” (đặt)…');
ok(V.resolve('lay').alts.some(a => a.base === 'lie' && a.from === 'past'), '…và gợi ý “lie” (quá khứ của lie)');
eq(V.resolve('found').base, 'find', 'found → find…');
ok(V.resolve('found').alts.some(a => a.base === 'found'), '…kèm gợi ý found (thành lập)');
eq(V.resolve('give up').base, 'give', 'cụm động từ: give up → give');
eq(V.resolve('give up').tail, 'up', 'cụm động từ: giữ tiểu từ “up”');
ok(V.resolve('can').modal && V.resolve('must').modal && V.resolve('ought to').modal, 'can/must/ought to: động từ khuyết thiếu');
ok(V.resolve('blorf').unknown, 'từ lạ: đánh dấu chưa có trong danh sách');
ok(V.resolve('googled').guess && V.resolve('googled').base === 'google', 'từ lạ đã chia: đoán từ gốc theo quy tắc (googled → google)');
eq(V.resolve(''), null, 'chuỗi rỗng → null');

// ---------- 5) Bảng chia ----------
eq(cell('work', 'ps', '3s', 'aff'), 'he works', 'HTĐ: he works');
eq(cell('work', 'ps', '3s', 'negC'), "he doesn't work", 'HTĐ phủ định: doesn’t + V nguyên mẫu');
eq(cell('work', 'ps', '3s', 'q'), 'Does he work?', 'HTĐ nghi vấn: Does he work?');
eq(cell('work', 'ps', '1s', 'q'), 'Do I work?', 'HTĐ nghi vấn ngôi I');
eq(cell('go', 'pas', '1p', 'neg'), 'we did not go', 'QKĐ phủ định: did not + V (không phải did not went)');
eq(cell('go', 'pas', '1p', 'q'), 'Did we go?', 'QKĐ nghi vấn: Did we go?');
eq(cell('go', 'pas', '1p', 'aff'), 'we went', 'QKĐ: we went');
eq(cell('work', 'pc', '1s', 'affC'), "I'm working", 'HTTD rút gọn: I’m working');
eq(cell('work', 'pc', '1s', 'negC'), "I'm not working", 'HTTD phủ định ngôi I: I’m not (không có amn’t)');
eq(cell('work', 'pc', '2', 'negC'), "you aren't working", 'HTTD phủ định: aren’t');
eq(cell('work', 'pc', '3s', 'q'), 'Is he working?', 'HTTD nghi vấn');
eq(cell('take', 'pp', '3s', 'aff'), 'he has taken', 'HTHT: has + V3');
eq(cell('take', 'pp', '3s', 'affC'), "he's taken", 'HTHT rút gọn he’s');
eq(cell('take', 'pp', '1p', 'negC'), "we haven't taken", 'HTHT phủ định haven’t');
eq(cell('learn', 'ppc', '3p', 'aff'), 'they have been learning', 'HTHTTD');
eq(cell('eat', 'pap', '1s', 'affC'), "I'd eaten", 'QKHT rút gọn I’d');
eq(cell('eat', 'papc', '3s', 'q'), 'Had he been eating?', 'QKHTTD nghi vấn');
eq(cell('go', 'fs', '3s', 'negC'), "he won't go", 'TLĐ phủ định won’t');
eq(cell('go', 'fs', '1s', 'affC'), "I'll go", 'TLĐ rút gọn I’ll');
eq(cell('go', 'gt', '3s', 'aff'), 'he is going to go', 'be going to');
eq(cell('go', 'fc', '2', 'aff'), 'you will be going', 'TLTD');
eq(cell('finish', 'fp', '3p', 'aff'), 'they will have finished', 'TLHT');
eq(cell('work', 'fpc', '1s', 'aff'), 'I will have been working', 'TLHTTD');
eq(cell('call', 'fip', '3s', 'aff'), 'he would call', 'tương lai trong quá khứ (would)');
eq(cell('call', 'fip', '1s', 'affC'), "I'd call", 'would → I’d');
eq(cell('call', 'fipg', '2', 'aff'), 'you were going to call', 'tương lai trong quá khứ (was/were going to)');
eq(cell('call', 'fipg', '1s', 'aff'), 'I was going to call', 'was going to (ngôi I)');
eq(cell('see', 'm-should', '2', 'aff'), 'you should have seen', 'should have + V3');
eq(cell('see', 'm-should', '2', 'negC'), "you shouldn't have seen", 'shouldn’t have');
eq(cell('see', 'm-could', '3p', 'q'), 'Could they have seen?', 'could have – nghi vấn');
eq(cell('see', 'm-must', '3s', 'negC'), "he can't have seen", 'must have – phủ định suy luận dùng can’t have');
eq(cell('see', 'm-must', '3s', 'q'), '', 'must have – không có câu hỏi');
eq(cell('see', 'm-would', '1s', 'affC'), "I'd have seen", 'would have → I’d have');
eq(cell('see', 'm-might', '3s', 'negC'), undefined, 'might not: không ép dạng rút gọn hiếm (mightn’t)');
eq(cell('get', 'pp', '1s', 'aff', { region: 'US' }), 'I have gotten', 'get (US): have gotten');
eq(cell('get', 'pp', '1s', 'aff', { region: 'UK' }), 'I have got', 'get (UK): have got');
// be
eq(cell('be', 'ps', '1s', 'aff'), 'I am', 'be: I am');
eq(cell('be', 'ps', '3s', 'negC'), "he isn't", 'be: không mượn do (he isn’t)');
eq(cell('be', 'ps', '2', 'q'), 'Are you?', 'be: đảo ngữ Are you…?');
eq(cell('be', 'pas', '1s', 'aff'), 'I was', 'be: I was');
eq(cell('be', 'pas', '2', 'aff'), 'you were', 'be: you were');
eq(cell('be', 'pas', '3p', 'negC'), "they weren't", 'be: weren’t');
eq(cell('be', 'pp', '3s', 'aff'), 'he has been', 'be: has been');
eq(cell('be', 'pc', '2', 'aff'), 'you are being', 'be: are being (hành vi tạm thời)');
ok(V.table('be')[0].tenses.find(x => x.id === 'ppc').rare, 'be: “has been being” đánh dấu hiếm dùng');
// have/do là động từ chính → mượn do
eq(cell('have', 'ps', '3s', 'q'), 'Does he have?', 'have (động từ chính): Does he have…?');
eq(cell('have', 'ps', '3s', 'aff'), 'he has', 'have: he has');
eq(cell('have', 'pas', '1s', 'negC'), "I didn't have", 'have: didn’t have');
eq(cell('do', 'ps', '3s', 'negC'), "he doesn't do", 'do: doesn’t do');
eq(cell('do', 'pas', '2', 'q'), 'Did you do?', 'do: Did you do?');
// cụm động từ
eq(cell('give up', 'pas', '1s', 'aff'), 'I gave up', 'give up: I gave up');
eq(cell('give up', 'ps', '3s', 'negC'), "he doesn't give up", 'give up: doesn’t give up');
eq(cell('give up', 'pp', '3s', 'q'), 'Has he given up?', 'give up: Has he given up?');
// modal → không có bảng chia
eq(V.table('can'), null, 'can: không chia theo ngôi');
ok(V.modal('must')[2] === 'had to', 'must → quá khứ dùng had to');
ok(V.modal('can')[1] === "can't", 'can → can’t');

// ---------- 6) Bị động ----------
eq(pcell('write', 'ps', '3s', 'aff'), 'he is written', 'bị động HTĐ: is + V3');
eq(pcell('write', 'pc', '3p', 'aff'), 'they are being written', 'bị động HTTD: are being + V3');
eq(pcell('write', 'pp', '3s', 'aff'), 'he has been written', 'bị động HTHT: has been + V3');
eq(pcell('write', 'pas', '3p', 'negC'), "they weren't written", 'bị động QKĐ phủ định');
eq(pcell('write', 'fs', '1s', 'q'), 'Will I be written?', 'bị động TLĐ nghi vấn');
eq(pcell('write', 'm-should', '3s', 'aff'), 'he should have been written', 'bị động should have been + V3');
eq(pcell('write', 'ppc'), 'rare', 'bị động HTHTTD trả về “rare”');
eq(pcell('arrive', 'ps'), null, 'arrive (nội động từ): không có bị động');
eq(pcell('have', 'ps'), null, 'have (sở hữu): không dùng bị động');
eq(pcell('be', 'ps'), null, 'be: không có bị động');
eq(pcell('get', 'pp'), null, 'get: không đưa bị động máy móc');

// ---------- 7) Ví dụ & lỗi hay gặp ----------
const ex = id => { for (const g of V.table('take')) for (const t of g.tenses) if (t.id === id) return t.example; };
eq(ex('ps').en, 'She takes the bus every day.', 'ví dụ HTĐ');
eq(ex('pas').en, 'We took the bus yesterday.', 'ví dụ QKĐ');
eq(ex('pp').passive, 'The bus has been taken recently.', 'ví dụ bị động HTHT');
eq(ex('fip').en, 'She said she would take the bus the next day.', 'ví dụ tương lai trong quá khứ');
ok(V.table('know')[0].tenses.find(x => x.id === 'pc').stative, 'know: cảnh báo động từ trạng thái ở thì tiếp diễn');
ok(V.table('think')[0].tenses.find(x => x.id === 'pc').dual, 'think: ghi chú nghĩa hành động/trạng thái');
const mk = b => V.mistakes(b).map(x => x.code);
ok(mk('go').includes('overreg') && V.mistakes('go')[0].wrong.includes('goed'), 'lỗi: goed → went');
ok(mk('go').includes('did-v2') && mk('go').includes('have-v2'), 'lỗi: did went / have went');
ok(mk('agree').includes('agree'), 'lỗi: I am agree');
ok(mk('stop').includes('sp-double') && V.mistakes('stop').some(x => x.wrong === 'stoped'), 'lỗi chính tả: stoped');
ok(mk('make').includes('sp-e') && V.mistakes('make').some(x => x.wrong === 'makeing'), 'lỗi chính tả: makeing');
ok(mk('die').includes('sp-ie'), 'lỗi chính tả: dieing');
ok(mk('lie').includes('lie-lay'), 'lỗi: lie/lay');
ok(mk('know').includes('stative'), 'lỗi: I am knowing');
ok(mk('can').includes('modal-to'), 'lỗi modal: must to');
ok(!mk('learn').includes('overreg'), 'learn: “learned” không phải lỗi');
ok(V.mistakes('teach').some(x => x.wrong.includes('teached')), 'lỗi: teached');

// ---------- 8) Gợi ý ----------
eq(V.suggest('went')[0].base, 'go', 'gợi ý: gõ “went” → go đứng đầu');
eq(V.suggest('went')[0].via, 'went', 'gợi ý: ghi rõ đi từ “went”');
ok(V.suggest('stu').some(x => x.base === 'study'), 'gợi ý tiền tố stu → study');
ok(V.suggest('ca').some(x => x.base === 'can'), 'gợi ý có cả động từ khuyết thiếu');
ok(V.suggest('be', 50).length <= 50, 'gợi ý giới hạn số lượng');
V.addKnown(['zoomify']); eq(V.resolve('zoomified').base, 'zoomify', 'nạp thêm động từ từ kho từ (addKnown)');

if (fails) { console.log(`✗ verbs: ${fails}/${n} sai`); process.exit(1); }
console.log(`✓ verbs: ${n} phép kiểm đúng`);
