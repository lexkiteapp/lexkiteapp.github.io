"""Stage `train`: CTC (CMUdict labels) + KL (teacher top-5) distillation of the Conformer student on CPU, time-boxed, resume-safe.
python train.py TAG BUDGET_MIN TOTAL_STEPS CHAIN MAX_CHAIN [WORKDIR]   -> writes finished=true|false to $GITHUB_OUTPUT.
Checkpoint = release asset `pron-student-ckpt.pt` on TAG (model, best model, optimiser, step, best dev PER); best by dev-clean PER."""
import glob, math, os, random, sys, time
import numpy as np, torch, torch.nn.functional as F
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'train'))
from unittest import mock
sys.modules.setdefault('modal', mock.MagicMock())
import common as C, modal_train as MT
from student import Student, param_count

CK = 'pron-student-ckpt.pt'; CKN = 'pron-student-ckpt.new.pt'
BATCH_FRAMES, LR, WARM, W_KL = 6000, 1.5e-3, 1500, 1.0   # 6000 mel frames = 60 s audio per batch


class Data:
    def __init__(s, files):
        s.sh = [dict(np.load(f)) for f in files]
        s.idx = [(i, j) for i, d in enumerate(s.sh) for j in range(len(d['mo']) - 1)]
        s.len = np.array([s.sh[i]['mo'][j + 1] - s.sh[i]['mo'][j] for i, j in s.idx])
    def item(s, k):
        i, j = s.idx[k]; d = s.sh[i]; a, b = d['mo'][j], d['mo'][j + 1]; ta, tb = d['to'][j], d['to'][j + 1]; la, lb = d['lo'][j], d['lo'][j + 1]
        return d['mel'][a:b], d['tid'][ta:tb], d['tlp'][ta:tb], d['lab'][la:lb]
    def batches(s, seed):
        rng = random.Random(seed); order = sorted(range(len(s.idx)), key=lambda k: s.len[k] + rng.random() * 300)
        bs, cur, mx = [], [], 0
        for k in order:
            mx2 = max(mx, s.len[k])
            if cur and mx2 * (len(cur) + 1) > BATCH_FRAMES: bs.append(cur); cur, mx2 = [], s.len[k]
            cur.append(k); mx = mx2
        if cur: bs.append(cur)
        rng.shuffle(bs); return bs
    def collate(s, ks):
        its = [s.item(k) for k in ks]; B = len(its); lens = torch.tensor([len(i[0]) for i in its]); Tm = int(lens.max()); T = (Tm + 1) // 2
        mel = torch.zeros(B, Tm, 80); tid = torch.zeros(B, T, C.TOPK, dtype=torch.long); tlp = torch.full((B, T, C.TOPK), -30.0); tv = torch.zeros(B, T)
        for b, (m, ti, tl, _) in enumerate(its):
            mel[b, :len(m)] = torch.from_numpy(m.astype('float32')); n = min(len(ti), T)
            tid[b, :n] = torch.from_numpy(ti[:n].astype('int64')); tlp[b, :n] = torch.from_numpy(tl[:n].astype('float32')); tv[b, :n] = 1
        lab = torch.cat([torch.from_numpy(i[3].astype('int64')) for i in its]); ll = torch.tensor([len(i[3]) for i in its])
        return mel, lens, tid, tlp, tv, lab, ll


def losses(model, batch, specaug=True):
    mel, lens, tid, tlp, tv, lab, ll = batch
    lg = model.from_codes(mel, lens, specaug); T = lg.shape[1]; lp = lg.log_softmax(-1)
    ol = ((lens + 1) // 2).clamp(max=T); ctc = F.ctc_loss(lp.transpose(0, 1), lab, ol, ll, blank=0, reduction='sum', zero_infinity=True) / ll.sum()
    n = min(T, tid.shape[1]); lp, tid, tlp, tv = lp[:, :n], tid[:, :n], tlp[:, :n], tv[:, :n]
    ps = lp.gather(-1, tid); pt = tlp.exp(); ro_t = (1 - pt.sum(-1)).clamp(min=1e-6); ro_s = (1 - ps.exp().sum(-1)).clamp(min=1e-6)
    kl = (pt * (tlp - ps)).sum(-1) + ro_t * (ro_t.log() - ro_s.log())
    return ctc, (kl * tv).sum() / tv.sum().clamp(min=1)


def dev_per(model, dev, max_utts=300):
    model.eval(); E = N = 0
    with torch.no_grad():
        for k in range(min(max_utts, len(dev.idx))):
            m, _, _, lab = dev.item(k); ids = model.from_codes(torch.from_numpy(m.astype('float32'))[None])[0].argmax(-1).numpy()
            hyp = [int(x) for i, x in enumerate(ids) if x != 0 and (i == 0 or x != ids[i - 1])]; ref = [int(x) for x in lab]
            E += MT.lev(hyp, ref); N += len(ref)
    model.train(); return E / max(N, 1)


def lr_at(step, total): return LR * min(1, (step + 1) / WARM) * (0.5 * (1 + math.cos(math.pi * min(1, step / total))) * 0.97 + 0.03)


def main(tag, budget_min, total, chain, max_chain, wd):
    t0 = time.time(); os.makedirs(wd, exist_ok=True); torch.set_num_threads(os.cpu_count() or 4); torch.manual_seed(chain)
    files = sorted(glob.glob(f'{wd}/shard-*.npz'))
    if not files:
        for name in sorted(C.list_assets(tag)):
            if name.startswith('shard-'): C.download_asset(tag, name, f'{wd}/{name}')
        files = sorted(glob.glob(f'{wd}/shard-*.npz'))
    dev_f = [f for f in files if f.endswith('shard-dev.npz')]; tr_f = [f for f in files if not f.endswith('shard-dev.npz')]
    assert dev_f and tr_f, f'need dev + train shards, have {files}'
    tr, dev = Data(tr_f), Data(dev_f); print(f'train utts {len(tr.idx)} ({tr.len.sum() / 100 / 3600:.1f} h), dev utts {len(dev.idx)}', flush=True)
    model = Student(); opt = torch.optim.AdamW(model.parameters(), lr=LR, betas=(0.9, 0.98), weight_decay=0.01)
    st = {'step': 0, 'best_per': 9.0, 'epoch': 0, 'hist': []}; best = None; ck = f'{wd}/{CK}'
    if C.download_asset(tag, CK, ck) or C.download_asset(tag, CKN, ck):
        d = torch.load(ck, map_location='cpu'); model.load_state_dict(d['model']); opt.load_state_dict(d['opt']); st = d['state']; best = d.get('best')
        print(f'resumed step {st["step"]} epoch {st["epoch"]} best_per {st["best_per"]:.4f}', flush=True)
    print(f'student params {param_count(model) / 1e6:.2f} M, chain {chain}/{max_chain}', flush=True)
    model.train(); deadline = t0 + budget_min * 60; last_save = last_eval = time.time(); ema = None

    def save():   # upload under a temp name first, then replace: a crash never leaves the chain without a checkpoint
        torch.save({'model': model.state_dict(), 'opt': opt.state_dict(), 'state': st, 'best': best}, ck)
        C.upload_asset(tag, ck, CKN); C.upload_asset(tag, ck, CK)
        old = C.list_assets(tag).get(CKN)
        if old: C._api(f'/releases/assets/{old["id"]}', 'DELETE')

    def evaluate():
        nonlocal best
        per = dev_per(model, dev); st['hist'].append([st['step'], round(per, 4)])
        if per < st['best_per']: st['best_per'] = per; best = {k: v.clone() for k, v in model.state_dict().items()}
        print(f'EVAL step {st["step"]} dev PER {per:.4f} (best {st["best_per"]:.4f})', flush=True)

    done = False
    while not done:
        for ks in tr.batches(st['epoch'] * 1000 + chain):
            if st['step'] >= total or time.time() > deadline: done = True; break
            for g in opt.param_groups: g['lr'] = lr_at(st['step'], total)
            ctc, kl = losses(model, tr.collate(ks)); loss = ctc + W_KL * kl
            opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0); opt.step(); st['step'] += 1
            ema = loss.item() if ema is None else 0.98 * ema + 0.02 * loss.item()
            if st['step'] % 50 == 0: print(f'step {st["step"]} ctc {ctc.item():.3f} kl {kl.item():.3f} ema {ema:.3f} lr {opt.param_groups[0]["lr"]:.2e} {(time.time() - t0) / 60:.0f} min', flush=True)
            if time.time() - last_eval > 3000: evaluate(); last_eval = time.time()
            if time.time() - last_save > 3300: save(); last_save = time.time()
        else: st['epoch'] += 1
    evaluate(); save()
    fin = C.next_action(st['step'], total, chain, max_chain) == 'export'
    print(f'chunk done: step {st["step"]}/{total}, best dev PER {st["best_per"]:.4f}, finished={fin}', flush=True)
    with open(os.environ.get('GITHUB_OUTPUT', os.devnull), 'a') as f: f.write(f'finished={"true" if fin else "false"}\nstep={st["step"]}\nper={st["best_per"]:.4f}\n')


if __name__ == '__main__':
    a = sys.argv; main(a[1], float(a[2]), int(a[3]), int(a[4]), int(a[5]), a[6] if len(a) > 6 else 'dd')
