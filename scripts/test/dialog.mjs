// Hộp thoại LXDialog (web/js/dialog.js): confirm/prompt/alert trả đúng giá trị, Esc/Hủy, bẫy focus, ARIA, xếp hàng, khôi phục focus, không dùng hộp gốc.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url'; import { JSDOM } from 'jsdom';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dom = new JSDOM('<!doctype html><html><head><link data-lxd rel="stylesheet" href="css/dialog.css"></head><body><button id="opener">x</button></body></html>', { url: 'http://localhost/app/', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, d = w.document; let fails = 0;
w.confirm = w.alert = w.prompt = () => { fails++; console.error('✗ dialog: dùng hộp thoại gốc'); };
w.eval(fs.readFileSync(path.join(ROOT, 'web/js/dialog.js'), 'utf8'));
const tick = (ms = 20) => new Promise(r => setTimeout(r, ms)), $ = s => d.querySelector(s);
const ok = (c, m) => { if (!c) { fails++; console.error('✗ dialog: ' + m); } };
const key = (t, k, o = {}) => t.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...o }));
const btn = cls => $('.lxd-btn.' + cls);
const L = w.LXDialog;
ok(L && L.confirm && L.prompt && L.alert, 'thiếu API');
d.getElementById('opener').focus();
// confirm: OK → true, a11y
let p = L.confirm('Xóa?\nKhông hoàn tác', { danger: true }); await tick();
const box = $('.lxd-box');
ok(box && box.getAttribute('role') === 'dialog' && box.getAttribute('aria-modal') === 'true', 'thiếu role/aria-modal');
ok($('#' + box.getAttribute('aria-labelledby')).textContent.includes('Không hoàn tác'), 'aria-labelledby không trỏ tới nội dung');
ok(btn('danger') && btn('ghost'), 'nút nguy hiểm/hủy');
ok(box.contains(d.activeElement), 'focus phải vào hộp');
btn('danger').click(); ok(await p === true, 'OK → true'); ok(!$('.lxd'), 'hộp phải gỡ sau khi đóng'); ok(d.activeElement.id === 'opener', 'trả focus về nút mở');
// confirm: Esc / Hủy → false
p = L.confirm('a'); await tick(); key(d.body, 'Escape'); ok(await p === false, 'Esc → false');
p = L.confirm('a'); await tick(); btn('ghost').click(); ok(await p === false, 'Hủy → false');
p = L.confirm('a'); await tick(); $('.lxd').dispatchEvent(new w.MouseEvent('mousedown', { bubbles: true })); ok(await p === false, 'bấm nền → false');
// bẫy Tab: Tab ở nút cuối quay về nút đầu
p = L.confirm('a'); await tick(); const bs = [...d.querySelectorAll('.lxd-btn')]; bs[bs.length - 1].focus(); key(bs[bs.length - 1], 'Tab'); ok(d.activeElement === bs[0], 'Tab phải quay vòng trong hộp'); bs[0].focus(); key(bs[0], 'Tab', { shiftKey: true }); ok(d.activeElement === bs[bs.length - 1], 'Shift+Tab quay vòng'); key(d.body, 'Escape'); await p;
// prompt: giá trị mặc định, Enter, hủy → null
p = L.prompt('Tên?', 'Lớp A'); await tick(); const inp = $('.lxd-in'); ok(inp && inp.value === 'Lớp A' && d.activeElement === inp, 'ô nhập có giá trị mặc định + focus'); inp.value = 'Lớp B'; key(inp, 'Enter'); ok(await p === 'Lớp B', 'Enter → giá trị');
p = L.prompt('Tên?', 'x'); await tick(); key(d.body, 'Escape'); ok(await p === null, 'prompt hủy → null');
p = L.prompt('Tên?'); await tick(); btn('primary').click(); ok(await p === '', 'prompt rỗng → chuỗi rỗng');
// alert: chỉ 1 nút, resolve undefined; văn bản qua textContent (không chèn HTML)
p = L.alert('<img src=x onerror=1>'); await tick(); ok(d.querySelectorAll('.lxd-btn').length === 1 && !$('.lxd img'), 'alert 1 nút, không chèn HTML'); ok($('.lxd').getAttribute('data-kind') === 'alert' && $('.lxd-box').getAttribute('role') === 'alertdialog', 'alert role'); btn('primary').click(); ok(await p === undefined, 'alert → undefined');
// xếp hàng: 2 hộp gọi liên tiếp hiện lần lượt, không chồng
const a = L.confirm('một'), b = L.confirm('hai'); await tick(); ok(d.querySelectorAll('.lxd').length === 1 && $('.lxd-msg').textContent === 'một', 'chỉ 1 hộp một lúc'); btn('primary').click(); ok(await a === true, 'hộp 1'); await tick(); ok($('.lxd-msg').textContent === 'hai', 'hộp 2 hiện sau'); btn('ghost').click(); ok(await b === false, 'hộp 2');
// nhãn tùy biến
p = L.confirm('q', { ok: 'Xóa', cancel: 'Giữ' }); await tick(); ok(btn('primary').textContent === 'Xóa' && btn('ghost').textContent === 'Giữ', 'nhãn tùy biến'); key(d.body, 'Escape'); await p;
if (fails) { console.error(`✗ dialog: ${fails} lỗi`); process.exit(1); }
console.log('dialog: ok');
