"""ai_gate.py - one client for the CI AI gates (script judge, vision) - owner 23/10.
Order (server side, functions/api/studio.js): Workers AI -> Gemini (Lexkite key pool) -> provider 'none'.
Client rules: hard timeout per call (45 s), <= 2 retries on 5xx / timeout only, quota guard (HTTP 429 or provider 'none' with quota) =
NEUTRAL SKIP (exit 2 in the gates: never rejects a clip), NEWS_AI_MOCK=1 = deterministic mock answer (E2E dry-run, no network).
Every answer records the provider that answered (and what was tried) for the logs / QC report."""
import json, os, time, urllib.request, urllib.error
API = os.environ.get('STUDIO_API', 'https://lexkite.com/api/studio')
MOCK = os.environ.get('NEWS_AI_MOCK') == '1'
def studio(op, payload, timeout=45, tries=3):
    """-> (result_dict | None, status) ; status in ok | skip:<why>"""
    if os.environ.get('NEWS_AI_SKIP') == '1': return None, 'skip:forced (AI-skip test mode)'   # owner 23/10: test every non-AI gate while AI quotas are out
    sec = os.environ.get('STUDIO_CALLBACK_SECRET', '')
    if not sec: return None, 'skip:no STUDIO_CALLBACK_SECRET'
    body = json.dumps(dict(op=op, gemini=1, **payload)).encode(); last = ''
    for k in range(tries):
        try:
            req = urllib.request.Request(API, data=body, method='POST', headers={'Content-Type': 'application/json', 'X-Studio-Secret': sec, 'User-Agent': 'lexkite-ci'})
            with urllib.request.urlopen(req, timeout=timeout) as r: j = json.load(r)
            if j.get('provider') in (None, 'none'): return j, 'skip:' + ('quota' if j.get('quota') else 'no provider answered') + ' ' + ','.join(j.get('tried') or [])[:160]
            return j, 'ok'
        except urllib.error.HTTPError as e:
            last = f'HTTP {e.code}'
            if e.code == 429: return None, 'skip:quota-guard 429'
            if e.code < 500: return None, f'skip:{last}'
        except Exception as e: last = f'{type(e).__name__}: {str(e)[:80]}'
        if k < tries - 1: time.sleep(8 * (k + 1))
    return None, f'skip:{last}'
