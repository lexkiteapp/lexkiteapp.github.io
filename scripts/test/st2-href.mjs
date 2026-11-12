// 🖱 Nút Stitch <button data-href> phải điều hướng cả ở cột phải (#ux1Rail nằm ngoài #view). 4/11: nút Thi thử ở cột phải bấm không được.
import fs from 'node:fs';
let fails = 0; const ok = (c, m) => { if (c) return console.log('✓ ' + m); fails++; console.error('✗ ' + m); };
const rt = fs.readFileSync('web/js/st/v2/runtime.js', 'utf8'), ux = fs.readFileSync('web/js/ux1.js', 'utf8'), rail = fs.readFileSync('web/js/st/v2/today-rail.js', 'utf8');
ok(/document\.addEventListener\('click', e => \{ const b = e\.target\.closest && e\.target\.closest\('[^']*\.v2s-today-rail \[data-href\]/.test(rt), 'bắt click trên document, gồm cột phải');
ok(!/view\.addEventListener\('click', e => \{ const b = e\.target\.closest && e\.target\.closest\('\.v2 \[data-href\]/.test(rt), 'không còn gắn riêng #view');
ok(/shell\.appendChild\(r\)/.test(ux) && /v2s-today-rail/.test(ux), 'cột phải dựng trong .v2s-today-rail');
ok(/<button[^>]*data-href="\$\{e\(d\.x\.href\)\}"/.test(rail), 'nút Thi thử cột phải dùng data-href');
if (fails) process.exit(1); console.log('✓ st2-href');
