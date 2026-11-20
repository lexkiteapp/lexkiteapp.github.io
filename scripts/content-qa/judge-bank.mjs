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
// chấm được = có chữ để đọc: câu tự đủ nghĩa, hoặc có ngữ cảnh (kịch bản phần nghe "Number n." / đoạn bài đọc quanh chỗ trống / cue). Chỉ audio mà không có kịch bản → cần ASR (CI), đếm vào `needAsr`.
const textual = i => !!i.ctx || (i.q.trim().length >= 12 && i.options.some(o => o.trim().length > 1));

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
const view = i => ({ q: i.q, options: i.options, key: i.a, explain: i.explain.slice(0, 600), level: i.level, ...(i.ctx ? { context: i.ctx.slice(0, 1200), note: 'context = transcript/passage the item refers to; bare A/B/C options are the spoken choices in the transcript' } : {}) });

// concurrency = số lô chấm song song; deadline (ms epoch) = hết giờ thì dừng và trả kết quả một phần (đủ để đo, không mất cả lần chạy).
export async function judge(items, AI, log = console.log, { concurrency = 4, deadline = Infinity } = {}) {
  const R = { sampled: items.length, judged: 0, pass: 0, low: [], nojudge: 0, byGroup: {} };
  const queue = chunks(items, 6);
  const one = async ch => {
    const { a, b } = await AI.judgePair({ mode: 'cfjudge', items: ch.map(i => ({ k: i.k, ...view(i) })) }, { exclude: [] });
    for (const i of ch) {
      const g = (R.byGroup[i.group] ||= { sampled: 0, judged: 0, pass: 0 }); g.sampled++;
      const sa = a && score(a.out, i.k), sb = b && score(b.out, i.k);
      if (sa == null || sb == null) { R.nojudge++; continue; }
      R.judged++; g.judged++;
      if (sa >= 4 && sb >= 4 && Math.abs(sa - sb) <= 1) { R.pass++; g.pass++; }
      else R.low.push({ k: i.k, sa, sb, id: i.id, q: i.q.slice(0, 80), why: [a.out[i.k]?.why, b.out[i.k]?.why].filter(Boolean).join(' | ').slice(0, 300) });
    }
  };
  await Promise.all(Array.from({ length: concurrency }, async () => { for (let ch; (ch = queue.shift()) && Date.now() < deadline;) { try { await one(ch); } catch (e) { R.nojudge += ch.length; } } }));
  R.partial = queue.length > 0;
  R.passPct = R.judged ? Math.round((1000 * R.pass) / R.judged) / 10 : null;
  log(`mẫu ${R.sampled}: chấm được ${R.judged} · đạt ${R.pass} (${R.passPct}%) · thấp ${R.low.length} · thiếu giám khảo ${R.nojudge}`);
  return R;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const A = process.argv.slice(2), ni = A.indexOf('--n'), total = ni >= 0 ? +A[ni + 1] : 1500;
  const { items } = auditBank(loadContent()), mine = sample(items, total).sort((x, y) => (h(x.k) < h(y.k) ? -1 : 1)); // xen kẽ nhóm: hết giờ vẫn có mẫu đủ nhóm
  const audioOnly = items.length - items.filter(textual).length;
  console.log(`kho ${items.length} câu · chữ chấm được ${items.length - audioOnly} · thiếu chữ (cần ASR) ${audioOnly} · mẫu ${mine.length}`);
  if (A.includes('--dry')) process.exit(0);
  const AI = createPool({ budget: { lexai: 0, cf2: 0 }, prompt: req => ({ sys: JUDGE_SYS(RUBRIC), user: JSON.stringify(req.items), temp: 0.1 }) });
  const bi = A.indexOf('--budget-min'), deadline = Date.now() + (bi >= 0 ? +A[bi + 1] : 45) * 60000;
  const R = await judge(mine, AI, console.log, { deadline }); R.needAsr = audioOnly;
  fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync('reports/bank-judge.json', JSON.stringify(R, null, 1));
  if (R.sampled && !R.judged) { console.error('✗ có mẫu cần chấm mà 0 kết quả (hạ tầng AI?)'); process.exit(1); }
}
