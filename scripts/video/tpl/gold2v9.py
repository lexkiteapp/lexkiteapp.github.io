#!/usr/bin/env python3
"""gold2v9 – deterministic gold-script -> v9 spec generator for the numbered series (docs/VIDEO-SERIES.md "Pipeline v10").

Input : content/video/scripts/bank/*.jsonl (written gold scripts: point, hook, wrong, right, why, aha, ex, memory, quiz, save, type, lines).
Output: content/video/cine/news/series/<slug>/<id>.json   one v9 spec per episode (same line/pop/anchor pattern as templates-v2 gold specs)
        content/video/cine/news/series/<slug>/plan.json    episode order + skipped items with reasons
        content/video/cine/news/series/<slug>/reviewed-hooks.json   verdicts (new entries: hook_true null, script_reviewed false;
                                                            an existing review is kept only while script + hook are unchanged)
Series: "Stop Saying This" (mistake template, bank type stop-saying), "Same or Different?" (pair template, bank type x-vs-y).
No facts are invented: every spoken sentence is a gold-script field or a fixed connective ("Stop saying this.", "Just say:", "Quick quiz!",
"Save this, and ... on lexkite.com."). Self-checks: 50-80 words, est. length <= 45 s, every key index inside its line, quiz answer spoken in
the answer line, CTA line has lexkite.com, hook <= 6 words on screen, error phrase only in the error line, spoken text TTS-clean.
Usage: python3 scripts/video/tpl/gold2v9.py [--check]   (--check = build in memory, print the summary, write nothing)
"""
import difflib, glob, hashlib, json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = f'{ROOT}/content/video/cine/news/series'
GOLD_EP1 = {'stop-saying-this': ['i am agree'], 'same-or-different': ['borrow', 'lend']}   # templates-v2 episode 1 (hand-written)
BOARDW = {'c05_carlos2': 759, 'a05b_ama2': 759, 'd03_daniel_desk': 532, 'k03_kai_desk': 548, 'm03_mei_desk': 532, 'c01_carlos_board': 852, 'a02_ama_board': 856}   # measured board text width (render logs)
ALT = {}   # 27/10: 3D hosts only (Carlos c05 / Ama a05, v14 board 759 px wide) – no desk-board fallback needed
SERIES = {
    'stop-saying-this': dict(name='Stop Saying This', template='mistake', type='stop-saying', pre='sts', L='m', teacher='ama', set='classroom_board',
                             clips=['a05b_ama2', 'a05t2_ama2_present', 'a05e1_ama2_excited', 'a05e2_ama2_question', 'a05e3_ama2_wow'], listen=['a05l2_ama2_listen'], speed=0.75, accent='red', active='cream', hook_style='stop: red X badge + quoted error, stamp-in',
                             motif='red badges + quoted lines, green check on the fix',
                             cta={'area': 'grammar-check', 'link': 'https://lexkite.com/app/#/fix', 'say': 'Check your grammar'}),
    'same-or-different': dict(name='Same or Different?', template='pair', type='x-vs-y', pre='sod', L='p', teacher='carlos', set='classroom_board',
                              clips=['c05_carlos2', 'c05t2_carlos2_present', 'c05e1_carlos2_excited', 'c05t3_carlos2_talk3', 'c05e2_carlos2_question', 'c05e3_carlos2_wow'], listen=['c05l_carlos2_listen'], speed=0.65, accent='green', active='green', hook_style='versus: two tiles slide in from both sides with a VS disc',
                              motif='side-by-side twin tiles, the active one lit',
                              cta={'area': 'word-usage', 'link': 'https://lexkite.com/app/#/usage?c=pair', 'say': 'Compare tricky words'}),
    # 28/10 owner: "làm tiếp các series mới" – the other gold-bank types, same mistake template (wrong -> right -> why -> example -> quiz), own name/host/colour/opening line
    'which-little-word': dict(name='Which Little Word?', template='mistake', type='preposition', pre='wlw', L='n', teacher='carlos', set='classroom_board',
                              clips=['c05_carlos2', 'c05t2_carlos2_present', 'c05e1_carlos2_excited', 'c05t3_carlos2_talk3', 'c05e2_carlos2_question', 'c05e3_carlos2_wow'], listen=['c05l_carlos2_listen'], speed=0.65, accent='blue', active='cream', hook_style='tiny word: X badge + quoted error', motif='the small word lit in the sentence',
                              open='Small word, big mistake.', lead='Not', just='Say:', share='Send this to a friend who mixes these up!', cta={'area': 'grammar-check', 'link': 'https://lexkite.com/app/#/fix', 'say': 'Check your grammar'}),
    'common-mix-ups': dict(name='Common Mix-ups', template='mistake', type='misunderstanding', pre='cmu', L='u', teacher='ama', set='classroom_board',
                           clips=['a05b_ama2', 'a05t2_ama2_present', 'a05e1_ama2_excited', 'a05e2_ama2_question', 'a05e3_ama2_wow'], listen=['a05l2_ama2_listen'], speed=0.75, accent='yellow', active='cream', hook_style='mix-up: X badge + quoted error', motif='meaning first, then the right sentence',
                           open='Most learners mix this up.', lead='Not', just='Natives say:', share='Send this to a friend!', cta={'area': 'dictionary', 'link': 'https://lexkite.com/app/', 'say': 'Look up any word'}),
    'say-it-naturally': dict(name='Say It Naturally', template='mistake', type='idiom-phrasal', pre='sin', L='i', teacher='carlos', set='classroom_board',
                             clips=['c05_carlos2', 'c05t2_carlos2_present', 'c05e1_carlos2_excited', 'c05t3_carlos2_talk3', 'c05e2_carlos2_question', 'c05e3_carlos2_wow'], listen=['c05l_carlos2_listen'], speed=0.65, accent='green', active='cream', hook_style='fixed phrase: X badge + quoted error', motif='the fixed phrase lit as one chunk',
                             open="Here's how natives say it.", lead='Not', just='Natives say:', share='Send this to a friend!', cta={'area': 'dictionary', 'link': 'https://lexkite.com/app/', 'say': 'Look up any word'}),
    'real-life-english': dict(name='Real-Life English', template='mistake', type='situational', pre='rle', L='r', teacher='ama', set='classroom_board',
                              clips=['a05b_ama2', 'a05t2_ama2_present', 'a05e1_ama2_excited', 'a05e2_ama2_question', 'a05e3_ama2_wow'], listen=['a05l2_ama2_listen'], speed=0.75, accent='green', active='cream', hook_style='real life: X badge + quoted error', motif='a real situation, the right words lit',
                              open='Real life, real English.', lead='Not', just='Say:', share='Send this to a friend!', cta={'area': 'dictionary', 'link': 'https://lexkite.com/app/', 'say': 'Look up any word'}),
    'verb-patterns': dict(name='Verb Patterns', template='mistake', type='verb-pattern', pre='vbp', L='v', teacher='carlos', set='classroom_board',
                          clips=['c05_carlos2', 'c05t2_carlos2_present', 'c05e1_carlos2_excited', 'c05t3_carlos2_talk3', 'c05e2_carlos2_question', 'c05e3_carlos2_wow'], listen=['c05l_carlos2_listen'], speed=0.65, accent='blue', active='cream', hook_style='pattern: X badge + quoted error', motif='verb + pattern lit together',
                          open='Which pattern is right?', lead='Not', just='Say:', share='Send this to a friend!', cta={'area': 'grammar-check', 'link': 'https://lexkite.com/app/#/fix', 'say': 'Check your grammar'}),
}
WMIN, WMAX, WSOFT, EST_MAX, HOOK_MAX = 50, 75, 71, 50.0, 6   # production standard: 50-75 words at speed 0.68-0.75 with 0.6-0.7 s gaps (<= 130 wpm)
LINE_MAX, QOPT_MAX = 26, 12   # note line (desk board 502 px) and quiz option character limits
EMO = re.compile('[←-⇿☀-➿\U0001F000-\U0001FAFF]️?')
norm = lambda w: re.sub(r"[^a-z0-9'-]", '', w.lower().replace('’', "'")).strip("-'")
toks = lambda s: s.split()

def est_seconds(lines, speed=0.72):   # Kokoro 0.75 ~ 2.1 words/s (scaled by speed), 0.22 s base gap, declared gaps, beats
    w = sum(len(toks(l['text'])) for l in lines if l.get('text'))
    return w / RATE_AT.get(speed, 2.1 * speed / 0.75) + sum(l.get('gap', 0.22) for l in lines if l.get('text')) + sum(l.get('dur', 0) for l in lines if l.get('beat')) + 0.4

RATE_AT = {0.72: 2.25, 0.68: 3.0, 0.65: 2.87}   # measured Kokoro words/s per (speed): daniel am_michael 0.72, carlos am_fenrir 0.68 (render logs 27/10)
WPM_EST = 122   # generator-side estimate of qc overall wpm (qc gate is 130)
def wpm_est(lines, speed):
    w = sum(len(toks(l['text'])) for l in lines if l.get('text')); return w * 60 / max(1.0, est_seconds(lines, speed) - 3.0)

def diff_span(wrong, right):
    """Word indices of `wrong` that differ from `right` (insertion in right -> the two wrong words around it), and the right-side indices."""
    a, b = [norm(x) for x in toks(wrong)], [norm(x) for x in toks(right)]; wi, ri = set(), set()
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == 'equal': continue
        wi |= set(range(i1, i2)) if i2 > i1 else {i for i in (i1 - 1, i1) if 0 <= i < len(a)}
        ri |= set(range(j1, j2)) if j2 > j1 else {j for j in (j1 - 1, j1) if 0 <= j < len(b)}
    return sorted(wi), sorted(ri)

def segs(sentence, idx, colour, base='white', quote=False):
    """Rich-row segments: words in idx coloured, others base; one space-joined row (optionally quoted)."""
    out = []; ws = toks(sentence)
    for i, w in enumerate(ws):
        c = colour if i in idx else base; t = ('“' if quote and i == 0 else '') + w + ('”' if quote and i == len(ws) - 1 else '') + ('' if i == len(ws) - 1 else ' ')
        if out and out[-1][1] == c: out[-1][0] += t
        else: out.append([t, c])
    return out

def board_row(text, colour):
    """Board text with ✓/✗/arrows/emoji turned into badge tokens (never raw emoji glyphs in a text segment)."""
    row, buf = [], ''
    for m in re.finditer(r'(✓|✗|→|' + EMO.pattern + r')|([^✓✗→]+?)(?=✓|✗|→|' + EMO.pattern + r'|$)', text):
        if m.group(2): buf += m.group(2); continue
        if buf.strip(): row.append([buf, colour]); buf = ''
        g = m.group(1); row.append(['@ok'] if g == '✓' else ['@x'] if g == '✗' else ['@emoji:➡️'] if g == '→' else ['@emoji:' + g])
    if buf.strip(): row.append([buf, colour])
    if row and row[0][0].startswith('@') and len(row) > 1 and not row[1][0].startswith(' '): row[1][0] = ' ' + row[1][0]
    return row

def key_idx(text, words, limit=4):
    """Indices of tokens whose normalised form starts with one of `words` (len >= 2), first `limit`."""
    ws = [w for w in words if len(w) >= 2]
    return [i for i, t in enumerate(toks(text)) if any(norm(t).startswith(w) for w in ws) and norm(t)][:limit]

def mem_words(memory):
    return [w for w in (norm(x) for x in re.split(r'[\s,=+/→()]+', EMO.sub(' ', memory))) if len(w) >= 3 and w not in ('the', 'and', 'thing', 'person', 'words', 'verb', 'noun')]

def spoken_ok(s):
    return bool(s) and not EMO.search(s) and not re.search(r'[=+_/→✓✗…()"]|\.\.\.', s) and "'" not in s.replace("'s", '').replace("n't", '').replace("'m", '').replace("'re", '').replace("'ve", '').replace("'ll", '').replace("'d", '')

def quiz_parts(q):
    o = q['options']; a = q['answer']
    say = lambda s: s.strip('()').strip()
    spoken = [say(x) for x in o]
    if any(not spoken_ok(x) for x in spoken) or q['q'].count('___') != 1: return None
    filled = re.sub(r'\s+', ' ', q['q'].replace('___', '' if o[a].startswith('(') else o[a])).replace(' ,', ',').replace(' .', '.').strip()
    filled = filled[0].upper() + filled[1:]
    return dict(q=q['q'], o=o, a=a, say=spoken, q_spoken=q['q'].replace('___', 'blank'), filled=filled,
                q_rows=[[[p, 'white'] if p != '___' else ['___', 'yellow'] for p in re.split(r'(___)', q['q']) if p]], q_win=blank_window(q['q']))

def blank_window(q, before=2, after=1):
    """Short quiz prompt: <= 2 words before the blank, 1 after, '…' where the sentence is cut (all words come from the quiz sentence)."""
    w = q.split(); i = next(k for k, x in enumerate(w) if '___' in x); lo, hi = max(0, i - before), min(len(w), i + after + 1)
    pre = ('…' if lo > 0 else '') + ' '.join(w[lo:i]); post = ' '.join(w[i + 1:hi]) + ('…' if hi < len(w) else '')
    return [[x for x in ([pre + ' ', 'white'] if pre else None, ['___', 'yellow'], [' ' + post, 'white'] if post else None) if x]]

def cap(s): return s[0].upper() + s[1:]

_DICT = {}
def dict_rows(words):
    """US IPA / emoji from the app dictionary (scripts/scriptbank/lib.mjs sources().byWord: row[10] US IPA, else row[1]); batch, cached."""
    need = sorted({w for w in words if w and w not in _DICT})
    if need:
        js = "import('./scripts/scriptbank/lib.mjs').then(m=>{const s=m.sources();const o={};for(const w of JSON.parse(process.argv[1])){const r=s.byWord.get(w);if(r)o[w]=[r[10]||r[1],r[9]||'']}console.log(JSON.stringify(o))})"
        out = subprocess.run(['node', '-e', js, json.dumps(need)], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        got = json.loads(out.strip().splitlines()[-1])
        for w in need: _DICT[w] = got.get(w)
    return _DICT

def lemmas(w):
    w = norm(w); c = [w]
    for suf, rep in (('ing', ''), ('ing', 'e'), ('ed', ''), ('ed', 'e'), ('d', ''), ('es', ''), ('s', ''), ('ied', 'y'), ('ies', 'y')):
        if w.endswith(suf) and len(w) - len(suf) >= 3: c.append(w[:-len(suf)] + rep)
    return c

def ipa_of(word):
    for c in lemmas(word):
        r = dict_rows([c]).get(c)
        if r and r[0]: return r[0], r[1]
    return None, ''

def wrap(items, maxc=26, m=len):
    """items = [(token, colour)] -> rows of [text, colour] segs, each row <= maxc characters (greedy word wrap)."""
    def greedy(mx):
        rows, cur, n = [], [], 0
        for t, c in items:
            if cur and m(' '.join(x for x, _ in cur + [(t, c)])) > mx: rows.append(cur); cur = []
            cur.append((t, c))
        if cur: rows.append(cur)
        return rows
    rows = greedy(maxc)
    for mx in range(int(max(m(t) for t, _ in items)), int(maxc), 4 if m is not len else 1):   # balanced rows: the narrowest width that keeps the same row count
        if len(greedy(mx)) == len(rows): rows = greedy(mx); break
    out = []
    for r in rows:
        segs_ = []
        for i, (t, c) in enumerate(r):
            t = t + (' ' if i < len(r) - 1 else '')
            if segs_ and segs_[-1][1] == c: segs_[-1][0] += t
            else: segs_.append([t, c])
        out.append([[t, c] if c else [t] for t, c in segs_])
    return out

def _old_wrap(items, maxc=26):
    rows, cur, n = [], [], 0
    for t, c in items:
        if cur and n + 1 + len(t) > maxc: rows.append(cur); cur, n = [], 0
        cur.append((t, c)); n += len(t) + (1 if n else 0)
    if cur: rows.append(cur)
    out = []
    for r in rows:
        segs_ = []
        for i, (t, c) in enumerate(r):
            t = t + (' ' if i < len(r) - 1 else '')
            if segs_ and segs_[-1][1] == c: segs_[-1][0] += t
            else: segs_.append([t, c])
        out.append([[t, c] if c else [t] for t, c in segs_])
    return out

NOTE_SZ = dict(title=(58, 'ExtraBold'), big=(78, 'ExtraBold'), text=(44, 'Bold'), small=(38, 'Bold'))
_FT = {}
def tw(st, text):   # rendered width of a note text segment in render_v9's mock typography (px at k = 1.0)
    from PIL import ImageFont
    z, w = NOTE_SZ[st]; k = (z, w)
    if k not in _FT: _FT[k] = ImageFont.truetype(os.path.join(os.path.dirname(__file__), f'../../../brand/social/src/fonts/BeVietnamPro-{w}.ttf'), z)
    return _FT[k].getlength(text)
def seg_w(st, sg):
    t = sg[0]
    if t.startswith('@emoji:'): return NOTE_SZ[st][0] + 22
    if t.startswith('@ipa:'):
        from PIL import ImageFont
        return ImageFont.truetype(os.path.join(os.path.dirname(__file__), '../../../brand/social/src/fonts/NotoSans-Medium.ttf'), NOTE_SZ[st][0]).getlength(t[5:])
    return tw(st, t) + (12 if len(sg) > 1 and sg[1] == 'hl' else 0)
def row_w(st, segs): return 4 + sum(seg_w(st, sg) for sg in segs)
PXW = {'d03': 540, 'c01': 780, 'c05': 695, 'a05': 695}   # usable note width (px at the mock size): board zone / 0.89 minus margin (render_v9 build_note)
def wrap_s(sentence, idx=(), colour='green', base=None, maxc=26, st=None, lead=0):
    if st: return wrap([(w, colour if i in idx else base) for i, w in enumerate(toks(sentence))], maxc - lead - 8, lambda t: tw(st, t))
    return wrap([(w, colour if i in idx else base) for i, w in enumerate(toks(sentence))], maxc)

def note(nid, frm, to, title, lines, anim='spring'):
    return dict(id=nid, kind='note', anim=anim, from_=frm, to_=to, lines=[{'st': 'title', 'segs': [[title]]}] + [{'st': st, 'segs': sg} for st, sg in lines])

NOTE_H = dict(title=90, big=96, text=64, small=56); NOTE_MAXH = 335   # board region 306 px / 0.89 (render_v9 build_note)
def line_len(segs): return sum(len(t[0].split(':', 1)[1]) if t[0].startswith('@ipa:') else 0 if t[0].startswith('@') else len(t[0]) for t in segs)
def memory_rows(memory, px=540):
    """Memory trick -> note text rows: UPPERCASE words highlighted, ✓/✗ become emoji tokens, a bulb on the first row."""
    rows = []
    for piece in [x.strip() for x in memory.split(',') if x.strip()]:
        emo = []; piece = re.sub(r'\s*(✓|✗)', lambda m: (emo.append('@emoji:✅' if m.group(1) == '✓' else '@emoji:❌'), '')[1], piece)
        em = [m.group(0) for m in EMO.finditer(piece)]; piece = EMO.sub('', piece).strip()
        for r in wrap([(w, 'hl' if w.strip('+-=').isupper() and len(w.strip('+-=')) >= 2 else None) for w in toks(piece)], px - 70, lambda t: tw('text', t)):
            rows.append(r)
        if emo or em:
            rows[-1] = rows[-1] + [[e] for e in ([x for x in emo] + [x for x in em][:1])]
    if rows: rows[0] = [['@emoji:💡']] + [[' ' + rows[0][0][0]] + rows[0][0][1:]] + rows[0][1:]
    return rows

def build(slug, it, ep):
    C = SERIES[slug]; L = C['L']; why, aha, ex, right, wrong = it['why'], it['aha'], list(it['ex']), it['right'], it['wrong']
    for k, s in [('why', why), ('aha', aha), ('wrong', wrong), ('right', right)] + [(f'ex{i}', e) for i, e in enumerate(ex)]:
        if not spoken_ok(s): return None, f'{k} not TTS-clean (symbols/emoji/quotes): {s!r}'
    Q = quiz_parts(it['quiz'])
    if not Q: return None, 'quiz not speakable (needs one ___ and plain options)'
    if any(len(x) > QOPT_MAX for x in Q['o']): return None, f'quiz option longer than {QOPT_MAX} characters'
    wi, ri = diff_span(wrong, right)
    if not wi or not ri: return None, 'wrong/right identical'
    mw = mem_words(it['memory'])
    cards = None
    if C['template'] == 'pair':
        m = re.match(r'^(.+?) \([^)]*\) vs (.+?) \([^)]*\)$', it['point'])
        if not m: return None, f'not a two-way pair: {it["point"]!r}'
        X, Y = m.group(1).strip(), m.group(2).strip()
        if len(X.split()) > 2 or len(Y.split()) > 2: return None, 'pair word too long for twin tiles'
        if sorted([X.lower(), Y.lower()]) == sorted(GOLD_EP1.get(slug, [])): return None, 'already episode 1 (templates-v2 gold)'
        cards = json.load(open(f'{ROOT}/content/video/scripts/bank/pair-cards.json')).get(it['id'])
        if not cards: return None, 'no hand-checked lesson cards (meaning + example) in bank/pair-cards.json'
    elif any(g in wrong.lower() for g in GOLD_EP1.get(slug, [])): return None, 'already episode 1 (templates-v2 gold)'
    lines = []
    def add(i, text, gap=None, **key):
        d = {'id': f'{L}_{i}', 'text': text}
        k = {c: v for c, v in key.items() if v}
        if k: d['key'] = k
        if gap: d['gap'] = gap
        lines.append(d); return d
    PX = PXW[C['clips'][0][:3]]
    span_w = {norm(toks(wrong)[i]) for i in wi} | {norm(toks(right)[i]) for i in ri}
    G = 0.7 if C['teacher'] == 'carlos' else 0.65   # carlos (fast voice): longer breaths keep the overall pace <= 130 wpm
    if C['template'] == 'mistake':
        add('h', C.get('open', 'Stop saying this.'), 0.5)
        add('w', wrong, G, red=wi)
        k = add('k', C.get('just', 'Just say:') + ' ' + right, G, green=[i + len(toks(C.get('just', 'Just say:'))) for i in ri])
        add('y', why, G, yellow=key_idx(why, mw, 3))
    else:
        add('h', f'{cap(X)} or {Y}? Quick lesson.', G, yellow=[0], green=[2])
        add('y', why, G, yellow=key_idx(why, [norm(w) for w in X.split()], 2), green=[i for i in key_idx(why, [norm(w) for w in Y.split()], 2) if i not in key_idx(why, [norm(w) for w in X.split()], 2)])
    exl = ' '.join(ex)
    xl = add('x', exl, G, green=key_idx(exl, sorted(span_w | set(mw)), 4))
    if C['template'] == 'pair':
        add('w', 'Not: ' + wrong, G, red=[i + 1 for i in wi])
        k = add('k', 'Say: ' + right, G, green=[i + 1 for i in ri])
    add('t', aha, G, yellow=key_idx(aha, mw, 3))
    add('q', ('Quick quiz! ' if C['template'] == 'mistake' else 'Quiz! ') + Q['q_spoken'], G, yellow=[0, 1] if C['template'] == 'mistake' else [0])
    add('q2', f"{cap(Q['say'][0])}, or {Q['say'][1]}?")
    lines.append({'id': '_count', 'beat': 'count', 'dur': 3.0})
    ans = Q['say'][Q['a']]; aline = f"{cap(ans)}! {Q['filled']}"
    fi = key_idx(Q['filled'], [norm(w) for w in ans.split()], 3) if not Q['o'][Q['a']].startswith('(') else []
    add('a', aline, G, green=[0] + [i + 1 for i in fi])
    add('sh', C.get('share', 'Send this to a friend who says it!' if C['template'] == 'mistake' else 'Send this to a friend!'), G)   # the SAVE THIS card needs >= 0.8 s on screen (readability)
    add('c', f"Save this, and {C['cta']['say'][0].lower() + C['cta']['say'][1:]} on lexkite.com.", G)
    nw = lambda: sum(len(toks(l['text'])) for l in lines if l.get('text'))
    if (nw() > WSOFT or est_seconds(lines, C['speed']) > EST_MAX - 1 or wpm_est(lines, C['speed']) > WPM_EST) and len(ex) > 1:   # one example when two do not fit (never pad)
        xl['text'] = ex[0]; kk = key_idx(ex[0], sorted(span_w | set(mw)), 4); xl.pop('key', None)
        if kk: xl['key'] = {'green': kk}
        ex = ex[:1]
    if C['template'] == 'pair' and (nw() > WSOFT or wpm_est(lines, C['speed']) > WPM_EST):   # the lesson card already shows an example for each word
        lines.remove(xl)
    a = lambda lid, k=0, off=-0.1: [f'{L}_{lid}', k, 's', off]
    wrong_sp = ' '.join(toks(wrong)[i] for i in wi).strip('.,!?'); right_sp = ' '.join(toks(right)[i] for i in ri).strip('.,!?')
    ip, ipw = (None, None)   # IPA word: a changed word (>= 4 letters), else a memory-trick word that is in the right sentence (US IPA, app dictionary)
    for w_ in ([toks(right)[i] for i in ri][:2] if len(ri) <= 2 else []) + [w for w in toks(right) if any(norm(w).startswith(m_) or m_.startswith(norm(w)) for m_ in mw) and len(norm(w)) >= 4]:
        if len(norm(w_)) >= 4 and ipa_of(w_)[0]: ip, ipw = ipa_of(w_)[0], norm(w_); break
    ipa_seg = [['  '], ['@ipa:' + ip]] if ip else []
    qs_rows = wrap_s(Q['q'], {i for i, w in enumerate(toks(Q['q'])) if '___' in w}, 'green', None, PX, 'text')
    qs = note('qs', a('q', 1 if C['template'] == 'mistake' else 0, -0.06), None, 'QUICK QUIZ', [('text', r) for r in qs_rows])
    if C['template'] == 'mistake':
        n_hook = 2 + len(toks(wrong))
        lead = [[' ' + C.get('lead', 'Stop saying'), 'white']] if n_hook <= HOOK_MAX else [[' ' + C.get('lead', 'Stop saying').split()[0], 'white']] if n_hook - 1 <= HOOK_MAX else []
        hook_rows = [[['@x']] + lead, segs(wrong, set(wi), 'red', quote=True)]
        ipl = [('text', [[ipw, 'green']] + ipa_seg)] if ipa_seg else []
        for st_ in ('big', 'text'):   # the hero sentence in big type when title + rows + IPA fit the board, else normal text
            fixl = [(st_, r) for r in wrap_s(right, set(ri), 'green', None, PX, st_)] + ipl
            if NOTE_H['title'] + sum(NOTE_H[st] for st, _ in fixl) <= NOTE_MAXH: break
        if NOTE_H['title'] + sum(NOTE_H[st] for st, _ in fixl) + NOTE_H['small'] <= NOTE_MAXH: fixl.append(('small', [['not “'], [wrong_sp, 'red'], ['”']]))
        wl = [('text', [['@emoji:❌'], [' ' + wrong_sp, 'red']]), ('text', [['@emoji:✅'], [' ' + right_sp, 'green']])]
        P = [dict(id='hook', kind='rich', role='hook', anim='stamp', size=84, from_=['t', 0], rows=hook_rows),
             note('fix', a('k', 0, -0.2), None, 'SAY THIS', fixl),
             note('why', a('y', 0, -0.06), None, 'WHY?', wl,),
             note('ex', a('x', 0, -0.06), None, 'EXAMPLE', [('text', r) for e, ix in [(e, key_idx(e, sorted(span_w | set(mw)), 4)) for e in ex] for r in wrap_s(e, set(ix), 'green', None, PX, 'text')])]
        mr = memory_rows(it['memory'], PX)
        if mr: P.append(note('trick', a('t', 0, -0.06), None, 'REMEMBER', [('text', r) for r in mr]))
        P += [qs, dict(id='quiz', kind='quiz', from_=a('q2', 0, -0.06), a=Q['o'][0], b=Q['o'][1], correct='ab'[Q['a']], reveal=a('a', 0, -0.04)),
              note('save', [f'{L}_a', -1, 'e', 0.35], None, 'SAVE THIS', [wl[0], ('text', [['@emoji:✅'], [' ' + right_sp, 'green']]), ] + ([('text', [[ipw, 'green']] + ipa_seg)] if ipa_seg else []))]
    else:
        items = []
        for nm, col, ico in ((X, 'green', None), (Y, 'blue', None)):
            cd = cards.get(nm.lower())
            if not cd: return None, f'pair-cards.json lacks {nm}'
            i_, e_ = ipa_of(nm); items.append(dict(icon=cd.get('icon') or e_ or '💬', color=col, word=nm.lower(), **({'ipa': i_} if i_ else {}), mean=cd['mean'], ex=cd['ex']))
        wy = key_idx(why, [norm(Y)], 1)
        if wy: items[1]['at'] = a('y', wy[0], -0.06)
        sv = [dict(it_, **({'mean': cards[it_['word']].get('save_mean', it_['mean'])})) for it_ in items]
        for it_ in sv: it_.pop('at', None)
        def emo_rows(emo, sentence, idx, colour):   # emoji on the first row, continuation rows indented, all rows <= 22 characters
            rr = wrap_s(sentence, idx, colour, None, PX, 'text', 58)
            return [('text', ([[emo]] if i == 0 else []) + [[(' ' if i == 0 else '      ') + r[0][0]] + r[0][1:]] + r[1:]) for i, r in enumerate(rr)]
        fixl = emo_rows('@emoji:❌', wrong, wi, 'red') + emo_rows('@emoji:✅', right, ri, 'green')
        P = [dict(id='hook', kind='rich', role='hook', anim='stamp', size=96, from_=['t', 0], rows=[[[X, 'yellow'], [' or', 'white']], [[Y, 'green'], ['?', 'white']]], align='l'),
             dict(id='lesson', kind='lesson', anim='spring', from_=a('y', 0, -0.06), to_=None, title=f'{X.upper()} vs {Y.upper()}', items=items),
             note('fix', a('w', 0, -0.06), None, 'NOT / SAY', fixl),
             note('trick', a('t', 0, -0.06), None, 'MEMORY TRICK', [('text', r) for r in memory_rows(it['memory'], PX)]),
             qs, dict(id='quiz', kind='quiz', from_=a('q2', 0, -0.06), a=Q['o'][0], b=Q['o'][1], correct='ab'[Q['a']], reveal=a('a', 0, -0.04)),
             dict(id='save', kind='lesson', anim='spring', from_=[f'{L}_a', -1, 'e', 0.35], to_=None, title='SAVE THIS', save=True, items=sv, footer='lexkite.com')]
    P.append(dict(id='cta', kind='cta', from_=a('c', 0, -0.05)))
    pops = []
    for i, p in enumerate(P):
        d = {k: v for k, v in p.items() if k not in ('from_', 'to_')}; d['from'] = p['from_']; d['to'] = P[i + 1]['from_'] if i + 1 < len(P) else ['end']
        pops.append(d)
    spec = {'id': f"{C['pre']}_{it['id'].split('_', 1)[1]}", 'template': C['template'],
            'title': f"{C['name']} #{ep} – {it['point']}", 'teacher': C['teacher'], 'set': C['set'], 'clips': C['clips'], 'listen': C['listen'], 'accent': C['accent'],
            'active': C['active'], 'hook_style': C['hook_style'], 'motif': C['motif'], 'cta': C['cta'], 'speed': C['speed'], 'display': {'blank': '___'}, 'caption_cap': 42}
    if C['template'] == 'mistake':
        tw = [norm(x) for x in toks(wrong)]; span = tw[max(0, wi[0] - 1): min(len(tw), wi[-1] + 2)]
        spec['error_lines'] = [f'{L}_w']; spec['error_re'] = r'\b' + r'\W+'.join(re.escape(w) for w in span if w) + r'\b'
    spec.update(lines=lines, pops=pops, series={'name': C['name'], 'ep': ep}, source={'bank': it['id'], 'pid': it.get('pid'), 'cefr': it.get('cefr'), 'diff': it.get('diff'), 'ipa': ip})
    err = selfcheck(spec)
    return (None, 'self-check: ' + '; '.join(err)) if err else (spec, None)

def hook_text(spec):
    tt = lambda s: s if not s.startswith('@') else {'x': '✗', 'ok': '✓', 'q': '?'}.get(s[1:], s.split(':', 1)[1] if ':' in s else '')
    h = next(p for p in spec['pops'] if p.get('role') == 'hook')
    if h['kind'] == 'pair': return h['left']['title'] + ' | ' + h['right']['title']
    return ' / '.join(''.join(tt(s[0]) for s in r) for r in h['rows'])

def selfcheck(s):
    e = []; T = [l for l in s['lines'] if l.get('text')]; S = {l['id']: l['text'] for l in T}
    w = sum(len(toks(t)) for t in S.values())
    if not WMIN <= w <= WMAX: e.append(f'{w} words (need {WMIN}-{WMAX})')
    if wpm_est(s['lines'], s['speed']) > WPM_EST + (12 if s['speed'] < 0.7 else 6): e.append(f'est pace {wpm_est(s["lines"], s["speed"]):.0f} wpm')  # carlos: the model over-estimates by ~8 wpm (sod_7432d6cb est 129, qc 120)
    if est_seconds(s['lines'], s['speed']) > EST_MAX: e.append(f'est {est_seconds(s["lines"], s["speed"]):.1f} s > {EST_MAX}')
    if not s.get('listen') or not 0.65 <= s['speed'] <= 0.75 or s.get('caption_cap') != 42: e.append('production-standard fields (listen, speed 0.65-0.75, caption_cap 42)')
    if any(l.get('gap', 0.22) < 0.4 and l['id'] not in (s['lines'][0]['id'], s['lines'][0]['id'][0] + '_q2', s['lines'][0]['id'][0] + '_a', s['lines'][0]['id'][0] + '_w') for l in T): e.append('gap < 0.4 s')
    for p in s['pops']:
        if p['kind'] == 'note':
            hgt = sum(NOTE_H[x['st']] for x in p['lines']); px = PXW[s['clips'][0][:3]]
            if hgt > NOTE_MAXH: e.append(f'note {p["id"]} height {hgt} > {NOTE_MAXH}')
            for x in p['lines']:
                if line_len(x['segs']) > LINE_MAX: e.append(f'note {p["id"]} line > {LINE_MAX} chars: {x["segs"]}')
                if row_w(x['st'], x['segs']) > px: e.append(f'note {p["id"]} line {row_w(x["st"], x["segs"]):.0f} px > {px}')
                if any('✓' in sg[0] or '✗' in sg[0] for sg in x['segs']): e.append('✓/✗ char in note')
        if p['kind'] == 'quiz' and (len(p['a']) > QOPT_MAX or len(p['b']) > QOPT_MAX): e.append('quiz option too long')
    for l in T:
        for c, ix in l.get('key', {}).items():
            if any(not 0 <= i < len(toks(l['text'])) for i in ix): e.append(f'key {c} {ix} outside {l["id"]}')
    L = s['lines'][0]['id'][0]; q = next(p for p in s['pops'] if p['kind'] == 'quiz'); ans = q[q['correct']].strip('()').lower()
    if ans not in S[f'{L}_a'].lower(): e.append('quiz answer not spoken in the answer line')
    if 'lexkite.com' not in S[f'{L}_c'] or not S[f'{L}_c'].startswith('Save this, and '): e.append('CTA line')
    hw = len([x for x in re.split(r'[\s/|]+', hook_text(s)) if re.search(r'[A-Za-z]', x)])
    if hw > HOOK_MAX: e.append(f'hook {hw} words on screen')
    # the narrowest board (desk sets, 532 px) must hold the widest single hook word at the 72 px minimum (render_v9 draws at ~1.35x the
    # font's advance width incl. stroke); a wider word stops the render (sts_1740b6df: “Remember = 581 px), so it is caught here instead
    hk = next(p for p in s['pops'] if p.get('role') == 'hook')
    if hk['kind'] == 'rich':
        from PIL import ImageFont
        fo = ImageFont.truetype(os.path.join(os.path.dirname(__file__), '../../../brand/social/src/fonts/BeVietnamPro-ExtraBold.ttf'), 72)
        wide = max((x for r in hk['rows'] for seg in r if not seg[0].startswith('@') for x in seg[0].split()), key=fo.getlength, default='')
        bw = BOARDW.get(s['clips'][0], 532) - 12
        if wide and 1.35 * fo.getlength(wide) > bw: e.append(f'hook word "{wide}" too wide for the {s["clips"][0]} board')
    if s.get('error_re'):
        rx = re.compile(s['error_re']); hit = [k for k, t in S.items() if rx.search(t.lower())]
        if hit != s['error_lines']: e.append(f'error phrase in {hit}')
    for i, p in enumerate(s['pops'][:-1]):
        if p['to'] != s['pops'][i + 1]['from']: e.append(f'board gap after {p["id"]}')
    for p in s['pops']:
        for an in [p['from'], p['to']] + ([p['reveal']] if 'reveal' in p else []) + [f[0] for f in p.get('focus', [])]:
            if an[0] in S and not (-len(toks(S[an[0]])) <= an[1] < len(toks(S[an[0]]))): e.append(f'anchor {an} outside line')
    return e

def content_hash(spec):   # series + key sentence (the right form / rule): never render the same lesson twice
    L = spec['lines'][0]['id'][0]; S = {l['id']: l['text'] for l in spec['lines'] if l.get('text')}
    return hashlib.sha1((spec['series']['name'] + '|' + S[f'{L}_k'].lower()).encode()).hexdigest()[:16]

def main():
    check = '--check' in sys.argv
    bank = [json.loads(x) for f in sorted(glob.glob(f'{ROOT}/content/video/scripts/bank/*.jsonl')) for x in open(f) if x.strip()]
    order = {'easy': 0, 'mid': 1, 'medium': 1, 'hard': 2}; lv = {'A1': 0, 'A2': 1, 'B1': 2, 'B2': 3, 'C1': 4}
    for slug, C in SERIES.items():
        items = sorted([b for b in bank if b.get('type') == C['type']], key=lambda b: (order.get(b.get('diff'), 1), lv.get(b.get('cefr'), 2), b['id']))
        d = f'{OUT}/{slug}'; vf = f'{d}/reviewed-hooks.json'
        old = json.load(open(vf))['verdicts'] if os.path.exists(vf) else {}
        plan, skipped, verdicts, seen = [], [], {}, set(); ep = 2 if slug in GOLD_EP1 else 1   # episode 1 = hand-written templates-v2 gold spec (old series); new series start at #1
        for it in items:
            spec, why = build(slug, it, ep)
            if not spec and 'too wide' in (why or '') and slug in ALT:   # same lesson on the wide board instead of skipping it
                keep = {k: C[k] for k in ALT[slug]}; C.update(ALT[slug])
                try: spec, why = build(slug, it, ep)
                finally: C.update(keep)
            if spec and content_hash(spec) in seen: spec, why = None, 'duplicate key sentence'
            if not spec: skipped.append({'bank': it['id'], 'point': it['point'], 'reason': why}); continue
            seen.add(content_hash(spec)); S = {l['id']: l['text'] for l in spec['lines'] if l.get('text')}; L = C['L']
            pr = {'quiz': True, 'count': True, 'right': it['right'], 'right_lines': [f'{L}_k']}
            if C['template'] == 'mistake': pr.update(wrong_line=f'{L}_w', wrong=it['wrong'])
            v = dict(template=C['template'], hook=hook_text(spec), hook_true=None, script_reviewed=False, script=S, promise=pr, source=it['id'])
            o = old.get(spec['id'])
            if o and o.get('script') == S and o.get('hook') == v['hook']: v = dict(o, promise=pr)   # keep a review only while it still matches word for word
            verdicts[spec['id']] = v
            plan.append({'ep': ep, 'id': spec['id'], 'point': it['point'], 'cefr': it.get('cefr'), 'diff': it.get('diff'), 'words': sum(len(t.split()) for t in S.values()),
                         'est_s': round(est_seconds(spec['lines'], spec['speed']), 1), 'ipa': spec['source'].get('ipa'), 'content_hash': content_hash(spec)})
            ep += 1
            if not check:
                os.makedirs(d, exist_ok=True); json.dump(spec, open(f"{d}/{spec['id']}.json", 'w'), ensure_ascii=False, indent=1)
        print(f"{slug}: {len(plan)} specs, {len(skipped)} skipped of {len(items)}")
        if check: continue
        for f in glob.glob(f'{d}/*.json'):   # drop specs the bank no longer produces
            if os.path.basename(f)[:-5] not in verdicts and os.path.basename(f) not in ('plan.json', 'reviewed-hooks.json'): os.remove(f)
        json.dump({'series': C['name'], 'template': C['template'], 'generator': 'scripts/video/tpl/gold2v9.py', 'order': plan, 'skipped': skipped},
                  open(f'{d}/plan.json', 'w'), ensure_ascii=False, indent=1)
        json.dump({'_note': f"{C['name']}: hook + script verdicts (qc_v9 hook_truth, video-series.yml gate). Generator writes hook_true null / script_reviewed false; "
                            'a reviewer (scripts/video/tpl/review_queue.py) sets hook_true, script_reviewed, reviewer, note. Script must equal the spec word for word.',
                   'verdicts': verdicts}, open(vf, 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
