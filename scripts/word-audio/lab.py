# Thí nghiệm (word-audio-lab.yml): thêm Piper (MIT) làm phương án dự phòng, rồi nghe lại mọi bản trong .lab/manifest.json → bảng tỉ lệ đạt theo phương án.
import json, os, sys, wave, collections, urllib.request
sys.path.insert(0, os.path.dirname(__file__)); from asr_lib import check
rows = json.load(open('.lab/manifest.json')); words = sorted({r['word'] for r in rows})
PIPER = {'bf_emma': 'en/en_GB/cori/high/en_GB-cori-high', 'af_heart': 'en/en_US/ljspeech/high/en_US-ljspeech-high'}
cards = []
try:
    from piper.voice import PiperVoice
    for v, p in PIPER.items():
        base = 'https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/' + p; name = p.split('/')[-1]
        for ext in ('.onnx', '.onnx.json'): urllib.request.urlretrieve(base + ext, '/tmp/' + name + ext)
        try: cards.append(f'### {name}\n```\n' + urllib.request.urlopen(base.rsplit('/', 1)[0] + '/MODEL_CARD').read().decode()[:1500] + '\n```')
        except Exception as e: cards.append(f'{name}: MODEL_CARD lỗi {e}')
        pv = PiperVoice.load('/tmp/' + name + '.onnx')
        for w in words:
            f = f'.lab/{w}.{v}.P_piper.wav'
            with wave.open(f, 'wb') as wf: pv.synthesize(w + '.', wf)
            rows.append({'word': w, 'voice': v, 'variant': 'P_piper', 'file': f})
except Exception as e: print('Piper lỗi:', e)
stat = collections.defaultdict(lambda: [0, 0]); detail = []
for r in rows:
    if not r.get('file'): stat[r['variant']][1] += 1; detail.append(f"{r['word']}/{r['voice']}/{r['variant']}: ✗ {r.get('why')}"); continue
    ok, t, d = check(r['word'], r['file']); s = stat[r['variant']]; s[0] += ok; s[1] += 1
    detail.append(f"{r['word']}/{r['voice']}/{r['variant']}: {'✓' if ok else '✗'} \"{t}\" {d:.2f}s")
out = ['## Tỉ lệ đạt theo phương án', '| phương án | đạt | tổng |', '|---|---|---|'] + [f'| {k} | {a} | {b} |' for k, (a, b) in sorted(stat.items())]
out += ['', '<details><summary>chi tiết</summary>', '', *['- ' + x for x in detail], '</details>', '', *cards]
txt = '\n'.join(out); print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
