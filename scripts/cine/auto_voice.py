#!/usr/bin/env python3
"""CI step (cine-render): make the generated lessons renderable inside the footage scene dir, then synthesise ONLY the missing voice lines.
  python3 scripts/cine/auto_voice.py <scene_dir> <scene>
1. copies content/video/cine/auto/<scene>/*.py into <scene_dir>/lessons/ and *.en.json into content/video/cine/locales/
2. merges auto/<scene>/lines.json into <scene_dir>/ci/lines.json (replaces the symlink with a merged copy; existing ids win)
3. Kokoro (scripts/cine/tts.mjs) + Rhubarb 1.13 for every line without vis3/<id>.wav -> vis3/<id>.wav + .json (copies kept in out/voices/ for the footage backup)
4. 'auto-gap' lines: prefix TTS gives the onset of the sentence-final word -> snapped to a Rhubarb cue start; the cut ends at the final silence -> mkgap.py
Needs env KOKORO_NODE_PATH and RHUBARB (installed by the workflow). 0 credits."""
import json, os, sys, glob, shutil, subprocess
SD, SC = sys.argv[1], sys.argv[2]; ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
A = f'{ROOT}/content/video/cine/auto/{SC}'; VIS = f'{SD}/vis3'; OUTV = f'{ROOT}/out/voices'; os.makedirs(OUTV, exist_ok=True)
if not os.path.isdir(A): print('no auto lessons for', SC); sys.exit(0)
for f in glob.glob(f'{A}/*.py'): shutil.copy(f, f'{SD}/lessons/')
for f in glob.glob(f'{A}/*.en.json'): shutil.copy(f, f'{ROOT}/content/video/cine/locales/')
lp = f'{SD}/ci/lines.json'; base = json.load(open(lp)); have = {l['id'] for l in base['lines']}
new = [l for l in json.load(open(f'{A}/lines.json'))['lines'] if l['id'] not in have]; base['lines'] += new
if os.path.islink(lp): os.unlink(lp)
json.dump(base, open(lp, 'w'), ensure_ascii=False, indent=1)
todo = [l for l in base['lines'] if not l.get('derived') and not os.path.exists(f'{VIS}/{l["id"]}.wav')]
gaps = [l for l in base['lines'] if l.get('derived') == 'auto-gap' and not os.path.exists(f'{VIS}/{l["id"]}.wav')]
pre = [dict(id=l['id'] + '__pre', who=l['who'], text=l['gap']['prefix']) for l in gaps]
print(f'{len(new)} new line(s) merged; synthesising {len(todo)} + {len(pre)} gap prefix(es)')
if todo or pre:
    tmp = f'{ROOT}/out/tts_in.json'; json.dump(dict(voices=base['voices'], speed=base.get('speed', 0.9), lines=todo + pre), open(tmp, 'w'))
    W = f'{ROOT}/out/tts_wav'; subprocess.run(['node', f'{ROOT}/scripts/cine/tts.mjs', tmp, W], check=True)
    R = os.environ['RHUBARB']
    for l in todo + pre:
        w, j = f'{W}/{l["id"]}.wav', f'{VIS}/{l["id"]}.json'
        for rec in ([], ['-r', 'phonetic']):
            if subprocess.run([R, '-q', *rec, '--extendedShapes', 'GHX', '-f', 'json', '-d', f'{W}/{l["id"]}.txt', '-o', j, w]).returncode == 0: break
        else: sys.exit(f'rhubarb failed: {l["id"]}')
        shutil.copy(w, f'{VIS}/'); shutil.copy(w, OUTV); shutil.copy(j, OUTV)
dur = lambda p: float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]))
for l in gaps:
    g = l['gap']; src = json.load(open(f'{VIS}/{g["src"]}.json'))['mouthCues']; d = dur(f'{VIS}/{l["id"]}__pre.wav') - 0.06   # prefix speech end ~ onset of the last word
    st = [c['start'] for c in src if c['start'] > 0.3]; c0 = min(st, key=lambda t: abs(t - d))
    last_x = [c for c in src if c['value'] == 'X'][-1]['start']; c1 = round(min(last_x + 0.04, dur(f'{VIS}/{g["src"]}.wav') - 0.03), 3)
    print(f'gap {l["id"]}: word "{g["word"]}" onset est {d:.3f} -> cue {c0:.3f}, cut end {c1:.3f}')
    subprocess.run([sys.executable, f'{ROOT}/scripts/cine/mkgap.py', g['src'], l['id'], g['word'], f'{c0:.3f}', f'{c1:.3f}', '0.6'], check=True, env=dict(os.environ, CINE_SCENE_DIR=SD))
    for x in ('wav', 'json'): shutil.copy(f'{VIS}/{l["id"]}.{x}', OUTV)
