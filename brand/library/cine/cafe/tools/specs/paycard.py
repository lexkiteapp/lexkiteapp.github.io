LESSON = dict(id='cafe-can-i-pay-by', cefr='A2', goal='Paying', pattern='Can I pay by ___? (card / phone) · Can I pay in cash?', area='roleplay', out='cine-cafe-paycard.mp4')
l0 = line('c_four', 0.05)
shot('price', 'c06_ots_ama_talk_b', 0.05 + l0['dur'] + 0.5, lambda n: list(range(120, 120 - n, -1)), [('c06_ots_ama_talk_b', 'ama', [])], [('carlos', l0)],
     ov=[('Badge', 0.0, 3.0, 'A2 · Paying'), ('Hook', 0.0, 1.9, 'Card, cash or phone?')])
l1 = line('a_card', 0.05); l1b = line('c_nopro', 0.05 + l1['dur'] + 0.3)
shot('ask', 'c05_ots_ama_talk_a', l1b['at'] + l1b['dur'] + 0.4, lambda n: rng(0, n), [('c05_ots_ama_talk_a', 'ama', [l1])], [('ama', l1), ('carlos', l1b)])
l2 = line('a_card', 0.5); l3 = line('a_phone', 0.5 + l2['dur'] + 0.4)
shot('pattern', 'c10_ama_mcu_talk', l3['at'] + l3['dur'] + 1.9, lambda n: rng(0, n), [('c10_ama_mcu_talk', 'ama', [l2, l3])], [('ama', l2), ('ama', l3)],
     ov=[('Pattern', 0.15, l3['at'] + l3['dur'] + 0.45, 'Can I pay by ___?|'), ('Pattern', l3['at'] + l3['dur'] + 0.5, None, 'But cash is different:|in cash')])
l4 = line('a_cash', 2.5)
shot('yourturn', 'c10_ama_mcu_talk', l4['at'] + l4['dur'] + 0.45, lambda n: list(range(120, 120 - n, -1)), [('c10_ama_mcu_talk', 'ama', [l4])], [('ama', l4)],
     ov=[('Prompt', 0.1, l4['at'] - 0.15, 'Your turn!|Ask to pay with cash.')])
l5 = line('a_thanks', 2.35)
shot('insert', 'c15_insert_handover', 3.4, lambda n: rng(0, n), [], [('ama', l5)])
shot('nod', 'c08_ots_carlos_react', 1.9, lambda n: rng(6, 6 + n), [], [], boards=True, ov=[('Recap', 0.15, None, 'Remember:|by card · by phone · in cash')])
