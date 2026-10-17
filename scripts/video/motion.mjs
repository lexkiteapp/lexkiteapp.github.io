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
export function captionPages(words, { style = 'pop-box', maxWords = 3, maxChars = 16, lead = 0.04 } = {}) {
  const mw = style === 'mega-word' ? 1 : style === 'karaoke-bar' ? 6 : maxWords, mc = style === 'karaoke-bar' ? 30 : maxChars;
  const pages = [];
  const byLine = {}; for (const w of words) (byLine[w.line] = byLine[w.line] || []).push(w);
  for (const ws of Object.values(byLine)) {
    let cur = [];
    const flush = () => { if (cur.length) pages.push({ line: cur[0].line, words: cur }); cur = []; };
    for (const w of ws) {
      const len = cur.reduce((a, x) => a + x.w.length + 1, 0) + w.w.length;
      if (cur.length && (cur.length >= mw || len > mc)) flush();
      cur.push(w); if (/[.,!?;:]["”']?$/.test(w.w)) flush();
    }
    flush();
  }
  return pages.map((p, i) => {
    const nx = pages[i + 1], lastEnd = p.words[p.words.length - 1].end;
    const end = nx && nx.line === p.line ? nx.words[0].start - lead : lastEnd + 0.25;
    return { line: p.line, start: r3(p.words[0].start - lead), end: r3(nx && nx.line === p.line ? end : Math.max(end, lastEnd)), words: p.words.map(w => ({ w: w.w, key: !!w.key, pop: r3(w.start - lead), start: w.start, end: w.end })) };
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
export function captionY(shot, capY, h = 1920, half = 95) {
  const heads = ((shot && shot.actors) || []).map(a => [a.y - a.h * 1.08, a.y - a.h * 0.68]);
  const hit = y => heads.some(([t, b]) => y * h + half > t && y * h - half < b);
  if (!hit(capY)) return capY;
  const maxY = (h - SAFE.bottom - half) / h, c = [0.74, 0.7, 0.78, 0.5, 0.45, 0.4].filter(y => y <= maxY).find(y => !hit(y));
  return c != null ? c : Math.min(maxY, 0.74);
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
    let actors = sh.framing === 'card' ? [] : (sl.actors || []).map(a => { const as = assets.actorOf ? assets.actorOf(a, li) : null; return as ? { who: a.who, role: a.role, x: a.x, y: a.y, h: a.h, flip: !!a.flip, ...as } : null; }).filter(Boolean);
    if (!room && actors.length) actors = studioStage(actors, w, h); // nền studio: không có sàn phòng → dàn lại cỡ vừa khung (không phóng quá to/cắt mép)
    const line = lines[li] || {};
    return {
      k, start: sh.start, end: sh.end, line: sh.line, framing: sh.framing, grade, room: room ? room.src : null,
      actors, kit: line.who === 'kit' && sh.framing !== 'card' ? (assets.kit && (assets.kit[line.emotion === 'right' ? 'win' : line.beat === 'tip' ? 'think' : 'happy'] || assets.kit.happy)) || null : null,
      shake: line.emotion === 'wrong' && sh.start === line.start, punch: k === 0 || (!!line.punch && sh.start === line.start),
    };
  });
  // Phụ đề không che mặt: trang nào rơi vào dải đầu nhân vật (theo cảnh lúc trang hiện, nới 15% cho khung cận) → dời xuống vùng chân/ lên trên đầu
  for (const p of pages) p.y = captionY(S.find(x => p.start >= x.start && p.start < x.end) || S[0], layout.capY, h);
  // Hook 1,5 s đầu: kiểu theo khuôn, chữ = hook kịch bản
  const hk = HOOK_KIT[fmt.hook.pattern] || HOOK_KIT.question;
  const hook = { pattern: fmt.hook.pattern, badge: fmt.hook.badge, text: String(sc.hook || lines[0].text), start: 0, end: r3(Math.min(Math.max(1.6, lines[0].end), 2.4)), sticker: hk.sticker, sfx: hk.sfx, shake: !!hk.shake };
  // Thẻ payoff + nhãn khuôn (DON'T SAY/SAY…) – compare-cards: ❌ ở phần đầu, ✅ ở beat payoff
  const pair = comparePair(sc), cards = [];
  const pay = fmt.payoff || { type: 'compare-cards', beat: 'example' }, pl = lines.find(l => l.beat === pay.beat) || lines[Math.min(lines.length - 1, 2)];
  if (['compare-cards', 'before-after', 'stamp-correct'].includes(pay.type) && pair.wrong) {
    const wl = lines.find(l => l.i < pl.i && (l.beat === 'situation' || l.beat === 'hook')) || lines[0];
    cards.push({ kind: 'dont', style: pay.type, start: r3(Math.max(hook.end - 0.1, wl.start)), end: r3(Math.min(pl.start, wl.end + 1.2)), text: pair.wrong, label: ((fmt.labels || {})[wl.beat] || {}).text || "DON'T SAY" });
  }
  cards.push({ kind: 'do', style: pay.type, start: r3(pl.start), end: r3(Math.min(endStart, pl.end + 0.6)), text: pair.right || (sc.keywords || [])[0] || pl.text, label: ((fmt.labels || {})[pl.beat] || {}).text || (pay.type === 'tip-card' ? 'TIP' : 'SAY') });
  // Nhịp: sự kiện hình = cut + hook + thẻ → chèn ngắt nhịp để khoảng trống ≤ 2,6 s
  const visual = [...cuts.map(c => c.t), hook.end, ...cards.map(c => c.start)];
  const interrupts = patternInterrupts(visual, D, { endStart, lines, seed });
  const shocks = lines.filter(l => l.emotion === 'wrong' && l.start > 1).map(l => l.start);
  const sfx = sfxMap ? placeSfx({ cuts, pages, cards, interrupts, hook, shocks, map: sfxMap, endStart, mode: (v.sfx && v.sfx.id) || 'full' }) : [];
  return {
    w, h, fps, durationInFrames: Math.round(D * fps), duration: D, seed: String(seed), format: fmt.id,
    theme: { ...theme, colors, layout }, grain, hook, pages, cuts, shots: S, cards, interrupts, sfx,
    progress: { start: 0, end: endStart },
    watermark: { from: 1.5, fade: 0.5, until: endStart, x: SAFE.left, y: 236, h: 40, opacity: 0.62 },
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
const isSkin = (r, g, b) => r > 95 && g > 40 && b > 20 && r > g && r > b && r - Math.min(g, b) > 15 && Math.abs(r - g) > 15;
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
