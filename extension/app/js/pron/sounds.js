/* Phát âm – 44 âm IPA (tự biên soạn) */
(function (g) {
  const P = g.PRON = g.PRON || [];

  /* ================= 12 NGUYÊN ÂM ĐƠN ================= */
  P.push({
    id: 'iː', group: 'vowels', ipa: '/iː/', title: 'Nguyên âm dài /iː/', emoji: '😁', level: 'A1',
    mouth: { height: 'close', back: 'front', lips: 'spread', jaw: 'close', long: true, voiced: true },
    how: 'Lưỡi nâng cao ở phía trước, đầu lưỡi chạm nhẹ răng dưới. Môi kéo sang hai bên như đang cười, hàm gần khép. Giữ âm dài và căng.',
    vn: 'Người Việt hay đọc ngắn như "i" nên "sheep" nghe thành "ship". Hãy kéo dài gấp đôi và giữ môi căng đến hết âm.',
    tip: 'Giống "i" trong "đi" nhưng kéo dài như khi nói "iii" lúc chụp ảnh.',
    words: [
      { w: 'sheep', ipa: '/ʃiːp/' }, { w: 'leave', ipa: '/liːv/' }, { w: 'teacher', ipa: '/ˈtiːtʃə/' }, { w: 'believe', ipa: '/bɪˈliːv/' },
      { w: 'increase', ipa: '/ɪnˈkriːs/' }, { w: 'achieve', ipa: '/əˈtʃiːv/' }, { w: 'people', ipa: '/ˈpiːpl/' }, { w: 'degree', ipa: '/dɪˈɡriː/' }
    ],
    pairs: [['ship', 'sheep'], ['live', 'leave'], ['fill', 'feel'], ['bit', 'beat'], ['sit', 'seat']],
    sentences: ['Please leave the keys on the seat.', 'We need three people to agree on each team.']
  });
  P.push({
    id: 'ɪ', group: 'vowels', ipa: '/ɪ/', title: 'Nguyên âm ngắn /ɪ/', emoji: '🙂', level: 'A1',
    mouth: { height: 'near-close', back: 'near-front', lips: 'neutral', jaw: 'near-close', long: false, voiced: true },
    how: 'Lưỡi cao ở phía trước nhưng thấp hơn và lùi vào hơn /iː/ một chút. Hàm hé hơn /iː/ một chút, môi thả lỏng (không kéo như khi cười). Âm ngắn, lỏng và dứt khoát.',
    vn: 'Dễ bị đọc thành "i" căng của tiếng Việt hoặc kéo dài. Thả lỏng cơ miệng, âm hơi ngả về "ê" và cắt ngắn.',
    tip: 'Nằm giữa "i" và "ê" của tiếng Việt, nói nhanh và lỏng miệng.',
    words: [
      { w: 'ship', ipa: '/ʃɪp/' }, { w: 'city', ipa: '/ˈsɪti/' }, { w: 'minute', ipa: '/ˈmɪnɪt/' }, { w: 'finish', ipa: '/ˈfɪnɪʃ/' },
      { w: 'village', ipa: '/ˈvɪlɪdʒ/' }, { w: 'business', ipa: '/ˈbɪznəs/' }, { w: 'women', ipa: '/ˈwɪmɪn/' }, { w: 'visit', ipa: '/ˈvɪzɪt/' }
    ],
    pairs: [['sit', 'seat'], ['fit', 'feet'], ['hill', 'heel'], ['pin', 'pen'], ['did', 'dead']],
    sentences: ['This big city is busy with visitors.', 'Did Jim finish his English quiz in six minutes?']
  });
  P.push({
    id: 'e', group: 'vowels', ipa: '/e/', title: 'Nguyên âm ngắn /e/', emoji: '😬', level: 'A1',
    mouth: { height: 'mid', back: 'front', lips: 'spread', jaw: 'mid', long: false, voiced: true },
    how: 'Lưỡi ở phía trước, độ cao trung bình. Môi hơi kéo ngang, hàm mở vừa phải. Âm ngắn.',
    vn: 'Thường bị lẫn với /æ/ (pen – pan). Với /e/ hàm chỉ mở vừa, không hạ sâu như /æ/.',
    tip: 'Gần với "e" trong "xe" nhưng ngắn và hơi khép hơn.',
    words: [
      { w: 'bed', ipa: '/bed/' }, { w: 'friend', ipa: '/frend/' }, { w: 'many', ipa: '/ˈmeni/' }, { w: 'health', ipa: '/helθ/' },
      { w: 'said', ipa: '/sed/' }, { w: 'energy', ipa: '/ˈenədʒi/' }, { w: 'method', ipa: '/ˈmeθəd/' }, { w: 'technology', ipa: '/tekˈnɒlədʒi/' }
    ],
    pairs: [['pen', 'pan'], ['bed', 'bad'], ['men', 'man'], ['said', 'sad'], ['head', 'had']],
    sentences: ['My friend Ben said the test went well.', 'Getting enough rest helps your health and memory.']
  });
  P.push({
    id: 'æ', group: 'vowels', ipa: '/æ/', title: 'Nguyên âm ngắn /æ/', emoji: '😮', level: 'A2',
    mouth: { height: 'near-open', back: 'front', lips: 'spread', jaw: 'open', long: false, voiced: true },
    how: 'Hạ hàm xuống rõ rệt, lưỡi thấp và nằm phía trước, môi kéo ngang. Âm ngắn, nghe như lai giữa "e" và "a".',
    vn: 'Hay đọc thành "e" hoặc "a" thuần Việt. Hãy mở miệng như định nói "a" nhưng giữ khẩu hình "e".',
    tip: 'Nói "e" rồi hạ cằm xuống thật thấp mà không đổi lưỡi.',
    words: [
      { w: 'cat', ipa: '/kæt/' }, { w: 'bad', ipa: '/bæd/' }, { w: 'family', ipa: '/ˈfæməli/' }, { w: 'happy', ipa: '/ˈhæpi/' },
      { w: 'plan', ipa: '/plæn/' }, { w: 'traffic', ipa: '/ˈtræfɪk/' }, { w: 'factor', ipa: '/ˈfæktə/' }, { w: 'language', ipa: '/ˈlæŋɡwɪdʒ/' }
    ],
    pairs: [['bad', 'bed'], ['man', 'men'], ['sat', 'set'], ['cap', 'cup'], ['hat', 'hut']],
    sentences: ['The black cat sat on Dan\'s mat.', 'Pack a map and a snack for the traffic jam.']
  });
  P.push({
    id: 'ɑː', group: 'vowels', ipa: '/ɑː/', title: 'Nguyên âm dài /ɑː/', emoji: '😲', level: 'A1',
    mouth: { height: 'open', back: 'back', lips: 'neutral', jaw: 'open', long: true, voiced: true },
    how: 'Mở miệng rộng, lưỡi thấp và lùi về sau. Môi thả lỏng, không tròn. Kéo dài âm. Trong giọng Anh, chữ r sau nó không đọc.',
    vn: 'Hay đọc ngắn như "a" hoặc cố uốn chữ r (car → "ca-rờ"). Giữ âm dài và bỏ r ở cuối.',
    tip: 'Như "a" khi bác sĩ bảo "há miệng ra", kéo dài và sâu trong họng.',
    words: [
      { w: 'car', ipa: '/kɑː/' }, { w: 'father', ipa: '/ˈfɑːðə/' }, { w: 'start', ipa: '/stɑːt/' }, { w: 'heart', ipa: '/hɑːt/' },
      { w: 'park', ipa: '/pɑːk/' }, { w: 'class', ipa: '/klɑːs/' }, { w: 'answer', ipa: '/ˈɑːnsə/' }, { w: 'large', ipa: '/lɑːdʒ/' }
    ],
    pairs: [['cart', 'cut'], ['heart', 'hut'], ['march', 'much'], ['calm', 'come'], ['dark', 'duck']],
    sentences: ['Park the car far from the market.', 'My father started a large art class.']
  });
  P.push({
    id: 'ɒ', group: 'vowels', ipa: '/ɒ/', title: 'Nguyên âm ngắn /ɒ/', emoji: '😯', level: 'A1',
    mouth: { height: 'open', back: 'back', lips: 'round', jaw: 'open', long: false, voiced: true },
    how: 'Lưỡi thấp và lùi sau, hàm mở khá rộng, môi hơi tròn nhẹ. Âm ngắn. Đây là âm đặc trưng của giọng Anh (giọng Mỹ thường đọc thành "a").',
    vn: 'Hay đọc thành "o" căng của tiếng Việt hoặc kéo dài thành /ɔː/. Giữ ngắn và mở hàm nhiều hơn.',
    tip: 'Giữa "o" và "a": nói "o" ngắn nhưng há miệng to hơn.',
    words: [
      { w: 'hot', ipa: '/hɒt/' }, { w: 'dog', ipa: '/dɒɡ/' }, { w: 'problem', ipa: '/ˈprɒbləm/' }, { w: 'job', ipa: '/dʒɒb/' },
      { w: 'often', ipa: '/ˈɒfn/' }, { w: 'knowledge', ipa: '/ˈnɒlɪdʒ/' }, { w: 'economy', ipa: '/ɪˈkɒnəmi/' }, { w: 'possible', ipa: '/ˈpɒsəbl/' }
    ],
    pairs: [['cot', 'caught'], ['pot', 'port'], ['shot', 'short'], ['spot', 'sport'], ['not', 'nought']],
    sentences: ['Tom often got a hot coffee from the shop.', 'The top problem is the cost of the job.']
  });
  P.push({
    id: 'ɔː', group: 'vowels', ipa: '/ɔː/', title: 'Nguyên âm dài /ɔː/', emoji: '😗', level: 'A2',
    mouth: { height: 'mid', back: 'back', lips: 'round', jaw: 'mid', long: true, voiced: true },
    how: 'Lưỡi lùi sau, độ cao trung bình. Môi tròn và hơi chu ra, hàm mở vừa. Kéo dài âm, không uốn r.',
    vn: 'Hay đọc ngắn như "o" nên "short" nghe thành "shot". Chu môi tròn hơn và giữ âm dài.',
    tip: 'Nằm giữa "o" và "ô" của tiếng Việt: chu môi tròn rồi kéo dài, như "o" trong "to" nhưng khép hàm hơn một chút.',
    words: [
      { w: 'sport', ipa: '/spɔːt/' }, { w: 'water', ipa: '/ˈwɔːtə/' }, { w: 'law', ipa: '/lɔː/' }, { w: 'thought', ipa: '/θɔːt/' },
      { w: 'important', ipa: '/ɪmˈpɔːtnt/' }, { w: 'daughter', ipa: '/ˈdɔːtə/' }, { w: 'record', ipa: '/ˈrekɔːd/' }, { w: 'course', ipa: '/kɔːs/' }
    ],
    pairs: [['caught', 'cot'], ['port', 'pot'], ['short', 'shot'], ['sport', 'spot'], ['walk', 'wok']],
    sentences: ['I bought four short courses in law.', 'Paul walked along the shore before dawn.']
  });
  P.push({
    id: 'ʊ', group: 'vowels', ipa: '/ʊ/', title: 'Nguyên âm ngắn /ʊ/', emoji: '😙', level: 'A1',
    mouth: { height: 'near-close', back: 'near-back', lips: 'round', jaw: 'near-close', long: false, voiced: true },
    how: 'Lưỡi cao ở phía sau nhưng thả lỏng hơn /uː/. Môi tròn nhẹ, không chu mạnh. Âm ngắn.',
    vn: 'Dễ đọc thành "u" căng và dài, làm "full" nghe như "fool". Thả lỏng môi, cắt ngắn âm.',
    tip: 'Giữa "u" và "ư" của tiếng Việt, nói ngắn và lỏng.',
    words: [
      { w: 'book', ipa: '/bʊk/' }, { w: 'good', ipa: '/ɡʊd/' }, { w: 'look', ipa: '/lʊk/' }, { w: 'could', ipa: '/kʊd/' },
      { w: 'woman', ipa: '/ˈwʊmən/' }, { w: 'put', ipa: '/pʊt/' }, { w: 'full', ipa: '/fʊl/' }, { w: 'cook', ipa: '/kʊk/' }
    ],
    pairs: [['full', 'fool'], ['pull', 'pool'], ['would', 'wooed'], ['soot', 'suit']],
    sentences: ['Look, the cook took a good book.', 'Could you put the wood by the woman\'s foot?']
  });
  P.push({
    id: 'uː', group: 'vowels', ipa: '/uː/', title: 'Nguyên âm dài /uː/', emoji: '😚', level: 'A1',
    mouth: { height: 'close', back: 'back', lips: 'round', jaw: 'close', long: true, voiced: true },
    how: 'Lưỡi nâng cao, lùi sau. Môi chu tròn và căng. Kéo dài âm.',
    vn: 'Thường đọc quá ngắn. Hãy giữ môi tròn đến hết âm, đặc biệt trước phụ âm cuối (food, choose).',
    tip: 'Như "u" trong "đu", nhưng kéo dài như tiếng gió "uuu".',
    words: [
      { w: 'food', ipa: '/fuːd/' }, { w: 'school', ipa: '/skuːl/' }, { w: 'blue', ipa: '/bluː/' }, { w: 'true', ipa: '/truː/' },
      { w: 'choose', ipa: '/tʃuːz/' }, { w: 'improve', ipa: '/ɪmˈpruːv/' }, { w: 'computer', ipa: '/kəmˈpjuːtə/' }, { w: 'move', ipa: '/muːv/' }
    ],
    pairs: [['fool', 'full'], ['pool', 'pull'], ['suit', 'soot'], ['wooed', 'would']],
    sentences: ['Choose the blue shoes for school.', 'Sue moved to a new room in June.']
  });
  P.push({
    id: 'ʌ', group: 'vowels', ipa: '/ʌ/', title: 'Nguyên âm ngắn /ʌ/', emoji: '😐', level: 'A2',
    mouth: { height: 'open-mid', back: 'central', lips: 'neutral', jaw: 'open-mid', long: false, voiced: true },
    how: 'Lưỡi nằm ở giữa miệng, khá thấp. Hàm mở khá rộng (rộng hơn khi nói "ơ"), môi thả lỏng tự nhiên. Âm ngắn và gọn.',
    vn: 'Hay đọc thành "a" (cup → "cáp") hoặc "ơ". Âm này gần "â" trong "cân" nhưng hàm mở hơn một chút.',
    tip: 'Gần "â" của tiếng Việt: "cup" gần như "cấp" nhưng không có thanh điệu.',
    words: [
      { w: 'cup', ipa: '/kʌp/' }, { w: 'love', ipa: '/lʌv/' }, { w: 'money', ipa: '/ˈmʌni/' }, { w: 'country', ipa: '/ˈkʌntri/' },
      { w: 'study', ipa: '/ˈstʌdi/' }, { w: 'public', ipa: '/ˈpʌblɪk/' }, { w: 'young', ipa: '/jʌŋ/' }, { w: 'culture', ipa: '/ˈkʌltʃə/' }
    ],
    pairs: [['cup', 'cap'], ['cut', 'cat'], ['much', 'match'], ['hut', 'heart'], ['bun', 'barn']],
    sentences: ['My young brother loves his country.', 'Come and study with us on Sunday.']
  });
  P.push({
    id: 'ɜː', group: 'vowels', ipa: '/ɜː/', title: 'Nguyên âm dài /ɜː/', emoji: '🤔', level: 'B1',
    mouth: { height: 'mid', back: 'central', lips: 'neutral', jaw: 'mid', long: true, voiced: true },
    how: 'Lưỡi nằm ở giữa miệng, độ cao trung bình. Môi thả lỏng, không tròn. Kéo dài, không uốn lưỡi r.',
    vn: 'Hay đọc thành "ơ" ngắn hoặc cố thêm r (work → "uớc-r"). Giữ "ơ" dài và phẳng, không cong lưỡi.',
    tip: 'Như "ơ" khi đang suy nghĩ "ơơơ…", kéo dài và không có thanh.',
    words: [
      { w: 'bird', ipa: '/bɜːd/' }, { w: 'work', ipa: '/wɜːk/' }, { w: 'learn', ipa: '/lɜːn/' }, { w: 'first', ipa: '/fɜːst/' },
      { w: 'research', ipa: '/rɪˈsɜːtʃ/' }, { w: 'early', ipa: '/ˈɜːli/' }, { w: 'world', ipa: '/wɜːld/' }, { w: 'prefer', ipa: '/prɪˈfɜː/' }
    ],
    pairs: [['work', 'walk'], ['bird', 'board'], ['firm', 'farm'], ['heard', 'hard'], ['burn', 'barn']],
    sentences: ['The girl heard birds early this morning.', 'Nurses work hard all over the world.']
  });
  P.push({
    id: 'ə', group: 'vowels', ipa: '/ə/', title: 'Âm schwa /ə/', emoji: '😶', level: 'B1',
    mouth: { height: 'mid', back: 'central', lips: 'neutral', jaw: 'mid', long: false, voiced: true },
    how: 'Âm yếu nhất, xuất hiện ở âm tiết không nhấn. Lưỡi, môi, hàm đều thả lỏng ở vị trí nghỉ; phát ra rất ngắn và nhẹ.',
    vn: 'Người Việt hay đọc rõ từng âm tiết theo mặt chữ (banana → "ba-na-na"). Hãy nhấn âm chính và "nuốt" các âm còn lại thành /ə/.',
    tip: 'Một tiếng "ơ" thật nhẹ và nhanh, gần như không mở miệng.',
    words: [
      { w: 'about', ipa: '/əˈbaʊt/' }, { w: 'today', ipa: '/təˈdeɪ/' }, { w: 'again', ipa: '/əˈɡen/' }, { w: 'support', ipa: '/səˈpɔːt/' },
      { w: 'banana', ipa: '/bəˈnɑːnə/' }, { w: 'teacher', ipa: '/ˈtiːtʃə/' }, { w: 'government', ipa: '/ˈɡʌvənmənt/' }, { w: 'police', ipa: '/pəˈliːs/' }
    ],
    pairs: [['accept', 'except'], ['affect', 'effect'], ['allusion', 'illusion']],
    sentences: ['Ask a doctor about a better solution.', 'The government has a plan to support the police.']
  });

  /* ================= 8 NGUYÊN ÂM ĐÔI ================= */
  P.push({
    id: 'eɪ', group: 'diphthongs', ipa: '/eɪ/', title: 'Nguyên âm đôi /eɪ/', emoji: '👋', level: 'A1',
    mouth: { height: 'mid', back: 'front', lips: 'spread', jaw: 'mid', long: true, voiced: true, to: { height: 'near-close', back: 'near-front', lips: 'neutral', jaw: 'near-close' } },
    how: 'Bắt đầu ở /e/ rồi trượt lưỡi lên về phía /ɪ/. Phần đầu mạnh và dài hơn, phần cuối nhẹ.',
    vn: 'Hay bỏ phần trượt, đọc thành "e" hoặc "ê" đơn nên "late" nghe như "let". Nhớ trượt đến "i" ở cuối.',
    tip: 'Giống "ây" trong "đây" nhưng mở đầu bằng "e".',
    words: [
      { w: 'day', ipa: '/deɪ/' }, { w: 'make', ipa: '/meɪk/' }, { w: 'change', ipa: '/tʃeɪndʒ/' }, { w: 'great', ipa: '/ɡreɪt/' },
      { w: 'station', ipa: '/ˈsteɪʃn/' }, { w: 'famous', ipa: '/ˈfeɪməs/' }, { w: 'paper', ipa: '/ˈpeɪpə/' }, { w: 'explain', ipa: '/ɪkˈspleɪn/' }
    ],
    pairs: [['late', 'let'], ['pain', 'pen'], ['main', 'men'], ['wait', 'wet'], ['taste', 'test']],
    sentences: ['Wait for the train at the station.', 'They made a great change in May.']
  });
  P.push({
    id: 'aɪ', group: 'diphthongs', ipa: '/aɪ/', title: 'Nguyên âm đôi /aɪ/', emoji: '👁️', level: 'A1',
    mouth: { height: 'open', back: 'central', lips: 'neutral', jaw: 'open', long: true, voiced: true, to: { height: 'near-close', back: 'near-front', lips: 'neutral', jaw: 'near-close' } },
    how: 'Bắt đầu với miệng mở rộng ở "a", sau đó nâng hàm và lưỡi trượt về /ɪ/.',
    vn: 'Khá dễ với người Việt ("ai"), nhưng hay quên phụ âm cuối: "like" thành "lai", "time" thành "tai".',
    tip: 'Giống "ai" trong tiếng Việt, nhớ đọc rõ phụ âm theo sau.',
    words: [
      { w: 'time', ipa: '/taɪm/' }, { w: 'like', ipa: '/laɪk/' }, { w: 'right', ipa: '/raɪt/' }, { w: 'child', ipa: '/tʃaɪld/' },
      { w: 'idea', ipa: '/aɪˈdɪə/' }, { w: 'climate', ipa: '/ˈklaɪmət/' }, { w: 'provide', ipa: '/prəˈvaɪd/' }, { w: 'science', ipa: '/ˈsaɪəns/' }
    ],
    pairs: [['bike', 'bake'], ['line', 'lane'], ['mine', 'main'], ['like', 'lake'], ['white', 'wait']],
    sentences: ['I like to ride my bike at night.', 'My wife tries to buy rice every Friday.']
  });
  P.push({
    id: 'ɔɪ', group: 'diphthongs', ipa: '/ɔɪ/', title: 'Nguyên âm đôi /ɔɪ/', emoji: '🧒', level: 'A2',
    mouth: { height: 'open-mid', back: 'back', lips: 'round', jaw: 'open-mid', long: true, voiced: true, to: { height: 'near-close', back: 'near-front', lips: 'neutral', jaw: 'near-close' } },
    how: 'Bắt đầu với môi tròn, lưỡi lùi sau và hàm mở khá (mở hơn /ɔː/ một chút), sau đó thả lỏng môi, khép hàm và đưa lưỡi lên trước về /ɪ/.',
    vn: 'Gần "oi" tiếng Việt nên khá dễ; lỗi chính là mất phụ âm cuối (voice → "voi", point → "poi").',
    tip: 'Như "oi" trong "đói", rồi thêm phụ âm cuối thật rõ.',
    words: [
      { w: 'boy', ipa: '/bɔɪ/' }, { w: 'choice', ipa: '/tʃɔɪs/' }, { w: 'voice', ipa: '/vɔɪs/' }, { w: 'enjoy', ipa: '/ɪnˈdʒɔɪ/' },
      { w: 'noise', ipa: '/nɔɪz/' }, { w: 'point', ipa: '/pɔɪnt/' }, { w: 'avoid', ipa: '/əˈvɔɪd/' }, { w: 'employ', ipa: '/ɪmˈplɔɪ/' }
    ],
    pairs: [['boy', 'buy'], ['toy', 'tie'], ['oil', 'aisle'], ['coin', 'corn'], ['point', 'pint']],
    sentences: ['The boy enjoys his noisy toy.', 'Avoid oily food if you have a choice.']
  });
  P.push({
    id: 'əʊ', group: 'diphthongs', ipa: '/əʊ/', title: 'Nguyên âm đôi /əʊ/', emoji: '🙆', level: 'A1',
    mouth: { height: 'mid', back: 'central', lips: 'neutral', jaw: 'mid', long: true, voiced: true, to: { height: 'near-close', back: 'near-back', lips: 'round', jaw: 'near-close' } },
    how: 'Bắt đầu ở /ə/ (miệng thả lỏng) rồi tròn môi dần về /ʊ/. Giọng Anh bắt đầu từ "ơ", không phải "o".',
    vn: 'Hay đọc thành "ô" đơn (go → "gô"). Cần có chuyển động: "ơ" → "u".',
    tip: 'Nói "ơu" thật liền: "go" nghe như "gơu".',
    words: [
      { w: 'go', ipa: '/ɡəʊ/' }, { w: 'home', ipa: '/həʊm/' }, { w: 'know', ipa: '/nəʊ/' }, { w: 'phone', ipa: '/fəʊn/' },
      { w: 'road', ipa: '/rəʊd/' }, { w: 'only', ipa: '/ˈəʊnli/' }, { w: 'social', ipa: '/ˈsəʊʃl/' }, { w: 'hope', ipa: '/həʊp/' }
    ],
    pairs: [['coat', 'caught'], ['boat', 'bought'], ['low', 'law'], ['woke', 'walk'], ['note', 'not']],
    sentences: ['Don\'t go home alone on that road.', 'I hope Joe phones me tomorrow.']
  });
  P.push({
    id: 'aʊ', group: 'diphthongs', ipa: '/aʊ/', title: 'Nguyên âm đôi /aʊ/', emoji: '😩', level: 'A1',
    mouth: { height: 'open', back: 'central', lips: 'neutral', jaw: 'open', long: true, voiced: true, to: { height: 'near-close', back: 'near-back', lips: 'round', jaw: 'near-close' } },
    how: 'Bắt đầu với miệng mở rộng ở "a", môi thả lỏng, chưa tròn; sau đó khép hàm, lưỡi nâng về phía sau và tròn môi dần về /ʊ/.',
    vn: 'Gần "ao" tiếng Việt; lỗi hay gặp là bỏ phụ âm cuối (house → "hao", mouth → "mao").',
    tip: 'Như "ao" trong "cao", nhưng cuối âm tròn môi về "u" và giữ phụ âm cuối.',
    words: [
      { w: 'house', ipa: '/haʊs/' }, { w: 'now', ipa: '/naʊ/' }, { w: 'town', ipa: '/taʊn/' }, { w: 'mouth', ipa: '/maʊθ/' },
      { w: 'allow', ipa: '/əˈlaʊ/' }, { w: 'amount', ipa: '/əˈmaʊnt/' }, { w: 'crowd', ipa: '/kraʊd/' }, { w: 'found', ipa: '/faʊnd/' }
    ],
    pairs: [['town', 'tone'], ['now', 'no'], ['found', 'fond'], ['shout', 'short'], ['loud', 'load']],
    sentences: ['How about a house in town now?', 'The crowd shouted loudly outside.']
  });
  P.push({
    id: 'ɪə', group: 'diphthongs', ipa: '/ɪə/', title: 'Nguyên âm đôi /ɪə/', emoji: '👂', level: 'A2',
    mouth: { height: 'near-close', back: 'near-front', lips: 'neutral', jaw: 'near-close', long: true, voiced: true, to: { height: 'mid', back: 'central', lips: 'neutral', jaw: 'mid' } },
    how: 'Bắt đầu ở /ɪ/ rồi lướt về /ə/ ở giữa miệng. Không uốn r ở cuối.',
    vn: 'Hay đọc thành "ia" rõ quá hoặc thêm r cuối. Chỉ cần "i" ngắn rồi thả lỏng về "ơ".',
    tip: 'Giống "ia" trong "mía" nhưng phần sau là "ơ" nhẹ: "here" ≈ "hiơ".',
    words: [
      { w: 'here', ipa: '/hɪə/' }, { w: 'near', ipa: '/nɪə/' }, { w: 'clear', ipa: '/klɪə/' }, { w: 'year', ipa: '/jɪə/' },
      { w: 'idea', ipa: '/aɪˈdɪə/' }, { w: 'career', ipa: '/kəˈrɪə/' }, { w: 'experience', ipa: '/ɪkˈspɪəriəns/' }, { w: 'period', ipa: '/ˈpɪəriəd/' }
    ],
    pairs: [['here', 'hair'], ['beer', 'bear'], ['fear', 'fair'], ['cheer', 'chair'], ['pier', 'pair']],
    sentences: ['Is there a shop near here?', 'This year my career idea is clear.']
  });
  P.push({
    id: 'eə', group: 'diphthongs', ipa: '/eə/', title: 'Nguyên âm đôi /eə/', emoji: '💇', level: 'A2',
    mouth: { height: 'open-mid', back: 'front', lips: 'neutral', jaw: 'open-mid', long: true, voiced: true, to: { height: 'mid', back: 'central', lips: 'neutral', jaw: 'mid' } },
    how: 'Bắt đầu ở /e/ rồi lướt về /ə/. Trong RP hiện đại phần cuối rất nhẹ, gần như một "e" dài. Không uốn r.',
    vn: 'Dễ lẫn với /ɪə/ (hair – here). Với /eə/ hàm mở hơn, bắt đầu bằng "e" chứ không phải "i".',
    tip: 'Nói "e" kéo dài rồi thả về "ơ": "care" ≈ "kheơ".',
    words: [
      { w: 'hair', ipa: '/heə/' }, { w: 'care', ipa: '/keə/' }, { w: 'where', ipa: '/weə/' }, { w: 'there', ipa: '/ðeə/' },
      { w: 'share', ipa: '/ʃeə/' }, { w: 'aware', ipa: '/əˈweə/' }, { w: 'parent', ipa: '/ˈpeərənt/' }, { w: 'area', ipa: '/ˈeəriə/' }
    ],
    pairs: [['hair', 'here'], ['bear', 'beer'], ['fair', 'fear'], ['chair', 'cheer'], ['pair', 'pier']],
    sentences: ['Where is the chair? It\'s over there.', 'Parents should share the care fairly.']
  });
  P.push({
    id: 'ʊə', group: 'diphthongs', ipa: '/ʊə/', title: 'Nguyên âm đôi /ʊə/', emoji: '🧳', level: 'B2',
    mouth: { height: 'near-close', back: 'near-back', lips: 'round', jaw: 'near-close', long: true, voiced: true, to: { height: 'mid', back: 'central', lips: 'neutral', jaw: 'mid' } },
    how: 'Bắt đầu ở /ʊ/ với môi tròn nhẹ rồi thả về /ə/. Nhiều người Anh trẻ nay đọc các từ này bằng /ɔː/ (sure = /ʃɔː/), cả hai đều được chấp nhận.',
    vn: 'Hay đọc thành "ua" rõ hoặc thêm r. Chỉ cần "u" ngắn và lướt nhẹ về "ơ".',
    tip: 'Gần "ua" trong "mua" nhưng phần sau là "ơ" nhẹ: "tour" ≈ "tuơ".',
    words: [
      { w: 'tour', ipa: '/tʊə/' }, { w: 'pure', ipa: '/pjʊə/' }, { w: 'cure', ipa: '/kjʊə/' }, { w: 'sure', ipa: '/ʃʊə/' },
      { w: 'poor', ipa: '/pʊə/' }, { w: 'tourist', ipa: '/ˈtʊərɪst/' }, { w: 'jury', ipa: '/ˈdʒʊəri/' }, { w: 'plural', ipa: '/ˈplʊərəl/' }
    ],
    pairs: [['tour', 'tore'], ['poor', 'pour'], ['sure', 'shore'], ['moor', 'more']],
    sentences: ['Are you sure the water is pure?', 'The tourist went on a tour with a poor guide.']
  });

  /* ================= 24 PHỤ ÂM ================= */
  P.push({
    id: 'p', group: 'consonants', ipa: '/p/', title: 'Phụ âm /p/', emoji: '💨', level: 'A1',
    mouth: { place: 'lips', manner: 'stop', voiced: false, aspirated: true },
    how: 'Hai môi khép lại, giữ hơi rồi bật mạnh ra. Không rung dây thanh. Đầu từ có luồng hơi bật rõ (đặt tờ giấy trước miệng sẽ thấy giấy rung).',
    vn: 'Chữ "p" tiếng Việt gần như không bật hơi, nên "pen" nghe như "ben". Khi ở cuối từ (stop, help) cần khép môi rõ, đừng bỏ.',
    tip: 'Thổi nhẹ như thổi nến khi bật môi.',
    words: [
      { w: 'park', ipa: '/pɑːk/' }, { w: 'people', ipa: '/ˈpiːpl/' }, { w: 'paper', ipa: '/ˈpeɪpə/' }, { w: 'happy', ipa: '/ˈhæpi/' },
      { w: 'help', ipa: '/help/' }, { w: 'stop', ipa: '/stɒp/' }, { w: 'policy', ipa: '/ˈpɒləsi/' }, { w: 'opportunity', ipa: '/ˌɒpəˈtjuːnəti/' }
    ],
    pairs: [['pea', 'bee'], ['pack', 'back'], ['pie', 'buy'], ['cap', 'cab'], ['rope', 'robe']],
    sentences: ['Put the paper cups in the pink pot.', 'Peter plans to help people in poor places.']
  });
  P.push({
    id: 'b', group: 'consonants', ipa: '/b/', title: 'Phụ âm /b/', emoji: '🎈', level: 'A1',
    mouth: { place: 'lips', manner: 'stop', voiced: true },
    how: 'Hai môi khép rồi mở ra như /p/ nhưng có rung dây thanh và hơi bật yếu hơn.',
    vn: '"b" đầu từ khá giống tiếng Việt. Lỗi chính là mất /b/ ở cuối từ (job → "jóp" hoặc "jo"). Khép môi và giữ rung một chút.',
    tip: 'Đặt tay lên cổ: phải thấy rung khi nói /b/, không rung khi nói /p/.',
    words: [
      { w: 'book', ipa: '/bʊk/' }, { w: 'big', ipa: '/bɪɡ/' }, { w: 'bus', ipa: '/bʌs/' }, { w: 'job', ipa: '/dʒɒb/' },
      { w: 'number', ipa: '/ˈnʌmbə/' }, { w: 'public', ipa: '/ˈpʌblɪk/' }, { w: 'believe', ipa: '/bɪˈliːv/' }, { w: 'global', ipa: '/ˈɡləʊbl/' }
    ],
    pairs: [['bat', 'pat'], ['bear', 'pear'], ['cab', 'cap'], ['robe', 'rope'], ['bin', 'pin']],
    sentences: ['Bob bought a big blue bag.', 'The job will be a big benefit to the public.']
  });
  P.push({
    id: 't', group: 'consonants', ipa: '/t/', title: 'Phụ âm /t/', emoji: '⏱️', level: 'A1',
    mouth: { place: 'ridge', manner: 'stop', voiced: false, aspirated: true },
    how: 'Đầu lưỡi chạm lợi trên (phần gồ sau răng cửa), chặn hơi rồi bật ra. Không rung. Đầu từ bật hơi mạnh.',
    vn: '"t" tiếng Việt chạm răng và không bật hơi; "t" tiếng Anh ở lợi và bật hơi, gần "th" Việt hơn. Ở cuối từ (light, test) đừng bỏ âm.',
    tip: '"ten" nghe gần "thèn" (chữ "th" tiếng Việt, có luồng hơi) hơn là "ten" tiếng Việt.',
    words: [
      { w: 'time', ipa: '/taɪm/' }, { w: 'ten', ipa: '/ten/' }, { w: 'water', ipa: '/ˈwɔːtə/' }, { w: 'student', ipa: '/ˈstjuːdnt/' },
      { w: 'important', ipa: '/ɪmˈpɔːtnt/' }, { w: 'light', ipa: '/laɪt/' }, { w: 'test', ipa: '/test/' }, { w: 'little', ipa: '/ˈlɪtl/' }
    ],
    pairs: [['tie', 'die'], ['town', 'down'], ['ten', 'den'], ['bet', 'bed'], ['write', 'ride']],
    sentences: ['Tom took two tests at ten.', 'It\'s time to start the travel talk.']
  });
  P.push({
    id: 'd', group: 'consonants', ipa: '/d/', title: 'Phụ âm /d/', emoji: '🥁', level: 'A1',
    mouth: { place: 'ridge', manner: 'stop', voiced: true },
    how: 'Đầu lưỡi chạm lợi trên như /t/ nhưng rung dây thanh và bật hơi nhẹ.',
    vn: '"đ" tiếng Việt là âm hút hơi vào trong (nghe hơi "nuốt"); /d/ tiếng Anh đẩy hơi ra bình thường, đầu lưỡi chạm lợi trên. Đừng đọc chữ "d" thành "z" kiểu tiếng Việt, và đừng bỏ /d/ cuối (food, good).',
    tip: 'Gần "đ" nhưng không hút hơi vào; đầu lưỡi đặt ở lợi trên và cuối từ vẫn phải nghe được.',
    words: [
      { w: 'day', ipa: '/deɪ/' }, { w: 'door', ipa: '/dɔː/' }, { w: 'idea', ipa: '/aɪˈdɪə/' }, { w: 'study', ipa: '/ˈstʌdi/' },
      { w: 'good', ipa: '/ɡʊd/' }, { w: 'food', ipa: '/fuːd/' }, { w: 'decide', ipa: '/dɪˈsaɪd/' }, { w: 'develop', ipa: '/dɪˈveləp/' }
    ],
    pairs: [['die', 'tie'], ['down', 'town'], ['bed', 'bet'], ['ride', 'write'], ['card', 'cart']],
    sentences: ['David did a good deed today.', 'Dad decided to drive down the road.']
  });
  P.push({
    id: 'k', group: 'consonants', ipa: '/k/', title: 'Phụ âm /k/', emoji: '🔑', level: 'A1',
    mouth: { place: 'back', manner: 'stop', voiced: false, aspirated: true },
    how: 'Cuống lưỡi nâng chạm ngạc mềm, chặn hơi rồi bật ra. Không rung, đầu từ bật hơi mạnh.',
    vn: '"c/k" tiếng Việt không bật hơi, gần /ɡ/ với tai người Anh. Đầu từ cần một luồng hơi bật ra ngay sau âm (nhưng không cọ xát như chữ kh của tiếng Việt); cuối từ (book, back) phải chặn cuống lưỡi rõ để âm không mất.',
    tip: 'Cầm tờ giấy trước miệng: nói "key" thì giấy rung vì có luồng hơi bật ra, còn "ki" tiếng Việt thì không.',
    words: [
      { w: 'cat', ipa: '/kæt/' }, { w: 'key', ipa: '/kiː/' }, { w: 'school', ipa: '/skuːl/' }, { w: 'quick', ipa: '/kwɪk/' },
      { w: 'book', ipa: '/bʊk/' }, { w: 'back', ipa: '/bæk/' }, { w: 'economy', ipa: '/ɪˈkɒnəmi/' }, { w: 'technique', ipa: '/tekˈniːk/' }
    ],
    pairs: [['coat', 'goat'], ['cold', 'gold'], ['back', 'bag'], ['pick', 'pig'], ['class', 'glass']],
    sentences: ['Kate keeps the car keys in the kitchen.', 'Can you come back and pick up the book?']
  });
  P.push({
    id: 'ɡ', group: 'consonants', ipa: '/ɡ/', title: 'Phụ âm /ɡ/', emoji: '🦢', level: 'A1',
    mouth: { place: 'back', manner: 'stop', voiced: true },
    how: 'Cuống lưỡi chạm ngạc mềm như /k/ nhưng rung dây thanh và bật nhẹ.',
    vn: 'Ở cuối từ người Việt hay biến /ɡ/ thành /k/ hoặc bỏ đi (bag → "bác"). Giữ rung ngắn và kéo nguyên âm trước dài hơn một chút.',
    tip: 'Nguyên âm trước /ɡ/ cuối từ dài hơn trước /k/: "bag" dài hơn "back".',
    words: [
      { w: 'go', ipa: '/ɡəʊ/' }, { w: 'good', ipa: '/ɡʊd/' }, { w: 'big', ipa: '/bɪɡ/' }, { w: 'bag', ipa: '/bæɡ/' },
      { w: 'give', ipa: '/ɡɪv/' }, { w: 'again', ipa: '/əˈɡen/' }, { w: 'global', ipa: '/ˈɡləʊbl/' }, { w: 'language', ipa: '/ˈlæŋɡwɪdʒ/' }
    ],
    pairs: [['goat', 'coat'], ['gold', 'cold'], ['bag', 'back'], ['pig', 'pick'], ['glass', 'class']],
    sentences: ['Greg gave the girl a big bag.', 'Good guests go again and again.']
  });
  P.push({
    id: 'f', group: 'consonants', ipa: '/f/', title: 'Phụ âm /f/', emoji: '🐟', level: 'A1',
    mouth: { place: 'teeth', manner: 'fricative', voiced: false },
    how: 'Răng cửa trên chạm nhẹ môi dưới, thổi hơi qua khe hẹp. Không rung dây thanh.',
    vn: 'Đầu từ dễ (giống "ph"), nhưng cuối từ hay bị bỏ: "life" thành "lai", "laugh" thành "la". Giữ răng trên môi và thổi hơi ở cuối.',
    tip: 'Giống "ph" trong "phở", và ở cuối từ vẫn phải nghe tiếng gió.',
    words: [
      { w: 'fish', ipa: '/fɪʃ/' }, { w: 'five', ipa: '/faɪv/' }, { w: 'food', ipa: '/fuːd/' }, { w: 'coffee', ipa: '/ˈkɒfi/' },
      { w: 'life', ipa: '/laɪf/' }, { w: 'enough', ipa: '/ɪˈnʌf/' }, { w: 'laugh', ipa: '/lɑːf/' }, { w: 'effect', ipa: '/ɪˈfekt/' }
    ],
    pairs: [['fan', 'van'], ['fine', 'vine'], ['leaf', 'leave'], ['safe', 'save'], ['fast', 'vast']],
    sentences: ['Five friends found fresh fish.', 'Laugh often, because life is short.']
  });
  P.push({
    id: 'v', group: 'consonants', ipa: '/v/', title: 'Phụ âm /v/', emoji: '✌️', level: 'A1',
    mouth: { place: 'teeth', manner: 'fricative', voiced: true },
    how: 'Răng trên chạm môi dưới như /f/ nhưng rung dây thanh.',
    vn: 'Cuối từ hay bị bỏ hoặc đọc thành /f/: "five" thành "phai", "have" thành "ha" hoặc "háp". Giữ rung đến hết âm.',
    tip: 'Như "v" tiếng Việt; ở cuối từ hãy kéo dài tiếng "vvv" như tiếng ong.',
    words: [
      { w: 'very', ipa: '/ˈveri/' }, { w: 'voice', ipa: '/vɔɪs/' }, { w: 'five', ipa: '/faɪv/' }, { w: 'love', ipa: '/lʌv/' },
      { w: 'have', ipa: '/hæv/' }, { w: 'move', ipa: '/muːv/' }, { w: 'develop', ipa: '/dɪˈveləp/' }, { w: 'environment', ipa: '/ɪnˈvaɪrənmənt/' }
    ],
    pairs: [['van', 'fan'], ['vine', 'fine'], ['leave', 'leaf'], ['save', 'safe'], ['vest', 'best']],
    sentences: ['Vivian loves her very old van.', 'We have five videos to save.']
  });
  P.push({
    id: 'θ', group: 'consonants', ipa: '/θ/', title: 'Phụ âm /θ/', emoji: '👅', level: 'A2',
    mouth: { place: 'tongue-teeth', manner: 'fricative', voiced: false },
    how: 'Đặt đầu lưỡi giữa hai hàm răng (hoặc chạm sau răng trên), thổi hơi qua khe giữa lưỡi và răng. Không rung.',
    vn: 'Tiếng Việt không có âm này nên hay thay bằng "th" Việt (bật hơi), "t" hoặc "s": "think" thành "thinh" hay "sink". Lưỡi phải thò ra giữa răng và hơi xì liên tục.',
    tip: 'Thè đầu lưỡi ra và thổi như xì lốp xe nhẹ.',
    words: [
      { w: 'think', ipa: '/θɪŋk/' }, { w: 'three', ipa: '/θriː/' }, { w: 'thank', ipa: '/θæŋk/' }, { w: 'health', ipa: '/helθ/' },
      { w: 'method', ipa: '/ˈmeθəd/' }, { w: 'mouth', ipa: '/maʊθ/' }, { w: 'author', ipa: '/ˈɔːθə/' }, { w: 'growth', ipa: '/ɡrəʊθ/' }
    ],
    pairs: [['thin', 'tin'], ['three', 'tree'], ['think', 'sink'], ['thought', 'taught'], ['mouth', 'mouse']],
    sentences: ['I think three is enough.', 'Thank you for both healthy methods.']
  });
  P.push({
    id: 'ð', group: 'consonants', ipa: '/ð/', title: 'Phụ âm /ð/', emoji: '😛', level: 'A2',
    mouth: { place: 'tongue-teeth', manner: 'fricative', voiced: true },
    how: 'Lưỡi đặt giữa hai hàm răng như /θ/ nhưng rung dây thanh.',
    vn: 'Hay bị đọc thành "đ" hoặc "d/z" (this → "đít", "dít"). Lưỡi phải ra giữa răng và có tiếng rung liên tục.',
    tip: 'Đặt lưỡi như /θ/ rồi "ngân" lên; chạm tay vào cổ thấy rung.',
    words: [
      { w: 'this', ipa: '/ðɪs/' }, { w: 'the', ipa: '/ðə/' }, { w: 'they', ipa: '/ðeɪ/' }, { w: 'mother', ipa: '/ˈmʌðə/' },
      { w: 'father', ipa: '/ˈfɑːðə/' }, { w: 'weather', ipa: '/ˈweðə/' }, { w: 'although', ipa: '/ɔːlˈðəʊ/' }, { w: 'other', ipa: '/ˈʌðə/' }
    ],
    pairs: [['they', 'day'], ['then', 'den'], ['though', 'dough'], ['breathe', 'breeze'], ['those', 'doze']],
    sentences: ['This is the other brother.', 'Their father and mother like the weather there.']
  });
  P.push({
    id: 's', group: 'consonants', ipa: '/s/', title: 'Phụ âm /s/', emoji: '🐍', level: 'A1',
    mouth: { place: 'ridge', manner: 'fricative', voiced: false },
    how: 'Đầu lưỡi gần lợi trên, hai hàm răng gần khép, đẩy hơi qua khe hẹp tạo tiếng xì. Môi kéo nhẹ, không rung dây thanh.',
    vn: 'Người Việt hay bỏ /s/ ở cuối từ, nhất là số nhiều (books → "búc") và cụm phụ âm (best → "bét"). Luôn đọc rõ tiếng xì ở cuối.',
    tip: 'Tiếng rắn "sss", gần chữ "x" tiếng Việt: đầu lưỡi ở trước, không uốn cong như khi đọc "s" uốn lưỡi.',
    words: [
      { w: 'see', ipa: '/siː/' }, { w: 'sun', ipa: '/sʌn/' }, { w: 'city', ipa: '/ˈsɪti/' }, { w: 'class', ipa: '/klɑːs/' },
      { w: 'increase', ipa: '/ɪnˈkriːs/' }, { w: 'science', ipa: '/ˈsaɪəns/' }, { w: 'best', ipa: '/best/' }, { w: 'books', ipa: '/bʊks/' }
    ],
    pairs: [['see', 'she'], ['sip', 'ship'], ['sock', 'shock'], ['bus', 'buzz'], ['price', 'prize']],
    sentences: ['Sam sees six students in class.', 'Science lessons start at six.']
  });
  P.push({
    id: 'z', group: 'consonants', ipa: '/z/', title: 'Phụ âm /z/', emoji: '🐝', level: 'A1',
    mouth: { place: 'ridge', manner: 'fricative', voiced: true },
    how: 'Vị trí như /s/ (đầu lưỡi gần lợi trên) nhưng rung dây thanh, tạo tiếng như ong vo ve.',
    vn: 'Cuối từ hay bị đọc thành /s/ hoặc bỏ hẳn (dogs, because, choose). Đuôi -s sau âm hữu thanh đọc là /z/.',
    tip: 'Như tiếng ong "zzz"; "d/gi" miền Bắc khá gần, nhưng phải giữ cả ở cuối từ.',
    words: [
      { w: 'zoo', ipa: '/zuː/' }, { w: 'zero', ipa: '/ˈzɪərəʊ/' }, { w: 'easy', ipa: '/ˈiːzi/' }, { w: 'music', ipa: '/ˈmjuːzɪk/' },
      { w: 'because', ipa: '/bɪˈkɒz/' }, { w: 'reason', ipa: '/ˈriːzn/' }, { w: 'choose', ipa: '/tʃuːz/' }, { w: 'dogs', ipa: '/dɒɡz/' }
    ],
    pairs: [['zip', 'sip'], ['buzz', 'bus'], ['prize', 'price'], ['eyes', 'ice'], ['raise', 'race']],
    sentences: ['Zoe\'s dogs are lazy.', 'Choose easy music because it helps you relax.']
  });
  P.push({
    id: 'ʃ', group: 'consonants', ipa: '/ʃ/', title: 'Phụ âm /ʃ/', emoji: '🤫', level: 'A2',
    mouth: { place: 'post-ridge', manner: 'fricative', voiced: false, lips: 'round' },
    how: 'Đầu và mặt lưỡi đặt gần vùng ngay sau lợi trên (lùi sau /s/), thân lưỡi hơi nâng, môi chu tròn ra trước, thổi hơi tạo tiếng "suỵt". Không rung.',
    vn: 'Hay lẫn với /s/ (she – see). Với /ʃ/ môi phải chu ra và lưỡi lùi sau; "s" miền Bắc thường quá giống /s/.',
    tip: 'Như khi ra hiệu im lặng "suỵt!", môi chu tròn.',
    words: [
      { w: 'she', ipa: '/ʃiː/' }, { w: 'ship', ipa: '/ʃɪp/' }, { w: 'shop', ipa: '/ʃɒp/' }, { w: 'sure', ipa: '/ʃʊə/' },
      { w: 'nation', ipa: '/ˈneɪʃn/' }, { w: 'special', ipa: '/ˈspeʃl/' }, { w: 'machine', ipa: '/məˈʃiːn/' }, { w: 'fish', ipa: '/fɪʃ/' }
    ],
    pairs: [['she', 'see'], ['ship', 'sip'], ['shock', 'sock'], ['shoe', 'chew'], ['wash', 'watch']],
    sentences: ['She sells fresh fish at the shop.', 'Show me the special machine, please.']
  });
  P.push({
    id: 'ʒ', group: 'consonants', ipa: '/ʒ/', title: 'Phụ âm /ʒ/', emoji: '📺', level: 'B1',
    mouth: { place: 'post-ridge', manner: 'fricative', voiced: true, lips: 'round' },
    how: 'Khẩu hình giống /ʃ/ (môi chu, đầu lưỡi ở vùng sau lợi) nhưng rung dây thanh. Hiếm khi đứng đầu từ; thường gặp trong -sion, -sure.',
    vn: 'Hay bị đọc thành "d/z" Việt hoặc /ʃ/ không rung (television → "te-lê-vi-sần"). Chu môi và ngân rung.',
    tip: 'Nói "suỵt" /ʃ/ rồi thêm rung ở cổ là ra /ʒ/; gần chữ "r" khi đọc uốn lưỡi (phân biệt r với d/gi).',
    words: [
      { w: 'television', ipa: '/ˈtelɪvɪʒn/' }, { w: 'usually', ipa: '/ˈjuːʒuəli/' }, { w: 'measure', ipa: '/ˈmeʒə/' }, { w: 'decision', ipa: '/dɪˈsɪʒn/' },
      { w: 'pleasure', ipa: '/ˈpleʒə/' }, { w: 'vision', ipa: '/ˈvɪʒn/' }, { w: 'leisure', ipa: '/ˈleʒə/' }, { w: 'garage', ipa: '/ˈɡærɑːʒ/' }
    ],
    pairs: [['vision', 'fission'], ['leisure', 'ledger'], ['beige', 'bays']],
    sentences: ['It\'s a pleasure to watch television in my leisure time.', 'We usually measure each decision carefully.']
  });
  P.push({
    id: 'tʃ', group: 'consonants', ipa: '/tʃ/', title: 'Phụ âm /tʃ/', emoji: '🚂', level: 'A2',
    mouth: { place: 'post-ridge', manner: 'affricate', voiced: false, lips: 'round', aspirated: true },
    how: 'Đầu lưỡi chặn hơi ở vùng ngay sau lợi trên (lùi hơn /t/ một chút) rồi nhả ra thành /ʃ/. Môi chu nhẹ, không rung, có luồng hơi bật ra.',
    vn: '"ch" tiếng Việt mềm, không chu môi và không bật hơi. Cuối từ (watch, much) hay bị mất hẳn. Chu môi và bật một tiếng "tch" ngắn.',
    tip: 'Như tiếng tàu hỏa "choo-choo", môi chu ra.',
    words: [
      { w: 'chair', ipa: '/tʃeə/' }, { w: 'cheap', ipa: '/tʃiːp/' }, { w: 'teacher', ipa: '/ˈtiːtʃə/' }, { w: 'choose', ipa: '/tʃuːz/' },
      { w: 'watch', ipa: '/wɒtʃ/' }, { w: 'much', ipa: '/mʌtʃ/' }, { w: 'nature', ipa: '/ˈneɪtʃə/' }, { w: 'future', ipa: '/ˈfjuːtʃə/' }
    ],
    pairs: [['chair', 'share'], ['chip', 'ship'], ['watch', 'wash'], ['cheap', 'sheep'], ['catch', 'cash']],
    sentences: ['Which child chose the cheap chair?', 'Watch the teacher check each chapter.']
  });
  P.push({
    id: 'dʒ', group: 'consonants', ipa: '/dʒ/', title: 'Phụ âm /dʒ/', emoji: '🤹', level: 'A2',
    mouth: { place: 'post-ridge', manner: 'affricate', voiced: true, lips: 'round' },
    how: 'Đầu lưỡi chặn hơi ở vùng ngay sau lợi trên như /tʃ/ rồi nhả thành /ʒ/, có rung dây thanh. Môi chu nhẹ.',
    vn: 'Hay đọc thành "gi/d" Việt (z) hoặc "ch": "job" → "dóp", "change" → "chen". Lưỡi phải chặn ở vùng sau lợi trước rồi mới nhả.',
    tip: 'Như /tʃ/ nhưng có rung: "jeep" khác "cheap" ở chỗ cổ họng rung.',
    words: [
      { w: 'job', ipa: '/dʒɒb/' }, { w: 'just', ipa: '/dʒʌst/' }, { w: 'change', ipa: '/tʃeɪndʒ/' }, { w: 'age', ipa: '/eɪdʒ/' },
      { w: 'large', ipa: '/lɑːdʒ/' }, { w: 'judge', ipa: '/dʒʌdʒ/' }, { w: 'knowledge', ipa: '/ˈnɒlɪdʒ/' }, { w: 'generation', ipa: '/ˌdʒenəˈreɪʃn/' }
    ],
    pairs: [['jeep', 'cheap'], ['joke', 'choke'], ['ridge', 'rich'], ['badge', 'batch'], ['jet', 'yet']],
    sentences: ['George enjoys orange juice in January.', 'The judge changed the large page.']
  });
  P.push({
    id: 'h', group: 'consonants', ipa: '/h/', title: 'Phụ âm /h/', emoji: '😮‍💨', level: 'A1',
    mouth: { place: 'throat', manner: 'fricative', voiced: false },
    how: 'Miệng đặt sẵn cho nguyên âm theo sau, đẩy luồng hơi nhẹ qua thanh hầu (họng) ra. Không rung dây thanh, không cọ xát ở lưỡi hay môi.',
    vn: 'Gần "h" tiếng Việt; tránh đọc nặng thành "kh". Chú ý từ có h câm (hour, honest) và đừng bỏ h ở từ cần đọc (hair ≠ air).',
    tip: 'Như hà hơi lên kính để lau.',
    words: [
      { w: 'house', ipa: '/haʊs/' }, { w: 'home', ipa: '/həʊm/' }, { w: 'help', ipa: '/help/' }, { w: 'happy', ipa: '/ˈhæpi/' },
      { w: 'hot', ipa: '/hɒt/' }, { w: 'health', ipa: '/helθ/' }, { w: 'behind', ipa: '/bɪˈhaɪnd/' }, { w: 'perhaps', ipa: '/pəˈhæps/' }
    ],
    pairs: [['heat', 'eat'], ['hair', 'air'], ['hold', 'old'], ['hand', 'and'], ['hear', 'ear']],
    sentences: ['Harry has a house on a high hill.', 'Hold my hand and help me home.']
  });
  P.push({
    id: 'm', group: 'consonants', ipa: '/m/', title: 'Phụ âm /m/', emoji: '😋', level: 'A1',
    mouth: { place: 'lips', manner: 'nasal', voiced: true },
    how: 'Hai môi khép kín, hơi thoát ra qua mũi, dây thanh rung.',
    vn: 'Dễ với người Việt; chỉ cần nhớ khép môi ở cuối từ (time, climate) thay vì bỏ hoặc đọc thành "n".',
    tip: 'Như tiếng "ừm" khi ăn ngon, môi khép chặt.',
    words: [
      { w: 'man', ipa: '/mæn/' }, { w: 'money', ipa: '/ˈmʌni/' }, { w: 'time', ipa: '/taɪm/' }, { w: 'home', ipa: '/həʊm/' },
      { w: 'member', ipa: '/ˈmembə/' }, { w: 'family', ipa: '/ˈfæməli/' }, { w: 'climate', ipa: '/ˈklaɪmət/' }, { w: 'improve', ipa: '/ɪmˈpruːv/' }
    ],
    pairs: [['map', 'nap'], ['mine', 'nine'], ['some', 'sun'], ['team', 'teen'], ['meat', 'neat']],
    sentences: ['My mum makes more money in May.', 'Tim came home from the gym at nine.']
  });
  P.push({
    id: 'n', group: 'consonants', ipa: '/n/', title: 'Phụ âm /n/', emoji: '👃', level: 'A1',
    mouth: { place: 'ridge', manner: 'nasal', voiced: true },
    how: 'Đầu lưỡi chạm lợi trên, hơi thoát qua mũi, dây thanh rung.',
    vn: 'Một số vùng lẫn n/l (night – light). Cuối từ, hay đọc nhầm /n/ thành /ŋ/ ("ten" → "teng"): giữ đầu lưỡi chạm lợi.',
    tip: 'Kết thúc /n/ đầu lưỡi ở trên lợi; kết thúc /ŋ/ thì đầu lưỡi nằm dưới.',
    words: [
      { w: 'no', ipa: '/nəʊ/' }, { w: 'night', ipa: '/naɪt/' }, { w: 'money', ipa: '/ˈmʌni/' }, { w: 'nine', ipa: '/naɪn/' },
      { w: 'plan', ipa: '/plæn/' }, { w: 'ten', ipa: '/ten/' }, { w: 'environment', ipa: '/ɪnˈvaɪrənmənt/' }, { w: 'open', ipa: '/ˈəʊpən/' }
    ],
    pairs: [['sin', 'sing'], ['thin', 'thing'], ['ran', 'rang'], ['win', 'wing'], ['night', 'light']],
    sentences: ['Nine new nurses are on the night shift.', 'Ken can\'t run in the rain.']
  });
  P.push({
    id: 'ŋ', group: 'consonants', ipa: '/ŋ/', title: 'Phụ âm /ŋ/', emoji: '🔔', level: 'A2',
    mouth: { place: 'back', manner: 'nasal', voiced: true },
    how: 'Cuống lưỡi chạm ngạc mềm (như /k/), hơi thoát qua mũi, có rung. Trong tiếng Anh âm này không đứng đầu từ.',
    vn: 'Giống "ng" tiếng Việt nên dễ, nhưng hay thêm /k/ hoặc /ɡ/ thừa ("sing" → "sinh-g") hoặc đọc thành "nh". Kết thúc gọn ở mũi.',
    tip: 'Như "ng" trong "sáng" nhưng không có thanh điệu và không bật thêm âm.',
    words: [
      { w: 'sing', ipa: '/sɪŋ/' }, { w: 'long', ipa: '/lɒŋ/' }, { w: 'thing', ipa: '/θɪŋ/' }, { w: 'young', ipa: '/jʌŋ/' },
      { w: 'morning', ipa: '/ˈmɔːnɪŋ/' }, { w: 'English', ipa: '/ˈɪŋɡlɪʃ/' }, { w: 'finger', ipa: '/ˈfɪŋɡə/' }, { w: 'think', ipa: '/θɪŋk/' }
    ],
    pairs: [['sing', 'sin'], ['thing', 'thin'], ['rang', 'ran'], ['wing', 'win'], ['bang', 'ban']],
    sentences: ['The young king is singing a long song.', 'Keep working on your English every morning.']
  });
  P.push({
    id: 'l', group: 'consonants', ipa: '/l/', title: 'Phụ âm /l/', emoji: '👅', level: 'A1',
    mouth: { place: 'ridge', manner: 'approximant', voiced: true, lateral: true },
    how: 'Đầu lưỡi chạm lợi trên, hơi đi ra hai bên lưỡi, dây thanh rung. Ở cuối từ (feel, school) là "l tối": cuống lưỡi nâng lên, nghe hơi giống "âu/ồ".',
    vn: 'Hay bỏ /l/ cuối từ ("school" → "sku") hoặc lẫn n/l. Ở cuối từ, giữ đầu lưỡi chạm lợi một chút.',
    tip: 'Đầu từ như "l" Việt; cuối từ kết thúc bằng lưỡi chạm lợi, đừng ngắt miệng sớm.',
    words: [
      { w: 'light', ipa: '/laɪt/' }, { w: 'love', ipa: '/lʌv/' }, { w: 'learn', ipa: '/lɜːn/' }, { w: 'little', ipa: '/ˈlɪtl/' },
      { w: 'help', ipa: '/help/' }, { w: 'people', ipa: '/ˈpiːpl/' }, { w: 'feel', ipa: '/fiːl/' }, { w: 'school', ipa: '/skuːl/' }
    ],
    pairs: [['light', 'right'], ['lead', 'read'], ['long', 'wrong'], ['collect', 'correct'], ['low', 'no']],
    sentences: ['Please call me later, Lily.', 'Lucy will feel well after a long sleep.']
  });
  P.push({
    id: 'r', group: 'consonants', ipa: '/r/', title: 'Phụ âm /r/', emoji: '🦁', level: 'A2',
    mouth: { place: 'post-ridge', manner: 'approximant', voiced: true, lips: 'round' },
    how: 'Đầu lưỡi cong nhẹ lên vùng sau lợi nhưng không chạm, môi hơi tròn, dây thanh rung. Không rung đầu lưỡi như "r" rung. Giọng Anh chỉ đọc r khi sau nó là nguyên âm (red, very), còn "car", "water" thì không đọc r.',
    vn: 'Hay đọc thành "r" rung lưỡi, "z" (kiểu miền Bắc) hoặc lẫn với /l/. Không để lưỡi chạm đâu cả, môi hơi chu.',
    tip: 'Bắt đầu như "u" chu môi rồi cong lưỡi: "red" ≈ "(u)ret".',
    words: [
      { w: 'red', ipa: '/red/' }, { w: 'right', ipa: '/raɪt/' }, { w: 'road', ipa: '/rəʊd/' }, { w: 'very', ipa: '/ˈveri/' },
      { w: 'sorry', ipa: '/ˈsɒri/' }, { w: 'problem', ipa: '/ˈprɒbləm/' }, { w: 'carry', ipa: '/ˈkæri/' }, { w: 'around', ipa: '/əˈraʊnd/' }
    ],
    pairs: [['right', 'light'], ['read', 'lead'], ['wrong', 'long'], ['correct', 'collect'], ['rice', 'lice']],
    sentences: ['Rose rarely reads on the train.', 'Robert ran around the red bus.']
  });
  P.push({
    id: 'w', group: 'consonants', ipa: '/w/', title: 'Phụ âm /w/', emoji: '😗', level: 'A1',
    mouth: { place: 'lips-back', manner: 'approximant', voiced: true, lips: 'round' },
    how: 'Môi chu tròn và hẹp như /uː/, cuống lưỡi nâng về phía ngạc mềm, dây thanh rung, rồi nhanh chóng mở sang nguyên âm sau. Răng không chạm môi.',
    vn: 'Hay lẫn với /v/ (west → "vest") vì răng chạm môi. Giữ môi tròn, không để răng chạm.',
    tip: 'Giống "qu/oa" trong "quà", "oa": "we" ≈ "uy".',
    words: [
      { w: 'we', ipa: '/wiː/' }, { w: 'water', ipa: '/ˈwɔːtə/' }, { w: 'work', ipa: '/wɜːk/' }, { w: 'world', ipa: '/wɜːld/' },
      { w: 'way', ipa: '/weɪ/' }, { w: 'wait', ipa: '/weɪt/' }, { w: 'quick', ipa: '/kwɪk/' }, { w: 'language', ipa: '/ˈlæŋɡwɪdʒ/' }
    ],
    pairs: [['wet', 'vet'], ['west', 'vest'], ['wine', 'vine'], ['while', 'vile'], ['worse', 'verse']],
    sentences: ['We went west on Wednesday.', 'Will you wait while I walk the dog?']
  });
  P.push({
    id: 'j', group: 'consonants', ipa: '/j/', title: 'Phụ âm /j/', emoji: '🙋', level: 'A1',
    mouth: { place: 'palate', manner: 'approximant', voiced: true },
    how: 'Thân lưỡi nâng gần ngạc cứng như /iː/, dây thanh rung, rồi lướt nhanh sang nguyên âm sau. Không cọ xát.',
    vn: 'Hay bỏ /j/ (year → "ia", giống "ear") hoặc đọc thành "z/gi" Việt. Bắt đầu bằng một "i" rất ngắn.',
    tip: 'Như "y" trong "yêu": "yes" ≈ "i-ét" nói liền.',
    words: [
      { w: 'yes', ipa: '/jes/' }, { w: 'you', ipa: '/juː/' }, { w: 'year', ipa: '/jɪə/' }, { w: 'young', ipa: '/jʌŋ/' },
      { w: 'use', ipa: '/juːz/' }, { w: 'music', ipa: '/ˈmjuːzɪk/' }, { w: 'student', ipa: '/ˈstjuːdnt/' }, { w: 'new', ipa: '/njuː/' }
    ],
    pairs: [['yet', 'jet'], ['year', 'ear'], ['yeast', 'east'], ['yolk', 'oak'], ['yam', 'jam']],
    sentences: ['Yes, you can use my yellow pen.', 'Young students learn new music every year.']
  });
})(typeof self !== 'undefined' ? self : this);
