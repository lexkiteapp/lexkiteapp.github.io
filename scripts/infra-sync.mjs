// Đồng bộ sổ đăng ký infra/resources.json → bảng services (D1) để hiện ở Quản trị → Dịch vụ & tài khoản.
// Chỉ ghi các trường do repo quản lý (purpose, console, free, status, ord); giữ nguyên account/secret/note do quản trị nhập tay.
// Dùng (máy có token Cloudflare): node scripts/infra-sync.mjs  – ship2.sh tự chạy sau mỗi lần ship.
import fs from 'fs';
import { execFileSync } from 'child_process';
const R = JSON.parse(fs.readFileSync('infra/resources.json', 'utf8'));
const q = v => "'" + String(v ?? '').replace(/'/g, "''") + "'";
const sql = R.services.map((s, i) => {
  const free = s.upgrade && s.upgrade !== '—' ? `${s.free} · Nâng cấp: ${s.upgrade}` : s.free;
  return `UPDATE services SET purpose=${q(s.purpose)}, console=${q(s.console)}, free=${q(free)}, status=${q(s.status)}, ord=${i + 1} WHERE name=${q(s.name)};\n` +
    `INSERT INTO services (name, purpose, console, free, status, ord) SELECT ${q(s.name)}, ${q(s.purpose)}, ${q(s.console)}, ${q(free)}, ${q(s.status)}, ${i + 1} WHERE NOT EXISTS (SELECT 1 FROM services WHERE name=${q(s.name)});`;
}).join('\n');
fs.writeFileSync(process.env.TMPDIR + '/infra-sync.sql', sql);
const W = process.env.WRANGLER || 'wrangler';
execFileSync(W, ['d1', 'execute', 'lexkite-sync', '--remote', '--file', process.env.TMPDIR + '/infra-sync.sql'], { stdio: ['ignore', 'ignore', 'inherit'] });
console.log(`✓ infra-sync: ${R.services.length} dịch vụ → Quản trị`);
