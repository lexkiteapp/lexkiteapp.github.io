#!/usr/bin/env python3
"""Hook quote = the words the hook card puts in quotes (docs/VIDEO-TEMPLATES.md §9). ONE rule for every tpl1b lesson (gold2lesson.py writes it,
render_tpl.py falls back to it, scripts/test/tpl1b-pipeline.mjs checks every lesson):
  strong ('Never say:'): the learner's WRONG phrase, never a fragment that is itself correct ('gate is' was shown for 'The gate is change?').
    wrong line <= 8 words -> the whole wrong sentence ('The gate is change?'); longer -> the error span (every wrong-only word) + 1 word of context.
  soft ('Americans usually say:'): the NATURAL phrase from the key line: right line <= 4 words -> whole line; else the right-only span
    extended to the right to 3 words (stops at punctuation). A reviewed soft_quote ('key card') always wins.
error_words() = the words the quote must contain (the test checks them); underline() = which quote words get the red underline."""
import re, sys, json
def nrm(w): return re.sub(r"[^a-z0-9']", '', w.lower().replace('’', "'")).strip("'")
def toks(s): return s.strip().split()
def only_in(a, b):
    bs = {nrm(x) for x in b}; return [i for i, x in enumerate(a) if nrm(x) and nrm(x) not in bs]
def error_words(wrong, right, mode='strong'):
    w, r = toks(wrong), toks(right)
    return [w[i] for i in only_in(w, r)] if mode == 'strong' else [r[i] for i in only_in(r, w)]
def hook_quote(wrong, right, mode='strong'):
    w, r = toks(wrong), toks(right)
    if mode == 'strong':
        if len(w) <= 8: return ' '.join(w)
        e = only_in(w, r)
        if not e:   # omission error (a word is missing): the 2 words around the first difference
            import difflib
            op = next(o for o in difflib.SequenceMatcher(None, [nrm(x) for x in w], [nrm(x) for x in r]).get_opcodes() if o[0] != 'equal')
            a = max(0, op[1] - 1); return ' '.join(w[a:a + 2]).strip(',;:')
        a, b = max(0, e[0] - 1), min(len(w), e[-1] + 1)
        return ' '.join(w[a:b]).strip(',;:')
    if len(r) <= 4: return ' '.join(r).rstrip('.')
    e = only_in(r, w)
    if not e: return ' '.join(r).rstrip('.')
    a, b = e[0], e[-1] + 1
    while b - a < 3 and b < len(r) and not re.search(r'[,.;:!?]$', r[b - 1]): b += 1
    return ' '.join(r[a:b]).strip(',.;:')
def underline(quote, wrong, right, mode='strong'):
    """indices of quote words to underline: the error words (strong) / the natural words (soft)"""
    ew = {nrm(x) for x in error_words(wrong, right, mode)}; return [i for i, x in enumerate(toks(quote)) if nrm(x) in ew]
if __name__ == '__main__':   # python3 hookquote.py "<wrong>" "<right>" [strong|soft]
    print(json.dumps(dict(quote=hook_quote(sys.argv[1], sys.argv[2], *(sys.argv[3:4] or ['strong'])))))
