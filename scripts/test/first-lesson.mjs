// Test (jsdom) bài đầu 60 giây (web/js/firstlesson.js): 5 câu, đáp án sai không tính, xong gọi done 1 lần, đặt cờ, kill switch, tắt trong jsdom/sandbox.
// Chạy: node scripts/test/first-lesson.mjs
import fs from 'node:fs';
import jsdom from 'jsdom';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const dom = new jsdom.JSDOM('<div id="v"></div>', { url: 'http://localhost/app/#/welcome/setup', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, ev = []; let calls = 0;
w.t = k => k; w.UI = { speak() {} }; w.Sfx = { correct() {}, wrong() {}, win() {} }; w.App = { habTrack: e => ev.push(e) };
w.eval(fs.readFileSync('web/js/firstlesson.js', 'utf8'));
const FL = w.FirstLesson, v = w.document.getElementById('v');
ok(FL && typeof FL.run === 'function', 'FirstLesson có run/enabled');
ok(FL.enabled() === false, 'tắt trong jsdom (test đi thẳng thiết lập)');
const tick = ms => new Promise(r => setTimeout(r, ms));
FL.run(v, () => calls++);
for (let i = 0; i < 5; i++) {
  ok(v.querySelector('#flCh'), `câu ${i + 1} có 3 lựa chọn`);
  ok(v.querySelectorAll('#flCh button').length === 3, `câu ${i + 1}: đúng 3 phương án`);
  const word = (v.querySelector('.fl-word') || {}).textContent;
  const map = { apple: '🍎', book: '📖', water: '💧', house: '🏠', dog: '🐶', sun: '☀️', tree: '🌳', car: '🚗', cat: '🐱', moon: '🌙' };
  const btns = [...v.querySelectorAll('#flCh button')];
  if (word) { const right = btns.find(b => b.textContent === map[word]); const bad = btns.find(b => b !== right); bad.click(); ok(bad.disabled, 'chọn sai → khóa nút sai, vẫn thử tiếp'); right.click(); }
  else btns.forEach(b => { if (!b.disabled) b.click(); }); // câu nghe: chạm lần lượt tới khi đúng
  await tick(760);
}
ok(v.querySelector('#flGo'), 'màn cuối có nút tiếp tục');
ok(calls === 0, 'chưa gọi done trước khi bấm tiếp tục');
v.querySelector('#flGo').click(); v.querySelector('#flGo').click();
ok(calls === 1, 'done gọi đúng 1 lần');
ok(w.localStorage.getItem('vb.firstLessonDone') === '1', 'đặt cờ đã xong');
ok(ev.includes('onb_fl_start') && ev.includes('onb_fl_done'), 'phễu: start + done');
w.localStorage.setItem('vb.noFirstLesson', '1'); ok(FL.enabled() === false, 'kill switch');
console.log(fails ? `✗ ${fails}/${n}` : `✓ first-lesson ${n} kiểm tra`); process.exit(fails ? 1 : 0);
