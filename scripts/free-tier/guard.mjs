// Free-tier guard hằng ngày (.github/workflows/free-tier-guard.yml, docs/FREE-TIER.md): số dùng THẬT so với trần gói miễn phí.
// Nguồn: Cloudflare GraphQL Analytics (Workers theo script, Pages Functions, D1 đọc/ghi, R2 dung lượng + Class A/B) + Pages API (build/tháng)
// + GitHub API (dung lượng repo web + kho media, Actions cache). ≥ 60 % cảnh báo (::warning), ≥ 80 % mở/cập nhật issue 'free-tier'.
// Lượt Worker+Functions ≥ 80 % → web/free-tier-state.json mode "shed" (Worker đọc file tĩnh này – xem workers/lib/edge.mjs). Chỉ ghi khi chế độ ĐỔI.
// Không thăm dò, không thử lại: ~4 yêu cầu Cloudflare + ≤ 45 trang Pages API + ~6 GitHub mỗi ngày. Thiếu khoá → bỏ qua TRUNG TÍNH phần đó.
// Không bao giờ tự nâng gói. Chạy thử: node scripts/free-tier/guard.mjs --dry (không mở issue, không ghi file).
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { evaluate, markdown, r2Class } from './limits.mjs';

const DAY = 864e5, dayOf = t => new Date(t).toISOString().slice(0, 10);
const D1_MAIN = '7ce39cd0-9333-4843-bd6f-5ccbefbde670'; // lexkite-sync (functions/api/capacity.js D1_DB_ID)
const STATE = 'web/free-tier-state.json';
const SKIP_RE = /\[(CF-Pages-Skip|skip ci|ci skip)\]/i;

export async function cfGraphql(tok, acct, now, fetcher = fetch) {
  const y = dayOf(now - DAY), from = dayOf(now - 7 * DAY), month = dayOf(now).slice(0, 8) + '01T00:00:00Z', f = `filter:{date_geq:"${from}", date_leq:"${y}"}`;
  const query = `query { viewer { accounts(filter:{accountTag:"${acct}"}) {
    wk: workersInvocationsAdaptive(limit:2000, ${f}) { dimensions { date scriptName } sum { requests } }
    fn: pagesFunctionsInvocationsAdaptiveGroups(limit:100, ${f}) { dimensions { date } sum { requests } }
    d1: d1AnalyticsAdaptiveGroups(limit:500, ${f}) { dimensions { date databaseId } sum { rowsRead rowsWritten } }
    r2s: r2StorageAdaptiveGroups(limit:50, filter:{datetime_geq:"${month}"}) { dimensions { bucketName } max { payloadSize metadataSize } }
    r2o: r2OperationsAdaptiveGroups(limit:500, filter:{datetime_geq:"${month}"}) { dimensions { actionType } sum { requests } } } } }`;
  const r = await fetcher('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const j = await r.json().catch(() => ({}));
  const a = (((j.data || {}).viewer || {}).accounts || [])[0];
  if (!r.ok || !a) throw new Error(`graphql ${r.status} ${JSON.stringify(j.errors || '').slice(0, 200)}`);
  return { a, y };
}

/** Gộp số liệu GraphQL thành usage[] (ngày hôm qua UTC; ghi chú đỉnh 7 ngày + script lớn nhất). */
export function cfUsage({ a, y }, { second = false } = {}) {
  const out = [], days = new Map();
  const at = d => days.get(d) || days.set(d, { req: 0, scripts: {}, reads: 0, writes: 0 }).get(d);
  for (const g of a.wk || []) { const x = at(g.dimensions.date), n = +g.sum.requests || 0; x.req += n; x.scripts[g.dimensions.scriptName] = (x.scripts[g.dimensions.scriptName] || 0) + n; }
  for (const g of a.fn || []) { const x = at(g.dimensions.date), n = +g.sum.requests || 0; x.req += n; x.scripts['pages-functions'] = (x.scripts['pages-functions'] || 0) + n; }
  for (const g of a.d1 || []) { if (!second && g.dimensions.databaseId !== D1_MAIN) continue; const x = at(g.dimensions.date); x.reads += +g.sum.rowsRead || 0; x.writes += +g.sum.rowsWritten || 0; }
  const yd = at(y), peak = k => Math.max(0, ...[...days.values()].map(v => v[k]));
  const top = Object.entries(yd.scripts).sort((p, q) => q[1] - p[1]).slice(0, 3).map(([s, n]) => `${s} ${n}`).join(', ');
  const p = second ? '_2' : '';
  out.push({ key: 'cf_requests' + p, value: yd.req, note: `hôm qua ${y}; đỉnh 7 ngày ${peak('req')}${top ? '; ' + top : ''}` });
  out.push({ key: second ? 'd1b_reads' : 'd1_reads', value: yd.reads, note: `đỉnh 7 ngày ${peak('reads')}` });
  out.push({ key: second ? 'd1b_writes' : 'd1_writes', value: yd.writes, note: `đỉnh 7 ngày ${peak('writes')}` });
  if (!second) {
    const bytes = (a.r2s || []).reduce((s, g) => s + (+g.max.payloadSize || 0) + (+g.max.metadataSize || 0), 0);
    const ops = { a: 0, b: 0 }; for (const g of a.r2o || []) { const c = r2Class(g.dimensions.actionType); if (c !== 'free') ops[c] += +g.sum.requests || 0; }
    out.push({ key: 'r2_storage', value: bytes, note: `${(a.r2s || []).length} bucket` }, { key: 'r2_class_a', value: ops.a, note: 'từ đầu tháng' }, { key: 'r2_class_b', value: ops.b, note: 'từ đầu tháng' });
  }
  return out;
}

/** Đếm build Pages từ đầu tháng (UTC). Commit có [CF-Pages-Skip] không build → không đếm. Dừng khi gặp bản trước đầu tháng. */
export async function pagesBuilds(tok, acct, project, now, fetcher = fetch, maxPages = 45) {
  const start = dayOf(now).slice(0, 8) + '01';
  let n = 0, preview = 0, total = 0;
  for (let p = 1; p <= maxPages; p++) {
    const r = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${acct}/pages/projects/${project}/deployments?per_page=25&page=${p}`, { headers: { Authorization: 'Bearer ' + tok } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.success) throw new Error(`pages deployments ${r.status}`);
    let older = false;
    for (const d of j.result || []) {
      if (String(d.created_on).slice(0, 10) < start) { older = true; continue; }
      total++;
      const msg = ((d.deployment_trigger || {}).metadata || {}).commit_message || '';
      if (SKIP_RE.test(msg)) continue;
      n++; if (d.environment === 'preview') preview++;
    }
    if (older || !(j.result || []).length) return { value: n, note: `${preview} preview; ${total} bản ghi từ ${start}` };
  }
  return { value: n, note: `≥ ${maxPages * 25} bản ghi – số thật có thể lớn hơn` };
}

export async function githubUsage(token, now, fetcher = fetch) {
  const h = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-free-tier-guard' };
  const get = async p => { const r = await fetcher('https://api.github.com' + p, { headers: h }); if (!r.ok) throw new Error(`github ${p} ${r.status}`); return r.json(); };
  const out = [];
  const repos = ['lexkiteapp/lexkiteapp.github.io', ...JSON.parse(fs.readFileSync('infra/media-repos.json', 'utf8')).repos.filter(r => r.state !== 'planned').map(r => r.repo)];
  for (const full of repos) {
    const j = await get('/repos/' + full), main = full.endsWith('/lexkiteapp.github.io');
    out.push({ key: 'gh_repo', label: `Repo ${full}`, value: (+j.size || 0) * 1024, note: 'kích thước git (GitHub API)',
      action: main ? 'size-guard.yml giữ cây HEAD ≤ 600 MB và chặn commit nhị phân > 20 MB; tệp nặng mới → kho media (infra/media-repos.json). Lịch sử cũ: không viết lại khi chưa có chủ duyệt (docs/STORAGE.md).' : undefined });
  }
  const c = await get('/repos/lexkiteapp/lexkiteapp.github.io/actions/cache/usage');
  out.push({ key: 'gh_cache', value: +c.active_caches_size_in_bytes || 0, note: `${c.active_caches_count} cache` });
  return out;
}

async function issue(token, ev, md, fetcher = fetch) {
  const repo = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io';
  const gh = (p, method = 'GET', body) => fetcher(`https://api.github.com/repos/${repo}${p}`, { method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-free-tier-guard', 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const open = await (await gh('/issues?labels=free-tier&state=open&per_page=1')).json().catch(() => []);
  const cur = Array.isArray(open) && open[0];
  if (!ev.alerts.length) { if (cur) { await gh(`/issues/${cur.number}/comments`, 'POST', { body: '✅ Mọi tài nguyên < 80 % – đóng.\n\n' + md }); await gh(`/issues/${cur.number}`, 'PATCH', { state: 'closed' }); } return; }
  const title = `Free tier ≥ 80 %: ${ev.alerts.map(r => r.label.split(' – ')[0].split(' (')[0]).join(', ')}`.slice(0, 200);
  const body = `${md}\n_Tự động bởi .github/workflows/free-tier-guard.yml – không tự nâng gói. Ngưỡng nâng gói: docs/FREE-TIER.md §4._\n`;
  if (cur) { await gh(`/issues/${cur.number}`, 'PATCH', { title, body }); await gh(`/issues/${cur.number}/comments`, 'POST', { body: `Cập nhật ${new Date().toISOString().slice(0, 10)}: ${ev.alerts.map(r => `${r.label} ${(r.pct * 100).toFixed(0)} %`).join(' · ')}` }); }
  else { await gh('/labels', 'POST', { name: 'free-tier', color: 'd93f0b', description: 'Gần trần gói miễn phí (free-tier-guard)' }); const r = await gh('/issues', 'POST', { title, body, labels: ['free-tier'] }); if (!r.ok) throw new Error(`issue POST ${r.status}`); }
}

/** Chỉ ghi khi chế độ đổi (tránh build Pages vô ích). Trả true khi đã ghi. */
export function writeState(mode, now, file = STATE) {
  let cur = {}; try { cur = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* chưa có */ }
  if (cur.mode === mode) return false;
  fs.writeFileSync(file, JSON.stringify({ mode, since: new Date(now).toISOString(), doc: 'docs/FREE-TIER.md §3' }, null, 1) + '\n');
  return true;
}

async function main() {
  const dry = process.argv.includes('--dry'), now = Date.now(), env = process.env;
  const usage = [], skipped = [], errors = [];
  const tok = env.CF_ANALYTICS_TOKEN, acct = String(env.CF_ACCOUNT_ID || '').replace(/[^a-f0-9]/gi, '');
  if (tok && acct) {
    try { usage.push(...cfUsage(await cfGraphql(tok, acct, now))); } catch (e) { errors.push('Cloudflare GraphQL: ' + e.message); }
    try { usage.push({ key: 'pages_builds', ...(await pagesBuilds(tok, acct, 'lexkite', now)) }); } catch (e) { skipped.push(`Pages build/tháng: ${e.message} (khoá cần thêm quyền "Cloudflare Pages: Read")`); }
  } else skipped.push('Cloudflare tài khoản chính: chưa có secret CF_ANALYTICS_TOKEN (Account Analytics: Read + Cloudflare Pages: Read) – docs/FREE-TIER.md §5');
  const tok2 = env.CF_ANALYTICS_TOKEN_2, acct2 = String(env.CF_ACCOUNT_2 || '').replace(/[^a-f0-9]/gi, '');
  if (tok2 && acct2) { try { usage.push(...cfUsage(await cfGraphql(tok2, acct2, now), { second: true })); } catch (e) { errors.push('Cloudflare GraphQL tài khoản 2: ' + e.message); } }
  else skipped.push('Cloudflare tài khoản 2: chưa có secret CF_ANALYTICS_TOKEN_2 – docs/FREE-TIER.md §5');
  if (env.GITHUB_TOKEN) { try { usage.push(...(await githubUsage(env.GITHUB_TOKEN, now))); } catch (e) { errors.push('GitHub API: ' + e.message); } }
  else skipped.push('GitHub: thiếu GITHUB_TOKEN');
  skipped.push('Pages file/bản deploy: chặn ngay lúc build (build-web.sh cảnh báo > 15.000, chặn > 19.500)');

  const ev = evaluate(usage), md = markdown(ev, { date: dayOf(now), skipped: [...skipped, ...errors.map(e => '✗ ' + e)] });
  console.log(md);
  for (const r of ev.rows) if (r.level !== 'ok') console.log(`::warning::${r.label} ${(r.pct * 100).toFixed(1)} % gói miễn phí`);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, md);
  if (!dry) {
    if (usage.some(u => u.key === 'cf_requests') && writeState(ev.mode, now)) { console.log(`chế độ Worker → ${ev.mode}`); if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, 'state_changed=1\n'); }
    if (env.GITHUB_TOKEN) await issue(env.GITHUB_TOKEN, ev, md);
  }
  if (errors.length) { console.error('✗ ' + errors.join(' · ')); process.exit(1); } // có khoá mà không lấy được số → đỏ
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
