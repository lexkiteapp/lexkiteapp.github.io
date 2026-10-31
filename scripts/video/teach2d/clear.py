#!/usr/bin/env python3
"""Teach2D clearance audit (owner 31/10: "rà soát lỗi chồng chéo") – stricter than qc.py layout, which only catches > 2 px overlaps of leaf boxes.
Sampled every 0.1 s on the timeline (absolute canvas px), elements with alpha > 0.3:
  gap      two visible leaves (text, chips, pills, badges, tags …) closer than GAP px (touching counts; two text rows: any overlap) – same allowed pairs as the layout gate
  inside   a card's child sticks out of its card: < INSET px from the left / right / top edge, or below the card's CURRENT height (cards grow
           with their rows, build.py 'grow') minus the ledge
  cross    an element still fading out (alpha > 0.02) over one that is already coming in – the hand-off must be clean
  edge     free (card-less) leaf partly over a top-level card / split (fully inside one = on purpose, e.g. a title on a split card; a VS / ≠ medallion
           whose centre sits in the gutter between cards bridges them on purpose)
qc.py imports audit() as the 'clearance' gate; `python3 clear.py TIMELINE.json …` prints the problems of saved timelines."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, f'{ROOT}/scripts/video/motion')
import core as C  # noqa: E402

GAP, INSET, LEDGE = 6, 8, 10
LEAF = {'text', 'chip', 'pill', 'img', 'cta', 'tag', 'cross', 'check', 'qmark', 'eq', 'flags', 'candy', 'beat', 'ipapill', 'rhythm', 'vs', 'stamp',
        'slot', 'opt', 'brick', 'plus', 'pic', 'letter', 'track', 'score', 'wave', 'flip', 'grade'}


def near(a, b, m): return a[0] < b[2] + m and b[0] < a[2] + m and a[1] < b[3] + m and b[1] < a[3] + m


def grown(c, t):   # TeachShort.jsx growH: card height on screen at t
    h = c['box'][3] - c['box'][1]; g = c.get('grow')
    if not g: return h
    i = 0
    while i + 1 < len(g) and t >= g[i + 1]['t']: i += 1
    return g[0]['h'] if i == 0 else g[i - 1]['h'] + (g[i]['h'] - g[i - 1]['h']) * C.ease_out(min(1.0, max(0.0, (t - g[i]['t']) / 0.24)))


def seam(n, vis, t):   # a VS / ≠ medallion bridging the gutter between two cards (Stitch compare b6303607): centre outside every card, gaps still checked
    if n['type'] != 'vs': return False
    cx, cy = (n['box'][0] + n['box'][2]) / 2, (n['box'][1] + n['box'][3]) / 2
    return not any(c['type'] in ('card', 'split') and not c.get('parent') and c['box'][0] <= cx <= c['box'][2] and c['box'][1] <= cy <= c['box'][1] + grown(c, t) for c in vis)


def allowed(A, B):   # the layout gate's intended overlaps: ✓ on its answer pill, stamp on a candy tile, the countdown ring on its card corner
    ty = {A['type'], B['type']}
    return ('check' in ty and 'pill' in ty) or ty == {'stamp', 'candy'} or 'ring' in ty or A.get('parent') == B['id'] or B.get('parent') == A['id']


def audit(T):
    N = {n['id']: n for n in T['nodes']}

    def alpha(n, t):
        a = C.pose(n, t)['a']; p = n.get('parent')
        while p: a *= C.pose(N[p], t)['a']; p = N[p].get('parent')
        return a
    prob, seen = [], set()

    def add(**p):
        k = json.dumps({x: v for x, v in p.items() if x != 't'}, sort_keys=True)
        if k not in seen: seen.add(k); prob.append(p)
    for i in range(int(T['total'] * 10)):
        t = i / 10; vis = [n for n in T['nodes'] if n.get('box') and alpha(n, t) > 0.3]
        lv = [n for n in vis if n['type'] in LEAF]
        fade = [n for n in T['nodes'] if n.get('box') and not n.get('parent') and n['type'] != 'confetti' and alpha(n, t) > 0.02]
        for a in range(len(fade)):   # cross: an element still fading out where another one is fading in (texts show through each other)
            for b in range(a + 1, len(fade)):
                A, B = fade[a], fade[b]
                go = lambda x: x.get('out') and t > x['out']['t']   # leaving; leaving together (a card + its ✓) is one exit, not a cross
                newer = (go(A) and not go(B) and B['in']['t'] > A['in']['t']) or (go(B) and not go(A) and A['in']['t'] > B['in']['t'])
                if newer and near(A['box'], B['box'], 0) and not allowed(A, B):
                    add(t=t, why='cross', ids=[A['id'], B['id']], types=[A['type'], B['type']])
        for a in range(len(lv)):
            for b in range(a + 1, len(lv)):
                A, B = lv[a], lv[b]
                m = 0 if A['type'] == B['type'] == 'text' else GAP   # stacked text rows: line boxes already carry their leading, they only must not overlap
                if near(A['box'], B['box'], m) and not allowed(A, B):
                    add(t=t, why='gap', ids=[A['id'], B['id']], types=[A['type'], B['type']], boxes=[A['box'], B['box']])
        for n in lv:
            p = N.get(n.get('parent'))
            if p and p['type'] in ('card', 'split'):
                pb, b = p['box'], n['box']; bottom = pb[1] + grown(p, t) - LEDGE
                if b[0] < pb[0] + INSET or b[2] > pb[2] - INSET or b[1] < pb[1] + INSET - 2 or b[3] > bottom + 1:
                    add(t=t, why='inside', id=n['id'], type=n['type'], card=p['id'], box=b, card_box=[pb[0], pb[1], pb[2], round(bottom, 1)])
            elif not n.get('parent') and not seam(n, vis, t):
                for c in vis:
                    if c['type'] in ('card', 'split') and not c.get('parent') and c['id'] != n['id']:
                        cb = c['box']; cb = [cb[0], cb[1], cb[2], cb[1] + grown(c, t)]; b = n['box']
                        if near(b, cb, 0) and not (cb[0] <= b[0] and b[2] <= cb[2] and cb[1] <= b[1] and b[3] <= cb[3]):
                            add(t=t, why='edge', id=n['id'], type=n['type'], card=c['id'], box=b, card_box=cb)
    return prob


if __name__ == '__main__':
    bad = 0
    for f in sys.argv[1:]:
        T = json.load(open(f)); P = audit(T); bad += bool(P)
        print(f"{T['ep']} {T['format']} {T['theme']} {T.get('layout')}: {len(P)} problems")
        for p in P[:12]: print('  ', json.dumps(p))
    sys.exit(1 if bad else 0)
