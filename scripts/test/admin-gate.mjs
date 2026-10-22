// Cổng cửa trang quản trị: tài khoản không phải admin (whoami → 403) chỉ thấy màn từ chối, bị đăng xuất, nút "Đăng nhập bằng tài khoản khác" dùng select_account.
// Quản trị (whoami → 200) vào được khung quản trị. jsdom, Firebase & /api/* giả.
import fs from 'fs';
import { JSDOM, VirtualConsole } from 'jsdom';
const rd = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.error('  ✗ ' + m); } };
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
async function boot(admin) {
  const html = rd('web/admin.html').replace(/<script[^>]*><\/script>/g, '').replace(/<link[^>]+>/g, '');
  const vc = new VirtualConsole();
  const dom = new JSDOM(html, { url: 'https://lexkite.com/admin.html', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
  const w = dom.window, d = w.document;
  w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {} });
  const ops = [], st = { out: 0, popup: [], params: null };
  w.fetch = async (url, o = {}) => { const b = JSON.parse(o.body || '{}'); ops.push(b.op); return b.op === 'whoami' && admin ? { ok: true, status: 200, json: async () => ({ admin: true }) } : { ok: false, status: b.op === 'whoami' ? 403 : 500, json: async () => ({ error: 'forbidden' }) }; };
  const USER = { email: 'sam@example.com', getIdToken: async () => 'tok' };
  const AUTH = { currentUser: USER, onAuthStateChanged: cb => setTimeout(() => cb(USER), 0), signOut: async () => { st.out++; }, signInWithPopup: async p => { st.popup.push(p); } };
  w.FIREBASE_CONFIG = {};
  w.firebase = { initializeApp() {}, auth: Object.assign(() => AUTH, { GoogleAuthProvider: function () { this.setCustomParameters = x => { st.params = x; }; } }) };
  w.eval(rd('web/js/admin.js')); await tick();
  return { w, d, ops, st };
}
{ // không phải quản trị
  const { d, ops, st } = await boot(false);
  const txt = d.body.textContent;
  ok(ops.length === 1 && ops[0] === 'whoami', 'chỉ gọi whoami, không gọi API quản trị khác: ' + ops.join(','));
  ok(!!d.getElementById('denied'), 'hiện màn từ chối');
  ok(/không có quyền quản trị|does not have admin access/i.test(txt), 'có dòng "Tài khoản này không có quyền quản trị"');
  ok(!document_has(d), 'không vẽ thanh bên/điều hướng/tên tài khoản');
  ok(st.out === 1, 'đã đăng xuất');
  ok(!/sam@example|Tổng quan|Overview/.test(txt), 'không lộ email/nội dung quản trị');
  d.getElementById('swAcc').click(); await tick();
  ok(st.popup.length === 1 && st.params && st.params.prompt === 'select_account', 'nút đăng nhập tài khoản khác dùng prompt=select_account');
}
{ // quản trị
  const { d, ops } = await boot(true);
  ok(ops[0] === 'whoami' && ops.length > 1 && !d.getElementById('denied'), 'quản trị: qua cổng, vẽ khung quản trị');
}
function document_has(d) { return d.querySelectorAll('#tabs a').length > 0 || d.getElementById('me').innerHTML.trim() !== '' || !d.getElementById('side').hidden; }
console.log(fails ? `✗ admin-gate: ${fails} lỗi / ${passes + fails}` : `✓ admin-gate: ${passes} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
