/* Xóa tài khoản (yêu cầu của Google Play "Account deletion" + App Store 5.1.1(v)).
 * POST /api/account  (Authorization: Bearer <Firebase ID token>)  { op: 'delete', confirm: 'DELETE' }
 *   → { ok: true, firebase: 'deleted' | 'client' }   ('client' = máy khách tự gọi user.delete() của Firebase)
 *   → 401 { error: 'reauth' } khi lần đăng nhập gần nhất đã quá 10 phút (chống dùng token bị lộ để xóa tài khoản người khác)
 * Xóa trên D1: dữ liệu học đã đồng bộ (docs), hồ sơ tài khoản (users), liên kết mã khách ↔ tài khoản (vid_uid), bảng xếp hạng
 * (league_member, league_week). Báo lỗi đã gửi: GỠ liên kết (uid, email, nhận tin) – nội dung lỗi ẩn danh giữ lại để sửa lỗi.
 * Tài khoản Firebase Authentication: xóa qua REST accounts:delete bằng chính ID token của người dùng (không cần khóa quản trị). */
import { claims as verifyClaims, limit } from './sync.js';

const RECENT_SEC = 600; // phải đăng nhập lại trong 10 phút gần nhất
// Khóa API web Firebase của dự án lexkite-app – công khai theo thiết kế (giống web/js/firebase-config.js); env.FIREBASE_API_KEY đè nếu có
const FB_KEY = 'AIzaSyAPqVo0Fs0HUb5spUaLYZqhFxw1y6zmLnQ';
const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost)$/;

const cors = req => {
  const o = req.headers.get('Origin') || '';
  return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {};
};
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

// Thứ tự: dữ liệu trước, hồ sơ sau. Bảng chưa từng được tạo (vd. chưa ai tham gia bảng xếp hạng) → bỏ qua, không làm hỏng cả lượt xóa.
export const DELETE_SQL = [
  'DELETE FROM docs WHERE uid = ?1',
  'DELETE FROM league_week WHERE uid = ?1',
  'DELETE FROM league_member WHERE uid = ?1',
  'DELETE FROM vid_uid WHERE uid = ?1',
  'DELETE FROM user_backups WHERE uid = ?1',
  'DELETE FROM notice_reads WHERE uid = ?1',
  "UPDATE reports SET uid = '', email = '', notify = 0 WHERE uid = ?1",
  'DELETE FROM users WHERE uid = ?1',
];
export async function deleteUserData(db, uid) {
  if (typeof uid !== 'string' || !uid || uid.length > 128) throw new Error('uid');
  const done = [];
  for (const sql of DELETE_SQL) {
    try { await db.prepare(sql).bind(uid).run(); done.push(sql.match(/(?:FROM|UPDATE) (\w+)/)[1]); } catch (e) {
      if (!/no such table/i.test(String(e && e.message))) throw e;
    }
  }
  return done;
}

export async function firebaseDelete(idToken, env, fetcher = fetch) {
  try {
    const r = await fetcher('https://identitytoolkit.googleapis.com/v1/accounts:delete?key=' + encodeURIComponent((env && env.FIREBASE_API_KEY) || FB_KEY), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Referer: 'https://lexkite.com/' }, body: JSON.stringify({ idToken }),
    });
    return r.ok ? 'deleted' : 'client';
  } catch (e) { return 'client'; }
}

export async function handle(request, env, deps = {}) {
  const { claims = verifyClaims, fbDelete = firebaseDelete, rate = limit, now = Date.now() / 1000 } = deps;
  if (!env || !env.DB) return json(request, 500, { error: 'no-db' });
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const who = await claims(token).catch(() => null);
  const uid = who && who.sub;
  if (!uid) return json(request, 401, { error: 'auth' });
  let req;
  try { req = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!req || typeof req !== 'object' || req.op !== 'delete') return json(request, 400, { error: 'op' });
  if (req.confirm !== 'DELETE') return json(request, 400, { error: 'confirm' });
  if (!(typeof who.auth_time === 'number' && now - who.auth_time <= RECENT_SEC)) return json(request, 401, { error: 'reauth' });
  { const w = await rate(`acct-del:${uid}`, 3, 3600); if (w) return json(request, 429, { error: 'too-fast', wait: w }); }
  try {
    await deleteUserData(env.DB, uid);
  } catch (e) { return json(request, 500, { error: 'server' }); }
  const firebase = await fbDelete(token, env);
  return json(request, 200, { ok: true, firebase });
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });
export const onRequestPost = ({ request, env }) => handle(request, env);
