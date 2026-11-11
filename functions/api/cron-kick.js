/* ⏰ POST /api/cron-kick – nguồn kích cron ngoài GitHub (Worker lexkite-cronkick mỗi 30 phút gọi vào đây; mô-đun thuần: _cronkick.js, docs/JOBS.md).
 * Chỉ nhận khi chữ ký HMAC(ts + "." + body) đúng khoá CRON_KICK_SECRET và ts trong ±5 phút; mỗi chữ ký dùng 1 lần; ≤ 4 lượt/giờ (Cache API, như sync.js limit).
 * Chỉ đụng 3 workflow trong danh sách cố định; chỉ dispatch khi lượt mới nhất của workflow đã quá ngưỡng cron-watch và không có lượt đang chờ/chạy.
 * Bí mật (không bao giờ trả về/ghi log): CRON_KICK_SECRET, GH_DISPATCH_TOKEN (PAT Actions RW – đã có cho Video Studio). */
import { REPO, BODY_MAX, HOURLY_MAX, verify, parseWfs, plan } from './_cronkick.js';

const json = (status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra } });
const gh = (tok, path, init = {}) => fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${path}`, { ...init, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-cron-kick', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' } });

/** deps (test): { now, limit(key,max,sec) → giây chờ|0, fetchGh(tok, path, init) } */
export async function kick(request, env, deps = {}) {
  const now = deps.now || Date.now(), limit = deps.limit, ghf = deps.fetchGh || gh;
  if (request.method !== 'POST') return json(405, { error: 'method' }, { Allow: 'POST' });
  if (+(request.headers.get('Content-Length') || 0) > BODY_MAX) return json(413, { error: 'big' });
  const text = await request.text(); if (text.length > BODY_MAX) return json(413, { error: 'big' });
  if (!env.CRON_KICK_SECRET || String(env.CRON_KICK_SECRET).length < 32) return json(503, { error: 'not-configured' });
  const sig = request.headers.get('X-Kick-Sig') || '', v = await verify(env.CRON_KICK_SECRET, request.headers.get('X-Kick-Ts') || '', text, sig, now);
  if (v !== 'ok') return json(401, { error: v === 'stale' ? 'stale' : 'auth' });
  if (limit) {   // sau xác thực: kẻ lạ không đốt được hạn mức giờ
    if (await limit('cronkick-sig:' + sig.toLowerCase(), 1, 900)) return json(409, { error: 'replay' });
    const wait = await limit('cronkick-hour', HOURLY_MAX, 3600); if (wait) return json(429, { error: 'rate', retry: wait }, { 'Retry-After': String(wait) });
  }
  let wfs; try { wfs = parseWfs(text); } catch (e) { return json(e.code === 'not-allowed' ? 403 : 400, { error: e.code || 'bad-body' }); }
  // Canh D1 trong ngày (sự cố 03/11): thang báo 50/75 % – chạy cả khi thiếu token GitHub; lỗi không làm hỏng lượt kích
  let d1 = null; if (deps.watch) { try { d1 = await deps.watch(); } catch (e) { d1 = { error: String((e && e.message) || e).slice(0, 80) }; } }
  const tok = env.GH_DISPATCH_TOKEN; if (!tok) return json(503, { error: 'not-configured', d1 });
  const last = {};
  await Promise.all(wfs.map(async f => {
    try { const r = await ghf(tok, `${f}/runs?per_page=1`); last[f] = r.ok ? (((await r.json()).workflow_runs) || [])[0] || null : { error: r.status }; } catch (e) { last[f] = { error: 1 }; }
  }));
  const results = [];
  for (const p of plan(wfs, last, now)) {
    if (p.act === 'dispatch') { try { const r = await ghf(tok, `${p.file}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main' }) }); p.status = r.status; if (r.status !== 204) { p.act = 'skip'; p.why = 'dispatch-' + r.status; } } catch (e) { p.act = 'skip'; p.why = 'dispatch-error'; } }
    results.push(p);
  }
  return json(200, { ok: true, results, d1 });
}
export async function onRequest({ request, env }) {
  const { limit } = await import('./sync.js');
  const watch = async () => { const [{ watchD1 }, { sendMail }] = await Promise.all([import('./_d1watch.js'), import('./capacity.js')]); return env.DB ? watchD1(env, env.DB, Date.now(), { mail: (s, t) => sendMail(env, s, t) }) : { skip: 'no-db' }; };
  return kick(request, env, { limit, watch });
}
