#!/usr/bin/env python3
"""Automatic English-only cine lesson generator (docs/VIDEO-SYSTEM-PLAN.md queue items 3-4). 0 Claude tokens / 0 credits per clip.

  python3 scripts/cine/gen_lessons.py --batch 20            # pick 20 unused learning points across the 4 scenes, write specs
  python3 scripts/cine/gen_lessons.py --coverage            # rebuild content/video/cine/coverage.json only
  python3 scripts/cine/gen_lessons.py --mark-rendered <run> id1,id2   # after a CI run with qa5 ALL PASS

English correctness: every spoken/on-screen sentence comes from the curated PATTERN BANK below (slot patterns x scene items,
hand-checked) or from web/js/grammar/l1/*.js wrong/right pairs filtered to the scene; nothing is free-generated.
Gates (a spec is dropped if one fails): <= 12 words per voice line, <= 48 chars (keeps <= 15 cps after lesson5's tempo floor),
hook <= 5 words, recap <= 7 words (2.5 s reading rule), Choice/Ladder texts fit, estimated total 18.6-23.4 s (qa5 window 18-24),
mistake pairs differ by exactly one word, gap word = last content word (sentence-final -> clean silence for qa5),
clips/frames only from the scene's usable ranges (SCENES[...]['range'], from bank.json), CEFR tag from content/wordlists,
no duplicate learning point (ledger content/video/cine/used.json keyed by the normalised point, seeded with hand-made lessons).
Output: content/video/cine/auto/<scene>/<id>.py (+ _auto_<scene>.py adapter, lines.json voice batch) and <id>.en.json locale.
CI (cine-render, lessons=auto) copies them into the footage scene dir, synthesises missing lines (Kokoro + Rhubarb, auto_voice.py), renders, qa5.
"""
import json, os, re, sys, glob, hashlib, argparse
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUTO = f'{ROOT}/content/video/cine/auto'; LEDGER = f'{ROOT}/content/video/cine/used.json'; COVER = f'{ROOT}/content/video/cine/coverage.json'
ECO = {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}

# ------------------------------------------------------------------ scenes: clip roles, usable frame ranges (bank.json), text positions measured from face boxes
SCENES = {
 'hotel': dict(B='daniel', name='Hotel', pov="POV: you're checking in", clips=dict(MASTER='h01_master_listen', B1='h02_ots_dan_talk_a', B2='h03_ots_dan_talk_b', BREACT='h09_dan_react',
      A1='h04_ots_ama_talk_a', A2='h05_ots_ama_talk_b', MCU='h06_ama_mcu_talk', OOPS='h07_ama_oops', THX='h08_ama_thanks'),
   range=dict(A1=(0, 36), A2=(0, 38), THX=(0, 38)), prop=('h11_bell', 46, 1.6, 'ding.wav', 17),
   who=dict(B1='B', B2='B', BREACT='B', A1='ama', A2='ama', MCU='ama', OOPS='ama', THX='ama'),
   vhook_box=(60, 236, 630, 556), avoid=[[232, 580, 506, 873], [143, 835, 601, 1920], [656, 282, 970, 620], [544, 582, 1077, 1920]], ladder_y=1072, hook_y=1080, choice_y=1040, ring=('BREACT', 830)),
 'restaurant': dict(B='priya', name='Restaurant', pov="POV: you're ordering dinner", clips=dict(MASTER='r21_master_listen', B1='r22_ots_priya_talk', B2='r03_ots_priya_talk_b', BREACT='r09_priya_react',
      A1='r24_ots_ama_talk', A2='r24_ots_ama_talk', MCU='r06_ama_mcu_talk', OOPS='r27_ama_react', THX='r28_ama_thanks'),
   range=dict(MASTER=(0, 120), B1=(0, 75), B2=(0, 46), BREACT=(0, 89), A1=(12, 86), MCU=(52, 89), OOPS=(20, 48), THX=(52, 100)), prop=('r11_bill', 2, 1.6, 'slide.wav', 4),
   who=dict(B1='B', B2='B', BREACT='B', A1='ama', MCU='ama', OOPS='ama', THX='ama'),
   ladder_clip='A1', vhook_box=(60, 236, 940, 631), avoid=[[108, 862, 422, 1227], [0, 1189, 535, 1920], [659, 655, 984, 964], [544, 933, 1080, 1920]], ladder_y=1130, hook_y=1130, choice_y=1000, ring=('B1', 830), ring_tpl='MASTER'),  # 22/10: OTS/react shots have no free zone for Ring next to Choice/Ladder -> ring hold on the wide master (top band free)
 'airport': dict(B='mei', name='Airport', pov="POV: you're at check-in", clips=dict(MASTER='b01_master_talk', B1='a01_ots_mei_talk', B2='a03_ots_mei_talk_b', BREACT='a08_mei_pass',
      A1='a02_ots_ama_talk', A2='a04_ots_ama_talk_b', MCU='a07_ama_mcu_talk', OOPS='a06_ama_react', THX='a09_ama_thanks'),
   range=dict(OOPS=(0, 50)), prop=('i01_passport', 0, 1.6, None, 0),
   who=dict(B1='B', B2='B', BREACT='B', A1='ama', A2='ama', MCU='ama', OOPS='ama', THX='ama'),
   vhook_box=(60, 236, 640, 487), avoid=[[214, 511, 540, 816], [111, 764, 650, 1920], [666, 263, 990, 560], [556, 516, 1080, 1920]], ladder_y=1072, hook_y=1080, choice_y=1040, ring=('B2', 720)),
 'cafe': dict(B='carlos', name='Café', pov=None, clips=dict(MASTER='c01_master_talk_a', B1='c03_ots_carlos_talk_a', B2='c04_ots_carlos_talk_b', BREACT='c08_ots_carlos_react',
      A1='c05_ots_ama_talk_a', A2='c06_ots_ama_talk_b', MCU='c10_ama_mcu_talk', OOPS='c07_ots_ama_react', THX='c06_ots_ama_talk_b'),
   range=dict(BREACT=(0, 72), OOPS=(19, 77)), prop=('c15_insert_handover', 0, 1.6, None, 0),
   who=dict(B1='B', B2='B', BREACT='B', A1='ama', A2='ama', MCU='ama', OOPS='ama', THX='ama'),
   ladder_clip='A1', vhook_box=(60, 236, 520, 442), avoid=[[83, 479, 478, 883], [0, 810, 612, 1920], [550, 181, 792, 504], [470, 466, 872, 1920]], ladder_y=250, hook_y=250, choice_y=1040, ring=('BREACT', 600)),
}
REPLY = {'hotel': 'Of course. No problem at all.', 'restaurant': "Of course. I'll bring it now.", 'airport': 'Sure, let me check that for you.', 'cafe': 'Sure! Coming right up.'}

# ------------------------------------------------------------------ PATTERN BANK (curated; slot fillers = things that exist in the scene)
REQ = {   # Could I have ___? (speak-along / ladder / gap). gap word = last word of the item
 'cafe': ['a latte', 'a cappuccino', 'a hot chocolate', 'a croissant', 'a receipt', 'a paper cup', 'some sugar'],
 'hotel': ['an extra towel', 'a wake-up call', 'another pillow', 'a city map', 'a spare key', 'a quiet room'],
 'airport': ['a window seat', 'an aisle seat', 'a luggage tag', 'a printed ticket', 'a seat near the front'],
 'restaurant': ['the menu', 'some water', 'some more bread', 'a table by the window', 'the dessert menu'],
}
CHOOSE = {   # B line with one key detail + 3 options (listen & choose); key word appears verbatim in the line and in the answer option
 'cafe': [('How much is the latte?', "Your latte is ready. That's four fifty.", ['Four fifteen', 'Four fifty', 'Five fifty'], 'B', 'fifty', 'price', 'The latte is four fifty.'),
          ('When does the café close?', 'Sorry, we close at nine o\'clock tonight.', ['At five', 'At nine', 'At ten'], 'B', 'nine', 'time', 'The café closes at nine.')],
 'hotel': [('Which floor is the room on?', "You're on the fifth floor, near the elevator.", ['The third', 'The fourth', 'The fifth'], 'C', 'fifth', 'floor', 'My room is on the fifth floor.'),
           ('When does the pool close?', 'The pool is open from seven until nine.', ['At seven', 'At nine', 'At eleven'], 'B', 'nine', 'time', 'The pool closes at nine.')],
 'airport': [('Which gate?', 'Boarding starts soon at gate fourteen.', ['Gate four', 'Gate fourteen', 'Gate forty'], 'B', 'fourteen', 'gate', 'Boarding is at gate fourteen.'),
             ('How heavy is the bag?', "Your bag is fifty pounds, so that's fine.", ['Fifteen pounds', 'Fifty pounds', 'Sixty pounds'], 'B', 'fifty', 'weight', 'My bag is fifty pounds.')],
 'restaurant': [("What's the soup today?", "Today's soup is tomato, and it's very good.", ['Potato', 'Tomato', 'Onion'], 'B', 'tomato', 'soup', "Today's soup is tomato."),
                ('How long is the wait?', 'Your table will be ready in fifteen minutes.', ['Five minutes', 'Fifteen minutes', 'Fifty minutes'], 'B', 'fifteen', 'wait', 'The wait is fifteen minutes.')],
}
MISTAKE = {   # (B cue line, wrong, right, why-point) - exactly one word differs (qa5 'mistake' rule); used by spot-the-mistake / mistake->fix
 'cafe': [('What can I get you?', 'Can I have two cookie, please?', 'Can I have two cookies, please?', 'plural after two'),
          ('Anything else for you?', 'How much is it cost?', 'How much does it cost?', 'how much does it cost'),
          ('What can I get you today?', "I'd like a coffee with milks.", "I'd like a coffee with milk.", 'milk is uncountable')],
 'hotel': [('Good evening. How can I help?', "The air conditioning doesn't working.", "The air conditioning isn't working.", "isn't working"),
           ('Hello. Can I help you?', 'What time is breakfast finish?', 'What time does breakfast finish?', 'what time does'),
           ('Is everything okay with the room?', 'Can I have two towel, please?', 'Can I have two towels, please?', 'plural towels')],
 'airport': [('Is this your only bag?', 'Can I take this bag in board?', 'Can I take this bag on board?', 'on board'),
             ('How many bags are you checking?', 'I have two luggages.', 'I have two bags.', 'luggage is uncountable'),
             ('Do you have a seat preference?', 'Can I sit next of the window?', 'Can I sit next to the window?', 'next to')],
 'restaurant': [('Hi! How many people?', 'A table for two persons, please.', 'A table for two people, please.', 'two people'),
                ('Would you like to pay together?', 'Can we pay separate, please?', 'Can we pay separately, please?', 'pay separately'),
                ('Good evening! Welcome.', 'Could I look the menu, please?', 'Could I see the menu, please?', 'see the menu')],
}
QUIZ = {   # A/B: question, option A, option B, answer, spoken model line (Ama), point
 'cafe': [('Which sounds polite?', 'Give me a latte.', 'Could I get a latte?', 'B', 'Could I get a latte, please?', 'polite: could I get')],
 'hotel': [('Which sounds polite?', 'I need towels. Now.', 'Could I get more towels?', 'B', 'Could I get some more towels, please?', 'polite: could I get more')],
 'airport': [('Which is correct?', "I'm flying to London.", "I'm flying at London.", 'A', "I'm flying to London today.", 'fly to a city')],
 'restaurant': [('Which sounds polite?', 'Bill!', 'Could we get the bill?', 'B', 'Could we get the bill, please?', 'polite: could we get the bill')],
}
POV = {   # B asks the viewer; one possible answer (<= 8 words, >= 22 chars so the reveal holds >= 1.8 s)
 'hotel': [('How many nights are you staying?', "I'm staying for three nights.", 'staying for nights'), ('How would you like to pay today?', "I'd like to pay by card.", 'pay by card')],
 'airport': [('Do you have any bags to check?', 'Yes, I have one suitcase.', 'bags to check'), ('Did you pack this bag yourself?', 'Yes, I packed it myself.', 'packed it myself')],
 'restaurant': [('Are you ready to order?', "Yes, I'd like the soup, please.", 'ready to order'), ('How is everything?', "It's delicious, thank you!", 'how is everything')],
 'cafe': [],
}
SPEAK = {   # speak-along model lines (<= 7 words)
 'cafe': [('Could I get the Wi-Fi password?', "Sure, it's on your receipt."), ('Can I get this to go?', 'Of course! Here you go.')],
 'hotel': [('Could you call a taxi for me?', "Of course. It'll be here soon."), ('Is there a pharmacy near here?', "Yes, there's one on the corner.")],
 'airport': [('Is this the line for check-in?', "Yes, it is. You're in the right place."), ('Where can I get a luggage cart?', 'There are carts by the entrance.')],
 'restaurant': [('Could we see the dessert menu?', 'Of course. Here you are.'), ('Is the tip included in the check?', "No, it isn't. It's up to you.")],
}
SERIES_D = {   # mini dialogue: B question, Ama answer (key line), B reply
 'cafe': [('Would you like anything to eat?', 'Yes, a croissant, please.', 'Great choice. Coming right up.')],
 'hotel': [('Is this your first time in London?', "Yes, it's my first visit.", 'Welcome! Enjoy your stay.')],
 'airport': [('Is this your final destination?', 'No, I have a connecting flight.', 'Okay. Your bag goes all the way.')],
 'restaurant': [('Can I get you anything to drink?', 'Just water for now, thanks.', "Sure, I'll be right back.")],
}
# ------------------------------------------------------------------ PATTERN BANK lô 2 (22/10, curated American English; categories: requests, questions, polite softeners,
# prepositions, tenses in context, numbers/prices/time, complaints, small talk, follow-up questions, common L1 mistakes)
REQ['cafe'] += ['an iced coffee', 'a blueberry muffin', 'a bottle of water', 'a refill', 'a napkin', 'a straw']
REQ['hotel'] += ['an iron', 'a room with a view', 'a toothbrush', 'an extra blanket', 'a hair dryer']
REQ['airport'] += ['a boarding pass', 'a seat with more legroom', 'a vegetarian meal', 'an earlier flight']
REQ['restaurant'] += ['the check', 'a to-go box', 'a high chair', 'some napkins', 'another fork']
CHOOSE['cafe'] += [("What's the total?", 'That comes to six dollars and eighty cents.', ['Six eighteen', 'Six eighty', 'Eight sixty'], 'B', 'eighty', 'total', 'The total is six eighty.'),
                   ('What size is the coffee?', 'Your large iced coffee is ready over there.', ['Small', 'Medium', 'Large'], 'C', 'large', 'size', 'I ordered a large coffee.'),
                   ("What's the name on the cup?", 'I have a latte here for Sam. Is that you?', ['Pam', 'Sam', 'Dan'], 'B', 'sam', 'name', 'The latte is for Sam.'),
                   ('How long is the wait?', 'Your drinks will be ready in about five minutes.', ['Five minutes', 'Nine minutes', 'Fifteen minutes'], 'A', 'five', 'wait', 'The wait is five minutes.')]
CHOOSE['airport'] += [('What time is boarding?', 'Boarding starts at ten forty. Please be early.', ['Ten fourteen', 'Ten forty', 'Eleven forty'], 'B', 'forty', 'time', 'Boarding starts at ten forty.'),
                      ('Which seat?', "You're in seat twelve A, by the window.", ['Two A', 'Twelve A', 'Twenty A'], 'B', 'twelve', 'seat', 'My seat is twelve A.'),
                      ('How much is the bag fee?', 'The fee for the extra bag is forty dollars.', ['Fourteen dollars', 'Forty dollars', 'Forty-five dollars'], 'B', 'forty', 'fee', 'The bag fee is forty dollars.'),
                      ('How late is the flight?', 'Your flight is delayed by about thirty minutes.', ['Thirteen minutes', 'Thirty minutes', 'Three hours'], 'B', 'thirty', 'delay', 'The flight is thirty minutes late.')]
CHOOSE['hotel'] += [("What's the room number?", "You're in room four twelve, on the fourth floor.", ['Four twelve', 'Four twenty', 'Four oh two'], 'A', 'twelve', 'room', 'My room is four twelve.'),
                    ('When is checkout?', 'Checkout is at eleven, but we can be flexible.', ['At ten', 'At eleven', 'At noon'], 'B', 'eleven', 'checkout', 'Checkout is at eleven.'),
                    ('How much is parking?', 'Parking is twenty dollars per night here.', ['Twelve dollars', 'Twenty dollars', 'Thirty dollars'], 'B', 'twenty', 'price', 'Parking is twenty dollars a night.'),
                    ('When does breakfast start?', 'Breakfast is served from six thirty until ten.', ['Six thirteen', 'Six thirty', 'Seven thirty'], 'C', 'thirty', 'start time', 'Breakfast starts at six thirty.')]
CHOOSE['restaurant'] += [('How much is the special?', "Today's special is eighteen dollars, with salad.", ['Eight dollars', 'Eighteen dollars', 'Eighty dollars'], 'B', 'eighteen', 'price', 'The special is eighteen dollars.'),
                         ("What's the fish today?", "Tonight's fish is salmon, grilled with lemon.", ['Tuna', 'Salmon', 'Cod'], 'B', 'salmon', 'fish', "Tonight's fish is salmon."),
                         ('When does the kitchen close?', 'The kitchen closes at ten thirty tonight.', ['Ten', 'Ten thirteen', 'Ten thirty'], 'C', 'thirty', 'closing time', 'The kitchen closes at ten thirty.'),
                         ("What's the total?", 'Your total is forty dollars and fifty cents.', ['Fourteen fifty', 'Forty fifty', 'Forty-five'], 'B', 'forty', 'total', 'The total is forty fifty.')]
MISTAKE['cafe'] += [('How was your coffee?', 'It was very delicious, thanks.', 'It was really delicious, thanks.', 'really delicious not very'),
                    ('Where would you like to sit?', 'Can we sit in the window, please?', 'Can we sit by the window, please?', 'sit by the window'),
                    ('Did you order already?', 'Yes, I order a latte.', 'Yes, I ordered a latte.', 'past tense ordered'),
                    ('Do you have a reward card?', "No, I don't have it.", "No, I don't have one.", "don't have one")]
MISTAKE['airport'] += [('How was your stay?', 'Great. I arrived to Boston on Monday.', 'Great. I arrived in Boston on Monday.', 'arrive in a city'),
                       ('Any liquids in your bag?', "No, I don't have some liquids.", "No, I don't have any liquids.", 'any in negatives'),
                       ('When is your return flight?', "I'm coming back in Sunday.", "I'm coming back on Sunday.", 'on plus a day')]
MISTAKE['hotel'] += [('Is everything okay?', "The shower don't have hot water.", "The shower doesn't have hot water.", "it doesn't have"),
                     ('How was your night?', "I didn't sleep good.", "I didn't sleep well.", 'sleep well'),
                     ('How long are you staying?', "I'm staying during three nights.", "I'm staying for three nights.", 'for plus a duration'),
                     ('Can I help you?', 'I left my key into the room.', 'I left my key in the room.', 'left it in the room'),
                     ('Is the room okay?', "It's very noise at night.", "It's very noisy at night.", 'noisy adjective')]
MISTAKE['restaurant'] += [('Anything to drink?', "I'll have a orange juice.", "I'll have an orange juice.", 'an before a vowel'),
                          ('Are you still working on that?', "No, I'm finish, thank you.", "No, I'm finished, thank you.", "i'm finished"),
                          ('Can I get you anything else?', 'Can you bring me other napkin?', 'Can you bring me another napkin?', 'another plus singular'),
                          ('Is everything okay here?', 'Excuse me, this fork is dirt.', 'Excuse me, this fork is dirty.', 'dirty adjective')]
QUIZ['cafe'] += [('Which sounds polite?', 'I want a refill.', 'Could I get a refill?', 'B', 'Could I get a refill, please?', 'polite: could I get a refill'),
                 ('Which is correct?', "I'm here since nine.", "I've been here since nine.", 'B', "I've been here since nine.", 'present perfect since'),
                 ('Which is correct?', 'Can I sit here?', 'Can I sit at here?', 'A', 'Excuse me, can I sit here?', 'sit here no preposition')]
QUIZ['airport'] += [('Which sounds polite?', 'Change my seat.', 'Could I change my seat?', 'B', 'Could I change my seat, please?', 'polite: could I change my seat'),
                    ('Which is correct?', 'My flight leaves at six.', 'My flight leaves on six.', 'A', 'My flight leaves at six.', 'at plus clock time'),
                    ('Which is correct?', 'I lost my ticket.', 'I losted my ticket.', 'A', 'Excuse me, I lost my ticket.', 'past tense lost')]
QUIZ['hotel'] += [('Which sounds polite?', 'Fix the shower.', 'Could you fix the shower?', 'B', 'Could you fix the shower, please?', 'polite: could you fix'),
                  ('Which is correct?', 'My room is on floor five.', 'My room is in floor five.', 'A', 'My room is on the fifth floor.', 'on a floor'),
                  ('Which sounds polite?', 'Give me a new room.', 'Could I change rooms?', 'B', 'Could I change rooms, please?', 'polite: change rooms')]
QUIZ['restaurant'] += [('Which sounds polite?', 'Bring me water.', 'Could I get some water?', 'B', 'Could I get some water, please?', 'polite: could I get some water'),
                       ('Which is correct?', 'Can we get the check?', 'Can we get the account?', 'A', 'Could we get the check, please?', 'the check not the account'),
                       ('Which is correct?', "I'd like my steak medium.", "I'd like my steak middle.", 'A', "I'd like my steak medium, please.", 'steak medium')]
POV['airport'] += [('Where are you flying today?', "I'm flying to Denver today.", 'where are you flying'), ('Would you like a window or aisle seat?', 'An aisle seat would be great.', 'window or aisle'),
                   ("What's the purpose of your trip?", "I'm here on vacation with my family.", 'purpose of your trip')]
POV['hotel'] += [('Can I see your ID, please?', "Sure, here's my passport.", 'see your id'), ('What brings you to town?', "I'm here for a conference.", 'what brings you to town'),
                 ('Do you need help with your bags?', 'No, thanks. I can manage.', 'help with your bags')]
POV['restaurant'] += [('Do you have a reservation?', 'Yes, a table for two at seven.', 'reservation table for two'), ('How would you like your steak?', 'Medium rare, please. Thank you.', 'how would you like your steak'),
                      ('Would you like anything for dessert?', "No, thanks. I'm really full.", 'anything for dessert')]
SPEAK['cafe'] += [('Is this seat taken?', 'No, go ahead.'), ("Sorry, this isn't what I ordered.", 'Oh, sorry! Let me fix that.'), ('Do you have anything without sugar?', 'Yes, try our iced tea.')]
SPEAK['airport'] += [('My flight was canceled. What now?', 'Let me rebook you right away.'), ('Where do I pick up my bags?', 'Baggage claim is downstairs.'), ('Excuse me, my bag is missing.', "I'm sorry. Let's file a report.")]
SPEAK['hotel'] += [("There's no hot water in my room.", "I'm so sorry. I'll send someone up."), ('Can I leave my bags here?', "Of course. I'll keep them safe."), ('Is there a gym in the hotel?', "Yes, it's on the second floor.")]
SPEAK['restaurant'] += [('Excuse me, we ordered a while ago.', "I'm so sorry. I'll check now."), ('What do you recommend?', 'The pasta is really popular.'), ('Could we split the check?', 'Sure, no problem.')]
SERIES_D['cafe'] += [('Is this for here or to go?', 'To go, please.', 'Okay. Coming right up.'), ('Did you have a good weekend?', 'Yes, it was great. And you?', 'Pretty good, thanks!'),
                     ('Would you like room for milk?', 'Yes, just a little, please.', 'You got it.')]
SERIES_D['airport'] += [('Where are you headed today?', 'To Seattle, for a work trip.', 'Nice. Have a safe flight!'), ('Is anyone traveling with you?', 'Yes, my sister is with me.', 'Great. I can seat you together.')]
SERIES_D['hotel'] += [('How was your flight?', 'Long, but it was okay. Thanks!', 'Glad you made it safely.'), ('Did you enjoy your stay?', 'Yes, we loved it. Thank you!', 'Come back anytime!')]
SERIES_D['restaurant'] += [('Is this your first time here?', 'Yes, a friend recommended it.', 'Great! You picked a good night.'), ('How is everything tasting?', 'Delicious, thanks. Can I get more bread?', 'Of course. Coming right up.')]
_OF = {}
def opt_fits(o, w=640):   # Choice option at the 52 px card minimum (CARD_MIN_FS) must fit one row: card 880 - margins/letter chip/tick
    from PIL import ImageFont, Image, ImageDraw
    f = _OF.setdefault(52, ImageFont.truetype(f'{ROOT}/brand/social/src/fonts/BeVietnamPro-ExtraBold.ttf', 52)); return ImageDraw.Draw(Image.new('L', (8, 8))).textlength(o, font=f) <= w
GAP_ON = True   # 22/10: gap = CARD (sentence with the blank up 1.6 s before the line = pre-gap pause), no caption on the gap/full lines (cps rule n/a), slow 0.85x karaoke re-read; was off: 21/10 CI lô 1: gap ở TỪ CUỐI câu trượt qa5 (cps 19 vì đoạn nói ngắn + thở 1,06 s sau câu) -> cần gap giữa câu cắt ở chỗ khép (như h_a_late_gap); tắt tới khi sửa
SCENE_KW = {'cafe': r'coffee|tea|latte|cake|cookie|milk|sugar|cup', 'hotel': r'hotel|room|key|towel|breakfast', 'airport': r'flight|bag|passport|seat|ticket', 'restaurant': r'menu|table|bill|soup|water'}

# ------------------------------------------------------------------ helpers / gates
def norm(s): return re.sub(r'\s+', ' ', re.sub(r"[^a-z0-9' ]", ' ', s.lower())).strip()
def words(s): return re.findall(r"[A-Za-z0-9']+", s)
CEFR_W = {}
try:
    for w, v in json.load(open(f'{ROOT}/content/wordlists/cefr-oxford.json')).items(): CEFR_W[w.lower()] = min(v.values()) if isinstance(v, dict) else v
except Exception: pass
LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
def cefr(texts, floor='A2'):
    lv = LV.index(floor)
    for t in texts:
        for w in words(t.lower()):
            if w in CEFR_W and CEFR_W[w] in LV: lv = max(lv, LV.index(CEFR_W[w]))
    return LV[lv]
def est(t): return max(0.15 + len(t) / 19.5, len(t) / 14.8 - 0.38)   # Kokoro 0.9x measured ~20 chars/s (batch 1); lesson5 slows to <= 14.8 cps. Rough gate only: the adapter re-fits on the real wav durations
def talk_d(t, tempo=1.0): return 0.07 + est(t) / tempo + 0.45
class Gate(Exception): pass
def gate_line(t):
    if len(words(t)) > 12: raise Gate(f'line > 12 words: {t}')
    if len(t) > 48: raise Gate(f'line > 48 chars: {t}')
def gate_hook(h):
    if len(words(h.split('|')[0])) > 5: raise Gate(f'hook > 5 words: {h}')
def gate_recap(r):
    if len(words(r)) > 7: raise Gate(f'recap > 7 words: {r}')
def one_diff(a, b):
    x, y = a.split(' '), b.split(' ')
    if len(x) != len(y): return None
    d = [i for i, (p, q) in enumerate(zip(x, y)) if p != q]
    return d[0] if len(d) == 1 else None

def mine_l1(scene):   # wrong/right pairs from the web's L1 mistake notes that fit this scene (one-word diffs only)
    out = set()
    for f in glob.glob(f'{ROOT}/web/js/grammar/l1/*.js'):
        t = open(f, encoding='utf-8').read()
        for m in re.finditer(r"\[\s*'([^'\n]{5,48})',\s*'([^'\n]{5,48})',", t):
            a, b = m.group(1), m.group(2)
            if re.search(r'\b(' + SCENE_KW[scene] + r')s?\b', a.lower()) and one_diff(a, b) is not None and len(words(a)) <= 8 and re.match(r"(I|I'm|I'd|We|Can|Could|Do|Does|Is|Are|How|What|Where)\b", a): out.add((a, b))   # customer's own line only (lô 2: 'She like coffee.' after 'What can I get you?')
    return sorted(out)

# ------------------------------------------------------------------ ledger
def load_ledger():
    L = json.load(open(LEDGER)) if os.path.exists(LEDGER) else {'version': 1, 'points': {}}
    seed = {   # hand-made lessons (footage repo lessons/*.py) - their points are taken
        'is breakfast included': 'hotel_tpl_mistake', 'late checkout': 'hotel_tpl_gap', 'polite neutral casual late checkout': 'hotel_tpl_ladder',
        'breakfast ends at ten': 'hotel_tpl_choose', 'i have a reservation under': 'hotel_tpl_pov', 'pay in cash': 'cafe pay', "i'd like a latte": 'cafe idlike',
        'window seat': 'airport_checkin', "i'm allergic to nuts": 'restaurant_3'}
    for k, v in seed.items(): L['points'].setdefault(norm(k), dict(id=v, scene='manual', template='manual', area='', cefr='A2', status='manual'))
    return L

# ------------------------------------------------------------------ candidates (scene, template, point, builder-args)
def candidates(scene):
    C = []; S = SCENES[scene]
    for it in REQ[scene]:
        base = it[0].upper() + it[1:]
        C.append(('ladder', 'phrases', f'polite request {it}', dict(item=it, lad=[f'Could I possibly have {it}?', f'Can I have {it}, please?', f'{base}, please.'])))
        last = it.split(' ')[-1]
        if GAP_ON and last not in ('a', 'an', 'the', 'some'):
            C.append(('gap', 'vocab-review', f'word {last}', dict(item=it, line=f'Could I have {it}, please?'.replace(', please?', '?'), word=last)))
        C.append(('speak', 'pronunciation', f'could i get {it}', dict(line=f'Could I get {it}, please?')))
    for q, line, opts, ans, key, thing, recap in CHOOSE[scene]:
        C.append(('choose', 'listening', f'listen {thing} {key}', dict(q=q, line=line, opts=opts, ans=ans, key=key, thing=thing, recap=recap)))
    for k, (cue, w, r, why) in enumerate(MISTAKE[scene]):
        C.append(('mistake' if k % 2 == 0 else 'fix', 'grammar-check' if k % 2 == 0 else 'grammar', why, dict(cue=cue, wrong=w, right=r)))
    for a, b in mine_l1(scene):
        C.append(('mistake', 'grammar-check', f'l1 {b}', dict(cue={'cafe': 'What can I get you?', 'hotel': 'How can I help?', 'airport': 'How can I help?', 'restaurant': 'How can I help?'}[scene], wrong=a, right=b)))
    for q, a, b, ans, line, pt in QUIZ[scene]:
        C.append(('quiz', 'paraphrase' if 'polite' in pt else 'word-usage', pt, dict(q=q, a=a, b=b, ans=ans, line=line)))
    if S['pov']:
        for q, a, pt in POV[scene]: C.append(('pov', 'roleplay', pt, dict(q=q, a=a)))
    for l in SPEAK[scene]:
        l, rep = l if isinstance(l, tuple) else (l, None); C.append(('speak', 'speaking', l, dict(line=l, rep=rep)))
    for q, a, rep in SERIES_D[scene]: C.append(('series', 'roleplay', a, dict(q=q, a=a, rep=rep)))
    return C

# ------------------------------------------------------------------ assembler: every template = v3 viral beats (hook -> setup -> challenge + 3 s ring -> reveal -> 0.85x karaoke -> recap -> loop)
class Lesson:
    def __init__(s, scene, lid):
        s.scene, s.lid, s.lines, s.code, s.t, s.head = scene, lid, {}, [], 0.0, []
        s.B = SCENES[scene]['B']; s.topt = s.tpad = 0.0
    def L(s, who, text):   # register a voice line (id = hash of speaker + text, shared across lessons)
        gate_line(text); w = 'ama' if who == 'A' else s.B
        k = f'g{s.scene[0]}_' + hashlib.sha1(f'{w}|{text}'.encode()).hexdigest()[:8]; s.lines[k] = dict(id=k, who=w, text=text); return k
    def gapL(s, src, text, word):
        k = s.lines[src]['id'] + '_gap'; s.lines[k] = dict(id=k, who='ama', text=text, derived='auto-gap', gap=dict(src=src, word=word, prefix=text[:text.rstrip('?.!').rfind(' ')])); return k
    def _acc(s, d, opt, pad):
        if opt: s.topt += d
        elif pad: s.tpad += d
        else: s.t += d
    def _fl(s, opt, pad): return (', opt=True' if opt else '') + (', pad=True' if pad else '')
    def talk(s, sid, clip, who, k, tempo=None, ov=None, opt=False, pad=False):   # opt: beat the render-time fitter may drop; pad: beat it adds when short
        w = "'ama'" if who == 'A' else 'BW'; extra = f', tempo={tempo}' if tempo else ''
        s.code.append(f"talk({sid!r}, {clip}, {w}, {k!r}{extra}{', ov=' + ov if ov else ''}{s._fl(opt, pad)})"); s._acc(talk_d(s.lines[k]['text'], tempo or 1.0), opt, pad)
    def hold(s, sid, clip, d, ov=None, opt=False, pad=False): s.code.append(f"hold({sid!r}, {clip}, {d}{', ov=' + ov if ov else ''}{s._fl(opt, pad)})"); s._acc(d, opt, pad)
    def prop(s): s.code.append('prop(pad=True)'); s.tpad += SCENES[s.scene]['prop'][2]
    def raw(s, c, d=0.0): s.code.append(c); s.t += d

HOOKS = {   # alternatives, first one that fits the scene's free wall box (VHOOK_BOX) at >= 84 px wins
 'mistake': ['Learners make *this* mistake|grimace', 'Spot the *mistake*|grimace', 'Find the *error*|grimace'],
 'fix': ['Never say *"{w}"*|grimace', 'Don\'t say *"{w}"*|grimace', '*"{w}"*? No!|grimace'],
 'choose': ['ONE listen. Catch the *{thing}?*|?', 'Catch the *{thing}?*|?', 'Hear the *{thing}?*|?'],
 'quiz': ['{q}'], 'gap': ['ONE word is *missing*|?', 'Missing *word?*|?'], 'ladder': ['3 ways. Which are *YOU?*|?', '3 ways to *ask*|?'],
 'pov': ['Mind goes *blank?*|grimace', 'Go *blank?*|grimace'], 'speak': ['Say it *with me*|?', 'Say *this*|?'], 'series': ['What does she *say next?*|?', 'She *says...?*|?', 'Her *reply?*|?']}
_FH = {}
def hook_fits(txt, box):   # same layout as lesson5 VHook: words + icon wrapped into box width - 20, line height 1.1 fs, fs 104 -> 84
    from PIL import ImageFont, Image, ImageDraw
    fp = f'{ROOT}/brand/social/src/fonts/BricolageGrotesque-ExtraBold.ttf'; dr = ImageDraw.Draw(Image.new('L', (8, 8))); en, ic = (txt.split('|') + [''])[:2]; cl = [w.strip('*') for w in en.split(' ')]
    for fs in range(104, 83, -4):
        fh = _FH.setdefault(fs, ImageFont.truetype(fp, fs)); sp = dr.textlength(' ', font=fh); wd = [dr.textlength(c, font=fh) for c in cl] + ([fs * 0.95] if ic else []); n, cur = 1, []
        if max(wd) > box[2] - box[0] - 20: continue
        for i in range(len(wd)):
            if cur and sum(wd[j] for j in cur + [i]) + sp * len(cur) > box[2] - box[0] - 20: n += 1; cur = []
            cur.append(i)
        if n * int(fs * 1.1) + 6 <= box[3] - box[1]: return True
    return False

def build(scene, tpl, area, point, a, n):
    S = SCENES[scene]; lid = f'auto_{scene}_{tpl}_{hashlib.sha1(norm(point).encode()).hexdigest()[:6]}'; X = Lesson(scene, lid); series = f"{S['name']} English #{n}"
    kw, recap, cefr_txt, pattern, goal = set(), '', [], '', ''
    hook_t = 1.85; X.t = hook_t; X.head.append('HOOK_KIND = %r' % ('pov' if tpl == 'pov' else 'question'))
    rc_clip, rc_y = S['ring']
    if tpl in ('mistake', 'fix'):
        cue, w, r = a['cue'], a['wrong'], a['right']; i = one_diff(w, r)
        if i is None: raise Gate('not a one-word mistake')
        kc, kw_, kr = X.L('B', cue), X.L('A', w), X.L('A', r); rw = r.split(' ')[i]; kw.add(norm(rw)); wrong_word = w.split(' ')[i]
        X.head += [f'STRIKE = ({wrong_word.strip(".,?!")!r}, {rw.strip(".,?!")!r})', f"QA = dict(template={tpl!r}, strike_line={kw_!r}, right_line={kr!r})",
                   f"WRONG = TEXT[{kw_!r}] + '||'", f"CAPSTYLE = {{'wrong': ('Strike', 0), 'right': ('Karaoke', {i}), 'slow': ('Karaoke', {i})}}"]
        hook = 'Learners make *this* mistake|grimace' if tpl == 'mistake' else f'Never say *"{wrong_word.strip(".,?!")}"*|grimace'
        rv = round(min(2.5, max(2.0, 0.5 + 0.28 * len(words(w)))), 2)
        X.prop(); X.talk('cue', 'B1', 'B', kc); X.talk('wrong', 'A1', 'A', kw_); X.hold('oops', 'OOPS', 1.0)
        X.hold('ring', 'BREACT', 1.5, "[('Ring', 0.0, 3.0, %r)]" % ('Comment the mistake 👇|' if tpl == 'mistake' else 'How would YOU fix it? Comment 👇|')); X.hold('ring_b', 'MASTER', 1.5)
        X.hold('reveal', 'BREACT', rv, "[('Strike', 0.0, None, WRONG, 2)]"); X.talk('right', 'MCU', 'A', kr, opt=True); X.talk('slow', 'MCU', 'A', kr, tempo=0.85); X.raw("PUNCH['slow'] = 0.0")
        recap = r; pattern = r; goal = 'Spot the mistake' if tpl == 'mistake' else 'Mistake -> fix'; cefr_txt = [w, r]
    elif tpl == 'choose':
        q = '|'.join([a['q']] + a['opts'] + [a['ans']]); kl = X.L('B', a['line']); kw.add(a['key']); idx = next(j for j, x in enumerate(a['line'].split(' ')) if norm(x) == a['key'])
        X.head += [f'Q = {q!r}', f"QA = dict(template='choose', choice_key={a['key']!r}, choice_line={kl!r}, answer={a['ans']!r})", f"CAPSTYLE = {{'listen': (None, None), 'replay': ('Karaoke', {idx}), 'slow': ('Karaoke', {idx})}}", f"RING_EXTRA['ring'] = {rc_y}"]
        hook = f"ONE listen. Catch the *{a['thing']}?*|?"; CH = "('Choice', 0.0, None, Q, 0)"
        if est(a['line']) < 2.0: raise Gate('choose line < 2 s')
        if not all(opt_fits(o) for o in a['opts']): raise Gate('choice option too wide at 52 px')
        if a['key'] not in norm(a['opts']['ABC'.index(a['ans'])]).split(' '): raise Gate('answer key not verbatim in the answer option (qa5)')
        X.prop(); X.hold('setup', 'B1', 1.6, f'[{CH}]'); X.talk('listen', 'B1', 'B', kl, ov=f'[{CH}]')
        X.hold('ring', S.get('ring_tpl', rc_clip), 1.5, f"[{CH}, ('Ring', 0.0, 3.0, 'Comment A, B or C 👇|')]"); X.hold('ring_b', 'B2' if rc_clip != 'B2' else 'BREACT', 1.5, f'[{CH}]')
        X.hold('reveal', 'BREACT', 2.0, "[('Choice', 0.0, None, Q, 1)]"); X.talk('replay', 'B2', 'B', kl, opt=True); X.talk('slow', 'B1', 'B', kl, tempo=0.85); X.raw("PUNCH['slow'] = 0.0"); X.hold('react2', 'BREACT', 1.2, pad=True)
        recap = a['recap']; pattern = a['q']; goal = f"Listening: {a['thing']}"; cefr_txt = [a['line']]
    elif tpl == 'quiz':
        q = '|'.join([a['q'], a['a'], a['b'], a['ans']]); kl = X.L('A', a['line']); kr = X.L('B', REPLY[scene])
        for o in (a['a'], a['b']):
            if len(o) > 26 or not opt_fits(o): raise Gate('quiz option too long')
        X.head += [f'Q = {q!r}', "QA = dict(template='quiz')", f"RING_EXTRA['ring'] = {rc_y}"]; CH = "('Choice', 0.0, None, Q, 0)"
        hook = 'Polite or *rude?*|?' if 'polite' in a['q'].lower() else 'Which one is *correct?*|?'
        X.prop(); X.hold('setup', 'B1', 2.0, f'[{CH}]'); X.hold('ring', S.get('ring_tpl', rc_clip), 1.5, f"[{CH}, ('Ring', 0.0, 3.0, 'Comment A or B 👇|')]"); X.hold('ring_b', 'B2' if rc_clip != 'B2' else 'BREACT', 1.5, f'[{CH}]')
        X.hold('reveal', 'BREACT', 2.0, "[('Choice', 0.0, None, Q, 1)]"); X.talk('right', 'MCU', 'A', kl); X.talk('reply', 'B1', 'B', kr, opt=True); X.talk('slow', 'MCU', 'A', kl, tempo=0.85); X.raw("PUNCH['slow'] = 0.0"); X.hold('react2', 'BREACT', 1.2, pad=True)
        recap = a['line']; pattern = a['line']; goal = 'Polite or rude?' if 'polite' in a['q'].lower() else 'Which is correct?'; cefr_txt = [a['a'], a['b'], a['line']]
    elif tpl == 'gap':
        line, wd = a['line'], a['word']; kf = X.L('A', line); kg = X.gapL(kf, line, wd); kr = X.L('B', REPLY[scene]); kw.add(norm(wd))
        if ',' in line: raise Gate('gap line with a comma (extra pause)')
        if re.search(r'(t|te|d|de|g|k|ck|p|b)$', wd.lower()): raise Gate('gap word ends in a plosive (qa5 closure: leaked consonant; lô 2 tag/chocolate)')
        idx = next(j for j, x in enumerate(line.split(' ')) if x.strip('.,?!') == wd)
        X.head += [f'GAP_WORD = {wd!r}', f"QA = dict(template='gap', gap_line={kg!r})", f"GAPT = TEXT[{kf!r}] + '||'", f"CAPSTYLE = {{'gap': (None, None), 'full': (None, None), 'slow': ('Karaoke', {idx})}}"]
        hook = 'ONE word is *missing*|?'; G0, G1 = "('Gap', 0.0, None, GAPT, 0)", "('Gap', 0.0, None, GAPT, 1)"   # card, not a caption: up 1.6 s before the line (pre-gap pause), through the ring
        X.prop(); X.hold('setup', 'MCU', 1.6, f'[{G0}]'); X.talk('gap', 'MCU', 'A', kg, tempo=1.0, ov=f'[{G0}]')
        X.hold('ring', 'BREACT', 1.5, f"[{G0}, ('Ring', 0.0, 3.0, 'Say the missing word!|')]"); X.hold('ring_b', 'B2', 1.5, f'[{G0}]')
        X.hold('reveal', 'BREACT', 1.0, f'[{G1}]'); X.talk('full', 'MCU', 'A', kf, ov=f'[{G1}]'); X.talk('reply', 'B1', 'B', kr, opt=True); X.talk('slow', 'MCU', 'A', kf, tempo=0.85); X.raw("PUNCH['slow'] = 0.0"); X.hold('react2', 'BREACT', 1.2, pad=True)
        recap = line; pattern = line.replace(wd, '___'); goal = f'Key word: {wd}'; cefr_txt = [line]
    elif tpl == 'ladder':
        ks = [X.L('A', t) for t in a['lad']]; lad = '|'.join(a['lad'])
        X.head += [f'LAD = {lad!r}', f"QA = dict(template='ladder', ladder_lines={ks!r})", f"LADDER_Y = {S['ladder_y']}", "CAPSTYLE = {'polite': (None, None), 'neutral': (None, None), 'casual': (None, None)}"]
        hook = '3 ways. Which are *YOU?*|?'
        X.prop()
        for j, (sid, k) in enumerate(zip(('polite', 'neutral', 'casual'), ks)): X.talk(sid, S.get('ladder_clip', 'MCU'), 'A', k, ov=f"[('Ladder', 0.0, None, LAD, {j + 1})]")
        X.raw("PUNCH['neutral'] = 0.0"); X.hold('ring', S.get('ring_tpl', 'BREACT'), 1.5, "[('Ladder', 0.0, None, LAD, 3), ('Ring', 0.0, 3.0, 'Which would YOU say? Comment 👇|')]"); X.hold('ring_b', 'B2', 1.5, "[('Ladder', 0.0, None, LAD, 3)]")
        X.talk('slow', 'MCU', 'A', ks[0], tempo=0.85); X.raw("PUNCH['slow'] = 0.0"); X.hold('react2', 'BREACT', 1.2, pad=True)
        recap = next(t for t in a['lad'] + [a['lad'][-1]] if len(words(t)) <= 7); pattern = 'Could I possibly have ___?'; goal = 'Polite, neutral, casual'; cefr_txt = a['lad']
    elif tpl == 'pov':
        kq, ka = X.L('B', a['q']), X.L('A', a['a'])
        if len(words(a['a'])) > 8 or len(a['a']) < 22: raise Gate('pov answer length')
        bx = S['vhook_box']
        X.head += [f"BADGE_Y = 316; HOOK_Y = {S['hook_y']}; POV_Y = 232", f"ALLSHOTS_OV = [('Pov', {S['pov']!r}, None)]", "ALLSHOTS_SKIP = ('hook', 'loop')",
                   f"QA = dict(template='pov', answers=[{ka!r}])", "ONE = [('Hook', 0.0, None, 'One possible answer|')]"]
        hook = 'Mind goes *blank?*|grimace'
        X.prop(); X.talk('q1', 'B1', 'B', kq); X.hold('ring1', 'BREACT', 1.5, "[('Ring', 0.0, 3.0, 'Your answer? Comment 👇|')]"); X.hold('ring1b', 'B2', 1.5)
        X.talk('a1', 'MCU', 'A', ka, ov='ONE'); X.hold('react', 'BREACT', 1.0, ov='ONE'); X.talk('slow', 'MCU', 'A', ka, tempo=0.85); X.raw("PUNCH['slow'] = 0.0"); X.hold('react2', 'BREACT', 1.2, pad=True)
        recap = a['a']; pattern = a['a']; goal = 'You are the customer'; cefr_txt = [a['q'], a['a']]
    elif tpl == 'speak':
        kl = X.L('A', a['line']); kr = X.L('B', a.get('rep') or REPLY[scene] if a.get('rep') or 'Could I get' in a['line'] else {'hotel': 'Sure, let me find out for you.', 'cafe': 'Of course! Here you go.', 'airport': 'Yes, it is. Just over there.', 'restaurant': "Yes, of course. Here you are."}[scene])
        X.head += ["QA = dict(template='speak')", "RING_EXTRA['ring'] = 830"]
        hook = 'Say it *with me*|?'
        X.prop(); X.talk('model', 'MCU', 'A', kl); X.talk('reply', 'B1', 'B', kr, opt=True); X.talk('slow', 'MCU', 'A', kl, tempo=0.85); X.raw("PUNCH['slow'] = 0.0")
        X.hold('ring', 'BREACT', 1.5, "[('Ring', 0.0, 3.0, 'Your turn! Say it out loud 👇|')]"); X.hold('ring_b', 'B2', 1.5); X.talk('again', 'A2', 'A', kl, opt=True); X.hold('react2', 'BREACT', 1.2, pad=True)
        recap = a['line']; pattern = a['line']; goal = 'Say it with me'; cefr_txt = [a['line']]
    elif tpl == 'series':
        kq, ka, kr = X.L('B', a['q']), X.L('A', a['a']), X.L('B', a['rep'])
        X.head += ["QA = dict(template='series')", "RING_EXTRA['ring'] = 830"]
        hook = 'What does she *say next?*|?'
        X.prop(); X.talk('q', 'B1', 'B', kq); X.hold('ring', 'BREACT', 1.5, "[('Ring', 0.0, 3.0, 'What would YOU say? Comment 👇|')]"); X.hold('ring_b', 'B2', 1.5)
        X.talk('a', 'A1', 'A', ka); X.talk('reply', 'B2', 'B', kr, opt=True); X.talk('slow', 'MCU', 'A', ka, tempo=0.85); X.raw("PUNCH['slow'] = 0.0"); X.hold('react2', 'BREACT', 1.2, pad=True)
        recap = a['a']; pattern = a['a']; goal = 'Real conversation'; cefr_txt = [a['q'], a['a'], a['rep']]
    else: raise Gate('unknown template')
    alts = [h.format(w=wrong_word.strip('.,?!') if tpl == 'fix' else '', thing=a.get('thing', ''), q=hook) for h in HOOKS[tpl]] if tpl != 'quiz' else [hook, 'Which is *right?*|?']
    fit = [h for h in alts if len(words(h.split('|')[0])) <= 5 and hook_fits(h, S['vhook_box'])]
    if not fit: raise Gate(f'no hook fits the free wall box {S["vhook_box"]}: {alts}')
    hook = fit[0]; gate_hook(hook); gate_recap(recap)
    X.t += 2.8 + 1.0   # recap + loop
    if X.t > 23.4 or X.t + X.topt + X.tpad < 18.6: raise Gate(f'estimated range {X.t:.1f}-{X.t + X.topt + X.tpad:.1f} s misses 18.6-23.4')
    X.t = min(max(X.t, 18.6), X.t + X.topt + X.tpad)   # (the adapter fits the real wav durations at render time)
    lv = cefr(cefr_txt, 'A1' if tpl in ('speak', 'gap') else 'A2')
    meta = dict(id=lid.replace('_', '-'), cefr=lv, goal_en=goal, pattern=pattern, area=area)
    src = [f'# AUTO-GENERATED by scripts/cine/gen_lessons.py - template {tpl}, point "{point}" (do not edit; regenerate)',
           f"exec(open(f'{{D}}/lessons/_auto_{scene}.py').read())", *X.head, f'META = {meta!r}',
           'if not VIRAL: raise SystemExit("auto lessons are English-only viral (VIRAL=1)")',
           f'VIRAL_HOOK = {hook!r}; SERIES = {series!r}; KEYWORDS.update({sorted(kw)!r})', 'vhook(VIRAL_HOOK)', *X.code,
           f"vend({recap!r}{', B2' if tpl == 'pov' else ''})", '']
    loc = dict(lang='en', dir='ltr', font='BeVietnamPro-ExtraBold', name='English', english_only=True, lesson_file=lid, goal=goal,
               cta=ECO[area]['cta'].replace(' lexkite.com', '').strip(), lines={}, choose='', recap='', hook='', say='', which='', comment='', answer='', onepossible='', repeat='', yourturn='', why='', wrong='', right='')
    return lid, '\n'.join(src), loc, X.lines, dict(template=tpl, area=area, cefr=lv, scene=scene, est=round(X.t, 1), series=series)

ADAPTER = '''# AUTO-GENERATED adapter (scripts/cine/gen_lessons.py): role names -> @SCENE@ bank clips + v3 viral helpers.
# Beats are collected first and laid out in vend() on the REAL wav durations (auto_voice.py synthesised them): breath 0.45 s after the
# last mouth cue, optional beats dropped / pad beats added to land in 18.8-23.2 s, mistake reveal >= 62 % of the content;
# frames only from clean mouth-swap ranges (residual.json, residual.py <= 11.5).
@CONSTS@
BW = @B@; FD = D + '/foley/'; CONTRAST_Y = 900; BADGE_Y = 240; CHOICE_Y = @CHOICE_Y@; HOOK_Y = @HOOK_Y@; LADDER_Y = @LADDER_Y@; POV_Y = 232
CHOICE_ROW = 84; CHOICE_PAD = 16; CARD_MIN_FS = 52   # 22/10: every card/chip text >= 52 px (tpl_styles MF), cards grow; place.py + qa5 keep the no-overlap rules
RING_EXTRA = {'ring': 1080}; FOOT_EXTRA = {}; LADDER_ROW = 112; RING_MINH = 160; CHOICE_ROW = 86; CHOICE_PAD = 20   # compact cards: fit between big faces and the caption band
SERIES_SHOTS = ('loop',); SERIES_ALIGN = 'left'; SERIES_Y = 240   # default spots only: lesson5's placer (place.py) moves any card off faces / other cards
VHOOK_BOX = @VHOOK_BOX@; AVOID = {MASTER: @AVOID@}
WHO = @WHO@
RANGE = @RANGE@
PROP = @PROP@
CUR = {}; BEATS = {}; PEND = []; BREATH = 0.45; RMAX = 11.5
RES = json.load(open(D + '/residual.json')) if os.path.exists(D + '/residual.json') else {}
def _run(clip, lo, hi, talker, ws):   # longest frame run whose residual stays <= RMAX for every mouth in ws (talker: worst viseme, others: closed)
    p = RES.get(clip, {}); ws = [w for w in ws if w in p]
    if not ws: return lo, hi, hi - lo + 1
    hi = min(hi, min(len(p[w]['X']) for w in ws) - 1); ok = [all(p[w]['talk' if w == talker else 'X'][f] <= RMAX for w in ws) for f in range(lo, hi + 1)]
    best, st = (0, -1), None
    for i, v in enumerate(ok + [False]):
        if v and st is None: st = i
        elif not v and st is not None:
            if i - st > best[1] - best[0] + 1: best = (st, i - 1)
            st = None
    return lo + best[0], lo + best[1], best[1] - best[0] + 1
def clean(clip, talker=None, ws=None):   # -> (lo, hi, mouths to swap). A silent hold drops a mouth that has no clean run (original Kling mouth, no swap)
    lo, hi = RANGE.get(clip, (0, 120)); ws = list(WHO.get(clip, [])) if ws is None else ws; a, b, n = _run(clip, lo, hi, talker, ws)
    if n >= 12: return a, b, ws
    if talker is None:
        keep = [w for w in ws if _run(clip, lo, hi, None, [w])[2] >= 12]; print('residual: hold on', clip, 'no swap for', [w for w in ws if w not in keep])
        if keep != ws: return clean(clip, None, keep)
    print('residual WARN', clip, talker, 'clean run only', n, 'frames'); return lo, hi, ws
def take(clip, n, talker=None, reset=False):
    lo, hi, ws = clean(clip, talker); p, d = CUR.get(clip, (lo, 1))
    if reset or not lo <= p <= hi: p, d = lo, 1
    out = []
    for _ in range(n):
        out.append(p)
        if not lo <= p + d <= hi: d = -d
        p += d
    CUR[clip] = (p, d); return out, ws
def _f(d): return round(d * FPS) / FPS
def talk(id, clip, who, k, at=0.07, tempo=None, ov=(), foley=(), opt=False, pad=False):
    l = line(k, at, tempo); nx = [x for x in l['cues'] if x['value'] != 'X']
    PEND.append(dict(kind='talk', id=id, clip=clip, who=who, l=l, d=_f(at + nx[-1]['end'] / l['tempo'] + BREATH), ov=ov, foley=foley, opt=opt, pad=pad, on=not pad))
def hold(id, clip, dur, ov=(), foley=(), reset=False, opt=False, pad=False):
    PEND.append(dict(kind='hold', id=id, clip=clip, d=_f(dur), ov=ov, foley=foley, reset=reset, opt=opt, pad=pad, on=not pad))
def vhook(txt):
    nw = len(txt.split('|')[0].split()); dur = min(2.0, max(1.6, 0.4 + 0.28 * nw) + 0.05); BEATS['hook'] = dur
    hold('hook', MASTER, dur, ov=[('VHook', 0.0, None, txt)], foley=[(FD + 'tone0.wav', 0.0), (FD + 'whoosh.wav', 0.0)], reset=True)   # whoosh: first sound < 0.3 s
def prop(pad=False): PEND.append(dict(kind='prop', id='prop', d=_f(PROP[2]), opt=False, pad=pad, on=not pad))
def _tot(): return sum(b['d'] for b in PEND if b['on'])
def _ratio():   # mistake: reveal start / content (recap + loop excluded), as qa5 measures it
    t = 0; rv = None
    for b in PEND:
        if not b['on']: continue
        if b['id'] == 'reveal': rv = t
        t += b['d']
    return 1 if rv is None else rv / (t - sum(b['d'] for b in PEND if b['on'] and b['id'] in ('recap', 'loop')))
def fit():
    ir = next((i for i, b in enumerate(PEND) if b['id'] == 'reveal'), len(PEND)); opts = [b for b in PEND if b['opt']]; pads = [b for b in PEND if b['pad']]
    if QA.get('template') == 'mistake':
        for b in reversed(opts):
            if _ratio() < 0.62 and PEND.index(b) > ir: b['on'] = False
        for b in pads:
            if _ratio() < 0.62 and PEND.index(b) < ir: b['on'] = True
    for b in reversed(opts):
        if _tot() > 23.2 and b['on']: b['on'] = False
    for b in pads:
        if _tot() < 18.8 and not b['on']: b['on'] = True
    print('fit: total %.2f s, reveal ratio %.2f, beats %s' % (_tot(), _ratio(), ' '.join(b['id'] + ('' if b['on'] else '(off)') for b in PEND)))
def emit():
    h0, hws = 0, WHO[MASTER]
    for b in PEND:
        if not b['on']: continue
        n = int(round(b['d'] * FPS)); c = b.get('clip')
        if b['kind'] == 'talk':
            fr, ws = take(c, n, b['who']); shot(b['id'], c, n / FPS, (lambda fr: lambda m: fr[:m])(fr), [(c, w, [b['l']] if w == b['who'] else []) for w in ws], [(b['who'], b['l'])], ov=b['ov'], foley=b['foley'])
        elif b['kind'] == 'hold':
            fr, ws = take(c, n, None, b['reset'])
            if b['id'] == 'hook': h0, hws = fr[0], ws
            shot(b['id'], c, n / FPS, (lambda fr: lambda m: fr[:m])(fr), [(c, w, []) for w in ws], [], ov=b['ov'], foley=b['foley'])
        elif b['kind'] == 'prop':
            pc, f0, d, snd, at = PROP; shot('prop', pc, n / FPS, lambda m: list(range(f0, f0 + m)), [], [], foley=[(FD + snd, at / FPS)] if snd else [])
        else: shot('loop', MASTER, n / FPS, lambda m: list(range(h0 + m - 1, h0 - 1, -1)), [(MASTER, w, []) for w in hws], [], ov=[('Follow', 0.0, None, 'Follow for daily English|lexkite.com')])
def vend(recap, clip=None):
    hold('recap', clip or BREACT, 2.8, ov=[('Recap', 0.0, 2.5, recap + '|')]); PEND.append(dict(kind='loop', id='loop', d=1.0, opt=False, pad=False, on=True)); fit(); emit()
'''
def adapter(scene):
    S = SCENES[scene]; C = S['clips']
    consts = '\n'.join(f'{k} = {v!r}' for k, v in C.items())
    who = '{' + ', '.join(f"{k}: [{'BW' if v == 'B' else repr(v)}]" for k, v in S['who'].items()) + ", MASTER: [BW, 'ama']}"
    rng = '{' + ', '.join(f'{k}: {v}' for k, v in S['range'].items()) + '}'
    sub = dict(SCENE=scene, CONSTS=consts, B=repr(S['B']), CHOICE_Y=S['choice_y'], HOOK_Y=S['hook_y'], LADDER_Y=S['ladder_y'], VHOOK_BOX=S['vhook_box'], AVOID=S['avoid'], WHO=who, RANGE=rng, PROP=repr(S['prop']))
    out = ADAPTER
    for k, v in sub.items(): out = out.replace(f'@{k}@', str(v))
    return out

# ------------------------------------------------------------------ coverage
def coverage(L):
    fits = {}
    for sc in SCENES:
        for tpl, area, *_ in candidates(sc): fits.setdefault(area, set()).add(sc)
    cov = {}
    for aid in ECO:
        row = {lv: dict(generated=0, rendered=0) for lv in LV}
        for p in L['points'].values():
            if p.get('area') == aid and p.get('cefr') in row:
                row[p['cefr']]['generated'] += 1; row[p['cefr']]['rendered'] += p.get('status') == 'rendered'
        g = sum(r['generated'] for r in row.values()); r_ = sum(r['rendered'] for r in row.values())
        cov[aid] = dict(label=ECO[aid]['label'], scenes=sorted(fits.get(aid, [])), generated=g, rendered=r_, by_cefr={k: v for k, v in row.items() if v['generated']},
                        gap=(max(0, 5 - r_) if fits.get(aid) else None))
    gaps = {k: v['gap'] for k, v in cov.items() if v['gap']}; nofit = [k for k, v in cov.items() if v['gap'] is None]
    out = dict(updated=__import__('datetime').date.today().isoformat(), target_per_area=5, areas=cov,
               gaps_rendered_below_5=gaps, areas_no_scene_fits=nofit)
    json.dump(out, open(COVER, 'w'), ensure_ascii=False, indent=1); return out

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--batch', type=int, default=0); ap.add_argument('--coverage', action='store_true')
    ap.add_argument('--mark-rendered', nargs=2, metavar=('RUN', 'IDS')); ap.add_argument('--scenes', default='hotel,restaurant,airport,cafe')
    ap.add_argument('--regen', action='store_true', help='rebuild every generated (not yet rendered) ledger point in place: same points, same ids')
    o = ap.parse_args(); L = load_ledger()
    if o.mark_rendered:
        run, ids = o.mark_rendered
        for p in L['points'].values():
            if p.get('id') in ids.split(','): p['status'] = 'rendered'; p['run'] = run
    def write(sc, lid, src, loc, lines, fresh=set()):
        d = f'{AUTO}/{sc}'; os.makedirs(d, exist_ok=True)
        if sc not in fresh:
            fresh.add(sc)
            if o.regen:
                gen = {p['id'] for p in L['points'].values() if p.get('status') == 'generated'}   # rendered lessons are frozen (their videos exist)
                for f in glob.glob(f'{d}/auto_*'):
                    if os.path.basename(f).split('.')[0] in gen: os.remove(f)
        open(f'{d}/{lid}.py', 'w').write(src); json.dump(loc, open(f'{d}/{lid}.en.json', 'w'), ensure_ascii=False, indent=1)
        lf = f'{d}/lines.json'; LJ = json.load(open(lf)) if os.path.exists(lf) else {'lines': []}; have = {x['id'] for x in LJ['lines']}
        LJ['lines'] += [v for k, v in lines.items() if k not in have]; json.dump(LJ, open(lf, 'w'), ensure_ascii=False, indent=1)
        open(f'{d}/_auto_{sc}.py', 'w').write(adapter(sc))
    if o.regen:
        for key, p in L['points'].items():
            if p.get('status') != 'generated' or p.get('scene') not in SCENES: continue
            c = next((c for c in candidates(p['scene']) if norm(c[2]) == key and c[0] == p['template']), None)
            if not c: print('  regen: no candidate for', key); continue
            try: lid, src, loc, lines, info = build(p['scene'], c[0], c[1], c[2], c[3], int(p['series'].split('#')[-1]))
            except Gate as e: print('  regen gate-rejected:', p['id'], e); continue
            assert lid == p['id'], (lid, p['id']); write(p['scene'], lid, src, loc, lines); p.update(info, status='generated'); p.pop('run', None); print(f'{lid:42s} {c[0]:8s} est {info["est"]:5.1f}s  {c[2]}')
    if o.batch:
        scenes = o.scenes.split(','); per = {sc: [] for sc in scenes}; rej = []
        area_n = {}
        for p in L['points'].values(): area_n[p.get('area')] = area_n.get(p.get('area'), 0) + 1
        for sc in scenes:   # round-robin templates inside a scene; least-covered areas first
            pool = [c for c in candidates(sc) if norm(c[2]) not in L['points']]
            bytpl = {}
            for c in sorted(pool, key=lambda c: area_n.get(c[1], 0)): bytpl.setdefault(c[0], []).append(c)
            per[sc] = bytpl
        made = 0; nser = {sc: 1 + sum(1 for p in L['points'].values() if p.get('scene') == sc) + (5 if sc == 'hotel' else 0) for sc in scenes}
        order = ['mistake', 'choose', 'ladder', 'pov', 'gap', 'quiz', 'fix', 'speak', 'series']
        rounds = 0; tcount = {}; scount = {}
        while made < o.batch and rounds < 50:
            rounds += 1
            for sc in scenes:
                if made >= o.batch: break
                for tpl in sorted(order, key=lambda t: (tcount.get(t, 0) + scount.get((sc, t), 0) * 3, (order.index(t) + rounds + scenes.index(sc) * 2) % 9)):
                    if not per[sc].get(tpl): continue
                    tpl_, area, point, args = per[sc][tpl].pop(0)
                    if norm(point) in L['points']: continue   # same point already taken by another scene in this batch
                    try: lid, src, loc, lines, info = build(sc, tpl_, area, point, args, nser[sc])
                    except Gate as e: rej.append(f'{sc}/{tpl_}/{point}: {e}'); continue
                    write(sc, lid, src, loc, lines)
                    L['points'][norm(point)] = dict(id=lid, point=point, status='generated', **info); nser[sc] += 1; made += 1; tcount[tpl_] = tcount.get(tpl_, 0) + 1; scount[(sc, tpl_)] = scount.get((sc, tpl_), 0) + 1; area_n[area] = area_n.get(area, 0) + 1
                    print(f'{lid:42s} {tpl_:8s} {info["cefr"]} {area:14s} est {info["est"]:5.1f}s  {point}')
                    break
        for r in rej: print('  gate-rejected:', r)
        print(f'{made} lessons written')
    json.dump(L, open(LEDGER, 'w'), ensure_ascii=False, indent=1)
    cv = coverage(L); print('coverage gaps (rendered < 5, scene fits):', cv['gaps_rendered_below_5']); print('no scene fits:', ', '.join(cv['areas_no_scene_fits']))

if __name__ == '__main__': main()
