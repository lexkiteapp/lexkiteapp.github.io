// Hồi quy 03/11 (run 41569456017): lượt fill vẽ 564 ảnh rồi giám khảo chấm không kịp hạn job → bị huỷ → 0 ảnh nhận.
// Khoá: (1) ngân sách vẽ ≤ ảnh giám khảo chấm kịp, (2) giám khảo ghi dần + tôn trọng --budget-min, (3) workflow dùng ngân sách + step timeout < job timeout.
import fs from 'fs'; import os from 'os'; import path from 'path'; import assert from 'assert/strict';
import { plan, measuredRate, DEFAULT_RATE, DRAW_PER_MIN, RESERVE_MIN } from '../vocab-img/judge-budget.mjs';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const now = 1_000_000;

// 1. số thật 03/11: còn ~100 phút, 564 nghĩa chờ → KHÔNG vẽ cả 564 khi giám khảo chậm
let p = plan({ now, deadline: now + 100 * 60, pending: 564, left: 6000, rate: 5 });
ok(p.cap > 0 && p.cap < 564, 'giám khảo 5 ảnh/phút: vẽ ít hơn 564 – ' + p.cap);
ok(p.cap / DRAW_PER_MIN + p.cap / 5 <= 100 - RESERVE_MIN + 0.5, 'vẽ + chấm vừa trong thời gian còn lại (trừ dự trữ)');
ok(p.judgeMin >= p.cap / 5 - 0.5, 'phút chấm đủ cho số ảnh đã vẽ');
p = plan({ now, deadline: now + 100 * 60, pending: 564, left: 6000, rate: 40 });
ok(p.cap === 564, 'giám khảo nhanh → vẽ hết 564 (không cắt oan)');
// 2. chưa đo → mặc định thận trọng; trần ảnh việc và hàng chờ luôn thắng
p = plan({ now, deadline: now + 100 * 60, pending: 5000, left: 40 });
ok(p.cap === 40 && p.rate === DEFAULT_RATE, 'trần ảnh việc (left) thắng; chưa đo dùng mặc định');
ok(plan({ now, deadline: now + 100 * 60, pending: 0, left: 10 }).cap === 0, 'hết nghĩa chờ → 0');
// 3. hết giờ → dừng, không vẽ ảnh không ai chấm
ok(plan({ now, deadline: now + (RESERVE_MIN + 7) * 60, pending: 500, left: 500, rate: 10 }).cap === 0, 'còn < 8 phút hữu ích → 0');
ok(plan({ now, deadline: now - 60, pending: 500, left: 500, rate: 10 }).cap === 0, 'quá hạn → 0');
// 4. tốc độ đo thật từ speed.judge.a*.json (cộng dồn nhiều biến thể; ít hơn 5 ảnh = chưa tin)
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'jb-'));
ok(measuredRate(d) === 0, 'chưa có file → 0');
fs.writeFileSync(path.join(d, 'speed.judge.a1.json'), JSON.stringify({ images: 100, minutes: 20 }));
fs.writeFileSync(path.join(d, 'speed.judge.a2.json'), JSON.stringify({ images: 50, minutes: 5 }));
ok(Math.abs(measuredRate(d) - 6) < 1e-9, 'cộng dồn ảnh / cộng dồn phút = 6');
fs.rmSync(d, { recursive: true });

// 5. giám khảo: ghi dần + ngân sách phút (kiểm nguồn – CI test không cài torch)
const py = fs.readFileSync('scripts/vocab-img/local_judge.py', 'utf8');
ok(/--budget-min/.test(py) && /time\.time\(\) > deadline/.test(py), 'local_judge có --budget-min và kiểm hạn từng ảnh');
ok(/def save\(\)/.test(py) && /os\.replace\(out_f \+ '\.tmp', out_f\)/.test(py) && /n - saved_n >= 8/.test(py), 'local_judge ghi nguyên tử mỗi 8 ảnh');
ok(!/ask_conf.*=\s*[0-6]\d\b/.test(py.split('def main')[1].slice(0, 200)), 'không đụng ngưỡng giám khảo');

// 6. workflow fill
const y = fs.readFileSync('.github/workflows/vocab-img-scene.yml', 'utf8');
const loop = y.slice(y.indexOf('Biến thể 1..V'), y.indexOf('uses: actions/upload-artifact', y.indexOf('Biến thể 1..V')));
ok(/timeout-minutes: 118/.test(loop), 'bước vòng lặp có timeout nhỏ hơn job (130)');
ok(/judge-budget\.mjs/.test(loop) && /VIMG_MAX_CF=\$BUD_CAP/.test(loop) && /--budget-min/.test(loop), 'vẽ theo ngân sách, chấm có --budget-min');
ok(/VIMG_CONSENSUS: '1'/.test(y), 'giám khảo kép vẫn bật');
console.log(`vocab-img-judge-budget: ${n} kiểm OK`);

// 7. judge_run: cứu ảnh đã vẽ của lượt cũ (không vẽ lại) – chia shard phủ đủ, không trùng, copy đúng ảnh, chạy lại không nhân đôi
{
  const { prep, shardKeys, imagesOf, slug } = await import('../vocab-img/judge-run-prep.mjs');
  const keys = Array.from({ length: 60 }, (_, i) => `word${i}#n`);
  const N = 4, sets = Array.from({ length: N }, (_, i) => shardKeys(keys, i, N));
  ok(sets.flat().length === 60 && new Set(sets.flat()).size === 60, 'các shard phủ đủ khoá, không trùng');
  ok(slug('a b#n') === 'a-b__n', 'slug trùng local_judge');
  ok(imagesOf(['x__n.a1.jpg', 'x__n.a1.c2.jpg', 'xy__n.a1.jpg', 'x__n.a2.jpg'], 'x#n').length === 3, 'ảnh + ứng viên của đúng khoá');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jr-')), o = path.join(root, 'old/vimg-fill-0/out/vimg-fill');
  fs.mkdirSync(path.join(o, 'raw'), { recursive: true });
  fs.writeFileSync(path.join(root, 'old/vimg-fill-0/keys.json'), JSON.stringify({ items: keys }));
  fs.writeFileSync(path.join(o, 'targets.json'), JSON.stringify(Object.fromEntries(keys.map(k => [k, { kind: 'scene', prompt: 'p', target: 't' }]))));
  fs.writeFileSync(path.join(o, 'gen-stats.s0.json'), '{}');
  for (const k of keys) fs.writeFileSync(path.join(o, 'raw', slug(k) + '.a1.jpg'), 'x');
  let tot = 0;
  for (let i = 0; i < N; i++) {
    const out = path.join(root, 'out' + i), r = prep({ src: path.join(root, 'old'), out, shard: [i, N] });
    ok(r.mine === sets[i].length && fs.readdirSync(path.join(out, 'raw')).length === r.mine, `shard ${i}: đúng ảnh của mình`);
    ok(Object.keys(JSON.parse(fs.readFileSync(path.join(out, 'targets.json')))).length === 60, 'targets.json đủ mọi khoá (giám khảo cần anh em)');
    ok(fs.existsSync(path.join(out, 'gen-stats.s0.json')) === (i === 0), 'thống kê vẽ cũ chỉ đi cùng việc 0 (không nhân đôi neuron/ảnh)');
    tot += r.images; prep({ src: path.join(root, 'old'), out, shard: [i, N] });   // chạy lại
    ok(fs.readdirSync(path.join(out, 'raw')).length === r.mine, 'chạy lại không nhân đôi');
  }
  ok(tot === 60, 'tổng ảnh chuyển = 60');
  fs.rmSync(root, { recursive: true });
  ok(/judge_run: \{/.test(y) && /judge_run == ''/.test(y), 'workflow có input judge_run, bước vẽ bị bỏ khi dùng');
  const jr = y.slice(y.indexOf('Chấm ảnh của lượt cũ'), y.indexOf('Biến thể 1..V'));
  ok(/judge-run-prep\.mjs/.test(jr) && /--budget-min/.test(jr) && /timeout-minutes: 118/.test(jr) && !/scene-gen/.test(jr), 'nhánh judge_run: chuẩn bị + chấm có ngân sách + timeout, không gọi scene-gen');
  ok(/judge_run: không nối lượt vẽ mới/.test(y), 'judge_run không tự nối lượt vẽ mới');
}
console.log(`vocab-img-judge-budget (judge_run): tổng ${n} kiểm OK`);
