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
import { field } from './_clip_logic.js';
import { gcClient, gcConfigured } from './_grabcast.js';
import { manifest, signed } from './admin-shorts.js';
import { once } from './_schema.js';
import { metaClient, metaConfigured, igConfigured, tokenHealth, fbReel, fbStatus, igContainer, igStatus, igQuota, igPublish } from './_meta.js';

// ---------------- Hàm thuần (test: scripts/test/social-auto.mjs) ----------------
export const AUTO_PLATS = ['facebook_page', 'instagram', 'tiktok', 'youtube', 'threads'];
/** on = kill switch (TẮT → không gọi GrabCast gì cả) · auto_approve mặc định TẮT · TikTok/YouTube TẮT tới khi GrabCast được TikTok/Google duyệt app. */
export const AUTO_DEFAULT = { on: true, auto_approve: false, manual_first: 5, plats: { facebook_page: true, instagram: true, tiktok: false, youtube: false, threads: false }, max_per_run: 3, lookahead_h: 30, lead_min: 20, sync_h: 6, daily_calls: 60, plan_daily: false, provider: 'auto', meta_daily: 80, meta_map: {} };
export const PROVIDERS = ['auto', 'grabcast', 'meta'];
const clamp = (v, lo, hi, d) => { const n = Math.round(+v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : d; };
export function cleanAuto(a) {
  a = a && typeof a === 'object' ? a : {}; const d = AUTO_DEFAULT, pl = a.plats && typeof a.plats === 'object' ? a.plats : {};
  return { on: a.on == null ? d.on : !!a.on, auto_approve: !!a.auto_approve, manual_first: clamp(a.manual_first, 1, 50, d.manual_first),
    plats: Object.fromEntries(AUTO_PLATS.map(p => [p, pl[p] == null ? d.plats[p] : !!pl[p]])),
    max_per_run: clamp(a.max_per_run, 1, 5, d.max_per_run), lookahead_h: clamp(a.lookahead_h, 2, 72, d.lookahead_h), lead_min: clamp(a.lead_min, 10, 180, d.lead_min),
    sync_h: clamp(a.sync_h, 3, 24, d.sync_h), daily_calls: clamp(a.daily_calls, 10, 120, d.daily_calls), plan_daily: !!a.plan_daily,
    provider: PROVIDERS.includes(a.provider) ? a.provider : d.provider, meta_daily: clamp(a.meta_daily, 20, 200, d.meta_daily),
    meta_map: Object.fromEntries(['facebook_page', 'instagram'].filter(p => a.meta_map && /^gc-[a-z_]+-[A-Za-z0-9_-]{1,40}$/.test(String(a.meta_map[p] || ''))).map(p => [p, String(a.meta_map[p])])) };
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

// ---------------- Provider (§6b): grabcast mặc định · meta dự phòng cho FB/IG ----------------
export const META_PLATS = ['facebook_page', 'instagram'];
export const LATE_MS = 30 * 60e3;      // GrabCast chưa đăng sau giờ hẹn + 30 phút → coi như trễ
export const MAX_LATE_MS = 12 * 36e5;  // quá 12 giờ sau slot → không cứu nữa (bài cũ)
export const IG_PREP_MS = 3 * 36e5;    // tạo container IG ≤ 3 giờ trước slot (container sống 24 giờ)
export const IG_EARLY_MS = 60 * 60e3;  // đăng IG khi now ≥ slot − 60 phút (cron 2 giờ ⇒ lệch ≤ ±1 giờ)
export const META_AHEAD_H = 6;         // Meta chỉ nhận bài có slot ≤ 6 giờ tới – GrabCast hồi phục kịp thì giữ các bài xa hơn
/** Mã cầu dao GrabCast có làm failover không: 401/403/429/503 ngay; 5xx/504 khi lặp ≥ 2 lượt liên tiếp; 409/422 (lỗi nội dung) thì không. */
export function gcDownWhy(env, st, now) {
  if (!gcConfigured(env)) return 'no-key';
  const b = st.breaker; if (!b || !(b.until > now)) return '';
  const s = +b.status || 0;
  if (s === 401 || s === 403) return 'auth-' + s;
  if (s === 429 || s === 503) return String(b.code || s).includes('db_budget') ? 'db_budget_guard' : 'overload-' + s;
  if ((s >= 500 || s === 504 || s === 0) && (+st.gc_err_runs || 0) >= 2) return 'down-' + (s || 'timeout');
  return '';
}
/** Chọn provider cho lượt này. mode: auto | grabcast | meta (nút chuyển tay ở Quản trị). */
export function decideProvider({ mode = 'auto', gcWhy = '', metaOk = false }) {
  if (mode === 'meta') return metaOk ? { cur: 'meta', why: 'manual' } : { cur: 'grabcast', why: 'meta-not-configured' };
  if (mode === 'grabcast') return { cur: 'grabcast', why: gcWhy ? 'manual:' + gcWhy : 'manual' };
  if (!gcWhy) return { cur: 'grabcast', why: '' };
  return metaOk ? { cur: 'meta', why: gcWhy } : { cur: 'grabcast', why: gcWhy + ':no-meta' };
}
/** Bước tiếp theo cho 1 bài qua Meta (thuần – test): wait | fb | ig-container | ig-check | done | too-late. */
export function metaStep({ platform, slot_ms, lock, gcScheduledUnreachable = false }, now) {
  if (lock && ['posted', 'scheduled'].includes(lock.state)) return lock.state === 'scheduled' && slot_ms + LATE_MS < now ? 'fb-check' : 'done';
  if (slot_ms < now - MAX_LATE_MS) return 'too-late';
  if (gcScheduledUnreachable && now < slot_ms + LATE_MS) return 'wait'; // GrabCast còn giữ lịch mà không gọi hủy được → chỉ cứu khi nó đã trễ
  if (platform === 'facebook_page') return 'fb';
  if (lock && lock.container) return now >= slot_ms - IG_EARLY_MS ? 'ig-check' : 'wait';
  return now >= slot_ms - IG_PREP_MS ? 'ig-container' : 'wait';
}
/** Kênh dist_ext ↔ Page/IG của token Meta: cfg.meta_map[p] (id kênh) hoặc kênh DUY NHẤT của nền tảng đó. */
export function metaChannelFor(p, chans, map = {}) {
  if (map[p]) return chans.some(c => c.channel_id === map[p]) ? map[p] : null;
  const xs = chans.filter(c => c.platform === p); return xs.length === 1 ? xs[0].channel_id : null;
}
const ALERT_EVERY = { failover: 0, 'meta-token': 3 * 864e5, 'meta-down': 864e5, 'dup-published': 0, recovered: 0 };
/** Đưa 1 cảnh báo vào hàng (CI mở 1 issue/email cho mỗi cảnh báo). failover chỉ 1 lần mỗi đợt (xóa khi hồi phục). */
export function pushAlert(st, k, text, now) {
  const base = k.split(':')[0], last = (st.alerted || {})[k];
  if (last && (ALERT_EVERY[base] === 0 || now - last < (ALERT_EVERY[base] || 864e5))) return false;
  st.alerted = { ...(st.alerted || {}), [k]: now }; st.alerts = [...(st.alerts || []), { k, text: String(text).slice(0, 400), at: now }].slice(-10); return true;
}

// ---------------- D1 ----------------
/** Khóa chống trùng theo clip + kênh (PK) – ai (grabcast|meta) đã/đang đăng bài này, id bên Meta, container IG, permalink, việc hủy GrabCast còn treo. */
export async function setupLock(db, env) {
  await once(db, 'soc-lock', 1, () => db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS soc_lock (clip TEXT NOT NULL, channel_id TEXT NOT NULL, platform TEXT, provider TEXT NOT NULL, state TEXT NOT NULL, slot_ms INTEGER, gc_post TEXT, gc_cancel TEXT, meta_id TEXT, container TEXT, permalink TEXT, err TEXT, created INTEGER, updated INTEGER, PRIMARY KEY (clip, channel_id))'),
    db.prepare('CREATE INDEX IF NOT EXISTS soc_lock_cancel ON soc_lock (gc_cancel)'), // hồi phục GrabCast: chỉ đọc các bài còn treo hủy
  ]), { env });
}
const lockOf = (db, clip, ch) => one(db, 'SELECT * FROM soc_lock WHERE clip = ? AND channel_id = ?', clip, ch);
const setLock = (db, clip, ch, f) => { const k = Object.keys(f); return run(db, `UPDATE soc_lock SET ${k.map(x => x + ' = ?').join(', ')}, updated = ? WHERE clip = ? AND channel_id = ?`, ...k.map(x => f[x]), Date.now(), clip, ch); };

/** Trạng thái cho thẻ Quản trị. */
export async function autoStatus(env, now = Date.now()) {
  const db = env.DB; await setupMgr(db); await setupDist(db); await setupLock(db, env);
  const cfg = cleanAuto(await getMeta(db, 'auto', AUTO_DEFAULT)), st = await getMeta(db, 'auto_state', {});
  const up = await all(db, 'SELECT s.clip, s.channel_id, s.platform, s.slot_ms, s.state, s.post_id, s.err, e.title AS channel FROM dist_social s LEFT JOIN dist_ext e ON e.channel_id = s.channel_id WHERE s.slot_ms BETWEEN ? AND ? ORDER BY s.slot_ms LIMIT 40', now - 6 * 36e5, now + 72 * 36e5);
  const ids = await Promise.all(up.map(r => boardId(r.clip, r.channel_id)));
  const qs = ids.map(() => '?').join(','), bs = ids.length ? new Map((await all(db, `SELECT id, state, note, err FROM soc_board WHERE id IN (${qs})`, ...ids)).map(r => [r.id, r])) : new Map();
  const ls = new Map(); for (const r of up) { const l = await lockOf(db, r.clip, r.channel_id); if (l) ls.set(r.clip + '|' + r.channel_id, l); } // ≤ 40 lượt đọc theo PK
  const chans = await all(db, "SELECT channel_id, platform, title FROM dist_ext WHERE platform IN ('facebook_page', 'instagram') LIMIT 20");
  return { cfg, state: st, key: gcConfigured(env), webhook: String(env.GRABCAST_WEBHOOK_SECRET || '').length >= 24, manual: await manualCounts(db), budget_left: budgetLeft(st, cfg, now),
    provider: { ...(st.provider || { cur: 'grabcast', why: '' }), mode: cfg.provider, gc_down: gcDownWhy(env, st, now) || null },
    meta: { configured: metaConfigured(env), ig: igConfigured(env), token: (st.meta || {}).token || null, breaker: (st.meta || {}).breaker && st.meta.breaker.until > now ? st.meta.breaker : null, budget_left: metaLeft(st, cfg, now),
      fb_channel: metaChannelFor('facebook_page', chans, cfg.meta_map), ig_channel: metaChannelFor('instagram', chans, cfg.meta_map), channels: chans },
    upcoming: up.map((r, i) => { const b = bs.get(ids[i]) || {}, l = ls.get(r.clip + '|' + r.channel_id) || {}; return { ...r, board_id: ids[i], board: b.state || null, note: b.note || null, provider: l.provider || null, permalink: l.permalink || null, lock: l.state || null }; }), now };
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
export const metaLeft = (st, cfg, now) => Math.max(0, cfg.meta_daily - (((st.meta || {}).calls || {}).day === dayOf(now) ? +st.meta.calls.n || 0 : 0));

/** Một lượt autopilot. → bản ghi lượt (cũng lưu ở soc_meta 'auto_state'.last_run). */
export async function runAuto(env, { src = 'cron', now = Date.now(), fetcher = fetch, origin = 'https://lexkite.com/api/social-auto', force_sync = false, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const db = env.DB; await setupMgr(db); await setupDist(db); await setupLock(db, env);
  const cfg = cleanAuto(await getMeta(db, 'auto', AUTO_DEFAULT)), st = await getMeta(db, 'auto_state', {});
  const rec = { at: now, src, due: 0, created: 0, scheduled: 0, review: 0, skipped: [], calls: 0, stop: null, synced: null, provider: null, meta: { calls: 0, posted: 0, scheduled: 0, containers: 0, stop: null }, alerts: [] };
  const save = async () => {
    const today = dayOf(now), calls = st.calls && st.calls.day === today ? +st.calls.n || 0 : 0;
    st.calls = { day: today, n: calls + rec.calls }; st.last_run = { ...rec, alerts: undefined };
    if (rec.meta.calls) { const m = st.meta = st.meta || {}, mc = m.calls && m.calls.day === today ? +m.calls.n || 0 : 0; m.calls = { day: today, n: mc + rec.meta.calls }; }
    st.fails = Object.fromEntries(Object.entries(st.fails || {}).filter(([, v]) => v && now - v.at < 7 * 864e5).slice(-100));
    rec.alerts = st.alerts || []; delete st.alerts; // CI (scripts/social/auto.mjs) mở issue cho từng cảnh báo – giao 1 lần
    st.alerted = Object.fromEntries(Object.entries(st.alerted || {}).filter(([, t]) => now - t < 30 * 864e5));
    await setMeta(db, 'auto_state', st); return rec;
  };
  if (!cfg.on) { rec.stop = 'off'; return save(); }
  if (cfg.plan_daily && now - (+st.last_plan || 0) > 20 * 36e5) { try { await ytSetup(db); await DIST.plan_run(db, {}, env); st.last_plan = now; } catch (e) { rec.skipped.push({ why: 'plan-error' }); } } // chỉ D1, 0 lượt GrabCast

  // ---- GrabCast client (ngân sách + cầu dao) ----
  let left = budgetLeft(st, cfg, now);
  const gc = gcClient(env, { fetcher, onCall: () => { rec.calls++; left--; } });
  const call = async (m, p, body, query, idem) => {
    if (left <= 0) throw stopErr(0, 'budget');
    const r = await gc(m, p, body, query, idem);
    if (breakerMs(r.status) || r.status === 504) throw stopErr(r.status, r.code || r.status);
    return r;
  };
  const gcStop = e => { // lỗi dừng của GrabCast → cầu dao + đếm lượt lỗi liên tiếp (failover 5xx khi lặp)
    rec.stop = e.code; const ms = breakerMs(e.status) || (e.status === 504 ? 36e5 : 0);
    if (ms) st.breaker = { until: now + ms, code: e.code, status: e.status, at: now };
    if (e.status >= 500 || e.status === 504) st.gc_err_runs = (+st.gc_err_runs || 0) + 1;
  };
  const gcUsable = () => gcConfigured(env) && !(st.breaker && st.breaker.until > now) && left >= 3;

  // ---- 0) Phát hiện GrabCast TRỄ: bài đã lên lịch trên GrabCast, quá slot + 30 phút mà chưa đăng (xác nhận bằng GET posts/{id}, ≤ 3 lượt) ----
  let late = 0;
  if (cfg.provider === 'auto' && metaConfigured(env) && gcUsable()) {
    try {
      const cand = (await all(db, "SELECT clip, channel_id, platform, slot_ms, post_id FROM dist_social WHERE slot_ms BETWEEN ? AND ? AND state = 'pushed' LIMIT 20", now - MAX_LATE_MS, now - LATE_MS))
        .filter(r => META_PLATS.includes(r.platform) && cfg.plats[r.platform] && r.post_id && !/^meta_/.test(r.post_id)).slice(0, 3);
      for (const r of cand) {
        const b = await one(db, 'SELECT id, state FROM soc_board WHERE id = ?', await boardId(r.clip, r.channel_id)); if (!b || b.state !== 'scheduled') continue; // nháp chờ duyệt không phải "trễ"
        const g = await call('GET', 'posts/' + r.post_id); const s = String(((g.data && (g.data.post || g.data)) || {}).status || '');
        if (s === 'published') { await boardSync(db, [(g.data.post || g.data)]); await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: 'published', post_id: r.post_id }); continue; }
        late++;
      }
    } catch (e) { if (!e.stop) throw e; gcStop(e); }
  }
  // ---- 1) Chọn provider: thử GrabCast trước khi nó có vẻ dùng được; lỗi dừng ngay lượt này → chuyển Meta trong CÙNG lượt ----
  const metaOk = metaConfigured(env) && !((st.meta || {}).breaker && st.meta.breaker.until > now);
  let prov = decideProvider({ mode: cfg.provider, gcWhy: gcDownWhy(env, st, now) || (late ? 'late' : ''), metaOk }), gcRan = false;
  if (prov.cur === 'grabcast') {
    if (!gcConfigured(env)) rec.stop = 'no-key';
    else if (st.breaker && st.breaker.until > now) rec.stop = 'breaker';
    else if (left < 3) rec.stop = 'budget';
    else {
      try { await gcPass(); gcRan = true; st.gc_err_runs = 0; }
      catch (e) { if (!e.stop) throw e; gcStop(e); const w = gcDownWhy(env, st, now); if (w) prov = decideProvider({ mode: cfg.provider, gcWhy: w, metaOk }); }
    }
  } else if (cfg.provider !== 'meta' && gcUsable()) {
    // FB/IG đi qua Meta (GrabCast trễ) – GrabCast vẫn lo nền tảng khác + hủy bài treo
    try { await gcPass(META_PLATS); } catch (e) { if (!e.stop) throw e; gcStop(e); }
  }
  const prev = st.provider || { cur: 'grabcast' };
  if (prov.cur === 'meta' && prev.cur !== 'meta') {
    st.provider = { ...prov, since: now, prev: prev.cur };
    if (cfg.provider === 'auto') pushAlert(st, 'failover', `Lexkite social autopilot: GrabCast lỗi (${prov.why}) → FB/IG chuyển sang đăng thẳng qua Meta Graph API.`, now);
  } else if (prov.cur === 'grabcast' && prev.cur === 'meta') {
    if (gcRan || cfg.provider === 'grabcast' || !metaOk) { // chỉ coi là hồi phục khi lượt GrabCast thật sự chạy được (hoặc chuyển tay)
      st.provider = { ...prov, since: now, prev: 'meta' }; delete (st.alerted || {}).failover;
      if (gcRan && cfg.provider === 'auto') pushAlert(st, 'recovered:' + dayOf(now), 'Lexkite social autopilot: GrabCast đã hồi phục → quay về GrabCast.', now);
    } else prov = { ...prev, cur: 'meta' }; // GrabCast chưa chạy được (cầu dao 409/422, ngân sách…) → giữ Meta
  } else st.provider = { ...prev, ...prov, since: prev.since || now };
  rec.provider = { cur: prov.cur, why: prov.why };
  // ---- 2) Lượt Meta (FB/IG) ----
  if (prov.cur === 'meta') {
    if (rec.stop === 'no-key' || rec.stop === 'breaker' || rec.stop === 'budget') rec.stop = null;
    try { await metaPass(); } catch (e) { if (!e.metaStop) throw e; }
  }
  return save();

  // ================= Lượt GrabCast (giữ nguyên logic PR #129) =================
  async function gcPass(skipPlats = []) {
    const failed = (r, why) => { const k = r.clip + '|' + r.channel_id, f = (st.fails = st.fails || {})[k] || { n: 0 }; st.fails[k] = { n: f.n + 1, at: now, why }; };
    let accounts = null;
    const getAccounts = async () => {
      if (accounts) return accounts;
      const ar = await call('GET', 'accounts'); if (ar.status >= 400) throw stopErr(ar.status, ar.code);
      accounts = (ar.data && ar.data.accounts) || []; return accounts;
    };
    // Hồi phục: hủy bài GrabCast còn treo của các bài Meta đã đăng thay (≤ 3 bài/lượt, theo chỉ mục soc_lock_cancel)
    for (const l of await all(db, "SELECT clip, channel_id, gc_post FROM soc_lock WHERE gc_cancel = 'pending' LIMIT 3")) {
      const g = await call('GET', 'posts/' + l.gc_post), s = String(((g.data && (g.data.post || g.data)) || {}).status || '');
      if (g.status === 404 || /cancel|deleted|draft|fail/.test(s)) { await setLock(db, l.clip, l.channel_id, { gc_cancel: 'done' }); continue; }
      if (s === 'published') { await setLock(db, l.clip, l.channel_id, { gc_cancel: 'dup' }); pushAlert(st, 'dup-published:' + l.clip + '|' + l.channel_id, `Lexkite autopilot: GrabCast đã đăng bài ${l.clip} (${l.channel_id}) dù Meta đã đăng thay – kiểm và xóa 1 bản.`, now); continue; }
      if (/schedul/.test(s)) await call('POST', `posts/${l.gc_post}/unschedule`, {});
      const c = await call('POST', `posts/${l.gc_post}/cancel`, {});
      await setLock(db, l.clip, l.channel_id, { gc_cancel: c.status < 400 ? 'done' : 'pending' });
    }
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
    const due = pickDue((await DIST.social_due(db, { from: now + cfg.lead_min * 60e3, to: now + cfg.lookahead_h * 36e5 }, env)).rows, cfg, now).filter(r => !skipPlats.includes(r.platform));
    rec.due = due.length;
    const manual = cfg.auto_approve ? await manualCounts(db) : {};
    let done = 0;
    const clips = due.length ? await clipsFor(env, due.slice(0, cfg.max_per_run * 2).map(r => r.clip)) : new Map();
    for (const r of due) {
      if (done >= cfg.max_per_run) break;
      if (((st.fails || {})[r.clip + '|' + r.channel_id] || {}).n >= MAX_TRIES) { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'gave-up' }); continue; } // lỗi lặp lại → chờ người xem (không đốt lượt GrabCast)
      const lk = await lockOf(db, r.clip, r.channel_id); if (lk && lk.provider === 'meta') { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'meta' }); continue; } // Meta đã nhận bài này
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
  }

  // ================= Lượt Meta (dự phòng FB/IG) =================
  async function metaPass() {
    const M = rec.meta, ms = st.meta = st.meta || {};
    let mleft = metaLeft(st, cfg, now);
    const mc0 = metaClient(env, { fetcher, onCall: () => { M.calls++; mleft--; } });
    const mstop = (kind, code) => {
      const ttl = kind === 'token' || kind === 'perm' ? 12 * 36e5 : kind === 'rate' ? 2 * 36e5 : 36e5;
      ms.breaker = { until: now + ttl, kind, code, at: now }; M.stop = kind + ':' + code;
      if (kind === 'token' || kind === 'perm') pushAlert(st, 'meta-token:' + kind, `Lexkite autopilot: token Meta bị thu hồi/thiếu quyền (${code}) – lấy lại Page token dài hạn (docs/DISTRIBUTION.md §6b) và cập nhật secret META_PAGE_TOKEN.`, now);
      else pushAlert(st, 'meta-down:' + kind, `Lexkite autopilot: Meta Graph API lỗi (${kind} ${code}) – dừng ${Math.round(ttl / 36e5)} giờ.`, now);
      throw Object.assign(new Error('meta-stop'), { metaStop: true });
    };
    const mc = async (...a) => { if (mleft <= 0) { M.stop = 'budget'; throw Object.assign(new Error('meta-stop'), { metaStop: true }); } const r = await mc0(...a); if (r.kind) mstop(r.kind, r.code); return r; };
    mc.ver = mc0.ver;
    const mErr = e => { if (e && e.meta && e.kind) mstop(e.kind, e.code); return e; };
    // Sức khỏe token ≤ 1 lần/ngày
    if (now - (+(ms.token && ms.token.at) || 0) > 864e5) {
      const h = await tokenHealth(mc0, env, now);
      ms.token = h;
      if (!h.ok && h.why === 'revoked') mstop('token', h.code || 'revoked');
      if (!h.ok) pushAlert(st, 'meta-token:' + h.why, `Lexkite autopilot: token Meta ${h.why}${h.expires_at ? ' – hết hạn ' + new Date(h.expires_at).toISOString().slice(0, 10) : ''}${h.data_access_expires_at ? ' – quyền dữ liệu hết hạn ' + new Date(h.data_access_expires_at).toISOString().slice(0, 10) : ''}${(h.missing || []).length ? ' – thiếu ' + h.missing.join(',') : ''}. Làm lại token (docs/DISTRIBUTION.md §6b).`, now);
    }
    const chans = await all(db, "SELECT channel_id, platform FROM dist_ext WHERE platform IN ('facebook_page', 'instagram') LIMIT 20");
    const target = { facebook_page: metaChannelFor('facebook_page', chans, cfg.meta_map), instagram: igConfigured(env) ? metaChannelFor('instagram', chans, cfg.meta_map) : null };
    const rows = (await all(db, 'SELECT clip, channel_id, platform, slot_ms, state, post_id FROM dist_social WHERE slot_ms BETWEEN ? AND ? ORDER BY slot_ms LIMIT 60', now - MAX_LATE_MS, now + Math.min(cfg.lookahead_h, META_AHEAD_H) * 36e5))
      .filter(r => META_PLATS.includes(r.platform) && cfg.plats[r.platform] && target[r.platform] === r.channel_id && ['planned', 'failed', 'pushed'].includes(r.state));
    for (const p of META_PLATS) if (cfg.plats[p] && !target[p] && (p === 'facebook_page' || igConfigured(env))) rec.skipped.push({ ch: p, why: 'meta-map' });
    const manual = cfg.auto_approve ? await manualCounts(db) : {};
    const clips = rows.length ? await clipsFor(env, rows.slice(0, 20).map(r => r.clip)) : new Map();
    let quota = null, acts = 0;
    for (const r of rows) {
      if (acts >= cfg.max_per_run) break;
      const fk = 'm|' + r.clip + '|' + r.channel_id; if (((st.fails || {})[fk] || {}).n >= MAX_TRIES) { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'meta-gave-up' }); continue; }
      const mfail = async (why, code) => { const f = (st.fails = st.fails || {})[fk] || { n: 0 }; st.fails[fk] = { n: f.n + 1, at: now, why: why + ':' + code }; await setLock(db, r.clip, r.channel_id, { err: (why + ':' + code).slice(0, 120) }); await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: 'failed', err: ('meta-' + why + ':' + code).slice(0, 120) }); rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'meta-' + why }); };
      let lock = await lockOf(db, r.clip, r.channel_id);
      if (lock && lock.provider !== 'meta') continue;
      // --- duyệt: chỉ bài ĐÃ DUYỆT (tay hoặc tự duyệt đủ điều kiện) mới công khai ---
      const bid = await boardId(r.clip, r.channel_id); let b = await one(db, 'SELECT * FROM soc_board WHERE id = ?', bid);
      const c = clips.get(r.clip);
      if (!b) {
        if (!c) { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'clip-not-approved' }); continue; }
        const due = (await DIST.social_due(db, { from: r.slot_ms, to: r.slot_ms, channel_id: r.channel_id }, env)).rows.find(x => x.clip === r.clip) || {}, meta = due.meta || {};
        const body = bodyFor({ ...c, title: meta.title || c.title, description: meta.description || c.description, hashtags: meta.description ? [] : c.hashtags }, 'meta', [{ id: 0, p: r.platform }]);
        const ok = canAutoApprove(cfg, r.platform, manual), t = Date.now();
        await run(db, `INSERT INTO soc_board (id, post_id, clip, title, caption, accounts, plats, template, hook, cefr, state, mode, want_at, hash, approved_by, approved_at, note, created, updated, by_who) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'sched', ?, NULL, ?, ?, 'meta', ?, ?, ?) ON CONFLICT(id) DO NOTHING`,
          bid, c.id, String(body.title || '').slice(0, 200), String(body.caption || '').slice(0, 2200), JSON.stringify([r.channel_id.split('-').pop()]), JSON.stringify([r.platform]), c.template || null, c.hook || null, c.cefr || null, ok ? 'approved' : 'review', r.slot_ms, ok ? AUTO_WHO : null, ok ? t : null, t, t, AUTO_WHO);
        b = await one(db, 'SELECT * FROM soc_board WHERE id = ?', bid);
        if (!ok) { rec.review++; rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'waiting-approval' }); continue; }
      }
      if (b.state === 'published') { await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: 'published', post_id: r.post_id || b.post_id }); continue; }
      if (!['approved', 'scheduled'].includes(b.state) || !b.approved_by) {
        if (b.state === 'review' && canAutoApprove(cfg, r.platform, manual)) { await run(db, "UPDATE soc_board SET state = 'approved', approved_by = ?, approved_at = ?, updated = ? WHERE id = ?", AUTO_WHO, now, now, bid); b.state = 'approved'; }
        else { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'waiting-approval' }); continue; }
      }
      if (!c) { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'clip-not-approved' }); continue; }
      // --- khóa chống trùng (PK clip + kênh): chỉ 1 lượt/1 provider nhận bài ---
      const gcPid = (b.post_id && !/^meta_/.test(b.post_id)) ? b.post_id : (r.post_id && !/^meta_/.test(r.post_id) ? r.post_id : null);
      if (!lock) {
        const ins = await run(db, "INSERT INTO soc_lock (clip, channel_id, platform, provider, state, slot_ms, gc_post, created, updated) VALUES (?, ?, ?, 'meta', 'claimed', ?, ?, ?, ?) ON CONFLICT(clip, channel_id) DO NOTHING", r.clip, r.channel_id, r.platform, r.slot_ms, gcPid, now, now);
        if (!ins || !ins.meta || ins.meta.changes !== 1) { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'locked' }); continue; }
        lock = await lockOf(db, r.clip, r.channel_id);
      }
      // --- bài GrabCast tương ứng: GET (chưa published?) + hủy lịch nếu gọi được ---
      let gcSchedUnreach = false;
      if (gcPid && !lock.gc_cancel) {
        let handled = false;
        if (gcConfigured(env) && left >= 2 && !(st.breaker && st.breaker.until > now && [401, 403].includes(+st.breaker.status))) {
          try {
            const g = await gc('GET', 'posts/' + gcPid); const s = String(((g.data && (g.data.post || g.data)) || {}).status || '');
            if (g.status < 400) {
              if (s === 'published') { await boardSync(db, [(g.data.post || g.data)]); await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: 'published', post_id: gcPid }); await setLock(db, r.clip, r.channel_id, { provider: 'grabcast', state: 'posted', gc_cancel: 'n/a' }); continue; }
              if (/schedul|publishing|processing/.test(s)) { const u = await gc('POST', `posts/${gcPid}/unschedule`, {}); if (u.status >= 400) throw Object.assign(new Error('x'), { unsched: true }); }
              await gc('POST', `posts/${gcPid}/cancel`, {});
              await setLock(db, r.clip, r.channel_id, { gc_cancel: 'done' }); handled = true;
            } else if (g.status === 404) { await setLock(db, r.clip, r.channel_id, { gc_cancel: 'done' }); handled = true; }
          } catch (e) { /* GrabCast không trả lời – xử lý như không gọi được */ }
        }
        if (!handled) { await setLock(db, r.clip, r.channel_id, { gc_cancel: 'pending' }); gcSchedUnreach = b.state === 'scheduled'; }
        lock = await lockOf(db, r.clip, r.channel_id);
      } else if (lock.gc_cancel === 'pending') gcSchedUnreach = b.state === 'scheduled';
      const step = metaStep({ platform: r.platform, slot_ms: r.slot_ms, lock, gcScheduledUnreachable: gcSchedUnreach }, now);
      if (step === 'done' || step === 'wait') { if (step === 'wait') rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'meta-wait' }); continue; }
      if (step === 'too-late') { await setLock(db, r.clip, r.channel_id, { state: 'skipped', err: 'too-late' }); rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'too-late' }); continue; }
      acts++;
      const url = await signed(env, c._it, 'video', 6 * 3600); if (!url) { await mfail('clip', 'not-on-drive'); continue; }
      const file_url = new URL(url, 'https://lexkite.com').toString();
      try {
        if (step === 'fb-check') {
          const s = await fbStatus(mc, lock.meta_id);
          if (s.ok && s.published) { await setLock(db, r.clip, r.channel_id, { state: 'posted', permalink: s.permalink || lock.permalink }); await done(r, bid, lock.meta_id, 'fb', s.permalink || lock.permalink, true); }
          continue;
        }
        if (step === 'fb') {
          if (lock.meta_id && lock.state === 'claimed') { // lượt trước chết sau bước start → xem video đó đã lên chưa (không đăng lần 2)
            const s = await fbStatus(mc, lock.meta_id);
            if (s.ok && s.published) { await setLock(db, r.clip, r.channel_id, { state: 'posted', permalink: s.permalink }); await done(r, bid, lock.meta_id, 'fb', s.permalink, true); continue; }
          }
          const out = await fbReel(mc, env, { file_url, description: b.caption, title: b.title, at: r.slot_ms, now, video_id: lock.meta_id && lock.state === 'claimed' ? lock.meta_id : '', onStart: vid => setLock(db, r.clip, r.channel_id, { meta_id: vid }) }).catch(e => { throw mErr(e); });
          await setLock(db, r.clip, r.channel_id, { state: out.scheduled ? 'scheduled' : 'posted', meta_id: out.video_id, permalink: out.permalink, err: null });
          await done(r, bid, out.video_id, 'fb', out.permalink, !out.scheduled);
          if (out.scheduled) M.scheduled++; else M.posted++;
          continue;
        }
        if (step === 'ig-container') {
          const cid = await igContainer(mc, env, { video_url: file_url, caption: b.caption }).catch(e => { throw mErr(e); });
          await setLock(db, r.clip, r.channel_id, { container: cid, err: null }); M.containers++;
          if (now < r.slot_ms - IG_EARLY_MS) continue;
          lock = await lockOf(db, r.clip, r.channel_id);
          for (let i = 0; i < 2; i++) { await sleep(20e3); const s = await igStatus(mc, cid); if (s.code !== 'IN_PROGRESS') break; } // tới giờ ngay: chờ ngắn (≤ 2 lần × 20 s), còn lại để lượt sau
        }
        // ig-check
        const s = await igStatus(mc, lock.container);
        if (s.code === 'IN_PROGRESS' || s.code === '') { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'ig-processing' }); continue; }
        if (s.code === 'EXPIRED') { await setLock(db, r.clip, r.channel_id, { container: null }); rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'ig-expired' }); continue; }
        if (s.code === 'ERROR') { await setLock(db, r.clip, r.channel_id, { container: null }); await mfail('ig-container', s.detail || 'ERROR'); continue; }
        if (s.code === 'PUBLISHED') { await setLock(db, r.clip, r.channel_id, { state: 'posted' }); await done(r, bid, lock.meta_id || lock.container, 'ig', lock.permalink || '', true); continue; }
        if (!quota) quota = await igQuota(mc, env);
        if (quota.ok && quota.used >= quota.cap) { rec.skipped.push({ clip: r.clip, ch: r.channel_id, why: 'ig-limit' }); continue; }
        const pub = await igPublish(mc, env, lock.container).catch(e => { throw mErr(e); });
        if (quota.ok) quota.used++;
        await setLock(db, r.clip, r.channel_id, { state: 'posted', meta_id: pub.media_id, permalink: pub.permalink, err: null });
        await done(r, bid, pub.media_id, 'ig', pub.permalink, true); M.posted++;
      } catch (e) {
        if (e.metaStop) throw e;
        await mfail(e.step || 'error', e.code || 'error');
      }
    }
  }
  /** Ghi kết quả Meta: dist_social (post_id meta_…, published/pushed) + soc_board (state, links có permalink + provider 'meta', bỏ post_id GrabCast để boardSync không ghi đè). */
  async function done(r, bid, id, k, permalink, published) {
    await DIST.social_ack(db, { clip: r.clip, channel_id: r.channel_id, state: published ? 'published' : 'pushed', post_id: `meta_${k}_${id}` });
    await run(db, "UPDATE soc_board SET state = ?, post_id = NULL, note = 'meta', links = ?, err = NULL, updated = ? WHERE id = ?", published ? 'published' : 'scheduled',
      JSON.stringify([{ a: r.channel_id.split('-').pop(), p: r.platform, s: published ? 'published' : 'scheduled', u: /^https:\/\//.test(permalink || '') ? permalink : '', e: '', v: 'meta' }]), Date.now(), bid);
  }
}
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
  'POST auto/reset': async ({ db }) => { const st = await getMeta(db, 'auto_state', {}); delete st.breaker; delete st.fails; delete st.gc_err_runs; if (st.meta) { delete st.meta.breaker; delete st.meta.token; /* Mở lại sau khi thay token → kiểm token ngay lượt sau */ } await setMeta(db, 'auto_state', st); return { ok: true }; },
  'POST auto/run': async ({ env, request, b }) => ({ run: await runAuto(env, { src: 'admin', origin: request.url, force_sync: !!b.sync }) }),
  /** Nút chuyển tay provider: auto (failover tự động) | grabcast | meta. */
  'POST auto/provider': async ({ db, b }) => { if (!PROVIDERS.includes(b.mode)) throw Object.assign(new Error('bad-input'), { status: 400, code: 'bad-input' }); const c = cleanAuto({ ...(await getMeta(db, 'auto', AUTO_DEFAULT)), provider: b.mode }); await setMeta(db, 'auto', c); return { cfg: c }; },
  /** Duyệt tay 1 bài autopilot khi đang đi qua Meta (GrabCast lỗi nên board/approve không gọi được): chỉ đánh dấu duyệt, lượt Meta đăng đúng slot. */
  'POST auto/approve': async ({ db, b, who }) => {
    const r = await one(db, 'SELECT id, state, by_who FROM soc_board WHERE id = ?', String(b.id || ''));
    if (!r || r.by_who !== AUTO_WHO) throw Object.assign(new Error('not-found'), { status: 404, code: 'not-found' });
    if (r.state !== 'review') throw Object.assign(new Error('not-in-review'), { status: 409, code: 'not-in-review' });
    const t = Date.now(); await run(db, "UPDATE soc_board SET state = 'approved', approved_by = ?, approved_at = ?, updated = ? WHERE id = ? AND state = 'review'", String(who || 'admin').slice(0, 120), t, t, r.id);
    return { id: r.id, state: 'approved' };
  },
};
export function autoOpFor(method, path) { const k = method + ' ' + String(path).replace(/^lk\//, ''); return Object.hasOwn(AUTO_OPS, k) ? AUTO_OPS[k] : null; }
