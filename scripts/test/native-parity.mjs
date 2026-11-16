// Native parity gate (docs/specs/native-apps.md §2): mọi route web trong docs/codemap.json phải nằm ở đúng MỘT mục của native/shared/parity.json,
// mỗi mục có mốc M1..Mn; mục "done" phải có test ParityP##/parity_P## ở CẢ Swift lẫn Kotlin. Thêm tính năng web mới mà quên native → đỏ.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = JSON.parse(fs.readFileSync(path.join(ROOT, 'native/shared/parity.json'), 'utf8')).items;
const routes = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/codemap.json'), 'utf8')).routes);
const errs = [], seen = new Map(), ids = new Set();
for (const it of P) {
  if (ids.has(it.id)) errs.push(`trùng id ${it.id}`); ids.add(it.id);
  if (!(it.m >= 1)) errs.push(`${it.id}: thiếu mốc m`);
  for (const r of it.routes) { if (seen.has(r)) errs.push(`${r} ở cả ${seen.get(r)} và ${it.id}`); seen.set(r, it.id); }
}
for (const r of routes) if (!seen.has(r)) errs.push(`route web ${r} chưa có mục parity native (native/shared/parity.json)`);
const src = dir => { const acc = []; const w = d => fs.existsSync(d) && fs.readdirSync(d, { withFileTypes: true }).forEach(e => e.isDirectory() ? (!['build', '.gradle'].includes(e.name) && w(path.join(d, e.name))) : /\.(swift|kt)$/.test(e.name) && acc.push(fs.readFileSync(path.join(d, e.name), 'utf8'))); w(dir); return acc.join('\n'); };
const ios = src(path.join(ROOT, 'native/ios')), and = src(path.join(ROOT, 'native/android'));
for (const it of P.filter(x => x.status === 'done')) {
  if (!new RegExp(`func testParity${it.id}\\b`).test(ios)) errs.push(`${it.id} done nhưng thiếu testParity${it.id} (Swift)`);
  if (!new RegExp(`fun parity_${it.id}\\b`).test(and)) errs.push(`${it.id} done nhưng thiếu parity_${it.id} (Kotlin)`);
}
if (errs.length) { console.log(errs.join('\n')); console.log(`✗ native-parity: ${errs.length} lỗi`); process.exit(1); }
const done = P.filter(x => x.status === 'done').length;
console.log(`✓ native-parity: ${routes.length} route web → ${P.length} mục; xong ${done}/${P.length}`);
