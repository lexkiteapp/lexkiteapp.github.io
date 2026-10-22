#!/usr/bin/env python3
"""CI step for scene=news: voices for generated news lessons (0 credits).
  python3 scripts/cine/news_voice.py <NEWS_DIR> <lesson-id,...>
NEWS_DIR/ci/lines.json (from content/video/cine/news/lines.json) -> for every line used by the given lessons and missing vis3/<id>.wav:
Kokoro (tts.mjs) -> Rhubarb 1.13 (vis3/<id>.json) -> faster-whisper word timings aligned to the EXACT caption tokens (vis3/<id>.words.json:
whisper order + times, tokens whisper missed are interpolated between neighbours). Env: KOKORO_NODE_PATH, RHUBARB."""
import json, os, re, sys, shutil, subprocess, difflib
ND, IDS = sys.argv[1], sys.argv[2].split(','); ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
V = f'{ND}/vis3'; os.makedirs(V, exist_ok=True)
base = json.load(open(f'{ND}/ci/lines.json')); need = set()
for i in IDS:
    sp = json.load(open(f'{ND}/lessons/{i}.json')); need |= {sp['hook']['line'], sp['recap']['line'], sp['end_line'], sp['recap'].get('line_alt'), sp.get('end_alt')} - {None} | {b['line'] for b in sp['beats']} | {x for v in base.get('reactions', {}).values() for x in v}   # listener reaction lines (news_tpl picks them)
todo = [l for l in base['lines'] if l['id'] in need and not os.path.exists(f'{V}/{l["id"]}.wav')]
print(f'{len(need)} lines needed, synthesising {len(todo)}')
def synth(todo, tag):
    tmp = f'{ND}/tts_in_{tag}.json'; W = f'{ND}/tts_wav_{tag}'; json.dump(dict(voices=base['voices'], speed=base.get('speed', 0.92), lines=todo), open(tmp, 'w'))
    subprocess.run(['node', f'{ROOT}/scripts/cine/tts.mjs', tmp, W], check=True)
    for l in todo:
        w, j = f'{W}/{l["id"]}.wav', f'{V}/{l["id"]}.json'
        for rec in ([], ['-r', 'phonetic']):
            if subprocess.run([os.environ['RHUBARB'], '-q', *rec, '--extendedShapes', 'GHX', '-f', 'json', '-d', f'{W}/{l["id"]}.txt', '-o', j, w]).returncode == 0: break
        else: sys.exit(f'rhubarb failed: {l["id"]}')
        shutil.copy(w, V)
def span(i): c = [x for x in json.load(open(f'{V}/{i}.json'))['mouthCues'] if x['value'] != 'X']; return c[-1]['end'] - c[0]['start']
if todo:
    synth(todo, 'a')
    # caption reading speed: news.py may slow a line by atempo >= 0.84x only; lines spoken too fast for <= 15 cps are re-synthesised slower (natural TTS pace, not stretched audio)
    redo = []
    for l in todo:
        nd = len(l['text']) / 14.0 - 0.5; sp = span(l['id'])
        if sp < 0.9 * nd: redo.append(dict(l, speed=round(max(0.7, (l.get('speed') or base.get('speed', 0.92)) * sp / (0.97 * nd)), 3)))
    if redo:
        print('re-synthesising slower:', [(l['id'], l['speed']) for l in redo]); synth(redo, 'b')
        for l in redo: print(f"  {l['id']} span {span(l['id']):.2f} s for {len(l['text'])} chars")
from faster_whisper import WhisperModel
M = WhisperModel('base.en', device='cpu', compute_type='int8'); norm = lambda x: re.sub(r"[^a-z0-9']", '', x.lower())
for l in base['lines']:
    if l['id'] not in need or os.path.exists(f'{V}/{l["id"]}.words.json'): continue
    toks = l['text'].split(); segs, _ = M.transcribe(f'{V}/{l["id"]}.wav', language='en', word_timestamps=True, initial_prompt=l['text'])
    hw = [w for s in segs for w in s.words]; a, b = [norm(x) for x in toks], [norm(w.word) for w in hw]
    T = [None] * len(toks)
    for blk in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks():
        for k in range(blk.size): T[blk.a + k] = (hw[blk.b + k].start, hw[blk.b + k].end)
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{V}/{l["id"]}.wav']))
    known = [i for i, t in enumerate(T) if t]; miss = len(toks) - len(known)
    for i in range(len(toks)):   # interpolate gaps by character share between the surrounding known words
        if T[i]: continue
        lo = max([k for k in known if k < i], default=None); hi = min([k for k in known if k > i], default=None)
        t0 = T[lo][1] if lo is not None else 0.05; t1 = T[hi][0] if hi is not None else dur - 0.05
        run = [k for k in range((lo + 1) if lo is not None else 0, hi if hi is not None else len(toks))]; tot = sum(len(toks[k]) for k in run); acc = sum(len(toks[k]) for k in run if k < i)
        T[i] = (t0 + (t1 - t0) * acc / tot, t0 + (t1 - t0) * (acc + len(toks[i])) / tot)
    for i in range(1, len(T)):   # strictly increasing starts
        if T[i][0] <= T[i - 1][0]: T[i] = (T[i - 1][0] + 0.05, max(T[i][1], T[i - 1][0] + 0.1))
    json.dump(dict(words=[dict(w=w, s=round(t[0], 3), e=round(t[1], 3)) for w, t in zip(toks, T)], whisper=' '.join(w.word.strip() for w in hw), interpolated=miss),
              open(f'{V}/{l["id"]}.words.json', 'w'))
    print(f'{l["id"]:28s} words {len(toks)} interp {miss}' + ('  WARN' if miss > 1 else ''))
