// CI hằng ngày (social-coverage.yml): mỗi kênh đang bật phải có bài MỖI ngày trong 30 ngày tới (owner 16/11). POST /api/social-auto op coverage (ký HMAC, chỉ đọc D1).
// Có kênh-ngày trống → in bảng + mở/bình luận 1 issue nhãn social-alert, thoát 0 (cảnh báo, không làm đỏ CI). Dùng: node scripts/social/coverage.mjs
import { driveCliKey, driveSign } from '../video/library.mjs';
import { alert } from './alert.mjs';

const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, ''), key = driveCliKey();
const ranges = days => { const out = []; let a = null, b = null; for (const d of days) { if (a && Date.parse(d) - Date.parse(b) === 864e5) { b = d; continue; } if (a) out.push(a === b ? a : a + '..' + b); a = b = d; } if (a) out.push(a === b ? a : a + '..' + b); return out; };
const weekly = j => ['| nền tảng | kênh nối/cần | trang-ngày có lịch | kênh còn trống |', '|---|---|---|---|', ...(j.platforms || []).map(p => `| ${p.platform} | ${p.channels}/${p.want} | ${p.have}/${p.total} | ${(j.rows || []).filter(r => r.platform === p.platform && r.missing.length).length} |`), '', '| kênh | nền | có lịch/' + j.days + ' | trống |', '|---|---|---|---|', ...(j.rows || []).map(r => `| ${r.title} | ${r.platform} | ${r.have} | ${r.missing.length ? ranges(r.missing).slice(0, 4).join(', ') : '—'} |`)].join('\n');
export const report = j => {
  const bad = (j.rows || []).filter(r => r.missing.length), lines = [`Lịch ${j.days} ngày tới: ${j.channels - bad.length}/${j.channels} kênh đủ mỗi ngày 1 bài; ${bad.length} kênh còn trống.`];
  for (const r of bad) lines.push(`- ${r.platform} · ${r.title} (${r.channel_id}): ${r.have}/${j.days} ngày · trống ${ranges(r.missing).slice(0, 6).join(', ')}${ranges(r.missing).length > 6 ? ' …' : ''}`);
  const miss = (j.platforms || []).filter(p => p.unconnected); for (const p of miss) lines.push(`- ${p.platform}: mới nối ${p.channels}/${p.want} kênh → thiếu ${p.unconnected} kênh (${p.unconnected * j.days} ${'trang-ngày'} chưa thể có lịch)`);
  return { bad, miss, text: lines.join('\n'), table: weekly(j) };
};
if (process.argv[1] && /(^|[\\/])coverage\.mjs$/.test(process.argv[1])) {
  if (!key) { console.log('⏭ chưa có LEXKITE_DRIVE_CLI_KEY – bỏ qua'); process.exit(0); }
  const text = JSON.stringify({ op: 'coverage' });
  const r = await fetch(BASE + '/api/social-auto', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text, signal: AbortSignal.timeout(60e3) }).catch(() => null);
  const j = r ? await r.json().catch(() => ({})) : {};
  if (r && r.status === 429) { console.log('⏭ bỏ qua:', j.error || 429); process.exit(0); }
  if (!r || !r.ok) { console.error('✗ coverage', r ? r.status : 'fetch', j.error || ''); process.exit(1); }
  const { bad, miss, text: out, table } = report(j); console.log(out);
  if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Lịch đăng 30 ngày\n```\n' + out + '\n```\n');
  if (process.env.WEEKLY === '1' || new Date().getUTCDay() === 1) await alert({ k: 'coverage-weekly', text: 'Bảng phủ lịch theo trang (mỗi tuần):\n\n' + table, at: Date.now() });
  if (bad.length || miss.length) await alert({ k: 'coverage-gap', text: out + '\n\nLấp: plan_run từ kho clip (Quản trị › Video & Social › Phân phối) hoặc thêm clip bản ngữ cho trang ngôn ngữ.', at: Date.now() });
}
