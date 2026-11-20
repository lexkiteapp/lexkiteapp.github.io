#!/usr/bin/env node
// Giám khảo LLM cho kho trắc nghiệm (docs/CONTENT-WORLD-PLAN.md §7, sóng E0). Mẫu phân tầng tất định theo nhóm, 2 giám khảo khác họ (judgePair, `cfjudge`),
// luật như xưởng: câu đạt khi cả hai điểm ≥ 4 và lệch ≤ 1. Câu chỉ có audio (đáp án A/B/C trần, không chữ) không chấm được bằng chữ → đếm riêng.
// Dùng: node scripts/content-qa/judge-bank.mjs [--n 1500] [--dry] → reports/bank-judge.json (artifact của bank-judge.yml). Thiếu giám khảo = trung lập (không tính trượt).
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadContent } from '../lib/content-load.mjs';
import { auditBank } from './bank-audit.mjs';
import { JUDGE_SYS, score, chunks } from '../factory/lib.mjs';
import { createPool } from '../lib/ai-pool.mjs';

export const RUBRIC = 'Items are multiple-choice test questions (grammar, TOEIC, TOEFL, IELTS, Cambridge). Each has "q", "options", "key" (index of the intended answer) and "explain". ' +
  'Check: (1) exactly ONE option is defensible and it equals the key; (2) distractors are plausible but clearly wrong for a reason (no joke options, no duplicate meanings, no giveaway by length or grammar); ' +
  '(3) the explanation is correct, specific to THIS item (not a generic template) and says why the key is right; (4) English is natural and the level fits an exam of this type.';
const h = s => createHash('sha1').update(s).digest('hex');
const textual = i => i.q.trim().length >= 12 && i.options.some(o => o.trim().length > 1);

export function sample(items, total = 1500, seed = 'e0') {
  const by = {}; for (const i of items.filter(textual)) (by[i.group] ||= []).push(i);
  const names = Object.keys(by), N = names.reduce((a, k) => a + by[k].length, 0), out = [];
  for (const k of names) {
    const want = Math.min(by[k].length, Math.max(60, Math.round((total * by[k].length) / N)));
    const ord = by[k].map((i, ix) => ({ i, ix, r: h(`${seed}|${k}|${ix}|${i.q}`) })).sort((a, b) => (a.r < b.r ? -1 : 1));
    out.push(...ord.slice(0, want).map(({ i, ix }) => ({ ...i, k: `${k}#${ix}` })));
  }
  return out;
}
const view = i => ({ q: i.q, options: i.options, key: i.a, explain: i.explain.slice(0, 600), level: i.level });

export async function judge(items, AI, log = console.log) {
  const R = { sampled: items.length, judged: 0, pass: 0, low: [], nojudge: 0, byGroup: {} };
  for (const ch of chunks(items, 6)) {
    const { a, b } = await AI.judgePair({ mode: 'cfjudge', items: ch.map(i => ({ k: i.k, ...view(i) })) }, { exclude: [] });
    for (const i of ch) {
      const g = (R.byGroup[i.group] ||= { sampled: 0, judged: 0, pass: 0 }); g.sampled++;
      const sa = a && score(a.out, i.k), sb = b && score(b.out, i.k);
      if (sa == null || sb == null) { R.nojudge++; continue; }
      R.judged++; g.judged++;
      if (sa >= 4 && sb >= 4 && Math.abs(sa - sb) <= 1) { R.pass++; g.pass++; }
      else R.low.push({ k: i.k, sa, sb, why: [a.out[i.k]?.why, b.out[i.k]?.why].filter(Boolean).join(' | ').slice(0, 300) });
    }
  }
  R.passPct = R.judged ? Math.round((1000 * R.pass) / R.judged) / 10 : null;
  log(`mẫu ${R.sampled}: chấm được ${R.judged} · đạt ${R.pass} (${R.passPct}%) · thấp ${R.low.length} · thiếu giám khảo ${R.nojudge}`);
  return R;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const A = process.argv.slice(2), ni = A.indexOf('--n'), total = ni >= 0 ? +A[ni + 1] : 1500;
  const { items } = auditBank(loadContent()), mine = sample(items, total);
  const audioOnly = items.length - items.filter(textual).length;
  console.log(`kho ${items.length} câu · chữ chấm được ${items.length - audioOnly} · chỉ audio ${audioOnly} · mẫu ${mine.length}`);
  if (A.includes('--dry')) process.exit(0);
  const AI = createPool({ budget: { lexai: 0, cf2: 0 }, prompt: req => ({ sys: JUDGE_SYS(RUBRIC), user: JSON.stringify(req.items), temp: 0.1 }) });
  const R = await judge(mine, AI); R.audioOnly = audioOnly;
  fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync('reports/bank-judge.json', JSON.stringify(R, null, 1));
  if (R.sampled && !R.judged) { console.error('✗ có mẫu cần chấm mà 0 kết quả (hạ tầng AI?)'); process.exit(1); }
}
