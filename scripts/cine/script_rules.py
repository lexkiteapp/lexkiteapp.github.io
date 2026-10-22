#!/usr/bin/env python3
"""script_rules.py - deterministic pedagogy / graded-language gates for news lesson scripts (owner 22/10, VIDEO-SCALE-PLAN §12-14).
  python3 scripts/cine/script_rules.py <lesson.json> [lines.json]   -> prints issues, exit 1 if any
Used by gen_news.py (--check) and qa_news.py. v7 specs (teacher persona) only; older specs return [] (legacy).
Rules: one idea (one key line) · wrong -> right + why (<= 12 words) · 'Pause and guess' before the reveal · 'Repeat after me' (slow) then natural ·
key line said + shown + repeated (>= 3x) · concept-check question · 'Many learners say' (never a country) · explanation sentences <= 12 words ·
explanation vocabulary <= B1 (Oxford B2/C1 list = fail; target phrases excluded) · difficulty badge · hook type · share trigger · end quiz · Teacher's tip 3-5 lines."""
import json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OX = {k: v for k, v in json.load(open(f'{ROOT}/content/wordlists/cefr-oxford.json')).items()}
HARD = {w for w, v in OX.items() if any(str(x).upper() in ('B2', 'C1', 'C2') for x in (v.values() if isinstance(v, dict) else [v]))}
COUNTRY = re.compile(r'\b(vietnam|vietnamese|china|chinese|japan|japanese|korea|korean|india|indian|spanish|spain|brazil|brazilian|arab|arabic|russian|russia|thai|french|german|turkish|indonesian|filipino|mexican)\b', re.I)
HOOKS = {'question', 'mistake_callout', 'challenge', 'myth', 'pov', 'quiz', 'contrast', 'number_list', 'secret_tip', 'story', 'surprise', 'fill_gap', 'listen_diff', 'native_says'}
toks = lambda t: re.findall(r"[a-z']+", t.lower())
def lemma_hard(w):
    for c in (w, w.rstrip('s'), w[:-2] if w.endswith('es') else w, w[:-2] if w.endswith('ed') else w, w[:-1] if w.endswith('d') else w, w[:-3] if w.endswith('ing') else w, w[:-3] + 'e' if w.endswith('ing') else w):
        if c in HARD: return c
    return None
def check(sp, L):
    if sp.get('v') != 7: return []
    T = lambda i: (L.get(i) or {}).get('text', ''); iss = []; bs = sp['beats']; kinds = [b.get('kind') for b in bs]; key = sp['key_line']
    target = set(toks(key) + toks(sp.get('wrong_line', '')) + [w for r in sp['recap']['rows'] for w in toks(r)])
    if not key or not sp.get('wrong_line'): iss.append('one idea: key_line + wrong_line required')
    for need in ('m', 'g', 'k', 'y', 'c', 'rs'):
        if need not in kinds: iss.append(f'missing beat {need} (mistake/guess/reveal/why/check/repeat)')
    if 'g' in kinds and 'k' in kinds and kinds.index('g') > kinds.index('k'): iss.append("'Pause and guess' must come before the reveal")
    if not any(b.get('guess') for b in bs): iss.append('guess beat needs a pause')
    spoken = sum(key.lower().rstrip('.') in T(b['line']).lower() for b in bs); shown = sum(key.lower().rstrip('.') in ((b.get('card') or {}).get('text') or '').lower() for b in bs)
    if spoken < 2 or shown < 1: iss.append(f'key line said {spoken}x / shown {shown}x (need say + show + repeat)')
    m = next((T(b['line']) for b in bs if b.get('kind') == 'm'), '')
    if 'many learners say' not in m.lower(): iss.append("mistake must be phrased 'Many learners say ...'")
    why = next((T(b['line']) for b in bs if b.get('kind') == 'y'), '')
    if len(toks(why)) > 12: iss.append(f'why > 12 words: {why}')
    if '?' not in next((T(b['line']) for b in bs if b.get('kind') == 'c'), ''): iss.append('concept-check question missing')
    lines = [T(sp['hook']['line']), T(sp['end_line'])] + [T(b['line']) for b in bs] + [T(sp['recap']['line'])]
    for ln in lines:
        if COUNTRY.search(ln): iss.append(f'names a country / nationality: {ln}')
        for sent in re.split(r'(?<=[.!?])\s+', ln):
            body = re.sub(r'^(say|repeat after me|natural speed|many learners say)[^:]*:\s*', '', sent, flags=re.I)
            if len(toks(sent)) > 12 and body.lower().strip(' .') not in key.lower(): iss.append(f'sentence > 12 words: {sent}')
        hard = sorted({lemma_hard(w) for w in toks(ln) if w not in target and lemma_hard(w)})
        if hard: iss.append(f'above-B1 words outside the target phrase {hard}: {ln}')
    if sp.get('difficulty') not in ('easy', 'medium', 'hard'): iss.append('difficulty badge missing')
    if sp.get('hook_type') not in HOOKS: iss.append(f"hook type {sp.get('hook_type')} not in the library")
    if len(toks(T(sp['hook']['line']))) > 5: iss.append('hook > 5 spoken words')
    if not sp.get('share'): iss.append('share trigger missing')
    if 'comment' not in T(sp['end_line']).lower() or '?' not in T(sp['end_line']): iss.append('end must be an open question / quiz for comments')
    if not 3 <= len(sp['recap']['rows']) <= 5 or sp['recap'].get('title', '').upper() != "TEACHER'S TIP": iss.append("Teacher's tip card needs 3-5 ready-to-use lines")
    return iss
if __name__ == '__main__':
    sp = json.load(open(sys.argv[1])); L = {l['id']: l for l in json.load(open(sys.argv[2] if len(sys.argv) > 2 else f'{ROOT}/content/video/cine/news/lines.json'))['lines']}
    r = check(sp, L); print('\n'.join(r) or 'OK'); sys.exit(1 if r else 0)
