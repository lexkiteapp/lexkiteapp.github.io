// Test shim window.AI (ai.js tải lười, 17/11): ai.js không nằm trong khung app; mọi `AI.<hàm>` mà mã người học gọi phải có trên shim; hàm bất đồng bộ tải gói 'ai' rồi gọi bản thật; hàm đồng bộ an toàn khi chưa tải.
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { SCAN_ROOTS } from '../lib/scan-roots.mjs';
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} ${m}`); if (!c) { bad++; process.exitCode = 1; } };
const app = fs.readFileSync('web/js/app.js', 'utf8'), a = app.indexOf('  { const real = m => (...a) => App.need(\'ai\')'), b = app.indexOf('\n', app.indexOf('localOn: () => false }; }', a));
ok(a > 0 && b > a, 'app.js có shim window.AI');
const code = app.slice(a, b), keys = new Set([...code.matchAll(/\b(\w+): (?:real\(|f =>|\(el|e =>|\(\) =>)/g)].map(m => m[1]));
ok(!/js\/ai\.js/.test(fs.readFileSync('web/app/index.html', 'utf8')) && !/\/js\/ai\.js/.test(fs.readFileSync('web/sw.js', 'utf8').match(/const SHELL = \[[\s\S]*?\];/)[0]), 'ai.js không còn trong index.html và SHELL (khung app)');
ok(/ai: \['js\/ai\.js'\]/.test(app), "BUNDLES có gói 'ai'");
// mọi AI.<hàm> được dùng ngoài ai.js phải có trên shim
const used = new Map(), walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js') && p !== 'web/js/ai.js' && !/\/i18n\//.test(p)) for (const m of fs.readFileSync(p, 'utf8').matchAll(/(?<![\w.$])AI\.(\w+)/g)) used.set(m[1], p); } };
for (const r of SCAN_ROOTS) walk(r);
const missing = [...used].filter(([k]) => !keys.has(k) && !['_p', '_shim'].includes(k));
ok(!missing.length, `mọi AI.<hàm> mã người học gọi (${[...used.keys()].sort().join(', ')}) có trên shim${missing.length ? ' – thiếu: ' + missing.map(m => m.join('@')).join(', ') : ''}`);
// chạy shim
const calls = []; let loaded = 0;
const win = {}; const App = { need: async n => { loaded++; calls.push(n); win.AI = { getKey: async () => 'KEY', attach: (el, f) => calls.push('attach:' + el), errText: e => 'real:' + e.message, nanoStatus: async () => 'ready' }; } };
vm.runInNewContext(code, { App, window: win });
ok(win.AI && win.AI._shim === true, 'window.AI truthy ngay khi khởi động (mọi `window.AI &&` vẫn đúng)');
ok(win.AI.errText(new Error('x')) === 'x' && win.AI.badge() === '', 'hàm đồng bộ an toàn khi chưa tải');
const k = await win.AI.getKey();
ok(k === 'KEY' && loaded === 1 && calls[0] === 'ai', "AI.getKey() tải gói 'ai' rồi gọi bản thật");
ok(win.AI._shim !== true && win.AI.errText(new Error('x')) === 'real:x', 'sau khi tải: window.AI là bản thật (ai.js ghi đè)');
win.AI.attach('el', () => {}); ok(calls.includes('attach:el'), 'bản thật nhận attach sau khi tải');
// tải lỗi (ai.js không ghi đè) → không lặp vô hạn
const win2 = {}; vm.runInNewContext(code, { App: { need: async () => {} }, window: win2 });
let err = ''; try { await win2.AI.getKey(); } catch (e) { err = e.message; }
ok(err === 'AI_LOAD', 'tải lỗi → ném AI_LOAD, không đệ quy');
