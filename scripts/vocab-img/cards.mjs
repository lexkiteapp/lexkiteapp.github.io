#!/usr/bin/env node
// Viết THẺ VẼ (content/lexicon/vimg-cards.json) cho nghĩa chưa có thẻ – từ định nghĩa + câu ví dụ của kho từ vựng, qua GrabCast /api/owner-ai/generate
// (văn bản; KHÔNG dùng Workers AI tài khoản chính). Thẻ chỉ là đầu vào: ảnh vẫn phải qua giám khảo GỌI TÊN + QC (strict.mjs) mới được đăng.
//   node scripts/vocab-img/cards.mjs --keys <file.json> [--max N] [--write]   → in số thẻ mới; --write ghi vào vimg-cards.json
// Luật: chỉ nghĩa qua ruleCheck (strict.mjs). Mô hình được phép trả {skip} (trẻ 5 tuổi không gọi được tên từ ảnh) – thẻ skip = không vẽ.
// 429 → chờ lùi (backoff) rồi thử lại; lỗi khác → bỏ nghĩa đó lượt này (không ghi thẻ hỏng).
import fs from 'fs';
import { ruleCheck } from './strict.mjs';
import { cfTextOn } from '../lib/ai-pool.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = new URL('../../', import.meta.url), P = p => new URL(p, ROOT).pathname, rd = p => JSON.parse(fs.readFileSync(P(p), 'utf8'));
const CARDS = 'content/lexicon/vimg-cards.json';
const GC = String(process.env.GRABCAST_API_BASE || 'https://grabcast-api-342720596878.us-central1.run.app').replace(/\/+$/, '');
const KEY = process.env.GRABCAST_AI_KEY;
const sleep = ms => new Promise(s => setTimeout(s, ms));

const ASK = (k, e, lexname) => `You write one drawing card for a children's picture dictionary (flat vector icon style, no text in the image).
Word: ${e.w}  (part of speech: ${e.pos}; WordNet category: ${lexname || '?'})
Meaning: ${e.def}
Example sentence: ${e.ex || '-'}
Test: could a 5-year-old name this exact word from ONE simple picture of THIS meaning? If not (abstract, ambiguous, needs text, looks like another common thing), reply {"skip": "short reason"}.
Otherwise reply JSON only:
{"o": "the canonical object/scene to draw, concrete and specific, 6-25 words, starting with 'a'/'an'/'one'/'two' (for a verb: 'a person ...' doing the action with the whole body or hands visible)",
 "c": "minimal setting, 2-8 words",
 "s": ["names a viewer may use for this picture: the word itself first, then 0-4 EXACT synonyms only (same meaning; never a broader category like drink/food/animal/tool, never a related but different thing), lowercase; for a verb also its -ing form"]${e.pos === 'adj' ? ',\n "k": "color" or "shape"' : ''}}
Never use quotation marks, letters, numbers, signs or labels in o/c. Do not invent a different meaning.`;

async function gen(prompt, tries = 6) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(GC + '/api/owner-ai/generate', { method: 'POST', headers: { 'X-API-Key': KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, provider: 'groq', model: 'openai/gpt-oss-120b' }) }).catch(e => ({ ok: false, status: 0, e }));
    if (r.status === 429 || r.status >= 500 || r.status === 0) { await sleep(Math.min(120e3, 5e3 * 2 ** i)); continue; }
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.text) throw new Error(`${r.status} ${JSON.stringify(j).slice(0, 120)}`);
    // 25/10: văn bản Cloudflare (bể neuron ảnh) TẮT trừ AI_POOL_CF_TEXT=1 – GrabCast tự trả lời bằng CF → dừng lượt thẻ (thẻ còn lại lượt sau viết)
    if (!cfTextOn() && (j.provider === 'cloudflare' || /^@cf\//.test(String(j.model || '')))) throw new Error('GrabCast trả lời bằng Cloudflare (neuron dành cho ảnh) – dừng');
    return String(j.text);
  }
  throw new Error('429/5xx kéo dài');
}
/** định dạng kho thẻ: mỗi thẻ một dòng (dễ duyệt diff), giữ thứ tự (thẻ mới ở cuối) */
export const fmtCards = d => '{\n' + Object.entries(d).filter(([k]) => k !== 'items').map(([k, v]) => ` ${JSON.stringify(k)}: ${JSON.stringify(v)},\n`).join('') +
  ' "items": {\n' + Object.entries(d.items).map(([k, v]) => `  ${JSON.stringify(k)}: ${JSON.stringify(v).replace(/^\{/, '{ ').replace(/\}$/, ' }').replace(/","/g, '", "').replace(/":/g, '": ').replace(/\],"/g, '], "').replace(/","/g, '", "')}`).join(',\n') + '\n }\n}\n';
/** JSON của mô hình hay thiếu ngoặc kép ({o: a bird, s: [bird, robin]}) → đọc nới: JSON chuẩn trước, rồi tách theo khoá o/c/s/k/skip */
export function loose(t) {
  t = String(t || ''); const body = t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1);
  try { return JSON.parse(body); } catch (e) { /* đọc nới */ }
  const field = n => { const m = body.match(new RegExp(`["']?\\b${n}["']?\\s*:\\s*`)); if (!m) return null; const rest = body.slice(m.index + m[0].length);
    const nxt = rest.search(/,\s*["']?(o|c|s|k|skip)["']?\s*:/); return (nxt >= 0 ? rest.slice(0, nxt) : rest.replace(/}\s*$/, '')).trim(); };
  const str = v => (v == null ? undefined : v.replace(/^[\["']+|[\]"']+$/g, '').trim());
  const sk = field('skip'); if (sk) return { skip: str(sk) };
  const o = field('o'); if (!o) return null;
  const sv = field('s'); return { o: str(o), c: str(field('c')), k: str(field('k')), s: sv ? sv.replace(/[\[\]"']/g, '').split(',').map(x => x.trim()).filter(Boolean) : [] };
}
/** kiểm thẻ: → thẻ sạch | null */
export function cleanCard(k, e, c) {
  if (!c || typeof c !== 'object') return null;
  if (c.skip) return { skip: String(c.skip).slice(0, 60) };
  const o = String(c.o || '').replace(/["“”]/g, '').trim(), cx = String(c.c || '').replace(/["“”]/g, '').trim();
  let s = (Array.isArray(c.s) ? c.s : []).map(x => String(x).toLowerCase().replace(/["“”]/g, '').trim()).filter(x => x && x.length < 30);
  if (!s.includes(e.w)) s.unshift(e.w);
  const GENERIC = new Set(['drink', 'food', 'animal', 'tool', 'object', 'thing', 'item', 'plant', 'person', 'people', 'man', 'woman', 'child', 'kid', 'toy', 'device', 'machine', 'building', 'vehicle', 'clothing', 'clothes', 'furniture', 'container', 'equipment', 'snack', 'meal', 'fruit', 'vegetable', 'bird', 'fish', 'insect', 'pet']);
  s = [...new Set(s)].filter(x => x === e.w || !GENERIC.has(x)).slice(0, 6);
  if (o.split(/\s+/).length < 3 || o.length > 220 || /\b(text|label|sign|letters?|words?)\b/i.test(o + ' ' + cx)) return null;
  const out = { o, c: cx, s };
  if (e.pos === 'adj') { if (!['color', 'shape'].includes(c.k)) return null; out.k = c.k; }
  return out;
}
async function main() {
  if (!KEY) { console.error('✗ thiếu GRABCAST_AI_KEY'); process.exit(1); }
  const lex = rd('dist/lexicon.json'), sel = rd('content/lexicon/vimg-select.json').items, cards = rd(CARDS);
  const kf = arg('keys'), keys = JSON.parse(fs.readFileSync(kf, 'utf8')); const list = keys.items || keys;
  const todo = list.filter(k => !cards.items[k] && lex[k] && ruleCheck(k, lex[k], (sel[k] || [])[1]).ok).slice(0, +(arg('max') || 1e9));
  let n = 0, sk = 0, bad = 0;
  const one = async k => {
    try {
      const t = await gen(ASK(k, lex[k], (sel[k] || [])[1]));
      const c = cleanCard(k, lex[k], loose(t));
      if (!c) { bad++; console.warn('✗ thẻ hỏng', k, t.slice(0, 120).replace(/\s+/g, ' ')); return; }
      cards.items[k] = { ...c, by: 'gc' }; c.skip ? sk++ : n++;
      console.log(c.skip ? '· skip' : '✓', k, c.skip || c.o.slice(0, 80));
    } catch (e) { bad++; console.warn('✗', k, e.message); if (/kéo dài|Cloudflare/.test(e.message)) stop = true; }
  };
  let stop = false, i = 0;   // 3 luồng song song (GrabCast 60 lượt/phút/khóa) – 429 tự chờ lùi
  await Promise.all([0, 1, 2].map(async () => { while (!stop && i < todo.length) await one(todo[i++]); }));
  if (process.argv.includes('--write')) {
    fs.writeFileSync(P(CARDS), fmtCards(cards));
  }
  console.log(`thẻ mới: ${n} vẽ · ${sk} skip · ${bad} hỏng (trên ${todo.length} cần)`);
}
if (process.argv[1] && new URL(import.meta.url).pathname === fs.realpathSync(process.argv[1])) main();
