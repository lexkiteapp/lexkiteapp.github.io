// Test luyện định dạng DELF/DALF W5 (french-course.md; CÙNG engine es: scripts/target/exam-es-lib.mjs bảng EXT + web/cpack/es-app/exam-ui.js bảng TX):
// (a) spec fr không đoán số; (b) engine chọn câu/bẫy với kho nhỏ TRONG test (nguồn Tatoeba thật dựng trên CI – chưa có thì trạng thái "chưa có đề");
// (c) App.frX khớp gói trong thư mục; (d) jsdom: chưa có đề → trạng thái rõ; có gói (dữ liệu tạm trong test) → danh sách → Đọc → Nghe → Viết (rubric giữ dấu nháy) → kết quả /25 + quy tắc 50/100.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import jsdom from 'jsdom';
import { build, buildExam, hasSrc, EX_LV, EXT } from '../target/exam-es-lib.mjs';
import * as FR from '../target/conj-fr.mjs';
const require = createRequire(import.meta.url), WEB = 'web';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'));

// (a) spec: chỉ quy tắc chung DELF/DALF; số chưa xác minh = null
const spec = rd('content/exams/fr/spec.json'), tasks = rd('content/exams/fr/tasks.json'), ui = rd('content/exams/fr/ui.json');
ok(spec.rule.total === 100 && spec.rule.partMax === 25 && spec.rule.passTotal === 50 && spec.rule.partMin === 5 && spec.rule.parts === 4, 'spec.rule = quy tắc chung 100 / 4×25 / ≥ 50 / ≥ 5');
ok(['A1', 'A2', 'B1', 'B2'].every(l => spec.delf[l]) && ['C1', 'C2'].every(l => spec.dalf[l]) && [...Object.values(spec.delf), ...Object.values(spec.dalf)].every(s => ['listen', 'read', 'write', 'speak'].every(p => s[p].min === null && s[p].tareas === null) && s.items === null), 'thời lượng/số bài chưa xác minh = null (cấm đoán số)');
ok(Object.values(ui).every(u => !/\{b\}/.test(u.sr)), 'nhãn sr không còn {b} (DELF/DALF không có dải cấp theo phần)');

// (b) engine trên kho nhỏ (câu giả lập đúng định dạng Tatoeba: id, ngôn ngữ, câu, tác giả)
const S = ['Elle parle avec nous.', 'Nous mangeons du pain ici.', 'Il regarde le chien dans la rue.', 'Ils boivent le lait chaud ici.', 'Je vois la table dans la cuisine.', 'Tu aimes le livre rouge ici.', 'Vous finissez votre travail demain.', 'Il tue le chien ici maintenant.', 'Tu parles avec vous ici.', 'Mon ami habite une grande ville.', 'Elle regarde une maison dans la ville.', 'Il achète un chat dans cette ville.',
  'Le chien mange le pain dans la cuisine.', 'Elle achète la pomme dans la ville.', 'Il boit le jus dans la maison.', 'Elle lit le livre sur la table.', 'Il voit le train dans la ville.', 'Nous cherchons le soleil avec lui.', 'Nous voulons une chaussure rouge aussi.', 'La table est dans la cuisine ici.', 'Le chien est dans le jardin ici.'];
const tsv = S.map((s, i) => `${1000 + i}\tfra\t${s}\tauteur${i % 3}\t2020`).join('\n') + '\n', words = [...new Set(S.flatMap(s => s.toLowerCase().match(/\p{L}+/gu)))];
const FN = 'le la les un une du de des est dans sur avec ici il elle nous vous ils tu je lui aussi'.split(' '), freq = [...FN, ...Array.from({ length: 200 }, (_, i) => `zz${i}`), ...words.filter(w => !FN.includes(w))].map(w => `${w} 1`).join('\n'); // từ chức năng rank thấp như tần suất thật (bẫy chỉ bị loại bởi đồng xuất hiện với từ nội dung)
const out = build(tsv, freq, 'fr'), a1 = out.A1.items, cz = a1.filter(i => i.k === 'c'), ls = a1.filter(i => i.k === 'l');
ok(cz.length >= 5 && ls.length >= 1, `engine fr: có câu điền từ (${cz.length}) + câu nghe (${ls.length})`);
ok(!a1.some(i => /\btue\b/.test(i.s)) && !a1.some(i => /Tu parles avec vous/.test(i.s)), 'engine fr: loại câu có từ cấm và câu trộn tu ⟂ vous');
ok(cz.every(i => new Set(i.o).size === 3 && i.o.includes(i.a) && (i.s.match(/___/g) || []).length === 1 && i.id >= 1000 && i.au), 'engine fr: 3 phương án khác nhau gồm đáp án, một chỗ khuyết, id + tác giả Tatoeba');
const seed = rd('content/target/fr/seed.json').words, gen = Object.fromEntries(seed.filter(w => w.pos === 'n').map(w => [w.word, w.gender]));
const verbCz = cz.filter(i => !(i.a in gen)), nounCz = cz.filter(i => i.a in gen);
const sameVerb = (a, o) => FR.KNOWN.some(v => ['pres', 'impf', 'fut', 'cond', 'ps'].some(t => { try { const f = FR.form(v, t); return f.includes(o) && f.includes(a); } catch (e) { return false; } }));
ok(verbCz.length >= 2 && verbCz.every(i => /(^|[^\p{L}])(je|j|tu|il|elle|on|nous|vous|ils|elles)\s*['’]?\s*___/iu.test(i.s) && i.o.filter(o => o !== i.a).every(o => sameVerb(i.a, o))), `engine fr: bẫy động từ = dạng cùng động từ ở ngôi khác, sau đại từ chủ ngữ (${verbCz.length} câu)`);
ok(nounCz.every(i => i.o.every(o => o === i.a || (gen[o] && gen[o] !== gen[i.a]))), `engine fr: bẫy danh từ = giống ngược (${nounCz.length} câu)`);
ok(EXT.es.D === 'content/exams/es/' && EXT.fr.G === 'FRX' && EXT.fr.iso3 === 'fra', 'bảng EXT có es + fr');

// (c) gói thật: chưa có nguồn → không có gói, App.frX trống; có nguồn → App.frX liệt kê đúng các gói
const frX = (fs.readFileSync(path.join(WEB, 'js/app.js'), 'utf8').match(/^App\.frX = (\{.*?\});/m) || [])[1];
ok(!!frX, 'app.js có bảng App.frX');
const X = new Function('return ' + frX)(), real = buildExam('fr'), have = hasSrc('fr');
ok(Object.keys(X.lv).join() === have.join() && Object.keys(real.files).filter(f => /^x-[A-C]\d\.js$/.test(f)).length === have.length, `App.frX.lv khớp nguồn Tatoeba đã có (${have.length}/${EX_LV.length} cấp)`);
ok(have.length === 0 ? Object.keys(real.files).length === 0 : Object.keys(X.ui).length === 15 && Object.values({ ...X.lv, ...X.ui }).every(f => fs.existsSync(path.join(WEB, f)) && fs.readFileSync(path.join(WEB, f), 'utf8') === real.files[path.basename(f)]), have.length ? 'gói fr khớp nguồn + 15 ngôn ngữ nhãn' : 'chưa có nguồn → chưa có gói x-*.js (đúng, CI dựng)');

// (d) jsdom
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8'), scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(), errors = []; vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) errors.push(e.message); });
const dom = new jsdom.JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/practice', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} }); w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms)); for (let k = 0; k < 100 && !w.document.querySelector('#modeGrid'); k++) await tick(100);
ok(!errors.length, 'nạp mã + bundle không lỗi' + (errors.length ? ': ' + errors.join(' | ') : ''));
const { App, UI } = w, $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
const MEM = {}; App.loadScript = async src => { w.eval(MEM[src] !== undefined ? MEM[src] : fs.readFileSync(path.join(WEB, src), 'utf8')); };
const spoken = [], rewards = []; UI.tts = (t, acc) => { spoken.push([t, acc]); }; App.reward = async d => { rewards.push(d); };

// d1) chưa có đề (App.frX trống – trạng thái thật khi chưa dựng nguồn)
if (!have.length) {
  await App.esexam(undefined, undefined, undefined, 'fr'); await tick(60);
  ok(/DELF\/DALF|Luyện định dạng/.test(App.view.textContent) && $$('section.card').length === 0 && !/null|undefined/.test(App.view.textContent), 'fr chưa có đề: hiện tên + thông báo "chưa có", không lỗi/null');
}

// d2) gói tạm trong test (App.frX trỏ vào bộ nhớ): 1 cấp A1, 2 đề
const pad = (a, n) => Array.from({ length: n }, (_, i) => a[i % a.length]);
const c10 = pad(cz, 10).map(i => [i.s, i.a, i.o, i.id, i.au]), l6 = pad(ls, 6).map(i => [i.s, i.id, i.au]);
const lvA1 = { e: [0, 1].map(k => ({ c: c10, l: l6, w: tasks.A1.w[k], s: tasks.A1.s[k] })), con: tasks.A1.con, sp: spec.delf.A1, rl: spec.rule };
const setPack = () => { MEM['fx/x-A1.js'] = `self.FRX=self.FRX||{};(FRX.x=FRX.x||{}).A1=${JSON.stringify(lvA1)};`; }; setPack();
MEM['fx/x-ui-en.js'] = `self.FRX=self.FRX||{};(FRX.xl=FRX.xl||{}).en=${JSON.stringify(ui.en)};`; MEM['fx/x-ui-vi.js'] = `self.FRX=self.FRX||{};(FRX.xl=FRX.xl||{}).vi=${JSON.stringify(ui.vi)};`;
App.frX.lv = { A1: 'fx/x-A1.js' }; App.frX.ui = { en: 'fx/x-ui-en.js', vi: 'fx/x-ui-vi.js' };
await App.esexam(undefined, undefined, undefined, 'fr'); await tick(60);
ok($$('section.card').length === 1 && $$('a.btn[href*="/practice/frx?lv=A1&e=2&p=sp"]').length === 1 && /Tatoeba/.test($('#x-A1').textContent), 'danh sách fr: A1 × 2 đề × 4 phần, liên kết #/practice/frx, ghi công Tatoeba');
ok(!/null|undefined|NaN/.test(App.view.textContent) && !/\d+ min/.test($('#x-A1').textContent), 'định dạng chưa xác minh (null) bị ẩn, không in null/thời lượng đoán');

await App.esexam('A1', 1, 'rd', 'fr'); await tick(60);
ok(!!$('#lsn.lsn-v2') && !!$('#lsnBub'), 'rd fr: khung Stitch lesson-question');
for (let q = 0; q < 10; q++) {
  const it = c10[q], opts = $$('#lsnBody .lsn-opt'), wrong = q === 4;
  (wrong ? opts.find(o => o.dataset.o !== it[1]) : opts.find(o => o.dataset.o === it[1])).click(); $('#lsnCheck').click(); await tick();
  ok(!!$('#lsnFoot') && $('#lsnFoot').textContent.includes('Tatoeba #' + it[3]), `rd fr câu ${q + 1}: phản hồi + ghi công`); $('#lsnNext').click(); await tick();
}
let st = JSON.parse(w.localStorage.getItem('lk.fr.x')); ok(st.A1[1].rd === 90 && !w.localStorage.getItem('lk.es.x'), 'rd fr: 90 % lưu ở khóa lk.fr.x (không đụng khóa es)');

await App.esexam('A1', 1, 'ls', 'fr'); await tick(120);
ok(spoken.length > 0 && spoken.every(([, acc]) => acc === 'fr-FR'), 'ls fr: đọc bằng giọng fr-FR');
for (let q = 0; q < 6; q++) {
  const inp = $('#lsnIn'); ok(!!inp && inp.lang === 'fr', `ls fr câu ${q + 1}: ô gõ lang=fr`);
  inp.value = q === 1 ? l6[q][0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[.?!,]/g, '') : l6[q][0]; inp.dispatchEvent(new w.Event('input')); $('#lsnCheck').click(); await tick(); $('#lsnNext').click(); await tick();
}
st = JSON.parse(w.localStorage.getItem('lk.fr.x')); ok(st.A1[1].ls === 100, `ls fr: thiếu dấu/dấu câu vẫn đúng (điểm ${st.A1[1].ls}%)`);

// Viết: rubric giữ dấu nháy (j'habite, d'abord) và gạch nối
await App.esexam('A1', 1, 'wr', 'fr'); await tick(60);
ok(!!$('#exTxt') && $('#exTxt').lang === 'fr', 'wr fr: consigne + ô viết lang=fr');
$('#exTxt').value = "Bonjour, je m’appelle Linh. J'habite à Hanoï, une grande ville du Viêt Nam, et j'aime lire parce que c'est calme. J'adore aussi la cuisine, mais je préfère marcher puis dormir."; $('#exTxt').dispatchEvent(new w.Event('input')); $('#exChk').click(); await tick();
const hi = +/(\d+)%/.exec($('#exRes').textContent)[1]; ok(hi >= 70, `wr fr: bài đủ ý (khớp j'habite…) điểm cao (${hi}%)`);
ok(new RegExp(`${Math.round(hi * 25 / 100)}/25`).test($('#exRes').textContent) && !/\(\)|\{b\}|undefined/.test($('#exRes').textContent), 'wr fr: ước lượng /25 mỗi phần, không có dải cấp');
$('#exTxt').value = 'Oui'; $('#exTxt').dispatchEvent(new w.Event('input')); $('#exChk').click(); await tick();
ok(+/(\d+)%/.exec($('#exRes').textContent)[1] < 30, 'wr fr: bài ngắn điểm thấp');

// Nói: micro giả
UI.recognize = (t0, acc, cb) => { setTimeout(() => { cb.result({ heard: "j'habite dans une grande maison près de la ville", alts: [] }); cb.end(); }, 5); return { stop() {} }; };
await App.esexam('A1', 1, 'sp', 'fr'); await tick(60); $('#exMic').click(); await tick(40); ok(/j'habite/.test($('#exTxt').value), 'sp fr: văn bản nghe được điền vào ô');
$('#exChk').click(); await tick(); ok(/%/.test($('#exRes').textContent), 'sp fr: có điểm');

// Quy tắc DELF/DALF (≥ 50/100 tổng và ≥ 5/25 mỗi phần) áp lên điểm ƯỚC LƯỢNG khi đủ 4 phần; thiếu dữ liệu quy tắc → chỉ báo %
const setSt = o => { w.localStorage.setItem('lk.fr.x', JSON.stringify({ A1: { 1: o } })); };
setSt({ rd: 80, ls: 70, wr: 60, sp: 50 }); await App.esexam(undefined, undefined, undefined, 'fr'); await tick(60);
ok(/estimate/i.test($('#x-A1').textContent) && /meets the 50\/100 rule/.test($('#x-A1').textContent) && /20\/25/.test($('#x-A1').textContent), 'đủ 4 phần, tổng ≥ 50 và mỗi phần ≥ 5/25 → đạt (ước lượng), có n/25');
setSt({ rd: 100, ls: 100, wr: 100, sp: 10 }); await App.esexam(undefined, undefined, undefined, 'fr'); await tick(60);
ok(/below 50\/100 or below 5\/25/.test($('#x-A1').textContent), 'một phần < 5/25 → chưa đạt dù tổng cao');
setSt({ rd: 40, ls: 40, wr: 40, sp: 40 }); await App.esexam(undefined, undefined, undefined, 'fr'); await tick(60);
ok(/below 50\/100/.test($('#x-A1').textContent), 'tổng < 50 → chưa đạt');
lvA1.rl = null; setPack(); setSt({ rd: 80, ls: 70, wr: 60, sp: 50 });
await App.esexam(undefined, undefined, undefined, 'fr'); await tick(60);
ok(/No verified pass rule/.test($('#x-A1').textContent) && !/meets the 50/.test($('#x-A1').textContent) && !/\/25/.test($('#x-A1').textContent), 'không có quy tắc đã xác minh → chỉ báo %, không phán, không in /25');
w.close(); process.exit(fails ? 1 : 0);
