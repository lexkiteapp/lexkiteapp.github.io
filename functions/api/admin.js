/* API trang quản trị (/admin.html). Chỉ email trong biến bí mật ADMIN_EMAILS (Cloudflare Pages) được dùng.
 * POST /api/admin  (Authorization: Bearer <Firebase ID token>)  { op, ... }
 * op: usage · services · serviceSet · serviceDelete · overview · users · usersExport · user · userDelete · inbox · inboxMark · analytics · live · growth · errors · errorsClear · config · configSet · alerts
 * (alerts gồm cả Backlink, PR & Thương hiệu – bảng bw_* do functions/api/backlinks.js ghi) */
import { claims, limit, userDocs } from './sync.js';
import { geminiKeys, geminiCall, isCooling, resetGeminiCache, gemFetch } from './ai.js';
import { setup as hitSetup, dayOf as vday, TZ, hitMode, aeOnline } from './hit.js';
import { growthData } from './growth.js';
import { purgeNotices } from './notices.js';
import { purgeConfig, ADS_PUBLIC } from './config.js';
import { stats as adsStatsOf, guardOf, realOf as adsRealOf } from './_ads.js';
import { SEL as ADS_REV_SEL } from './ads-report.js';

const ORIGINS = /^https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)$/;
const REPO = 'lexkiteapp/lexkiteapp.github.io';
// Quảng cáo (docs/ADS.md): cờ công khai + khóa chỉ quản trị (eCPM ước tính USD/1000 lượt, ngưỡng cổng giữ chân %, cỡ mẫu tối thiểu)
const ADS_KEYS = [...ADS_PUBLIC, 'ads_ecpm_web', 'ads_ecpm_android', 'ads_ecpm_ios', 'ads_guard_pct', 'ads_guard_min'];
const CONFIG_KEYS = ['banner', 'banner_url', 'banner_level', 'ai_user', 'ai_anon', 'ai_global', 'alert_errors', 'note', 'hit_rate', 'vocab_img', 'vocab_img_pct', ...ADS_KEYS];
const DAY = 86400e3;
// Ngôn ngữ giao diện quản trị: máy khách gửi ui: 'vi' | 'en' (thiếu = 'vi', tương thích cũ) – chỉ áp cho vài câu hiển thị
const tx = (b, vi, en) => (b && b.ui === 'en' ? en : vi);
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

// Hạn mức gói miễn phí (cập nhật khi nhà cung cấp đổi) – dùng cho thẻ dung lượng & cảnh báo
const FREE = { dbBytes: 500 * 1024 * 1024, writesDay: 100000, readsDay: 5000000, authMau: 50000, aiDay: 400 };
let ready = false;

// Đếm dòng: bảng nhật ký/lớn dùng MAX(rowid) (đọc 1 dòng, ước lượng) thay COUNT(*) quét cả bảng (23/10: admin_log 27 lượt × 14,5k dòng); cả bản đồ giữ ≥ 10 phút ở bộ nhớ isolate + Cache API biên.
const BIG_TABLES = new Set(['admin_log', 'drive_files', 'drive_audit', 'key_audit', 'quota_audit', 'api_key_events', 'sessions', 'errors', 'pageviews', 'sync_log']);
const COUNTS_TTL = 600e3;
let COUNTS_MEM = null;
async function tableCounts(db, names) {
  const now = Date.now();
  if (COUNTS_MEM && now - COUNTS_MEM.t < COUNTS_TTL) return COUNTS_MEM.v;
  const ck = typeof caches !== 'undefined' && caches.default ? new Request('https://counts.lexkite.internal/admin-usage-counts') : null;
  if (ck) { try { const hit = await caches.default.match(ck); if (hit) { const j = await hit.json(); if (now - j.t < COUNTS_TTL) { COUNTS_MEM = j; return j.v; } } } catch (e) { /* bộ nhớ đệm hỏng: tính lại */ } }
  const v = {};
  for (const n of names) {
    if (BIG_TABLES.has(n)) { const r = await one(db, `SELECT MAX(rowid) AS n FROM "${n}"`).catch(() => null); v[n] = (r && r.n) || 0; }
    else v[n] = (await one(db, `SELECT COUNT(*) AS n FROM "${n}"`)).n; // scan-ok: bảng nhỏ, cả bản đồ cache 10 phút
  }
  COUNTS_MEM = { t: now, v };
  if (ck) { try { await caches.default.put(ck, new Response(JSON.stringify(COUNTS_MEM), { headers: { 'Cache-Control': 'public, max-age=600' } })); } catch (e) { /* bỏ qua */ } }
  return v;
}

async function setup(db) {
  if (ready) return;
  await hitSetup(db);
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, purpose TEXT, account TEXT, console TEXT, billing TEXT, free TEXT, secret TEXT, status TEXT, note TEXT, ord INTEGER DEFAULT 0)'),
    db.prepare('CREATE TABLE IF NOT EXISTS admin_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, email TEXT, op TEXT, ok INTEGER, ip TEXT, country TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS i18n_fix (lang TEXT, key TEXT, val TEXT, at INTEGER, by TEXT, PRIMARY KEY (lang, key)) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS i18n_judge (h TEXT PRIMARY KEY, lang TEXT, ok INTEGER, note TEXT, at INTEGER) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS user_backups (id INTEGER PRIMARY KEY AUTOINCREMENT, uid TEXT NOT NULL, at INTEGER NOT NULL, by TEXT, reason TEXT, docs TEXT NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS contact_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, who TEXT NOT NULL, at INTEGER NOT NULL, name TEXT, email TEXT, msg TEXT, lang TEXT, sent INTEGER DEFAULT 0)'),
    db.prepare('CREATE TABLE IF NOT EXISTS notices (id TEXT PRIMARY KEY, at INTEGER NOT NULL, by TEXT, title TEXT NOT NULL, body TEXT NOT NULL, kind TEXT NOT NULL DEFAULT \'info\', img TEXT, cta_label TEXT, cta_url TEXT, target TEXT, send_at INTEGER, expire_at INTEGER, lang TEXT, revoked INTEGER DEFAULT 0) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS notice_reads (id TEXT NOT NULL, uid TEXT NOT NULL, read_at INTEGER NOT NULL, clicked INTEGER DEFAULT 0, PRIMARY KEY (id, uid)) WITHOUT ROWID'),
  ]);
  await db.prepare('ALTER TABLE contact_msgs ADD COLUMN handled INTEGER DEFAULT 0').run().catch(() => {});
  await db.prepare('ALTER TABLE users ADD COLUMN blocked INTEGER DEFAULT 0').run().catch(() => {});
  await db.prepare('ALTER TABLE users ADD COLUMN tags TEXT').run().catch(() => {});
  await db.prepare('ALTER TABLE users ADD COLUMN notes TEXT').run().catch(() => {});
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_user_backups_uid ON user_backups (uid, at)').run().catch(() => {});
  ready = true;
}

const one = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).first()) || {};
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const dayStr = t => new Date(t).toISOString().slice(0, 10); // ngày UTC – hạn mức nhà cung cấp (D1, AI) reset 0h UTC
// Thống kê truy cập: "ngày" theo giờ Việt Nam (vday, hit.js) · chỉ người thật: bỏ máy tự động (cột bot) và khách là tài khoản quản trị
// (vid đã gắn uid có email trong ADMIN_EMAILS – chỉ dùng trong SQL, không trả về máy khách)
async function humanWhere(db, env) {
  const admins = adminList(env); let vids = [];
  if (admins.length) vids = (await all(db, 'SELECT DISTINCT m.vid AS v FROM vid_uid m JOIN users u ON u.uid = m.uid WHERE lower(u.email) IN (SELECT value FROM json_each(?))', JSON.stringify(admins)).catch(() => []))
    .map(r => String(r.v)).filter(v => /^[a-z0-9]{8,32}$/i.test(v)).slice(0, 300);
  return { vids, H: 'bot IS NULL' + (vids.length ? ` AND vid NOT IN (${vids.map(v => `'${v}'`).join(', ')})` : '') };
}

// Danh sách khóa Gemini (gộp khóa đơn cũ 'gemini_key' vào danh sách mới)
async function gkList(db) {
  const rows = (await db.prepare("SELECT k, v, at, by FROM config WHERE k IN ('gemini_keys', 'gemini_key')").all()).results || [];
  let list = []; const many = rows.find(r => r.k === 'gemini_keys'), one = rows.find(r => r.k === 'gemini_key');
  try { list = many ? JSON.parse(many.v) : []; } catch (e) { list = []; }
  if (one && one.v && !list.some(x => x.k === one.v)) list.unshift({ k: one.v, at: one.at || 0, by: one.by || '' });
  return list;
}
async function gkSave(db, list) {
  await db.batch([db.prepare('INSERT OR REPLACE INTO config (k, v, at) VALUES (?, ?, ?)').bind('gemini_keys', JSON.stringify(list), Date.now()), db.prepare("DELETE FROM config WHERE k = 'gemini_key'")]);
  resetGeminiCache();
}

const adminList = env => String((env && env.ADMIN_EMAILS) || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
// Bộ lọc danh sách người dùng (dùng chung cho users & usersExport). Danh sách email quản trị chỉ dùng trong SQL, không trả về máy khách.
function userWhere(b, env) {
  const now = Date.now(), w = [], a = [], admins = adminList(env), q = String(b.q || '').trim().toLowerCase();
  if (q) { a.push('%' + q.replace(/[\\%_]/g, c => '\\' + c) + '%', q); w.push(`(lower(email) LIKE ?${a.length - 1} ESCAPE '\\' OR lower(name) LIKE ?${a.length - 1} ESCAPE '\\' OR lower(uid) = ?${a.length})`); }
  if (b.role === 'admin' || b.role === 'learner') {
    const ph = admins.map(x => { a.push(x); return '?' + a.length; }).join(', ');
    w.push(b.role === 'admin' ? (admins.length ? `lower(email) IN (${ph})` : '0') : (admins.length ? `lower(COALESCE(email, '')) NOT IN (${ph})` : '1'));
  }
  if (b.status === 'active7') { a.push(now - 7 * DAY); w.push('seen > ?' + a.length); }
  else if (b.status === 'dormant') { a.push(now - 30 * DAY); w.push('seen < ?' + a.length); }
  else if (b.status === 'new7') { a.push(now - 7 * DAY); w.push('created > ?' + a.length); }
  if (/^(web|ios|android|ext|app)$/.test(b.plat || '')) { a.push(b.plat); w.push('plat = ?' + a.length); }
  return { sql: w.length ? ' WHERE ' + w.join(' AND ') : '', args: a, order: b.sort === 'new' ? 'created DESC' : 'seen DESC', admins };
}
const isAdm = (admins, email) => admins.includes(String(email || '').toLowerCase());
// Đọc tài liệu đồng bộ (dạng {json} hoặc {z: gzip base64}) – chỉ dùng cho tài liệu nhỏ (meta)
async function docJson(body) {
  try {
    const d = JSON.parse(body); if (d.json) return JSON.parse(d.json);
    if (d.z) { const bin = atob(d.z), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return JSON.parse(await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text()); }
  } catch (e) { /* bỏ qua */ }
  return null;
}
// Đệm kết quả trong Cache API của Cloudflare (giảm lượt đọc D1 khi trang Quản trị tự cập nhật)
async function cached(key, ttl, fn) {
  const c = caches.default, req = new Request('https://cache.lexkite.internal/' + key);
  try { const hit = await c.match(req); if (hit) return hit.json(); } catch (e) { /* không có cache (dev) */ }
  const out = await fn();
  try { await c.put(req, new Response(JSON.stringify(out), { headers: { 'Cache-Control': 'max-age=' + ttl } })); } catch (e) { /* bỏ qua */ }
  return out;
}

const OPS = {
  async whoami() { return { admin: true }; }, // cổng phía máy khách: tới được đây = adminGate đã xác nhận (không trả danh sách email)
  async usage(db, b) {
    const now = Date.now(), d1 = dayStr(now), t0 = Date.parse(d1 + 'T00:00:00Z');
    const r = await db.prepare('SELECT 1').run(), size = (r.meta && (r.meta.size_after ?? r.meta.db_size)) || 0;
    const tables = await all(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'");
    const counts = await tableCounts(db, tables.map(t => t.name));
    const w = await Promise.all([
      one(db, 'SELECT COUNT(*) AS n FROM sessions WHERE at >= ?', t0), one(db, 'SELECT COUNT(*) AS n FROM docs WHERE updated >= ?', t0),
      one(db, 'SELECT COUNT(*) AS n FROM users WHERE seen >= ?', t0), one(db, 'SELECT COALESCE(SUM(n), 0) AS n FROM errors WHERE last >= ?', t0),
      one(db, 'SELECT COUNT(*) AS n FROM contact_msgs WHERE at >= ?', t0),
    ]);
    const writes = w.reduce((a, x) => a + (x.n || 0), 0);
    const mau = (await one(db, 'SELECT COUNT(*) AS n FROM users WHERE seen > ?', now - 30 * DAY)).n || 0;
    const ai = (await one(db, "SELECT n FROM ai_quota WHERE id = '*' AND day = ?", d1).catch(() => ({}))).n || 0;
    const aiCap = +((await one(db, "SELECT v FROM config WHERE k = 'ai_global'")).v || FREE.aiDay);
    const meter = (name, used, cap, unit, hint) => ({ name, used, cap, pct: cap ? Math.round(used / cap * 1000) / 10 : 0, unit, hint });
    return { counts, meters: [
      meter(tx(b, 'Dung lượng cơ sở dữ liệu D1', 'D1 database storage'), size, FREE.dbBytes, 'bytes', tx(b, 'Gói miễn phí: 500 MB/cơ sở dữ liệu. Gói Workers Paid 5 USD/tháng: 10 GB.', 'Free tier: 500 MB per database. Workers Paid ($5/month): 10 GB.')),
      meter(tx(b, 'Lượt ghi D1 hôm nay (ước tính)', 'D1 writes today (estimate)'), writes, FREE.writesDay, 'rows', tx(b, 'Miễn phí 100.000 dòng/ngày; reset 0h UTC.', 'Free: 100,000 rows/day; resets at 00:00 UTC.')),
      meter(tx(b, 'Người dùng hoạt động 30 ngày (Firebase Auth)', '30-day active users (Firebase Auth)'), mau, FREE.authMau, 'users', tx(b, 'Miễn phí 50.000 MAU; vượt mức Google tính phí theo MAU.', 'Free up to 50,000 MAU; Google bills per MAU beyond that.')),
      meter(tx(b, 'Lượt chấm AI hôm nay', 'AI grading calls today'), ai, aiCap, 'calls', tx(b, 'Trần do mình đặt để không vượt 10.000 neurons/ngày miễn phí của Workers AI.', 'Our own cap to stay within the free 10,000 neurons/day of Workers AI.')),
    ] };
  },
  async services(db) { return { rows: await all(db, 'SELECT * FROM services ORDER BY ord, id') }; },
  async serviceSet(db, b) {
    const f = ['name', 'purpose', 'account', 'console', 'billing', 'free', 'secret', 'status', 'note'], v = f.map(k => String(b.row && b.row[k] || '').slice(0, 1000));
    if (!v[0]) throw new Error('name');
    if (b.row.id) await db.prepare(`UPDATE services SET ${f.map(k => k + ' = ?').join(', ')} WHERE id = ?`).bind(...v, +b.row.id).run();
    else await db.prepare(`INSERT INTO services (${f.join(', ')}, ord) VALUES (${f.map(() => '?').join(', ')}, ?)`).bind(...v, +b.row.ord || 99).run();
    return { ok: true };
  },
  async serviceDelete(db, b) { await db.prepare('DELETE FROM services WHERE id = ?').bind(+b.id).run(); return { ok: true }; },
  async overview(db, b, who, env) {
    const now = Date.now(), d1 = vday(now), d7 = vday(now - 6 * DAY), { H, vids } = await humanWhere(db, env);
    const [u, s, c, e] = await Promise.all([
      one(db, 'SELECT COUNT(*) AS total, SUM(created > ?1) AS new7, SUM(seen > ?2) AS act1, SUM(seen > ?1) AS act7, SUM(seen > ?3) AS act30 FROM users', now - 7 * DAY, now - DAY, now - 30 * DAY),
      one(db, `SELECT SUM(day = ?1) AS today, COUNT(*) AS s7, COUNT(DISTINCT vid) AS v7, AVG(dur) AS dur7, AVG(pages) AS pages7 FROM sessions WHERE ${H} AND day >= ?2`, d1, d7),
      one(db, 'SELECT COUNT(*) AS open FROM contact_msgs WHERE COALESCE(handled, 0) = 0'),
      one(db, 'SELECT COUNT(*) AS kinds, COALESCE(SUM(n), 0) AS hits FROM errors WHERE last > ?', now - DAY),
    ]);
    // Thẻ KPI trang Tổng quan (thêm – không đổi trường cũ): người thật hôm nay/7/30 ngày + kỳ trước để tính xu hướng, đang online, phiên tự động đã loại hôm nay, chuỗi 14 ngày
    const d0 = vday(now - DAY), d14 = vday(now - 13 * DAY), d30 = vday(now - 29 * DAY), d60 = vday(now - 59 * DAY);
    const [h, on, ex, ser] = await Promise.all([
      one(db, `SELECT COUNT(DISTINCT CASE WHEN day = ?1 THEN vid END) AS d1, COUNT(DISTINCT CASE WHEN day = ?2 THEN vid END) AS p1, COUNT(DISTINCT CASE WHEN day >= ?3 THEN vid END) AS d7, COUNT(DISTINCT CASE WHEN day >= ?4 AND day < ?3 THEN vid END) AS p7, COUNT(DISTINCT CASE WHEN day >= ?5 THEN vid END) AS d30, COUNT(DISTINCT CASE WHEN day < ?5 THEN vid END) AS p30 FROM sessions WHERE ${H} AND day >= ?6`, d1, d0, d7, d14, d30, d60).catch(() => ({})),
      one(db, `SELECT COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND last > ?`, now - 5 * 60e3).catch(() => ({})),
      one(db, `SELECT COUNT(*) AS s FROM sessions WHERE day = ? AND NOT (${H})`, d1).catch(() => ({})),
      all(db, `SELECT day, COUNT(DISTINCT vid) AS v FROM sessions WHERE ${H} AND day >= ? GROUP BY day ORDER BY day`, d14).catch(() => []),
    ]);
    const by = Object.fromEntries(ser.map(r => [r.day, r.v]));
    const aeOn = hitMode(env) === 'hybrid' ? await aeOnline(env, now, vids) : null; // nhịp online chỉ ở Analytics Engine (hit.js)
    return { users: u, sessions: s, inbox: c, errors24: e, humans: h, online: aeOn ? aeOn.n : on.n || 0, excluded: ex.s || 0, series: Array.from({ length: 14 }, (_, i) => { const k = vday(now - (13 - i) * DAY); return { day: k, v: by[k] || 0 }; }) };
  },
  async users(db, b, who, env) {
    const f = userWhere(b, env), off = Math.max(0, Math.floor(+b.offset || 0)), now = Date.now();
    const [rows, cnt, k, plats] = await Promise.all([
      all(db, `SELECT uid, email, name, created, seen, plat, n, COALESCE(blocked, 0) AS blocked, tags FROM users${f.sql} ORDER BY ${f.order} LIMIT 50 OFFSET ${off}`, ...f.args),
      one(db, `SELECT COUNT(*) AS n FROM users${f.sql}`, ...f.args),
      one(db, 'SELECT COUNT(*) AS total, SUM(seen > ?1) AS act1, SUM(seen > ?2) AS act7, SUM(seen > ?3) AS act30, SUM(created > ?2) AS new7 FROM users', now - DAY, now - 7 * DAY, now - 30 * DAY),
      all(db, "SELECT COALESCE(plat, '') AS k, COUNT(*) AS n FROM users GROUP BY k ORDER BY n DESC"),
    ]);
    return { rows: rows.map(r => ({ ...r, isAdmin: isAdm(f.admins, r.email) })), filtered: cnt.n || 0, total: k.total || 0, kpi: k, plats, offset: off };
  },
  async usersExport(db, b, who, env) {
    const f = userWhere(b, env);
    const rows = await all(db, `SELECT email, name, plat, created, seen, n, COALESCE(blocked, 0) AS blocked, tags FROM users${f.sql} ORDER BY ${f.order} LIMIT 5000`, ...f.args);
    return { rows: rows.map(r => ({ ...r, isAdmin: isAdm(f.admins, r.email) })) };
  },
  async user(db, b, who, env) {
    const u = await one(db, 'SELECT * FROM users WHERE uid = ?', String(b.uid));
    const ud = await userDocs(db, String(b.uid)); // gói 'pack' (sync.js) được mở thành từng tài liệu
    const docs = ud.map(x => ({ k: x.k, bytes: String(x.body || '').length, updated: x.updated }));
    const backups = await all(db, 'SELECT id, at, by, reason, LENGTH(docs) AS bytes FROM user_backups WHERE uid = ? ORDER BY at DESC LIMIT 10', String(b.uid)).catch(() => []);
    let tags = []; try { tags = JSON.parse(u.tags || '[]'); } catch (e) { tags = []; }
    // Số liệu học tập từ tài liệu "meta" (đã gồm thống kê & điểm thưởng) – chỉ đọc 1 tài liệu nhỏ
    let learn = null;
    const m = ud.find(x => x.k === 'meta') || {};
    if (m.body) {
      const top = (() => { try { return JSON.parse(m.body); } catch (e) { return {}; } })(), d = await docJson(m.body);
      if (d) {
        const days = Object.keys((d.stats && d.stats.days) || {}).sort(), g = d.game || {}, tot = g.total || {};
        let streak = 0; const set = new Set(days), t = new Date(); if (!set.has(t.toISOString().slice(0, 10))) t.setUTCDate(t.getUTCDate() - 1);
        while (set.has(t.toISOString().slice(0, 10)) && streak < 400) { streak++; t.setUTCDate(t.getUTCDate() - 1); }
        learn = { xp: g.xp || 0, studyDays: days.length, lastStudy: days[days.length - 1] || '', streak, reviews: tot.reviews || 0, newWords: tot.newWords || 0, quizzes: tot.quizzes || 0, readings: tot.readings || 0, spoken: tot.spoken || 0, badges: Object.keys(g.badges || {}).length, chunks: top.chunks || 0 };
      }
    }
    return { user: { ...u, tags, notes: u.notes || '', blocked: +u.blocked ? 1 : 0, isAdmin: isAdm(adminList(env), u.email) }, docs, learn, backups };
  },
  async userTag(db, b) {
    const uid = String(b.uid || '').trim();
    if (!uid || uid.length > 128) throw new Error('uid-required');
    let tags = Array.isArray(b.tags) ? b.tags.slice(0, 50).map(t => typeof t === 'string' ? t.trim() : '').filter(Boolean).slice(0, 10) : [];
    tags = tags.map(t => t.slice(0, 30));
    const notes = String(b.notes || '').slice(0, 2000);
    await db.prepare('UPDATE users SET tags = ?, notes = ? WHERE uid = ?').bind(JSON.stringify(tags), notes, uid).run();
    return { ok: true, tags, notes };
  },
  async userBlock(db, b) {
    const uid = String(b.uid || '').trim();
    if (!uid || uid.length > 128) throw new Error('uid-required');
    const u = await one(db, 'SELECT email FROM users WHERE uid = ?', uid);
    if (!u) throw new Error('user-not-found');
    if (b.confirm !== (u.email || uid)) throw new Error('confirm');
    const blocked = b.blocked === true || b.blocked === 1 ? 1 : 0;
    await db.prepare('UPDATE users SET blocked = ? WHERE uid = ?').bind(blocked, uid).run();
    return { ok: true, uid, blocked };
  },
  async userReset(db, b, who) {
    const uid = String(b.uid || '').trim();
    if (!uid || uid.length > 128) throw new Error('uid-required');
    const u = await one(db, 'SELECT email FROM users WHERE uid = ?', uid);
    if (!u) throw new Error('user-not-found');
    if (b.confirm !== (u.email || uid)) throw new Error('confirm');
    const now = Date.now();
    const docs = await all(db, 'SELECT k, h, body, updated FROM docs WHERE uid = ?', uid);
    if (docs.length) {
      await db.prepare('INSERT INTO user_backups (uid, at, by, reason, docs) VALUES (?, ?, ?, ?, ?)')
        .bind(uid, now, String(who && who.email || 'admin'), 'reset_progress', JSON.stringify(docs)).run();
    }
    const t30 = now - 30 * 86400000;
    await db.prepare('DELETE FROM user_backups WHERE at < ?').bind(t30).run().catch(() => {});
    await db.prepare('DELETE FROM docs WHERE uid = ?').bind(uid).run();
    return { ok: true, uid, backedUp: docs.length };
  },
  async userRestore(db, b, who) {
    const uid = String(b.uid || '').trim();
    const backupId = +b.backupId;
    if (!uid || uid.length > 128 || !Number.isSafeInteger(backupId) || backupId < 1) throw new Error('params-required');
    const u = await one(db, 'SELECT email FROM users WHERE uid = ?', uid);
    if (!u) throw new Error('user-not-found');
    if (b.confirm !== (u.email || uid)) throw new Error('confirm');
    const bk = await one(db, 'SELECT docs FROM user_backups WHERE id = ? AND uid = ?', backupId, uid);
    if (!bk || !bk.docs) throw new Error('backup-not-found');
    let docs = [];
    try { docs = JSON.parse(bk.docs); } catch (e) { throw new Error('corrupt-backup'); }
    if (!Array.isArray(docs)) throw new Error('invalid-backup');
    const now = Date.now();
    const batch = [db.prepare('DELETE FROM docs WHERE uid = ?').bind(uid)];
    const stmt = db.prepare('INSERT INTO docs (uid, k, h, body, updated) VALUES (?1, ?2, ?3, ?4, ?5)');
    for (const d of docs) {
      if (d.k && d.h && d.body) {
        batch.push(stmt.bind(uid, d.k, d.h, d.body, d.updated || now));
      }
    }
    await db.batch(batch);
    return { ok: true, uid, restored: docs.length };
  },
  async userExportData(db, b, who) {
    const uid = String(b.uid || '').trim();
    if (!uid || uid.length > 128) throw new Error('uid-required');
    const u = await one(db, 'SELECT * FROM users WHERE uid = ?', uid);
    if (!u || !u.uid) throw new Error('user-not-found');
    const docs = await userDocs(db, uid); // mở gói 'pack' thành từng tài liệu như trước
    const parsedDocs = {};
    for (const d of docs) {
      try { parsedDocs[d.k] = { ...d, parsed: JSON.parse(d.body) }; } catch (e) { parsedDocs[d.k] = d; }
    }
    const reads = await all(db, 'SELECT id, read_at, clicked FROM notice_reads WHERE uid = ?', uid).catch(() => []);
    const backups = await all(db, 'SELECT id, at, by, reason, LENGTH(docs) AS bytes FROM user_backups WHERE uid = ?', uid).catch(() => []);
    let tags = []; try { tags = JSON.parse(u.tags || '[]'); } catch (e) { tags = []; }
    return {
      export_info: {
        service: 'Lexkite',
        exported_at: new Date().toISOString(),
        requested_by: (who && who.email) || 'admin',
        standard: 'GDPR Article 15 & 20 Right of Access and Portability',
      },
      user: { ...u, tags },
      documents: parsedDocs,
      notice_history: reads,
      backup_history: backups
    };
  },
  async userDelete(db, b) { // xóa dữ liệu đồng bộ theo yêu cầu của người dùng (GDPR) – tài khoản Google không bị ảnh hưởng
    const uid = String(b.uid || ''); if (!uid || b.confirm !== uid) throw new Error('confirm');
    await db.batch([
      db.prepare('DELETE FROM docs WHERE uid = ?').bind(uid),
      db.prepare('DELETE FROM user_backups WHERE uid = ?').bind(uid),
      db.prepare('DELETE FROM notice_reads WHERE uid = ?').bind(uid),
      db.prepare('DELETE FROM users WHERE uid = ?').bind(uid)
    ]);
    return { ok: true };
  },
  async inbox(db, b) {
    const f = b.filter === 'all' ? '' : 'WHERE COALESCE(handled, 0) = 0';
    return { rows: await all(db, `SELECT id, at, name, email, msg, lang, sent, COALESCE(handled, 0) AS handled FROM contact_msgs ${f} ORDER BY id DESC LIMIT 200`) };
  },
  async inboxMark(db, b) { await db.prepare('UPDATE contact_msgs SET handled = ? WHERE id = ?').bind(b.handled ? 1 : 0, +b.id).run(); return { ok: true }; },
  async analytics(db, b, who, env) {
    const days = Math.min(Math.max(+b.days || 30, 1), 365), from = vday(Date.now() - (days - 1) * DAY), { H } = await humanWhere(db, env);
    const top = (col, n = 12) => all(db, `SELECT ${col} AS k, COUNT(*) AS n, COUNT(DISTINCT vid) AS v, AVG(dur) AS dur FROM sessions WHERE ${H} AND day >= ? GROUP BY ${col} ORDER BY n DESC LIMIT ${n}`, from);
    const [daily, refs, countries, devs, langs, plats, paths, sum, freq] = await Promise.all([
      all(db, `SELECT day, COUNT(*) AS s, COUNT(DISTINCT vid) AS v, AVG(dur) AS dur, AVG(pages) AS pages, SUM(ret) AS ret FROM sessions WHERE ${H} AND day >= ? GROUP BY day ORDER BY day`, from),
      top("COALESCE(NULLIF(ref, ''), '(trực tiếp)')"), top('country', 20), top('dev'), top('lang', 15), top('plat'), top('path', 15),
      one(db, `SELECT COUNT(*) AS s, COUNT(DISTINCT vid) AS v, AVG(dur) AS dur, AVG(pages) AS pages, SUM(ret) AS ret, SUM(pages <= 1 AND dur < 15) AS bounce, (SELECT lcp FROM sessions WHERE ${H} AND day >= ?1 AND lcp > 0 ORDER BY lcp LIMIT 1 OFFSET (SELECT CAST(COUNT(*) * 0.75 AS INT) FROM sessions WHERE ${H} AND day >= ?1 AND lcp > 0)) AS lcp, SUM(lcp > 0 AND lcp <= 2500) AS lcpGood, SUM(lcp > 0) AS lcpN FROM sessions WHERE ${H} AND day >= ?1`, from),
      all(db, `SELECT CASE WHEN c = 1 THEN '1' WHEN c <= 3 THEN '2–3' WHEN c <= 7 THEN '4–7' WHEN c <= 15 THEN '8–15' ELSE '16+' END AS k, COUNT(*) AS n FROM (SELECT vid, COUNT(*) AS c FROM sessions WHERE ${H} AND day >= ? GROUP BY vid) GROUP BY k`, from),
    ]);
    const rate = +((await one(db, "SELECT v FROM config WHERE k = 'hit_rate'").catch(() => null)) || {}).v || 1;
    // Chi tiết thêm: giờ cao điểm & ngày trong tuần (giờ Việt Nam), thời lượng phiên theo nhóm, khách mới/quay lại theo ngày, đăng ký mới theo ngày
    const VN = 7 * 3600000, since = Date.now() - days * DAY;
    const [hours, wdays, durs, nr, signups] = await Promise.all([
      all(db, `SELECT CAST(((at + ${VN}) / 3600000) % 24 AS INTEGER) AS k, COUNT(*) AS n FROM sessions WHERE ${H} AND at >= ? GROUP BY k ORDER BY k`, since),
      all(db, `SELECT CAST(((at + ${VN}) / 86400000 + 4) % 7 AS INTEGER) AS k, COUNT(*) AS n FROM sessions WHERE ${H} AND at >= ? GROUP BY k ORDER BY k`, since),
      all(db, `SELECT CASE WHEN dur < 15 THEN '<15 giây' WHEN dur < 60 THEN '15–60 giây' WHEN dur < 180 THEN '1–3 phút' WHEN dur < 600 THEN '3–10 phút' WHEN dur < 1800 THEN '10–30 phút' ELSE '30+ phút' END AS k, COUNT(*) AS n, MIN(dur) AS o FROM sessions WHERE ${H} AND day >= ? GROUP BY k ORDER BY o`, from),
      all(db, `SELECT day, SUM(ret = 0) AS fresh, SUM(ret = 1) AS back FROM sessions WHERE ${H} AND day >= ? GROUP BY day ORDER BY day`, from),
      all(db, `SELECT strftime('%Y-%m-%d', (created + ${VN}) / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM users WHERE created >= ? GROUP BY day ORDER BY day`, since),
    ]);
    const excluded = await one(db, `SELECT COUNT(*) AS s, COUNT(DISTINCT vid) AS v FROM sessions WHERE day >= ? AND NOT (${H})`, from);
    return { days, tz: TZ, from, daily, refs, countries, devs, langs, plats, paths, sum, freq, rate, hours, wdays, durs, nr, signups, excluded };
  },
  // Lưu lượng trực tiếp (tự cập nhật 30 giây/lần): phần nhanh đệm 20 giây, phần nặng (tổng, 14 ngày, 30 ngày) đệm 10 phút
  async live(db, b, who, env) {
    const days = Math.min(Math.max(+b.days || 30, 1), 365), now = Date.now(), d1 = vday(now), d7 = vday(now - 6 * DAY), d14 = vday(now - 13 * DAY), d30 = vday(now - 29 * DAY), { H, vids } = await humanWhere(db, env);
    const fast = await cached('live-fast-v2?d=' + days, 20, async () => {
      const on = now - 5 * 60e3;
      const [online, viewing, today, countries, pagesToday, refs, platsToday, auto] = await Promise.all([
        one(db, `SELECT COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND last > ?`, on),
        all(db, `SELECT COALESCE(last_path, path, 'home') AS k, COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND last > ? AND COALESCE(last_path, path, 'home') <> 'admin' GROUP BY k ORDER BY n DESC LIMIT 10`, on),
        one(db, `SELECT COUNT(*) AS s, COALESCE(SUM(pages), 0) AS views, COUNT(DISTINCT vid) AS visitors, AVG(dur) AS dur FROM sessions WHERE ${H} AND day = ?`, d1),
        all(db, `SELECT country AS k, COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND day = ? GROUP BY k ORDER BY n DESC LIMIT 250`, d1),
        all(db, 'SELECT path AS k, n FROM pageviews_day WHERE day = ? ORDER BY n DESC LIMIT 10', d1),
        all(db, `SELECT ref AS k, COUNT(*) AS n FROM sessions WHERE ${H} AND day = ? AND ref <> '' GROUP BY ref ORDER BY n DESC LIMIT 10`, d1),
        all(db, `SELECT COALESCE(plat, 'web') AS k, COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND day = ? GROUP BY k ORDER BY n DESC`, d1),
        // Đã loại khỏi số người thật hôm nay: máy tự động theo loại (ci · ci-app · ua · bot · dc · admin) + khách là tài khoản quản trị
        all(db, `SELECT COALESCE(bot, 'admin') AS k, COUNT(*) AS s, COUNT(DISTINCT vid) AS v FROM sessions WHERE day = ? AND NOT (${H}) GROUP BY k ORDER BY s DESC`, d1),
      ]);
      // Chưa có dữ liệu pageviews_day (trước khi cập nhật app) → dùng trang vào đầu tiên của phiên
      const fb = pagesToday.length ? null : await all(db, `SELECT path AS k, COUNT(*) AS n FROM sessions WHERE ${H} AND day = ? GROUP BY path ORDER BY n DESC LIMIT 10`, d1);
      const aeOn = hitMode(env) === 'hybrid' ? await aeOnline(env, now, vids) : null; // chế độ hybrid: nhịp 3 phút chỉ ở AE → 'đang online' đọc AE
      return { online: aeOn ? aeOn.n : online.n || 0, viewing: aeOn ? aeOn.viewing : viewing, today: { ...today, perVisitor: today.visitors ? today.views / today.visitors : 0 }, countries, pagesToday: fb || pagesToday, pagesFallback: !!fb, refs, platsToday,
        excluded: { s: auto.reduce((a, r) => a + r.s, 0), kinds: auto } };
    });
    const slow = await cached('live-slow-v2', 600, async () => {
      const [total, series, plats30, pages7] = await Promise.all([
        one(db, `SELECT COALESCE(SUM(pages), 0) AS views, COUNT(DISTINCT vid) AS visitors FROM sessions WHERE ${H}`),
        all(db, `SELECT day, COALESCE(SUM(pages), 0) AS views, COUNT(DISTINCT vid) AS visitors FROM sessions WHERE ${H} AND day >= ? GROUP BY day ORDER BY day`, d14),
        all(db, `SELECT COALESCE(plat, 'web') AS k, COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND day >= ? GROUP BY k ORDER BY n DESC`, d30),
        all(db, 'SELECT path AS k, SUM(n) AS n FROM pageviews_day WHERE day >= ? GROUP BY path ORDER BY n DESC LIMIT 10', d7),
      ]);
      const by = Object.fromEntries(series.map(r => [r.day, r]));
      return { total, plats30, pages7, series: Array.from({ length: 14 }, (_, i) => { const d = vday(now - (13 - i) * DAY); return { day: d, views: (by[d] || {}).views || 0, visitors: (by[d] || {}).visitors || 0 }; }) };
    });
    const rate = +((await one(db, "SELECT v FROM config WHERE k = 'hit_rate'").catch(() => null)) || {}).v || 1;
    return { at: now, tz: TZ, day: d1, rate, ...fast, ...slow };
  },
  // Tăng trưởng & giữ chân, add-on Chrome, phễu chuyển đổi (functions/api/growth.js) – đệm 10 phút theo kỳ 7/30/90 ngày
  async growth(db, b) { const P = [7, 30, 90].includes(+b.days) ? +b.days : 30; return cached('growth-v1?d=' + P, 600, () => growthData(db, P)); },
  async errors(db) { return { rows: await all(db, 'SELECT * FROM errors ORDER BY last DESC LIMIT 200') }; },
  async errorsClear(db, b) { if (b.h) await db.prepare('DELETE FROM errors WHERE h = ?').bind(String(b.h)).run(); else await db.prepare('DELETE FROM errors').run(); return { ok: true }; },
  async config(db) { const rows = (await all(db, `SELECT k, v, at, by FROM config WHERE k IN (${CONFIG_KEYS.map(() => '?').join(',')})`, ...CONFIG_KEYS)).filter(r => CONFIG_KEYS.includes(r.k)); return { keys: CONFIG_KEYS, values: Object.fromEntries(rows.map(r => [r.k, r])) }; },
  async configSet(db, b, who) {
    const batch = [];
    for (const [k, v] of Object.entries(b.values || {})) if (CONFIG_KEYS.includes(k)) batch.push(db.prepare('INSERT INTO config (k, v, at, by) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (k) DO UPDATE SET v = ?2, at = ?3, by = ?4').bind(k, String(v).slice(0, 2000), Date.now(), who.email));
    if (batch.length) await db.batch(batch);
    if (batch.length) await purgeConfig(); // đệm biên /api/config (config.js) ở trung tâm của quản trị
    return { ok: true, n: batch.length };
  },
  // Chất lượng: kết quả workflow "Rà soát hằng ngày" (health.yml) – điểm = số hạng mục đạt / tổng; dưới 100% = dưới chuẩn
  async quality() {
    const c = caches.default, key = new Request('https://cache.lexkite.internal/quality'), hit = await c.match(key); if (hit) return hit.json();
    const gh = u => fetch(`https://api.github.com/repos/${REPO}/${u}`, { headers: { 'User-Agent': 'lexkite-admin', Accept: 'application/vnd.github+json' } }).then(r => r.json());
    const runs = ((await gh('actions/workflows/health.yml/runs?per_page=14')).workflow_runs || []).filter(r => r.status === 'completed');
    const CHECK = /^(Kiểm thử|Lẫn tiếng|Kiểm tra kiểu|Cú pháp|Bản live)/;
    const steps = async r => (((await gh(`actions/runs/${r.id}/jobs`)).jobs || [])[0] || { steps: [] }).steps.filter(x => CHECK.test(x.name)).map(x => ({ name: x.name, ok: x.conclusion === 'success' }));
    const latest = runs[0] ? await steps(runs[0]) : [];
    const score = latest.length ? Math.round(latest.filter(x => x.ok).length / latest.length * 100) : null;
    const out = { score, standard: 100, at: runs[0] ? Date.parse(runs[0].updated_at) : 0, url: runs[0] ? runs[0].html_url : '', checks: latest, history: runs.map(r => ({ at: Date.parse(r.updated_at), ok: r.conclusion === 'success', url: r.html_url })) };
    await c.put(key, new Response(JSON.stringify(out), { headers: { 'Cache-Control': 'max-age=600' } }));
    return out;
  },
  // Kiểm nghĩa bản dịch: câu bị dịch ngược nghi sai (web/i18n/backcheck.json) → AI Cloudflare (gói miễn phí) xác nhận theo lô 15 câu
  async judge(db, b, who, env) {
    const lang = String(b.lang || ''), rep = await (await fetch('https://lexkite.com/i18n/backcheck.json?x=' + Date.now())).json(), L = (rep.langs || {})[lang];
    if (!L || !env.AI) return { error: !env.AI ? 'no-ai' : 'no-lang' };
    const done = new Set((await all(db, 'SELECT h FROM i18n_judge WHERE lang = ?', lang)).map(r => r.h)), todo = L.flagged.filter(f => !done.has(f.h)).slice(0, 45);
    for (let i = 0; i < todo.length; i += 15) {
      const part = todo.slice(i, i + 15), list = part.map((f, j) => `${j + 1}. EN: ${f.en.replace(/<[^>]+>/g, '')}\n   ${lang.toUpperCase()}: ${f.tr.replace(/<[^>]+>/g, '')}`).join('\n');
      let out = {};
      try { const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages: [{ role: 'system', content: 'You are a professional UI localization reviewer. For each numbered pair decide if the translation conveys the same meaning as the English UI text (minor wording/style differences are OK). Reply ONLY JSON: {"wrong":[{"i":number,"why":"short reason in Vietnamese"}]} listing only clearly wrong ones.' }, { role: 'user', content: list }], max_tokens: 600 }); out = JSON.parse(String(r.response || r).match(/\{[\s\S]*\}/)[0]); } catch (e) { continue; }
      const wrong = new Map((out.wrong || []).map(w => [+w.i, String(w.why || '').slice(0, 200)]));
      await db.batch(part.map((f, j) => db.prepare('INSERT OR REPLACE INTO i18n_judge (h, lang, ok, note, at) VALUES (?, ?, ?, ?, ?)').bind(f.h, lang, wrong.has(j + 1) ? 0 : 1, wrong.get(j + 1) || '', Date.now())));
    }
    const rows = await all(db, 'SELECT h, ok, note FROM i18n_judge WHERE lang = ?', lang), by = Object.fromEntries(rows.map(r => [r.h, r]));
    return { lang, judged: rows.length, pending: L.flagged.filter(f => !by[f.h]).length, wrong: L.flagged.filter(f => by[f.h] && !by[f.h].ok).map(f => ({ ...f, why: by[f.h].note })) };
  },
  // ---- Gemini API: khóa dán trong Quản trị (D1 config 'gemini_key', không bao giờ trả về nguyên khóa) ----
  async ping() { return { ok: true }; },
  async auditLog(db) { return { rows: await all(db, 'SELECT at, email, op, ok, ip, country FROM admin_log ORDER BY id DESC LIMIT 100') }; },
  // ---- Nhiều khóa Gemini xoay vòng (D1 config 'gemini_keys' = [{k, at, by}]) – không bao giờ trả nguyên khóa ----
  // 💰 Quản trị › Quảng cáo (js/admin-ads.js): ext_events 'ad*' 35 ngày – PK (day, kind) → SEARCH theo khoảng ngày, đệm 10 phút;
  // doanh thu THẬT: ads_rev (PK day,src,dim,key – SEARCH khoảng ngày, ≤ ~1.500 dòng) do Action ads-revenue.yml ghi qua /api/ads-report; chưa có bảng → real.connected = false
  async adsStats(db, b, who, env) {
    return cached('ads-v2', 600, async () => {
      const now = Date.now(), today = vday(now);
      const [rows, cfg, rev] = await Promise.all([
        all(db, "SELECT day, kind, n FROM ext_events WHERE day >= ? AND kind >= 'ad' AND kind < 'ae'", vday(now - 35 * DAY)),
        all(db, `SELECT k, v, at, by FROM config WHERE k IN (${[...ADS_KEYS, 'ads_report'].map(() => '?').join(',')})`, ...ADS_KEYS, 'ads_report'),
        all(db, ADS_REV_SEL, vday(now - 35 * DAY), today).catch(() => []),
      ]);
      const c = Object.fromEntries(cfg.map(r => [r.k, r.v]));
      const ecpm = { web: c.ads_ecpm_web ?? 1, android: c.ads_ecpm_android ?? 1, ios: c.ads_ecpm_ios ?? 1 };
      let meta = null; try { meta = c.ads_report ? JSON.parse(c.ads_report) : null; } catch (e) { meta = null; }
      const real = adsRealOf(rev, today, meta, rows, ecpm);
      return { at: now, today, ...adsStatsOf(rows, today, ecpm, 30), guard: guardOf(rows, today, { pct: c.ads_guard_pct, min: c.ads_guard_min, prev: c.ads_guard || 1 }), ecpm, real, reporting: { connected: real.connected, at: real.at || null } };
    });
  },
  async geminiStatus(db, b, who, env) {
    const list = await gkList(db), keys = [];
    for (const x of list) keys.push({ last4: x.k.slice(-4), at: x.at, by: x.by, cooling: await isCooling(x.k) });
    return { set: keys.length > 0, last4: keys[0] ? keys[0].last4 : '', keys, env: !!(env && env.GEMINI_KEY) };
  },
  async geminiSet(db, b, who, env) {
    const key = String(b.key || '').trim();
    if (!/^(AIza[\w-]{20,}|AQ\.[\w.-]{20,})$/.test(key)) return { ok: false, error: tx(b, 'Khóa không đúng định dạng (AIza… hoặc AQ.…)', 'Invalid key format (AIza… or AQ.…)') };
    const list = await gkList(db); if (list.some(x => x.k === key)) return { ok: false, error: tx(b, 'Khóa này đã có trong danh sách', 'This key is already in the list') };
    if (list.length >= 20) return { ok: false, error: tx(b, 'Tối đa 20 khóa', 'Maximum 20 keys') };
    let r = await gemFetch(env, 'models/gemini-3.8-flash', key, null, 'GET'); if (r.status === 404) r = await gemFetch(env, 'models/gemini-2.5-flash', key, null, 'GET');
    if (!r.ok) { const m = ((await r.json().catch(() => ({}))).error || {}).message || ''; return { ok: false, error: tx(b, `Google từ chối khóa (HTTP ${r.status}, khóa nhận được dài ${key.length} ký tự, đuôi …${key.slice(-4)})`, `Google rejected the key (HTTP ${r.status}, received key is ${key.length} characters, ending …${key.slice(-4)})`) + (m ? ': ' + m.slice(0, 160) : '') + (/location/i.test(m) ? tx(b, ' – máy chủ Cloudflare đang ở vùng Gemini chưa hỗ trợ', ' – the Cloudflare server is in a region Gemini does not support yet') : '') }; }
    list.push({ k: key, at: Date.now(), by: who.email }); await gkSave(db, list);
    return { ok: true, last4: key.slice(-4), count: list.length };
  },
  async geminiRemove(db, b) { const list = (await gkList(db)).filter(x => x.k.slice(-4) !== String(b.last4 || '')); await gkSave(db, list); return { ok: true, count: list.length }; },
  // Duyệt 1 chạm: bản sửa được duyệt lưu D1 → workflow dịch đêm (i18n.yml) tự gộp vào scripts/i18n-fixed.json và áp vào app
  async i18nFixApprove(db, b, who) {
    const lang = String(b.lang || ''), key = String(b.key || ''), val = String(b.val || '').trim();
    if (!/^[a-z]{2}$/.test(lang) || !key || !val) return { ok: false };
    await db.prepare('INSERT OR REPLACE INTO i18n_fix (lang, key, val, at, by) VALUES (?, ?, ?, ?, ?)').bind(lang, key, val, Date.now(), who.email).run();
    return { ok: true };
  },
  async geminiDelete(db) { await db.prepare("DELETE FROM config WHERE k IN ('gemini_key', 'gemini_keys')").run(); resetGeminiCache(); return { ok: true }; },
  // Gemini duyệt chéo bản dịch giao diện: mọi câu nghi sai (dịch ngược) của 1 ngôn ngữ, lô 40 câu, lưu D1 i18n_judge với khóa 'g:'+h
  // Duyệt bản dịch bằng AI – 1 nút: Gemini (xoay vòng nhiều khóa) → hết khóa/hết lượt thì tự chuyển Cloudflare Workers AI
  async review(db, b, who, env) {
    const lang = String(b.lang || ''), rep = await (await fetch('https://lexkite.com/i18n/backcheck.json?x=' + Date.now())).json(), L = (rep.langs || {})[lang];
    if (!L) return { error: 'no-lang' };
    const done = Object.fromEntries((await all(db, 'SELECT h, ok, note FROM i18n_judge WHERE lang = ?', lang)).map(r => [r.h, r]));
    const todo = L.flagged.filter(f => !done[f.h]).slice(0, 60), used = new Set();
    const SYS = 'You are a professional UI localization reviewer for an English-learning app. For each numbered pair decide if the translation conveys the same meaning as the English UI text (minor wording/style differences are fine). Reply ONLY JSON {"wrong":[{"i":number,"why":"short reason in Vietnamese","fix":"corrected translation keeping {placeholders} and HTML tags"}]} listing only clearly wrong ones.';
    for (let i = 0; i < todo.length; i += 20) {
      const part = todo.slice(i, i + 20), list = part.map((f, j) => `${j + 1}. EN: ${f.en.replace(/<[^>]+>/g, '')}\n   ${lang}: ${f.tr}`).join('\n');
      let out = null;
      const g = await geminiCall(env, { systemInstruction: { parts: [{ text: SYS }] }, contents: [{ role: 'user', parts: [{ text: list }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.1 } });
      if (g) { try { out = JSON.parse(g.text); used.add('Gemini …' + g.key); } catch (e) { out = null; } }
      if (!out && env.AI) { try { const r = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', { messages: [{ role: 'system', content: SYS }, { role: 'user', content: list }], max_tokens: 900 }); out = JSON.parse(String(r.response || r).match(/\{[\s\S]*\}/)[0]); used.add('Cloudflare Llama 3.3'); } catch (e) { out = null; } }
      if (!out) continue;
      const wrong = new Map((out.wrong || []).map(w => [+w.i, w]));
      await db.batch(part.map((f, j) => db.prepare('INSERT OR REPLACE INTO i18n_judge (h, lang, ok, note, at) VALUES (?, ?, ?, ?, ?)').bind(f.h, lang, wrong.has(j + 1) ? 0 : 1, wrong.has(j + 1) ? JSON.stringify({ why: String(wrong.get(j + 1).why || '').slice(0, 200), fix: String(wrong.get(j + 1).fix || '').slice(0, 400) }) : '', Date.now())));
      part.forEach((f, j) => { done[f.h] = { ok: wrong.has(j + 1) ? 0 : 1, note: wrong.has(j + 1) ? JSON.stringify({ why: wrong.get(j + 1).why, fix: wrong.get(j + 1).fix }) : '' }; });
    }
    const parse = n => { try { return JSON.parse(n); } catch (e) { return { why: n, fix: '' }; } };
    const wrongs = L.flagged.filter(f => done[f.h] && !done[f.h].ok).map(f => ({ ...f, ...parse(done[f.h].note) }));
    return { lang, reviewed: L.flagged.filter(f => done[f.h]).length, total: L.flagged.length, pending: L.flagged.filter(f => !done[f.h]).length, models: [...used], wrong: wrongs };
  },
  async alerts(db, b) {
    const now = Date.now(), out = [];
    try {
      const r = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?per_page=40`, { headers: { 'User-Agent': 'lexkite-admin', Accept: 'application/vnd.github+json' } });
      const runs = (await r.json()).workflow_runs || [], seen = new Set();
      for (const w of runs) { if (seen.has(w.name)) continue; seen.add(w.name); out.push({ kind: 'workflow', name: w.name, status: w.status, ok: w.conclusion === 'success' || w.conclusion === 'skipped' || w.status !== 'completed', conclusion: w.conclusion, at: Date.parse(w.updated_at), url: w.html_url }); }
    } catch (e) { out.push({ kind: 'workflow', name: 'GitHub API', ok: false, conclusion: tx(b, 'không đọc được', 'unreadable') }); }
    const e = await one(db, 'SELECT COUNT(*) AS kinds, COALESCE(SUM(n), 0) AS hits FROM errors WHERE last > ?', now - DAY);
    const lim = +((await one(db, "SELECT v FROM config WHERE k = 'alert_errors'")).v || 50);
    out.push({ kind: 'errors', name: tx(b, 'Lỗi JavaScript 24h', 'JavaScript errors (24h)'), ok: e.hits < lim, conclusion: tx(b, `${e.hits} lượt / ${e.kinds} loại (ngưỡng ${lim})`, `${e.hits} hits / ${e.kinds} types (threshold ${lim})`) });
    const c = await one(db, 'SELECT COUNT(*) AS n, MIN(at) AS oldest FROM contact_msgs WHERE COALESCE(handled, 0) = 0');
    const oldH = Math.round((now - c.oldest) / 36e5);
    out.push({ kind: 'inbox', name: tx(b, 'Tin nhắn chưa xử lý', 'Open messages'), ok: !c.n || now - c.oldest < 2 * DAY, conclusion: c.n ? tx(b, `${c.n} tin, cũ nhất ${oldH} giờ`, `${c.n} message(s), oldest ${oldH}h`) : tx(b, 'không có', 'none') });
    const f = await one(db, 'SELECT COUNT(*) AS n FROM contact_msgs WHERE sent = 0 AND at > ?', now - 7 * DAY);
    out.push({ kind: 'mail', name: tx(b, 'Thư chuyển tiếp lỗi (7 ngày)', 'Failed email forwards (7 days)'), ok: !f.n, conclusion: f.n ? tx(b, `${f.n} tin chưa chuyển được vào Gmail – xem Hộp thư`, `${f.n} message(s) not forwarded to Gmail – see Inbox`) : tx(b, 'ổn', 'OK') });
    // Backlink, PR & Thương hiệu (functions/api/backlinks.js, workflow pr-check.yml): đỏ khi có sự cố, vàng khi có thay đổi cần cập nhật / lâu chưa kiểm
    try {
      const P = await all(db, "SELECT last_level AS l, COUNT(*) AS n FROM bw_placements WHERE deleted = 0 AND last_level IS NOT NULL GROUP BY l"), pn = l => (P.find(r => r.l === l) || {}).n || 0;
      const run = JSON.parse((await one(db, "SELECT v FROM config WHERE k = 'bw_run'")).v || 'null'), BW = '/admin.html#backlinks';
      if (P.length || run) {
        const stale = !run || now - run.at > 3 * DAY;
        out.push({ kind: 'backlink', name: tx(b, 'Backlink & PR', 'Backlinks & PR'), ok: !pn('regression'), warn: !pn('regression') && (pn('change') > 0 || stale), url: BW, at: run ? run.at : 0,
          conclusion: pn('regression') ? tx(b, `${pn('regression')} mục bị gỡ / mất link / tụt rel`, `${pn('regression')} item(s) removed / link lost / rel downgraded`) : stale ? tx(b, 'quá 3 ngày chưa kiểm', 'not checked for over 3 days') : pn('change') ? tx(b, `${pn('change')} thay đổi cần cập nhật`, `${pn('change')} change(s) to review`) : tx(b, 'ổn', 'OK') });
        const dn = (await one(db, "SELECT COUNT(*) AS n FROM bw_domains WHERE level = 'regression'")).n || 0, hn = (await one(db, "SELECT COUNT(*) AS n FROM bw_handles WHERE deleted = 0 AND last_level = 'regression'")).n || 0;
        out.push({ kind: 'brand', name: tx(b, 'Thương hiệu: tên miền na ná & tài khoản', 'Brand: lookalike domains & accounts'), ok: !dn && !hn, url: BW, at: run ? run.at : 0,
          conclusion: dn || hn ? tx(b, `${dn} tên miền mới phân giải/có MX · ${hn} tài khoản mất`, `${dn} lookalike domain(s) newly resolving/with MX · ${hn} account(s) missing`) : tx(b, 'ổn', 'OK') });
      }
      const copy = JSON.parse((await one(db, "SELECT v FROM config WHERE k = 'bw_copy'")).v || 'null');
      if (copy) { const sus = (copy.probes || []).reduce((a, p) => a + (p.suspects || []).length, 0);
        out.push({ kind: 'copy', name: tx(b, 'Nghi bị chép nội dung', 'Suspected content copies'), ok: !sus, url: BW, at: copy.at, conclusion: copy.configured === false ? tx(b, 'chưa bật dò tự động (BRAVE_SEARCH_KEY)', 'auto search off (BRAVE_SEARCH_KEY)') : sus ? tx(b, `${sus} trang ngoài chứa nguyên văn`, `${sus} external page(s) with verbatim text`) : tx(b, 'không thấy', 'none found') }); }
    } catch (e) { /* chưa có bảng bw_* (chưa chạy lần nào) */ }
    const u = await OPS.usage(db, b);
    for (const m of u.meters) out.push({ kind: 'capacity', name: m.name, ok: m.pct < 70, warn: m.pct >= 70 && m.pct < 90, conclusion: tx(b, `${m.pct}% hạn mức miễn phí`, `${m.pct}% of free tier`) });
    return { rows: out };
  },
  async noticeCreate(db, b, who) {
    const title = String(b.title || '').trim().slice(0, 200);
    if (!title) return { error: 'title-required' };
    const body = String(b.body || '').trim().slice(0, 4000);
    if (!body) return { error: 'body-required' };
    const kind = /^(info|event|important)$/.test(b.kind) ? b.kind : 'info';
    const img = String(b.img || '').trim().slice(0, 500);
    if (img && !/^https:\/\//i.test(img)) return { error: 'img-invalid' };
    const cta_label = String(b.cta_label || '').trim().slice(0, 60);
    const cta_url = String(b.cta_url || '').trim().slice(0, 500);
    if (cta_url && !/^(#\/|\/#\/|https:\/\/)/i.test(cta_url)) return { error: 'cta-url-invalid' };
    // Đối tượng nhận: chỉ giữ đúng các trường đã biết (không lưu JSON tùy ý)
    let tg = b.target;
    if (typeof tg === 'string') { try { tg = JSON.parse(tg); } catch (e) { tg = null; } }
    let target = { type: 'all' };
    if (tg && tg.type === 'users') {
      const uids = [...new Set((Array.isArray(tg.uids) ? tg.uids : []).map(u => String(u || '').trim()).filter(u => /^[A-Za-z0-9_-]{6,128}$/.test(u)))];
      if (!uids.length) return { error: 'target-empty' };
      if (uids.length > 500) return { error: 'target-too-many' };
      target = { type: 'users', uids };
    } else if (tg && tg.type === 'filter') {
      target = { type: 'filter' };
      if (/^[a-z]{2,12}$/.test(tg.plat || '')) target.plat = tg.plat;
      const d = k => { const v = Math.round(+tg[k]); if (v > 0 && v <= 3650) target[k] = v; };
      d('inactiveDays'); d('newDays');
    }
    target = JSON.stringify(target);
    const now = Date.now();
    const ts = v => (Number.isFinite(+v) && +v > 0 ? Math.round(+v) : null);
    const send_at = ts(b.send_at) || now;
    const expire_at = ts(b.expire_at);
    const lang0 = String(b.lang || 'all').trim().toLowerCase().slice(0, 10), lang = /^[a-z]{2,3}(-[a-z0-9]{2,4})?$/.test(lang0) ? lang0 : 'all';
    if (expire_at && expire_at <= send_at) return { error: 'expire-before-send' };
    const id = 'n_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    const by = String(who && who.email || '').slice(0, 120);

    await db.prepare(
      'INSERT INTO notices (id, at, by, title, body, kind, img, cta_label, cta_url, target, send_at, expire_at, lang, revoked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)'
    ).bind(id, now, by, title, body, kind, img || null, cta_label || null, cta_url || null, target, send_at, expire_at, lang).run();

    await purgeNotices(); // đệm biên danh sách công khai (notices.js)
    return { ok: true, id };
  },
  async noticeList(db, b) {
    const lim = Math.min(100, Math.max(1, +b.limit || 30));
    const off = Math.max(0, +b.offset || 0);
    const rows = await all(db, `
      SELECT n.*,
        (SELECT COUNT(*) FROM notice_reads r WHERE r.id = n.id) AS reads,
        (SELECT COUNT(*) FROM notice_reads r WHERE r.id = n.id AND r.clicked = 1) AS clicks
      FROM notices n
      ORDER BY n.at DESC
      LIMIT ? OFFSET ?
    `, lim, off);

    const totalRow = await one(db, 'SELECT COUNT(*) AS total FROM notices');
    const total = +totalRow.total || 0;
    return {
      rows: rows.map(r => {
        let tgt = { type: 'all' };
        try { tgt = JSON.parse(r.target || '{}'); } catch (e) {}
        return { ...r, target: tgt };
      }),
      total,
      limit: lim,
      offset: off
    };
  },
  async noticeRevoke(db, b) {
    const id = String(b.id || '').trim().slice(0, 60);
    if (!id) return { error: 'id-required' };
    await db.prepare('UPDATE notices SET revoked = 1 WHERE id = ?').bind(id).run();
    await purgeNotices();
    return { ok: true, id };
  },
  async noticeStats(db) {
    const now = Date.now();
    const total = +((await one(db, 'SELECT COUNT(*) AS c FROM notices')).c || 0);
    const active = +((await one(db, 'SELECT COUNT(*) AS c FROM notices WHERE revoked = 0 AND (expire_at IS NULL OR expire_at > ?)', now)).c || 0);
    const reads = +((await one(db, 'SELECT COUNT(*) AS c FROM notice_reads')).c || 0);
    const clicks = +((await one(db, 'SELECT COUNT(*) AS c FROM notice_reads WHERE clicked = 1')).c || 0);
    return { total, active, reads, clicks };
  },
};

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

// Thao tác ghi/xóa (ghi nhật ký) · thao tác nguy hiểm (phải vừa đăng nhập ≤ 15 phút – chống token bị đánh cắp dùng lại)
const WRITE = /Set$|Delete$|Remove$|Clear$|Mark$|Approve$|^inboxReply$|^judge$|^review$|^usersExport$|^noticeCreate$|^noticeRevoke$|^userTag$|^userBlock$|^userReset$|^userRestore$|^userExportData$/; // (xuất danh sách người dùng cũng ghi nhật ký)
const DANGER = new Set(['userDelete', 'serviceDelete', 'errorsClear', 'geminiDelete', 'geminiRemove', 'userBlock', 'userReset', 'userRestore', 'userExportData']);
const ipOf = req => req.headers.get('CF-Connecting-IP') || '?';
async function audit(env, req, email, op, ok) {
  try { const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lexkite-adm|' + ipOf(req))))].slice(0, 6).map(x => x.toString(16).padStart(2, '0')).join('');
    await env.DB.prepare('INSERT INTO admin_log (at, email, op, ok, ip, country) VALUES (?, ?, ?, ?, ?, ?)').bind(Date.now(), String(email || '').slice(0, 120), String(op || '').slice(0, 40), ok ? 1 : 0, h, (req.cf && req.cf.country) || '').run(); } catch (e) { /* nhật ký không được làm hỏng thao tác */ }
}

// Cổng xác thực quản trị dùng chung (admin.js, social.js): Origin của mình · giới hạn tốc độ theo IP · Firebase ID token + email trong ADMIN_EMAILS.
// Trả { who } khi hợp lệ, ngược lại { status, error } (người lạ có tài khoản Google thật → ghi nhật ký 'denied').
export async function adminGate(request, env, bucket = 'adm') {
  // 1) Chỉ nhận từ trang của mình (có Origin lạ → từ chối)  2) Giới hạn tốc độ theo IP: 120 lệnh/phút, lần bị từ chối 10/10 phút
  const origin = request.headers.get('Origin'); if (origin && !ORIGINS.test(origin)) return { status: 403, error: 'origin' };
  const ip = ipOf(request);
  if (await limit(bucket + ':' + ip, 120, 60)) return { status: 429, error: 'too-fast' };
  let who; try { who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')); } catch (e) { return { status: 503, error: 'auth-retry' }; } // lỗi tạm (tải khóa Google/mạng) ≠ không phải admin → không báo nhầm 'Access denied'
  const admins = adminList(env);
  if (!who || !who.email_verified || !admins.includes(String(who.email).toLowerCase())) {
    if (await limit('admx:' + ip, 10, 600)) return { status: 429, error: 'too-many-denied' };
    if (who && who.email) { try { await setup(env.DB); } catch (e) { /* bỏ qua */ } await audit(env, request, who.email, 'denied', false); } // tài khoản Google thật nhưng không phải admin → ghi lại
    return { status: 403, error: 'forbidden' };
  }
  return { who };
}
export { audit as adminAudit, cors as adminCors };

export async function onRequestPost({ request, env }) {
  const g = await adminGate(request, env); if (!g.who) return json(request, g.status, { error: g.error });
  const who = g.who;
  let b; try { b = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!b || typeof b !== 'object') return json(request, 400, { error: 'json' });
  const fn = Object.hasOwn(OPS, b.op) ? OPS[b.op] : null; if (!fn) return json(request, 400, { error: 'op' }); // hasOwn: chặn op 'constructor'/'__proto__' (Object(env) → lộ bí mật)
  if (DANGER.has(b.op) && Date.now() / 1000 - (+who.auth_time || 0) > 900) return json(request, 401, { error: 'reauth', message: tx(b, 'Thao tác quan trọng: hãy đăng xuất rồi đăng nhập lại (bảo mật) rồi thử lại.', 'Sensitive action: sign out and sign back in (for security), then try again.') });
  try { await setup(env.DB); const out = await fn(env.DB, b, who, env); if (WRITE.test(b.op)) await audit(env, request, who.email, b.op, true); return json(request, 200, out); }
  catch (e) { return json(request, 500, { error: String(e && e.message || e).slice(0, 200) }); }
}
