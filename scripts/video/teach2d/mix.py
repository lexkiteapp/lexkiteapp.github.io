#!/usr/bin/env python3
"""Teach2D mix – the 0-credit build bank (owner 5/11): every clip = a seeded combination of pieces we already own, with an anti-repeat rule.

  python3 scripts/video/teach2d/mix.py            -> content/video/teach2d/mix.json (one combination per episode, render order)
  python3 scripts/video/teach2d/mix.py --check    -> mix.json == regenerated + anti-repeat gate + diversity gate (teach-video preqc)
  python3 scripts/video/teach2d/mix.py --stats    -> pieces per axis, distinct combinations, diversity score (owner report)

Pieces (all 0 credits, all already in the repo):
  layout   corner | side | bubble                       (build.py LAYOUTS, short only; the lesson embed stays 'wide')
  canvas   4 static Kit blob arrangements                (TeachShort.jsx Canvas – same tokens / series tint, nothing moves)
  music    6 synth presets                               (scripts/video/synth.mjs MUSIC, CC0, ducked under the voice)
  cam      4 camera rhythms                              (build.py SHOTS: push / cut framings per sentence)
  hook     4 opening stingers                            (brand/library/sfx: the hook slam on frame 0)
  card     2 card-entry swishes                          (brand/library/sfx)
  g_line   silence gesture after a teaching line         (TeacherRig GESTURES with an approved image for THIS teacher)
  g_praise silence gesture after the quiz answer         (idem)
Content (template x data row x teacher) is the episode itself (gen.py); the mix never changes a word of the reviewed script.

Anti-repeat (render order = pilots.json then auto.json): within the last WINDOW clips no two share the same
  background (layout+canvas, last 6), gestures (g_line+g_praise, last 4), music (last 4) or opening (hook+cam, last 6) –
and no axis repeats the previous clip's value. Diversity = mean normalised Hamming distance over every pair in each window x 100 (gate >= MIN_DIV).
Deterministic: candidates come from random.Random(sha256(episode id)), the best-spread candidate wins, so a re-run gives the same mix.json.
"""
import glob, hashlib, itertools, json, os, random, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
OUT = f'{ROOT}/content/video/teach2d/mix.json'
WINDOW, MIN_DIV, CANDS = 6, 70, 96

AX = dict(layout=['corner', 'side', 'bubble'], canvas=[0, 1, 2, 3],
          music=['lofi-warm', 'pop-bright', 'quiz-pulse', 'chill-keys', 'night-drive', 'upbeat-claps'],
          cam=['push', 'mirror', 'calm', 'tight'], hook=['bass-drop', 'riser', 'ding', 'glitch'], card=['whoosh', 'swoosh'])
G_LINE, G_PRAISE = ['explain', 'point', 'hold_card'], ['cheer', 'thumbs_up', 'clap', 'laugh']
GROUPS = dict(background=(('layout', 'canvas'), 6), gestures=(('g_line', 'g_praise'), 4), music=(('music',), 4), opening=(('hook', 'cam'), 6))   # (axes, window): a window never exceeds the group's options
KEYS = list(AX) + ['g_line', 'g_praise']


def rig_gestures():   # web/js/teacher-rig.js GESTURES (pose + alt), the single source the renderer uses
    src = open(f'{ROOT}/web/js/teacher-rig.js', encoding='utf8').read(); out = {}
    import re
    for m in re.finditer(r"(\w+): \{ kind: 'pose', pose: '(\w+)'(?:, alt: '(\w+)')?", src): out[m.group(1)] = (m.group(2), m.group(3))
    return out


def gestures_for(who, names):
    """Gestures whose OWN approved image exists for this teacher (an alt stand-in would look like another choice -> fake variety)."""
    P = json.load(open(f'{ROOT}/web/teach/characters.json'))['people'][who]; have = set(P['clips']) | set(P.get('stills') or {}); G = rig_gestures()
    return [n for n in names if n in G and G[n][0] in have]


def order():
    pil = [p['id'] for p in json.load(open(f'{ROOT}/content/video/teach2d/pilots.json'))['pilots']]
    A = json.load(open(f'{ROOT}/content/video/teach2d/auto.json')); rows = A.get('rows', A) if isinstance(A, dict) else A
    auto = [r['id'] for r in rows if isinstance(r, dict) and 'id' in r]
    have = {os.path.basename(f)[:-5] for f in glob.glob(f'{ROOT}/content/video/teach2d/eps/*.json')}
    seq = [i for i in dict.fromkeys(pil + auto) if i in have]
    return seq + sorted(have - set(seq))


def dist(a, b): return sum(a[k] != b[k] for k in KEYS) / len(KEYS)


def ok(c, hist):
    if hist and any(c[k] == hist[-1][k] for k in KEYS if len(AX.get(k, G_LINE)) > 1 and k not in ('g_line', 'card')): return False   # no axis repeats the previous clip
    for ks, w in GROUPS.values():
        if any(all(c[k] == h[k] for k in ks) for h in hist[-(w - 1):]): return False
    return True


def plan():
    hist, out = [], {}
    for eid in order():
        E = json.load(open(f'{ROOT}/content/video/teach2d/eps/{eid}.json')); who = E['teacher']
        gl, gp = gestures_for(who, G_LINE), gestures_for(who, G_PRAISE)
        R = random.Random(int(hashlib.sha256(eid.encode()).hexdigest()[:16], 16)); best = None
        for _ in range(CANDS):
            c = {k: R.choice(v) for k, v in AX.items()}; c['g_line'] = R.choice(gl); c['g_praise'] = R.choice(gp)
            if not ok(c, hist): continue
            sc = min([dist(c, h) for h in hist[-(WINDOW - 1):]] or [1.0]) + sum(dist(c, h) for h in hist[-(WINDOW - 1):]) / 100
            if best is None or sc > best[0]: best = (sc, c)
        if best is None:   # rare: the seeded sample missed every legal combination -> walk them all (deterministic order)
            for t in itertools.product(*AX.values(), gl, gp):
                c = dict(zip(list(AX) + ['g_line', 'g_praise'], t))
                if ok(c, hist): best = (0, c); break
        assert best, ('no candidate passes the anti-repeat rule', eid)
        c = best[1]; c['seed'] = hashlib.sha256(eid.encode()).hexdigest()[:12]; hist.append(c); out[eid] = c
    return out


def diversity(seq):
    sc = []
    for i in range(len(seq)):
        w = seq[max(0, i - WINDOW + 1): i + 1]
        if len(w) > 1: sc.append(sum(dist(a, b) for a, b in itertools.combinations(w, 2)) / (len(w) * (len(w) - 1) / 2))
    return round(100 * sum(sc) / len(sc), 1) if sc else 100.0


def violations(seq):
    bad = []
    for i, c in enumerate(seq):
        if not ok(c, seq[max(0, i - WINDOW + 1): i]): bad.append(i)
    return bad


def stats(M):
    seq = list(M.values()); ama = gestures_for('ama', G_LINE), gestures_for('ama', G_PRAISE); car = gestures_for('carlos', G_LINE), gestures_for('carlos', G_PRAISE)
    style = 1
    for v in AX.values(): style *= len(v)
    per_t = dict(ama=style * len(ama[0]) * len(ama[1]), carlos=style * len(car[0]) * len(car[1]))
    n_ama = sum(1 for e in M if json.load(open(f'{ROOT}/content/video/teach2d/eps/{e}.json'))['teacher'] == 'ama')
    return dict(pieces={**{k: len(v) for k, v in AX.items()}, 'g_line': dict(ama=ama[0], carlos=car[0]), 'g_praise': dict(ama=ama[1], carlos=car[1])},
                styles_per_episode=per_t, episodes=len(M), distinct_clips=n_ama * per_t['ama'] + (len(M) - n_ama) * per_t['carlos'],
                window=WINDOW, diversity=diversity(seq), min_diversity=MIN_DIV, violations=len(violations(seq)),
                distinct_used=len({tuple(c[k] for k in KEYS) for c in seq}))


def dump(M): return json.dumps(dict(_note='gen by scripts/video/teach2d/mix.py – do not edit; docs/VIDEO-TEACH2D.md "Mix"', window=WINDOW, mix=M), indent=1, sort_keys=True) + '\n'


if __name__ == '__main__':
    M = plan()
    if '--stats' in sys.argv: print(json.dumps(stats(M), indent=1)); sys.exit(0)
    if '--check' in sys.argv:
        cur = open(OUT).read() if os.path.exists(OUT) else ''; S = stats(M)
        if cur != dump(M): print('::error::mix.json differs from mix.py output – run python3 scripts/video/teach2d/mix.py'); sys.exit(1)
        if S['violations'] or S['diversity'] < MIN_DIV: print('::error::mix gate', S); sys.exit(1)
        print(f"mix: {S['episodes']} eps, diversity {S['diversity']} (>= {MIN_DIV}), 0 repeats in window {WINDOW}, {S['distinct_clips']:,} distinct clips"); sys.exit(0)
    open(OUT, 'w').write(dump(M)); print(OUT, len(M))
