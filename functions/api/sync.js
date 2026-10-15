/* API đồng bộ dữ liệu học – Cloudflare Pages Functions + D1 (thay Firestore: hạn mức miễn phí lớn hơn nhiều lần).
 * POST /api/sync  (Authorization: Bearer <Firebase ID token>)
 *   { op: 'pull', have: { cards_0: 'hash', … } } → { docs: { meta: {...}, cards_3: {...} } }  (chỉ trả tài liệu có hash khác)
 *   { op: 'push', docs: { meta: { h, body }, cards_0: { h, body } } } → { ok: true, n }
 * Mỗi người chỉ đọc/ghi được dữ liệu của chính mình (uid lấy từ token đã xác minh chữ ký Google). */
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
  if (jwks && !force && Date.now() - jwksAt < 3600e3) return jwks;
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
  if (typeof body.sub !== 'string' || !body.sub || body.sub.length > 128) return null;
  return body;
}
export const verify = async (...a) => { const c = await claims(...a); return c ? c.sub : null; };


// Giới hạn tốc độ ở biên Cloudflare (Cache API – miễn phí, không tốn lượt ghi D1). Trả về số giây phải chờ, 0 = cho phép.
// Không tuyệt đối toàn cầu (đếm theo từng trung tâm dữ liệu) – đủ chặn spam/script tự động; người dùng thường không chạm tới.
export async function limit(key, max, windowSec) {
  try {
    const c = caches.default, req = new Request('https://rate.lexkite.internal/' + encodeURIComponent(key)), now = Date.now();
    const hit = await c.match(req); let st = hit ? await hit.json() : null;
    if (!st || st.reset <= now) st = { n: 0, reset: now + windowSec * 1000 };
    if (st.n >= max) return Math.ceil((st.reset - now) / 1000);
    st.n++;
    await c.put(req, new Response(JSON.stringify(st), { headers: { 'Cache-Control': `max-age=${Math.max(1, Math.ceil((st.reset - now) / 1000))}` } }));
    return 0;
  } catch (e) { return 0; } // bộ đếm lỗi → không chặn người dùng
}

async function setup(db) {
  if (ready) return;
  await db.prepare('CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1) WITHOUT ROWID').run();
  await db.prepare('CREATE TABLE IF NOT EXISTS docs (uid TEXT NOT NULL, k TEXT NOT NULL, h TEXT NOT NULL, body TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (uid, k)) WITHOUT ROWID').run();
  ready = true;
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  const uid = who && who.sub;
  if (!uid) return json(request, 401, { error: 'auth' });
  if (+(request.headers.get('Content-Length') || 0) > MAX_TOTAL) return json(request, 413, { error: 'too-large' });
  let req;
  try { req = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  // Mỗi tài khoản: kéo/đẩy mỗi chiều tối đa 1 lần/20 giây (app tự gom 3 phút/lần nên người dùng thường không chạm tới)
  { const w = await limit(`sync:${uid}:${req.op}`, 1, 20); if (w) return json(request, 429, { error: 'too-fast', wait: w }); }
  try {
    await setup(env.DB);
    if (req.op === 'pull') {
      // Sổ người dùng cho trang quản trị: chỉ ghi khi lần thấy trước đã hơn 1 giờ (tiết kiệm lượt ghi D1)
      const o = request.headers.get('Origin') || '', plat = /^chrome-extension:/.test(o) ? 'ext' : /^capacitor:/.test(o) ? 'app' : 'web', now = Date.now();
      await env.DB.prepare('INSERT INTO users (uid, email, name, created, seen, plat, n) VALUES (?1, ?2, ?3, ?4, ?4, ?5, 1) ON CONFLICT (uid) DO UPDATE SET email = ?2, name = ?3, seen = ?4, plat = ?5, n = n + 1 WHERE users.seen < ?4 - 3600000')
        .bind(uid, String(who.email || '').slice(0, 200), String(who.name || '').slice(0, 100), now, plat).run().catch(() => {});
      const have = req.have && typeof req.have === 'object' ? req.have : {};
      const { results } = await env.DB.prepare('SELECT k, h, body FROM docs WHERE uid = ?').bind(uid).all();
      const docs = {};
      for (const r of results || []) if (have[r.k] !== r.h) docs[r.k] = JSON.parse(r.body);
      return json(request, 200, { docs });
    }
    if (req.op === 'push') {
      const entries = Object.entries(req.docs || {});
      if (!entries.length) return json(request, 200, { ok: true, n: 0 });
      if (entries.length > MAX_DOCS) return json(request, 413, { error: 'too-many' });
      const now = Date.now(), stmt = env.DB.prepare('INSERT INTO docs (uid, k, h, body, updated) VALUES (?1, ?2, ?3, ?4, ?5) ON CONFLICT (uid, k) DO UPDATE SET h = ?3, body = ?4, updated = ?5');
      const batch = [];
      for (const [k, d] of entries) {
        if (!KEY_RE.test(k) || !d || typeof d.h !== 'string' || typeof d.body !== 'string' || d.h.length > 64) return json(request, 400, { error: 'bad-doc', k });
        if (d.body.length > MAX_BODY) return json(request, 413, { error: 'doc-too-large', k });
        batch.push(stmt.bind(uid, k, d.h, d.body, now));
      }
      await env.DB.batch(batch);
      return json(request, 200, { ok: true, n: batch.length });
    }
    return json(request, 400, { error: 'op' });
  } catch (e) {
    // Hết hạn mức D1 trong ngày → báo client tạm nghỉ (dữ liệu vẫn trên máy)
    const quota = /limit|exceeded|quota|too many/i.test(String(e && e.message));
    return json(request, quota ? 429 : 500, { error: quota ? 'quota' : 'server' });
  }
}
