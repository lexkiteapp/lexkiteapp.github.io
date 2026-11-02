// Free-tier guard TRONG NGÀY (mỗi giờ, .github/workflows/free-tier-guard.yml cron '17 * * * *'): 1 truy vấn GraphQL lượt Workers + Pages Functions
// từ 00:00Z hôm nay, ngoại suy tới 24:00 theo nhịp ≤ 3 giờ gần nhất (từ giờ thứ 2 trở đi). Sự cố 01/11: bản hằng ngày chỉ nhìn HÔM QUA → 174k/100k trong ngày không ai thấy,
// shed không bật, /api chết 16:22–24:00Z. Mức (thực tế hoặc ngoại suy, không hạ ngưỡng – limits.mjs):
//   ≥ 60 % → ::warning + TẠM DỪNG workflow nền gọi host prod (PAUSE, chỉ cái đang active; ghi tên để mở lại đúng cái đó)
//   ≥ 80 % → web/free-tier-state.json mode "shed" (Worker trả bản cache – workers/lib/edge.mjs) + mở/cập nhật issue 'free-tier'
// Trong ngày chỉ lên mức, không xuống (tránh bật/tắt liên tục khi shed làm lượt giảm); qua 00:00Z tự gỡ: shed → normal, mở lại workflow đã dừng.
// Chỉ ghi file trạng thái khi chế độ/danh sách dừng ĐỔI. Quét đầy đủ (Pages API, D1, R2, GitHub) vẫn là bản hằng ngày (guard.mjs).
import fs from 'node:fs';
import { LIMITS, level } from './limits.mjs';

export const STATE = 'web/free-tier-state.json';
// Workflow nền gọi host prod (scripts/test/no-prod-hosts.mjs PROD_OK/PROBE) + ci-filler (bơm việc CI) – dừng khi ≥ 60 %.
export const PAUSE = ['ci-filler.yml', 'vocab-img-scene.yml', 'i18n.yml', 'lighthouse.yml'];
const H = 36e5, RANK = { ok: 0, warn: 1, alert: 2 };
export const midnight = now => Date.UTC(new Date(now).getUTCFullYear(), new Date(now).getUTCMonth(), new Date(now).getUTCDate());
export const dayOf = t => new Date(t).toISOString().slice(0, 10);

export function query(acct, now) {
  const f = `filter:{datetime_geq:"${new Date(midnight(now)).toISOString().replace('.000', '')}"}`;
  return `query { viewer { accounts(filter:{accountTag:"${acct}"}) {
    wk: workersInvocationsAdaptive(limit:2000, ${f}) { dimensions { datetimeHour scriptName } sum { requests } }
    fn: pagesFunctionsInvocationsAdaptiveGroups(limit:100, ${f}) { dimensions { datetimeHour } sum { requests } } } } }`;
}
/** GraphQL → { hours: [24 số], scripts: {tên: số} } (Pages Functions = 'pages-functions'). */
export function hourly(a) {
  const hours = Array(24).fill(0), scripts = {};
  const add = (dt, s, n) => { hours[new Date(dt).getUTCHours()] += n; scripts[s] = (scripts[s] || 0) + n; };
  for (const g of a.wk || []) add(g.dimensions.datetimeHour, g.dimensions.scriptName, +g.sum.requests || 0);
  for (const g of a.fn || []) add(g.dimensions.datetimeHour, 'pages-functions', +g.sum.requests || 0);
  return { hours, scripts };
}
/** Tổng tới giờ + ngoại suy tới 24:00 theo nhịp cửa sổ ≤ 3 giờ gần nhất (gồm giờ đang chạy dở). */
export function project(hours, now) {
  const el = Math.max((now - midnight(now)) / H, 1 / 60), cur = Math.min(23, Math.floor(el)), lo = Math.max(0, cur - 3);
  const total = hours.slice(0, cur + 1).reduce((s, n) => s + n, 0), recent = hours.slice(lo, cur + 1).reduce((s, n) => s + n, 0);
  const rate = recent / Math.max(el - lo, 1);
  // < 1 giờ dữ liệu: ngoại suy quá nhiễu (1 đợt dồn 15 phút đầu ngày ≠ cả ngày) → chỉ tính số thực tế
  return { total, rate, projected: el < 1 ? total : Math.round(total + rate * Math.max(0, 24 - el)), elapsed: el };
}
/** Quyết định mức trong ngày. cur = trạng thái đang ghi (cùng ngày → không hạ mức; sang ngày mới → tính lại từ đầu). */
export function decide(p, cur = {}, now, limit = LIMITS.cf_requests.limit) {
  const pct = Math.max(p.total, p.projected) / limit, today = dayOf(now);
  let lv = level(pct);
  if (cur.day === today && RANK[cur.level] > RANK[lv]) lv = cur.level;
  return { level: lv, pct, mode: lv === 'alert' ? 'shed' : 'normal', pause: lv !== 'ok', day: today };
}
/** Ghi trạng thái khi mode/level/danh sách dừng đổi. Trả { changed, modeChanged }. */
export function writeIntraday(next, now, file = STATE) {
  let cur = {}; try { cur = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* chưa có */ }
  const paused = next.paused || [];
  const same = cur.mode === next.mode && cur.level === next.level && cur.day === next.day && JSON.stringify(cur.paused || []) === JSON.stringify(paused);
  if (same) return { changed: false, modeChanged: false };
  const out = { mode: next.mode, since: cur.mode === next.mode && cur.since ? cur.since : new Date(now).toISOString(), level: next.level, day: next.day, paused, doc: 'docs/FREE-TIER.md §3' };
  fs.writeFileSync(file, JSON.stringify(out, null, 1) + '\n');
  return { changed: true, modeChanged: cur.mode !== next.mode };
}
/** Dừng/mở lại workflow qua GitHub API (actions: write). Chỉ dừng cái đang active; chỉ mở lại cái chính guard đã dừng. */
export async function pauseWorkflows(token, { pause, already = [] }, fetcher = fetch, repo = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io') {
  const gh = (p, method = 'GET') => fetcher(`https://api.github.com/repos/${repo}/actions/workflows/${p}`, { method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-free-tier-guard' } });
  if (!pause) { for (const w of already) await gh(`${w}/enable`, 'PUT'); return []; }
  const out = [...already];
  for (const w of PAUSE) {
    if (out.includes(w)) continue;
    const r = await gh(w); if (!r.ok) continue;
    if ((await r.json()).state !== 'active') continue; // chủ đã tắt tay → không đụng, không tự mở lại
    if ((await gh(`${w}/disable`, 'PUT')).ok) out.push(w);
  }
  return out;
}
