/* API đồng bộ dữ liệu học – Cloudflare Pages Functions + D1 (thay Firestore: hạn mức miễn phí lớn hơn nhiều lần).
 * POST /api/sync  (Authorization: Bearer <Firebase ID token>)
 *   { op: 'pull', have: { cards_0: 'hash', … } } → { docs: { meta: {...}, cards_3: {...} } }  (chỉ trả tài liệu có hash khác)
 *   { op: 'push', docs: { meta: { h, body }, cards_0: { h, body } } } → { ok: true, n }
 * Mỗi người chỉ đọc/ghi được dữ liệu của chính mình (uid lấy từ token đã xác minh chữ ký Google). */
import { gate } from './_quota.js';
import { once } from './_schema.js';
import { docsDb, pickShard } from './_shard.js';
import { cleanDocBody } from './_ctx.js';

const PROJECT = 'lexkite-app';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const KEY_RE = /^(meta|cards_\d{1,3})$/;
const MAX_DOCS = 80, MAX_BODY = 1_000_000, MAX_TOTAL = 8_000_000;
const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost)$/;

let jwks = null, jwksAt = 0, ready = false;

const cors = req => {
  const o = req.headers.get('Origin') || '';
  return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {};
};
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - s.length % 4) % 4)), c => c.charCodeAt(0));
async function keys(force) {
  // force (kid lạ): tối đa 1 lần tải lại/phút – token rác với kid ngẫu nhiên không biến mỗi yêu cầu thành 1 lượt gọi Google
  if (jwks && Date.now() - jwksAt < (force ? 60e3 : 3600e3)) return jwks;
  const r = await fetch(JWKS_URL, /** @type {any} */ ({ cf: { cacheTtl: 3600, cacheEverything: true } })); // cf: tùy chọn bộ đệm riêng của Cloudflare
  if (!r.ok) throw new Error('jwks ' + r.status);
  jwks = (await r.json()).keys || []; jwksAt = Date.now();
  return jwks;
}
// Xác minh Firebase ID token (RS256) → uid, hoặc null
// Trả về toàn bộ claims (sub, email, email_verified, name…) của Firebase ID token hợp lệ, hoặc null
export async function claims(token, now = Date.now() / 1000, getKeys = keys) {
  const p = (token || '').split('.');
  if (p.length !== 3) return null;
  let head, body;
  try { head = JSON.parse(new TextDecoder().decode(b64u(p[0]))); body = JSON.parse(new TextDecoder().decode(b64u(p[1]))); } catch (e) { return null; }
  if (head.alg !== 'RS256' || !head.kid) return null;
  let jwk = (await getKeys()).find(k => k.kid === head.kid);
  if (!jwk) jwk = (await getKeys(true)).find(k => k.kid === head.kid); // Google xoay khóa
  if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(p[2]), new TextEncoder().encode(p[0] + '.' + p[1]));
  if (!ok) return null;
  if (body.aud !== PROJECT || body.iss !== 'https://securetoken.google.com/' + PROJECT) return null;
  if (!(body.exp > now) || !(body.iat <= now + 300)) return null;
  if (body.auth_time !== undefined && !(typeof body.auth_time === 'number' && body.auth_time <= now + 300)) return null; // Firebase: auth_time phải ở quá khứ
  if (typeof body.sub !== 'string' || !body.sub || body.sub.length > 128) return null;
  return body;
}
export const verify = async (...a) => { const c = await claims(...a); return c ? c.sub : null; };


// Giới hạn tốc độ ở biên Cloudflare (Cache API – miễn phí, không tốn lượt ghi D1). Trả về số giây phải chờ, 0 = cho phép.
// Không tuyệt đối toàn cầu (đếm theo từng trung tâm dữ liệu) – đủ chặn spam/script tự động; người dùng thường không chạm tới.
export async function limit(key, max, windowSec) {
  try {
    const c = /** @type {any} */ (caches).default, req = new Request('https://rate.lexkite.internal/' + encodeURIComponent(key)), now = Date.now();
    const hit = await c.match(req); let st = hit ? await hit.json() : null;
    if (!st || st.reset <= now) st = { n: 0, reset: now + windowSec * 1000 };
    if (st.n >= max) return Math.ceil((st.reset - now) / 1000);
    st.n++;
    await c.put(req, new Response(JSON.stringify(st), { headers: { 'Cache-Control': `max-age=${Math.max(1, Math.ceil((st.reset - now) / 1000))}` } }));
    return 0;
  } catch (e) { return 0; } // bộ đếm lỗi → không chặn người dùng
}

// Lược đồ (cổng phiên bản _schema.js: chỉ chạy khi đổi phiên bản, không chạy mỗi isolate lạnh)
async function setup(env) {
  if (ready) return;
  const db = env.DB;
  await once(db, 'sync', 3, async () => {
    await db.prepare('CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1) WITHOUT ROWID').run();
    await db.prepare('ALTER TABLE users ADD COLUMN blocked INTEGER DEFAULT 0').run().catch(() => {});
    await db.prepare('ALTER TABLE users ADD COLUMN shard INTEGER DEFAULT 0').run().catch(() => {}); // mảnh D1 chứa docs của người này (_shard.js)
    await db.prepare('ALTER TABLE users ADD COLUMN cc TEXT').run().catch(() => {}); // mã quốc gia 2 chữ lần đồng bộ gần nhất (request.cf.country – không lưu IP)
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_users_cc ON users (cc)').run().catch(() => {}); // thống kê/lọc quốc gia ở trang quản trị không quét bảng
    await db.prepare('CREATE TABLE IF NOT EXISTS vid_uid (vid TEXT PRIMARY KEY, uid TEXT NOT NULL, at INTEGER NOT NULL) WITHOUT ROWID').run();
    await db.prepare(DOCS_DDL).run();
  }, { env });
  ready = true;
}
const DOCS_DDL = 'CREATE TABLE IF NOT EXISTS docs (uid TEXT NOT NULL, k TEXT NOT NULL, h TEXT NOT NULL, body TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (uid, k)) WITHOUT ROWID';

/* ---------- Gói dữ liệu học (docs/CAPACITY.md §Kiến trúc B1) ----------
 * Trước: mỗi tài liệu (meta + cards_0..31) 1 dòng → mỗi lượt đẩy ghi 1 dòng/tài liệu đổi (đo: ~7–12 dòng), kéo liệt kê ~33 dòng.
 * Nay: 1 dòng k = 'pack' chứa MỌI tài liệu {k: [h, body, updated]} (body giữ nguyên chuỗi máy khách gửi – đã nén gzip ở máy) →
 *   1 lượt đẩy = 1 dòng ghi, 1 lượt kéo = 1 dòng đọc. Máy chủ KHÔNG đụng nội dung thẻ (chỉ xếp chuỗi) → CPU ~0, giữ nguyên ngữ nghĩa v1
 *   (mỗi tài liệu đẩy lên thay nguyên tài liệu đó) → máy khách cũ/mới, add-on, app gốc không phải đổi gì.
 * Di chuyển lười: lượt đẩy đầu tiên gộp các dòng cũ vào gói rồi xoá chúng (cùng 1 giao dịch, chỉ xoá khi gói đã ghi đúng).
 * Ghi có điều kiện theo hash gói (2 máy đẩy cùng lúc không mất dữ liệu: thua → đọc lại, gộp lại, tối đa 3 lần).
 * Đẩy lại y hệt (thử lại, mạng chập chờn) → không đổi gì → 0 dòng ghi (khóa bất biến = hash tài liệu).
 * Gói > PACK_MAX (rất nhiều thẻ) → tự dùng dòng riêng như cũ. Tắt (rollback): SYNC_PACK=0 – vẫn ĐỌC gói, dòng riêng mới hơn đè lên gói. */
export const PACK_MAX = 1_800_000; // D1: 1 dòng ≤ 2 MB
const packOn = env => !env || env.SYNC_PACK !== '0';
const hstr = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36) + ':' + s.length.toString(36); };
/** Dòng docs thô (có thể có 'pack' + dòng riêng) → Map k → { h, body, updated } (dòng riêng mới hơn gói thì thắng). */
export function viewOf(rows) {
  const v = new Map(), pk = rows.find(r => r.k === 'pack');
  if (pk && pk.body) { try { for (const [k, [h, body, upd]] of Object.entries(JSON.parse(pk.body).d || {})) v.set(k, { h, body, updated: +upd || 0 }); } catch (e) { /* gói hỏng → bỏ qua, còn dòng riêng */ } }
  for (const r of rows) if (r.k !== 'pack') { const p = v.get(r.k); if (!p || (+r.updated || 0) >= p.updated) v.set(r.k, { h: r.h, body: r.body, updated: +r.updated || 0, row: true }); }
  return v;
}
/** Tài liệu logic của 1 người (Quản trị: chi tiết, xuất dữ liệu) → [{ k, h, body, updated }] */
export async function userDocs(db, uid) {
  const rows = (await db.prepare('SELECT k, h, body, updated FROM docs WHERE uid = ?').bind(uid).all()).results || [];
  return [...viewOf(rows)].map(([k, x]) => ({ k, h: x.h, body: x.body, updated: x.updated })).sort((a, b) => a.k < b.k ? -1 : 1);
}
// Mỗi lần mở app máy khách gửi lại 'meta' dù không đổi gì (chỉ khác mốc updated) → coi là giống → 0 dòng ghi
const sameBody = (k, a, b) => { if (a === b) return true; if (k !== 'meta') return false; try { const x = JSON.parse(a), y = JSON.parse(b); x.updated = y.updated = 0; return JSON.stringify(x) === JSON.stringify(y); } catch (e) { return false; } };
const packOf = view => { const d = {}; for (const k of [...view.keys()].sort()) { const x = view.get(k); d[k] = [x.h, x.body, x.updated]; } const body = JSON.stringify({ v: 1, d }); return { body, h: 'p' + hstr(Object.entries(d).map(([k, x]) => k + '=' + x[0]).join('|')) }; };

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  const uid = who && who.sub;
  if (!uid) return json(request, 401, { error: 'auth' });
  if (+(request.headers.get('Content-Length') || 0) > MAX_TOTAL) return json(request, 413, { error: 'too-large' });
  let req;
  try { req = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!req || typeof req !== 'object' || Array.isArray(req)) return json(request, 400, { error: 'json' });
  // Mỗi tài khoản: kéo/đẩy mỗi chiều tối đa 1 lần/20 giây (app tự gom 3 phút/lần nên người dùng thường không chạm tới)
  { const w = await limit(`sync:${uid}:${req.op}`, 1, 20); if (w) return json(request, 429, { error: 'too-fast', wait: w }); }
  // Hạn mức ngày + theo IP + khóa chống lạm dụng (functions/api/_quota.js – đếm ở biên, không tốn lượt ghi D1)
  { const q = await gate(request, env, 'sync', { who, json }); if (q.res) return q.res; }
  try {
    await setup(env);
    // Tài khoản bị quản trị khóa đồng bộ (users.blocked) → 403 'blocked' cho cả kéo lẫn đẩy. Xóa tài khoản (/api/account) KHÔNG bị chặn (App Store 5.1.1(v)).
    // Cùng 1 dòng đọc: mảnh D1 chứa dữ liệu học (_shard.js – hiện chỉ env.DB)
    const blk = await env.DB.prepare('SELECT blocked, shard FROM users WHERE uid = ?').bind(uid).first().catch(() => null);
    if (blk && +blk.blocked) return json(request, 403, { error: 'blocked' });
    const shard = blk ? +blk.shard || 0 : pickShard(env, uid), ddb = docsDb(env, shard);
    if (shard) await once(ddb, 'docs', 1, () => ddb.prepare(DOCS_DDL).run(), { env, tag: 'DB_S' + shard });
    if (req.op === 'pull') {
      // Sổ người dùng cho trang quản trị (nền tảng: app iOS = capacitor://localhost, app Android = https://localhost): chỉ ghi khi lần thấy trước đã hơn 1 giờ (tiết kiệm lượt ghi D1)
      // Quốc gia: mã 2 chữ Cloudflare suy từ IP (IP KHÔNG lưu) – đi chung lượt ghi sẵn có, không thêm lượt ghi D1; không rõ → giữ mã cũ
      const o = request.headers.get('Origin') || '', plat = /^chrome-extension:/.test(o) ? 'ext' : /^capacitor:/.test(o) ? 'ios' : o === 'https://localhost' ? 'android' : 'web', now = Date.now();
      const cf = /** @type {any} */ (request).cf, cc = cf && /^[A-Z][A-Z1-9]$/.test(cf.country || '') && cf.country !== 'XX' ? cf.country : null;
      await env.DB.prepare('INSERT INTO users (uid, email, name, created, seen, plat, n, shard, cc) VALUES (?1, ?2, ?3, ?4, ?4, ?5, 1, ?6, ?7) ON CONFLICT (uid) DO UPDATE SET email = ?2, name = ?3, seen = ?4, plat = ?5, n = n + 1, cc = COALESCE(?7, cc) WHERE users.seen < ?4 - 3600000')
        .bind(uid, String(who.email || '').slice(0, 200), String(who.name || '').slice(0, 100), now, plat, shard, cc).run().catch(() => {});
      // Phễu chuyển đổi: máy gửi mã khách ẩn danh 1 lần/tài khoản → gắn vid với uid (giữ liên kết đầu tiên)
      if (typeof req.vid === 'string' && /^[a-z0-9]{8,32}$/.test(req.vid)) await env.DB.prepare('INSERT OR IGNORE INTO vid_uid (vid, uid, at) VALUES (?1, ?2, ?3)').bind(req.vid, uid, now).run().catch(() => {});
      const have = req.have && typeof req.have === 'object' ? req.have : {};
      // 1 truy vấn: hash mọi dòng + thân của gói (dòng riêng: chỉ đọc thân khi khác hash máy người dùng)
      const rows = (await ddb.prepare("SELECT k, h, CASE WHEN k = 'pack' THEN body END AS body, updated FROM docs WHERE uid = ?").bind(uid).all()).results || [];
      const view = viewOf(rows), docs = {}, needRows = [];
      for (const [k, x] of view) if (have[k] !== x.h) { if (x.row) needRows.push(k); else docs[k] = JSON.parse(x.body); }
      if (needRows.length) {
        const got = (await ddb.prepare(`SELECT k, body FROM docs WHERE uid = ? AND k IN (${needRows.map(() => '?').join(',')})`).bind(uid, ...needRows).all()).results || [];
        for (const r of got) docs[r.k] = JSON.parse(r.body);
      }
      return json(request, 200, { docs });
    }
    if (req.op === 'push') {
      const entries = Object.entries(req.docs || {});
      if (!entries.length) return json(request, 200, { ok: true, n: 0 });
      if (entries.length > MAX_DOCS) return json(request, 413, { error: 'too-many' });
      for (const [k, d] of entries) {
        if (!KEY_RE.test(k) || !d || typeof d.h !== 'string' || typeof d.body !== 'string' || d.h.length > 64) return json(request, 400, { error: 'bad-doc', k });
        if (d.body.length > MAX_BODY) return json(request, 413, { error: 'doc-too-large', k });
      }
      // Câu ngữ cảnh (P2-1.1): chỉ nhóm thẻ có cờ x:1 (máy khách có ctx) mới giải nén để làm sạch ctx/src; còn lại đi thẳng (CPU ≈ 0, máy khách cũ không bị ảnh hưởng)
      for (const [k, d] of entries) if (d.x === 1 && k !== 'meta') { try { d.body = await cleanDocBody(d.body); } catch (e) { return json(request, 400, { error: 'bad-doc', k }); } }
      const legacy = async now => { const stmt = ddb.prepare('INSERT INTO docs (uid, k, h, body, updated) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT (uid, k) DO UPDATE SET h = ?3, body = ?4, updated = ?5 WHERE docs.h IS NOT ?3 OR docs.body IS NOT ?4'); await ddb.batch(entries.map(([k, d]) => stmt.bind(uid, k, d.h, d.body, now))); };
      if (!packOn(env)) { await legacy(Date.now()); return json(request, 200, { ok: true, n: entries.length }); }
      for (let attempt = 0; attempt < 3; attempt++) {
        const now = Date.now(), rows = (await ddb.prepare('SELECT k, h, body, updated FROM docs WHERE uid = ?').bind(uid).all()).results || [];
        const view = viewOf(rows), old = rows.find(r => r.k === 'pack'), hasRows = rows.some(r => r.k !== 'pack');
        let changed = 0;
        for (const [k, d] of entries) { const x = view.get(k); if (!x || x.h !== d.h || !sameBody(k, x.body, d.body)) { view.set(k, { h: d.h, body: d.body, updated: now }); changed++; } }
        if (!changed && !hasRows) return json(request, 200, { ok: true, n: entries.length, same: true }); // đẩy lại y hệt → 0 dòng ghi
        const p = packOf(view);
        if (p.body.length > PACK_MAX) { await legacy(now); return json(request, 200, { ok: true, n: entries.length }); } // quá lớn cho 1 dòng → dòng riêng (đè lên gói nhờ updated mới hơn)
        const st = [old
          ? ddb.prepare("UPDATE docs SET h = ?2, body = ?3, updated = ?4 WHERE uid = ?1 AND k = 'pack' AND h = ?5").bind(uid, p.h, p.body, now, old.h)
          : ddb.prepare("INSERT OR IGNORE INTO docs (uid, k, h, body, updated) VALUES (?1, 'pack', ?2, ?3, ?4)").bind(uid, p.h, p.body, now)];
        // Dọn dòng riêng đã gộp: chỉ khi gói vừa ghi là của lượt này (điều kiện EXISTS) và dòng không mới hơn lúc đọc
        if (hasRows) st.push(ddb.prepare("DELETE FROM docs WHERE uid = ?1 AND k <> 'pack' AND updated <= ?3 AND EXISTS (SELECT 1 FROM docs WHERE uid = ?1 AND k = 'pack' AND h = ?2)").bind(uid, p.h, Math.max(0, ...rows.filter(r => r.k !== 'pack').map(r => +r.updated || 0))));
        const res = await ddb.batch(st), ch = res && res[0] && res[0].meta ? res[0].meta.changes : undefined;
        if (ch === 0) continue; // máy khác vừa ghi gói → đọc lại, gộp lại
        return json(request, 200, { ok: true, n: entries.length });
      }
      return json(request, 409, { error: 'busy' }); // 3 lần đều đụng → máy khách giữ "chưa gửi", tự thử lại lượt sau
    }
    return json(request, 400, { error: 'op' });
  } catch (e) {
    // Hết hạn mức D1 trong ngày → báo client tạm nghỉ (dữ liệu vẫn trên máy)
    const quota = /limit|exceeded|quota|too many/i.test(String(e && e.message));
    return json(request, quota ? 429 : 500, { error: quota ? 'quota' : 'server' });
  }
}
