#!/usr/bin/env python3
"""approved_templates.py - the ONE template approval book (owner 15/11: "cái nào ok đạt để riêng sau đỡ nhầm"): content/video/cine/news/approved.json -> "templates".
Only templates with status "approved" may enter the posting queue (teach2d: autopub_gate.py reason template:<status>; Motion: call require() before publish).
status: approved (evidence: sample clip + qc + motion_qc + date + who) | draft (specs exist, no passing clip yet) | retired (kept for history, never queued).
  approved_templates.py check                   validate the book against the specs on disk (CI: scripts/test/template-approval.py)
  approved_templates.py approve ID --engine E --sample URL --qc N [--motion-qc 42/42] --by WHO   draft -> approved (after a CI clip passed every gate)
  approved_templates.py sync-bank [--dry]       teach2d drafts with a banked clip (short AND wide QC >= 90, every gate green = bank.py rule) -> approved (owner 19/11: self-approve at QC >= 90)
  approved_templates.py status ID [ENGINE]"""
import glob, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); BOOK = f'{ROOT}/content/video/cine/news/approved.json'
MAX_CTA_SAY = 22   # longest hand-made Motion CTA that renders ('Take a free mock test' = 21)
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
        sp = json.load(open(f)); tp = sp.get('template')
        say = (sp.get('cta') or {}).get('say') or ''
        if len(say) > MAX_CTA_SAY: out.append(f'{os.path.basename(f)}: cta.say "{say}" is {len(say)} chars > {MAX_CTA_SAY} (wraps taller than the 240 px pop band -> render_v9 "pop taller than the band"; 19/11: 64/64 generated renders failed on this)')
        for l in sp.get('lines') or []:
            if l.get('id') in ('t', 'end', 'beat'): out.append(f'{os.path.basename(f)}: line id "{l["id"]}" is a reserved time anchor in build_overlay.at() — a card anchored to ["{l["id"]}", 0] fires at t=0 and replaces the hook at once (19/11: tp_ hook visible 0.4 s -> 5 QC gates red)')
        cta = sp.get('cta') or {}; eco = {x['id']: x['link'] for x in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}
        if cta.get('link') and eco.get(cta.get('area')) != cta.get('link'): out.append(f'{os.path.basename(f)}: cta.area "{cta.get("area")}" is not an ecosystem area with link {cta.get("link")} (qc_v9 cta gate)')
        if ('motion', tp) not in ids: out.append(f'motion template {tp} (in {os.path.basename(f)}) is not in the book'); break
    return out
if __name__ == '__main__':
    a = sys.argv[1:]
    if not a or a[0] == 'check':
        p = problems(); print('\n'.join(p) if p else f'approval book ok: {len(templates())} templates', {s: sum(1 for t in templates() if t['status'] == s) for s in ('approved', 'draft', 'retired')}); sys.exit(1 if p else 0)
    if a[0] == 'sync-bank':
        import datetime; B = load(); bank = json.load(open(f'{ROOT}/content/video/teach2d/bank.json'))['eps']; best = {}
        for ep, r in bank.items():
            sc = r.get('score') or {}
            if r.get('state') == 'banked' and sc.get('short', 0) >= 90 and sc.get('wide', 0) >= 90: best.setdefault(ep.split('_')[1], []).append((min(sc['short'], sc['wide']), ep, r))
        for t in B['templates']:
            if t['engine'] != 'teach2d' or t['status'] != 'draft' or t['id'] not in best: continue
            q, ep, r = max(best[t['id']]); print('approve teach2d', t['id'], f'qc {q} via {ep} (run {r.get("run")}, {len(best[t["id"]])} banked)')
            if '--dry' not in a: t.update(status='approved', sample=f'content/video/teach2d/bank.json (artifact tv-bank-{r.get("run")}, 90 days)', qc=q, approved=str(datetime.date.today()), by='auto: bank.py gate (short+wide >= 90, all qc.py gates)', note=f'bank.json: {len(best[t["id"]])} banked, QC {q} short+wide')
        if '--dry' not in a: json.dump(B, open(BOOK, 'w'), indent=1, ensure_ascii=False); open(BOOK, 'a').write('\n')
        sys.exit(0)
    if a[0] == 'status': print(status(a[1], a[2] if len(a) > 2 else None)); sys.exit(0)
    if a[0] == 'approve':
        g = lambda k, d=None: a[a.index(k) + 1] if k in a else d; B = load(); import datetime
        t = next(x for x in B['templates'] if x['id'] == a[1] and x['engine'] == g('--engine'))
        t.update(status='approved', sample=g('--sample'), qc=float(g('--qc')), approved=str(datetime.date.today()), by=g('--by'), **({'motion_qc': g('--motion-qc')} if g('--motion-qc') else {}))
        json.dump(B, open(BOOK, 'w'), indent=1, ensure_ascii=False); open(BOOK, 'a').write('\n'); print('approved', a[1]); sys.exit(0)
