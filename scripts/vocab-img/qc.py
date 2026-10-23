#!/usr/bin/env python3
"""qc.py – cổng chất lượng ảnh minh hoạ từ vựng (chạy trên GitHub Actions, workflow vocab-img.yml – không chạy nặng trên Mac).
  python3 scripts/vocab-img/qc.py <out_dir> --attempt N          chấm mọi raw/*.aN.jpg → <out_dir>/qc.aN.json (+ webp/<slug>.aN.webp)
  python3 scripts/vocab-img/qc.py <out_dir> --final [--sheet p]  gộp lần 1+2 → result.json (đạt/không), review.json (5 % cho Quản trị), tờ ảnh ghép
Cổng (trượt 1 = trượt; lần 1 trượt → vẽ lại 1 lần (gen --attempt 2), trượt nữa → KHÔNG có ảnh):
  sense   chuỗi thị giác có sẵn của repo: /api/studio op visionCheck (Workers AI Llama 3.2 Vision → Gemini key pool → bỏ qua trung tính, scripts/cine/ai_gate.py)
          + CLIP ViT-B-32 (open_clip) xếp hạng nghĩa đúng giữa 40 nghĩa khác cùng loại; thị giác không có → chỉ CLIP (hạng ≤ 3, p ≥ 0,2)
  text    OCR RapidOCR: không được có chữ/số (ô tin cậy ≥ 0,6, ≥ 2 ký tự chữ-số)
  safe    CLIP zero-shot an toàn cho trẻ (khoả thân / máu / bạo lực / kinh dị) + câu hỏi thị giác
  style   CLIP "flat vector" thắng ảnh chụp/3D/phác thảo/sơn dầu + nền viền phẳng sáng + gần tâm phong cách của lô (cos ≥ 0,6)
  dedupe  pHash ≤ 6 với nghĩa khác (lô + thư viện đã có content/lexicon/img.json) → trượt
  size    WebP 384 px q70 (lùi q60/q50) ≤ 20 KB, mục tiêu ~12 KB"""
import glob, hashlib, io, json, os, re, sys
from PIL import Image, ImageDraw, ImageFont
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'cine'))
OUT = sys.argv[1]; arg = lambda n, d=None: sys.argv[sys.argv.index('--' + n) + 1] if '--' + n in sys.argv else d
LEX = json.load(open(os.path.join(ROOT, 'dist/lexicon.json'))); SEL = json.load(open(os.path.join(ROOT, 'content/lexicon/vimg-select.json')))['items']
IMGJ = os.path.join(ROOT, 'content/lexicon/img.json'); LIB = json.load(open(IMGJ)).get('items', {}) if os.path.exists(IMGJ) else {}
SIZE, MAXB = 384, 20 * 1024
slug = lambda k: re.sub(r'[^a-zA-Z0-9_-]+', '-', k.replace('#', '__'))   # = gen.mjs slug()
KEY_OF = {slug(k): k for k in LEX}

def fnv(s):
    h = 0x811c9dc5
    for c in s.encode(): h ^= c; h = (h * 0x01000193) & 0xffffffff
    return h

_clip = None
def clip():
    global _clip
    if _clip is None:
        import torch, open_clip
        torch.set_num_threads(2)
        m, _, pre = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k'); m.eval()
        _clip = (m, pre, open_clip.get_tokenizer('ViT-B-32'), torch)
    return _clip
def emb_img(im):
    m, pre, tok, torch = clip()
    with torch.no_grad(): v = m.encode_image(pre(im).unsqueeze(0)); return (v / v.norm(dim=-1, keepdim=True))[0].numpy()
_tc = {}
def emb_txt(ts):
    m, pre, tok, torch = clip(); miss = [t for t in ts if t not in _tc]
    if miss:
        with torch.no_grad():
            v = m.encode_text(tok(miss)); v = (v / v.norm(dim=-1, keepdim=True)).numpy()
        for t, x in zip(miss, v): _tc[t] = x
    return np.stack([_tc[t] for t in ts])
def soft(sims): z = np.exp(100 * (sims - sims.max())); return z / z.sum()
def sense_txt(k): e = LEX[k]; return f"an illustration of {e['w']}: {(e.get('def') or '')[:120]}"

def clip_sense(k, v):
    pos = LEX[k]['pos']; pool = sorted([x for x in SEL if x != k and LEX[x]['pos'] == pos and LEX[x]['w'] != LEX[k]['w']], key=lambda x: fnv(k + x))[:40]
    ts = [sense_txt(k)] + [sense_txt(x) for x in pool] + ['an image of text and letters', 'an abstract pattern', 'an empty background']
    p = soft(emb_txt(ts) @ v); return int((p > p[0]).sum()) + 1, float(p[0])
SAFE = ['a safe friendly cartoon illustration for children']
UNSAFE = ['a nude person', 'sexual content', 'blood and gore', 'a violent attack on a person', 'a scary horror image']
def clip_safe(v): p = soft(emb_txt(SAFE + UNSAFE) @ v); return float(p[1:].max())
STY = ['a flat vector cartoon illustration on a plain light background', 'a photograph', 'a 3d render', 'a pencil sketch', 'an oil painting', 'a screenshot of text']
def clip_style(v): p = soft(emb_txt(STY) @ v); return float(p[0])
def border(im):
    a = np.asarray(im.convert('RGB').resize((128, 128)), dtype=np.float32); b = np.concatenate([a[:6].reshape(-1, 3), a[-6:].reshape(-1, 3), a[:, :6].reshape(-1, 3), a[:, -6:].reshape(-1, 3)])
    return float(b.mean()), float(b.std(axis=0).mean())

_ocr = None
def ocr(path):
    global _ocr
    if _ocr is None:
        from rapidocr_onnxruntime import RapidOCR; _ocr = RapidOCR()
    r, _ = _ocr(path); return [(t, round(float(s), 2)) for _, t, s in (r or []) if float(s) >= 0.6 and len(re.sub(r'[^A-Za-z0-9]', '', t)) >= 2]

def vision(k, im):
    import ai_gate, base64
    e = LEX[k]; d = (e.get('def') or '')[:160]
    ask = (f'This picture should show "{e["w"]}" ({e["pos"]}), meaning: {d}. Is anything wrong: does it fail to show this clearly, show something else, '
           'contain written text or letters, or contain anything unsuitable for young children? Answer only YES or NO, then one short reason.')
    q = (f'You check one flashcard illustration for an English vocabulary app. It should depict "{e["w"]}" ({e["pos"]}), meaning: {d}. '
         'natural = true only if a learner would recognise exactly this meaning, the picture has no written text or letters, and it is safe for young children. '
         'Reply JSON only: {"frames": [{"natural": true|false, "problem": "..."}]}')
    b = io.BytesIO(); im.convert('RGB').resize((384, 384)).save(b, 'JPEG', quality=85)
    if ai_gate.MOCK: return dict(ok=True, provider='mock', problem='')
    r, st = ai_gate.studio('visionCheck', dict(question=q, ask=ask, images=[base64.b64encode(b.getvalue()).decode()]), timeout=60, tries=2)
    if st != 'ok': return dict(ok=None, provider=None, problem=st[:120])
    txt = (r.get('text') or '').strip()
    try: f = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])['frames'][0]
    except Exception: return dict(ok=None, provider=r.get('provider'), problem='unparsed')
    if str(f.get('problem')) == 'no answer': return dict(ok=None, provider=r.get('provider'), problem='no answer (quota)')
    return dict(ok=bool(f.get('natural')), provider=r.get('provider'), problem=str(f.get('problem') or '')[:160])

def webp(im, dst):
    im = im.convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
    for q in (70, 60, 50):
        b = io.BytesIO(); im.save(b, 'WEBP', quality=q, method=6)
        if b.tell() <= MAXB: break
    open(dst, 'wb').write(b.getvalue()); return b.tell(), q

def check(k, att, f, s, im):
    import imagehash
    v = emb_img(im); r = dict(k=k, attempt=att, reasons=[])

    dst = f'{OUT}/webp/{s}.a{att}.webp'; r['bytes'], r['q'] = webp(im, dst); r['webp'] = os.path.relpath(dst, OUT)
    r['ph'] = str(imagehash.phash(Image.open(dst))); r['rank'], r['p'] = clip_sense(k, v); r['unsafe'] = round(clip_safe(v), 3)
    r['flat'] = round(clip_style(v), 3); r['bg'], r['bgstd'] = [round(x, 1) for x in border(im)]; r['ocr'] = ocr(f); r['vision'] = vision(k, im)
    r['emb'] = v.round(4).tolist()
    vs = r['vision']['ok']
    if vs is False: r['reasons'].append('vision: ' + r['vision']['problem'][:60])
    if vs is True and r['rank'] > 8: r['reasons'].append(f'clip rank {r["rank"]}')
    if vs is None and (r['rank'] > 3 or r['p'] < 0.2): r['reasons'].append(f'clip rank {r["rank"]} p {r["p"]:.2f}')
    if r['ocr']: r['reasons'].append('text: ' + ' '.join(t for t, _ in r['ocr'])[:30])
    if r['unsafe'] > 0.35: r['reasons'].append(f'unsafe {r["unsafe"]}')
    if r['flat'] < 0.5: r['reasons'].append(f'style flat {r["flat"]}')
    if r['bg'] < 170 or r['bgstd'] > 40: r['reasons'].append(f'background {r["bg"]}/{r["bgstd"]}')
    if r['bytes'] > MAXB: r['reasons'].append(f'size {r["bytes"]}')

    return r

def run_attempt(att):
    import imagehash
    os.makedirs(f'{OUT}/webp', exist_ok=True); res = {}
    for f in sorted(glob.glob(f'{OUT}/raw/*.a{att}.jpg')):
        s = os.path.basename(f)[:-len(f'.a{att}.jpg')]; k = KEY_OF.get(s)
        if not k: print('SKIP unknown', s); continue
        try: im = Image.open(f).convert('RGB')
        except Exception as ex: print(k, 'SKIP unreadable', repr(ex)[:200], flush=True); continue   # không bao giờ xoá ảnh đã vẽ
        try: res[k] = check(k, att, f, s, im)
        except Exception as ex: print(k, 'QC ERROR', repr(ex)[:160], flush=True); res[k] = dict(k=k, attempt=att, reasons=['qc error'], bytes=0, ph='0' * 16, p=0, rank=99, vision={})
        r = res[k]; print(k, 'PASS' if not r['reasons'] else 'FAIL ' + '; '.join(r['reasons']), f'rank {r["rank"]} {r["bytes"]}B', (r.get('vision') or {}).get('provider'), flush=True)
    # tâm phong cách + trùng (pHash) trong lô và với thư viện
    ok = [r for r in res.values() if not r['reasons']]
    if len(ok) >= 5:
        c = np.mean([r['emb'] for r in ok], axis=0); c /= np.linalg.norm(c)
        for r in [r for r in res.values() if 'emb' in r]:
            r['centroid'] = round(float(np.dot(r['emb'], c)), 3)
            if r['centroid'] < 0.6: r['reasons'].append(f'style centroid {r["centroid"]}')
    seen = [(x, LIB[x].get('ph')) for x in LIB if LIB[x].get('ph')]
    for r in sorted(res.values(), key=lambda r: -r['p']):
        if r['reasons']: continue
        h = imagehash.hex_to_hash(r['ph']); d = [x for x, p in seen if x != r['k'] and (h - imagehash.hex_to_hash(p)) <= 6]
        if d: r['reasons'].append('dup of ' + d[0])
        else: seen.append((r['k'], r['ph']))
    for r in res.values(): r['pass'] = not r['reasons']; r.pop('emb', None)
    json.dump(res, open(f'{OUT}/qc.a{att}.json', 'w'), indent=1)
    print(f'qc attempt {att}: {sum(r["pass"] for r in res.values())}/{len(res)} pass')
    if att == 1:
        want = json.load(open(arg('keys'))).get('items') if arg('keys') else list(res)
        json.dump(dict(items=[k for k in want if k in LEX and (k not in res or not res[k]['pass'])]), open(f'{OUT}/retry.json', 'w'))
    if not res: sys.exit(1)

def final(sheet):
    a1 = json.load(open(f'{OUT}/qc.a1.json')); a2 = json.load(open(f'{OUT}/qc.a2.json')) if os.path.exists(f'{OUT}/qc.a2.json') else {}
    keys = json.load(open(arg('keys'))).get('items') if arg('keys') else list(a1)
    out, os_ = {}, os.makedirs(f'{OUT}/final', exist_ok=True)
    for k in keys:
        r = a1.get(k); r = r if r and r['pass'] else (a2.get(k) or r)
        if not r: out[k] = dict(k=k, attempt=0, reasons=['not generated'], bytes=0); out[k]['pass'] = False; continue
        if r['pass']:
            b = open(f'{OUT}/{r["webp"]}', 'rb').read(); h = hashlib.sha256(b).hexdigest()[:16]; open(f'{OUT}/final/{h}.webp', 'wb').write(b); r['h'] = h
        out[k] = r
    n = len(keys); ok = [k for k in keys if out[k].get('pass')]; first = [k for k in ok if out[k]['attempt'] == 1]
    rev = [k for k in ok if fnv('review|' + k) % 20 == 0] or ok[:1]          # 5 % tất định → hàng chờ Quản trị
    prov = {}
    for r in out.values(): p = (r.get('vision') or {}).get('provider') or 'clip-only'; prov[p] = prov.get(p, 0) + 1
    stats = dict(n=n, passed=len(ok), pass_rate=round(len(ok) / max(1, n), 3), first_try=len(first), retried_pass=len(ok) - len(first),
                 no_image=n - len(ok), avg_bytes=round(np.mean([out[k]['bytes'] for k in ok])) if ok else 0, max_bytes=max([out[k]['bytes'] for k in ok] or [0]),
                 vision_provider=prov, fails={k: out[k].get('reasons') for k in keys if not out[k].get('pass')})
    json.dump(dict(stats=stats, items=out), open(f'{OUT}/result.json', 'w'), indent=1); json.dump(dict(items=rev), open(f'{OUT}/review.json', 'w'), indent=1)
    print(json.dumps({k: v for k, v in stats.items() if k != 'fails'}))
    if sheet: contact(keys, out, stats, sheet)

def contact(keys, out, stats, path):
    T, cols = 200, 10; rows = (len(keys) + cols - 1) // cols; H = 60
    W = Image.new('RGB', (cols * T, H + rows * (T + 30)), (255, 247, 234)); d = ImageDraw.Draw(W)
    try: F = ImageFont.load_default(size=14); F2 = ImageFont.load_default(size=20)
    except TypeError: F = F2 = ImageFont.load_default()
    d.text((10, 8), f"vocab-img pilot · style s1 · pass {stats['passed']}/{stats['n']} ({stats['pass_rate']*100:.0f}%) · 1st try {stats['first_try']} · retry ok {stats['retried_pass']} · avg {stats['avg_bytes']/1024:.1f} KB", fill=(15, 61, 62), font=F2)
    d.text((10, 34), 'green = shipped image · red = no image (reason) · grey = attempt shown', fill=(23, 89, 90), font=F)
    for i, k in enumerate(keys):
        x, y = (i % cols) * T, H + (i // cols) * (T + 30); r = out[k]
        src = r.get('webp'); a1 = os.path.join(OUT, src) if src else None
        if a1 and os.path.exists(a1): W.paste(Image.open(a1).convert('RGB').resize((T - 8, T - 8)), (x + 4, y + 4))
        col = (47, 191, 113) if r.get('pass') else (229, 80, 47); d.rectangle([x + 2, y + 2, x + T - 3, y + T - 3], outline=col, width=4)
        lab = f"{k}{' ·r' if r.get('attempt') == 2 else ''}"; d.text((x + 4, y + T), lab[:28], fill=(15, 61, 62), font=F)
        if not r.get('pass'): d.text((x + 4, y + T + 14), '; '.join(r.get('reasons') or [])[:30], fill=(229, 80, 47), font=F)
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True); W.save(path, 'JPEG', quality=82); print('sheet', path)

if __name__ == '__main__':
    if '--final' in sys.argv: final(arg('sheet'))
    else: run_attempt(int(arg('attempt', '1')))
