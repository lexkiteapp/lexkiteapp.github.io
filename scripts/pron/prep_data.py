"""Prepare eval data: speechocean762 test sample + LibriSpeech test-clean subset -> 16 kHz mono wavs + manifest.json.
Datasets: speechocean762 (CC BY 4.0, HF mispeech/speechocean762), LibriSpeech (CC BY 4.0, openslr 12). CMUdict (BSD-2) for LS expected phones."""
import io, json, os, re, subprocess, sys, glob, urllib.request
import numpy as np, soundfile as sf, pandas as pd
from math import gcd
from scipy.signal import resample_poly
from huggingface_hub import hf_hub_download

N_SO, N_LS = int(sys.argv[1]), int(sys.argv[2]); OUT = sys.argv[3]
N_TR = int(sys.argv[4]) if len(sys.argv) > 4 else 0  # speechocean762 TRAIN sample: only for fitting CALIB (never fit on test)
os.makedirs(OUT + '/wav', exist_ok=True)
ARPA = set('AA AE AH AO AW AY B CH D DH EH ER EY F G HH IH IY JH K L M N NG OW OY P R S SH T TH UH UW V W Y Z ZH'.split())
strip = lambda p: re.sub(r'\d', '', p.upper())

def to16k(x, sr):
    if x.ndim > 1: x = x.mean(1)
    if sr != 16000:
        g = gcd(sr, 16000); x = resample_poly(x, 16000 // g, sr // g)
    return x.astype('float32')

items = []
# ---- speechocean762 test
p = hf_hub_download('mispeech/speechocean762', 'data/test-00000-of-00001.parquet', repo_type='dataset')
df = pd.read_parquet(p)
idx = np.random.RandomState(7).permutation(len(df))
for i in idx:
    if sum(1 for it in items if it['set'] == 'so') >= N_SO: break
    r = df.iloc[int(i)]
    exp, lab = [], []
    for w in r['words']:
        exp += [strip(x) for x in w['phones']]; lab += [float(a) for a in w['phones-accuracy']]
    if not exp or len(exp) != len(lab) or any(e not in ARPA for e in exp): continue
    x, sr = sf.read(io.BytesIO(r['audio']['bytes']), dtype='float32')
    x = to16k(x, sr)
    name = f'so_{len(items):04d}.wav'
    sf.write(f'{OUT}/wav/{name}', x, 16000, subtype='PCM_16')
    items.append({'set': 'so', 'wav': name, 'text': r['text'], 'expected': exp, 'labels': lab, 'dur': len(x) / 16000})
print('so', len(items))
# ---- speechocean762 TRAIN sample (set 'tr'): calibration fit only, never scored as a metric
if N_TR:
    dtr = pd.read_parquet(hf_hub_download('mispeech/speechocean762', 'data/train-00000-of-00001.parquet', repo_type='dataset'))
    ntr = 0
    for i in np.random.RandomState(11).permutation(len(dtr)):
        if ntr >= N_TR: break
        r = dtr.iloc[int(i)]; exp, lab = [], []
        for w in r['words']:
            exp += [strip(x) for x in w['phones']]; lab += [float(a) for a in w['phones-accuracy']]
        if not exp or len(exp) != len(lab) or any(e not in ARPA for e in exp): continue
        x, sr = sf.read(io.BytesIO(r['audio']['bytes']), dtype='float32'); x = to16k(x, sr)
        name = f'tr_{ntr:04d}.wav'; sf.write(f'{OUT}/wav/{name}', x, 16000, subtype='PCM_16')
        items.append({'set': 'tr', 'wav': name, 'text': r['text'], 'expected': exp, 'labels': lab, 'dur': len(x) / 16000}); ntr += 1
    print('tr', ntr)

# ---- CMUdict
cmu = {}
req = urllib.request.urlopen('https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict', timeout=120)
for ln in req.read().decode('utf8', 'ignore').splitlines():
    a = ln.split()
    if len(a) < 2 or a[0].endswith(')') and re.search(r'\(\d+\)$', a[0]): continue
    cmu.setdefault(a[0].lower(), [strip(x) for x in a[1:]])

# ---- LibriSpeech test-clean
tgz = os.environ.get('RUNNER_TEMP', '/tmp') + '/test-clean.tar.gz'
for url in ['https://www.openslr.org/resources/12/test-clean.tar.gz', 'https://us.openslr.org/resources/12/test-clean.tar.gz', 'https://openslr.elda.org/resources/12/test-clean.tar.gz']:
    if subprocess.run(['curl', '-fsSL', '--retry', '3', '-o', tgz, url]).returncode == 0: break
else: sys.exit('LibriSpeech download failed')
ex = os.environ.get('RUNNER_TEMP', '/tmp') + '/ls'
os.makedirs(ex, exist_ok=True); subprocess.check_call(['tar', 'xzf', tgz, '-C', ex])
utts = []
for tp in sorted(glob.glob(ex + '/LibriSpeech/test-clean/*/*/*.trans.txt')):
    for ln in open(tp):
        uid, txt = ln.strip().split(' ', 1)
        words = txt.lower().split()
        if all(w in cmu for w in words): utts.append((uid, txt, words, os.path.join(os.path.dirname(tp), uid + '.flac')))
step = max(1, len(utts) // max(N_LS, 1)); n = 0
for uid, txt, words, fp in utts[::step]:
    if n >= N_LS: break
    x, sr = sf.read(fp, dtype='float32'); x = to16k(x, sr)
    if len(x) / 16000 > 16: continue
    name = f'ls_{n:04d}.wav'; sf.write(f'{OUT}/wav/{name}', x, 16000, subtype='PCM_16')
    items.append({'set': 'ls', 'wav': name, 'text': txt, 'expected': [p for w in words for p in cmu[w]], 'dur': len(x) / 16000}); n += 1
print('ls', n)
assert any(i['set'] == 'so' for i in items) and n > 0, 'empty dataset'
json.dump(items, open(OUT + '/manifest.json', 'w'))
