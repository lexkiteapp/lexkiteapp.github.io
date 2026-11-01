/* ⏰ lexkite-push – cron Worker gửi lời nhắc học (docs/REMINDERS.md). Không có URL công khai, không giữ dữ liệu.
 * Mỗi 10 phút: POST lexkite.com/api/push {op:'due'} (X-Push-Cron) → máy chủ (D1 nội bộ, cầu dao + ngân sách điều phối) trả ≤ 40 thiết bị đến giờ ĐỊA PHƯƠNG
 *  · Web Push: push RỖNG (không payload → không cần mã hóa, không dữ liệu cá nhân qua dịch vụ push) + VAPID (ES256, WebCrypto). SW tự lấy câu nhắc đã dịch trong cache.
 *  · FCM HTTP v1 (app gốc, cờ FCM_ON): thông báo kéo lại/tiến bộ tuần theo NGÔN NGỮ giao diện (copy.json, 15 ngôn ngữ, rơi về en) – token OAuth từ service account (RS256).
 * 404/410 (web) · UNREGISTERED/INVALID_ARGUMENT (FCM) → {op:'gone'} xóa đăng ký. Tổng lượt gọi ra ≤ 1 + 1 + 40 + 1 < 50 (giới hạn subrequest gói Free).
 * Bí mật: PUSH_CRON_SECRET, VAPID_PUBLIC, VAPID_PRIVATE_JWK, (tùy chọn) FCM_SA = JSON service account. Biến: API (mặc định https://lexkite.com), VAPID_SUB. */
import COPY from './copy.json';

const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uStr = s => b64u(enc.encode(s));
const pem2der = pem => Uint8Array.from(atob(pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
export const PUSH_HOST = /^https:\/\/(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-z0-9.-]+\.push\.apple\.com|[a-z0-9.-]+\.notify\.windows\.com|push\.services\.mozilla\.com)\//;

async function vapidJwt(env, aud, now) {
  const key = await crypto.subtle.importKey('jwk', JSON.parse(env.VAPID_PRIVATE_JWK), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = b64uStr(JSON.stringify({ typ: 'JWT', alg: 'ES256' })), body = b64uStr(JSON.stringify({ aud, exp: Math.floor(now / 1000) + 12 * 3600, sub: env.VAPID_SUB || 'mailto:support@lexkite.com' }));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(head + '.' + body)); // WebCrypto trả r||s (đúng định dạng JWT)
  return head + '.' + body + '.' + b64u(sig);
}
async function sendWeb(env, ep, jwts, now) {
  if (!PUSH_HOST.test(ep)) return 'gone';
  const aud = new URL(ep).origin; if (!jwts[aud]) jwts[aud] = await vapidJwt(env, aud, now);
  const r = await fetch(ep, { method: 'POST', headers: { TTL: '14400', Urgency: 'normal', 'Content-Length': '0', Authorization: `vapid t=${jwts[aud]}, k=${env.VAPID_PUBLIC}` } });
  return r.status === 404 || r.status === 410 ? 'gone' : r.ok ? 'ok' : 'fail';
}
async function fcmToken(env, now) {
  const sa = JSON.parse(env.FCM_SA), key = await crypto.subtle.importKey('pkcs8', pem2der(sa.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const iat = Math.floor(now / 1000), head = b64uStr(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const body = b64uStr(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 }));
  const jwt = head + '.' + body + '.' + b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(head + '.' + body)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt });
  const j = await r.json(); if (!j.access_token) throw new Error('fcm-oauth'); return { tok: j.access_token, project: sa.project_id };
}
/** Câu theo ngôn ngữ giao diện; thiếu → en (không bao giờ vi cho người không-vi). */
export const copyOf = (lang, kind) => ((COPY[lang] || COPY.en)[kind] || COPY.en[kind] || COPY.en.back);
const ROUTE = { back: '#/review', miss: '#/home', week: '#/stats' };
export function fcmMessage(x) {
  const [title, body] = copyOf(x.lang, x.kind);
  return { message: { token: x.token, notification: { title, body }, data: { route: ROUTE[x.kind] || '#/review', tpl: 'r_' + x.kind }, android: { priority: 'normal', ttl: '14400s' }, apns: { headers: { 'apns-priority': '5' }, payload: { aps: { sound: 'default' } } } } };
}
async function sendFcm(auth, x) {
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${auth.project}/messages:send`, { method: 'POST', headers: { Authorization: 'Bearer ' + auth.tok, 'Content-Type': 'application/json' }, body: JSON.stringify(fcmMessage(x)) });
  if (r.ok) return 'ok';
  const t = await r.text().catch(() => ''); return r.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/.test(t) ? 'gone' : 'fail';
}
export async function run(env, now = Date.now()) {
  const API = env.API || 'https://lexkite.com', H = { 'Content-Type': 'application/json', 'X-Push-Cron': env.PUSH_CRON_SECRET };
  const r = await fetch(API + '/api/push', { method: 'POST', headers: H, body: '{"op":"due"}' });
  if (!r.ok) return { error: r.status };
  const due = await r.json(), gone = [], stat = { ok: 0, fail: 0, gone: 0, skip: due.skip || '' }, jwts = {};
  for (const x of due.web || []) { let s = 'fail'; try { if (env.VAPID_PRIVATE_JWK) s = await sendWeb(env, x.ep, jwts, now); } catch (e) { s = 'fail'; } stat[s]++; if (s === 'gone') gone.push(x.id); }
  if ((due.fcm || []).length && env.FCM_SA) {
    let auth = null; try { auth = await fcmToken(env, now); } catch (e) { stat.fail += due.fcm.length; }
    if (auth) for (const x of due.fcm) { let s = 'fail'; try { s = await sendFcm(auth, x); } catch (e) { s = 'fail'; } stat[s]++; if (s === 'gone') gone.push(x.id); }
  }
  if (gone.length) await fetch(API + '/api/push', { method: 'POST', headers: H, body: JSON.stringify({ op: 'gone', ids: gone }) }).catch(() => {});
  console.log('push', JSON.stringify(stat));
  return stat;
}
export default { async scheduled(ev, env, ctx) { ctx.waitUntil(run(env)); } };
