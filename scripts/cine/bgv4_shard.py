#!/usr/bin/env python3
"""bgv4_shard.py list <k> [ids] | of <scene-id> - hash shard (md5 % 20) of the bg-v4 cache (bg-v4.yml <-> cine-render news jobs)."""
import hashlib, json, os, sys
N = 20; sh = lambda i: int(hashlib.md5(i.encode()).hexdigest(), 16) % N
if sys.argv[1] == 'of': print(sh(sys.argv[2].split('@')[0])); sys.exit(0)
k = int(sys.argv[2]); ids = [x for x in (sys.argv[3] if len(sys.argv) > 3 else '').split(',') if x]
if not ids:   # all wide scenes: the list lives in the private footage repo -> the repo copy of the topic map has every accepted wide id
    t = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../content/video/cine/news/bg_topics.json')))
    ids = sorted({x for v in t.get('wide_by_topic', {}).values() for x in v})
print(' '.join(i for i in ids if sh(i) == k))
