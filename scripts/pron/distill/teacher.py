"""Stage `teacher`, one shard: run teacher C (q8 ONNX, CPU) over LibriSpeech/speechocean762 utterances -> npz with 8-bit log-mel codes, top-5 soft targets
(ARPA39+blank) and CMUdict / speechocean762 CTC labels. python teacher.py '<shard json>' OUT.npz MODEL_DIR [limit]"""
import io, json, os, re, sys, time, urllib.request
from math import gcd
from unittest import mock
import numpy as np, soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'train'))
import common as C
sys.modules.setdefault('modal', mock.MagicMock())
import modal_train as MT   # so762_phones / lev only (Modal path untouched)
import torch, onnxruntime as ort, pandas as pd
from huggingface_hub import hf_hub_download
from scipy.signal import resample_poly
from student import LogMel

LS, SO = 'openslr/librispeech_asr', 'mispeech/speechocean762'


def cmudict():
    cmu = {}
    for ln in urllib.request.urlopen('https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict', timeout=120).read().decode('utf8', 'ignore').splitlines():
        a = ln.split()
        if len(a) < 2 or re.search(r'\(\d+\)$', a[0]): continue
        ph = [re.sub(r'\d', '', x.upper()) for x in a[1:] if not x.startswith('#')]
        if ph and all(p in C.VOCAB for p in ph): cmu.setdefault(a[0].lower(), ph)
    return cmu


def to16k(b):
    x, sr = sf.read(io.BytesIO(b), dtype='float32')
    if x.ndim > 1: x = x.mean(1)
    if sr != 16000: g = gcd(sr, 16000); x = resample_poly(x, 16000 // g, sr // g).astype('float32')
    return x


def utterances(sh, cmu, limit):
    if sh['kind'] == 'so':
        for fp in sorted(f for f in __import__('huggingface_hub').list_repo_files(SO, repo_type='dataset') if f.startswith('data/train') and f.endswith('.parquet')):
            for _, r in pd.read_parquet(hf_hub_download(SO, fp, repo_type='dataset')).iterrows():
                ph = MT.so762_phones(r['words'])
                if ph: yield to16k(r['audio']['bytes']), [C.VOCAB[p] for p in ph]
    else:
        df = pd.read_parquet(hf_hub_download(LS, sh['file'], repo_type='dataset'), columns=['id', 'text', 'audio'])
        for i, r in enumerate(df.itertuples()):
            if i % sh.get('nparts', 1) != sh.get('part', 0): continue
            words = r.text.lower().split()
            if not all(w in cmu for w in words): continue
            x = to16k(r.audio['bytes'])
            if len(x) > 16.5 * 16000: continue
            yield x, [C.VOCAB[p] for w in words for p in cmu[w]]


def main(sh, out, mdir, limit):
    if sh['kind'] == 'dev' and not limit: limit = 300
    t0 = time.time(); torch.set_num_threads(4)
    meta = json.load(open(f'{mdir}/meta.json')); cls, _ = C.map_vocab(json.load(open(f'{mdir}/vocab.json')))
    so = ort.SessionOptions(); so.intra_op_num_threads = 4
    sess = ort.InferenceSession(f'{mdir}/{meta["variants"]["q8"]}', so, providers=['CPUExecutionProvider']); inn = sess.get_inputs()[0].name
    front, cmu = LogMel().eval(), (cmudict() if sh['kind'] != 'so' else None)
    mel, tid, tlp, lab, mo, to, lo = [], [], [], [], [0], [0], [0]; n = 0
    for x, ph in utterances(sh, cmu, limit):
        xn = ((x - x.mean()) / np.sqrt(x.var() + 1e-7)).astype('float32')
        lg = sess.run(None, {inn: xn[None]})[0][0]
        ids, lp = C.pack_topk(C.collapse_logits(lg, cls))
        with torch.no_grad(): m = front.codes(torch.from_numpy(xn)[None])[0].numpy().astype('uint8')
        mel.append(m); tid.append(ids); tlp.append(lp); lab.append(np.array(ph, 'int8'))
        mo.append(mo[-1] + len(m)); to.append(to[-1] + len(ids)); lo.append(lo[-1] + len(ph)); n += 1
        if n % 200 == 0: print(f'{sh["id"]}: {n} utts, {mo[-1] / 100 / 3600:.2f} h audio, {time.time() - t0:.0f}s', flush=True)
        if limit and n >= limit: break
    assert n, f'{sh["id"]}: no utterances'
    np.savez(out, mel=np.concatenate(mel), tid=np.concatenate(tid), tlp=np.concatenate(tlp), lab=np.concatenate(lab),
             mo=np.array(mo, 'int64'), to=np.array(to, 'int64'), lo=np.array(lo, 'int64'))
    print(f'{sh["id"]}: done {n} utts, {mo[-1] / 100 / 3600:.2f} h, {time.time() - t0:.0f}s, {os.path.getsize(out) / 1e6:.0f} MB', flush=True)


if __name__ == '__main__':
    main(json.loads(sys.argv[1]), sys.argv[2], sys.argv[3], int(sys.argv[4]) if len(sys.argv) > 4 else 0)
