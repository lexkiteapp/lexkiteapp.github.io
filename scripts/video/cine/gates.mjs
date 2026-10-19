// Cổng QA chế độ cine (docs/VIDEO-PIPELINE.md §13, MEDIA-QA-RUBRIC D "cổng tự động") – HÀM THUẦN: nhận số đo (measure.py, ffmpeg) → kết luận.
// Mỗi cổng trả { k, status: 'PASS'|'FAIL'|'WARN'|'SKIP', note, data }. SKIP = không đo được → "cần duyệt tay" (không bao giờ tự PASS).
// Ngưỡng ở đây (TH) – đổi ngưỡng = đổi file này + test scripts/test/cine.mjs.

export const TH = {
  propTol: 0.08,          // teen:adult = heightFactor ± 0.08
  counterTol: 0.12,       // mặt quầy / chiều cao người lớn ± 0.12 quanh scenes.counter.atAdult
  paletteMaxDE: 22,       // màu lớn của ref (≥ 6 % diện tích) phải có màu gần trong vùng người (ΔE)
  sleeveMaxDE: 16,        // màu tay áo vai→khuỷu ↔ ref (bắt đổi màu áo)
  minLine: 2.0,           // Kling Lip Sync: câu ≥ 2 s
  shotMargin: 0.2,        // giọng ≤ độ dài shot − 0,2 s
  openWindow: 0.5,        // cổng mở đầu: năng lượng âm trong 0,5 s đầu
  openMinDb: -35,         // RMS ≥ −35 dBFS
  hookAt: 1 / 30,         // hook hiện từ khung 0
  cpsMax: 15,             // ký tự/giây phụ đề
  subMin: 1.2,            // ≥ 1,2 s/trang (≤ 2 từ được miễn)
  lufs: -16, lufsTol: 1,
  faceOverlap: 0.02,      // chữ chạm > 2 % diện tích mặt = đè mặt
};

const G = (k, status, note, data) => ({ k, status, note, ...(data ? { data } : {}) });
export const worst = list => (list.some(g => g.status === 'FAIL') ? 'FAIL' : list.some(g => g.status === 'SKIP') ? 'SKIP' : list.some(g => g.status === 'WARN') ? 'WARN' : 'PASS');
const r2 = x => Math.round(x * 100) / 100;

// ---------- màu (Lab) ----------
export const dE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
/** Màu lớn của ref (share ≥ major, bỏ nền gần trắng) → ΔE xa nhất tới màu gần nhất trong sig (cùng logic asset_anatomy.palette_distance). */
export function paletteDistance(refSig, sig, major = 0.06) {
  if (!refSig || !refSig.length || !sig || !sig.length) return null;
  let w = 0; const worstOf = [];
  for (const [lab, share] of refSig) {
    if (share < major || lab[0] > 95) continue;
    const d = Math.min(...sig.filter(s => s[1] >= 0.004).map(s => dE(lab, s[0])));
    worstOf.push({ lab, d: r2(d) }); if (d > w) w = d;
  }
  return { worst: r2(w), colors: worstOf };
}

// ---------- 1. tỉ lệ ----------
/** Ghép người đo được với vai theo blocking: vị trí trái/phải (scenes.roles) – 2 người: trái nhất / phải nhất. */
export function assignPeople(persons, slots, W) {
  const ps = (persons || []).filter(p => (p.box[2] - p.box[0]) < 0.8 * W).sort((a, b) => a.cx - b.cx);
  const out = {};
  if (ps.length < slots.length) return { out, missing: slots.length - ps.length, found: ps.length };
  const L = ps[0], R = ps[ps.length - 1];
  for (const s of slots) out[s.who] = s.side === 'left' ? L : s.side === 'right' ? R : ps[0];
  return { out, missing: 0, found: ps.length };
}
/** Chiều cao ước lượng (px) của 1 người: chân thấy → hộp; bị quầy che (đáy hộp sát vạch quầy) → phần trên quầy / (1 − atAdult) (quầy = hông người lớn). */
export function personHeight(p, counterY, H, atAdult) {
  const behind = counterY != null && Math.abs(p.box[3] - counterY) <= 0.05 * H;
  if (behind) return { h: (counterY - p.box[1]) / (1 - atAdult), how: 'above-counter', top: p.box[1] };
  return { h: p.box[3] - p.box[1], how: p.box[3] >= 0.99 * H ? 'cut-by-frame' : 'full', top: p.box[1], floor: p.box[3] };
}
/** Cổng 1 – ảnh khung đầu 2 người: teen:adult ≈ heightFactor ± tol; quầy: (sàn − mặt quầy)/cao người lớn ≈ atAdult ± tol. 1 người: không đo (SKIP chỉ khi blocking yêu cầu). */
export function proportionGate(meas, plan, cast, scene) {
  const slots = plan.slots || [];
  if ((plan.people || 1) < 2) {
    const big = ((meas && meas.persons) || []).filter(p => p.h >= 0.25 * meas.h && (p.box[2] - p.box[0]) < 0.8 * meas.w);
    if (big.length >= 2) return G('proportion', 'FAIL', `khung 1 người nhưng bộ dò thấy ${big.length} người (người thừa/lọt cảnh)`, { found: big.length });
    return G('proportion', 'PASS', 'khung 1 người – tỉ lệ đo ở khung 2 người (khung này lấy khung 2 người làm tham chiếu)', { measured: false });
  }
  if (!meas || meas.mp) return G('proportion', 'SKIP', 'không chạy được MediaPipe – cần duyệt tay tỉ lệ', null);
  const { out, missing, found } = assignPeople(meas.persons, slots, meas.w);
  if (missing) return G('proportion', 'FAIL', `cần ${slots.length} người, bộ dò thấy ${found} – sai bố cục/thiếu người`, { found });
  const teen = slots.find(s => (cast.characters[s.who] || {}).ageClass === 'teen'), adult = slots.find(s => (cast.characters[s.who] || {}).ageClass === 'adult');
  if (!teen || !adult) return G('proportion', 'PASS', 'không có cặp teen–người lớn trong khung', { measured: false });
  const cy = meas.counter ? meas.counter.y : null, at = (scene.counter || {}).atAdult ?? 0.52;
  const ht = personHeight(out[teen.who], cy, meas.h, at), ha = personHeight(out[adult.who], cy, meas.h, at);
  if (ht.how === 'cut-by-frame' && ha.how === 'cut-by-frame') return G('proportion', 'SKIP', 'cả 2 người bị khung cắt – không đo được', null);
  const want = cast.characters[teen.who].heightFactor / (cast.characters[adult.who].heightFactor || 1), tol = cast.proportionTol ?? TH.propTol;
  const ratio = ht.h / ha.h, data = { ratio: r2(ratio), want, tol, teen: { who: teen.who, ...ht, h: Math.round(ht.h) }, adult: { who: adult.who, ...ha, h: Math.round(ha.h) }, counterY: cy };
  const issues = [];
  if (Math.abs(ratio - want) > tol) issues.push(`${teen.who}:${adult.who} = ${r2(ratio)} (cần ${want} ± ${tol})`);
  // quầy: chỉ đo được khi teen đứng đủ chân (có mốc sàn) và thấy vạch quầy
  if (cy != null && ht.how === 'full' && scene.counter) {
    const rel = (ht.floor - cy) / (ht.h / want); data.counterRel = r2(rel);
    if (Math.abs(rel - at) > (scene.counter.tol ?? TH.counterTol)) issues.push(`quầy cao ${r2(rel)} × người lớn (cần ${at} ± ${scene.counter.tol ?? TH.counterTol})`);
  } else data.counterRel = null;
  return G('proportion', issues.length ? 'FAIL' : 'PASS', issues.length ? issues.join('; ') : `${teen.who}:${adult.who} = ${r2(ratio)} (cần ${want} ± ${tol})${data.counterRel != null ? `, quầy ${data.counterRel}` : ''}`, data);
}

// ---------- 2. trang phục / nhận diện ----------
/** Cổng 2 – mỗi nhân vật trong khung: bảng màu ref ↔ vùng người (hoặc cả khung nếu bộ dò không bắt được người cận), tay áo ↔ ref. */
export function identityGate(meas, plan, refs, cast) {
  if (!meas || meas.mp) return G('identity', 'SKIP', 'không chạy được MediaPipe – cần duyệt tay trang phục', null);
  const slots = plan.slots || [], { out } = assignPeople(meas.persons, slots, meas.w), issues = [], data = {};
  for (const s of slots) {
    const ref = refs[s.who]; if (!ref) { issues.push(`thiếu số đo ref ${s.who}`); continue; }
    const p = out[s.who] || (slots.length === 1 ? (meas.persons || [])[0] : null);
    const lim = (cast.characters[s.who] || {}).identity || {};
    // phần nhân vật thấy được: khung cận/trung (MCU/MS) hoặc đứng sau quầy → nửa trên ref; toàn thân → cả ref
    const counterY = meas.counter ? meas.counter.y : null;
    const upper = !p || /^(MCU|MS|CU)$/.test(plan.framing || '') || (counterY != null && Math.abs(p.box[3] - counterY) <= 0.05 * meas.h); // không bắt được người → so cả khung với nửa trên ref (dễ dãi, ghi region:frame)
    const refSig = upper ? ((ref.bands || {})['0.5'] || ref.palette) : ref.palette;
    const pd = paletteDistance(refSig, p ? p.sig : meas.sig);
    const sl = p && p.sleeve && ref.sleeve ? r2(dE(p.sleeve, ref.sleeve)) : null;
    // Pose lấy mẫu tay áo hay lệch trên tranh 2D (tay che, cầm ly) → chỉ FAIL khi màu áo ref VẮNG HẲN khỏi vùng người (bắt áo đổi màu, pilot: Carlos áo xanh)
    const sleeveAbsent = sl != null && sl > (lim.sleeveMaxDE ?? TH.sleeveMaxDE) ? Math.min(...(p.sig || []).filter(x => x[1] >= 0.02).map(x => dE(x[0], ref.sleeve))) : null;
    data[s.who] = { palette: pd && pd.worst, sleeve: sl, sleeveInRegion: sleeveAbsent == null ? null : r2(sleeveAbsent), region: p ? 'person' : 'frame', refPart: upper ? 'upper' : 'full', worstColor: pd && pd.colors.sort((a, b) => b.d - a.d)[0] };
    if (pd == null) issues.push(`${s.who}: không có bảng màu`);
    else if (pd.worst > (lim.paletteMaxDE ?? TH.paletteMaxDE)) issues.push(`${s.who}: màu trang phục lệch ΔE ${pd.worst}`);
    if (sleeveAbsent != null && sleeveAbsent > (lim.sleeveMaxDE ?? TH.sleeveMaxDE)) issues.push(`${s.who}: màu áo ref không còn trong vùng người (tay áo ΔE ${sl}, gần nhất ΔE ${r2(sleeveAbsent)})`);
  }
  if (!slots.length) return G('identity', 'SKIP', 'shot không có nhân vật', null);
  return G('identity', issues.length ? 'FAIL' : 'PASS', issues.length ? issues.join('; ') : 'trang phục khớp ref ' + Object.entries(data).map(([k, v]) => `${k} ΔE ${v.palette}${v.sleeve != null ? '/tay ' + v.sleeve : ''}`).join(', '), data);
}

// ---------- 3. AI thị giác (vật thừa / chữ vô nghĩa) ----------
/** v = { status, reasons, perFrame?: [{t, issues[]}] } từ vision.mjs. Lỗi chỉ ở khung cuối → cắt shot trước đó (luật cắt). */
export function visionGate(v, frameTimes = []) {
  if (!v || v.status === 'SKIP') return G('vision', 'SKIP', 'cần duyệt tay: ' + ((v && v.reasons || []).join('; ') || 'chưa có AI thị giác (CLOUDFLARE_API_TOKEN / GEMINI_KEYS)'), { needsHumanReview: true });
  if (v.status === 'PASS') return G('vision', 'PASS', 'không vật thừa / chữ vô nghĩa', null);
  const bad = (v.perFrame || []).filter(f => f.issues && f.issues.length).map(f => f.t);
  const firstBad = bad.length ? Math.min(...bad) : 0;
  if (bad.length && firstBad > 0 && frameTimes.length) {
    const okBefore = frameTimes.filter(t => t < firstBad); const trimTo = okBefore.length ? Math.max(...okBefore) + (firstBad - Math.max(...okBefore)) / 2 : null;
    if (trimTo) return G('vision', 'WARN', `lỗi từ ${firstBad}s → cắt shot ở ${r2(trimTo)}s: ${v.reasons.join('; ')}`, { trimTo: r2(trimTo) });
  }
  return G('vision', 'FAIL', v.reasons.join('; '), null);
}

// ---------- 4. Lip Sync ----------
/** Ranh giới giọng nói từ silencedetect: đầu = hết im lặng đầu file; cuối = đầu đoạn im lặng KÉO TỚI HẾT FILE (khoảng ngắt giữa câu không tính – lỗi pilot). */
export function speechBounds(silences, dur, eps = 0.06, tailEps = 0.15) {
  const s = [...(silences || [])].sort((a, b) => a.start - b.start);
  let a = 0, b = dur;
  if (s.length && s[0].start <= eps) a = s[0].end;
  const tail = s.filter(x => (x.end == null || x.end >= dur - tailEps) && x.start > a);
  if (tail.length) b = tail[tail.length - 1].start;
  if (b <= a) return { start: 0, end: 0, dur: 0, pauses: [] };
  const pauses = s.filter(x => x.start > a + 0.01 && x.end != null && x.end < b - 0.01).map(x => ({ start: r2(x.start), end: r2(x.end) }));
  return { start: r2(a), end: r2(b), dur: r2(b - a), pauses };
}
/** Cổng 4 – trước khi gửi Lip Sync (và kiểm lại sau): câu ≥ 2 s, ≤ shot − 0,2 s, tắt tiếng gốc, chọn mặt rõ khi ≥ 2 mặt, giọng/cảm xúc theo cast bible. */
export function lipsyncGate(shot, speech, req, cast) {
  const issues = [], warn = [], c = cast.characters[shot.speaker] || {};
  if (!speech || !speech.dur) issues.push('không tìm thấy giọng trong file TTS');
  else {
    if (speech.dur < (TH.minLine)) issues.push(`câu ${speech.dur}s < ${TH.minLine}s (Kling Lip Sync) – sửa kịch bản/thêm thán từ trong kịch bản, không đệm im lặng`);
    if (speech.dur > shot.motion.duration - TH.shotMargin) issues.push(`câu ${speech.dur}s > shot ${shot.motion.duration}s − ${TH.shotMargin}`);
  }
  if (req) {
    if (req.originalAudioVolume !== 0) issues.push('chưa tắt tiếng gốc (original_audio_volume phải = 0)');
    if (req.faces > 1 && !req.faceChosenBy) issues.push(`${req.faces} mặt trong shot nhưng chưa chọn mặt rõ ràng`);
    if (req.faces > 1 && req.faceMargin != null && req.faceMargin < 0.05) warn.push(`chọn mặt sát nút (chênh ${req.faceMargin}) – soi tay`);
    if (req.faces === 0) issues.push('Kling không thấy mặt nào trong shot');
  }
  if (!(c.voice && c.voice.name)) issues.push(`${shot.speaker}: cast bible thiếu giọng cố định`);
  if (shot.voice && c.voice && shot.voice.name !== c.voice.name) issues.push(`${shot.speaker}: giọng ${shot.voice.name} ≠ cast bible ${c.voice.name}`);
  return G('lipsync', issues.length ? 'FAIL' : warn.length ? 'WARN' : 'PASS', [...issues, ...warn].join('; ') || `câu ${speech && speech.dur}s, tiếng gốc tắt${req && req.faces > 1 ? `, chọn mặt ${req.faceChosenBy}` : ''}`, { speech, req });
}

// ---------- 5. mở đầu ----------
export function openingGate(openDb, events) {
  const hook = (events || []).filter(e => e.style === 'Hook').sort((a, b) => a.t0 - b.t0)[0], issues = [];
  if (openDb == null || !isFinite(openDb) || openDb < TH.openMinDb) issues.push(`0,5 s đầu gần im lặng (${openDb == null || !isFinite(openDb) ? '−∞' : r2(openDb)} dBFS < ${TH.openMinDb}) – hook phải có tiếng ngay`);
  if (!hook) issues.push('không có hook chữ');
  else if (hook.t0 > TH.hookAt) issues.push(`hook hiện lúc ${r2(hook.t0)}s (phải từ khung 0)`);
  return G('opening', issues.length ? 'FAIL' : 'PASS', issues.join('; ') || `âm ${r2(openDb)} dBFS, hook từ ${r2(hook.t0)}s`, { openDb: openDb != null && isFinite(openDb) ? r2(openDb) : null, hookT0: hook ? hook.t0 : null });
}

// ---------- 6. bố cục / phụ đề / thẻ ----------
const area = b => Math.max(0, b[2] - b[0]) * Math.max(0, b[3] - b[1]);
const inter = (a, b) => area([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]);
const words = s => String(s).trim().split(/\s+/).filter(Boolean).length;
/** segs = [{id, t0, t1, faces:[box 1080×1920], speech:{start,end} (tuyệt đối)}], events = [{style, t0, t1, text, box, shot, payoff?}] */
export function layoutGate(segs, events) {
  const issues = [], segOf = t => segs.find(s => t >= s.t0 - 1e-3 && t < s.t1 - 1e-3);
  for (const e of events) {
    const s = segs.find(x => x.id === e.shot) || segOf(e.t0);
    const label = `${e.style} "${String(e.text).slice(0, 24)}"`;
    if (e.style === 'Sub') {
      if (!s || e.t0 < s.t0 - 0.01 || e.t1 > s.t1 + 0.01) issues.push(`${label} vượt qua điểm cắt`);
      const d = e.t1 - e.t0, n = String(e.text).replace(/\s+/g, ' ').length, w = words(e.text);
      if (d < TH.subMin && w > 2) issues.push(`${label} ${r2(d)}s < ${TH.subMin}s`);
      if (n / Math.max(d, 0.01) > TH.cpsMax && w > 2) issues.push(`${label} ${r2(n / d)} ký tự/s > ${TH.cpsMax}`);
    }
    if (e.style === 'Card') {
      const p = e.payoff, ps = p && segs.find(x => x.id === p.shot);
      if (!p || !ps) issues.push(`${label} không gắn với câu nào`);
      else {
        if (ps.speech && e.t0 < ps.speech.start - 0.01) issues.push(`${label} hiện (${r2(e.t0)}s) trước câu nó trả lời (${r2(ps.speech.start)}s)`);
        if (e.t0 < ps.t0 - 0.01 || e.t0 > ps.t1) issues.push(`${label} không nằm trong shot của câu`);
      }
    }
    if (e.box && s && s.faces) for (const f of s.faces) { const a = area(f); if (a && inter(e.box, f) / a > TH.faceOverlap) { issues.push(`${label} đè mặt (${r2(inter(e.box, f) / a * 100)} %)`); break; } }
  }
  const subs = events.filter(e => e.style === 'Sub').sort((a, b) => a.t0 - b.t0);
  for (let i = 1; i < subs.length; i++) if (subs[i].t0 < subs[i - 1].t1 - 1e-3) issues.push(`phụ đề chồng nhau lúc ${r2(subs[i].t0)}s`);
  return G('layout', issues.length ? 'FAIL' : 'PASS', issues.slice(0, 8).join('; ') || `${subs.length} trang phụ đề, ${events.filter(e => e.style === 'Card').length} thẻ – trong shot, đúng câu, không đè mặt`, { issues });
}

// ---------- 7. màn kết ----------
/** Mọi đoạn ghép phải là tài sản của CHÍNH lần chạy này (đã băm trong manifest); màn kết = file do bước endcard dựng. */
export function endcardGate(segments, assets, endcard) {
  const issues = [], known = new Set(Object.values(assets || {}).map(a => a.sha256).filter(Boolean));
  for (const s of segments || []) if (!s.sha256 || !known.has(s.sha256)) issues.push(`đoạn ${s.id || s.file} không phải tài sản của video này`);
  if (!endcard || !endcard.sha256 || endcard.madeBy !== 'endcard') issues.push('màn kết không do bước endcard dựng riêng');
  const last = (segments || [])[segments.length - 1];
  if (!last || last.kind !== 'endcard') issues.push('đoạn cuối không phải màn kết riêng');
  return G('endcard', issues.length ? 'FAIL' : 'PASS', issues.join('; ') || 'màn kết dựng riêng, mọi đoạn là tài sản của video này', null);
}

export function loudnessGate(lufs) {
  if (lufs == null || !isFinite(lufs)) return G('loudness', 'SKIP', 'không đo được LUFS', null);
  return G('loudness', Math.abs(lufs - TH.lufs) <= TH.lufsTol ? 'PASS' : 'FAIL', `${r2(lufs)} LUFS (cần ${TH.lufs} ± ${TH.lufsTol})`, { lufs: r2(lufs) });
}

/** Điểm máy cho Studio (RUBRIC functions/api/studio.js): knowledge/share để trống → chờ chấm tay. */
export function studioQa(gates) {
  const st = k => (gates.find(g => g.k === k) || {}).status;
  const sc = (k, max) => (st(k) === 'PASS' ? max : st(k) === 'WARN' ? Math.round(max * 0.7) : st(k) === 'SKIP' ? null : Math.round(max * 0.3));
  const scores = { hook: sc('opening', 15), lipsync: sc('lipsync', 15), audio: sc('loudness', 10), subs: sc('layout', 10), pacing: 10, brand: st('endcard') === 'PASS' && ['PASS', 'WARN'].includes(st('vision')) ? 10 : st('vision') === 'SKIP' ? null : 3, cta: st('endcard') === 'PASS' ? 5 : 0 };
  for (const k of Object.keys(scores)) if (scores[k] == null) delete scores[k];
  const blocked = gates.some(g => g.status === 'FAIL');
  return { scores, gates: gates.map(g => ({ k: g.k, ok: g.status === 'PASS', note: `${g.status} ${g.note}`.slice(0, 160) })), blocked, consistency: gates.filter(g => g.status !== 'PASS').map(g => `${g.k}: ${g.note}`.slice(0, 200)), mode: 'cine' };
}
