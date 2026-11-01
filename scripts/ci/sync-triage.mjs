// Đồng bộ danh sách `workflows:` của ci-triage.yml với .github/workflows (GitHub không cho danh sách động).
//   node scripts/ci/sync-triage.mjs          → ghi lại (thêm workflow mới ở cuối, bỏ tên không còn)
//   node scripts/ci/sync-triage.mjs --check  → thoát 1 + nói rõ phải làm gì nếu lệch (test ci-triage gọi hàm sync)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WF = path.join(ROOT, '.github/workflows'), TRI = path.join(WF, 'ci-triage.yml');
const nameOf = (f, s) => ((s.match(/^name:\s*(.+)$/m) || [])[1] || f).trim().replace(/^['"]|['"]$/g, '');

export function expected() {
  return fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f) && f !== 'ci-triage.yml')
    .map(f => nameOf(f, fs.readFileSync(path.join(WF, f), 'utf8')));
}
const RE = /(\n    workflows:\n)((?:      - '[^\n]*'[^\n]*\n)+)/;
export function sync(write = false) {
  const src = fs.readFileSync(TRI, 'utf8'), m = RE.exec(src);
  if (!m) throw new Error('ci-triage.yml: không tìm thấy khối "workflows:" dạng   - \'Tên\'');
  const cur = [...m[2].matchAll(/- '([^']*)'/g)].map(x => x[1]), want = expected(), set = new Set(want);
  const missing = want.filter(n => !cur.includes(n)), stale = cur.filter(n => !set.has(n));
  if (write && (missing.length || stale.length)) {
    const next = [...cur.filter(n => set.has(n)), ...missing];
    fs.writeFileSync(TRI, src.replace(RE, (_, a) => a + next.map(n => `      - '${n}'\n`).join('')));
  }
  return { missing, stale };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check'), { missing, stale } = sync(!check);
  if (check && (missing.length || stale.length)) {
    console.error(`✗ ci-triage.yml lệch .github/workflows – chạy: node scripts/ci/sync-triage.mjs\n  thiếu: ${missing.join(', ') || '-'}\n  thừa: ${stale.join(', ') || '-'}`);
    process.exit(1);
  }
  console.log(check ? '✓ ci-triage.yml khớp .github/workflows' : `✓ đã đồng bộ (thêm ${missing.length}, bỏ ${stale.length})`);
}
