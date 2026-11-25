// Test dạng câu mới shortanswer + summarybank (web/js/qengine.js) – jsdom (chạy ở CI), không mạng. Dữ liệu demo tự viết, không phải đề Cambridge.
// Chạy: node scripts/test/qengine-types.mjs
import fs from 'node:fs'; import { JSDOM } from 'jsdom';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const dom = new JSDOM('<!DOCTYPE html><body><div id="r"></div></body>', { runScripts: 'outside-only' }), w = dom.window;
w.t = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o || {})[k]);
w.Element.prototype.scrollIntoView = () => {};
w.eval(fs.readFileSync(new URL('../../web/js/qengine.js', import.meta.url), 'utf8'));
w.eval(fs.readFileSync(new URL('../../web/js/qtips.js', import.meta.url), 'utf8'));
const QE = w.QE, root = w.document.getElementById('r');
const p = { groups: [
  { type: 'shortanswer', instr: 'Answer in NO MORE THAN TWO WORDS.', limit: 2, items: [{ n: 1, q: 'What does the demo bee collect?', a: ['nectar', 'sweet nectar'], cue: 'bee' }, { n: 2, q: 'Where does it sleep?', a: ['the hive', 'hive'] }] },
  { type: 'summarybank', instr: 'Choose from the box.', bank: ['rain', 'sun', 'wind', 'snow', 'fog', 'hail', 'ice', 'storm', 'cloud'], items: [{ n: 3, text: 'Plants need ___ to grow.', a: 'B', cue: 'plants' }, { n: 4, text: 'A big ___ came at night.', a: 'I' }] },
  { type: 'gap', instr: 'x', items: [{ n: 5, text: 'old ___', a: ['gap'] }] } ] };
root.innerHTML = QE.questionsHtml(p); QE.bind(root);
ok(QE.numsOf(p).join() === '1,2,3,4,5', 'numsOf gồm câu của dạng mới');
ok(root.querySelectorAll('input.gap').length === 3, 'shortanswer có ô gõ (2) + gap cũ (1)');
ok(root.querySelectorAll('select[data-qn]').length === 2 && root.querySelectorAll('select[data-qn="4"] option').length === 10, 'summarybank: select chữ A–I (9 + 1 trống)');
ok(/<b>I<\/b> cloud/.test(root.innerHTML), 'hộp từ hiện chữ I');
ok(w.QT.kindOf(p.groups[0]) === 'sentence' && w.QT.kindOf(p.groups[1]) === 'summary', 'QT.kindOf');
ok(!QE.answered(root, 1) && !QE.answered(root, 3), 'chưa làm');
const set = (n, v) => { const e = root.querySelector(`[data-qn="${n}"]`); e.value = v; e.dispatchEvent(new w.Event('input', { bubbles: true })); };
set(1, 'Nectar'); set(2, 'the big hive'); set(3, 'B'); set(4, 'A');
ok(QE.answered(root, 1) && QE.answered(root, 3), 'answered');
ok(root.querySelectorAll('.qe-flag').length === 5, 'cờ xem lại cho từng câu');
const res = QE.collect(p, root);
ok(res[1].ok && !res[2].ok && res[2].over, 'shortanswer chấm gradeGap + vượt giới hạn từ');
ok(res[3].ok && !res[4].ok && res[4].answer === 'I – cloud', 'summarybank chấm chữ cái, đáp án kèm từ');
ok(res[1].q.startsWith('What') && res[1].cue === 'bee' && res[3].cue === 'plants', 'q + cue được giữ');
QE.mark(root, res, 'Xem', () => {});
ok(root.querySelector('[data-item="3"]').classList.contains('ok') && root.querySelector('[data-item="2"]').classList.contains('no'), 'mark tô đúng/sai');
ok(root.querySelector('[data-ev="1"]') && root.querySelector('[data-ev="3"]'), 'nút cue/bằng chứng hiện');
console.log(fails ? fails + ' lỗi' : 'qengine-types OK'); process.exit(fails ? 1 : 0);
