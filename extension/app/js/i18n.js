/* Đa ngôn ngữ giao diện (i18n). Khóa dịch = chuỗi gốc tiếng Việt trong mã (kiểu gettext): t('Ôn tập') → "Review".
 * Ngôn ngữ: lựa chọn đã lưu → ngôn ngữ trình duyệt → mặc định English. Chỉ nạp file của ngôn ngữ đang dùng.
 * Nội dung học (nghĩa từ, giải thích) theo "ngôn ngữ người học" (learnLang) – mặc định theo giao diện. */
(function (g) {
  if (g.document) g.document.addEventListener('DOMContentLoaded', () => { g.__lkReady = 1; });
  const LANGS = {
    en: ['English', 'English'], vi: ['Vietnamese', 'Tiếng Việt'], es: ['Spanish', 'Español'], pt: ['Portuguese', 'Português'], fr: ['French', 'Français'],
    de: ['German', 'Deutsch'], id: ['Indonesian', 'Bahasa Indonesia'], th: ['Thai', 'ไทย'], zh: ['Chinese (Simplified)', '简体中文'], ja: ['Japanese', '日本語'],
    ko: ['Korean', '한국어'], hi: ['Hindi', 'हिन्दी'], ar: ['Arabic', 'العربية'], ru: ['Russian', 'Русский'], tr: ['Turkish', 'Türkçe'],
  };
  const RTL = new Set(['ar']);
  // Ngôn ngữ đã có bản dịch giao diện đầy đủ (file js/i18n/<lang>.js). Ngôn ngữ khác → dùng English cho CẢ giao diện lẫn nội dung,
  // tránh giao diện một thứ tiếng, nội dung một thứ tiếng. Thêm ngôn ngữ mới: sinh file bằng scripts/gen-i18n.mjs rồi thêm mã vào đây.
  const SUPPORTED = ['en', 'vi', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
  const KEY = 'vb.uiLang';
  const read = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  function detect() {
    // ?hl=xx (liên kết hreflang cho SEO từng quốc gia) – ưu tiên và ghi nhớ
    try { const hl = new URLSearchParams(g.location && location.search).get('hl'); if (hl && SUPPORTED.includes(hl)) { try { localStorage.setItem(KEY, hl); } catch (e) { /* bỏ qua */ } return hl; } } catch (e) { /* bỏ qua */ }
    const saved = read(KEY); if (saved && SUPPORTED.includes(saved)) return saved;
    const navs = (g.navigator && (navigator.languages || [navigator.language])) || [];
    for (const l of navs) { const b = String(l || '').toLowerCase().split('-')[0]; if (SUPPORTED.includes(b)) return b; }
    return 'en';
  }
  const lang = detect();
  // Lần đầu vào (chưa chọn ngôn ngữ, không có ?hl): đoán theo quốc gia qua Cloudflare /cdn-cgi/trace (miễn phí, không tốn lượt Functions).
  // Chỉ chạy 1 lần; khác ngôn ngữ đang hiện → lưu & tải lại. Người dùng đổi lại bất kỳ lúc nào (đầu trang chào mừng / Cài đặt) và lựa chọn đó luôn được ưu tiên.
  const GEO = { VN: 'vi', JP: 'ja', KR: 'ko', CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', TH: 'th', ID: 'id', BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', FR: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', ML: 'fr', DE: 'de', AT: 'de', RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', TR: 'tr', SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', MA: 'ar', DZ: 'ar', JO: 'ar', KW: 'ar', QA: 'ar', OM: 'ar', LB: 'ar', TN: 'ar', LY: 'ar', YE: 'ar', BH: 'ar', SY: 'ar', SD: 'ar' };
  if (g.document && g.fetch && /^https?:$/.test(location.protocol) && !read(KEY) && !read('vb.geo') && !/[?&]hl=/.test(location.search) && !(g.navigator && navigator.webdriver)) {
    fetch('/cdn-cgi/trace').then(r => (r.ok ? r.text() : '')).then(tx => {
      const c = (tx.match(/\bloc=([A-Z]{2})/) || [])[1] || '';
      try { localStorage.setItem('vb.geo', c || '-'); } catch (e) { return; }
      const l = GEO[c];
      if (l && l !== lang && SUPPORTED.includes(l) && !read(KEY)) set(l);
    }).catch(() => {});
  }
  /** @type {Record<string, Record<string, string>>} */
  const D = g.I18N_DICT = g.I18N_DICT || {};
  // t(chuỗi gốc, {biến}) – thiếu bản dịch thì dùng tiếng Anh, rồi mới tới chuỗi gốc
  function t(src, vars) {
    let s = lang === 'vi' ? src : ((D[lang] && D[lang][src]) || (D.en && D.en[src]) || src);
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    return s;
  }
  // Dịch các phần tử tĩnh trong HTML: <span data-i18n>Ôn tập</span>, data-i18n-title, data-i18n-placeholder
  function apply(root) {
    if (lang === 'vi' || !g.document) return;
    (root || document).querySelectorAll('[data-i18n]').forEach(el => { const k = el.getAttribute('data-i18n') || el.textContent.trim(); el.textContent = t(k); });
    (root || document).querySelectorAll('[data-i18n-title]').forEach(el => { el.title = t(el.getAttribute('data-i18n-title')); });
    (root || document).querySelectorAll('[data-i18n-placeholder]').forEach(el => { el.placeholder = t(el.getAttribute('data-i18n-placeholder')); });
    (root || document).querySelectorAll('[data-i18n-aria-label]').forEach(el => { el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria-label'))); });
  }
  function set(l) { if (!SUPPORTED.includes(l)) return; try { localStorage.setItem(KEY, l); } catch (e) { /* bỏ qua */ } location.reload(); }
  // Ngôn ngữ dùng để hiển thị nghĩa/giải thích (người học có thể chọn khác giao diện)
  const learnLang = () => { const l = read('vb.learnLang'); return l && SUPPORTED.includes(l) ? l : lang; };
  // Ngôn ngữ của NGHĨA TỪ: 'vi' (nghĩa tiếng Việt) hoặc 'en' (định nghĩa tiếng Anh, kiểu từ điển Oxford Learner's).
  // Mặc định: trình duyệt có tiếng Việt → 'vi', còn lại → 'en'. Người học đổi được trong Cài đặt.
  const meanLang = () => { const m = read('vb.meanLang'); if (m === 'vi' || m === 'en') return m; return lang === 'vi' ? 'vi' : 'en'; }; // mặc định theo ngôn ngữ giao diện – không lẫn tiếng (người dùng tự chọn khác trong Cài đặt)
  const FLAG = { vi: '🇻🇳', en: '🇬🇧', es: '🇪🇸', pt: '🇧🇷', fr: '🇫🇷', de: '🇩🇪', id: '🇮🇩', th: '🇹🇭', zh: '🇨🇳', 'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼', ja: '🇯🇵', ko: '🇰🇷', hi: '🇮🇳', ar: '🇸🇦', ru: '🇷🇺', tr: '🇹🇷' };
  const flag = l => FLAG[l] || FLAG[String(l || '').split('-')[0]] || '🌐';
  g.t = t;
  g.I18N = { t, apply, set, whenReady: () => Promise.resolve(), tk: (k, v) => ({ k, v }), // tk: khóa + biến để lưu (dịch lúc vẽ bằng t(k, v)), không lưu chữ đã dịch
     lang: () => lang, learnLang, meanLang, setMean: m => { try { localStorage.setItem('vb.meanLang', m); } catch (e) { /* bỏ qua */ } location.reload(); }, LANGS, SUPPORTED, rtl: RTL.has(lang), detect, FLAG, flag };
  if (g.document) {
    document.documentElement.lang = lang;
    if (RTL.has(lang)) document.documentElement.dir = 'rtl';
    // Nạp file ngôn ngữ trước khi các module khác chạy (dùng createElement thay vì document.write để tối ưu Lighthouse)
    if (lang !== 'vi' && g.document) {
      const addScript = src => new Promise(r => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = () => { if (g.I18N.apply) g.I18N.apply(); if (g.I18N.meta) g.I18N.meta(); r(); }; s.onerror = () => r(); document.head.appendChild(s); });
      const loaded = Promise.all([addScript('js/i18n/en.js'), lang !== 'en' && addScript(`js/i18n/${lang}.js`)]);
      // Từ điển nạp bất đồng bộ, có thể SAU các module & DOMContentLoaded → app chờ whenReady() trước lần vẽ đầu (tối đa 6 s),
      // để không chữ nào bị vẽ/đóng băng bằng khóa tiếng Việt
      g.I18N.whenReady = () => (D.en && (lang === 'en' || D[lang]) ? Promise.resolve() : Promise.race([loaded, new Promise(r => setTimeout(r, 6000))]));
    }
    // Tiêu đề & mô tả trang theo ngôn ngữ (Google đọc được tiêu đề do JS đặt) – khóa dịch nằm trong từ điển giao diện
    const TITLE = 'Lexkite – Học từ vựng IELTS & TOEIC miễn phí: flashcard FSRS, từ điển, thi thử';
    const DESC = 'Học từ vựng IELTS, TOEIC & TOEFL miễn phí: flashcard FSRS, từ điển song ngữ có phát âm, luyện 4 kỹ năng và thi thử có giải thích chi tiết.';
    const boot = () => {
      apply();
      // Trang ?hl=xx là phiên bản riêng của ngôn ngữ đó (không phải bản trùng của trang gốc)
      try { if (new URLSearchParams(location.search).get('hl') === lang) { const c = /** @type {HTMLLinkElement|null} */ (document.querySelector('link[rel="canonical"]')); if (c) c.href = c.href.split('?')[0] + '?hl=' + lang; } } catch (e) { /* bỏ qua */ }
      meta();
    };
    // Gọi lại khi file từ điển nạp xong (script nạp động không chặn DOMContentLoaded)
    const meta = g.I18N.meta = () => { if (lang === 'vi') return; document.title = t(TITLE); const m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute('content', t(DESC)); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); // i18n.js có thể nạp sau DOMContentLoaded
  }
})(typeof self !== 'undefined' ? self : this);
