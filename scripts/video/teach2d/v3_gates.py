"""Video v3 numeric gates shared by qc.py (docs/VIDEO-V3.md): `viral_score` (>= 95, every criterion scored and printed) and `ypp` (YouTube-partner safety: near-duplicate script,
educational value, synthetic-media + made-for-kids flags, rights of music / voice / teacher / footage). Pure functions on the timeline `T` (build.py) + the episode JSON `ep`;
no I/O except the near-duplicate scan of content/video/teach2d/eps (loaded once per process). Below 95 an episode is neither published nor banked (bank.py MIN / autopub_gate.py)."""
import glob, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PASS = 95
WEIGHTS = dict(hook=20, retention=20, learning=15, pace=10, variation=15, title=10, cta=10)   # sums to 100
SIM_MAX = 0.55   # 3-word-shingle Jaccard of the spoken script (CTA line excluded) against ANY other episode
STOP = set('a an the is are was be do does did can you your on in of to at this that what how why which or and for with it'.split())
norm = lambda s: re.sub(r"[^\w' ]+", ' ', str(s or '').lower().replace('’', "'")).split()


def _clip(x): return max(0.0, min(100.0, x))


def _nodes_text(T):
    out = []
    for n in T['nodes']:
        if n.get('runs'): out.append((n['in']['t'], ' '.join(r[0] for r in n['runs'])))
        for k in ('text', 'label'):
            if isinstance(n.get(k), str): out.append((n['in']['t'], n[k]))
        for ln in n.get('lines') or []: out.append((n['in']['t'], str(ln)))
    return out


def viral_score(T, ep, gates, looks=None, beats=None):
    """gates = qc.py result dict so far (end_card / cta / pace). Returns dict(ok, score, parts{name: score}, notes{})."""
    L = T['lines']; hook_id = (T.get('hook') or {}).get('line') or next(iter(L)); H = L[hook_id]; P = {}; notes = {}
    # 1 hook: spoken by 1.5 s, <= 6 words, a hook node already fully on screen at frame 0 and popping (in.t <= 0)
    spoken = H['words'][-1]['e']; words = len(H['text'].split()); hk = [n for n in T['nodes'] if n.get('hook')]
    pop = bool(hk) and all(n['in']['t'] <= 0.0 for n in hk[:1])
    P['hook'] = _clip(100 - max(0, spoken - 1.5) * 100) * (1 if words <= 6 else 0.5) * (1 if pop else 0.5); notes['hook'] = dict(spoken_by=round(spoken, 2), words=words, pop_frame0=pop)
    # 2 retention: a new visual beat (card / title / check / ring / pill / chip) at least every 5 s, an open loop (a question) early, a reward (check / answer / praise) later
    ev = sorted({round(n['in']['t'], 2) for n in T['nodes'] if n['type'] in ('card', 'text', 'check', 'cross', 'ring', 'confetti', 'cta', 'img') and (not n.get('parent') or n['type'] in ('check', 'cross', 'ring', 'confetti', 'cta', 'img')) and n['in']['t'] > -0.5})
    pts = [0.0] + [t for t in ev if t > 0] + [T['total']]; gap = max(b - a for a, b in zip(pts, pts[1:]))
    q = any('?' in v['text'] for v in L.values()) or any(n['type'] in ('ring', 'pill') for n in T['nodes']); rew = any(n['type'] in ('check', 'confetti') for n in T['nodes']) or any(v.get('quiz') for v in L.values())
    P['retention'] = 0.6 * _clip(100 - 25 * max(0, gap - 5)) + 20 * q + 20 * rew; notes['retention'] = dict(max_gap_s=round(gap, 2), open_loop=q, reward=rew)
    # 3 learning value: the taught keyword is spoken AND shown, with an example line, and the learner is asked to do something (quiz / repeat / check)
    kw = norm((ep.get('publish') or {}).get('keyword')) or norm((T.get('cta') or {}).get('area')); script = ' '.join(v['text'] for v in L.values()); shown = ' '.join(t for _, t in _nodes_text(T))
    cov = lambda txt: (sum(w in set(norm(txt)) for w in kw) / len(kw)) if kw else 0   # share of the keyword's words found in txt
    TOPIC = 0.3   # at least a third of the keyword words (a keyword like 'english quiz score' is a topic, not a spoken phrase)
    ex = sum(1 for v in L.values() if cov(v['text']) >= TOPIC) >= 1 and len(L) >= 4; act = any(v.get('quiz') or v.get('repeat') for v in L.values()) or any(n['type'] in ('ring', 'pill', 'check') for n in T['nodes'])
    P['learning'] = 100 * ((cov(script) >= TOPIC and cov(shown) >= TOPIC) + ex + act) / 3; notes['learning'] = dict(keyword=' '.join(kw), spoken=round(cov(script), 2), shown=round(cov(shown), 2), example=ex, action=act)
    # 4 pace: <= 150 wpm (100 up to 140, linear to 90 at 150, 0 above)
    wpm = (gates.get('pace') or {}).get('wpm'); P['pace'] = 0 if wpm is None or wpm > 150 else 100 if wpm <= 140 else 100 - (wpm - 140); notes['pace'] = dict(wpm=wpm)
    # 5 variation of picture + teacher: >= as many looks as beats (pose_variety), >= 4 kinds of visual element, >= 3 root cards
    kinds = {n['type'] for n in T['nodes']}; cards = sum(1 for n in T['nodes'] if n['type'] == 'card' and not n.get('parent'))
    P['variation'] = (50 if looks is not None and beats is not None and looks >= min(beats, 8) else 0) + (25 if len(kinds) >= 4 else 0) + (25 if cards >= 3 else 0); notes['variation'] = dict(looks=looks, beats=beats, kinds=len(kinds), cards=cards)
    # 6 title / thumbnail match: title <= 60 chars, carries the keyword (or its topic), and the same keyword is on screen
    ti = str((ep.get('publish') or {}).get('title') or ''); tk = [w for w in norm(ti) if w not in STOP]
    P['title'] = 100 * ((0 < len(ti) <= 60) + (bool(tk) and sum(w in set(norm(script + ' ' + shown)) for w in tk) / len(tk) >= TOPIC) + (cov(shown) >= TOPIC)) / 3   # title <= 60, its words are spoken / on screen, keyword on screen
    notes['title'] = dict(title=ti, chars=len(ti))
    # 7 CTA: the one end card (icon + Practice button + QR + url) and a valid deep link
    P['cta'] = 100 if (gates.get('end_card') or {}).get('ok') and (gates.get('cta') or {}).get('ok') else 0
    total = round(sum(P[k] * WEIGHTS[k] for k in WEIGHTS) / sum(WEIGHTS.values()), 1)
    return dict(ok=total >= PASS, score=total, parts={k: round(v, 1) for k, v in P.items()}, notes=notes)


_SHINGLES = None


def _shingles(text, n=3):
    w = norm(text); return {' '.join(w[i:i + n]) for i in range(len(w) - n + 1)}


def _strings(x):
    if isinstance(x, str): yield x
    elif isinstance(x, dict):
        for v in x.values(): yield from _strings(v)
    elif isinstance(x, list):
        for v in x: yield from _strings(v)


def _script(ep): return ' '.join([str(l.get('text', '')) for l in ep.get('lines') or [] if l.get('id') != 'c'] + list(_strings(ep.get('data'))))   # what is said AND shown (quiz items, examples, native tip)


def _bank():
    global _SHINGLES
    if _SHINGLES is None:
        _SHINGLES = {}
        for f in glob.glob(f'{ROOT}/content/video/teach2d/eps/*.json'):
            try: e = json.load(open(f))
            except Exception: continue
            _SHINGLES[e.get('id') or os.path.basename(f)[:-5]] = (e.get('lang') or 'en', _shingles(_script(e)))
    return _SHINGLES


def similarity(ep, bank=None):
    """(max Jaccard, other episode id) of this script against every other episode's script."""
    mine = _shingles(_script(ep)); best = (0.0, None)
    lang = ep.get('lang') or 'en'
    for k, (lg, s) in (bank if bank is not None else _bank()).items():
        if k == ep.get('id') or lg != lang or not s or not mine: continue   # the same lesson in another page language is a separate channel / audience, not a duplicate
        j = len(mine & s) / len(mine | s)
        if j > best[0]: best = (j, k)
    return best


def ypp(T, ep, policy, registry, bank=None):
    """policy = content/video/teach2d/ypp.json; registry = {'music': [...], 'voices': [...], 'teachers': [...]}. Returns dict(ok, why[], ...)."""
    why = []; sim, other = similarity(ep, bank)
    if sim >= SIM_MAX: why.append(f'near-duplicate script of {other} ({sim:.2f} >= {SIM_MAX})')
    pub = ep.get('publish') or {}; script = ' '.join(v['text'] for v in T['lines'].values())
    if len(str(pub.get('value') or '')) < 40 or not (norm(pub.get('keyword')) and set(norm(pub.get('keyword'))) & set(norm(script))): why.append('no own educational value (publish.value / keyword not in the script)')
    if policy.get('synthetic_media_disclosure') is not True: why.append('synthetic / AI media disclosure flag not set (ypp.json)')
    if policy.get('made_for_kids') is not False: why.append('made-for-kids flag must be explicitly false (adult / teen English learners)')
    music = (T.get('mix') or {}).get('music')
    if music not in registry.get('music', []): why.append(f'music {music!r} not in the rights registry')
    if T.get('voice') not in registry.get('voices', []): why.append(f"voice {T.get('voice')!r} not in the registry")
    if T.get('teacher') not in registry.get('teachers', []): why.append(f"teacher {T.get('teacher')!r} not in the registry")
    if T.get('host') != 'rig': why.append('host footage is not the own TeacherRig (no licence record)')
    return dict(ok=not why, why=why, similarity=round(sim, 2), most_similar=other)
