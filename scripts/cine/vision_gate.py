#!/usr/bin/env python3
"""vision_gate.py <pre_dir> - AI vision gate for composited news frames (owner 22/10, VIDEO-SCALE-PLAN §11). 0 credits.
Sends the 3 preflight frames (news.py NEWS_PREFLIGHT=1 -> <pre_dir>/*.jpg) to the Lexkite studio endpoint (op visionCheck: Gemini vision from the
free key pool, Workers AI fallback) with header X-Studio-Secret (= CI secret STUDIO_CALLBACK_SECRET). Writes <pre_dir>/vision.json.
Exit 0 = every frame natural, 1 = a problem was reported (caller retries another background / position), 2 = gate unavailable (counts as FAIL in qa)."""
import base64, glob, json, os, sys, urllib.request

Q = ("You check frames of a vertical educational video. Each frame shows one or two presenters (cartoon style) composited over a background scene. "
     "For EACH image answer strictly: does the person stand naturally in the scene? Mark a problem if the person appears to stand ON or IN an object "
     "(table, desk, counter, chair, sofa, bed, water, a vehicle), floats, has a clearly wrong scale for the room, or a clearly wrong perspective. "
     "Ignore text overlays, captions and cards. Reply JSON only: {\"frames\": [{\"natural\": true|false, \"problem\": \"...\"}]} in image order.")

def main():
    d = sys.argv[1]; ims = sorted(glob.glob(f'{d}/*.jpg'))[:3]; out = dict(frames=[os.path.basename(x) for x in ims], ok=False, provider=None, answers=None)
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import gh_models   # GitHub Models first (no D1 / Workers AI quota)
    gt = gh_models.chat([dict(role='user', content=[dict(type='text', text=Q)] + [dict(type='image_url', image_url=dict(url='data:image/jpeg;base64,' + base64.b64encode(open(x, 'rb').read()).decode())) for x in ims])], max_tokens=400)
    if gt:
        try:
            fr = json.loads(gt[gt.index('{'):gt.rindex('}') + 1])['frames']; out['provider'] = 'github-models gpt-4.1-mini'
            out['answers'] = [dict(natural=bool(f.get('natural')), problem=str(f.get('problem') or '')[:160]) for f in fr][:len(ims)]
            out['ok'] = len(out['answers']) == len(ims) and all(a['natural'] for a in out['answers'])
            json.dump(out, open(f'{d}/vision.json', 'w')); print('vision gate', out['provider'], 'OK' if out['ok'] else 'FAIL', out['answers']); sys.exit(0 if out['ok'] else 1)
        except (ValueError, KeyError): pass
    api = os.environ.get('STUDIO_API', 'https://lexkite.com/api/studio'); sec = os.environ.get('STUDIO_CALLBACK_SECRET', '')
    if not ims or not sec:
        out['error'] = 'no frames' if not ims else 'no STUDIO_CALLBACK_SECRET'; json.dump(out, open(f'{d}/vision.json', 'w')); print('vision gate unavailable:', out['error']); sys.exit(2)
    body = json.dumps(dict(op='visionCheck', question=Q, images=[base64.b64encode(open(x, 'rb').read()).decode() for x in ims])).encode()
    try:
        req = urllib.request.Request(api, data=body, method='POST', headers={'Content-Type': 'application/json', 'X-Studio-Secret': sec, 'User-Agent': 'lexkite-ci'})
        r = json.load(urllib.request.urlopen(req, timeout=90))
    except Exception as e:
        out['error'] = str(e)[:200]; json.dump(out, open(f'{d}/vision.json', 'w')); print('vision gate unavailable:', out['error']); sys.exit(2)
    out['provider'] = r.get('provider'); txt = (r.get('text') or '').strip().strip('`').replace('json\n', '', 1)
    try: fr = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])['frames']
    except Exception: out['error'] = 'unparsed: ' + txt[:200]; json.dump(out, open(f'{d}/vision.json', 'w')); print('vision gate: unparsed answer'); sys.exit(2)
    out['answers'] = [dict(natural=bool(f.get('natural')), problem=str(f.get('problem') or '')[:160]) for f in fr][:len(ims)]
    out['ok'] = len(out['answers']) == len(ims) and all(a['natural'] for a in out['answers'])
    if out['answers'] and all(a['problem'] == 'no answer' for a in out['answers']):   # #81: quota-exhausted provider = unavailable (exit 2), not a bad background (was rejecting every bg)
        out['ok'] = None; out['error'] = 'provider gave no answer (quota)'; json.dump(out, open(f'{d}/vision.json', 'w')); print('vision gate unavailable:', out['error']); sys.exit(2)
    json.dump(out, open(f'{d}/vision.json', 'w')); print('vision gate', out['provider'], 'OK' if out['ok'] else 'FAIL', out['answers']); sys.exit(0 if out['ok'] else 1)

if __name__ == '__main__': main()
