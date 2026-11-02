"""faster-whisper that gives the SAME words and times for the same wav on every CI runner (one loader for every repo script).

Why (02/11, render (ready, short) red on #293 and #430, green on the same code at 12:48Z): the voice artifacts held
byte-identical wavs, only the ASR pass differed – "growing, is" (is @ 2.78 s) on one runner, "growing is" (is @ 2.10 s,
the 0.7 s pause swallowed) on another -> qc_v9 asr_match flipped. GitHub runners are Intel or AMD at random and
CTranslate2 picks its int8 GEMM backend per CPU (Intel MKL on Intel, oneDNN/ruy elsewhere) and per ISA; whisper's
temperature fallback (0.2 ... 1.0) then SAMPLES. Pin all three: MKL everywhere + one ISA + MKL conditional numerical
reproducibility, fixed threads, greedy/beam at temperature 0 only (scripts/word-audio already decoded this way), seed 0.
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
