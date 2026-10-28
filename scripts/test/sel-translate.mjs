// Test (jsdom) bảng "🌐 Dịch" khi bôi đen câu trong web app / add-on (web/js/phrases.js) – lỗi chủ báo 28/10:
//  (1) bảng kẹt mãi "⏳ Đang dịch “…”…" khi đường dịch treo (Translator trên máy / mạng) → phải hết giờ, tự thử lại, rồi
//      hiện nghĩa từng từ (thư viện trên máy) hoặc lỗi rõ ràng + nút Thử lại; Thử lại thành công → hiện bản dịch;
//  (2) bảng đè lên dòng đọc tiếp theo ("How's it going?") → phải nằm PHÍA TRÊN câu khi đủ chỗ, không đủ → phía dưới, không đè câu.
// KHÔNG mạng, KHÔNG tài khoản thật. Chạy: node scripts/test/sel-translate.mjs
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import jsdom from 'jsdom';
const require = createRequire(import.meta.url);
const { JSDOM } = jsdom;
const WEB = 'web';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const html = fs.readFileSync(path.join(WEB, 'app', 'index.html'), 'utf8');
const scripts = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
const css = fs.readFileSync(path.join(WEB, 'css/style.css'), 'utf8');
const vc = new jsdom.VirtualConsole(); vc.on('jsdomError', e => { if (!/Not implemented|Could not parse CSS/.test(e.message)) console.error(e.message); });
const dom = new JSDOM(html.replace(/<!--hero-->[\s\S]*?<!--\/hero-->/, '').replace(/<script(?: defer)? src="[^"]+"><\/script>/g, '').replace(/<link[^>]+>/g, '').replace('</head>', `<style>${css}</style></head>`), { url: 'http://localhost/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole: vc });
const w = dom.window, errors = [];
w.addEventListener('error', e => errors.push(e.message));
w.console.error = (...a) => errors.push(a.join(' '));
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {} });
w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = (s, r = w.document) => r.querySelector(s);
const until = async (f, ms = 3000) => { const t0 = Date.now(); while (!f() && Date.now() - t0 < ms) await tick(20); return f(); };
await tick(300);

// Bố cục giả lập: jsdom không tính kích thước → vùng chọn ở y=400..420, bảng cao 200, thanh nút cao 36
let RECT = { top: 400, bottom: 420, left: 100, right: 500, width: 400, height: 20 };
w.Range.prototype.getBoundingClientRect = () => RECT;
Object.defineProperty(w.HTMLElement.prototype, 'offsetHeight', { configurable: true, get() { return this.classList.contains('sel-pop') ? 200 : this.classList.contains('sel-bar') ? 36 : 0; } });
Object.defineProperty(w.HTMLElement.prototype, 'offsetWidth', { configurable: true, get() { return this.classList.contains('sel-pop') ? 360 : this.classList.contains('sel-bar') ? 120 : 0; } });
const LINES = ['Hi! I’m Lina. I live next door.', 'Hi, Lina. I’m Sam. Nice to meet you.', 'Nice to meet you too. How’s it going?'];
const view = $('#view');
const selectLine = async i => {
  view.innerHTML = `<div class="cf-dlg">${LINES.map(x => `<p>${x}</p>`).join('')}</div>`;
  const p = view.querySelectorAll('p')[i], rg = w.document.createRange(); rg.selectNodeContents(p);
  const s = w.getSelection(); s.removeAllRanges(); s.addRange(rg);
  w.document.dispatchEvent(new w.MouseEvent('mouseup', { bubbles: true })); await tick(40);
};
const pop = () => $('.sel-pop'), bar = () => $('.sel-bar');
const clickTr = async () => { const b = bar().querySelector('[data-act=tr]'); b.click(); await tick(10); };

// ===== (1) Đường dịch TREO mãi → hết giờ + 3 lượt thử, nghĩa từng từ + Thử lại =====
w.App.trTimeoutMs = 40; w.App.trBackoffMs = 5;
let calls = 0, mode = 'hang';
w.Dict.translateVi = w.Dict.translateTo = () => { calls++; return mode === 'hang' ? new Promise(() => {}) : Promise.resolve('Chào Lina. Mình là Sam. Rất vui được gặp bạn.'); };
await selectLine(1);
ok(bar() && !bar().hidden && bar().querySelector('[data-act=tr]'), 'bôi đen cả câu → thanh có nút 🌐 Dịch');
await clickTr();
ok(/Đang dịch/.test(pop().textContent), 'đang chờ → hiện "Đang dịch…" (tạm thời)');
const done = await until(() => pop().querySelector('[data-retry]'), 2000);
ok(done, 'yêu cầu treo → KHÔNG kẹt "Đang dịch…": sau hạn giờ hiện kết quả dự phòng + nút Thử lại');
ok(calls === 3, `tự thử lại 3 lượt có giãn cách (được ${calls})`);
ok(!/Đang dịch/.test(pop().textContent), 'không còn dòng "Đang dịch…" sau khi hết giờ');
const fail = pop().querySelector('[data-fail]');
ok(fail && fail.getAttribute('role') === 'alert', 'khối lỗi có role="alert" (trình đọc màn hình báo)');
ok(/nghĩa từng từ/.test(fail.textContent) && /meet/.test(fail.textContent), `dự phòng: nghĩa từng từ từ thư viện trên máy (${fail.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)})`);
ok(pop().querySelector('[data-sp]') && pop().querySelector('[data-deep]'), 'các nút Nghe / Giải thích sâu vẫn dùng được');
// Thử lại thành công → bản dịch thay khối lỗi
mode = 'ok'; pop().querySelector('[data-retry]').click();
ok(await until(() => /Rất vui được gặp bạn/.test(pop().textContent), 1500), 'bấm Thử lại → hiện bản dịch');
ok(!pop().querySelector('[data-fail]') && !pop().querySelector('[data-retry]'), 'dịch được → bỏ khối lỗi + nút Thử lại');

// ===== (2) Vị trí: không che dòng đọc tiếp theo =====
const top = () => parseFloat(pop().style.top), bottom = () => top() + 200;
ok(bottom() <= RECT.top, `đủ chỗ phía trên → bảng nằm TRÊN câu đang chọn (đáy ${bottom()} ≤ ${RECT.top}), không đè "How’s it going?"`);
// Câu sát mép trên → không đủ chỗ phía trên → xuống dưới, không đè chính câu
RECT = { top: 60, bottom: 80, left: 100, right: 500, width: 400, height: 20 };
await selectLine(1); await clickTr(); await until(() => pop().querySelector('[data-tr]'), 1500);
ok(top() >= RECT.bottom, `mép trên chật → bảng nằm DƯỚI câu (top ${top()} ≥ ${RECT.bottom})`);
// Cả hai phía đều chật → thu chiều cao (cuộn trong bảng), không đè lên câu
w.innerHeight = 300; RECT = { top: 140, bottom: 160, left: 100, right: 500, width: 400, height: 20 };
await selectLine(1); await clickTr(); await until(() => pop().querySelector('[data-tr]'), 1500);
const mh = parseFloat(pop().style.maxHeight);
ok(mh > 0 && (top() + mh <= RECT.top || top() >= RECT.bottom), `hai phía chật → giới hạn chiều cao ${mh}px, không đè câu đang chọn (top ${top()})`);
w.innerHeight = 768;
// Bảng dùng màu theo theme (không tô nền sáng cố định → đúng chế độ tối)
ok(!/background\s*:\s*#fff/i.test(pop().getAttribute('style') || ''), 'bảng không ép nền trắng (theo theme sáng/tối)');

// ===== (3) Bấm chỗ khác giữa chừng → kết quả cũ không bật lại bảng đã đóng =====
mode = 'hang'; calls = 0;
await selectLine(1); await clickTr();
w.document.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true }));
await tick(300);
ok(pop().hidden, 'đóng bảng trong lúc chờ → không tự mở lại khi hết giờ');

const bad = errors.filter(e => !/Not implemented|Could not parse CSS|i18n|fetch/i.test(e));
ok(!bad.length, 'không lỗi JS: ' + bad.slice(0, 3).join(' | '));
console.log(fails ? `✗ sel-translate: ${fails}/${n} lỗi` : `✓ sel-translate: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
