"""Teach2D on-screen labels derived from the episode data (never hard-coded): stress ordinals + syllable-position quiz options.
Used by build.py T_stress; regression cases in scripts/test/teach2d-rig.mjs (attend -> 2nd, attendee -> 3rd, referee option REE -> '…-REE')."""
import math
import re



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


EMOJI = re.compile('[\u2600-\u27bf\U0001f300-\U0001faff]')
NO_BREAK_AFTER = {'a', 'an', 'the', 'my', 'your', 'his', 'her', 'our', 'their', 'its', 'this', 'that', 'to', 'of', 'in', 'on', 'at', 'for', 'with', 'by', 'from', 'and', 'or', 'but', 'i', 'will', 'do', 'does', 'is', 'are', 'not'}


def clamp_span(center, width, lo, hi):
    """[x0, x1] of a box of this width centred on `center`, moved just enough to stay inside lo..hi."""
    x0 = max(lo, min(center - width / 2, hi - width)); return [x0, x0 + width]


def chip_w(text, measure, size):
    """Chip width: the Latin font measures an emoji as a narrow box and the 0.06em tracking is not in the metrics, so the label ran past the pill (mytreat short)."""
    plain = EMOJI.sub('', text)
    return measure(plain, size) + 0.06 * size * len(plain) + 1.35 * size * len(EMOJI.findall(text)) + 56


def _weak_end(word):
    return re.sub(r"[^a-z']", '', word.lower().replace('\u2019', "'")) in NO_BREAK_AFTER


def _split_rows(words, ww, space, max_w, rows):
    """Row break of one caption page: None = does not fit, 0 = one row, i = second row starts at word i (best-balanced break, not after a function word)."""
    line = lambda a, b: sum(ww[a:b]) + space * (b - a - 1)
    if line(0, len(ww)) <= max_w: return 0
    if rows < 2: return None
    opts = [i for i in range(1, len(ww)) if line(0, i) <= max_w and line(i, len(ww)) <= max_w]
    return min(opts, key=lambda i: (_weak_end(words[i - 1]), abs(line(0, i) - line(i, len(ww))))) if opts else None


def paginate(words, ww, space, max_w, rows=1):
    """Caption pages of one spoken line: never across a sentence end; inside a sentence the fewest pages, breaking at punctuation and never after a function word
    ('It's my | treat'), no lone word when avoidable. -> [(first, last_exclusive, row_break)]."""
    ends = [i + 1 for i, w in enumerate(words) if w[-1:] in '.!?' and not re.fullmatch(r'(?:[A-Z]\.)+', w)]
    if not ends or ends[-1] != len(words): ends.append(len(words))
    out, a = [], 0
    for z in ends:
        best = {a: (0, None)}
        for j in range(a + 1, z + 1):
            for i in range(a, j):
                br = _split_rows(words[i:j], ww[i:j], space, max_w, rows) if j - i > 1 else 0
                if i not in best or br is None: continue
                pen = 10 + (6 if j - i == 1 and z - a > 1 else 0) + (0 if j == z or words[j - 1][-1:] in ',:;' else 9 if _weak_end(words[j - 1]) else 2)
                c = best[i][0] + pen
                if j not in best or c < best[j][0]: best[j] = (c, (i, br))
        seg, j = [], z
        while j > a: i, br = best[j][1]; seg.append((i, j, br)); j = i
        out += seg[::-1]; a = z
    return out
