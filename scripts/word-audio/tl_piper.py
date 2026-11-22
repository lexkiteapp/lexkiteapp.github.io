# Phương án dự phòng giọng theo spec (docs/specs/target-language.md §Giọng, spanish-course.md §3): Piper theo bảng tl-voices.json
# (pt: pt_BR-faber-medium · es: es_MX-claude-high) – CHỈ CI, chạy SAU tl-sample.mjs.
# Thêm dòng giọng piper.label vào $OUT/probe.json (cùng từ, cùng ứng viên câu mang "cut" + đọc trơ "dot") → tl_gate.py chấm CÙNG cổng với Kokoro.
# Mục đích lượt mẫu: phân định giọng yếu hay bộ nghe yếu bằng số liệu.
import json, os, subprocess, sys
TL = os.environ.get('TL', 'pt'); C = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tl-voices.json')))[TL]
OUT = os.environ.get('OUT', f'out/{TL}-sample'); M = os.environ.get('PIPER_DIR', '/tmp/piper')
# piper = giọng dự phòng của bảng; piperAlt = giọng thử thêm (fr: giọng nam cho Carlos – Kokoro fr chỉ có ff_siwis nữ, french-course.md §7) – cùng cổng
VOICES = [C['piper']] + C.get('piperAlt', [])
os.makedirs(M, exist_ok=True)
probe = json.load(open(os.path.join(OUT, 'probe.json')))
words = list(dict.fromkeys(r['w'] for r in probe.get('rows', [])))
for P in VOICES:
    NAME, BASE = P['name'], 'https://huggingface.co/rhasspy/piper-voices/resolve/main/' + P['path']
    for f in (NAME + '.onnx', NAME + '.onnx.json'):
        if not os.path.exists(os.path.join(M, f)): subprocess.run(['curl', '-sfL', '--retry', '5', '--retry-all-errors', '-o', os.path.join(M, f), BASE + f], check=True)
    v = P['label']; d = os.path.join(OUT, v); os.makedirs(d, exist_ok=True)
    def say(text, f):
        subprocess.run([sys.executable, '-m', 'piper', '-m', os.path.join(M, NAME + '.onnx'), '-f', f, '--', text], check=True, capture_output=True)
    rows = []
    cf = os.path.join(d, '_carrier.wav'); say(C['carrier'], cf); probe.setdefault('carrier', {})[v] = cf
    for i, w in enumerate(words):
        c = []
        if ' ' not in w.strip(): f = os.path.join(d, f'{i}.0.wav'); say(C['carrier'] + ' ' + w + '.', f); c.append({'m': 'cut', 'f': f})
        f = os.path.join(d, f'{i}.1.wav'); say(w + '.', f); c.append({'m': 'dot', 'f': f})
        rows.append({'v': v, 'w': w, 'f': c[0]['f'], 'cands': c})
    probe['rows'] = probe.get('rows', []) + rows
    print(f'✓ piper {NAME}: {len(rows)} từ')
probe['piper'] = ' '.join(P['name'] for P in VOICES)
json.dump(probe, open(os.path.join(OUT, 'probe.json'), 'w'), ensure_ascii=False, indent=1)
