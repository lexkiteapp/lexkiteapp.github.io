// Test (jsdom) bảng "🌐 Dịch" khi bôi đen câu trong web app / add-on (web/js/phrases.js) – lỗi chủ báo 28/10:
//  (1) bảng kẹt mãi "⏳ Đang dịch “…”…" khi đường dịch treo (Translator trên máy / mạng) → khung tạm + nghĩa từng từ hiện NGAY, hết ngân sách
//      (một lượt, các nguồn song song – web/js/tr-fast.js) thì nghĩa từng từ + nút Thử lại; bản đến muộn tự thay; Thử lại thành công → hiện bản dịch;
//  (2) 01/11: bảng che mất ĐỊNH NGHĨA phía trên câu ví dụ → bảng nằm DƯỚI câu khi đủ chỗ, thiếu → lật lên trên, hai phía chật → thu chiều cao; khổ 390 không tràn;
//  (3) đóng (✕ / Esc / bấm ra ngoài) hoặc chọn câu khác giữa chừng → hủy yêu cầu, kết quả cũ không bật lại / không ghi vào bảng mới.
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
const css = (fs.readFileSync(path.join(WEB, 'css/style.css'), 'utf8') + fs.readFileSync(path.join(WEB, 'css/lazy-ui.css'), 'utf8'));
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
w.eval(fs.readFileSync(path.join(WEB, 'js/tr-fast.js'), 'utf8')); // tải lười trong app thật (phrases.js chèn thẻ script)
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

// ===== (1) Đường dịch TREO mãi → khung tạm + nghĩa từng từ ngay, hết ngân sách → Thử lại (không kẹt) =====
const BUDGET = 300; w.App.trBudgetMs = BUDGET;
w.I18N.learnLang = () => 'vi'; // người học Việt (localhost mặc định en → không dịch EN→EN)
let calls = 0, mode = 'hang', lastSig = null;
const VI_OK = 'Chào Lina. Mình là Sam. Rất vui được gặp bạn.';
w.Dict.translateVi = w.Dict.translateTo = (text, ...a) => { calls++; const o = a.find(x => x && typeof x === 'object') || {}; lastSig = o.signal || null;
  return mode === 'hang' ? new Promise(() => {}) : mode === 'late' ? new Promise(r => setTimeout(() => r(VI_OK), BUDGET + 250)) : mode === 'other' ? new Promise(r => setTimeout(() => r('BẢN CŨ'), 150)) : Promise.resolve(VI_OK); };
await selectLine(1);
ok(bar() && !bar().hidden && bar().querySelector('[data-act=tr]'), 'bôi đen cả câu → thanh có nút 🌐 Dịch');
const t0 = Date.now(); await clickTr();
const busy = pop().querySelector('[data-busy]');
ok(busy && busy.getAttribute('aria-busy') === 'true' && pop().querySelector('.skel'), 'bấm Dịch → khung tạm (skeleton) ngay, không phải đồng hồ cát');
ok(/Đang dịch/.test((pop().querySelector('[role=status]') || {}).getAttribute?.('aria-label') || ''), 'khung tạm có role=status "Đang dịch…" cho trình đọc màn hình');
ok(!/⏳/.test(pop().textContent) && !!pop().querySelector('[data-x]'), 'không còn ⏳; có nút đóng ✕ ngay từ đầu');
ok(/meet/.test(busy.textContent), `nghĩa từng từ hiện ngay làm bản tạm (${busy.textContent.replace(/\s+/g, ' ').trim().slice(0, 70)})`);
const done = await until(() => pop().querySelector('[data-retry]'), 2000), el = Date.now() - t0;
ok(done && el < BUDGET + 400, `yêu cầu treo → hết ngân sách (${el} ms) hiện nghĩa từng từ + nút Thử lại, không kẹt`);
ok(calls === 1, `một lượt duy nhất (các nguồn song song bên trong), không thử nối tiếp 3 lượt (được ${calls})`);
ok(!pop().querySelector('[data-busy]'), 'hết giờ → bỏ khung tạm');
const fail = pop().querySelector('[data-fail]');
ok(fail && fail.getAttribute('role') === 'alert', 'khối lỗi có role="alert" (trình đọc màn hình báo)');
ok(/nghĩa từng từ/.test(fail.textContent) && /meet/.test(fail.textContent), `dự phòng: nghĩa từng từ từ thư viện trên máy (${fail.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)})`);
ok(pop().querySelector('[data-sp]') && pop().querySelector('[data-deep]'), 'các nút Nghe / Giải thích sâu vẫn dùng được');
mode = 'ok'; pop().querySelector('[data-retry]').click();
ok(pop().querySelector('[data-busy]'), 'bấm Thử lại → khung tạm trong lúc chờ');
ok(await until(() => /Rất vui được gặp bạn/.test(pop().textContent), 1500), 'Thử lại → hiện bản dịch');
ok(!pop().querySelector('[data-fail]') && !pop().querySelector('[data-retry]'), 'dịch được → bỏ khối lỗi + nút Thử lại');
// Bản đến MUỘN (sau ngân sách) → tự thay nghĩa từng từ, không cần bấm
mode = 'late'; w.TrFast._mem.clear(); await selectLine(0); await clickTr();
ok(await until(() => pop().querySelector('[data-retry]'), 1500), 'mạng chậm hơn ngân sách → Thử lại hiện đúng hạn');
ok(await until(() => /Rất vui được gặp bạn/.test(pop().textContent), 1500) && !pop().querySelector('[data-retry]'), 'bản dịch đến muộn → tự thay vào bảng');
// Lần 2 cùng câu → bộ nhớ, tức thì
calls = 0; await selectLine(0); await clickTr(); await tick(20);
ok(/Rất vui được gặp bạn/.test(pop().textContent) && calls === 0, 'cùng câu lần 2 → bộ đệm, hiện tức thì, không gọi mạng');

// Lỗi gốc 01/11: gói 'struct' của App.need hỏng (ném lỗi đồng bộ), structures.js chưa nạp → bảng vẫn phải hiện bản dịch, không kẹt khung tạm
{ const VB = w.VBStruct, need = w.App.need; delete w.VBStruct; w.App.need = () => { throw new TypeError("Cannot read properties of undefined (reading 'map')"); };
  mode = 'ok'; w.TrFast._mem.clear(); await selectLine(1); await clickTr();
  ok(await until(() => /Rất vui được gặp bạn/.test(pop().textContent), 1500) && !pop().querySelector('[data-busy]'), 'App.need hỏng + chưa có VBStruct → bản dịch vẫn hiện, không kẹt');
  ok(pop().querySelector('[data-st]'), 'chỗ chèn "Cấu trúc trong đoạn" có sẵn (điền khi structures.js nạp xong)');
  w.VBStruct = VB; w.App.need = need; }

// ===== (2) Vị trí: DƯỚI câu, không che định nghĩa phía trên =====
mode = 'ok'; w.TrFast._mem.clear();
const top = () => parseFloat(pop().style.top), bottom = () => top() + 200, left = () => parseFloat(pop().style.left);
await selectLine(1); await clickTr(); await until(() => pop().querySelector('[data-tr]:not([data-busy])'), 1500);
ok(top() >= RECT.bottom, `đủ chỗ phía dưới → bảng nằm DƯỚI câu (top ${top()} ≥ ${RECT.bottom}), phần định nghĩa phía trên không bị che`);
RECT = { top: 600, bottom: 620, left: 100, right: 500, width: 400, height: 20 };
await selectLine(1); await clickTr(); await until(() => pop().querySelector('[data-tr]:not([data-busy])'), 1500);
ok(bottom() <= RECT.top, `sát mép dưới → tự lật lên trên (đáy ${bottom()} ≤ ${RECT.top})`);
w.innerHeight = 300; RECT = { top: 140, bottom: 160, left: 100, right: 500, width: 400, height: 20 };
await selectLine(1); await clickTr(); await until(() => pop().querySelector('[data-tr]:not([data-busy])'), 1500);
const mh = parseFloat(pop().style.maxHeight);
ok(mh > 0 && (top() + mh <= RECT.top || top() >= RECT.bottom), `hai phía chật → giới hạn chiều cao ${mh}px, không đè câu đang chọn (top ${top()})`);
w.innerHeight = 768;
// Khổ điện thoại 390 px: không tràn ngang, lề 8 px
w.innerWidth = 390; RECT = { top: 300, bottom: 320, left: 250, right: 380, width: 130, height: 20 };
await selectLine(1); await clickTr(); await until(() => pop().querySelector('[data-tr]:not([data-busy])'), 1500);
ok(left() >= 8 && left() + 360 <= 390 - 8 + 0.5, `390 px: bảng trong khung (left ${left()}, phải ${left() + 360} ≤ 382)`);
ok(/calc\(100vw - 16px\)/.test(pop().style.maxWidth), 'bảng có max-width 100vw − 16 px');
w.innerWidth = 1280; RECT = { top: 400, bottom: 420, left: 100, right: 500, width: 400, height: 20 };
ok(!/background\s*:\s*#fff/i.test(pop().getAttribute('style') || ''), 'bảng không ép nền trắng (theo theme sáng/tối)');

// ===== (3) Đóng / đổi vùng chọn giữa chừng → hủy, kết quả cũ không bật lại =====
mode = 'hang';
await selectLine(1); await clickTr(); const sig1 = lastSig;
w.document.dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true }));
await tick(BUDGET + 100);
ok(pop().hidden, 'bấm ra ngoài trong lúc chờ → đóng, không tự mở lại khi hết giờ');
ok(sig1 && sig1.aborted, 'đóng bảng → hủy yêu cầu dịch (AbortSignal)');
await selectLine(2); await clickTr(); w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
ok(pop().hidden && lastSig && lastSig.aborted, 'Esc → đóng + hủy');
await selectLine(2); await clickTr(); pop().querySelector('[data-x]').click();
ok(pop().hidden && lastSig.aborted, 'nút ✕ → đóng + hủy');
// Chọn câu khác khi câu cũ đang dịch → bản cũ không ghi đè bảng mới
mode = 'other'; w.TrFast._mem.clear(); await selectLine(1); await clickTr(); const sigOld = lastSig;
mode = 'ok'; await selectLine(2); await clickTr();
await tick(400);
ok(sigOld.aborted && !/BẢN CŨ/.test(pop().textContent) && /Rất vui/.test(pop().textContent), 'đổi vùng chọn → bản dịch cũ bị hủy, bảng mới đúng câu mới');

const bad = errors.filter(e => !/Not implemented|Could not parse CSS|i18n|fetch/i.test(e));
ok(!bad.length, 'không lỗi JS: ' + bad.slice(0, 3).join(' | '));
console.log(fails ? `✗ sel-translate: ${fails}/${n} lỗi` : `✓ sel-translate: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
