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
DEF_TH = {'clip_margin': 0.02, 'cap_sim': 0.45, 'cap_margin': 0.05, 'ocr_max': 0, 'nsfw_max': 0.2, 'style_min': 0.70, 'ph_max': 6}

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
    return {'clip_rank': rank, 'clip_margin': round(margin, 4), 'cap': c, 'cap_rank': crank, 'cap_sim': round(float(per[0]), 4),
            'cap_margin': round(float(per[0] - np.max(per[1:])), 4), 'ocr': ocr(im), 'nsfw': round(nsfw(im), 4),
            'style': round(float(v @ centroid), 4) if centroid is not None else None, 'ph': phash(im), '_v': v}

def verdict(f, th, kind):
    r = []
    if f['clip_rank'] != 1 or f['clip_margin'] < th['clip_margin']: r.append(f"clip rank {f['clip_rank']} margin {f['clip_margin']}")
    if f['cap_rank'] != 1 or f['cap_sim'] < th['cap_sim'] or f['cap_margin'] < th['cap_margin']: r.append(f"caption rank {f['cap_rank']} sim {f['cap_sim']}: {f['cap'][:60]}")
    if len(f['ocr']) > th['ocr_max']: r.append('text: ' + ' '.join(f['ocr'])[:40])
    if f['nsfw'] >= th['nsfw_max']: r.append(f"nsfw {f['nsfw']}")
    if f['style'] is not None and f['style'] < th['style_min']: r.append(f"style {f['style']}")
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
