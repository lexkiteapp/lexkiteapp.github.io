// Cổng khớp miệng ±33 ms (chủ 05/11: "lệch miệng"): đồng hồ hiển thị của mặt vẽ (LipSync.clock, web/js/call/lipsync.js) so với tiếng THẬT tới tai
// tại lúc khung hiện ra. Mô phỏng: audio.currentTime làm mới theo bậc (Chrome ~4 ms, Firefox 15 ms, Safari ~50 / 250 ms) · rAF 60 Hz / 120 Hz / máy yếu
// 30 Hz có giật · trễ loa 0 / 40 ms / Bluetooth 200 ms · nghe chậm 0,75×. Đo |hình – tiếng| mỗi khung; ngưỡng: p95 ≤ 33 ms, tối đa ≤ 50 ms (không nới).
// Đồng thời in số đo cách CŨ (đọc thẳng currentTime) để PR có trước/sau – cách cũ PHẢI trượt (chứng minh test bắt được lỗi gốc).
import assert from 'node:assert/strict'; import { createRequire } from 'node:module';
const LS = createRequire(import.meta.url)('../../web/js/call/lipsync.js');
const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);
function run({ step, hz, jit, lat, rate, old }) {
  const period = 1000 / hz, dur = 6000, errs = [];
  let ct = 0, nextUp = 0; const t0 = 300; // tiếng bắt đầu lúc 300 ms
  const pos = ms => Math.max(0, (ms - t0) / 1000 * rate); // vị trí giải mã thật
  const el = { get currentTime() { return ct; } };
  const clk = old ? () => el.currentTime : LS.clock(() => ({ t: el.currentTime, playing: true, rate }), () => lat / 1000);
  for (let now = t0; now < t0 + dur; now += period * (1 + (jit ? (rnd() - 0.5) * jit : 0))) {
    while (nextUp <= now) { ct = pos(nextUp); nextUp += step; } // currentTime làm mới theo bậc (giá trị = vị trí lúc làm mới)
    const shown = clk(now), present = now + period; // khung vẽ ở rAF này hiện ra ~1 chu kỳ sau
    const heard = pos(present - lat); // tiếng đang tới tai lúc khung hiện
    if (present - lat > t0 + 200) errs.push(Math.abs(shown - heard) * 1000 / rate); // bỏ 200 ms đầu (khởi động); quy về ms tiếng thật
  }
  errs.sort((a, b) => a - b); return { p95: Math.round(errs[Math.floor(errs.length * 0.95)]), max: Math.round(errs[errs.length - 1]) };
}
const CASES = [];
for (const step of [4, 15, 50, 250]) for (const [hz, jit] of [[60, 0], [120, 0], [30, 0.6]]) for (const lat of [0, 40, 200]) for (const rate of [1, 0.75]) CASES.push({ step, hz, jit, lat, rate });
let worst = { p95: 0, max: 0 }, oldWorst = { p95: 0, max: 0 }, oldFail = 0, bad = [];
for (const c of CASES) {
  const n = run(c), o = run({ ...c, old: true });
  if (n.p95 > worst.p95) worst.p95 = n.p95; if (n.max > worst.max) worst.max = n.max;
  if (o.p95 > oldWorst.p95) oldWorst.p95 = o.p95; if (o.max > oldWorst.max) oldWorst.max = o.max; if (o.p95 > 33) oldFail++;
  if (n.p95 > 33 || n.max > 50) bad.push(`${JSON.stringify(c)} → p95 ${n.p95} max ${n.max} ms`);
}
console.log(`lip-clock: ${CASES.length} cấu hình · MỚI p95 xấu nhất ${worst.p95} ms, max ${worst.max} ms · CŨ (currentTime trần) p95 xấu nhất ${oldWorst.p95} ms, ${oldFail}/${CASES.length} cấu hình > 33 ms`);
assert.equal(bad.length, 0, 'đồng hồ khớp miệng lệch > ±33 ms:\n' + bad.join('\n'));
assert.ok(oldFail > 0, 'test không bắt được lỗi gốc (cách cũ phải trượt)');
// không bao giờ lùi khi đang phát (miệng giật ngược)
{ let ct = 0; const c = LS.clock(() => ({ t: ct, playing: true, rate: 1 })); let prev = 0;
  for (let now = 0; now < 3000; now += 16.7) { if (Math.floor(now / 250) !== Math.floor((now - 16.7) / 250)) ct = Math.floor(now / 250) * 0.25 - 0.03; const v = c(now); assert.ok(v >= prev - 1e-9, 'đồng hồ lùi lúc ' + now); prev = v; } }
// dừng → đứng yên, tua → nhảy theo
{ let s = { t: 1, playing: false, rate: 1 }; const c = LS.clock(() => s); const a = c(0), b = c(500); assert.equal(a, b, 'tạm dừng phải đứng yên');
  s = { t: 4, playing: true, rate: 1 }; assert.ok(Math.abs(c(520) - 4) < 0.05, 'tua phải theo ngay'); }
console.log('lip-clock OK');
