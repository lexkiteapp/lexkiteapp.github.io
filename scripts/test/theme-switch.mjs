// 🌗 Nút giao diện Sáng/Tối/Tự động trên MỌI trang tĩnh ngoài app (landing, pháp lý, 404, blog, công cụ, SEO/từ điển, uy tín, video, blog-lang, bye).
// Kiểm tĩnh + jsdom (npm test, không cần trình duyệt):
//  1) script chống nháy <script data-lkt> nằm trong <head>, TRƯỚC mọi <style>/<link rel=stylesheet> (không nháy sáng khi tải)
//  2) không còn luật @media (prefers-color-scheme) nào chưa đổi sang mẫu app (:root:not([data-theme=…]) + :root[data-theme=…])
//  3) trang có nút ngôn ngữ (header) có nút giao diện + script nút; nhãn nút đủ 15 ngôn ngữ (lấy từ web/js/i18n, không chữ Việt lọt)
//  4) hành vi: lưu lk.theme, vòng tự động → sáng → tối → tự động, aria-label đổi theo trạng thái, đồng bộ tab, không có lk.theme = theo hệ thống
// Trình duyệt thật (tương phản axe sáng + tối, không nháy): scripts/test/theme-static.mjs (CI theme-qa.yml).
// Dùng: node scripts/test/theme-switch.mjs [dist]  (mặc định kiểm web/ + dist/ nếu đã dựng)
import fs from 'node:fs'; import path from 'node:path'; import { JSDOM } from 'jsdom'; import { manifestOf, plainRefs } from '../build-hash.mjs';
import { THEME_HEAD, THEME_META, THEME_COLOR, LKT_JS, TSW_JS, LANG_JS, FOOT_JS, SITE_UI_JS, SITE_UI_V, themeCss, themeLabels, themeSwitch, themePill, siteFooter, LANG_NAMES } from '../lib/site-layout.mjs';

const bad = []; let pages = 0;
const ok = (c, m) => { if (!c) bad.push(m); };
// Ngoài phạm vi: app (theme riêng web/js/app.js), quản trị (lk.admTheme), mẫu email, thư viện thiết kế, iframe nhúng (theo trang chủ nhà, 0 storage), bản app gốc
const SKIP = /(^|\/)(app|admin|templates|design|embed|teach|tests?|vendor|js|css|img|icons|data|audio|ext)(\/|$)|admin[\w-]*\.html$|\/\.well-known\//;
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.join(d, e.name), r = path.relative(base, p);
  if (e.isDirectory()) return SKIP.test(r + '/') ? [] : walk(p, base);
  return e.name.endsWith('.html') && !SKIP.test(r) ? [p] : [];
});
const SJ = {}, siteJs = r => SJ[r] ??= (fs.existsSync(path.join(r, 'js/site.js')) ? plainRefs(fs.readFileSync(path.join(r, 'js/site.js'), 'utf8'), manifestOf(r)) : ''); // dist: tên băm /h/… đọc về tên gốc (scripts/build-hash.mjs)
const roots = process.argv[2] ? [process.argv[2]] : ['web', ...(fs.existsSync('dist') ? ['dist'] : [])];
for (const root of roots) for (const f of walk(root)) {
  const h = fs.readFileSync(f, 'utf8'); if (!/^\s*<!doctype html/i.test(h)) continue; // mảnh HTML (partial) không phải trang
  if (/<meta http-equiv="refresh"[^>]*url=/i.test(h.slice(0, 600)) && !/<style/i.test(h)) continue; // trang chuyển hướng trơn, không vẽ gì
  pages++;
  const head = (h.match(/<head>([\s\S]*?)<\/head>/i) || [, ''])[1], at = head.indexOf('<script data-lkt>');
  const firstCss = Math.min(...[head.search(/<style[\s>]/i), head.search(/<link[^>]+rel="?stylesheet/i)].filter(i => i >= 0).concat(Infinity));
  ok(at >= 0 && head.includes(THEME_HEAD), `${f}: thiếu script chống nháy giao diện trong <head>`);
  ok(at < 0 || at < firstCss, `${f}: script chống nháy phải đứng trước mọi <style>/<link stylesheet>`);
  ok(head.includes(THEME_META) && (head.match(/<meta name="theme-color"/g) || []).length === 2, `${f}: theme-color phải là cặp sáng/tối theo nền (site-layout THEME_META)`);
  for (const [, c] of h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) if (themeCss(c) !== c) { ok(false, `${f}: còn @media (prefers-color-scheme) chưa đổi sang mẫu data-theme`); break; }
  if (/data-lsw/.test(h)) {
    ok(/<button\b(?=[^>]*\stype="button")[^>]*\sdata-tsw[\s=>]/.test(h), `${f}: có nút ngôn ngữ nhưng thiếu nút giao diện`); // nút themeSwitch (.tsw) hoặc nút Stitch mang data-tsw (landing v3)
    ok(h.includes("closest('[data-tsw]')") || h.includes('closest("[data-tsw]")') || h.includes(`/js/site-ui.js?v=${SITE_UI_V}`) || (/\/js\/site\.js\?v=/.test(h) && siteJs(root).includes(`/js/site-ui.js?v=${SITE_UI_V}`)), `${f}: thiếu script nút giao diện`); // landing: site.js (defer) nạp site-ui.js sau load
  }
  if (/class="site-foot"/.test(h)) ok((h.match(/class="tsb" data-tsv="(auto|light|dark)" aria-pressed/g) || []).length === 3, `${f}: chân trang thiếu viên 3 nút Tự động/Sáng/Tối (bản vẽ Stitch)`);
  // Trang có nút giao diện/ngôn ngữ nạp JS dùng chung đúng phiên bản (?v= = băm nội dung hiện tại – trang dựng cũ → đỏ)
  if (/data-tsw|data-lsw|class="flang"/.test(h) && h.includes('/js/site-ui.js')) ok(h.includes(`/js/site-ui.js?v=${SITE_UI_V}`), `${f}: /js/site-ui.js sai phiên bản – dựng lại trang`);
}
ok(pages >= (roots.includes('dist') ? 1000 : 60), `chỉ thấy ${pages} trang – sai thư mục?`);
for (const root of roots) { const f = path.join(root, 'js/site-ui.js'); ok(fs.existsSync(f) && (root !== 'web' || fs.readFileSync(f, 'utf8') === SITE_UI_JS()), `${f}: thiếu hoặc cũ so với site-layout – chạy node scripts/build-landing.mjs`); } // dist: bản đã rút gọn

// App /app/ + add-on: CÙNG mã chống nháy + theme-color với trang ngoài (một nguồn) – hồi quy lỗi 3/11 "trang ngoài không theo app"
{ const h = fs.readFileSync('web/app/index.html', 'utf8'), head = (h.match(/<head>([\s\S]*?)<\/head>/i) || [, ''])[1], at = head.indexOf(THEME_HEAD), css = head.search(/<link[^>]+rel="?stylesheet|<style[\s>]/i);
  ok(at >= 0 && at < css, 'web/app/index.html: thiếu THEME_HEAD trước CSS (chạy node scripts/build-landing.mjs)');
  ok(head.includes(THEME_META), 'web/app/index.html: thiếu cặp theme-color THEME_META');
  ok(fs.existsSync('web/js/lkt.js') && fs.readFileSync('web/js/lkt.js', 'utf8') === LKT_JS(), 'web/js/lkt.js cũ so với THEME_HEAD – chạy node scripts/build-landing.mjs');
  const e = fs.existsSync('extension/app/index.html') ? fs.readFileSync('extension/app/index.html', 'utf8') : '', eh = (e.match(/<head>([\s\S]*?)<\/head>/i) || [, ''])[1];
  ok(!e || (eh.indexOf('<script src="js/lkt.js"></script>') >= 0 && eh.indexOf('<script src="js/lkt.js"></script>') < eh.search(/<link[^>]+rel="?stylesheet/i) && !eh.includes('<script data-lkt>')), 'extension/app/index.html: phải nạp js/lkt.js (không nội tuyến, MV3) trước CSS – chạy bash scripts/build-extension.sh');
  const A = fs.readFileSync('web/js/app.js', 'utf8');
  ok(/localStorage[\s\S]{0,200}'lk\.theme'/.test(A) && /addEventListener\('storage'[^\n]*'lk\.theme'/.test(A) && /lkT\(\)/.test(A), 'web/js/app.js: applyTheme phải ghi lk.theme, nghe storage và khởi động theo lkT() (đồng bộ với trang ngoài)'); }

// Nhãn: đủ 15 ngôn ngữ, khác bản tiếng Việt gốc (đã dịch thật qua pipeline docs/I18N-PIPELINE.md), không rỗng
for (const l of Object.keys(LANG_NAMES)) {
  const L = themeLabels(l);
  ok(L.length === 4 && L.every(Boolean), `nhãn nút giao diện ${l}: thiếu chuỗi`);
  if (l !== 'vi') ok(L.every(x => !/[ạảãàáâậầấẩẫăắằẳẵặẹẻẽềếểễệịỉĩọỏõôốồổỗộơớờởỡợụủũưứừửữựỳýỵỷỹđ]/i.test(x)), `nhãn nút giao diện ${l}: lọt chữ Việt (${L.join(' | ')})`);
  if (l !== 'en' && l !== 'vi') ok(L.join() !== themeLabels('en').join(), `nhãn nút giao diện ${l}: còn tiếng Anh (chưa dịch)`);
}

// Hành vi (jsdom)
const run = (stored, mq = false) => {
  const dom = new JSDOM(`<!doctype html><html><head><meta charset="utf-8">${THEME_HEAD}${THEME_META}</head><body>${themeSwitch('ja')}${themeSwitch('ja')}${themePill('ja')}</body></html>`, { url: 'https://lexkite.com/ja/', runScripts: 'outside-only' });
  const w = dom.window; if (stored) w.localStorage.setItem('lk.theme', stored);
  w.matchMedia = () => ({ matches: mq });
  w.eval((THEME_HEAD.match(/<script data-lkt>([\s\S]*)<\/script>/) || [])[1]); w.eval(TSW_JS); return w;
};
const L = themeLabels('ja'), lab = (w, i = 0) => w.document.querySelectorAll('[data-tsw]')[i].getAttribute('aria-label');
let w = run(null);
ok(!w.document.documentElement.hasAttribute('data-theme') && lab(w) === `${L[3]}: ${L[0]}`, 'chưa chọn → tự động (không data-theme), nhãn "theo hệ thống"');
w.document.querySelector('[data-tsw]').click();
ok(w.document.documentElement.getAttribute('data-theme') === 'light' && w.localStorage.getItem('lk.theme') === 'light' && lab(w, 1) === `${L[3]}: ${L[1]}`, 'bấm 1 → sáng, lưu lk.theme, mọi nút cùng đổi nhãn');
w.document.querySelector('[data-tsw]').click();
ok(w.document.documentElement.getAttribute('data-theme') === 'dark' && w.localStorage.getItem('lk.theme') === 'dark' && lab(w) === `${L[3]}: ${L[2]}`, 'bấm 2 → tối');
const tcs = w => [...w.document.querySelectorAll('meta[name=theme-color]')].map(m => m.content).join(',');
ok(tcs(w) === `${THEME_COLOR.dark},${THEME_COLOR.dark}`, `ép tối → cả 2 thẻ theme-color = nền tối (${tcs(w)})`);
w.document.querySelector('[data-tsw]').click();
ok(!w.document.documentElement.hasAttribute('data-theme') && w.localStorage.getItem('lk.theme') === null, 'bấm 3 → tự động (xoá lk.theme)');
ok(tcs(w) === `${THEME_COLOR.light},${THEME_COLOR.dark}`, `tự động → theme-color trả về theo media sáng/tối (${tcs(w)})`);
// Viên 3 nút chân trang (bản vẽ Stitch): bấm thẳng một trạng thái; aria-pressed đúng nút đang chọn, đồng bộ với nút vòng
const pr = w => [...w.document.querySelectorAll('[data-tsv]')].map(b => b.getAttribute('aria-pressed')).join(',');
ok(pr(w) === 'true,false,false', 'viên: tự động → nút "theo hệ thống" aria-pressed=true');
w.document.querySelector('[data-tsv=dark]').click();
ok(w.document.documentElement.getAttribute('data-theme') === 'dark' && w.localStorage.getItem('lk.theme') === 'dark' && pr(w) === 'false,false,true' && lab(w) === `${L[3]}: ${L[2]}`, 'viên: bấm Tối → tối ngay, lưu lk.theme, nút vòng cùng đổi nhãn');
w.document.querySelector('[data-tsv=dark] svg').dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
ok(w.document.documentElement.getAttribute('data-theme') === 'dark', 'viên: bấm lại nút đang chọn (cả vào biểu tượng) → giữ nguyên, không xoay vòng');
w.document.querySelector('[data-tsv=light]').click(); ok(w.document.documentElement.getAttribute('data-theme') === 'light' && pr(w) === 'false,true,false', 'viên: bấm Sáng → sáng');
w.document.querySelector('[data-tsv=auto]').click(); ok(!w.document.documentElement.hasAttribute('data-theme') && w.localStorage.getItem('lk.theme') === null && pr(w) === 'true,false,false', 'viên: bấm Tự động → xoá lk.theme');
w.dispatchEvent(Object.assign(new w.Event('storage'), { key: 'lk.theme', newValue: 'dark' }));
ok(w.document.documentElement.getAttribute('data-theme') === 'dark', 'tab khác đổi giao diện → tab này đổi theo (sự kiện storage)');
w = run('dark'); ok(w.document.documentElement.getAttribute('data-theme') === 'dark' && lab(w) === `${L[3]}: ${L[2]}`, 'đã lưu tối → <head> đặt data-theme=dark trước khi vẽ');
w = run('light', true); ok(w.document.documentElement.getAttribute('data-theme') === 'light', 'đã lưu sáng trên máy để tối → vẫn sáng');
w = run('<img onerror=1>'); ok(!w.document.documentElement.hasAttribute('data-theme'), 'giá trị lạ trong lk.theme → bỏ qua (tự động)');

// Đồng bộ app ↔ web (cùng origin): app lưu ielts.settings {theme} + ielts.settingsAt; web lưu lk.theme + lk.themeAt; mới hơn thắng
const run2 = (seed, mq = false) => {
  const dom = new JSDOM(`<!doctype html><html><head><meta charset="utf-8"></head><body>${themeSwitch('en')}</body></html>`, { url: 'https://lexkite.com/en/', runScripts: 'outside-only' });
  const w = dom.window; for (const [k, v] of Object.entries(seed)) w.localStorage.setItem(k, v); w.matchMedia = () => ({ matches: mq });
  w.eval((THEME_HEAD.match(/<script data-lkt>([\s\S]*)<\/script>/) || [])[1]); w.eval(TSW_JS); return w;
};
const th = w => w.document.documentElement.getAttribute('data-theme');
w = run2({ 'ielts.settings': JSON.stringify({ theme: 'dark', goal: 20 }), 'ielts.settingsAt': '1000' });
ok(th(w) === 'dark', 'app đặt tối (ielts.settings.theme=dark), web chưa chọn → trang tĩnh tối');
w = run2({ 'ielts.settings': JSON.stringify({ theme: 'dark' }), 'ielts.settingsAt': '1000', 'lk.theme': 'light', 'lk.themeAt': '2000' });
ok(th(w) === 'light', 'web chọn sáng SAU app → sáng (mốc mới hơn thắng)');
w = run2({ 'ielts.settings': JSON.stringify({ theme: 'dark' }), 'ielts.settingsAt': '3000', 'lk.theme': 'light', 'lk.themeAt': '2000' });
ok(th(w) === 'dark', 'app đổi tối SAU web → tối');
w = run2({ 'ielts.settings': JSON.stringify({ theme: 'auto' }), 'ielts.settingsAt': '3000', 'lk.theme': 'dark', 'lk.themeAt': '2000' });
ok(th(w) === null, 'app chọn tự động sau cùng → theo hệ thống');
w = run2({ 'ielts.settings': '{bad json', 'lk.theme': 'dark' }); ok(th(w) === 'dark', 'ielts.settings hỏng → bỏ qua, vẫn theo lk.theme');
w = run2({ 'ielts.settings': JSON.stringify({ theme: 'dark', goal: 20, uiX: [1] }), 'ielts.settingsAt': '1000' });
w.document.querySelector('[data-tsw]').click(); // tối → tự động
{ const p = JSON.parse(w.localStorage.getItem('ielts.settings')); ok(p.theme === 'auto' && p.goal === 20 && p.uiX[0] === 1 && +w.localStorage.getItem('ielts.settingsAt') > 1000 && w.localStorage.getItem('ielts.settingsAt') === w.localStorage.getItem('lk.themeAt'), 'bấm nút web → vá ielts.settings.theme + settingsAt, giữ nguyên khoá khác'); }
w.document.querySelector('[data-tsw]').click(); ok(JSON.parse(w.localStorage.getItem('ielts.settings')).theme === 'light' && th(w) === 'light', 'bấm tiếp → sáng ở cả hai');
w = run2({}); w.document.querySelector('[data-tsw]').click(); ok(w.localStorage.getItem('ielts.settings') === null && w.localStorage.getItem('ielts.settingsAt') === null, 'chưa từng mở app → không tạo ielts.settings');
w = run2({ 'ielts.settings': JSON.stringify({ theme: 'light' }), 'ielts.settingsAt': '1' });
w.localStorage.setItem('ielts.settings', JSON.stringify({ theme: 'dark' })); w.localStorage.setItem('ielts.settingsAt', String(Date.now()));
w.dispatchEvent(Object.assign(new w.Event('storage'), { key: 'ielts.settings', newValue: '' })); ok(th(w) === 'dark', 'app (tab khác) đổi giao diện → trang tĩnh đổi theo');

// Ngôn ngữ: lựa chọn của app (vb.uiLang) / web (lk.lang) → link nội bộ (logo, Mở app, nav, chân trang) trỏ bản ngôn ngữ đó; menu ngôn ngữ giữ nguyên
const runL = (seed, page = 'en') => {
  const dom = new JSDOM(`<!doctype html><html lang="${page}"><body><header><a class="logo" href="/${page}/">x</a><a href="/app/?hl=${page}#/topic/a">app</a><a href="/${page}/blog/">b</a><a href="/en/vocabulary/">v</a></header>${siteFooter({ lang: page, text: 'Lexkite', langHref: l => `/${l}/blog/` })}</body></html>`, { url: `https://lexkite.com/${page}/`, runScripts: 'outside-only' });
  const w = dom.window; for (const [k, v] of Object.entries(seed)) w.localStorage.setItem(k, v); w.matchMedia = q => ({ matches: false, addEventListener() {} }); w.eval(LANG_JS); w.eval(FOOT_JS); return w;
};
w = runL({ 'vb.uiLang': 'vi' });
{ const d = w.document, hr = s => d.querySelector(s).getAttribute('href');
  ok(hr('.logo') === '/vi/' && hr('header a[href^="/app/"]') === '/app/#/topic/a' && hr('header a[href$="/blog/"]') === '/vi/blog/' && hr('header a[href*=vocabulary]') === '/en/vocabulary/', 'app chọn vi → logo /vi/, Mở app /app/ (giữ #), blog /vi/blog/; link không chắc có bản dịch giữ nguyên');
  ok(hr('.flogo') === '/vi/' && hr('.fbtn.pri') === '/app/' && d.querySelector('.flangs [lang=ja]').getAttribute('href') === '/ja/blog/', 'chân trang: logo + Mở app theo vi, danh sách ngôn ngữ không bị đổi');
  d.addEventListener('click', e => e.preventDefault()); // jsdom không chuyển trang
  d.querySelector('.flangs [lang=ja]').dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  ok(w.localStorage.getItem('lk.lang') === 'ja' && w.localStorage.getItem('vb.uiLang') === 'ja', 'chọn ngôn ngữ trên web → ghi cả lk.lang và vb.uiLang (app mở ra cùng ngôn ngữ)'); }
w = runL({}); ok(w.document.querySelector('.logo').getAttribute('href') === '/en/' && w.document.querySelector('header a[href^="/app/"]').getAttribute('href') === '/app/?hl=en#/topic/a', 'chưa chọn ngôn ngữ → link giữ nguyên');
w = runL({ 'lk.lang': 'ar' }, 'ja'); ok(w.document.querySelector('.logo').getAttribute('href') === '/ar/', 'chỉ có lk.lang → vẫn theo lk.lang');
w = runL({ 'vb.uiLang': '"/><x' }); ok(w.document.querySelector('.logo').getAttribute('href') === '/en/', 'mã ngôn ngữ lạ → bỏ qua');
{ const d = runL({}).document, g = [...d.querySelectorAll('.fg')]; ok(g.length === 3 && g.every(x => x.open) && d.querySelectorAll('.flegal a').length === 4 && d.querySelector('.flang summary').getAttribute('aria-label').startsWith('Language: '), 'chân trang: 3 nhóm (máy tính luôn mở) + 4 link pháp lý ở hàng đáy, menu ngôn ngữ có aria-label'); }

// Bộ đổi CSS: hai chiều + bất biến khi chạy lại
const c1 = themeCss(':root{--a:1;color-scheme:light dark}@media (prefers-color-scheme:dark){:root{--a:2}.x,[dir=rtl] .y{color:red}}@media (prefers-color-scheme:light){.z{color:blue}}');
ok(c1.includes('@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--a:2}:root:not([data-theme=light]) .x,:root:not([data-theme=light])[dir=rtl] .y{color:red}}:root[data-theme=dark]{--a:2}:root[data-theme=dark] .x,:root[data-theme=dark][dir=rtl] .y{color:red}'), 'themeCss: luật tối → trong media + bản ép [data-theme=dark]');
ok(c1.includes(':root:not([data-theme=dark]) .z{color:blue}') && c1.includes(':root[data-theme=light] .z{color:blue}'), 'themeCss: luật sáng → hai chiều');
ok(c1.includes(':root[data-theme=dark]{color-scheme:dark}') && themeCss(c1) === c1, 'themeCss: color-scheme theo lựa chọn + chạy lại không đổi');

if (bad.length) { console.log(`✗ theme-switch: ${bad.length} lỗi / ${pages} trang\n  - ` + bad.slice(0, 30).join('\n  - ')); process.exit(1); }
console.log(`✓ theme-switch: ${pages} trang tĩnh (${roots.join(' + ')}) có chống nháy + luật tối/sáng theo data-theme + nút giao diện; nhãn 15 ngôn ngữ; hành vi lưu/vòng/đồng bộ tab`);
