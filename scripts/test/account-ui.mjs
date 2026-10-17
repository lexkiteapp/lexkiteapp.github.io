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

// 3) Đăng xuất → xác nhận → Sync.signOut
let outs = 0; Sync.signOut = async () => { outs++; };
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
