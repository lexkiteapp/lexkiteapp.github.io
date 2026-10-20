LESSON = dict(id='cafe-for-here-or-to-go', cefr='A2', goal='Answering “For here or to go?”', pattern='For here, please. / To go, please.', area='roleplay', out='cine-cafe-forhere.mp4')
l0 = line('c_hi', 0.05)
shot('enter', 'c14_entrance', 0.05 + l0['dur'] + 0.9, lambda n: rng(30, 30 + n), [], [('carlos', l0)],
     ov=[('Badge', 0.0, 3.0, 'A2 · For here or to go?'), ('Hook', 0.0, 1.9, 'What does “to go” mean?')])
l1 = line('a_latte', 0.05)
shot('order', 'c05_ots_ama_talk_a', 0.05 + l1['dur'] + 0.35, lambda n: rng(0, n), [('c05_ots_ama_talk_a', 'ama', [l1])], [('ama', l1)])
l2 = line('c_forhere', 0.1)
shot('question', 'c06_ots_ama_talk_b', 0.1 + l2['dur'] + 0.4, lambda n: list(range(120, 120 - n, -1)), [('c06_ots_ama_talk_b', 'ama', [])], [('carlos', l2)])
l3 = line('a_forhere', 0.08); l3b = line('c_sure', 0.08 + l3['dur'] + 0.3)
shot('answer', 'c06_ots_ama_talk_b', l3b['at'] + l3b['dur'] + 0.35, lambda n: rng(0, n), [('c06_ots_ama_talk_b', 'ama', [l3])], [('ama', l3), ('carlos', l3b)])
shot('meaning', 'c10_ama_mcu_talk', 3.2, lambda n: rng(0, n), [('c10_ama_mcu_talk', 'ama', [])], [],
     ov=[('Pattern', 0.1, 1.55, 'For here = drink it here.|'), ('Pattern', 1.6, None, 'For here = drink it here.|To go = take it with you.')])
l4 = line('a_togo', 2.5)
shot('yourturn', 'c10_ama_mcu_talk', l4['at'] + l4['dur'] + 0.45, lambda n: list(range(120, 120 - n, -1)), [('c10_ama_mcu_talk', 'ama', [l4])], [('ama', l4)],
     ov=[('Prompt', 0.1, l4['at'] - 0.15, 'Your turn!|You want to take it away.')])
l5 = line('a_thanks', 2.35)
shot('insert', 'c15_insert_handover', 3.4, lambda n: rng(0, n), [], [('ama', l5)])
shot('nod', 'c08_ots_carlos_react', 1.9, lambda n: rng(6, 6 + n), [], [], boards=True, ov=[('Recap', 0.15, None, 'For here or to go?|For here / To go, please.')])
