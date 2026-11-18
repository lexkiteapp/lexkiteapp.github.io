#!/usr/bin/env python3
"""Ad clip -> lexkite-shorts (same autopub_gate + store.py as every Teach2D clip; no new store logic). Swaps the banked 9:16 for the ad export and puts the ad UTM on every link.
  ad_store.py <ep> <art> <bank_dir> <ad_9x16.mp4> <delta.json> <shorts_checkout> <run> [sha]"""
import hashlib, json, os, shutil, sys, tempfile
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, HERE)
import store   # noqa: E402
UTM = 'https://lexkite.com/?utm_source=facebook&utm_medium=paid&utm_campaign=ad1'


def main(ep_id, art, bank, ad, delta, repo, run, sha=''):
    ep = json.load(open(f'{store.EPS}/{ep_id}.json')); txt = json.dumps(ep, ensure_ascii=False)
    for old in {ep['cta']['link'], (ep.get('publish') or {}).get('link')} - {None}: txt = txt.replace(old, UTM)
    tmp = tempfile.mkdtemp(); open(f'{tmp}/{ep_id}.json', 'w').write(txt); store.EPS = tmp
    shutil.copy2(ad, f'{bank}/{ep_id}-short.mp4')
    D = json.load(open(delta)); r = D[ep_id]; r['sha']['short'] = hashlib.sha256(open(ad, 'rb').read()).hexdigest()[:16]; json.dump(D, open(delta, 'w'))
    new = store.run_store(art, bank, delta, repo, int(run), sha)
    if not new: sys.exit('ad_store: not stored (blocked or duplicate): ' + json.dumps(json.load(open(delta))[ep_id].get('publish_block')))


if __name__ == '__main__': main(*sys.argv[1:])
