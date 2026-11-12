"""addins.py <id>... – register banked ambient loop inserts (media cine/scenes/<sit>/inserts/<id>.mp4) in bank.json situations.<sit>.inserts.
Each insert: v4 1080p 5 s, first = tail = plate → seamless loop; aspect/light come from its plate; motion phrase from ambient.json."""
import json, sys, os
T = os.path.dirname(os.path.abspath(__file__)); B = os.path.join(T, '..', 'bank.json')
b = json.load(open(B)); amb = json.load(open(os.path.join(T, 'ambient.json')))
for i in sys.argv[1:]:
    s, pl = i.split('_amb_'); sit = b['situations'][s]
    plate = next(p for p in sit['plates'] if p['id'] == f'{s}_{pl}')
    ins = sit.setdefault('inserts', [])
    if any(x['id'] == i for x in ins): continue
    ins.append({'id': i, 'src': f'{s}/inserts/{i}.mp4', 'plate': plate['id'], 'aspect': plate['aspect'], 'light': plate['light'],
                'kind': 'ambient_loop', 'loop': True, 'dur': 5, 'res': '1080p', 'people': 0, 'text': 0,
                'motion': amb.get(f'{s}_{pl}', amb[s]), 'model': 'kling-video-v4_0', 'uses': 0})
json.dump(b, open(B, 'w'), indent=1, ensure_ascii=False); open(B, 'a').write('\n')
