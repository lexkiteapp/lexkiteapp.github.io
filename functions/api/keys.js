/* Quản lý khóa API (Quản trị → Khóa API · web/js/admin-keys.js · docs/API-KEYS.md). Kho + xoay vòng: functions/api/_keys.js.
 * POST /api/keys { op, ... }  (Authorization: Bearer <Firebase ID token>, cổng adminGate – chỉ ADMIN_EMAILS)
 *   list {provider, status, q, sort, dir, page, per} · add {lines, provider, label, weight} · set {ids, enabled?, weight?, label?, notes?}
 *   · delete* {ids, confirm:'DELETE'} · test {ids} · health · alerts · export {filters} (CSV, không có giá trị khóa) · audit {page}
 *   (* = phải đăng nhập lại ≤ 15 phút)
 * Mọi op ghi key_audit (chi tiết: id/last4/số lượng – không bao giờ giá trị khóa); op ghi còn ghi admin_log ('keys.<op>').
 * Giới hạn tốc độ: adminGate 120/phút/IP + ghi 30/phút/admin + kiểm khóa 6/phút/admin. Phản hồi đi qua lưới chặn dạng-khóa (looksSecret). */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { limit } from './sync.js';
import * as K from './_keys.js';

const MAX_BODY = 65536, MAX_LINES = 50, MAX_IDS = 200;
const json = (req, status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req), ...extra } });
const run = (db, q, ...a) => db.prepare(q).bind(...a).run();
const all = async (db, q, ...a) => (await db.prepare(q).bind(...a).all()).results || [];
const ids = b => (Array.isArray(b.ids) ? b.ids : []).map(String).filter(x => /^(k_[0-9a-f]{12}|env:[A-Z0-9_]{2,40}|legacy:[0-9a-f]{10})$/.test(x)).slice(0, MAX_IDS);
const text = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
class E extends Error { constructor(code, status = 400) { super(code); this.code = code; this.status = status; } }
const csvCell = v => { let s = String(v == null ? '' : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

async function view(env) { const now = Date.now(), p = await K.loadPool(env, { force: true }), err24 = await K.errCounts(env.DB, now); return { p, now, err24, rows: p.rows.map(r => K.pub(r, now, err24)) }; }

export const OPS = {
  async list(env, b, who, ctx) {
    const v = await view(env), f = K.filterRows(v.rows, b), summary = K.summarize(v.p.rows, v.now, v.err24), alerts = K.evalAlerts(summary);
    if (ctx.waitUntil) ctx.waitUntil((v.rows.length && K.healthStale(v.p, v.now) ? K.healthCheck(env).then(() => K.refreshAlerts(env)) : K.syncAlerts(env, alerts, v.now)).catch(() => {})); // kiểm lười > 6 h
    return { configured: { enc: K.encReady(env), mail: !!env.MAIL }, providers: Object.fromEntries(K.PROVIDER_IDS.map(p => [p, { name: K.PROVIDERS[p].name, cap: K.PROVIDERS[p].cap, env: K.PROVIDERS[p].env }])),
      ...f, summary, alerts, health: v.p.health || null, threshold: K.ALERT_MIN, _d: { n: f.total } };
  },
  async add(env, b, who) {
    if (!K.encReady(env)) throw new E('not-configured', 503);
    const forced = b.provider && b.provider !== 'auto' ? String(b.provider) : '';
    if (forced && !K.PROVIDERS[forced]) throw new E('provider');
    const label = text(b.label, 60), weight = Math.max(0, Math.min(1000, Number.isInteger(+b.weight) && b.weight !== '' && b.weight != null ? +b.weight : 100));
    if (K.looksSecret(label)) throw new E('secret-in-label');
    const lines = String(b.lines || '').split(/\r?\n/).map(K.cleanKey).filter(Boolean);
    if (!lines.length) throw new E('empty');
    if (lines.length > MAX_LINES) throw new E('too-many');
    const p = await K.loadPool(env, { force: true }), fps = new Set(p.rows.map(r => r.fp)), added = [], skipped = [], now = Date.now();
    for (let i = 0; i < lines.length; i++) {
      const key = lines[i], det = K.detect(key), prov = forced || det;
      if (!prov) { skipped.push({ line: i + 1, reason: 'unknown' }); continue; }
      if (key.length < 16 || key.length > 400 || /\s/.test(key) || (forced && K.PROVIDERS[forced].re && det !== forced)) { skipped.push({ line: i + 1, reason: 'format' }); continue; }
      const fp = await K.fingerprint(key); if (fps.has(fp)) { skipped.push({ line: i + 1, reason: 'duplicate' }); continue; } fps.add(fp);
      const id = K.newId(), lb = label ? label + (lines.length > 1 ? ' #' + (added.length + 1) : '') : K.PROVIDERS[prov].name;
      await run(env.DB, "INSERT INTO api_keys (id, provider, label, enc_key, last4, status, weight, added_by, created, source, fp) VALUES (?, ?, ?, ?, ?, 'live', ?, ?, ?, 'db', ?)", id, prov, lb, await K.encryptKey(env, id, key), key.slice(-4), weight, String(who.email).slice(0, 120), now, fp);
      added.push({ id, provider: prov, last4: key.slice(-4) });
    }
    K.resetPool();
    if (added.length && b.test !== false) { const res = await K.healthCheck(env, { ids: added.map(a => a.id) }); for (const a of added) a.status = (res.find(r => r.id === a.id) || {}).status || 'live'; }
    return { added, skipped, _d: { added: added.map(a => a.id + ' …' + a.last4), skipped: skipped.length } };
  },
  async set(env, b) {
    const list = ids(b); if (!list.length) throw new E('ids');
    const sets = [], args = [];
    if (b.enabled === true) sets.push("status = CASE WHEN status IN ('disabled', 'dead') THEN 'live' ELSE status END", 'err_count = 0', 'cooldown_until = 0');
    if (b.enabled === false) sets.push("status = 'disabled'");
    if (b.weight != null && b.weight !== '') { const w = +b.weight; if (!Number.isInteger(w) || w < 0 || w > 1000) throw new E('weight'); sets.push('weight = ?'); args.push(w); }
    for (const k of ['label', 'notes']) if (typeof b[k] === 'string') { const v = text(b[k], k === 'label' ? 60 : 300); if (K.looksSecret(v)) throw new E('secret-in-' + k); sets.push(k + ' = ?'); args.push(v); }
    if (!sets.length) throw new E('nothing');
    const legacy = list.filter(x => x.startsWith('legacy:')), dbIds = list.filter(x => !x.startsWith('legacy:'));
    if (dbIds.length) await run(env.DB, `UPDATE api_keys SET ${sets.join(', ')} WHERE id IN (${dbIds.map(() => '?').join(', ')})`, ...args, ...dbIds);
    for (const r of K.poolRows().filter(r => legacy.includes(r.id))) { if (b.enabled === false) r.status = 'disabled'; if (b.enabled === true) Object.assign(r, { status: 'live', err_count: 0, cooldown_until: 0 }); if (b.weight != null && b.weight !== '') r.weight = +b.weight; } // chỉ trong bộ nhớ (chưa có KEYS_ENC_KEY)
    K.resetPool();
    return { ok: true, n: list.length, _d: { ids: list, enabled: b.enabled, weight: b.weight } };
  },
  async delete(env, b) {
    if (b.confirm !== 'DELETE') throw new E('confirm');
    const list = ids(b); if (!list.length) throw new E('ids');
    const p = await K.loadPool(env, { force: true }), rows = p.rows.filter(r => list.includes(r.id)), skipped = [], gone = [];
    for (const r of rows) {
      if (r.source === 'env') { skipped.push({ id: r.id, reason: 'env-readonly' }); continue; }
      if (r.source === 'db') await run(env.DB, 'DELETE FROM api_keys WHERE id = ?', r.id);
      gone.push(r);
    }
    await K.dropLegacy(env.DB, gone.map(r => r.fp).filter(Boolean)); // không để danh sách cũ nhập lại
    K.resetPool();
    return { ok: true, deleted: gone.map(r => r.id), skipped, _d: { deleted: gone.map(r => r.id + ' …' + r.last4), skipped: skipped.length } };
  },
  async test(env, b) { const list = ids(b).slice(0, 50); if (!list.length) throw new E('ids'); const results = await K.healthCheck(env, { ids: list }); await K.refreshAlerts(env).catch(() => {}); return { results, _d: { ids: list } }; },
  async health(env) { const results = await K.healthCheck(env); const a = await K.refreshAlerts(env); return { results, alerts: a.alerts, mailed: a.mailed, _d: { n: results.length } }; },
  async alerts(env) { const a = await K.refreshAlerts(env); return { alerts: a.alerts, mailed: a.mailed }; },
  async export(env, b) {
    const v = await view(env), full = [];
    for (let pg = 1, pages = 1; pg <= pages; pg++) { const f = K.filterRows(v.rows, { ...b, page: pg, per: 100 }); pages = f.pages; full.push(...f.rows); } // cùng bộ lọc với bảng, mọi trang
    const cols = ['id', 'provider', 'label', 'last4', 'status', 'source', 'weight', 'uses_today', 'cap', 'err24', 'err_count', 'last_err', 'last_ok', 'created', 'added_by', 'notes'];
    const iso = t => (t ? new Date(t).toISOString() : '');
    const csv = [cols.join(','), ...full.map(r => cols.map(c => csvCell(/^(last_ok|created)$/.test(c) ? iso(r[c]) : r[c])).join(','))].join('\n');
    return { csv, n: full.length, _d: { n: full.length } };
  },
  async audit(env, b) {
    const page = Math.max(1, +b.page || 1), per = 50;
    const rows = await all(env.DB, 'SELECT at, email, op, ok, detail FROM key_audit ORDER BY id DESC LIMIT ? OFFSET ?', per, (page - 1) * per);
    const n = (await env.DB.prepare('SELECT COUNT(*) AS n FROM key_audit').first() || {}).n || 0;
    return { rows, total: n, page, pages: Math.max(1, Math.ceil(n / per)) };
  },
};
const WRITE = new Set(['add', 'set', 'delete', 'test', 'health', 'export']);
const DANGER = new Set(['delete']);
const SLOW = new Set(['test', 'health']);

async function keyAudit(env, email, op, ok, detail) {
  try { await run(env.DB, 'INSERT INTO key_audit (at, email, op, ok, detail) VALUES (?, ?, ?, ?, ?)', Date.now(), String(email || '').slice(0, 120), op, ok ? 1 : 0, detail ? JSON.stringify(detail).slice(0, 2000) : null);
    if (Math.random() < 0.01) await run(env.DB, 'DELETE FROM key_audit WHERE at < ?', Date.now() - 180 * 86400e3); } catch (e) { /* nhật ký không làm hỏng thao tác */ }
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env, waitUntil }) {
  const raw = await request.text().catch(() => '');
  if (raw.length > MAX_BODY) return json(request, 413, { error: 'too-large' });
  let b; try { b = JSON.parse(raw || '{}'); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(request, 400, { error: 'json' });
  const g = await adminGate(request, env, 'keys'); if (!g.who) return json(request, g.status, { error: g.error });
  const who = g.who, op = String(b.op || ''), fn = Object.prototype.hasOwnProperty.call(OPS, op) ? OPS[op] : null;
  if (!fn) return json(request, 400, { error: 'op' });
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  await K.setupKeys(env.DB);
  if (WRITE.has(op) && await limit('keysw:' + who.email, 30, 60)) { await keyAudit(env, who.email, op, false, { rate: 1 }); return json(request, 429, { error: 'too-fast' }); }
  if (SLOW.has(op) && await limit('keyst:' + who.email, 6, 60)) { await keyAudit(env, who.email, op, false, { rate: 1 }); return json(request, 429, { error: 'too-fast' }); }
  if (DANGER.has(op) && Date.now() / 1000 - (+who.auth_time || 0) > 900) { await keyAudit(env, who.email, op, false, { reauth: 1 }); return json(request, 401, { error: 'reauth', message: 'Sensitive action: sign out and sign back in, then try again.' }); }
  try {
    const out = await fn(env, b, who, { waitUntil });
    const detail = out._d; delete out._d;
    const body = JSON.stringify(out);
    if (K.looksSecret(body)) { await keyAudit(env, who.email, op, false, { guard: 1 }); return json(request, 500, { error: 'leak-guard' }); } // lưới an toàn: không bao giờ trả chuỗi dạng khóa
    await keyAudit(env, who.email, op, true, detail);
    if (WRITE.has(op)) await adminAudit(env, request, who.email, 'keys.' + op, true);
    return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(request) } });
  } catch (e) {
    await keyAudit(env, who.email, op, false, { error: e instanceof E ? e.code : 'error' });
    if (WRITE.has(op)) await adminAudit(env, request, who.email, 'keys.' + op, false);
    return json(request, e instanceof E ? e.status : 500, { error: e instanceof E ? e.code : 'error' }); // không đưa thông điệp lỗi thô ra ngoài
  }
}
