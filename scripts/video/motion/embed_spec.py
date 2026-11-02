#!/usr/bin/env python3
"""Embedded lesson-video spec from a short spec (docs/VIDEO-MOTION.md §embed): same lesson lines and cards, minus the social lines
(share / save-on-lexkite), plus ONE hand-over line to the next lesson step; calmer pacing (TTS speed x0.94, the longest teaching breath).
  python3 scripts/video/motion/embed_spec.py SHORT.json > EMBED.json"""
import json, sys
s = json.load(open(sys.argv[1])); e = s['embed']; drop = set(e['drop'])
s['id'] = s['id'] + '_embed'; s['speed'] = round(s.get('speed', 1.0) * 0.94, 3)
s['lines'] = [dict(l, gap=0.8) if l.get('text') and i else l for i, l in enumerate(x for x in s['lines'] if x['id'] not in drop)] + [dict(e['end'], gap=0.8)]
s['pops'] = [dict(p, **{'from': [e['end']['id'], 0, 's', -0.05]}) if p['kind'] == 'cta' else p for p in s['pops']]
s['motion'] = dict(s['motion'], end_line=e['end']['id']); s.pop('embed')
json.dump(s, sys.stdout, indent=1, ensure_ascii=False)
