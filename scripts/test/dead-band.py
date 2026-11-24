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
try: import numpy as np
except ImportError: np = None   # preqc job has no numpy; the render job (qc.py) and the suite run these asserts
if np is not None:
    bare = np.full((480, 270), 40.0); assert D.empty_ratio(bare) > 0.99, 'a bare background frame is 100 % empty'
    busy = np.random.RandomState(2).uniform(0, 255, (480, 270)); assert D.empty_ratio(busy) == 0.0, 'full texture has no bare background'
    card = bare.copy(); card[20:460, 20:250] = 200.0 + np.random.RandomState(3).uniform(-30, 30, (440, 230)); assert D.empty_ratio(card) < D.MAX_EMPTY, 'a big card on the background fills the frame (card tone is not background)'
    tiny = bare.copy(); tiny[200:260, 100:160] = 200.0; assert D.empty_ratio(tiny) > D.MAX_EMPTY, 'a tiny card in a bare frame fails'
    assert D.check([bare, bare], empty=True)['ok'] is False and D.check([card, card], empty=True)['ok'] is True and 'max_empty_pct' in D.check([card])
print('dead_band: OK')
