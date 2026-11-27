// Test phát âm tiếng Pháp W3 (french-course.md §10; CÙNG web/cpack/es-app/pron-ui.js + scripts/target/px-lib.mjs với es – bản sao es-pron.mjs theo tl).
// (a) bảng IPA trong pron.json đủ cho MỌI từ/cụm, đúng kiểu espeak (không dấu nhấn, không gạch chéo); (b) gói px: đủ 15 ngôn ngữ, cặp tối thiểu thật sự KHÁC âm và KHÔNG phải đồng âm
// (pain/peint, vert/verre/vers, sans/cent, ses/ces, mer/mère, ou/où…), ví dụ trong “…” giữ nguyên; (c) jsdom chạy trọn cặp tối thiểu · nghe chính tả (thiếu dấu é è ç vẫn đúng kèm nhắc) · nói theo trên khung Stitch có sẵn.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import jsdom from 'jsdom';
import { buildPx, PX_UI, TLX } from '../target/px-lib.mjs';
const require = createRequire(import.meta.url), WEB = 'web';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const rj = f => JSON.parse(fs.readFileSync(f, 'utf8'));

// (a) IPA
const pron = rj('content/target/fr/pron.json'), src = pron.topics, IP = pron.ipa, TOP = TLX.fr.topics;
const used = new Set(); for (const t of src) for (const x of [...t.ex, ...t.dict, ...t.say, ...(t.pairs || []).flatMap(p => p.split('/'))]) used.add(x);
let bad = [...used].filter(x => !IP[x]);
ok(!bad.length, 'mọi từ/cụm của bài phát âm có IPA trong pron.json' + (bad.length ? ': ' + bad.join(', ') : ''));
bad = Object.keys(IP).filter(x => !used.has(x)); ok(!bad.length, 'bảng IPA không có mục thừa (không từ nào dùng)' + (bad.length ? ': ' + bad.join(', ') : ''));
bad = Object.entries(IP).filter(([w, i]) => /[ˈˌ/\[\]().,-]|^\s|\s$|\s\s/.test(i) || !/^[a-zɑɛɔəøœɥʁʒʃɲŋɡ̃ ]+$/.test(i.normalize('NFC')) || (w.split(' ').length !== i.split(' ').length)).map(([w, i]) => `${w} → ${i}`);
ok(!bad.length, 'IPA kiểu espeak fr-fr: không dấu nhấn/gạch chéo, chỉ ký tự IPA Pháp, cụm có đủ số từ' + (bad.length ? ': ' + bad.join(', ') : ''));
ok(IP['un'] === 'œ̃' && IP['rue'] === 'ʁy' && IP['huit'] === 'ɥit' && IP['ils ont'] === 'ilz ɔ̃' && IP['les héros'] === 'le eʁo', 'điểm tựa: un /œ̃/ · rue /ʁy/ · huit /ɥit/ · liaison ils ont · h aspiré les héros (không nối)');

// (b) gói px
const VN = /[ơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđă]/i, quoted = s => (s.match(/[“"]([^”"]+)[”"]/g) || []).map(q => q.slice(1, -1));
ok(src.map(t => t.id).join() === TOP.join() && src.length === 12, '12 chủ đề đúng thứ tự (8 A1–B1 + h, gn, enchain, final B1–B2)');
// đồng âm tiếng Pháp (cùng cách đọc, khác chữ): KHÔNG BAO GIỜ làm cặp tối thiểu – chỉ làm chính tả
const HOMO = ['pain peint pin', 'vert verre vers ver', 'sans cent sang', 'ses ces sait', 'mer mère maire', 'ou où', 'saint sein sain', 'vin vingt vain', 'fond font', 'dans dent', 'cou coup coût', 'vu vue', 'tu tue', 'rue ru', 'bon bond', 'chaud show', 'faim fin', 'non nom', 'mais mes mets', 'cher chair chaire', 'foi foie fois', 'taire terre', 'eau haut os', 'chant champ'].map(g => g.split(' '));
const clash = []; bad = [];
for (const t of src) for (const p of t.pairs || []) {
  const [a, b] = p.split('/'); if (a === b || IP[a] === IP[b]) bad.push(p);
  for (const g of HOMO) if (g.includes(a) && g.includes(b)) clash.push(p);
}
ok(!bad.length, 'mọi cặp tối thiểu KHÁC âm (IPA hai vế khác nhau)' + (bad.length ? ': ' + bad.join(', ') : ''));
ok(!clash.length, 'không cặp nào là đồng âm (pain/peint, vert/verre/vers, sans/cent, ses/ces, mer/mère, ou/où bị chặn)' + (clash.length ? ': ' + clash.join(', ') : ''));
const guard = ['pain/peint', 'vert/verre', 'sans/cent', 'ses/ces', 'mer/mère', 'ou/où'].filter(p => { const [a, b] = p.split('/'); return HOMO.some(g => g.includes(a) && g.includes(b)); });
ok(guard.length === 6, 'bảng chặn đồng âm nhận đủ 6 ví dụ trọng yếu');
ok(src.find(t => t.id === 'eai') && !(src.find(t => t.id === 'eai').pairs || []).length, 'é/è: chủ đề không có cặp (nhiều người đọc trùng) – chỉ nghe chính tả + nói theo');
bad = []; for (const t of src) for (const w of [...t.ex, ...t.dict, ...t.say]) if (!/^[a-zàâçéèêëîïôœùûü' ]+$/.test(w)) bad.push(w);
ok(!bad.length, 'từ/cụm chỉ gồm chữ Pháp hợp lệ');
const en = rj('content/target/fr/px/en.json'); bad = [];
const { GX_LANGS, topics } = buildPx('fr'), mine = new Set(topics.flatMap(t => [...t.e, ...t.d, ...t.s].map(x => x[0]).concat(t.p.flatMap(p => [p[0], p[2]]))));
for (const l of GX_LANGS) {
  const d = rj(`content/target/fr/px/${l}.json`);
  for (const k of PX_UI) if (!d.ui[k] || (l !== 'vi' && VN.test(d.ui[k]))) bad.push(`${l}.ui.${k}`);
  if (en.ui.hd.includes('{h}') && !d.ui.hd.includes('{h}')) bad.push(`${l}.ui.hd thiếu {h}`);
  for (const id of TOP) {
    const r = d.tp[id]; if (!r || !r.t || !r.x) { bad.push(`${l}.${id}`); continue; }
    if (l !== 'vi' && VN.test(r.t + r.x)) bad.push(`${l}.${id} lẫn tiếng Việt`);
    if (l !== 'en' && l !== 'fr') for (const q of quoted(en.tp[id].x).filter(q => mine.has(q))) if (!r.x.includes(q)) bad.push(`${l}.${id} mất ví dụ “${q}”`);
    if (l !== 'en' && l !== 'vi' && r.x === en.tp[id].x) bad.push(`${l}.${id} chưa dịch`);
  }
}
ok(!bad.length, 'px: 15 ngôn ngữ đủ nhãn + 12 giải thích, giữ ví dụ “…”, không lẫn tiếng Việt' + (bad.length ? ': ' + bad.slice(0, 8).join(' | ') : ''));
for (const [f, s] of Object.entries(buildPx('fr').files)) if (!fs.existsSync('web/cpack/fr/' + f) || fs.readFileSync('web/cpack/fr/' + f, 'utf8') !== s) { ok(false, `web/cpack/fr/${f} cũ so với nguồn – chạy node scripts/target/drill-pack.mjs --tl fr`); break; }
ok(TLX.fr.ipa({ ipa: IP })('rue') === 'ʁy' && (() => { try { TLX.fr.ipa({ ipa: {} })('rue'); return false; } catch (e) { return /thiếu IPA/.test(e.message); } })(), 'px-lib: từ thiếu IPA → lỗi dựng (cổng), không im lặng');

// (c) jsdom
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8'), scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(), errors = []; vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) errors.push(e.message); });
const dom = new jsdom.JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/practice', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} }); w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms)); for (let k = 0; k < 100 && !w.document.querySelector('#modeGrid'); k++) await tick(100);
ok(!errors.length, 'nạp mã + bundle espr/frpx không lỗi' + (errors.length ? ': ' + errors.join(' | ') : ''));
const { App, UI } = w, $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
ok(UI.whisperModel('fr') === 'onnx-community/whisper-tiny' && w.Target.speechLang('fr') === 'fr-FR' && w.Target.recLang('fr') === 'fr-FR', 'Whisper đa ngôn ngữ cho fr (tiny); nhận dạng/giọng đọc lấy từ Target: fr-FR');
const loaded = []; App.loadScript = async s => { loaded.push(s); w.eval(fs.readFileSync(path.join(WEB, s), 'utf8')); };
const spoken = [], accents = [], rewards = []; UI.tts = (t, a) => { spoken.push(t); accents.push(a); }; App.reward = async d => { rewards.push(d); };
ok(typeof App.espron === 'function' && App.frPx && App.esPx && App.esQ && App.esFoot && App.esEnd, 'App.espron (chung es) + App.frPx có');
await App.espron(undefined, undefined, 'fr'); await tick(60);
ok($$('section.card').length === 12 && loaded.some(s => /cpack\/fr\/px-/.test(s)) && !loaded.some(s => /cpack\/es\/px-/.test(s)), 'danh sách: 12 chủ đề, gói giải thích fr theo ngôn ngữ đã tải (không đụng gói es)');
ok($$('[data-px]').length >= 40 && $$('[data-px]')[0].lang === 'fr' && $$('a.btn[href*="m=sy"]').length === 12 && $$('a.btn[href*="m=pp"]').length === 11 && $$('a.btn[href*="/practice/frp?"]').length === 35, 'mỗi chủ đề: từ mẫu bấm nghe (lang fr) + bài nói; 11 chủ đề có cặp (é/è không); liên kết #/practice/frp');
$('[data-px]').click(); ok(spoken.length === 1 && accents[0] === 'fr-FR', 'bấm từ mẫu → đọc bằng giọng fr-FR');

const find = w2 => src.flatMap(t => t.pairs || []).map(p => p.split('/')).find(p => p.includes(w2));
await App.espron('r', 'pp', 'fr'); await tick(60); spoken.length = 0; let wrongSeen = false;
ok($('#lsn.lsn-v2') && $('#lsnBub') && $('#lsnCheck') && !$('#lsnPlay').hidden && $('#lsnClose, a[href="#/practice/frp"]'), 'pp: khung Stitch lesson-question + nút nghe lại + đóng về #/practice/frp');
for (let q = 0; q < 8; q++) {
  await tick(300); const target = spoken[spoken.length - 1], opts = $$('#lsnBody .lsn-opt'); if (!$('#lsnCheck')) break;
  ok(opts.length === 2 && opts.some(o => o.dataset.o === target) && find(target), `pp câu ${q + 1}: đã đọc 1 từ của cặp, 2 phương án`);
  const wrong = q === 2; (wrong ? opts.find(o => o.dataset.o !== target) : opts.find(o => o.dataset.o === target)).click(); $('#lsnCheck').click(); await tick();
  const fb = $('#lsnFoot'); ok(!!fb && !!$('#lsnNext'), `pp câu ${q + 1}: phản hồi + Tiếp tục`);
  if (wrong) wrongSeen = /bad/.test(fb.className) && fb.textContent.includes(w.FRX.pxl.en.tp.r[1].slice(0, 20)) && /\/[^/]+\/ ≠ .+ \/[^/]+\//.test(fb.textContent);
  $('#lsnNext').click(); await tick();
}
ok(wrongSeen, 'pp: trả lời sai → phản hồi sai + giải thích chủ đề + IPA cặp'); ok(!!$('#lsnAgain') && rewards.length === 1, 'pp: màn kết + ghi thưởng một lần');
ok(JSON.parse(w.localStorage.getItem('lk.fr.px')).r.n === 8 && !w.localStorage.getItem('lk.es.px'), 'tiến bộ theo chủ đề lưu ở khoá lk.fr.px (không lẫn lk.es.px)');

// nghe chính tả: gõ đúng · thiếu dấu (é è ç) vẫn đúng kèm nhắc · sai
await App.espron('eai', 'dc', 'fr'); await tick(60); spoken.length = 0; let noteSeen = 0, badSeen = false;
for (let q = 0; q < 8; q++) {
  await tick(300); const word = spoken[spoken.length - 1], inp = $('#lsnIn'); ok(!!inp && inp.lang === 'fr' && !!word, `dc câu ${q + 1}: ô gõ (lang fr) + đã đọc từ`);
  const stripped = word.normalize('NFD').replace(/[̀-ͯ]/g, ''), acc = stripped !== word, mode = q === 1 ? 'bad' : acc ? 'strip' : 'exact';
  inp.value = mode === 'bad' ? 'zzz' : mode === 'strip' ? stripped : word; inp.dispatchEvent(new w.Event('input')); $('#lsnCheck').click(); await tick();
  const fb = $('#lsnFoot'); if (mode === 'bad') badSeen = /bad/.test(fb.className); if (mode === 'strip' && /ok/.test(fb.className) && fb.textContent.includes(word) && /é, è, ç/.test(fb.textContent)) noteSeen++;
  if (mode === 'exact') ok(/ok/.test(fb.className), `dc câu ${q + 1}: gõ đúng → đúng`);
  $('#lsnNext').click(); await tick();
}
ok(badSeen, 'dc: gõ sai → phản hồi sai'); ok(noteSeen >= 4, `dc: thiếu dấu (é è ç) vẫn đúng kèm nhắc (${noteSeen} lần)`);

// nói theo: micro giả – nghe thành từ còn lại trong cặp → sai; nghe đúng → đúng; im → thử lại; ngôn ngữ nhận dạng truyền fr-FR
const recAcc = []; let mode = 'ok'; UI.recognize = (target, acc, cb) => { recAcc.push(acc); setTimeout(() => { const p = find(target); if (mode === 'ok') cb.result({ heard: target, alts: [target], score: 100 }); else if (mode === 'other') cb.result({ heard: p[1 - p.indexOf(target)], alts: [p[1 - p.indexOf(target)]], score: 30 }); else if (mode === 'none') cb.result({ heard: 'xyz', alts: ['xyz'], score: 0 }); else cb.error('unsupported'); cb.end && cb.end(); }, 5); return { stop() {} }; };
await App.espron('uou', 'sy', 'fr'); await tick(60);
ok(!!$('#lsnMic') && $('#lsnCheck').hidden && /\/[^/]+\//.test($('#lsnBub').textContent) && $('#lsnBub [lang="fr"]'), 'sy: nút micro Stitch + IPA, không nút Kiểm tra');
mode = 'err'; $('#lsnMic').click(); await tick(40); ok(!!$('#lsnHeard').textContent && !$('#lsnFoot'), 'sy: máy không có micro → báo, không chấm sai');
mode = 'none'; $('#lsnMic').click(); await tick(40); ok(!$('#lsnFoot') && $('#lsnHeard').textContent.length > 3, 'sy: nghe không ra → thử lại, không trừ điểm');
let otherSeen = false;
for (let q = 0; $('#lsnMic'); q++) {
  const wd = $('#lsnBub [lang="fr"]').textContent, paired = !!find(wd); mode = paired && !otherSeen ? 'other' : 'ok';
  $('#lsnMic').click(); await tick(40);
  const fb = $('#lsnFoot'); ok(!!fb && !!$('#lsnNext'), `sy câu ${q + 1} (${wd}): có phản hồi`);
  if (mode === 'other') otherSeen = /bad/.test(fb.className);
  $('#lsnNext').click(); await tick(100);
}
ok(otherSeen, 'sy: nghe thành từ còn lại trong cặp → sai'); ok(!!$('#lsnAgain') && recAcc.length && recAcc.every(a => a === 'fr-FR'), 'sy: màn kết; mọi lần nhận dạng dùng fr-FR');

// es không đổi: cùng engine, khoá + route riêng
await App.espron(undefined, undefined, 'es'); await tick(60); ok($$('a.btn[href*="/practice/esp?"]').length > 0 && !$$('a.btn[href*="/practice/frp?"]').length, 'es vẫn dùng route #/practice/esp (bảng TLX, không lẫn fr)');
w.close(); process.exit(fails ? 1 : 0);
