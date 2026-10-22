/* Kho Drive riêng của Lexkite (Quản trị → Kho Drive · docs/ASSET-LIBRARY.md §8.6): chủ dự án nối 1 hoặc nhiều Google Drive của mình
 * (OAuth, scope drive.file – app CHỈ thấy file do chính nó tạo), dùng làm nguồn sao lưu 2 cho kho tài nguyên dựng video.
 * POST /api/drive { op, ... }
 *   Quản trị (Authorization: Bearer <Firebase ID token>, cổng adminGate): connect (+reconnect_id) · list · refresh_quota · disconnect · set_weight · drain · upload_session · complete · get_link
 *     · trình duyệt file + dọn dẹp (functions/api/_drive_files.js): browse · thumb · preview · rename · move · trash · restore · delete* · empty_trash* · storage_report · cleanup_scan · cleanup_apply
 *       (* = xoá vĩnh viễn: confirm:'DELETE' + đăng nhập lại ≤ 15 phút + chỉ file đã ở thùng rác)
 *     · cảnh báo chủ động: health · alerts (kiểm lười > 6 h)
 *   CLI/CI (scripts/video/library.mjs): header X-Drive-Ts + X-Drive-Sig = hex HMAC-SHA256(LEXKITE_DRIVE_CLI_KEY, "<ts>.<sha256 hex của body>"), lệch ≤ 300 s,
 *     chỉ được list · upload_session · complete · refs_sync · health.
 * GET /api/drive/callback (functions/api/drive/callback.js) – Google trả về sau khi đồng ý; GET /api/drive/dl (functions/api/drive/dl.js) – tải file qua link ký 5 phút; GET /api/drive/thumb – ảnh thu nhỏ qua proxy.
 * Byte file KHÔNG đi qua Worker khi tải lên: máy/CI PUT thẳng vào phiên resumable của Google. Refresh token mã hoá AES-GCM (DRIVE_ENC_KEY, 32 byte base64)
 * trong D1; access token chỉ ở bộ nhớ (< 50 phút). Không bao giờ trả về/ghi log token hay khoá. */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { limit } from './sync.js';
import { makeFileOps, serveThumb } from './_drive_files.js';

const REDIRECT = 'https://lexkite.com/api/drive/callback';
const SCOPE = 'https://www.googleapis.com/auth/drive.file openid email';
const ROOT_FOLDER = 'Lexkite Library';
const MB = 1048576, HEADROOM_MIN = 256 * MB, STATE_TTL = 600, LINK_TTL = 300, CLI_SKEW = 300;
const CLI_OPS = new Set(['list', 'upload_session', 'complete', 'refs_sync', 'health', 'where', 'replicas', 'repair', 'rebalance', 'render_link', 'set_want', 'retire', 'footage_alert']);
// Shorts archive (docs/VIDEO-STORAGE.md): masters live under folder shorts/… with cls 'render'. CLI may only touch those (render_link · set_want · retire).
const SHORTS_SQL = "f.folder LIKE 'shorts/%' AND f.cls = 'render'", CLIP_BYTES = 10 * 1048576, STOP_PCT = 0.9;
// Kho footage (docs/VIDEO.md §Kho footage): masters under folder footage/<cảnh>, cls 'original', 2 bản sao/2 Drive. CLI chỉ được ĐỌC (render_link) – không retire/set_want.
export const isFootageRow = r => !!r && r.cls === 'original' && /^footage\//.test(String(r.folder || ''));
export const isShortsRow = r => !!r && r.cls === 'render' && /^shorts\//.test(String(r.folder || ''));
/** Còn chứa được bao nhiêu clip (≈ 10 MB/master): Drive đang nhận file, tới ngưỡng ngừng 90 %. */
export function shortsCapacity(drives, clipBytes = CLIP_BYTES) {
  const usable = drives.filter(d => d.status === 'ok' && +d.weight > 0 && d.quota_total).reduce((s, d) => s + Math.max(0, +d.quota_total * STOP_PCT - (+d.quota_used || 0)), 0);
  return { usable_bytes: Math.floor(usable), clip_bytes: clipBytes, clips: Math.floor(usable / clipBytes) };
}
const GB = 1073741824, WARN_PCT = 0.8, CRIT_PCT = 0.9, POOL_MIN_FREE = 10 * GB, MAIL_GAP = 86400e3, HEALTH_STALE = 6 * 3600e3, NET_TRIES = 3, UP_FAIL_CRIT = 3;
const enc = new TextEncoder();
const json = (req, status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req), ...extra } });

// ---------- mã hoá / ký ----------
const b64 = u8 => btoa(String.fromCharCode(...new Uint8Array(u8)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64u = u8 => b64(u8).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => unb64(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
const hex = u8 => [...new Uint8Array(u8)].map(x => x.toString(16).padStart(2, '0')).join('');
export const sha256Hex = async s => hex(await crypto.subtle.digest('SHA-256', typeof s === 'string' ? enc.encode(s) : s));
/** Khoá 32 byte từ DRIVE_ENC_KEY (base64) – null nếu thiếu/sai độ dài. */
function rawKey(env) { try { const k = unb64(String(env.DRIVE_ENC_KEY || '').trim()); return k.length === 32 ? k : null; } catch (e) { return null; } }
const hmacKey = (raw, label) => crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']).then(k => ({ sign: async m => new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(label + '|' + m))) }));
/** So sánh thời gian hằng. */
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }

/** state OAuth: base64url({e: email quản trị, n: nonce, x: hạn}) + "." + HMAC (khoá DRIVE_ENC_KEY, nhãn 'state'). */
export async function signState(env, email, now = Date.now(), reconnect = 0) {
  const raw = rawKey(env); if (!raw) throw new Error('no-key');
  const n = b64u(crypto.getRandomValues(new Uint8Array(16)));
  const body = b64u(enc.encode(JSON.stringify({ e: String(email).toLowerCase(), n, x: Math.floor(now / 1000) + STATE_TTL, ...(reconnect ? { r: +reconnect } : {}) })));
  return { state: body + '.' + b64u(await (await hmacKey(raw, 'state')).sign(body)), nonce: n };
}
/** → {e, n} nếu chữ ký đúng + còn hạn, ngược lại null. */
export async function verifyState(env, state, now = Date.now()) {
  const raw = rawKey(env); if (!raw || typeof state !== 'string') return null;
  const [body, sig] = state.split('.'); if (!body || !sig) return null;
  if (!same(sig, b64u(await (await hmacKey(raw, 'state')).sign(body)))) return null;
  let p; try { p = JSON.parse(new TextDecoder().decode(unb64u(body))); } catch (e) { return null; }
  if (!p || typeof p.x !== 'number' || p.x < Math.floor(now / 1000) || !p.e || !p.n) return null;
  return { e: p.e, n: p.n, r: +p.r || 0 };
}
async function aesKey(env) { const raw = rawKey(env); if (!raw) throw new Error('no-key'); return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
/** AES-GCM (iv 12 byte ngẫu nhiên, AAD = "drive:<email>" – token chép sang dòng khác sẽ không giải được). */
export async function encryptToken(env, token, email, label = 'drive') { // label: 'drive' (Kho Drive) · 'youtube' (functions/api/youtube.js, AAD = kênh)
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode(label + ':' + String(email).toLowerCase()) }, await aesKey(env), enc.encode(token));
  return { enc_token: b64(ct), iv: b64(iv) };
}
export async function decryptToken(env, row, label = 'drive') {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(row.iv), additionalData: enc.encode(label + ':' + String(row.email).toLowerCase()) }, await aesKey(env), unb64(row.enc_token));
  return new TextDecoder().decode(pt);
}
/** Kiểm chữ ký CLI. → true/false. */
export async function cliVerify(env, request, bodyText, now = Date.now()) {
  const key = String(env.LEXKITE_DRIVE_CLI_KEY || ''); if (key.length < 24) return false;
  const ts = request.headers.get('X-Drive-Ts') || '', sig = (request.headers.get('X-Drive-Sig') || '').toLowerCase();
  if (!/^\d{10}$/.test(ts) || Math.abs(now / 1000 - +ts) > CLI_SKEW || !/^[0-9a-f]{64}$/.test(sig)) return false;
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return same(sig, hex(await crypto.subtle.sign('HMAC', k, enc.encode(ts + '.' + await sha256Hex(bodyText)))));
}
/** Link tải ký 5 phút: /api/drive/dl?f=<id file>&x=<hạn>&s=<HMAC> (+ &d=<id Drive> cho file chưa có trong drive_files – trình duyệt Kho Drive). */
export async function signLink(env, fileId, now = Date.now(), driveId = null) {
  const raw = rawKey(env); if (!raw) throw new Error('no-key');
  const x = Math.floor(now / 1000) + LINK_TTL, dd = driveId ? '|' + (+driveId) : '';
  return `/api/drive/dl?f=${encodeURIComponent(fileId)}&x=${x}${dd ? '&d=' + (+driveId) : ''}&s=${b64u(await (await hmacKey(raw, 'dl')).sign(fileId + '|' + x + dd))}`;
}
export async function verifyLink(env, f, x, s, now = Date.now(), d = '') {
  const raw = rawKey(env); if (!raw || !f || !s || !/^\d+$/.test(String(x)) || +x < Math.floor(now / 1000) || (d && !/^\d{1,9}$/.test(String(d)))) return false;
  return same(String(s), b64u(await (await hmacKey(raw, 'dl')).sign(f + '|' + x + (d ? '|' + d : ''))));
}
/** Link ảnh thu nhỏ ký (proxy /api/drive/thumb): hạn làm tròn theo giờ → cùng URL trong 1 giờ (trình duyệt cache được). v = phiên bản (modifiedTime). */
export async function signThumb(env, driveId, fileId, v, now = Date.now()) {
  const raw = rawKey(env); if (!raw) throw new Error('no-key');
  const x = (Math.floor(now / 3600e3) + 7) * 3600, m = `${+driveId}|${fileId}|${v}|${x}`;
  return `/api/drive/thumb?d=${+driveId}&f=${encodeURIComponent(fileId)}&v=${encodeURIComponent(v)}&x=${x}&s=${b64u(await (await hmacKey(raw, 'th')).sign(m))}`;
}
export async function verifyThumb(env, p, now = Date.now()) {
  const raw = rawKey(env); if (!raw || !/^\d{1,9}$/.test(p.d) || !/^[A-Za-z0-9_-]{10,120}$/.test(p.f) || !/^[0-9a-z]{1,16}$/.test(p.v) || !/^\d+$/.test(p.x) || +p.x < Math.floor(now / 1000) || !p.s) return false;
  return same(String(p.s), b64u(await (await hmacKey(raw, 'th')).sign(`${p.d}|${p.f}|${p.v}|${p.x}`)));
}

// ---------- chọn Drive ----------
/** Chừa trống: ≥ 5 % dung lượng và ≥ 256 MB. */
export const headroom = total => Math.max(Math.floor((+total || 0) * 0.05), HEADROOM_MIN);
/** Tỉ lệ đã dùng (đã tính trọng số): ratio × 100/weight – Drive trọng số thấp trông "đầy hơn". Không giới hạn dung lượng = 0. */
const loadScore = r => ((r.quota_total == null ? 0 : (+r.quota_used || 0) / +r.quota_total) + 0.001) * 100 / +r.weight;
/**
 * Chia đều để giảm rủi ro: chọn Drive có TỈ LỆ đã dùng thấp nhất (used/total, chia theo trọng số), bằng nhau (±0,1 %) thì xoay vòng theo `rot`.
 * Loại: không 'ok', trọng số 0, ≥ 90 % (nghiêm trọng), không đủ chỗ sau khi chừa trống (≥ 5 % / 256 MB), Drive trong `exclude` (đã giữ bản sao).
 */
export function pickDrive(rows, size, { exclude = [], rot = 0 } = {}) {
  const ex = new Set(exclude.map(Number)), c = [];
  for (const r of rows) {
    if (r.status !== 'ok' || !(+r.weight > 0) || ex.has(+r.id)) continue;
    if (r.quota_total != null) { const t = +r.quota_total, u = +r.quota_used || 0; if (!(t > 0) || u / t >= CRIT_PCT || t - u - headroom(t) < size) continue; }
    c.push({ r, s: loadScore(r) });
  }
  if (!c.length) return null;
  const best = Math.min(...c.map(x => x.s)), tied = c.filter(x => x.s - best < 0.001 * 100 / Math.max(1, ...c.map(y => +y.r.weight)) + 1e-9).sort((a, b) => a.r.id - b.r.id);
  return tied[Math.abs(rot | 0) % tied.length].r;
}
/** Chọn n Drive KHÁC NHAU cho n bản sao. */
export function pickDrives(rows, size, n, { exclude = [], rot = 0 } = {}) {
  const out = [], ex = [...exclude];
  for (let i = 0; i < n; i++) { const d = pickDrive(rows, size, { exclude: ex, rot: rot + i }); if (!d) break; out.push(d); ex.push(d.id); }
  return out;
}
/** Lớp bản sao: 'original' (bản gốc: DNA, clip gốc, phòng… – 2 bản trên 2 Drive) · 'render' (bản dựng/tạm – 1 bản). */
export const clsOf = (cls, folder) => (cls === 'render' || cls === 'original' ? cls : /^(stacked|renders?|tmp|temp|out)(\/|$)/i.test(String(folder || '')) ? 'render' : 'original');
export const replicasFor = (cls, want) => { const n = Math.round(+want); return n >= 1 && n <= 3 ? n : cls === 'render' ? 1 : 2; };

// ---------- D1 ----------
let ready = false;
async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS drives (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL, enc_token TEXT NOT NULL, iv TEXT NOT NULL, quota_total INTEGER, quota_used INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT \'ok\', weight INTEGER NOT NULL DEFAULT 100, created INTEGER NOT NULL, last_ok INTEGER, err TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS drive_files (id INTEGER PRIMARY KEY AUTOINCREMENT, drive_id INTEGER NOT NULL, file_id TEXT, sha256 TEXT NOT NULL, name TEXT, folder TEXT, mime TEXT, size INTEGER, status TEXT NOT NULL, created INTEGER NOT NULL, done INTEGER)'),
    db.prepare('CREATE INDEX IF NOT EXISTS drive_files_sha ON drive_files (sha256)'),
    db.prepare('CREATE TABLE IF NOT EXISTS drive_folders (drive_id INTEGER NOT NULL, path TEXT NOT NULL, folder_id TEXT NOT NULL, PRIMARY KEY (drive_id, path)) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS drive_nonce (n TEXT PRIMARY KEY, at INTEGER NOT NULL) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS admin_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, email TEXT, op TEXT, ok INTEGER, ip TEXT, country TEXT)'),
    db.prepare('CREATE TABLE IF NOT EXISTS drive_refs (src TEXT NOT NULL, sha TEXT, file_id TEXT, name TEXT, status TEXT, at INTEGER NOT NULL)'),
    db.prepare('CREATE TABLE IF NOT EXISTS drive_alerts (kind TEXT PRIMARY KEY, level TEXT NOT NULL, drive_id INTEGER, msg TEXT, since INTEGER NOT NULL, seen INTEGER NOT NULL, mailed INTEGER) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS drive_meta (k TEXT PRIMARY KEY, v TEXT) WITHOUT ROWID'),
  ]);
  // cột mới cho bảng drives đã có (bỏ qua lỗi "duplicate column")
  await db.prepare('CREATE TABLE IF NOT EXISTS drive_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, who TEXT, act TEXT NOT NULL, drive_id INTEGER, email TEXT, file_id TEXT, name TEXT, sha256 TEXT, size INTEGER, ok INTEGER NOT NULL DEFAULT 1, note TEXT)').run();
  for (const c of ['want INTEGER', 'cls TEXT', 'email TEXT', 'web TEXT', 'by_who TEXT', 'asset_id TEXT']) { try { await db.prepare('ALTER TABLE drive_files ADD COLUMN ' + c).run(); } catch (e) { /* đã có */ } }
  for (const c of ['fails INTEGER NOT NULL DEFAULT 0', 'up_fails INTEGER NOT NULL DEFAULT 0', 'auto_weight INTEGER', 'checked INTEGER']) { try { await db.prepare('ALTER TABLE drives ADD COLUMN ' + c).run(); } catch (e) { /* đã có */ } }
  ready = true;
}
const one = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).first()) || null;
const all = async (db, sql, ...a) => (await db.prepare(sql).bind(...a).all()).results || [];
const run = (db, sql, ...a) => db.prepare(sql).bind(...a).run();

// ---------- Google ----------
const TOK = new Map(); // id Drive → {t, exp} (chỉ bộ nhớ isolate, < 50 phút)
export const _tokenCache = TOK;
class DriveErr extends Error { constructor(code, status = 502) { super(code); this.code = code; this.status = status; } }
async function gfetch(url, init) {
  const r = await fetch(url, init).catch(() => null);
  if (!r) throw new DriveErr('google-network');
  return r;
}
async function accessToken(env, db, row) {
  const c = TOK.get(row.id); if (c && c.exp > Date.now()) return c.t;
  const refresh = await decryptToken(env, row);
  const r = await gfetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.GOOGLE_DRIVE_CLIENT_ID, client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET, refresh_token: refresh, grant_type: 'refresh_token' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    if (j.error === 'invalid_grant') { await run(db, "UPDATE drives SET status = 'disconnected', err = ? WHERE id = ?", 'Google thu hồi quyền / token hết hạn – bấm Kết nối lại', row.id); throw new DriveErr('drive-revoked', 409); }
    throw new DriveErr('google-token');
  }
  TOK.set(row.id, { t: j.access_token, exp: Date.now() + Math.min((+j.expires_in || 3600) - 60, 50 * 60) * 1000 });
  return j.access_token;
}
async function about(at) {
  const r = await gfetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota,user(emailAddress)', { headers: { Authorization: 'Bearer ' + at } });
  if (!r.ok) throw new DriveErr('google-about');
  const j = await r.json(), q = j.storageQuota || {};
  return { email: j.user && j.user.emailAddress, total: q.limit != null ? +q.limit : null, used: +q.usage || 0 };
}
const qstr = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
async function ensureFolder(db, at, driveId, folder) {
  const parts = [ROOT_FOLDER, ...String(folder || '').split('/').filter(Boolean)];
  let parent = 'root', pth = '';
  for (const name of parts) {
    pth = pth ? pth + '/' + name : name;
    const known = await one(db, 'SELECT folder_id FROM drive_folders WHERE drive_id = ? AND path = ?', driveId, pth);
    if (known) { parent = known.folder_id; continue; }
    const q = `name = '${qstr(name)}' and mimeType = 'application/vnd.google-apps.folder' and '${qstr(parent)}' in parents and trashed = false`;
    const l = await gfetch('https://www.googleapis.com/drive/v3/files?fields=files(id)&pageSize=1&q=' + encodeURIComponent(q), { headers: { Authorization: 'Bearer ' + at } });
    let id = l.ok ? (((await l.json()).files || [])[0] || {}).id : null;
    if (!id) {
      const c = await gfetch('https://www.googleapis.com/drive/v3/files?fields=id', { method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parent], appProperties: { lexkite: 'library' } }) });
      if (!c.ok) throw new DriveErr('google-folder');
      id = (await c.json()).id;
    }
    await run(db, 'INSERT OR REPLACE INTO drive_folders (drive_id, path, folder_id) VALUES (?, ?, ?)', driveId, pth, id);
    parent = id;
  }
  return parent;
}
const config = env => ({ client: !!env.GOOGLE_DRIVE_CLIENT_ID, secret: !!env.GOOGLE_DRIVE_CLIENT_SECRET, key: !!rawKey(env), cli: String(env.LEXKITE_DRIVE_CLI_KEY || '').length >= 24 });
const ready4 = env => { const c = config(env); return c.client && c.secret && c.key; };
const lost = st => st === 'disconnected' || st === 'revoked'; // 'revoked' = tên cũ
const pub = r => ({ id: r.id, email: r.email, quota_total: r.quota_total, quota_used: r.quota_used, status: lost(r.status) ? 'disconnected' : r.status, weight: r.weight, auto_paused: r.auto_weight != null, created: r.created, last_ok: r.last_ok, checked: r.checked || null, err: r.err || null, files: r.files || 0, bytes: r.bytes || 0, up_fails: r.up_fails || 0 });
const cookieOf = (req, k) => { const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + k + '=([^;]+)')); return m ? m[1] : ''; };

// ---------- sức khoẻ + cảnh báo chủ động (docs/ASSET-LIBRARY.md §8.6.2) ----------
// Kiểm: GitHub Actions hằng ngày (health.yml → library.mjs drive-health, CLI HMAC) + lười khi admin mở trang (op alerts, > 6 h chưa kiểm).
// Ngưỡng: 80 % cảnh báo · 90 % nghiêm trọng + tự ngừng nhận file (weight 0, nhớ auto_weight; < 90 % tự trả lại) · pool còn < 10 GB cảnh báo ·
// mất kết nối (invalid_grant) / Google không phản hồi 3 lần liên tiếp / tải lên lỗi 3 lần liên tiếp → nghiêm trọng.
// Thư (lexkite-mail → REPORT_NOTIFY_EMAIL): chỉ mức nghiêm trọng, ≤ 1 thư/loại/24 h; hết lỗi → thư "đã khôi phục".
const pctOf = r => (r.quota_total ? (+r.quota_used || 0) / +r.quota_total : 0);
/** Danh sách cảnh báo từ trạng thái các Drive (thuần). → [{kind, level: 'warn'|'crit', t, drive_id, p, msg}] */
export function evalAlerts(rows, { single = 0 } = {}) {
  const out = [], A = (kind, level, t, r, p, msg) => out.push({ kind, level, t, drive_id: r ? r.id : null, p: { email: r ? r.email : undefined, ...p }, msg });
  let free = 0, counted = 0;
  for (const r of rows) {
    if (lost(r.status)) { A('conn:' + r.id, 'crit', 'conn', r, {}, `Drive ${r.email} mất kết nối (Google thu hồi quyền / token hết hạn) – vào Quản trị → Kho Drive bấm "Kết nối lại".`); continue; }
    if ((+r.fails || 0) >= NET_TRIES) A('net:' + r.id, 'crit', 'net', r, { n: +r.fails }, `Drive ${r.email}: Google không phản hồi ${+r.fails} lần liên tiếp.`);
    if ((+r.up_fails || 0) >= UP_FAIL_CRIT) A('upload:' + r.id, 'crit', 'upload', r, { n: +r.up_fails }, `Drive ${r.email}: tải lên lỗi ${+r.up_fails} lần liên tiếp.`);
    const pc = pctOf(r), pct = Math.round(pc * 100);
    if (pc >= CRIT_PCT) A('quota:' + r.id, 'crit', 'quota', r, { pct }, `Drive ${r.email} đã dùng ${pct}% – đã ngừng nhận file mới, file mới tự chuyển sang Drive khác.`);
    else if (pc >= WARN_PCT) A('quota:' + r.id, 'warn', 'quota', r, { pct }, `Drive ${r.email} đã dùng ${pct}% – sắp đầy.`);
    if (r.status === 'ok') { counted++; free += r.quota_total == null ? Infinity : Math.max(0, +r.quota_total - (+r.quota_used || 0)); }
  }
  if (single > 0) A('replica', 'warn', 'replica', null, { n: single }, `${single} file chỉ còn 1 bản sao trên Kho Drive – bấm "Sửa bản sao".`);
  if (counted && free < POOL_MIN_FREE) A('pool', 'warn', 'pool', null, { gb: +(free / GB).toFixed(1) }, `Toàn Kho Drive chỉ còn ${(free / GB).toFixed(1)} GB trống – nối thêm Drive.`);
  return out;
}
async function sendMail(env, subject, text) {
  if (!env.MAIL) return false;
  const to = String(env.REPORT_NOTIFY_EMAIL || '').trim();
  const r = await env.MAIL.fetch('https://mail/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ subject, text: text + '\n\nhttps://lexkite.com/admin.html#drive', ...(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(to) ? { to } : {}) }) }).catch(() => null);
  return !!(r && r.ok);
}
const meta = async (db, k) => ((await one(db, 'SELECT v FROM drive_meta WHERE k = ?', k)) || {}).v;
const setMeta = (db, k, v) => run(db, 'INSERT OR REPLACE INTO drive_meta (k, v) VALUES (?, ?)', k, String(v));
/** Ghi cảnh báo vào D1 + gửi thư (nghiêm trọng: ≤ 1 thư/loại/24 h; hết lỗi đã từng gửi thư → thư khôi phục). → danh sách thư đã gửi. */
export async function syncAlerts(env, db, list, now = Date.now()) {
  const prev = new Map((await all(db, 'SELECT * FROM drive_alerts')).filter(a => a.kind !== 'footage').map(a => [a.kind, a])), sent = []; // 'footage' do footage-verify.yml đặt/gỡ (op footage_alert), health không đụng
  for (const a of list) {
    const p = prev.get(a.kind); prev.delete(a.kind);
    let mailed = p ? p.mailed : null;
    if (a.level === 'crit') {
      const last = +(await meta(db, 'mail:' + a.kind)) || 0;
      if (!mailed && now - last >= MAIL_GAP && await sendMail(env, `[Lexkite] ⛔ Kho Drive: ${a.msg.slice(0, 90)}`, a.msg)) { mailed = now; sent.push(a.kind); await setMeta(db, 'mail:' + a.kind, now); }
    }
    await run(db, 'INSERT INTO drive_alerts (kind, level, drive_id, msg, since, seen, mailed) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(kind) DO UPDATE SET level = excluded.level, drive_id = excluded.drive_id, msg = excluded.msg, seen = excluded.seen, mailed = excluded.mailed',
      a.kind, a.level, a.drive_id, JSON.stringify({ t: a.t, p: a.p, msg: a.msg }), p ? p.since : now, now, mailed);
  }
  for (const p of prev.values()) { // đã hết lỗi
    if (p.mailed) { let m = ''; try { m = JSON.parse(p.msg).msg; } catch (e) { m = ''; } if (await sendMail(env, `[Lexkite] ✅ Kho Drive đã khôi phục: ${p.kind}`, `Đã hết lỗi: ${m}`)) sent.push('ok:' + p.kind); }
    await run(db, 'DELETE FROM drive_alerts WHERE kind = ?', p.kind);
  }
  return sent;
}
const refreshAlerts = async (env, db, now = Date.now()) => { const rows = await all(db, 'SELECT * FROM drives ORDER BY id'); return syncAlerts(env, db, evalAlerts(rows, { single: (await replicaState(db, rows)).single.length }), now); };
/** Kiểm sức khoẻ mọi Drive: làm mới quota + thử refresh token (thử lại tối đa 3 lần), tự ngừng/nhận lại file theo ngưỡng 90 %, rồi đồng bộ cảnh báo. */
export async function runHealth(env, db, { now = Date.now(), wait = 400 } = {}) {
  const rows = await all(db, 'SELECT * FROM drives ORDER BY id'), res = [];
  for (const r of rows) {
    if (lost(r.status)) { res.push({ id: r.id, ok: false, state: 'disconnected' }); continue; }
    let a = null, err = null;
    for (let i = 0; i < NET_TRIES && !a; i++) {
      try { a = await about(await accessToken(env, db, r)); }
      catch (e) { err = e; if (e.code === 'drive-revoked') break; TOK.delete(r.id); r.fails = (+r.fails || 0) + 1; if (wait && i < NET_TRIES - 1) await new Promise(y => setTimeout(y, wait * (i + 1))); }
    }
    if (a) { Object.assign(r, { quota_total: a.total, quota_used: a.used, fails: 0 }); await run(db, 'UPDATE drives SET quota_total = ?, quota_used = ?, fails = 0, last_ok = ?, checked = ?, err = NULL WHERE id = ?', a.total, a.used, now, now, r.id); }
    else if (err && err.code === 'drive-revoked') { r.status = 'disconnected'; await run(db, 'UPDATE drives SET checked = ? WHERE id = ?', now, r.id); }
    else await run(db, 'UPDATE drives SET fails = ?, checked = ?, err = ? WHERE id = ?', r.fails, now, `Google không phản hồi (${r.fails} lần liên tiếp)`, r.id);
    if (!lost(r.status) && r.quota_total) { // tự loại Drive ≥ 90 % khỏi luồng nhận file; < 90 % → trả lại trọng số cũ
      if (pctOf(r) >= CRIT_PCT && r.auto_weight == null && +r.weight > 0) { await run(db, 'UPDATE drives SET auto_weight = weight, weight = 0 WHERE id = ?', r.id); r.auto_weight = r.weight; r.weight = 0; }
      else if (pctOf(r) < CRIT_PCT && r.auto_weight != null) { await run(db, 'UPDATE drives SET weight = auto_weight, auto_weight = NULL WHERE id = ?', r.id); r.weight = r.auto_weight; r.auto_weight = null; }
    }
    res.push({ id: r.id, ok: !!a, state: r.status, pct: Math.round(pctOf(r) * 100), fails: +r.fails || 0, paused: r.auto_weight != null });
  }
  const rs = await replicaState(db, rows), alerts = evalAlerts(rows, { single: rs.single.length }), mailed = await syncAlerts(env, db, alerts, now);
  await setMeta(db, 'health_at', now);
  return { checked: now, drives: res, under_replicated: rs.under.length, single: rs.single.length, lost_only: rs.lost_only.length, alerts: alerts.map(({ kind, level, t, drive_id, p }) => ({ kind, level, t, drive_id, p })), mailed };
}
async function alertRows(db) {
  return (await all(db, 'SELECT * FROM drive_alerts ORDER BY level, kind')).map(a => { let m = {}; try { m = JSON.parse(a.msg); } catch (e) { m = {}; } return { kind: a.kind, level: a.level, t: m.t, drive_id: a.drive_id, p: m.p || {}, since: a.since, mailed: !!a.mailed }; });
}
const bumpUpFail = async (env, db, id) => { await run(db, 'UPDATE drives SET up_fails = COALESCE(up_fails, 0) + 1 WHERE id = ?', id); const r = await one(db, 'SELECT up_fails FROM drives WHERE id = ?', id); if (r && +r.up_fails === UP_FAIL_CRIT) await refreshAlerts(env, db); };

// ---------- bản sao + tra soát (docs/ASSET-LIBRARY.md §8.6.3–8.6.4) ----------
/** Che một phần email cho log/CLI/manifest: mydrive@gmail.com → my***e@gmail.com (admin vẫn thấy đầy đủ). */
export function maskEmail(e) {
  const m = String(e || '').match(/^([^@]+)@(.+)$/); if (!m) return '';
  const u = m[1]; return (u.length <= 2 ? u[0] + '*' : u.slice(0, 2) + '***' + u.slice(-1)) + '@' + m[2];
}
/** Nhật ký thao tác file Kho Drive (drive_audit): ai · khi nào · file nào · Drive nào. */
export async function logAudit(db, { who, act, d, drive_id, email, file_id, name, sha256, size, ok = 1, note }) {
  try { await run(db, 'INSERT INTO drive_audit (at, who, act, drive_id, email, file_id, name, sha256, size, ok, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', Date.now(), String(who || '').slice(0, 120), act, d ? d.id : drive_id ?? null, d ? d.email : email ?? null, file_id || null, name ? String(name).slice(0, 200) : null, sha256 || null, size == null ? null : +size, ok ? 1 : 0, note ? String(note).slice(0, 200) : null); } catch (e) { /* nhật ký không được làm hỏng thao tác */ }
}
const wantOf = r => r.want || replicasFor(clsOf(r.cls, r.folder));
/** Bản sao còn dùng được của 1 sha (file 'ok' trên Drive chưa mất kết nối). */
async function healthyCopies(db, drives, sha) {
  const bad = new Set(drives.filter(d => lost(d.status)).map(d => d.id));
  return (await all(db, "SELECT * FROM drive_files WHERE sha256 = ? AND status = 'ok' ORDER BY id", sha)).filter(r => !bad.has(r.drive_id));
}
async function copiesFor(db, fileIds) {
  const out = new Map(); if (!fileIds.length) return out;
  const rows = await all(db, `SELECT f.file_id, f.sha256, f.want, f.cls, f.folder, f.asset_id, (SELECT COUNT(*) FROM drive_files g JOIN drives d ON d.id = g.drive_id WHERE g.sha256 = f.sha256 AND g.status = 'ok' AND d.status NOT IN ('revoked', 'disconnected')) AS copies FROM drive_files f WHERE f.file_id IN (${fileIds.map(() => '?').join(',')})`, ...fileIds);
  for (const r of rows) out.set(r.file_id, { copies: r.copies, want: wantOf(r), asset: r.asset_id || null, sha: r.sha256 });
  return out;
}
/** Tình trạng bản sao toàn kho: under (thiếu so với want) · single (want ≥ 2 nhưng chỉ còn 1) · lost_only (mọi bản nằm trên Drive mất kết nối). */
export async function replicaState(db, drives) {
  const bad = new Set(drives.filter(d => lost(d.status)).map(d => d.id)), by = new Map();
  for (const r of await all(db, "SELECT * FROM drive_files WHERE status = 'ok'")) {
    const g = by.get(r.sha256) || by.set(r.sha256, { sha: r.sha256, name: r.name, asset: r.asset_id || null, size: +r.size || 0, want: 1, ok: [], dead: [] }).get(r.sha256);
    g.want = Math.max(g.want, wantOf(r)); (bad.has(r.drive_id) ? g.dead : g.ok).push(r);
  }
  const under = [], single = [], lost_only = [];
  for (const g of by.values()) {
    if (!g.ok.length) { lost_only.push(g); continue; }
    if (g.ok.length < g.want) under.push(g);
    if (g.want >= 2 && g.ok.length === 1) single.push(g);
  }
  return { under, single, lost_only };
}
const brief = g => ({ sha: g.sha, name: g.name, asset: g.asset, size: g.size, copies: g.ok.length, want: g.want, drives: g.ok.map(r => r.drive_id) });
/** Chép 1 file giữa 2 Drive (stream qua Worker, không đệm cả file): tạo phiên resumable ở Drive đích → PUT luồng alt=media của Drive nguồn. Kiểm md5 + kích thước. */
async function copyAcross(env, db, src, dst, row, who, act) {
  const sat = await accessToken(env, db, src), dat = await accessToken(env, db, dst), parent = await ensureFolder(db, dat, dst.id, row.folder || '');
  const sess = await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,size,md5Checksum,webViewLink', {
    method: 'POST', headers: { Authorization: 'Bearer ' + dat, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': row.mime || 'application/octet-stream', 'X-Upload-Content-Length': String(row.size) },
    body: JSON.stringify({ name: row.name, mimeType: row.mime || 'application/octet-stream', parents: [parent], appProperties: { lexkite: 'library', sha256: row.sha256, cls: row.cls || clsOf(null, row.folder) } }),
  });
  const loc = sess.headers.get('Location');
  if (!sess.ok || !/^https:\/\/www\.googleapis\.com\/upload\//.test(loc || '')) throw new DriveErr('google-upload-start');
  const meta = await (await gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(row.file_id)}?fields=md5Checksum,size`, { headers: { Authorization: 'Bearer ' + sat } })).json().catch(() => ({}));
  const g = await gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(row.file_id)}?alt=media`, { headers: { Authorization: 'Bearer ' + sat } });
  if (!g.ok || !g.body) throw new DriveErr('google-download');
  let body = g.body;
  if (typeof FixedLengthStream === 'function') { const fl = new FixedLengthStream(+row.size); g.body.pipeTo(fl.writable).catch(() => {}); body = fl.readable; } // eslint-disable-line no-undef
  const put = await gfetch(loc, { method: 'PUT', headers: { 'Content-Length': String(row.size), 'Content-Type': row.mime || 'application/octet-stream' }, body, duplex: 'half' });
  const j = put.ok ? await put.json().catch(() => ({})) : {};
  if (!j.id || +j.size !== +row.size || (meta.md5Checksum && j.md5Checksum && meta.md5Checksum !== j.md5Checksum)) throw new DriveErr('copy-mismatch');
  const now = Date.now(), web = /^https:\/\/(drive|docs)\.google\.com\//.test(j.webViewLink || '') ? j.webViewLink : null;
  await db.batch([
    db.prepare("INSERT INTO drive_files (drive_id, file_id, sha256, name, folder, mime, size, status, created, done, want, cls, email, web, by_who, asset_id) VALUES (?, ?, ?, ?, ?, ?, ?, 'ok', ?, ?, ?, ?, ?, ?, ?, ?)").bind(dst.id, j.id, row.sha256, row.name, row.folder || '', row.mime, +row.size, now, now, wantOf(row), row.cls || clsOf(null, row.folder), dst.email, web, who, row.asset_id || null),
    db.prepare('UPDATE drives SET quota_used = COALESCE(quota_used, 0) + ? WHERE id = ?').bind(+row.size, dst.id),
  ]);
  dst.quota_used = (+dst.quota_used || 0) + +row.size;
  await logAudit(db, { who, act, d: dst, file_id: j.id, name: row.name, sha256: row.sha256, size: row.size, note: `từ Drive #${src.id} (${row.file_id})` });
  return { file_id: j.id, drive_id: dst.id };
}
/**
 * Kế hoạch cân bằng (thuần): chuyển file từ Drive tỉ lệ cao nhất sang Drive thấp nhất cho tới khi chênh ≤ spread.
 * drives: [{id, status, weight, quota_total, quota_used}] · files: drive_files 'ok' [{drive_id, file_id, sha256, size, name}]
 */
export function planRebalance(drives, files, { spread = 0.1, max = 50 } = {}) {
  const ds = drives.filter(d => d.status === 'ok' && +d.weight > 0 && d.quota_total).map(d => ({ ...d, quota_used: +d.quota_used || 0 }));
  const where = new Map(); for (const f of files) (where.get(f.sha256) || where.set(f.sha256, new Set()).get(f.sha256)).add(f.drive_id);
  const ratio = d => d.quota_used / +d.quota_total, plan = [], used = new Set(), before = Object.fromEntries(ds.map(d => [d.id, +ratio(d).toFixed(4)]));
  while (plan.length < max && ds.length > 1) {
    ds.sort((a, b) => ratio(b) - ratio(a));
    const hi = ds[0], lo = ds[ds.length - 1], gap = ratio(hi) - ratio(lo);
    if (gap <= spread) break;
    const room = Math.min((hi.quota_used / +hi.quota_total - lo.quota_used / +lo.quota_total) / (1 / +hi.quota_total + 1 / +lo.quota_total), +lo.quota_total - lo.quota_used - headroom(lo.quota_total));
    const cand = files.filter(f => f.drive_id === hi.id && !used.has(f.file_id) && !where.get(f.sha256).has(lo.id) && +f.size > 0 && +f.size <= room).sort((a, b) => b.size - a.size)[0];
    if (!cand) break;
    used.add(cand.file_id); where.get(cand.sha256).add(lo.id);
    hi.quota_used -= +cand.size; lo.quota_used += +cand.size;
    plan.push({ file_id: cand.file_id, sha: cand.sha256, name: cand.name, size: +cand.size, from: hi.id, to: lo.id });
  }
  return { plan, before, after: Object.fromEntries(ds.map(d => [d.id, +ratio(d).toFixed(4)])), bytes: plan.reduce((s, x) => s + x.size, 0) };
}
/** Sổ kho: lọc + sắp xếp + phân trang drive_files (máy chủ). f: q, drive_id, email, type (image|clip|render|other), folder, lib (approved|reserve|reject), copies ('1'|'2+'), gstate (ok|trashed|gone|pending), from, to (ms), min, max (byte), sort (name|size|date|copies|drive), dir, limit, offset */
export function ledgerQuery(f = {}) {
  const w = ["f.status != 'pending'"], a = [];
  const like = s => '%' + String(s).replace(/[\\%_]/g, m => '\\' + m) + '%';
  if (f.gstate && /^(ok|trashed|gone|pending)$/.test(f.gstate)) { w[0] = 'f.status = ?'; a.push(f.gstate); }
  // D1 giới hạn mẫu LIKE ≤ 50 byte → sha256 đủ 64 ký tự so khớp chính xác, chuỗi khác cắt còn 46 ký tự
  if (f.q && /^[0-9a-f]{64}$/i.test(String(f.q).trim())) { w.push('f.sha256 = ?'); a.push(String(f.q).trim().toLowerCase()); }
  else if (f.q) { const q = like(String(f.q).trim().slice(0, 46)); w.push("(f.name LIKE ? ESCAPE '\\' OR f.asset_id LIKE ? ESCAPE '\\' OR f.file_id LIKE ? ESCAPE '\\' OR f.sha256 LIKE ? ESCAPE '\\')"); a.push(q, q, q, q.toLowerCase()); }
  if (f.drive_id) { w.push('f.drive_id = ?'); a.push(+f.drive_id); }
  if (f.email) { w.push('LOWER(COALESCE(f.email, d.email)) = ?'); a.push(String(f.email).toLowerCase()); }
  if (f.type === 'image') w.push("f.mime LIKE 'image/%'");
  else if (f.type === 'clip') w.push("f.mime LIKE 'video/%' AND COALESCE(f.cls, '') != 'render'");
  else if (f.type === 'render') w.push("f.cls = 'render'");
  else if (f.type === 'other') w.push("f.mime NOT LIKE 'image/%' AND f.mime NOT LIKE 'video/%' AND COALESCE(f.cls, '') != 'render'");
  if (f.folder) { w.push("(f.folder = ? OR f.folder LIKE ? ESCAPE '\\')"); a.push(String(f.folder), String(f.folder).replace(/[\\%_]/g, m => '\\' + m) + '/%'); }
  if (f.lib && /^(approved|reserve|reject)$/.test(f.lib)) { w.push("EXISTS (SELECT 1 FROM drive_refs r WHERE r.src = 'library' AND r.sha = f.sha256 AND r.status = ?)"); a.push(f.lib); }
  const COPIES = "(SELECT COUNT(*) FROM drive_files g JOIN drives gd ON gd.id = g.drive_id WHERE g.sha256 = f.sha256 AND g.status = 'ok' AND gd.status NOT IN ('revoked', 'disconnected'))";
  if (f.copies === '1') w.push(COPIES + ' <= 1'); else if (f.copies === '2+') w.push(COPIES + ' >= 2');
  const dt = 'COALESCE(f.done, f.created)';
  if (+f.from > 0) { w.push(dt + ' >= ?'); a.push(+f.from); }
  if (+f.to > 0) { w.push(dt + ' <= ?'); a.push(+f.to); }
  if (+f.min > 0) { w.push('f.size >= ?'); a.push(+f.min); }
  if (+f.max > 0) { w.push('f.size <= ?'); a.push(+f.max); }
  const SORT = { name: 'f.name', size: 'f.size', date: dt, copies: 'copies', drive: 'f.drive_id' }, col = SORT[f.sort] || dt, dir = f.dir === 'asc' ? 'ASC' : 'DESC';
  const lim = Math.min(Math.max(1, Math.floor(+f.limit) || 50), 10000), off = Math.min(1e7, Math.max(0, Math.floor(+f.offset) || 0)); // số nguyên hữu hạn (nối vào SQL)
  const from = `FROM drive_files f JOIN drives d ON d.id = f.drive_id WHERE ${w.join(' AND ')}`;
  return {
    sql: `SELECT f.id, f.drive_id, COALESCE(f.email, d.email) AS email, f.file_id, f.sha256, f.name, f.folder, f.mime, f.size, f.status, f.cls, f.want, f.web, f.by_who, f.asset_id, ${dt} AS at, ${COPIES} AS copies, (SELECT r.status FROM drive_refs r WHERE r.src = 'library' AND r.sha = f.sha256 LIMIT 1) AS lib ${from} ORDER BY ${col} ${dir}, f.id ${dir} LIMIT ${lim} OFFSET ${off}`,
    count: `SELECT COUNT(*) AS n, COALESCE(SUM(f.size), 0) AS bytes ${from}`, args: a,
  };
}
export const LEDGER_COLS = ['file', 'asset', 'drive_email', 'file_id', 'sha256', 'size', 'date', 'folder', 'copies', 'status'];
/** CSV "sổ kho" (RFC 4180, chống chèn công thức bảng tính). */
export function ledgerCsv(rows) {
  const c = v => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return [LEDGER_COLS.join(','), ...rows.map(r => [r.name, r.asset_id, r.email, r.file_id, r.sha256, r.size, r.at ? new Date(+r.at).toISOString() : '', r.folder, r.copies, r.status].map(c).join(','))].join('\r\n') + '\r\n';
}
const pubRow = (r, cli) => ({ drive_id: r.drive_id, email: cli ? undefined : r.email, email_masked: maskEmail(r.email), file_id: r.file_id, sha256: r.sha256, name: r.name, folder: r.folder, mime: r.mime, size: r.size, status: r.status, cls: r.cls, want: r.want, copies: r.copies, lib: r.lib || null, web: cli ? undefined : r.web, by: cli ? undefined : r.by_who, asset_id: r.asset_id, at: r.at });

const POOL_OPS = {
  /** Tra cứu: tên file / asset id / sha / file_id (khớp một phần) → mọi bản sao kèm Drive. CLI: email che một phần. */
  async where(db, b, who) {
    const q = String(b.q || '').trim(); if (q.length < 3) return { status: 400, error: 'bad-input' };
    const L = ledgerQuery({ q, gstate: b.gstate, limit: 200, sort: 'name', dir: 'asc' });
    const rows = await all(db, L.sql, ...L.args), cli = who.email === 'cli';
    return { q, copies: rows.map(r => pubRow(r, cli)) };
  },
  /** Sổ kho có bộ lọc (UI + CSV). format:'csv' → toàn bộ kết quả lọc (≤ 10 000 dòng). */
  async ledger(db, b) {
    const f = { ...(b.f || {}) }; if (b.format === 'csv') { f.limit = 10000; f.offset = 0; }
    const L = ledgerQuery(f), rows = await all(db, L.sql, ...L.args), c = await one(db, L.count, ...L.args);
    if (b.format === 'csv') return { csv: ledgerCsv(rows), count: rows.length };
    return { rows: rows.map(r => pubRow(r, false)), total: c ? c.n : 0, bytes: c ? c.bytes : 0 };
  },
  /** Nhật ký drive_audit (lọc: act, drive_id, q = tên/file_id/người). */
  async audit_list(db, b) {
    const w = ['1 = 1'], a = [];
    if (b.act && /^[a-z_]{2,20}$/.test(b.act)) { w.push('act = ?'); a.push(b.act); }
    if (b.drive_id) { w.push('drive_id = ?'); a.push(+b.drive_id); }
    if (b.q) { const q = '%' + String(b.q).slice(0, 100).replace(/[\\%_]/g, m => '\\' + m) + '%'; w.push("(name LIKE ? ESCAPE '\\' OR file_id LIKE ? ESCAPE '\\' OR who LIKE ? ESCAPE '\\' OR sha256 LIKE ? ESCAPE '\\')"); a.push(q, q, q, q); }
    if (+b.before > 0) { w.push('id < ?'); a.push(+b.before); }
    const rows = await all(db, `SELECT * FROM drive_audit WHERE ${w.join(' AND ')} ORDER BY id DESC LIMIT 100`, ...a);
    return { rows, next: rows.length === 100 ? rows[99].id : null };
  },
  /** Kiểm theo lô file trong drive_files còn trên Google không → status ok / trashed / gone (404). Con trỏ: after (id dòng). */
  async verify_files(db, b, who, env) {
    const n = Math.min(Math.max(1, +b.batch || 50), 100), after = Math.max(0, +b.after || 0);
    const rows = await all(db, `SELECT f.id, f.file_id, f.status, f.drive_id FROM drive_files f WHERE f.id > ? AND f.file_id IS NOT NULL AND f.status IN ('ok', 'trashed', 'gone') AND (? = 0 OR f.drive_id = ?) ORDER BY f.id LIMIT ?`, after, +b.drive_id || 0, +b.drive_id || 0, n);
    const drives = new Map((await all(db, 'SELECT * FROM drives')).map(d => [d.id, d])), out = { checked: 0, changed: 0, skipped: 0 };
    for (const r of rows) {
      const d = drives.get(r.drive_id); if (!d || lost(d.status)) { out.skipped++; continue; }
      let st;
      try {
        const at = await accessToken(env, db, d), x = await gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(r.file_id)}?fields=id,trashed`, { headers: { Authorization: 'Bearer ' + at } });
        st = x.status === 404 ? 'gone' : x.ok ? ((await x.json()).trashed ? 'trashed' : 'ok') : null;
      } catch (e) { st = null; }
      if (!st) { out.skipped++; continue; }
      out.checked++; if (st !== r.status) { out.changed++; await run(db, 'UPDATE drive_files SET status = ? WHERE id = ?', st, r.id); }
    }
    return { ...out, next: rows.length === n ? rows[rows.length - 1].id : null };
  },
  /** Báo cáo bản sao: thiếu, chỉ còn 1 bản, chỉ còn trên Drive mất kết nối. */
  async replicas(db) { const s = await replicaState(db, await all(db, 'SELECT * FROM drives')); return { under: s.under.slice(0, 200).map(brief), single: s.single.slice(0, 200).map(brief), lost_only: s.lost_only.slice(0, 200).map(brief), counts: { under: s.under.length, single: s.single.length, lost_only: s.lost_only.length } }; },
  /** Sửa bản sao: chép bù từ bản còn tốt sang Drive khác (tỉ lệ thấp nhất). dry_run:true = chỉ liệt kê. Mỗi lượt ≤ max_files / max_bytes, trả remaining. */
  async repair(db, b, who, env) {
    const drives = await all(db, 'SELECT * FROM drives'), s = await replicaState(db, drives);
    const maxF = Math.min(Math.max(1, +b.max_files || 5), 20), maxB = Math.min(+b.max_bytes || 2 * GB, 4 * GB), plan = [];
    for (const g of s.under) { const holders = (await all(db, "SELECT drive_id FROM drive_files WHERE sha256 = ? AND status IN ('ok', 'pending')", g.sha)).map(r => r.drive_id); const to = pickDrive(drives, g.size, { exclude: holders }); plan.push({ ...brief(g), to: to ? to.id : null }); }
    if (b.dry_run) return { dry_run: true, plan, lost_only: s.lost_only.map(brief), counts: { under: s.under.length, lost_only: s.lost_only.length } };
    const done = [], failed = []; let bytes = 0;
    for (const g of s.under) {
      if (done.length >= maxF || bytes + g.size > maxB) break;
      const src = drives.find(d => d.id === g.ok[0].drive_id), holders = (await all(db, "SELECT drive_id FROM drive_files WHERE sha256 = ? AND status IN ('ok', 'pending')", g.sha)).map(r => r.drive_id);
      const dst = pickDrive(drives, g.size, { exclude: holders });
      if (!dst) { failed.push({ sha: g.sha, name: g.name, error: 'no-drive' }); continue; }
      try { const r = await copyAcross(env, db, src, dst, g.ok[0], who.email === 'cli' ? 'cli' : who.email, 'repair'); done.push({ sha: g.sha, name: g.name, ...r }); bytes += g.size; }
      catch (e) { failed.push({ sha: g.sha, name: g.name, error: e.code || 'error' }); await logAudit(db, { who: who.email, act: 'repair', d: dst, name: g.name, sha256: g.sha, size: g.size, ok: 0, note: e.code || 'error' }); }
    }
    const left = (await replicaState(db, await all(db, 'SELECT * FROM drives'))).under.length;
    return { ok: true, done, failed, bytes, remaining: left, lost_only: s.lost_only.map(brief) };
  },
  /** CLI: link tải ký 5 phút cho 1 master/bìa short (chỉ thư mục shorts/, cls render) – tham chiếu cho shorts-rebuild / yt-upload. */
  async render_link(db, b, who, env) {
    const r = await one(db, "SELECT file_id, cls, folder FROM drive_files WHERE file_id = ? AND status = 'ok'", String(b.file_id || ''));
    if (!r || !(isShortsRow(r) || isFootageRow(r))) return { status: 404, error: 'not-found' };
    return { url: await signLink(env, r.file_id), ttl: LINK_TTL };
  },
  /** CLI (footage-verify.yml): bật/tắt cảnh báo 'footage' hiển thị ở Quản trị → Kho Drive. ok:true → xoá; ok:false → crit với n lỗi. Không gửi thư (workflow đỏ đã báo). */
  async footage_alert(db, b) {
    if (b.ok) { await run(db, "DELETE FROM drive_alerts WHERE kind = 'footage'"); return { ok: true, cleared: true }; }
    const n = Math.max(1, Math.min(1e6, Math.round(+b.n) || 1)), now = Date.now();
    await run(db, "INSERT INTO drive_alerts (kind, level, drive_id, msg, since, seen, mailed) VALUES ('footage', 'crit', NULL, ?, ?, ?, NULL) ON CONFLICT(kind) DO UPDATE SET level = 'crit', msg = excluded.msg, seen = excluded.seen",
      JSON.stringify({ t: 'footage', p: { n }, msg: String(b.msg || 'footage-verify').slice(0, 300) }), now, now);
    return { ok: true, n };
  },
  /** CLI: số bản sao mong muốn cho master short (1 = chưa duyệt/thử, 2 = đã duyệt/đã đăng) → repair chép bù sang Drive khác qua pickDrive. */
  async set_want(db, b) {
    const want = Math.round(+b.want); if (want < 1 || want > 2) return { status: 400, error: 'bad-input' };
    const shas = (Array.isArray(b.sha256) ? b.sha256 : []).map(x => String(x).toLowerCase()).filter(x => /^[0-9a-f]{64}$/.test(x)).slice(0, 200);
    let changed = 0;
    for (let i = 0; i < shas.length; i += 50) {
      const part = shas.slice(i, i + 50);
      const r = await db.prepare(`UPDATE drive_files SET want = ? WHERE sha256 IN (${part.map(() => '?').join(',')}) AND status IN ('ok', 'pending') AND folder LIKE 'shorts/%' AND cls = 'render' AND COALESCE(want, 1) != ?`).bind(want, ...part, want).run();
      changed += (r.meta && r.meta.changes) || 0;
    }
    return { ok: true, want, changed };
  },
  /** CLI: luật giữ 30 ngày – master short chưa duyệt/chưa đăng vào thùng rác Google (mọi bản sao; Google tự xoá hẳn sau 30 ngày), công thức vẫn giữ. */
  async retire(db, b, who, env) {
    const shas = (Array.isArray(b.sha256) ? b.sha256 : []).map(x => String(x).toLowerCase()).filter(x => /^[0-9a-f]{64}$/.test(x)).slice(0, 20);
    const drives = new Map((await all(db, 'SELECT * FROM drives')).map(d => [d.id, d])), done = [], failed = [];
    for (const sha of shas) {
      const rows = (await all(db, "SELECT * FROM drive_files WHERE sha256 = ? AND status = 'ok' AND file_id IS NOT NULL", sha)).filter(isShortsRow).filter(r => /^video\//.test(String(r.mime || '')) || (r.folder === 'shorts/_ytpack' && r.mime === 'application/zip')); // master, hoặc gói đăng tay YouTube đã lên web
      for (const r of rows) {
        const d = drives.get(r.drive_id); if (!d || lost(d.status)) { failed.push({ sha, error: 'drive-lost' }); continue; }
        try {
          const at = await accessToken(env, db, d);
          const t = await gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(r.file_id)}?fields=id,trashed`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
          if (!t.ok && t.status !== 404) throw new DriveErr('google-' + t.status);
          await run(db, "UPDATE drive_files SET status = ? WHERE id = ?", t.status === 404 ? 'gone' : 'trashed', r.id);
          await logAudit(db, { who: who.email, act: 'retire', d, file_id: r.file_id, name: r.name, sha256: sha, size: r.size, note: String(b.reason || 'retention 30d').slice(0, 80) });
          done.push({ sha, drive_id: d.id });
        } catch (e) { failed.push({ sha, error: e.code || 'error' }); }
      }
    }
    return { ok: true, done, failed };
  },
  /** Cân bằng: mặc định dry-run (kế hoạch). apply:true → chép sang Drive tỉ lệ thấp, kiểm md5, rồi chuyển bản ở Drive cao vào thùng rác (dung lượng giải phóng khi dọn thùng rác). */
  async rebalance(db, b, who, env) {
    const drives = await all(db, 'SELECT * FROM drives'), files = await all(db, "SELECT * FROM drive_files WHERE status = 'ok' AND file_id IS NOT NULL");
    const spread = Math.min(Math.max(+b.spread || 0.1, 0.02), 0.5), p = planRebalance(drives, files, { spread });
    if (!b.apply) return { dry_run: true, spread, ...p };
    const maxF = Math.min(Math.max(1, +b.max_files || 10), 20), maxB = Math.min(+b.max_bytes || GB, 4 * GB), done = [], failed = []; let bytes = 0;
    for (const x of p.plan) {
      if (done.length >= maxF || bytes + x.size > maxB) break;
      const src = drives.find(d => d.id === x.from), dst = drives.find(d => d.id === x.to), row = files.find(f => f.file_id === x.file_id);
      try {
        const r = await copyAcross(env, db, src, dst, row, who.email === 'cli' ? 'cli' : who.email, 'rebalance');
        const at = await accessToken(env, db, src);
        const t = await gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(x.file_id)}?fields=id,trashed`, { method: 'PATCH', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true }) });
        if (t.ok) await run(db, "UPDATE drive_files SET status = 'trashed' WHERE id = ?", row.id);
        await logAudit(db, { who: who.email, act: 'rebalance', d: src, file_id: x.file_id, name: x.name, sha256: x.sha, size: x.size, ok: t.ok ? 1 : 0, note: `→ Drive #${dst.id} (${r.file_id}); bản cũ vào thùng rác` });
        done.push({ ...x, new_file_id: r.file_id, trashed: t.ok }); bytes += x.size;
      } catch (e) { failed.push({ ...x, error: e.code || 'error' }); }
    }
    return { ok: true, spread, done, failed, bytes, remaining: p.plan.length - done.length };
  },
};

// ---------- thao tác ----------
const FILE_OPS = makeFileOps({ accessToken: (...a) => accessToken(...a), gfetch: (...a) => gfetch(...a), DriveErr, one, all, run, signLink: (...a) => signLink(...a), signThumb: (...a) => signThumb(...a), limit: (...a) => limit(...a),
  audit: (...a) => logAudit(...a), copiesFor: (...a) => copiesFor(...a) });
const OPS = {
  ...FILE_OPS,
  ...POOL_OPS,
  /** CLI/CI (library.mjs drive-refs): thay toàn bộ tham chiếu của 1 nguồn (library | manifest) – dùng để tìm file mồ côi / reject cũ. */
  async refs_sync(db, b) {
    const src = b.source === 'manifest' ? 'manifest' : b.source === 'library' ? 'library' : b.source === 'footage' ? 'footage' : null, items = Array.isArray(b.items) ? b.items : null;
    if (!src || !items || items.length > 5000) return { status: 400, error: 'bad-input' };
    const rows = items.map(x => ({ s: /^[0-9a-f]{64}$/.test(String(x.s || '').toLowerCase()) ? String(x.s).toLowerCase() : null, f: /^[A-Za-z0-9_-]{10,120}$/.test(String(x.f || '')) ? String(x.f) : null, n: x.n ? String(x.n).slice(0, 200) : null, st: /^[a-z_]{1,20}$/.test(String(x.st || '')) ? String(x.st) : null })).filter(x => x.s || x.f || x.n);
    const now = Date.now(), st = [db.prepare('DELETE FROM drive_refs WHERE src = ?').bind(src)];
    for (const x of rows) st.push(db.prepare('INSERT INTO drive_refs (src, sha, file_id, name, status, at) VALUES (?, ?, ?, ?, ?, ?)').bind(src, x.s, x.f, x.n, x.st, now));
    for (let i = 0; i < st.length; i += 100) await db.batch(st.slice(i, i + 100));
    return { ok: true, source: src, count: rows.length };
  },
  health: (db, b, who, env) => runHealth(env, db),
  /** Banner + huy hiệu Quản trị: cảnh báo hiện có; > 6 h chưa kiểm → kiểm lười ngay. */
  async alerts(db, b, who, env) {
    const at = +(await meta(db, 'health_at')) || 0;
    let ran = false;
    if (Date.now() - at > HEALTH_STALE && (await one(db, 'SELECT COUNT(*) AS n FROM drives')).n) { await runHealth(env, db, { wait: 0 }); ran = true; }
    return { alerts: await alertRows(db), checked: ran ? Date.now() : at || null, ran };
  },
  async connect(db, b, who, env) {
    if (!ready4(env)) return { status: 412, error: 'not-configured', configured: config(env) };
    let re = null; // "Kết nối lại": giữ id Drive cũ (lịch sử file) – callback chỉ nhận đúng tài khoản Google đó
    if (b.reconnect_id) { re = await one(db, 'SELECT id, email FROM drives WHERE id = ?', +b.reconnect_id); if (!re) return { status: 404, error: 'not-found' }; b.hint = re.email; }
    const { state, nonce } = await signState(env, who.email, Date.now(), re ? re.id : 0);
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: env.GOOGLE_DRIVE_CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false', state, login_hint: b.hint && /^[^@\s]+@[^@\s]+$/.test(b.hint) ? b.hint : '' }).toString().replace(/&login_hint=$/, '');
    // cookie gắn phiên trình duyệt: callback chỉ nhận state đi kèm đúng cookie (chống CSRF/đánh tráo state)
    return { url, _cookie: `lk_drv=${nonce}; Path=/api/drive; Max-Age=${STATE_TTL}; HttpOnly; Secure; SameSite=Lax` };
  },
  async list(db, b, who, env) {
    const rows = await all(db, `SELECT d.*, (SELECT COUNT(*) FROM drive_files f WHERE f.drive_id = d.id AND f.status = 'ok') AS files, (SELECT COALESCE(SUM(size), 0) FROM drive_files f WHERE f.drive_id = d.id AND f.status = 'ok') AS bytes, (SELECT COUNT(*) FROM drive_files f WHERE f.drive_id = d.id AND f.status = 'ok' AND ${SHORTS_SQL}) AS shorts_files, (SELECT COALESCE(SUM(size), 0) FROM drive_files f WHERE f.drive_id = d.id AND f.status = 'ok' AND ${SHORTS_SQL}) AS shorts_bytes FROM drives d ORDER BY d.id`);
    const total = rows.reduce((s, r) => s + (+r.quota_total || 0), 0), used = rows.reduce((s, r) => s + (+r.quota_used || 0), 0);
    const out = { drives: rows.map(r => ({ ...pub(r), shorts_files: +r.shorts_files || 0, shorts_bytes: +r.shorts_bytes || 0 })), total, used, free: Math.max(0, total - used), configured: config(env), redirect: REDIRECT, alerts: cliOnly(b) ? undefined : await alertRows(db) };
    const sm = await one(db, `SELECT COUNT(*) AS n, COALESCE(AVG(f.size), 0) AS avg FROM drive_files f WHERE f.status = 'ok' AND ${SHORTS_SQL} AND f.mime LIKE 'video/%'`);
    out.shorts = { bytes: rows.reduce((s, r) => s + (+r.shorts_bytes || 0), 0), files: rows.reduce((s, r) => s + (+r.shorts_files || 0), 0), masters: sm ? sm.n : 0, avg_master: sm ? Math.round(sm.avg) : 0, ...shortsCapacity(rows) };
    if (Array.isArray(b.sha256)) { // verify (CLI): sha nào đã có trên Kho Drive
      const shas = b.sha256.map(x => String(x).toLowerCase()).filter(x => /^[0-9a-f]{64}$/.test(x)).slice(0, 200);
      out.have = {};
      for (let i = 0; i < shas.length; i += 50) {
        const part = shas.slice(i, i + 50);
        for (const f of await all(db, `SELECT f.sha256, f.drive_id, f.file_id, f.size, f.want, d.status AS dst FROM drive_files f JOIN drives d ON d.id = f.drive_id WHERE f.status = 'ok' AND f.sha256 IN (${part.map(() => '?').join(',')})`, ...part)) {
          if (lost(f.dst)) continue; // bản trên Drive mất kết nối không tính
          const h = out.have[f.sha256]; if (h) { h.copies++; h.drives.push(f.drive_id); } else out.have[f.sha256] = { drive_id: f.drive_id, file_id: f.file_id, size: f.size, copies: 1, want: f.want || 1, drives: [f.drive_id] };
        }
      }
    }
    return out;
  },
  async refresh_quota(db, b, who, env) {
    const rows = b.id ? await all(db, 'SELECT * FROM drives WHERE id = ?', +b.id) : await all(db, "SELECT * FROM drives WHERE status NOT IN ('revoked', 'disconnected')");
    const out = [];
    for (const r of rows) {
      try { const a = await about(await accessToken(env, db, r)); await run(db, "UPDATE drives SET quota_total = ?, quota_used = ?, last_ok = ?, fails = 0, err = NULL, status = CASE WHEN status IN ('revoked', 'disconnected') THEN 'ok' ELSE status END WHERE id = ?", a.total, a.used, Date.now(), r.id); out.push({ id: r.id, ok: true }); }
      catch (e) { out.push({ id: r.id, ok: false, error: e.code || 'error' }); }
    }
    return { rows: out };
  },
  async disconnect(db, b, who, env) {
    const r = await one(db, 'SELECT * FROM drives WHERE id = ?', +b.id); if (!r) return { status: 404, error: 'not-found' };
    let revoked = false;
    try { const t = await decryptToken(env, r); const x = await gfetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: t }) }); revoked = x.ok; } catch (e) { revoked = false; }
    TOK.delete(r.id);
    await db.batch([db.prepare('DELETE FROM drive_files WHERE drive_id = ?').bind(r.id), db.prepare('DELETE FROM drive_folders WHERE drive_id = ?').bind(r.id), db.prepare('DELETE FROM drives WHERE id = ?').bind(r.id)]);
    return { ok: true, revoked };
  },
  async set_weight(db, b) {
    const w = Math.round(+b.weight); if (!Number.isFinite(w) || w < 0 || w > 100) return { status: 400, error: 'weight' };
    await run(db, 'UPDATE drives SET weight = ?, auto_weight = NULL WHERE id = ?', w, +b.id); return { ok: true, weight: w }; // chỉnh tay → bỏ cờ tự ngừng
  },
  async drain(db, b) {
    const r = await one(db, 'SELECT status FROM drives WHERE id = ?', +b.id); if (!r) return { status: 404, error: 'not-found' };
    const st = b.on === false ? 'ok' : 'draining'; // draining = không nhận file mới (file cũ vẫn tải/khôi phục được)
    await run(db, 'UPDATE drives SET status = ? WHERE id = ?', st, +b.id); return { ok: true, state: st };
  },
  async upload_session(db, b, who, env, req) {
    if (!ready4(env)) return { status: 412, error: 'not-configured' };
    const name = String(b.name || '').replace(/[\u0000-\u001f/\\]/g, '_').slice(0, 200), mime = String(b.mime || ''), size = +b.size, sha = String(b.sha256 || '').toLowerCase(), folder = String(b.folder || '');
    if (!name || !/^[a-z]+\/[a-z0-9.+-]{1,60}$/i.test(mime) || !(size > 0 && size <= 5 * 1024 * MB) || !/^[0-9a-f]{64}$/.test(sha) || (folder && !/^[A-Za-z0-9 _.-]{1,60}(\/[A-Za-z0-9 _.-]{1,60}){0,2}$/.test(folder)) || /\.\./.test(folder)) return { status: 400, error: 'bad-input' };
    const cls = clsOf(b.cls, folder), want = replicasFor(cls, b.replicas), asset = b.asset_id ? String(b.asset_id).slice(0, 200) : null;
    const by = who.email === 'cli' ? (/^[0-9]{1,20}$/.test(String(b.run || '')) ? 'ci:' + b.run : 'cli') : who.email; // người/tiến trình tải
    const drives = await all(db, 'SELECT * FROM drives');
    const have = await healthyCopies(db, drives, sha);
    if (have.length >= want) return { done: true, drive_id: have[0].drive_id, file_id: have[0].file_id, copies: have.length, want };
    const rot = ((await one(db, 'SELECT MAX(id) AS n FROM drive_files')) || {}).n || 0; // chỉ để xoay vòng: MAX(id) đọc 1 dòng (COUNT(*) quét cả bảng → 22/10 làm cạn hạn mức đọc D1 miễn phí của cả tài khoản)
    const targets = pickDrives(drives, size, want - have.length, { exclude: have.map(h => h.drive_id), rot });
    if (!targets.length) return have.length ? { done: true, drive_id: have[0].drive_id, file_id: have[0].file_id, copies: have.length, want, short: want - have.length } : { status: 507, error: 'pool_full' };
    const sessions = [];
    for (const d of targets) {
      const at = await accessToken(env, db, d), parent = await ensureFolder(db, at, d.id, folder);
      const r = await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,size', {
        method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(size), ...(req.headers.get('Origin') ? { Origin: req.headers.get('Origin') } : {}) },
        body: JSON.stringify({ name, mimeType: mime, parents: [parent], appProperties: { lexkite: 'library', sha256: sha, cls } }),
      });
      const loc = r.headers.get('Location');
      if (!r.ok || !/^https:\/\/www\.googleapis\.com\/upload\//.test(loc || '')) { await bumpUpFail(env, db, d.id); if (sessions.length) break; throw new DriveErr('google-upload-start'); }
      await run(db, "INSERT INTO drive_files (drive_id, sha256, name, folder, mime, size, status, created, want, cls, email, by_who, asset_id) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)", d.id, sha, name, folder, mime, size, Date.now(), want, cls, d.email, by, asset);
      sessions.push({ drive_id: d.id, upload_url: loc });
    }
    const short = want - have.length - sessions.length;
    // upload_url = phiên resumable 1 file (không chứa token). sessions = mọi bản sao cần tải (mỗi bản 1 Drive khác nhau); drive_id/upload_url = bản đầu (tương thích cũ)
    return { drive_id: sessions[0].drive_id, upload_url: sessions[0].upload_url, sessions, chunk: 8 * MB, want, copies: have.length, ...(short > 0 ? { short } : {}) };
  },
  async complete(db, b, who, env) {
    const sha = String(b.sha256 || '').toLowerCase(), fid = String(b.file_id || '');
    if (!/^[0-9a-f]{64}$/.test(sha) || !/^[A-Za-z0-9_-]{10,120}$/.test(fid)) return { status: 400, error: 'bad-input' };
    const d = await one(db, 'SELECT * FROM drives WHERE id = ?', +b.drive_id); if (!d) return { status: 404, error: 'not-found' };
    const p = await one(db, "SELECT * FROM drive_files WHERE drive_id = ? AND sha256 = ? AND status = 'pending' ORDER BY id DESC LIMIT 1", d.id, sha);
    if (!p) return { status: 404, error: 'no-pending' };
    const at = await accessToken(env, db, d);
    const r = await gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fid)}?fields=id,size,trashed,appProperties,webViewLink`, { headers: { Authorization: 'Bearer ' + at } });
    if (!r.ok) { await bumpUpFail(env, db, d.id); await logAudit(db, { who: p.by_who || who.email, act: 'upload', d, file_id: fid, name: p.name, sha256: sha, size: p.size, ok: 0, note: 'file-not-found' }); return { status: 404, error: 'file-not-found' }; }
    const f = await r.json();
    if (f.trashed || (f.appProperties || {}).sha256 !== sha || +f.size !== +p.size) { await bumpUpFail(env, db, d.id); await logAudit(db, { who: p.by_who || who.email, act: 'upload', d, file_id: fid, name: p.name, sha256: sha, size: p.size, ok: 0, note: 'mismatch' }); return { status: 409, error: 'mismatch' }; }
    const web = /^https:\/\/(drive|docs)\.google\.com\//.test(f.webViewLink || '') ? f.webViewLink : null;
    await db.batch([db.prepare("UPDATE drive_files SET status = 'ok', file_id = ?, done = ?, web = ?, email = ? WHERE id = ?").bind(fid, Date.now(), web, d.email, p.id), db.prepare('UPDATE drives SET quota_used = COALESCE(quota_used, 0) + ?, last_ok = ?, up_fails = 0 WHERE id = ?').bind(+p.size, Date.now(), d.id)]);
    if (+d.up_fails >= UP_FAIL_CRIT) await refreshAlerts(env, db); // hết lỗi tải lên → thư khôi phục
    await logAudit(db, { who: p.by_who || who.email, act: 'upload', d, file_id: fid, name: p.name, sha256: sha, size: p.size });
    return { ok: true, drive_id: d.id, file_id: fid, email_masked: maskEmail(d.email) }; // email đầy đủ chỉ trong admin
  },
  async get_link(db, b, who, env) {
    const f = await one(db, "SELECT file_id FROM drive_files WHERE file_id = ? AND status = 'ok'", String(b.file_id || '')); if (!f) return { status: 404, error: 'not-found' };
    return { url: await signLink(env, f.file_id), ttl: LINK_TTL };
  },
};
const WRITE = new Set(['connect', 'refresh_quota', 'disconnect', 'set_weight', 'drain', 'upload_session', 'complete', 'get_link', 'preview', 'rename', 'move', 'trash', 'restore', 'delete', 'empty_trash', 'cleanup_apply', 'refs_sync', 'health', 'repair', 'rebalance', 'verify_files', 'set_want', 'retire', 'footage_alert']);
const DANGER = new Set(['disconnect', 'delete', 'empty_trash']); // + confirm:'DELETE' trong op (xoá vĩnh viễn)
const BIG_OPS = new Set(['refs_sync']);
const cliOnly = b => b && b._cli === true;

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  const text = await request.text().catch(() => '');
  if (text.length > 524288) return json(request, 413, { error: 'too-large' });
  let b; try { b = JSON.parse(text || '{}'); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return json(request, 400, { error: 'json' });
  if (text.length > 16384 && !BIG_OPS.has(b.op)) return json(request, 413, { error: 'too-large' });
  delete b._cli;
  const ip = request.headers.get('CF-Connecting-IP') || '?';
  let who, cli = false;
  if (request.headers.get('X-Drive-Sig')) { // đường CLI/CI: chỉ HMAC, chỉ 3 op
    if (await limit('drvcli:' + ip, 120, 60)) return json(request, 429, { error: 'too-fast' });
    if (!(await cliVerify(env, request, text)) || !CLI_OPS.has(b.op)) { await adminAudit(env, request, 'cli', 'drive.denied', false); return json(request, 403, { error: 'forbidden' }); }
    who = { email: 'cli' }; cli = true; b._cli = true;
  } else {
    const g = await adminGate(request, env, 'drv'); if (!g.who) return json(request, g.status, { error: g.error });
    who = g.who;
  }
  const fn = Object.hasOwn(OPS, b.op) ? OPS[b.op] : null; if (!fn) return json(request, 400, { error: 'op' });
  if (!cli && DANGER.has(b.op) && Date.now() / 1000 - (+who.auth_time || 0) > 900) return json(request, 401, { error: 'reauth', message: 'Sensitive action: sign out and sign back in, then try again.' });
  try {
    await setup(env.DB);
    const out = await fn(env.DB, b, who, env, request);
    const status = out.status || 200, cookie = out._cookie; delete out.status; delete out._cookie;
    if (WRITE.has(b.op)) await adminAudit(env, request, who.email, 'drive.' + b.op, status < 400);
    return json(request, status, out, cookie ? { 'Set-Cookie': cookie } : {});
  } catch (e) {
    if (WRITE.has(b.op)) await adminAudit(env, request, who.email, 'drive.' + b.op, false);
    return json(request, e.status || 500, { error: e instanceof DriveErr ? e.code : 'error' }); // không đưa thông điệp lỗi thô (có thể chứa dữ liệu Google) ra ngoài
  }
}

// ---------- GET /api/drive/callback ----------
const back = (q, clear = true) => new Response(null, { status: 302, headers: { Location: '/admin.html?drive=' + q + '#drive', 'Cache-Control': 'no-store', ...(clear ? { 'Set-Cookie': 'lk_drv=; Path=/api/drive; Max-Age=0; HttpOnly; Secure; SameSite=Lax' } : {}) } });
export async function handleCallback(request, env) {
  const u = new URL(request.url), ip = request.headers.get('CF-Connecting-IP') || '?';
  if (await limit('drvcb:' + ip, 20, 600)) return back('rate');
  if (!ready4(env)) return back('not-configured');
  await setup(env.DB);
  const st = await verifyState(env, u.searchParams.get('state') || '');
  const admins = String(env.ADMIN_EMAILS || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
  if (!st || !admins.includes(st.e) || !same(cookieOf(request, 'lk_drv'), st.n)) { await adminAudit(env, request, st ? st.e : '?', 'drive.callback', false); return back('bad-state'); }
  try { await run(env.DB, 'INSERT INTO drive_nonce (n, at) VALUES (?, ?)', st.n, Date.now()); } catch (e) { return back('replay'); } // state chỉ dùng 1 lần
  await run(env.DB, 'DELETE FROM drive_nonce WHERE at < ?', Date.now() - 86400e3).catch(() => {});
  if (u.searchParams.get('error') || !u.searchParams.get('code')) { await adminAudit(env, request, st.e, 'drive.callback', false); return back('denied'); }
  try {
    const r = await gfetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: u.searchParams.get('code'), client_id: env.GOOGLE_DRIVE_CLIENT_ID, client_secret: env.GOOGLE_DRIVE_CLIENT_SECRET, redirect_uri: REDIRECT, grant_type: 'authorization_code' }) });
    const t = await r.json().catch(() => ({}));
    if (!r.ok || !t.access_token) throw new DriveErr('exchange');
    if (!String(t.scope || '').split(' ').includes('https://www.googleapis.com/auth/drive.file')) return back('scope');
    if (!t.refresh_token) return back('no-refresh');
    const a = await about(t.access_token), email = String(a.email || '').toLowerCase();
    if (!email) throw new DriveErr('about');
    if (st.r) { // Kết nối lại: phải đúng tài khoản Google của Drive cũ (giữ id → giữ lịch sử drive_files)
      const old = await one(env.DB, 'SELECT email FROM drives WHERE id = ?', st.r);
      if (!old || String(old.email).toLowerCase() !== email) { await adminAudit(env, request, st.e, 'drive.reconnect', false); return back('wrong-account'); }
    }
    const e = await encryptToken(env, t.refresh_token, email), now = Date.now();
    await run(env.DB, "INSERT INTO drives (email, enc_token, iv, quota_total, quota_used, status, weight, created, last_ok, checked) VALUES (?, ?, ?, ?, ?, 'ok', 100, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET enc_token = excluded.enc_token, iv = excluded.iv, quota_total = excluded.quota_total, quota_used = excluded.quota_used, status = 'ok', err = NULL, fails = 0, up_fails = 0, last_ok = excluded.last_ok, checked = excluded.checked", email, e.enc_token, e.iv, a.total, a.used, now, now, now);
    const row = await one(env.DB, 'SELECT id FROM drives WHERE email = ?', email);
    if (row) TOK.set(row.id, { t: t.access_token, exp: now + Math.min((+t.expires_in || 3600) - 60, 50 * 60) * 1000 });
    await refreshAlerts(env, env.DB, now).catch(() => {}); // hết "mất kết nối" → thư khôi phục
    await adminAudit(env, request, st.e, st.r ? 'drive.reconnect' : 'drive.callback', true);
    return back(st.r ? 'reconnected' : 'ok');
  } catch (e) { await adminAudit(env, request, st.e, 'drive.callback', false); return back('error'); }
}

// ---------- GET /api/drive/dl ----------
export async function handleDownload(request, env) {
  const u = new URL(request.url), f = u.searchParams.get('f') || '';
  const ip = request.headers.get('CF-Connecting-IP') || '?';
  if (await limit('drvdl:' + ip, 60, 60)) return new Response('too fast', { status: 429 });
  const dd = u.searchParams.get('d') || '';
  if (!(await verifyLink(env, f, u.searchParams.get('x'), u.searchParams.get('s'), Date.now(), dd))) return new Response('link expired', { status: 403 });
  await setup(env.DB);
  let row = null;
  if (dd) row = await one(env.DB, 'SELECT * FROM drives WHERE id = ?', +dd); // trình duyệt Kho Drive: file chưa có trong drive_files
  else row = await one(env.DB, "SELECT d.*, f.name AS fname, f.mime AS fmime FROM drive_files f JOIN drives d ON d.id = f.drive_id WHERE f.file_id = ? AND f.status = 'ok'", f);
  if (!row || lost(row.status)) return new Response('not found', { status: 404 });
  try {
    const at = await accessToken(env, env.DB, row), range = request.headers.get('Range');
    if (dd) {
      const m = await gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f)}?fields=name,mimeType`, { headers: { Authorization: 'Bearer ' + at } });
      const j = m.ok ? await m.json().catch(() => ({})) : {};
      if (!j.mimeType || /^application\/vnd\.google-apps\./.test(j.mimeType)) return new Response('not found', { status: 404 });
      row.fname = j.name; row.fmime = j.mimeType;
    }
    const r = await gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f)}?alt=media`, { headers: { Authorization: 'Bearer ' + at, ...(range ? { Range: range } : {}) } });
    if (!r.ok && r.status !== 206) return new Response('drive error', { status: 502 });
    const h = new Headers({ 'Content-Type': row.fmime || 'application/octet-stream', 'Cache-Control': 'private, no-store', 'Content-Disposition': `attachment; filename="${String(row.fname || 'file').replace(/[^A-Za-z0-9._-]/g, '_')}"` , 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; media-src 'self'; img-src 'self'; sandbox" });
    for (const k of ['Content-Length', 'Content-Range', 'Accept-Ranges']) if (r.headers.get(k)) h.set(k, r.headers.get(k));
    return new Response(r.body, { status: r.status, headers: h }); // stream thẳng, không đệm, không lộ token
  } catch (e) { return new Response('drive error', { status: e.status || 502 }); }
}

// ---------- đọc file cho module quản trị khác (admin-shorts.js) ----------
/** Bản ghi mới nhất (status ok) theo thư mục + tên cố định trong sổ kho – vd manifest thư viện video shorts/_admin/admin-shorts.json. */
export async function latestFile(env, folder, name) {
  await setup(env.DB);
  return one(env.DB, "SELECT drive_id, file_id, sha256, size FROM drive_files WHERE folder = ? AND name = ? AND status = 'ok' AND file_id IS NOT NULL ORDER BY COALESCE(done, created) DESC, id DESC LIMIT 1", folder, name);
}
/** alt=media của 1 file trên Drive driveId (refresh token giải mã trong D1, access token chỉ trong bộ nhớ), chuyển tiếp Range. Trả Response của Google. */
export async function driveMedia(env, driveId, fileId, range = '') {
  await setup(env.DB);
  const row = await one(env.DB, 'SELECT * FROM drives WHERE id = ?', +driveId);
  if (!row || lost(row.status)) throw new DriveErr('not-found', 404);
  const at = await accessToken(env, env.DB, row);
  return gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`, { headers: { Authorization: 'Bearer ' + at, ...(range ? { Range: range } : {}) } });
}

// ---------- GET /api/drive/thumb ----------
/** Ảnh thu nhỏ qua proxy (link ký 6–7 h, cache Cloudflare) – thumbnailLink và token Google không bao giờ tới trình duyệt. */
export const handleThumb = (request, env) => serveThumb(request, env, { verifyThumb, setupDb: setup, one, accessToken, limit, gfetch });
