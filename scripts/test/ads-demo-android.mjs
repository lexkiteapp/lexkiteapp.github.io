// AdMob trên Android giả lập với MÃ THỬ của Google (ca-app-pub-3940256099942544, config.native.testing = true) – GỌI MẠNG THẬT.
// Workflow: .github/workflows/ads-demo.yml (bản build ADS_NATIVE=1). Điều khiển WebView qua DevTools (như native-auth/android.mjs):
// bật cờ ads_android qua localStorage lk.cfg → AdsRun.rewarded('ai') + AdsRun.inter() → kiểm sự kiện plugin @capacitor-community/admob.
// Dùng: node scripts/test/ads-demo-android.mjs <out-dir>   (cần adb, app com.lexkite.app đã cài)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.resolve(process.argv[2] || 'ads-android'); fs.mkdirSync(OUT, { recursive: true });
const PKG = 'com.lexkite.app', TEST_PUB = 'ca-app-pub-3940256099942544';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => { try { return execFileSync('adb', a, { encoding: 'utf8', timeout: 60000, maxBuffer: 64 << 20 }); } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 300); } };
const bad = [], info = {}; let ws = null;
const fail = m => { console.log('✗ ' + m); bad.push(m); };
const ok = m => console.log('✓ ' + m);
let nShot = 0;
const shot = name => { const f = path.join(OUT, `${String(++nShot).padStart(2, '0')}-${name}.png`); try { fs.writeFileSync(f, execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20, timeout: 30000 })); } catch (e) { console.log('screencap lỗi', e.message); } return f; };
const inApp = () => /^com\.lexkite\.app\/\S*MainActivity/.test(focus());
const focus = () => (/(?:topResumedActivity|mResumedActivity)=ActivityRecord\{\S+ \S+ ([^\s}]+)/.exec(adb('shell', 'dumpsys', 'activity', 'activities')) || [])[1] || '';

// ---- mở app, nối DevTools ----
adb('logcat', '-c');
adb('shell', 'pm', 'grant', PKG, 'android.permission.POST_NOTIFICATIONS');
adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
// Socket DevTools mang pid của tiến trình app: app bị khởi động lại (crash/hệ thống giết) → socket mới → nối lại forward mỗi lần connect()
let sock = '';
const findSock = () => (/@(webview_devtools_remote_\d+)/.exec(adb('shell', 'cat', '/proc/net/unix')) || [])[1] || '';
for (let k = 0; k < 30 && !sock; k++) { await sleep(2000); sock = findSock(); }
if (!sock) { fail('Không thấy socket DevTools của WebView'); finish(); }
adb('forward', 'tcp:9222', 'localabstract:' + sock);
await sleep(6000);
const pid = () => adb('shell', 'pidof', PKG).trim();
info.pid0 = pid();
/** Chẩn đoán khi mất DevTools: giả lập còn sống? app còn chạy (pid đổi = khởi động lại)? activity nào đang trước? WebView có trang nào? */
const diag = async tag => {
  let json = ''; try { json = (await (await fetch('http://127.0.0.1:9222/json')).text()).slice(0, 400); } catch (e) { json = 'ERR ' + e.message; }
  const d = { tag, adb: adb('get-state').trim(), pid0: info.pid0, pid: pid(), focus: focus(), sock, socks: (adb('shell', 'cat', '/proc/net/unix').match(/@webview_devtools_remote_\d+/g) || []).join(' '), json,
    log: adb('logcat', '-d', '-t', '400', '-v', 'brief').split('\n').filter(l => /lexkite|AndroidRuntime|FATAL|chromium|cr_|WebView|lowmemorykiller|ActivityManager: (Kill|Process)|am_crash|ANR/i.test(l)).slice(-25).map(l => l.slice(0, 220)) };
  console.log('diag', JSON.stringify(d, null, 1)); (info.diag = info.diag || []).push(d); return d;
};
const connect = async () => {
  let pages = []; for (let k = 0; k < 15 && !pages.length; k++) {
    const s2 = findSock(); if (s2 && s2 !== sock) { console.log('… socket DevTools đổi ' + sock + ' → ' + s2 + ' (app khởi động lại)'); sock = s2; adb('forward', 'tcp:9222', 'localabstract:' + sock); }
    try { pages = (await (await fetch('http://127.0.0.1:9222/json')).json()).filter(p => p.type === 'page'); } catch (e) { /* chờ */ } if (!pages.length) await sleep(2000); }
  if (!pages.length) { await diag('connect'); return false; }
  ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
  ws.onclose = () => { for (const [, f] of pend) f({ result: { exceptionDetails: { text: 'ws closed' } } }); pend.clear(); };
  return true;
};
let id = 0; const pend = new Map();
const cdp = (method, params) => new Promise(r => { const i = ++id; const tm = setTimeout(() => { pend.delete(i); r({ result: { exceptionDetails: { text: 'cdp timeout' } } }); }, 20000); pend.set(i, d => { clearTimeout(tm); r(d); }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(tm); pend.delete(i); r({ result: { exceptionDetails: { text: 'ws closed' } } }); } });
const ev = async expr => { const r = await cdp('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) return { __err: JSON.stringify(r.result.exceptionDetails).slice(0, 300) }; return r.result && r.result.result ? r.result.result.value : undefined; };
if (!(await connect())) { fail('Không mở được DevTools của WebView'); finish(); }

// ---- 1. người dùng ĐÃ qua onboarding (máy mới cài mở #/welcome = vùng cấm HARD 'onboarding', policy.js ZONES – #444) + cờ ads_android (lk.cfg) + nhóm a → tải lại ----
// Chờ lượt tải /api/config đầu tiên của app (app.js cfg()) ghi xong lk.cfg rồi mới ghi đè: nếu không, phản hồi đến muộn trên giả lập ghi đè cờ → Ads.on() = false.
info.cfg0 = await ev(`for (let k = 0; k < 30 && !localStorage.getItem('lk.cfg'); k++) await new Promise(r => setTimeout(r, 500)); return !!localStorage.getItem('lk.cfg')`);
const prep = `for (let k = 0; k < 30 && !(window.App && App.state && App.state.settings && App.saveSettings); k++) await new Promise(r => setTimeout(r, 500));
  App.state.settings.onboarded = true; await App.saveSettings();
  localStorage.setItem('lk.cfg', JSON.stringify({ at: Date.now() + 864e5, v: { ads_android: '1' } })); localStorage.setItem('lk.vid', 'aaaaaaaa'); localStorage.setItem('lk.ads', JSON.stringify({ firstAt: Date.now() - 3 * 864e5 })); return 1`;
for (let k = 0; k < 3; k++) {
  await ev(prep);
  // mở lại như người dùng quay lại app (#/home) – tải lại giữ nguyên hash #/welcome của lần mở đầu thì vẫn là vùng cấm
  await ev("history.replaceState(null, '', location.pathname + location.search + '#/home'); location.reload(); return 1"); try { ws.close(); } catch (e) { /* bỏ qua */ }
  await sleep(8000);
  if (!(await connect())) { const d = (info.diag || []).slice(-1)[0] || {}; fail('Mất DevTools sau khi tải lại – ' + (d.adb !== 'device' ? 'giả lập mất kết nối adb (' + d.adb + ')' : !d.pid ? 'app không còn chạy' : d.pid !== d.pid0 ? 'app đã khởi động lại (pid ' + d.pid0 + ' → ' + d.pid + ')' : 'WebView không có trang, activity ' + d.focus)); finish(); }
  // chờ vỏ ads.js + router vẽ trang đầu (app-loader nạp JS sau lần vẽ đầu)
  info.boot = await ev(`for (let k = 0; k < 30 && !(window.Ads && window.App && location.hash); k++) await new Promise(r => setTimeout(r, 500));
    return { plat: Capacitor.getPlatform(), plugin: !!(Capacitor.Plugins && Capacitor.Plugins.AdMob), on: !!(window.Ads && Ads.on()), cfg: (JSON.parse(localStorage.getItem('lk.cfg') || '{}').v || {}).ads_android, hash: location.hash, onboarded: !!(App.state.settings || {}).onboarded }`);
  console.log('boot', JSON.stringify(info.boot));
  if (info.boot && info.boot.cfg === '1' && info.boot.onboarded && !/^#\/welcome/.test(info.boot.hash || '')) break;
  console.log('… lk.cfg/onboarded/hash chưa đúng sau khi tải lại – ghi lại lần ' + (k + 2));
}
if (!info.boot || !info.boot.onboarded || /^#\/welcome/.test(info.boot.hash || '')) fail('App vẫn ở onboarding (' + JSON.stringify(info.boot && info.boot.hash) + ') – vùng cấm, bài test phải chạy như người dùng đã học');
if (!info.boot || !info.boot.plugin) fail('Không có plugin AdMob trong bản build (ADS_NATIVE=1?)'); else ok('Plugin AdMob có trong app');
if (!info.boot || !info.boot.on) fail('Vỏ Ads.on() = false dù lk.cfg ads_android = 1');

// ---- 2. tải js/ads/* qua vỏ, bật enabled TRONG PHIÊN TEST (mã nguồn vẫn enabled:false), ghi sự kiện plugin ----
const EVENTS = ['onRewardedVideoAdLoaded', 'onRewardedVideoAdShowed', 'onRewardedVideoAdReward', 'onRewardedVideoAdDismissed', 'onRewardedVideoAdFailedToLoad', 'onRewardedVideoAdFailedToShow',
  'interstitialAdLoaded', 'interstitialAdShowed', 'interstitialAdDismissed', 'interstitialAdFailedToLoad', 'interstitialAdFailedToShow'];
info.setup = await ev(`await Ads.rewarded('ai', 1); // tải config → policy → run
  ADS_CONFIG.enabled = true; window.__adev = [];
  const A = Capacitor.Plugins.AdMob; for (const n of ${JSON.stringify(EVENTS)}) await A.addListener(n, e => __adev.push({ n, t: Date.now(), e: JSON.stringify(e || {}).slice(0, 200) }));
  const n = ADS_CONFIG.native; return { testing: n.testing, unit: n.android.rewarded, inter: n.android.interstitial, can: AdsRun.canReward('ai') }`);
console.log('setup', JSON.stringify(info.setup));
if (!info.setup || info.setup.testing !== true || !String(info.setup.unit).startsWith(TEST_PUB + '/') || !String(info.setup.inter).startsWith(TEST_PUB + '/')) { fail('Không phải mã THỬ của Google – dừng (không bao giờ gọi mã thật)'); finish(); }
ok('testing = true, mã thử ' + info.setup.unit);
if (!info.setup.can) fail('AdsRun.canReward("ai") = false');
if (info.setup && !info.setup.can) console.log('why', JSON.stringify(await ev(`const P = AdsPolicy, r = (location.hash.replace(/^#\\/?/, '').split(/[/?]/)[0] || 'home');
  return { plat: window.Capacitor && Capacitor.getPlatform(), on: Ads.on(), hash: location.hash, path: location.pathname, brk: !!document.querySelector('#aoHost, [data-ad-break]'), st: AdsRun._st && AdsRun._st(), zone: P.zone ? P.zone({ route: r, path: location.pathname }) : null, blocked: P.blocked({ plat: 'android', route: r, path: location.pathname }, 'rew') }`)));
const adev = async () => { const v = await ev('return (window.__adev || []).slice()'); return Array.isArray(v) ? v : []; };
const waitEv = async (re, ms) => { for (let t = 0; t < ms; t += 1000) { const l = await adev(); const e = l.find(x => re.test(x.n)); if (e) return e; await sleep(1000); } return null; };

// ---- 3. có thưởng ----
await ev(`window.__rw = 'pending'; AdsRun.rewarded('ai').then(v => { __rw = v; }, e => { __rw = 'err:' + e; }); return 1`);
const loaded = await waitEv(/^onRewardedVideoAd(Loaded|FailedToLoad)$/, 45000);
if (!loaded || loaded.n !== 'onRewardedVideoAdLoaded') fail('Có thưởng: không loaded (' + JSON.stringify(loaded) + ')'); else ok('Có thưởng: onRewardedVideoAdLoaded');
await sleep(4000); shot('rewarded-showing');
info.focusRew = focus();
const reward = loaded && loaded.n === 'onRewardedVideoAdLoaded' ? await waitEv(/^onRewardedVideoAdReward$/, 75000) : null;
if (!reward) fail('Có thưởng: không có onRewardedVideoAdReward sau 75 s'); else ok('Có thưởng: onRewardedVideoAdReward ' + reward.e);
shot('rewarded-done');
for (let r = 0; r < 4 && !inApp(); r++) { adb('shell', 'input', 'keyevent', '4'); await sleep(2500); } // đóng quảng cáo
let rw = 'pending'; for (let k = 0; k < 20 && rw === 'pending'; k++) { await sleep(1000); rw = await ev('return window.__rw'); }
info.rewardedResult = rw;
if (reward && rw !== true) fail('AdsRun.rewarded trả ' + JSON.stringify(rw) + ' dù đã nhận thưởng'); else if (rw === true) ok('AdsRun.rewarded("ai") → true');

// ---- 4. toàn màn hình (đúng luật: vừa xong 1 phiên, về tab chính, đủ ngày/phiên; bỏ "yên 30 phút sau có thưởng" trong phiên test) ----
await ev(`const s = AdsRun._st(); Object.assign(s, { firstAt: Date.now() - 3 * 864e5, pending: 1, sessions: 5, lastAt: 0, rewAt: 0, lastPct: 90 }); location.hash = '#/home'; await new Promise(r => setTimeout(r, 800)); window.__it = 'pending'; AdsRun.inter().then(() => { __it = 'done'; }, e => { __it = 'err:' + e; }); return 1`);
const iLoaded = await waitEv(/^interstitialAd(Loaded|FailedToLoad)$/, 45000);
if (!iLoaded || iLoaded.n !== 'interstitialAdLoaded') fail('Toàn màn hình: không loaded (' + JSON.stringify(iLoaded) + ')'); else ok('Toàn màn hình: interstitialAdLoaded');
const iShow = iLoaded && iLoaded.n === 'interstitialAdLoaded' ? await waitEv(/^interstitialAdShowed$/, 20000) : null;
if (iLoaded && !iShow) fail('Toàn màn hình: không interstitialAdShowed'); else if (iShow) ok('Toàn màn hình: interstitialAdShowed');
await sleep(3000); shot('interstitial-showing');
for (let r = 0; r < 4 && !inApp(); r++) { adb('shell', 'input', 'keyevent', '4'); await sleep(2500); }
info.events = await adev();
finish();

function finish() {
  const lc = adb('logcat', '-d', '-v', 'brief');
  fs.writeFileSync(path.join(OUT, 'logcat.txt'), lc);
  const lines = lc.split('\n');
  const fatal = lines.filter(l => /FATAL EXCEPTION|AndroidRuntime.*(Exception|Error)/.test(l));
  lines.filter(l => /Ads|admob|GMA/i.test(l)).slice(0, 25).forEach(l => console.log('[logcat] ' + l.slice(0, 240)));
  if (fatal.length) fail('Crash: ' + fatal.slice(0, 3).join(' / ').slice(0, 400));
  if (lines.some(l => l.includes('ca-app-pub-2290668854727752'))) fail('Log có mã THẬT của Lexkite – bản test không được dùng mã thật');
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ bad, info }, null, 1));
  console.log(bad.length ? '✗ FAIL AdMob Android: ' + bad.join(' · ') : '✓ PASS AdMob Android (mã thử Google): rewarded loaded+reward, interstitial loaded+showed');
  try { ws && ws.close(); } catch (e) { /* bỏ qua */ }
  process.exit(bad.length ? 1 : 0);
}
