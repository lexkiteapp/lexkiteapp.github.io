# Nghe lại giọng từ đơn bằng faster-whisper (chỉ CI – word-audio.yml) + kiểm độ dài. Chỉ file ĐẠT mới được chép ra để đẩy lên kho media.
#  --manifest .s3-cand/manifest.json (gen-word-audio.mjs ghi): mỗi (từ, giọng) chọn bản thử đầu tiên được nghe đúng (đồng âm được chấp nhận, asr_lib.HOMO)
#     và dài hợp lý (asr_lib.dur_ok) → chép sang out (…/<fnv(giọng|từ|s3)>.mp3). Kết quả → --res (JSON {"từ\tgiọng": "ok" | lý do});
#     (từ, giọng) trượt → .s3-cand/fail.json cho vòng 2. --old: nghe luôn file cũ (khóa không |s3) để thống kê "trước".
#  --sample N: tải ngẫu nhiên N file đang phục vụ trên audio.lexkite.com/audio/w/ và báo bao nhiêu file không được nhận đúng (chỉ báo cáo).
import argparse, json, os, random, shutil, sys, tempfile, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'word-audio'))
from asr_lib import check, fetch, fnv, prepare
ap = argparse.ArgumentParser()
ap.add_argument('--manifest', default=''); ap.add_argument('--res', default='.wa-res/res.json'); ap.add_argument('--old', action='store_true')
ap.add_argument('--sample', type=int, default=0); ap.add_argument('--suffix', default='|s3'); ap.add_argument('--minutes', type=float, default=1e6)
ap.add_argument('--final', action='store_true')  # vòng cuối: trượt = lý do chính thức (không có: "pending: …" chờ vòng 2)
ap.add_argument('--base', default='https://audio.lexkite.com/audio/w/')
a = ap.parse_args(); t0 = time.time(); tmp = tempfile.mkdtemp(); out = []
res = json.load(open(a.res)) if os.path.exists(a.res) else {}
if a.manifest and os.path.exists(a.manifest):
    rows = json.load(open(a.manifest)); fail, n_ok, n = [], 0, 0
    for r in rows:
        if time.time() - t0 > a.minutes * 60: break  # hết giờ: (từ, giọng) chưa nghe → không ghi kết quả → lượt sau làm lại
        key = r['word'] + '\t' + r['voice']; tried = []; pick = None
        for c in r['cands']:
            fs, why = prepare(r['word'], c['f'], c['m'])
            if not fs: tried.append(f'{c["m"]}: {why}'); continue
            for f in fs:
                ok, t, d = check(r['word'], f); tried.append(f'{c["m"]}:"{t}" {d:.2f}s')
                if ok: pick = dict(c, f=f); break
            if pick: break
        if a.old and r.get('old'):
            f = os.path.join(tmp, 'old.mp3')
            if fetch(a.base + fnv(r['voice'] + '|' + r['word']) + '.mp3', f):
                ok, t, d = check(r['word'], f); res['old\t' + key] = 'ok' if ok else f'"{t}" {d:.2f}s'
        n += 1
        if pick:
            os.makedirs(os.path.dirname(r['out']), exist_ok=True); shutil.copyfile(pick['f'], r['out']); res[key] = 'ok'; n_ok += 1
        else:
            prev = res.get(key, '').replace('pending: ', ''); why = ((prev + ' · ') if prev and prev != 'ok' else '') + (' · '.join(tried) or 'không tạo được bản thử')
            res[key] = why if a.final else 'pending: ' + why
            fail.append({k: r[k] for k in ('word', 'voice', 'old') if k in r})
    os.makedirs(os.path.dirname(a.res) or '.', exist_ok=True); json.dump(res, open(a.res, 'w'), ensure_ascii=False, indent=0)
    json.dump(fail, open(os.path.join(os.path.dirname(a.manifest), 'fail.json'), 'w'))
    out.append(f'## {a.manifest}: {n_ok}/{n} (từ × giọng) đạt · {len(fail)} trượt' + (f' · {len(rows) - n} chưa nghe (hết giờ)' if n < len(rows) else ''))
    out += ['- ' + x['word'] + '/' + x['voice'] + ': ' + res[x['word'] + '\t' + x['voice']][:200] for x in fail[:60]]
if a.sample > 0:
    st = {l.split('\t')[0]: l.split('\t')[1:] for l in open('web/audio/w/s3.tsv').read().split('\n') if l} if os.path.exists('web/audio/w/s3.tsv') else {}
    words = [w for w in open('web/audio/w/index.txt').read().split('\n') if w]
    rnd = random.Random(os.environ.get('GITHUB_RUN_ID', '1')); fails, n = [], 0
    for w in rnd.sample(words, min(a.sample, len(words))):
        vs = [v for i, v in enumerate(['bf_emma', 'af_heart']) if w not in st or (st[w][i:i + 1] or ['ok'])[0] == 'ok']
        if not vs: continue
        v = rnd.choice(vs); f = os.path.join(tmp, 's.mp3'); n += 1
        if not fetch(a.base + fnv(v + '|' + w + a.suffix) + '.mp3', f): fails.append(f'{w}/{v}: tải lỗi'); continue
        ok, t, d = check(w, f)
        if not ok: fails.append(f'{w}/{v}: "{t}" {d:.2f}s')
    out.append(f'\n## Mẫu {n} file đang phục vụ (khóa "{a.suffix}"): {len(fails)} không được nhận đúng\n' + '\n'.join('- ' + x for x in fails))
txt = '\n'.join(out); print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
shutil.rmtree(tmp, ignore_errors=True)
