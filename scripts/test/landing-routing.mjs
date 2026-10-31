// 🧭 Trang giới thiệu (/ + /<lang>/) ↔ app học (/app/): định tuyến, SEO tối thiểu, gợi ý ngôn ngữ, di chuyển service worker.
// Chạy trong npm test: node scripts/test/landing-routing.mjs
//  1) Script #lk-route (chạy trước khi vẽ) với từng tình huống: khách mới, người học cũ, liên kết cũ /#/…, PWA cài cũ, ?home=1…
//  2) Mỗi trang giới thiệu: khớp nguồn (build-landing), canonical + 15 hreflang + x-default, JSON-LD, lang/dir, CTA vào /app/?hl=…, nhẹ (gzip)
//  3) Gợi ý ngôn ngữ chỉ hiện cho người dùng (JS sau khi vẽ), đóng được, nhớ lựa chọn
//  4) web/sw.js: bản cài cũ phạm vi "/" → chế độ chuyển tiếp (xóa cache khung cũ, giữ dữ liệu, offline "/" → /app/); phạm vi /app/ → cache khung app
//  5) app.js: đăng ký SW phạm vi /app/, bí danh route gõ nhầm trỏ tới route có thật; manifest start_url/scope /app/, id giữ "/"
import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { JSDOM } from 'jsdom';
import { LANGS, render, fileOf, ROUTE_JS } from '../build-landing.mjs';

const errs = []; let n = 0;
const ok = (c, m) => { n++; if (!c) errs.push(m); };
const rd = f => fs.readFileSync(f, 'utf8');

// ---------- 1) Định tuyến trước khi vẽ ----------
function runRoute(href, { local = {}, session = {}, standalone = false, iosStandalone = false } = {}) {
  const u = new URL(href);
  let replaced = null; const ls = { ...local }, ss = { ...session };
  const store = o => ({ getItem: k => (k in o ? o[k] : null), setItem: (k, v) => { o[k] = String(v); }, removeItem: k => { delete o[k]; } });
  const ctx = {
    location: { href: u.href, pathname: u.pathname, search: u.search, hash: u.hash, replace: x => { replaced = x; } },
    URLSearchParams, localStorage: store(ls), sessionStorage: store(ss),
    matchMedia: q => ({ matches: standalone && /display-mode: standalone/.test(q) }),
    navigator: { standalone: iosStandalone || undefined },
    document: { documentElement: { style: {} } },
  };
  ctx.window = ctx;
  vm.runInNewContext(ROUTE_JS, ctx);
  return { to: replaced, session: ss, hidden: ctx.document.documentElement.style.visibility === 'hidden' };
}
const S = 'https://lexkite.com';
const cases = [
  ['khách mới ở / → thấy trang giới thiệu', `${S}/`, {}, null],
  ['khách mới ở /en/ → thấy trang giới thiệu', `${S}/en/`, {}, null],
  ['người học cũ (lk.onb) ở / → /app/', `${S}/`, { local: { 'lk.onb': '1' } }, '/app/'],
  ['đã đăng nhập (lk.acct) ở /ja/ → /app/', `${S}/ja/`, { local: { 'lk.acct': '{"displayName":"A"}' } }, '/app/'],
  ['liên kết cũ /#/topic/x → /app/#/topic/x', `${S}/#/topic/x`, {}, '/app/#/topic/x'],
  ['liên kết cũ có ?hl /?hl=en#/settings → /app/?hl=en#/settings', `${S}/?hl=en#/settings`, {}, '/app/?hl=en#/settings'],
  ['liên kết "Mở app" cũ /?hl=ja → /app/?hl=ja', `${S}/?hl=ja`, {}, '/app/?hl=ja'],
  ['?sandbox=1&demo=1 (ảnh chụp, test) → /app/', `${S}/?sandbox=1&demo=1&hl=en`, {}, '/app/?sandbox=1&demo=1&hl=en'],
  ['PWA cài cũ start_url /index.html#/home → /app/#/home', `${S}/index.html#/home`, { standalone: true }, '/app/#/home'],
  ['PWA (display-mode standalone) mở / → /app/', `${S}/`, { standalone: true }, '/app/'],
  ['iPhone thêm vào MH chính (navigator.standalone) → /app/', `${S}/`, { iosStandalone: true }, '/app/'],
  ['?source=pwa → /app/ (bỏ tham số source)', `${S}/?source=pwa`, {}, '/app/'],
  ['?home=1 của người học cũ → ở lại trang giới thiệu', `${S}/?home=1`, { local: { 'lk.onb': '1' } }, null],
  ['đã bấm ?home=1 trong phiên → sang /en/ vẫn ở lại', `${S}/en/`, { local: { 'lk.onb': '1' }, session: { 'lk.home': '1' } }, null],
  ['PWA + ?home=1 → ở lại', `${S}/?home=1`, { standalone: true }, null],
  ['neo trong trang #faq của khách mới → ở lại', `${S}/#faq`, {}, null],
  ['người học cũ mở /#faq → /app/ (không mang #faq)', `${S}/#faq`, { local: { 'lk.onb': '1' } }, '/app/'],
  ['liên kết mã QR chuyển máy cũ /#/handoff/c.k → /app/#/handoff/c.k', `${S}/#/handoff/AB12.k3y`, {}, '/app/#/handoff/AB12.k3y'],
  ['?home=1 không chặn liên kết sâu /?home=1#/review', `${S}/?home=1#/review`, { local: { 'lk.onb': '1' } }, '/app/#/review'],
];
for (const [name, href, opt, want] of cases) {
  const r = runRoute(href, opt);
  ok(r.to === want, `route: ${name} – nhận ${JSON.stringify(r.to)}, cần ${JSON.stringify(want)}`);
  if (want) ok(r.hidden, `route: ${name} – phải ẩn trang trước khi chuyển (không nháy)`);
}
ok(runRoute(`${S}/?home=1`).session['lk.home'] === '1', 'route: ?home=1 ghi nhớ trong phiên (sessionStorage lk.home)');
// localStorage bị chặn (Safari riêng tư) → không lỗi, ở lại trang giới thiệu
{ const ctx = { location: { search: '', hash: '', replace: () => { throw new Error('không được chuyển'); } }, URLSearchParams, matchMedia: () => ({ matches: false }), navigator: {}, document: { documentElement: { style: {} } } };
  Object.defineProperty(ctx, 'localStorage', { get() { throw new Error('SecurityError'); } }); Object.defineProperty(ctx, 'sessionStorage', { get() { throw new Error('SecurityError'); } }); ctx.window = ctx;
  let threw = false; try { vm.runInNewContext(ROUTE_JS, ctx); } catch { threw = true; } ok(!threw, 'route: storage bị chặn → không ném lỗi'); }

// ---------- 2) Trang giới thiệu tĩnh ----------
const expectHref = l => l === 'vi' ? 'https://lexkite.com/' : `https://lexkite.com/${l}/`;
for (const l of LANGS) {
  const f = fileOf(l);
  if (!fs.existsSync(f)) { ok(false, `${f} chưa có – chạy node scripts/build-landing.mjs`); continue; }
  const html = rd(f);
  ok(html === render(l), `${f} chưa dựng lại từ content/landing (node scripts/build-landing.mjs)`);
  const head = html.slice(0, html.indexOf('</head>'));
  ok(/^<!doctype html>\n<html lang="[a-z]{2}"/.test(html) && html.includes(`<html lang="${l}"${l === 'ar' ? ' dir="rtl"' : ''}>`), `${f}: html lang/dir`);
  ok(head.indexOf('id="lk-route"') > 0 && head.indexOf('id="lk-route"') < head.indexOf('<style>') && head.indexOf('id="lk-route"') < head.indexOf('<title>'), `${f}: script định tuyến phải nằm đầu <head> (trước khi vẽ)`);
  ok([...html.matchAll(/<script\b([^>]*\bsrc=[^>]*)>/g)].every(([, a]) => /(^|\s)defer(\s|$)/.test(a) && /\ssrc="\/js\/[\w./-]+\?v=[0-9a-f]{8}"/.test(a)), `${f}: script ngoài phải defer, cùng gốc dưới /js/ và có ?v=<hash> (LCP)`);
  ok([...html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '').matchAll(/<link\b[^>]*rel="stylesheet"[^>]*>/g)].every(([t]) => /\smedia="print"/.test(t) && /\sdata-swap[\s>]/.test(t)), `${f}: không có stylesheet chặn hiển thị (chỉ media="print" data-swap + bản <noscript>)`);
  ok(head.includes(`<link rel="canonical" href="${expectHref(l)}">`), `${f}: canonical tự trỏ`);
  const alts = [...head.matchAll(/<link rel="alternate" hreflang="([a-z-]+)" href="([^"]+)">/g)];
  ok(alts.length === 16 && LANGS.every(x => alts.some(a => a[1] === x && a[2] === expectHref(x))) && alts.some(a => a[1] === 'x-default' && a[2] === expectHref('en')), `${f}: cần 15 hreflang + x-default (/en/)`);
  ok(!/name="robots" content="[^"]*noindex/.test(head), `${f}: trang giới thiệu phải index được`);
  const t = (head.match(/<title>([^<]+)<\/title>/) || [])[1] || '', d = (head.match(/<meta name="description" content="([^"]+)"/) || [])[1] || '';
  const w = x => [...x].reduce((a, c) => a + (/[\u3000-\u9fff\uac00-\ud7af\uff00-\uffef]/.test(c) ? 2 : 1), 0); // chữ CJK rộng gấp đôi trên kết quả tìm kiếm
  ok(w(t) >= 20 && w(t) <= 80, `${f}: title ${w(t)} ký tự quy đổi (20–80)`);
  ok(w(d) >= 70 && w(d) <= 175, `${f}: description ${w(d)} ký tự quy đổi (70–175)`);
  let g = null; try { g = JSON.parse((head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/) || [])[1]); } catch { /* */ }
  const types = g && g['@graph'] ? g['@graph'].map(x => x['@type']) : [];
  ok(['Organization', 'WebSite', 'WebApplication', 'FAQPage', 'WebPage'].every(x => types.includes(x)), `${f}: JSON-LD cần Organization, WebSite, WebApplication, WebPage, FAQPage (có: ${types})`);
  const faq = g && g['@graph'].find(x => x['@type'] === 'FAQPage');
  ok(faq && faq.mainEntity.length >= 4 && faq.mainEntity.every(q => html.includes(q.name.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'))), `${f}: FAQ trong JSON-LD phải hiện trên trang`);
  ok(html.includes(`href="/app/?hl=${l}#/welcome/setup"`) && html.includes(`href="/app/?hl=${l}#/welcome/login"`), `${f}: CTA "Bắt đầu"/"Đăng nhập" vào /app/?hl=${l}#/…`);
  ok(html.includes(`href="/${l}/blog/"`), `${f}: liên kết blog cùng ngôn ngữ /${l}/blog/`);
  ok(!/href="\/(\?[^"#]*)?#\//.test(html), `${f}: còn liên kết kiểu cũ "/#/…" (phải là /app/#/…)`);
  ok(LANGS.every(x => html.includes(`<a href="${x === 'vi' ? '/' : `/${x}/`}" lang="${x}" hreflang="${x}"`)), `${f}: thanh đổi ngôn ngữ đủ 15 trang`);
  const gz = zlib.gzipSync(html, { level: 9 }).length;
  ok(gz <= 16 * 1024, `${f}: ${(gz / 1024).toFixed(1)} KB gzip > 16 KB – trang giới thiệu phải nhẹ`);
  ok(!/Lexkite là ứng dụng số 1|triệu người dùng|million users|★★★★★|4\.9\/5/i.test(html), `${f}: không được có số liệu/đánh giá tự nhận`);
}
// Chữ hiển thị đúng ngôn ngữ trang: trang không phải vi không lẫn tiếng Việt có dấu (trừ tên ngôn ngữ "Tiếng Việt" ở thanh đổi ngôn ngữ)
for (const l of LANGS.filter(x => x !== 'vi')) {
  const dom = new JSDOM(rd(fileOf(l))), doc = dom.window.document;
  doc.querySelectorAll('script,style,[lang="vi"]').forEach(e => e.remove());
  const vi = (doc.body.textContent.match(/[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/gi) || []).length;
  ok(vi === 0, `${fileOf(l)}: lẫn ${vi} ký tự tiếng Việt`);
}

// ---------- 3) Gợi ý ngôn ngữ (chỉ người dùng thật, sau khi vẽ) ----------
// jsdom không tải file: <script defer src="/js/…?v="> → chạy đúng file web/js/… ở cuối <body> (như defer: sau khi parse xong DOM)
const deferInline = html => { const js = []; html = html.replace(/<script defer src="(\/js\/[^"?]+)\?v=[0-9a-f]+"><\/script>/g, (_, p) => { js.push(rd('web' + p)); return ''; });
  return html.replace('</body>', () => js.map(c => `<script>${c}</script>`).join('') + '</body>'); };
async function hint(file, langs, local = {}) {
  const html = deferInline(rd(file)).replace(/<script id="lk-route">[\s\S]*?<\/script>/, '');
  const dom = new JSDOM(html, { url: 'https://lexkite.com/', runScripts: 'dangerously', beforeParse(w) { Object.defineProperty(w.navigator, 'languages', { get: () => langs }); for (const [k, v] of Object.entries(local)) w.localStorage.setItem(k, v); } });
  await new Promise(r => setTimeout(r, 10));
  return dom.window;
}
{
  let w = await hint('web/index.html', ['ja-JP', 'en']);
  const b = w.document.querySelector('.lhint');
  ok(b && b.getAttribute('lang') === 'ja' && b.querySelector('a').getAttribute('href') === '/ja/' && /日本語/.test(b.textContent), 'gợi ý: trình duyệt tiếng Nhật ở / → dải "日本語で見る" trỏ /ja/');
  b && b.querySelector('button').click();
  ok(!w.document.querySelector('.lhint') && w.localStorage.getItem('lk.lhint') === '1', 'gợi ý: bấm × → ẩn và nhớ lựa chọn');
  w = await hint('web/index.html', ['vi-VN']); ok(!w.document.querySelector('.lhint'), 'gợi ý: đúng ngôn ngữ trang → không hiện');
  w = await hint('web/en/index.html', ['ja'], { 'lk.lhint': '1' }); ok(!w.document.querySelector('.lhint'), 'gợi ý: đã đóng trước đó → không hiện lại');
  w = await hint('web/en/index.html', ['en-US'], { 'vb.uiLang': 'ar' }); const a = w.document.querySelector('.lhint');
  ok(a && a.getAttribute('dir') === 'rtl' && a.querySelector('a').getAttribute('href') === '/ar/', 'gợi ý: ưu tiên ngôn ngữ đã chọn trong app (vb.uiLang), RTL cho ar');
  w = await hint('web/en/index.html', ['sw-KE']); ok(!w.document.querySelector('.lhint'), 'gợi ý: ngôn ngữ không hỗ trợ → không hiện');
  ok(!rd('web/index.html').includes('class="lhint"'), 'gợi ý: không có sẵn trong HTML (bot thấy trang sạch)');
}

// ---------- 3b) Nút đổi ngôn ngữ đầu trang (web/js/lang-menu.js – dùng chung mọi trang tĩnh + app) ----------
{
  const { landingHref, LANG_NAMES, seoPage } = await import('../lib/site-layout.mjs');
  for (const l of LANGS) {
    const doc = new JSDOM(rd(fileOf(l))).window.document, sw = doc.querySelectorAll('header [data-lsw]'), b = doc.querySelector('[data-lsw] button'), m = doc.querySelector('[data-lsw] [role=menu]');
    const items = [...doc.querySelectorAll('[data-lsw] [role=menuitem]')];
    ok(sw.length === 1 && b && b.getAttribute('aria-haspopup') === 'true' && b.getAttribute('aria-expanded') === 'false' && b.getAttribute('aria-controls') === m.id && m.hidden, `${fileOf(l)}: nút đổi ngôn ngữ (aria-haspopup/expanded/controls, menu ẩn sẵn)`);
    ok(b && b.textContent.trim() === l.toUpperCase() && b.getAttribute('aria-label').endsWith(LANG_NAMES[l]) && !/Language/.test(l === 'en' ? '' : b.getAttribute('aria-label')), `${fileOf(l)}: nút hiện mã ${l.toUpperCase()}, nhãn đúng ngôn ngữ trang`);
    ok(items.length === LANGS.length && items.every(a => a.getAttribute('href') === landingHref(a.lang) && a.getAttribute('hreflang') === a.lang && a.textContent === LANG_NAMES[a.lang]) && items.filter(a => a.hasAttribute('aria-current')).map(a => a.lang).join() === l && items.find(a => a.lang === 'ar').getAttribute('dir') === 'rtl', `${fileOf(l)}: 15 ngôn ngữ tên bản địa, lang/hreflang, trỏ trang chủ từng ngôn ngữ, đánh dấu ngôn ngữ hiện tại, ar RTL`);
  }
  // Hành vi bàn phím/chuột chạy thật trong jsdom (trang ar để thử RTL); KHÔNG tự chuyển trang theo lựa chọn đã nhớ
  const html = deferInline(rd('web/ar/index.html')).replace(/<script id="lk-route">[\s\S]*?<\/script>/, '');
  const dom = new JSDOM(html, { url: 'https://lexkite.com/ar/', runScripts: 'dangerously', beforeParse(w) { w.localStorage.setItem('vb.uiLang', 'ja'); w.localStorage.setItem('lk.lhint', '1'); } });
  await new Promise(r => setTimeout(r, 10));
  const w = dom.window, d = w.document, b = d.querySelector('[data-lsw] button'), m = d.getElementById(b.getAttribute('aria-controls')), key = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  ok(w.location.href === 'https://lexkite.com/ar/', 'đổi ngôn ngữ: lựa chọn đã nhớ (vb.uiLang=ja) không tự chuyển trang /ar/');
  b.click(); ok(!m.hidden && b.getAttribute('aria-expanded') === 'true' && d.activeElement.lang === 'ar', 'đổi ngôn ngữ: bấm nút → mở menu, focus mục đang chọn');
  key(m, 'ArrowDown'); ok(d.activeElement.lang === 'ru', 'đổi ngôn ngữ: ↓ sang mục kế');
  key(m, 'End'); ok(d.activeElement.lang === 'tr', 'đổi ngôn ngữ: End → mục cuối'); key(m, 'ArrowDown'); ok(d.activeElement.lang === 'vi', 'đổi ngôn ngữ: ↓ ở cuối quay về đầu');
  key(m, 'e'); ok(d.activeElement.lang === 'en', 'đổi ngôn ngữ: gõ chữ cái nhảy tới mục (English)');
  key(m, 'Escape'); ok(m.hidden && b.getAttribute('aria-expanded') === 'false' && d.activeElement === b, 'đổi ngôn ngữ: Esc đóng menu, trả focus về nút');
  key(b, 'ArrowUp'); ok(!m.hidden && d.activeElement.lang === 'tr', 'đổi ngôn ngữ: ↑ trên nút mở menu ở mục cuối');
  d.body.click(); ok(m.hidden, 'đổi ngôn ngữ: bấm ra ngoài đóng menu');
  b.click(); const ko = m.querySelector('[lang=ko]'); ko.addEventListener('click', e => e.preventDefault()); ko.click();
  ok(w.localStorage.getItem('vb.uiLang') === 'ko' && m.hidden, 'đổi ngôn ngữ: chọn → nhớ vb.uiLang (cùng khóa app), đóng menu');
  // 404 + trang pháp lý + trang SEO cũng có nút; ánh xạ trang tương đương
  const nf = new JSDOM(rd('web/404.html')).window.document;
  ok(nf.querySelectorAll('[data-lsw] [role=menuitem]').length === LANGS.length && nf.querySelector('[data-lsw] [lang=ja]').getAttribute('href') === '/ja/', '404: nút đổi ngôn ngữ → trang chủ từng ngôn ngữ');
  const lg = new JSDOM(rd('web/de/terms.html')).window.document;
  ok(lg.querySelector('[data-lsw] [lang=ko]').getAttribute('href') === '/ko/terms' && lg.querySelector('[data-lsw] [aria-current]').lang === 'de' && !lg.querySelector('select'), 'pháp lý: nút đổi ngôn ngữ → cùng trang ở ngôn ngữ kia (/ko/terms)');
  const sp = new JSDOM(seoPage({ lang: 'vi', head: '', crumbs: [['Trang chủ', '/'], ['Speaking', '/speaking/'], ['X', '/speaking/x']], body: '', alt: '/en/speaking/x', section: '/speaking/' })).window.document;
  const href = l => sp.querySelector(`header [data-lsw] [lang=${l}]`).getAttribute('href');
  ok(href('vi') === '/speaking/x' && href('en') === '/en/speaking/x' && href('ja') === '/ja/' && sp.querySelector(`footer [lang=en]`).getAttribute('href') === '/en/speaking/x', 'trang SEO: vi ↔ en theo hreflang, ngôn ngữ khác → trang chủ ngôn ngữ đó (header = chân trang)');
}

// ---------- 4) Service worker: di chuyển bản cài cũ ----------
const SW = rd('web/sw.js');
async function sw(scope, { cache = {}, online = true } = {}) {
  const store = new Map(Object.entries(cache).map(([k, v]) => [k, new Map(Object.entries(v).map(([p, x]) => [p, new Response(x)]))]));
  const h = {}, log = { skip: 0, claim: 0, unregPS: [], fetched: [] };
  const open = name => { if (!store.has(name)) store.set(name, new Map()); const m = store.get(name); return { add: async req => { const u = new URL(typeof req === 'string' ? req : req.url, scope).pathname; log.fetched.push(u); m.set(u, new Response('x')); }, put: async (req, res) => { m.set(new URL(req.url || req, scope).pathname, res); }, match: async req => m.get(new URL(req.url || req, scope).pathname), keys: async () => [...m.keys()], delete: async k => m.delete(k) }; };
  const caches = { keys: async () => [...store.keys()], delete: async k => store.delete(k), open: async k => open(k), match: async (req, o) => { const p = new URL(req.url || req, scope).pathname; for (const m of store.values()) if (m.has(p)) return m.get(p); } };
  const self = { registration: { scope, periodicSync: { unregister: async t => { log.unregPS.push(t); } }, showNotification: async () => {} }, addEventListener: (t, f) => { h[t] = f; }, skipWaiting: async () => { log.skip++; }, clients: { claim: async () => { log.claim++; }, matchAll: async () => [], openWindow: async u => { log.opened = u; } } };
  const ctx = { self, caches, location: new URL(scope), URL, Request: class { constructor(u, o = {}) { this.url = typeof u === 'string' ? new URL(u, scope).href : u.url; this.mode = o.mode || u.mode; } }, Response, setTimeout, clearTimeout, Promise, console,
    fetch: async req => { if (!online) throw new TypeError('offline'); return new Response('net:' + new URL(req.url || req, scope).pathname); } };
  vm.runInNewContext(SW, ctx);
  const wait = async (type, ev = {}) => { let p = null, rsp; ev.waitUntil = x => { p = x; }; ev.respondWith = x => { rsp = x; }; h[type](ev); if (p) await p; return rsp; };
  return { h, log, store, wait };
}
const CUR = (SW.match(/const CACHE = '([^']+)'/) || [])[1];
ok(!!CUR, 'sw: có hằng CACHE');
{ // Bản cài CŨ (phạm vi "/"): được thay ngay, dọn cache khung cũ, giữ dữ liệu, không bao giờ trả app cũ ở "/"
  const old = { 'lexkite-20261001000000': { '/': 'old app', '/index.html': 'old app', '/js/app.js': 'old' }, 'lk-meta': { '/__meta': '{}' }, 'lk-audio': { '/a.mp3': 'a' } };
  const L = await sw('https://lexkite.com/', { cache: old });
  await L.wait('install');
  ok(L.log.skip === 1 && L.log.fetched.length === 0, 'sw cũ (/): cài ngay (skipWaiting), không cache khung app');
  await L.wait('activate');
  const keys = [...L.store.keys()];
  ok(!keys.includes('lexkite-20261001000000'), 'sw cũ (/): xóa cache khung app cũ');
  ok(keys.includes('lk-meta') && keys.includes('lk-audio') && L.store.get('lk-meta').has('/__meta'), 'sw cũ (/): giữ dữ liệu (lk-meta nhắc học, lk-audio)');
  ok(L.log.unregPS.includes('vb-daily'), 'sw cũ (/): gỡ nhắc học định kỳ cũ (tránh nhắc 2 lần)');
  // Mở "/" có mạng → trang giới thiệu từ mạng (không phải app cũ)
  const nav = (p, mode = 'navigate') => ({ request: { url: 'https://lexkite.com' + p, mode, method: 'GET' } });
  let r = await L.wait('fetch', nav('/'));
  ok(r && (await (await r).text()) === 'net:/', 'sw cũ (/): mở "/" có mạng → lấy trang giới thiệu từ mạng');
  ok(!(await L.wait('fetch', nav('/js/app.js', 'no-cors'))), 'sw cũ (/): tài nguyên khác đi thẳng mạng (không respondWith)');
  ok(!(await L.wait('fetch', nav('/vi/blog/'))), 'sw cũ (/): blog đi thẳng mạng');
  // Mất mạng, app /app/ đã có trong cache → chuyển sang /app/ (PWA cũ iOS start_url /index.html)
  const off = await sw('https://lexkite.com/', { cache: { [CUR]: { '/app/': 'app shell' } }, online: false });
  r = await off.wait('fetch', nav('/index.html'));
  const rr = r && await r;
  ok(rr && rr.status === 302 && rr.headers.get('location') === 'https://lexkite.com/app/', 'sw cũ (/): mất mạng mở /index.html → 302 sang /app/ (app offline vẫn chạy)');
  const off2 = await sw('https://lexkite.com/', { online: false });
  let threw = false; try { const x = await (await off2.wait('fetch', nav('/'))); threw = x.type === 'error'; } catch { threw = true; }
  ok(threw, 'sw cũ (/): mất mạng, chưa có app trong cache → lỗi mạng bình thường (không trả app cũ)');
}
{ // Phạm vi /app/: cache khung app mới, dọn cache cũ, giữ dữ liệu
  const A = await sw('https://lexkite.com/app/', { cache: { 'lexkite-20261001000000': { '/index.html': 'old' }, 'lk-meta': { '/__meta': '{}' }, 'lk-audio': {} } });
  await A.wait('install');
  ok(A.log.fetched.includes('/app/') && A.log.fetched.includes('/js/app.js') && A.log.fetched.includes('/css/style.css') && !A.log.fetched.includes('/') && !A.log.fetched.includes('/index.html'), 'sw /app/: cache khung app (/app/, /js/…, /css/…), không cache trang giới thiệu');
  await A.wait('activate');
  const keys = [...A.store.keys()];
  ok(keys.includes(CUR) && keys.includes('lk-meta') && keys.includes('lk-audio') && !keys.includes('lexkite-20261001000000'), 'sw /app/: giữ cache hiện hành + dữ liệu, xóa cache cũ');
  ok(A.log.claim === 1 && A.log.unregPS.length === 0, 'sw /app/: nhận quyền điều khiển tab /app/, không gỡ nhắc học');
  const off = await sw('https://lexkite.com/app/', { cache: { [CUR]: { '/app/': 'app shell' } }, online: false });
  const r = await (await off.wait('fetch', { request: { url: 'https://lexkite.com/app/?hl=ja', mode: 'navigate', method: 'GET' } }));
  ok(r && (await r.text()) === 'app shell', 'sw /app/: mất mạng → mở app từ cache');
  ok(/'\/app\/#\/review'/.test(SW) && !/'\.\/#\//.test(SW), 'sw: thông báo mở /app/#/review (không còn ./#/ = trang giới thiệu)');
  ok(!/indexedDB|localStorage/.test(SW.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')), 'sw: không đụng tới IndexedDB/localStorage (dữ liệu học an toàn)');
}

// ---------- 5) App + manifest ----------
const APPJS = rd('web/js/app.js'), MAN = JSON.parse(rd('web/manifest.webmanifest')), APPHTML = rd('web/app/index.html');
ok(/navigator\.serviceWorker\.register\('\/sw\.js', \{ scope: '\/app\/' \}\)/.test(APPJS), 'app.js: đăng ký /sw.js với scope /app/');
ok(MAN.start_url === '/app/#/home' && MAN.scope === '/app/' && MAN.id === '/' && (MAN.shortcuts || []).every(s => s.url.startsWith('/app/#/')), 'manifest: start_url/scope /app/, id giữ "/" (bản cài cũ nhận cập nhật), shortcut /app/#/…');
ok(/<!--base--><base href="\/">[\s\S]*?<!--\/base-->/.test(APPHTML) && APPHTML.indexOf('<!--base-->') < APPHTML.indexOf('<link'), 'app/index.html: <base href="/"> đứng trước mọi tài nguyên (khối <!--base--> để add-on/mobile bỏ)');
ok(!/name="robots"[^>]*noindex/.test(APPHTML) && APPHTML.includes('rel="canonical" href="https://lexkite.com/"'), 'app/index.html: canonical về trang giới thiệu, không noindex (Lighthouse SEO; canonical gộp trùng, robots.txt vẫn chặn ?sandbox=/?demo=)');
ok(APPHTML.includes('href="/?home=1" data-l="about"'), 'app/index.html: có liên kết "Trang giới thiệu" (?home=1)');
// Chặn liên kết "#…" (do <base href="/">): bấm → đổi hash tại chỗ, không rời /app/
{
  const dom = new JSDOM(APPHTML.replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<link[^>]+>/g, ''), { url: 'https://lexkite.com/app/', runScripts: 'dangerously' });
  const w = dom.window, d = w.document; let left = false;
  w.addEventListener('beforeunload', () => { left = true; });
  d.querySelector('a[href="#/review"]').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  ok(w.location.pathname === '/app/' && w.location.hash === '#/review' && !left, `app: bấm <a href="#/review"> → ở lại /app/#/review (đang ở ${w.location.pathname}${w.location.hash})`);
}
// Bí danh gõ nhầm → route có thật
{
  const m = APPJS.match(/const ROUTE_ALIAS = (\{[^}]+\});/);
  let A = null; try { A = m && new Function('return ' + m[1])(); } catch { /* */ }
  ok(A && A.wellcom === 'welcome' && A.welcom === 'welcome', 'app.js: ROUTE_ALIAS có #/wellcom → #/welcome');
  const all = fs.readdirSync('web/js').filter(f => f.endsWith('.js')).map(f => rd('web/js/' + f)).join('\n');
  const real = new Set([...all.matchAll(/routes(?:\.([a-z][\w]*)|\[['"]([\w-]+)['"]\])\s*=/g)].map(x => x[1] || x[2]));
  const bad = A ? Object.entries(A).filter(([k, v]) => !real.has(v) || real.has(k)) : [];
  ok(A && !bad.length, `app.js: bí danh phải trỏ tới route có thật và không che route thật: ${bad.map(x => x.join('→')).join(', ')}`);
}

if (errs.length) { console.error(`✗ landing-routing: ${errs.length}/${n} lỗi\n  - ` + errs.join('\n  - ')); process.exit(1); }
console.log(`✓ landing-routing: ${n} kiểm tra – trang giới thiệu ${LANGS.length} ngôn ngữ, chuyển hướng /app/, gợi ý ngôn ngữ, di chuyển service worker`);
