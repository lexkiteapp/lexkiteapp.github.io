// 🗺️ Hồi quy codemap (sự cố 2/11: CODEMAP 25438 B > 25000 làm đỏ workflow codemap trên main).
//   1) Generator chạy xanh trên repo thật và CODEMAP.md ≤ CAP − SLACK (còn chỗ dư, KHÔNG nới trần).
//   2) Không cắt mục: đủ các mục ##, mọi workflow / route / test đều có tên trong bản đồ, mục Mô-đun không rỗng.
//   3) Không trùng: god node không lặp lại trong mục Mô-đun; mỗi bộ trigger workflow chỉ in 1 lần.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { spawnSync } from 'node:child_process'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'codemap-'));
const r = spawnSync(process.execPath, ['scripts/codemap.mjs', '--out=' + dir], { cwd: ROOT, encoding: 'utf8' });
const errs = [];
if (r.status !== 0) { console.error(r.stdout + r.stderr); console.error('✗ codemap-budget: generator đỏ'); process.exit(1); }
const src = fs.readFileSync(path.join(ROOT, 'scripts/codemap.mjs'), 'utf8');
const CAP = +src.match(/const CAP = (\d+)/)[1], SLACK = +src.match(/const SLACK = (\d+)/)[1];
if (CAP !== 25000) errs.push(`CAP đổi thành ${CAP} – không được nới trần 25000`);
const md = fs.readFileSync(path.join(dir, 'CODEMAP.md'), 'utf8'), g = JSON.parse(fs.readFileSync(path.join(dir, 'codemap.json'), 'utf8'));
const bytes = Buffer.byteLength(md);
if (bytes > CAP - SLACK) errs.push(`CODEMAP.md ${bytes} B > ${CAP - SLACK} (CAP − SLACK)`);
for (const h of ['## Khu vực', '## Sửa ở đâu', '## God nodes', '## Routes', '## Workflows', '## Test', '## Mô-đun JS chính'])
  if (!md.includes(h)) errs.push(`thiếu mục "${h}"`);
const has = name => new RegExp('(^|[\\s`(\\[,·])' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?=[\\s:`),·]|$)', 'm').test(md);
for (const w of g.workflows) { const n = w.file.replace(/\.ya?ml$/, ''); if (!has(n)) errs.push(`workflow ${n} không có trong bản đồ`); }
for (const t of g.tests) if (!has(t.test)) errs.push(`test ${t.test} không có trong bản đồ`);
for (const k of Object.keys(g.routes)) if (!has(k.slice(2))) errs.push(`route ${k} không có trong bản đồ`);
const mod = md.slice(md.indexOf('## Mô-đun JS chính'));
const nMod = +(mod.match(/\((\d+)\//) || [, 0])[1];
if (nMod < 1) errs.push('mục Mô-đun rỗng – phần cố định đã chiếm hết ngân sách');
for (const gd of g.god) { const d = path.posix.dirname(gd.path), b = path.posix.basename(gd.path);
  for (const l of mod.split('\n')) if (l.startsWith(`- \`${d}/\` `) && new RegExp('(^|· |` )' + b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[: ]').test(l.slice(d.length + 5))) errs.push(`god node ${gd.path} lặp lại trong mục Mô-đun`); }
// mô tả workflow: bản đồ cắt theo TỪ ≤ WF_DESC + '…', json giữ NGUYÊN văn (không mất nội dung)
{ const WF = +src.match(/const WF_DESC = (\d+)/)[1], wsec = md.slice(md.indexOf('## Workflows'), md.indexOf('## Test')); let cut = 0;
  for (const w of g.workflows) {
    const n = w.file.replace(/\.ya?ml$/, ''), m = wsec.match(new RegExp('(?:\\] |· )' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ': (.+?)(?= · (?:[\\w.-]+)(?::| ·|$)|$)', 'm'));
    if (!m) continue; const t = m[1], full = w.desc.replace(new RegExp('^' + n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*'), '');
    if (!t.endsWith('…')) { if (t !== full) errs.push(`workflow ${n}: mô tả trong bản đồ ≠ json mà không có "…"`); continue; }
    cut++; const head = t.slice(0, -1);
    if (head.length > WF) errs.push(`workflow ${n}: mô tả ${head.length} ký tự > ${WF}`);
    if (!full.startsWith(head) || full.length <= head.length || /[\p{L}\p{N}]/u.test(full[head.length]) && /[\p{L}\p{N}]/u.test(head.slice(-1))) errs.push(`workflow ${n}: cắt giữa từ hoặc không phải đầu của mô tả json ("${head}")`);
  }
  if (!cut) errs.push('không mô tả workflow nào bị cắt – kiểm lại phép so (cổng không chạy)'); }
// báo TRƯỚC khi phần cố định (mọi mục trừ Mô-đun) chiếm > 90 % trần → còn thời gian làm gọn, không đỏ bất ngờ ở PR sau
{ const fixedB = Buffer.byteLength(md.slice(0, md.indexOf('\n\n## Mô-đun JS chính')));
  if (fixedB > CAP * 0.9) { const msg = `codemap: phần cố định ${fixedB} B > 90 % trần ${CAP} – làm gọn mục cố định trước khi mục Mô-đun rỗng (đỏ)`; console.warn('⚠ ' + msg); if (process.env.GITHUB_ACTIONS) console.log('::warning::' + msg); }
  else console.log(`ℹ codemap: phần cố định ${fixedB} B = ${(fixedB / CAP * 100).toFixed(1)} % trần`); }
const trig = [...md.matchAll(/^- \[([^\]]+)\] /gm)].map(m => m[1]);
if (new Set(trig).size !== trig.length) errs.push('bộ trigger workflow bị in lặp');
fs.rmSync(dir, { recursive: true, force: true });
if (errs.length) { console.error('✗ codemap-budget:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`✓ codemap-budget: ${bytes} B ≤ ${CAP - SLACK} (trần ${CAP}), ${g.workflows.length} workflow, ${Object.keys(g.routes).length} route, ${g.tests.length} test, ${nMod} mô-đun`);
