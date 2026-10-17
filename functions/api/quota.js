/* Quản trị hạn mức (tab "Hạn mức" – web/js/admin-quota.js). Chỉ quản trị viên (adminGate: Origin · tốc độ · ADMIN_EMAILS).
 * POST /api/quota { op, ... }
 *   state                                  → top dùng nhiều hôm nay, nhà cung cấp so với trần, khóa, cờ tự động, danh sách không giới hạn, cấu hình, nhật ký
 *   blockSet { target, minutes, reason }   → khóa id/email/IP (minutes 0 = vô thời hạn)        blockDelete { id } → mở khóa (xóa cả khóa tự động)
 *   configSet { feature, v:{anon:[phút,ngày], free:[phút,ngày], ipx} }                          configReset { feature } → về mặc định
 *   allowSet { target, note }              → thêm vào danh sách không giới hạn                  allowDelete { id }
 * Mọi thay đổi ghi vào quota_audit (chi tiết) + admin_log (nhật ký quản trị chung). Tài liệu: docs/QUOTAS.md */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { geminiKeys } from './ai.js';
import { DEFAULTS, PROVIDERS, BREAKER, budget, validConfig, normId, setupQuota, resetState, dayKey } from './_quota.js';

const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const clip = (v, n) => String(v == null ? '' : v).slice(0, n);
class Bad extends Error { constructor(m) { super(m); this.bad = true; } }

async function snapshot(db, env) {
  const now = Date.now(), day = dayKey(now);
  const [counts, cfgRows, allow, blocks, flags, audit] = await Promise.all([
    all(db, 'SELECT k, n FROM quota_count WHERE day = ? ORDER BY n DESC LIMIT 400', day),
    all(db, 'SELECT feature, v, at, by FROM quota_config'),
    all(db, 'SELECT id, note, at, by FROM quota_allow ORDER BY at DESC LIMIT 500'),
    all(db, 'SELECT id, until, reason, at, by FROM quota_block WHERE until = 0 OR until > ? ORDER BY at DESC LIMIT 500', now),
    all(db, 'SELECT id, strikes, bans, last, until, feature FROM quota_flag WHERE last > ? ORDER BY last DESC LIMIT 200', now - 7 * 86400e3),
    all(db, 'SELECT at, email, op, target, detail FROM quota_audit ORDER BY id DESC LIMIT 50'),
  ]);
  const cfg = {}; for (const r of cfgRows) { try { cfg[r.feature] = JSON.parse(r.v); } catch (e) { /* bỏ qua */ } }
  const s = { cfg, legacy: {} };
  const features = Object.keys(DEFAULTS).map(f => { const b = budget(f, s); return { feature: f, store: b.store, anon: b.anon, free: b.free, ipx: b.ipx, custom: !!cfg[f], def: { anon: DEFAULTS[f].anon, free: DEFAULTS[f].free, ipx: DEFAULTS[f].ipx } }; });
  // Top dùng nhiều theo tính năng (chỉ tính năng đếm ở D1); gắn email cho id người dùng
  const top = {}, uids = new Set(), prov = {};
  for (const r of counts) {
    if (r.k.startsWith('p:')) { prov[r.k.slice(2)] = r.n; continue; }
    const i = r.k.indexOf('|'); if (i < 0) continue; const f = r.k.slice(0, i), id = r.k.slice(i + 1);
    const arr = top[f] = top[f] || []; if (arr.length < 10) { arr.push({ id, n: r.n }); if (id.startsWith('u:')) uids.add(id.slice(2)); }
  }
  if (uids.size) try { const m = new Map((await all(db, `SELECT uid, email FROM users WHERE uid IN (${[...uids].map(() => '?').join(',')})`, ...uids)).map(r => [r.uid, r.email])); for (const arr of Object.values(top)) for (const x of arr) if (x.id.startsWith('u:')) x.email = m.get(x.id.slice(2)) || ''; } catch (e) { /* chưa có bảng users */ }
  let nKeys = 1; try { nKeys = Math.max(1, (await geminiKeys(env)).length); } catch (e) { /* bỏ qua */ }
  const providers = Object.entries(PROVIDERS).map(([p, P]) => { const cap = P.day * (P.perKey ? nKeys : 1), used = prov[p] || 0; return { p, infra: P.infra, unit: P.unit, used, cap, breaker: Math.floor(cap * BREAKER), pct: Math.round(used / cap * 100) }; });
  return { day, features, top, providers, allow, blocks, flags, audit, breaker: BREAKER };
}

const OPS = {
  state: (db, b, who, env) => snapshot(db, env),
  async blockSet(db, b, who) {
    const id = await normId(b.target); if (!id) throw new Bad('target');
    const min = Math.max(0, Math.min(Math.floor(+b.minutes || 0), 525600)), until = min ? Date.now() + min * 60e3 : 0;
    await db.prepare('INSERT INTO quota_block (id, until, reason, at, by) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT (id) DO UPDATE SET until = ?2, reason = ?3, at = ?4, by = ?5').bind(id, until, clip(b.reason, 200), Date.now(), who.email).run();
    return { ok: true, id, until, detail: `${min ? min + ' min' : 'forever'} ${clip(b.reason, 80)}` };
  },
  async blockDelete(db, b) {
    const id = clip(b.id, 140); if (!id) throw new Bad('id');
    await db.batch([db.prepare('DELETE FROM quota_block WHERE id = ?').bind(id), db.prepare('UPDATE quota_flag SET until = 0, strikes = 0 WHERE id = ?').bind(id)]);
    return { ok: true, id };
  },
  async configSet(db, b, who) {
    if (!DEFAULTS[b.feature]) throw new Bad('feature');
    const v = b.v && { anon: (b.v.anon || []).map(Number), free: (b.v.free || []).map(Number), ipx: +b.v.ipx };
    if (!validConfig(v)) throw new Bad('config');
    await db.prepare('INSERT OR REPLACE INTO quota_config (feature, v, at, by) VALUES (?, ?, ?, ?)').bind(b.feature, JSON.stringify(v), Date.now(), who.email).run();
    return { ok: true, id: b.feature, detail: JSON.stringify(v) };
  },
  async configReset(db, b) {
    if (!DEFAULTS[b.feature]) throw new Bad('feature');
    await db.prepare('DELETE FROM quota_config WHERE feature = ?').bind(b.feature).run();
    return { ok: true, id: b.feature };
  },
  async allowSet(db, b, who) {
    const id = await normId(b.target); if (!id) throw new Bad('target');
    await db.prepare('INSERT OR REPLACE INTO quota_allow (id, note, at, by) VALUES (?, ?, ?, ?)').bind(id, clip(b.note, 200), Date.now(), who.email).run();
    return { ok: true, id, detail: clip(b.note, 80) };
  },
  async allowDelete(db, b) {
    const id = clip(b.id, 140); if (!id) throw new Bad('id');
    await db.prepare('DELETE FROM quota_allow WHERE id = ?').bind(id).run();
    return { ok: true, id };
  },
};

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  const g = await adminGate(request, env, 'admq'); if (!g.who) return json(request, g.status, { error: g.error });
  let b; try { b = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  const fn = OPS[b && b.op]; if (!fn) return json(request, 400, { error: 'op' });
  try {
    await setupQuota(env.DB);
    const out = await fn(env.DB, b, g.who, env);
    if (b.op !== 'state') {
      await env.DB.prepare('INSERT INTO quota_audit (at, email, op, target, detail) VALUES (?, ?, ?, ?, ?)').bind(Date.now(), clip(g.who.email, 120), b.op, clip(out.id, 140), clip(out.detail, 300)).run();
      await adminAudit(env, request, g.who.email, 'quota.' + b.op, true);
      resetState(); // isolate này áp dụng ngay; isolate khác ≤ 1 phút
      delete out.detail;
    }
    return json(request, 200, out);
  } catch (e) {
    if (e && e.bad) return json(request, 400, { error: e.message });
    return json(request, 500, { error: 'server' });
  }
}
