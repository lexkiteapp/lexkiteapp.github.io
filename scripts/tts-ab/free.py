# Ứng viên đọc động miễn phí #2–3 (chỉ CI – tts-ab.yml phase=free, docs/TTS-AB.md):
#   piper : Piper (ONNX, MIT – chạy CPU/WASM), giọng Mỹ có sẵn – Ama en_US-lessac-medium, Carlos en_US-ryan-medium. Đo trên CPU CI.
#   melo  : MeloTTS trên Cloudflare Workers AI (@cf/myshell-ai/melotts, gói miễn phí) – qua kho CF_POOL (đuôi kho, không tài khoản chính),
#           1 giọng EN cho cả hai giáo viên. 4006/429/401 → tài khoản kế; 2 lỗi liên tiếp ở cùng mục → bỏ mục; 5 mục lỗi liên tiếp → dừng.
#   python3 scripts/tts-ab/free.py --engine piper|melo [--texts .tts-ab/texts.json] [--out .tts-ab/audio]
import argparse, base64, json, os, subprocess, sys, time, urllib.error, urllib.request, wave
ap = argparse.ArgumentParser(); ap.add_argument('--engine', required=True, choices=['piper', 'melo'])
ap.add_argument('--texts', default='.tts-ab/texts.json'); ap.add_argument('--out', default='.tts-ab/audio'); ap.add_argument('--models', default='/tmp/piper')
a = ap.parse_args(); T = json.load(open(a.texts))
def dur_wav(f):
    with wave.open(f) as w: return w.getnframes() / w.getframerate()
def dur_any(f):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode().strip() or 0)

if a.engine == 'piper':
    from piper import PiperVoice
    V = {'ama': 'en_US-lessac-medium', 'carlos': 'en_US-ryan-medium'}; d = f'{a.out}/piper'; os.makedirs(d, exist_ok=True)
    meta = {'model_bytes': {}, 'load_ms': {}}; vs = {}
    for w, name in V.items():
        f = f'{a.models}/{name}.onnx'; t0 = time.time(); vs[w] = PiperVoice.load(f)
        meta['load_ms'][w] = round((time.time() - t0) * 1000); meta['model_bytes'][w] = os.path.getsize(f) + os.path.getsize(f + '.json')
    for it in T['items']:
        f = f'{d}/{it["id"]}.wav'; t0 = time.time()
        with wave.open(f, 'wb') as wf:
            if hasattr(vs[it['who']], 'synthesize_wav'): vs[it['who']].synthesize_wav(it['text'], wf)   # piper-tts ≥ 1.3
            else: vs[it['who']].synthesize(it['text'], wf)
        ms = (time.time() - t0) * 1000
        json.dump(dict(ttfa_ms=round(ms), ttfb_ms=round(ms), total_ms=round(ms), rtf=round(ms / 1000 / max(0.01, dur_wav(f)), 3), voice=V[it['who']],
                       ref_cfg='kokoro-video', text=it['text']), open(f[:-4] + '.json', 'w'))
    json.dump(meta, open(f'{d}/meta.json', 'w')); print(f'✓ piper: {len(T["items"])} file · model {sum(meta["model_bytes"].values()) / 1e6:.1f} MB')
    sys.exit(0)

# ---- MeloTTS trên Workers AI
# Tài khoản: đúng hàm poolAccounts() của scripts/lib/cf-pool.mjs (bỏ tài khoản đầu, không tài khoản chính) – bắt đầu từ 3/4 kho
# (ảnh rút từ đầu kho ≤ 0,6, văn bản từ 0,5) để không tranh neuron; khóa chỉ nằm trong bộ nhớ, không in.
_all = json.loads(subprocess.check_output(['node', '-e', "import('./scripts/lib/cf-pool.mjs').then(m=>console.log(JSON.stringify(m.poolAccounts().map(x=>[x.acct,x.tok]))))"]))
ACC = _all[int(len(_all) * 0.75):] + _all[:int(len(_all) * 0.75)]; d = f'{a.out}/melo'; os.makedirs(d, exist_ok=True)
if not ACC: sys.exit('✗ CF_POOL rỗng')
ai, streak, ok = 0, 0, 0
for it in T['items']:
    f = f'{d}/{it["id"]}.mp3'; tries = 0
    while tries < 2 and ai < len(ACC):
        acct, tok = ACC[ai]; t0 = time.time()
        r = urllib.request.Request(f'https://api.cloudflare.com/client/v4/accounts/{acct}/ai/run/@cf/myshell-ai/melotts', method='POST',
                                   data=json.dumps({'prompt': it['text'], 'lang': 'en'}).encode(), headers={'Authorization': f'Bearer {tok}', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(r, timeout=90) as resp: body = resp.read(); ms = (time.time() - t0) * 1000; ct = resp.headers.get('content-type', '')
            audio = body if ct.startswith('audio') else base64.b64decode(json.loads(body)['result']['audio'])
            open(f, 'wb').write(audio)
            json.dump(dict(ttfa_ms=round(ms), ttfb_ms=round(ms), total_ms=round(ms), rtf=round(ms / 1000 / max(0.01, dur_any(f)), 3), voice='melotts-en',
                           ref_cfg='kokoro-video', text=it['text']), open(f[:-4] + '.json', 'w'))
            ok += 1; streak = 0; break
        except urllib.error.HTTPError as e:
            msg = e.read()[:200].decode('utf8', 'replace')
            if e.code in (401, 403, 429) or '4006' in msg: ai += 1; continue        # tài khoản hết neuron/khóa hỏng → tài khoản kế
            print(f'  {it["id"]}: http {e.code} {msg}'); tries += 1
        except Exception as e: print(f'  {it["id"]}: {type(e).__name__} {e}'[:200]); tries += 1
    else:
        streak += 1
        if streak >= 5 or ai >= len(ACC): print('✗ dừng: 5 mục lỗi liên tiếp hoặc hết tài khoản'); break
json.dump({'model_bytes': 0, 'note': 'chạy trên máy chủ Cloudflare'}, open(f'{d}/meta.json', 'w'))
print(f'✓ melo: {ok}/{len(T["items"])} file (tài khoản thứ {ai + 1}/{len(ACC)})')
