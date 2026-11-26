// 🖼️ Ghép tranh (web/cpack/play-app/play-picmatch.js, game-system P5b) chơi thật trong jsdom trên khung Stitch game-picmatch:
// chỉ lấy từ CÓ ảnh (VImg.quizUrl), ghép sai → +lần sai / ghép đúng → thẻ ✓ + đọc to, thẻ đến hạn: Good (không sai) / Hard (có sai) + sổ lỗi, hết → GameEnd, ảnh tắt → quay lại Luyện tập.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import jsdom from 'jsdom';
import { withGameEnd } from '../lib/game-end-env.mjs';
const read = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const WORDS = ['umbrella', 'bicycle', 'volcano', 'lantern', 'anchor', 'giraffe', 'candle'], NOIMG = 'candle';
const dom = new jsdom.JSDOM('<!doctype html><html lang="en"><body><main id="view"></main></body></html>', { url: 'https://lexkite.com/app/#/practice/picmatch', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, view = w.document.getElementById('view'), reviews = [], rewards = [], mistakes = [], said = [], ans = [], done = [], toasts = [];
w.t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s); w.I18N = { tk: s => s, lang: () => 'en' };
const END = 5000, card = (word, due) => ({ word, pos: 'n', vi: 'nghĩa ' + word, srs: { reps: 1, last: 1, due, lapses: 0 } });
const deck = Object.fromEntries(WORDS.map((x, i) => [x, card(x, i < 2 ? 100 : 9e9)])); // umbrella, bicycle đến hạn
w.Core = { Cards: { update: async () => {} }, SRS: { review: (s, gr) => (reviews.push(gr), { ...s, due: 9e9 }) }, Stats: { logReview: async () => ({}) }, endOfToday: () => END };
let imgOn = true;
w.App = { view, state: { cards: deck, game: { best: {} } }, reward: async d => { rewards.push(d); }, logMistake: m => mistakes.push(m), cleanup: null, streak: () => 2, activeDays: () => new Set(),
  imgKey: c => [c.word, c.pos], vimgReady: async () => (imgOn ? w.VImg : null) };
w.VImg = { quizUrl: word => (word === NOIMG ? '' : `https://media.lexkite.com/vimg/${word}.webp`) };
w.UI = { esc: s => String(s).replace(/[<>&"]/g, ''), speak: x => said.push(x), toast: m => toasts.push(m), shuffle: a => [...a] };
w.Sfx = { answer: ok => ans.push(ok), finish() {}, pop() {} };
w.eval(read('web/cpack/play-app/play-blitz.js'));
withGameEnd(w);
await w.App.need('gend');
w.eval(read('web/cpack/game/game-picmatch.js')); w.eval(read('web/cpack/play-app/play-picmatch.js'));
const H = { accent: () => 'en-US', emptySource: () => { view.innerHTML = 'EMPTY'; }, mean: x => x.vi, pool: s => (s === 'due' ? WORDS.slice(0, 2) : s === 'weak' ? [] : WORDS).map(x => deck[x]), practiceDone: d => done.push(d), srcName: () => 'Deck' };
const tick = () => new Promise(r => setImmediate(r));
await w.PlayPicmatch.run(H, 'deck');
const $ = s => view.querySelector(s), $$ = s => [...view.querySelectorAll(s)];
assert.ok($('#pm') && $('#pmCards') && $('#pmWords') && $('#pmX').getAttribute('href') === '#/practice', 'khung Stitch game-picmatch + nút thoát về Luyện tập');
assert.equal($$('#pmCards [data-c]').length, 6, '6 thẻ ảnh (từ không có ảnh bị loại)'); assert.equal($$('#pmWords [data-w]').length, 6, '6 nút từ');
assert.ok(!$$('#pmWords [data-w]').some(b => b.getAttribute('aria-label') === NOIMG), 'từ không có ảnh không vào game');
assert.ok($$('#pmCards img').every(i => /^https:\/\/media\.lexkite\.com\/vimg\//.test(i.src)), 'ảnh lấy từ kho ảnh theo nghĩa (VImg)');
assert.ok([...$$('#pmCards [data-c]'), ...$$('#pmWords [data-w]')].every(b => b.className && !/undefined/.test(b.className)), 'mọi ô mang class mẫu Stitch');
const wordsOf = () => $$('#pmWords [data-w]').map(b => b.getAttribute('aria-label')), urlWord = i => $$('#pmCards img')[i].src.match(/vimg\/(\w+)\.webp/)[1];
const wordBtn = word => $$('#pmWords [data-w]').find(b => b.getAttribute('aria-label') === word);
// chạm từ khi chưa chọn ảnh → chỉ đọc to, không tính sai
$('#pmWords [data-w]').click(); assert.equal(ans.length, 0, 'chưa chọn ảnh → không chấm'); said.length = 0;
// ghép SAI: ảnh 0 + từ khác
const w0 = urlWord(0), wrong = wordsOf().find(x => x !== w0);
$$('#pmCards [data-c]')[0].click(); assert.equal($$('#pmCards [data-c]')[0].getAttribute('aria-pressed'), 'true', 'ảnh được chọn');
wordBtn(wrong).click(); assert.equal(ans.at(-1), false, 'ghép sai');
assert.ok($$('#pmWords [data-w]').some(b => /close/.test(b.textContent)), 'từ sai hiện dấu ✕');
// ghép ĐÚNG
wordBtn(w0).click(); await tick(); assert.equal(ans.at(-1), true, 'ghép đúng'); assert.ok(said.includes(w0), 'đúng → đọc to');
assert.ok(/check/.test($$('#pmCards [data-c]')[0].textContent) && $$('#pmCards [data-c]')[0].disabled, 'thẻ đã nối: ✓ + khóa'); assert.ok(/1\/6/.test(view.textContent), 'đếm 1/6 đã nối');
if (deck[w0].srs.due <= END) assert.equal(reviews.at(-1), 1, 'đã sai trước đó → Hard (nếu đến hạn)');
// nút trộn từ: không đổi số nút từ
$('#pmShuffle').click(); assert.equal($$('#pmWords [data-w]').length, 6);
// gợi ý: chọn ảnh kế + đánh dấu từ đúng
$('#pmHint').click(); assert.ok($$('#pmWords [data-w]').find(b => b.style.outline), 'gợi ý chỉ ra từ đúng');
// ghép hết bằng đáp án đúng (ảnh i ↔ từ của ảnh)
for (let i = 1; i < 6; i++) { const cs = $$('#pmCards [data-c]')[i]; if (cs.disabled) continue; if (cs.getAttribute('aria-pressed') !== 'true') cs.click(); wordBtn(urlWord(i)).click(); await tick(); }
for (let k = 0; k < 8 && !$('#lsn.gend'); k++) await tick();
assert.ok($('#lsn.gend'), 'ghép hết → màn kết GameEnd');
assert.equal(rewards.length, 1); assert.equal(rewards[0].picmatch, 1); assert.ok(rewards[0].xp >= 5 && rewards[0].xp <= 40, 'XP theo luật game (trần 40)');
assert.ok(mistakes.some(m => m.a === w0), 'từ ghép sai vào sổ lỗi'); assert.equal(done[0].mode, 'picmatch');
assert.ok($('#lsnAgain'), 'nút chính Chơi lại');
// ảnh tắt (cờ vocab_img) → toast + về Luyện tập, không vào game trống
imgOn = false; w.location.hash = '#/practice/picmatch'; await w.PlayPicmatch.run(H, 'deck');
assert.equal(toasts.length, 1, 'ảnh chưa mở → báo nhẹ'); assert.equal(w.location.hash, '#/practice');
// ít ảnh → màn rỗng
imgOn = true; w.location.hash = '#/practice/picmatch'; await w.PlayPicmatch.run({ ...H, pool: () => [deck.umbrella, deck.candle] }, 'topic:x'); assert.equal(view.innerHTML, 'EMPTY', 'dưới 4 từ có ảnh → màn rỗng');
// gói lười gọn
const kb = ['web/cpack/play-app/play-picmatch.js', 'web/cpack/game/game-picmatch.js'].reduce((a, f) => a + fs.statSync(new URL('../../' + f, import.meta.url)).size, 0);
assert.ok(kb < 30 * 1024, `gói ghép tranh ${Math.round(kb / 1024)} KB thô`);
console.log('play-picmatch OK');
