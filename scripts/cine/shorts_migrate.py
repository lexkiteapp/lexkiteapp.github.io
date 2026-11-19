#!/usr/bin/env python3
"""One-time migration of lexkite-shorts to recipe-first storage (docs/VIDEO-STORAGE.md) – run by .github/workflows/shorts-migrate.yml.

  shorts_migrate.py plan  <full-clone>     sizes: tip media, whole history, media blobs in history (= what a history purge would save)
  shorts_migrate.py apply <full-clone>     after drive-shorts.mjs + recipe.py legacy: `git rm --cached` every mp4/jpg whose sha256 matches
                                           item.drive.{video,cover} in shorts/index.json (= verified on the Drive pool), add .gitignore.
Never rewrites history: a purge is only REPORTED (git filter-repo command printed); the owner decides.
"""
import hashlib, json, os, subprocess, sys

MEDIA = ('.mp4', '.jpg', '.webp', '.wav')


def git(repo, *a, inp=None):
    return subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, input=inp, check=True).stdout


def sha(p):
    h = hashlib.sha256()
    with open(p, 'rb') as f:
        for b in iter(lambda: f.read(1 << 20), b''): h.update(b)
    return h.hexdigest()


def plan(repo):
    tip = [l.split('\t') for l in git(repo, 'ls-tree', '-r', '-l', 'HEAD').splitlines()]
    tip_media = sum(int(m.split()[3]) for m, p in tip if p.endswith(MEDIA))
    tip_all = sum(int(m.split()[3]) for m, p in tip if m.split()[3] != '-')
    objs = git(repo, 'rev-list', '--objects', '--all')
    rows = git(repo, 'cat-file', '--batch-check=%(objecttype) %(objectname) %(objectsize:disk) %(rest)', inp=objs).splitlines()
    hist, media, seen = 0, 0, set()
    for r in rows:
        t, oid, sz, *rest = r.split(' ', 3)
        if oid in seen: continue
        seen.add(oid); hist += int(sz)
        if t == 'blob' and rest and rest[0].endswith(MEDIA): media += int(sz)
    pack = git(repo, 'count-objects', '-v')
    out = dict(tip_bytes=tip_all, tip_media_bytes=tip_media, tip_after_bytes=tip_all - tip_media, history_bytes=hist, history_media_bytes=media,
               history_after_purge_bytes=hist - media, count_objects=dict(l.split(': ') for l in pack.splitlines()),
               purge_cmd="git clone --mirror git@github.com:lexkiteapp/lexkite-shorts.git && cd lexkite-shorts.git && "
                         "git filter-repo --invert-paths --path-glob '*.mp4' --path-glob '*.jpg' && git push --force --mirror")
    return out


def apply(repo):
    idx = json.load(open(f'{repo}/shorts/index.json')); removed, kept = [], []
    for it in idx.get('items', []):
        for k in ('video', 'cover'):
            rel = it.get(k)
            if not rel or not os.path.exists(f'{repo}/{rel}'): continue
            d = (it.get('drive') or {}).get(k) or {}
            if d.get('fileId') and d.get('sha256') == sha(f'{repo}/{rel}'): removed.append(rel)
            else: kept.append(rel)
    tracked = set(git(repo, 'ls-files').splitlines())
    rm = [p for p in removed if p in tracked]
    for i in range(0, len(rm), 200): git(repo, 'rm', '-q', '--cached', '--', *rm[i:i + 200])
    gi = f'{repo}/.gitignore'
    if not os.path.exists(gi) or '*.mp4' not in open(gi).read():
        open(gi, 'a').write('# recipe-first storage: media lives on the Drive pool (docs/VIDEO-STORAGE.md)\n*.mp4\n*.jpg\n*.webp\n*.wav\n')
    for p in kept: git(repo, 'add', '-f', '--', p)   # not verified on Drive → stays in git until the next run
    print(json.dumps(dict(removed_from_tip=len(rm), kept_unverified=kept)))
    return rm, kept


if __name__ == '__main__':
    cmd, repo = sys.argv[1], sys.argv[2]
    if cmd == 'plan':
        r = plan(repo); print(json.dumps(r, indent=1))
        mb = lambda b: f'{b / 1e6:,.0f} MB'
        s = (f"### lexkite-shorts storage\n| | now | after |\n|---|---|---|\n| tip (checkout) | {mb(r['tip_bytes'])} | {mb(r['tip_after_bytes'])} |\n"
             f"| history (clone) | {mb(r['history_bytes'])} | {mb(r['history_after_purge_bytes'])} only if purged |\n\nPurge (owner decision, rewrites history): `{r['purge_cmd']}`\n")
        if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(s)
        json.dump(r, open(os.environ.get('MIGRATE_REPORT', '/tmp/migrate-plan.json'), 'w'), indent=1)
    elif cmd == 'apply': apply(repo)
    else: print(__doc__); sys.exit(2)
