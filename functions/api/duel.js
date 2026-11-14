/* 👻 Đấu bóng ma 60 giây (docs/specs/play-community-1211.md #1, upgrade-2026-11.md #11) – bất đồng bộ, không thời gian thực, $0 (D1).
 * Người chơi nộp lượt Thử thách 60 giây của mình (dấu vết trả lời); lượt người khác có điểm gần mình thành "bóng ma" để đua.
 * Ẩn danh hoàn toàn: KHÔNG trả biệt danh/uid, không tin nhắn, không tương tác → không có bề mặt quấy rối (mọi nhóm tuổi an toàn).
 * POST /api/duel (Authorization: Bearer <Firebase ID token>)
 *   { op:'submit', score, trace }  → { ok, best }      trace = [[ms, 1|0], …] (ms từ lúc bắt đầu, tăng dần, ≤ 60 500, ≤ 100 mục)
 *   { op:'ghost', mine }           → { ghost: { score, trace } | null }   mine = điểm tốt nhất của người gọi
 * Chống gian lận: máy chủ TÍNH LẠI điểm từ dấu vết (combo ×1/×2/×3 như play-blitz.js), từ chối nếu lệch, nhanh hơn người (< 250 ms/câu) hoặc quá giờ. */
import { claims, limit } from './sync.js';
import { gate } from './_quota.js';
import { once } from './_schema.js';

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
const DUR = 60000, SLACK = 500, MAXN = 100, MIN_GAP = 250, KEEP = 7 * 864e5;
const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });

const mult = combo => (combo >= 6 ? 3 : combo >= 3 ? 2 : 1); // PHẢI khớp web/cpack/play-app/play-blitz.js (test play-duel.mjs kiểm)
/** Kiểm dấu vết → điểm, hoặc null nếu không hợp lệ. */
export function scoreOf(trace) {
  if (!Array.isArray(trace) || !trace.length || trace.length > MAXN) return null;
  let prev = -MIN_GAP, combo = 0, score = 0;
  for (const e of trace) {
    if (!Array.isArray(e) || e.length !== 2) return null;
    const [t, ok] = e;
    if (!Number.isInteger(t) || t < 0 || t > DUR + SLACK || t - prev < MIN_GAP || (ok !== 0 && ok !== 1)) return null;
    prev = t;
    if (ok) { combo++; score += 10 * mult(combo); } else combo = 0;
  }
  return score;
}

let ready = false;
async function setup(db) {
  if (ready) return;
  await once(db, 'duel', 1, async () => {
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS duel_run (uid TEXT PRIMARY KEY, score INTEGER NOT NULL, trace TEXT NOT NULL, at INTEGER NOT NULL) WITHOUT ROWID'),
      db.prepare('CREATE INDEX IF NOT EXISTS duel_run_score ON duel_run (score, at)'),
    ]);
  });
  ready = true;
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  const uid = who && who.sub;
  if (!uid) return json(request, 401, { error: 'auth' });
  let req; try { req = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  { const wait = await limit(`duel:${uid}`, 10, 60); if (wait) return json(request, 429, { error: 'too-fast', wait }); }
  { const q = await gate(request, env, 'league', { who, json }); if (q.res) return q.res; } // dùng chung hạn mức ngày của giải tuần (docs/QUOTAS.md)
  const db = env.DB, now = Date.now();
  try {
    await setup(db);
    if (req.op === 'submit') {
      const score = scoreOf(req.trace);
      if (score === null || score !== (req.score | 0)) return json(request, 400, { error: 'trace' });
      const cur = await db.prepare('SELECT score, at FROM duel_run WHERE uid = ?').bind(uid).first();
      if (!cur || score > cur.score || now - cur.at > KEEP) {
        await db.prepare('INSERT INTO duel_run (uid, score, trace, at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(uid) DO UPDATE SET score = ?2, trace = ?3, at = ?4').bind(uid, score, JSON.stringify(req.trace), now).run();
        return json(request, 200, { ok: true, best: score });
      }
      return json(request, 200, { ok: true, best: cur.score });
    }
    if (req.op === 'ghost') {
      const mine = Math.max(0, Math.min(2000, Math.floor(+req.mine || 0)));
      // Cùng trình: điểm trong [0.8×, 1.3×+20]; không có thì mở rộng → người gần nhất. Chỉ lượt ≤ 7 ngày, không phải của chính mình.
      let row = await db.prepare('SELECT score, trace FROM duel_run WHERE uid != ?1 AND at > ?2 AND score BETWEEN ?3 AND ?4 ORDER BY RANDOM() LIMIT 1').bind(uid, now - KEEP, Math.floor(mine * 0.8), Math.ceil(mine * 1.3) + 20).first();
      if (!row) row = await db.prepare('SELECT score, trace FROM duel_run WHERE uid != ?1 AND at > ?2 ORDER BY ABS(score - ?3) LIMIT 1').bind(uid, now - KEEP, mine).first();
      let trace = null; try { trace = row && JSON.parse(row.trace); } catch (e) { trace = null; }
      return json(request, 200, { ghost: row && trace ? { score: row.score, trace } : null });
    }
    return json(request, 400, { error: 'op' });
  } catch (e) { return json(request, 500, { error: 'server' }); }
}
