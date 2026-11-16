// Test đề luyện định dạng DELE/SIELE W5 (spanish-exam-w5.md; web/cpack/es-app/exam-ui.js, scripts/target/exam-es-lib.mjs):
// (a) gói đề khớp nguồn + không đoán số; (b) jsdom: danh sách đề → Đọc (điền từ) → Nghe (chép) → Viết → Nói (rubric trên máy) → kết quả/lưu điểm.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import jsdom from 'jsdom';
import { buildExam, EX_LV } from '../target/exam-es-lib.mjs';
const require = createRequire(import.meta.url), WEB = 'web';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };

const { files, levels } = buildExam();
for (const [f, s] of Object.entries(files)) ok(fs.existsSync('web/cpack/es/' + f) && fs.readFileSync('web/cpack/es/' + f, 'utf8') === s, `web/cpack/es/${f} khớp nguồn`);
ok(EX_LV.every(l => levels[l].e.length === 2 && levels[l].sp.items === null), 'mỗi cấp ≥ 2 đề; số câu mỗi tarea DELE để null (chưa xác minh)');

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
const loaded = []; App.loadScript = async src => { loaded.push(src); w.eval(fs.readFileSync(path.join(WEB, src), 'utf8')); };
const spoken = [], rewards = []; UI.tts = t => { spoken.push(t); }; App.reward = async d => { rewards.push(d); };
ok(typeof App.esexam === 'function' && App.esX && App.esQ && App.esFoot && App.esEnd, 'App.esexam + phần dùng chung với espr.js có');

await App.esexam(); await tick(60);
ok($$('section.card').length === 6 && $$('a.btn[href*="p=rd"]').length === 12 && $$('a.btn[href*="p=sp"]').length === 12, 'danh sách: 6 cấp × 2 đề × 4 phần');
ok(/Tatoeba/.test($('#x-A1').textContent) && /45/.test($('#x-A1').textContent), 'có dòng ghi công Tatoeba + định dạng chính thức đã xác minh (A1 đọc 45′)');
ok(loaded.some(s => /x-ui-/.test(s)) && loaded.some(s => /x-C2/.test(s)), 'gói nhãn theo ngôn ngữ đã tải + gói từng cấp A1–C2');

// Đọc: 10 câu điền từ; chọn đúng / sai
await App.esexam('A1', 1, 'rd'); await tick(60);
ok($('#lsn.lsn-v2') && $('#lsnBub') && $('#lsnCheck'), 'rd: khung Stitch lesson-question');
let bad = 0; const ex = levels.A1.e[0];
for (let q = 0; q < 10; q++) {
  const it = ex.c[q], opts = $$('#lsnBody .lsn-opt'); ok(opts.length === 3 && opts.some(o => o.dataset.o === it[1]), `rd câu ${q + 1}: 3 phương án gồm đáp án`);
  const wrong = q === 3; (wrong ? opts.find(o => o.dataset.o !== it[1]) : opts.find(o => o.dataset.o === it[1])).click(); $('#lsnCheck').click(); await tick();
  const fb = $('#lsnFoot'); ok(!!fb && fb.textContent.includes('Tatoeba #' + it[3]), `rd câu ${q + 1}: phản hồi + ghi công Tatoeba`); if (wrong) bad = /bad/.test(fb.className) ? 1 : 0;
  $('#lsnNext').click(); await tick();
}
ok(bad === 1 && !!$('#lsnAgain') && rewards.length === 1, 'rd: sai → phản hồi sai; màn kết; thưởng một lần');
let st = JSON.parse(w.localStorage.getItem('lk.es.x')); ok(st.A1[1].rd === 90, 'rd: điểm 90% được lưu');

// Nghe: gõ đúng / thiếu tilde-dấu câu / sai
await App.esexam('A2', 2, 'ls'); await tick(120);
const lx = levels.A2.e[1]; ok(spoken.includes(lx.l[0][0]), 'ls: đọc câu đầu khi mở');
for (let q = 0; q < 6; q++) {
  const inp = $('#lsnIn'); ok(!!inp && inp.lang === 'es', `ls câu ${q + 1}: ô gõ`);
  inp.value = q === 1 ? 'zzz' : q === 2 ? lx.l[q][0].normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[¿¡.?!,]/g, '') : lx.l[q][0]; inp.dispatchEvent(new w.Event('input')); $('#lsnCheck').click(); await tick();
  const fb = $('#lsnFoot'); ok(!!fb, `ls câu ${q + 1}: phản hồi`); if (q === 1) ok(/bad/.test(fb.className), 'ls: gõ sai → sai');
  $('#lsnNext').click(); await tick();
}
st = JSON.parse(w.localStorage.getItem('lk.es.x')); ok(st.A2[2].ls >= 83 && st.A2[2].ls <= 100, `ls: điểm lưu (${st.A2[2].ls}%), sai 1 câu → ≤ 5/6`);

// Viết: rubric (đếm từ, từ nối, ý khóa)
await App.esexam('B1', 1, 'wr'); await tick(60);
ok(!!$('#exTxt') && $('#exTxt').lang === 'es' && /correo|escuela/i.test(App.view.textContent), 'wr: consigna + ô viết');
$('#exTxt').value = 'Hola'; $('#exTxt').dispatchEvent(new w.Event('input')); $('#exChk').click(); await tick();
const lo = +/(\d+)%/.exec($('#exRes').textContent)[1]; ok(lo < 30, `wr: bài rất ngắn điểm thấp (${lo}%)`);
$('#exTxt').value = 'Estimados señores, quiero estudiar español en su escuela porque me gustaría hablar con clientes. Estudio español desde hace dos años, pero todavía tengo dudas; por eso busco clases con un buen nivel. Además, trabajo por la tarde, así que necesito horarios flexibles. Sin embargo, también quisiera saber cuánto cuestan las clases y qué matrícula tienen. Muchas gracias por su ayuda y atentamente, un alumno.'; $('#exTxt').dispatchEvent(new w.Event('input')); $('#exChk').click(); await tick();
const hi = +/(\d+)%/.exec($('#exRes').textContent)[1]; ok(hi >= 80 && hi > lo, `wr: bài đủ ý, từ nối, độ dài điểm cao (${hi}%)`);
ok(/SIELE/.test($('#exRes').textContent) && /250/.test($('#exRes').textContent), 'wr: hiện ước lượng thang SIELE 0–250');
st = JSON.parse(w.localStorage.getItem('lk.es.x')); ok(st.B1[1].wr === hi, 'wr: điểm lưu');

// B2–C2 (đợt 2): định dạng đã xác minh hiện, chỗ chưa xác minh (min = null) không in "null"
await App.esexam('C2', 2, 'wr'); await tick(60);
ok(!!$('#exTxt') && /C2/.test(App.view.textContent), 'C2 wr: consigna + ô viết');
await App.esexam('B2', 1, 'rd'); await tick(60);
ok(!!$('#lsnBub') && levels.B2.e[0].c.length === 10, 'B2 rd: mở được đề điền từ');
await App.esexam(); await tick(60);
ok(/105/.test($('#x-C2').textContent) && !/null/.test($('#x-C1').textContent + $('#x-C2').textContent), 'C1/C2: hiện định dạng đã xác minh, không in null');

// Nói: micro giả điền văn bản; không micro → báo, vẫn gõ được
let mode = 'ok'; UI.recognize = (t0, acc, cb) => { setTimeout(() => { if (mode === 'ok') cb.result({ heard: 'vivo en una casa grande y pequeña cerca de la ciudad', alts: [] }); else cb.error('unsupported'); cb.end(); }, 5); return { stop() {} }; };
await App.esexam('A1', 1, 'sp'); await tick(60);
ok(!!$('#exMic') && !!$('#exTxt'), 'sp: micro + ô văn bản (sửa được)');
mode = 'err'; $('#exMic').click(); await tick(40); ok($('#exHeard').textContent.length > 3 && !$('#exMic').disabled, 'sp: không có micro → báo, không khóa');
mode = 'ok'; $('#exMic').click(); await tick(40); ok(/vivo en una casa/.test($('#exTxt').value), 'sp: văn bản nghe được điền vào ô');
$('#exChk').click(); await tick(); ok(/%/.test($('#exRes').textContent) && /\((<A1|[ABC][12])\)/.test($('#exRes').textContent), 'sp: có điểm + dải SIELE ước lượng');

// Tổng kết khi đủ 4 phần (A1 đề 1): A1 chưa xác minh ngưỡng → chỉ báo %, không phán đạt/trượt
st = JSON.parse(w.localStorage.getItem('lk.es.x')); st.A1[1].ls = 100; st.A1[1].wr = 80; w.localStorage.setItem('lk.es.x', JSON.stringify(st));
await App.esexam(); await tick(60);
ok(/estimate/i.test($('#x-A1').textContent) && /No verified pass rule/.test($('#x-A1').textContent) && !/meets the 60/.test($('#x-A1').textContent), 'A1 đủ 4 phần: chỉ báo %, không phán đạt/trượt (ngưỡng chưa xác minh)');
w.close(); process.exit(fails ? 1 : 0);
