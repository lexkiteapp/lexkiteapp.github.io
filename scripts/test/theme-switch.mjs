// 🌗 Nút giao diện Sáng/Tối/Tự động trên MỌI trang tĩnh ngoài app (landing, pháp lý, 404, blog, công cụ, SEO/từ điển, uy tín, video, blog-lang, bye).
// Kiểm tĩnh + jsdom (npm test, không cần trình duyệt):
//  1) script chống nháy <script data-lkt> nằm trong <head>, TRƯỚC mọi <style>/<link rel=stylesheet> (không nháy sáng khi tải)
//  2) không còn luật @media (prefers-color-scheme) nào chưa đổi sang mẫu app (:root:not([data-theme=…]) + :root[data-theme=…])
//  3) trang có nút ngôn ngữ (header) có nút giao diện + script nút; nhãn nút đủ 15 ngôn ngữ (lấy từ web/js/i18n, không chữ Việt lọt)
//  4) hành vi: lưu lk.theme, vòng tự động → sáng → tối → tự động, aria-label đổi theo trạng thái, đồng bộ tab, không có lk.theme = theo hệ thống
// Trình duyệt thật (tương phản axe sáng + tối, không nháy): scripts/test/theme-static.mjs (CI theme-qa.yml).
// Dùng: node scripts/test/theme-switch.mjs [dist]  (mặc định kiểm web/ + dist/ nếu đã dựng)
import fs from 'node:fs'; import path from 'node:path'; import { JSDOM } from 'jsdom';
import { THEME_HEAD, TSW_JS, themeCss, themeLabels, themeSwitch, LANG_NAMES } from '../lib/site-layout.mjs';

const bad = []; let pages = 0;
const ok = (c, m) => { if (!c) bad.push(m); };
// Ngoài phạm vi: app (theme riêng web/js/app.js), quản trị (lk.admTheme), mẫu email, thư viện thiết kế, iframe nhúng (theo trang chủ nhà, 0 storage), bản app gốc
const SKIP = /(^|\/)(app|admin|templates|design|embed|teach|tests?|vendor|js|css|img|icons|data|audio|ext)(\/|$)|admin[\w-]*\.html$|\/\.well-known\//;
const walk = (d, base = d) => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => {
  const p = path.join(d, e.name), r = path.relative(base, p);
  if (e.isDirectory()) return SKIP.test(r + '/') ? [] : walk(p, base);
  return e.name.endsWith('.html') && !SKIP.test(r) ? [p] : [];
});
const roots = process.argv[2] ? [process.argv[2]] : ['web', ...(fs.existsSync('dist') ? ['dist'] : [])];
for (const root of roots) for (const f of walk(root)) {
  const h = fs.readFileSync(f, 'utf8'); if (!/^\s*<!doctype html/i.test(h)) continue; // mảnh HTML (partial) không phải trang
  if (/<meta http-equiv="refresh"[^>]*url=/i.test(h.slice(0, 600)) && !/<style/i.test(h)) continue; // trang chuyển hướng trơn, không vẽ gì
  pages++;
  const head = (h.match(/<head>([\s\S]*?)<\/head>/i) || [, ''])[1], at = head.indexOf('<script data-lkt>');
  const firstCss = Math.min(...[head.search(/<style[\s>]/i), head.search(/<link[^>]+rel="?stylesheet/i)].filter(i => i >= 0).concat(Infinity));
  ok(at >= 0 && head.includes(THEME_HEAD), `${f}: thiếu script chống nháy giao diện trong <head>`);
  ok(at < 0 || at < firstCss, `${f}: script chống nháy phải đứng trước mọi <style>/<link stylesheet>`);
  for (const [, c] of h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) if (themeCss(c) !== c) { ok(false, `${f}: còn @media (prefers-color-scheme) chưa đổi sang mẫu data-theme`); break; }
  if (/data-lsw/.test(h)) {
    ok(/<button type="button" class="tsw" data-tsw/.test(h), `${f}: có nút ngôn ngữ nhưng thiếu nút giao diện`);
    ok(h.includes("closest('[data-tsw]')") || h.includes('closest("[data-tsw]")'), `${f}: thiếu script nút giao diện`);
  }
}
ok(pages >= (roots.includes('dist') ? 1000 : 60), `chỉ thấy ${pages} trang – sai thư mục?`);

// Nhãn: đủ 15 ngôn ngữ, khác bản tiếng Việt gốc (đã dịch thật qua pipeline docs/I18N-PIPELINE.md), không rỗng
for (const l of Object.keys(LANG_NAMES)) {
  const L = themeLabels(l);
  ok(L.length === 4 && L.every(Boolean), `nhãn nút giao diện ${l}: thiếu chuỗi`);
  if (l !== 'vi') ok(L.every(x => !/[ạảãàáâậầấẩẫăắằẳẵặẹẻẽềếểễệịỉĩọỏõôốồổỗộơớờởỡợụủũưứừửữựỳýỵỷỹđ]/i.test(x)), `nhãn nút giao diện ${l}: lọt chữ Việt (${L.join(' | ')})`);
  if (l !== 'en' && l !== 'vi') ok(L.join() !== themeLabels('en').join(), `nhãn nút giao diện ${l}: còn tiếng Anh (chưa dịch)`);
}

// Hành vi (jsdom)
const run = (stored, mq = false) => {
  const dom = new JSDOM(`<!doctype html><html><head><meta charset="utf-8">${THEME_HEAD}</head><body>${themeSwitch('ja')}${themeSwitch('ja')}</body></html>`, { url: 'https://lexkite.com/ja/', runScripts: 'outside-only' });
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
w.document.querySelector('[data-tsw]').click();
ok(!w.document.documentElement.hasAttribute('data-theme') && w.localStorage.getItem('lk.theme') === null, 'bấm 3 → tự động (xoá lk.theme)');
w.dispatchEvent(Object.assign(new w.Event('storage'), { key: 'lk.theme', newValue: 'dark' }));
ok(w.document.documentElement.getAttribute('data-theme') === 'dark', 'tab khác đổi giao diện → tab này đổi theo (sự kiện storage)');
w = run('dark'); ok(w.document.documentElement.getAttribute('data-theme') === 'dark' && lab(w) === `${L[3]}: ${L[2]}`, 'đã lưu tối → <head> đặt data-theme=dark trước khi vẽ');
w = run('light', true); ok(w.document.documentElement.getAttribute('data-theme') === 'light', 'đã lưu sáng trên máy để tối → vẫn sáng');
w = run('<img onerror=1>'); ok(!w.document.documentElement.hasAttribute('data-theme'), 'giá trị lạ trong lk.theme → bỏ qua (tự động)');

// Bộ đổi CSS: hai chiều + bất biến khi chạy lại
const c1 = themeCss(':root{--a:1;color-scheme:light dark}@media (prefers-color-scheme:dark){:root{--a:2}.x,[dir=rtl] .y{color:red}}@media (prefers-color-scheme:light){.z{color:blue}}');
ok(c1.includes('@media (prefers-color-scheme:dark){:root:not([data-theme=light]){--a:2}:root:not([data-theme=light]) .x,:root:not([data-theme=light])[dir=rtl] .y{color:red}}:root[data-theme=dark]{--a:2}:root[data-theme=dark] .x,:root[data-theme=dark][dir=rtl] .y{color:red}'), 'themeCss: luật tối → trong media + bản ép [data-theme=dark]');
ok(c1.includes(':root:not([data-theme=dark]) .z{color:blue}') && c1.includes(':root[data-theme=light] .z{color:blue}'), 'themeCss: luật sáng → hai chiều');
ok(c1.includes(':root[data-theme=dark]{color-scheme:dark}') && themeCss(c1) === c1, 'themeCss: color-scheme theo lựa chọn + chạy lại không đổi');

if (bad.length) { console.log(`✗ theme-switch: ${bad.length} lỗi / ${pages} trang\n  - ` + bad.slice(0, 30).join('\n  - ')); process.exit(1); }
console.log(`✓ theme-switch: ${pages} trang tĩnh (${roots.join(' + ')}) có chống nháy + luật tối/sáng theo data-theme + nút giao diện; nhãn 15 ngôn ngữ; hành vi lưu/vòng/đồng bộ tab`);
