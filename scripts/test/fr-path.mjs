// Test lộ trình ngày tiếng Pháp W4 (french-course.md §10; CÙNG engine es: scripts/target/{path-lib,calls-check}.mjs, web/cpack/es-app/day-ui.js bảng TLD, js/call.js tl).
// (a) kế hoạch: mỗi điểm ngữ pháp đúng 1 ngày, từ phủ liên tục (kho nhỏ: nhiều ngày không có từ mới – bước từ bị bỏ), mỗi cuộc gọi đúng 1 lần; (b) nhãn 15 ngôn ngữ; (c) gói khớp nguồn + calls-check fr + es không đổi;
// (d) jsdom: hub → ngày → đánh dấu bước, mạo từ le/la/l' theo giống + h, bước phát âm bỏ gọn khi tl chưa có phát âm, gói cuộc gọi fr + engine fr.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import jsdom from 'jsdom'; import { execFileSync } from 'node:child_process';
import { buildPath, pathWords, DAY_UI, CALL_EVERY } from '../target/path-lib.mjs'; import { build, TLP } from '../target/drill-lib.mjs'; import { buildPx } from '../target/px-lib.mjs';
const require = createRequire(import.meta.url), WEB = 'web', T = TLP.fr;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const rj = f => JSON.parse(fs.readFileSync(f, 'utf8'));

// (a) kế hoạch
const { pts } = build('fr'), P = buildPath(pts, T.px ? buildPx('fr').topics : [], T), W = pathWords(T);
ok(pts.length === 128 && P.days.length === pts.length && P.days.every((d, n) => d[2] === pts[n].id && d[3] === pts[n].level), `${P.days.length} ngày = ${pts.length} điểm ngữ pháp A1–B1, mỗi điểm đúng 1 ngày, theo thứ tự cấp`);
ok(P.days[0][0] === 0 && P.days.at(-1)[1] === W.length && P.days.every((d, n) => (n === 0 || d[0] === P.days[n - 1][1]) && d[1] >= d[0] && d[1] - d[0] <= 8), `từ phủ liên tục ${W.length} từ (seed + lô đã duyệt), ≤ 8 từ/ngày, không bỏ sót`);
ok(P.files['dy.js'].startsWith('self.FRX=self.FRX||{};FRX.dy=') && P.files['dy.js'].includes('FRX.dyp=function planDay'), 'dy.js (biến FRX) mang đúng hàm planDay của path-lib (một nguồn, trình duyệt tính lại ngày)');
const HP = P.plan.t[0][0] !== ''; // fr có chủ đề phát âm (W3) → mỗi ngày có bước phát âm; chưa có → bước bỏ gọn
ok(HP ? P.days.every(d => P.plan.t.some(t => t[0] === d[4])) : (P.plan.t.length === 1 && P.days.every(d => d[4] === '')), HP ? 'mỗi ngày có 1 chủ đề phát âm fr (W3) có thật trong gói px' : 'tl chưa có chủ đề phát âm → mọi ngày bỏ bước phát âm (chủ đề rỗng, không liên kết hỏng)');
const cids = P.days.map(d => d[6]).filter(Boolean);
ok(new Set(cids).size === cids.length && cids.length === Math.min(P.calls.length, Math.floor(P.days.length / CALL_EVERY)) && cids.every(id => P.calls.some(c => c.id === id)) && P.days.every((d, n) => !!d[6] === (n % CALL_EVERY === 4 && n / CALL_EVERY < P.calls.length)), `cuộc gọi: ${cids.length} lần (5 ngày một cuộc), mỗi cuộc đúng 1 lần, id có thật`);
const lvr = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4 }, order = cids.map(id => lvr[P.calls.find(c => c.id === id).lv]);
ok(order.every((v, i) => !i || v >= order[i - 1]), 'cuộc gọi đi từ dễ → khó theo ngày');
ok(W.length >= 30 && W.slice(0, 30).every(w => w.rank === -1), 'từ học: seed 30 từ trước, lô lõi chỉ vào khi status "reviewed"');
const row = i => JSON.parse(P.files['wd.js'].match(/wd=(.*);\n/)[1])[i];
ok(row(0).join('|') === 'maison|n|mɛzɔ̃|Notre maison est près de la gare.|f' && row(1).slice(4).join('|') === 'f|eaux' && row(29).slice(4).join('|') === 'm||a', 'hàng wd.js: giống, số nhiều bất quy tắc (eaux), cờ h aspiré (haricot) cho mạo từ');
// (b) nhãn
const ui = rj('content/target/fr/path-ui.json'), VN = /[ơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹđă]/i, bad = [], LANGS = Object.keys(ui);
ok(LANGS.length === 15, 'path-ui.json có 15 ngôn ngữ');
for (const l of LANGS) {
  for (const k of DAY_UI) if (!ui[l] || !ui[l][k]) bad.push(`${l}.${k}`);
  for (const k of ['dy', 'pr', 'sv']) for (const ph of ui.en[k].match(/\{\w+\}/g) || []) if (!(ui[l][k] || '').includes(ph)) bad.push(`${l}.${k} thiếu ${ph}`);
  if (l !== 'vi' && VN.test(Object.values(ui[l]).join(''))) bad.push(`${l} lẫn tiếng Việt`);
  if (l !== 'en' && ui[l].ti === ui.en.ti) bad.push(`${l} chưa dịch`);
}
ok(!bad.length, 'nhãn lộ trình fr: 15 ngôn ngữ đủ khóa, giữ chỗ {n}{d}{t}{p}, đã dịch' + (bad.length ? ': ' + bad.slice(0, 8).join(' | ') : ''));
// (c) gói
for (const [f, s] of Object.entries(P.files)) if (!fs.existsSync('web/cpack/fr/' + f) || fs.readFileSync('web/cpack/fr/' + f, 'utf8') !== s) { ok(false, `web/cpack/fr/${f} cũ so với nguồn – chạy node scripts/target/drill-pack.mjs --tl fr`); break; }
for (const tl of ['fr', 'es']) try { execFileSync('node', ['scripts/target/calls-check.mjs', '--tl', tl], { stdio: 'pipe' }); ok(true, `calls-check ${tl}: 24 cuộc gọi + cấu trúc + lệch chuẩn${tl === 'fr' ? ' + một xưng hô (tu ⟂ vous) mỗi cuộc' : ''}`); } catch (e) { ok(false, `calls-check ${tl}: ` + String(e.stderr).slice(0, 300)); }

// (d) jsdom
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8'), scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const vc = new jsdom.VirtualConsole(), errors = []; vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) errors.push(e.message); });
const dom = new jsdom.JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, ''), { url: 'http://localhost/app/#/practice', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window; w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} }); w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms)); for (let k = 0; k < 100 && !w.document.querySelector('#modeGrid'); k++) await tick(100);
ok(!errors.length, 'nạp mã + bundle frday/callfr không lỗi' + (errors.length ? ': ' + errors.join(' | ') : ''));
const { App, UI } = w, $ = x => w.document.querySelector(x), $$ = x => [...w.document.querySelectorAll(x)];
App.loadScript = async src => { w.eval(fs.readFileSync(path.join(WEB, src), 'utf8')); };
UI.tts = () => {}; w.localStorage.clear(); w.sessionStorage.clear();
ok(typeof App.frday === 'function' && typeof App.esday === 'function' && w.Target.homeOf('fr') === '#/practice/frd' && w.Target.table('fr').routes.vocab === '#/practice/fr' && w.Target.table('fr').ready === false, 'Target.fr: home #/practice/frd + routes (vẫn ready:false); App.frday/esday cùng engine');
await App.frday(); await tick(60);
ok($$('a.chip[href*="frd?d="]').length === P.days.length && $('a.btn.primary[href="#/practice/frd?d=1"]'), 'hub: mọi ngày có ô, nút Bắt đầu ngày 1');
const first = P.days.findIndex(d => d[1] > d[0]), d0 = P.days[first];
await App.frday(String(first + 1)); await tick(60);
ok($$('section.card').length === 2 + HP && $('#ds-w') && $('#ds-g') && (HP ? !!$('#ds-p') && !!$('a[href*="frp?tp="]') : !$('#ds-p') && !$('a[href*="frp?tp"]')) && $$('[data-sp]').length >= 2 && $(`a[href^="#/practice/fr?lv=A1&p=${d0[2]}"]`), `ngày ${first + 1} (ngày đầu có từ): từ mới + ngữ pháp (đúng điểm)${HP ? ' + phát âm (#/practice/frp)' : ', không có bước phát âm'}, có nút nghe`);
ok(/\bla maison\b/.test($('#ds-w').textContent), 'danh từ hiện kèm mạo từ theo giống (la maison)');
$('#dsMk').click(); await tick(20);
ok(JSON.parse(w.localStorage.getItem('lk.fr.day'))[String(first)] === 'w' && !w.localStorage.getItem('lk.es.day'), 'bấm "Đánh dấu xong" ghi bước w vào lk.fr.day (không đụng lk.es.day)');
{ const C = await w.Core.Cards.all(), fr = Object.values(C).filter(c => c.tl === 'fr');
  ok(fr.length === d0[1] - d0[0] && fr.every(c => C[w.Core.tlKey(c.word, 'fr')] === c && c.srs && c.gl && c.gl.en && c.topic === 'fr-core'), `"Đánh dấu xong" đưa ${d0[1] - d0[0]} từ của ngày vào Ôn tập (thẻ tl:fr, khóa fr:từ, có SRS + nghĩa)`); }
for (const [word, art] of [['eau', "l'eau"], ['homme', "l'homme"], ['haricot', 'le haricot'], ['ciel', 'le ciel'], ['maison', 'la maison']]) {
  const i = W.findIndex(x => x.word === word), n = P.days.findIndex(d => d[0] <= i && i < d[1]); await App.frday(String(n + 1)); await tick(40);
  ok($('#ds-w') && $('#ds-w').textContent.includes(art) && !$('#ds-w').textContent.includes(art.replace(/^le /, 'la ') + ' ' + 'zz'), `mạo từ "${art}" (elision trước nguyên âm/h câm; h aspiré giữ le)`);
}
await App.frday(String(first + 1)); await tick(40);
$('a[data-s="g"]').click(); App.esDayMark('c', 'fr');
ok(JSON.parse(w.localStorage.getItem('lk.fr.day'))[String(first)] === 'w', 'màn kết cuộc gọi không đánh dấu bước ngữ pháp');
App.esDayMark('gp', 'fr');
ok(JSON.parse(w.localStorage.getItem('lk.fr.day'))[String(first)] === 'wg' && !w.sessionStorage.getItem('lk.fr.dayctx') && /✓/.test($('#ds-w').textContent + w.document.body.textContent) , 'màn kết bài ngữ pháp đánh dấu g và xoá ngữ cảnh (lk.fr.dayctx)');
if (HP) { await App.frday(String(first + 1)); await tick(40); $('a[data-s="p"]').click(); App.esDayMark('gp', 'fr'); ok(/p/.test(JSON.parse(w.localStorage.getItem('lk.fr.day'))[String(first)]), 'màn kết bài phát âm đánh dấu bước p'); }
await App.frday(String(first + 1)); await tick(40);
ok($('#ds-fin') || /🎉/.test(App.view.textContent), `đủ bước (w + g${HP ? ' + p' : ', không có p'}) → "Xong ngày học"`);
await App.frday('5'); await tick(60);
const d5w = P.days[4][1] > P.days[4][0] ? 1 : 0; // kho lớn dần theo lô reviewed → ngày 5 có thể có hoặc không có từ mới
ok($('a[href="#/call/' + P.days[4][6] + '"]') && $$('section.card').length === 2 + d5w + HP, `ngày 5 (${d5w ? 'có' : 'không'} từ mới) có ngữ pháp + cuộc gọi ` + P.days[4][6]);
ok(w.CALLS.filter(c => c.tl === 'fr').length === 24 && w.CALLS.every(c => (c.tl === 'fr') === /^fr-/.test(c.id)), 'gói cl.js: 24 cuộc gọi gắn tl:fr, không lẫn es/tiếng Anh');
try { App.routes.call('fr-loisirs'); await tick(80); } catch (e) { errors.push('call: ' + e.message); }
ok(!errors.length && /Parlons de tes loisirs/.test(App.view.textContent) && !/IELTS|TOEIC/.test(App.view.textContent), 'mở #/call/fr-loisirs: cuộc gọi fr hiện đúng, không lẫn cuộc gọi tiếng Anh' + (errors.length ? ': ' + errors.join(' | ') : ''));
// engine: đệm/liên từ fr, nhánh không dấu
{ const E = w.CallEngine, f = E.fluency('Euh... je pense que, ben, c\'est parce que j\'aime ça', { min: 3 }, 6, 'fr'), c = w.CALLS.find(x => x.id === 'fr-loisirs');
  ok(f.fillers === 2 && f.link && f.words === 10, `engine: đệm "euh/ben" đếm riêng, liên từ "parce que" nhận ra (fillers ${f.fillers}, words ${f.words})`);
  const r = E.step(c, c.start, 'Je lis des livres'), r2 = E.step(c, c.start, "J'adore cuisiner"); ok(r && r.next === 'livre' && r.react && r2 && r2.next === 'frequence', 'engine: nhánh regex tiếng Pháp khớp (livre → livre, cuisin → frequence)'); }
if (fails) { console.error(`✗ ${fails} lỗi`); process.exit(1); }
console.log('✓ fr-path xong'); process.exit(0);
