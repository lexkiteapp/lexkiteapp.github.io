// Sinh lịch từ infra/jobs.json: sửa dòng cron trong .github/workflows/*.yml (--write) và dựng docs/JOBS.md.
// Dùng: node scripts/jobs/gen.mjs [--write]   (không --write: chỉ in chỗ lệch). Quy tắc kiểm: scripts/test/jobs-check.mjs.
import fs from 'fs';
import { REG, starts } from '../test/jobs-check.mjs';

const WRITE = process.argv.includes('--write');
let drift = 0;
for (const j of REG.jobs.filter(j => j.workflow)) {
  const f = '.github/workflows/' + j.workflow; if (!fs.existsSync(f)) { console.log('· chưa có workflow ' + f); continue; }
  let s = fs.readFileSync(f, 'utf8'), i = 0;
  const n = (s.match(/^\s*-\s*cron:\s*'[^']+'/gm) || []).length;
  if (n && n !== j.cron.length) { console.error(`✗ ${j.id}: workflow có ${n} cron, sổ ${j.cron.length} – sửa tay`); process.exitCode = 1; continue; }
  const t = s.replace(/^(\s*-\s*cron:\s*)'[^']+'/gm, (m, a) => `${a}'${j.cron[i++]}'`);
  if (t !== s) { drift++; console.log(`${WRITE ? '✎' : '≠'} ${j.id}: ${j.cron.join(' | ')}`); if (WRITE) fs.writeFileSync(f, t); }
}
// functions/api/_jobs_reg.js (Pages Functions không import JSON được ổn định → sinh module JS)
const regJs = `// SINH TỪ infra/jobs.json bởi scripts/jobs/gen.mjs — KHÔNG sửa tay\nexport const REG = ${JSON.stringify({ priorities: REG.priorities, resources: REG.resources, budget_caps: REG.budget_caps, reservations: REG.reservations || {}, jobs: REG.jobs }, null, 1)};\n`;
const oldJs = fs.existsSync('functions/api/_jobs_reg.js') ? fs.readFileSync('functions/api/_jobs_reg.js', 'utf8') : '';
if (oldJs !== regJs) { drift++; console.log(`${WRITE ? '✎' : '≠'} functions/api/_jobs_reg.js`); if (WRITE) fs.writeFileSync('functions/api/_jobs_reg.js', regJs); }
// docs/JOBS.md
const hh = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
const rows = REG.jobs.map(j => ({ j, t: Math.min(...j.cron.flatMap(starts).map(x => x % 1440)) })).sort((a, b) => a.t - b.t);
const LC = fs.existsSync('infra/lexicon-consumers.json') ? JSON.parse(fs.readFileSync('infra/lexicon-consumers.json', 'utf8')) : null;
const LEXG = LC ? `
## Đồ thị kho từ (sinh từ infra/lexicon-consumers.json – test scripts/test/lexicon-expand.mjs chặn việc hạ nguồn bỏ sót)
\`lexicon-expand\` 15:40 UTC → \`content/lexicon/expand/pending\` → soát mẫu ≥ 5 % (\`promote.mjs\`) → \`content/lexicon/expand/<lô>.json\` (nguồn duy nhất, 0 byte web/js) → mỗi push: npm test (dict-consistency, content-qa, lexicon-expand) → build-web (mảnh Lex, /words/ + sitemap + IndexNow) → các việc đêm đọc cùng nguồn:

| Việc hạ nguồn | Đọc qua | Việc/lịch |
|---|---|---|
${Object.entries(LC.consumers).map(([f, c]) => `| \`${f}\` – ${c.what || ''} | ${c.via ? '\`' + c.via + '\`' : 'bỏ qua: ' + c.skip} | ${c.job || '—'} |`).join('\n')}
${Object.entries(LC.todo || {}).map(([k, v]) => `| **CÒN THIẾU** ${k} | ${v} | — |`).join('\n')}
` : '';
const md = `# JOBS – sổ việc nền & điều phối (sinh từ infra/jobs.json — KHÔNG sửa tay)

> TL;DR: Sổ việc nền & điều phối, SINH TỰ ĐỘNG từ infra/jobs.json (không sửa tay): luật, tài nguyên, lịch UTC, đồ thị kho từ. Sinh lại: node scripts/jobs/gen.mjs --write; jobs-check chặn lệch.
> Đọc khi: thêm cron/CI nền.

Nguồn duy nhất: \`infra/jobs.json\`. Sinh lại: \`node scripts/jobs/gen.mjs --write\`. CI (\`npm test\` → \`scripts/test/jobs-check.mjs\`) chặn: lịch lệch workflow, trùng, việc dùng chung tài nguyên ĐỘC QUYỀN chồng giờ, việc nặng chung phút bắt đầu, việc có lease thiếu bước thuê.

## Luật
- **Ưu tiên**: ${REG.priorities.join(' > ')}. Hạn mức D1 hôm nay còn lại quyết định việc nào được khởi động: trần dùng ${Object.entries(REG.budget_caps).filter(([k]) => k[0] !== '_').map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(' · ')} (vượt → bỏ qua tới khung kế, ghi lý do).
- **Thuê (lease)**: việc nặng gọi \`node scripts/jobs/lease.mjs acquire <id>\` đầu job và \`release\` cuối job (\`if: always()\`). Máy chủ (\`functions/api/jobs.js\`, bảng \`job_leases\`/\`job_runs\` ở D1 nội bộ) cấp thuê toàn bộ tài nguyên độc quyền hoặc từ chối (đang có việc khác giữ → bỏ qua, không chạy song song). Thuê tự hết hạn (ttl = phút ước lượng × 1,5).
- **Ngân sách**: mỗi tài khoản D1 đo riêng (cầu dao \`_d1guard.js\`); việc nền dừng sạch khi vượt trần, không thử lại.
- **Xem**: Quản trị › Hạn mức › "Lịch việc nền" (dòng thời gian hôm nay: đã chạy / bỏ qua + lý do / dùng bao nhiêu).

## Tài nguyên
${Object.entries(REG.resources).map(([k, v]) => `- \`${k}\` — ${v.label}${v.exclusive ? ' (độc quyền)' : ''}`).join('\n')}

## Lịch (UTC, theo giờ trong ngày)
| Giờ UTC | Việc | Lịch cron | Ưu tiên | Tài nguyên | Phút | Ước lượng | Thuê |
|---|---|---|---|---|---|---|---|
${rows.map(({ j, t }) => `| ${hh(t)} | \`${j.id}\` | ${j.cron.map(c => '`' + c + '`').join('<br>')} | ${j.priority}${j.paused ? ' (tạm dừng)' : ''} | ${j.resources.join(', ')} | ${j.minutes} | ${Object.entries(j.est || {}).map(([k, v]) => k + '≈' + v).join(', ') || '—'} | ${j.lease ? '✓' : '—'} |`).join('\n')}

Sau mốc reset 00:00 UTC (hạn mức D1 miễn phí làm mới), thứ tự: việc nền "đăng bài" trước, rồi dựng, lưu trữ (footage-archive 01:45 → drive-shorts → d1b-migrate 05:30), báo cáo.
${LEXG}`;
const old = fs.existsSync('docs/JOBS.md') ? fs.readFileSync('docs/JOBS.md', 'utf8') : '';
if (old !== md) { drift++; console.log(`${WRITE ? '✎' : '≠'} docs/JOBS.md`); if (WRITE) fs.writeFileSync('docs/JOBS.md', md); }
if (!WRITE && drift) { console.error('✗ gen: sổ và workflow/docs lệch – chạy node scripts/jobs/gen.mjs --write'); process.exitCode = 1; } else console.log('✓ gen: ' + (WRITE ? 'đã ghi' : 'khớp'));
