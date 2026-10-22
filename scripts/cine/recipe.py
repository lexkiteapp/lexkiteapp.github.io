#!/usr/bin/env python3
"""Recipe-first storage for cine shorts (docs/VIDEO-STORAGE.md): every rendered clip = one deterministic recipe JSON (~5 KB) in
lexkite-shorts recipes/<scene>/<lesson>/<clip>.recipe.json. Masters/covers live on the Drive pool; the recipe + the footage bank
(lexkite-footage @ footage_sha) + the pipeline (lexkiteapp.github.io @ pipeline.sha) re-render the clip (rebuild_from_recipe.py).

  recipe.py build <lesson-id> <clip-base> <timeline.json> <out.json> [--master mp4] [--cover jpg] [--voices dir] [--bg-override id]
  recipe.py legacy <shorts-checkout>         recipes for already stored clips (from meta.json + timeline.json, pipeline sha = meta sha)
  recipe.py check <recipe.json>              schema check (exit 1 on error)

Deterministic: canonical JSON (sorted keys, no floats beyond 4 decimals, no wall-clock fields inside `inputs`), recipe_id =
sha256 of the canonical `inputs` → same inputs ⇒ same id and same bytes. `outputs` (master sha256/bytes, cover sha) is informative.
"""
import hashlib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
NEWS = os.path.join(ROOT, 'content', 'video', 'cine', 'news')
SCHEMA = 'lexkite.recipe/1'
PIPELINE_VERSION = 'news-v1'          # bump when news.py/news_tpl.py change the rendered pixels for the same inputs
TOOLS = {'kokoro-js': '1', 'rhubarb': '1.13.0', 'faster-whisper': '1.0.3', 'whisper-model': 'base.en', 'x264': 'crf17 preset slow tune film threads2'}
SEED = 0                              # the news pipeline has no RNG; kept explicit so a future random choice must read it
SHOT_KEYS = ('id', 'who', 'kind', 't0', 'dur', 'line', 'lines', 'clip', 'src', 'clips', 'other', 'cam', 'zoom', 'card', 'bg', 'pose', 'take', 'gesture')
MAX_BYTES = 12000


def _round(x):
    if isinstance(x, float): return round(x, 4)
    if isinstance(x, dict): return {k: _round(v) for k, v in x.items()}
    if isinstance(x, list): return [_round(v) for v in x]
    return x


def canonical(obj):
    return json.dumps(_round(obj), sort_keys=True, ensure_ascii=False, separators=(',', ':'))


def sha_file(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def _git(*a, cwd=ROOT):
    try: return subprocess.check_output(['git', '-C', cwd, *a], stderr=subprocess.DEVNULL, text=True).strip()
    except Exception: return ''


def lines_for(spec, lines):
    """The exact TTS lines a lesson uses (same rule as news_voice.py), with voice/speed resolved."""
    need = {spec['hook']['line'], spec['recap']['line'], spec.get('end_line'), spec['recap'].get('line_alt'), spec.get('end_alt')} - {None}
    need |= {b['line'] for b in spec.get('beats', [])}
    need |= {x for v in (lines.get('reactions') or {}).values() for x in v}   # listener reactions (news_tpl picks them)
    out = [{k: v for k, v in l.items()} for l in lines.get('lines', []) if l['id'] in need]   # verbatim line rows (who/text/speed) → news_voice input
    return sorted(out, key=lambda l: l['id'])


def shot_plan(timeline):
    plan = []
    for s in (timeline or {}).get('shots', []):
        row = {k: s[k] for k in SHOT_KEYS if k in s and len(json.dumps(s[k], default=str)) <= 240}
        plan.append(row)
    return plan


def build(lesson_id, base, timeline, *, spec=None, lines=None, master=None, cover=None, voices=None, bg=None, pipeline_sha=None,
          footage_sha=None, scene='news', created=None):
    spec = spec if spec is not None else json.load(open(os.path.join(NEWS, lesson_id + '.json')))
    lines = lines if lines is not None else json.load(open(os.path.join(NEWS, 'lines.json')))
    tl_lesson = (timeline or {}).get('lesson') or {}
    used = lines_for(spec, lines)
    inputs = dict(
        clip=base, lesson=lesson_id, scene=scene, template=spec.get('template') or tl_lesson.get('template') or '',
        lesson_point=spec.get('point') or '', area=spec.get('area') or '', cefr=spec.get('cefr') or '',
        script=dict(spec=spec, lines=used, voices=lines.get('voices') or {}, speed=lines.get('speed', 0.92), reactions=lines.get('reactions') or {}),
        background=bg or tl_lesson.get('bg') or spec.get('bg'),
        shot_plan=shot_plan(timeline),
        host_clips=sorted({str(c) for s in (timeline or {}).get('shots', []) for c in ([s.get('clip')] + list(s.get('clips') or [])) if c}),
        tts=dict(engine='kokoro', tools=TOOLS, voice_sha={k: v for k, v in sorted((voices or {}).items())}),
        matte=os.environ.get('NEWS_MATTE') or '',   # '' = classic key, 'pro' = PRO host matte (cine-render env)
        seed=SEED, pipeline=dict(version=PIPELINE_VERSION, sha=pipeline_sha or os.environ.get('GITHUB_SHA') or _git('rev-parse', 'HEAD')),
        footage=dict(repo='lexkiteapp/lexkite-footage', sha=footage_sha or os.environ.get('FOOTAGE_SHA') or ''),
    )
    rid = hashlib.sha256(canonical(inputs).encode()).hexdigest()
    outputs = {}
    if master and os.path.exists(master): outputs.update(master_sha256=sha_file(master), master_bytes=os.path.getsize(master))
    if cover and os.path.exists(cover): outputs.update(cover_sha256=sha_file(cover))
    rec = dict(schema=SCHEMA, recipe_id=rid, inputs=inputs, outputs=outputs, created=created)
    if len(canonical(rec)) > MAX_BYTES:   # keep recipes small: drop the shot plan detail first (the pipeline re-derives it)
        inputs['shot_plan'] = [{k: s[k] for k in ('id', 'who', 't0', 'dur') if k in s} for s in inputs['shot_plan']]
        rec['recipe_id'] = hashlib.sha256(canonical(inputs).encode()).hexdigest()
    return rec


def voice_hashes(vdir, used):
    out = {}
    for l in used:
        p = os.path.join(vdir or '', l['id'] + '.wav')
        if vdir and os.path.exists(p): out[l['id']] = sha_file(p)[:16]
    return out


def check(rec):
    errs = []
    if rec.get('schema') != SCHEMA: errs.append('schema')
    i = rec.get('inputs') or {}
    for k in ('clip', 'lesson', 'scene', 'template', 'script', 'background', 'seed', 'pipeline'):
        if k not in i: errs.append('missing inputs.' + k)
    if not re.fullmatch(r'[0-9a-f]{64}', str(rec.get('recipe_id', ''))): errs.append('recipe_id')
    elif rec['recipe_id'] != hashlib.sha256(canonical(i).encode()).hexdigest(): errs.append('recipe_id mismatch')
    if not re.fullmatch(r'[0-9a-f]{7,40}', str((i.get('pipeline') or {}).get('sha', ''))): errs.append('pipeline.sha')
    if len(canonical(rec)) > MAX_BYTES: errs.append('too large')
    return errs


def write(rec, out):
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    open(out, 'w').write(json.dumps(_round(rec), sort_keys=True, ensure_ascii=False, indent=1) + '\n')
    return out


def recipe_path(repo, scene, lesson, base):
    return os.path.join(repo, 'recipes', scene, lesson, base + '.recipe.json')


def legacy(repo):
    """Recipes for clips stored before recipe-first storage: spec/lines from the pipeline commit that rendered them when available."""
    import glob
    n = 0
    for mp in sorted(glob.glob(os.path.join(repo, 'shorts', '*', '*', 'meta.json'))):
        meta = json.load(open(mp)); d = os.path.dirname(mp); sc, lid = meta.get('scene'), meta.get('lesson')
        for base, r in (meta.get('renders') or {}).items():
            out = recipe_path(repo, sc, lid, base)
            if os.path.exists(out): continue
            sha = r.get('sha') or ''
            def at(rel):
                txt = _git('show', f'{sha}:{rel}') if sha else ''
                if txt: return json.loads(txt)
                p = os.path.join(ROOT, rel); return json.load(open(p)) if os.path.exists(p) else None
            spec = at(f'content/video/cine/news/{lid}.json'); lines = at('content/video/cine/news/lines.json')
            if not spec or not lines or 'hook' not in spec: print('legacy: no news spec for', base, '(scene clip – recipe = meta only)')
            tp = os.path.join(d, base + '.timeline.json'); tl = json.load(open(tp)) if os.path.exists(tp) else {}
            if spec and lines and 'hook' in spec:
                rec = build(lid, base, tl, spec=spec, lines=lines, pipeline_sha=sha or None, scene=sc, created=r.get('created'))
            else:
                inputs = dict(clip=base, lesson=lid, scene=sc, template=(tl.get('lesson') or {}).get('template', 'scene'), script=dict(spec=None, timeline_lesson=tl.get('lesson')),
                              background=(tl.get('lesson') or {}).get('bg'), shot_plan=shot_plan(tl), seed=SEED, pipeline=dict(version='lesson5', sha=sha or '0000000'))
                rec = dict(schema=SCHEMA, recipe_id=hashlib.sha256(canonical(inputs).encode()).hexdigest(), inputs=inputs, outputs={}, created=r.get('created'), legacy=True)
            vid = os.path.join(d, base + '.mp4')
            if os.path.exists(vid): rec['outputs'].update(master_sha256=sha_file(vid), master_bytes=os.path.getsize(vid))
            write(rec, out); n += 1
    print('legacy recipes written:', n)
    return n


if __name__ == '__main__':
    a = sys.argv[1:]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    if a[:1] == ['build']:
        lid, base, tlp, out = a[1:5]; tl = json.load(open(tlp)) if os.path.exists(tlp) else {}
        spec = json.load(open(os.path.join(NEWS, lid + '.json'))); lines = json.load(open(os.path.join(NEWS, 'lines.json')))
        rec = build(lid, base, tl, spec=spec, lines=lines, master=opt('--master'), cover=opt('--cover'), bg=opt('--bg-override'),
                    voices=voice_hashes(opt('--voices'), lines_for(spec, lines)), created=opt('--created'))
        e = check(rec)
        if e: sys.exit('recipe invalid: ' + ', '.join(e))
        print(write(rec, out), len(canonical(rec)), 'bytes', rec['recipe_id'][:12])
    elif a[:1] == ['legacy']: legacy(a[1])
    elif a[:1] == ['check']:
        e = check(json.load(open(a[1]))); print('ok' if not e else e); sys.exit(1 if e else 0)
    else: print(__doc__); sys.exit(2)
