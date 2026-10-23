/* Roleplay – tình huống hằng ngày cho người mới (A1–A2), nội dung tự biên soạn 100% (docs/CONTENT-RULES.md).
 * Cùng định dạng data-a.js nhưng 3 cấp là [A1, A2, B1] (lv). tip = gợi ý từng lượt bằng ngôn ngữ của người học (khóa dịch t()),
 * cando = mục tiêu đầu ra (khóa dịch). Câu mẫu: tiếng Anh Anh tự nhiên, câu ngắn, từ thông dụng. */
(function (g) {
  const R = g.ROLEPLAY = g.ROLEPLAY || [];
  const LV = ['A1', 'A2', 'B1'];
  const add = s => R.push({ ...s, lv: LV, kind: 'everyday' });

  add({
    id: 'neighbour', em: '👋', title: 'Meeting a new neighbour',
    ai: { name: 'Emma', role: 'your new neighbour', persona: 'warm, friendly and patient, speaks slowly and clearly', goal: 'get to know the learner and invite them for a coffee' },
    you: 'Say hello, introduce yourself, say where you are from and what you do, and agree to meet again.',
    cando: 'Chào hỏi, giới thiệu bản thân và hỏi thăm người mới quen',
    vocab: [['next door', 'in the house or flat beside yours'], ['neighbour', 'a person who lives near you'], ['move in', 'start living in a new home'], ['Where are you from?', 'a question about someone\'s country or city'], ['What do you do?', 'a question about someone\'s job'], ['some time', 'at a time in the future that is not fixed'], ['free', 'not busy']],
    turns: [
      { a: ['Hi! I\'m Emma. I live next door.', 'Hi there! I\'m Emma – I just moved in next door.', 'Hi! I\'m Emma – I\'ve just moved in next door, actually.'],
        h: ['Hi Emma! I\'m Sam. Nice to meet you.', 'Hi Emma, nice to meet you! I\'m Sam.', 'Oh hi, Emma! Lovely to meet you – I\'m Sam.'], tip: 'Chào lại và nói tên của bạn' },
      { a: ['Nice to meet you too. Where are you from?', 'Nice to meet you too. So, where are you from?', 'Nice to meet you too! So where are you from originally?'],
        h: ['I\'m from Brazil.', 'I\'m from Brazil, from a city near Rio. How about you?', 'I\'m from Brazil originally, but I\'ve lived here for two years now. How about you?'], tip: 'Nói bạn đến từ đâu' },
      { a: ['Oh, nice! What do you do?', 'Oh, nice! And what do you do?', 'Oh, how lovely! And what do you do?'],
        h: ['I\'m a student. I study English.', 'I\'m a student. I study business at the university.', 'I\'m studying business at the university, and I work part-time in a café.'], tip: 'Nói về công việc hoặc việc học của bạn',
        br: [['student|study|school|university', 'Oh, that\'s great.'], ['work|job|teacher|engineer|nurse|doctor', 'Oh, interesting!']] },
      { a: ['Do you like it here?', 'Do you like living here?', 'So, how do you like living around here?'],
        h: ['Yes, I like it. It\'s quiet.', 'Yes, I really like it. It\'s quiet and the people are friendly.', 'I love it – it\'s quiet, but there are lots of nice cafés nearby.'], tip: 'Nói bạn có thích nơi này không và vì sao' },
      { a: ['Me too. Do you want a coffee some time?', 'Me too. Would you like to have a coffee some time?', 'Same here. We should get a coffee some time – are you free this weekend?'],
        h: ['Yes, thank you! Saturday is good for me.', 'I\'d love to! Are you free on Saturday?', 'That sounds great! Saturday morning works for me, if that suits you.'], tip: 'Nhận lời mời và gợi ý một ngày',
        br: [['busy|can\'t|cannot|sorry', 'No problem – maybe another time!'], ['yes|love|sure|great|ok|okay', 'Great!']] },
    ],
    end: ['Great. See you on Saturday. Bye!', 'Perfect – see you on Saturday. Bye!', 'Perfect, see you on Saturday then. Have a nice evening!'],
  });

  add({
    id: 'cafe', em: '☕', title: 'Ordering at a café',
    ai: { name: 'Tom', role: 'barista in a busy café', persona: 'cheerful and quick, but kind to people who are learning English', goal: 'take the learner\'s order and payment' },
    you: 'Order a drink and something to eat, choose the size, say if it is for here or to go, and pay.',
    cando: 'Gọi đồ uống, chọn cỡ ly và thanh toán ở quán cà phê',
    vocab: [['latte', 'coffee with a lot of hot milk'], ['for here', 'you will eat or drink in the café'], ['to go', 'you will take it with you'], ['size', 'how big something is'], ['cash', 'money in coins and notes'], ['card', 'a bank card for paying'], ['the counter', 'the long table where you order and pay']],
    turns: [
      { a: ['Hi! What can I get you?', 'Hi there! What can I get for you?', 'Morning! What can I get you today?'],
        h: ['A coffee, please.', 'Can I have a latte, please?', 'Could I get a medium latte with oat milk, please?'], tip: 'Gọi đồ uống, nhớ nói "please"' },
      { a: ['Small or large?', 'Sure. Small, medium or large?', 'Sure thing. What size would you like?'],
        h: ['Large, please.', 'Medium, please.', 'A medium, please – not too hot, if possible.'], tip: 'Chọn cỡ ly',
        br: [['small', 'Small – okay.'], ['medium', 'Medium – great.'], ['large|big', 'Large – okay.']] },
      { a: ['For here or to go?', 'Is that for here or to go?', 'Are you having that here or taking it away?'],
        h: ['For here, please.', 'For here, please. And can I have a croissant too?', 'I\'ll have it here, thanks. Could I also get a croissant?'], tip: 'Nói uống tại quán hay mang đi; có thể gọi thêm đồ ăn',
        br: [['croissant|cake|muffin|sandwich|cookie', 'Sure, no problem.'], ['go|take|away', 'Okay, I\'ll put a lid on it.']] },
      { a: ['That\'s five pounds fifty. Cash or card?', 'That comes to five fifty. Cash or card?', 'That\'ll be five pounds fifty altogether. Are you paying by card?'],
        h: ['Card, please.', 'Card, please. Here you are.', 'Yes, by card, please – can I just tap?'], tip: 'Chọn trả bằng tiền mặt hay thẻ' },
      { a: ['Thank you. Your name, please?', 'Thanks! Can I get a name for the order?', 'Lovely. And what name shall I put on the cup?'],
        h: ['My name is Sam.', 'It\'s Sam. S-A-M.', 'It\'s Sam – S, A, M. Thanks very much!'], tip: 'Nói tên và đánh vần nếu cần' },
    ],
    end: ['Thank you, Sam. It\'s ready in two minutes.', 'Thanks, Sam! It\'ll be ready in two minutes.', 'Thanks, Sam – it\'ll be ready at the end of the counter in a couple of minutes.'],
  });

  add({
    id: 'shop', em: '👕', title: 'Buying clothes in a shop',
    ai: { name: 'Mia', role: 'shop assistant in a clothes shop', persona: 'helpful and polite, speaks clearly', goal: 'help the learner find the right T-shirt and sell it' },
    you: 'Ask for a T-shirt, say your size and colour, try it on, say how it fits, and pay.',
    cando: 'Hỏi cỡ, màu, thử đồ và mua hàng ở cửa hàng quần áo',
    vocab: [['size', 'small, medium or large'], ['try on', 'put on clothes to see if they are right'], ['fit', 'be the right size'], ['changing room', 'a small room in a shop where you try on clothes'], ['receipt', 'a paper that shows what you paid'], ['colour', 'red, blue, green and so on']],
    turns: [
      { a: ['Hello! Can I help you?', 'Hi! Can I help you with anything?', 'Hi there! Are you looking for anything in particular?'],
        h: ['Yes, please. I want a T-shirt.', 'Yes, please. I\'m looking for a T-shirt.', 'Yes, actually – I\'m looking for a plain T-shirt for work.'], tip: 'Nói món đồ bạn muốn mua' },
      { a: ['What size are you?', 'Sure. What size are you?', 'Of course. What size do you usually take?'],
        h: ['Medium, please.', 'I\'m a medium, I think.', 'Usually a medium, but it depends on the brand.'], tip: 'Nói cỡ của bạn (S, M, L…)' },
      { a: ['What colour do you like?', 'We have white, black and blue. Which colour would you like?', 'It comes in white, black and navy. Do you have a colour in mind?'],
        h: ['Blue, please. Can I try it?', 'Could I try the blue one, please?', 'I\'d like to try the navy one, please. Where are the changing rooms?'], tip: 'Chọn màu và xin thử đồ' },
      { a: ['Here you are. How is it?', 'Here you go. How does it fit?', 'There you go. So, how does it fit?'],
        h: ['It\'s good. I like it.', 'It fits well. I really like it.', 'It fits perfectly, actually. I like the colour too.'], tip: 'Nói đồ vừa hay không vừa',
        br: [['small|tight|big|large|long|short|doesn\'t fit', 'Oh, let me get you another size.'], ['good|well|great|perfect|like', 'Great, it looks good on you.']] },
      { a: ['It\'s twenty pounds. Is that OK?', 'It\'s twenty pounds. Would you like to buy it?', 'It\'s twenty pounds, and they\'re half price if you buy two today. Would you like to take it?'],
        h: ['Yes, please. Here is my card.', 'Yes, I\'ll take it, please. Can I pay by card?', 'Yes, I\'ll take it, thanks. Just the one for now – can I pay by card?'], tip: 'Đồng ý mua và hỏi cách thanh toán' },
    ],
    end: ['Yes. Thank you! Have a nice day.', 'Of course. Here\'s your receipt – have a nice day!', 'Of course. Here\'s your receipt – you can return it within thirty days. Have a lovely day!'],
  });

  add({
    id: 'directions', em: '🗺️', title: 'Asking for directions',
    ai: { name: 'Ben', role: 'a local person in the street', persona: 'kind and patient, gives simple directions', goal: 'help the learner find the train station' },
    you: 'Ask the way to the station, check the directions, ask how far it is, and say thank you.',
    cando: 'Hỏi đường, hiểu chỉ dẫn đơn giản (đi thẳng, rẽ trái/phải) và cảm ơn',
    vocab: [['go straight on', 'continue in the same direction'], ['turn left', 'go to the left at a corner'], ['on your right', 'on the right side of you'], ['next to', 'beside'], ['far', 'a long way away'], ['on foot', 'walking'], ['lost', 'not knowing where you are']],
    turns: [
      { a: ['Hi. Are you OK?', 'Hi – are you lost? Can I help?', 'Hi there, you look a bit lost. Can I help at all?'],
        h: ['Excuse me. Where is the train station?', 'Yes, please. How do I get to the train station?', 'Yes, please! Could you tell me the way to the train station?'], tip: 'Mở lời lịch sự ("Excuse me") và hỏi đường tới nơi bạn cần' },
      { a: ['Go straight on. Then turn left.', 'Sure. Go straight on and take the second left.', 'Sure. Go straight down this road and take the second turning on the left.'],
        h: ['Straight on, then left. OK.', 'So straight on, then the second left?', 'So straight on, and then the second left – got it.'], tip: 'Nhắc lại chỉ dẫn để chắc mình hiểu đúng' },
      { a: ['Yes. The station is on the right.', 'That\'s right. Then the station is on your right, next to the bank.', 'Exactly. Then you\'ll see the station on your right, just past the bank.'],
        h: ['Is it far?', 'Is it far from here?', 'Is it far? Should I take a bus?'], tip: 'Hỏi đường có xa không' },
      { a: ['No. Ten minutes on foot.', 'No, it\'s about ten minutes on foot.', 'Not really – it\'s about a ten-minute walk, so you don\'t need the bus.'],
        h: ['Great. Thank you very much!', 'Great, thank you so much for your help!', 'Perfect – thanks so much, that\'s really kind of you.'], tip: 'Cảm ơn người đã giúp bạn' },
      { a: ['You\'re welcome. Where are you going?', 'No problem. Where are you going today?', 'No problem at all. Where are you heading?'],
        h: ['I\'m going to London.', 'I\'m going to London to see a friend.', 'I\'m heading to London to visit a friend for the weekend.'], tip: 'Nói bạn đi đâu và để làm gì' },
    ],
    end: ['Nice! Have a good trip!', 'Lovely! Have a great trip!', 'Lovely – enjoy your weekend in London!'],
  });

  add({
    id: 'hotel', em: '🏨', title: 'Checking in at a hotel',
    ai: { name: 'Sofia', role: 'receptionist at a city hotel', persona: 'professional, warm and clear', goal: 'check the learner in and answer their questions' },
    you: 'Check in with your reservation, show your passport, confirm your booking, and ask about breakfast, Wi-Fi and check-out.',
    cando: 'Nhận phòng khách sạn: nói tên đặt phòng, hỏi giờ ăn sáng, Wi-Fi và giờ trả phòng',
    vocab: [['reservation', 'a room you booked before you arrived'], ['check in', 'arrive at a hotel and get your key'], ['check out', 'pay and leave a hotel'], ['double room', 'a room for two people with one big bed'], ['key card', 'a plastic card that opens your room'], ['included', 'part of the price'], ['ground floor', 'the floor at street level']],
    turns: [
      { a: ['Good evening. Welcome to the Park Hotel.', 'Good evening, welcome to the Park Hotel. How can I help?', 'Good evening and welcome to the Park Hotel. Are you checking in?'],
        h: ['Hello. I have a room. My name is Sam Lee.', 'Hi, I have a reservation. My name is Sam Lee.', 'Good evening. Yes, I have a reservation under the name Sam Lee.'], tip: 'Nói bạn đã đặt phòng và cho biết tên' },
      { a: ['Thank you. Your passport, please.', 'Thank you. Can I see your passport, please?', 'Lovely, thank you. Could I see your passport or ID, please?'],
        h: ['Here you are.', 'Sure, here you are.', 'Of course – here you go.'], tip: 'Đưa giấy tờ và nói "Here you are"' },
      { a: ['You have a double room for two nights.', 'So, that\'s a double room for two nights, until Friday.', 'Right, I can see a double room for two nights, checking out on Friday. Is that correct?'],
        h: ['Yes. What time is breakfast?', 'Yes, that\'s right. What time is breakfast?', 'Yes, that\'s correct. Is breakfast included, and what time is it served?'], tip: 'Xác nhận đặt phòng và hỏi giờ ăn sáng' },
      { a: ['Breakfast is from seven to ten.', 'Breakfast is from seven to ten in the restaurant.', 'Breakfast is included – it\'s served from seven till ten in the restaurant on the ground floor.'],
        h: ['Thank you. Is there Wi-Fi?', 'Great. And is there Wi-Fi in the room?', 'Great. And what\'s the Wi-Fi password, please?'], tip: 'Hỏi về Wi-Fi hoặc dịch vụ khác' },
      { a: ['Yes. The password is on your key card. Your room is 305.', 'Yes, the password is on your key card. You\'re in room 305, on the third floor.', 'The password is on the back of your key card. You\'re in room 305 on the third floor – the lifts are just behind you.'],
        h: ['Thank you. What time is check-out?', 'Thank you. What time is check-out?', 'Perfect, thanks. And what time is check-out on Friday?'], tip: 'Cảm ơn và hỏi giờ trả phòng' },
    ],
    end: ['Check-out is at eleven. Have a nice stay!', 'Check-out is at eleven. Enjoy your stay!', 'Check-out is at eleven. If you need anything, just call reception. Enjoy your stay!'],
  });

  add({
    id: 'doctor', em: '🩺', title: 'At the doctor\'s',
    ai: { name: 'Dr Patel', role: 'family doctor', persona: 'calm, kind, asks simple questions one at a time', goal: 'understand the learner\'s symptoms and give simple advice' },
    you: 'Describe your symptoms, say when they started, answer the doctor\'s questions, and ask how long it will take to get better.',
    cando: 'Nói triệu chứng và thời gian bị bệnh với bác sĩ, hiểu lời khuyên đơn giản',
    vocab: [['headache', 'a pain in your head'], ['sore throat', 'a pain in your throat'], ['temperature', 'body heat that is higher than normal'], ['medicine', 'something you take to get better'], ['a cold', 'a common illness with a runny nose and a cough'], ['rest', 'relax and do not work'], ['get better', 'become healthy again']],
    turns: [
      { a: ['Hello. Please sit down. What\'s the problem?', 'Hello, please take a seat. What seems to be the problem?', 'Hello, come in and have a seat. So, what brings you in today?'],
        h: ['I\'m ill. I have a headache.', 'I don\'t feel well. I have a bad headache and a sore throat.', 'I haven\'t been feeling well. I\'ve got a bad headache and a sore throat.'], tip: 'Nói bạn bị đau ở đâu ("I have a headache")' },
      { a: ['When did it start?', 'I\'m sorry to hear that. When did it start?', 'Oh dear. How long have you had these symptoms?'],
        h: ['Two days ago.', 'It started two days ago.', 'For about two days now – it started on Monday evening.'], tip: 'Nói bệnh bắt đầu từ khi nào' },
      { a: ['Do you have a temperature?', 'I see. Do you have a temperature?', 'Right. Have you had a temperature at all?'],
        h: ['Yes, a little.', 'Yes, I think so. I feel hot and tired.', 'Yes, a slight one – I\'ve been feeling hot and really tired.'], tip: 'Trả lời có sốt không và bạn thấy thế nào',
        br: [['no|not', 'Okay, that\'s good.'], ['yes|hot|little|bit', 'I see.']] },
      { a: ['Do you take any medicine?', 'Are you taking any medicine at the moment?', 'Are you taking anything for it at the moment?'],
        h: ['No, I don\'t.', 'Just some paracetamol for the headache.', 'Only some paracetamol for the headache, but it doesn\'t help much.'], tip: 'Nói bạn có đang uống thuốc gì không' },
      { a: ['OK. It\'s a cold. Rest and drink water.', 'It looks like a cold. Rest, drink lots of water, and you can take paracetamol.', 'It looks like a virus, so antibiotics won\'t help. Get plenty of rest, drink lots of fluids and keep taking paracetamol.'],
        h: ['OK. How many days?', 'Okay. How long will it take to get better?', 'Okay, thank you. How long should it take to clear up?'], tip: 'Hỏi bao lâu thì khỏi' },
    ],
    end: ['About one week. Come back if it gets worse. Get well soon!', 'About a week. Come back if you don\'t feel better. Get well soon!', 'Usually about a week. If it gets worse, or you\'re not better in ten days, come back and see me. Get well soon!'],
  });
})(typeof self !== 'undefined' ? self : this);
