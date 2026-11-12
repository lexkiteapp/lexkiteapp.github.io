#!/usr/bin/env python3
"""Teach2D bridge: banked episode -> autopub_gate.py -> lexkite-shorts store + shorts/index.json (docs/specs/video-autopublish.md §2.2).
Blocked clips stay out of the store; the reasons go to the delta (`publish_block`), then bank.json and PUBLISH.md (bank.py merge). Idempotent per video sha.
Reaching the store publishes nothing: posts wait for a person until cfg.autopub is on for that platform (functions/api/_social_auto.js canAutoApprove).
  store.py <art_dir> <bank_dir> <delta.json> <shorts_checkout> <run> [sha]"""
import glob, json, os, shutil, subprocess, sys, time
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..')); sys.path[:0] = [HERE, f'{ROOT}/scripts/cine']
import autopub_gate as GATE   # noqa: E402
import shorts_index   # noqa: E402
EPS = f'{ROOT}/content/video/teach2d/eps'


def base_of(ep): return 'teach2d-' + ep.replace('_', '-')


def qc_of(art, ep):
    return {fm: json.load(open(f)) for fm in ('short', 'wide') for f in glob.glob(f'{art}/tv-{ep}-{fm}-*/qc.json')[:1]}


def levels():
    W = json.loads(subprocess.run(['node', f'{HERE}/facts.mjs', 'bank'], capture_output=True, text=True, check=True, cwd=ROOT).stdout)['words']
    return {w: r.get('cefr') for w, r in W.items()}


def posted_of(repo):
    p = f'{repo}/shorts/index.json'; items = json.load(open(p)).get('items', []) if os.path.exists(p) else []
    return [dict(id=i.get('lesson'), sha=i.get('sha') or {}, title=i.get('title')) for i in items if i.get('scene') == 'teach2d']


def store_one(repo, ep, r, qc, cefr, bank_dir, run, sha):
    id_ = ep['id']; base = base_of(id_); rel = f'shorts/teach2d/{id_}'; d = f'{repo}/{rel}'; os.makedirs(d, exist_ok=True); mp = f'{d}/meta.json'
    meta = json.load(open(mp)) if os.path.exists(mp) else dict(scene='teach2d', lesson=id_, renders={})
    if (meta['renders'].get(base) or {}).get('index', {}).get('sha') == r['sha']: return None   # same videos already stored
    files = dict(video=(f'{id_}-short.mp4', f'{base}.mp4'), wide=(f'{id_}-wide.mp4', f'{base}-wide.mp4'), cover=(f'{id_}-poster.jpg', f'{base}.jpg'))
    for src, dst in files.values(): shutil.copy2(f'{bank_dir}/{src}', f'{d}/{dst}')
    pub = ep['publish']; now = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    gates = sorted({k for q in qc.values() for k in q['gates']})
    index = dict(format='teach2d', template=ep['template'], series=ep.get('series') or '', area=ep['area'], cefr=cefr, lang=ep.get('lang') or 'en', point=pub['keyword'], title=pub['title'], description=pub['value'], hashtags=pub['hashtags'],
                 publish=pub, link=ep['cta']['link'], teacher=ep['teacher'], sha=r['sha'], wide=f'{rel}/{base}-wide.mp4', qa=dict(status='pass', score=min(q['score'] for q in qc.values()), gates=gates))
    meta['renders'][base] = dict(run=run, sha=sha, duration=ep['est']['seconds'], bytes=os.path.getsize(f'{d}/{base}.mp4'), qa='ALL PASS', created=now, video=f'{rel}/{base}.mp4', cover=f'{rel}/{base}.jpg', index=index)
    json.dump(meta, open(mp, 'w'), indent=1, ensure_ascii=False)
    return shorts_index.entry('teach2d', id_, base, meta['renders'][base], '', now)


def run_store(art, bank_dir, delta, repo, run, sha='', level_map=None):
    D = json.load(open(delta)); L = level_map if level_map is not None else levels(); A = GATE.areas(); posted = posted_of(repo); new = []
    for id_, r in D.items():
        if r.get('state') != 'banked': continue
        ep = json.load(open(f'{EPS}/{id_}.json')); qc = qc_of(art, id_); g = GATE.gate(ep, r, qc, L, A, posted)
        if not g['ok']: r['publish_block'] = g['why']; print('blocked', id_, g['why']); continue
        r.pop('publish_block', None); e = store_one(repo, ep, r, qc, g['cefr'], bank_dir, run, sha)
        posted.append(dict(id=id_, sha=r['sha'], title=ep['publish']['title']))
        if e: new.append(e); print('stored', id_)
    json.dump(D, open(delta, 'w'), indent=1)
    if new: print('index', shorts_index.update(repo, new), len(new))
    return new


if __name__ == '__main__':
    a = sys.argv[1:]
    if len(a) < 5: sys.exit(__doc__)
    run_store(a[0], a[1], a[2], a[3], int(a[4]), a[5] if len(a) > 5 else '')
