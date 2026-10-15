/* Phát âm – Chuyên đề (tự biên soạn) */
(function (g) {
  const P = g.PRON = g.PRON || [];

  /* ───────────── NHÓM 1: LỖI NGƯỜI VIỆT ───────────── */

  P.push({
    id: 'final-consonants', group: 'vn', ipa: '/t/ /d/ /k/ /s/ /z/', title: 'Âm cuối: đừng “nuốt” phụ âm cuối', emoji: '✂️', level: 'A2',
    how: 'Trong tiếng Việt, âm cuối như “t, c, p” chỉ được “chặn” lại chứ không bật hơi, và tiếng Việt không có âm cuối /s/, /z/, /v/, /dʒ/… Trong tiếng Anh, âm cuối mang nghĩa: “rice” (gạo) khác “rise” (tăng), “life” khác “live”. Hãy phát âm trọn vẹn âm cuối: /t/ /k/ /p/ bật nhẹ hơi, /s/ xì rõ, /z/ có rung dây thanh. Lưu ý thêm: nguyên âm đứng trước phụ âm cuối hữu thanh (/b d ɡ z v/) được kéo dài hơn một chút – đây là dấu hiệu quan trọng để người nghe phân biệt “bad” với “bat”.',
    rules: [
      { label: 'Phụ âm tắc /p t k/', when: 'chặn lại rồi bật nhẹ hơi, không “nuốt” mất', ex: ['stop', 'fact', 'like'] },
      { label: 'Phụ âm tắc hữu thanh /b d ɡ/', when: 'rung dây thanh, nguyên âm trước kéo dài hơn', ex: ['job', 'road', 'big'] },
      { label: 'Âm xát /s z f v/', when: 'giữ luồng hơi đến hết âm, không cắt ngang', ex: ['price', 'rise', 'live'] },
      { label: 'Cụm âm cuối', when: 'đọc đủ từng phụ âm trong cụm', ex: ['fact /kt/', 'change /ndʒ/', 'health /lθ/'] }
    ],
    vn: 'Lỗi phổ biến: bỏ hẳn âm cuối (“price” → “prai”), thay /s/ bằng “ch” cuối kiểu tiếng Việt, đọc /z/ thành /s/ (“rise” nghe như “rice”), và đọc /v/ cuối thành /p/ hoặc bỏ đi (“live” → “lip”/“li”). Cách sửa: luyện chậm, phóng đại âm cuối, sau đó nối âm cuối với nguyên âm của từ tiếp theo (“fact_is”, “price_of”) để âm cuối tự nhiên xuất hiện.',
    tip: 'Thần chú: “Âm cuối là nửa nghĩa của từ.” Khi tự ghi âm, hãy tua lại và nghe riêng phần cuối mỗi từ – nếu không nghe thấy gì, giám khảo cũng vậy.',
    words: [
      { w: 'fact', ipa: '/fækt/', note: 'cụm cuối /kt/' },
      { w: 'job', ipa: '/dʒɒb/', note: 'âm cuối /b/' },
      { w: 'rise', ipa: '/raɪz/', note: 'âm cuối /z/ (rung)' },
      { w: 'price', ipa: '/praɪs/', note: 'âm cuối /s/' },
      { w: 'road', ipa: '/rəʊd/', note: 'âm cuối /d/' },
      { w: 'like', ipa: '/laɪk/', note: 'âm cuối /k/' },
      { w: 'life', ipa: '/laɪf/', note: 'âm cuối /f/' },
      { w: 'live', ipa: '/lɪv/', note: 'âm cuối /v/' },
      { w: 'change', ipa: '/tʃeɪndʒ/', note: 'cụm cuối /ndʒ/' },
      { w: 'health', ipa: '/helθ/', note: 'cụm cuối /lθ/' }
    ],
    pairs: [['rice', 'rise'], ['price', 'prize'], ['life', 'live'], ['bat', 'bad'], ['back', 'bag'], ['safe', 'save']],
    sentences: [
      'Public transport could reduce traffic in big cities.',
      'Most people think that fast food is bad for their health.',
      'The price of land has risen sharply in the last decade.'
    ],
    quiz: [
      { q: 'Cặp từ nào chỉ khác nhau ở âm cuối /s/ – /z/?', options: ['rice – rise', 'life – live', 'bat – bad'], answer: 0, explain: '“rice” /raɪs/ kết thúc bằng /s/ vô thanh, “rise” /raɪz/ kết thúc bằng /z/ hữu thanh.' },
      { q: 'Khi nói “bad” (khác “bat”), điều gì giúp người nghe nhận ra nhiều nhất?', options: ['Nói to hơn', 'Nguyên âm /æ/ kéo dài hơn trước /d/', 'Thêm âm “ơ” sau /d/'], answer: 1, explain: 'Trước phụ âm cuối hữu thanh, nguyên âm được kéo dài. Đây là tín hiệu rất rõ để phân biệt “bad” và “bat”. Không thêm “ơ” sau âm cuối.' },
      { q: '“health” kết thúc bằng cụm âm nào?', options: ['/lt/', '/lθ/', '/θ/ (bỏ /l/)'], answer: 1, explain: '“health” /helθ/: cần cả /l/ lẫn /θ/. Bỏ /l/ hoặc đổi /θ/ thành /t/ đều là lỗi.' },
      { q: 'Lỗi nào thường khiến “live” bị nghe thành “lip”?', options: ['Đổi /v/ cuối thành /p/', 'Đổi /ɪ/ thành /iː/', 'Đặt sai trọng âm'], answer: 0, explain: 'Tiếng Việt có âm cuối “p” nhưng không có /v/ cuối, nên người học hay thay /v/ bằng /p/. Hãy để răng trên chạm môi dưới và rung dây thanh.' },
      { q: 'Cách luyện âm cuối hiệu quả nhất trong câu là?', options: ['Ngắt hẳn sau mỗi từ', 'Nối âm cuối với nguyên âm của từ sau', 'Bỏ âm cuối khi nói nhanh'], answer: 1, explain: 'Nối “price_of”, “fact_is” giúp âm cuối trở thành âm đầu của âm tiết sau, nên dễ phát âm và nghe tự nhiên hơn.' }
    ]
  });

  P.push({
    id: 'ed-endings', group: 'vn', ipa: '/t/ /d/ /ɪd/', title: 'Đuôi -ed: /t/, /d/ hay /ɪd/?', emoji: '🔚', level: 'A2',
    how: 'Cách đọc -ed phụ thuộc vào ÂM cuối của động từ gốc (không phải chữ cái). Chỉ khi động từ kết thúc bằng âm /t/ hoặc /d/ thì -ed mới thêm một âm tiết /ɪd/. Các trường hợp khác -ed chỉ là một phụ âm dính vào cuối: /t/ sau âm vô thanh, /d/ sau âm hữu thanh và nguyên âm.',
    rules: [
      { label: '/ɪd/', when: 'sau âm /t/, /d/ – thêm một âm tiết', ex: ['wanted', 'needed', 'decided'] },
      { label: '/t/', when: 'sau âm vô thanh /p k f s ʃ tʃ θ/', ex: ['developed', 'reduced', 'watched'] },
      { label: '/d/', when: 'sau âm hữu thanh /b ɡ v z ʒ dʒ m n ŋ l/ và mọi nguyên âm', ex: ['improved', 'changed', 'studied'] }
    ],
    vn: 'Người Việt thường bỏ hẳn -ed (“I work there last year”), hoặc đọc mọi -ed thành /ɪd/ (“work-ed”, “stop-ed”) khiến từ thừa một âm tiết. Một lỗi khác là đọc theo chữ: “increased” kết thúc bằng chữ “e” nhưng âm cuối của “increase” là /s/ vô thanh nên -ed đọc /t/. Cách sửa: xác định âm cuối của động từ gốc, rồi nối -ed với từ tiếp theo (“developed_a plan” → /dɪˈveləptə/).',
    tip: 'Câu thần chú: “Tiền Đô → /ɪd/” (t, d thêm âm tiết). Còn lại: đặt tay lên cổ – rung thì /d/, không rung thì /t/. Lưu ý vài tính từ đặc biệt đọc /ɪd/: naked, wicked, learned (uyên bác), aged (già).',
    words: [
      { w: 'developed', ipa: '/dɪˈveləpt/', note: '/t/ (sau /p/)' },
      { w: 'increased', ipa: '/ɪnˈkriːst/', note: '/t/ (sau /s/)' },
      { w: 'introduced', ipa: '/ˌɪntrəˈdjuːst/', note: '/t/ (sau /s/)' },
      { w: 'watched', ipa: '/wɒtʃt/', note: '/t/ (sau /tʃ/)' },
      { w: 'improved', ipa: '/ɪmˈpruːvd/', note: '/d/ (sau /v/)' },
      { w: 'changed', ipa: '/tʃeɪndʒd/', note: '/d/ (sau /dʒ/)' },
      { w: 'recycled', ipa: '/ˌriːˈsaɪkld/', note: '/d/ (sau /l/)' },
      { w: 'polluted', ipa: '/pəˈluːtɪd/', note: '/ɪd/ (sau /t/)' },
      { w: 'decided', ipa: '/dɪˈsaɪdɪd/', note: '/ɪd/ (sau /d/)' },
      { w: 'affected', ipa: '/əˈfektɪd/', note: '/ɪd/ (sau /t/)' }
    ],
    pairs: [['play', 'played'], ['help', 'helped'], ['want', 'wanted'], ['need', 'needed'], ['study', 'studied'], ['fix', 'fixed']],
    sentences: [
      'The government introduced new policies and reduced taxes.',
      'Prices increased quickly, so many families struggled.',
      'The city planted more trees and recycled most of its waste.'
    ],
    quiz: [
      { q: 'Đuôi -ed trong “stopped” đọc là?', options: ['/t/', '/d/', '/ɪd/'], answer: 0, explain: '“stop” kết thúc bằng /p/ vô thanh nên -ed đọc /t/: /stɒpt/.' },
      { q: 'Đuôi -ed trong “needed” đọc là?', options: ['/t/', '/d/', '/ɪd/'], answer: 2, explain: '“need” kết thúc bằng /d/ nên phải thêm âm tiết /ɪd/: /ˈniːdɪd/.' },
      { q: 'Đuôi -ed trong “increased” đọc là?', options: ['/ɪd/', '/t/', '/d/'], answer: 1, explain: 'Chữ cuối là “e” nhưng âm cuối của “increase” là /s/ vô thanh, nên đọc /t/: /ɪnˈkriːst/.' },
      { q: 'Từ nào có -ed đọc là /d/?', options: ['watched', 'improved', 'affected'], answer: 1, explain: '“improve” kết thúc bằng /v/ hữu thanh → /d/. “watched” là /t/, “affected” là /ɪd/.' },
      { q: '“developed” có bao nhiêu âm tiết?', options: ['3', '4', '5'], answer: 0, explain: '/dɪˈveləpt/ chỉ có 3 âm tiết: de-vel-oped. -ed sau /p/ chỉ là âm /t/, không tạo thêm âm tiết.' }
    ]
  });

  P.push({
    id: 's-endings', group: 'vn', ipa: '/s/ /z/ /ɪz/', title: 'Đuôi -s/-es: /s/, /z/ hay /ɪz/?', emoji: '🐍', level: 'A2',
    how: 'Đuôi -s/-es xuất hiện ở danh từ số nhiều, động từ ngôi thứ ba số ít (he works) và sở hữu cách (the country\'s). Cả ba đều theo cùng một quy tắc dựa trên ÂM cuối của từ gốc: thêm âm tiết /ɪz/ sau các âm “xuýt”; /s/ sau âm vô thanh; /z/ sau âm hữu thanh và nguyên âm.',
    rules: [
      { label: '/ɪz/', when: 'sau âm xuýt /s z ʃ ʒ tʃ dʒ/ – thêm một âm tiết', ex: ['resources', 'businesses', 'changes'] },
      { label: '/s/', when: 'sau âm vô thanh /p t k f θ/', ex: ['benefits', 'effects', 'months'] },
      { label: '/z/', when: 'sau âm hữu thanh /b d ɡ v m n ŋ l/ và nguyên âm', ex: ['jobs', 'schools', 'cities'] }
    ],
    vn: 'Lỗi thường gặp: bỏ -s hoàn toàn (giám khảo sẽ nghĩ bạn sai ngữ pháp số ít/số nhiều), đọc mọi -s thành /s/ (thực ra /z/ phổ biến hơn), hoặc quên âm tiết /ɪz/ (“change” và “changes” nghe giống nhau). Cách sửa: luyện riêng /z/ như tiếng ong “zzz” có rung dây thanh, và luôn đếm âm tiết với các từ có /ɪz/.',
    tip: 'Mẹo: -s là “tấm gương” của -ed. Âm vô thanh → /s/ (như /t/), âm hữu thanh → /z/ (như /d/), âm xuýt → /ɪz/ (như /t d/ → /ɪd/). Ngoại lệ hay gặp: “says” /sez/, “does” /dʌz/ – nguyên âm thay đổi.',
    words: [
      { w: 'benefits', ipa: '/ˈbenɪfɪts/', note: '/s/ (sau /t/)' },
      { w: 'effects', ipa: '/ɪˈfekts/', note: '/s/ – cụm /kts/' },
      { w: 'months', ipa: '/mʌnθs/', note: '/s/ (sau /θ/)' },
      { w: 'jobs', ipa: '/dʒɒbz/', note: '/z/ (sau /b/)' },
      { w: 'schools', ipa: '/skuːlz/', note: '/z/ (sau /l/)' },
      { w: 'cities', ipa: '/ˈsɪtiz/', note: '/z/ (sau nguyên âm)' },
      { w: 'governments', ipa: '/ˈɡʌvənmənts/', note: '/s/ – cụm /nts/' },
      { w: 'resources', ipa: '/rɪˈzɔːsɪz/', note: '/ɪz/ (sau /s/)' },
      { w: 'changes', ipa: '/ˈtʃeɪndʒɪz/', note: '/ɪz/ (sau /dʒ/)' },
      { w: 'businesses', ipa: '/ˈbɪznəsɪz/', note: '/ɪz/ (sau /s/)' }
    ],
    pairs: [['job', 'jobs'], ['benefit', 'benefits'], ['change', 'changes'], ['price', 'prices'], ['city', 'cities'], ['say', 'says']],
    sentences: [
      'Many students rely on smartphones for their studies.',
      'Technology changes the ways businesses manage resources.',
      'My city\'s parks and roads need more investment.'
    ],
    quiz: [
      { q: 'Đuôi -s trong “jobs” đọc là?', options: ['/s/', '/z/', '/ɪz/'], answer: 1, explain: '“job” kết thúc bằng /b/ hữu thanh → /z/: /dʒɒbz/.' },
      { q: 'Đuôi -s trong “benefits” đọc là?', options: ['/s/', '/z/', '/ɪz/'], answer: 0, explain: '“benefit” kết thúc bằng /t/ vô thanh → /s/: /ˈbenɪfɪts/.' },
      { q: 'Từ nào có đuôi đọc /ɪz/?', options: ['schools', 'changes', 'months'], answer: 1, explain: '“change” kết thúc bằng /dʒ/ là âm xuýt → /ɪz/. “schools” là /z/, “months” là /s/.' },
      { q: '“resources” có bao nhiêu âm tiết?', options: ['3', '4', '2'], answer: 1, explain: '/rɪˈzɔːsɪz/: re-sour-ce-s → 4 âm tiết, vì /ɪz/ tạo thêm một âm tiết.' },
      { q: 'Từ nào là ngoại lệ, nguyên âm thay đổi khi thêm -s?', options: ['plays', 'says', 'stays'], answer: 1, explain: '“say” /seɪ/ nhưng “says” đọc /sez/. “plays” và “stays” giữ nguyên /eɪ/ + /z/.' }
    ]
  });

  P.push({
    id: 'th-sounds', group: 'vn', ipa: '/θ/ /ð/', title: 'Âm /θ/ và /ð/ – không phải “th” tiếng Việt', emoji: '👅', level: 'A2',
    how: 'Cả /θ/ và /ð/ đều là âm “giữa hai răng”: đặt đầu lưỡi nhẹ giữa răng trên và răng dưới (hoặc chạm mặt sau răng trên), rồi thổi hơi qua khe hẹp. /θ/ vô thanh – chỉ có hơi (think, health). /ð/ hữu thanh – có rung dây thanh (the, weather). Đây là âm xát kéo dài được, khác hẳn “th” tiếng Việt (một âm tắc bật hơi).',
    rules: [
      { label: '/θ/ vô thanh', when: 'thường ở từ nội dung: danh từ, động từ, số đếm', ex: ['think', 'three', 'growth'] },
      { label: '/ð/ hữu thanh', when: 'thường ở từ chức năng (the, this, that, they, than) và giữa hai nguyên âm', ex: ['the', 'although', 'weather'] },
      { label: 'Danh từ /θ/ → động từ /ð/', when: 'một số cặp đổi âm khi thành động từ', ex: ['bath → bathe', 'breath → breathe', 'cloth → clothe'] }
    ],
    vn: 'Người Việt hay đọc /θ/ thành “th” tiếng Việt hoặc /t/ (“think” → “tink”), hoặc /s/ (“think” → “sink”); đọc /ð/ thành /d/ hoặc /z/ (“they” → “day”, “clothing” → “closing”). Cách sửa: soi gương – phải thấy đầu lưỡi lộ ra giữa hai hàm răng; giữ âm kéo dài “θθθθ” vài giây trước khi nói cả từ.',
    tip: 'Thần chú: “Lè lưỡi – thổi hơi.” Nếu không kéo dài được âm thì bạn đang đọc /t/ hoặc /d/, chưa phải /θ/ /ð/.',
    words: [
      { w: 'think', ipa: '/θɪŋk/', note: '/θ/ đầu' },
      { w: 'three', ipa: '/θriː/', note: '/θr/' },
      { w: 'health', ipa: '/helθ/', note: '/θ/ cuối' },
      { w: 'growth', ipa: '/ɡrəʊθ/', note: '/θ/ cuối' },
      { w: 'method', ipa: '/ˈmeθəd/', note: '/θ/ giữa' },
      { w: 'the', ipa: '/ðə/', note: '/ð/ – dạng yếu' },
      { w: 'although', ipa: '/ɔːlˈðəʊ/', note: '/ð/ giữa' },
      { w: 'weather', ipa: '/ˈweðə/', note: '/ð/ giữa' },
      { w: 'breathe', ipa: '/briːð/', note: '/ð/ cuối' },
      { w: 'thoroughly', ipa: '/ˈθʌrəli/', note: '/θ/ đầu' }
    ],
    pairs: [['think', 'sink'], ['three', 'tree'], ['thank', 'tank'], ['they', 'day'], ['breathe', 'breeze'], ['clothing', 'closing']],
    sentences: [
      'I think the growth of the city threatens our health.',
      'Although the weather is warm, they rarely go there.',
      'There are three main methods that I would mention.'
    ],
    quiz: [
      { q: 'Âm đầu của “think” là?', options: ['/t/', '/θ/', '/ð/'], answer: 1, explain: '“think” /θɪŋk/ bắt đầu bằng /θ/ vô thanh, lưỡi giữa hai răng, chỉ thổi hơi.' },
      { q: 'Từ nào chứa âm /ð/ (hữu thanh)?', options: ['bath', 'bathe', 'path'], answer: 1, explain: '“bathe” /beɪð/ là động từ, kết thúc bằng /ð/. “bath” và “path” kết thúc bằng /θ/.' },
      { q: 'Nếu đọc /ð/ thành /z/, “clothing” sẽ nghe giống từ nào?', options: ['closing', 'clothes', 'cloth'], answer: 0, explain: '“clothing” /ˈkləʊðɪŋ/ → /ˈkləʊzɪŋ/ chính là “closing” (đóng cửa) – sai nghĩa.' },
      { q: 'Âm /θ/ khác “th” tiếng Việt ở điểm nào?', options: ['/θ/ là âm xát, kéo dài được', '/θ/ có rung dây thanh', 'Không có gì khác'], answer: 0, explain: '“th” tiếng Việt là âm tắc bật hơi. /θ/ là âm xát: hơi đi qua khe giữa lưỡi và răng, có thể kéo dài.' },
      { q: '“the” trong câu thường đọc là gì trước phụ âm?', options: ['/ðiː/', '/ðə/', '/də/'], answer: 1, explain: 'Trước phụ âm, “the” là dạng yếu /ðə/. Trước nguyên âm thường là /ði/. /də/ là lỗi thay /ð/ bằng /d/.' }
    ]
  });

  P.push({
    id: 'sh-ch-zh', group: 'vn', ipa: '/ʃ/ /s/ /tʃ/ /dʒ/ /ʒ/', title: '/ʃ/ – /s/ và /tʃ/ – /dʒ/ – /ʒ/', emoji: '🤫', level: 'B1',
    how: '/s/: đầu lưỡi gần lợi trên, môi dẹt, tiếng xì mảnh (see). /ʃ/: lưỡi lùi ra sau một chút, môi tròn và đưa ra trước, tiếng “suỵt” trầm hơn (she). /tʃ/ và /dʒ/ là âm tắc-xát: chặn hơi hoàn toàn rồi bật ra thành /ʃ/ hoặc /ʒ/ (chair, job). /ʒ/ giống /ʃ/ nhưng có rung dây thanh, hầu như chỉ xuất hiện ở giữa từ (decision, usually, measure).',
    rules: [
      { label: '/s/ ↔ /ʃ/', when: '/ʃ/ môi tròn, lưỡi lùi sau; -tion, -sion, -cial, -tial đều chứa /ʃ/', ex: ['social', 'pressure', 'education'] },
      { label: '/tʃ/ ↔ /ʃ/', when: '/tʃ/ có một “cú chặn” trước, /ʃ/ thì không', ex: ['chair – share', 'watch – wash', 'cheap – sheep'] },
      { label: '/dʒ/ ↔ /tʃ/', when: '/dʒ/ hữu thanh (rung), /tʃ/ vô thanh', ex: ['jeep – cheap', 'large – larch', 'job'] },
      { label: '/ʒ/', when: 'thường gặp trong -sion (sau nguyên âm), -sure, -sual', ex: ['decision', 'measure', 'usually'] }
    ],
    vn: 'Lỗi phổ biến: miền Nam/miền Bắc đều có thể lẫn “s/x” nên “she” → “see”, “sort” ↔ “short”; /tʃ/ đọc như “ch” tiếng Việt (không bật, không tròn môi); /dʒ/ đọc thành “gi” /z/ (“job” → “zop”); /ʒ/ đọc thành /z/ hoặc /dʒ/ (“decision” → “di-xi-dần”). Cách sửa: luyện tròn môi khi phát /ʃ tʃ dʒ ʒ/ – bốn âm này đều cần môi đưa ra trước.',
    tip: 'Mẹo: “Bốn âm môi chu: /ʃ/ /ʒ/ /tʃ/ /dʒ/.” Nếu môi bạn đang dẹt như cười, đó là /s/ hoặc /z/.',
    words: [
      { w: 'social', ipa: '/ˈsəʊʃl/', note: '/s/ đầu, /ʃ/ giữa' },
      { w: 'pressure', ipa: '/ˈpreʃə/', note: '/ʃ/' },
      { w: 'education', ipa: '/ˌedʒuˈkeɪʃn/', note: '/dʒ/ và /ʃ/' },
      { w: 'challenge', ipa: '/ˈtʃælɪndʒ/', note: '/tʃ/ đầu, /dʒ/ cuối' },
      { w: 'choose', ipa: '/tʃuːz/', note: '/tʃ/' },
      { w: 'job', ipa: '/dʒɒb/', note: '/dʒ/ (không phải “gi”)' },
      { w: 'decision', ipa: '/dɪˈsɪʒn/', note: '/ʒ/' },
      { w: 'usually', ipa: '/ˈjuːʒuəli/', note: '/ʒ/' },
      { w: 'leisure', ipa: '/ˈleʒə/', note: '/ʒ/ (giọng Anh)' },
      { w: 'sustainable', ipa: '/səˈsteɪnəbl/', note: '/s/ – không đọc /ʃ/' }
    ],
    pairs: [['see', 'she'], ['sort', 'short'], ['save', 'shave'], ['chair', 'share'], ['watch', 'wash'], ['cheap', 'jeep']],
    sentences: [
      'Social media puts a lot of pressure on teenagers.',
      'Choosing a job is a challenging decision for young people.',
      'I usually spend my leisure time watching short films.'
    ],
    quiz: [
      { q: 'Phần “-tion” trong “education” chứa âm nào?', options: ['/s/', '/ʃ/', '/tʃ/'], answer: 1, explain: '-tion đọc /ʃn/: /ˌedʒuˈkeɪʃn/.' },
      { q: 'Âm giữa của “decision” là?', options: ['/z/', '/dʒ/', '/ʒ/'], answer: 2, explain: '“decision” /dɪˈsɪʒn/ chứa /ʒ/ – giống /ʃ/ nhưng có rung dây thanh.' },
      { q: 'Cặp nào phân biệt /tʃ/ và /ʃ/?', options: ['watch – wash', 'see – she', 'cheap – jeep'], answer: 0, explain: '“watch” /wɒtʃ/ kết thúc bằng /tʃ/, “wash” /wɒʃ/ bằng /ʃ/. “see – she” là /s/–/ʃ/, “cheap – jeep” là /tʃ/–/dʒ/.' },
      { q: 'Lỗi “job” → “zop” là do?', options: ['Đọc /dʒ/ thành “gi” /z/ và /b/ thành /p/', 'Đặt sai trọng âm', 'Đọc sai nguyên âm'], answer: 0, explain: '/dʒ/ phải có cú chặn rồi bật, môi tròn; âm cuối /b/ cần rung, không đổi thành /p/.' },
      { q: 'Khi phát âm /ʃ/, môi nên thế nào?', options: ['Dẹt như đang cười', 'Tròn và đưa ra trước', 'Khép chặt'], answer: 1, explain: '/ʃ/ (cũng như /ʒ tʃ dʒ/) cần môi tròn, hơi chu ra. Môi dẹt cho ra /s/.' }
    ]
  });

  P.push({
    id: 'l-n-clusters', group: 'vn', ipa: '/l/ /n/ /str/ /sts/', title: '/l/ – /n/ và cụm phụ âm', emoji: '🧩', level: 'B1',
    how: '/n/ là âm mũi: hơi đi ra đằng mũi (bịt mũi lại sẽ không nói được). /l/ là âm bên: đầu lưỡi chạm lợi trên, hơi đi ra hai bên lưỡi, mũi không tham gia. Ở cuối từ (school, feel), /l/ là “L tối”: cuống lưỡi nâng lên, nghe như “âu” nhẹ – nhưng không được bỏ. Cụm phụ âm (str-, spl-, -sts, -kts) phải đọc liền, KHÔNG chèn nguyên âm “ơ” giữa các phụ âm.',
    rules: [
      { label: '/n/', when: 'hơi qua mũi – bịt mũi sẽ nghẹt', ex: ['night', 'national', 'knowledge'] },
      { label: '/l/', when: 'hơi qua hai bên lưỡi, mũi không rung', ex: ['light', 'local', 'language'] },
      { label: 'Cụm đầu', when: 'không chèn “ơ”: str- ≠ “sơ-tơ-r”', ex: ['street', 'strategy', 'explain'] },
      { label: 'Cụm cuối', when: 'đọc đủ, nhất là -sts, -kts, -nts', ex: ['tests', 'scientists', 'products'] }
    ],
    vn: 'Một số vùng phía Bắc lẫn /l/ và /n/ (“light” ↔ “night”, “low” ↔ “no”). Hầu hết người Việt chèn nguyên âm vào cụm phụ âm (“street” → “sơ-trít”, “sport” → nghe như “support”) hoặc rút gọn cụm cuối (“tests” → “tet”). Cách sửa: với /l/–/n/, bịt mũi để kiểm tra; với cụm phụ âm, bắt đầu từ cuối cụm rồi thêm dần: “eet → reet → treet → street”.',
    tip: 'Thần chú: “Một hơi, không ơ.” Một cụm phụ âm phải nằm gọn trong một nhịp, giống như “str” là một khối duy nhất.',
    words: [
      { w: 'knowledge', ipa: '/ˈnɒlɪdʒ/', note: '/n/ đầu, /l/ giữa' },
      { w: 'language', ipa: '/ˈlæŋɡwɪdʒ/', note: '/l/ đầu' },
      { w: 'national', ipa: '/ˈnæʃnəl/', note: '/n/ đầu, L tối cuối' },
      { w: 'local', ipa: '/ˈləʊkl/', note: '/l/ đầu và cuối' },
      { w: 'street', ipa: '/striːt/', note: 'cụm /str/' },
      { w: 'strategy', ipa: '/ˈstrætədʒi/', note: 'cụm /str/' },
      { w: 'explain', ipa: '/ɪkˈspleɪn/', note: 'cụm /kspl/' },
      { w: 'tests', ipa: '/tests/', note: 'cụm cuối /sts/' },
      { w: 'scientists', ipa: '/ˈsaɪəntɪsts/', note: 'cụm cuối /sts/' },
      { w: 'products', ipa: '/ˈprɒdʌkts/', note: 'cụm cuối /kts/' }
    ],
    pairs: [['light', 'night'], ['low', 'no'], ['lot', 'not'], ['lead', 'need'], ['sport', 'support'], ['test', 'tests']],
    sentences: [
      'Learning a new language takes a lot of time and strong motivation.',
      'Scientists ran several tests on local products.',
      'The national strategy aims to make streets safer.'
    ],
    quiz: [
      { q: 'Khi phát âm /n/, hơi đi ra đâu?', options: ['Qua hai bên lưỡi', 'Qua mũi', 'Qua khe răng'], answer: 1, explain: '/n/ là âm mũi. Hơi qua hai bên lưỡi là /l/.' },
      { q: 'Lỗi chèn “ơ” vào “sport” khiến từ nghe giống?', options: ['support', 'spot', 'sports'], answer: 0, explain: 'Chèn nguyên âm sau /s/: “sơ-port” ≈ /səˈpɔːt/ = “support”. Phải đọc /spɔːt/ trong một nhịp.' },
      { q: '“scientists” kết thúc bằng cụm âm nào?', options: ['/st/', '/s/', '/sts/'], answer: 2, explain: '/ˈsaɪəntɪsts/: số nhiều của “scientist” → cụm /sts/. Không rút gọn thành /s/.' },
      { q: 'L ở cuối “school” được gọi là gì?', options: ['L sáng', 'L tối (dark L)', 'L câm'], answer: 1, explain: 'Cuối từ hoặc trước phụ âm, /l/ là L tối: cuống lưỡi nâng lên. Không được bỏ hẳn.' },
      { q: '“explain” có cụm phụ âm nào ở giữa?', options: ['/ksp/ + /l/ = /kspl/', '/sp/', '/pl/'], answer: 0, explain: '/ɪkˈspleɪn/: bốn phụ âm liền nhau /k s p l/, không chèn nguyên âm nào.' }
    ]
  });

  /* ───────────── NHÓM 2: TRỌNG ÂM & NGỮ ĐIỆU ───────────── */

  P.push({
    id: 'word-stress', group: 'stress', ipa: '/ˈ/ Oo – oO', title: 'Trọng âm từ: các quy tắc cốt lõi', emoji: '🎯', level: 'B1',
    how: 'Mỗi từ nhiều âm tiết có một âm tiết được nhấn: to hơn, dài hơn, cao hơn và nguyên âm rõ. Các âm tiết không nhấn thường bị giảm thành /ə/ hoặc /ɪ/. Sai trọng âm khiến người bản ngữ khó nhận ra từ hơn cả sai một âm. Ký hiệu: O = âm tiết nhấn, o = không nhấn; trong IPA, dấu ˈ đứng TRƯỚC âm tiết được nhấn.',
    rules: [
      { label: 'Danh từ/tính từ 2 âm tiết', when: 'thường nhấn âm 1 (Oo)', ex: ['ˈproduct', 'ˈrecord (n)', 'ˈmodern'] },
      { label: 'Động từ 2 âm tiết', when: 'thường nhấn âm 2 (oO)', ex: ['reˈcord (v)', 'deˈcide', 'imˈprove'] },
      { label: '-tion, -sion, -ic, -ical, -ity', when: 'nhấn âm tiết ngay TRƯỚC hậu tố', ex: ['polˈlution', 'ecoˈnomic', 'aˈbility'] },
      { label: '-ee, -eer, -ese', when: 'nhấn chính hậu tố', ex: ['emploˈyee', 'volunˈteer', 'Vietnaˈmese'] },
      { label: 'Danh từ ghép', when: 'nhấn phần đầu', ex: ['ˈclassroom', 'ˈgreenhouse', 'ˈsmartphone'] }
    ],
    vn: 'Tiếng Việt mỗi âm tiết đều rõ và đều nhau, nên người Việt hay đọc “e-du-ca-tion” bốn âm tiết bằng nhau, hoặc nhấn âm cuối theo thói quen (“compuTER”, “deveLOP”). Cách sửa: khi học từ mới, luôn ghi kèm mẫu trọng âm (oOo…), vỗ tay mạnh ở âm tiết nhấn, và giảm các nguyên âm còn lại thành /ə/.',
    tip: 'Thần chú: “Danh trước – Động sau – Đuôi đứng trước.” Danh từ 2 âm tiết nhấn trước, động từ nhấn sau, còn -tion/-ic/-ity thì nhấn ngay âm tiết đứng trước đuôi.',
    words: [
      { w: 'record (n)', ipa: '/ˈrekɔːd/', note: 'Oo' },
      { w: 'record (v)', ipa: '/rɪˈkɔːd/', note: 'oO' },
      { w: 'pollution', ipa: '/pəˈluːʃn/', note: 'oOo' },
      { w: 'education', ipa: '/ˌedʒuˈkeɪʃn/', note: 'ooOo' },
      { w: 'ability', ipa: '/əˈbɪləti/', note: 'oOoo' },
      { w: 'electricity', ipa: '/ɪˌlekˈtrɪsəti/', note: 'ooOoo' },
      { w: 'economic', ipa: '/ˌiːkəˈnɒmɪk/', note: 'ooOo' },
      { w: 'political', ipa: '/pəˈlɪtɪkl/', note: 'oOoo' },
      { w: 'classroom', ipa: '/ˈklɑːsruːm/', note: 'Oo – danh từ ghép' },
      { w: 'employee', ipa: '/ɪmˈplɔɪiː/', note: 'oOo (cũng nghe /ˌemplɔɪˈiː/ ooO)' }
    ],
    pairs: [['REcord (n)', 'reCORD (v)'], ['PREsent (n)', 'preSENT (v)'], ['INcrease (n)', 'inCREASE (v)'], ['OBject (n)', 'obJECT (v)'], ['CONtrast (n)', 'conTRAST (v)']],
    sentences: [
      'There has been a SHARP INcrease in polLUtion. ↘',
      'We need to inCREASE PUBlic awareness of ENergy use. ↘',
      'eduCAtion is the KEY to ecoNOmic GROWTH. ↘'
    ],
    quiz: [
      { q: '“present” là ĐỘNG TỪ (trình bày) nhấn âm nào?', options: ['Âm 1: PREsent', 'Âm 2: preSENT', 'Không nhấn'], answer: 1, explain: 'Động từ 2 âm tiết thường nhấn âm 2: /prɪˈzent/. Danh từ “món quà” là /ˈpreznt/.' },
      { q: 'Mẫu trọng âm của “pollution”?', options: ['Ooo', 'oOo', 'ooO'], answer: 1, explain: 'Hậu tố -tion → nhấn âm tiết ngay trước: pol-LU-tion /pəˈluːʃn/.' },
      { q: '“electricity” nhấn âm tiết nào?', options: ['e', 'lec', 'tri'], answer: 2, explain: 'Hậu tố -ity → nhấn âm tiết ngay trước: e-lec-TRI-ci-ty /ɪˌlekˈtrɪsəti/.' },
      { q: 'Danh từ ghép “greenhouse” (nhà kính) nhấn ở đâu?', options: ['GREENhouse', 'greenHOUSE', 'Nhấn đều'], answer: 0, explain: 'Danh từ ghép thường nhấn phần đầu: /ˈɡriːnhaʊs/. “a green HOUSE” (ngôi nhà màu xanh) mới nhấn cả hai.' },
      { q: 'Từ nào nhấn vào chính hậu tố?', options: ['economic', 'Vietnamese', 'political'], answer: 1, explain: 'Hậu tố -ese luôn được nhấn: /ˌvjetnəˈmiːz/. Hai từ còn lại nhấn âm tiết trước -ic/-ical.' }
    ]
  });

  P.push({
    id: 'stress-shift', group: 'stress', ipa: '/ˈfəʊtəɡrɑːf/ → /fəˈtɒɡrəfi/', title: 'Trọng âm “nhảy” trong họ từ', emoji: '🦘', level: 'B2',
    how: 'Khi thêm hậu tố, trọng âm có thể di chuyển sang âm tiết khác – và nguyên âm thay đổi theo: âm tiết được nhấn có nguyên âm đầy đủ, âm tiết mất trọng âm bị giảm thành /ə/. Ví dụ: ˈPHOtograph /ˈfəʊtəɡrɑːf/ → phoˈTOgraphy /fəˈtɒɡrəfi/ → photoˈGRAphic /ˌfəʊtəˈɡræfɪk/. Chữ “o” đầu tiên đổi từ /əʊ/ thành /ə/ rồi lại /əʊ/.',
    rules: [
      { label: '-y, -ity, -ism (sau gốc nhiều âm tiết)', when: 'trọng âm thường lùi về âm thứ 3 từ cuối', ex: ['phoˈtography', 'eˈconomy', 'deˈmocracy'] },
      { label: '-ic, -ical', when: 'nhấn ngay trước hậu tố', ex: ['photoˈgraphic', 'ecoˈnomic', 'demoˈcratic'] },
      { label: '-ian, -tion', when: 'nhấn ngay trước hậu tố', ex: ['poliˈtician', 'eduˈcation', 'compeˈtition'] },
      { label: 'Nguyên âm thay đổi', when: 'mất trọng âm → /ə/; được nhấn → nguyên âm đầy đủ', ex: ['/ɪˈkɒnəmi/ → /ˌiːkəˈnɒmɪk/'] }
    ],
    vn: 'Người học thường “giữ nguyên” trọng âm của từ gốc cho cả họ từ: đọc “PHOtography”, “POlitical”, “ECOnomic”. Đây là lỗi đặc biệt dễ nghe thấy trong IELTS vì các từ economy/economic, technology/technological xuất hiện liên tục. Cách sửa: học họ từ theo bộ, đọc to cả bộ liền nhau và vỗ tay theo trọng âm.',
    tip: 'Mẹo: Đếm từ cuối lên. -y/-ity: nhấn âm thứ 3 từ cuối; -ic/-ian/-tion: nhấn âm thứ 2 từ cuối (ngay trước đuôi).',
    words: [
      { w: 'photograph', ipa: '/ˈfəʊtəɡrɑːf/', note: 'Ooo' },
      { w: 'photography', ipa: '/fəˈtɒɡrəfi/', note: 'oOoo' },
      { w: 'photographic', ipa: '/ˌfəʊtəˈɡræfɪk/', note: 'ooOo' },
      { w: 'economy', ipa: '/ɪˈkɒnəmi/', note: 'oOoo' },
      { w: 'economic', ipa: '/ˌiːkəˈnɒmɪk/', note: 'ooOo' },
      { w: 'technology', ipa: '/tekˈnɒlədʒi/', note: 'oOoo' },
      { w: 'technological', ipa: '/ˌteknəˈlɒdʒɪkl/', note: 'ooOoo' },
      { w: 'politics', ipa: '/ˈpɒlətɪks/', note: 'Ooo' },
      { w: 'political', ipa: '/pəˈlɪtɪkl/', note: 'oOoo' },
      { w: 'politician', ipa: '/ˌpɒləˈtɪʃn/', note: 'ooOo' }
    ],
    pairs: [['PHOtograph', 'phoTOgraphy'], ['eCOnomy', 'ecoNOmic'], ['POlitics', 'poLItical'], ['DEmocrat', 'deMOcracy'], ['aCAdemy', 'acaDEmic'], ['techNOlogy', 'technoLOgical']],
    sentences: [
      'The eCOnomy is GROWing, but ecoNOmic ineQUALity reMAINS. ↘',
      'technoLOgical CHANGE is reSHAPing eduCAtion. ↘',
      'He STUdied PHOtography and beCAME a proFESsional phoTOgrapher. ↘'
    ],
    quiz: [
      { q: '“photography” nhấn âm tiết nào?', options: ['PHO-to-gra-phy', 'pho-TO-gra-phy', 'pho-to-GRA-phy'], answer: 1, explain: 'Hậu tố -y → nhấn âm thứ 3 từ cuối: /fəˈtɒɡrəfi/.' },
      { q: '“economic” có mẫu trọng âm nào?', options: ['oOoo', 'Oooo', 'ooOo'], answer: 2, explain: '-ic → nhấn ngay trước: e-co-NO-mic /ˌiːkəˈnɒmɪk/.' },
      { q: 'Trong “photographer”, trọng âm nằm ở?', options: ['PHO', 'TO', 'GRA'], answer: 1, explain: '“photographer” /fəˈtɒɡrəfə/ nhấn giống “photography”.' },
      { q: 'Chữ “o” đầu trong “political” đọc là?', options: ['/ɒ/', '/ə/', '/əʊ/'], answer: 1, explain: 'Trọng âm chuyển sang “li” nên âm “po” bị giảm thành /ə/: /pəˈlɪtɪkl/. Trong “politics” nó là /ɒ/ vì được nhấn.' },
      { q: 'Từ nào nhấn khác ba từ còn lại?', options: ['technology', 'economy', 'democratic'], answer: 2, explain: '“democratic” /ˌdeməˈkrætɪk/ nhấn âm 3 (ooOo); “technology” và “economy” đều nhấn âm 2 (oOoo).' }
    ]
  });

  P.push({
    id: 'weak-forms', group: 'stress', ipa: '/ə/ /tə/ /fə/ /əv/', title: 'Trọng âm câu và dạng yếu', emoji: '🥁', level: 'B1',
    how: 'Tiếng Anh có nhịp dựa trên trọng âm: các từ mang nội dung (danh từ, động từ chính, tính từ, trạng từ, từ phủ định, từ để hỏi) được nhấn; các từ chức năng (giới từ, mạo từ, trợ động từ, đại từ, liên từ) thường đọc nhanh và nhẹ với nguyên âm /ə/ – gọi là dạng yếu. Khoảng cách giữa các từ được nhấn gần như đều nhau, nên các từ yếu bị “nén” lại.',
    rules: [
      { label: 'Từ được nhấn', when: 'danh từ, động từ chính, tính từ, trạng từ, not/never, từ để hỏi', ex: ['TRAFfic', 'reDUCE', 'SERious'] },
      { label: 'Dạng yếu', when: 'giới từ, mạo từ, trợ động từ, liên từ khi đứng giữa câu', ex: ['to /tə/', 'for /fə/', 'and /ən/'] },
      { label: 'Dạng mạnh', when: 'khi đứng cuối câu, khi được nhấn đối lập, hoặc phủ định', ex: ['Where are you FROM? /frɒm/', 'I CAN. /kæn/', 'can\'t /kɑːnt/'] }
    ],
    vn: 'Người Việt đọc mọi từ to và rõ như nhau (“I – WANT – TO – GO – TO – THE – PARK”), làm câu nghe “cứng như robot” và giám khảo khó nhận ra từ khóa. Đặc biệt nguy hiểm: “can” đọc mạnh /kæn/ dễ bị nghe thành “can\'t”. Cách sửa: gạch chân từ nội dung, đọc to chúng trước, sau đó “chèn” các từ yếu vào giữa thật nhanh mà giữ nguyên nhịp.',
    tip: 'Thần chú: “Nội dung thì nhấn – chức năng thì lướt.” Trong giọng Anh, “can” khẳng định là /kən/, còn “can\'t” là /kɑːnt/ – nguyên âm dài khác hẳn.',
    words: [
      { w: 'to', ipa: '/tə/', note: 'dạng yếu' },
      { w: 'for', ipa: '/fə/', note: 'dạng yếu (mạnh /fɔː/)' },
      { w: 'of', ipa: '/əv/', note: 'dạng yếu (mạnh /ɒv/)' },
      { w: 'can', ipa: '/kən/', note: 'dạng yếu (mạnh /kæn/)' },
      { w: 'and', ipa: '/ən/', note: 'dạng yếu (mạnh /ænd/)' },
      { w: 'at', ipa: '/ət/', note: 'dạng yếu (mạnh /æt/)' },
      { w: 'from', ipa: '/frəm/', note: 'dạng yếu (mạnh /frɒm/)' },
      { w: 'was', ipa: '/wəz/', note: 'dạng yếu (mạnh /wɒz/)' },
      { w: 'are', ipa: '/ə/', note: 'dạng yếu (mạnh /ɑː/)' },
      { w: 'some', ipa: '/səm/', note: 'dạng yếu (mạnh /sʌm/)' }
    ],
    pairs: [['can /kən/', 'can\'t /kɑːnt/'], ['for /fə/', 'four /fɔː/'], ['to /tə/', 'two /tuː/'], ['of /əv/', 'off /ɒf/']],
    sentences: [
      'I WANT to GO to the PARK. ↘',
      'PEOple can SAVE a LOT of MONey by COOKing at HOME. ↘',
      'MOST of my FRIENDS are INterested in TECHnology. ↘'
    ],
    quiz: [
      { q: 'Trong “a cup of tea”, “of” thường đọc là?', options: ['/ɒv/', '/əv/ hoặc /ə/', '/ɒf/'], answer: 1, explain: 'Giữa câu, “of” là dạng yếu /əv/, nói nhanh có thể chỉ còn /ə/: /ə ˈkʌp ə ˈtiː/.' },
      { q: 'Từ nào thường ĐƯỢC NHẤN trong câu?', options: ['the', 'pollution', 'and'], answer: 1, explain: '“pollution” là danh từ – từ nội dung. “the” và “and” là từ chức năng, thường đọc yếu.' },
      { q: 'Câu “I can swim” trong giọng Anh, “can” đọc là?', options: ['/kæn/', '/kən/', '/kɑːn/'], answer: 1, explain: 'Khẳng định, giữa câu → /kən/, và nhấn vào “SWIM”. “can\'t” mới là /kɑːnt/.' },
      { q: 'Khi nào “from” dùng dạng mạnh /frɒm/?', options: ['Ở cuối câu: “Where are you from?”', 'Luôn luôn', 'Không bao giờ'], answer: 0, explain: 'Giới từ đứng cuối câu dùng dạng mạnh. Giữa câu (“I come from Hanoi”) là /frəm/.' },
      { q: 'Âm phổ biến nhất trong dạng yếu là?', options: ['/ʌ/', '/ə/ (schwa)', '/æ/'], answer: 1, explain: 'Hầu hết dạng yếu dùng /ə/: /tə/, /fə/, /ən/, /ət/, /wəz/…' }
    ]
  });

  P.push({
    id: 'intonation', group: 'stress', ipa: '↘ ↗ ↘↗', title: 'Ngữ điệu: lên, xuống và thể hiện thái độ', emoji: '🎢', level: 'B2',
    how: 'Ngữ điệu là sự lên xuống cao độ của cả câu, tập trung ở từ được nhấn mạnh nhất cuối nhóm ý (gọi là “nhân”). Tiếng Việt dùng thanh điệu cho từng âm tiết để đổi nghĩa từ; tiếng Anh dùng ngữ điệu cho cả cụm để thể hiện thông tin đã xong hay chưa, đang hỏi hay khẳng định, và thái độ (chắc chắn, ngạc nhiên, lưỡng lự).',
    rules: [
      { label: 'Xuống ↘', when: 'câu trần thuật, câu hỏi Wh-, mệnh lệnh – thông tin đã hoàn chỉnh', ex: ['I live in Hanoi. ↘', 'What do you do? ↘'] },
      { label: 'Lên ↗', when: 'câu hỏi Yes/No, hỏi lại, thể hiện quan tâm', ex: ['Do you like it? ↗', 'Really? ↗'] },
      { label: 'Liệt kê ↗ ↗ ↘', when: 'lên ở mỗi mục, xuống ở mục cuối', ex: ['buses ↗, trains ↗ and bikes ↘'] },
      { label: 'Xuống-lên ↘↗', when: 'chưa nói hết, có ý “nhưng…”, lịch sự, lưỡng lự', ex: ['Well ↘↗…', 'Actually ↘↗, I prefer…'] }
    ],
    vn: 'Lỗi thường gặp: nói đều đều (monotone) vì sợ sai, hoặc xuống giọng giữa câu khiến giám khảo nghĩ bạn đã nói xong; lên giọng cuối câu trần thuật khiến câu nghe như câu hỏi, thiếu tự tin. Cách sửa: ở mỗi câu trả lời IELTS, chọn từ quan trọng nhất cuối câu và cho giọng “rơi” rõ ở đó; với ý chưa xong, giữ giọng ở mức ngang hoặc hơi lên.',
    tip: 'Mẹo: “Xong thì xuống, hỏi có/không thì lên, còn tiếp thì treo.” Phạm vi cao độ rộng hơn = nghe hào hứng và tự nhiên hơn.',
    words: [
      { w: 'Really?', ipa: '/ˈrɪəli/', note: '↗ ngạc nhiên, quan tâm' },
      { w: 'Sorry?', ipa: '/ˈsɒri/', note: '↗ xin nhắc lại' },
      { w: 'Sorry.', ipa: '/ˈsɒri/', note: '↘ xin lỗi' },
      { w: 'Yes.', ipa: '/jes/', note: '↘ khẳng định chắc chắn' },
      { w: 'Yes?', ipa: '/jes/', note: '↗ mời người kia nói tiếp' },
      { w: 'Absolutely.', ipa: '/ˌæbsəˈluːtli/', note: '↘ đồng ý mạnh' },
      { w: 'Exactly.', ipa: '/ɪɡˈzæktli/', note: '↘ đồng ý' },
      { w: 'Well…', ipa: '/wel/', note: '↘↗ lưỡng lự, câu giờ' },
      { w: 'Actually,', ipa: '/ˈæktʃuəli/', note: '↘↗ sắp nói ý khác' },
      { w: 'Interesting!', ipa: '/ˈɪntrəstɪŋ/', note: '↘ rơi mạnh, phạm vi rộng' }
    ],
    pairs: [['Sorry? ↗', 'Sorry. ↘'], ['Yes? ↗', 'Yes. ↘'], ['You\'re a student? ↗', 'You\'re a student. ↘']],
    sentences: [
      'I PREfer living in the CIty. ↘',
      'Do you THINK it will CHANGE? ↗',
      'We need more BUSes ↗, more TRAINS ↗ and SAFer cycle LANES. ↘'
    ],
    quiz: [
      { q: 'Câu hỏi Wh- như “What do you do?” thường có ngữ điệu?', options: ['Lên ↗', 'Xuống ↘', 'Ngang'], answer: 1, explain: 'Câu hỏi Wh- trung tính thường xuống giọng ở cuối.' },
      { q: '“Do you like reading?” – ngữ điệu cuối câu?', options: ['Lên ↗', 'Xuống ↘', 'Xuống-lên ↘↗'], answer: 0, explain: 'Câu hỏi Yes/No thường lên giọng ở cuối.' },
      { q: 'Khi liệt kê “cars, buses and bikes”, giọng xuống ở đâu?', options: ['cars', 'buses', 'bikes'], answer: 2, explain: 'Liệt kê: lên ở các mục chưa hết, xuống ở mục cuối để báo danh sách đã kết thúc.' },
      { q: '“Actually ↘↗, I…” với ngữ điệu xuống-lên thể hiện điều gì?', options: ['Đồng ý hoàn toàn', 'Sắp đưa ra ý khác hoặc chưa nói hết', 'Đang tức giận'], answer: 1, explain: 'Xuống-lên báo hiệu “còn tiếp”, thường dẫn tới ý tương phản hoặc lịch sự sửa lại.' },
      { q: 'Lỗi ngữ điệu nào làm câu trả lời IELTS nghe thiếu tự tin?', options: ['Xuống giọng rõ ở cuối câu trần thuật', 'Lên giọng ở cuối mọi câu trần thuật', 'Nhấn từ khóa'], answer: 1, explain: 'Lên giọng ở câu trần thuật khiến câu nghe như câu hỏi, như bạn không chắc chắn.' }
    ]
  });

  P.push({
    id: 'connected-speech', group: 'stress', ipa: '‿ /neks dɔː/ /ˈwɒnə/', title: 'Nối âm, nuốt âm và biến âm', emoji: '🔗', level: 'B2',
    how: 'Người bản ngữ không nói từng từ tách rời mà “dính” các từ lại. Ba hiện tượng chính: (1) Nối âm – phụ âm cuối nối với nguyên âm đầu từ sau (turn‿off), giữa hai nguyên âm chèn /j/ hoặc /w/ (the‿/j/‿end, go‿/w/‿out), và trong giọng Anh, chữ “r” cuối được đọc khi từ sau bắt đầu bằng nguyên âm (far‿away /fɑːr əˈweɪ/). (2) Nuốt âm – /t/ /d/ giữa hai phụ âm thường biến mất (next door /ˌneks ˈdɔː/). (3) Biến âm – âm thay đổi do âm bên cạnh (ten people /tem ˈpiːpl/, did you /ˈdɪdʒu/).',
    rules: [
      { label: 'Phụ âm + nguyên âm', when: 'phụ âm cuối “chuyển” sang từ sau', ex: ['turn‿off', 'kind‿of', 'fact‿is'] },
      { label: 'Nguyên âm + nguyên âm', when: 'chèn /j/ sau /iː ɪ eɪ aɪ ɔɪ/, chèn /w/ sau /uː əʊ aʊ/', ex: ['the‿(j)‿environment', 'go‿(w)‿out', 'two‿(w)‿hours'] },
      { label: 'Nối /r/ (giọng Anh)', when: 'r cuối câm, nhưng được đọc khi từ sau bắt đầu bằng nguyên âm', ex: ['far‿away', 'more‿often', 'after‿all'] },
      { label: 'Nuốt /t/ /d/', when: 'giữa hai phụ âm', ex: ['next door', 'last week', 'handbag'] },
      { label: 'Biến âm', when: '/n/ → /m/ trước /p b m/; /d/ + /j/ → /dʒ/; /t/ + /j/ → /tʃ/', ex: ['ten people', 'did you', 'don\'t you'] }
    ],
    vn: 'Người Việt quen tách rời từng âm tiết, nên nói “turn – off”, “an – apple”, thậm chí chèn âm tắc họng giữa các từ. Kết quả là câu nói bị đứt quãng và thiếu trôi chảy. Ngược lại, cũng đừng lạm dụng “wanna/gonna” trong IELTS – hãy dùng nối âm tự nhiên (/ˈwɒntə/) thay vì giọng quá suồng sã. Cách sửa: đánh dấu ‿ trong câu mẫu, luyện chậm phần nối, rồi tăng tốc dần.',
    tip: 'Mẹo: “Phụ âm đi tìm nguyên âm.” Mỗi khi một từ kết thúc bằng phụ âm và từ sau bắt đầu bằng nguyên âm, hãy coi phụ âm đó như âm đầu của từ sau: “an‿apple” → “a napple”.',
    words: [
      { w: 'next door', ipa: '/ˌneks ˈdɔː/', note: 'nuốt /t/' },
      { w: 'last week', ipa: '/ˌlɑːs ˈwiːk/', note: 'nuốt /t/' },
      { w: 'handbag', ipa: '/ˈhæmbæɡ/', note: 'nuốt /d/ + /n/ → /m/' },
      { w: 'ten people', ipa: '/ˌtem ˈpiːpl/', note: 'biến âm /n/ → /m/' },
      { w: 'did you', ipa: '/ˈdɪdʒu/', note: 'biến âm /d/ + /j/ → /dʒ/' },
      { w: 'want to', ipa: '/ˈwɒntə/', note: 'dạng yếu + nối' },
      { w: 'turn off', ipa: '/ˌtɜːn ˈɒf/', note: 'nối phụ âm – nguyên âm' },
      { w: 'go out', ipa: '/ˌɡəʊ ˈwaʊt/', note: 'chèn /w/' },
      { w: 'the environment', ipa: '/ði jɪnˈvaɪrənmənt/', note: 'the = /ði/ + chèn /j/' },
      { w: 'far away', ipa: '/ˌfɑːr əˈweɪ/', note: 'nối /r/' }
    ],
    pairs: [['an apple', 'a napple'], ['turn off', 'tur noff'], ['next door', 'nex door'], ['ten boys', 'tem boys']],
    sentences: [
      'I moved‿in next door to an‿old friend last week. ↘',
      'We should turn‿off the lights to protect the‿environment. ↘',
      'Did you want to go‿out after‿all? ↗'
    ],
    quiz: [
      { q: 'Trong “next door”, âm nào thường bị nuốt?', options: ['/n/', '/t/', '/d/'], answer: 1, explain: '/t/ nằm giữa hai phụ âm /s/ và /d/ nên thường biến mất: /ˌneks ˈdɔː/.' },
      { q: '“ten people” thường được đọc như thế nào khi nói nhanh?', options: ['/ten ˈpiːpl/ tách rời', '/tem ˈpiːpl/', '/teŋ ˈpiːpl/'], answer: 1, explain: '/n/ đứng trước /p/ (âm môi) biến thành /m/ – biến âm do vị trí.' },
      { q: 'Giữa “go” và “out” chèn âm nào?', options: ['/j/', '/w/', '/r/'], answer: 1, explain: '“go” kết thúc bằng /əʊ/ (môi tròn) nên chèn /w/: /ɡəʊ waʊt/.' },
      { q: 'Trong giọng Anh, “far” đọc /fɑː/. Trong “far away”, chữ r…?', options: ['Vẫn câm', 'Được đọc thành /r/ nối', 'Đọc thành /w/'], answer: 1, explain: 'Nối /r/: r cuối được phát âm khi từ sau bắt đầu bằng nguyên âm: /fɑːr əˈweɪ/.' },
      { q: '“did you” khi nói tự nhiên thường thành?', options: ['/ˈdɪdʒu/', '/ˈdɪd juː/ tách rời', '/ˈdɪzu/'], answer: 0, explain: '/d/ + /j/ hòa thành /dʒ/: “did you” → /ˈdɪdʒu/.' }
    ]
  });

  P.push({
    id: 'chunking', group: 'stress', ipa: '/ … / … /', title: 'Ngắt nhịp theo cụm ý cho IELTS Speaking', emoji: '⏸️', level: 'B2',
    how: 'Người nói tự nhiên chia câu thành các “cụm ý” (thought groups) – mỗi cụm thường 3–7 từ, mang một ý nhỏ và có một từ được nhấn mạnh nhất. Giữa các cụm có khoảng dừng rất ngắn. Ngắt đúng chỗ giúp người nghe hiểu cấu trúc câu; ngắt sai chỗ (giữa mạo từ và danh từ, giữa giới từ và tân ngữ) làm câu vỡ vụn, nghe như đang “tìm từ”.',
    rules: [
      { label: 'Sau cụm mở đầu', when: 'cụm dẫn ý, trạng từ đầu câu', ex: ['In my opinion /', 'To be honest /'] },
      { label: 'Sau chủ ngữ dài', when: 'chủ ngữ từ 3–4 từ trở lên', ex: ['People who live in big cities / often…'] },
      { label: 'Trước liên từ, mệnh đề', when: 'because, but, which, so, although…', ex: ['/ because it saves time', '/ which is why…'] },
      { label: 'KHÔNG ngắt', when: 'giữa mạo từ – danh từ, giới từ – tân ngữ, động từ – tân ngữ ngắn', ex: ['the / environment ✗', 'in / Hanoi ✗'] }
    ],
    vn: 'Người Việt thường ngắt ở bất cứ đâu khi cần nghĩ từ, chèn “ờ… ờ…” liên tục, hoặc ngược lại nói một mạch không nghỉ vì sợ bị đánh giá là thiếu trôi chảy. Cả hai đều làm giảm điểm. Cách sửa: học sẵn các cụm từ “khối” (In my opinion, The main reason is…) để nói liền một hơi; khi cần thời gian suy nghĩ, dừng ở ranh giới cụm ý thay vì giữa cụm, và dùng cụm câu giờ tự nhiên như “Let me think…”.',
    tip: 'Thần chú: “Một hơi – một ý – một điểm nhấn.” Tốc độ lý tưởng không phải là nhanh nhất mà là đều, với khoảng dừng đúng chỗ.',
    words: [
      { w: 'To be honest,', ipa: '/tə bi ˈɒnɪst/', note: 'một cụm – nói liền' },
      { w: 'As far as I know,', ipa: '/əz ˈfɑːr əz aɪ ˈnəʊ/', note: 'một cụm – nối /r/' },
      { w: 'In my opinion,', ipa: '/ɪn ˈmaɪ əˈpɪnjən/', note: 'một cụm – nhấn “pin”' },
      { w: 'On the other hand,', ipa: '/ɒn ði ˈʌðə ˈhænd/', note: 'một cụm – nhấn “hand”' },
      { w: 'The main reason is', ipa: '/ðə ˈmeɪn ˈriːzn ɪz/', note: 'một cụm – dừng sau “is”' },
      { w: 'For example,', ipa: '/fər ɪɡˈzɑːmpl/', note: 'nối /r/ – nhấn “zam”' },
      { w: 'What I mean is', ipa: '/ˈwɒt aɪ ˈmiːn ɪz/', note: 'một cụm – nối âm' },
      { w: 'Having said that,', ipa: '/ˈhævɪŋ ˈsed ðæt/', note: 'một cụm – chuyển ý' },
      { w: 'Let me think…', ipa: '/ˈlet mi ˈθɪŋk/', note: 'câu giờ tự nhiên' },
      { w: 'I would say that', ipa: '/aɪ wəd ˈseɪ ðət/', note: '“would”, “that” dạng yếu' }
    ],
    sentences: [
      'In my OPinion / public TRANSport / is the BEST way / to reduce TRAFfic. ↘',
      'People who live in big CIties / often feel STRESSED / because of the NOISE. ↘',
      'To be HONest / I don\'t use social MEdia much / but my FRIENDS do. ↘'
    ],
    quiz: [
      { q: 'Chỗ ngắt nào là SAI?', options: ['In my opinion / education…', 'I live in / Hanoi.', 'Although it is cheap / it is slow.'], answer: 1, explain: 'Không ngắt giữa giới từ và tân ngữ (“in / Hanoi”). Hai chỗ còn lại là ranh giới cụm ý hợp lý.' },
      { q: 'Mỗi cụm ý thường có bao nhiêu từ được nhấn mạnh nhất?', options: ['Một', 'Mọi từ', 'Không có'], answer: 0, explain: 'Mỗi cụm ý có một “nhân” – từ được nhấn mạnh nhất, nơi ngữ điệu thay đổi.' },
      { q: 'Khi cần thời gian suy nghĩ, cách nào tự nhiên nhất?', options: ['Nói “ờ… ờ…” giữa cụm danh từ', 'Dừng ở ranh giới cụm hoặc dùng “Let me think…”', 'Im lặng thật lâu'], answer: 1, explain: 'Dừng ở ranh giới cụm ý hoặc dùng cụm câu giờ giúp bạn vẫn nghe trôi chảy.' },
      { q: 'Câu “People who live in big cities often feel stressed” nên ngắt ở đâu?', options: ['People / who live…', 'People who live in big cities / often feel stressed', 'big / cities'], answer: 1, explain: 'Chủ ngữ dài “People who live in big cities” là một cụm; ngắt sau nó, trước động từ.' },
      { q: 'Tiêu chí Pronunciation trong IELTS đánh giá cao điều gì về nhịp nói?', options: ['Nói càng nhanh càng tốt', 'Ngắt nhịp hợp lý, nhịp điệu tự nhiên, dễ hiểu', 'Đọc từng từ thật rõ, tách rời'], answer: 1, explain: 'Band cao yêu cầu dùng linh hoạt các đặc điểm như ngắt cụm, nhịp và ngữ điệu, giúp người nghe hiểu dễ dàng – không phải tốc độ.' }
    ]
  });
})(typeof self !== 'undefined' ? self : this);
