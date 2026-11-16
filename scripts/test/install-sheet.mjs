#!/usr/bin/env node
// 📲 Mời cài app ở khoảnh khắc giá trị (web/js/install-sheet.js, docs/INSTALL-GROWTH.md): luật mời (hàm thuần pick), link Android/iOS,
// sự kiện đếm khớp /api/hit, Smart App Banner trên app + 15 trang landing, nudge PWA cũ nhường chỗ. Dùng: node scripts/test/install-sheet.mjs
import fs from 'node:fs';
import vm from 'node:vm';
let n = 0, fail = 0;
const ok = (c, m) => { n++; if (!c) { fail++; console.error('  ✗ ' + m); } };
const rd = f => fs.readFileSync(f, 'utf8');

const g = { addEventListener() {}, document: { hidden: true }, localStorage: { getItem() { return null; }, setItem() {} }, navigator: {}, setTimeout() {}, matchMedia: () => ({ matches: false }) };
g.window = g; vm.createContext(g); vm.runInContext(rd('web/js/install-sheet.js'), g);
const I = g.Install, DAY = 864e5, now = new Date('2026-11-12T10:00:00').getTime();
const day = k => { const d = new Date(now - k * DAY); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const days = (...ks) => Object.fromEntries(ks.map(k => [day(k), { xp: 10 }]));
const base = { now, rec: {}, lessons: 1, days: days(0), cards: 5, blocked: false };
const pick = o => I.pick({ ...base, ...o });

// Không bao giờ ở lần mở đầu / khi chưa xong bài / khi bị chặn
ok(pick({ lessons: 0 }) === '', 'chưa xong bài nào → không mời');
ok(pick({ blocked: true }) === '', 'bị chặn (hộp thoại mở, đã là app, lớp học…) → không mời');
// Ba khoảnh khắc
ok(pick({}) === 'first', 'xong bài đầu → first');
ok(pick({ days: days(0, 1, 2) }) === 'streak', 'chuỗi 3 ngày → streak');
ok(pick({ days: days(1, 2, 3) }) === 'streak', 'hôm nay chưa học vẫn giữ chuỗi 3');
ok(pick({ days: days(0, 1, 3) }) === 'first', 'chuỗi đứt (0,1,3) = chuỗi 2 → không phải streak');
ok(pick({ cards: 20 }) === 'words', 'lưu 20 từ → words');
ok(pick({ cards: 19 }) === 'first', '19 từ chưa đủ');
// Trần: mỗi khoảnh khắc 1 lần, ≥ 14 ngày, ≤ 3 lần, 2 lần "để sau" → thôi
ok(pick({ rec: { shown: { first: now - 20 * DAY }, last: now - 20 * DAY } }) === '', 'first đã hiện → không lặp (không còn khoảnh khắc khác)');
ok(pick({ days: days(0, 1, 2), rec: { shown: { first: now - 20 * DAY }, last: now - 20 * DAY } }) === 'streak', '14+ ngày sau → khoảnh khắc mới được mời');
ok(pick({ days: days(0, 1, 2), rec: { shown: { first: now - 3 * DAY }, last: now - 3 * DAY } }) === '', 'cách < 14 ngày → không mời');
ok(pick({ days: days(0, 1, 2), cards: 30, rec: { shown: { first: 1, streak: 2, words: 3 }, last: 3 } }) === '', 'đã hiện đủ 3 lần → thôi');
ok(pick({ days: days(0, 1, 2), rec: { dismissed: 2, last: now - 40 * DAY } }) === '', '2 lần "để sau" → không bao giờ hỏi lại');
ok(pick({ days: days(0, 1, 2), rec: { dismissed: 1, last: now - 40 * DAY } }) === 'streak', '1 lần "để sau" vẫn còn cơ hội');


// Chạy thật consider() với nền tảng giả: máy tính → QR (đếm desk), Android → intent Play, iPhone → App Store; lần 2 trong 14 ngày không hiện lại
async function run(kind, { coarse = false } = {}) {
  const store = new Map(), beacons = [], shown = [], mods = { hidden: true };
  const c = { document: { hidden: false, getElementById: () => mods, createElement: () => ({}), head: { appendChild() {} } }, navigator: { sendBeacon: (u, b) => beacons.push(JSON.parse(b).ev), standalone: false },
    matchMedia: q => ({ matches: /coarse/.test(q) ? coarse : false }), addEventListener() {}, setTimeout() {}, MutationObserver: class { observe() {} disconnect() {} },
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }, LKQR: { svg: u => '<svg data-u="' + u + '"/>' },
    LK_APPS: { play: 'https://play.google.com/store/apps/details?id=com.lexkite.app', ios: 'https://apps.apple.com/app/id6824714708' }, LKGetApp: { kind: () => kind },
    state: { stats: { days: days(0) }, game: { days: days(0) }, cards: {} }, App: { getApp: async () => {} },
    UI: { modal: html => { shown.push(html); return { setAttribute() {}, querySelector: () => ({ addEventListener() {} }) }; }, closeModal() {} } };
  c.window = c; vm.createContext(c); vm.runInContext(rd('web/js/install-sheet.js'), c);
  await c.Install.consider('lesson'); await c.Install.consider('lesson');
  return { shown, beacons };
}
{ const r = await run('cws');
  ok(r.shown.length === 1 && /data-u="https:\/\/lexkite\.com\/\?utm_source=qr&amp;|data-u="https:\/\/lexkite\.com\/\?utm_source=qr&/.test(r.shown[0]) && /utm_campaign=first/.test(r.shown[0]), 'Chrome máy tính: hiện QR trỏ lexkite.com (utm=qr), đúng 1 lần');
  ok(r.beacons.join() === 'inst_first_v_desk', 'máy tính: đếm inst_first_v_desk (' + r.beacons + ')'); }
{ const r = await run('play');
  ok(r.shown.length === 1 && /href="intent:\/\/lexkite\.com\/app\//.test(r.shown[0]) && r.beacons.join() === 'inst_first_v_play', 'Android: tờ mời Play (intent), đếm inst_first_v_play'); }
{ const r = await run('ios');
  ok(r.shown.length === 1 && /href="https:\/\/apps\.apple\.com\/app\/id6824714708\?ct=install_sheet_first"/.test(r.shown[0]) && r.beacons.join() === 'inst_first_v_ios', 'iPhone: tờ mời App Store (ct), đếm inst_first_v_ios'); }
{ const r = await run('a2hs'); ok(r.shown.length === 0, 'iPhone chưa có link App Store (a2hs): không mời'); }
{ const r = await run('web', { coarse: true }); ok(r.shown.length === 0, 'máy cảm ứng không phải di động (kind web + coarse): không QR'); }
{ const r = await run(''); ok(r.shown.length === 0, 'đang chạy như app/add-on (kind rỗng): không mời'); }

// Link: Android intent (mở app nếu đã cài, không thì Play + referrer), iOS không dùng intent
const play = 'https://play.google.com/store/apps/details?id=com.lexkite.app', a = I.androidHref(play, 'first');
ok(a.startsWith('intent://lexkite.com/app/#Intent;scheme=https;package=com.lexkite.app;S.browser_fallback_url=') && a.endsWith(';end'), 'Android intent đúng package/scheme');
ok(decodeURIComponent(a.split('browser_fallback_url=')[1].replace(/;end$/, '')) === play + '&referrer=utm_source%3Dlexkite.com%26utm_medium%3Dinstall_sheet%26utm_campaign%3Dfirst', 'Android: rơi về Play có referrer utm');

// Sự kiện đếm: mọi tổ hợp bên client có trong whitelist /api/hit
const hit = rd('functions/api/hit.js'), src = rd('web/js/install-sheet.js');
ok(/const INST_EV = \['first', 'streak', 'words'\]\.flatMap\(m => \['v', 'c', 'x'\]\.flatMap\(a => \['play', 'ios', 'desk'\]/.test(hit), 'hit.js: INST_EV = khoảnh khắc × v/c/x × play/ios/desk');
ok(/INST_EV\.includes\(b\.ev\)/.test(hit) && /ev\(m, 'v', kind\)/.test(src) && /ev\(m, 'c', kind\)/.test(src) && /ev\(m, 'x', kind\)/.test(src), 'client gửi xem/bấm/để sau kèm nền tảng');
ok(/'inst_' \+ m \+ '_' \+ a \+ '_' \+ k/.test(src), 'tên sự kiện inst_<m>_<a>_<k>');

// Smart App Banner (app-id App Store 6824714708 = link LK_APPS.ios) trên app + 15 trang landing
const id = (rd('web/js/ext-config.js').match(/apps\.apple\.com\/app\/id(\d+)/) || [])[1], meta = `<meta name="apple-itunes-app" content="app-id=${id}">`;
ok(id === '6824714708', 'ext-config: App Store id');
ok(rd('web/app/index.html').includes(meta), 'web/app/index.html có Smart App Banner');
const L = fs.readdirSync('web').filter(d => fs.existsSync(`web/${d}/index.html`) && /^[a-z]{2}$/.test(d) && d !== 'go'); // /go/ = trang chọn ngôn ngữ (noindex), không phải landing
ok(L.length >= 15 && L.every(l => rd(`web/${l}/index.html`).includes(meta)), 'mọi trang landing 15 ngôn ngữ có Smart App Banner (' + L.length + ')');

// Gói tải lười + nudge PWA cũ nhường chỗ khi có app cửa hàng
const app = rd('web/js/app.js');
ok(/install: \['js\/i18n\/en\/install\.js', 'js\/install-sheet\.js'\]/.test(app) && /App\.need\('install'\)/.test(app), 'app.js: gói install nạp lười sau khi vẽ');
ok(/\/\^\(play\|ios\)\$\/\.test\(LKGetApp\.kind\(\)\)\) return;/.test(app), 'installNudge cũ nhường chỗ khi có Play/App Store');
ok(/LAZY="[^"]*\binstall\b/.test(rd('scripts/build-i18n.sh')), 'build-i18n.sh: nhóm install là LAZY');

console.log(fail ? `✗ install-sheet: ${fail}/${n} lỗi` : `✓ install-sheet: ${n} kiểm đều đạt`);
process.exit(fail ? 1 : 0);
