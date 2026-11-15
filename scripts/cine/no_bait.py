#!/usr/bin/env python3
"""no_bait.py - platform-policy gate (owner 15/11): no engagement-bait CTA ("Comment below", "Comment A or B", "Follow for more") in any
clip script, on-screen text, title, caption or first comment. Natural CTA = "Free practice on lexkite.com".
  no_bait.py --check [paths...]   exit 1 + list when a bait phrase is found (CI gate, scripts/test/no-bait.py)
  no_bait.py --fix   [paths...]   rewrite known bait phrases in place (one-off bank migration; idempotent)
Default paths = every clip text source (content/video, scripts/cine, scripts/scriptbank, scripts/video)."""
import os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BAIT = re.compile(r"comment\s+(below|your\s+(answer|guess)|a[ ,]\s*(or\s+)?b|a,\s*b|with|and\s+tell|if)\b|follow\s+for\s+(more|daily)|drop\s+a\s+comment", re.I)
CTA = 'Free practice on lexkite.com'
FIX = [  # (pattern, replacement) - most specific first
    (r"\s*\\?n?Comment your answer below and follow for daily English(?: \([^)]*\))?\.", ''),
    (r"\s*Comment your answer below and follow for daily English(?: \([^)]*\))?\.", ''),
    (r"\? Comment A or B\b", '? A or B'),
    (r"Comment A, B or C 👇", 'Pick A, B or C 👇'), (r"Comment A or B 👇", 'Pick A or B 👇'),
    (r"Comment your answer\b", 'Think of your answer'), (r"Comment your guess!?", 'Pick your answer first.'),
    (r"Three out of three\? Comment below!?", 'Three out of three? Nice.'),
    (r"\bComment below[.!:]?", 'Pick your answer first.'), (r"Comment below!", 'Nice work!'),
    (r"Follow for daily English", CTA), (r"Follow for more", CTA),
]
def files(paths):
    for p in paths:
        p = p if os.path.isabs(p) else os.path.join(ROOT, p)
        if os.path.isfile(p): yield p; continue
        for dp, dn, fn in os.walk(p):
            dn[:] = [d for d in dn if d not in ('node_modules', '.git', '__pycache__', 'eps')]
            for f in fn:
                if f.endswith(('.json', '.jsonl', '.py', '.mjs', '.js', '.md')) and f != 'no_bait.py': yield os.path.join(dp, f)
def fix_text(t):
    for a, b in FIX: t = re.sub(a, b, t)
    return t
def main(argv):
    mode = '--fix' if '--fix' in argv else '--check'; paths = [a for a in argv if not a.startswith('--')] or ['content/video', 'scripts/cine', 'scripts/scriptbank', 'scripts/video']
    bad = []; n = 0
    for f in files(paths):
        try: t = open(f, encoding='utf-8').read()
        except Exception: continue
        if mode == '--fix':
            u = fix_text(t)
            if u != t: open(f, 'w', encoding='utf-8').write(u); n += 1
        else:
            for m in BAIT.finditer(t): bad.append((os.path.relpath(f, ROOT), t[max(0, m.start() - 30):m.end() + 20].replace('\n', ' ')))
    if mode == '--fix': print(f'rewrote {n} files'); return 0
    for f, c in bad[:40]: print('BAIT', f, '|', c)
    print(f'{len(bad)} bait phrase(s)'); return 1 if bad else 0
if __name__ == '__main__': sys.exit(main(sys.argv[1:]))
