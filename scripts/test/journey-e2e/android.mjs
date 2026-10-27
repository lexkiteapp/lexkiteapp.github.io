// journey-e2e trên Android emulator: hành trình 1–3 (native.js) chạy trong WebView của app debug qua Chrome DevTools – vi/en/ar.
// Dùng: node scripts/test/journey-e2e/android.mjs <out-dir>   (cần adb + app com.lexkite.app đã cài; workflow journey-e2e.yml native=1)
import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.resolve(process.argv[2] || 'je-android'); fs.mkdirSync(OUT, { recursive: true });
const PKG = 'com.lexkite.app', sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => { try { return execFileSync('adb', a, { encoding: 'utf8', timeout: 60000, maxBuffer: 64 << 20 }); } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 300); } };
const SRC = ['checks.js', 'native.js'].map(f => fs.readFileSync(new URL('./' + f, import.meta.url), 'utf8')).join('\n;\n');
const bad = [], errs = []; let nShot = 0, ran = 0;
// Canh chừng (CI 26/10: emulator chết giữa chừng → "device not found", harness lặp kết nối lại ~40' tới khi bị huỷ): thoát đỏ ngay khi máy ảo mất hoặc quá hạn tổng.
try { const lg = fs.openSync(path.join(OUT, 'logcat.txt'), 'w'); spawn('adb', ['logcat', '-v', 'time'], { stdio: ['ignore', lg, 'ignore'], detached: false }).unref(); } catch (e) { /* */ } // logcat tới lúc máy ảo chết
const DEADLINE = Date.now() + (+process.env.JE_ANDROID_MAX_MIN || 25) * 60000; let offline = 0;
const abort = why => { bad.push(why); try { fs.writeFileSync(path.join(OUT, 'host-diag.txt'), execFileSync('sh', ['-c', 'free -m; dmesg 2>/dev/null | tail -30; ps aux --sort=-rss | head -8'], { encoding: 'utf8', timeout: 10000 })); } catch (e) { /* */ } console.log('✗ ' + why); try { fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ bad, errs, ran }, null, 1)); } catch (e) { /* */ } process.exit(3); };
setInterval(() => { let st = ''; try { st = execFileSync('adb', ['get-state'], { encoding: 'utf8', timeout: 15000 }).trim(); } catch (e) { st = 'ERR'; } offline = st === 'device' ? 0 : offline + 1; if (offline >= 3) abort('emulator mất kết nối (adb get-state=' + st + ') – máy ảo chết giữa chừng'); if (Date.now() > DEADLINE) abort('quá hạn tổng ' + (+process.env.JE_ANDROID_MAX_MIN || 25) + ' phút'); }, 20000).unref?.();
const shot = n => { try { fs.writeFileSync(path.join(OUT, `${String(++nShot).padStart(2, '0')}-${n}.png`), execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20, timeout: 30000 })); } catch (e) { /* bỏ qua */ } };
adb('logcat', '-c');
adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
let sock = '';
for (let k = 0; k < 30 && !sock; k++) { await sleep(2000); sock = (/@(webview_devtools_remote_\d+)/.exec(adb('shell', 'cat', '/proc/net/unix')) || [])[1] || ''; }
if (!sock) { console.log('✗ không thấy socket DevTools của WebView'); process.exit(1); }
adb('forward', 'tcp:9222', 'localabstract:' + sock); await sleep(8000);
let ws = null, id = 0; const pend = new Map();
const onmsg = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); return; }
  if (d.method === 'Page.javascriptDialogOpening') { errs.push('hộp thoại JS chặn trang: ' + d.params.type + ' ' + String(d.params.message).slice(0, 120)); ws.send(JSON.stringify({ id: ++id, method: 'Page.handleJavaScriptDialog', params: { accept: false } })); }
  if (d.method === 'Runtime.exceptionThrown') errs.push('exception: ' + String(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 200));
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('console: ' + d.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200)); };
const cdp = (method, params, ms = 150000) => new Promise(r => { const i = ++id; const tm = setTimeout(() => { pend.delete(i); r({ result: { exceptionDetails: { text: 'cdp timeout' } } }); }, ms); pend.set(i, d => { clearTimeout(tm); r(d); }); try { ws.send(JSON.stringify({ id: i, method, params })); } catch (e) { clearTimeout(tm); pend.delete(i); r({ result: { exceptionDetails: { text: 'cdp closed' } } }); } });
// (Kết nối lại) trang WebView: sau tải lại/đổi hướng RTL, đích DevTools cũ có thể chết → tìm lại trang + nạp lại đầu dò
async function connect() {
  try { ws && ws.close(); } catch (e) { /* */ }
  if (ws) { const so = (/@(webview_devtools_remote_\d+)/.exec(adb('shell', 'cat', '/proc/net/unix')) || [])[1]; if (so && so !== sock) { sock = so; adb('forward', 'tcp:9222', 'localabstract:' + sock); await sleep(3000); } } // WebView khởi động lại → socket mới
  let pages = []; for (let k = 0; k < 15 && !pages.length; k++) { try { pages = (await (await fetch('http://127.0.0.1:9222/json')).json()).filter(p => p.type === 'page'); } catch (e) { /* chờ */ } if (!pages.length) await sleep(2000); }
  if (!pages.length) return false;
  ws = new WebSocket(pages[0].webSocketDebuggerUrl); ws.onmessage = onmsg; await new Promise((y, n) => { ws.onopen = y; ws.onerror = n; setTimeout(n, 15000); }).catch(() => {});
  await cdp('Runtime.enable', {}, 20000); await cdp('Page.enable', {}, 20000);
  await cdp('Page.addScriptToEvaluateOnNewDocument', { source: SRC }, 20000);
  await cdp('Runtime.evaluate', { expression: 'window.LKJN ? 1 : (function () {\n' + SRC + '\n;return 1; })()', returnByValue: true }, 20000);
  return true;
}
if (!(await connect())) { console.log('✗ không kết nối được trang WebView'); process.exit(1); }
const ev0 = async expr => { const r = await cdp('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) return { __err: JSON.stringify(r.result.exceptionDetails).slice(0, 300) }; return r.result && r.result.result ? r.result.result.value : undefined; };
const ev = async expr => { const r = await ev0(expr); if (r && r.__err && /cdp (timeout|closed)/.test(r.__err)) { console.log('… CDP không phản hồi → kết nối lại'); await connect(); } return r; };
// Giả lập vừa khởi động hay báo ANR của launcher ("Pixel Launcher isn't responding", lượt đỏ 24/10): hộp hệ thống che app → bấm "Wait" (như native-auth/android.mjs). Không đổi điều kiện kiểm.
const clearAnr = async () => {
  for (let k = 0; k < 3; k++) {
    adb('shell', 'uiautomator', 'dump', '/sdcard/anr.xml'); const x = adb('shell', 'cat', '/sdcard/anr.xml');
    if (!/isn.t responding|không phản hồi/i.test(x)) return;
    const b = /text="(?:Wait|Đợi|Chờ)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/.exec(x);
    console.log('ANR hệ thống → bấm Wait'); if (b) adb('shell', 'input', 'tap', String((+b[1] + +b[3]) >> 1), String((+b[2] + +b[4]) >> 1)); await sleep(1500);
  }
};
// App ĐÃ khởi động = bộ định tuyến đã vẽ ≥ 1 lượt (App.routeToken() > 0). KHÔNG dựa vào "#view có con": index.html vẽ sẵn trang chào (#lkHero) trước khi app chạy
// → bộ chạy cũ bắt đầu kịch bản trên khung dựng sẵn, đổi hash khi app chưa có route → "không thấy button.trk-opt" rồi cả chuỗi đỏ theo.
const BOOTED = 'window.App && App.routeToken && App.routeToken() > 0 && document.querySelector("#view") && document.querySelector("#view").children.length';
const booted = async () => { const t0 = Date.now(); const r = await ev(`for (let i = 0; i < 120 && !(${BOOTED}); i++) await new Promise(r => setTimeout(r, 500)); return !!(${BOOTED})`); const ms = Date.now() - t0; if (r !== true) { bad.push(`app không khởi động xong sau ${Math.round(ms / 1000)} s (App.routeToken = 0)`); console.log('✗ app chưa khởi động'); } else if (ms > 15000) console.log(`… app khởi động chậm: ${Math.round(ms / 1000)} s`); return r === true; };
const reload = async () => { await clearAnr(); await cdp('Page.reload', {}); await sleep(3000); await booted(); };
await clearAnr(); await booted();
const LANGS = (process.env.JE_LANGS || 'en,vi,ar').split(',');
for (const l of LANGS) {
  await ev(`localStorage.setItem('vb.uiLang', ${JSON.stringify(l)}); return 1`);
  await ev('await LKJN.reset(); return 1'); await reload();
  for (const f of ['j1a', 'R', 'j1b', 'reset', 'R', 'j2s', 'R', 'j2a', 'R', 'j2b', 'j3a', 'R', 'j3b']) {
    if (f === 'R') { await reload(); continue; }
    await clearAnr();
    const e0 = errs.length, r = await ev(`return await LKJN.${f}()`);
    if (!Array.isArray(r) && !(r && r.__err)) { bad.push(`[${l}] ${f}: kịch bản không trả kết quả (trang tải lại/rời app giữa chừng?)`); console.log(`${l} ${f}: ✗ không có kết quả`); await reload(); continue; }
    if (r && r.__err) bad.push(`[${l}] ${f}: kịch bản dừng ${r.__err}`); else for (const m of r || []) bad.push(`[${l}] ${m}`);
    for (const e of errs.slice(e0)) if (!/ResizeObserver|net::ERR|Failed to load resource/.test(e)) bad.push(`[${l}] ${f} ${e}`);
    ran++; shot(`${l}-${f}`); console.log(`${l} ${f}: ${r && !r.__err && !r.length ? '✓' : '✗ ' + JSON.stringify(r).slice(0, 300)}`);
  }
}
if (ran < 6 * LANGS.length) bad.push(`chỉ chạy ${ran} bước (cần ≥ ${6 * LANGS.length} = ${LANGS.length} ngôn ngữ × ≥ 6 bước) – 0 bài chạy không được tính là xanh`);
const fatal = adb('logcat', '-d', '-v', 'brief').split('\n').filter(x => /FATAL EXCEPTION/.test(x));
if (fatal.length) bad.push('Crash: ' + fatal.slice(0, 2).join(' / '));
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ bad, errs, ran }, null, 1));
console.log(bad.length ? '✗ FAIL Android journey: ' + bad.length + '\n' + bad.join('\n') : '✓ PASS Android journey 1–3 × ' + LANGS.join('/'));
try { ws.close(); } catch (e) { /* */ }
process.exit(bad.length ? 1 : 0);
