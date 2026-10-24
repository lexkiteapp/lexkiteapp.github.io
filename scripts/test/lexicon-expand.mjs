// Mở rộng kho từ (docs/LEXICON.md §Mở rộng 20k): cổng mục (gateEntry), dịch ngược, sổ việc hạ nguồn (infra/lexicon-consumers.json).
import fs from 'fs';
import path from 'path';
import { gateEntry, btMatch, toIndex, LANGS, loadExpand, poolEmpty, queueable, breaker } from '../lexicon/expand/lib.mjs';
const ROOT = new URL('../../', import.meta.url).pathname;
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };
const TR = { es: 'abandonar', pt: 'abandonar', fr: 'abandonner', de: 'verlassen', id: 'meninggalkan', th: 'ละทิ้ง', zh: '放弃', ja: '見捨てる', ko: '버리다', hi: 'छोड़ देना', ar: 'يتخلى عن', ru: 'покидать', tr: 'terk etmek' };
const good = () => ({ w: 'forsake', pos: 'v', ipa: '/fəˈseɪk/', ipaUS: '/fərˈseɪk/', def: 'to leave someone or something completely', ex: ['He would never forsake his friends.', 'She forsook her career for her family.'], col: ['forsake a friend'], syn: ['abandon', 'desert'], level: 'C1', cefrF: 'C2', emoji: '', topic: 'xw-actions', vi: 'bỏ rơi; từ bỏ', note_vi: '', m: { ...TR },
  qa: { j: { 'gemini:gemini-3.5-flash': 5, 'gemma:gemma-3-27b-it': 4 }, tr: Object.fromEntries(LANGS.map(l => [l, [5, 4]])), btw: Object.fromEntries(LANGS.map(l => [l, ['abandon']])) } });
ok(gateEntry(good()).ok, 'mục tốt phải đạt: ' + JSON.stringify(gateEntry(good()).why));
const bad = (f, m) => { const e = good(); f(e); ok(!gateEntry(e).ok, 'phải trượt: ' + m); };
bad(e => e.ipa = '', 'thiếu IPA Anh');
bad(e => e.ipaUS = '/fɚˈseɪk/', 'IPA Mỹ ký hiệu ngoài bảng');
bad(e => e.qa.j = { 'gemini:a': 5, 'gemini:b': 5 }, '2 giám khảo cùng họ');
bad(e => e.qa.j['gemma:gemma-3-27b-it'] = 3, 'giám khảo < 4');
bad(e => e.m.th = 'bỏ rơi', 'lẫn tiếng Việt ở th');
bad(e => e.m.ja = 'forsake', 'sai chữ viết ja / chưa dịch');
bad(e => e.qa.tr.ko = [5, 3], 'dịch ko giám khảo 3');
bad(e => e.qa.btw = Object.fromEntries(LANGS.map(l => [l, ['leave']])), 'dịch ngược < 0.8');
bad(e => e.ex = ['He left.', 'She went.'], 'ví dụ không chứa từ');
bad(e => e.vi = 'abandon', 'vi không phải tiếng Việt');
ok(gateEntry(null).ok === false && gateEntry(good(), { keep: false }).ok === false, 'không sinh được / keep=false → hàng duyệt');
ok(btMatch('to abandon', 'forsake', ['abandon']) && !btMatch('to eat', 'forsake', ['abandon']), 'btMatch');
// lỗi hạ tầng (pilot 40070729116: kho 1 khóa hết hạn mức → 503 keys=0) không được vào hàng duyệt, cầu dao ngắt sau 3 lần
ok(poolEmpty(503, '{"error":"no-model","diag":"keys=0"}') && !poolEmpty(503, '{"error":"no-model","diag":"keys=2 k1:429"}') && !poolEmpty(401, 'keys=0'), 'poolEmpty');
ok(!queueable(gateEntry(null), false) && queueable(gateEntry(null), true) && queueable(gateEntry(good(), { keep: false }), false) && !queueable(gateEntry(good()), true), 'queueable: gen hỏng do API → bỏ qua, lỗi nội dung → hàng duyệt');
{ const b = breaker(3); b.hit(true); b.hit(true); b.hit(false); b.hit(true); b.hit(true); ok(!b.open, 'cầu dao reset khi gọi được'); b.hit(true); ok(b.open, 'cầu dao mở sau 3 lần kho rỗng liên tiếp'); }
const Q = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/qa/review-queue.json'), 'utf8')).items || [];
ok(!Q.some(q => q.src === 'lexicon-expand' && /^gen:/.test((q.why || [])[0] || '') && !q.data), 'hàng duyệt không chứa mục lexicon-expand "gen" rỗng (lỗi hạ tầng)');
// chủ đề (content/lexicon/topics.json): cây đủ tên 15 ngôn ngữ + nối 104 bộ; bộ học 10–20, nút 10–60, ≤ 2 chủ đề/từ, không mồ côi
{ const T = await import('../lexicon/expand/topics.mjs'), { TOPIC_CHOICES } = await import('../lexicon/expand/lib.mjs'), tax = T.TAX(), exs = T.existingSets();
  ok(exs.size === 104, `104 bộ hiện có (thấy ${exs.size})`);
  ok(TOPIC_CHOICES.every(t => tax.topics.some(x => x.id === t)) && tax.topics.length === TOPIC_CHOICES.length, 'cây chủ đề = TOPIC_CHOICES (lxgen)');
  const pos = ['n', 'v', 'adj', 'adv'], fx = [];
  for (let i = 0; i < 400; i++) { const t = i < 150 ? 'food' : i < 160 ? 'space' : i < 165 ? 'sport' : TOPIC_CHOICES[i % TOPIC_CHOICES.length]; fx.push({ k: 'w' + i + '#' + pos[i % 4], e: { w: 'w' + i, pos: pos[i % 4], level: ['A2', 'B1', 'B2', 'C1'][i % 4], z: 5 - (i % 37) / 10, def: 'thing ' + (i % 7), syn: [], col: [], topic: t, topic2: i % 9 === 0 ? 'travel' : '' } }); }
  fx.push({ k: 'odd#n', e: { w: 'odd', pos: 'n', level: 'B1', z: 3, def: 'x', topic: 'not-a-topic' } });
  const r = T.buildTopicSets(fx, tax, exs), er = T.validate(r, fx, tax, exs);
  ok(!er.length, 'chủ đề mẫu: ' + er.slice(0, 5).join('; '));
  ok(r.nodes.some(n => /^food\.n\.\d$/.test(n.id)) || r.nodes.some(n => n.id.startsWith('food.')), 'nút food có');
  ok(r.nodes.every(n => n.sets.every(s => s.anchors.length <= tax.rules.anchors && s.anchors.every(a => !s.words.includes(a)))), 'từ neo ≤ 2, không trùng từ trong bộ');
  ok(T.assignTopics({ pos: 'v', topic: 'food', topic2: 'travel' }, tax).join() === 'food.v,travel.v' && T.assignTopics({ pos: 'adj', topic: '' }, tax).join() === 'xw-everyday.d', 'assignTopics');
  const big = Array.from({ length: 130 }, (_, i) => ({ k: 'b' + i + '#n', e: { w: 'b' + i, pos: 'n', level: 'B2', z: 4, def: 'd', topic: 'food' } })), rb = T.buildTopicSets(big, tax, exs);
  ok(rb.nodes.length === 3 && rb.nodes.every(n => n.n <= 60) && !T.validate(rb, big, tax, exs).length, 'nút > 60 tách phần');
  const sm = big.slice(0, 7), rs = T.buildTopicSets(sm, tax, exs); ok(!rs.nodes.length && rs.waiting.length === 7 && !T.validate(rs, sm, tax, exs).length, 'nút < 10 → chờ, không mồ côi');
  // dữ liệu thật: mọi mục mở rộng (đã xuất + chờ soát)
  const real = T.allEntries().flatMap(({ J }) => Object.entries(J.items).map(([k, e]) => ({ k, e }))), rr = T.buildTopicSets(real, tax, exs), re = T.validate(rr, real, tax, exs);
  ok(!re.length, 'chủ đề mục mở rộng: ' + re.slice(0, 5).join('; '));
  ok(real.every(x => x.e.tp && x.e.tp.length >= 1 && x.e.tp.length <= 2), 'mọi mục mở rộng có tp (1–2) – chạy topics.mjs --assign'); }
// sổ việc hạ nguồn: mọi script đọc kho phải đăng ký + đường nạp còn trong mã
const REG = JSON.parse(fs.readFileSync(path.join(ROOT, 'infra/lexicon-consumers.json'), 'utf8'));
const walk = d => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true }).flatMap(x => x.isDirectory() ? (x.name === 'test' && d === 'scripts' ? [] : walk(d + '/' + x.name)) : /\.(mjs|js|cjs|py)$/.test(x.name) ? [d + '/' + x.name] : []);
const READS = /loadAll\(|loadAllPlus\(|loadBrowserIndex\(|dist\/lexicon\.json|IELTS_DATA\.INDEX/;
for (const f of walk('scripts')) { const s = fs.readFileSync(path.join(ROOT, f), 'utf8'); if (!READS.test(s)) continue; const c = REG.consumers[f]; ok(c, `${f} đọc kho từ nhưng chưa có trong infra/lexicon-consumers.json (via expand-aware hoặc skip + lý do)`); if (c && c.via) ok(s.includes(c.via) || (c.via === 'loadBrowserIndex' && s.includes('loadBrowserIndex')), `${f}: via "${c.via}" không còn trong mã`); }
for (const f of Object.keys(REG.consumers)) ok(fs.existsSync(path.join(ROOT, f)), `infra/lexicon-consumers.json: ${f} không tồn tại`);
// trường mới của mục từ mở rộng phải khai trong fields (để rà việc hạ nguồn)
for (const k of Object.keys(toIndex({ ...good(), note_vi: 'x' }))) ok(REG.fields.includes(k), `trường "${k}" của mục mở rộng chưa khai trong infra/lexicon-consumers.json fields`);
// mục đã xuất: qua lại cổng + có trong mảnh
const pub = loadExpand();
if (pub.length) { const { buildShards } = await import('../lexicon/shards.mjs'); const b = buildShards(); const Lex = (await import('module')).createRequire(import.meta.url)(path.join(ROOT, 'web/js/lex.js'));
  for (const { k, e } of pub) { ok(gateEntry(e).ok, `${k} đã xuất nhưng trượt cổng`); ok(b.E.has(Lex.norm(e.w)), `${k} đã xuất nhưng không có trong mảnh tra từ`); } }
if (REG.todo && Object.keys(REG.todo).length) console.log('⚠ lexicon-expand việc hạ nguồn còn thiếu: ' + Object.keys(REG.todo).join(', '));
if (fail) { console.error(`✗ lexicon-expand: ${fail} lỗi`); process.exit(1); }
console.log(`✓ lexicon-expand: cổng mục + dịch ngược + ${Object.keys(REG.consumers).length} việc hạ nguồn · ${pub.length} mục đã xuất`);
