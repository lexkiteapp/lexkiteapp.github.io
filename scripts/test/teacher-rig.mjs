// Cổng TeacherRig (lõi thuần, npm test + teacher-rig.yml) – docs/specs/teacher-rive-rig.md §Cổng QC
// 1) khớp môi: mọi mốc ≥ 50 ms trong web/js/call/cues.js hiện đúng hình trong ±33 ms (60 fps, đồng hồ âm thanh)
// 2) khớp xương: 60 s kịch bản ngẫu nhiên (biểu cảm × cử chỉ × nói) – góc/độ dời trong giới hạn, đổi mỗi khung ≤ tốc độ tối đa (không giật/nhảy)
// 3) biến đổi CỨNG: không trượt, độ dài chi đổi ≤ biên thở · 4) mọi cử chỉ trỏ tư thế đã duyệt có đủ ảnh 2 người · 5) giảm chuyển động: khớp cổ đứng yên
import fs from 'node:fs'; import { createRequire } from 'node:module'; import assert from 'node:assert/strict';
const require = createRequire(import.meta.url);
const R = require('../../web/js/teacher-rig.js');
const g = {}; new Function('self', fs.readFileSync('web/js/call/cues.js', 'utf8'))(g);
const LS = require('../../web/js/call/lipsync.js');
const FPS = 60, TOL = 0.033, out = [];
const ok = (c, m) => { out.push((c ? '✓ ' : '✗ ') + m); if (!c) process.exitCode = 1; };
let rnd = 12345; const rand = () => ((rnd = (rnd * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

// ---- 1) khớp môi ±33 ms ----
const K = Object.entries(g.LK_CUES.k).filter(([, v]) => v);
let n = 0, bad = 0, worst = 0, worstKey = ''; const all = [];
for (const [key, packed] of K) {
  const { cues, env, dur } = R.cuesOf(packed);
  for (const who of ['ama', 'carlos']) {
    const M = R.machine(who, { seed: 3 }); let T = 0;
    M.speak({ clock: () => T, playing: () => T < dur, cues, env, dur, text: key });
    const tr = []; let ps = 'X'; // lần chuyển hình hiển thị (khung đầu tiên mang hình mới)
    for (let i = 0; T <= dur + 0.1; i++) { T = i / FPS; const s = M.step(100 + T).shape; if (s !== ps) { tr.push([T, s]); ps = s; } }
    cues.forEach((c, i) => {
      const end = i < cues.length - 1 ? cues[i + 1].start : dur, prev = i ? cues[i - 1].value : 'X';
      if (end - c.start < 0.05 || c.value === prev || c.start < 0.05 || c.start > dur - 0.05) return; // mốc < giữ tối thiểu: pipeline đã gộp; đầu/cuối câu: cửa vào/ra 40–80 ms
      let d = 1; for (const [t, s] of tr) if (s === c.value && Math.abs(t - c.start) < Math.abs(d)) d = t - c.start; // hình hiện gần mốc nhất (không có = 1 s = đỏ)
      n++; all.push(d);
      if (Math.abs(d) > TOL) bad++; if (Math.abs(d) > Math.abs(worst)) { worst = d; worstKey = `${key}/${who}#${i}${c.value}`; }
    });
  }
}
all.sort((a, b) => a - b);
ok(n > 200 && bad === 0, `khớp môi: ${n} mốc (p50 ${Math.round(all[n >> 1] * 1000)} ms, p99 ${Math.round(all[Math.floor(n * .99)] * 1000)} ms) (Ama + Carlos, ${K.length} câu) – ${bad} lệch > ±33 ms, lệch lớn nhất ${Math.round(worst * 1000)} ms (${worstKey})`);

// ---- 2) khớp xương + chống giật ----
const L = R.LIMITS, P = L.perFrame, EMO = Object.keys(R.EMOTIONS), GES = Object.keys(R.GESTURES), eps = 1e-6;
function scenario(who, calm) {
  const M = R.machine(who, { calm, seed: 9 }); let T = 0, speakUntil = 0, prev = null; const v = { lim: 0, jump: 0, nan: 0, frames: 0, maxD: {}, blinks: 0, moved: 0, poses: new Set() };
  for (let i = 0; i < 60 * FPS; i++) {
    const now = i / FPS;
    if (rand() < 1 / 40) M.setEmotion(EMO[Math.floor(rand() * EMO.length)]);
    if (rand() < 1 / 50) M.gesture(GES[Math.floor(rand() * GES.length)], now);
    if (!speakUntil && rand() < 1 / 120) { const [k, p] = K[Math.floor(rand() * K.length)], c = R.cuesOf(p), t0 = now; T = 0; speakUntil = now + c.dur; M.speak({ clock: () => now - t0, playing: () => now < speakUntil, cues: c.cues, env: c.env, dur: c.dur, text: k }); }
    if (speakUntil && now >= speakUntil) { speakUntil = 0; M.quiet(); }
    const f = M.step(now); v.frames++;
    const vals = [f.tilt, f.nod, f.sway, f.breath, f.poseW, f.s.brow, f.s.knit, f.s.look.x, f.s.look.y, ...Object.values(f.s.mouth)];
    if (vals.some(x => !Number.isFinite(x))) v.nan++;
    if (Math.abs(f.tilt) > L.tilt + eps || Math.abs(f.nod) > L.nod + eps || Math.abs(f.sway) > L.sway + eps || Math.abs(f.breath) > L.breath + eps) v.lim++;
    if (f.s.blink > 0.9) v.blinks++; if (Math.abs(f.tilt) + Math.abs(f.nod) + Math.abs(f.sway) + Math.abs(f.breath) > 1e-9) v.moved++; if (f.pose && f.poseW > 0) v.poses.add(f.pose);
    if (prev) {
      const d = { tilt: Math.abs(f.tilt - prev.tilt), nod: Math.abs(f.nod - prev.nod), sway: Math.abs(f.sway - prev.sway), brow: Math.abs(f.s.brow - prev.brow), knit: Math.abs(f.s.knit - prev.knit), look: Math.max(Math.abs(f.s.look.x - prev.lx), Math.abs(f.s.look.y - prev.ly)), fade: Math.abs(f.poseW - prev.poseW) };
      for (const k in d) { v.maxD[k] = Math.max(v.maxD[k] || 0, d[k]); if (d[k] > P[k] + eps) v.jump++; }
    }
    prev = { tilt: f.tilt, nod: f.nod, sway: f.sway, brow: f.s.brow, knit: f.s.knit, lx: f.s.look.x, ly: f.s.look.y, poseW: f.poseW };
  }
  return v;
}
for (const who of ['ama', 'carlos']) {
  const v = scenario(who, false);
  ok(!v.nan && !v.lim, `${who}: ${v.frames} khung – 0 NaN, góc/độ dời trong giới hạn (nghiêng ≤ ${L.tilt}°, gật ≤ ${L.nod} px, lắc ≤ ${L.sway} px, thở ≤ ${L.breath * 100} %) [vượt ${v.lim}]`);
  ok(!v.jump, `${who}: không giật – đổi mỗi khung ≤ giới hạn (${Object.entries(v.maxD).map(([k, x]) => `${k} ${x.toFixed(3)}/${P[k].toFixed(3)}`).join(', ')}) [vượt ${v.jump}]`);
  ok(v.blinks > 10 && v.poses.size >= 5, `${who}: sống – chớp mắt ${v.blinks} khung, ${v.poses.size} tư thế đã hiện (${[...v.poses].join(' ')})`);
  const c = scenario(who, true);
  ok(!c.moved && c.blinks > 10, `${who}: giảm chuyển động – khớp cổ/thở đứng yên (${c.moved} khung động), vẫn chớp mắt (${c.blinks})`);
}

// ---- 3) biến đổi cứng: không trượt, chi không đổi độ dài ----
{
  let worstL = 0, shear = 0;
  for (let i = 0; i < 2000; i++) {
    const f = { pivot: [554 + rand() * 20, 640], tilt: (rand() * 2 - 1) * L.tilt, nod: (rand() * 2 - 1) * L.nod, sway: (rand() * 2 - 1) * L.sway, breath: (rand() * 2 - 1) * L.breath };
    const [a, b, c, d, e, h] = R.matrix(f), k = 1 + f.breath, ap = (x, y) => [a * x + c * y + e, b * x + d * y + h];
    if (Math.abs(a - d) > 1e-9 || Math.abs(b + c) > 1e-9 || Math.abs(a * d - b * c - k * k) > 1e-9) shear++;
    for (const [p, q] of [[[420, 520], [380, 900]], [[680, 520], [720, 900]], [[554, 300], [554, 640]]]) { // vai→bàn tay, đầu→cổ (toạ độ poster-2x)
      const P1 = ap(...p), Q1 = ap(...q), l0 = Math.hypot(q[0] - p[0], q[1] - p[1]), l1 = Math.hypot(Q1[0] - P1[0], Q1[1] - P1[1]);
      worstL = Math.max(worstL, Math.abs(l1 / l0 - 1));
    }
  }
  ok(!shear && worstL <= L.breath + 1e-9, `biến đổi cứng: 0 trượt/méo (${shear}), độ dài chi đổi tối đa ${(worstL * 100).toFixed(3)} % ≤ biên thở ${L.breath * 100} %`);
}

// ---- 4) cử chỉ → tư thế đã duyệt, đủ ảnh ----
{
  const reg = JSON.parse(fs.readFileSync('web/teach/characters.json', 'utf8')), miss = [], pend = [];
  for (const [name, G] of Object.entries(R.GESTURES)) {
    if (G.pending) pend.push(`${name}→${G.pose}`);
    if (G.kind !== 'pose') continue;
    for (const who of ['ama', 'carlos']) { // tư thế thật theo người: clip registry hoặc ảnh chuẩn (people.<who>.stills), không có → alt (phải là tư thế clip)
      const has = p => !!reg.people[who].clips[p] || !!(reg.people[who].stills || {})[p], P = R.poseOf(G, has);
      if (!has(P) || !fs.existsSync(`web/teach/${who}/still-${P}.webp`)) miss.push(`${who}/${P}`);
      if (G.alt && !reg.people[who].clips[G.alt]) miss.push(`${who}/${G.alt} (alt)`); }
    if (G.emo) assert.ok(R.EMOTIONS[G.emo], `${name}: biểu cảm ${G.emo}`);
  }
  ok(!miss.length, `cử chỉ: ${Object.keys(R.GESTURES).length} (${EMO.length} biểu cảm) đều trỏ tư thế registry có ảnh cho cả 2 người ${miss.length ? '– thiếu ' + miss.join(' ') : ''}`);
  console.log(`ℹ chờ gesture bank (footage riêng, dùng tạm tư thế gần nhất đã duyệt): ${pend.join(', ')}`);
}

// ---- 5) speak/quiet: miệng về X ≤ 80 ms khi tiếng dừng; tư thế đang hiện mờ ra khi nói ----
{
  const [k, p] = K[0], c = R.cuesOf(p), M = R.machine('ama', {}); let T = 0, stopAt = Math.min(0.8, c.dur / 2);
  M.gesture('wave', 0); for (let i = 0; i < 30; i++) M.step(i / FPS);
  const w0 = M.step(30 / FPS).poseW;
  M.speak({ clock: () => T, playing: () => T < stopAt, cues: c.cues, env: c.env, dur: c.dur, text: k });
  let closeAt = null, fadeAt = null;
  for (let i = 31; i < 31 + 2 * FPS; i++) { const now = i / FPS; T = now - 31 / FPS; const f = M.step(now); if (fadeAt == null && f.poseW === 0) fadeAt = T; if (T > stopAt && closeAt == null && f.shape === 'X' && f.s.open === 0) closeAt = T - stopAt; }
  ok(w0 > 0.9 && fadeAt != null && fadeAt <= R.FADE + 0.02, `nói giữa cử chỉ: ảnh tư thế mờ ra trong ${Math.round((fadeAt ?? 9) * 1000)} ms (≤ ${R.FADE * 1000 + 20}) để miệng vẽ khớp tiếng`);
  ok(closeAt != null && closeAt <= 0.085, `tiếng dừng → miệng ngậm sau ${Math.round((closeAt ?? 9) * 1000)} ms (≤ 85)`);
}
console.log(out.join('\n'));
if (process.exitCode) console.log('✗ teacher-rig: ĐỎ'); else console.log('✓ teacher-rig: đạt');
void LS;
