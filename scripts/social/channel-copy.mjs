// Chữ của bộ kênh social theo ngôn ngữ – MỘT nguồn cho ảnh (build-channel-kit.mjs) và văn bản page (build-page-info.mjs → <lang>/page-info.md + download.html).
// Quy trình dịch: docs/I18N-PIPELINE.md (nghĩa như app bản địa, không dịch máy thô). Mỗi bản có "back" = dịch ngược sang tiếng Anh để soát nghĩa (i18n-qa: không lẫn tiếng, giữ IELTS/TOEIC/Lexkite).
// Ảnh: h1/h2a/stick/h2b = tiêu đề 2 dòng (stick = cụm gạch lượn; bìa FB xuống dòng sau h1, banner YT nối h1 + h2a + stick + h2b trên 1 dòng nên h1 có dấu phẩy khi ngữ pháp cần)
//      hs/hb = cỡ tiêu đề bìa FB / banner YT (chữ dài → nhỏ hơn để vừa vùng an toàn; cổng QC bắt tràn). thumb.l1/l2 ≤ 11 ký tự (không đè giáo viên).
export const COPY = {
  en: {
    h1: 'Learn English words', h2a: 'that ', stick: 'stick', h2b: '.', hs: 84, hb: 96,
    sub: 'Free vocabulary for IELTS, TOEIC & everyday English',
    badge: 'Lexkite · 100% free · No paywalls', channel: '100% free channel',
    url: 'lexkite.com', weekly: 'New lessons every week',
    thumb: { tag: 'Band 7+', big: '10', l1: 'IELTS WORDS', l2: 'for travel' },
  },
  vi: {
    h1: 'Học từ vựng tiếng Anh', h2a: '', stick: 'nhớ lâu', h2b: '.', hs: 76, hb: 84,
    sub: 'Miễn phí – IELTS, TOEIC & tiếng Anh hằng ngày',
    badge: 'Lexkite · Miễn phí 100% · Không tường phí', channel: 'Kênh miễn phí 100%',
    url: 'lexkite.com', weekly: 'Bài học mới mỗi tuần',
    thumb: { tag: 'Band 7+', big: '10', l1: 'TỪ IELTS', l2: 'đi du lịch' },
  },
  es: {
    h1: 'Aprende vocabulario de inglés', h2a: '', stick: 'que se queda', h2b: '.', hs: 60, hb: 58,
    sub: 'Gratis para IELTS, TOEIC e inglés cotidiano',
    badge: 'Lexkite · 100 % gratis · Sin paywall', channel: 'Canal 100 % gratis',
    url: 'lexkite.com', weekly: 'Lecciones nuevas cada semana',
    thumb: { tag: 'Band 7+', big: '10', l1: 'PALABRAS', l2: 'de viaje' },
  },
  pt: {
    h1: 'Vocabulário de inglês', h2a: '', stick: 'que fica na memória', h2b: '.', hs: 68, hb: 56,
    sub: 'Grátis para IELTS, TOEIC e inglês do dia a dia',
    badge: 'Lexkite · 100% grátis · Sem paywall', channel: 'Canal 100% grátis',
    url: 'lexkite.com', weekly: 'Aulas novas toda semana',
    thumb: { tag: 'Band 7+', big: '10', l1: 'PALAVRAS', l2: 'de viagem' },
  },
  de: {
    h1: 'Englische Wörter lernen,', h2a: '', stick: 'die hängen bleiben', h2b: '.', hs: 66, hb: 52,
    sub: 'Kostenlos für IELTS, TOEIC & Alltagsenglisch',
    badge: 'Lexkite · 100 % kostenlos · Ohne Paywall', channel: '100 % kostenloser Kanal',
    url: 'lexkite.com', weekly: 'Jede Woche neue Lektionen',
    thumb: { tag: 'Band 7+', big: '10', l1: 'WÖRTER', l2: 'für Reisen' },
  },
  fr: {
    h1: 'Apprends les mots anglais', h2a: '', stick: 'qui restent', h2b: '.', hs: 64, hb: 60,
    sub: 'Gratuit pour l’IELTS, le TOEIC et l’anglais du quotidien',
    badge: 'Lexkite · 100 % gratuit · Sans paywall', channel: 'Chaîne 100 % gratuite',
    url: 'lexkite.com', weekly: 'Nouvelles leçons chaque semaine',
    thumb: { tag: 'Band 7+', big: '10', l1: 'MOTS', l2: 'en voyage' },
  },
  ru: {
    h1: 'Английские слова,', h2a: '', stick: 'которые запоминаются', h2b: '.', hs: 62, hb: 52,
    sub: 'Бесплатно: IELTS, TOEIC и повседневный английский',
    badge: 'Lexkite · 100% бесплатно · Без пейвола', channel: '100% бесплатный канал',
    url: 'lexkite.com', weekly: 'Новые уроки каждую неделю',
    thumb: { tag: 'Band 7+', big: '10', l1: 'СЛОВ', l2: 'в поездку' },
  },
  tr: {
    h1: 'İngilizce kelimeleri', h2a: '', stick: 'kalıcı öğren', h2b: '.', hs: 72, hb: 70,
    sub: 'IELTS, TOEIC ve günlük İngilizce için ücretsiz',
    badge: 'Lexkite · %100 ücretsiz · Ödeme duvarı yok', channel: '%100 ücretsiz kanal',
    url: 'lexkite.com', weekly: 'Her hafta yeni dersler',
    thumb: { tag: 'Band 7+', big: '10', l1: 'KELİME', l2: 'seyahatte' },
  },
  ar: {
    h1: 'تعلّم كلمات الإنجليزية', h2a: '', stick: 'التي لا تُنسى', h2b: '.', hs: 72, hb: 68,
    sub: 'مجاني لـ IELTS وTOEIC والإنجليزية اليومية',
    badge: 'Lexkite · مجاني 100% · بلا اشتراك', channel: 'قناة مجانية 100%',
    url: 'lexkite.com', weekly: 'دروس جديدة كل أسبوع',
    thumb: { tag: 'Band 7+', big: '10', l1: 'كلمات', l2: 'للسفر' },
  },
  hi: {
    h1: 'अंग्रेज़ी शब्द सीखें', h2a: '', stick: 'जो याद रहें', h2b: '।', hs: 72, hb: 68,
    sub: 'IELTS, TOEIC और रोज़मर्रा की अंग्रेज़ी – मुफ़्त',
    badge: 'Lexkite · 100% मुफ़्त · कोई पेवॉल नहीं', channel: '100% मुफ़्त चैनल',
    url: 'lexkite.com', weekly: 'हर हफ़्ते नए पाठ',
    thumb: { tag: 'Band 7+', big: '10', l1: 'शब्द', l2: 'सफ़र में' },
  },
  ja: {
    h1: '忘れない英単語を', h2a: '', stick: '無料で学ぼう', h2b: '。', sp: '', hs: 84, hb: 88,
    sub: 'IELTS・TOEIC・日常英会話の単語を無料で',
    badge: 'Lexkite · 完全無料 · ペイウォールなし', channel: '100%無料チャンネル',
    url: 'lexkite.com', weekly: '毎週新しいレッスン',
    thumb: { tag: 'Band 7+', big: '10', l1: '英単語', l2: '旅行編' },
  },
  ko: {
    h1: '잊지 않는 영어 단어를', h2a: '', stick: '무료로 배우세요', h2b: '.', hs: 72, hb: 72,
    sub: 'IELTS, TOEIC, 일상 영어 단어를 무료로',
    badge: 'Lexkite · 100% 무료 · 결제 장벽 없음', channel: '100% 무료 채널',
    url: 'lexkite.com', weekly: '매주 새로운 레슨',
    thumb: { tag: 'Band 7+', big: '10', l1: '영어 단어', l2: '여행 편' },
  },
  zh: {
    h1: '轻松记住英语单词，', h2a: '', stick: '完全免费', h2b: '。', sp: '', hs: 80, hb: 88,
    sub: 'IELTS、TOEIC 与日常英语词汇，免费学',
    badge: 'Lexkite · 100% 免费 · 无付费墙', channel: '100% 免费频道',
    url: 'lexkite.com', weekly: '每周更新新课程',
    thumb: { tag: 'Band 7+', big: '10', l1: '英语单词', l2: '旅行篇' },
  },
};
export const KIT_LANGS = Object.keys(COPY).filter(l => l !== 'en');   // ngôn ngữ có bộ ảnh riêng (vi = PR #1018)
export const RTL = ['ar'];
// Chữ cần có trong ảnh của ngôn ngữ (cổng: ru/ar/hi phải thật sự có chữ Cyrillic/Ả Rập/Devanagari, không phải bản EN nhét lại).
export const SCRIPT = { ru: /[Ѐ-ӿ]/, ar: /[؀-ۿ]/, hi: /[ऀ-ॿ]/ };

// Văn bản page (Facebook). bio ≤ 100 ký tự (đếm theo ký tự thật, cổng test); about = phần Giới thiệu; name = tên page đề xuất.
export const INFO = {
  vi: { name: 'Lexkite - Học Tiếng Anh', bio: 'Học từ vựng tiếng Anh nhớ lâu: IELTS, TOEIC, giao tiếp. Bài ngắn, miễn phí 100%.',
    about: 'Lexkite giúp bạn học từ vựng tiếng Anh nhớ lâu: bài học ngắn, ôn tập thông minh và quiz cho IELTS, TOEIC và tiếng Anh hằng ngày. 100% miễn phí, không tường phí. Bài học mới mỗi tuần. Dùng trên web, app điện thoại và tiện ích Chrome.',
    cta: 'Tìm hiểu thêm', back: 'Learn English vocabulary that sticks…' },
  es: { name: 'Lexkite - Aprende inglés', bio: 'Vocabulario de inglés que se queda: IELTS, TOEIC y el día a día. Lecciones cortas, 100 % gratis.',
    about: 'Lexkite te ayuda a aprender vocabulario de inglés que de verdad se queda: lecciones cortas, repaso inteligente y quizzes para IELTS, TOEIC y el inglés de cada día. Todo 100 % gratis, sin paywall. Lecciones nuevas cada semana. En la web, en la app y con la extensión de Chrome.',
    cta: 'Más información', back: 'English vocabulary that stays: IELTS, TOEIC and everyday. Short lessons, 100% free.' },
  pt: { name: 'Lexkite - Aprenda inglês', bio: 'Vocabulário de inglês que fica: IELTS, TOEIC e o dia a dia. Aulas curtas, 100% grátis.',
    about: 'O Lexkite ajuda você a aprender vocabulário de inglês que realmente fica na memória: aulas curtas, revisão inteligente e quizzes para IELTS, TOEIC e o inglês do dia a dia. Tudo 100% grátis, sem paywall. Aulas novas toda semana. No site, no app e na extensão para Chrome.',
    cta: 'Saiba mais', back: 'English vocabulary that sticks: IELTS, TOEIC and daily life. Short lessons, 100% free.' },
  de: { name: 'Lexkite - Englisch lernen', bio: 'Englisch-Vokabeln, die hängen bleiben: IELTS, TOEIC & Alltag. Kurze Lektionen, 100 % kostenlos.',
    about: 'Lexkite hilft dir, englische Vokabeln zu lernen, die wirklich hängen bleiben: kurze Lektionen, intelligente Wiederholung und Quiz für IELTS, TOEIC und Alltagsenglisch. Alles 100 % kostenlos, ohne Paywall. Jede Woche neue Lektionen. Im Web, als App und als Chrome-Erweiterung.',
    cta: 'Mehr dazu', back: 'English vocabulary that sticks: IELTS, TOEIC & everyday. Short lessons, 100% free.' },
  fr: { name: 'Lexkite - Apprendre l’anglais', bio: 'Le vocabulaire anglais qui reste : IELTS, TOEIC et quotidien. Leçons courtes, 100 % gratuit.',
    about: 'Lexkite t’aide à apprendre un vocabulaire anglais qui reste vraiment en mémoire : leçons courtes, révision intelligente et quiz pour l’IELTS, le TOEIC et l’anglais du quotidien. 100 % gratuit, sans paywall. De nouvelles leçons chaque semaine. Sur le web, en appli et avec l’extension Chrome.',
    cta: 'En savoir plus', back: 'English vocabulary that stays: IELTS, TOEIC and everyday. Short lessons, 100% free.' },
  ru: { name: 'Lexkite - Учим английский', bio: 'Английские слова, которые запоминаются: IELTS, TOEIC, повседневная речь. Короткие уроки, бесплатно.',
    about: 'Lexkite помогает выучить английские слова так, чтобы они действительно запоминались: короткие уроки, умное повторение и тесты для IELTS, TOEIC и повседневного английского. Всё 100% бесплатно, без платных барьеров. Новые уроки каждую неделю. В вебе, в приложении и в расширении для Chrome.',
    cta: 'Подробнее', back: 'English words that get remembered: IELTS, TOEIC, everyday speech. Short lessons, free.' },
  tr: { name: 'Lexkite - İngilizce Öğren', bio: 'Kalıcı İngilizce kelime öğren: IELTS, TOEIC ve günlük konuşma. Kısa dersler, %100 ücretsiz.',
    about: 'Lexkite, İngilizce kelimeleri gerçekten akılda kalacak şekilde öğrenmene yardım eder: kısa dersler, akıllı tekrar ve IELTS, TOEIC ile günlük İngilizce için quizler. Hepsi %100 ücretsiz, ödeme duvarı yok. Her hafta yeni dersler. Web’de, uygulamada ve Chrome eklentisinde.',
    cta: 'Daha fazla bilgi', back: 'Learn English words permanently: IELTS, TOEIC and daily speech. Short lessons, 100% free.' },
  ar: { name: 'Lexkite - تعلّم الإنجليزية', bio: 'كلمات إنجليزية تبقى في ذاكرتك: IELTS وTOEIC والإنجليزية اليومية. دروس قصيرة ومجانية 100%.',
    about: 'يساعدك Lexkite على تعلّم مفردات إنجليزية تبقى في ذاكرتك فعلًا: دروس قصيرة ومراجعة ذكية واختبارات لـ IELTS وTOEIC والإنجليزية اليومية. كل شيء مجاني 100% وبلا اشتراك. دروس جديدة كل أسبوع. على الويب وفي التطبيق وفي إضافة Chrome.',
    cta: 'اعرف المزيد', back: 'English words that stay in your memory: IELTS, TOEIC and everyday English. Short lessons, 100% free.' },
  hi: { name: 'Lexkite - अंग्रेज़ी सीखें', bio: 'अंग्रेज़ी शब्द जो याद रहें: IELTS, TOEIC और रोज़मर्रा की अंग्रेज़ी। छोटे पाठ, 100% मुफ़्त।',
    about: 'Lexkite आपको अंग्रेज़ी शब्द इस तरह सिखाता है कि वे सच में याद रहें: छोटे पाठ, स्मार्ट रिवीज़न और IELTS, TOEIC व रोज़मर्रा की अंग्रेज़ी के लिए क्विज़। सब कुछ 100% मुफ़्त, कोई पेवॉल नहीं। हर हफ़्ते नए पाठ। वेब, ऐप और Chrome एक्सटेंशन पर।',
    cta: 'और जानें', back: 'English words that stay in memory: IELTS, TOEIC and everyday English. Short lessons, 100% free.' },
  ja: { name: 'Lexkite - 英語学習', bio: 'IELTS・TOEIC・日常英会話の英単語が身につく。短いレッスンで、すべて100%無料。',
    about: 'Lexkiteは、忘れない英単語を身につけるための学習サービスです。短いレッスン、スマートな復習、IELTS・TOEIC・日常英会話向けのクイズを、すべて100%無料で、ペイウォールなしで提供。毎週新しいレッスンを配信しています。Web、アプリ、Chrome拡張機能で使えます。',
    cta: '詳しく見る', back: 'Learn English words you will not forget. Short lessons, IELTS/TOEIC/everyday English, 100% free.' },
  ko: { name: 'Lexkite - 영어 공부', bio: '잊지 않는 영어 단어: IELTS, TOEIC, 일상 영어. 짧은 레슨, 100% 무료.',
    about: 'Lexkite는 오래 기억에 남는 영어 단어 학습을 도와줍니다. 짧은 레슨, 똑똑한 복습, IELTS·TOEIC·일상 영어 퀴즈를 모두 100% 무료로, 결제 장벽 없이 제공합니다. 매주 새로운 레슨이 올라옵니다. 웹, 앱, Chrome 확장 프로그램에서 사용하세요.',
    cta: '더 알아보기', back: 'English words you will not forget: IELTS, TOEIC, everyday English. Short lessons, 100% free.' },
  zh: { name: 'Lexkite - 学英语', bio: '轻松记住英语单词：IELTS、TOEIC 与日常英语。短课程，100% 免费。',
    about: 'Lexkite 帮你真正记住英语单词：短课程、智能复习，以及面向 IELTS、TOEIC 和日常英语的测验。全部 100% 免费，没有付费墙。每周更新新课程。可在网页、手机应用和 Chrome 扩展中使用。',
    cta: '了解更多', back: 'Remember English words for real: IELTS, TOEIC and everyday English. Short lessons, 100% free.' },
};
export const FB_CATEGORY = 'Education'; // Page → Chỉnh sửa thông tin → Hạng mục (tìm "Education" / "Giáo dục"; thêm "Website" nếu có)
