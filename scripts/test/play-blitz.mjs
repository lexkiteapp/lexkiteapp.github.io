// ⏱️ Test Thử thách 60 giây (web/cpack/play-app/play-blitz.js, docs/specs/play-learn.md): lõi thuần (thứ tự SRS, chấm, combo, nhiễu, link thách đấu)
// + vòng chơi jsdom: CHỈ thẻ đến hạn được SRS.review đúng mức, sai → hỏi lại, phím 1–4, tab ẩn dừng giờ, hết giờ → màn kết thúc + XP + kỷ lục.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import jsdom from 'jsdom';

const src = fs.readFileSync(new URL('../../web/cpack/play-app/play-blitz.js', import.meta.url), 'utf8');
const dom = new jsdom.JSDOM('<!doctype html><body><main id="view"></main></body>', { url: 'https://lexkite.com/app/#/practice/blitz', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window;
let now = 1000; w.performance.now = () => now;
const timers = []; w.setInterval = f => (timers.push(f), timers.length); w.clearInterval = () => { timers.length = 0; };
const later = []; w.setTimeout = f => (later.push(f), later.length);
const flush = () => { while (later.length) later.shift()(); };
w.eval(src);
const { core } = w.PlayBlitz;

/* ---------- lõi thuần ---------- */
const END = 5000;
const card = (word, due, lapses = 0) => ({ word, vi: 'nghĩa ' + word, srs: { reps: 1, last: 1, due, lapses } });
const cards = { a: card('a', 300), b: card('b', 100), c: card('c', 9e9, 4), d: card('d', 9e9, 1), e: card('e', 9e9) };
const ord = Array.from(core.order(['e', 'd', 'c', 'b', 'a', 'a'].map(word => ({ word })), cards, END, () => 0.5), x => x.word);
assert.deepEqual(ord, ['b', 'a', 'c', 'd', 'e'], 'thứ tự: đến hạn (quá hạn lâu trước) → yếu (quên nhiều trước) → còn lại, bỏ trùng');
assert.equal(core.gradeOf(true, 2000), 2); assert.equal(core.gradeOf(true, 9000), 1); assert.equal(core.gradeOf(false, 100), 0);
assert.deepEqual([0, 2, 3, 5, 6, 12].map(n => core.mult(n)), [1, 1, 2, 2, 3, 3]);
assert.equal(core.xpOf(30, 30), 40, 'XP có trần 40'); assert.equal(core.xpOf(0, 3), 5);
const words = ['apple', 'run', 'happy', 'river', 'eat', 'blue'].map((word, i) => ({ word, pos: i % 2 ? 'v' : 'n', vi: 'm-' + word }));
for (let k = 0; k < 20; k++) {
  const op = core.options(words[0], 'mean', words, x => x.vi, Math.random);
  assert.equal(op.length, 4); assert.ok(op.includes('m-apple')); assert.equal(new Set(op).size, 4, 'nhãn trùng');
}
assert.equal(core.options(words[0], 'mean', words.slice(0, 3), x => x.vi, Math.random), null, 'thiếu nhiễu → null (không câu 2 đáp án)');
const ch = core.encodeCh(['apple', 'run', 'happy', 'river', '<script>', 'x'.repeat(60)], 120);
assert.ok(/^[A-Za-z0-9_-]+$/.test(ch), 'link phải là base64url');
assert.deepEqual(JSON.parse(JSON.stringify(core.decodeCh(ch))), { w: ['apple', 'run', 'happy', 'river'], s: 120 });
for (const bad of ['', 'xx', w.btoa('{"w":["a"],"s":1}'), w.btoa('{"w":["a","b","c","d"],"s":-4}'), w.btoa('{"w":["a","b","c","d"],"s":1.5}'), 'A'.repeat(3000)]) assert.equal(core.decodeCh(bad), null, 'chấp nhận link lạ: ' + bad);

/* ---------- vòng chơi jsdom ---------- */
const reviews = [], rewards = [], answers = [], mistakes = [], said = [];
const deck = { apple: card('apple', 100), run: card('run', 9e9), happy: card('happy', 200), river: card('river', 9e9), eat: card('eat', 9e9), blue: card('blue', 9e9) };
const norm = x => ({ word: x.word, vi: x.vi, pos: x.pos || '', ipa: '' });
w.t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s);
w.I18N = { tk: (s, v) => s };
w.Core = { Cards: { update: async () => {} }, SRS: { review: (s, g) => (reviews.push(g), { ...s, due: 9e9, reps: s.reps + 1 }) }, Stats: { logReview: async () => ({}) }, endOfToday: () => END };
w.IELTS_DATA = { INDEX: Object.fromEntries(words.map(x => [x.word, x])), TOPICS: [{ words }] };
const view = w.document.getElementById('view');
w.App = { view, state: { cards: deck, game: { best: { blitz: 50 } } }, reward: async d => { rewards.push(d); }, logMistake: m => mistakes.push(m), cleanup: null };
w.UI = { $: (s, r) => (r || w.document).querySelector(s), esc: s => String(s).replace(/[<>&"]/g, ''), toast() {}, speak: x => said.push(x), pic: () => '<img class="pic">' };
w.Sfx = { answer: ok => answers.push(ok), finish() {} };
w.speechSynthesis = {};
const H = {
  accent: () => 'us', emptySource: () => { view.innerHTML = 'EMPTY'; }, mean: x => x.vi, norm, picOk: () => false, practiceDone() {},
  head: (title, i, n, extra) => `<div class="study-top"><a class="icon-btn" href="#/practice">✕</a><div class="progress"><i></i></div>${extra}</div><div>${title}</div>`,
  pool: s => (s === 'due' ? [deck.apple, deck.happy] : s === 'weak' ? [] : Object.values(deck)).map(x => ({ ...x, vi: x.vi })),
};
const Q = new w.URLSearchParams('');
w.PlayBlitz.run(H, 'deck', Q);
assert.equal(view.querySelector('.study-top .icon-btn').style.width, '44px', 'nút thoát ≥ 44 px');
const prompt = () => view.querySelector('#bzQ .q-card').textContent;
assert.ok(/apple/.test(prompt()), 'câu đầu phải là thẻ quá hạn lâu nhất (apple)');
const pick = right => { const bs = [...view.querySelectorAll('#bzQ .option')]; const cur = Object.values(deck).find(c => prompt().includes(c.word) || said.at(-1) === c.word); const b = bs.find(e => (e.textContent.includes(cur.vi) || e.textContent.endsWith(cur.word)) === right); b.click(); flush(); return cur.word; };
now += 2000; assert.equal(pick(true), 'apple'); // đúng nhanh → Good
assert.deepEqual(Array.from(reviews), [2]);
assert.ok(view.querySelector('#bzQ .option'), 'câu tiếp theo phải hiện');
// câu 2 (dạng nghe): sai → Again cho happy (đến hạn), từ bị đưa lại hàng đợi
now += 1000; const second = pick(false);
assert.equal(second, 'happy'); assert.deepEqual(Array.from(reviews), [2, 0]); assert.equal(mistakes.length, 1);
// phím 1–4 hoạt động; thẻ chưa đến hạn KHÔNG bị SRS.review
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: '1' })); flush();
assert.equal(reviews.length, 2, 'thẻ chưa đến hạn không được chấm SRS'); assert.equal(answers.length, 3, 'phím 1 phải trả lời');
// tab ẩn → dừng giờ
Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => true }); w.document.dispatchEvent(new w.Event('visibilitychange'));
now += 120000; timers.forEach(f => f()); assert.ok(!view.querySelector('.celebrate'), 'tab ẩn mà giờ vẫn chạy');
Object.defineProperty(w.document, 'hidden', { configurable: true, get: () => false }); w.document.dispatchEvent(new w.Event('visibilitychange'));
assert.ok(/^\d+s$/.test(view.querySelector('#bzT').textContent));
// hết giờ → màn kết thúc, thưởng 1 lần, kỷ lục cũ 50 hiện đúng, từ sai liệt kê
now += 61000; timers.forEach(f => f()); await new Promise(r => setImmediate(r));
assert.ok(view.querySelector('.celebrate'), 'hết giờ phải ra màn kết thúc');
assert.equal(rewards.length, 1); assert.equal(rewards[0].blitz, 1); assert.ok(rewards[0].xp >= 5);
assert.ok(view.textContent.includes('happy'), 'từ sai phải được liệt kê để ôn');
assert.ok(view.querySelector('#bzCh'), 'phải có nút Thách đấu bạn bè');
assert.equal(timers.length, 0, 'phải dọn bộ đếm giờ');
// 👻 bóng ma (docs/specs/play-community-1211.md #1): bóng ma lần trước hiện chip, hết giờ thua → báo thiếu điểm, điểm 0 không ghi đè bóng ma
w.localStorage.setItem('lk.blitz.ghost', JSON.stringify({ score: 60, trace: [[300, 1], [1300, 1], [2300, 1], [3300, 1]] }));
w.PlayBlitz.run(H, 'deck', Q);
assert.ok(!view.querySelector('#bzG').hidden && view.querySelector('#bzG').textContent.includes('👻'), 'phải hiện chip bóng ma');
now += 61000; timers.forEach(f => f()); await new Promise(r => setImmediate(r));
assert.ok(view.textContent.includes('60'), 'thua bóng ma phải báo còn thiếu điểm');
assert.equal(JSON.parse(w.localStorage.getItem('lk.blitz.ghost')).score, 60, 'lượt 0 điểm không ghi đè bóng ma');
// link thách đấu → đúng bộ từ của bạn, tiêu đề có điểm cần vượt
w.PlayBlitz.run(H, 'deck', new w.URLSearchParams('ch=' + core.encodeCh(['apple', 'run', 'happy', 'river'], 70)));
assert.ok(view.textContent.includes('70'), 'tiêu đề thách đấu phải có điểm cần vượt');
// quá ít từ → màn rỗng (không câu thiếu nhiễu)
w.PlayBlitz.run({ ...H, pool: () => [norm(deck.apple)] }, 'topic:x', Q); assert.equal(view.innerHTML, 'EMPTY');
console.log('play-blitz OK');
