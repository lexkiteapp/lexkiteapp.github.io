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
ok(P.days[0][0] === 0 && P.days.at(-1)[1] === W.length && P.days.every((d, n) => n === 0 || (d[0] === P.days[n - 1][1] && d[1] > d[0])), `từ phủ liên tục ${W.length} từ, ngày nào cũng có từ mới`);
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
for (const [f, s] of Object.entries(P.files)) if (!fs.existsSync('web/cpack/es/' + f) || fs.readFileSync('web/cpack/es/' + f, 'utf8') !== s) { ok(false, `web/cpack/es/${f} cũ so với nguồn – chạy node scripts/target/drill-pack.mjs`); break; }
try { execFileSync('node', ['scripts/target/calls-check.mjs'], { stdio: 'pipe' }); ok(true, 'calls-check: 24 cuộc gọi es-419 + cấu trúc'); } catch (e) { ok(false, 'calls-check: ' + String(e.stderr).slice(0, 300)); }

// (d) jsdom
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8'), scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(), errors = []; vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) errors.push(e.message); });
const dom = new jsdom.JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/practice', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} }); w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms)); for (let k = 0; k < 100 && !w.document.querySelector('#modeGrid'); k++) await tick(100); // chờ route khởi động (#/practice) vẽ xong, tránh nó vẽ đè lên màn đang thử
ok(!errors.length, 'nạp mã + bundle esday không lỗi' + (errors.length ? ': ' + errors.join(' | ') : ''));
const { App, UI } = w, $ = x => w.document.querySelector(x), $$ = x => [...w.document.querySelectorAll(x)];
App.loadScript = async src => { w.eval(fs.readFileSync(path.join(WEB, src), 'utf8')); };
UI.tts = () => {}; w.localStorage.clear(); w.sessionStorage.clear();
await App.esday(); await tick(60);
ok($$('a.chip[href*="esd?d="]').length === P.days.length && $('a.btn.primary[href="#/practice/esd?d=1"]'), 'hub: mọi ngày có ô, nút Bắt đầu ngày 1');
await App.esday('1'); await tick(60);
ok($$('section.card').length === 3 && $$('[data-sp]').length >= 6 && $('a[href^="#/practice/es?lv=A1&p=ser-identity"]') && $('a[href^="#/practice/esp?tp="]'), 'ngày 1: từ mới + ngữ pháp (đúng điểm) + phát âm, có nút nghe');
$('#dsMk').click(); await tick(20);
ok(JSON.parse(w.localStorage.getItem('lk.es.day'))['0'] === 'w', 'bấm "Đánh dấu xong" ghi bước w');
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
