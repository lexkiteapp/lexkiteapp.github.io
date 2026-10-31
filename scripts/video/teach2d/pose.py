"""Teach2D teacher poses (docs/VIDEO-TEACH2D.md "Poses"): which registry gesture clip plays on which cue, shared by build.py (placement) and qc.py (pose gate).

Mouth class per pose comes from the clip's own gesture prompt in the footage bank (lexkite-footage anchor/tools/gesture_prompts/<src>.txt):
  talk  = clear lip movement for the whole clip -> may only play while the voice speaks (talk, explain, point, happy, encourage)
  quiet = lips pressed / closed smile, no lip movement -> may only play in pauses (listen, thinking, cheer)
Carlos' point and encourage are his explain / happy clips (registry notes, owner 29/10) - both talk, so the class is per pose, not per person.

Cues (one window per cue, times from the voice clock):
  point     the quiz question line (ids q, q1, q2 ...) while it is spoken
  thinking  the 3-2-1 countdown = the silence after a quiz line
  happy     the answer reveal line (the line right after a quiz line) while it is spoken
  cheer     the silence after the answer line when it is long enough for the clap (>= CHEER_MIN s); shorter -> no cheer (never squeezed)
  explain   the rule line of the template (RULE below, or the row's `rule_line`) while it is spoken
  encourage the share line (sh, level's s) while it is spoken
  happy     also the hook line (HOOK, first line) while it is spoken = the teacher's reaction on the hook (phase 2 viral hook; talk class, so never in the
            0.1 s lead-in silence; a quiet 'surprise' face would only be allowed in a silence and the bank has no such clip)
  explain   also the open-loop tease line (TEASE, gen.py row `tease`: "Most people get this wrong... stay to the end") while it is spoken
Everything else: talk while speaking, listen in pauses (unchanged)."""
import re

MOUTH = dict(talk='talk', explain='talk', point='talk', happy='talk', encourage='talk', listen='quiet', thinking='quiet', cheer='quiet')
POSES = tuple(MOUTH)                      # every pose host.py exports (HD only)
GESTURES = tuple(p for p in POSES if p not in ('talk', 'listen'))
RULE = dict(grammar=['r'], mistake=['y'], native=['y'], pattern=['y'], prep=['y'], stress=['m'], phrasal=['m'], pair=['k'], call=['y'], usuk=['tw'], verbs=['w'], toeic=['k'])
SHARE = ('sh', 's')
HOOK, TEASE = 'h', 'tz'
CHEER_MIN = 1.2                           # s of silence after the answer that the clap needs
MIN_TALK, MIN_QUIET = 0.4, 0.6            # shorter speech / silence runs inside a cue window keep talk / listen (no 1-word gesture flicker)
XF_POSE = 8                               # crossfade frames (30 fps) into / out of a gesture clip; talk <-> listen keeps the 4-frame cut-fade


def windows(order, lines, template, rule_line=None):
    """order: line ids in spoken order; lines[id] = {t0, t1} (voice clock). -> [(pose, t0, t1)] - a talk pose covers [t0, t1] of its line,
    a quiet pose the silence [t1 of its line, t0 of the next line]."""
    W = []; quiz = [i for i, k in enumerate(order) if re.fullmatch(r'q\d*', k)]
    nxt = lambda i: lines[order[i + 1]]['t0'] if i + 1 < len(order) else lines[order[i]]['t1'] + 0.42
    for i in quiz:
        q = lines[order[i]]; W.append(('point', q['t0'], q['t1'])); W.append(('thinking', q['t1'], nxt(i)))
        if i + 1 < len(order):
            a = lines[order[i + 1]]; W.append(('happy', a['t0'], a['t1']))
            if nxt(i + 1) - a['t1'] >= CHEER_MIN: W.append(('cheer', a['t1'], nxt(i + 1)))
    if order and order[0] == HOOK and 0 not in quiz: W.append(('happy', lines[HOOK]['t0'], lines[HOOK]['t1']))
    if TEASE in lines and order.index(TEASE) not in quiz and order.index(TEASE) - 1 not in quiz: W.append(('explain', lines[TEASE]['t0'], lines[TEASE]['t1']))
    rl = rule_line if rule_line is not None else RULE.get(template, [])
    for k in ([rl] if isinstance(rl, str) else rl):
        if k in lines and order.index(k) not in quiz and order.index(k) - 1 not in quiz: W.append(('explain', lines[k]['t0'], lines[k]['t1']))
    for k in SHARE:
        if k in lines and order.index(k) - 1 not in quiz: W.append(('encourage', lines[k]['t0'], lines[k]['t1']))
    return sorted(W, key=lambda w: w[1])


def plan(spk, fps, W):
    """spk: per-frame speaking flags (after the < 0.3 s gap closing). -> per-frame pose labels. A pose only ever takes frames of its own mouth class
    (talk poses replace talk frames, quiet poses replace listen frames), so the mouth gate holds by construction."""
    nf = len(spk); lab = ['talk' if s else 'listen' for s in spk]
    for pose, t0, t1 in W:
        f0, f1 = max(0, int(round(t0 * fps))), min(nf, int(round(t1 * fps)) + 1); want = MOUTH[pose] == 'talk'; mn = (MIN_TALK if want else MIN_QUIET) * fps
        f = f0
        while f < f1:
            if spk[f] != want: f += 1; continue
            g = f
            while g < min(nf, f1 + (int(0.1 * fps) if want else 0)) and spk[g] == want: g += 1   # speech flags carry +-0.05 s margins around the words
            if g - f >= mn: lab[f:g] = [pose] * (g - f)
            f = g
    return lab
