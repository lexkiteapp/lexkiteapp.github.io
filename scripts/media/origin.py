"""origin.py - CI reads media straight from the GitHub repos behind media.lexkite.com (infra/media-repos.json), the Worker URL last.

Why (2/11): renders on CI fetched every picture through the lexkite-media Worker; when the account hit the 100k Workers/day cap the
Worker answered 429 and every teach-video render went red (and the CI traffic itself ate that shared cap). Same files, same paths,
no Worker request when GitHub has the file.

  candidates('https://media.lexkite.com/vimg/<h>.webp') -> [m4 Pages, m4 raw, m1 Pages, m1 raw, Worker URL]
  candidates('https://media.lexkite.com/m4/vimg/<h>.webp') -> [m4 Pages, m4 raw, Worker URL]
  fetch(url, dest) -> first candidate that answers 200 with a non-empty body; raises when none does.
"""
import json, os, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
CDN = 'https://media.lexkite.com/'


def _repos():
    return [r for r in json.load(open(os.path.join(ROOT, 'infra/media-repos.json')))['repos'] if r.get('cdn', '').startswith(CDN) and r.get('state') != 'planned']


def _bases(r):
    return [r['pages'].rstrip('/'), f"https://raw.githubusercontent.com/{r['repo']}/main"]


def candidates(url):
    if not url.startswith(CDN):
        return [url]
    path, repos = url[len(CDN):], _repos()
    own = [r for r in repos if r['cdn'] != CDN and url.startswith(r['cdn'])]   # media.lexkite.com/m4/... = that repo only
    if own:
        path, repos = url[len(own[0]['cdn']):], own
    else:   # shared prefix: newest open repo first (the Worker's order: m4 -> m1), full repos after
        repos = sorted(repos, key=lambda r: (r.get('state') != 'open', -int(r['id'][1:])))
    return [f'{b}/{path}' for r in repos for b in _bases(r)] + ([] if os.environ.get('MEDIA_ORIGIN_ONLY') else [url])   # MEDIA_ORIGIN_ONLY=1: never the Worker (batch CI)


def fetch(url, dest, run=subprocess.run):
    tried = []
    for u in candidates(url):
        r = run(['curl', '-fsSL', '--retry', '2', '--retry-delay', '2', '-o', dest, u], capture_output=True)
        if r.returncode == 0 and os.path.exists(dest) and os.path.getsize(dest) > 0:
            return u
        tried.append(f'{u} ({r.returncode})')
    raise RuntimeError('media fetch failed: ' + '; '.join(tried))
