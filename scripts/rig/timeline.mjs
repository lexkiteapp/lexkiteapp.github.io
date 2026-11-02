// Rig 2D → khung (docs/specs/rig-2d-video.md). Mỗi câu: mốc âm vị Kokoro → cues (LipSync.fromPhones/align/smooth/lead) → LipFace.machine (miệng × độ lớn tiếng,
// chớp, liếc, mày, nghiêng/gật theo biểu cảm emo) + lớp tay (thumb = khen, palm = khích lệ) + thở. Cờ --reduced = prefers-reduced-motion: không nghiêng/gật/thở,
// tay hiện bằng mờ dần không bay lên (miệng + chớp mắt giữ vì là nội dung). Ra: qa/rig/<id>/frames.json (+ frames-reduced.json) + metrics.json (cổng khớp miệng).
// Dùng: node scripts/rig/timeline.mjs content/video/rig/ama-agree.json qa/rig
import fs from 'node:fs'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url), LS = req('../../web/js/call/lipsync.js'), LF = req('../../web/js/call/face.js'), LM = req('../../web/js/call/mouths.js');
const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')), OUT = `${process.argv[3]}/${spec.id}`, TL = JSON.parse(fs.readFileSync(`${OUT}/timeline.json`, 'utf8'));
const FPS = spec.fps; // người nói theo từng câu (s.who): clip chỉ cô, chỉ thầy, hoặc luân phiên
const rms100 = f => { const b = fs.readFileSync(f); let o = 12; while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const sr = b.readUInt32LE(24), n = b.readUInt32LE(o + 4) / 2, s = o + 8, hop = sr / 100, R = [];
  for (let i = 0; i + hop <= n; i += hop) { let e = 0; for (let j = 0; j < hop; j++) { const x = b.readInt16LE(s + 2 * (i + j)) / 32768; e += x * x; } R.push(Math.sqrt(e / hop)); } return R; };
const xlag = (a, b) => { const m = v => { const u = v.reduce((x, y) => x + y, 0) / v.length; return v.map(x => x - u); }; a = m(a); b = m(b); let best = -1e9, L = 0;
  for (let l = -30; l <= 30; l++) { let s = 0; for (let i = 0; i < a.length; i++) { const j = i - l; if (j >= 0 && j < b.length) s += a[i] * b[j]; } if (s > best) { best = s; L = l; } } return L * 10; };
const ease = x => x * x * (3 - 2 * x), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
// 1) máy trạng thái từng câu + đo
const segs = TL.segments.map((s, i) => {
  const env = rms100(s.wav), cues = LS.lead(LS.smooth(LS.align(LS.fromPhones(s.ph, s.dur), env, { words: s.words })));
  const M = LF.machine(s.who, { cues, env, dur: s.dur, emo: s.emo, seed: 21 + i, text: s.text }), n = env.length, peak = Math.max(...env);
  const S = Array.from({ length: n }, (_, k) => M.at(k / 100)), sp = LS.phoneSpans(s.ph);
  const truth = t => { const x = sp.find(q => q.s <= t && t < q.e && q.v !== ' '); return x ? x.v : null; };
  // đúng hình: hình đang hiện khớp âm vị thật trong ±40 ms; hình được engine CHỦ Ý cho đi trước (LS.LEADS: môi khép A 65 ms, F/V 45 ms, chu môi 40 ms)
  // được tính thêm đúng phần đi trước đó về phía sau – hình tới sớm theo thiết kế không bị trừ, hình tới TRỄ vẫn bị bắt (lô thử 01/11: pt_BR-people-are 79 % vì 3 âm P)
  let ok = 0, tot = 0; for (let k = 0; k < n; k++) { if (env[k] < peak * .1) continue; const sh = S[k].shape, ext = Math.round(((LS.LEADS[sh] || LS.LEAD) - LS.LEAD) * 100);
    const want = new Set(), mine = new Set(); for (let d = -4; d <= 4 + ext; d++) { const v = truth((k + d) / 100); if (v && d <= 4) want.add(v); if (v) mine.add(v); } if (!want.size) continue; tot++; if (mine.has(sh)) ok++; }
  let flick = 0, run = 1; for (let k = 1; k < n; k++) { if (S[k].shape === S[k - 1].shape) { run++; continue; } if (k - run > 0 && run < Math.round(LS.MIN_HOLD * 100) - 1) flick++; run = 1; }
  const firstVoiced = env.findIndex(v => v > peak * .1) / 100;
  // độ lệch miệng–tiếng = 2 phép đo, cổng lấy cái xấu hơn (≤ 45 ms):
  // (a) miệng ↔ hình chuẩn theo âm vị Kokoro (cùng nguồn sinh tiếng: pred_dur điều khiển bộ giải mã), tương quan chéo theo TỪNG CỤM có tiếng (cắt ở lặng ≥ 120 ms, cụm ≥ 0,6 s);
  // (b) âm vị ↔ tiếng: mép bắt đầu âm vị so với mép bật tiếng sau mỗi khoảng lặng (RMS ≥ 5 % đỉnh), lấy trung bình (alignMs).
  // Miệng ↔ tiếng = (a) + (b) cộng dồn → cổng = cụm có |(a) + alignMs| lớn nhất.
  // Đo cũ "độ mở ↔ độ lớn tiếng" (lagEnvMs) giữ để đối chiếu, KHÔNG làm cổng: âm mũi/hữu thanh (m, n, ŋ) to mà miệng khép, đuôi nguyên âm đôi nhỏ mà miệng mở → tương quan
  // nhảy sang đỉnh phụ. Lô thử 02/11 hi-know-ing: hình chuẩn từ âm vị (không qua engine) ↔ độ lớn cũng ra +120…+300 ms, còn engine ↔ hình chuẩn 0–10 ms; quét gain release
  // 30–120 ms không đổi số đo → không phải lỗi engine. Còn thiếu: test hồi quy tiêm trễ (scripts/test/rig-lag.mjs).
  const open = S.map(q => q.mouth.u + q.mouth.d), chunks = []; let c0 = -1, quiet = 0;
  const truthOpen = Array.from({ length: n }, (_, k) => { const v = truth(k / 100) || 'X', p = LM.mix(v, v, 1); return p.u + p.d; });
  for (let k = 0; k <= n; k++) { const v = k < n && env[k] >= peak * .1;
    if (v) { if (c0 < 0) c0 = k; quiet = 0; } else if (c0 >= 0 && (++quiet >= 12 || k === n)) { const c1 = k - quiet + 1; if (c1 - c0 >= 60) chunks.push([Math.max(0, c0 - 10), Math.min(n, c1 + 10)]); c0 = -1; quiet = 0; } }
  const lagEnvChunksMs = chunks.map(([a, b]) => xlag(open.slice(a, b), env.slice(a, b))), lagGlobalMs = xlag(open, env);
  const onsets = []; let q = 99; for (let k = 0; k < n; k++) { if (env[k] >= peak * .05) { if (q >= 12) onsets.push(k / 100); q = 0; } else q++; }
  const P = s.ph.filter(p => /[^\sˈˌ.,!?;:—…"“”()]/.test(p.p));
  const onsetDiffMs = P.length ? onsets.map(t => Math.round(1000 * (P.reduce((m, x) => Math.abs(x.s - t) < Math.abs(m.s - t) ? x : m).s - t))) : [];
  const alignMs = onsetDiffMs.length ? Math.round(onsetDiffMs.reduce((a, b) => a + b, 0) / onsetDiffMs.length) : 0;
  const lagChunksMs = (chunks.length ? chunks : [[0, n]]).map(([a, b]) => xlag(open.slice(a, b), truthOpen.slice(a, b)) + alignMs);
  const lagMs = lagChunksMs.reduce((m, x) => Math.abs(x) > Math.abs(m) ? x : m, 0);
  return { ...s, env, cues, M, lagMs, lagGlobalMs, lagChunksMs, lagEnvChunksMs, onsetDiffMs, alignMs, visemePct: tot ? Math.round(100 * ok / tot) : 0, flicker: flick, firstVoiced };
});
// 2) khung theo thời gian toàn bài: câu đang chạy = câu cuối có start ≤ t (phần lặng sau câu vẫn do máy câu đó → chớp/liếc liền mạch)
const HAND = { in: .35, out: .3, pre: .1 };
function frames(reduced) {
  const n = Math.ceil(TL.total * FPS), out = []; let blinkOn = 0, blinks = 0;
  for (let f = 0; f < n; f++) {
    const t = f / FPS; let i = 0; while (i < segs.length - 1 && segs[i + 1].start <= t) i++;
    const s = segs[i], lt = t - s.start, st = s.M.at(Math.max(0, lt));
    if (lt < 0) { st.mouth = 'X'; st.shape = 'X'; }
    if (st.blink > .5) { if (!blinkOn) blinks++; blinkOn = 1; } else blinkOn = 0;
    // tay: lên từ sau thẻ phụ đề lúc câu bắt đầu, hạ xuống khi câu xong
    let hand = null, hk = 0;
    if (s.hand) { const a = clamp((lt + HAND.pre) / HAND.in, 0, 1), b = clamp((lt - s.dur) / HAND.out, 0, 1); hk = ease(a) * (1 - ease(b)); hand = hk > .001 ? s.hand : null; }
    const breath = reduced ? 0 : +(3 * Math.sin(2 * Math.PI * t / 3.8)).toFixed(2);
    out.push({ who: s.who, g: LF.svg(s.who, st, 'f'), tilt: reduced ? 0 : +st.tilt.toFixed(2), nod: reduced ? 0 : +st.nod.toFixed(2), breath, seg: i, lt: +lt.toFixed(3),
      hand, hk: +hk.toFixed(3), hmode: reduced ? 'fade' : 'rise', shape: st.shape, blink: +st.blink.toFixed(2) });
  }
  return { frames: out, blinks };
}
const A = frames(false), R = frames(true);
fs.writeFileSync(`${OUT}/frames.json`, JSON.stringify({ fps: FPS, total: TL.total, segments: segs.map(({ env, cues, M, ph, ...x }) => x), frames: A.frames }));
fs.writeFileSync(`${OUT}/frames-reduced.json`, JSON.stringify({ fps: FPS, total: TL.total, frames: R.frames }));
const words = segs.reduce((a, s) => a + s.words.filter(w => /[a-z]/i.test(w.w)).length, 0), speech = segs.reduce((a, s) => a + s.dur, 0);
const m = { voices: segs.map(s => ({ who: s.who, voice: s.voice })), total: TL.total, words, wpmSpeech: Math.round(60 * words / speech), wpmOverall: Math.round(60 * words / TL.total),
  firstVoicedS: +(segs[0].start + segs[0].firstVoiced).toFixed(2), lagMaxAbsMs: Math.max(...segs.map(s => Math.abs(s.lagMs))), visemePctMin: Math.min(...segs.map(s => s.visemePct)),
  flicker: segs.reduce((a, s) => a + s.flicker, 0), blinksPerMin: Math.round(60 * A.blinks / TL.total),
  reducedStill: R.frames.every(f => !f.tilt && !f.nod && !f.breath && f.hmode === 'fade') && R.frames.length === A.frames.length,
  rows: segs.map(s => ({ k: s.k, emo: s.emo, hand: s.hand || '', dur: s.dur, lagMs: s.lagMs, lagGlobalMs: s.lagGlobalMs, lagChunksMs: s.lagChunksMs, lagEnvChunksMs: s.lagEnvChunksMs, onsetDiffMs: s.onsetDiffMs, alignMs: s.alignMs, visemePct: s.visemePct, flicker: s.flicker })) };
fs.writeFileSync(`${OUT}/metrics.json`, JSON.stringify(m, null, 1)); console.log(JSON.stringify(m));
