# Phương án dự phòng giọng pt-BR theo spec (docs/specs/target-language.md §Giọng): Piper pt_BR-faber-medium (nam; dữ liệu CC0) – CHỈ CI, chạy SAU pt-sample.mjs.
# Thêm dòng giọng 'piper_faber' vào $OUT/probe.json (cùng từ, cùng ứng viên câu mang "cut" + đọc trơ "dot") → pt_gate.py chấm CÙNG cổng với Kokoro.
# Mục đích lượt mẫu: phân định giọng yếu hay bộ nghe yếu bằng số liệu (Piper pt_BR chỉ có giọng nam – không thay được Ama).
import json, os, subprocess, sys
OUT = os.environ.get('OUT', 'out/pt-sample'); M = os.environ.get('PIPER_DIR', '/tmp/piper'); NAME = 'pt_BR-faber-medium'
BASE = 'https://huggingface.co/rhasspy/piper-voices/resolve/main/pt/pt_BR/faber/medium/'
os.makedirs(M, exist_ok=True)
for f in (NAME + '.onnx', NAME + '.onnx.json'):
    if not os.path.exists(os.path.join(M, f)): subprocess.run(['curl', '-sfL', '--retry', '5', '--retry-all-errors', '-o', os.path.join(M, f), BASE + f], check=True)
probe = json.load(open(os.path.join(OUT, 'probe.json')))
words = list(dict.fromkeys(r['w'] for r in probe.get('rows', [])))
v = 'piper_faber'; d = os.path.join(OUT, v); os.makedirs(d, exist_ok=True)
def say(text, f):
    subprocess.run([sys.executable, '-m', 'piper', '-m', os.path.join(M, NAME + '.onnx'), '-f', f, '--', text], check=True, capture_output=True)
rows = []
for i, w in enumerate(words):
    c = []
    if ' ' not in w.strip(): f = os.path.join(d, f'{i}.0.wav'); say('A palavra é: ' + w + '.', f); c.append({'m': 'cut', 'f': f})
    f = os.path.join(d, f'{i}.1.wav'); say(w + '.', f); c.append({'m': 'dot', 'f': f})
    rows.append({'v': v, 'w': w, 'f': c[0]['f'], 'cands': c})
probe['rows'] = probe.get('rows', []) + rows; probe['piper'] = NAME
json.dump(probe, open(os.path.join(OUT, 'probe.json'), 'w'), ensure_ascii=False, indent=1)
print(f'✓ piper {NAME}: {len(rows)} từ')
