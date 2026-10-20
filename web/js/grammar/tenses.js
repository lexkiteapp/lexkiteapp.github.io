/* Ngữ pháp – Thì động từ (tự biên soạn) */
(function (g) {
  const G = g.GRAMMAR = g.GRAMMAR || [];

  /* 1. Present Simple */
  G.push({
    id: 'present-simple', unit: 'tenses', order: 1,
    title: 'Thì hiện tại đơn', en: 'Present Simple', level: 'A2', emoji: '🔁',
    summary: 'Dùng cho thói quen, sự thật hiển nhiên, lịch trình cố định và trạng thái lâu dài.',
    blocks: [
      { type: 'timeline', caption: 'Hành động lặp đi lặp lại đều đặn, trải dài cả quá khứ, hiện tại và tương lai.', marks: [ { kind: 'repeat', from: 5, to: 95, label: 'every day' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'V / V-s/es', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'Solar panels convert sunlight into electricity.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'do / does', c: 'aux' }, { t: 'not', c: 'neg' }, { t: 'V (nguyên mẫu)', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'Many students do not live on campus.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Do / Does', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V (nguyên mẫu)', c: 'verb' }, { t: 'O?', c: 'obj' } ], ex: 'Does your city have an underground railway?' } ] },
      { type: 'uses', items: [
        { title: 'Thói quen, hành động lặp lại', ex: 'I cycle to the library every Saturday.', vi: 'Tôi đạp xe đến thư viện vào mỗi thứ Bảy.' },
        { title: 'Sự thật hiển nhiên, chân lý khoa học', ex: 'Trees absorb carbon dioxide from the air.', vi: 'Cây xanh hấp thụ khí CO2 từ không khí.' },
        { title: 'Lịch trình, thời gian biểu cố định', ex: 'The last bus to the airport leaves at 11.30 p.m.', vi: 'Chuyến xe buýt cuối cùng ra sân bay khởi hành lúc 11 giờ 30 tối.' },
        { title: 'Trạng thái, tình huống lâu dài', ex: 'My sister works for an international charity.', vi: 'Chị gái tôi làm việc cho một tổ chức từ thiện quốc tế.' },
        { title: 'Mô tả quy trình (IELTS Task 1)', ex: 'The waste is then sorted and sent to a recycling plant.', vi: 'Rác thải sau đó được phân loại và chuyển tới nhà máy tái chế.' } ] },
      { type: 'signals', words: ['always', 'usually', 'often', 'sometimes', 'rarely', 'never', 'every day / week', 'once a month', 'on Mondays'] },
      { type: 'table', head: ['Động từ tận cùng bằng', 'Cách thêm -s/-es', 'Ví dụ'], rows: [
        ['Hầu hết động từ', '+ s', 'work → works, play → plays'],
        ['-o, -s, -x, -ch, -sh, -z', '+ es', 'go → goes, watch → watches, fix → fixes'],
        ['Phụ âm + y', 'bỏ y + ies', 'study → studies, carry → carries'],
        ['Nguyên âm + y', '+ s', 'enjoy → enjoys, pay → pays'],
        ['Bất quy tắc', '—', 'have → has, be → am/is/are'] ] },
      { type: 'tip', text: '🐍 Nhớ "con rắn S": chủ ngữ là he / she / it hoặc danh từ số ít thì động từ phải "mang đuôi rắn" -s/-es. Nhưng khi đã có does/doesn\'t thì con rắn chạy sang trợ động từ, động từ chính trở về nguyên mẫu.' },
      { type: 'tip', text: 'Trạng từ tần suất (always, often…) đứng TRƯỚC động từ thường nhưng SAU động từ to be: She often travels… / She is often late…' },
      { type: 'mistake', wrong: 'My brother study engineering at university.', right: 'My brother studies engineering at university.', why: 'Tiếng Việt không chia động từ theo ngôi nên người học hay quên thêm -s/-es với chủ ngữ số ít.' },
      { type: 'mistake', wrong: 'She don\'t like crowded places.', right: 'She doesn\'t like crowded places.', why: 'Với he/she/it phải dùng does not (doesn\'t), không dùng don\'t.' },
      { type: 'mistake', wrong: 'Does he works from home?', right: 'Does he work from home?', why: 'Khi đã dùng does, động từ chính quay về nguyên mẫu, không thêm -s lần nữa.' },
      { type: 'ielts', text: 'Speaking Part 1 hỏi về thói quen, sở thích (Do you…? How often…?) nên hiện tại đơn là thì chủ đạo. Trong Writing Task 1 dạng quy trình (process), gần như toàn bộ bài dùng hiện tại đơn, thường ở dạng bị động.', ex: 'I usually unwind by going for a run along the river after work.' }
    ],
    quiz: [
      { q: 'Public transport in my city ___ (be) quite cheap.', options: ['are', 'be', 'is', 'being'], answer: 2, explain: 'Public transport là danh từ không đếm được, coi như số ít nên dùng is. are chia số nhiều; be và being không làm động từ chính đã chia.' },
      { q: 'My father ___ (watch) the news every evening.', options: ['watches', 'watch', 'watchs', 'is watch'], answer: 0, explain: 'Động từ tận cùng bằng -ch thêm -es khi chủ ngữ ngôi ba số ít: watches. "watch" thiếu -es; "watchs" sai chính tả; "is watch" sai vì be không đi với V nguyên mẫu.' },
      { q: 'Chọn câu đúng:', options: ['Water freeze at 0°C.', 'Water is freezing at 0°C.', 'Water freezing at 0°C.', 'Water freezes at 0°C.'], answer: 3, explain: 'Sự thật khoa học dùng hiện tại đơn; chủ ngữ số ít nên freezes. freeze thiếu -s; is freezing chỉ hành động đang diễn ra; freezing thiếu động từ chính.' },
      { q: '___ your university offer online courses?', options: ['Do', 'Does', 'Is', 'Has'], answer: 1, explain: 'Chủ ngữ your university là số ít, câu hỏi với động từ thường nên dùng Does. Do dùng cho chủ ngữ số nhiều; Is và Has không làm trợ động từ cho offer ở hiện tại đơn.' },
      { q: 'Chọn câu đúng:', options: ['He doesn\'t drives to work.', 'He not drive to work.', 'He doesn\'t drive to work.', 'He don\'t drive to work.'], answer: 2, explain: 'Phủ định hiện tại đơn ngôi ba số ít: doesn\'t + V nguyên mẫu → He doesn\'t drive. Sau doesn\'t không thêm -s (drives sai); thiếu trợ động từ (not drive) sai; he đi với doesn\'t chứ không phải don\'t.' },
      { q: 'The flight to Singapore ___ at 6 a.m. tomorrow, according to the timetable.', options: ['departs', 'is departing to', 'depart', 'departed'], answer: 0, explain: 'Lịch trình cố định (timetable) dùng hiện tại đơn dù nói về tương lai. "is departing to" thừa to; depart thiếu -s; departed là quá khứ.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['The museum open at 9 a.m. every day.', 'The museum opens at 9 a.m. every day.', 'The museum is open at 9 a.m. every days.', 'The museum opening at 9 a.m. every day.'], answer: 1, explain: 'Lịch cố định dùng hiện tại đơn; chủ ngữ the museum số ít nên dùng opens. open thiếu -s; "every days" sai (every + danh từ số ít); opening thiếu động từ chính.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Does she speaks French fluently?', 'Do she speak French fluently?', 'She speak French fluently?', 'Does she speak French fluently?'], answer: 3, explain: 'Câu hỏi với chủ ngữ số ít: Does + S + V nguyên mẫu (speak, không thêm -s). "Does she speaks" thừa -s; "Do she" sai trợ động từ; câu 3 thiếu trợ động từ.' },
      { q: 'Phần nào sai? Each of the participants (A) receive a certificate (B) when the course (C) finishes (D) at the end of June.', options: ['(A) receive', '(B) when', '(C) finishes', '(D) at the end of'], answer: 0, explain: 'Each of + danh từ số nhiều vẫn là chủ ngữ số ít → sửa receive thành receives. when, finishes (chủ ngữ the course số ít) và at the end of đều đúng.' },
      { q: 'Phần nào sai? My brother (A) doesn\'t (B) likes (C) travelling by plane because he (D) gets anxious.', options: ['(A) doesn\'t', '(B) likes', '(C) travelling', '(D) gets'], answer: 1, explain: 'Sau doesn\'t phải dùng động từ nguyên mẫu → sửa likes thành like. doesn\'t, travelling (like + V-ing) và gets đều đúng.' },
      { q: 'Task 1 (quy trình): Once the grapes are harvested, the juice ___ into large steel tanks.', options: ['is poured', 'was poured', 'is pouring', 'has poured'], answer: 0, explain: 'Mô tả quy trình dùng hiện tại đơn, thường ở dạng bị động: is poured. was poured là quá khứ; is pouring là chủ động tiếp diễn; has poured là chủ động, sai nghĩa.' },
      { q: 'Speaking Part 1: "What do you do in your free time?" – "I usually ___ football with my colleagues at weekends."', options: ['am playing', 'play', 'played', 'plays'], answer: 1, explain: 'Thói quen (usually, at weekends) dùng hiện tại đơn; chủ ngữ I nên dùng play. am playing chỉ việc đang làm; played là quá khứ; plays dùng cho ngôi ba số ít.' }
    ]
  });

  /* 2. Present Continuous */
  G.push({
    id: 'present-continuous', unit: 'tenses', order: 2,
    title: 'Thì hiện tại tiếp diễn', en: 'Present Continuous', level: 'A2', emoji: '⏳',
    summary: 'Dùng cho hành động đang diễn ra lúc nói, tình huống tạm thời và xu hướng đang thay đổi.',
    blocks: [
      { type: 'timeline', caption: 'Hành động bắt đầu trước thời điểm nói, đang diễn ra và chưa kết thúc.', marks: [ { kind: 'range', from: 38, to: 62, label: 'right now' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'am / is / are', c: 'aux' }, { t: 'V-ing', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'The government is building a new metro line.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'am / is / are', c: 'aux' }, { t: 'not', c: 'neg' }, { t: 'V-ing', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'I am not working this week because I am on holiday.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Am / Is / Are', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V-ing', c: 'verb' }, { t: 'O?', c: 'obj' } ], ex: 'Are you preparing for the IELTS exam?' } ] },
      { type: 'uses', items: [
        { title: 'Hành động đang diễn ra ngay lúc nói', ex: 'Please be quiet – the students are taking a test.', vi: 'Làm ơn giữ trật tự – sinh viên đang làm bài kiểm tra.' },
        { title: 'Tình huống tạm thời quanh thời điểm hiện tại', ex: 'I\'m staying with my cousin until I find a flat.', vi: 'Tôi đang ở tạm nhà anh họ cho đến khi tìm được căn hộ.' },
        { title: 'Xu hướng, sự thay đổi đang diễn ra', ex: 'More and more people are working remotely.', vi: 'Ngày càng nhiều người làm việc từ xa.' },
        { title: 'Thói quen gây khó chịu (với always)', ex: 'My flatmate is always leaving dirty dishes in the sink.', vi: 'Bạn cùng phòng tôi cứ suốt ngày để bát đĩa bẩn trong bồn rửa.' } ] },
      { type: 'signals', words: ['now', 'right now', 'at the moment', 'currently', 'at present', 'these days', 'this week / term', 'Look!', 'Listen!'] },
      { type: 'table', head: ['Quy tắc thêm -ing', 'Ví dụ'], rows: [
        ['Hầu hết động từ: + ing', 'read → reading, study → studying'],
        ['Tận cùng -e câm: bỏ e + ing', 'make → making, write → writing'],
        ['Tận cùng -ie: đổi thành y + ing', 'lie → lying, die → dying'],
        ['Một âm tiết, phụ âm–nguyên âm–phụ âm: gấp đôi phụ âm cuối', 'run → running, stop → stopping'],
        ['Hai âm tiết, trọng âm ở âm cuối: gấp đôi phụ âm', 'begin → beginning, prefer → preferring'],
        ['Anh-Anh: gấp đôi -l sau nguyên âm đơn', 'travel → travelling, cancel → cancelling'] ] },
      { type: 'tip', text: '🎥 Hãy hình dung bạn đang quay video: thứ gì đang "chuyển động trong khung hình" lúc này thì dùng be + V-ing. Thiếu "be" giống như máy quay không có pin – câu sẽ không chạy!' },
      { type: 'mistake', wrong: 'I studying for my exams at the moment.', right: 'I am studying for my exams at the moment.', why: 'Người Việt hay bỏ to be vì tiếng Việt chỉ cần nói "đang học". Tiếng Anh bắt buộc có am/is/are.' },
      { type: 'mistake', wrong: 'I am understanding the lesson now.', right: 'I understand the lesson now.', why: 'Understand là động từ chỉ trạng thái (stative), thường không dùng ở dạng tiếp diễn.' },
      { type: 'mistake', wrong: 'Look! The children swim in the lake.', right: 'Look! The children are swimming in the lake.', why: 'Hành động đang diễn ra trước mắt phải dùng tiếp diễn, không dùng hiện tại đơn.' },
      { type: 'ielts', text: 'Rất hữu ích để nói về xu hướng xã hội trong Writing Task 2 và Speaking Part 3 (ví dụ: urbanisation, technology). Kết hợp với increasingly, more and more, gradually để câu tự nhiên hơn.', ex: 'Young people are increasingly turning to social media for news rather than newspapers.' }
    ],
    quiz: [
      { q: 'Listen! Someone ___ (knock) at the door.', options: ['knocks', 'knock', 'is knocking', 'knocking'], answer: 2, explain: 'Listen! báo hiệu hành động đang xảy ra ngay lúc nói → is knocking. knocks/knock là hiện tại đơn (thói quen); knocking thiếu is.' },
      { q: 'Chọn câu đúng:', options: ['Global temperatures are rising.', 'Global temperatures rising every year.', 'Global temperatures are rise every year.', 'Global temperatures is rising.'], answer: 0, explain: 'Xu hướng đang diễn ra: are + V-ing; temperatures số nhiều nên dùng are. câu 2 thiếu are; "are rise" thiếu -ing; "is rising" sai hòa hợp với temperatures.' },
      { q: 'She ___ in a café this summer to save money for university.', options: ['works', 'work', 'has worked', 'is working'], answer: 3, explain: 'Tình huống tạm thời (this summer) → hiện tại tiếp diễn. works/work là hiện tại đơn (lâu dài); has worked không phù hợp với tình huống tạm thời this summer.' },
      { q: 'Chọn câu đúng:', options: ['I am knowing the answer.', 'I know the answer.', 'I knowing the answer.', 'I am know the answer.'], answer: 1, explain: 'know là động từ trạng thái nên không chia tiếp diễn → I know the answer. Các câu am knowing, knowing, am know đều sai vì dùng dạng tiếp diễn hoặc sai cấu trúc be + V.' },
      { q: 'They are ___ a new bridge across the river.', options: ['planing', 'planeing', 'planning', 'plann'], answer: 2, explain: 'Plan: một âm tiết theo mẫu phụ âm–nguyên âm–phụ âm → gấp đôi n: planning. planing, planeing, plann đều sai chính tả.' },
      { q: '___ you ___ (use) this computer right now?', options: ['Are / using', 'Do / use', 'Is / using', 'Are / use'], answer: 0, explain: 'right now → hiện tại tiếp diễn: Are + you + V-ing → Are… using. "Do… use" là hiện tại đơn; "Is" không đi với you; "Are… use" thiếu -ing.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Look! The children play in the rain.', 'Look! The children is playing in the rain.', 'Look! The children are playing in the rain.', 'Look! The children playing in the rain.'], answer: 2, explain: 'Look! báo hiệu hành động đang diễn ra; children số nhiều → are playing. play là hiện tại đơn; "is playing" sai hòa hợp; playing thiếu are.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I am knowing the answer now.', 'She is wanting a new laptop.', 'This soup is tasting salty.', 'We are having dinner at the moment.'], answer: 3, explain: 'have (= ăn) là động từ hành động nên chia tiếp diễn được; know, want, taste (có vị) là động từ trạng thái, không dùng -ing.' },
      { q: 'Phần nào sai? At the moment, my sister (A) is study (B) for her final exams, so she (C) rarely (D) goes out.', options: ['(A) is study', '(B) for', '(C) rarely', '(D) goes'], answer: 0, explain: 'Hiện tại tiếp diễn cần be + V-ing → sửa is study thành is studying. for, rarely và goes đều đúng.' },
      { q: 'Phần nào sai? Prices (A) are rising (B) quickly these days and many families (C) are struggle (D) to pay their bills.', options: ['(A) are rising', '(B) quickly', '(C) are struggle', '(D) to pay'], answer: 2, explain: 'Thiếu -ing trong thì tiếp diễn → sửa are struggle thành are struggling. are rising, quickly và to pay đều đúng.' },
      { q: 'Task 2: Nowadays, more and more young people ___ to live alone rather than with their parents.', options: ['are choosing', 'chose', 'have chose', 'were choosing'], answer: 0, explain: 'Xu hướng đang thay đổi (nowadays, more and more) dùng hiện tại tiếp diễn: are choosing. chose và were choosing là quá khứ; "have chose" sai dạng V3 (chosen).' },
      { q: 'Speaking Part 1: "Do you work or are you a student?" – "I\'m a student, but this month I ___ part-time at a café."', options: ['work', 'am working', 'was working', 'works'], answer: 1, explain: 'Tình huống tạm thời quanh hiện tại (this month) dùng hiện tại tiếp diễn: am working. work chỉ việc lâu dài; was working là quá khứ; works chia ngôi ba.' }
    ]
  });

  /* 3. Present Perfect */
  G.push({
    id: 'present-perfect', unit: 'tenses', order: 3,
    title: 'Thì hiện tại hoàn thành', en: 'Present Perfect', level: 'B1', emoji: '🔗',
    summary: 'Nối quá khứ với hiện tại: kinh nghiệm, kết quả còn ảnh hưởng tới bây giờ, hoặc hành động kéo dài đến hiện tại.',
    blocks: [
      { type: 'timeline', caption: 'Hành động bắt đầu trong quá khứ và kéo dài đến hiện tại, hoặc đã xảy ra vào một lúc không xác định trước bây giờ.', marks: [ { kind: 'arrow', from: 12, to: 50, label: 'since 2020' }, { kind: 'point', at: 32, label: 'done (when?)' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'have / has', c: 'aux' }, { t: 'V3 / V-ed', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'The city has introduced a new recycling scheme.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'have / has', c: 'aux' }, { t: 'not', c: 'neg' }, { t: 'V3 / V-ed', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'I haven\'t finished my essay yet.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Have / Has', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V3 / V-ed', c: 'verb' }, { t: 'O?', c: 'obj' } ], ex: 'Have you ever studied abroad?' } ] },
      { type: 'uses', items: [
        { title: 'Kinh nghiệm (không nói rõ thời điểm)', ex: 'I have visited Japan twice.', vi: 'Tôi đã đến Nhật Bản hai lần.' },
        { title: 'Hành động kéo dài từ quá khứ đến hiện tại (for/since)', ex: 'She has taught at this school for ten years.', vi: 'Cô ấy đã dạy ở trường này được mười năm.' },
        { title: 'Hành động vừa xảy ra, kết quả còn ở hiện tại', ex: 'Someone has left the lights on in the lab.', vi: 'Ai đó đã để quên đèn bật trong phòng thí nghiệm.' },
        { title: 'Thay đổi trong một khoảng thời gian tới nay', ex: 'Internet access in rural areas has improved dramatically.', vi: 'Việc truy cập Internet ở nông thôn đã cải thiện đáng kể.' },
        { title: 'Với just / already / yet', ex: 'The results have just been published.', vi: 'Kết quả vừa mới được công bố.' } ] },
      { type: 'signals', words: ['ever', 'never', 'just', 'already', 'yet', 'for', 'since', 'so far', 'recently', 'lately', 'up to now', 'how long'] },
      { type: 'table', head: ['for + khoảng thời gian', 'since + mốc thời gian'], rows: [
        ['for three days', 'since Monday'],
        ['for a decade', 'since 2015'],
        ['for a long time', 'since I was a child'],
        ['for six months', 'since the pandemic'] ] },
      { type: 'tip', text: '🌉 Hiện tại hoàn thành là "cây cầu" nối quá khứ với hiện tại. Nếu bạn nói rõ mốc thời gian đã kết thúc (yesterday, in 2019, ago) thì cây cầu bị cắt → phải chuyển sang quá khứ đơn.' },
      { type: 'tip', text: 'already thường đứng giữa have và V3; yet đứng cuối câu phủ định và câu hỏi: Have you finished yet? Lưu ý: tiếng Anh-Mỹ thường dùng quá khứ đơn với just / already / yet (I just finished. Did you eat yet?); cả hai đều được chấp nhận, nhưng hãy dùng nhất quán.' },
      { type: 'mistake', wrong: 'I have met him two years ago.', right: 'I met him two years ago.', why: 'Có mốc thời gian quá khứ xác định (ago) thì dùng quá khứ đơn, không dùng hiện tại hoàn thành.' },
      { type: 'mistake', wrong: 'I live in Hanoi since 2018.', right: 'I have lived in Hanoi since 2018.', why: 'Tiếng Việt nói "Tôi sống ở Hà Nội từ 2018" nên người học hay dùng hiện tại đơn. Với since/for diễn tả kéo dài đến nay phải dùng hiện tại hoàn thành.' },
      { type: 'mistake', wrong: 'She has worked here since five years.', right: 'She has worked here for five years.', why: 'Khoảng thời gian (five years) dùng for; since chỉ đi với mốc thời gian.' },
      { type: 'ielts', text: 'Trong Writing Task 2 dùng để nói về những thay đổi gần đây (In recent years, … has…). Trong Speaking, câu hỏi "Have you ever…?" rất phổ biến; hãy trả lời bằng hiện tại hoàn thành rồi chuyển sang quá khứ đơn khi kể chi tiết.', ex: 'In recent decades, the rise of online learning has transformed the way people acquire new skills.' }
    ],
    quiz: [
      { q: 'I ___ (never / try) Indian food before.', options: ['never tried', 'am never trying', 'have never tried', 'had never try'], answer: 2, explain: 'before (cho đến nay) → kinh nghiệm, dùng hiện tại hoàn thành have never + V3 → have never tried. "never tried" là quá khứ đơn; "am never trying" sai thì; "had never try" sai cả thì lẫn dạng V3.' },
      { q: 'They have lived in this neighbourhood ___ 2012.', options: ['since', 'for', 'from', 'ago'], answer: 0, explain: '2012 là mốc thời gian → since. for đi với khoảng thời gian (for ten years); from cần đi kèm until/to; ago đứng sau khoảng thời gian (ten years ago).' },
      { q: 'Chọn câu đúng:', options: ['I have finished the report yesterday.', 'I have finish the report yesterday.', 'I was finished the report yesterday.', 'I finished the report yesterday.'], answer: 3, explain: 'yesterday là mốc quá khứ xác định → quá khứ đơn: I finished. Hiện tại hoàn thành (have finished) không đi với yesterday; "have finish" sai dạng V3; "was finished" là bị động, sai nghĩa.' },
      { q: 'Has the professor marked our assignments ___?', options: ['still', 'yet', 'since', 'ago'], answer: 1, explain: 'yet đứng cuối câu hỏi và câu phủ định (… chưa?). still không đứng cuối câu hỏi hiện tại hoàn thành với nghĩa "chưa"; since cần mốc thời gian theo sau; ago đi với quá khứ đơn.' },
      { q: 'Chọn câu đúng:', options: ['The number of tourists doubled since 2010.', 'The number of tourists has double since 2010.', 'The number of tourists has doubled since 2010.', 'The number of tourists is doubled since 2010.'], answer: 2, explain: 'Thay đổi từ mốc 2010 đến nay → has + V3 (doubled). doubled (quá khứ đơn) không đi với since; "has double" thiếu V3; "is doubled" là bị động, sai nghĩa.' },
      { q: 'She ___ just ___ her driving test!', options: ['has / passed', 'have / passed', 'is / passing', 'has / pass'], answer: 0, explain: 'Hành động vừa xảy ra (just), chủ ngữ she → has passed. have dùng cho số nhiều; "is passing" sai thì; "has pass" thiếu V3.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She has lived in Leeds since five years.', 'She lives in Leeds for five years.', 'She has lived in Leeds for five years.', 'She has been live in Leeds for five years.'], answer: 2, explain: 'Hành động kéo dài đến nay dùng have/has + V3; for + khoảng thời gian (five years), since + mốc thời gian.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Have you ever been to Scotland?', 'Did you ever been to Scotland?', 'Have you ever went to Scotland?', 'Are you ever been to Scotland?'], answer: 0, explain: 'Hỏi về kinh nghiệm: Have you ever + V3 (been, không phải went). did không đi với V3; "have… went" sai V3; "are… been" sai trợ động từ.' },
      { q: 'Phần nào sai? Since 2010, the number of (A) cyclists in the city (B) increased (C) significantly, (D) according to official data.', options: ['(A) cyclists', '(B) increased', '(C) significantly', '(D) according to'], answer: 1, explain: 'Since 2010 (từ quá khứ đến nay) cần hiện tại hoàn thành → sửa increased thành has increased.' },
      { q: 'Phần nào sai? I (A) have already (B) finish my essay, (C) but I haven\'t checked it (D) yet.', options: ['(A) have', '(B) finish', '(C) but', '(D) yet'], answer: 1, explain: 'Sau have phải dùng V3 → sửa finish thành finished. have, but và yet đều đúng.' },
      { q: 'Task 1: The chart shows that internet usage ___ steadily over the past two decades.', options: ['rises', 'has risen', 'had rising', 'is rise'], answer: 1, explain: 'over the past two decades (khoảng thời gian kéo dài đến nay) dùng hiện tại hoàn thành: has risen.' },
      { q: 'Speaking Part 1: "How long ___ in your current home?" – "For about six years."', options: ['do you live', 'are you living', 'have you lived', 'did you live'], answer: 2, explain: 'Hỏi How long về việc kéo dài đến hiện tại dùng hiện tại hoàn thành: have you lived. do you live và are you living không diễn tả khoảng thời gian kéo dài đến nay; did you live chỉ quá khứ đã kết thúc.' }
    ]
  });

  /* 4. Present Perfect Continuous */
  G.push({
    id: 'present-perfect-continuous', unit: 'tenses', order: 4,
    title: 'Thì hiện tại hoàn thành tiếp diễn', en: 'Present Perfect Continuous', level: 'B1', emoji: '🔥',
    summary: 'Nhấn mạnh quá trình, khoảng thời gian của một hành động bắt đầu trong quá khứ và kéo dài tới (hoặc vừa kết thúc trước) hiện tại.',
    blocks: [
      { type: 'timeline', caption: 'Hành động diễn ra liên tục từ một thời điểm trong quá khứ cho đến bây giờ.', marks: [ { kind: 'arrow', from: 18, to: 50, label: 'for two hours' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'have / has been', c: 'aux' }, { t: 'V-ing', c: 'verb' }, { t: 'for / since …', c: 'time' } ], ex: 'I have been revising for my exams since 7 a.m.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'have / has', c: 'aux' }, { t: 'not', c: 'neg' }, { t: 'been', c: 'aux' }, { t: 'V-ing', c: 'verb' } ], ex: 'He hasn\'t been sleeping well lately.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Have / Has', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'been', c: 'aux' }, { t: 'V-ing?', c: 'verb' } ], ex: 'How long have you been learning English?' } ] },
      { type: 'uses', items: [
        { title: 'Nhấn mạnh khoảng thời gian kéo dài đến hiện tại', ex: 'We have been waiting for the train for forty minutes.', vi: 'Chúng tôi đã đợi tàu suốt bốn mươi phút rồi.' },
        { title: 'Hành động vừa dừng, còn để lại dấu hiệu', ex: 'The streets are wet – it has been raining.', vi: 'Đường phố ướt – trời vừa mưa xong.' },
        { title: 'Hành động lặp lại nhiều lần gần đây', ex: 'She has been going to the gym three times a week.', vi: 'Gần đây cô ấy đi tập gym ba lần một tuần.' },
        { title: 'Tình huống tạm thời gần đây', ex: 'I have been working from home since my office closed.', vi: 'Tôi làm việc ở nhà từ khi văn phòng đóng cửa.' } ] },
      { type: 'signals', words: ['for', 'since', 'all day', 'all morning', 'how long', 'lately', 'recently'] },
      { type: 'table', head: ['Hiện tại hoàn thành', 'Hiện tại hoàn thành tiếp diễn'], rows: [
        ['Nhấn mạnh KẾT QUẢ, số lượng', 'Nhấn mạnh QUÁ TRÌNH, thời lượng'],
        ['I have written three essays.', 'I have been writing essays all afternoon.'],
        ['How many…? How much…?', 'How long…?'],
        ['Dùng được với động từ trạng thái: I have known her for years.', 'Không dùng với động từ trạng thái'] ] },
      { type: 'tip', text: '🔥 Hãy nghĩ đến "vết tích còn nóng": tay đầy sơn, mắt mỏi, áo ướt mồ hôi… Khi bạn thấy dấu hiệu của một hoạt động kéo dài vừa diễn ra, hãy dùng have been + V-ing.' },
      { type: 'mistake', wrong: 'I have been knowing him since primary school.', right: 'I have known him since primary school.', why: 'Know là động từ trạng thái nên chỉ dùng hiện tại hoàn thành, không dùng dạng tiếp diễn.' },
      { type: 'mistake', wrong: 'I have been reading four books this month.', right: 'I have read four books this month.', why: 'Khi nói về số lượng đã hoàn thành (four books) phải dùng hiện tại hoàn thành đơn.' },
      { type: 'mistake', wrong: 'I am learning English for six years.', right: 'I have been learning English for six years.', why: 'Lỗi rất phổ biến: dùng hiện tại tiếp diễn với for/since. Hành động kéo dài từ quá khứ đến nay cần have been + V-ing.' },
      { type: 'ielts', text: 'Câu hỏi Speaking Part 1 như "How long have you been living in your hometown?" nên được trả lời bằng chính thì này. Nó giúp bạn thể hiện sự chính xác ngữ pháp với for/since.', ex: 'I\'ve been living in Da Nang for about twelve years, so I know the city really well.' }
    ],
    quiz: [
      { q: 'You look exhausted. What ___ you ___?', options: ['did / do', 'are / done', 'have / been doing', 'have / do'], answer: 2, explain: 'Thấy dấu hiệu (mệt mỏi) của một hoạt động kéo dài vừa diễn ra → have been doing. did/do không hỏi về hoạt động vừa kéo dài; "are done" sai; "have do" sai dạng.' },
      { q: 'Chọn câu đúng:', options: ['She has owned the shop for years.', 'She has been owning the shop for years.', 'She is owning the shop for years.', 'She owns the shop since years.'], answer: 0, explain: 'Own là động từ trạng thái → hiện tại hoàn thành đơn: has owned. "has been owning" và "is owning" dùng tiếp diễn với động từ trạng thái; "since years" sai giới từ.' },
      { q: 'They ___ (discuss) the new policy since 9 o\'clock.', options: ['are discussing', 'discuss', 'were discussing', 'have been discussing'], answer: 3, explain: 'Hành động kéo dài từ 9 giờ tới nay, nhấn mạnh quá trình. are discussing và discuss không đi với since; were discussing là quá khứ.' },
      { q: 'I ___ three job applications so far this week.', options: ['have been sending', 'have sent', 'am sending', 'send'], answer: 1, explain: 'Có số lượng hoàn thành (three applications) → hiện tại hoàn thành đơn. have been sending nhấn mạnh quá trình, không hợp với số lượng cụ thể; am sending/send sai thì.' },
      { q: 'Chọn câu đúng:', options: ['How long are you studying here?', 'How long do you study here?', 'How long have you been studying here?', 'How long you have been studying here?'], answer: 2, explain: 'How long + kéo dài đến nay → Have you been studying; trợ động từ đứng trước chủ ngữ. "are you studying" và "do you study" không đi với How long kéo dài đến nay; câu cuối sai trật tự.' },
      { q: 'The ground is covered in snow. It ___ all night.', options: ['has been snowing', 'snows', 'is snowing since', 'snowed since'], answer: 0, explain: 'Dấu hiệu còn lại ở hiện tại của hoạt động kéo dài → has been snowing. snows là thói quen; "is snowing since" và "snowed since" sai thì với since.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I have been waiting here since two hours.', 'I am waiting here for two hours.', 'I have waiting here for two hours.', 'I have been waiting here for two hours.'], answer: 3, explain: 'Nhấn mạnh quá trình kéo dài đến nay: have been + V-ing; khoảng thời gian dùng for. "since two hours" sai (khoảng thời gian dùng for); "am waiting" sai thì; "have waiting" thiếu been.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She has been knowing him for years.', 'She has known him for years.', 'She has been know him for years.', 'She is knowing him for years.'], answer: 1, explain: 'know là động từ trạng thái, không dùng dạng tiếp diễn → dùng hiện tại hoàn thành has known.' },
      { q: 'Phần nào sai? Your eyes are red. (A) Have you (B) been cry? You (C) look (D) upset.', options: ['(A) Have', '(B) been cry', '(C) look', '(D) upset'], answer: 1, explain: 'Cấu trúc have been + V-ing → sửa been cry thành been crying. Have, look và upset đều đúng.' },
      { q: 'Phần nào sai? We (A) has been (B) living in this flat (C) for almost (D) three years.', options: ['(A) has been', '(B) living', '(C) for', '(D) three years'], answer: 0, explain: 'Chủ ngữ we dùng have → sửa has been thành have been. living, for và three years đều đúng.' },
      { q: 'Task 2: For several years, governments ___ to reduce plastic waste, but the problem persists.', options: ['have been trying', 'are trying', 'had been try', 'try'], answer: 0, explain: 'Nỗ lực kéo dài nhiều năm đến hiện tại (for several years) dùng hiện tại hoàn thành tiếp diễn.' },
      { q: 'Speaking: "You look tired." – "Yes, I ___ for my IELTS exam all morning."', options: ['studied', 'have been studying', 'am study', 'had studied'], answer: 1, explain: 'Hành động kéo dài vừa kết thúc, để lại dấu hiệu (mệt) → have been studying. studied không nhấn mạnh quá trình kéo dài vừa kết thúc; "am study" sai dạng; had studied là quá khứ hoàn thành, sai thời điểm.' }
    ]
  });

  /* 5. Past Simple */
  G.push({
    id: 'past-simple', unit: 'tenses', order: 5,
    title: 'Thì quá khứ đơn', en: 'Past Simple', level: 'A2', emoji: '📜',
    summary: 'Dùng cho hành động đã xảy ra và kết thúc tại một thời điểm xác định trong quá khứ.',
    blocks: [
      { type: 'timeline', caption: 'Hành động đã hoàn tất tại một điểm cụ thể trong quá khứ, không còn liên quan trực tiếp tới hiện tại.', marks: [ { kind: 'point', at: 25, label: 'in 2019' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'V2 / V-ed', c: 'verb' }, { t: 'O', c: 'obj' }, { t: 'yesterday / in 2019', c: 'time' } ], ex: 'The company launched its first electric car in 2019.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'did', c: 'aux' }, { t: 'not', c: 'neg' }, { t: 'V (nguyên mẫu)', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'We did not expect so many people at the conference.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Did', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V (nguyên mẫu)', c: 'verb' }, { t: 'O?', c: 'obj' } ], ex: 'Did you take a gap year after school?' } ] },
      { type: 'uses', items: [
        { title: 'Hành động hoàn tất ở thời điểm xác định', ex: 'I graduated from university last June.', vi: 'Tôi tốt nghiệp đại học vào tháng Sáu năm ngoái.' },
        { title: 'Chuỗi hành động nối tiếp trong quá khứ', ex: 'She landed in London, took a taxi and went straight to the hotel.', vi: 'Cô ấy hạ cánh ở London, bắt taxi rồi đi thẳng tới khách sạn.' },
        { title: 'Thói quen hoặc trạng thái trong quá khứ (nay không còn)', ex: 'When I was a child, I walked to school every day.', vi: 'Hồi nhỏ, ngày nào tôi cũng đi bộ đến trường.' },
        { title: 'Mô tả số liệu quá khứ trong Task 1', ex: 'In 2005, coal accounted for 60% of electricity production.', vi: 'Năm 2005, than đá chiếm 60% sản lượng điện.' } ] },
      { type: 'signals', words: ['yesterday', 'last week / year', '… ago', 'in 2010', 'when I was …', 'then', 'at that time', 'in the past'] },
      { type: 'table', head: ['Đuôi -ed phát âm', 'Khi động từ tận cùng bằng âm', 'Ví dụ'], rows: [
        ['/ɪd/', '/t/, /d/', 'wanted, needed, decided'],
        ['/t/', 'âm vô thanh: /p/, /k/, /f/, /s/, /ʃ/, /tʃ/', 'stopped, worked, watched'],
        ['/d/', 'các âm còn lại (hữu thanh)', 'played, cleaned, travelled'] ] },
      { type: 'tip', text: '📸 Quá khứ đơn giống một "tấm ảnh đã chụp xong": khoảnh khắc đã khép lại, có ngày giờ rõ ràng. Thấy ago, last, yesterday, in + năm → dùng V2/V-ed.' },
      { type: 'tip', text: 'Học động từ bất quy tắc theo nhóm âm giống nhau: begin–began–begun, drink–drank–drunk, swim–swam–swum.' },
      { type: 'mistake', wrong: 'Did you went to the museum last weekend?', right: 'Did you go to the museum last weekend?', why: 'Khi đã có did, động từ chính trở về nguyên mẫu. Không chia quá khứ hai lần.' },
      { type: 'mistake', wrong: 'Last year I travel to Thailand with my family.', right: 'Last year I travelled to Thailand with my family.', why: 'Tiếng Việt chỉ thêm "năm ngoái" mà không đổi động từ, nên người học hay quên chia V2/V-ed.' },
      { type: 'mistake', wrong: 'The price was increased sharply in 2020.', right: 'The price increased sharply in 2020.', why: 'Increase là nội động từ khi mô tả số liệu tự thay đổi, không dùng bị động (was increased).' },
      { type: 'ielts', text: 'Writing Task 1 với số liệu trong quá khứ (năm đã qua) phải dùng quá khứ đơn. Speaking Part 2 thường yêu cầu kể lại một trải nghiệm (Describe a time when…), quá khứ đơn là xương sống của câu chuyện.', ex: 'The proportion of households with internet access rose from 30% in 2000 to 85% in 2015.' }
    ],
    quiz: [
      { q: 'We ___ (visit) Hoi An three years ago.', options: ['have visited', 'visit', 'visited', 'were visit'], answer: 2, explain: 'Ago là mốc quá khứ xác định → quá khứ đơn visited. have visited không đi với ago; visit là hiện tại; "were visit" sai cấu trúc.' },
      { q: 'Chọn câu đúng:', options: ['She didn\'t finish her homework.', 'She didn\'t finished her homework.', 'She not finished her homework.', 'She doesn\'t finished her homework.'], answer: 0, explain: 'Phủ định quá khứ đơn: didn\'t + V nguyên mẫu → didn\'t finish. Sau didn\'t không dùng V2 (finished); thiếu trợ động từ (not finished) sai; doesn\'t là hiện tại, không đi với V2.' },
      { q: 'The number of cinema visits ___ (fall) significantly between 1990 and 2000.', options: ['falled', 'fallen', 'has fallen', 'fell'], answer: 3, explain: 'Khoảng thời gian đã kết thúc trong quá khứ; fall là động từ bất quy tắc: fall – fell – fallen.' },
      { q: '___ you ___ the lecture yesterday afternoon?', options: ['Did / attended', 'Did / attend', 'Have / attended', 'Do / attend'], answer: 1, explain: 'Yesterday → quá khứ đơn; câu hỏi: Did + S + V nguyên mẫu. Did… attended thừa V2; "Have… attended" không đi với yesterday; "Do… attend" là hiện tại.' },
      { q: 'Chọn câu đúng:', options: ['I have bought this laptop in 2021.', 'I buyed this laptop in 2021.', 'I bought this laptop in 2021.', 'I was bought this laptop in 2021.'], answer: 2, explain: 'in 2021 là mốc quá khứ → quá khứ đơn: bought (buy – bought, bất quy tắc). "have bought" không đi với mốc quá khứ; "buyed" sai dạng; "was bought" là bị động, sai nghĩa.' },
      { q: 'Đuôi -ed trong "decided" được phát âm là:', options: ['/ɪd/', '/t/', '/d/', 'không phát âm'], answer: 0, explain: 'decide tận cùng bằng âm /d/ nên đuôi -ed đọc là /ɪd/. /t/ dùng sau âm vô thanh (stopped); /d/ dùng sau âm hữu thanh khác (played); -ed luôn được phát âm.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She didn\'t went to the lecture yesterday.', 'She not went to the lecture yesterday.', 'She didn\'t go to the lecture yesterday.', 'She doesn\'t went to the lecture yesterday.'], answer: 2, explain: 'Phủ định quá khứ đơn: didn\'t + V nguyên mẫu → didn\'t go. "didn\'t went" thừa V2; "not went" thiếu trợ động từ; "doesn\'t went" sai thì và sai dạng.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['When did you arrive in London?', 'When did you arrived in London?', 'When you arrived in London?', 'When have you arrived in London?'], answer: 0, explain: 'Câu hỏi quá khứ đơn: Wh- + did + S + V nguyên mẫu; không dùng hiện tại hoàn thành với When.' },
      { q: 'Phần nào sai? In 2015, the government (A) spend (B) around 5% of its budget (C) on education, (D) which was a record.', options: ['(A) spend', '(B) around', '(C) on', '(D) which'], answer: 0, explain: 'Có mốc In 2015 → quá khứ đơn; spend là bất quy tắc → sửa thành spent. around, on và which đều đúng.' },
      { q: 'Phần nào sai? Two years ago, we (A) have visited Edinburgh (B) and (C) stayed (D) in a small guesthouse.', options: ['(A) have visited', '(B) and', '(C) stayed', '(D) in'], answer: 0, explain: 'ago là dấu hiệu quá khứ đơn, không dùng hiện tại hoàn thành → sửa thành visited. and, stayed và in đều đúng.' },
      { q: 'Task 1: In 1995, car ownership in the UK ___ at 70% of households.', options: ['stands', 'has stood', 'stood', 'is standing'], answer: 2, explain: 'Năm cụ thể trong quá khứ (1995) dùng quá khứ đơn: stood. stands và is standing là hiện tại; has stood không đi với năm cụ thể trong quá khứ.' },
      { q: 'Speaking Part 2: "Describe a trip you enjoyed." – "A few years ago, my family and I ___ to Da Lat for a week."', options: ['go', 'have gone', 'had go', 'went'], answer: 3, explain: 'a few years ago là mốc quá khứ → quá khứ đơn went. go là hiện tại; have gone không dùng với ago; had go sai cả thì lẫn dạng V3.' }
    ]
  });

  /* 6. Past Continuous */
  G.push({
    id: 'past-continuous', unit: 'tenses', order: 6,
    title: 'Thì quá khứ tiếp diễn', en: 'Past Continuous', level: 'B1', emoji: '🎞️',
    summary: 'Dùng cho hành động đang diễn ra tại một thời điểm trong quá khứ, thường làm "nền" cho một hành động khác chen vào.',
    blocks: [
      { type: 'timeline', caption: 'Một hành động kéo dài trong quá khứ (dải màu) bị một hành động ngắn chen ngang (điểm).', marks: [ { kind: 'range', from: 12, to: 36, label: 'was studying' }, { kind: 'point', at: 26, label: 'power went off' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'was / were', c: 'aux' }, { t: 'V-ing', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'At 8 p.m. last night, I was writing my dissertation.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'was / were', c: 'aux' }, { t: 'not', c: 'neg' }, { t: 'V-ing', c: 'verb' } ], ex: 'They weren\'t listening when the teacher explained the task.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Was / Were', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V-ing?', c: 'verb' } ], ex: 'What were you doing when the earthquake happened?' } ] },
      { type: 'uses', items: [
        { title: 'Hành động đang diễn ra tại một thời điểm trong quá khứ', ex: 'At this time last year, I was living in Melbourne.', vi: 'Vào thời điểm này năm ngoái, tôi đang sống ở Melbourne.' },
        { title: 'Hành động đang diễn ra thì bị hành động khác xen vào', ex: 'I was cycling to work when it started to pour.', vi: 'Tôi đang đạp xe đi làm thì trời đổ mưa to.' },
        { title: 'Hai hành động diễn ra song song (while)', ex: 'While the children were playing, their parents were chatting.', vi: 'Trong khi bọn trẻ chơi đùa, bố mẹ chúng trò chuyện với nhau.' },
        { title: 'Tả bối cảnh mở đầu câu chuyện', ex: 'The sun was setting and tourists were gathering on the beach.', vi: 'Mặt trời đang lặn và du khách đang tụ tập trên bãi biển.' } ] },
      { type: 'signals', words: ['at 7 p.m. yesterday', 'at that moment', 'at this time last week', 'when', 'while', 'as', 'all evening'] },
      { type: 'tip', text: '🎬 Quá khứ tiếp diễn là "cảnh nền" của bộ phim, quá khứ đơn là "sự kiện bất ngờ". Mẫu kinh điển: While + quá khứ tiếp diễn (cảnh dài), when + quá khứ đơn (sự việc ngắn).' },
      { type: 'mistake', wrong: 'While I walked home, I was seeing an accident.', right: 'While I was walking home, I saw an accident.', why: 'Hành động dài (đi bộ về nhà) dùng tiếp diễn; hành động ngắn xen vào (nhìn thấy) dùng quá khứ đơn. Người học hay đảo ngược hai thì.' },
      { type: 'mistake', wrong: 'They was waiting outside the exam room.', right: 'They were waiting outside the exam room.', why: 'Chủ ngữ số nhiều (they, we, you) đi với were, không phải was.' },
      { type: 'mistake', wrong: 'When I arrived, the meeting already started, so I was missing the introduction.', right: 'When I arrived, the meeting had already started, so I missed the introduction.', why: 'Miss ở đây là hành động trọn vẹn, không kéo dài → quá khứ đơn. Hành động xảy ra trước dùng quá khứ hoàn thành.' },
      { type: 'ielts', text: 'Trong Speaking Part 2, dùng quá khứ tiếp diễn để dựng bối cảnh trước khi kể sự kiện chính; giám khảo đánh giá cao sự kết hợp linh hoạt nhiều thì (grammatical range).', ex: 'I was travelling around northern Vietnam with some friends when we came across a tiny village famous for its handmade paper.' }
    ],
    quiz: [
      { q: 'I ___ (cook) dinner when my phone rang.', options: ['cooked', 'am cooking', 'was cooking', 'were cooking'], answer: 2, explain: 'Hành động đang diễn ra thì bị xen ngang → was cooking (chủ ngữ I). cooked là hành động hoàn tất (không bị xen ngang); am cooking là hiện tại; were cooking sai với I.' },
      { q: 'Chọn câu đúng:', options: ['While she was studying, her brother was playing music loudly.', 'While she studied, her brother was playing music loudly.', 'While she was study, her brother played music loudly.', 'While she studying, her brother was playing music loudly.'], answer: 0, explain: 'Hai hành động kéo dài song song → cả hai dùng quá khứ tiếp diễn. câu 2 và 3 trộn sai dạng; câu 4 thiếu was.' },
      { q: 'What ___ you doing at 10 o\'clock last night?', options: ['was', 'did', 'are', 'were'], answer: 3, explain: 'At 10 o\'clock last night → quá khứ tiếp diễn; you đi với were. was không đi với you; did và are sai thì/cấu trúc với doing.' },
      { q: 'The fire alarm went off while we ___ an exam.', options: ['took', 'were taking', 'have taken', 'take'], answer: 1, explain: 'While + hành động kéo dài bị xen ngang → were taking. took là hành động ngắn; have taken và take sai thì.' },
      { q: 'Chọn câu đúng:', options: ['When the teacher was coming in, we chatted.', 'When the teacher came in, we was chatting.', 'When the teacher came in, we were chatting.', 'When the teacher come in, we were chatting.'], answer: 2, explain: 'Hành động ngắn (came in) xen vào hành động đang diễn ra (were chatting). câu 1 đảo vai hai hành động; "we was" sai hòa hợp; "come" sai thì.' },
      { q: 'At this time last year, Minh ___ for a tech start-up in Singapore.', options: ['was working', 'worked', 'has worked', 'works'], answer: 0, explain: 'At this time last year → hành động đang diễn ra tại thời điểm cụ thể trong quá khứ. worked không nhấn mạnh hành động đang diễn ra; has worked và works sai thì.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I was reading when the phone was ring.', 'I was reading when the phone rang.', 'I am reading when the phone rang.', 'I were reading when the phone rang.'], answer: 1, explain: 'Hành động đang diễn ra (was reading) bị hành động ngắn xen vào (rang, quá khứ đơn). "was ring" sai dạng; "am reading" sai thì; "I were" sai hòa hợp.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['While we were wait for the bus, it started to snow.', 'While we waiting for the bus, it started to snow.', 'While we were waiting for the bus, it was start to snow.', 'While we were waiting for the bus, it started to snow.'], answer: 3, explain: 'While + quá khứ tiếp diễn (were waiting), hành động xen vào dùng quá khứ đơn (started). "were wait" và "waiting" thiếu thành phần; "was start" sai dạng.' },
      { q: 'Phần nào sai? At 8 p.m. last night, my parents (A) were watch a documentary (B) while I (C) was cooking (D) dinner.', options: ['(A) were watch', '(B) while', '(C) was cooking', '(D) dinner'], answer: 0, explain: 'Quá khứ tiếp diễn: was/were + V-ing → sửa were watch thành were watching. while, was cooking và dinner đều đúng.' },
      { q: 'Phần nào sai? When I (A) arrived, the guests (B) was (C) already (D) dancing in the garden.', options: ['(A) arrived', '(B) was', '(C) already', '(D) dancing'], answer: 1, explain: 'Chủ ngữ the guests là số nhiều → were dancing, nên phần sai là (B) was. arrived (quá khứ đơn), already và dancing (V-ing trong quá khứ tiếp diễn) đều đúng.' },
      { q: 'Speaking Part 2: "Tell me about a time you got lost." – "I ___ around Hanoi on my own when my phone battery died."', options: ['was walking', 'walk', 'am walking', 'have walked'], answer: 0, explain: 'Hành động đang diễn ra thì bị sự việc khác xen vào (died) → was walking. walk và am walking là hiện tại; have walked không dùng cho câu chuyện quá khứ.' },
      { q: 'Speaking Part 2 (tả bối cảnh): It was a beautiful morning: the sun was shining and birds ___ in the trees.', options: ['sing', 'were singing', 'are singing', 'have sung'], answer: 1, explain: 'Tả bối cảnh trong quá khứ dùng quá khứ tiếp diễn, song song với was shining → were singing.' }
    ]
  });

  /* 7. Past Perfect */
  G.push({
    id: 'past-perfect', unit: 'tenses', order: 7,
    title: 'Thì quá khứ hoàn thành', en: 'Past Perfect', level: 'B1', emoji: '⏪',
    summary: 'Dùng cho hành động đã xảy ra TRƯỚC một hành động hoặc một mốc khác trong quá khứ ("quá khứ của quá khứ").',
    blocks: [
      { type: 'timeline', caption: 'Hai sự việc trong quá khứ: sự việc xảy ra trước dùng had + V3, sự việc xảy ra sau dùng quá khứ đơn.', marks: [ { kind: 'point', at: 14, label: 'had left' }, { kind: 'point', at: 32, label: 'I arrived' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'had', c: 'aux' }, { t: 'V3 / V-ed', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'By the time we reached the station, the train had left.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'had', c: 'aux' }, { t: 'not', c: 'neg' }, { t: 'V3 / V-ed', c: 'verb' } ], ex: 'I hadn\'t used a smartphone until I went to university.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Had', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'V3 / V-ed', c: 'verb' }, { t: 'O?', c: 'obj' } ], ex: 'Had you ever been abroad before that trip?' } ] },
      { type: 'uses', items: [
        { title: 'Hành động xảy ra trước một hành động khác trong quá khứ', ex: 'When the firefighters arrived, the building had already collapsed.', vi: 'Khi lính cứu hỏa đến nơi thì tòa nhà đã sập rồi.' },
        { title: 'Hành động hoàn tất trước một mốc thời gian quá khứ (by)', ex: 'By 2010, the city had built three new bridges.', vi: 'Tính đến năm 2010, thành phố đã xây ba cây cầu mới.' },
        { title: 'Kinh nghiệm tính đến một thời điểm trong quá khứ', ex: 'It was the first time I had seen snow.', vi: 'Đó là lần đầu tiên tôi được thấy tuyết.' },
        { title: 'Câu tường thuật lùi thì', ex: 'She said she had already submitted the form.', vi: 'Cô ấy nói rằng cô ấy đã nộp mẫu đơn rồi.' },
        { title: 'Tiếc nuối về quá khứ (wish / if only)', ex: 'I wish I had studied harder for the test.', vi: 'Giá mà tôi đã học chăm hơn cho bài kiểm tra.' } ] },
      { type: 'signals', words: ['before', 'after', 'by the time', 'by + mốc quá khứ', 'already', 'just', 'never … before', 'when', 'until then'] },
      { type: 'tip', text: '🧭 Mẹo "hai bậc thang": đứng ở một điểm trong quá khứ rồi nhìn lùi lại – việc nào ở bậc thấp hơn (xảy ra trước) thì dùng had + V3.' },
      { type: 'tip', text: 'Nếu đã có after/before làm rõ thứ tự thì có thể dùng quá khứ đơn cho cả hai vế: After she finished work, she went home. Không cần lạm dụng had.' },
      { type: 'mistake', wrong: 'When I got to the cinema, the film already started.', right: 'When I got to the cinema, the film had already started.', why: 'Phim bắt đầu TRƯỚC khi tôi đến, nên cần quá khứ hoàn thành để thể hiện thứ tự.' },
      { type: 'mistake', wrong: 'He told me he had went to Paris.', right: 'He told me he had gone to Paris.', why: 'Sau had phải là V3 (gone), không phải V2 (went).' },
      { type: 'mistake', wrong: 'I had lived in Hue since 2015.', right: 'I have lived in Hue since 2015.', why: 'Nếu hành động kéo dài đến hiện tại thì dùng hiện tại hoàn thành; quá khứ hoàn thành phải gắn với một mốc trong quá khứ.' },
      { type: 'ielts', text: 'Trong Writing Task 1 dạng biểu đồ có mốc kết thúc trong quá khứ, cụm "By + năm, … had + V3" giúp bài viết đa dạng ngữ pháp. Trong Speaking Part 2, dùng để giải thích bối cảnh trước sự kiện chính.', ex: 'By 2015, the proportion of renewable energy had risen to almost a quarter of the total.' }
    ],
    quiz: [
      { q: 'When we arrived at the party, most guests ___ (go) home.', options: ['went', 'have gone', 'had gone', 'had went'], answer: 2, explain: 'Khách về TRƯỚC khi chúng tôi đến → had gone (V3 của go). went không cho thấy việc xảy ra trước; have gone sai thì; "had went" sai V3.' },
      { q: 'Chọn câu đúng:', options: ['By 2000, the population had reached 5 million.', 'By 2000, the population has reached 5 million.', 'By 2000, the population had reach 5 million.', 'By 2000, the population was reaching 5 million.'], answer: 0, explain: 'By + mốc quá khứ (By 2000) → quá khứ hoàn thành had + V3 → had reached. has reached là hiện tại hoàn thành; "had reach" thiếu V3; "was reaching" không diễn tả việc đã hoàn tất trước mốc.' },
      { q: 'I ___ never ___ such a beautiful beach before I visited Phu Quoc.', options: ['have / seen', 'did / see', 'had / saw', 'had / seen'], answer: 3, explain: 'Kinh nghiệm tính đến một thời điểm quá khứ (before I visited) → had seen. "have… seen" sai thì; "did… see" và "had… saw" sai dạng.' },
      { q: 'She was upset because she ___ her keys.', options: ['has lost', 'had lost', 'loses', 'had lose'], answer: 1, explain: 'Việc mất chìa khóa xảy ra trước cảm giác buồn bực trong quá khứ → had lost. has lost là hiện tại hoàn thành; loses sai thì; "had lose" thiếu V3.' },
      { q: 'Chọn câu đúng:', options: ['I wish I have taken that job offer.', 'I wish I took that job offer yesterday.', 'I wish I had taken that job offer.', 'I wish I had take that job offer.'], answer: 2, explain: 'Tiếc nuối về quá khứ: wish + had + V3 → I wish I had taken. "have taken" sai thì; "took… yesterday" chỉ dùng cho mong ước ở hiện tại; "had take" thiếu V3.' },
      { q: 'He said that he ___ the report the day before.', options: ['had finished', 'finishes', 'has finished', 'is finishing'], answer: 0, explain: 'Câu tường thuật lùi thì: quá khứ đơn → quá khứ hoàn thành. finishes, has finished và is finishing không lùi thì.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['By the time we arrived, the film had already started.', 'By the time we arrived, the film has already started.', 'By the time we had arrived, the film already starts.', 'By the time we arrive, the film had already start.'], answer: 0, explain: 'Hành động xảy ra trước (phim bắt đầu) dùng had + V3; hành động sau (arrived) dùng quá khứ đơn.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['It was the first time I have ever flown.', 'It was the first time I ever flew before.', 'It was the first time I had ever flown.', 'It was the first time I had ever fly.'], answer: 2, explain: 'It was the first time + quá khứ hoàn thành: had ever flown. "I have ever flown" sai thì; "ever flew before" sai cấu trúc; "had ever fly" thiếu V3.' },
      { q: 'Phần nào sai? When the police (A) arrived, the thieves (B) have (C) already (D) escaped through a back window.', options: ['(A) arrived', '(B) have', '(C) already', '(D) escaped'], answer: 1, explain: 'Việc trốn thoát xảy ra trước khi cảnh sát đến → dùng had, sửa have thành had. arrived, already và escaped đều đúng.' },
      { q: 'Phần nào sai? She (A) had never (B) saw the sea (C) before she (D) moved to Nha Trang.', options: ['(A) had never', '(B) saw', '(C) before', '(D) moved'], answer: 1, explain: 'Quá khứ hoàn thành dùng had + V3 → sửa saw thành seen. had never, before và moved đều đúng.' },
      { q: 'Task 1: By 2000, the proportion of homes with a telephone ___ to over 90%.', options: ['has risen', 'had risen', 'rises', 'had rose'], answer: 1, explain: 'By + mốc thời gian quá khứ → quá khứ hoàn thành: had risen. has risen là hiện tại hoàn thành; rises sai thì; "had rose" sai V3 (risen).' },
      { q: 'Speaking: "Did you enjoy the concert?" – "Not really, because I ___ the band live twice before."', options: ['have seen', 'was seeing', 'see', 'had seen'], answer: 3, explain: 'Kinh nghiệm tính đến một thời điểm trong quá khứ (buổi hòa nhạc) → had seen. have seen, was seeing và see không diễn tả kinh nghiệm trước một thời điểm quá khứ.' }
    ]
  });

  /* 8. Past Perfect Continuous */
  G.push({
    id: 'past-perfect-continuous', unit: 'tenses', order: 8,
    title: 'Thì quá khứ hoàn thành tiếp diễn', en: 'Past Perfect Continuous', level: 'B2', emoji: '⌛',
    summary: 'Nhấn mạnh quá trình, khoảng thời gian của một hành động kéo dài cho đến một thời điểm hoặc sự việc khác trong quá khứ.',
    blocks: [
      { type: 'timeline', caption: 'Hành động kéo dài liên tục rồi dừng lại (hoặc vẫn tiếp tục) khi một sự việc khác trong quá khứ xảy ra.', marks: [ { kind: 'arrow', from: 8, to: 30, label: 'had been waiting' }, { kind: 'point', at: 30, label: 'bus came' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'had been', c: 'aux' }, { t: 'V-ing', c: 'verb' }, { t: 'for / since …', c: 'time' } ], ex: 'She had been working at the bank for ten years before she retired.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'had', c: 'aux' }, { t: 'not', c: 'neg' }, { t: 'been', c: 'aux' }, { t: 'V-ing', c: 'verb' } ], ex: 'I hadn\'t been sleeping well, so I felt exhausted during the interview.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Had', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'been', c: 'aux' }, { t: 'V-ing?', c: 'verb' } ], ex: 'How long had they been living there before the flood?' } ] },
      { type: 'uses', items: [
        { title: 'Hành động kéo dài đến một thời điểm trong quá khứ', ex: 'We had been driving for five hours when we finally saw the coast.', vi: 'Chúng tôi đã lái xe suốt năm tiếng thì cuối cùng cũng nhìn thấy bờ biển.' },
        { title: 'Giải thích nguyên nhân của một tình huống quá khứ', ex: 'His eyes were red because he had been staring at a screen all day.', vi: 'Mắt anh ấy đỏ vì anh ấy đã nhìn chằm chằm vào màn hình cả ngày.' },
        { title: 'Hành động lặp lại trong một giai đoạn trước mốc quá khứ', ex: 'The factory had been polluting the river for years before it was closed down.', vi: 'Nhà máy đã gây ô nhiễm dòng sông suốt nhiều năm trước khi bị đóng cửa.' } ] },
      { type: 'signals', words: ['for', 'since', 'how long', 'before', 'when', 'until', 'by the time', 'all day'] },
      { type: 'table', head: ['Quá khứ hoàn thành', 'Quá khứ hoàn thành tiếp diễn'], rows: [
        ['Nhấn mạnh việc đã HOÀN TẤT', 'Nhấn mạnh QUÁ TRÌNH kéo dài'],
        ['She had written two chapters by May.', 'She had been writing for months by May.'],
        ['Dùng được với động từ trạng thái', 'Không dùng với động từ trạng thái'] ] },
      { type: 'tip', text: '🏃 Đây là "phiên bản quá khứ" của hiện tại hoàn thành tiếp diễn: chỉ cần dời điểm NOW về một thời điểm trong quá khứ và đổi have been → had been.' },
      { type: 'mistake', wrong: 'I had been knowing her for years when we started working together.', right: 'I had known her for years when we started working together.', why: 'Know là động từ trạng thái, không dùng dạng tiếp diễn.' },
      { type: 'mistake', wrong: 'They had been wait for an hour when the doctor arrived.', right: 'They had been waiting for an hour when the doctor arrived.', why: 'Sau had been bắt buộc là V-ing.' },
      { type: 'mistake', wrong: 'I was studying English for five years before I moved to Canada.', right: 'I had been studying English for five years before I moved to Canada.', why: 'Có khoảng thời gian (for five years) kéo dài đến một mốc quá khứ → dùng had been + V-ing thay vì quá khứ tiếp diễn.' },
      { type: 'ielts', text: 'Ít xuất hiện trong Writing Task 1 nhưng là "điểm cộng" trong Speaking Part 2 khi bạn kể chuyện và giải thích lý do. Dùng 1–2 lần một cách tự nhiên là đủ để thể hiện grammatical range.', ex: 'I had been saving up for nearly two years, so when I finally bought my first laptop, it felt like a real achievement.' }
    ],
    quiz: [
      { q: 'The ground was wet because it ___ all night.', options: ['has been raining', 'was rained', 'had been raining', 'rains'], answer: 2, explain: 'Nguyên nhân kéo dài dẫn tới tình huống quá khứ → had been raining. has been raining là hiện tại; "was rained" là bị động sai; rains sai thì.' },
      { q: 'Chọn câu đúng:', options: ['She had owned the car for ten years.', 'She had been owning the car for ten years.', 'She had been own the car for ten years.', 'She has been owning the car for ten years.'], answer: 0, explain: 'Own là động từ trạng thái → dùng quá khứ hoàn thành đơn. own là động từ trạng thái nên không dùng been owning; "been own" sai dạng.' },
      { q: 'How long ___ you ___ before you found a job?', options: ['have / been searching', 'did / searched', 'were / search', 'had / been searching'], answer: 3, explain: 'Khoảng thời gian kéo dài trước một mốc quá khứ (found a job) → had been searching. "have been searching" sai thì; "did… searched" và "were… search" sai dạng.' },
      { q: 'By the time the rescue team arrived, the climbers ___ for help for six hours.', options: ['waited', 'had been waiting', 'have been waiting', 'are waiting'], answer: 1, explain: 'By the time + quá khứ đơn, nhấn mạnh thời lượng kéo dài → had been waiting. waited không nhấn mạnh thời lượng; have been waiting và are waiting sai thì.' },
      { q: 'Chọn câu đúng:', options: ['He was tired because he has been playing football.', 'He was tired because he had been play football.', 'He was tired because he had been playing football.', 'He was tired because he is playing football.'], answer: 2, explain: 'Cấu trúc đúng: had been + V-ing, giải thích nguyên nhân trong quá khứ. "has been playing" sai thì; "had been play" thiếu -ing; "is playing" sai thì.' },
      { q: 'I ___ for the company for only three months when it went bankrupt.', options: ['had been working', 'have been working', 'am working', 'work'], answer: 0, explain: 'Thời lượng (three months) kéo dài đến sự kiện quá khứ (went bankrupt). have been working, am working, work đều không lùi về trước mốc quá khứ.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She had been working there for ten years before she retired.', 'She had been work there for ten years before she retired.', 'She has been working there for ten years before she retired.', 'She was been working there for ten years before she retired.'], answer: 0, explain: 'Hành động kéo dài đến một mốc quá khứ (retired): had been + V-ing. "been work" thiếu -ing; "has been" sai thì; "was been" sai cấu trúc.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['He had been knowing the truth for weeks before he told us.', 'He has been knowing the truth for weeks before he told us.', 'He had known the truth for weeks before he told us.', 'He had been know the truth for weeks before he told us.'], answer: 2, explain: 'know là động từ trạng thái nên không dùng tiếp diễn → dùng quá khứ hoàn thành had known. "had been knowing" và "has been knowing" dùng tiếp diễn với know; "been know" sai dạng.' },
      { q: 'Phần nào sai? The ground was wet (A) because it (B) had been (C) rain (D) all night.', options: ['(A) because', '(B) had been', '(C) rain', '(D) all night'], answer: 2, explain: 'Cấu trúc had been + V-ing → sửa rain thành raining. because, had been và all night đều đúng.' },
      { q: 'Phần nào sai? They (A) have been (B) waiting for over an hour (C) when the bus finally (D) arrived.', options: ['(A) have been', '(B) waiting', '(C) when', '(D) arrived'], answer: 0, explain: 'Mốc là quá khứ (arrived) → dùng had been thay cho have been. waiting, when và arrived đều đúng.' },
      { q: 'Speaking: "Why did you decide to change jobs?" – "I ___ the same tasks for years and I felt bored."', options: ['have been doing', 'am doing', 'had been done', 'had been doing'], answer: 3, explain: 'Giải thích nguyên nhân của tình huống quá khứ, hành động kéo dài nhiều năm → had been doing.' },
      { q: 'Task 2: By the time the subsidy was introduced, many farmers ___ to survive for several years.', options: ['have been struggling', 'struggle', 'had been struggling', 'had been struggled'], answer: 2, explain: 'Hành động kéo dài nhiều năm trước một mốc quá khứ (was introduced) → had been struggling. have been struggling sai thì; struggle không lùi thì; "had been struggled" sai dạng.' }
    ]
  });

  /* 9. Future forms */
  G.push({
    id: 'future-forms', unit: 'tenses', order: 9,
    title: 'Diễn đạt tương lai: will, be going to, hiện tại tiếp diễn', en: 'Future: will / be going to / Present Continuous', level: 'B1', emoji: '🔮',
    summary: 'Will cho quyết định tức thời và dự đoán chủ quan; be going to cho dự định và dự đoán có căn cứ; hiện tại tiếp diễn cho kế hoạch đã sắp xếp.',
    blocks: [
      { type: 'timeline', caption: 'Các hành động nằm ở phía tương lai, khác nhau ở mức độ chắc chắn và thời điểm quyết định.', marks: [ { kind: 'now', at: 50 }, { kind: 'point', at: 64, label: 'meeting at 3' }, { kind: 'point', at: 82, label: 'will / going to' } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'will / am-is-are going to', c: 'aux' }, { t: 'V (nguyên mẫu)', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'I\'m going to apply for a master\'s degree next year.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'will not (won\'t) / am-is-are not going to', c: 'neg' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: 'Petrol cars won\'t disappear overnight.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Will / Am-Is-Are', c: 'aux' }, { t: 'S', c: 'subj' }, { t: '(going to)', c: 'aux' }, { t: 'V?', c: 'verb' } ], ex: 'Are you going to take the exam in June?' } ] },
      { type: 'uses', items: [
        { title: 'Will – quyết định ngay lúc nói, lời hứa, đề nghị', ex: 'The printer isn\'t working? I\'ll call the technician.', vi: 'Máy in hỏng à? Để tôi gọi kỹ thuật viên.' },
        { title: 'Will – dự đoán dựa trên ý kiến cá nhân (think, believe, probably)', ex: 'I think robots will replace many factory jobs.', vi: 'Tôi nghĩ robot sẽ thay thế nhiều công việc trong nhà máy.' },
        { title: 'Be going to – dự định đã có từ trước', ex: 'We\'re going to plant more trees in the schoolyard this spring.', vi: 'Chúng tôi dự định trồng thêm cây trong sân trường vào mùa xuân này.' },
        { title: 'Be going to – dự đoán có bằng chứng ngay trước mắt', ex: 'Look at those dark clouds – it\'s going to rain.', vi: 'Nhìn những đám mây đen kia kìa – trời sắp mưa rồi.' },
        { title: 'Hiện tại tiếp diễn – kế hoạch đã sắp xếp (có giờ, có người, đã đặt chỗ)', ex: 'I\'m meeting my tutor at 3 p.m. tomorrow.', vi: 'Tôi có hẹn gặp gia sư lúc 3 giờ chiều mai.' } ] },
      { type: 'signals', words: ['tomorrow', 'next week / year', 'soon', 'in the future', 'in 2050', 'I think / I\'m sure', 'probably', 'tonight'] },
      { type: 'table', head: ['Hình thức', 'Khi nào dùng', 'Ví dụ'], rows: [
        ['will + V', 'Quyết định tức thời, hứa hẹn, dự đoán chủ quan', 'I\'ll help you with your CV.'],
        ['be going to + V', 'Dự định có trước, dự đoán có căn cứ', 'She\'s going to study medicine.'],
        ['am/is/are + V-ing', 'Lịch hẹn, kế hoạch đã sắp xếp cụ thể', 'We\'re flying to Seoul on Friday.'],
        ['Hiện tại đơn', 'Lịch trình, thời gian biểu cố định', 'The course starts on 5 September.'] ] },
      { type: 'tip', text: '📅 Hỏi nhanh ba câu: "Vừa mới quyết định?" → will. "Đã có ý định trong đầu?" → going to. "Đã ghi vào lịch, đặt vé, hẹn người?" → hiện tại tiếp diễn.' },
      { type: 'tip', text: 'Sau when, as soon as, before, after, until, if trong mệnh đề thời gian/điều kiện, dùng hiện tại đơn chứ KHÔNG dùng will.' },
      { type: 'mistake', wrong: 'When I will finish my degree, I will look for a job abroad.', right: 'When I finish my degree, I will look for a job abroad.', why: 'Mệnh đề thời gian bắt đầu bằng when dùng hiện tại đơn dù nói về tương lai. Tiếng Việt có "khi tôi sẽ…" nên người học hay mắc.' },
      { type: 'mistake', wrong: 'I will to visit my grandparents this weekend.', right: 'I\'m going to visit my grandparents this weekend.', why: 'Sau will không có to. Ngoài ra, đây là dự định có sẵn nên be going to tự nhiên hơn.' },
      { type: 'mistake', wrong: 'A: Someone is at the door. B: I am going to open it.', right: 'A: Someone is at the door. B: I\'ll open it.', why: 'Quyết định ngay lúc nói phải dùng will, không dùng be going to.' },
      { type: 'ielts', text: 'Writing Task 1 dạng dự báo (projections): dùng will, is expected/predicted/projected to. Writing Task 2 và Speaking Part 3 thường hỏi về tương lai: kết hợp will với các từ rào đón (likely, probably, may) để câu bớt khẳng định tuyệt đối.', ex: 'The number of electric vehicles is projected to triple by 2040, and it will probably overtake petrol cars soon after.' }
    ],
    quiz: [
      { q: 'A: I\'ve left my wallet at home. B: Don\'t worry, I ___ for lunch.', options: ['am paying', 'am going to pay', 'will pay', 'pay'], answer: 2, explain: 'Quyết định/đề nghị ngay lúc nói → will: I\'ll pay. am going to pay chỉ dự định có từ trước; am paying là kế hoạch đã sắp xếp; pay (hiện tại đơn) không diễn tả lời đề nghị.' },
      { q: 'Look at that cyclist! He ___ fall off his bike.', options: ['is going to', 'will', 'falls', 'is falling to'], answer: 0, explain: 'Dự đoán có bằng chứng ngay trước mắt → be going to. will dùng cho dự đoán theo ý kiến; falls là hiện tại đơn; "is falling to" sai cấu trúc.' },
      { q: 'Chọn câu đúng:', options: ['I will call you when I will arrive.', 'I call you when I will arrive.', 'I will call you when I am going to arrive.', 'I will call you when I arrive.'], answer: 3, explain: 'Mệnh đề thời gian với when dùng hiện tại đơn (arrive). Không dùng will/going to trong mệnh đề thời gian sau when; câu 2 thiếu will ở mệnh đề chính.' },
      { q: 'We ___ dinner with our clients at 7 tonight – the table is booked.', options: ['have', 'are having', 'will have', 'had'], answer: 1, explain: 'Kế hoạch đã sắp xếp cụ thể (đã đặt bàn, có giờ) → hiện tại tiếp diễn. have (hiện tại đơn) không diễn tả kế hoạch đã sắp xếp; will have kém tự nhiên khi đã đặt bàn; had là quá khứ.' },
      { q: 'Chọn câu đúng:', options: ['I think online shopping is continuing to grow next year.', 'I think online shopping will continues to grow.', 'I think online shopping will continue to grow.', 'I think online shopping going to continue to grow.'], answer: 2, explain: 'Dự đoán dựa trên ý kiến (I think) → will + V nguyên mẫu. "is continuing… next year" không hợp với dự đoán theo ý kiến; "will continues" thừa -s; "going to" thiếu is.' },
      { q: 'The conference ___ at 9 a.m. on Monday, according to the programme.', options: ['starts', 'will be start', 'is going start', 'start'], answer: 0, explain: 'Lịch trình chính thức (according to the programme) → hiện tại đơn: starts. "will be start" sai cấu trúc; "is going start" thiếu to; "start" thiếu -s với chủ ngữ số ít.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I help you with those bags – they look heavy.', 'I going to help you with those bags.', 'I\'ll help you with those bags – they look heavy.', 'I will helping you with those bags.'], answer: 2, explain: 'Đề nghị giúp đỡ, quyết định ngay lúc nói dùng will + V nguyên mẫu. "I help" thiếu will; "I going to" thiếu am; "will helping" sai dạng.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Look at that sky – it will to rain.', 'Look at that sky – it going to rain.', 'Look at that sky – it rains.', 'Look at that sky – it\'s going to rain.'], answer: 3, explain: 'Dự đoán có bằng chứng trước mắt (bầu trời) dùng be going to + V. "will to rain" thừa to; "it going to" thiếu is; "it rains" là sự thật chung.' },
      { q: 'Phần nào sai? We (A) are meet the manager (B) at 10 a.m. tomorrow (C) to discuss the (D) new contract.', options: ['(A) are meet', '(B) at', '(C) to discuss', '(D) new'], answer: 0, explain: 'Kế hoạch đã sắp xếp dùng hiện tại tiếp diễn → sửa are meet thành are meeting. at, to discuss và new đều đúng.' },
      { q: 'Phần nào sai? I think renewable energy (A) is going (B) become (C) cheaper (D) in the coming decades.', options: ['(A) is going', '(B) become', '(C) cheaper', '(D) in the coming'], answer: 1, explain: 'Thiếu to: be going to + V → sửa thành is going to become (hoặc will become). is going (đúng khi thêm to), cheaper và in the coming đều đúng.' },
      { q: 'Task 2: In my view, artificial intelligence ___ many routine office jobs in the future.', options: ['replaces probably', 'will probably replace', 'probably will to replace', 'is replace'], answer: 1, explain: 'Dự đoán theo ý kiến cá nhân (In my view) dùng will; probably đứng sau will. "replaces probably" sai thì và vị trí; "probably will to replace" thừa to; "is replace" sai cấu trúc.' },
      { q: 'Speaking Part 1: "What are your plans for the summer?" – "I ___ an English course in Brighton – I\'ve already paid the deposit."', options: ['will take', 'take', 'took', 'am taking'], answer: 3, explain: 'Kế hoạch đã sắp xếp chắc chắn (đã đặt cọc) dùng hiện tại tiếp diễn: am taking. will take là quyết định chưa chắc chắn; take và took không diễn tả kế hoạch tương lai đã sắp xếp.' }
    ]
  });

  /* 10. Future Continuous & Future Perfect */
  G.push({
    id: 'future-continuous-perfect', unit: 'tenses', order: 10,
    title: 'Tương lai tiếp diễn & tương lai hoàn thành', en: 'Future Continuous & Future Perfect', level: 'B2', emoji: '🚀',
    summary: 'Tương lai tiếp diễn: hành động sẽ ĐANG diễn ra tại một thời điểm tương lai. Tương lai hoàn thành: hành động sẽ ĐÃ hoàn tất trước một mốc tương lai.',
    blocks: [
      { type: 'timeline', caption: 'Dải màu: hành động đang diễn ra tại một thời điểm tương lai. Điểm: hành động sẽ hoàn tất trước một mốc (by …).', marks: [ { kind: 'now', at: 50 }, { kind: 'range', from: 58, to: 72, label: 'will be flying' }, { kind: 'point', at: 86, label: 'will have done' } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+) – Tương lai tiếp diễn', parts: [ { t: 'S', c: 'subj' }, { t: 'will be', c: 'aux' }, { t: 'V-ing', c: 'verb' }, { t: 'at this time tomorrow', c: 'time' } ], ex: 'At this time tomorrow, I will be sitting my IELTS exam.' },
        { label: 'Khẳng định (+) – Tương lai hoàn thành', parts: [ { t: 'S', c: 'subj' }, { t: 'will have', c: 'aux' }, { t: 'V3 / V-ed', c: 'verb' }, { t: 'by 2030', c: 'time' } ], ex: 'By 2030, the city will have completed its new tram network.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'will not (won\'t)', c: 'neg' }, { t: 'be V-ing / have V3', c: 'verb' } ], ex: 'I won\'t have finished the project by Friday.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Will', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'be V-ing / have V3?', c: 'verb' } ], ex: 'Will you be using the meeting room this afternoon?' } ] },
      { type: 'uses', items: [
        { title: 'Tương lai tiếp diễn – hành động đang diễn ra tại thời điểm tương lai', ex: 'This time next month, we will be travelling around Scotland.', vi: 'Giờ này tháng sau, chúng tôi sẽ đang du lịch khắp Scotland.' },
        { title: 'Tương lai tiếp diễn – hỏi lịch trình một cách lịch sự', ex: 'Will you be joining us for the workshop on Thursday?', vi: 'Anh/chị có tham gia buổi hội thảo thứ Năm cùng chúng tôi không?' },
        { title: 'Tương lai hoàn thành – hoàn tất trước một mốc tương lai', ex: 'By the end of this year, I will have saved enough for a deposit.', vi: 'Đến cuối năm nay, tôi sẽ tiết kiệm được đủ tiền đặt cọc rồi.' },
        { title: 'Tương lai hoàn thành – dự báo số liệu (Task 1)', ex: 'By 2050, the urban population will have doubled.', vi: 'Đến năm 2050, dân số đô thị sẽ tăng gấp đôi.' } ] },
      { type: 'signals', words: ['at this time tomorrow', 'this time next week', 'at 10 a.m. tomorrow', 'by + mốc tương lai', 'by the time', 'by the end of', 'before'] },
      { type: 'tip', text: '🛫 Tưởng tượng một máy bay: "will be flying" = lúc đó máy bay đang ở trên trời; "will have landed" = đến lúc đó máy bay đã hạ cánh xong. Thấy "by + mốc tương lai" là nghĩ ngay tới will have + V3.' },
      { type: 'mistake', wrong: 'By next June, I will graduate from university.', right: 'By next June, I will have graduated from university.', why: 'By + mốc tương lai nhấn mạnh việc hoàn tất trước mốc đó → tương lai hoàn thành.' },
      { type: 'mistake', wrong: 'Don\'t call me at 8 – I will have dinner then.', right: 'Don\'t call me at 8 – I will be having dinner then.', why: 'Hành động sẽ đang diễn ra tại thời điểm 8 giờ → tương lai tiếp diễn.' },
      { type: 'mistake', wrong: 'By the time you will arrive, we will have eaten.', right: 'By the time you arrive, we will have eaten.', why: 'Sau by the time (mệnh đề thời gian) dùng hiện tại đơn, không dùng will.' },
      { type: 'ielts', text: 'Trong Writing Task 1 dạng dự báo, will have + V3 kết hợp với by + năm giúp bạn tránh lặp "will increase". Trong Speaking Part 3, dùng tương lai tiếp diễn để hình dung cuộc sống tương lai.', ex: 'In twenty years\' time, many people will be working alongside AI assistants, and routine paperwork will have largely disappeared.' }
    ],
    quiz: [
      { q: 'At 9 a.m. tomorrow, I ___ (take) my speaking test.', options: ['will take', 'will have taken', 'will be taking', 'take'], answer: 2, explain: 'Hành động đang diễn ra tại một thời điểm cụ thể trong tương lai → will be taking. will take không nhấn mạnh việc đang diễn ra; will have taken là đã xong; take là hiện tại.' },
      { q: 'By 2035, scientists ___ a cure for this disease, I hope.', options: ['will have found', 'will find', 'will be finding', 'have found'], answer: 0, explain: 'By + mốc tương lai, hoàn tất trước mốc → will have found. will find không nhấn mạnh việc hoàn tất trước mốc; will be finding là đang diễn ra; have found là hiện tại hoàn thành.' },
      { q: 'Chọn câu đúng:', options: ['By the time we will get there, the show will have started.', 'By the time we get there, the show will have start.', 'By the time we get there, the show has started.', 'By the time we get there, the show will have started.'], answer: 3, explain: 'By the time + hiện tại đơn; mệnh đề chính will have + V3. Không dùng will sau By the time (câu 1); "will have start" thiếu V3; "has started" sai thì.' },
      { q: 'Don\'t phone her at noon – she ___ lunch with her manager.', options: ['will have', 'will be having', 'has', 'will have had'], answer: 1, explain: 'Hành động sẽ đang diễn ra vào buổi trưa → will be having. will have và has không diễn tả việc đang diễn ra lúc trưa; will have had là đã xong.' },
      { q: 'Chọn câu đúng:', options: ['I will have finish my thesis by May.', 'I will be finished my thesis by May.', 'I will have finished my thesis by May.', 'I have finished my thesis by May.'], answer: 2, explain: 'Cấu trúc tương lai hoàn thành: will have + V3 (finished). "will have finish" thiếu V3; "will be finished my thesis" sai cấu trúc; "have finished… by May" sai thì.' },
      { q: 'By the end of this course, you ___ over 2,000 new words.', options: ['will have learnt', 'will learn', 'are learning', 'learnt'], answer: 0, explain: 'By the end of… → hoàn tất trước một mốc tương lai; learnt là dạng V3 Anh-Anh. will learn không nhấn mạnh sự hoàn tất trước mốc; are learning và learnt sai thì.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['By next June, I will have finish my degree.', 'By next June, I will have finished my degree.', 'By next June, I have finished my degree.', 'By next June, I will finished my degree.'], answer: 1, explain: 'By + mốc tương lai → tương lai hoàn thành: will have + V3 (finished). "will have finish" thiếu V3; "have finished" sai thì; "will finished" sai dạng.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['This time tomorrow, I will be fly to Paris.', 'This time tomorrow, I will flying to Paris.', 'This time tomorrow, I will be flying to Paris.', 'This time tomorrow, I am fly to Paris.'], answer: 2, explain: 'Hành động đang diễn ra tại một thời điểm tương lai: will be + V-ing. "will be fly" và "will flying" thiếu thành phần; "am fly" sai cấu trúc.' },
      { q: 'Phần nào sai? By the end of (A) this decade, scientists (B) will have develop a vaccine (C) for the virus, (D) according to experts.', options: ['(A) this', '(B) will have develop', '(C) for', '(D) according to'], answer: 1, explain: 'Tương lai hoàn thành cần V3 → sửa thành will have developed. this, for và according to đều đúng.' },
      { q: 'Phần nào sai? Don\'t call me at 9 p.m.; I (A) will (B) be (C) sit an exam (D) at that time.', options: ['(A) will', '(B) be', '(C) sit', '(D) at that time'], answer: 2, explain: 'Tương lai tiếp diễn: will be + V-ing → sửa sit thành sitting. will, be và at that time đều đúng.' },
      { q: 'Task 1: By 2040, the number of electric cars on the roads ___ to around 50 million.', options: ['will have risen', 'will be rise', 'has risen', 'will have rose'], answer: 0, explain: 'Dự báo hoàn tất trước mốc tương lai (By 2040) → will have risen. "will be rise" sai dạng; has risen là hiện tại hoàn thành; "will have rose" sai V3.' },
      { q: 'Speaking Part 3: "Where do you see yourself in ten years?" – "Hopefully I ___ for an international company in Singapore."', options: ['will have work', 'am working', 'will working', 'will be working'], answer: 3, explain: 'Tình huống đang diễn ra tại một thời điểm tương lai → will be working. "will have work" thiếu V3; am working là hiện tại; "will working" thiếu be.' }
    ]
  });

  /* 11. Used to / would / be used to / get used to */
  G.push({
    id: 'used-to-would', unit: 'tenses', order: 11,
    title: 'Used to, would, be used to, get used to', en: 'Used to / would / be used to / get used to', level: 'B1', emoji: '🕰️',
    summary: 'Used to và would nói về thói quen trong quá khứ; be used to / get used to + V-ing nói về việc đã quen / đang dần quen với điều gì.',
    blocks: [
      { type: 'timeline', caption: 'Thói quen lặp lại trong quá khứ và đã chấm dứt trước hiện tại.', marks: [ { kind: 'repeat', from: 5, to: 35, label: 'used to' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'used to', c: 'aux' }, { t: 'V (nguyên mẫu)', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'People used to send letters instead of emails.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'did not (didn\'t)', c: 'neg' }, { t: 'use to', c: 'aux' }, { t: 'V (nguyên mẫu)', c: 'verb' } ], ex: 'I didn\'t use to enjoy reading, but now I love it.' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Did', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'use to', c: 'aux' }, { t: 'V?', c: 'verb' } ], ex: 'Did your town use to have a cinema?' } ] },
      { type: 'uses', items: [
        { title: 'used to + V: thói quen hoặc trạng thái trong quá khứ, nay không còn', ex: 'This area used to be farmland before the factories were built.', vi: 'Khu vực này từng là đất nông nghiệp trước khi các nhà máy được xây dựng.' },
        { title: 'would + V: hành động lặp lại trong quá khứ (không dùng cho trạng thái)', ex: 'Every summer, my grandfather would take us fishing.', vi: 'Mỗi mùa hè, ông tôi thường dẫn chúng tôi đi câu cá.' },
        { title: 'be used to + V-ing / N: đã quen với', ex: 'Nurses are used to working night shifts.', vi: 'Y tá đã quen với việc làm ca đêm.' },
        { title: 'get used to + V-ing / N: dần trở nên quen với', ex: 'It took me months to get used to driving on the left.', vi: 'Tôi mất hàng tháng trời mới quen với việc lái xe bên trái.' } ] },
      { type: 'signals', words: ['when I was young', 'in the past', 'in my childhood', 'years ago', 'any more', 'no longer'] },
      { type: 'table', head: ['Cấu trúc', 'Theo sau là', 'Nghĩa', 'Ví dụ'], rows: [
        ['used to', 'V nguyên mẫu', 'đã từng (nay không còn)', 'I used to live in Hue.'],
        ['would', 'V nguyên mẫu', 'thường hay (hành động lặp lại)', 'We would play by the river.'],
        ['be used to', 'V-ing / danh từ', 'đã quen với', 'I\'m used to the noise.'],
        ['get used to', 'V-ing / danh từ', 'dần quen với', 'You\'ll get used to the cold.'] ] },
      { type: 'tip', text: '🔑 Chữ "to" trong be/get used to là giới từ, nên phía sau là V-ing hoặc danh từ. Chữ "to" trong used to (từng) là một phần của động từ khuyết thiếu, nên phía sau là V nguyên mẫu.' },
      { type: 'tip', text: 'Would chỉ dùng cho HÀNH ĐỘNG lặp lại, không dùng cho TRẠNG THÁI: không nói "I would have long hair", mà nói "I used to have long hair".' },
      { type: 'mistake', wrong: 'I am used to get up early.', right: 'I am used to getting up early.', why: 'Sau be used to phải là V-ing. Người học hay nhầm với used to + V nguyên mẫu.' },
      { type: 'mistake', wrong: 'I use to play badminton when I was at school.', right: 'I used to play badminton when I was at school.', why: 'Câu khẳng định phải dùng used (có -d). Chỉ sau did/didn\'t mới dùng use to.' },
      { type: 'mistake', wrong: 'My hometown would be very quiet.', right: 'My hometown used to be very quiet.', why: 'Be quiet là trạng thái, không phải hành động lặp lại, nên không dùng would.' },
      { type: 'ielts', text: 'Speaking Part 1 và 2 thường hỏi về tuổi thơ hay sự thay đổi của quê hương (Has your hometown changed?). Used to và would giúp bạn so sánh quá khứ–hiện tại tự nhiên và đa dạng hơn so với chỉ dùng quá khứ đơn.', ex: 'My neighbourhood used to be full of rice fields, and we would spend whole afternoons flying kites there.' }
    ],
    quiz: [
      { q: 'When I was a child, I ___ (be) afraid of the dark.', options: ['would be', 'was used to be', 'used to be', 'am used to'], answer: 2, explain: 'Trạng thái trong quá khứ → used to be; không dùng would cho trạng thái. would không dùng cho trạng thái; "was used to be" sai cấu trúc; am used to là hiện tại và cần V-ing.' },
      { q: 'After living in London for a year, she is used to ___ on the left.', options: ['driving', 'drive', 'drove', 'be driving'], answer: 0, explain: 'be used to + V-ing = đã quen với việc gì → is used to driving. Sau to (giới từ) không dùng V nguyên mẫu (drive), quá khứ (drove) hay "be driving".' },
      { q: 'Chọn câu đúng:', options: ['Did you used to walk to school?', 'Do you used to walk to school?', 'Did you use to walking to school?', 'Did you use to walk to school?'], answer: 3, explain: 'Câu hỏi về thói quen quá khứ: Did + S + use to + V nguyên mẫu → Did you use to walk. Sau did không dùng "used"; "Do… used" sai thì; "use to walking" sai dạng động từ.' },
      { q: 'International students often find it hard to ___ the local food.', options: ['used to', 'get used to', 'use to', 'be use to'], answer: 1, explain: 'get used to + danh từ/V-ing = dần quen với → get used to the local food. used to + V chỉ thói quen quá khứ; "use to" và "be use to" sai dạng.' },
      { q: 'Chọn câu đúng:', options: ['I would have a pet dog when I was small.', 'I used to having a pet dog.', 'I used to have a pet dog when I was small.', 'I was used to have a pet dog.'], answer: 2, explain: 'Sở hữu (have) là trạng thái → used to + V nguyên mẫu. would không dùng cho sở hữu; "used to having" sai dạng; "was used to have" sai nghĩa và dạng.' },
      { q: 'People ___ much less time in front of screens in the past.', options: ['used to spend', 'are used to spending', 'get used to spend', 'use to spend'], answer: 0, explain: 'Thói quen quá khứ nay không còn → used to + V nguyên mẫu. are used to spending nghĩa là đã quen (hiện tại); "get used to spend" sai dạng; "use to spend" thiếu -d.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I used to living in a small village.', 'I am used to live in a small village.', 'I used to live in a small village.', 'I use to lived in a small village.'], answer: 2, explain: 'Thói quen/trạng thái quá khứ nay không còn: used to + V nguyên mẫu. "used to living" sai dạng; "am used to live" phải là living; "use to lived" sai dạng.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['She is used to work long hours.', 'She is used to working long hours.', 'She used to working long hours.', 'She is use to working long hours.'], answer: 1, explain: 'be used to (đã quen với) + V-ing: is used to working. "is used to work" phải dùng V-ing; "used to working" thiếu is; "is use to" thiếu -d.' },
      { q: 'Phần nào sai? When I was young, I (A) would have a dog (B) called Max, and we (C) used to play (D) together.', options: ['(A) would have', '(B) called', '(C) used to', '(D) together'], answer: 0, explain: 'would không dùng cho trạng thái (sở hữu) → sửa thành used to have (hoặc had). called, used to và together đều đúng.' },
      { q: 'Phần nào sai? It took me (A) a long time (B) to get used to (C) drive (D) on the left.', options: ['(A) a long time', '(B) to get', '(C) drive', '(D) on the left'], answer: 2, explain: 'get used to + V-ing → driving, nên phần sai là (C) drive. a long time, to get và on the left đều đúng.' },
      { q: 'Task 1 (bản đồ): The map shows that the area ___ farmland, but it is now a residential estate.', options: ['would be', 'used to be', 'is used to being', 'used to being'], answer: 1, explain: 'Trạng thái trong quá khứ nay không còn → used to be (would không dùng cho trạng thái). would không dùng cho trạng thái; "is used to being" nghĩa là đã quen (hiện tại); "used to being" sai dạng.' },
      { q: 'Speaking Part 1: "Did you enjoy primary school?" – "Yes. My friends and I ___ spend every lunch break playing football."', options: ['were used to', 'get used to', 'use', 'would'], answer: 3, explain: 'Hành động lặp lại trong quá khứ có thể dùng would + V nguyên mẫu. "were used to" và "get used to" cần V-ing và mang nghĩa "quen với"; "use" thiếu to và sai thì.' }
    ]
  });

  /* 12. Stative vs dynamic verbs */
  G.push({
    id: 'stative-dynamic', unit: 'tenses', order: 12,
    title: 'Động từ trạng thái và động từ hành động', en: 'Stative vs Dynamic Verbs', level: 'B1', emoji: '🧠',
    summary: 'Động từ trạng thái (know, like, own…) thường không dùng ở dạng tiếp diễn; một số động từ đổi nghĩa khi chuyển giữa hai loại.',
    blocks: [
      { type: 'timeline', caption: 'Trạng thái kéo dài liên tục, không có điểm đầu–cuối rõ ràng như một hành động.', marks: [ { kind: 'range', from: 6, to: 94, label: 'I know her' }, { kind: 'now', at: 50 } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+)', parts: [ { t: 'S', c: 'subj' }, { t: 'động từ trạng thái (dạng đơn)', c: 'verb' }, { t: 'O', c: 'obj' } ], ex: 'Most experts believe that the climate is changing.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'do / does / did', c: 'aux' }, { t: 'not', c: 'neg' }, { t: 'động từ trạng thái', c: 'verb' } ], ex: 'I don\'t recognise that building – is it new?' },
        { label: 'Nghi vấn (?)', parts: [ { t: 'Do / Does / Did', c: 'aux' }, { t: 'S', c: 'subj' }, { t: 'động từ trạng thái?', c: 'verb' } ], ex: 'Do you prefer studying alone or in a group?' } ] },
      { type: 'uses', items: [
        { title: 'Suy nghĩ, nhận thức: know, believe, understand, remember, realise', ex: 'I understand why people prefer to live near the city centre.', vi: 'Tôi hiểu vì sao mọi người thích sống gần trung tâm thành phố.' },
        { title: 'Cảm xúc, mong muốn: like, love, hate, prefer, want, need', ex: 'Many employees want more flexible working hours.', vi: 'Nhiều nhân viên muốn có giờ làm việc linh hoạt hơn.' },
        { title: 'Sở hữu, cấu tạo: have (sở hữu), own, belong, contain, consist of', ex: 'This report contains data from twelve countries.', vi: 'Bản báo cáo này chứa số liệu từ mười hai quốc gia.' },
        { title: 'Giác quan, mô tả: seem, look (trông có vẻ), smell, taste, sound', ex: 'The new policy seems effective so far.', vi: 'Chính sách mới cho đến nay có vẻ hiệu quả.' } ] },
      { type: 'table', head: ['Động từ', 'Nghĩa trạng thái (dạng đơn)', 'Nghĩa hành động (dạng tiếp diễn)'], rows: [
        ['think', 'I think it\'s a good idea. (cho rằng)', 'I\'m thinking about changing jobs. (đang cân nhắc)'],
        ['have', 'She has two laptops. (sở hữu)', 'She\'s having lunch. (đang ăn)'],
        ['see', 'I see what you mean. (hiểu)', 'I\'m seeing the dentist tomorrow. (có hẹn gặp)'],
        ['taste', 'The soup tastes salty. (có vị)', 'The chef is tasting the soup. (đang nếm)'],
        ['be', 'He is rude. (tính cách)', 'He is being rude. (đang cư xử thô lỗ, tạm thời)'] ] },
      { type: 'tip', text: '🧊 Hãy coi động từ trạng thái như "đá" – đứng yên, không chuyển động, nên không thể "đang …-ing". Động từ hành động như "nước" – chảy, chuyển động được, nên dùng tiếp diễn thoải mái.' },
      { type: 'mistake', wrong: 'I am wanting to improve my speaking skills.', right: 'I want to improve my speaking skills.', why: 'Want là động từ trạng thái. Người Việt hay dịch "tôi đang muốn" nên dùng nhầm dạng tiếp diễn.' },
      { type: 'mistake', wrong: 'This book is belonging to the library.', right: 'This book belongs to the library.', why: 'Belong chỉ sự sở hữu, là động từ trạng thái nên dùng dạng đơn.' },
      { type: 'mistake', wrong: 'I\'m thinking that online learning is more convenient.', right: 'I think that online learning is more convenient.', why: 'Khi think mang nghĩa "cho rằng, có ý kiến" thì dùng dạng đơn. Chỉ dùng thinking about/of khi đang cân nhắc.' },
      { type: 'ielts', text: 'Lỗi "I am agree" và "I am thinking that…" rất hay gặp trong Speaking và Writing Task 2. Hãy dùng đúng dạng đơn: I agree, I believe, I think – đây là các cụm nêu quan điểm xuất hiện liên tục trong bài thi.', ex: 'I strongly believe that governments should invest more in public transport rather than building new roads.' }
    ],
    quiz: [
      { q: 'I ___ (not / understand) this graph. Can you explain it?', options: ['am not understanding', 'not understand', 'don\'t understand', 'am not understand'], answer: 2, explain: 'Understand là động từ trạng thái → dùng dạng đơn: don\'t understand. understand là động từ trạng thái nên không dùng am not understanding; "not understand" thiếu trợ động từ; "am not understand" sai cấu trúc.' },
      { q: 'Chọn câu đúng:', options: ['I agree with this opinion.', 'I am agree with this opinion.', 'I am agreeing with this opinion.', 'I agreeing with this opinion.'], answer: 0, explain: 'Agree là động từ (không phải tính từ) và là động từ trạng thái → I agree. "am agree" dùng be với động từ; "am agreeing" chia tiếp diễn với động từ trạng thái; "agreeing" thiếu động từ chính.' },
      { q: 'We ___ about moving to a smaller city to reduce our living costs.', options: ['think', 'thinks', 'are think', 'are thinking'], answer: 3, explain: 'Think about = đang cân nhắc, là hành động nên dùng tiếp diễn. think là hiện tại đơn (không hợp với việc đang cân nhắc); thinks sai hòa hợp; "are think" thiếu -ing.' },
      { q: 'This dish ___ delicious. What spices did you use?', options: ['is tasting', 'tastes', 'taste', 'is taste'], answer: 1, explain: 'Taste mang nghĩa "có vị" → trạng thái, dùng dạng đơn. "is tasting" dùng khi chủ động nếm (người); taste thiếu -s; "is taste" sai cấu trúc.' },
      { q: 'Chọn câu đúng:', options: ['She is having a new smartphone.', 'She having a new smartphone.', 'She has a new smartphone.', 'She is have a new smartphone.'], answer: 2, explain: 'Have nghĩa là sở hữu → động từ trạng thái, dùng dạng đơn. "is having" dùng have theo nghĩa sở hữu ở tiếp diễn là sai; "having" thiếu động từ chính; "is have" sai cấu trúc.' },
      { q: 'You ___ very quiet today. Is everything all right?', options: ['are being', 'are been', 'being', 'is being'], answer: 0, explain: 'Be ở dạng tiếp diễn diễn tả cách cư xử tạm thời, khác thường ngày → are being. "are been" sai dạng; "being" thiếu are; "is being" sai hòa hợp với you.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['I believe that education should be free.', 'I am believing that education should be free.', 'I believing that education should be free.', 'I am believe that education should be free.'], answer: 0, explain: 'believe là động từ trạng thái (quan điểm) nên dùng hiện tại đơn, không dùng -ing. "am believing" chia tiếp diễn với động từ trạng thái; "believing" thiếu động từ chính; "am believe" sai cấu trúc.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['This bag is belonging to my teacher.', 'This bag belong to my teacher.', 'This bag belongs to my teacher.', 'This bag is belong to my teacher.'], answer: 2, explain: 'belong là động từ trạng thái (sở hữu) → hiện tại đơn; chủ ngữ số ít → belongs. "is belonging" chia tiếp diễn với động từ trạng thái; belong thiếu -s; "is belong" sai cấu trúc.' },
      { q: 'Phần nào sai? Right now, I (A) am thinking about (B) moving abroad, but my parents (C) are not wanting me (D) to leave.', options: ['(A) am thinking', '(B) moving', '(C) are not wanting', '(D) to leave'], answer: 2, explain: 'want là động từ trạng thái → sửa are not wanting thành don\'t want. (think about = cân nhắc là hành động nên am thinking đúng.)' },
      { q: 'Phần nào sai? The new course (A) is consisting (B) of twelve modules (C) that cover (D) a wide range of topics.', options: ['(A) is consisting', '(B) of', '(C) that', '(D) a wide range'], answer: 0, explain: 'consist of là động từ trạng thái → sửa is consisting thành consists. of, that và a wide range đều đúng.' },
      { q: 'Task 2: Many people ___ that working from home improves their quality of life.', options: ['are thinking', 'think', 'thinks', 'is thinking'], answer: 1, explain: 'think mang nghĩa có quan điểm là động từ trạng thái → think (chủ ngữ số nhiều). are thinking dùng cho việc đang cân nhắc; thinks và is thinking sai hòa hợp với Many people.' },
      { q: 'Speaking Part 1: "Do you like your hometown?" – "Yes, I ___ it, especially the food."', options: ['am loving', 'loving', 'am love', 'love'], answer: 3, explain: 'love là động từ trạng thái (cảm xúc) → hiện tại đơn: love. am loving không dùng trong văn trang trọng; loving thiếu động từ chính; "am love" sai cấu trúc.' }
    ]
  });

  /* 13. Choosing tenses in IELTS */
  G.push({
    id: 'tenses-ielts', unit: 'tenses', order: 13,
    title: 'Chọn thì trong IELTS Writing Task 1 & Speaking', en: 'Choosing Tenses for IELTS', level: 'B2', emoji: '🎯',
    summary: 'Nhìn vào MỐC THỜI GIAN của dữ liệu hoặc câu hỏi để chọn thì: quá khứ cho số liệu đã qua, hiện tại cho quy trình và bản đồ hiện tại, tương lai cho dự báo.',
    blocks: [
      { type: 'timeline', caption: 'Ba vùng thời gian thường gặp trong Task 1: số liệu quá khứ, hiện tại (quy trình/bản đồ) và dự báo tương lai.', marks: [ { kind: 'range', from: 8, to: 40, label: '2000–2020 data' }, { kind: 'now', at: 50 }, { kind: 'point', at: 84, label: '2040 forecast' } ] },
      { type: 'formula', rows: [
        { label: 'Khẳng định (+) – số liệu quá khứ', parts: [ { t: 'The figure for X', c: 'subj' }, { t: 'rose / fell / remained', c: 'verb' }, { t: 'to / by + số liệu', c: 'obj' }, { t: 'in / between + năm', c: 'time' } ], ex: 'The figure for car ownership rose by 15% between 2005 and 2015.' },
        { label: 'Phủ định (−)', parts: [ { t: 'S', c: 'subj' }, { t: 'did not / is not expected to', c: 'neg' }, { t: 'change', c: 'verb' }, { t: 'significantly', c: 'adv' } ], ex: 'Spending on healthcare did not change significantly over the period.' },
        { label: 'Nghi vấn (?) – câu hỏi Speaking', parts: [ { t: 'Have / Do / Did / Will', c: 'aux' }, { t: 'you', c: 'subj' }, { t: 'V', c: 'verb' }, { t: '…?', c: 'obj' } ], ex: 'Have you ever taken part in a volunteer project?' } ] },
      { type: 'uses', items: [
        { title: 'Biểu đồ có năm trong quá khứ → quá khứ đơn', ex: 'In 1990, only 12% of households owned a computer.', vi: 'Năm 1990, chỉ 12% hộ gia đình sở hữu máy tính.' },
        { title: 'Biểu đồ có dự báo tương lai → will / be expected to / will have V3', ex: 'Demand for water is expected to rise steadily until 2040.', vi: 'Nhu cầu nước được dự báo sẽ tăng đều đến năm 2040.' },
        { title: 'Quy trình (process) và bản đồ hiện tại → hiện tại đơn (thường bị động)', ex: 'The leaves are dried, crushed and then packed into bags.', vi: 'Lá được phơi khô, nghiền nhỏ rồi đóng vào túi.' },
        { title: 'So sánh bản đồ quá khứ–hiện tại → quá khứ đơn + hiện tại hoàn thành', ex: 'The forest has been replaced by a housing estate, and a new road was built in 2015.', vi: 'Khu rừng đã được thay thế bằng một khu dân cư, và một con đường mới được xây năm 2015.' },
        { title: 'Speaking: trả lời bằng đúng thì của câu hỏi, rồi mở rộng bằng thì khác', ex: 'Yes, I have. Last summer I volunteered at a local animal shelter, and I\'m planning to go back this year.', vi: 'Có ạ. Hè năm ngoái tôi làm tình nguyện ở một trại cứu hộ động vật địa phương, và năm nay tôi dự định quay lại.' } ] },
      { type: 'signals', words: ['in + năm (quá khứ)', 'over the period', 'between … and …', 'by 2030', 'is projected to', 'currently', 'at present', 'since then'] },
      { type: 'table', head: ['Dạng đề / câu hỏi', 'Thì chính', 'Ví dụ ngắn'], rows: [
        ['Line / bar / pie – năm đã qua', 'Quá khứ đơn', 'Sales peaked in 2018.'],
        ['Line / bar – có năm tương lai', 'will, be predicted to, will have V3', 'Sales will reach a peak in 2030.'],
        ['Process diagram', 'Hiện tại đơn (bị động)', 'The glass is melted.'],
        ['Map: then vs now', 'Quá khứ đơn + hiện tại hoàn thành', 'A car park has been added.'],
        ['Speaking Part 1 (thói quen)', 'Hiện tại đơn', 'I usually read before bed.'],
        ['Speaking Part 2 (kể chuyện)', 'Quá khứ đơn + quá khứ tiếp diễn/hoàn thành', 'I was living in Hue when…'],
        ['Speaking Part 3 (xu hướng, tương lai)', 'Hiện tại tiếp diễn, hiện tại hoàn thành, will', 'Jobs are becoming more automated.'] ] },
      { type: 'tip', text: '👀 Trước khi viết Task 1, hãy dành 10 giây khoanh tròn các năm trên trục hoành: tất cả đã qua → quá khứ; có năm sau hiện tại → tương lai; không có năm (process) → hiện tại đơn.' },
      { type: 'tip', text: '🎧 Trong Speaking, "nghe thì của câu hỏi" là cách nhanh nhất để chọn thì đúng: Do you…? → hiện tại đơn; Did you…? → quá khứ đơn; Have you ever…? → hiện tại hoàn thành; Will…? / How might…? → tương lai.' },
      { type: 'mistake', wrong: 'In 2000, the number of visitors increases to 2 million.', right: 'In 2000, the number of visitors increased to 2 million.', why: 'Người học hay "nhìn hình mô tả" và dùng hiện tại đơn, nhưng năm 2000 đã qua nên phải dùng quá khứ đơn.' },
      { type: 'mistake', wrong: 'By 2040, the population will increase to 9 million and then it reaches a peak.', right: 'By 2040, the population will have increased to 9 million, after which it is expected to reach a peak.', why: 'Với dự báo, phải giữ nhất quán thì tương lai; không chuyển về hiện tại đơn giữa chừng.' },
      { type: 'mistake', wrong: 'Examiner: Did you enjoy school? – Candidate: Yes, I enjoy it very much.', right: 'Examiner: Did you enjoy school? – Candidate: Yes, I really enjoyed it.', why: 'Câu hỏi về quá khứ phải được trả lời bằng quá khứ; lặp sai thì là lỗi bị trừ điểm Grammatical Range and Accuracy.' },
      { type: 'ielts', text: 'Tiêu chí Grammatical Range and Accuracy chấm cả độ chính xác và sự đa dạng. Một bài Task 1 tốt thường dùng chính xác 2–3 thì (ví dụ quá khứ đơn + quá khứ hoàn thành với by), còn một câu trả lời Speaking Part 2 tốt kết hợp quá khứ đơn, quá khứ tiếp diễn và một câu hiện tại để kết luận.', ex: 'Coal remained the main source of energy until 2010; by 2020, however, it had been overtaken by natural gas, and renewables are predicted to dominate by 2050.' }
    ],
    quiz: [
      { q: 'Biểu đồ cho số liệu 1995–2015. Câu nào đúng?', options: ['Unemployment falls to 5% in 2015.', 'Unemployment has fallen to 5% in 2015.', 'Unemployment fell to 5% in 2015.', 'Unemployment will fall to 5% in 2015.'], answer: 2, explain: '2015 là năm đã qua → quá khứ đơn: fell. falls (hiện tại) và will fall (tương lai) sai thời điểm; has fallen không đi với mốc năm cụ thể trong quá khứ.' },
      { q: 'In a process diagram: The bottles ___ and then refilled.', options: ['are washed', 'washed', 'were washing', 'will wash'], answer: 0, explain: 'Quy trình dùng hiện tại đơn, thường ở dạng bị động: are washed. washed thiếu are (thành chủ động/quá khứ); were washing là chủ động quá khứ; will wash là chủ động tương lai.' },
      { q: 'By 2050, the number of elderly people ___ (double).', options: ['doubles', 'doubled', 'has doubled', 'will have doubled'], answer: 3, explain: 'By + mốc tương lai (By 2050) trong dự báo → tương lai hoàn thành will have + V3 → will have doubled. doubles, doubled, has doubled đều không diễn tả việc sẽ hoàn tất trước một mốc tương lai.' },
      { q: 'Bản đồ 2005 và hiện tại. Chọn câu đúng:', options: ['Since 2005, a hospital was built next to the park.', 'Since 2005, a hospital has been built next to the park.', 'Since 2005, a hospital is built next to the park.', 'Since 2005, a hospital builds next to the park.'], answer: 1, explain: 'Since + mốc quá khứ, thay đổi tính đến hiện tại → hiện tại hoàn thành bị động. was built và is built không đi với Since; builds là chủ động, sai nghĩa.' },
      { q: 'Examiner: "Have you ever been to a music festival?" Câu trả lời tự nhiên nhất:', options: ['Yes, I go to one last year.', 'Yes, I have went to one last year.', 'Yes, I have. I went to one in Da Lat last year.', 'Yes, I am going to one last year.'], answer: 2, explain: 'Trả lời bằng hiện tại hoàn thành (I have), rồi kể chi tiết có mốc thời gian bằng quá khứ đơn.' },
      { q: 'Speaking Part 3: "How are cities changing?" Câu nào phù hợp nhất?', options: ['Cities are becoming more crowded as people move in for work.', 'Cities became more crowded.', 'Cities had become more crowded.', 'Cities become crowded tomorrow.'], answer: 0, explain: 'Câu hỏi về xu hướng đang diễn ra → hiện tại tiếp diễn. became và had become nói về quá khứ; "become crowded tomorrow" sai thì và nghĩa.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['In 2010, sales have reached a peak of 500 units.', 'In 2010, sales reached a peak of 500 units.', 'In 2010, sales reach a peak of 500 units.', 'In 2010, sales had reach a peak of 500 units.'], answer: 1, explain: 'Năm cụ thể trong quá khứ (In 2010) → quá khứ đơn: reached. have reached không đi với năm quá khứ cụ thể; reach là hiện tại; "had reach" thiếu V3.' },
      { q: 'Câu nào đúng ngữ pháp?', options: ['Since 2000, the forest was replaced by houses.', 'Since 2000, the forest is replaced by houses.', 'Since 2000, the forest has replaced by houses.', 'Since 2000, the forest has been replaced by houses.'], answer: 3, explain: 'So sánh bản đồ quá khứ – hiện tại, có since → hiện tại hoàn thành bị động: has been replaced.' },
      { q: 'Phần nào sai? Between 1990 and 2000, the price of coffee (A) has fallen (B) sharply, (C) before (D) recovering in 2005.', options: ['(A) has fallen', '(B) sharply', '(C) before', '(D) recovering'], answer: 0, explain: 'Khoảng thời gian đã khép lại trong quá khứ (1990–2000) → quá khứ đơn: fell. sharply, before và recovering đều đúng.' },
      { q: 'Phần nào sai? In the process, the clay (A) is first (B) dug from the ground and then it (C) was (D) shaped into bricks.', options: ['(A) is', '(B) dug', '(C) was', '(D) shaped'], answer: 2, explain: 'Quy trình dùng hiện tại đơn xuyên suốt → sửa was thành is. is, dug và shaped đều đúng.' },
      { q: 'Task 1: According to projections, the population aged over 65 ___ by 2050.', options: ['doubled', 'has doubled', 'will have doubled', 'had doubled'], answer: 2, explain: 'Dự báo hoàn tất trước mốc tương lai (by 2050) → will have doubled. doubled và had doubled là quá khứ; has doubled là hiện tại hoàn thành, không hợp với mốc 2050.' },
      { q: 'Speaking Part 1: "Have you ever been abroad?" – "Yes, I have. I ___ to Thailand two years ago."', options: ['have been', 'went', 'go', 'had gone'], answer: 1, explain: 'Trả lời bằng hiện tại hoàn thành, rồi mở rộng với thời điểm cụ thể (two years ago) bằng quá khứ đơn: went.' }
    ]
  });

})(typeof self !== 'undefined' ? self : this);
