/* Quản trị → "Kênh & phân phối": cấu hình từng kênh YouTube, luật định tuyến (khớp đầu tiên thắng + dự phòng), lịch đăng theo kênh. POST /api/distribution (adminGate, nhật ký, giới hạn tốc độ)
 *   get · cfg_set {channel_id, cfg} · rules_set {rules[], fallback} · plan_run {replan?} · plan_get {channel_id?, days?} · plan_set {ids, channel_id, slot?} · resume {channel_id} · alerts_clear
 * Mạng xã hội (FB/IG/TikTok/Threads/YouTube công khai qua GrabCast): ext_sync {accounts} (bản sao kênh của tác tử social) · social_due · social_ack – hợp đồng ở docs/DISTRIBUTION.md.
 *   test_clip {clip|sample} · meta {clip, platforms} · embed_status (kênh nhúng, hàng chờ bài học, video hỏng → dự phòng tự lưu, bản đồ phủ).
 * Bộ máy thuần ở _distribution.js (định tuyến, hạn mức/ngày, giãn cách, khung giờ theo múi giờ kênh, jitter ±20 phút, chống trùng tiêu đề/bìa, đa dạng mẫu); luồng đăng tay: gói đăng hiện
 * "Đăng lên kênh X lúc HH:mm", sync kiểm video rơi đúng kênh (youtube.js). Khi API được duyệt, cùng kế hoạch (yt_plan) điều khiển đăng tự động. */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { guardBg } from './_d1guard.js';
import { limit } from './sync.js';
import { manifest } from './admin-shorts.js';
import { setup, chanCfg, pauseChannel } from './youtube.js';
import { normCfg, route, routeAll, pickEmbed, explain, platformOf, planAll, localDate, localHM } from './_distribution.js';
import { embedMeta, socialMeta, PLATFORMS } from './_role_meta.js';
import { viewOf, typeOf } from './_clip_logic.js';
import { TOPICS, SKILLS, EXAMS, CEFR, TYPES } from './_taxonomy.js';

const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
const CLIP = /^[a-z0-9-]{3,120}$/, CHID = /^[A-Za-z0-9_-]{8,96}$/, COND = ['type', 'topic', 'skill', 'cefr', 'exam', 'region', 'template', 'scene'];
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const run = (db, sql, ...a) => db.prepare(sql).bind(...a).run();
const meta = async (db, k) => ((await db.prepare('SELECT v FROM yt_meta WHERE k = ?').bind(k).first()) || {}).v || null;
const setMeta = (db, k, v) => run(db, 'INSERT INTO yt_meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, v);
const rules = async db => (await all(db, 'SELECT * FROM yt_rules ORDER BY pos, id')).map(r => { let cond = {}; try { cond = JSON.parse(r.cond || '{}'); } catch (e) { /* empty */ } return { id: r.id, name: r.name, cond, channel_id: r.channel_id, active: r.active }; });
async function channels(db) {
  const out = []; for (const c of await all(db, 'SELECT channel_id, title, thumb, status, email FROM yt_channel ORDER BY id')) { const x = await chanCfg(db, c.channel_id); out.push({ channel_id: c.channel_id, title: c.title, thumb: c.thumb, status: c.status, cfg: x.cfg, paused_reason: x.paused_reason }); }
  for (const c of await all(db, 'SELECT channel_id, platform, title, thumb, status FROM dist_ext ORDER BY platform, title')) { const x = await chanCfg(db, c.channel_id); out.push({ ...c, cfg: { ...x.cfg, role: 'social' }, paused_reason: x.paused_reason, ext: 1 }); }
  return out.map(c => ({ ...c, platform: c.platform || platformOf(c.channel_id) }));
}
let DS = false;
export async function setupDist(db) {
  if (DS) return; await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS dist_ext (channel_id TEXT PRIMARY KEY, platform TEXT, account_id TEXT, title TEXT, thumb TEXT, status TEXT, updated INTEGER)'),
    db.prepare('CREATE TABLE IF NOT EXISTS dist_social (clip TEXT NOT NULL, channel_id TEXT NOT NULL, platform TEXT, slot_ms INTEGER, source TEXT, rule INTEGER, state TEXT, post_id TEXT, err TEXT, updated INTEGER, PRIMARY KEY (clip, channel_id))'),
    db.prepare('CREATE INDEX IF NOT EXISTS dist_social_slot ON dist_social (slot_ms)'), // social_due theo slot_ms (autopilot mỗi ≥ 30 phút) – không quét cả bảng
  ]); DS = true;
}
const isExt = id => /^gc-[a-z_]+-[A-Za-z0-9_-]{1,80}$/.test(String(id || ''));
const knownIds = async db => new Set([...(await all(db, 'SELECT channel_id FROM yt_channel')), ...(await all(db, 'SELECT channel_id FROM dist_ext'))].map(r => r.channel_id));
const clipOf = (it, qt) => { const v = viewOf(it, { review: {}, queue: {}, pack: {}, web: {}, views: {} }); return { id: it.id, type: v.type, topic: v.topic, sub: v.sub, skill: v.skill, cefr: it.cefr, exam: v.exam, template: it.template, scene: it.scene, hook: it.hook, point: it.point, keyword: it.keyword, slug: it.slug, region: it.region, title: it.title || qt || it.id, cover: it.cover_sha || it.cover_hash || '' }; };
async function cfgMap(db) { const m = {}; for (const c of await channels(db)) if (c.status === 'ok') m[c.channel_id] = c.cfg; return m; }
/** Embed-channel load for pickEmbed: clips planned/uploaded per channel (today = touched since 00:00 UTC). */
async function embedCounts(db) {
  const day = Date.now() - (Date.now() % 864e5), m = {};
  for (const r of await all(db, "SELECT channel_id, updated FROM yt_plan WHERE channel_id IS NOT NULL UNION ALL SELECT channel_id, updated FROM yt_queue WHERE channel_id IS NOT NULL AND clip NOT IN (SELECT clip FROM yt_plan)")) { const c = m[r.channel_id] = m[r.channel_id] || { today: 0, total: 0 }; c.total++; if (r.updated >= day) c.today++; }
  return m;
}
const dflt = async db => (await meta(db, 'default_channel')) || null;

const OPS = {
  async get(db) {
    let alerts = []; try { alerts = JSON.parse((await meta(db, 'alerts')) || '[]'); } catch (e) { /* none */ }
    return { channels: await channels(db), rules: await rules(db), fallback: await dflt(db), alerts, taxonomy: { types: TYPES, topics: TOPICS, skills: SKILLS, exams: EXAMS, cefr: CEFR }, now: Date.now() };
  },
  async cfg_set(db, b, who) {
    const id = String(b.channel_id || ''); if (!CHID.test(id) || !(await knownIds(db)).has(id)) return { status: 404, error: 'not-found' };
    const cfg = normCfg(b.cfg); if (isExt(id)) cfg.role = 'social'; // embed = YouTube only (lessons play YouTube ids)
    const was = await chanCfg(db, id);
    await run(db, 'INSERT INTO yt_chan_cfg (channel_id, cfg, paused_reason, updated) VALUES (?, ?, ?, ?) ON CONFLICT(channel_id) DO UPDATE SET cfg = excluded.cfg, paused_reason = excluded.paused_reason, updated = excluded.updated', id, JSON.stringify(cfg), cfg.active ? '' : was.paused_reason, Date.now());
    return { ok: true, cfg };
  },
  async resume(db, b) { const id = String(b.channel_id || ''); if (!CHID.test(id)) return { status: 400, error: 'bad-input' }; const x = await chanCfg(db, id); await run(db, 'INSERT INTO yt_chan_cfg (channel_id, cfg, paused_reason, updated) VALUES (?, ?, ?, ?) ON CONFLICT(channel_id) DO UPDATE SET cfg = excluded.cfg, paused_reason = \'\', updated = excluded.updated', id, JSON.stringify({ ...x.cfg, active: 1 }), '', Date.now()); return { ok: true }; },
  async alerts_clear(db) { await setMeta(db, 'alerts', '[]'); return { ok: true }; },
  async rules_set(db, b) {
    const list = Array.isArray(b.rules) ? b.rules.slice(0, 50) : null; if (!list) return { status: 400, error: 'bad-input' };
    const known = await knownIds(db), clean = [];
    for (const r of list) {
      if (!r || typeof r !== 'object' || !known.has(String(r.channel_id))) return { status: 400, error: 'bad-channel' };
      const cond = {}; for (const k of COND) { const v = r.cond && r.cond[k]; if (typeof v === 'string' && v.trim()) cond[k] = v.trim().slice(0, 100); }
      if (!Object.keys(cond).length) return { status: 400, error: 'empty-condition' };
      clean.push({ name: String(r.name || '').slice(0, 60), cond, channel_id: String(r.channel_id), active: r.active === 0 || r.active === false ? 0 : 1 });
    }
    const fb = b.fallback == null || b.fallback === '' ? null : String(b.fallback); if (fb && (!known.has(fb) || isExt(fb))) return { status: 400, error: 'bad-channel' };
    await db.batch([db.prepare('DELETE FROM yt_rules'), ...clean.map((r, i) => db.prepare('INSERT INTO yt_rules (pos, name, cond, channel_id, active) VALUES (?, ?, ?, ?, ?)').bind(i, r.name, JSON.stringify(r.cond), r.channel_id, r.active))]);
    if (fb) await setMeta(db, 'default_channel', fb);
    return { ok: true, count: clean.length };
  },
  /** Route + schedule approved clips that have no slot yet (manual overrides are kept; replan:true re-plans the automatic ones). */
  async plan_run(db, b, who, env) {
    const now = Date.now(), m = await manifest(env), by = new Map(m.items.map(x => [x.id, x]));
    if (b.replan) await run(db, "DELETE FROM yt_plan WHERE source = 'auto' AND clip IN (SELECT clip FROM yt_queue WHERE status IN ('manual', 'queued'))");
    const q = await all(db, "SELECT q.clip, q.title, q.video_id FROM yt_queue q WHERE q.status IN ('manual', 'queued') ORDER BY q.approved_at"), planned = new Map((await all(db, 'SELECT * FROM yt_plan')).map(r => [r.clip, r]));
    const cfgs = await cfgMap(db), embedCfgs = Object.fromEntries(Object.entries(cfgs).filter(([id, c]) => c.role === 'embed' && !isExt(id))), counts = await embedCounts(db), rl = (await rules(db)).filter(r => r.active), fb = await dflt(db), routed = {}, skipped = [], rows = [];
    const ytRules = rl.filter(r => platformOf(r.channel_id) === 'youtube'), soRules = rl.filter(r => platformOf(r.channel_id) !== 'youtube'), social = {}, sRows = new Map(), sDone = new Set((await all(db, 'SELECT clip, channel_id FROM dist_social')).map(r => r.clip + '|' + r.channel_id));
    for (const r of q) {
      const it = by.get(r.clip); if (!it) { skipped.push({ id: r.clip, why: 'unknown' }); continue; }
      const old = planned.get(r.clip), c = clipOf(it, r.title);
      for (const so of routeAll(soRules, cfgs, c, null)) if (!sDone.has(r.clip + '|' + so.channel_id)) { (social[so.channel_id] = social[so.channel_id] || []).push(c); sRows.set(r.clip + '|' + so.channel_id, so); }
      if (old && old.source === 'manual' && old.slot_ms) continue;
      let ch = old && old.source === 'manual' ? { channel_id: old.channel_id, rule: -2 } : route(ytRules, cfgs, c, fb);
      if (ch.rule !== -2 && ch.channel_id && embedCfgs[ch.channel_id]) { const pick = pickEmbed(embedCfgs, counts, { ...c, channel_id: old && old.channel_id, video_id: r.video_id }); // several embed channels → rotate
        if (pick) { ch = { ...ch, channel_id: pick }; (counts[pick] = counts[pick] || { today: 0, total: 0 }); if (!old || old.channel_id !== pick) { counts[pick].today++; counts[pick].total++; } } }
      if (!ch.channel_id || !cfgs[ch.channel_id]) { skipped.push({ id: r.clip, why: ch.why || 'no-channel' }); continue; }
      (routed[ch.channel_id] = routed[ch.channel_id] || []).push(c); rows.push([r.clip, ch]);
    }
    const existing = {}; for (const p of planned.values()) if (p.slot_ms && p.slot_ms > now - 864e5) { const it = by.get(p.clip) || {}; (existing[p.channel_id] = existing[p.channel_id] || []).push({ ms: p.slot_ms, title: it.title, template: it.template }); }
    const res = planAll({ routed, cfgs, existing, now }), chOf = new Map(rows), made = [];
    for (const [ch, r] of Object.entries(res)) {
      for (const s of r.slots) { const info = chOf.get(s.id); await run(db, "INSERT INTO yt_plan (clip, channel_id, slot_ms, source, rule, why, updated) VALUES (?, ?, ?, ?, ?, NULL, ?) ON CONFLICT(clip) DO UPDATE SET channel_id = excluded.channel_id, slot_ms = excluded.slot_ms, source = excluded.source, rule = excluded.rule, why = NULL, updated = excluded.updated", s.id, ch, s.ms, info.rule === -2 ? 'manual' : 'auto', info.rule, now); made.push(s.id);
        const iso = new Date(s.ms).toISOString(); await run(db, "UPDATE yt_queue SET publish_at = ? WHERE clip = ? AND status = 'queued' AND privacy = 'private'", iso, s.id); }
      for (const s of r.skipped) skipped.push({ id: s.id, why: s.why });
    }
    const sExisting = {}; for (const p of await all(db, 'SELECT clip, channel_id, slot_ms FROM dist_social WHERE slot_ms > ?', now - 864e5)) { const it = by.get(p.clip) || {}; (sExisting[p.channel_id] = sExisting[p.channel_id] || []).push({ ms: p.slot_ms, title: it.title, template: it.template }); }
    let posts = 0;
    for (const [ch, r] of Object.entries(planAll({ routed: social, cfgs, existing: sExisting, now }))) for (const s of r.slots) { const so = sRows.get(s.id + '|' + ch); await run(db, "INSERT INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, updated) VALUES (?, ?, ?, ?, 'auto', ?, 'planned', ?) ON CONFLICT(clip, channel_id) DO NOTHING", s.id, ch, platformOf(ch), s.ms, so ? so.rule : -1, now); posts++; }
    return { ok: true, planned: made.length, social: posts, skipped };
  },
  async plan_get(db, b) {
    const ch = CHID.test(String(b.channel_id || '')) ? b.channel_id : null, to = Date.now() + Math.min(Math.max(+b.days || 14, 1), 90) * 864e5;
    const rows = await all(db, `SELECT p.clip, p.channel_id, p.slot_ms, p.source, p.rule, q.title, q.status FROM yt_plan p LEFT JOIN yt_queue q ON q.clip = p.clip WHERE p.slot_ms IS NOT NULL AND p.slot_ms <= ? ${ch ? 'AND p.channel_id = ?' : ''} ORDER BY p.slot_ms LIMIT 500`, ...(ch ? [to, ch] : [to]));
    for (const r of await all(db, `SELECT s.clip, s.channel_id, s.slot_ms, s.source, s.rule, s.state AS status, s.post_id, q.title FROM dist_social s LEFT JOIN yt_queue q ON q.clip = s.clip WHERE s.slot_ms IS NOT NULL AND s.slot_ms <= ? ${ch ? 'AND s.channel_id = ?' : ''} ORDER BY s.slot_ms LIMIT 500`, ...(ch ? [to, ch] : [to]))) rows.push({ ...r, social: 1 });
    rows.sort((a, b) => a.slot_ms - b.slot_ms);
    const cfgs = await cfgMap(db);
    return { rows: rows.map(r => { const tz = (cfgs[r.channel_id] || normCfg()).tz; return { ...r, date: localDate(r.slot_ms, tz), time: localHM(r.slot_ms, tz), tz }; }) };
  },
  /** Manual override for one or many clips: pick the channel (and optionally a slot). Without a slot the next plan_run places it on that channel. */
  async plan_set(db, b, who) {
    const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(String))].filter(x => CLIP.test(x)).slice(0, 100), ch = String(b.channel_id || '');
    if (!ids.length || !CHID.test(ch)) return { status: 400, error: 'bad-input' };
    if (!(await db.prepare(isExt(ch) ? 'SELECT 1 AS x FROM dist_ext WHERE channel_id = ?' : "SELECT 1 AS x FROM yt_channel WHERE channel_id = ? AND status = 'ok'").bind(ch).first())) return { status: 404, error: 'not-found' };
    let ms = null; if (b.slot) { ms = Date.parse(b.slot); if (!Number.isFinite(ms) || ms < Date.now()) return { status: 400, error: 'bad-slot' }; }
    if (isExt(ch)) { if (ms == null) return { status: 400, error: 'bad-slot' }; for (const id of ids) await run(db, "INSERT INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, updated) VALUES (?, ?, ?, ?, 'manual', -2, 'planned', ?) ON CONFLICT(clip, channel_id) DO UPDATE SET slot_ms = excluded.slot_ms, source = 'manual', updated = excluded.updated", id, ch, platformOf(ch), ms, Date.now()); return { ok: true, count: ids.length }; }
    for (const id of ids) await run(db, "INSERT INTO yt_plan (clip, channel_id, slot_ms, source, rule, why, updated) VALUES (?, ?, ?, 'manual', -2, NULL, ?) ON CONFLICT(clip) DO UPDATE SET channel_id = excluded.channel_id, slot_ms = excluded.slot_ms, source = 'manual', rule = -2, updated = excluded.updated", id, ch, ms, Date.now());
    return { ok: true, count: ids.length };
  },
  /** Social agent → mirror of GrabCast accounts (platform + id + name). Ids become "gc-<platform>-<id>"; accounts missing from the list are marked gone. */
  async ext_sync(db, b) {
    const list = Array.isArray(b.accounts) ? b.accounts.slice(0, 200) : null; if (!list) return { status: 400, error: 'bad-input' };
    const now = Date.now(), keep = [];
    for (const a of list) {
      const p = String((a && a.platform) || '').toLowerCase().replace(/^facebook$/, 'facebook_page'), aid = String((a && a.id) || '');
      if (!PLATFORMS[p] || !/^[A-Za-z0-9_-]{1,80}$/.test(aid)) continue;
      const id = `gc-${p}-${aid}`; keep.push(id);
      await run(db, 'INSERT INTO dist_ext (channel_id, platform, account_id, title, thumb, status, updated) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(channel_id) DO UPDATE SET title = excluded.title, thumb = excluded.thumb, status = excluded.status, updated = excluded.updated',
        id, p, aid, String(a.name || a.title || aid).slice(0, 80), /^https:\/\//.test(String(a.thumb || a.avatar || '')) ? String(a.thumb || a.avatar).slice(0, 300) : null, a.status === 'error' || a.status === 'disconnected' ? 'error' : 'ok', now);
    }
    const gone = (await all(db, 'SELECT channel_id FROM dist_ext')).map(r => r.channel_id).filter(x => !keep.includes(x));
    for (const id of gone) await run(db, "UPDATE dist_ext SET status = 'gone', updated = ? WHERE channel_id = ?", now, id);
    return { ok: true, channels: keep, gone };
  },
  /** Rules editor: test one clip (library id) or a sample {type, topic, sub, skill, cefr, exam, region, template, scene} against the CURRENT or the draft rules. */
  async test_clip(db, b, who, env) {
    let c; if (CLIP.test(String(b.clip || ''))) { const it = (await manifest(env)).items.find(x => x.id === b.clip); if (!it) return { status: 404, error: 'not-found' }; c = clipOf(it); }
    else if (b.sample && typeof b.sample === 'object') { c = {}; for (const k of [...COND, 'sub']) if (typeof b.sample[k] === 'string') c[k] = b.sample[k].slice(0, 80); }
    else return { status: 400, error: 'bad-input' };
    const rl = Array.isArray(b.rules) ? b.rules.slice(0, 50).map(r => ({ cond: r && typeof r.cond === 'object' ? r.cond : {}, channel_id: String((r && r.channel_id) || ''), active: r && r.active === 0 ? 0 : 1 })) : await rules(db);
    return { clip: c, ...explain(rl, await cfgMap(db), c, await dflt(db)) };
  },
  /** Role metadata for one clip: embed pack + social post per platform (preview / copy in the admin; the social agent uses social_due). */
  async meta(db, b, who, env) {
    if (!CLIP.test(String(b.clip || ''))) return { status: 400, error: 'bad-input' };
    const it = (await manifest(env)).items.find(x => x.id === b.clip); if (!it) return { status: 404, error: 'not-found' };
    const c = clipOf(it), plats = (Array.isArray(b.platforms) ? b.platforms : Object.keys(PLATFORMS)).filter(p => PLATFORMS[p]);
    return { clip: c.id, embed: embedMeta(c), social: Object.fromEntries(plats.map(p => [p, socialMeta(c, p)])) };
  },
  /** CONTRACT for the social publisher: planned social posts due in [from, to] (ms; default next 48 h) with ready-made metadata. */
  async social_due(db, b, who, env) {
    const now = Date.now(), from = Number.isFinite(+b.from) ? +b.from : now - 36e5, to = Number.isFinite(+b.to) ? Math.min(+b.to, now + 90 * 864e5) : now + 2 * 864e5, ch = isExt(b.channel_id) ? b.channel_id : null;
    const rows = await all(db, `SELECT s.*, e.account_id FROM dist_social s LEFT JOIN dist_ext e ON e.channel_id = s.channel_id WHERE s.state IN ('planned', 'failed') AND s.slot_ms BETWEEN ? AND ? ${ch ? 'AND s.channel_id = ?' : ''} ORDER BY s.slot_ms LIMIT 200`, ...(ch ? [from, to, ch] : [from, to]));
    const by = new Map((await manifest(env)).items.map(x => [x.id, x]));
    return { rows: rows.filter(r => by.has(r.clip)).map(r => ({ clip: r.clip, channel_id: r.channel_id, platform: r.platform, account_id: r.account_id, slot_ms: r.slot_ms, at: new Date(r.slot_ms).toISOString(), source: r.source, state: r.state, meta: socialMeta(clipOf(by.get(r.clip)), r.platform) })) };
  },
  /** Social publisher → result of pushing one post to GrabCast: state pushed|published|failed|cancelled (+ post_id / err). */
  async social_ack(db, b) {
    const st = String(b.state || ''); if (!CLIP.test(String(b.clip || '')) || !isExt(b.channel_id) || !['pushed', 'published', 'failed', 'cancelled'].includes(st)) return { status: 400, error: 'bad-input' };
    if (!(await db.prepare('SELECT 1 AS x FROM dist_social WHERE clip = ? AND channel_id = ?').bind(b.clip, b.channel_id).first())) return { status: 404, error: 'not-found' };
    await run(db, 'UPDATE dist_social SET state = ?, post_id = COALESCE(?, post_id), err = ?, updated = ? WHERE clip = ? AND channel_id = ?', st, /^[A-Za-z0-9_-]{1,100}$/.test(String(b.post_id || '')) ? String(b.post_id) : null, st === 'failed' ? String(b.err || 'error').slice(0, 120) : null, Date.now(), b.clip, b.channel_id);
    return { ok: true };
  },
  /** System area: embed channels, "ready for lessons" queue, per-lesson embed status, broken/private/deleted → self-hosted fallback, coverage map topic × CEFR. */
  async embed_status(db, b, who, env) {
    const chs = await channels(db), embed = new Set(chs.filter(c => c.platform === 'youtube' && c.cfg.role === 'embed' && c.cfg.active && c.status === 'ok').map(c => c.channel_id));
    const m = await manifest(env), by = new Map(m.items.map(x => [x.id, x])), off = new Set((await all(db, 'SELECT clip FROM clip_review WHERE web = 0 OR deleted > 0')).map(r => r.clip));
    const plan = new Map((await all(db, 'SELECT clip, channel_id FROM yt_plan')).map(r => [r.clip, r.channel_id]));
    const q = await all(db, 'SELECT q.clip, q.status, q.video_id, q.privacy, q.err, q.channel_id, q.title, p.file_id FROM yt_queue q LEFT JOIN yt_pack p ON p.clip = q.clip ORDER BY q.approved_at DESC LIMIT 2000');
    const ready = [], lessons = [], broken = [], cov = {};
    for (const r of q) {
      const it = by.get(r.clip) || {}, ch = r.channel_id || plan.get(r.clip) || null, onEmbed = !!ch && embed.has(ch), v = viewOf(it, { review: {}, queue: {}, pack: {}, web: {}, views: {} });
      if (r.status === 'manual' || r.status === 'queued') { if (!ch || onEmbed) ready.push({ clip: r.clip, title: it.title || r.title || r.clip, channel_id: ch, state: r.file_id ? 'ready' : 'packing' }); continue; }
      if (!r.video_id) continue;
      const bad = r.err ? r.err : !onEmbed ? 'not-embed-channel' : off.has(r.clip) ? 'web-off' : '';
      const row = { clip: r.clip, title: it.title || r.title || r.clip, video_id: r.video_id, channel_id: ch, privacy: r.privacy, status: bad ? 'fallback' : 'youtube', why: bad || null };
      lessons.push(row); if (bad && bad !== 'web-off') broken.push(row);
      const k = (v.topic || 'other') + '|' + (String(it.cefr || '?').toUpperCase()); cov[k] = cov[k] || { yt: 0, self: 0 }; cov[k][bad ? 'self' : 'yt']++;
    }
    const cnt = {}; for (const l of lessons) if (l.channel_id) cnt[l.channel_id] = (cnt[l.channel_id] || 0) + 1;
    return { channels: chs.filter(c => c.platform === 'youtube').map(c => ({ channel_id: c.channel_id, title: c.title, role: c.cfg.role, active: c.cfg.active, status: c.status, clips: cnt[c.channel_id] || 0, rotating: c.cfg.role === 'embed' && c.cfg.active && c.status === 'ok' })), ready: ready.slice(0, 300), lessons: lessons.slice(0, 500), broken, coverage: Object.entries(cov).map(([k, n]) => ({ topic: k.split('|')[0], cefr: k.split('|')[1], ...n })) };
  },
};
/** Hợp đồng §3 cho autopilot máy chủ (functions/api/_social_auto.js) – gọi thẳng, cùng hàm với op qua HTTP. */
export const DIST = { ext_sync: (db, b) => OPS.ext_sync(db, b), social_due: (db, b, env) => OPS.social_due(db, b, null, env), social_ack: (db, b) => OPS.social_ack(db, b), plan_run: (db, b, env) => OPS.plan_run(db, b, null, env) };
const WRITE = new Set(['cfg_set', 'rules_set', 'plan_run', 'plan_set', 'resume', 'alerts_clear', 'ext_sync', 'social_ack']);
export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });
export async function onRequestPost({ request, env }) {
  const g = await adminGate(request, env, 'dst'); if (!g.who) return json(request, g.status, { error: g.error });
  const text = await request.text().catch(() => ''); if (text.length > 65536) return json(request, 413, { error: 'too-large' });
  let b; try { b = JSON.parse(text || '{}'); } catch (e) { b = null; }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(request, 400, { error: 'body' });
  if (!Object.hasOwn(OPS, b.op)) return json(request, 400, { error: 'op' });
  if (await limit('dst:' + (request.headers.get('CF-Connecting-IP') || '?'), 120, 60)) return json(request, 429, { error: 'too-fast' });
  if (!env.DB) return json(request, 412, { error: 'not-configured' });
  { const gb = await guardBg(request, env, json); if (gb) return gb; } // cầu dao D1 (_d1guard.js): việc nền/quản trị dừng khi tài khoản đã đọc ≥ 50 % hạn mức
  try {
    await setup(env.DB); await setupDist(env.DB); const out = await OPS[b.op](env.DB, b, g.who, env), status = out.status || 200; delete out.status;
    if (WRITE.has(b.op)) await adminAudit(env, request, g.who.email, 'dist.' + b.op, status < 400);
    return json(request, status, out);
  } catch (e) { if (WRITE.has(b.op)) await adminAudit(env, request, g.who.email, 'dist.' + b.op, false); return json(request, e.status || 500, { error: e.code || 'error' }); }
}
