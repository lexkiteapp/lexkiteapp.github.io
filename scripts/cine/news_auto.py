#!/usr/bin/env python3
"""news_auto.py - A->Z driver for the news shorts (docs/AUTOMATION.md steps 1-8, owner 23/10). 0 credits, idempotent, resumable.
Ledger = lexkite-shorts:ledger/news.json (one record per script-bank id; a re-run never duplicates: picked ids are skipped while
planned/pending/approved, a run id is applied once). Commands:
  pick        --ledger L --n N                 -> 'bank:<sid>,...' (unused bank items; failed ones retried <= 2x with another background;
                                                 diversity: least-used topic / hook type / host opener over the last 30 records)
  materialize <items> [--bg-k K]               -> lesson ids; 'bank:<sid>' -> content/video/cine/news/<lid>.json + lines (bank2news.py), deterministic
  record      --ledger L --out OUT --run R     -> ledger from OUT/qc/*.json (qc_gate), OUT/passed.txt, OUT/qc_dropped.txt, OUT/dropped.txt
  summary     --ledger L [--hours 24] [--json F] -> rendered / passed / failed by gate / pending approval (daily digest, Admin)
Status flow: planned -> rendered -> pending_approval (QC >= 90 + ALL PASS, stored as 1 Drive copy) | failed (gate list, attempts+1) |
dropped (preflight: script/placement) ; approved / rejected are set by the Admin 'Chờ duyệt' queue (never by this script)."""
import argparse, glob, hashlib, json, os, re, subprocess, sys, time
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); D = f'{ROOT}/content/video/cine/news'
BANKD = f'{ROOT}/content/video/scripts/bank'; MAX_ATTEMPTS = 2; PASS_SCORE = 90
def bank():
    B = {}
    for f in sorted(glob.glob(f'{BANKD}/*.jsonl')):
        for l in open(f):
            if l.strip(): x = json.loads(l); B[x['id']] = x
    return B
def load(p):
    try: return json.load(open(p))
    except Exception: return dict(v=1, items={}, runs=[])
def save(p, L):
    os.makedirs(os.path.dirname(p) or '.', exist_ok=True); tmp = p + '.tmp'; json.dump(L, open(tmp, 'w'), indent=1, ensure_ascii=False, sort_keys=True); os.replace(tmp, p)
def lesson_for(sid):
    for f in glob.glob(f'{D}/news_*.json'):
        try:
            if (json.load(open(f)).get('source') or {}).get('scriptbank') == sid: return os.path.basename(f)[:-5]
        except Exception: pass
    return None
def now(): return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
def pick(a):
    L = load(a.ledger); B = bank(); it = L['items']; recent = sorted(it.values(), key=lambda r: r.get('updated', ''))[-30:]
    use = lambda k, v: sum(1 for r in recent if r.get(k) == v)
    cand = []
    for sid, b in B.items():
        r = it.get(sid)
        if r and (r['status'] in ('planned', 'rendered', 'pending_approval', 'approved', 'rejected') or r.get('attempts', 0) >= MAX_ATTEMPTS): continue
        if b.get('quality') == 'reject': continue
        cand.append((use('topic', b.get('topic')) + use('hook_type', b.get('hook_type')), hashlib.md5(sid.encode()).hexdigest(), sid))
    out = [sid for _, _, sid in sorted(cand)[:a.n]]
    print(','.join('bank:' + s for s in out))
def materialize(a):
    out = []
    for item in [x for x in a.items.split(',') if x]:
        if not item.startswith('bank:'): out.append(item.split(':')[0]); continue
        sid = item[5:]; lid = lesson_for(sid)
        if not lid:   # deterministic: same bank item + same k -> same lesson / background (re-run = identical)
            r = subprocess.run([sys.executable, f'{ROOT}/scripts/cine/bank2news.py', sid, 'auto'] + (['--k', str(a.bg_k)] if a.bg_k else []), capture_output=True, text=True, timeout=120)
            if r.returncode: print(f'::warning::bank2news {sid}: {r.stderr.strip()[-200:]}', file=sys.stderr); continue
            lid = lesson_for(sid)
        if lid: out.append(lid)
    print(','.join(out))
def record(a):
    L = load(a.ledger); it = L['items']
    if a.run in L.get('runs', []): print(f'run {a.run} already recorded (idempotent)'); return
    passed = {l.split()[1] for l in open(f'{a.out}/passed.txt') if l.strip()} if os.path.exists(f'{a.out}/passed.txt') else set()
    dropped = {}
    for fn in ('qc_dropped.txt', 'dropped.txt'):
        if os.path.exists(f'{a.out}/{fn}'):
            for l in open(f'{a.out}/{fn}'):
                p = l.split(None, 2)
                if p: dropped[p[0]] = (p[1] if len(p) > 1 else 'dropped')
    qcs = {os.path.basename(f)[:-5]: json.load(open(f)) for f in glob.glob(f'{a.out}/qc/*.json')}
    lids = set(qcs) | passed | set(dropped)
    for lid in sorted(lids):
        lf = f'{D}/{lid}.json'; sp = json.load(open(lf)) if os.path.exists(lf) else {}
        sid = (sp.get('source') or {}).get('scriptbank') or lid
        q = qcs.get(lid) or {}; gates = q.get('gates') or {}; failed = sorted(k for k, g in gates.items() if not g.get('ok'))
        r = it.setdefault(sid, dict(sid=sid, attempts=0)); r.update(lid=lid, topic=sp.get('topic'), hook_type=sp.get('hook_type'), bg=sp.get('bg'), run=a.run, updated=now())
        if lid in passed and q.get('score', 0) >= PASS_SCORE: r.update(status='pending_approval', score=q.get('score'), failed_gates=[])
        elif lid in dropped and not q: r.update(status='dropped', reason=dropped[lid], attempts=r.get('attempts', 0) + 1)
        else: r.update(status='failed', score=q.get('score'), failed_gates=failed, attempts=r.get('attempts', 0) + 1)
    L.setdefault('runs', []).append(a.run); L['runs'] = L['runs'][-200:]; L['updated'] = now(); save(a.ledger, L)
    print(f'ledger: {len(lids)} lesson(s) recorded from run {a.run}')
def summary(a):
    L = load(a.ledger); it = list(L['items'].values()); cut = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(time.time() - a.hours * 3600))
    day = [r for r in it if r.get('updated', '') >= cut]; byg = {}
    for r in day:
        for g in r.get('failed_gates') or ([r['reason']] if r.get('status') == 'dropped' and r.get('reason') else []): byg[g] = byg.get(g, 0) + 1
    s = dict(hours=a.hours, rendered=sum(r['status'] in ('pending_approval', 'failed', 'approved', 'rejected') for r in day), passed=sum(r['status'] == 'pending_approval' for r in day),
             failed=sum(r['status'] == 'failed' for r in day), dropped=sum(r['status'] == 'dropped' for r in day), failed_by_gate=dict(sorted(byg.items(), key=lambda x: -x[1])),
             pending_approval=sum(r['status'] == 'pending_approval' for r in it), approved=sum(r['status'] == 'approved' for r in it), total=len(it))
    if a.json: json.dump(s, open(a.json, 'w'), indent=1)
    print(json.dumps(s))
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('pick'); p.add_argument('--ledger', required=True); p.add_argument('--n', type=int, default=1); p.set_defaults(f=pick)
    p = sp.add_parser('materialize'); p.add_argument('items'); p.add_argument('--bg-k', type=int, default=0); p.set_defaults(f=materialize)
    p = sp.add_parser('record'); p.add_argument('--ledger', required=True); p.add_argument('--out', required=True); p.add_argument('--run', required=True); p.set_defaults(f=record)
    p = sp.add_parser('summary'); p.add_argument('--ledger', required=True); p.add_argument('--hours', type=float, default=24); p.add_argument('--json'); p.set_defaults(f=summary)
    a = ap.parse_args(); a.f(a)
