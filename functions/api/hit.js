/* Thống kê truy cập tự xây (thay Google Analytics – không cookie, không lưu IP, miễn phí trên D1).
 * POST /api/hit (navigator.sendBeacon):
 *   { t:'s', sid, vid, ret, path, cur, ref, lang, dev, plat, dur, pages, lcp, pv }  → 1 dòng/phiên (ghi đè khi phiên cập nhật)
 *     cur = trang đang xem (→ last_path, last = lúc nhận → "đang online"); pv = { route: số lượt xem mới từ lần gửi trước } (≤ 20 trang) → pageviews_day
 *   { t:'e', msg, src, line, path, ver }                              → gộp lỗi giống nhau thành 1 dòng + đếm
 * Quốc gia lấy từ Cloudflare (request.cf.country). vid = mã ngẫu nhiên trên máy người dùng, không gắn danh tính. */
let ready = false;
const ok = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
const BOT = /bot|crawl|spider|slurp|lighthouse|headless|playwright|puppeteer|preview/i;

export async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, vid TEXT, day TEXT NOT NULL, at INTEGER NOT NULL, country TEXT, ref TEXT, dev TEXT, lang TEXT, plat TEXT, path TEXT, dur INTEGER, pages INTEGER, ret INTEGER) WITHOUT ROWID'),
    db.prepare('CREATE INDEX IF NOT EXISTS sessions_day ON sessions (day)'),
    db.prepare('CREATE TABLE IF NOT EXISTS errors (h TEXT PRIMARY KEY, msg TEXT, src TEXT, path TEXT, ver TEXT, n INTEGER NOT NULL, first INTEGER NOT NULL, last INTEGER NOT NULL) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS pageviews_day (day TEXT NOT NULL, path TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, path)) WITHOUT ROWID'),
  ]);
  await db.prepare('ALTER TABLE sessions ADD COLUMN lcp INTEGER').run().catch(() => {}); // LCP thật (ms) – thêm sau
  await db.prepare('ALTER TABLE sessions ADD COLUMN last INTEGER').run().catch(() => {}); // lần cuối nhận tín hiệu (ms) – "đang online"
  await db.prepare('ALTER TABLE sessions ADD COLUMN last_path TEXT').run().catch(() => {}); // trang đang xem lúc gửi gần nhất
  await db.prepare('CREATE INDEX IF NOT EXISTS sessions_last ON sessions (last)').run().catch(() => {});
  ready = true;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || BOT.test(request.headers.get('User-Agent') || '')) return ok();
  let b; try { b = JSON.parse(await request.text()); } catch (e) { return ok(); }
  try {
    await setup(env.DB);
    const now = Date.now();
    if (b.t === 's' && /^[a-z0-9]{8,32}$/i.test(b.sid || '')) {
      let ref = cut(b.ref, 200); try { ref = ref ? new URL(ref).hostname.replace(/^www\./, '') : ''; } catch (e) { ref = ''; }
      if (/(^|\.)lexkite\.(com|pages\.dev)$/.test(ref)) ref = '';
      const day = new Date(now).toISOString().slice(0, 10), route = v => /^[a-z0-9-]{1,40}$/.test(v) ? v : '';
      const batch = [env.DB.prepare('INSERT INTO sessions (sid, vid, day, at, country, ref, dev, lang, plat, path, dur, pages, ret, lcp, last, last_path) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?4, ?15) ON CONFLICT (sid) DO UPDATE SET dur = ?11, pages = ?12, lcp = COALESCE(lcp, ?14), last = ?4, last_path = ?15')
        .bind(cut(b.sid, 32), cut(b.vid, 32), day, now, cut(request.cf && request.cf.country, 2) || 'XX', ref, cut(b.dev, 10), cut(b.lang, 8), cut(b.plat, 8), cut(b.path, 60), Math.min(Math.max(+b.dur || 0, 0), 86400), Math.min(+b.pages || 1, 999), b.ret ? 1 : 0, +b.lcp > 0 && +b.lcp < 60000 ? Math.round(+b.lcp) : null, route(cut(b.cur || b.path, 40)) || null)];
      // Lượt xem theo trang/ngày: chỉ phần tăng thêm từ lần gửi trước (tối đa 20 trang, mỗi trang ≤ 200) – cùng 1 lượt gọi D1
      if (b.pv && typeof b.pv === 'object') for (const [k, v] of Object.entries(b.pv).slice(0, 20)) {
        const n = Math.min(Math.floor(+v || 0), 200); if (n > 0 && route(k)) batch.push(env.DB.prepare('INSERT INTO pageviews_day (day, path, n) VALUES (?1, ?2, ?3) ON CONFLICT (day, path) DO UPDATE SET n = n + ?3').bind(day, k, n));
      }
      await env.DB.batch(batch);
    } else if (b.t === 'e' && b.msg) {
      const msg = cut(b.msg, 300), src = cut(b.src, 200) + (b.line ? ':' + (+b.line || 0) : '');
      await env.DB.prepare('INSERT INTO errors (h, msg, src, path, ver, n, first, last) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6) ON CONFLICT (h) DO UPDATE SET n = n + 1, last = ?6, path = ?4, ver = ?5')
        .bind(await sha(msg + '|' + src), msg, src, cut(b.path, 60), cut(b.ver, 30), now).run();
    }
  } catch (e) { /* thống kê không bao giờ được làm hỏng app */ }
  return ok();
}
