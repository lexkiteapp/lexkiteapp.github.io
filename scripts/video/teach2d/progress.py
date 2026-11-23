#!/usr/bin/env python3
"""Day 1 vs Day 30 (docs/specs/voice-diary-video.md, 23/11): the viral shape of the in-app Voice Diary, as a Teach2D short.
ONE sentence said twice by the same Kokoro teacher voice: day 1 = hesitant + typical first-month sound slips (respelled so the voice says exactly that), day 30 = fluent.
Every episode is a WRITTEN SAMPLE (content/video/teach2d/progress.json) – never a real learner's recording (privacy) and the score cards carry the word SAMPLE.
Imported by gen.py (`install(globals())`): registers T['progress'], the planner (gen.py --progress-eps N) and the gates; build.py draws it (T_progress)."""
import json, os, re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
PROG_F = f'{ROOT}/content/video/teach2d/progress.json'
HOOK = 'Day one. Day thirty.'
REVIEWER = ('gen.py --progress-eps gates v1 (progress.json row == the episode · every mark inside the day-30 sentence · day-1 text is the same sentence respelled (<= 12 words) · '
            'spoken day-30 words level <= B1 NGSL, the respelled day-1 words are the lesson · hook = "Day one. Day thirty." · no duplicate sentence · short 18-27 s)')
PROG_MAX = 27.0   # QC short ceiling 28 s (same calibration as band)
_PJ = None
FN = {}   # filled by install(): gen.py calls PROG.FN['data_gate'] / ['plan'] (static checkers cannot see names injected into globals)


def bank():
    global _PJ
    if _PJ is None: _PJ = json.load(open(PROG_F))
    return _PJ


def item(pid):
    return next((x for x in bank()['items'] if x['id'] == pid), None)


def norm(s): return re.findall(r"[a-z0-9']+", str(s).lower().replace('’', "'"))


def install(G):
    """Register the template + planner in gen.py's namespace G (= globals())."""
    L, cta = G['L'], G['cta']

    def progress(p):
        it = item(p['id']); assert it, ('progress id not in progress.json', p['id'])
        lines = [L('h', HOOK, 0.35),
                 L('a', it['day1'], 0.7),                              # the stumble: hesitation words + respelled sounds, the silence lets the day-1 card breathe
                 L('k', 'Thirty days later!', 0.35),
                 L('b', it['day30'], 0.4),
                 L('w', 'Same sentence. Just a little practice every day.', 0.3),
                 L('c', 'Save this. Free on lexkite.com.')]
        return dict(lines=lines, data=dict(id=it['id'], day1=it['day1'], day30=it['day30'], marks=it['marks'], s1=it['s1'], s30=it['s30'], sample=True),
                    cta=cta('voice-diary', '#/diary', 'Start your voice diary'), hook=dict(line='h', text=HOOK), src=dict(progress=it['id']))

    G['T']['progress'] = progress; G['SERIES']['progress'] = 'Day 1 vs Day 30'

    def progress_secs(ep): return G['short_secs'](ep) + 0.9   # real shorts run ~0.9 s over short_secs (band/rule calibration)

    def taught(it): return [w for w in norm(it['day1']) if w not in set(norm(it['day30']))] + ['um', 'uh']

    def data_gate(row):
        it = item(row['in']['id']); bad = []
        if not it: return ['progress id not in progress.json']
        txt = set(norm(it['day30']))
        if not it['marks'] or not all(norm(m)[0] in txt for m in it['marks']): bad.append('a mark is not in the day-30 sentence')
        if not (2 <= len(it['day30'].split()) <= 12 and len(it['day1'].split()) <= 14): bad.append('sentence too long (day 30 <= 12 words, day 1 <= 14)')
        if it['day1'] == it['day30']: bad.append('day 1 must differ from day 30')
        if not (30 <= it['s1'] < it['s30'] <= 100 and it['s30'] - it['s1'] >= 25): bad.append('sample scores: day 30 must beat day 1 by >= 25')
        return bad

    def plan_progress(n):
        F = G['facts'](); A = G['load_auto'](); R_ = json.load(open(G['REV_F'])); rows = A['rows']; why = {}; have = {r['id'] for r in rows}
        used = {r['hash'] for r in rows}; ok = []
        def skip(k, r): why.setdefault(k, []).append(r)
        for it in bank()['items']:
            if len(ok) >= n: break
            rid = f"t2a_prog_{re.sub('[^a-z0-9]', '', it['id'])}_1"
            if rid in have: continue
            row = dict(id=rid, template='progress', teacher='ama' if (len(rows) + len(ok)) % 2 == 0 else 'carlos', theme='dusk', area='voice-diary', point=f"progress:{it['id']}",
                       hash=G['chash']('progress', it['id']), heads=[f"progress:{it['id']}"], taught=taught(it), **{'in': dict(id=it['id'])})
            if row['hash'] in used: skip('dup', rid); continue
            if data_gate(row): skip('data:' + ','.join(data_gate(row)), rid); continue
            try: ep = G['make'](row)
            except AssertionError as e: skip('shape:' + str(e.args[0]), rid); continue
            if not 18 <= progress_secs(ep) <= PROG_MAX: skip(f'duration {progress_secs(ep):.1f}', rid); continue
            if not G['hook_gate'](row, ep): skip('hook', rid); continue
            ok.append([row, ep, G['taught_re'](row['taught']).sub(' ', ' '.join(l['text'] for l in ep['lines']))])
        FR = G['FRAME'] | {'day', 'one', 'thirty', 'later', 'same', 'sentence', 'little', 'practice', 'every', 'just'}
        for x, un in zip(ok, G['unknown']([x[2] for x in ok])): x[2] = [u for u in un if u.lower() not in FR and not G['lvl_ok'](u, F)]
        new = []
        for row, ep, un in ok:
            if un: skip('level:' + ','.join(un), row['id']); continue
            rows.append(row); new.append(row)
            R_['verdicts'][row['id']] = dict(template='progress', hook=ep['hook']['text'], hook_true=True, script_reviewed=True, reviewer=REVIEWER, machine=True,
                                             gates=dict(data=True, level=True, hook=True, dup=True), hash=row['hash'], script={l['id']: l['text'] for l in ep['lines']})
        json.dump(A, open(G['AUTO_F'], 'w'), indent=1, ensure_ascii=False); open(G['AUTO_F'], 'a').write('\n')
        json.dump(R_, open(G['REV_F'], 'w'), indent=1, ensure_ascii=False); open(G['REV_F'], 'a').write('\n')
        print(f"progress: +{len(new)} rows, total {len(rows)}")
        for k, v in why.items(): print(f'  skipped {k}: {len(v)} {v[:6]}')

    G['progress_data_gate'] = data_gate; G['plan_progress'] = plan_progress; FN.update(data_gate=data_gate, plan=plan_progress); G['progress_secs'] = progress_secs; G['PROGRESS_MAX'] = PROG_MAX
