#!/usr/bin/env python3
"""Re-render a cine short from its recipe (scripts/cine/recipe.py) + the footage bank, then compare with the reference master.

  rebuild_from_recipe.py <recipe.json> [--ref master.mp4] [--out dir] [--min-ssim 0.99] [--report out.json]

Runs on CI (.github/workflows/shorts-rebuild.yml) with the news-job environment: CINE_ROOT (pipeline checkout at recipe pipeline.sha),
CINE_LIB (lexkite-footage @ footage.sha), NEWS_DEPTH/NEWS_ZONES (depth cache), KOKORO_NODE_PATH, RHUBARB.
Steps: NEWS_DIR/ci/lines.json + lessons/<id>.json from the recipe (no repo content needed) → news_voice.py → news.py (NEWS_BG = recipe
background) → out/<clip>.mp4. Result: 'identical' (same sha256), 'visual' (SSIM ≥ min, frame count equal) or 'differs'. Exit 0 only if
identical/visual. No AI judge / vision gate / Kling: 0 credits.
"""
import hashlib, json, os, re, shutil, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import recipe as R


def ssim(a, b):
    """Mean SSIM (ffmpeg ssim filter, all planes) + frame counts."""
    p = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-i', a, '-i', b, '-lavfi', '[0:v][1:v]ssim', '-f', 'null', '-'], capture_output=True, text=True)
    m = re.findall(r'All:([\d.]+)', p.stderr)
    return float(m[-1]) if m else 0.0


def frames(p):
    try: return int(subprocess.check_output(['ffprobe', '-v', 'error', '-count_packets', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', p], text=True).strip())
    except Exception: return -1


def compare(new, ref, min_ssim=0.99):
    if not ref or not os.path.exists(ref): return dict(result='no-reference', sha256=R.sha_file(new))
    a, b = R.sha_file(new), R.sha_file(ref)
    if a == b: return dict(result='identical', sha256=a, ssim=1.0)
    s, fa, fb = ssim(new, ref), frames(new), frames(ref)
    return dict(result='visual' if s >= min_ssim and fa == fb else 'differs', sha256=a, ref_sha256=b, ssim=round(s, 5), frames=fa, ref_frames=fb)


def prepare(rec, nd):
    """NEWS_DIR inputs from the recipe alone."""
    i = rec['inputs']; sc = i['script']
    os.makedirs(f'{nd}/ci', exist_ok=True); os.makedirs(f'{nd}/lessons', exist_ok=True)
    json.dump(dict(voices=sc['voices'], speed=sc['speed'], lines=sc['lines'], reactions=sc.get('reactions') or {}), open(f'{nd}/ci/lines.json', 'w'), indent=1)
    json.dump(sc['spec'], open(f"{nd}/lessons/{i['lesson']}.json", 'w'), indent=1)
    return i['lesson']


def main():
    a = sys.argv[1:]
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    rec = json.load(open(a[0])); errs = R.check(rec)
    if errs: sys.exit('recipe invalid: ' + ', '.join(errs))
    if rec.get('legacy') and not (rec['inputs'].get('script') or {}).get('spec'): sys.exit('legacy scene recipe: lesson5 rebuild not supported (meta only)')
    i = rec['inputs']; root = os.environ.get('CINE_ROOT', os.path.dirname(os.path.dirname(HERE)))
    nd = os.environ.setdefault('NEWS_DIR', os.path.abspath(opt('--work', 'rebuild_work')))
    out = os.path.abspath(opt('--out', os.environ.get('CINE_OUT', 'rebuild_out'))); os.environ['CINE_OUT'] = out; os.makedirs(out, exist_ok=True)
    lid = prepare(rec, nd)
    env = dict(os.environ)
    if i.get('background') and i['background'] != (i['script']['spec'] or {}).get('bg'): env['NEWS_BG'] = i['background']
    else: env.pop('NEWS_BG', None)
    subprocess.run([sys.executable, f'{root}/scripts/cine/news_voice.py', nd, lid], check=True, env=env)
    vis = {k: v for k, v in R.voice_hashes(f'{nd}/vis3', i['script']['lines']).items()}
    want = (i.get('tts') or {}).get('voice_sha') or {}
    voice_same = not want or all(vis.get(k) == v for k, v in want.items())
    subprocess.run([sys.executable, f'{root}/scripts/cine/news.py', lid], check=True, env=env)
    mp4 = os.path.join(out, i['clip'] + '.mp4')
    if not os.path.exists(mp4):
        c = [f for f in os.listdir(out) if f.endswith('.mp4')]; sys.exit(f'no output {mp4} (found {c})')
    rep = dict(clip=i['clip'], recipe_id=rec['recipe_id'], voices_identical=voice_same, **compare(mp4, opt('--ref'), float(opt('--min-ssim', '0.99'))))
    want_sha = (rec.get('outputs') or {}).get('master_sha256')
    if want_sha and rep['result'] == 'no-reference' and rep['sha256'] == want_sha: rep['result'] = 'identical'
    print(json.dumps(rep))
    if opt('--report'): json.dump(rep, open(opt('--report'), 'w'), indent=1)
    sys.exit(0 if rep['result'] in ('identical', 'visual') else 1)


if __name__ == '__main__':
    main()
