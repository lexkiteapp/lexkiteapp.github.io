// Hàm thuần cho dây chuyền dựng video (scripts/video/render.mjs) – không đụng file/mạng/ffmpeg để test được trên CI (scripts/test/video.mjs).
// Gồm: chia mốc từ (khớp whisper ↔ kịch bản, dự phòng chia đều) · phụ đề karaoke ASS · kế hoạch cắt cảnh · đo QA (LUFS, lệch khẩu hình, nhịp, vùng an toàn, tương phản)
// · CỔNG NHẤT QUÁN bối cảnh – nhân vật – lời thoại (content/video/casting.json + brand/library/manifest.json, docs/VIDEO-PIPELINE.md §8).

// ---------- Từ & mốc thời gian ----------
export const tokens = t => String(t || '').trim().split(/\s+/).filter(Boolean);
export const norm = w => String(w || '').toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '');
const r2 = x => Math.round(x * 100) / 100;

// Chia đều khoảng [start, end] cho các từ, trọng số theo độ dài từ (từ dài đọc lâu hơn)
export function evenTiming(words, start, end) {
  const wt = words.map(w => Math.max(1, norm(w).length) + 1), sum = wt.reduce((a, b) => a + b, 0) || 1;
  let t = start; const span = Math.max(0, end - start);
  return words.map((w, i) => { const d = span * wt[i] / sum, o = { w, start: r2(t), end: r2(t + d) }; t += d; return o; });
}

function lev(a, b) {
  if (Math.abs(a.length - b.length) > 1) return 2;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
const same = (x, y) => !!x && !!y && (x === y || (x.length >= 4 && y.length >= 4 && lev(x, y) <= 1));

// Khớp từ whisper (asr: [{w,start,end}] tính từ đầu câu) về đúng từ của kịch bản bằng LCS.
// Từ khớp lấy mốc whisper; từ hụt nội suy giữa 2 mốc kề. Khớp < 50% → chia đều trong khoảng có tiếng (dự phòng).
export function matchWords(scriptWords, asr, dur) {
  const a = scriptWords.map(norm), b = (asr || []).map(x => norm(x.w));
  if (!a.length) return { words: [], matched: 0, method: 'empty' };
  const n = a.length, m = b.length, L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = same(a[i], b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const pair = new Array(n).fill(-1);
  for (let i = 0, j = 0; i < n && j < m;) { if (same(a[i], b[j]) && L[i][j] === L[i + 1][j + 1] + 1) { pair[i] = j; i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++; }
  const matched = pair.filter(x => x >= 0).length / n;
  const s0 = m ? asr[0].start : 0, s1 = m ? asr[m - 1].end : dur;
  if (matched < 0.5) return { words: evenTiming(scriptWords, r2(Math.max(0, s0)), r2(Math.min(dur, Math.max(s1, s0 + 0.2)))), matched, method: 'even' };
  const out = scriptWords.map((w, i) => pair[i] >= 0 ? { w, start: r2(asr[pair[i]].start), end: r2(asr[pair[i]].end) } : null);
  for (let i = 0; i < n;) {
    if (out[i]) { i++; continue; }
    let k = i; while (k < n && !out[k]) k++;
    const lo = i ? out[i - 1].end : Math.max(0, s0 - 0.05), hi = k < n ? out[k].start : Math.min(dur, Math.max(s1, lo + 0.15 * (k - i)));
    evenTiming(scriptWords.slice(i, k), lo, Math.max(lo, hi)).forEach((x, q) => { out[i + q] = x; });
    i = k;
  }
  return { words: out, matched, method: 'whisper' };
}

// Đặt các câu nối tiếp trên trục thời gian video: câu i bắt đầu sau câu trước + khoảng nghỉ gap
export function layoutLines(durs, { lead = 0.2, gap = 0.3, gaps = null } = {}) {
  let t = lead; return durs.map((d, i) => { const o = { start: r2(t), end: r2(t + d) }; t += d + (gaps && gaps[i] != null ? gaps[i] : gap); return o; });
}
// Nhịp cho người học (video-calm 18/10, chuẩn phim): nghỉ tự nhiên giữa các câu – đổi người nói 0,42 s, cùng người 0,25 s, trước câu "đắt"
// (punch / đáp án) 0,6 s. gaps[i] = khoảng nghỉ SAU câu i.
export const PAUSE = { speaker: 0.42, same: 0.25, key: 0.6 };
export const lineGaps = lines => lines.map((l, i) => { const n = lines[i + 1]; if (!n) return 0; if (n.punch || ['reveal', 'answer', 'payoff'].includes(n.beat)) return PAUSE.key; return n.who === l.who ? PAUSE.same : PAUSE.speaker; });

// ---------- Phụ đề karaoke ASS ----------
export const BRAND = { orange: '#E5502F', teal: '#0F3D3E', yellow: '#FFC94A', cream: '#FFF7EA', white: '#FFFFFF', ink: '#14100E', green: '#2FBF71' };
export const assColor = (hex, a = 0) => { const h = hex.replace('#', ''); return `&H${a.toString(16).padStart(2, '0').toUpperCase()}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}`.toUpperCase(); };
export const assTime = x => { const cs = Math.max(0, Math.round(x * 100)), hh = Math.floor(cs / 360000), mm = Math.floor(cs / 6000) % 60, ss = Math.floor(cs / 100) % 60; return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(cs % 100).padStart(2, '0')}`; };
export const assEsc = t => String(t).replace(/[{}\\]/g, '').replace(/\s+/g, ' ').trim();

// Thông số phụ đề theo khổ (dùng chung cho dựng + đo vùng an toàn)
export function subsLayout(w, h, format = 'short') {
  return { fs: Math.round(h * (format === 'lesson' ? 0.05 : 0.036)), mv: Math.round(h * (format === 'lesson' ? 0.08 : 0.2)), ml: Math.round(w * 0.075), hookFs: Math.round(h * (format === 'lesson' ? 0.07 : 0.05)), hookMv: Math.round(h * 0.12) };
}

// lines: [{who,text,start,end}] · words: [{line,w,start,end}] · Mỗi từ = 1 sự kiện (cả câu, từ đang đọc tô cam, từ khóa vàng) → "từ hiện tại màu cam".
// Hook (chữ to vùng trên) trong ≤ 2 s đầu, 6 kiểu (HOOK_STYLES) · nhãn khuôn theo beat (labels [{start,end,text,color}]) · thẻ CTA lexkite.com ở cuối
// (cta {start,end}; ctaText=false khi end card đã in sẵn chữ).
export const HOOK_STYLES = ['bold-top', 'teal-box', 'yellow-pop', 'stamp', 'two-tone', 'type-on'];
export function hookText(hook, style, dur, C) {
  const t = assEsc(hook).toUpperCase(), ws = t.split(' ');
  switch (style) {
    case 'teal-box': return `{\\fad(120,200)\\3c${C('teal')}\\4c${C('teal')}}${t}`;
    case 'yellow-pop': return `{\\fad(80,200)\\1c${C('yellow')}\\fscx40\\fscy40\\t(0,220,\\fscx100\\fscy100)}${t}`;
    case 'stamp': return `{\\fad(60,200)\\frz-6\\1c${C('orange')}\\3c${C('ink')}\\bord11\\fscx130\\fscy130\\t(0,160,\\fscx100\\fscy100)}${t}`;
    case 'two-tone': { const k = Math.ceil(ws.length / 2); return `{\\fad(120,200)}${ws.slice(0, k).join(' ')}\\N{\\1c${C('orange')}\\fscx115\\fscy115}${ws.slice(k).join(' ')}`; }
    case 'type-on': { const cs = Math.max(8, Math.round(Math.min(1.2, dur * 0.6) * 100 / ws.length)); return `{\\2a&HFF&\\fad(0,200)}` + ws.map(x => `{\\k${cs}}${x}`).join(' '); }
    default: return `{\\fad(120,200)}${t}`;
  }
}
const LABEL_TXT = { orange: 'ink', yellow: 'ink', green: 'ink', teal: 'white' }; // màu chữ nhãn đủ tương phản ≥ 4.5 với nền nhãn
export function buildAss({ w, h, format = 'short', lines, words, keywords = [], hook = '', cta = null, hookStyle = 'bold-top', labels = [], ctaText = true }) {
  const L = subsLayout(w, h, format), C = k => assColor(BRAND[k]);
  const kw = new Set(keywords.flatMap(k => tokens(k).map(norm)));
  const head = `[Script Info]\nScriptType: v4.00+\nPlayResX: ${w}\nPlayResY: ${h}\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n`
    + `Style: K,DejaVu Sans,${L.fs},${C('white')},${C('white')},${C('ink')},&H80000000,1,0,0,0,100,100,0,0,1,6,2,2,${L.ml},${L.ml},${L.mv},1\n`
    + `Style: Hook,DejaVu Sans,${L.hookFs},${C('white')},${C('white')},${C('teal')},&H80000000,1,0,0,0,100,100,0,0,1,9,3,8,${L.ml},${L.ml},${L.hookMv},1\n`
    + `Style: HookBox,DejaVu Sans,${L.hookFs},${C('white')},${C('white')},${C('teal')},${C('teal')},1,0,0,0,100,100,0,0,3,14,0,8,${L.ml},${L.ml},${L.hookMv},1\n`
    + `Style: Label,DejaVu Sans,${Math.round(L.fs * 0.8)},${C('ink')},${C('ink')},${C('orange')},${C('orange')},1,0,0,0,100,100,2,0,3,12,0,7,${L.ml},${L.ml},${Math.round(L.hookMv + L.hookFs * 2.6)},1\n`
    + `Style: CTA,DejaVu Sans,${Math.round(h * 0.045)},${C('cream')},${C('cream')},${C('ink')},&H00000000,1,0,0,0,100,100,0,0,1,4,0,5,${L.ml},${L.ml},0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;
  const ev = [];
  if (hook && lines.length) { const d = Math.min(2, Math.max(1.2, lines[0].end)); ev.push(`Dialogue: 1,${assTime(0)},${assTime(d)},${hookStyle === 'teal-box' ? 'HookBox' : 'Hook'},HOOK,0,0,0,,${hookText(hook, hookStyle, d, C)}`); }
  for (const lb of labels) ev.push(`Dialogue: 1,${assTime(lb.start)},${assTime(lb.end)},Label,LABEL,0,0,0,,{\\fad(100,100)\\1c${C(LABEL_TXT[lb.color] || 'white')}\\3c${C(lb.color in BRAND ? lb.color : 'teal')}\\4c${C(lb.color in BRAND ? lb.color : 'teal')}}${assEsc(lb.text)}`);
  lines.forEach((l, i) => {
    const lw = words.filter(x => x.line === i);
    lw.forEach((x, k) => {
      const t0 = k ? x.start : l.start, t1 = k < lw.length - 1 ? lw[k + 1].start : l.end + 0.25;
      if (t1 <= t0) return;
      const txt = lw.map((y, q) => { const e = assEsc(y.w); return q === k ? `{\\1c${C('orange')}}${e}{\\1c${C('white')}}` : kw.has(norm(y.w)) ? `{\\1c${C('yellow')}}${e}{\\1c${C('white')}}` : e; }).join(' ');
      ev.push(`Dialogue: 0,${assTime(t0)},${assTime(t1)},K,L${i},0,0,0,,${txt}`);
    });
  });
  if (cta && ctaText) ev.push(`Dialogue: 2,${assTime(cta.start)},${assTime(cta.end)},CTA,CTA,0,0,0,,{\\fad(200,0)}Practice free\\N{\\fs${Math.round(h * 0.06)}\\1c${C('yellow')}}lexkite.com`);
  return head + ev.join('\n') + '\n';
}

// Chữ của từng câu đọc lại từ ASS (bỏ thẻ) → để so khớp 100% với kịch bản
export function assLineTexts(ass) {
  const m = new Map();
  for (const l of String(ass).split('\n')) {
    if (!l.startsWith('Dialogue:')) continue;
    const f = l.slice(9).split(','), name = (f[4] || '').trim(); if (!/^L\d+$/.test(name)) continue;
    const t = f.slice(9).join(',').replace(/\{[^}]*\}/g, '').replace(/\s+/g, ' ').trim(), i = +name.slice(1);
    if (!m.has(i)) m.set(i, new Set()); m.get(i).add(t);
  }
  return m;
}
export function subsExact(ass, lines) {
  const m = assLineTexts(ass), bad = [];
  lines.forEach((l, i) => { const s = m.get(i); if (!s || s.size !== 1 || [...s][0] !== assEsc(l.text)) bad.push(i); });
  return { ok: !bad.length, bad };
}
// Vùng an toàn: khối phụ đề nằm trong 1/3 dưới nhưng tránh dải giao diện nền tảng (đáy 18%), lề ngang ≥ 6%
export function subsSafeArea({ w, h, format = 'short', maxChars = 40 }) {
  const L = subsLayout(w, h, format), perRow = Math.max(8, Math.floor((w - 2 * L.ml) / (L.fs * 0.6))), rows = Math.max(1, Math.ceil(maxChars / perRow));
  const bottom = h - L.mv, top = bottom - rows * L.fs * 1.25;
  const lo = format === 'lesson' ? 0.6 : 0.55, hi = format === 'lesson' ? 0.95 : 0.82;
  return { ok: top >= h * lo && bottom <= h * hi && L.ml >= w * 0.06, top: Math.round(top), bottom, rows };
}
// Tương phản WCAG giữa 2 màu hex
export function contrast(a, b) {
  const lum = hex => { const c = hex.replace('#', '').match(/../g).map(x => { const v = parseInt(x, 16) / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return Math.round((x + 0.05) / (y + 0.05) * 100) / 100;
}

// ---------- Cổng tĩnh dùng chung (render.mjs bước qa + scripts/video/template.mjs lint trước khi dựng) ----------
// Giọng Kokoro chậm cho người học: đo CI 18/10 – Kokoro đọc ~17 ký tự/s ở tốc độ 1 (~15,5 ở 0,9 → phụ đề 15–27 ký tự/s, trượt cổng)
// → TTS_SPEED 0,82 (~14 ký tự/s tiếng, phụ đề ≤ 13 nhờ hiện sớm/ở lại); câu dày chữ chậm tới 0,74 (lineSpeed); bước tts đo lại và đọc chậm hơn nếu vẫn nhanh.
export const TTS_SPEED = 0.82, KOKORO_CPS = 17.2, SPEECH_CPS = 13.6;
export const WPS = +(2.6 * TTS_SPEED).toFixed(3), LINE_GAP = 0.3, LEAD = 0.2, END_CARD = 2.2, HOOK_MAX = +(2.05 / TTS_SPEED).toFixed(2);
export const CAST = ['mia', 'leo', 'ama', 'kit', 'diane', 'carlos'];
export const COMPETITORS = /\b(duolingo|babbel|busuu|memrise|rosetta\s*stone|cambly|preply|italki|elsa\s*speak|quizlet|cake\s*app|lingoda|mondly|praktika)\b/i;
// Thời lượng ước tính 1 câu khi chưa có giọng (đúng công thức bước tts khi thiếu Kokoro)
// Câu nhiều chữ dài (≈ > 12,5 ký tự/s ở tốc độ chuẩn) → đọc chậm thêm (≥ 0,8) để phụ đề ≤ 13 ký tự/s – sửa bằng NHỊP, không rút giờ hiện chữ
export const lineSpeed = t => +(String(t).length > 50 ? TTS_SPEED * 0.95 : TTS_SPEED).toFixed(3); // câu dài (> 50 ký tự): chậm thêm 5 %
export const estLineSec = t => +(String(t).length / (KOKORO_CPS * lineSpeed(t)) + 0.35).toFixed(2);
// Tổng thời lượng ước tính (đúng bố cục align: lead + câu + nghỉ + 0,4 s + end card)
export const estVideoSec = lines => +(LEAD + lines.reduce((a, l) => a + estLineSec(l.text), 0) + lineGaps(lines).reduce((a, g) => a + g, 0) + 0.4 + END_CARD).toFixed(2);
// Đếm âm tiết (heuristic tiếng Anh) – để ước lượng câu hook: Kokoro đọc ~4 âm tiết/s; số → ~1,5 âm tiết/chữ số
export function syllables(w) {
  const s = norm(w).replace(/'/g, ''); if (!s) return 0;
  if (/^\d+$/.test(s)) return Math.ceil(s.length * 1.5);
  if (s.length <= 3) return 1;
  const m = s.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, '').replace(/^y/, '').match(/[aeiouy]{1,2}/g);
  return Math.max(1, m ? m.length : 1);
}
// Câu hook đọc mất bao lâu (s): 0,45 s khởi + 0,24 s/âm tiết + 0,12 s/quãng ngắt giữa câu (, ; : – … ? !). Hiệu chỉnh theo log video-sample 17/10
// (hook 5–6 âm tiết đo 1,8–1,9 s; sai số ±0,4 s theo giọng) → cổng render (đo thật) vẫn là chuẩn, đây là cổng sớm.
export function hookEstSec(t) {
  const s = String(t || '').trim(), syl = tokens(s).reduce((a, w) => a + syllables(w), 0);
  const pauses = (s.replace(/[\s"”“'’.!?…]+$/, '').match(/[,;:–—…?!]|\.\.\./g) || []).length;
  return +((0.45 + 0.24 * syl + 0.12 * pauses) / TTS_SPEED).toFixed(2);
}
// Cổng brand (render qa): không nhãn hiệu đối thủ ở tiêu đề/caption/lời thoại + chỉ dàn nhân vật Lexkite
export function brandGate(sc) {
  const allText = [sc.title, sc.caption, ...(sc.lines || []).map(l => l.text)].join(' ');
  const bad = (sc.lines || []).filter(l => !CAST.includes(l.who)).map(l => l.who);
  const m = allText.match(COMPETITORS);
  return { ok: !m && !bad.length, note: m ? `nhắc nhãn hiệu đối thủ "${m[0]}"` : bad.length ? `nhân vật lạ: ${[...new Set(bad)].join(', ')}` : 'không nhãn hiệu đối thủ, đúng dàn nhân vật' };
}
// Cổng CTA (render qa): có câu beat cta nhắc lexkite + link về https://lexkite.com/
export const ctaGate = sc => { const ok = (sc.lines || []).some(l => l.beat === 'cta' && /lexkite/i.test(l.text)) && /^https:\/\/lexkite\.com\//.test(sc.link || 'https://lexkite.com/'); return { ok, note: ok ? 'CTA về lexkite.com + thẻ cuối' : 'thiếu CTA lexkite' }; };

// ---------- Đo QA (MEDIA-QA-RUBRIC mục C) ----------
// Đọc tổng kết ffmpeg ebur128 (stderr) → độ to tích hợp I (LUFS); không có tiếng → -Infinity
export function parseEbur128(txt) {
  const all = [...String(txt).matchAll(/I:\s+(-?[\d.]+|-inf)\s+LUFS/g)]; if (!all.length) return null;
  const v = all[all.length - 1][1]; return v === '-inf' ? -Infinity : +v;
}
export const audioScore = lufs => (lufs == null || !isFinite(lufs) ? 0 : Math.abs(lufs + 16) <= 1 ? 10 : Math.abs(lufs + 16) <= 2 ? 5 : 0);
export const hookScore = sec => (sec <= 2.05 ? 15 : sec <= 3 ? 10 : 5);

// Lệch khẩu hình ước lượng: đầu mỗi cụm từ (sau quãng nghỉ) so với lúc miệng mở (khẩu hình rời X) gần nhất → trung vị |lệch| (ms)
export function lipsyncOffset(words, visemes) {
  if (!Array.isArray(visemes) || !visemes.length || !words.length) return null;
  const onsets = [];
  visemes.forEach((c, k) => { const p = visemes[k - 1]; if (c.v !== 'X' && (!p || p.v === 'X' || p.line !== c.line || c.start - p.end > 0.05)) onsets.push(c.start); });
  const ds = [];
  words.forEach((w, i) => {
    const p = words[i - 1]; if (p && p.line === w.line && w.start - p.end <= 0.12) return;
    let best = null; for (const o of onsets) { const d = o - w.start; if (Math.abs(d) <= 0.4 && (best == null || Math.abs(d) < Math.abs(best))) best = d; }
    if (best != null) ds.push(Math.abs(best));
  });
  if (!ds.length) return null;
  ds.sort((a, b) => a - b); return Math.round(ds[Math.floor(ds.length / 2)] * 1000);
}
export const lipsyncScore = ms => (ms == null ? 0 : ms < 80 ? 15 : ms < 120 ? 8 : 0);

// Kế hoạch cắt cảnh: mỗi câu 1 cảnh (góc máy l.camera: push|pan|close|split|dolly|wide), câu dài > 3,5 s chia nhỏ (rộng ↔ cận người nói);
// không có góc máy → câu "đắt" (punch/hook/tip) đẩy máy vào; cuối = thẻ CTA
export function planShots(lines, { endStart, duration, maxLen = 3.5 }) {
  const shots = [];
  lines.forEach((l, i) => {
    const a = i ? l.start : 0, b = i < lines.length - 1 ? lines[i + 1].start : endStart, len = b - a;
    const k = Math.max(1, Math.ceil(len / maxLen - 1e-9)), d = len / k, punch = !!l.punch || ['hook', 'tip'].includes(l.beat);
    for (let j = 0; j < k; j++) shots.push({ line: i, start: r2(a + j * d), end: r2(j === k - 1 ? b : a + (j + 1) * d), framing: j === 0 ? (l.camera || (punch ? 'push' : 'wide')) : (j % 2 ? 'close' : 'wide'), transitionIn: j === 0 && !!l.transitionIn });
  });
  if (duration > endStart) shots.push({ line: -1, start: r2(endStart), end: r2(duration), framing: 'card', transitionIn: true });
  return shots;
}
// Kế hoạch máy "calm" (video-calm 18/10 – dựng kiểu kênh giáo dục cao cấp): CHỈ cắt ở ranh giới câu (không bao giờ giữa câu), ưu tiên khi đổi người
// nói; cảnh ≥ SHOT.min (gộp câu ngắn vào 1 cảnh), ≤ ~3 cắt / 10 s. Khung theo người nói: trao đổi qua lại / Kit / hook = trung cảnh đôi (two);
// 1 người giải thích dài (≥ SHOT.solo) = trung cảnh đơn người đó (single). Không cận, không toàn cảnh (đổi bối cảnh = cắt mềm, motion.pickTransitions).
// 2 cảnh liền cùng khung + cùng người (jump cut) → đổi khung cảnh sau. lines[i]: {start,end,beat,who,listener,transitionIn,sceneChange}
export const SHOT = { min: 2.5, max: 7.5, solo: 3, cutsPer10: 3 };
export const ESTABLISH = 0; // (round 3) – không còn cảnh thiết lập toàn cảnh
export function planFilmShots(lines, { endStart, duration } = {}) {
  const G = [];
  lines.forEach((l, i) => {
    const a = i ? l.start : 0, b = i < lines.length - 1 ? lines[i + 1].start : endStart, g = G[G.length - 1];
    const prevWho = g ? lines[g.lines[g.lines.length - 1]].who : null;
    const cut = !g || (i > 0 && l.sceneChange) || (g.end - g.start >= SHOT.min && (l.who !== prevWho || b - g.start > SHOT.max));
    if (cut) G.push({ start: a, end: b, lines: [i] }); else { g.end = b; g.lines.push(i); }
  });
  // cảnh cuối ngắn → gộp vào cảnh trước (không đổi bối cảnh)
  for (let k = G.length - 1; k > 0; k--) if (G[k].end - G[k].start < SHOT.min && !lines[G[k].lines[0]].sceneChange) { G[k - 1].end = G[k].end; G[k - 1].lines.push(...G[k].lines); G.splice(k, 1); }
  // mật độ cắt ≤ SHOT.cutsPer10: gộp cặp cảnh liền kề ngắn nhất (≤ SHOT.max, không qua ranh đổi bối cảnh) tới khi đạt
  const span = (G.length ? G[G.length - 1].end - G[0].start : 0) || 1;
  while (G.length > 1 && (G.length - 1) / span * 10 > SHOT.cutsPer10) {
    let best = -1; for (let k = 1; k < G.length; k++) { if (lines[G[k].lines[0]].sceneChange) continue; const len = G[k].end - G[k - 1].start; if (best < 0 || len < G[best].end - G[best - 1].start) best = k; }
    if (best < 0) break; G[best - 1].end = G[best].end; G[best - 1].lines.push(...G[best].lines); G.splice(best, 1);
  }
  const shots = G.map((g, k) => {
    const hum = g.lines.map(i => lines[i].who).filter(w => w && w !== 'kit'), who = [...new Set(hum)];
    const time = w => g.lines.filter(i => lines[i].who === w).reduce((s, i) => s + (lines[i].end - lines[i].start), 0);
    const main = who.sort((x, y) => time(y) - time(x))[0] || null, kit = g.lines.some(i => lines[i].who === 'kit');
    const single = k > 0 && !kit && who.length === 1 && g.end - g.start >= SHOT.solo;
    return { line: g.lines[0], ...(g.lines.length > 1 ? { lines: g.lines } : {}), start: r2(g.start), end: r2(g.end), framing: single ? 'single' : 'two', focus: single ? main : null, speaker: main, transitionIn: !!lines[g.lines[0]].transitionIn, sceneChange: k > 0 && !!lines[g.lines[0]].sceneChange };
  });
  for (let k = 1; k < shots.length; k++) { const x = shots[k - 1], y = shots[k];
    if (x.framing !== y.framing || x.focus !== y.focus) continue;
    const kitIn = g => (g.lines || [g.line]).some(i => (lines[i] || {}).who === 'kit');
    if (y.framing === 'single') { y.framing = 'two'; y.focus = null; }
    else if (x.speaker && !kitIn(x) && k > 1) { x.framing = 'single'; x.focus = x.speaker; }
    else if (y.speaker) { y.framing = 'single'; y.focus = y.speaker; } }
  if (shots.length) shots[shots.length - 1].end = r2(endStart);
  if (duration > endStart) shots.push({ line: -1, start: r2(endStart), end: r2(duration), framing: 'card', transitionIn: true });
  return shots;
}
// Nhịp dựng: cảnh 0,7–4 s (thẻ CTA cuối không tính), mỗi vi phạm −3 điểm
// Nhịp dựng (calm): cảnh 2–8 s (thẻ CTA cuối không tính; ranh giới câu nên có thể < SHOT.min khi đổi bối cảnh), ≤ 3 cắt / 10 s; mỗi vi phạm −3 điểm
export function pacingScore(shots) {
  const body = shots.filter(s => s.framing !== 'card'), bad = body.filter(s => s.end - s.start > 8.05 || s.end - s.start < 1.95);
  const lens = body.map(s => s.end - s.start), span = body.length ? body[body.length - 1].end - body[0].start : 0, cuts = Math.max(0, body.length - 1);
  const dense = span > 0 && cuts / span * 10 > SHOT.cutsPer10 + 1e-9 ? 1 : 0;
  return { score: Math.max(0, 10 - 3 * (bad.length + dense)), bad: bad.length + dense, avg: lens.length ? r2(lens.reduce((a, b) => a + b, 0) / lens.length) : 0, max: lens.length ? r2(Math.max(...lens)) : 0, min: lens.length ? r2(Math.min(...lens)) : 0, cutsPer10: span ? r2(cuts / span * 10) : 0 };
}

// ---------- CỔNG NHẤT QUÁN bối cảnh – nhân vật – lời thoại ----------
// Cảm xúc câu → nhóm clip hợp lệ (yêu cầu anh chủ: hỏi → ask/think, sai → shock/facepalm, đúng → thumbs/laugh, giải thích → talk/point)
// Thẻ clip phông xanh 17/10: <who>_talk_gesture (nói + vung tay) · wave_clasp (vẫy + chắp tay) · think_aha · shock_laugh · listen_thumbs (nghe)
export const EMOTION_TAGS = { ask: ['ask', 'think'], wrong: ['shock', 'facepalm', 'headgrab'], right: ['thumbs', 'laugh'], explain: ['talk', 'point', 'gesture'], cta: ['wave', 'thumbs', 'talk'], talk: ['talk', 'point', 'ask', 'gesture'] };
export const LISTENER_TAGS = ['idle', 'nod', 'listen'];
// Clip người nói = có cử động miệng: cờ mouth (manifest dựng) hoặc vai "speaker" trong kho (library.json roles); người nghe = thẻ idle/nod/listen hoặc vai "listener"
export const isSpeakerClip = c => !!c && (c.mouth === true || (c.mouth == null && (c.roles || []).includes('speaker')));
export const isListenerClip = c => !!c && !isSpeakerClip(c) && ((c.tags || []).some(t => LISTENER_TAGS.includes(t)) || (c.roles || []).includes('listener')); // clip nói (vd. ¾ talk_nod) không dùng làm vai nghe
const RX = {
  wrong: /\b(wrong|mistake|incorrect|error|don'?t say|never say|stop saying|oops|wait)\b/i,
  right: /\b(right|correct|perfect|exactly|great|nice|got it|that's it|yes)\b/i,
};
const EXPR = [['wrong', /shock|surpris|frozen|awkward|jaw|hands on head|facepalm/i], ['ask', /think|confus|tilt|wonder/i], ['right', /laugh|proud|excited|happy|smile|thumbs|clap/i]];
// Lời đề nghị lịch sự ("Could I get a latte, please?") là NÓI với người kia (clip talk), không phải câu hỏi phân vân (clip ask/think)
const REQUEST = /\b(could|can|may)\s+(i|we)\s+(get|have|order)\b[^?]*\bplease\b/i;
export const textEmotion = t => (RX.wrong.test(t) ? 'wrong' : REQUEST.test(t) ? null : /\?\s*$/.test(String(t).trim()) ? 'ask' : RX.right.test(t) ? 'right' : null);
export const exprEmotion = e => { for (const [k, rx] of EXPR) if (rx.test(String(e || ''))) return k; return null; };
export function lineEmotion(l) {
  if (l.beat === 'cta') return 'cta';
  const t = textEmotion(l.text); if (t) return t;
  if (['explain', 'example', 'tip'].includes(l.beat)) return 'explain'; // phần giảng giải: nói + chỉ tay, biểu cảm chỉ là sắc thái
  return exprEmotion([l.expr, l.gesture].join(' ')) || (l.beat === 'situation' ? 'explain' : 'talk');
}
// Biểu cảm ghi trong kịch bản trái nghĩa với câu → lỗi. Chỉ chặn MÂU THUẪN THẬT:
//  · câu "sai" (That's wrong!) mà cười lớn/vui · câu buồn/giận (sorry, unfortunately, annoyed…) mà mặt cười · câu "đúng/khen" mà mặt buồn/giận/sốc.
//  Câu hỏi hợp với mọi sắc thái trung tính–vui (hỏi thân thiện kèm nụ cười: "What can I get for you?" + happy smile) → KHÔNG lỗi.
const COMPAT = { wrong: ['wrong', 'ask'], ask: ['ask', 'wrong', 'right'], right: ['right'] };
const MOOD = { sad: /\b(sorry|sad|unfortunately|terrible|awful|disappointed|heartbroken|i miss)\b/i, angry: /\b(angry|annoyed|unacceptable|ridiculous|furious|how dare|so rude)\b/i };
const EXPR_NEG = /\b(sad|cry|crying|tears?|upset|frown\w*|angry|furious|mad|annoyed|glar\w*|disappointed|grumpy)\b/i;
export function exprConflict(l) {
  if (l.beat === 'cta') return null;
  const t = textEmotion(l.text), e = exprEmotion(l.expr), mood = Object.keys(MOOD).find(k => MOOD[k].test(String(l.text || '')));
  if (mood && e === 'right') return `câu mang ý "${mood}" nhưng biểu cảm "${l.expr}" lại vui/cười`;
  if (EXPR_NEG.test(String(l.expr || '')) && t === 'right') return `câu mang ý "right" nhưng biểu cảm "${l.expr}" buồn/giận`;
  return t && e && !(COMPAT[t] || [t]).includes(e) ? `câu mang ý "${t}" nhưng biểu cảm "${l.expr}" mang ý "${e}"` : null;
}

// Chủ đề kịch bản → bối cảnh + dàn được phép (casting.topics theo thứ tự, khớp từ khóa trong topic/title)
export function resolveTopic(job, casting) {
  const hay = [job.topic, job.script && job.script.title].join(' ').toLowerCase();
  const has = k => new RegExp(`(^|[^a-z0-9])${String(k).toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(hay); // khớp trọn từ ("exam" ≠ "example")
  return (casting.topics || []).find(t => (t.match || []).some(has)) || casting.fallback;
}
export function scaleAt(room, y) {
  const s = room.scaleAt; if (!s) return 1150;
  const t = (y - s.yFar) / ((s.yNear - s.yFar) || 1); return Math.round(s.hFar + (s.hNear - s.hFar) * t);
}
export const DEFAULT_ROOM = { floor: { yNear: 1900, yFar: 1560 }, stand: [{ x: 300, y: 1760 }, { x: 540, y: 1740 }, { x: 780, y: 1760 }], scaleAt: { yFar: 1560, hFar: 980, yNear: 1900, hNear: 1240 }, light: { dir: -1, warmth: 0 } };
// Chọn phòng theo tag bối cảnh + giờ (ngày/đêm) – xác định (sắp theo id), KHÔNG ngẫu nhiên; không có file → phòng ảo (nền màu thương hiệu)
export function pickRoom(manifest, tag, time, exists = () => true) {
  const c = (manifest.rooms || []).filter(r => r.tag === tag && (r.time || 'day') === time && exists(r.file)).sort((a, b) => a.id.localeCompare(b.id))[0];
  return c ? { ...DEFAULT_ROOM, ...c } : { ...DEFAULT_ROOM, id: `virtual-${tag}-${time}`, tag, time, virtual: true };
}
// Dàn cảnh hội thoại (round 2, 17/10): 2 người trên TRỤC HỘI THOẠI 36 % / 64 % bề ngang (1 người 50 %, 3 người 25/50/75 %),
// chân trên hàng điểm đứng của hồ sơ sàn (y của stand), cao = scaleAt(y). Nhân viên (barista/phục vụ/quầy) đứng SAU QUẦY khi phòng có
// room.counter {x0,x1,top,base,standY} và cỡ người ở đó đủ lớn để quay cận trung (h ≥ counter.minH | 600 px) – không thì đứng đôi giữa sàn.
// Không bao giờ để người sát mép: thân (±0,3 h) cách mép ≥ 40 px.
export const STAFF_ROLE = /barista|server|waiter|staff|clerk|agent|receptionist|cashier/i;
export function stageDialogue(cast, room, { roles = {}, W = 1080, axis = null } = {}) {
  const n = cast.length, out = {}; if (!n) return out;
  const xs = axis || (n === 1 ? [0.5] : n === 2 ? [0.36, 0.64] : cast.map((_, j) => 0.25 + 0.5 * j / (n - 1)));
  const st = room.stand && room.stand.length ? room.stand : DEFAULT_ROOM.stand;
  const ys = st.map(p => p.y).sort((a, b) => a - b), y0 = ys[Math.floor(ys.length / 2)];
  const sx = st.map(p => p.x), lo = Math.min(...sx) - 80, hi = Math.max(...sx) + 80;
  const ct = room.counter, staff = cast.find(w => STAFF_ROLE.test(roles[w] || ''));
  const counterOk = !!(ct && staff && scaleAt(room, ct.standY) >= (ct.minH || 600));
  // nhân viên luôn ở phía quầy (trong khoảng x của quầy); khách đứng trước quầy
  const order = counterOk ? [...cast].sort((a, b) => (a === staff) - (b === staff) || cast.indexOf(a) - cast.indexOf(b)) : cast;
  order.forEach((who, j) => {
    const behind = counterOk && who === staff;
    const y = behind ? ct.standY : counterOk ? Math.max(y0, ct.base + 20) : y0, h = scaleAt(room, y), half = 0.24 * h + 40;
    let x = Math.round(xs[j] * W);
    if (behind) x = Math.min(Math.max(x, ct.x0 + half), ct.x1 - half);
    x = Math.round(Math.min(Math.max(x, Math.max(lo, half)), Math.min(hi, W - half)));
    out[who] = { x, y, h, ...(behind ? { behind: 'counter' } : {}) };
  });
  return out;
}
// (cũ) Điểm đứng: rải đều các điểm stand (trái → phải) theo thứ tự xuất hiện
export function assignStands(cast, room) {
  const st = [...room.stand].sort((a, b) => a.x - b.x), S = st.length, n = cast.length, out = {};
  cast.forEach((who, j) => { const p = st[n === 1 ? Math.floor((S - 1) / 2) : Math.round(j * (S - 1) / Math.max(1, n - 1))]; out[who] = { x: p.x, y: p.y, h: scaleAt(room, p.y) }; });
  return out;
}
// Chọn clip/ảnh cho 1 nhân vật: người nói → clip có cử động miệng (mouth) + đúng cảm xúc; người nghe → idle/nod. Cùng trang phục (outfit).
// Hướng: clip có facing front|left|right; lật gương (scaleX −1) CHỈ khi clip ghi mirrorOk:true (nhân vật có chi tiết nhận diện lệch một bên –
// kẹp tóc Mia, lọn bạc Diane, thẻ đeo – không được lật). want = hướng cần nhìn → ưu tiên clip ¾ đúng hướng, rồi ¾ lật được (mirrorOk), rồi chính diện.
// Hướng theo đoạn: Kling không luôn giữ hướng suốt clip → facingSegments [{from,to,facing}] (giây); chỉ đoạn đó mang hướng ¾,
// phần còn lại coi là chính diện/không rõ. faceOf(c, want) → { facing, seg } của đoạn hợp nhất (seg = null: cả clip).
export function faceOf(c, want) {
  const segs = (c.facingSegments || []).filter(x => x.to - x.from >= 0.8);
  if (!segs.length || !want || want === 'front') return { facing: c.facing || 'front', seg: null };
  const rank = f => (!want || want === 'front' || f === want ? 0 : c.mirrorOk && f !== 'front' ? 1 : f === 'front' ? 2 : 3);
  const best = segs.map(x => ({ x, r: rank(x.facing) })).sort((a, b) => a.r - b.r || (b.x.to - b.x.from) - (a.x.to - a.x.from))[0];
  return best.r <= rank(c.facing || 'front') ? { facing: best.x.facing, seg: { from: best.x.from, to: best.x.to } } : { facing: c.facing || 'front', seg: null };
}
export const faceRank0 = (c, want) => { const f = c.facing || 'front'; return !want || want === 'front' || f === want ? 0 : c.mirrorOk && f !== 'front' ? 1 : f === 'front' ? 2 : 3; }; // ¾ lật được hơn chính diện
export const faceRank = (c, want) => faceRank0({ ...c, facing: faceOf(c, want).facing }, want);
export function pickAsset(manifest, who, { speaking, emotion, outfit, exists = () => true, used = new Set(), avoid = new Set(), want = null }) {
  const clips = (manifest.clips || []).filter(c => c.who === who && (c.outfit || 'office') === outfit && exists(c.file))
    .map((c, i) => ({ c, i })).sort((a, b) => faceRank(a.c, want) - faceRank(b.c, want) || a.i - b.i).map(x => x.c);
  const hit = (c, tags) => (c.tags || []).some(t => tags.includes(t));
  const asClip = c => c && { kind: 'clip', ...c };
  let c;
  if (speaking) { // thứ tự: đúng cảm xúc → nói chung → bất kỳ clip có miệng; ưu tiên clip chưa dùng trong video và không vừa dùng ở video gần đây
    const sp = clips.filter(isSpeakerClip);
    // trong nhóm hợp cảm xúc: clip ¾ nhìn đúng phía người nghe (hoặc lật được) được ưu tiên hơn clip chính diện khi 2 người nói với nhau
    const byFace = arr => arr.map((c, i) => ({ c, i })).sort((a, b) => faceRank(a.c, want) - faceRank(b.c, want) || a.i - b.i).map(x => x.c);
    const emo = sp.filter(x => hit(x, EMOTION_TAGS[emotion] || [])), tagOrder = x => (EMOTION_TAGS[emotion] || []).findIndex(t => hit(x, [t]));
    const emoSorted = want && want !== 'front' ? byFace(emo.sort((a, b) => tagOrder(a) - tagOrder(b))) : emo.sort((a, b) => tagOrder(a) - tagOrder(b));
    const cands = [...emoSorted, ...byFace(sp.filter(x => hit(x, ['talk', 'gesture']))), ...sp];
    c = cands.find(x => !used.has(x.id) && !avoid.has(x.id)) || cands.find(x => !used.has(x.id)) || cands[0];
  }
  else c = clips.find(x => hit(x, ['idle'])) || clips.find(isListenerClip);
  if (c) { const fo = faceOf(c, want); return asClip({ ...c, mouth: isSpeakerClip(c), facing: fo.facing, seg: fo.seg }); }
  const s = (manifest.stills || []).find(x => x.who === who && (x.outfit || 'office') === outfit && exists(x.file));
  return s ? { kind: 'still', tags: ['idle'], mouth: false, facing: 'front', ...s } : { kind: 'none', who, outfit, tags: [], mouth: false, facing: 'front' };
}
const flipOf = (nat, want, ok = true) => ok && nat !== 'front' && want !== 'front' && nat !== want;

// Dựng "sân khấu" cho cả video: bối cảnh từng câu, phòng, vị trí đứng, clip từng người, hướng nhìn + danh sách lỗi nhất quán.
export function buildStage({ job, casting, manifest, exists = () => true, variant = null, avoidClips = [] }) {
  const sc = job.script, fails = [], F = (k, reason) => fails.push({ k, reason });
  const topic = resolveTopic(job, casting) || { id: 'none', scenes: [], cast: [] };
  // Có biến thể (variants.mjs) → bối cảnh/phòng/giờ theo biến thể; không thì bối cảnh đầu của chủ đề, phòng xác định theo tag
  const base = variant ? variant.setting.scene : sc.scene || topic.scenes[0], time = variant ? variant.setting.time : sc.time === 'night' ? 'night' : 'day';
  const roomFor = tag => { if (variant && tag === variant.setting.scene) { const r = (manifest.rooms || []).find(x => x.id === variant.setting.room && exists(x.file)); if (r) return { ...DEFAULT_ROOM, ...r }; } return pickRoom(manifest, tag, time, exists); };
  const used = new Set(), avoid = new Set(avoidClips);
  if (sc.scene && !topic.scenes.includes(sc.scene)) F('brand', `bối cảnh "${sc.scene}" không hợp chủ đề "${topic.id}" (được: ${topic.scenes.join(', ')})`);
  const sceneOf = i => sc.lines[i].scene || (i ? sceneOf(i - 1) : base);
  const outfitOf = tag => sc.outfit || (casting.scenes[tag] || {}).outfit || 'office';
  // Phân đoạn bối cảnh: đổi phòng chỉ giữa 2 câu và phải có chuyển cảnh rõ ràng (transition)
  const segs = [];
  sc.lines.forEach((l, i) => {
    const tag = sceneOf(i);
    if (!segs.length || segs[segs.length - 1].scene !== tag) {
      if (segs.length && !['fade', 'wipe'].includes(l.transition)) F('pacing', `đổi bối cảnh ${segs[segs.length - 1].scene} → ${tag} ở câu ${i + 1} mà không có chuyển cảnh (transition: fade|wipe)`);
      segs.push({ scene: tag, from: i, to: i, room: roomFor(tag), cast: [] });
    } else segs[segs.length - 1].to = i;
    const g = segs[segs.length - 1], sd = casting.scenes[tag];
    if (!sd) { F('brand', `bối cảnh "${tag}" chưa khai báo trong casting.json`); return; }
    if (!topic.scenes.includes(tag)) F('brand', `câu ${i + 1}: bối cảnh "${tag}" không thuộc chủ đề "${topic.id}"`);
    if (l.who !== 'kit') {
      if (!sd.cast.includes(l.who)) F('brand', `câu ${i + 1}: ${l.who} không thuộc dàn hợp lệ của bối cảnh "${tag}" (${sd.cast.join(', ')})`);
      if (!topic.cast.includes(l.who)) F('brand', `câu ${i + 1}: ${l.who} không thuộc dàn của chủ đề "${topic.id}"`);
      if (!g.cast.includes(l.who)) g.cast.push(l.who);
    }
  });
  // Phòng phải đúng giờ ngày/đêm của kịch bản (liên tục ánh sáng)
  for (const g of segs) {
    if (g.room.time !== time) F('pacing', `phòng ${g.room.id} là ${g.room.time}, kịch bản ${time}`);
    g.pos = stageDialogue(g.cast, g.room, { roles: (casting.scenes[g.scene] || {}).roles || {} });
    for (const who of g.cast) { const p = g.pos[who], f = g.room.floor, H = 1920; // luật §0: chân trên vùng sàn ±1% khung, cao đúng scaleAt ±5%
      if (p.y < f.yFar - 0.01 * H || p.y > f.yNear + 0.01 * H) F('pacing', `${who}: chân (y=${p.y}) lệch vùng sàn phòng ${g.room.id}`);
      if (Math.abs(p.h - scaleAt(g.room, p.y)) > 0.05 * scaleAt(g.room, p.y)) F('pacing', `${who}: tỉ lệ sai > 5%`); }
  }
  const outfits = {}, stands = {};
  const lines = sc.lines.map((l, i) => {
    const g = segs.find(s => i >= s.from && i <= s.to), emotion = lineEmotion(l), outfit = outfitOf(g.scene);
    const cx = l.who !== 'kit' && g.pos[l.who] ? g.pos[l.who].x : null;
    const conflict = exprConflict(l); if (conflict) F('lipsync', `câu ${i + 1}: ${conflict}`);
    const actors = g.cast.map(who => {
      const speaking = who === l.who, p = g.pos[who];
      const others0 = g.cast.filter(x => x !== who).map(x => g.pos[x].x), mean0 = others0.length ? others0.reduce((s, x) => s + x, 0) / others0.length : p.x;
      const want0 = cx == null || (speaking && l.beat === 'cta') ? 'front' : speaking ? (others0.length ? (mean0 > p.x ? 'right' : 'left') : 'front') : cx > p.x ? 'right' : cx < p.x ? 'left' : 'front';
      const a = pickAsset(manifest, who, { speaking, emotion, outfit, exists, used, avoid, want: want0 });
      if (speaking && a.kind === 'clip') { if (used.has(a.id)) F('pacing', `câu ${i + 1}: clip hành động ${a.id} lặp lại trong cùng video`); used.add(a.id); }
      const others = g.cast.filter(x => x !== who).map(x => g.pos[x].x), mean = others.length ? others.reduce((s, x) => s + x, 0) / others.length : p.x;
      const want = cx == null || (speaking && l.beat === 'cta') ? 'front' : speaking ? (others.length ? (mean > p.x ? 'right' : 'left') : 'front') : cx > p.x ? 'right' : cx < p.x ? 'left' : 'front';
      const nat = a.facing || 'front', flip = flipOf(nat, want, a.mirrorOk === true && ((casting.characters || {})[who] || {}).mirrorOk !== false), face = flip ? (nat === 'left' ? 'right' : 'left') : nat;
      if (speaking && !a.mouth) F('lipsync', `câu ${i + 1}: ${who} đang nói nhưng không có clip cử động miệng (${a.kind === 'none' ? 'thiếu tài nguyên' : a.kind + ' ' + (a.id || a.file || '')})`);
      if (speaking && a.mouth && !(a.tags || []).some(t => (EMOTION_TAGS[emotion] || []).includes(t))) F('lipsync', `câu ${i + 1}: clip ${a.id} (${(a.tags || []).join('/')}) không khớp cảm xúc "${emotion}" (cần ${EMOTION_TAGS[emotion].join('/')})`);
      if (!speaking && a.kind === 'clip' && !isListenerClip(a)) F('lipsync', `câu ${i + 1}: ${who} đang nghe nhưng dùng clip ${a.id} (cần idle/nod)`);
      if (want !== 'front' && nat !== 'front' && face !== want) F('lipsync', `câu ${i + 1}: ${who} không nhìn về phía người nói`);
      if (a.kind !== 'none') { outfits[who] = outfits[who] || new Set(); outfits[who].add(a.outfit || 'office'); }
      const key = who + '@' + g.scene; if (stands[key] && (stands[key].x !== p.x || stands[key].y !== p.y)) F('pacing', `${who} đổi vị trí đứng giữa các câu`); stands[key] = p;
      return { who, role: speaking ? 'speaker' : 'listener', asset: a, flip, want, face, ...p };
    });
    return { i, who: l.who, emotion, scene: g.scene, room: g.room.id, transitionIn: i > 0 && i === g.from, actors };
  });
  for (const [who, set] of Object.entries(outfits)) if (set.size > 1) F('pacing', `${who} đổi trang phục giữa các cảnh (${[...set].join(', ')})`);
  return { topic: topic.id, time, base, clips: [...used], segs: segs.map(({ scene, from, to, room, cast, pos }) => ({ scene, from, to, room, cast, pos })), lines, fails };
}
// Lỗi nhất quán → mục rubric bị chấm 0 + chặn đăng (brand = sai bối cảnh/dàn · lipsync = biểu cảm/miệng/hướng nhìn · pacing = liên tục cảnh)
export function consistencyVerdict(fails) {
  const zero = [...new Set(fails.map(f => f.k))];
  return { ok: !fails.length, zero, reasons: fails.slice(0, 20).map(f => `[${f.k}] ${f.reason}`.slice(0, 200)) };
}
