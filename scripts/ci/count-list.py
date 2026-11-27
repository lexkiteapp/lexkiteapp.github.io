#!/usr/bin/env python3
"""Đọc stdin, in số phần tử của dòng JSON-list đầu tiên (bỏ qua dòng rác khác); không có → in $1 (mặc định 1).
teach-video: par/preqc đếm shard từ stdout của shards.mjs; một dòng thừa trên stdout từng làm json.load ném 'Extra data' → par rỗng → render không chạy."""
import json, sys
for l in sys.stdin:
    try: v = json.loads(l)
    except ValueError: continue
    if isinstance(v, list): print(len(v)); break
else: print(sys.argv[1] if len(sys.argv) > 1 else 1)
