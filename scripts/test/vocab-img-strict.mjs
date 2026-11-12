// Ảnh minh hoạ từ vựng – luật NGHIÊM (scripts/vocab-img/strict.mjs, chủ duyệt 24/10): chọn nghĩa, prompt theo thẻ, giám khảo gọi tên + khớp đồng nghĩa.
import fs from 'fs';
import assert from 'assert/strict';
import { mapIcons } from '../vocab-img/icons.mjs';
import { queryFor, SOURCES } from '../vocab-img/photo.mjs';
import { ruleCheck, eligible, promptFromCard, matchName, judgeVerdict, judgeField, JUDGE_Q, stem } from '../vocab-img/strict.mjs';

const J = p => JSON.parse(fs.readFileSync(p, 'utf8'));
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const E = (w, pos, level = 'A1', sets = ['ngsl1']) => ({ w, pos, level, sets, def: 'x', ex: 'y' });

// 1. luật máy
ok(ruleCheck('apple#n', E('apple', 'n'), 'food').ok, 'danh từ cụ thể A1 → được');
ok(!ruleCheck('membrane#n', E('membrane', 'n', 'B1', ['nawl3']), 'body').ok, 'kỹ thuật/khoa học → bỏ');
ok(!ruleCheck('timber#n', E('timber', 'n', 'C1'), 'artifact').ok, 'cấp C1 không biểu tượng → bỏ');
ok(ruleCheck('planet#n', E('planet', 'n', 'C1', ['space1']), 'object').ok, 'biểu tượng (ICONIC) → được dù khoa học');
ok(!ruleCheck('idea#n', E('idea', 'n'), 'cognition').ok, 'trừu tượng → bỏ');
ok(ruleCheck('red#adj', E('red', 'adj'), 'all').ok && ruleCheck('round#adj', E('round', 'adj'), 'all').ok, 'tính từ màu/hình → được');
for (const a of ['afraid', 'clean', 'heavy', 'old']) ok(!ruleCheck(a + '#adj', E(a, 'adj'), 'all').ok, 'tính từ không phải màu/hình → bỏ: ' + a);
ok(ruleCheck('kick#v', E('kick', 'v', 'B1'), 'contact').ok && !ruleCheck('think#v', E('think', 'v'), 'cognition').ok, 'động từ: chỉ hành động nhìn thấy');
// 2. thẻ bắt buộc
const card = { o: 'a folded paper road map', c: 'on a table', s: ['map', 'road map'] };
ok(!eligible('map#n', E('map', 'n'), 'artifact', null).ok, 'thiếu thẻ → không vẽ');
ok(!eligible('map#n', E('map', 'n'), 'artifact', { skip: 'x' }).ok, 'thẻ skip → không vẽ');
ok(eligible('map#n', E('map', 'n'), 'artifact', card).ok, 'thẻ đủ → vẽ');
ok(!eligible('red#adj', E('red', 'adj'), 'all', { o: 'a red balloon', s: ['red'] }).ok, 'tính từ cần k=color|shape (vật chuẩn)');
// 3. prompt theo nghĩa: vật chuẩn đứng đầu, không ngoặc kép, không chữ
const p = promptFromCard('map#n', { ...card, o: 'a "folded" paper road map' });
ok(p.startsWith('Illustration of a folded paper road map, on a table.') && !/"/.test(p) && /without any lettering/.test(p), 'prompt từ thẻ');
ok(promptFromCard('swim#v', { o: 'a person swimming', s: ['swim'] }) === promptFromCard('swim#v', { o: 'a person swimming', s: ['swim'] }) && !/a person swimming/.test(promptFromCard('swim#v', { o: 'a person swimming', s: ['swim'] })), 'người xoay vòng tất định thay "a person"');
ok(/Simplest possible/.test(promptFromCard('map#n', card, 2)), 'lần 2 = biến thể cố định');
// 4. giám khảo: câu hỏi không chứa từ đích; khớp đồng nghĩa theo gốc từ
const cards = J('content/lexicon/vimg-cards.json').items, pilot = J('content/lexicon/vimg-pilot2.json').items;
for (const k of pilot) ok(!JUDGE_Q.toLowerCase().includes(' ' + k.split('#')[0] + ' ') || ['red', 'round'].includes(k.split('#')[0]), 'câu hỏi giám khảo không lộ từ: ' + k);
ok(matchName('a man kicking a soccer ball', ['kick']) && matchName('Teeth', ['tooth']) && matchName('hardhat', ['hard hat']) && matchName('swimming', ['swim']), 'khớp theo gốc từ');
ok(!matchName('cushion', ['sofa', 'couch']) && !matchName('mapleaf', ['map']) && !matchName('helmet', ['hat']), 'không khớp sai');
ok(stem('sewing') === stem('sew') && stem('climbed') === stem('climb') && stem('bicycles') === stem('bicycle') && stem('pouring') === stem('pour'), 'gốc từ');
ok(judgeField('n', {}) === 'object' && judgeField('v', {}) === 'action' && judgeField('adj', { k: 'shape' }) === 'shape', 'trường khớp theo loại từ');
ok(judgeVerdict('n', card, null).reasons[0] === 'judge unavailable' && !judgeVerdict('n', card, null).pass, 'không có giám khảo = không ảnh (nghiêm)');
ok(judgeVerdict('n', card, { object: 'road map', text: false, unsafe: false, flat: true, clear: true }).pass, 'gọi đúng tên → đạt');
ok(!judgeVerdict('n', card, { object: 'notebook', text: false }).pass, 'gọi sai tên → trượt');
ok(!judgeVerdict('n', card, { object: 'map', text: true }).pass && !judgeVerdict('n', card, { object: 'map', unsafe: true }).pass, 'chữ / không an toàn → trượt');
// 5. pilot 2: 40 nghĩa, đều đủ điều kiện theo luật + thẻ; workflow không dùng tài khoản chính
const lex = fs.existsSync('dist/lexicon.json') ? J('dist/lexicon.json') : null, sel = J('content/lexicon/vimg-select.json').items;
ok(pilot.length === 40 && new Set(pilot).size === 40, 'pilot2 = 40 nghĩa');
if (lex) for (const k of pilot) ok(eligible(k, lex[k], (sel[k] || [])[1], cards[k]).ok, 'pilot2 đủ điều kiện: ' + k);
const wf = fs.readFileSync('.github/workflows/vocab-img.yml', 'utf8');
ok(/VIMG_MAX_MAIN: '0'/.test(wf) && /judge\.mjs --out out\/vocab-img --attempt 1/.test(wf) && /pillow-avif-plugin/.test(wf), 'workflow: 0 ảnh tài khoản chính, giám khảo gọi tên, AVIF');
const qc = fs.readFileSync('scripts/vocab-img/qc.py', 'utf8');
ok(/MAXB, MAXB2, X2_MIN, CLIP_MAX = 384, 6 \* 1024, 12 \* 1024/.test(qc), 'QC: ≤ 6 KB @384, 2x ≤ 12 KB');
// 6. tầng nguồn: icon (Noto/CLDR) bảo thủ, ảnh chụp chỉ khi có khoá + thẻ photo:true, mọi tầng qua cùng cổng
const cldr = { '🍎': { tts: ['red apple'] }, '⛓': { tts: ['chains'] }, '₥': { tts: ['mill'] }, '🧗': { tts: ['person climbing'] }, '🧗‍♂': { tts: ['man climbing'] }, '🗺': { tts: ['world map'] }, '🟥': { tts: ['red square'] } };
const cs = { 'apple#n': { o: 'x', s: ['apple'] }, 'necklace#n': { o: 'x', s: ['necklace', 'chain'] }, 'windmill#n': { o: 'x', s: ['windmill', 'mill'] }, 'climb#v': { o: 'x', s: ['climb'] }, 'red#adj': { o: 'x', s: ['red'], k: 'color' } };
const lx = { 'apple#n': E('apple', 'n'), 'necklace#n': E('necklace', 'n'), 'windmill#n': E('windmill', 'n'), 'climb#v': E('climb', 'v'), 'red#adj': E('red', 'adj') };
const mi = mapIcons(cldr, cs, lx);
ok(mi['apple#n'] && mi['apple#n'].cp === '1f34e', 'icon: "red apple" → apple');
ok(!mi['necklace#n'] && !mi['windmill#n'], 'icon: đồng nghĩa phụ / ký hiệu không phải hình → không icon');
ok(mi['climb#v'] && mi['climb#v'].name === 'person climbing', 'icon động từ: ưu tiên "person …" trung tính giới');
ok(!mi['red#adj'], 'tính từ màu không dùng icon (cần vật chuẩn)');
const icons = J('content/lexicon/vimg-icons.json');
ok(Object.keys(icons.items).every(k => cards[k] && !cards[k].skip) && icons.items['map#n'] && !icons.items['hard hat#n'], 'vimg-icons.json chỉ cho nghĩa có thẻ, không ánh xạ sai (hard hat ≠ military helmet)');
ok(queryFor({ s: ['lighthouse'] }) === 'lighthouse' && SOURCES.every(s => !s.ok()) === !(process.env.PIXABAY_KEY || process.env.PEXELS_KEY), 'ảnh chụp: tắt khi không có khoá');
ok(/icon_tier\.py out\/vocab-img --keys keys\.json/.test(wf) && wf.indexOf('icon_tier.py') < wf.indexOf('gen.mjs --keys keys.json'), 'workflow: tầng icon chạy trước tầng AI, cùng giám khảo/QC');
console.log(`✓ vocab-img strict: ${n} kiểm`);
