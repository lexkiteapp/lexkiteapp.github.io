LESSON = dict(id='cafe-could-i-get', cefr='A2', goal='Ordering politely', pattern='Could I get ___, please?', area='roleplay', out='cine-cafe-v4-latte.mp4')
l0 = line('c_hi', 0.05)
shot('enter', 'c14_entrance', 0.05 + l0['dur'] + 1.2, lambda n: rng(30, 30 + n), [], [('carlos', l0)],
     ov=[('Badge', 0.0, 3.0, 'A2 · Ordering politely'), ('Hook', 0.0, 1.9, 'Is “Give me…” polite?')])
l1 = line('a_giveme', 0.05)
shot('mistake', 'c05_ots_ama_talk_a', 0.05 + l1['dur'] + 1.4, lambda n: rng(0, n), [('c05_ots_ama_talk_a', 'ama', [l1])], [('ama', l1)],
     ov=[('Card', 0.05 + l1['dur'] + 0.15, None, '✗|“Give me…” = an order')])
l2 = line('c_order', 0.1)
shot('why', 'c06_ots_ama_talk_b', 0.1 + l2['dur'] + 0.35, lambda n: list(range(120, 120 - n, -1)), [('c06_ots_ama_talk_b', 'ama', [])], [('carlos', l2)])
shot('oops', 'c07_ots_ama_react', 1.1, lambda n: rng(24, 24 + n), [], [])
l3 = line('c_try', 0.1)
shot('fix', 'c05_ots_ama_talk_a', 0.1 + l3['dur'] + 0.35, lambda n: list(range(120, 120 - n, -1)), [('c05_ots_ama_talk_a', 'ama', [])], [('carlos', l3)])
l4 = line('a_could', 0.08)
shot('repeat', 'c06_ots_ama_talk_b', 0.08 + l4['dur'] + 1.3, lambda n: rng(0, n), [('c06_ots_ama_talk_b', 'ama', [l4])], [('ama', l4)],
     ov=[('Card', 0.08 + l4['dur'] + 0.12, None, '✓|Could I get …, please?')])
l5 = line('a_muffin', 0.5); l6 = line('a_bill', 0.5 + l5['dur'] + 0.4)
shot('pattern', 'c10_ama_mcu_talk', l6['at'] + l6['dur'] + 0.4, lambda n: rng(0, n), [('c10_ama_mcu_talk', 'ama', [l5, l6])], [('ama', l5), ('ama', l6)],
     ov=[('Pattern', 0.15, None, 'Could I get ___, please?|')])
l7 = line('a_tea', 2.5)
shot('yourturn', 'c10_ama_mcu_talk', l7['at'] + l7['dur'] + 0.45, lambda n: list(range(120, 120 - n, -1)), [('c10_ama_mcu_talk', 'ama', [l7])], [('ama', l7)],
     ov=[('Prompt', 0.1, l7['at'] - 0.15, 'Your turn!|Ask for a tea.')])
l8 = line('a_thanks', 2.35)
shot('insert', 'c15_insert_handover', 3.4, lambda n: rng(0, n), [], [('ama', l8)])
shot('nod', 'c08_ots_carlos_react', 1.9, lambda n: rng(6, 6 + n), [], [], boards=True, ov=[('Recap', 0.15, None, 'Remember:|Could I get ___, please?')])
