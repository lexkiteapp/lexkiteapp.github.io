#!/usr/bin/env node
// Xưởng nội dung – CLI cho content-factory.yml (docs/CONTENT-FACTORY.md).
//   node scripts/factory/run.mjs --plan [--area all|comm|grammar] [--max 4] [--n 25] [--pilot]  → in JSON ma trận {include:[{area,kind,shard,shards}]}
//   node scripts/factory/run.mjs --area comm --kind functions [--n 25] [--shard 0 --shards 1] [--dry] → out/factory/<area>-<kind>-s<shard>.json
// Số lô/đêm (kind có thể đặt K.max riêng) = khoảng trống (chuẩn − có) / n, trần --max mỗi kind, và runner rảnh: tổng shard ≤ 40 − job đang chạy − 16 (giữ ≥ 16 trống, docs/CI-RUNNERS.md).
import { runBatch, wj, OUTDIR, loadState, pick, loadKinds, AREAS } from './lib.mjs';
import { busyJobs, TOTAL } from '../ci/shards.mjs';

const A = process.argv.slice(2), opt = (k, d) => { const i = A.indexOf('--' + k); return i >= 0 ? A[i + 1] : d; }, has = k => A.includes('--' + k);
const KEEP_FREE = 16;

if (has('plan')) {
  const areas = opt('area', 'all') === 'all' ? AREAS : [opt('area')], N = +opt('n', 25), MAX = has('pilot') ? 1 : +opt('max', 4), state = loadState();
  let busy = TOTAL; try { busy = await busyJobs(process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io', process.env.GITHUB_TOKEN); } catch (e) { console.error(`plan: không đọc được số job (${e.message}) → coi như bận hết`); }
  const free = Math.max(1, TOTAL - busy - KEEP_FREE), want = [];
  for (const area of areas) for (const K of Object.values(await loadKinds(area))) {
    const gap = Math.max(0, K.std - K.have()), left = pick(K, { n: 1e9, state }).length;
    const shards = Math.min(has('pilot') ? 1 : (K.max || MAX), Math.ceil(Math.min(gap, left) / N));
    console.error(`plan ${area}/${K.kind}: có ${K.have()}/${K.std} · hạt giống còn ${left} → ${shards} lô`);
    for (let s = 0; s < shards; s++) want.push({ area, kind: K.kind, shard: s, shards, gap });
  }
  // runner rảnh không đủ → ưu tiên kind thiếu nhiều nhất, mỗi kind ít nhất shard 0
  want.sort((a, b) => a.shard - b.shard || b.gap - a.gap);
  const include = want.slice(0, Math.max(free, Math.min(want.length, AREAS.length))).map(({ gap, ...x }) => x);
  console.error(`plan: ${busy} job đang chạy · rảnh ${free} (giữ ${KEEP_FREE}) → ${include.length}/${want.length} lô`);
  console.log(JSON.stringify({ include, parallel: Math.max(1, Math.min(free, include.length)) }));
} else {
  const area = opt('area'), kind = opt('kind'), K = (await loadKinds(area))[kind];
  if (!K) { console.error(`không có kind ${area}/${kind}`); process.exit(2); }
  const shard = +opt('shard', 0), shards = +opt('shards', 1);
  const r = await runBatch(K, { n: +opt('n', 25), shard, shards, dry: has('dry') });
  wj(`${OUTDIR}/${area}-${kind}-s${shard}.json`, r);
  // workflow phải tự đỏ khi kết quả = 0 (METHODS §4) – trừ khi hết hạt giống
  if (!has('dry') && r.stats.seeds && !r.accepted.length && !r.review.length) { console.error(`✗ ${area}/${kind}: ${r.stats.seeds} hạt giống mà 0 mục ra (hạ tầng AI?)`); process.exit(1); }
}
