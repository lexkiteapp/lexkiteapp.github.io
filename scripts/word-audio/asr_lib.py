# Nghe lại giọng từ đơn bằng faster-whisper (chỉ CI). Dùng chung: scripts/word-audio-asr.py, scripts/word-audio/lab.py.
# Tiêu chí chấp nhận KHÔNG được nới: chữ nghe được (chuẩn hoá) phải đúng từ hoặc một đồng âm trong HOMO; độ dài trong khoảng hợp lý.
import json, os, re, subprocess, urllib.request
HOMO = {'to': ['two', 'too'], 'for': ['four', 'fore'], 'a': ['ay', 'eh', 'hey a'], 'the': ['thee'], 'be': ['bee', 'b'], 'there': ['their', 'theyre'],
        'you': ['u', 'yew', 'ewe'], 'we': ['wee', 'oui'], 'or': ['oar', 'ore', 'awe', 'aw'], 'nor': ['gnaw', 'naw'], 'so': ['sew', 'sow'],
        'would': ['wood'], 'some': ['sum'], 'do': ['due', 'dew'], 'but': ['butt'], 'into': ['in to'], 'onto': ['on to'], 'he': ['hee'], 'and': ['an']}
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
