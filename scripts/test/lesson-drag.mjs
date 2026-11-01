// Test kéo-thả ô chữ bài xếp câu (web/js/lesson/drag.js, docs/specs/sentence-builder.md): chèn/đổi chỗ/gỡ bằng con trỏ, bàn phím, chạm vẫn như cũ.
// Chạy: node scripts/test/lesson-drag.mjs
import fs from 'node:fs';
import jsdom from 'jsdom';

let total = 0, fails = 0;
const ok = (c, m) => { total++; if (!c) { fails++; console.error('✗', m); } else console.log('✓', m); };
const dom = new jsdom.JSDOM('<div id="lsnAns" class="lsn-ans"></div><div id="lsnBank" class="lsn-bank"></div>', { runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, doc = w.document; w.eval(fs.readFileSync('web/js/lesson/drag.js', 'utf8'));
const D = w.TileDrag;

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
D.bind({ ans, bank, get: () => order, set: o => { order = o; draw(); }, locked: () => locked, word: i => WORDS[i], say: s => { said = s; }, t });
const P = (type, el, x, y) => { const e = new w.MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }); Object.defineProperty(e, 'pointerId', { value: 1 }); el.dispatchEvent(e); };
const tick = () => new Promise(r => setTimeout(r, 5)); // trình duyệt: click giả sau khi kéo tới ngay; bộ nuốt click tự tắt ở lượt kế
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
// CSS: giảm chuyển động + không chặn cuộn ngoài ô
const css = fs.readFileSync('web/css/tactile-x.css', 'utf8');
ok(/prefers-reduced-motion:reduce\)\{\.lsn-ghost\{transition:none/.test(css) && /\.lsn-ans \.lsn-tile,\.lsn-bank \.lsn-tile\{touch-action:none/.test(css), 'CSS: reduced-motion + touch-action chỉ trên ô');

console.log(`\n${total - fails}/${total} lesson-drag`);
process.exit(fails ? 1 : 0);
