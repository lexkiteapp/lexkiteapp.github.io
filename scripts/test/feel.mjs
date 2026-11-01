// 🎮 Kiểm lớp game feel (web/js/feel.js, docs/GAME-FEEL.md): ghi đè Sfx đúng, rơi về tiếng bíp khi chưa có file, tôn trọng tắt âm,
// streak-ui.js nạp sau KHÔNG ghi đè khóa đã giữ, giảm chuyển động → số XP nhảy thẳng tới cuối. Chạy thuần Node (vm), không trình duyệt.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const src = readFileSync(new URL('../../web/js/feel.js', import.meta.url), 'utf8');
function boot({ muted = false, reduced = false } = {}) {
  const calls = { tone: [], buzz: [] };
  const tone = (...a) => calls.tone.push(a), buzz = p => calls.buzz.push(p);
  // Bản sao đúng hành vi Sfx.extend của game.js (khóa Sfx.locked)
  const Sfx = { correct: () => calls.tone.push('old'), tap: () => {} };
  Sfx.extend = f => { const o = f(tone, buzz); for (const k of Sfx.locked || []) delete o[k]; Object.assign(Sfx, o); };
  const g = {
    Sfx, Core: { sfxOff: muted }, addEventListener() {}, matchMedia: () => ({ matches: reduced }),
    document: { querySelector: () => null, documentElement: { lang: 'en' } }, performance: { now: () => 0 }, requestAnimationFrame: () => {},
  };
  g.self = g; g.window = g;
  vm.runInNewContext(src, { self: g, matchMedia: g.matchMedia, performance: g.performance, requestAnimationFrame: g.requestAnimationFrame, getComputedStyle: () => ({}), fetch: () => Promise.reject(new Error('no net')) });
  return { g, Sfx, calls };
}

{ // chưa giải mã file → tiếng bíp dự phòng + rung giữ nguyên
  const { g, Sfx, calls } = boot();
  assert.ok(g.Feel && g.Feel.on, 'Feel phải có');
  Sfx.correct(); assert.equal(calls.tone.length, 1); assert.notEqual(calls.tone[0], 'old', 'phải dùng bản mới, không gọi hàm cũ'); assert.equal(JSON.stringify(calls.buzz), '[35]');
  Sfx.wrong(); assert.equal(JSON.stringify(calls.buzz.at(-1)), '[50,40,50]');
  // streak-ui.js nạp sau: không được ghi đè tap/combo/streak đã khóa
  const before = Sfx.tap; Sfx.extend(() => ({ tap: () => 'x', shimmer: () => 's' }));
  assert.equal(Sfx.tap, before, 'tap bị ghi đè'); assert.equal(typeof Sfx.shimmer, 'function', 'khóa chưa giữ vẫn thêm được');
}
{ // tắt âm → không phát gì (cả bíp), rung do buzz() của game.js tự kiểm tắt âm
  const { Sfx, calls } = boot({ muted: true });
  Sfx.correct(); Sfx.win(); Sfx.combo(5); assert.equal(calls.tone.length, 0, 'tắt âm mà vẫn kêu');
}
{ // giảm chuyển động → XP nhảy thẳng tới số cuối
  const { g } = boot({ reduced: true });
  const el = { textContent: '1240', setAttribute() {}, removeAttribute() {} };
  await g.Feel.count(el, 1252); assert.equal(el.textContent, '1,252');
  const bar = { attrs: {}, hasAttribute: () => true, setAttribute(k, v) { this.attrs[k] = v; }, firstElementChild: { style: { width: '20%' } } };
  assert.equal(g.Feel.fill(bar, 60), null, 'giảm chuyển động: không chạy hoạt ảnh'); assert.equal(bar.firstElementChild.style.width, '60%'); assert.equal(bar.attrs['aria-valuenow'], '60');
}
{ // công tắc Cài đặt: tắt → trả đúng hàm cũ + mở khóa; streak-ui nạp lúc tắt → bật lại vẫn là âm mới, tắt lại ra bíp của streak-ui
  const { g, Sfx } = boot();
  const newCorrect = Sfx.correct; g.Feel.set(false);
  assert.notEqual(Sfx.correct, newCorrect); assert.equal(Sfx.locked.length, 0);
  const st = () => 'streak-ui'; Sfx.extend(() => ({ tap: st })); assert.equal(Sfx.tap, st);
  g.Feel.set(true); assert.equal(Sfx.correct, newCorrect); assert.notEqual(Sfx.tap, st);
  g.Feel.set(false); assert.equal(Sfx.tap, st, 'tắt lại phải ra bíp streak-ui');
  const el = { textContent: '5', setAttribute() {}, removeAttribute() {} }; await g.Feel.count(el, 9); assert.equal(el.textContent, '9', 'tắt lớp: số nhảy thẳng');
}
console.log('feel: OK');
