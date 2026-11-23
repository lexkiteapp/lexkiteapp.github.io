// Máy gác ĐÚNG page · ngôn ngữ · giờ cao điểm (chủ 23/11). POST /api/social-auto op audit (ký HMAC, chỉ đọc D1): bài 14 ngày tới sai ngôn ngữ kênh, ngoài giờ cao điểm địa phương, trùng, quá số bài/ngày, map kênh/múi giờ lệch.
// Dùng: node scripts/social/audit.mjs [days] [back] → in bảng sai lệch, exit 1 nếu còn lệch (social-coverage.yml gọi sau lấp lịch).
import { driveCliKey, driveSign } from '../video/library.mjs';

const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '');
export const table = j => ['| mã | số bài |', '|---|---|', ...Object.entries(j.summary || {}).map(([k, n]) => `| ${k} | ${n} |`), '', '| nền | kênh | mã | chi tiết | clip | giờ UTC |', '|---|---|---|---|---|---|', ...(j.bad || []).slice(0, 60).map(b => `| ${b.platform} | ${b.title} | ${b.code} | ${b.detail} | ${b.clip || ''} | ${b.at.slice(0, 16)} |`)].join('\n');
export async function run(days = 14, back = 0) {
  const key = driveCliKey(); if (!key) { console.log('⏭ chưa có LEXKITE_DRIVE_CLI_KEY – bỏ qua audit'); return 0; }
  const text = JSON.stringify({ op: 'audit', days, back }), r = await fetch(BASE + '/api/social-auto', { method: 'POST', headers: { 'Content-Type': 'application/json', ...driveSign(key, text) }, body: text, signal: AbortSignal.timeout(90e3) }).catch(() => null), j = r ? await r.json().catch(() => ({})) : {};
  if (r && r.status === 429) { console.log('⏭ audit bỏ qua:', j.error || 429); return 0; }
  if (!r || !r.ok) { console.error('✗ audit', r ? r.status : 'fetch', j.error || ''); return 1; }
  const out = `Audit ${days} ngày tới${back ? ' + ' + back + ' ngày qua' : ''}: ${j.posts} bài, ${j.n_bad} lệch (${j.past || 0} bài đã qua giờ).\n` + (j.n_bad ? table(j) : '');
  console.log(out); if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Audit đúng page/ngôn ngữ/giờ\n```\n' + out + '\n```\n');
  if (process.env.AUDIT_JSON) (await import('node:fs')).writeFileSync(process.env.AUDIT_JSON, JSON.stringify(j));
  return j.n_bad ? 1 : 0;
}
if (process.argv[1] && /(^|[\\/])audit\.mjs$/.test(process.argv[1])) process.exit(await run(+process.argv[2] || 14, +process.argv[3] || 0));
