# Cổng ASR audio câu (chỉ CI – sentence-audio-asr.yml, docs/WORD-AUDIO.md mục "Audio câu"). Dùng chung Whisper với từ đơn (scripts/word-audio/asr_lib.py).
# Tiêu chí KHÔNG được nới: sau chuẩn hoá Whisper (EnglishTextNormalizer: chữ thường, bỏ dấu câu, số/tiền tệ/chính tả Anh–Mỹ về một dạng),
#   WER(chữ gốc, chữ Whisper nghe) ≤ WER_MAX. Từ/cụm ≤ 3 chữ: đạt thêm nếu đúng tiêu chí từ đơn (asr_lib.heard_ok – đồng âm thật trong HOMO).
#  --todo .sa/todo.json: tải file đang phục vụ (audio.lexkite.com/audio/l/<khóa>.mp3) và nghe → --res {"khóa": "ok" | "pending: …"}; trượt → .sa/fail.json
#  --cands .sa/cands.json (render.mjs): mỗi câu chọn bản thử đầu tiên đạt → .media-out/audio/l/<khóa>-s2.mp3 (mono 24 kHz 64 kbps), res "s2";
#     không bản nào đạt → res = lý do (câu giữ bản cũ, vào web/audio/l/asr-fail.tsv).
import argparse, json, os, shutil, subprocess, sys, tempfile, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'word-audio'))
from asr_lib import fetch, hear, heard_ok, prepare
WER_MAX = 0.10  # ≤ 10 % – scripts/test/sentence-asr.mjs giữ hằng này khớp tài liệu; chỉ được siết, không nới
_N = None
def norm(s):
    global _N
    if _N is None:
        from whisper_normalizer.english import EnglishTextNormalizer
        _N = EnglishTextNormalizer()
    return _N(s).split()
def wer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    if not r: return 0.0 if not h else 1.0
    d = list(range(len(h) + 1))  # khoảng cách sửa theo chữ (Levenshtein)
    for i in range(1, len(r) + 1):
        p, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (r[i - 1] != h[j - 1]))
    return d[len(h)] / len(r)
def judge(text, f):
    t = hear(f); w = wer(text, t); short = len(text.split()) <= 3
    return (w <= WER_MAX or (short and heard_ok(text, t))), t, w
ap = argparse.ArgumentParser()
ap.add_argument('--todo', default=''); ap.add_argument('--cands', default=''); ap.add_argument('--res', default='.sa/res.json')
ap.add_argument('--minutes', type=float, default=1e6); ap.add_argument('--base', default='https://audio.lexkite.com/audio/l/')
ap.add_argument('--out', default='.media-out/audio/l')
a = ap.parse_args(); t0 = time.time(); tmp = tempfile.mkdtemp(); out = []
res = json.load(open(a.res)) if os.path.exists(a.res) else {}
save = lambda: (os.makedirs(os.path.dirname(a.res) or '.', exist_ok=True), json.dump(res, open(a.res, 'w'), ensure_ascii=False, indent=0))
late = lambda: time.time() - t0 > a.minutes * 60  # hết giờ: câu chưa nghe → không ghi kết quả → lượt sau làm lại
if a.todo and os.path.exists(a.todo):
    rows = json.load(open(a.todo)); fail, n, n_ok, ws = [], 0, 0, []
    for r in rows:
        if late(): break
        f = os.path.join(tmp, 'old.mp3')
        if not fetch(a.base + r['key'] + '.mp3', f): continue  # tải lỗi (mạng) → lượt sau
        ok, t, w = judge(r['text'], f); n += 1; ws.append(w)
        if ok: res[r['key']] = 'ok'; n_ok += 1
        else: res[r['key']] = f'pending: bản cũ "{t}" WER {w:.2f}'; fail.append(r)
    save(); json.dump(fail, open(os.path.join(os.path.dirname(a.todo), 'fail.json'), 'w'))
    out.append(f'## Bản đang phục vụ: {n_ok}/{n} câu đạt (WER ≤ {WER_MAX:.0%})' + (f' · {len(rows) - n} chưa nghe' if n < len(rows) else '')
               + (f' · WER trung bình {sum(ws) / len(ws):.3f}' if ws else '') + f' · {time.time() - t0:.0f}s')
if a.cands and os.path.exists(a.cands):
    rows = json.load(open(a.cands)); n, n_ok, t1 = 0, 0, time.time(); os.makedirs(a.out, exist_ok=True)
    for r in rows:
        if late(): break
        tried, pick = [], None
        for c in r['cands']:
            fs, why = prepare(r['text'], c['f'], c['m'])
            if not fs: tried.append(f'{c["m"]}: {why}'); continue
            for f in fs:
                ok, t, w = judge(r['text'], f); tried.append(f'{c["m"]}: "{t}" WER {w:.2f}')
                if ok: pick = f; break
            if pick: break
        n += 1; prev = res.get(r['key'], '').replace('pending: ', '')
        if pick:
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', pick, '-ac', '1', '-ar', '24000', '-b:a', '64k', os.path.join(a.out, r['key'] + '-s2.mp3')], check=True)
            res[r['key']] = 's2'; n_ok += 1
        else: res[r['key']] = ' · '.join(x for x in [prev] + tried if x) or 'không tạo được bản thử'
    save(); out.append(f'## Render lại: {n_ok}/{n} câu đạt → -s2 · {n - n_ok} vẫn trượt (giữ bản cũ) · {time.time() - t1:.0f}s')
txt = '\n'.join(out); print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
shutil.rmtree(tmp, ignore_errors=True)
