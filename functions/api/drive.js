/* Kho Drive riêng của Lexkite (Quản trị → Kho Drive · docs/ASSET-LIBRARY.md §8.6): chủ dự án nối 1 hoặc nhiều Google Drive của mình
 * (OAuth, scope drive.file – app CHỈ thấy file do chính nó tạo), dùng làm nguồn sao lưu 2 cho kho tài nguyên dựng video.
 * POST /api/drive { op, ... }
 *   Quản trị (Authorization: Bearer <Firebase ID token>, cổng adminGate): connect · list · refresh_quota · disconnect · set_weight · drain · upload_session · complete · get_link
 *   CLI/CI (scripts/video/library.mjs): header X-Drive-Ts + X-Drive-Sig = hex HMAC-SHA256(LEXKITE_DRIVE_CLI_KEY, "<ts>.<sha256 hex của body>"), lệch ≤ 300 s,
 *     chỉ được list · upload_session · complete.
 * GET /api/drive/callback (functions/api/drive/callback.js) – Google trả về sau khi đồng ý; GET /api/drive/dl (functions/api/drive/dl.js) – tải file qua link ký 5 phút.
 * Byte file KHÔNG đi qua Worker khi tải lên: máy/CI PUT thẳng vào phiên resumable của Google. Refresh token mã hoá AES-GCM (DRIVE_ENC_KEY, 32 byte base64)
 * trong D1; access token chỉ ở bộ nhớ (< 50 phút). Không bao giờ trả về/ghi log token hay khoá. */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { limit } from './sync.js';

const REDIRECT = 'https://lexkite.com/api/drive/callback';
const SCOPE = 'https://www.googleapis.com/auth/drive.file openid email';
const ROOT_FOLDER = 'Lexkite Library';
const MB = 1048576, HEADROOM_MIN = 256 * MB, STATE_TTL = 600, LINK_TTL = 300, CLI_SKEW = 300;
const CLI_OPS = new Set(['list', 'upload_session', 'complete']);
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
export async function signState(env, email, now = Date.now()) {
  const raw = rawKey(env); if (!raw) throw new Error('no-key');
  const n = b64u(crypto.getRandomValues(new Uint8Array(16)));
  const body = b64u(enc.encode(JSON.stringify({ e: String(email).toLowerCase(), n, x: Math.floor(now / 1000) + STATE_TTL })));
  return { state: body + '.' + b64u(await (await hmacKey(raw, 'state')).sign(body)), nonce: n };
}
/** → {e, n} nếu chữ ký đúng + còn hạn, ngược lại null. */
export async function verifyState(env, state, now = Date.now()) {
  const raw = rawKey(env); if (!raw || typeof state !== 'string') return null;
  const [body, sig] = state.split('.'); if (!body || !sig) return null;
  if (!same(sig, b64u(await (await hmacKey(raw, 'state')).sign(body)))) return null;
  let p; try { p = JSON.parse(new TextDecoder().decode(unb64u(body))); } catch (e) { return null; }
  if (!p || typeof p.x !== 'number' || p.x < Math.floor(now / 1000) || !p.e || !p.n) return null;
  return { e: p.e, n: p.n };
}
async function aesKey(env) { const raw = rawKey(env); if (!raw) throw new Error('no-key'); return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']); }
/** AES-GCM (iv 12 byte ngẫu nhiên, AAD = "drive:<email>" – token chép sang dòng khác sẽ không giải được). */
export async function encryptToken(env, token, email) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: enc.encode('drive:' + String(email).toLowerCase()) }, await aesKey(env), enc.encode(token));
  return { enc_token: b64(ct), iv: b64(iv) };
}
export async function decryptToken(env, row) {
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(row.iv), additionalData: enc.encode('drive:' + String(row.email).toLowerCase()) }, await aesKey(env), unb64(row.enc_token));
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
/** Link tải ký 5 phút: /api/drive/dl?f=<id file>&x=<hạn>&s=<HMAC>. */
export async function signLink(env, fileId, now = Date.now()) {
  const raw = rawKey(env); if (!raw) throw new Error('no-key');
  const x = Math.floor(now / 1000) + LINK_TTL;
  return `/api/drive/dl?f=${encodeURIComponent(fileId)}&x=${x}&s=${b64u(await (await hmacKey(raw, 'dl')).sign(fileId + '|' + x))}`;
}
export async function verifyLink(env, f, x, s, now = Date.now()) {
  const raw = rawKey(env); if (!raw || !f || !s || !/^\d+$/.test(String(x)) || +x < Math.floor(now / 1000)) return false;
  return same(String(s), b64u(await (await hmacKey(raw, 'dl')).sign(f + '|' + x)));
}

// ---------- chọn Drive ----------
/** Chừa trống: ≥ 5 % dung lượng và ≥ 256 MB. */
export const headroom = total => Math.max(Math.floor((+total || 0) * 0.05), HEADROOM_MIN);
/** Chọn Drive nhiều chỗ trống × trọng số nhất mà còn đủ chỗ sau khi chừa trống. Drive không giới hạn (quota_total null) coi như 1 PB trống. */
export function pickDrive(rows, size) {
  let best = null, bestScore = -1;
  for (const r of rows) {
    if (r.status !== 'ok' || !(+r.weight > 0)) continue;
    const unlimited = r.quota_total == null;
    const free = unlimited ? 1e15 : (+r.quota_total - (+r.quota_used || 0));
    if (!unlimited && free - headroom(r.quota_total) < size) continue;
    const score = free * +r.weight;
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}

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
  ]);
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
    if (j.error === 'invalid_grant') { await run(db, "UPDATE drives SET status = 'revoked', err = ? WHERE id = ?", 'Google thu hồi quyền – nối lại Drive này', row.id); throw new DriveErr('drive-revoked', 409); }
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
const pub = r => ({ id: r.id, email: r.email, quota_total: r.quota_total, quota_used: r.quota_used, status: r.status, weight: r.weight, created: r.created, last_ok: r.last_ok, err: r.err || null, files: r.files || 0, bytes: r.bytes || 0 });
const cookieOf = (req, k) => { const m = (req.headers.get('Cookie') || '').match(new RegExp('(?:^|;\\s*)' + k + '=([^;]+)')); return m ? m[1] : ''; };

// ---------- thao tác ----------
const OPS = {
  async connect(db, b, who, env) {
    if (!ready4(env)) return { status: 412, error: 'not-configured', configured: config(env) };
    const { state, nonce } = await signState(env, who.email);
    const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({ client_id: env.GOOGLE_DRIVE_CLIENT_ID, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPE, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'false', state, login_hint: b.hint && /^[^@\s]+@[^@\s]+$/.test(b.hint) ? b.hint : '' }).toString().replace(/&login_hint=$/, '');
    // cookie gắn phiên trình duyệt: callback chỉ nhận state đi kèm đúng cookie (chống CSRF/đánh tráo state)
    return { url, _cookie: `lk_drv=${nonce}; Path=/api/drive; Max-Age=${STATE_TTL}; HttpOnly; Secure; SameSite=Lax` };
  },
  async list(db, b, who, env) {
    const rows = await all(db, "SELECT d.*, (SELECT COUNT(*) FROM drive_files f WHERE f.drive_id = d.id AND f.status = 'ok') AS files, (SELECT COALESCE(SUM(size), 0) FROM drive_files f WHERE f.drive_id = d.id AND f.status = 'ok') AS bytes FROM drives d ORDER BY d.id");
    const total = rows.reduce((s, r) => s + (+r.quota_total || 0), 0), used = rows.reduce((s, r) => s + (+r.quota_used || 0), 0);
    const out = { drives: rows.map(pub), total, used, free: Math.max(0, total - used), configured: config(env), redirect: REDIRECT };
    if (Array.isArray(b.sha256)) { // verify (CLI): sha nào đã có trên Kho Drive
      const shas = b.sha256.map(x => String(x).toLowerCase()).filter(x => /^[0-9a-f]{64}$/.test(x)).slice(0, 200);
      out.have = {};
      for (let i = 0; i < shas.length; i += 50) {
        const part = shas.slice(i, i + 50);
        for (const f of await all(db, `SELECT sha256, drive_id, file_id, size FROM drive_files WHERE status = 'ok' AND sha256 IN (${part.map(() => '?').join(',')})`, ...part)) out.have[f.sha256] = { drive_id: f.drive_id, file_id: f.file_id, size: f.size };
      }
    }
    return out;
  },
  async refresh_quota(db, b, who, env) {
    const rows = b.id ? await all(db, 'SELECT * FROM drives WHERE id = ?', +b.id) : await all(db, "SELECT * FROM drives WHERE status != 'revoked'");
    const out = [];
    for (const r of rows) {
      try { const a = await about(await accessToken(env, db, r)); await run(db, "UPDATE drives SET quota_total = ?, quota_used = ?, last_ok = ?, err = NULL, status = CASE WHEN status = 'revoked' THEN 'ok' ELSE status END WHERE id = ?", a.total, a.used, Date.now(), r.id); out.push({ id: r.id, ok: true }); }
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
    await run(db, 'UPDATE drives SET weight = ? WHERE id = ?', w, +b.id); return { ok: true, weight: w };
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
    const have = await one(db, "SELECT drive_id, file_id FROM drive_files WHERE sha256 = ? AND status = 'ok' LIMIT 1", sha);
    if (have) return { done: true, drive_id: have.drive_id, file_id: have.file_id };
    const d = pickDrive(await all(db, 'SELECT * FROM drives'), size);
    if (!d) return { status: 507, error: 'pool_full' };
    const at = await accessToken(env, db, d), parent = await ensureFolder(db, at, d.id, folder);
    const r = await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,size', {
      method: 'POST', headers: { Authorization: 'Bearer ' + at, 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': mime, 'X-Upload-Content-Length': String(size), ...(req.headers.get('Origin') ? { Origin: req.headers.get('Origin') } : {}) },
      body: JSON.stringify({ name, mimeType: mime, parents: [parent], appProperties: { lexkite: 'library', sha256: sha } }),
    });
    const loc = r.headers.get('Location');
    if (!r.ok || !/^https:\/\/www\.googleapis\.com\/upload\//.test(loc || '')) throw new DriveErr('google-upload-start');
    await run(db, "INSERT INTO drive_files (drive_id, sha256, name, folder, mime, size, status, created) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)", d.id, sha, name, folder, mime, size, Date.now());
    return { drive_id: d.id, upload_url: loc, chunk: 8 * MB }; // upload_url = phiên resumable 1 file (không chứa token)
  },
  async complete(db, b, who, env) {
    const sha = String(b.sha256 || '').toLowerCase(), fid = String(b.file_id || '');
    if (!/^[0-9a-f]{64}$/.test(sha) || !/^[A-Za-z0-9_-]{10,120}$/.test(fid)) return { status: 400, error: 'bad-input' };
    const d = await one(db, 'SELECT * FROM drives WHERE id = ?', +b.drive_id); if (!d) return { status: 404, error: 'not-found' };
    const p = await one(db, "SELECT * FROM drive_files WHERE drive_id = ? AND sha256 = ? AND status = 'pending' ORDER BY id DESC LIMIT 1", d.id, sha);
    if (!p) return { status: 404, error: 'no-pending' };
    const at = await accessToken(env, db, d);
    const r = await gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fid)}?fields=id,size,trashed,appProperties`, { headers: { Authorization: 'Bearer ' + at } });
    if (!r.ok) return { status: 404, error: 'file-not-found' };
    const f = await r.json();
    if (f.trashed || (f.appProperties || {}).sha256 !== sha || +f.size !== +p.size) return { status: 409, error: 'mismatch' };
    await db.batch([db.prepare("UPDATE drive_files SET status = 'ok', file_id = ?, done = ? WHERE id = ?").bind(fid, Date.now(), p.id), db.prepare('UPDATE drives SET quota_used = COALESCE(quota_used, 0) + ?, last_ok = ? WHERE id = ?').bind(+p.size, Date.now(), d.id)]);
    return { ok: true, drive_id: d.id, file_id: fid };
  },
  async get_link(db, b, who, env) {
    const f = await one(db, "SELECT file_id FROM drive_files WHERE file_id = ? AND status = 'ok'", String(b.file_id || '')); if (!f) return { status: 404, error: 'not-found' };
    return { url: await signLink(env, f.file_id), ttl: LINK_TTL };
  },
};
const WRITE = new Set(['connect', 'refresh_quota', 'disconnect', 'set_weight', 'drain', 'upload_session', 'complete', 'get_link']);
const DANGER = new Set(['disconnect']);

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  const text = await request.text().catch(() => '');
  if (text.length > 16384) return json(request, 413, { error: 'too-large' });
  let b; try { b = JSON.parse(text || '{}'); } catch (e) { return json(request, 400, { error: 'json' }); }
  const ip = request.headers.get('CF-Connecting-IP') || '?';
  let who, cli = false;
  if (request.headers.get('X-Drive-Sig')) { // đường CLI/CI: chỉ HMAC, chỉ 3 op
    if (await limit('drvcli:' + ip, 120, 60)) return json(request, 429, { error: 'too-fast' });
    if (!(await cliVerify(env, request, text)) || !CLI_OPS.has(b.op)) { await adminAudit(env, request, 'cli', 'drive.denied', false); return json(request, 403, { error: 'forbidden' }); }
    who = { email: 'cli' }; cli = true;
  } else {
    const g = await adminGate(request, env, 'drv'); if (!g.who) return json(request, g.status, { error: g.error });
    who = g.who;
  }
  const fn = OPS[b.op]; if (!fn) return json(request, 400, { error: 'op' });
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
    const e = await encryptToken(env, t.refresh_token, email), now = Date.now();
    await run(env.DB, "INSERT INTO drives (email, enc_token, iv, quota_total, quota_used, status, weight, created, last_ok) VALUES (?, ?, ?, ?, ?, 'ok', 100, ?, ?) ON CONFLICT(email) DO UPDATE SET enc_token = excluded.enc_token, iv = excluded.iv, quota_total = excluded.quota_total, quota_used = excluded.quota_used, status = 'ok', err = NULL, last_ok = excluded.last_ok", email, e.enc_token, e.iv, a.total, a.used, now, now);
    const row = await one(env.DB, 'SELECT id FROM drives WHERE email = ?', email);
    if (row) TOK.set(row.id, { t: t.access_token, exp: now + Math.min((+t.expires_in || 3600) - 60, 50 * 60) * 1000 });
    await adminAudit(env, request, st.e, 'drive.callback', true);
    return back('ok');
  } catch (e) { await adminAudit(env, request, st.e, 'drive.callback', false); return back('error'); }
}

// ---------- GET /api/drive/dl ----------
export async function handleDownload(request, env) {
  const u = new URL(request.url), f = u.searchParams.get('f') || '';
  const ip = request.headers.get('CF-Connecting-IP') || '?';
  if (await limit('drvdl:' + ip, 60, 60)) return new Response('too fast', { status: 429 });
  if (!(await verifyLink(env, f, u.searchParams.get('x'), u.searchParams.get('s')))) return new Response('link expired', { status: 403 });
  await setup(env.DB);
  const row = await one(env.DB, "SELECT d.*, f.name AS fname, f.mime AS fmime FROM drive_files f JOIN drives d ON d.id = f.drive_id WHERE f.file_id = ? AND f.status = 'ok'", f);
  if (!row) return new Response('not found', { status: 404 });
  try {
    const at = await accessToken(env, env.DB, row), range = request.headers.get('Range');
    const r = await gfetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(f)}?alt=media`, { headers: { Authorization: 'Bearer ' + at, ...(range ? { Range: range } : {}) } });
    if (!r.ok && r.status !== 206) return new Response('drive error', { status: 502 });
    const h = new Headers({ 'Content-Type': row.fmime || 'application/octet-stream', 'Cache-Control': 'private, no-store', 'Content-Disposition': `attachment; filename="${String(row.fname || 'file').replace(/[^A-Za-z0-9._-]/g, '_')}"` });
    for (const k of ['Content-Length', 'Content-Range', 'Accept-Ranges']) if (r.headers.get(k)) h.set(k, r.headers.get(k));
    return new Response(r.body, { status: r.status, headers: h }); // stream thẳng, không đệm, không lộ token
  } catch (e) { return new Response('drive error', { status: e.status || 502 }); }
}
