// Parity test: the Remotion motion core (core.mjs) and the builder/QC core (core.py) give the same pose/state/value on every sampled time.
import { execFileSync } from 'node:child_process';
import * as C from '../video/remotion/src/stitch/core.mjs';
const nodes = [
  { in: { t: 1.0, k: 'rise' }, out: { t: 3.2 } }, { in: { t: 0.5, k: 'pop' } }, { in: { t: 2, k: 'fade' }, out: { t: 2.5 } },
  { in: { t: 1.2, k: 'draw' } }, { in: { t: 0.7, k: 'soft' }, out: { t: 3 } }, { in: { t: 0, k: 'punch' }, out: { t: 2 } }, { in: { t: 0, k: 'slam' }, out: { t: 2.5 } }, { in: { t: 0.4, k: 'slam' } }, { in: { t: 0.2, k: 'rise' }, val: [{ t: 0.5, d: 0.6, a: 5, b: 6 }, { t: 2.5, d: 0.5, a: 6, b: 6.5 }] }, { in: { t: 0, k: 'rise' }, st: [{ t: 1, s: 'right' }, { t: 2, s: 'dim' }], val: { t: 1.5, d: 0.6, a: 5.5, b: 6 } },
];
const ts = Array.from({ length: 241 }, (_, i) => i / 60);
const js = nodes.map(n => ts.map(t => [C.pose(n, t), C.state(n, t), C.value(n, t)]));
const py = JSON.parse(execFileSync('python3', ['-c', `
import json, sys; sys.path.insert(0, 'scripts/video/motion'); import core as C
N = json.loads(sys.argv[1]); ts = [i / 60 for i in range(241)]
print(json.dumps([[[C.pose(n, t), list(C.state(n, t)), C.value(n, t)] for t in ts] for n in N]))`, JSON.stringify(nodes)]).toString());
let bad = 0;
js.forEach((row, i) => row.forEach(([p, s, v], j) => {
  const [pp, ss, vv] = py[i][j];
  for (const k of ['a', 's', 'dy', 'p']) if (Math.abs(p[k] - pp[k]) > 1e-4) bad++;
  if (s[0] !== ss[0] || s[1] !== ss[1] || Math.abs(s[2] - ss[2]) > 1e-6) bad++;
  if ((v === null) !== (vv === null) || (v !== null && Math.abs(v - vv) > 1e-9)) bad++;
}));
if (bad) { console.error(`motion-core: ${bad} mismatches between core.js and core.py`); process.exit(1); }
console.log(`motion-core: ok (${nodes.length} nodes x ${ts.length} frames, js == py)`);
