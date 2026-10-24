#!/usr/bin/env python3
"""Giám khảo CỤC BỘ cho ảnh minh hoạ (chủ 24/10): 0 token, không Gemini/API, chạy CPU GitHub Actions, đủ cho 20k ảnh.
Hai kiểm độc lập PHẢI cùng đồng ý (cộng các cổng cứng):
  1. CLIP zero-shot (OpenCLIP ViT-B-32 laion2b): ảnh × [đích + 19 nhiễu (anh em cùng chủ đề + từ ngẫu nhiên tất định)] → đích hạng 1 và lề ≥ clip_margin.
  2. Máy chú thích nhỏ (SmolVLM-256M-Instruct; VIMG_CAPTIONER=florence → Florence-2-base) viết 1 câu → all-MiniLM-L6-v2 so với
     tham chiếu của đích (gloss + đồng nghĩa / câu ví dụ + chú thích cảnh) và của 19 nhiễu → hạng 1, sim ≥ cap_sim, lề ≥ cap_margin.
  Cổng cứng: OCR tesseract không chữ (≤ ocr_max token tin cậy), NSFW mở (Falconsai/nsfw_image_detection) < nsfw_max,
  phong cách = cos(CLIP ảnh, tâm phong cách s1) ≥ style_min, pHash ≤ 6 trùng = loại, cỡ WebP/AVIF ≤ 6 KB (bước encode).
Ngưỡng: content/lexicon/vimg-judge.json (calibrate.py hiệu chỉnh trên tập gán nhãn – độ chính xác ≥ 98 % trên ảnh NHẬN, chấp nhận recall thấp).
  python3 scripts/vocab-img/local_judge.py --dir out/x --attempt 1 [--targets out/x/targets.json] [--features-only]
  → <dir>/judge.local.a<N>.json {k: {pass, reasons[], f:{clip_rank, clip_margin, cap, cap_rank, cap_sim, cap_margin, ocr, nsfw, style, ph}}}
     <dir>/retry.json (trượt/mơ hồ → 1 lần vẽ lại prompt tinh), <dir>/queue.json (trượt lần 2 → hàng chờ; giám khảo API tuỳ chọn chỉ cho hàng này)
     <dir>/speed.judge.a<N>.json (ảnh/phút của giám khảo trên máy CI)
"""
import argparse, json, os, sys, time, glob, re
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
TH_FILE = os.path.join(ROOT, 'content/lexicon/vimg-judge.json')
DEF_TH = {'frame_min': 0.04, 'clip_margin': 0.02, 'cap_sim': 0.45, 'cap_margin': 0.05, 'ocr_max': 0, 'nsfw_max': 0.2, 'style_min': 0.70, 'ph_max': 6}

def fnv(s):
    h = 0x811c9dc5
    for c in s.encode():
        h ^= c; h = (h * 0x01000193) & 0xffffffff
    return h

# ---------- mô hình (tải một lần; trọng số nằm trong actions/cache ~/.cache) ----------
_M = {}
def clip():
    if 'clip' not in _M:
        import open_clip, torch
        m, _, pre = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k'); m.eval()
        _M['clip'] = (m, pre, open_clip.get_tokenizer('ViT-B-32'), torch)
    return _M['clip']
def emb_img(im):
    m, pre, tok, torch = clip()
    with torch.no_grad():
        v = m.encode_image(pre(im).unsqueeze(0)); v = v / v.norm(dim=-1, keepdim=True)
    return v[0].numpy()
_TXT = {}
def emb_txt(ts):
    m, pre, tok, torch = clip(); miss = [t for t in ts if t not in _TXT]
    if miss:
        with torch.no_grad():
            for i in range(0, len(miss), 64):
                v = m.encode_text(tok(miss[i:i + 64])); v = v / v.norm(dim=-1, keepdim=True)
                for t, e in zip(miss[i:i + 64], v.numpy()): _TXT[t] = e
    return np.stack([_TXT[t] for t in ts])
def captioner():
    if 'cap' not in _M:
        import torch
        name = os.environ.get('VIMG_CAPTIONER', 'smolvlm')
        if name == 'florence':
            from transformers import AutoProcessor, AutoModelForCausalLM
            mid = 'microsoft/Florence-2-base'
            proc = AutoProcessor.from_pretrained(mid, trust_remote_code=True)
            model = AutoModelForCausalLM.from_pretrained(mid, trust_remote_code=True, torch_dtype=torch.float32).eval()
            def cap(im):
                x = proc(text='<CAPTION>', images=im, return_tensors='pt')
                with torch.no_grad(): o = model.generate(input_ids=x['input_ids'], pixel_values=x['pixel_values'], max_new_tokens=40, num_beams=1, do_sample=False)
                return proc.batch_decode(o, skip_special_tokens=True)[0].strip()
        else:
            from transformers import AutoProcessor, AutoModelForVision2Seq
            mid = 'HuggingFaceTB/SmolVLM-256M-Instruct'
            proc = AutoProcessor.from_pretrained(mid)
            try: proc.image_processor.do_image_splitting = False   # 1 ô ảnh = nhanh trên CPU
            except Exception: pass
            model = AutoModelForVision2Seq.from_pretrained(mid, torch_dtype=torch.float32).eval()
            msgs = [{'role': 'user', 'content': [{'type': 'image'}, {'type': 'text', 'text': 'Describe this picture in one short sentence: who or what is shown and what is happening.'}]}]
            prompt = proc.apply_chat_template(msgs, add_generation_prompt=True)
            def cap(im):
                x = proc(text=prompt, images=[im], return_tensors='pt')
                with torch.no_grad(): o = model.generate(**x, max_new_tokens=40, do_sample=False)
                t = proc.batch_decode(o[:, x['input_ids'].shape[1]:], skip_special_tokens=True)[0]
                return re.sub(r'^\s*(Assistant:)?\s*', '', t).strip()
        _M['cap'] = cap
    return _M['cap']
def minilm():
    if 'st' not in _M:
        from sentence_transformers import SentenceTransformer
        _M['st'] = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2', device='cpu')
    return _M['st']
def nsfw(im):
    if 'nsfw' not in _M:
        from transformers import pipeline
        _M['nsfw'] = pipeline('image-classification', model='Falconsai/nsfw_image_detection', device=-1)
    r = _M['nsfw'](im)
    return float(sum(x['score'] for x in r if x['label'].lower() == 'nsfw'))
def ocr(im):
    """số token chữ TIN CẬY (≥ 2 chữ cái/số, conf ≥ 80) – tranh phẳng hay bị tesseract đọc nhầm nét → ngưỡng ocr_max hiệu chỉnh"""
    try:
        import pytesseract
        d = pytesseract.image_to_data(im.convert('L').resize((768, 768)), output_type=pytesseract.Output.DICT, config='--psm 11')
        toks = [t for t, c in zip(d['text'], d['conf']) if re.fullmatch(r'[A-Za-z0-9]{2,}', t.strip() or '') and float(c) >= 80]
        return toks
    except Exception as e:
        return ['ocr-error:' + str(e)[:40]]
def phash(im):
    import imagehash
    return str(imagehash.phash(im))
# ---------- giám khảo API (GrabCast /api/owner-ai/vision, CF llama-4-scout trước) – MÔ TẢ MÙ (không biết từ/câu), rồi xếp hạng như máy chú thích ----------
API_Q = ('Describe this picture for a vocabulary app in one sentence: who or what is shown and what is happening. Do not guess what it was meant to teach. '
         'Reply JSON only: {"describe": "one sentence", "text": true if any letters, words or numbers are visible, "unsafe": true if unsuitable for children}')
_API = {'dead': False, 'calls': 0, 'fails': 0}
def api_vision(im):
    """→ dict | None (None = không có/đã cạn → người gọi xử lý 'API exhausted')"""
    key = os.environ.get('GRABCAST_AI_KEY'); base = os.environ.get('GRABCAST_API_BASE', 'https://grabcast-api-342720596878.us-central1.run.app').rstrip('/')
    if not key or _API['dead'] or os.environ.get('VIMG_API_JUDGE', '1') == '0': return None
    import base64, io, urllib.request, urllib.error
    b = io.BytesIO(); im.convert('RGB').resize((384, 384)).save(b, 'JPEG', quality=85)
    body = json.dumps({'prompt': API_Q, 'image_b64': base64.b64encode(b.getvalue()).decode(), 'mime': 'image/jpeg'}).encode()
    for i in range(5):
        try:
            req = urllib.request.Request(base + '/api/owner-ai/vision', data=body, headers={'X-API-Key': key, 'Content-Type': 'application/json'})
            j = json.loads(urllib.request.urlopen(req, timeout=60).read()); _API['calls'] += 1
            t = j.get('text') or ''; m = re.search(r'\{.*\}', t, re.S)
            try: o = json.loads(m.group(0)) if m else {'describe': t}
            except Exception: o = {'describe': t}
            o['model'] = j.get('model') or j.get('provider') or '?'; return o
        except urllib.error.HTTPError as e:
            if e.code == 503: _API['dead'] = True; print('⏸ GrabCast vision ai_exhausted – hết lượt; chỉ nhận ảnh cục bộ RẤT chắc', flush=True); return None
            if e.code == 429: time.sleep(min(240, float(e.headers.get('Retry-After') or 20 * (i + 1)))); continue   # vision 120/phút/IP
            _API['fails'] += 1; return None
        except Exception:
            time.sleep(3); continue
    _API['fails'] += 1; return None

def framing(im):
    """MỘT khuôn (chủ 24/10): chủ thể ở giữa, chừa lề ~10 %. Đo khung vật = điểm ảnh khác nền viền (trung vị) → lề nhỏ nhất (tỉ lệ cạnh) + lệch tâm."""
    a = np.asarray(im.convert('RGB').resize((128, 128)), np.int16); edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]); bg = np.median(edge, 0)
    m = np.abs(a - bg).max(-1) > 30; ys, xs = np.where(m)
    if not len(xs): return {'margin': 0.0, 'off': 1.0}
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    margin = min(x0, y0, 127 - x1, 127 - y1) / 128; off = max(abs((x0 + x1) / 2 - 63.5), abs((y0 + y1) / 2 - 63.5)) / 128
    return {'margin': round(float(margin), 3), 'off': round(float(off), 3)}

def hamm(a, b): return bin(int(a, 16) ^ int(b, 16)).count('1')

# ---------- nhiễu: anh em cùng chủ đề + từ ngẫu nhiên tất định → đủ 19 ----------
def distractors(k, t, T, LEX, keys_all):
    def text_of(x):
        if x in T and T[x].get('target'): return T[x]['target']
        e = LEX.get(x); return f"an illustration of {e['w']}: {(e.get('def') or '')[:120]}" if e else None
    def refs_of(x):
        if x in T and T[x].get('caption_ref'): return [r for r in T[x]['caption_ref'] if r]
        e = LEX.get(x); return [e['w'], e.get('def') or ''] if e else []
    out, seen = [], {k}
    for x in (t.get('sib') or []):
        if x not in seen and text_of(x): out.append(x); seen.add(x)
        if len(out) >= 12: break
    pool = sorted(keys_all, key=lambda x: fnv(k + '|' + x))
    for x in pool:
        if len(out) >= 19: break
        if x not in seen and text_of(x) and x.split('#')[0] != k.split('#')[0]: out.append(x); seen.add(x)
    return [(x, text_of(x), refs_of(x)) for x in out]

def features(im, k, t, T, LEX, keys_all, centroid):
    ds = distractors(k, t, T, LEX, keys_all)
    v = emb_img(im)
    texts = [t['target']] + [d[1] for d in ds]
    sims = emb_txt(texts) @ v
    order = np.argsort(-sims); rank = int(np.where(order == 0)[0][0]) + 1
    margin = float(sims[0] - np.max(sims[1:]))
    c = captioner()(im)
    st = minilm(); refs = [[r for r in (t.get('caption_ref') or [t['target']]) if r]] + [d[2] or [d[1]] for d in ds]
    flat = [r for rs in refs for r in rs]; E = st.encode([c] + flat, normalize_embeddings=True); ce, R = E[0], E[1:]
    per, i = [], 0
    for rs in refs: per.append(float(np.max(R[i:i + len(rs)] @ ce)) if rs else -1.0); i += len(rs)
    per = np.array(per); crank = int((per > per[0]).sum()) + 1
    api = api_vision(im); arank = asim = None; aflags = {}
    if api and api.get('describe'):
        A = st.encode([str(api['describe'])], normalize_embeddings=True)[0]; ap, i = [], 0
        for rs in refs: ap.append(float(np.max(R[i:i + len(rs)] @ A)) if rs else -1.0); i += len(rs)
        ap = np.array(ap); arank = int((ap > ap[0]).sum()) + 1; asim = round(float(ap[0]), 4); aflags = {'text': api.get('text') is True, 'unsafe': api.get('unsafe') is True}
    fr = framing(im)
    return {'frame': fr, 'api': (api or {}).get('describe'), 'api_model': (api or {}).get('model'), 'api_rank': arank, 'api_sim': asim, **{('api_' + k): v for k, v in aflags.items()},
            'clip_rank': rank, 'clip_margin': round(margin, 4), 'cap': c, 'cap_rank': crank, 'cap_sim': round(float(per[0]), 4),
            'cap_margin': round(float(per[0] - np.max(per[1:])), 4), 'ocr': ocr(im), 'nsfw': round(nsfw(im), 4),
            'style': round(float(v @ centroid), 4) if centroid is not None else None, 'ph': phash(im), '_v': v}

def verdict(f, th, kind):
    r = []
    if f['clip_rank'] != 1 or f['clip_margin'] < th['clip_margin']: r.append(f"clip rank {f['clip_rank']} margin {f['clip_margin']}")
    if f['cap_rank'] != 1 or f['cap_sim'] < th['cap_sim'] or f['cap_margin'] < th['cap_margin']: r.append(f"caption rank {f['cap_rank']} sim {f['cap_sim']}: {f['cap'][:60]}")
    if len(f['ocr']) > th['ocr_max']: r.append('text: ' + ' '.join(f['ocr'])[:40])
    if f['nsfw'] >= th['nsfw_max']: r.append(f"nsfw {f['nsfw']}")
    if f['style'] is not None and f['style'] < th['style_min']: r.append(f"style {f['style']}")
    fr = f.get('frame') or {}
    if kind == 'object' and fr and (fr['margin'] < th.get('frame_min', .04) or fr['off'] > .12): r.append(f"framing margin {fr['margin']} off {fr['off']}")   # cảnh được tràn khung, vật phải ở giữa + có lề
    if th.get('api', True) and not r:
        # chủ 24/10: nhận khi CẢ cục bộ VÀ giám khảo API đồng ý; API cạn → chỉ nhận khi cục bộ RẤT chắc (lề ×2), không thì hàng chờ
        if f.get('api_rank') is None:
            if not (f['clip_margin'] >= 2 * max(th['clip_margin'], .01) and f['cap_margin'] >= 2 * max(th['cap_margin'], .03) and f['cap_sim'] >= th['cap_sim'] + .05): r.append('queue: API judge unavailable, local not very high')
        else:
            if f['api_rank'] != 1 or f['api_sim'] < th.get('api_sim', th['cap_sim']): r.append(f"api rank {f['api_rank']} sim {f['api_sim']}: {str(f.get('api'))[:60]}")
            if f.get('api_text'): r.append('api: text')
            if f.get('api_unsafe'): r.append('api: unsafe')
    return r

def load_th():
    j = json.load(open(TH_FILE)) if os.path.exists(TH_FILE) else {}
    th = {**DEF_TH, **(j.get('th') or {})}
    c = np.array(j['centroid'], dtype=np.float32) if j.get('centroid') else None
    return th, c, j

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--dir', required=True); ap.add_argument('--attempt', type=int, default=1)
    ap.add_argument('--targets'); ap.add_argument('--lex', default=os.path.join(ROOT, 'dist/lexicon.json')); ap.add_argument('--features-only', action='store_true')
    a = ap.parse_args()
    LEX = json.load(open(a.lex)); T = json.load(open(a.targets or os.path.join(a.dir, 'targets.json')))
    th, centroid, _ = load_th()
    img = json.load(open(os.path.join(ROOT, 'content/lexicon/img.json')))
    known = [x.get('ph') for x in img['items'].values() if x.get('ph')]
    slug = lambda k: re.sub(r'[^a-zA-Z0-9_-]+', '-', k.replace('#', '__'))
    keys_all = [k for k in LEX if LEX[k].get('def')]
    out_f = os.path.join(a.dir, f'judge.local.a{a.attempt}.json'); res = json.load(open(out_f)) if os.path.exists(out_f) else {}
    t0, n = time.time(), 0; seen_ph = list(known)
    for k, t in T.items():
        if not t.get('prompt') or not t.get('target'): continue
        f = os.path.join(a.dir, 'raw', f'{slug(k)}.a{a.attempt}.jpg')
        if not os.path.exists(f) or k in res: continue
        im = Image.open(f).convert('RGB')
        ft = features(im, k, t, T, LEX, keys_all, centroid); v = ft.pop('_v'); n += 1
        r = [] if a.features_only else verdict(ft, th, t['kind'])
        if any(hamm(ft['ph'], p) <= th['ph_max'] for p in seen_ph): r.append('duplicate (pHash)')
        seen_ph.append(ft['ph'])
        res[k] = {'pass': not r, 'reasons': r, 'kind': t['kind'], 'f': ft}
        print(k, 'PASS' if not r else 'FAIL', '; '.join(r)[:140], '·', ft['cap'][:70], flush=True)
    json.dump(res, open(out_f, 'w'), indent=1)
    mins = (time.time() - t0) / 60
    json.dump({'images': n, 'minutes': round(mins, 2), 'per_min': round(n / max(mins, 1e-3), 2)}, open(os.path.join(a.dir, f'speed.judge.a{a.attempt}.json'), 'w'))
    fails = [k for k, v in res.items() if not v['pass']]
    if a.attempt == 1: json.dump({'items': fails}, open(os.path.join(a.dir, 'retry.json'), 'w'))
    else: json.dump({'items': fails, '_note': 'trượt 2 lần → hàng chờ; giám khảo API (GrabCast vision / Gemini) tuỳ chọn chỉ chấm hàng này'}, open(os.path.join(a.dir, 'queue.json'), 'w'))
    print(f'giám khảo cục bộ lần {a.attempt}: {sum(v["pass"] for v in res.values())}/{len(res)} đạt · {n} ảnh trong {mins:.1f} phút = {n / max(mins, 1e-3):.1f} ảnh/phút')

if __name__ == '__main__':
    main()
