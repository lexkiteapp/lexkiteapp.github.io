"""Regression for scripts/media/origin.py (2/11: Worker 429 -> every teach-video render red). Run: python3 scripts/test/media-origin.py"""
import os, sys, tempfile
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'media'))
from origin import candidates, fetch

fail = 0
def ok(c, m):
    global fail
    if not c: fail += 1; print('✗', m)

V = 'https://media.lexkite.com/vimg/c33d0e59a6805fee.webp'
c = candidates(V)
ok(c[0] == 'https://lexkiteapp.github.io/lexkite-media-4/vimg/c33d0e59a6805fee.webp', 'shared path: newest open repo (m4) Pages first')
ok(c[1] == 'https://raw.githubusercontent.com/lexkiteapp/lexkite-media-4/main/vimg/c33d0e59a6805fee.webp', 'then m4 raw')
ok('https://lexkiteapp.github.io/lexkite-media/vimg/c33d0e59a6805fee.webp' in c, 'full repo m1 still tried')
ok(c[-1] == V, 'Worker URL only as the last resort')
ok(not any('lexkite-media-2' in u or 'lexkite-media-3' in u for u in c), 'audio repos (other CDN) never tried for media.lexkite.com')
m4 = candidates('https://media.lexkite.com/m4/vimg/a.webp')
ok(m4 == ['https://lexkiteapp.github.io/lexkite-media-4/vimg/a.webp', 'https://raw.githubusercontent.com/lexkiteapp/lexkite-media-4/main/vimg/a.webp', 'https://media.lexkite.com/m4/vimg/a.webp'], 'm4/ prefix -> m4 only, prefix stripped')
ok(candidates('https://example.org/x.png') == ['https://example.org/x.png'], 'other hosts pass through')

class R:
    def __init__(s, rc): s.returncode = rc
def fake(good):
    seen = []
    def run(cmd, capture_output=True):
        u, dest = cmd[-1], cmd[cmd.index('-o') + 1]; seen.append(u)
        if u in good: open(dest, 'wb').write(b'RIFF')
        return R(0 if u in good else 22)
    return run, seen
d = os.path.join(tempfile.mkdtemp(), 'p.webp')
run, seen = fake({c[2]})   # m4 missing (404), m1 Pages has it
ok(fetch(V, d, run) == c[2] and seen == c[:3], 'falls through 404s to the first origin that has the file, Worker untouched')
run, seen = fake({V})       # only the Worker answers
ok(fetch(V, d, run) == V, 'Worker still used when GitHub has nothing')
run, _ = fake(set())
try: fetch(V, d, run); ok(False, 'all fail -> raise')
except RuntimeError as e: ok('media fetch failed' in str(e), 'error names every tried URL')

print('media-origin:', 'OK' if not fail else f'{fail} FAIL'); sys.exit(1 if fail else 0)
