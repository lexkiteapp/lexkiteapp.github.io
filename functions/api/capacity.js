/* Theo dõi hạn mức Cloudflare & cảnh báo nâng gói (docs/CAPACITY.md).
 * POST /api/capacity
 *   CLI/CI (HMAC X-Drive-Ts/X-Drive-Sig bằng LEXKITE_DRIVE_CLI_KEY – .github/workflows/capacity-watch.yml, 1 lần/ngày):
 *     { op: 'check' } → đọc Cloudflare GraphQL 30 ngày (dòng đọc/ghi D1 lexkite-sync + lượt Pages Functions + Workers) → lưu capacity_daily
 *       → luật _capacity.js evaluate(): ≥ 60 % gói Free 3 ngày liền HOẶC dự báo chạm 80 % trong 14 ngày
 *       → chuông Quản trị (drive_alerts kind 'capacity') + thư "Nâng gói Cloudflare 5 USD trước ngày X" (≤ 1 thư/24 h); hết nguy cơ → gỡ chuông.
 *   Quản trị (adminGate): { op: 'trend' } → chuỗi 30 ngày + đánh giá cho Quản trị › Hạn mức.
 * Cần bí mật Pages CF_ANALYTICS_TOKEN (quyền Account Analytics: Read) + CF_ACCOUNT_ID – dùng chung với _d1guard.js. Thiếu → 503 'no-analytics-token' (workflow đỏ).
 * Chỉ đọc theo khoá (capacity_daily PK day, drive_alerts PK kind) – không quét bảng. */
import { evaluate, alertText, LIMITS, ALERT, fmtVN } from './_capacity.js';
import { adminGate, adminCors } from './admin.js';
import { cliVerify } from './drive.js';

export const D1_DB_ID = '7ce39cd0-9333-4843-bd6f-5ccbefbde670'; // lexkite-sync (wrangler.toml)
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
const DAY = 86400e3, MAIL_GAP = 24 * 3600e3;
const dayOf = t => new Date(t).toISOString().slice(0, 10);

let ready = false;
async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS capacity_daily (day TEXT PRIMARY KEY, reads INTEGER, writes INTEGER, fn INTEGER, workers INTEGER, requests INTEGER, at INTEGER NOT NULL) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS drive_alerts (kind TEXT PRIMARY KEY, level TEXT NOT NULL, drive_id INTEGER, msg TEXT, since INTEGER NOT NULL, seen INTEGER NOT NULL, mailed INTEGER) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS drive_meta (k TEXT PRIMARY KEY, v TEXT) WITHOUT ROWID'),
  ]);
  ready = true;
}

/** Cloudflare GraphQL → [{ day, reads, writes, fn, workers, requests }] tăng dần (from..to, gồm hôm nay). */
export async function fetchSeries(env, from, to, fetcher = fetch) {
  const tok = env.CF_ANALYTICS_TOKEN || env.CF_API_TOKEN, acct = String(env.CF_ACCOUNT_ID || '').replace(/[^a-f0-9]/gi, '');
  if (!tok || !acct) { const e = new Error('no-analytics-token'); /** @type {any} */ (e).code = 503; throw e; }
  const f = `filter:{date_geq:"${from}", date_leq:"${to}"}`, dbId = String(env.D1_DATABASE_ID || D1_DB_ID).replace(/[^a-f0-9-]/gi, '');
  const query = `query { viewer { accounts(filter:{accountTag:"${acct}"}) {
    d1: d1AnalyticsAdaptiveGroups(limit:100, filter:{date_geq:"${from}", date_leq:"${to}", databaseId:"${dbId}"}) { dimensions { date } sum { rowsRead rowsWritten } }
    fn: pagesFunctionsInvocationsAdaptiveGroups(limit:100, ${f}) { dimensions { date } sum { requests } }
    wk: workersInvocationsAdaptive(limit:2000, ${f}) { dimensions { date } sum { requests } } } } }`;
  const r = await fetcher('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
  const j = await r.json().catch(() => ({}));
  const a = (((j.data || {}).viewer || {}).accounts || [])[0];
  if (!r.ok || !a) { const e = new Error('graphql ' + r.status + ' ' + JSON.stringify(j.errors || '').slice(0, 160)); /** @type {any} */ (e).code = 502; throw e; }
  const by = new Map();
  for (let t = Date.parse(from + 'T00:00:00Z'); dayOf(t) <= to; t += DAY) by.set(dayOf(t), { day: dayOf(t), reads: 0, writes: 0, fn: 0, workers: 0 });
  const at = d => by.get(d) || by.set(d, { day: d, reads: 0, writes: 0, fn: 0, workers: 0 }).get(d);
  for (const g of a.d1 || []) { const x = at(g.dimensions.date); x.reads += +g.sum.rowsRead || 0; x.writes += +g.sum.rowsWritten || 0; }
  for (const g of a.fn || []) at(g.dimensions.date).fn += +g.sum.requests || 0;
  for (const g of a.wk || []) at(g.dimensions.date).workers += +g.sum.requests || 0;
  return [...by.values()].sort((p, q) => p.day < q.day ? -1 : 1).map(x => ({ ...x, requests: x.fn + x.workers }));
}

async function sendMail(env, subject, text) {
  if (!env.MAIL) return false;
  const to = String(env.REPORT_NOTIFY_EMAIL || '').trim();
  const r = await env.MAIL.fetch('https://mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, text: text + '\n\nhttps://lexkite.com/admin.html#quota', ...(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(to) ? { to } : {}) }) }).catch(() => null);
  return !!(r && r.ok);
}
const pctTxt = ev => ev.metrics.map(m => `${m.k} ${m.pct}%${m.streak ? ` (${m.streak} ngày ≥ ${Math.round(ALERT.pct * 100)}%)` : ''}${m.eta != null ? `, chạm ${Math.round(ALERT.projectPct * 100)}% sau ~${m.eta} ngày` : ''}`).join(' · ');

/** Lõi cron (tách để kiểm thử): lưu chuỗi, đánh giá, đặt/gỡ chuông, gửi thư. → { ok, evaluation, mailed, rows } */
export async function check(env, db, now = Date.now(), fetcher = fetch) {
  await setup(db);
  const to = dayOf(now), from = dayOf(now - 29 * DAY);
  const rows = await fetchSeries(env, from, to, fetcher);
  await db.batch(rows.map(r => db.prepare('INSERT INTO capacity_daily (day, reads, writes, fn, workers, requests, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT (day) DO UPDATE SET reads = ?2, writes = ?3, fn = ?4, workers = ?5, requests = ?6, at = ?7')
    .bind(r.day, r.reads, r.writes, r.fn, r.workers, r.requests, now)));
  const ev = evaluate(rows, LIMITS.free, ALERT, to);
  let mailed = false;
  if (ev.alert) {
    const msg = `${alertText(ev)} – ${ev.reason}. Hôm qua: ${pctTxt(ev)}.`;
    await db.prepare("INSERT INTO drive_alerts (kind, level, drive_id, msg, since, seen, mailed) VALUES ('capacity', 'crit', NULL, ?1, ?2, ?2, NULL) ON CONFLICT (kind) DO UPDATE SET msg = ?1, seen = ?2")
      .bind(JSON.stringify({ t: 'capacity', p: { by: fmtVN(ev.upgradeBy), reason: ev.reason }, msg }), now).run();
    const last = +(((await db.prepare("SELECT v FROM drive_meta WHERE k = 'mail:capacity'").first()) || {}).v) || 0;
    if (now - last >= MAIL_GAP && await sendMail(env, `[Lexkite] ⚠️ ${alertText(ev)}`, msg + '\n\nChi tiết & ngưỡng: docs/CAPACITY.md')) {
      mailed = true; await db.prepare("INSERT OR REPLACE INTO drive_meta (k, v) VALUES ('mail:capacity', ?)").bind(String(now)).run();
    }
  } else await db.prepare("DELETE FROM drive_alerts WHERE kind = 'capacity'").run();
  return { ok: true, evaluation: ev, mailed, rows: rows.length };
}

/** Quản trị › Hạn mức: chuỗi đã lưu (30 ngày, tra theo khoá day) + đánh giá + hạn mức. */
export async function trend(env, db, now = Date.now()) {
  await setup(db);
  const from = dayOf(now - 29 * DAY), rows = (await db.prepare('SELECT day, reads, writes, fn, workers, requests, at FROM capacity_daily WHERE day >= ? ORDER BY day').bind(from).all()).results || [];
  return { rows, evaluation: evaluate(rows, LIMITS.free, ALERT, dayOf(now)), limits: { free: LIMITS.free, paid: LIMITS.paid }, rule: ALERT, analytics: !!((env.CF_ANALYTICS_TOKEN || env.CF_API_TOKEN) && env.CF_ACCOUNT_ID) };
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  const text = await request.text(); let b; try { b = JSON.parse(text); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!b || typeof b !== 'object') return json(request, 400, { error: 'json' });
  try {
    if (request.headers.get('X-Drive-Sig')) { // đường CI: chỉ HMAC, chỉ op check
      if (!(await cliVerify(env, request, text))) return json(request, 401, { error: 'sig' });
      if (b.op !== 'check') return json(request, 400, { error: 'op' });
      return json(request, 200, await check(env, env.DB));
    }
    const g = await adminGate(request, env, 'admcap'); if (!g.who) return json(request, g.status, { error: g.error });
    if (b.op !== 'trend') return json(request, 400, { error: 'op' });
    return json(request, 200, await trend(env, env.DB));
  } catch (e) {
    const code = /** @type {any} */ (e).code;
    return json(request, code === 503 ? 503 : 502, { error: String(e && e.message || e).slice(0, 200) });
  }
}
