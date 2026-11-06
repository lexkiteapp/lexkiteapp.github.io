// Chuỗi hướng dẫn đề Reading (≥ 40 byte) chỉ viết MỘT lần trong web/js/readtest/_i.js (g.RTI[n]); các đề tham chiếu. Chặn trùng tái phát
// (mỗi lần lặp 3–12 đề tốn byte người học – size-budget), chặn chỉ số hỏng, và khóa thứ tự nạp: _i.js phải đứng trước mọi đề.
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
const D = 'web/js/readtest', TOK = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const files = fs.readdirSync(D).filter(f => f.endsWith('.js') && f !== '_i.js').sort();
const c = { self: null }; c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(D, '_i.js'), 'utf8'), c);
const rti = c.RTI; ok(Array.isArray(rti) && rti.length > 0, '_i.js định nghĩa g.RTI');
ok(fs.readdirSync(D).filter(f => f.endsWith('.js')).sort()[0] === '_i.js', '_i.js đứng đầu khi sắp xếp (loader sort nạp trước)');
ok(new Set(rti).size === rti.length, 'RTI không có chuỗi lặp');
const seen = new Map(), used = new Set();
for (const f of files) {
  const s = fs.readFileSync(path.join(D, f), 'utf8');
  for (const m of s.match(TOK) || []) if (Buffer.byteLength(m) >= 40) seen.set(m, [...(seen.get(m) || []), f]);
  for (const m of s.matchAll(/g\.RTI\[(\d+)\]/g)) { const i = +m[1]; used.add(i); ok(i < rti.length, `${f}: g.RTI[${i}] không tồn tại`); }
}
for (const [k, v] of seen) ok(v.length < 2, `chuỗi dài lặp ${v.length} lần (${[...new Set(v)].join(', ')}): "${k.slice(0, 50)}…" → thêm vào _i.js, dùng g.RTI[n]`);
rti.forEach((s, i) => ok(used.has(i), `RTI[${i}] không đề nào dùng (thừa)`));
const app = fs.readFileSync('web/js/app.js', 'utf8');
ok(app.indexOf("'js/readtest/_i.js'") > 0 && app.indexOf("'js/readtest/_i.js'") < app.indexOf("'js/readtest/test1.js'"), 'app.js nạp _i.js trước test1.js');
for (const f of ['scripts/test/explain-check.mjs', 'scripts/gen-explain.mjs', 'scripts/gen-paraphrase.mjs']) ok(/readdirSync\([^;]*\)\.sort\(\)/.test(fs.readFileSync(f, 'utf8')), `${f}: đọc readtest theo thứ tự sort`);
console.log(fails ? `✗ readtest-dedupe: ${fails} lỗi` : `✓ readtest-dedupe: ${rti.length} chuỗi dùng chung, ${files.length} đề không lặp chuỗi dài`);
process.exit(fails ? 1 : 0);
