// Cổng "liên kết nội bộ không được 404 – kể cả liên kết do JS sinh" (METHODS "Làm đúng 1 lần" bước 4; sự cố /vi/blog/-lang 24/10).
// Chạy: node scripts/test/links-js.mjs [dist]   (cần dist đã build blog: bash scripts/build-web.sh hoặc node scripts/build-blog.mjs trên bản sao web/)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import { badPath, joinPath } from '../lib/url-guard.mjs';
const DIST = process.argv[2] || 'dist', SITE = 'https://lexkite.com';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗ ' + m); } };
if (!fs.existsSync(path.join(DIST, 'vi/blog/index.html'))) { console.log(`✗ ${DIST}/vi/blog chưa build`); process.exit(1); }

// 1) Cổng ghép URL
for (const bad of ['/vi/blog/-lang', '/vi/blog/undefined/', '/vi/blog/null', '/vi//blog/', '/vi/blog/x-/', '/vi/blog/[object Object]/']) ok(badPath(bad), `badPath phải chặn ${bad}`);
for (const good of ['/vi/blog/', '/vi/blog/fsrs-la-gi/', '/app/#/review', '/en/blog/topic/ielts/', '/.well-known/x', '//cdn.example.com/a']) ok(!badPath(good), `badPath không được chặn ${good}`);
for (const parts of [['vi', 'blog', ''], ['vi', 'blog', undefined], ['', 'blog', 'x'], ['vi', 'blog', '-lang']]) { let t = false; try { joinPath(...parts); } catch { t = true; } ok(t, `joinPath phải ném lỗi với ${JSON.stringify(parts)}`); }
ok(joinPath('vi', 'blog', 'fsrs-la-gi') === '/vi/blog/fsrs-la-gi', 'joinPath ghép đúng');

// 2) /blog, /blog/, /blog-lang(.html) → đích đúng (không bao giờ ra đoạn rác)
const inline = fs.readFileSync(path.join(DIST, 'blog-lang.html'), 'utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
const redirect = async (pathname, langs = ['en']) => new Promise(res => {
  const loc = { pathname, replace: u => res(u) };
  const sb = { location: loc, navigator: { languages: langs, language: langs[0] }, localStorage: { getItem: () => null }, fetch: u => Promise.resolve({ ok: true, text: () => Promise.resolve(fs.readFileSync(path.join(DIST, u, ''), 'utf8')) }), console };
  sb.fetch = u => { const f = path.join(DIST, u); return Promise.resolve(fs.existsSync(f) ? { ok: true, text: async () => fs.readFileSync(f, 'utf8') } : { ok: false, text: async () => '' }); };
  vm.runInNewContext(inline, sb); setTimeout(() => res('(không chuyển)'), 1500);
});
for (const [p, want] of [['/blog', '/en/blog/'], ['/blog/', '/en/blog/'], ['/blog-lang', '/en/blog/'], ['/blog-lang.html', '/en/blog/'], ['/blog/fsrs-la-gi/', '/en/blog/fsrs-la-gi/'], ['/blog/-lang', '/en/blog/']]) ok(await redirect(p) === want, `blog-lang.html: ${p} → ${want} (được ${await redirect(p)})`);
ok(await redirect('/blog-lang', ['vi']) === '/vi/blog/', 'blog-lang.html: /blog-lang (vi) → /vi/blog/');

// 3) Quét liên kết tĩnh của mọi trang blog + liên kết do JS sinh trên các trang chính (jsdom chạy script thật)
const exists = p => { const f = path.join(DIST, decodeURIComponent(p)); return (fs.existsSync(f) && fs.statSync(f).isFile()) || fs.existsSync(path.join(f, 'index.html')) || fs.existsSync(f + '.html'); };
const topOk = p => { const t = p.split('/')[1]; return !t || /^[a-z]{2}$/.test(t) && fs.existsSync(path.join(DIST, t, 'blog')) && p.split('/')[2] === 'blog' || t === 'blog'; };
const check = (where, raw) => {
  let u; try { u = new URL(raw, SITE + '/'); } catch { ok(false, `${where}: URL không phân tích được ${raw}`); return; }
  if (u.origin !== SITE) return;
  const why = badPath(u.pathname); if (why) { ok(false, `${where}: liên kết hỏng ${raw} (${why})`); return; }
  if (u.pathname.startsWith('/app/') || !topOk(u.pathname)) return;
  if (!/\.(xml|xsl|json|txt|webp|avif|png|jpg|svg|ico|js|css)$/.test(u.pathname) && !exists(u.pathname)) ok(false, `${where}: liên kết tới trang không có ${raw}`);
};
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.html') ? [path.join(d, e.name)] : []);
let nStatic = 0;
for (const l of fs.readdirSync(DIST).filter(d => /^[a-z]{2}$/.test(d) && fs.existsSync(path.join(DIST, d, 'blog')))) for (const f of walk(path.join(DIST, l, 'blog'))) {
  const h = fs.readFileSync(f, 'utf8'); nStatic++;
  for (const m of h.matchAll(/(?:href|data-href|action)="([^"#]*)/g)) check(f.replace(DIST + '/', ''), m[1].replace(/&amp;/g, '&'));
}
const first = l => fs.readdirSync(path.join(DIST, l, 'blog'), { withFileTypes: true }).find(e => e.isDirectory() && fs.existsSync(path.join(DIST, l, 'blog', e.name, 'index.html')) && !/^(chu-de|the|category|topic|tag|page|trang|kategorie|tema|categorie)/.test(e.name));
const pages = [['/', 'index.html'], ['/vi/blog/', 'vi/blog/index.html'], ['/en/blog/', 'en/blog/index.html'], ['/404.html', '404.html']];
for (const l of ['vi', 'en']) { const e = first(l); if (e) pages.push([`/${l}/blog/${e.name}/`, `${l}/blog/${e.name}/index.html`]); }
let nJs = 0;
for (const [url, file] of pages) {
  if (!fs.existsSync(path.join(DIST, file))) continue;
  const errs = [];
  const dom = new JSDOM(fs.readFileSync(path.join(DIST, file), 'utf8'), { url: SITE + url, runScripts: 'dangerously', pretendToBeVisual: true, beforeParse(w) {
    w.fetch = async u => { const f = path.join(DIST, new URL(u, SITE).pathname); return fs.existsSync(f) ? { ok: true, text: async () => fs.readFileSync(f, 'utf8'), json: async () => JSON.parse(fs.readFileSync(f, 'utf8')) } : { ok: false, text: async () => '', json: async () => ({}) }; };
    w.matchMedia = () => ({ matches: false, addListener() {}, addEventListener() {} }); w.scrollTo = () => {}; w.IntersectionObserver = class { observe() {} disconnect() {} };
    w.addEventListener('error', e => errs.push(e.message));
  } });
  await new Promise(r => setTimeout(r, 400));
  // tương tác phổ biến: mở menu ngôn ngữ để lộ liên kết JS
  dom.window.document.querySelectorAll('[aria-haspopup]').forEach(b => b.click());
  await new Promise(r => setTimeout(r, 50));
  for (const a of dom.window.document.querySelectorAll('a[href], [data-href]')) { nJs++; check('DOM ' + url, a.getAttribute('href') || a.getAttribute('data-href')); }
  dom.window.close();
}
// 4) 404 gợi ý bài gần giống
{
  const rss = fs.readFileSync(path.join(DIST, 'vi/blog/rss.xml'), 'utf8'), slug = (rss.match(/\/vi\/blog\/([^/<]+)\/<\/link>/) || [])[1];
  const dom = new JSDOM(fs.readFileSync(path.join(DIST, '404.html'), 'utf8'), { url: `${SITE}/vi/blog/${slug}-xyz`, runScripts: 'dangerously', beforeParse(w) { w.fetch = async () => ({ ok: true, text: async () => rss }); } });
  await new Promise(r => setTimeout(r, 300));
  const links = [...dom.window.document.querySelectorAll('#sugL a')].map(a => a.getAttribute('href'));
  ok(links[0] === `/vi/blog/${slug}/`, `404: gợi ý đầu phải là /vi/blog/${slug}/ (được ${links[0]})`);
  ok(links.at(-1) === '/vi/blog/', '404: cuối danh sách là trang blog của ngôn ngữ');
  ok(!dom.window.document.getElementById('sug').hidden, '404: khối gợi ý hiện');
  links.forEach(h => check('404 gợi ý', h));
  const d2 = new JSDOM(fs.readFileSync(path.join(DIST, '404.html'), 'utf8'), { url: `${SITE}/vi/khong-phai-blog`, runScripts: 'dangerously', beforeParse(w) { w.fetch = async () => ({ ok: true, text: async () => rss }); } });
  await new Promise(r => setTimeout(r, 100)); ok(d2.window.document.getElementById('sug').hidden, '404: ngoài /<lang>/blog/ thì không gợi ý');
}
console.log(fails ? `✗ ${fails} lỗi` : `✓ links-js: ${nStatic} trang blog tĩnh + ${nJs} liên kết DOM do JS dựng đều hợp lệ`);
process.exit(fails ? 1 : 0);
