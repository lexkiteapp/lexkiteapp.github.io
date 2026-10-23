/* Backlink, PR & Thương hiệu (Quản trị → tab "Backlink, PR & Thương hiệu", js/admin-backlinks.js). Tài liệu: docs/PR-PLATFORMS.md § Theo dõi tự động.
 * POST /api/backlinks
 *   1) Quản trị viên (Authorization: Bearer <Firebase ID token>, cùng cổng adminGate với /api/admin)  { op, ... }
 *      op: list · placementSet · placementDelete · handleSet · handleDelete · domainAck · checkNow · export
 *   2) GitHub Actions (pr-check.yml, content-protect.yml → scripts/pr-check.mjs): header X-BW-Ts + X-BW-Sig = hex HMAC-SHA256(STUDIO_CALLBACK_SECRET,
 *      "bw|<ts>.<sha256 hex của body>"), lệch ≤ 300 s – dùng lại bí mật CI sẵn có, không thêm secret mới.  op: ciSync · ciReport · ciCopy
 * Dữ liệu (D1): bw_placements (sổ + kết quả kiểm gần nhất, seed từ content/pr/placements.json) · bw_checks (lịch sử) · bw_domains (tên miền na ná)
 *   · bw_handles (tài khoản mạng xã hội, seed từ content/brand/watch.json) · config bw_run / bw_copy / bw_serious / bw_digest_at.
 * Thư (Worker lexkite-mail → REPORT_NOTIFY_EMAIL nếu có): sự cố nghiêm trọng (bài bị gỡ / bị khóa, tên miền na ná có MX, tài khoản của mình biến mất)
 *   gửi NGAY 1 lần khi mới xuất hiện; còn lại gom vào bản tin tuần. Bí mật không bao giờ trả về/ghi log. */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { guardBg } from './_d1guard.js';
import { limit } from './sync.js';
import { LEVELS, SERIOUS, validatePlacement, validateHandle } from './_bw.js';

const REPO = 'lexkiteapp/lexkiteapp.github.io', WORKFLOW = 'pr-check.yml', ADMIN_URL = 'https://lexkite.com/admin.html#backlinks';
const MAX_BODY = 512 * 1024, DAY = 864e5, SKEW = 300;
class Bad extends Error { constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; } }

let ready = false;
async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS bw_placements (id TEXT PRIMARY KEY, platform TEXT, type TEXT, url TEXT, account TEXT, submitted TEXT, status TEXT, expect TEXT, rel_expected TEXT, notes TEXT, source TEXT, deleted INTEGER DEFAULT 0, created INTEGER, updated INTEGER, by TEXT, last_at INTEGER, last_http INTEGER, last_final TEXT, last_link INTEGER, last_rel TEXT, last_noindex INTEGER, last_title TEXT, last_state TEXT, last_level TEXT, last_reasons TEXT, last_change INTEGER, rel_base TEXT, noindex_base INTEGER) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS bw_checks (id INTEGER PRIMARY KEY AUTOINCREMENT, pid TEXT NOT NULL, at INTEGER NOT NULL, http INTEGER, link INTEGER, rel TEXT, noindex INTEGER, state TEXT, level TEXT, reasons TEXT)'),
    db.prepare('CREATE INDEX IF NOT EXISTS bw_checks_pid ON bw_checks (pid, at)'),
    db.prepare('CREATE TABLE IF NOT EXISTS bw_domains (domain TEXT PRIMARY KEY, status TEXT, ns INTEGER, a INTEGER, aaaa INTEGER, mx INTEGER, mx_hosts TEXT, ips TEXT, level TEXT, reasons TEXT, since INTEGER, at INTEGER, acked INTEGER DEFAULT 0) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS bw_handles (k TEXT PRIMARY KEY, platform TEXT, handle TEXT, url TEXT, status TEXT, notes TEXT, source TEXT, deleted INTEGER DEFAULT 0, updated INTEGER, by TEXT, last_at INTEGER, last_state TEXT, last_level TEXT, last_reasons TEXT) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID'),
  ]);
  ready = true;
}
const all = async (db, q, ...a) => (await db.prepare(q).bind(...a).all()).results || [];
const one = async (db, q, ...a) => (await db.prepare(q).bind(...a).first()) || null;
const J = (s, d) => { try { return s == null || s === '' ? d : JSON.parse(s); } catch (e) { return d; } };
const cfgGet = async (db, k, d = null) => J(((await one(db, 'SELECT v FROM config WHERE k = ?', k)) || {}).v, d);
const cfgSet = (db, k, v, by = 'ci') => db.prepare('INSERT OR REPLACE INTO config (k, v, at, by) VALUES (?, ?, ?, ?)').bind(k, JSON.stringify(v), Date.now(), String(by).slice(0, 120)).run();
const b01 = v => (v == null ? null : v ? 1 : 0), bool = v => (v == null ? null : !!v);

// ---------- Chuẩn hóa dữ liệu CI gửi lên (không tin tuyệt đối dữ liệu từ ngoài) ----------
const word = (v, n = 30) => (/^[a-z][a-z-]{0,29}$/.test(String(v || '')) ? String(v).slice(0, n) : null);
const lvl = v => (LEVELS.includes(v) ? v : 'manual');
const reasons = v => (Array.isArray(v) ? v.map(x => word(x)).filter(Boolean).slice(0, 8) : []);
const relOk = v => (v === 'follow' || /^(nofollow|ugc|sponsored|redirect)( (nofollow|ugc|sponsored|redirect)){0,3}$/.test(String(v || '')) ? String(v) : null);
const httpsUrl = (v, n = 500) => { const s = String(v || '').slice(0, n); return /^https?:\/\/[^\s<>"']+$/.test(s) ? s : ''; };
const text = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').slice(0, n);

const pubP = r => ({ id: r.id, platform: r.platform, type: r.type, url: r.url, account: r.account, submittedAt: r.submitted, status: r.status, expectLink: r.expect, expectedRel: r.rel_expected, notes: r.notes, source: r.source, updated: r.updated, by: r.by,
  relBase: r.rel_base || null, noindexBase: bool(r.noindex_base),
  last: r.last_at ? { at: r.last_at, http: r.last_http, final: r.last_final, link: bool(r.last_link), rel: r.last_rel, noindex: bool(r.last_noindex), title: r.last_title, state: r.last_state, level: r.last_level, reasons: J(r.last_reasons, []), change: r.last_change } : null });
const fileP = r => ({ id: r.id, platform: r.platform, type: r.type, url: r.url, account: r.account, submittedAt: r.submitted, status: r.status, expectLink: r.expect, expectedRel: r.rel_expected, notes: r.notes });
const pubH = r => ({ k: r.k, platform: r.platform, handle: r.handle, url: r.url, status: r.status, notes: r.notes, source: r.source, updated: r.updated, last: r.last_at ? { at: r.last_at, state: r.last_state, level: r.last_level, reasons: J(r.last_reasons, []) } : null });
const pubD = r => ({ domain: r.domain, status: r.status, ns: bool(r.ns), a: bool(r.a), aaaa: bool(r.aaaa), mx: bool(r.mx), mxHosts: J(r.mx_hosts, []), ips: J(r.ips, []), level: r.level, reasons: J(r.reasons, []), since: r.since, at: r.at, acked: !!r.acked });

async function upsertPlacement(db, row, source, by, { onlySeed = false } = {}) {
  const cur = await one(db, 'SELECT * FROM bw_placements WHERE id = ?', row.id), now = Date.now();
  if (!cur) {
    await db.prepare('INSERT INTO bw_placements (id, platform, type, url, account, submitted, status, expect, rel_expected, notes, source, deleted, created, updated, by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)')
      .bind(row.id, row.platform, row.type, row.url, row.account, row.submittedAt, row.status, row.expectLink, row.expectedRel, row.notes, source, now, now, by).run();
    return 'new';
  }
  if (onlySeed && (cur.source !== 'seed' || cur.deleted)) return 'kept'; // anh đã sửa/xóa trong Quản trị → file không ghi đè
  const reset = cur.url !== row.url || cur.expect !== row.expectLink; // đổi URL/đích → bỏ mốc rel/noindex cũ
  await db.prepare(`UPDATE bw_placements SET platform = ?, type = ?, url = ?, account = ?, submitted = ?, status = ?, expect = ?, rel_expected = ?, notes = ?, source = ?, deleted = 0, updated = ?, by = ?${reset ? ', rel_base = NULL, noindex_base = NULL' : ''} WHERE id = ?`)
    .bind(row.platform, row.type, row.url, row.account, row.submittedAt, row.status, row.expectLink, row.expectedRel, row.notes, source, now, by, row.id).run();
  return 'updated';
}
async function upsertHandle(db, v, source, by, { onlySeed = false } = {}) {
  const cur = await one(db, 'SELECT * FROM bw_handles WHERE k = ?', v.key), r = v.row, now = Date.now();
  if (!cur) { await db.prepare('INSERT INTO bw_handles (k, platform, handle, url, status, notes, source, deleted, updated, by) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)').bind(v.key, r.platform, r.handle, r.url, r.status, r.notes, source, now, by).run(); return 'new'; }
  if (onlySeed && (cur.source !== 'seed' || cur.deleted)) return 'kept';
  await db.prepare('UPDATE bw_handles SET handle = ?, url = ?, status = ?, notes = ?, source = ?, deleted = 0, updated = ?, by = ? WHERE k = ?').bind(r.handle, r.url, r.status, r.notes, source, now, by, v.key).run();
  return 'updated';
}

// ---------- Thư ----------
async function sendMail(env, subject, body) {
  if (!env.MAIL) return false;
  const to = String(env.REPORT_NOTIFY_EMAIL || '').trim();
  const r = await env.MAIL.fetch('https://mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, text: body + '\n\n' + ADMIN_URL, ...(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(to) ? { to } : {}) }) }).catch(() => null);
  return !!(r && r.ok);
}
/** Sự cố nghiêm trọng đang có (khóa ổn định để chỉ gửi thư 1 lần khi MỚI xuất hiện). */
export async function seriousNow(db) {
  const out = [];
  for (const r of await all(db, "SELECT id, platform, url, last_reasons FROM bw_placements WHERE deleted = 0 AND last_level = 'regression'")) for (const x of J(r.last_reasons, [])) if (SERIOUS.has(x)) out.push({ k: `pl:${r.id}:${x}`, msg: `${x === 'banned' ? 'Tài khoản/bài bị khóa' : 'Bài/hồ sơ bị gỡ'}: ${r.platform} – ${r.url}` });
  for (const r of await all(db, "SELECT domain, reasons, mx_hosts FROM bw_domains WHERE level = 'regression'")) if (J(r.reasons, []).includes('mx-added')) out.push({ k: `dom:${r.domain}:mx`, msg: `Tên miền na ná có MX (nguy cơ thư lừa đảo): ${r.domain} → ${J(r.mx_hosts, []).join(', ')}` });
  for (const r of await all(db, "SELECT k, platform, handle, url FROM bw_handles WHERE deleted = 0 AND last_level = 'regression'")) out.push({ k: `h:${r.k}`, msg: `Tài khoản của mình không còn truy cập được (bị khóa/xóa?): ${r.platform} @${r.handle} – ${r.url}` });
  return out;
}
export async function digestText(db) {
  const P = (await all(db, 'SELECT * FROM bw_placements WHERE deleted = 0 ORDER BY id')).map(pubP), D = (await all(db, 'SELECT * FROM bw_domains ORDER BY domain')).map(pubD), H = (await all(db, 'SELECT * FROM bw_handles WHERE deleted = 0 ORDER BY k')).map(pubH);
  const copy = await cfgGet(db, 'bw_copy', null), by = s => P.filter(p => p.status === s).length;
  const L = [`Bài PR / hồ sơ: ${P.length} mục – live ${by('live')}, chờ duyệt ${by('pending')}, nháp ${by('draft')}, đã gỡ ${by('removed')}.`];
  const lv = l => P.filter(p => p.last && p.last.level === l);
  if (lv('regression').length) L.push('', '⛔ Sự cố:', ...lv('regression').map(p => `- ${p.platform}: ${p.last.reasons.join(', ')} – ${p.url}`));
  if (lv('change').length) L.push('', '🔔 Thay đổi cần cập nhật:', ...lv('change').map(p => `- ${p.platform}: ${p.last.reasons.join(', ')} – ${p.url}`));
  if (lv('manual').length) L.push('', '👀 Cần kiểm tay (bị chặn bot / lỗi mạng):', ...lv('manual').map(p => `- ${p.platform} – ${p.url}`));
  const dReg = D.filter(d => d.level === 'regression'), dAct = D.filter(d => d.a || d.aaaa || d.mx);
  L.push('', `Tên miền na ná: ${D.length} theo dõi · ${dAct.length} đang phân giải · ${dReg.length} mới/cần xem.`, ...dReg.map(d => `- ${d.domain}: ${d.reasons.join(', ')}${d.mx ? ' (MX: ' + d.mxHosts.join(', ') + ')' : ''}`));
  const claim = H.filter(h => h.status !== 'owned' && h.last && h.last.state === 'available'), taken = H.filter(h => h.status !== 'owned' && h.last && h.last.state === 'taken');
  L.push('', `Tài khoản: ${H.filter(h => h.status === 'owned').length}/${H.length} đã giữ · ${claim.length} còn trống nên giữ ngay · ${taken.length} đã có người khác dùng.`, ...claim.map(h => `- Giữ ngay: ${h.platform} @${h.handle} – ${h.url}`));
  const sus = copy && Array.isArray(copy.probes) ? copy.probes.reduce((a, p) => a + (p.suspects || []).length, 0) : 0;
  L.push('', copy ? (copy.configured === false ? 'Dò bản sao chép: chưa bật (thiếu BRAVE_SEARCH_KEY).' : `Dò bản sao chép (${new Date(copy.at || 0).toISOString().slice(0, 10)}): ${sus} trang nghi chép.`) : 'Dò bản sao chép: chưa có kết quả.');
  if (sus) for (const p of copy.probes) for (const s of p.suspects || []) L.push(`- ${s.url} ← ${p.url}`);
  return L.join('\n');
}
/** Gửi thư sau mỗi lần CI báo kết quả: sự cố nghiêm trọng mới → thư ngay; bản tin tuần (≥ 7 ngày từ lần trước). → ['serious', 'digest'] */
export async function notify(env, db, now = Date.now()) {
  const sent = [], cur = await seriousNow(db), prev = new Set(await cfgGet(db, 'bw_serious', [])), fresh = cur.filter(x => !prev.has(x.k));
  if (fresh.length && await sendMail(env, `[Lexkite] ⛔ Thương hiệu/backlink: ${fresh[0].msg.slice(0, 80)}${fresh.length > 1 ? ` (+${fresh.length - 1})` : ''}`, fresh.map(x => '- ' + x.msg).join('\n') + '\n\nCách xử lý từng loại: Quản trị → Backlink, PR & Thương hiệu → nút "Cách xử lý".')) sent.push('serious');
  if (!fresh.length || sent.includes('serious') || !env.MAIL) await cfgSet(db, 'bw_serious', cur.map(x => x.k)); // gửi lỗi → giữ để lần sau thử lại
  const last = +(await cfgGet(db, 'bw_digest_at', 0)) || 0;
  if (now - last >= 7 * DAY - 36e5 && await sendMail(env, '[Lexkite] 📰 Bản tin tuần: Backlink, PR & Thương hiệu', await digestText(db))) { sent.push('digest'); await cfgSet(db, 'bw_digest_at', now); }
  return sent;
}

// ---------- Chạy workflow kiểm ngay (GH_DISPATCH_TOKEN sẵn có của Video Studio) ----------
async function dispatch(env) {
  const tok = env.GH_DISPATCH_TOKEN; if (!tok) throw new Bad(503, 'not-configured', { need: 'GH_DISPATCH_TOKEN' });
  const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WORKFLOW}/dispatches`, { method: 'POST', headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', 'User-Agent': 'lexkite-backlinks', 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: 'main' }) }).catch(() => null);
  if (!r) throw new Bad(504, 'upstream');
  if (r.status !== 204 && !r.ok) throw new Bad(502, r.status === 401 || r.status === 403 ? 'gh-auth' : r.status === 404 ? 'gh-no-workflow' : 'upstream');
}

const OPS = {
  async list(env, db) {
    const P = (await all(db, 'SELECT * FROM bw_placements WHERE deleted = 0 ORDER BY status, platform')).map(pubP), hist = {};
    for (const r of await all(db, 'SELECT pid, at, level, state, http FROM bw_checks WHERE at > ? ORDER BY at', Date.now() - 90 * DAY)) (hist[r.pid] = hist[r.pid] || []).push({ at: r.at, level: r.level, state: r.state, http: r.http });
    for (const p of P) p.history = (hist[p.id] || []).slice(-30);
    return { placements: P, domains: (await all(db, 'SELECT * FROM bw_domains ORDER BY level DESC, domain')).map(pubD), handles: (await all(db, 'SELECT * FROM bw_handles WHERE deleted = 0 ORDER BY platform, handle')).map(pubH),
      copy: await cfgGet(db, 'bw_copy', null), run: await cfgGet(db, 'bw_run', null), dispatched: await cfgGet(db, 'bw_dispatch', null),
      configured: { ci: String(env.STUDIO_CALLBACK_SECRET || '').length >= 16, dispatch: !!env.GH_DISPATCH_TOKEN, mail: !!env.MAIL } };
  },
  async placementSet(env, db, b, who) {
    const v = validatePlacement(b.row || {}); if (!v.ok) throw new Bad(400, 'invalid', { fields: v.errors });
    if (b.isNew && await one(db, 'SELECT id FROM bw_placements WHERE id = ? AND deleted = 0', v.row.id)) throw new Bad(409, 'exists');
    await upsertPlacement(db, v.row, 'admin', who.email); return { ok: true, id: v.row.id };
  },
  async placementDelete(env, db, b, who) { const r = await db.prepare('UPDATE bw_placements SET deleted = 1, updated = ?, by = ? WHERE id = ?').bind(Date.now(), who.email, String(b.id || '')).run(); return { ok: true, changed: (r && r.meta && r.meta.changes) ?? null }; },
  async handleSet(env, db, b, who) { const v = validateHandle(b.row || {}); if (!v.ok) throw new Bad(400, 'invalid', { fields: v.errors }); await upsertHandle(db, v, 'admin', who.email); return { ok: true, k: v.key }; },
  async handleDelete(env, db, b, who) { await db.prepare('UPDATE bw_handles SET deleted = 1, updated = ?, by = ? WHERE k = ?').bind(Date.now(), who.email, String(b.k || '')).run(); return { ok: true }; },
  async domainAck(env, db, b) { await db.prepare("UPDATE bw_domains SET acked = 1, level = 'ok' WHERE domain = ?").bind(String(b.domain || '').toLowerCase()).run(); return { ok: true }; },
  async checkNow(env, db, b, who) { await dispatch(env); await cfgSet(db, 'bw_dispatch', { at: Date.now() }, who.email); return { ok: true }; },
  async export(env, db) { return { version: 1, placements: (await all(db, 'SELECT * FROM bw_placements WHERE deleted = 0 ORDER BY id')).map(fileP) }; },
};
const WRITE = new Set(['placementSet', 'placementDelete', 'handleSet', 'handleDelete', 'domainAck', 'checkNow']);

const CI = {
  // Seed từ file (chỉ ghi đè mục chưa sửa trong Quản trị) → trả sổ hiện tại + mốc lần trước để CLI so sánh
  async ciSync(env, db, b) {
    let n = 0;
    for (const x of (Array.isArray(b.placements) ? b.placements : []).slice(0, 300)) { const v = validatePlacement(x); if (v.ok && await upsertPlacement(db, v.row, 'seed', 'ci', { onlySeed: true }) !== 'kept') n++; }
    for (const x of (Array.isArray(b.handles) ? b.handles : []).slice(0, 100)) { const v = validateHandle(x); if (v.ok && await upsertHandle(db, v, 'seed', 'ci', { onlySeed: true }) !== 'kept') n++; }
    const P = (await all(db, 'SELECT * FROM bw_placements WHERE deleted = 0')).map(r => ({ ...fileP(r), prev: { relBase: r.rel_base || null, noindexBase: bool(r.noindex_base), level: r.last_level || null, state: r.last_state || null } }));
    const H = (await all(db, 'SELECT * FROM bw_handles WHERE deleted = 0')).map(r => ({ platform: r.platform, handle: r.handle, url: r.url, status: r.status, notes: r.notes, prev: { state: r.last_state || null } }));
    const D = Object.fromEntries((await all(db, 'SELECT * FROM bw_domains')).map(r => [r.domain, pubD(r)]));
    return { seeded: n, placements: P, handles: H, domains: D };
  },
  async ciReport(env, db, b) {
    const now = Date.now(), st = { p: 0, d: 0, h: 0 };
    for (const x of (Array.isArray(b.placements) ? b.placements : []).slice(0, 300)) {
      const cur = await one(db, 'SELECT * FROM bw_placements WHERE id = ? AND deleted = 0', String(x && x.id || '')); if (!cur) continue;
      const level = lvl(x.level), state = word(x.state, 20) || 'error', rs = reasons(x.reasons), rel = relOk(x.rel), changed = cur.last_level !== level || cur.last_state !== state;
      const keepBase = level === 'manual' || level === 'skip'; // không kiểm được → giữ mốc cũ
      await db.batch([
        db.prepare(`UPDATE bw_placements SET last_at = ?, last_http = ?, last_final = ?, last_link = ?, last_rel = ?, last_noindex = ?, last_title = ?, last_state = ?, last_level = ?, last_reasons = ?, last_change = ?${keepBase ? '' : ', rel_base = COALESCE(rel_base, ?), noindex_base = COALESCE(noindex_base, ?)'} WHERE id = ?`)
          .bind(now, Math.max(0, Math.min(999, +x.http || 0)), httpsUrl(x.final), b01(x.link), rel, b01(x.noindex), text(x.title, 200), state, level, JSON.stringify(rs), changed ? now : (cur.last_change || now), ...(keepBase ? [] : [relOk(x.relBase), b01(x.noindexBase)]), cur.id),
        db.prepare('INSERT INTO bw_checks (pid, at, http, link, rel, noindex, state, level, reasons) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(cur.id, now, Math.max(0, Math.min(999, +x.http || 0)), b01(x.link), rel, b01(x.noindex), state, level, JSON.stringify(rs)),
      ]); st.p++;
    }
    for (const x of (Array.isArray(b.domains) ? b.domains : []).slice(0, 100)) {
      const d = String(x && x.domain || '').toLowerCase(); if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) || d.length > 80) continue;
      const prev = await one(db, 'SELECT level, since, acked FROM bw_domains WHERE domain = ?', d), level = lvl(x.level), fresh = level === 'regression' && (!prev || prev.level !== 'regression');
      await db.prepare('INSERT OR REPLACE INTO bw_domains (domain, status, ns, a, aaaa, mx, mx_hosts, ips, level, reasons, since, at, acked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(d, word(x.status, 5) || 'err', b01(x.ns), b01(x.a), b01(x.aaaa), b01(x.mx), JSON.stringify((Array.isArray(x.mxHosts) ? x.mxHosts : []).slice(0, 4).map(h => text(h, 100))), JSON.stringify((Array.isArray(x.ips) ? x.ips : []).slice(0, 4).map(h => text(h, 60))), level, JSON.stringify(reasons(x.reasons)), fresh ? now : prev ? prev.since : null, now, fresh ? 0 : prev ? prev.acked || 0 : 0).run(); st.d++;
    }
    for (const x of (Array.isArray(b.handles) ? b.handles : []).slice(0, 100)) {
      const k = `${String(x && x.platform || '').toLowerCase()}:${String(x && x.handle || '').toLowerCase()}`;
      const r = await db.prepare('UPDATE bw_handles SET last_at = ?, last_state = ?, last_level = ?, last_reasons = ? WHERE k = ? AND deleted = 0').bind(now, word(x.state, 20) || 'unknown', lvl(x.level), JSON.stringify(reasons(x.reasons)), k).run(); st.h++;
    }
    const run = b.run && typeof b.run === 'object' ? b.run : {};
    await cfgSet(db, 'bw_run', { at: now, url: httpsUrl(run.url, 300), sha: /^[0-9a-f]{7,40}$/.test(run.sha || '') ? run.sha : '', counts: Object.fromEntries(Object.entries(run.counts || {}).filter(([k]) => /^[a-z]{1,20}$/.test(k)).slice(0, 12).map(([k, v]) => [k, Math.max(0, Math.min(1e5, +v || 0))])) });
    await db.prepare('DELETE FROM bw_checks WHERE at < ?').bind(now - 180 * DAY).run();
    return { ok: true, stored: st, mailed: await notify(env, db, now) };
  },
  // Kết quả dò bản sao chép (scripts/copy-watch.mjs → reports/copy-watch.json, workflow content-protect.yml) – chỉ hiển thị/cảnh báo, không dò lại
  async ciCopy(env, db, b) {
    const probes = (Array.isArray(b.probes) ? b.probes : []).slice(0, 30).map(p => ({ url: httpsUrl(p && p.url, 300), sentence: text(p && p.sentence, 240), status: +(p && p.status) || 0,
      suspects: (Array.isArray(p && p.suspects) ? p.suspects : []).slice(0, 10).map(s => ({ url: httpsUrl(s && s.url, 300), title: text(s && s.title, 160) })).filter(s => s.url) })).filter(p => p.url);
    await cfgSet(db, 'bw_copy', { at: Date.now(), configured: b.configured !== false, probes, run: httpsUrl(b.run, 300) });
    return { ok: true, n: probes.length };
  },
};

// ---------- Xác thực CI: HMAC thân yêu cầu + dấu thời gian (chống phát lại) ----------
const hex = buf => [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
const sha = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
async function hmac(key, msg) { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg))); }
async function ciOk(env, request, raw) {
  const key = String(env.STUDIO_CALLBACK_SECRET || ''), ts = +request.headers.get('X-BW-Ts') || 0, sig = String(request.headers.get('X-BW-Sig') || '');
  if (!ts || Math.abs(Date.now() / 1000 - ts) > SKEW || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const want = await hmac(key, `bw|${ts}.${await sha(raw)}`); let d = 0; for (let i = 0; i < 64; i++) d |= want.charCodeAt(i) ^ sig.charCodeAt(i); return d === 0;
}
/** Ký yêu cầu CI (dùng bởi scripts/pr-check.mjs và test). */
export async function ciHeaders(secret, raw, ts = Math.floor(Date.now() / 1000)) { return { 'X-BW-Ts': String(ts), 'X-BW-Sig': await hmac(secret, `bw|${ts}.${await sha(raw)}`) }; }

const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  if (+(request.headers.get('Content-Length') || 0) > MAX_BODY) return json(request, 413, { error: 'too-large' });
  let who = null;
  const isCi = request.headers.get('X-BW-Sig') != null;
  if (!isCi) { const g = await adminGate(request, env, 'bw'); if (!g.who) return json(request, g.status, { error: g.error }); who = g.who; }
  const raw = await request.text().catch(() => ''); if (raw.length > MAX_BODY) return json(request, 413, { error: 'too-large' });
  if (isCi) {
    if (String(env.STUDIO_CALLBACK_SECRET || '').length < 16) return json(request, 503, { error: 'not-configured', need: 'STUDIO_CALLBACK_SECRET' });
    if (await limit('bw-ci:' + (request.headers.get('CF-Connecting-IP') || '?'), 30, 60)) return json(request, 429, { error: 'too-fast' });
    if (!(await ciOk(env, request, raw))) return json(request, 403, { error: 'forbidden' });
  }
  let b; try { b = JSON.parse(raw); } catch (e) { return json(request, 400, { error: 'json' }); }
  const T = who ? OPS : CI, fn = b && typeof b === 'object' && Object.hasOwn(T, b.op) ? T[b.op] : null; if (!fn) return json(request, 400, { error: 'op' });
  { const gb = await guardBg(request, env, json); if (gb) return gb; } // cầu dao D1 (_d1guard.js): việc nền/quản trị dừng khi tài khoản đã đọc ≥ 50 % hạn mức
  try {
    await setup(env.DB);
    const out = await fn(env, env.DB, b, who);
    if (who && WRITE.has(b.op)) await adminAudit(env, request, who.email, 'bw:' + b.op, true);
    return json(request, 200, out);
  } catch (e) {
    if (who && WRITE.has(b.op)) await adminAudit(env, request, who.email, 'bw:' + b.op, false);
    if (e instanceof Bad) return json(request, e.status, { error: e.code, ...(e.extra || {}) });
    const k = [env.STUDIO_CALLBACK_SECRET, env.GH_DISPATCH_TOKEN].filter(x => x && x.length > 5); let m = String((e && e.message) || e); for (const s of k) m = m.split(s).join('***');
    return json(request, 500, { error: 'server', message: m.slice(0, 200) });
  }
}
