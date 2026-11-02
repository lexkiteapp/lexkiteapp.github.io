// Đo khớp miệng một câu rig 2D (dùng chung: scripts/rig/timeline.mjs khi dựng, scripts/test/rig-lag.mjs test hồi quy tiêm trễ).
// measure(s, env, i, { delay }) – s = câu trong timeline.json (ph, words, dur, who, emo, text), env = RMS 100 Hz; delay (giây) chỉ dùng trong test: dời mọi cue trễ đi.
import fs from 'node:fs'; import { createRequire } from 'node:module';
const req = createRequire(import.meta.url), LS = req('../../web/js/call/lipsync.js'), LF = req('../../web/js/call/face.js'), LM = req('../../web/js/call/mouths.js');
export const GATE_MS = 45;   // |lệch miệng–tiếng| tối đa (render.py cổng lipsync_lag)
export const rms100 = f => { const b = fs.readFileSync(f); let o = 12; while (b.toString('ascii', o, o + 4) !== 'data') o += 8 + b.readUInt32LE(o + 4);
  const sr = b.readUInt32LE(24), n = b.readUInt32LE(o + 4) / 2, s = o + 8, hop = sr / 100, R = [];
  for (let i = 0; i + hop <= n; i += hop) { let e = 0; for (let j = 0; j < hop; j++) { const x = b.readInt16LE(s + 2 * (i + j)) / 32768; e += x * x; } R.push(Math.sqrt(e / hop)); } return R; };
export const xlag = (a, b) => { const m = v => { const u = v.reduce((x, y) => x + y, 0) / v.length; return v.map(x => x - u); }; a = m(a); b = m(b); let best = -1e9, L = 0;
  for (let l = -30; l <= 30; l++) { let s = 0; for (let i = 0; i < a.length; i++) { const j = i - l; if (j >= 0 && j < b.length) s += a[i] * b[j]; } if (s > best) { best = s; L = l; } } return L * 10; };
export const ease = x => x * x * (3 - 2 * x), clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export function measure(s, env, i = 0, { delay = 0 } = {}) {
  const ph = LS.anchor(s.ph, env), cues = LS.lead(LS.smooth(LS.align(LS.fromPhones(ph, s.dur), env, { words: s.words }))).map(c => delay ? { ...c, start: c.start + delay, end: c.end + delay } : c);
  if (delay) cues[0].start = 0;
  const M = LF.machine(s.who, { cues, env, dur: s.dur, emo: s.emo, seed: 21 + i, text: s.text }), n = env.length, peak = Math.max(...env);
  const S = Array.from({ length: n }, (_, k) => M.at(k / 100)), sp = LS.phoneSpans(ph);
  const truth = t => { const x = sp.find(q => q.s <= t && t < q.e && q.v !== ' '); return x ? x.v : null; };
  // đúng hình: hình đang hiện khớp âm vị thật trong ±40 ms; hình được engine CHỦ Ý cho đi trước (LS.LEADS: môi khép A 65 ms, F/V 45 ms, chu môi 40 ms)
  // được tính thêm đúng phần đi trước đó về phía sau – hình tới sớm theo thiết kế không bị trừ, hình tới TRỄ vẫn bị bắt (lô thử 01/11: pt_BR-people-are 79 % vì 3 âm P)
  let ok = 0, tot = 0; for (let k = 0; k < n; k++) { if (env[k] < peak * .1) continue; const sh = S[k].shape, ext = Math.round(((LS.LEADS[sh] || LS.LEAD) - LS.LEAD) * 100);
    const want = new Set(), mine = new Set(); for (let d = -4; d <= 4 + ext; d++) { const v = truth((k + d) / 100); if (v && d <= 4) want.add(v); if (v) mine.add(v); } if (!want.size) continue; tot++; if (mine.has(sh)) ok++; }
  let flick = 0, run = 1; for (let k = 1; k < n; k++) { if (S[k].shape === S[k - 1].shape) { run++; continue; } if (k - run > 0 && run < Math.round(LS.MIN_HOLD * 100) - 1) flick++; run = 1; }
  const firstVoiced = env.findIndex(v => v > peak * .1) / 100;
  // độ lệch miệng–tiếng = 2 phép đo, cổng lấy cái xấu hơn (≤ 45 ms):
  // (a) miệng ↔ hình chuẩn theo âm vị Kokoro (cùng nguồn sinh tiếng: pred_dur điều khiển bộ giải mã), tương quan chéo theo TỪNG CỤM có tiếng (cắt ở lặng ≥ 120 ms, cụm ≥ 0,6 s);
  // (b) âm vị ↔ tiếng: mép khúc âm vị (phoneSpans, cùng khúc làm hình chuẩn) so với mép bật tiếng (LS.onsets: cùng ngưỡng ONSET với align/anchor), TB theo TỪNG CỤM (alignChunksMs).
  // Miệng ↔ tiếng = (a) + (b) của chính cụm đó; cổng = giá trị |·| lớn nhất trong các cụm và (c) dưới đây. Trước 02/11 (b) lấy TB cả câu cộng vào mọi cụm, đo 5 % mà align neo 10 %,
  // và âm vị đầu câu muộn 35–60 ms (BOS) bị cộng trùng dù miệng đã neo vào tiếng → es-age-be 60 ms giả. Nay âm vị đầu đoạn neo vào tiếng (LS.anchor) trước khi dựng
  // miệng + hình chuẩn; độ lệch gốc của Kokoro vẫn báo ở kokoroOnsetMs. Test hồi quy: scripts/test/rig-lag.mjs (tiêm trễ 60 ms → cổng đỏ).
  // Đo cũ "độ mở ↔ độ lớn tiếng" (lagEnvMs) giữ để đối chiếu, KHÔNG làm cổng: âm mũi/hữu thanh (m, n, ŋ) to mà miệng khép, đuôi nguyên âm đôi nhỏ mà miệng mở → tương quan
  // nhảy sang đỉnh phụ. Lô thử 02/11 hi-know-ing: hình chuẩn từ âm vị (không qua engine) ↔ độ lớn cũng ra +120…+300 ms, còn engine ↔ hình chuẩn 0–10 ms; quét gain release
  // 30–120 ms không đổi số đo → không phải lỗi engine.
  const open = S.map(q => q.mouth.u + q.mouth.d), chunks = []; let c0 = -1, quiet = 0;
  const truthOpen = Array.from({ length: n }, (_, k) => { const v = truth(k / 100) || 'X', p = LM.mix(v, v, 1); return p.u + p.d; });
  // cụm: cùng ngưỡng LS.ONSET / LS.QUIET với mép bật tiếng; cụm < 0,6 s GỘP vào cụm sau (cuối câu: vào cụm trước), không bỏ – trước 02/11 ngưỡng 10 % + bỏ cụm ngắn
  // làm cụm sau bắt đầu giữa từ ("Re|peat" pt_BR-people-are) → tương quan chéo trượt sang đỉnh phụ 220 ms
  const push = (a, b) => chunks.push([Math.max(0, a - 10), Math.min(n, b + 10)]); let last = -1;
  for (let k = 0; k <= n; k++) { const v = k < n && env[k] >= peak * LS.ONSET;
    if (v) { if (c0 < 0) c0 = k; quiet = 0; last = k; continue; }
    if (c0 < 0 || (++quiet < LS.QUIET * 100 && k < n)) continue;
    if (last + 1 - c0 >= 60) { push(c0, last + 1); c0 = -1; } else if (k === n) { if (chunks.length) chunks[chunks.length - 1][1] = Math.min(n, last + 11); else push(c0, last + 1); }
    quiet = 0; }
  const lagEnvChunksMs = chunks.map(([a, b]) => xlag(open.slice(a, b), env.slice(a, b))), lagGlobalMs = xlag(open, env);
  const ons = LS.onsets(env), diff = spans => { const P = spans.filter(x => x.v !== ' ' && x.v !== 'X');
    return P.length ? ons.map(t => Math.round(1000 * (P.reduce((m, x) => Math.abs(x.s - t) < Math.abs(m.s - t) ? x : m).s - t))) : []; };
  const onsetDiffMs = diff(sp), kokoroOnsetMs = diff(LS.phoneSpans(s.ph)), mean = v => v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
  const CH = chunks.length ? chunks : [[0, n]], alignChunksMs = CH.map(([a, b]) => mean(onsetDiffMs.filter((_, j) => ons[j] * 100 >= a && ons[j] * 100 < b)));
  const alignMs = mean(onsetDiffMs), lagChunksMs = CH.map(([a, b], j) => xlag(open.slice(a, b), truthOpen.slice(a, b)) + alignChunksMs[j]);
  // (c) miệng ↔ tiếng trực tiếp ở mỗi mép bật tiếng: khung đầu tiên miệng MỞ (hình khác X nghỉ và A môi khép, trong ±200 ms) − mép tiếng.
  // Mép lấy từ tiếng, không từ âm vị (trừ âm môi dưới đây) → bắt cả lỗi neo sai. A tính là khép: môi khép cho "p/b" hiện trong lúc khép im trước tiếng bật là đúng phát âm (vi-final-s "Plays":
  // A sớm 100 ms), miệng chỉ mở khi bật. Miệng không khép qua lặng ngắn (không có khung khép trong 200 ms trước mép) → không có mép để đo, bỏ qua (null).
  // Hình mở CHỦ Ý đi trước (LS.LEADS: F/V 45, chu môi 40 ms) được trừ phần đi trước dư so với LEAD chung – như cổng đúng hình ở trên.
  const shut = k => S[k].shape === 'X' || S[k].shape === 'A';
  // Âm môi hữu thanh (m, b) đang phát ngay tại mép tiếng: môi còn khép khi đã có tiếng → mốc mở = cuối khúc A đó (hi-good-name "May", pt_BR "means").
  const mouthOnsetMs = ons.map(t => { const m = sp.find(x => x.v === 'A' && x.s <= t + 0.01 && t + 0.01 < x.e), k0 = Math.min(n - 1, Math.round((m ? m.e : t) * 100)); let k = k0;
    if (shut(k)) { while (k < Math.min(n - 1, k0 + 20) && shut(k)) k++; } else { while (k > Math.max(0, k0 - 20) && !shut(k - 1)) k--; if (k === 0 || !shut(k - 1)) return null; }
    return (k - k0) * 10 + Math.round(((LS.LEADS[S[k].shape] || LS.LEAD) - LS.LEAD) * 1000); });
  const lagMs = [...lagChunksMs, ...mouthOnsetMs.filter(x => x !== null)].reduce((m, x) => Math.abs(x) > Math.abs(m) ? x : m, 0);
  return { ...s, env, cues, M, chunks, lagMs, lagGlobalMs, lagChunksMs, lagEnvChunksMs, onsetDiffMs, kokoroOnsetMs, mouthOnsetMs, alignMs, alignChunksMs, visemePct: tot ? Math.round(100 * ok / tot) : 0, flicker: flick, firstVoiced };
}
