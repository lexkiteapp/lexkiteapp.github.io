#!/usr/bin/env python3
"""teach2d-mix: the 0-credit build bank (scripts/video/teach2d/mix.py) – deterministic, anti-repeat, real pieces only, wired into the renderer."""
import json, os, re, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')); sys.path.insert(0, f'{ROOT}/scripts/video/teach2d')
import mix as X
ok = True
def check(c, msg):
    global ok; print(('✓ ' if c else '✗ ') + msg); ok &= bool(c)
M1, M2 = X.plan(), X.plan(); S = X.stats(M1); seq = list(M1.values())
check(M1 == M2, 'same input -> same mix (seeded by episode id)')
check(S['violations'] == 0, f"0 anti-repeat violations in render order ({S['episodes']} eps)")
check(S['diversity'] >= X.MIN_DIV, f"diversity {S['diversity']} >= {X.MIN_DIV}")
check(S['distinct_clips'] >= 1_000_000, f"{S['distinct_clips']:,} distinct clips from pieces we own (>= 1M, 0 credits)")
# rule itself: a clip that repeats the previous music / shares a background with one 3 clips ago is refused
a = dict(seq[0]); b = dict(seq[1]); b['music'] = a['music']; check(not X.ok(b, [a]), 'same music as the previous clip -> refused')
c = dict(seq[3]); c['layout'], c['canvas'] = seq[1]['layout'], seq[1]['canvas']; check(not X.ok(c, seq[:3]), 'same background (layout+canvas) inside the window -> refused')
# every gesture is a real TeacherRig pose gesture with THIS teacher's own approved image (no alt stand-in posing as variety)
P = json.load(open(f'{ROOT}/web/teach/characters.json'))['people']; G = X.rig_gestures(); bad = []
for eid, m in M1.items():
    who = json.load(open(f'{ROOT}/content/video/teach2d/eps/{eid}.json'))['teacher']; have = set(P[who]['clips']) | set(P[who].get('stills') or {})
    bad += [(eid, m[k]) for k in ('g_line', 'g_praise') if G.get(m[k], ('?',))[0] not in have]
check(not bad, f'silence gestures all have the teacher\'s own image {bad[:3]}')
# every music preset / sfx / layout / canvas exists in the renderer
syn = open(f'{ROOT}/scripts/video/synth.mjs').read(); sfx = {x['id'] for x in json.load(open(f'{ROOT}/brand/library/sfx/manifest.json'))['items']}
b_ = open(f'{ROOT}/scripts/video/teach2d/build.py').read(); jsx = open(f'{ROOT}/scripts/video/remotion/src/teach/TeachShort.jsx').read()
check(all(f"'{m}':" in syn for m in X.AX['music']), 'every music preset is in synth.mjs MUSIC')
check(set(X.AX['hook']) | set(X.AX['card']) <= sfx, 'every stinger / swish is in the sfx bank')
check(all(f'{l}=dict(' in b_ for l in X.AX['layout']) and all(f'{c}=[' in b_ for c in X.AX['cam']), 'every layout / camera rhythm is in build.py')
check(len(re.findall(r"^  \[\[", jsx[jsx.index('const BLOBS'):], re.M)) >= len(X.AX['canvas']), 'TeachShort.jsx has every canvas arrangement')
check("MIX.get('music')" in b_ and "mix=MIX or None" in b_ and "o.layout = MIX['layout']" in b_, 'build.py reads mix.json (music, layout, timeline.mix)')
# rig: mix gestures reach the schedule and the static geometry
r = subprocess.run(['node', '--input-type=module', '-e', """
import { schedule, geomPoses } from './scripts/video/teach2d/rig_plan.mjs';
const lines = [{id:'h',text:'x',t0:0,t1:1,words:[{s:0,e:0.8}]},{id:'m',text:'m',t0:4,t1:5,words:[{s:4,e:4.8}]},{id:'q',quiz:true,text:'q',t0:8,t1:9,words:[{s:8,e:8.8}],pause:3},{id:'a',text:'a',t0:12,t1:13,words:[{s:12,e:12.8}]},{id:'b',text:'b',t0:16,t1:17,words:[{s:16,e:16.8}]}];
const B = [0, 4, 8, 12, 16].map(t => ({ start: t, end: t + 0.9, v0: t, v1: t + 0.8, cues: [] }));
const ev = schedule({ hook:{line:'h'}, mix:{ g_line:'point', g_praise:'thumbs_up' } }, lines, B).filter(e => e.kind === 'gesture').map(e => e.name);
const g = geomPoses(null, { g_line:'hold_card', g_praise:'clap' });
console.log(JSON.stringify({ ev, g, bogus: geomPoses(null, { g_line:'nope' }).length === geomPoses(null).length }));
"""], cwd=ROOT, capture_output=True, text=True)
o = json.loads(r.stdout or '{}') if r.returncode == 0 else {}
check('thumbs_up' in o.get('ev', []) and 'point' in o.get('ev', []), f"rig schedule plays the mix gestures {o.get('ev')} {r.stderr[-200:]}")
check({'hold_card', 'clap'} <= set(o.get('g', [])) and o.get('bogus'), 'static geom covers mix poses; an unknown name changes nothing')
WF = open(f'{ROOT}/.github/workflows/teach-video.yml').read()   # run 42047456815: side main layout -> stills step asked for props_lay_side.json that was never built
check('for L in side bubble' not in WF and WF.count('for L in corner side bubble') >= 3 and WF.count('[ $L = $LAY ] && continue') >= 2 and 'lay_${LAY}_$t.png' in WF,
      'layout stills follow the mix layout (real frame for it, Remotion stills for the other two)')
print('teach2d-mix: ' + ('đạt' if ok else 'TRƯỢT')); sys.exit(0 if ok else 1)
