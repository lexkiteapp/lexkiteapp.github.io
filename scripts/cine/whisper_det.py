"""faster-whisper that gives the SAME words and times for the same wav on every CI runner (one loader for every repo script).

Why (02/11, render (ready, short) red on #293 and #430, green on the same code at 12:48Z): the voice artifacts held
byte-identical wavs, only the ASR pass differed – "growing, is" (is @ 2.78 s) on one runner, "growing is" (is @ 2.10 s,
the 0.7 s pause swallowed) on another -> qc_v9 asr_match flipped. GitHub runners are Intel or AMD at random and
CTranslate2 picks its int8 GEMM backend per CPU (Intel MKL on Intel, oneDNN/ruy elsewhere) and per ISA; whisper's
temperature fallback (0.2 ... 1.0) then SAMPLES. Pin all three: MKL everywhere + one ISA + MKL conditional numerical
reproducibility, fixed threads, greedy/beam at temperature 0 only (scripts/word-audio already decoded this way), seed 0.
Whisper also starts a word that follows a pause IN the silence (e.g. "is" @2.10 s, sound @2.8 s) -> snap_onsets moves it to the
first voiced 10 ms frame inside the word (align.py since #191; news_voice captions + ASR back-check since 02/11).
Use: from whisper_det import load, DECODE; M = load('base.en'); M.transcribe(wav, ..., **DECODE)
"""
import os, platform
if platform.machine().lower() in ('x86_64', 'amd64'):   # CI runners; Apple/ARM has no MKL and no AVX2 – leave its defaults
    for k, v in (('CT2_USE_MKL', '1'), ('CT2_FORCE_CPU_ISA', 'AVX2'), ('MKL_CBWR', 'AVX2')): os.environ.setdefault(k, v)
THREADS = 4   # thread count is part of MKL reproducibility; standard runners have 4 vCPU
DECODE = dict(temperature=0.0)   # no sampled fallback


def load(name, compute_type='int8'):
    import ctranslate2
    from faster_whisper import WhisperModel
    ctranslate2.set_random_seed(0)
    return WhisperModel(name, device='cpu', compute_type=compute_type, cpu_threads=THREADS, num_workers=1)


def load_audio(path, sr=16000):
    import numpy as np, subprocess
    """Giải mã bằng ffmpeg → float32 mono 16 kHz (không qua PyAV: faster-whisper 1.1.1 gọi av.open(metadata_errors=…) mà PyAV ≥ 15 đã bỏ
    → TypeError trên CI; workflow cũng ghim av==13.1.0 (có wheel cp312) nhưng đường này không phụ thuộc phiên bản PyAV)."""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-nostdin', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 's16le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


SIL = 12   # frames of 10 ms: >= 120 ms below threshold = a pause (stop closures inside a word are < 100 ms)


def snap_onsets(audio, words, sr=16000, s='start', e='end'):
    """whisper tiny.en hay đặt từ đầu mỗi đoạn (và từ sau quãng nghỉ) bắt đầu từ lúc IM LẶNG (vd. "Wait" 0,0 s trong khi tiếng
    bắt đầu 0,42 s) → phụ đề bật sớm + đo lệch khẩu hình ~200–300 ms. Dời đầu từ tới khung 10 ms đầu tiên có năng lượng tiếng
    (RMS > 8 % mức p95 của câu) trong chính khoảng [start, end) của từ – nếu khoảng đó chứa quãng lặng ≥ SIL × 10 ms (đuôi từ trước + nghỉ)
    thì lấy khung có tiếng đầu tiên SAU quãng lặng cuối; không bao giờ dời quá end − 40 ms."""
    import numpy as np
    hop = sr // 100
    n = len(audio) // hop
    if n < 3 or not words:
        return words
    rms = np.sqrt((audio[:n * hop].reshape(n, hop) ** 2).mean(axis=1))
    thr = max(1e-3, 0.08 * float(np.percentile(rms, 95)))
    for w in words:
        s0, e0 = int(w[s] * 100), int(w[e] * 100)
        voiced = np.nonzero(rms[s0:min(n, e0)] > thr)[0]
        if len(voiced):
            gaps = np.nonzero(np.diff(voiced) > SIL)[0]   # a real pause INSIDE the span (02/11 r_q2: "is" 2.10–3.0 s held the tail of
            k = int(voiced[gaps[-1] + 1]) if len(gaps) else int(voiced[0])   # "growing" to 2.43 s + silence to 2.79 s) -> the word starts after it
            t = (s0 + k) / 100
            if t > w[s]:
                w[s] = round(min(t, w[e] - 0.04), 3)
    return words
