// Chuỗi hướng dẫn đề Reading (≥ 40 byte) chỉ viết MỘT lần trong web/js/readtest/_i.js (g.RTI[n]); các đề tham chiếu. Chặn trùng tái phát
// (mỗi lần lặp 3–12 đề tốn byte người học – size-budget), chặn chỉ số hỏng, và khóa thứ tự nạp: _i.js phải đứng trước mọi đề.
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { dataFiles } from '../lib/scan-roots.mjs';
const D = 'web/js/readtest', TOK = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g;
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
// đề có thể nằm ở web/js/readtest hoặc gói tải lười web/cpack/readtest (gt3.js)
const D2 = 'web/cpack/readtest', files = [D, D2].flatMap(d => fs.existsSync(d) ? fs.readdirSync(d).filter(f => f.endsWith('.js') && f !== '_i.js').map(f => path.join(d, f)) : []).sort((a, b) => path.basename(a) < path.basename(b) ? -1 : 1);
const c = { self: null }; c.self = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(D, '_i.js'), 'utf8'), c);
const rti = c.RTI; ok(Array.isArray(rti) && rti.length > 0, '_i.js định nghĩa g.RTI');
ok(fs.readdirSync(D).filter(f => f.endsWith('.js')).sort()[0] === '_i.js', '_i.js đứng đầu khi sắp xếp (loader sort nạp trước)');
ok(new Set(rti).size === rti.length, 'RTI không có chuỗi lặp');
const seen = new Map(), used = new Set();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.match(TOK) || []) if (Buffer.byteLength(m) >= 40) seen.set(m, [...(seen.get(m) || []), path.basename(f)]);
  for (const m of s.matchAll(/g\.RTI\[(\d+)\]/g)) { const i = +m[1]; used.add(i); ok(i < rti.length, `${f}: g.RTI[${i}] không tồn tại`); }
}
for (const [k, v] of seen) ok(v.length < 2, `chuỗi dài lặp ${v.length} lần (${[...new Set(v)].join(', ')}): "${k.slice(0, 50)}…" → thêm vào _i.js, dùng g.RTI[n]`);
rti.forEach((s, i) => ok(used.has(i), `RTI[${i}] không đề nào dùng (thừa)`));
const app = fs.readFileSync('web/js/app.js', 'utf8');
ok(app.indexOf("'js/readtest/_i.js'") > 0 && app.indexOf("'js/readtest/_i.js'") < app.indexOf("'js/readtest/test1.js'"), 'app.js nạp _i.js trước test1.js');
for (const f of ['scripts/test/explain-check.mjs', 'scripts/gen-explain.mjs', 'scripts/gen-paraphrase.mjs']) ok(/readdirSync\([^;]*\)\.sort\(\)/.test(fs.readFileSync(f, 'utf8')), `${f}: đọc readtest theo thứ tự sort`);
// gt3.js (GT3–GT5) đã dời sang web/cpack: phải còn trong gói 'mock' của app.js (tải lười thật) và vẫn định nghĩa đủ 3 đề GT
ok(fs.existsSync(D2 + '/gt3.js') && !fs.existsSync(D + '/gt3.js'), 'gt3.js nằm ở web/cpack/readtest, không còn ở web/js');
ok(app.includes("'cpack/readtest/gt3.js'") && !app.includes("'js/readtest/gt3.js'"), "gói mock của app.js nạp 'cpack/readtest/gt3.js'");
{ const cg = { self: null }; cg.self = cg; vm.createContext(cg); vm.runInContext(fs.readFileSync(path.join(D, '_i.js'), 'utf8'), cg); vm.runInContext(fs.readFileSync(D2 + '/gt3.js', 'utf8'), cg); const ids = (cg.READTESTS || []).map(t => t.id); ok(['gt3', 'gt4', 'gt5'].every(i => ids.includes(i)), `gt3.js định nghĩa đề gt3/gt4/gt5 (có: ${ids.join(',')})`); }
// Họ đề khác (chỉ gom chuỗi mà gom thật sự tiết kiệm byte, tức đủ lặp để bù mục trong bảng): bảng chuỗi dài dùng chung g.<tên> định nghĩa ở đầu tệp đầu tiên (đã sort), các tệp sau tham chiếu – cùng luật chống trùng.
for (const { sub, re, name, first } of [{ sub: 'toeic', re: /^listening\d+\.js$/, name: 'TQL', first: 'listening1.js' }, { sub: 'toeic', re: /^reading\d+\.js$/, name: 'TQR', first: 'reading1.js' }, { sub: 'listen', re: /^test\d+\.js$/, name: 'LTI', first: 'test1.js' }]) {
  // đề có thể nằm ở web/js/<sub> hoặc gói tải lười web/cpack/<sub> (scripts/lib/scan-roots.mjs)
  const dir = sub, paths = dataFiles(sub, re), lf = paths.map(p => path.basename(p)), at = new Map(lf.map((f, i) => [f, paths[i]])), seenL = new Map(), usedL = new Set(); let ref = 0;
  ok(lf[0] === first, `${dir}: ${first} sắp xếp đầu (định nghĩa g.${name})`);
  const c1 = { self: null }; c1.self = c1; vm.createContext(c1); vm.runInContext(fs.readFileSync(at.get(lf[0]), 'utf8'), c1);
  const q = c1[name]; ok(Array.isArray(q) && q.length > 0 && new Set(q).size === q.length, `${first} định nghĩa g.${name} không lặp`);
  const pool = new RegExp(`g\\.${name} = \\[\\n[\\s\\S]*?\\n\\];\\n`), refs = new RegExp(`g\\.${name}\\[(\\d+)\\]`, 'g');
  for (const f of lf) {
    const s = fs.readFileSync(at.get(f), 'utf8').replace(f === first ? pool : /$^/, '');
    for (const m of s.match(TOK) || []) if (Buffer.byteLength(m) >= 40) seenL.set(m, [...(seenL.get(m) || []), f]);
    for (const m of s.matchAll(refs)) { ref++; usedL.add(+m[1]); ok(+m[1] < (q || []).length, `${f}: g.${name}[${m[1]}] không tồn tại`); }
  }
  for (const [k, v] of seenL) ok((Buffer.byteLength(k) - 12) * (v.length - 1) <= Buffer.byteLength(k) + 3, `${dir}: chuỗi dài lặp ${v.length} lần: "${k.slice(0, 50)}…" → thêm vào g.${name} (${first})`);
  (q || []).forEach((s, i) => ok(usedL.has(i), `${name}[${i}] không đề nào dùng (thừa)`));
  console.log(`  ${dir} ${name}: ${(q || []).length} chuỗi dùng chung, ${ref} tham chiếu`);
}
for (const f of ['scripts/sentence-audio/corpus.mjs', 'scripts/test/next-step.mjs']) ok(/\.test\(f\)\)\.sort\(\)|dataFiles\('listen'/.test(fs.readFileSync(f, 'utf8')), `${f}: đọc listening/listen theo sort (hoặc dataFiles – đã sort theo số)`);
console.log(fails ? `✗ readtest-dedupe: ${fails} lỗi` : `✓ readtest-dedupe: ${rti.length} chuỗi dùng chung, ${files.length} đề không lặp chuỗi dài`);
process.exit(fails ? 1 : 0);
