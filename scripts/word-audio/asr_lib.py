# Nghe lại giọng từ đơn bằng faster-whisper (chỉ CI). Dùng chung: scripts/word-audio-asr.py, scripts/word-audio/lab.py.
# Tiêu chí chấp nhận KHÔNG được nới: chữ nghe được (chuẩn hoá) phải đúng từ hoặc một đồng âm trong HOMO; độ dài trong khoảng hợp lý.
import json, os, re, subprocess, urllib.request
HOMO = {'to': ['two', 'too'], 'for': ['four', 'fore'], 'a': ['ay', 'eh', 'hey a'], 'the': ['thee'], 'be': ['bee', 'b'], 'there': ['their', 'theyre'],
        'you': ['u', 'yew', 'ewe'], 'we': ['wee', 'oui'], 'or': ['oar', 'ore', 'awe', 'aw'], 'nor': ['gnaw', 'naw'], 'so': ['sew', 'sow'],
        'would': ['wood'], 'some': ['sum'], 'do': ['due', 'dew'], 'but': ['butt'], 'into': ['in to'], 'onto': ['on to'], 'he': ['hee'], 'and': ['an'],
        'see': ['sea', 'c']}  # đồng âm thật (cùng /siː/) – lab 25/10: Whisper viết "C" cho see đọc đúng
DIG = {'0': ' zero ', '1': ' one ', '2': ' two ', '3': ' three ', '4': ' four ', '5': ' five ', '6': ' six ', '7': ' seven ', '8': ' eight ', '9': ' nine '}
# Whisper viết số ("2", "4") → đổi ra chữ trước khi so; tiêu chí so khớp không đổi
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'[^a-z ]', '', re.sub(r'\d', lambda m: DIG[m.group()], s.lower()).replace('-', ' '))).strip()
def heard_ok(word, text):
    t = norm(text); ok = {norm(word)} | {norm(h) for h in HOMO.get(word.lower(), [])}
    return t in ok or t.replace(' ', '') in {x.replace(' ', '') for x in ok}
def dur(f):
    try: return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode().strip())
    except Exception: return 0.0
# Độ dài hợp lý: ≥ 0,15 s và ≤ trần theo số chữ (từ 1 âm tiết ≤ 1,6 s như s2; cụm dài hơn được thêm 0,09 s/chữ, tối đa 3 s)
def dur_ok(word, d):
    n = len(re.sub(r'[^a-z]', '', word.lower()))
    return 0.15 <= d <= min(3.0, max(1.6, 0.6 + 0.09 * n))
def fnv(s):
    h = 0x811c9dc5
    for ch in s: h = ((h ^ ord(ch)) * 0x01000193) & 0xffffffff
    d = '0123456789abcdefghijklmnopqrstuvwxyz'; o = ''
    while True:
        h, r = divmod(h, 36); o = d[r] + o
        if not h: return o
def fetch(url, f):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'lexkite-ci-asr'})
        with urllib.request.urlopen(req, timeout=20) as r, open(f, 'wb') as w: w.write(r.read()); return True
    except Exception: return False
_model = None
def model(name='small.en'):
    global _model
    if _model is None:
        from faster_whisper import WhisperModel
        _model = WhisperModel(name, device='cpu', compute_type='int8')
    return _model
# Whisper nghe kẹp < 1 s rất kém: đệm 0,6 s lặng hai đầu (16 kHz mono) + small.en, giải mã tham lam nhiệt độ 0.
def pad(f):
    w = f + '.pad.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-af', 'adelay=600:all=1,apad=pad_dur=0.6', '-ar', '16000', '-ac', '1', w], check=True)
    return w
def hear(f):
    w = pad(f)
    seg, _ = model().transcribe(w, language='en', beam_size=5, temperature=0.0, without_timestamps=True, condition_on_previous_text=False)
    os.remove(w)
    return ''.join(s.text for s in seg).strip()
def check(word, f):
    t, d = hear(f), dur(f)
    return heard_ok(word, t) and dur_ok(word, d), t, d
# ---- Cắt từ khỏi câu mang (bản "cut_*" của scripts/word-audio/kokoro.mjs) theo mốc thời gian từng chữ của Whisper
SR = 24000
def load(f):
    import numpy as np
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'])
    return np.frombuffer(raw, np.float32).copy()
def save_mp3(pcm, f):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-ac', '1', '-ar', str(SR), '-b:a', '40k', f], input=pcm.astype('float32').tobytes(), check=True)
def cut_last(word, src, dst):
    """Câu "…  TỪ." → các đoạn chỉ còn TỪ. → ([file…], '') hoặc ([], lý do). Câu phải được nghe ra đúng từ ở cuối."""
    import numpy as np
    seg, _ = model().transcribe(src, language='en', beam_size=5, temperature=0.0, word_timestamps=True, condition_on_previous_text=False)
    ws = [w for s in seg for w in (s.words or [])]; n = len(word.replace('-', ' ').split())
    full = ''.join(w.word for w in ws).strip()
    if len(ws) < n + 1: return [], f'câu mang: "{full}"'
    tgt = ws[-n:]
    if not heard_ok(word, ''.join(w.word for w in tgt)): return [], f'câu mang: "{full}"'
    pcm = load(src); fr = SR // 100
    db = 10 * np.log10(np.array([np.mean(pcm[i:i + fr] ** 2) for i in range(0, len(pcm) - fr, fr)]) + 1e-12); db -= db.max()
    a, b, pe = tgt[0].start, tgt[-1].end, ws[-n - 1].end
    # Whisper hay đặt mốc đầu từ sớm (đoạn cắt dính đuôi chữ trước: "and away", "It's 2") → thử 2 điểm cắt: chỗ trũng năng lượng quanh mốc
    # Whisper, rồi chỗ trũng muộn hơn (≤ 0,12 s sau mốc). Mỗi đoạn cắt vẫn phải qua check() như mọi file khác.
    outs, seen = [], set()
    for lo_s, hi_s in ((max(pe - 0.03, a - 0.18), a + 0.04), (a - 0.02, a + 0.12)):
        lo, hi = max(0, int(lo_s * 100)), min(len(db) - 1, int(hi_s * 100))
        st = lo + int(np.argmin(db[lo:hi])) if hi > lo else int(a * 100)
        while st < len(db) - 1 and db[st] < -50: st += 1        # bỏ lặng đầu, chừa 2 khung
        st = max(0, st - 2)
        if st in seen: continue
        seen.add(st); en = min(len(db) - 1, int(b * 100))
        while en < len(db) - 1 and db[en] > -45: en += 1        # đuôi từ (Whisper hay cắt sớm phụ âm cuối)
        o = pcm[st * fr:min(len(pcm), (en + 6) * fr)].copy(); fi, fo = int(SR * 0.008), int(SR * 0.025)
        if len(o) < fi + fo: continue
        o[:fi] *= np.linspace(0, 1, fi); o[-fo:] *= np.linspace(1, 0, fo)
        f = f'{dst}.{len(outs)}.mp3'; save_mp3(o, f); outs.append(f)
    return (outs, '') if outs else ([], 'đoạn cắt quá ngắn')
def prepare(word, cand, m):
    """Bản thử → các file để nghe (bản cut_* được cắt trước). → ([file…], lý do)"""
    if not m.startswith('cut_'): return [cand], ''
    return cut_last(word, cand, cand.rsplit('.', 1)[0] + '.cut')
