#!/usr/bin/env python3
"""qc_gate.py <lesson_id> - single QC gate for a rendered news clip (owner 22/10, docs/VIDEO-QC.md). Run from NEWS_DIR after qa_news.py.
Collects every applicable gate into qc/<id>.json with a 100-point score; ANY fail = not an approved candidate (not stored, not published).
  script   : script_rules (one idea, wrong->right + why, <= B1, <= 12-word sentences, guess/repeat/check, badge, hook type, share, quiz) + AI judge
  scene    : bg zones placement, AI vision gate, one location, crop windows, bg colour dE, edit signature (from qa_news / timeline)
  render   : qa_news ALL PASS (sharpness >= 90 % of source, SSIM, blockiness, black frames, safe zones, captions, luma, edges, loudness ...)
  voice    : ASR of the FINAL mix vs the script (faster-whisper base.en; target-phrase words missed = 0), speaking rate 130-175 wpm (slow repeat excluded)
  bg text  : OCR of the background still (tesseract) - no readable words
Env: CINE_OUT (rendered mp4 dir), CINE_LIB (footage), NEWS_ZONES. Exit 0 = PASS, 1 = FAIL."""
import json, os, re, sys, glob, shutil, subprocess, difflib
LID = sys.argv[1]; RB = f'render5_{LID}_en'; OUT = os.environ.get('CINE_OUT', os.path.join(os.getcwd(), 'out'))
tl = json.load(open(f'{RB}/timeline.json')); Q = tl.get('qa', {}); sp = json.load(open(f'lessons/{LID}.json')); L = {l['id']: l for l in json.load(open('ci/lines.json'))['lines']}
G = {}   # gate -> dict(ok, detail, weight)
def gate(name, ok, detail='', w=10): G[name] = dict(ok=bool(ok), detail=detail if isinstance(detail, (str, int, float, list, dict)) else str(detail), weight=w)
# --- script
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import script_rules as SR
ri = SR.check(sp, L); gate('script_rules', not ri, ri[:5], 10)
J = Q.get('judge') or {}; gate('ai_script_judge', J.get('ok') is True, (J.get('judge') or {}).get('issues') or J.get('error') or 'missing', 10)
# --- scene
P = Q.get('placement') or {}; gate('scene_placement', P.get('ok') is True, {k: P.get(k) for k in ('bg', 'eye_dev', 'cam_ty', 'host_dy')}, 8)
V = Q.get('vision') or {}; gate('ai_vision', V.get('ok') is True, V.get('answers') or V.get('error') or 'missing', 8)
# --- render (qa_news)
qlog = open(f'{OUT}/qa/qa_{RB}.log').read() if os.path.exists(f'{OUT}/qa/qa_{RB}.log') else ''
res = (re.findall(r'== RESULT: (.*)', qlog) or ['missing'])[-1]; gate('qa_news', res.strip() == 'ALL PASS', res.strip()[:300], 30)
# --- voice: ASR of the final mix vs the script
mp4 = f"{OUT}/{tl['lesson']['out']}"; spoken = []
for s in tl['shots']:
    for ln in s['lines']: spoken.append((s['t0'] + ln['at'], ln['id'], L.get(ln['id'], {}).get('text', '')))
spoken.sort(); script = ' '.join(t for _, _, t in spoken); norm = lambda t: re.findall(r"[a-z0-9']+", t.lower().replace('’', "'"))
try:
    from faster_whisper import WhisperModel
    M = WhisperModel('base.en', device='cpu', compute_type='int8'); segs, _ = M.transcribe(mp4, language='en', word_timestamps=False, initial_prompt=None)
    asr = ' '.join(s.text for s in segs); a, b = norm(script), norm(asr); sm = difflib.SequenceMatcher(None, a, b, autojunk=False); ratio = sm.ratio()
    got = set(b); key = [w for w in norm(sp.get('key_line', '')) if len(w) > 2]; miss = [w for w in key if w not in got]
    gate('asr_vs_script', ratio >= 0.85 and not miss, dict(similarity=round(ratio, 3), key_missed=miss), 8)
except Exception as e: gate('asr_vs_script', False, f'asr unavailable: {e}'[:200], 8)
dur = sum(ln['dur'] for s in tl['shots'] for ln in s['lines'] if not (L.get(ln['id'], {}).get('speed') or 1) < 0.85)
nw = sum(len(norm(L.get(ln['id'], {}).get('text', ''))) for s in tl['shots'] for ln in s['lines'] if not (L.get(ln['id'], {}).get('speed') or 1) < 0.85)
wpm = 60 * nw / max(1e-3, dur); gate('speaking_rate', 130 <= wpm <= 175, round(wpm, 1), 4)
# --- background OCR (no readable words in the still)
LB = f"{os.environ.get('CINE_LIB', '')}/anchor/bg"; bgid = str(tl['lesson'].get('bg')).split('@')[0]
bgps = [f'{LB}/w/{bgid}_L.webp', f'{LB}/w/{bgid}_R.webp'] if os.path.exists(f'{LB}/w/{bgid}_L.webp') else [f'{LB}/{bgid}.png']   # wide scene: both host crops
if shutil.which('tesseract') and all(os.path.exists(p_) for p_ in bgps):
    words = []
    for bgp in bgps:
        if bgp.endswith('.webp'): import cv2 as _c; _c.imwrite('/tmp/_ocr.png', _c.imread(bgp)); bgp = '/tmp/_ocr.png'
        o = subprocess.run(['tesseract', bgp, '-', '--psm', '11', 'tsv'], capture_output=True, text=True).stdout.splitlines()[1:]
        words += [r.split('\t')[11] for r in o if len(r.split('\t')) > 11 and r.split('\t')[10].replace('.', '', 1).lstrip('-').isdigit() and float(r.split('\t')[10]) >= 80 and re.fullmatch(r'[A-Za-z]{3,}', r.split('\t')[11] or '')]
    gate('bg_no_text', not words, words[:8], 4)
else: gate('bg_no_text', False, 'tesseract or bg still missing', 4)
# --- score
score = 100 - sum(g['weight'] for g in G.values() if not g['ok']); ok = all(g['ok'] for g in G.values())
os.makedirs(f'{OUT}/qc', exist_ok=True)
rep = dict(id=LID, ok=ok, score=score, gates=G, signature=Q.get('signature'), bg=tl['lesson'].get('bg'), total=tl.get('total'))
json.dump(rep, open(f'{OUT}/qc/{LID}.json', 'w'), indent=1, ensure_ascii=False)
print(f'QC {LID}: {"PASS" if ok else "FAIL"} score {score}/100 ' + ' '.join(f"{k}={'ok' if g['ok'] else 'FAIL'}" for k, g in G.items()))
sys.exit(0 if ok else 1)
