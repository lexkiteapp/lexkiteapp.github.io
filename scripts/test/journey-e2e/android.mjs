// journey-e2e trên Android emulator: hành trình 1–3 (native.js) chạy trong WebView của app debug qua Chrome DevTools – vi/en/ar.
// Dùng: node scripts/test/journey-e2e/android.mjs <out-dir>   (cần adb + app com.lexkite.app đã cài; workflow journey-e2e.yml native=1)
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const OUT = path.resolve(process.argv[2] || 'je-android'); fs.mkdirSync(OUT, { recursive: true });
const PKG = 'com.lexkite.app', sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => { try { return execFileSync('adb', a, { encoding: 'utf8', timeout: 60000, maxBuffer: 64 << 20 }); } catch (e) { return 'ERR ' + String(e.stderr || e.message).slice(0, 300); } };
const SRC = ['checks.js', 'native.js'].map(f => fs.readFileSync(new URL('./' + f, import.meta.url), 'utf8')).join('\n;\n');
const bad = [], errs = []; let nShot = 0;
const shot = n => { try { fs.writeFileSync(path.join(OUT, `${String(++nShot).padStart(2, '0')}-${n}.png`), execFileSync('adb', ['exec-out', 'screencap', '-p'], { maxBuffer: 64 << 20, timeout: 30000 })); } catch (e) { /* bỏ qua */ } };
adb('logcat', '-c');
adb('shell', 'monkey', '-p', PKG, '-c', 'android.intent.category.LAUNCHER', '1');
let sock = '';
for (let k = 0; k < 30 && !sock; k++) { await sleep(2000); sock = (/@(webview_devtools_remote_\d+)/.exec(adb('shell', 'cat', '/proc/net/unix')) || [])[1] || ''; }
if (!sock) { console.log('✗ không thấy socket DevTools của WebView'); process.exit(1); }
adb('forward', 'tcp:9222', 'localabstract:' + sock); await sleep(8000);
let pages = []; for (let k = 0; k < 10 && !pages.length; k++) { try { pages = (await (await fetch('http://127.0.0.1:9222/json')).json()).filter(p => p.type === 'page'); } catch (e) { /* chờ */ } if (!pages.length) await sleep(2000); }
const ws = new WebSocket(pages[0].webSocketDebuggerUrl); await new Promise((y, n) => { ws.onopen = y; ws.onerror = n; });
let id = 0; const pend = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); return; }
  if (d.method === 'Runtime.exceptionThrown') errs.push('exception: ' + String(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text).slice(0, 200));
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errs.push('console: ' + d.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200)); };
const cdp = (method, params, ms = 240000) => new Promise(r => { const i = ++id; const tm = setTimeout(() => { pend.delete(i); r({ result: { exceptionDetails: { text: 'cdp timeout' } } }); }, ms); pend.set(i, d => { clearTimeout(tm); r(d); }); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async expr => { const r = await cdp('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true }); if (r.result && r.result.exceptionDetails) return { __err: JSON.stringify(r.result.exceptionDetails).slice(0, 300) }; return r.result && r.result.result ? r.result.result.value : undefined; };
await cdp('Runtime.enable', {}); await cdp('Page.enable', {});
await cdp('Page.addScriptToEvaluateOnNewDocument', { source: SRC });
const reload = async () => { await cdp('Page.reload', {}); await sleep(9000); await ev('for (let i = 0; i < 40 && !(window.App && document.querySelector("#view") && document.querySelector("#view").children.length); i++) await new Promise(r => setTimeout(r, 500)); return 1'); };
await ev(SRC + '; return 1');
for (const l of ['en', 'vi', 'ar']) {
  await ev(`localStorage.setItem('vb.uiLang', ${JSON.stringify(l)}); return 1`);
  await ev('await LKJN.reset(); return 1'); await reload();
  for (const f of ['j1a', 'R', 'j1b', 'j2a', 'R', 'j2b', 'j3a', 'R', 'j3b']) {
    if (f === 'R') { await reload(); continue; }
    const e0 = errs.length, r = await ev(`return await LKJN.${f}()`);
    if (r && r.__err) bad.push(`[${l}] ${f}: kịch bản dừng ${r.__err}`); else for (const m of r || []) bad.push(`[${l}] ${m}`);
    for (const e of errs.slice(e0)) if (!/ResizeObserver|net::ERR|Failed to load resource/.test(e)) bad.push(`[${l}] ${f} ${e}`);
    shot(`${l}-${f}`); console.log(`${l} ${f}: ${r && !r.__err && !r.length ? '✓' : '✗ ' + JSON.stringify(r).slice(0, 300)}`);
  }
}
const fatal = adb('logcat', '-d', '-v', 'brief').split('\n').filter(x => /FATAL EXCEPTION/.test(x));
if (fatal.length) bad.push('Crash: ' + fatal.slice(0, 2).join(' / '));
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ bad, errs }, null, 1));
console.log(bad.length ? '✗ FAIL Android journey: ' + bad.length + '\n' + bad.join('\n') : '✓ PASS Android journey 1–3 × vi/en/ar');
try { ws.close(); } catch (e) { /* */ }
process.exit(bad.length ? 1 : 0);
