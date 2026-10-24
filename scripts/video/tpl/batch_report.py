#!/usr/bin/env python3
"""video-tpl1b.yml store step: batch gates + report (docs/VIDEO-TEMPLATES.md §9).
  python3 scripts/video/tpl/batch_report.py <batch-dir> <batch-no> [judge_rejects.txt]
Reads <id>.result.txt / <id>.mp4.rubric.json of every matrix job → batch host-scale gate (every accepted host head within ±HOST_LOCK.tol of
the batch median; outliers are rejected) → accepted.txt (store_tpl.py), report.json + report.md (scores, failed gates, the one fix tried,
judge rejects), contact-sheet.jpg (hook / payoff / last frame of every render, label = id · host · score · status) and samples/ (3 best
accepted mp4 at >= 5.5 Mbps). Exit 0 always – the workflow fails on 0 accepted."""
import sys, os, json, glob, statistics, subprocess, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import HOST_LOCK
from PIL import Image, ImageDraw, ImageFont
bd, bn = sys.argv[1], sys.argv[2]; jr = sys.argv[3] if len(sys.argv) > 3 else None
rows = []
for f in sorted(glob.glob(f'{bd}/*.result.txt')):
    p = open(f).read().split(); i, st, sc, fix = p[0], p[1], float(p[2]), ' '.join(p[3:])
    v = f'{bd}/{i}.mp4'; rb = json.load(open(v + '.rubric.json')) if os.path.exists(v + '.rubric.json') else {}
    rows.append(dict(id=i, status=st, score=sc, fix=fix, video=v if os.path.exists(v) else None, failed=rb.get('failed'), points=rb.get('points'),
                     host=rb.get('host'), head=(rb.get('host_head') or {}).get('head'), lufs=rb.get('lufs')))
acc = [r for r in rows if r['status'] == 'accept' and r['head']]
gate = dict(ok=True)
if acc:
    med = statistics.median(r['head'] for r in acc); out = [r for r in acc if abs(r['head'] - med) > HOST_LOCK['tol'] * med]
    by = {}
    for r in acc: by.setdefault(r['host'], []).append(r['head'])
    gate = dict(ok=not out, median=med, tol=HOST_LOCK['tol'], by_host={h: [min(v), max(v)] for h, v in by.items()}, outliers=[r['id'] for r in out])
    for r in out: r['status'] = 'reject'; r['failed'] = (r['failed'] or []) + ['batch_host_scale']
def mbps(v):
    try: return int(json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=bit_rate', '-of', 'json', v]))['format']['bit_rate']) / 1e6
    except Exception: return 0
for r in rows: r['mbps'] = round(mbps(r['video']), 2) if r['video'] else None
acc = [r for r in rows if r['status'] == 'accept']
open(f'{bd}/accepted.txt', 'w').write(''.join(f"{r['id']} {r['video']}\n" for r in acc))
judge = [l.strip() for l in open(jr)] if jr and os.path.exists(jr) else []
judge = [l for l in judge if l]
R = dict(batch=bn, rendered=len(rows), accepted=len(acc), rejected=len(rows) - len(acc), judge_rejects=judge, host_scale_gate=gate,
         mean_score=round(statistics.mean(r['score'] for r in rows), 1) if rows else None, items=rows)
json.dump(R, open(f'{bd}/report.json', 'w'), indent=1)
md = [f"## tpl1b batch {bn}: {len(acc)}/{len(rows)} accepted (rubric ≥ 90 + all gates) · judge rejects {len(judge)} · host-scale gate {'PASS' if gate['ok'] else 'FAIL'}", '',
      '| lesson | host | score | status | fix | failed gates | Mbps |', '|---|---|---|---|---|---|---|']
md += [f"| {r['id']} | {r['host']} | {r['score']:.0f} | {r['status']} | {r['fix']} | {', '.join(r['failed'] or []) or '–'} | {r['mbps']} |" for r in rows]
if judge: md += ['', '**Groq judge rejects:**'] + [f'- {l}' for l in judge]
open(f'{bd}/report.md', 'w').write('\n'.join(md) + '\n'); print('\n'.join(md))
# contact sheet
TW, TH = 216, 384; vids = [r for r in rows if r['video']]
if vids:
    sh = Image.new('RGB', (3 * TW + 24, len(vids) * (TH + 40) + 8), (238, 238, 238)); dr = ImageDraw.Draw(sh)
    try: ft = ImageFont.truetype('brand/social/src/fonts/BeVietnamPro-Bold.ttf', 15)
    except Exception: ft = ImageFont.load_default()
    for j, r in enumerate(vids):
        T = json.load(open(r['video'] + '.timeline.json')) if os.path.exists(r['video'] + '.timeline.json') else {}
        tot = T.get('total') or 30; ts = [0.9, (T.get('beats', {}).get('k') or {}).get('vout', 9.0) - 0.2, tot - 0.15]
        y = 8 + j * (TH + 40)
        dr.text((8, y), f"{r['id']} · {r['host']} · {r['score']:.0f} · {r['status'].upper()} · {r['fix']}", fill=(20, 60, 60) if r['status'] == 'accept' else (200, 50, 30), font=ft)
        for k, t in enumerate(ts):
            fp = f"{bd}/_f{j}_{k}.jpg"
            subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', f'{max(0, t):.2f}', '-i', r['video'], '-frames:v', '1', '-vf', f'scale={TW}:{TH}', fp])
            if os.path.exists(fp): sh.paste(Image.open(fp), (8 + k * (TW + 4), y + 24)); os.remove(fp)
    sh.save(f'{bd}/contact-sheet.jpg', quality=85)
os.makedirs(f'{bd}/samples', exist_ok=True)
cand = sorted([r for r in acc if (r['mbps'] or 0) >= 5.5], key=lambda r: -r['score']); pick = []
for r in cand:   # best per host first (one sample per host), then the next best
    if r['host'] not in {x['host'] for x in pick}: pick.append(r)
pick += [r for r in cand if r not in pick]
for r in pick[:3]: shutil.copy2(r['video'], f"{bd}/samples/{r['id']}.mp4")
