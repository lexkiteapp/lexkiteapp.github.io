// Lip-lag check for the teacher sprite (docs/TEACHER-IN-APP.md §5.4): replays the exact frame loop of b-sprite.html (30 ms lead, 60 ms blend,
// one shape per cue) against every line's gated cues on a virtual display clock at 60 Hz and 30 Hz with 50 random phases each.
// lag = blend midpoint − cue onset. Fails (exit 1) when p95 |lag| at 60 Hz > 40 ms (owner target 27/10).
// Usage: node scripts/teacher/lag_sim.mjs docs/mocks/teacher-pilot/assets ama carlos
import fs from 'fs';
const [dir, ...who] = process.argv.slice(2);
const LEAD = 0.03, HALF = 0.03;
const q = (a, p) => { const s = a.map(Math.abs).sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
let fail = false;
for (const w of who) {
  const lines = JSON.parse(fs.readFileSync(`${dir}/${w}_lines.json`, 'utf8'));
  for (const hz of [60, 30]) {
    const lag = [];
    for (let run = 0; run < 50; run++) {
      const phase = Math.random() / hz;
      for (const L of Object.values(lines)) {
        let i = 0, done = -1, prevSpeech = null;
        for (let tk = phase; tk < L.dur + 0.05; tk += 1 / hz) {
          const t = tk + LEAD;
          while (i < L.gated.length - 1 && L.gated[i + 1][0] <= t) i++;
          if (i !== done) { done = i; const v = L.gated[i][1]; if (v !== prevSpeech) lag.push((tk + HALF - L.gated[i][0]) * 1000); prevSpeech = v; }
        }
      }
    }
    const p95 = q(lag, .95);
    console.log(`${w} @${hz} Hz: ${lag.length} cue changes · |lag| p50 ${q(lag, .5).toFixed(1)} ms · p95 ${p95.toFixed(1)} ms · max ${q(lag, 1).toFixed(1)} ms`);
    if (hz === 60 && p95 > 40) fail = true;
  }
}
if (fail) { console.error('✗ lip lag p95 > 40 ms at 60 Hz'); process.exit(1); }
console.log('✓ lip lag p95 ≤ 40 ms at 60 Hz');
