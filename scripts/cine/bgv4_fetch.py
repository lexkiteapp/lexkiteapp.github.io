#!/usr/bin/env python3
"""bgv4_fetch.py <dest_dir> <scene-id>... - download the bg-v4 artifact shard(s) of these scenes (newest 'bgv4-s<k>' artifact of the repo)
into <dest_dir> (= footage/anchor/bg/w4). Missing / API error -> warning only: news.py falls back to the v3 crops. Hard timeouts."""
import io, json, os, subprocess, sys, urllib.request, zipfile
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
dest, ids = sys.argv[1], [x.split('@')[0] for x in sys.argv[2:] if x]
import hashlib; sh = lambda i: int(hashlib.md5(i.encode()).hexdigest(), 16) % 20
R = os.environ.get('GITHUB_REPOSITORY', 'lexkiteapp/lexkiteapp.github.io'); T = os.environ.get('GITHUB_TOKEN', '')
def api(u, raw=False):
    req = urllib.request.Request(u if u.startswith('http') else f'https://api.github.com/repos/{R}{u}', headers={'Authorization': f'Bearer {T}', 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(req, timeout=120) as r: return r.read() if raw else json.load(r)
os.makedirs(dest, exist_ok=True); got = 0
for k in sorted({sh(i) for i in ids}):
    try:
        a = [x for x in api(f'/actions/artifacts?name=bgv4-s{k}&per_page=10')['artifacts'] if not x['expired']]
        if not a: print(f'::warning::no bgv4-s{k} artifact yet (run bg-v4.yml) - v3 crops'); continue
        z = zipfile.ZipFile(io.BytesIO(api(a[0]['archive_download_url'], raw=True)))
        for n in z.namelist():
            if any(n.startswith(i) or n.startswith(f'zones/{i}') for i in ids): z.extract(n, dest); got += 1
    except Exception as e: print(f'::warning::bgv4 shard {k}: {str(e)[:120]} - v3 crops')
print(f'bgv4: {got} files for {len(ids)} scene(s) -> {dest}')
