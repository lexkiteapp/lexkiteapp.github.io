#!/usr/bin/env node
// Chấm 2 giám khảo cho mục sổ mẫu câu viết ngoài xưởng (qa.gen, chưa có qa.j), cùng luật runBatch: khác họ, mọi điểm ≥ 4, lệch ≤ 1.
// Đạt → ghi qa.j; thấp → giữ nguyên, liệt kê để viết lại; thiếu giám khảo → lượt sau. Không tự xóa mục.
// Dùng: node scripts/factory/judge-stored.mjs → out/factory/functions.json + out/factory/judged.json (artifact content-judge.yml).
import { pathToFileURL } from 'node:url';
import { JUDGE_SYS, score, chunks, wj, rj, OUTDIR } from './lib.mjs';
import { KINDS } from './comm.mjs';
import { createPool, judgeKey } from '../lib/ai-pool.mjs';

const K = KINDS.functions;
export async function judgeStored(store, AI, log = console.log) {
  const todo = store.functions.filter(f => f.qa && f.qa.gen && !f.qa.j), r = { todo: todo.length, ok: 0, low: [], nojudge: 0 };
  for (const ch of chunks(todo, K.judgeChunk || 6)) {
    const { a, b } = await AI.judgePair({ mode: 'cfjudge', items: ch.map(f => ({ k: f.id, ...K.view(f, { name: f.name, level: f.level, situations: f.situations }) })) }, { exclude: [] });
    for (const f of ch) {
      const sa = a && score(a.out, f.id), sb = b && score(b.out, f.id);
      if (sa == null || sb == null) { r.nojudge++; continue; }
      if (sa >= 4 && sb >= 4 && Math.abs(sa - sb) <= 1) { f.qa.j = { [judgeKey(a.model)]: sa, [judgeKey(b.model)]: sb }; r.ok++; }
      else r.low.push({ k: f.id, sa, sb, why: [a.out[f.id]?.why, b.out[f.id]?.why].filter(Boolean).join(' | ').slice(0, 300) });
    }
  }
  log(`chấm ${r.todo}: đạt ${r.ok} · thấp ${r.low.length} · thiếu giám khảo ${r.nojudge}`);
  return r;
}
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const store = rj('content/framework/functions.json', { functions: [] });
  const AI = createPool({ budget: { lexai: 0, cf2: 0 }, prompt: req => ({ sys: JUDGE_SYS(K.rubric), user: JSON.stringify(req.items), temp: 0.1 }) });
  const r = await judgeStored(store, AI);
  wj(`${OUTDIR}/functions.json`, store); wj(`${OUTDIR}/judged.json`, r);
  if (r.todo && !r.ok && !r.low.length) { console.error('✗ có mục cần chấm mà 0 kết quả (hạ tầng AI?)'); process.exit(1); }
}
