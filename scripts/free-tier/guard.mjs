// Free-tier guard hằng ngày (.github/workflows/free-tier-guard.yml, docs/FREE-TIER.md): số dùng THẬT so với trần gói miễn phí.
// Nguồn: Cloudflare GraphQL Analytics (Workers theo script, Pages Functions, D1 đọc/ghi, R2 dung lượng + Class A/B) + Pages API (build/tháng)
// + GitHub API (dung lượng repo web + kho media, Actions cache). ≥ 60 % cảnh báo (::warning), ≥ 80 % mở/cập nhật issue 'free-tier'.
// Lượt Worker+Functions ≥ 80 % → web/free-tier-state.json mode "shed" (Worker đọc file tĩnh này – xem workers/lib/edge.mjs). Chỉ ghi khi chế độ ĐỔI.
// Không thăm dò, không thử lại: ~4 yêu cầu Cloudflare + ≤ 45 trang Pages API + ~6 GitHub mỗi ngày. Thiếu khoá → bỏ qua TRUNG TÍNH phần đó.
// Không bao giờ tự nâng gói. Chạy thử: node scripts/free-tier/guard.mjs --dry (không mở issue, không ghi file).
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { evaluate, markdown, r2Class } from './limits.mjs';
import { query as intradayQuery, hourly, project, decide, writeIntraday, pauseWorkflows, r2Usage, r2Gate, R2_FREE, STATE as ISTATE } from './intraday.mjs';

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

/** Cộng đồng: Durable Objects (hôm qua) + Realtime TURN (từ đầu tháng). Truy vấn RIÊNG để tên dataset lạ không làm hỏng cfGraphql. */
export async function cfRealtime(tok, acct, now, fetcher = fetch) {
  const y = dayOf(now - DAY), month = dayOf(now).slice(0, 8) + '01T00:00:00Z';
  const query = `query { viewer { accounts(filter:{accountTag:"${acct}"}) {
    dor: durableObjectsInvocationsAdaptiveGroups(limit:50, filter:{date:"${y}"}) { sum { requests } }
    turn: callsTurnUsageAdaptiveGroups(limit:50, filter:{datetimeMinute_geq:"${month}"}) { sum { egressBytes ingressBytes } } } } }`;
  const r = await fetcher('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const j = await r.json().catch(() => ({}));
  const a = (((j.data || {}).viewer || {}).accounts || [])[0];
  if (!r.ok || !a) throw new Error(`graphql ${r.status} ${JSON.stringify(j.errors || '').slice(0, 200)}`);
  const sum = (g, k) => (g || []).reduce((s, x) => s + (+x.sum[k] || 0), 0);
  return [{ key: 'do_requests', value: sum(a.dor, 'requests'), note: `hôm qua ${y}` },
    { key: 'turn_bytes', value: sum(a.turn, 'egressBytes') + sum(a.turn, 'ingressBytes'), note: 'từ đầu tháng' }];
}

/** Đếm build Pages từ đầu tháng (UTC). Commit có [CF-Pages-Skip] không build → không đếm; Direct Upload (wrangler, trigger ad_hoc) không dùng
 *  hệ build Cloudflare → không đếm (docs/FREE-TIER.md §7). Dừng khi gặp bản trước đầu tháng. */
export async function pagesBuilds(tok, acct, project, now, fetcher = fetch, maxPages = 100) {
  const start = dayOf(now).slice(0, 8) + '01';
  let n = 0, preview = 0, total = 0, direct = 0;
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
      if ((d.deployment_trigger || {}).type === 'ad_hoc') { direct++; continue; }
      n++; if (d.environment === 'preview') preview++;
    }
    if (older || !(j.result || []).length) return { value: n, note: `${preview} preview; ${direct} Direct Upload (không tính); ${total} bản ghi từ ${start}` };
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

export async function issue(token, ev, md, fetcher = fetch, { keepOpen = false } = {}) {
  const repo = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io';
  const gh = (p, method = 'GET', body) => fetcher(`https://api.github.com/repos/${repo}${p}`, { method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-free-tier-guard', 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  const open = await (await gh('/issues?labels=free-tier&state=open&per_page=1')).json().catch(() => []);
  const cur = Array.isArray(open) && open[0];
  if (!ev.alerts.length) { if (cur && !keepOpen) { await gh(`/issues/${cur.number}/comments`, 'POST', { body: '✅ Mọi tài nguyên < 80 % – đóng.\n\n' + md }); await gh(`/issues/${cur.number}`, 'PATCH', { state: 'closed' }); } return; }
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
    try { usage.push(...(await cfRealtime(tok, acct, now))); } catch (e) { skipped.push(`Durable Objects/TURN: ${e.message} (Cộng đồng chưa bật – đợt 3/5)`); }
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
    // chế độ Worker (shed) do bản TRONG NGÀY (--intraday, mỗi giờ) quyết – số hôm qua không còn tự bật/gỡ shed (sự cố 01/11)
    if (env.GITHUB_TOKEN) await issue(env.GITHUB_TOKEN, ev, md);
  }
  if (errors.length) { console.error('✗ ' + errors.join(' · ')); process.exit(1); } // có khoá mà không lấy được số → đỏ
}

/** Bản trong ngày (mỗi giờ): 1 truy vấn GraphQL, ngoại suy, dừng workflow gọi prod ≥ 60 %, shed + issue ≥ 80 % – scripts/free-tier/intraday.mjs. */
export async function intradayMain({ dry = false, now = Date.now(), env = process.env, fetcher = fetch, file = ISTATE, fallback = null } = {}) {
  const tok = env.CF_ANALYTICS_TOKEN, acct = String(env.CF_ACCOUNT_ID || '').replace(/[^a-f0-9]/gi, '');
  if (!tok || !acct) { console.log('⏭ free-tier intraday: chưa có CF_ANALYTICS_TOKEN – bỏ qua'); return null; }
  const r = await fetcher('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: intradayQuery(acct, now) }) });
  const j = await r.json().catch(() => ({})), a = (((j.data || {}).viewer || {}).accounts || [])[0];
  if (!r.ok || !a) throw new Error(`graphql ${r.status} ${JSON.stringify(j.errors || '').slice(0, 200)}`);
  const { hours, scripts } = hourly(a), p = project(hours, now);
  let cur = {}; try { cur = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* chưa có */ }
  const d = decide(p, cur, now);
  const top = Object.entries(scripts).sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, n]) => `${k} ${n}`).join(', ');
  const ev = evaluate([{ key: 'cf_requests', value: Math.max(p.total, p.projected), label: `Workers + Pages Functions HÔM NAY ${d.day} (ngoại suy tới 24:00)`, note: `thực tế ${p.total} sau ${p.elapsed.toFixed(1)} h, nhịp ${Math.round(p.rate)}/h; ${top}` }]);
  if (d.level === 'alert' && !ev.alerts.length) ev.alerts.push(ev.rows[0]); // giữ mức trong ngày (không hạ)
  const md = markdown(ev, { date: d.day }) + `\nMức trong ngày: **${d.level}** (${(d.pct * 100).toFixed(1)} %) · chế độ **${d.mode}**${d.pause ? ' · dừng: ' + PAUSE_NOTE : ''}\n`;
  console.log(md);
  if (d.level !== 'ok') console.log(`::warning::Workers + Functions hôm nay ${(d.pct * 100).toFixed(0)} % (thực tế ${p.total}, ngoại suy ${p.projected})`);
  if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, md);
  // Chốt $0 R2: ≥ 80 % hạn mức Free tháng → issue; ≥ 90 % → tên miền về Worker (nguồn GitHub) + đóng băng ghi R2 (state r2 = frozen)
  const ru = r2Usage(a), rg = r2Gate(ru);
  const r2md = `\nR2 tháng này: ${(ru.storage / 1024 ** 3).toFixed(2)} GB / 10 GB · Class A ${ru.a} / ${R2_FREE.a} · Class B ${ru.b} / ${R2_FREE.b} → **${rg.level}** (${(rg.pct * 100).toFixed(1)} % ${rg.key})${cur.r2 === 'frozen' ? ' · ĐÃ ĐÓNG BĂNG ghi R2' : ''}\n`;
  console.log(r2md); if (env.GITHUB_STEP_SUMMARY) fs.appendFileSync(env.GITHUB_STEP_SUMMARY, r2md);
  if (rg.level === 'warn') console.log(`::warning::R2 Class B ${(rg.parts.b * 100).toFixed(0)} % hạn mức tháng (≥ 50 %) – nhiều lượt trượt cache biên: kiểm cf-cache-status (GET phải HIT; HEAD luôn DYNAMIC) và Cache Rule lexkite_cdn_cache`);
  if (rg.level === 'alert' || rg.level === 'fallback') { console.log(`::warning::R2 ${(rg.pct * 100).toFixed(0)} % hạn mức Free (${rg.key})`); ev.alerts.push({ key: 'r2_' + rg.key, label: `R2 ${rg.key} (tháng)`, pct: rg.pct, level: 'alert', action: rg.level === 'fallback' ? 'Đã về Worker + GitHub và ngừng ghi R2 (chốt $0). Gỡ tay sau khi dọn/đầu tháng: docs/FREE-TIER.md §R2.' : 'Dọn tệp mồ côi / giảm đọc trượt cache; tới 90 % guard tự về GitHub.' }); }
  let r2 = cur.r2, r2err = '';
  if (!dry && rg.level === 'fallback' && cur.r2 !== 'frozen') {
    r2 = 'frozen';
    try { await (fallback || (async () => (await import('../cdn/cutover.mjs')).rollbackAll()))(); console.log('R2 ≥ 90 % → media/audio về Worker + GitHub'); }
    catch (e) { r2err = 'rollback R2 lỗi: ' + e.message; console.log('::error::' + r2err); }
  }
  let paused = cur.paused || [];
  if (!dry) {
    if (env.GITHUB_TOKEN) paused = await pauseWorkflows(env.GITHUB_TOKEN, { pause: d.pause, already: paused }, fetcher);
    else if (!d.pause) paused = [];
    const w = writeIntraday({ ...d, paused, r2 }, now, file);
    if (w.changed) { console.log(`trạng thái → ${d.mode}/${d.level}, dừng [${paused.join(', ')}]`); if (env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT, `state_changed=1\nmode_changed=${w.modeChanged ? 1 : 0}\n`); }
    if ((d.level === 'alert' || rg.level === 'alert' || rg.level === 'fallback') && env.GITHUB_TOKEN) await issue(env.GITHUB_TOKEN, ev, md + r2md, fetcher, { keepOpen: true });
    if (r2err) throw new Error(r2err);
  }
  return { ...d, ...p, paused, r2: { ...rg, usage: ru, state: r2 } };
}
const PAUSE_NOTE = 'workflow nền gọi host prod (intraday.mjs PAUSE)';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes('--intraday')) await intradayMain({ dry: process.argv.includes('--dry') }); else await main();
}
