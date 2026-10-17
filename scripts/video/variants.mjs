// Bộ sinh biến thể có seed (docs/VIDEO-PIPELINE.md §9) – hàm thuần, test ở scripts/test/video.mjs (1.000 lượt không trùng theo luật).
// Mỗi video = khuôn (content/video/formats.json) × bối cảnh (phòng + ngày/tối + mùa) × dàn hợp vai (content/video/casting.json) × bộ góc máy
//   × kiểu chữ hook × chuyển cảnh × nhạc nền tự tổng hợp (+ hiệu ứng) × end card. Clip hành động chọn theo cảm xúc ở lib.buildStage.
// Chống lặp: dấu vân tay (8 thành phần chính) không được trùng ≥ 3 thành phần với 30 video gần nhất; giãn cách tối thiểu từng tài nguyên;
//   thành phần bị kịch bản cố định (chỉ 1 lựa chọn) không tính trùng. Cùng seed + cùng lịch sử → cùng kết quả (tái tạo được).
import { resolveTopic } from './lib.mjs';

export const MAIN = ['format', 'setting', 'cast', 'hookStyle', 'transition', 'music', 'endCard', 'cameraSet'];
export function hash32(s) { let h = 0x811c9dc5; for (const c of String(s)) { h ^= c.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; }
// mulberry32 – ngẫu nhiên có seed
export function rng(seed) { let a = hash32(seed); return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export const speakersOf = sc => [...new Set((sc.lines || []).map(l => l.who).filter(w => w && w !== 'kit'))];
// Đổi vai được khi lời thoại không gọi tên nhân vật (tránh "Mia" nói mà người đứng là Leo) và kịch bản không khóa (recast:false)
export function canRecast(sc, casting) {
  if (sc.recast === false) return false;
  const names = new Set(Object.values(casting.scenes).flatMap(s => s.cast).filter(w => w !== 'kit'));
  const txt = (sc.lines || []).map(l => l.text).join(' ').toLowerCase();
  return ![...names].some(n => new RegExp(`\\b${n}\\b`).test(txt));
}
const perms = (arr, k) => (k === 0 ? [[]] : arr.flatMap((x, i) => perms(arr.filter((_, j) => j !== i), k - 1).map(p => [x, ...p])));

// Kho lựa chọn cho 1 kịch bản (lọc theo chủ đề, số người nói, bối cảnh, giờ, tháng, tài nguyên có thật)
export function variantPools({ job, formats, casting, manifest, exists = () => true, existsRepo = () => true, date = new Date() }) {
  const sc = job.script, topic = resolveTopic(job, casting) || casting.fallback, sp = speakersOf(sc), n = sp.length, recast = canRecast(sc, casting);
  const scenes = sc.scene ? [sc.scene] : topic.scenes, times = sc.time ? [sc.time] : ['day', 'night'], month = date.getUTCMonth() + 1;
  const seasons = formats.seasons.filter(s => s.months.includes(month) && (s.id === 'none' || exists(s.file)));
  let rooms = (manifest.rooms || []).filter(r => scenes.includes(r.tag) && times.includes(r.time || 'day') && exists(r.file));
  if (!rooms.length) rooms = scenes.flatMap(tag => times.slice(0, 1).map(time => ({ id: `virtual-${tag}-${time}`, tag, time, virtual: true })));
  const castCache = {};
  // vai có clip nói thật (đúng trang phục của bối cảnh) được ưu tiên – đổi vai sang người chưa có tài nguyên chỉ khi không còn cách nào khác
  const ready = (who, scene) => (manifest.clips || []).some(c => c.who === who && c.mouth && (c.outfit || 'office') === (sc.outfit || (casting.scenes[scene] || {}).outfit || 'office') && exists(c.file));
  const castFor = scene => castCache[scene] || (castCache[scene] = (() => {
    if (!recast) return [{ id: sp.join('+'), who: sp }];
    const all = perms(topic.cast.filter(w => ((casting.scenes[scene] || {}).cast || []).includes(w)), n).map(who => ({ id: who.join('+'), who }));
    const ok = all.filter(c => c.who.every(w => ready(w, scene))); return ok.length ? ok : all;
  })());
  const all = rooms.flatMap(room => seasons.map(s => ({ id: `${room.id}|${s.id}`, room: room.id, scene: room.tag, time: room.time || 'day', season: s.id })));
  const settings = all.filter(s => castFor(s.scene).length).length ? all.filter(s => castFor(s.scene).length) : all; // bối cảnh không đủ vai hợp lệ → bỏ
  const fmts = formats.formats.filter(f => (sc.format_id ? f.id === sc.format_id : (f.topics === 'any' || f.topics.includes(topic.id)) && n >= f.cast[0] && n <= f.cast[1]));
  return {
    topic: topic.id, speakers: sp, recast, settings, castFor,
    format: fmts.length ? fmts : formats.formats.filter(f => f.topics === 'any'),
    hookStyle: formats.hookStyles, transition: formats.transitions, music: formats.music, sfx: formats.sfx, cameraSet: formats.cameraSets,
    endCard: formats.endCards.filter(e => !e.file || existsRepo(e.file)),
  };
}

export const sharedCount = (a, b, comps = MAIN) => comps.filter(c => a[c] != null && a[c] === b[c]).length;

// Chọn biến thể: ưu tiên giá trị lâu chưa dùng (LRU) + sửa cục bộ tới khi hợp luật. Không tìm được → trả bản ít vi phạm nhất, relaxed = true.
export function pickVariant({ job, formats, casting, manifest, history = [], seed = 'x', exists, existsRepo, date, maxTries = 60 }) {
  const R = rng(seed), rules = formats.rules, recent = history.slice(-rules.recent);
  const P = variantPools({ job, formats, casting, manifest, exists, existsRepo, date });
  const pool = (c, cand) => (c === 'setting' ? P.settings : c === 'cast' ? P.castFor(cand.setting.scene) : P[c]);
  const allCast = new Set(P.settings.flatMap(s => P.castFor(s.scene).map(x => x.id)));
  const choice = MAIN.filter(c => (c === 'cast' ? allCast.size : c === 'setting' ? P.settings.length : P[c].length) > 1); // thành phần có lựa chọn thật
  const back = (c, v) => { for (let i = recent.length - 1; i >= 0; i--) if (recent[i][c] === v) return recent.length - 1 - i; return Infinity; };
  const gapOf = (c, cand) => Math.min((rules.spacing || {})[c] || 0, pool(c, cand).length - 1);
  const pickLRU = (c, cand, ex = new Set()) => {
    const arr = pool(c, cand); if (!arr.length) throw new Error(`không có lựa chọn ${c} hợp lệ cho kịch bản (số người nói / bối cảnh / dàn trong casting.json)`);
    const ok = arr.filter(v => !ex.has(v.id)), list = (ok.length ? ok : arr).map(v => ({ v, r: R(), b: back(c, v.id) }));
    list.sort((x, y) => (y.b - x.b) || (x.r - y.r));
    const top = list.slice(0, Math.max(1, Math.ceil(list.length / 3))); return top[Math.floor(R() * top.length)].v;
  };
  const fp = cand => Object.fromEntries(MAIN.map(c => [c, cand[c] ? cand[c].id : null]));
  const problems = cand => {
    const f = fp(cand), out = [];
    for (const c of Object.keys(rules.spacing || {})) { const g = gapOf(c, cand); if (g > 0 && back(c, f[c]) < g) out.push({ c, ex: new Set(recent.slice(-g).map(h => h[c])) }); }
    const viol = recent.filter(h => sharedCount(f, h, choice) > rules.maxShared);
    if (viol.length) { const h = viol[viol.length - 1], sh = choice.filter(c => f[c] === h[c]); const c = sh[Math.floor(R() * sh.length)]; out.push({ c, ex: new Set(viol.map(x => x[c])) }); }
    return out;
  };
  let best = null;
  for (let t = 0; t < maxTries; t++) {
    const cand = {}; cand.setting = pickLRU('setting', cand);
    for (const c of MAIN) if (c !== 'setting') cand[c] = pickLRU(c, cand);
    for (let it = 0; it < 80; it++) {
      const pr = problems(cand); if (!pr.length) break;
      const { c, ex } = pr[Math.floor(R() * pr.length)];
      cand[c] = pickLRU(c, cand, ex);
      if (c === 'setting' && !pool('cast', cand).some(x => x.id === cand.cast.id)) cand.cast = pickLRU('cast', cand);
    }
    const left = problems(cand).length;
    if (!best || left < best.left) best = { cand, left };
    if (!left) break;
  }
  const c = best.cand;
  // Theme (kiểu chữ × màu × bố cục) trong bộ ≥ 3 theme của khuôn – lâu chưa dùng trước (ghi vào vân tay, không tính vào luật trùng)
  const thIds = (c.format.themes || []).length ? c.format.themes : (formats.themes || []).map(t => t.id);
  const thPool = (formats.themes || []).filter(t => thIds.includes(t.id)).map(t => ({ t, b: back('theme', t.id), r: R() })).sort((x, y) => (y.b - x.b) || (x.r - y.r));
  const theme = thPool.length ? thPool[0].t : null;
  return {
    seed: String(seed), topic: P.topic, relaxed: best.left > 0, recast: P.recast, choice,
    fp: { ...fp(c), theme: theme ? theme.id : null, scene: c.setting.scene, time: c.setting.time, season: c.setting.season, room: c.setting.room },
    format: c.format, setting: c.setting, cast: { from: P.speakers, to: c.cast.who }, hookStyle: c.hookStyle, transition: c.transition, music: c.music,
    sfx: P.sfx[Math.floor(R() * P.sfx.length)], endCard: c.endCard, cameraSet: c.cameraSet, theme,
  };
}

// Áp dàn mới vào kịch bản (đổi who theo thứ tự người nói); Kit giữ nguyên
export function applyCast(sc, cast) {
  const m = Object.fromEntries(cast.from.map((w, i) => [w, cast.to[i] || w]));
  return { ...sc, lines: sc.lines.map(l => ({ ...l, who: l.who === 'kit' ? 'kit' : m[l.who] || l.who })) };
}
// Góc máy từng câu: gợi ý của khuôn theo beat, không có thì theo vòng của bộ góc máy
export const cameraFor = (variant, line, i) => (variant.format.camera || {})[line.beat] || variant.cameraSet.cycle[i % variant.cameraSet.cycle.length];

// Kiểm 1 chuỗi lịch sử (dùng trong test + báo cáo): trùng ≥ maxShared+1 thành phần với 30 video trước / giãn cách
export function auditHistory(hist, rules, choiceOf = () => MAIN) {
  const bad = [];
  hist.forEach((h, i) => {
    const prev = hist.slice(Math.max(0, i - rules.recent), i), ch = choiceOf(h);
    prev.forEach((p, k) => { const n = sharedCount(h, p, ch); if (n > rules.maxShared) bad.push(`#${i} trùng ${n} thành phần với #${i - prev.length + k}`); });
    if (h.clips && new Set(h.clips).size !== h.clips.length) bad.push(`#${i} lặp clip hành động trong 1 video`);
  });
  return bad;
}

// Báo cáo độ phủ: số tổ hợp khả dụng theo chủ đề + tài nguyên còn thiếu (để phiên chính tạo thêm trên Kling)
export function coverage({ formats, casting, manifest, exists = () => true, existsRepo = () => true, emotionTags, date = new Date() }) {
  const topics = [], missing = new Set();
  for (const t of [...casting.topics, casting.fallback]) {
    let combos = 0;
    for (let n = 1; n <= Math.min(3, t.cast.length); n++) {
      const job = { topic: (t.match || [t.id])[0], script: { lines: t.cast.slice(0, n).map(who => ({ who, text: 'x' })) } };
      const P = variantPools({ job: { ...job, topic: t.match ? t.match[0] : 'general' }, formats, casting, manifest, exists, existsRepo, date });
      const fm = P.format.filter(f => f.topics === 'any' || f.topics.includes(t.id)).length;
      const castN = P.settings.reduce((a, s) => a + P.castFor(s.scene).length, 0);
      combos += fm * castN * P.hookStyle.length * P.transition.length * P.music.length * P.endCard.length * P.cameraSet.length;
    }
    topics.push({ topic: t.id, combos });
    for (const tag of t.scenes) for (const time of ['day', 'night']) {
      const rs = (manifest.rooms || []).filter(r => r.tag === tag && (r.time || 'day') === time);
      if (!rs.length) missing.add(`phòng ${tag} (${time}) – chưa có trong manifest`);
      for (const r of rs) if (!exists(r.file)) missing.add(`phòng ${r.id}: thiếu file ${r.file}`);
    }
  }
  for (const [tag, sd] of Object.entries(casting.scenes)) for (const who of sd.cast.filter(w => w !== 'kit')) {
    const outfit = sd.outfit || 'office', cl = (manifest.clips || []).filter(c => c.who === who && (c.outfit || 'office') === outfit && exists(c.file));
    for (const [emo, tags] of Object.entries(emotionTags)) if (!cl.some(c => c.mouth && (c.tags || []).some(x => tags.includes(x)))) missing.add(`clip ${who} (${outfit}) nói + ${emo}: ${tags.join('/')} – cho bối cảnh ${tag}`);
    if (!cl.some(c => (c.tags || []).some(x => ['idle', 'nod'].includes(x)))) missing.add(`clip ${who} (${outfit}) nghe: idle/nod – cho bối cảnh ${tag}`);
  }
  for (const s of formats.seasons) if (s.file && !exists(s.file)) missing.add(`lớp mùa ${s.id}: ${s.file}`);
  for (const e of formats.endCards) if (e.file && !existsRepo(e.file)) missing.add(`end card ${e.id}: ${e.file}`);
  return { total: topics.reduce((a, t) => a + t.combos, 0), topics, missing: [...missing].sort() };
}
