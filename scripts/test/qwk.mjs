// Lịch sử tuần qwk của #/qstats: save() cộng vào tuần hiện tại, giữ 8 tuần, dải tuần chỉ hiện khi có dữ liệu.
import fs from 'node:fs'; import vm from 'node:vm';
let fails = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };
const game = { qstat: {} };
const g = { Game: { mutate: async fn => { fn(game); return game; } }, App: { state: { game }, routes: {}, view: {} }, QE: { bandOf: (raw) => raw >= 30 ? 7 : 5 }, t: (k, v) => k.replace(/\{(\w+)\}/g, (m, n) => v[n]), Date, Math, Object, Array, String, Number, CustomEvent: class {} };
g.self = g; vm.createContext(g); g.window = g; g.globalThis = g;
vm.runInContext(fs.readFileSync(new URL('../../web/js/qtips.js', import.meta.url), 'utf8').replace(/^\(function \(g\) \{/, '(function (g) { const t = g.t;').replace(/\}\)\(typeof self[^\n]*$/, '})(self);'), g);
const day = 6048e5; const realNow = Date.now; let now = Math.floor(realNow() / day) * day + 1000;
g.Date = class extends Date { static now() { return now; } };
await g.QT.recordRaw('il', 'tfng', 3, 4, 10);
ok(game.qwk.il[Math.floor(now / day)].t === 4 && game.qwk.il[Math.floor(now / day)].r === 3, 'qwk ghi tuần hiện tại');
await g.QT.recordRaw('il', 'mcq', 2, 2, 5);
ok(game.qwk.il[Math.floor(now / day)].t === 6, 'cộng dồn cùng tuần');
for (let i = 1; i <= 10; i++) { now += day; await g.QT.recordRaw('il', 'mcq', 1, 1, 1); }
ok(Object.keys(game.qwk.il).length === 8, 'giữ đúng 8 tuần gần nhất');
ok(game.qstat['il:mcq'].t === 12, 'qstat cộng dồn không đổi');
process.exit(fails ? 1 : 0);
