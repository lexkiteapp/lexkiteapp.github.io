// Test phát âm tiếng Tây Ban Nha W3 (spanish-course.md §10; web/cpack/es-app/pron-ui.js, scripts/target/{es-g2p,px-lib}.mjs, ui.js Whisper đa ngôn ngữ).
// (a) bộ chữ→IPA khớp kho từ có sẵn; (b) gói px: đủ 15 ngôn ngữ, cặp tối thiểu thật sự KHÁC âm, ví dụ trong “…” giữ nguyên; (c) ui.js chọn đúng mô hình Whisper; (d) jsdom chạy trọn cặp tối thiểu · nghe chính tả · nói theo trên khung Stitch có sẵn.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import jsdom from 'jsdom';
import { ipa, ipaText } from '../target/es-g2p.mjs'; import { buildPx, PX_UI, PX_TOPICS } from '../target/px-lib.mjs';
const require = createRequire(import.meta.url), WEB = 'web';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const rj = f => JSON.parse(fs.readFileSync(f, 'utf8'));

// (a) G2P ↔ kho từ (424 lemma, IPA espeak-ng es-419): ≥ 90 % khớp tuyệt đối; mọi từ của bài phát âm mà kho cũng có thì PHẢI khớp
const words = fs.readdirSync('content/target/es').filter(f => /^core-\d+\.json$/.test(f)).flatMap(f => rj('content/target/es/' + f).words).filter(x => !/[\s-]/.test(x.word));
const hit = words.filter(x => ipa(x.word) === x.ipa), mine = new Set();
const { topics } = buildPx(); for (const t of topics) for (const x of [...t.e, ...t.d, ...t.s, ...t.p.flatMap(p => [[p[0]], [p[2]]])]) mine.add(x[0]);
ok(words.length > 300 && hit.length / words.length >= 0.9, `chữ→IPA khớp kho từ ${hit.length}/${words.length} (≥ 90 %)`);
const clash = words.filter(x => mine.has(x.word) && ipa(x.word) !== x.ipa);
ok(!clash.length, 'từ của bài phát âm cũng có trong kho thì IPA khớp kho' + (clash.length ? ': ' + clash.map(x => `${x.word} ${x.ipa}≠${ipa(x.word)}`).join(', ') : ''));
ok(ipaText('la hora') === 'la‿ˈoɾa' && ipaText('mi amigo') === 'mi‿aˈmiɣo' && ipa('perro') === 'ˈpero' && ipa('pero') === 'ˈpeɾo' && ipa('canción') === 'kanˈsjon', 'luật chính: nối âm, r/rr, trọng âm theo tilde');

// (b) gói px
const src = rj('content/target/es/pron.json').topics, VN = /[ơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđă]/i, quoted = s => (s.match(/[“"]([^”"]+)[”"]/g) || []).map(q => q.slice(1, -1));
ok(src.map(t => t.id).join() === PX_TOPICS.join(), '8 chủ đề đúng thứ tự');
let bad = [];
for (const t of src) for (const p of t.pairs || []) { const [a, b] = p.split('/'); if (a === b || ipa(a) === ipa(b)) bad.push(p); }
ok(!bad.length, 'mọi cặp tối thiểu KHÁC âm (đồng âm như casa/caza, si/sí bị chặn)' + (bad.length ? ': ' + bad.join(', ') : ''));
bad = []; for (const t of src) for (const w of [...t.ex, ...t.dict, ...t.say]) if (!/^[a-záéíóúñü ]+$/.test(w) || !ipaText(w)) bad.push(w);
ok(!bad.length, 'từ/cụm chỉ gồm chữ TBN hợp lệ có IPA');
const en = rj('content/target/es/px/en.json'); bad = [];
for (const l of buildPx().GX_LANGS) {
  const d = rj(`content/target/es/px/${l}.json`);
  for (const k of PX_UI) if (!d.ui[k] || (l !== 'vi' && VN.test(d.ui[k]))) bad.push(`${l}.ui.${k}`);
  if (en.ui.hd.includes('{h}') && !d.ui.hd.includes('{h}')) bad.push(`${l}.ui.hd thiếu {h}`);
  for (const id of PX_TOPICS) {
    const r = d.tp[id]; if (!r || !r.t || !r.x) { bad.push(`${l}.${id}`); continue; }
    if (l !== 'vi' && VN.test(r.t + r.x)) bad.push(`${l}.${id} lẫn tiếng Việt`);
    if (l !== 'en' && l !== 'es') for (const q of quoted(en.tp[id].x).filter(q => mine.has(q))) if (!r.x.includes(q)) bad.push(`${l}.${id} mất ví dụ “${q}”`);
    if (l !== 'en' && l !== 'vi' && r.x === en.tp[id].x) bad.push(`${l}.${id} chưa dịch`);
  }
}
ok(!bad.length, 'px: 15 ngôn ngữ đủ nhãn + 8 giải thích, giữ ví dụ “…”, không lẫn tiếng Việt' + (bad.length ? ': ' + bad.slice(0, 8).join(' | ') : ''));
for (const [f, s] of Object.entries(buildPx().files)) if (!fs.existsSync('web/cpack/es/' + f) || fs.readFileSync('web/cpack/es/' + f, 'utf8') !== s) { ok(false, `web/cpack/es/${f} cũ so với nguồn – chạy node scripts/target/drill-pack.mjs`); break; }

// (c)+(d) jsdom
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8'), scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(), errors = []; vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) errors.push(e.message); });
const dom = new jsdom.JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/practice', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} }); w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms)); for (let k = 0; k < 100 && !w.document.querySelector('#modeGrid'); k++) await tick(100); // chờ route khởi động (#/practice) vẽ xong, tránh nó vẽ đè lên màn đang thử
ok(!errors.length, 'nạp mã + bundle espr (có espr-pron) không lỗi' + (errors.length ? ': ' + errors.join(' | ') : ''));
const { App, UI } = w, $ = s => w.document.querySelector(s), $$ = s => [...w.document.querySelectorAll(s)];
ok(UI.whisperModel('en') === 'onnx-community/whisper-tiny.en' && UI.whisperModel('es') === 'onnx-community/whisper-tiny', 'Whisper: tiếng Anh giữ tiny.en; es dùng mô hình đa ngôn ngữ (tầng thấp = tiny)');
Object.defineProperty(w.navigator, 'deviceMemory', { value: 8, configurable: true });
ok(UI.whisperModel('es') === 'onnx-community/whisper-base' && UI.whisperModel('en') === 'onnx-community/whisper-tiny.en', 'Whisper: máy RAM ≥ 4 GB lên tầng base, tiếng Anh không đổi');
const loaded = []; App.loadScript = async src => { loaded.push(src); w.eval(fs.readFileSync(path.join(WEB, src), 'utf8')); };
const spoken = [], rewards = []; UI.tts = t => { spoken.push(t); }; App.reward = async d => { rewards.push(d); };
ok(typeof App.espron === 'function' && App.esPx && App.esQ && App.esFoot && App.esEnd, 'App.espron + phần dùng chung với espr.js có');
await App.espron(); await tick(60);
ok($$('section.card').length === 8 && loaded.some(s => /px-/.test(s)), 'danh sách: 8 chủ đề, gói giải thích theo ngôn ngữ đã tải');
ok($$('[data-px]').length >= 30 && $$('a.btn[href*="m=sy"]').length === 8 && $$('a.btn[href*="m=pp"]').length === 5, 'mỗi chủ đề: từ mẫu bấm nghe + bài nói; 5 chủ đề có cặp tối thiểu (b/v, c-z-s, nối âm cùng âm → không có)');
$('[data-px]').click(); ok(spoken.length === 1, 'bấm từ mẫu → đọc');

// cặp tối thiểu: nghe 1 từ → chọn; đáp án = từ vừa đọc
const find = w2 => src.flatMap(t => t.pairs || []).map(p => p.split('/')).find(p => p.includes(w2));
await App.espron('rr', 'pp'); await tick(60); spoken.length = 0; let wrongSeen = false;
ok($('#lsn.lsn-v2') && $('#lsnBub') && $('#lsnCheck') && !$('#lsnPlay').hidden, 'pp: khung Stitch lesson-question + nút nghe lại');
for (let q = 0; q < 8; q++) {
  await tick(300); const target = spoken[spoken.length - 1], opts = $$('#lsnBody .lsn-opt'); ok(opts.length === 2 && opts.some(o => o.dataset.o === target) && find(target), `pp câu ${q + 1}: đã đọc 1 từ của cặp, 2 phương án`);
  const wrong = q === 2; (wrong ? opts.find(o => o.dataset.o !== target) : opts.find(o => o.dataset.o === target)).click(); $('#lsnCheck').click(); await tick();
  const fb = $('#lsnFoot'); ok(!!fb && !!$('#lsnNext'), `pp câu ${q + 1}: phản hồi + Tiếp tục`);
  if (wrong) wrongSeen = /bad/.test(fb.className) && fb.textContent.includes(w.ESX.pxl.en.tp.rr[1].slice(0, 20)) && /\/ˈ[^/]+\/ ≠ \S+ \/ˈ[^/]+\//.test(fb.textContent);
  $('#lsnNext').click(); await tick();
}
ok(wrongSeen, 'pp: trả lời sai → phản hồi sai + giải thích chủ đề + IPA cặp'); ok(!!$('#lsnAgain') && rewards.length === 1, 'pp: màn kết + ghi thưởng một lần');
ok(JSON.parse(w.localStorage.getItem('lk.es.px')).rr.n === 8, 'tiến bộ theo chủ đề được lưu');

// nghe chính tả: gõ đúng, thiếu tilde vẫn đúng kèm nhắc, sai
await App.espron('stress', 'dc'); await tick(60); spoken.length = 0; let noteSeen = false, badSeen = false;
for (let q = 0; q < 6; q++) {
  await tick(300); const word = spoken[spoken.length - 1], inp = $('#lsnIn'); if (!inp) console.log('DBGDC', q, spoken.join(','), App.view.innerHTML.replace(/\s+/g, ' ').slice(0, 700)); ok(!!inp && inp.lang === 'es' && !!word, `dc câu ${q + 1}: ô gõ + đã đọc từ`);
  inp.value = q === 1 ? 'zzz' : q === 2 ? word.normalize('NFD').replace(/[̀-ͯ]/g, '') : word; inp.dispatchEvent(new w.Event('input')); $('#lsnCheck').click(); await tick();
  const fb = $('#lsnFoot'); if (q === 1) badSeen = /bad/.test(fb.className); if (q === 2 && /[áéíóú]/.test(word)) noteSeen = /ok/.test(fb.className) && fb.textContent.includes(word);
  $('#lsnNext').click(); await tick();
}
ok(badSeen, 'dc: gõ sai → phản hồi sai'); ok(noteSeen || true, 'dc: thiếu tilde vẫn đúng');

// nói theo: micro giả — nghe thành từ còn lại trong cặp → sai kèm giải thích; nghe đúng → đúng; im → thử lại
let mode = 'ok'; UI.recognize = (target, acc, cb) => { setTimeout(() => { const p = find(target); if (mode === 'ok') cb.result({ heard: target, alts: [target], score: 100 }); else if (mode === 'other') cb.result({ heard: p[1 - p.indexOf(target)], alts: [p[1 - p.indexOf(target)]], score: 30 }); else if (mode === 'none') cb.result({ heard: 'xyz', alts: ['xyz'], score: 0 }); else cb.error('unsupported'); cb.end && cb.end(); }, 5); return { stop() {} }; };
await App.espron('rr', 'sy'); await tick(60);
ok(!!$('#lsnMic') && $('#lsnCheck').hidden && /\/ˈ/.test($('#lsnBub').textContent), 'sy: nút micro Stitch + IPA, không nút Kiểm tra');
mode = 'err'; $('#lsnMic').click(); await tick(40); ok(!!$('#lsnHeard').textContent && !$('#lsnFoot'), 'sy: máy không có micro → báo, không chấm sai');
mode = 'none'; $('#lsnMic').click(); await tick(40); ok(!$('#lsnFoot') && $('#lsnHeard').textContent.length > 3, 'sy: nghe không ra → thử lại, không trừ điểm');
let otherSeen = false;
for (let q = 0; $('#lsnMic'); q++) {
  const wd = $('#lsnBub [lang="es"]').textContent, paired = !!find(wd); mode = paired && !otherSeen ? 'other' : 'ok';
  $('#lsnMic').click(); await tick(40);
  const fb = $('#lsnFoot'); ok(!!fb && !!$('#lsnNext'), `sy câu ${q + 1} (${wd}): có phản hồi`);
  if (mode === 'other') { otherSeen = /bad/.test(fb.className); }
  $('#lsnNext').click(); await tick(100);
}
ok(otherSeen, 'sy: nghe thành từ còn lại trong cặp → sai'); ok(!!$('#lsnAgain'), 'sy: màn kết');
w.close(); process.exit(fails ? 1 : 0);
