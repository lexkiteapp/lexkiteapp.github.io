// Gác paths của native-ios.yml (14/11): job macOS (5 máy song song, nút nghẽn CI) KHÔNG chạy theo mọi scripts/native/** nhưng
// (1) mọi file scripts/native/* mà job iOS gọi phải nằm trong paths (pull_request + push);
// (2) bộ sinh còn lại được gác lệch bởi `gen.mjs --check` của native-android.yml, workflow đó phải theo scripts/native/**.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const ios = fs.readFileSync('.github/workflows/native-ios.yml', 'utf8'), and = fs.readFileSync('.github/workflows/native-android.yml', 'utf8');
const glob = g => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\0').replace(/\*/g, '[^/]*').replace(/\0/g, '.*') + '$');
const pathsOf = (y, ev) => { const m = new RegExp(`\\n  ${ev}:\\n(?:    [^\\n]*\\n)*?    paths: \\[([^\\]]*)\\]`).exec(y); assert.ok(m, `thiếu paths ${ev}`); return m[1].split(',').map(s => s.trim().replace(/^'|'$/g, '')); };
const body = ios.slice(ios.indexOf('\njobs:'));
const used = [...new Set([...body.matchAll(/scripts\/native\/[\w.-]+/g)].map(m => m[0]))];
assert.ok(used.length >= 3, 'không tìm thấy script iOS nào – mẫu dò hỏng');
for (const ev of ['pull_request', 'push']) {
  const ps = pathsOf(ios, ev).map(glob);
  for (const f of used) assert.ok(fs.existsSync(f), `${f} không tồn tại`), assert.ok(ps.some(r => r.test(f)), `native-ios ${ev}: paths thiếu ${f} (job macOS dùng file này)`);
  for (const f of ['native/ios/x', 'native/shared/gen/x.json', '.github/workflows/native-ios.yml']) assert.ok(ps.some(r => r.test(f)), `native-ios ${ev}: paths thiếu ${f}`);
  assert.ok(pathsOf(and, ev).includes('scripts/native/**'), `native-android ${ev}: phải theo scripts/native/** (gác lệch file sinh thay iOS)`);
}
assert.match(and, /node scripts\/native\/gen\.mjs --check/, 'native-android phải chạy gen.mjs --check');
console.log(`✓ native-ios-paths: ${used.length} script iOS trong paths, bộ sinh gác bởi native-android`);
