// Khuôn nội dung video (docs/VIDEO-PIPELINE.md §11): content/video/templates/<id>.json (beat, vai, giới hạn chữ, từ vựng biểu cảm…) + _shared.json.
// Dùng:
//   node scripts/video/template.mjs fill <template-id|file> <vars.json> [--out file]   → kịch bản đúng khuôn Studio/sample (in ra stdout hoặc --out)
//   node scripts/video/template.mjs lint <script.json|thư mục>…                         → chạy CÙNG cổng tĩnh của render.mjs (lib.mjs) + luật khuôn; lỗi → exit 1
//   node scripts/video/template.mjs build [--check]                                     → sinh lại content/video/samples/<id>--<slug>.json từ templates/examples/*.vars.json
//   node scripts/video/template.mjs check-templates                                     → kiểm chính các file khuôn (schema, cảnh/vai, biến, từ vựng)
//   node scripts/video/template.mjs coverage                                            → khuôn × bối cảnh nào đang bị chặn vì thiếu phòng/clip (danh sách clip cần tạo)
// Cổng tĩnh = những gì render.mjs sẽ chấm mà KHÔNG cần dựng: kiểm kịch bản Studio (studio.checkScript), brand/CTA (lib.brandGate/ctaGate), hook ước lượng,
//   thời lượng, phụ đề (vùng an toàn + khớp chữ ASS), biến thể (variants.pickVariant – đúng như bước variant) + cổng nhất quán (lib.buildStage – như bước cast)
//   trên kho dựng CI (brand/library/manifest.json, chỉ mục ready). Không đụng ffmpeg/TTS/Remotion – chạy trong vài trăm ms.
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import * as V from './lib.mjs';
import * as X from './variants.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TPL_DIR = path.join(ROOT, 'content/video/templates'), EX_DIR = path.join(TPL_DIR, 'examples'), SAMPLES = path.join(ROOT, 'content/video/samples');
const readJson = f => JSON.parse(fs.readFileSync(path.isAbsolute(f) ? f : path.join(ROOT, f), 'utf8'));
const rel = f => path.relative(ROOT, path.resolve(f)).split(path.sep).join('/');
const { checkScript, BEATS } = await import(pathToFileURL(path.join(ROOT, 'functions/api/studio.js')).href);

export const CLAIMS = /\b(guarantee[ds]?|guaranteed|best app|number one|#1|fluent in \d+|in \d+ days|overnight|never forget|100\s?%|scientifically proven|secret trick|native in)\b/i;
export const EMOTIONS = ['wrong', 'ask', 'right', 'explain', 'talk', 'cta'];

// ---------- Ngữ cảnh: casting, khuôn hình (formats), kho dựng CI ----------
// Kho dựng như CI thấy: chỉ mục ready (đã approved + đã lên media) – y hệt render.mjs manifestOf(); file coi như có (fetch-render tải về)
export function ciManifest(m = readJson('brand/library/manifest.json')) {
  const out = { ...m }; for (const k of ['rooms', 'clips', 'stills']) out[k] = (m[k] || []).filter(x => x.ready !== false); return out;
}
export function loadCtx() {
  return { casting: readJson('content/video/casting.json'), formats: readJson('content/video/formats.json'), manifest: ciManifest(), shared: readJson(path.join(TPL_DIR, '_shared.json')) };
}
export function loadTemplate(idOrFile) {
  const f = /[\\/]|\.json$/.test(idOrFile) ? path.resolve(idOrFile) : path.join(TPL_DIR, `${idOrFile}.json`);
  if (!fs.existsSync(f)) throw new Error(`không có khuôn ${idOrFile} (${rel(f)})`);
  return readJson(f);
}
export const listTemplates = () => fs.readdirSync(TPL_DIR).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort().map(f => readJson(path.join(TPL_DIR, f)));

// ---------- fill ----------
const VAR = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
export const capFirst = t => String(t).replace(/^([\s"“'‘(]*)([a-z])/, (_, a, b) => a + b.toUpperCase()); // biến chữ thường ở đầu câu ("affect or effect?") → viết hoa
export const varsIn = s => [...String(s || '').matchAll(VAR)].map(m => m[1]);
function subT(pat, vars, where, defs = {}) {
  return String(pat).replace(VAR, (_, k) => { if (vars[k] == null || vars[k] === '') throw new Error(`${where}: thiếu biến {{${k}}}${defs[k] && defs[k].desc ? ' – ' + defs[k].desc : ''}`); return String(vars[k]); });
}
// Chọn 1 mẫu câu theo seed (ổn định, đa dạng giữa các video); bỏ mẫu cần biến tuỳ chọn chưa có
const pick = (arr, seed, key, vars = null) => { const all = Array.isArray(arr) ? arr : [arr], ok = vars ? all.filter(p => varsIn(p).every(k => vars[k] != null && vars[k] !== '')) : all, list = ok.length ? ok : all; return list[X.hash32(`${seed}|${key}`) % list.length]; };

// vars.json: { topic, scene?, time?, cast?: {vai: who}, vars: {…}, lines?: {beatId: "câu" | {text, expr, gesture}}, title?, hook?, caption?, hashtags?, keywords?, wrong?, right?, seed?, note? }
export function fill(tpl, v) {
  if (!v || !v.topic) throw new Error('vars: thiếu "topic" (chủ đề – quyết định bối cảnh/dàn qua casting.json topics)');
  const scene = v.scene || Object.keys(tpl.scenes)[0], sd = tpl.scenes[scene];
  if (!sd) throw new Error(`khuôn ${tpl.id} không cho bối cảnh "${scene}" (được: ${Object.keys(tpl.scenes).join(', ')})`);
  const vars = { ...(v.vars || {}) }, seed = v.seed || v.topic, ov = v.lines || {}, D = tpl.vars || {};
  // biến bắt buộc chỉ bị đòi khi có mẫu câu dùng tới (beat bị vars.lines ghi đè chữ thì không cần)
  const sub = (p, vs, where) => subT(p, vs, where, D);
  for (const [k, d] of Object.entries(D)) if (vars[k] != null && d.maxWords && V.tokens(vars[k]).length > d.maxWords) throw new Error(`vars.${k} "${vars[k]}" dài ${V.tokens(vars[k]).length} từ > ${d.maxWords}`);
  const whoOf = role => { if (role === 'kit') return 'kit'; const opts = (sd.roles || {})[role]; if (!opts) throw new Error(`bối cảnh ${scene} của khuôn ${tpl.id} không có vai "${role}"`); return (v.cast || {})[role] || opts[0]; };
  for (const [role, who] of Object.entries(v.cast || {})) vars[role] = vars[role] || who.charAt(0).toUpperCase() + who.slice(1);
  const lines = [];
  for (const b of tpl.beats) {
    const o = ov[b.id];
    if (o === null || (b.optional && o == null)) continue; // beat tuỳ chọn: chỉ có khi vars.lines ghi
    const oo = typeof o === 'string' ? { text: o } : o || {};
    const text = oo.text != null ? sub(oo.text, vars, `lines.${b.id}`) : sub(pick(b.text, seed, b.id, vars), vars, `beat ${b.id}`);
    const line = { who: oo.who || whoOf(b.role), beat: b.beat, text: capFirst(text), expr: oo.expr != null ? oo.expr : b.expr || '', gesture: oo.gesture != null ? oo.gesture : b.gesture || '' };
    if (b.punch || oo.punch) line.punch = true;
    lines.push(line);
  }
  const tags = (v.hashtags || tpl.hashtags.slice(0, 3)).map(h => String(h).replace(/^#/, ''));
  const s = (k, def) => { const x = v[k] != null ? sub(v[k], vars, k) : def != null ? sub(pick(def, seed, k, vars), vars, k) : undefined; return x != null && ['title', 'hook', 'caption'].includes(k) ? capFirst(x) : x; };
  const script = {
    title: s('title', tpl.title), hook: s('hook', tpl.hook), scene, time: v.time || 'day', format_id: v.format_id || sd.format_id || tpl.format_id, template: tpl.id,
    lines, keywords: (v.keywords || tpl.keywords || []).map(k => sub(k, vars, 'keywords')),
    ...(v.wrong || tpl.wrong ? { wrong: s('wrong', tpl.wrong) } : {}), ...(v.right || tpl.right ? { right: s('right', tpl.right) } : {}),
    caption: s('caption', tpl.caption), hashtags: tags, link: 'https://lexkite.com/',
  };
  return { _note: `Sinh tự động từ content/video/templates/${tpl.id}.json + vars (node scripts/video/template.mjs build) – ĐỪNG sửa tay: sửa file vars rồi build lại.${v.note ? ' ' + v.note : ''}`, topic: v.topic, format: 'short', template: tpl.id, script };
}

// ---------- lint ----------
// Trả { gates: [{k, ok, level:'error'|'warn', note}], stage, variant, est } – level warn không làm trượt
// seed mặc định = seed của video-sample.yml (render --local: `${ID}|${job.seed}` = 'local|'); SEEDS thêm = job Studio khác seed → phòng/clip khác
export const SEEDS = ['studio-1', 'studio-2', 'studio-3', 'studio-4'];
export function preflight(raw, ctx = loadCtx(), { tpl: tplIn = undefined, seed = 'local|', seeds = SEEDS } = {}) {
  const gates = [], g = (k, ok, note, level = 'error') => gates.push({ k, ok: !!ok, note, level });
  const job = raw.script ? { id: 'lint', format: 'short', topic: raw.topic || raw.script.title || 'local', ...raw } : { id: 'lint', format: 'short', topic: raw.title || 'local', script: raw };
  const sc0 = job.script;
  if (!sc0 || !Array.isArray(sc0.lines) || !sc0.lines.length) { g('script', false, 'kịch bản không có lines'); return { gates }; }
  const { casting, formats, manifest, shared } = ctx;
  // 1) Kiểm kịch bản của Studio (cùng hàm scriptApprove chặn) – chạy trên bản normScript-tương-đương (who chữ thường)
  const ck = checkScript(sc0, job.format);
  g('studio', ck.ok, ck.ok ? `checkScript OK (~${ck.sec} s)` : ck.errs.join(' · '));
  for (const w of ck.warns) g('studio', false, w, 'warn');
  // 2) Cổng brand + CTA (y hệt bước qa)
  const bg = V.brandGate(sc0); g('brand', bg.ok, bg.note);
  const cg = V.ctaGate(sc0); g('cta', cg.ok, cg.note);
  const claim = [sc0.title, sc0.hook, sc0.caption, ...sc0.lines.map(l => l.text)].join(' ').match(CLAIMS);
  g('claims', !claim, claim ? `câu hứa hẹn/khẳng định không kiểm chứng: "${claim[0]}"` : 'không hứa hẹn/khẳng định quá đà');
  // 3) Hook ≤ 2 s (ước lượng âm tiết; render đo thật trên giọng Kokoro)
  const hookSec = V.hookEstSec(sc0.lines[0].text);
  g('hook', sc0.lines[0].beat === 'hook' && hookSec <= V.HOOK_MAX, `câu hook ~${hookSec} s (≤ ${V.HOOK_MAX} s, ước lượng âm tiết)`);
  if (sc0.hook) g('hook-text', V.tokens(sc0.hook).length <= 6, `chữ hook trên hình "${sc0.hook}" ${V.tokens(sc0.hook).length} từ (≤ 6)`);
  // 4) Thời lượng (bố cục align) + phụ đề: vùng an toàn theo câu dài nhất, chữ ASS khớp kịch bản 100% (ký tự { } \ bị lọc → lệch)
  const est = V.estVideoSec(sc0.lines), max = job.format === 'lesson' ? 480 : 60;
  g('duration', est <= max, `~${est} s (≤ ${max} s, gồm end card)`);
  const maxChars = Math.max(...sc0.lines.map(l => String(l.text).length)), safe = V.subsSafeArea({ w: 1080, h: 1920, format: job.format, maxChars });
  g('subs-safe', safe.ok, `câu dài nhất ${maxChars} ký tự → ${safe.rows} dòng phụ đề, y ${safe.top}–${safe.bottom}`);
  const lay = V.layoutLines(sc0.lines.map(l => V.estLineSec(l.text)), { gap: V.LINE_GAP }), sl = sc0.lines.map((l, i) => ({ ...l, ...lay[i] }));
  const words = sl.flatMap((l, i) => V.evenTiming(V.tokens(l.text), l.start, l.end).map(x => ({ line: i, ...x })));
  const ex = V.subsExact(V.buildAss({ w: 1080, h: 1920, format: job.format, lines: sl, words, keywords: sc0.keywords || [], hook: sc0.hook || sl[0].text }), sl);
  g('subs-text', ex.ok, ex.ok ? 'phụ đề ASS khớp kịch bản 100%' : `phụ đề sẽ lệch kịch bản ở câu ${ex.bad.map(i => i + 1).join(', ')} (bỏ ký tự { } \\)`);
  const lineNorm = sc0.lines.map(l => ' ' + V.tokens(l.text).map(V.norm).join(' ') + ' ');
  const missKw = (sc0.keywords || []).filter(k => { const ks = V.tokens(k).map(V.norm).filter(Boolean); return !ks.length || !lineNorm.some(t => t.includes(' ' + ks.join(' ') + ' ')); });
  g('keywords', (sc0.keywords || []).length > 0 && !missKw.length, missKw.length ? `từ khóa không có trong lời thoại (không được tô sáng): ${missKw.join(', ')}` : (sc0.keywords || []).length ? `${sc0.keywords.length} từ khóa đều xuất hiện trong lời thoại` : 'chưa có từ khóa');
  // 5) Biến thể + cổng nhất quán – đúng thứ tự render: variant (đổi vai nếu cần) → cast (buildStage)
  let v = null, stage = null;
  try { v = X.pickVariant({ job, formats, casting, manifest, history: [], seed, exists: () => true, existsRepo: () => true, date: new Date() }); }
  catch (e) { g('variety', false, `không chọn được biến thể: ${e.message}`); }
  if (v) {
    g('variety', !v.relaxed, `${v.format.id} · ${v.setting.room}${v.relaxed ? ' – không có tổ hợp hợp luật' : ''}`);
    if (v.recast) g('cast', false, `render sẽ ĐỔI VAI ${v.cast.from.join('+')} → ${v.cast.to.join('+')}: ${v.recastReason || ''}`);
    const job2 = { ...job, script: v.recast ? X.applyCast(sc0, v.cast) : sc0 };
    stage = V.buildStage({ job: job2, casting, manifest, exists: () => true, variant: v });
    const virt = stage.segs.filter(s => s.room.virtual).map(s => s.scene);
    g('room', !virt.length, virt.length ? `bối cảnh ${virt.join(', ')} chưa có phòng ready trên CI → render strict dừng ở bước cast` : `phòng ${stage.segs.map(s => s.room.id).join(' → ')}`);
    const cv = V.consistencyVerdict(stage.fails);
    // cùng kịch bản với seed khác (job Studio) → phòng/biến thể khác: lỗi ở bất kỳ seed nào cũng chặn (video đó sẽ bị khoá đăng)
    const other = new Map();
    for (const sd of seeds) {
      try {
        const v2 = X.pickVariant({ job, formats, casting, manifest, history: [], seed: sd, exists: () => true, existsRepo: () => true, date: new Date() });
        const st2 = V.buildStage({ job: { ...job, script: v2.recast ? X.applyCast(sc0, v2.cast) : sc0 }, casting, manifest, exists: () => true, variant: v2 });
        for (const r of V.consistencyVerdict(st2.fails).reasons) if (!cv.reasons.includes(r)) other.set(r, `${v2.setting.room}`);
        if (v2.recast && !v.recast) other.set(`render sẽ đổi vai ${v2.cast.from.join('+')} → ${v2.cast.to.join('+')}`, v2.setting.room);
      } catch (e) { other.set(`không chọn được biến thể: ${e.message}`, sd); }
    }
    g('consistency-seeds', !other.size, other.size ? [...other].map(([r, room]) => `${room}: ${r}`).slice(0, 6).join(' | ') : `ổn định với ${seeds.length} seed khác`);
    g('consistency', cv.ok, cv.ok ? `chủ đề ${stage.topic} · ${stage.lines.map((l, i) => `${i + 1}:${l.who}/${l.emotion}${(l.actors.find(a => a.role === 'speaker') || {}).asset ? '=' + l.actors.find(a => a.role === 'speaker').asset.id : ''}`).join(' ')}` : cv.reasons.join(' | '));
    // khuôn hình được ghim (format_id) bỏ qua lọc chủ đề/số người nói của variants → kiểm ở đây
    if (sc0.format_id) {
      const f = formats.formats.find(x => x.id === sc0.format_id), n = X.speakersOf(job2.script).length;
      g('format', !!f, f ? `khuôn hình ${f.id}` : `format_id "${sc0.format_id}" không có trong formats.json`);
      if (f) {
        g('format', f.topics === 'any' || f.topics.includes(stage.topic), `chủ đề ${stage.topic} ${f.topics === 'any' || f.topics.includes(stage.topic) ? 'hợp' : 'không hợp'} khuôn ${f.id} (${f.topics === 'any' ? 'any' : f.topics.join(', ')})`);
        g('format', n >= f.cast[0] && n <= f.cast[1], `${n} người nói (khuôn ${f.id} cần ${f.cast[0]}–${f.cast[1]})`);
        const pb = (f.payoff || {}).beat; g('format', !pb || sc0.lines.some(l => l.beat === pb), `beat payoff "${pb}" ${sc0.lines.some(l => l.beat === pb) ? 'có' : 'THIẾU'} (${(f.payoff || {}).type})`);
        const STATS = /\d+(?:[.,]\d+)?\s?%|\bpercent\b/i, lbl = [f.hook.badge, ...Object.values(f.labels || {}).map(x => x.text)].join(' ');
        g('format', !STATS.test(lbl), STATS.test(lbl) ? `nhãn/badge khuôn có số liệu bịa: "${lbl}"` : 'nhãn khuôn không có số liệu');
      }
    }
  }
  // 6) Thẻ payoff (wrong/right) vừa thẻ
  for (const k of ['wrong', 'right']) if (sc0[k]) g('card', String(sc0[k]).length <= ((shared.card || {}).maxChars || 32), `thẻ ${k} "${sc0[k]}" ${String(sc0[k]).length} ký tự (≤ ${(shared.card || {}).maxChars || 32})`);
  // 7) Luật khuôn nội dung
  const tid = tplIn === undefined ? sc0.template || raw.template : tplIn && tplIn.id;
  const tpl = tplIn || (tid ? (() => { try { return loadTemplate(tid); } catch (e) { g('template', false, e.message); return null; } })() : null);
  if (tpl) templateRules(tpl, job, sc0, stage, shared, g, est);
  else if (!tid) g('template', true, 'không gắn khuôn nội dung (chỉ cổng chung)', 'warn');
  return { gates, stage, variant: v, est };
}

function templateRules(tpl, job, sc, stage, shared, g, est) {
  const sd = tpl.scenes[sc.scene];
  g('t-scene', !!sd, sd ? `bối cảnh ${sc.scene} thuộc khuôn ${tpl.id}` : `khuôn ${tpl.id} không cho bối cảnh "${sc.scene}" (được: ${Object.keys(tpl.scenes).join(', ')})`);
  if ((sd && sd.format_id) || tpl.format_id) g('t-format', sc.format_id === ((sd && sd.format_id) || tpl.format_id), `format_id ${sc.format_id} (khuôn cần ${(sd && sd.format_id) || tpl.format_id})`, 'warn');
  // thứ tự beat: dãy id beat của khuôn (bỏ beat tuỳ chọn) – so theo beat + vai
  const want = tpl.beats, got = sc.lines; let j = 0; const bad = [];
  got.forEach((l, i) => {
    while (j < want.length && want[j].beat !== l.beat && want[j].optional) j++;
    const b = want[j];
    if (!b || b.beat !== l.beat) { bad.push(`câu ${i + 1} (${l.beat}) sai thứ tự – khuôn: ${want.map(x => x.id + (x.optional ? '?' : '')).join(' → ')}`); return; }
    const who = b.role === 'kit' ? ['kit'] : sd ? (sd.roles || {})[b.role] || [] : [];
    if (!who.includes(l.who)) bad.push(`câu ${i + 1} (${b.id}): ${l.who} không đóng được vai "${b.role}" ở ${sc.scene} (được: ${who.join(', ') || '—'})`);
    const n = V.tokens(l.text).length, sec = b.beat === 'hook' ? V.hookEstSec(l.text) : V.estLineSec(l.text);
    if (b.maxWords && n > b.maxWords) bad.push(`câu ${i + 1} (${b.id}) ${n} từ > ${b.maxWords}`);
    if (b.minWords && n < b.minWords) bad.push(`câu ${i + 1} (${b.id}) ${n} từ < ${b.minWords}`);
    if (b.maxSec && sec > b.maxSec) bad.push(`câu ${i + 1} (${b.id}) ~${sec} s > ${b.maxSec} s`);
    const emo = stage ? stage.lines[i].emotion : V.lineEmotion(l);
    if (l.who !== 'kit' && b.emotions && !b.emotions.includes(emo)) bad.push(`câu ${i + 1} (${b.id}): cảm xúc suy từ câu là "${emo}" – beat này cần ${b.emotions.join('|')} (chọn clip theo cảm xúc; xem _shared.json emotions.cues)`);
    const voc = l.who === 'kit' ? shared.kit : (shared.emotions[emo] || {});
    if (voc.expr && !voc.expr.includes(l.expr)) bad.push(`câu ${i + 1} (${b.id}): biểu cảm "${l.expr}" ngoài từ vựng của "${l.who === 'kit' ? 'kit' : emo}" (${voc.expr.join(', ')})`);
    if (voc.gesture && !voc.gesture.includes(l.gesture || '')) bad.push(`câu ${i + 1} (${b.id}): cử chỉ "${l.gesture}" ngoài từ vựng (${voc.gesture.map(x => x || '""').join(', ')})`);
    for (const m of b.must || []) { const want2 = (sc.keywords || [])[+String(m).slice(3)]; if (want2 && !V.tokens(l.text).map(V.norm).join(' ').includes(V.tokens(want2).map(V.norm).join(' '))) bad.push(`câu ${i + 1} (${b.id}) phải chứa "${want2}"`); }
    if (b.beat === 'tip' && l.who === 'kit' && !/^kit'?s tip:/i.test(l.text.replace('’', "'"))) bad.push(`câu ${i + 1}: mẹo của Kit mở đầu bằng "Kit's tip:"`);
    j++;
  });
  const req = want.filter(b => !b.optional).map(b => b.id), have = new Set(); { let k = 0; got.forEach(l => { while (k < want.length && want[k].beat !== l.beat) k++; if (k < want.length) have.add(want[k++].id); }); }
  const miss = req.filter(id => !have.has(id)); if (miss.length) bad.push(`thiếu beat bắt buộc: ${miss.join(', ')}`);
  g('t-beats', !bad.length, bad.length ? bad.join(' | ') : `${got.length} câu đúng khuôn ${tpl.id} (${got.map(l => l.beat).join(' → ')})`);
  const [lo, hi] = tpl.duration || [15, 45]; g('t-duration', est >= lo && est <= hi, `~${est} s (khuôn ${lo}–${hi} s)`);
  const kw = sc.keywords || [], K = shared.keywords || { min: 1, max: 3, maxWords: 4 };
  g('t-keywords', kw.length >= K.min && kw.length <= K.max && kw.every(k => V.tokens(k).length <= K.maxWords), `${kw.length} từ khóa (${K.min}–${K.max}, mỗi cụm ≤ ${K.maxWords} từ)`);
  const C = shared.caption || {}, tags = sc.hashtags || [], inCap = (String(sc.caption || '').match(/#\w+/g) || []);
  g('t-caption', !!sc.caption && String(sc.caption).length <= (C.maxChars || 150) && !inCap.length, `caption ${String(sc.caption || '').length} ký tự (≤ ${C.maxChars || 150}, hashtag để trong mảng hashtags, không lặp trong caption)`);
  const pool = new Set([...(tpl.hashtags || []), ...((shared.hashtags || {}).base || [])]), [hl, hh] = C.hashtags || [2, 4], badTag = tags.filter(t => !pool.has(t));
  g('t-hashtags', tags.length >= hl && tags.length <= hh && !badTag.length && new Set(tags).size === tags.length, `${tags.length} hashtag (${hl}–${hh})${badTag.length ? ` · ngoài kho: ${badTag.join(', ')}` : ''}`);
  const lvl = tpl.cefr || 'B1', LONG = (shared.cefrLongWords || {})[lvl.split(/[–-]/).pop()] ?? 3, longW = [...new Set(sc.lines.flatMap(l => V.tokens(l.text)).filter(w => V.syllables(w) >= 5))];
  g('t-cefr', longW.length <= LONG, `${longW.length} từ ≥ 5 âm tiết (≤ ${LONG} cho ${lvl})${longW.length ? ': ' + longW.join(', ') : ''}`, 'warn');
}

export const failed = r => r.gates.filter(x => !x.ok && x.level === 'error');
function printReport(file, r) {
  const f = failed(r);
  console.log(`${f.length ? '✗' : '✓'} ${file}`);
  for (const x of r.gates) if (!x.ok || process.env.LINT_VERBOSE) console.log(`   ${x.ok ? '✓' : x.level === 'warn' ? '⚠' : '✗'} ${x.k}: ${x.note}`);
  return f.length;
}
const expand = a => (fs.existsSync(a) && fs.statSync(a).isDirectory() ? fs.readdirSync(a).filter(f => f.endsWith('.json')).sort().map(f => path.join(a, f)) : [a]);

// ---------- build: ví dụ (vars) → samples ----------
export function examples() {
  return fs.existsSync(EX_DIR) ? fs.readdirSync(EX_DIR).filter(f => f.endsWith('.vars.json')).sort().map(f => {
    const vars = readJson(path.join(EX_DIR, f)), id = f.split('--')[0];
    return { file: path.join(EX_DIR, f), id, vars, out: path.join(SAMPLES, f.replace(/\.vars\.json$/, '.json')) };
  }) : [];
}
const stable = o => JSON.stringify(o, null, 1) + '\n';

// ---------- check-templates: kiểm chính khuôn ----------
export function checkTemplate(tpl, ctx = loadCtx()) {
  const errs = [], E = m => errs.push(`${tpl.id || '?'}: ${m}`), { casting, formats, shared } = ctx;
  for (const k of ['id', 'name', 'goal', 'beats', 'scenes', 'title', 'hook', 'caption', 'hashtags', 'writing']) if (tpl[k] == null) E(`thiếu trường "${k}"`);
  if (!tpl.beats || !tpl.scenes) return errs;
  const fids = new Set([tpl.format_id, ...Object.values(tpl.scenes).map(s => s.format_id)].filter(Boolean));
  for (const f of fids) if (!formats.formats.some(x => x.id === f)) E(`format_id "${f}" không có trong formats.json`);
  if (!fids.size) E('thiếu format_id (khuôn hình Remotion)');
  const ids = tpl.beats.map(b => b.id); if (new Set(ids).size !== ids.length) E('id beat bị trùng');
  if (tpl.beats[0].beat !== 'hook' || tpl.beats[0].optional) E('beat đầu phải là hook (bắt buộc)');
  if (tpl.beats[tpl.beats.length - 1].beat !== 'cta') E('beat cuối phải là cta');
  for (const b of BEATS.filter(x => x !== 'situation')) if (!tpl.beats.some(x => x.beat === b && !x.optional)) E(`thiếu beat bắt buộc "${b}" (studio checkScript)`);
  const declared = new Set([...Object.keys(tpl.vars || {}), ...new Set(Object.values(tpl.scenes).flatMap(s => Object.keys(s.roles || {})))]);
  const pats = [...[tpl.title, tpl.hook, tpl.caption, tpl.wrong, tpl.right, ...(tpl.keywords || [])].flat(), ...tpl.beats.flatMap(b => [b.text].flat())].filter(Boolean);
  for (const p of pats) for (const k of varsIn(p)) if (!declared.has(k)) E(`biến {{${k}}} chưa khai báo trong vars/roles`);
  for (const b of tpl.beats) {
    if (!BEATS.includes(b.beat)) E(`beat ${b.id}: "${b.beat}" không thuộc ${BEATS.join(', ')}`);
    if (!b.text || ![b.text].flat().length) E(`beat ${b.id}: thiếu mẫu câu text`);
    if (b.role !== 'kit' && !(b.emotions || []).length) E(`beat ${b.id}: thiếu emotions (cảm xúc chọn clip)`);
    for (const m of b.must || []) if (!/^kw:\d+$/.test(m) || +m.slice(3) >= (tpl.keywords || []).length) E(`beat ${b.id}: must "${m}" phải là kw:<chỉ số từ khóa của khuôn>`);
    for (const e of b.emotions || []) if (!EMOTIONS.includes(e)) E(`beat ${b.id}: cảm xúc "${e}" lạ`);
    const voc = b.role === 'kit' ? [shared.kit] : (b.emotions || []).map(e => shared.emotions[e] || {});
    if (b.expr && !voc.some(x => (x.expr || []).includes(b.expr))) E(`beat ${b.id}: expr "${b.expr}" ngoài từ vựng`);
    if (b.gesture && !voc.some(x => (x.gesture || []).includes(b.gesture))) E(`beat ${b.id}: gesture "${b.gesture}" ngoài từ vựng`);
  }
  for (const [scene, sd] of Object.entries(tpl.scenes)) {
    const cs = casting.scenes[scene]; if (!cs) { E(`bối cảnh "${scene}" chưa có trong casting.json`); continue; }
    for (const [role, whos] of Object.entries(sd.roles || {})) for (const w of whos) if (!cs.cast.includes(w)) E(`${scene}: ${w} (vai ${role}) không thuộc dàn bối cảnh (${cs.cast.join(', ')})`);
    for (const b of tpl.beats) if (b.role !== 'kit' && !(sd.roles || {})[b.role]) E(`${scene}: thiếu vai "${b.role}" cho beat ${b.id}`);
  }
  const pool = new Set([...(tpl.hashtags || []), ...((shared.hashtags || {}).base || [])]); if (pool.size < 3) E('kho hashtag < 3');
  if (!(tpl.writing.do || []).length || !(tpl.writing.dont || []).length) E('writing cần do + dont');
  return errs;
}

// ---------- coverage: khuôn × bối cảnh bị chặn + clip cần tạo ----------
const SUGGEST = { ask: ['think_aha'], wrong: ['shock_laugh'], right: ['q_talk_thumbs', 'shock_laugh'], explain: ['talk_gesture', 'q_talk_nod'], talk: ['talk_gesture', 'q_talk_nod'], cta: ['wave_clasp'] };
export function coverage(ctx = loadCtx()) {
  const { casting, manifest } = ctx, rows = [], need = new Map();
  for (const tpl of listTemplates()) for (const [scene, sd] of Object.entries(tpl.scenes)) {
    const cs = casting.scenes[scene] || {}, outfit = cs.outfit || 'office', probs = [];
    if (!(manifest.rooms || []).some(r => r.tag === scene && (r.time || 'day') === 'day')) probs.push(`phòng ${scene} (day) chưa ready`);
    const roleWho = Object.fromEntries(Object.entries(sd.roles || {}).map(([r, w]) => [r, w[0]]));
    for (const who of new Set(Object.values(roleWho))) {
      const clips = (manifest.clips || []).filter(c => c.who === who && (c.outfit || 'office') === outfit), used = new Set();
      const beats = tpl.beats.filter(b => b.role !== 'kit' && roleWho[b.role] === who && !b.optional).map(b => ({ b, opts: clips.filter(c => V.isSpeakerClip(c) && (b.emotions || []).some(e => (c.tags || []).some(t => (V.EMOTION_TAGS[e] || []).includes(t)))) })).sort((a, c) => a.opts.length - c.opts.length);
      for (const { b, opts } of beats) {
        const c = opts.find(x => !used.has(x.id));
        if (c) { used.add(c.id); continue; }
        // tên clip gợi ý theo quy ước kho phông xanh (<who>_<động tác>): mỗi beat thiếu = 1 clip riêng (clip không lặp trong 1 video)
        const name = (SUGGEST[b.emotions[0]] || ['talk_gesture']).map(x => `${who}_${x}`).find(x => !used.has('sug:' + x)) || `${who}_${SUGGEST[b.emotions[0]][0]}_2`;
        used.add('sug:' + name); const key = `${name} (${outfit}, nói – ${b.emotions.join('|')})`;
        probs.push(`clip ${key} cho beat ${b.id}`); need.set(key, (need.get(key) || new Set()).add(`${tpl.id}@${scene}`));
      }
      if (Object.values(roleWho).length > 1 && !clips.some(V.isListenerClip)) { const key = `${who}_listen_thumbs (${outfit}, nghe)`; probs.push(`clip ${key}`); need.set(key, (need.get(key) || new Set()).add(`${tpl.id}@${scene}`)); }
    }
    rows.push({ template: tpl.id, scene, ok: !probs.length, probs });
  }
  return { rows, need: [...need].map(([clip, s]) => ({ clip, unblocks: [...s].sort() })).sort((a, b) => b.unblocks.length - a.unblocks.length) };
}

// ---------- CLI ----------
async function main(argv) {
  const [cmd, ...a] = argv, opt = n => { const i = a.indexOf('--' + n); return i >= 0 ? a[i + 1] : undefined; };
  if (cmd === 'fill') {
    if (a.length < 2) throw new Error('dùng: fill <template-id|file> <vars.json> [--out file]');
    const out = fill(loadTemplate(a[0]), readJson(path.resolve(a[1])));
    if (opt('out')) { fs.writeFileSync(opt('out'), stable(out)); console.log(`✓ ${opt('out')}`); } else process.stdout.write(stable(out));
    return 0;
  }
  if (cmd === 'lint') {
    const files = a.filter(x => !x.startsWith('--')).flatMap(expand); if (!files.length) throw new Error('dùng: lint <script.json|thư mục>…');
    const ctx = loadCtx(); let bad = 0;
    for (const f of files) bad += printReport(rel(f), preflight(readJson(path.resolve(f)), ctx)) ? 1 : 0;
    console.log(`${bad ? '✗' : '✓'} lint: ${files.length - bad}/${files.length} kịch bản qua cổng tĩnh`);
    return bad ? 1 : 0;
  }
  if (cmd === 'build') {
    const check = a.includes('--check'); let stale = 0;
    for (const e of examples()) {
      const txt = stable(fill(loadTemplate(e.id), e.vars));
      if (check) { if (!fs.existsSync(e.out) || fs.readFileSync(e.out, 'utf8') !== txt) { stale++; console.log(`✗ ${rel(e.out)} lệch với ${rel(e.file)} (chạy: node scripts/video/template.mjs build)`); } }
      else { fs.writeFileSync(e.out, txt); console.log(`✓ ${rel(e.out)}`); }
    }
    return stale ? 1 : 0;
  }
  if (cmd === 'check-templates') {
    const ctx = loadCtx(), errs = listTemplates().flatMap(t => checkTemplate(t, ctx));
    errs.forEach(e => console.log('✗ ' + e)); console.log(`${errs.length ? '✗' : '✓'} ${listTemplates().length} khuôn${errs.length ? ` · ${errs.length} lỗi` : ''}`);
    return errs.length ? 1 : 0;
  }
  if (cmd === 'coverage') {
    const c = coverage();
    for (const r of c.rows) console.log(`${r.ok ? '✓' : '✗'} ${r.template} @ ${r.scene}${r.ok ? '' : ' – ' + r.probs.join(' · ')}`);
    if (c.need.length) { console.log('\nClip cần tạo (mở khoá nhiều khuôn nhất trước):'); for (const n of c.need) console.log(`  · ${n.clip} → ${n.unblocks.join(', ')}`); }
    return 0;
  }
  console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).slice(0, 8).join('\n'));
  return cmd ? 1 : 0;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(c => process.exit(c), e => { console.error('✗ template: ' + e.message); process.exit(1); });
}
