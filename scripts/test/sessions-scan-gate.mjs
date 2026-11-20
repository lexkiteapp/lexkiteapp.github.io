// Cổng EXPLAIN: không thêm câu SQL MỚI nào quét toàn bảng `sessions` (sự cố 03/11/2026: Quản trị › Phân tích quét sessions → 5,1 M/5 M dòng đọc D1).
// Quét tĩnh mọi chuỗi SQL trong functions/** + workers/** có FROM/JOIN/UPDATE sessions, chạy EXPLAIN QUERY PLAN trên lược đồ thật (hit.js setup, node:sqlite).
// "SCAN sessions" (kể cả "USING INDEX" = quét cả chỉ mục) → phải nằm trong ALLOW dưới đây kèm lý do; câu mới quét → đỏ. Câu không phân tích được cũng phải khai.
// Chạy: node scripts/test/sessions-scan-gate.mjs [--list]   (docs/INFRA-RULES.md §D1, docs/CAPACITY.md §D4)
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
import { sqliteD1 } from '../capacity/meter.mjs';

// Khoá = sha1 12 ký tự của câu đã chuẩn hoá (in ra khi đỏ). Chỉ THÊM khi có lý do chính đáng (đường đệm/1 lần/ngày, chạy khi quay lại SQL cũ…).
export const ALLOW = JSON.parse(fs.readFileSync(new URL('./sessions-scan-allow.json', import.meta.url), 'utf8'));

const roots = ['functions', 'workers'], files = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else if (/\.(m?js)$/.test(e.name)) files.push(p); } };
for (const r of roots) if (fs.existsSync(r)) walk(r);

// Chuỗi '…' "…" `…` ; ${…} (lồng ≤ 2 cấp) → ?   – đủ cho SQL viết tay trong repo
const LIT = /`(?:\\[\s\S]|\$\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}|[^`\\])*`|'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"/g;
const SESS = /\b(FROM|JOIN|UPDATE)\s+sessions\b/i;
const norm = q => q.replace(/\s+/g, ' ').trim();
export const keyOf = q => crypto.createHash('sha1').update(norm(q)).digest('hex').slice(0, 12);
const found = [];
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(LIT)) {
    let q = m[0].slice(1, -1); if (!SESS.test(q) || !/\b(SELECT|UPDATE|DELETE|WITH)\b/i.test(q)) continue;
    q = q.replace(/\$\{(?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*\}/g, '?').replace(/\\n/g, ' ');
    found.push({ f, line: src.slice(0, m.index).split('\n').length, q: norm(q) });
  }
}

const be = sqliteD1(), sql = be.sql;
const H = await import(new URL('../../functions/api/hit.js', import.meta.url));
await H.setup(be.raw);
sql.exec('CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1) WITHOUT ROWID');
sql.exec('CREATE TABLE IF NOT EXISTS vid_uid (vid TEXT PRIMARY KEY, uid TEXT, at INTEGER) WITHOUT ROWID');

let fails = 0; const seen = new Set(), rows = [];
for (const x of found) {
  const k = keyOf(x.q); if (seen.has(k)) continue; seen.add(k);
  let plan = null; try { plan = sql.prepare('EXPLAIN QUERY PLAN ' + x.q).all().map(p => String(p.detail)); } catch (e) { plan = null; }
  const scan = plan ? plan.some(d => /^SCAN sessions\b/.test(d)) : null;
  rows.push({ ...x, k, scan, plan });
  if ((scan || plan == null) && !ALLOW[k]) { fails++; console.log(`✗ ${plan == null ? 'không EXPLAIN được' : 'SCAN sessions'} ${x.f}:${x.line} [${k}] ${x.q.slice(0, 160)}${plan ? '\n    → ' + plan.join(' / ') : ''}`); }
}
const stale = Object.keys(ALLOW).filter(k => !seen.has(k));
if (stale.length) { fails++; console.log('✗ ALLOW có khoá không còn trong mã (xoá khỏi sessions-scan-allow.json): ' + stale.join(', ')); }
if (process.argv.includes('--list')) for (const r of rows) if (r.scan || r.plan == null) console.log(JSON.stringify({ [r.k]: `${r.f}:${r.line} ${r.q.slice(0, 90)}` }));
const nScan = rows.filter(r => r.scan).length;
console.log(fails ? `✗ sessions-scan-gate: ${fails} lỗi (${rows.length} câu sessions, ${nScan} quét)` : `✓ sessions-scan-gate: ${rows.length} câu sessions, ${nScan} quét đã khai (ALLOW), 0 câu quét mới`);
process.exit(fails ? 1 : 0);
