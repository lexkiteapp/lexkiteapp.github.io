// 🧭 Bật dần cờ ux1 (web/js/app.js ux1On/ux1Arm/ux1Track, docs/LEARNING-PATH.md §6): chạy đúng mã thật trong môi trường giả – nhóm cố định theo máy, % từ config, tắt khẩn, đo D1/D7
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rd = f => fs.readFileSync(f, 'utf8'), app = rd('web/js/app.js');
let pass = 0; const ok = (c, m) => { assert.ok(c, m); pass++; };
const lines = app.split('\n'), from = lines.findIndex(l => l.includes('const ux1Cfg = ')), to = lines.findIndex(l => l.includes('App.ux1Track = '));
ok(from > 0 && to > from, 'tìm thấy khối cờ ux1 trong app.js');
const code = lines.slice(from, to + 1).join('\n');
const run = (cfg, ub, { q = '', marks = {}, rnd = 0.5 } = {}) => {
  const store = { 'lk.cfg': JSON.stringify({ v: cfg }), ...(ub == null ? {} : { 'lk.ub': String(ub) }), ...marks }, ss = {}, sent = [];
  const mem = s => ({ getItem: k => (k in s ? s[k] : null), setItem: (k, v) => { s[k] = String(v); } });
  const env = { App: {}, location: { search: q, hash: '', hostname: 'lexkite.com' }, localStorage: mem(store), sessionStorage: mem(ss), navigator: { sendBeacon: (u, d) => sent.push(JSON.parse(d).ev) }, JSON, Math: Object.assign(Object.create(Math), { random: () => rnd }), isNaN, String };
  vm.runInNewContext(code, env); return { A: env.App, store, sent };
};
ok(run({}, 3).A.ux1On() === false && run({ ux1_pct: '0' }, 0).A.ux1On() === false, 'chưa đặt / ux1_pct 0 → tắt (công tắc khẩn)');
ok(run({ ux1_pct: '10' }, 0).A.ux1On() && run({ ux1_pct: '10' }, 9).A.ux1On() && !run({ ux1_pct: '10' }, 10).A.ux1On() && !run({ ux1_pct: '10' }, 99).A.ux1On(), 'ux1_pct 10: đúng nhóm 0–9 bật');
ok(run({ ux1_pct: 25 }, 24).A.ux1On() && !run({ ux1_pct: 25 }, 25).A.ux1On(), 'pct dạng số cũng đọc được');
ok(!run({ ux1_pct: '100', ux1: '0' }, 0).A.ux1On() && run({ ux1: '1' }, 99).A.ux1On() && run({ ux1: true }, 99).A.ux1On(), "ux1 '0' tắt khẩn thắng pct / '1' bật hết");
ok(run({ ux1_pct: '10' }, 99, { marks: { 'lk.ux1': '1' } }).A.ux1On() && !run({ ux1_pct: '10' }, 0, { marks: { 'lk.ux1': '0' } }).A.ux1On() && run({}, 99, { q: '?ux1=1' }).A.ux1On(), 'lk.ux1 / ?ux1=1 thử trên máy thắng config');
{ const r = run({ ux1_pct: '10' }, null, { rnd: 0.073 }); ok(r.A.ux1On() === true && r.store['lk.ub'] === '7', 'máy mới: tạo nhóm lk.ub 0–99 một lần');
  r.store['lk.cfg'] = JSON.stringify({ v: { ux1_pct: '0' } }); ok(r.A.ux1On() === true, 'chốt theo lượt tải trang (không đổi giao diện giữa chừng)');
  const r2 = run({ ux1_pct: '10' }, null, { rnd: 0.99 }); r2.A.ux1On(); ok(r2.store['lk.ub'] === '99' && run({ ux1_pct: '10' }, 99, { rnd: 0 }).store['lk.ub'] === '99', 'nhóm cố định: đã có lk.ub thì không đổi'); }
ok(run({ ux1_pct: '10' }, 'abc', { rnd: 0.02 }).A.ux1On() === true, 'lk.ub hỏng → tạo lại');
ok(!run({ ux1_pct: '10' }, 5).store['lk.rb'], 'không dùng chung nhóm lk.rb của ret');
// đo D1/D7
ok(run({ ux1_pct: '10' }, 3).A.ux1Arm() === 'on' && run({ ux1_pct: '10' }, 55).A.ux1Arm() === 'off' && run({ ux1_pct: '10' }, 30).A.ux1Arm() === '', 'nhóm bật / đối chứng cùng cỡ / ngoài thử nghiệm');
ok(run({ ux1: '1', ux1_pct: '10' }, 3).A.ux1Arm() === '' && run({ ux1: '0', ux1_pct: '10' }, 3).A.ux1Arm() === '' && run({ ux1_pct: '60' }, 3).A.ux1Arm() === '', 'bật hết / tắt khẩn / pct > 50 → hết đo');
{ const r = run({ ux1_pct: '10' }, 55); r.A.ux1Track(1); r.A.ux1Track(2); r.A.ux1Track(3); r.A.ux1Track(7); r.A.ux1Track(9);
  ok(r.sent.join() === 'ux1_off_seen,ux1_off_d1,ux1_off_d7', 'seen/d1/d7 mỗi loại gửi 1 lần/máy: ' + r.sent.join());
  const r2 = run({ ux1_pct: '10' }, 3, { marks: { 'lk.noTrack': '1' } }); r2.A.ux1Track(9); ok(!r2.sent.length, 'máy quản trị không gửi'); }
// máy chủ: khóa công khai + quản trị + sự kiện được nhận
ok(/'ux1', 'ux1_pct'/.test(rd('functions/api/config.js')) && /'ux1', 'ux1_pct'/.test(rd('functions/api/admin.js')), 'ux1/ux1_pct có trong PUBLIC_KEYS + CONFIG_KEYS');
{ const h = rd('functions/api/hit.js'); ok(/UX1_EV\.includes\(b\.ev\)\)\)/.test(h) && /UX1_EV\.includes\(b\.ev\) \? 'ux1:'/.test(h), 'hit.js nhận ux1_* → kind ux1:'); }
console.log(`✓ ux1-rollout: ${pass} kiểm tra đạt`);
