# Chấm A/B Kokoro ↔ ElevenLabs (chỉ CI – .github/workflows/tts-ab.yml, docs/TTS-AB.md). 0 credit: chỉ đọc file đã render.
#   python3 scripts/tts-ab/score.py --texts .tts-ab/texts.json --audio .tts-ab/audio --out .tts-ab/score.json   (cần ffmpeg, faster-whisper, rhubarb)
# Mỗi file: WER (đúng hàm + ngưỡng của cổng ASR câu scripts/sentence-asr.py, không chép lại), nhịp wpm (câu ≥ 6 chữ, bỏ lặng đầu/cuối, trần 150),
# độ to LUFS + true peak (ffmpeg ebur128), số mẫu chạm trần (clipping), khẩu hình Rhubarb (chạy được? mở/khép khớp tiếng?), độ trễ (meta lúc render),
# độ giống giọng tham chiếu (sim: cosine phổ trung bình dài hạn log-băng so với file CÙNG mục của ref_cfg, mặc định kokoro-video = giọng video
# của giáo viên) – đo "một giọng đồng nhất": cùng voice id Kokoro ≈ 1,0, engine/giọng khác thấp hơn.
import argparse, json, os, re, statistics as st, subprocess, sys, tempfile, time
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'word-audio'))
from asr_lib import hear, heard_ok
# Lấy wer() + WER_MAX + chuẩn hoá từ chính cổng ASR (phần trước argparse) – một nguồn tiêu chí, không nới
_src = open(os.path.join(ROOT, 'scripts', 'sentence-asr.py'), encoding='utf8').read().split('\nap = argparse.ArgumentParser()')[0]
G = {'__file__': os.path.join(ROOT, 'scripts', 'sentence-asr.py')}; exec(compile(_src, 'sentence-asr.py', 'exec'), G)
wer, WER_MAX = G['wer'], G['WER_MAX']
WPM_MAX = 150; SR = 24000
ap = argparse.ArgumentParser()
ap.add_argument('--texts', default='.tts-ab/texts.json'); ap.add_argument('--audio', default='.tts-ab/audio'); ap.add_argument('--out', default='.tts-ab/score.json')
ap.add_argument('--rhubarb', default=os.environ.get('RHUBARB', 'rhubarb'))
a = ap.parse_args()
T = json.load(open(a.texts)); items = {i['id']: i for i in T['items']}; tmp = tempfile.mkdtemp()

def pcm(f):
    return np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']), np.float32)
def frames_db(x, hop=SR // 100):
    n = len(x) // hop; e = (x[:n * hop].reshape(n, hop) ** 2).mean(1)
    return 10 * np.log10(e + 1e-12) - 10 * np.log10(e.max() + 1e-12)
def loud(f):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', f, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    i = re.findall(r'I:\s+(-?[\d.]+) LUFS', o); p = re.findall(r'Peak:\s+(-?[\d.]+|-inf) dBFS', o)
    return (float(i[-1]) if i else None), (float(p[-1]) if p and p[-1] != '-inf' else None)
def rhubarb(f, text):
    w = os.path.join(tmp, 'r.wav'); d = os.path.join(tmp, 'r.txt'); open(d, 'w').write(text)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', f, '-ac', '1', '-ar', '16000', '-sample_fmt', 's16', w], check=True)
    t0 = time.time(); r = subprocess.run([a.rhubarb, '-q', '-f', 'json', '-d', d, w], capture_output=True, text=True, timeout=300)
    if r.returncode: return dict(ok=False, err=r.stderr[-200:])
    cues = json.loads(r.stdout)['mouthCues']; x = pcm(f); db = frames_db(x)
    shape = np.array(['X'] * len(db), dtype=object)
    for c in cues: shape[int(c['start'] * 100):int(c['end'] * 100)] = c['value']
    talk = db > -35; open_ = shape != 'X'                                  # X = miệng nghỉ (Rhubarb); A = mím (P/B/M) vẫn là đang nói
    return dict(ok=True, sec=round(time.time() - t0, 2), shapes_per_s=round(len(cues) / max(0.1, len(db) / 100), 2),
                agree=round(float((talk == open_).mean()), 3), kinds=len({c['value'] for c in cues}))

_LT = {}
def ltas(f):
    if f not in _LT:
        x = pcm(f); n = 512; h = 256; m = (len(x) - n) // h
        if m < 4: _LT[f] = None; return None
        fr = np.lib.stride_tricks.sliding_window_view(x, n)[::h][:m] * np.hanning(n); P = np.abs(np.fft.rfft(fr, axis=1)) ** 2
        e = 10 * np.log10(P.sum(1) + 1e-12); P = P[e > e.max() - 40]                        # chỉ khung có tiếng
        fq = np.fft.rfftfreq(n, 1 / SR); edges = np.geomspace(100, 8000, 49)
        b = np.array([P[:, (fq >= lo) & (fq < hi)].mean() for lo, hi in zip(edges[:-1], edges[1:])])
        v = np.log10(b + 1e-12); _LT[f] = v - v.mean()
    return _LT[f]
def sim(f, g):
    a, b = ltas(f), ltas(g)
    return None if a is None or b is None else round(float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b) + 1e-12)), 3)
def find(cfg, iid):
    for ext in ('.wav', '.mp3'):
        f = os.path.join(a.audio, cfg, iid + ext)
        if os.path.exists(f): return f
rows = []
for cfg in sorted(os.listdir(a.audio)):
    d = os.path.join(a.audio, cfg)
    if not os.path.isdir(d): continue
    for fn in sorted(os.listdir(d)):
        if not fn.endswith(('.wav', '.mp3')): continue
        iid = fn.rsplit('.', 1)[0]; f = os.path.join(d, fn); meta = json.load(open(os.path.join(d, iid + '.json')))
        text = meta['text']; it = items[iid]; x = pcm(f); db = frames_db(x)
        sp = np.where(db > -40)[0]; speech = (sp[-1] - sp[0] + 1) / 100 if len(sp) else 0.0
        nw = len(re.findall(r"[A-Za-z0-9']+", text)); heard = hear(f); w = wer(text, heard)
        ok = w <= WER_MAX or (nw <= 3 and heard_ok(text, heard))
        lufs, tp = loud(f); ref = meta.get('ref_cfg', 'kokoro-video'); rf = find(ref, iid) if cfg != ref else None
        rows.append(dict(cfg=cfg, id=iid, cat=it['cat'], who=it['who'], words=nw, heard=heard, wer=round(w, 3), asr_ok=bool(ok),
                         dur=round(len(x) / SR, 2), speech=round(speech, 2), wpm=round(nw / speech * 60, 1) if nw >= 6 and speech else None,
                         lufs=lufs, true_peak=tp, clip=int((np.abs(x) >= 0.999).sum()), lip=rhubarb(f, text),
                         ttfb_ms=meta.get('ttfb_ms'), total_ms=meta.get('total_ms'), rtf=meta.get('rtf'), cold=meta.get('cold'),
                         sim=sim(f, rf) if rf else None))
        print(f"{cfg:<13} {iid:<8} WER {w:.2f} {'✓' if ok else '✗'} · {rows[-1]['wpm'] or '-'} wpm · {lufs} LUFS · lip {rows[-1]['lip'].get('agree')}")

def agg(rs):
    m = lambda k: (round(st.mean(v), 3) if (v := [r[k] for r in rs if r[k] is not None]) else None)
    wp = [r['wpm'] for r in rs if r['wpm']]; lu = [r['lufs'] for r in rs if r['lufs'] is not None]; lp = [r['lip'] for r in rs]
    return dict(n=len(rs), asr_pass=round(sum(r['asr_ok'] for r in rs) / len(rs), 3), wer=m('wer'),
                wpm=round(st.mean(wp), 1) if wp else None, wpm_max=max(wp) if wp else None, over150=sum(v > WPM_MAX for v in wp),
                lufs=round(st.mean(lu), 1) if lu else None, lufs_sd=round(st.pstdev(lu), 2) if len(lu) > 1 else None,
                true_peak_max=max((r['true_peak'] for r in rs if r['true_peak'] is not None), default=None), clip_files=sum(r['clip'] > 0 for r in rs),
                lip_ok=round(sum(l['ok'] for l in lp) / len(lp), 3), lip_agree=round(st.mean([l['agree'] for l in lp if l['ok']]), 3) if any(l['ok'] for l in lp) else None,
                ttfb_ms=m('ttfb_ms'), total_ms=m('total_ms'), rtf=m('rtf'), sim=m('sim'),
                warm_ttfb_ms=(round(st.median(v)) if (v := [r['ttfb_ms'] for r in rs if r['ttfb_ms'] is not None and not r.get('cold')]) else None))
cfgs = sorted({r['cfg'] for r in rows}); cats = ['word', 'ex', 'line', 'hard', 'story']
S = {c: {'all': agg([r for r in rows if r['cfg'] == c]), **{k: agg(v) for k in cats if (v := [r for r in rows if r['cfg'] == c and r['cat'] == k])}} for c in cfgs}
# So sánh công bằng: chỉ trên các mục MỌI cấu hình đều có (core) – ngoài bảng toàn tập
common = set.intersection(*[{r['id'] for r in rows if r['cfg'] == c} for c in cfgs]) if cfgs else set()
SC = {c: agg([r for r in rows if r['cfg'] == c and r['id'] in common]) for c in cfgs} if common else {}
META = {c: json.load(open(os.path.join(a.audio, c, 'meta.json'))) for c in cfgs if os.path.exists(os.path.join(a.audio, c, 'meta.json'))}   # tải model, khởi động lạnh
json.dump(dict(wer_max=WER_MAX, wpm_max=WPM_MAX, rows=rows, by_cfg=S, common_ids=sorted(common), common=SC, engine_meta=META), open(a.out, "w"), indent=1, default=lambda o: o.item() if hasattr(o, "item") else str(o))   # numpy int64/float32 (01/11 run 41302966542)
L = [f'## Chấm A/B ({len(rows)} file) – WER ≤ {WER_MAX:.0%} (cổng ASR câu), nhịp ≤ {WPM_MAX} wpm',
     f'### Trên {len(common)} mục chung (so công bằng)', '| cấu hình | ASR đạt | WER tb | wpm tb / max / >150 | LUFS tb ± sd | true peak max | file clip | Rhubarb ok / khớp | ra tiếng (trung vị, ấm) / tổng ms | RTF | giống giọng GV |', '|---|---|---|---|---|---|---|---|---|---|---|']
for c, s in (SC or {c: S[c]['all'] for c in cfgs}).items():
    L.append(f"| {c} | {s['asr_pass']:.0%} | {s['wer']} | {s['wpm']} / {s['wpm_max']} / {s['over150']} | {s['lufs']} ± {s['lufs_sd']} | {s['true_peak_max']} | {s['clip_files']} | {s['lip_ok']:.0%} / {s['lip_agree']} | {s['warm_ttfb_ms']} / {s['total_ms']} | {s['rtf']} | {s['sim']} |")
L += ['### Theo nhóm (toàn tập của từng cấu hình): ASR đạt · WER tb', '| cấu hình | ' + ' | '.join(cats) + ' |', '|---' * (len(cats) + 1) + '|']
for c in cfgs: L.append(f'| {c} | ' + ' | '.join(f"{S[c][k]['asr_pass']:.0%} · {S[c][k]['wer']}" if k in S[c] else '–' for k in cats) + ' |')
if META: L += ['### Khởi động (model tải về, lần đầu)', *[f"- {c}: {json.dumps(v, ensure_ascii=False)[:300]}" for c, v in META.items()]]
fails = [r for r in rows if not r['asr_ok']]
if fails: L += ['### Trượt ASR', *[f"- {r['cfg']} {r['id']}: \"{items[r['id']]['text'][:70]}\" → \"{r['heard'][:70]}\" (WER {r['wer']})" for r in fails[:60]]]
txt = '\n'.join(L); print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
