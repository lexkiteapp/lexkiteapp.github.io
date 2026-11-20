// Bảng rung theo sự kiện (web/js/game.js Sfx.haptic): đúng/sai/chuỗi/xong bài + cổng chung (tắt âm, giảm chuyển động, công tắc Rung) + native.js phát mẫu tuần tự.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const mk = ({ muted = false, rm = false, coarse = true, haptics } = {}) => {
  const calls = [], ls = new Map(haptics === undefined ? [] : [['vb.haptics', haptics]]);
  const doc = { documentElement: { dataset: {} }, addEventListener() {}, getElementById: () => null, querySelector: () => null, createElement: () => ({}), head: { appendChild() {} }, hidden: false }; // game.js nạp js/feel.js khi game feel bật (mặc định từ 3/11): stub đủ DOM để nạp, không ảnh hưởng bảng rung
  const g = { Core: { Store: {}, todayKey: () => 'k', sfxOff: muted }, document: doc, localStorage: { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, v) } };
  g.self = g; g.navigator = { vibrate: p => { calls.push(p); return true; }, serviceWorker: null };
  g.matchMedia = q => ({ matches: /reduce/.test(q) ? rm : /coarse/.test(q) ? coarse : false });
  g.setTimeout = setTimeout; g.Date = Date;
  const ctx = vm.createContext(Object.assign(g, { window: g, console }));
  vm.runInContext(fs.readFileSync('web/js/game.js', 'utf8'), ctx);
  return { Sfx: g.Sfx, calls, doc };
};
let r = mk();
for (const [ev, want] of [['correct', 35], ['wrong', [50, 40, 50]], ['streak', [30, 40, 70]], ['done', [30, 40, 70, 60, 110]]]) { r.calls.length = 0; r.Sfx.haptic(ev); ok(JSON.stringify(r.calls[0]) === JSON.stringify(want), `sự kiện ${ev}`); }
ok(r.Sfx.HAPTIC.done.length > r.Sfx.HAPTIC.wrong.length, 'xong bài rung dài hơn sai');
r.calls.length = 0; r.Sfx.win(); ok(r.calls.length === 1, 'Sfx.win (xong bài) có rung');
r = mk({ muted: true }); r.Sfx.haptic('correct'); ok(!r.calls.length, 'tắt âm → không rung');
r = mk({ rm: true }); r.Sfx.haptic('correct'); ok(!r.calls.length, 'giảm chuyển động → không rung');
r = mk({ coarse: false }); r.Sfx.haptic('correct'); ok(!r.calls.length, 'không cảm ứng → không rung');
r = mk({ haptics: '0' }); r.Sfx.haptic('done'); ok(!r.calls.length && r.Sfx.haptics() === false, 'công tắc Rung tắt → không rung');
r.Sfx.haptics(true); ok(r.Sfx.haptics() === true, 'bật lại'); ok(r.calls.length === 1, 'bật lại có rung thử');
ok(['morning', 'noon', 'evening'].includes(r.doc.documentElement.dataset.daypart), 'html[data-daypart] được đặt');
// native.js: mẫu [rung, nghỉ, rung] phát tuần tự qua Haptics.vibrate
const src = fs.readFileSync('web/js/native.js', 'utf8'); ok(/hapT/.test(src) && !/Array\.isArray\(p\) \? p\[0\]/.test(src), 'native.js phát cả mẫu, không chỉ phần tử đầu');
// mọi chỗ rung đi qua cổng chung
for (const f of ['study.js', 'study-swipe.js', 'retention.js']) ok(!/navigator\.vibrate\(/.test(fs.readFileSync('web/js/' + f, 'utf8')), `${f} không gọi navigator.vibrate trực tiếp`);
// CSS: nền tối giữ #10191B, daypart chỉ đổi --dp
const css = fs.readFileSync('web/css/style.css', 'utf8'); ok(/data-daypart/.test(css) && !/data-daypart[^{]*\{[^}]*background/.test(css), 'daypart không đổi nền');
console.log(`haptics: ${n} kiểm tra PASS`);
