/* Quản trị → "Kênh & phân phối": cấu hình từng kênh YouTube, luật định tuyến (khớp đầu tiên thắng + dự phòng), lịch đăng theo kênh. POST /api/distribution (adminGate, nhật ký, giới hạn tốc độ)
 *   get · cfg_set {channel_id, cfg} · rules_set {rules[], fallback} · plan_run {replan?} · plan_get {channel_id?, days?} · plan_set {ids, channel_id, slot?} · resume {channel_id} · alerts_clear
 * Bộ máy thuần ở _distribution.js (định tuyến, hạn mức/ngày, giãn cách, khung giờ theo múi giờ kênh, jitter ±20 phút, chống trùng tiêu đề/bìa, đa dạng mẫu); luồng đăng tay: gói đăng hiện
 * "Đăng lên kênh X lúc HH:mm", sync kiểm video rơi đúng kênh (youtube.js). Khi API được duyệt, cùng kế hoạch (yt_plan) điều khiển đăng tự động. */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { limit } from './sync.js';
import { manifest } from './admin-shorts.js';
import { setup, chanCfg, pauseChannel } from './youtube.js';
import { normCfg, route, planAll, localDate, localHM } from './_distribution.js';
import { viewOf, typeOf } from './_clip_logic.js';
import { TOPICS, SKILLS, EXAMS, CEFR, TYPES } from './_taxonomy.js';

const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
const CLIP = /^[a-z0-9-]{3,120}$/, CHID = /^[A-Za-z0-9_-]{8,64}$/, COND = ['type', 'topic', 'skill', 'cefr', 'exam', 'region', 'template', 'scene'];
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const run = (db, sql, ...a) => db.prepare(sql).bind(...a).run();
const meta = async (db, k) => ((await db.prepare('SELECT v FROM yt_meta WHERE k = ?').bind(k).first()) || {}).v || null;
const setMeta = (db, k, v) => run(db, 'INSERT INTO yt_meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v', k, v);
const rules = async db => (await all(db, 'SELECT * FROM yt_rules ORDER BY pos, id')).map(r => { let cond = {}; try { cond = JSON.parse(r.cond || '{}'); } catch (e) { /* empty */ } return { id: r.id, name: r.name, cond, channel_id: r.channel_id, active: r.active }; });
async function channels(db) {
  const out = []; for (const c of await all(db, 'SELECT channel_id, title, thumb, status, email FROM yt_channel ORDER BY id')) { const x = await chanCfg(db, c.channel_id); out.push({ channel_id: c.channel_id, title: c.title, thumb: c.thumb, status: c.status, cfg: x.cfg, paused_reason: x.paused_reason }); }
  return out;
}
async function cfgMap(db) { const m = {}; for (const c of await channels(db)) if (c.status === 'ok') m[c.channel_id] = c.cfg; return m; }
const dflt = async db => (await meta(db, 'default_channel')) || null;

const OPS = {
  async get(db) {
    let alerts = []; try { alerts = JSON.parse((await meta(db, 'alerts')) || '[]'); } catch (e) { /* none */ }
    return { channels: await channels(db), rules: await rules(db), fallback: await dflt(db), alerts, taxonomy: { types: TYPES, topics: TOPICS, skills: SKILLS, exams: EXAMS, cefr: CEFR }, now: Date.now() };
  },
  async cfg_set(db, b, who) {
    const id = String(b.channel_id || ''); if (!CHID.test(id) || !(await db.prepare('SELECT 1 AS x FROM yt_channel WHERE channel_id = ?').bind(id).first())) return { status: 404, error: 'not-found' };
    const cfg = normCfg(b.cfg), was = await chanCfg(db, id);
    await run(db, 'INSERT INTO yt_chan_cfg (channel_id, cfg, paused_reason, updated) VALUES (?, ?, ?, ?) ON CONFLICT(channel_id) DO UPDATE SET cfg = excluded.cfg, paused_reason = excluded.paused_reason, updated = excluded.updated', id, JSON.stringify(cfg), cfg.active ? '' : was.paused_reason, Date.now());
    return { ok: true, cfg };
  },
  async resume(db, b) { const id = String(b.channel_id || ''); if (!CHID.test(id)) return { status: 400, error: 'bad-input' }; const x = await chanCfg(db, id); await run(db, 'INSERT INTO yt_chan_cfg (channel_id, cfg, paused_reason, updated) VALUES (?, ?, ?, ?) ON CONFLICT(channel_id) DO UPDATE SET cfg = excluded.cfg, paused_reason = \'\', updated = excluded.updated', id, JSON.stringify({ ...x.cfg, active: 1 }), '', Date.now()); return { ok: true }; },
  async alerts_clear(db) { await setMeta(db, 'alerts', '[]'); return { ok: true }; },
  async rules_set(db, b) {
    const list = Array.isArray(b.rules) ? b.rules.slice(0, 50) : null; if (!list) return { status: 400, error: 'bad-input' };
    const known = new Set((await all(db, 'SELECT channel_id FROM yt_channel')).map(r => r.channel_id)), clean = [];
    for (const r of list) {
      if (!r || typeof r !== 'object' || !known.has(String(r.channel_id))) return { status: 400, error: 'bad-channel' };
      const cond = {}; for (const k of COND) { const v = r.cond && r.cond[k]; if (typeof v === 'string' && v.trim()) cond[k] = v.trim().slice(0, 100); }
      if (!Object.keys(cond).length) return { status: 400, error: 'empty-condition' };
      clean.push({ name: String(r.name || '').slice(0, 60), cond, channel_id: String(r.channel_id), active: r.active === 0 || r.active === false ? 0 : 1 });
    }
    const fb = b.fallback == null || b.fallback === '' ? null : String(b.fallback); if (fb && !known.has(fb)) return { status: 400, error: 'bad-channel' };
    await db.batch([db.prepare('DELETE FROM yt_rules'), ...clean.map((r, i) => db.prepare('INSERT INTO yt_rules (pos, name, cond, channel_id, active) VALUES (?, ?, ?, ?, ?)').bind(i, r.name, JSON.stringify(r.cond), r.channel_id, r.active))]);
    if (fb) await setMeta(db, 'default_channel', fb);
    return { ok: true, count: clean.length };
  },
  /** Route + schedule approved clips that have no slot yet (manual overrides are kept; replan:true re-plans the automatic ones). */
  async plan_run(db, b, who, env) {
    const now = Date.now(), m = await manifest(env), by = new Map(m.items.map(x => [x.id, x]));
    if (b.replan) await run(db, "DELETE FROM yt_plan WHERE source = 'auto' AND clip IN (SELECT clip FROM yt_queue WHERE status IN ('manual', 'queued'))");
    const q = await all(db, "SELECT q.clip, q.title FROM yt_queue q WHERE q.status IN ('manual', 'queued') ORDER BY q.approved_at"), planned = new Map((await all(db, 'SELECT * FROM yt_plan')).map(r => [r.clip, r]));
    const cfgs = await cfgMap(db), rl = (await rules(db)).filter(r => r.active), fb = await dflt(db), routed = {}, skipped = [], rows = [];
    const clipOf = (it, qt) => { const v = viewOf(it, { review: {}, queue: {}, pack: {}, web: {}, views: {} }); return { id: it.id, type: v.type, topic: v.topic, sub: v.sub, skill: v.skill, cefr: it.cefr, exam: v.exam, template: it.template, scene: it.scene, title: it.title || qt || it.id, cover: it.cover_sha || it.cover_hash || '' }; };
    for (const r of q) {
      const it = by.get(r.clip); if (!it) { skipped.push({ id: r.clip, why: 'unknown' }); continue; }
      const old = planned.get(r.clip), c = clipOf(it, r.title);
      if (old && old.source === 'manual' && old.slot_ms) continue;
      const ch = old && old.source === 'manual' ? { channel_id: old.channel_id, rule: -2 } : route(rl, cfgs, c, fb);
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
    return { ok: true, planned: made.length, skipped };
  },
  async plan_get(db, b) {
    const ch = CHID.test(String(b.channel_id || '')) ? b.channel_id : null, to = Date.now() + Math.min(Math.max(+b.days || 14, 1), 90) * 864e5;
    const rows = await all(db, `SELECT p.clip, p.channel_id, p.slot_ms, p.source, p.rule, q.title, q.status FROM yt_plan p LEFT JOIN yt_queue q ON q.clip = p.clip WHERE p.slot_ms IS NOT NULL AND p.slot_ms <= ? ${ch ? 'AND p.channel_id = ?' : ''} ORDER BY p.slot_ms LIMIT 500`, ...(ch ? [to, ch] : [to]));
    const cfgs = await cfgMap(db);
    return { rows: rows.map(r => { const tz = (cfgs[r.channel_id] || normCfg()).tz; return { ...r, date: localDate(r.slot_ms, tz), time: localHM(r.slot_ms, tz), tz }; }) };
  },
  /** Manual override for one or many clips: pick the channel (and optionally a slot). Without a slot the next plan_run places it on that channel. */
  async plan_set(db, b, who) {
    const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(String))].filter(x => CLIP.test(x)).slice(0, 100), ch = String(b.channel_id || '');
    if (!ids.length || !CHID.test(ch)) return { status: 400, error: 'bad-input' };
    if (!(await db.prepare("SELECT 1 AS x FROM yt_channel WHERE channel_id = ? AND status = 'ok'").bind(ch).first())) return { status: 404, error: 'not-found' };
    let ms = null; if (b.slot) { ms = Date.parse(b.slot); if (!Number.isFinite(ms) || ms < Date.now()) return { status: 400, error: 'bad-slot' }; }
    for (const id of ids) await run(db, "INSERT INTO yt_plan (clip, channel_id, slot_ms, source, rule, why, updated) VALUES (?, ?, ?, 'manual', -2, NULL, ?) ON CONFLICT(clip) DO UPDATE SET channel_id = excluded.channel_id, slot_ms = excluded.slot_ms, source = 'manual', rule = -2, updated = excluded.updated", id, ch, ms, Date.now());
    return { ok: true, count: ids.length };
  },
};
const WRITE = new Set(['cfg_set', 'rules_set', 'plan_run', 'plan_set', 'resume', 'alerts_clear']);
export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });
export async function onRequestPost({ request, env }) {
  const g = await adminGate(request, env, 'dst'); if (!g.who) return json(request, g.status, { error: g.error });
  const text = await request.text().catch(() => ''); if (text.length > 65536) return json(request, 413, { error: 'too-large' });
  let b; try { b = JSON.parse(text || '{}'); } catch (e) { b = null; }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(request, 400, { error: 'body' });
  if (!Object.hasOwn(OPS, b.op)) return json(request, 400, { error: 'op' });
  if (await limit('dst:' + (request.headers.get('CF-Connecting-IP') || '?'), 120, 60)) return json(request, 429, { error: 'too-fast' });
  if (!env.DB) return json(request, 412, { error: 'not-configured' });
  try {
    await setup(env.DB); const out = await OPS[b.op](env.DB, b, g.who, env), status = out.status || 200; delete out.status;
    if (WRITE.has(b.op)) await adminAudit(env, request, g.who.email, 'dist.' + b.op, status < 400);
    return json(request, status, out);
  } catch (e) { if (WRITE.has(b.op)) await adminAudit(env, request, g.who.email, 'dist.' + b.op, false); return json(request, e.status || 500, { error: e.code || 'error' }); }
}
