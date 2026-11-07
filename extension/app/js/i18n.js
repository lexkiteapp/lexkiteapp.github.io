/* i18n: khóa = câu tiếng Việt trong mã, t('Ôn tập') → "Review"; gói 13 ngôn ngữ dùng khóa băm (docs/I18N-PIPELINE.md §1b).
 * Ngôn ngữ: đã lưu → trình duyệt → English. learnLang (nghĩa/giải thích) mặc định theo giao diện. */
(function (g) {
  if (g.document) g.document.addEventListener('DOMContentLoaded', () => { g.__lkReady = 1; });
  const LANGS = {
    en: ['English', 'English'], vi: ['Vietnamese', 'Tiếng Việt'], es: ['Spanish', 'Español'], pt: ['Portuguese', 'Português'], fr: ['French', 'Français'],
    de: ['German', 'Deutsch'], id: ['Indonesian', 'Bahasa Indonesia'], th: ['Thai', 'ไทย'], zh: ['Chinese (Simplified)', '简体中文'], ja: ['Japanese', '日本語'],
    ko: ['Korean', '한국어'], hi: ['Hindi', 'हिन्दी'], ar: ['Arabic', 'العربية'], ru: ['Russian', 'Русский'], tr: ['Turkish', 'Türkçe'],
  };
  const RTL = new Set(['ar']);
  // Ngôn ngữ có bản dịch đủ; khác → English cho cả giao diện lẫn nội dung. Thêm ngôn ngữ: docs/I18N-PIPELINE.md §5.
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
  // Chỉ 1 lần; khác ngôn ngữ đang hiện → lưu & tải lại. Lựa chọn của người dùng luôn ưu tiên.
  const GEO = { VN: 'vi', JP: 'ja', KR: 'ko', CN: 'zh', TW: 'zh', HK: 'zh', MO: 'zh', TH: 'th', ID: 'id', BR: 'pt', PT: 'pt', AO: 'pt', MZ: 'pt', ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es', HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es', UY: 'es', FR: 'fr', SN: 'fr', CI: 'fr', CM: 'fr', ML: 'fr', DE: 'de', AT: 'de', RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru', TR: 'tr', SA: 'ar', AE: 'ar', EG: 'ar', IQ: 'ar', MA: 'ar', DZ: 'ar', JO: 'ar', KW: 'ar', QA: 'ar', OM: 'ar', LB: 'ar', TN: 'ar', LY: 'ar', YE: 'ar', BH: 'ar', SY: 'ar', SD: 'ar' };
  if (g.document && g.fetch && /^https?:$/.test(location.protocol) && !read(KEY) && !read('vb.geo') && !/[?&]hl=/.test(location.search) && !(g.navigator && navigator.webdriver)) {
    fetch('/cdn-cgi/trace').then(r => (r.ok ? r.text() : '')).then(tx => {
      const c = (tx.match(/\bloc=([A-Z]{2})/) || [])[1] || '';
      try { localStorage.setItem('vb.geo', c || '-'); } catch (e) { return; }
      const l = GEO[c];
      if (l && l !== lang && SUPPORTED.includes(l) && !read(KEY)) set(l, 1);
    }).catch(() => {});
  }
  /** @type {Record<string, Record<string, string>>} */
  const D = g.I18N_DICT = g.I18N_DICT || {};
  // khóa băm "_"+FNV-1a(câu): scripts/lib/i18n-pack.mjs
  const HK = {};
  function tr(l, s) {
    const d = D[l], v = d && d[s]; if (v !== undefined || !d || l === 'en' || typeof s !== 'string' || (D.en && D.en[s] == null)) return v;
    let h = HK[s]; if (!h) { let x = 0x811c9dc5; for (let i = 0; i < s.length; i++) x = Math.imul(x ^ s.charCodeAt(i), 0x01000193); h = HK[s] = '_' + ((x >>> 0) % 1679616).toString(36); }
    return d[h];
  }
  // t(chuỗi gốc, {biến}) – thiếu bản dịch thì dùng tiếng Anh, rồi mới tới chuỗi gốc
  function t(src, vars) {
    let s = lang === 'vi' ? src : (tr(lang, src) || (D.en && D.en[src]) || src);
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
    if (RTL.has(lang) && typeof s === 'string') s = s.replace(/ →$/, ' ←').replace(/^← /, '→ '); // mũi tên "tiếp/quay lại" quay theo chiều đọc RTL
    return s;
  }
  // Dịch các phần tử tĩnh trong HTML: <span data-i18n>Ôn tập</span>, data-i18n-title, data-i18n-placeholder
  function apply(root) {
    if (lang === 'vi' || !g.document) return;
    // MỘT lượt quét DOM (trước: 4 lượt) và chỉ ghi khi chữ đổi (ghi lại đúng chữ cũ vẫn kích hoạt MutationObserver/vẽ lại)
    (root || document).querySelectorAll('[data-i18n],[data-i18n-title],[data-i18n-placeholder],[data-i18n-aria-label]').forEach(el => {
      let k = el.getAttribute('data-i18n'), v;
      if (k !== null) { v = t(k || el.textContent.trim()); if (el.textContent !== v) el.textContent = v; }
      k = el.getAttribute('data-i18n-title'); if (k !== null && el.title !== (v = t(k))) el.title = v;
      k = el.getAttribute('data-i18n-placeholder'); if (k !== null && el.placeholder !== (v = t(k))) el.placeholder = v;
      k = el.getAttribute('data-i18n-aria-label'); if (k !== null) el.setAttribute('aria-label', t(k));
    });
  }
  // Lưu rồi tải lại, bỏ ?hl (ưu tiên hơn lựa chọn đã lưu → đổi ngược)
  // auto = đoán theo nước (không phải người dùng chọn) → không ghi cookie lk_lang mà "/" đọc (functions/api/_rootlang.js)
  function set(l, auto) { if (!SUPPORTED.includes(l)) return; try { localStorage.setItem(KEY, l); if (auto !== 1) document.cookie = 'lk_lang=' + l + ';path=/;max-age=31536000;samesite=lax;secure'; } catch (e) { /* bỏ qua */ } const u = new URL(location.href); if (u.searchParams.has('hl')) { u.searchParams.delete('hl'); location.replace(u.href); } else location.reload(); }
  // Ngôn ngữ dùng để hiển thị nghĩa/giải thích (người học có thể chọn khác giao diện)
  const learnLang = () => { const l = read('vb.learnLang'); return l && SUPPORTED.includes(l) ? l : lang; };
  // Ngôn ngữ của NGHĨA TỪ: 'vi' (nghĩa tiếng Việt) hoặc 'en' (định nghĩa tiếng Anh, kiểu từ điển Oxford Learner's).
  // Mặc định: trình duyệt có tiếng Việt → 'vi', còn lại → 'en'. Người học đổi được trong Cài đặt.
  const meanLang = () => { const m = read('vb.meanLang'); if (m === 'vi' || m === 'en') return m; return lang === 'vi' ? 'vi' : 'en'; }; // mặc định theo ngôn ngữ giao diện – không lẫn tiếng (người dùng tự chọn khác trong Cài đặt)
  const FLAG = { vi: '🇻🇳', en: '🇬🇧', es: '🇪🇸', pt: '🇧🇷', fr: '🇫🇷', de: '🇩🇪', id: '🇮🇩', th: '🇹🇭', zh: '🇨🇳', 'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼', ja: '🇯🇵', ko: '🇰🇷', hi: '🇮🇳', ar: '🇸🇦', ru: '🇷🇺', tr: '🇹🇷' };
  const flag = l => FLAG[l] || FLAG[String(l || '').split('-')[0]] || '🌐';
  g.t = t;
  g.I18N = { t, apply, set, tr, has: (l, k) => l === 'vi' || tr(l, k) !== undefined, whenReady: () => Promise.resolve(), tk: (k, v) => ({ k, v }), // tk: khóa + biến để lưu (dịch lúc vẽ bằng t(k, v)), không lưu chữ đã dịch
     lang: () => lang, learnLang, meanLang, setMean: m => { try { localStorage.setItem('vb.meanLang', m); } catch (e) { /* bỏ qua */ } location.reload(); }, LANGS, SUPPORTED, rtl: RTL.has(lang), detect, FLAG, flag };
  if (g.document) {
    document.documentElement.lang = lang;
    if (RTL.has(lang)) document.documentElement.dir = 'rtl';
    // Nạp file ngôn ngữ trước khi các module khác chạy (dùng createElement thay vì document.write để tối ưu Lighthouse)
    let coreDone = false;   // file ngôn ngữ đã về (boot() dưới đây chỉ dịch khi đã về – trước đó apply() chạy vô ích: từ điển chưa có → ghi lại đúng chữ cũ)
    if (lang !== 'vi' && g.document) {
      const addScript = src => new Promise(r => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = () => r(); s.onerror = () => r(); document.head.appendChild(s); });
      const loaded = Promise.all([addScript('js/i18n/en.js'), lang !== 'en' && addScript(`js/i18n/${lang}.js`)]).then(() => { coreDone = true; if (g.I18N.apply) g.I18N.apply(); if (g.I18N.meta) g.I18N.meta(); });   // dịch MỘT lần khi đủ en + ngôn ngữ (trước: mỗi file một lần + boot → 3 lượt quét DOM ~77 ms CPU 4×, và nháy tiếng Anh trước khi sang ngôn ngữ đích)
      // Từ điển nạp bất đồng bộ, có thể SAU các module & DOMContentLoaded → app chờ whenReady() trước lần vẽ đầu (tối đa 6 s),
      // để không chữ nào bị vẽ/đóng băng bằng khóa tiếng Việt
      g.I18N.whenReady = () => (coreDone ? Promise.resolve() : Promise.race([loaded, new Promise(r => setTimeout(r, 6000))]));
    }
    // Tiêu đề & mô tả trang theo ngôn ngữ (Google đọc được tiêu đề do JS đặt) – khóa dịch nằm trong từ điển giao diện
    const TITLE = 'Lexkite – Học từ vựng IELTS & TOEIC miễn phí: flashcard FSRS, từ điển, thi thử';
    const DESC = 'Học từ vựng IELTS, TOEIC & TOEFL miễn phí: flashcard FSRS, từ điển song ngữ có phát âm, luyện 4 kỹ năng và thi thử có giải thích chi tiết.';
    const boot = () => {
      if (coreDone || D.en) apply();   // từ điển đã có (nạp trước/đồng bộ) → dịch ngay; chưa có → chờ lượt dịch sau khi file về
      // Trang ?hl=xx là phiên bản riêng của ngôn ngữ đó (không phải bản trùng của trang gốc)
      try { if (new URLSearchParams(location.search).get('hl') === lang) { const c = /** @type {HTMLLinkElement|null} */ (document.querySelector('link[rel="canonical"]')); if (c) c.href = c.href.split('?')[0] + '?hl=' + lang; } } catch (e) { /* bỏ qua */ }
      if (coreDone || D.en) meta();
    };
    // Gọi lại khi file từ điển nạp xong (script nạp động không chặn DOMContentLoaded)
    const meta = g.I18N.meta = () => { if (lang === 'vi') return; document.title = t(TITLE); const m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute('content', t(DESC)); };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot(); // i18n.js có thể nạp sau DOMContentLoaded
  }
})(typeof self !== 'undefined' ? self : this);
