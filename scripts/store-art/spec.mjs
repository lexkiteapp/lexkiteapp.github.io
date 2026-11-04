// Một nguồn cho bộ ảnh giới thiệu: thứ tự ảnh, màn app thật cần chụp, khung Stitch, kích thước từng store (docs/STORE-ART.md).
export const LANGS = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];

// Thứ tự theo sức thuyết phục. theme = sáng/tối của cả khung lẫn màn app chụp, để ánh sáng đồng nhất. teacher = [người, dáng, lời trong bong bóng].
export const SLIDES = [
  { id: 'hero', route: 'home', theme: 'dark', frame: 'phone-hero', teacher: ['ama', 'cheer', 'Hi! Ready to talk?'] },
  { id: 'call', route: 'call', theme: 'light', frame: 'phone-feature', steps: 'call' },
  { id: 'write', route: 'write', theme: 'dark', frame: 'phone-feature', steps: 'write' },
  { id: 'lesson', route: 'lesson/go?demo=1', theme: 'light', frame: 'phone-hero', teacher: ['carlos', 'encourage', 'Nice work! Keep going.'], wait: 6000 },
  { id: 'say', route: 'say', theme: 'dark', frame: 'phone-feature', steps: 'say' },
  { id: 'review', route: 'review', theme: 'light', frame: 'phone-feature', steps: 'flip' },
  { id: 'tests', route: 'tests', theme: 'dark', frame: 'phone-feature' },
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
  { id: 'cws-marquee', frame: 'wide', w: 1400, h: 560, theme: 'dark', store: 'chrome' },
  { id: 'cws-tile', frame: 'tile', w: 440, h: 280, theme: 'dark', store: 'chrome' },
  { id: 'og', frame: 'wide', w: 1200, h: 630, theme: 'dark', store: 'web', perLang: true },
  { id: 'og-light', frame: 'wide', w: 1200, h: 630, theme: 'light', store: 'web' },
  { id: 'social-square', frame: 'square', w: 1080, h: 1080, theme: 'light', store: 'web', perLang: true },
];

// Từ không được xuất hiện trên ảnh Play (Metadata policy + Add preview assets): giá, khuyến mãi.
export const PRICE_WORDS = /(\bfree\b|\bgratis\b|\bgrátis\b|\bgratuit|\bkostenlos|miễn phí|\bücretsiz|ฟรี|免费|無料|무료|मुफ़्त|مجان|бесплатн)/i;
