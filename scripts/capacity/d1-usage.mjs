// CI 20 phút/lần (.github/workflows/d1-usage-watch.yml – sự cố 03/11): Pages chưa có CF_ANALYTICS_TOKEN nên cầu dao D1 "mù".
// 1 truy vấn GraphQL d1AnalyticsAdaptiveGroups (cả tài khoản chính, hôm nay UTC) bằng secret CI CF_ANALYTICS_TOKEN
// → POST /api/capacity { op:'usage', day, reads, writes } (ký HMAC LEXKITE_DRIVE_CLI_KEY) → _d1guard dùng cho ngưỡng 85 % + thư 50/75 %.
// Thiếu khoá → bỏ qua trung tính (xanh + ghi chú). Không thử lại, không vòng lặp. Khi Pages có CF_ANALYTICS_TOKEN thì máy chủ tự đo, lượt này chỉ là lưới dự phòng.
import { driveSign, driveCliKey } from '../video/library.mjs';
const BASE = String(process.env.LEXKITE_API_BASE || 'https://lexkite.com').replace(/\/+$/, '');
const tok = process.env.CF_ANALYTICS_TOKEN, acct = String(process.env.CF_ACCOUNT_ID || '').replace(/[^a-f0-9]/gi, ''), key = driveCliKey();
const skip = m => { console.log('::notice::Bỏ qua: ' + m); process.exit(0); };
if (!tok || !acct) skip('thiếu secret CF_ANALYTICS_TOKEN / CF_ACCOUNT_ID');
if (!key) { console.error('✗ thiếu LEXKITE_DRIVE_CLI_KEY'); process.exit(1); }
const day = new Date().toISOString().slice(0, 10);
const q = `query { viewer { accounts(filter:{accountTag:"${acct}"}) { d1AnalyticsAdaptiveGroups(limit:1, filter:{date_geq:"${day}", date_leq:"${day}"}) { sum { rowsRead rowsWritten } } } } }`;
const g = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q }), signal: AbortSignal.timeout(15e3) }).then(r => r.json()).catch(e => ({ errors: [String(e)] }));
const a = (((g.data || {}).viewer || {}).accounts || [])[0];
if (!a) { console.error('✗ GraphQL: ' + JSON.stringify(g.errors || g).slice(0, 200)); process.exit(1); }
const s = (a.d1AnalyticsAdaptiveGroups[0] || { sum: { rowsRead: 0, rowsWritten: 0 } }).sum, reads = +s.rowsRead || 0, writes = +s.rowsWritten || 0;
const text = JSON.stringify({ op: 'usage', day, reads, writes });
const r = await fetch(BASE + '/api/capacity', { method: 'POST', headers: { 'Content-Type': 'application/json', 'User-Agent': 'lexkite-bot d1-usage-watch', ...driveSign(key, text) }, body: text, signal: AbortSignal.timeout(20e3) }).catch(() => null);
const j = r ? await r.json().catch(() => ({})) : {};
const line = `D1 ${day}: đọc ${reads.toLocaleString('vi')} (${(reads / 5e4).toFixed(1)} %) · ghi ${writes.toLocaleString('vi')} (${(writes / 1e3).toFixed(1)} %) → máy chủ ${r ? r.status : 'lỗi mạng'} ${j.error || ''} bậc ${j.level ?? '?'}${j.mailed ? ' (đã gửi thư)' : ''}`;
console.log(line);
if (process.env.GITHUB_STEP_SUMMARY) { const fs = await import('node:fs'); fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### D1 trong ngày\n${line}\n`); }
// D1 đã cạn → máy chủ không ghi được drive_meta (429 quota-guard / 5xx): vẫn xanh trung tính, số đã in ra log
if (!r || (!r.ok && !(r.status === 429 || r.status >= 500))) process.exit(1);
