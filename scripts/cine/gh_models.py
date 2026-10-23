"""GitHub Models (free tier, 0 credits; Actions GITHUB_TOKEN with `permissions: models: read`) for the CI AI gates - no lexkite.com / D1 /
Workers AI quota involved (owner 22/10: Workers AI 10k neurons ran out by 03:00 UTC, D1 exhausted). chat(messages) -> text or None.
#79: urllib got a 200 with a non-JSON body -> now logs status/content-type/body head, sends explicit UA/Accept headers and falls back to
the legacy Azure inference endpoint (model ids without the 'openai/' prefix)."""
import json, os, sys, time, urllib.request, urllib.error
EPS = [('https://models.github.ai/inference/chat/completions', lambda m: m),
       ('https://models.inference.ai.azure.com/chat/completions', lambda m: m.split('/', 1)[-1])]
HDR = {'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'lexkite-cine-ci/1.0',
       'X-GitHub-Api-Version': '2022-11-28'}
def _post(url, body, tok):
    req = urllib.request.Request(url, data=body, method='POST', headers=dict(HDR, Authorization='Bearer ' + tok))
    try:
        with urllib.request.urlopen(req, timeout=120) as r: st, ct, raw = r.status, r.headers.get('content-type', ''), r.read()
    except urllib.error.HTTPError as e: st, ct, raw = e.code, e.headers.get('content-type', ''), e.read()
    txt = raw.decode('utf-8', 'replace')
    try: return st, json.loads(txt), ''
    except Exception: return st, None, f'HTTP {st} ct={ct} body={txt[:200]!r}'
def chat(messages, model='openai/gpt-4.1-mini', max_tokens=600, tries=3):
    tok = os.environ.get('GH_MODELS_TOKEN') or os.environ.get('GITHUB_TOKEN')
    if not tok: print('github models unavailable: no token'); return None
    last = ''
    for url, mid in EPS:
        body = json.dumps(dict(model=mid(model), messages=messages, max_tokens=max_tokens, temperature=0)).encode()
        for k in range(tries):
            try:
                st, j, err = _post(url, body, tok)
                if j and j.get('choices'): return j['choices'][0]['message']['content']
                last = err or f'HTTP {st} {json.dumps(j)[:200]}'
            except Exception as e: last = f'{type(e).__name__}: {str(e)[:160]}'
            print(f'github models {url.split("/")[2]} try {k+1}: {last}', file=sys.stderr)
            if st_retry(last) and k < tries - 1: time.sleep(15 * (k + 1))
            else: break
    print('github models unavailable:', last[:300]); return None
def st_retry(msg): return any(s in msg for s in ('HTTP 429', 'HTTP 5', 'Timeout', 'URLError', 'RemoteDisconnected'))
if __name__ == '__main__':   # probe: python3 scripts/cine/gh_models.py
    out = chat([{'role': 'user', 'content': 'Reply with exactly: {"ok":true}'}], max_tokens=20, tries=1)
    print('probe answer:', out)
    import base64, zlib, struct
    def png(w, h):
        raw = b''.join(b'\x00' + bytes([200, 40, 40]) * w for _ in range(h))
        ck = lambda t, d: struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
        return b'\x89PNG\r\n\x1a\n' + ck(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) + ck(b'IDAT', zlib.compress(raw)) + ck(b'IEND', b'')
    img = 'data:image/png;base64,' + base64.b64encode(png(64, 64)).decode()
    vis = chat([{'role': 'user', 'content': [{'type': 'text', 'text': 'What colour is this image? One word.'}, {'type': 'image_url', 'image_url': {'url': img}}]}], max_tokens=10, tries=1)
    print('probe vision:', vis); sys.exit(0 if out and vis else 1)
