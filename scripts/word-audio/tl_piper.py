# Giọng thay Kokoro theo spec (docs/specs/target-language.md §Giọng, spanish-course.md §3, japanese-course.md §8.6) – CHỈ CI, chạy SAU tl-sample.mjs.
# Nguồn theo bảng tl-voices.json: `alts` (danh sách) hoặc `piper` (một) – pt: pt_BR-faber-medium · es: es_MX-claude-high · fr: fr_FR-siwis-medium ·
# ja: Open JTalk HTS (Piper không có giọng Nhật) – mei_normal kèm pyopenjtalk + nitech m001 (tải tar.gz, rút đúng .htsvoice); cả hai CC BY 3.0 ·
# ko: Supertonic 3 (Kokoro/Piper không có giọng Hàn) – giọng F1/F2/M1/M2, mô hình Open RAIL-M.
# Thêm dòng giọng <label> vào $OUT/probe.json (cùng từ, cùng ứng viên câu mang "cut" + đọc trơ "dot", đọc theo `say` của bảng) → tl_gate.py chấm CÙNG cổng với Kokoro.
# Một nguồn hỏng (tải, thiếu khóa bảng, bộ đọc lỗi) KHÔNG làm chết lượt: ghi lý do vào probe.altErr, các nguồn khác vẫn chạy, tl_gate.py in cảnh báo.
import io, json, os, subprocess, sys, tarfile, urllib.request
TL = os.environ.get('TL', 'pt'); C = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tl-voices.json')))[TL]
OUT = os.environ.get('OUT', f'out/{TL}-sample'); M = os.environ.get('PIPER_DIR', '/tmp/piper'); PF = os.path.join(OUT, 'probe.json')
ALTS = C.get('alts') or (([C['piper']] if C.get('piper') else []) + C.get('piperAlt', []))   # piperAlt = giọng thử thêm (fr: giọng nam cho Carlos, french-course.md §7)
ST = {}
def speaker(a):
    """→ hàm say(text, wav) của một nguồn."""
    if a.get('engine') == 'supertonic':   # ko: Supertonic 3 (ONNX, CPU; tải mô hình ~400 MB một lần vào ~/.cache/supertonic3) – một động cơ, nhiều giọng
        from supertonic import TTS
        if 'tts' not in ST: ST['tts'] = TTS(auto_download=True)
        tts = ST['tts']; style = tts.get_voice_style(voice_name=a['voice'])
        def say(text, f):
            wav, _ = tts.synthesize(text, voice_style=style, lang=a.get('lang', C['asrLang']), total_steps=int(a.get('steps', 10)), speed=float(a.get('speed', 0.95)))
            tts.save_audio(wav, f)
        return say
    if a.get('engine') == 'openjtalk':
        import pyopenjtalk, wave, numpy as np
        if a.get('archive'):   # giọng HTS ngoài gói (ja: nitech m001): tải tar.gz một lần, rút đúng tệp .htsvoice; không có archive = giọng kèm gói (mei_normal)
            hv = os.path.join(M, os.path.basename(a['member']))
            if not os.path.exists(hv):
                os.makedirs(M, exist_ok=True)
                with urllib.request.urlopen(a['archive'], timeout=120) as r: t = tarfile.open(fileobj=io.BytesIO(r.read()), mode='r:gz')
                open(hv, 'wb').write(t.extractfile(a['member']).read())
            from pyopenjtalk.htsengine import HTSEngine
            eng = HTSEngine(hv.encode('utf-8'))
            def synth(text): return eng.synthesize(pyopenjtalk.extract_fullcontext(text)), eng.get_sampling_frequency()
        else:
            synth = pyopenjtalk.tts
        def say(text, f):
            x, sr = synth(text)
            with wave.open(f, 'wb') as o: o.setnchannels(1); o.setsampwidth(2); o.setframerate(int(sr)); o.writeframes(np.clip(x, -32768, 32767).astype(np.int16).tobytes())
        return say
    name, base = a['name'], 'https://huggingface.co/rhasspy/piper-voices/resolve/main/' + a['path']
    os.makedirs(M, exist_ok=True)
    for f in (name + '.onnx', name + '.onnx.json'):
        if not os.path.exists(os.path.join(M, f)): subprocess.run(['curl', '-sfL', '--retry', '5', '--retry-all-errors', '-o', os.path.join(M, f), base + f], check=True)
    def say(text, f): subprocess.run([sys.executable, '-m', 'piper', '-m', os.path.join(M, name + '.onnx'), '-f', f, '--', text], check=True, capture_output=True)
    return say
def run(a, probe):
    say, v, jp = speaker(a), a['label'], a.get('engine') == 'openjtalk'
    meta = {}
    for r in probe.get('rows', []): meta.setdefault(r['w'], r)
    if not meta:   # bảng không có giọng Kokoro (ko: voices rỗng) → lấy thẳng N từ đầu seed, cùng thứ tự với tl-sample.mjs
        sd = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'content', 'target', TL, 'seed.json')))['words'][:int(os.environ.get('TL_N', '20'))]
        meta = {w['word']: {'w': w['word'], **({'say': w[C['say']]} if C.get('say') and w.get(C['say']) else {}), **({'kana': w['kana']} if w.get('kana') else {})} for w in sd}
    d = os.path.join(OUT, v); os.makedirs(d, exist_ok=True)
    cf = os.path.join(d, '_carrier.wav'); say(C['carrier'], cf)
    rows = []
    for i, w in enumerate(meta):
        c, m = [], meta[w]; s = w if a.get('say') == 'word' else (m.get('say') or w)   # say: word – Open JTalk đọc theo chữ (cách đọc + cao độ từ điển đã khớp seed 30/30 ở tl_ipa.py)
        if ' ' not in w.strip() and C.get('cut') is not False: f = os.path.join(d, f'{i}.0.wav'); say(C['carrier'] + ' ' + s + '.', f); c.append({'m': 'cut', 'f': f})
        f = os.path.join(d, f'{i}.1.wav'); say(s + ('。' if jp else '.'), f); c.append({'m': 'dot', 'f': f})
        rows.append({'v': v, 'w': w, 'f': c[0]['f'], 'cands': c, **({'kana': m['kana']} if m.get('kana') else {})})
    probe.setdefault('carrier', {})[v] = cf; probe['rows'] = probe.get('rows', []) + rows; probe.setdefault('alts', []).append(a.get('name', v))
    print(f"✓ {v} ({a.get('name', '')}): {len(rows)} từ")
probe = json.load(open(PF)) if os.path.exists(PF) else {}
for a in ALTS:
    try: run(a, probe)
    except Exception as e:
        msg = f"{a.get('label', 'alt')}: {type(e).__name__}: {str(e)[:200]}"; probe['altErr'] = (probe.get('altErr', '') + ' · ' if probe.get('altErr') else '') + msg
        print('✗ nguồn thay hỏng – bỏ qua: ' + msg)
json.dump(probe, open(PF, 'w'), ensure_ascii=False, indent=1)
