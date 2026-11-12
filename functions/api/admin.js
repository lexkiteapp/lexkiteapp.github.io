/* API trang quản trị (/admin.html). Chỉ email trong biến bí mật ADMIN_EMAILS (Cloudflare Pages) được dùng.
 * POST /api/admin  (Authorization: Bearer <Firebase ID token>)  { op, ... }
 * op: usage · services · serviceSet · serviceDelete · overview · users · usersStats · usersBulk · usersExport · user · userDelete · inbox · inboxMark · analytics · live · growth · errors · errorsClear · config · configSet · alerts
 * (alerts gồm cả Backlink, PR & Thương hiệu – bảng bw_* do functions/api/backlinks.js ghi) */
import { claims, limit, userDocs } from './sync.js';
import { geminiKeys, geminiCall, isCooling, resetGeminiCache, gemFetch } from './ai.js';
import { setup as hitSetup, dayOf as vday, TZ, hitMode, aeOnline } from './hit.js';
import { growthData, growthRoll } from './growth.js';
import { tierShare, landStats } from './_cpm.js';
import { loadDays, merge, top, distinctBy, sumOf, freqOf, perDay, unkey, vidsHash } from './_rollup.js';
import { purgeNotices } from './notices.js';
import { purgeConfig, ADS_PUBLIC } from './config.js';
import { stats as adsStatsOf, guardOf, revPack as adsRevPack } from './_ads.js';
import { SEL as ADS_REV_SEL } from './ads-report.js';
import { setupQuota, resetState as resetQuotaState } from './_quota.js';
import { deleteUserData } from './account.js';
import { d1Usage, isShed, secsToReset } from './_d1guard.js';
import { meter, spent, addSpent, overBudget, isShedError } from './_readbudget.js';

const ORIGINS = /^https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)$/;
const REPO = 'lexkiteapp/lexkiteapp.github.io';
// GitHub API cho Quản trị (R2, docs/specs/admin-audit.md): có token thì 5.000 lượt/giờ thay vì 60/giờ/IP dùng chung của Cloudflare;
// trả lỗi rõ (HTTP 403/5xx) thay vì JSON rỗng → giao diện báo "không đọc được", KHÔNG hiện "0 tác vụ" giả. Test: scripts/test/admin-gh.mjs
export const ghApi = async (env, u, f = fetch) => {
  const tok = env && (env.GH_DISPATCH_TOKEN || env.GH_ISSUES_TOKEN), h = { 'User-Agent': 'lexkite-admin', Accept: 'application/vnd.github+json' };
  if (tok) h.Authorization = 'Bearer ' + tok;
  const r = await f(`https://api.github.com/repos/${REPO}/${u}`, { headers: h });
  if (!r.ok) throw new Error('GitHub HTTP ' + r.status);
  return r.json();
};
// Quảng cáo (docs/ADS.md): cờ công khai + khóa chỉ quản trị (eCPM ước tính USD/1000 lượt, ngưỡng cổng giữ chân %, cỡ mẫu tối thiểu, checklist sẵn sàng)
const ADS_KEYS = [...ADS_PUBLIC, 'ads_ecpm_web', 'ads_ecpm_android', 'ads_ecpm_ios', 'ads_guard_pct', 'ads_guard_min', 'ads_ready']; // ads_ready = JSON trạng thái nhập tay của thẻ "Sẵn sàng bật quảng cáo" (duyệt AdSense/AdMob, IRS, CMP…) – không phải cờ, không tới /api/config
const CONFIG_KEYS = ['banner', 'banner_url', 'banner_level', 'ai_user', 'ai_anon', 'ai_global', 'alert_errors', 'note', 'hit_rate', 'vocab_img', 'vocab_img_pct', 'ret', 'ret_pct', 'ux1', 'ux1_pct', 'offline_pack', 'pt_pilot', 'es_course', 'importdeck', ...ADS_KEYS];
const DAY = 86400e3;
// Ngôn ngữ giao diện quản trị: máy khách gửi ui: 'vi' | 'en' (thiếu = 'vi', tương thích cũ) – chỉ áp cho vài câu hiển thị
const tx = (b, vi, en) => (b && b.ui === 'en' ? en : vi);
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

// Hạn mức gói miễn phí (cập nhật khi nhà cung cấp đổi) – dùng cho thẻ dung lượng & cảnh báo
// Ngưỡng hạn mức (vàng/đỏ) – PHẢI khớp METRICS.quota ở web/js/admin.js (cổng scripts/test/admin-metrics.mjs)
const QUOTA_WARN = 70, QUOTA_CRIT = 90;
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
  await db.prepare('ALTER TABLE users ADD COLUMN cc TEXT').run().catch(() => {}); // quốc gia lần đồng bộ gần nhất (sync.js)
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_users_cc ON users (cc)').run().catch(() => {});
  // Xóa mềm (thao tác hàng loạt): deleted = lúc xóa; sau 30 ngày purgeDeleted() xóa thật (deleteUserData). blocked = 2 = khóa vì đang chờ xóa (sync.js chặn mọi blocked ≠ 0)
  await db.prepare('ALTER TABLE users ADD COLUMN deleted INTEGER').run().catch(() => {});
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_users_del ON users (deleted)').run().catch(() => {});
  await db.prepare('ALTER TABLE admin_log ADD COLUMN detail TEXT').run().catch(() => {}); // chi tiết kiểm toán (thao tác hàng loạt: hành động, số người, mẫu uid)
  await setupQuota(db).catch(() => {}); // bảng quota_allow (quyền AI không giới hạn) – cột "AI ∞" và thao tác cấp/gỡ quyền
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_user_backups_uid ON user_backups (uid, at)').run().catch(() => {});
  ready = true;
}

const one = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).first()) || {};
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const dayStr = t => new Date(t).toISOString().slice(0, 10); // ngày UTC – hạn mức nhà cung cấp (D1, AI) reset 0h UTC
// 🔊 Nguồn giọng 7 ngày (hit.js t:'vo'): PK (day, kind) → SEARCH theo ngày + tiền tố 'vo:' → { f, k, s, s_<lý do>, '<f|k|s>:<nền tảng>' }
const VO_SQL = "SELECT kind AS k, SUM(n) AS n FROM ext_events WHERE day >= ? AND kind >= 'vo:' AND kind < 'vo;' GROUP BY kind", voiceOf = rows => Object.fromEntries((rows || []).map(r => [r.k.slice(3), r.n]));
const LAND_SQL = "SELECT kind, SUM(n) AS n FROM ext_events WHERE day >= ? AND kind >= 'land:' AND kind < 'land;' GROUP BY kind"; // khách ngoài vào trang tĩnh (hit.js t:'l')
// Thống kê truy cập: "ngày" theo giờ Việt Nam (vday, hit.js) · chỉ người thật: bỏ máy tự động (cột bot) và khách là tài khoản quản trị
// (vid đã gắn uid có email trong ADMIN_EMAILS – chỉ dùng trong SQL, không trả về máy khách)
// Danh sách vid quản trị đệm 10 phút (bộ nhớ isolate + Cache API theo băm danh sách email): 03/11 câu này chạy 507 lượt/ngày × ~217 dòng
// (mỗi lần Trực tiếp tự làm mới 30 giây). Không thêm chỉ mục lower(email): sync.js cập nhật users.email mỗi lượt đồng bộ → +1 dòng ghi/lượt ở đường người dùng.
const HW_TTL = 600e3; let HW_MEM = null;
async function humanWhere(db, env) {
  const admins = adminList(env), k = vidsHash(admins), now = Date.now(); let vids = [];
  if (HW_MEM && HW_MEM.k === k && now - HW_MEM.at < HW_TTL) vids = HW_MEM.vids;
  else if (admins.length) {
    vids = await cached('admin-vids-v1?k=' + k, HW_TTL / 1000, async () => (await all(db, 'SELECT DISTINCT m.vid AS v FROM vid_uid m JOIN users u ON u.uid = m.uid WHERE lower(u.email) IN (SELECT value FROM json_each(?))', JSON.stringify(admins)).catch(() => []))
      .map(r => String(r.v)).filter(v => /^[a-z0-9]{8,32}$/i.test(v)).slice(0, 300));
    HW_MEM = { k, at: now, vids };
  }
  return { vids, H: 'bot IS NULL' + (vids.length ? ` AND vid NOT IN (${vids.map(v => `'${v}'`).join(', ')})` : '') };
}
export const _resetAdminMem = () => { HW_MEM = null; COUNTS_MEM = null; };
// Thống kê truy cập đọc bảng tổng hợp theo ngày (functions/api/_rollup.js, docs/CAPACITY.md §D4); ADMIN_ROLLUP=0 → SQL cũ quét `sessions` (quay lại)
const rollOff = env => !!(env && env.ADMIN_ROLLUP === '0');
const avgOf = (s, n) => (n ? s / n : null);
const webPlat = k => (k == null ? 'web' : k);

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
  if (b.cc === '??') w.push('cc IS NULL'); // chưa rõ quốc gia (tài khoản chưa đồng bộ lại từ khi có cột cc)
  else if (/^[A-Z][A-Z1-9]$/.test(b.cc || '')) { a.push(b.cc); w.push('cc = ?' + a.length); }
  // Ngày tham gia (YYYY-MM-DD, giờ Việt Nam như biểu đồ đăng ký): từ ngày … đến hết ngày …
  const day = (x, end) => /^\d{4}-\d{2}-\d{2}$/.test(x || '') ? Date.parse(x + 'T00:00:00+07:00') + (end ? DAY : 0) : NaN;
  const from = day(b.from), to = day(b.to, 1);
  if (Number.isFinite(from)) { a.push(from); w.push('created >= ?' + a.length); }
  if (Number.isFinite(to)) { a.push(to); w.push('created < ?' + a.length); }
  // Hoạt động gần nhất: trong N ngày / im lặng hơn N ngày · số lần vào tối thiểu · nhãn · quyền AI · khóa · thùng rác (xóa mềm)
  const days = v => { const x = Math.round(+v); return x > 0 && x <= 3650 ? x : 0; };
  if (days(b.seenIn)) { a.push(now - days(b.seenIn) * DAY); w.push('seen > ?' + a.length); }
  if (days(b.seenOut)) { a.push(now - days(b.seenOut) * DAY); w.push('seen < ?' + a.length); }
  const nMin = Math.round(+b.nMin); if (nMin > 1 && nMin < 1e7) { a.push(nMin); w.push('n >= ?' + a.length); }
  const tag = cleanTag(b.tag); if (tag) { a.push(tag); w.push(`EXISTS (SELECT 1 FROM json_each(${TJ}) WHERE value = ?${a.length})`); }
  if (b.perk === 'ai') w.push(`EXISTS (SELECT 1 FROM quota_allow q WHERE q.id = 'u:' || users.uid)`);
  if (b.blocked === '1') w.push('COALESCE(blocked, 0) = 1'); else if (b.blocked === '0') w.push('COALESCE(blocked, 0) = 0');
  if (Array.isArray(b.uids)) { a.push(JSON.stringify(b.uids.slice(0, BULK_MAX).map(String).filter(u => UID_RE.test(u)))); w.push('uid IN (SELECT value FROM json_each(?' + a.length + '))'); } // xuất CSV đúng các dòng đã chọn
  w.push(b.trash === 1 || b.trash === '1' ? 'deleted IS NOT NULL' : 'deleted IS NULL');
  return { sql: ' WHERE ' + w.join(' AND '), args: a, order: orderOf(b.sort, b.dir), admins };
}
// Sắp xếp theo cột (danh sách trắng – không bao giờ ghép chuỗi máy khách vào SQL); sort cũ new/old/n giữ nguyên nghĩa
const SORT_COLS = { seen: 'seen', created: 'created', n: 'n', email: "lower(COALESCE(email, ''))", name: "lower(COALESCE(name, ''))", plat: "COALESCE(plat, '')", cc: "COALESCE(cc, '')", deleted: 'deleted' };
function orderOf(sort, dir) {
  if (sort === 'new') return 'created DESC'; if (sort === 'old') return 'created ASC'; if (sort === 'n' && !dir) return 'n DESC, seen DESC';
  const c = SORT_COLS[sort] || 'seen', d = dir === 'asc' ? 'ASC' : 'DESC';
  return `${c} ${d}, uid ${d}`; // uid: thứ tự ổn định giữa các trang
}
const TJ = "(CASE WHEN json_valid(tags) THEN tags ELSE '[]' END)"; // tags hỏng → coi như rỗng (json_each không ném lỗi)
const cleanTag = t => { const x = typeof t === 'string' ? t.trim().replace(/[\u0000-\u001f]/g, '').slice(0, 30) : ''; return x; };
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
// 03/11: mỗi lần tính xong còn lưu bản "cũ" 24 h (stale/…); khi op vượt ngân sách đọc hoặc D1 ≥ 85 % (_readbudget.js meter ném ShedError) → trả bản cũ kèm _stale (giờ tính), không chạm D1
export async function cached(key, ttl, fn) {
  const c = typeof caches === 'undefined' ? null : /** @type {any} */ (caches).default, req = new Request('https://cache.lexkite.internal/' + key); // không có Cache API (dev/test) → đọc thẳng
  try { const hit = await c.match(req); if (hit) return hit.json(); } catch (e) { /* không có cache (dev) */ }
  const old = new Request('https://cache.lexkite.internal/stale/' + key);
  let out; try { out = await fn(); } catch (e) {
    if (!isShedError(e)) throw e;
    try { const hit = await c.match(old); if (hit) { const j = await hit.json(); return { ...j.v, _stale: j.at }; } } catch (e2) { /* không có bản cũ */ }
    throw e;
  }
  try { await c.put(req, new Response(JSON.stringify(out), { headers: { 'Cache-Control': 'max-age=' + ttl } })); await c.put(old, new Response(JSON.stringify({ at: Date.now(), v: out }), { headers: { 'Cache-Control': 'max-age=86400' } })); } catch (e) { /* bỏ qua */ }
  return out;
}

// Thao tác hàng loạt: ?1 = JSON mảng uid, ?2 = nhãn hoặc ghi chú, ?3 = bây giờ, ?4 = email quản trị. RETURNING = người thực sự đổi.
const BULK_MAX = 2000, UID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
const IN_UIDS = 'uid IN (SELECT value FROM json_each(?1))';
const cleanNote = t => String(t || '').trim().slice(0, 200);
// [SQL, (uids JSON, nhãn/ghi chú, bây giờ, email quản trị) → tham số]
const BULK_SQL = {
  tagAdd: [`UPDATE users SET tags = json_insert(${TJ}, '$[#]', ?2) WHERE ${IN_UIDS} AND NOT EXISTS (SELECT 1 FROM json_each(${TJ}) WHERE value = ?2) AND json_array_length(${TJ}) < 10 RETURNING uid`, (J, t) => [J, t]],
  tagRemove: [`UPDATE users SET tags = (SELECT json_group_array(value) FROM json_each(${TJ}) WHERE value <> ?2) WHERE ${IN_UIDS} AND EXISTS (SELECT 1 FROM json_each(${TJ}) WHERE value = ?2) RETURNING uid`, (J, t) => [J, t]],
  block: [`UPDATE users SET blocked = 1 WHERE ${IN_UIDS} AND COALESCE(blocked, 0) = 0 AND deleted IS NULL RETURNING uid`, J => [J]],
  unblock: [`UPDATE users SET blocked = 0 WHERE ${IN_UIDS} AND blocked = 1 RETURNING uid`, J => [J]],
  aiGrant: [`INSERT INTO quota_allow (id, note, at, by) SELECT 'u:' || value, ?2, ?3, ?4 FROM json_each(?1) WHERE true ON CONFLICT (id) DO NOTHING RETURNING id`, (J, t, now, by) => [J, t || 'bulk', now, by]],
  aiRevoke: [`DELETE FROM quota_allow WHERE id IN (SELECT 'u:' || value FROM json_each(?1)) RETURNING id`, J => [J]],
  delete: [`UPDATE users SET deleted = ?2, blocked = CASE WHEN COALESCE(blocked, 0) = 0 THEN 2 ELSE blocked END WHERE ${IN_UIDS} AND deleted IS NULL RETURNING uid`, (J, t, now) => [J, now]],
  restore: [`UPDATE users SET deleted = NULL, blocked = CASE WHEN blocked = 2 THEN 0 ELSE blocked END WHERE ${IN_UIDS} AND deleted IS NOT NULL RETURNING uid`, J => [J]],
  purge: [`SELECT uid FROM users WHERE ${IN_UIDS} AND deleted IS NOT NULL`, J => [J]], // xóa vĩnh viễn ngay (chỉ người đã ở thùng rác) – deleteUserData từng người
};
const BULK_UNDO = { tagAdd: 'tagRemove', tagRemove: 'tagAdd', block: 'unblock', unblock: 'block', aiGrant: 'aiRevoke', aiRevoke: 'aiGrant', delete: 'restore', restore: 'delete' };
const BULK_PROTECT = new Set(['block', 'delete', 'purge']);
const BULK_DANGER = new Set(['block', 'delete', 'purge', 'aiGrant']); // cần vừa đăng nhập ≤ 15 phút như DANGER
const PURGE_AFTER = 30 * DAY, PURGE_MAX = 200; // xóa vĩnh viễn: ~12 câu/người (DELETE_SQL) → ≤ 200 người/lệnh
// Xóa thật tài khoản đã nằm thùng rác > 30 ngày (gọi khi mở tab Người dùng – không có việc nền/poll; ≤ 25 người/lượt, đọc chỉ mục idx_users_del)
async function purgeDeleted(db, now = Date.now()) {
  const old = await all(db, 'SELECT uid FROM users WHERE deleted IS NOT NULL AND deleted < ? LIMIT 25', now - PURGE_AFTER);
  for (const r of old) { await deleteUserData(db, r.uid); await db.prepare('DELETE FROM quota_allow WHERE id = ?').bind('u:' + r.uid).run().catch(() => {}); }
  return old.length;
}

// SQL cũ quét `sessions` – chỉ chạy khi ADMIN_ROLLUP=0 (quay lại) và trong test kiểm khớp (scripts/test/admin-rollup.mjs)
export const LEGACY = {
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
    const [allC, land] = await Promise.all([all(db, `SELECT country AS k, COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND day >= ? GROUP BY k`, from), all(db, LAND_SQL, from).catch(() => [])]);
    return { days, tz: TZ, from, daily, refs, countries, devs, langs, plats, paths, sum, freq, rate, hours, wdays, durs, nr, signups, cpm: tierShare(allC), land: landStats(land), excluded };
  },
  // Lưu lượng trực tiếp (tự cập nhật 30 giây/lần): phần nhanh đệm 20 giây, phần nặng (tổng, 14 ngày, 30 ngày) đệm 10 phút
  async live(db, b, who, env) {
    const days = Math.min(Math.max(+b.days || 30, 1), 365), now = Date.now(), d1 = vday(now), d7 = vday(now - 6 * DAY), d14 = vday(now - 13 * DAY), d30 = vday(now - 29 * DAY), { H, vids } = await humanWhere(db, env);
    const fast = await cached('live-fast-v3?d=' + days, 20, async () => {
      const on = now - 5 * 60e3;
      const [online, viewing, today, countries, pagesToday, refs, platsToday, auto, late] = await Promise.all([
        one(db, `SELECT COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND last > ?`, on),
        all(db, `SELECT COALESCE(last_path, path, 'home') AS k, COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND last > ? AND COALESCE(last_path, path, 'home') <> 'admin' GROUP BY k ORDER BY n DESC LIMIT 10`, on),
        one(db, `SELECT COUNT(*) AS s, COALESCE(SUM(pages), 0) AS views, COUNT(DISTINCT vid) AS visitors, AVG(dur) AS dur FROM sessions WHERE ${H} AND day = ?`, d1),
        all(db, `SELECT country AS k, COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND day = ? GROUP BY k ORDER BY n DESC LIMIT 250`, d1),
        all(db, 'SELECT path AS k, n FROM pageviews_day WHERE day = ? ORDER BY n DESC LIMIT 10', d1),
        all(db, `SELECT ref AS k, COUNT(*) AS n FROM sessions WHERE ${H} AND day = ? AND ref <> '' GROUP BY ref ORDER BY n DESC LIMIT 10`, d1),
        all(db, `SELECT COALESCE(plat, 'web') AS k, COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND day = ? GROUP BY k ORDER BY n DESC`, d1),
        // Đã loại khỏi số người thật hôm nay: máy tự động theo loại (ci · ci-app · ua · bot · dc · admin) + khách là tài khoản quản trị
        all(db, `SELECT COALESCE(bot, 'admin') AS k, COUNT(*) AS s, COUNT(DISTINCT vid) AS v FROM sessions WHERE day = ? AND NOT (${H}) GROUP BY k ORDER BY s DESC`, d1),
        // Phiên gửi bù hôm nay (hit.js lateAt): máy khách giữ lại lúc /api chết rồi gửi lại → dấu hiệu đã có gián đoạn ghi thống kê
        one(db, "SELECT COALESCE(SUM(n), 0) AS n FROM ext_events WHERE day = ? AND kind = 'hit:late'", d1).catch(() => ({ n: 0 })),
      ]);
      // Chưa có dữ liệu pageviews_day (trước khi cập nhật app) → dùng trang vào đầu tiên của phiên
      const fb = pagesToday.length ? null : await all(db, `SELECT path AS k, COUNT(*) AS n FROM sessions WHERE ${H} AND day = ? GROUP BY path ORDER BY n DESC LIMIT 10`, d1);
      const aeOn = hitMode(env) === 'hybrid' ? await aeOnline(env, now, vids) : null; // chế độ hybrid: nhịp 3 phút chỉ ở AE → 'đang online' đọc AE
      return { online: aeOn ? aeOn.n : online.n || 0, viewing: aeOn ? aeOn.viewing : viewing, today: { ...today, perVisitor: today.visitors ? today.views / today.visitors : 0 }, countries, pagesToday: fb || pagesToday, pagesFallback: !!fb, refs, platsToday,
        excluded: { s: auto.reduce((a, r) => a + r.s, 0), kinds: auto }, late: late.n || 0 };
    });
    const slow = await cached('live-slow-v2', 600, async () => {
      const [total, series, plats30, pages7, vo7] = await Promise.all([
        one(db, `SELECT COALESCE(SUM(pages), 0) AS views, COUNT(DISTINCT vid) AS visitors FROM sessions WHERE ${H}`),
        all(db, `SELECT day, COALESCE(SUM(pages), 0) AS views, COUNT(DISTINCT vid) AS visitors FROM sessions WHERE ${H} AND day >= ? GROUP BY day ORDER BY day`, d14),
        all(db, `SELECT COALESCE(plat, 'web') AS k, COUNT(DISTINCT vid) AS n FROM sessions WHERE ${H} AND day >= ? GROUP BY k ORDER BY n DESC`, d30),
        all(db, 'SELECT path AS k, SUM(n) AS n FROM pageviews_day WHERE day >= ? GROUP BY path ORDER BY n DESC LIMIT 10', d7),
        // 🔊 Nguồn giọng 7 ngày (hit.js t:'vo'): PK (day, kind) → SEARCH theo khoảng ngày + tiền tố 'vo:' – tỷ lệ rơi về giọng máy
        all(db, VO_SQL, d7).catch(() => []),
      ]);
      const by = Object.fromEntries(series.map(r => [r.day, r]));
      return { total, plats30, pages7, voice: voiceOf(vo7), series: Array.from({ length: 14 }, (_, i) => { const d = vday(now - (13 - i) * DAY); return { day: d, views: (by[d] || {}).views || 0, visitors: (by[d] || {}).visitors || 0 }; }) };
    });
    const rate = +((await one(db, "SELECT v FROM config WHERE k = 'hit_rate'").catch(() => null)) || {}).v || 1;
    return { at: now, tz: TZ, day: d1, rate, ...fast, ...slow };
  },
};

export const OPS = {
  async whoami() { return { admin: true }; }, // cổng phía máy khách: tới được đây = adminGate đã xác nhận (không trả danh sách email)
  async usage(db, b) {
    const now = Date.now(), d1 = dayStr(now), t0 = Date.parse(d1 + 'T00:00:00Z');
    const r = await db.prepare('SELECT 1').run(), size = (r.meta && (r.meta.size_after ?? r.meta.db_size)) || 0;
    const tables = await all(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'");
    const counts = await tableCounts(db, tables.map(t => t.name));
    const w = await Promise.all([
      one(db, 'SELECT COUNT(*) AS n FROM sessions WHERE day >= ?1 AND at >= ?2', d1, t0) /* chỉ mục sessions_day (at không có chỉ mục → trước đây quét cả bảng); ngày VN của 0h UTC = d1 */, one(db, 'SELECT COUNT(*) AS n FROM docs WHERE updated >= ?', t0),
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
    if (rollOff(env)) return LEGACY.overview(db, b, who, env);
    const now = Date.now(), d1 = vday(now), { vids } = await humanWhere(db, env), adm = new Set(vids);
    // "Đang online" luôn tươi (chỉ mục sessions_last: chỉ đọc phiên 5 phút gần nhất); phần còn lại đệm 60 giây
    const [onRows, aeOn] = await Promise.all([
      all(db, 'SELECT DISTINCT vid FROM sessions WHERE last > ?1 AND bot IS NULL', now - 5 * 60e3).catch(() => []),
      hitMode(env) === 'hybrid' ? aeOnline(env, now, vids) : null,
    ]);
    const online = aeOn ? aeOn.n : onRows.filter(r => r.vid != null && !adm.has(r.vid)).length;
    const rest = await cached(`overview-r1?x=${vidsHash(vids)}&d=${d1}`, 60, async () => {
      const d7 = vday(now - 6 * DAY), d0 = vday(now - DAY), d14 = vday(now - 13 * DAY), d30 = vday(now - 29 * DAY), d60 = vday(now - 59 * DAY), y = k => vday(Date.parse(k + 'T12:00:00Z') - DAY);
      const [u, c, e, days] = await Promise.all([
        one(db, 'SELECT COUNT(*) AS total, SUM(created > ?1) AS new7, SUM(seen > ?2) AS act1, SUM(seen > ?1) AS act7, SUM(seen > ?3) AS act30 FROM users', now - 7 * DAY, now - DAY, now - 30 * DAY),
        one(db, 'SELECT COUNT(*) AS open FROM contact_msgs WHERE COALESCE(handled, 0) = 0'),
        one(db, 'SELECT COUNT(*) AS kinds, COALESCE(SUM(n), 0) AS hits FROM errors WHERE last > ?', now - DAY),
        loadDays(db, d60, adm, now),
      ]);
      const m7 = merge(days, d7), v = (a, z) => merge(days, a, z).vids.size, exToday = merge(days, d1, d1);
      return {
        users: u, inbox: c, errors24: e,
        sessions: { today: m7.s ? exToday.s : null, s7: m7.s, v7: m7.vids.size, dur7: avgOf(m7.dS, m7.dN), pages7: avgOf(m7.pS, m7.pN) },
        humans: { d1: v(d1, d1), p1: v(d0, d0), d7: v(d7), p7: v(d14, y(d7)), d30: v(d30), p30: v(d60, y(d30)) },
        excluded: [...exToday.ex.values()].reduce((a, t) => a + t.s, 0),
        series: Array.from({ length: 14 }, (_, i) => { const k = vday(now - (13 - i) * DAY); return { day: k, v: v(k, k) }; }),
      };
    });
    return { users: rest.users, sessions: rest.sessions, inbox: rest.inbox, errors24: rest.errors24, humans: rest.humans, online, excluded: rest.excluded, series: rest.series };
  },
  async users(db, b, who, env) {
    await purgeDeleted(db).catch(() => {}); // xóa thật các tài khoản đã xóa mềm > 30 ngày (≤ 25/lượt, đọc chỉ mục idx_users_del – không có việc nền)
    const f = userWhere(b, env), off = Math.max(0, Math.floor(+b.offset || 0)), now = Date.now(), lim = [25, 50, 100, 200].includes(+b.limit) ? +b.limit : 50;
    const [rows, cnt, k, plats] = await Promise.all([
      all(db, `SELECT uid, email, name, created, seen, plat, n, COALESCE(blocked, 0) AS blocked, tags, cc, deleted, EXISTS (SELECT 1 FROM quota_allow q WHERE q.id = 'u:' || users.uid) AS ai FROM users${f.sql} ORDER BY ${f.order} LIMIT ${lim} OFFSET ${off}`, ...f.args),
      one(db, `SELECT COUNT(*) AS n FROM users${f.sql}`, ...f.args),
      one(db, 'SELECT SUM(deleted IS NULL) AS total, SUM(deleted IS NULL AND seen > ?1) AS act1, SUM(deleted IS NULL AND seen > ?2) AS act7, SUM(deleted IS NULL AND seen > ?3) AS act30, SUM(deleted IS NULL AND created > ?2) AS new7, SUM(deleted IS NOT NULL) AS trash, SUM(deleted IS NULL AND COALESCE(blocked, 0) = 1) AS blocked FROM users', now - DAY, now - 7 * DAY, now - 30 * DAY),
      all(db, "SELECT COALESCE(plat, '') AS k, COUNT(*) AS n FROM users WHERE deleted IS NULL GROUP BY k ORDER BY n DESC"),
    ]);
    // Người dùng theo quốc gia (chỉ đọc chỉ mục idx_users_cc; đệm 5 phút ở Cache API – trang quản trị lọc/lật trang không đọc lại D1)
    const countries = await cached('admin-users-cc', 300, () => all(db, "SELECT COALESCE(cc, '') AS k, COUNT(*) AS n FROM users GROUP BY cc ORDER BY n DESC LIMIT 250")).catch(() => []);
    return { rows: rows.map(r => ({ ...r, ai: +r.ai ? 1 : 0, isAdmin: isAdm(f.admins, r.email) })), filtered: cnt.n || 0, total: k.total || 0, kpi: k, plats, countries, offset: off, limit: lim };
  },
  // Biểu đồ tab Người dùng (đệm 10 phút): đăng ký 90 ngày (giờ VN), giữ chân theo nhóm tuần đăng ký, phễu kích hoạt, nhãn hay dùng.
  // Chỉ dùng cột sẵn có của users (created, seen, n): "giữ chân D1/D7/D30" = tỉ lệ người trong nhóm còn quay lại ít nhất 1/7/30 ngày sau khi đăng ký.
  async usersStats(db) {
    return cached('admin-users-stats-v1', 600, async () => {
      const now = Date.now(), VN = 7 * 3600000, since = now - 90 * DAY, wk = 7 * DAY, c0 = now - 12 * wk;
      const [signups, cohorts, fun, tags] = await Promise.all([
        all(db, `SELECT strftime('%Y-%m-%d', (created + ${VN}) / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM users WHERE created >= ? AND deleted IS NULL GROUP BY day ORDER BY day`, since),
        all(db, `SELECT CAST((created - ?1) / ${wk} AS INTEGER) AS w, COUNT(*) AS n, SUM(seen - created >= ${DAY}) AS d1, SUM(seen - created >= ${7 * DAY}) AS d7, SUM(seen - created >= ${30 * DAY}) AS d30 FROM users WHERE created >= ?1 AND deleted IS NULL GROUP BY w ORDER BY w`, c0),
        one(db, `SELECT COUNT(*) AS signed, SUM(n >= 2) AS synced2, SUM(seen - created >= ${DAY}) AS back1, SUM(seen - created >= ${7 * DAY}) AS back7, SUM(seen > ?1) AS active7 FROM users WHERE deleted IS NULL`, now - 7 * DAY),
        all(db, `SELECT j.value AS k, COUNT(*) AS n FROM users, json_each(${TJ}) j WHERE users.tags IS NOT NULL AND users.deleted IS NULL GROUP BY j.value ORDER BY n DESC LIMIT 30`),
      ]);
      return { at: now, signups, cohorts: cohorts.map(c => ({ ...c, start: c0 + c.w * wk })), funnel: fun, tags };
    });
  },
  /* Thao tác hàng loạt (Quản trị › Người dùng). { action, uids:[…] | all:true + filter:{…bộ lọc users}, confirm:<số người>, tag?, note? }
   * Luôn chạy phía máy chủ: kiểm quyền (adminGate), ≤ 20 lệnh/phút/quản trị, ≤ BULK_MAX người/lệnh, 1 câu SQL/lệnh (json_each – ghi đúng n dòng đổi).
   * confirm phải bằng số người máy chủ tự tính lại (chống chọn nhầm / bộ lọc đổi giữa chừng). Không khóa/xóa tài khoản quản trị.
   * Trả changed = uid THỰC SỰ đổi → máy khách hoàn tác đúng những người đó (hành động ngược: BULK_UNDO). Ghi admin_log: usersBulk:<action> + chi tiết. */
  async usersBulk(db, b, who, env) {
    const act = String(b.action || '');
    if (!Object.hasOwn(BULK_SQL, act)) throw new Error('action');
    if (await limit('admbulk:' + String(who && who.email || ''), 20, 60)) throw new Error('too-fast');
    const tag = cleanTag(b.tag); if ((act === 'tagAdd' || act === 'tagRemove') && !tag) throw new Error('tag-required');
    let uids;
    if (b.all === true) {
      const f = userWhere({ ...(b.filter && typeof b.filter === 'object' ? b.filter : {}) }, env);
      uids = (await all(db, `SELECT uid FROM users${f.sql} ORDER BY uid LIMIT ${BULK_MAX + 1}`, ...f.args)).map(r => r.uid);
    } else {
      const want = [...new Set((Array.isArray(b.uids) ? b.uids : []).map(u => String(u || '')).filter(u => UID_RE.test(u)))];
      if (want.length > BULK_MAX) throw new Error('too-many');
      uids = want.length ? (await all(db, 'SELECT uid FROM users WHERE uid IN (SELECT value FROM json_each(?))', JSON.stringify(want))).map(r => r.uid) : [];
    }
    if (!uids.length) throw new Error('empty');
    if (uids.length > BULK_MAX) throw new Error('too-many');
    if (act === 'purge' && uids.length > PURGE_MAX) throw new Error('too-many');
    if (+b.confirm !== uids.length) return { error: 'confirm', n: uids.length }; // số người đã đổi (vd. bộ lọc có người mới) → máy khách hỏi lại
    let skipped = 0;
    if (BULK_PROTECT.has(act)) { // không bao giờ khóa/xóa tài khoản quản trị (tránh tự khóa mình)
      const admins = adminList(env);
      if (admins.length) {
        const adm = new Set((await all(db, 'SELECT uid FROM users WHERE uid IN (SELECT value FROM json_each(?1)) AND lower(email) IN (SELECT value FROM json_each(?2))', JSON.stringify(uids), JSON.stringify(admins))).map(r => r.uid));
        skipped = adm.size; uids = uids.filter(u => !adm.has(u));
      }
    }
    const now = Date.now(), by = String(who && who.email || 'admin').slice(0, 120), J = JSON.stringify(uids);
    const [q, args] = BULK_SQL[act], rows = uids.length ? await all(db, q, ...args(J, tag || cleanNote(b.note), now, by)) : [];
    const changed = rows.map(r => String(r.uid || r.id || '').replace(/^u:/, '')).filter(Boolean);
    if (act === 'aiGrant' || act === 'aiRevoke') resetQuotaState();
    if (act === 'purge') for (const u of changed) { await deleteUserData(db, u); await db.prepare('DELETE FROM quota_allow WHERE id = ?').bind('u:' + u).run().catch(() => {}); }
    const detail = JSON.stringify({ action: act, n: uids.length, changed: changed.length, skipped, tag: tag || undefined, all: b.all === true || undefined, sample: changed.slice(0, 20) });
    return { ok: true, action: act, n: uids.length, changed, skipped, undo: BULK_UNDO[act] || null, _audit: detail };
  },
  async usersExport(db, b, who, env) {
    const f = userWhere(b, env);
    const rows = await all(db, `SELECT uid, email, name, plat, created, seen, n, COALESCE(blocked, 0) AS blocked, tags, cc, EXISTS (SELECT 1 FROM quota_allow q WHERE q.id = 'u:' || users.uid) AS ai FROM users${f.sql} ORDER BY ${f.order} LIMIT 5000`, ...f.args);
    return { rows: rows.map(r => ({ ...r, ai: +r.ai ? 1 : 0, isAdmin: isAdm(f.admins, r.email) })) };
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
    // Ngăn chi tiết: quyền AI, báo lỗi người này gửi, thông báo đã đọc, dòng thời gian (gộp từ các mốc sẵn có – không đọc bảng lớn)
    const uid = String(b.uid);
    const [ai, reports, reads] = await Promise.all([
      one(db, 'SELECT at, by, note FROM quota_allow WHERE id = ?', 'u:' + uid).catch(() => ({})),
      all(db, 'SELECT tok, at, status, cat, area, substr(msg, 1, 160) AS msg FROM reports WHERE uid = ? ORDER BY at DESC LIMIT 10', uid).catch(() => []), // scan-ok: bảng báo lỗi nhỏ, ≤ 10 dòng, chỉ khi mở ngăn chi tiết
      all(db, 'SELECT r.read_at AS at, r.clicked, n.title FROM notice_reads r LEFT JOIN notices n ON n.id = r.id WHERE r.uid = ? ORDER BY r.read_at DESC LIMIT 10', uid).catch(() => []),
    ]);
    const tl = [{ at: u.created, k: 'signup' }, { at: u.seen, k: 'seen', plat: u.plat || '', cc: u.cc || '' }]
      .concat(learn && learn.lastStudy ? [{ at: Date.parse(learn.lastStudy + 'T12:00:00Z'), k: 'study' }] : [])
      .concat(backups.map(x => ({ at: x.at, k: 'backup', by: x.by, why: x.reason })))
      .concat(reports.map(x => ({ at: x.at, k: 'report', id: x.tok, status: x.status })))
      .concat(reads.map(x => ({ at: x.at, k: 'notice', title: x.title || '', clicked: +x.clicked ? 1 : 0 })))
      .concat(u.deleted ? [{ at: u.deleted, k: 'deleted' }] : [])
      .filter(x => Number.isFinite(+x.at) && +x.at > 0).sort((x, y) => y.at - x.at).slice(0, 30);
    return { user: { ...u, tags, notes: u.notes || '', blocked: +u.blocked ? 1 : 0, isAdmin: isAdm(adminList(env), u.email), ai: ai && ai.at ? { at: ai.at, by: ai.by || '', note: ai.note || '' } : null }, docs, learn, backups, reports, reads, timeline: tl };
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
    // Một nguồn với "Xóa tài khoản" của người dùng (account.js DELETE_SQL): trước đây bản quản trị bỏ sót league/vid_uid/lớp học/báo lỗi
    await deleteUserData(db, uid);
    await db.prepare('DELETE FROM quota_allow WHERE id = ?').bind('u:' + uid).run().catch(() => {});
    return { ok: true, _audit: JSON.stringify({ uid }) };
  },
  async inbox(db, b) {
    const f = b.filter === 'all' ? '' : 'WHERE COALESCE(handled, 0) = 0';
    return { rows: await all(db, `SELECT id, at, name, email, msg, lang, sent, COALESCE(handled, 0) AS handled FROM contact_msgs ${f} ORDER BY id DESC LIMIT 200`) };
  },
  async inboxMark(db, b) { await db.prepare('UPDATE contact_msgs SET handled = ? WHERE id = ?').bind(b.handled ? 1 : 0, +b.id).run(); return { ok: true }; },
  async analytics(db, b, who, env) {
    if (rollOff(env)) return LEGACY.analytics(db, b, who, env);
    const now = Date.now(), days = Math.min(Math.max(+b.days || 30, 1), 365), from = vday(now - (days - 1) * DAY), today = vday(now), { vids } = await humanWhere(db, env);
    // Đệm 5 phút theo khoảng ngày + danh sách quản trị: mở lại trang / đổi tab không đọc D1. Giờ cao điểm & thứ trong tuần theo NGÀY VN của khoảng
    // (trước: mốc trượt now − days; nay khớp mọi thẻ khác của trang)
    return cached(`analytics-r1?d=${days}&x=${vidsHash(vids)}&t=${today}`, 300, async () => {
      const VN = 7 * 3600000, since = now - days * DAY;
      const [D, rate, signups] = await Promise.all([
        loadDays(db, from, new Set(vids), now),
        one(db, "SELECT v FROM config WHERE k = 'hit_rate'").catch(() => null),
        all(db, `SELECT strftime('%Y-%m-%d', (created + ${VN}) / 1000, 'unixepoch') AS day, COUNT(*) AS n FROM users WHERE created >= ? GROUP BY day ORDER BY day`, since),
      ]);
      const m = merge(D, from), land = await all(db, LAND_SQL, from).catch(() => []);
      return {
        days, tz: TZ, from,
        daily: perDay(D, from, '9999', (day, x) => ({ day, s: x.s, v: x.vids.size, dur: avgOf(x.dS, x.dN), pages: avgOf(x.pS, x.pN), ret: x.rN ? x.rS : null })),
        refs: top(m, 'ref', 12, k => (k == null || k === '' ? '(trực tiếp)' : k)), countries: top(m, 'country', 20), devs: top(m, 'dev', 12), langs: top(m, 'lang', 15), plats: top(m, 'plat', 12), paths: top(m, 'path', 15),
        sum: sumOf(m), freq: freqOf(m), rate: +((rate || {}).v) || 1,
        hours: m.hr.map((n, k) => ({ k, n })).filter(x => x.n), wdays: m.wd.map((n, k) => ({ k, n })).filter(x => x.n),
        durs: [...m.du].map(([k, [n, o]]) => ({ k, n, o })).sort((x, y) => (x.o == null ? -1 : y.o == null ? 1 : x.o - y.o)),
        nr: perDay(D, from, '9999', (day, x) => ({ day, fresh: x.rN ? x.fr : null, back: x.rN ? x.bk : null })),
        cpm: tierShare(distinctBy(m, 'country', 250)), land: landStats(land), // người thật theo nhóm CPM + khách ngoài vào trang tĩnh (_cpm.js)
        signups, excluded: { s: [...m.ex.values()].reduce((a, t) => a + t.s, 0), v: m.exV.size },
      };
    });
  },
  // Lưu lượng trực tiếp (tự cập nhật 30 giây/lần): phần nhanh đệm 20 giây (hôm nay: 1 câu theo chỉ mục sessions_day + bộ nhớ isolate 20 giây), phần nặng 10 phút (bảng tổng hợp)
  async live(db, b, who, env) {
    if (rollOff(env)) return LEGACY.live(db, b, who, env);
    const days = Math.min(Math.max(+b.days || 30, 1), 365), now = Date.now(), d1 = vday(now), d7 = vday(now - 6 * DAY), d14 = vday(now - 13 * DAY), d30 = vday(now - 29 * DAY), { vids } = await humanWhere(db, env), adm = new Set(vids), xh = vidsHash(vids);
    const fast = await cached(`live-fast-r1?d=${days}&x=${xh}`, 20, async () => {
      const [onRows, pagesToday, late, D] = await Promise.all([
        all(db, "SELECT vid, COALESCE(last_path, path, 'home') AS k FROM sessions WHERE last > ?1 AND bot IS NULL", now - 5 * 60e3),
        all(db, 'SELECT path AS k, n FROM pageviews_day WHERE day = ? ORDER BY n DESC LIMIT 10', d1),
        // Phiên gửi bù hôm nay (hit.js lateAt): máy khách giữ lại lúc /api chết rồi gửi lại → dấu hiệu đã có gián đoạn ghi thống kê
        one(db, "SELECT COALESCE(SUM(n), 0) AS n FROM ext_events WHERE day = ? AND kind = 'hit:late'", d1).catch(() => ({ n: 0 })),
        loadDays(db, d1, adm, now),
      ]);
      const m = merge(D, d1, d1), on = onRows.filter(r => r.vid != null && !adm.has(r.vid)), byK = new Map();
      for (const r of on) if (r.k !== 'admin') (byK.get(r.k) || (byK.set(r.k, new Set()), byK.get(r.k))).add(r.vid);
      const viewing = [...byK].map(([k, s]) => ({ k, n: s.size })).sort((x, y) => y.n - x.n || (x.k < y.k ? -1 : 1)).slice(0, 10);
      const refs = [...m.dm.ref].map(([k, e]) => ({ k: unkey(k), n: e.n })).filter(x => x.k != null && x.k !== '').sort((x, y) => y.n - x.n || (x.k < y.k ? -1 : 1)).slice(0, 10);
      // Chưa có dữ liệu pageviews_day (trước khi cập nhật app) → dùng trang vào đầu tiên của phiên
      const fb = pagesToday.length ? null : [...m.dm.path].map(([k, e]) => ({ k: unkey(k), n: e.n })).sort((x, y) => y.n - x.n || (String(x.k) < String(y.k) ? -1 : 1)).slice(0, 10);
      const aeOn = hitMode(env) === 'hybrid' ? await aeOnline(env, now, vids) : null; // chế độ hybrid: nhịp 3 phút chỉ ở AE → 'đang online' đọc AE
      // Đã loại khỏi số người thật hôm nay: máy tự động theo loại (ci · ci-app · ua · bot · dc · admin) + khách là tài khoản quản trị
      const auto = [...m.ex].map(([k, t]) => ({ k, s: t.s, v: t.v.size })).sort((x, y) => y.s - x.s || (x.k < y.k ? -1 : 1));
      const today = { s: m.s, views: m.pS, visitors: m.vids.size, dur: avgOf(m.dS, m.dN) };
      return { online: aeOn ? aeOn.n : new Set(on.map(r => r.vid)).size, viewing: aeOn ? aeOn.viewing : viewing, today: { ...today, perVisitor: today.visitors ? today.views / today.visitors : 0 },
        countries: distinctBy(m, 'country', 250), pagesToday: fb || pagesToday, pagesFallback: !!fb, refs, platsToday: distinctBy(m, 'plat', 1e3, webPlat),
        excluded: { s: auto.reduce((a, r) => a + r.s, 0), kinds: auto }, late: late.n || 0 };
    });
    const slow = await cached(`live-slow-r1?x=${xh}`, 600, async () => {
      const [D, pages7, vo7] = await Promise.all([
        loadDays(db, '0000-00-00', adm, now), // toàn bộ lịch sử: ≤ 1 dòng/ngày (≤ 400 ngày – hit.js dọn sessions quá 400 ngày)
        all(db, 'SELECT path AS k, SUM(n) AS n FROM pageviews_day WHERE day >= ? GROUP BY path ORDER BY n DESC LIMIT 10', d7),
        all(db, VO_SQL, d7).catch(() => []),
      ]);
      const all0 = merge(D, '0000-00-00');
      return { total: { views: all0.pS, visitors: all0.vids.size }, plats30: distinctBy(merge(D, d30), 'plat', 1e3, webPlat), pages7, voice: voiceOf(vo7),
        series: Array.from({ length: 14 }, (_, i) => { const d = vday(now - (13 - i) * DAY), x = merge(D, d, d); return { day: d, views: x.pS, visitors: x.vids.size }; }) };
    });
    const rate = +((await one(db, "SELECT v FROM config WHERE k = 'hit_rate'").catch(() => null)) || {}).v || 1;
    return { at: now, tz: TZ, day: d1, rate, ...fast, ...slow };
  },
  // Tăng trưởng & giữ chân, add-on Chrome, phễu chuyển đổi (functions/api/growth.js) – đệm 10 phút theo kỳ 7/30/90 ngày
  async growth(db, b, who, env) {
    const P = [7, 30, 90].includes(+b.days) ? +b.days : 30;
    if (rollOff(env)) return cached('growth-v1?d=' + P, 600, () => growthData(db, P));
    const { vids } = await humanWhere(db, env);
    return cached(`growth-r1?d=${P}&x=${vidsHash(vids)}`, 600, () => growthRoll(db, P, new Set(vids)));
  },
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
  async quality(db, b, who, env) {
    // cached(): chỉ đệm khi tính xong; lỗi GitHub (403/rate-limit/5xx) → ném ra, KHÔNG đệm kết quả rỗng 10 phút (test: admin-gh.mjs)
    return cached('quality-v2', 600, async () => {
      const gh = u => ghApi(env, u);
      const runs = ((await gh('actions/workflows/health.yml/runs?per_page=14')).workflow_runs || []).filter(r => r.status === 'completed');
      const CHECK = /^(Kiểm thử|Lẫn tiếng|Kiểm tra kiểu|Cú pháp|Bản live)/;
      const steps = async r => (((await gh(`actions/runs/${r.id}/jobs`)).jobs || [])[0] || { steps: [] }).steps.filter(x => CHECK.test(x.name)).map(x => ({ name: x.name, ok: x.conclusion === 'success' }));
      const latest = runs[0] ? await steps(runs[0]) : [];
      const score = latest.length ? Math.round(latest.filter(x => x.ok).length / latest.length * 100) : null;
      return { score, standard: 100, at: runs[0] ? Date.parse(runs[0].updated_at) : 0, url: runs[0] ? runs[0].html_url : '', checks: latest, history: runs.map(r => ({ at: Date.parse(r.updated_at), ok: r.conclusion === 'success', url: r.html_url })) };
    });
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
  async auditLog(db) { return { rows: await all(db, 'SELECT at, email, op, ok, ip, country, detail FROM admin_log ORDER BY id DESC LIMIT 100') }; },
  // ---- Nhiều khóa Gemini xoay vòng (D1 config 'gemini_keys' = [{k, at, by}]) – không bao giờ trả nguyên khóa ----
  // 💰 Quản trị › Quảng cáo (js/admin-ads.js): ext_events 'ad*' 35 ngày – PK (day, kind) → SEARCH theo khoảng ngày, đệm 10 phút;
  // doanh thu THẬT: ads_rev (PK day,src,dim,key – SEARCH khoảng ngày, ≤ ~4.500 dòng/100 ngày) do Action ads-revenue.yml ghi qua /api/ads-report; chưa có bảng → real.connected = false
  async adsStats(db, b, who, env) {
    return cached('ads-v2', 600, async () => {
      const now = Date.now(), today = vday(now);
      const [rows, cfg, rev] = await Promise.all([
        all(db, "SELECT day, kind, n FROM ext_events WHERE day >= ? AND kind >= 'ad' AND kind < 'ae'", vday(now - 35 * DAY)),
        all(db, `SELECT k, v, at, by FROM config WHERE k IN (${[...ADS_KEYS, 'ads_report', 'ads_pay'].map(() => '?').join(',')})`, ...ADS_KEYS, 'ads_report', 'ads_pay'),
        all(db, ADS_REV_SEL, vday(now - 100 * DAY), vday(now + DAY)).catch(() => []), // ~100 ngày: đủ "tháng trước" + kỳ so sánh 28 ngày
      ]);
      const c = Object.fromEntries(cfg.map(r => [r.k, r.v]));
      const ecpm = { web: c.ads_ecpm_web ?? 1, android: c.ads_ecpm_android ?? 1, ios: c.ads_ecpm_ios ?? 1 };
      const pj = v => { try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };
      const rt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
      const real = adsRevPack(rev, pj(c.ads_report), pj(c.ads_pay), rows, ecpm, today, rt);
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
  async alerts(db, b, who, env) {
    const now = Date.now(), out = [];
    try {
      // Đệm 60 s (R2): trang Quản trị tự làm mới không đốt hạn mức GitHub; chỉ đệm khi đọc được – lỗi không bao giờ thành "0 workflow"
      out.push(...await cached('alerts-gh', 60, async () => {
        const runs = (await ghApi(env, 'actions/runs?per_page=40')).workflow_runs || [], seen = new Set(), rows = [];
        for (const w of runs) { if (seen.has(w.name)) continue; seen.add(w.name); rows.push({ kind: 'workflow', name: w.name, status: w.status, ok: w.conclusion === 'success' || w.conclusion === 'skipped' || w.status !== 'completed', conclusion: w.conclusion, at: Date.parse(w.updated_at), url: w.html_url }); }
        return rows;
      }));
    } catch (e) { out.push({ kind: 'workflow', name: 'GitHub API', ok: false, unreadable: true, conclusion: tx(b, 'không đọc được', 'unreadable') + ' · ' + String(e.message || e).slice(0, 40) }); }
    const e = await one(db, 'SELECT COUNT(*) AS kinds, COALESCE(SUM(n), 0) AS hits FROM errors WHERE last > ?', now - DAY);
    const lim = +((await one(db, "SELECT v FROM config WHERE k = 'alert_errors'")).v || 50);
    out.push({ kind: 'errors', name: tx(b, 'Lỗi JavaScript 24h', 'JavaScript errors (24h)'), ok: e.hits < lim, n: +e.hits || 0, kinds: +e.kinds || 0, lim, conclusion: tx(b, `${e.hits} lượt / ${e.kinds} loại (ngưỡng ${lim})`, `${e.hits} hits / ${e.kinds} types (threshold ${lim})`) });
    const c = await one(db, 'SELECT COUNT(*) AS n, MIN(at) AS oldest FROM contact_msgs WHERE COALESCE(handled, 0) = 0');
    const oldH = Math.round((now - c.oldest) / 36e5);
    out.push({ kind: 'inbox', name: tx(b, 'Tin nhắn chưa xử lý', 'Open messages'), n: +c.n || 0, ok: !c.n || now - c.oldest < 2 * DAY, conclusion: c.n ? tx(b, `${c.n} tin, cũ nhất ${oldH} giờ`, `${c.n} message(s), oldest ${oldH}h`) : tx(b, 'không có', 'none') });
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
        out.push({ kind: 'copy', name: tx(b, 'Nghi bị chép nội dung', 'Suspected content copies'), ok: !sus, url: BW, at: copy.at, conclusion: sus ? tx(b, `${sus} trang ngoài chứa nguyên văn/canary`, `${sus} external page(s) with verbatim text/canary`) : copy.configured === false ? tx(b, 'chỉ dò canary trên GitHub – bật Brave (BRAVE_SEARCH_KEY) để dò cả web', 'canary GitHub search only – add BRAVE_SEARCH_KEY for web search') : tx(b, 'không thấy', 'none found') }); }
    } catch (e) { /* chưa có bảng bw_* (chưa chạy lần nào) */ }
    const u = await OPS.usage(db, b);
    for (const m of u.meters) out.push({ kind: 'capacity', name: m.name, pct: m.pct, ok: m.pct < QUOTA_WARN, warn: m.pct >= QUOTA_WARN && m.pct < QUOTA_CRIT, conclusion: tx(b, `${m.pct}% hạn mức miễn phí`, `${m.pct}% of free tier`) });
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
const WRITE = /Set$|Delete$|Remove$|Clear$|Mark$|Approve$|^inboxReply$|^judge$|^review$|^usersExport$|^noticeCreate$|^noticeRevoke$|^userTag$|^userBlock$|^userReset$|^userRestore$|^userExportData$|^usersBulk$/; // (xuất danh sách người dùng cũng ghi nhật ký)
const READ_FREE = new Set(['whoami', 'ping']); // không đọc D1 – ngoài ngân sách
const DANGER = new Set(['userDelete', 'serviceDelete', 'errorsClear', 'geminiDelete', 'geminiRemove', 'userBlock', 'userReset', 'userRestore', 'userExportData']);
const ipOf = req => req.headers.get('CF-Connecting-IP') || '?';
async function audit(env, req, email, op, ok, detail = null) {
  try { const h = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode('lexkite-adm|' + ipOf(req))))].slice(0, 6).map(x => x.toString(16).padStart(2, '0')).join('');
    if (detail != null) await env.DB.prepare('INSERT INTO admin_log (at, email, op, ok, ip, country, detail) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(Date.now(), String(email || '').slice(0, 120), String(op || '').slice(0, 40), ok ? 1 : 0, h, (req.cf && req.cf.country) || '', String(detail).slice(0, 2000)).run();
    else await env.DB.prepare('INSERT INTO admin_log (at, email, op, ok, ip, country) VALUES (?, ?, ?, ?, ?, ?)').bind(Date.now(), String(email || '').slice(0, 120), String(op || '').slice(0, 40), ok ? 1 : 0, h, (req.cf && req.cf.country) || '').run(); } catch (e) { /* nhật ký không được làm hỏng thao tác */ }
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
  if ((DANGER.has(b.op) || (b.op === 'usersBulk' && BULK_DANGER.has(b.action))) && Date.now() / 1000 - (+who.auth_time || 0) > 900) return json(request, 401, { error: 'reauth', message: tx(b, 'Thao tác quan trọng: hãy đăng xuất rồi đăng nhập lại (bảo mật) rồi thử lại.', 'Sensitive action: sign out and sign back in (for security), then try again.') });
  // Ngân sách đọc theo route (sự cố 03/11, _readbudget.js): op đọc đi qua meter(); vượt ngân sách op/tổng Quản trị hoặc D1 ≥ 85 % → chỉ bản đệm, không chạm D1
  const isRead = !WRITE.test(b.op) && !READ_FREE.has(b.op);
  let db = env.DB, m = null, why = null;
  if (isRead) {
    const u = await d1Usage(env, env.DB).catch(() => null);
    why = isShed(u) ? 'd1-85' : overBudget(await spent(b.op), b.op);
    m = meter(env.DB, { stale: !!why, why }); db = /** @type {any} */ (m);
  }
  try {
    await setup(env.DB); const out = await fn(db, b, who, env);
    if (m && m.reads) await addSpent(b.op, m.reads);
    if (why && out && typeof out === 'object' && !Array.isArray(out)) out._budget = { why, retry: secsToReset() }; // trang hiện dải "số liệu đệm" nhẹ
    const det = out && typeof out === 'object' ? out._audit : null; if (det != null) delete out._audit; // chi tiết kiểm toán chỉ vào admin_log, không trả máy khách
    if (WRITE.test(b.op)) await audit(env, request, who.email, b.op === 'usersBulk' ? 'usersBulk:' + String(b.action).slice(0, 20) : b.op, !(out && out.error), det);
    return json(request, 200, out);
  }
  catch (e) {
    if (m && m.reads) await addSpent(b.op, m.reads).catch(() => {});
    if (isShedError(e)) { const r = json(request, 429, { error: 'quota-shed', why: e.why, retry: secsToReset() }); r.headers.set('Retry-After', String(secsToReset())); return r; }
    return json(request, 500, { error: String(e && e.message || e).slice(0, 200) });
  }
}
