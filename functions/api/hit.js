/* Thống kê truy cập tự xây (thay Google Analytics – không cookie, không lưu IP, miễn phí trên D1).
 * POST /api/hit (navigator.sendBeacon):
 *   { t:'s', sid, vid, ret, path, cur, ref, lang, dev, plat, dur, pages, lcp, pv }  → 1 dòng/phiên (ghi đè khi phiên cập nhật)
 *     cur = trang đang xem (→ last_path, last = lúc nhận → "đang online"); pv = { route: số lượt xem mới từ lần gửi trước } (≤ 20 trang) → pageviews_day
 *   { t:'e', msg, src, line, path, ver }                              → gộp lỗi giống nhau thành 1 dòng + đếm
 *   { t:'x', vid, day, ev:{lookup,save,popup,newtab}, prev:{day, ev}, ver, lang } → add-on Chrome: 1 lượt/ngày/máy → ext_daily (lấy MAX, gửi lại không cộng trùng)
 *   { t:'x', vid, ev:{install|update|uninstall:1}, reason }           → ext_events (đếm theo ngày; lý do gỡ = kind 'uninstall:<lý do>')
 *   { t:'q', ev:'ext_land'|'ext_feat'|'ext_blog'|'ext_app'|'ext_set'|'ext_nudge' }        → bấm nút cài add-on: ext_events kind 'cta:<ev>' (chỉ đếm)
 *   { t:'q', ev:'quiz_view'|'quiz_done'|'quiz_cta' }                     → mini-quiz cuối bài blog: ext_events kind 'blog:<ev>' (chỉ đếm, không lưu bài/IP; 30 lượt/giờ/IP)
 * Quốc gia lấy từ Cloudflare (request.cf.country). vid = mã ngẫu nhiên trên máy người dùng, không gắn danh tính.
 * Định nghĩa (đồng bộ với Quản trị): khách = vid khác nhau · lượt xem = SUM(pages) · "ngày" = giờ Việt Nam (TZ, UTC+7) ·
 * máy tự động (CI, bot, máy chủ đám mây) vẫn ghi 1 dòng phiên nhưng có cột bot = loại → Quản trị tách riêng "đã loại", không cộng vào số người thật. */
import { limit } from './sync.js';
import { gate } from './_quota.js';
import { once } from './_schema.js';
import { adRows, guardOf } from './_ads.js';
import { purgeConfig } from './config.js';
const QUIZ_EV = ['quiz_view', 'quiz_done', 'quiz_cta'];
const VID_EV = ['view', 'done', 'quiz_ok', 'quiz_no', 'yt_fallback']; // t:'v' – video bài học (lesson-video.js)
const CTA_EV = ['ext_land', 'ext_feat', 'ext_blog', 'ext_app', 'ext_set', 'ext_nudge']; // bấm "Thêm vào Chrome" (web/js/ext-cta.js) → kind 'cta:<ev>'
const CTA_LANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr']; // 15 ngôn ngữ – chặn giá trị lạ làm phình bảng ext_events
const CTA_PAGES = ['vocab', 'samples', 'speaking', 'grammar', 'letters', 'blog'];
const SMART_CTA_EV = ['cta_addon_view', 'cta_addon_click', 'cta_pwa_view', 'cta_pwa_click', 'cta_topic_click']; // CTA trang tĩnh/từ vựng (scripts/lib/site-layout.mjs)

let ready = false;
const ok = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });
const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
const DAY = 86400e3;
// "Ngày" thống kê = lịch Việt Nam (khán giả chính) – mọi nơi ghi/đọc sessions.day, pageviews_day dùng chung hàm này
/* ---------- Analytics Engine (docs/CAPACITY.md §Kiến trúc A2) ----------
 * Binding HITS (wrangler.toml, dataset lexkite_hits). Điểm: blobs [sid, vid, day, country, ref, dev, lang, plat, path, cur, bot, kind 's'|'hb'],
 * doubles [dur, pages, ret, lcp, at], indexes [vid]. Ghi KÉP với D1 khi HIT_STORE = d1 (tích lũy lịch sử AE trước khi chuyển).
 * hitMode: 'hybrid' = nhịp hb chỉ vào AE (D1 bớt ~70 % dòng ghi thống kê) – cần binding HITS + khoá đọc AE (CF_ANALYTICS_TOKEN + CF_ACCOUNT_ID) để Quản trị đọc "đang online".
 * Cờ HIT_STORE: 'd1' (ép như cũ – rollback) · 'hybrid' (ép) · trống = tự bật khi đủ binding + khoá. */
export const aeReadable = env => !!(env && (env.CF_ANALYTICS_TOKEN || env.CF_API_TOKEN) && env.CF_ACCOUNT_ID);
const aeOn = env => !!(env && env.HITS && typeof env.HITS.writeDataPoint === 'function');
export function hitMode(env) { const m = env && env.HIT_STORE; if (m === 'd1') return 'd1'; if (m === 'hybrid') return aeOn(env) ? 'hybrid' : 'd1'; return aeOn(env) && aeReadable(env) ? 'hybrid' : 'd1'; }
export function aeHit(env, x) {
  if (!aeOn(env)) return false;
  try { env.HITS.writeDataPoint({ blobs: [x.sid, x.vid, x.day, x.country, x.ref, x.dev, x.lang, x.plat, x.path, x.cur, x.bot, x.kind], doubles: [x.dur, x.pages, x.ret, x.lcp, x.at], indexes: [x.vid || x.sid] }); return true; } catch (e) { return false; }
}
export const AE_DATASET = 'lexkite_hits';
/** Truy vấn SQL Analytics Engine (chỉ đọc) → mảng dòng; lỗi → null (Quản trị lùi về D1). */
export async function aeQuery(env, sql, fetcher = fetch) {
  if (!aeReadable(env)) return null;
  try {
    const r = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${String(env.CF_ACCOUNT_ID).replace(/[^a-f0-9]/gi, '')}/analytics_engine/sql`, { method: 'POST', headers: { Authorization: 'Bearer ' + (env.CF_ANALYTICS_TOKEN || env.CF_API_TOKEN) }, body: sql + ' FORMAT JSON' });
    if (!r.ok) return null; const j = await r.json(); return Array.isArray(j.data) ? j.data : null;
  } catch (e) { return null; }
}
/** "Đang online" trong 5 phút (người thật, trừ vid quản trị) từ AE → { n, viewing:[{k,n}] } | null */
export async function aeOnline(env, now = Date.now(), skipVids = [], fetcher = fetch) {
  const rows = await aeQuery(env, `SELECT blob2 AS vid, blob10 AS cur, double5 AS at FROM ${AE_DATASET} WHERE double5 > ${Math.floor(now - 5 * 60e3)} AND blob11 = '' ORDER BY double5 DESC LIMIT 20000`, fetcher);
  if (!rows) return null;
  const skip = new Set(skipVids), last = new Map();
  for (const r of rows) if (r.vid && !skip.has(r.vid) && !last.has(r.vid)) last.set(r.vid, r.cur || 'home');
  const by = {}; for (const c of last.values()) if (c !== 'admin') by[c] = (by[c] || 0) + 1;
  return { n: last.size, viewing: Object.entries(by).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n).slice(0, 10) };
}
export const TZ = 'Asia/Ho_Chi_Minh', TZ_OFF = 7 * 3600e3;
export const dayOf = t => new Date(t + TZ_OFF).toISOString().slice(0, 10);
const VID = /^[a-z0-9]{8,32}$/i, REASONS = ['notuse', 'noisy', 'bugs', 'privacy', 'alt', 'other'];
const cnt = v => Math.min(Math.max(Math.floor(+v || 0), 0), 5000);
// Ngày máy khách gửi (giờ địa phương của máy): nhận YYYY-MM-DD trong [hôm nay − back ngày, hôm nay + 1] – múi giờ UTC+8…+14 đã sang ngày mới trước VN
const okDay = (d, now, back) => /^\d{4}-\d{2}-\d{2}$/.test(d || '') && d <= dayOf(now + DAY) && d >= dayOf(now - back * DAY) ? d : '';
// Máy tự động: UA bot/công cụ, header CI của mình, bot đã xác minh (Cloudflare), mạng máy chủ đám mây (ASN) – runner GitHub Actions
// (kể cả Android emulator / iOS Simulator trong android.yml, ios.yml) đi ra Internet qua Azure AS8075.
export const BOT = /(?<!cu)bot\b|bot\/|crawl|spider|slurp|lighthouse|headless|playwright|puppeteer|selenium|webdriver|phantom|preview|curl\/|wget|python|go-http-client|node-fetch|undici|axios|okhttp|java\/|libwww|httpclient|scrapy|lexkite-bot|^node$|^$/i;
export const DC_ASN = new Set([
  8075, 8068, 8069, 8070, 12076,       // Microsoft / Azure (runner GitHub Actions)
  36459,                               // GitHub
  16509, 14618, 8987,                  // Amazon AWS
  15169, 396982, 19527, 36040, 43515,  // Google / Google Cloud (Googlebot dựng JS, Play pre-launch, Firebase Test Lab)
  714, 6185,                           // Apple (App Review)
  14061, 16276, 24940, 63949, 20473, 31898, 45102, 132203, 37963, 51167, 9009, 212238, // DigitalOcean, OVH, Hetzner, Linode, Vultr, Oracle, Alibaba, Tencent, Contabo, M247, Datacamp
]);
// → null (người thật) | 'ci' | 'ua' | 'bot' | 'dc'
export function automation(request) {
  const h = request.headers, cf = request.cf || {};
  if ((h.get('x-lexkite-ci') || '').trim()) return 'ci';
  if (BOT.test((h.get('User-Agent') || '').trim())) return 'ua';
  const bm = cf.botManagement || {};
  if (bm.verifiedBot || cf.verifiedBotCategory || (bm.score && bm.score < 10)) return 'bot';
  if (DC_ASN.has(+cf.asn)) return 'dc';
  return null;
}
const NOT_ROUTE = new Set(['admin']); // trang quản trị không phải "trang của người dùng" – không ghi vào lượt xem/đang xem

export async function setup(db) {
  if (ready) return;
  await once(db, 'hit', 1, async () => { // lược đồ: chỉ chạy khi đổi phiên bản (_schema.js) – sửa CREATE/ALTER ở đây thì TĂNG số 1
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS sessions (sid TEXT PRIMARY KEY, vid TEXT, day TEXT NOT NULL, at INTEGER NOT NULL, country TEXT, ref TEXT, dev TEXT, lang TEXT, plat TEXT, path TEXT, dur INTEGER, pages INTEGER, ret INTEGER) WITHOUT ROWID'),
      db.prepare('CREATE INDEX IF NOT EXISTS sessions_day ON sessions (day)'),
      db.prepare('CREATE TABLE IF NOT EXISTS errors (h TEXT PRIMARY KEY, msg TEXT, src TEXT, path TEXT, ver TEXT, n INTEGER NOT NULL, first INTEGER NOT NULL, last INTEGER NOT NULL) WITHOUT ROWID'),
      db.prepare('CREATE TABLE IF NOT EXISTS pageviews_day (day TEXT NOT NULL, path TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, path)) WITHOUT ROWID'),
      db.prepare('CREATE TABLE IF NOT EXISTS ext_daily (day TEXT NOT NULL, vid TEXT NOT NULL, lookup INTEGER, save INTEGER, popup INTEGER, newtab INTEGER, ver TEXT, PRIMARY KEY (day, vid)) WITHOUT ROWID'),
      db.prepare('CREATE TABLE IF NOT EXISTS ext_events (day TEXT NOT NULL, kind TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, kind)) WITHOUT ROWID'),
      db.prepare('CREATE TABLE IF NOT EXISTS vid_uid (vid TEXT PRIMARY KEY, uid TEXT NOT NULL, at INTEGER NOT NULL) WITHOUT ROWID'),
      db.prepare('CREATE TABLE IF NOT EXISTS hit_meta (k TEXT PRIMARY KEY, at INTEGER) WITHOUT ROWID'),
    ]);
    await db.prepare('ALTER TABLE sessions ADD COLUMN lcp INTEGER').run().catch(() => {}); // LCP thật (ms) – thêm sau
    await db.prepare('ALTER TABLE sessions ADD COLUMN last INTEGER').run().catch(() => {}); // lần cuối nhận tín hiệu (ms) – "đang online"
    await db.prepare('ALTER TABLE sessions ADD COLUMN last_path TEXT').run().catch(() => {}); // trang đang xem lúc gửi gần nhất
    await db.prepare('CREATE INDEX IF NOT EXISTS sessions_last ON sessions (last)').run().catch(() => {});
    await db.prepare('ALTER TABLE sessions ADD COLUMN bot TEXT').run().catch(() => {}); // loại máy tự động (NULL = người thật)
    await migrate(db).catch(() => {});
  });
  ready = true;
}

/* Di chuyển 1 lần (bảng hit_meta giữ dấu; cả lô là 1 giao dịch – dòng dấu bị trùng khóa → cả lô huỷ, không chạy 2 lần):
 * mig-bot-1: từ 16/10 04:00 UTC (commit 98a98e9a: android.yml/ios.yml chụp màn hình trên emulator mỗi lần push) mỗi lần build
 *   mở app Capacitor mới cài trên runner GitHub (Mỹ) → 1 phiên giả. Đánh dấu bot = 'ci-app' cho phiên app (android/ios) ngoài VN
 *   trong khoảng đó, trừ lượt xem home/welcome mà các phiên đó đã cộng vào pageviews_day.
 * mig-tz-1: sessions.day đổi từ ngày UTC sang ngày giờ Việt Nam (pageviews_day cũ giữ nguyên ngày UTC – không tách lại được). */
export const CI_APP_FROM = Date.UTC(2026, 9, 16, 4, 0, 0);
async function migrate(db) {
  const done = new Set(((await db.prepare('SELECT k FROM hit_meta').all()).results || []).map(r => r.k)), now = Date.now();
  if (!done.has('mig-bot-1')) {
    const W = "bot = 'ci-app' AND day = pageviews_day.day";
    await db.batch([
      db.prepare("INSERT INTO hit_meta (k, at) VALUES ('mig-bot-1', ?1)").bind(now),
      db.prepare("UPDATE sessions SET bot = 'ci-app' WHERE bot IS NULL AND plat IN ('android', 'ios') AND COALESCE(country, '') <> 'VN' AND at >= ?1 AND at <= ?2").bind(CI_APP_FROM, now),
      db.prepare(`UPDATE pageviews_day SET n = MAX(0, n - (SELECT COUNT(*) FROM sessions WHERE ${W} AND path = 'home')) WHERE path = 'home' AND day >= '2026-10-16'`),
      db.prepare(`UPDATE pageviews_day SET n = MAX(0, n - (SELECT COUNT(*) FROM sessions WHERE ${W} AND last_path = 'welcome')) WHERE path = 'welcome' AND day >= '2026-10-16'`),
    ]);
  }
  if (!done.has('mig-tz-1')) await db.batch([
    db.prepare("INSERT INTO hit_meta (k, at) VALUES ('mig-tz-1', ?1)").bind(now),
    db.prepare(`UPDATE sessions SET day = strftime('%Y-%m-%d', (at + ${TZ_OFF}) / 1000, 'unixepoch')`),
  ]);
}

/** Cổng giữ chân quảng cáo (functions/api/_ads.js guardOf): nhóm có quảng cáo tụt > X % D1/D7/thời lượng phiên so với đối chứng → giảm tần suất (config ads_guard) + ghi lịch sử 'adg:<%>'. */
export async function adsGuard(db, now = Date.now()) {
  const today = dayOf(now), from = dayOf(now - 30 * DAY);
  const [rs, cs] = await db.batch([
    db.prepare("SELECT day, kind, n FROM ext_events WHERE day >= ?1 AND kind >= 'adc:' AND kind < 'adc;'").bind(from),
    db.prepare("SELECT k, v FROM config WHERE k IN ('ads_guard', 'ads_guard_pct', 'ads_guard_min')"),
  ]);
  const cfg = Object.fromEntries((cs.results || []).map(r => [r.k, r.v]));
  const g = guardOf(rs.results || [], today, { pct: cfg.ads_guard_pct, min: cfg.ads_guard_min, prev: cfg.ads_guard || 1 });
  if (String(g.factor) === String(+cfg.ads_guard || 1)) return g;
  await db.batch([
    db.prepare("INSERT INTO config (k, v, at, by) VALUES ('ads_guard', ?1, ?2, 'auto-guard') ON CONFLICT (k) DO UPDATE SET v = ?1, at = ?2, by = 'auto-guard'").bind(String(g.factor), now),
    db.prepare('INSERT INTO ext_events (day, kind, n) VALUES (?1, ?2, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1').bind(today, 'adg:' + Math.round(g.factor * 100)),
  ]);
  await purgeConfig();
  return g;
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return ok();
  if ((await gate(request, env, 'hit', { who: null })).res) return ok(); // 1 IP gửi dồn dập → bỏ qua im lặng (thống kê không bao giờ làm hỏng app)
  if (+(request.headers.get('Content-Length') || 0) > 65536) return ok(); // beacon thật chỉ vài KB
  let b; try { b = JSON.parse(await request.text()); } catch (e) { return ok(); }
  if (!b || typeof b !== 'object') return ok();
  const auto = automation(request);
  if (auto && b && b.t !== 's') return ok(); // máy tự động: chỉ đếm phiên (để Quản trị hiện "đã loại"), không ghi lỗi JS / add-on
  try {
    await setup(env.DB);
    const now = Date.now();
    if (b.t === 's' && /^[a-z0-9]{8,32}$/i.test(b.sid || '')) {
      let ref = cut(b.ref, 200); try { ref = ref ? new URL(ref).hostname.replace(/^www\./, '') : ''; } catch (e) { ref = ''; }
      if (/(^|\.)lexkite\.(com|pages\.dev)$/.test(ref)) ref = '';
      const day = dayOf(now), route = v => /^[a-z0-9-]{1,40}$/.test(v) && !NOT_ROUTE.has(v) ? v : '';
      // Phiên mở thẳng trang quản trị (#/admin) → coi là nội bộ, đếm riêng như máy tự động
      const bot = auto || (NOT_ROUTE.has(cut(b.path, 60)) ? 'admin' : null);
      // ON CONFLICT: COALESCE(bot, ?16) – một khi đã là máy tự động thì giữ nguyên (không "hoá người" ở nhịp gửi sau)
      const sid = cut(b.sid, 32), vid = cut(b.vid, 32), country = cut(request.cf && request.cf.country, 2) || 'XX', hb = !!b.hb;
      // Analytics Engine (miễn phí, hạn mức riêng, 0 dòng D1): mọi beacon phiên → 1 điểm. Bố cục: aeHit() / docs/CAPACITY.md §Kiến trúc A2
      aeHit(env, { sid, vid, day, country, ref, dev: cut(b.dev, 10), lang: cut(b.lang, 8), plat: cut(b.plat, 8), path: cut(b.path, 60), cur: route(cut(b.cur || b.path, 40)), bot: bot || '', kind: hb ? 'hb' : 's', dur: +b.dur || 0, pages: +b.pages || 0, ret: b.ret ? 1 : 0, lcp: +b.lcp || 0, at: now });
      if (hb && hitMode(env) === 'hybrid') return ok(); // nhịp "đang online" 3 phút: chỉ AE (Quản trị đọc "đang online" từ AE) – D1 chỉ ghi lúc vào + lúc rời trang
      const batch = [env.DB.prepare('INSERT INTO sessions (sid, vid, day, at, country, ref, dev, lang, plat, path, dur, pages, ret, lcp, last, last_path, bot) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?4, ?15, ?16) ON CONFLICT (sid) DO UPDATE SET dur = ?11, pages = ?12, lcp = COALESCE(lcp, ?14), last = ?4, last_path = COALESCE(?15, last_path), bot = COALESCE(bot, ?16)')
        .bind(cut(b.sid, 32), cut(b.vid, 32), day, now, cut(request.cf && request.cf.country, 2) || 'XX', ref, cut(b.dev, 10), cut(b.lang, 8), cut(b.plat, 8), cut(b.path, 60), Math.min(Math.max(+b.dur || 0, 0), 86400), Math.min(Math.max(Math.floor(+b.pages || 1), 1), 999), b.ret ? 1 : 0, +b.lcp > 0 && +b.lcp < 60000 ? Math.round(+b.lcp) : null, route(cut(b.cur || b.path, 40)) || null, bot)];
      // Lượt xem theo trang/ngày: chỉ phần tăng thêm từ lần gửi trước (tối đa 20 trang, mỗi trang ≤ 200) – cùng 1 lượt gọi D1. Máy tự động: bỏ.
      if (!bot && !hb && b.pv && typeof b.pv === 'object') for (const [k, v] of Object.entries(b.pv).slice(0, 20)) {
        const n = Math.min(Math.floor(+v || 0), 200); if (n > 0 && route(k)) batch.push(env.DB.prepare('INSERT INTO pageviews_day (day, path, n) VALUES (?1, ?2, ?3) ON CONFLICT (day, path) DO UPDATE SET n = n + ?3').bind(day, k, n));
      }
      await env.DB.batch(batch);
      // Lưu giữ: ~1/500 lượt ghi phiên dọn số liệu quá 400 ngày (Quản trị xem tối đa 365 ngày) – chính sách riêng tư "chỉ giữ khi cần"
      if (Math.random() < 0.002) await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE day < ?').bind(dayOf(now - 400 * DAY)), /* theo chỉ mục sessions_day – at không có chỉ mục → quét cả bảng (docs/CAPACITY.md) */ env.DB.prepare('DELETE FROM pageviews_day WHERE day < ?').bind(dayOf(now - 400 * DAY))]);
    } else if (b.t === 'q' && (QUIZ_EV.includes(b.ev) || CTA_EV.includes(b.ev) || SMART_CTA_EV.includes(b.ev))) {
      if (await limit('hq:' + await sha('ip|' + (request.headers.get('CF-Connecting-IP') || '?')), 60, 3600)) return ok();
      const today = dayOf(now);
      if (SMART_CTA_EV.includes(b.ev)) {
        const batch = [env.DB.prepare('INSERT INTO ext_events (day, kind, n) VALUES (?1, ?2, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1').bind(today, 'cta:' + b.ev)];
        const lang = CTA_LANGS.includes(String(b.lang || '').toLowerCase().slice(0, 2)) ? String(b.lang).toLowerCase().slice(0, 2) : '';
        if (lang) batch.push(env.DB.prepare('INSERT INTO ext_events (day, kind, n) VALUES (?1, ?2, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1').bind(today, `cta:${b.ev}:lang:${lang}`));
        const page = CTA_PAGES.includes(String(b.page || '').toLowerCase()) ? String(b.page).toLowerCase() : '';
        if (page) batch.push(env.DB.prepare('INSERT INTO ext_events (day, kind, n) VALUES (?1, ?2, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1').bind(today, `cta:${b.ev}:page:${page}`));
        await env.DB.batch(batch);
      } else {
        await env.DB.prepare('INSERT INTO ext_events (day, kind, n) VALUES (?1, ?2, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1').bind(today, (CTA_EV.includes(b.ev) ? 'cta:' : 'blog:') + b.ev).run();
      }
    } else if (b.t === 'v' && VID_EV.includes(b.ev) && /^[a-z0-9_]{6,80}$/.test(b.id || '')) {
      // 🎬 Video bài học trên web (web/js/lesson-video.js): lượt xem / xem hết / câu đố đúng-sai theo clip → kind 'vid:<ev>:<id>' (Quản trị → Thư viện video → Web)
      if (await limit('hv:' + await sha('ip|' + (request.headers.get('CF-Connecting-IP') || '?')), 60, 3600)) return ok();
      await env.DB.prepare('INSERT INTO ext_events (day, kind, n) VALUES (?1, ?2, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1').bind(dayOf(now), `vid:${b.ev}:${b.id}`).run();
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
    } else if (b.t === 'ad') {
      // 💰 Quảng cáo (web/js/ads/run.js, docs/ADS.md): 1 beacon/phiên – số đếm theo vị trí, nhóm a/h, đồng ý theo vùng → ext_events (PK day,kind; ≤ 30 dòng/beacon)
      if (await limit('had:' + await sha('ip|' + (request.headers.get('CF-Connecting-IP') || '?')), 30, 3600)) return ok();
      const day = dayOf(now), rows = adRows(b, request.cf && request.cf.country);
      if (rows.length) await env.DB.batch(rows.map(([kind, n]) => env.DB.prepare('INSERT INTO ext_events (day, kind, n) VALUES (?1, ?2, ?3) ON CONFLICT (day, kind) DO UPDATE SET n = n + ?3').bind(day, kind, n)));
      // Cổng giữ chân: tối đa 1 lần/giờ/trung tâm dữ liệu, chỉ đọc khoảng ngày (SEARCH theo PK) – không quét bảng
      if (!(await limit('ads-guard', 1, 3600))) await adsGuard(env.DB, now).catch(() => {});
    } else if (b.t === 'e' && b.msg) {
      const msg = cut(b.msg, 300), src = cut(b.src, 200) + (b.line ? ':' + (+b.line || 0) : '');
      await env.DB.prepare('INSERT INTO errors (h, msg, src, path, ver, n, first, last) VALUES (?1, ?2, ?3, ?4, ?5, 1, ?6, ?6) ON CONFLICT (h) DO UPDATE SET n = n + 1, last = ?6, path = ?4, ver = ?5')
        .bind(await sha(msg + '|' + src), msg, src, cut(b.path, 60), cut(b.ver, 30), now).run();
    }
  } catch (e) { /* thống kê không bao giờ được làm hỏng app */ }
  return ok();
}
