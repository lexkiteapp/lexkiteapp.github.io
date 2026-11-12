"""Pure-helper tests for modal_train.py (no Modal / GPU needed): python3 scripts/pron/train/test_helpers.py"""
import os, sys
from unittest import mock
sys.modules['modal'] = mock.MagicMock()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import modal_train as m
assert len(m.VOCAB) == 40 and m.VOCAB['<pad>'] == 0 and m.VOCAB['ZH'] == 39
assert m.lev([1, 2, 3], [1, 3]) == 1 and m.lev([], [1, 2]) == 2 and m.lev([1, 2], [1, 2]) == 0 and m.lev([1, 2], [2, 1]) == 2
w = lambda ph, acc, mis=None: {'phones': ph, 'phones-accuracy': acc, 'mispronunciations': mis}
assert m.so762_phones([w(['TH', 'IH1', 'NG', 'K'], [2, 2, 2, 2])]) == ['TH', 'IH', 'NG', 'K']
assert m.so762_phones([w(['TH', 'IH', 'NG', 'K'], [0, 2, 2, 2], [{'index': 0, 'pronounced-phone': 'S'}])]) == ['S', 'IH', 'NG', 'K']
assert m.so762_phones([w(['K', 'AE', 'T'], [2, 2, 0], [{'index': 2, 'pronounced-phone': '<DEL>'}])]) == ['K', 'AE']
assert m.so762_phones([w(['K', 'AE', 'T'], [2, 2, 0])]) is None          # wrong phone, unknown what was said
assert m.so762_phones([w(['K', 'AE', 'T'], [2, 2, 1], [{'index': 1, 'pronounced-phone': '<unk>'}])]) is None
assert m.out_dir(True) == 'pron-model-a-dry' and m.out_dir(False) == 'pron-model-a'
e8 = m.estimate_usd(8, 'L4'); assert 9 < e8 < 12, e8
assert m.estimate_usd(0, 'L4', dry_run=True) < 0.6
assert m.estimate_usd(8, 'L4', include360=True) <= m.BUDGET_USD
try: m.cost_guard(12, 'L4', False, False); raise AssertionError('guard should abort')
except SystemExit as x: assert 'ABORT' in str(x)
try: m.estimate_usd(1, 'H100'); raise AssertionError
except SystemExit: pass
print('✓ pron train helpers: ok (L4 8 h worst case $%s)' % e8)
