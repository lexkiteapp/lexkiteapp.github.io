"""Small Conformer-CTC student (~12 M params) with the log-mel front-end INSIDE the graph (input = normalised 16 kHz waveform, exactly like the
wav2vec2 candidates, so scripts/pron/eval.mjs works unchanged). Output: logits [B,T,40] at 50 frames/s (vocab = blank + ARPA39, see common.VOCAB).
Front-end = DFT as Conv1d (ONNX friendly) -> 80 mel -> ln -> 8-bit quantise/dequantise (the shards store the uint8 codes, train == inference)."""
import math, numpy as np, torch, torch.nn as nn, torch.nn.functional as F

SR, NFFT, HOP, NMEL = 16000, 400, 160, 80
LO, SCALE = -8.0, 12.75          # code = round((ln(mel+1e-6) - LO) * SCALE) in 0..255  -> range [-8, 12]


def mel_matrix(n_mel=NMEL, n_fft=NFFT, sr=SR, fmin=20.0, fmax=7600.0):
    hz2m = lambda f: 2595 * np.log10(1 + f / 700); m2hz = lambda m: 700 * (10 ** (m / 2595) - 1)
    pts = m2hz(np.linspace(hz2m(fmin), hz2m(fmax), n_mel + 2)); fr = np.linspace(0, sr / 2, n_fft // 2 + 1)
    W = np.zeros((n_mel, len(fr)), 'float32')
    for i in range(n_mel):
        l, c, r = pts[i:i + 3]; W[i] = np.maximum(0, np.minimum((fr - l) / (c - l), (r - fr) / (r - c)))
    return W


class LogMel(nn.Module):
    def __init__(s):
        super().__init__()
        n = torch.arange(NFFT).float(); k = torch.arange(NFFT // 2 + 1).float()[:, None]; win = torch.hann_window(NFFT, periodic=True)
        ang = 2 * math.pi * k * n / NFFT
        s.register_buffer('dft', torch.cat([torch.cos(ang) * win, -torch.sin(ang) * win], 0)[:, None, :])   # [402,1,400]
        s.register_buffer('mel', torch.from_numpy(mel_matrix()))
    def codes(s, wav):   # [B,N] -> uint8-valued float [B,Tm,80]
        z = F.conv1d(wav[:, None, :], s.dft, stride=HOP); h = NFFT // 2 + 1
        p = z[:, :h] ** 2 + z[:, h:] ** 2                                    # [B,201,Tm]
        lm = torch.log(torch.einsum('mf,bft->bmt', s.mel, p) + 1e-6)
        return torch.clamp(torch.round((lm - LO) * SCALE), 0, 255).transpose(1, 2)
    @staticmethod
    def feats(codes): return ((codes.float() / SCALE + LO) - 2.0) / 4.0     # roughly zero-mean / unit-std


class FF(nn.Module):
    def __init__(s, d, m): super().__init__(); s.n = nn.LayerNorm(d); s.a = nn.Linear(d, m); s.b = nn.Linear(m, d)
    def forward(s, x): return s.b(F.silu(s.a(s.n(x))))


class Block(nn.Module):
    def __init__(s, d=256, h=4, ff=1024, k=15, p=0.1):
        super().__init__(); s.h = h; s.ff1, s.ff2 = FF(d, ff), FF(d, ff)
        s.na = nn.LayerNorm(d); s.qkv = nn.Linear(d, 3 * d); s.o = nn.Linear(d, d)
        s.nc = nn.LayerNorm(d); s.pw1 = nn.Linear(d, 2 * d); s.dw = nn.Conv1d(d, d, k, padding=k // 2, groups=d); s.nb = nn.LayerNorm(d); s.pw2 = nn.Linear(d, d)
        s.nf = nn.LayerNorm(d); s.dr = nn.Dropout(p)
    def forward(s, x, mask=None, valid=None):   # x [B,T,D]; mask additive [B,1,1,T]; valid [B,T,1] multiplicative
        x = x + 0.5 * s.dr(s.ff1(x))
        B, T, D = x.shape; q, k, v = s.qkv(s.na(x)).view(B, T, 3, s.h, D // s.h).permute(2, 0, 3, 1, 4)
        a = q @ k.transpose(-1, -2) / math.sqrt(D // s.h)
        if mask is not None: a = a + mask
        x = x + s.dr(s.o((a.softmax(-1) @ v).transpose(1, 2).reshape(B, T, D)))
        c = s.pw1(s.nc(x)); c = c[..., :D] * torch.sigmoid(c[..., D:])
        if valid is not None: c = c * valid
        c = s.dw(c.transpose(1, 2)).transpose(1, 2); x = x + s.dr(s.pw2(F.silu(s.nb(c))))
        return s.nf(x + 0.5 * s.dr(s.ff2(x)))


class Student(nn.Module):
    def __init__(s, d=256, layers=8, heads=4, ff=1024, k=15):
        super().__init__(); s.front = LogMel()
        s.sub = nn.Sequential(nn.Conv1d(NMEL, d, 3, stride=2, padding=1), nn.SiLU(), nn.Conv1d(d, d, 3, padding=1), nn.SiLU())
        s.blocks = nn.ModuleList(Block(d, heads, ff, k) for _ in range(layers)); s.out = nn.Linear(d, 40)
    @staticmethod
    def out_len(n_mel_frames): return (n_mel_frames + 1) // 2
    def from_codes(s, codes, lens=None, specaug=False):   # codes [B,Tm,80] (float/uint8), lens = valid mel frames per item or None
        x = LogMel.feats(codes)
        if specaug:
            B, T, _ = x.shape
            for b in range(B):
                f = np.random.randint(0, 15); f0 = np.random.randint(0, NMEL - f); x[b, :, f0:f0 + f] = 0
                for _ in range(2):
                    t = np.random.randint(0, 20); t0 = np.random.randint(0, max(1, (lens[b] if lens is not None else T) - t)); x[b, t0:t0 + t, :] = 0
        x = s.sub(x.transpose(1, 2)).transpose(1, 2); mask = valid = None
        if lens is not None:
            ol = (lens + 1) // 2; T = x.shape[1]; ok = torch.arange(T)[None, :] < ol[:, None]
            mask = torch.where(ok, 0.0, -1e9)[:, None, None, :]; valid = ok[:, :, None].float(); x = x * valid
        for b in s.blocks: x = b(x, mask, valid)
        return s.out(x)
    def forward(s, input_values): return s.from_codes(s.front.codes(input_values))   # raw audio -> logits [B,T,40] (ONNX path, B=1)


def param_count(m): return sum(p.numel() for p in m.parameters())
