/* Autopilot social (chạy nền, máy owner tắt vẫn chạy) – docs/DISTRIBUTION.md §6.
 * Mỗi lượt (cron CI .github/workflows/social-auto.yml → POST /api/social-auto, ký HMAC; hoặc nút "Chạy ngay" trong Quản trị):
 *   1. (≥ sync_h giờ một lần) GET accounts + GET posts → ext_sync + boardSync (trạng thái Scheduled/Published/Failed) → dist_social 'published'.
 *   2. social_due (dist_social theo slot_ms, cửa sổ [now + lead, now + lookahead]) ≤ max_per_run bài, chỉ nền tảng đang bật (mặc định FB + IG).
 *   3. Mỗi bài: pushClip (cache media) → POST posts NHÁP (Idempotency-Key cố định theo clip + kênh) → soc_board 'review' (want_at = slot) → social_ack 'pushed'.
 *      Đủ điều kiện tự duyệt (công tắc auto_approve BẬT + nền tảng đã có ≥ manual_first bài duyệt TAY) → GET bài → dấu băm → schedule(scheduled_at = slot):
 *      GrabCast tự đăng lúc tới giờ. Không đủ → bài nằm ở cột Chờ duyệt, owner duyệt tay (board/approve lên lịch đúng slot).
 * An toàn tải (memory grabcast-budget): ≤ daily_calls lượt GrabCast/ngày (đếm ở D1), không thử lại vòng; 401/403/409/422/429/503/5xx = dừng CẢ lượt + cầu dao ghi D1.
 * D1: chỉ truy vấn theo khóa/chỉ mục (dist_social_slot, soc_board PK/clip/state) – không quét cả bảng. */
import { setupMgr, boardSync, contentHash, pushClip, bodyFor, PLAT, platOf, healthOf, validateCompose } from './_social_mgr.js';
import { setupDist, DIST } from './distribution.js';
import { setup as ytSetup } from './youtube.js';
import { manifest } from './admin-shorts.js';
import { field } from './_clip_logic.js';
import { gcClient, gcConfigured } from './_grabcast.js';

// ---------------- Hàm thuần (test: scripts/test/social-auto.mjs) ----------------
export const AUTO_PLATS = ['facebook_page', 'instagram', 'tiktok', 'youtube', 'threads'];
/** on = kill switch (TẮT → không gọi GrabCast gì cả) · auto_approve mặc định TẮT · TikTok/YouTube TẮT tới khi GrabCast được TikTok/Google duyệt app. */
export const AUTO_DEFAULT = { on: true, auto_approve: false, manual_first: 5, plats: { facebook_page: true, instagram: true, tiktok: false, youtube: false, threads: false }, max_per_run: 3, lookahead_h: 30, lead_min: 20, sync_h: 6, daily_calls: 60, plan_daily: false };
const clamp = (v, lo, hi, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
export function cleanAuto(a) {
  a = a && typeof a === 'object' ? a : {}; const d = AUTO_DEFAULT, pl = a.plats && typeof a.plats === 'object' ? a.plats : {};
  return { on: a.on == null ? d.on : !!a.on, auto_approve: !!a.auto_approve, manual_first: clamp(a.manual_first, 1, 50, d.manual_first),
    plats: Object.fromEntries(AUTO_PLATS.map(p => [p, pl[p] == null ? d.plats[p] : !!pl[p]])),
    max_per_run: clamp(a.max_per_run, 1, 5, d.max_per_run), lookahead_h: clamp(a.lookahead_h, 2, 72, d.lookahead_h), lead_min: clamp(a.lead_min, 10, 180, d.lead_min),
    sync_h: clamp(a.sync_h, 3, 24, d.sync_h), daily_calls: clamp(a.daily_calls, 10, 120, d.daily_calls), plan_daily: !!a.plan_daily };
}
/** Mã GrabCast buộc dừng cả lượt (không thử lại) → thời gian mở cầu dao (ms); 0 = không dừng. */
export function breakerMs(status) {
  if (status === 401 || status === 403) return 12 * 36e5; // khóa sai/hết quyền: chờ owner thay khóa (nút Mở lại khi xong)
  if (status === 409 || status === 422) return 3 * 36e5;
  if (status === 429 || status === 503) return 2 * 36e5;  // GrabCast quá tải / ai_exhausted / DB Neon
  if (status >= 500) return 36e5;
  return 0;
}
export const dayOf = t => new Date(t).toISOString().slice(0, 10);
/** Còn bao nhiêu lượt GrabCast hôm nay (UTC). */
export const budgetLeft = (st, cfg, now) => Math.max(0, cfg.daily_calls - ((st.calls && st.calls.day === dayOf(now)) ? +st.calls.n || 0 : 0));
/** Tự duyệt được cho nền tảng p? – cần công tắc BẬT và đã có ≥ manual_first bài duyệt TAY trên nền tảng đó. */
export const canAutoApprove = (cfg, p, manual) => !!cfg.auto_approve && (+(manual || {})[p] || 0) >= cfg.manual_first;
/** Hàng social_due → việc của lượt này: nền tảng bật, có account_id, slot trong cửa sổ; sớm nhất trước. */
export function pickDue(rows, cfg, now) {
  const lo = now + cfg.lead_min * 60e3, hi = now + cfg.lookahead_h * 36e5;
  return (rows || []).filter(r => cfg.plats[r.platform] && r.account_id && r.slot_ms >= lo && r.slot_ms <= hi).sort((a, b) => a.slot_ms - b.slot_ms);
}
const hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
/** Idempotency-Key ổn định theo clip + kênh + bước ('c' tạo bài · 's' lên lịch) – chạy lại/CI trùng lượt không tạo bài thứ 2. */
export const idemKey = async (clip, ch, step) => 'lkap-' + step + '-' + (await hex(clip + '|' + ch)).slice(0, 40);
/** Id mục duyệt cố định theo clip + kênh (khóa chính soc_board). */
export const boardId = async (clip, ch) => 'b_ap' + (await hex(clip + '|' + ch)).slice(0, 24);
export const AUTO_WHO = 'autopilot';
export const MAX_TRIES = 2; // 1 clip × kênh lỗi (không phải lỗi dừng) quá 2 lượt → bỏ qua tới khi owner xem (nút Mở lại xóa đếm)

// ---------------- D1 ----------------
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const one = (db, sql, ...a) => db.prepare(sql).bind(...a).first();
const run = (db, sql, ...a) => db.prepare(sql).bind(...a).run();
const getMeta = async (db, k, d) => { const r = await one(db, 'SELECT v FROM soc_meta WHERE k = ?', k); try { return r ? JSON.parse(r.v) : d; } catch (e) { return d; } };
const setMeta = (db, k, v) => run(db, 'INSERT INTO soc_meta (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at', k, JSON.stringify(v), Date.now());
const CLIP = /^[a-z0-9-]{3,120}$/;
const stopErr = (status, code) => Object.assign(new Error('stop'), { stop: true, status, code: String(code || status) });

/** Số bài duyệt TAY (không phải autopilot) theo nền tảng – qua chỉ mục soc_board_state. */
export async function manualCounts(db) {
  const out = {};
  for (const r of await all(db, "SELECT plats FROM soc_board WHERE state IN ('approved', 'scheduled', 'published') AND approved_by IS NOT NULL AND approved_by != ? LIMIT 5000", AUTO_WHO)) {
    let ps = []; try { ps = JSON.parse(r.plats || '[]'); } catch (e) { /* hỏng */ }
    for (const p of new Set(ps.map(x => platOf({ platform: x })))) out[p] = (out[p] || 0) + 1;
  }
  return out;
}
/** Clip đã duyệt cho đúng các id cần (khóa IN, không quét yt_queue/clip_review như approvedClips). */
async function clipsFor(env, ids) {
  ids = [...new Set(ids)].filter(x => CLIP.test(x)).slice(0, 20); if (!ids.length) return new Map();
  const qs = ids.map(() => '?').join(','), m = await manifest(env), by = new Map(m.items.filter(it => it && ids.includes(it.id)).map(it => [it.id, it]));
  const q = new Set((await all(env.DB, `SELECT clip FROM yt_queue WHERE clip IN (${qs})`, ...ids).catch(() => [])).map(r => r.clip));
  const rv = new Map((await all(env.DB, `SELECT clip, state, deleted FROM clip_review WHERE clip IN (${qs})`, ...ids).catch(() => [])).map(r => [r.clip, r]));
  const out = new Map();
  for (const [id, it] of by) {
    const r = rv.get(id) || {}; if (!q.has(id) || r.deleted || ['rejected', 'paused'].includes(r.state) || it.rejected) continue;
    out.set(id, { id, title: it.title || it.lesson || id, description: it.description || '', hashtags: [], template: it.template || '', hook: field(it, 'hook'), cefr: field(it, 'diff') || it.cefr || '', duration: +it.duration || 0, video: it.video, cover: it.cover, _it: it });
  }
  return out;
}

/** Trạng thái cho thẻ Quản trị. */
export async function autoStatus(env, now = Date.now()) {
  const db = env.DB; await setupMgr(db); await setupDist(db);
  const cfg = cleanAuto(await getMeta(db, 'auto', AUTO_DEFAULT)), st = await getMeta(db, 'auto_state', {});
  const up = await all(db, 'SELECT s.clip, s.channel_id, s.platform, s.slot_ms, s.state, s.post_id, s.err, e.title AS channel FROM dist_social s LEFT JOIN dist_ext e ON e.channel_id = s.channel_id WHERE s.slot_ms BETWEEN ? AND ? ORDER BY s.slot_ms LIMIT 40', now - 6 * 36e5, now + 72 * 36e5);
  const ids = await Promise.all(up.map(r => boardId(r.clip, r.channel_id)));
  const qs = ids.map(() => '?').join(','), bs = ids.length ? new Map((await all(db, `SELECT id, state, note, err FROM soc_board WHERE id IN (${qs})`, ...ids)).map(r => [r.id, r])) : new Map();
  return { cfg, state: st, key: gcConfigured(env), webhook: String(env.GRABCAST_WEBHOOK_SECRET || '').length >= 24, manual: await manualCounts(db), budget_left: budgetLeft(st, cfg, now),
    upcoming: up.map((r, i) => ({ ...r, board: (bs.get(ids[i]) || {}).state || null, note: (bs.get(ids[i]) || {}).note || null })), now };
}

/** Phản chiếu bài đã đăng (của autopilot) về dist_social – theo khóa chính (clip, channel_id). */
async function mirrorPublished(db, since) {
  let n = 0;
  for (const r of await all(db, "SELECT clip, accounts, plats FROM soc_board WHERE state = 'published' AND by_who = ? AND updated > ? LIMIT 200", AUTO_WHO, since)) {
    let a = [], p = []; try { a = JSON.parse(r.accounts || '[]'); p = JSON.parse(r.plats || '[]'); } catch (e) { continue; }
    if (a.length !== 1 || !r.clip) continue;
    const res = await run(db, "UPDATE dist_social SET state = 'published', updated = ? WHERE clip = ? AND channel_id = ? AND state = 'pushed'", Date.now(), r.clip, `gc-${platOf({ platform: p[0] || '' })}-${a[0]}`);
    n += (res && res.meta && res.meta.changes) || 0;
  }
  return n;
}

/** Một lượt autopilot. → bản ghi lượt (cũng lưu ở soc_meta 'auto_state'.last_run). */
export async function runAuto(env, { src = 'cron', now = Date.now(), fetcher = fetch, origin = 'https://lexkite.com/api/social-auto', force_sync = false } = {}) {
  const db = env.DB; await setupMgr(db); await setupDist(db);
  const cfg = cleanAuto(await getMeta(db, 'auto', AUTO_DEFAULT)), st = await getMeta(db, 'auto_state', {});
  const failed = (r, why) => { const k = r.clip + '|' + r.channel_id, f = (st.fails = st.fails || {})[k] || { n: 0 }; st.fails[k] = { n: f.n + 1, at: now, why }; };
  const rec = { at: now, src, due: 0, created: 0, scheduled: 0, review: 0, skipped: [], calls: 0, stop: null, synced: null };
  const save = async () => {
    const today = dayOf(now), calls = st.calls && st.calls.day === today ? +st.calls.n || 0 : 0;
    st.calls = { day: today, n: calls + rec.calls }; st.last_run = rec;
    st.fails = Object.fromEntries(Object.entries(st.fails || {}).filter(([, v]) => v && now - v.at < 7 * 864e5).slice(-100));
    await setMeta(db, 'auto_state', st); return rec;
  };
  if (!cfg.on) { rec.stop = 'off'; return save(); }
  if (st.breaker && st.breaker.until > now) { rec.stop = 'breaker'; return save(); }
  if (!gcConfigured(env)) { rec.stop = 'no-key'; return save(); }
  let left = budgetLeft(st, cfg, now);
  if (left < 3) { rec.stop = 'budget'; return save(); }
  if (cfg.plan_daily && now - (+st.last_plan || 0) > 20 * 36e5) { try { await ytSetup(db); await DIST.plan_run(db, {}, env); st.last_plan = now; } catch (e) { rec.skipped.push({ why: 'plan-error' }); } } // chỉ D1, 0 lượt GrabCast

  const gc = gcClient(env, { fetcher, onCall: () => { rec.calls++; left--; } });
  const call = async (m, p, body, query, idem) => {
    if (left <= 0) throw stopErr(0, 'budget');
    const r = await gc(m, p, body, query, idem);
    if (breakerMs(r.status) || r.status === 504) throw stopErr(r.status, r.code || r.status);
    return r;
  };
  let accounts = null;
  const getAccounts = async () => {
    if (accounts) return accounts;
    const ar = await call('GET', 'accounts'); if (ar.status >= 400) throw stopErr(ar.status, ar.code);
    accounts = (ar.data && ar.data.accounts) || []; return accounts;
  };
  try {
    // 1) Đồng bộ trạng thái nền (thưa: ≥ sync_h giờ)
    if (force_sync || now - (+(st.last_sync && st.last_sync.at) || 0) >= cfg.sync_h * 36e5) {
      const accs = await getAccounts();
      await DIST.ext_sync(db, { accounts: accs.map(a => ({ platform: platOf(a), id: String(a.id), name: a.display_name || a.username || String(a.id), avatar: a.avatar_url || a.avatar || '', status: a.needs_reconnect ? 'error' : 'ok' })) });
      const pr = await call('GET', 'posts', null, { limit: 100 });
      if (pr.status < 400) await boardSync(db, (pr.data && pr.data.posts) || []);
      const pub = await mirrorPublished(db, (+(st.last_sync && st.last_sync.at) || 0) - 36e5);
      st.last_sync = { at: now, posts: ((pr.data && pr.data.posts) || []).length, published: pub }; rec.synced = st.last_sync;
    }
    // 2) Bài đến hạn
    const due = pickDue((await DIST.social_due(db, { from: now + cfg.lead_min * 60e3, to: now + cfg.lookahead_h * 36e5 }, env)).rows, cfg, now);
    rec.due = due.length;
    const manual = cfg.auto_approve ? await manualCounts(db) : {};
    let done = 0;
    const clips = due.length ? await clipsFor(env, due.slice(0, cfg.max_per_run * 2).map(r => r.clip)) : new Map();
    for (const r of due) {
      if (done >= cfg.max_per_run) break;
      if (((st.fails || {})[r.clip + '|' + r.channel_id] || {}).n >= MAX_TRIES) { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'gave-up' }); continue; } // lỗi lặp lại → chờ người xem (không đốt lượt GrabCast)
      const bid = await boardId(r.clip, r.channel_id), ex = await one(db, 'SELECT id, post_id, state FROM soc_board WHERE id = ?', bid);
      const auto = canAutoApprove(cfg, r.platform, manual);
      if (ex && ex.post_id) { // đã tạo bài ở lượt trước
        if (ex.state === 'review' && auto) { done++; await approveAndSchedule(db, call, ex.id, ex.post_id, r, rec); }
        else if (['scheduled', 'published'].includes(ex.state)) await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: 'pushed', post_id: ex.post_id });
        else rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'waiting-approval' });
        continue;
      }
      // bài tay (Hàng đợi/Soạn bài) đã có cho clip + tài khoản này → không tạo bài trùng
      const dup = (await all(db, "SELECT post_id, accounts FROM soc_board WHERE clip = ? AND post_id IS NOT NULL AND state NOT IN ('idea', 'draft') LIMIT 50", r.clip)).find(x => { try { return JSON.parse(x.accounts || '[]').includes(String(r.account_id)); } catch (e) { return false; } });
      if (dup) { await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: 'pushed', post_id: dup.post_id }); rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'exists' }); continue; }
      const c = clips.get(r.clip); if (!c) { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'clip-not-approved' }); continue; }
      const a = (await getAccounts()).find(x => String(x.id) === String(r.account_id));
      if (!a) { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'account-gone' }); continue; }
      const h = healthOf(a, []); if (h.state === 'reconnect' || h.state === 'limit') { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: h.state }); continue; }
      done++;
      const p = platOf(a), P = PLAT[p] || {}, acc = { id: a.id, p, kind: (a.kinds || []).includes(P.kind) ? P.kind : ((a.kinds || [])[0] || P.kind) };
      const meta = r.meta || {};
      try {
        const mid = await pushClip(env, c, call, origin);
        const body = bodyFor({ ...c, title: meta.title || c.title, description: meta.description || c.description, hashtags: meta.description ? [] : c.hashtags }, mid, [acc]);
        const v = validateCompose({ caption: body.caption, title: body.title, clip: c.id }, [p]).filter(x => x.lv === 'error');
        if (v.length) { await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: 'failed', err: 'invalid:' + v.map(x => x.code).join(',') }); failed(r, 'invalid'); rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'invalid' }); continue; }
        const cr = await call('POST', 'posts', body, null, await idemKey(r.clip, r.channel_id, 'c'));
        const pid = String((cr.data && (cr.data.post || cr.data).id) || '');
        if (cr.status >= 400 || !/^[A-Za-z0-9_-]{1,100}$/.test(pid)) { await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: 'failed', err: 'create:' + (cr.code || cr.status) }); failed(r, 'create'); rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'create-' + (cr.code || cr.status) }); continue; }
        const t = Date.now();
        await run(db, `INSERT INTO soc_board (id, post_id, clip, title, caption, accounts, plats, template, hook, cefr, state, mode, want_at, hash, note, created, updated, by_who) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'review', 'sched', ?, NULL, 'autopilot', ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET post_id = excluded.post_id, state = 'review', want_at = excluded.want_at, hash = NULL, approved_by = NULL, approved_at = NULL, updated = excluded.updated`,
          bid, pid, c.id, String(body.title || '').slice(0, 200), String(body.caption || '').slice(0, 2200), JSON.stringify([String(a.id)]), JSON.stringify([p]), c.template || null, c.hook || null, c.cefr || null, r.slot_ms, t, t, AUTO_WHO);
        await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: 'pushed', post_id: pid });
        rec.created++;
        if (auto) await approveAndSchedule(db, call, bid, pid, r, rec); else rec.review++;
      } catch (e) {
        if (e.stop) throw e;
        await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: 'failed', err: String(e.code || 'error') }); failed(r, String(e.code || 'error'));
        rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: String(e.code || 'error') });
      }
    }
  } catch (e) {
    if (!e.stop) throw e;
    rec.stop = e.code; const ms = breakerMs(e.status) || (e.status === 504 ? 36e5 : 0);
    if (ms) st.breaker = { until: now + ms, code: e.code, status: e.status, at: now };
  }
  return save();
}
/** GET bài (nội dung GrabCast thật) → dấu băm duyệt → schedule(slot). Ghi soc_board 'scheduled' (duyệt bởi autopilot). */
async function approveAndSchedule(db, call, bid, pid, r, rec) {
  const g = await call('GET', 'posts/' + pid); if (g.status >= 400) { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'get-' + (g.code || g.status) }); return; }
  const hash = await contentHash(g.data), t = Date.now();
  await run(db, "UPDATE soc_board SET state = 'approved', hash = ?, approved_by = ?, approved_at = ?, err = NULL, updated = ? WHERE id = ?", hash, AUTO_WHO, t, t, bid);
  const s = await call('POST', `posts/${pid}/schedule`, { scheduled_at: new Date(r.slot_ms).toISOString(), consent: true }, null, await idemKey(r.clip, r.channel_id, 's'));
  if (s.status >= 400) { await run(db, 'UPDATE soc_board SET err = ?, updated = ? WHERE id = ?', String(s.code || s.status).slice(0, 200), Date.now(), bid); rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'schedule-' + (s.code || s.status) }); return; }
  await run(db, "UPDATE soc_board SET state = 'scheduled', want_at = ?, updated = ? WHERE id = ?", r.slot_ms, Date.now(), bid);
  rec.scheduled++;
}

/** Webhook GrabCast (khi GrabCast mở): sự kiện bài → boardSync 1 bài + phản chiếu dist_social. Chữ ký: X-GrabCast-Signature = sha256=hex(HMAC(secret, "<ts>.<body>")), X-GrabCast-Timestamp lệch ≤ 300 s. */
export async function verifyWebhook(secret, ts, sig, body, now = Date.now()) {
  if (!secret || String(secret).length < 24 || !/^\d{10}$/.test(String(ts || '')) || Math.abs(now / 1000 - +ts) > 300) return false;
  const m = /^sha256=([0-9a-f]{64})$/.exec(String(sig || '').toLowerCase()); if (!m) return false;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const want = [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(ts + '.' + body)))].map(b => b.toString(16).padStart(2, '0')).join('');
  let d = 0; for (let i = 0; i < 64; i++) d |= want.charCodeAt(i) ^ m[1].charCodeAt(i); return d === 0;
}
export async function onWebhook(env, ev) {
  const post = ev && (ev.post || (ev.data && ev.data.post)); if (!post || !/^[A-Za-z0-9_-]{1,100}$/.test(String(post.id || ''))) return { status: 400, error: 'bad-event' };
  const db = env.DB; await setupMgr(db); await setupDist(db);
  await boardSync(db, [post]); const n = await mirrorPublished(db, Date.now() - 36e5);
  return { ok: true, published: n };
}

// ---------------- Thao tác Quản trị (/api/social path "lk/auto…") ----------------
const AUTO_OPS = {
  'GET auto': async ({ env }) => autoStatus(env),
  'POST auto/save': async ({ db, b }) => { const c = cleanAuto({ ...(await getMeta(db, 'auto', AUTO_DEFAULT)), ...(b.cfg && typeof b.cfg === 'object' ? b.cfg : {}) }); await setMeta(db, 'auto', c); return { cfg: c }; },
  'POST auto/reset': async ({ db }) => { const st = await getMeta(db, 'auto_state', {}); delete st.breaker; delete st.fails; await setMeta(db, 'auto_state', st); return { ok: true }; },
  'POST auto/run': async ({ env, request, b }) => ({ run: await runAuto(env, { src: 'admin', origin: request.url, force_sync: !!b.sync }) }),
};
export function autoOpFor(method, path) { const k = method + ' ' + String(path).replace(/^lk\//, ''); return Object.hasOwn(AUTO_OPS, k) ? AUTO_OPS[k] : null; }
