// 21/11: stitch-diff trên push main bị huỷ mỗi lần gộp kế tiếp (concurrency cancel-in-progress: true) → shard chậm luôn 'cancelled', drift không ai thấy (ui-audit-all).
// Workflow trong MAIN_COMPLETE chạy sau gộp phải tới cùng: cancel-in-progress KHÔNG được vô điều kiện true (chỉ `github.event_name == 'pull_request'`), và bước cache trình duyệt phải `if: always()`.
// Thêm workflow vào danh sách khi nó cũng chạy trên push main và gác drift.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const WF = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.github/workflows');
export const MAIN_COMPLETE = ['stitch-diff.yml'];
export function problems(text) {
  const out = [], m = text.match(/^concurrency:\n(?:[ \t]+.*\n)+/m);
  if (!/^  push:/m.test(text)) out.push('không chạy trên push');
  if (!m) out.push('thiếu concurrency');
  else {
    const c = (m[0].match(/cancel-in-progress:\s*(.+)/) || [])[1] || '';
    if (/^true\b/.test(c.trim())) out.push('cancel-in-progress: true vô điều kiện → lượt main bị huỷ bởi lần gộp sau');
    else if (!/pull_request/.test(c)) out.push('cancel-in-progress phải chỉ bật cho pull_request');
  }
  return out;
}
let bad = 0; const fail = m => { bad++; console.log('✗ ' + m); };
const self = (name, text, want) => { if (!!problems(text).length !== want) fail('bộ bắt lỗi sai: ' + name); };
self('true', 'on:\n  push:\n    branches: [main]\nconcurrency:\n  group: g\n  cancel-in-progress: true\njobs: {}\n', true);
self('pr', "on:\n  push:\n    branches: [main]\nconcurrency:\n  group: g\n  cancel-in-progress: ${{ github.event_name == 'pull_request' }}\njobs: {}\n", false);
for (const f of MAIN_COMPLETE) {
  const t = fs.readFileSync(path.join(WF, f), 'utf8');
  for (const p of problems(t)) fail(`${f}: ${p}`);
  if (!/- uses: \.\/\.github\/actions\/playwright-cache\n\s+if: always\(\)/.test(t)) fail(`${f}: bước playwright-cache phải \`if: always()\` (bước trước đỏ không được làm mất cache)`);
}
if (bad) { console.log(`✗ main-no-cancel: ${bad} lỗi`); process.exit(1); }
console.log(`✓ main-no-cancel: ${MAIN_COMPLETE.length} workflow chạy tới cùng trên push main`);
