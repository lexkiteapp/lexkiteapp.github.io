/* 🎬 Bộ chủ đề #/watch (docs/specs/video-learn.md). Chỉ dữ liệu: name/desc là KHÓA i18n (dịch lúc vẽ); lv = CEFR 1..6; goals khớp App.exam();
 * q = từ khóa tìm (tiếng Anh, q[0] chính); ch = kênh công khai cho RSS; kw = lọc tiêu đề RSS; vocab = gợi ý theo sổ từ. */
(function (g) {
  const C = { TEDED: 'UCsooa4yRKGN_zEE8iknghZA', TED: 'UCAuUUnT6oDeKwE6v1NGQxug', BBCLE: 'UCHaHD477h-FeBbVh9Sh7syA', VOA: 'UCKyTokYo0nK2OA-az-sDijA', KURZ: 'UCsXVk37bltHxD1rDPwtNM8Q', CRASH: 'UCX6b17PVsYBQ0ip5gyeme-Q', VOX: 'UCLXo7UDZvByw2ixzpQCufnA', VERI: 'UCHnyfMqiRRG1u-2MsSQLbXA', SCISHOW: 'UCZYTClx2T1of7BRZ86-8fow', LUCY: 'UCz4tgANd4yy8Oe0iXCdSWfA', RACHEL: 'UCvn_XCl_mgQmt3sD753zdJA' };
  const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  // Bộ lọc → tham số Data API (dur/cc) hoặc đuôi từ khóa (accent, tốc độ nói). Nhãn là KHÓA dịch.
  const FILTERS = {
    dur: [['', 'Mọi độ dài'], ['short', 'Ngắn < 4 phút'], ['medium', '4–20 phút'], ['long', 'Dài > 20 phút']],
    acc: [['', 'Mọi giọng'], ['uk', 'Giọng Anh-Anh'], ['us', 'Giọng Anh-Mỹ'], ['au', 'Giọng Anh-Úc']],
    pace: [['', 'Mọi tốc độ'], ['slow', 'Nói chậm'], ['natural', 'Tự nhiên']],
  };
  const ACC_Q = { uk: 'british accent', us: 'american accent', au: 'australian accent' };
  const PACE_Q = { slow: 'slow english', natural: 'native speakers' };
  const LV_Q = n => (n <= 2 ? 'easy english for beginners' : n <= 3 ? 'english listening intermediate' : n >= 5 ? 'advanced english' : '');

  const T = (id, ic, lv, goals, name, desc, q, ch, kw, vocab) => ({ id, ic, lv, goals, name, desc, q, ch, kw: kw || [], vocab: vocab || [] });
  const TOPICS = [
    T('daily', 'message-circle', [1, 3], ['all'], 'Hội thoại đời sống', 'Chào hỏi, mua sắm, hỏi đường, nói chuyện nhỏ', ['everyday english conversation', 'english small talk phrases', 'daily english dialogues'], [C.BBCLE, C.LUCY, C.VOA], ['conversation', 'phrases', 'everyday', 'talk', 'say'], ['hello', 'shop', 'buy', 'weather', 'friend']),
    T('beginner', 'sprout', [1, 2], ['all'], 'Người mới bắt đầu', 'Câu ngắn, nói chậm, từ cơ bản', ['english for absolute beginners', 'slow easy english story', 'basic english sentences'], [C.VOA, C.BBCLE], ['beginner', 'easy', 'basic', 'learn'], ['family', 'home', 'food', 'day']),
    T('travel', 'luggage', [1, 4], ['all', 'general'], 'Du lịch', 'Sân bay, khách sạn, nhà hàng, đi lại', ['english for travel airport hotel', 'travel english conversation', 'restaurant english phrases'], [C.BBCLE, C.VOA, C.LUCY], ['travel', 'airport', 'hotel', 'trip', 'holiday', 'restaurant'], ['airport', 'hotel', 'ticket', 'luggage', 'trip']),
    T('work', 'briefcase', [3, 5], ['all', 'toeic', 'general'], 'Công việc & văn phòng', 'Họp, email, phỏng vấn, thuyết trình', ['business english meetings', 'job interview english', 'english for the office'], [C.BBCLE, C.LUCY], ['business', 'work', 'job', 'interview', 'office', 'meeting'], ['meeting', 'deadline', 'colleague', 'interview', 'manager']),
    T('business', 'chart-column', [4, 6], ['all', 'toeic'], 'Kinh doanh & kinh tế', 'Thị trường, công ty, tiền bạc', ['how the economy works explained', 'business explained english', 'marketing explained'], [C.VOX, C.CRASH, C.TEDED], ['economy', 'money', 'market', 'business', 'company', 'price'], ['economy', 'market', 'profit', 'invest', 'company']),
    T('ielts', 'target', [3, 6], ['ielts'], 'IELTS', 'Listening, Speaking mẫu band 7+, mẹo làm bài', ['ielts listening practice', 'ielts speaking band 9 sample', 'ielts tips'], [C.BBCLE], ['ielts', 'exam', 'test'], ['describe', 'opinion', 'advantage', 'environment']),
    T('toeic', 'goal', [2, 5], ['toeic'], 'TOEIC', 'Nghe Part 1–4, tình huống công sở', ['toeic listening practice', 'toeic part 3 conversations', 'toeic tips'], [], [], ['schedule', 'invoice', 'shipment', 'conference']),
    T('toefl', 'graduation-cap', [4, 6], ['toefl'], 'TOEFL', 'Bài giảng học thuật, nói và nghe', ['toefl listening lecture practice', 'toefl speaking practice', 'academic lecture english'], [C.CRASH], [], ['lecture', 'theory', 'research', 'evidence']),
    T('academic', 'school', [4, 6], ['all', 'ielts', 'toefl'], 'Học thuật', 'Bài giảng, lịch sử, tâm lý, triết học', ['crash course history', 'psychology explained', 'philosophy explained simply'], [C.CRASH, C.TEDED], ['history', 'psychology', 'philosophy', 'literature'], ['theory', 'research', 'society', 'culture']),
    T('ted', 'megaphone', [4, 6], ['all'], 'Bài nói kiểu TED', 'Ý tưởng hay, người thật nói tự nhiên', ['ted talk inspiring', 'ted talk short', 'ted ed lesson'], [C.TED, C.TEDED], [], ['idea', 'future', 'change', 'brain']),
    T('stories', 'book-open', [2, 4], ['all'], 'Truyện & hoạt hình', 'Truyện ngắn, câu đố, hoạt hình giáo dục', ['ted ed riddle', 'english short story animation', 'animated story english subtitles'], [C.TEDED], ['riddle', 'myth', 'story'], ['story', 'myth', 'hero', 'riddle']),
    T('news', 'newspaper', [3, 6], ['all', 'ielts', 'general'], 'Tin tức', 'Bản tin chậm, thời sự dễ hiểu', ['learning english news', 'news review english', 'world news explained'], [C.VOA, C.BBCLE, C.VOX], ['news', 'world', 'review'], ['government', 'election', 'climate', 'report']),
    T('science', 'flask-conical', [4, 6], ['all', 'ielts', 'toefl'], 'Khoa học', 'Vũ trụ, cơ thể, vật lý, sinh học', ['science explained', 'how the universe works', 'biology explained'], [C.KURZ, C.VERI, C.SCISHOW, C.TEDED], ['science', 'space', 'universe', 'cell', 'energy', 'physics'], ['energy', 'planet', 'cell', 'experiment']),
    T('tech', 'zap', [3, 6], ['all'], 'Công nghệ', 'AI, Internet, máy tính, phát minh', ['technology explained', 'how ai works explained', 'how the internet works'], [C.VOX, C.CRASH, C.VERI], ['ai', 'technology', 'internet', 'computer', 'robot'], ['technology', 'data', 'device', 'software']),
    T('health', 'dna', [2, 5], ['all', 'ielts'], 'Sức khỏe', 'Giấc ngủ, ăn uống, tập luyện, tâm lý', ['health explained', 'sleep science explained', 'healthy habits english'], [C.TEDED, C.SCISHOW, C.KURZ], ['health', 'sleep', 'body', 'brain', 'food', 'stress'], ['health', 'sleep', 'diet', 'exercise', 'stress']),
    T('environment', 'cloud', [3, 6], ['all', 'ielts'], 'Môi trường', 'Khí hậu, năng lượng, động vật', ['climate change explained', 'environment english listening', 'renewable energy explained'], [C.KURZ, C.VOX, C.TEDED], ['climate', 'energy', 'planet', 'ocean', 'animal'], ['climate', 'pollution', 'energy', 'species']),
    T('culture', 'landmark', [3, 5], ['all'], 'Văn hóa & xã hội', 'Lối sống, lễ hội, khác biệt văn hóa', ['british culture explained', 'american culture explained', 'culture shock english'], [C.BBCLE, C.LUCY, C.VOX], ['culture', 'british', 'american', 'tradition'], ['culture', 'tradition', 'festival', 'custom']),
    T('movies', 'monitor', [3, 6], ['all', 'general'], 'Phim & series', 'Học tiếng Anh qua cảnh phim, idiom đời thường', ['learn english with movies', 'learn english with tv series', 'english idioms from movies'], [C.LUCY, C.RACHEL], ['movie', 'film', 'series', 'tv'], ['scene', 'character', 'idiom']),
    T('pron', 'audio-lines', [1, 6], ['all'], 'Phát âm', 'Âm khó, nối âm, ngữ điệu, giọng Anh/Mỹ', ['english pronunciation practice', 'american english pronunciation', 'british pronunciation'], [C.RACHEL, C.LUCY, C.BBCLE], ['pronunciation', 'pronounce', 'sound', 'accent'], ['pronounce', 'vowel', 'stress']),
    T('grammar', 'puzzle', [1, 5], ['all'], 'Ngữ pháp qua ví dụ', 'Thì, mạo từ, câu điều kiện qua tình huống', ['english grammar lesson', 'english tenses explained', 'grammar in context english'], [C.BBCLE, C.LUCY], ['grammar', 'tense', 'verb'], ['tense', 'verb', 'article']),
    T('vocab', 'layers', [2, 6], ['all', 'ielts'], 'Từ vựng & idiom', 'Cụm từ, collocation, idiom thường gặp', ['english vocabulary lesson', 'english idioms meaning', 'advanced english vocabulary'], [C.LUCY, C.BBCLE], ['vocabulary', 'words', 'idioms', 'phrasal'], ['idiom', 'phrasal', 'collocation']),
    T('kids', 'smile', [1, 2], ['general', 'all'], 'Trẻ em & gia đình', 'Bài hát, truyện thiếu nhi, từ đơn giản', ['english for kids story', 'kids english learning', 'english songs for kids'], [], [], ['animal', 'color', 'number']),
  ];
  g.WatchTopics = { TOPICS, LEVELS, FILTERS, ACC_Q, PACE_Q, LV_Q, CHANNELS: C };
})(typeof window !== 'undefined' ? window : globalThis);
