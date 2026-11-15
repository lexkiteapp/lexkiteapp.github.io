#!/usr/bin/env node
// Icon SVG (P0 15/11, js/ms-icons.js + js/ms-paths.js): (1) mọi icon mã nguồn gọi (ms('tên'), <span class="material-symbols-…">tên</span>) có đường vẽ đúng họ/kiểu trong ms-paths.js
// – thiếu → trên iPhone Safari là ô trống; (2) mọi tên trong web/fonts/msym.json có đường vẽ; (3) bộ chuyển đổi chạy đúng (giữ chữ, đổi textContent thì vẽ lại, kiểu đặc, tên lạ để nguyên).
// Dùng: node scripts/test/ms-icons.mjs        Sinh lại ms-paths.js: python3 scripts/build-ms-icons.py
import fs from 'fs'; import vm from 'vm'; import path from 'path'; import { JSDOM } from 'jsdom';
const rd = f => fs.readFileSync(f, 'utf8'), bad = [];
const ctx = { window: {} }; vm.runInNewContext(rd('web/js/ms-paths.js'), ctx); const P = ctx.window.MSP;
if (!P || !P.o || !P.r) { console.error('✗ ms-paths.js: thiếu bảng o/r'); process.exit(1); }
const walk = (d, o = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p, o) : /\.(js|html)$/.test(e.name) && o.push(p); } return o; };
const files = [...walk('web/js'), ...fs.readdirSync('web/app').filter(f => f.endsWith('.html')).map(f => 'web/app/' + f)].filter(f => !f.endsWith('ms-paths.js') && !f.includes('web/js/i18n/'));
const need = new Map(); const add = (fam, n, fill, f) => need.set(fam + (fill ? 'f' : '') + ':' + n, f);
for (const f of files) { const t = rd(f);
  for (const m of t.matchAll(/\bms\(\s*['"]([a-z_0-9]+)['"]([^)]*)\)/g)) { const a = m[2]; add('o', m[1], a.split(',').length > 2 && !/,\s*(false|0|null|'')\s*$/.test(a.trim()), f); }
  for (const m of t.matchAll(/class=\\?["']material-symbols-(rounded|outlined)([^"'>]*)\\?["'][^>]*>\s*([a-z_0-9]+)\s*</g)) add(m[1][0], m[3], /\bfill\b/.test(m[2]), f); }
for (const [k, f] of need) { const [fam, n] = k.split(':'); if (!(P[fam] && P[fam][n])) bad.push(`icon "${n}" (${fam}) gọi ở ${f} chưa có đường vẽ → chạy python3 scripts/build-ms-icons.py`); }
for (const n of JSON.parse(rd('web/fonts/msym.json'))) for (const fam of ['o', 'r']) if (!P[fam][n]) bad.push(`web/fonts/msym.json có "${n}" nhưng ms-paths.js thiếu họ ${fam}`);
for (const [fam, tb] of Object.entries(P)) for (const [n, d] of Object.entries(tb)) if (!/^M[\d\s.\-MLHVQCZ]+Z$/.test(d.trim())) bad.push(`đường vẽ ${fam}.${n} lạ`);
// hành vi bộ chuyển đổi
const dom = new JSDOM('<body><span id=a class="material-symbols-rounded">home</span><span id=b class="material-symbols-outlined fill">settings</span><span id=c class="material-symbols-rounded">khong_co_icon</span><div id=h></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window; w.MSP = P; w.eval(rd('web/js/ms-icons.js')); await new Promise(r => setTimeout(r, 30));
const $ = id => w.document.getElementById(id), svg = id => $(id).querySelector('svg.msv');
if (!svg('a') || $('a').getAttribute('data-ms') !== 'home' || $('a').firstChild.nodeValue !== 'home') bad.push('chuyển đổi: icon rỗng không thành SVG / mất chữ');
const fn = Object.keys(P.of)[0]; $('b').textContent = fn; await new Promise(r => setTimeout(r, 30));
if (!svg('b') || svg('b').innerHTML.indexOf(P.of[fn]) < 0) bad.push('chuyển đổi: .fill phải dùng đường vẽ đặc');
if (svg('c') || $('c').hasAttribute('data-ms')) bad.push('chuyển đổi: tên lạ phải để nguyên (dự phòng phông)');
$('a').textContent = 'login'; await new Promise(r => setTimeout(r, 30));
if (!svg('a') || $('a').getAttribute('data-ms') !== 'login' || $('a').querySelectorAll('svg').length !== 1) bad.push('chuyển đổi: đổi textContent không vẽ lại 1 SVG');
$('h').innerHTML = '<p><i class="material-symbols-outlined">search</i></p>'; await new Promise(r => setTimeout(r, 30));
if (!$('h').querySelector('svg.msv')) bad.push('chuyển đổi: icon thêm vào DOM sau không được vẽ');
if (bad.length) { console.error('✗ ms-icons:\n- ' + bad.join('\n- ')); process.exit(1); }
console.log(`✓ ms-icons: ${need.size} kiểu icon mã nguồn gọi đều có đường vẽ · chuyển đổi đúng`);
