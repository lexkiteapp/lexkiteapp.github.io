#!/usr/bin/env node
/* PILOT NGOÀI LUỒNG "tầng 2" cho nghĩa vi + 2 câu ví dụ (17/11, docs/LEXICON.md §Tầng 2): KHÔNG đụng cổng trên main, KHÔNG ghi kho live – chỉ ghi $OUT (artifact).
 *   node scripts/lexicon/expand/tier2-pilot.mjs --items content/lexicon/expand/pilot/tier2-200.json [--control control-50.json] [--n 200] --out out/tier2
 * Mỗi mục: (A) HỌ 1 soạn vi + 2 câu ví dụ từ nghĩa WordNet khoá · (B) HỌ 2 dịch ngược vi → tiếng Anh (KHÔNG thấy nghĩa khoá) · (C) HỌ 3 chấm độc lập (nghĩa khoá, vi, bản dịch ngược, câu).
 * Nhận (accepted) khi: C ok ∧ C chấm câu đạt ≥ 2/2 ∧ bản dịch ngược của B khớp nghĩa khoá (C xác nhận). Nhóm đối chứng (--control) = mục đường người viết hiện tại, B + C chấm cùng tiêu chí (bỏ bước A). */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool } from '../../lib/ai-pool.mjs';
const A = process.argv.slice(2), arg = (k, d) => { const i = A.indexOf(k); return i >= 0 ? A[i + 1] : d; };
export const chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const GEN_SYS = 'You are a careful Vietnamese–English lexicographer for an English-learning app (learners are Vietnamese). For each item you get an English headword, its part of speech and the ONE locked sense (a WordNet gloss). ' +
  'Write: "vi" = the natural Vietnamese equivalent for THIS sense only (1–3 words/short phrase, correct part of speech, a real Vietnamese word, not a transliteration unless that is the standard word); ' +
  '"ex" = exactly 2 short natural English example sentences (6–18 words) that use the headword in this sense and this part of speech, grammatical, no proper names, no quotes from real texts. ' +
  'Do not translate the examples. Return JSON {"<k>": {"vi": "...", "ex": ["...", "..."]}} with one key per item.';
const BACK_SYS = 'You translate Vietnamese back to English for verification. For each item give "en" = the best English word/short gloss (max 8 words) that the Vietnamese word/phrase "vi" means, given only the English headword\'s part of speech. ' +
  'Do not assume the answer is the headword; translate what the Vietnamese actually means. Return JSON {"<k>": {"en": "..."}} with one key per item.';
const JUDGE_SYS = 'You are an independent senior reviewer of dictionary entries (English–Vietnamese, for learners). You do not trust earlier authors. Each item: headword w, pos, locked sense gloss, Vietnamese equivalent vi, a blind back-translation "back" of vi into English, and 2 example sentences ex. ' +
  'Decide strictly: (1) "vi_ok": vi is a correct, natural Vietnamese equivalent of the LOCKED sense and pos (not another sense, not a non-word); (2) "back_ok": the back-translation is consistent with the locked sense; (3) "ex_ok": number (0–2) of sentences that are grammatical, natural and use the headword in the LOCKED sense and pos. ' +
  'Flag only real errors a teacher would correct. Return JSON {"<k>": {"vi_ok": true|false, "back_ok": true|false, "ex_ok": 0|1|2, "bad": ["short reason"]}} with one key per item.';
const prompt = req => ({ sys: req.pilot === 'gen' ? GEN_SYS : req.pilot === 'back' ? BACK_SYS : JUDGE_SYS, user: JSON.stringify(req.items), temp: req.pilot === 'gen' ? 0.4 : 0.1 });
/** Nhận hay không (thuần, có test): v = phiếu C, back = bản dịch ngược B. */
export const accept = (v, back) => !!(v && v.vi_ok === true && v.back_ok === true && Number(v.ex_ok) >= 2 && back && String(back).trim());
export async function run(items, { AI, log = console.log, gen = true, save = () => {} } = {}) {
  const res = {}, fams = new Set();
  for (const ch of chunks(items, 8)) {
    let out = null, gf = null, gm = null;
    if (gen) {
      const g = await AI.gen({ mode: 'lxgen', pilot: 'gen', items: ch.map(e => ({ k: e.k, w: e.w, pos: e.pos, sense: e.gloss })) }, { chain: ['groq', 'gem'] });
      if (!g) { log(`⏸ không soạn được lô ${ch[0].k}`); continue; }
      fams.add('A:' + g.model); out = g.out || {}; gf = g.fam; gm = g.model;
      for (const e of ch) if (out[e.k]) { e.vi = out[e.k].vi; e.ex = out[e.k].ex; }
    }
    const ok = ch.filter(e => e.vi && Array.isArray(e.ex) && e.ex.length >= 2);
    if (!ok.length) continue;
    const b = await AI.judge({ mode: 'lxaudit', pilot: 'back', items: ok.map(e => ({ k: e.k, pos: e.pos, vi: e.vi })) }, { chain: ['groq', 'gem'], exclude: gf ? [gf] : [] });
    if (!b) { log(`⏸ không dịch ngược được lô ${ch[0].k}`); continue; }
    fams.add('B:' + b.model);
    const jitems = ok.map(e => ({ k: e.k, w: e.w, pos: e.pos, gloss: e.gloss, vi: e.vi, back: ((b.out || {})[e.k] || {}).en || '', ex: e.ex }));
    let c = await AI.judge({ mode: 'lxaudit', pilot: 'judge', _slot: 'C', items: jitems }, { chain: ['groq', 'gem'], slot: 'C', exclude: [b.fam, ...(gf ? [gf] : [])], excludeModels: [b.model] });
    // Gemini 503 suốt lượt (17/11) + Groq chỉ có 2 họ → không còn họ thứ 3: lùi về mô hình KHÁC (cùng họ gpt-oss 20b vs 120b, lời nhắn người soát thứ hai) và đánh dấu c3fam=false trong kết quả
    let c3 = !!c;
    if (!c) c = await AI.judge({ mode: 'lxaudit', pilot: 'judge', _slot: 'C', items: jitems }, { chain: ['groq'], slot: 'C', exclude: [b.fam], excludeModels: [b.model, ...(gm ? [gm] : [])] });
    if (!c) { log(`⏸ không chấm được lô ${ch[0].k}`); continue; }
    fams.add('C:' + c.model);
    for (const e of ok) { const v = (c.out || {})[e.k], back = ((b.out || {})[e.k] || {}).en; res[e.k] = { k: e.k, w: e.w, pos: e.pos, gloss: e.gloss, vi: e.vi, ex: e.ex, back, verdict: v || null, accepted: accept(v, back), c3fam: c3 }; }
    save({ res, models: [...fams] });   // ghi từng lô: bị huỷ/timeout vẫn còn kết quả một phần (lượt 44082417026 mất hết vì chỉ ghi ở cuối)
  }
  return { res, models: [...fams] };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const AI = createPool({ prompt });
  const out = arg('--out', 'out/tier2'); fs.mkdirSync(out, { recursive: true });
  const n = +arg('--n', 1e9), load = f => JSON.parse(fs.readFileSync(f, 'utf8')).items.slice(0, n);
  await AI.health({ probeGem: true });
  const t2 = await run(load(arg('--items')), { AI, save: r => fs.writeFileSync(path.join(out, 'tier2.json'), JSON.stringify(r, null, 1)) });
  let ctl = null; if (arg('--control')) ctl = await run(load(arg('--control')), { AI, gen: false, save: r => fs.writeFileSync(path.join(out, 'control.json'), JSON.stringify(r, null, 1)) });
  const sum = r => { const v = Object.values(r.res); return { judged: v.length, accepted: v.filter(x => x.accepted).length, rate: v.length ? +(v.filter(x => x.accepted).length / v.length).toFixed(3) : 0, models: r.models }; };
  fs.writeFileSync(path.join(out, 'tier2.json'), JSON.stringify(t2, null, 1)); if (ctl) fs.writeFileSync(path.join(out, 'control.json'), JSON.stringify(ctl, null, 1));
  const s = { tier2: sum(t2), ...(ctl ? { control: sum(ctl) } : {}), stats: AI.stats().by };
  fs.writeFileSync(path.join(out, 'summary.json'), JSON.stringify(s, null, 1)); console.log(JSON.stringify({ tier2: s.tier2, control: s.control }));
  if (!s.tier2.judged) { console.error('::error::tier2: 0 mục được chấm (hạ tầng AI)'); process.exit(1); }
}
