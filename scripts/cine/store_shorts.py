#!/usr/bin/env python3
"""Copy PASSED cine renders into the durable store (private repo lexkiteapp/lexkite-shorts, see infra/resources.json 'cine-shorts-store').

store_shorts.py <out-dir> <shorts-checkout> <run-number> [sha]
  <out-dir> = cine-render output (out/*.mp4, out/covers/*.jpg, out/qa/qa_<render>.log + timeline_<render>.json).
  Passed renders = out/passed.txt lines "<scene> <lesson-id> <render-dir>" (written by cine-render.yml when qa5 exits 0);
  without passed.txt (backfill from old artifacts) = every qa_<render>.log whose last line is '== RESULT: ALL PASS'.
Layout: shorts/<scene>/<lesson-id>/<cine-…>.mp4 + .jpg + qa.log + timeline.json + meta.json. A newer passed render of the
same lesson/lang/suffix overwrites the older one (git history keeps it). Prints one line per stored render.
"""
import glob, json, os, re, shutil, subprocess, sys

out, repo, run = sys.argv[1], sys.argv[2], int(sys.argv[3]); sha = sys.argv[4] if len(sys.argv) > 4 else ''
SCENES = ('hotel', 'cafe', 'airport', 'restaurant', 'anchor')
rows = []
if os.path.exists(f'{out}/passed.txt'):
    rows = [l.split() for l in open(f'{out}/passed.txt') if l.strip()]
else:
    for q in sorted(glob.glob(f'{out}/qa/qa_render5_*.log')):
        lines = [l for l in open(q, errors='replace').read().splitlines() if l.strip()]
        if not lines or lines[-1].strip() != '== RESULT: ALL PASS': continue
        rb = os.path.basename(q)[3:-4]; m = re.match(r'render5_(.+?)_([a-z]{2,3}(?:_[a-z]+)?)(_v\d+.*)?$', rb)
        lid = m.group(1) if m else rb[8:]
        sc = lid.split('_')[1] if lid.startswith('auto_') else next((s for s in SCENES if lid.startswith(s)), 'misc')
        rows.append([sc, lid, rb])
for sc, lid, rb in rows:
    if not re.fullmatch(r'[a-z0-9_]+', sc + lid + rb): print('skip (bad name)', sc, lid, rb); continue
    base = 'cine-' + rb[len('render5_'):].replace('_', '-'); mp4 = f'{out}/{base}.mp4'
    if not os.path.exists(mp4): print('skip (no mp4)', base); continue
    d = f'{repo}/shorts/{sc}/{lid}'; os.makedirs(d, exist_ok=True)
    shutil.copy2(mp4, f'{d}/{base}.mp4')
    cov = f'{out}/covers/{base}.jpg'
    if os.path.exists(cov): shutil.copy2(cov, f'{d}/{base}.jpg')
    for src, dst in ((f'{out}/qa/qa_{rb}.log', f'{base}.qa.log'), (f'{out}/qa/timeline_{rb}.json', f'{base}.timeline.json')):
        if os.path.exists(src): shutil.copy2(src, f'{d}/{dst}')
    try: dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]))
    except Exception: dur = None
    mp = f'{d}/meta.json'; meta = json.load(open(mp)) if os.path.exists(mp) else {}
    meta.update(scene=sc, lesson=lid)
    meta.setdefault('renders', {})[base] = dict(run=run, sha=sha, duration=dur, bytes=os.path.getsize(mp4), qa='ALL PASS',
                                              video=f'shorts/{sc}/{lid}/{base}.mp4', cover=f'shorts/{sc}/{lid}/{base}.jpg' if os.path.exists(cov) else None)
    json.dump(meta, open(mp, 'w'), indent=1, ensure_ascii=False)
    print(f'stored {sc}/{lid}/{base} (run {run}, {os.path.getsize(mp4) // 1000} kB)')
