// 🧩 Ô chữ mỗi ngày (web/cpack/play-app/xw-core.js + play-crossword.js, game-system P5): lõi thuần (lưới hợp lệ: cắt nhau, không chạm cạnh song song,
// đánh số chuẩn, cùng hạt giống → cùng lưới, bàn chữ đủ chữ còn thiếu) + chơi thật trong jsdom trên khung Stitch game-crossword thật:
// gõ bàn chữ/bàn phím, kiểm tra từ, gợi ý, bỏ qua; SRS chỉ thẻ đến hạn (Good / Hard có gợi ý / Again bỏ qua + sổ lỗi); kết thúc → GameEnd + XP luật chung.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import jsdom from 'jsdom';
import { withGameEnd } from '../lib/game-end-env.mjs';

const read = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
/* ---------- lõi ---------- */
const ctx = { self: {} }; vm.createContext(ctx); vm.runInContext(read('web/cpack/play-app/xw-core.js'), ctx); const X = ctx.self.XwCore;
const WORDS = ['renewable', 'energy', 'climate', 'policy', 'green', 'solar', 'carbon', 'reduce', 'waste', 'plant', 'river', 'habit'];
for (const seed of ['a', 'b', 'c', '2026-11-22', 'x|deck|abc']) {
  const P = X.build(WORDS.map(word => ({ word })), { rnd: X.rng(seed), size: 9, max: 7 }), N = P.size, at = new Map(P.cells.map(c => [c.r * N + c.c, c.ch]));
  assert.ok(P.entries.length >= 4, `${seed}: ≥ 4 từ (${P.entries.length})`);
  for (const e of P.entries) {
    const cl = X.cellsOf(e); assert.equal(cl.map(([r, c]) => at.get(r * N + c)).join(''), e.answer, `${seed}: ô khớp đáp án ${e.answer}`);
    assert.ok(cl.every(([r, c]) => r >= 0 && c >= 0 && r < N && c < N), `${seed}: ${e.answer} nằm trong lưới`);
    const [r0, c0] = cl[0], [r1, c1] = cl[cl.length - 1], d = e.dir === 'down';
    assert.ok(!at.has((d ? r0 - 1 : r0) * N + (d ? c0 : c0 - 1)) || (d ? r0 === 0 : c0 === 0), `${seed}: trước ${e.answer} trống`);
    assert.ok(!at.has((d ? r1 + 1 : r1) * N + (d ? c1 : c1 + 1)) || (d ? r1 === N - 1 : c1 === N - 1), `${seed}: sau ${e.answer} trống`);
  }
  // mọi ô chữ thuộc ≥ 1 từ; ô thuộc 2 từ = chỗ cắt; mọi chuỗi chữ liền ≥ 2 đều là một từ (không tạo "từ ma" khi chạm cạnh)
  const owners = new Map(); for (const e of P.entries) for (const [r, c] of X.cellsOf(e)) owners.set(r * N + c, (owners.get(r * N + c) || 0) + 1);
  assert.equal(owners.size, at.size, `${seed}: mọi ô thuộc một từ`);
  const runs = []; for (let r = 0; r < N; r++) for (const dir of [0, 1]) { let s = ''; for (let i = 0; i <= N; i++) { const ch = i < N ? at.get(dir ? i * N + r : r * N + i) : null; if (ch) s += ch; else { if (s.length > 1) runs.push(s); s = ''; } } }
  assert.deepEqual(runs.sort(), Array.from(P.entries, e => e.answer).sort(), `${seed}: không có chuỗi chữ lạ`);
  assert.ok(P.entries.length === 1 || [...owners.values()].some(v => v === 2), `${seed}: có chỗ cắt`);
  // đánh số: tăng theo thứ tự đọc
  const nums = P.cells.filter(c => c.n).sort((a, b) => a.r * N + a.c - (b.r * N + b.c)).map(c => c.n); assert.deepEqual(Array.from(nums), Array.from(nums).sort((a, b) => a - b), `${seed}: đánh số theo thứ tự đọc`);
}
assert.deepEqual(JSON.parse(JSON.stringify(X.build(WORDS.map(word => ({ word })), { rnd: X.rng('s') }))), JSON.parse(JSON.stringify(X.build(WORDS.map(word => ({ word })), { rnd: X.rng('s') }))), 'cùng hạt giống → cùng lưới');
assert.equal(X.build([{ word: 'a' }, { word: 'toolongwordhere' }, { word: 'ok!' }], {}).entries.length, 0, 'bỏ từ < 3 hoặc > lưới');
assert.equal(X.shareGrid([{ dir: 'across', n: 1 }, { dir: 'down', n: 2 }, { dir: 'down', n: 3 }], { across1: 'ok', down2: 'hint', down3: 'skip' }), '🟩🟨⬜', 'lưới chia sẻ không lộ đáp án');

/* ---------- chơi thật (jsdom) ---------- */
const dom = new jsdom.JSDOM('<!doctype html><html lang="en"><body><main id="view"></main></body></html>', { url: 'https://lexkite.com/app/#/practice/crossword', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, view = w.document.getElementById('view'), reviews = [], rewards = [], mistakes = [], said = [], ans = [], done = [];
w.t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s); w.I18N = { tk: s => s, lang: () => 'en' };
const END = 5000, card = (word, due) => ({ word, vi: 'nghĩa ' + word, ex: `We talk about ${word} every day.`, srs: { reps: 1, last: 1, due, lapses: 0 } });
const deck = Object.fromEntries(WORDS.map((x, i) => [x, card(x, i < 3 ? 100 : 9e9)])); // renewable, energy, climate đến hạn
w.Core = { Cards: { update: async () => {} }, SRS: { review: (s, gr) => (reviews.push(gr), { ...s, due: 9e9 }) }, Stats: { logReview: async () => ({}) }, endOfToday: () => END };
w.App = { view, state: { cards: deck, game: { best: {} } }, reward: async d => { rewards.push(d); }, logMistake: m => mistakes.push(m), cleanup: null, streak: () => 2, activeDays: () => new Set() };
w.UI = { esc: s => String(s).replace(/[<>&"]/g, ''), speak: x => said.push(x), toast() {} };
w.Sfx = { answer: ok => ans.push(ok), finish() {}, tap() {} };
for (const f of ['web/cpack/play-app/play-blitz.js', 'web/cpack/play-app/xw-core.js']) w.eval(read(f));
withGameEnd(w);
await w.App.need('gend'); // ST2 runtime + khung lesson-complete
w.eval(read('web/cpack/game/game-crossword.js')); w.eval(read('web/cpack/play-app/play-crossword.js'));
const H = { accent: () => 'en-US', emptySource: () => { view.innerHTML = 'EMPTY'; }, mean: x => x.vi, pool: s => (s === 'due' ? WORDS.slice(0, 3) : s === 'weak' ? [] : WORDS).map(x => deck[x]), practiceDone: d => done.push(d), srcName: () => 'Deck' };
w.PlayCrossword.run(H, 'deck');
const $ = s => view.querySelector(s), $$ = s => [...view.querySelectorAll(s)];
assert.ok($('#xw') && $('#xwGrid') && $('#xwX').getAttribute('href') === '#/practice', 'khung Stitch game-crossword + nút thoát về Luyện tập');
assert.equal($$('#xwGrid > *').length, 81, 'lưới 9×9 (dựng từ 7 ô mẫu Stitch)');
assert.ok($$('#xwGrid [data-k]').length >= 15, 'ô chữ là nút chạm được');
const blk = $('#xwGrid > [aria-hidden="true"]'); assert.ok(blk && blk.className && !blk.className.includes('undefined'), 'ô chặn mang class mẫu Stitch');
assert.ok($$('#xwGrid [data-k]').every(b => !/undefined/.test(b.className)), 'mọi ô mang class mẫu Stitch');
assert.ok($$('#xwKeys [data-ch]').length === 12, 'bàn chữ 12 phím');
assert.ok(/nghĩa /.test(view.textContent), 'gợi ý = nghĩa theo ngôn ngữ học');
const clueWord = () => WORDS.find(x => $('#xwGrid') && view.textContent.includes('nghĩa ' + x) && !view.textContent.includes('nghĩa ' + x + 'x'));
assert.ok(!/renewable|energy|climate/i.test($('#xwEx') ? $('#xwEx').textContent : ''), 'câu ví dụ che từ đang hỏi');
// từ 1: gõ đúng bằng bàn chữ → Good (nếu đến hạn) + đọc to
const word1 = clueWord(); const keyFor = ch => $$('#xwKeys [data-ch]').find(b => b.dataset.ch === ch);
for (const ch of word1) { const b = keyFor(ch); if (b) b.click(); else w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: ch })); }
$('#xwCheck').click(); await new Promise(r => setImmediate(r));
assert.equal(ans.at(-1), true, 'từ 1 đúng'); assert.ok(said.includes(word1), 'giải xong → đọc to');
if (deck[word1].srs.due <= END) assert.equal(reviews.at(-1), 2, 'thẻ đến hạn giải không gợi ý → Good');
// từ 2: gõ sai bằng bàn phím → sai, rồi gợi ý đủ → đúng, có gợi ý → Hard (nếu đến hạn)
const word2 = clueWord(); assert.notEqual(word2, word1, 'chuyển sang từ kế');
for (let i = 0; i < word2.length; i++) w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'z' }));
w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter' }));
assert.equal(ans.at(-1), false, 'gõ sai → chưa đúng');
for (let i = 0; i < 12 && clueWord() === word2; i++) $('#xwHint').click();
await new Promise(r => setImmediate(r));
assert.ok(said.includes(word2), 'gợi ý đủ chữ → tự kiểm, giải xong');
if (deck[word2].srs.due <= END) assert.equal(reviews.at(-1), 1, 'có gợi ý → Hard');
// còn lại: bỏ qua hết → Again cho thẻ đến hạn + sổ lỗi; hết → GameEnd
for (let i = 0; i < 12 && $('#xwSkip'); i++) { $('#xwSkip').click(); await new Promise(r => setImmediate(r)); }
for (let k = 0; k < 5 && !$('#lsn.gend'); k++) await new Promise(r => setImmediate(r));
assert.ok($('#lsn.gend'), 'hết từ → màn kết GameEnd');
assert.equal(rewards.length, 1); assert.equal(rewards[0].crossword, 1); assert.ok(rewards[0].xp >= 5 && rewards[0].xp <= 40, 'XP theo luật game (trần 40)');
assert.ok(mistakes.length >= 1, 'bỏ qua → sổ lỗi');
assert.equal(done[0].mode, 'crossword');
assert.ok(/🟩/.test(view.textContent) && /⬜/.test(view.textContent), 'lưới kết quả 🟩🟨⬜');
assert.ok($('#lsnShare') && /Play again|Chơi lại|Chế độ khác|Other modes/.test($('#lsnAgain').textContent), 'chia sẻ + nút chính');
// ít từ → màn rỗng
w.PlayCrossword.run({ ...H, pool: () => [deck.habit] }, 'topic:x'); assert.equal(view.innerHTML, 'EMPTY', 'thiếu từ → màn rỗng');
// không rò bàn phím sau khi thoát
const n0 = ans.length; w.App.cleanup && w.App.cleanup(); w.document.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter' })); assert.equal(ans.length, n0, 'cleanup gỡ bàn phím');
// gói lười < 30 KB (spec: mỗi game lười < 30 KB)
const kb = ['web/cpack/play-app/xw-core.js', 'web/cpack/play-app/play-crossword.js', 'web/cpack/game/game-crossword.js'].reduce((a, f) => a + fs.statSync(new URL('../../' + f, import.meta.url)).size, 0);
assert.ok(kb < 30 * 1024 * 1.2, `gói ô chữ ${Math.round(kb / 1024)} KB thô`);
console.log('play-crossword OK');
