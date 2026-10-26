"""Lexkite pron model A: fine-tune facebook/wav2vec2-base (Apache-2.0) with a CTC head on 39 ARPAbet phones + blank, on Modal GPU.

Data (commercially usable only): LibriSpeech train-clean-100 (+360 opt., CC BY 4.0, HF parquet mirror openslr/librispeech_asr,
fallback openslr.org tar) labelled with CMUdict (BSD-2; OOV utterances skipped) + speechocean762 TRAIN split (CC BY 4.0, its own
phone labels incl. annotated mispronunciations, mapped to ARPA39). The speechocean762 TEST split is never touched here.

Modes (orchestrated by .github/workflows/pron-train.yml; every GitHub job stays < 6 h):
  modal run --detach modal_train.py --mode start  ...   cost guard -> prepare data (CPU) -> spawn train (GPU) -> writes call id
  modal run modal_train.py --mode wait --call-id X       waits up to --wait-s for the GPU call, writes done=true|false
  modal run modal_train.py --mode export --out DIR       ONNX opset 17 fp32 + q8 (MatMul int8) + q4 (MatMulNBits) -> DIR
  python modal_train.py --cost-only --hours 8 --gpu L4   cost guard only (no Modal call)
Resume-safe: dataset cache + checkpoints on Modal Volume "lexkite-pron"; a re-dispatch with the same layers/include360 resumes.
Cost guard: abort if worst-case (hours + 0.5 h margin) x (GPU + CPU + RAM price) + prep > $12 (Modal Starter credit is $30/month).
"""
import argparse, json, os, sys, time

# Modal list prices (modal.com/pricing, read 26/10/2026), USD per second. CPU = per physical core, RAM = per GiB.
PRICE_S = {'T4': 0.000164, 'L4': 0.000222, 'A10G': 0.000306}
CPU_S, MEM_S = 0.0000131, 0.00000222
TRAIN_CPU, TRAIN_MEM_GB, PREP_CPU, PREP_MEM_GB = 4, 24, 4, 16
BUDGET_USD = 12.0


def estimate_usd(hours, gpu, include360=False, dry_run=False):
    if gpu not in PRICE_S: raise SystemExit(f'unknown gpu {gpu}; choose {list(PRICE_S)}')
    h = (0.15 if dry_run else hours + 0.5)  # worst case = function hard timeout
    train = h * 3600 * (PRICE_S[gpu] + TRAIN_CPU * CPU_S + TRAIN_MEM_GB * MEM_S)
    prep_h = 0.2 if dry_run else (2.5 if include360 else 1.0)
    prep = prep_h * 3600 * (PREP_CPU * CPU_S + PREP_MEM_GB * MEM_S) + 0.3 * 3600 * (4 * CPU_S + 16 * MEM_S)  # + export
    return round(train + prep, 2)


def cost_guard(hours, gpu, include360, dry_run):
    usd = estimate_usd(hours, gpu, include360, dry_run)
    msg = f'cost guard: worst case ~${usd} (gpu={gpu}, hours={hours}, include360={include360}, dry_run={dry_run}); cap ${BUDGET_USD}'
    if usd > BUDGET_USD: raise SystemExit('ABORT ' + msg + ' - lower hours or pick a cheaper GPU')
    print(msg); return usd


if __name__ == '__main__' and '--cost-only' in sys.argv:
    ap = argparse.ArgumentParser(); ap.add_argument('--cost-only', action='store_true'); ap.add_argument('--hours', type=float, default=8)
    ap.add_argument('--gpu', default='L4'); ap.add_argument('--include360', default='false'); ap.add_argument('--dry-run', default='false')
    a = ap.parse_args(); cost_guard(a.hours, a.gpu, a.include360 == 'true', a.dry_run == 'true'); sys.exit(0)

import modal  # noqa: E402

ARPA39 = 'AA AE AH AO AW AY B CH D DH EH ER EY F G HH IH IY JH K L M N NG OW OY P R S SH T TH UH UW V W Y Z ZH'.split()
VOCAB = {'<pad>': 0, **{p: i + 1 for i, p in enumerate(ARPA39)}}  # 0 = CTC blank (= pad, as in HF wav2vec2)
BASE = 'facebook/wav2vec2-base'
GPU = os.environ.get('PRON_GPU', 'L4')
HOURS = float(os.environ.get('PRON_HOURS', '8'))
DRY = os.environ.get('PRON_DRY', 'false') == 'true'
TRAIN_TIMEOUT = int((0.15 if DRY else HOURS + 0.5) * 3600)

app = modal.App('lexkite-pron-train')
vol = modal.Volume.from_name('lexkite-pron', create_if_missing=True)
image = (modal.Image.debian_slim(python_version='3.11').apt_install('libsndfile1', 'curl')
         .pip_install('torch==2.4.1', 'transformers==4.46.3', 'soundfile==0.12.1', 'numpy<2', 'scipy', 'pandas', 'pyarrow',
                      'huggingface_hub', 'onnx==1.17.0', 'onnxruntime==1.20.1'))
V = '/vol'


def _log(*a): print(time.strftime('%H:%M:%S'), *a, flush=True)


# ------------------------------------------------------------------ data (CPU)
@app.function(image=image, volumes={V: vol}, cpu=PREP_CPU, memory=PREP_MEM_GB * 1024, timeout=4 * 3600)
def prepare(include360: bool = False, dry_run: bool = False):
    import io, re, glob, subprocess, urllib.request
    import numpy as np, pandas as pd, soundfile as sf
    from huggingface_hub import hf_hub_download, list_repo_files
    from math import gcd
    from scipy.signal import resample_poly
    D = f'{V}/data'; os.makedirs(D, exist_ok=True)
    strip = lambda p: re.sub(r'\d', '', p.upper())
    # CMUdict (first pronunciation per word)
    cmu_p = f'{D}/cmudict.json'
    if not os.path.exists(cmu_p):
        cmu = {}
        for ln in urllib.request.urlopen('https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict', timeout=120).read().decode('utf8', 'ignore').splitlines():
            a = ln.split()
            if len(a) < 2 or re.search(r'\(\d+\)$', a[0]): continue
            ph = [strip(x) for x in a[1:] if not x.startswith('#')]
            if ph and all(p in VOCAB for p in ph): cmu.setdefault(a[0].lower(), ph)
        json.dump(cmu, open(cmu_p, 'w'))
    cmu = json.load(open(cmu_p))

    def ls_split(hf_dir, tar_name, out_name, limit=None):
        man = f'{D}/{out_name}.jsonl'
        if os.path.exists(man): _log('cached', man); return
        wdir = f'{D}/ls/{out_name}'; os.makedirs(wdir, exist_ok=True); rows, skip = [], 0
        try:
            shards = sorted(f for f in list_repo_files('openslr/librispeech_asr', repo_type='dataset') if f.startswith(hf_dir + '/') and f.endswith('.parquet'))
            assert shards, 'no shards'
            for s in shards:
                df = pd.read_parquet(hf_hub_download('openslr/librispeech_asr', s, repo_type='dataset', cache_dir=f'{V}/hf'), columns=['id', 'text', 'audio'])
                for _, r in df.iterrows():
                    words = r['text'].lower().split()
                    if not all(w in cmu for w in words): skip += 1; continue
                    b = r['audio']['bytes']; dur = sf.info(io.BytesIO(b)).duration
                    if dur > 16.5: skip += 1; continue
                    p = f'{wdir}/{r["id"]}.flac'; open(p, 'wb').write(b)
                    rows.append({'path': p, 'dur': dur, 'ph': [p2 for w in words for p2 in cmu[w]]})
                    if limit and len(rows) >= limit: break
                _log(out_name, s, len(rows), 'skipped', skip)
                if limit and len(rows) >= limit: break
        except Exception as e:  # fallback: openslr tar
            _log('HF parquet failed, openslr tar fallback:', e); rows, skip = [], 0
            tgz = f'{D}/{tar_name}.tar.gz'
            for url in [f'https://www.openslr.org/resources/12/{tar_name}.tar.gz', f'https://us.openslr.org/resources/12/{tar_name}.tar.gz', f'https://openslr.elda.org/resources/12/{tar_name}.tar.gz']:
                if subprocess.run(['curl', '-fsSL', '--retry', '3', '-o', tgz, url]).returncode == 0: break
            else: raise SystemExit(f'LibriSpeech {tar_name} download failed')
            subprocess.check_call(['tar', 'xzf', tgz, '-C', wdir]); os.remove(tgz)
            for tp in sorted(glob.glob(f'{wdir}/LibriSpeech/{tar_name}/*/*/*.trans.txt')):
                for ln in open(tp):
                    uid, txt = ln.strip().split(' ', 1); words = txt.lower().split()
                    if not all(w in cmu for w in words): skip += 1; continue
                    p = os.path.join(os.path.dirname(tp), uid + '.flac'); dur = sf.info(p).duration
                    if dur > 16.5: skip += 1; continue
                    rows.append({'path': p, 'dur': dur, 'ph': [p2 for w in words for p2 in cmu[w]]})
                    if limit and len(rows) >= limit: break
                if limit and len(rows) >= limit: break
        assert rows, f'{out_name}: no usable utterances'
        with open(man, 'w') as f:
            for r in rows: f.write(json.dumps(r) + '\n')
        _log(out_name, 'utts', len(rows), 'hours', round(sum(r['dur'] for r in rows) / 3600, 1), 'OOV/long skipped', skip); vol.commit()

    ls_split('clean/validation', 'dev-clean', 'dev_clean')
    if not dry_run:
        ls_split('clean/train.100', 'train-clean-100', 'train100')
        if include360: ls_split('clean/train.360', 'train-clean-360', 'train360')
    # speechocean762 TRAIN split only
    man = f'{D}/so762_train.jsonl'
    if not os.path.exists(man):
        wdir = f'{D}/so762'; os.makedirs(wdir, exist_ok=True)
        files = [f for f in list_repo_files('mispeech/speechocean762', repo_type='dataset') if f.startswith('data/train') and f.endswith('.parquet')]
        assert files, 'speechocean762 train parquet not found'
        rows, drop = [], 0
        for fp in files:
            df = pd.read_parquet(hf_hub_download('mispeech/speechocean762', fp, repo_type='dataset', cache_dir=f'{V}/hf'))
            for k, r in df.iterrows():
                ph, ok = [], True
                for w in r['words']:
                    can = [strip(x) for x in w['phones']]; acc = [float(a) for a in w['phones-accuracy']]
                    mis = {int(m['index']): str(m['pronounced-phone']) for m in (w.get('mispronunciations') if w.get('mispronunciations') is not None else [])}
                    for i, c in enumerate(can):
                        if i in mis:
                            pr = mis[i]
                            if pr.lower().startswith('<del'): continue
                            pr = strip(pr)
                            if pr not in VOCAB: ok = False; break
                            ph.append(pr)
                        elif c in VOCAB and (i >= len(acc) or acc[i] >= 0.5): ph.append(c)
                        else: ok = False; break  # unknown what was said -> do not teach a wrong label
                    if not ok: break
                if not ok or not ph: drop += 1; continue
                x, sr = sf.read(io.BytesIO(r['audio']['bytes']), dtype='float32')
                if x.ndim > 1: x = x.mean(1)
                if sr != 16000: g = gcd(sr, 16000); x = resample_poly(x, 16000 // g, sr // g).astype('float32')
                p = f'{wdir}/tr_{len(rows):05d}.wav'; sf.write(p, x, 16000, subtype='PCM_16')
                rows.append({'path': p, 'dur': len(x) / 16000, 'ph': ph})
        with open(man, 'w') as f:
            for r in rows: f.write(json.dumps(r) + '\n')
        _log('so762 train utts', len(rows), 'dropped', drop); vol.commit()
    return 'ok'


# ------------------------------------------------------------------ train (GPU)
def _load(path):
    import soundfile as sf, numpy as np
    x, sr = sf.read(path, dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    assert sr == 16000, f'{path}: sr {sr}'
    return (x - x.mean()) / np.sqrt(x.var() + 1e-7)  # feature extractor do_normalize=True


def _per(model, rows, dev, dtype, bs=8):
    import torch, numpy as np
    model.eval(); E = N = 0
    rows = sorted(rows, key=lambda r: r['dur'])
    with torch.no_grad():
        for i in range(0, len(rows), bs):
            b = rows[i:i + bs]; xs = [_load(r['path']) for r in b]; L = max(len(x) for x in xs)
            X = torch.zeros(len(xs), L)
            for j, x in enumerate(xs): X[j, :len(x)] = torch.from_numpy(x)
            with torch.autocast('cuda', dtype=dtype):
                lg = model(X.to(dev)).logits.float()
            ids = lg.argmax(-1).cpu().numpy()
            for j, r in enumerate(b):
                T = model._get_feat_extract_output_lengths(torch.tensor(len(xs[j]))).item()
                hyp, prev = [], -1
                for t in ids[j][:T]:
                    if t != prev and t != 0: hyp.append(int(t))
                    prev = t
                ref = [VOCAB[p] for p in r['ph']]
                d = np.arange(len(hyp) + 1)
                for a in ref:  # Levenshtein, 1 row
                    nd = d.copy(); nd[0] = d[0] + 1
                    for k in range(1, len(hyp) + 1): nd[k] = min(d[k] + 1, nd[k - 1] + 1, d[k - 1] + (hyp[k - 1] != a))
                    d = nd
                E += int(d[-1]); N += len(ref)
    model.train(); return E / max(N, 1)


@app.function(image=image, volumes={V: vol}, gpu=GPU, cpu=TRAIN_CPU, memory=TRAIN_MEM_GB * 1024, timeout=TRAIN_TIMEOUT,
              retries=modal.Retries(max_retries=1, initial_delay=10.0))
def train(run: str, job_id: str, hours: float, steps: int, layers: int, include360: bool, dry_run: bool, eval_every: int = 1000):
    import random, shutil, math
    import numpy as np, torch
    from transformers import Wav2Vec2ForCTC
    D, C = f'{V}/data', f'{V}/ckpt/{run}'
    if dry_run and os.path.exists(C): shutil.rmtree(C)
    os.makedirs(C, exist_ok=True)
    st_p = f'{C}/state.json'
    st = json.load(open(st_p)) if os.path.exists(st_p) else {}
    if st.get('job_id') != job_id:  # new dispatch -> new time box; a Modal retry of the same job keeps the original deadline
        st = {**st, 'job_id': job_id, 'deadline': time.time() + (240 if dry_run else hours * 3600 - 900)}
        json.dump(st, open(st_p, 'w')); vol.commit()
    deadline = st['deadline']
    rd = lambda n: [json.loads(l) for l in open(f'{D}/{n}.jsonl')]
    dev_all = rd('dev_clean'); rnd = random.Random(0); rnd.shuffle(dev_all)
    so = rd('so762_train')
    if dry_run:
        tr, dev = dev_all[100:300], dev_all[:50]; tr += so[:50]; steps = min(steps, 60); eval_every = 30
    else:
        tr = rd('train100') + (rd('train360') if include360 else []) + so * 3  # speechocean762 upsampled x3 (L2 speech)
        dev = dev_all[:500]
    dev_t = torch.device('cuda'); dtype = torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16
    _log('gpu', torch.cuda.get_device_name(0), 'dtype', dtype, 'train utts', len(tr), 'dev', len(dev), 'steps', steps)
    model = Wav2Vec2ForCTC.from_pretrained(BASE, vocab_size=len(VOCAB), pad_token_id=0, ctc_loss_reduction='mean', ctc_zero_infinity=True,
                                           mask_time_prob=0.05, layerdrop=0.05, final_dropout=0.1)
    if layers < model.config.num_hidden_layers:  # student A': keep the first N transformer layers
        model.wav2vec2.encoder.layers = model.wav2vec2.encoder.layers[:layers]; model.config.num_hidden_layers = layers
    model.freeze_feature_encoder(); model.gradient_checkpointing_enable(); model.to(dev_t).train()
    opt = torch.optim.AdamW([p for p in model.parameters() if p.requires_grad], lr=1e-4, weight_decay=0.005)
    warm, freeze_n = max(10, steps // 10), (0 if dry_run else min(2000, steps // 10))
    sched = torch.optim.lr_scheduler.LambdaLR(opt, lambda s: min(1.0, (s + 1) / warm) * max(0.05, 0.5 * (1 + math.cos(math.pi * min(1.0, s / steps)))))
    scaler = torch.cuda.amp.GradScaler(enabled=dtype == torch.float16)
    step, best, cur = 0, st.get('best_per', 9.9), {'epoch': 0, 'pos': 0}
    if os.path.exists(f'{C}/last.pt'):
        ck = torch.load(f'{C}/last.pt', map_location='cpu'); model.load_state_dict(ck['model']); opt.load_state_dict(ck['opt'])
        sched.load_state_dict(ck['sched']); step = ck['step']; cur.update(ck.get('cur', {})); _log('resumed at step', step, 'best PER', best)
    MAX_S = 200.0 if torch.cuda.get_device_properties(0).total_memory > 20e9 else 120.0  # s of audio/batch (24 GB vs T4 16 GB)

    def batches(seed):
        r = random.Random(seed); idx = sorted(range(len(tr)), key=lambda i: tr[i]['dur'] + r.random())
        out, bb = [], []
        for i in idx:
            if bb and (len(bb) + 1) * tr[i]['dur'] > MAX_S: out.append(bb); bb = []
            bb.append(i)
        if bb: out.append(bb)
        r.shuffle(out); return out

    from concurrent.futures import ThreadPoolExecutor
    pool = ThreadPoolExecutor(TRAIN_CPU * 2)

    def collate(b):
        xs = list(pool.map(lambda i: _load(tr[i]['path']), b)); L = max(len(x) for x in xs)
        X = torch.zeros(len(xs), L)
        for j, x in enumerate(xs): X[j, :len(x)] = torch.from_numpy(x)
        ys = [[VOCAB[p] for p in tr[i]['ph']] for i in b]; M = max(len(y) for y in ys)
        Y = torch.full((len(ys), M), -100, dtype=torch.long)
        for j, y in enumerate(ys): Y[j, :len(y)] = torch.tensor(y)
        return X, Y

    def save_last():
        torch.save({'model': model.state_dict(), 'opt': opt.state_dict(), 'sched': sched.state_dict(), 'step': step, 'cur': dict(cur)}, f'{C}/last.tmp')
        os.replace(f'{C}/last.tmp', f'{C}/last.pt'); st.update(step=step, best_per=best); json.dump(st, open(st_p, 'w')); vol.commit()

    def evaluate():
        nonlocal best
        per = _per(model, dev, dev_t, dtype); hist = st.setdefault('history', []); hist.append([step, round(per, 4)])
        _log(f'step {step} dev-clean PER {per:.4f} (best {best:.4f})')
        if per < best:
            best = per; model.save_pretrained(f'{C}/best'); json.dump(VOCAB, open(f'{C}/best/vocab.json', 'w'))
            st['best_step'] = step
        save_last()

    t0, stop = time.time(), 'steps'
    while step < steps and stop == 'steps':
        bl = batches(cur['epoch'])
        while cur['pos'] < len(bl) and step < steps:
            if time.time() > deadline: stop = 'time-box'; break
            for p in model.wav2vec2.encoder.parameters(): p.requires_grad_(step >= freeze_n)
            X, Y = collate(bl[cur['pos']]); cur['pos'] += 1
            with torch.autocast('cuda', dtype=dtype):
                loss = model(X.to(dev_t), labels=Y.to(dev_t)).loss
            opt.zero_grad(set_to_none=True); scaler.scale(loss).backward(); scaler.unscale_(opt)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0); scaler.step(opt); scaler.update(); sched.step(); step += 1
            if step % 100 == 0: _log(f'step {step} loss {loss.item():.3f} lr {sched.get_last_lr()[0]:.2e} {(time.time() - t0) / 3600:.2f} h')
            if step % eval_every == 0: evaluate()
            elif step % 500 == 0: save_last()
        if cur['pos'] >= len(bl): cur['epoch'] += 1; cur['pos'] = 0
    if not st.get('history') or st['history'][-1][0] != step: evaluate()
    st['stop'] = stop; json.dump(st, open(st_p, 'w')); vol.commit()
    _log('done', stop, 'step', step, 'best PER', best)
    return {'run': run, 'step': step, 'best_per': best, 'best_step': st.get('best_step'), 'stop': stop, 'history': st.get('history', [])}


# ------------------------------------------------------------------ export (CPU)
def _fp16_conv_weights(path_in, path_out):
    """Store Conv weights (feature encoder + positional conv, ~9 M params) as fp16 + Cast -> ~18 MB smaller download, same math."""
    import onnx, numpy as np
    from onnx import numpy_helper, helper, TensorProto
    m = onnx.load(path_in); g = m.graph; inits = {i.name: i for i in g.initializer}
    conv_w = {n.input[1] for n in g.node if n.op_type == 'Conv' and len(n.input) > 1 and n.input[1] in inits}
    new_nodes = []
    for name in conv_w:
        t = inits[name]
        if t.data_type != TensorProto.FLOAT: continue
        a = numpy_helper.to_array(t).astype(np.float16); g.initializer.remove(t)
        g.initializer.append(numpy_helper.from_array(a, name + '_f16'))
        new_nodes.append(helper.make_node('Cast', [name + '_f16'], [name], to=TensorProto.FLOAT, name='cast_' + name))
    for nd in reversed(new_nodes): g.node.insert(0, nd)
    onnx.save(m, path_out)


@app.function(image=image, volumes={V: vol}, cpu=4, memory=16 * 1024, timeout=3600)
def export(run: str):
    import numpy as np, torch, onnx, onnxruntime as ort
    from transformers import Wav2Vec2ForCTC
    from onnxruntime.quantization import quantize_dynamic, QuantType
    vol.reload()
    C = f'{V}/ckpt/{run}'; O = f'{C}/onnx'; os.makedirs(O, exist_ok=True)
    st = json.load(open(f'{C}/state.json'))
    model = Wav2Vec2ForCTC.from_pretrained(f'{C}/best').eval(); model.config.layerdrop = 0.0; notes = []
    pc = model.wav2vec2.encoder.pos_conv_embed.conv  # bake weight-norm so the positional conv weight is a plain initializer
    try: torch.nn.utils.parametrize.remove_parametrizations(pc, 'weight')
    except Exception:
        try: torch.nn.utils.remove_weight_norm(pc)
        except Exception as e: notes.append(f'weight-norm not removed: {e}')

    class W(torch.nn.Module):
        def __init__(s, m): super().__init__(); s.m = m
        def forward(s, input_values): return s.m(input_values).logits

    dummy = torch.randn(1, 16000)
    torch.onnx.export(W(model), (dummy,), f'{O}/model_fp32.onnx', input_names=['input_values'], output_names=['logits'],
                      dynamic_axes={'input_values': {0: 'batch', 1: 'samples'}, 'logits': {0: 'batch', 1: 'frames'}}, opset_version=17)
    onnx.checker.check_model(f'{O}/model_fp32.onnx')
    quantize_dynamic(f'{O}/model_fp32.onnx', f'{O}/q8_raw.onnx', weight_type=QuantType.QInt8, op_types_to_quantize=['MatMul'])
    _fp16_conv_weights(f'{O}/q8_raw.onnx', f'{O}/model_q8.onnx'); os.remove(f'{O}/q8_raw.onnx')
    variants = {'fp32': 'model_fp32.onnx', 'q8': 'model_q8.onnx'}
    try:
        try: from onnxruntime.quantization.matmul_nbits_quantizer import MatMulNBitsQuantizer as Q
        except ImportError: from onnxruntime.quantization.matmul_4bits_quantizer import MatMul4BitsQuantizer as Q
        q = Q(onnx.load(f'{O}/model_fp32.onnx'), block_size=32, is_symmetric=True); q.process()
        q.model.save_model_to_file(f'{O}/q4_raw.onnx', use_external_data_format=False)
        _fp16_conv_weights(f'{O}/q4_raw.onnx', f'{O}/model_q4.onnx'); os.remove(f'{O}/q4_raw.onnx'); variants['q4'] = 'model_q4.onnx'
    except Exception as e: notes.append(f'q4 MatMulNBits failed: {e}')
    # parity + quick PER per variant on 100 dev-clean utterances (CPU onnxruntime)
    dev = [json.loads(l) for l in open(f'{V}/data/dev_clean.jsonl')][:100]
    x = _load(dev[0]['path'])[None].astype('float32')
    with torch.no_grad(): ref = model(torch.from_numpy(x)).logits.numpy()
    rep = {'run': run, 'train': {k: st.get(k) for k in ('step', 'best_per', 'best_step', 'stop', 'history')}, 'variants': {}, 'notes': notes}
    for k, f in variants.items():
        s = ort.InferenceSession(f'{O}/{f}', providers=['CPUExecutionProvider'])
        diff = float(np.abs(s.run(None, {'input_values': x})[0] - ref).max()); E = N = 0
        for r in dev:
            lg = s.run(None, {'input_values': _load(r['path'])[None].astype('float32')})[0][0]
            hyp, prev = [], -1
            for t in lg.argmax(-1):
                if t != prev and t != 0: hyp.append(int(t))
                prev = t
            ref_ids = [VOCAB[p] for p in r['ph']]; d = list(range(len(hyp) + 1))
            for a in ref_ids:
                nd = [d[0] + 1] + [0] * len(hyp)
                for j in range(1, len(hyp) + 1): nd[j] = min(d[j] + 1, nd[j - 1] + 1, d[j - 1] + (hyp[j - 1] != a))
                d = nd
            E += d[-1]; N += len(ref_ids)
        rep['variants'][k] = {'size_mb': round(os.path.getsize(f'{O}/{f}') / 1048576, 1), 'max_abs_diff_vs_torch': round(diff, 4), 'PER_dev_clean_100': round(E / N, 4)}
        _log(k, rep['variants'][k])
    json.dump(VOCAB, open(f'{O}/vocab.json', 'w'))
    json.dump({'feature_extractor_type': 'Wav2Vec2FeatureExtractor', 'feature_size': 1, 'sampling_rate': 16000, 'padding_value': 0.0,
               'do_normalize': True, 'return_attention_mask': False}, open(f'{O}/preprocessor_config.json', 'w'))
    json.dump({'repo': f'lexkite/pron-a ({BASE} CTC ARPA39, run {run})', 'variants': variants}, open(f'{O}/meta.json', 'w'))
    json.dump(rep, open(f'{O}/train_report.json', 'w'), indent=1); vol.commit()
    return sorted(os.listdir(O))


# ------------------------------------------------------------------ local entrypoint (GitHub runner)
@app.local_entrypoint()
def main(mode: str = 'start', hours: float = 8.0, steps: int = 20000, layers: int = 12, include360: str = 'false', dry_run: str = 'false',
         gpu: str = 'L4', job_id: str = 'local', call_id: str = '', wait_s: int = 20000, out: str = 'pron-model-a', state: str = 'pron-train-state.json'):
    inc, dry = include360 == 'true', dry_run == 'true'
    run = 'dry' if dry else f'a{layers}' + ('_360' if inc else '')
    if not 1 <= layers <= 12: raise SystemExit('layers must be 1..12')
    if mode == 'start':
        if gpu != GPU or (not dry and hours != HOURS) or dry != DRY: raise SystemExit('set env PRON_GPU/PRON_HOURS/PRON_DRY to match --gpu/--hours/--dry-run')
        cost_guard(hours, gpu, inc, dry)
        prepare.remote(inc, dry)
        fc = train.spawn(run, job_id, hours, steps, layers, inc, dry)
        json.dump({'call_id': fc.object_id, 'run': run}, open(state, 'w')); print('spawned train call', fc.object_id, 'run', run)
    elif mode == 'wait':
        fc = modal.FunctionCall.from_id(call_id)
        try: res = fc.get(timeout=wait_s)
        except (TimeoutError, getattr(modal.exception, 'TimeoutError', TimeoutError)): res = None
        done = res is not None
        json.dump({'done': done, 'result': res, 'run': run}, open(state, 'w')); print('done' if done else 'still running', json.dumps(res)[:2000] if res else '')
    elif mode == 'export':
        files = export.remote(run); os.makedirs(out, exist_ok=True)
        for f in files:
            with open(os.path.join(out, f), 'wb') as fh:
                for chunk in vol.read_file(f'ckpt/{run}/onnx/{f}'): fh.write(chunk)
        print('exported', files)
    else: raise SystemExit('mode must be start|wait|export')
