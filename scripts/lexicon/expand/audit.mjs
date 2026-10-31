#!/usr/bin/env node
// Soát mẫu + xuất lô chờ TỰ ĐỘNG (31/10: lô 20261031 kẹt ở pending vì soát mẫu chỉ làm tay – docs/CONTENT-QA.md lớp 6, docs/LEXICON.md §Xuất).
//   node scripts/lexicon/expand/audit.mjs <lô> --out checked.json [--sample 50] [--dry: pilot – chỉ in, không ghi hàng duyệt/lô]
// Mẫu tất định (cùng thứ tự promote.mjs --sample), max(50, 5 %). 3 giám khảo khác họ (gem · groq · họ thứ ba) soát CẢ MỤC (def/ví dụ/vi/13 ngôn ngữ ↔ nghĩa khoá).
// Sai = ≥ 2/3 nêu lỗi (đếm vào ngưỡng 2 % của spot → sai > 1/50 loại cả lô); 1/3 nêu lỗi → mục không xuất, về hàng duyệt (thận trọng, không đếm sai).
// Thiếu giám khảo cho bất kỳ mục mẫu nào = hạ tầng → không ghi gì, exit 3 (lô giữ nguyên, lượt sau soát lại).
import fs from 'fs';
import crypto from 'crypto';
import { ROOT, rd, wr } from '../lib.mjs';
import { QUEUE } from './lib.mjs';
import { createPool } from '../../lib/ai-pool.mjs';

const [id] = process.argv.slice(2), arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
const PEND = `content/lexicon/expand/pending/${id}.json`, P = JSON.parse(rd(PEND)), keys = Object.keys(P.items);
export const sampleKeys = (bid, ks, n) => ks.slice().sort((a, b) => crypto.createHash('sha1').update(bid + a).digest('hex') < crypto.createHash('sha1').update(bid + b).digest('hex') ? -1 : 1).slice(0, n);
const N = Math.min(keys.length, Math.max(+arg('--sample', 50), Math.ceil(keys.length * 0.05)));
const S = sampleKeys(id, keys, N);

const SYS = 'You are a strict senior lexicographer auditing FINISHED entries of an English learner dictionary for Vietnamese and international learners. ' +
  'Each item gives the headword, part of speech (pos) and the locked WordNet sense (sense). Check every field against THAT sense and pos: ' +
  '(1) def states this sense, correct pos; (2) each example uses the headword in this sense, naturally; (3) vi is a correct Vietnamese equivalent for this sense (not another sense, not a non-word); ' +
  '(4) each translation in m (ISO codes) is a real word/phrase in that language meaning this sense with matching pos; (5) level (CEFR) is plausible. ' +
  'Flag ONLY real errors a teacher would correct (wrong sense, wrong pos, wrong or nonexistent word, unnatural/misleading example). Do not flag style, acceptable synonyms or missing languages. ' +
  'Return JSON {"<k>": {"ok": true|false, "bad": ["field: short reason"]}} with one key per item.';
const forAudit = k => { const e = P.items[k]; return { k, w: e.w, pos: e.pos, sense: (e.src && e.src.trSense) || e.gloss || '', def: e.def, ex: e.ex, vi: e.vi, m: e.m, level: e.level }; };
const AI = createPool({ prompt: req => ({ sys: SYS, user: JSON.stringify(req.items), temp: 0.1 }) });
const V = {}, chunks = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const verdict = (o, k) => { const v = o && o[k]; if (!v || typeof v !== 'object') return null; return v.ok === false || v.ok === 'false' ? { bad: [].concat(v.bad || 'lỗi') } : v.ok === true || v.ok === 'true' ? { bad: [] } : null; };
for (const ch of chunks(S, 5)) {
  const req = { mode: 'lxaudit', items: ch.map(forAudit) };
  const a = await AI.judge(req, { chain: ['gem', 'groq', 'cf2'] });
  const b = a && await AI.judge(req, { chain: ['groq', 'gem', 'cf2'], exclude: [a.fam], excludeModels: [a.model] });
  const c = b && await AI.judge(req, { chain: ['groq', 'cf2', 'gem'], slot: 'C', exclude: [a.fam, b.fam], excludeModels: [a.model, b.model] });
  for (const k of ch) { const vs = [a, b, c].map(j => j && verdict(j.out, k)); if (vs.every(Boolean)) V[k] = { vs, by: [a.model, b.model, c.model] }; }
}
const miss = S.filter(k => !V[k]);
if (miss.length) { console.log(`⏸ soát lô ${id}: thiếu giám khảo cho ${miss.length}/${S.length} mục mẫu (hạ tầng) – giữ lô, lượt sau soát lại`); process.exit(3); }
const checked = [], hold = [];
for (const k of S) { const v = V[k], bad = v.vs.filter(x => x.bad.length), notes = bad.flatMap(x => x.bad).slice(0, 3).join(' · ');
  if (bad.length >= 2) checked.push({ id: k, ok: false, note: `soát AI ${bad.length}/3: ${notes}` });
  else { checked.push({ id: k, ok: true, ...(bad.length ? { note: `1/3 nêu lỗi (về hàng duyệt): ${notes}` } : {}) }); if (bad.length) hold.push([k, notes]); } }
if (hold.length && !process.argv.includes('--dry')) { const q = JSON.parse(rd(QUEUE));
  for (const [k, n] of hold) { if (!q.items.some(x => x.src === 'lexicon-expand' && x.id === k)) q.items.push({ src: 'lexicon-expand', id: k, batch: id, why: ['soát mẫu AI 1/3: ' + n], at: new Date().toISOString().slice(0, 10), data: P.items[k] }); delete P.items[k]; }
  P.n = Object.keys(P.items).length; wr(QUEUE, JSON.stringify(q, null, 1) + '\n'); wr(PEND, JSON.stringify(P).replace(/,"(?=[^"]+#(n|v|adj|adv)":)/g, ',\n"') + '\n'); }
fs.writeFileSync(arg('--out', 'checked.json'), JSON.stringify(checked, null, 1));
console.log(`✓ soát lô ${id}: mẫu ${S.length}/${keys.length} · sai (≥ 2/3) ${checked.filter(x => !x.ok).length} · về hàng duyệt (1/3) ${hold.length} · giám khảo ${[...new Set(Object.values(V).flatMap(v => v.by))].join(', ')}`);
