// Cổng lược đồ (functions/api/_schema.js): CREATE/ALTER/DROP chỉ chạy khi PHIÊN BẢN once(db, 'tên', N, …) đổi.
// Test này chặn lỗi "sửa lược đồ mà quên tăng N" (bảng/cột mới sẽ không bao giờ được tạo ở production).
// Khoá: infra/schema.lock.json (băm các dòng DDL của từng tệp + phiên bản). Đổi DDL → tăng N → node scripts/test/schema-lock.mjs --write
import fs from 'node:fs';
import { createHash } from 'node:crypto';
const LOCK = 'infra/schema.lock.json', dir = 'functions/api';
const cur = {};
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort()) {
  const s = fs.readFileSync(`${dir}/${f}`, 'utf8'); if (!/\bonce\(\w+, '[\w-]+', \d+/.test(s)) continue;
  const vers = Object.fromEntries([...s.matchAll(/\bonce\(\w+, '([\w-]+)', (\d+)/g)].map(m => [m[1], +m[2]]));
  const ddl = s.split('\n').filter(l => /\b(CREATE (TABLE|INDEX|UNIQUE INDEX|VIEW)|ALTER TABLE|DROP (INDEX|TABLE)|INSERT INTO hit_meta)\b/.test(l)).map(l => l.trim()).join('\n');
  cur[f] = { vers, ddl: createHash('sha256').update(ddl).digest('hex').slice(0, 16) };
}
if (process.argv.includes('--write')) { fs.writeFileSync(LOCK, JSON.stringify(cur, null, 1) + '\n'); console.log('✎ ' + LOCK); process.exit(0); }
const lock = fs.existsSync(LOCK) ? JSON.parse(fs.readFileSync(LOCK, 'utf8')) : {};
const errs = [];
for (const [f, c] of Object.entries(cur)) {
  const l = lock[f];
  if (!l) { errs.push(`${f}: chưa có trong ${LOCK} (chạy --write)`); continue; }
  const bumped = JSON.stringify(c.vers) !== JSON.stringify(l.vers);
  if (c.ddl !== l.ddl && !bumped) errs.push(`${f}: DDL đổi nhưng phiên bản once() giữ nguyên ${JSON.stringify(c.vers)} → tăng số rồi chạy --write`);
  else if (bumped && c.ddl === l.ddl) { /* tăng phiên bản để chạy lại di chuyển – hợp lệ */ }
  if (bumped || c.ddl !== l.ddl) errs.push(`${f}: cập nhật khoá (node scripts/test/schema-lock.mjs --write)`);
  for (const [k, v] of Object.entries(c.vers)) if (l.vers[k] != null && v < l.vers[k]) errs.push(`${f}: phiên bản ${k} giảm ${l.vers[k]} → ${v}`);
}
if (errs.length) { console.log('✗ schema-lock:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`✓ schema-lock: ${Object.keys(cur).length} tệp, lược đồ khớp phiên bản`);
