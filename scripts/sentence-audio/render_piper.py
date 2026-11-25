# Piper cho corpus câu của một tl (render-tl.mjs, CHỈ CI): mô hình theo bảng tl-voices.json (dòng `piper`: fr_FR-siwis-medium), nạp MỘT lần cho cả shard.
# Giao thức: in "ready" khi sẵn sàng; mỗi dòng stdin = một câu → ghi WAV vào đường dẫn argv[2] rồi in "ok" (lỗi: in "err <lý do>", tiếp tục).
import json, os, subprocess, sys, wave
TL, OUTWAV = sys.argv[1], sys.argv[2]
C = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'word-audio', 'tl-voices.json')))[TL]['piper']
M = os.environ.get('PIPER_DIR', '/tmp/piper'); os.makedirs(M, exist_ok=True)
base = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/' + C['path']
for f in (C['name'] + '.onnx', C['name'] + '.onnx.json'):   # cùng nguồn/cách tải với word-audio/tl_piper.py
    if not os.path.exists(os.path.join(M, f)): subprocess.run(['curl', '-sfL', '--retry', '5', '--retry-all-errors', '-o', os.path.join(M, f), base + f], check=True)
from piper import PiperVoice
voice = PiperVoice.load(os.path.join(M, C['name'] + '.onnx'))
MODEL = os.path.join(M, C['name'] + '.onnx')
def say(text):
    if hasattr(voice, 'synthesize_wav'):
        with wave.open(OUTWAV, 'wb') as w: voice.synthesize_wav(text, w)
    else: subprocess.run([sys.executable, '-m', 'piper', '-m', MODEL, '-f', OUTWAV, '--', text], check=True, capture_output=True)   # bản piper-tts cũ không có synthesize_wav → CLI như tl_piper.py
print('ready', flush=True)
for line in sys.stdin:
    text = line.strip()
    if not text: print('err rỗng', flush=True); continue
    try: say(text); print('ok', flush=True)
    except Exception as e: print('err ' + type(e).__name__ + ': ' + str(e)[:150].replace('\n', ' '), flush=True)
