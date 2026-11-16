// Test kéo-thả ô chữ bài xếp câu (web/js/word-arrange.js, docs/specs/learn-flow-nav.md): chèn/đổi chỗ/gỡ bằng con trỏ, bàn phím, chạm vẫn như cũ.
// Chạy: node scripts/test/lesson-drag.mjs
import fs from 'node:fs';
import jsdom from 'jsdom';

let total = 0, fails = 0;
const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const dom = new jsdom.JSDOM('<div id="lsnAns" class="lsn-ans"></div><div id="lsnBank" class="lsn-bank"></div>', { runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, doc = w.document; w.eval(fs.readFileSync('web/js/word-arrange.js', 'utf8'));
const D = w.WordArrange;

// A. Lõi thuần
ok(JSON.stringify(D.insertAt([0, 1, 2], 2, 0)) === '[2,0,1]', 'insertAt: đưa ô lên đầu');
ok(JSON.stringify(D.insertAt([0, 1, 2], 5, 1)) === '[0,5,1,2]', 'insertAt: chèn ô mới vào giữa');
ok(JSON.stringify(D.insertAt([0, 1], 3, 99)) === '[0,1,3]', 'insertAt: vượt biên → cuối');
const R = [{ left: 0, top: 0, width: 50, height: 40 }, { left: 60, top: 0, width: 50, height: 40 }, { left: 0, top: 50, width: 50, height: 40 }];
ok(D.slotIndex(R, 10, 20) === 0 && D.slotIndex(R, 40, 20) === 1 && D.slotIndex(R, 100, 20) === 2 && D.slotIndex(R, 40, 70) === 3, 'slotIndex: theo dòng + giữa ô');

// B. DOM: chạm / kéo / bàn phím
const WORDS = ['Young', 'entrepreneurs', 'often', 'struggle', 'innovation'];
const ans = doc.getElementById('lsnAns'), bank = doc.getElementById('lsnBank');
let order = [], locked = false, said = '';
const pos = (el, i) => { el.getBoundingClientRect = () => ({ left: i * 60, top: 0, width: 50, height: 40, right: i * 60 + 50, bottom: 40 }); };
const draw = () => { ans.innerHTML = order.map(i => `<button class="lsn-tile" data-a="${i}">${WORDS[i]}</button>`).join(''); [...ans.children].forEach(pos); bank.querySelectorAll('.lsn-tile').forEach(b => b.classList.toggle('used', order.includes(+b.dataset.i))); };
bank.innerHTML = WORDS.map((x, i) => `<button class="lsn-tile" data-i="${i}">${x}</button>`).join('');
ans.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 40, right: 400, bottom: 40 });
[...bank.children].forEach((el, i) => { el.getBoundingClientRect = () => ({ left: i * 60, top: 200, width: 50, height: 40, right: i * 60 + 50, bottom: 240 }); });
bank.onclick = e => { const b = e.target.closest('.lsn-tile'); if (!b || order.includes(+b.dataset.i)) return; order.push(+b.dataset.i); draw(); };
ans.onclick = e => { const b = e.target.closest('.lsn-tile'); if (!b) return; order = order.filter(i => i !== +b.dataset.a); draw(); };
const t = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => v[k]);
D.bind({ ans, bank, get: () => order, set: o => { order = o; }, draw, locked: () => locked, word: i => WORDS[i], say: s => { said = s; }, t });
const P = (type, el, x, y) => { const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }); Object.defineProperty(e, 'pointerId', { value: 1 }); el.dispatchEvent(e); };
const tick = () => new Promise(r => setTimeout(r, 80)); // trình duyệt: click giả sau khi kéo tới ngay; bộ nuốt click tự tắt ở lượt kế
const tile = (c, i) => c.querySelector(`[data-${c === ans ? 'a' : 'i'}="${i}"]`);

tile(bank, 0).click(); tile(bank, 1).click(); tile(bank, 3).click();
ok(order.join() === '0,1,3', 'chạm: từ nhảy vào chỗ trống tiếp theo (như cũ)');
// kéo "often" từ ngân hàng thả vào giữa entrepreneurs | struggle
P('pointerdown', tile(bank, 2), 140, 220); P('pointermove', doc, 150, 210); P('pointermove', doc, 100, 20);
ok(doc.querySelector('.lsn-ghost') && ans.querySelector('.lsn-caret'), 'kéo: có bóng ô + vạch chèn');
P('pointerup', doc, 100, 20); tile(bank, 2).click(); // click giả sau khi kéo phải bị nuốt
ok(order.join() === '0,1,2,3', 'kéo từ ngân hàng: chèn đúng vị trí (S + often + V)');
ok(!doc.querySelector('.lsn-ghost') && !ans.querySelector('.lsn-caret') && /often: .*3\/4/.test(said), 'thả: dọn bóng/vạch, aria-live đọc vị trí');
// đổi chỗ: kéo "struggle" lên đầu
P('pointerdown', tile(ans, 3), 200, 20); P('pointermove', doc, 190, 25); P('pointermove', doc, 5, 20); P('pointerup', doc, 5, 20); await tick();
ok(order.join() === '3,0,1,2', 'kéo trong câu: đổi chỗ');
// kéo ra ngoài để gỡ
P('pointerdown', tile(ans, 3), 10, 20); P('pointermove', doc, 20, 30); P('pointermove', doc, 10, 400); P('pointerup', doc, 10, 400); await tick();
ok(order.join() === '0,1,2' && /Đã gỡ struggle/.test(said), 'kéo ra ngoài: gỡ từ');
// chạm nhẹ (không vượt ngưỡng) trong câu = gỡ như cũ
P('pointerdown', tile(ans, 2), 130, 20); P('pointerup', doc, 131, 20); tile(ans, 2).click();
ok(order.join() === '0,1', 'chạm ô đã xếp: gỡ (như cũ)');
// bàn phím
tile(bank, 2).click(); tile(ans, 2).focus();
tile(ans, 2).dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
ok(order.join() === '0,2,1' && doc.activeElement === tile(ans, 2), 'phím ←: đổi chỗ, giữ tiêu điểm');
tile(ans, 2).dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Delete', bubbles: true }));
ok(order.join() === '0,1' && /Đã gỡ/.test(said), 'phím Delete: gỡ');
// đã chấm → khóa
locked = true; P('pointerdown', tile(ans, 1), 70, 20); P('pointermove', doc, 90, 30); P('pointermove', doc, 0, 20); P('pointerup', doc, 0, 20);
ok(order.join() === '0,1', 'đã chấm: không kéo được');
// CSS: giữ chỗ không làm giãn dòng + giảm chuyển động + không chặn cuộn ngoài ô
ok(/\.wa-ans\{[^}]*align-content:flex-start/.test(fs.readFileSync('web/js/word-arrange.js', 'utf8')), 'CSS: hàng đáp án giữ chiều cao nhưng dòng không giãn');
const css = fs.readFileSync('web/js/word-arrange.js', 'utf8');
ok(/prefers-reduced-motion:reduce\)\{[^}]*\.lsn-ghost[^}]*transition:none/.test(css) && /\.wa-ans \[data-a\],\.wa-bank \[data-i\]\{min-height:44px;touch-action:none/.test(css), 'CSS: reduced-motion + touch-action chỉ trên ô + ô ≥44 px');
locked = false;

// C. Câu nhiều dòng: vị trí theo dòng gần con trỏ, vạch ở đúng dòng, thẻ cùng dòng dạt ra, thẻ dòng khác đứng yên
const R2 = [{ left: 0, top: 0, width: 50, height: 40 }, { left: 60, top: 0, width: 50, height: 40 }, { left: 0, top: 50, width: 50, height: 40 }, { left: 60, top: 50, width: 50, height: 40 }];
ok(D.rowsOf(R2).length === 2 && D.rowsOf(R2)[1].ids.join() === '2,3', 'rowsOf: gom thẻ theo dòng');
ok(D.slotIndex(R2, 500, 20) === 2 && D.slotIndex(R2, 500, 70) === 4 && D.slotIndex(R2, 70, 70) === 3, 'slotIndex nhiều dòng: cuối dòng / cuối câu / giữa dòng 2');
order = [0, 1, 3, 4]; draw();
[...ans.children].forEach((el, i) => { el.getBoundingClientRect = () => ({ left: (i % 2) * 60, top: i < 2 ? 0 : 50, width: 50, height: 40, right: (i % 2) * 60 + 50, bottom: (i < 2 ? 0 : 50) + 40 }); });
ans.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 90, right: 400, bottom: 90 });
P('pointerdown', tile(bank, 2), 140, 220); P('pointermove', doc, 150, 210); P('pointermove', doc, 70, 70);
const caret = ans.querySelector('.lsn-caret');
ok(/,44px\)/.test(caret.style.transform) && tile(ans, 3).style.transform.includes('-7px') && tile(ans, 4).style.transform.includes('7px') && !tile(ans, 0).style.transform, 'kéo vào dòng 2: vạch đúng dòng, hai bên dạt ra, dòng 1 đứng yên');
P('pointermove', doc, 420, 20);
ok(/,-6px\)/.test(caret.style.transform) && !tile(ans, 4).style.transform, 'cuối dòng 1: vạch theo tay về dòng 1, dòng 2 hết dạt');
// Esc hủy kéo: không đổi gì, không để sót bóng/vạch/dạt, click sau đó không tính là chạm
doc.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
ok(order.join() === '0,1,3,4' && !doc.querySelector('.lsn-ghost') && !ans.querySelector('.lsn-caret') && !tile(ans, 3).style.transform, 'Esc: hủy kéo, dọn sạch');
P('pointerup', doc, 420, 20); await tick(); await tick();

// D. Hoàn tác (Ctrl/⌘+Z) và bàn phím đưa thẻ vào giữa ngay sau khi đặt
const K = (el, key, extra = {}) => el.dispatchEvent(new w.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra }));
order = [0, 1, 3]; draw();
tile(bank, 2).dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
ok(order.join() === '0,1,3,2' && doc.activeElement === tile(ans, 2), 'Enter trên thẻ ngân hàng: đặt rồi focus sang thẻ vừa đặt');
K(tile(ans, 2), 'ArrowLeft'); ok(order.join() === '0,1,2,3', '← đưa thẻ vừa đặt vào giữa');
K(tile(ans, 2), 'Home'); ok(order.join() === '2,0,1,3', 'Home: về đầu câu');
K(tile(ans, 2), 'End'); ok(order.join() === '0,1,3,2', 'End: về cuối câu');
K(doc, 'z', { ctrlKey: true }); ok(order.join() === '2,0,1,3', 'Ctrl+Z: hoàn tác bước End');
K(doc, 'z', { metaKey: true }); ok(order.join() === '0,1,2,3', '⌘+Z: hoàn tác bước Home');
K(doc, 'z', { ctrlKey: true }); K(doc, 'z', { ctrlKey: true }); ok(order.join() === '0,1,3', 'Ctrl+Z: về trước khi đặt thẻ, thẻ về ngân hàng');
ok(!tile(bank, 2).disabled && tile(bank, 0).disabled && tile(bank, 0).classList.contains('used'), 'ô giữ chỗ: thẻ đã đặt bị khóa + giữ chỗ; thẻ gỡ mở lại');

// E. RTL (bản thẻ không phải tiếng Anh): chia vị trí và phím mũi tên đảo chiều
const RT = [{ left: 200, top: 0, width: 50, height: 40 }, { left: 140, top: 0, width: 50, height: 40 }];
ok(D.slotIndex(RT, 240, 20, true) === 0 && D.slotIndex(RT, 195, 20, true) === 1 && D.slotIndex(RT, 100, 20, true) === 2, 'slotIndex RTL: đầu / giữa / cuối');
order = [0, 1]; draw(); ans.style.direction = 'rtl';
K(tile(ans, 1), 'ArrowRight'); ok(order.join() === '1,0', 'RTL: → đưa thẻ về phía đầu câu');
ans.style.direction = '';

// F. Chỉ còn một component xếp câu: mọi màn dùng WordArrange, app nạp đúng gói
const SRC = f => fs.readFileSync(f, 'utf8');
ok(['web/js/lesson/ui.js', 'web/js/grammar.js', 'web/js/toefl.js'].every(f => /WordArrange\.bind\(/.test(SRC(f))), 'bài học, ngữ pháp, TOEFL đều dùng WordArrange.bind');
ok(!/ChoiceKit\.tiles|TileDrag|lesson\/drag\.js/.test(SRC('web/js/app.js') + SRC('web/js/lesson/ui.js')) && !fs.existsSync('web/js/lesson/drag.js'), 'không còn bản kéo-thả riêng');
const app = SRC('web/js/app.js');
ok(['lesson', 'grammar', 'toefl'].every(k => new RegExp(`\\b${k}: \\[[^\\]]*'js/word-arrange\\.js'`).test(app)), 'gói lesson/grammar/toefl nạp word-arrange.js');

// D. ResizeObserver: đo lại bề rộng KHÔNG đổi minHeight ngay trong callback (gây "ResizeObserver loop completed with undelivered notifications", qa-bot journey@1440d) mà ở khung kế
{
  const d2 = new jsdom.JSDOM('<div id="a"></div><div id="b"></div>', { runScripts: 'outside-only', pretendToBeVisual: true }), w2 = d2.window; let cb = null;
  w2.ResizeObserver = class { constructor(f) { cb = f; } observe() {} disconnect() {} };
  w2.eval(fs.readFileSync('web/js/word-arrange.js', 'utf8'));
  const a = w2.document.getElementById('a'), b = w2.document.getElementById('b'); let wd = 400;
  Object.defineProperty(a, 'offsetWidth', { get: () => wd }); Object.defineProperty(a, 'offsetHeight', { get: () => 90 }); Object.defineProperty(w2.HTMLElement.prototype, 'offsetHeight', { get: () => 90, configurable: true });
  b.innerHTML = '<button class="lsn-tile" data-i="0">x</button>'; a.getBoundingClientRect = () => ({ left: 0, top: 0, width: wd, height: 40, right: wd, bottom: 40 });
  w2.WordArrange.bind({ ans: a, bank: b, get: () => [], set() {}, draw() {}, locked: () => false, word: () => 'x', say() {}, t: x => x });
  a.style.minHeight = ''; wd = 300; cb && cb();
  ok(cb && a.style.minHeight === '', 'ResizeObserver: callback không đổi minHeight ngay (tránh vòng RO)');
  await new Promise(r => w2.requestAnimationFrame(() => setTimeout(r, 30)));
  ok(a.style.minHeight === '90px', 'ResizeObserver: khung kế đo lại bề rộng mới');
}

console.log(`\n${total - fails}/${total} lesson-drag`);
process.exit(fails ? 1 : 0);
