// Test hồi quy cổng lệch miệng rig 2D (scripts/rig/lag.mjs, cổng render.py lipsync_lag ≤ 45 ms). Dữ liệu thật: mốc âm vị Kokoro + RMS 100 Hz của 10 câu
// (es-age-be, hi-good-name, pt_BR-people-are#2, pt_BR-actually#2; lượt CI 02/11) trong fixtures/rig-lag.json – không cần Kokoro/wav. Chạy: node scripts/test/rig-lag.mjs
// 1) đúng: mọi câu |lag| ≤ 45. Ca lỗi đo cũ: es-age-be 60 ms (âm vị đầu câu cộng trùng), people-are#2 220 ms (cụm cắt giữa từ), actually#2 −50 ms (bật "t" coi là mép)
// 2) miệng trễ 60 ms so với tiếng → cổng PHẢI đỏ (mọi câu); sớm 80 ms → cũng đỏ. Engine cố ý cho miệng đi trước LEAD (20 ms) → "trễ 60 ms so với tiếng" = dời cue LEAD + 60 ms
// 3) gốc: âm vị đầu câu Kokoro muộn hơn tiếng (kokoroOnsetMs > 0) nhưng miệng rời X đúng mép tiếng (mouthOnsetMs ≈ −LEAD)
// 4) một ngưỡng bật tiếng: align() mặc định neo cue đúng LS.onsets (cùng ONSET)
import fs from 'node:fs'; import { createRequire } from 'node:module'; import { measure, GATE_MS } from '../rig/lag.mjs';
const LS = createRequire(import.meta.url)('../../web/js/call/lipsync.js');
const FX = JSON.parse(fs.readFileSync(new URL('./fixtures/rig-lag.json', import.meta.url)));
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('✗', m); } };
for (const [id, segs] of Object.entries(FX)) segs.forEach((s, i) => {
  const tag = `${id}#${s.k}`, m = measure(s, s.env, i);
  ok(Math.abs(m.lagMs) <= GATE_MS, `${tag}: |lag| ${m.lagMs} > ${GATE_MS} (chunks ${m.lagChunksMs}, onset ${m.mouthOnsetMs})`);
  ok(m.visemePct >= 90, `${tag}: viseme ${m.visemePct} % < 90`);
  const late = measure(s, s.env, i, { delay: LS.LEAD + 0.06 }), early = measure(s, s.env, i, { delay: LS.LEAD - 0.08 });
  ok(Math.abs(late.lagMs) > GATE_MS, `${tag}: miệng trễ 60 ms mà cổng vẫn xanh (lag ${late.lagMs})`);
  // lệch lớn (≥ 60 ms) thì tương quan chéo theo cụm có thể nhảy sang đỉnh của âm tiết bên cạnh (nhịp ~230 ms: people-are#2 sớm 80 → +160) – cổng vẫn đỏ;
  // dấu đúng lấy từ mép miệng trực tiếp (mouthOnsetMs), không qua tương quan
  ok(Math.abs(early.lagMs) > GATE_MS, `${tag}: miệng sớm 80 ms mà cổng vẫn xanh (lag ${early.lagMs})`);
  ok(Math.min(...early.mouthOnsetMs.filter(x => x !== null)) < -GATE_MS && Math.max(...late.mouthOnsetMs.filter(x => x !== null)) > GATE_MS, `${tag}: mép miệng sai dấu (sớm ${early.mouthOnsetMs}, trễ ${late.mouthOnsetMs})`);
  ok(m.kokoroOnsetMs.length && m.mouthOnsetMs.filter(x => x !== null).every(x => Math.abs(x + LS.LEAD * 1000) <= 20), `${tag}: miệng rời X lệch mép tiếng ${m.mouthOnsetMs}`);
  const t = LS.onsets(s.env)[0], c = LS.align(LS.fromPhones(LS.anchor(s.ph, s.env), s.dur), s.env, { words: s.words }).find(x => x.value !== 'X');
  ok(Math.abs(c.start - t) < 0.011, `${tag}: align neo cue đầu ${c.start} ≠ mép bật tiếng ${t} (lệch ngưỡng ONSET?)`);
});
ok(FX['es-age-be'].some(s => measure(s, s.env).kokoroOnsetMs[0] >= 35), 'fixture không còn ca âm vị đầu câu muộn ≥ 35 ms (ca gốc của lỗi)');
console.log(fail ? `rig-lag: ${fail} lỗi` : `rig-lag: OK (${Object.values(FX).flat().length} câu, cổng ${GATE_MS} ms, trễ 60 / sớm 80 ms bị bắt)`);
process.exit(fail ? 1 : 0);
