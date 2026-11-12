#!/usr/bin/env python3
"""Teach2D auto-publish gate (docs/specs/video-autopublish.md §2.1): may this banked episode leave CI for the shorts store and the social autopilot?
Pure: gate(ep, entry, qc, ...) -> dict(ok, why[], cefr). A clip with any reason is never published; the reasons go to bank.json `publish_block` and PUBLISH.md.
Reasons: qc<90:short|wide · gate:<name> · native-qa (lang≠en, l1-qa.json) · teacher∉{ama,carlos} · wpm>150 · publish:<publish.py check> · topic · cefr · dup"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import publish as PUBLISH   # noqa: E402
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
MIN, MAX_WPM, TEACHERS, CEFR = 90, 150, ('ama', 'carlos'), ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')


def norm(s): return re.sub(r'[^a-z0-9 ]+', ' ', str(s or '').lower().replace('’', "'")).split()


def has_words(needle, text):
    n, t = norm(needle), norm(text)
    return bool(n) and any(t[i:i + len(n)] == n for i in range(len(t) - len(n) + 1))


def native_ok(ep):
    p = f'{ROOT}/content/video/teach2d/l1-qa.json'; q = (json.load(open(p)) if os.path.exists(p) else {}).get(ep.get('id')) or {}
    return bool(q.get('ok')) and q.get('lang') == ep.get('lang') and (ep.get('data') or {}).get('native') is not None


def areas(): return {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}


def route_seg(r): return re.split(r'[/?]', re.sub(r'^.*#/', '', str(r or '')))[0]


def cefr_of(keyword, levels):
    """Level of the taught point = highest level among its words in the audited word bank (facts.mjs); None if no word is in the bank."""
    got = [levels[w] for w in norm(keyword) if levels.get(w) in CEFR]
    return max(got, key=CEFR.index) if got else None


def topic_ok(ep, area_map):
    pub = ep.get('publish') or {}; kw = pub.get('keyword'); script = ' '.join(str(l.get('text', '')) for l in ep.get('lines') or [])
    if not (has_words(kw, pub.get('title')) or has_words(kw, script)): return False
    a = area_map.get(ep.get('area')); cta = ep.get('cta') or {}
    return bool(a) and cta.get('link') == pub.get('link') and route_seg(cta.get('route')) == route_seg(a.get('route'))


def gate(ep, entry, qc, levels, area_map, posted=()):
    """qc = {'short': qc.json, 'wide': qc.json}; levels = {word: CEFR}; posted = [{id, sha:{...}, title}] of clips already in the store."""
    why = []
    for fm in ('short', 'wide'):
        q = qc.get(fm)
        if not q or q.get('score', 0) < MIN or not q.get('ok'): why.append(f'qc<{MIN}:{fm}')
        for name, g in sorted(((q or {}).get('gates') or {}).items()):
            if not g.get('ok') and f'gate:{name}' not in why: why.append(f'gate:{name}')
    if (ep.get('lang') or 'en') != 'en' and not native_ok(ep): why.append('native-qa')   # L1 clip: native hook/tip/caption/comment passed scripts/video/teach2d/native-qa.mjs (l1-qa.json)
    if ep.get('teacher') not in TEACHERS: why.append('teacher∉{ama,carlos}')
    wpm = [((q or {}).get('gates') or {}).get('pace', {}).get('wpm') for q in qc.values()]; wpm = [w for w in wpm if w is not None] or [(ep.get('est') or {}).get('wpm')]
    if any(w is None or w > MAX_WPM for w in wpm): why.append(f'wpm>{MAX_WPM}')
    why += [f'publish:{e}' for e in PUBLISH.check(ep)]
    if not topic_ok(ep, area_map): why.append('topic')
    pub = ep.get('publish') or {}; level = cefr_of(pub.get('keyword'), levels)
    if not level or (ep.get('cefr') and ep['cefr'] != level): why.append('cefr')
    shas = set((entry.get('sha') or {}).values()); title = ' '.join(norm(pub.get('title')))
    if any(p.get('id') != ep.get('id') and (shas & set((p.get('sha') or {}).values()) or ' '.join(norm(p.get('title'))) == title) for p in posted): why.append('dup')
    return dict(ok=not why, why=why, cefr=level)
