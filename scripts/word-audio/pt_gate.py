# Cổng giọng từ đơn pt-BR (lượt mẫu word-audio-pt.yml, docs/specs/target-language.md §Giọng) – CHỈ CI.
# 1) Độ to: chuẩn hoá về −16 LUFS (đo trên clip lặp 4 lần vì từ đơn < 400 ms), trần −1 dBTP; đo lại, lệch > 1 LU = TRƯỢT.
# 2) Nghe lại: faster-whisper "small" đa ngôn ngữ, language='pt'; chữ nghe được (chuẩn hoá, GIỮ dấu) phải đúng từ. Không nới: từ trượt → giọng máy.
#    Cách nghe GIỐNG cổng tiếng Anh (scripts/word-audio/asr_lib.py): đệm 0,6 s lặng hai đầu (Whisper nghe kẹp < 1 s rất kém), giải mã tham lam nhiệt độ 0.
# 3) Ứng viên (pt-sample.mjs): "cut" = từ đọc trong câu mang "A palavra é: …" → cắt từ cuối theo mốc từng chữ của Whisper (như cut_wordis tiếng Anh;
#    câu phải được nghe ra đúng từ ở cuối, đoạn cắt vẫn phải qua đủ cổng), rồi "dot" = đọc trơ. Nhận ứng viên ĐẦU TIÊN qua cổng.
# PT_PUBLISH=<thư mục> (lát 2, dựng cả bộ): chép CHỈ file đạt sang <thư mục>/audio/w/<khóa>.mp3 (→ scripts/media/push.mjs) + $OUT/index.json {giọng: [chữ đạt]}.
# Đỏ khi: không file nào đạt, hoặc có file đạt ASR mà trượt độ to, hoặc tỉ lệ đạt < PT_MIN_PASS (mặc định 0.8).
import json, os, re, shutil, subprocess, sys, unicodedata
import numpy as np
OUT = os.environ.get('OUT', 'out/pt-sample'); MIN = float(os.environ.get('PT_MIN_PASS', '0.8')); SR = 24000
probe = json.load(open(os.path.join(OUT, 'probe.json')))
def lufs(f, loop=3):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-stream_loop', str(loop), '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', o); return float(m[-1]) if m else None
def norm16(src, dst):
    i = lufs(src)
    if i is None: return None
    subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-af', f'volume={-16 - i:.2f}dB,alimiter=limit=0.891:level=false', '-ar', '24000', '-ac', '1', '-b:a', '64k', dst], check=True)
    return lufs(dst)
def nrm(s):
    s = unicodedata.normalize('NFC', s).casefold()
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\s-]', '', s)).strip()
from faster_whisper import WhisperModel
model = WhisperModel('small', device='cpu', compute_type='int8')
def hear(f):
    w = f + '.pad.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-af', 'adelay=600:all=1,apad=pad_dur=0.6', '-ar', '16000', '-ac', '1', w], check=True)
    segs, _ = model.transcribe(w, language='pt', beam_size=5, temperature=0.0, without_timestamps=True, condition_on_previous_text=False)
    os.remove(w); return ' '.join(s.text for s in segs).strip()
def pcm_of(f):
    return np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']), np.float32).copy()
def cut_last(word, src):
    """Câu mang "A palavra é: TỪ." → wav chỉ còn TỪ, hoặc (None, lý do). Câu phải được nghe ra đúng từ ở cuối (= asr_lib.cut_last, language pt)."""
    segs, _ = model.transcribe(src, language='pt', beam_size=5, temperature=0.0, word_timestamps=True, condition_on_previous_text=False)
    ws = [w for s in segs for w in (s.words or [])]; full = ''.join(w.word for w in ws).strip()
    if len(ws) < 2 or nrm(ws[-1].word) != nrm(word): return None, f'câu mang: "{full}"'
    pcm = pcm_of(src); fr = SR // 100
    db = 10 * np.log10(np.array([np.mean(pcm[i:i + fr] ** 2) for i in range(0, len(pcm) - fr, fr)]) + 1e-12); db -= db.max()
    a, b, pe = ws[-1].start, ws[-1].end, ws[-2].end
    lo, hi = max(0, int(max(pe - 0.03, a - 0.18) * 100)), min(len(db) - 1, int((a + 0.04) * 100))
    st = lo + int(np.argmin(db[lo:hi])) if hi > lo else int(a * 100)
    while st < len(db) - 1 and db[st] < -50: st += 1
    st = max(0, st - 2); en = min(len(db) - 1, int(b * 100))
    while en < len(db) - 1 and db[en] > -45: en += 1        # đuôi từ (Whisper hay cắt sớm phụ âm cuối)
    o = pcm[st * fr:min(len(pcm), (en + 6) * fr)].copy(); fi, fo = int(SR * 0.008), int(SR * 0.025)
    if len(o) < fi + fo: return None, 'đoạn cắt quá ngắn'
    o[:fi] *= np.linspace(0, 1, fi); o[-fo:] *= np.linspace(1, 0, fo)
    dst = src[:-4] + '.cut.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', dst], input=o.astype('float32').tobytes(), check=True)
    return dst, ''
def gate(r):
    """Thử lần lượt các ứng viên của (giọng, chữ); trả kết quả ứng viên ĐẦU TIÊN qua cổng, hoặc ứng viên cuối cùng (trượt)."""
    tried, last = [], None
    for c in r.get('cands') or [{'m': 'dot', 'f': r['f']}]:
        src = c['f']
        if c['m'] == 'cut':
            src, why = cut_last(r['w'], c['f'])
            if not src: tried.append({'m': 'cut', 'heard': why}); continue
        mp3 = src[:-4] + '.mp3'; li = norm16(src, mp3); heard = hear(mp3)
        last = {'v': r['v'], 'w': r['w'], 'key': r.get('key'), 'm': c['m'], 'mp3': mp3, 'heard': heard, 'lufs': li, 'asr': nrm(heard) == nrm(r['w']), 'loud': li is not None and abs(li + 16) <= 1.0}
        last['ok'] = last['asr'] and last['loud']; tried.append({'m': c['m'], 'heard': heard})
        if last['ok']: break
    if last is None: last = {'v': r['v'], 'w': r['w'], 'ok': False, 'asr': False, 'loud': False, 'heard': '; '.join(t['heard'] for t in tried)}
    return {**last, 'tried': tried}
res = [gate(r) if r.get('f') else {**r, 'ok': False, 'why': r.get('err', 'no file')} for r in probe.get('rows', [])]
by = {}
for x in res: by.setdefault(x.get('v', '?'), []).append(x)
lines = ['## Giọng từ đơn pt-BR – lượt mẫu', f"kokoro-js tự đọc pt: `{probe.get('kokoroJsGenPt')}` · giọng pt kèm kokoro-js: {probe.get('kokoroJsHasPt')} · âm vị mẫu coração: `{(probe.get('sample') or {}).get('p')}`", '', '| giọng | đạt | qua câu mang | ASR trượt | độ to trượt |', '|---|---|---|---|---|']
for v, xs in by.items():
    lines.append(f"| {v} | {sum(x['ok'] for x in xs)}/{len(xs)} | {sum(1 for x in xs if x['ok'] and x.get('m') == 'cut')} | {', '.join(x['w'] + '→' + repr(x.get('heard')) for x in xs if not x.get('asr'))} | {', '.join(x['w'] for x in xs if x.get('asr') and not x.get('loud'))} |")
json.dump(res, open(os.path.join(OUT, 'gate.json'), 'w'), ensure_ascii=False, indent=1)
PUB = os.environ.get('PT_PUBLISH')
if PUB:
    os.makedirs(os.path.join(PUB, 'audio', 'w'), exist_ok=True); idx = {}
    for x in res:
        if x.get('ok') and x.get('key'):
            shutil.copyfile(x['mp3'], os.path.join(PUB, 'audio', 'w', x['key'] + '.mp3')); idx.setdefault(x['v'], []).append(x['w'])
    json.dump({v: sorted(ws) for v, ws in idx.items()}, open(os.path.join(OUT, 'index.json'), 'w'), ensure_ascii=False, indent=1)
txt = '\n'.join(lines); print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
ok = sum(x['ok'] for x in res); n = len(res) or 1
bad_loud = [x['w'] for x in res if x.get('asr') and not x.get('loud')]
if ok == 0 or bad_loud or ok / n < MIN:
    print(f'✗ pt-gate: đạt {ok}/{n} (< {MIN:.0%}) hoặc trượt độ to {bad_loud}'); sys.exit(1)
print(f'✓ pt-gate: đạt {ok}/{n}')
