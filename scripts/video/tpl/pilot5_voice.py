#!/usr/bin/env python3
"""Pilot v5 voices: python3 scripts/video/tpl/pilot5_voice.py <lines_X.json> <ND>  -> ND/vis3/<id>.wav/.json(Rhubarb)/.words.json for every ATOMIC line
(composite 'parts' lines are assembled by render_v5.py). Kokoro + Rhubarb + faster-whisper via scripts/cine/news_voice.py (no network AI, no GrabCast)."""
import json, os, sys, subprocess
src, nd = sys.argv[1], sys.argv[2]; J = json.load(open(src)); at = [l for l in J['lines'] if l.get('text')]
os.makedirs(f'{nd}/ci', exist_ok=True); os.makedirs(f'{nd}/lessons', exist_ok=True)
json.dump(dict(voices=J['voices'], speed=J.get('speed', 0.88), lines=at), open(f'{nd}/ci/lines.json', 'w'), indent=1)
ids = [l['id'] for l in at]
json.dump(dict(id='pilot5', hook=dict(line=ids[0]), recap=dict(line=ids[0]), end_line=ids[0], beats=[dict(line=i) for i in ids]), open(f'{nd}/lessons/pilot5.json', 'w'))
subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'cine', 'news_voice.py'), nd, 'pilot5'], check=True)
