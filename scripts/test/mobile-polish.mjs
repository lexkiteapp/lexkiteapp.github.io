// Test (jsdom) 2 lỗi hiển thị mobile (CI journey-vi, PR #131):
// (1) Màn "Bạn đã học xong N từ" (Học thông minh): lượt 0 câu trả lời (bấm "Mình đã biết từ này" hết) → ẩn dòng "0 câu trả lời · 0 lần sai", chỉ giữ "+20 XP thưởng".
// (2) UI.toast: hộp thoại #modal đang mở → toast xếp hàng, hiện sau khi đóng; mở modal khi toast đang hiện → cất lại; toast né nút/thanh cố định ở đáy.
// Chạy: node scripts/test/mobile-polish.mjs
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
w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
w.CSS = { escape: s => s };
w.fetch = async () => ({ ok: false, status: 404, json: async () => ({}), text: async () => '' });
for (const f of scripts) { try { w.eval(fs.readFileSync(path.join(WEB, f), 'utf8')); } catch (e) { errors.push(f + ': ' + e.message); } }
require('./lazyfix.js')(w, fs, path, WEB, errors);
const tick = (ms = 40) => new Promise(r => setTimeout(r, ms));
const $ = (s, r = w.document) => r.querySelector(s), $$ = (s, r = w.document) => [...r.querySelectorAll(s)];
const go = async (h, ms = 150) => { w.location.hash = h; await tick(ms); };
const click = el => el && el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const cs = el => w.getComputedStyle(el);
w.UI.speak = () => {}; w.speechSynthesis = { speak() {}, cancel() {}, getVoices: () => [], pause() {}, resume() {} };
w.SpeechSynthesisUtterance = function (t) { this.text = t; };
w.Audio = function () { return { play: async () => {}, pause() {}, addEventListener() {} }; };

await tick(300); await go('#/welcome/setup'); for (let i = 0; i < 60 && !$('#go'); i++) { if ($('#obNext')) $('#obNext').click(); await tick(100); } if ($('#go')) $('#go').click(); await tick(1500); // thiết lập từng bước (onboard.js): bấm Tiếp tục tới màn cuối rồi Bắt đầu
const { Distract: D, Placement: P, IELTS_DATA } = w;
ok(D && P, 'nạp js/distract.js (gói words) + js/placement.js (gói placement)');
const ALL = IELTS_DATA.TOPICS.flatMap(t => t.words).filter(x => x.vi && x.level && !/\s/.test(x.word));

// ---- (1) học xong mà 0 câu trả lời ----
let done = false;
for (let k = 0; k < 6 && !done; k++) {
  await go('#/home', 30); await go('#/practice/learn?src=deck', 200);
  for (let i = 0; i < 40 && $('#known'); i++) { click($('#known')); await tick(120); }
  done = !!$('#learnStats');
}
ok(done, 'tới màn "Bạn đã học xong" chỉ bằng "Mình đã biết từ này"');
const st = ($('#learnStats') || {}).textContent || '';
ok(!/câu trả lời|lần sai/.test(st), '0 câu trả lời → ẩn dòng số liệu: ' + st);
ok(/\+20 XP/.test(st), 'vẫn giữ XP thưởng: ' + st);
for (const l of fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split('\n').filter(x => /^[a-z]{2}$/.test(x)).concat('en')) ok(fs.readFileSync(path.join(WEB, 'js/i18n', l + '.js'), 'utf8').includes('"+{xp} XP thưởng"') || fs.readFileSync(path.join(WEB, 'js/i18n', l + '.js'), 'utf8').includes("'+{xp} XP thưởng'"), 'bản dịch "+{xp} XP thưởng": ' + l);

// ---- (2) toast xếp hàng sau modal ----
const T = $('#toast'), shown = () => T.classList.contains('show');
w.UI.closeModal(); for (let i = 0; i < 100 && shown(); i++) await tick(100); // chờ toast "đã biết" của phần (1) tự tắt
ok(!shown(), 'toast cũ tự tắt');
w.UI.modal('<h2>Nhận lời nhắc học nhẹ nhàng</h2><button class="btn primary">OK</button>'); await tick(30);
w.UI.toast('Đã đánh dấu A');
ok(!shown(), 'modal mở → toast chưa hiện (xếp hàng)');
w.UI.toast('Đã đánh dấu A');
w.UI.closeModal(); await tick(400);
ok(shown() && T.textContent === 'Đã đánh dấu A', 'đóng modal → toast hiện: ' + T.textContent);
w.UI.modal('<p>hộp 2</p><button>OK</button>'); await tick(30);
ok(!shown(), 'mở modal khi toast đang hiện → toast cất đi, không chồng lên hộp thoại');
w.$m = $('#modal'); w.$m.hidden = true; await tick(400); // đóng kiểu gán hidden trực tiếp cũng phải nhả hàng chờ
ok(shown() && T.textContent === 'Đã đánh dấu A', 'đóng (gán hidden) → toast hiện lại 1 lần, không trùng');

// ---- (2b) toast né vùng nút/thanh cố định ở đáy (360×740) ----
Object.defineProperty(w, 'innerHeight', { value: 740, configurable: true });
const bar = w.document.createElement('div'); bar.className = 'learn-bar'; $('#view').appendChild(bar);
bar.getBoundingClientRect = () => ({ top: 600, bottom: 740, left: 0, right: 360, width: 360, height: 140 });
w.UI.toast('Toast trên thanh nút');
const bt = parseFloat(T.style.bottom) || 0;
ok(bt >= 740 - 600 + 8, 'toast đặt phía trên thanh nút đáy (bottom=' + T.style.bottom + ')');
ok(bt <= 740 * .55, 'toast không bị đẩy quá nửa màn');
bar.remove(); w.UI.toast('Toast thường');
ok(!T.style.bottom, 'không vật cản → giữ vị trí CSS (đã gồm safe-area)');
ok(/\.toast \{[^}]*bottom: calc\(28px \+ env\(safe-area-inset-bottom/.test(css), 'CSS toast tính safe-area');

const real = errors.filter(e => !/Not implemented|navigation|Could not parse CSS/.test(e));
ok(!real.length, 'không lỗi JS: ' + real.slice(0, 3).join(' | '));
if (fails) { console.log(`✗ mobile-polish: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ mobile-polish: ${n} phép kiểm (học xong 0 câu · toast sau modal · toast né nút đáy)`);
process.exit(0);
