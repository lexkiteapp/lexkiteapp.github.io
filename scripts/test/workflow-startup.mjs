// 20/11: Mobile QA kết thúc `startup_failure` trên PR (#1713) – GitHub không tạo job nên không có log/annotation. Test này bắt tĩnh các lỗi KHỞI ĐỘNG tất định
// (không có actionlint trong repo): thụt đầu dòng bằng tab, `${{` không đóng, `needs:` trỏ job không tồn tại, `uses: ./…` trỏ action/workflow thiếu, tệp không có `on:`/`jobs:`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..'), WF = path.join(root, '.github/workflows');
let bad = 0, n = 0; const fail = m => { bad++; console.log('✗ ' + m); };
export function check(file, text, exists = p => fs.existsSync(path.join(root, p))) {
  const out = [], L = text.split('\n'), jobs = new Set(); let inJobs = false;
  if (!/^on:|^'on':|^"on":|^true:/m.test(text)) out.push('thiếu khoá `on:`');
  if (!/^jobs:/m.test(text)) out.push('thiếu khoá `jobs:`');
  L.forEach((l, i) => {
    if (/^\t| \t/.test(l.match(/^\s*/)[0])) out.push(`dòng ${i + 1}: thụt đầu dòng bằng tab`);
    const open = (l.match(/\$\{\{/g) || []).length, close = (l.match(/\}\}/g) || []).length;
    if (!/^\s*#/.test(l) && open > close) out.push(`dòng ${i + 1}: \`\${{\` không đóng trên cùng dòng`);
    if (/^jobs:\s*$/.test(l)) inJobs = true; else if (/^\S/.test(l) && !/^\s*#/.test(l)) inJobs = false;
    const m = inJobs && l.match(/^  ([A-Za-z0-9_-]+):\s*(#.*)?$/); if (m) jobs.add(m[1]);
  });
  L.forEach((l, i) => {
    const nd = l.match(/^    needs:\s*(.*)$/); if (nd) for (const j of nd[1].replace(/[\[\]]/g, '').split(',').map(s => s.trim().replace(/\s*#.*$/, '')).filter(Boolean)) if (!/\$\{\{/.test(j) && !jobs.has(j)) out.push(`dòng ${i + 1}: needs: ${j} không phải job của tệp`);
    const u = l.match(/^\s*(?:-\s*)?uses:\s*(\.\/[^\s#'"]+)/); if (u && !/\$\{\{/.test(u[1])) { const p = u[1].replace(/^\.\//, ''); if (!(exists(p + '/action.yml') || exists(p + '/action.yaml') || exists(p))) out.push(`dòng ${i + 1}: uses ${u[1]} không tồn tại`); }
  });
  return out.map(m => `${file}: ${m}`);
}
// tự kiểm bộ bắt lỗi
const t = (name, text, want) => { const r = check('x.yml', text, () => false); if (!!r.length !== want) fail(`bộ bắt lỗi sai: ${name} → ${r.join('; ') || 'không báo'}`); n++; };
t('hợp lệ', 'on: push\njobs:\n  a:\n    runs-on: x\n  b:\n    needs: a\n    steps:\n      - run: echo ${{ github.sha }}\n', false);
t('needs thiếu', 'on: push\njobs:\n  b:\n    needs: ghost\n', true);
t('tab', 'on: push\njobs:\n\ta: {}\n', true);
t('${{ hở', 'on: push\njobs:\n  a:\n    if: ${{ github.x\n', true);
t('action thiếu', 'on: push\njobs:\n  a:\n    steps:\n      - uses: ./.github/actions/nope\n', true);
for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) { n++; for (const m of check(f, fs.readFileSync(path.join(WF, f), 'utf8'))) fail(m); }
if (bad) { console.log(`✗ workflow-startup: ${bad}/${n} lỗi`); process.exit(1); }
console.log(`✓ workflow-startup: ${n} kiểm tra (workflow không có lỗi khởi động tĩnh)`);
