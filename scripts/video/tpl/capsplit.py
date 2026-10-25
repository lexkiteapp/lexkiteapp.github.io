"""Caption pagination for the v9 template family (render_v9.py; unit test scripts/video/tpl/test_capsplit.py).
Pure python, no fonts: the caller passes the fit tests (measured with the real font at the minimum caption size).

  paginate(words, fits1, fits2) -> [(j, i, split)]   words[j:i] is one page; split None = one row, k = row break before words[j + k]

Rules (CapCut, 2-3 words per page; qc_v9 caption_script):
- a page holds 2-3 words; a one-word page is allowed ONLY as the natural final word of its line (ends with . ? ! :) or when the whole
  line is one word. Any other single word is merged with a neighbour; if the merged page does not fit on one row it is set on two rows.
- cheapest pagination wins: break at sentence punctuation, avoid sentence punctuation inside a page, prefer 2 over 3 words, prefer one row."""
END = '.?!:'
SOFT = ',;'

def paginate(words, fits1, fits2, maxw=3):
    n = len(words); INF = float('inf')
    def solve(allow_single):
        best = [(0.0, [])] + [None] * n
        for i in range(1, n + 1):
            for L in range(1, maxw + 1):
                j = i - L
                if j < 0 or best[j] is None: continue
                seg = words[j:i]; c = 0.0; split = None
                if L == 1:
                    natural = (i == n and seg[0][-1] in END) or n == 1
                    if not natural and not allow_single: continue
                    c += 0.8 if natural else 100.0
                    if not fits1(seg) and not allow_single: continue
                else:
                    if not fits1(seg):
                        split = fits2(seg)
                        if split is None: continue
                        c += 2.0   # two rows: allowed, but one row is better
                if L == 3: c += 0.3
                c += 0.0 if (i == n or seg[-1][-1] in END) else (0.4 if seg[-1][-1] in SOFT else 1.2)
                c += sum(2.5 if s[-1] in END else 0.9 for s in seg[:-1] if s[-1] in END + SOFT)
                tot = best[j][0] + c
                if best[i] is None or tot < best[i][0]: best[i] = (tot, best[j][1] + [(j, i, split)])
        return best[n]
    r = solve(False) or solve(True)   # the fallback (a forced single word) only when nothing else exists; qc_v9 then fails the video
    return r[1]

def single_word_pages(words, pages):
    """pages that qc_v9 caption_script rejects: one word that is not the natural final word of the line"""
    return [words[j] for j, i, _ in pages if i - j == 1 and not ((i == len(words) and words[j][-1] in END) or len(words) == 1)]
