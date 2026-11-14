// 🥁 Nhịp điệu – vòng chơi jsdom (web/cpack/play-app/play-rhythm.js): màn mở đầu → 5 câu → kết thúc; chạm đúng nhịp / chạm nhầm từ yếu;
// SRS chỉ chấm thẻ ĐẾN HẠN khi chạm đúng từ đích và cả câu ≥ 80 %; nút tắt âm; tab ẩn → làm lại câu; dọn dẹp khi thoát.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import jsdom from 'jsdom';

const read = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const dom = new jsdom.JSDOM('<!doctype html><body><main id="view"></main></body>', { url: 'https://lexkite.com/app/#/practice/rhythm', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
let now = 1000; w.performance.now = () => now;
let raf = null; w.requestAnimationFrame = f => { raf = f; return 1; }; w.cancelAnimationFrame = () => { raf = null; };
const later = []; w.setTimeout = (f, ms) => (later.push(f), later.length); w.clearTimeout = () => {};
const flush = () => { while (later.length) later.shift()(); };
const frame = () => { const f = raf; raf = null; if (f) f(); };
const reviews = [], rewards = [], answers = [], said = [], done = [], haptics = [];
w.eval(read('web/js/pron/coach.js')); w.eval(read('web/cpack/play-app/play-blitz.js')); w.eval(read('web/cpack/play-app/play-rhythm.js'));
w.t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s);
const END = 5000, card = (word, ex, due) => ({ word, ex, vi: 'nghĩa ' + word, srs: { reps: 1, last: 1, due, lapses: 0 } });
const deck = {
  apple: card('apple', 'We need to buy the apple for the party.', 100), happy: card('happy', 'She was happy to see the family again.', 200),
  river: card('river', 'They walked along the river after the lunch.', 9e9), eat: card('eat', 'I like to eat fruit in the morning.', 9e9), blue: card('blue', 'He bought a blue bag at the market.', 9e9),
};
w.Core = { Cards: { update: async () => {} }, SRS: { review: (s, g) => (reviews.push(g), { ...s, due: 9e9 }) }, Stats: { logReview: async () => ({}) }, endOfToday: () => END };
const view = w.document.getElementById('view');
w.App = { view, state: { cards: deck, settings: {}, game: { best: {} } }, reward: async d => { rewards.push(d); }, cleanup: null };
w.UI = { $: (s, r) => (r || w.document).querySelector(s), esc: s => String(s).replace(/[<>&"]/g, ''), speak: x => said.push(x), WEAK: { to: ['tə', 'tə', ''], the: ['ðə', 'ðə', ''], a: ['ə', 'ə', ''], for: ['fə', 'fər', ''], was: ['wəz', 'wəz', ''], at: ['ət', 'ət', ''], in: ['ɪn', 'ɪn', ''], after: ['ɑːftə', 'æftər', ''] } };
w.Sfx = { correct: () => answers.push(true), wrong: () => answers.push(false), answer: () => { throw new Error('không được gọi Sfx.answer (aria-live từng chạm + tải gói lười giữa vòng)'); }, finish() {}, haptic: e => haptics.push(e) };
const H = {
  accent: () => 'en-GB', emptySource: () => { view.innerHTML = 'EMPTY'; }, norm: x => ({ word: x.word, ex: x.ex, vi: x.vi, pos: '', ipa: '' }), practiceDone: d => done.push(d),
  head: (title, i, n, extra) => `<div class="study-top"><a class="icon-btn" href="#/practice">✕</a><div class="progress"><i></i></div><span>${extra}</span></div><div>${title}</div>`,
  pool: s => (s === 'due' ? [deck.apple, deck.happy] : s === 'weak' ? [] : Object.values(deck)),
};
const key = k => w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: k }));
const chips = () => [...view.querySelectorAll('#rhW .rh-w')];

// --- màn mở đầu ---
w.PlayRhythm.run(H, 'deck');
assert.ok(view.querySelector('#rhGo'), 'phải có màn mở đầu với nút Bắt đầu (cũng là cử chỉ mở khóa âm thanh)');
assert.equal(view.querySelector('.study-top .icon-btn').style.width, '44px', 'nút thoát ≥ 44 px');
assert.equal(view.querySelector('#rhM').getAttribute('aria-pressed'), 'false');
view.querySelector('#rhM').click(); assert.equal(w.localStorage.getItem('lk.rhythm.mute'), '1', 'tắt âm phải được nhớ'); assert.equal(view.querySelector('#rhM').getAttribute('aria-pressed'), 'true');
view.querySelector('#rhM').click(); assert.equal(w.localStorage.getItem('lk.rhythm.mute'), '0');

// --- chơi 5 câu; câu 1 chạm hoàn hảo ---
view.querySelector('#rhGo').click();
const play = (mode) => { // mode: 'perfect' | 'wrong-weak' | 'none'
  const start = now, beat = w.PlayRhythm.core.beatOf(+/(\d+)\/\d+/.exec(view.textContent)[1] - 1), T0 = start + 4 * beat, cs = chips();
  assert.ok(cs.length >= 4 && cs.some(c => c.classList.contains('st')) && cs.some(c => c.classList.contains('wk')), 'câu phải có từ nhấn và từ yếu');
  assert.ok(view.querySelector('#rhB'), 'có chấm nhịp để theo dõi bằng mắt');
  assert.ok(view.querySelector('#rhT') && view.querySelector('#rhT').getAttribute('aria-label'), 'nút chạm có nhãn cho trình đọc màn hình');
  assert.equal(typeof view.querySelector('#rhT').onkeydown, 'function', 'trình xử lý phím trên nút phải được gắn (không bị chú thích nuốt)'); assert.equal(typeof view.querySelector('#rhT').onpointerdown, 'function');
  cs.forEach((c, k) => { const st = c.classList.contains('st'); if (mode === 'perfect' && st) { now = T0 + k * beat; key(' '); } if (mode === 'wrong-weak' && !st) { now = T0 + k * beat; key(' '); } });
  if (mode !== 'none') assert.ok(cs.some(c => /perfect|good|wrong/.test(c.className) && c.querySelector('[data-m]').textContent), 'chạm xong thấy ngay kết quả trên từ (ký hiệu chữ)');
  now = T0 + (cs.length - 1) * beat + beat; frame();
  return cs;
};
let n0 = answers.length;
let cs = play('perfect'); const st1 = cs.filter(c => c.classList.contains('st')).length;
assert.equal(answers.length - n0, st1); assert.ok(answers.slice(n0).every(Boolean), 'chạm đúng nhịp → đúng');
assert.equal(chips().filter(c => c.classList.contains('perfect')).length, st1, 'mọi từ nhấn phải thành perfect');
assert.ok(chips().every(c => c.querySelector('[data-m]')), 'mỗi từ có dấu ký hiệu (không chỉ dùng màu)');
assert.ok(chips().filter(c => c.classList.contains('perfect')).every(c => c.querySelector('[data-m]').textContent === '✓✓'));
assert.ok(+view.querySelector('#rhS').textContent > 0, 'điểm phải tăng'); assert.ok(said.length === 1, 'đọc mẫu câu sau khi chấm');
assert.ok(view.querySelector('#rhQ').textContent.includes(st1 + '/' + st1));
assert.deepEqual(Array.from(reviews), [2], 'từ đích apple (đến hạn) chạm đúng, câu 100 % → Good');
// tab ẩn trong lúc chờ chuyển câu → KHÔNG bắt đầu câu mới (nếu không sẽ chấm 0 chạm); quay lại mới bắt đầu
Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => true }); flush();
assert.ok(/1\/5/.test(view.textContent) && !/2\/5/.test(view.textContent), 'đang ẩn: chưa sang câu 2');
Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => false }); w.document.dispatchEvent(new w.Event('visibilitychange'));
assert.ok(/2\/5/.test(view.textContent), 'quay lại: sang câu 2');
// --- câu 2: chạm nhầm vào từ yếu → sai, không chấm SRS ---
const r1 = reviews.length; n0 = answers.length; cs = play('wrong-weak');
assert.ok(answers.slice(n0).length > 0 && answers.slice(n0).every(x => x === false), 'chạm từ yếu → sai');
assert.ok(chips().some(c => c.classList.contains('wrong')) && chips().some(c => c.classList.contains('miss')), 'có từ chạm nhầm và từ nhấn bị lỡ');
assert.equal(reviews.length, r1, 'sai/lỡ không bị phạt SRS (bài nhịp, không phải nhớ nghĩa)'); flush();
// --- câu 3: tab ẩn giữa chừng → dừng; quay lại → làm lại câu (không mất lượt) ---
Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => true }); w.document.dispatchEvent(new w.Event('visibilitychange'));
now += 60000; frame(); assert.ok(!view.querySelector('.celebrate'), 'tab ẩn không được chạy tiếp');
Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => false }); w.document.dispatchEvent(new w.Event('visibilitychange'));
assert.ok(view.querySelector('#rhT'), 'quay lại phải hiện lại câu'); assert.ok(/3\/5/.test(view.textContent), 'vẫn là câu 3');
// phím Space trên nút ✕ (thoát) không được bị tính là chạm
now += 4 * 700 + 100; const nA = answers.length; view.querySelector('.study-top a.icon-btn').dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true })); assert.equal(answers.length, nA, 'Space trên ✕ không phải chạm');
// --- câu 3, 4, 5: bỏ qua không chạm → 0 điểm, vẫn kết thúc bình thường ---
play('none'); flush(); play('none'); flush(); play('none'); await new Promise(r => setImmediate(r)); flush(); await new Promise(r => setImmediate(r));
assert.ok(view.querySelector('.celebrate'), 'sau 5 câu phải ra màn kết thúc');
assert.equal(rewards.length, 1); assert.equal(rewards[0].quizzes, 1); assert.ok(rewards[0].xp >= 5 && rewards[0].xp <= 40);
assert.equal(done.length, 1); assert.equal(done[0].mode, 'rhythm'); assert.ok(done[0].pct >= 0 && done[0].pct <= 100);
assert.ok(view.querySelector('#rhAgain') && view.querySelector('a.btn[href^="#/practice"]'), 'có Chơi lại và Chế độ khác');
assert.ok(/Từ nhấn bị lỡ/.test(view.textContent), 'liệt kê từ nhấn bị lỡ');
assert.equal(w.App.cleanup && (w.App.cleanup(), 'ok'), 'ok', 'cleanup gọi được nhiều lần');
// --- chơi lại ---
view.querySelector('#rhAgain').click(); assert.ok(view.querySelector('#rhGo'), 'chơi lại → màn mở đầu');
console.log('play-rhythm-run OK');
