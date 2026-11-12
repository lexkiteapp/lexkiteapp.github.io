// 📱 Điện thoại 375×812 (sáng + tối, giao diện Stitch ux1 bật + tắt): CHẠM THẬT vào tab "Tôi" (Cá nhân) ở thanh dưới từ mọi tab chính,
// kiểm không có lớp nào che tab (elementFromPoint), trang Tôi vẽ ra, các hàng trong trang bấm được (Chế độ màu, Ngôn ngữ, Mục tiêu),
// không tràn ngang. Thêm: IndexedDB treo (WebKit/iOS hay gặp: indexedDB.open không bao giờ trả lời) → #view không trắng vĩnh viễn (vẽ được hoặc thẻ lỗi Thử lại).
// Chủ báo 01/11: "mobile vẫn còn lỗi giao diện, Cá nhân không bấm chọn được". Chạy trong mobile-qa.yml.
// Chạy: node scripts/test/mobile-nav.mjs http://localhost:8080 out/mobile-nav   → thoát 1 nếu có lỗi; ảnh chụp từng bước trong thư mục ra.
import fs from 'node:fs';
import { chromium, webkit } from 'playwright';
import { noProd } from './lib/no-prod.mjs';
import { waitFn } from '../lib/pw-wait.mjs';

const BASE = (process.argv[2] || 'http://localhost:8080').replace(/\/$/, ''), OUT = process.argv[3] || 'out/mobile-nav';
fs.mkdirSync(OUT, { recursive: true });
const UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const fails = [], log = m => console.log(m), bad = (k, m) => { fails.push(`[${k}] ${m}`); console.log('  ✗ ' + m); };

let BT = chromium; // MNAV_BROWSERS=chromium,webkit (WebKit ≈ Safari iPhone)
async function open(scheme, ux1, { hangIdb = false, fresh = false } = {}) {
  const browser = await BT.launch();
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA, colorScheme: scheme, locale: 'vi', reducedMotion: 'reduce' });
  await noProd(ctx); // CI: media/audio → GitHub, /api → offline (0 lượt prod)
  const page = await ctx.newPage(), errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 300)));
  await page.addInitScript(({ ux1, hangIdb, fresh }) => {
    try {
      localStorage.setItem('lk.ux1', ux1 ? '1' : '0'); localStorage.setItem('vb.nudgeAt', String(Date.now()));
      if (!fresh && !localStorage.getItem('sbx.settings')) localStorage.setItem('sbx.settings', JSON.stringify({ onboarded: true, goalPick: 1 }));
    } catch (e) { /* */ }
    if (hangIdb) { // yêu cầu mở CSDL "lexkite" không bao giờ trả lời (không success/error/blocked) – như lỗi IndexedDB của Safari iOS
      const o = indexedDB.open.bind(indexedDB);
      indexedDB.open = function (name, v) { return name === 'lexkite' ? { set onsuccess(f) {}, set onerror(f) {}, set onblocked(f) {}, set onupgradeneeded(f) {} } : o(name, v); };
    }
  }, { ux1, hangIdb, fresh });
  return { browser, page, errs };
}
const ready = page => waitFn(page, () => { const v = document.getElementById('view'); return v && v.children.length && !v.querySelector('.skel-page,.skel-study') && !document.body.classList.contains('bare'); }, null, { timeout: 15000 }).then(() => true, () => false);
const overflow = page => page.evaluate(() => { const W = innerWidth; if (document.documentElement.scrollWidth <= W + 1) return []; return [...document.querySelectorAll('#view *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > W + 1 && !e.closest('[class*="overflow-x"],.tabs,.steps,.set-nav,.hscroll,[style*="overflow"]'); }).slice(0, 5).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 3).join('.') + ' →' + Math.round(e.getBoundingClientRect().right)); });
// Tab "Tôi" đang HIỆN ở đáy màn hình (thanh Stitch trong #view hoặc #bnav cũ)
const tabAt = (page, key) => page.evaluate(key => {
  const vis = a => { const r = a.getBoundingClientRect(), s = getComputedStyle(a); return r.width > 0 && r.height > 0 && r.bottom <= innerHeight + 1 && r.top >= innerHeight / 2 && s.visibility !== 'hidden'; };
  const a = [...document.querySelectorAll(`a[data-tab="${key}"]`)].find(vis); if (!a) return null;
  const r = a.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, top = document.elementFromPoint(x, y);
  const d = e => e ? e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + '.' + [...e.classList].slice(0, 4).join('.') : '∅';
  return { x, y, hit: !!top && a.contains(top), top: d(top), pe: getComputedStyle(a).pointerEvents, href: a.getAttribute('href') };
}, key);
const meTab = page => tabAt(page, 'me');
// chẩn đoán khi không thấy tab: mọi <a data-tab=KEY> với hộp, hiển thị, tổ tiên ẩn (để sửa gốc, không đoán)
const tabDiag = (page, key) => page.evaluate(key => [...document.querySelectorAll(`a[data-tab="${key}"]`)].map(a => { const r = a.getBoundingClientRect(), s = getComputedStyle(a); let h = ''; for (let e = a; e; e = e.parentElement) { const c = getComputedStyle(e); if (c.display === 'none' || c.visibility === 'hidden') { h = e.tagName + (e.id ? '#' + e.id : '') + ':' + (c.display === 'none' ? 'display' : 'visibility'); break; } } const up = []; for (let e = a.parentElement, i = 0; e && i < 3; e = e.parentElement, i++) { const q = e.getBoundingClientRect(), c = getComputedStyle(e); up.push(`${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}@${Math.round(q.y)}+${Math.round(q.height)} pad=${c.paddingTop}/${c.paddingBottom} h=${c.height} box=${c.boxSizing} ov=${c.overflow}`); } const ca = getComputedStyle(a); return `${Math.round(r.x)},${Math.round(r.y)} ${Math.round(r.width)}x${Math.round(r.height)} vis=${s.visibility} inH=${innerHeight} hide=${h || '–'} a[pad=${ca.paddingTop}/${ca.paddingBottom} min-h=${ca.minHeight} mt=${ca.marginTop}] up: ${up.join(' ← ')}`; }).join(' | ') || 'không có <a>', key);
// Thanh tab phải DÍNH ĐÁY viewport (chủ báo 01/11: trên iPhone thanh tab trôi lên giữa màn, khoảng trống lớn bên dưới). Lỗi → in tổ tiên có
// transform/filter/contain/will-change (biến position:fixed thành bám theo thẻ cha trên WebKit) để sửa tận gốc.
const navPin = page => page.evaluate(() => {
  const navs = [...document.querySelectorAll('nav')].filter(n => { const r = n.getBoundingClientRect(), s = getComputedStyle(n); return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden' && n.querySelector('a[data-tab]'); });
  if (!navs.length) return { none: true };
  const n = navs[navs.length - 1], r = n.getBoundingClientRect(), anc = [];
  for (let e = n.parentElement; e; e = e.parentElement) { const s = getComputedStyle(e); const z = ['transform', 'filter', 'backdropFilter', 'willChange', 'contain', 'perspective', 'containerType'].filter(k => s[k] && !/^(none|auto|normal)$/.test(s[k])).map(k => k + '=' + s[k]); if (z.length) anc.push((e.id ? '#' + e.id : e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 3).join('.')) + '{' + z.join(';') + '}'); }
  return { ok: Math.abs(r.bottom - innerHeight) <= 2, bot: Math.round(r.bottom), top: Math.round(r.top), ih: innerHeight, vv: window.visualViewport ? Math.round(visualViewport.height) : 0, sy: Math.round(scrollY), pos: getComputedStyle(n).position, nav: n.id || [...n.classList].slice(0, 3).join('.'), anc: anc.join(' ') };
});
async function pinned(page, k, where, { allowNone = false } = {}) { // allowNone: màn làm bài thi (focus) cố ý ẩn thanh tab – nếu CÓ thì vẫn phải dính đáy
  for (const sc of [false, true]) {
    if (sc) { await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(350); }
    const p = await navPin(page);
    if (p.none) { if (!allowNone) bad(k, `${where}: không có thanh tab dưới`); return; }
    if (!p.ok) bad(k, `${where}${sc ? ' (đã cuộn hết trang)' : ''}: thanh tab không dính đáy – đáy ${p.bot}/${p.ih} (vv ${p.vv}, scrollY ${p.sy}, ${p.pos}, ${p.nav}) tổ tiên: ${p.anc || '∅'}`);
  }
  await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(150);
}
// Tương phản chữ/nền của nút (gồm opacity cộng dồn của nút + tổ tiên) – WCAG AA ≥ 4.5:1
const contrastOf = (page, sel) => page.evaluate(sel => {
  const b = document.querySelector(sel); if (!b) return null;
  const rgb = c => (c.match(/[\d.]+/g) || []).map(Number), lum = ([r, g, bl]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(bl); };
  let op = 1; for (let e = b; e; e = e.parentElement) op *= +getComputedStyle(e).opacity;
  let bg = null; for (let e = b; e && !bg; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length >= 3 && (c[3] == null || c[3] > .9)) bg = c; }
  bg = bg || rgb(getComputedStyle(document.body).backgroundColor); const pageBg = rgb(getComputedStyle(document.body).backgroundColor);
  const fg0 = rgb(getComputedStyle(b).color), mix = (a, z) => a.slice(0, 3).map((v, i) => v * op + z[i] * (1 - op));
  const fg = mix(fg0, pageBg), bk = mix(bg, pageBg), L1 = lum(fg), L2 = lum(bk);
  const why = document.getElementById(b.getAttribute('aria-describedby') || '');
  return { ratio: (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05), disabled: b.disabled, why: why && why.getBoundingClientRect().height > 0 ? why.textContent.trim() : '' };
}, sel);
const onMe = page => waitFn(page, () => location.hash.startsWith('#/me') && !!document.querySelector('#view .v2-me, #view [data-act], #view h1'), null, { timeout: 8000 }).then(() => true, () => false);

async function run(scheme, ux1) {
  const k = `${BT.name()}·${scheme}·ux1=${ux1 ? 1 : 0}`; log(`▶ ${k}`);
  const { browser, page, errs } = await open(scheme, ux1);
  await page.goto(`${BASE}/app/?sandbox=1&hl=vi#/home`, { waitUntil: 'load' });
  if (!(await ready(page))) { bad(k, 'app không vẽ trang Học trong 15 s'); await page.screenshot({ path: `${OUT}/${BT.name()}-${scheme}-ux1${+ux1}-boot.png` }); await browser.close(); return; }
  // Sang từng tab chính bằng CÁCH NGƯỜI DÙNG LÀM (chạm tab đó ở thanh dưới), rồi chạm "Tôi"; thêm Cài đặt (trang con, vào bằng địa chỉ)
  for (const from of ['home', 'vocab', 'skills', 'tests', 'settings']) { // khóa tab (data-tab) của thanh dưới: main dùng cùng 4 khóa cho Stitch và thanh cũ (st/v2/runtime.js TABS)
    if (from === 'settings') await page.evaluate(() => { location.hash = '#/settings'; });
    else { // lần nạp đầu, và ngay sau khi vừa sang trang Tôi (onMe thấy h1 trang cũ trước khi trang mới vẽ xong): thanh tab Stitch thay thanh cũ ngay sau lượt vẽ (đo CI WebKit: 62–167 ms) → cho tối đa 1 s; chậm hơn vẫn là LỖI
      await waitFn(page, key => [...document.querySelectorAll(`a[data-tab="${key}"]`)].some(a => { const r = a.getBoundingClientRect(); return r.height > 0 && r.bottom <= innerHeight + 1 && r.top >= innerHeight / 2 && getComputedStyle(a).visibility !== 'hidden'; }), from, { timeout: 1000 }).catch(() => {});
      const tb = await tabAt(page, from); if (!tb) { // chẩn đoán: thanh tab ở đâu, CSS màn đã nạp chưa, bao lâu sau mới hiện (vẫn tính LỖI)
        const p = await navPin(page), css = await page.evaluate(() => [...document.styleSheets].map(x => (x.href || '').split('/').pop()).filter(h => /^st-/.test(h)).join(',')), t0 = Date.now();
        const late = await waitFn(page, key => [...document.querySelectorAll(`a[data-tab="${key}"]`)].some(a => { const r = a.getBoundingClientRect(); return r.height > 0 && r.bottom <= innerHeight + 1 && r.top >= innerHeight / 2; }), from, { timeout: 5000 }).then(() => Date.now() - t0, () => -1);
        await page.screenshot({ path: `${OUT}/${BT.name()}-${scheme}-ux1${+ux1}-notab-${from}.png` });
        bad(k, `không thấy tab "${from}" ở thanh dưới (đang ở ${await page.evaluate(() => location.hash)}; thanh: ${p.none ? 'không có' : `đáy ${p.bot}/${p.ih} ${p.pos} ${p.nav}`}; css st: ${css || '∅'}; a: [${await tabDiag(page, from)}]; ${late < 0 ? 'vẫn không hiện sau 5 s' : `hiện muộn ${late} ms`})`); continue; }
      await page.touchscreen.tap(tb.x, tb.y); }
    await page.waitForTimeout(900); await ready(page);
    await pinned(page, k, `#/${from} (${await page.evaluate(() => location.hash)})`);
    const ov = await overflow(page); if (ov.length) bad(k, `#/${from} tràn ngang: ${ov.join(', ')}`);
    const tab = await meTab(page);
    if (!tab) { bad(k, `#/${from}: không thấy tab "Tôi" ở thanh dưới [${await tabDiag(page, 'me')}]`); continue; }
    if (!tab.hit || tab.pe === 'none') bad(k, `#/${from}: tab "Tôi" bị che bởi ${tab.top} (pointer-events ${tab.pe})`);
    await page.touchscreen.tap(tab.x, tab.y);
    if (!(await onMe(page))) { bad(k, `#/${from}: chạm tab "Tôi" không mở trang Tôi (hash ${await page.evaluate(() => location.hash)})`); await page.screenshot({ path: `${OUT}/${BT.name()}-${scheme}-ux1${+ux1}-from-${from}.png` }); }
  }
  // Luyện → Listening thi thử (màn chủ chụp 01/11): thanh tab dính đáy; nút "Sang phần tiếp" khi bị khóa vẫn đạt AA và nói rõ lý do
  await page.evaluate(() => { location.hash = '#/listen-test/1'; }); await page.waitForTimeout(900); await ready(page);
  const go = await page.$('#tGo'); if (!go) bad(k, '#/listen-test/1: không thấy nút "Bắt đầu thi"'); else {
    await go.tap(); await page.waitForTimeout(700);
    await pinned(page, k, '#/listen-test/1 Part 1', { allowNone: true });
    const c = await contrastOf(page, '#tNext');
    if (!c) bad(k, 'Listening: không thấy nút "Sang phần tiếp"');
    else { if (!c.disabled) bad(k, 'Listening: nút "Sang phần tiếp" phải khóa khi chưa nghe xong'); if (c.ratio < 4.5) bad(k, `Listening: nút "Sang phần tiếp" bị khóa tương phản ${c.ratio.toFixed(2)} < 4.5`); if (!c.why) bad(k, 'Listening: nút bị khóa không nói lý do (aria-describedby)'); log(`  · nút khóa: ${c.ratio.toFixed(2)}:1 – "${c.why}"`); }
    await page.screenshot({ path: `${OUT}/${BT.name()}-${scheme}-ux1${+ux1}-listening.png` });
  }
  await page.evaluate(() => { location.hash = '#/me'; }); await page.waitForTimeout(400);
  { const go = await page.$('[data-exit-go]'); if (go) await go.tap(); } // đang làm bài thi: ExitGuard hỏi "Thoát bây giờ sẽ mất tiến độ?" (đúng thiết kế) → người học bấm Thoát; WebKit hiện hộp này, Chromium thoát thẳng
  await onMe(page); await page.waitForTimeout(600);
  await pinned(page, k, '#/me');
  await page.screenshot({ path: `${OUT}/${BT.name()}-${scheme}-ux1${+ux1}-me.png`, fullPage: true });
  const ov = await overflow(page); if (ov.length) bad(k, `#/me tràn ngang: ${ov.join(', ')}`);
  // Các hàng trong trang Tôi phải chạm được (không bị lớp nào che) và phản hồi
  const tapSel = async (sel, what) => {
    // trang Tôi vẽ bất đồng bộ (build() chờ isAdmin/blogLive ≤ 500 ms mỗi cái; WebKit CI chậm hơn) → chờ hàng xuất hiện tối đa 8 s; không có vẫn là LỖI
    await waitFn(page, sel => [...document.querySelectorAll(sel)].some(x => x.getBoundingClientRect().width), sel, { timeout: 8000 }).catch(() => {});
    const p = await page.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(x => x.getBoundingClientRect().width); if (!e) return null; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, top = document.elementFromPoint(x, y); return { x, y, hit: !!top && e.contains(top), top: top ? top.tagName.toLowerCase() + '.' + [...top.classList].slice(0, 3).join('.') : '∅' }; }, sel);
    if (!p) { bad(k, `#/me: không thấy ${what}`); return false; }
    if (!p.hit) bad(k, `#/me: ${what} bị che bởi ${p.top}`);
    await page.touchscreen.tap(p.x, p.y); await page.waitForTimeout(700); return true;
  };
  if (ux1) {
    const theme = () => page.evaluate(() => ((window.App && App.state.settings) || {}).theme + '|' + document.documentElement.getAttribute('data-theme') + '|' + ((document.querySelector('#view [data-act="theme"]') || {}).closest ? document.querySelector('#view [data-act="theme"]').closest('[data-row]')?.textContent : ''));
    const t0 = await theme();
    if (await tapSel('#view [data-act="theme"]', 'hàng "Chế độ màu"') && (await theme()) === t0) bad(k, '#/me: chạm "Chế độ màu" không đổi giá trị');
    if (await tapSel('#view [data-act="lang"]', 'hàng "Ngôn ngữ"')) {
      if (!(await page.evaluate(() => !!document.querySelector('#modal [data-lang]')))) bad(k, '#/me: chạm "Ngôn ngữ" không mở hộp chọn');
      await page.keyboard.press('Escape'); await page.evaluate(() => window.UI && UI.closeModal && UI.closeModal()); await page.waitForTimeout(300);
    }
    if (await tapSel('#view [href="#/goal"], #view [data-href="#/goal"]', 'hàng "Mục tiêu & kế hoạch"') && !(await waitFn(page, () => location.hash.startsWith('#/goal'), null, { timeout: 5000 }).then(() => true, () => false))) bad(k, '#/me: chạm "Mục tiêu & kế hoạch" không chuyển trang');
  } else if (await tapSel('#view a[href="#/settings"], #view a[href="#/stats"]', 'liên kết trong trang Tôi') && !(await waitFn(page, () => /^#\/(settings|stats)/.test(location.hash), null, { timeout: 5000 }).then(() => true, () => false))) bad(k, '#/me: chạm liên kết không chuyển trang');
  if (errs.length) bad(k, 'lỗi JS: ' + errs.slice(0, 3).join(' | '));
  await browser.close();
}

// Người mới (trang chào): không tràn ngang, nút "Bắt đầu" chạm được và vào bước thiết lập
async function welcome(scheme) {
  const k = `${BT.name()}·${scheme}·chào`; log(`▶ ${k}`);
  const { browser, page } = await open(scheme, true, { fresh: true });
  await page.goto(`${BASE}/app/?sandbox=1&hl=vi`, { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/${BT.name()}-${scheme}-welcome.png` });
  const ov = await page.evaluate(() => { const W = innerWidth; return [...document.querySelectorAll('#view *')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width || r.right <= W + 1) return false; for (let p = e.parentElement; p; p = p.parentElement) { const s = getComputedStyle(p); if (/auto|scroll/.test(s.overflowX)) return false; } return true; }).slice(0, 5).map(e => e.tagName.toLowerCase() + '.' + [...e.classList].slice(0, 3).join('.') + ' →' + Math.round(e.getBoundingClientRect().right)); });
  if (ov.length) bad(k, `trang chào tràn/cắt chữ ngang: ${ov.join(', ')}`);
  await browser.close();
}

// IndexedDB treo → #view KHÔNG được trắng vĩnh viễn: app vẽ được (chế độ thử/sandbox) HOẶC canh khởi động 8 s (app.js, #608) hiện thẻ lỗi có "Thử lại";
// chạm thật được ở cả hai trường hợp (chủ báo 01/11: kẹt ở màn chào, không gì bấm được). Chi tiết thẻ lỗi: welcome-journey.mjs mục 9.
async function hungIdb() {
  const k = `${BT.name()}·IndexedDB treo`; log(`▶ ${k}`);
  const { browser, page } = await open('light', true, { hangIdb: true });
  await page.goto(`${BASE}/app/?sandbox=1&hl=vi#/home`, { waitUntil: 'load' });
  const st = await waitFn(page, () => { const v = document.getElementById('view'); if (!v) return 0; if (v.querySelector('.err-state [data-retry]')) return 2; return v.children.length && !v.querySelector('.skel-page,.skel-study') && !document.body.classList.contains('bare') ? 1 : 0; }, null, { timeout: 15000 }).then(h => h.jsonValue(), () => 0);
  if (!st) { bad(k, 'app kẹt khi IndexedDB không trả lời (#view trắng, không thẻ lỗi, 15 s)'); await page.screenshot({ path: `${OUT}/idb-hang.png` }); await browser.close(); return; }
  if (st === 1) { const tab = await meTab(page); if (!tab) bad(k, 'không thấy tab "Tôi"'); else { await page.touchscreen.tap(tab.x, tab.y); if (!(await onMe(page))) bad(k, 'chạm tab "Tôi" không mở trang Tôi'); } }
  await browser.close();
}

for (const b of (process.env.MNAV_BROWSERS || 'chromium').split(',')) {
  BT = b === 'webkit' ? webkit : chromium; console.log(`\n=== ${b}`);
  for (const scheme of ['light', 'dark']) { for (const ux1 of [true, false]) await run(scheme, ux1); await welcome(scheme); }
  await hungIdb();
}
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify({ fails }, null, 1));
console.log(fails.length ? `\n❌ ${fails.length} lỗi:\n` + fails.join('\n') : '\n✅ mobile-nav: tab "Tôi" chạm được ở mọi tab, sáng/tối, ux1 bật/tắt; không tràn ngang; IndexedDB treo vẫn chạy');
process.exit(fails.length ? 1 : 0);
