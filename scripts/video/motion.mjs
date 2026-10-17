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
// Chia mỗi câu thành "trang" 1–3 từ (mega-word: 1 từ): ngắt ở dấu câu hoặc khi quá dài; trang giữ tới trang sau (không nháy trống giữa câu).
const FUNC = /^(on|in|at|to|of|for|with|a|an|the|and|or|but|is|are|was|so|my|your|our|their|his|her|its|i|we|you|it|this|that|not|no|be|by|from|as|if|than|then|could|would|can|will)$/i;
// Xuống dòng trong 1 trang: tối đa maxLines dòng ≤ maxChars, cân đều độ dài, không để 1 từ ngắn đứng riêng, ưu tiên ngắt sau dấu câu/trước từ chức năng.
export function breakLines(ws, { maxChars = 17, maxLines = 3 } = {}) {
  const L = ws.map(w => w.length), tot = L.reduce((a, b) => a + b, 0) + ws.length - 1;
  if (tot <= maxChars || ws.length < 2) return [ws.length];
  let best = null;
  const rec = (i, acc) => {
    if (acc.length > maxLines) return;
    if (i === ws.length) {
      const lens = acc.map((n, k) => { const st = acc.slice(0, k).reduce((a, b) => a + b, 0); return ws.slice(st, st + n).join(' ').length; });
      if (lens.some(x => x > maxChars * 1.15)) return;
      let cost = Math.max(...lens) - Math.min(...lens) + 6 * acc.length;
      acc.forEach((n, k) => { const st = acc.slice(0, k).reduce((a, b) => a + b, 0), lw = ws.slice(st, st + n);
        if (n === 1 && lw[0].replace(/\W/g, '').length <= 3) cost += 40; // từ ngắn đứng một mình
        if (k < acc.length - 1 && FUNC.test(lw[lw.length - 1].replace(/\W/g, ''))) cost += 12; // dòng kết thúc bằng từ chức năng
        if (k < acc.length - 1 && /[,.!?;:–—]["”']?$/.test(lw[lw.length - 1])) cost -= 5; });
      if (!best || cost < best.cost) best = { cost, acc: [...acc] };
      return;
    }
    for (let n = 1; i + n <= ws.length; n++) rec(i + n, [...acc, n]);
  };
  rec(0, []);
  return best ? best.acc : [ws.length];
}
export function captionPages(words, { style = 'pop-box', maxWords = 3, maxChars = 16, lead = 0.04 } = {}) {
  const mw = style === 'mega-word' ? 1 : style === 'karaoke-bar' ? 6 : maxWords, mc = style === 'karaoke-bar' ? 30 : maxChars;
  const pages = [];
  const byLine = {}; for (const w of words) (byLine[w.line] = byLine[w.line] || []).push(w);
  for (const ws of Object.values(byLine)) {
    let cur = [];
    const flush = () => { if (cur.length) pages.push({ line: cur[0].line, words: cur }); cur = []; };
    for (const w of ws) {
      const len = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
      if (cur.length && (cur.length >= mw || len > mc)) {
        // ngắt ở ranh giới cụm: từ chức năng cuối trang (on/a/the/to…) chuyển sang trang sau cùng cụm của nó
        const carry = cur.length > 1 && FUNC.test(cur[cur.length - 1].w) ? cur.pop() : null;
        flush(); if (carry) cur.push(carry);
      }
      cur.push(w); if (/[.,!?;:]["”']?$/.test(w.w)) flush();
    }
    flush();
    // không để trang cuối câu chỉ còn 1 từ ngắn (≤ 3 chữ): gộp vào trang trước nếu vừa (≤ 1,4 × giới hạn ký tự)
    const mine = pages.filter(p => p.line === ws[0].line), last = mine[mine.length - 1], prev = mine[mine.length - 2];
    if (mw > 1 && prev && last.words.length === 1 && last.words[0].w.replace(/\W/g, '').length <= 3 && !/[.,!?;:]["”']?$/.test(prev.words[prev.words.length - 1].w)
      && prev.words.reduce((a, x) => a + x.w.length + 1, 0) + last.words[0].w.length <= mc * 1.4) { prev.words.push(last.words[0]); pages.splice(pages.indexOf(last), 1); }
  }
  return pages.map((p, i) => {
    const nx = pages[i + 1], lastEnd = p.words[p.words.length - 1].end;
    const end = nx && nx.line === p.line ? nx.words[0].start - lead : lastEnd + 0.25;
    return { line: p.line, breaks: breakLines(p.words.map(w => w.w), { maxChars: style === 'karaoke-bar' ? 24 : style === 'mega-word' ? 10 : 17 }), start: r3(p.words[0].start - lead), end: r3(nx && nx.line === p.line ? end : Math.max(end, lastEnd)), words: p.words.map(w => ({ w: w.w, key: !!w.key, pop: r3(w.start - lead), start: w.start, end: w.end })) };
  });
}

// ---------- Chuyển cảnh ----------
// cut i = giữa shot i và i+1. Chọn theo ngữ cảnh + bộ của biến thể; không lặp kiểu ở 2 cut liền nhau; luôn ≥ 4 kiểu khác nhau nếu ≥ 4 cut.
export function pickTransitions(shots, { lines = [], stage = null, lead = null, seed = 'x', pool = TRANSITIONS } = {}) {
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
export const CAM = { twoFill: 0.62, singleFill: 0.54, closeFill: 0.5, headroom: 0.1, maxUp: 1.6, roomUp: 2.4 }; // phòng đã làm mờ chiều sâu (DOF, mờ tăng theo z) → cho phóng tới 2,4× ảnh gốc
export function zoomCap(actors, room, W = 1080) {
  const caps = [room && room.srcW ? CAM.roomUp * room.srcW / W : 3];
  for (const a of actors) if (a.figH && a.h) caps.push(CAM.maxUp * a.figH / a.h);
  return Math.max(1, Math.min(...caps));
}
const clampCam = (c, W, H) => { const rw = W / c.z, rh = H / c.z; return { z: c.z, cx: Math.min(Math.max(c.cx, rw / 2), W - rw / 2), cy: Math.min(Math.max(c.cy, rh / 2), H - rh / 2) }; };
const body = a => ({ l: a.x - 0.22 * a.h, r: a.x + 0.22 * a.h, t: a.y - a.h, b: a.y }); // thân + tay buông (tay vung rộng hơn được phép chạm mép)
// → { from:{cx,cy,z}, to:{cx,cy,z} } cho 1 cảnh. framing: wide | two | single | close (+ focus = who). Nhân vật khác: hoặc trọn trong khung hoặc ra hẳn ngoài.
export function shotCamera(shot, actors, { room = null, W = 1080, H = 1920 } = {}) {
  const wide = { cx: W / 2, cy: H / 2, z: 1 };
  if (!actors.length || shot.framing === 'wide' || shot.framing === 'card') return { from: wide, to: { ...wide, z: shot.line === 0 ? 1.12 : 1.04 } }; // hook: đẩy máy rõ (visual hook – chuyển động)
  const cap = zoomCap(actors, room, W);
  const frameOn = (as, fill, bottomOf, upTo = 0.1) => {
    const top = Math.min(...as.map(a => a.y - a.h)), bot = Math.max(...as.map(bottomOf)), l = Math.min(...as.map(a => body(a).l)), r = Math.max(...as.map(a => body(a).r));
    let z = Math.min(H * fill / (bot - top), W * 0.96 / (r - l), cap); z = Math.max(1, z);
    const rh = H / z; return { z, cx: (l + r) / 2, cy: top - rh * upTo + rh / 2 };
  };
  let c, two = frameOn(actors, CAM.twoFill, a => a.y - 0.3 * a.h, CAM.headroom);
  const f = actors.find(a => a.who === shot.focus);
  if (shot.framing === 'two' || !f) c = two;
  else {
    c = shot.framing === 'close' ? frameOn([f], CAM.closeFill, a => a.y - 0.6 * a.h, 0.16) : frameOn([f], CAM.singleFill, a => a.y - 0.3 * a.h, CAM.headroom);
    if (shot.framing === 'close' && c.z < two.z * 1.12) c = { ...c, z: Math.min(cap, two.z * 1.12) };
    // lệch về phía người kia (khoảng nhìn) 1/6 khung; người chính luôn trọn khung. Người kia không trọn khung → không vẽ ở cảnh này
    // (góc máy đơn/cận "loại" người kia như quay từ góc khác – không bao giờ để nửa người dính mép)
    const o = actors.filter(a => a !== f), side = o.length ? (o[0].x > f.x ? 1 : -1) : 0, rw = W / c.z;
    c.cx = f.x + side * rw / 6;
    const fb = body(f); if (fb.l < c.cx - rw / 2 || fb.r > c.cx + rw / 2) c.cx = f.x;
  }
  const to = clampCam(c, W, H), from = clampCam({ ...to, z: Math.max(1, to.z * (shot.framing === 'close' ? 0.97 : 0.93)) }, W, H); // đẩy máy chậm
  return { from, to };
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
// 1 trang phụ đề: cỡ chữ (tự thu nhỏ cho vừa 880 px), khoảng cách từ (margin mỗi bên = 0,28 em), viền, độ phóng tối đa từng từ
// (pop/đang đọc) sao cho khoảng trống nhìn thấy giữa 2 từ luôn ≥ 0,2 em – chữ không dính nhau khi từ đổi màu/phóng ("onFriday?").
export function captionLayout(p, style, { W = 1080 } = {}) {
  const upper = style === 'bounce-outline' || style === 'mega-word', bar = style === 'karaoke-bar';
  const avail = W - OVERLAY.left - OVERLAY.right - (bar ? 60 : 0), sw = bar ? 0 : style === 'mega-word' ? 16 : 12;
  let F = CAP_FONT[style] || 92, m = 0, ws = [], rows = [];
  for (let k = 0; k < 5; k++) {
    m = Math.round(0.28 * F);
    ws = p.words.map(w => textW(upper ? w.w.toUpperCase() : w.w, F) + (w.key ? 48 : 0)); // hộp vàng từ khóa: padding 20 × 2 + bóng 8
    rows = []; let i = 0; for (const n of (p.breaks || [ws.length])) { rows.push(ws.slice(i, i + n).reduce((a, x) => a + x + 2 * m, 0)); i += n; }
    const mx = Math.max(...rows); if (mx <= avail) break; F = Math.floor(F * avail / mx * 0.98);
  }
  const minGap = Math.round(0.2 * F), room = 2 * m - sw - minGap;
  const maxS = ws.map(x => (bar ? 1 : +Math.max(1, Math.min(1.12, 1 + room / x)).toFixed(3)));
  const lineH = F * 1.12, grow = (Math.max(...maxS) - 1) * lineH / 2;
  const half = Math.ceil((rows.length * lineH + (bar ? 44 : 0)) / 2 + sw / 2 + grow + (style === 'bounce-outline' ? 14 : 0) + 6);
  return { font: F, gap: m, stroke: sw, minGap, widths: ws, maxS, rowW: rows, nl: rows.length, half, width: Math.max(...rows) + (bar ? 60 : 0) };
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
  const P = hook.pattern, side = 120 + 18 + (['quiz-timer', 'challenge'].includes(P) ? 138 : P === 'versus' ? 18 + textW('VS', 96) : P === 'countdown-list' ? 18 + textW('3', 130) : 0);
  const bw = f => textW(String(hook.badge || '').toUpperCase(), f) + 2 * String(hook.badge || '').length + 60 * f / 46;
  let badgeFs = 46; while (badgeFs > 28 && side + bw(badgeFs) > W - OVERLAY.left - OVERLAY.right) badgeFs -= 2;
  const rowH = P === 'countdown-list' ? 156 : 120, top = Math.round(layout.hookY * H), headH = lines.length * fs * 1.04 + 14;
  const bottom = Math.ceil(top + rowH + 26 + headH + (P === 'wait-for-it' ? 26 + 82 : 0) + 24); // +24: chữ bật từ dưới lên (translateY 40 × (1 − s))
  let i = 0; const lw = lines.map(n => { const x = wOf(fs, i, i + n); i += n; return x; });
  const width = Math.min(W - OVERLAY.left - OVERLAY.right, Math.max(side + bw(badgeFs), ...lw)), c = cx0(W);
  return { fs, lines, badgeFs, top, bottom, box: [Math.round(c - width / 2), top - 10, Math.round(c + width / 2), bottom] };
}
// Thẻ payoff: hộp ước lượng (nhãn + chữ tự xuống dòng trong 618 px + sticker 130, phóng lò xo ±4 %, tem CORRECT nhô 60 px)
export function cardBox(c, layout, { W = 1080, H = 1920 } = {}) {
  const fs = String(c.text).length > 18 ? 64 : 82, avail = W - 70 - 150 - 72 - 12 - 130 - 28;
  let n = 1, cur = 0; for (const w of String(c.text).split(/\s+/)) { const x = textW(w + ' ', fs); if (cur && cur + x > avail) { n++; cur = 0; } cur += x; }
  const inner = Math.max(130, 36 * 1.25 + n * fs * 1.05 + (c.style === 'meter' && c.kind !== 'dont' ? 36 : 0)), h = 30 + 34 + 12 + inner + 18, top = layout.cardY * H, pad = 0.04 * h;
  return [70, Math.round(top - pad - (c.style === 'stamp-correct' && c.kind !== 'dont' ? 60 : 0)), W - 150, Math.round(top + h + pad)];
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
  const style = tl.theme && tl.theme.caption;
  lines.forEach((l, i) => {
    const ps = (tl.pages || []).filter(p => p.line === i); if (!ps.length) return;
    const got = renderedCaption(ps, style), want = tokens(l.text).join(' ');
    if (got !== want) joins.push(`câu ${i + 1}: chữ hiện "${got}" ≠ kịch bản "${want}"`);
  });
  const bad = [...overlaps, ...unsafe, ...joins];
  return { ok: !bad.length, bad, overlaps, unsafe, joins };
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
export function placeSfx({ cuts = [], pages = [], cards = [], interrupts = [], hook = null, shocks = [], map, endStart, mode = 'full' }) {
  const ev = [], add = (t, key, prio = 1) => { const id = typeof key === 'string' && map[key] ? map[key] : key; if (t >= 0 && id) ev.push({ t: r3(t), id, gainDb: (map.gain[id] ?? -16) + (mode === 'soft' ? -4 : mode === 'punchy' ? 2 : 0), prio }); };
  if (hook) { add(0.02, 'hook', 3); if (hook.sfx && hook.sfx !== 'hook') add(hook.sfx === 'preReveal' ? 0.3 : 0.15, hook.sfx, 2); }
  for (const c of cuts) { const id = map.transition[c.type]; add(c.t - (id === 'whoosh' ? 0.22 : id === 'swoosh' ? 0.12 : 0.02), id, 2); }
  for (const c of cards) { if (c.kind === 'dont') add(c.start + 0.05, 'wrong', 3); else { if (c.start > 1.8) add(c.start - 1.45, 'preReveal', 1); add(c.start + 0.05, 'reveal', 3); } }
  for (const s of shocks) add(s, 'shock', 2);
  for (const p of interrupts) if (p.kind === 'sticker') add(p.t, 'sticker', 1);
  // pop chữ: từ khóa + từ đầu mỗi trang (tối đa 1 pop / 0,35 s để không rối tai)
  for (const p of pages) p.words.forEach((w, j) => { if (w.key || j === 0) add(w.pop, 'wordPop', w.key ? 1 : 0); });
  ev.sort((a, b) => a.t - b.t || b.prio - a.prio);
  const out = [];
  for (const e of ev) {
    if (e.t > endStart + 2) continue;
    const near = out.find(x => Math.abs(x.t - e.t) < (e.id === 'pop' || x.id === 'pop' ? 0.35 : 0.15));
    if (near) { if (e.prio > near.prio) Object.assign(near, e); continue; }
    if (e.id === 'bass-drop' && out.some(x => x.id === 'bass-drop' && e.t - x.t < 3)) continue;
    out.push({ ...e });
  }
  return out.map(({ prio, ...e }) => e);
}

// ---------- Dựng timeline (props cho Remotion) ----------
// s = state.json (lines/words/shots/variant/stage/job), assets = { roomOf(seg) → {src}|null, actorOf(actor, line) → {src, kind, w, h, foot, figH}|null, kit: {mood: src} }
export function buildTimeline({ s, words, assets = {}, w = 1080, h = 1920, fps = FPS, seed = 'x', sfxMap = null, grain = true }) {
  const v = s.variant || {}, fmt = v.format || { id: 'dont-say', hook: { pattern: 'stop-saying', badge: "DON'T SAY THIS" }, payoff: { type: 'compare-cards', beat: 'example' }, labels: {} };
  const theme = v.theme || { id: 'pop-teal', caption: 'pop-box', color: 'teal-cream', layout: 'stage-center' };
  const sc = s.job.script, lines = s.lines.map((l, i) => ({ i, who: l.who, beat: l.beat, text: l.text, start: l.start, end: l.end, punch: !!l.punch, emotion: (s.stage && s.stage.lines[i] && s.stage.lines[i].emotion) || null }));
  const D = s.duration, endStart = s.endStart, layout = LAYOUTS[theme.layout] || LAYOUTS['stage-center'], colors = COLOR_THEMES[theme.color] || COLOR_THEMES['teal-cream'];
  const pages = captionPages(markKeywords(words, sc.keywords || []), { style: theme.caption });
  const shots = (s.shots || []).map(x => ({ ...x }));
  const cuts = pickTransitions(shots, { lines, stage: s.stage, lead: v.transition && v.transition.id, seed, pool: TRANSITIONS });
  const stage = s.stage || { lines: [], segs: [], time: 'day' };
  const time = (v.setting && v.setting.time) || stage.time || 'day';
  // Cảnh: nền + diễn viên + khung máy + grade
  const S = shots.map((sh, k) => {
    const li = sh.line >= 0 ? sh.line : lines.length - 1, sl = stage.lines[li] || { actors: [] }, seg = (stage.segs || []).find(g => li >= g.from && li <= g.to) || null;
    const room = seg && assets.roomOf ? assets.roomOf(seg) : null, grade = gradeFor({ time, hasRoom: !!room });
    let actors = sh.framing === 'card' ? [] : (sl.actors || []).map(a => { const as = assets.actorOf ? assets.actorOf(a, li) : null; return as ? { who: a.who, role: a.role, x: a.x, y: a.y, h: a.h, flip: !!a.flip, behind: a.behind || null, ...as, seg: (a.asset && a.asset.seg) || null } : null; }).filter(Boolean);
    if (!room && actors.length) actors = studioStage(actors, w, h); // nền studio: không có sàn phòng → dàn lại cỡ vừa khung (không phóng quá to/cắt mép)
    const line = lines[li] || {};
    const film = ['wide', 'two', 'single', 'close'].includes(sh.framing);
    return {
      k, start: sh.start, end: sh.end, line: sh.line, framing: sh.framing, focus: sh.focus || null, grade, room: room ? room.src : null,
      roomFx: room ? { light: room.light || null, tint: room.tint || null, maskText: room.maskText || [], counter: room.counter || null, blur: room.blur } : null,
      cam: film ? shotCamera(sh, actors, { room, W: w, H: h }) : null,
      actors, kit: line.who === 'kit' && sh.framing !== 'card' ? (assets.kit && (assets.kit[line.emotion === 'right' ? 'win' : line.beat === 'tip' ? 'think' : 'happy'] || assets.kit.happy)) || null : null,
      shake: line.emotion === 'wrong' && sh.start === line.start && sh.framing !== 'close', punch: k === 0 || (!!line.punch && sh.start === line.start && sh.framing !== 'close'),
    };
  });
  // Cảnh đơn/cận: chỉ vẽ người chính + ai trọn trong khung suốt cảnh (không có nửa người ở mép)
  const fullIn = (c, a) => { const l = toScreen(c, a.x - 0.22 * a.h, 0, w, h)[0], r = toScreen(c, a.x + 0.22 * a.h, 0, w, h)[0]; return l >= 0 && r <= w; };
  for (const x of S) if (x.cam && ['single', 'close'].includes(x.framing)) x.actors = x.actors.filter(a => a.who === x.focus || (fullIn(x.cam.from, a) && fullIn(x.cam.to, a)));
  // Kit (linh vật) = lớp RIÊNG ngoài cảnh: bật lên sau khi chuyển cảnh vào xong, thu lại trước khi chuyển cảnh ra (không mờ "bóng ma" theo cảnh)
  const kits = [];
  for (const l of lines.filter(x => x.who === 'kit')) {
    const inC = cuts.find(c => c.t >= l.start - 0.4 && c.t <= l.start + 0.4), outC = cuts.find(c => c.t > l.start + 0.5 && c.t <= l.end + 0.6);
    const sh = S.find(x => l.start >= x.start - 0.4 && l.start < x.end) || {};
    if (sh.kit) kits.push({ src: sh.kit, start: r3(inC ? inC.to : l.start), end: r3(outC ? outC.from : l.end + 0.2) });
  }
  S.forEach(x => { x.kit = null; });
  // Phụ đề không che mặt: trang nào rơi vào dải đầu nhân vật (theo cảnh lúc trang hiện, nới 15% cho khung cận) → dời xuống vùng chân/ lên trên đầu
  // Hook 1,5 s đầu: kiểu theo khuôn, chữ = hook kịch bản
  const hk = HOOK_KIT[fmt.hook.pattern] || HOOK_KIT.question;
  const hook = { pattern: fmt.hook.pattern, badge: fmt.hook.badge, text: String(sc.hook || lines[0].text), start: 0, end: r3(Math.min(Math.max(1.6, lines[0].end), 2.4)), sticker: hk.sticker, sfx: hk.sfx, shake: !!hk.shake };
  Object.assign(hook, hookLayout(hook, layout, { W: w, H: h })); // fs, lines (xuống dòng tính sẵn), badgeFs, box – Short.jsx vẽ đúng bố cục này
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
  // Thẻ payoff nằm ở khoảng trên đầu (cardY): cảnh nào đang chiếu thẻ mà đầu nhân vật đã lên cao (two/single/close) → chuyển cảnh đó
  // về toàn cảnh đẩy máy nhẹ (thẻ chiếm khoảng trần trống, không đè mặt/thân)
  //  – thẻ phải hiện ≥ 1,2 s: các cảnh trong 1,2 s đầu của thẻ đổi sang toàn cảnh; cảnh cận/đôi sau đó → thẻ tắt ngay đầu cảnh đó
  for (const c of cards) {
    for (const x of S) {
      if (!x.cam || x.end <= c.start || x.start >= c.end) continue;
      const headTop = Math.min(...x.actors.map(a => Math.min(toScreen(x.cam.from, a.x, a.y - a.h, w, h)[1], toScreen(x.cam.to, a.x, a.y - a.h, w, h)[1])));
      if (x.framing === 'wide' || headTop >= layout.cardY * h + 300) continue;
      if (x.start < c.start + 1.2) { x.framing = 'wide'; x.focus = null; x.cam = shotCamera({ framing: 'wide', line: x.line }, x.actors, { W: w, H: h }); }
      else { c.end = r3(x.start); break; }
    }
  }

  for (const c of cards) c.box = cardBox(c, layout, { W: w, H: h });
  const watermark = { from: 1.5, fade: 0.5, until: endStart, x: SAFE.left, y: 236, h: 40, opacity: 0.62 };
  if (intersects(watermarkBox(watermark), hook.box)) watermark.from = r3(Math.max(1.5, hook.end + 0.3)); // bố cục hook sát mép trên → watermark hiện sau hook

  for (const p of pages) {
    const sh = S.find(x => p.start >= x.start && p.start < x.end) || S[0];
    const L = captionLayout(p, theme.caption, { W: w }), nl = L.nl, font = L.font, bands = bandsFor(p.start, p.end, { hook, cards, wm: watermark });
    Object.assign(p, { font, gap: L.gap, stroke: L.stroke, minGap: L.minGap, half: L.half, width: L.width });
    p.words.forEach((x, i) => { x.maxS = L.maxS[i]; });
    if (sh.cam) { // vị trí máy lúc trang hiện (và lúc tắt) – chọn chỗ không đè mặt/thân ở cả 2 thời điểm; không bao giờ đè hook/thẻ/watermark
      const u0 = (p.start - sh.start) / Math.max(0.1, sh.end - sh.start), u1 = (Math.min(p.end, sh.end) - sh.start) / Math.max(0.1, sh.end - sh.start);
      const o = { W: w, H: h, capY: layout.capY, font, faceOnly: sh.framing === 'close', half: L.half, bands }; // cận: chỉ tránh mặt (thân chiếm hết khung)
      const y0 = captionSlot(camAt(sh.cam, u0), sh.actors, nl, o), y1 = captionSlot(camAt(sh.cam, u1), sh.actors, nl, o);
      const clear = y => bands.every(([t, b]) => y * h + L.half < t - 12 || y * h - L.half > b + 12);
      p.y = r3(clear(Math.max(y0, y1)) ? Math.max(y0, y1) : clear(y0) ? y0 : y1);
    } else p.y = captionY(sh, layout.capY, h, L.half, bands);
  }
  // Nhịp: sự kiện hình = cut + hook + thẻ → chèn ngắt nhịp để khoảng trống ≤ 2,6 s
  const visual = [...cuts.map(c => c.t), hook.end, ...cards.map(c => c.start)];
  const interrupts = patternInterrupts(visual, D, { endStart, lines, seed });
  const shocks = lines.filter(l => l.emotion === 'wrong' && l.start > 1).map(l => l.start);
  const sfx = sfxMap ? placeSfx({ cuts, pages, cards, interrupts, hook, shocks, map: sfxMap, endStart, mode: (v.sfx && v.sfx.id) || 'full' }) : [];
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
export function gradeStats(f, actorBox = null) {
  const { w, h, data } = f, n = w * h; let hi = 0, lo = 0, sat = 0; const skin = [0, 0, 0, 0], room = [0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2], mx = Math.max(r, g, b), mn = Math.min(r, g, b), y = luma(data, i * 3);
    if (y >= 250 && mn < 252) hi++; if (y <= 5) lo++; sat += mx ? (mx - mn) / mx : 0;
    if (actorBox) {
      const x = (i % w) / w, yy = Math.floor(i / w) / h, inside = x >= actorBox[0] && x <= actorBox[2] && yy >= actorBox[1] && yy <= actorBox[3];
      if (inside && isSkin(r, g, b)) { skin[0] += r; skin[1] += g; skin[2] += b; skin[3]++; } else if (!inside && y > 40 && y < 230) { room[0] += r; room[1] += g; room[2] += b; room[3]++; }
    }
  }
  let dE = null;
  if (skin[3] > n * 0.002 && room[3] > n * 0.05) { const a = rgb2lab(skin[0] / skin[3], skin[1] / skin[3], skin[2] / skin[3]), b = rgb2lab(room[0] / room[3], room[1] / room[3], room[2] / room[3]); dE = r3(Math.hypot(a[1] - b[1], a[2] - b[2])); }
  return { clipHi: r3(hi / n), clipLo: r3(lo / n), sat: r3(sat / n), dE };
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
