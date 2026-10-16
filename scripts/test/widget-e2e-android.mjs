// Kiểm thử widget Android toàn trình trên emulator (CI android.yml, job widget-e2e) – APK debug đã cài sẵn.
// 1) JS thật (VBNative.widget trong WebView, qua Chrome DevTools Protocol) → plugin WidgetBridge → widget gắn bằng AppWidgetHost hiện đúng từ
// 2) Đổi dữ liệu (broadcast debug, cùng đường ghi LexkiteWidget.save) → widget tự vẽ lại
// 3) Chạm widget (adb input tap) → PendingIntent → app mở location.hash = #/review?w=từ
import { execFileSync } from 'node:child_process';
const PKG = 'com.lexkite.app', CLS = 'com.vocaband.app';
const adb = (...a) => execFileSync('adb', a, { encoding: 'utf8' });
const sh = cmd => adb('shell', cmd);
const shot = n => { try { execFileSync('sh', ['-c', `mkdir -p shots && adb exec-out screencap -p > shots/android-${n}.png`]); } catch (e) { /* ảnh chỉ để xem */ } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (ok, msg) => { console.log(`${ok ? '✓' : '✗'} ${msg}`); if (!ok) fails++; };
async function until(fn, ms = 20000, step = 1000) { const t = Date.now(); for (;;) { const v = await fn().catch(() => null); if (v || Date.now() - t > ms) return v; await sleep(step); } }

// --- WebView DevTools (bản debug bật sẵn) ---
async function cdp(expr) {
  const sock = await until(async () => (sh('cat /proc/net/unix').match(/@(webview_devtools_remote_\d+)/) || [])[1], 30000);
  if (!sock) throw new Error('không thấy webview_devtools_remote');
  adb('forward', 'tcp:9222', 'localabstract:' + sock);
  const pages = await until(async () => { const j = await (await fetch('http://127.0.0.1:9222/json/list')).json(); return j.filter(p => p.type === 'page').length ? j : null; }, 20000);
  const ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((r, e) => { ws.onopen = r; ws.onerror = e; });
  const res = await new Promise(r => { ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) r(d); }; ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expr, awaitPromise: true, returnByValue: true } })); });
  ws.close();
  return res.result && res.result.result ? res.result.result.value : undefined;
}
// --- Đọc giao diện (uiautomator) ---
function dump() { sh('uiautomator dump /sdcard/ui.xml >/dev/null'); return sh('cat /sdcard/ui.xml'); }
const widgetText = async word => until(async () => dump().includes(`text="${word}"`) || null, 15000);

// 0) Mở app, chờ web app sẵn sàng
sh(`am start -W -n ${PKG}/${CLS}.MainActivity`);
const ready = await until(() => cdp('!!(window.VBNative && window.Core && document.readyState === "complete")'), 60000, 2000);
check(ready, 'app đã nạp web (VBNative, Core)');

// 1) Đường JS thật: VBNative.widget(state, chuỗi) → snapshot → WidgetBridge.update
const js = await cdp(`(async () => { const now = Date.now();
  const cards = { zephyr: { word: 'zephyr', ipa: '/ˈzef.ər/', vi: 'gió tây nhẹ', level: 'c2', srs: { reps: 2, last: now - 864e5, due: now - 1000 } } };
  VBNative.widget({ cards, settings: Core.DEFAULT_SETTINGS, stats: { days: {}, newToday: { day: '', n: 0 } } }, 9);
  await new Promise(r => setTimeout(r, 2500)); return 'ok'; })()`);
check(js === 'ok', 'JS gọi VBNative.widget');
sh(`appwidget grantbind --package ${PKG} --user 0`);
sh(`am start -W -n ${PKG}/${CLS}.WidgetHostActivity`);
check(!sh('logcat -d -s LexWidgetTest:E').includes('BIND_FAILED'), 'gắn widget vào AppWidgetHost');
check(await widgetText('zephyr'), 'widget hiện từ đến hạn do JS ghi (zephyr)');
check(dump().includes('🔥 9'), 'widget hiện chuỗi ngày 🔥 9');

// 2) Đổi dữ liệu → widget tự vẽ lại
sh(`am broadcast -a ${PKG}.WIDGET_TEST -n ${PKG}/${CLS}.WidgetTestReceiver --es word quokka --ei due 7`);
check(await widgetText('quokka'), 'đổi dữ liệu → widget cập nhật (quokka)');
check(dump().includes('7 to review'), 'số thẻ cập nhật (7 to review)');
shot('widget-e2e-1-host');

// 3) Chạm widget → app mở đúng thẻ
const m = dump().match(new RegExp(`resource-id="${PKG}:id/widget_root"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`));
check(m, 'tìm thấy widget trên màn hình');
if (m) {
  sh(`input tap ${(+m[1] + +m[3]) >> 1} ${(+m[2] + +m[4]) >> 1}`);
  const hash = await until(async () => { const h = await cdp('location.hash'); return h === '#/review?w=quokka' ? h : null; }, 20000, 1500);
  shot('widget-e2e-2-after-tap');
  check(hash, `chạm widget → location.hash = #/review?w=quokka (nhận: ${hash || await cdp('location.hash').catch(() => '?')})`);
}
console.log(fails ? `✗ widget e2e: ${fails} lỗi` : '✓ widget e2e Android: tất cả đạt');
process.exit(fails ? 1 : 0);
