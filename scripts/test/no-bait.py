#!/usr/bin/env python3
"""Clip policy gate (owner 15/11): no engagement-bait CTA anywhere in clip text sources + the Kit overlay stays token-driven and readable.
python3 scripts/test/no-bait.py   (ci.yml; the Kit smoke part needs Pillow and is skipped without it)"""
import os, re, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')); sys.path.insert(0, f'{ROOT}/scripts/cine')
import no_bait as NB   # noqa: E402
fails = []
def ok(c, m):
    if not c: fails.append(m)
for s in ('Comment below', 'Comment A or B', 'comment your answer', 'Follow for more', 'Follow for daily English', 'Comment your guess!'): ok(NB.BAIT.search(s), f'detector misses "{s}"')
for s in ('Free practice on lexkite.com', 'first_comment', 'Which one is right? Pick your answer first.'): ok(not NB.BAIT.search(s), f'detector false positive "{s}"')
ok(not NB.BAIT.search(NB.fix_text('Which one is right? Comment below. Follow for more')), 'fix_text leaves bait')
for p in list(NB.files(['content/video', 'scripts/cine', 'scripts/scriptbank', 'scripts/video'])):
    t = open(p, encoding='utf-8').read()
    for m in NB.BAIT.finditer(t): ok(False, f'bait in {os.path.relpath(p, ROOT)}: {t[max(0, m.start() - 20):m.end() + 20]!r}'); break
# Kit overlay: no hex/RGB literals in the Kit renderers, tokens only
kit = open(f'{ROOT}/scripts/cine/news_kit.py').read(); body = kit[kit.index('def kit_renderers'):]
ok(not re.search(r"#[0-9A-Fa-f]{6}\b", kit), 'news_kit.py has a hex colour literal')
ok(not re.search(r"fill=\(\d+, ?\d+, ?\d+", body), 'Kit renderers use an RGB literal instead of a token')
try: import PIL  # noqa: F401
except ImportError: print('Pillow missing - Kit smoke skipped')
else:
    import tempfile; d = tempfile.mkdtemp()
    r = subprocess.run([sys.executable, f'{ROOT}/scripts/cine/news_kit_preview.py', d], capture_output=True, text=True); ok(r.returncode == 0, 'news_kit_preview failed: ' + r.stderr[-300:])
    ok(all(os.path.getsize(f'{d}/{n}-new.png') > 20000 for n in ('wordcheck', 'fix', 'tip')) if r.returncode == 0 else True, 'preview stills empty')
for g_ in ('news2motion', 'bank2motion', 'tpl2motion'):
    r = subprocess.run([sys.executable, f'{ROOT}/scripts/video/motion/{g_}.py', '--check'], capture_output=True, text=True); ok(r.returncode == 0, f'{g_} specs stale (run scripts/video/motion/{g_}.py): ' + r.stdout[-200:])
if fails: print('\n'.join('FAIL ' + f for f in fails)); sys.exit(1)
print('no-bait: ok')
