// 🎬 Học qua video (#/watch, /api/watch – docs/specs/video-learn.md): tách link YouTube, bộ chủ đề hợp lệ (icon, nhãn i18n, kênh),
// API (oEmbed, RSS, tìm kiếm: đệm biên + D1, trần hạn mức theo ngày, hết khóa/hết quota → link YouTube), nối gói lười, luật điều khoản YouTube.
// Chạy: node scripts/test/watch.mjs  (không mạng – D1 giả bằng node:sqlite, Cache API/fetch giả lập)
import fs from 'node:fs';
import vm from 'node:vm';
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const read = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');

// ---------- Client: watch-topics.js + watch.js trong vm với UI/App tối thiểu ----------
const ctx = { console, URL, URLSearchParams, setTimeout, clearTimeout, setInterval, clearInterval, location: { protocol: 'https:', hostname: 'lexkite.com', href: 'https://lexkite.com/app/' }, localStorage: { getItem: () => null, setItem() {} } };
ctx.window = ctx; ctx.self = ctx; ctx.UI = { $: () => null, $$: () => [], esc: s => String(s), toast() {}, icon: n => `<i ${n}>` }; ctx.App = { state: { settings: {}, cards: {} }, routes: {}, view: {} }; ctx.I18N_DICT = { en: {} };
vm.createContext(ctx);
for (const f of fs.readdirSync(new URL('../../web/js/i18n/en/', import.meta.url))) { try { vm.runInContext(read('web/js/i18n/en/' + f), ctx); } catch (e) { /* nhóm cần toàn cục khác */ } }
vm.runInContext(read('web/js/watch-topics.js'), ctx); vm.runInContext(read('web/js/watch.js'), ctx);
const { ytParse, buildQ, fmt } = ctx.Watch, W = ctx.WatchTopics, EN = ctx.I18N_DICT.en;
const P = (s, id, t = 0) => { const r = ytParse(s); ok(r && r.id === id && r.t === t, `ytParse(${s}) → ${JSON.stringify(r)} (muốn ${id}@${t})`); };
P('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'); P('youtube.com/watch?v=dQw4w9WgXcQ&t=90', 'dQw4w9WgXcQ', 90); P('https://youtu.be/dQw4w9WgXcQ?t=1m5s', 'dQw4w9WgXcQ', 65);
P('https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'); P('https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'); P('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=30', 'dQw4w9WgXcQ', 30);
P('https://www.youtube.com/live/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'); P('https://music.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s', 'dQw4w9WgXcQ', 3723); P('dQw4w9WgXcQ', 'dQw4w9WgXcQ');
for (const bad of ['https://evil.com/watch?v=dQw4w9WgXcQ', 'https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=<script>', 'travel english', '', 'javascript:alert(1)']) ok(ytParse(bad) === null, `ytParse từ chối ${bad}`);
ok(fmt(65) === '1:05' && fmt(3723) === '1:02:03' && fmt(-1) === '0:00', 'fmt giờ:phút:giây');
const q = buildQ('travel english conversation', { lv: 1, acc: 'uk', pace: 'slow' });
ok(/travel/.test(q) && /british accent/.test(q) && /beginners/.test(q) && q.split(' ').length === new Set(q.split(' ')).size, `buildQ ghép đuôi trình độ/giọng/tốc độ, không lặp từ: ${q}`);

// Bộ chủ đề: id duy nhất, CEFR hợp lệ, ≥ 2 cụm từ khóa tiếng Anh, kênh đúng dạng, icon có trong sprite, nhãn có bản tiếng Anh
const sprite = new Set([...read('web/app/index.html').matchAll(/id="i-([a-z0-9-]+)"/g)].map(m => m[1]));
const ids = new Set(), goals = new Set(['all', 'ielts', 'ieltsgt', 'toeic', 'toefl', 'general']);
ok(W.TOPICS.length >= 20, `≥ 20 chủ đề (có ${W.TOPICS.length})`);
for (const tp of W.TOPICS) {
  ok(!ids.has(tp.id), `chủ đề trùng id ${tp.id}`); ids.add(tp.id);
  ok(tp.lv[0] >= 1 && tp.lv[1] <= 6 && tp.lv[0] <= tp.lv[1], `${tp.id}: CEFR ${tp.lv}`);
  ok(tp.goals.length && tp.goals.every(x => goals.has(x)), `${tp.id}: mục tiêu ${tp.goals}`);
  ok(tp.q.length >= 2 && tp.q.every(x => /^[a-z0-9 '-]{6,60}$/.test(x)), `${tp.id}: từ khóa tìm kiếm tiếng Anh ≥ 2`);
  ok(tp.ch.every(c => /^UC[A-Za-z0-9_-]{22}$/.test(c)), `${tp.id}: id kênh`);
  ok(sprite.has(tp.ic), `${tp.id}: icon ${tp.ic} có trong sprite web/app/index.html`);
  for (const k of [tp.name, tp.desc]) ok(EN[k] != null, `${tp.id}: thiếu bản tiếng Anh cho "${k}"`);
}
for (const tp of W.TOPICS) for (const c of tp.ch) ok(Object.values(W.CHANNELS).includes(c), `${tp.id}: kênh ${c} phải nằm trong CHANNELS`);
for (const k in W.FILTERS) for (const [, lab] of W.FILTERS[k]) ok(EN[lab] != null, `bộ lọc: thiếu bản tiếng Anh "${lab}"`);
for (const lv of [1, 2, 3, 4, 5, 6]) ok(W.TOPICS.filter(tp => tp.lv[0] <= lv && lv <= tp.lv[1]).length >= 6, `trình độ ${W.LEVELS[lv - 1]} có ≥ 6 chủ đề`);

// ---------- Nối gói lười + i18n + luật điều khoản ----------
const app = read('web/js/app.js'), b = (app.match(/\n\s+watch: (\[[^\]]+\])/) || [])[1];
ok(b && JSON.parse(b.replace(/'/g, '"')).every(f => fs.existsSync(new URL('../../web/' + f, import.meta.url))), 'BUNDLES.watch tồn tại và mọi file có thật');
ok(/ROUTE_BUNDLE = \{[^}]*\bwatch: 'watch'/.test(app) && /BCSS = \{[^}]*watch: 'css\/watch\.css'/.test(app), 'ROUTE_BUNDLE + BCSS cho watch');
ok(/^LAZY="[^"]*\bwatch\b/m.test(read('scripts/build-i18n.sh')), 'watch thuộc nhóm i18n tải lười');
ok(/#\/watch/.test(read('web/js/hubs.js')), 'lối vào #/watch ở Kỹ năng → Nghe');
const src = read('web/js/watch.js') + read('functions/api/watch.js');
for (const bad of [/timedtext/i, /googlevideo/i, /\.download\(|captions\.download/i, /adblock|skipAd|ad-showing/i, /ytdl|yt-dlp/i]) ok(!bad.test(src), `cấm (điều khoản YouTube): ${bad}`);
ok(/youtube-nocookie\.com/.test(read('web/js/watch.js')) && /host: 'https:\/\/www\.youtube-nocookie\.com'/.test(read('web/js/watch.js')), 'player chỉ qua youtube-nocookie');
ok(!/class="wt-bar"[^>]*style="[^"]*position:\s*absolute/.test(read('web/js/watch.js')) && !/\.wt-bar[^{]*\{[^}]*position:\s*absolute/.test(read('web/css/watch.css')), 'thanh điều khiển không đè lên player');

// ---------- API ----------
const store = new Map();
globalThis.caches = { default: {
  async match(req) { const e = store.get(req.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(req, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(req.url, { body: await res.text(), exp: Date.now() + age * 1000 }); },
} };
const sql = new DatabaseSync(':memory:');
const exec = (qq, a) => (/^\s*(SELECT|WITH)|RETURNING/i.test(qq) ? { results: sql.prepare(qq).all(...a) } : (sql.prepare(qq).run(...a), { results: [] }));
const DB = { prepare(qq) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(qq, this.args); }, async all() { return exec(qq, this.args); }, async first() { return sql.prepare(qq).get(...this.args) || null; } }; return st; },
  async batch(list) { sql.exec('BEGIN'); try { for (const x of list) await x.run(); sql.exec('COMMIT'); } catch (e) { sql.exec('ROLLBACK'); throw e; } } };
const calls = []; let fail = false;
const RSS = `<feed><entry><yt:videoId>AAAAAAAAAAA</yt:videoId><title>Travel &amp; hotel English</title><author><name>BBC Learning English</name></author><published>2026-10-02T00:00:00+00:00</published></entry>
  <entry><yt:videoId>bad</yt:videoId><title>x</title></entry><entry><yt:videoId>BBBBBBBBBBB</yt:videoId><title>It&#39;s news</title><author><name>VOA</name></author><published>2026-10-05T00:00:00+00:00</published></entry></feed>`;
globalThis.fetch = async url => {
  url = String(url); calls.push(url); if (fail) throw new Error('down');
  if (url.startsWith('https://www.youtube.com/oembed')) return url.includes('CCCCCCCCCCC') ? new Response('', { status: 401 }) : Response.json({ title: 'A talk', author_name: 'TED' });
  if (url.startsWith('https://www.youtube.com/feeds/videos.xml')) return new Response(RSS);
  if (url.startsWith('https://www.googleapis.com/youtube/v3/search')) return Response.json({ items: [{ id: { videoId: 'DDDDDDDDDDD' }, snippet: { title: 'Ted &amp; talk', channelTitle: 'TED', publishedAt: '2026-01-01' } }, { id: { channelId: 'x' }, snippet: {} }] });
  if (url.startsWith('https://www.googleapis.com/youtube/v3/videos')) return Response.json({ items: [{ id: 'DDDDDDDDDDD', contentDetails: { duration: 'PT4M13S', caption: 'true' } }] });
  throw new Error('mạng bị chặn trong test: ' + url);
};
const A = await import('../../functions/api/watch.js');
const rows = A.parseRss(RSS);
ok(rows.length === 2 && rows[0].title === 'Travel & hotel English' && rows[1].title === "It's news" && rows[0].ch === 'BBC Learning English', 'parseRss: bỏ id sai, giải mã thực thể');
ok(A.isoSec('PT1H2M3S') === 3723 && A.isoSec('PT45S') === 45 && A.isoSec('P1DT1S') === 86401 && A.isoSec('x') === 0, 'isoSec');
ok(A.normQ('  IELTS  Listening!!  ') === 'ielts listening' && A.normQ('x'.repeat(300)).length === 120, 'normQ');
ok(/^\d{4}-\d{2}-\d{2}$/.test(A.pacificDay()) && A.pacificDay(Date.UTC(2026, 10, 3, 7, 30)) === '2026-11-02', 'ngày Pacific (quota YouTube đặt lại nửa đêm Pacific)');
const req = (qs, ip = '1.1.1.1') => new Request('https://lexkite.com/api/watch?' + qs, { headers: { Origin: 'https://lexkite.com', 'CF-Connecting-IP': ip } });
const get = async (qs, env = {}, ip) => { const r = await A.onRequestGet({ request: req(qs, ip), env }); return { s: r.status, j: await r.json(), h: r.headers }; };

let r = await get('op=info&id=AAAAAAAAAAA'); ok(r.s === 200 && r.j.title === 'A talk' && r.j.embeddable === true && r.h.get('Access-Control-Allow-Origin') === 'https://lexkite.com', 'info qua oEmbed');
const before = calls.length; r = await get('op=info&id=AAAAAAAAAAA'); ok(r.s === 200 && calls.length === before, 'info lần 2 lấy từ đệm biên');
r = await get('op=info&id=CCCCCCCCCCC'); ok(r.s === 200 && r.j.embeddable === false, 'oEmbed 401 → embeddable:false');
r = await get('op=info&id=<x>'); ok(r.s === 400, 'info: id sai → 400');
r = await get('op=feed&ch=UCHaHD477h-FeBbVh9Sh7syA,UCKyTokYo0nK2OA-az-sDijA,evil'); ok(r.s === 200 && r.j.items.length === 4 && r.j.items[0].at >= r.j.items[3].at, 'feed: gộp kênh, mới trước, bỏ id kênh sai');
r = await get('op=feed&ch=evil'); ok(r.s === 400, 'feed: không kênh hợp lệ → 400');
r = await get('op=search&q=travel'); ok(r.s === 200 && r.j.items.length === 0 && /youtube\.com\/results\?search_query=travel/.test(r.j.fallback) && r.j.why === 'off', 'search không khóa → link YouTube');
const env = { DB, YOUTUBE_SEARCH_KEY: 'k', WATCH_SEARCH_UNITS: String(A.UNITS) }; // trần đúng 1 lượt
r = await get('op=search&q=ted%20talk&cc=1', env); ok(r.s === 200 && r.j.items.length === 1 && r.j.items[0].title === 'Ted & talk' && r.j.items[0].sec === 253 && r.j.items[0].cc === true && !r.j.fallback, 'search qua Data API (+ thời lượng, phụ đề)');
ok(calls.some(u => u.includes('videoCaption=closedCaption') && u.includes('videoEmbeddable=true') && u.includes('safeSearch=strict')), 'search: chỉ video nhúng được, an toàn, lọc phụ đề');
const n1 = calls.length; r = await get('op=search&q=ted%20talk&cc=1', env); ok(r.j.items.length === 1 && calls.length === n1, 'search lần 2: đệm biên, không tốn quota');
store.clear(); r = await get('op=search&q=ted%20talk&cc=1', env); ok(r.j.items.length === 1 && calls.length === n1, 'search: đệm D1 khi biên trống');
r = await get('op=search&q=news%20english', env, '2.2.2.2'); ok(r.j.why === 'quota' && r.j.fallback, 'hết trần ngày → link YouTube');
ok(sql.prepare('SELECT units FROM watch_quota').get().units === A.UNITS, 'quota không vượt trần');
ok(await A.take(DB, A.UNITS * 3) && !(await A.take(DB, A.UNITS)), 'take(): giữ chỗ có điều kiện');
r = await get('op=search&q=x', env); ok(r.s === 400, 'search: từ khóa quá ngắn → 400');
fail = true; store.clear(); r = await get('op=search&q=brand%20new', { ...env, WATCH_SEARCH_UNITS: '99999' }); ok(r.s === 200 && r.j.fallback, 'search lỗi mạng → 200 + link YouTube (giao diện không vỡ)'); fail = false;
r = await get('op=search&q=anything', { ...env, WATCH_SEARCH_UNITS: '0' }); ok(r.j.why === 'off', 'WATCH_SEARCH_UNITS=0 tắt tìm kiếm');
r = await get('op=nope'); ok(r.s === 400, 'op lạ → 400');
for (let i = 0; i < 21; i++) r = await get('op=search&q=spam' + i, env, '9.9.9.9');
ok(r.j.why === 'rate' && r.j.fallback, 'giới hạn tốc độ tìm theo IP');

console.log(fails ? `✗ watch: ${fails}/${n} lỗi` : `✓ watch: ${n} kiểm tra`);
process.exit(fails ? 1 : 0);
