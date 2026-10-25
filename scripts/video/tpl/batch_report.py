#!/usr/bin/env python3
"""video-tpl1b.yml store step: batch gates + report (docs/VIDEO-TEMPLATES.md §9).
  python3 scripts/video/tpl/batch_report.py <batch-dir> <batch-no> [judge_rejects.txt]
Reads <id>.result.txt / <id>.mp4.rubric.json of every matrix job → batch host-framing gate (hostframe.batch: shoulder widths within
±HOST_LOCK.shoulder_tol of the batch median, same head top, crop spread capped; outliers are rejected) → accepted.txt (store_tpl.py), report.json + report.md (scores, failed gates, the one fix tried,
judge rejects), contact-sheet.jpg (hook / payoff / last frame of every render, label = id · host · score · status) and samples/ (3 best
accepted mp4 at >= tokens.VIDEO.min_mbps). Exit 0 always – the workflow fails on 0 accepted."""
import sys, os, json, glob, statistics, subprocess, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import HOST_LOCK, VIDEO
import hostframe as HF
from PIL import Image, ImageDraw, ImageFont
bd, bn = sys.argv[1], sys.argv[2]; jr = sys.argv[3] if len(sys.argv) > 3 else None
rows = []
for f in sorted(glob.glob(f'{bd}/*.result.txt')):
    p = open(f).read().split(); i, st, sc, fix = p[0], p[1], float(p[2]), ' '.join(p[3:])
    v = f'{bd}/{i}.mp4'; rb = json.load(open(v + '.rubric.json')) if os.path.exists(v + '.rubric.json') else {}
    rows.append(dict(id=i, status=st, score=sc, fix=fix, video=v if os.path.exists(v) else None, failed=rb.get('failed'), points=rb.get('points'),
                     host=rb.get('host'), hh=rb.get('host_head') or {}, lufs=rb.get('lufs')))
acc = [r for r in rows if r['status'] == 'accept' and r['hh'].get('screen')]
gate = dict(ok=True)
if acc:
    gate = HF.batch([(r['id'], r['host'], HF.check(r['hh']['screen'], HOST_LOCK, r['hh'].get('ext_rows', 0))) for r in acc], HOST_LOCK)
    bad = set(gate['outliers']) if gate['outliers'] else ({r['id'] for r in acc} if not gate['ok'] else set())
    for r in acc:
        if r['id'] in bad: r['status'] = 'reject'; r['failed'] = (r['failed'] or []) + ['batch_host_scale']
for r in rows: r.pop('hh', None)
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
md = [f"## tpl1b batch {bn}: {len(acc)}/{len(rows)} accepted (rubric ≥ 90 + all gates) · judge rejects {len(judge)} · host-framing gate {'PASS' if gate['ok'] else 'FAIL'}", '',
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
# hosts sheet: every video side by side at the SAME frame times (framing review: shoulder width, head top, centre, crop line must match by eye)
if vids:
    TS = [0.0, 1.5, 9.0]; HW_, HH_ = 240, 427
    hs = Image.new('RGB', (len(vids) * (HW_ + 8) + 8, len(TS) * (HH_ + 30) + 8), (238, 238, 238)); dh = ImageDraw.Draw(hs)
    for k, t in enumerate(TS):
        for j, r in enumerate(vids):
            x, y = 8 + j * (HW_ + 8), 8 + k * (HH_ + 30); fp = f"{bd}/_h{j}_{k}.png"
            subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', r['video'], '-frames:v', '1', '-vf', f'scale={HW_}:{HH_}', fp])
            dh.text((x, y), f"{r['host']} · t={t:.1f}s", fill=(20, 60, 60), font=ft)
            if os.path.exists(fp):
                im = Image.open(fp).convert('RGB'); d2 = ImageDraw.Draw(im)
                for yy in (HOST_LOCK['top'], HOST_LOCK['crop']):   # head top / waist target d2.line((0, yy * HH_ / 1920, HW_, yy * HH_ / 1920), fill=(229, 80, 47), width=1)   # HOST_LOCK top / crop guides
                hs.paste(im, (x, y + 22)); os.remove(fp)
    hs.save(f'{bd}/hosts-sheet.jpg', quality=88)
os.makedirs(f'{bd}/samples', exist_ok=True)
cand = sorted([r for r in acc if (r['mbps'] or 0) >= VIDEO['min_mbps']], key=lambda r: -r['score']); pick = []
for r in cand:   # best per host first (one sample per host), then the next best
    if r['host'] not in {x['host'] for x in pick}: pick.append(r)
pick += [r for r in cand if r not in pick]
for r in pick[:3]: shutil.copy2(r['video'], f"{bd}/samples/{r['id']}.mp4")
