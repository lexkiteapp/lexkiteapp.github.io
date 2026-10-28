// 🎭 Cổng chất lượng con rối 2D (chủ 28/10: "đẹp đồng nhất, không méo miệng, tay chân không chồng chéo, không giật lag") – docs/LESSON-ENGINE.md §4b.
// Chạy trên CHÍNH sample()/geom() mà app + Remotion dùng, cho (a) dòng thời gian video props.json và (b) mọi tổ hợp 9 viseme × 6 biểu cảm × 4 cử chỉ.
//  1 miệng   – đường viền miệng (khóe, môi trên/dưới, cả độ dày môi) nằm trong đường viền mặt ≥ 6 px, dưới mũi; chuyển hình 40–80 ms, độ dốc ≤ mức smoothstep 40 ms (không "nhảy")
//  2 tay chân – vai -20…45°, khuỷu gập ≤ 170°; bàn tay/cẳng tay không chạm mặt; 2 tay không chạm/cắt nhau (trừ vỗ tay – chủ ý); thứ tự lớp cố định
//  3 mượt    – gia tốc khung-khung (60 fps) của đầu/cổ tay ≤ ngưỡng (kiểu cut_jump của qc_v9); số khung video = durationInFrames (0 khung rơi – kiểm ở workflow)
//  4 đồng bộ – từ m/b/p có hình mím A trong ±60 ms quanh đầu từ (đầu cụm ±60 ms theo âm thanh thật: gate.mjs)
//  5 đồng nhất – hình vẽ tĩnh = bản tham chiếu (sha), apply() chỉ đổi hình học (không đổi màu/nét), tham số động trong biên; ảnh so với tờ tham chiếu ở record.mjs
//  6 mạng    – động cơ + dựng video không gọi dịch vụ giới hạn (quét mã)
// Dùng: node scripts/puppet/qc.mjs [out/puppet] [--update-ref]  → <dir>/qc.json, exit 1 nếu trượt
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), DIR = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'out/puppet';
const SRC = path.join(ROOT, 'web/js/lesson/puppet.js'), Pup = createRequire(import.meta.url)(SRC), REF = path.join(ROOT, 'content/video/puppet/ama-ref.json');
const props = fs.existsSync(path.join(DIR, 'props.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'props.json'), 'utf8')) : null;
const fails = [], R = {};
const fail = (g, msg) => { if (fails.filter(f => f.g === g).length < 6) fails.push({ g, msg }); };

// ---- hình học
function cubicPoly(d) { // path chỉ gồm M + C → đa giác
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number), pts = [[n[0], n[1]]]; let p = [n[0], n[1]];
  for (let i = 2; i + 5 < n.length; i += 6) { const [a, b, c, e, x, y] = n.slice(i, i + 6); for (let k = 1; k <= 12; k++) { const t = k / 12, u = 1 - t; pts.push([u * u * u * p[0] + 3 * u * u * t * a + 3 * u * t * t * c + t * t * t * x, u * u * u * p[1] + 3 * u * u * t * b + 3 * u * t * t * e + t * t * t * y]); } p = [x, y]; }
  return pts;
}
const FACE = cubicPoly(Pup.geom(Pup.sample({}, 0)).FACE);
const inside = (P, [x, y]) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; };
const segD = ([px, py], [ax, ay], [bx, by]) => { const dx = bx - ax, dy = by - ay, t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1))); return Math.hypot(px - ax - t * dx, py - ay - t * dy); };
const polyD = (P, p) => { let d = 1e9; for (let i = 0; i < P.length; i++) d = Math.min(d, segD(p, P[i], P[(i + 1) % P.length])); return inside(P, p) ? -d : d; };
const xf = (h, [x, y]) => { const r = h.tilt * Math.PI / 180, [cx, cy] = h.pivot, c = Math.cos(r), s = Math.sin(r); return [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c + h.dy]; };
const cross = (a, b, c, d) => { const o = (p, q, r) => Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); return o(a, b, c) !== o(a, b, d) && o(c, d, a) !== o(c, d, b); };

// ---- dòng thời gian cần soát: video + mọi tổ hợp
const all = { cues: [], expr: [], gest: [], seed: 3 }; let t = 0.5;
for (const e of Object.keys(Pup.EXPR)) for (const g of Object.keys(Pup.GEST)) {
  all.expr.push([t, e]); all.gest.push([t + 0.1, g]);
  Object.keys(Pup.VIS).forEach((v, k) => all.cues.push([+(t + 0.15 + k * 0.12).toFixed(3), v])); all.cues.push([+(t + 1.3).toFixed(3), 'X']);
  t += 2.4;
}
const TLS = [['poses', all, t + 0.5]].concat(props ? [['video', props.tl, props.durationInFrames / props.fps]] : []);
const clapAt = (tl, s) => (tl.gest || []).some(g => g[1] === 'clap' && s >= g[0] && s <= g[0] + Pup.GEST.clap.dur);

for (const [name, tl, dur] of TLS) {
  const r = R[name] = { frames: 0, mouthMinMargin: 1e9, maxSlope: 0, handFaceMin: 1e9, armFaceMin: 1e9, handsMin: 1e9, maxAccel: { head: 0, wrist: 0 } };
  let prev = null, pp = null;
  // 1+2+5 ở 60 fps
  for (let f = 0; f <= dur * 60; f++) {
    const s = Pup.sample(tl, f / 60), G = Pup.geom(s), at = (f / 60).toFixed(2); r.frames++;
    const corners = G.mouth; // khóe trái/phải, mép môi trên, đáy môi dưới, 2 đầu môi dưới (tọa độ đầu)
    const margin = Math.min(...corners.map(c => -polyD(FACE, c))); r.mouthMinMargin = Math.min(r.mouthMinMargin, margin);
    if (margin < 6) fail('mouth', `${name} t=${at}: miệng sát/ra ngoài mặt (${margin.toFixed(1)} px)`);
    if (corners[2][1] < G.NOSE[1] + 1) fail('mouth', `${name} t=${at}: miệng chạm mũi`);
    const faceW = FACE.map(p => xf(G.head, p)), clap = clapAt(tl, f / 60);
    for (const side of ['L', 'R']) {
      const A = G[side];
      const flex = (((A.b - A.a) % 360) + 540) % 360 - 180, nb = flex; if (A.a < -20 || A.a > 45 || Math.abs(flex) > 170) /* vai -20…45°, khuỷu gập ≤ 170° (cẳng tay không gập ngược vào cánh tay) */ fail('limbs', `${name} t=${at}: góc khớp ${side} ngoài giới hạn (${A.a.toFixed(0)}, ${nb.toFixed(0)})`);
      const hd = polyD(faceW, A.H) - A.hr, ad = Math.min(polyD(faceW, A.E), ...[0.25, 0.5, 0.75, 1].map(k => polyD(faceW, [A.E[0] + (A.W[0] - A.E[0]) * k, A.E[1] + (A.W[1] - A.E[1]) * k]))) - 23;
      r.handFaceMin = Math.min(r.handFaceMin, hd); r.armFaceMin = Math.min(r.armFaceMin, ad);
      if (hd < 4) fail('limbs', `${name} t=${at}: bàn tay ${side} chạm mặt (${hd.toFixed(1)} px)`);
      if (ad < 4) fail('limbs', `${name} t=${at}: tay áo ${side} chạm mặt`);
    }
    const hh = Math.hypot(G.L.H[0] - G.R.H[0], G.L.H[1] - G.R.H[1]) - G.L.hr - G.R.hr;
    if (!clap) { r.handsMin = Math.min(r.handsMin, hh); if (hh < 0) fail('limbs', `${name} t=${at}: 2 bàn tay chồng nhau ngoài lúc vỗ tay`); if (cross(G.L.E, G.L.W, G.R.E, G.R.W)) fail('limbs', `${name} t=${at}: 2 cẳng tay cắt nhau`); }
    // 3 gia tốc khung-khung (px/khung²)
    const P = { head: [G.head.dy, G.head.tilt * 4], wristL: G.L.W, wristR: G.R.W };
    if (prev && pp) for (const k in P) { const a = Math.hypot(P[k][0] - 2 * prev[k][0] + pp[k][0], P[k][1] - 2 * prev[k][1] + pp[k][1]), key = k === 'head' ? 'head' : 'wrist'; r.maxAccel[key] = Math.max(r.maxAccel[key], a); }
    pp = prev; prev = P;
  }
  if (r.maxAccel.head > 1.5) fail('smooth', `${name}: đầu giật (gia tốc ${r.maxAccel.head.toFixed(2)} px/khung²)`);
  if (r.maxAccel.wrist > 9) fail('smooth', `${name}: cổ tay giật (gia tốc ${r.maxAccel.wrist.toFixed(2)} px/khung²)`);
  // 1 độ dốc tham số miệng ở 240 Hz (smoothstep 40 ms: tối đa 1,5/0,04 = 37,5 /s mỗi đơn vị)
  let q = null; const MK = Object.keys(Pup.VIS.X);
  for (let f = 0; f <= dur * 240; f++) { const m = Pup.sample(tl, f / 240).m; if (q) for (const k of MK) { const sl = Math.abs(m[k] - q[k]) * 240; if (sl > r.maxSlope) r.maxSlope = sl; if (sl > 39.5) fail('mouth', `${name} t=${(f / 240).toFixed(3)}: miệng nhảy (${k} ${sl.toFixed(0)}/s)`); } q = m; }
  const tr = (tl.cues || []).map((c, i, a) => Math.max(0.04, Math.min(0.08, ((a[i + 1] ? a[i + 1][0] : c[0] + 0.2) - c[0]) * 0.55)));
  r.transitionMs = tr.length ? [Math.round(Math.min(...tr) * 1000), Math.round(Math.max(...tr) * 1000)] : null;
}

// 4 đồng bộ với mốc từ (faster-whisper đã khớp năng lượng) – chỉ video
if (props && props.words && props.words.length) {
  const W = props.words, on = [], bil = [];
  const moving = s => { const m = Pup.sample(props.tl, s).vis; return m.open > 0.05 || m.press > 0.5 || m.teeth > 0.3; }; // phần miệng do lời nói lái (không tính dáng cười của biểu cảm)
  W.forEach((w, i) => {
    const gap = i === 0 || w.line !== W[i - 1].line || w.start - W[i - 1].end > 0.15;
    if (gap) { let o = null; for (let s = w.start - 0.25; s <= w.start + 0.25; s += 0.001) if (moving(s)) { o = s; break; } on.push(o == null ? 1 : Math.abs(o - w.start)); }
    if (/^[mbp]/i.test(String(w.w).replace(/[^a-z]/gi, ''))) { let ok = false; for (let s = w.start - 0.06; s <= w.start + 0.06 && !ok; s += 0.005) ok = Pup.sample(props.tl, s).m.press >= 0.6; bil.push(ok); }
  });
  const okOn = on.filter(d => d <= 0.06).length / Math.max(1, on.length), okBil = bil.filter(Boolean).length / Math.max(1, bil.length);
  R.sync = { onsets: on.length, within60ms: +okOn.toFixed(3), medianMs: Math.round(on.slice().sort((a, b) => a - b)[on.length >> 1] * 1000), bilabials: bil.length, bilabialWithin60ms: +okBil.toFixed(3) };
  // (đầu cụm ±60 ms đo theo ÂM THANH THẬT ở gate.mjs – mốc whisper có khe giả giữa các từ nói liền; ở đây chỉ báo số liệu)
  if (okBil < 0.8) fail('sync', `m/b/p không mím trong ±60 ms: ${bil.length - Math.round(okBil * bil.length)}/${bil.length}`);
}

// 5 đồng nhất
const src = fs.readFileSync(SRC, 'utf8'), artStr = Pup.art({ id: 'ref' }), sha = crypto.createHash('sha256').update(artStr).digest('hex').slice(0, 16);
const applySrc = src.slice(src.indexOf('function apply('), src.indexOf('// ================= âm vị'));
const setKeys = [...new Set([...applySrc.matchAll(/set\([^,]+, '([a-z-]+)'/g)].map(m => m[1]))], badKeys = setKeys.filter(k => !['transform', 'd', 'r', 'stroke-width', 'opacity', 'y', 'height', 'display'].includes(k));
if (badKeys.length) fail('consistency', 'apply() đổi thuộc tính ngoài hình học: ' + badKeys.join(','));
const order = ['class="pbody"', 'class="phead"', 'class="paL"', 'class="paR"'].map(k => artStr.indexOf(k));
if (order.some((x, i) => x < 0 || (i && x < order[i - 1]))) fail('limbs', 'thứ tự lớp sai (thân < đầu < tay trái < tay phải)');
const ref = fs.existsSync(REF) ? JSON.parse(fs.readFileSync(REF, 'utf8')) : null;
if (process.argv.includes('--update-ref') || !ref) fs.writeFileSync(REF, JSON.stringify({ who: 'ama', sha, note: 'sha của Pup.art({id:"ref"}) – đổi hình vẽ có chủ ý thì chạy qc.mjs --update-ref' }, null, 1) + '\n');
else if (ref.sha !== sha) fail('consistency', `hình vẽ khác bản tham chiếu (${sha} ≠ ${ref.sha}) – nếu cố ý: qc.mjs --update-ref`);
R.consistency = { sha, setKeys };

// 6 không gọi dịch vụ giới hạn lúc chạy (động cơ, khung Remotion, dựng mẫu, cổng)
const BAN = /generativelanguage|googleapis\.com\/v1beta|openai|anthropic|grabcast|klingai|replicate|elevenlabs|\/api\/ai\b|fetch\(|XMLHttpRequest|gemini/i;
for (const f of ['web/js/lesson/puppet.js', 'scripts/video/remotion/src/Puppet.jsx', 'scripts/puppet/sample.mjs', 'scripts/puppet/gate.mjs']) { const m = fs.readFileSync(path.join(ROOT, f), 'utf8').match(BAN); if (m) fail('network', `${f}: tham chiếu dịch vụ/mạng "${m[0]}"`); }

const gates = ['mouth', 'limbs', 'smooth', 'sync', 'consistency', 'network'], pass = Object.fromEntries(gates.map(g => [g, !fails.some(f => f.g === g)]));
const out = { ok: fails.length === 0, pass, ...R, fails };
fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(path.join(DIR, 'qc.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify({ pass, poses: R.poses, video: R.video, sync: R.sync }));
if (!out.ok) { console.error('❌ qc con rối:\n' + fails.map(f => ` - [${f.g}] ${f.msg}`).join('\n')); process.exit(1); }
console.log('✅ qc con rối: 6/6 cổng');
