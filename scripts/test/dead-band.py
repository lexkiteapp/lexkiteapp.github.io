#!/usr/bin/env python3
"""dead_band gate logic (scripts/video/tpl/dead_band.py): flat panel found, gradient counted, textured plate / split bands / short bands pass."""
import os, random, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); sys.path.insert(0, f'{ROOT}/scripts/video/tpl')
import dead_band as D
H = 1920; R = random.Random(1)
tex = lambda n: ([R.uniform(12, 40) for _ in range(n)], [R.uniform(60, 180) for _ in range(n)])   # photo / cards: high std per row, wandering mean
flat = lambda n, m: ([0.4] * n, [m] * n)
def stack(*parts): return [sum((p[0] for p in parts), []), sum((p[1] for p in parts), [])]
band = lambda *p: D.longest_band(*stack(*p))[0] / H
assert band(tex(1500), flat(420, 40)) >= 0.2, 'flat panel at the bottom (the owner screenshot: ~20% of the frame)'
assert band(tex(1500), (list(map(float, [0.3] * 420)), [30 + i * 0.02 for i in range(420)])) >= 0.2, 'a smooth gradient is still empty'
assert band(tex(1700), flat(100, 40)) < D.MIN_FRAC, 'a 5% strip is a margin, not a dead band'
assert band(tex(900), flat(100, 40), tex(100), flat(100, 40), tex(720)) < D.MIN_FRAC, 'a rule / photo edge splits the band'
assert band(tex(H)) == 0, 'full-bleed texture passes'
assert band(flat(H, 40)) == 1.0, 'an empty frame is one band'
assert band(flat(200, 40), flat(200, 200)) <= 200 / H, 'a hard brightness step starts a new band'
print('dead_band: OK')
