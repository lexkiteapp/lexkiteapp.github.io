// Test đăng nhập gốc trong app iOS/Android (web/js/sync.js + web/js/native-auth.js + web/js/account-delete.js) – jsdom,
// plugin @capacitor-firebase/authentication giả lập, KHÔNG mạng, KHÔNG tài khoản thật.
// Kiểm: iOS = nút "Đăng nhập" chung → bảng chọn Apple (trên) + Google; ID token của SDK gốc đi vào /api/sync;
// xóa tài khoản Apple: đăng nhập lại → thu hồi token Apple → /api/account → đăng xuất; đăng nhập lại khác tài khoản bị chặn;
// hủy đăng nhập không báo lỗi; Android = "Tiếp tục với Google", không Apple; thiếu cấu hình Firebase → tắt (không gọi plugin, không còn hộp thoại tạm).
// Chạy: node scripts/test/native-auth.mjs
import fs from 'node:fs';
import { JSDOM } from 'jsdom';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SRC = f => fs.readFileSync('web/js/' + f, 'utf8');

function setup({ platform = 'ios', configured = true } = {}) {
  const dom = new JSDOM(`<!DOCTYPE html><html lang="vi"><head><title>Lexkite</title></head><body>
    <aside class="sidebar"><a class="side-level" href="#/stats" id="sideLevel"></a></aside>
    <header class="topbar"><div class="top-stats"><a class="avatar" id="avatarBtn" href="#/me">L</a></div></header>
    <div id="acctBox"></div><div class="toast" id="toast"></div><div class="modal" id="modal" hidden><div class="modal-box" id="modalBox"></div></div>
  </body></html>`, { url: 'https://localhost/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window, d = w.document;
  w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
  w.t = (k, p) => { let s = String(k); if (p) for (const [a, b] of Object.entries(p)) s = s.replaceAll('{' + a + '}', b); return s; };
  w.I18N = { lang: () => 'vi' };
  const store = {}, toasts = [], calls = [], reqs = [];
  w.Core = {
    Store: { get: async (k, def) => (k in store ? store[k] : def), set: async (k, v) => { store[k] = v; }, isExtension: false, sandbox: false },
    Cards: { all: async () => ({}), save: async () => {}, make: x => x },
    Stats: { get: async () => ({ days: {} }) },
  };
  w.Game = { get: async () => ({ xp: 0, days: {} }) };
  w.IELTS_DATA = { INDEX: {} };
  w.fetch = async (url, o = {}) => {
    reqs.push({ url, auth: (o.headers || {}).Authorization || '', body: o.body ? JSON.parse(o.body) : null });
    const body = /\/api\/account$/.test(url) ? { ok: true, firebase: 'deleted' } : { docs: {} };
    return { ok: true, status: 200, json: async () => body };
  };
  w.UI = {
    $: s => d.querySelector(s), esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]),
    toast: m => toasts.push(m),
    icon: (n, cls) => `<svg class="i${cls ? ' ' + cls : ''}" aria-hidden="true"><use href="#i-${n}"/></svg>`,
    modal: html => { const b = d.getElementById('modalBox'); b.innerHTML = html; d.getElementById('modal').hidden = false; return b; },
    closeModal: () => { d.getElementById('modal').hidden = true; },
  };
  w.App = { state: { cards: {} }, updateChrome: () => w.Sync.chrome(), load: async () => {}, route: () => {} };
  w.FIREBASE_CONFIG = { apiKey: 'test' };
  w.LK_NATIVE_AUTH = { ios: configured && platform === 'ios', android: configured && platform === 'android' };
  // Plugin FirebaseAuthentication giả lập (SDK Firebase gốc)
  const U = (uid, providerId) => ({ uid, displayName: 'Test ' + uid, email: uid + '@example.com', photoUrl: null, providerData: [{ providerId }] });
  const st = { user: null, nextGoogle: 'g1', cancelGoogle: false };
  const FA = {
    addListener: (ev, fn) => { (st.l = st.l || {})[ev] = fn; return Promise.resolve({ remove() {} }); },
    getCurrentUser: async () => ({ user: st.user }),
    signInWithGoogle: async () => { calls.push('google'); if (st.cancelGoogle) throw Object.assign(new Error('The user canceled the sign-in flow.'), { code: '-5' }); st.user = U(st.nextGoogle, 'google.com'); return { user: st.user, credential: { idToken: 'gid' } }; },
    signInWithApple: async o => { calls.push('apple:' + ((o && o.scopes) || []).join(',')); st.user = U('a1', 'apple.com'); return { user: st.user, credential: { authorizationCode: 'code' + calls.length } }; },
    getIdToken: async o => ({ token: 'tok-' + st.user.uid + (o && o.forceRefresh ? '-fresh' : '') }),
    signOut: async () => { calls.push('signOut'); st.user = null; },
    deleteUser: async () => { calls.push('deleteUser'); },
    revokeAccessToken: async o => { calls.push('revoke:' + o.token); },
  };
  w.Capacitor = { isNativePlatform: () => true, getPlatform: () => platform, Plugins: { FirebaseAuthentication: FA } };
  w.VBNative = { is: true, platform };
  w.firebase = { initializeApp() { throw new Error('Firebase JS SDK không được dùng trong app'); } };
  w.eval(SRC('native-auth.js')); // sync.js tải lười file này (jsdom không chạy <script src>)
  w.eval(SRC('sync.js'));
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  return { w, d, st, calls, reqs, toasts, click, Sync: w.Sync, modalOpen: () => !d.getElementById('modal').hidden };
}

// ---------- iOS, đã cấu hình ----------
{
  const { w, d, st, calls, reqs, toasts, click, Sync, modalOpen } = setup({ platform: 'ios' });
  ok(Sync.native === true, 'iOS: bật đăng nhập gốc khi có cấu hình');
  Sync.chrome();
  const top = d.getElementById('avatarBtn');
  ok(top && top.dataset.acct === 'in' && /Đăng nhập/.test(top.textContent) && !top.querySelector('path[fill="#4CAF50"]'), 'iOS: nút đầu trang là "Đăng nhập" chung (không phải nút Google)');
  await sleep(1300); // khởi động trễ 1,2 s → getCurrentUser
  ok(Sync.ready && !Sync.user, 'iOS: khởi động, chưa đăng nhập');
  click(top); await sleep(10);
  const box = d.getElementById('modalBox');
  const bs = [...box.querySelectorAll('.signin-btns .gsi')];
  ok(modalOpen() && bs.length === 2, 'bấm "Đăng nhập" → bảng chọn có 2 nút');
  ok(bs[0] && bs[0].dataset.acct === 'apple' && bs[0].classList.contains('apple') && /Tiếp tục với Apple/.test(bs[0].textContent) && bs[0].querySelector('img[src="icons/apple.svg"]'), 'nút đầu là "Tiếp tục với Apple" (kiểu Apple)');
  ok(bs[1] && bs[1].dataset.acct === 'google' && /Tiếp tục với Google/.test(bs[1].textContent), 'nút sau là "Tiếp tục với Google"');
  ok(!/bản phát hành chính thức/.test(d.body.innerHTML), 'không còn hộp thoại tạm "bản phát hành chính thức"');
  click(bs[0]); await sleep(30);
  ok(!modalOpen() && calls[0] === 'apple:email,name', 'chọn Apple → đóng bảng, gọi signInWithApple (email, name)');
  ok(Sync.user && Sync.user.uid === 'a1' && w.App.state.user && w.App.state.user.email === 'a1@example.com', 'đăng nhập Apple → Sync.user/App.state.user');
  const sy = reqs.find(r => /\/api\/sync$/.test(r.url));
  ok(sy && sy.url === 'https://lexkite.com/api/sync' && sy.auth === 'Bearer tok-a1', 'đồng bộ gọi lexkite.com/api/sync bằng ID token của SDK gốc');
  ok(d.getElementById('avatarBtn').classList.contains('avatar'), 'đã đăng nhập → avatar ở đầu trang');
  ok(!toasts.some(x => /Không đăng nhập được/.test(x)), 'không báo lỗi');

  // Xóa tài khoản Apple: đăng nhập lại (mã mới) → thu hồi token Apple → /api/account → đăng xuất
  w.eval(SRC('account-delete.js'));
  const msgs = []; calls.length = 0; reqs.length = 0;
  await w.AccountDelete.run(false, m => msgs.push(m));
  ok(calls[0] && calls[0].startsWith('apple:'), 'xóa (Apple): đăng nhập lại bằng Apple trước');
  ok(calls[1] && /^revoke:code\d+$/.test(calls[1]), 'xóa (Apple): thu hồi token Apple bằng mã ủy quyền mới');
  const del = reqs.find(r => /\/api\/account$/.test(r.url));
  ok(del && del.auth === 'Bearer tok-a1' && del.body && del.body.op === 'delete' && del.body.confirm === 'DELETE', 'xóa: gọi /api/account kèm ID token');
  ok(calls.includes('signOut') && !Sync.user && !w.App.state.user, 'xóa xong → đăng xuất SDK gốc');
  ok(calls.indexOf(calls.find(c => c.startsWith('revoke:'))) < calls.indexOf('signOut'), 'thu hồi trước khi đăng xuất');

  // Google: hủy đăng nhập → không báo lỗi; đăng nhập lại khác tài khoản → chặn xóa nhầm
  st.cancelGoogle = true; toasts.length = 0;
  await Sync.signIn('google');
  ok(!Sync.user && !toasts.length, 'hủy đăng nhập Google → im lặng, chưa đăng nhập');
  st.cancelGoogle = false;
  await Sync.signIn('google'); await sleep(20);
  ok(Sync.user && Sync.user.uid === 'g1', 'đăng nhập Google → g1');
  st.nextGoogle = 'g2';
  let err = null; try { await Sync.reauth(); } catch (e) { err = e; }
  ok(err && err.code === 'auth/user-mismatch', 'đăng nhập lại bằng tài khoản khác → lỗi auth/user-mismatch');
  st.nextGoogle = 'g2';
  const tok = await Sync.reauth();
  ok(tok === 'tok-g2-fresh', 'đăng nhập lại đúng tài khoản → token mới (forceRefresh)');
  // Thẻ tài khoản (Cài đặt) khi chưa đăng nhập: Apple + Google hiện trực tiếp
  await Sync.signOut(); await sleep(20);
  Sync.renderBox(d.getElementById('acctBox'));
  const card = [...d.querySelectorAll('#acctBox .acct-act .gsi')];
  ok(card.length === 2 && card[0].dataset.acct === 'apple' && card[1].dataset.acct === 'google', 'thẻ tài khoản iOS: Apple trên, Google dưới');
}

// ---------- Android, đã cấu hình ----------
{
  const { d, calls, click, Sync } = setup({ platform: 'android' });
  Sync.chrome();
  const top = d.getElementById('avatarBtn');
  ok(Sync.native && top && /Tiếp tục với Google/.test(top.textContent) && top.querySelector('path[fill="#4CAF50"]'), 'Android: nút "Tiếp tục với Google" có logo G');
  await sleep(1300);
  Sync.renderBox(d.getElementById('acctBox'));
  ok(!d.querySelector('[data-acct="apple"]'), 'Android: không có nút Apple');
  click(top); await sleep(30);
  ok(calls[0] === 'google' && Sync.user && Sync.user.uid === 'g1', 'Android: bấm → đăng nhập Google gốc ngay (không bảng chọn)');
}

// ---------- iOS chưa có file cấu hình Firebase → tắt, không gọi plugin ----------
{
  const { d, calls, Sync, modalOpen } = setup({ platform: 'ios', configured: false });
  ok(Sync.native === false && Sync.can === false && Sync.gBtn === null, 'thiếu cấu hình → không bật đăng nhập gốc, Sync.can=false, không có nút Google cho màn thiết lập');
  Sync.chrome();
  const top = d.getElementById('avatarBtn');
  ok(top && top.tagName === 'A' && !top.dataset.acct && !d.getElementById('sideAcct'), 'thiếu cấu hình → đầu trang/thanh bên KHÔNG có nút đăng nhập');
  const box = d.getElementById('acctBox'); Sync.renderBox(box);
  ok(box.hidden && !box.innerHTML, 'thiếu cấu hình → ẩn thẻ tài khoản trong Cài đặt');
  await sleep(1300);
  await Sync.signIn();
  ok(!calls.length, 'thiếu cấu hình → không gọi plugin (tránh văng app khi Firebase chưa configure)');
  ok(!modalOpen() && !/bản phát hành chính thức/.test(d.body.innerHTML), 'thiếu cấu hình → Sync.signIn() không mở hộp thoại nào (không còn hộp thoại tạm)');
}

if (fails) { console.log(`✗ native-auth: ${fails}/${n} kiểm tra lỗi`); process.exit(1); }
console.log(`✓ native-auth: ${n} kiểm tra – iOS bảng chọn Apple/Google, token SDK gốc → /api/sync, xóa tài khoản + thu hồi Apple, chặn sai tài khoản, Android, thiếu cấu hình`);
process.exit(0);
