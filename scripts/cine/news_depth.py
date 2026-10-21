#!/usr/bin/env python3
"""Depth maps for the news background library (Depth-Anything-V2-Small, CPU, 0 credits): <lib>/anchor/bg/index.json topics ->
<out>/<topic>.depth.png (16-bit, near = bright, same convention as bg3d.py). Existing maps are kept (CI cache 'news-depth-*').
  python3 scripts/cine/news_depth.py <CINE_LIB> <out-dir> [topic,...]"""
import json, os, sys, numpy as np
lib, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
items = json.load(open(f'{lib}/anchor/bg/index.json'))['items']; want = set(sys.argv[3].split(',')) if len(sys.argv) > 3 else None
todo = [e for e in items if (want is None or e['topic'] in want) and not os.path.exists(f'{out}/{e["topic"]}.depth.png')]
print(f'{len(todo)} depth map(s) to compute')
if todo:
    from transformers import pipeline; from PIL import Image; import cv2
    pipe = pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Small-hf', device='cpu')
    for e in todo:
        im = Image.open(f'{lib}/anchor/{e["file"]}').convert('RGB'); d = pipe(im)['predicted_depth'].squeeze().float().numpy()
        d = cv2.resize(d, im.size, interpolation=cv2.INTER_CUBIC); d = (d - d.min()) / (d.max() - d.min() + 1e-6)
        cv2.imwrite(f'{out}/{e["topic"]}.depth.png', (d * 65535).astype(np.uint16)); print('depth', e['topic'])
