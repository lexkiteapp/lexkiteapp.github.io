// Chống xung đột PR bằng định dạng ổn định (10/11 – #934 xung đột 3 lần/ngày, #971 #983 #741 #985 ≥ 1 lần: mọi PR sửa cùng MỘT dòng
// của nguồn dịch i18n/ui hoặc registry ROUTE_BUNDLE/BCSS/V2DATA/SCREENS/V2REF). docs/METHODS.md › Chống xung đột.
//  1) Kho hiện tại đúng định dạng (node scripts/fmt-stable.mjs --check).
//  2) Bộ quét registry: chú thích cuối dòng/dòng riêng/nhóm, template ${…}, chuỗi chứa dấu phẩy, mục cuối không phẩy, sắp xếp, trùng khóa.
//  3) Git thật (repo tạm, không mạng): hai nhánh cùng thêm một khóa dịch + một màn vào registry → git merge KHÔNG xung đột.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { drift } from '../fmt-stable.mjs';
import { formatRegistry, scanObject, keyOf } from '../lib/fmt-registry.mjs';
import { srcText } from '../lib/i18n-pack.mjs';

// 1)
const bad = drift();
assert.equal(bad.length, 0, `lệch định dạng chống xung đột: ${bad.slice(0, 5).map(b => b.file).join(', ')} – chạy node scripts/fmt-stable.mjs`);

// 2)
assert.equal(keyOf("'a-b': 1"), 'a-b'); assert.equal(keyOf('x: [1]'), 'x'); assert.equal(keyOf('...rest'), null);
const src = "x;\n  const R = { b: ['x,y', `t${[1, 2].join(',')}`], a: 'q', // nhóm a+b\n    // dẫn c\n    c: (1, 2), d: { e: 1 } // cuối\n  }, z = 1;\n";
const out = formatRegistry(src, { mark: 'const R = ' });
assert.equal(out, "x;\n  const R = {\n    a: 'q',\n    // nhóm a+b\n    b: ['x,y', `t${[1, 2].join(',')}`],\n    // dẫn c\n    c: (1, 2),\n    d: { e: 1 }, // cuối\n  }, z = 1;\n");
assert.equal(formatRegistry(out, { mark: 'const R = ' }), out, 'định dạng là bất động (chạy lần hai không đổi)');
assert.deepEqual(new Function(out.replace(/^x;/, '') + 'return R;')(), { a: 'q', b: ['x,y', 't1,2'], c: 2, d: { e: 1 } }, 'giá trị không đổi');
assert.equal(formatRegistry('const R = { b: 1, a: 2 };', { mark: 'const R = ', sort: false }), 'const R = {\n  b: 1,\n  a: 2,\n};', 'sort:false giữ thứ tự');
assert.throws(() => formatRegistry('const R = { a: 1, a: 2 };', { mark: 'const R = ' }), /trùng khóa/);
assert.throws(() => formatRegistry('const R = { ...o, a: 1 };', { mark: 'const R = ' }), /không khóa/);
assert.equal(scanObject('{}', 0).items.length, 0);

// 3) git thật
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'fmt-st-')), g = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const w = (f, s) => fs.writeFileSync(path.join(d, f), s), reg = o => formatRegistry(`const ROUTE_BUNDLE = { ${o} };\n`, { mark: 'const ROUTE_BUNDLE = ' });
try {
  g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  // Hai PR thêm mục ở hai CHỖ KHÁC NHAU của danh sách đã sắp (trường hợp thường gặp: kho dịch hàng nghìn khóa) → gộp sạch.
  // Hai PR chèn đúng CÙNG một khe (hai khóa liền nhau sau khi sắp) git vẫn báo xung đột – bot pr-unconflict gỡ phần đó (union + fmt-stable).
  const base = { 'Bài học': 'Lektion', 'Ôn tập': 'Wiederholen', 'Từ vựng': 'Wortschatz', 'Xong': 'Fertig' };
  w('de.js', srcText('de', '', base)); w('app.js', reg("home: 'ux1', lesson: 'lesson', vocab: 'words', watch: 'watch'"));
  g('add', '.'); g('commit', '-qm', 'base');
  g('checkout', '-qb', 'a'); w('de.js', srcText('de', '', { ...base, 'Âm': 'Ton', 'Học': 'Lernen' })); w('app.js', reg("home: 'ux1', lesson: 'lesson', vocab: 'words', watch: 'watch', call: 'call'")); g('commit', '-qam', 'a');
  g('checkout', '-q', 'main'); g('checkout', '-qb', 'b'); w('de.js', srcText('de', '', { ...base, 'Viết': 'Schreiben' })); w('app.js', reg("home: 'ux1', lesson: 'lesson', vocab: 'words', watch: 'watch', say: 'say'")); g('commit', '-qam', 'b');
  g('merge', '-q', '--no-edit', 'a'); // ném lỗi nếu xung đột
  const all = { ...base, 'Âm': 'Ton', 'Học': 'Lernen', 'Viết': 'Schreiben' };
  assert.equal(fs.readFileSync(path.join(d, 'de.js'), 'utf8'), srcText('de', '', all), 'bản gộp có khóa của cả hai nhánh, vẫn đúng định dạng');
  assert.equal(fs.readFileSync(path.join(d, 'app.js'), 'utf8'), reg("home: 'ux1', lesson: 'lesson', vocab: 'words', watch: 'watch', call: 'call', say: 'say'"), 'registry gộp sạch, vẫn đúng định dạng');
} finally { fs.rmSync(d, { recursive: true, force: true }); }

console.log('✓ fmt-stable: nguồn dịch + registry đúng định dạng chống xung đột; hai PR thêm mục gộp không xung đột');
