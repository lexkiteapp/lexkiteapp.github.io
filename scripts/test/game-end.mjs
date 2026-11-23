// 🏁 Màn kết mini-game chung (web/cpack/game/game-end.js, docs/specs/game-system.md P3) trên khung Stitch lesson-complete thật:
// ô số chỉ hiện số thật, nút Chơi lại / Chế độ khác / chia sẻ (chỉ khi có), chấm tuần 7 ngày, khe .celebrate cho path-reward,
// Sfx.finish gọi một lần đúng ngưỡng; 4 màn (blitz, nhịp, ghép thẻ, nói từ) đều dùng GameEnd – không còn thẻ .celebrate cũ.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import jsdom from 'jsdom';
import { withGameEnd } from '../lib/game-end-env.mjs';

const dom = new jsdom.JSDOM('<!doctype html><html lang="en"><body><main id="view"></main></body></html>', { url: 'https://lexkite.com/app/#/practice/match', runScripts: 'outside-only', pretendToBeVisual: true });
const w = dom.window, view = w.document.getElementById('view'), fin = [], said = [];
w.t = (s, v) => (v ? s.replace(/\{(\w+)\}/g, (m, k) => v[k]) : s);
w.UI = { esc: s => String(s).replace(/[<>&"]/g, ''), speak: x => said.push(x) };
w.Sfx = { finish: o => fin.push(o) };
const today = new Date(), key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
w.App = { view, streak: () => 3, activeDays: () => new Set([key(today)]) };
withGameEnd(w);
await w.App.need('gend');
assert.ok(w.GameEnd && w.ST2 && w.ST2['lesson-complete'], "gói 'gend' nạp GameEnd + khung lesson-complete");

let again = 0;
const root = w.GameEnd.show(view, { icon: '⚡', chip: 'Ghép thẻ', head: '🏅 Kỷ lục mới!', acc: 75, xp: 18, good: 0,
  tiles: [['12.5s', 'Thời gian'], [2, 'Lần sai']], words: ['apple', 'river'], more: w.GameEnd.row('style', '', '<span lang="en">apple</span> = táo'),
  again: { label: 'Chơi lại', fn: () => again++ }, rev: { label: 'Chế độ khác', href: '#/practice?src=deck' } });
const $ = s => root.querySelector(s);
assert.ok(root.id === 'lsn' && root.classList.contains('gend'), 'gốc màn #lsn.gend');
assert.equal($('h1').textContent, '🏅 Kỷ lục mới!', 'tiêu đề = dòng kỷ lục của game (không phải "Hoàn thành bài học!")');
const tiles = [...root.querySelectorAll('.lsn-tiles > div')];
assert.deepEqual(tiles.map(x => x.hidden), [false, false, true, true], 'chỉ 2 ô có số thật – 2 ô còn lại ẩn (không vẽ số giả)');
assert.equal(tiles[0].children[0].textContent, '12.5s'); assert.equal(tiles[1].children[1].textContent, 'Lần sai');
assert.ok(/\+18 XP/.test($('.lsn-xp').textContent), 'viên XP');
assert.ok(/75%/.test(root.textContent), 'nhãn chính xác 75%');
assert.equal(root.querySelectorAll('.lsn-ring svg > circle')[2].style.display, 'none', 'không có ring2 → ẩn vòng trong');
assert.equal(root.querySelectorAll('.lsn-week > div:nth-child(2) > div').length, 7, '7 chấm tuần');
assert.ok(/3/.test($('.lsn-week').textContent), 'chuỗi hiện tại = App.streak');
assert.ok(/Chơi lại/.test($('#lsnAgain').textContent) && $('#lsnAgain svg'), 'nút chính đổi chữ thành Chơi lại, giữ mũi tên');
$('#lsnAgain').click(); assert.equal(again, 1, 'Chơi lại gọi lại game');
assert.equal($('#lsnRev').getAttribute('href'), '#/practice?src=deck'); assert.ok(/Chế độ khác/.test($('#lsnRev').textContent));
assert.equal($('#lsnShare'), null, 'không truyền share → bỏ nút chia sẻ (không nút giả)');
assert.ok($('.celebrate.gend-pr') && $('.celebrate.gend-pr').nextElementSibling === $('.lsn-cta'), 'khe .celebrate cho path-reward ngay trên nút');
assert.deepEqual([...root.querySelectorAll('.lsn-sub [data-say]')].map(b => b.dataset.say), ['apple', 'river']);
root.querySelector('.lsn-sub [data-say]').click(); assert.deepEqual(said, ['apple'], 'chạm từ → nghe');
assert.ok(/táo/.test($('.lsn-sub').textContent), 'dòng phụ (more) hiện');
assert.equal(fin.length, 1); assert.equal(fin[0].good, 0, 'good: 0 giữ nguyên (ghép thẻ luôn ăn mừng)'); assert.equal(fin[0].pct, 75);
assert.equal(w.document.activeElement, $('#lsnAgain'), 'tiêu điểm vào nút chính');

// chia sẻ (blitz: Thách đấu bạn bè) + vòng trong
let shared = 0;
const r2 = w.GameEnd.show(view, { chip: 'x', acc: 100, xp: 40, ring2: 0.5, tiles: [[1, 'a'], [2, 'b'], [3, 'c'], [4, 'd'], [5, 'e']], share: { label: 'Thách đấu bạn bè', fn: () => shared++ } });
assert.equal(r2.querySelector('#lsnShare').getAttribute('aria-label'), 'Thách đấu bạn bè'); r2.querySelector('#lsnShare').click(); assert.equal(shared, 1);
assert.equal([...r2.querySelectorAll('.lsn-tiles > div')].filter(x => !x.hidden).length, 4, 'tối đa 4 ô');
assert.notEqual(r2.querySelectorAll('.lsn-ring svg > circle')[2].style.display, 'none', 'có ring2 → vòng trong hiện');
assert.equal(fin[1].good, 80, 'mặc định ngưỡng ăn mừng 80');

// 4 màn kết dùng GameEnd, không còn thẻ .celebrate cũ
for (const [f, n] of [['web/cpack/play-app/play-blitz.js', 1], ['web/cpack/play-app/play-rhythm.js', 1], ['web/js/study-games.js', 2]]) {
  const s = fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
  assert.equal((s.match(/GameEnd\.show\(view/g) || []).length, n, f + ': dùng GameEnd.show'); assert.ok(!/card empty celebrate/.test(s), f + ': không còn thẻ kết cũ');
  assert.ok(/App\.need\('gend'\)/.test(s), f + ": tải gói 'gend'");
}
console.log('game-end OK');
