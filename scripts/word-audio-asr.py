# Nghe lại giọng từ đơn bằng nhận dạng giọng nói (faster-whisper, chỉ chạy trên CI – word-audio.yml) + kiểm độ dài.
#  1) Từ dạng mạnh (.s2-cand/manifest.json do gen-word-audio.mjs ghi): mỗi từ × giọng chọn bản thử đầu tiên được nhận đúng từ
#     (chấp nhận đồng âm, vd. to → two/too) và dài 0,15–1,6 s → chép sang OUT/<fnv(giọng|từ|s2)>.mp3, ghi web/audio/w/s2.txt.
#     Có từ không đạt → thoát 1 (job dừng, không đẩy file nào).
#  2) --sample N: tải ngẫu nhiên N file cũ trên audio.lexkite.com/audio/w/ và báo bao nhiêu file không được nhận đúng (chỉ báo cáo).
#   python3 scripts/word-audio-asr.py [--manifest .s2-cand/manifest.json] [--sample 100]
import argparse, json, os, random, re, shutil, subprocess, sys, tempfile, urllib.request
ap = argparse.ArgumentParser()
ap.add_argument('--manifest', default='.s2-cand/manifest.json'); ap.add_argument('--sample', type=int, default=0)
ap.add_argument('--model', default='base.en'); ap.add_argument('--base', default='https://audio.lexkite.com/audio/w/')
a = ap.parse_args()
HOMO = {'to': ['two', 'too'], 'for': ['four', 'fore'], 'a': ['ay', 'eh', 'hey a'], 'the': ['thee'], 'be': ['bee', 'b'], 'there': ['their', 'theyre'],
        'you': ['u', 'yew', 'ewe'], 'we': ['wee', 'oui'], 'or': ['oar', 'ore', 'awe', 'aw'], 'nor': ['gnaw', 'naw'], 'so': ['sew', 'sow'],
        'would': ['wood'], 'some': ['sum'], 'do': ['due', 'dew'], 'but': ['butt'], 'into': ['in to'], 'onto': ['on to'], 'he': ['hee'], 'and': ['an']}
norm = lambda s: re.sub(r'\s+', ' ', re.sub(r'[^a-z ]', '', s.lower().replace('-', ' '))).strip()
def heard_ok(word, text):
    t = norm(text); ok = {norm(word)} | {norm(h) for h in HOMO.get(word.lower(), [])}
    return t in ok or t.replace(' ', '') in {x.replace(' ', '') for x in ok}
def dur(f):
    try: return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode().strip())
    except Exception: return 0.0
def fnv(s):
    h = 0x811c9dc5
    for ch in s: h = ((h ^ ord(ch)) * 0x01000193) & 0xffffffff
    d = '0123456789abcdefghijklmnopqrstuvwxyz'; o = ''
    while True:
        h, r = divmod(h, 36); o = d[r] + o
        if not h: return o
def fetch(url, f):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'lexkite-ci-asr'})
        with urllib.request.urlopen(req, timeout=20) as r, open(f, 'wb') as w: w.write(r.read()); return True
    except Exception: return False
from faster_whisper import WhisperModel
model = WhisperModel(a.model, device='cpu', compute_type='int8')
def hear(f):
    seg, _ = model.transcribe(f, language='en', beam_size=5, without_timestamps=True, condition_on_previous_text=False)
    return ''.join(s.text for s in seg).strip()
out, bad = [], 0
tmp = tempfile.mkdtemp()
if os.path.exists(a.manifest):
    rows = json.load(open(a.manifest)); res = {}
    out.append('## Từ dạng mạnh (s2)\n| từ | giọng | chọn | nghe được | dài mới | dài cũ |\n|---|---|---|---|---|---|')
    for r in rows:
        pick, tried = None, []
        for i, c in enumerate(r['cands']):
            t, d = hear(c), dur(c); tried.append(f'c{i}:"{t}" {d:.2f}s')
            if heard_ok(r['word'], t) and 0.15 <= d <= 1.6: pick = (i, t, d); break
        old = os.path.join(tmp, 'old.mp3'); od = dur(old) if fetch(a.base + fnv(r['voice'] + '|' + r['word']) + '.mp3', old) else 0
        if pick:
            os.makedirs(os.path.dirname(r['out']), exist_ok=True); shutil.copyfile(r['cands'][pick[0]], r['out'])
            out.append(f"| {r['word']} | {r['voice']} | c{pick[0]} | {pick[1]} | {pick[2]:.2f}s | {od:.2f}s |")
        else:
            bad += 1; out.append(f"| {r['word']} | {r['voice']} | ✗ | {' · '.join(tried)} | | {od:.2f}s |")
        res.setdefault(r['word'], []).append(bool(pick))
    done = sorted(w for w, v in res.items() if len(v) == 2 and all(v))
    s2 = 'web/audio/w/s2.txt'; prev = set(open(s2).read().split()) if os.path.exists(s2) else set()
    if not bad: open(s2, 'w').write('\n'.join(sorted(prev | set(done))) + '\n')
    out.append(f'\n**s2: {len(done)}/{len(res)} từ đạt cả 2 giọng · {bad} file không đạt**')
if a.sample > 0:
    s2w = set(re.findall(r"(\w+): \['", open('scripts/word-audio-strong.mjs').read()))
    words = [w for w in open('web/audio/w/index.txt').read().split('\n') if w and w not in s2w]
    rnd = random.Random(os.environ.get('GITHUB_RUN_ID', '1')); fails, n = [], 0
    for w in rnd.sample(words, min(a.sample, len(words))):
        v = rnd.choice(['bf_emma', 'af_heart']); f = os.path.join(tmp, 's.mp3')
        if not fetch(a.base + fnv(v + '|' + w) + '.mp3', f): fails.append(f'{w}/{v}: tải lỗi'); n += 1; continue
        t, d = hear(f), dur(f); n += 1
        if not heard_ok(w, t) or not 0.15 <= d <= 3.0: fails.append(f'{w}/{v}: "{t}" {d:.2f}s')
    out.append(f'\n## Mẫu {n} file cũ: {len(fails)} không được nhận đúng\n' + '\n'.join('- ' + x for x in fails))
txt = '\n'.join(out); print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
shutil.rmtree(tmp, ignore_errors=True)
sys.exit(1 if bad else 0)
