// 🪟 Màn học mở thẳng từ link: script đầu trang (web/app/index.html, data-lkf) phải khớp ExitGuard, nếu không sidebar vẽ rồi mới ẩn = nhảy bố cục (CLS). Add-on không có script nội tuyến.
import fs from 'node:fs'; import { JSDOM } from 'jsdom';
let fails = 0; const ok = (c, m) => { if (c) return; fails++; console.error('✗ ' + m); };
const html = fs.readFileSync('web/app/index.html', 'utf8'), code = /<script data-lkf>([\s\S]*?)<\/script>/.exec(html);
ok(code && html.indexOf('data-lkf') < html.indexOf('</head>'), 'script nằm trong <head>, trước khung vẽ đầu');
const early = (hash, store = {}) => { const w = new JSDOM('<!doctype html><html></html>', { url: 'https://x.test/app/' + hash, runScripts: 'outside-only' }).window; for (const k in store) w.localStorage.setItem(k, store[k]); w.eval(code[1]); return w.document.documentElement.classList.contains('lk-fo'); };
const w = new JSDOM('<!doctype html><html><body><main id="view"></main></body></html>', { url: 'https://x.test/app/', runScripts: 'outside-only', pretendToBeVisual: true }).window;
w.eval(fs.readFileSync('web/js/exit-guard.js', 'utf8'));
const E = w.ExitGuard;
for (const r of E.ALWAYS) if (r !== 'review') ok(early(`#/${r}`), `${r}: thiếu trong script đầu trang`);
for (const r of E.WITH_ARG) { const a = r === 'lesson' ? 'go' : 'x1'; ok(early(`#/${r}/${a}`) === E.isLearn(r, a, ''), `${r}/${a}: lệch ExitGuard`); ok(!early(`#/${r}`) || E.ALWAYS.includes(r), `${r} không tham số không phải màn học`); }
for (const r of E.NOT_LEARN) ok(!early(`#/${r}`), `${r}: trang trung tâm không được ẩn khung`);
ok(early('#/listen/t1p1?ux1=1'), 'màn nghe có query'); ok(early('#/review'), 'phiên ôn'); ok(!early('#/review?hub=1'), 'trung tâm Ôn'); ok(!early('#/practice/mix'), 'practice/mix'); ok(!early('#/lesson'), 'bản đồ bài học'); ok(!early(''), 'trang chủ');
ok(!early('#/listen/t1p1', { 'lk.exitbar': '0' }), 'tôn trọng lk.exitbar=0'); ok(!early('#/listen/t1p1?exitbar=0'), 'tôn trọng ?exitbar=0');
const app = fs.readFileSync('web/js/app.js', 'utf8'); ok(/ExitGuard\.focusFor\(name, arg, query\.toString\(\)\)\)\)\); document\.documentElement\.classList\.remove\('lk-fo'\)/.test(app), 'route() giữ focus cho màn học và gỡ lk-fo');
ok(fs.readFileSync('scripts/build-extension.sh', 'utf8').includes('data-lkf') && !fs.readFileSync('extension/app/index.html', 'utf8').includes('data-lkf'), 'add-on bỏ script nội tuyến (CSP MV3)');
if (fails) { console.error(fails + ' lỗi'); process.exit(1); } console.log('✓ focus-early: script đầu trang khớp ExitGuard'); process.exit(0);
