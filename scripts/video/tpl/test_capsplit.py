#!/usr/bin/env python3
"""Unit test for capsplit.paginate (no fonts: width = characters, column = N characters)."""
import os, sys, unittest
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from capsplit import paginate, single_word_pages

def fitters(col):
    w = lambda seg: sum(len(x) for x in seg) + (len(seg) - 1)
    f1 = lambda seg: w(seg) <= col
    def f2(seg):
        ok = [k for k in range(1, len(seg)) if f1(seg[:k]) and f1(seg[k:])]
        return min(ok, key=lambda k: abs(w(seg[:k]) - w(seg[k:]))) if ok else None
    return f1, f2

def pages(text, col):
    ws = text.split(); f1, f2 = fitters(col); p = paginate(ws, f1, f2); return ws, p, [' '.join(ws[j:i]) for j, i, _ in p]

class T(unittest.TestCase):
    def check(self, text, col):
        ws, p, txt = pages(text, col)
        self.assertEqual(' '.join(txt), text)                       # every word once, in order
        self.assertTrue(all(1 <= i - j <= 3 for j, i, _ in p), txt)  # 1-3 words per page
        self.assertEqual(single_word_pages(ws, p), [], txt)        # no stray one-word page
        return txt, p
    def test_failures_from_templates_v2(self):   # every single-word page qc_v9 reported on 25/10 (narrow column)
        for text in ('Borrow or lend? Don\'t mix them up.', 'Compare tricky words free on lexkite.com.', 'Two: luggage. Can you hold my luggage?',
                     'Three: elevator. Where\'s the elevator?', 'Most Americans say three beats. Stress the first one.', 'Normal speed: comfortable.',
                     'Your turn. Repeat after me: comfortable.', 'Practice pronunciation free on lexkite.com.', 'Airport check-in. Here\'s what to say.',
                     'Hi! Can I see your passport, please?'):
            for col in (14, 16, 22, 40): self.check(text, col)   # column >= the longest word
    def test_impossible_is_reported(self):   # a word wider than the column: fallback page, reported (qc fails, the renderer refuses)
        ws, p, txt = pages('Practice pronunciation free', 10); self.assertTrue(single_word_pages(ws, p))
    def test_natural_final_word_kept(self):
        txt, _ = self.check('Normal speed: comfortable.', 22)
        self.assertEqual(txt, ['Normal speed:', 'comfortable.'])
    def test_single_word_line(self):
        txt, _ = self.check('Slowly:', 22); self.assertEqual(txt, ['Slowly:'])
    def test_merge_wraps_to_two_rows(self):   # 'Practice pronunciation' does not fit one row: merged on two rows, never 'Practice' alone
        txt, p = self.check('Practice pronunciation free on lexkite.com.', 16)
        self.assertEqual(txt[0], 'Practice pronunciation'); self.assertEqual(p[0][2], 1)
    def test_prefers_sentence_breaks(self):
        txt, _ = self.check('I agree. I don\'t agree. Do you agree?', 30)
        self.assertEqual(txt, ['I agree.', 'I don\'t agree.', 'Do you agree?'])
    def test_non_final_single_merged(self):   # 'Two:' alone was a page in v2: it must join 'luggage.'
        txt, _ = self.check('Two: luggage. Can you hold my luggage?', 14)
        self.assertNotIn('Two:', txt)

if __name__ == '__main__':
    unittest.main(verbosity=1)
