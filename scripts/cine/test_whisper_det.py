#!/usr/bin/env python3
"""Unit test for whisper_det.snap_onsets (numpy only, no model). Cases from the 02/11 asr_match flake (render ready short, r_q2)."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from whisper_det import snap_onsets

SR = 16000
def tone(spans, dur=4.0):
    a = np.zeros(int(dur * SR), np.float32)
    for t0, t1 in spans: i, j = int(t0 * SR), int(t1 * SR); a[i:j] = 0.3 * np.sin(np.arange(j - i) * 0.3)
    return a

class T(unittest.TestCase):
    def test_pause_inside_span(self):   # whisper "is" 2.10–3.0 s = tail of "growing" (to 2.43) + silence + "Is" from 2.82
        a = tone([(1.5, 2.43), (2.82, 3.2)])
        self.assertAlmostEqual(snap_onsets(a, [dict(s=2.10, e=3.0)], s='s', e='e')[0]['s'], 2.82, delta=0.011)
    def test_leading_silence(self):     # word placed in the silence before speech (align.py case "Wait" 0.0 vs 0.42)
        a = tone([(0.42, 0.9)])
        self.assertAlmostEqual(snap_onsets(a, [dict(start=0.0, end=0.9)])[0]['start'], 0.42, delta=0.011)
    def test_stop_closure_kept(self):   # a < 120 ms closure inside one word is not a pause: start stays
        a = tone([(1.0, 1.2), (1.27, 1.6)])
        self.assertAlmostEqual(snap_onsets(a, [dict(s=1.0, e=1.6)], s='s', e='e')[0]['s'], 1.0, delta=0.011)
    def test_never_earlier_or_past_end(self):
        a = tone([(1.0, 1.05)])
        w = snap_onsets(a, [dict(s=1.2, e=1.5), dict(s=0.5, e=1.02)], s='s', e='e')
        self.assertEqual(w[0]['s'], 1.2); self.assertLessEqual(w[1]['s'], 1.02 - 0.04 + 1e-9)

if __name__ == '__main__':
    unittest.main()
