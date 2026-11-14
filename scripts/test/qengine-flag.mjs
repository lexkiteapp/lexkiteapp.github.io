// Test cờ "🚩 Xem lại sau" + thanh câu cần xem lại (web/js/qengine.js) – jsdom, không mạng.
// Kiểm: mỗi câu có nút cờ (aria-label, aria-pressed, bàn phím), thanh liệt kê đã cờ / chưa làm, chip nhảy tới câu, nộp bài (mark) gỡ thanh.
// Chạy: node scripts/test/qengine-flag.mjs
import fs from 'node:fs'; import vm from 'node:vm'; import { JSDOM } from 'jsdom';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const dom = new JSDOM('<!DOCTYPE html><body><div id="r"></div></body>', { runScripts: 'outside-only' }), w = dom.window;
w.t = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o || {})[k]);
w.Element.prototype.scrollIntoView = () => {};
w.eval(fs.readFileSync(new URL('../../web/js/qengine.js', import.meta.url), 'utf8'));
const QE = w.QE, root = w.document.getElementById('r');
const p = { groups: [
  { type: 'mcq', instr: 'x', items: [{ n: 1, q: 'a', options: ['A', 'B'], a: 0 }, { n: 2, q: 'b', options: ['A', 'B'], a: 1 }] },
  { type: 'multi', instr: 'x', n: [3, 4], q: 'm', options: ['A one', 'B two', 'C three'], a: ['A', 'B'] },
  { type: 'gap', instr: 'x', limit: 2, items: [{ n: 5, text: 'fill ___', a: ['cat'] }] } ] };
root.innerHTML = QE.questionsHtml(p); QE.bind(root);
const flags = [...root.querySelectorAll('.qe-flag')], chips = sel => [...root.querySelectorAll('.qe-rv ' + sel)].map(b => b.textContent);
ok(flags.length === 4, 'mỗi câu/nhóm có 1 nút cờ (nhận ' + flags.length + ')');
ok(flags.every(f => f.tagName === 'BUTTON' && f.type === 'button' && f.getAttribute('aria-label') && f.getAttribute('aria-pressed') === 'false'), 'nút cờ: <button>, aria-label, aria-pressed=false (focus/Enter/Space bằng bàn phím sẵn có)');
ok(chips('.qe-n:not(.fl)').join() === '1,2,3–4,5', 'ban đầu: 4 mục chưa làm (nhận ' + chips('.qe-n:not(.fl)') + ')');
flags[1].click();
ok(flags[1].getAttribute('aria-pressed') === 'true' && QE.flagged(root).join() === '2', 'bấm cờ → câu 2 được đánh dấu');
ok(chips('.qe-n.fl').join() === '2', 'thanh liệt kê câu đã cờ');
const r1 = root.querySelector('[name="q1"]'); r1.checked = true; r1.dispatchEvent(new w.Event('change', { bubbles: true }));
ok(chips('.qe-n:not(.fl)').join() === '2,3–4,5', 'trả lời câu 1 → hết "chưa làm" (nhận ' + chips('.qe-n:not(.fl)') + ')');
root.querySelectorAll('input[data-multi]')[0].checked = true; root.querySelector('input[data-multi]').dispatchEvent(new w.Event('change', { bubbles: true }));
ok(!chips('.qe-n:not(.fl)').includes('3–4'), 'câu chọn 2 đáp án: có tick → tính là đã làm');
const chip = root.querySelector('.qe-n.fl'); let focused = null; root.querySelector('[data-item="2"] input').focus = () => { focused = 1; };
chip.click(); ok(root.querySelector('[data-item="2"]').classList.contains('qe-flash') && focused, 'bấm chip → cuộn tới + focus câu đó');
flags[1].click(); ok(QE.flagged(root).length === 0 && flags[1].getAttribute('aria-pressed') === 'false', 'bấm lần nữa → bỏ cờ');
const res = QE.collect(p, root); QE.mark(root, res);
ok(!root.querySelector('.qe-rv') && flags.every(f => f.disabled), 'nộp bài (mark) → gỡ thanh, khóa cờ');
QE.bind(root); ok(root.querySelectorAll('.qe-flag').length === 4, 'bind lần hai không nhân đôi nút');
console.log(fails ? `✗ ${fails} lỗi` : '✓ qengine-flag: cờ xem lại + thanh điều hướng đạt');
process.exit(fails ? 1 : 0);
