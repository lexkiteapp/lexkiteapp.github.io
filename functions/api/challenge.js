/* 🎤 Thử thách nói 30 giây (docs/specs/score-card.md) – lưu thẻ điểm ẩn danh để bạn bè mở link /c/<id> và so điểm. $0 (D1), không dữ liệu cá nhân.
 *   POST /api/challenge { op:'create', fl, pr, pid, lang }   → { id }                  (điểm tổng + CEFR do MÁY CHỦ tính lại từ fl/pr – không tin số máy khách gửi)
 *   POST /api/challenge { op:'reply', id }                    → { plays }               (bạn đã làm xong bài này; đếm cho người tạo, 1 lượt/IP/giờ/id)
 *   GET  /api/challenge?id=<id>                               → { fl, pr, score, cefr, pid, lang, plays } | 404
 * Chống lạm dụng: tạo ≤ 5/giờ/IP + cổng người thật Turnstile (humanGate, tắt khi chưa cấu hình) ; đọc ≤ 120/phút/IP ; id 10 ký tự ngẫu nhiên (~10^15) ; thẻ giữ 90 ngày rồi dọn lười.
 * Công thức điểm/CEFR PHẢI khớp web/cpack/score-app/score30.js (test scripts/test/score-card.mjs so khớp). */
import { limit } from './sync.js';
import { humanGate } from './_human.js';
import { once } from './_schema.js';
import { readJSON, bodyFail } from './_body.js';

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost)$/;
const ALPHA = 'abcdefghjkmnpqrstuvwxyz23456789', KEEP = 90 * 864e5, LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
export const ID_RE = /^[a-hjkmnp-z2-9]{10}$/;
export const PROMPTS = 8; // số đoạn đọc trong web/cpack/score-app/score30.js (pid 0..7)
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Content-Type, X-Lexkite-Device, X-Lexkite-Human', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', Vary: 'Origin' } : {}; };
const json = (req, status, data, cache = 'no-store') => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': cache, ...cors(req) } });

export const newId = () => [...crypto.getRandomValues(new Uint8Array(10))].map(x => ALPHA[x % ALPHA.length]).join('');
/** Điểm tổng 0–100 từ lưu loát (fl) + phát âm (pr). */
export const overall = (fl, pr) => Math.round(0.45 * fl + 0.55 * pr);
/** Ước lượng CEFR từ điểm tổng (ước lượng vui, không phải kết quả thi). */
export const cefrOf = s => (s < 30 ? 'A1' : s < 45 ? 'A2' : s < 60 ? 'B1' : s < 75 ? 'B2' : s < 88 ? 'C1' : 'C2');
const int = (v, lo, hi) => { const n = Number(v); return Number.isInteger(n) && n >= lo && n <= hi ? n : null; };
/** Thẻ hợp lệ → { fl, pr, score, cefr, pid, lang } hoặc null. Điểm tổng & CEFR luôn tính lại ở đây. */
export function cardOf(o) {
  if (!o || typeof o !== 'object') return null;
  const fl = int(o.fl, 0, 100), pr = int(o.pr, 0, 100), pid = int(o.pid, 0, PROMPTS - 1);
  if (fl === null || pr === null || pid === null) return null;
  const score = overall(fl, pr), lang = LANGS.includes(o.lang) ? o.lang : 'en';
  return { fl, pr, score, cefr: cefrOf(score), pid, lang };
}

let ready = false;
async function setup(db) {
  if (ready) return;
  await once(db, 'challenge', 1, async () => {
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS sc_card (id TEXT PRIMARY KEY, fl INTEGER NOT NULL, pr INTEGER NOT NULL, pid INTEGER NOT NULL, lang TEXT NOT NULL, plays INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL) WITHOUT ROWID'),
      db.prepare('CREATE INDEX IF NOT EXISTS sc_card_at ON sc_card (at)'),
    ]);
  });
  ready = true;
}
/** Đọc 1 thẻ (dùng chung với functions/c/[[path]].js) → card + plays hoặc null. */
export async function getCard(db, id) {
  if (!db || !ID_RE.test(id || '')) return null;
  await setup(db);
  const r = await db.prepare('SELECT fl, pr, pid, lang, plays FROM sc_card WHERE id = ?1').bind(id).first();
  return r ? { ...cardOf(r), plays: r.plays | 0 } : null;
}
const ipOf = request => request.headers.get('CF-Connecting-IP') || 'x';

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestGet({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  if (await limit(`sc-get:${ipOf(request)}`, 120, 60)) return json(request, 429, { error: 'too-fast' });
  try {
    const c = await getCard(env.DB, new URL(request.url).searchParams.get('id'));
    return c ? json(request, 200, c, 'public, max-age=60') : json(request, 404, { error: 'not-found' });
  } catch (e) { return json(request, 500, { error: 'db' }); }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  if (!ORIGINS.test(request.headers.get('Origin') || '')) return json(request, 403, { error: 'origin' });
  let req; try { req = await readJSON(request, 2048); } catch (e) { const f = bodyFail(e); return json(request, f.status, { error: f.error }); }
  const db = env.DB, now = Date.now(), ip = ipOf(request);
  try {
    await setup(db);
    if (req.op === 'create') {
      const w = await limit(`sc-new:${ip}`, 5, 3600); if (w) return json(request, 429, { error: 'too-fast', wait: w });
      const h = await humanGate(request, env, {}); if (!h.ok) return json(request, h.status, { error: h.error });
      const c = cardOf(req); if (!c) return json(request, 400, { error: 'card' });
      await db.prepare('DELETE FROM sc_card WHERE at < ?1').bind(now - KEEP).run(); // dọn lười, không cần cron
      const id = newId();
      await db.prepare('INSERT INTO sc_card (id, fl, pr, pid, lang, at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(id, c.fl, c.pr, c.pid, c.lang, now).run();
      return json(request, 200, { id });
    }
    if (req.op === 'reply') {
      if (!ID_RE.test(req.id || '')) return json(request, 400, { error: 'id' });
      if (await limit(`sc-rep:${ip}:${req.id}`, 1, 3600)) return json(request, 200, { dup: true }); // 1 lượt/IP/giờ/thẻ: chống bơm số lượt
      const r = await db.prepare('UPDATE sc_card SET plays = plays + 1 WHERE id = ?1 RETURNING plays').bind(req.id).first();
      return r ? json(request, 200, { plays: r.plays | 0 }) : json(request, 404, { error: 'not-found' });
    }
    return json(request, 400, { error: 'op' });
  } catch (e) { return json(request, 500, { error: 'db' }); }
}
