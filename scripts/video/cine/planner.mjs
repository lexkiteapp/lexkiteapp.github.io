// Planner chế độ cine (docs/VIDEO-PIPELINE.md §13): kịch bản khuôn (template.mjs fill → content/video/samples/*.json) hoặc bản chuyển thể cine
// (content/video/cine/scripts/*.json: {source, shots[], endcard}) → shot list: blocking, khung đầu (prompt + ảnh tham chiếu), prompt chuyển động,
// người nói, câu, giọng/cảm xúc cố định từ cast bible, lớp phủ (hook / thẻ ✗✓ gắn câu), màn kết. HÀM THUẦN (không I/O) – test scripts/test/cine.mjs.

export const SHOT_SEC = 5;          // Kling 2.5 Turbo: 5 s/shot
export const WPS = 3.2;             // tốc độ đọc ước lượng – hiệu chỉnh theo pilot (giọng Kling Peppy/Michael: 7–11 từ trong 3,3–3,4 s)
export const MIN_LINE = 2.0;        // Kling Lip Sync: câu ≥ 2 s
export const PAGE_CHARS = 26;       // gộp câu vào 1 trang phụ đề tới ~26 ký tự (≤ 2 dòng)

const r2 = x => Math.round(x * 100) / 100;
const norm = s => String(s || '').toLowerCase().replace(/[“”"'.!?,…]/g, '').replace(/\s+/g, ' ').trim();
export const estSec = text => r2(String(text).trim().split(/\s+/).filter(Boolean).length / WPS + 0.25 + (String(text).match(/[.!?]/g) || []).length * 0.2);

/** Chia câu thoại thành trang phụ đề: tách theo câu (.!?), gộp câu kề nhau tới PAGE_CHARS ký tự. */
export function subPages(text, max = PAGE_CHARS) {
  const sents = String(text).match(/[^.!?]+[.!?]+["”’]?|[^.!?]+$/g) || [String(text)];
  const out = [];
  for (const s0 of sents.map(s => s.trim()).filter(Boolean)) {
    const last = out[out.length - 1];
    if (last && (last + ' ' + s0).length <= max) out[out.length - 1] = last + ' ' + s0; else out.push(s0);
  }
  return out;
}

/** Câu < 2 s → thêm thán từ của nhân vật ở ĐẦU câu (qua kịch bản, ghi vào shot.padded). Không bao giờ đệm im lặng. */
export function padLine(text, who, cast) {
  const c = cast.characters[who] || {};
  let t = String(text).trim(); const added = [];
  for (const it of c.interjections || []) {
    if (estSec(t) >= MIN_LINE + 0.15) break;
    if (norm(t).startsWith(norm(it))) continue;
    t = `${it} ${t}`; added.push(it);
  }
  return { text: t, added, ok: estSec(t) >= MIN_LINE + 0.15 };
}

const fill = (tpl, vars) => String(tpl || '').replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));

/** Vai theo bối cảnh (casting.json scenes.<tag>.roles) → 'customer' | 'barista' … */
export function roleOf(who, scene, casting) {
  const r = (((casting || {}).scenes || {})[scene] || {}).roles || {};
  return String(r[who] || '').split('|')[0].trim() || null;
}

/** Khung đầu: id = blocking#variant (dùng chung cho mọi shot cùng blocking + variant). Ảnh tham chiếu: phòng, nhân vật theo vai, khung 2 người (refFrom). */
function framePlan(shot, sc, cast, scName) {
  const b = sc.blocking[shot.blocking];
  const refs = [{ kind: 'room', path: sc.room }];
  const vars = { style: sc.style, ratio: 0 };
  for (const s of shot.slots) {
    const c = cast.characters[s.who];
    refs.push({ kind: 'char', who: s.who, role: s.role, path: c.ref });
    vars[s.role] = `${c.name}, ${c.look}`; vars[s.role + 'Name'] = c.name;
  }
  const teen = shot.slots.find(s => cast.characters[s.who].ageClass === 'teen'), adult = shot.slots.find(s => cast.characters[s.who].ageClass === 'adult');
  if (teen && adult) vars.ratio = Math.round(100 * cast.characters[teen.who].heightFactor / cast.characters[adult.who].heightFactor);
  const refFrom = b.refFrom ? `${b.refFrom}#a` : null;
  if (refFrom) refs.push({ kind: 'frame', frame: refFrom });
  // <<<room>>>/<<<customer>>>/<<<frame>>> → <<<image_N>>> theo thứ tự refs (cú pháp Kling Omni Image)
  const idx = k => refs.findIndex(r => (k === 'room' ? r.kind === 'room' : k === 'frame' ? r.kind === 'frame' : r.role === k)) + 1;
  let prompt = fill(b.prompt, vars).replace(/<<<(\w+)>>>/g, (m, k) => (idx(k) > 0 ? `<<<image_${idx(k)}>>>` : 'the reference'));
  if (sc.negative) prompt += ` Avoid: ${sc.negative}.`;
  return { id: `${shot.blocking}#${shot.variant || 'a'}`, scene: scName, blocking: shot.blocking, framing: b.framing, people: b.people, slots: shot.slots, refs, refFrom, prompt, aspect: '9:16', resolution: '2k', n: 4 };
}

/** Chuyển thể mặc định từ kịch bản khuôn: hook → 2 người (nói luôn), câu của nhân vật có trong cast bible → cận theo vai, tip/cta → màn kết. */
export function adaptTemplate(sample, cast, casting) {
  const s = sample.script, shots = [], endcard = { tip: '', cta: '' }, errors = [];
  const people = [...new Set(s.lines.map(l => l.who).filter(w => cast.characters[w]))];
  for (const l of s.lines) {
    if (l.beat === 'tip') { endcard.tip = l.text; continue; }
    if (l.beat === 'cta') { endcard.cta = l.text; continue; }
    if (!cast.characters[l.who]) { errors.push(`${l.beat}: "${l.who}" chưa có trong cast bible (content/video/cine/cast.json)`); continue; }
    const role = roleOf(l.who, s.scene, casting);
    const other = people.find(w => w !== l.who) || null;
    const card = norm(l.text) === norm(s.wrong) ? 'wrong' : norm(l.text) === norm(s.right) ? 'right' : null;
    shots.push({ beat: l.beat, speaker: l.who, listener: other, text: l.text, expr: l.expr, card, hook: l.beat === 'hook' ? (s.hook || l.text) : undefined,
      blocking: l.beat === 'hook' ? 'two-shot-counter' : role && /barista|cashier|server/.test(role) ? 'ms-barista' : 'mcu-customer', variant: 'a' });
  }
  return { shots, endcard, errors };
}

/** → { id, scene, shots[], frames{}, endcard, errors[], warnings[], estimate{} } */
export function plan(input, { cast, scenes, casting, sample: sampleIn } = {}) {
  const errors = [], warnings = [];
  const isCine = Array.isArray(input.shots), sample = isCine ? sampleIn : input;
  if (!sample || !sample.script) return { errors: ['thiếu kịch bản khuôn (source)'], warnings, shots: [], frames: {} };
  const sc0 = sample.script, scName = sc0.scene, sc = (scenes.scenes || {})[scName];
  if (!sc) return { errors: [`bối cảnh "${scName}" chưa có trong scenes.json`], warnings, shots: [], frames: {} };
  const ad = isCine ? { shots: input.shots, endcard: input.endcard || {}, errors: [] } : adaptTemplate(sample, cast, casting);
  errors.push(...ad.errors);
  const shots = [], frames = {};
  ad.shots.forEach((x, i) => {
    const id = 's' + String(i + 1).padStart(2, '0'), b = sc.blocking[x.blocking];
    if (!b) { errors.push(`${id}: blocking "${x.blocking}" chưa có trong scenes.${scName}`); return; }
    const c = cast.characters[x.speaker];
    if (!c) { errors.push(`${id}: người nói "${x.speaker}" chưa có trong cast bible`); return; }
    const listener = x.listener || ad.shots.map(y => y.speaker).find(w => w && w !== x.speaker) || null;
    const roleOfW = w => roleOf(w, scName, casting) || (w === x.speaker ? 'customer' : 'barista');
    let slots;
    if (b.people >= 2) slots = [x.speaker, listener].filter(Boolean).map(w => ({ who: w, role: roleOfW(w), side: sc.roles[roleOfW(w)] || 'left' })).sort((a, b2) => (a.side === 'left' ? -1 : 1) - (b2.side === 'left' ? -1 : 1));
    else {
      const who = [x.speaker, listener].find(w => w && roleOfW(w) === b.subject) || x.speaker;
      if (who !== x.speaker) warnings.push(`${id}: blocking ${x.blocking} quay ${who} nhưng người nói là ${x.speaker}`);
      slots = [{ who, role: roleOfW(who), side: 'only' }];
    }
    let text = x.text || '', padded = null;
    if (!x.silent) {
      if (!text) { errors.push(`${id}: shot có tiếng nhưng không có câu thoại`); return; }
      if (!isCine && estSec(text) < MIN_LINE + 0.15) { const p = padLine(text, x.speaker, cast); padded = p.added; text = p.text; if (!p.ok) errors.push(`${id}: câu "${x.text}" quá ngắn (< ${MIN_LINE} s) kể cả khi thêm thán từ – viết lại kịch bản`); }
      else if (estSec(text) < MIN_LINE) errors.push(`${id}: câu "${text}" ước ${estSec(text)} s < ${MIN_LINE} s – thêm thán từ tự nhiên trong kịch bản (không đệm im lặng)`);
      if (estSec(text) > SHOT_SEC - 0.2) errors.push(`${id}: câu ước ${estSec(text)} s > shot ${SHOT_SEC} s − 0,2 – tách câu thành 2 shot`);
      else if (estSec(text) > SHOT_SEC - 0.8) warnings.push(`${id}: câu ước ${estSec(text)} s sát độ dài shot – cổng giọng sẽ đo thật sau TTS`);
    } else if (!x.maxSec) errors.push(`${id}: shot im lặng phải có maxSec`);
    const emotion = (c.emotion.map || {})[x.expr] || c.emotion.default;
    const shot = { id, beat: x.beat, blocking: x.blocking, variant: x.variant || 'a', framing: b.framing, people: b.people, speaker: x.speaker, listener, slots, text, silent: !!x.silent, padded, emotion,
      voice: { ...c.voice }, estSec: x.silent ? 0 : estSec(text), maxSec: x.maxSec || null, pages: x.silent ? [] : subPages(text) };
    const fp = framePlan(shot, sc, cast, scName);
    if (!frames[fp.id]) frames[fp.id] = fp;
    shot.frame = fp.id;
    const listenerName = listener && cast.characters[listener] ? cast.characters[listener].name : 'the other person';
    const mv = { speakerName: c.name, listenerName, emotion };
    shot.motion = { prompt: fill(x.motionHint || b.motion, mv) + (x.silent ? ' Nobody speaks; natural idle reactions only.' : ''), duration: SHOT_SEC };
    shot.lipsync = x.silent ? { needed: false } : { needed: true, faceHint: b.people >= 2 ? (slots.find(s => s.who === x.speaker) || {}).side : 'only', originalAudioVolume: 0 };
    shot.overlays = [];
    if (x.hook) shot.overlays.push({ kind: 'hook', text: x.hook, at: 0 });
    if (x.card) shot.overlays.push({ kind: 'card', sym: x.card === 'wrong' ? '✗' : '✓', text: x.cardText || (x.card === 'wrong' ? sc0.wrong : sc0.right), payoff: id, when: x.card === 'wrong' ? 'after-line' : 'with-last-page' });
    shots.push(shot);
  });
  // khung tham chiếu (refFrom) phải được sinh TRƯỚC: đảm bảo tồn tại
  for (const f of Object.values(frames)) if (f.refFrom && !frames[f.refFrom]) errors.push(`khung ${f.id} cần khung tham chiếu ${f.refFrom} nhưng kịch bản không có shot nào dùng nó`);
  if (shots.length && !shots[0].overlays.some(o => o.kind === 'hook')) warnings.push('shot đầu không có hook chữ – cổng opening sẽ FAIL');
  if (shots.length && shots[0].silent) warnings.push('shot đầu im lặng – cổng opening (âm 0,5 s đầu) sẽ FAIL; nên cho nhân vật nói hook');
  const endcard = { tip: (ad.endcard.tip || '').trim(), cta: (ad.endcard.cta || 'Learn free on lexkite.com').trim(), duration: 3.0 };
  if (!endcard.tip) warnings.push('màn kết không có mẹo của Kit');
  const id = (sample.template || sc0.template || 'cine') + '--' + norm(sc0.keywords && sc0.keywords[0] || sc0.title).replace(/\s+/g, '-').slice(0, 40);
  return { id, scene: scName, topic: sample.topic, title: sc0.title, keywords: sc0.keywords || [], shots, frames, endcard, errors, warnings };
}

/** Ước lượng credit/USD (dry-run + trần ngân sách). retryReserve = tỉ lệ dự phòng sinh lại (cổng FAIL). */
export function estimate(p, pricing) {
  const fr = Object.keys(p.frames).length, imgs = Object.values(p.frames).reduce((a, f) => a + (f.n || 4), 0);
  const vids = p.shots.length, ls = p.shots.filter(s => s.lipsync && s.lipsync.needed).length;
  const per5 = d => Math.ceil(d / 5);
  const ops = { image: imgs, video: p.shots.reduce((a, s) => a + per5(s.motion.duration), 0), tts: ls, faces: ls, lipsync: ls * per5(SHOT_SEC) };
  let credits = 0, usd = 0;
  for (const [k, n] of Object.entries(ops)) { credits += n * ((pricing[k] || {}).credits || 0); usd += n * ((pricing[k] || {}).usd || 0); }
  const reserve = pricing.retryReserve ?? 0.35;
  return { frames: fr, images: imgs, shots: vids, lipsync: ls, ops, credits: Math.round(credits), usd: r2(usd), withRetries: { credits: Math.round(credits * (1 + reserve)), usd: r2(usd * (1 + reserve)) } };
}

/** Thời gian trang phụ đề trong 1 shot (giây tuyệt đối): ranh giới trang bám KHOẢNG NGẮT thật của giọng (silencedetect) gần điểm chia theo số ký tự;
 *  trang đầu được hiện sớm ≤ 0,3 s trước giọng; trang cuối kéo vào khoảng lặng cho đủ ≥ 1,2 s nếu shot còn chỗ; mọi trang kẹp trong [đầu shot, cuối shot − 0,05].
 *  speech = {start, end, pauses[{start,end}]} tương đối với shot; t = mốc đầu shot trong video; L = độ dài shot. */
export function subTiming(pages, speech, t, L, { lead = 0.3, gap = 0.07, minDur = 1.2 } = {}) {
  if (!pages.length || !speech) return [];
  const a = speech.start, b = Math.min(speech.end, L), n = pages.reduce((x, p) => x + p.length, 0);
  const used = new Set(), bounds = [];
  let acc = 0;
  for (let i = 0; i + 1 < pages.length; i++) {
    acc += pages[i].length; const ideal = a + (b - a) * acc / n;
    const cand = (speech.pauses || []).map((p, k) => ({ k, mid: (p.start + p.end) / 2, p })).filter(c => !used.has(c.k) && c.mid > a && c.mid < b && Math.abs(c.mid - ideal) <= 0.8).sort((x, y) => Math.abs(x.mid - ideal) - Math.abs(y.mid - ideal))[0];
    if (cand) { used.add(cand.k); bounds.push(Math.max(cand.p.start + 0.05, cand.p.end - 0.12)); } else bounds.push(ideal);
  }
  const starts = [Math.max(0.05, a - lead), ...bounds], ends = [...bounds.map(x => x - gap), Math.min(L - 0.05, b + 0.6)];
  if (ends[0] - starts[0] < minDur) starts[0] = Math.max(0.05, a - 0.6, ends[0] - minDur); // trang đầu ngắn: hiện sớm hơn (≤ 0,6 s trước giọng)
  return pages.map((p, i) => {
    let t1 = ends[i];
    if (t1 - starts[i] < minDur && i + 1 === pages.length) t1 = Math.min(L - 0.05, starts[i] + minDur);
    return { text: p, t0: r2(t + starts[i]), t1: r2(t + t1) };
  });
}
