// Kiểm chú thích lỗi của run-suite: test đỏ phải in `::error file=…::<lệnh>: <lý do>` và ghi job summary, không chỉ "exit 1".
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { reasonOf, scriptOf, esc, annotate } from './run-suite.mjs';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) bad++; };
ok(scriptOf('node scripts/test/foo.mjs --x') === 'scripts/test/foo.mjs', 'scriptOf lấy file test');
ok(scriptOf('! grep -q a b') === 'package.json', 'scriptOf lệnh không có file → package.json');
ok(reasonOf('ok a\n✗ giá trị sai: 3 ≠ 4\nok b', 1) === '✗ giá trị sai: 3 ≠ 4', 'reasonOf chọn dòng lỗi');
ok(reasonOf('', 7) === 'thoát mã 7', 'reasonOf không output → mã thoát');
ok(reasonOf('\u001b[31mTypeError: x is undefined\u001b[0m\n  at y', 1).startsWith('TypeError'), 'reasonOf bỏ màu ANSI, tìm Error');
ok(esc('a\nb%') === 'a%0Ab%25', 'esc xuống dòng/%');
const sum = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'rs-')), 'sum.md');
process.env.GITHUB_STEP_SUMMARY = sum;
const errs = []; const orig = console.error; console.error = (...a) => errs.push(a.join(' '));
annotate('node scripts/test/foo.mjs', 'ok 1\n✗ thiếu khoá vi.title\n', 1); console.error = orig;
ok(/^::error file=scripts\/test\/foo\.mjs,title=[^:]*::node scripts\/test\/foo\.mjs: ✗ thiếu khoá vi\.title$/.test(errs[0] || ''), 'annotate in ::error có file + lý do');
ok(fs.existsSync(sum) && fs.readFileSync(sum, 'utf8').includes('thiếu khoá vi.title'), 'annotate ghi job summary');
// Chạy thật: run-suite với lệnh đỏ phải ra ::error có lý do (dùng suite tạm qua node -e nạp hàm, không đụng suite.txt)
const r = spawnSync('node', ['-e', "import('./scripts/test/run-suite.mjs').then(m=>{m.annotate('node scripts/test/bar.mjs','boom\\nAssertionError: nope',2)})"], { encoding: 'utf8', cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..') });
ok(/::error file=scripts\/test\/bar\.mjs.*AssertionError: nope/.test(r.stderr), 'chú thích ra stderr thật');
if (bad) { console.error(`✗ ${bad} lỗi`); process.exit(1); }
