# Cổng giọng từ đơn ngôn ngữ đích TL (lượt mẫu word-audio-tl.yml; bảng tl-voices.json; docs/specs/target-language.md §Giọng, spanish-course.md §3/§5.3) – CHỈ CI.
# 1) Độ to: chuẩn hoá về −16 LUFS (đo trên clip lặp 4 lần vì từ đơn < 400 ms; lặp bù gain sau bộ giới hạn), trần −1 dBTP; đo lại, lệch > 1 LU = TRƯỢT.
# 2) Nghe lại: faster-whisper đa ngôn ngữ (TL_ASR, mặc định asrModel của bảng: pt large-v3-turbo, es small), language=asrLang; chữ nghe được (chuẩn hoá, GIỮ dấu) phải đúng từ. Không nới: từ trượt → giọng máy.
#    Cách nghe GIỐNG cổng tiếng Anh (scripts/word-audio/asr_lib.py): đệm 0,6 s lặng hai đầu (Whisper nghe kẹp < 1 s rất kém), giải mã tham lam nhiệt độ 0.
# 3) Ứng viên (tl-sample.mjs): "cut" = từ đọc trong câu mang (bảng: pt "A palavra é: …", es "La palabra es: …") → cắt từ cuối theo mốc từng chữ của Whisper (như cut_wordis tiếng Anh;
#    câu phải được nghe ra đúng từ ở cuối, đoạn cắt vẫn phải qua đủ cổng), rồi "dot" = đọc trơ. Nhận ứng viên ĐẦU TIÊN qua cổng.
# TL_PUBLISH=<thư mục> (lát 2, dựng cả bộ): chép CHỈ file đạt sang <thư mục>/audio/w/<khóa>.mp3 (→ scripts/media/push.mjs) + $OUT/index.json {giọng: [chữ đạt]}.
# Đỏ khi: không file nào đạt, hoặc có file đạt ASR mà trượt độ to, hoặc tỉ lệ đạt < TL_MIN_PASS (mặc định 0.8).
import json, os, re, shutil, subprocess, sys, unicodedata
import numpy as np
TL = os.environ.get('TL', 'pt'); C = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tl-voices.json')))[TL]
OUT = os.environ.get('OUT', f'out/{TL}-sample'); MIN = float(os.environ.get('TL_MIN_PASS', '0.8')); SR = 24000
probe = json.load(open(os.path.join(OUT, 'probe.json')))
def lufs(f, loop=3):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-stream_loop', str(loop), '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = re.findall(r'I:\s+(-?[\d.]+) LUFS', o); return float(m[-1]) if m else None
def norm16(src, dst):
    # Lặp tối đa 4 lần: bộ giới hạn đỉnh −1 dBTP kéo độ to từ ngắn tụt dưới đích (lượt 41433773084: amigo −17,8) → đo lại, bù gain. Ngưỡng ±1 LU không đổi.
    i = lufs(src)
    if i is None: return None
    gain, li = -16 - i, None
    for _ in range(4):
        subprocess.run(['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', src, '-af', f'volume={gain:.2f}dB,alimiter=limit=0.891:level=false', '-ar', '24000', '-ac', '1', '-b:a', '64k', dst], check=True)
        li = lufs(dst)
        if li is None or abs(li + 16) <= 0.5: break
        gain += -16 - li
    return li
def nrm(s):
    s = unicodedata.normalize('NFC', s).casefold()
    return re.sub(r'\s+', ' ', re.sub(r'[^\w\s-]', '', s)).strip()
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'cine')); from whisper_det import load   # same verdict on every runner
# Bộ nghe: large-v3-turbo đa ngôn ngữ. Lượt 41433773084 chứng minh "small" không nghe nổi từ đơn tiếng Bồ: giọng ĐỐI CHỨNG Piper pt_BR (rõ, dữ liệu CC0)
# cũng chỉ 7/20, nghe "homem" → "O que é isso?", "gato" → "Pronto." – bộ nghe yếu chứ không phải giọng. Nghe tốt hơn = cổng chặt hơn (vẫn khớp đúng chữ).
model = load(os.environ.get('TL_ASR', C['asrModel']))
def hear(f, carrier=None):
    """Chữ nghe được. Từ đơn: ghép SAU câu mang của chính giọng đó (câu mang của bảng + 0,25 s lặng + clip) rồi lấy phần sau câu mang –
    Whisper (cả large-v3-turbo) bịa chữ khi nghe từ tiếng Bồ trơ trọi: lượt 41439608580 giọng đối chứng Piper "casa" → "Realmente.", "dia" → "Tchau.".
    Bộ nghe KHÔNG được biết từ đích; câu mang không nghe ra đúng → trả nguyên văn (trượt)."""
    w = f + '.pad.wav'
    if carrier:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', carrier, '-i', f, '-filter_complex', '[0:a]aresample=16000,apad=pad_dur=0.25[c];[1:a]aresample=16000[x];[c][x]concat=n=2:v=0:a=1,adelay=600:all=1,apad=pad_dur=0.6', '-ac', '1', w], check=True)
    else:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-af', 'adelay=600:all=1,apad=pad_dur=0.6', '-ar', '16000', '-ac', '1', w], check=True)
    segs, _ = model.transcribe(w, language=C['asrLang'], beam_size=5, temperature=0.0, without_timestamps=True, condition_on_previous_text=False)
    os.remove(w); t = ' '.join(s.text for s in segs).strip()
    if carrier:
        m = re.match(r'^\W*' + C['carrierRe'] + r'\W*(.*)$', unicodedata.normalize('NFC', t), re.I | re.S)
        return m.group(1).strip() if m else '[câu mang] ' + t
    return t
def pcm_of(f):
    return np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']), np.float32).copy()
def detail(src, text):
    """Bỏ tiếng xì thừa Kokoro sinh ở CUỐI phát ngôn (lượt 41444914173: comida/mão đọc trơ kết thúc bằng ~100 ms ZCR 0,55–0,68 ở −20 dB
    → nghe "comidas", "mãos"; câu mang cũng vậy → ghép vào nghe "ságua", "somente"). Chỉ cắt khi chữ viết KHÔNG tận cùng bằng âm xát s/z/x/r
    và đoạn xì dài 30–250 ms ngay sau phần hữu thanh. Trả đường dẫn wav mới (hoặc src nếu không có gì để cắt)."""
    last = re.sub(r'[^\w]+$', '', unicodedata.normalize('NFC', text).strip()).lower()
    if not last or last[-1] in C['fricEnd']: return src       # âm xát cuối thật (bảng: pt có r cuối [h]/[χ]; es không)
    pcm = pcm_of(src); fr = SR // 100; n = len(pcm) // fr
    if n < 10: return src
    db = np.array([10 * np.log10(np.mean(pcm[i * fr:(i + 1) * fr] ** 2) + 1e-12) for i in range(n)]); db -= db.max()
    zc = np.array([np.mean(np.abs(np.diff(np.sign(pcm[i * fr:(i + 1) * fr]))) > 0) for i in range(n)])
    e = n - 1
    while e > 0 and db[e] <= -36: e -= 1                      # bỏ lặng cuối
    while e > 0 and zc[e] < 0.25 and db[e] < -28: e -= 1      # phần tắt dần nhỏ, ít xát
    b = e
    while b > 0 and zc[b] >= 0.25 and db[b] > -40: b -= 1     # đoạn xì (giọng nam pm_alex tắt tới −37 dB)
    if not (3 <= e - b <= 25) or zc[b] >= 0.25: return src    # không có đoạn xì rõ ngay sau phần hữu thanh
    o = pcm[:(b + 1) * fr].copy(); fo = min(len(o), int(SR * 0.025)); o[-fo:] *= np.linspace(1, 0, fo)
    dst = src[:-4] + '.da.wav'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', dst], input=o.astype('float32').tobytes(), check=True)
    return dst
def cut_last(word, src):
    """Câu mang "<carrier> TỪ." → wav chỉ còn TỪ, hoặc (None, lý do). Câu phải được nghe ra đúng từ ở cuối (= asr_lib.cut_last, language = asrLang)."""
    segs, _ = model.transcribe(src, language=C['asrLang'], beam_size=5, temperature=0.0, word_timestamps=True, condition_on_previous_text=False)
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
        src = detail(src, r['w'])
        mp3 = src[:-4] + '.mp3'; li = norm16(src, mp3); heard = hear(mp3, CARRIER.get(r['v']) if ' ' not in r['w'].strip() else None)
        last = {'v': r['v'], 'w': r['w'], 'key': r.get('key'), 'm': c['m'], 'mp3': mp3, 'heard': heard, 'lufs': li, 'asr': nrm(heard) == nrm(r['w']), 'loud': li is not None and abs(li + 16) <= 1.0}
        last['ok'] = last['asr'] and last['loud']; tried.append({'m': c['m'], 'heard': heard})
        if last['ok']: break
    if last is None: last = {'v': r['v'], 'w': r['w'], 'ok': False, 'asr': False, 'loud': False, 'heard': '; '.join(t['heard'] for t in tried)}
    return {**last, 'tried': tried}
CARRIER = {v: detail(f, C['carrier'].rstrip(':')) for v, f in (probe.get('carrier') or {}).items()}
res = [gate(r) if r.get('f') else {**r, 'ok': False, 'why': r.get('err', 'no file')} for r in probe.get('rows', [])]
by = {}
for x in res: by.setdefault(x.get('v', '?'), []).append(x)
lines = [f'## Giọng từ đơn {TL} ({C["espeak"]}) – lượt mẫu', f"kokoro-js tự đọc {TL}: `{probe.get('kokoroJsGenTl')}` · giọng {TL} kèm kokoro-js: {probe.get('kokoroJsHasTl')} · âm vị mẫu {C['probe']}: `{(probe.get('sample') or {}).get('p')}` · ASR {os.environ.get('TL_ASR', C['asrModel'])}", '', '| giọng | đạt | qua câu mang | ASR trượt | độ to trượt |', '|---|---|---|---|---|']
for v, xs in by.items():
    lines.append(f"| {v} | {sum(x['ok'] for x in xs)}/{len(xs)} | {sum(1 for x in xs if x['ok'] and x.get('m') == 'cut')} | {', '.join(x['w'] + '→' + repr(x.get('heard')) for x in xs if not x.get('asr'))} | {', '.join(x['w'] for x in xs if x.get('asr') and not x.get('loud'))} |")
json.dump(res, open(os.path.join(OUT, 'gate.json'), 'w'), ensure_ascii=False, indent=1)
PUB = os.environ.get('TL_PUBLISH')
if PUB:
    os.makedirs(os.path.join(PUB, 'audio', 'w'), exist_ok=True); idx = {}
    for x in res:
        if x.get('ok') and x.get('key'):
            shutil.copyfile(x['mp3'], os.path.join(PUB, 'audio', 'w', x['key'] + '.mp3')); idx.setdefault(x['v'], []).append(x['w'])
    json.dump({v: sorted(ws) for v, ws in idx.items()}, open(os.path.join(OUT, 'index.json'), 'w'), ensure_ascii=False, indent=1)
txt = '\n'.join(lines); print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
# Tiêu chí tính RIÊNG từng giọng dùng thật (TL_REQUIRE, mặc định giọng Ama + Carlos của bảng); giọng khác (Piper đối chứng) chỉ báo cáo.
REQ = [v for v in os.environ.get('TL_REQUIRE', ','.join(C['voices'])).split(',') if v]
bad = []
for v in REQ:
    xs = by.get(v, []); ok = sum(x['ok'] for x in xs); n = len(xs) or 1
    bad_loud = [x['w'] for x in xs if x.get('asr') and not x.get('loud')]
    if ok == 0 or bad_loud or ok / n < MIN: bad.append(f'{v} đạt {ok}/{n} (< {MIN:.0%}) hoặc trượt độ to {bad_loud}')
    else: print(f'✓ {TL}-gate {v}: đạt {ok}/{n}')
# Seseo (es, spanish-course.md §7–§8): âm vị đưa vào Kokoro của mọi từ có c+e/i hoặc z phải là /s/, không /θ/; mẫu PHẢI có cielo + zapato.
if C.get('seseo'):
    SES = re.compile(r'c[eéií]|z', re.I); rows = [r for r in probe.get('rows', []) if r.get('v') in REQ and SES.search(r.get('w', ''))]
    need = {'cielo', 'zapato'} - {r['w'] for r in rows}
    wrong = sorted({r['w'] + '→' + str(r.get('ph')) for r in rows if not r.get('ph') or 'θ' in r['ph'] or 's' not in r['ph']})
    if need: bad.append(f'seseo: mẫu thiếu {sorted(need)}')
    if wrong: bad.append(f'seseo trượt (không ra /s/): {wrong}')
    msg = f"seseo: {len(rows)} lượt c/z · " + ('✓ đều /s/' if rows and not wrong else f'✗ {wrong}') + ' · ' + ', '.join(sorted({r['w'] + ' ' + str(r.get('ph')) for r in rows if r['w'] in ('cielo', 'zapato')}))
    print(msg)
    if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write('\n' + msg + '\n')
if bad: print(f'✗ {TL}-gate: ' + ' · '.join(bad)); sys.exit(1)
