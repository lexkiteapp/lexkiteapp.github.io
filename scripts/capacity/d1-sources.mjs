// Dòng đọc/ghi D1 THẬT của 1 ngày (UTC) tách theo nguồn: người dùng · quản trị · việc nền (functions/api/_capacity.js d1Source) + câu đọc nhiều nhất.
// Chỉ đọc Cloudflare GraphQL Analytics (không tốn dòng D1). Khoá: CF_ANALYTICS_TOKEN / CF_API_TOKEN hoặc tệp ~/.config/lexkite/cf-token (máy coordinator).
//   node scripts/capacity/d1-sources.mjs [--date=YYYY-MM-DD] [--top=15] [--json]      (mặc định: hôm nay UTC)
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { d1Source, sourcesOf, evaluateSources } from '../../functions/api/_capacity.js';
import { D1_DB_ID } from '../../functions/api/capacity.js';

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const date = arg('date', new Date().toISOString().slice(0, 10)), topN = +arg('top', 15), acct = process.env.CF_ACCOUNT_ID || 'e34e14b7ab35eaf2b3d9d84fcce011f7';
let tok = process.env.CF_ANALYTICS_TOKEN || process.env.CF_API_TOKEN;
if (!tok) { try { tok = readFileSync(homedir() + '/.config/lexkite/cf-token', 'utf8').trim(); } catch (e) { console.error('thiếu khoá: CF_ANALYTICS_TOKEN / ~/.config/lexkite/cf-token'); process.exit(2); } }
const query = `query { viewer { accounts(filter:{accountTag:"${acct}"}) {
  d1QueriesAdaptiveGroups(limit:5000, orderBy:[sum_rowsRead_DESC], filter:{databaseId:"${D1_DB_ID}", date:"${date}"}) { count dimensions { date query } sum { rowsRead rowsWritten } } } } }`;
const r = await fetch('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
const j = await r.json(), g = (((j.data || {}).viewer || {}).accounts || [])[0];
if (!g) { console.error('GraphQL lỗi', r.status, JSON.stringify(j.errors || j).slice(0, 300)); process.exit(1); }
const groups = g.d1QueriesAdaptiveGroups, src = sourcesOf(groups)[date] || { user: { r: 0, w: 0 }, admin: { r: 0, w: 0 }, cron: { r: 0, w: 0 } };
const tot = Object.values(src).reduce((a, x) => a + x.r, 0), ev = evaluateSources(src);
if (process.argv.includes('--json')) { console.log(JSON.stringify({ date, total: tot, src, over: ev.over })); process.exit(0); }
console.log(`D1 lexkite-sync ${date}: đọc ${tot.toLocaleString('vi')} dòng (${(tot / 5e6 * 100).toFixed(1)} % Free) – ${ev.text}`);
if (ev.over.length) console.log('⚠ vượt ngân sách 10 %/nguồn: ' + ev.over.map(o => `${o.k} ${o.pct} %`).join(', '));
for (const x of groups.slice(0, topN)) console.log(String(x.sum.rowsRead).padStart(9), String(x.count).padStart(6), d1Source(x.dimensions.query).padEnd(5), x.dimensions.query.replace(/\s+/g, ' ').slice(0, 130));
