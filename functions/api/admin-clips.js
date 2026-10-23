/* Quản trị → Video: thư viện clip ở quy mô lớn (hàng nghìn clip). POST /api/admin-clips (adminGate, giới hạn tốc độ, nhật ký)
 *   query {filter, cursor, limit}  → 1 trang đã lọc/sắp xếp (phân trang con trỏ) + bìa ký sẵn CHỈ cho trang đó + facet cho ô lọc
 *   ids {filter}                   → mọi id khớp bộ lọc (≤ 20 000) cho "chọn tất cả N kết quả"
 *   export {ids ≤ 300}             → dòng CSV
 *   bulk {action, ids ≤ 100, params} → thao tác hàng loạt, kết quả TỪNG clip (client chia lô + tiếp tục khi gián đoạn)
 *     approve · unapprove · pause · resume · reject{reason} · restore · web_on · web_off · reschedule{start,days,from,to,offset,total} · channel{channel_id} · delete{hard}
 *     delete = DANGER (đăng nhập ≤ 15 phút). Xóa mềm: ẩn clip, giữ công thức; hard=true (+ confirm = 'DELETE <n>'): deleted = 2, bỏ khỏi hàng đợi/kế hoạch → drive-shorts.yml
 *     (shorts-archive.mjs) cho file Drive vào thùng rác + bỏ công thức khỏi kho lexkite-shorts → op youtube 'purged' (deleted = 3).
 *     channel{channel_id} = ghi đè kênh YouTube (yt_plan nguồn 'manual', lượt plan_run kế đặt giờ).
 * Trạng thái duyệt/loại/tạm dừng/lịch/kênh nằm ở D1 clip_review (lớp phủ trên manifest); duyệt & gói đăng dùng chung youtube.js approveClips. */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { guardBg } from './_d1guard.js';
import { limit } from './sync.js';
import { manifest, signed } from './admin-shorts.js';
import { setup, approveClips, unqueueClip, slotToIso, kick } from './youtube.js';
import { TOPICS, SKILLS, EXAMS, CEFR, TYPES } from './_taxonomy.js';
import { normFilter, viewOf, matches, sortRows, pageOf, spreadSlot, field, sectionOf, groupKey, SECTIONS, CTYPES } from './_clip_logic.js';

const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
const CLIP = /^[a-z0-9-]{3,120}$/, CHID = /^[A-Za-z0-9_-]{8,64}$/, MAX_IDS = 100, MAX_ALL = 20000;
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const run = (db, sql, ...a) => db.prepare(sql).bind(...a).run();
const ACTIONS = ['approve', 'unapprove', 'pause', 'resume', 'reject', 'restore', 'web_on', 'web_off', 'reschedule', 'channel', 'delete'];
const DANGER = new Set(['delete']);

async function context(db) {
  const c = { review: {}, queue: {}, pack: {}, web: {}, views: {} };
  for (const r of await all(db, 'SELECT * FROM clip_review')) c.review[r.clip] = r;
  for (const r of await all(db, 'SELECT clip, status, video_id, channel_id FROM yt_queue')) { c.queue[r.clip] = r; if (r.status === 'done' && r.video_id) c.web[r.clip] = r.video_id; }
  for (const r of await all(db, 'SELECT clip FROM yt_pack WHERE file_id IS NOT NULL')) c.pack[r.clip] = 1;
  const since = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10);
  try { for (const x of await all(db, "SELECT kind, SUM(n) AS n FROM ext_events WHERE kind LIKE 'vid:%' AND day >= ?1 GROUP BY kind", since)) { const [, ev, id] = String(x.kind).split(':'); if (id && (ev === 'view' || ev === 'done')) (c.views[id] = c.views[id] || {})[ev] = +x.n || 0; } } catch (e) { /* no analytics table */ }
  return c;
}
async function matching(env, db, filter) {
  const f = normFilter(filter), m = await manifest(env), c = await context(db);
  const rows = [], counts = Object.fromEntries(SECTIONS.map(k => [k, 0])), typeCounts = Object.fromEntries(CTYPES.map(k => [k, 0])), base = { ...f, hidden: true }; delete base.section; // counts cover every section (Archive too); the default-hide rule is applied below
  for (const it of m.items) { if (!it || !CLIP.test(String(it.id))) continue; const v = viewOf(it, c); if (matches(it, v, { ...base, type: undefined })) typeCounts[v.type]++;
    if (matches(it, v, base)) { const sec = sectionOf(it, v); counts[sec]++; if (f.section ? sec === f.section : f.hidden || sec !== 'archive' || f.status === 'rejected' || f.status === 'paused') rows.push({ it, v }); } }
  return { f, rows: sortRows(rows, f.sort, f.dir, f.group), items: m.items, ctx: c, counts, typeCounts };
}
const slim = ({ it, v }, covers) => ({ ...it, cover_url: covers[it.cover] || null, drive: undefined, _v: v });

const OPS = {
  async query(db, b, who, env) {
    const { f, rows, items, counts, typeCounts } = await matching(env, db, b.filter), pg = pageOf(rows, b.cursor, b.limit), covers = {};
    for (const r of pg.rows) if (r.it.cover) { const u = await signed(env, r.it, 'cover').catch(() => null); if (u) covers[r.it.cover] = u; }
    let facets;
    if (!(+b.cursor > 0)) { facets = {}; for (const k of ['format', 'template', 'scene', 'cefr', 'hook', 'host', 'bg', 'diff']) facets[k] = [...new Set(items.map(x => field(x, k)).filter(Boolean))].sort().slice(0, 200); }
    let groups; if (f.group && !(+b.cursor > 0)) { groups = {}; for (const r of rows) { const k = groupKey(r.it, f.group); groups[k] = (groups[k] || 0) + 1; } }
    return { rows: pg.rows.map(r => slim(r, covers)), total: pg.total, next: pg.next, filter: f, facets, counts, typeCounts, groups, taxonomy: facets ? { types: TYPES, topics: TOPICS, skills: SKILLS, exams: EXAMS, cefr: CEFR } : undefined };
  },
  async ids(db, b, who, env) { const { rows } = await matching(env, db, b.filter); return { ids: rows.slice(0, MAX_ALL).map(r => r.it.id), total: rows.length, capped: rows.length > MAX_ALL }; },
  async export(db, b, who, env) {
    const want = new Set((Array.isArray(b.ids) ? b.ids : []).map(String).filter(x => CLIP.test(x)).slice(0, 300)), m = await manifest(env), c = await context(db);
    return { rows: m.items.filter(it => want.has(it.id)).map(it => { const v = viewOf(it, c); return { id: it.id, title: it.title || it.point || '', scene: it.scene || '', format: it.format || '', template: it.template || '', cefr: it.cefr || '', qa: (it.qa || {}).status || '', score: v.score ?? '', created: String(it.created || '').slice(0, 10), slot: v.slot ? v.slot.date + ' ' + (v.slot.time || '') : '', state: v.rejected ? 'rejected' : v.paused ? 'paused' : v.uploaded ? 'uploaded' : v.approved ? 'approved' : '', web: v.web ? 'yes' : '', channel: v.channel, views: v.views, completion: v.views ? Math.round(v.completion * 100) + '%' : '' }; }) };
  },
  async bulk(db, b, who, env) {
    const action = String(b.action || ''); if (!ACTIONS.includes(action)) return { status: 400, error: 'op' };
    const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(String))].slice(0, MAX_IDS), p = b.params && typeof b.params === 'object' ? b.params : {};
    if (!ids.length) return { status: 400, error: 'bad-input' };
    const known = new Set((await manifest(env)).items.map(x => x && x.id)), res = [], now = Date.now();
    const good = ids.filter(id => { const ok = CLIP.test(id) && known.has(id); if (!ok) res.push({ id, ok: false, why: 'unknown' }); return ok; });
    const done = (id, ok = true, why) => res.push(ok ? { id, ok } : { id, ok, why });
    const rv = (id, patch) => { const k = Object.keys(patch); return run(db, `INSERT INTO clip_review (clip, ${k.join(', ')}, updated, by_who) VALUES (?, ${k.map(() => '?').join(', ')}, ?, ?) ON CONFLICT(clip) DO UPDATE SET ${k.map(x => x + ' = excluded.' + x).join(', ')}, updated = excluded.updated, by_who = excluded.by_who`, id, ...k.map(x => patch[x]), now, who.email); };
    if (action === 'approve') {
      const r = await approveClips(db, { ids: good, privacy: p.privacy, schedule: p.schedule }, who, env); if (r.status) return r;
      for (const q of r.queued) done(q.id); for (const s of r.skipped) done(s.id, false, s.why);
    } else if (action === 'reschedule') {
      const off = Math.max(0, Math.floor(+p.offset) || 0), total = Math.floor(+p.total) || good.length;
      if (!spreadSlot(0, Math.max(total, 1), p)) return { status: 400, error: 'bad-input' };
      for (let i = 0; i < good.length; i++) {
        const s = spreadSlot(off + i, Math.max(total, off + good.length), p); if (!s) { done(good[i], false, 'range'); continue; }
        await rv(good[i], { slot_date: s.date, slot_time: s.time });
        const iso = slotToIso({ ...s, tz: 'Asia/Ho_Chi_Minh' }, now); if (iso) await run(db, "UPDATE yt_queue SET publish_at = ? WHERE clip = ? AND status = 'queued'", iso, good[i]);
        done(good[i]);
      }
    } else if (action === 'channel') {
      const ch = String(p.channel_id || ''); if (ch && !(CHID.test(ch) && (await all(db, "SELECT 1 FROM yt_channel WHERE channel_id = ? AND status = 'ok'", ch)).length)) return { status: 404, error: 'not-found' };
      for (const id of good) { await rv(id, { channel_id: ch || null }); if (ch) await run(db, "INSERT INTO yt_plan (clip, channel_id, slot_ms, source, rule, why, updated) VALUES (?, ?, NULL, 'manual', -2, NULL, ?) ON CONFLICT(clip) DO UPDATE SET channel_id = excluded.channel_id, source = 'manual', rule = -2, updated = excluded.updated", id, ch, now); else await run(db, "DELETE FROM yt_plan WHERE clip = ? AND source = 'manual'", id); done(id); }
    } else if (action === 'reject') {
      const reason = String(p.reason || '').trim().slice(0, 200); if (!reason) return { status: 400, error: 'reason' };
      for (const id of good) { await rv(id, { state: 'rejected', reason }); await unqueueClip(db, id); done(id); }
    } else if (action === 'unapprove') {
      for (const id of good) { const q = (await all(db, 'SELECT status FROM yt_queue WHERE clip = ?', id))[0]; if (!q) { done(id, false, 'not-approved'); continue; } if (!['queued', 'failed', 'manual'].includes(q.status)) { done(id, false, q.status); continue; } await unqueueClip(db, id); done(id); }
    } else if (action === 'delete') {
      if (p.hard && String(p.confirm || '') !== 'DELETE ' + Math.floor(+p.total || good.length)) return { status: 400, error: 'confirm' };
      for (const id of good) { await rv(id, { deleted: p.hard ? 2 : 1 }); if (p.hard) { await unqueueClip(db, id); await run(db, "DELETE FROM yt_plan WHERE clip = ?", id); try { await run(db, "DELETE FROM dist_social WHERE clip = ? AND state = 'planned'", id); } catch (e) { /* table not created yet */ } } done(id); }
      if (p.hard && good.length) await kick(env, 'drive-shorts.yml').catch(() => false);
    } else {
      const patch = { pause: { state: 'paused' }, resume: { state: null, reason: null }, restore: { state: null, reason: null, deleted: 0 }, web_on: { web: 1 }, web_off: { web: 0 } }[action];
      for (const id of good) { await rv(id, patch); done(id); }
    }
    return { ok: true, action, results: res, done: res.filter(x => x.ok).length, failed: res.filter(x => !x.ok).length };
  },
};

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });
export async function onRequestPost({ request, env }) {
  const g = await adminGate(request, env, 'clp'); if (!g.who) return json(request, g.status, { error: g.error });
  const text = await request.text().catch(() => '');
  if (text.length > 65536) return json(request, 413, { error: 'too-large' });
  let b; try { b = JSON.parse(text || '{}'); } catch (e) { b = null; }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(request, 400, { error: 'body' });
  if (!Object.hasOwn(OPS, b.op)) return json(request, 400, { error: 'op' });
  const ip = request.headers.get('CF-Connecting-IP') || '?', bulk = b.op === 'bulk';
  if (await limit((bulk ? 'clipbulk:' : 'clipq:') + ip, bulk ? 60 : 240, 60)) return json(request, 429, { error: 'too-fast' });
  if (!env.DB) return json(request, 412, { error: 'not-configured' });
  { const gb = await guardBg(request, env, json); if (gb) return gb; } // cầu dao D1 (_d1guard.js): việc nền/quản trị dừng khi tài khoản đã đọc ≥ 50 % hạn mức
  const act = 'clips.' + b.op + (bulk ? '.' + String(b.action || '').slice(0, 20) : '');
  if (bulk && DANGER.has(b.action) && Date.now() / 1000 - (+g.who.auth_time || 0) > 900) { await adminAudit(env, request, g.who.email, act, false); return json(request, 401, { error: 'reauth', message: 'Sensitive action: sign out and sign in again, then retry.' }); }
  try {
    await setup(env.DB);
    const out = await OPS[b.op](env.DB, b, g.who, env), status = out.status || 200; delete out.status;
    if (bulk) await adminAudit(env, request, g.who.email, act, status < 400);
    return json(request, status, out);
  } catch (e) { if (bulk) await adminAudit(env, request, g.who.email, act, false); return json(request, e.status || 500, { error: e.code || 'error' }); }
}
