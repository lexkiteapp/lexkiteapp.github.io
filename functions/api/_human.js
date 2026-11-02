/* Xác minh "người thật" dùng chung (không phải route) – Turnstile + vé human ký HMAC. Tài liệu: docs/HUMAN.md
 * - Turnstile chỉ chạy được trên trang lexkite.com (app gốc capacitor:// báo 400020, service worker add-on không có DOM)
 *   → web/human.html (iframe ẩn) giải Turnstile → POST /api/human { token } → vé `h1.<payload>.<sig>` hạn 12 h,
 *   gắn mã thiết bị X-Lexkite-Device (tối đa 2 mã: trang add-on + service worker add-on). Máy khách gửi vé ở header X-Lexkite-Human.
 * - Khóa ký: HUMAN_TICKET_KEY (≥ 32 ký tự, tùy chọn) hoặc dẫn xuất HMAC từ TURNSTILE_SECRET_KEY. Chưa có cả hai → tắt (dev/test).
 * - siteverify lỗi mạng/không phải JSON → 'error' (FAIL CLOSED: endpoint trả 503 để máy khách thử lại, KHÔNG cho qua). */
export const HUMAN_HDR = 'X-Lexkite-Human';
export const TICKET_MS = 12 * 3600e3;
export const DEV_RE = /^[A-Za-z0-9_-]{16,64}$/; // khớp _quota.js
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const enc = new TextEncoder();
const b64u = u8 => btoa(String.fromCharCode(...u8)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => { const b = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(b, c => c.charCodeAt(0)); };

let kc = { src: '', key: null };
async function signKey(env) {
  const own = env.HUMAN_TICKET_KEY && String(env.HUMAN_TICKET_KEY).length >= 32 ? String(env.HUMAN_TICKET_KEY) : '';
  const ts = env.TURNSTILE_SECRET_KEY ? String(env.TURNSTILE_SECRET_KEY) : '';
  if (!own && !ts) return null;
  const src = own ? 'o:' + own : 't:' + ts;
  if (kc.src === src && kc.key) return kc.key;
  let raw = enc.encode(own);
  if (!own) { // dẫn xuất: HMAC(TURNSTILE_SECRET_KEY, nhãn) – không dùng thẳng secret Turnstile làm khóa ký
    const k0 = await crypto.subtle.importKey('raw', enc.encode(ts), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    raw = new Uint8Array(await crypto.subtle.sign('HMAC', k0, enc.encode('lexkite-human-ticket-v1')));
  }
  kc = { src, key: await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']) };
  return kc.key;
}

/** Đã cấu hình xác minh người thật chưa (có TURNSTILE_SECRET_KEY)? */
export const humanOn = env => !!(env && env.TURNSTILE_SECRET_KEY);

/** Gọi Turnstile siteverify → 'ok' | 'bad' | 'error' (lỗi mạng/5xx/không đọc được = 'error', KHÔNG coi là hợp lệ). */
export async function siteverify(env, token, ip) {
  const t = String(token || '');
  if (!t || t.length > 2048) return 'bad';
  try {
    const p = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: t });
    if (ip) p.set('remoteip', ip);
    const r = await fetch(SITEVERIFY, { method: 'POST', body: p, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return 'error';
    const j = await r.json();
    if (j && j.success === true) return 'ok';
    const codes = (j && j['error-codes']) || [];
    return codes.includes('internal-error') ? 'error' : 'bad';
  } catch (e) { return 'error'; }
}

/** Vé mới cho 1–2 mã thiết bị. */
export async function issueTicket(env, devs, now = Date.now()) {
  const key = await signKey(env); if (!key) return null;
  const d = [...new Set(devs.filter(x => DEV_RE.test(String(x || ''))))].slice(0, 2); if (!d.length) return null;
  const e = now + TICKET_MS, body = 'h1.' + b64u(enc.encode(JSON.stringify({ d, e })));
  return { ticket: body + '.' + b64u(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(body)))), exp: e };
}

/** Vé hợp lệ (chữ ký đúng, chưa hết hạn, không hạn xa quá 12 h, đúng mã thiết bị)? */
export async function checkTicket(env, ticket, dev, now = Date.now()) {
  const m = String(ticket || '').match(/^(h1\.[A-Za-z0-9_-]{8,400})\.([A-Za-z0-9_-]{43})$/);
  if (!m || !DEV_RE.test(String(dev || ''))) return false;
  const key = await signKey(env); if (!key) return false;
  let sig; try { sig = unb64u(m[2]); } catch (e) { return false; }
  if (!(await crypto.subtle.verify('HMAC', key, sig, enc.encode(m[1])))) return false; // verify = so sánh thời gian hằng
  let p; try { p = JSON.parse(new TextDecoder().decode(unb64u(m[1].slice(3)))); } catch (e) { return false; }
  return !!p && Array.isArray(p.d) && p.d.includes(dev) && Number.isFinite(p.e) && p.e > now && p.e <= now + TICKET_MS + 60e3;
}

/** Cổng người thật cho request ẩn danh. opt: { who (claims đã xác minh), token (Turnstile tùy chọn) }
 *  → { ok: true, via: 'auth'|'ticket'|'turnstile'|'off' } | { ok: false, status: 403|503, error: 'human'|'turnstile'|'turnstile-unavailable' } */
export async function humanGate(request, env, opt = {}) {
  if (opt.who && opt.who.sub) return { ok: true, via: 'auth' };
  if (!humanOn(env)) return { ok: true, via: 'off' };
  const dev = request.headers.get('X-Lexkite-Device') || '', tk = request.headers.get(HUMAN_HDR) || '';
  if (tk && await checkTicket(env, tk, dev)) return { ok: true, via: 'ticket' };
  if (opt.token) {
    const v = await siteverify(env, opt.token, request.headers.get('CF-Connecting-IP') || '');
    if (v === 'ok') return { ok: true, via: 'turnstile' };
    return v === 'error' ? { ok: false, status: 503, error: 'turnstile-unavailable' } : { ok: false, status: 403, error: 'turnstile' };
  }
  // Chuyển tiếp (02/11): add-on/app gốc BẢN CŨ chưa có web/js/human.js → không gửi được token/vé. Trang web luôn mới (sw.js) nên Origin web
  // thiếu bằng chứng → chặn ngay; Origin khác (chrome-extension://, capacitor://, không Origin) chỉ chặn khi bật cờ chung AI_HUMAN_ENFORCE='1'
  // (bật khi add-on mới lên CWS + app nhận OTA – docs/HUMAN.md). Origin giả được → đây là lớp chuyển tiếp, vẫn có hạn mức _quota.js + WAF RL.
  if (!WEB_ORIGIN.test(request.headers.get('Origin') || '') && String(env.AI_HUMAN_ENFORCE || '') !== '1') return { ok: true, via: 'legacy' };
  return { ok: false, status: 403, error: 'human' };
}
const WEB_ORIGIN = /^https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)$/;
