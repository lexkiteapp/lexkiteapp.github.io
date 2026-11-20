// Call RT (web/js/call/endpoint.js + fillers.js, docs/specs/call-realtime.md M1): biết nói xong với độ chờ im thích nghi,
// nói chen chặt hơn (≤ 3 khung ≈ 96 ms), năng lượng dự phòng, câu đệm ngắn đúng 2 giáo viên. Logic thuần – khung giả 32 ms.
import fs from 'node:fs'; import vm from 'node:vm'; import assert from 'node:assert/strict';
const c = {}; vm.createContext(c); c.self = c;
for (const f of ['call/endpoint.js', 'call/fillers.js']) vm.runInContext(fs.readFileSync('web/js/' + f, 'utf8'), c);
const EP = c.CallEP; let n = 0;
const ok = (v, m) => { assert.ok(v, m || 'lỗi'); n++; };
const F = 32;
// chạy chuỗi [p, ms] → mốc sự kiện
const run = (ep, seq, hints = {}) => { let t = 0; const ev = []; for (const [p, ms] of seq) for (let k = 0; k < ms; k += F) { if (hints[t] != null) ep.hint(hints[t]); const e = ep.push(p, t); if (e) ev.push([e, t]); t += F; } return ev; };

// 1. lượt thường: nói 1,5 s rồi im → 'start' sau 3 khung, 'end' sau 550 ms im (chưa có chữ tạm)
{ const ev = run(EP.create({ mode: 'turn' }), [[0.05, 320], [0.9, 1500], [0.05, 1500]]);
  ok(ev.length === 2 && ev[0][0] === 'start' && ev[1][0] === 'end', JSON.stringify(ev));
  ok(ev[0][1] - 320 <= 3 * F, 'start ≤ 3 khung'); const silent = ev[1][1] - (320 + 1504); ok(silent >= 520 && silent <= 600, 'hangover 550: ' + silent); }
// 2. ngập ngừng ngắn (400 ms) giữa câu KHÔNG bị cắt
{ const ev = run(EP.create({ mode: 'turn' }), [[0.9, 800], [0.1, 400], [0.9, 800], [0.05, 1200]]);
  ok(ev.filter(e => e[0] === 'end').length === 1 && ev[1][1] > 2000, 'không cắt ở khoảng nghỉ 400 ms: ' + JSON.stringify(ev)); }
// 3. câu dở ("…because") → chờ 1000 ms; ngập ngừng 800 ms vẫn giữ
{ const ep = EP.create({ mode: 'turn' }); const ev = run(ep, [[0.9, 1000], [0.1, 800], [0.9, 600], [0.05, 1500]], { 992: 'I like it because' });
  ok(ev.filter(e => e[0] === 'end').length === 1 && ev[1][1] > 2400, 'câu dở giữ 1000 ms: ' + JSON.stringify(ev)); }
// 4. câu trọn đủ từ → chốt nhanh 350 ms
{ const ep = EP.create({ mode: 'turn', minWords: 4 }); const ev = run(ep, [[0.9, 1504], [0.05, 1000]], { 1472: 'I usually go to work by bus' });
  const silent = ev[1][1] - 1504; ok(silent >= 320 && silent <= 400, 'câu trọn 350: ' + silent); }
// 5. Part 2 (long): nghỉ 1 s để nghĩ vẫn chưa xong
{ const ev = run(EP.create({ mode: 'turn', long: true }), [[0.9, 2000], [0.1, 1000], [0.9, 1000], [0.05, 1600]]);
  ok(ev.filter(e => e[0] === 'end').length === 1 && ev[1][1] > 4000, 'long 1200: ' + JSON.stringify(ev)); }
// 6. nói chen: tiếng vọng nhỏ (0,6) không kích hoạt, tiếng thật > 0,8 → 'start' trong ≤ 3 khung (≈ 96 ms ≪ 200 ms), chỉ 1 lần
{ const ev = run(EP.create({ mode: 'barge' }), [[0.6, 1000], [0.95, 600], [0.1, 300], [0.95, 300]]);
  ok(ev.length === 1 && ev[0][0] === 'start' && ev[0][1] - 1024 <= 3 * F, 'barge: ' + JSON.stringify(ev)); }
// 6b. nói chen – vết khung THẬT từ CI (call-rt 16/11, runner EPYC): xác suất Silero dao động giữa chừng dù giọng vẫn còn → bộ đếm rò (khung ≥ 0,5 +1, < 0,5 −1) + ≥ 1 khung > 0,8
//     (luật cũ "3 khung liền > 0,8" hush ở 220–295 ms; hysteresis 1 lần vẫn bị khung 0,49 cắt). Giá trị = chỉ số khung (×32 ms) lúc 'start'.
{ const seq = p => p.map(x => [x, F]); const at = (ps) => { const ev = run(EP.create({ mode: 'barge' }), seq(ps)); return ev.length ? ev[0][1] / F : -1; };
  ok(at([0, 0.57, 0.69, 0.97, 0.79, 0.79, 0.85, 1, 1]) === 3, 'barge mẫu 251 ms (57→69→97): hush ở khung 3, không đợi 3 khung > 0,8 liền');
  ok(at([0, 0.12, 0.6, 0.87, 0.72, 0.77, 0.59, 0.95, 1, 1]) === 4, 'barge mẫu 293 ms (60→87→72): hush ở khung 4');
  ok(at([0, 0, 0, 0.35, 0.59, 0.92, 0.54, 0.49, 0.55, 1, 1, 1]) === 6, 'barge mẫu 295 ms (35→59→92→54→49→55→100): khung 0,49 KHÔNG đặt đếm về 0 → hush ở khung 6 (≈135 ms), không phải 295 ms');
  ok(at([0, 0.38, 0.75, 0.7, 0.85, 0.88, 0.98, 1]) === 4, 'barge mẫu 219 ms (tăng chậm 38→75→70→85): hush ở khung 4 (≈148 ms)');
  ok(at([0, 0.96, 1, 1]) === 3, 'barge giọng rõ: vẫn đúng 3 khung (≈ 96 ms)');
  ok(at([0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6]) === -1, 'barge: tiếng vọng/nền 0,6 kéo dài KHÔNG bao giờ kích (không có khung > 0,8)');
  ok(at([0.7, 0.75, 0.79, 0.78, 0.7, 0.75, 0.79, 0.78]) === -1, 'barge: nền 0,7–0,79 sát nhưng không có khung > 0,8 → KHÔNG kích');
  ok(at([0.9, 0.3, 0.9, 0.3, 0.9, 0.3, 0.9, 0.3]) === -1, 'barge: xung lẻ > 0,8 xen khung thấp (1,0,1,0…) KHÔNG lên được 3 → không kích');
  ok(at([0.9, 0.3, 0.2, 0.1, 0.9, 0.3, 0.2, 0.1]) === -1, 'barge: các xung rời nhau (cách ≥ 2 khung thấp) → không kích');
  ok(at([0.9, 0.5, 0.5]) === 2, 'barge: biên – 0,9 rồi hai khung đúng 0,5 vẫn đếm đủ 3'); }
// 7. tiếng lách cách 1–2 khung không phải lời
{ ok(run(EP.create({ mode: 'turn' }), [[0.9, 64], [0.05, 500], [0.9, 32], [0.05, 500]]).length === 0, 'nháy ngắn bị bỏ'); }
// 8. năng lượng dự phòng: nền ồn ổn định → p≈0; tiếng to gấp 8 lần → p≈1; nền ồn tăng chậm không thành lời
{ const e = EP.energy(); let p = 0; for (let k = 0; k < 60; k++) p = e(0.01); ok(p < 0.1, 'nền ồn: ' + p);
  p = e(0.09); ok(p > 0.9, 'tiếng nói: ' + p);
  const e2 = EP.energy(); for (let k = 0; k < 60; k++) e2(0.01); let mx = 0; for (let k = 0; k < 600; k++) mx = Math.max(mx, e2(0.01 * (1 + k / 300))); ok(mx < 0.5, 'nền ồn tăng dần: ' + mx); }
// 9. câu dở nhận đúng
for (const s of ['and', 'I think um', 'because', 'my favourite is the']) ok(EP.OPEN.test(s), 'dở: ' + s);
for (const s of ['I like it.', 'Yes, every day', 'It was great']) ok(!EP.OPEN.test(s), 'trọn: ' + s);
// 10. câu đệm: đủ 2 giáo viên, ack ≥ 4 câu, mỗi câu ≤ 4 từ (≤ 0,8 s), không trùng
for (const who of ['ama', 'carlos']) { const f = c.CALL_FILLERS[who]; ok(f && f.ack.length >= 4 && f.think.length >= 2, who);
  for (const x of [...f.ack, ...f.think]) ok(x.split(/\s+/).length <= 4 && /[.!?]$/.test(x), who + ': ' + x); ok(new Set(f.ack).size === f.ack.length, who + ' trùng'); }
console.log(`✓ call-rt: ${n} kiểm tra`);
