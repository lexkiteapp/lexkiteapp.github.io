// Kiểm đăng nhập gốc trên Android giả lập (workflow native-auth-e2e.yml) – điều khiển WebView của app qua Chrome DevTools (bản debug),
// chụp màn hình/đọc giao diện hệ thống bằng adb. KHÔNG đăng nhập thật: bấm Google → thấy hoạt động đăng nhập gốc → BACK (hủy).
// Dùng: node scripts/test/native-auth/android.mjs <out-dir>   (cần adb, app com.lexkite.app đã cài)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.resolve(process.argv[2] || 'auth-android'); fs.mkdirSync(OUT, { recursive: true });
const PKG = 'com.lexkite.app';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => { try { return execFileSync('adb', a, { encoding: 'utf8', timeout: 60000, maxBuffer: 64 << 20 }); } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 300); } };
const bad = [], info = {}, consoleErr = []; let ws = null;
const fail = m => { console.log('✗ ' + m); bad.push(m); };
const ok = m => console.log('✓ ' + m);
let nShot = 0;
const shot = name => { const f = path.join(OUT, `${String(++nShot).padStart(2, '0')}-${name}.png`); try { fs.writeFileSync(f, execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20, timeout: 30000 })); } catch (e) { console.log('screencap lỗi', e.message); } return f; };
// hoạt động đang ở trên cùng (topResumedActivity/mResumedActivity – mCurrentFocus có thể trỏ nhầm cửa sổ launcher)
const focus = () => (/(?:topResumedActivity|mResumedActivity)=ActivityRecord\{\S+ \S+ ([^\s}]+)/.exec(adb('shell', 'dumpsys', 'activity', 'activities')) || [])[1] || '';

// ---- mở app, nối DevTools của WebView ----
adb('logcat', '-c');
// quyền thông báo cấp sẵn → hộp hỏi quyền của hệ thống không che bảng đăng nhập Google
adb('shell', 'pm', 'grant', PKG, 'android.permission.POST_NOTIFICATIONS');
adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
let sock = '';
for (let k = 0; k < 30 && !sock; k++) { await sleep(2000); sock = (/@(webview_devtools_remote_\d+)/.exec(adb('shell', 'cat', '/proc/net/unix')) || [])[1] || ''; }
if (!sock) { fail('Không thấy socket DevTools của WebView (app không chạy?)'); finish(); }
adb('forward', 'tcp:9222', 'localabstract:' + sock);
await sleep(8000);
let pages = []; for (let k = 0; k < 10 && !pages.length; k++) { try { pages = (await (await fetch('http://127.0.0.1:9222/json')).json()).filter(p => p.type === 'page'); } catch (e) { /* chờ */ } if (!pages.length) await sleep(2000); }
if (!pages.length) { fail('Không mở được DevTools của WebView'); finish(); }
ws = new WebSocket(pages[0].webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
let id = 0; const pend = new Map();
ws.onmessage = m => {
  const d = JSON.parse(m.data);
  if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); return; }
  if (d.method === 'Runtime.consoleAPICalled' && /error|warning/.test(d.params.type)) consoleErr.push(d.params.type + ': ' + d.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 300));
  if (d.method === 'Runtime.exceptionThrown') consoleErr.push('exception: ' + JSON.stringify(d.params.exceptionDetails).slice(0, 1500));
};
// mỗi lệnh DevTools tối đa 20 s (WebView bị hủy khi app thoát → không treo cả kịch bản)
const cdp = (method, params) => new Promise(r => { const i = ++id; pend.set(i, r); const tm = setTimeout(() => { pend.delete(i); r({ result: { exceptionDetails: { text: 'cdp timeout' } } }); }, 20000); pend.set(i, d => { clearTimeout(tm); r(d); }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(tm); pend.delete(i); r({ result: { exceptionDetails: { text: 'ws closed' } } }); } });
ws.onclose = () => { console.log('DevTools WebView đóng'); for (const [, f] of pend) f({ result: { exceptionDetails: { text: 'ws closed' } } }); pend.clear(); };
const ev = async expr => { const r = await cdp('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) return { __err: JSON.stringify(r.result.exceptionDetails).slice(0, 300) }; return r.result && r.result.result ? r.result.result.value : undefined; };
await cdp('Runtime.enable', {});
const alog = async () => { const v = await ev("return window.__auth ? __auth.slice() : []"); return Array.isArray(v) ? v : []; };
const go = async (h, ms) => { await ev(`location.hash = ${JSON.stringify(h)}; return 1`); await sleep(ms || 4000); };
const COMING = '/sẽ có ở bản phát hành chính thức|phát hành chính thức|coming soon|official release|full release/i';
// ghi lệnh gọi/kết quả plugin FirebaseAuthentication qua cầu Capacitor (không ghi dữ liệu người dùng)
await ev(`const C = window.Capacitor; window.__auth = window.__auth || []; if (C && !C.__e2eAuth) { C.__e2eAuth = 1; const tn = C.toNative, fn = C.fromNative;
  C.toNative = function (pl, m) { if (pl === 'FirebaseAuthentication') __auth.push({ dir: 'call', m }); return tn.apply(this, arguments); };
  const np = C.nativePromise; if (typeof np === 'function') C.nativePromise = function (pl, m) { const p = np.apply(this, arguments); if (pl === 'FirebaseAuthentication' && p && p.then) p.then(() => __auth.push({ dir: 'ret', m, success: true }), e => __auth.push({ dir: 'ret', m, success: false, code: String((e && e.code) || ''), err: String((e && e.message) || '').slice(0, 200) })); return p; };
  C.fromNative0 = function (r) { try { if (r && r.pluginId === 'FirebaseAuthentication') __auth.push({ dir: 'ret', m: r.methodName, success: !!r.success, code: String((r.error && r.error.code) || ''), err: String((r.error && r.error.message) || '').slice(0, 200) }); } catch (e) {} return fn.apply(this, arguments); }; } return 1`);

// ---- 1. khởi chạy ----
info.launch = await ev(`return { path: location.pathname, hash: location.hash, flag: window.LK_NATIVE_AUTH || null, native: !!(window.Sync && Sync.native), plugin: !!(Capacitor.Plugins && Capacitor.Plugins.FirebaseAuthentication), plat: Capacitor.getPlatform() }`);
console.log('launch', JSON.stringify(info.launch));
if (!info.launch || !info.launch.native) fail('Đăng nhập gốc TẮT trên Android (Sync.native=false)'); else ok('Sync.native = true, LK_NATIVE_AUTH ' + JSON.stringify(info.launch.flag));
// hoàn tất màn chào (giống harness iOS)
await go('#/welcome/setup', 5000);
await ev(`const g = document.getElementById('go'); if (g && g.disabled) { const c = document.querySelector('#view [data-topic], #view .chip'); c && c.click(); } await new Promise(r => setTimeout(r, 400)); const g2 = document.getElementById('go'); if (g2 && !g2.disabled) g2.click(); return 1`);
await sleep(5000);

// ---- 2. giao diện đăng nhập ----
await go('#/settings', 5000);
info.ui = await ev(`const b = document.getElementById('syncBox'); if (b) b.scrollIntoView({ block: 'center' }); await new Promise(r => setTimeout(r, 600));
  const vis = e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1; };
  const top = document.getElementById('avatarBtn');
  return { accts: b ? [...b.querySelectorAll('[data-acct]')].filter(vis).map(x => x.dataset.acct + ':' + x.innerText.trim().slice(0, 40)) : [], top: top ? top.dataset.acct : null, coming: ${COMING}.test(document.body.innerText) }`);
console.log('ui', JSON.stringify(info.ui));
shot('android-signin-settings');
if (!info.ui || !info.ui.accts.some(a => /^(google|in):/.test(a))) fail('Không có nút Google ở thẻ tài khoản'); else ok('Nút Google hiển thị: ' + info.ui.accts.join(', '));
if (info.ui && info.ui.coming) fail('Có chữ "sắp có / phát hành chính thức"'); else ok('Không có hộp thoại "sắp có"');

// ---- 3. bấm Google → hoạt động đăng nhập gốc → BACK ----
const focus0 = focus();
await ev(`__auth.length = 0; const b = document.querySelector('#syncBox [data-acct="google"]') || document.querySelector('#syncBox [data-acct="in"]'); b.click(); return 1`);
let sheet = '', ui = '';
for (let k = 0; k < 10; k++) { await sleep(1500); const f = focus(); if (f && !f.startsWith(PKG + '/')) { sheet = f; break; } }
await sleep(1500);
const fSheet = shot('android-google-sheet');
adb('shell', 'uiautomator', 'dump', '/sdcard/ui.xml'); ui = adb('shell', 'cat', '/sdcard/ui.xml');
const pkgs = [...new Set([...ui.matchAll(/package="([^"]+)"/g)].map(m => m[1]))];
const texts = [...new Set([...ui.matchAll(/text="([^"]+)"/g)].map(m => m[1]))].slice(0, 25);
info.sheet = { focusBefore: focus0, focus: sheet || focus(), pkgs, texts };
console.log('sheet', JSON.stringify(info.sheet));
const log1 = await alog();
if (!(log1 || []).some(x => x.dir === 'call' && /signInWithGoogle/.test(x.m))) fail('Bấm Google nhưng plugin signInWithGoogle không được gọi'); else ok('Đã gọi FirebaseAuthentication.signInWithGoogle');
const native = /gms|credential|SignInHub/i.test(sheet) || pkgs.some(p => p !== PKG && /gms|credential/i.test(p));
if (!native) fail('Không thấy giao diện đăng nhập Google gốc (focus ' + (sheet || focus()) + ', gói ' + pkgs.join(',') + ')'); else ok('Giao diện Google gốc hiện: ' + (sheet || pkgs.join(',')));
if (native) adb('shell', 'input', 'keyevent', '4'); // BACK = hủy bảng đăng nhập
// kết quả = lần trả cuối khi mọi lệnh signInWithGoogle đã xong (Android có thể gọi 2 lần: Credential Manager → luồng cũ)
const settled = async () => { const l = (await alog()).filter(x => /signInWithGoogle/.test(x.m)); const calls = l.filter(x => x.dir === 'call').length, rets = l.filter(x => x.dir === 'ret'); return calls && rets.length >= calls ? rets.at(-1) : null; };
let ret = null; for (let k = 0; k < 40 && !ret; k++) { await sleep(500); ret = await settled(); }
if (!ret && native) { adb('shell', 'input', 'keyevent', '4'); for (let k = 0; k < 20 && !ret; k++) { await sleep(500); ret = await settled(); } }
info.ret = ret; console.log('ret', JSON.stringify(ret));
await sleep(800);
const toast = await ev(`return [...document.querySelectorAll('.toast, [role=status], [role=alert]')].map(x => x.innerText).join(' | ').slice(0, 300)`);
shot('android-after-cancel');
if (!ret) fail('Plugin chưa trả kết quả sau khi hủy (promise treo)');
else if (ret.success) fail('Đăng nhập thành công ngoài ý muốn');
else if (!/cancel|12501|-5\b|^8:/i.test(ret.code + ' ' + ret.err)) fail('Lỗi không phải "hủy": ' + ret.code + ' ' + ret.err);
else ok('Hủy đăng nhập trả lỗi "hủy": ' + (ret.code + ' ' + ret.err).trim());
if (/Không đăng nhập được|Couldn.t sign in|sign-in failed/i.test(toast || '')) fail('Hiện thông báo lỗi sau khi hủy: ' + toast);
if (focus().startsWith(PKG + '/') === false) { fail('App không trở lại sau khi hủy (focus ' + focus() + ')'); adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1'); await sleep(3000); }

// ---- 4. app vẫn dùng được ----
for (const r of ['#/home', '#/vocab', '#/settings']) { await go(r, 3500); const n = await ev(`const v = document.getElementById('view'); const m = document.getElementById('modal'); return { n: v ? v.innerText.trim().length : 0, modal: !!(m && !m.hidden) }`); if (!n || n.n < 40) fail('Trang ' + r + ' trống sau khi hủy'); if (n && n.modal) fail('Còn hộp thoại treo ở ' + r); }
ok('App dùng được sau khi hủy (home/vocab/settings)');

// ---- 5. xóa tài khoản (dữ liệu giả – không đăng nhập thật; chỉ mở hộp xác nhận) ----
const del = await ev(`const real = Sync.user; Sync.user = { uid: 'e2e-fixture', displayName: 'E2E Fixture', email: 'fixture@lexkite.test', photoURL: '', providerData: [{ providerId: 'google.com' }], getIdToken: () => Promise.reject(new Error('fixture')), delete: () => Promise.reject(new Error('fixture')) };
  const w = ms => new Promise(r => setTimeout(r, ms)); let out = {};
  try { location.hash = '#/home'; await w(1500); location.hash = '#/settings'; await w(3500);
    const d = document.querySelector('#syncBox [data-acct="del"]'); out.btn = !!d;
    if (d) { d.scrollIntoView({ block: 'center' }); d.click(); await w(3000); const m = document.getElementById('modal'); out.modal = !!(m && !m.hidden && /Lexkite/.test(m.innerText)); out.h = m ? (m.querySelector('h2') || {}).innerText : ''; }
  } finally { window.__restoreUser = () => { UI.closeModal && UI.closeModal(); Sync.user = real || null; Sync.renderBox(document.getElementById('syncBox')); }; }
  return out`);
console.log('delete', JSON.stringify(del));
shot('android-account-delete');
await ev('__restoreUser(); return 1');
if (!del || !del.btn || !del.modal) fail('Luồng xóa tài khoản không mở được'); else ok('Luồng xóa tài khoản mở được: "' + del.h + '"');

// ---- 6. widget từ (WidgetPreviewActivity) ----
adb('shell', 'am', 'start', '-W', '-n', PKG + '/com.vocaband.app.WidgetPreviewActivity', '--es', 'kind', 'word', '--es', 'lang', 'vi'); await sleep(3000);
shot('android-widget-word');
if (!focus().includes('WidgetPreviewActivity')) fail('Widget từ không hiển thị (focus ' + focus() + ')'); else ok('Widget từ hiển thị');
finish();

function finish() {
  const lc = adb('logcat', '-d', '-v', 'brief');
  fs.writeFileSync(path.join(OUT, 'logcat.txt'), lc);
  const lines = lc.split('\n');
  const fatal = lines.filter(l => /FATAL EXCEPTION|AndroidRuntime.*(Exception|Error)/.test(l));
  const fb = lines.filter(l => /FirebaseApp|default_web_client_id|GoogleService|FirebaseInitProvider|FirebaseAuth|GetCredential|CredentialManager|FirebaseAuthentication/i.test(l));
  fb.slice(0, 20).forEach(l => console.log('[logcat] ' + l.slice(0, 260)));
  if (fatal.length) fail('Crash: ' + fatal.slice(0, 3).join(' / ').slice(0, 400));
  // chỉ tính tiến trình của app (pid khởi tạo Firebase thành công / ghi plugin Capacitor); app khác trên image emulator (pid khác) cũng log "Default FirebaseApp failed" → không phải lỗi của ta
  const pidOf = l => (l.match(/\(\s*(\d+)\)/) || [])[1];
  const appPids = new Set(lines.filter(l => /FirebaseApp initialization successful|Registering plugin instance|Capacitor/.test(l)).map(pidOf).filter(Boolean));
  try { adb('shell', 'pidof', PKG).split(/\s+/).filter(Boolean).forEach(p => appPids.add(p)); } catch (e) { /* bỏ qua */ }
  const fbErr = fb.filter(l => appPids.has(pidOf(l))).filter(l => /not initialized|not found|missing|Default FirebaseApp|failed to initialize|Unknown calling package|DEVELOPER_ERROR|\b10:/i.test(l));
  if (fbErr.length) fail('Lỗi khởi tạo Firebase/Google: ' + fbErr.slice(0, 3).join(' / ').slice(0, 400));
  const ce = consoleErr.filter(s => !/ResizeObserver|net::ERR|Failed to load resource/.test(s));
  ce.slice(0, 15).forEach(s => console.log('[console] ' + s));
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ bad, info, console: consoleErr }, null, 1));
  console.log(bad.length ? '✗ FAIL Android: ' + bad.join(' · ') : '✓ PASS đăng nhập gốc Android');
  try { ws && ws.close(); } catch (e) { /* bỏ qua */ }
  process.exit(bad.length ? 1 : 0);
}
