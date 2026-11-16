// CI hằng ngày (social-coverage.yml): mỗi kênh đang bật phải có bài MỖI ngày trong 30 ngày tới (owner 16/11). POST /api/social-auto op coverage (ký HMAC, chỉ đọc D1).
// Có kênh-ngày trống → in bảng + mở/bình luận 1 issue nhãn social-alert, thoát 0 (cảnh báo, không làm đỏ CI). Dùng: node scripts/social/coverage.mjs
import { driveCliKey, driveSign } from '../video/library.mjs';
import { alert } from './alert.mjs';

const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, ''), key = driveCliKey();
const ranges = days => { const out = []; let a = null, b = null; for (const d of days) { if (a && Date.parse(d) - Date.parse(b) === 864e5) { b = d; continue; } if (a) out.push(a === b ? a : a + '..' + b); a = b = d; } if (a) out.push(a === b ? a : a + '..' + b); return out; };
export const report = j => {
  const bad = (j.rows || []).filter(r => r.missing.length), lines = [`Lịch ${j.days} ngày tới: ${j.channels - bad.length}/${j.channels} kênh đủ mỗi ngày 1 bài; ${bad.length} kênh còn trống.`];
  for (const r of bad) lines.push(`- ${r.platform} · ${r.title} (${r.channel_id}): ${r.have}/${j.days} ngày · trống ${ranges(r.missing).slice(0, 6).join(', ')}${ranges(r.missing).length > 6 ? ' …' : ''}`);
  return { bad, text: lines.join('\n') };
};
if (process.argv[1] && /(^|[\\/])coverage\.mjs$/.test(process.argv[1])) {
  if (!key) { console.log('⏭ chưa có LEXKITE_DRIVE_CLI_KEY – bỏ qua'); process.exit(0); }
  const text = JSON.stringify({ op: 'coverage' });
  const r = await fetch(BASE + '/api/social-auto', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text, signal: AbortSignal.timeout(60e3) }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (r && r.status === 429) { console.log('⏭ bỏ qua:', j.error || 429); process.exit(0); }
  if (!r || !r.ok) { console.error('✗ coverage', r ? r.status : 'fetch', j.error || ''); process.exit(1); }
  const { bad, text: out } = report(j); console.log(out);
  if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Lịch đăng 30 ngày\n```\n' + out + '\n```\n');
  if (bad.length) await alert({ k: 'coverage-gap', text: out + '\n\nLấp: plan_run từ kho clip (Quản trị › Video & Social › Phân phối) hoặc thêm clip bản ngữ cho trang ngôn ngữ.', at: Date.now() });
}
