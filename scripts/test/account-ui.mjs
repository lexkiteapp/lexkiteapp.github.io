// Test nút & menu tài khoản (web/js/sync.js Sync.chrome + web/js/account.js) – jsdom, firebase.auth() giả lập, KHÔNG mạng, KHÔNG tài khoản thật.
// Kiểm: chưa đăng nhập → nút Google ở đầu trang gọi Sync.signIn; đã đăng nhập → avatar mở menu (aria-expanded, focus, phím mũi tên);
// Esc đóng menu & trả focus; Đăng xuất → hộp xác nhận → Sync.signOut; thẻ thanh bên mở cùng menu / hiện nút đăng nhập.
// Chạy: node scripts/test/account-ui.mjs
import fs from 'node:fs';
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(`<!DOCTYPE html><html lang="vi"><head><title>Lexkite</title></head><body>
  <aside class="sidebar"><a class="side-level" href="#/stats" id="sideLevel"></a></aside>
  <header class="topbar"><div class="top-stats"><a class="avatar" id="avatarBtn" href="#/me">L</a></div></header>
  <div class="toast" id="toast"></div><div class="modal" id="modal" hidden><div class="modal-box" id="modalBox"></div></div>
</body></html>`, { url: 'https://lexkite.com/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, d = w.document;
w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
w.t = (k, p) => { let s = String(k); if (p) for (const [a, b] of Object.entries(p)) s = s.replaceAll('{' + a + '}', b); return s; };
w.I18N = { lang: () => 'vi' };
const store = {};
w.Core = {
  Store: { get: async (k, def) => (k in store ? store[k] : def), set: async (k, v) => { store[k] = v; }, isExtension: false, sandbox: false },
  Cards: { all: async () => ({}), save: async () => {}, make: x => x },
  Stats: { get: async () => ({ days: {} }) },
};
w.Game = { get: async () => ({ xp: 0, days: {} }) };
w.IELTS_DATA = { INDEX: {} };
w.fetch = async () => ({ ok: true, status: 200, json: async () => ({ docs: {} }) });
w.UI = {
  $: s => d.querySelector(s), esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
  toast: () => {},
  modal: html => { const b = d.getElementById('modalBox'); b.innerHTML = html; d.getElementById('modal').hidden = false; return b; },
  closeModal: () => { d.getElementById('modal').hidden = true; },
};
w.App = { state: { cards: {} }, updateChrome: () => w.Sync.chrome(), load: async () => {}, route: () => {} };
w.FIREBASE_CONFIG = { apiKey: 'test' };
// firebase.auth() giả lập: onAuthStateChanged lưu callback để test tự bật/tắt trạng thái đăng nhập
let authCb = null;
const auth = { onAuthStateChanged: cb => { authCb = cb; cb(null); }, signInWithPopup: async () => {}, signOut: async () => authCb && authCb(null) };
w.firebase = Object.assign({ initializeApp: () => ({}), auth: Object.assign(() => auth, { GoogleAuthProvider: class { setCustomParameters() {} } }) });

w.eval(fs.readFileSync('web/js/sync.js', 'utf8'));
w.eval(fs.readFileSync('web/js/account.js', 'utf8'));
const Sync = w.Sync;
const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const UI_close = () => w.UI.closeModal();
const key = (k, el = d.activeElement || d.body) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));

// 1) Chưa đăng nhập: nút Google hiện ngay khi vẽ khung (trước khi Firebase sẵn sàng)
Sync.chrome();
let btn = d.getElementById('avatarBtn');
ok(btn && btn.tagName === 'BUTTON' && btn.classList.contains('gsi') && btn.dataset.acct === 'in', 'chưa đăng nhập: đầu trang có nút Đăng nhập với Google');
ok(btn && /Đăng nhập với Google/.test(btn.textContent) && btn.querySelector('svg path[fill="#4CAF50"]'), 'nút có logo G và nhãn đầy đủ');
ok(btn && btn.querySelector('.gsi-s'), 'nút đầu trang có nhãn ngắn cho màn hình nhỏ');
const side = d.getElementById('sideAcct');
ok(side && !side.hidden && side.querySelector('.gsi[data-acct="in"]'), 'chưa đăng nhập: thẻ thanh bên có nút Đăng nhập với Google');
let signIns = 0; const realSignIn = Sync.signIn; Sync.signIn = async () => { signIns++; };
click(btn); ok(signIns === 1, 'bấm nút đầu trang → gọi Sync.signIn');
click(side.querySelector('.gsi')); ok(signIns === 2, 'bấm nút thanh bên → gọi Sync.signIn');
Sync.signIn = realSignIn;

// 2) Đăng nhập (giả lập) → avatar mở menu
await sleep(1300); // sync.js khởi động Firebase trễ 1,2 s
ok(typeof authCb === 'function', 'Firebase (giả lập) đã khởi động');
authCb({ uid: 'u1', displayName: 'Quyen Khieu', email: 'test@example.com', photoURL: '', getIdToken: async () => 'tok' });
await sleep(50);
btn = d.getElementById('avatarBtn');
ok(btn.tagName === 'BUTTON' && btn.classList.contains('avatar') && btn.getAttribute('aria-haspopup') === 'menu' && btn.getAttribute('aria-expanded') === 'false', 'đã đăng nhập: avatar là nút mở menu (aria-haspopup, aria-expanded=false)');
ok(btn.textContent.trim() === 'Q', 'avatar hiện chữ cái đầu khi không có ảnh');
ok(d.getElementById('sideAcct').hidden, 'đã đăng nhập: ẩn nút đăng nhập ở thanh bên');
ok(d.getElementById('sideLevel').dataset.acct === 'menu', 'đã đăng nhập: thẻ thanh bên mở menu tài khoản');
btn.focus(); click(btn); await sleep(10);
let pop = d.getElementById('acctPop');
ok(pop && btn.getAttribute('aria-expanded') === 'true', 'bấm avatar → mở menu, aria-expanded=true');
ok(pop && /Quyen Khieu/.test(pop.textContent) && /test@example\.com/.test(pop.textContent), 'menu có tên và email');
const items = () => [...pop.querySelectorAll('[role=menu] [role=menuitem]')];
ok(pop && items().length === 4 && pop.querySelector('a[href="#/me"]') && pop.querySelector('a[href="#/settings"]') && pop.querySelector('[data-a="sync"]') && pop.querySelector('[data-a="out"]'), 'menu: Đồng bộ ngay, Hồ sơ, Cài đặt, Đăng xuất');
ok(pop && d.activeElement === items()[0], 'mở menu → focus mục đầu');
key('ArrowDown'); ok(d.activeElement === items()[1], 'phím ↓ chuyển mục');
key('End'); ok(d.activeElement === items()[3], 'phím End → mục cuối');
key('ArrowDown'); ok(d.activeElement === items()[0], 'phím ↓ ở cuối quay về đầu');
key('Escape');
ok(!d.getElementById('acctPop') && btn.getAttribute('aria-expanded') === 'false' && d.activeElement === btn, 'Esc đóng menu và trả focus về avatar');
// Bấm ra ngoài để đóng
click(btn); await sleep(10); ok(d.getElementById('acctPop'), 'mở lại menu');
click(d.body); ok(!d.getElementById('acctPop'), 'bấm ra ngoài → đóng menu');
// Thẻ thanh bên mở cùng menu
click(d.getElementById('sideLevel')); await sleep(10);
ok(d.getElementById('acctPop') && d.getElementById('sideLevel').getAttribute('aria-expanded') === 'true', 'bấm thẻ thanh bên → mở menu tài khoản');
// axe-core (WCAG 2.1 A/AA) trên trang có menu đang mở: 0 lỗi serious/critical
w.eval(fs.readFileSync(createRequire(import.meta.url).resolve('axe-core'), 'utf8'));
const ax = await w.axe.run(d, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }, rules: { 'color-contrast': { enabled: false } } });
const bad = ax.violations.filter(v => /serious|critical/.test(v.impact));
ok(!bad.length, 'axe: menu tài khoản không có lỗi nghiêm trọng – ' + bad.map(v => v.id + ' ' + v.nodes.map(x => x.target).join(',')).join('; '));
key('Escape');

// 2b) Thẻ tài khoản (Cài đặt & trang Tôi – sync.js render): tên/email cắt "…" (đủ giá trị ở title), trạng thái + nút ở hàng riêng, không chồng lấn
const css = fs.readFileSync('web/css/me.css', 'utf8'); // CSS trang Tôi + thẻ tài khoản (tải lười, ngoài khung app)
const rule = sel => (css.match(new RegExp('(^|\\n)' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*\\{([^}]*)\\}')) || [])[2] || '';
authCb({ uid: 'u1', displayName: 'KHIEU DINH THONG', email: 'khieudinhthong.very.long.address@example.com', photoURL: '', getIdToken: async () => 'tok' });
await sleep(30);
const sb = d.createElement('div'); sb.className = 'card'; d.body.appendChild(sb); Sync.renderBox(sb);
const ac = sb.querySelector('.acct-card');
ok(ac && sb.classList.contains('acct-box'), 'thẻ tài khoản: lưới .acct-card trong khung .acct-box (container query)');
ok(ac && ac.querySelector('.acct-name').textContent === 'Khieu Dinh Thong' && ac.querySelector('.acct-name').title === 'KHIEU DINH THONG', 'tên viết HOA → hiện "Khieu Dinh Thong", title giữ nguyên tên gốc');
ok(ac && ac.querySelector('.acct-mail').title === 'khieudinhthong.very.long.address@example.com' && ac.querySelector('.acct-mail').getAttribute('dir') === 'ltr', 'email dài: title đầy đủ, dir=ltr (RTL không đảo)');
ok(/text-overflow:\s*ellipsis/.test(rule('.acct-name, .acct-mail')) && /white-space:\s*nowrap/.test(rule('.acct-name, .acct-mail')) && /min-width:\s*0/.test(rule('.acct-id')), 'CSS: tên/email cắt "…" (ellipsis, nowrap, min-width:0) – không đẩy nút');
ok(/minmax\(0, 1fr\)/.test(rule('.acct-card')) && /grid-column:\s*1 \/ -1/.test(rule('.acct-act')) && /grid-column:\s*1 \/ -1/.test(rule('.acct-st')), 'CSS: nút & trạng thái ở hàng riêng (grid-column 1/-1) – không đè lên email ở 320–390 px');
ok(/min-height:\s*44px/.test(rule('.acct-act .btn')) && /flex-wrap:\s*wrap/.test(rule('.acct-act')), 'CSS: nút cao ≥ 44 px, tự xuống hàng khi chữ dài (de/ru)');
const acts = ac ? ac.querySelector('.acct-act') : null;
ok(acts && !ac.querySelector('.acct-id').contains(acts) && acts.querySelector('button[data-acct="sync"]') && acts.querySelector('button.btn.ghost.danger[data-acct="out"]'), 'nút Đồng bộ ngay + Đăng xuất (ghost-danger) là <button> trong khối hành động riêng');
Sync.status = 'ok'; Sync.msg = ''; Sync.lastSync = Date.now() - 10e3; Sync.render();
ok(/Đã đồng bộ vừa xong/.test(sb.querySelector('.acct-st').textContent) && sb.querySelector('.acct-st').getAttribute('role') === 'status' && sb.querySelector('.acct-st').title, 'trạng thái: "Đã đồng bộ vừa xong" (role=status, giờ chính xác ở title)');
Sync.lastSync = Date.now() - 5 * 60e3; Sync.render();
ok(/Đã đồng bộ 5 phút trước/.test(sb.querySelector('.acct-st').textContent), 'trạng thái: "5 phút trước" (Intl.RelativeTimeFormat)');
const now = Date.now();
ok(Sync.ago(now - 3 * 3600e3, now) === '3 giờ trước' && Sync.ago(now - 864e5, now) === 'hôm qua', 'Sync.ago: "3 giờ trước", "hôm qua"');
w.I18N.lang = () => 'en'; ok(Sync.ago(now - 5 * 60e3, now) === '5 minutes ago', 'Sync.ago theo ngôn ngữ giao diện (en: "5 minutes ago")');
w.I18N.lang = () => 'de'; ok(Sync.ago(now - 2 * 3600e3, now) === 'vor 2 Stunden', 'Sync.ago (de: "vor 2 Stunden")'); w.I18N.lang = () => 'vi';
ok(Sync.nice('Quyen Khieu') === 'Quyen Khieu' && Sync.nice('NGUYỄN ĐỨC ANH') === 'Nguyễn Đức Anh' && Sync.nice('王小明') === '王小明' && Sync.nice('AN') === 'AN', 'Sync.nice: chỉ đổi tên HOA toàn bộ, giữ dấu, không đụng chữ Hán/tên ngắn');
Sync.status = 'error'; Sync.msg = 'sync 500'; Sync.render();
ok(sb.querySelector('.acct-card').dataset.st === 'error' && /Lỗi đồng bộ/.test(sb.querySelector('.acct-st').textContent) && /Thử lại/.test(sb.querySelector('[data-acct="sync"]').textContent), 'lỗi đồng bộ: báo rõ + nút "Thử lại"');
Object.defineProperty(w.navigator, 'onLine', { configurable: true, get: () => false }); w.dispatchEvent(new w.Event('offline'));
ok(sb.querySelector('.acct-card').dataset.st === 'offline' && /Ngoại tuyến/.test(sb.querySelector('.acct-st').textContent) && sb.querySelector('[data-acct="sync"]').disabled, 'mất mạng: "Ngoại tuyến – sẽ tự đồng bộ…", nút đồng bộ tạm khóa');
Object.defineProperty(w.navigator, 'onLine', { configurable: true, get: () => true }); w.dispatchEvent(new w.Event('online'));
ok(sb.querySelector('.acct-card').dataset.st === 'error', 'có mạng lại → vẽ lại trạng thái');
Sync.status = 'syncing'; Sync.render();
ok(sb.querySelector('[data-acct="sync"]').disabled && sb.querySelector('[data-acct="sync"]').getAttribute('aria-busy') === 'true', 'đang đồng bộ: nút khóa, aria-busy');
Sync.status = 'ok'; Sync.render();
let nowCalls = 0; const realNow = Sync.now; Sync.now = () => { nowCalls++; };
click(sb.querySelector('[data-acct="sync"]')); ok(nowCalls === 1, 'bấm "Đồng bộ ngay" trên thẻ → Sync.now'); Sync.now = realNow;
click(sb.querySelector('[data-acct="out"]')); await sleep(10);
ok(!d.getElementById('modal').hidden && d.getElementById('acctOutOk'), 'bấm "Đăng xuất" trên thẻ → hộp xác nhận (luồng cũ)');
UI_close(); sb.remove();

// 2c) Trang Tôi (hubs.js routes.me): thẻ Từ vựng 4 chỉ số / lời mời khi chưa có từ; email không lặp ở hero; thẻ tài khoản dùng chung
const view = d.createElement('main'); view.id = 'view'; d.body.appendChild(view);
const W = p => p; W.signal = {}; W.stale = () => false;
Object.assign(w.App, { view, routes: {}, W, guard: fn => (...a) => { w.App.W = W; return fn(...a); }, state: { cards: {}, settings: {}, stats: {}, game: { xp: 0, days: {} }, user: Sync.user }, streak: () => 0, forgetting: () => [], isAdmin: async () => false, adminUrl: () => '#/admin', legalUrl: () => '/privacy' });
w.UI.$$ = s => [...d.querySelectorAll(s)];
w.Core.Stats.freezeInfo = () => ({ left: 0, max: 2 });
w.Game.levelOf = () => ({ level: 1, title: 'Người mới', into: 0, need: 100 });
w.Core.Cards.dueCount = map => ({ due: Object.values(map).filter(c => c.srs.due <= Date.now() && c.srs.reps > 0).length, newCount: 0, total: 0 });
w.eval(fs.readFileSync('web/js/hubs.js', 'utf8'));
await w.App.routes.me(); await sleep(20);
ok(d.querySelector('link[data-me-css][href="css/me.css"]'), 'trang Tôi nạp css/me.css (tải lười, không tăng khung app)');
ok(view.querySelector('.me-empty a.btn.primary[href="#/path"]') && /Bắt đầu học 10 từ đầu tiên/.test(view.querySelector('.me-empty').textContent), 'chưa có từ: lời mời "Bắt đầu học 10 từ đầu tiên" (không còn "0 · 0 từ · 0 đã thuộc")');
ok(!view.querySelector('.me-card-tag') && !view.querySelector('.me-sub-row') && !view.querySelector('.me-head').textContent.includes('@'), 'hero: không lặp email (chỉ ở thẻ tài khoản), bỏ chip trùng số');
ok(view.querySelector('.me-name').textContent === 'Khieu Dinh Thong' && !view.querySelector('.me-streak-flame'), 'hero: tên viết hoa → chữ thường đúng; chuỗi 0 ngày không hiện huy hiệu 🔥 0');
ok(view.querySelector('#meAcct .acct-card .acct-mail') && view.querySelectorAll('.acct-mail').length === 1, 'thẻ tài khoản trên trang Tôi (một chỗ duy nhất có email)');
const day = 864e5, mk = (w2, iv, reps, due) => [w2, { word: w2, srs: { interval: iv, reps, due, last: reps ? Date.now() - day : 0 } }];
w.App.state.cards = Object.fromEntries([mk('a', 0, 0, 0), mk('b', 3, 2, Date.now() - 1000), mk('c', 30, 6, Date.now() + 9 * day), mk('d', 25, 5, Date.now() + 5 * day)]);
w.App.streak = () => 4;
await w.App.routes.me(); await sleep(20);
const stats = [...view.querySelectorAll('.me-stats .me-stat')].map(a => a.querySelector('b').textContent + ':' + a.querySelector('span').textContent);
ok(stats.join('|') === '4:Đã lưu|1:Đang học|2:Đã thuộc|1:Cần ôn hôm nay', 'thẻ Từ vựng: Đã lưu / Đang học / Đã thuộc / Cần ôn hôm nay – ' + stats.join('|'));
ok(view.querySelector('.me-stat.due[href="#/review"]') && !view.querySelector('.me-empty'), 'có từ cần ôn → ô "Cần ôn hôm nay" nổi bật, mở #/review');
ok(view.querySelector('.me-streak-flame[aria-label="Chuỗi 4 ngày"]'), 'huy hiệu chuỗi trên avatar có aria-label');
const ax3 = await w.axe.run(view, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, rules: { 'color-contrast': { enabled: false } } });
ok(!ax3.violations.filter(v => /serious|critical/.test(v.impact)).length, 'axe: trang Tôi không có lỗi nghiêm trọng – ' + ax3.violations.map(v => v.id).join(','));
view.remove();

// 3) Đăng xuất → xác nhận → Sync.signOut
let outs = 0; Sync.signOut = async () => { outs++; };
btn = d.getElementById('avatarBtn'); // tài khoản đổi tên ở 2b → nút avatar được vẽ lại
click(btn); await sleep(10); pop = d.getElementById('acctPop');
click(pop.querySelector('[data-a="out"]'));
const modal = d.getElementById('modal');
ok(!modal.hidden && /trên máy này/.test(modal.textContent) && outs === 0, 'Đăng xuất → hộp xác nhận (dữ liệu ở lại máy), chưa đăng xuất ngay');
ok(!d.getElementById('acctPop'), 'mở hộp xác nhận thì đóng menu');
const ax2 = await w.axe.run(d.getElementById('modal'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa'] }, rules: { 'color-contrast': { enabled: false } } });
ok(!ax2.violations.filter(v => /serious|critical/.test(v.impact)).length, 'axe: hộp xác nhận đăng xuất không có lỗi nghiêm trọng');
click(d.getElementById('acctOutOk')); await sleep(10);
ok(outs === 1 && modal.hidden, 'xác nhận → gọi Sync.signOut');

// 4) Đăng xuất thật (giả lập) → quay lại nút Google
authCb(null); await sleep(10);
ok(d.getElementById('avatarBtn').classList.contains('gsi') && !d.getElementById('sideAcct').hidden && !d.getElementById('sideLevel').dataset.acct, 'sau đăng xuất: nút Đăng nhập với Google trở lại');

if (fails) { console.log(`✗ account-ui: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ account-ui: ${n} kiểm tra đạt`);
process.exit(0);
