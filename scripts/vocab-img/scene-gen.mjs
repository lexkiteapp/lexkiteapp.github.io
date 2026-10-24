#!/usr/bin/env node
// Lượt vẽ cho ảnh "mọi nghĩa" + ảnh bài học giai đoạn 1 (docs/VISUAL-LEARNING-PLAN.md) – CÙNG nhà vẽ (gen.mjs PROVIDERS: GrabCast Cloudflare FLUX), cùng cổng.
//   node scripts/vocab-img/scene-gen.mjs --keys keys.json --out <dir> [--attempt 1|2] [--shard i/n] [--targets-only]
// keys.json {items:[…]}: 'từ#loại' (nghĩa kho) · 'topic:<id>' (bìa chủ đề, content/lexicon/topics.json) · 'conf:<id>' (tình huống bài Tự tin, content/confidence/units).
// Ghi <dir>/targets.json {k: {kind, prompt?, target, ex?, caption_ref[], sib[]}} – ĐẦU VÀO của giám khảo cục bộ (local_judge.py): target = điều ảnh phải thể hiện
// (gloss / cảnh câu ví dụ / chủ đề), sib = khoá anh em cùng chủ đề làm nhiễu. Ô khái niệm (hư từ) → <dir>/svg/ (concept.mjs), không gọi AI.
// --shard i/n: chỉ khoá có fnv(k) % n == i (ma trận ≤ 10 việc / lượt, mỗi việc thuê riêng ở điều phối). 429 → chờ lùi trong gen.mjs (65→240 s, 6 lần = dừng nhà).
import fs from 'fs';
import path from 'path';
import { PROVIDERS, slug } from './gen.mjs';
import { promptFromCard } from './strict.mjs';
import { kind, promptScene, SCENE_STYLE, RETRY_SCENE } from './scene.mjs';
import { conceptSvg, familyOf, conceptHash } from './concept.mjs';
import { fnv, PEOPLE } from './style.mjs';

const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : undefined; };
const ROOT = new URL('../../', import.meta.url), P = p => new URL(p, ROOT).pathname, rd = p => JSON.parse(fs.readFileSync(P(p), 'utf8'));
const OUT = arg('out') || 'out/vocab-img-scene', ATT = +(arg('attempt') || 1);
const [SI, SN] = String(arg('shard') || '0/1').split('/').map(Number);
const isImg = b => b && b.length > 1000 && ((b[0] === 0xff && b[1] === 0xd8) || (b[0] === 0x89 && b[1] === 0x50) || b.slice(8, 12).toString() === 'WEBP');

/** bìa chủ đề + tình huống bài Tự tin → { prompt, target, caption_ref } (tất định, không AI viết thẻ) */
// prompt tay content/visual/lesson-scenes.json (l2, sau nhãn 24/10: bìa 8/100 đạt – người ngồi phòng khách chung chung; bài học có biển/bong bóng chữ)
let LS = null;
const lessonScene = k => { if (!LS) { try { LS = JSON.parse(fs.readFileSync(new URL('../../content/visual/lesson-scenes.json', import.meta.url), 'utf8')).items; } catch { LS = {}; } } return LS[k]; };
export function lessonTarget(k, topics, conf) {
  const who = PEOPLE[fnv(k) % PEOPLE.length], who2 = PEOPLE[(fnv(k) >> 3) % PEOPLE.length] === who ? PEOPLE[(fnv(k) + 1) % PEOPLE.length] : PEOPLE[(fnv(k) >> 3) % PEOPLE.length];
  const hand = lessonScene(k), fill = s => s.replace(/\{A\}/g, who).replace(/\{B\}/g, who2);
  if (k.startsWith('topic:')) {
    const t = topics.find(x => x.id === k.slice(6)); if (!t) return null; const name = t.name.en;
    if (hand) return { kind: 'cover', target: `a picture about ${name.toLowerCase()}`, sit: fill(hand).replace(/\{[AB]\}/g, 'a person'), caption_ref: [name, fill(hand)], prompt: `Illustration, one clear centered composition about ${name.toLowerCase()}: ${fill(hand)}. The objects are large, iconic and instantly recognisable. ${SCENE_STYLE}` };
    return { kind: 'cover', target: `a picture about ${name.toLowerCase()}`, caption_ref: [name], prompt: `Illustration, wide shot: one inviting everyday scene that clearly shows the topic ${name.toLowerCase()}, with ${who} and two or three typical objects of this topic. ${SCENE_STYLE}` };
  }
  if (k.startsWith('conf:')) {
    const u = conf[k.slice(5)]; if (!u) return null; const role = (u.dialogue && u.dialogue.aRole) || 'a helpful person';
    if (hand) return { kind: 'lesson', target: `${u.title.en.toLowerCase()}: ${u.goal.en}`, sit: fill(hand), caption_ref: [u.title.en, u.goal.en, fill(hand)], prompt: `Illustration, medium shot: ${fill(hand)}. ${SCENE_STYLE}` };
    return { kind: 'lesson', target: `${u.title.en.toLowerCase()}: ${u.goal.en}`, caption_ref: [u.title.en, u.goal.en], prompt: `Illustration, medium shot: ${who} talking with ${role} in this situation: ${u.goal.en.replace(/\.$/, '')}. ${SCENE_STYLE}` };
  }
  return null;
}
export function buildTargets(keys, ctx) {
  const { lex, sel, cards, scenes, topics, conf } = ctx, T = {};
  const setOf = {}; for (const [k, e] of Object.entries(lex)) for (const s of e.sets || []) (setOf[s] = setOf[s] || []).push(k);
  for (const k of keys) {
    if (/^(topic|conf):/.test(k)) { const t = lessonTarget(k, topics, conf); if (t && ATT > 1) t.prompt = t.prompt.replace(SCENE_STYLE, RETRY_SCENE + ' ' + SCENE_STYLE); if (t) T[k] = { ...t, sib: keys.filter(x => x !== k && x.slice(0, 5) === k.slice(0, 5)) }; continue; }
    const e = lex[k]; if (!e) continue;
    const kd = kind(k, e, (sel[k] || [])[1], cards[k]);
    const sib = [...new Set((e.sets || []).flatMap(s => setOf[s] || []))].filter(x => x !== k && x.split('#')[0] !== e.w).sort((a, b) => fnv(k + a) - fnv(k + b)).slice(0, 12);
    if (kd === 'concept') { T[k] = { kind: 'concept', fam: familyOf(e.w), h: conceptHash(e.w), target: e.def }; continue; }
    if (kd === 'object') { const c = cards[k]; T[k] = { kind: 'object', target: `an illustration of ${e.w}: ${String(e.def || '').slice(0, 120)}`, caption_ref: [e.w, ...((c && c.s) || []), String(e.def || '')], sib, ...(c && !c.skip ? { prompt: promptFromCard(k, c, ATT) } : {}) }; continue; }
    const s = scenes[k];
    T[k] = { kind: 'scene', ex: s && s.ex, target: s && s.cap ? s.cap : '', caption_ref: s && !s.skip ? [s.cap, s.ex] : [], sib, sit: s && s.sc, ...(s && !s.skip && s.sc && s.ex ? { prompt: promptScene(k, s, ATT) } : { fallback: 'type' }) };
  }
  return T;
}

async function main() {
  const rdo = (p, d) => (fs.existsSync(P(p)) ? rd(p) : d);
  const conf = {}; for (const f of fs.readdirSync(P('content/confidence/units'))) { const u = JSON.parse(fs.readFileSync(P('content/confidence/units/' + f), 'utf8')); conf[u.id] = u; }
  const ctx = { lex: rd('dist/lexicon.json'), sel: rd('content/lexicon/vimg-select.json').items, cards: rd('content/lexicon/vimg-cards.json').items, scenes: rdo('content/lexicon/vimg-scenes.json', { items: {} }).items, topics: rd('content/lexicon/topics.json').topics, conf };
  const kf = arg('keys'), all = JSON.parse(fs.readFileSync(kf, 'utf8')).items, keys = all.filter(k => SN <= 1 || fnv(k) % SN === SI);
  fs.mkdirSync(path.join(OUT, 'raw'), { recursive: true }); fs.mkdirSync(path.join(OUT, 'svg'), { recursive: true });
  const T = buildTargets(all, ctx);   // đích + nhiễu tính trên CẢ lô (giám khảo cần anh em), vẽ chỉ phần của shard
  fs.writeFileSync(path.join(OUT, 'targets.json'), JSON.stringify(T, null, 1));
  for (const [k, t] of Object.entries(T)) if (t.kind === 'concept' || t.fallback === 'type') fs.writeFileSync(path.join(OUT, 'svg', slug(k) + '.svg'), conceptSvg(k.split('#')[0].replace(/^(topic|conf):/, '')));
  if (process.argv.includes('--targets-only')) return console.log(`✓ đích ${Object.keys(T).length}`);
  const logF = path.join(OUT, `gen.s${SI}.json`), log = fs.existsSync(logF) ? JSON.parse(fs.readFileSync(logF, 'utf8')) : [];
  const used = Object.fromEntries(PROVIDERS.map(p => [p.id, 0])), dead = new Set(PROVIDERS.filter(p => !p.ok()).map(p => p.id));
  const only = arg('only') ? new Set(JSON.parse(fs.readFileSync(arg('only'), 'utf8')).items) : null;
  // song song trong 1 việc: GrabCast ảnh 60/phút/IP (mỗi runner GitHub một IP) → VIMG_CONC luồng (mặc định 6 ≈ 60 ảnh/phút với ~5 s/ảnh); 429 → Retry-After (gen.mjs)
  let n = 0, stop = false; const t0 = Date.now(), CONC = Math.max(1, +(process.env.VIMG_CONC || 6));
  const todo = keys.filter(k => T[k] && T[k].prompt && (!only || only.has(k)) && !fs.existsSync(path.join(OUT, 'raw', `${slug(k)}.a${ATT}.jpg`)));
  async function one(k) {
    const t = T[k], file = path.join(OUT, 'raw', `${slug(k)}.a${ATT}.jpg`);
    for (const p of PROVIDERS) {
      if (dead.has(p.id) || used[p.id] >= p.max) continue;
      used[p.id]++; const s = Date.now();
      try { const buf = await p.run(t.prompt); if (!isImg(buf)) throw new Error('không phải ảnh'); fs.writeFileSync(file, buf); n++; log.push({ k, attempt: ATT, provider: p.id, ms: Date.now() - s }); return; }
      catch (err) { if (err.constructor.name === 'Quota') { dead.add(p.id); console.warn(`⏸ ${p.id}: ${err.message}`); } else { console.warn(`✗ ${p.id} ${k}: ${err.message}`); log.push({ k, attempt: ATT, provider: p.id, error: String(err.message).slice(0, 160) }); } }
    }
    if (PROVIDERS.every(p => dead.has(p.id) || used[p.id] >= p.max)) stop = true;
  }
  await Promise.all(Array.from({ length: CONC }, async () => { while (todo.length && !stop) await one(todo.shift()); }));
  if (stop) console.log('⏹ hết ngân sách ảnh lượt này – dừng sạch');
  fs.writeFileSync(logF, JSON.stringify(log, null, 1));
  const min = (Date.now() - t0) / 60e3;
  fs.writeFileSync(path.join(OUT, `speed.gen.s${SI}.a${ATT}.json`), JSON.stringify({ images: n, minutes: +min.toFixed(2), per_min: +(n / Math.max(min, 1e-3)).toFixed(2) }));
  console.log(`✓ vẽ ${n} ảnh (lần ${ATT}, shard ${SI}/${SN}) trong ${min.toFixed(1)} phút = ${(n / Math.max(min, 1e-3)).toFixed(2)} ảnh/phút · ${JSON.stringify(used)}`);
}
if (path.resolve(process.argv[1] || '') === path.resolve(new URL(import.meta.url).pathname)) main();
