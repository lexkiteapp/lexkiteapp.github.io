/* Trạng thái quản trị DÙNG CHUNG cho mọi admin (owner 03/11: không có gì chỉ một tài khoản/một trình duyệt thấy được).
 * POST /api/admin-shared (Authorization: Bearer <Firebase ID token>, cổng adminGate – ADMIN_EMAILS là bí mật Pages, không đọc lại được)
 *   get   {ns}           → { v, at, by }          by = email đã che (a***@gmail.com)
 *   set   {ns, v}        → thay cả giá trị (ns kiểu 'doc')
 *   patch {ns, k, v}     → đặt 1 mục trong bản đồ (ns kiểu 'map'; v = null → xóa mục) – hai admin sửa mục khác nhau không đè nhau
 *   stamp                → dấu thay đổi mọi khu vực: keys · drive · quota · shared:<ns> → { at, by } (đã che) – trang quản trị hỏi 30–60 s/lần
 * Lưu: D1 chính, bảng config, khóa adm_shared:<ns> (JSON ≤ 16 KB; at, by = email thật cho nhật ký). Mỗi lần ghi → admin_log 'shared.<op>.<ns>'.
 * Không chứa bí mật: khóa API vẫn ở /api/keys (mã hóa AES-GCM + last4), token Drive ở /api/drive (mã hóa, theo email Google, không theo người bấm Kết nối). */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { internalDb } from './_d1b.js';
import { limit } from './sync.js';

const MAX = 16384, MAX_BODY = 20000;
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
const str = (v, n) => typeof v === 'string' && v.length <= n;
const IDX = /^[A-Za-z0-9_.:-]{1,120}$/;

/** Mỗi ns: kind 'doc' | 'map' + hàm kiểm (trả giá trị sạch hoặc undefined = sai). */
export const NS = {
  // Chế độ xem đã lưu của thư viện clip (Quản trị → Video): [{name, q}] ≤ 30
  clipviews: { kind: 'doc', clean: v => Array.isArray(v) && v.length <= 30 && v.every(x => x && str(x.name, 40) && str(x.q, 600)) ? v.map(x => ({ name: x.name, q: x.q })) : undefined },
  // Danh sách kiểm đăng tay YouTube: {clipId: [chỉ số đã tick]}
  ytck: { kind: 'map', clean: v => Array.isArray(v) && v.length <= 40 && v.every(i => Number.isInteger(i) && i >= 0 && i < 64) ? [...new Set(v)].sort((a, b) => a - b) : undefined },
  // Bài nguồn đã dùng ở Đăng mạng xã hội: {nguồn: [id bài]}
  socused: { kind: 'map', clean: v => Array.isArray(v) && v.length <= 200 && v.every(i => str(i, 80)) ? [...new Set(v)] : undefined },
  // Cảnh báo quản trị (loại thư/ngưỡng) – trước đây nằm trong Cài đặt › Nâng cao theo từng email
  alerts: { kind: 'doc', clean: v => v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.alertTypes) && v.alertTypes.length <= 12 && v.alertTypes.every(t => str(t, 30))
    && Number.isInteger(+v.jsErrorThreshold) && +v.jsErrorThreshold >= 1 && +v.jsErrorThreshold <= 1000 && Number.isInteger(+v.quotaThresholdPct) && +v.quotaThresholdPct >= 50 && +v.quotaThresholdPct <= 95
    ? { alertTypes: [...new Set(v.alertTypes)], jsErrorThreshold: +v.jsErrorThreshold, quotaThresholdPct: +v.quotaThresholdPct } : undefined },
};

/** a***@gmail.com – không lộ email đầy đủ cho trình duyệt (kể cả của admin khác). */
export const maskEmail = e => { const s = String(e || '').toLowerCase(), i = s.indexOf('@'); return i < 1 ? '' : s[0] + '***' + s.slice(i); };

async function ensure(db) { await db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID').run(); }
const rowOf = async (db, ns) => await db.prepare('SELECT v, at, by FROM config WHERE k = ?').bind('adm_shared:' + ns).first().catch(() => null);
const parse = s => { try { const x = JSON.parse(s); return x; } catch (e) { return null; } };

/** Dấu thay đổi các khu vực chia sẻ (đọc rẻ: 1 dòng cuối mỗi bảng nhật ký). Bảng chưa có → bỏ qua khu vực đó. */
export async function stamps(env) {
  const out = {}, db = env.DB;
  const last = async (area, run) => { try { const r = await run(); if (r && r.at) out[area] = { at: +r.at, by: maskEmail(r.by) }; } catch (e) { /* bảng chưa tạo */ } };
  await last('keys', () => db.prepare("SELECT at, email AS by FROM key_audit WHERE ok = 1 AND op IN ('add', 'set', 'delete') ORDER BY id DESC LIMIT 1").first());
  await last('drive', () => internalDb(env).prepare("SELECT at, who AS by FROM drive_audit WHERE ok = 1 AND act NOT IN ('list', 'get_link', 'preview') ORDER BY id DESC LIMIT 1").first());
  await last('accounts', () => db.prepare('SELECT at, by FROM acct_ledger ORDER BY at DESC LIMIT 1').first());
  await last('quota', () => db.prepare('SELECT at, email AS by FROM quota_audit ORDER BY id DESC LIMIT 1').first());
  try { for (const r of (await db.prepare("SELECT k, at, by FROM config WHERE k LIKE 'adm_shared:%'").all()).results || []) out['shared:' + r.k.slice(11)] = { at: +r.at || 0, by: maskEmail(r.by) }; } catch (e) { /* chưa có */ }
  return out;
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  const raw = await request.text().catch(() => '');
  if (raw.length > MAX_BODY) return json(request, 413, { error: 'too-large' });
  let b; try { b = JSON.parse(raw || '{}'); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(request, 400, { error: 'json' });
  const g = await adminGate(request, env, 'shared'); if (!g.who) return json(request, g.status, { error: g.error });
  const who = g.who, op = String(b.op || '');
  if (!env.DB) return json(request, 412, { error: 'not-configured' });
  if (op === 'stamp') return json(request, 200, { ok: true, now: Date.now(), me: maskEmail(who.email), areas: await stamps(env) });
  if (!['get', 'set', 'patch'].includes(op)) return json(request, 400, { error: 'op' });
  const spec = typeof b.ns === 'string' && Object.prototype.hasOwnProperty.call(NS, b.ns) ? NS[b.ns] : null;
  if (!spec) return json(request, 400, { error: 'ns' });
  await ensure(env.DB);
  const cur = await rowOf(env.DB, b.ns), curV = cur && cur.v ? parse(cur.v) : null;
  if (op === 'get') return json(request, 200, { ok: true, ns: b.ns, v: curV, at: cur ? +cur.at : 0, by: cur ? maskEmail(cur.by) : '' });
  if (await limit('sharedw:' + who.email, 40, 60)) return json(request, 429, { error: 'too-fast' });
  let next;
  if (op === 'set') {
    if (spec.kind !== 'doc') return json(request, 400, { error: 'kind' });
    next = spec.clean(b.v); if (next === undefined) return json(request, 400, { error: 'value' });
  } else {
    if (spec.kind !== 'map' || !IDX.test(String(b.k || ''))) return json(request, 400, { error: 'kind' });
    next = curV && typeof curV === 'object' && !Array.isArray(curV) ? { ...curV } : {};
    if (b.v === null) delete next[b.k]; else { const c = spec.clean(b.v); if (c === undefined) return json(request, 400, { error: 'value' }); next[b.k] = c; }
    if (Object.keys(next).length > 400) return json(request, 413, { error: 'too-large' });
  }
  const payload = JSON.stringify(next); if (payload.length > MAX) return json(request, 413, { error: 'too-large' });
  const at = Date.now();
  try {
    await env.DB.prepare('INSERT INTO config (k, v, at, by) VALUES (?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at, by = excluded.by').bind('adm_shared:' + b.ns, payload, at, who.email).run();
    await adminAudit(env, request, who.email, 'shared.' + op + '.' + b.ns, true);
    return json(request, 200, { ok: true, ns: b.ns, v: next, at, by: maskEmail(who.email) });
  } catch (e) {
    await adminAudit(env, request, who.email, 'shared.' + op + '.' + b.ns, false);
    return json(request, 500, { error: 'error' });
  }
}
