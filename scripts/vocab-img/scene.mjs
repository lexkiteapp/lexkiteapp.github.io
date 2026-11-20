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

export const SCENE_V = 'e6';   // e6 (01/11, lượt fill 41205453283: 145/1.469 ảnh đạt): mẫu thẻ theo loại từ + few-shot, cổng vật mang chữ (TEXT_OBJ)/màn hình/check lặp, thẻ trượt cổng được viết lại kèm lý do (không bỏ), ảnh trượt → viết lại thẻ (--refix) trước biến thể kế
// e4 (29/10): e4 (29/10): thẻ = câu cảnh ngắn vẽ được (ps ≤ 20 từ) + câu hỏi kiểm (check) + điểm vẽ được (draw) – prompt ngắn, giám khảo chấm đúng câu cảnh
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
// MẪU 02/11 (chưa duyệt – chỉ pilot, VIMG_STYLE=lite): ít chi tiết hơn để giảm chữ lạc + ảnh > 6 KB (vòng 2 #358: chữ 14, size 13, thị giác bác 18 / 90 nghĩa).
// Cùng bảng màu/nét/nền s1; bớt vật nền, mảng màu phẳng lớn. Không nhắc chữ/biểu tượng (nhắc → hiện ra). Lịch fill KHÔNG dùng tới khi chủ duyệt hình.
export const SCENE_STYLE_LITE = 'Minimal flat vector illustration with very few shapes: only the people and the one or two objects that matter, nothing else in the scene, ' +
  'large flat areas of color, thick clean dark teal outlines, simple friendly faces, deep teal, warm orange, golden yellow and soft pink, ' +
  'plain light cream background, blank smooth surfaces, the people and key objects large and centered, purely pictorial, suitable for young children.';
// MẪU lite+ 02/11 (chưa duyệt – chỉ pilot, VIMG_STYLE=liteplus): lite trượt kiểm nghĩa 1 → 4 / 18 vì bỏ mất chi tiết mang nghĩa (mistake chỉ còn "tờ giấy", specify mất "khác cỡ").
// Giữ lite (ít vật, mảng phẳng, ≤ 6 KB) nhưng thẻ có thêm `key` = 1–2 chi tiết then chốt không chữ (cổng keyOk), đặt sau câu cảnh, phong cách bảo vẽ chúng to rõ.
export const SCENE_STYLE_LITEPLUS = 'Minimal flat vector illustration with few shapes: only the people and the key details that show the meaning, no other objects and no background scenery, ' +
  'the key details large, bold and easy to see, large flat areas of color, thick clean dark teal outlines, simple friendly faces, deep teal, warm orange, golden yellow and soft pink, ' +
  'plain light cream background, blank smooth surfaces, purely pictorial, suitable for young children.';
export const isLitePlus = (env = process.env) => env.VIMG_STYLE === 'liteplus';
export const sceneStyle = (env = process.env) => (env.VIMG_STYLE === 'lite' ? SCENE_STYLE_LITE : isLitePlus(env) ? SCENE_STYLE_LITEPLUS : SCENE_STYLE_E4);
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

/** ghép thẻ từ lượt fill (scene-publish): thẻ mới, hoặc nâng lên SCENE_V, hoặc cùng bản mà đếm hỏng e4bad tăng, hoặc thẻ viết lại sau ảnh trượt – không đè thẻ hiện hành */
export const cardWins = (o, v) => !!v && (!o || (v.v === SCENE_V && o.v !== SCENE_V) || (o.v === v.v && o.v !== SCENE_V && (v.e4bad || 0) > (o.e4bad || 0)) || (o.v === v.v && v.v === SCENE_V && (v.refix || 0) > (o.refix || 0)));   // e6: thẻ viết lại sau ảnh trượt (--refix) đè bản cùng phiên bản
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
    const key = isLitePlus() && sc.key ? scrub(String(sc.key).replace(/["“”]/g, ''), String(k).split('#')[0]).replace(/\.+$/, '') : '';
    return `Illustration, ${fr}: ${s.replace(/\.+$/, '')}.${key ? ' Key detail' + (/;/.test(key) ? 's' : '') + ': ' + key + '.' : ''}${attempt > 1 && attempt % 2 === 0 ? ' ' + RETRY_SCENE : ''} ${sceneStyle()}`;
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
export const SCENE_SYS = `You write ONE picture card that teaches an English word. A simple flat-vector image model must draw it right in ONE try, a strict picture checker must then see the meaning, and a learner sees the picture with the example sentence under it.
Input: items {k, w, pos, def, ex:[sentences], fix?}. Reply ONE JSON object keyed by k; each value is
{"ex": "one input sentence copied exactly, the one whose meaning is easiest to SEE", "ps": "the picture as ONE plain sentence of 8-20 words", "check": "a yes/no question about the MEANING of w (def), answered from the picture alone", "cap": "a neutral 6-14 word caption of the picture that never contains w or any form of it", "who": number of people 0-2, "draw": 1-5 how surely a learner gets w from this picture plus the sentence (5 = obvious)}
Pick the template that fits def:
- concrete noun (thing, animal, food, plant, vehicle, tool, place): the thing itself, large and whole, usual colours, in its typical use; at most one person. check: "Is there <a plain description of the thing in other words>?"
- person noun (job, role, relation): ONE adult with the tools and the action that show that role. check asks about that visible action.
- abstract noun: ONE everyday moment where the idea is visible in actions and faces.
- verb: one person at the clearest moment of the action, whole body and hands visible, the object of the action large.
- adjective: one thing with the quality exaggerated, or two things side by side, one clearly with the quality and one clearly without.
- adverb: one action done in that way, exaggerated by pose, speed and face.
Hard rules for ps (a card that breaks one is rejected):
1. nothing that carries writing: no books, notebooks, paper, documents, forms, reports, tickets, passports, certificates, diplomas, menus, maps, posters, flyers, magazines, newspapers, letters, envelopes, cards, labels, notes, white or black boards, clipboards, signs, banners, price tags, cash or banknotes, shop fronts, booths, bus stops, calendars, clocks, scoreboards, jerseys, badges, trophies. Show the action or result instead (a handshake, a key, one coin, an open box, a packed suitcase).
2. laptops, phones, tablets and TVs only "seen from behind".
3. no symbols: arrows, hearts, stars, lightbulbs, question marks, speech or thought bubbles, logos, flags, icons, charts, maps.
4. people are 'a woman' or 'a man'; 'a girl' or 'a boy' only when the meaning needs a child; no names, ages, hair or clothes colours, no counts above three.
5. one action, at most two key objects, one simple place shown by one object in it; no metaphor, nothing tiny, nothing far away. Every detail you write will be checked in the picture: write ONLY what carries the meaning (no furniture, background, colours or extra props that the meaning does not need).
Rules for check: test the MEANING in words different from ps, so the same people and objects WITHOUT that meaning get "no"; never contain w; never ask whether something "indicates", "represents", "illustrates" or "symbolizes" an idea.
If an item has "fix", your previous card for it was rejected for that reason: write a NEW card that avoids it (another sentence or another scene is fine).
If no sentence reaches draw >= 4 under these rules, reply {"skip": "short reason"} for that k (no picture is better than a wrong one).
Examples:
pencil (n) ["She wrote her name with a pencil."] -> {"ex":"She wrote her name with a pencil.","ps":"one long yellow wooden pencil with a sharp tip, large in the middle","check":"Is there a thin wooden tool with a sharp point for drawing lines?","cap":"a long yellow wooden stick with a sharp tip","who":0,"draw":5}
duck (n) ["A duck swam across the pond."] -> {"ex":"A duck swam across the pond.","ps":"a white duck with an orange beak swims on a small blue pond","check":"Is a water bird with a flat beak swimming?","cap":"a white bird swimming on a small pond","who":0,"draw":5}
hunter (n) ["The hunter waited quietly in the forest."] -> {"ex":"The hunter waited quietly in the forest.","ps":"a man in a green coat crouches behind a bush holding a bow, watching a deer","check":"Is a person quietly waiting to catch a wild animal?","cap":"a man with a bow hiding behind a bush near a deer","who":1,"draw":5}
consider (v) ["We are considering moving to the countryside."] -> {"ex":"We are considering moving to the countryside.","ps":"a woman and a man at a kitchen table look thoughtfully at a small model house and a small model tower","check":"Are the two people carefully deciding between two choices before acting?","cap":"a couple thinking at a table with two model homes","who":2,"draw":4}
cheap (adj) ["The food at the night market is cheap and tasty."] -> {"ex":"The food at the night market is cheap and tasty.","ps":"a woman hands one small coin to a smiling street vendor for a big steaming bowl of noodles","check":"Does the big meal clearly cost very little money?","cap":"a woman buying a big bowl of noodles from a vendor","who":2,"draw":4}
quickly (adv) ["He ran quickly to catch the bus."] -> {"ex":"He ran quickly to catch the bus.","ps":"a man sprints with long strides and a determined face toward a big green bus","check":"Is the man moving at high speed?","cap":"a man running hard toward a green bus","who":1,"draw":5}
agreement (n) ["They reached an agreement after a long talk."] -> {"ex":"They reached an agreement after a long talk.","ps":"a woman and a man across a small table smile and shake hands firmly","check":"Have the two people just settled something together?","cap":"two people smiling and shaking hands over a table","who":2,"draw":4}
Reply JSON only.`;
// lite+ (chỉ VIMG_STYLE=liteplus): thêm trường key – lite bỏ chi tiết mang nghĩa → giám khảo nghĩa bác. Vật thường có chữ → vẽ TRƠN + dấu không chữ.
export const KEY_SYS = `
Also add "key" to every card: the 1 or 2 details of ps that carry the meaning, so a picture with ONLY the people and these details still shows w. Each detail 2-12 words, separated by "; ".
A detail must be visible and wordless. If the meaning needs something that usually carries writing (a test, a form, a price), draw it as a plain blank sheet with a mark instead: a big red cross mark, a big green tick mark, a red circle. Never weapons, blood, fighting, alcohol or cigarettes in ps or key (the pictures are for children).
Key examples: mistake (n) "a woman points at a big red cross mark on a boy's blank sheet" -> "key":"a big red cross mark on a blank sheet; the boy's surprised face"; specify (v) -> "key":"one small box and one very large box"; vacant (adj) -> "key":"a completely empty chair and desk".`;
export const sceneSys = (env = process.env) => SCENE_SYS + (isLitePlus(env) ? KEY_SYS : '');
export const sceneUser = items => JSON.stringify(items.map(({ k, e, fix }) => ({ k, w: e.w, pos: e.pos, def: String(e.def || '').slice(0, 200), ex: [].concat(e.ex || []).filter(Boolean).slice(0, 3).map(s => String(s).slice(0, 220)), ...(fix ? { fix: String(fix).slice(0, 240) } : {}) })));
// e6 (01/11, lượt fill 41205453283): 610/1.221 ảnh trượt vì CHỮ – câu cảnh nhắc vật mang chữ (sách, vé, giấy tờ, bảng, quầy, bến xe buýt…).
// Thêm vật mới gây chữ → thêm vào đây + test (không nới giám khảo). Vật chính là TỪ ĐANG HỌC thì được (book#n vẽ quyển sách).
export const TEXT_OBJ = /\b(books?|textbooks?|notebooks?|novels?|cookbooks?|magazines?|newspapers?|papers?|documents?|reports?|(?:paper|printed|application) forms?|questionnaires?|surveys? sheets?|checklists?|flashcards?|(?:exam|test|answer|score) sheets?|agendas?|ballots?|tickets?|passports?|diplomas?|certificates?|blueprints?|worksheets?|flyers?|leaflets?|brochures?|posters?|menus?|maps?|receipts?|invoices?|contracts?|letters?|envelopes?|labels?|cards?|notes?|whiteboards?|blackboards?|chalkboards?|(?:notice|project|menu|score|sign|bulletin) ?boards?|clipboards?|signs?|signboards?|billboards?|banners?|price tags?|name tags?|cash|banknotes?|bills|bookshops?|bookstores?|storefronts?|shop fronts?|bus stops?|booths?|calendars?|clocks?|scoreboards?|jerseys?|badges?|trophies|trophy|stamps?|license plates?|charts?|graphs?)\b/i;
export const SCREEN = /\b(laptops?|computers?|monitors?|screens?|(?:smart)?phones?|tablets?|tvs?|televisions?)\b/i;
// lite+ 02/11: thẻ protected area#n "a hunter with a gun" → giám khảo 'api: unsafe' (ảnh cho trẻ em). Vũ khí/bạo lực/chất kích thích trong ps hoặc key → thẻ viết lại kèm lý do.
// Chính từ đang học (gun#n, blood test#n) được vẽ; dao chỉ khi nấu ăn, máu chỉ khi y tế; lính/ống tiêm không chặn (ally#n, flu shot#n). Thêm loại mới → thêm vào đây + test (không nới giám khảo).
export const UNSAFE = /\b(guns?|rifles?|pistols?|revolvers?|shotguns?|firearms?|weapons?|swords?|daggers?|spears?|bombs?|grenades?|explosives?|bullets?|ammunition|blood|bleeding|corpses?|dead bod(?:y|ies)|kill(?:s|ed|ing)?|murder\w*|stab(?:s|bed|bing)?|attack(?:s|ed|ing)?|punch(?:es|ed|ing)?|violen\w*|wars?|drunk|beers?|wine|cigarettes?|knives|knife)\b/i;
const MED = /\b(nurse|doctor|clinic|test tubes?|donat\w*|donor|lab)\b/i;
const COOK = /\b(kitchen|cook\w*|chop\w*|slic\w*|cutting board|bread|vegetables?|fruit|cake|onions?|apples?|carrots?|butter)\b/i;
/** vật/cảnh không an toàn trong câu (trừ khi chính là từ đang học; dao khi nấu ăn) → từ | '' */
export function unsafeHit(s, w) {
  const t = String(s || '').replace(/\b(bullet points?|punch bowls?)\b/gi, ''), m = t.match(new RegExp(UNSAFE.source, 'gi')) || [], W = String(w || '').toLowerCase().split(/\s+/);
  return (m.find(x => !wordRe(w).test(x) && !W.includes(x.toLowerCase().replace(/s$/, '')) && !(/^kni/i.test(x) && COOK.test(t)) && !(/^blood/i.test(x) && MED.test(t))) || '').toLowerCase();
}
/** lite+: key = 1–2 chi tiết then chốt (ngăn ';'), mỗi chi tiết 2–12 từ, không chữ/biểu tượng/màn hình/vật mang chữ/không an toàn → lý do | '' */
export function keyOk(e, key) {
  const parts = String(key || '').split(';').map(x => x.trim()).filter(Boolean);
  if (!parts.length) return 'no key detail';
  if (parts.length > 2) return 'key has more than 2 details';
  if (parts.some(x => { const n = x.split(/\s+/).length; return n < 2 || n > 12; })) return 'key detail not 2-12 words';
  const k = parts.join('; ');
  if (/\b(text|letters?|words?|written|writing|numbers?|digits?|price|caption)\b/i.test(k)) return 'key asks for text/symbol';
  { const h = negHit(k, e.w); if (h) return 'key uses a symbol: ' + h; }
  { const t = textObj(k, e.w); if (t) return 'key has a text object: ' + t.toLowerCase(); }
  { const m = k.match(SCREEN); if (m && !wordRe(e.w).test(m[0])) return 'key shows a screen'; }
  { const u = unsafeHit(k, e.w); if (u) return 'key is unsafe: ' + u; }
  return '';
}
const BEHIND = /\b(seen from behind|from behind|back of the|from the back)\b/i;
const STOP = new Set('a an the is are was were be been being do does did of to in on at by for with and or but this that these those it its they them their there here who what which while as into from up down out over under one two three some any each other another very just not no yes picture image clearly shown shows show visible person people woman man girl boy'.split(' '));
const content = s => String(s || '').toLowerCase().match(/[a-z]+/g)?.filter(x => x.length > 2 && !STOP.has(x)).map(x => x.replace(/(ing|ed|es|s)$/, '')) || [];
/** phần từ nội dung của check đã có trong ps (0–1); ≥ CHECK_ECHO = check chỉ chép lại cảnh (giám khảo nghĩa gật cho ảnh sai nghĩa) */
export function checkEcho(ps, check) { const P = new Set(content(ps)), C = content(check); return C.length ? C.filter(x => P.has(x)).length / C.length : 1; }
export const CHECK_ECHO = 0.75;
export const CARD_TRIES = 3;   // thẻ trượt cổng → viết lại NGAY trong lượt với lý do (fix), tối đa 3 lần/lượt; hết lần → lượt sau viết tiếp (không ghi thẻ hỏng, không bỏ nghĩa)
// 07/11 (06/11: 8 lượt fill, 1–16 ảnh/lượt dù kho CF còn 56/61 tài khoản): thẻ hỏng CARD_DEAD lần (e4bad) bị bỏ VĨNH VIỄN mà vẫn nằm trong --gaps →
// 129 nghĩa thường gặp (up, right, include, result…) chiếm chỗ mỗi lượt, không viết lại, không vẽ, và chuỗi tự nối lượt không bao giờ dừng.
// Nay như hàng chờ ảnh: hỏng → nghỉ VIMG_QUEUE_RETRY_DAYS ngày (badAt), hết hạn → viết lại TỪ ĐẦU (cùng cổng sceneOk, cùng giám khảo).
export const CARD_DEAD = 3;
export const cardResting = (c, now = Date.now(), env = process.env) => !!c && (c.e4bad || 0) >= CARD_DEAD && !!c.badAt && (now - Date.parse(c.badAt)) / 864e5 < +(env.VIMG_QUEUE_RETRY_DAYS ?? 2);
// thẻ văn bản: kho Groq/Gemini miễn phí TRƯỚC (GROQ_POOL/GEMINI_POOL – xoay khoá, 429 → khoá kế), cf2 (neuron CF dành cho VẼ) chỉ khi hai kho kia không trả lời
export const CARD_CHAIN = ['groq', 'gem', 'gc-groq', 'gc-gemini', 'cf2', 'gc-cf'];
const esc = x => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** dạng của từ: chính nó, số nhiều, -ing/-ed, gốc bỏ -e/-y (cap 'hunting' cho hunter vẫn là gọi tên từ) */
export function wordRe(w) {
  const b = String(w).toLowerCase().trim(), stem = b.replace(/(e|y|er|ing|ed|ly)$/, '');
  return new RegExp('\\b(' + esc(b) + '(s|es|d|ed|ing|ly)?' + (stem.length >= 4 && stem !== b ? '|' + esc(stem) + '\\w{0,4}' : '') + ')\\b', 'i');
}
/** vật mang chữ trong ps (trừ khi chính là từ đang học) → tên vật | '' */
export function textObj(ps, w) {
  const W = String(w || '').toLowerCase(), m = String(ps || '').match(new RegExp(TEXT_OBJ.source, 'gi')) || [];
  return m.find(x => { const t = x.toLowerCase(); return !(W && (t === W || t.replace(/s$/, '') === W.replace(/s$/, '') || W.split(/\s+/).includes(t.replace(/s$/, '')))); }) || '';
}
/** kiểm thẻ cảnh: ex phải là câu của kho, không chữ trong sc, cap không chứa từ */
export function sceneOk(e, c, env = process.env) {
  if (!c || typeof c !== 'object') return 'no card';
  if (c.skip) return 'skip: ' + String(c.skip).slice(0, 60);
  const exs = [].concat(e.ex || []).map(s => String(s).trim());
  if (!exs.includes(String(c.ex || '').trim())) return 'ex not from lexicon';
  if (c.ps !== undefined || c.draw !== undefined) {   // e4+
    const n = String(c.ps || '').trim().split(/\s+/).length;
    if (n < 6 || n > 24) return 'ps not 6-24 words';
    if (!(+c.draw >= 4)) return 'skip: draw ' + c.draw;
    if (!/\?\s*$/.test(String(c.check || ''))) return 'no check question';
    if (/\b(text|letters?|words?|written|writing|numbers?|price|caption)\b/i.test(c.ps)) return 'ps asks for text/symbol';
    { const h = negHit(c.ps, e.w); if (h) return 'ps uses a symbol: ' + h; }
    { const t = textObj(c.ps, e.w); if (t) return 'ps has a text object: ' + t.toLowerCase(); }
    { const m = String(c.ps).match(SCREEN); if (m && !BEHIND.test(c.ps) && !wordRe(e.w).test(m[0])) return 'ps shows a screen'; }
    if (!c.cap || wordRe(e.w).test(c.cap)) return 'cap names the word';
    if (wordRe(e.w).test(c.check)) return 'check names the word';
    if (/\b(indicat\w*|represent\w*|illustrat\w*|symboli[sz]\w*|the idea of|the concept of)\b/i.test(c.check)) return 'check asks for a label';
    if (checkEcho(c.ps, c.check) >= CHECK_ECHO) return 'check repeats ps';
    { const u = unsafeHit(c.ps, e.w); if (u) return 'ps is unsafe: ' + u; }
    if (isLitePlus(env)) return keyOk(e, c.key);
    return '';
  }
  if (!c.sc || String(c.sc).split(/\s+/).length < 8) return 'sc too short';
  if (/\b(text|letters?|words?|sign|label|caption|written|writing|numbers?)\b/i.test(c.sc)) return 'sc asks for text';
  { const h = negHit(c.sc, e.w); if (h) return 'sc uses a symbol: ' + h; }   // VOCAB-IMG-STYLE.md: danh sách phủ định
  if (!c.cap || new RegExp('\\b' + e.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(c.cap)) return 'cap names the word';
  return '';
}
/** sửa tất định (không gọi AI) lỗi nhẹ: cap gọi tên từ → cap = ps (khi ps không chứa từ). → thẻ đã sửa | null */
export function repairCard(e, c) {
  if (!c || c.skip || sceneOk(e, c) !== 'cap names the word' || !c.ps || wordRe(e.w).test(c.ps)) return null;
  const d = { ...c, cap: String(c.ps).split(/\s+/).slice(0, 14).join(' ') };
  return sceneOk(e, d) ? null : d;
}
/** lý do ảnh trượt → gợi ý viết lại thẻ (--refix); '' = lỗi không do thẻ (phong cách, trùng, hàng chờ, cỡ) → chỉ vẽ lại */
export function refixWhy(j) {
  const r = (j && j.reasons) || [], f = (j && j.f) || {}, saw = f.api || f.cap || '';
  if (r.some(x => /^text:|vision: text/.test(x))) return `the drawn picture contained writing (letters or numbers)${saw ? '; it showed: ' + String(saw).slice(0, 90) : ''}. Use a scene with no object that could carry writing.`;
  const v = r.find(x => /^vision: no|^meaning check|^clip-sentence|^caption-sentence|^vision description/.test(x));
  if (v) return `the drawn picture did not show the meaning (${String(v).slice(0, 70)})${saw ? '; it showed: ' + String(saw).slice(0, 90) : ''}. Make the meaning bigger and more obvious, with fewer details.`;
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
    const ks = Object.entries(lex).filter(([k, e]) => e && e.ex && !(img.items[k] && img.items[k].h) && !img.rejected[k] && !(q[k] && (Date.now() - Date.parse(q[k].at || 0)) / 864e5 < +(process.env.VIMG_QUEUE_RETRY_DAYS ?? 2)) && !(cards.items[k] && cards.items[k].skip) && !cardResting(cards.items[k]) && (SN <= 1 || fnv(k) % SN === SI) && ['n', 'v', 'adj', 'adv'].includes(e.pos) && kind(k, e, (sel[k] || [])[1]) === 'scene')
      .map(([k]) => k).sort((a, b) => (LV[lex[a].level] || 9) - (LV[lex[b].level] || 9) || fnv('g|' + a) - fnv('g|' + b)).slice(0, +arg('gaps'));
    process.stdout.write(JSON.stringify({ items: ks, scene: ks }));
  } else if (process.argv.includes('--pilot')) { const fr = +(arg('from') || 0), pl = pilot(lex, sel, +(arg('n') || 60) + fr, +(arg('fn') || 20)); if (fr) { pl.scene = pl.scene.slice(fr); pl.items = [...pl.scene, ...pl.concept]; } process.stdout.write(JSON.stringify(pl, null, 1)); }
  else if (process.argv.includes('--prune')) {
    // fill: chỉ vẽ nghĩa cảnh đã có thẻ e4 (thẻ cũ e3 đạt 2–7 % – đốt neuron); vật/hư từ giữ nguyên
    const f = arg('keys'), kj = JSON.parse(fs.readFileSync(f, 'utf8')), keep = k => { const c = cards.items[k]; return !lex[k] || kind(k, lex[k], (sel[k] || [])[1], c) !== 'scene' || !!(c && !c.skip && c.v === SCENE_V && c.ps && !sceneOk(lex[k], c)); };
    const n0 = kj.items.length; kj.items = kj.items.filter(keep); if (kj.scene) kj.scene = kj.scene.filter(keep);
    fs.writeFileSync(f, JSON.stringify(kj)); console.log(`nghĩa có thẻ ${SCENE_V} để vẽ: ${kj.items.length}/${n0}`);
  }
  else if (process.argv.includes('--dry')) { for (const k of keysOf()) console.log(k, '→', cards.items[k] ? promptScene(k, cards.items[k]).slice(0, 220) : '(chưa có thẻ)'); }
  else if (process.argv.includes('--cards') || process.argv.includes('--refix')) {
    const { createPool, normOut } = await import('../lib/ai-pool.mjs');
    // mục = {k, w, fix?} (không phải chuỗi k): ai-pool normOut khớp lại câu trả lời lệch khoá – 24/10 lượt fill đầu: 194/200 'no card' vì mục là chuỗi
    const AI = createPool({ prompt: req => ({ sys: sceneSys(), user: sceneUser(req.items.map(x => ({ k: x.k || x, e: lex[x.k || x], fix: x.fix }))), temp: 0.3 }) });
    let add = 0, bad = 0, up = 0, fixed = 0; const why0 = {};
    let todo;
    if (process.argv.includes('--refix')) {
      // e6: ảnh của biến thể N trượt vì lỗi do THẺ (chữ trong ảnh, không thấy nghĩa) → viết lại thẻ kèm lý do trước biến thể N+1 (vẽ lại y prompt cũ = đốt neuron)
      const O = arg('out'), A = +(arg('attempt') || 1), J = JSON.parse(fs.readFileSync(path.join(O, `judge.local.a${A}.json`), 'utf8'));
      todo = Object.entries(J).filter(([k, j]) => !j.pass && j.kind === 'scene' && lex[k] && cards.items[k] && !cards.items[k].skip && (cards.items[k].refix || 0) < +(process.env.VIMG_REFIX_MAX || 2) && refixWhy(j))
        .map(([k, j]) => ({ k, fix: refixWhy(j), tries: CARD_TRIES - 1, refix: 1 }));
    } else {
      todo = [];
      for (const k of keysOf()) {
        const c = cards.items[k]; if (!lex[k] || (c && c.skip) || cardResting(c)) continue;
        if (c && c.v === SCENE_V && !sceneOk(lex[k], c)) continue;
        // thẻ e4 cũ qua được cổng e6 → nâng bản tại chỗ (không tốn lượt AI); trượt → viết lại kèm lý do. Thẻ hỏng đã nghỉ xong → viết lại từ đầu
        if (c && c.ps && (c.e4bad || 0) < CARD_DEAD) { const w = sceneOk(lex[k], c), r = w === 'cap names the word' && repairCard(lex[k], c); if (!w || r) { cards.items[k] = { ...(r || c), v: SCENE_V, up: c.v || 'e4' }; up++; continue; } todo.push({ k, fix: w, tries: 0 }); continue; }
        todo.push({ k, tries: 0 });
      }
    }
    // 29/10 lượt fill 40875877636: 2.000 thẻ e4 tuần tự (8/lần, 20–220 s) chạy 2 giờ 10 phút → job quá giờ, mất hết thẻ, 0 ảnh.
    // Nay: VIMG_CARD_CONC lô song song + hạn VIMG_CARD_MIN phút (còn lại để lượt sau) → luôn kịp ghi thẻ và vẽ. Thẻ trượt cổng quay lại hàng với lý do (CARD_TRIES).
    const CONC = Math.max(1, +(process.env.VIMG_CARD_CONC || 4)), MIN = +(process.env.VIMG_CARD_MIN || 35), END = Date.now() + MIN * 60e3;
    let stop = false; const q = [...todo];
    await Promise.all(Array.from({ length: CONC }, async () => { while (!stop && q.length && Date.now() < END) {
      const part = q.splice(0, 8);
      // 24/10 GrabCast: generate 300/phút/IP, 115k/ngày/khoá – Groq gpt-oss-120b (600/phút); 25/10: CF văn bản cuối chuỗi + TẮT (AI_POOL_CF_TEXT) – neuron CF dành cho ảnh
      const r = await AI.gen({ mode: 'vscene', items: part.map(x => ({ k: x.k, w: lex[x.k].w, ...(x.fix ? { fix: x.fix } : {}) })) }, { chain: CARD_CHAIN });
      if (!r) { if (!stop) console.log('⏭ không tuyến nào trả lời – dừng (lượt sau viết tiếp)'); stop = true; break; }
      const out = normOut(r.out, part.map(x => ({ k: x.k, w: lex[x.k].w }))) || {};
      for (const x of part) {
        const k = x.k; let c = out[k], why = sceneOk(lex[k], c);
        if (why === 'cap names the word') { const rc = repairCard(lex[k], c); if (rc) { c = rc; why = ''; fixed++; } }
        const last = x.tries + 1 >= CARD_TRIES;
        if (c && c.skip && (last || x.refix)) { if (!x.refix) { cards.items[k] = { skip: String(c.skip).slice(0, 80), by: r.model }; add++; } continue; }
        if (/^skip: draw/.test(why) && last && !x.refix) { cards.items[k] = { skip: 'draw ' + c.draw + ': ' + String(c.ps || '').slice(0, 60), v: SCENE_V, by: r.model }; add++; continue; }
        if (!why) { const old = cards.items[k] || {}; cards.items[k] = { ex: c.ex, ps: String(c.ps).replace(/["“”]/g, '').slice(0, 200), sc: String(c.ps).replace(/["“”]/g, '').slice(0, 200), check: String(c.check).slice(0, 160), cap: String(c.cap).slice(0, 120), ...(c.key ? { key: String(c.key).replace(/["“”]/g, '').slice(0, 160) } : {}), who: Math.min(2, +c.who || 0), draw: +c.draw, v: SCENE_V, by: r.model, ...(x.tries ? { tries: x.tries + 1 } : {}), ...(x.refix ? { refix: (old.refix || 0) + 1 } : {}) }; add++; continue; }
        why0[why.replace(/:.*/, '')] = (why0[why.replace(/:.*/, '')] || 0) + 1;
        // trượt cổng → viết lại NGAY (lô sau) kèm lý do, không bỏ nghĩa; hết lần → đếm hỏng, lượt sau viết tiếp
        if (!last) { q.push({ ...x, tries: x.tries + 1, fix: c && c.skip ? 'skip is the last resort: try the template for this part of speech with the most visible sentence' : why }); continue; }
        bad++; if (!x.refix) { const o = cards.items[k] || {}; cards.items[k] = { ...o, e4bad: (o.e4bad || 0) + 1, badAt: new Date().toISOString() }; } console.log('✗ thẻ', k, why);
      }
    } }));
    if (q.length && Date.now() >= END) console.log(`⏱ hết ${MIN} phút viết thẻ – còn ${q.length} nghĩa, lượt sau viết tiếp`);
    if (process.argv.includes('--write')) { cards.items = Object.fromEntries(Object.entries(cards.items).sort(([a], [b]) => (a < b ? -1 : 1))); fs.writeFileSync(P(SC), JSON.stringify(cards, null, 1) + '\n'); }
    const st = { mode: process.argv.includes('--refix') ? 'refix' : 'cards', asked: todo.length, added: add, upgraded: up, repaired: fixed, failed: bad, gate_retries: why0 };
    if (arg('stats')) fs.writeFileSync(arg('stats'), JSON.stringify(st));
    console.log(`✓ thẻ cảnh +${add} · nâng e4→${SCENE_V} ${up} · sửa tất định ${fixed} · hỏng ${bad} · lý do viết lại ${JSON.stringify(why0)}`); AI.report('vocab-img-scene');
  }
}
