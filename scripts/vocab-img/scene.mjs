#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
// Ảnh cho MỌI nghĩa (chủ 24/10: ~20.000 từ đều có ảnh AI, nhẹ, cùng một gia đình) – phân loại + prompt + thẻ cảnh.
//   kind(k, e, lexname, card) → 'object' (nghĩa cụ thể: tranh vật/hành động s1 như cũ – strict.mjs)
//                             | 'concept' (hư từ: ô SVG tất định – concept.mjs, không AI)
//                             | 'scene'  (nghĩa trừu tượng: tranh CẢNH của CÂU VÍ DỤ, s1; thẻ hiện câu ví dụ ngay dưới ảnh)
// Thẻ cảnh `content/lexicon/vimg-scenes.json` {k: {ex, sc, cap, who, skip?}}: ex = câu ví dụ CỦA KHO (không bịa câu mới – nội dung học
// không đổi), sc = mô tả hình (người, việc, nơi; không chữ/biển/màn hình chữ), cap = chú thích ngắn trung tính cho giám khảo CLIP.
// Không có câu vẽ được → skip → nghĩa đó dùng ô khái niệm chữ (concept.mjs họ 'type') thay vì ảnh gây hiểu lầm.
//   node scripts/vocab-img/scene.mjs --pilot [--n 60] [--fn 20]          → in {items, scene, concept} (chọn tất định, rải đều cấp/loại từ)
//   node scripts/vocab-img/scene.mjs --cards --keys keys.json --write   → viết thẻ cảnh còn thiếu (ai-pool: GrabCast Cloudflare → GrabCast Gemini/Groq → tk2)
//   node scripts/vocab-img/scene.mjs --dry --keys keys.json             → in prompt
import fs from 'fs';
import path from 'path';
import { STYLE, PEOPLE, fnv, scrub, negHit, classOf } from './style.mjs';
import { ruleCheck } from './strict.mjs';
import { isFunction } from './concept.mjs';

export const SCENE_V = 'e5';   // e5 (30/10): như e4 nhưng check hỏi NGHĨA def (không lặp ps, không chứa từ, không 'indicating/represents') – mọi thẻ e4 viết lại
// e4 (29/10): thẻ = câu cảnh ngắn vẽ được (ps ≤ 20 từ) + câu hỏi kiểm (check) + điểm vẽ được (draw) – prompt ngắn, giám khảo chấm đúng câu cảnh
// MỘT bộ token phong cách cho cả 20k (cùng STYLE.base s1 đã duyệt) + phần riêng cho cảnh: tối đa 2 người, bố cục rõ, không chữ.
// e2 (nhãn 24/10, 245 ảnh): FLUX schnell không có negative prompt – nhắc 'signs/speech bubbles' lại làm HIỆN biển/bong bóng chữ (HOSPITAL, BANK, HOTEL,
// bong bóng thoại chữ vô nghĩa ở 30/74 ảnh bài học) → mô tả TÍCH CỰC: tường/mặt phẳng trơn, người giao tiếp bằng nét mặt + cử chỉ.
// e3 (25/10, docs/VOCAB-IMG-STYLE.md – chuẩn học từ Drops/Duolingo/Lingokids): MỘT khoảnh khắc, đọc được ở 96–160 px – chủ thể lớn giữa khung, nền kem trơn,
// tương phản cao, nhân vật kiểu Mỹ đa dạng, cảm xúc RÕ trên mặt; khuôn theo lớp từ (SCENE_CLASS); phủ định = gọt thẻ (scrub), KHÔNG nhắc trong prompt.
export const SCENE_STYLE = 'Wordless flat vector illustration of one everyday moment, readable as a tiny thumbnail. At most two main people, friendly modern American look, ' +
  'simple geometric shapes, soft rounded edges, clean dark teal outlines, bold clear silhouettes, big expressive faces, ' +
  'limited palette of deep teal, warm orange, golden yellow, soft pink and cream, plain solid light cream background, the people and the key objects large and centered, ' +
  'high contrast, plain walls and plain surfaces, people communicate only with faces and hand gestures, purely pictorial. Friendly, culturally neutral, suitable for young children.';
// e4 (29/10): prompt cũ ~1.000 ký tự (thẻ 320 + phong cách 600) → mô hình bỏ ý sau, giám khảo hỏi câu ví dụ còn ảnh vẽ thẻ → 2–7 % đạt.
// Phong cách e4 NGẮN (cùng bảng màu/nét s1), đặt SAU câu cảnh; không nhắc chữ/biểu tượng (nhắc → hiện ra).
export const SCENE_STYLE_E4 = 'Flat vector illustration, simple rounded shapes, clean dark teal outlines, big expressive faces, deep teal, warm orange, golden yellow and soft pink, ' +
  'plain light cream background, the people and key objects large and centered, purely pictorial, friendly, suitable for young children.';
// khuôn theo lớp từ (nghĩa CẢNH = trừu tượng): câu nhấn thêm sau mô tả thẻ – đặt TRƯỚC SCENE_STYLE (FLUX ưu tiên đầu prompt)
export const SCENE_CLASS = {
  noun: 'The one key moment that shows the idea fills the frame, every detail supports it.',
  verb: 'The action is caught at its clearest moment, whole body and hands visible, the pose and face make the action obvious.',
  adj: 'The quality is exaggerated and obvious at first glance; when two things are shown they stand side by side, one clearly with the quality and one clearly without.',
  adv: 'The way the action is done is exaggerated and obvious at first glance, shown by pose, speed and face.',
};
// chính sách seed: API FLUX không nhận seed → tái lập = băm nội dung; biến thể bố cục + người TẤT ĐỊNH theo fnv(khoá) (không ngẫu nhiên giữa các lần chạy)
// e3: bỏ 'wide shot showing the whole place' (người/vật quá nhỏ ở 96–160 px)
const FRAMES = ['medium shot', 'close medium shot', 'medium shot, three-quarter view', 'medium close-up'];
export const RETRY_SCENE = 'Simpler composition: only the essential people and objects, larger, nothing in the background.';

/** ghép thẻ từ lượt fill (scene-publish): thẻ mới, hoặc nâng lên SCENE_V, hoặc cùng bản mà đếm hỏng e4bad tăng – không đè thẻ hiện hành */
export const cardWins = (o, v) => !!v && (!o || (v.v === SCENE_V && o.v !== SCENE_V) || (o.v === v.v && o.v !== SCENE_V && (v.e4bad || 0) > (o.e4bad || 0)));
/** loại ảnh của một nghĩa */
export function kind(k, e, lexname = '', card = null) {
  if (!e) return null;
  if (isFunction(k, e)) return 'concept';
  if (ruleCheck(k, e, lexname).ok && !(card && card.skip)) return 'object';
  return 'scene';
}
/** prompt cảnh từ thẻ (sc) – người trong thẻ ('a person', 'two people', 'a child') → xoay vòng tất định đa dạng */
export function promptScene(k, sc, attempt = 1) {
  if (sc && sc.ps) {   // e4: câu cảnh ngắn → người kiểu Mỹ đa dạng theo giới (tất định), khung theo biến thể, phong cách ngắn
    const h = fnv(k); let i = 0;
    const pick = g => { const L = PEOPLE.filter(p => new RegExp('\\ba ' + g + '\\b').test(p)); return L[(h >>> (3 * i++)) % L.length]; };
    let s = scrub(String(sc.ps).replace(/["“”]/g, ''), String(k).split('#')[0]).replace(/\ban? (woman|man)\b/gi, (m, g) => pick(g.toLowerCase()));
    const fr = FRAMES[(h + attempt - 1) % FRAMES.length];
    return `Illustration, ${fr}: ${s.replace(/\.+$/, '')}.${attempt > 1 && attempt % 2 === 0 ? ' ' + RETRY_SCENE : ''} ${SCENE_STYLE_E4}`;
  }
  // >>> (không >>): fnv không dấu, >> 3 ra số ÂM → PEOPLE[-n] = undefined ("undefined (interviewer)" trong prompt e2)
  const h = fnv(k), raw = String(sc.sc || '');
  // giới tính thẻ ghi ngay sau person A/B ('person A, a young man') → chọn người CÙNG giới (e2 ghép 'a woman with … , a young man')
  const sex = t => { const m = raw.match(new RegExp('\\bperson ' + t + '\\b\\s*[,(]?\\s*(?:an? )?(?:\\w+ ){0,2}?(woman|man|girl|boy)\\b', 'i')); return m ? (/woman|girl/i.test(m[1]) ? 'woman' : 'man') : ''; };
  const pick = (g, i, not) => { const L = PEOPLE.filter(p => (!g || new RegExp('\\ba ' + g + '\\b').test(p)) && p !== not); return L[i % L.length]; };
  const a = pick(sex('A'), h), b = pick(sex('B'), h >>> 3, a);
  let s = scrub(String(sc.sc || '').replace(/["“”]/g, ''), String(k).split('#')[0]);   // gọt mệnh đề có biểu tượng/chữ (bóng đèn, bong bóng…) của thẻ cũ
  s = s.replace(/\bperson A\b/gi, a).replace(/\bperson B\b/gi, b).replace(/\ba person\b/i, a).replace(/\banother person\b/i, b);
  // biến thể v (fill: tới 6 lần/nghĩa, nhận lần ĐẦU qua giám khảo): API không nhận seed → đổi khung hình theo v (tất định), v chẵn = bố cục đơn giản hơn
  const fr = FRAMES[(h + attempt - 1) % FRAMES.length];
  return `Illustration, ${fr}: ${s.replace(/\.+$/, '')}. ${SCENE_CLASS[classOf(k)]}${attempt > 1 && attempt % 2 === 0 ? ' ' + RETRY_SCENE : ''} ${SCENE_STYLE}`;
}

// Bộ lọc an toàn prompt của Cloudflare (bad_request) → viết lại TRUNG TÍNH (không bao giờ gửi lại y nguyên): thay từ nhạy cảm, bỏ chi tiết cơ thể/xung đột, thêm khung gia đình.
const SOFT = [[/\b(blood|bleeding|bloody|wound(ed)?|injur(y|ies|ed)|hurt)\b/gi, 'a small bandage'], [/\b(guns?|rifles?|pistols?|weapons?|knives|knife|swords?|bombs?|explosi\w*)\b/gi, 'tools'],
  [/\b(kill(s|ed|ing)?|murder\w*|dead|death|dying|corpse)\b/gi, 'sad'], [/\b(fight(s|ing)?|attack\w*|hit(s|ting)?|punch\w*|war|violen\w*)\b/gi, 'disagree'], [/\bsoldiers?\b/gi, 'workers'],
  [/\b(drugs?|pills?|syringe|needle|alcohol|beer|wine|drunk|cigarettes?|smok\w*)\b/gi, 'cups of tea'], [/\b(naked|nude|undress\w*|bikini|underwear|bath(ing)?|shower(ing)?|bed with)\b/gi, 'dressed'],
  [/\b(police|prison|jail|arrest\w*|thief|steal\w*|crime|criminal)\b/gi, 'a guard'], [/\b(child|children|kids?|baby|babies|girl|boy)\b/gi, 'person'], [/\b(sick|ill|disease|hospital|vomit\w*)\b/gi, 'tired']];
export function soften(prompt, level = 1) {
  let s = String(prompt); for (const [re, to] of SOFT) s = s.replace(re, to);
  if (level > 1) s = s.replace(/^Illustration,[^:]*:\s*[^.]*\./, 'Illustration, medium shot: two friendly adults in an everyday calm moment with the key objects of the situation.');
  return s.replace(/Wordless flat vector/, 'Gentle, calm, family-friendly wordless flat vector');
}
// ---- thẻ cảnh: lời nhắn MỘT nguồn (người viết thẻ phải dùng câu ví dụ của kho; được trả skip) ----
export const SCENE_SYS = `You design ONE wordless picture that teaches an English word through its example sentence. A simple flat-vector image model must be able to draw it right in ONE try, and a learner who sees the picture with the sentence under it must understand the word.
For each input item {k, w, pos, def, ex:[sentences]} reply with one JSON object keyed by k:
{"ex": "the ONE input sentence (copied exactly) whose meaning is most VISIBLE", "ps": "the picture as ONE plain sentence of 8-20 words: at most two people named as 'a woman', 'a man', 'a girl' or 'a boy', ONE clear visible action, at most two key objects, optionally one simple place shown by an object in it", "check": "a yes/no question about the MEANING of w (def), answered from the picture alone: ask for the visible sign of that meaning in words different from ps, so the same people and objects WITHOUT that meaning get NO", "cap": "a neutral 6-14 word caption of the picture that does NOT contain the word w", "who": number of people 0-2, "draw": 1-5 how surely a learner understands w from this picture plus the sentence (5 = obvious)}
Hard rules for ps: everything must be visible in a small thumbnail; no text, letters, numbers, prices, money amounts, times, clocks, calendars, schedules, screens, phones showing content, signs, logos, flags, arrows, lightbulbs, hearts, question marks, speech or thought bubbles; no metaphors.
Choose the sentence about actions, emotions, physical states or concrete objects over sentences about prices, times, schedules, numbers, rules, plans, the internet or opinions. Abstract noun = one everyday moment where the idea shows on faces and actions; verb = the clearest moment of the action, whole body visible; adjective = exaggerate the quality or show a contrast pair side by side; groups or comparisons = show both sides.
check must test the meaning, never restate the scene, never contain w, never ask whether something "indicates", "represents" or "illustrates" an idea: bad checks for cheap = "Is a woman handing a coin to a vendor for noodles?" (only repeats ps), "Is the vendor indicating cheap food?".
If no sentence reaches draw >= 4 without breaking the hard rules, reply {"skip": "short reason"} for that k (no picture is better than a wrong one).
Example: cheap (adj) ["The food at the night market is cheap and tasty."] -> {"ex":"The food at the night market is cheap and tasty.","ps":"a woman hands one small coin to a smiling street vendor for a big steaming bowl of noodles","check":"Does the big meal clearly cost very little money?","cap":"a woman buying a big bowl of noodles from a vendor","who":2,"draw":4}
Example: consider (v) ["We are considering moving to the countryside."] -> {"ex":"We are considering moving to the countryside.","ps":"a woman and a man at a kitchen table look thoughtfully at two photos, a city flat and a cottage","check":"Are the two people carefully deciding between two choices before acting?","cap":"a couple comparing photos of a city flat and a cottage","who":2,"draw":4}
Reply JSON only.`;
export const sceneUser = items => JSON.stringify(items.map(({ k, e }) => ({ k, w: e.w, pos: e.pos, def: String(e.def || '').slice(0, 200), ex: [].concat(e.ex || []).filter(Boolean).slice(0, 3).map(s => String(s).slice(0, 220)) })));
// check lặp lại ps (30/10, pilot 40865517506 general#adj: "Are both people smiling and giving thumbs up near a park bench?") → giám khảo nghĩa trả YES cho ảnh sai nghĩa.
// echo = tỉ lệ từ nội dung của check (bỏ hư từ/người, gốc thô 5 ký tự) đã có trong ps; ≥ CHECK_ECHO → loại thẻ, viết lại.
const ECHO_STOP = new Set('a an the is are was were be been being am do does did has have had can could will would should may might must this that these those there here it its they them their he she his her him we you i of to in on at by for with from into onto over under near next and or but so as than then both each either one two three some any all another other very really clearly picture image shown show shows showing visible see seen someone somebody people person woman man women men girl boy girls boys while who what which where when how why not no yes'.split(' '));
const echoWords = s => [...new Set((String(s).toLowerCase().match(/[a-z]+/g) || []).filter(w => w.length > 1 && !ECHO_STOP.has(w)).map(w => w.replace(/(ing|ed|es|s|ly|e)$/, '').slice(0, 5)))];
export const CHECK_ECHO = 0.75;
// pilot 41015594601 (30/10): car rental#n 'Is a woman at a desk with a car model, indicating a car rental service?' → YES cho xe đồ chơi; check có từ đích / 'indicating' = giám khảo đoán theo nhãn, không nhìn nghĩa
export const CHECK_VAGUE = /\b(indicat\w*|represent\w*|symboli[sz]\w*|illustrat\w*|suggest\w*|the (idea|concept|notion) of)\b/i;
const wordRe = w => new RegExp('\\b' + String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
export function checkEcho(ps, check) { const q = echoWords(check), p = new Set(echoWords(ps)); return q.length ? q.filter(w => p.has(w)).length / q.length : 1; }
/** kiểm thẻ cảnh: ex phải là câu của kho, không chữ trong sc, cap không chứa từ, check hỏi nghĩa (không lặp ps) */
export function sceneOk(e, c) {
  if (!c || typeof c !== 'object') return 'no card';
  if (c.skip) return 'skip: ' + String(c.skip).slice(0, 60);
  const exs = [].concat(e.ex || []).map(s => String(s).trim());
  if (!exs.includes(String(c.ex || '').trim())) return 'ex not from lexicon';
  if (c.ps !== undefined || c.draw !== undefined) {   // e4
    const n = String(c.ps || '').trim().split(/\s+/).length;
    if (n < 6 || n > 24) return 'ps not 6-24 words';
    if (!(+c.draw >= 4)) return 'skip: draw ' + c.draw;
    if (!/\?\s*$/.test(String(c.check || ''))) return 'no check question';
    if (checkEcho(c.ps, c.check) >= CHECK_ECHO) return 'check repeats ps';
    if (wordRe(e.w).test(c.check)) return 'check names the word';
    if (CHECK_VAGUE.test(c.check)) return 'check asks for a label';
    if (/\b(text|letters?|words?|sign|label|caption|written|writing|numbers?|price|clock|calendar|screen)\b/i.test(c.ps)) return 'ps asks for text/symbol';
    { const h = negHit(c.ps, e.w); if (h) return 'ps uses a symbol: ' + h; }
    if (!c.cap || new RegExp('\\b' + e.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(c.cap)) return 'cap names the word';
    return '';
  }
  if (!c.sc || String(c.sc).split(/\s+/).length < 8) return 'sc too short';
  if (/\b(text|letters?|words?|sign|label|caption|written|writing|numbers?)\b/i.test(c.sc)) return 'sc asks for text';
  { const h = negHit(c.sc, e.w); if (h) return 'sc uses a symbol: ' + h; }   // VOCAB-IMG-STYLE.md: danh sách phủ định
  if (!c.cap || new RegExp('\\b' + e.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(c.cap)) return 'cap names the word';
  return '';
}

// ---- chọn pilot tất định: N nghĩa trừu tượng rải đều (loại từ × cấp) + M hư từ ----
export function pilot(lex, sel, n = 60, fnN = 20) {
  const abs = [], fn = [];
  for (const [k, e] of Object.entries(lex)) {
    if (!e || !e.ex) continue;
    const t = kind(k, e, (sel[k] || [])[1]);
    if (t === 'concept') fn.push(k); else if (t === 'scene' && ['n', 'v', 'adj', 'adv'].includes(e.pos) && !/\s/.test(e.w)) abs.push(k);
  }
  const by = {}; for (const k of abs) { const e = lex[k], g = e.pos + '|' + (e.level || '?'); (by[g] = by[g] || []).push(k); }
  for (const g of Object.keys(by)) by[g].sort((a, b) => fnv('p|' + a) - fnv('p|' + b));
  const groups = Object.keys(by).sort(), out = [];
  for (let i = 0; out.length < n && i < 1e4; i++) { const g = groups[i % groups.length], q = by[g]; if (q.length) out.push(q.shift()); if (groups.every(x => !by[x].length)) break; }
  const MUST = ['although#conj', 'the#det', 'of#prep', 'because#conj', 'between#prep', 'if#conj'];
  const fns = [...MUST.filter(k => fn.includes(k)), ...fn.filter(k => !MUST.includes(k)).sort((a, b) => fnv('f|' + a) - fnv('f|' + b))].slice(0, fnN);
  return { items: [...out, ...fns], scene: out, concept: fns };
}

if (path.resolve(process.argv[1] || '') === path.resolve(fileURLToPath(new URL(import.meta.url)))) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
  const ROOT = new URL('../../', import.meta.url), P = p => fileURLToPath(new URL(p, ROOT)), rd = p => JSON.parse(fs.readFileSync(P(p), 'utf8'));
  const lex = rd('dist/lexicon.json'), sel = rd('content/lexicon/vimg-select.json').items;
  const QF = 'content/lexicon/vimg-scene-queue.json', SC = 'content/lexicon/vimg-scenes.json', cards = fs.existsSync(P(SC)) ? rd(SC) : { _note: 'Thẻ cảnh cho nghĩa trừu tượng (scene.mjs). ex = câu ví dụ của kho, sc = mô tả hình, cap = chú thích cho giám khảo.', v: SCENE_V, items: {} };
  const keysOf = () => { const f = arg('keys'); return f && fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')).scene || JSON.parse(fs.readFileSync(f, 'utf8')).items) : String(f || '').split(',').filter(Boolean); };
  if (arg('gaps')) {
    // fill: nghĩa loại scene chưa có ảnh, không bị gỡ, không trong hàng chờ (26/10: hàng chờ thử lại sau VIMG_QUEUE_RETRY_DAYS=2 ngày, ảnh mới ngẫu nhiên), thẻ không skip; A1 trước, rồi tất định fnv; --shard i/n
    const img = rd('content/lexicon/img.json'), q = fs.existsSync(P(QF)) ? rd(QF).items : {}, [SI, SN] = String(arg('shard') || '0/1').split('/').map(Number);
    const LV = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    const ks = Object.entries(lex).filter(([k, e]) => e && e.ex && !(img.items[k] && img.items[k].h) && !img.rejected[k] && !(q[k] && (Date.now() - Date.parse(q[k].at || 0)) / 864e5 < +(process.env.VIMG_QUEUE_RETRY_DAYS ?? 2)) && !(cards.items[k] && cards.items[k].skip) && (SN <= 1 || fnv(k) % SN === SI) && ['n', 'v', 'adj', 'adv'].includes(e.pos) && kind(k, e, (sel[k] || [])[1]) === 'scene')
      .map(([k]) => k).sort((a, b) => (LV[lex[a].level] || 9) - (LV[lex[b].level] || 9) || fnv('g|' + a) - fnv('g|' + b)).slice(0, +arg('gaps'));
    process.stdout.write(JSON.stringify({ items: ks, scene: ks }));
  } else if (process.argv.includes('--pilot')) { const fr = +(arg('from') || 0), pl = pilot(lex, sel, +(arg('n') || 60) + fr, +(arg('fn') || 20)); if (fr) { pl.scene = pl.scene.slice(fr); pl.items = [...pl.scene, ...pl.concept]; } process.stdout.write(JSON.stringify(pl, null, 1)); }
  else if (process.argv.includes('--prune')) {
    // fill: chỉ vẽ nghĩa cảnh đã có thẻ e4 (thẻ cũ e3 đạt 2–7 % – đốt neuron); vật/hư từ giữ nguyên
    const f = arg('keys'), kj = JSON.parse(fs.readFileSync(f, 'utf8')), keep = k => { const c = cards.items[k]; return !lex[k] || kind(k, lex[k], (sel[k] || [])[1], c) !== 'scene' || !!(c && !c.skip && c.v === SCENE_V && c.ps && !sceneOk(lex[k], c)); };   // thẻ check lặp ps không vẽ
    const n0 = kj.items.length; kj.items = kj.items.filter(keep); if (kj.scene) kj.scene = kj.scene.filter(keep);
    fs.writeFileSync(f, JSON.stringify(kj)); console.log(`nghĩa có thẻ ${SCENE_V} để vẽ: ${kj.items.length}/${n0}`);
  }
  else if (process.argv.includes('--dry')) { for (const k of keysOf()) console.log(k, '→', cards.items[k] ? promptScene(k, cards.items[k]).slice(0, 220) : '(chưa có thẻ)'); }
  else if (process.argv.includes('--cards')) {
    const { createPool, normOut } = await import('../lib/ai-pool.mjs');
    const SKIP = new Set(Object.keys((fs.existsSync(P(QF)) ? rd(QF) : { items: {} }).items));
    // mục = {k, w} (không phải chuỗi k): ai-pool normOut khớp lại câu trả lời lệch khoá (bọc 1 lớp, theo từ w, 1 mục trần) – 24/10 lượt fill đầu: 194/200 'no card' vì mục là chuỗi
    const AI = createPool({ prompt: req => ({ sys: SCENE_SYS, user: sceneUser(req.items.map(x => ({ k: x.k || x, e: lex[x.k || x] }))), temp: 0.3 }) });
    const todo = keysOf().filter(k => lex[k] && (!cards.items[k] || (!cards.items[k].skip && (cards.items[k].v !== SCENE_V || sceneOk(lex[k], cards.items[k])) && (cards.items[k].e4bad || 0) < 3))); let add = 0, bad = 0;   // e4: viết lại thẻ cũ (kể cả nghĩa trong hàng chờ – prompt cũ là lý do trượt) + thẻ e4 nay trượt sceneOk (vd. check lặp ps)
    // 29/10 lượt fill 40875877636: 2.000 thẻ e4 tuần tự (8/lần, 20–220 s) chạy 2 giờ 10 phút → job quá giờ, mất hết thẻ, 0 ảnh.
    // Nay: VIMG_CARD_CONC lô song song + hạn VIMG_CARD_MIN phút (còn lại để lượt sau) → luôn kịp ghi thẻ và vẽ.
    const CONC = Math.max(1, +(process.env.VIMG_CARD_CONC || 4)), MIN = +(process.env.VIMG_CARD_MIN || 35), END = Date.now() + MIN * 60e3;
    let next = 0, stop = false;
    await Promise.all(Array.from({ length: CONC }, async () => { while (!stop && next < todo.length && Date.now() < END) {
      const part = todo.slice(next, next += 8);
      // 24/10 GrabCast: generate 300/phút/IP, 115k/ngày/khoá – Groq gpt-oss-120b (600/phút); 25/10: CF văn bản cuối chuỗi + TẮT (AI_POOL_CF_TEXT) – neuron CF dành cho ảnh
      const r = await AI.gen({ mode: 'vscene', items: part.map(k => ({ k, w: lex[k].w })) }, { chain: ['gc-groq', 'gc-gemini', 'cf2', 'gc-cf'] });
      if (!r) { if (!stop) console.log('⏭ không tuyến nào trả lời – dừng (lượt sau viết tiếp)'); stop = true; break; }
      const out = normOut(r.out, part.map(k => ({ k, w: lex[k].w }))) || {};
      for (const k of part) { const c = out[k]; const why = sceneOk(lex[k], c); if (c && c.skip) { cards.items[k] = { skip: String(c.skip).slice(0, 80), by: r.model }; add++; } else if (/^skip: draw/.test(why)) { cards.items[k] = { skip: 'draw ' + c.draw + ': ' + String(c.ps || '').slice(0, 60), v: SCENE_V, by: r.model }; add++; } else if (!why) { cards.items[k] = { ex: c.ex, ps: String(c.ps).replace(/["“”]/g, '').slice(0, 200), sc: String(c.ps).replace(/["“”]/g, '').slice(0, 200), check: String(c.check).slice(0, 160), cap: String(c.cap).slice(0, 120), who: Math.min(2, +c.who || 0), draw: +c.draw, v: SCENE_V, by: r.model }; add++; } else { bad++; if (cards.items[k]) cards.items[k].e4bad = (cards.items[k].e4bad || 0) + 1; console.log('✗ thẻ', k, why); } }
    } }));
    if (next < todo.length && Date.now() >= END) console.log(`⏱ hết ${MIN} phút viết thẻ – còn ${todo.length - next} nghĩa, lượt sau viết tiếp`);
    if (process.argv.includes('--write')) { cards.items = Object.fromEntries(Object.entries(cards.items).sort(([a], [b]) => (a < b ? -1 : 1))); fs.writeFileSync(P(SC), JSON.stringify(cards, null, 1) + '\n'); }
    console.log(`✓ thẻ cảnh +${add} · hỏng ${bad}`); AI.report('vocab-img-scene');
  }
}
