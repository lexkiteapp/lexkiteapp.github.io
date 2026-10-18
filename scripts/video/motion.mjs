// Lớp MOTION của dây chuyền video (docs/VIDEO-PIPELINE.md §10) – HÀM THUẦN (không file/mạng/ffmpeg) để test được (scripts/test/motion.mjs).
// render.mjs bước compose: state.json → buildTimeline() → props.json → Remotion (scripts/video/remotion, 1 composition / khuôn) → video câm → ffmpeg trộn tiếng.
// Gồm: trang phụ đề động (từng từ bật, từ khóa hộp vàng) · 12 chuyển cảnh chọn theo ngữ cảnh · ngắt nhịp 2–3 s · hook 1,5 s · thẻ ❌/✅ · sticker SVG Lexkite
//   · grade màu theo bối cảnh/giờ · tự đặt SFX · thước đo "visual hook" 2 s đầu + QA màu (cháy/bết, bão hòa, ΔE da↔phòng).
import { norm, tokens, BRAND, contrast } from './lib.mjs';
import { rng, hash32 } from './variants.mjs';

const r3 = x => Math.round(x * 1000) / 1000;
export const FPS = 30;

// ---------- Thư viện ----------
export const TRANSITIONS = ['whip-pan', 'zoom-blur', 'swipe-mask', 'circle-reveal', 'glitch', 'page-flip', 'slide-stack', 'light-leak', 'match-cut', 'split-screen', 'kit-fly', 'confetti-burst'];
export const TRANSITION_DUR = { 'whip-pan': 0.36, 'zoom-blur': 0.4, 'swipe-mask': 0.42, 'circle-reveal': 0.45, glitch: 0.3, 'page-flip': 0.5, 'slide-stack': 0.42, 'light-leak': 0.55, 'match-cut': 0.2, 'split-screen': 0.55, 'kit-fly': 0.6, 'confetti-burst': 0.6 };
// nhóm theo vai trò: đổi bối cảnh = chuyển "lớn"; cùng người nói = match-cut/zoom; vào đáp án/CTA = ăn mừng
const BIG = ['kit-fly', 'circle-reveal', 'page-flip', 'split-screen', 'light-leak'];
const SAME = ['match-cut', 'zoom-blur', 'whip-pan'];
const CELEBRATE = ['confetti-burst', 'light-leak', 'circle-reveal'];
const SHOCK = ['glitch', 'zoom-blur', 'whip-pan'];
export const HOOK_PATTERNS = ['stop-saying', 'question', 'wait-for-it', 'pov', 'quiz-timer', 'myth-buster', 'versus', 'countdown-list', 'secret', 'mistake-stat', 'challenge', 'story-cold-open'];
export const PAYOFFS = ['compare-cards', 'answer-reveal', 'tip-card', 'checklist', 'meter', 'flip-card', 'stamp-correct', 'before-after'];
export const CAPTION_STYLES = ['pop-box', 'bounce-outline', 'karaoke-bar', 'mega-word'];
export const LAYOUTS = { // vùng an toàn 1080×1920: trên 220 px (tab app), dưới 420 px (mô tả + nút), phải 140 px (cột nút) – y theo tỉ lệ khung
  'stage-center': { hookY: 0.17, capY: 0.6, cardY: 0.3 },
  'top-hook': { hookY: 0.13, capY: 0.64, cardY: 0.34 },
  'lower-third': { hookY: 0.17, capY: 0.7, cardY: 0.28 },
  'split-card': { hookY: 0.15, capY: 0.58, cardY: 0.32 },
};
export const SAFE = { top: 220, bottom: 420, left: 60, right: 140 };
// Màu: tối đa 3 màu nhấn mỗi theme (luật anh chủ) – chữ luôn trắng/mực trên nền đã kiểm tương phản ≥ 4.5
export const COLOR_THEMES = {
  'teal-cream': { bg: ['#0F3D3E', '#17595A'], accents: ['#E5502F', '#FFC94A', '#2FBF71'], text: '#FFFFFF', ink: '#14100E' },
  'sunset-pop': { bg: ['#E5502F', '#0F3D3E'], accents: ['#FFC94A', '#FFB054', '#2FBF71'], text: '#FFFFFF', ink: '#14100E' },
  'mint-fresh': { bg: ['#17595A', '#0F3D3E'], accents: ['#2FBF71', '#FFC94A', '#E5502F'], text: '#FFFFFF', ink: '#14100E' },
  'night-glow': { bg: ['#0B2627', '#0F3D3E'], accents: ['#FFC94A', '#FFB054', '#E5502F'], text: '#FFFFFF', ink: '#14100E' },
  'paper-ink': { bg: ['#FFF7EA', '#FFE7C2'], accents: ['#E5502F', '#0F3D3E', '#FFC94A'], text: '#14100E', ink: '#14100E' },
};
// Grade (LUT dạng đường cong từng kênh – feComponentTransfer 5 điểm 0→1): áp CHUNG cho nền + nhân vật để 2 lớp hòa tông (docs/ASSET-LIBRARY.md §Grade)
export const GRADES = {
  'day-warm': { r: [0.03, 0.27, 0.56, 0.84, 0.98], g: [0.07, 0.27, 0.53, 0.8, 0.95], b: [0.1, 0.27, 0.48, 0.72, 0.86], sat: 1.06, blur: 3, vignette: 0.38, rim: '#FFB054', bloom: 0.16 },
  night: { r: [0.02, 0.17, 0.42, 0.74, 0.97], g: [0.05, 0.22, 0.45, 0.72, 0.9], b: [0.12, 0.33, 0.55, 0.74, 0.8], sat: 0.96, blur: 4, vignette: 0.5, rim: '#FFC94A', bloom: 0.22 },
  studio: { r: [0.02, 0.26, 0.53, 0.8, 0.97], g: [0.04, 0.26, 0.52, 0.79, 0.96], b: [0.06, 0.27, 0.5, 0.76, 0.93], sat: 1.04, blur: 2, vignette: 0.32, rim: '#FFB054', bloom: 0.12 },
};
export const gradeFor = ({ time, hasRoom }) => (!hasRoom ? 'studio' : time === 'night' ? 'night' : 'day-warm');
export const STICKERS = ['cross', 'check', 'star', 'bulb', 'question', 'exclaim', 'fire', 'heart', 'arrow', 'sparkle', 'clock', 'lock'];
const STICKER_BY_EMO = { wrong: ['exclaim', 'cross', 'fire'], ask: ['question', 'clock'], right: ['check', 'star', 'sparkle'], explain: ['bulb', 'arrow', 'sparkle'], cta: ['heart', 'arrow'], talk: ['sparkle', 'star', 'arrow'] };
// Huy hiệu & sticker riêng của từng kiểu hook
export const HOOK_KIT = {
  'stop-saying': { sticker: 'cross', sfx: 'wrong', shake: true }, question: { sticker: 'question', sfx: 'hook' }, 'wait-for-it': { sticker: 'clock', sfx: 'preReveal' },
  pov: { sticker: 'arrow', sfx: 'hook' }, 'quiz-timer': { sticker: 'clock', sfx: 'quizTick' }, 'myth-buster': { sticker: 'exclaim', sfx: 'hook', shake: true },
  versus: { sticker: 'fire', sfx: 'hook' }, 'countdown-list': { sticker: 'star', sfx: 'hook' }, secret: { sticker: 'lock', sfx: 'typeOn' },
  'mistake-stat': { sticker: 'exclaim', sfx: 'wrong', shake: true }, challenge: { sticker: 'fire', sfx: 'quizTick' }, 'story-cold-open': { sticker: 'sparkle', sfx: 'typeOn' },
};

// ---------- Phụ đề động ----------
// Đánh dấu từ khóa: mọi cụm trong keywords khớp liên tiếp (so khớp norm) → key = true
export function markKeywords(words, keywords = []) {
  const ks = keywords.map(k => tokens(k).map(norm)).filter(k => k.length);
  const n = words.map(w => norm(w.w)), key = new Array(words.length).fill(false);
  for (const k of ks) for (let i = 0; i + k.length <= n.length; i++) if (k.every((x, j) => n[i + j] === x)) for (let j = 0; j < k.length; j++) key[i + j] = true;
  return words.map((w, i) => ({ ...w, key: key[i] }));
}
// Chia mỗi câu thành "trang" 2–3 từ (karaoke: tới 6): ngắt ở dấu câu hoặc khi quá dài; trang giữ tới trang sau (không nháy trống giữa câu).
const FUNC = /^(on|in|at|to|of|for|with|a|an|the|and|or|but|is|are|was|so|my|your|our|their|his|her|its|i|we|you|it|this|that|not|no|be|by|from|as|if|than|then|could|would|can|will)$/i;
// Không ngắt ngay SAU từ này (mạo từ/giới từ/sở hữu + danh từ, "to" + động từ) và không ngắt ngay TRƯỚC tiểu từ của cụm động từ (push back, run out…)
const NOBREAK_AFTER = /^(because|and|but|or|so|if|when|that|which|a|an|the|to|of|for|with|at|on|in|from|by|before|after|about|like|than|into|during|without|until|my|your|our|their|his|her|its|this|that|these|those|some|any|no|very|so|too|more|most|i|we|you|they|he|she|it|can|could|would|will|should|do|does|did|don't|doesn't|is|are|was|were|be|not)$/i;
const PARTICLE = /^(up|down|out|off|in|on|back|over|away|around|through|about)[.,!?;:]?$/i;
const clean = w => String(w).replace(/^["“'‘(]+|["”'’).,!?;:…]+$/g, '');
// cost ngắt giữa ws[k-1] | ws[k] (dòng hoặc trang): 0 = ranh câu/mệnh đề tốt, lớn = cụm không được tách
export function breakCost(ws, k) {
  const a = ws[k - 1], b = ws[k]; if (!a || !b) return 0;
  if (/[.!?…]["”']?$/.test(a)) return -20; if (/[,;:–—]["”']?$/.test(a)) return -6;
  let c = 0; if (NOBREAK_AFTER.test(clean(a))) c += 40; else if (/^(a|an|the|to|of|for|with|at|on|in|from|before|after|about|and|but|or|because|when|if|that|which|who)$/i.test(clean(b))) c -= 8; /* ngắt TRƯỚC mạo từ/giới từ/liên từ = ranh cụm */ if (PARTICLE.test(b) && !/[,.;:!?]$/.test(a)) c += 30;
  if (/^[A-Z]/.test(clean(a)) && /^[A-Z]/.test(clean(b)) && k > 1) c += 30; // tên riêng nhiều chữ
  return c;
}
// Xuống dòng trong 1 trang: tối đa maxLines dòng ≤ maxChars, ngắt ở ranh cụm/mệnh đề (breakCost), cân độ dài; từ dài hơn giới hạn được đứng riêng.
export function breakLines(ws, { maxChars = 30, maxLines = 2 } = {}) {
  const L = ws.map(w => w.length), tot = L.reduce((a, b) => a + b, 0) + ws.length - 1;
  if (tot <= maxChars || ws.length < 2) return [ws.length];
  let best = null;
  const rec = (i, acc) => {
    if (acc.length > maxLines) return;
    if (i === ws.length) {
      const lens = acc.map((n, k) => { const st = acc.slice(0, k).reduce((a, b) => a + b, 0); return ws.slice(st, st + n).join(' ').length; });
      if (lens.some((x, k) => x > maxChars * 1.15 && acc[k] > 1)) return;
      let cost = 0.4 * (Math.max(...lens) - Math.min(...lens)) + 6 * acc.length; let st = 0;
      acc.forEach((n, k) => { st += n; if (k < acc.length - 1) cost += breakCost(ws, st); if (n === 1 && clean(ws[st - 1]).length <= 3) cost += 40; });
      if (!best || cost < best.cost) best = { cost, acc: [...acc] };
      return;
    }
    for (let n = 1; i + n <= ws.length; n++) rec(i + n, [...acc, n]);
  };
  rec(0, []);
  return best ? best.acc : maxLines < Math.min(4, ws.length) ? breakLines(ws, { maxChars, maxLines: maxLines + 1 }) : [ws.length];
}
// ---------- Phụ đề chuẩn phim (video-calm 18/10, Netflix/BBC chỉnh cho người học) ----------
// Trang 3–7 từ (câu < 3 từ = 1 trang), ≤ 2 dòng × ~30 ký tự, ngắt ở ranh cụm/mệnh đề; hiện CẢ TRANG một lúc (mờ-lên 130 ms), từ đang đọc chỉ đổi màu.
// Giờ hiện: sớm ≤ 0,1 s trước tiếng, ở lại ≤ 0,5 s sau tiếng (không lấn trang sau), cách trang sau ≥ 2 khung, cố gắng ≥ 1,2 s/trang.
// Tốc độ đọc ≤ 13 ký tự/s (cứng 15) – vượt thì sửa NHỊP (giọng chậm + nghỉ, lib.TTS_SPEED/PAUSE), không rút giờ hiện.
export const SUB = { minWords: 3, maxWords: 7, lineChars: 22, lines: 2, lead: 0.1, linger: 0.5, gap: 2 / 30, minDur: 1.2, cps: 13, cpsMax: 15 };
export const CAP_MIN_WORDS = SUB.minWords;
const pageText = ws => ws.map(w => w.w).join(' ');
export function captionPages(words, { style = 'pop-box', lineEnd = null, lineStart = null } = {}) {
  const maxC = SUB.lineChars * SUB.lines, pages = [];
  const byLine = {}; for (const w of words) (byLine[w.line] = byLine[w.line] || []).push(w);
  for (const ws of Object.values(byLine)) {
    const t = ws.map(w => w.w), lp = [];
    // chia tham lam: thêm từ tới khi đầy (7 từ / 2 dòng); ngắt ưu tiên ở điểm có breakCost thấp trong cửa sổ [minWords, hiện tại]
    let i = 0;
    while (i < ws.length) {
      let j = i; while (j < ws.length && j - i < SUB.maxWords && pageText(ws.slice(i, j + 1)).length <= maxC) j++;
      if (j >= ws.length) { lp.push(ws.slice(i)); break; }
      let best = j, bc = Infinity;
      for (let k = Math.min(j, i + 2); k <= j; k++) { if (k - i < SUB.minWords && !/[.!?…]["”']?$/.test(t[k - 1])) continue; /* trang 2 từ chỉ khi trọn câu ("Heads up?") */ const c = breakCost(t, k) - (k - i) * 0.5 + (ws.length - k < SUB.minWords ? 50 : 0); if (c < bc) { bc = c; best = k; } }
      lp.push(ws.slice(i, best)); i = best;
    }
    // trang < 3 từ (không phải cả câu) → gộp vào trang kề nếu vừa 2 dòng
    const span = p => p[p.length - 1].end - p[0].start; // trang giữa câu nói < 1 s (không kịp đọc 1,2 s) cũng gộp
    for (let k = 0; k < lp.length && lp.length > 1; k++) if ((lp[k].length < SUB.minWords && !(lp[k].length === 2 && /[.!?…]["”']?$/.test(lp[k][1].w))) || span(lp[k]) + (k < lp.length - 1 ? 0 : 0.3) < SUB.minDur) {
      const endP = /[.!?…,;:]["”']?$/.test(lp[k][lp[k].length - 1].w), j = (endP && k > 0) || k + 1 >= lp.length ? k - 1 : k + 1, a = Math.min(k, j), all = [...lp[a], ...lp[a + 1]];
      if (pageText(all).length <= maxC * 1.1 && all.length <= SUB.maxWords + 1) { lp.splice(a, 2, all); k = -1; continue; }
      // quá dài để gộp → chia lại 2 trang: điểm ngắt tốt nhất mà cả 2 trang vừa 2 dòng và đủ giờ đọc
      const tw = all.map(x => x.w); let best = null;
      for (let c = 2; c <= all.length - 2; c++) { const x = all.slice(0, c), y = all.slice(c); if (pageText(x).length > maxC || pageText(y).length > maxC) continue;
        const pen = Math.max(0, SUB.minDur - span(x)) * 200 + Math.max(0, SUB.minDur - 0.3 - span(y)) * 200 + breakCost(tw, c); if (!best || pen < best.pen) best = { pen, c }; }
      if (best && best.c !== lp[a].length) { lp.splice(a, 2, all.slice(0, best.c), all.slice(best.c)); if (k > a + 1) k = -1; }
    }
    for (const p of lp) pages.push({ line: p[0].line, words: p });
  }
  pages.sort((x, y) => x.words[0].start - y.words[0].start);
  // giờ hiện
  const out = pages.map((p, i) => { const last = !pages[i + 1] || pages[i + 1].line !== p.line, s1 = p.words[p.words.length - 1].end, le = lineEnd ? lineEnd(p.line) : null;
    const first = !i || pages[i - 1].line !== p.line, ls = lineStart ? lineStart(p.line) : null;
    return { line: p.line, s0: first && ls != null ? Math.min(p.words[0].start, ls + 0.04) : p.words[0].start, s1: last && le != null ? Math.max(s1, le - 0.12) : s1, words: p.words }; }); // whisper hay cắt sớm đuôi từ cuối → lấy đuôi giọng thật
  out.forEach((p, i) => { const prev = out[i - 1]; p.start = Math.min(p.s0, Math.max(p.s0 - SUB.lead, prev ? prev.s1 + 0.001 : 0)); });
  out.forEach((p, i) => { const nx = out[i + 1], cap = nx ? nx.start - SUB.gap : Infinity; p.end = Math.min(cap, Math.max(p.s1 + Math.min(SUB.linger, 0.25), Math.min(p.s1 + SUB.linger, p.start + SUB.minDur))); });
  // cân tốc độ đọc giữa 2 trang của cùng 1 câu: dời ranh (≤ 0,25 s sớm / 0,15 s muộn so với tiếng) để 2 trang cùng ký tự/s
  for (let i = 0; i + 1 < out.length; i++) { const A = out[i], B = out[i + 1]; if (A.line !== B.line) continue;
    const cA = pageText(A.words).length, cB = pageText(B.words).length, want = A.start + (B.end - A.start) * cA / (cA + cB);
    let bs = Math.min(B.s0 + 0.4, Math.max(B.s0 - 0.3, want)); bs = Math.max(bs, Math.min(B.s0 + 0.4, A.start + SUB.minDur + SUB.gap)); bs = Math.min(bs, Math.max(B.s0 - 0.3, B.end - SUB.minDur)); /* mốc whisper tiny lệch ±0,3 s */ B.start = Math.max(bs, A.start + 0.6); A.end = B.start - SUB.gap; }
  // trang cuối câu còn < 1,2 s: trang câu sau bỏ phần "hiện sớm" (≤ 0,1 s) để trang này ở lâu hơn
  out.forEach((p, i) => { const nx = out[i + 1]; if (!nx || nx.line === p.line || p.end - p.start >= SUB.minDur) return;
    nx.start = Math.max(nx.start, Math.min(nx.s0, p.start + SUB.minDur + SUB.gap)); p.end = Math.min(p.s1 + SUB.linger, nx.start - SUB.gap); });
  return out.map(p => ({ line: p.line, breaks: breakLines(p.words.map(w => w.w), { maxChars: style === 'mega-word' ? 18 : SUB.lineChars, maxLines: SUB.lines }), start: r3(p.start), end: r3(p.end),
    words: p.words.map(w => ({ w: w.w, key: !!w.key, pop: r3(p.start), start: w.start, end: w.end })) }));
}
// Thống kê phụ đề (QA): ký tự/giây từng trang, giờ hiện; trang ngắn chỉ được miễn khi cả câu ≤ 2 từ (thán từ "Wow!")
export function subStats(pages) {
  const byLine = {}; for (const p of pages) byLine[p.line] = (byLine[p.line] || 0) + p.words.length;
  const st = pages.map(p => { const txt = pageText(p.words), d = Math.max(0.001, p.end - p.start); return { text: txt, dur: r3(d), cps: +(txt.length / d).toFixed(1), exempt: byLine[p.line] <= 2 }; });
  const cs = st.map(x => x.cps).sort((a, b) => a - b), gaps = pages.slice(1).map((p, i) => p.start - pages[i].end);
  return { pages: st, maxCps: cs.length ? cs[cs.length - 1] : 0, medCps: cs.length ? cs[cs.length >> 1] : 0, minDur: st.length ? Math.min(...st.map(x => x.dur)) : 0, minGap: gaps.length ? r3(Math.min(...gaps)) : null,
    tooFast: st.filter(x => x.cps > SUB.cpsMax), tooShort: st.filter(x => x.dur < SUB.minDur - 1e-3 && !x.exempt) };
}

// ---------- Chuyển cảnh ----------
// cut i = giữa shot i và i+1. Chọn theo ngữ cảnh + bộ của biến thể; không lặp kiểu ở 2 cut liền nhau; luôn ≥ 4 kiểu khác nhau nếu ≥ 4 cut.
// Dựng "calm" (mặc định, video-calm 18/10): cắt THẲNG ở mọi ranh cảnh; chỉ ranh PHẦN (hook → thân, đổi bối cảnh, thân → end card) mới hoà mềm
// (crossfade 0,4 s / vào end card 0,6 s) – tối đa SOFT_MAX chuyển cảnh mềm/video. 12 kiểu cách điệu cũ vẫn giữ (calm:false) nhưng không chọn mặc định.
export const CALM_TRANSITIONS = ['cut', 'crossfade'], SOFT_MAX = 3;
Object.assign(TRANSITION_DUR, { cut: 0, crossfade: 0.4 });
export function pickTransitions(shots, { lines = [], stage = null, lead = null, seed = 'x', pool = TRANSITIONS, calm = true } = {}) {
  if (calm) return shots.slice(0, -1).map((a, i) => {
    const b = shots[i + 1], t = r3(b.start), soft = b.framing === 'card' || i === 0 || !!b.sceneChange;
    if (!soft) return { i, t, type: 'cut', d: 0, from: t, to: t };
    const d = b.framing === 'card' ? 0.6 : 0.4; return b.framing === 'card' ? { i, t, type: 'crossfade', d, from: r3(t - 0.1), to: r3(t - 0.1 + d) } : { i, t, type: 'crossfade', d, from: r3(t - d / 2), to: r3(t + d / 2) };
  });
  const R = rng('tr|' + seed), cuts = [], used = [];
  for (let i = 0; i < shots.length - 1; i++) {
    const a = shots[i], b = shots[i + 1], la = lines[a.line] || {}, lb = lines[b.line] || {};
    const sceneChange = !!(stage && stage.lines && stage.lines[b.line] && stage.lines[b.line].transitionIn && a.line !== b.line);
    let cand;
    if (b.framing === 'card') cand = CELEBRATE;
    else if (a.line === b.line) cand = SAME;
    else if (sceneChange) cand = BIG;
    else if (lb.emotion === 'wrong' || la.emotion === 'wrong') cand = SHOCK;
    else if (lb.beat === 'example' || lb.beat === 'tip') cand = ['circle-reveal', 'swipe-mask', 'slide-stack', 'kit-fly', 'light-leak'];
    else cand = pool;
    cand = cand.filter(t => pool.includes(t) || cand === CELEBRATE);
    if (i === 0 && lead && pool.includes(lead)) cand = [lead];
    const fresh = cand.filter(t => t !== used[used.length - 1] && !used.slice(-3).includes(t));
    const pickFrom = fresh.length ? fresh : cand.filter(t => t !== used[used.length - 1]).length ? cand.filter(t => t !== used[used.length - 1]) : cand;
    const type = pickFrom[Math.floor(R() * pickFrom.length)] || 'zoom-blur';
    used.push(type);
    const d = TRANSITION_DUR[type], t = b.start;
    // vào end card: hoà sáng êm (light-leak) và chỉ bắt đầu SAU khi câu CTA đọc xong (b.start = endStart = hết câu cuối + 0,4 s)
    if (b.framing === 'card') { const dc = 0.6; cuts.push({ i, t: r3(t), type: 'light-leak', d: dc, from: r3(t - 0.1), to: r3(t - 0.1 + dc) }); continue; }
    cuts.push({ i, t: r3(t), type, d, from: r3(t - d / 2), to: r3(t + d / 2) });
  }
  return cuts;
}

// ---------- Ngắt nhịp (pattern interrupt) ----------
// Mỗi khoảng trống giữa 2 "sự kiện hình" (cut/hook/thẻ) > maxGap → chèn sự kiện ở giữa (punch-in, sticker, flash, tilt) – xoay vòng kiểu.
export function patternInterrupts(events, duration, { maxGap = 2.6, minGap = 1.1, endStart = duration, lines = [], seed = 'x' } = {}) {
  const R = rng('pi|' + seed), ts = [...new Set([0, ...events.filter(t => t < endStart), endStart].map(r3))].sort((a, b) => a - b), out = [];
  const kinds = ['punch', 'sticker', 'flash', 'sticker', 'tilt', 'punch'];
  let k = Math.floor(R() * kinds.length);
  for (let i = 0; i < ts.length - 1; i++) {
    const a = ts[i], b = ts[i + 1], gap = b - a;
    if (gap <= maxGap) continue;
    const n = Math.ceil(gap / maxGap) - 1;
    for (let j = 1; j <= n; j++) {
      const t = r3(a + gap * j / (n + 1)); if (t - a < minGap * 0.8 || b - t < minGap * 0.8) continue;
      const line = lines.find(l => t >= l.start && t <= l.end + 0.3) || {};
      const kind = kinds[k++ % kinds.length], stickers = STICKER_BY_EMO[line.emotion] || STICKER_BY_EMO.talk;
      out.push({ t, kind, sticker: kind === 'sticker' ? stickers[Math.floor(R() * stickers.length)] : null, side: R() < 0.5 ? 'left' : 'right' });
    }
  }
  return out;
}
export const maxVisualGap = (times, endStart) => { const ts = [...new Set([0, ...times.filter(t => t <= endStart), endStart])].sort((a, b) => a - b); let m = 0; for (let i = 1; i < ts.length; i++) m = Math.max(m, ts[i] - ts[i - 1]); return r3(m); };

// Dàn nhân vật trên nền studio (không có hồ sơ sàn): cao 50% khung, chân ở 87%, rải đều trong 22–78% bề ngang, giữ thứ tự trái → phải
export function studioStage(actors, w = 1080, h = 1920) {
  const n = actors.length, hh = Math.round(h * (n > 2 ? 0.44 : 0.5)), order = [...actors].sort((a, b) => a.x - b.x);
  return actors.map(a => { const k = order.indexOf(a), x = n === 1 ? w / 2 : w * (0.27 + 0.46 * k / (n - 1)); return { ...a, x: Math.round(x), y: Math.round(h * 0.87), h: hh }; });
}
export function captionY(shot, capY, h = 1920, half = 95, bands = []) {
  const heads = ((shot && shot.actors) || []).map(a => [a.y - a.h * 1.08, a.y - a.h * 0.68]);
  const hit = y => heads.some(([t, b]) => y * h + half > t && y * h - half < b), band = y => bands.some(([t, b]) => y * h + half > t - 12 && y * h - half < b + 12);
  const maxY = (h - SAFE.bottom - half) / h, minY = (SAFE.top + 40 + half) / h;
  if (!hit(capY) && !band(capY) && capY <= maxY + 1e-9) return capY;
  const cs = [0.74, 0.7, 0.78, 0.5, 0.45, 0.4].filter(y => y <= maxY && y >= minY), c = cs.find(y => !hit(y) && !band(y)) ?? cs.find(y => !band(y));
  if (c != null) return c;
  for (let y = maxY; y >= minY; y -= 0.005) if (!band(y)) return +y.toFixed(4); // chữ đè chữ tệ hơn chữ đè thân
  return Math.min(maxY, 0.74);
}

// ---------- Máy quay kiểu phim (round 2) ----------
// Khung nhìn = vùng cắt của canvas 1080×1920 (cx, cy tâm; z phóng). Giới hạn phóng theo độ phân giải: clip ≤ 1,6 × figH gốc / cao hiển thị,
// phòng ≤ 2,4 × bề rộng ảnh gốc / 1080. Đầu = y − h, đầu gối = y − 0,30 h, hông = y − 0,48 h, ngực = y − 0,62 h.
// Round 3 (video-polish 18/10): nhân vật to, mặt đọc được – trung cảnh đôi cowboy (đầu → đùi, tay ngoài được chạm mép: nửa rộng 0,17 h),
// toàn cảnh chỉ còn là cảnh thiết lập ngắn và vẫn ~56 % cao khung (cả người, chân chạm sàn). Mặt LUÔN nằm giữa đáy lớp chữ phía trên
// (hook/thẻ/Kit – topLimit) và đỉnh dải phụ đề cố định (capTop): hạ khung trước, không đủ chỗ thì giảm phóng.
export const CAM = { twoFill: 0.66, singleFill: 0.54, closeFill: 0.5, wideFill: 0.56, headroom: 0.25, maxUp: 1.6, roomUp: 2.4, twoHalfW: 0.17, face: 0.24, faceGap: 24, push: 0.97 }; // push: đẩy máy rất chậm ≤ 3 % / cảnh (calm)
export function zoomCap(actors, room, W = 1080) {
  const caps = [room && room.srcW ? CAM.roomUp * room.srcW / W : 3];
  for (const a of actors) if (a.figH && a.h) caps.push(CAM.maxUp * a.figH / a.h);
  return Math.max(1, Math.min(...caps));
}
const clampCam = (c, W, H) => { const rw = W / c.z, rh = H / c.z; return { z: c.z, cx: Math.min(Math.max(c.cx, rw / 2), W - rw / 2), cy: Math.min(Math.max(c.cy, rh / 2), H - rh / 2) }; };
const body = (a, k = 0.22) => ({ l: a.x - k * a.h, r: a.x + k * a.h, t: a.y - a.h, b: a.y }); // thân + tay buông (tay vung rộng hơn được phép chạm mép)
// hộp mặt (canvas): đỉnh đầu → cằm (0,24 h), rộng ±0,12 h – dùng cho máy (đặt mặt) và cổng layout (phụ đề/thẻ không đè mặt)
export const faceBox = a => [a.x - 0.12 * a.h, a.y - a.h, a.x + 0.12 * a.h, a.y - a.h + CAM.face * a.h];
// → { from:{cx,cy,z}, to:{cx,cy,z} } cho 1 cảnh. framing: wide | two | single | close (+ focus = who). Nhân vật khác: hoặc trọn trong khung hoặc ra hẳn ngoài.
// topLimit: đáy (px màn hình) lớp chữ phía trên đang hiện trong cảnh (hook/thẻ/Kit) · capTop: đỉnh dải phụ đề cố định.
export function shotCamera(shot, actors, { room = null, W = 1080, H = 1920, topLimit = 0, capTop = H } = {}) {
  const wide = { cx: W / 2, cy: H / 2, z: 1 };
  if (!actors.length || shot.framing === 'card') return { from: wide, to: { ...wide, z: 1.03 } }; // hook: đẩy máy rõ (visual hook – chuyển động)
  const cap = zoomCap(actors, room, W);
  const frameOn = (as, fill, bottomOf, upTo = 0.1, hw = 0.22) => {
    const top = Math.min(...as.map(a => a.y - a.h)), bot = Math.max(...as.map(bottomOf)), l = Math.min(...as.map(a => body(a, hw).l)), r = Math.max(...as.map(a => body(a, hw).r));
    let z = Math.min(H * fill / (bot - top), W * 0.96 / (r - l), cap); z = Math.max(1, z);
    const rh = H / z; return { z, cx: (l + r) / 2, cy: top - rh * upTo + rh / 2 };
  };
  let c;
  const f = actors.find(a => a.who === shot.focus);
  if (shot.framing === 'wide') { c = frameOn(actors, CAM.wideFill, a => a.y + 0.04 * a.h, 0.16); c.cy = Math.max(...actors.map(a => a.y)) + 0.04 * Math.max(...actors.map(a => a.h)) - (H * 0.95 - H / 2) / c.z; } // chân ở 95 % khung
  else if (shot.framing === 'two' || !f) c = frameOn(actors, CAM.twoFill, a => a.y - 0.3 * a.h, CAM.headroom, CAM.twoHalfW);
  else {
    const two = frameOn(actors, CAM.twoFill, a => a.y - 0.3 * a.h, CAM.headroom, CAM.twoHalfW);
    c = shot.framing === 'close' ? frameOn([f], CAM.closeFill, a => a.y - 0.6 * a.h, 0.16) : frameOn([f], CAM.singleFill, a => a.y - 0.3 * a.h, CAM.headroom);
    if (shot.framing === 'close' && c.z < two.z * 1.12) c = { ...c, z: Math.min(cap, two.z * 1.12) };
    // lệch về phía người kia (khoảng nhìn) 1/6 khung; người chính luôn trọn khung. Người kia không trọn khung → không vẽ ở cảnh này
    // (góc máy đơn/cận "loại" người kia như quay từ góc khác – không bao giờ để nửa người dính mép)
    const o = actors.filter(a => a !== f), side = o.length ? (o[0].x > f.x ? 1 : -1) : 0, rw = W / c.z;
    c.cx = f.x + side * rw / 6;
    const fb = body(f); if (fb.l < c.cx - rw / 2 || fb.r > c.cx + rw / 2) c.cx = f.x;
  }
  // đặt mặt giữa topLimit và capTop (cả đầu cảnh – phóng nhỏ hơn – lẫn cuối cảnh); thiếu chỗ → giảm phóng từng 3 %
  const pushK = CAM.push, lo = topLimit ? topLimit + CAM.faceGap : 0, hi = capTop - CAM.faceGap;
  const vis = cm => actors.filter(a => { if (shot.framing === 'two' || shot.framing === 'wide' || !f) return true; if (a === f) return true; const rw = W / cm.z, b = body(a); return b.l >= cm.cx - rw / 2 && b.r <= cm.cx + rw / 2; });
  const fits = cm => vis(cm).every(a => { const fb = faceBox(a), t = (fb[1] - cm.cy) * cm.z + H / 2, ch = (fb[3] - cm.cy) * cm.z + H / 2; return t >= lo - 0.5 && ch <= hi + 0.5; });
  // đẩy máy chậm (from phóng nhỏ hơn); nếu đẩy máy làm mặt lọt ra ngoài dải cho phép (phòng có người đứng cao) → máy trượt ngang nhẹ thay vì đẩy
  const build = (cc, k = pushK) => { const to = clampCam(cc, W, H); return { to, from: clampCam(k < 1 ? { ...to, z: Math.max(1, to.z * k) } : { ...to, cx: to.cx + 28 / to.z }, W, H) }; };
  // dải cy hợp lệ ở độ phóng z: đỉnh đầu ≥ lo, cằm ≤ hi, khung nhìn trong canvas → giao 2 thời điểm (đầu cảnh phóng k·z, cuối cảnh z)
  const as0 = vis(c), headT = Math.min(...as0.map(a => a.y - a.h)), chin = Math.max(...as0.map(a => faceBox(a)[3]));
  const range = z => [Math.max(H / (2 * z), lo ? chin - (hi - H / 2) / z : -1e9, chin - (hi - H / 2) / z), Math.min(H - H / (2 * z), lo ? headT - (lo - H / 2) / z : 1e9)];
  const top0 = (headT - c.cy) * c.z + H / 2;
  let best = build(c);
  for (let z = c.z; z >= 1 - 1e-9; z = z > 1.0001 ? Math.max(1, z * 0.995) : 0) {
    const want = headT - (top0 - H / 2) / z; // giữ vị trí đỉnh đầu trên màn hình khi giảm phóng
    for (const k of [pushK, 1]) {
      const r1 = range(z), r2 = k < 1 ? range(Math.max(1, z * k)) : r1, lo2 = Math.max(r1[0], r2[0]), hi2 = Math.min(r1[1], r2[1]);
      if (lo2 > hi2 + 1e-6) continue;
      const cand = build({ ...c, z, cy: Math.min(hi2, Math.max(lo2, want)) }, k);
      if (fits(cand.to) && fits(cand.from)) { best = cand; z = 0; break; }
    }
    if (!z) break;
  }
  return best;
}
// Vị trí khung nhìn tại tiến độ u (0–1) – Remotion & QA dùng chung
export const camAt = (cam, u) => { const e = u < 0 ? 0 : u > 1 ? 1 : u * u * (3 - 2 * u); return { cx: cam.from.cx + (cam.to.cx - cam.from.cx) * e, cy: cam.from.cy + (cam.to.cy - cam.from.cy) * e, z: cam.from.z + (cam.to.z - cam.from.z) * e }; };
export const toScreen = (c, x, y, W = 1080, H = 1920) => [(x - c.cx) * c.z + W / 2, (y - c.cy) * c.z + H / 2];
// Phụ đề không bao giờ đè mặt/thân (đỉnh đầu → hông): ưu tiên dưới đầu gối, rồi dưới hông, rồi trên đầu; trong vùng an toàn nền tảng.
export function captionSlot(cam, actors, nLines = 2, { W = 1080, H = 1920, capY = 0.6, font = 92, faceOnly = false, half: half0 = null, bands = [] } = {}) {
  const half = half0 || (nLines * font * 1.12 + 24) / 2, lo = SAFE.top + 40 + half, hi = H - SAFE.bottom - half;
  const clear = y => bands.every(([t, b]) => y + half < t - 12 || y - half > b + 12); // không đè lớp chữ khác (hook / thẻ / watermark)
  const sc = actors.map(a => { const [, t] = toScreen(cam, a.x, a.y - a.h, W, H), [, hip] = toScreen(cam, a.x, a.y - (faceOnly ? 0.8 : 0.48) * a.h, W, H), [, knee] = toScreen(cam, a.x, a.y - 0.3 * a.h, W, H); return { t, hip, knee }; });
  const free = y => clear(y) && sc.every(b => y + half < b.t - 8 || y - half > b.hip + 8);
  if (!sc.length) { const y0 = Math.min(Math.max(capY * H, lo), hi); if (clear(y0)) return y0 / H; }
  else {
    const kneeY = Math.max(...sc.map(b => b.knee)) + 16 + half, hipY = Math.max(...sc.map(b => b.hip)) + 16 + half, headY = Math.min(...sc.map(b => b.t)) - 16 - half;
    for (const y of [kneeY, hipY, headY]) if (y >= lo && y <= hi && free(y)) return y / H;
    for (let y = hi; y >= lo; y -= 10) if (free(y)) return y / H; // quét từ dưới lên
  }
  for (let y = hi; y >= lo; y -= 10) if (clear(y)) return y / H; // không chỗ trống thân → vùng dưới an toàn, chỉ cần không đè chữ khác
  return hi / H;
}

// ---------- Bố cục chữ overlay (Remotion Short.jsx dùng đúng các số này; cổng QA "layout" đo lại từ props) ----------
// Ước lượng bề rộng chữ LexDisplay/LexBody ExtraBold theo em (thiên rộng → hộp ước lượng ≥ hộp thật, cổng an toàn).
const CW = c => (/[ilI.,:;!'’|]/.test(c) ? 0.32 : /[fjtr()\-"“”?]/.test(c) ? 0.45 : /[MWmw@%]/.test(c) ? 0.95 : /[A-Z]/.test(c) ? 0.72 : /[0-9]/.test(c) ? 0.62 : c === ' ' ? 0.28 : 0.58);
export const textW = (s, fs) => Math.ceil([...String(s)].reduce((a, c) => a + CW(c), 0) * fs);
export const OVERLAY = { left: 60, right: 140 }; // khối chữ hook/phụ đề: left 60 → right 140 (căn giữa x = 500)
const intersects = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
const cx0 = (W = 1080) => OVERLAY.left + (W - OVERLAY.left - OVERLAY.right) / 2;
export const CAP_FONT = { 'mega-word': 150, 'karaoke-bar': 70 }; // còn lại 92
export const CAP_MIN = { big: 60, bar: 56 }; // thu cỡ cho vừa nhưng KHÔNG nhỏ hơn mức này
export const POP_FROM = 0.8, CAP_MIN_PX = 48; // từ bật từ 0,8× (cũ 0,35× → trang ngắn 0,3 s chỉ thấy chữ li ti); cỡ nhìn thấy nhỏ nhất ≥ 48 px
// 1 trang phụ đề: cỡ chữ (tự thu nhỏ cho vừa 880 px), khoảng cách từ (margin mỗi bên = 0,28 em), viền, độ phóng tối đa từng từ
// (pop/đang đọc) sao cho khoảng trống nhìn thấy giữa 2 từ luôn ≥ 0,2 em – chữ không dính nhau khi từ đổi màu/phóng ("onFriday?").
export function captionLayout(p, style, { W = 1080, font = null } = {}) {
  const upper = style === 'bounce-outline' || style === 'mega-word', bar = style === 'karaoke-bar';
  const avail = W - OVERLAY.left - OVERLAY.right - (bar ? 60 : 0), sw = bar ? 0 : style === 'mega-word' ? 16 : 12;
  let F = font || CAP_FONT[style] || 92, m = 0, ws = [], rows = [], breaks = p.breaks || [p.words.length], mc = SUB.lineChars; // calm: cỡ chữ chung cả video (font) – không đổi cỡ giữa các trang
  const fmin = CAP_MIN[bar ? 'bar' : 'big'];
  for (let k = 0; k < 12; k++) {
    m = Math.max(Math.round(0.2 * F), Math.ceil((0.2 * F + sw) / 2) + 1); // calm: không phóng từ → khoảng cách chữ thường (0,4 em giữa 2 từ)
    ws = p.words.map(w => textW(upper ? w.w.toUpperCase() : w.w, F) + (w.key ? 48 : 0)); // hộp vàng từ khóa: padding 20 × 2 + bóng 8
    rows = []; let i = 0; for (const n of breaks) { rows.push(ws.slice(i, i + n).reduce((a, x) => a + x + 2 * m, 0)); i += n; }
    const mx = Math.max(...rows); if (mx <= avail) break;
    if (F > fmin && !font) { F = Math.max(fmin, Math.floor(F * avail / mx * 0.98)); continue; }
    // đã ở cỡ nhỏ nhất mà vẫn tràn → xuống thêm dòng (không thu chữ li ti)
    if (mc <= 6 || breaks.length >= p.words.length) break;
    mc -= 2; breaks = breakLines(p.words.map(w => w.w), { maxChars: mc, maxLines: mc >= SUB.lineChars - 6 ? 2 : 3 }); // ưu tiên 2 dòng, 3 dòng chỉ khi bất khả
  }
  const minGap = Math.round(0.2 * F), room = 2 * m - sw - minGap;
  const maxS = ws.map(() => 1); void room; // calm: từ đang đọc chỉ đổi màu, không phóng
  const lineH = F * 1.12, grow = (Math.max(...maxS) - 1) * lineH / 2;
  const half = Math.ceil((rows.length * lineH + (bar ? 44 : 0)) / 2 + sw / 2 + grow + (style === 'bounce-outline' ? 14 : 0) + 6);
  return { font: F, gap: m, stroke: sw, minGap, widths: ws, maxS, rowW: rows, nl: rows.length, half, breaks, width: Math.max(...rows) + (bar ? 60 : 0) };
}
// Hook (badge + tiêu đề 1–2 dòng): xuống dòng TÍNH SẴN (cân 2 dòng, thu cỡ chữ nếu không vừa) → Remotion vẽ đúng số dòng này.
export function hookLayout(hook, layout, { W = 1080, H = 1920 } = {}) {
  const ws = String(hook.text || '').toUpperCase().split(/\s+/).filter(Boolean), avail = W - OVERLAY.left - OVERLAY.right - 14;
  const wOf = (f, a, b) => ws.slice(a, b).reduce((s, w) => s + textW(w, f) + 28, 0);
  let fs = ws.join(' ').length > 22 ? 84 : 100, lines = [ws.length];
  for (; ; fs -= 6) {
    if (wOf(fs, 0, ws.length) <= avail) { lines = [ws.length]; break; }
    let best = null;
    for (let k = 1; k < ws.length; k++) { const a = wOf(fs, 0, k), b = wOf(fs, k, ws.length); if (a <= avail && b <= avail && (!best || Math.max(a, b) + (FUNC.test(ws[k - 1].replace(/\W/g, '')) ? 40 : 0) < best.c)) best = { k, c: Math.max(a, b) + (FUNC.test(ws[k - 1].replace(/\W/g, '')) ? 40 : 0) }; }
    if (best) { lines = [best.k, ws.length - best.k]; break; }
    if (fs <= 60) { lines = [ws.length]; break; }
  }
  const P = hook.pattern, cd = hook.countdown !== false, side = 120 + 18 + (cd && ['quiz-timer', 'challenge'].includes(P) ? 138 : P === 'versus' ? 18 + textW('VS', 96) : cd && P === 'countdown-list' ? 18 + textW('3', 130) : 0);
  const bw = f => textW(String(hook.badge || '').toUpperCase(), f) + 2 * String(hook.badge || '').length + 60 * f / 46;
  let badgeFs = 46; while (badgeFs > 28 && side + bw(badgeFs) > W - OVERLAY.left - OVERLAY.right) badgeFs -= 2;
  const rowH = cd && P === 'countdown-list' ? 156 : 120, top = Math.round(layout.hookY * H), headH = lines.length * fs * 1.04 + 14;
  const bottom = Math.ceil(top + rowH + 26 + headH + (P === 'wait-for-it' ? 26 + 82 : 0) + 24); // +24: chữ bật từ dưới lên (translateY 40 × (1 − s))
  let i = 0; const lw = lines.map(n => { const x = wOf(fs, i, i + n); i += n; return x; });
  const width = Math.min(W - OVERLAY.left - OVERLAY.right, Math.max(side + bw(badgeFs), ...lw)), c = cx0(W);
  const tilt = Math.ceil(bw(badgeFs) * Math.sin(3 * Math.PI / 180) / 2); // badge nghiêng −3°
  return { fs, lines, badgeFs, top, bottom, box: [Math.round(c - width / 2), top - 10 - tilt, Math.round(c + width / 2), bottom] };
}
// Thẻ payoff: hộp ước lượng (nhãn + chữ tự xuống dòng trong 618 px + sticker 130, phóng lò xo ±4 %, tem CORRECT nhô 60 px)
// Tem "CORRECT" (stamp-correct): nằm TRONG góc phải trên của thẻ, nghiêng 8°, đập từ 1,25× → 1 (Short.jsx dùng đúng STAMP)
export const STAMP = { text: 'CORRECT', fs: 56, right: 40, top: -46, rot: 8, from: 1.25, padX: 22, padY: 4, border: 8 };
export const CARD_SCALE_MAX = 1.02; // thẻ bật lò xo nhưng không phình quá 2 % (không tràn vùng an toàn ngang)
// hộp bao của hình chữ nhật w×h tâm (cx, cy) xoay deg và phóng k
export const rotBox = (cx, cy, w, h, deg, k = 1) => { const a = Math.abs(deg) * Math.PI / 180, bw = (w * Math.cos(a) + h * Math.sin(a)) * k, bh = (w * Math.sin(a) + h * Math.cos(a)) * k; return [Math.floor(cx - bw / 2), Math.floor(cy - bh / 2), Math.ceil(cx + bw / 2), Math.ceil(cy + bh / 2)]; };
export function stampBox(cardTop, W = 1080) {
  const w = textW(STAMP.text, STAMP.fs) + 2 * STAMP.padX + 2 * STAMP.border, h = STAMP.fs * 1.2 + 2 * STAMP.padY + 2 * STAMP.border, right = W - 150 - STAMP.right;
  return rotBox(right - w / 2, cardTop + STAMP.top + h / 2, w, h, STAMP.rot, STAMP.from);
}
export function cardBox(c, layout, { W = 1080, H = 1920 } = {}) {
  const fs = String(c.text).length > 18 ? 64 : 82, avail = W - 70 - 150 - 72 - 12 - 130 - 28;
  let n = 1, cur = 0; for (const w of String(c.text).split(/\s+/)) { const x = textW(w + ' ', fs); if (cur && cur + x > avail) { n++; cur = 0; } cur += x; }
  const inner = Math.max(130, 36 * 1.25 + n * fs * 1.05 + (c.style === 'meter' && c.kind !== 'dont' ? 36 : 0)), h = 30 + 34 + 12 + inner + 18, top = c.top != null ? c.top : layout.cardY * H, pad = 0.04 * h;
  const cw = (W - 220) * CARD_SCALE_MAX, cx = 70 + (W - 220) / 2, box = [Math.floor(cx - cw / 2), Math.round(top - pad), Math.ceil(cx + cw / 2), Math.round(top + h + pad)];
  if (c.style === 'stamp-correct' && c.kind !== 'dont') { const sb = stampBox(top, W); return [Math.min(box[0], sb[0]), Math.min(box[1], sb[1]), Math.max(box[2], sb[2]), Math.max(box[3], sb[3])]; }
  return box;
}
export const watermarkBox = wm => [wm.x, wm.y, Math.ceil(wm.x + wm.h * 0.95 + 10 + textW('lexkite', wm.h * 0.92)), wm.y + wm.h];
// Các lớp chữ đang hiện tại thời điểm t (đúng điều kiện hiện/ẩn của Short.jsx) → [{ id, kind, text, box:[x0,y0,x1,y1] }]
export function overlayBoxes(tl, t) {
  const out = [], W = tl.w || 1080, H = tl.h || 1920, lay = (tl.theme && tl.theme.layout) || LAYOUTS['stage-center'], inCard = tl.endCard && t >= tl.endCard.start;
  const hk = tl.hook; if (hk && t >= (hk.start || 0) && t <= hk.end + 0.3) out.push({ id: 'hook', kind: 'hook', text: `${hk.badge} · ${hk.text}`, box: hk.box || hookLayout(hk, lay, { W, H }).box });
  if (!inCard) {
    const pg = (tl.pages || []).find(p => t >= p.start && t < p.end);
    if (pg) { const L = pg.gap != null && pg.half && pg.width ? pg : captionLayout(pg, tl.theme && tl.theme.caption, { W }), y = pg.y * H, c = cx0(W);
      out.push({ id: `page@${pg.start}`, kind: 'caption', text: pg.words.map(w => w.w).join(' '), box: [Math.round(c - L.width / 2), Math.round(y - L.half), Math.round(c + L.width / 2), Math.round(y + L.half)] }); }
    (tl.cards || []).forEach((c, i) => { if (t >= c.start && t <= c.end + 0.3) out.push({ id: `card${i}`, kind: 'card', text: c.text, box: c.box || cardBox(c, lay, { W, H }) }); });
  }
  const wm = tl.watermark; if (wm && t >= wm.from && t <= wm.until) out.push({ id: 'watermark', kind: 'watermark', text: 'lexkite', box: watermarkBox(wm) });
  return out;
}
// Chữ phụ đề "nhìn thấy" của 1 câu dựng lại từ bố cục: 2 từ liền nhau chỉ có dấu cách nếu khe hở thật (sau phóng tối đa) ≥ 0,2 em.
// props cũ (không có gap/maxS) dùng thông số cũ: margin 12 px, phóng 1,06 × vượt đà lò xo ~1,17 → dính chữ khi từ dài (lỗi "onFriday?").
export function renderedCaption(pages, style) {
  return pages.map(p => {
    const L = p.gap != null ? p : null, F = (L && L.font) || CAP_FONT[style] || 92, upper = style === 'bounce-outline' || style === 'mega-word';
    const gap = L ? L.gap : 12, sw = L ? L.stroke : style === 'karaoke-bar' ? 0 : style === 'mega-word' ? 16 : 12, minGap = L ? L.minGap : Math.round(0.2 * F);
    const wd = p.words.map(w => textW(upper ? w.w.toUpperCase() : w.w, F) + (w.key ? 48 : 0)), ms = p.words.map(w => (w.maxS != null ? w.maxS : style === 'karaoke-bar' ? 1 : 1.24));
    let s = '', k0 = 0; const rows = []; for (const n of (p.breaks || [p.words.length])) { rows.push([k0, k0 + n]); k0 += n; }
    p.words.forEach((w, i) => {
      if (i) { const newRow = rows.some(([a]) => a === i), vis = 2 * gap - sw - (ms[i - 1] - 1) * wd[i - 1] / 2 - (ms[i] - 1) * wd[i] / 2; s += newRow || vis >= minGap - 0.5 ? ' ' : ''; }
      s += w.w;
    });
    return s;
  }).join(' ');
}
// CỔNG LAYOUT (bước qa + test): (1) không 2 lớp chữ nào giao nhau ở bất kỳ khung nào trước end card · (2) chữ trong vùng an toàn 9:16
// (trên 220 px, dưới 420 px, trái 60, phải 140) · (3) chữ phụ đề nhìn thấy của mỗi câu = kịch bản (đúng dấu cách, không dính/thiếu từ).
export function layoutGate(tl, lines = []) {
  const W = tl.w || 1080, H = tl.h || 1920, step = 1 / (tl.fps || 30), end = tl.endCard ? tl.endCard.start : tl.duration || 0, S = tl.safe || SAFE;
  const overlaps = [], unsafe = [], joins = [], seen = new Set();
  for (let f = 0; f * step < end; f++) {
    const t = f * step, bs = overlayBoxes(tl, t);
    for (let i = 0; i < bs.length; i++) {
      const b = bs[i].box;
      if ((b[1] < S.top - 1 || b[3] > H - S.bottom + 1 || b[0] < S.left - 1 || b[2] > W - S.right + 1) && !seen.has('s' + bs[i].id)) { seen.add('s' + bs[i].id); unsafe.push(`${t.toFixed(2)} s: ${bs[i].kind} "${String(bs[i].text).slice(0, 40)}" ra ngoài vùng an toàn [${b.join(',')}]`); }
      for (let j = i + 1; j < bs.length; j++) {
        const key = bs[i].id + '×' + bs[j].id;
        if (!seen.has(key) && intersects(b, bs[j].box)) { seen.add(key); overlaps.push(`${t.toFixed(2)} s: ${bs[i].kind} "${String(bs[i].text).slice(0, 40)}" đè ${bs[j].kind} "${String(bs[j].text).slice(0, 40)}"`); }
      }
    }
  }
  // (4) round 3: chữ (phụ đề / thẻ / hook – trừ lúc đang mờ đi) không đè MẶT nhân vật trong cảnh đang chiếu · phụ đề 1 vị trí cố định cả video
  const faces = [];
  for (let f = 0; f * step < end; f++) {
    const t = f * step, sh = (tl.shots || []).find(x => t >= x.start && t < x.end && x.cam && (x.actors || []).length); if (!sh) continue;
    const c = camAt(sh.cam, (t - sh.start) / Math.max(0.1, sh.cam.dur || sh.end - sh.start));
    const fs = sh.actors.map(a => { const fb = faceBox(a), p0 = toScreen(c, fb[0], fb[1], W, H), p1 = toScreen(c, fb[2], fb[3], W, H); return { who: a.who, box: [p0[0], p0[1], p1[0], p1[1]] }; });
    for (const o of overlayBoxes(tl, t)) {
      if (o.kind === 'watermark' || (o.kind === 'hook' && t > tl.hook.end) || (o.kind === 'card' && (tl.cards || []).some(cd => o.text === cd.text && t > cd.end))) continue;
      for (const fc of fs) if (intersects(o.box, fc.box) && !seen.has('f' + o.id + fc.who + sh.k)) { seen.add('f' + o.id + fc.who + sh.k); faces.push(`${t.toFixed(2)} s: ${o.kind} "${String(o.text).slice(0, 30)}" đè mặt ${fc.who}`); }
    }
  }
  const ys = [...new Set((tl.pages || []).filter(p => p.y != null && p.half).map(p => Math.round(p.y * H + p.half)))], capJumps = ys.length > 1 ? [`phụ đề nhảy ${ys.length} vị trí (đáy ${ys.slice(0, 4).join(', ')}… px) – phải canh 1 đường đáy cố định`] : [];
  const style = tl.theme && tl.theme.caption, tiny = [];
  for (const p of tl.pages || []) { const F = p.font || CAP_FONT[style] || 92, k = style === 'karaoke-bar' ? 1 : p.popFrom != null ? p.popFrom : 0.35;
    if (F * k < CAP_MIN_PX) tiny.push(`trang "${p.words.map(w => w.w).join(' ')}" (${p.start} s): chữ nhỏ nhất ${Math.round(F * k)} px < ${CAP_MIN_PX} px (cỡ ${F} × bật từ ${k})`); }
  lines.forEach((l, i) => {
    const ps = (tl.pages || []).filter(p => p.line === i); if (!ps.length) return;
    const got = renderedCaption(ps, style), want = tokens(l.text).join(' ');
    if (got !== want) joins.push(`câu ${i + 1}: chữ hiện "${got}" ≠ kịch bản "${want}"`);
  });
  const bad = [...overlaps, ...unsafe, ...joins, ...tiny, ...faces, ...capJumps];
  return { ok: !bad.length, bad, overlaps, unsafe, joins, tiny, faces, capJumps };
}
// Dải dọc cần tránh cho phụ đề trong khoảng [a, b]: hook (đến khi mờ hẳn), thẻ payoff, watermark
function bandsFor(a, b, { hook, cards, wm }) {
  const out = [];
  if (hook && a <= hook.end + 0.3 && b >= (hook.start || 0)) out.push([hook.box[1], hook.box[3]]);
  for (const c of cards) if (a <= c.end + 0.3 && b >= c.start) out.push([c.box[1], c.box[3]]);
  if (wm && a <= wm.until && b >= wm.from) { const x = watermarkBox(wm); out.push([x[1], x[3]]); }
  return out;
}

// ---------- Thẻ so sánh / payoff ----------
// Cụm sai/đúng: script.wrong/right → trong ngoặc kép của hook/câu đầu → từ khóa đầu
export function comparePair(sc) {
  const q = s => ((String(s || '').match(/["“]([^"”]+)["”]/) || [])[1]);
  const wrong = sc.wrong || q(sc.hook) || (sc.lines || []).map(l => q(l.text)).find(Boolean) || null;
  const right = sc.right || (sc.keywords || [])[0] || null;
  return { wrong, right };
}

// ---------- SFX tự đặt ----------
// dry = không nhạc nền (quyết định chủ 18/10: chỉ giọng + SFX): SFX không còn nền nhạc che → bớt dày + nhỏ hơn: pop chữ chỉ ở TỪ KHÓA
// (không pop đầu mỗi trang), whoosh/swoosh −4 dB, pop/tick/keys −3 dB, khoảng tối thiểu giữa 2 pop 0,6 s; nhấn (ding/buzz/bass) giữ nguyên.
export const DRY_TRIM = { whoosh: -4, swoosh: -4, pop: -3, tick: -3, keys: -3, glitch: -3, confetti: -2 };
// calm (mặc định của buildTimeline): ÍT tiếng – whoosh nhẹ chỉ ở chuyển cảnh mềm (ranh phần), 1 pop nhẹ khi thẻ vào; tick đồng hồ chỉ khuôn đố; không gì theo từ.
export const CALM_SFX = { whoosh: -24, pop: -24, tick: -22 };
export function placeSfx({ cuts = [], pages = [], cards = [], interrupts = [], hook = null, shocks = [], map, endStart, mode = 'full', dry = false, calm = false }) {
  if (calm) {
    const out = [];
    for (const c of cuts) if (c.type !== 'cut' && c.t <= endStart + 0.1) out.push({ t: r3(Math.max(0, c.from - 0.05)), id: 'whoosh', gainDb: CALM_SFX.whoosh });
    for (const c of cards) out.push({ t: r3(c.start + 0.03), id: 'pop', gainDb: CALM_SFX.pop });
    if (hook && hook.countdown && hook.sfx === 'quizTick') out.push({ t: 0.15, id: map.quizTick || 'tick', gainDb: CALM_SFX.tick });
    return out.sort((a, b) => a.t - b.t);
  }
  const ev = [], add = (t, key, prio = 1) => { const id = typeof key === 'string' && map[key] ? map[key] : key; if (t >= 0 && id) ev.push({ t: r3(t), id, gainDb: (map.gain[id] ?? -16) + (mode === 'soft' ? -4 : mode === 'punchy' ? 2 : 0) + (dry ? DRY_TRIM[id] || 0 : 0), prio }); };
  if (hook) { add(0.02, 'hook', 3); if (hook.sfx && hook.sfx !== 'hook') add(hook.sfx === 'preReveal' ? 0.3 : 0.15, hook.sfx, 2); }
  for (const c of cuts) { const id = map.transition[c.type]; add(c.t - (id === 'whoosh' ? 0.22 : id === 'swoosh' ? 0.12 : 0.02), id, 2); }
  for (const c of cards) { if (c.kind === 'dont') add(c.start + 0.05, 'wrong', 3); else { if (c.start > 1.8) add(c.start - 1.45, 'preReveal', 1); add(c.start + 0.05, 'reveal', 3); } }
  for (const s of shocks) add(s, 'shock', 2);
  for (const p of interrupts) if (p.kind === 'sticker') add(p.t, 'sticker', 1);
  // pop chữ: từ khóa + từ đầu mỗi trang (tối đa 1 pop / 0,35 s để không rối tai)
  for (const p of pages) p.words.forEach((w, j) => { if (w.key || (j === 0 && !dry)) add(w.pop, 'wordPop', w.key ? 1 : 0); });
  ev.sort((a, b) => a.t - b.t || b.prio - a.prio);
  const out = [];
  for (const e of ev) {
    if (e.t > endStart + 2) continue;
    const near = out.find(x => Math.abs(x.t - e.t) < (e.id === 'pop' || x.id === 'pop' ? (dry ? 0.6 : 0.35) : 0.15));
    if (near) { if (e.prio > near.prio) Object.assign(near, e); continue; }
    if (e.id === 'bass-drop' && out.some(x => x.id === 'bass-drop' && e.t - x.t < 3)) continue;
    out.push({ ...e });
  }
  return out.map(({ prio, ...e }) => e);
}

// ---------- Calm (video-calm 18/10): lịch lớp phủ + cổng ----------
export const OVL = { afterCut: 0.3, beforeCut: 0.2, fade: 0.3, minCard: 1.0 };
const cutWin = c => [c.from, c.to];
export function scheduleOverlays({ hook, cards, kits, cuts, endStart }) {
  const fit = (o, minLen) => { // dời o vào trong 1 cảnh: không cắt nào trong [start − 0,3, end + mờ + 0,2]
    for (let k = 0; k < 6; k++) {
      const c = cuts.find(x => cutWin(x)[1] > o.start - OVL.afterCut + 1e-6 && cutWin(x)[0] < o.end + OVL.fade + OVL.beforeCut - 1e-6); if (!c) return true;
      if (cutWin(c)[0] <= o.start + 0.6) o.start = r3(cutWin(c)[1] + OVL.afterCut); else o.end = r3(cutWin(c)[0] - OVL.beforeCut - OVL.fade);
      if (o.end - o.start < minLen) return false;
    }
    return o.end - o.start >= minLen;
  };
  cards.sort((a, b) => a.start - b.start);
  for (let i = cards.length - 1; i >= 0; i--) { const c = cards[i]; c.end = r3(Math.min(c.end, endStart - OVL.fade - OVL.beforeCut)); if (!fit(c, OVL.minCard) && c.kind === 'dont') cards.splice(i, 1); }
  for (let i = 1; i < cards.length; i++) if (cards[i - 1].end + OVL.fade + 0.2 > cards[i].start) { cards[i - 1].end = r3(cards[i].start - OVL.fade - 0.2); if (cards[i - 1].end - cards[i - 1].start < OVL.minCard && cards[i - 1].kind === 'dont') { cards.splice(i - 1, 1); i--; } }
  for (let i = kits.length - 1; i >= 0; i--) { const k = kits[i];
    for (const c of cards) if (k.start < c.end + OVL.fade + 0.2 && c.start < k.end + OVL.fade + 0.2) k.start = r3(c.end + OVL.fade + 0.2);
    if (!fit(k, 1.2)) kits.splice(i, 1); }
  if (kits.length > 1) kits.splice(1); // Kit hiện tối đa 1 lần (câu mẹo)
}
// Cổng CALM (bước qa + test): cắt ≤ 3/10 s · cảnh ≥ 2 s · chuyển cảnh mềm ≤ SOFT_MAX và chỉ kiểu calm · ≤ 1 lớp phủ (hook/thẻ/Kit/sticker) cùng lúc ·
// lớp phủ không đè cắt (±0,3/0,2 s) · phụ đề hiện cả trang · tốc độ đọc ≤ 15 ký tự/s, ≥ 1,2 s/trang (trừ câu thán từ ≤ 2 từ), cách nhau ≥ 2 khung.
export function calmGate(tl) {
  const bad = [], body = (tl.shots || []).filter(x => x.framing !== 'card'), end = tl.endCard ? tl.endCard.start : tl.duration;
  const cuts = (tl.cuts || []).filter(c => c.t < end - 1e-6), span = body.length ? body[body.length - 1].end - body[0].start : 0;
  if (span && cuts.length / span * 10 > 3 + 1e-9) bad.push(`${cuts.length} cắt / ${span.toFixed(1)} s = ${(cuts.length / span * 10).toFixed(1)} cắt/10 s > 3`);
  for (const x of body) if (x.end - x.start < 1.95) bad.push(`cảnh ${x.k} dài ${(x.end - x.start).toFixed(2)} s < 2 s`);
  const soft = (tl.cuts || []).filter(c => c.type !== 'cut');
  if (soft.length > SOFT_MAX || soft.some(c => !CALM_TRANSITIONS.includes(c.type))) bad.push(`chuyển cảnh cách điệu: ${soft.map(c => c.type).join(', ')}`);
  const ovl = [...(tl.hook ? [{ id: 'hook', a: tl.hook.start || 0, b: tl.hook.end + 0.3 }] : []), ...(tl.cards || []).map((c, i) => ({ id: 'card' + i, a: c.start, b: c.end + 0.3 })),
    ...(tl.kits || []).map((k, i) => ({ id: 'kit' + i, a: k.start, b: k.end + 0.2 })), ...(tl.interrupts || []).filter(x => x.kind === 'sticker').map((x, i) => ({ id: 'sticker' + i, a: x.t, b: x.t + 1.1 }))];
  for (let i = 0; i < ovl.length; i++) for (let j = i + 1; j < ovl.length; j++) if (ovl[i].a < ovl[j].b - 1e-6 && ovl[j].a < ovl[i].b - 1e-6) bad.push(`2 lớp phủ cùng lúc: ${ovl[i].id} × ${ovl[j].id}`);
  for (const o of ovl.filter(x => x.id !== 'hook')) for (const c of tl.cuts || []) if (c.to > o.a - 0.3 + 1e-6 && c.from < o.b + 0.2 - 1e-6) bad.push(`${o.id} [${o.a}–${o.b}] đè cắt ${c.t} s`);
  if ((tl.kits || []).length > 1) bad.push(`Kit hiện ${tl.kits.length} lần`);
  for (const p of tl.pages || []) if (p.words.some(w => Math.abs(w.pop - p.start) > 1e-3)) { bad.push(`phụ đề "${p.words.map(w => w.w).join(' ').slice(0, 30)}" hiện từng từ`); break; }
  const ss = subStats(tl.pages || []);
  for (const x of ss.tooFast) bad.push(`phụ đề "${x.text.slice(0, 30)}" ${x.cps} ký tự/s > ${SUB.cpsMax}`);
  for (const x of ss.tooShort) bad.push(`phụ đề "${x.text.slice(0, 30)}" hiện ${x.dur} s < ${SUB.minDur} s`);
  if (ss.minGap != null && ss.minGap < SUB.gap - 1e-3 && ss.minGap > -1e-3) bad.push(`2 trang phụ đề cách ${ss.minGap} s < 2 khung (nháy)`);
  if (ss.minGap != null && ss.minGap < -1e-3) bad.push('2 trang phụ đề chồng giờ');
  return { ok: !bad.length, bad, subs: { maxCps: ss.maxCps, medCps: ss.medCps, minDur: ss.minDur, minGap: ss.minGap }, cutsPer10: span ? +(cuts.length / span * 10).toFixed(2) : 0, soft: soft.length };
}

// ---------- Round 3 (video-polish): hằng số bố cục + hook ----------
export const HOOK_Y = 0.145;      // hook sát dưới watermark (≈ 280 px) mọi bố cục – nhường chỗ cho mặt nhân vật bên dưới
export const CARD_TOP = 300;       // thẻ payoff: ngay dưới watermark (236–276) – khoảng giữa khung dành cho mặt
export const CAP_BOTTOM_GAP = 14;  // phụ đề: đáy khối cách vùng UI nền tảng (dưới 420 px) 14 px
export const CLIP_LEAD = 0.3;      // clip mới bắt đầu 0,3 s trước câu (phủ nửa đầu chuyển cảnh vào)
export const CLIP_XFADE = 5;       // đổi clip giữa 1 cảnh liên tục: hoà 5 khung
export const STICKER_SIZE = 180;
export const KIT_BOX = (W = 1080) => [W - 470, 238, W - 150, 582]; // KitLayer: 320 px, top 250 ± 12 (nhún)
export const COUNTDOWN_HOOKS = ['quiz-timer', 'challenge', 'countdown-list'];
const QUIZ_IDS = /quiz|guess|fill-gap|tense|spot-the-mistake/;
export const isQuiz = fmt => !!fmt && ((fmt.payoff && fmt.payoff.type === 'answer-reveal') || QUIZ_IDS.test(String(fmt.id || '')));
// tiêu đề hook không được lặp huy hiệu: trùng/chứa nhau (sau chuẩn hoá) → dùng từ khóa (word-of-day: "WORD OF THE DAY" + "BANDWIDTH") / câu đầu
export function hookTitle(sc, fmt, lines) {
  const n = x => norm(String(x || '')).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim(), badge = n(fmt && fmt.hook && fmt.hook.badge);
  const dup = t => { const x = n(t); return !x || (badge && (x === badge || badge.includes(x) || x.includes(badge))); };
  for (const t of [sc.hook, (sc.keywords || [])[0], sc.right, lines[0] && lines[0].text]) if (t && !dup(t)) return String(t);
  return String(sc.hook || (lines[0] && lines[0].text) || '');
}

// ---------- Dựng timeline (props cho Remotion) ----------
// s = state.json (lines/words/shots/variant/stage/job), assets = { roomOf(seg) → {src}|null, actorOf(actor, line) → {src, kind, w, h, foot, figH}|null, kit: {mood: src} }
export function buildTimeline({ s, words, assets = {}, w = 1080, h = 1920, fps = FPS, seed = 'x', sfxMap = null, grain = true }) {
  const v = s.variant || {}, fmt = v.format || { id: 'dont-say', hook: { pattern: 'stop-saying', badge: "DON'T SAY THIS" }, payoff: { type: 'compare-cards', beat: 'example' }, labels: {} };
  const theme = v.theme || { id: 'pop-teal', caption: 'pop-box', color: 'teal-cream', layout: 'stage-center' };
  const sc = s.job.script, lines = s.lines.map((l, i) => ({ i, who: l.who, beat: l.beat, text: l.text, start: l.start, end: l.end, punch: !!l.punch, emotion: (s.stage && s.stage.lines[i] && s.stage.lines[i].emotion) || null }));
  const D = s.duration, endStart = s.endStart, layout = LAYOUTS[theme.layout] || LAYOUTS['stage-center'], colors = COLOR_THEMES[theme.color] || COLOR_THEMES['teal-cream'];
  const pages = captionPages(markKeywords(words, sc.keywords || []), { style: theme.caption, lineEnd: i => (s.lines[i] || {}).end, lineStart: i => (s.lines[i] || {}).start }); // tiếng thật bắt đầu ở line.start + 40 ms (whisper hay đặt từ đầu muộn)
  const shots = (s.shots || []).map(x => ({ ...x }));
  const cuts = pickTransitions(shots, { lines, stage: s.stage, lead: v.transition && v.transition.id, seed, pool: TRANSITIONS });
  const stage = s.stage || { lines: [], segs: [], time: 'day' };
  const time = (v.setting && v.setting.time) || stage.time || 'day';
  // Hook 1,5 s đầu: kiểu theo khuôn, chữ = hook kịch bản. Không lặp: tiêu đề trùng huy hiệu ("WORD OF THE DAY" × 2) → tiêu đề = từ khóa / câu đầu.
  //   Đồng hồ đếm (số 3 / vòng 3-2-1) CHỈ ở khuôn đố (isQuiz) – khuôn khác giữ kiểu hook (sticker/SFX) nhưng không có số đếm lạc.
  const hk = HOOK_KIT[fmt.hook.pattern] || HOOK_KIT.question;
  const hook = { pattern: fmt.hook.pattern, badge: fmt.hook.badge, text: hookTitle(sc, fmt, lines), countdown: isQuiz(fmt) && COUNTDOWN_HOOKS.includes(fmt.hook.pattern), start: 0, end: r3(Math.min(Math.max(1.6, lines[0].end), 2.4)), sticker: hk.sticker, sfx: hk.sfx, shake: !!hk.shake };
  { let hy = HOOK_Y; const wmB = 236 + 40 + 8; for (let k = 0; k < 3; k++) { const L = hookLayout(hook, { ...layout, hookY: hy }, { W: w, H: h }); Object.assign(hook, L); if (L.box[1] >= wmB) break; hy += (wmB - L.box[1] + 1) / h; } } // hook ngay dưới watermark (watermark vẫn hiện từ 1,5 s) // fs, lines (xuống dòng tính sẵn), badgeFs, box, top – Short.jsx vẽ đúng bố cục này
  // Thẻ payoff + nhãn khuôn (DON'T SAY/SAY…) – compare-cards: ❌ ở phần đầu, ✅ ở beat payoff
  const pair = comparePair(sc), cards = [];
  const pay = fmt.payoff || { type: 'compare-cards', beat: 'example' }, pl = lines.find(l => l.beat === pay.beat) || lines[Math.min(lines.length - 1, 2)];
  if (['compare-cards', 'before-after', 'stamp-correct'].includes(pay.type) && pair.wrong) {
    const wl = lines.find(l => l.i < pl.i && (l.beat === 'situation' || l.beat === 'hook')) || lines[0];
    // thẻ ❌ chỉ vào SAU khi hook mờ hẳn (hook.end + 0,3 s + 1 khung) – thẻ và tiêu đề hook cùng vùng trên, không được chồng nhau
    const c0 = r3(Math.max(hook.end + 0.34, wl.start)), c1 = r3(Math.max(Math.min(pl.start, wl.end + 1.2), Math.min(pl.start - 0.05, c0 + 1)));
    if (c1 - c0 >= 0.6) cards.push({ kind: 'dont', style: pay.type, start: c0, end: c1, text: pair.wrong, label: ((fmt.labels || {})[wl.beat] || {}).text || "DON'T SAY" });
  }
  cards.push({ kind: 'do', style: pay.type, start: r3(Math.max(pl.start, hook.end + 0.34)), end: r3(Math.min(endStart, pl.end + 0.6)), text: pair.right || (sc.keywords || [])[0] || pl.text, label: ((fmt.labels || {})[pl.beat] || {}).text || (pay.type === 'tip-card' ? 'TIP' : 'SAY') });
  // Thẻ đặt CAO (ngay dưới watermark) – nhường khoảng giữa khung cho mặt nhân vật (máy hạ khung cho mặt nằm dưới đáy thẻ)
  const wmBottom = 236 + 40 + 8; // watermark (y 236, cao 40) + 8 px
  for (const c of cards) { c.top = CARD_TOP; c.box = cardBox(c, layout, { W: w, H: h }); if (c.box[1] < wmBottom) { c.top += wmBottom - c.box[1]; c.box = cardBox(c, layout, { W: w, H: h }); } } // tem CORRECT nhô lên → hạ thẻ
  const watermark = { from: 1.5, fade: 0.5, until: endStart, x: SAFE.left, y: 236, h: 40, opacity: 0.62 };
  if (intersects(watermarkBox(watermark), hook.box)) watermark.from = r3(Math.max(1.5, hook.end + 0.34)); // bố cục hook sát mép trên → watermark hiện sau hook

  // Phụ đề: 1 VỊ TRÍ CỐ ĐỊNH cả video (dải 1/3 dưới, ngay trên vùng UI nền tảng) – không nhảy lên giữa khung theo từng cảnh
  const capFont = Math.min(...pages.map(p => captionLayout(p, theme.caption, { W: w }).font), CAP_FONT[theme.caption] || 92);
  for (const p of pages) {
    const L = captionLayout(p, theme.caption, { W: w, font: isFinite(capFont) ? capFont : null });
    Object.assign(p, { breaks: L.breaks, font: L.font, gap: L.gap, stroke: L.stroke, minGap: L.minGap, half: L.half, width: L.width, popFrom: 1 }); // cả trang hiện một lúc (không bật từng từ)
    p.words.forEach((x, i) => { x.maxS = L.maxS[i]; });
  }
  // canh ĐÁY cố định (như phụ đề phim): trang 1 dòng / 2 dòng cùng 1 đường đáy, chỉ cao thêm lên trên
  const capBottom = h - SAFE.bottom - CAP_BOTTOM_GAP;
  for (const p of pages) p.y = (capBottom - p.half) / h;
  const capTopFor = (a, b) => Math.min(h, ...pages.filter(p => p.start < b && p.end > a).map(p => capBottom - 2 * p.half));
  const capTop = Math.min(h, ...pages.map(p => capBottom - 2 * p.half)); // (sticker: vùng phụ đề chung)

  // Kit (linh vật) = lớp RIÊNG ngoài cảnh: bật lên sau khi chuyển cảnh vào xong, thu lại trước khi chuyển cảnh ra (không mờ "bóng ma" theo cảnh)
  const kitArt = l => (assets.kit && (assets.kit[l.emotion === 'right' ? 'win' : l.beat === 'tip' ? 'think' : 'happy'] || assets.kit.happy)) || null;
  const kits = [];
  for (const l of lines.filter(x => x.who === 'kit')) {
    const inC = cuts.find(c => c.t >= l.start - 0.4 && c.t <= l.start + 0.4), outC = cuts.find(c => c.t > l.start + 0.5 && c.t <= l.end + 0.6);
    const art = kitArt(l); if (art) kits.push({ src: art, start: r3(inC ? inC.to : l.start), end: r3(outC ? outC.from : l.end + 0.2), box: KIT_BOX(w) });
  }
  // Lớp phủ "calm": MỘT lớp tại một thời điểm ngoài phụ đề (hook → thẻ ❌ → thẻ ✅ → Kit), không đè chuyển cảnh: vào ≥ 0,3 s sau cắt, tắt hẳn (kể cả mờ
  // 0,3 s) ≥ 0,2 s trước cắt kế. Thẻ quá ngắn (< 1 s) thì bỏ thẻ ❌; thẻ ✅ ưu tiên, Kit nhường (dời/bỏ).
  scheduleOverlays({ hook, cards, kits, cuts, endStart });
  // lớp chữ/hình phía trên đang hiện ≥ 0,2 s trong cảnh (không tính lúc đang mờ đi) → đáy của chúng = giới hạn trên cho mặt nhân vật
  const tops = [{ a: hook.start || 0, b: hook.end, y: hook.box[3] }, ...cards.map(c => ({ a: c.start, b: c.end, y: c.box[3] })), ...kits.map(k => ({ a: k.start, b: k.end, y: k.box[3] }))];
  const topFor = (a, b) => Math.max(0, ...tops.filter(o => Math.min(b, o.b) - Math.max(a, o.a) >= 0.2).map(o => o.y));

  // Diễn viên: clip theo câu; "đồng hồ" clip (t0) = đầu chuỗi câu liên tiếp dùng CÙNG clip → clip mới luôn bắt đầu từ khung 0 (tư thế gốc
  // chung của mọi clip Kling cùng ảnh tham chiếu), không nhảy theo số khung tuyệt đối; Short.jsx phát qua lại (ping-pong) → không giật khi lặp.
  const runT0 = {}; // `${who}|${line}` → t0
  { const last = {}; lines.forEach((l, i) => { for (const a of ((stage.lines[i] || {}).actors || [])) { const as = assets.actorOf ? assets.actorOf(a, i) : null; if (!as) continue; const key = `${as.src}|${JSON.stringify((a.asset && a.asset.seg) || null)}`, p = last[a.who];
    const t0 = p && p.key === key && p.i === i - 1 ? p.t0 : r3(Math.max(0, (i ? l.start : 0) - CLIP_LEAD)); runT0[`${a.who}|${i}`] = t0; last[a.who] = { key, i, t0 }; } }); }
  const actorAt = (a, li) => { const as = assets.actorOf ? assets.actorOf(a, li) : null; return as ? { who: a.who, role: a.role, x: a.x, y: a.y, h: a.h, flip: !!a.flip, behind: a.behind || null, ...as, seg: (a.asset && a.asset.seg) || null, t0: runT0[`${a.who}|${li}`] ?? 0 } : null; };
  // Cảnh: nền + diễn viên + khung máy + grade
  const S = shots.map((sh, k) => {
    const li = sh.line >= 0 ? sh.line : lines.length - 1, sl = stage.lines[li] || { actors: [] }, seg = (stage.segs || []).find(g => li >= g.from && li <= g.to) || null;
    const room = seg && assets.roomOf ? assets.roomOf(seg) : null, grade = gradeFor({ time, hasRoom: !!room });
    let actors = sh.framing === 'card' ? [] : (sl.actors || []).map(a => actorAt(a, li)).filter(Boolean);
    // cảnh liên tục qua ranh giới câu (planFilmShots gộp – chống jump cut): clip đổi GIỮA cảnh → danh sách clip theo mốc + hoà 5 khung (Short.jsx)
    if (sh.lines && sh.lines.length > 1) for (const a of actors) {
      a.alt = sh.lines.slice(1).map(j => { const b = ((stage.lines[j] || {}).actors || []).find(x => x.who === a.who); const as = b && actorAt(b, j); return as && as.src !== a.src ? { at: r3(lines[j].start), ...as } : null; }).filter(Boolean);
      if (!a.alt.length) delete a.alt;
    }
    if (!room && actors.length) actors = studioStage(actors, w, h); // nền studio: không có sàn phòng → dàn lại cỡ vừa khung (không phóng quá to/cắt mép)
    const line = lines[li] || {};
    const film = ['wide', 'two', 'single', 'close'].includes(sh.framing);
    return {
      k, start: sh.start, end: sh.end, line: sh.line, ...(sh.lines ? { lines: sh.lines } : {}), framing: sh.framing, focus: sh.focus || null, grade, room: room ? room.src : null,
      roomFx: room ? { light: room.light || null, tint: room.tint || null, maskText: room.maskText || [], counter: room.counter || null, blur: room.blur } : null,
      cam: film ? shotCamera(sh, actors, { room, W: w, H: h, topLimit: topFor(sh.start, sh.end), capTop: capTopFor(sh.start, sh.end) }) : null,
      actors, kit: null,
      shake: false, punch: false, // calm: không rung / giật zoom
    };
  });
  // Hook (cảnh đầu): đẩy máy 4 % gói trong 2,4 s đầu rồi đứng yên – chuyển động êm cho 2 s mở màn (cổng visual-hook), không giật
  if (S[0] && S[0].cam && S[0].actors.length) { const c = S[0].cam; S[0].cam = { ...c, from: { ...c.to, z: Math.max(1, c.to.z * 0.96) }, dur: Math.min(2.4, S[0].end - S[0].start) }; }
  // Cảnh đơn/cận: chỉ vẽ người chính + ai trọn trong khung suốt cảnh (không có nửa người ở mép)
  const fullIn = (c, a) => { const l = toScreen(c, a.x - 0.22 * a.h, 0, w, h)[0], r = toScreen(c, a.x + 0.22 * a.h, 0, w, h)[0]; return l >= 0 && r <= w; };
  for (const x of S) if (x.cam && ['single', 'close'].includes(x.framing)) x.actors = x.actors.filter(a => a.who === x.focus || (fullIn(x.cam.from, a) && fullIn(x.cam.to, a)));

  // Thẻ vẫn đè mặt (phòng người đứng cao – máy không hạ đủ): cảnh vào sau ≥ 0,8 s của thẻ → thẻ tắt ngay đầu cảnh đó; sớm hơn → cảnh đó lùi về toàn cảnh
  const faceHit = (x, box, a, b) => x.cam && x.actors.some(ac => [a, b].some(t => { const c = camAt(x.cam, (t - x.start) / Math.max(0.1, x.cam.dur || x.end - x.start)), fb = faceBox(ac), p0 = toScreen(c, fb[0], fb[1], w, h), p1 = toScreen(c, fb[2], fb[3], w, h); return intersects(box, [p0[0], p0[1], p1[0], p1[1]]); }));
  for (const c of cards) for (const x of S) {
    if (x.end <= c.start || x.start >= c.end || !faceHit(x, c.box, Math.max(x.start, c.start), Math.min(x.end, c.end))) continue;
    if (x.start >= c.start + 0.8) { c.end = r3(x.start); break; }
    const sh = shots[x.k], cam = shotCamera({ ...sh, framing: 'wide' }, x.actors, { W: w, H: h, topLimit: topFor(x.start, x.end), capTop: capTopFor(x.start, x.end) });
    if (!faceHit({ ...x, cam }, c.box, Math.max(x.start, c.start), Math.min(x.end, c.end))) Object.assign(x, { framing: 'wide', focus: null, cam });
  }
  scheduleOverlays({ hook, cards, kits, cuts, endStart }); // lần 2: sau khi thẻ bị tắt sớm vì đè mặt
  for (const c of cards) c.box = cardBox(c, layout, { W: w, H: h });
  // Nhịp: sự kiện hình = cut + hook + thẻ → chèn ngắt nhịp để khoảng trống ≤ 2,6 s; sticker đặt ở chỗ không che mặt / chữ
  const visual = [...cuts.map(c => c.t), hook.end, ...cards.map(c => c.start)];
  const interrupts = []; void visual; // calm: không chèn ngắt nhịp (punch/sticker/flash/tilt) – patternInterrupts giữ cho kiểu cũ
  for (const it of interrupts) if (it.kind === 'sticker') {
    const sh = S.find(x => it.t >= x.start && it.t < x.end), busy = [...overlayBoxes({ w, h, hook, cards, pages, watermark, theme: { caption: theme.caption, layout } }, it.t).map(b => b.box)];
    if (sh && sh.cam) for (const a of sh.actors) for (const u of [0, 0.5, 1]) { const c = camAt(sh.cam, Math.min(1, Math.max(0, (it.t - sh.start + u * 1.1) / Math.max(0.1, sh.end - sh.start)))), fb = faceBox(a), p0 = toScreen(c, fb[0], fb[1], w, h), p1 = toScreen(c, fb[2], fb[3], w, h); busy.push([p0[0] - 20, p0[1] - 20, p1[0] + 20, p1[1] + 20]); }
    const S0 = STICKER_SIZE, xs = { left: [80, 80 + S0], right: [w - 170 - S0, w - 170] };
    const ys = [760, 900, 1040, 620, 480, 340].filter(y => y >= SAFE.top + 60 && y + S0 <= capTop - 10);
    let pick = null; for (const side of [it.side, it.side === 'left' ? 'right' : 'left']) { for (const y of ys) { const bx = [xs[side][0] - 12, y - 12, xs[side][1] + 12, y + S0 + 12]; if (!busy.some(b => intersects(b, bx))) { pick = { side, y }; break; } } if (pick) break; }
    if (pick) Object.assign(it, pick); else { it.kind = 'flash'; it.sticker = null; } // không có chỗ trống → đổi sang chớp sáng (không che mặt)
  }
  const shocks = lines.filter(l => l.emotion === 'wrong' && l.start > 1).map(l => l.start);
  const sfx = sfxMap ? placeSfx({ cuts, pages, cards, interrupts, hook, shocks, map: sfxMap, endStart, calm: true, mode: (v.sfx && v.sfx.id) || 'full', dry: !v.music || !v.music.id || v.music.id === 'none' }) : [];
  return {
    w, h, fps, durationInFrames: Math.round(D * fps), duration: D, seed: String(seed), format: fmt.id,
    theme: { ...theme, colors, layout }, grain, hook, pages, cuts, shots: S, cards, interrupts, sfx, kits,
    progress: { start: 0, end: endStart },
    watermark,
    endCard: { start: endStart, url: 'lexkite.com', cta: 'Practice free', kit: assets.kit ? assets.kit.cheer || assets.kit.happy : null },
    safe: SAFE,
  };
}

// ---------- QA: visual hook (2 s đầu) ----------
// frames: [{ w, h, data: Uint8Array RGB }] lấy mẫu ~10–15 fps; tl = timeline. Điểm 0–100 = 40 chữ + 30 chuyển động + 30 tương phản. Cổng ≥ 90.
const luma = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
export function frameStats(f) {
  const { w, h, data } = f, n = w * h, Y = new Float32Array(n);
  for (let i = 0; i < n; i++) Y[i] = luma(data, i * 3);
  return { w, h, Y };
}
export function motionEnergy(frames) {
  if (frames.length < 2) return 0;
  let sum = 0, cnt = 0;
  for (let k = 1; k < frames.length; k++) { const a = frames[k - 1].Y, b = frames[k].Y; let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); sum += d / a.length; cnt++; }
  return sum / cnt;
}
export function textEdgeDensity(f, region = [0.05, 0.1, 0.95, 0.45]) { // tỉ lệ điểm có gradient ngang mạnh (> 60) – chữ to có viền tạo nhiều cạnh
  const { w, h, Y } = f, x0 = Math.floor(region[0] * w), y0 = Math.floor(region[1] * h), x1 = Math.floor(region[2] * w), y1 = Math.floor(region[3] * h);
  let e = 0, n = 0; for (let y = y0; y < y1; y++) for (let x = x0 + 1; x < x1; x++) { n++; if (Math.abs(Y[y * w + x] - Y[y * w + x - 1]) > 60) e++; }
  return n ? e / n : 0;
}
// Nhịp chuyển động (QA metric): MSE độ sáng khung liên tiếp trong hộp [x0,y0,x1,y1] (tỉ lệ). Dấu hiệu 24→30 fps giữ khung (nhịp 2-1-1-1)
// hoặc clip "on twos": bước khung lõm xen kẽ. stutterRate = số lõm / số bước có chuyển động.
export function cadenceStats(frames, box = [0, 0, 1, 1]) {
  const F = frames.map(f => (f.Y ? f : frameStats(f))), d = [];
  for (let k = 1; k < F.length; k++) { const { w, h } = F[k], a = F[k - 1].Y, b = F[k].Y, x0 = Math.floor(box[0] * w), x1 = Math.ceil(box[2] * w), y0 = Math.floor(box[1] * h), y1 = Math.ceil(box[3] * h); let s = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const e = a[y * w + x] - b[y * w + x]; s += e * e; n++; } d.push(n ? s / n : 0); }
  // stutter = "lõm": bước khung nhỏ hơn một nửa cả 2 bước kề (khung nhân vật đứng lại trong khi máy vẫn đẩy) – bền với chuyển động máy
  let moving = 0, repeats = 0, stutters = 0; d.forEach((x, i) => { if (x > 3) moving++; if (x < 0.6) repeats++; if (i > 0 && i < d.length - 1 && Math.min(d[i - 1], d[i + 1]) > 3 && x < 0.5 * Math.min(d[i - 1], d[i + 1])) stutters++; });
  return { frames: F.length, moving, repeats, stutters };
}
export function lumaSpread(frames) { // p95 − p5 của độ sáng (0–255)
  const hist = new Array(256).fill(0); let n = 0;
  for (const f of frames) for (const y of f.Y) { hist[Math.min(255, Math.max(0, Math.round(y)))]++; n++; }
  const q = p => { let c = 0; for (let i = 0; i < 256; i++) { c += hist[i]; if (c >= p * n) return i; } return 255; };
  return q(0.95) - q(0.05);
}
export function visualHookScore({ frames, tl }) {
  const F = frames.map(f => (f.Y ? f : frameStats(f)));
  const hookOk = !!tl && !!tl.hook && tl.hook.start <= 0.3 && tl.hook.end >= 1.5 && String(tl.hook.text || '').trim().length > 0;
  const edge = F.length ? Math.max(...F.slice(Math.floor(F.length * 0.15)).map(f => textEdgeDensity(f))) : 0;
  const text = hookOk ? (edge >= 0.012 ? 1 : edge >= 0.006 ? 0.7 : 0.4) : edge >= 0.012 ? 0.5 : 0;
  const me = motionEnergy(F), motion = Math.min(1, me / 5);
  const sp = F.length ? lumaSpread(F) : 0, txtC = tl && tl.theme ? Math.min(contrast(tl.theme.colors.text === '#14100E' ? BRAND.ink : BRAND.white, BRAND.ink === tl.theme.colors.text ? BRAND.white : BRAND.ink), 21) : 0;
  const ctr = Math.min(1, sp / 140) * (txtC >= 4.5 ? 1 : 0.5);
  const score = Math.round(100 * (0.4 * text + 0.3 * motion + 0.3 * ctr));
  return { score, text: r3(text), motion: r3(motion), contrast: r3(ctr), edge: r3(edge), motionEnergy: r3(me), lumaSpread: sp };
}

// ---------- QA: màu ----------
const srgb = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
export function rgb2lab(r, g, b) {
  const R = srgb(r), G = srgb(g), B = srgb(b);
  const X = (0.4124 * R + 0.3576 * G + 0.1805 * B) / 0.95047, Y = 0.2126 * R + 0.7152 * G + 0.0722 * B, Z = (0.0193 * R + 0.1192 * G + 0.9505 * B) / 1.08883;
  const f = t => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
// Da: luật RGB (Peer) + dải YCbCr (Chai–Ngan, Cb 77–127, Cr 133–180) – loại vải vàng/cam bão hòa (áo blazer vàng của Diane trước đây bị đếm là "da"
// → ΔE da↔phòng 45,6 giả ở office-02 17/10)
const isSkin = (r, g, b) => { if (!(r > 95 && g > 40 && b > 20 && r > g && r > b && r - Math.min(g, b) > 15 && Math.abs(r - g) > 15)) return false;
  const cb = 128 - 0.1687 * r - 0.3313 * g + 0.5 * b, cr = 128 + 0.5 * r - 0.4187 * g - 0.0813 * b; return cb >= 77 && cb <= 127 && cr >= 133 && cr <= 180; };
// frame RGB + hộp diễn viên [x0,y0,x1,y1] (tỉ lệ) → cháy/bết, bão hòa TB, ΔE (chỉ a*b* – lệch "tông", bỏ qua độ sáng) giữa da nhân vật và phòng
// trắng tuyệt đối (chữ/sticker UI, min kênh ≥ 252) không tính cháy – grade đã hạ highlight nên cảnh thật không chạm 255
// mask: hộp lớp chữ/thẻ UI (tỉ lệ 0–1, từ overlayBoxes) – bỏ khỏi phép đo: nền kem #FFF7EA của thẻ payoff + grain chạm Y ≥ 250 không phải "phòng cháy sáng"
// (supermarket-price 17/10: "cháy 1,1 %" toàn nằm trong thẻ ✅)
export function gradeStats(f, actorBox = null, mask = []) {
  const { w, h, data } = f; let n = 0, hi = 0, lo = 0, sat = 0; const skin = [0, 0, 0, 0], room = [0, 0, 0, 0];
  for (let i = 0; i < w * h; i++) {
    if (mask.length) { const x = (i % w) / w, yy = Math.floor(i / w) / h; if (mask.some(m => x >= m[0] && x <= m[2] && yy >= m[1] && yy <= m[3])) continue; }
    n++;
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), y = luma(data, i * 3);
    if (y >= 250 && mn < 252) hi++; if (y <= 5) lo++; sat += mx ? (mx - mn) / mx : 0;
    if (actorBox) {
      const x = (i % w) / w, yy = Math.floor(i / w) / h, inside = x >= actorBox[0] && x <= actorBox[2] && yy >= actorBox[1] && yy <= actorBox[3];
      if (inside && isSkin(r, g, b)) { skin[0] += r; skin[1] += g; skin[2] += b; skin[3]++; } else if (!inside && y > 40 && y < 230) { room[0] += r; room[1] += g; room[2] += b; room[3]++; }
    }
  }
  let dE = null;
  if (skin[3] > n * 0.002 && room[3] > n * 0.05) { const a = rgb2lab(skin[0] / skin[3], skin[1] / skin[3], skin[2] / skin[3]), b = rgb2lab(room[0] / room[3], room[1] / room[3], room[2] / room[3]); dE = r3(Math.hypot(a[1] - b[1], a[2] - b[2])); }
  n = n || 1; return { clipHi: r3(hi / n), clipLo: r3(lo / n), sat: r3(sat / n), dE };
}
export const GRADE_LIMITS = { clip: 0.01, satMin: 0.12, satMax: 0.62, satMaxStudio: 0.82, dEMax: 38 };
export function gradeVerdict(stats) {
  const bad = [];
  for (const [i, s] of stats.entries()) {
    if (s.clipHi > GRADE_LIMITS.clip) bad.push(`khung ${i}: cháy sáng ${(s.clipHi * 100).toFixed(1)}%`);
    if (s.clipLo > GRADE_LIMITS.clip) bad.push(`khung ${i}: bết tối ${(s.clipLo * 100).toFixed(1)}%`);
    const studio = s.grade === 'studio', satMax = studio ? GRADE_LIMITS.satMaxStudio : GRADE_LIMITS.satMax; // nền studio = teal thương hiệu đậm (bão hòa cao có chủ đích), không có phòng để so ΔE
    if (s.sat < GRADE_LIMITS.satMin || s.sat > satMax) bad.push(`khung ${i}: bão hòa ${s.sat} ngoài ${GRADE_LIMITS.satMin}–${satMax}`);
    if (!studio && s.dE != null && s.dE > GRADE_LIMITS.dEMax) bad.push(`khung ${i}: ΔE da↔phòng ${s.dE} > ${GRADE_LIMITS.dEMax} (tách lớp)`);
  }
  return { ok: !bad.length, bad };
}
export const seedOf = s => String(hash32(s));
