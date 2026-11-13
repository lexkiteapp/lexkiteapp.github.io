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
// Máy ảo CI KHÔNG có Play Store (com.android.vending): plugin AppUpdate.getAppUpdateInfo từ chối "Failed to bind to the service" → Capacitor ghi console.error(Object) (13/11: gốc 'console: Object' ở j1a/j2s, có cả trước bản 1.1).
// Chỉ bỏ qua dạng lỗi đó KHI logcat xác nhận đúng nguyên nhân; Error thật có chữ ('exception:', 'console: TypeError…') vẫn làm đỏ.
let _noStore; const noStore = () => _noStore ??= /Sending plugin error:.*"pluginId":"AppUpdate".*Failed to bind to the service/.test(adb('logcat', '-d', '-v', 'brief'));
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
const ONLY_KBD = process.env.JE_ONLY_KBD === '1'; // chỉ đo bàn phím thật cho ngôn ngữ này (không chạy hành trình): leg 'ar-kbd' – leg ar đủ hành trình bị emulator chết sau j1a (13/11)
for (const l of LANGS) {
  await ev(`localStorage.setItem('vb.uiLang', ${JSON.stringify(l)}); return 1`);
  await ev('await LKJN.reset(); return 1'); await reload();
  for (const f of ONLY_KBD ? [] : ['j1a', 'R', 'j1b', 'reset', 'R', 'j2s', 'R', 'j2a', 'R', 'j2b', 'j3a', 'R', 'j3b']) {
    if (f === 'R') { await reload(); continue; }
    await clearAnr();
    const e0 = errs.length, r = await ev(`return await LKJN.${f}()`);
    if (!Array.isArray(r) && !(r && r.__err)) { bad.push(`[${l}] ${f}: kịch bản không trả kết quả (trang tải lại/rời app giữa chừng?)`); console.log(`${l} ${f}: ✗ không có kết quả`); await reload(); continue; }
    if (r && r.__err) bad.push(`[${l}] ${f}: kịch bản dừng ${r.__err}`); else for (const m of r || []) bad.push(`[${l}] ${m}`);
    for (const e of errs.slice(e0)) if (!/ResizeObserver|net::ERR|Failed to load resource/.test(e) && !(e === 'console: Object' && noStore())) bad.push(`[${l}] ${f} ${e}`);
    ran++; shot(`${l}-${f}`); console.log(`${l} ${f}: ${r && !r.__err && !r.length ? '✓' : '✗ ' + JSON.stringify(r).slice(0, 300)}`);
  }
}
// Bàn phím THẬT (Gboard trên emulator): chạm thật vào ô → chờ IME hiện → ô đang focus phải nằm TRỌN trên mép bàn phím (đo bằng toạ độ màn hình:
// khung WebView từ uiautomator + khung cửa sổ InputMethod từ dumpsys). Cùng luật với scripts/test/mobile-qa-keyboard.mjs (giả lập), đây là bản đo thật.
const imeShown = () => /mInputShown=true/.test(adb('shell', 'dumpsys', 'input_method'));
const imeTop = () => { // mép trên bàn phím (px màn hình): nguồn inset IME đang hiện (Android 11+); dự phòng khung cửa sổ InputMethod nếu nằm nửa dưới màn
  const d = adb('shell', 'dumpsys', 'window');
  for (const m of d.matchAll(/InsetsSource[^\n]*?type=ime[^\n]*?frame=\[(\d+),(\d+)\]\[(\d+),(\d+)\][^\n]*?visible=true/g)) if (+m[2] > 0) return +m[2];
  const w = /Window\{[^}]*InputMethod\}[\s\S]{0,4000}?(?:mFrame|frame)=\[(\d+),(\d+)\]\[(\d+),(\d+)\]/.exec(d); return w && +w[2] > +w[4] / 3 ? +w[2] : 0; };
// uiautomator dump đôi khi trả cây KHÔNG có WebView (cửa sổ khác đang trước: hộp thoại ANR/hệ thống) → xoá hộp thoại, chờ, thử lại 5 lần.
// KHÔNG đoán toạ độ từ kích thước màn (13/11: gốc WebView ≠ 0 → chạm trượt, bàn phím không mở = đo sai). Hết cách → đỏ kèm lớp/cửa sổ thấy được + lưu kb.xml làm bằng chứng.
const WV = /class="android\.webkit\.WebView"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/;
const webBox = async () => {
  let x = '';
  for (let t = 0; t < 8; t++) {
    adb('shell', 'rm', '-f', '/sdcard/kb.xml'); const o = adb('shell', 'uiautomator', 'dump', '/sdcard/kb.xml'); x = adb('shell', 'cat', '/sdcard/kb.xml');
    const m = WV.exec(x); if (m) return m.slice(1).map(Number);
    const pk = [...new Set([...x.matchAll(/package="([^"]+)"/g)].map(m => m[1]))].join(','), cl = [...new Set([...x.matchAll(/class="([^"]+)"/g)].map(m => m[1].split('.').pop()))].slice(0, 8).join(',');
    const tx = [...x.matchAll(/ text="([^"]+)"/g)].map(m => m[1]).join(' | ').slice(0, 200);
    console.log(`uiautomator dump lần ${t + 1}: không có WebView · package=${pk || '–'} · lớp=${cl || '–'} · chữ: ${tx || '–'} · ${String(o).trim().slice(0, 60)}`);
    if (t === 0) { try { shot('kbd-khong-thay-webview'); fs.writeFileSync(path.join(OUT, 'kb-no-webview-0.xml'), x); } catch (e) { /* */ } } // ảnh + cây UI ngay lần đầu: hộp thoại gì đang che?
    await clearAnr(); await sleep(3000);
  }
  try { fs.writeFileSync(path.join(OUT, 'kb-no-webview.xml'), x); } catch (e) { /* */ }
  return null;
};
let kbRan = 0;
for (const [route, css] of [['write', '#essay'], ['dict', '#q'], ['home', '#gq']]) {
  await clearAnr();
  const pos = await ev(`location.hash = '#/${route}'; for (let i = 0; i < 20 && !document.querySelector(${JSON.stringify(css)}); i++) await new Promise(r => setTimeout(r, 400));
    const el = document.querySelector(${JSON.stringify(css)}); if (!el || el.getBoundingClientRect().width < 2) return null; el.scrollIntoView({ block: 'nearest' }); await new Promise(r => setTimeout(r, 300));
    const b = el.getBoundingClientRect(), x = b.left + Math.min(b.width / 2, 40), y = b.top + Math.min(b.height / 2, 20), h = y >= 0 && y < innerHeight && document.elementFromPoint(x, y);
    return { x, y, dpr: devicePixelRatio, ih: innerHeight, hit: !!h && (h === el || el.contains(h) || h.contains(el)) }`);
  if (!pos || pos.__err) { bad.push(`[bàn phím] #/${route}: không thấy ô ${css}`); continue; }
  if (!pos.hit) { console.log(`bàn phím #/${route}: ${css} không chạm tới được khi chưa có bàn phím (ẩn/che) – bỏ qua`); continue; }
  const wb = await webBox(); if (!wb) { bad.push('[bàn phím] không đọc được khung WebView (uiautomator)'); break; }
  const sx = wb[0] + pos.x * pos.dpr, sy = wb[1] + pos.y * pos.dpr;
  adb('shell', 'input', 'tap', String(Math.round(sx)), String(Math.round(sy)));
  let shown = false; for (let k = 0; k < 16 && !(shown = imeShown()); k++) await sleep(500);
  await sleep(1200); // WebView/app phản ứng (resize, cuộn)
  const kTop = imeTop();
  const st = await ev(`const el = document.activeElement, vv = visualViewport, b = el && el.getBoundingClientRect();
    return el && el.matches(${JSON.stringify(css)}) ? { top: b.top, h: b.height, vt: vv.offsetTop, vh: vv.height, sc: vv.scale, ih: innerHeight } : { lost: el ? el.tagName + (el.id ? '#' + el.id : '') : 'null' }`);
  shot(`kbd-${route}`);
  if (!shown) { const sb = /InsetsSource[^\n]*?type=statusBars[^\n]*?frame=\[\d+,\d+\]\[\d+,(\d+)\]/.exec(adb('shell', 'dumpsys', 'window')); const ae = await ev('const a = document.activeElement; return a ? a.tagName + (a.id ? "#" + a.id : "") : "null"');
    bad.push(`[bàn phím] #/${route}: chạm ${css} không mở bàn phím (mInputShown=false) – chạm ở ${Math.round(sx)},${Math.round(sy)} px màn hình, thanh trạng thái tới ${sb ? sb[1] : '?'} px, activeElement ${ae}`); }
  else if (!st || st.__err || st.lost) bad.push(`[bàn phím] #/${route}: ${css} mất focus sau khi mở bàn phím (${st && (st.lost || st.__err)})`);
  else {
    const head = Math.min(st.h, 48), yTop = wb[1] + (st.top - st.vt) * st.sc * pos.dpr, yHead = wb[1] + (st.top + head - st.vt) * st.sc * pos.dpr;
    const edge = kTop || wb[1] + (st.vt + st.vh) * st.sc * pos.dpr; // không đọc được khung IME → dùng mép dưới visualViewport
    if (yTop < wb[1] - 2 || yHead > edge + 2) bad.push(`[bàn phím] #/${route}: ${css} bị bàn phím che – ô ${Math.round(yTop)}–${Math.round(yHead)} px màn hình, mép bàn phím ${Math.round(edge)} px (WebView ${wb[1]}–${wb[3]}, visualViewport ${Math.round(st.vh)}/${st.ih} css px)`);
    console.log(`bàn phím #/${route}: ô ${Math.round(yTop)}–${Math.round(yHead)} · mép IME ${kTop || '?'} · vv ${Math.round(st.vh)}/${st.ih} (trước khi mở: ${pos.ih})`);
    kbRan++;
  }
  if (imeShown()) adb('shell', 'input', 'keyevent', 'KEYCODE_BACK'); await sleep(600);
  await ev('document.activeElement && document.activeElement.blur(); return 1');
}
if (kbRan < 2) bad.push(`[bàn phím] chỉ đo được ${kbRan}/3 ô trên bàn phím thật (cần ≥ 2: Phòng viết + tra từ)`);
if (!ONLY_KBD && ran < 6 * LANGS.length) bad.push(`chỉ chạy ${ran} bước (cần ≥ ${6 * LANGS.length} = ${LANGS.length} ngôn ngữ × ≥ 6 bước) – 0 bài chạy không được tính là xanh`);
// 'FATAL EXCEPTION: UiAutomation' = tiến trình `uiautomator dump` của CHÍNH bài đo (AccessibilityCache, binder 'Bad file descriptor') chết, không phải app (13/11 en) – chỉ loại luồng đó; mọi crash khác (main, …) vẫn làm đỏ.
const fatal = adb('logcat', '-d', '-v', 'brief').split('\n').filter(x => /FATAL EXCEPTION/.test(x) && !/FATAL EXCEPTION: UiAutomation\b/.test(x));
if (fatal.length) bad.push('Crash: ' + fatal.slice(0, 2).join(' / '));
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ bad, errs, ran }, null, 1));
console.log(bad.length ? '✗ FAIL Android journey: ' + bad.length + '\n' + bad.join('\n') : '✓ PASS Android journey 1–3 × ' + LANGS.join('/'));
try { ws.close(); } catch (e) { /* */ }
process.exit(bad.length ? 1 : 0);
