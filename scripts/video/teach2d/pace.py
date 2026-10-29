#!/usr/bin/env python3
"""Teach2D pace (docs/VIDEO-TEACH2D.md): syllables per second of a spoken line (word clock), shared by the voice re-pace step and qc.py.
  python3 scripts/video/teach2d/pace.py <lines.json> <vo_dir>   (CI voice job) -> re-synthesise every line >= 5 words faster than TARGET syl/s
  slower (Kokoro speed x TARGET/rate, floor 0.6) by deleting its voice files and writing the new speed into lines.json; prints what changed."""
import json, os, re, sys
TARGET, MAX = 4.6, 5.0
norm = lambda x: re.sub(r"[^a-z0-9']", '', x.lower().replace('’', "'"))
def syl(w): return max(1, len(re.findall(r'[aeiouy]+', re.sub(r'(?<=[^aeiou])e$', '', norm(w)))))   # vowel groups, silent final e
def rate(words): return round(sum(syl(w['w']) for w in words) / max(0.3, words[-1]['e'] - words[0]['s']), 2)
if __name__ == '__main__':
    src, vo = sys.argv[1], sys.argv[2]; J = json.load(open(src)); n = 0
    for l in J['lines']:
        ws = json.load(open(f"{vo}/vis3/{l['id']}.words.json"))['words']; r = rate(ws)
        if len(ws) >= 5 and r > TARGET:
            l['speed'] = round(max(0.6, min(l.get('speed') or J['speed'], J['speed']) * TARGET / r), 3); n += 1
            for ext in ('wav', 'json', 'words.json'):
                f = f"{vo}/vis3/{l['id']}.{ext}"
                if os.path.exists(f): os.remove(f)
            print(f"re-pace {l['id']}: {r} syl/s -> speed {l['speed']}")
    json.dump(J, open(src, 'w'), indent=1); print(n, 'lines re-paced')
    sys.exit(0 if n else 3)   # 3 = nothing to do
