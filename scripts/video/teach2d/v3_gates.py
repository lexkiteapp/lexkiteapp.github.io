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


# ---------------- news / cine lessons (content/video/cine/news/*.json + lines.json): the same two gates computed on the lesson SPEC (hook line, beats, cards, est duration) ----------------
WPS = 3.4   # words per second of the TTS voice at speed 1.0 (hook spoken-by estimate)


def _news_lines(sp, L):
    ids = [(sp.get('hook') or {}).get('line')] + [b.get('line') for b in sp.get('beats') or []] + [(sp.get('recap') or {}).get('line'), sp.get('end_line')]
    return [(i, L[i]) for i in ids if i and i in L]


def news_viral(sp, L, bgs=()):
    """sp = lesson spec, L = {line id: {text, who, speed?}} (lines.json). Same 7 criteria / weights as viral_score, measured on the script instead of the render."""
    lines = _news_lines(sp, L); hook = L.get((sp.get('hook') or {}).get('line'), {}); words = len(str(hook.get('text', '')).split()); est = float(sp.get('est') or 0)
    text = ' '.join(l['text'] for _, l in lines); n_words = len(norm(text)); P = {}; N = {}
    P['hook'] = _clip(100 - max(0, words / WPS - 1.5) * 100) * (1 if 0 < words <= 6 else 0.5) * (1 if (sp.get('hook') or {}).get('card') else 0.5); N['hook'] = dict(words=words, est_spoken_by=round(words / WPS, 2), card=bool((sp.get('hook') or {}).get('card')))
    beats = sp.get('beats') or []; per = est / (len(beats) + 2) if beats else 99
    P['retention'] = 0.6 * _clip(100 - 25 * max(0, per - 5)) + 20 * ('?' in str((sp.get('hook') or {}).get('card', '')) + str(hook.get('text', ''))) + 20 * (bool(sp.get('recap')) or any(b.get('repeat') for b in beats)); N['retention'] = dict(beat_s=round(per, 2), beats=len(beats))
    kw = norm((sp.get('publish') or {}).get('keyword')); cards = ' '.join(' '.join(str((b.get('card') or {}).get(k) or '') for k in ('text', 'sub')) for b in beats); cov = lambda t: (sum(w in set(norm(t)) for w in kw) / len(kw)) if kw else 0
    P['learning'] = 100 * ((cov(text) >= 0.3 and (cov(cards) >= 0.3 or bool(sp.get('recap')))) + (sum(1 for b in beats if (b.get('card') or {}).get('kind') == 'p') >= 2) + any(b.get('repeat') for b in beats)) / 3; N['learning'] = dict(keyword=' '.join(kw), spoken=round(cov(text), 2))
    wpm = 60 * n_words / est if est else None; P['pace'] = 0 if wpm is None or wpm > 150 else 100 if wpm <= 140 else 100 - (wpm - 140); N['pace'] = dict(wpm=round(wpm) if wpm else None)
    kinds = {(b.get('card') or {}).get('kind') for b in beats if b.get('card')}; who = {b.get('who') for b in beats}
    P['variation'] = (40 if len(who) >= 2 else 0) + (30 if len(kinds) >= 2 else 0) + (30 if (not bgs or sp.get('bg') in bgs) and sp.get('bg') else 0); N['variation'] = dict(speakers=len(who), card_kinds=len(kinds), bg=sp.get('bg'))
    ti = str((sp.get('publish') or {}).get('title') or ''); tk = [w for w in norm(ti) if w not in STOP]
    P['title'] = 100 * ((0 < len(ti) <= 60) + (bool(tk) and sum(w in set(norm(text + ' ' + cards)) for w in tk) / len(tk) >= 0.3) + (cov(text + ' ' + cards) >= 0.3)) / 3; N['title'] = dict(title=ti)
    P['cta'] = 100 if str(sp.get('link', '')).startswith('https://lexkite.com/app/') and str(sp.get('cta', '')).startswith('Practice') else 0; N['cta'] = dict(cta=sp.get('cta'))
    total = round(sum(P[k] * WEIGHTS[k] for k in WEIGHTS) / sum(WEIGHTS.values()), 1)
    return dict(ok=total >= PASS, score=total, parts={k: round(v, 1) for k, v in P.items()}, notes=N)


def news_ypp(sp, L, policy, registry, bgs, others):
    """others = {lesson id: shingle set} of every other lesson (same language: news lessons are English). Rights: voices / teachers / backgrounds must be in our own registries."""
    why = []; mine = _shingles(' '.join(l['text'] for _, l in _news_lines(sp, L))); best = (0.0, None)
    for k, s in others.items():
        if k != sp.get('id') and s and mine:
            j = len(mine & s) / len(mine | s)
            if j > best[0]: best = (j, k)
    if best[0] >= SIM_MAX: why.append(f'near-duplicate script of {best[1]} ({best[0]:.2f} >= {SIM_MAX})')
    pub = sp.get('publish') or {}
    if len(str(pub.get('value') or '')) < 20 or not norm(pub.get('keyword')): why.append('no own educational value (publish.value / keyword)')
    if policy.get('synthetic_media_disclosure') is not True: why.append('synthetic / AI media disclosure flag not set (ypp.json)')
    if policy.get('made_for_kids') is not False: why.append('made-for-kids flag must be explicitly false')
    for b in sp.get('beats') or []:
        if b.get('who') not in registry.get('teachers', []): why.append(f"teacher {b.get('who')!r} not in the registry"); break
    if bgs and sp.get('bg') not in bgs: why.append(f"background {sp.get('bg')!r} not in the own asset library (assets.json)")
    return dict(ok=not why, why=why, similarity=round(best[0], 2), most_similar=best[1])


def news_context():
    """(bgs, others) for news_ypp from the repo: own background library = bg_store.json + bg_topics.json lists + gen_news TOPICS; other lessons' scripts for the duplicate scan."""
    bgs = set(json.load(open(f'{ROOT}/scripts/video/bg_store.json'))) | {b for d in json.load(open(f'{ROOT}/content/video/cine/news/bg_topics.json'))['domains'].values() for b in d.get('bg', [])}
    gn = open(f'{ROOT}/scripts/cine/gen_news.py').read(); m = re.search(r'TOPICS = \{([^}]*)\}', gn); bgs |= set(re.findall(r"'([a-z_0-9]+)'", m.group(1))) if m else set()
    L = {l['id']: l for l in json.load(open(f'{ROOT}/content/video/cine/news/lines.json'))['lines']}; others = {}
    for f in glob.glob(f'{ROOT}/content/video/cine/news/news_*.json'):
        s = json.load(open(f)); others[s['id']] = _shingles(' '.join(l['text'] for _, l in _news_lines(s, L)))
    return bgs, others


def motion_as_news(sp):
    """Stitch motion-drill spec (content/video/cine/news/motion/*.json) -> (lesson-spec, lines) shaped for news_viral / news_ypp. est = spoken time at the spec's voice speed + gaps + beats."""
    sp_lines = [l for l in sp.get('lines') or [] if l.get('text')]; sp_ = float(sp.get('speed') or 1.0)
    L = {l['id']: dict(id=l['id'], who=sp.get('teacher'), text=l['text']) for l in sp_lines}
    est = sum(len(l['text'].split()) / (WPS * sp_) + float(l.get('gap') or 0) for l in sp_lines) + sum(float(l.get('dur') or 0) for l in sp.get('lines') or [] if not l.get('text'))
    hook = next((p for p in sp.get('pops') or [] if p.get('role') == 'hook'), None); body = [l for l in sp_lines if l['id'] not in ('h', 'c', 'sh')]
    pub = sp.get('publish') or {}
    cta = sp.get('cta') or {}
    out = dict(id=sp['id'], hook=dict(line='h', card=('hook' if hook else None)), beats=[dict(who=sp.get('teacher'), line=l['id'], card=dict(kind='p', text=l['text'], sub=None), repeat=False) for l in body], recap=dict(line='sh') if 'sh' in L else None, end_line='c',
               est=est, bg=sp.get('set'), cta=cta.get('say', ''), link=cta.get('link', ''), publish=pub)
    return out, L
