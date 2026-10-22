/* Quản lý social của Lexkite (lớp riêng trên GrabCast) – gọi qua /api/social với path "lk/…" (functions/api/social.js).
 * Dữ liệu ở D1 (env.DB): bảng duyệt bài (Idea → Draft → In review → Approved → Scheduled → Published), bộ kênh, luật hàng đợi, số liệu.
 * LUẬT CHỦ: không bài nào công khai khi chưa duyệt → social.js chặn schedule/publish-now/retry nếu bài GrabCast không có mục duyệt
 * với dấu băm nội dung (approved_hash) khớp nội dung hiện tại (sửa sau khi duyệt = phải duyệt lại).
 * GrabCast với KHÓA API chỉ cho: accounts, posts (list/get/create/patch/schedule/unschedule/publish-now/retry/cancel), media, validate, storage.
 * KHÔNG cho (api_key_not_allowed, đo 22/10): connect/*, insights, comments, inbox, approvals, best-times, queue/slots, hashtag-groups,
 * caption-templates, accounts/{id}/check → kết nối kênh mở GrabCast (popup), số liệu lấy từ nguồn khác (web, nhập tay, YouTube khi có). */
import { manifest, signed } from './admin-shorts.js';
import { field } from './_clip_logic.js';
import { runModel } from './ai.js';

// ---------------- Hàm thuần (test: scripts/test/social-mgr.mjs) ----------------
export const STATES = ['idea', 'draft', 'review', 'approved', 'scheduled', 'published', 'failed'];
// Giới hạn đăng trong 24 giờ của nền tảng (FB Reels 30, IG 100 – GrabCast trả limits.*; TikTok/YouTube/Threads ước lượng an toàn)
export const PLAT = {
  facebook_page: { cap: 30, used: 'reels_24h', capKey: 'reels_cap', kind: 'reel' },
  instagram: { cap: 100, used: 'posts_24h', capKey: 'posts_cap', kind: 'reel', cap2200: true },
  tiktok: { cap: 15, kind: 'video', privateOnly: 'tiktok-audit' },
  youtube: { cap: 6, kind: 'short', privateOnly: 'google-review' },
  threads: { cap: 250, kind: 'post' },
};
export const platOf = a => { const p = String((a && (a.platform || a.provider)) || '').toLowerCase(); return p === 'facebook' ? 'facebook_page' : p; };
const DAY = 864e5;
/** Tài khoản GrabCast → sức khỏe: trạng thái chính, đếm 24 h / trần, quyền, hết hạn, chỉ-riêng-tư. */
export function healthOf(a, posts = [], now = Date.now()) {
  const p = platOf(a), P = PLAT[p] || { cap: 50 }, lim = a.limits || {}, h = a.health || {};
  const cap = +lim[P.capKey] || P.cap;
  let used = Number.isFinite(+lim[P.used]) && lim[P.used] != null ? +lim[P.used] : null;
  if (used == null) used = posts.reduce((n, x) => n + (x.targets || []).filter(t => String(t.account_id) === String(a.id) && t.published_at && now - Date.parse(t.published_at) < DAY).length, 0);
  const exp = h.expires_at ? Date.parse(h.expires_at) : null, missing = [...(h.missing_scopes || []), ...Object.keys((a.capabilities || {}).missing_scopes || {})];
  const flags = [];
  if (a.needs_reconnect || h.needs_reconnect || /reauth|revoked|expired/.test(String(a.status || ''))) flags.push('reconnect');
  if (h.expiring_soon || (exp && exp - now < 7 * DAY)) flags.push('expiring');
  if (used >= cap) flags.push('limit'); else if (used >= cap * 0.8) flags.push('near_limit');
  if (P.privateOnly) flags.push('private_only');
  if (missing.length) flags.push('missing_scopes');
  const state = flags.includes('reconnect') ? 'reconnect' : flags.includes('limit') ? 'limit' : flags.includes('expiring') ? 'expiring' : flags.includes('near_limit') ? 'near_limit' : flags.includes('private_only') ? 'private_only' : 'ok';
  const c = a.capabilities || {};
  return { id: a.id, platform: p, name: a.display_name || a.username || String(a.id), username: a.username || '', group: a.group || null, state, flags, used, cap,
    last: a.last_published_at || null, expires_at: h.expires_at || null, checked_at: h.checked_at || null, reason: h.reason || null, missing,
    perms: { publish: !!c.publish, insights: !!c.insights, comments_read: !!c.comments_read, comments_reply: !!c.comments_reply, first_comment: !!c.first_comment, delete: c.delete || '' },
    privateOnly: P.privateOnly || null, scopes: (a.scopes || []).length };
}
const canon = v => (Array.isArray(v) ? '[' + v.map(canon).join(',') + ']' : v && typeof v === 'object' ? '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + canon(v[k])).join(',') + '}' : JSON.stringify(v ?? null));
/** Chuỗi chuẩn của nội dung bài (cái người duyệt nhìn thấy) – đổi chữ/kênh/video/tùy chọn ⇒ chuỗi khác. */
export function contentKey(p) {
  p = (p && (p.post || p)) || {};
  const t = [...(p.targets || [])].map(x => ({ a: String(x.account_id), k: x.kind || '', c: x.caption_override || '', o: x.options || {} })).sort((x, y) => (x.a < y.a ? -1 : x.a > y.a ? 1 : 0));
  return canon({ c: p.caption || '', t: p.title || '', f: p.first_comment || '', l: p.link || '', m: [...(p.media_ids || [])].map(String).sort(), t2: t });
}
export async function contentHash(p) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(contentKey(p))); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }

const tags = s => (String(s || '').match(/(^|\s)#[\p{L}\p{N}_]+/gu) || []).length;
/** Kiểm nội dung theo giới hạn thật từng nền tảng (dùng cho mục duyệt & hàng đợi tự động). */
export function validateCompose(d, plats) {
  const out = []; const cap = String(d.caption || ''), n = [...cap].length;
  if (!d.media && !d.clip) out.push({ p: '*', code: 'no-media' });
  if (!plats.length) out.push({ p: '*', code: 'no-accounts' });
  for (const p of plats) {
    const c = String((d.per && d.per[p] && d.per[p].cap) || cap), len = p === 'youtube' ? new TextEncoder().encode(c).length : [...c].length;
    const lim = { instagram: 2200, tiktok: 2200, youtube: 5000, threads: 500, facebook_page: 63206 }[p] || 2200;
    if (len > lim) out.push({ p, code: 'too-long', n: len, max: lim });
    if (p === 'instagram' && tags(c) + tags(d.first_comment) > 5) out.push({ p, code: 'hashtags', n: tags(c) + tags(d.first_comment), max: 5 }); // IG 2025+: tối đa 5 hashtag
    if (p === 'tiktok' && tags(c) > 8) out.push({ p, code: 'hashtags', n: tags(c), max: 8, lv: 'warn' });
    if (p === 'youtube' && !String(d.title || '').trim()) out.push({ p, code: 'no-title' });
    if (p === 'youtube' && /[<>]/.test(c)) out.push({ p, code: 'angle' });
    if (!c.trim() && p !== 'youtube') out.push({ p, code: 'no-caption' });
  }
  if (!n && !Object.values(d.per || {}).some(x => x && x.cap)) out.push({ p: '*', code: 'no-caption', lv: 'warn' });
  return out.map(x => ({ lv: 'error', ...x }));
}

export const DEFAULT_RULES = { perDay: { facebook_page: 2, instagram: 2, tiktok: 2, youtube: 1, threads: 3 }, minGapH: 3, hours: [8, 12, 19], tz: 'America/New_York', tzBy: {}, dupDays: 30, days: 7, skipWeekend: false };
export function cleanRules(r) {
  r = r && typeof r === 'object' ? r : {}; const d = DEFAULT_RULES, perDay = {};
  for (const p of Object.keys(PLAT)) perDay[p] = Math.max(0, Math.min(PLAT[p].cap, Math.round(+((r.perDay || {})[p] ?? d.perDay[p]) || 0)));
  const tzOk = z => { try { new Intl.DateTimeFormat('en', { timeZone: z }); return true; } catch (e) { return false; } };
  const tzBy = {}; for (const [k, v] of Object.entries(r.tzBy || {})) if (/^[A-Za-z0-9_-]{1,40}$/.test(k) && typeof v === 'string' && tzOk(v)) tzBy[k] = v;
  const hours = [...new Set((Array.isArray(r.hours) ? r.hours : d.hours).map(Math.round).filter(h => h >= 0 && h <= 23))].sort((a, b) => a - b).slice(0, 12);
  return { perDay, minGapH: Math.max(1, Math.min(24, +r.minGapH || d.minGapH)), hours: hours.length ? hours : d.hours, tz: tzOk(r.tz) ? r.tz : d.tz, tzBy,
    dupDays: Math.max(1, Math.min(365, Math.round(+r.dupDays || d.dupDays))), days: Math.max(1, Math.min(31, Math.round(+r.days || d.days))), skipWeekend: !!r.skipWeekend };
}
// giờ địa phương (tz) → mốc UTC (tự xử lý giờ mùa hè)
const partsIn = (t, tz) => Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(new Date(t)).map(x => [x.type, x.value]));
export function atTz(y, m, d, h, tz) { const want = Date.UTC(y, m - 1, d, h); let t = want; for (let i = 0; i < 3; i++) { const p = partsIn(t, tz); t += want - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute); } return t; }
/** Hàng đợi tự động: rải clip đã duyệt vào khung giờ vàng từng kênh (theo múi giờ kênh), tôn trọng trần/ngày, giãn cách tối thiểu,
 *  trần 24 h của nền tảng, chống trùng (cùng clip trên cùng kênh trong dupDays). Trả { slots:[{clip, account_id, at}], skipped:[{clip, account_id, why}] }. */
export function planQueue({ clips = [], accounts = [], taken = [], history = [], rules, now = Date.now() }) {
  const R = cleanRules(rules), slots = [], skipped = [], busy = new Map(), perDay = new Map(), used = new Map();
  const add = (aid, t) => { (busy.get(aid) || busy.set(aid, []).get(aid)).push(t); };
  for (const x of taken) { add(String(x.account_id), x.at); const k = String(x.account_id) + '|' + dayKeyTz(x.at, R.tzBy[x.account_id] || R.tz); perDay.set(k, (perDay.get(k) || 0) + 1); }
  for (const h of history) used.set(h.clip + '|' + h.account_id, Math.max(used.get(h.clip + '|' + h.account_id) || 0, h.at || 0));
  const accs = accounts.map(a => ({ ...a, id: String(a.id), p: a.platform || platOf(a) })).filter(a => (R.perDay[a.p] || 0) > 0 && a.state !== 'reconnect' && a.state !== 'limit');
  for (const a of accs) {
    const tz = R.tzBy[a.id] || R.tz, cand = [];
    for (let d = 0; d <= R.days; d++) {
      const base = partsIn(now + d * DAY, tz);
      if (R.skipWeekend && /Sat|Sun/.test(base.weekday)) continue;
      for (const h of R.hours) { const t = atTz(+base.year, +base.month, +base.day, h, tz); if (t > now + 30 * 60e3 && t <= now + (R.days + 1) * DAY) cand.push(t); }
    }
    let ci = 0;
    const room24 = Math.max(0, (a.cap || PLAT[a.p].cap) - (a.used || 0));
    let placed24 = 0;
    for (const clip of clips) {
      const last = used.get(clip.id + '|' + a.id) || 0;
      if (last && now - last < R.dupDays * DAY) { skipped.push({ clip: clip.id, account_id: a.id, why: 'duplicate' }); continue; }
      let ok = null;
      for (; ci < cand.length; ci++) {
        const t = cand[ci], k = a.id + '|' + dayKeyTz(t, tz), b = busy.get(a.id) || [];
        if ((perDay.get(k) || 0) >= R.perDay[a.p]) continue;
        if (b.some(x => Math.abs(x - t) < R.minGapH * 36e5)) continue;
        if (t - now < DAY && placed24 >= room24) continue;
        ok = t; ci++; break;
      }
      if (ok == null) { skipped.push({ clip: clip.id, account_id: a.id, why: 'no-slot' }); continue; }
      add(a.id, ok); const k = a.id + '|' + dayKeyTz(ok, tz); perDay.set(k, (perDay.get(k) || 0) + 1); if (ok - now < DAY) placed24++;
      used.set(clip.id + '|' + a.id, now); slots.push({ clip: clip.id, account_id: a.id, platform: a.p, at: ok });
    }
  }
  slots.sort((x, y) => x.at - y.at);
  return { slots, skipped, rules: R };
}
export const dayKeyTz = (t, tz) => { const p = partsIn(t, tz); return `${p.year}-${p.month}-${p.day}`; };

/** Số liệu từ nhiều nguồn → 1 dạng chuẩn. */
export function mapMetrics(src, raw) {
  raw = raw || {}; const m = raw.metrics || raw.statistics || raw, n = (...ks) => { for (const k of ks) if (m[k] != null && Number.isFinite(+m[k])) return +m[k]; return 0; };
  if (src === 'youtube') return { views: n('viewCount'), likes: n('likeCount'), comments: n('commentCount'), saves: n('favoriteCount'), shares: 0, watch_s: n('estimatedMinutesWatched') * 60 };
  if (src === 'web') return { views: n('view', 'views'), likes: 0, comments: 0, saves: 0, shares: 0, watch_s: 0, done: n('done') };
  return { views: n('views', 'plays', 'video_views', 'impressions'), likes: n('likes', 'like_count', 'reactions'), comments: n('comments', 'comment_count'), saves: n('saves', 'saved'),
    shares: n('shares', 'share_count'), watch_s: n('watch_time_s', 'total_watch_time_s') || Math.round(n('ig_reels_video_view_total_time', 'total_watch_time_ms') / 1000) };
}
/** Trọng số template/hook/độ khó cho tuần sau (VIDEO-SCALE-PLAN §13): điểm tương tác = (save·3 + share·4 + comment·2 + like) / view,
 *  làm mượt Bayes (k = 500 view ảo ở mức trung bình) → trọng số 0,5–2 quanh 1. */
export function weightsFrom(rows, k = 500) {
  const by = { template: {}, hook: {}, cefr: {} }; let V = 0, E = 0;
  const eng = r => (r.saves || 0) * 3 + (r.shares || 0) * 4 + (r.comments || 0) * 2 + (r.likes || 0);
  for (const r of rows) { V += r.views || 0; E += eng(r); for (const d of Object.keys(by)) { const key = r[d] || ''; if (!key) continue; const o = by[d][key] || (by[d][key] = { views: 0, eng: 0, n: 0 }); o.views += r.views || 0; o.eng += eng(r); o.n++; } }
  const mean = V ? E / V : 0, out = {};
  for (const [d, g] of Object.entries(by)) { out[d] = {}; for (const [key, o] of Object.entries(g)) { const rate = (o.eng + mean * k) / (o.views + k); out[d][key] = { w: mean ? Math.max(0.5, Math.min(2, Math.round(rate / mean * 100) / 100)) : 1, views: o.views, rate: Math.round(rate * 1e4) / 1e4, n: o.n }; } }
  return { mean: Math.round(mean * 1e4) / 1e4, by: out };
}

// ---------------- D1 ----------------
let ready = false;
export async function setupMgr(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS soc_board (id TEXT PRIMARY KEY, post_id TEXT, clip TEXT, title TEXT, caption TEXT, accounts TEXT, plats TEXT, template TEXT, hook TEXT, cefr TEXT, state TEXT NOT NULL, mode TEXT, want_at INTEGER, hash TEXT, approved_by TEXT, approved_at INTEGER, note TEXT, err TEXT, links TEXT, created INTEGER, updated INTEGER, by_who TEXT)'),
    db.prepare('CREATE INDEX IF NOT EXISTS soc_board_post ON soc_board (post_id)'),
    db.prepare('CREATE TABLE IF NOT EXISTS soc_sets (name TEXT PRIMARY KEY, ids TEXT NOT NULL, at INTEGER, by_who TEXT) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS soc_metrics (k TEXT PRIMARY KEY, post_id TEXT, platform TEXT, account_id TEXT, clip TEXT, template TEXT, hook TEXT, cefr TEXT, views INTEGER, likes INTEGER, comments INTEGER, saves INTEGER, shares INTEGER, watch_s INTEGER, src TEXT, at INTEGER) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS soc_meta (k TEXT PRIMARY KEY, v TEXT, at INTEGER) WITHOUT ROWID'),
  ]);
  ready = true;
}
export const _reset = () => { ready = false; };
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const one = (db, sql, ...a) => db.prepare(sql).bind(...a).first();
const run = (db, sql, ...a) => db.prepare(sql).bind(...a).run();
const getMeta = async (db, k, d) => { const r = await one(db, 'SELECT v FROM soc_meta WHERE k = ?', k); try { return r ? JSON.parse(r.v) : d; } catch (e) { return d; } };
const setMeta = (db, k, v) => run(db, 'INSERT INTO soc_meta (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at', k, JSON.stringify(v), Date.now());
const ID = /^[A-Za-z0-9_-]{1,100}$/, CLIP = /^[a-z0-9-]{3,120}$/, BID = /^b_[A-Za-z0-9_-]{6,60}$/;
const str = (v, n) => String(v == null ? '' : v).slice(0, n);
const fail = (status, error, extra) => Object.assign(new Error(error), { status, code: error, extra });
const newId = () => 'b_' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 20) : Date.now().toString(36) + Math.random().toString(36).slice(2, 10));

/** Cổng duyệt cho social.js: bài GrabCast `pid` có được phép công khai/lên lịch không? → { ok } hoặc { ok:false, error } */
export async function approvalFor(env, pid, gc) {
  if (!env.DB) return { ok: false, error: 'needs-approval-db' };
  await setupMgr(env.DB);
  const row = await one(env.DB, 'SELECT * FROM soc_board WHERE post_id = ? ORDER BY updated DESC LIMIT 1', pid);
  if (!row || !row.hash || !['approved', 'scheduled', 'published', 'failed'].includes(row.state)) return { ok: false, error: 'not-approved' };
  const r = await gc('GET', 'posts/' + pid); if (r.status >= 400) return { ok: false, error: 'upstream' };
  if (await contentHash(r.data) !== row.hash) { await run(env.DB, "UPDATE soc_board SET state = 'review', hash = NULL, approved_by = NULL, approved_at = NULL, note = 'changed-after-approval', updated = ? WHERE id = ?", Date.now(), row.id); return { ok: false, error: 'changed-since-approval' }; }
  return { ok: true, row };
}

async function approvedClips(env) {
  const m = await manifest(env), q = new Map((await all(env.DB, 'SELECT clip, status FROM yt_queue').catch(() => [])).map(r => [r.clip, r]));
  const rv = new Map((await all(env.DB, 'SELECT clip, state, deleted FROM clip_review').catch(() => [])).map(r => [r.clip, r]));
  return m.items.filter(it => it && CLIP.test(String(it.id)) && q.has(it.id) && !(rv.get(it.id) || {}).deleted && !['rejected', 'paused'].includes((rv.get(it.id) || {}).state) && !it.rejected)
    .map(it => ({ id: it.id, title: it.title || it.lesson || it.id, description: it.description || '', hashtags: Array.isArray(it.hashtags) ? it.hashtags.slice(0, 10) : [], template: it.template || '', hook: field(it, 'hook'), cefr: field(it, 'diff') || it.cefr || '', duration: +it.duration || 0, created: it.created || '', video: it.video, cover: it.cover, _it: it }));
}
const bodyFor = (clip, mediaId, accs, per = {}) => ({
  title: str(clip.title, 100), caption: str([clip.description || clip.title, (clip.hashtags || []).map(h => '#' + String(h).replace(/^#/, '')).join(' ')].filter(Boolean).join('\n\n'), 2200), media_ids: [mediaId], timezone: 'America/New_York',
  targets: accs.map(a => ({ account_id: a.id, kind: a.kind || (PLAT[a.p] || {}).kind || 'video', options: a.p === 'tiktok' ? { privacy_level: 'SELF_ONLY', allow_comment: true, allow_duet: false, allow_stitch: false, is_aigc: true } : a.p === 'youtube' ? { privacy_status: 'private', made_for_kids: false, contains_synthetic_media: true, category_id: '27' } : {}, ...(per[a.p] || {}) })),
});
async function pushClip(env, clip, gc, origin) {
  const cached = await getMeta(env.DB, 'media:' + clip.id, null); if (cached && cached.id) return cached.id;
  const url = await signed(env, clip._it, 'video', 2 * 3600); if (!url) throw fail(409, 'clip-not-on-drive');
  const src = await fetch(new URL(url, origin).toString()); if (!src.ok || !src.body) throw fail(502, 'clip-fetch');
  const bytes = +src.headers.get('Content-Length') || 0; if (!bytes) throw fail(502, 'clip-size');
  const r = await gc('POST', 'media/upload-url', { filename: clip.id + '.mp4', mime: 'video/mp4', bytes, width: 1080, height: 1920, duration_ms: Math.round(clip.duration * 1000) || undefined });
  if (r.status >= 400) throw fail(r.status, r.code);
  const u = (r.data && r.data.upload) || {}, mid = r.data && r.data.media && r.data.media.id; if (!u.url || !mid) throw fail(502, 'no-upload-url');
  const fl = new FixedLengthStream(bytes); src.body.pipeTo(fl.writable).catch(() => {});
  const put = await fetch(u.url, { method: u.method || 'PUT', headers: u.headers || { 'Content-Type': 'video/mp4' }, body: fl.readable });
  if (!put.ok) throw fail(502, 'upload-' + put.status);
  const c = await gc('POST', `media/${mid}/complete`, { width: 1080, height: 1920, duration_ms: Math.round(clip.duration * 1000) || undefined });
  if (c.status >= 400) throw fail(c.status, c.code);
  const id = (c.data && c.data.media && c.data.media.id) || mid; await setMeta(env.DB, 'media:' + clip.id, { id, at: Date.now() }); return id;
}
const rowOut = r => ({ ...r, accounts: JSON.parse(r.accounts || '[]'), plats: JSON.parse(r.plats || '[]'), links: JSON.parse(r.links || '[]'), hash: r.hash ? 1 : 0 });
/** Đồng bộ 2 chiều với GrabCast (GrabCast giữ lịch & tự đăng nền; Lexkite là nguồn sự thật cho duyệt/lịch/luật):
 *  trạng thái → cột Scheduled/Published/Failed; giờ, chữ, kênh, link, lỗi phản chiếu từ GrabCast; sửa nội dung trên GrabCast sau khi duyệt
 *  → note 'changed-in-grabcast' (bài đã lên lịch: UI đề nghị hủy lịch & duyệt lại; bài chưa lên lịch: về In review). */
export async function boardSync(db, posts) {
  const byPid = new Map(posts.map(p => [String(p.id), p])), rows = await all(db, "SELECT id, post_id, state, hash, want_at, note FROM soc_board WHERE post_id IS NOT NULL AND state NOT IN ('idea','draft','published')");
  for (const r of rows) {
    const p = byPid.get(String(r.post_id)); if (!p) continue; const s = String(p.status || ''), ts = p.targets || [];
    let ns = /^published$/.test(s) ? 'published' : /fail|error|partial/.test(s) ? 'failed' : /cancel|deleted/.test(s) ? 'draft' : /schedul|publishing|processing/.test(s) ? 'scheduled' : r.state;
    if (ns === 'scheduled' && !r.hash) ns = r.state; // lên lịch ngoài Lexkite khi chưa duyệt → giữ cột cũ, note cảnh báo
    let note = r.note;
    if (r.hash && await contentHash(p) !== r.hash) { note = 'changed-in-grabcast'; if (ns === 'approved') ns = 'review'; }
    else if (!r.hash && /schedul/.test(s)) note = 'scheduled-outside';
    else if (note === 'changed-in-grabcast' || note === 'scheduled-outside') note = null;
    const links = JSON.stringify(ts.map(t => ({ a: String(t.account_id), p: t.platform || '', s: t.state || '', u: /^https:\/\//.test(String(t.permalink || '')) ? t.permalink : '', e: t.last_error_code || '' })));
    const at = Date.parse(p.scheduled_at || '') || r.want_at;
    await run(db, `UPDATE soc_board SET state = ?, note = ?, links = ?, want_at = ?, caption = ?, title = COALESCE(?, title), accounts = ?, plats = ?, hash = CASE WHEN ? = 'review' THEN NULL ELSE hash END, updated = CASE WHEN state != ? OR COALESCE(note,'') != COALESCE(?, '') THEN ? ELSE updated END WHERE id = ?`,
      ns, note, links, at, str(p.caption, 2200), p.title || null, JSON.stringify(ts.map(t => String(t.account_id))), JSON.stringify([...new Set(ts.map(t => t.platform).filter(Boolean))]), ns, ns, note, Date.now(), r.id);
  }
}

// ---------------- Thao tác (path → hàm). GET = chỉ đọc; còn lại POST. ----------------
export const OPS = {
  'GET board': async ({ db, gc }) => {
    const pr = await gc('GET', 'posts', null, { limit: 200 }); if (pr.status < 400) await boardSync(db, (pr.data && pr.data.posts) || []);
    return { items: (await all(db, 'SELECT * FROM soc_board ORDER BY updated DESC LIMIT 500')).map(rowOut) };
  },
  'POST board/save': async ({ db, b, who }) => { // ý tưởng / nháp nội bộ (chưa có bài GrabCast)
    const id = b.id && BID.test(b.id) ? b.id : newId(), now = Date.now(), st = ['idea', 'draft'].includes(b.state) ? b.state : 'idea';
    const ex = await one(db, 'SELECT state FROM soc_board WHERE id = ?', id); if (ex && !['idea', 'draft'].includes(ex.state)) throw fail(409, 'locked');
    if (b.clip && !CLIP.test(b.clip)) throw fail(400, 'clip');
    await run(db, 'INSERT INTO soc_board (id, clip, title, note, state, created, updated, by_who) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET clip = excluded.clip, title = excluded.title, note = excluded.note, state = excluded.state, updated = excluded.updated',
      id, b.clip || null, str(b.title, 200), str(b.note, 2000), st, now, now, who);
    return { id, state: st };
  },
  'POST board/submit': async ({ db, b, who, gc }) => { // bài GrabCast (nháp) → chờ duyệt
    if (!ID.test(String(b.post_id || ''))) throw fail(400, 'post_id');
    const r = await gc('GET', 'posts/' + b.post_id); if (r.status >= 400) throw fail(r.status, r.code);
    const p = (r.data && (r.data.post || r.data)) || {}, now = Date.now(), want = +b.want_at || null;
    if (want && want < now + 60e3) throw fail(400, 'past');
    const ex = await one(db, 'SELECT id FROM soc_board WHERE post_id = ?', b.post_id), id = ex ? ex.id : (b.id && BID.test(b.id) ? b.id : newId());
    const accs = (p.targets || []).map(t => String(t.account_id)), plats = [...new Set((p.targets || []).map(t => t.platform).filter(Boolean))];
    const clip = b.clip && CLIP.test(b.clip) ? b.clip : null;
    await run(db, `INSERT INTO soc_board (id, post_id, clip, title, caption, accounts, plats, template, hook, cefr, state, mode, want_at, hash, created, updated, by_who) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'review', ?, ?, NULL, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET post_id = excluded.post_id, clip = COALESCE(excluded.clip, soc_board.clip), title = excluded.title, caption = excluded.caption, accounts = excluded.accounts, plats = excluded.plats, template = COALESCE(excluded.template, soc_board.template), hook = COALESCE(excluded.hook, soc_board.hook), state = 'review', mode = excluded.mode, want_at = excluded.want_at, hash = NULL, approved_by = NULL, approved_at = NULL, updated = excluded.updated`,
      id, b.post_id, clip, str(p.title || b.title, 200), str(p.caption, 2200), JSON.stringify(accs), JSON.stringify(plats), b.template ? str(b.template, 60) : null, b.hook ? str(b.hook, 60) : null, b.cefr ? str(b.cefr, 10) : null, b.mode === 'now' ? 'now' : 'sched', want, now, now, who);
    return { id, state: 'review' };
  },
  'POST board/move': async ({ db, b }) => { // kéo thả giữa các cột KHÔNG công khai (idea/draft/review); duyệt dùng board/approve
    const r = await one(db, 'SELECT * FROM soc_board WHERE id = ?', String(b.id || '')); if (!r) throw fail(404, 'not-found');
    if (!['idea', 'draft', 'review'].includes(b.state)) throw fail(400, 'state');
    if (['scheduled', 'published'].includes(r.state)) throw fail(409, 'locked');
    if (b.state === 'review' && !r.post_id) throw fail(409, 'needs-post');
    await run(db, 'UPDATE soc_board SET state = ?, hash = NULL, approved_by = NULL, approved_at = NULL, note = COALESCE(?, note), updated = ? WHERE id = ?', b.state, b.note ? str(b.note, 2000) : null, Date.now(), r.id);
    return { id: r.id, state: b.state };
  },
  'POST board/approve': async ({ db, b, who, gc, idem }) => {
    const r = await one(db, 'SELECT * FROM soc_board WHERE id = ?', String(b.id || '')); if (!r) throw fail(404, 'not-found');
    if (r.state !== 'review' || !r.post_id) throw fail(409, 'not-in-review');
    const pr = await gc('GET', 'posts/' + r.post_id); if (pr.status >= 400) throw fail(pr.status, 'upstream');
    const hash = await contentHash(pr.data), now = Date.now();
    await run(db, "UPDATE soc_board SET state = 'approved', hash = ?, approved_by = ?, approved_at = ?, err = NULL, updated = ? WHERE id = ?", hash, who, now, now, r.id);
    if (b.publish === false) return { id: r.id, state: 'approved' };
    const at = r.mode === 'now' ? null : (+b.at || r.want_at);
    if (r.mode !== 'now' && (!at || at < now + 60e3)) return { id: r.id, state: 'approved', note: 'pick-time' };
    const s = await gc('POST', `posts/${r.post_id}/${at ? 'schedule' : 'publish-now'}`, at ? { scheduled_at: new Date(at).toISOString(), consent: true } : { consent: true }, null, idem);
    if (s.status >= 400) { await run(db, 'UPDATE soc_board SET err = ?, updated = ? WHERE id = ?', str(s.code || s.status, 200), Date.now(), r.id); return { status: s.status, id: r.id, state: 'approved', error: s.code }; }
    await run(db, "UPDATE soc_board SET state = 'scheduled', want_at = ?, updated = ? WHERE id = ?", at || now, Date.now(), r.id);
    return { id: r.id, state: 'scheduled' };
  },
  'POST board/duplicate': async ({ db, b, who, gc, idem }) => { // nhân bản / đăng lại: bài GrabCast NHÁP mới cùng nội dung → cột Nháp (phải duyệt lại)
    const r = await one(db, 'SELECT * FROM soc_board WHERE id = ?', String(b.id || '')); if (!r || !r.post_id) throw fail(404, 'not-found');
    const g = await gc('GET', 'posts/' + r.post_id); if (g.status >= 400) throw fail(g.status, g.code);
    const p = (g.data && (g.data.post || g.data)) || {};
    const body = { caption: p.caption || '', title: p.title || undefined, first_comment: p.first_comment || undefined, link: p.link || undefined, media_ids: p.media_ids || [], timezone: p.timezone || 'America/New_York',
      targets: (p.targets || []).map(t => ({ account_id: t.account_id, kind: t.kind, options: t.options || {}, ...(t.caption_override ? { caption_override: t.caption_override } : {}) })) };
    const c = await gc('POST', 'posts', body, null, idem); if (c.status >= 400) throw fail(c.status, c.code);
    const pid = String((c.data && (c.data.post || c.data).id) || ''); if (!ID.test(pid)) throw fail(502, 'no-post-id');
    const id = newId(), now = Date.now();
    await run(db, "INSERT INTO soc_board (id, post_id, clip, title, caption, accounts, plats, template, hook, cefr, state, mode, created, updated, by_who) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 'sched', ?, ?, ?)",
      id, pid, r.clip, r.title, r.caption, r.accounts, r.plats, r.template, r.hook, r.cefr, now, now, who);
    return { id, post_id: pid, state: 'draft' };
  },
  'POST board/time': async ({ db, b }) => { // đặt giờ mong muốn (trước khi duyệt)
    const r = await one(db, 'SELECT state FROM soc_board WHERE id = ?', String(b.id || '')); if (!r) throw fail(404, 'not-found');
    if (!['idea', 'draft', 'review', 'approved'].includes(r.state)) throw fail(409, 'locked');
    const at = +b.at; if (!at || at < Date.now() + 60e3) throw fail(400, 'past');
    await run(db, "UPDATE soc_board SET want_at = ?, mode = 'sched', updated = ? WHERE id = ?", at, Date.now(), String(b.id)); return { ok: true };
  },
  'POST board/delete': async ({ db, b }) => {
    const r = await one(db, 'SELECT state FROM soc_board WHERE id = ?', String(b.id || '')); if (!r) throw fail(404, 'not-found');
    if (['scheduled', 'published'].includes(r.state)) throw fail(409, 'locked');
    await run(db, 'DELETE FROM soc_board WHERE id = ?', String(b.id)); return { ok: true };
  },
  'GET sets': async ({ db }) => ({ sets: (await all(db, 'SELECT name, ids, at FROM soc_sets ORDER BY name')).map(r => ({ name: r.name, ids: JSON.parse(r.ids || '[]') })) }),
  'POST sets/save': async ({ db, b, who }) => {
    const name = str(b.name, 60).trim(), ids = Array.isArray(b.ids) ? [...new Set(b.ids.map(String).filter(x => ID.test(x)))].slice(0, 100) : [];
    if (!name || !ids.length) throw fail(400, 'set');
    await run(db, 'INSERT INTO soc_sets (name, ids, at, by_who) VALUES (?, ?, ?, ?) ON CONFLICT(name) DO UPDATE SET ids = excluded.ids, at = excluded.at, by_who = excluded.by_who', name, JSON.stringify(ids), Date.now(), who);
    return { ok: true };
  },
  'POST sets/delete': async ({ db, b }) => { await run(db, 'DELETE FROM soc_sets WHERE name = ?', str(b.name, 60)); return { ok: true }; },
  'GET health': async ({ gc }) => {
    const [ar, pr] = await Promise.all([gc('GET', 'accounts'), gc('GET', 'posts', null, { limit: 200 })]);
    if (ar.status >= 400) throw fail(ar.status, ar.code);
    const posts = (pr.data && pr.data.posts) || [], accs = ((ar.data && ar.data.accounts) || []).map(a => healthOf(a, posts));
    return { accounts: accs, groups: (ar.data && ar.data.groups) || [], summary: (ar.data && ar.data.summary) || null, at: Date.now() };
  },
  'GET clips': async ({ db, env }) => {
    const cl = await approvedClips(env), used = {};
    for (const r of await all(db, "SELECT clip, accounts, state, updated FROM soc_board WHERE clip IS NOT NULL AND state NOT IN ('idea','draft')")) for (const a of JSON.parse(r.accounts || '[]')) (used[r.clip] = used[r.clip] || []).push({ a, s: r.state, at: r.updated });
    return { clips: cl.map(({ _it, video, ...c }) => c).slice(0, 2000), used };
  },
  'POST clips/push': async ({ env, b, gc, request }) => {
    const c = (await approvedClips(env)).find(x => x.id === b.clip); if (!c) throw fail(404, 'clip-not-approved');
    return { media_id: await pushClip(env, c, gc, request.url) };
  },
  'GET rules': async ({ db }) => ({ rules: cleanRules(await getMeta(db, 'rules', DEFAULT_RULES)) }),
  'POST rules/save': async ({ db, b }) => { const r = cleanRules(b.rules); await setMeta(db, 'rules', r); return { rules: r }; },
  'POST queue/plan': async ({ db, env, b, gc }) => {
    const rules = cleanRules({ ...(await getMeta(db, 'rules', DEFAULT_RULES)), ...(b.days ? { days: b.days } : {}) });
    const [ar, pr] = await Promise.all([gc('GET', 'accounts'), gc('GET', 'posts', null, { limit: 200 })]);
    if (ar.status >= 400) throw fail(ar.status, ar.code);
    const posts = (pr.data && pr.data.posts) || [], want = Array.isArray(b.accounts) ? new Set(b.accounts.map(String)) : null;
    const accounts = ((ar.data && ar.data.accounts) || []).map(a => healthOf(a, posts)).filter(a => !want || want.has(String(a.id)));
    const taken = posts.flatMap(p => (p.targets || []).filter(t => /schedul/.test(String(t.state || p.status))).map(t => ({ account_id: t.account_id, at: Date.parse(t.scheduled_at || p.scheduled_at) })).filter(x => x.at));
    for (const r of await all(db, "SELECT accounts, want_at FROM soc_board WHERE state IN ('review','approved') AND want_at IS NOT NULL")) for (const a of JSON.parse(r.accounts || '[]')) taken.push({ account_id: a, at: r.want_at });
    const history = [];
    for (const r of await all(db, "SELECT clip, accounts, COALESCE(want_at, updated) AS at FROM soc_board WHERE clip IS NOT NULL AND state NOT IN ('idea','draft')")) for (const a of JSON.parse(r.accounts || '[]')) history.push({ clip: r.clip, account_id: a, at: r.at });
    let clips = (await approvedClips(env)).map(({ _it, ...c }) => c);
    if (Array.isArray(b.clips) && b.clips.length) { const s = new Set(b.clips); clips = clips.filter(c => s.has(c.id)); }
    const lim = Math.max(1, Math.min(200, +b.max || 60));
    const plan = planQueue({ clips: clips.slice(0, 300), accounts, taken, history, rules });
    return { ...plan, slots: plan.slots.slice(0, lim), clips: Object.fromEntries(clips.map(c => [c.id, { title: c.title, template: c.template, hook: c.hook }])) };
  },
  'POST queue/apply': async ({ db, env, b, who, gc, idem, request }) => { // ≤ 5 clip/lượt; mỗi clip 1 bài GrabCast NHÁP (nhiều kênh cùng giờ gộp) → chờ duyệt
    const items = Array.isArray(b.items) ? b.items.slice(0, 5) : []; if (!items.length) throw fail(400, 'items');
    const clips = await approvedClips(env), ar = await gc('GET', 'accounts'); if (ar.status >= 400) throw fail(ar.status, 'upstream');
    const accById = new Map(((ar.data && ar.data.accounts) || []).map(a => [String(a.id), { id: a.id, p: platOf(a), kind: (a.kinds || []).includes(PLAT[platOf(a)] && PLAT[platOf(a)].kind) ? PLAT[platOf(a)].kind : (a.kinds || [])[0] }]));
    const out = [];
    for (const [i, it] of items.entries()) {
      try {
        const c = clips.find(x => x.id === it.clip); if (!c) throw fail(404, 'clip-not-approved');
        const accs = (it.account_ids || []).map(String).map(id => accById.get(id)).filter(Boolean); if (!accs.length) throw fail(400, 'accounts');
        const at = +it.at; if (!at || at < Date.now() + 10 * 60e3) throw fail(400, 'past');
        const body = bodyFor(c, await pushClip(env, c, gc, request.url), accs);
        const v = validateCompose({ caption: body.caption, title: body.title, clip: c.id }, accs.map(a => a.p)).filter(x => x.lv === 'error'); if (v.length) throw fail(400, 'invalid', v);
        const cr = await gc('POST', 'posts', body, null, idem ? `${idem}-${i}` : null); if (cr.status >= 400) throw fail(cr.status, cr.code);
        const pid = (cr.data && (cr.data.post || cr.data).id); if (!pid) throw fail(502, 'no-post-id');
        await OPS['POST board/submit']({ db, who, gc, b: { post_id: String(pid), clip: c.id, template: c.template, hook: c.hook, cefr: c.cefr, want_at: at, mode: 'sched' } });
        out.push({ clip: c.id, ok: true, post_id: pid });
      } catch (e) { out.push({ clip: it.clip, ok: false, error: e.code || 'error', detail: e.extra }); if (e.code === 'grabcast-rate') break; }
    }
    return { results: out };
  },
  'GET metrics': async ({ db }) => {
    const rows = await all(db, 'SELECT * FROM soc_metrics ORDER BY at DESC LIMIT 2000');
    return { rows, weights: await getMeta(db, 'weights', null), sync: await getMeta(db, 'metrics_sync', null) };
  },
  'POST metrics/import': async ({ db, b }) => { // nhập tay / CSV (Meta Business Suite, TikTok Studio) khi API không cho đọc số liệu
    const rows = Array.isArray(b.rows) ? b.rows.slice(0, 500) : []; let n = 0;
    for (const r of rows) {
      const pid = str(r.post_id, 100), plat = str(r.platform, 20); if (!pid || !ID.test(pid)) continue;
      const m = mapMetrics(r.src === 'youtube' ? 'youtube' : 'grabcast', r), bd = await one(db, 'SELECT clip, template, hook, cefr FROM soc_board WHERE post_id = ?', pid) || {};
      await upMetric(db, { k: plat + ':' + pid, post_id: pid, platform: plat, account_id: str(r.account_id, 40), clip: bd.clip || str(r.clip, 120), template: bd.template || str(r.template, 60), hook: bd.hook || str(r.hook, 60), cefr: bd.cefr || '', ...m, src: 'manual' }); n++;
    }
    return { imported: n, weights: await recompute(db) };
  },
  'POST metrics/sync': async ({ db, gc }) => { // thử GrabCast insights (khóa API hiện bị chặn) + lượt xem bản web (ext_events vid:*)
    const pr = await gc('GET', 'posts', null, { limit: 200 }), posts = ((pr.data && pr.data.posts) || []).filter(p => /published/.test(String(p.status)));
    const st = { at: Date.now(), grabcast: 'ok', web: 0, n: 0 };
    for (const p of posts.slice(0, 20)) {
      const r = await gc('GET', `posts/${p.id}/insights`);
      if (r.status === 403) { st.grabcast = r.code || 'forbidden'; break; }
      if (r.status >= 400) continue;
      const bd = await one(db, 'SELECT clip, template, hook, cefr FROM soc_board WHERE post_id = ?', String(p.id)) || {};
      for (const t of (r.data && r.data.targets) || [{ platform: 'all', account_id: '', metrics: r.data && r.data.metrics }]) { await upMetric(db, { k: (t.platform || 'all') + ':' + p.id, post_id: String(p.id), platform: t.platform || '', account_id: String(t.account_id || ''), clip: bd.clip || '', template: bd.template || '', hook: bd.hook || '', cefr: bd.cefr || '', ...mapMetrics('grabcast', t), src: 'grabcast' }); st.n++; }
    }
    try {
      const since = new Date(Date.now() - 90 * DAY).toISOString().slice(0, 10), web = {};
      for (const x of await all(db, "SELECT kind, SUM(n) AS n FROM ext_events WHERE kind LIKE 'vid:%' AND day >= ? GROUP BY kind", since)) { const [, ev, id] = String(x.kind).split(':'); if (id && CLIP.test(id)) (web[id] = web[id] || {})[ev] = +x.n || 0; }
      const meta = new Map((await all(db, 'SELECT clip, template, hook, cefr FROM soc_board WHERE clip IS NOT NULL')).map(r => [r.clip, r]));
      for (const [id, v] of Object.entries(web)) { const bd = meta.get(id) || {}; await upMetric(db, { k: 'web:' + id, post_id: '', platform: 'web', account_id: '', clip: id, template: bd.template || '', hook: bd.hook || '', cefr: bd.cefr || '', ...mapMetrics('web', v), src: 'web' }); st.web++; }
    } catch (e) { /* chưa có bảng ext_events */ }
    await setMeta(db, 'metrics_sync', st);
    return { ...st, weights: await recompute(db) };
  },
  'POST ai/caption': async ({ env, b }) => { // gợi ý caption + hashtag theo luật viral (VIDEO-SCALE-PLAN §13), pool Gemini miễn phí
    const plats = (Array.isArray(b.plats) ? b.plats : []).filter(p => PLAT[p]).slice(0, 5);
    let c = null; if (b.clip && CLIP.test(b.clip)) c = (await approvedClips(env)).find(x => x.id === b.clip) || null;
    const sys = 'You write short-video captions for Lexkite, a free English-learning app (teacher-led news-style shorts). Rules: hook in the first line (<= 8 words; rotate styles: direct question, "Don\'t say X", number, challenge "Can you answer?", surprising fact, POV, textbook vs real American, "90% get this wrong", A/B debate); one learning point; give a reason to SAVE ("Save this for later") and to SHARE ("Send this to a friend who says X"); end with an open question or quiz to drive comments; soft CTA to the free lesson at lexkite.com (no hard selling); plain US English, no emojis spam (max 2), no fake claims, no real people. Hashtags: 3-5 relevant, mix broad (#learnenglish) and niche; Instagram max 5. Reply JSON: {"hooks":[3 strings],"caption":string <= 900 chars without hashtags,"hashtags":[strings without #],"first_comment":string (the quiz answer to pin)}.';
    const prompt = JSON.stringify({ title: str(b.title || (c && c.title), 200), draft: str(b.caption, 1500), description: str(c && c.description, 600), template: c && c.template, hook_style: c && c.hook, level: c && c.cefr, platforms: plats });
    let r; try { r = await runModel(env, sys, prompt, 0.7); } catch (e) { throw fail(503, 'ai-unavailable'); }
    const o = r.out || {}, tagsOut = (Array.isArray(o.hashtags) ? o.hashtags : []).map(t => String(t).replace(/^#/, '').replace(/[^\p{L}\p{N}_]/gu, '')).filter(Boolean).slice(0, plats.includes('instagram') ? 5 : 8);
    return { hooks: (Array.isArray(o.hooks) ? o.hooks : []).map(x => str(x, 120)).slice(0, 3), caption: str(o.caption, 1500), hashtags: tagsOut, first_comment: str(o.first_comment, 300), model: r.model };
  },
  'GET lib': async ({ db }) => ({ tpl: await getMeta(db, 'lib:tpl', null), tags: await getMeta(db, 'lib:tags', null) }), // mẫu caption & bộ hashtag (GrabCast chỉ có trong UI, không qua khóa API)
  'POST lib/save': async ({ db, b }) => {
    if (!['tpl', 'tags'].includes(b.kind) || !Array.isArray(b.items) || b.items.length > 200) throw fail(400, 'lib');
    const items = b.items.filter(x => x && typeof x === 'object').map(x => (b.kind === 'tpl' ? { name: str(x.name, 60), body: str(x.body, 5000) } : { name: str(x.name, 60), tags: (Array.isArray(x.tags) ? x.tags : []).slice(0, 30).map(t => str(t, 60)) }));
    if (JSON.stringify(items).length > 60000) throw fail(413, 'too-large');
    await setMeta(db, 'lib:' + b.kind, items); return { ok: true, n: items.length };
  },
  'GET weights': async ({ db }) => ({ weights: await getMeta(db, 'weights', null) }),
};
async function upMetric(db, m) {
  await run(db, `INSERT INTO soc_metrics (k, post_id, platform, account_id, clip, template, hook, cefr, views, likes, comments, saves, shares, watch_s, src, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(k) DO UPDATE SET views = excluded.views, likes = excluded.likes, comments = excluded.comments, saves = excluded.saves, shares = excluded.shares, watch_s = excluded.watch_s, template = excluded.template, hook = excluded.hook, cefr = excluded.cefr, src = excluded.src, at = excluded.at`,
  m.k, m.post_id, m.platform, m.account_id, m.clip, m.template, m.hook, m.cefr, m.views | 0, m.likes | 0, m.comments | 0, m.saves | 0, m.shares | 0, m.watch_s | 0, m.src, Date.now());
}
async function recompute(db) { const w = weightsFrom((await all(db, "SELECT * FROM soc_metrics WHERE platform != 'web'"))); w.at = Date.now(); await setMeta(db, 'weights', w); return w; }

/** Ánh xạ path "lk/…" → thao tác; null = không có. */
export function opFor(method, path) { const k = method + ' ' + path.replace(/^lk\//, ''); return Object.hasOwn(OPS, k) ? OPS[k] : null; }
