#!/usr/bin/env python3
"""Dọn video rác: scan (manifest) -> quarantine (cách ly, hoàn tác được) -> purge (xoá có chứng minh).

  python3 scripts/video/junk.py scan --root DIR --out manifest.json [--repo .] [--no-probe] [--max-hash-gb 6]
  python3 scripts/video/junk.py quarantine --manifest m.json --to QDIR [--reason broken,dup-sha] [--apply]
  python3 scripts/video/junk.py restore --quarantine QDIR [--date YYYY-MM-DD] [--apply]
  python3 scripts/video/junk.py purge --quarantine QDIR --min-days 7 [--repo .] [--backup-shas f.json ...] [--apply]

Mặc định chỉ BÁO (dry-run); quarantine/restore/purge cần --apply. Một tiến trình, đọc theo khúc 1 MB, gom theo dung lượng trước
(chỉ băm đủ file trùng dung lượng; phần còn lại băm 1 MB đầu + 1 MB cuối) – nhẹ cho Mac không quạt (METHODS §4).
Lý do rác: broken · failed-qc · dup-sha · unreferenced. BẢO VỆ (không bao giờ là rác): footage ngân hàng Mei/Kai/Daniel, thư mục bank/nguồn,
mục trong archive-manifest.json (sao lưu) và sổ đăng ký (characters.json, library*.json, bank*.json). Luật no-cuts: không xoá nội dung.
Docs: docs/VIDEO-STORAGE.md § "Dọn video rác". Test: scripts/test/video-junk.py.
"""
from __future__ import annotations

import argparse
import collections
import datetime
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

VIDEO_EXT = {'.mp4', '.mkv', '.mov', '.webm', '.avi', '.m4v', '.mxf'}
IMG_EXT = {'.png', '.jpg', '.jpeg', '.webp', '.exr', '.tif', '.tiff'}
TEXT_EXT = {'.json', '.md', '.mjs', '.js', '.cjs', '.ts', '.py', '.html', '.txt', '.yml', '.yaml', '.sh', '.css', '.csv', '.toml'}
SKIP_DIRS = {'.git', '__pycache__', 'node_modules', '.DS_Store'}
BANK_NAMES = {'mei', 'kai', 'daniel'}
BANK_DIRS = {'green', 'bg', 'chars', 'clips', 'bank', 'banks', 'kfull_pro', 'kmask_pro', 'source', 'sources', 'src', 'teachers3d', 'characters'}
# Cache render có khoá băm trong tên (scripts/cine/lesson5.py: render5_shots/<khoá>.mp4): tên file không bao giờ xuất hiện trong repo
# nên "no-ref-in-repo" vô nghĩa; xoá = buộc render lại (nặng). Bảo vệ cả thư mục.
CACHE_DIR_RE = re.compile(r'^(?:render\d*_shots|.*_cache|cache)$')
REJECT_DIRS = {'rejected', 'reject', 'rejects', 'red', '_rejected', 'failed'}
REF_DIRS = ('content', 'docs', 'scripts', 'web', 'infra')
REGISTRY = ('web/teach/characters.json', 'scripts/video/library-seed.json', 'content/video/cine/news/bank.json')
MANIFEST_REL = 'brand/library/cine/archive-manifest.json'
CHUNK = 1 << 20
MIN_PURGE_DAYS = 7
TOKEN = re.compile(r'[A-Za-z0-9_][A-Za-z0-9_.\-]{2,}')
SEQ = re.compile(r'\d{3,}$')


# ---------- tiện ích ----------
def rel_posix(path, root):
    return os.path.relpath(path, root).replace(os.sep, '/')


def name_tokens(rel):
    return set(t for t in re.split(r'[^a-z0-9]+', rel.lower()) if t)


def protected_path(rel):
    """Bảo vệ theo đường dẫn (thuần): footage Mei/Kai/Daniel, thư mục bank/nguồn, hoặc cache render có khoá băm. -> lý do hoặc None."""
    parts = [p.lower() for p in rel.split('/')]
    if name_tokens(rel) & BANK_NAMES:
        return 'bank-character'
    for p in parts[:-1]:
        if p in BANK_DIRS:
            return 'bank-folder:' + p
        if CACHE_DIR_RE.match(p):
            return 'render-cache:' + p
    return None


def sha256_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        while True:
            b = f.read(CHUNK)
            if not b:
                break
            h.update(b)
    return h.hexdigest()


def quick_hash(path, size):
    h = hashlib.sha256(str(size).encode())
    with open(path, 'rb') as f:
        h.update(f.read(CHUNK))
        if size > 2 * CHUNK:
            f.seek(size - CHUNK)
            h.update(f.read(CHUNK))
        elif size > CHUNK:
            h.update(f.read(CHUNK))
    return h.hexdigest()


def now_iso():
    return datetime.datetime.utcnow().replace(microsecond=0).isoformat() + 'Z'


def parse_iso(s):
    return datetime.datetime.strptime(s, '%Y-%m-%dT%H:%M:%SZ')


def probe_broken(path, size, have_ffprobe):
    """-> chuỗi lý do hỏng hoặc None."""
    if size == 0:
        return 'zero-bytes'
    if not have_ffprobe:
        return None
    try:
        r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=nb_frames,codec_name,duration',
                            '-of', 'json', path], capture_output=True, timeout=30)
    except (subprocess.TimeoutExpired, OSError):
        return 'ffprobe-timeout'
    if r.returncode != 0:
        return 'ffprobe-fail'
    try:
        st = (json.loads(r.stdout.decode('utf8', 'replace') or '{}').get('streams') or [])
    except ValueError:
        return 'ffprobe-badjson'
    if not st:
        return 'no-video-stream'
    nf = st[0].get('nb_frames')
    if nf not in (None, 'N/A') and str(nf).isdigit() and int(nf) == 0:
        return 'zero-frames'
    return None


# ---------- chỉ mục tham chiếu (grep) ----------
def iter_text_files(repo, dirs=REF_DIRS, max_bytes=3 << 20):
    for d in dirs:
        base = os.path.join(repo, d)
        for dp, dn, fn in os.walk(base):
            dn[:] = [x for x in dn if x not in SKIP_DIRS]
            for f in fn:
                if os.path.splitext(f)[1].lower() in TEXT_EXT:
                    p = os.path.join(dp, f)
                    try:
                        if os.path.getsize(p) <= max_bytes:
                            yield p
                    except OSError:
                        pass


def ref_keys(rel, kind):
    """Khoá tìm trong repo (chữ thường): tên file, tên không đuôi (>= 5 ký tự); khung ảnh -> tên thư mục chứa."""
    parts = rel.lower().split('/')
    base = parts[-1]
    stem = os.path.splitext(base)[0]
    keys = set()
    if kind == 'frame':
        if len(parts) >= 2 and len(parts[-2]) >= 3:
            keys.add(parts[-2])
    else:
        keys.add(base)
        if len(stem) >= 5:
            keys.add(stem)
    return keys


def count_refs(repo, wanted, files=None):
    """Đếm số lần xuất hiện của các khoá trong văn bản repo -> Counter (chỉ khoá có trong wanted)."""
    c = collections.Counter()
    for p in (files if files is not None else iter_text_files(repo)):
        try:
            with open(p, 'r', encoding='utf8', errors='ignore') as f:
                txt = f.read().lower()
        except OSError:
            continue
        for t in TOKEN.findall(txt):
            if t in wanted:
                c[t] += 1
            else:
                t2 = t.rstrip('.-')
                if t2 in wanted:
                    c[t2] += 1
    return c


def registry_files(repo):
    out = [os.path.join(repo, r) for r in REGISTRY if os.path.isfile(os.path.join(repo, r))]
    for dp, dn, fn in os.walk(os.path.join(repo, 'brand')):
        dn[:] = [x for x in dn if x not in SKIP_DIRS]
        for f in fn:
            if f in ('manifest.json', 'library.json') or (f.startswith('bank') and f.endswith('.json')):
                out.append(os.path.join(dp, f))
    return out


def load_backup_manifest(repo):
    """archive-manifest.json -> (paths, shas, name_size). Rỗng nếu không có."""
    paths, shas, ns = set(), set(), set()
    p = os.path.join(repo, MANIFEST_REL)
    if os.path.isfile(p):
        try:
            files = json.load(open(p)).get('files', {})
        except ValueError:
            files = {}
        for k, v in files.items():
            paths.add(k.lower())
            if v.get('sha256') and v.get('copies'):
                shas.add(v['sha256'])
            ns.add((os.path.basename(k).lower(), v.get('size')))
    return paths, shas, ns


def backup_shas_from(files):
    out = set()
    for f in files or []:
        try:
            out.update(re.findall(r'\b[0-9a-f]{64}\b', open(f, errors='ignore').read().lower()))
        except OSError:
            pass
    return out


def qc_failed(path, stem, listing_cache):
    """Anh em qc*.json báo ok=false / score<90 -> lý do hoặc None."""
    d = os.path.dirname(path)
    if d not in listing_cache:
        try:
            listing_cache[d] = [f for f in os.listdir(d) if 'qc' in f.lower() and f.lower().endswith('.json')]
        except OSError:
            listing_cache[d] = []
    for f in listing_cache[d]:
        try:
            j = json.load(open(os.path.join(d, f)))
        except (ValueError, OSError):
            continue
        if not isinstance(j, dict):
            continue
        who = next((str(j[k]) for k in ('file', 'clip', 'name', 'id') if isinstance(j.get(k), str)), None)
        if who and stem.lower() not in os.path.splitext(os.path.basename(who))[0].lower():
            continue
        score = j.get('score')
        if j.get('ok') is False or j.get('pass') is False or j.get('passed') is False or (isinstance(score, (int, float)) and score < 90):
            return 'qc:%s' % f
    return None


# ---------- scan ----------
def collect(root):
    files = []
    for dp, dn, fn in os.walk(root, followlinks=False):
        dn[:] = [x for x in dn if x not in SKIP_DIRS]
        imgs = []
        for f in fn:
            p = os.path.join(dp, f)
            if os.path.islink(p):
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in VIDEO_EXT:
                files.append((p, 'video'))
            elif ext in IMG_EXT and SEQ.search(os.path.splitext(f)[0]):
                imgs.append(p)
        if len(imgs) >= 8:
            files.extend((p, 'frame') for p in imgs)
    return files


def scan(root, repo, probe=True, max_hash_gb=6.0, log=print):
    root = os.path.abspath(root)
    repo = os.path.abspath(repo)
    have_ff = probe and shutil.which('ffprobe') is not None
    items = []
    for p, kind in collect(root):
        try:
            stt = os.stat(p)
        except OSError:
            continue
        items.append({'path': rel_posix(p, root), 'abs': p, 'bytes': stt.st_size, 'mtime': int(stt.st_mtime), 'kind': kind,
                      'sha256': None, 'qhash': None, 'status': 'keep', 'reason': None, 'why': None})
    log('scan: %d file' % len(items))
    # 1) băm: theo dung lượng trước
    by_size = collections.defaultdict(list)
    for it in items:
        if it['bytes'] > 0:
            by_size[it['bytes']].append(it)
    budget = max_hash_gb * 1e9
    groups = sorted((g for g in by_size.values() if len(g) > 1), key=lambda g: g[0]['bytes'] * len(g))
    for g in groups:
        cost = g[0]['bytes'] * len(g)
        if cost > budget:
            continue
        budget -= cost
        for it in g:
            try:
                it['sha256'] = sha256_file(it['abs'])
            except OSError:
                pass
    for it in items:
        if not it['sha256'] and it['bytes'] > 0:
            try:
                it['qhash'] = quick_hash(it['abs'], it['bytes'])
            except OSError:
                pass
    # 2) bảo vệ + sổ sao lưu
    bpaths, bshas, bns = load_backup_manifest(repo)
    reg_files = registry_files(repo)
    wanted = set()
    for it in items:
        wanted |= ref_keys(it['path'], it['kind'])
    reg = count_refs(repo, wanted, reg_files)
    refs = count_refs(repo, wanted)
    qcache = {}
    for it in items:
        rel = it['path']
        keys = ref_keys(rel, it['kind'])
        it['refs'] = sum(refs.get(k, 0) for k in keys)
        alt = rel[5:] if rel.startswith('cine/') else rel
        why = protected_path(rel)
        if not why and (rel.lower() in bpaths or alt.lower() in bpaths):
            why = 'backup-manifest'
        elif not why and it['sha256'] and it['sha256'] in bshas:
            why = 'backup-manifest-sha'
        elif not why and (os.path.basename(rel).lower(), it['bytes']) in bns:
            why = 'backup-manifest-name'
        elif not why and any(reg.get(k, 0) for k in keys):
            why = 'registry'
        if why:
            it['status'], it['why'] = 'protected', why
    # 3) hỏng / qc / trùng / không tham chiếu
    for it in items:
        if it['status'] == 'protected':
            continue
        if it['kind'] == 'video' or it['bytes'] == 0:
            b = probe_broken(it['abs'], it['bytes'], have_ff and it['kind'] == 'video')
            if b:
                it.update(status='junk', reason='broken', why=b)
                continue
        parts = [x.lower() for x in it['path'].split('/')[:-1]]
        if any(x in REJECT_DIRS for x in parts):
            it.update(status='junk', reason='failed-qc', why='rejected-folder')
            continue
        q = qc_failed(it['abs'], os.path.splitext(os.path.basename(it['path']))[0], qcache)
        if q:
            it.update(status='junk', reason='failed-qc', why=q)
    by_sha = collections.defaultdict(list)
    for it in items:
        if it['sha256'] and it['status'] != 'junk':
            by_sha[it['sha256']].append(it)
    for g in by_sha.values():
        if len(g) < 2:
            continue
        prot = [x for x in g if x['status'] == 'protected']
        keeper = prot[0] if prot else sorted(g, key=lambda x: (-x['refs'], x['mtime'], len(x['path']), x['path']))[0]
        for x in g:
            if x is not keeper and x['status'] != 'protected':
                x.update(status='junk', reason='dup-sha', why='twin', keep=keeper['path'])
    for it in items:
        if it['status'] == 'keep' and it['refs'] == 0:
            it.update(status='junk', reason='unreferenced', why='no-ref-in-repo')
    return {'version': 1, 'root': root, 'repo': repo, 'created': now_iso(), 'ffprobe': have_ff,
            'summary': summarize(items), 'entries': [{k: v for k, v in it.items() if k != 'abs'} for it in items]}


def summarize(items):
    s = {}
    for it in items:
        k = it['reason'] if it['status'] == 'junk' else it['status']
        e = s.setdefault(k, {'count': 0, 'bytes': 0})
        e['count'] += 1
        e['bytes'] += it['bytes']
    for e in s.values():
        e['gb'] = round(e['bytes'] / 1e9, 3)
    return s


# ---------- quarantine / restore ----------
def _dev(path):
    while not os.path.exists(path):
        path = os.path.dirname(path) or '.'
    return os.stat(path).st_dev


def load_restore(qdir, date):
    p = os.path.join(qdir, date, 'restore.json')
    return p, (json.load(open(p)) if os.path.isfile(p) else None)


def quarantine(manifest, to, apply=False, reasons=None, log=print):
    root = manifest['root']
    date = datetime.date.today().isoformat()
    dest_root = os.path.join(os.path.abspath(to), date)
    if apply:
        os.makedirs(dest_root, exist_ok=True)
        if _dev(root) != _dev(dest_root):
            raise SystemExit('✗ quarantine phải cùng ổ đĩa với --root (rename, không chép): %s ≠ %s' % (root, dest_root))
    by_rel = {e['path']: e for e in manifest['entries']}
    p, rj = load_restore(os.path.abspath(to), date)
    rj = rj or {'root': root, 'date': date, 'entries': []}
    moved, skipped, total = 0, [], 0
    for e in manifest['entries']:
        if e.get('status') != 'junk' or (reasons and e['reason'] not in reasons):
            continue
        rel = e['path']
        src = os.path.join(root, rel)
        why = protected_path(rel)
        if why or e.get('status') == 'protected':
            skipped.append((rel, 'protected:' + str(why)))
            continue
        if not os.path.isfile(src) or os.path.getsize(src) != e['bytes']:
            skipped.append((rel, 'changed-or-missing'))
            continue
        if e['reason'] == 'dup-sha':
            k = by_rel.get(e.get('keep') or '')
            kp = os.path.join(root, e.get('keep') or '\0')
            if not k or not os.path.isfile(kp) or os.path.getsize(kp) != e['bytes'] or (e.get('sha256') and k.get('sha256') != e['sha256']):
                skipped.append((rel, 'keeper-missing'))
                continue
        dst = os.path.join(dest_root, rel)
        if os.path.exists(dst):
            skipped.append((rel, 'dest-exists'))
            continue
        total += e['bytes']
        moved += 1
        if apply:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            os.rename(src, dst)
            rj['entries'].append({'rel': rel, 'bytes': e['bytes'], 'sha256': e.get('sha256'), 'qhash': e.get('qhash'), 'reason': e['reason'],
                                  'keep': e.get('keep'), 'moved_at': now_iso(), 'status': 'quarantined'})
    if apply and moved:
        json.dump(rj, open(os.path.join(dest_root, 'restore.json'), 'w'), indent=1)
    log('%s: %d file (%.2f GB) -> %s; bỏ qua %d' % ('ĐÃ cách ly' if apply else 'dry-run', moved, total / 1e9, dest_root, len(skipped)))
    return {'moved': moved, 'bytes': total, 'skipped': skipped}


def restore(qdir, date=None, apply=False, log=print):
    qdir = os.path.abspath(qdir)
    dates = [date] if date else sorted(d for d in os.listdir(qdir) if os.path.isfile(os.path.join(qdir, d, 'restore.json')))
    n, skipped = 0, []
    for d in dates:
        p, rj = load_restore(qdir, d)
        if not rj:
            continue
        for e in rj['entries']:
            if e['status'] != 'quarantined':
                continue
            src = os.path.join(qdir, d, e['rel'])
            dst = os.path.join(rj['root'], e['rel'])
            if not os.path.isfile(src):
                skipped.append((e['rel'], 'missing-in-quarantine'))
                continue
            if os.path.exists(dst):
                skipped.append((e['rel'], 'original-exists'))
                continue
            n += 1
            if apply:
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                os.rename(src, dst)
                e['status'] = 'restored'
        if apply:
            json.dump(rj, open(p, 'w'), indent=1)
    log('%s: %d file, bỏ qua %d' % ('ĐÃ khôi phục' if apply else 'dry-run khôi phục', n, len(skipped)))
    return {'restored': n, 'skipped': skipped}


# ---------- purge ----------
def purge(qdir, min_days=MIN_PURGE_DAYS, repo='.', backup_files=None, apply=False, now=None, log=print):
    if min_days < MIN_PURGE_DAYS:
        raise SystemExit('✗ --min-days tối thiểu %d (luật cách ly)' % MIN_PURGE_DAYS)
    qdir = os.path.abspath(qdir)
    now = now or datetime.datetime.utcnow()
    _, bshas, _ = load_backup_manifest(os.path.abspath(repo))
    bshas = bshas | backup_shas_from(backup_files)
    have_ff = shutil.which('ffprobe') is not None
    todo = []
    for d in sorted(x for x in os.listdir(qdir) if os.path.isfile(os.path.join(qdir, x, 'restore.json'))):
        p, rj = load_restore(qdir, d)
        todo.append((d, p, rj))
    wanted = set()
    for _, _, rj in todo:
        for e in rj['entries']:
            if e['status'] == 'quarantined':
                wanted |= ref_keys(e['rel'], _kind(e['rel']))
    refs = count_refs(os.path.abspath(repo), wanted) if wanted else collections.Counter()
    purged, skipped, freed = [], [], 0
    for d, p, rj in todo:
        for e in rj['entries']:
            if e['status'] != 'quarantined':
                continue
            rel = e['rel']
            f = os.path.join(qdir, d, rel)
            why = None
            age = (now - parse_iso(e['moved_at'])).total_seconds() / 86400
            if not os.path.isfile(f):
                why = 'missing'
            elif age < min_days:
                why = 'too-young:%.1fd' % age
            elif protected_path(rel):
                why = 'protected'
            else:
                keys = ref_keys(rel, _kind(rel))
                keep_base = os.path.basename(e.get('keep') or '').lower() if e.get('reason') == 'dup-sha' else None
                hit = [k for k in keys if refs.get(k, 0) and not (keep_base and os.path.basename(rel).lower() == keep_base)]
                if hit:
                    why = 'referenced:' + hit[0]
            if not why:
                sha = e.get('sha256') or sha256_file(f)
                twin_ok = False
                if e['reason'] == 'dup-sha':
                    kp = os.path.join(rj['root'], e.get('keep') or '\0')
                    twin_ok = os.path.isfile(kp) and os.path.getsize(kp) == e['bytes'] and sha256_file(kp) == sha
                    if not twin_ok:
                        why = 'twin-not-verified'
                elif e['reason'] == 'broken':
                    twin_ok = probe_broken(f, os.path.getsize(f), have_ff) is not None   # vẫn hỏng khi kiểm lại
                    if not twin_ok and sha not in bshas:
                        why = 'no-longer-broken'
                if not why and not twin_ok and sha not in bshas:
                    why = 'no-backup-record'
            if why:
                skipped.append({'rel': rel, 'date': d, 'why': why})
                continue
            size = os.path.getsize(f)
            purged.append({'rel': rel, 'date': d, 'bytes': size, 'reason': e['reason']})
            freed += size
            if apply:
                os.remove(f)
                e['status'] = 'purged'
                e['purged_at'] = now_iso()
                _prune_empty(os.path.dirname(f), os.path.join(qdir, d))
        if apply:
            json.dump(rj, open(p, 'w'), indent=1)
    entry = {'at': now_iso(), 'apply': apply, 'min_days': min_days, 'freed_bytes': freed if apply else 0, 'would_free_bytes': freed,
             'purged': purged, 'skipped': skipped}
    lp = os.path.join(qdir, 'purge-log.json')
    logj = json.load(open(lp)) if os.path.isfile(lp) else []
    logj.append(entry)
    json.dump(logj, open(lp, 'w'), indent=1)
    log('%s: %d file, %.2f GB; giữ lại %d (%s)' % ('ĐÃ xoá' if apply else 'dry-run', len(purged), freed / 1e9, len(skipped),
                                                   ', '.join('%s×%d' % (k, v) for k, v in collections.Counter(s['why'].split(':')[0] for s in skipped).items())))
    return entry


def _kind(rel):
    return 'video' if os.path.splitext(rel)[1].lower() in VIDEO_EXT else 'frame'


def _prune_empty(d, stop):
    while d.startswith(stop) and d != stop:
        try:
            os.rmdir(d)
        except OSError:
            break
        d = os.path.dirname(d)


# ---------- CLI ----------
def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    sub = ap.add_subparsers(dest='cmd', required=True)
    s = sub.add_parser('scan')
    s.add_argument('--root', required=True)
    s.add_argument('--out', required=True)
    s.add_argument('--repo', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
    s.add_argument('--no-probe', action='store_true')
    s.add_argument('--max-hash-gb', type=float, default=6.0)
    q = sub.add_parser('quarantine')
    q.add_argument('--manifest', required=True)
    q.add_argument('--to', required=True)
    q.add_argument('--reason', default='')
    q.add_argument('--apply', action='store_true')
    r = sub.add_parser('restore')
    r.add_argument('--quarantine', required=True)
    r.add_argument('--date')
    r.add_argument('--apply', action='store_true')
    pg = sub.add_parser('purge')
    pg.add_argument('--quarantine', required=True)
    pg.add_argument('--min-days', type=float, default=MIN_PURGE_DAYS)
    pg.add_argument('--repo', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
    pg.add_argument('--backup-shas', action='append', default=[])
    pg.add_argument('--apply', action='store_true')
    a = ap.parse_args(argv)
    if a.cmd == 'scan':
        m = scan(a.root, a.repo, probe=not a.no_probe, max_hash_gb=a.max_hash_gb)
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        json.dump(m, open(a.out, 'w'), indent=1)
        for k, v in sorted(m['summary'].items(), key=lambda kv: -kv[1]['bytes']):
            print('%-14s %7d file %9.3f GB' % (k, v['count'], v['gb']))
        junk = sum(v['bytes'] for k, v in m['summary'].items() if k not in ('keep', 'protected'))
        print('RÁC tổng: %.3f GB -> %s' % (junk / 1e9, a.out))
    elif a.cmd == 'quarantine':
        quarantine(json.load(open(a.manifest)), a.to, a.apply, set(filter(None, a.reason.split(','))) or None)
    elif a.cmd == 'restore':
        restore(a.quarantine, a.date, a.apply)
    else:
        purge(a.quarantine, a.min_days, a.repo, a.backup_shas, a.apply)


if __name__ == '__main__':
    main()
