"""Teach2D on-screen labels derived from the episode data (never hard-coded): stress ordinals + syllable-position quiz options.
Used by build.py T_stress; regression cases in scripts/test/teach2d-rig.mjs (attend -> 2nd, attendee -> 3rd, referee option REE -> '…-REE')."""
import math



def ordinal(i0):
    """0-based syllable index -> '1st', '2nd', '3rd', '4th', … '11th', '12th', '13th', '21st'."""
    n = i0 + 1
    return f"{n}{'th' if 10 <= n % 100 <= 20 else {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')}"


def syl_label(syl, i):
    """Option label that shows WHERE the syllable sits: first 'X-…', middle '…-X-…', last '…-X', one syllable 'X'."""
    x = syl[i].upper()
    if len(syl) == 1: return x
    return f'{x}-…' if i == 0 else f'…-{x}' if i == len(syl) - 1 else f'…-{x}-…'


def stress_quiz(word, quiz):
    """word = {syl, stress}, quiz = {options, answer} -> (labels, answer index). Each option is located in the word's syllables
    (the answer option at the stressed syllable when the same spelling occurs twice); an option that is not a syllable is a data error."""
    syl, labels = word['syl'], []
    for k, opt in enumerate(quiz['options']):
        hits = [j for j, s in enumerate(syl) if s.upper() == opt.upper()]
        assert hits, ('stress quiz option is not a syllable of the word', opt, syl)
        if k == quiz['answer']: i = word['stress'] if word['stress'] in hits else hits[0]
        else: i = next((j for j in hits if j != word['stress']), hits[0])
        labels.append(syl_label(syl, i))
    assert syl[word['stress']].upper() == quiz['options'][quiz['answer']].upper(), ('quiz answer is not the stressed syllable', quiz, syl, word['stress'])
    return labels, quiz['answer']


def frames_of(total, fps):
    """Frame count of a video of `total` seconds – THE one formula (build.py, qc.py, lipsync_gate.py, rig_plan.mjs framesOf).
    Integer ms (half-up), then half-up frames: no float drift, no banker's rounding (Python round(832.5) = 832, JS Math.round = 833 –
    pilot #679 phrasal_hangout short failed lipsync_rig 833 vs 832)."""
    ms = int(math.floor(float(total) * 1000 + 0.5))
    return (ms * int(fps) + 500) // 1000


def nf_of(T):
    """Frame count of a timeline: the value build.py wrote, else the same formula."""
    return int(T['nf']) if T.get('nf') is not None else frames_of(T['total'], T['fps'])


def side_zoom_cap(cap_s, ox, hx1, cap_x0, gap=12):
    """Largest camera scale (anchored at x = ox, dx 0) that keeps the head's right edge hx1 at least `gap` px left of the caption band
    (x0 = cap_x0). Never below 1.0: if the unzoomed head already touches the band, qc.py layout fails it (no hiding by a smaller box)."""
    if hx1 <= ox: return cap_s
    return min(cap_s, max(1.0, (cap_x0 - gap - ox) / (hx1 - ox)))
