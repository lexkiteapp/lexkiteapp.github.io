// Dấu xung đột gộp (`<<<<<<< `, `>>>>>>> ` đầu dòng) bị commit lẫn vào nhánh (25/11: #1907 #1909 ja-kana.mjs, #1893 docs/INDEX.md) chỉ lộ sau ~100 job CI.
// Kiểm ở làn nhanh nhất (npm test fast, vài giây, git grep trên mọi tệp văn bản đã commit) + prepush: đỏ ngay. Chỉ nhận dòng BẮT ĐẦU bằng 7 ký tự + khoảng trắng/hết dòng
// (chuỗi trong mã như '<<<<<<< HEAD' không bắt đầu dòng nên không dính; `=======` một mình không tính – tiêu đề markdown dùng nó).
// Chạy: node scripts/test/no-conflict-markers.mjs [--self]   (--self: chỉ chạy kiểm nội bộ trên dữ liệu mẫu)
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';

export const MARK = /^(<<<<<<<|>>>>>>>)( .*)?$/;
/** Hàm thuần: nội dung → danh sách { line, text } của dòng dấu xung đột. */
export const markersIn = text => String(text).split('\n').flatMap((l, i) => MARK.test(l.replace(/\r$/, '')) ? [{ line: i + 1, text: l.slice(0, 60) }] : []);
/** git grep (bỏ nhị phân, mọi tệp đã commit/staged) → [{ file, line, text }]. */
export function scan(cwd = process.cwd()) {
  let out = '';
  try { out = execFileSync('git', ['grep', '-IncE', '^(<<<<<<<|>>>>>>>)( |\r?$)', '--', '.'], { cwd, encoding: 'utf8', maxBuffer: 1 << 26 }); } catch (e) { if (e.status !== 1) throw e; return []; }
  const files = out.split('\n').filter(l => /:[1-9]\d*$/.test(l)).map(l => l.replace(/:\d+$/, ''));
  return files.flatMap(f => markersIn(fs.readFileSync(path.join(cwd, f), 'utf8')).map(m => ({ file: f, ...m })));
}

// --- kiểm nội bộ (luôn chạy): dữ liệu mẫu + repo tạm thật
assert.equal(markersIn('a\n<<<<<<< HEAD\nx\n=======\ny\n>>>>>>> main\n').length, 2, 'bắt <<<<<<< và >>>>>>> đầu dòng');
assert.equal(markersIn('Tiêu đề\n=======\nnội dung').length, 0, '`=======` một mình (tiêu đề markdown) không tính');
assert.equal(markersIn("const m = '<<<<<<< HEAD';\nx.startsWith('>>>>>>> ')").length, 0, 'chuỗi trong mã không bắt đầu dòng → không tính');
assert.equal(markersIn('<<<<<<<\r\n').length, 1, 'CRLF vẫn bắt');
assert.equal(markersIn('<<<<<<<<< 9 dấu\n').length, 0, 'không nhầm chuỗi dài hơn 7 ký tự');
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ncm-')), g = (...a) => execFileSync('git', a, { cwd: tmp, encoding: 'utf8' });
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('config', 'commit.gpgsign', 'false');
  fs.writeFileSync(path.join(tmp, 'ok.mjs'), "export const a = 1;\n"); fs.writeFileSync(path.join(tmp, 'bad.mjs'), "export const a = 1;\n<<<<<<< HEAD\nconst b = 2;\n=======\nconst b = 3;\n>>>>>>> main\n");
  fs.writeFileSync(path.join(tmp, 'doc.md'), "Tiêu đề\n=======\n"); fs.writeFileSync(path.join(tmp, 'bin.dat'), Buffer.from([0, 1, 2, 0x3c, 0x3c]));
  g('add', '-A'); g('commit', '-qm', 'x');
  const r = scan(tmp); assert.deepEqual(r.map(x => `${x.file}:${x.line}`), ['bad.mjs:2', 'bad.mjs:6'], 'repo tạm: chỉ bad.mjs, đúng dòng, không dính markdown/nhị phân: ' + JSON.stringify(r));
  fs.writeFileSync(path.join(tmp, 'bad.mjs'), "export const a = 1;\n"); g('add', '-A'); assert.deepEqual(scan(tmp), [], 'sửa xong → sạch');
}
if (process.argv.includes('--self')) { console.log('✓ no-conflict-markers: kiểm nội bộ đạt'); process.exit(0); }
const hits = scan();
if (hits.length) {
  for (const h of hits.slice(0, 20)) console.error(`::error file=${h.file},line=${h.line},title=dấu xung đột gộp::${h.file}:${h.line}: "${h.text}" – gỡ xung đột (node scripts/ci/regen-conflicts.mjs hoặc sửa tay) rồi commit`);
  console.error(`✗ no-conflict-markers: ${hits.length} dòng dấu xung đột trong ${new Set(hits.map(h => h.file)).size} tệp (${[...new Set(hits.map(h => h.file))].slice(0, 5).join(', ')})`);
  process.exit(1);
}
console.log('✓ no-conflict-markers: không tệp văn bản nào còn dấu xung đột gộp');
