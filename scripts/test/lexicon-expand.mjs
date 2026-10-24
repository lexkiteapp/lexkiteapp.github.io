// Mở rộng kho từ (docs/LEXICON.md §Mở rộng 20k): cổng mục (gateEntry), dịch ngược, sổ việc hạ nguồn (infra/lexicon-consumers.json).
import fs from 'fs';
import path from 'path';
import { gateEntry, btMatch, btOk, toIndex, LANGS, loadExpand, poolEmpty, queueable, breaker, sourceGap, doneWords } from '../lexicon/expand/lib.mjs';
import { normEspeak, compare } from '../lexicon/expand/espeak.mjs';
import { clean } from '../lexicon/expand/wikt.mjs';
import { parseCmu, pickPron, ipaAgrees } from '../lexicon/expand/cmu.mjs';
import { arpaToIpa } from '../lexicon/ipa.mjs';
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
// lỗ dữ liệu nguồn (pilot 40077853589: 267 mục thiếu IPA Anh bị đẩy vào hàng duyệt, không bao giờ làm lại) → KHÔNG vào hàng duyệt
{ const g = good(); g.ipa = ''; ok(sourceGap(gateEntry(g)), 'thiếu IPA Anh = lỗ dữ liệu nguồn'); g.ipaUS = ''; ok(sourceGap(gateEntry(g)), 'thiếu cả IPA Mỹ = lỗ nguồn');
  const h = good(); h.ipa = ''; h.vi = 'abandon'; ok(!sourceGap(gateEntry(h)), 'thiếu IPA + lỗi nội dung → không phải chỉ lỗ nguồn'); ok(!sourceGap(gateEntry(good())) && !sourceGap(gateEntry(null)), 'sourceGap: mục đạt / gen hỏng'); }
// IPA Anh: Wiktionary giữ ɡ (bản cũ đổi thành g ngoài bảng), bỏ dấu nối/âm tiết; espeak en-gb → ˈ đầu âm tiết, r, æ, không ˈ từ 1 âm tiết
ok(clean('/ɡəʊt/') === '/ɡəʊt/' && clean('/ˈt͡ʃɪp/') === '/ˈtʃɪp/' && clean('/ˈbʌtn̩/') === '/ˈbʌtn/' && clean('/ˈaʊ̯ə/') === '/ˈaʊə/', 'clean IPA Wiktionary');
ok(normEspeak('fɔːsˈeɪk') === '/fɔːˈseɪk/' && normEspeak('həlˈəʊ') === '/həˈləʊ/' && normEspeak('ʃˈʊə') === '/ʃʊə/' && normEspeak('kˌɒmbɪnˈeɪʃən') === '/ˌkɒmbɪˈneɪʃən/' && normEspeak('ˈeəɹɪə') === '/ˈeəriə/' && normEspeak('hˈapi') === '/ˈhæpi/', 'normEspeak');
ok(compare('/ˈkʌlɪnəri/', '/ˈkʌlɪn(ə)ri/').exact && compare('/dɪˈstɔːt/', '/dɪsˈtɔːt/').near && !compare('/ˈsɪɡəret/', '/ˈbɒtəl/').near, 'compare espeak ↔ Wiktionary');
// dịch ngược: lồng nhau + dung sai theo ngôn ngữ (lỏng chỉ ở ngôn ngữ xa, khi cả 2 giám khảo ≥ 4)
ok(!btMatch('trumpet', 'trump') && btMatch('to reclaim', 'claim') && btMatch('records', 'record'), 'btMatch: dài hơn chỉ khi phụ tố (trump ⊄ trumpet)');
ok(btMatch('after', 'afterwards') && btMatch('to claim back', 'reclaim') && !btMatch('to eat', 'reclaim'), 'btMatch lồng nhau');
{ const e = { w: 'savor', syn: ['relish'], def: 'to enjoy the taste of food slowly', qa: { btw: { zh: ['taste'], de: ['taste'] }, tr: { zh: [5, 4], de: [5, 4] } } };
  ok(btOk(e, 'zh') && !btOk(e, 'de'), 'btOk: zh lỏng (từ của định nghĩa), de chặt'); e.qa.tr.zh = [5, 3]; ok(!btOk(e, 'zh'), 'btOk: lỏng cần cả 2 giám khảo ≥ 4'); }
const Q = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/qa/review-queue.json'), 'utf8')).items || [];
ok(!Q.some(q => q.src === 'lexicon-expand' && /^gen:/.test((q.why || [])[0] || '') && !q.data), 'hàng duyệt không chứa mục lexicon-expand "gen" rỗng (lỗi hạ tầng)');
ok(!Q.some(q => q.src === 'lexicon-expand' && (q.why || []).some(y => /^ipa[ :]/.test(y))), 'hàng duyệt không chứa mục lexicon-expand trượt vì lỗ dữ liệu nguồn (ipa) – node scripts/lexicon/expand/requeue.mjs --gaps');
{ const R = path.join(ROOT, 'content/lexicon/expand/retry/words.json'); if (fs.existsSync(R)) { const d = doneWords(), r = JSON.parse(fs.readFileSync(R, 'utf8')).items; ok(r.every(k => !d.has(k.split('#')[0])), 'từ trong retry/words.json không bị doneWords() loại'); } }
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

// ---- IPA theo từ loại: 20 cặp danh/tính – động từ đổi trọng âm / s–z / -ate (CMUdict thật, pilot 7: reuse#v)
const CMU = parseCmu(`record R AH0 K AO1 R D
record(2) R EH1 K ER0 D
record(3) R IH0 K AO1 R D
present P R EH1 Z AH0 N T
present(2) P R IY0 Z EH1 N T
present(3) P ER0 Z EH1 N T
reuse R IY0 Y UW1 S
reuse(2) R IY0 Y UW1 Z
use Y UW1 S
use(2) Y UW1 Z
abuse AH0 B Y UW1 S
abuse(2) AH0 B Y UW1 Z
excuse IH0 K S K Y UW1 S
excuse(2) IH0 K S K Y UW1 Z
misuse M IH0 S Y UW1 Z
misuse(2) M IH0 S Y UW1 S
close K L OW1 S
close(2) K L OW1 Z
object AA1 B JH EH0 K T
object(2) AH0 B JH EH1 K T
project P R AA1 JH EH0 K T
project(2) P R AH0 JH EH1 K T
conflict K AA1 N F L IH0 K T
conflict(2) K AH0 N F L IH1 K T
contrast K AA1 N T R AE0 S T
contrast(2) K AH0 N T R AE1 S T
decrease D IH0 K R IY1 S
decrease(2) D IY1 K R IY2 S
increase IH2 N K R IY1 S
increase(2) IH1 N K R IY2 S
insult IH2 N S AH1 L T
insult(2) IH1 N S AH2 L T
rebel R EH1 B AH0 L
rebel(2) R IH0 B EH1 L
suspect S AH0 S P EH1 K T
suspect(2) S AH1 S P EH2 K T
survey S ER0 V EY1
survey(2) S ER1 V EY2
estimate EH1 S T AH0 M AH0 T
estimate(2) EH1 S T AH0 M EY2 T
separate S EH1 P ER0 EY2 T
separate(2) S EH1 P ER0 IH0 T
separate(3) S EH1 P R AH0 T
perfect P ER0 F EH1 K T
perfect(2) P ER1 F IH2 K T
palm P AA1 M`);
const PAIRS = [ // [từ, từ loại danh/tính, biến thể mong đợi danh/tính, biến thể mong đợi động từ]
  ['record', 'n', 'R EH1 K ER0 D', 'R AH0 K AO1 R D'], ['present', 'n', 'P R EH1 Z AH0 N T', 'P R IY0 Z EH1 N T'], ['reuse', 'n', 'R IY0 Y UW1 S', 'R IY0 Y UW1 Z'],
  ['use', 'n', 'Y UW1 S', 'Y UW1 Z'], ['abuse', 'n', 'AH0 B Y UW1 S', 'AH0 B Y UW1 Z'], ['excuse', 'n', 'IH0 K S K Y UW1 S', 'IH0 K S K Y UW1 Z'], ['misuse', 'n', 'M IH0 S Y UW1 S', 'M IH0 S Y UW1 Z'],
  ['close', 'adj', 'K L OW1 S', 'K L OW1 Z'], ['object', 'n', 'AA1 B JH EH0 K T', 'AH0 B JH EH1 K T'], ['project', 'n', 'P R AA1 JH EH0 K T', 'P R AH0 JH EH1 K T'],
  ['conflict', 'n', 'K AA1 N F L IH0 K T', 'K AH0 N F L IH1 K T'], ['contrast', 'n', 'K AA1 N T R AE0 S T', 'K AH0 N T R AE1 S T'], ['decrease', 'n', 'D IY1 K R IY2 S', 'D IH0 K R IY1 S'],
  ['increase', 'n', 'IH1 N K R IY2 S', 'IH2 N K R IY1 S'], ['insult', 'n', 'IH1 N S AH2 L T', 'IH2 N S AH1 L T'], ['rebel', 'n', 'R EH1 B AH0 L', 'R IH0 B EH1 L'],
  ['suspect', 'n', 'S AH1 S P EH2 K T', 'S AH0 S P EH1 K T'], ['survey', 'n', 'S ER1 V EY2', 'S ER0 V EY1'], ['estimate', 'n', 'EH1 S T AH0 M AH0 T', 'EH1 S T AH0 M EY2 T'],
  ['separate', 'adj', 'S EH1 P ER0 IH0 T', 'S EH1 P ER0 EY2 T'], ['perfect', 'adj', 'P ER1 F IH2 K T', 'P ER0 F EH1 K T']];
ok(PAIRS.length >= 20, '≥ 20 cặp');
for (const [w, pn, en, ev] of PAIRS) { ok(pickPron(CMU.get(w), pn) === en, `IPA ${w}#${pn}: ${pickPron(CMU.get(w), pn)} ≠ ${en}`); ok(pickPron(CMU.get(w), 'v') === ev, `IPA ${w}#v: ${pickPron(CMU.get(w), 'v')} ≠ ${ev}`); }
ok(pickPron(CMU.get('palm'), 'n') === 'P AA1 M' && pickPron(['A', 'B'], 'adv') === 'A', 'không đổi trọng âm → biến thể 1');
ok(arpaToIpa(pickPron(CMU.get('reuse'), 'v')).endsWith('z'), 'reuse#v kết thúc /z/');
{ const vs = CMU.get('record'); ok(ipaAgrees('/rɪˈkɔːd/', vs, pickPron(vs, 'v')) && !ipaAgrees('/ˈrekɔːd/', vs, pickPron(vs, 'v')) && ipaAgrees('/ˈrekɔːd/', vs, pickPron(vs, 'n')), 'IPA Anh khớp từ loại (record)');
  const ru = CMU.get('reuse'); ok(ipaAgrees('/riːˈjuːz/', ru, pickPron(ru, 'v')) && !ipaAgrees('/riːˈjuːs/', ru, pickPron(ru, 'v')), 'IPA Anh khớp s/z (reuse)'); }
// ---- cổng mới (pilot 7): khóa nghĩa, phiên âm, CEFR giám khảo, vi đối chiếu Wiktionary, ipa-pos
const g2 = () => { const e = good(); e.qa.sense = ['yes', 'yes']; e.qa.cefrJ = ['C1', 'B2']; e.level = 'C1'; e.cefrF = 'C1'; e.qa.bad = {}; return e; };
ok(gateEntry(g2()).ok, 'mục tốt (trường mới) đạt: ' + JSON.stringify(gateEntry(g2()).why));
const bad2 = (f, m) => { const e = g2(); f(e); ok(!gateEntry(e).ok, 'phải trượt: ' + m); };
bad2(e => e.qa.sense = ['yes', 'no'], 'một giám khảo nói sai nghĩa');
bad2(e => e.qa.sense = ['yes'], 'thiếu câu trả lời nghĩa');
bad2(e => e.qa.bad = { hi: 'translit' }, 'hi phiên âm');
bad2(e => e.qa.bad = { es: 'pos' }, 'es khác từ loại');
bad2(e => { e.level = 'A2'; e.cefrF = 'A2'; e.qa.cefrJ = ['B2', 'B1']; }, 'CEFR giám khảo lệch 2 bậc (assault A2)');
bad2(e => e.qa.vi = ['ok', 'unsure'], 'vi khác Wiktionary, chưa chắc');
bad2(e => e.ipaPos = false, 'IPA Anh không khớp từ loại');
bad2(e => e.posDrift = 'n', 'đổi từ loại');
ok(sourceGap(gateEntry(Object.assign(g2(), { ipa: '' }))) && !sourceGap(gateEntry(Object.assign(g2(), { ipa: '', ipaPos: false }))), 'ipa-pos không phải lỗ nguồn');
{ const e = g2(); e.cefrSrc = 'cefrj'; e.level = 'B2'; e.qa.cefrJ = ['C2', 'C2']; ok(gateEntry(e).ok, 'CEFR-J thắng ý giám khảo'); }
{ const e = g2(); e.qa.vi = ['fixed', 'fixed']; ok(gateEntry(e).ok, 'vi đã sửa theo Wiktionary đạt'); }
if (fail) { console.error(`✗ lexicon-expand (pilot 7 fixes): ${fail} lỗi`); process.exit(1); }
