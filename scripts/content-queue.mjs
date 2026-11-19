// Hàng đợi viết nội dung: so số thật (content-check --json → reports/content-stats.json) với chỉ tiêu (content/pipeline/targets.json)
// → content/pipeline/QUEUE.md: loại nào thiếu nhiều nhất & ưu tiên cao nhất lên đầu, chia lô sẵn. Quy trình: docs/CONTENT-PIPELINE.md
// Dùng: node scripts/content-queue.mjs   (npm run content:queue)
import fs from 'fs';
import { execFileSync } from 'child_process';
execFileSync('node', ['scripts/test/content-check.mjs', '--json'], { stdio: 'ignore' });
const S = JSON.parse(fs.readFileSync('reports/content-stats.json', 'utf8')), T = JSON.parse(fs.readFileSync('content/pipeline/targets.json', 'utf8'));
const sum = o => Object.entries(o || {}).filter(([k]) => k !== '—').reduce((a, [, v]) => a + (+v || 0), 0);
const rows = Object.entries(T).filter(([k]) => !k.startsWith('_')).map(([k, t]) => { const have = S[k] ? sum(S[k]) : +t.have || 0; /* loại chưa có trong content-check: số đếm tay ở targets.json (have) */ const gap = Math.max(0, t.target - have); return { k, ...t, have, gap, pct: Math.round(have / t.target * 100), parts: S[k] || {} }; });
rows.sort((a, b) => a.priority - b.priority || a.pct - b.pct);
const open = rows.filter(r => r.gap > 0);
const md = [`# Hàng đợi nội dung (tự sinh – \`npm run content:queue\`, ${new Date().toISOString().slice(0, 10)})`, '', 'Quy trình & tiêu chí nghiệm thu: `docs/CONTENT-PIPELINE.md`. Lấy lô ĐẦU TIÊN chưa có người nhận.', '',
  '| # | Loại | Có / chỉ tiêu | % | Lô tiếp theo | Trọng tâm | File | Chi tiết hiện có |', '|---|---|---|---|---|---|---|---|',
  ...open.map((r, i) => `| ${i + 1} | ${r.k} | ${r.have} / ${r.target} ${r.unit} | ${r.pct}% | ${Math.min(r.batch, r.gap)} ${r.unit} | ${r.focus || '—'} | \`${r.file}\` | ${Object.entries(r.parts).map(([a, b]) => `${a}: ${b}`).join(', ')} |`),
  '', rows.filter(r => !r.gap).length ? `Đã đạt chỉ tiêu: ${rows.filter(r => !r.gap).map(r => r.k).join(', ')}` : ''].join('\n');
fs.mkdirSync('content/pipeline', { recursive: true });
fs.writeFileSync('content/pipeline/QUEUE.md', md + '\n');
console.log(`✓ content-queue: ${open.length} loại còn thiếu – đầu hàng: ${open[0] ? `${open[0].k} (${open[0].have}/${open[0].target})` : 'không'}`);
