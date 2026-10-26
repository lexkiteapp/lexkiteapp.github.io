"""Pure helpers shared by the CPU distillation pipeline (no torch needed): ARPA39 vocab, espeak->ARPA39 map (parsed from
scripts/pron/vocab-map.mjs so the two never drift), top-k soft-target pack/unpack, chain logic, shard names, GitHub release I/O."""
import json, os, re, subprocess, urllib.request

ARPA39 = 'AA AE AH AO AW AY B CH D DH EH ER EY F G HH IH IY JH K L M N NG OW OY P R S SH T TH UH UW V W Y Z ZH'.split()
VOCAB = {'<pad>': 0, **{p: i + 1 for i, p in enumerate(ARPA39)}}   # 0 = CTC blank, same as modal_train.py / vocab.json
NV, TOPK = 40, 5
HERE = os.path.dirname(os.path.abspath(__file__))


def _ipa_table():
    src = open(os.path.join(HERE, '..', 'vocab-map.mjs'), encoding='utf8').read()
    blk = src.split('const IPA = {', 1)[1].split('};', 1)[0]
    return {(a or b): c for a, b, c in re.findall(r"(?:'([^']+)'|\b([A-Za-z]+)\b)\s*:\s*'([A-Z]+)'", blk)}


def map_vocab(vocab_json):
    """{token: id} -> (cls list id->0..39 or -1, teacher blank id). Port of mapVocab() in vocab-map.mjs (student ids: blank 0, ARPA 1..39)."""
    ipa, n = _ipa_table(), max(vocab_json.values()) + 1
    cls, blank = [-1] * n, -1
    for tok, i in vocab_json.items():
        raw = tok.strip()
        if raw in ('<pad>', '[PAD]', '<PAD>'): blank = i; cls[i] = 0; continue
        a = raw.upper() if raw.upper() in VOCAB else ipa.get(raw)
        if a in VOCAB and a != '<pad>': cls[i] = VOCAB[a]
    if blank < 0: raise ValueError('no <pad> token in vocab')
    return cls, blank


def collapse_logits(logits, cls):
    """[T,Vt] teacher logits -> [T,40] log-softmax over (blank + ARPA39); unmapped tokens are dropped (as collapse() in gop.mjs)."""
    import numpy as np
    x = logits.astype('float64'); x = np.exp(x - x.max(1, keepdims=True))
    M = np.zeros((x.shape[1], NV)); [M.__setitem__((i, c), 1.0) for i, c in enumerate(cls) if c >= 0]
    p = x @ M; p /= p.sum(1, keepdims=True)
    return np.log(np.maximum(p, 1e-30)).astype('float32')


def pack_topk(logp, k=TOPK):
    """[T,V<=255] log-probs -> (ids uint8 [T,k], logp float16 [T,k]) sorted high->low."""
    import numpy as np
    idx = np.argsort(-logp, 1)[:, :k]
    return idx.astype('uint8'), np.take_along_axis(logp, idx, 1).astype('float16')


def unpack_topk(ids, lp, V=NV, floor=-30.0):
    """Inverse of pack_topk -> dense [T,V] float32 (non top-k entries = floor)."""
    import numpy as np
    out = np.full((ids.shape[0], V), floor, 'float32')
    np.put_along_axis(out, ids.astype('int64'), lp.astype('float32'), 1)
    return out


def next_action(step, total, chain, max_chain):
    """End of a train chunk: 'export' when converged or the chain cap is hit, else 'redispatch' (chain is the 1-based index of this run)."""
    if step >= total: return 'export'
    return 'export' if chain >= max_chain else 'redispatch'


def shard_assets(files, nshards):
    """Plan LibriSpeech shards: each parquet file split by row stripes so ~nshards shards exist. -> [{id,kind,file,part,nparts}]"""
    nparts = max(1, round(nshards / max(1, len(files))))
    return [{'id': f'ls-{fi:02d}-{p}', 'kind': 'ls', 'file': f, 'part': p, 'nparts': nparts} for fi, f in enumerate(files) for p in range(nparts)]


def asset_name(shard_id): return f'shard-{shard_id}.npz'


# ---- GitHub release assets (stdlib + curl; never prints the token) ----
REPO = os.environ.get('GITHUB_REPOSITORY', 'lexkiteapp/lexkiteapp.github.io')
API = f'https://api.github.com/repos/{REPO}'
def _tok(): return os.environ.get('GH_TOKEN') or os.environ.get('GITHUB_TOKEN') or ''
def _api(path, method='GET', body=None, base=API):
    req = urllib.request.Request(base + path, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Authorization': 'Bearer ' + _tok(), 'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=120) as r:
        d = r.read(); return json.loads(d) if d else {}


def ensure_release(tag, prerelease=True, body=''):
    try: return _api(f'/releases/tags/{tag}')
    except urllib.error.HTTPError as e:
        if e.code != 404: raise
    try: return _api('/releases', 'POST', {'tag_name': tag, 'target_commitish': 'main', 'name': tag, 'prerelease': prerelease, 'body': body})
    except urllib.error.HTTPError: return _api(f'/releases/tags/{tag}')   # lost a creation race


def list_assets(tag):
    try: rel = _api(f'/releases/tags/{tag}')
    except urllib.error.HTTPError as e:
        if e.code == 404: return {}
        raise
    out, page = {}, 1
    while True:
        a = _api(f'/releases/{rel["id"]}/assets?per_page=100&page={page}')
        for x in a: out[x['name']] = x
        if len(a) < 100: return out
        page += 1


def upload_asset(tag, path, name=None, replace=True):
    name = name or os.path.basename(path); rel = ensure_release(tag); old = list_assets(tag).get(name)
    if old and replace: _api(f'/releases/assets/{old["id"]}', 'DELETE')
    elif old: return old
    subprocess.run(['curl', '-fsS', '--retry', '3', '-H', 'Authorization: Bearer ' + _tok(), '-H', 'Content-Type: application/octet-stream', '--data-binary', '@' + path,
                    f'https://uploads.github.com/repos/{REPO}/releases/{rel["id"]}/assets?name={name}', '-o', os.devnull], check=True)


def download_asset(tag, name, dest):
    """Public repo: browser_download_url needs no token. Returns False when the asset does not exist."""
    if name not in list_assets(tag): return False
    subprocess.run(['curl', '-fsSL', '--retry', '3', '-o', dest, f'https://github.com/{REPO}/releases/download/{tag}/{name}'], check=True)
    return True


def dispatch(workflow, inputs, ref='main'):
    _api(f'/actions/workflows/{workflow}/dispatches', 'POST', {'ref': ref, 'inputs': {k: str(v) for k, v in inputs.items()}})


if __name__ == '__main__':   # tiny CLI used by the workflow: python common.py dispatch <wf> k=v ... | upload TAG PATH NAME [replace]
    import sys
    if sys.argv[1] == 'dispatch': dispatch(sys.argv[2], dict(a.split('=', 1) for a in sys.argv[3:]))
    if sys.argv[1] == 'upload': upload_asset(sys.argv[2], sys.argv[3], sys.argv[4], replace=len(sys.argv) > 5 and sys.argv[5] == 'replace')
