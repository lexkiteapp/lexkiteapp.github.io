// `npm test`: chạy lần lượt từng lệnh trong scripts/test/suite.txt (mỗi dòng một lệnh, qua sh), dừng ở lệnh đỏ đầu tiên – y như chuỗi `a && b && …` cũ.
// Danh sách nằm ở file riêng (merge=union trong .gitattributes) để hai PR cùng thêm test không xung đột ở một dòng package.json dài.
// Tùy chọn: --list in danh sách rồi thoát; --from=N bắt đầu từ lệnh thứ N (chạy lại sau lỗi, chỉ dùng cục bộ).
import fs from 'node:fs'; import path from 'node:path'; import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SUITE = path.join(ROOT, 'scripts/test/suite.txt');
export const readSuite = (file = SUITE) => fs.readFileSync(file, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmds = readSuite(), arg = k => (process.argv.find(a => a.startsWith(`--${k}=`)) || '').split('=')[1];
  if (process.argv.includes('--list')) { cmds.forEach((c, i) => console.log(`${i + 1}\t${c}`)); process.exit(0); }
  const from = Math.max(1, Number(arg('from')) || 1), t0 = Date.now(), times = [];
  for (let i = from - 1; i < cmds.length; i++) {
    const c = cmds[i], t = Date.now();
    console.log(`\n▶ [${i + 1}/${cmds.length}] ${c}`);
    const r = spawnSync(c, { cwd: ROOT, shell: '/bin/sh', stdio: 'inherit', env: process.env });
    const s = (Date.now() - t) / 1000; times.push([s, c]);
    if (r.status !== 0) {
      console.error(`\n✗ [${i + 1}/${cmds.length}] ${c} – đỏ (mã ${r.status ?? r.signal}) sau ${s.toFixed(1)}s. Chạy lại từ đây: node scripts/test/run-suite.mjs --from=${i + 1}`);
      process.exit(r.status || 1);
    }
    console.log(`✓ [${i + 1}/${cmds.length}] ${c} (${s.toFixed(1)}s)`);
  }
  const slow = times.sort((a, b) => b[0] - a[0]).slice(0, 10).map(([s, c]) => `  ${s.toFixed(1)}s  ${c}`).join('\n');
  console.log(`\n✓ npm test: ${times.length} lệnh xanh trong ${((Date.now() - t0) / 1000).toFixed(1)}s. Chậm nhất:\n${slow}`);
}
