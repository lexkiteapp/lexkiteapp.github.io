"""GitHub Models (free tier, 0 credits; Actions GITHUB_TOKEN with `permissions: models: read`) for the CI AI gates - no lexkite.com / D1 /
Workers AI quota involved (owner 22/10: Workers AI 10k neurons ran out by 03:00 UTC, D1 exhausted). chat(messages) -> text or None."""
import json, os, time, urllib.request
URL = 'https://models.github.ai/inference/chat/completions'
def chat(messages, model='openai/gpt-4.1-mini', max_tokens=600, tries=3):
    tok = os.environ.get('GITHUB_TOKEN') or os.environ.get('GH_MODELS_TOKEN')
    if not tok: return None
    body = json.dumps(dict(model=model, messages=messages, max_tokens=max_tokens, temperature=0)).encode()
    for k in range(tries):
        try:
            r = json.load(urllib.request.urlopen(urllib.request.Request(URL, data=body, method='POST', headers={'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json'}), timeout=120))
            return r['choices'][0]['message']['content']
        except Exception as e:
            if k == tries - 1: print('github models unavailable:', str(e)[:160]); return None
            time.sleep(15 * (k + 1))
