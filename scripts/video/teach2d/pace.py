#!/usr/bin/env python3
"""Teach2D pace (docs/VIDEO-TEACH2D.md): syllables per second of a spoken line (word clock), shared by the voice re-pace step and qc.py.
  python3 scripts/video/teach2d/pace.py <lines.json> <vo_dir>   (CI voice job) -> lines to voice again: >= 5 words faster than TARGET syl/s
  (Kokoro speed x TARGET/rate, floor 0.6) or a bad word clock (whisper heard < 0.9 of the script letters / > 2 tokens interpolated, speed x 0.96).
  Deletes their voice files and writes the new speed into lines.json; exit 3 when nothing to do. qc.py re-checks the result."""
import difflib, json, os, re, sys
TARGET, MAX = 4.6, 5.0
norm = lambda x: re.sub(r"[^a-z0-9']", '', x.lower().replace('’', "'"))
def syl(w): return max(1, len(re.findall(r'[aeiouy]+', re.sub(r'(?<=[^aeiou])e$', '', norm(w)))))   # vowel groups, silent final e
def _ratio(a, b): return round(sum(m.size for m in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks()) / max(1, len(a)), 2)
def homophones(script, heard_words):   # whisper writes the spelling it knows best: 'Know.' -> 'no'. Same audited US IPA as a script word = the script word was heard
    sw = [norm(w) for w in script.split()]; hw = [norm(w) for w in heard_words]; odd = [w for w in hw if w and w not in sw]
    if not odd: return hw
    sys.path.insert(0, os.path.abspath(f'{os.path.dirname(os.path.abspath(__file__))}/../tpl')); from overlay_gates import bank_ipa
    root = os.path.abspath(f'{os.path.dirname(os.path.abspath(__file__))}/../../..'); I = bank_ipa(set(odd) | set(sw), root)
    def silent(s):   # the word with its rules.json silent letter dropped ('knight' -> 'night'): same sound without needing an IPA row
        for r in json.load(open(f'{root}/content/video/teach2d/rules.json'))['rules']:
            m = re.search(r['pattern'], s) if r.get('kind') == 'silent' else None
            if m and m.group('s'): return s[:m.start('s')] + s[m.end('s'):]
    return [next((s for s in sw if (I.get(s) == I.get(w) if I.get(s) and I.get(w) else silent(s) == w)), w) if w in odd else w for w in hw]
def heard(text, whisper):   # share of the script letters found in what whisper heard (whisper may repeat the prompt, splits 'U.S.'; a homophone counts as heard)
    a, b = ''.join(norm(w) for w in text.split()), ''.join(norm(w) for w in whisper.split())
    r = _ratio(a, b)
    if r >= 0.9: return r
    try: return max(r, _ratio(a, ''.join(homophones(text, whisper.split()))))
    except Exception: return r
def rate(words): return round(sum(syl(w['w']) for w in words) / max(0.3, words[-1]['e'] - words[0]['s']), 2)
if __name__ == '__main__':
    src, vo = sys.argv[1], sys.argv[2]; J = json.load(open(src)); n = 0
    for l in J['lines']:
        wj = json.load(open(f"{vo}/vis3/{l['id']}.words.json")); ws = wj['words']; r = rate(ws); sp = l.get('speed') or J['speed']
        if len(ws) >= 5 and r > TARGET: new, why = max(0.6, min(sp, J['speed']) * TARGET / r), f'{r} syl/s'
        elif heard(l['text'], wj.get('whisper', '')) < 0.9 or wj.get('interpolated', 0) > 2: new, why = max(0.6, sp * 0.96), f"clock heard {heard(l['text'], wj.get('whisper', ''))} interp {wj.get('interpolated')}"
        else: continue
        l['speed'] = round(new, 3); n += 1
        for ext in ('wav', 'json', 'words.json'):
            f = f"{vo}/vis3/{l['id']}.{ext}"
            if os.path.exists(f): os.remove(f)
        print(f"re-voice {l['id']}: {why} -> speed {l['speed']}")
    json.dump(J, open(src, 'w'), indent=1); print(n, 'lines re-paced')
    sys.exit(0 if n else 3)   # 3 = nothing to do
