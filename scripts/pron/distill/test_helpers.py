"""Unit tests for the pure helpers (no network): python3 scripts/pron/distill/test_helpers.py  (torch tests run only when torch is installed)"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np, common as C
assert len(C.VOCAB) == 40 and C.VOCAB['<pad>'] == 0 and C.VOCAB['ZH'] == 39
# vocab mapping (parsed from vocab-map.mjs): espeak IPA + ARPA labels + unmapped + pad
ipa = C._ipa_table(); assert len(ipa) > 60 and ipa['ə'] == 'AH' and ipa['tʃ'] == 'CH' and ipa['n'] == 'N' and ipa['ɑːɹ'] == 'AA'
cls, blank = C.map_vocab({'<pad>': 0, '<s>': 1, 'n': 2, 'ə': 3, 'tʃ': 4, 'ɾ': 5, 'ah': 6, 'AA': 7})
assert blank == 0 and cls == [0, -1, C.VOCAB['N'], C.VOCAB['AH'], C.VOCAB['CH'], -1, C.VOCAB['AH'], C.VOCAB['AA']], cls
# collapse: mass of tokens mapping to the same phone is summed, unmapped dropped, rows normalised
lg = np.log(np.array([[0.1, 0.5, 0.2, 0.1, 0.05, 0.05, 0.0 + 1e-9, 1e-9]])); lp = C.collapse_logits(lg, cls)
assert lp.shape == (1, 40) and abs(np.exp(lp).sum() - 1) < 1e-5 and np.exp(lp[0, C.VOCAB['N']]) > np.exp(lp[0, C.VOCAB['CH']])
# top-k pack / unpack round trip
rng = np.random.default_rng(0); x = rng.normal(size=(7, 40)); x = x - np.log(np.exp(x).sum(1, keepdims=True))
ids, lpk = C.pack_topk(x); assert ids.dtype == np.uint8 and lpk.dtype == np.float16 and ids.shape == (7, 5)
assert (ids[:, 0] == x.argmax(1)).all(); d = C.unpack_topk(ids, lpk)
assert d.shape == (7, 40) and np.allclose(d[np.arange(7)[:, None], ids.astype(int)], lpk.astype('float32')) and (d > -30).sum() == 35
# chain logic
assert C.next_action(100, 100, 1, 12) == 'export' and C.next_action(50, 100, 3, 12) == 'redispatch' and C.next_action(50, 100, 12, 12) == 'export'
# shard planning: 14 files / 20 shards (ceil) -> 2 parts per file
fs = [f'f{i}.parquet' for i in range(14)]; sh = C.shard_assets(fs, 20)
assert len(sh) == 28 and sh[0]['id'] == 'ls-00-0' and sh[1]['part'] == 1 and C.asset_name('so') == 'shard-so.npz' and len(C.shard_assets(fs, 2)) == 14
try:
    import torch
except ImportError:
    print('torch not installed: skipping student tests')
else:
    from student import Student, LogMel, param_count
    m = Student().eval(); n = param_count(m); assert 8e6 < n < 20e6, n
    w = torch.randn(1, 16000)
    with torch.no_grad(): c = m.front.codes(w); y = m(w)
    assert c.shape == (1, 98, 80) and y.shape == (1, 49, 40) and Student.out_len(98) == 49, (c.shape, y.shape)
    # batched path with lengths == single path
    with torch.no_grad(): y2 = m.from_codes(torch.cat([torch.cat([c, torch.zeros(1, 20, 80)], 1)] * 2), torch.tensor([98, 98]))[0:1, :49]
    assert torch.allclose(y, y2, atol=1e-3), (y - y2).abs().max()
    print(f'student {n / 1e6:.1f} M params')
print('ok: pron distill helpers')
