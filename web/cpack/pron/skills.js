/* Phát âm – Chuyên đề (tự biên soạn) */
(function (g) {
const P = g.PRON = g.PRON || [];

/* ───────────── NHÓM 1: LỖI NGƯỜI VIỆT ───────────── */

P.push({
id: 'final-consonants', group: 'vn', ipa: '/t/ /d/ /k/ /s/ /z/', title: 'Âm cuối: đừng “nuốt” phụ âm cuối', emoji: '✂️', level: 'A2', titleEn: "Final Consonants: Don’t Swallow Them",
how: 'Trong tiếng Việt, âm cuối như “t, c, p” chỉ được “chặn” lại chứ không bật hơi, và tiếng Việt không có âm cuối /s/, /z/, /v/, /dʒ/… Trong tiếng Anh, âm cuối mang nghĩa: “rice” (gạo) khác “rise” (tăng), “life” khác “live”. Hãy phát âm trọn vẹn âm cuối: /t/ /k/ /p/ rõ ràng (có thể bật nhẹ hơi), /s/ xì rõ, /z/ có rung dây thanh. Lưu ý thêm: nguyên âm đứng trước phụ âm cuối hữu thanh (/b d ɡ z v/) được kéo dài hơn một chút – đây là dấu hiệu quan trọng để người nghe phân biệt “bad” với “bat”.',
howEn: "In English, final consonants carry grammatical and lexical distinctions: “rice” differs from “rise”, and “life” from “live”. Say final stops /p, t, k/ clearly (a light release is fine; do not drop them), keep /s/ sharp, and make sure /z/ has clear vocal cord vibration. Vowels are also noticeably longer before voiced consonants (/b, d, ɡ, z, v/) than before voiceless ones.",
    rules: [
{ label: 'Phụ âm tắc /p t k/', when: 'phát âm rõ, có thể bật nhẹ hơi; không “nuốt” mất', ex: ['stop', 'fact', 'like'] },
{ label: 'Phụ âm tắc hữu thanh /b d ɡ/', when: 'rung dây thanh, nguyên âm trước kéo dài hơn', ex: ['job', 'road', 'big'] },
{ label: 'Âm xát /s z f v/', when: 'giữ luồng hơi đến hết âm, không cắt ngang', ex: ['price', 'rise', 'live'] },
{ label: 'Cụm âm cuối', when: 'đọc đủ từng phụ âm trong cụm', ex: ['fact /kt/', 'change /ndʒ/', 'health /lθ/'] }
],
vn: 'Lỗi phổ biến: bỏ hẳn âm cuối (“price” → “prai”), thay /s/ bằng “ch” cuối kiểu tiếng Việt, đọc /z/ thành /s/ (“rise” nghe như “rice”), và đọc /v/ cuối thành /p/ hoặc bỏ đi (“live” → “lip”/“li”). Cách sửa: luyện chậm, phóng đại âm cuối, sau đó nối âm cuối với nguyên âm của từ tiếp theo (“fact_is”, “price_of”) để âm cuối tự nhiên xuất hiện.',
tip: 'Thần chú: “Âm cuối là nửa nghĩa của từ.” Khi tự ghi âm, hãy tua lại và nghe riêng phần cuối mỗi từ – nếu không nghe thấy gì, giám khảo cũng vậy.',
tipEn: "Tip: Final consonants carry much of a word’s meaning, so do not drop them. Record yourself and replay only the ends of words; if you cannot hear them, a listener cannot either. Then link them into the next vowel (“fact is”, “price of”).",
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
id: 'ed-endings', group: 'vn', ipa: '/t/ /d/ /ɪd/', title: 'Đuôi -ed: /t/, /d/ hay /ɪd/?', emoji: '🔚', level: 'A2', titleEn: "Past -ed: /t/, /d/ or /ɪd/?",
how: 'Cách đọc -ed phụ thuộc vào ÂM cuối của động từ gốc (không phải chữ cái). Chỉ khi động từ kết thúc bằng âm /t/ hoặc /d/ thì -ed mới thêm một âm tiết /ɪd/. Các trường hợp khác -ed chỉ là một phụ âm dính vào cuối: /t/ sau âm vô thanh, /d/ sau âm hữu thanh và nguyên âm.',
howEn: "The pronunciation of the regular -ed suffix depends entirely on the final sound of the root verb. Only when the base verb ends in the sounds /t/ or /d/ does -ed add an extra syllable /ɪd/. Otherwise, it is an attached single consonant: /t/ after voiceless sounds, and /d/ after voiced sounds and vowels.",
    rules: [
{ label: '/ɪd/', when: 'sau âm /t/, /d/ – thêm một âm tiết', ex: ['wanted', 'needed', 'decided'] },
{ label: '/t/', when: 'sau âm vô thanh /p k f s ʃ tʃ θ/', ex: ['developed', 'reduced', 'watched'] },
{ label: '/d/', when: 'sau âm hữu thanh /b ɡ v z ʒ dʒ m n ŋ l/ và mọi nguyên âm', ex: ['improved', 'changed', 'studied'] }
],
vn: 'Người Việt thường bỏ hẳn -ed (“I work there last year”), hoặc đọc mọi -ed thành /ɪd/ (“work-ed”, “stop-ed”) khiến từ thừa một âm tiết. Một lỗi khác là đọc theo chữ: “increased” kết thúc bằng chữ “e” nhưng âm cuối của “increase” là /s/ vô thanh nên -ed đọc /t/. Cách sửa: xác định âm cuối của động từ gốc, rồi nối -ed với từ tiếp theo (“developed_a plan” → /dɪˈveləptə/).',
tip: 'Câu thần chú: “Tiền Đô → /ɪd/” (t, d thêm âm tiết). Còn lại: đặt tay lên cổ – rung thì /d/, không rung thì /t/. Lưu ý vài tính từ đặc biệt đọc /ɪd/: naked, wicked, learned (uyên bác), aged (già).',
tipEn: "Tip: “T and D add a beat” – /ɪd/ appears only after /t/ or /d/. Otherwise touch your throat: voiced /d/ vibrates, voiceless /t/ does not. A few adjectives (naked, wicked, learned, aged) take /ɪd/.",
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
id: 's-endings', group: 'vn', ipa: '/s/ /z/ /ɪz/', title: 'Đuôi -s/-es: /s/, /z/ hay /ɪz/?', emoji: '🐍', level: 'A2', titleEn: "Endings -s/-es: /s/, /z/ or /ɪz/?",
how: 'Đuôi -s/-es xuất hiện ở danh từ số nhiều, động từ ngôi thứ ba số ít (he works) và sở hữu cách (the country\'s). Cả ba đều theo cùng một quy tắc dựa trên ÂM cuối của từ gốc: thêm âm tiết /ɪz/ sau các âm “xuýt”; /s/ sau âm vô thanh; /z/ sau âm hữu thanh và nguyên âm.',
howEn: "The third-person singular, plural and possessive -s/-es endings mirror the -ed rule. After sibilants (/s, z, ʃ, ʒ, tʃ, dʒ/) an extra syllable /ɪz/ is added. After voiceless consonants it sounds as /s/; after voiced consonants and vowels it becomes /z/.",
    rules: [
{ label: '/ɪz/', when: 'sau âm xuýt /s z ʃ ʒ tʃ dʒ/ – thêm một âm tiết', ex: ['resources', 'businesses', 'changes'] },
{ label: '/s/', when: 'sau âm vô thanh /p t k f θ/', ex: ['benefits', 'effects', 'months'] },
{ label: '/z/', when: 'sau âm hữu thanh /b d ɡ v m n ŋ l/ và nguyên âm', ex: ['jobs', 'schools', 'cities'] }
],
vn: 'Lỗi thường gặp: bỏ -s hoàn toàn (giám khảo sẽ nghĩ bạn sai ngữ pháp số ít/số nhiều), đọc mọi -s thành /s/ (thực ra /z/ phổ biến hơn), hoặc quên âm tiết /ɪz/ (“change” và “changes” nghe giống nhau). Cách sửa: luyện riêng /z/ như tiếng ong “zzz” có rung dây thanh, và luôn đếm âm tiết với các từ có /ɪz/.',
tip: 'Mẹo: -s là “tấm gương” của -ed. Âm vô thanh → /s/ (như /t/), âm hữu thanh → /z/ (như /d/), âm xuýt → /ɪz/ (như /t d/ → /ɪd/). Ngoại lệ hay gặp: “says” /sez/, “does” /dʌz/ – nguyên âm thay đổi.',
tipEn: "Tip: Sibilants need /ɪz/ to stay distinct. After vowels and voiced consonants let the vocal cords buzz for /z/ (“days” /deɪz/, “plans” /plænz/); after voiceless consonants use /s/. Watch the irregular “says” /sez/ and “does” /dʌz/.",
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
{ q: '“resources” /rɪˈzɔːsɪz/ có bao nhiêu âm tiết?', options: ['3', '4', '2'], answer: 0, explain: '/rɪˈzɔːsɪz/: rɪ-zɔː-sɪz → 3 âm tiết; /ɪz/ cuối chính là âm tiết thứ ba.' },
{ q: 'Từ nào là ngoại lệ, nguyên âm thay đổi khi thêm -s?', options: ['plays', 'says', 'stays'], answer: 1, explain: '“say” /seɪ/ nhưng “says” đọc /sez/. “plays” và “stays” giữ nguyên /eɪ/ + /z/.' }
]
});

P.push({
id: 'th-sounds', group: 'vn', ipa: '/θ/ /ð/', title: 'Âm /θ/ và /ð/ – không phải “th” tiếng Việt', emoji: '👅', level: 'A2', titleEn: "/θ/ and /ð/: Not Vietnamese “th”",
how: 'Cả /θ/ và /ð/ đều là âm “giữa hai răng”: đặt đầu lưỡi nhẹ giữa răng trên và răng dưới (hoặc chạm mặt sau răng trên), rồi thổi hơi qua khe hẹp. /θ/ vô thanh – chỉ có hơi (think, health). /ð/ hữu thanh – có rung dây thanh (the, weather). Đây là âm xát kéo dài được, khác hẳn “th” tiếng Việt (một âm tắc bật hơi).',
howEn: "English dental fricatives /θ/ (voiceless: think, three) and /ð/ (voiced: this, weather) are produced by resting the tip of the tongue gently between the front teeth (or behind the upper incisors) and pushing a continuous airstream through the constriction without stopping. Unlike Vietnamese “th”, which is an aspirated stop, they are fricatives: the air keeps flowing.",
    rules: [
{ label: '/θ/ vô thanh', when: 'thường ở từ nội dung: danh từ, động từ, số đếm', ex: ['think', 'three', 'growth'] },
{ label: '/ð/ hữu thanh', when: 'thường ở từ chức năng (the, this, that, they, than) và giữa các nguyên âm', ex: ['the', 'they', 'weather'] },
{ label: 'Danh từ /θ/ → động từ /ð/', when: 'một số cặp đổi âm khi thành động từ', ex: ['bath → bathe', 'breath → breathe', 'cloth → clothe'] }
],
vn: 'Người Việt hay đọc /θ/ thành “th” tiếng Việt hoặc /t/ (“think” → “tink”), hoặc /s/ (“think” → “sink”); đọc /ð/ thành /d/ hoặc /z/ (“they” → “day”, “clothing” → “closing”). Cách sửa: soi gương – phải thấy đầu lưỡi lộ ra giữa hai hàm răng; giữ âm kéo dài “θθθθ” vài giây trước khi nói cả từ.',
tip: 'Thần chú: “Lè lưỡi – thổi hơi.” Nếu không kéo dài được âm thì bạn đang đọc /t/ hoặc /d/, chưa phải /θ/ /ð/.',
tipEn: "Tip: Put the tongue tip lightly between the teeth and let the air flow. If the sound stops like a click, you are saying /t/ or /d/ instead of /θ/ or /ð/.",
    words: [
{ w: 'think', ipa: '/θɪŋk/', note: '/θ/ đầu' },
{ w: 'three', ipa: '/θriː/', note: '/θr/' },
{ w: 'health', ipa: '/helθ/', note: '/θ/ cuối' },
{ w: 'growth', ipa: '/ɡrəʊθ/', note: '/θ/ cuối' },
{ w: 'method', ipa: '/ˈmeθəd/', note: '/θ/ giữa' },
{ w: 'the', ipa: '/ðə/', note: '/ð/ – dạng yếu' },
{ w: 'although', ipa: '/ɔːlˈðəʊ/', note: '/ð/ sau /l/' },
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
id: 'sh-ch-zh', group: 'vn', ipa: '/ʃ/ /s/ /tʃ/ /dʒ/ /ʒ/', title: '/ʃ/ – /s/ và /tʃ/ – /dʒ/ – /ʒ/', emoji: '🤫', level: 'B1', titleEn: "/ʃ/ /s/ /tʃ/ /dʒ/ /ʒ/ Contrasts",
how: '/s/: đầu lưỡi gần lợi trên, môi dẹt, tiếng xì mảnh (see). /ʃ/: lưỡi lùi ra sau một chút, môi tròn và đưa ra trước, tiếng “suỵt” trầm hơn (she). /tʃ/ và /dʒ/ là âm tắc-xát: chặn hơi hoàn toàn rồi bật ra thành /ʃ/ hoặc /ʒ/ (chair, job). /ʒ/ giống /ʃ/ nhưng có rung dây thanh, hầu như chỉ xuất hiện ở giữa từ (decision, usually, measure).',
howEn: "/s/ and /z/ are alveolar: the tongue tip is close to the ridge behind the upper teeth, the lips are spread, and the sound is thin and sharp. /ʃ/ and /ʒ/ are post-alveolar: the tongue pulls back a little and the lips round and protrude, giving a darker “shh”. /tʃ/ and /dʒ/ are affricates: a full stop of air released into /ʃ/ or /ʒ/ (chair, job). All four sounds /ʃ ʒ tʃ dʒ/ are normally made with some lip rounding; /ʒ/ is voiced and mostly occurs in the middle of words (decision, usually).",
    rules: [
{ label: '/s/ ↔ /ʃ/', when: '/ʃ/ môi tròn, lưỡi lùi sau; -tion, -cial, -tial, -ssion (mission) và -sion sau phụ âm (tension) chứa /ʃ/; -sion sau nguyên âm là /ʒ/ (vision); -stion thường là /tʃ/: question, suggestion', ex: ['social', 'pressure', 'education'] },
{ label: '/tʃ/ ↔ /ʃ/', when: '/tʃ/ có một “cú chặn” trước, /ʃ/ thì không', ex: ['chair – share', 'watch – wash', 'cheap – sheep'] },
{ label: '/dʒ/ ↔ /tʃ/', when: '/dʒ/ hữu thanh (rung), /tʃ/ vô thanh', ex: ['jeep – cheap', 'large – larch', 'job'] },
{ label: '/ʒ/', when: 'thường gặp trong -sion (sau nguyên âm), -sure (measure; nhưng pressure /ʃ/), -sual', ex: ['decision', 'measure', 'usually'] }
],
vn: 'Lỗi phổ biến: một số vùng (nhất là phía Bắc) có thể lẫn “s/x” nên “she” → “see”, “sort” ↔ “short”; /tʃ/ đọc như “ch” tiếng Việt (không bật, không tròn môi); /dʒ/ đọc thành “gi” /z/ (“job” → “zop”); /ʒ/ đọc thành /z/ hoặc /dʒ/ (“decision” → “di-xi-dần”). Cách sửa: luyện tròn môi khi phát /ʃ tʃ dʒ ʒ/ – bốn âm này đều cần môi đưa ra trước.',
tip: 'Mẹo: “Bốn âm môi chu: /ʃ/ /ʒ/ /tʃ/ /dʒ/.” Môi chu là điểm nhớ dễ; điểm phân biệt chính với /s/ /z/ vẫn là lưỡi lùi sau.',
tipEn: "Tip: Four rounded-lip sounds: /ʃ/, /ʒ/, /tʃ/, /dʒ/. Lip rounding is an easy cue, but the main difference from /s/ and /z/ is that the tongue pulls back.",
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
id: 'l-n-clusters', group: 'vn', ipa: '/l/ /n/ /str/ /sts/', title: '/l/ – /n/ và cụm phụ âm', emoji: '🧩', level: 'B1', titleEn: "/l/ vs /n/ and Clusters",
how: '/n/ là âm mũi: hơi đi ra đằng mũi (bịt mũi lại sẽ không nói được). /l/ là âm bên: đầu lưỡi chạm lợi trên, hơi đi ra hai bên lưỡi, mũi không tham gia. Ở cuối từ (school, feel), /l/ là “L tối”: cuống lưỡi nâng lên, nghe như “âu” nhẹ – nhưng không được bỏ. Cụm phụ âm (str-, spl-, -sts, -kts) phải đọc liền, KHÔNG chèn nguyên âm “ơ” giữa các phụ âm.',
howEn: "/n/ is a nasal: air flows through the nose (pinch your nose and it is blocked). /l/ is a lateral: the tongue tip touches the ridge and air passes along the sides, with no nasal airflow. At the end of a word (school, feel) /l/ is “dark”: the back of the tongue rises, giving a soft “w”-like quality, but it must not be dropped. Consonant clusters such as /str/, /spl/, /kts/ and /sts/ are said in one continuous breath, without inserting a schwa between the consonants.",
    rules: [
{ label: '/n/', when: 'hơi qua mũi – bịt mũi sẽ nghẹt', ex: ['night', 'national', 'knowledge'] },
{ label: '/l/', when: 'hơi qua hai bên lưỡi, mũi không rung', ex: ['light', 'local', 'language'] },
{ label: 'Cụm đầu', when: 'không chèn “ơ”: str- ≠ “sơ-tơ-r”', ex: ['street', 'strategy', 'explain'] },
{ label: 'Cụm cuối', when: 'đọc đủ, nhất là -sts, -kts, -nts', ex: ['tests', 'scientists', 'products'] }
],
vn: 'Một số vùng phía Bắc lẫn /l/ và /n/ (“light” ↔ “night”, “low” ↔ “no”). Hầu hết người Việt chèn nguyên âm vào cụm phụ âm (“street” → “sơ-trít”, “sport” → nghe như “support”) hoặc rút gọn cụm cuối (“tests” → “tet”). Cách sửa: với /l/–/n/, bịt mũi để kiểm tra; với cụm phụ âm, bắt đầu từ cuối cụm rồi thêm dần: “eet → reet → treet → street”.',
tip: 'Thần chú: “Một hơi, không ơ.” Một cụm phụ âm phải nằm gọn trong một nhịp, giống như “str” là một khối duy nhất.',
tipEn: "Tip: One breath, no extra vowel. Say a cluster as a single block: the “str” in “street” has no vowel inside it.",
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
id: 'word-stress', group: 'stress', ipa: '/ˈ/ Oo – oO', title: 'Trọng âm từ: các quy tắc cốt lõi', emoji: '🎯', level: 'B1', titleEn: "Core Rules of Word Stress",
how: 'Mỗi từ nhiều âm tiết có một âm tiết được nhấn: to hơn, dài hơn, cao hơn và nguyên âm rõ. Các âm tiết không nhấn thường bị giảm thành /ə/ hoặc /ɪ/. Sai trọng âm khiến người bản ngữ khó nhận ra từ hơn cả sai một âm. Ký hiệu: O = âm tiết nhấn, o = không nhấn; trong IPA, dấu ˈ đứng TRƯỚC âm tiết được nhấn.',
howEn: "In English, stressed syllables are usually longer, louder and higher in pitch, while unstressed syllables often reduce to /ə/ or /ɪ/. Wrong stress can hinder recognition more than a wrong single sound. In IPA the mark ˈ comes before the stressed syllable. Several patterns are useful tendencies, not exceptionless rules: two-syllable nouns and adjectives are often stressed on the first syllable, two-syllable verbs on the second, and suffixes such as -tion, -ic and -ity usually pull the stress onto the syllable just before them.",
    rules: [
{ label: 'Danh từ/tính từ 2 âm tiết', when: 'thường nhấn âm 1 (Oo)', ex: ['ˈproduct', 'ˈrecord (n)', 'ˈmodern'] },
{ label: 'Động từ 2 âm tiết', when: 'thường nhấn âm 2 (oO)', ex: ['reˈcord (v)', 'deˈcide', 'imˈprove'] },
{ label: '-tion, -sion, -ic, -ical, -ity', when: 'thường nhấn âm tiết ngay TRƯỚC hậu tố (có ngoại lệ: Arabic, Catholic)', ex: ['polˈlution', 'ecoˈnomic', 'aˈbility'] },
{ label: '-ee, -eer, -ese', when: 'nhấn chính hậu tố', ex: ['refuˈgee', 'volunˈteer', 'Japaˈnese'] },
{ label: 'Danh từ ghép', when: 'nhấn phần đầu', ex: ['ˈclassroom', 'ˈgreenhouse', 'ˈsmartphone'] }
],
vn: 'Tiếng Việt mỗi âm tiết đều rõ và đều nhau, nên người Việt hay đọc “e-du-ca-tion” bốn âm tiết bằng nhau, hoặc nhấn âm cuối theo thói quen (“compuTER”, “deveLOP”). Cách sửa: khi học từ mới, luôn ghi kèm mẫu trọng âm (oOo…), vỗ tay mạnh ở âm tiết nhấn, và giảm các nguyên âm còn lại thành /ə/.',
tip: 'Thần chú: “Danh trước – Động sau – Đuôi đứng trước.” Danh từ 2 âm tiết thường nhấn trước, động từ thường nhấn sau, còn -tion/-ic/-ity thường nhấn ngay âm tiết đứng trước đuôi. Đây là xu hướng, có ngoại lệ – hãy kiểm tra từ điển.',
tipEn: "Tip: Nouns first, verbs second, and stress the syllable before endings like -tion, -ic and -ity. These are strong tendencies with exceptions, so check the dictionary for new words.",
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
'We need to inCREASE PUBlic aWAREness of ENergy use. ↘',
'eduCAtion is the KEY to ecoNOmic GROWTH. ↘'
],
quiz: [
{ q: '“present” là ĐỘNG TỪ (trình bày) nhấn âm nào?', options: ['Âm 1: PREsent', 'Âm 2: preSENT', 'Không nhấn'], answer: 1, explain: 'Động từ 2 âm tiết thường nhấn âm 2: /prɪˈzent/. Danh từ “món quà” là /ˈpreznt/.' },
{ q: 'Mẫu trọng âm của “pollution”?', options: ['Ooo', 'oOo', 'ooO'], answer: 1, explain: 'Hậu tố -tion → nhấn âm tiết ngay trước: pol-LU-tion /pəˈluːʃn/.' },
{ q: '“electricity” nhấn âm tiết nào?', options: ['e', 'lec', 'tri'], answer: 2, explain: 'Hậu tố -ity → nhấn âm tiết ngay trước: e-lec-TRI-ci-ty /ɪˌlekˈtrɪsəti/.' },
{ q: 'Danh từ ghép “greenhouse” (nhà kính) nhấn ở đâu?', options: ['GREENhouse', 'greenHOUSE', 'Nhấn đều'], answer: 0, explain: 'Danh từ ghép thường nhấn phần đầu: /ˈɡriːnhaʊs/. “a green HOUSE” (cụm tính từ + danh từ) thường nhấn từ thứ hai.' },
{ q: 'Từ nào nhấn vào chính hậu tố?', options: ['economic', 'Vietnamese', 'political'], answer: 1, explain: 'Hậu tố -ese thường được nhấn khi đứng một mình: /ˌvjetnəˈmiːz/ (trong cụm như “Vietnamese food” trọng âm có thể dời). Hai từ còn lại nhấn âm tiết trước -ic/-ical.' }
]
});

P.push({
id: 'stress-shift', group: 'stress', ipa: '/ˈfəʊtəɡrɑːf/ → /fəˈtɒɡrəfi/', title: 'Trọng âm “nhảy” trong họ từ', emoji: '🦘', level: 'B2', titleEn: "Stress Shift in Word Families",
how: 'Khi thêm hậu tố, trọng âm có thể di chuyển sang âm tiết khác – và nguyên âm thay đổi theo: âm tiết được nhấn có nguyên âm đầy đủ, âm tiết mất trọng âm bị giảm thành /ə/. Ví dụ: ˈPHOtograph /ˈfəʊtəɡrɑːf/ → phoˈTOgraphy /fəˈtɒɡrəfi/ → photoˈGRAphic /ˌfəʊtəˈɡræfɪk/. Chữ “o” đầu tiên đổi từ /əʊ/ thành /ə/ rồi lại /əʊ/.',
howEn: "When a suffix is added, stress often moves to a different syllable, and the vowel of the previously stressed syllable reduces: the first “o” of photograph is /əʊ/, becomes /ə/ in photography, and is /əʊ/ again in photographic (/ˈfəʊtəɡrɑːf/ → /fəˈtɒɡrəfi/ → /ˌfəʊtəˈɡræfɪk/). Keeping the stress of the base word (PHOtography) is an error that listeners notice easily.",
    rules: [
{ label: '-y, -ity (sau gốc nhiều âm tiết)', when: 'trọng âm thường lùi về âm thứ 3 từ cuối', ex: ['phoˈtography', 'eˈconomy', 'deˈmocracy'] },
{ label: '-ic, -ical', when: 'nhấn ngay trước hậu tố', ex: ['photoˈgraphic', 'ecoˈnomic', 'demoˈcratic'] },
{ label: '-tion, -sion, -cian', when: 'nhấn ngay trước hậu tố', ex: ['poliˈtician', 'eduˈcation', 'compeˈtition'] },
{ label: 'Nguyên âm thay đổi', when: 'mất trọng âm → /ə/; được nhấn → nguyên âm đầy đủ', ex: ['/ɪˈkɒnəmi/ → /ˌiːkəˈnɒmɪk/'] }
],
vn: 'Người học thường “giữ nguyên” trọng âm của từ gốc cho cả họ từ: đọc “PHOtography”, “POlitical”, “ECOnomic”. Đây là lỗi đặc biệt dễ nghe thấy trong IELTS vì các từ economy/economic, technology/technological xuất hiện liên tục. Cách sửa: học họ từ theo bộ, đọc to cả bộ liền nhau và vỗ tay theo trọng âm.',
tip: 'Mẹo: Đếm từ cuối lên. -y/-ity: thường nhấn âm thứ 3 từ cuối; -ic/-tion/-sion/-cian: nhấn âm thứ 2 từ cuối (ngay trước đuôi). Hậu tố như -ism thường không dời trọng âm (criticize → criticism), nhưng có ngoại lệ (Catholic → Catholicism).',
tipEn: "Tip: Count back from the end. -y/-ity usually put the stress on the third syllable from the end (phoˈtography, eˈconomy); -ic/-tion/-sion/-cian put it on the syllable just before the ending (photoˈgraphic, poliˈtician). Suffixes such as -ism usually leave the stress where it was (criticize → criticism), with exceptions such as Catholic → Catholicism.",
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
'He STUdied phoTOgraphy and beCAME a proFESsional phoTOgrapher. ↘'
],
quiz: [
{ q: '“photography” nhấn âm tiết nào?', options: ['pho-TO-gra-phy', 'PHO-to-gra-phy', 'pho-to-GRA-phy'], answer: 0, explain: 'Hậu tố -y → nhấn âm thứ 3 từ cuối: /fəˈtɒɡrəfi/.' },
{ q: '“economic” có mẫu trọng âm nào?', options: ['oOoo', 'Oooo', 'ooOo'], answer: 2, explain: '-ic → nhấn ngay trước: e-co-NO-mic /ˌiːkəˈnɒmɪk/.' },
{ q: 'Trong “photographer”, trọng âm nằm ở?', options: ['PHO', 'TO', 'GRA'], answer: 1, explain: '“photographer” /fəˈtɒɡrəfə/ nhấn giống “photography”.' },
{ q: 'Chữ “o” đầu trong “political” đọc là?', options: ['/ə/', '/ɒ/', '/əʊ/'], answer: 0, explain: 'Trọng âm chuyển sang “li” nên âm “po” bị giảm thành /ə/: /pəˈlɪtɪkl/. Trong “politics” nó là /ɒ/ vì được nhấn.' },
{ q: 'Từ nào nhấn khác hai từ còn lại?', options: ['technology', 'economy', 'democratic'], answer: 2, explain: '“democratic” /ˌdeməˈkrætɪk/ nhấn âm 3 (ooOo); “technology” và “economy” đều nhấn âm 2 (oOoo).' }
]
});

P.push({
id: 'weak-forms', group: 'stress', ipa: '/ə/ /tə/ /fə/ /əv/', title: 'Trọng âm câu và dạng yếu', emoji: '🥁', level: 'B1', titleEn: "Sentence Stress & Weak Forms",
how: 'Tiếng Anh có nhịp dựa trên trọng âm: các từ mang nội dung (danh từ, động từ chính, tính từ, trạng từ, từ phủ định, từ để hỏi) được nhấn; các từ chức năng (giới từ, mạo từ, trợ động từ, đại từ, liên từ) thường đọc nhanh và nhẹ với nguyên âm /ə/ – gọi là dạng yếu. Khoảng cách giữa các từ được nhấn có xu hướng khá đều nhau, nên các từ yếu bị “nén” lại.',
howEn: "In natural spoken English, content words (nouns, main verbs, adjectives, adverbs), negatives and question words receive sentence stress, while grammatical function words (articles, prepositions, auxiliaries, pronouns, conjunctions) are often reduced to weak forms with /ə/ in the middle of a sentence. Stressed words tend to fall at fairly regular intervals, so weak words are squeezed between them. Function words keep strong forms at the end of a clause, when stressed for contrast, and negatives such as can’t are separate words with a full vowel (UK /kɑːnt/, US /kænt/). Saying every word with a full vowel makes speech sound stiff and robotic.",
    rules: [
{ label: 'Từ được nhấn', when: 'danh từ, động từ chính, tính từ, trạng từ, not/never, từ để hỏi', ex: ['TRAFfic', 'reDUCE', 'SERious'] },
{ label: 'Dạng yếu', when: 'giới từ, mạo từ, trợ động từ, liên từ khi đứng giữa câu', ex: ['to /tə/', 'for /fə/', 'and /ən/'] },
{ label: 'Dạng mạnh', when: 'khi đứng cuối câu hoặc được nhấn đối lập; “can’t” là từ riêng với nguyên âm đầy đủ', ex: ['Where are you FROM? /frɒm/', 'I CAN. /kæn/', 'can\'t /kɑːnt/ (Anh), /kænt/ (Mỹ)'] }
],
vn: 'Người Việt đọc mọi từ to và rõ như nhau (“I – WANT – TO – GO – TO – THE – PARK”), làm câu nghe “cứng như robot” và giám khảo khó nhận ra từ khóa. Đặc biệt nguy hiểm: “can” đọc mạnh /kæn/ dễ bị nghe thành “can\'t”. Cách sửa: gạch chân từ nội dung, đọc to chúng trước, sau đó “chèn” các từ yếu vào giữa thật nhanh mà giữ nguyên nhịp.',
tip: 'Thần chú: “Nội dung thì nhấn – chức năng thì lướt.” Khi không nhấn, “can” khẳng định là /kən/, còn “can\'t” là /kɑːnt/ (giọng Mỹ: /kænt/) – nguyên âm khác hẳn.',
tipEn: "Tip: Stress the content, glide over the grammar. Positive “can” is usually /kən/, whereas “can’t” keeps a full vowel: /kɑːnt/ in British English, /kænt/ in American English.",
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
'MOST of my FRIENDS are INterested in techNOlogy. ↘'
],
quiz: [
{ q: 'Trong “a cup of tea”, “of” thường đọc là?', options: ['/əv/ hoặc /ə/', '/ɒv/', '/ɒf/'], answer: 0, explain: 'Giữa câu, “of” là dạng yếu /əv/, nói nhanh có thể chỉ còn /ə/: /ə ˈkʌp ə ˈtiː/.' },
{ q: 'Từ nào thường ĐƯỢC NHẤN trong câu?', options: ['the', 'and', 'pollution'], answer: 2, explain: '“pollution” là danh từ – từ nội dung. “the” và “and” là từ chức năng, thường đọc yếu.' },
{ q: 'Câu “I can swim” trong giọng Anh, “can” đọc là?', options: ['/kæn/', '/kən/', '/kɑːn/'], answer: 1, explain: 'Khẳng định, giữa câu → /kən/, và nhấn vào “SWIM”. “can\'t” mới là /kɑːnt/.' },
{ q: 'Khi nào “from” dùng dạng mạnh /frɒm/?', options: ['Ở cuối câu: “Where are you from?”', 'Luôn luôn', 'Không bao giờ'], answer: 0, explain: 'Giới từ đứng cuối câu dùng dạng mạnh. Giữa câu (“I come from Hanoi”) là /frəm/.' },
{ q: 'Âm phổ biến nhất trong dạng yếu là?', options: ['/ʌ/', '/æ/', '/ə/ (schwa)'], answer: 2, explain: 'Hầu hết dạng yếu dùng /ə/: /tə/, /fə/, /ən/, /ət/, /wəz/…' }
]
});

P.push({
id: 'intonation', group: 'stress', ipa: '↘ ↗ ↘↗', title: 'Ngữ điệu: lên, xuống và thể hiện thái độ', emoji: '🎢', level: 'B2', titleEn: "Intonation: Rise, Fall, Attitude",
how: 'Ngữ điệu là sự lên xuống cao độ của cả câu, tập trung ở từ được nhấn mạnh nhất cuối nhóm ý (gọi là “nhân”). Tiếng Việt dùng thanh điệu cho từng âm tiết để đổi nghĩa từ; tiếng Anh dùng ngữ điệu cho cả cụm để thể hiện thông tin đã xong hay chưa, đang hỏi hay khẳng định, và thái độ (chắc chắn, ngạc nhiên, lưỡng lự).',
howEn: "Intonation is the rise and fall of pitch across a phrase, concentrated on the nucleus, the most prominent word of the thought group. Vietnamese uses tones on single syllables to change word meaning; English uses intonation over whole phrases to signal attitude, grammatical structure and intent. A fall usually signals that the information is complete (statements, Wh-questions); a rise typically marks yes/no questions and checking (“Do you like it? ↗”, “Really? ↗”), although British speakers also often fall on yes/no questions; a fall-rise signals reservation or that there is more to come.",
    rules: [
{ label: 'Xuống ↘', when: 'câu trần thuật, câu hỏi Wh-, mệnh lệnh – thông tin đã hoàn chỉnh', ex: ['I live in Hanoi. ↘', 'What do you do? ↘'] },
{ label: 'Lên ↗', when: 'câu hỏi Yes/No (thường lên, nhưng giọng Anh cũng hay xuống), hỏi lại, thể hiện quan tâm', ex: ['Do you like it? ↗', 'Really? ↗'] },
{ label: 'Liệt kê ↗ ↗ ↘', when: 'lên ở mỗi mục, xuống ở mục cuối', ex: ['buses ↗, trains ↗ and bikes ↘'] },
{ label: 'Xuống-lên ↘↗', when: 'chưa nói hết, có ý “nhưng…”, lịch sự, lưỡng lự', ex: ['Well ↘↗…', 'Actually ↘↗, I prefer…'] }
],
vn: 'Lỗi thường gặp: nói đều đều (monotone) vì sợ sai, hoặc xuống giọng giữa câu khiến giám khảo nghĩ bạn đã nói xong; lên giọng cuối câu trần thuật khiến câu nghe như câu hỏi, thiếu tự tin. Cách sửa: ở mỗi câu trả lời IELTS, chọn từ quan trọng nhất cuối câu và cho giọng “rơi” rõ ở đó; với ý chưa xong, giữ giọng ở mức ngang hoặc hơi lên.',
tip: 'Mẹo: “Xong thì xuống, hỏi có/không thì lên, còn tiếp thì treo.” Phạm vi cao độ rộng hơn = nghe hào hứng và tự nhiên hơn.',
tipEn: "Tip: “Finished, fall; yes/no question, rise; more to come, hang.” A wider pitch range also makes you sound more engaged and natural.",
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
'I preFER living in the CIty. ↘',
'Do you THINK it will CHANGE? ↗',
'We need more BUSes ↗, more TRAINS ↗ and SAFer CYcle lanes. ↘'
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
id: 'connected-speech', group: 'stress', ipa: '‿ /neks dɔː/ /ˈdɪdʒuː/', title: 'Nối âm, nuốt âm và biến âm', emoji: '🔗', level: 'B2', titleEn: "Linking, Elision, Assimilation",
how: 'Người bản ngữ không nói từng từ tách rời mà “dính” các từ lại. Ba hiện tượng chính: (1) Nối âm – phụ âm cuối nối với nguyên âm đầu từ sau (turn‿off), giữa hai nguyên âm chèn /j/ hoặc /w/ (the‿/j/‿end, go‿/w/‿out), và trong giọng Anh, chữ “r” cuối được đọc khi từ sau bắt đầu bằng nguyên âm (far‿away /fɑːr əˈweɪ/). (2) Nuốt âm – /t/ /d/ giữa hai phụ âm thường biến mất (next door /ˌneks ˈdɔː/). (3) Biến âm – âm thay đổi do âm bên cạnh (ten people /tem ˈpiːpl/, did you /ˈdɪdʒu/).',
howEn: "Fluent speech links words instead of pronouncing isolated tokens. Main features: consonant-to-vowel linking (turn off), /j/ and /w/ glides between vowels (the‿/j/‿end, go‿/w/‿out), linking /r/ in British accents (far‿away), elision of /t, d/ between consonants (next door), and assimilation, where a sound changes under the influence of its neighbour (ten people, did you).",
    rules: [
{ label: 'Phụ âm + nguyên âm', when: 'phụ âm cuối “chuyển” sang từ sau', ex: ['turn‿off', 'kind‿of', 'fact‿is'] },
{ label: 'Nguyên âm + nguyên âm', when: 'chèn /j/ sau /iː ɪ eɪ aɪ ɔɪ/, chèn /w/ sau /uː əʊ aʊ/', ex: ['the‿(j)‿environment', 'go‿(w)‿out', 'two‿(w)‿hours'] },
{ label: 'Nối /r/ (giọng Anh)', when: 'r cuối câm, nhưng được đọc khi từ sau bắt đầu bằng nguyên âm', ex: ['far‿away', 'more‿often', 'after‿all'] },
{ label: 'Nuốt /t/ /d/', when: 'giữa hai phụ âm', ex: ['next door', 'last week', 'handbag'] },
{ label: 'Biến âm', when: '/n/ → /m/ trước /p b m/; /d/ + /j/ → /dʒ/; /t/ + /j/ → /tʃ/', ex: ['ten people', 'did you', 'don\'t you'] }
],
vn: 'Người Việt quen tách rời từng âm tiết, nên nói “turn – off”, “an – apple”, thậm chí chèn âm tắc họng giữa các từ. Kết quả là câu nói bị đứt quãng và thiếu trôi chảy. Ngược lại, cũng đừng lạm dụng “wanna/gonna” trong IELTS – hãy dùng nối âm tự nhiên (/ˈwɒntə/) thay vì giọng quá suồng sã. Cách sửa: đánh dấu ‿ trong câu mẫu, luyện chậm phần nối, rồi tăng tốc dần.',
tip: 'Mẹo: “Phụ âm đi tìm nguyên âm.” Mỗi khi một từ kết thúc bằng phụ âm và từ sau bắt đầu bằng nguyên âm, hãy coi phụ âm đó như âm đầu của từ sau: “an‿apple” → “a napple”.',
tipEn: "Tip: Consonants look for vowels. Attach a final consonant to the next word if it starts with a vowel: “an‿apple” sounds like “a napple”.",
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
{ q: 'Trong “next door”, âm nào thường bị nuốt?', options: ['/n/', '/d/', '/t/'], answer: 2, explain: '/t/ nằm giữa hai phụ âm /s/ và /d/ nên thường biến mất: /ˌneks ˈdɔː/.' },
{ q: '“ten people” thường được đọc như thế nào khi nói nhanh?', options: ['/tem ˈpiːpl/', '/ten ˈpiːpl/ tách rời', '/teŋ ˈpiːpl/'], answer: 0, explain: '/n/ đứng trước /p/ (âm môi) biến thành /m/ – biến âm do vị trí.' },
{ q: 'Giữa “go” và “out” chèn âm nào?', options: ['/j/', '/w/', '/r/'], answer: 1, explain: '“go” kết thúc bằng /əʊ/ (môi tròn) nên chèn /w/: /ɡəʊ waʊt/.' },
{ q: 'Trong giọng Anh, “far” đọc /fɑː/. Trong “far away”, chữ r…?', options: ['Vẫn câm', 'Đọc thành /w/', 'Được đọc thành /r/ nối'], answer: 2, explain: 'Nối /r/: r cuối được phát âm khi từ sau bắt đầu bằng nguyên âm: /fɑːr əˈweɪ/.' },
{ q: '“did you” khi nói tự nhiên thường thành?', options: ['/ˈdɪdʒu/', '/ˈdɪd juː/ tách rời', '/ˈdɪzu/'], answer: 0, explain: '/d/ + /j/ hòa thành /dʒ/: “did you” → /ˈdɪdʒu/.' }
]
});

P.push({
id: 'chunking', group: 'stress', ipa: '/ … / … /', title: 'Ngắt nhịp theo cụm ý cho IELTS Speaking', emoji: '⏸️', level: 'B2', titleEn: "Thought Groups for IELTS Speaking",
how: 'Người nói tự nhiên chia câu thành các “cụm ý” (thought groups) – mỗi cụm thường 3–7 từ, mang một ý nhỏ và có một từ được nhấn mạnh nhất. Giữa các cụm có khoảng dừng rất ngắn. Ngắt đúng chỗ giúp người nghe hiểu cấu trúc câu; ngắt sai chỗ (giữa mạo từ và danh từ, giữa giới từ và tân ngữ) làm câu vỡ vụn, nghe như đang “tìm từ”.',
howEn: "Divide speech into meaningful thought groups (tone units) of roughly 3–7 words, separated by brief pauses. Each chunk carries one central nucleus. Break at clause boundaries; avoid breaking between an article and its noun or a preposition and its object, which makes you sound as if you are searching for words. Steady rhythm with purposeful pauses sounds more fluent than speed.",
    rules: [
{ label: 'Sau cụm mở đầu', when: 'cụm dẫn ý, trạng từ đầu câu', ex: ['In my opinion /', 'To be honest /'] },
{ label: 'Sau chủ ngữ dài', when: 'chủ ngữ từ 3–4 từ trở lên', ex: ['People who live in big cities / often…'] },
{ label: 'Trước liên từ, mệnh đề', when: 'because, but, which, so, although…', ex: ['/ because it saves time', '/ which is why…'] },
{ label: 'KHÔNG ngắt', when: 'giữa mạo từ – danh từ, giới từ – tân ngữ, động từ – tân ngữ ngắn', ex: ['the / environment ✗', 'in / Hanoi ✗'] }
],
vn: 'Người Việt thường ngắt ở bất cứ đâu khi cần nghĩ từ, chèn “ờ… ờ…” liên tục, hoặc ngược lại nói một mạch không nghỉ vì sợ bị đánh giá là thiếu trôi chảy. Cả hai đều làm giảm điểm. Cách sửa: học sẵn các cụm từ “khối” (In my opinion, The main reason is…) để nói liền một hơi; khi cần thời gian suy nghĩ, dừng ở ranh giới cụm ý thay vì giữa cụm, và dùng cụm câu giờ tự nhiên như “Let me think…”.',
tip: 'Thần chú: “Một hơi – một ý – một điểm nhấn.” Tốc độ lý tưởng không phải là nhanh nhất mà là đều, với khoảng dừng đúng chỗ.',
tipEn: "Tip: One breath, one idea, one nucleus. Good fluency is not maximum speed but steady rhythm with purposeful pauses.",
    words: [
{ w: 'To be honest,', ipa: '/tə bi ˈɒnɪst/', note: 'một cụm – nói liền' },
{ w: 'As far as I know,', ipa: '/əz ˈfɑːr əz aɪ ˈnəʊ/', note: 'một cụm – nối /r/' },
{ w: 'In my opinion,', ipa: '/ɪn maɪ əˈpɪnjən/', note: 'một cụm – nhấn “pin”' },
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
{ q: 'Mỗi cụm ý thường có bao nhiêu từ được nhấn mạnh nhất?', options: ['Mọi từ', 'Không có', 'Một'], answer: 2, explain: 'Mỗi cụm ý có một “nhân” – từ được nhấn mạnh nhất, nơi ngữ điệu thay đổi.' },
{ q: 'Khi cần thời gian suy nghĩ, cách nào tự nhiên nhất?', options: ['Dừng ở ranh giới cụm hoặc dùng “Let me think…”', 'Nói “ờ… ờ…” giữa cụm danh từ', 'Im lặng thật lâu'], answer: 0, explain: 'Dừng ở ranh giới cụm ý hoặc dùng cụm câu giờ giúp bạn vẫn nghe trôi chảy.' },
{ q: 'Câu “People who live in big cities often feel stressed” nên ngắt ở đâu?', options: ['People / who live…', 'big / cities', 'People who live in big cities / often feel stressed'], answer: 2, explain: 'Chủ ngữ dài “People who live in big cities” là một cụm; ngắt sau nó, trước động từ.' },
{ q: 'Tiêu chí Pronunciation trong IELTS đánh giá cao điều gì về nhịp nói?', options: ['Ngắt nhịp hợp lý, nhịp điệu tự nhiên, dễ hiểu', 'Nói càng nhanh càng tốt', 'Đọc từng từ thật rõ, tách rời'], answer: 0, explain: 'Band cao yêu cầu dùng linh hoạt các đặc điểm như ngắt cụm, nhịp và ngữ điệu, giúp người nghe hiểu dễ dàng – không phải tốc độ.' }
]
});

/* ───────────── NHÓM 3: NÂNG CAO B2–C1 (NGỮ ÂM HỌC THUẬT & GIAO TIẾP TỰ NHIÊN) ───────────── */

P.push({
  id: 'linking-catenation', group: 'stress', ipa: 'law‿r‿and order', title: 'Nối âm nâng cao: /r/ chèn trong giọng Anh', emoji: '🔗', level: 'C1', titleEn: "Intrusive /r/ in British English",
  how: 'Giọng Anh chuẩn (RP) không đọc r ở cuối từ, nhưng có hai hiện tượng ngược nhau mà người nghe nâng cao cần nhận ra. /r/ nối (linking r): chữ “r” cuối từ được đọc khi từ sau bắt đầu bằng nguyên âm (“far away”). /r/ chèn (intrusive r): sau /ə/, /ɑː/, /ɔː/ dù KHÔNG có chữ “r”, người nói vẫn thêm /r/ trước nguyên âm kế tiếp: “criteria are” /kraɪˈtɪəriər ə/, “law and order” /ˌlɔːr ən ˈɔːdə/. Hiện tượng này còn xuất hiện bên trong từ dẫn xuất: “drawing” thường là /ˈdrɔːrɪŋ/, “withdrawal” /wɪðˈdrɔːrəl/. Một số người coi /r/ chèn là kém chuẩn và tránh nó, nên bạn chỉ cần nhận ra khi nghe. Giọng Mỹ chuẩn đọc r cuối từ nên không cần chèn (một vài giọng như Boston lại có).',
  howEn: "RP and other non-rhotic British accents do not pronounce a final r, yet two opposite phenomena are worth recognising. Linking /r/: a written final “r” is pronounced when the next word begins with a vowel (far away). Intrusive /r/: after /ə/, /ɑː/ and /ɔː/ there is no “r” in the spelling, yet speakers add /r/ before a following vowel: “criteria are” /kraɪˈtɪəriər ə/, “law and order” /ˌlɔːr ən ˈɔːdə/. It also occurs inside derived words: “drawing” is often /ˈdrɔːrɪŋ/ and “withdrawal” /wɪðˈdrɔːrəl/. Some speakers regard intrusive /r/ as non-standard and avoid it, so you only need to recognise it. Standard American English pronounces final r and does not need it (a few accents, such as Boston, do have it).",
  rules: [
    { label: '/r/ nối (linking r)', when: 'chữ r cuối từ, từ sau bắt đầu bằng nguyên âm: r được đọc', ex: ['hear it /ˈhɪər ɪt/', 'whether or not /ˌweðər ɔː ˈnɒt/'] },
    { label: '/r/ chèn sau /ə/', when: 'từ kết thúc bằng /ə/ (viết -a) + từ sau bắt đầu bằng nguyên âm', ex: ['criteria are /kraɪˈtɪəriər ə/', 'the idea of it /ði aɪˈdɪər əv ɪt/'] },
    { label: '/r/ chèn sau /ɔː ɑː/', when: 'từ kết thúc bằng /ɔː/ hoặc /ɑː/ không có chữ r', ex: ['law and order /ˌlɔːr ən ˈɔːdə/', 'the spa is /ðə ˈspɑːr ɪz/'] },
    { label: '/r/ chèn trong từ dẫn xuất', when: 'gốc từ kết thúc bằng /ɔː/ + hậu tố bắt đầu bằng nguyên âm', ex: ['drawing /ˈdrɔːrɪŋ/', 'withdrawal /wɪðˈdrɔːrəl/'] }
  ],
  vn: 'Người học thường dừng khựng giữa hai nguyên âm, hoặc đọc r ở mọi cuối từ theo kiểu Mỹ rồi bối rối khi nghe thấy /r/ ở chỗ không có chữ r. Cách sửa: khi nghe giọng Anh, chú ý /r/ xuất hiện trước nguyên âm sau /ə ɑː ɔː/; còn nói thì bạn không bắt buộc phải bắt chước /r/ chèn.',
  tip: 'Mẹo: Nếu bạn nghe thấy /r/ mà chính tả không có r, đó là /r/ chèn: nó chỉ xuất hiện sau /ə ɑː ɔː/ và trước nguyên âm trong giọng Anh.',
  tipEn: "Tip: If you hear an /r/ that the spelling does not have, it is an intrusive /r/: in British accents it appears only after /ə/, /ɑː/ or /ɔː/, before a vowel.",
  words: [
    { w: 'criteria', ipa: '/kraɪˈtɪəriə/', note: '/r/ chèn: criteria are' },
    { w: 'media', ipa: '/ˈmiːdiə/', note: '/r/ chèn: media are' },
    { w: 'formula', ipa: '/ˈfɔːmjʊlə/', note: '/r/ chèn: formula is' },
    { w: 'agenda', ipa: '/əˈdʒendə/', note: '/r/ chèn: agenda item' },
    { w: 'diploma', ipa: '/dɪˈpləʊmə/', note: '/r/ chèn: diploma in' },
    { w: 'area', ipa: '/ˈeəriə/', note: '/r/ chèn: area of' },
    { w: 'draw', ipa: '/drɔː/', note: '/r/ chèn: draw a conclusion; drawing' },
    { w: 'law', ipa: '/lɔː/', note: '/r/ chèn: law and order' },
    { w: 'withdrawal', ipa: '/wɪðˈdrɔːəl/', note: 'thường /wɪðˈdrɔːrəl/' },
    { w: 'hear', ipa: '/hɪə/', note: '/r/ nối (có chữ r): hear it' }
  ],
  sentences: [
    'The criteria are applied consistently to every application.',
    'Several media outlets in the area of economics remain poorly informed.',
    'A diploma in law and public administration opens many doors.'
  ],
  quiz: [
    { q: 'Trong giọng Anh, “criteria are” thường được nói như thế nào?', options: ['/kraɪˈtɪəriə ɑː/ với một tiếng tắc họng bắt buộc', '/kraɪˈtɪəriər ə/ – có /r/ chèn dù không có chữ r', '/kraɪˈtɪəriəl ə/'], answer: 1, explain: 'Sau /ə/ và trước nguyên âm, nhiều người nói Anh thêm /r/ (intrusive r) dù chính tả không có r.' },
    { q: 'Điểm khác nhau giữa /r/ nối và /r/ chèn là gì?', options: ['/r/ nối có chữ r trong chính tả, /r/ chèn thì không', '/r/ nối chỉ gặp ở giọng Mỹ', '/r/ chèn chỉ gặp ở cuối câu'], answer: 0, explain: '“far away” có chữ r (nối); “law and order” không có chữ r nhưng vẫn nghe /r/ (chèn).' },
    { q: 'Từ nào sau đây thường có /r/ chèn ngay bên trong từ (không có chữ r ở chỗ đó)?', options: ['hearing', 'drawing', 'story'], answer: 1, explain: '“drawing” = draw + -ing: sau /ɔː/ và trước nguyên âm thường chèn /r/ (/ˈdrɔːrɪŋ/); “hearing” và “story” có chữ r thật ở giữa từ.' },
    { q: 'Với giọng Mỹ chuẩn (đọc r cuối từ), /r/ chèn…', options: ['là đặc điểm bắt buộc', 'không cần thiết, vì r cuối vốn đã được đọc', 'chỉ gặp ở người học tiếng Anh'], answer: 1, explain: 'Giọng Mỹ chuẩn đọc r cuối nên không cần chèn /r/ để nối nguyên âm; một vài giọng như Boston lại có.' },
    { q: 'Là người học, bạn nên làm gì với /r/ chèn?', options: ['Bắt buộc dùng trong mọi câu', 'Tránh hoàn toàn vì là lỗi', 'Nhận ra khi nghe; dùng hay không tùy giọng bạn học'], answer: 2, explain: 'Một số người coi /r/ chèn là kém chuẩn; mục tiêu chính là nhận ra để nghe hiểu, không bắt buộc bắt chước.' }
  ]
});

P.push({
  id: 'sentence-stress-focus', group: 'stress', ipa: 'FOCUS · given/new', title: 'Trọng tâm thông tin: dời nhân trong câu', emoji: '🎯', level: 'C1', titleEn: "Information Focus: Moving the Nucleus",
  how: 'Trong bài này, CHỮ HOA là từ mang nhân (không đánh dấu trọng âm trong từ). Mỗi cụm ý có một từ mang “nhân” (nucleus) – nơi giọng thay đổi cao độ rõ nhất. Mặc định (trung tính) nhân rơi vào từ nội dung cuối của cụm. Người nói dời nhân để báo đâu là thông tin trọng tâm: thông tin MỚI được nhấn, thông tin ĐÃ BIẾT (vừa nhắc) bị hạ xuống; khi đính chính hay đối lập thì nhấn từ làm khác biệt. Cùng một câu, nhấn ở từ khác nhau sẽ đổi ý: “I didn’t say HE took it” (có thể người khác lấy) ≠ “I didn’t say he TOOK it” (có thể anh ấy mượn).',
  howEn: "In this lesson CAPITALS mark the word that carries the nucleus (lexical stress inside words is not marked). Each thought group has one nucleus, the word that carries the main pitch movement. By default it falls on the last content word. Speakers move it to mark information structure: new information is stressed and given information (already mentioned) is de-accented, and contrast or correction pulls the nucleus onto the word that differs. The same sentence changes meaning when the focus moves: “I didn’t say HE took it” (perhaps someone else did) versus “I didn’t say he TOOK it” (perhaps he borrowed it).",
  rules: [
    { label: 'Nhân trung tính', when: 'rơi vào từ nội dung cuối cùng của cụm ý', ex: ['We’re launching the initiative in SEPTEMBER', 'She submitted the revised PROPOSAL'] },
    { label: 'Thông tin mới – đã biết', when: 'từ vừa nhắc thì hạ xuống; thông tin mới nhận nhân', ex: ['We’ve hired a new MANAGER. The manager is called SARA.'] },
    { label: 'Đối lập / đính chính', when: 'nhấn từ khác biệt; mỗi vị trí nhấn cho một nghĩa khác', ex: ['I didn’t say HE took it', 'I didn’t SAY he took it', 'I didn’t say he TOOK it'] }
  ],
  vn: 'Người học thường nhấn đều mọi từ khóa (như đánh vần) hoặc nhấn lại cả những từ vừa nhắc, nên người nghe không biết thông tin nào mới. Cách sửa: trước khi nói, tự hỏi “điều người nghe CHƯA biết là gì?” rồi đặt nhân ở đó; những từ đã nhắc thì nói nhẹ và nhanh.',
  tip: 'Mẹo: Hỏi trước khi nói: “Thông tin nào là mới?” Nhấn từ đó, và hạ giọng ở những gì người nghe đã biết.',
  tipEn: "Tip: Ask yourself which piece of information is new to the listener, put the nucleus on it, and lower the pitch on what they already know.",
  words: [
    { w: 'only', ipa: '/ˈəʊnli/', note: 'từ chỉ trọng tâm: I only bought ONE (nhân dời theo ý)' },
    { w: 'even', ipa: '/ˈiːvn/', note: 'nhấn mạnh bất ngờ: even HE agreed' },
    { w: 'just', ipa: '/dʒʌst/', note: 'giới hạn: just a MINUTE' },
    { w: 'also', ipa: '/ˈɔːlsəʊ/', note: 'thêm thông tin: thường nhân ở mục được thêm (She also speaks FRENCH)' },
    { w: 'instead', ipa: '/ɪnˈsted/', note: 'thay thế: nhân ở phần thay thế' },
    { w: 'rather than', ipa: '/ˈrɑːðə ðæn/', note: 'đối lập: nhân ở hai vế đối lập' },
    { w: 'in fact', ipa: '/ɪn ˈfækt/', note: 'đính chính: in FACT' },
    { w: 'at least', ipa: '/ət ˈliːst/', note: 'mức tối thiểu: at LEAST' },
    { w: 'on the contrary', ipa: '/ɒn ðə ˈkɒntrəri/', note: 'phản bác: nhân ở contrary' },
    { w: 'as opposed to', ipa: '/əz əˈpəʊzd tuː/', note: 'đối lập: nhân ở hai vế' }
  ],
  sentences: [
    'The decline was SUBSTANTIAL, not MARGINAL.',
    'It wasn’t the POLICY that failed; it was the IMPLEMENTATION.',
    'UNEMPLOYMENT fell, but WAGES stayed flat.'
  ],
  quiz: [
    { q: 'Trong câu trung tính, nhân thường rơi vào đâu?', options: ['Từ đầu tiên của câu', 'Từ đầu tiên của cụm ý', 'Từ nội dung cuối cùng của cụm ý'], answer: 2, explain: 'Mặc định tiếng Anh đặt nhân ở từ nội dung cuối của cụm ý (ví dụ “in SEPTEMBER”).' },
    { q: '“I didn’t say HE took it” thường gợi ý điều gì?', options: ['Anh ấy không lấy gì cả', 'Tôi không nói gì cả', 'Có thể một người khác đã lấy nó'], answer: 2, explain: 'Nhấn “HE” đối lập với người khác: người nói không bảo là anh ấy lấy – hàm ý có thể là người khác.' },
    { q: '“I didn’t say he TOOK it” thường gợi ý điều gì?', options: ['Chắc chắn có người khác lấy', 'Có thể anh ấy mượn hoặc làm việc khác chứ không “lấy”', 'Tôi không nói gì về việc đó cả'], answer: 1, explain: 'Nhấn “TOOK” đối lập hành động: người nói phủ nhận động từ đó, không phủ nhận hết sự việc.' },
    { q: 'Trong “We’ve hired a new MANAGER. The manager is called SARA.”, vì sao lần nhắc thứ hai “manager” không có nhân?', options: ['Vì “manager” là từ chức năng', 'Vì câu thứ hai nói nhanh hơn', 'Vì đó là thông tin đã biết, nhân dành cho thông tin mới (Sara)'], answer: 2, explain: 'Thông tin đã nhắc được hạ xuống (de-accent); nhân đặt vào thông tin mới.' },
    { q: 'Âm tiết mang nhân nổi bật chủ yếu nhờ…', options: ['chuyển động cao độ rõ nhất, kèm nguyên âm dài và rõ hơn', 'chỉ nói to hơn', 'chỉ nói nhanh hơn'], answer: 0, explain: 'Nhân nổi bật nhờ chuyển động cao độ, độ dài và độ rõ của nguyên âm; riêng độ to không phải yếu tố chính.' }
  ]
});

P.push({
  id: 'complex-intonation', group: 'stress', ipa: '↗ ↘ ↘↗ (sub/main)', title: 'Ngữ điệu câu phức và xuống-lên (fall-rise)', emoji: '🎢', level: 'C1', titleEn: "Complex Sentence Intonation & Fall-Rise",
  how: 'Ở trình độ C1, người nói điều khiển ngữ điệu qua nhiều mệnh đề. Khi mệnh đề phụ đứng trước (Although…, When…, If…), từ nhấn cuối mệnh đề phụ thường lên nhẹ hoặc xuống-lên (↘↗) để báo “câu chưa hết”; mệnh đề chính theo sau thường kết thúc bằng ngữ điệu xuống (↘) để báo hoàn tất. Đây là xu hướng chứ không phải luật cứng. Ngữ điệu xuống-lên còn mang ý “còn điều chưa nói” hoặc dè dặt, không phải “điều kiện”.',
  howEn: "At C1, speakers steer intonation across clauses. When a subordinate clause comes first (Although…, When…, If…), the last stressed word of that clause often carries a rise or a fall-rise (↘↗), signalling that the sentence is not finished; the main clause that follows usually ends with a fall (↘), signalling completion. These are tendencies, not fixed rules. The fall-rise also conveys reservation or that there is more to say; it is not a marker of conditionality.",
  rules: [
    { label: 'Mệnh đề phụ đầu câu', when: 'Although/If/When ở đầu: cuối mệnh đề lên nhẹ hoặc xuống-lên', ex: ['Although the evidence is thin ↗', 'If we consider the cost ↘↗'] },
    { label: 'Mệnh đề chính kết câu', when: 'câu trần thuật hoàn chỉnh: kết thúc bằng xuống', ex: ['the trend is unmistakable ↘', 'public support may erode ↘'] },
    { label: 'Trạng từ nối đầu câu', when: 'However, Moreover thường ↘↗ vì còn tiếp ý; Therefore có thể ↘ khi chốt kết luận', ex: ['However ↘↗', 'Moreover ↘↗', 'Therefore ↘'] }
  ],
  vn: 'Người học thường kết thúc mọi mệnh đề bằng cùng một giọng rơi, khiến câu phức nghe như hai câu đơn rời rạc. Hãy giữ giọng lơ lửng hoặc dùng xuống-lên ở vế đầu để dẫn người nghe sang mệnh đề chính.',
  tip: 'Mẹo: Xem mệnh đề phụ như chiếc cầu treo: giọng hơi nhấc lên ở cuối cầu để người nghe chờ bờ bên kia (mệnh đề chính).',
  tipEn: "Tip: Treat a leading subordinate clause like an open phrase: keep the pitch suspended or rising at its end so the listener expects the main clause.",
  words: [
    { w: 'although', ipa: '/ɔːlˈðəʊ/', note: 'mở đầu mệnh đề phụ: cuối vế thường ↘↗' },
    { w: 'however', ipa: '/haʊˈevə/', note: 'đầu câu thường ↘↗' },
    { w: 'therefore', ipa: '/ˈðeəfɔː/', note: 'chốt kết luận: có thể ↘' },
    { w: 'moreover', ipa: '/mɔːˈrəʊvə/', note: 'trạng từ bổ sung' },
    { w: 'furthermore', ipa: '/ˌfɜːðəˈmɔː/', note: 'trạng từ học thuật' },
    { w: 'nevertheless', ipa: '/ˌnevəðəˈles/', note: 'trạng từ nhượng bộ' },
    { w: 'admittedly', ipa: '/ədˈmɪtɪdli/', note: 'thừa nhận một phần' },
    { w: 'whereas', ipa: '/weərˈæz/', note: 'đối lập hai mệnh đề' },
    { w: 'notwithstanding', ipa: '/ˌnɒtwɪθˈstændɪŋ/', note: 'bất chấp (trang trọng)' },
    { w: 'consequently', ipa: '/ˈkɒnsɪkwəntli/', note: 'trạng từ kết quả' }
  ],
  sentences: [
    'Although the evidence is far from conclusive ↘↗, the trend is unmistakable. ↘',
    'Admittedly ↘↗, the policy has reduced emissions; however ↘↗, it has also raised costs. ↘',
    'If the reforms are introduced too hastily ↘↗, public support may erode. ↘'
  ],
  quiz: [
    { q: 'Mệnh đề chính kết thúc câu trần thuật thường dùng ngữ điệu nào?', options: ['Lên như câu hỏi', 'Xuống (↘)', 'Ngang, không đổi'], answer: 1, explain: 'Ngữ điệu xuống thường báo thông tin đã hoàn chỉnh; đây là xu hướng chung, không phải luật tuyệt đối.' },
    { q: 'Cuối mệnh đề “Although it is expensive…” đứng đầu câu thường có ngữ điệu nào?', options: ['Xuống sâu như đã kết thúc', 'Hạ giọng thật thấp rồi ngắt', 'Lên nhẹ hoặc xuống-lên (↘↗) – báo câu chưa hết'], answer: 2, explain: 'Mệnh đề phụ đứng trước thường mang giọng “mở” (lên hoặc xuống-lên) để dẫn sang mệnh đề chính.' },
    { q: 'Ngữ điệu xuống-lên (↘↗) thường truyền đạt điều gì?', options: ['Sự chắc chắn tuyệt đối', 'Báo hiệu một câu hỏi Yes/No', 'Còn điều chưa nói hoặc dè dặt'], answer: 2, explain: 'Xuống-lên thường biểu đạt sự dè dặt hoặc “còn tiếp”; nó không đồng nghĩa với “điều kiện”.' },
    { q: 'Trạng từ nối “However” ở đầu câu thường được xử lý thế nào?', options: ['Dính vào từ sau, không ngắt', 'Thường là một cụm ngữ điệu ngắn riêng, hay dùng ↘↗', 'Đọc kéo dài với giọng thật cao'], answer: 1, explain: 'Trạng từ nối đầu câu thường là một cụm ngữ điệu ngắn với giọng xuống-lên để báo ý còn tiếp; không có quy tắc tuyệt đối.' },
    { q: 'Ví dụ nào khớp với xu hướng “mệnh đề phụ mở – mệnh đề chính đóng”?', options: ['If we act now ↘↗, the damage can still be limited ↘', 'If we act now ↘, the damage can still be limited ↗', 'If we act now ↗, the damage can still be limited ↗'], answer: 0, explain: 'Mệnh đề phụ dùng xuống-lên (còn tiếp) và mệnh đề chính kết thúc bằng xuống (hoàn tất).' }
  ]
});

P.push({
  id: 'advanced-weak-forms', group: 'stress', ipa: '/ʃəd əv/ /wəd əv/ /kəd əv/', title: 'Dạng yếu nâng cao: should have, would have…', emoji: '💨', level: 'C1', titleEn: "Advanced Weak Forms: should have, would have…",
  how: 'Ở tốc độ nói tự nhiên, các cấu trúc “khuyết thiếu + have” như should have, would have, could have, must have thường được đọc rút gọn khi không nhấn: động từ khuyết thiếu yếu đi thành /ə/ và “have” thành /əv/ – tức /ʃəd əv/, /wəd əv/, /kəd əv/, /məst əv/. Cách viết tắt should’ve, would’ve… nghe cũng gần như vậy. Chính vì /əv/ nghe giống “of” nên nhiều người viết nhầm “could of”. Khi nhấn đối lập, động từ khuyết thiếu trở về dạng mạnh (“I COULD have gone” /kʊd/), và “have” giữ dạng mạnh khi đứng cuối câu (“Yes, you should have!” /hæv/).',
  howEn: "In connected speech, perfect modals such as should have, would have, could have and must have are usually reduced when unstressed: the modal vowel weakens to /ə/ and have becomes /əv/, giving /ʃəd əv/, /wəd əv/, /kəd əv/ and /məst əv/. The spelled contractions should’ve, would’ve and so on sound almost the same. Because /əv/ sounds like “of”, many writers produce the error “could of”. The modal returns to its strong form under contrastive stress (“I COULD have gone” /kʊd/), and have keeps its strong form at the end of a clause (“Yes, you should have!” /hæv/).",
  rules: [
    { label: 'should have / would have', when: 'không nhấn: đọc thành một khối với schwa', ex: ['should have → /ʃəd əv/', 'would have → /wəd əv/'] },
    { label: 'could have / must have', when: 'nguyên âm khuyết thiếu yếu đi thành /ə/', ex: ['could have → /kəd əv/', 'must have → /məst əv/'] },
    { label: 'Dạng mạnh', when: 'khuyết thiếu được nhấn đối lập; “have” ở cuối câu', ex: ['I COULD have gone. /kʊd/', 'Yes, you should have! /hæv/'] }
  ],
  vn: 'Người học thường đọc từng từ với nguyên âm đầy đủ: “I - would - have - told - you”, nghe nặng nề và tốn sức. Hãy thả lỏng, để trợ động từ lướt nhanh như một âm đệm nhẹ rồi dồn lực vào động từ chính.',
  tip: 'Thần chú: “Trợ từ là bóng râm, động từ chính là ánh sáng.” Chỉ dồn lực vào động từ chính; các trợ từ đi trước hãy lướt thật nhanh.',
  tipEn: "Tip: Keep auxiliaries in the shadow: glide through the modal chain and save the stress for the main verb.",
  words: [
    { w: 'could', ipa: '/kʊd/', note: 'dạng yếu: /kəd/' },
    { w: 'should', ipa: '/ʃʊd/', note: 'dạng yếu: /ʃəd/' },
    { w: 'would', ipa: '/wʊd/', note: 'dạng yếu: /wəd/' },
    { w: 'must', ipa: '/mʌst/', note: 'dạng yếu: /məst/' },
    { w: 'have', ipa: '/hæv/', note: 'dạng yếu: /əv/ (nghe như “of”)' },
    { w: 'to', ipa: '/tuː/', note: 'dạng yếu: /tə/' },
    { w: 'of', ipa: '/ɒv/', note: 'dạng yếu: /əv/ (trùng /əv/ của have)' },
    { w: 'used to', ipa: '/ˈjuːst tuː/', note: 'thường: /ˈjuːst tə/' },
    { w: 'have to', ipa: '/ˈhæv tuː/', note: 'thường: /ˈhæf tə/' },
    { w: 'ought to', ipa: '/ˈɔːt tuː/', note: 'thường: /ˈɔːt tə/' }
  ],
  sentences: [
    'They should have anticipated the criticism before the proposal was published.',
    'The committee could have intervened much earlier had it been informed.',
    'You must have overlooked a crucial clause in the contract.'
  ],
  quiz: [
    { q: 'Trong lời nói tự nhiên, “should have done” khi không nhấn thường nghe như thế nào?', options: ['/ʃʊd hæv dʌn/ – đọc rõ từng từ', '/ʃəd hæv dʌn/ – chỉ “should” yếu, “have” vẫn mạnh', '/ʃəd əv dʌn/ – rút gọn, lướt nhanh'], answer: 2, explain: 'Khi không nhấn, “should have” thường rút gọn thành /ʃəd əv/ (viết tắt should’ve nghe gần như vậy).' },
    { q: 'Vì sao nhiều người viết nhầm “could of” thay cho “could have”?', options: ['Vì “of” và “have” có cùng nghĩa', 'Vì “have” luôn bị bỏ khi nói', 'Vì /əv/ yếu của “have” nghe giống “of”'], answer: 2, explain: 'Dạng yếu /əv/ của “have” trùng với dạng yếu của “of”, nên tai dễ nghe nhầm và tay viết nhầm.' },
    { q: 'Trong “You must have been working since morning”, nhóm “must have been” nghe gần nhất với…', options: ['/mʌst hæv biːn/ với ba từ nhấn đều', '/mʌst hæv bɪn/', '/məst əv bɪn/'], answer: 2, explain: 'Cả “must”, “have” và “been” đều có thể yếu đi: /məst əv bɪn/; trọng âm dồn vào “working”.' },
    { q: 'Trong “They should have told us”, từ nào thường mang trọng âm câu?', options: ['told', 'should', 'have'], answer: 0, explain: 'Động từ chính “told” mang nghĩa nên được nhấn; “should have” lướt nhanh.' },
    { q: 'Khi nào động từ khuyết thiếu quay về dạng mạnh?', options: ['Khi nói rất nhanh', 'Khi được nhấn đối lập, ví dụ “I COULD have gone (but didn’t)”', 'Không bao giờ'], answer: 1, explain: 'Nhấn đối lập làm động từ khuyết thiếu giữ nguyên âm đầy đủ /kʊd/.' }
  ]
});

P.push({
  id: 'stress-timed-rhythm', group: 'stress', ipa: 'CATS CHASE MICE', title: 'Nhịp điệu tiếng Anh: đẳng thời theo trọng âm', emoji: '🥁', level: 'C1', titleEn: "English Rhythm: Stress-Timing",
  how: 'Tiếng Việt thường được mô tả là nhịp theo âm tiết (mỗi âm tiết dài gần bằng nhau). Tiếng Anh nghiêng về nhịp theo trọng âm: các âm tiết nhấn có xu hướng cách nhau khá đều, dù giữa chúng có ít hay nhiều âm tiết không nhấn. Ví dụ cả “CATS CHASE MICE”, “The CATS are CHASing the MICE” và “The CATS have been CHASing the MICE” đều có 3 nhịp; câu dài hơn không dài gấp đôi mà các âm tiết yếu bị nén và giảm. Đo đạc cho thấy đây chỉ là xu hướng cảm nhận, không phải nhịp đồng hồ chính xác. Hiểu điều này giúp bạn bớt nói “từng chữ một”.',
  howEn: "Vietnamese is usually described as syllable-timed, with syllables of similar length. English leans towards stress-timing: stressed syllables tend to come at fairly regular intervals however many unstressed syllables fall between them. “CATS CHASE MICE”, “The CATS are CHASing the MICE” and “The CATS have been CHASing the MICE” all have three beats; the longer sentences are not twice as long, because the weak syllables are squeezed and reduced. Measurements show this is a perceptual tendency, not a metronome. Understanding it helps you stop delivering every word with equal weight.",
  rules: [
    { label: 'Nhịp = âm tiết nhấn', when: 'từ nội dung giữ nhịp chính của câu', ex: ['CATS CHASE MICE', 'The CATS are CHASing the MICE'] },
    { label: 'Nén âm tiết yếu', when: 'nhiều âm tiết không nhấn giữa hai nhịp: nói nhanh và giảm về /ə/', ex: ['The CATS have been CHASing the MICE'] },
    { label: 'Âm tiết rụng', when: 'một số từ mất âm tiết yếu khi nói tự nhiên', ex: ['considerable /kənˈsɪdrəbl/', 'different /ˈdɪfrənt/'] }
  ],
  vn: 'Lỗi gốc là dành thời lượng bằng nhau cho mọi âm tiết, khiến câu nghe đều như gõ máy chữ và khó nhận ra từ khóa. Hãy gõ nhịp tay theo các từ nội dung và nén các từ nhỏ vào giữa hai nhịp.',
  tip: 'Mẹo: Hình dung trọng âm là những bước chân đều khi đi bộ. Giữa hai bước dù có một hay ba từ nhỏ, bước chân vẫn chạm đất khá đều.',
  tipEn: "Tip: Think of stressed syllables as steady footsteps: whether one or three small words fall between two steps, the steps keep landing at fairly even intervals.",
  words: [
    { w: 'considerable', ipa: '/kənˈsɪdrəbl/', note: 'thường 4 âm tiết thay vì 5' },
    { w: 'different', ipa: '/ˈdɪfrənt/', note: 'thường 2 âm tiết' },
    { w: 'laboratory', ipa: '/ləˈbɒrətri/', note: 'giọng Anh: 4 âm tiết' },
    { w: 'literature', ipa: '/ˈlɪtrətʃə/', note: 'âm tiết giữa yếu' },
    { w: 'temperature', ipa: '/ˈtemprətʃə/', note: 'âm tiết giữa yếu' },
    { w: 'comfortable', ipa: '/ˈkʌmftəbl/', note: 'thường 3 âm tiết' },
    { w: 'chocolate', ipa: '/ˈtʃɒklət/', note: 'thường 2 âm tiết' },
    { w: 'average', ipa: '/ˈævrɪdʒ/', note: 'thường 2 âm tiết' },
    { w: 'corporate', ipa: '/ˈkɔːprət/', note: 'thường 2 âm tiết' },
    { w: 'reasonably', ipa: '/ˈriːznəbli/', note: 'thường 3 âm tiết' }
  ],
  sentences: [
    'PRIces have been RISing because of a SHORTage of FOOD.',
    'The TEAcher is going to exPLAIN the reSULTS to the WHOLE class.',
    'A conSIDerable proPORtion of the LITerature on the SUBject is RELatively reCENT.'
  ],
  quiz: [
    { q: 'Nhịp điệu tiếng Anh (stress-timed) khác nhịp theo âm tiết ở điểm nào?', options: ['Mọi âm tiết dài bằng nhau', 'Không bao giờ ngừng nghỉ', 'Khoảng cách giữa các âm tiết nhấn có xu hướng khá đều'], answer: 2, explain: 'Tiếng Anh nén các âm tiết yếu để các âm tiết nhấn đến khá đều nhau; đây là xu hướng, không phải nhịp đồng hồ chính xác.' },
    { q: '“The CATS have been CHASing the MICE” có bao nhiêu nhịp theo cách đánh dấu của bài này?', options: ['7', '3', '5'], answer: 1, explain: 'Chỉ các âm tiết nhấn CATS, CHAS-, MICE là nhịp; các âm tiết còn lại bị nén.' },
    { q: 'Càng có nhiều âm tiết không nhấn giữa hai trọng âm, người bản ngữ thường…', options: ['đọc chậm lại để rõ từng âm', 'nhấn thêm vào mọi từ nhỏ', 'nén các âm tiết đó nhanh và giảm về /ə/'], answer: 2, explain: 'Âm tiết yếu bị nén (nói nhanh, nguyên âm giảm) để giữ nhịp giữa các trọng âm.' },
    { q: '“comfortable” khi nói tự nhiên thường có bao nhiêu âm tiết?', options: ['4 đều nhau', '3 (/ˈkʌmftəbl/)', '5'], answer: 1, explain: 'Âm tiết yếu giữa thường rụng: /ˈkʌmftəbl/ chỉ còn 3 âm tiết.' },
    { q: 'Vì sao nói đều từng âm tiết khiến người nghe khó theo dõi?', options: ['Mất các “đỉnh” nhấn giúp nhận ra từ khóa', 'Vì nói quá nhanh', 'Vì ngữ pháp bị sai'], answer: 0, explain: 'Người bản ngữ dựa vào các âm tiết nhấn để nhận diện từ nội dung; nhịp đều làm phẳng các tín hiệu này.' }
  ]
});

P.push({
  id: 'question-tag-intonation', group: 'stress', ipa: '↘ (confirm) vs ↗ (ask)', title: 'Ngữ điệu câu hỏi đuôi: xác nhận hay hỏi thật?', emoji: '🏷️', level: 'B2', titleEn: "Question Tags: Confirm or Ask?",
  how: 'Câu hỏi đuôi (question tag) có hai ngữ điệu thường gặp với nghĩa khác nhau. Khi người nói gần như chắc chắn và chỉ mời người nghe đồng tình, đuôi thường XUỐNG (↘): “It’s a rather ambitious target, isn’t it? ↘”. Khi người nói thật sự không chắc và muốn hỏi thông tin, đuôi thường LÊN (↗): “You haven’t had a chance to review the draft yet, have you? ↗”. Các đuôi như “right?” hay “shall we?” (khi đề nghị) cũng thường lên vì mời phản hồi. Đây là xu hướng; ngữ cảnh và thái độ vẫn quyết định.',
  howEn: "Question tags commonly take one of two intonation patterns with different meanings. A falling tone (↘) on the tag usually means the speaker is fairly sure and invites agreement: “It’s a rather ambitious target, isn’t it? ↘”. A rising tone (↗) usually means a real question: “You haven’t had a chance to review the draft yet, have you? ↗”. Tags such as “right?” and the suggestion “shall we?” often rise as well, because they invite a response. These are tendencies; context and attitude still decide.",
  rules: [
    { label: 'Đuôi xuống ↘', when: 'gần chắc chắn, mời người nghe đồng tình', ex: ['It’s a rather ambitious target, isn’t it? ↘', 'You see my point, don’t you? ↘'] },
    { label: 'Đuôi lên ↗', when: 'thật sự không chắc, hỏi để lấy thông tin', ex: ['You haven’t had a chance to review the draft yet, have you? ↗', 'The deadline hasn’t moved, has it? ↗'] },
    { label: 'Đuôi “right?” / “shall we?”', when: 'thường lên ↗: mời phản hồi hoặc đề nghị', ex: ['So we meet at six, right? ↗', 'Let’s reconvene after the break, shall we? ↗'] }
  ],
  vn: 'Nhiều người học dùng một kiểu ngữ điệu cho mọi câu hỏi đuôi, khiến câu mời đồng tình nghe như nghi ngờ hoặc ngược lại. Hãy tự hỏi “mình đã biết hay chưa biết?” rồi chọn xuống hay lên.',
  tip: 'Mẹo: “Biết rồi thì xuống, chưa biết thì lên.” Muốn người nghe gật đầu đồng ý thì hạ giọng ở đuôi.',
  tipEn: "Tip: Down when you already know, up when you really don't. To invite a nod of agreement, let the pitch fall on the tag.",
  words: [
    { w: 'isn’t it', ipa: '/ˈɪznt ɪt/', note: 'đuôi sau câu khẳng định với “is”' },
    { w: 'don’t you', ipa: '/ˈdəʊnt juː/', note: 'nói nhanh thường /ˈdəʊn tʃuː/' },
    { w: 'doesn’t he', ipa: '/ˈdʌznt hiː/', note: 'ngôi thứ ba số ít' },
    { w: 'didn’t you', ipa: '/ˈdɪdnt juː/', note: 'nói nhanh thường /ˈdɪdn tʃuː/ (/t/ + /j/ → /tʃ/)' },
    { w: 'haven’t we', ipa: '/ˈhævnt wiː/', note: 'hiện tại hoàn thành' },
    { w: 'wasn’t it', ipa: '/ˈwɒznt ɪt/', note: 'quá khứ với “was”' },
    { w: 'aren’t they', ipa: '/ˈɑːnt ðeɪ/', note: 'Anh /ɑːnt/, Mỹ /ɑːrnt/' },
    { w: 'has it', ipa: '/ˈhæz ɪt/', note: 'đuôi khẳng định sau câu phủ định' },
    { w: 'shall we', ipa: '/ˈʃæl wiː/', note: 'đề nghị: Let’s…, shall we?' },
    { w: 'right', ipa: '/raɪt/', note: 'đuôi “right?” thường lên' }
  ],
  sentences: [
    'It’s a rather ambitious target, isn’t it? ↘',
    'You haven’t had a chance to review the draft yet, have you? ↗',
    'Let’s reconvene after the break, shall we? ↗'
  ],
  quiz: [
    { q: 'Bạn nói “It’s a rather ambitious target, isn’t it?” và mong người nghe đồng tình. Đuôi thường có ngữ điệu nào?', options: ['Lên cao vút', 'Xuống (↘)', 'Ngang, không đổi'], answer: 1, explain: 'Khi gần chắc chắn và mời đồng tình, đuôi thường xuống.' },
    { q: 'Khi thật sự không biết câu trả lời, đuôi thường…', options: ['xuống', 'ngang', 'lên (↗)'], answer: 2, explain: 'Đuôi lên biến câu trần thuật thành câu hỏi thật.' },
    { q: '“You didn’t take my keys, did you? ↗” thể hiện thái độ gì?', options: ['Chắc chắn họ không lấy', 'Tức giận', 'Không chắc, thật sự muốn biết'], answer: 2, explain: 'Đuôi lên thể hiện nghi vấn thật từ người hỏi.' },
    { q: 'Đuôi “right?” sau “So we meet at six, …” thường có ngữ điệu nào?', options: ['Xuống sâu như đã chắc chắn', 'Lên (↗) – mời phản hồi', 'Không có ngữ điệu'], answer: 1, explain: '“Right?” thường lên vì mời người nghe xác nhận hoặc phản hồi.' },
    { q: 'Câu nào tóm tắt đúng xu hướng cho câu hỏi đuôi?', options: ['Xác nhận thường ↘, hỏi thật thường ↗', 'Đuôi lên khi câu khẳng định, xuống khi câu phủ định', 'Đuôi luôn do thói quen từng người'], answer: 0, explain: 'Đây là xu hướng; ngữ cảnh và thái độ vẫn quyết định ngữ điệu.' }
  ]
});

})(typeof self !== 'undefined' ? self : this);
