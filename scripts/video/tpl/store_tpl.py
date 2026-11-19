#!/usr/bin/env python3
"""Store ACCEPTED template-1b renders like every other short (docs/VIDEO-STORAGE.md): lexkite-shorts shorts/tpl1b/<lesson>/ (git keeps
meta/qc/rubric, mp4 + cover go to the Drive pool via scripts/cine/archive_new.sh) + shorts/index.json entry → Admin › Video › "Chờ duyệt"
(qa.status pass, queue 'ready'). NOTHING is published: YouTube/social stay a manual admin action until the owner approves the first batch.
  python3 scripts/video/tpl/store_tpl.py <batch-dir> <shorts-checkout> <run-number> [sha]
<batch-dir>/accepted.txt = "<lesson-id> <video.mp4>" lines (rubric accept + batch host gate)."""
import sys, os, json, shutil, hashlib, datetime, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, f'{ROOT}/scripts/cine')
import shorts_index
bd, repo, run = sys.argv[1], sys.argv[2], int(sys.argv[3]); sha = sys.argv[4] if len(sys.argv) > 4 else ''
GI = '# recipe-first storage: media lives on the Drive pool (docs/VIDEO-STORAGE.md)\n*.mp4\n*.jpg\n*.webp\n*.wav\n'
if not os.path.exists(f'{repo}/.gitignore') or '*.mp4' not in open(f'{repo}/.gitignore').read(): open(f'{repo}/.gitignore', 'a').write(GI)
now = datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'); entries = []
sha256 = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
for ln in open(f'{bd}/accepted.txt'):
    if not ln.strip(): continue
    lid, mp4 = ln.split()[:2]; T = json.load(open(mp4 + '.timeline.json')); RB = json.load(open(mp4 + '.rubric.json'))
    base = 'tpl1b-' + lid[len('tpl1b_'):].replace('_', '-') + '-en'
    d = f'{repo}/shorts/tpl1b/{lid}'; os.makedirs(d, exist_ok=True)
    shutil.copy2(mp4, f'{d}/{base}.mp4')
    cov = mp4 + '.cover.jpg'
    if os.path.exists(cov): shutil.copy2(cov, f'{d}/{base}.jpg')
    for ext in ('qc.json', 'rubric.json'): shutil.copy2(f'{mp4}.{ext}', f'{d}/{base}.{ext}')
    dur = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4]))
    lz = T['lesson']; hk = lz.get('hook') or {}
    mp = f'{d}/meta.json'; meta = json.load(open(mp)) if os.path.exists(mp) else {}
    meta.update(scene='tpl1b', lesson=lid, template='tpl1b')
    r = dict(run=run, sha=sha, duration=dur, bytes=os.path.getsize(mp4), qa='ALL PASS', created=now, video=f'shorts/tpl1b/{lid}/{base}.mp4',
             cover=f'shorts/tpl1b/{lid}/{base}.jpg' if os.path.exists(cov) else None, recipe=None, master_sha256=sha256(mp4),
             score=RB['score'], host=T.get('host_name'), plate=(T.get('plate') or {}).get('name'), hook_mode=hk.get('mode'), fix=lz.get('fix'),
             **{k: meta[k] for k in ('rejected', 'paused') if meta.get(k)})
    meta.setdefault('renders', {})[base] = r
    json.dump(meta, open(mp, 'w'), indent=1, ensure_ascii=False)
    e = shorts_index.entry('tpl1b', lid, base, r, 'TPL1B qc_tpl + rubric\n== RESULT: ALL PASS', now, {}, {})
    e.update(format='news', template='tpl1b', area=lz.get('area') or '', point=f"{lz.get('wrong')} → {lz.get('right')}", series=(T.get('plate') or {}).get('name') or '',
             queue='ready', host=r['host'], hook_mode=r['hook_mode'], cta=(T.get('cta') or {}).get('link'))
    e['qa'].update(score=RB['score'], points=RB['points'], lufs=RB.get('lufs'))
    entries.append(e); print(f"stored tpl1b/{lid}/{base} score {RB['score']} ({os.path.getsize(mp4) // 1000} kB)")
if entries: print('index', shorts_index.update(repo, entries), len(entries))
