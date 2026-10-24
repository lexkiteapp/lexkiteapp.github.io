#!/usr/bin/env node
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
import { STYLE, PEOPLE, fnv } from './style.mjs';
import { ruleCheck } from './strict.mjs';
import { isFunction } from './concept.mjs';

export const SCENE_V = 'e2';
// MỘT bộ token phong cách cho cả 20k (cùng STYLE.base s1 đã duyệt) + phần riêng cho cảnh: tối đa 2 người, bố cục rõ, không chữ.
// e2 (nhãn 24/10, 245 ảnh): FLUX schnell không có negative prompt – nhắc 'signs/speech bubbles' lại làm HIỆN biển/bong bóng chữ (HOSPITAL, BANK, HOTEL,
// bong bóng thoại chữ vô nghĩa ở 30/74 ảnh bài học) → mô tả TÍCH CỰC: tường/mặt phẳng trơn, người giao tiếp bằng nét mặt + cử chỉ.
export const SCENE_STYLE = 'Wordless flat vector illustration of one everyday moment. At most two main people, simple geometric shapes, soft rounded edges, clean outlines, ' +
  'limited palette of deep teal, warm orange, golden yellow, soft pink and cream, plain solid light cream background, the people and the key objects large and centered, ' +
  'plain walls and plain surfaces, people communicate only with faces and hand gestures, purely pictorial. Friendly, culturally neutral, suitable for young children.';
// chính sách seed: API FLUX không nhận seed → tái lập = băm nội dung; biến thể bố cục + người TẤT ĐỊNH theo fnv(khoá) (không ngẫu nhiên giữa các lần chạy)
const FRAMES = ['medium shot', 'wide shot showing the whole place', 'close medium shot', 'three-quarter view'];
export const RETRY_SCENE = 'Simpler composition: only the essential people and objects, larger, nothing in the background.';

/** loại ảnh của một nghĩa */
export function kind(k, e, lexname = '', card = null) {
  if (!e) return null;
  if (isFunction(k, e)) return 'concept';
  if (ruleCheck(k, e, lexname).ok && !(card && card.skip)) return 'object';
  return 'scene';
}
/** prompt cảnh từ thẻ (sc) – người trong thẻ ('a person', 'two people', 'a child') → xoay vòng tất định đa dạng */
export function promptScene(k, sc, attempt = 1) {
  const h = fnv(k), a = PEOPLE[h % PEOPLE.length], b = PEOPLE[(h >> 3) % PEOPLE.length] === a ? PEOPLE[(h + 1) % PEOPLE.length] : PEOPLE[(h >> 3) % PEOPLE.length];
  let s = String(sc.sc || '').replace(/["“”]/g, '');
  s = s.replace(/\bperson A\b/gi, a).replace(/\bperson B\b/gi, b).replace(/\ba person\b/i, a).replace(/\banother person\b/i, b);
  // biến thể v (fill: tới 6 lần/nghĩa, nhận lần ĐẦU qua giám khảo): API không nhận seed → đổi khung hình theo v (tất định), v chẵn = bố cục đơn giản hơn
  const fr = FRAMES[(h + attempt - 1) % FRAMES.length];
  return `Illustration, ${fr}: ${s}.${attempt > 1 && attempt % 2 === 0 ? ' ' + RETRY_SCENE : ''} ${SCENE_STYLE}`;
}

// Bộ lọc an toàn prompt của Cloudflare (bad_request) → viết lại TRUNG TÍNH (không bao giờ gửi lại y nguyên): thay từ nhạy cảm, bỏ chi tiết cơ thể/xung đột, thêm khung gia đình.
const SOFT = [[/\b(blood|bleeding|bloody|wound(ed)?|injur(y|ies|ed)|hurt)\b/gi, 'a small bandage'], [/\b(guns?|rifles?|pistols?|weapons?|knives|knife|swords?|bombs?|explosi\w*)\b/gi, 'tools'],
  [/\b(kill(s|ed|ing)?|murder\w*|dead|death|dying|corpse)\b/gi, 'sad'], [/\b(fight(s|ing)?|attack\w*|hit(s|ting)?|punch\w*|war|soldiers?|violen\w*)\b/gi, 'argue'],
  [/\b(drugs?|pills?|syringe|needle|alcohol|beer|wine|drunk|cigarettes?|smok\w*)\b/gi, 'cups of tea'], [/\b(naked|nude|undress\w*|bikini|underwear|bath(ing)?|shower(ing)?|bed with)\b/gi, 'dressed'],
  [/\b(police|prison|jail|arrest\w*|thief|steal\w*|crime|criminal)\b/gi, 'a guard'], [/\b(child|children|kids?|baby|babies|girl|boy)\b/gi, 'person'], [/\b(sick|ill|disease|hospital|vomit\w*)\b/gi, 'tired']];
export function soften(prompt, level = 1) {
  let s = String(prompt); for (const [re, to] of SOFT) s = s.replace(re, to);
  if (level > 1) s = s.replace(/^Illustration,[^:]*:\s*[^.]*\./, 'Illustration, medium shot: two friendly adults in an everyday calm moment with the key objects of the situation.');
  return s.replace(/Wordless flat vector/, 'Gentle, calm, family-friendly wordless flat vector');
}
// ---- thẻ cảnh: lời nhắn MỘT nguồn (người viết thẻ phải dùng câu ví dụ của kho; được trả skip) ----
export const SCENE_SYS = `You turn dictionary example sentences into ONE wordless picture for a vocabulary card. The picture must show the SITUATION of the sentence so a learner who reads the sentence under the picture understands the word. Never draw a literal object for an abstract word, never a misleading symbol.
Rules learned from reviewed pictures: (1) if the sentence names groups or compares (men and women, children and adults, equal, more, less, same, different, second, best), draw BOTH sides explicitly side by side so the comparison is visible (e.g. "a woman and a man each receive an identical stack of coins"; a race result = three runners on a podium of three heights); (2) show places (hospital, bank, hotel, station, school) only through objects inside them (bed, counter, key, ticket), never a building front; (3) the key thing of the sentence must be large and in the foreground (the mango, the conductor punching a ticket, the deep water under a small boat); (4) people talk with gestures, never speech bubbles, phones or screens unless the sentence is about them; (5) use people of different genders, ages and skin tones when the sentence implies it.
For each input item {k, w, pos, def, ex:[sentences]} reply with one JSON object keyed by k:
{"ex": "the ONE input sentence (copied exactly) whose situation is easiest to draw", "sc": "what to draw: who (use 'person A'/'person B', or explicit people like 'a woman and a man' when the sentence needs them; at most three people), doing what, with which objects, where; 15-45 words, concrete and visible; no text, letters, numbers, signs, screens with writing, speech bubbles, flags or brands", "cap": "a neutral 6-14 word caption of that picture that does NOT contain the word w", "who": number of people 0-2}
If no input sentence can be drawn without text or symbols (e.g. it is about grammar, numbers, time words or opinions only), reply {"skip": "short reason"} for that k.
Example: equal (adj) "Men and women should receive equal pay." -> {"ex":"Men and women should receive equal pay.","sc":"a woman and a man in work clothes stand side by side, each holding out a hand receiving an identical stack of coins from a balance scale that is perfectly level","cap":"a woman and a man receiving identical stacks of coins","who":2}
Example: consider (v) "We are considering moving to the countryside." -> {"ex":"We are considering moving to the countryside.","sc":"person A and person B sit at a kitchen table looking at two house photos, a city flat and a cottage with fields, thinking","cap":"a couple comparing pictures of a city flat and a country cottage","who":2}
Reply JSON only.`;
export const sceneUser = items => JSON.stringify(items.map(({ k, e }) => ({ k, w: e.w, pos: e.pos, def: String(e.def || '').slice(0, 200), ex: [].concat(e.ex || []).filter(Boolean).slice(0, 3).map(s => String(s).slice(0, 220)) })));
/** kiểm thẻ cảnh: ex phải là câu của kho, không chữ trong sc, cap không chứa từ */
export function sceneOk(e, c) {
  if (!c || typeof c !== 'object') return 'no card';
  if (c.skip) return 'skip: ' + String(c.skip).slice(0, 60);
  const exs = [].concat(e.ex || []).map(s => String(s).trim());
  if (!exs.includes(String(c.ex || '').trim())) return 'ex not from lexicon';
  if (!c.sc || String(c.sc).split(/\s+/).length < 8) return 'sc too short';
  if (/\b(text|letters?|words?|sign|label|caption|written|writing|numbers?)\b/i.test(c.sc)) return 'sc asks for text';
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

if (path.resolve(process.argv[1] || '') === path.resolve(new URL(import.meta.url).pathname)) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
  const ROOT = new URL('../../', import.meta.url), P = p => new URL(p, ROOT).pathname, rd = p => JSON.parse(fs.readFileSync(P(p), 'utf8'));
  const lex = rd('dist/lexicon.json'), sel = rd('content/lexicon/vimg-select.json').items;
  const QF = 'content/lexicon/vimg-scene-queue.json', SC = 'content/lexicon/vimg-scenes.json', cards = fs.existsSync(P(SC)) ? rd(SC) : { _note: 'Thẻ cảnh cho nghĩa trừu tượng (scene.mjs). ex = câu ví dụ của kho, sc = mô tả hình, cap = chú thích cho giám khảo.', v: SCENE_V, items: {} };
  const keysOf = () => { const f = arg('keys'); return f && fs.existsSync(f) ? (JSON.parse(fs.readFileSync(f, 'utf8')).scene || JSON.parse(fs.readFileSync(f, 'utf8')).items) : String(f || '').split(',').filter(Boolean); };
  if (arg('gaps')) {
    // fill: nghĩa loại scene chưa có ảnh, không bị gỡ, không trong hàng chờ sửa prompt, thẻ không skip; A1 trước, rồi tất định fnv; --shard i/n
    const img = rd('content/lexicon/img.json'), q = fs.existsSync(P(QF)) ? rd(QF).items : {}, [SI, SN] = String(arg('shard') || '0/1').split('/').map(Number);
    const LV = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 };
    const ks = Object.entries(lex).filter(([k, e]) => e && e.ex && !(img.items[k] && img.items[k].h) && !img.rejected[k] && !q[k] && !(cards.items[k] && cards.items[k].skip) && (SN <= 1 || fnv(k) % SN === SI) && ['n', 'v', 'adj', 'adv'].includes(e.pos) && kind(k, e, (sel[k] || [])[1]) === 'scene')
      .map(([k]) => k).sort((a, b) => (LV[lex[a].level] || 9) - (LV[lex[b].level] || 9) || fnv('g|' + a) - fnv('g|' + b)).slice(0, +arg('gaps'));
    process.stdout.write(JSON.stringify({ items: ks, scene: ks }));
  } else if (process.argv.includes('--pilot')) { const fr = +(arg('from') || 0), pl = pilot(lex, sel, +(arg('n') || 60) + fr, +(arg('fn') || 20)); if (fr) { pl.scene = pl.scene.slice(fr); pl.items = [...pl.scene, ...pl.concept]; } process.stdout.write(JSON.stringify(pl, null, 1)); }
  else if (process.argv.includes('--dry')) { for (const k of keysOf()) console.log(k, '→', cards.items[k] ? promptScene(k, cards.items[k]).slice(0, 220) : '(chưa có thẻ)'); }
  else if (process.argv.includes('--cards')) {
    const { createPool } = await import('../lib/ai-pool.mjs');
    const SKIP = new Set(Object.keys((fs.existsSync(P(QF)) ? rd(QF) : { items: {} }).items));
    const AI = createPool({ prompt: req => ({ sys: SCENE_SYS, user: sceneUser(req.items.map(k => ({ k, e: lex[k] }))), temp: 0.3 }) });
    const todo = keysOf().filter(k => lex[k] && !cards.items[k] && !SKIP.has(k)); let add = 0, bad = 0;
    for (let i = 0; i < todo.length; i += 8) {
      const part = todo.slice(i, i + 8);
      // 24/10 GrabCast: generate 300/phút/IP, 115k/ngày/khoá – Groq gpt-oss-120b (600/phút) trước, CF sau; ngân sách lượt = AI_POOL_GC_MAX (workflow)
      const r = await AI.gen({ mode: 'vscene', items: part }, { chain: ['gc-groq', 'gc-cf', 'gc-gemini', 'cf2'] });
      if (!r) { console.log('⏭ không tuyến nào trả lời – dừng (lượt sau viết tiếp)'); break; }
      for (const k of part) { const c = r.out[k]; const why = sceneOk(lex[k], c); if (c && c.skip) { cards.items[k] = { skip: String(c.skip).slice(0, 80), by: r.model }; add++; } else if (!why) { cards.items[k] = { ex: c.ex, sc: String(c.sc).replace(/["“”]/g, '').slice(0, 320), cap: String(c.cap).slice(0, 120), who: Math.min(2, +c.who || 0), by: r.model }; add++; } else { bad++; console.log('✗ thẻ', k, why); } }
    }
    if (process.argv.includes('--write')) { cards.items = Object.fromEntries(Object.entries(cards.items).sort(([a], [b]) => (a < b ? -1 : 1))); fs.writeFileSync(P(SC), JSON.stringify(cards, null, 1) + '\n'); }
    console.log(`✓ thẻ cảnh +${add} · hỏng ${bad}`); AI.report('vocab-img-scene');
  }
}
