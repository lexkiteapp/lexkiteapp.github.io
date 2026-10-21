#!/usr/bin/env python3
"""Manifest of stored cine shorts for the admin "🎬 Video" tab (functions/api/admin-shorts.js, web/js/admin-video.js).

Entries are built from lexkite-shorts meta.json + qa log (store_shorts.py) and merged with the public publish pack
(content/video/cine/publish/<lesson>.json) + calendar slot. No media, no secrets: paths only.

  shorts_index.py full <shorts-dir> [--runs runs.json] [--sizes sizes.json]
      rebuild <shorts-dir>/shorts/index.json from every shorts/*/*/meta.json (backfill; sizes.json = {path: bytes} from the git tree
      when the checkout has no media, runs.json = {run_number: ISO date} from the cine-render workflow runs)
  shorts_index.py public <index.json>
      write the admin bundle functions/api/_shorts_data.js (index + coverage + calendar + credits summary), served only behind adminGate
store_shorts.py calls entry()/update() for the incremental CI path (sparse checkout: previous index read with `git show`).
"""
import glob, json, os, re, subprocess, sys, datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
CINE = os.path.join(ROOT, 'content', 'video', 'cine')


def qa_metrics(text):
    """Key numbers from a qa5 log: result, checks OK/FAIL, worst lip-sync onset error, max caption cps."""
    lines = [l for l in (text or '').splitlines() if l.strip()]
    err = [int(x) for x in re.findall(r'max\|err\|\s*(\d+)\s*ms', text or '')]
    cps = [float(x) for x in re.findall(r'\bcps\s+([\d.]+)', text or '')]
    return dict(result=(lines[-1].replace('== RESULT:', '').strip() if lines and 'RESULT' in lines[-1] else None),
                ok=sum(1 for l in lines if l.rstrip().endswith(' OK')), fail=sum(1 for l in lines if re.search(r'\bFAIL\b', l)),
                lipsync_ms=max(err) if err else None, cps_max=max(cps) if cps else None,
                sections=len([l for l in lines if l.startswith('== ') and 'RESULT' not in l]))


def _calendar():
    try: return {p['id']: p for p in json.load(open(os.path.join(CINE, 'publish', 'calendar.json'))).get('posts', [])}
    except Exception: return {}


def entry(scene, lesson, base, r, qa_text='', created=None, sizes=None, cal=None):
    pack_p = os.path.join(CINE, 'publish', lesson + '.json')
    pack = json.load(open(pack_p)) if os.path.exists(pack_p) else {}
    tpl = pack.get('template') or (lesson.split('_')[2] if lesson.startswith('auto_') and lesson.count('_') >= 3 else 'manual')
    fmt = 'news' if scene == 'anchor' or tpl.startswith('news') else 'scene'
    slot = (cal or {}).get(lesson)
    m = re.search(r'-([a-z]{2,3})(?:-v\d+.*)?$', base)
    sizes = sizes or {}
    return dict(id=base, lesson=lesson, scene=scene, format=fmt, template=tpl, area=pack.get('area') or '', cefr=pack.get('cefr') or '',
                point=pack.get('point') or '', series=pack.get('series') or '', lang=m.group(1) if m else 'en',
                title=pack.get('title') or '', description=pack.get('description') or '', hashtags=pack.get('hashtags') or [],
                duration=r.get('duration'), qa=dict(status='pass' if (r.get('qa') or '').upper().startswith('ALL PASS') else 'fail', **qa_metrics(qa_text)),
                run=r.get('run'), created=created, bytes=r.get('bytes') or sizes.get(r.get('video')),
                cover_bytes=sizes.get(r.get('cover')) if r.get('cover') else None, video=r.get('video'), cover=r.get('cover'),
                slot=dict(n=slot['n'], date=slot['date'], time=slot['time'], tz=slot.get('tz')) if slot else None, packed=bool(pack),
                rejected=r.get('rejected'), paused=r.get('paused'))   # owner flags (meta.json, copied per render): admin shows them, nothing schedules them


def write(path, items):
    items = sorted(items, key=lambda e: (e.get('created') or '', e['id']), reverse=True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(dict(version=1, updated=datetime.datetime.utcnow().strftime('%Y-%m-%dT%H:%M:%SZ'), count=len(items), items=items),
              open(path, 'w'), indent=1, ensure_ascii=False)


def update(repo, new):
    """CI: merge freshly stored entries into shorts/index.json (sparse checkout → previous version via git show)."""
    p = os.path.join(repo, 'shorts', 'index.json')
    try: old = json.loads(subprocess.check_output(['git', '-C', repo, 'show', 'HEAD:shorts/index.json'], stderr=subprocess.DEVNULL))
    except Exception: old = json.load(open(p)) if os.path.exists(p) else {}
    by = {e['id']: e for e in old.get('items', [])}
    for e in new: by[e['id']] = e
    write(p, by.values())
    return p


def full(repo, runs=None, sizes=None):
    cal, items = _calendar(), []
    for mp in sorted(glob.glob(os.path.join(repo, 'shorts', '*', '*', 'meta.json'))):
        meta = json.load(open(mp)); d = os.path.dirname(mp)
        for base, r in (meta.get('renders') or {}).items():
            qp = os.path.join(d, base + '.qa.log'); qa = open(qp, errors='replace').read() if os.path.exists(qp) else ''
            created = r.get('created') or (runs or {}).get(str(r.get('run')))
            items.append(entry(meta.get('scene'), meta.get('lesson'), base, r, qa, created, sizes, cal))
    p = os.path.join(repo, 'shorts', 'index.json'); write(p, items); return p, len(items)


def public(index_path):
    idx = json.load(open(index_path))
    ld = lambda f: json.load(open(os.path.join(CINE, f))) if os.path.exists(os.path.join(CINE, f)) else None
    cal = ld('publish/calendar.json') or {}
    data = dict(index=idx, coverage=ld('coverage.json'), credits=ld('credits.json'),
                calendar=dict(updated=cal.get('updated'), per_day=cal.get('per_day'), tz=cal.get('tz'),
                              posts=[{k: p.get(k) for k in ('n', 'date', 'time', 'id', 'scene', 'template')} for p in cal.get('posts', [])]))
    out = os.path.join(ROOT, 'functions', 'api', '_shorts_data.js')
    open(out, 'w').write('// GENERATED by scripts/cine/shorts_index.py public – admin-only bundle (served by admin-shorts.js behind adminGate). Do not edit.\n'
                         'export default ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    return out


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = lambda k: json.load(open(a[a.index(k) + 1])) if k in a else None
    if a and a[0] == 'full': print(*full(a[1], opt('--runs'), opt('--sizes')))
    elif a and a[0] == 'public': print(public(a[1]))
    else: print(__doc__); sys.exit(2)
