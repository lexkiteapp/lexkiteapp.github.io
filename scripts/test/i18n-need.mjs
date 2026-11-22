#!/usr/bin/env node
// App.need không chờ cả i18nx + i18nl (9 tệp en/*.js) trước mọi trang nữa: bảng I18N_NEED (app.js) cho mỗi gói liệt kê tệp chuỗi nó dùng.
// Test dựng từ NGUỒN: mọi chuỗi gốc (khóa) của 9 tệp mà mã của gói nhắc tới (nháy đơn/kép/ngược) phải nằm trong tệp đã khai của gói (hoặc ở en.js nạp sẵn / tệp khai khác) – thiếu → UI tiếng Anh lộ chữ Việt.
// Gói ngoài bảng vẫn nạp đủ như cũ. Thêm chuỗi dùng ở gói trong bảng → khai thêm tệp vào I18N_NEED.
import fs from 'node:fs'; import vm from 'node:vm';
import { readBundles } from '../lib/bundles.mjs';
const rd = f => fs.readFileSync(f, 'utf8'), app = rd('web/js/app.js'), B = readBundles(), bad = [];
const m = app.match(/const I18N_NEED = \{([^}]*(?:\[[^\]]*\][^}]*)*)\}/);
if (!m) { console.error('✗ i18n-need: không thấy I18N_NEED trong app.js'); process.exit(1); }
const NEED = Object.fromEntries([...m[1].matchAll(/(\w+): \[([^\]]*)\]/g)].map(x => [x[1], [...x[2].matchAll(/'([\w-]+)'/g)].map(y => y[1])]));
const ALL = ['structs', 'toefl', 'league', 'call', 'handoff', 'verbs', 'exams', 'skills', 'lazyui'];
const dict = f => { const g = {}; g.I18N_DICT = {}; vm.runInNewContext(rd(f), { window: g, self: g, globalThis: g, g }); return Object.keys((g.I18N_DICT || {}).en || {}); };
const owner = new Map(); for (const f of ALL) for (const k of dict(`web/js/i18n/en/${f}.js`)) { if (k.length < 4) continue; (owner.get(k) || owner.set(k, new Set()).get(k)).add(f); }
let base = new Set(); try { base = new Set(dict('web/js/i18n/en.js')); } catch (e) { /* en.js không có: bỏ qua */ }
for (const f of ALL) if (!fs.existsSync(`web/js/i18n/en/${f}.js`)) bad.push(`thiếu tệp en/${f}.js`);
for (const [name, files] of Object.entries(NEED)) {
  if (!B[name]) { bad.push(`I18N_NEED.${name}: không có gói này trong bundles.js`); continue; }
  for (const x of files) if (!ALL.includes(x)) bad.push(`I18N_NEED.${name}: tệp lạ ${x}`);
  for (const f of B[name]) { if (/^js\/i18n\//.test(f) || !fs.existsSync('web/' + f)) continue; const t = rd('web/' + f);
    for (const [k, fs_] of owner) { if (base.has(k)) continue; if (!(t.includes(`'${k}'`) || t.includes(`"${k}"`) || t.includes('`' + k + '`'))) continue;
      if (![...fs_].some(x => files.includes(x))) bad.push(`gói ${name} (${f}) dùng chuỗi "${k.slice(0, 40)}" của en/${[...fs_].join('|')}.js – khai vào I18N_NEED.${name}`); } }
}
if (bad.length) { console.error('✗ i18n-need:\n- ' + [...new Set(bad)].slice(0, 25).join('\n- ')); process.exit(1); }
console.log(`✓ i18n-need: ${Object.keys(NEED).length} gói chỉ chờ tệp chuỗi nó dùng (${owner.size} chuỗi lười kiểm từ nguồn)`);
