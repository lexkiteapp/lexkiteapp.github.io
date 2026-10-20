/* API thông báo người dùng (/api/notices) – Cloudflare Pages Functions + D1.
 * GET  /api/notices?lang=vi   (kèm Bearer token nếu đã đăng nhập)
 *      → trả danh sách thông báo hợp lệ cho người dùng đó kèm số chưa đọc.
 * POST /api/notices           (Authorization: Bearer <Firebase ID token>)
 *      { id: 'n_xxx', act: 'read' | 'click' }
 *      → ghi nhận đã đọc hoặc đã nhấp CTA vào D1 notice_reads.
 */
import { claims, limit } from './sync.js';

const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
const cors = req => {
  const o = req.headers.get('Origin') || '';
  return ORIGINS.test(o) ? {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  } : {};
};
const json = (req, status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) },
});
const ipOf = req => req.headers.get('CF-Connecting-IP') || req.headers.get('x-forwarded-for') || '127.0.0.1';

let ready = false;
async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS notices (id TEXT PRIMARY KEY, at INTEGER NOT NULL, by TEXT, title TEXT NOT NULL, body TEXT NOT NULL, kind TEXT NOT NULL DEFAULT \'info\', img TEXT, cta_label TEXT, cta_url TEXT, target TEXT, send_at INTEGER, expire_at INTEGER, lang TEXT, revoked INTEGER DEFAULT 0) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS notice_reads (id TEXT NOT NULL, uid TEXT NOT NULL, read_at INTEGER NOT NULL, clicked INTEGER DEFAULT 0, PRIMARY KEY (id, uid)) WITHOUT ROWID'),
  ]);
  ready = true;
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestGet({ request, env }) {
  if (!env || !env.DB) return json(request, 500, { error: 'no-db' });
  const ip = ipOf(request);
  const wait = await limit(`notices-get:${ip}`, 120, 60);
  if (wait) return json(request, 429, { error: 'too-fast', wait });

  const authHeader = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const who = authHeader ? await claims(authHeader).catch(() => null) : null;
  const uid = who && who.sub ? who.sub : null;

  const url = new URL(request.url);
  const lang0 = String(url.searchParams.get('lang') || 'all').toLowerCase().slice(0, 10), lang = /^[a-z]{2,3}(-[a-z0-9]{2,4})?$/.test(lang0) ? lang0 : 'all';
  const now = Date.now();
  const db = env.DB;

  try {
    await setup(db);

    let userRow = null;
    if (uid) {
      userRow = await db.prepare('SELECT plat, created, seen FROM users WHERE uid = ?').bind(uid).first();
    }

    // Lấy thông báo chưa bị thu hồi, đã tới giờ gửi, chưa hết hạn, đúng ngôn ngữ
    const rawNotices = (await db.prepare(`
      SELECT id, at, title, body, kind, img, cta_label, cta_url, target, send_at, expire_at, lang
      FROM notices
      WHERE revoked = 0
        AND (send_at IS NULL OR send_at <= ?1)
        AND (expire_at IS NULL OR expire_at > ?1)
        AND (lang = 'all' OR lang IS NULL OR lang = ?2)
      ORDER BY at DESC
      LIMIT 50
    `).bind(now, lang).all()).results || [];

    // Lọc theo đối tượng người nhận (target)
    const eligible = [];
    for (const n of rawNotices) {
      let tgt = { type: 'all' };
      try { tgt = JSON.parse(n.target || '{}'); } catch (e) { tgt = { type: 'all' }; }

      if (!tgt || tgt.type === 'all') {
        eligible.push({ ...n, target: tgt });
      } else if (tgt.type === 'users') {
        if (uid && Array.isArray(tgt.uids) && tgt.uids.includes(uid)) { // danh sách uid KHÔNG bao giờ trả về máy khách
          eligible.push({ ...n, target: tgt });
        }
      } else if (tgt.type === 'filter') {
        // Chỉ áp dụng khi đã đăng nhập
        if (!uid || !userRow) continue;
        if (tgt.plat && userRow.plat && tgt.plat !== userRow.plat) continue;
        if (tgt.inactiveDays && typeof tgt.inactiveDays === 'number') {
          if (now - (userRow.seen || 0) < tgt.inactiveDays * 864e5) continue;
        }
        if (tgt.newDays && typeof tgt.newDays === 'number') {
          if (now - (userRow.created || 0) > tgt.newDays * 864e5) continue;
        }
        eligible.push({ ...n, target: tgt });
      }
    }

    // Ghép trạng thái đã đọc nếu có uid
    let readMap = new Map();
    if (uid && eligible.length) {
      const ids = eligible.map(n => n.id);
      const reads = (await db.prepare(`SELECT id, read_at, clicked FROM notice_reads WHERE uid = ? AND id IN (${ids.map(() => '?').join(',')})`).bind(uid, ...ids).all()).results || [];
      for (const r of reads) readMap.set(r.id, r);
    }

    const notices = eligible.map(n => {
      const rd = readMap.get(n.id);
      return {
        id: n.id,
        at: n.at,
        title: n.title,
        body: n.body,
        kind: n.kind,
        img: n.img,
        cta_label: n.cta_label,
        cta_url: n.cta_url,
        read: !!rd,
        read_at: rd ? rd.read_at : null,
        clicked: !!(rd && rd.clicked),
      };
    });

    const unread_count = notices.filter(n => !n.read).length;
    return json(request, 200, { ok: true, notices, unread_count });
  } catch (err) {
    return json(request, 500, { error: 'server' });
  }
}

export async function onRequestPost({ request, env }) {
  if (!env || !env.DB) return json(request, 500, { error: 'no-db' });
  const ip = ipOf(request);
  const wait = await limit(`notices-post:${ip}`, 30, 60);
  if (wait) return json(request, 429, { error: 'too-fast', wait });

  const authHeader = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  const who = authHeader ? await claims(authHeader).catch(() => null) : null;
  const uid = who && who.sub ? who.sub : null;

  if (+(request.headers.get('Content-Length') || 0) > 1024) return json(request, 413, { error: 'too-large' });
  let b;
  try { const raw = await request.text(); if (raw.length > 1024) return json(request, 413, { error: 'too-large' }); b = JSON.parse(raw); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!b || typeof b !== 'object') return json(request, 400, { error: 'json' });

  const id = String(b.id || '').trim();
  if (!/^n_[a-z0-9_]{4,40}$/.test(id)) return json(request, 400, { error: 'id-invalid' });
  const act = b.act === 'click' ? 'click' : 'read';

  // Nếu người dùng chưa đăng nhập, trả về thành công để máy khách tự ghi nhớ trên localStorage
  if (!uid) return json(request, 200, { ok: true, anon: true });

  const db = env.DB;
  const now = Date.now();
  const clicked = act === 'click' ? 1 : 0;

  try {
    await setup(db);
    // Chỉ ghi cho thông báo có thật, còn hiệu lực (chặn spam bảng notice_reads bằng id bịa)
    const ok = await db.prepare('SELECT 1 AS x FROM notices WHERE id = ? AND revoked = 0').bind(id).first();
    if (!ok) return json(request, 404, { error: 'not-found' });
    await db.prepare(`
      INSERT INTO notice_reads (id, uid, read_at, clicked)
      VALUES (?1, ?2, ?3, ?4)
      ON CONFLICT(id, uid) DO UPDATE SET
        clicked = CASE WHEN ?4 = 1 THEN 1 ELSE clicked END
    `).bind(id, uid, now, clicked).run();

    return json(request, 200, { ok: true });
  } catch (err) {
    return json(request, 500, { error: 'server' });
  }
}
