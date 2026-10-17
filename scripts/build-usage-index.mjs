// 📘 Sinh chỉ mục "Cách dùng từ" (web/js/usage-index.js) từ dữ liệu web/js/usage/*.js:
//   w: từ → các nhóm có dữ liệu (p giới từ · v mẫu động từ · a trạng từ · s cấu trúc · c dễ nhầm)  ·  id: mã cấu trúc/cặp → nhóm
// Chỉ mục nhỏ (vài KB) được tải ở #/dict, #/verb, #/fix để biết từ nào có trang "Cách dùng" mà không phải tải cả dữ liệu.
// Dùng: node scripts/build-usage-index.mjs [--check]   (--check: báo lỗi nếu file đang có khác bản sinh mới – chạy trong scripts/test/usage.mjs)
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { self: {} }; ctx.self = ctx; vm.createContext(ctx);
const run = f => vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
run('web/js/usage-core.js');
const FILES = fs.readdirSync('web/js/usage').filter(f => f.endsWith('.js')).sort();
FILES.forEach(f => run('web/js/usage/' + f));
const U = ctx.LK_USAGE, w = {}, id = {};
for (const k of U.KINDS) for (const e of U.load(k)) {
  for (const x of U.words(e)) if (!(w[x] || '').includes(k)) w[x] = (w[x] || '') + k;
  if (k === 's' || k === 'c') id[e.key] = k;
}
// Tên bài ngữ pháp được dẫn tới (id → [tên Việt, tên Anh]) – để nút "📐 …" có tên bài mà không phải tải cả gói ngữ pháp
globalThis.t = x => x;
const GR = {}; for (const f of fs.readdirSync('web/js/grammar')) if (f.endsWith('.js')) { try { new Function('self', fs.readFileSync('web/js/grammar/' + f, 'utf8'))(GR); } catch (e) { /* bỏ qua */ } }
const TITLES = Object.fromEntries((GR.GRAMMAR || []).map(x => [x.id, [x.title, x.en]]));
const l = {}, missing = [];
for (const k of U.KINDS) for (const e of U.load(k)) for (const id of e.lessons) { if (TITLES[id]) l[id] = TITLES[id]; else missing.push(`${k}:${e.key} → ${id}`); }
if (missing.length) { console.error('✗ bài ngữ pháp không tồn tại: ' + missing.join(', ')); process.exit(1); }
const sort = o => Object.fromEntries(Object.keys(o).sort().map(k => [k, [...o[k]].sort((a, b) => U.KINDS.indexOf(a) - U.KINDS.indexOf(b)).join('')]));
const body = `/* 📘 Chỉ mục "Cách dùng từ" – FILE SINH TỰ ĐỘNG bằng scripts/build-usage-index.mjs từ web/js/usage/*.js. Đừng sửa tay. */\n(function (g) { g.LK_USAGE_IDX = ${JSON.stringify({ w: sort(w), id: sort(id), l: Object.fromEntries(Object.keys(l).sort().map(k => [k, l[k]])) })}; })(typeof self !== 'undefined' ? self : this);\n`;
const OUT = 'web/js/usage-index.js';
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== body) { console.error('✗ usage-index.js chưa cập nhật – chạy: node scripts/build-usage-index.mjs'); process.exit(1); }
  console.log('✓ usage-index.js khớp dữ liệu'); process.exit(0);
}
fs.writeFileSync(OUT, body);
console.log(`✓ ${OUT}: ${Object.keys(w).length} từ, ${Object.keys(id).length} mã cấu trúc/cặp (${(body.length / 1024).toFixed(1)} KB)`);
