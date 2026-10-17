/* Thống kê truy cập tự xây (thay Google Analytics – không cookie, không lưu IP, miễn phí trên D1).
 * POST /api/hit (navigator.sendBeacon):
 *   { t:'s', sid, vid, ret, path, cur, ref, lang, dev, plat, dur, pages, lcp, pv }  → 1 dòng/phiên (ghi đè khi phiên cập nhật)
 *     cur = trang đang xem (→ last_path, last = lúc nhận → "đang online"); pv = { route: số lượt xem mới từ lần gửi trước } (≤ 20 trang) → pageviews_day
 *   { t:'e', msg, src, line, path, ver }                              → gộp lỗi giống nhau thành 1 dòng + đếm
 *   { t:'x', vid, day, ev:{lookup,save,popup,newtab}, prev:{day, ev}, ver, lang } → add-on Chrome: 1 lượt/ngày/máy → ext_daily (lấy MAX, gửi lại không cộng trùng)
 *   { t:'x', vid, ev:{install|update|uninstall:1}, reason }           → ext_events (đếm theo ngày; lý do gỡ = kind 'uninstall:<lý do>')
 * Quốc gia lấy từ Cloudflare (request.cf.country). vid = mã ngẫu nhiên trên máy người dùng, không gắn danh tính. */
import { limit } from './sync.js';
import { gate } from './_quota.js';

let ready = false;
const ok = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
const DAY = 86400e3, dayOf = t => new Date(t).toISOString().slice(0, 10);
const VID = /^[a-z0-9]{8,32}$/i, REASONS = ['notuse', 'noisy', 'bugs', 'privacy', 'alt', 'other'];
const cnt = v => Math.min(Math.max(Math.floor(+v || 0), 0), 5000);
// Ngày máy khách gửi: chỉ nhận YYYY-MM-DD trong [hôm nay − back ngày, hôm nay] (giờ UTC)
const okDay = (d, now, back) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && d <= dayOf(now) && d >= dayOf(now - back * DAY) ? d : '';
const BOT = /bot|crawl|spider|slurp|lighthouse|headless|playwright|puppeteer|preview/i;

export async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, vid TEXT, day TEXT NOT NULL, at INTEGER NOT NULL, country TEXT, ref TEXT, dev TEXT, lang TEXT, plat TEXT, path TEXT, dur INTEGER, pages INTEGER, ret INTEGER) WITHOUT ROWID'),
    db.prepare('CREATE INDEX IF NOT EXISTS sessions_day ON sessions (day)'),
    db.prepare('CREATE TABLE IF NOT EXISTS errors (h TEXT PRIMARY KEY, msg TEXT, src TEXT, path TEXT, ver TEXT, n INTEGER NOT NULL, first INTEGER NOT NULL, last INTEGER NOT NULL) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS pageviews_day (day TEXT NOT NULL, path TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, path)) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS ext_daily (day TEXT NOT NULL, vid TEXT NOT NULL, lookup INTEGER, save INTEGER, popup INTEGER, newtab INTEGER, ver TEXT, PRIMARY KEY (day, vid)) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS ext_events (day TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, kind)) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS vid_uid (vid TEXT PRIMARY KEY, uid TEXT NOT NULL, at INTEGER NOT NULL) WITHOUT ROWID'),
  ]);
  await db.prepare('ALTER TABLE sessions ADD COLUMN lcp INTEGER').run().catch(() => {}); // LCP thật (ms) – thêm sau
  await db.prepare('ALTER TABLE sessions ADD COLUMN last INTEGER').run().catch(() => {}); // lần cuối nhận tín hiệu (ms) – "đang online"
  await db.prepare('ALTER TABLE sessions ADD COLUMN last_path TEXT').run().catch(() => {}); // trang đang xem lúc gửi gần nhất
  await db.prepare('CREATE INDEX IF NOT EXISTS sessions_last ON sessions (last)').run().catch(() => {});
  ready = true;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB || BOT.test(request.headers.get('User-Agent') || '')) return ok();
  if ((await gate(request, env, 'hit', { who: null })).res) return ok(); // 1 IP gửi dồn dập → bỏ qua im lặng (thống kê không bao giờ làm hỏng app)
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
    } else if (b.t === 'x' && b.ev && typeof b.ev === 'object') {
      // Add-on Chrome: giới hạn 20 lượt/giờ cho mỗi máy (vid) hoặc mỗi IP (trang gỡ cài đặt) – chỉ ở bộ đệm biên, không lưu IP
      const vid = VID.test(b.vid || '') ? String(b.vid).toLowerCase() : '';
      if (await limit('hx:' + (vid || await sha('ip|' + (request.headers.get('CF-Connecting-IP') || '?'))), 20, 3600)) return ok();
      const today = dayOf(now), ver = /^[0-9.]{1,20}$/.test(b.ver || '') ? b.ver : '', ev = b.ev, batch = [];
      const daily = (day, e) => env.DB.prepare('INSERT INTO ext_daily (day, vid, lookup, save, popup, newtab, ver) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT (day, vid) DO UPDATE SET lookup = MAX(lookup, ?3), save = MAX(save, ?4), popup = MAX(popup, ?5), newtab = MAX(newtab, ?6), ver = ?7')
        .bind(day, vid, cnt(e.lookup), cnt(e.save), cnt(e.popup), cnt(e.newtab), ver);
      const event = kind => env.DB.prepare('INSERT INTO ext_events (day, kind, n) VALUES (?1, ?2, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1').bind(today, kind);
      if (vid && ['lookup', 'save', 'popup', 'newtab'].some(k => cnt(ev[k]) > 0)) batch.push(daily(okDay(b.day, now, 1) || today, ev));
      const p = b.prev && typeof b.prev === 'object' ? b.prev : null, pd = p && p.ev && typeof p.ev === 'object' ? okDay(p.day, now, 30) : '';
      if (vid && pd && pd !== (okDay(b.day, now, 1) || today)) batch.push(daily(pd, p.ev));
      if (ev.install) batch.push(event('install')); else if (ev.update) batch.push(event('update'));
      if (ev.uninstall) batch.push(event('uninstall'));
      if (REASONS.includes(b.reason)) batch.push(event('uninstall:' + b.reason));
      if (batch.length) await env.DB.batch(batch);
    } else if (b.t === 'e' && b.msg) {
      const msg = cut(b.msg, 300), src = cut(b.src, 200) + (b.line ? ':' + (+b.line || 0) : '');
      await env.DB.prepare('INSERT INTO errors (h, msg, src, path, ver, n, first, last) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6) ON CONFLICT (h) DO UPDATE SET n = n + 1, last = ?6, path = ?4, ver = ?5')
        .bind(await sha(msg + '|' + src), msg, src, cut(b.path, 60), cut(b.ver, 30), now).run();
    }
  } catch (e) { /* thống kê không bao giờ được làm hỏng app */ }
  return ok();
}
