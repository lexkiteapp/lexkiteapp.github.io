// Chân thanh bên gọn (05/11): 1 hàng hồ sơ (#sideLevel) + nút ⋯ mở menu chứa MỌI link cũ của .side-foot + Tôi + Cài đặt + Báo lỗi (no-cuts).
// A11y: summary có aria-label/aria-haspopup, ↓ mở + focus mục đầu, ↑↓/Home/End xoay vòng, Esc đóng + trả focus về ⋯, chọn mục → đóng.
// CLS: style.css ẩn .side-foot trước khi JS chạy và chừa ô ⋯ trong #sideLevel (padding) → chèn ⋯ không xô bố cục. jsdom, npm test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
const R = p => fs.readFileSync(new URL(`../../web/${p}`, import.meta.url), 'utf8');
const html = R('app/index.html'), css = R('css/style.css');
const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://lexkite.com/app/#/home', pretendToBeVisual: true, runScripts: 'outside-only' });
const { window: w } = dom, d = w.document;
const f = d.querySelector('.side-foot'), before = [...f.querySelectorAll(':scope>a')].map(a => a.getAttribute('href'));
assert.ok(before.length >= 6, 'chân cũ có ≥ 6 link');
const b = d.createElement('button'); b.className = 'lk-rep in-side'; b.id = 'lkRep'; b.innerHTML = '<span class="lk-rep-l">Báo lỗi</span>'; f.appendChild(b);
w.LexPill = { b, place() {} }; w.LexReportLoad = () => Promise.reject(new Error('x'));
w.eval(R('js/report-pill-ui.js'));
const m = d.querySelector('.side-foot .sf-m'), dt = d.querySelector('.sf-more'), sm = dt.querySelector('summary');
for (const h of [...before, '#/me', '#/settings']) assert.ok(m.querySelector(`a[href="${h}"]`), `menu thiếu ${h}`);
assert.ok(m.contains(b), 'Báo lỗi nằm trong menu');
assert.equal(f.querySelectorAll(':scope>a').length, 0, 'không còn hàng link rời');
const row = d.querySelector('.sp-row'); assert.ok(row && row.contains(d.getElementById('sideLevel')) && row.contains(f), 'hàng hồ sơ = #sideLevel + ⋯');
assert.ok(f.classList.contains('sp-on') && sm.getAttribute('aria-label') && sm.getAttribute('aria-haspopup'), 'nút ⋯ có nhãn cho trình đọc màn hình');
const key = (el, k) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
sm.focus(); key(sm, 'ArrowDown'); assert.ok(dt.open, '↓ mở menu');
const it = [...m.querySelectorAll('a,button')].filter(x => !x.hidden);
it[0].focus(); key(it[0], 'ArrowDown'); assert.equal(d.activeElement, it[1], '↓ sang mục kế');
key(it[1], 'End'); assert.equal(d.activeElement, it[it.length - 1], 'End → mục cuối');
key(d.activeElement, 'ArrowDown'); assert.equal(d.activeElement, it[0], 'xoay vòng');
key(d.activeElement, 'Escape'); assert.ok(!dt.open && d.activeElement === sm, 'Esc đóng + trả focus về ⋯');
d.addEventListener('click', e => e.preventDefault()); dt.open = true; it[0].dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true })); await new Promise(r => setTimeout(r, 5)); assert.ok(!dt.open, 'chọn mục → đóng');
// Không mất chữ: mọi link trong menu có data-i18n (15 ngôn ngữ qua khóa sẵn có)
for (const a of m.querySelectorAll('a')) assert.ok(a.querySelector('[data-i18n]') || a.hasAttribute('data-i18n'), `link chưa dịch: ${a.getAttribute('href')}`);
// CSS: ẩn chân cũ trước JS, chừa ô ⋯, menu mở lên trên, report-pill.js giữ nút trong menu
const blk = (css.match(/\/\* side-menu[\s\S]*?\/\* \/report-pill \*\//) || [''])[0];
assert.match(blk, /\.sidebar \.side-foot:not\(\.sf-ok\)\{display:none\}/);
assert.match(blk, /\.side-level\{padding:[^}]*calc\(var\(--sp-6\) \+ var\(--sp-5\)\)/); // chừa 56px ≥ ô ⋯ 44px + lề (token, không viết cứng)
assert.match(blk, /\.sp-on \.sf-more>summary\{[^}]*width:44px;height:44px/);
assert.match(R("js/report-pill.js"), /\.inMenu/);
console.log(`✓ side-menu: ${it.length} mục trong menu ⋯ (đủ ${before.length} link cũ + Tôi/Cài đặt/Báo lỗi), bàn phím + Esc + trả focus, chừa chỗ CLS 0`);
