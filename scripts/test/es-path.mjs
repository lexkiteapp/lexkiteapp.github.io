// Test lộ trình ngày tiếng Tây Ban Nha W4 (spanish-course.md §10; scripts/target/{path-lib,calls-check}.mjs, web/cpack/es-app/day-ui.js, js/call.js tl).
// (a) kế hoạch ngày: mỗi điểm ngữ pháp đúng 1 ngày, từ phủ liên tục, mỗi cuộc gọi đúng 1 lần; (b) nhãn 15 ngôn ngữ đủ khóa/chỗ giữ; (c) gói khớp nguồn; (d) jsdom: hub → ngày → đánh dấu bước, gói cuộc gọi es.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import jsdom from 'jsdom'; import { execFileSync } from 'node:child_process';
import { buildPath, pathWords, DAY_UI, CALL_EVERY } from '../target/path-lib.mjs'; import { build } from '../target/drill-lib.mjs'; import { buildPx } from '../target/px-lib.mjs';
const require = createRequire(import.meta.url), WEB = 'web';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const rj = f => JSON.parse(fs.readFileSync(f, 'utf8'));

// (a) kế hoạch
const { pts } = build(), px = buildPx().topics, P = buildPath(pts, px), W = pathWords();
ok(P.days.length === pts.length && P.days.every((d, n) => d[2] === pts[n].id && d[3] === pts[n].level), `${P.days.length} ngày = ${pts.length} điểm ngữ pháp, mỗi điểm đúng 1 ngày, theo thứ tự cấp`);
ok(P.days[0][0] === 0 && P.days.at(-1)[1] === Math.min(W.length, P.days.length * 8) && P.days.every((d, n) => n === 0 || (d[0] === P.days[n - 1][1] && d[1] > d[0])), `từ phủ liên tục ${P.days.at(-1)[1]}/${W.length} từ (≤ 8/ngày; phần sau vào Ôn tập qua "Từ mở rộng" của hub), ngày nào cũng có từ mới`);
ok(P.days.length === P.plan.g.length && P.files['dy.js'].includes('ESX.dyp=function planDay'), 'dy.js mang đúng hàm planDay của path-lib (một nguồn, trình duyệt tính lại ngày)');
const cids = P.days.map(d => d[6]).filter(Boolean);
ok(new Set(cids).size === cids.length && cids.length === Math.min(P.calls.length, Math.floor(P.days.length / CALL_EVERY)) && cids.every(id => P.calls.some(c => c.id === id)), `cuộc gọi: ${cids.length} lần, mỗi cuộc đúng 1 lần, id có thật`);
ok(W.length >= 450, 'lộ trình dùng seed + lô đã duyệt (≥ 450 từ)');
// (b) nhãn
const ui = rj('content/target/es/path-ui.json'), VN = /[ơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđă]/i, bad = [];
for (const l of buildPx().GX_LANGS) {
  for (const k of DAY_UI) if (!ui[l] || !ui[l][k]) bad.push(`${l}.${k}`);
  for (const k of ['dy', 'pr']) for (const ph of ui.en[k].match(/\{\w+\}/g) || []) if (!(ui[l][k] || '').includes(ph)) bad.push(`${l}.${k} thiếu ${ph}`);
  if (l !== 'vi' && VN.test(Object.values(ui[l]).join(''))) bad.push(`${l} lẫn tiếng Việt`);
  if (l !== 'en' && ui[l].ti === ui.en.ti) bad.push(`${l} chưa dịch`);
}
ok(!bad.length, 'nhãn lộ trình: 15 ngôn ngữ đủ khóa, giữ chỗ {n}{d}{t}{p}, đã dịch' + (bad.length ? ': ' + bad.slice(0, 8).join(' | ') : ''));
// (c) gói
const fp = f => f.startsWith('@packs/') ? 'web/packs/es/' + f.slice(7) : 'web/cpack/es/' + f; // từ lộ trình ở web/packs/es (path-lib)
for (const [f, s] of Object.entries(P.files)) if (!fs.existsSync(fp(f)) || fs.readFileSync(fp(f), 'utf8') !== s) { ok(false, `${fp(f)} cũ so với nguồn – chạy node scripts/target/drill-pack.mjs`); break; }
try { execFileSync('node', ['scripts/target/calls-check.mjs'], { stdio: 'pipe' }); ok(true, 'calls-check: 24 cuộc gọi es-419 + cấu trúc'); } catch (e) { ok(false, 'calls-check: ' + String(e.stderr).slice(0, 300)); }

// (d) jsdom
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8'), scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(), errors = []; vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) errors.push(e.message); });
const dom = new jsdom.JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/practice', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} }); w.CSS = { escape: s => s };
const fetched = []; // từ lộ trình ở web/packs/es/*.json (path-lib) – phục vụ từ đĩa; mọi đường khác 404 như cũ
w.fetch = async u => { const m = /^(?:https:\/\/lexkite\.com\/)?(packs\/es\/[\w-]+\.json)\?v=\w+$/.exec(String(u)); if (m) { fetched.push(String(u)); const t = fs.readFileSync(path.join(WEB, m[1]), 'utf8'); return { ok: true, status: 200, json: async () => JSON.parse(t), text: async () => t }; } return { ok: false, status: 404, json: async () => ({}), text: async () => '' }; };
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms)); for (let k = 0; k < 100 && !w.document.querySelector('#modeGrid'); k++) await tick(100); // chờ route khởi động (#/practice) vẽ xong, tránh nó vẽ đè lên màn đang thử
ok(!errors.length, 'nạp mã + bundle esday không lỗi' + (errors.length ? ': ' + errors.join(' | ') : ''));
const { App, UI } = w, $ = x => w.document.querySelector(x), $$ = x => [...w.document.querySelectorAll(x)];
App.loadScript = async src => { w.eval(fs.readFileSync(path.join(WEB, src), 'utf8')); }; App.loadCss = async () => {};
UI.tts = () => {}; w.localStorage.clear(); w.sessionStorage.clear();
await App.esday(); await tick(60);
ok(fetched.some(u => /packs\/es\/wd\.json\?v=/.test(u)) && fetched.some(u => /wd-en\.json/.test(u)) && !Object.keys(P.files).some(f => /^wd/.test(f)), 'từ lộ trình tải từ packs/es/*.json kèm ?v=băm (ngoài web/cpack)');
// Hub mới (owner 23/11: bỏ lưới 125 ô): hero vòng tiến độ + thẻ Hôm nay + tuần thu gọn, trạng thái rõ, thưởng tuần
const WKS = Math.ceil(P.days.length / 7), DAYK = 'lk.es.day', WKK = 'lk.es.wk';
ok($('.tp .tp-ring[role=progressbar]') && $('.tp-hero h1') && $('.tp-today a.tp-go[href="#/practice/esd?d=1"]') && $$('.tp-today li').length >= 2, 'hub: hero có vòng tiến độ, thẻ Hôm nay liệt kê các phần + nút Bắt đầu ngày 1');
ok($$('details.tp-w').length === WKS && $$('details.tp-w[open]').length === 1 && $$('.tp-d').length === 7 && !$('a.chip[href*="esd?d="]') && !$$('details.tp-w:not([open]) .tp-d').length, `hub: ${WKS} tuần, chỉ tuần hiện tại mở (7 ngày), tuần sau chưa vẽ hàng, không còn lưới ô số`);
ok($('.tp-d.today[aria-current=step]') && $$('.tp-d.lock').length === 6 && $$('.tp-d.done').length === 0 && $('.tp-d.today .tp-st').textContent.includes('▶') && $('.tp-d.lock .tp-st').textContent.includes('🔒'), 'hub: trạng thái hôm nay / chưa tới (mờ + khoá)');
// Đợt 3: thẻ Ôn tập (số từ đến hạn của ngôn ngữ này → #/review) + kết quả kiểm tra cấp lấy từ điểm đề thi đã lưu (≥ 70 = đạt)
{ await tick(40); const rv = $('#tpRev');
  ok(rv && !rv.hidden && /\S/.test(rv.textContent) && !/\{n\}/.test(rv.textContent), 'hub: thẻ Ôn tập hiện (chưa có từ đến hạn → "không có gì để ôn")');
  w.localStorage.setItem('lk.es.x', JSON.stringify({ A1: { 1: { rd: 55, ls: 85 } } })); await App.esday(); await tick(60);
  ok($('.tp-stg li.on .tp-sgt.ok') && !$$('.tp-stg li:not(.on) .tp-sgt').length, 'hub: điểm đề thi A1 85 ≥ 70 → chặng A1 hiện "Đạt"');
  w.localStorage.setItem('lk.es.x', JSON.stringify({ A1: { 1: { rd: 55 } } })); await App.esday(); await tick(60);
  ok($('.tp-stg li.on .tp-sgt') && !$('.tp-stg li.on .tp-sgt.ok') && /55/.test($('.tp-stg li.on .tp-sgt').textContent), 'hub: điểm 55 < 70 → hiện điểm cao nhất, chưa đạt');
  w.localStorage.removeItem('lk.es.x'); await App.esday(); await tick(60); }
// Đợt 2: mỗi ngày có mục tiêu "làm được gì" (cando.json, 15 ngôn ngữ) hiện ở thẻ Hôm nay; thẻ chặng có nút kiểm tra cấp (đề DELE/SIELE sẵn có)
{ const cd = JSON.parse(fs.readFileSync('content/target/es/cando.json', 'utf8')), LG = Object.keys(JSON.parse(fs.readFileSync('content/target/es/path-ui.json', 'utf8')));
  ok(LG.length === 15 && LG.every(l => P.days.every((d, n) => (cd[l] || {})[pts[n].id] && cd[l][pts[n].id].length <= 160)), 'cando.json: mục tiêu mỗi ngày đủ 15 ngôn ngữ, ≤ 160 ký tự');
  ok(/^🎯 /.test($('.tp-today .tp-goal').textContent) && $$('.tp-stg a.tp-btn[href^="#/practice/esx?lv="]').length >= 3, 'hub: thẻ Hôm nay có mục tiêu 🎯; mỗi chặng có nút kiểm tra cấp (esx?lv=)'); }
// Khung chặng CEFR (đợt 1 khung khóa đa ngôn ngữ): thẻ chặng A1/A2/B1 (+B2 sắp có) có tên + mục tiêu + tiến độ; lần đầu hỏi trình độ → điểm bắt đầu, không đánh dấu xong ngày nào
{ const A1n = P.days.filter(d => d[3] === 'A1').length, A2at = P.days.findIndex(d => d[3] === 'A2');
  ok($$('.tp-stg li').length === 4 && $$('.tp-stg li.on').length === 1 && $$('.tp-stg li.soon').length === 1 && /0\/\d+/.test($('.tp-stg li.on small').textContent) && /Español|Spanish/.test($('.tp-stg li.on .tp-sgc').textContent) && !/\{[a-zA-Z]\}/.test($('.tp-stg').textContent), 'hub: thẻ chặng A1/A2/B1 + B2 sắp có, có mục tiêu "làm được gì" (tên ngôn ngữ thay {L}) và tiến độ x/y ngày');
  ok($$('#tpAsk [data-start]').length === 3, 'hub: lần đầu hỏi trình độ (3 lựa chọn)');
  $$('#tpAsk [data-start]')[1].click(); await tick(20);
  ok(w.localStorage.getItem('lk.es.start') === String(A2at) && !$('#tpAsk') && $(`.tp-today a.tp-go[href="#/practice/esd?d=${A2at + 1}"]`) && !w.localStorage.getItem('lk.es.day'), `hub: chọn "biết cơ bản" → hôm nay nhảy tới ngày ${A2at + 1} (đầu A2, sau ${A1n} ngày A1), không đánh dấu xong ngày nào`);
  w.localStorage.removeItem('lk.es.start'); await App.esday(); await tick(60); }
{ const w2 = $$('details.tp-w')[1]; w2.open = true; w2.dispatchEvent(new w.Event('toggle')); ok($$('details.tp-w')[1].querySelectorAll('.tp-d').length === 7 && $$('details.tp-w[open] .tp-rw').length === 2, 'hub: mở tuần 2 → vẽ lười 7 ngày + hàng thưởng tuần'); }
w.localStorage.setItem(DAYK, JSON.stringify(Object.fromEntries(P.days.slice(0, 7).map((d, n) => [n, 'wgpc'])))); await App.esday(); await tick(60);
{ const sec = $$('details.tp-w')[0]; sec.open = true; sec.dispatchEvent(new w.Event('toggle')); ok(sec.classList.contains('done') && $$('.tp-d.done').length === 7 && $('.tp-today a.tp-go[href="#/practice/esd?d=8"]'), 'hub: xong 7 ngày → tuần 1 ✓, hôm nay nhảy sang ngày 8');
  const b = sec.querySelector('[data-claim="0"]'); ok(b && !b.disabled, 'hub: tuần xong → nút nhận thưởng'); if (b) { b.click(); await tick(20); ok(JSON.parse(w.localStorage.getItem(WKK))['0'] === 1 && $$('details.tp-w')[0].querySelector('[data-claim="0"]').disabled, 'hub: nhận thưởng một lần (ghi lk.es.wk, nút khoá)'); } }
w.localStorage.removeItem(DAYK); w.localStorage.removeItem(WKK); await App.esday(); await tick(60);
await App.esday('1'); await tick(60);
ok($$('section.card').length === 3 && $$('[data-sp]').length >= 6 && $('a[href^="#/practice/es?lv=A1&p=ser-identity"]') && $('a[href^="#/practice/esp?tp="]'), 'ngày 1: từ mới + ngữ pháp (đúng điểm) + phát âm, có nút nghe');
$('#dsMk').click(); await tick(20);
ok(JSON.parse(w.localStorage.getItem('lk.es.day'))['0'] === 'w', 'bấm "Đánh dấu xong" ghi bước w');
{ const C = await w.Core.Cards.all(), es = Object.values(C).filter(c => c.tl === 'es'), d0 = P.days[0];
  ok(es.length === d0[1] - d0[0] && es.every(c => C[w.Core.tlKey(c.word, 'es')] === c && c.srs && c.gl && c.gl.en), `"Đánh dấu xong" đưa ${d0[1] - d0[0]} từ của ngày vào Ôn tập (thẻ tl:es, khóa es:từ, có SRS + nghĩa)`);
  ok(/\bla casa\b/.test($('#ds-w').textContent), 'danh từ hiện kèm mạo từ theo giống (la casa)'); }
ok(P.days.every(d => d[1] - d[0] <= 8), 'mỗi ngày ≤ 8 từ mới (kho lớn không dồn vào một ngày)');
$('a[data-s="g"]').click(); App.esDayMark('c');
ok(JSON.parse(w.localStorage.getItem('lk.es.day'))['0'] === 'w', 'màn kết cuộc gọi không đánh dấu bước ngữ pháp');
App.esDayMark('gp');
ok(JSON.parse(w.localStorage.getItem('lk.es.day'))['0'] === 'wg' && !w.sessionStorage.getItem('lk.es.dayctx'), 'màn kết bài ngữ pháp đánh dấu g và xoá ngữ cảnh');
await App.esday('5'); await tick(60);
ok($('a[href="#/call/' + P.days[4][6] + '"]'), 'ngày 5 có cuộc gọi ' + P.days[4][6]);
ok(w.CALLS.filter(c => c.tl === 'es').length === 24 && w.CALLS.every(c => (c.tl === 'es') === /^es-/.test(c.id)), 'gói cl.js: 24 cuộc gọi gắn tl:es, cuộc gọi tiếng Anh không có tl');
try { App.routes.call('es-pasatiempos'); await tick(80); } catch (e) { errors.push('call: ' + e.message); }
ok(!errors.length && /Hablemos de tus pasatiempos/.test(App.view.textContent) && !/IELTS|TOEIC/.test(App.view.textContent), 'mở #/call/es-pasatiempos: cuộc gọi es hiện đúng, không lẫn cuộc gọi tiếng Anh' + (errors.length ? ': ' + errors.join(' | ') : ''));
if (fails) { console.error(`✗ ${fails} lỗi`); process.exit(1); }
console.log('✓ es-path xong'); process.exit(0);
