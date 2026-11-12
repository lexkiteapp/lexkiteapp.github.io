/* Admin › Sổ tài khoản & khóa (docs/ACCOUNTS-LEDGER.md): MỌI dịch vụ / khóa API / tài khoản dịch vụ thuộc email nào, tài khoản nào, giữ ở đâu (TÊN biến – không bao giờ giá trị),
 * phạm vi, ngày hết hạn + nhắc trước 14 ngày, link quản lý. Chỉ admin (adminGate); mỗi lần xem/sửa ghi admin_log (acct.list / acct.set).
 * POST /api/admin-accounts (Bearer Firebase ID token)
 *   list           → { rows: [{ id, service, account, store, names:[{n, state}], scope, manage, expires, days, due, owner, note, at, by }], extra:[tên GitHub chưa đăng ký], gh, due:[…] }
 *   set {id, owner, account, expires, note} → ghi phần chủ nhập tay (email chủ, tài khoản, hạn, ghi chú) vào D1 acct_ledger (dùng chung mọi admin)
 * Nguồn: functions/api/_accounts_reg.js (tên + phạm vi, công khai, không email/giá trị) × D1 acct_ledger (email/hạn nhập tay) × trạng thái có/không:
 *   pages → env[tên] có giá trị? (kiểm ngay trên máy chủ, KHÔNG đọc giá trị ra ngoài) · github → GET /actions/secrets (chỉ TÊN) nếu GH_DISPATCH_TOKEN có quyền Secrets:read, cache 10 phút · local → chỉ ghi nhận.
 * Phản hồi qua lưới an toàn looksSecret: có chuỗi dạng khóa → 500, không trả. */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { looksSecret } from './_keys.js';
import { ROWS } from './_accounts_reg.js';
import { limit } from './sync.js';
import { readText, bodyFail } from './_body.js';

const GH_REPO = 'lexkiteapp/lexkiteapp.github.io', GH_TTL = 600e3, DAY = 86400e3, WARN_DAYS = 14;
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
const clip = (v, n) => String(v == null ? '' : v).trim().slice(0, n);
const EMAIL = /^[^@\s]{1,64}@[^@\s]{1,120}\.[^@\s]{2,20}$/;
const maskEmail = e => { const s = String(e || '').toLowerCase(), i = s.indexOf('@'); return i < 1 ? '' : s[0] + '***' + s.slice(i); };

async function ensure(db) {
  await db.prepare('CREATE TABLE IF NOT EXISTS acct_ledger (id TEXT PRIMARY KEY, owner TEXT, account TEXT, expires TEXT, note TEXT, at INTEGER, by TEXT) WITHOUT ROWID').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID').run();
}

/** Danh sách TÊN secret của repo (không giá trị). null = không đọc được (token thiếu quyền / mạng) → trạng thái 'unknown'. */
async function ghNames(env, force) {
  const db = env.DB, now = Date.now();
  const c = await db.prepare("SELECT v, at FROM config WHERE k = 'acct_gh'").first().catch(() => null);
  if (c && !force && now - +c.at < GH_TTL) { try { return JSON.parse(c.v); } catch (e) { /* tải lại */ } }
  const tok = env.GH_DISPATCH_TOKEN; let out = null;
  if (tok) {
    try {
      const names = [];
      for (let page = 1; page <= 5; page++) {
        const r = await fetch(`https://api.github.com/repos/${GH_REPO}/actions/secrets?per_page=100&page=${page}`, { headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-admin' }, signal: AbortSignal.timeout(4000) });
        if (!r.ok) { names.length = 0; throw new Error('gh-' + r.status); }
        const j = await r.json(); for (const s of j.secrets || []) names.push(String(s.name)); if ((j.secrets || []).length < 100) break;
      }
      out = { names, at: now, ok: true };
    } catch (e) { out = { names: [], at: now, ok: false, why: String(e && e.message || 'error').slice(0, 40) }; }
  } else out = { names: [], at: now, ok: false, why: 'no-token' };
  await db.prepare('INSERT INTO config (k, v, at, by) VALUES (?, ?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at').bind('acct_gh', JSON.stringify(out), now, 'system').run().catch(() => {});
  return out;
}

export const daysLeft = (expires, now = Date.now()) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(expires || '')) return null; const t = Date.parse(expires + 'T23:59:59Z'); return Number.isNaN(t) ? null : Math.ceil((t - now) / DAY); };

export function build(env, ledger, gh, now = Date.now()) {
  const L = new Map((ledger || []).map(r => [r.id, r])), have = new Set((gh && gh.names) || []);
  const rows = ROWS.map(r => {
    const l = L.get(r.id) || {}, expires = l.expires || r.expires || '', days = daysLeft(expires, now);
    const names = r.names.map(n => ({ n, state: r.store === 'pages' ? (env && env[n] != null && String(env[n]) !== '' ? 'set' : 'missing') : r.store === 'github' ? (gh && gh.ok ? (have.has(n) ? 'set' : 'missing') : 'unknown') : 'local' }));
    return { id: r.id, service: r.service, account: l.account || r.account, store: r.store, names, scope: r.scope, manage: r.manage, note: l.note || r.note || '', expires, days, due: days != null && days <= WARN_DAYS, owner: l.owner || '', at: +l.at || 0, by: maskEmail(l.by) };
  });
  const known = new Set(ROWS.filter(r => r.store === 'github').flatMap(r => r.names));
  const extra = gh && gh.ok ? [...have].filter(n => !known.has(n) && n !== 'GITHUB_TOKEN').sort() : [];
  return { rows, extra, gh: { ok: !!(gh && gh.ok), why: (gh && gh.why) || '', at: (gh && gh.at) || 0 }, due: rows.filter(r => r.due).map(r => ({ id: r.id, service: r.service, expires: r.expires, days: r.days })) };
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  let raw; try { raw = await readText(request, 8000); } catch (e) { const f = bodyFail(e); return json(request, f.status, { error: f.error }); }
  let b; try { b = JSON.parse(raw || '{}'); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(request, 400, { error: 'json' });
  const g = await adminGate(request, env, 'acct'); if (!g.who) return json(request, g.status, { error: g.error });
  const who = g.who, op = String(b.op || '');
  if (!env.DB) return json(request, 412, { error: 'not-configured' });
  if (op !== 'list' && op !== 'set') return json(request, 400, { error: 'op' });
  await ensure(env.DB);
  try {
    if (op === 'list') {
      const ledger = (await env.DB.prepare('SELECT id, owner, account, expires, note, at, by FROM acct_ledger').all()).results || [];
      const out = build(env, ledger, await ghNames(env, b.force === true));
      const body = JSON.stringify(out);
      if (looksSecret(body)) { await adminAudit(env, request, who.email, 'acct.list', false); return json(request, 500, { error: 'leak-guard' }); }
      await adminAudit(env, request, who.email, 'acct.list', true);
      return new Response(body, { status: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(request) } });
    }
    if (await limit('acctw:' + who.email, 30, 60)) return json(request, 429, { error: 'too-fast' });
    const row = ROWS.find(r => r.id === b.id); if (!row) return json(request, 400, { error: 'id' });
    const owner = clip(b.owner, 120).toLowerCase(), account = clip(b.account, 120), note = clip(b.note, 300), expires = clip(b.expires, 10);
    if (owner && !EMAIL.test(owner)) return json(request, 400, { error: 'owner' });
    if (expires && daysLeft(expires) == null) return json(request, 400, { error: 'expires' });
    if ([owner, account, note].some(looksSecret)) return json(request, 400, { error: 'secret-in-text' });
    await env.DB.prepare('INSERT INTO acct_ledger (id, owner, account, expires, note, at, by) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET owner = excluded.owner, account = excluded.account, expires = excluded.expires, note = excluded.note, at = excluded.at, by = excluded.by')
      .bind(row.id, owner, account, expires, note, Date.now(), who.email).run();
    await adminAudit(env, request, who.email, 'acct.set', true);
    return json(request, 200, { ok: true });
  } catch (e) {
    await adminAudit(env, request, who.email, 'acct.' + op, false);
    return json(request, 500, { error: 'error' });
  }
}
