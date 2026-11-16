#!/usr/bin/env python3
"""approved_templates.py - the ONE template approval book (owner 15/11: "cái nào ok đạt để riêng sau đỡ nhầm"): content/video/cine/news/approved.json -> "templates".
Only templates with status "approved" may enter the posting queue (teach2d: autopub_gate.py reason template:<status>; Motion: call require() before publish).
status: approved (evidence: sample clip + qc + motion_qc + date + who) | draft (specs exist, no passing clip yet) | retired (kept for history, never queued).
  approved_templates.py check                   validate the book against the specs on disk (CI: scripts/test/template-approval.py)
  approved_templates.py approve ID --engine E --sample URL --qc N [--motion-qc 42/42] --by WHO   draft -> approved (after a CI clip passed every gate)
  approved_templates.py status ID [ENGINE]"""
import glob, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); BOOK = f'{ROOT}/content/video/cine/news/approved.json'
EVID = ('sample', 'qc', 'approved', 'by')
def load(): return json.load(open(BOOK))
def templates(): return load().get('templates', [])
def status(tid, engine=None):
    for t in templates():
        if t['id'] == tid and (engine is None or t['engine'] == engine): return t['status']
    return None
def require(tid, engine=None):
    s = status(tid, engine)
    if s != 'approved': raise SystemExit(f'template {tid} ({engine or "any engine"}) is {s or "not in the approval book"} - only approved templates may be queued (content/video/cine/news/approved.json)')
def problems():
    out = []; T = templates(); seen = set()
    for t in T:
        k = (t['engine'], t['id'])
        if k in seen: out.append(f'duplicate {k}')
        seen.add(k)
        if t['status'] not in ('approved', 'draft', 'retired'): out.append(f'{k}: status {t["status"]}')
        if t['status'] == 'approved':
            miss = [e for e in EVID if not t.get(e)]
            if miss: out.append(f'{k}: approved without {miss}')
            if t['engine'] == 'motion' and not t.get('motion_qc'): out.append(f'{k}: approved Motion template needs motion_qc')
            if (t.get('qc') or 0) < 90 and t['engine'] == 'teach2d': out.append(f'{k}: qc < 90')
        if t.get('status') == 'retired' and not t.get('note'): out.append(f'{k}: retired without a note')
        if t.get('spec') and not glob.glob(f'{ROOT}/{t["spec"]}'): out.append(f'{k}: spec {t["spec"]} not found')
    ids = {(t['engine'], t['id']) for t in T}
    for f in glob.glob(f'{ROOT}/content/video/teach2d/eps/*.json'):
        tp = json.load(open(f))['template']
        if ('teach2d', tp) not in ids: out.append(f'teach2d template {tp} (in {os.path.basename(f)}) is not in the book'); break
    for f in glob.glob(f'{ROOT}/content/video/cine/news/motion/*.json'):
        if os.path.basename(f) == 'reviewed.json': continue
        tp = json.load(open(f)).get('template')
        if ('motion', tp) not in ids: out.append(f'motion template {tp} (in {os.path.basename(f)}) is not in the book'); break
    return out
if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] == 'check':
        p = problems(); print('\n'.join(p) if p else f'approval book ok: {len(templates())} templates', {s: sum(1 for t in templates() if t['status'] == s) for s in ('approved', 'draft', 'retired')}); sys.exit(1 if p else 0)
    if a[0] == 'status': print(status(a[1], a[2] if len(a) > 2 else None)); sys.exit(0)
    if a[0] == 'approve':
        g = lambda k, d=None: a[a.index(k) + 1] if k in a else d; B = load(); import datetime
        t = next(x for x in B['templates'] if x['id'] == a[1] and x['engine'] == g('--engine'))
        t.update(status='approved', sample=g('--sample'), qc=float(g('--qc')), approved=str(datetime.date.today()), by=g('--by'), **({'motion_qc': g('--motion-qc')} if g('--motion-qc') else {}))
        json.dump(B, open(BOOK, 'w'), indent=1, ensure_ascii=False); open(BOOK, 'a').write('\n'); print('approved', a[1]); sys.exit(0)
