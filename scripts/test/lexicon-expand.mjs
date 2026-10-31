import { fileURLToPath } from 'node:url';
// Mở rộng kho từ (docs/LEXICON.md §Mở rộng 20k): cổng mục (gateEntry), dịch ngược, sổ việc hạ nguồn (infra/lexicon-consumers.json).
import fs from 'fs';
import path from 'path';
import { defGrammarBad } from '../lexicon/expand/lib.mjs';
import { wsdUnwrap, gateEntry, btMatch, btOk, toIndex, LANGS, loadExpand, poolEmpty, queueable, breaker, sourceGap, hasGap, doneWords, defPosOk, viBtOk, wsdOk, lockSense, viAgreeSources, viContested, trTableAmbiguous, posShapeOk, omwHas, trIn, inflRe } from '../lexicon/expand/lib.mjs';
import { grade, hasBad, applies } from '../lexicon/expand/grade.mjs';
import { nativeOwners, nativeLine } from '../lexicon/expand/tatoeba-native.mjs';
import { normEspeak, compare } from '../lexicon/expand/espeak.mjs';
import { clean } from '../lexicon/expand/wikt.mjs';
import { parseCmu, pickPron, ipaAgrees } from '../lexicon/expand/cmu.mjs';
import { arpaToIpa, ukStyle, ukStyleBad } from '../lexicon/ipa.mjs';
import { checkEntry, prefixStress, parseBritfone, oxStress } from '../lexicon/ipa-check.mjs';
const ROOT = fileURLToPath(new URL('../../', import.meta.url));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };
const TR = { es: 'abandonar', pt: 'abandonar', fr: 'abandonner', de: 'verlassen', id: 'meninggalkan', th: 'ละทิ้ง', zh: '放弃', ja: '見捨てる', ko: '버리다', hi: 'छोड़ देना', ar: 'يتخلى عن', ru: 'покидать', tr: 'terk etmek' };
const good = () => ({ w: 'forsake', pos: 'v', ipa: '/fəˈseɪk/', ipaUS: '/fərˈseɪk/', def: 'to leave someone or something completely', ex: ['He would never forsake his friends.', 'She forsook her career for her family.'], col: ['forsake a friend'], syn: ['abandon', 'desert'], level: 'C1', cefrF: 'C2', emoji: '', topic: 'xw-actions', vi: 'bỏ rơi; từ bỏ', note_vi: '', m: { ...TR },
  qa: { j: { 'gemini:gemini-3.5-flash': 5, 'gemma:gemma-3-27b-it': 4 }, tr: Object.fromEntries(LANGS.map(l => [l, [5, 4]])), btw: Object.fromEntries(LANGS.map(l => [l, ['abandon']])) } });
// pilot 20261028 lần 2 (LÕI 5/38): vi do AI lấp sai nghĩa mà 3 giám khảo cho 5 → cổng dịch ngược vi
{ const ai = (vi, bts, o = {}) => ({ ...good(), vi, src: { tr: { vi: 'ai' } }, ...o, qa: { ...good().qa, viBtw: bts, viLem: o.lem || [] } });
  ok(gateEntry(ai('bỏ rơi; từ bỏ', ['to abandon', 'to forsake; to desert', 'to give up'])).ok, 'vi AI: dịch ngược khớp → đạt');
  ok(gateEntry(ai('cúm', ['flu', 'influenza', 'flu'], { w: 'bight', pos: 'n', def: 'a loop formed in a rope', syn: [] })).why.some(x => /dịch vi: AI lấp, dịch ngược không khớp/.test(x)), 'vi AI: bight "cúm" → trượt');
  ok(gateEntry(ai('kỷ niệm', ['souvenir; fond memory', 'memento', 'keepsake'], { w: 'recollection', def: 'the ability to remember past events', syn: [] })).why.some(x => /dịch ngược không khớp/.test(x)), 'vi AI: recollection "kỷ niệm" → trượt');
  ok(viBtOk({ w: 'foul', def: 'very offensive and causing disgust', syn: [], qa: { viBtw: ['disgusting', 'revolting', 'disgusting; repulsive'] } }), 'vi AI: khớp gốc từ của def (disgusting ~ disgust)');
  ok(viBtOk({ w: 'foul', def: 'x', syn: [], qa: { viBtw: ['disgusting', 'disgusting'], viLem: ['disgusting', 'foul'] } }), 'vi AI: khớp lemma WordNet');
  ok(!viBtOk({ w: 'caucus', def: 'to meet in order to choose a candidate or support a policy', syn: [], qa: { viBtw: ['to vote', 'to elect; to vote', 'to vote'] } }), 'vi AI: caucus "bầu chọn" → không khớp');
  ok(hasGap(gateEntry(ai('bỏ rơi', ['to abandon']))), 'vi AI: thiếu dịch ngược = lỗ → sinh lại, không vào hàng duyệt');
  ok(gateEntry({ ...good(), src: { tr: { vi: 'wiktionary' } } }).ok, 'vi Wiktionary: không cần dịch ngược'); }
// pilot 20261028@13:31Z (LÕI 6/50): nghĩa phụ lọt cổng, vi Wiktionary sai nghĩa khoá, IPA Anh ký hiệu cũ əː
{ const g = (vi, src, bts, o = {}) => gateEntry({ ...good(), vi, src: { tr: { vi: src } }, ...o, qa: { ...good().qa, viBtw: bts, viLem: o.lem || [] } });
  ok(g('di chúc', 'ai', ['will', 'will; testament'], { w: 'bequest', def: 'a legal gift of personal property left in a will', syn: [] }).why.some(x => /dịch vi: AI lấp, dịch ngược không khớp/.test(x)), 'vi AI: chỉ khớp từ đuôi def (bequest "di chúc" = will) → trượt');
  ok(viBtOk({ w: 'haven', def: 'a shelter that provides safety or sanctuary', syn: [], qa: { viBtw: ['place of shelter; refuge', 'safe place; shelter'] } }), 'vi AI: khớp lõi def (shelter) → đạt');
  ok(g('tính hư ảo', 'wiktionary', ['illusoriness', 'futility; emptiness'], { w: 'vanity', def: 'feelings of excessive pride', syn: [] }).why.some(x => /dịch vi: Wiktionary, dịch ngược không khớp/.test(x)), 'vi Wiktionary: sai nghĩa khoá (vanity "tính hư ảo") → trượt');
  ok(g('bỏ rơi; từ bỏ', 'wiktionary', ['to abandon', 'to forsake; to desert', 'to give up']).ok, 'vi Wiktionary: dịch ngược khớp → đạt');
  ok(ukStyleBad('/ˈvɪnəɡəː/') && !ukStyleBad('/ˈvɪnɪɡə/') && !ukStyleBad('/bɜːd/'), 'ukStyleBad: əː (ký hiệu cũ) → lỗ'); }
// pilot 20261028 (soát tay LÕI 8/50, DỊCH 2/50): IPA Anh sai kiểu kho, ví dụ không phải câu, nội dung tình dục → trượt
ok(ukStyle('/brad/') === '/bræd/' && ukStyle('/ˈɑː(r)mtʃeə(r)/') === '/ˈɑːmtʃeə(r)/' && ukStyle('/ˈɔɪntm(ə)nt/') === '/ˈɔɪntmənt/' && ukStyle('/ˈtaɪfɔɪd/') === '/ˈtaɪfɔɪd/', 'ukStyle: a→æ, (ə)→ə, (r) giữa từ bỏ, aɪ/aʊ giữ');
ok(ukStyleBad('/brad/') && ukStyleBad('/ˈfaɪbə(r)x/') && !ukStyleBad('/ˈfaɪbə(r)/') && !ukStyleBad('/aʊl/'), 'ukStyleBad: phát hiện a đơn / ( giữa từ');
ok(gateEntry({ ...good(), ipa: '/brad/' }).why.some(x => /^ipa: Anh sai kiểu/.test(x)), 'cổng: IPA Anh a đơn → lỗ nguồn (sinh lại)');
ok(gateEntry({ ...good(), ex: ['a forsaken old house', 'She forsook her career for her family.'] }).why.some(x => /không phải câu/.test(x)), 'cổng: ví dụ là cụm từ → trượt');
ok(gateEntry({ ...good(), ex: ['He would never forsake his friends.', 'She forsook her career for her family.'] }).ok, 'cổng: 2 câu hoàn chỉnh vẫn đạt');
ok(gateEntry({ ...good(), ex: ['He would never forsake his friends.', 'She forsook sex for her career.'] }).why.some(x => /tình dục/.test(x)), 'cổng: nội dung tình dục → hàng duyệt');
// từ không có thật trong ngôn ngữ đích (trcheck.py wordfreq – pilot 11 mainline pt "inyectar") → trượt
ok(gateEntry({ ...good(), trBad: { pt: ['inyectar'] } }).why.some(x => /dịch pt: từ không có thật/.test(x)), 'cổng: trBad (wordfreq) → trượt');
// đồng thuận 3 giám khảo (chủ 27/10): qa.n = 3 mà chỉ 2 họ → trượt; bản dịch thiếu điểm giám khảo thứ 3 → trượt
{ const g3 = good(); g3.qa = { ...g3.qa, n: 3 }; ok(gateEntry(g3).why.some(x => /cần 3 giám khảo/.test(x)) && gateEntry(g3).why.some(x => /dịch es: giám khảo < 4/.test(x)), 'cổng: đồng thuận 3 giám khảo'); }
// CỔNG THEO TRƯỜNG (chủ 27/10): lõi Anh + vi quyết định mục; mỗi ngôn ngữ chỉ giữ khi nguồn Wiktionary + đủ 3 giám khảo ≥ 4 + dịch ngược khớp
{ const g = good(), J3 = { 'gpt-oss:gpt-oss-120b': 5, 'llama:llama-3.3-70b': 4, 'mistral:mistral-small-3.1-24b-instruct': 5 };
  g.perLang = true; g.qa = { ...g.qa, n: 3, j: J3, tr: Object.fromEntries(LANGS.map(l => [l, [5, 4, 5]])) };
  g.src = { ...(g.src || {}), tr: Object.fromEntries(LANGS.map(l => [l, l === 'es' ? 'ai' : 'wiktionary'])) };
  g.trBad = { pt: ['inyectar'] };
  const r = gateEntry(g);
  ok(r.ok && !r.keep.includes('es') && !r.keep.includes('pt') && r.keep.includes('fr') && /người viết/.test(r.drop.es) && /không có thật/.test(r.drop.pt), 'theo trường: bỏ ngôn ngữ AI lấp / từ lạ, mục vẫn đạt');
  const g2 = { ...g, m: {} }; ok(gateEntry(g2).ok && gateEntry(g2).keep.every(l => !g2.m[l]), 'theo trường: không ngôn ngữ nào (chỉ lõi Anh + vi) vẫn đạt');
  const g3 = { ...g, vi: '' }; ok(!gateEntry(g3).ok, 'theo trường: thiếu vi (lõi) → trượt'); }
// định nghĩa đúng hình từ loại (pilot 11: purple#adj "a colour…")
ok(defPosOk('to take revenge', 'v') && !defPosOk('take revenge', 'v') && !defPosOk('a colour between red and blue', 'adj') && defPosOk('of a colour between red and blue', 'adj') && !defPosOk('to run', 'n') && defPosOk('very quickly', 'adv'), 'defPosOk theo quy ước kho');
ok(gateEntry({ ...good(), def: 'leave someone or something completely' }).why.some(x => /hình từ loại/.test(x)), 'cổng: định nghĩa động từ thiếu "to …" → trượt');
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
// pilot 20261027: lý do của giám khảo = lỗi (calmness vi "sự yên lặng" lọt với điểm 4); ví dụ nhắc nhóm tôn giáo/sắc tộc → trượt
bad(e => e.qa.f = ['Vietnamese translation incorrect'], 'giám khảo nêu lỗi trong f');
ok(gateEntry({ ...good(), qa: { ...good().qa, f: [] } }).ok && gateEntry({ ...good(), qa: { ...good().qa, f: '' } }).ok, 'f rỗng vẫn đạt');
bad(e => e.ex = ['You should never forsake your friends.', 'You shouldn\'t forsake all Muslims.'], 'ví dụ nhắc nhóm tôn giáo');
ok(gateEntry(null).ok === false && gateEntry(good(), { keep: false }).ok === false, 'không sinh được / keep=false → hàng duyệt');
ok(btMatch('to abandon', 'forsake', ['abandon']) && !btMatch('to eat', 'forsake', ['abandon']), 'btMatch');
// lỗi hạ tầng (pilot 40070729116: kho 1 khóa hết hạn mức → 503 keys=0) không được vào hàng duyệt, cầu dao ngắt sau 3 lần
ok(poolEmpty(503, '{"error":"no-model","diag":"keys=0"}') && !poolEmpty(503, '{"error":"no-model","diag":"keys=2 k1:429"}') && !poolEmpty(401, 'keys=0'), 'poolEmpty');
ok(!queueable(gateEntry(null), false) && queueable(gateEntry(null), true) && queueable(gateEntry(good(), { keep: false }), false) && !queueable(gateEntry(good()), true), 'queueable: gen hỏng do API → bỏ qua, lỗi nội dung → hàng duyệt');
{ const b = breaker(3); b.hit(true); b.hit(true); b.hit(false); b.hit(true); b.hit(true); ok(!b.open, 'cầu dao reset khi gọi được'); b.hit(true); ok(b.open, 'cầu dao mở sau 3 lần kho rỗng liên tiếp'); }
// lỗ dữ liệu nguồn (pilot 40077853589: 267 mục thiếu IPA Anh bị đẩy vào hàng duyệt, không bao giờ làm lại) → KHÔNG vào hàng duyệt
{ const g = good(); g.ipa = ''; ok(sourceGap(gateEntry(g)), 'thiếu IPA Anh = lỗ dữ liệu nguồn'); g.ipaUS = ''; ok(sourceGap(gateEntry(g)), 'thiếu cả IPA Mỹ = lỗ nguồn');
  const h = good(); h.ipa = ''; h.vi = 'abandon'; ok(!sourceGap(gateEntry(h)), 'thiếu IPA + lỗi nội dung → không phải chỉ lỗ nguồn'); ok(hasGap(gateEntry(h)) && !hasGap(gateEntry(good())) && !hasGap(null), 'thiếu IPA + lỗi nội dung → vẫn có lỗ nguồn → làm lại, không vào hàng duyệt (job.mjs)'); ok(!sourceGap(gateEntry(good())) && !sourceGap(gateEntry(null)), 'sourceGap: mục đạt / gen hỏng'); }
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
ok(!Q.some(q => q.src === 'lexicon-expand' && hasGap({ ok: false, why: q.why || [] })), 'hàng duyệt không chứa mục lexicon-expand trượt vì lỗ dữ liệu nguồn (ipa) – node scripts/lexicon/expand/requeue.mjs --gaps');
{ const R = path.join(ROOT, 'content/lexicon/expand/retry/words.json'); if (fs.existsSync(R)) { const d = doneWords(), r = JSON.parse(fs.readFileSync(R, 'utf8')).items; ok(r.every(k => !d.has(k)), 'mục trong retry/words.json không bị doneWords() loại (khoá từ#loại)'); } }
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
// ---- "RA LÀ OK" 29/10: mỗi lớp lỗi đã gặp (docs/LEXICON.md §Mở rộng 20k – bảng lớp lỗi) có test chặn
{ const J3 = { 'gpt-oss:gpt-oss-120b': 5, 'llama:llama-3.3-70b': 4, 'mistral:mistral-small-3.1-24b-instruct': 5 };
  const base = () => { const g = good(); g.perLang = true; g.qa = { ...g.qa, n: 3, j: J3, tr: Object.fromEntries(LANGS.map(l => [l, [5, 4, 5]])), wsd: { ex: [true, true], vi: true, tr: Object.fromEntries(LANGS.map(l => [l, true])) }, viSrc: ['wk', 'a'] };
    g.src = { ...(g.src || {}), tr: Object.fromEntries(LANGS.map(l => [l, 'wiktionary+omw+ai'])) }; g.senseLock = 'wiktionary-1'; return g; };
  ok(gateEntry(base()).ok, 'ra là ok: mục đủ trắc nghiệm nghĩa + 2 nguồn vi phải đạt: ' + JSON.stringify(gateEntry(base()).why));
  // L1 vi sai nghĩa khoá (idol "thần tượng", bequest "di chúc"): vi chỉ 1 nguồn → trượt; vi không qua trắc nghiệm nghĩa → trượt
  ok(gateEntry({ ...base(), qa: { ...base().qa, viSrc: ['a'] } }).why.some(x => /2 nguồn/.test(x)) && gateEntry({ ...base(), qa: { ...base().qa, viSrc: ['b', 'c'] } }).why.some(x => /cần Wiktionary/.test(x)), 'L1: vi 1 nguồn / chỉ AI đồng thuận (expel "trục xuất") → trượt');
  // 31/10 phễu 600 (rớt vi 178): Wiktionary tiếng Việt = nguồn người viết thứ hai (wv) – vẫn cần ≥ 2 nguồn + trắc nghiệm 3/3 + không bị AI phản bác
  ok(gateEntry({ ...base(), qa: { ...base().qa, viSrc: ['wv', 'a'] } }).ok && gateEntry({ ...base(), qa: { ...base().qa, viSrc: ['wv'] } }).why.some(x => /2 nguồn/.test(x)), 'L1: vi Wiktionary tiếng Việt + 1 AI = đạt; 1 nguồn = trượt');
  { const r = viAgreeSources({ wk: [], wv: ['bóc vỏ', 'gọt vỏ', 'lột'], a: 'bóc vỏ', b: 'lột vỏ', c: '' }); ok(r.length === 1 && r[0].v === 'bóc vỏ' && r[0].src.join() === 'wv,a', 'viAgreeSources: wv + AI trùng → phương án (peel#v "bóc vỏ")');
    ok(!viContested({ v: 'bóc vỏ', src: ['wv', 'a', 'b'] }, { a: 'bóc vỏ', b: 'bóc vỏ', c: 'lột' }) && viContested({ v: 'gọt', src: ['wv', 'a'] }, { a: 'gọt', b: 'bóc vỏ', c: 'lột vỏ' }), 'viContested: wv là người viết – không tính phiếu ủng hộ AI; AI họ khác phản bác vẫn chặn'); }
  { const f = (wv, a, c) => viAgreeSources({ wk: [], wv, a, b: '', c });
    ok(f(['mụ phù thuỷ'], 'phù thủy', '').length === 0 && f(['phù thuỷ'], 'phù thủy', '')[0].src.join() === 'wv,a', 'viKey: dấu thanh kiểu cũ/mới (thuỷ = thủy)');
    ok(f(['giấc ngủ ngắn lơ mơ'], 'giấc ngủ ngắn', '')[0].src.join() === 'a,wv' && f(['ném lên'], 'ném', '')[0].v === 'ném', 'viAgreeSources: khớp đầu ngữ (người viết = phương án + ≤ 2 âm tiết sau)');
    ok(f(['lòng bàn tay'], 'bàn tay', '').length === 0 && f(['dãy núi lởm chởm cao vút'], 'dãy núi', '').length === 0, 'viAgreeSources: KHÔNG khớp đuôi (lòng bàn tay ≠ bàn tay), không quá 2 âm tiết');
    ok(f(['thói nghiện'], 'nghiện', '')[0].src.join() === 'wv,a', 'viKey: bỏ "thói" chỉ loại đầu'); }
  { const py = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/viwikt.py'), 'utf8'), J = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/job.mjs'), 'utf8'), Y = fs.readFileSync(path.join(ROOT, '.github/workflows/lexicon-expand.yml'), 'utf8');
    ok(/wv: WV\[x\.k\]/.test(J) && /--viwk/.test(Y) && /viwiktionary\/raw-wiktextract-data\.jsonl\.gz/.test(Y) && /CC BY-SA 4\.0/.test(py) && /Wiktionary en \+ vi CC BY-SA 4\.0/.test(J), 'viwikt: nối vào job + workflow, ghi giấy phép'); }
  { const R = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/requeue.mjs'), 'utf8'), Y = fs.readFileSync(path.join(ROOT, '.github/workflows/lexicon-expand.yml'), 'utf8');
    ok(/FUNNEL_RE = x => \(x\.why \|\| \[\]\)\.length > 0 && \(x\.why \|\| \[\]\)\.every\(y => \/\^\(dịch vi\|ví dụ\):\//.test(R) && !/requeue\.mjs[^\n]*--funnel/.test(Y), 'requeue --funnel: chỉ mục rớt vi/ví dụ, KHÔNG chạy mỗi lượt (lặp vô hạn)'); }
  ok(gateEntry({ ...base(), qa: { ...base().qa, wsd: { ...base().qa.wsd, vi: false } } }).why.some(x => /dịch vi: chưa qua trắc nghiệm/.test(x)), 'L1: vi không qua trắc nghiệm nghĩa → trượt');
  ok(viAgreeSources({ wk: ['thần tượng'], a: 'tượng thần', b: 'tượng thờ' }).length === 0 && viAgreeSources({ wk: ['thần tượng; tượng thần'], a: 'tượng thần' }).map(o => o.v).join() === 'tượng thần', 'L1: vi chỉ nhận phương án ≥ 2 nguồn trùng');
  // L1 (31/10 peel#v "gọt"): Wiktionary + lxtr trùng, trắc nghiệm 3/3 vẫn sai – AI họ khác trả "bóc vỏ" → phản bác; ủng hộ phải NHIỀU HƠN phản bác
  { const peel = viAgreeSources({ wk: ['gọt'], a: 'gọt', b: '', c: 'bóc vỏ' })[0];
    ok(peel && viContested(peel, { a: 'gọt', b: '', c: 'bóc vỏ' }) && !viContested(peel, { a: 'gọt', b: '', c: '' }) && !viContested(peel, { a: 'gọt', b: 'gọt vỏ', c: '' }) && viContested(peel, { a: 'gọt', b: 'lột vỏ', c: 'bóc vỏ' })
      && !viContested(viAgreeSources({ wk: ['ba lê'], a: 'ba lê', c: 'múa ba lê' })[0], { a: 'ba lê', b: '', c: 'múa ba lê' }) && !viContested(viAgreeSources({ wk: ['ốc sên'], a: 'ốc sên', c: 'ốc sên' })[0], { a: 'ốc sên', b: 'con ốc', c: 'ốc sên' }), 'L1: vi Wiktionary + 1 AI bị AI họ khác phản bác → không nhận (peel "gọt")'); }
  // L4 def sai ngữ pháp (soát Sonnet 31/10: resuscitate "…or life to", orphan "whose both parents") → viết lại 1 lần, còn sai = trượt schema
  ok(defGrammarBad('to restore consciousness, energy, or life to') && defGrammarBad('a child whose both parents have died') && !defGrammarBad('a child whose parents have both died') && !defGrammarBad('to stop fighting and give in') && !defGrammarBad('to bring someone back to life.')
    && gateEntry({ ...base(), def: 'to restore consciousness, energy, or life to' }).why.some(x => /ngữ pháp/.test(x)), 'L4: định nghĩa sai ngữ pháp (giới từ cụt, lượng từ sau "whose") → trượt');
  // L2 (31/10 snail#n "We were late going to look for snails." – LeeSooHa eng cấp 4): câu đúng nghĩa nên qua trắc nghiệm; chặn theo nguồn – chỉ chủ câu bản ngữ (eng cấp 5)
  { const nat = nativeOwners('eng\t5\tCK\tAmerican English Native Speaker.\neng\t4\tLeeSooHa\tMalaysian English\nfra\t5\tsacredceltic\t\neng\t5\t\\N\t\n');
    ok(nat.has('CK') && !nat.has('LeeSooHa') && !nat.has('sacredceltic') && !nat.has('\\N') && nativeLine('10109473\teng\tWould you like me to peel an apple for you?\tCK\t\\N\t\\N', nat)
      && !nativeLine('13814351\teng\tWe were late going to look for snails.\tLeeSooHa\t\\N\t\\N', nat) && !nativeLine('1\teng\tRhinoceros is not a dinosaur.\t\\N', nat) && !nativeLine('1\teng\tNo owner.', nat), 'L2: câu Tatoeba chỉ của người bản ngữ (snail "We were late going to look for snails.")'); }
  // L2 ví dụ nghĩa lân cận (railroad, palate, muscular, swimmer) / câu gượng: 3 giám khảo phải cùng chọn số nghĩa khoá – 2/3 hoặc thiếu phiếu = không
  ok(wsdOk([2, 2, 2], 2) && !wsdOk([2, 2, 1], 2) && !wsdOk([2, 2], 2) && !wsdOk([2, 2, NaN], 2) && !wsdOk([0, 0, 0], 0 + 1), 'L2: trắc nghiệm nghĩa cần 3/3 đúng số');
  ok(gateEntry({ ...base(), qa: { ...base().qa, wsd: { ...base().qa.wsd, ex: [true, false] } } }).why.some(x => /ví dụ chưa qua trắc nghiệm/.test(x)), 'L2: ví dụ không qua trắc nghiệm nghĩa → trượt');
  // L3 nghĩa WordNet hiếm (conservatory "the faculty and students", fissure n.03): nghĩa 1 Wiktionary → số nghĩa 3/3, không thì null (bỏ từ)
  ok(lockSense([3, 3, 3], [2, 2, 2], 1, 3).idx === 3 && lockSense([3, 3, 1], [1, 1, 1], 1, 3).idx === 1 && lockSense([3, 3, 1], [2, 2, 2], 1, 3) === null && lockSense([0, 0, 0], null, 1, 3) === null && lockSense([4, 4, 4], null, 1, 3) === null, 'L3: khoá nghĩa thông dụng');
  ok(gateEntry({ ...base(), senseLock: false }).why.some(x => /không khoá được nghĩa thông dụng/.test(x)), 'L3: không khoá được nghĩa → trượt');
  // D1 bảng Wiktionary ghép nhầm nghĩa (repress th กลั้น, cassette zh 卡式): phải có trong lemma OMW của synset; bản dịch chưa qua trắc nghiệm nghĩa → bỏ ngôn ngữ
  ok(!omwHas('th', 'กลั้น', ['กำราบ', 'ปราบปราม']) && omwHas('ja', '抑圧する', ['圧伏+する', '抑圧+する']) && omwHas('ar', 'سِكَّة حَدِيد', ['سكة حديد']), 'D1: khớp lemma OMW (chuẩn hoá する/harakat)');
  { const g = base(); g.qa.wsd.tr = { ...g.qa.wsd.tr, th: false }; const r = gateEntry(g); ok(r.ok && !r.keep.includes('th') && /trắc nghiệm/.test(r.drop.th), 'D1: bản dịch không qua trắc nghiệm nghĩa → bỏ ngôn ngữ, mục vẫn đạt'); }
  { const g = base(); g.src.tr.ja = 'omw+ai'; g.src.tr.ko = 'wiktionary+ai'; g.src.tr.th = 'omw'; g.src.tr.zh = 'wiktionary'; g.src.tr.pt = 'wiktionary+omw'; const r = gateEntry(g);
    ok(!r.keep.includes('ja') && !r.keep.includes('ko') && r.keep.includes('es') && !r.keep.includes('th') && !r.keep.includes('zh') && !r.keep.includes('pt') && /2 nguồn/.test(r.drop.th), 'D1: bản dịch cần ĐỦ 3 nguồn Wiktionary ∩ OMW ∩ AI (detriment ko 상해, pt surpresa, crow fr corbeau omw+ai)'); }
  // D1 (31/10 razor pt "navalha"): 3 giám khảo cùng chọn bảng "shaving knife" nhưng gloss WordNet khớp ngang "shaving instrument" → bảng mơ hồ, không dùng
  ok(trTableAmbiguous(['shaving knife', 'shaving instrument', 'tusk of wild boar'], 0, 'edge tool used in shaving razor') && !trTableAmbiguous(['any animal of the class Gastropoda having a shell', 'slow person'], 0, 'freshwater or marine or terrestrial gastropod mollusk usually having an external enclosing spiral shell snail')
    && !trTableAmbiguous(['shaving knife'], 0, 'edge tool used in shaving razor'), 'D1: bảng dịch Wiktionary mơ hồ (bảng khác khớp gloss WordNet ngang) → không dùng bảng');
  ok(trIn('ko', '손해', '손해; 피해') && !trIn('ko', '상해', '손해; 피해') && trIn('ja', '損なう', ['損なうする']), 'D1: so khớp bản dịch giữa các nguồn');
  ok(viAgreeSources({ wk: ['sự khinh bỉ'], a: 'khinh bỉ' }).length === 1 && viAgreeSources({ a: 'khóc than', c: 'than khóc' }).length === 0 && viAgreeSources({ a: 'thần tượng', b: 'tượng thần' }).length === 0 && viAgreeSources({ a: 'lòng bàn tay', b: 'bàn tay' }).length === 0 && viAgreeSources({ a: 'tính toán', b: 'toán' }).length === 0 && viAgreeSources({ a: 'tính kiêu ngạo', b: 'kiêu ngạo' }).length === 1 && viAgreeSources({ a: 'thần tượng', b: 'tượng thờ' }).length === 0, 'L1: khoá so khớp vi (bỏ "sự"; đảo âm tiết = khác nghĩa: thần tượng ≠ tượng thần)');
  ok(lockSense([1, 4, 1], [1, 0, 0], 1, 4).idx === 1 && lockSense([2, 2, 1], null, 1, 4) === null, 'L3: 2/3 nghĩa 1 Wiktionary chỉ nhận khi trùng nghĩa SemCor');
  // D2 từ không tồn tại (ja 忙しむ, th ภมุ): trcheck --exist → trBad → bỏ ngôn ngữ
  { const g = base(); g.trBad = { ja: ['忙しむ'] }; const r = gateEntry(g); ok(r.ok && !r.keep.includes('ja'), 'D2: từ không có thật → bỏ ngôn ngữ'); }
  // D3 sai từ loại (carelessly es "descuidado" tính từ): hình từ loại tất định
  ok(!posShapeOk('es', 'adv', 'descuidado', 'carelessly') && posShapeOk('es', 'adv', 'descuidadamente', 'carelessly') && !posShapeOk('ru', 'v', 'подавление', 'repress') && posShapeOk('ru', 'v', 'подавлять') && !posShapeOk('tr', 'v', 'baskı', 'repress') && !posShapeOk('ko', 'adj', '현기증') && posShapeOk('ko', 'adj', '어지러운'), 'D3: hình từ loại bản dịch');
  { const g = { ...base(), w: 'carelessly', pos: 'adv', def: 'without care or concern', ex: ['He carelessly left the door open.', 'She carelessly dropped the glass.'], m: { ...base().m, es: 'descuidado' } };
    const r = gateEntry(g); ok(r.ok && !r.keep.includes('es') && /từ loại/.test(r.drop.es), 'D3: es tính từ cho trạng từ → bỏ es'); }
  // chấm tự động mẫu cố định: nhãn xấu lọt / chặn / sửa đúng
  { const L = { bad: [{ k: 'idol#n', cls: 'L1', field: 'vi', bad: 'thần tượng', when: { sense: 'idol.n.01' } }, { k: 'repress#v', cls: 'D1', field: 'm.th', bad: 'กลั้น' }, { k: 'snail#n', cls: 'L2', field: 'ex', bad: 'We were late going to look for snails.' }], good: [{ k: 'haven#n' }] };
    const it = { 'idol#n': { pass: true, ent: { vi: 'tượng thần; thần tượng', src: { sense: 'wordnet-3.0:idol.n.01' } } }, 'repress#v': { pass: true, ent: { m: { th: 'ปราบปราม' }, src: {} } }, 'snail#n': { pass: false, why: ['x'] }, 'haven#n': { pass: true, ent: {} } };
    const g = grade(it, L); ok(g.bad.leak.length === 1 && /idol/.test(g.bad.leak[0]) && g.bad.fixed === 1 && g.bad.blocked === 1 && g.good.pass === 1, 'grade: lọt / sửa đúng / chặn');
    ok(!applies({ src: { sense: 'wordnet-3.0:idol.n.02' } }, L.bad[0]) && hasBad({ ex: ['A Muslim prayed.'] }, { field: 'ex', bad: '\\bmuslims?\\b', re: true }), 'grade: when theo nghĩa + biểu thức'); }
  // nhãn mẫu cố định: không bao giờ bớt (chỉ thêm)
  { const L = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/lexicon/expand/pilot/labels.json'), 'utf8')), P = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/lexicon/expand/pilot/hard.json'), 'utf8')).items;
    ok(L.bad.length >= 32 && L.good.length >= 45 && P.length >= 378 && L.bad.every(b => P.includes(b.k)) && ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'D1', 'D2', 'D3'].every(c => L.bad.some(b => b.cls === c)), 'mẫu cố định: đủ nhãn mọi lớp, mọi từ nhãn có trong pilot-hard'); }
}
// L3 gốc (29/10): job.mjs phải LƯU nghĩa Wiktionary (g1) – trước đó KK chỉ giữ exs/trg nên khoá nghĩa theo Wiktionary chưa từng chạy
{ const J = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/job.mjs'), 'utf8'); ok(/KK\[e\.w \+ '#' \+ e\.pos\] = \{[^}]*g1: k\.g1/.test(J) && /lockSense\(/.test(J) && /mode: 'lxwsd'/.test(J), 'job.mjs: lưu g1 + khoá nghĩa + trắc nghiệm nghĩa'); }
// soát pilot 3 (29/10, LÕI 12/50): ví dụ chỉ chứa từ phái sinh (demography – "demographers"); IPA Mỹ ER0 trước nguyên âm nhấn (liberation, arithmetic);
// def bám gloss WordNet thô (seawater, rifle) → lxdef/lxsrc nhận định nghĩa Wiktionary của ĐÚNG nghĩa khoá (wk)
ok(!inflRe('demography').test('the demographers met') && inflRe('demography').test('Demography matters.') && inflRe('stop').test('stopped') && inflRe('bake').test('baking') && inflRe('happy').test('happier') && inflRe('peel').test('peels'), 'ví dụ: chỉ biến tố, không phái sinh');
ok(arpaToIpa('L IH2 B ER0 EY1 SH AH0 N') === 'ˌlɪbəˈreɪʃn' && arpaToIpa('ER0 IH1 TH M AH0 T IH0 K') === 'əˈrɪθmətɪk' && arpaToIpa('P ER0 M IH1 T') === 'pərˈmɪt' && arpaToIpa('D IH0 F TH IH1 R IY0 AA0') === 'dɪfˈθɪriə' && arpaToIpa('S AH1 K Y AH0 L IH0 N T') === 'ˈsʌkjələnt', 'IPA Mỹ: ER0 trước nguyên âm nhấn; đuôi -ia /iə/, -lent /lənt/');
{ const J = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/job.mjs'), 'utf8'); ok(!/call\('lxex'/.test(J) && /exFail = 'ví dụ: không đủ 2 câu NGƯỜI VIẾT/.test(J), 'ví dụ chỉ từ nguồn người viết (pilot 4: AI gây 3/5 lỗi LÕI)'); }
{ const J = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/job.mjs'), 'utf8'), P = fs.readFileSync(path.join(ROOT, 'functions/api/lexai.js'), 'utf8');
  ok(/e\._wk = /.test(J) && /wk: e\._wk/.test(J) && /use "wk" as the main model/.test(P) && /\.\.\.\(x\.wk \? \{ wk: cut\(x\.wk/.test(P), 'def: định nghĩa Wiktionary của nghĩa khoá vào lxdef/lxsrc'); }
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
// ---- CỔNG IPA khớp nguồn (chủ 28/10: kho từ mới không dính lỗi phát âm; pilot 20261028 uninteresting US /əˈnɪntrəstɪŋ/):
// job.mjs chạy ipa-check.mjs checkEntry trước khi ghi lô chờ (lệch → sửa theo Britfone/CMU nếu đúng 1 phương án, không thì trượt), promote.mjs từ chối lô lệch.
{ const REFS = { bf: parseBritfone(['INTERESTING(1), ˈɪ n t ɹ ɪ s t ɪ ŋ', 'INTERESTING(2), ˈɪ n t ə ɹ ɪ s t ɪ ŋ', 'UNABLE, ɐ n ˈeɪ b ə l', 'MADNESS, m ˈæ d n ɪ s', 'DANCER, d ˈɑː n s ə',
      'RECORD(1), ɹ ˈɛ k ɔː d', 'RECORD(2), ɹ ɪ k ˈɔː d', 'INTERSECTION, ˌɪ n t ə s ˈɛ k ʃ ə n', 'TRANSLATE, t ɹ ˌæ n s l ˈeɪ t', 'ABLE, ˈeɪ b ə l'].join('\n')),
    cmu: parseCmu(['uninteresting AH0 N IH1 N T R AH0 S T IH0 NG', 'interesting IH1 N T R AH0 S T IH0 NG', 'interesting(2) IH1 N T R IH0 S T IH0 NG', 'unable AH0 N EY1 B AH0 L', 'able EY1 B AH0 L',
      'madness M AE1 D N AH0 S', 'dancer D AE1 N S ER0', 'inert IH2 N ER1 T', 'record R AH0 K AO1 R D', 'record(2) R EH1 K ER0 D', 'intersection IH2 N T ER0 S EH1 K SH AH0 N', 'ecotourism'].join('\n')) };
  const chk = (w, pos, ipa, ipaUS) => checkEntry({ w, pos, ipa, ipaUS }, REFS);
  // uninteresting#adj: IPA Mỹ /əˈnɪntrəstɪŋ/ (arpaToIpa cắt n của un- sang gốc từ) → sửa /ʌnˈɪntrəstɪŋ/; trọng âm sai /ˈʌnɪntrəstɪŋ/ → sửa theo CMU
  { const c = chk('uninteresting', 'adj', '/ʌnˈɪntrəstɪŋ/', '/əˈnɪntrəstɪŋ/'); ok(c.ipaUS === '/ʌnˈɪntrəstɪŋ/' && !c.bad.length && c.fix.length === 1, 'uninteresting#adj Mỹ /əˈnɪntrəstɪŋ/ phải được sửa: ' + JSON.stringify(c)); }
  { const c = chk('uninteresting', 'adj', '/ʌnˈɪntrəstɪŋ/', '/ˈʌnɪntrəstɪŋ/'); ok(c.ipaUS === '/ʌnˈɪntrəstɪŋ/' && /CMUdict/.test(c.fix.join()), 'uninteresting#adj Mỹ nhấn sai âm tiết → sửa theo CMU: ' + JSON.stringify(c)); }
  ok(arpaToIpa('AH0 N IH1 N T R AH0 S T IH0 NG') === 'əˈnɪntrəstɪŋ', 'arpaToIpa vẫn ra /əˈnɪn…/ (vì vậy cổng phải sửa ranh giới tiền tố)');
  { const c = chk('unable', 'adj', '/əˈneɪbl/', '/əˈneɪbl/'); ok(c.ipa === '/ʌnˈeɪbl/' && c.ipaUS === '/ʌnˈeɪbl/' && !c.bad.length, 'unable: un|able cả Anh lẫn Mỹ'); }
  ok(prefixStress('/ɪˈnɜːt/', 'inert', s => REFS.cmu.has(s)) === '/ɪˈnɜːt/', 'inert: "ert" không phải từ → giữ /ɪˈnɜːt/');
  // khớp nguồn → không đụng; Oxford (r) cuối = không r; biến thể từ điển (ə ~ ɪ, ə thêm/bớt) vẫn khớp
  { const c = chk('interesting', 'adj', '/ˈɪntrəstɪŋ/', '/ˈɪntrəstɪŋ/'); ok(!c.fix.length && !c.bad.length, 'interesting khớp nguồn: ' + JSON.stringify(c)); }
  { const c = chk('dancer', 'n', '/ˈdɑːnsə(r)/', '/ˈdænsər/'); ok(!c.fix.length && !c.bad.length, 'dancer (r) Oxford khớp Britfone: ' + JSON.stringify(c)); }
  // âm vị lệch Britfone (a đơn kiểu Wiktionary /ˈmadnəs/ sau ukStyle vẫn sai nếu nguyên âm khác) → sửa theo nguồn 1 phương án
  { const c = chk('madness', 'n', '/ˈmɑːdnəs/', '/ˈmædnəs/'); ok(c.ipa === '/ˈmædnɪs/' && /Britfone/.test(c.fix.join()), 'madness Anh /ˈmɑːdnəs/ → sửa theo Britfone: ' + JSON.stringify(c)); }
  // trọng âm sai mà CẢ HAI nguồn cùng nói khác (intersection kho cũ /ˈɪntəˌsekʃən/) → sửa; ˌ sát ˈ kiểu Britfone bị bỏ (Oxford)
  { const c = chk('intersection', 'n', '/ˈɪntəˌsekʃən/', '/ˌɪntərˈsekʃn/'); ok(c.ipa === '/ˌɪntəˈsekʃn/', 'intersection Anh nhấn sai → sửa: ' + JSON.stringify(c)); }
  ok(oxStress('/ˌtrænsˈleɪt/') === '/trænsˈleɪt/' && oxStress('/ˌɪntəˈsekʃn/') === '/ˌɪntəˈsekʃn/', 'oxStress: bỏ ˌ sát ˈ, giữ ˌ cách ≥ 1 âm tiết');
  // không sửa được (nguồn có 2 phương án, bản cũ xa cả hai) → trượt qua gateEntry với lý do 'ipa: lệch Britfone/CMU', vào HÀNG DUYỆT (không phải lỗ nguồn)
  { const c = chk('record', 'n', '/ˈwɪndəʊ/', '/ˈrekərd/'); ok(c.bad.length && /^Anh/.test(c.bad[0]), 'IPA Anh sai hẳn → bad: ' + JSON.stringify(c));
    const r = gateEntry({ ...g2(), w: 'record', pos: 'n', ex: ['The record was broken.', 'She keeps a record of it.'], ipaBad: c.bad });
    ok(!r.ok && r.why.some(x => /^ipa: lệch Britfone\/CMU Anh/.test(x)) && !hasGap(r) && !sourceGap(r), 'cổng: ipaBad → trượt "ipa: lệch Britfone/CMU …" → hàng duyệt: ' + JSON.stringify(r.why)); }
  // không có trong CMU → IPA Mỹ suy từ IPA Anh (ukToUs)
  { const c = chk('ecotourism', 'n', '/ˌiːkəʊˈtʊərɪzəm/', ''); ok(c.ipaUS === '/ˌiːkoʊˈtʊrɪzəm/', 'ecotourism: Mỹ = ukToUs(Anh): ' + JSON.stringify(c)); }
  // sửa xong phải ổn định (lưới cuối job.mjs + promote.mjs kiểm lại bằng cùng hàm)
  for (const [w, pos, a, b] of [['uninteresting', 'adj', '/ʌnˈɪntrəstɪŋ/', '/əˈnɪntrəstɪŋ/'], ['madness', 'n', '/ˈmɑːdnəs/', '/ˈmædnəs/'], ['intersection', 'n', '/ˈɪntəˌsekʃən/', '/ˌɪntərˈsekʃn/']]) {
    const c = chk(w, pos, a, b), d = chk(w, pos, c.ipa, c.ipaUS); ok(!d.fix.length && !d.bad.length, `${w}: sửa phải ổn định ` + JSON.stringify(d)); }
  // nối dây: job kiểm TRƯỚC cổng + lưới cuối trước khi ghi lô chờ; promote từ chối lô lệch; workflow tải Britfone
  const J = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/job.mjs'), 'utf8'), PR = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/promote.mjs'), 'utf8'), WF = fs.readFileSync(path.join(ROOT, '.github/workflows/lexicon-expand.yml'), 'utf8');
  ok(J.indexOf('checkEntry(ent, REFS)') > 0 && J.indexOf('checkEntry(ent, REFS)') < J.indexOf('const r = gateEntry(ent') && J.indexOf('checkEntry(e, REFS)') < J.indexOf('if (pend.n) wr(PEND'), 'job.mjs: checkEntry trước gateEntry + lưới cuối trước khi ghi lô chờ');
  ok(/checkEntry\(P\.items\[k\], refs\)/.test(PR) && PR.indexOf('process.exit(1)') < PR.indexOf("wr(`content/qa/batches/"), 'promote.mjs: kiểm IPA và thoát trước khi ghi gì');
  ok(/britfone\.main\.3\.0\.1\.csv/.test(WF) && /--britfone "\$RUNNER_TEMP\/britfone\.csv"/.test(WF), 'lexicon-expand.yml: tải Britfone + truyền --britfone'); }
// ---- ÂM THANH từ mới (word-audio.yml, WORD_AUDIO_EXPAND=1): giọng file khớp nhãn UK/US, và IPA hiển thị cạnh nút loa cùng giọng
{ const { VOICES } = await import('../word-audio/lib.mjs'), { STRONG } = await import('../word-audio-strong.mjs');
  const rd = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  // Kokoro chọn giọng đọc theo chữ đầu mã giọng: b = en-GB, a = en-US. s3.tsv: từ \t <VOICES[0]> \t <VOICES[1]> = Anh \t Mỹ
  ok(VOICES.length === 2 && /^b[fm]_/.test(VOICES[0]) && /^a[fm]_/.test(VOICES[1]), 'word-audio VOICES = [Anh (b*), Mỹ (a*)]: ' + VOICES);
  ok(/WORD_AUDIO_EXPAND: '1'/.test(rd('.github/workflows/word-audio.yml')), 'word-audio.yml bật từ mở rộng');
  // dạng mạnh viết tay: cột 0 cho giọng Anh (không r cuối, a kiểu Anh), cột 1 cho giọng Mỹ (r cuối, æ)
  for (const w of ['for', 'or', 'nor', 'there']) ok(!/ɹ$/.test(STRONG[w][0]) && /ɹ$/.test(STRONG[w][1]), `STRONG ${w}: Anh không r / Mỹ có r ` + STRONG[w]);
  for (const w of ['and', 'at', 'can', 'have']) ok(/a/.test(STRONG[w][0].replace(/aɪ|aʊ/g, '')) && /æ/.test(STRONG[w][1]), `STRONG ${w}: Anh a / Mỹ æ ` + STRONG[w]);
  ok(/STRONG\[j\.word\]\[VOICES\.indexOf\(j\.voice\)\]/.test(rd('scripts/gen-word-audio.mjs')), 'gen-word-audio: phiên âm mạnh lấy đúng cột theo giọng');
  // app: en-US → af_heart + ipaUS; còn lại → bf_emma + ipa (Anh). Add-on: us → af_heart
  const UI = rd('web/js/ui.js'), NT = rd('extension/newtab.js');
  ok(/accent === 'en-US' \? 'af_heart' : 'bf_emma'/.test(UI) && /acc === 'en-US' && ent\.ipaUS \? ent\.ipaUS : ent\.ipa/.test(UI), 'ui.js: giọng Mỹ ↔ af_heart ↔ ipaUS, giọng Anh ↔ bf_emma ↔ ipa');
  ok(/acc === 'us' \? 'af_heart\|' : 'bf_emma\|'/.test(NT), 'newtab.js: us → af_heart, còn lại bf_emma');
  // mục mở rộng vào app với ipaUS riêng (toIndex: trùng Anh → để trống = dùng Anh)
  { const e = toIndex({ ...good(), ipa: '/ʌnˈɪntrəstɪŋ/', ipaUS: '/ʌnˈɪntrəstɪŋ/' }), f = toIndex({ ...good() }); ok(e.ipa === '/ʌnˈɪntrəstɪŋ/' && e.ipaUS === '' && f.ipaUS === '/fərˈseɪk/' && f.ipa === '/fəˈseɪk/', 'toIndex: ipa = Anh, ipaUS = Mỹ'); } }
// hạ tầng (30/10 pilot 7 hỏng vì chú thích // nuốt nửa dòng): job.mjs / grade.mjs phải qua node --check
{ const { spawnSync } = await import('child_process'); for (const f of ['job.mjs', 'grade.mjs', 'promote.mjs']) ok(spawnSync(process.execPath, ['--check', 'scripts/lexicon/expand/' + f]).status === 0, `node --check ${f}`); }
// L5 (30/10 soát pilot 7): UK do espeak lệch Britfone ə↔æ (malaria /mæˈleəriə/) lọt qua so khớp lỏng → espeak phải khớp CHẶT, lệch → lấy Britfone
{ const IC = await import('../lexicon/ipa-check.mjs'), R = { bf: IC.parseBritfone('MALARIA, m ə l ˈɛə ɹ ɪə\n'), cmu: (await import('../lexicon/expand/cmu.mjs')).parseCmu('malaria M AH0 L EH1 R IY0 AH0\n') };
  const m = IC.checkEntry({ w: 'malaria', pos: 'n', ipa: '/mæˈleəriə/', ipaUS: '/məˈleriə/', src: { ipaUK: 'espeak' } }, R);
  ok(m.ipa === '/məˈleərɪə/' && IC.strictEq('/məˈleərɪə/', '/məˈlɛəɹiə/') && !IC.strictEq('/mæˈleəriə/', '/məˈlɛəɹɪə/'), 'IPA Anh espeak ↔ Britfone khớp chặt (malaria)'); }
// hạ tầng (30/10): retry tính TRONG N – 2.701 mục requeue + N mới trong 1 lượt vượt timeout → mất cả lượt
{ const J = fs.readFileSync('scripts/lexicon/expand/job.mjs', 'utf8'), Y = fs.readFileSync('.github/workflows/lexicon-expand.yml', 'utf8'), m = /timeout-minutes: (\d+)/.exec(Y), n = /N="\$\{N:-(\d+)\}"/.exec(Y);
  ok(/stat\.retry = pool\.length - Math\.min\(N, pool\.length\); pool = pool\.slice\(0, N\)/.test(J), 'job: retry + mới cắt về N');
  ok(m && n && +n[1] * 14 / 60 <= +m[1] * 0.8, `N mặc định ${n && n[1]} × 14 s/từ vừa 80 % timeout ${m && m[1]} phút`); }
// hạ tầng (30/10 lượt 41065198770): kho Gemini cạn → dừng ngay (không đốt 166 phút ra 2.175 mục hạ tầng); dispatch không đè LX_N
{ const J = fs.readFileSync('scripts/lexicon/expand/job.mjs', 'utf8'), Y = fs.readFileSync('.github/workflows/lexicon-expand.yml', 'utf8'), P = fs.readFileSync('scripts/lib/ai-pool.mjs', 'utf8');
  ok(/g\.live < g\.size \/ 4/.test(J) && /pr\.day \/ pr\.n >= 0\.75/.test(J) && /probeGem: !WORDS/.test(J) && /pool: 'low'/.test(J), 'job: dừng sớm khi kho Gemini cạn (khoá sống / thăm dò hạn mức ngày)');
  ok(/n: \{[^}]*default: '' \}/.test(Y), "workflow: input n mặc định '' (dùng LX_N)");
  ok(/GEM_PAR = \d/.test(P) && /w >= 8/.test(P), 'ai-pool: xếp hàng Gemini + chờ khoá nghỉ theo phút'); }
// mục đã lưu (qa.trKeep): xét lại theo ngôn ngữ còn giữ – vẫn chặn bản dịch hỏng / ngôn ngữ ngoài trKeep (lô xuất đầu tiên 30/10 lộ lỗi cổng không lũy đẳng)
{ const pubE = loadExpand(); if (pubE.length) { const e0 = JSON.parse(JSON.stringify(pubE[0].e)), l = e0.qa.trKeep.find(x => e0.m[x]);
  ok(gateEntry(e0).ok, 'mục đã lưu qua lại cổng');
  if (l) { const e1 = JSON.parse(JSON.stringify(e0)); e1.m[l] = e1.w; ok(!gateEntry(e1).ok || ['es', 'pt', 'fr', 'de', 'id', 'tr'].includes(l), 'mục đã lưu: bản dịch chép nguyên tiếng Anh vẫn bị chặn'); }
  const e2 = JSON.parse(JSON.stringify(e0)), extra = LANGS.find(x => !e2.qa.trKeep.includes(x)); if (extra) { e2.m[extra] = 'x'; ok(!gateEntry(e2).ok, 'mục đã lưu: ngôn ngữ ngoài trKeep bị chặn'); } } }
// L3 (30/10): giám khảo trả khuôn bọc → phiếu khoá nghĩa rỗng hàng loạt; đọc mọi khuôn thường gặp, khuôn lạ → null (không đoán)
{ const I = ['wk1', 'wk2'];
  ok(JSON.stringify(wsdUnwrap({ wk1: 2, wk2: '0' }, I)) === '{"wk1":2,"wk2":0}', 'wsdUnwrap phẳng');
  ok(wsdUnwrap({ probes: { wk1: 1, wk2: 3 } }, I).wk2 === 3 && wsdUnwrap({ answers: { wk1: { sense: 4 } } }, I).wk1 === 4, 'wsdUnwrap bọc probes/answers/{sense}');
  ok(wsdUnwrap([{ id: 'wk1', sense: 1 }], I).wk1 === 1 && wsdUnwrap({ foo: 1 }, I) === null && wsdUnwrap(null, I) === null, 'wsdUnwrap mảng / khuôn lạ → null'); }
// ---- ĐA TỪ LOẠI (31/10): khoá trùng = từ#loại; từ loại phụ → INDEX[từ].more → từ điển hiện ở đúng khối từ loại
{ const { mergeExpand } = await import('../lexicon/shards.mjs'); const { toMore, OTHER_POS } = await import('../lexicon/expand/lib.mjs');
  const mk = (w, pos, vi, def) => ({ w, pos, ipa: '/dʌk/', ipaUS: '/dʌk/', vi, def, ex: ['a', 'b'], col: [], syn: [], level: 'B1', m: { es: vi + '-es' } });
  const IDX = { duck: { word: 'duck', pos: 'n', vi: 'con vịt', def: 'a water bird' } }, base = IDX.duck, XM = new Map();
  mergeExpand(IDX, XM, [mk('duck', 'v', 'cúi né', 'to lower your head quickly'), mk('duck', 'n', 'vịt khác', 'x'), mk('swan', 'n', 'thiên nga', 'a large white bird')]);
  ok(IDX.duck.more && IDX.duck.more.length === 1 && IDX.duck.more[0].pos === 'v' && IDX.duck.more[0].vi === 'cúi né', 'đa từ loại: duck#v (mục mở rộng) → INDEX.duck.more, không mất');
  ok(IDX.duck.vi === 'con vịt' && !base.more, 'đa từ loại: mục sẵn có thắng cùng từ loại; không sửa đối tượng của bộ chủ đề (bản sao)');
  ok(IDX.swan && IDX.swan.x === 1 && !IDX.swan.more, 'đa từ loại: từ mới vẫn là mục chính');
  ok(XM.get('duck#v').es === 'cúi né-es', 'đa từ loại: nghĩa 13 ngôn ngữ của từ loại phụ theo khoá từ#loại');
  ok(!('word' in toMore(mk('duck', 'v', 'cúi', 'to'))) && toMore(mk('duck', 'v', 'cúi', 'to')).pos === 'v', 'toMore: không lặp từ, giữ từ loại');
  mergeExpand(IDX, XM, [mk('duck', 'v', 'cúi né', 'to lower')]); ok(IDX.duck.more.length === 1, 'đa từ loại: ghép lại lũy đẳng');
  ok(OTHER_POS.test('keep: từ đã có trong kho với từ loại khác – chờ mục đa từ loại (job.mjs doneWords theo từ)'), 'OTHER_POS khớp lý do hàng duyệt cũ');
  const d = doneWords(), keys = [...d]; ok(keys.length && keys.every(k => /#/.test(k)), 'doneWords: khoá từ#loại (không theo từ – duck#n không chặn duck#v)');
  const Q = JSON.parse(fs.readFileSync(path.join(ROOT, 'content/qa/review-queue.json'), 'utf8')).items.filter(x => x.src === 'lexicon-expand' && OTHER_POS.test((x.why || [])[0] || ''));
  ok(Q.every(x => !d.has(x.id)), 'doneWords: mục "keep: … từ loại khác" không bị loại (requeue --pos đưa về retry)');
  // từ điển: nghĩa biên soạn của từ loại phụ vào ĐÚNG khối, sau từ loại chính; không đè khối có sẵn
  const vm = await import('node:vm'), src = fs.readFileSync(path.join(ROOT, 'web/js/dictionary.js'), 'utf8'), g = { I18N: { meanLang: () => 'vi', learnLang: () => 'en' }, fetch: async () => ({ ok: false }), AbortController, setTimeout, clearTimeout, console };
  g.self = g; vm.createContext(g); vm.runInContext(src, g);
  const loc = { word: 'duck', pos: 'n', vi: 'con vịt', def: 'a water bird', ex: 'A duck swam.', more: [{ pos: 'v', vi: 'cúi né', def: 'to lower your head quickly', ex: 'He ducked.' }] };
  const e1 = g.Dict.buildEntry('duck', loc, null, null, null, '', []);
  ok(e1.oxford.length === 2 && e1.oxford[0].pos === 'noun' && e1.oxford[1].pos === 'verb' && e1.oxford[1].defs[0].def === 'to lower your head quickly', 'từ điển: từ loại phụ = khối "verb" sau khối chính (ngoại tuyến)');
  const gg = { senses: [{ pos: 'danh từ', terms: ['vịt'] }], defs: [{ pos: 'noun', defs: [{ def: 'a bird' }] }, { pos: 'verb', defs: [{ def: 'to bend down' }] }], syn: [], vi: 'vịt' };
  const e2 = g.Dict.buildEntry('duck', loc, gg, null, null, '', []);
  ok(e2.senses.length === 2 && e2.senses[1].pos === 'verb' && e2.senses[1].terms[0] === 'cúi né' && e2.senses[0].terms[0] === 'con vịt', 'từ điển: nghĩa vi từ loại phụ vào khối động từ, từ loại chính đứng đầu');
  ok(e2.oxford.find(m => m.pos === 'verb').defs[0].def === 'to lower your head quickly' && e2.oxford.find(m => m.pos === 'verb').defs.some(x => x.def === 'to bend down'), 'từ điển: định nghĩa kho đứng đầu khối động từ, giữ định nghĩa nguồn ngoài');
  const e3 = g.Dict.buildEntry('duck', { ...loc, more: undefined }, null, null, null, '', []); ok(e3.oxford.length === 1, 'từ điển: không more → như cũ'); }
// pick_words.py: khoá trùng từ#loại + từ loại phụ (mã nguồn – chạy thật trên CI lexicon-expand)
{ const py = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/pick_words.py'), 'utf8');
  ok(/have_wp/.test(py) && /f'\{w\}#\{pos\}' in have_wp/.test(py) && !/if w in have or w in seen/.test(py), 'pick_words: bỏ trùng theo từ#loại, không theo từ');
  ok(/SEC_MIN/.test(py) && /SEC_SHARE/.test(py) && /math\.log10\(cnt\[pos\] \/ tot\)/.test(py), 'pick_words: từ loại phụ có ngưỡng SemCor + CEFR theo tần suất của từ loại đó');
  ok(/not in FORCE/.test(py) && /w not in FORCE_W/.test(py), 'pick_words: mẫu cố định/retry (--want) luôn có ứng viên đúng từ#loại – mẫu pilot không âm thầm co (31/10: 204/378)');
  const job = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/job.mjs'), 'utf8');
  ok(/!done\.has\(kk\(e\)\)/.test(job) && !/done\.has\(e\.w\)/.test(job), 'job.mjs: chọn theo từ#loại'); }
// 31/10 phễu 600 (thiếu 2 câu người viết 230/600): câu Wiktionary của ĐÚNG nghĩa khoá luôn là ứng viên; không cắt 8 câu đầu (thuộc nghĩa khác) – gate trắc nghiệm nghĩa 3/3 giữ nguyên
{ const job = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/job.mjs'), 'utf8'), wk = fs.readFileSync(path.join(ROOT, 'scripts/lexicon/expand/wikt.mjs'), 'utf8');
  ok(/e\.g === WK/.test(job) && /\(q\.g === WK\) - \(p\.g === WK\)/.test(job), 'ví dụ: câu Wiktionary của nghĩa khoá (e._wk) được nhận và đứng đầu');
  ok(/exs: exs\.slice\(0, 40\)/.test(wk) && /x\.ref \|\|/.test(wk), 'wikt: giữ 40 câu ví dụ (lọc nghĩa ở job), vẫn bỏ trích dẫn có ref');
  ok(/pickEx\(X1, X1\.exAll\.slice\(0, 8\)\.map\(\(c, i\) => \(\{ \.\.\.c, ok: ok\('ex' \+ i\) \}\)\)\)/.test(job), 'ví dụ: mọi câu vẫn qua trắc nghiệm nghĩa 3 giám khảo (wsdOk)'); }
// 31/10 run 41178484346: lượt chờ hàng đợi checkout SHA cũ → rebase xung đột → mất 161 mục đạt. save-merge gộp 3 chiều, không mất phía nào.
{ const { merge3, fmt } = await import('../lexicon/expand/save-merge.mjs');
  const base = { items: ['a#n', 'b#n', 'c#n'] }, ours = { items: ['c#n', 'g#v'] }, theirs = { items: ['a#n', 'b#n', 'c#n', 'x#n'] };
  ok(JSON.stringify(merge3(base, ours, theirs).items) === '["c#n","x#n","g#v"]', 'save-merge: retry – lượt xoá/thêm áp lên bản mới, giữ mục người khác thêm');
  const q0 = { items: [{ src: 'lexicon-expand', id: 'a#n', batch: '1', why: ['x'] }] }, qo = { items: [{ src: 'lexicon-expand', id: 'b#n', batch: '2', why: ['y'] }] }, qt = { items: [...q0.items, { src: 'imgqa', id: 'z', why: [] }] };
  ok(JSON.stringify(merge3(q0, qo, qt).items.map(x => x.id)) === '["z","b#n"]', 'save-merge: hàng duyệt theo src|id|batch');
  const NONE_P = merge3(undefined, { id: 'p', n: 1, items: { 'a#n': 1 } }, { id: 'p', n: 1, items: { 'b#n': 2 } });
  ok(Object.keys(NONE_P.items).join() === 'b#n,a#n' && NONE_P.n === 1, 'save-merge: lô chờ cùng ngày do 2 lượt tạo → hợp mục');
  ok(merge3({ v: 1 }, { v: 2 }, { v: 3 }).v === 2 && merge3({ v: 1 }, { v: 1 }, { v: 3 }).v === 3, 'save-merge: cùng sửa → lượt thắng; lượt không sửa → bản mới');
  ok(fmt({ a: 1 }, '{\n "a": 0\n}\n') === '{\n "a": 1\n}\n', 'save-merge: giữ thụt lề'); }
if (fail) { console.error(`✗ lexicon-expand (pilot 7 fixes): ${fail} lỗi`); process.exit(1); }
