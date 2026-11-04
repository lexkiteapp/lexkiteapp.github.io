// Một nguồn cho bộ ảnh giới thiệu: thứ tự ảnh, màn app thật cần chụp, khung Stitch, kích thước từng store (docs/STORE-ART.md).
export const LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];

// Thứ tự theo sức thuyết phục. theme = sáng/tối của cả khung lẫn màn app chụp, để ánh sáng đồng nhất. teacher = [người, dáng, lời trong bong bóng].
export const SLIDES = [
  { id: 'hero', route: 'home', theme: 'dark', frame: 'phone-hero', teacher: ['ama', 'cheer', 'Hi! Ready to talk?'], tf: 0.44, tx: 0.2 },
  { id: 'call', route: 'call', theme: 'light', frame: 'phone-feature', steps: 'call' },
  { id: 'write', route: 'write', theme: 'dark', frame: 'phone-feature', steps: 'write' },
  { id: 'lesson', route: 'lesson/go?demo=1', theme: 'light', frame: 'phone-feature', wait: 6000 },
  { id: 'say', route: 'say', theme: 'dark', frame: 'phone-feature', steps: 'say' },
  { id: 'review', route: 'review', theme: 'light', frame: 'phone-feature', steps: 'flip' },
  { id: 'tests', route: 'tests', theme: 'dark', frame: 'phone-hero', teacher: ['carlos', 'encourage', 'You can do this!'], tf: 0.36, tx: 0.16 },
];

// viewport = cỡ logic để dựng khung, dsf = hệ số ra đúng pixel store. capture = màn app chụp theo cỡ nào. nofree: Play yêu cầu ảnh không ghi giá.
export const PORTRAIT = {
  'iphone-69': { store: 'apple', w: 440, h: 956, dsf: 3, kind: 'phone', capture: 'simulator' },
  'ipad-13': { store: 'apple', w: 1032, h: 1376, dsf: 2, kind: 'tablet', capture: 'simulator' },
  'play-phone': { store: 'play', w: 432, h: 768, dsf: 2.5, kind: 'phone', capture: 'phone', nofree: true },
  'play-tablet-7': { store: 'play', w: 720, h: 1280, dsf: 1.5, kind: 'tablet', capture: 'tablet', nofree: true },
  'play-tablet-10': { store: 'play', w: 720, h: 1280, dsf: 2, kind: 'tablet', capture: 'tablet', nofree: true },
};
export const CAPTURE = { phone: { width: 390, height: 844, dsf: 3, mobile: true }, tablet: { width: 800, height: 1280, dsf: 2, mobile: true } };

// Ảnh thương hiệu không có màn app: khung rộng, ô quảng cáo, vuông. w×h = pixel thật.
export const BRAND = [
  { id: 'play-feature', frame: 'wide', w: 1024, h: 500, theme: 'dark', store: 'play', nofree: true, perLang: true },
  { id: 'cws-marquee', frame: 'wide', w: 1400, h: 560, theme: 'dark', store: 'chrome', cws: true },
  { id: 'cws-tile', frame: 'tile', w: 440, h: 280, theme: 'dark', store: 'chrome', cws: true },
  { id: 'og', frame: 'wide', w: 1200, h: 630, theme: 'dark', store: 'web', perLang: true },
  { id: 'og-light', frame: 'wide', w: 1200, h: 630, theme: 'light', store: 'web' },
  { id: 'social-square', frame: 'square', w: 1080, h: 1080, theme: 'light', store: 'web', perLang: true },
];

// Bài viết mẫu để chụp báo cáo Viết thật (Lexis.analyze), đủ độ dài Task 2. iOS: thay vào __ESSAY__ trong ios-shots-inject.js lúc build.
export const ESSAY = 'Many people believe that learning a language online is more effective than studying in a traditional classroom. Although both approaches offer significant benefits, I would argue that online study provides greater flexibility, while classroom teaching remains valuable for developing confidence in communication. On the one hand, digital platforms allow learners to practise whenever they have time available. Consequently, students who work full time can maintain a consistent routine without travelling to a school. Furthermore, modern applications analyse individual performance and adjust the level of difficulty, which means that each learner receives a personalised programme. For instance, a student who frequently makes grammatical errors can focus on that specific area instead of following a fixed curriculum. This approach is not only efficient but also highly motivating, because progress becomes visible every day. On the other hand, face-to-face interaction provides an environment that software cannot entirely replace. In a classroom, participants respond to one another immediately, negotiate meaning and receive encouragement from an experienced teacher. As a result, many learners overcome their anxiety about speaking and gradually become more willing to express complex ideas in public. Moreover, regular contact with classmates creates a sense of responsibility, which reduces the likelihood that a student will abandon the course. In conclusion, while online learning offers remarkable convenience and individual attention, it should not be regarded as a complete substitute for human contact. In my opinion, the most successful strategy is to combine daily digital practice with frequent real conversations, since this balance develops both knowledge and confidence.';

// Từ không được xuất hiện trên ảnh Play (Metadata policy + Add preview assets): giá, khuyến mãi.
export const PRICE_WORDS = /(\bfree\b|\bgratis\b|\bgrátis\b|\bgratuit|\bkostenlos|miễn phí|\bücretsiz|ฟรี|免费|無料|무료|मुफ़्त|مجان|бесплатн)/i;
