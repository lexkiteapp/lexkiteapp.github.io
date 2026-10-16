/* Chuyển dữ liệu sang thiết bị khác bằng mã QR – KHÔNG cần đăng nhập (web/js/handoff.js).
 * Máy gửi mã hóa AES-GCM ngay trên máy; khóa nằm trong phần # của link QR (không bao giờ tới máy chủ).
 * Máy chủ chỉ giữ bản mã hóa tối đa 10 phút và xóa ngay sau lần đọc đầu tiên (dùng 1 lần).
 *   POST /api/handoff { op:'put', blob }  → { code, exp }      (blob = base64 bản mã hóa, ≤ 1,5 MB)
 *   POST /api/handoff { op:'get', code }  → { blob } | 404     (đọc xong là xóa)
 * Chống lạm dụng: giới hạn tần suất theo IP (Cache API ở biên), mã 10 ký tự ngẫu nhiên (~10^15 khả năng). */
import { limit } from './sync.js';

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
const TTL = 10 * 60 * 1000, MAX = 1_500_000, ALPHA = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });
export const newCode = () => { const b = crypto.getRandomValues(new Uint8Array(10)); return [...b].map(x => ALPHA[x % ALPHA.length]).join(''); };

let ready = false;
async function setup(db) { if (ready) return; await db.prepare('CREATE TABLE IF NOT EXISTS handoff (code TEXT PRIMARY KEY, blob TEXT NOT NULL, exp INTEGER NOT NULL) WITHOUT ROWID').run(); ready = true; }

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  if (!ORIGINS.test(request.headers.get('Origin') || '')) return json(request, 403, { error: 'origin' });
  if (+(request.headers.get('Content-Length') || 0) > MAX + 1000) return json(request, 413, { error: 'too-large' });
  const ip = request.headers.get('CF-Connecting-IP') || 'x';
  let req; try { req = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  const db = env.DB, now = Date.now();
  try {
    await setup(db);
    if (req.op === 'put') {
      { const w = await limit(`handoff-put:${ip}`, 6, 600); if (w) return json(request, 429, { error: 'too-fast', wait: w }); }
      const blob = String(req.blob || '');
      if (!blob || blob.length > MAX || !/^[A-Za-z0-9+/=]+$/.test(blob)) return json(request, 400, { error: 'blob' });
      await db.prepare('DELETE FROM handoff WHERE exp < ?').bind(now).run(); // dọn bản hết hạn (lười, không cần cron)
      const code = newCode();
      await db.prepare('INSERT INTO handoff (code, blob, exp) VALUES (?1, ?2, ?3)').bind(code, blob, now + TTL).run();
      return json(request, 200, { code, exp: now + TTL });
    }
    if (req.op === 'get') {
      { const w = await limit(`handoff-get:${ip}`, 20, 600); if (w) return json(request, 429, { error: 'too-fast', wait: w }); }
      const code = String(req.code || '').toUpperCase();
      if (!/^[A-Z2-9]{10}$/.test(code)) return json(request, 400, { error: 'code' });
      const row = await db.prepare('SELECT blob, exp FROM handoff WHERE code = ?').bind(code).first();
      if (row) await db.prepare('DELETE FROM handoff WHERE code = ?').bind(code).run(); // dùng 1 lần
      if (!row || row.exp < now) return json(request, 404, { error: 'expired' });
      return json(request, 200, { blob: row.blob });
    }
    return json(request, 400, { error: 'op' });
  } catch (e) { return json(request, 500, { error: 'server' }); }
}
