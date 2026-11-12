"""QC gates for graphic overlays on the shorts (owner 28/10: Stitch-design cards, animated by the Remotion motion layer or any other engine).
Engine-agnostic: the overlay renderer writes timeline key `overlay` (contract below), qc_v9.py calls overlay_gates() and adds the results.
  overlay = {
    pops:     {id: {states: [{state, size: [w, h], pairs: [{name, fg: [r,g,b], bg: [r,g,b]}], boxes: [{name, box: [x0,y0,x1,y1]}]}]}},
              # every look the card takes; pairs = each text colour on the fill it sits on; boxes = real glyph / widget boxes, card pixels
    measured: [{t, pop, fg: [[r,g,b], ...], bg: [r,g,b]}],   # card fill sampled on the COMPOSITED frame + the text colours drawn on it
    ipa:      [{pop, token, ipa, syl?: [..], stress?: int}]   # every IPA shown; syl/stress when stress dots are drawn
  }
  Each overlay pop also appears in the per-frame elements as `pop.<id>` with its screen bbox (like every other pop).
Gates: overlay_contrast (WCAG >= 3:1 in every state AND on the frame), overlay_layout (no box overlap / outside the card in any state; on screen
inside SAFE (+ the board zone when given) and never touching a caption or another pop), overlay_ipa (IPA == audited bank US cell for the exact
token shown, token visible on that pop, syllables spell the token, stress dot == IPA stress mark).
Self-test: python3 scripts/video/tpl/overlay_gates.py --test"""
import json, os, subprocess, sys

def lum(c):
    v = [x / 255 for x in c[:3]]; v = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in v]
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
def contrast(a, b): la, lb = sorted((lum(a), lum(b)), reverse=True); return round((la + 0.05) / (lb + 0.05), 2)
def inter(a, b): return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]
VOWELS = set('aeiouæɑɒɔəɛɜɪʊʌyɐ')
def stress_index(ipa):   # vowel nuclei before the primary stress mark; None when the IPA carries no mark
    body = ipa.strip('/')
    if 'ˈ' not in body: return None
    n, prev = 0, False
    for ch in body.split('ˈ')[0]:
        v = ch in VOWELS; n += v and not prev; prev = v
    return n
def bank_ipa(tokens, root):   # audited word bank, US cell else UK (same rule as the app, web/js/ui.js ipaOf)
    if not tokens: return {}
    js = "const {sources}=await import(process.argv[1]);const s=sources(),o={};for(const w of JSON.parse(process.argv[2])){const r=s.byWord.get(w);o[w]=r?(r[10]||r[1]):null}console.log(JSON.stringify(o))"
    out = subprocess.run(['node', '--input-type=module', '-e', js, f'{root}/scripts/scriptbank/lib.mjs', json.dumps(sorted(tokens))], capture_output=True, text=True, cwd=root).stdout.strip().splitlines()
    return json.loads(out[-1]) if out else {}

def overlay_gates(T, frames, safe, root, bank=None, min_cr=3.0):
    """T = timeline dict, frames = [(t, [el, ...])] with el = dict(name, x0, y0, x1, y1, alpha), safe = dict(x0, x1, y0, y1). -> {gate: result}"""
    O = T.get('overlay')
    if O is None: return {}
    P = O.get('pops') or {}; R = {}; low = []; inside = []
    for pid, v in P.items():
        for s in v.get('states') or []:
            lo = [dict(name=p['name'], cr=contrast(p['fg'], p['bg'])) for p in s.get('pairs', []) if contrast(p['fg'], p['bg']) < min_cr]
            if lo: low.append(dict(pop=pid, state=s.get('state'), low=lo[:3]))
            B = s.get('boxes', []); W_, H_ = s.get('size', [1e9, 1e9])
            ov = [[a['name'], b['name']] for i, a in enumerate(B) for b in B[i + 1:] if inter(a['box'], b['box'])]
            out = [b['name'] for b in B if b['box'][0] < 0 or b['box'][1] < 0 or b['box'][2] > W_ or b['box'][3] > H_]
            if ov or out: inside.append(dict(pop=pid, state=s.get('state'), overlaps=ov[:3], outside=out[:3]))
    M = O.get('measured') or []; mlow = [dict(t=m['t'], pop=m['pop'], cr=min(contrast(f, m['bg']) for f in m['fg'])) for m in M if m.get('fg') and min(contrast(f, m['bg']) for f in m['fg']) < min_cr]
    n_states = sum(len(v.get('states') or []) for v in P.values())
    R['overlay_contrast'] = dict(ok=bool(P) and all(v.get('states') for v in P.values()) and not low and bool(M) and not mlow, n_states=n_states, n_measured=len(M), low=low[:4], measured_low=mlow[:4],
                                 note=f'WCAG ratio of every text colour on its fill >= {min_cr}:1 in every state + the card fill re-measured on the composited frame')
    Z = (T.get('board') or {}).get('zone'); off, scr = [], []
    for t, E in frames:
        E = [e for e in E if e['alpha'] > 0.3]
        for e in E:
            if not e['name'].startswith('pop.') or e['name'][4:] not in P: continue
            bx = [e['x0'], e['y0'], e['x1'], e['y1']]
            if bx[0] < safe['x0'] or bx[2] > safe['x1'] or bx[1] < safe['y0'] or bx[3] > safe['y1']: off.append((t, e['name'], 'safe'))
            scr += [(t, e['name'], o['name']) for o in E if o is not e and inter(bx, [o['x0'], o['y0'], o['x1'], o['y1']])]
    seen = {e['name'][4:] for _, E in frames for e in E if e['name'].startswith('pop.')}
    R['overlay_layout'] = dict(ok=bool(P) and not inside and not off and not scr and all(p in seen for p in P), inside_card=inside[:4], off_screen=off[:4], overlaps_on_screen=scr[:4],
                               never_on_screen=[p for p in P if p not in seen], zone=Z, note='no box overlap / outside the card in any state; on screen inside SAFE, never touching a caption or another pop')
    ip = O.get('ipa') or []; texts = {p['id']: p.get('text', '') for p in T.get('pops', [])}; bad = []
    bank = bank if bank is not None else bank_ipa({x['token'].lower() for x in ip}, root)
    for x in ip:
        why = []; want = bank.get(x['token'].lower())
        if want != x['ipa']: why.append(f'bank {want}')
        if x['token'] not in texts.get(x['pop'], ''): why.append('token not on the pop')
        if x.get('syl') is not None:
            if ''.join(x['syl']).lower() != x['token'].lower(): why.append('syllables != token')
            si = stress_index(x['ipa'])
            if si is None or si != x.get('stress'): why.append(f"stress dot {x.get('stress')} != IPA stress {si}")
        if why: bad.append(dict(token=x['token'], ipa=x['ipa'], why=why))
    R['overlay_ipa'] = dict(ok=not bad, checked=len(ip), bad=bad[:6], note='IPA == audited bank (US cell) for the exact token shown; stress dot == IPA stress mark')
    return R

def _test():
    SAFE = dict(x0=48, x1=924, y0=232, y1=1497); card, text, teal, dim = [21, 34, 37], [215, 229, 233], [107, 216, 206], [60, 70, 72]
    st = dict(state={}, size=[700, 400], pairs=[dict(name='q', fg=text, bg=card)], boxes=[dict(name='q', box=[30, 30, 400, 80]), dict(name='a', box=[30, 100, 300, 150])])
    T = dict(overlay=dict(pops=dict(drill=dict(states=[st])), measured=[dict(t=1.0, pop='drill', fg=[text, teal], bg=card)],
                          ipa=[dict(pop='drill', token='enormous', ipa='/ɪˈnɔːrməs/', syl=['e', 'nor', 'mous'], stress=1)]),
             pops=[dict(id='drill', text='very big -> enormous /ɪˈnɔːrməs/')])
    fr = [(1.0, [dict(name='pop.drill', x0=90, y0=270, x1=830, y1=650, alpha=1.0), dict(name='cap.p0', x0=200, y0=1380, x1=880, y1=1470, alpha=1.0)])]
    BK = {'enormous': '/ɪˈnɔːrməs/'}
    R = overlay_gates(T, fr, SAFE, '.', bank=BK); assert all(r['ok'] for r in R.values()), R
    bad = json.loads(json.dumps(T)); bad['overlay']['pops']['drill']['states'][0]['pairs'].append(dict(name='dim', fg=dim, bg=card))
    assert not overlay_gates(bad, fr, SAFE, '.', bank=BK)['overlay_contrast']['ok']
    bad = json.loads(json.dumps(T)); bad['overlay']['pops']['drill']['states'][0]['boxes'].append(dict(name='x', box=[350, 60, 500, 120]))
    assert not overlay_gates(bad, fr, SAFE, '.', bank=BK)['overlay_layout']['ok']
    fr2 = [(1.0, fr[0][1] + [dict(name='cap.p1', x0=100, y0=600, x1=400, y1=700, alpha=1.0)])]
    assert not overlay_gates(T, fr2, SAFE, '.', bank=BK)['overlay_layout']['ok']
    fr3 = [(1.0, [dict(name='pop.drill', x0=20, y0=270, x1=830, y1=650, alpha=1.0)])]
    assert not overlay_gates(T, fr3, SAFE, '.', bank=BK)['overlay_layout']['ok']
    bad = json.loads(json.dumps(T)); bad['overlay']['ipa'][0]['stress'] = 0
    assert not overlay_gates(bad, fr, SAFE, '.', bank=BK)['overlay_ipa']['ok']
    assert not overlay_gates(T, fr, SAFE, '.', bank={'enormous': '/ɪˈnɔːməs/'})['overlay_ipa']['ok']
    assert stress_index('/ˈdemənstreɪt/') == 0 and stress_index('/əbˈteɪn/') == 1 and stress_index('/sɪɡˈnɪfɪkənt/') == 1 and stress_index('/bɪɡ/') is None
    assert overlay_gates(dict(pops=[]), fr, SAFE, '.') == {}
    print('overlay_gates self-test: OK (contrast, inside-card overlap, caption overlap, SAFE, IPA bank, stress dot)')

if __name__ == '__main__' and '--test' in sys.argv: _test()
