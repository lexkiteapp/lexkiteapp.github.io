/* Call Ama & Carlos – 6 cuộc gọi luyện nói có kịch bản (công sở & đời sống Mỹ). Nội dung tự biên soạn 100% (docs/CONTENT-RULES.md).
 * Mỗi lượt: m = câu giáo viên nói; o = 2–3 câu gợi ý cho người học; br = nhánh [regex, câu giáo viên đáp]; re = câu đáp mặc định.
 * phrases = cụm từ nên nhớ [cụm, nghĩa tiếng Anh đơn giản] → thêm vào thẻ ôn cuối cuộc gọi. */
(function (g) {
  g.CALLS = [
    {
      id: 'coffee', em: '☕', lv: 'A2', title: 'Coffee run for the team', role: 'your teammate at the office',
      phrases: [['grab a coffee', 'get a coffee quickly'], ['for here or to go', 'drink it in the café or take it away'], ['oat milk', 'milk made from oats'], ['my treat', 'I will pay for you'], ['no worries', 'it is not a problem']],
      turns: [
        { m: 'Hey! I\'m going to grab a coffee for the team. Do you want something?', o: ['Yes, please! A latte, please.', 'No, thanks. I\'m okay.', 'Sure! What do they have?'], br: [['no|okay|i\'m good|not', 'No problem! How about a snack, then?'], ['what|menu|have', 'They have coffee, tea, and hot chocolate.']], re: 'Great choice!' },
        { m: 'Do you want it hot or iced?', o: ['Iced, please. It\'s really hot today.', 'Hot, please.', 'Hmm, iced, I think.'], br: [['iced|cold', 'Iced it is! It\'s so warm outside today.'], ['hot|warm', 'Hot – perfect for this cold office!']], re: 'Got it.' },
        { m: 'What size? Small, medium, or large?', o: ['Medium, please.', 'A large one, please. I\'m very tired.', 'Small is fine, thanks.'], br: [['large|big|tired', 'Ha! Long day already?'], ['small', 'Small, okay.'], ['medium', 'Medium, sure.']], re: 'Okay!' },
        { m: 'Regular milk or oat milk?', o: ['Oat milk, please.', 'Regular milk is fine.', 'No milk, thanks.'], br: [['oat', 'Oat milk – nice. I like it too.'], ['no milk|black', 'No milk, got it.']], re: 'Sure thing.' },
        { m: 'Anything to eat? They have great muffins.', o: ['Yes, a blueberry muffin, please.', 'No, thank you. Just the coffee.', 'What kind of muffins do they have?'], br: [['what kind|which', 'Blueberry and chocolate. The blueberry one is my favorite.'], ['no|just', 'Okay, just the coffee.']], re: 'Yum, good idea.' },
        { m: 'Okay, that\'s it. It\'s my treat today!', o: ['Thank you so much! Next time it\'s on me.', 'Oh, thanks! That\'s very kind.', 'Are you sure? Let me pay.'], br: [['sure|let me|pay', 'Don\'t worry about it! You can pay next time.'], ['next time|on me', 'Deal!']], re: 'You\'re welcome!' },
      ],
      end: 'Be right back with the coffee. See you in ten minutes!',
    },
    {
      id: 'weekend', em: '🌤️', lv: 'A2', title: 'Monday chat about the weekend', role: 'your friendly coworker',
      phrases: [['How was your weekend?', 'a common Monday question'], ['take it easy', 'relax and do not work hard'], ['hang out', 'spend time with friends'], ['sounds fun', 'that seems enjoyable'], ['catch up', 'talk after some time apart']],
      turns: [
        { m: 'Good morning! How was your weekend?', o: ['It was great, thanks! How was yours?', 'It was good. I relaxed at home.', 'Not bad. A little busy.'], br: [['yours|you', 'Mine was great, thanks for asking!'], ['busy', 'Oh, a busy one?'], ['relax|home|easy', 'Nice and relaxing, I love that.']], re: 'Oh, nice!' },
        { m: 'What did you do on Saturday?', o: ['I went to the beach with my friends.', 'I watched a movie and cooked dinner.', 'I visited my parents.'], br: [['beach|park|lake|hike|hiking', 'Wow, the weather was perfect for that!'], ['movie|film', 'Ooh, which movie did you see?'], ['parents|family|mom|dad', 'Aw, that\'s so nice.']], re: 'That sounds fun!' },
        { m: 'Did you do anything on Sunday?', o: ['Not much. I just took it easy.', 'I cleaned my apartment and went shopping.', 'I played soccer in the morning.'], br: [['not much|easy|relax|nothing', 'Sometimes doing nothing is the best plan.'], ['soccer|football|basketball|tennis|gym', 'Oh, you\'re so active!'], ['clean|shop', 'Very productive!']], re: 'Nice.' },
        { m: 'I went to a food festival downtown. It was amazing!', o: ['That sounds fun! What did you eat?', 'Cool! Was it crowded?', 'I love food festivals!'], br: [['eat|food|try', 'Tacos, dumplings, and the best ice cream ever.'], ['crowd|busy|people', 'Super crowded, but worth it.']], re: 'It really was!' },
        { m: 'Do you have any plans for next weekend?', o: ['Not yet. Do you have any ideas?', 'Yes, I\'m going to visit a friend in Chicago.', 'I want to try that food festival!'], br: [['idea|suggest|recommend', 'You should check out the farmers market. It\'s great.'], ['festival', 'You should! It\'s on again next Saturday.'], ['going to|visit|trip', 'Oh, fun! Have a great time.']], re: 'Sounds good!' },
        { m: 'Okay, I have a meeting now. Let\'s catch up at lunch!', o: ['Sure! See you at lunch.', 'Sounds good. Have a good meeting!', 'Okay, talk later!'], re: 'See you!' },
      ],
      end: 'Have a great Monday!',
    },
    {
      id: 'first-day', em: '🏢', lv: 'B1', title: 'Your first day at a US office', role: 'your new teammate, showing you around',
      phrases: [['show you around', 'give you a short tour'], ['onboarding', 'training for new employees'], ['reach out', 'contact someone'], ['get the hang of it', 'learn how to do something'], ['feel free to', 'you can do it without asking']],
      turns: [
        { m: 'Hi! You must be the new designer. I\'m Ama. Welcome to the team!', o: ['Hi Ama, nice to meet you! Thanks for the welcome.', 'Hello! Yes, I\'m the new designer. Nice to meet you.', 'Hi! I\'m a bit nervous, but excited.'], br: [['nervous|scared|worried', 'Don\'t worry, everyone here is really friendly.']], re: 'Nice to meet you too!' },
        { m: 'How was your trip to the office this morning?', o: ['It was easy. I took the subway.', 'A little stressful. The traffic was terrible.', 'Good! I walked here. I live close by.'], br: [['traffic|stress|late|terrible', 'Oh no! It gets better if you leave a bit earlier.'], ['walk|close|near', 'Lucky you!'], ['subway|train|bus', 'The subway is the fastest way, for sure.']], re: 'Good to hear.' },
        { m: 'Let me show you around. This is the kitchen. The coffee is free, by the way.', o: ['Free coffee? That\'s great!', 'Thanks! Where can I find tea?', 'Nice. Can I bring my own lunch?'], br: [['tea', 'Tea is in the top cupboard, next to the mugs.'], ['lunch|fridge|food', 'Of course! Just put your name on it in the fridge.']], re: 'Yep, it\'s the best perk here.' },
        { m: 'And this is your desk. Your laptop is ready. Do you have any questions so far?', o: ['Yes. Who should I ask if I need help?', 'What time do people usually have lunch?', 'Not right now, thanks. Everything is clear.'], br: [['help|ask|who', 'You can always ask me, or our manager, Jordan.'], ['lunch|eat', 'Usually around twelve thirty. We often eat together.'], ['no|not|clear', 'Great. Feel free to ask me anything later.']], re: 'Good question.' },
        { m: 'Your onboarding session starts at ten. Have you used our design tools before?', o: ['Yes, I used them at my last job.', 'Not really, but I learn fast.', 'Some of them. I\'d love a quick tutorial.'], br: [['not|never|tutorial|learn', 'No problem, you\'ll get the hang of it quickly.'], ['yes|used|last job', 'Perfect, that will make it easier.']], re: 'Okay!' },
        { m: 'A few of us are having lunch together today. Do you want to join us?', o: ['I\'d love to! Thanks for inviting me.', 'Sure, what time?', 'Thanks, but I brought my own lunch today.'], br: [['brought|own|but', 'No worries! You can still sit with us in the kitchen.'], ['time|when', 'Twelve thirty, in the lobby.']], re: 'Awesome!' },
      ],
      end: 'Great! I\'ll come get you at twelve thirty. Good luck with onboarding!',
    },
    {
      id: 'standup', em: '🧩', lv: 'B1', title: 'Quick daily stand-up update', role: 'your team lead, running the stand-up',
      phrases: [['stand-up', 'a short daily team meeting'], ['blocker', 'a problem that stops your work'], ['on track', 'progressing as planned'], ['wrap up', 'finish'], ['loop someone in', 'include someone in a conversation']],
      turns: [
        { m: 'Morning! Let\'s keep it quick. What did you work on yesterday?', o: ['Yesterday I finished the new login page.', 'I fixed two bugs in the payment form.', 'I worked on the report for the client.'], re: 'Nice work.' },
        { m: 'What are you working on today?', o: ['Today I\'m going to test the login page.', 'I\'m starting the user settings page.', 'I\'ll finish the client report this morning.'], re: 'Sounds good.' },
        { m: 'Any blockers?', o: ['No blockers, everything is on track.', 'Yes, I\'m waiting for the designs from Sam.', 'Kind of. I don\'t have access to the test server.'], br: [['no blocker|on track|nothing|no', 'Great, love to hear it.'], ['waiting|design|sam', 'Okay, I\'ll ping Sam after this meeting.'], ['access|server|password', 'I\'ll ask IT to give you access today.']], re: 'Okay, noted.' },
        { m: 'When do you think you can wrap up this task?', o: ['I think I can finish it by Thursday.', 'Probably by the end of the week.', 'It depends on the designs, maybe Friday.'], br: [['depend', 'Fair. Let me know as soon as you have them.']], re: 'Perfect, thanks.' },
        { m: 'Should I loop anyone else in?', o: ['Yes, please loop in the QA team.', 'No, I think we\'re fine for now.', 'Maybe Sam, for the designs.'], br: [['no|fine', 'Okay.'], ['qa|test', 'Good idea, I\'ll add them to the thread.'], ['sam', 'Sure, I\'ll add Sam.']], re: 'Got it.' },
        { m: 'Great update. Anything else before we move on?', o: ['No, that\'s all from me. Thanks!', 'Just one thing: I\'m off on Friday afternoon.', 'Nope, all good.'], br: [['off|leave|friday|vacation', 'Thanks for the heads-up. Enjoy your afternoon off!']], re: 'Thanks!' },
      ],
      end: 'Okay, that\'s it for today. Have a productive day!',
    },
    {
      id: 'doctor', em: '🩺', lv: 'B1', title: 'Booking a doctor\'s appointment', role: 'the receptionist at a local clinic',
      phrases: [['make an appointment', 'book a time to see someone'], ['the earliest available', 'the first free time'], ['insurance card', 'a card that shows your health insurance'], ['symptoms', 'signs that you are sick'], ['check in', 'tell the front desk you have arrived']],
      turns: [
        { m: 'Good morning, Sunrise Family Clinic. This is Ama. How can I help you?', o: ['Hi, I\'d like to make an appointment, please.', 'Hello, I need to see a doctor.', 'Hi, can I book a check-up?'], re: 'Of course, I can help with that.' },
        { m: 'Are you a new patient, or have you been here before?', o: ['I\'m a new patient.', 'I\'ve been here before.', 'I\'m new. I just moved to the area.'], br: [['new|moved|first', 'Welcome! I\'ll just need some basic information.'], ['before|been here', 'Great, welcome back.']], re: 'Okay.' },
        { m: 'And what\'s the reason for your visit?', o: ['I have a bad cough and a sore throat.', 'I just need a general check-up.', 'I\'ve had a headache for three days.'], br: [['cough|throat|fever|cold|flu', 'I\'m sorry to hear that. Let\'s get you in soon.'], ['check-up|checkup|general', 'Sure, a routine check-up.'], ['headache|pain|hurt', 'Oh, I\'m sorry. We\'ll find a time quickly.']], re: 'I see.' },
        { m: 'The earliest available time is tomorrow at 9:30 a.m. Does that work for you?', o: ['Yes, 9:30 works for me.', 'Do you have anything in the afternoon?', 'Is there anything today?'], br: [['afternoon|later', 'We have 3:15 p.m. tomorrow. Is that better?'], ['today|sooner|earlier', 'Sorry, today is fully booked. Tomorrow at 9:30 is the earliest.']], re: 'Perfect.' },
        { m: 'Can I have your full name and date of birth, please?', o: ['Sure. My name is Linh Tran. My birthday is May 2nd, 1995.', 'Yes, it\'s Linh Tran, May 2nd, 1995.', 'Of course. Do you need me to spell my name?'], br: [['spell', 'Yes, please – I want to get it right.']], re: 'Thank you.' },
        { m: 'Please bring your insurance card and a photo ID. Do you have any questions?', o: ['No, that\'s all. Thank you!', 'Should I come early to check in?', 'Where do I park?'], br: [['early|check in|check-in', 'Yes, please come ten minutes early to check in.'], ['park|parking|car', 'There\'s free parking behind the building.']], re: 'Okay.' },
      ],
      end: 'You\'re all set. See you tomorrow, and feel better soon!',
    },
    {
      id: 'apartment', em: '🏠', lv: 'B2', title: 'Calling about an apartment for rent', role: 'a property manager with an apartment for rent',
      phrases: [['security deposit', 'money you pay before moving in, returned later'], ['utilities included', 'water and electricity are part of the rent'], ['lease', 'a rental contract'], ['schedule a viewing', 'book a time to see a place'], ['pet-friendly', 'pets are allowed']],
      turns: [
        { m: 'Hi, this is Carlos from Maple Street Rentals. You called about the one-bedroom apartment?', o: ['Yes, hi! Is it still available?', 'Hi Carlos, yes. I saw the listing online.', 'Yes, I\'m interested in the apartment on Maple Street.'], re: 'Yes, it\'s still available.' },
        { m: 'It\'s a sunny one-bedroom on the third floor. What would you like to know?', o: ['How much is the rent?', 'Is it close to public transportation?', 'Are utilities included?'], br: [['rent|much|cost|price', 'It\'s eighteen hundred a month.'], ['transport|subway|bus|train', 'Yes, the bus stop is right outside.'], ['utilit|electric|water', 'Water is included, but electricity isn\'t.']], re: 'Good question.' },
        { m: 'Just so you know, there\'s a security deposit of one month\'s rent. Is that okay?', o: ['Yes, that\'s fine.', 'Is it refundable when I move out?', 'Could I pay it in two parts?'], br: [['refund|back|move out', 'Yes, as long as there\'s no damage.'], ['two|parts|installment|split', 'I\'ll have to check with the owner, but it may be possible.']], re: 'Great.' },
        { m: 'How long would you like the lease to be?', o: ['One year, ideally.', 'Do you offer six-month leases?', 'I\'m not sure yet. What are the options?'], br: [['six|short|month-to-month', 'We do, but the rent is a little higher.'], ['option|sure', 'We have six-month and twelve-month leases.']], re: 'That works.' },
        { m: 'Do you have any pets?', o: ['No, I don\'t have any pets.', 'Yes, I have a small cat. Is that okay?', 'Not now, but I might get a dog later.'], br: [['cat|dog|pet', 'The building is pet-friendly, so that\'s fine.'], ['no|don\'t', 'Okay, no pets.']], re: 'Okay.' },
        { m: 'Would you like to schedule a viewing?', o: ['Yes, please. Are you free on Saturday morning?', 'Sure! Is tomorrow evening possible?', 'Yes. What times are available?'], br: [['saturday|weekend', 'Saturday at ten works for me.'], ['tomorrow|evening', 'Tomorrow at six is fine.'], ['what time|available|when', 'I\'m free tomorrow at six or Saturday at ten.']], re: 'Great.' },
      ],
      end: 'Perfect, I\'ll text you the address. See you then!',
    },
  ];
})(typeof self !== 'undefined' ? self : this);
