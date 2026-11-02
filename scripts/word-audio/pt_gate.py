# Cổng giọng từ đơn pt-BR (lượt mẫu word-audio-pt.yml, docs/specs/target-language.md §Giọng) – CHỈ CI.
# 1) Độ to: chuẩn hoá về −16 LUFS (đo trên clip lặp 4 lần vì từ đơn < 400 ms), trần −1 dBTP; đo lại, lệch > 1 LU = TRƯỢT.
# 2) Nghe lại: faster-whisper "small" đa ngôn ngữ, language='pt'; chữ nghe được (chuẩn hoá, GIỮ dấu) phải đúng từ. Không nới: từ trượt → giọng máy.
# Đỏ khi: không file nào đạt, hoặc có file đạt ASR mà trượt độ to, hoặc tỉ lệ đạt < PT_MIN_PASS (mặc định 0.8).
import json, os, re, subprocess, sys, unicodedata
OUT = os.environ.get('OUT', 'out/pt-sample'); MIN = float(os.environ.get('PT_MIN_PASS', '0.8'))
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
res, sec = [], []
for r in probe.get('rows', []):
    if not r.get('f'): res.append({**r, 'ok': False, 'why': r.get('err', 'no file')}); continue
    mp3 = r['f'][:-4] + '.mp3'; li = norm16(r['f'], mp3)
    segs, _ = model.transcribe(mp3, language='pt', beam_size=5, vad_filter=False, initial_prompt=None)
    heard = ' '.join(s.text for s in segs).strip()
    asr = nrm(heard) == nrm(r['w']); loud = li is not None and abs(li + 16) <= 1.0
    res.append({'v': r['v'], 'w': r['w'], 'heard': heard, 'lufs': li, 'asr': asr, 'loud': loud, 'ok': asr and loud, 'sec': r.get('sec')})
by = {}
for x in res: by.setdefault(x.get('v', '?'), []).append(x)
lines = ['## Giọng từ đơn pt-BR – lượt mẫu', f"kokoro-js tự đọc pt: `{probe.get('kokoroJsGenPt')}` · giọng pt kèm kokoro-js: {probe.get('kokoroJsHasPt')} · âm vị mẫu coração: `{(probe.get('sample') or {}).get('p')}`", '', '| giọng | đạt | ASR trượt | độ to trượt |', '|---|---|---|---|']
for v, xs in by.items():
    lines.append(f"| {v} | {sum(x['ok'] for x in xs)}/{len(xs)} | {', '.join(x['w'] + '→' + repr(x.get('heard')) for x in xs if not x.get('asr'))} | {', '.join(x['w'] for x in xs if x.get('asr') and not x.get('loud'))} |")
json.dump(res, open(os.path.join(OUT, 'gate.json'), 'w'), ensure_ascii=False, indent=1)
txt = '\n'.join(lines); print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
ok = sum(x['ok'] for x in res); n = len(res) or 1
bad_loud = [x['w'] for x in res if x.get('asr') and not x.get('loud')]
if ok == 0 or bad_loud or ok / n < MIN:
    print(f'✗ pt-gate: đạt {ok}/{n} (< {MIN:.0%}) hoặc trượt độ to {bad_loud}'); sys.exit(1)
print(f'✓ pt-gate: đạt {ok}/{n}')
