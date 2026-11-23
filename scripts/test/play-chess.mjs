// ♟️ Cờ câu đố (web/cpack/play-app/play-chess.js, game-system P5c) chơi thật trong jsdom trên khung Stitch game-chess:
// chạm quân → hiện ô đi được, nước chiếu hết → ✓ + thuật ngữ + đọc to, nước khác → báo nhẹ + ✕, gợi ý 2 bước, "Thế khác", 5 thế → GameEnd.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import jsdom from 'jsdom';
import { withGameEnd } from '../lib/game-end-env.mjs';
const read = f => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
const dom = new jsdom.JSDOM('<!doctype html><html lang="en"><body><main id="view"></main></body></html>', { url: 'https://lexkite.com/app/#/practice/chess', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, view = w.document.getElementById('view'), rewards = [], said = [], ans = [], done = [], toasts = [];
w.t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s); w.I18N = { tk: s => s, lang: () => 'en' };
w.Core = { Cards: {}, SRS: {}, Stats: {}, endOfToday: () => 5000 };
w.App = { view, state: { cards: {}, game: { best: {} } }, reward: async d => { rewards.push(d); }, cleanup: null, streak: () => 2, activeDays: () => new Set() };
w.UI = { esc: s => String(s).replace(/[<>&"]/g, ''), speak: x => said.push(x), toast: m => toasts.push(m), shuffle: a => [...a] };
w.Sfx = { answer: ok => ans.push(ok), finish() {}, pop() {} };
w.eval(read('web/cpack/play-app/play-blitz.js'));
withGameEnd(w);
await w.App.need('gend');
for (const f of ['web/cpack/game/game-chess.js', 'web/cpack/play-app/chess-core.js', 'web/cpack/play-app/chess-puzzles.js', 'web/cpack/play-app/play-chess.js']) w.eval(read(f));
const H = { accent: () => 'en-US', practiceDone: d => done.push(d) };
const tick = () => new Promise(r => setImmediate(r));
const C = w.ChessCore, P = w.ChessPuzzles;
await w.PlayChess.run(H, 'deck');
const $ = s => view.querySelector(s), $$ = s => [...view.querySelectorAll(s)], cell = s => $(`#chBoard [data-s="${s}"]`);
assert.ok($('#ch') && $('#chBoard') && $('#chX').getAttribute('href') === '#/practice', 'khung Stitch game-chess + nút thoát về Luyện tập');
assert.equal($$('#chBoard [data-s]').length, 64, 'bàn cờ 8×8');
assert.ok($('#chBoard').closest('[dir=ltr]'), 'bàn cờ luôn LTR (cả khi UI là RTL: a1 ở góc dưới trái)');
assert.ok($$('#chBoard [data-s]').every(c => c.className && !/undefined/.test(c.className)), 'mọi ô mang class mẫu Stitch');
assert.ok($('#chFb').hidden && $('#chTerm').hidden && $('#chGo').disabled, 'chưa giải: ẩn thẻ phản hồi + thuật ngữ, nút Tiếp khóa');
assert.match($('#chTurn').textContent, /Trắng/, 'thế đầu: Trắng đi');
const mvs = i => C.moves(P[i][0]), mate = i => mvs(i).find(m => m.mate), wrongOf = i => mvs(i).find(m => !m.mate && m.from === 'a1') || mvs(i).find(m => !m.mate);
// thế 1 (xe a1): chạm quân → có ô đi được (chấm)
cell('a1').click(); assert.equal(cell('a1').getAttribute('aria-pressed'), 'true', 'quân được chọn');
assert.ok(mvs(0).filter(m => m.from === 'a1').every(m => cell(m.to) && cell(m.to).innerHTML.length > 0), 'ô đi được có chấm');
// nước sai → báo nhẹ, ✕, không khóa
const wr = wrongOf(0); if (wr.from !== 'a1') cell('a1').click(); if (wr.from !== 'a1') cell(wr.from).click(); cell(wr.to).click();
assert.equal(ans.at(-1), false, 'nước không chiếu hết'); assert.ok(!$('#chFb').hidden && $('#chGo').disabled, 'có thẻ phản hồi, chưa cho Tiếp'); assert.ok(/✕/.test(cell(wr.to).innerHTML), 'ô sai có ✕');
// gợi ý 2 bước
$('#chHint').click(); assert.ok(cell(mate(0).from).className.includes('inset'), 'gợi ý 1: ô quân cần đi'); $('#chHint').click(); assert.ok(cell(mate(0).to).innerHTML.length > 0, 'gợi ý 2: ô đích');
// nước đúng
const m0 = mate(0); cell(m0.from).click(); cell(m0.to).click(); await tick();
assert.equal(ans.at(-1), true, 'chiếu hết'); assert.ok(!$('#chTerm').hidden && /back-rank mate/.test($('#chTerm').textContent), 'hiện thuật ngữ'); assert.ok(said.includes('back-rank mate'), 'đọc to thuật ngữ'); assert.ok(!$('#chGo').disabled, 'mở nút Tiếp');
// sau khi giải xong thì chạm bàn cờ không làm gì
const before = $('#chBoard').innerHTML; cell('h7').click(); assert.equal($('#chBoard').innerHTML, before, 'đã giải: khóa bàn cờ');
$('#chGo').click(); assert.match($('header').textContent, /2 \/ 5/, 'sang thế 2/5');
$('#chSkip').click(); assert.match($('header').textContent, /2 \/ 5/, 'Thế khác không đổi tiến độ'); assert.equal($$('#chBoard [data-s]').length, 64);
// giải hết các thế còn lại: nhận ra thế đang hiện từ bàn cờ (kể cả thế của Đen: bàn cờ lật)
const F = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' }, GL = { K: F.k, Q: F.q, R: F.r, B: F.b, N: F.n, P: F.p, ...F }; // hai bên cùng bộ quân đặc (trắng = chữ trắng viền tối)
const shown = () => P.find(p => C.parse(p[0]).b.every((row, r) => row.every((pc, c) => { const el = cell(C.sq(r, c)); return el && el.textContent.replace(/[\uFE0E✕]/g, '').trim() === (pc ? GL[pc] : ''); })));
for (let k = 1; k < 5; k++) {
  const cur = shown(); assert.ok(cur, 'nhận ra thế đang hiện'); const m = C.moves(cur[0]).find(x => x.mate);
  cell(m.from).click(); cell(m.to).click(); await tick(); assert.ok(!$('#chGo').disabled, 'giải được thế ' + (k + 1)); $('#chGo').click(); await tick();
}
for (let k = 0; k < 8 && !$('#lsn.gend'); k++) await tick();
assert.ok($('#lsn.gend'), 'giải hết → màn kết GameEnd');
assert.equal(rewards.length, 1); assert.equal(rewards[0].chess, 1); assert.ok(rewards[0].xp >= 5 && rewards[0].xp <= 40, 'XP theo luật game (trần 40)');
assert.equal(done[0].mode, 'chess'); assert.ok($('#lsnAgain'), 'nút chính Chơi lại');
const kb = ['chess-core', 'chess-puzzles', 'play-chess'].map(f => `web/cpack/play-app/${f}.js`).concat('web/cpack/game/game-chess.js').reduce((a, f) => a + fs.statSync(new URL('../../' + f, import.meta.url)).size, 0);
assert.ok(kb < 30 * 1024, `gói cờ ${Math.round(kb / 1024)} KB thô`);
console.log('play-chess OK');
