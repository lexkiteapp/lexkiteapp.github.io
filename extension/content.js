/* Content script: bấm đúp vào từ (hoặc bôi đen + Alt) để tra nhanh, lưu vào flashcard kèm câu ngữ cảnh. */
(() => {
  // Cầu nối đồng bộ: trên trang Lexkite (đã đăng nhập Google) web app đọc/ghi dữ liệu add-on để gộp chung theo tài khoản
  if (window.top === window && /^(www\.)?lexkite\.com$|^lexkite\.pages\.dev$/.test(location.hostname)) { // chỉ tên miền đang sở hữu – tên miền cũ *.web.app có thể rơi vào tay người khác
    const KEYS = ['cards', 'stats', 'deleted'];
    window.addEventListener('message', async e => {
      if (e.source !== window || e.origin !== location.origin || !e.data || e.data.lkBridge !== 'req') return;
      try { if (!chrome.runtime.id) return; } catch (x) { return; } // bản add-on cũ đã bị thay thế
      try {
        if (e.data.op === 'get') { const data = await chrome.storage.local.get(KEYS); window.postMessage({ lkBridge: 'res', id: e.data.id, data }, location.origin); }
        else if (e.data.op === 'diag') { const { errLog } = await chrome.storage.local.get('errLog'); window.postMessage({ lkBridge: 'res', id: e.data.id, data: { v: chrome.runtime.getManifest().version, errLog: errLog || [] } }, location.origin); }
        else if (e.data.op === 'lang') { const l = (e.data.data || {}).lang; if (pickLang(l)) await chrome.storage.local.set({ uiLang: pickLang(l) }); window.postMessage({ lkBridge: 'res', id: e.data.id, ok: true }, location.origin); }
        else if (e.data.op === 'linked') { const d = e.data.data || {}; await chrome.storage.local.set({ linked: { email: String(d.email || '').slice(0, 120), name: String(d.name || '').slice(0, 80), at: Date.now() } }); window.postMessage({ lkBridge: 'res', id: e.data.id, data: { ok: true } }, location.origin); }
        else if (e.data.op === 'aiKeyGet') { const { aiKey } = await chrome.storage.local.get('aiKey'); window.postMessage({ lkBridge: 'res', id: e.data.id, data: { aiKey: aiKey || '' } }, location.origin); }
        else if (e.data.op === 'aiKeySet') { const k = String((e.data.data || {}).aiKey || ''); if (!k || /^(AIza[\w-]{20,}|AQ\.[\w.-]{20,})$/.test(k)) await chrome.storage.local.set({ aiKey: k }); window.postMessage({ lkBridge: 'res', id: e.data.id, data: { ok: true } }, location.origin); }
        else if (e.data.op === 'set') { const d = e.data.data || {}; const put = {}; KEYS.forEach(k => { if (d[k]) put[k] = d[k]; }); await chrome.storage.local.set(put); window.postMessage({ lkBridge: 'res', id: e.data.id, ok: true }, location.origin); }
      } catch (err) { window.postMessage({ lkBridge: 'res', id: e.data.id, error: String(err) }, location.origin); }
    });
    window.postMessage({ lkBridge: 'hello', version: chrome.runtime.getManifest().version }, location.origin);
  }
  // Bản content script cũ (trước khi add-on được cập nhật/tải lại) tự tắt khi bản mới chạy
  document.dispatchEvent(new CustomEvent('ielts-lexi-takeover'));
  // Lỗi của chính content script (thế giới riêng của add-on) → ghi vào nhật ký lỗi để chẩn đoán
  const report = (where, e) => { try { if (chrome.runtime.id) chrome.runtime.sendMessage({ type: 'logErr', where, m: String((e && (e.stack || e.message)) || e).slice(0, 600) + ' @' + location.hostname }).catch(() => {}); } catch (x) { /* bản cũ */ } };
  window.addEventListener('error', e => { if (e.filename && e.filename.startsWith('chrome-extension://')) report('cs', e.error || e.message); });
  window.addEventListener('unhandledrejection', e => report('cs-promise', e.reason));
  // Ngôn ngữ giao diện: chỉ en / vi như web app, ngôn ngữ khác → English. Nội dung học (nghĩa Việt, câu dịch) giữ nguyên
  // Ngôn ngữ giao diện: theo lựa chọn trên web Lexkite (đồng bộ qua cầu nối), mặc định theo ngôn ngữ Chrome
  const XLANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
  const pickLang = l => { l = String(l || '').toLowerCase().split('-')[0]; return XLANGS.includes(l) ? l : null; };
  let UI_LANG = pickLang(chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : navigator.language) || 'en', XD = {};
  const setLang = l => { if (!l) return; UI_LANG = l; XD = {}; if (l !== 'vi' && l !== 'en') chrome.runtime.sendMessage({ type: 'uiDict', lang: l }).then(r => { if (UI_LANG === l) XD = (r && r.dict) || {}; }).catch(() => {}); };
  try { chrome.storage.local.get('uiLang').then(r => setLang(pickLang(r.uiLang) || UI_LANG)).catch(() => {}); chrome.storage.onChanged.addListener(ch => { if (ch.uiLang) setLang(pickLang(ch.uiLang.newValue)); }); } catch (x) { /* bản cũ */ }
  const ML = () => { if (UI_LANG === 'vi') return 'vi'; if (UI_LANG !== 'en') return UI_LANG === 'zh' ? 'zh-CN' : UI_LANG; const l = (navigator.language || 'en').toLowerCase(); return l.startsWith('vi') ? 'en' : l.startsWith('zh') ? (/tw|hk|hant/.test(l) ? 'zh-TW' : 'zh-CN') : l.split('-')[0]; };
  const FLAG = l => ({ vi: '🇻🇳', en: '🇬🇧', es: '🇪🇸', pt: '🇧🇷', fr: '🇫🇷', de: '🇩🇪', id: '🇮🇩', th: '🇹🇭', zh: '🇨🇳', 'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼', ja: '🇯🇵', ko: '🇰🇷', hi: '🇮🇳', ar: '🇸🇦', ru: '🇷🇺', tr: '🇹🇷' })[l] || '🌐';
  const EN = {
    'Dịch với Lexkite': 'Translate with Lexkite', 'Nghe câu ví dụ': 'Play example', 'Quay lại từ trước': 'Back to previous word', 'Quay lại': 'Back',
    'Anh–Mỹ': 'US English', 'Nghe giọng Anh–Anh (phím P)': 'British pronunciation (P key)', 'Nghe giọng Anh–Mỹ': 'American pronunciation', 'Nghe chậm': 'Play slowly',
    '📌 Ngữ cảnh sẽ lưu': '📌 Context to save', '📌 Ngữ cảnh': '📌 Context', 'Nghe cả câu': 'Play sentence', '⏳ Đang dịch câu…': '⏳ Translating sentence…',
    '✓ Đã lưu vào flashcard': '✓ Saved to flashcards', '+ Thêm ngữ cảnh': '+ Add context', '✓ Đã lưu': '✓ Saved', '✓ Đã trong sổ thẻ': '✓ In your deck', '⌨️ A câu trước · S lặp câu · D câu sau': '⌨️ A previous line · S repeat line · D next line', 'Học bài: {n} →': 'Lesson: {n} →', 'Từ học thuật – bấm để tra': 'Academic word – click to look up', '+ Lưu flashcard': '+ Save flashcard',
    'Chi tiết': 'Details', 'Đóng (Esc)': 'Close (Esc)', '⚠️ Thử lưu lại': '⚠️ Retry saving', 'tên riêng': 'proper noun', 'cụm từ': 'phrase', 'từ': 'word',
    '🔊 Nghe': '🔊 Listen', 'Tra từng từ:': 'Look up each word:', 'Tên riêng (địa danh, người, tổ chức…) – không có trong từ điển phổ thông.': 'Proper noun (place, person, organization…) – not in the general dictionary.',
    'Chưa có trong từ điển – đã dịch tự động.': 'Not in the dictionary yet – machine-translated.', '+ Lưu cụm từ': '+ Save phrase', '+ Lưu từ': '+ Save word',
    'Add-on vừa được cập nhật – hãy tải lại trang.': 'The add-on was just updated – please reload the page.', '⏳ Đang dịch…': '⏳ Translating…',
    '🌐 Dịch đoạn đã chọn': '🌐 Translate selection', 'Anh → Việt': 'English → Vietnamese', 'Không dịch được đoạn này.': 'Could not translate this text.',
    '🧩 Cấu trúc trong đoạn': '🧩 Structures in this text', '📐 Học bài ngữ pháp này →': '📐 Learn this grammar lesson →', '🐢 Chậm': '🐢 Slow',
    'Giải thích nghĩa trong ngữ cảnh, cấu trúc, collocation, ví dụ': 'Explain meaning in context, structure, collocations, examples', '🤖 Giải thích sâu': '🤖 Deep explanation',
    '⏳ AI đang phân tích…': '⏳ AI is analyzing…',
    'Chưa bật AI. Mở Lexkite → Cài đặt → “Chấm bài bằng AI” để thêm khóa Gemini miễn phí của bạn.': 'AI is not enabled. Open Lexkite → Settings → “AI grading” to add your free Gemini key.',
    'Khóa AI tạm hết lượt miễn phí – thử lại sau ít phút.': 'Your AI key is out of free quota for now – try again in a few minutes.',
    'Khóa AI không hợp lệ – kiểm tra lại trong Cài đặt.': 'Invalid AI key – check it in Settings.', 'Không phân tích được lúc này.': 'Could not analyze right now.',
    '⚙️ Mở Cài đặt': '⚙️ Open Settings', 'Nghĩa trong ngữ cảnh:': 'Meaning in context:', 'Ngữ pháp:': 'Grammar:', 'Cụm hay đi kèm:': 'Common collocations:',
    '✓ Đã chép': '✓ Copied', 'Lexkite cấp {lv}': 'Lexkite level {lv}', 'mới': 'new', '📒 {n} từ bạn đã học xuất hiện trên trang này': '📒 {n} words you have learned appear on this page',
  };
  // Nghĩa chính: nếu nghĩa tóm tắt quá ngắn/trùng từ gốc thì lấy nghĩa đầu tiên của mục từ
  const viMain = (e, shown) => { const v = String(e.vi || '').trim(); if (v.length >= 3 && v.toLowerCase() !== String(e.word || '').toLowerCase()) return v; const f = (shown || []).find(x => x.vi && x.vi.length); return f ? f.vi.slice(0, 3).join(', ') : v; };
  const tx = (src, vars) => { let s = UI_LANG === 'vi' ? src : (XD[src] || EN[src] || src); if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); return s; };
  let dead = false;
  const alive = () => { try { return !dead && !!chrome.runtime.id; } catch (e) { return false; } };
  document.addEventListener('ielts-lexi-takeover', () => { dead = true; if (host) host.remove(); });

  let host = null, root = null, enabled = true, selectMode = 'icon', current = null, markOn = true, acadOn = true, prefs = {};
  const applySettings = st => { st = st || {}; prefs = st; enabled = st.dblclickOn !== false; selectMode = st.selectMode || 'icon'; markOn = st.markKnown !== false; acadOn = st.markAcademic !== false; };
  chrome.storage.local.get('settings').then(r => applySettings(r.settings));
  chrome.storage.onChanged.addListener(ch => { if (ch.settings) applySettings(ch.settings.newValue); });

  // Trusted Types: YouTube và một số trang bắt buộc dùng TrustedHTML cho innerHTML
  const ttPolicy = (() => { try { return window.trustedTypes && trustedTypes.createPolicy ? trustedTypes.createPolicy('vocaband#lexi', { createHTML: x => x }) : null; } catch (e) { return null; } })();
  const H = html => (ttPolicy ? ttPolicy.createHTML(html) : html);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const CSS = `
    :host { all: initial; }
    .box { position: fixed; z-index: 2147483647; width: 380px; max-width: calc(100vw - 16px); background: #fff; color: #1c1d2b;
      border: 1px solid #e3e5ef; border-radius: 16px; box-shadow: 0 16px 40px -8px rgba(15,61,62,.2), 0 0 1px rgba(0,0,0,.1); font: 14px/1.5 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      overflow: hidden; animation: pop .14s ease-out; }
    @keyframes pop { from { opacity: 0; transform: translateY(6px) scale(.98); } }
    .head { display: flex; gap: 12px; padding: 14px 14px 10px; }
    .pic { width: 64px; height: 64px; flex: none; border-radius: 12px; background: #f1f2f8; display: grid; place-items: center; font-size: 32px; overflow: hidden; }
    .pic img { width: 100%; height: 100%; object-fit: cover; }
    .pic.ltr { background: linear-gradient(135deg, #0F3D3E, #1F7A72); color: #fff; font: 800 30px/1 -apple-system, "Segoe UI", sans-serif; text-transform: lowercase; }
    .inDeck { background: #e8f5ec; color: #15803d; font-weight: 700; }
    .w { font-size: 20px; font-weight: 800; }
    .chip { display: inline-block; padding: 0 7px; margin-left: 4px; border-radius: 99px; background: #f1f2f8; color: #6b6f85; font-size: 11px; vertical-align: middle; }
    .lv { background: #fdece6; color: #CC3F1C; font-weight: 700; }
    .ipa { color: #6b6f85; font-family: "Lucida Sans Unicode", "Arial Unicode MS", sans-serif; }
    .spks { display: flex; gap: 6px; margin: 4px 0 2px; flex-wrap: wrap; }
    .spk { border: 0; background: #fdece6; color: #CC3F1C; border-radius: 999px; height: 26px; padding: 0 10px; cursor: pointer; font: 700 12px/26px -apple-system, "Segoe UI", sans-serif; vertical-align: middle; }
    .spk:hover { background: #CC3F1C; color: #fff; }
    .spk.mini { height: 22px; padding: 0 6px; line-height: 22px; font-size: 11px; }
    .sk { height: 11px; border-radius: 6px; margin: 7px 0; background: linear-gradient(90deg, #eef0f6 25%, #f8f9fc 50%, #eef0f6 75%); background-size: 200% 100%; animation: sh 1s infinite linear; }
    @keyframes sh { to { background-position: -200% 0; } }
    .vi { color: #0e8f8e; font-weight: 700; font-size: 15px; margin-top: 2px; }
    .body { padding: 0 14px 12px; max-height: 340px; overflow: auto; overflow-anchor: none; } /* không tự giữ vị trí cuộn khi nội dung nạp thêm → dòng đầu không bị đẩy khuất */
    .def { margin: 4px 0; }
    .ex { color: #6b6f85; font-style: italic; font-size: 13px; }
    .pg { margin: 8px 0; padding-left: 8px; border-left: 3px solid #e4e6f2; } .pg .chip { margin: 0 6px 0 0; } .pvi { font-weight: 600; }
    .pdef { margin: 3px 0 0; font-size: 13.5px; } .wn-x { margin: 8px 0 2px; padding: 7px 9px; border-radius: 10px; background: #fdf3ee; font-size: 12.5px; line-height: 1.5; } .wn-x div + div { margin-top: 3px; } .pex { display: block; color: #6b6f85; font-size: 13px; }
    .ctx { margin-top: 8px; padding: 8px 10px; background: #fff8e6; border-radius: 10px; font-size: 13px; }
    .ctx b { font-style: normal; }
    mark { background: #fde68a; color: inherit; border-radius: 3px; padding: 0 2px; }
    .foot { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid #eef0f6; background: #fafbfe; align-items: center; }
    .btn { border: 1px solid #e3e5ef; background: #fff; border-radius: 10px; padding: 7px 12px; font: 600 13px/1 inherit; font-family: inherit; cursor: pointer; color: #1c1d2b; }
    .btn.p { background: #CC3F1C; border-color: #CC3F1C; color: #fff; }
    .btn[disabled] { opacity: .6; cursor: default; }
    .lw { cursor: pointer; border-radius: 3px; }
    .lw:hover { background: #fdece6; color: #CC3F1C; }
    .lw.hlw { background: #fde68a; font-weight: 700; }
    .lw.chipw { display: inline-block; padding: 1px 8px; margin: 2px; border-radius: 999px; background: #f1f2f8; font-weight: 600; }
    .chipw { display: inline-block; padding: 1px 8px; margin: 2px; border-radius: 999px; background: #f1f2f8; font-weight: 600; font-size: 12px; }
    .st { margin-top: 10px; padding: 9px 10px; border-radius: 12px; background: #fdf6f2; border: 1px solid #f6d9cd; }
    .st.ai { background: #f0fdf4; border-color: #bbf7d0; }
    .st-i { padding: 6px 0; border-bottom: 1px dashed #f6d9cd; }
    .st-i:last-child { border-bottom: 0; }
    .st-n { font-weight: 800; color: #CC3F1C; }
    .st-m { color: #6b7280; font-style: italic; }
    .st-v { font-size: 12.5px; color: #374151; margin-top: 3px; line-height: 1.5; }
    .st-l { margin-top: 4px; border: 0; background: none; color: #CC3F1C; font-weight: 700; font-size: 12px; cursor: pointer; padding: 0; }
    .back { border: 0; background: #f1f2f8; border-radius: 8px; width: 26px; height: 26px; margin-right: 6px; cursor: pointer; font-weight: 800; vertical-align: middle; }
    .back:hover { background: #CC3F1C; color: #fff; }
    .x { margin-left: auto; border: 0; background: none; font-size: 18px; cursor: pointer; color: #6b6f85; }
    .muted { color: #6b6f85; padding: 18px 14px; }
    .fab { position: fixed; z-index: 2147483647; width: 34px; height: 34px; border-radius: 50%; border: 0; cursor: pointer;
      background: linear-gradient(135deg, #CC3F1C, #0ea5a4); color: #fff; font-size: 16px; display: grid; place-items: center;
      box-shadow: 0 6px 18px rgba(79,70,229,.45); animation: pop .12s ease-out; }
    .fab:hover { transform: scale(1.08); }
    .fab[hidden], .box[hidden], .vbtoast[hidden] { display: none; }
    .vbtoast { position: fixed; right: 18px; bottom: 18px; z-index: 2147483647; background: #1c1d2b; color: #fff; padding: 10px 14px; border-radius: 12px; font: 600 13px/1.4 -apple-system, "Segoe UI", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,.25); animation: pop .2s ease-out; }
    .tr-head { display: flex; gap: 8px; align-items: center; padding: 12px 14px 8px; }
    .src { color: #6b6f85; font-size: 13px; margin-bottom: 10px; max-height: 120px; overflow: auto; border-left: 3px solid #e3e5ef; padding-left: 8px; }
    .tr { font-size: 15.5px; line-height: 1.55; color: inherit; font-weight: 500; }
    @media (prefers-color-scheme: dark) {
      .box { background: #1b1c26; color: #ecedf5; border-color: #2e3040; }
      .pg { border-color: #2e3040; } .wn-x { background: #24233a; } .pic, .spk, .chip { background: #242533; } .foot { background: #171821; border-color: #2e3040; }
      .btn { background: #242533; border-color: #2e3040; color: #ecedf5; } .ctx { background: #2b2618; }
      .vi { color: #2dd4bf; } .lv { background: #3a2620; color: #ff9b7a; }
    }`;

  function ensureHost() {
    const parent = document.fullscreenElement || document.documentElement;
    if (host && host.parentNode === parent) return;
    if (host) { parent.appendChild(host); return; }
    host = document.createElement('ielts-lexi-popup');
    root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = H(`<style>${CSS}</style><div class="box" hidden></div><button class="fab" hidden title="${tx('Dịch với Lexkite')}">🌐</button>`);
    parent.appendChild(host);
    root.addEventListener('mousedown', e => e.stopPropagation());
  }
  const box = () => root.querySelector('.box');
  let onHide = null;
  const hide = () => { if (root) box().hidden = true; current = null; hist = []; cur = null; if (onHide) { const f = onHide; onHide = null; f(); } };
  const hideFab = () => { if (root) root.querySelector('.fab').hidden = true; };

  function position(rect) {
    const b = box();
    const W = Math.min(380, Math.max(240, window.innerWidth - 16));
    let left = Math.min(Math.max(8, rect.left + rect.width / 2 - W / 2), window.innerWidth - W - 8);
    let top = rect.bottom + 10;
    b.style.left = left + 'px';
    b.style.top = top + 'px';
    requestAnimationFrame(() => {
      const h = b.offsetHeight;
      if (top + h > window.innerHeight - 8) b.style.top = Math.max(8, rect.top - h - 10) + 'px';
    });
  }

  // Lấy câu chứa từ được chọn → ngữ cảnh.
  // Đi qua từng text node thay vì textContent: bỏ phần tử ẩn, bỏ chú thích tiếng Việt chèn giữa câu
  // (Study4, sách điện tử…) và thêm khoảng trắng giữa các phần tử để chữ không bị dính ("salesdoanh số").
  const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉĩịọỏốồổỗộớờởỡợụủũứừửữựỳỷỹỵ]/i;
  const SKIP_TAG = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|RT|RP|SUP|BUTTON|SELECT|TEXTAREA|SVG)$/;
  // Có ranh giới khối (block, inline-block, flex…) giữa hai phần tử không? → cần chèn khoảng trắng
  const isInline = x => /^(inline|contents|)$/.test(getComputedStyle(x).display);
  function boundary(a, b) {
    if (!a || !b || a === b) return false;
    const up = (x, stop) => { for (; x && x !== stop && !x.contains(stop); x = x.parentElement) if (!isInline(x)) return true; return false; };
    return up(a, b) || up(b, a);
  }
  // Nhãn trang trí chèn trong đoạn (vd. "Opening statement", "Mở bài", "Band 7"): khối nhỏ có nền màu → coi là ranh giới câu
  const lum = c => { const m = String(c).match(/[\d.]+/g); if (!m) return 1; const [r, g2, b2, al] = m.map(Number); if (al === 0) return -1; return (0.299 * r + 0.587 * g2 + 0.114 * b2) / 255; };
  const labelOf = (el, stop) => {
    for (let x = el; x && x !== stop && x !== document.body; x = x.parentElement) {
      const t = (x.textContent || '').trim();
      if (t.length > 40 || /[.!?]$/.test(t)) return null;
      const cs = getComputedStyle(x), bg = lum(cs.backgroundColor);
      if (bg < 0) continue; // nền trong suốt → xét phần tử cha
      // Nhãn/huy hiệu: chữ sáng trên nền đậm (phần tô sáng thì ngược lại: chữ tối trên nền nhạt)
      if (bg < 0.62 && lum(cs.color) > 0.75) return x;
      if (/inline-block|inline-flex/.test(cs.display) && cs.userSelect === 'none') return x;
      return null;
    }
    return null;
  };
  // Chữ thường dính chữ hoa ở chỗ nối 2 phần tử ("statement"+"The") → chắc chắn là 2 từ
  const camelJoin = (out, t) => /[a-z]$/.test(out) && /^[A-Z]/.test(t);
  function visibleText(block, stopNode, stopOffset) {
    const hidden = new Map();
    const isHidden = el => {
      if (!el || el === block) return false;
      if (hidden.has(el)) return hidden.get(el);
      let h = SKIP_TAG.test(el.tagName) || el.id === 'vocaband-root' || el.hasAttribute('hidden') || el.getAttribute('aria-hidden') === 'true';
      if (!h) { const cs = getComputedStyle(el); h = cs.display === 'none' || cs.visibility === 'hidden' || (cs.position === 'absolute' && cs.opacity === '0'); }
      h = h || isHidden(el.parentElement);
      hidden.set(el, h); return h;
    };
    const startVi = stopNode && VI.test(stopNode.textContent || '');
    const tw = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    let out = '', offset = -1, prevEl = null, prevLab = null, n;
    while ((n = tw.nextNode())) {
      const el = n.parentElement;
      let t = n.nodeValue;
      if (n !== stopNode) {
        if (!t.trim() || isHidden(el)) { if (t && /\s/.test(t) && !isHidden(el)) out += ' '; continue; }
        if (!startVi && VI.test(t)) { out += ' '; prevEl = el; continue; } // chú thích tiếng Việt chèn trong câu tiếng Anh
      }
      // Ra/vào một nhãn trang trí → ngắt câu; chuyển phần tử mà 2 phía đều là chữ → thêm khoảng trắng khi cần
      const lab = labelOf(el, block);
      if (prevEl && el !== prevEl) {
        if (lab !== prevLab && (lab || prevLab)) out += '\n';
        else if (/\w$/.test(out) && /^\w/.test(t) && (boundary(prevEl, el) || camelJoin(out, t))) out += ' ';
      }
      if (n === stopNode) offset = out.length + stopOffset;
      out += t; prevEl = el; prevLab = lab;
    }
    return { text: out, offset };
  }
  // Chữ đã bôi đen nhưng bỏ chú thích tiếng Việt/phần ẩn chèn giữa câu tiếng Anh (trừ khi cả đoạn là tiếng Việt)
  function rangeText(range, selStr) {
    // Selection.toString() của Chrome tự xuống dòng giữa các khối; Range.toString() thì không
    const raw = (selStr != null ? selStr : range.toString()).replace(/\s+/g, ' ').trim();
    const multi = range.startContainer !== range.endContainer;
    if (!multi && !VI.test(raw)) return raw;
    if (!multi && !/[A-Za-z]{3,}\s+[A-Za-z]{3,}/.test(raw)) return raw;
    const root = range.commonAncestorContainer.nodeType === 1 ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const parts = []; let n, en = 0, vi = 0;
    while ((n = tw.nextNode())) {
      if (!range.intersectsNode(n)) continue;
      let t = n.nodeValue;
      if (n === range.endContainer) t = t.slice(0, range.endOffset);
      if (n === range.startContainer) t = t.slice(range.startOffset);
      if (!t.trim()) { parts.push({ t, v: false }); continue; }
      const cs = n.parentElement && getComputedStyle(n.parentElement);
      if (cs && (cs.display === 'none' || cs.visibility === 'hidden')) continue;
      const v = VI.test(t); v ? vi += t.length : en += t.length;
      parts.push({ t, v, el: n.parentElement });
    }
    if (vi > en) return raw; // đoạn chủ yếu tiếng Việt → giữ nguyên
    let out = '', prev = null;
    parts.forEach(p => { if (p.v) { out += ' '; return; } if (prev && p.el && p.el !== prev && /\w$/.test(out) && /^\w/.test(p.t) && (boundary(prev, p.el) || camelJoin(out, p.t) || labelOf(p.el) !== labelOf(prev))) out += ' '; out += p.t; if (p.el) prev = p.el; });
    return out.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
  }
  function sentenceAround(range) {
    try {
      let node = range.startContainer;
      let el = node.nodeType === 1 ? node : node.parentElement;
      const block = el.closest('p,li,td,th,dd,dt,blockquote,figcaption,caption,h1,h2,h3,h4,h5,h6,article,section,div') || el;
      let text, offset;
      if (node.nodeType === 3) ({ text, offset } = visibleText(block, node, range.startOffset));
      if (!text || offset < 0) {
        const pre = document.createRange(); pre.setStart(block, 0); pre.setEnd(range.startContainer, range.startOffset);
        offset = pre.toString().length; text = block.textContent;
      }
      let s = offset, e = offset;
      while (s > 0 && !/[.!?\n]/.test(text[s - 1])) s--;
      while (e < text.length && !/[.!?\n]/.test(text[e])) e++;
      let sent = text.slice(s, Math.min(text.length, e + 1)).replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').trim();
      if (sent.length > 320) {
        const local = offset - s;
        sent = '…' + sent.slice(Math.max(0, local - 150), local + 150).trim() + '…';
      }
      return sent.split(' ').length >= 3 ? sent : '';
    } catch (e) { return ''; }
  }

  function wordRegex(word) {
    const w = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const stem = w.length > 4 && !w.includes(' ') ? w.replace(/(e|y|s)$/, '') : w;
    return new RegExp(`\\b(${stem}[a-z]*)\\b`, 'gi');
  }

  // Chọn giọng tự nhiên nhất (Natural/Online → Google UK/US → Premium/Enhanced), bỏ giọng hiệu ứng
  function bestVoice(accent) {
    const want = prefs.voice && prefs.voice[accent];
    const vs = speechSynthesis.getVoices();
    if (want) { const v = vs.find(x => x.name === want); if (v) return v; }
    const score = v => {
      if (!v.lang.startsWith('en')) return -1;
      let s = v.lang.replace('_', '-') === accent ? 100 : 10;
      if (/Natural|Neural|Online/i.test(v.name)) s += 60;
      if (/^Google (UK|US) English/i.test(v.name)) s += 50;
      if (/Premium|Enhanced|Siri/i.test(v.name)) s += 45;
      if (/Daniel|Serena|Kate|Oliver|Samantha|Ava|Allison|Susan|Tom/i.test(v.name)) s += 20;
      if (/Fred|Albert|Bahh|Bells|Boing|Bubbles|Cellos|Wobble|Zarvox|Trinoids|Whisper|Junior|Ralph|Kathy|Jester|Organ|Superstar|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley/i.test(v.name)) s -= 200;
      return s;
    };
    return vs.map(v => [v, score(v)]).filter(x => x[1] > 0).sort((a, b) => b[1] - a[1]).map(x => x[0])[0] || null;
  }
  if (window.speechSynthesis) speechSynthesis.getVoices();
  // Phát âm phản hồi tức thì: audio thật được tải sẵn khi mở khung; chưa phát được sau 0,7s (mạng chậm/trang chặn) → đọc bằng giọng máy
  const audioCache = new Map();
  let playing = null;
  function preloadAudio(url) {
    if (!url || audioCache.has(url)) return;
    try { const a = new Audio(); a.preload = 'auto'; a.src = url; audioCache.set(url, a); } catch (e) { /* trang chặn media */ }
  }
  function speak(text, url, accent, rate) {
    const tts = () => {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      if (speechSynthesis.paused) speechSynthesis.resume(); // Chrome đôi khi kẹt ở trạng thái tạm dừng
      // đọc từng câu để giữ ngữ điệu tự nhiên; chờ 1 nhịp sau cancel() để Chrome không bỏ mất lượt đọc
      const go = () => setTimeout(() => (String(text).match(/[^.!?;]+[.!?;]*/g) || [text]).forEach(part => {
        const u = new SpeechSynthesisUtterance(part.trim()); u.lang = accent || 'en-GB'; u.rate = rate || prefs.ttsRate || .92;
        const v = bestVoice(u.lang); if (v) u.voice = v;
        speechSynthesis.speak(u);
      }), 30);
      // Lần đầu danh sách giọng chưa tải → chờ (tối đa 0,6 s) để lần đọc đầu cũng dùng đúng giọng tốt nhất như các lần sau
      if (speechSynthesis.getVoices().length) go();
      else { let done = false; const f = () => { if (!done) { done = true; go(); } }; speechSynthesis.addEventListener('voiceschanged', f, { once: true }); setTimeout(f, 600); }
    };
    if (playing) { try { playing.pause(); } catch (e) { /* bỏ qua */ } playing = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (!url) return tts();
    let a; try { a = audioCache.get(url) || new Audio(url); audioCache.set(url, a); } catch (e) { return tts(); }
    let started = false, gaveUp = false;
    const fb = setTimeout(() => { if (!started) { gaveUp = true; try { a.pause(); } catch (e) { /* bỏ qua */ } tts(); } }, 700);
    a.onplaying = () => { started = true; clearTimeout(fb); if (gaveUp) a.pause(); };
    try { a.currentTime = 0; } catch (e) { /* chưa tải xong */ }
    playing = a;
    const p = a.play(); if (p) p.catch(() => { clearTimeout(fb); if (!started && !gaveUp) { gaveUp = true; tts(); } });
  }

  // Tra lồng nhau: bấm vào từ trong ví dụ/định nghĩa để tra tiếp, có nút quay lại
  let hist = [], cur = null;
  const linkify = (text, hl) => String(text).split(/(\s+)/).map(tok => {
    const m = tok.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z'’-]*[A-Za-z]|[A-Za-z])([^A-Za-z]*)$/);
    if (!m) return esc(tok);
    const w = m[2].toLowerCase().replace(/’/g, "'");
    const isHl = hl && wordRegex(hl).test(m[2]);
    return `${esc(m[1])}<span class="lw${isHl ? ' hlw' : ''}" data-w="${esc(w)}">${esc(m[2])}</span>${esc(m[3])}`;
  }).join('');
  async function show(word, rect, context, meta, mode) {
    meta = meta || { source: location.href, title: document.title };
    if (mode === 'nested' && cur) hist.push(cur); else if (mode !== 'back') hist = [];
    cur = { word, rect, context, meta };
    if (mode !== 'back') try { chrome.runtime.sendMessage({ type: 'usage', ev: 'lookup' }).catch(() => {}); } catch (x) { /* add-on vừa cập nhật */ } // chỉ đếm số lần – không gửi từ/URL
    ensureHost();
    hideFab();
    const b = box();
    b.hidden = false;
    b.innerHTML = H(`<div class="head"><div class="pic">📘</div><div style="flex:1"><div class="w">${esc(word)}</div><div class="sk" style="width:60%"></div><div class="sk" style="width:40%"></div></div></div><div class="body"><div class="sk"></div><div class="sk" style="width:80%"></div></div>`);
    position(rect);
    current = word;
    const st = (await chrome.storage.local.get('settings')).settings || {};
    const accent = st.accent || 'en-GB';
    let e = null, saved = false, ctxVi = '', mlW = '', didSave = false, spoke = false, note = null;

    // Một giọng thống nhất cho lúc tự đọc và nút UK/US: dùng giọng máy tốt nhất; bản ghi âm tình nguyện viên (chất lượng không đều) chỉ dùng khi máy không có giọng đọc
    const audioFor = acc => !e || window.speechSynthesis ? '' : acc === 'en-US' ? (e.audioUS || e.audio) : (e.audio && !/-us\.mp3$/.test(e.audio) ? e.audio : '');
    const sayWord = (acc, rate) => speak(e ? e.word : word, rate ? '' : audioFor(acc), acc, rate);
    const paintCtx = () => { const el = b.querySelector('.ctxvi'); if (el && current === word) el.textContent = ctxVi ? FLAG(ML()) + ' ' + ctxVi : ''; };

    function render() {
      preloadAudio(audioFor('en-GB')); preloadAudio(audioFor('en-US'));
      // Gom theo từ loại như từ điển lớn: mỗi từ loại = nghĩa Việt + định nghĩa Anh + ví dụ của đúng nghĩa đó
      const POSV = { noun: 'danh từ', verb: 'động từ', adjective: 'tính từ', adverb: 'trạng từ', preposition: 'giới từ', conjunction: 'liên từ', pronoun: 'đại từ', interjection: 'thán từ', determiner: 'từ hạn định', abbreviation: 'viết tắt', phrase: 'cụm từ', 'phrasal verb': 'cụm động từ' };
      const toEn = x => { x = String(x || '').toLowerCase(); const hit = Object.keys(POSV).find(k => POSV[k] === x); return hit || x; };
      const groups = [], byPos = {};
      const grp = x => byPos[x] || (byPos[x] = groups[groups.push({ pos: x, vi: [], defs: [] }) - 1]);
      (e.senses || []).forEach(x => { grp(toEn(x.pos)).vi = x.terms.slice(0, 4); });
      (e.oxford && e.oxford.length ? e.oxford : e.meanings || []).forEach(m => { const g2 = grp(toEn(m.pos)); if (!g2.defs.length) g2.defs = (m.defs || []).filter(d => d.def).slice(0, 2); });
      if (e.def) {
        const p = toEn(e.pos || (groups[0] && groups[0].pos) || 'noun');
        const g2 = grp(p);
        const curDef = { def: e.def, ex: e.ex || '' };
        if (!g2.defs.length || g2.defs[0].def !== e.def) {
          const rest = g2.defs.filter(d => d.def !== e.def && !e.def.includes(d.def));
          g2.defs = [curDef, ...rest].slice(0, 2);
        }
      }
      const shown = groups.filter(x => x.vi.length || x.defs.length).slice(0, 3);
      const hasEx = shown.some(x => x.defs.some(d => d.ex));
      const defs = shown.map(x => `<div class="pg"><span class="chip">${esc(UI_LANG === 'vi' ? POSV[x.pos] || x.pos : x.pos)}</span>${x.vi.length && ML() === 'vi' ? `<span class="pvi">${esc(x.vi.join(', '))}</span>` : ''}${x.defs.map(d => `<div class="pdef">${linkify(d.def)}${d.ex ? `<span class="pex">“${linkify(d.ex, e.word)}” <button class="spk mini" data-text="${esc(d.ex)}" title="${tx('Nghe câu ví dụ')}">🔊</button></span>` : ''}</div>`).join('')}</div>`).join('');
      const ctxHtml = context ? linkify(context, word) : '';
      b.innerHTML = H(`
        <div class="head">
          ${e.image ? `<div class="pic"><img src="${esc(e.image)}" alt="" referrerpolicy="no-referrer"></div>` : e.emoji ? `<div class="pic">${esc(e.emoji)}</div>` : `<div class="pic ltr" aria-hidden="true">${esc((e.word || '?').charAt(0))}</div>`}
          <div style="min-width:0">
            <div>${hist.length ? `<button class="back" title="${tx('Quay lại từ trước')}">←</button>` : ''}<span class="w">${esc(e.word)}</span>${e.pos ? `<span class="chip">${esc(UI_LANG === 'vi' ? e.pos : toEn(e.pos))}</span>` : ''}${e.level ? `<span class="chip lv" title="CEFR">${esc(e.level)}</span>` : ''}${saved || didSave ? `<span class="chip inDeck">${tx('✓ Đã trong sổ thẻ')}</span>` : ''}</div>
            <div class="ipa">${esc(e.ipa || '')}${e.ipaUS && e.ipaUS !== e.ipa ? ` · <span title="${tx('Anh–Mỹ')}">${esc(e.ipaUS)}</span>` : ''}</div>
            <div class="spks"><button class="spk" data-acc="en-GB" title="${tx('Nghe giọng Anh–Anh (phím P)')}">🔊 UK</button><button class="spk" data-acc="en-US" title="${tx('Nghe giọng Anh–Mỹ')}">🔊 US</button><button class="spk" data-slow title="${tx('Nghe chậm')}">🐢</button></div>
            <div class="vi">${ML() === 'vi' ? esc(viMain(e, shown)) : esc(mlW)}</div>
          </div>
        </div>
        <div class="body">
          ${defs || (e.def ? `<div class="def">${linkify(e.def)}</div>` : '')}
          ${note && UI_LANG === 'vi' ? `<div class="wn-x"><div>💡 ${esc(note.m)}</div><div>⚠️ ${esc(note.e)}</div></div>` : ''}
          ${e.ex && !hasEx ? `<div class="ex">“${linkify(e.ex, e.word)}” <button class="spk mini" data-text="${esc(e.ex)}" title="${tx('Nghe câu ví dụ')}">🔊</button></div>` : ''}
          ${ctxHtml ? `<div class="ctx"><b>${tx('📌 Ngữ cảnh sẽ lưu')}</b> <button class="spk mini" data-text="${esc(context)}" title="${tx('Nghe cả câu')}">🔊</button><button class="spk mini" data-text="${esc(context)}" data-rate="0.65" title="${tx('Nghe chậm')}">🐢</button><br>${ctxHtml}<div class="ctxvi ex" style="margin-top:4px">${ctxVi ? FLAG(ML()) + ' ' + esc(ctxVi) : tx('⏳ Đang dịch câu…')}</div></div>` : ''}
          ${e.partial ? '<div class="sk" style="width:50%;margin-top:8px"></div>' : ''}
        </div>
        <div class="foot">
          <button class="btn p" id="save" ${didSave || (saved && !context) ? 'disabled' : ''}>${didSave ? tx('✓ Đã lưu vào flashcard') : saved ? (context ? tx('+ Thêm ngữ cảnh') : tx('✓ Đã lưu')) : tx('+ Lưu flashcard')}</button>
          <button class="btn" id="more">${tx('Chi tiết')}</button>
          <button class="x" id="close" title="${tx('Đóng (Esc)')}">×</button>
        </div>`);
      const img = b.querySelector('.pic img');
      if (img) img.onerror = () => { const p = img.parentElement; if (e.emoji) p.textContent = e.emoji; else { p.className = 'pic ltr'; p.textContent = (e.word || '?').charAt(0); } };
      b.querySelectorAll('.spk[data-acc]').forEach(x => x.onclick = () => sayWord(x.dataset.acc));
      b.querySelector('.spk[data-slow]').onclick = () => sayWord(accent, 0.55);
      b.querySelectorAll('.spk[data-text]').forEach(x => x.onclick = () => speak(x.dataset.text, '', accent, +(x.dataset.rate || 0.95)));
      b.querySelector('#close').onclick = hide;
      bindNav(b);
      b.querySelector('#more').onclick = () => chrome.runtime.sendMessage({ type: 'openApp', hash: '#/dict/' + encodeURIComponent(e.word) }).catch(() => {});
      b.querySelector('#save').onclick = async ev => {
        const btn = ev.currentTarget;
        btn.disabled = true;
        const { meanings, oxford, senses, found, audioUS, partial, ...entry } = e;
        try {
          const r = await chrome.runtime.sendMessage({ type: 'save', entry: { ...entry, audio: audioFor(accent) }, context: context ? { text: context, vi: ctxVi, source: meta.source, title: meta.title } : null });
          if (!r || r.error) throw new Error(r && r.error);
          didSave = true;
          btn.textContent = tx('✓ Đã lưu vào flashcard');
        } catch (err) { btn.disabled = false; btn.textContent = tx('⚠️ Thử lưu lại'); }
      };
      position(rect);
      if (!spoke && st.autoSpeak !== false) { spoke = true; sayWord(accent); }
    }

    // Cụm từ không có trong từ điển: dịch cả cụm, mỗi từ bấm vào tra riêng, vẫn lưu được thành flashcard
    async function renderPhrase(vi) {
      if (!vi) { try { vi = ((await chrome.runtime.sendMessage({ type: 'translate', text: word, tl: ML() })) || {}).vi || ''; } catch (x) { vi = ''; } }
      if (current !== word) return;
      const multi = /\s/.test(word);
      // Tên riêng: trong câu gốc viết hoa mà không đứng đầu câu (Switzerland, London…)
      const capW = word.replace(/\b[a-z]/g, c => c.toUpperCase());
      const toks = (context || '').split(/\s+/);
      const proper = !multi && toks.some((t, i) => i > 0 && t.replace(/[^A-Za-z'-]/g, '') === capW && !/[.!?:"“]$/.test(toks[i - 1]));
      const shown = proper ? capW : word;
      b.innerHTML = H(`
        <div class="head"><div class="pic">${proper ? '📍' : multi ? '💬' : '📘'}</div><div style="min-width:0">
          <div>${hist.length ? `<button class="back" title="${tx('Quay lại')}">←</button>` : ''}<span class="w">${esc(shown)}</span><span class="chip">${tx(proper ? 'tên riêng' : multi ? 'cụm từ' : 'từ')}</span></div>
          <div class="spks"><button class="spk" data-say="1">${tx('🔊 Nghe')}</button><button class="spk" data-slow>🐢</button></div>
          <div class="vi">${esc(vi || '—')}</div></div></div>
        <div class="body">
          ${multi ? `<div class="def"><b>${tx('Tra từng từ:')}</b> ${word.split(/\s+/).map(x => `<span class="lw chipw" data-w="${esc(x)}">${esc(x)}</span>`).join(' ')}</div>` : `<div class="def">${proper ? tx('Tên riêng (địa danh, người, tổ chức…) – không có trong từ điển phổ thông.') : tx('Chưa có trong từ điển – đã dịch tự động.')}</div>`}
          ${context ? `<div class="ctx"><b>${tx('📌 Ngữ cảnh')}</b> <button class="spk mini" data-text="${esc(context)}" title="${tx('Nghe cả câu')}">🔊</button><button class="spk mini" data-text="${esc(context)}" data-rate="0.65" title="${tx('Nghe chậm')}">🐢</button><br>${linkify(context, word)}<div class="ctxvi ex" style="margin-top:4px">${ctxVi ? FLAG(ML()) + ' ' + esc(ctxVi) : ''}</div></div>` : ''}
        </div>
        <div class="foot"><button class="btn p" id="save">${multi ? tx('+ Lưu cụm từ') : tx('+ Lưu từ')}</button><button class="x" id="close" title="${tx('Đóng (Esc)')}">×</button></div>`);
      b.querySelector('[data-say]').onclick = () => speak(word, '', accent);
      b.querySelector('[data-slow]').onclick = () => speak(word, '', accent, .55);
      b.querySelectorAll('.spk[data-text]').forEach(x => x.onclick = () => speak(x.dataset.text, '', accent, +(x.dataset.rate || 0.95)));
      b.querySelector('#close').onclick = hide;
      bindNav(b);
      b.querySelector('#save').onclick = async ev => {
        const btn = ev.currentTarget; btn.disabled = true;
        try {
          const r = await chrome.runtime.sendMessage({ type: 'save', entry: { word, vi, pos: multi ? 'phrase' : '', emoji: '💬' }, context: context ? { text: context, vi: ctxVi, source: meta.source, title: meta.title } : null });
          if (!r || r.error) throw new Error();
          btn.textContent = tx('✓ Đã lưu vào flashcard');
        } catch (x) { btn.disabled = false; btn.textContent = tx('⚠️ Thử lưu lại'); }
      };
      position(rect);
      if (st.autoSpeak !== false) speak(word, '', accent);
    }

    if (ML() !== 'vi' && ML() !== 'en') chrome.runtime.sendMessage({ type: 'translate', text: word, tl: ML() }).then(r => { mlW = (r && r.vi) || ''; const el = b.querySelector('.vi'); if (el && current === word && mlW.toLowerCase() !== word.toLowerCase()) el.textContent = mlW; }).catch(() => {});
    if (context && ML() !== 'en') chrome.runtime.sendMessage({ type: 'translate', text: context, tl: ML() }).then(r => { ctxVi = (r && r.vi) || ''; paintCtx(); }).catch(() => {});
    const full = chrome.runtime.sendMessage({ type: 'lookup', word });
    full.catch(() => {}); // tránh lỗi "Uncaught (in promise)" khi add-on vừa được cập nhật
    let q;
    try { q = await chrome.runtime.sendMessage({ type: 'quick', word }); }
    catch (err) { b.innerHTML = H(`<div class="muted">${tx('Add-on vừa được cập nhật – hãy tải lại trang.')}</div>`); return; }
    if (current !== word) return;
    chrome.runtime.sendMessage({ type: 'notes', word }).then(r => { note = r && r.note; if (note && e && current === word) render(); }).catch(() => {});
    if (q && q.entry && q.entry.found) { e = q.entry; saved = q.saved; render(); }
    full.then(r => {
      if (current !== word || !r) return;
      if (r.entry && r.entry.found) { e = r.entry; saved = r.saved || saved; render(); }
      else if (!e) renderPhrase(r.entry && r.entry.vi);
    }).catch(() => {});
  }

  function bindNav(b) {
    b.querySelectorAll('.lw').forEach(x => x.onclick = ev => {
      ev.stopPropagation();
      const w = x.dataset.w.replace(/^'+|'+$/g, '');
      if (!w || !cur || w === cur.word) return;
      const sentence = (x.closest('.ex, .ctx, .def, .pdef, .pg') || x).textContent.replace(/^📌 (Ngữ cảnh( sẽ lưu)?|Context( to save)?)/, '').replace(/[🇻🇳🇬🇧🇪🇸🇧🇷🇫🇷🇩🇪🇮🇩🇹🇭🇨🇳🇹🇼🇯🇵🇰🇷🇮🇳🇸🇦🇷🇺🇹🇷🌐].*$/su, '').replace(/[“”]/g, '').replace(/🔊/g, '').trim();
      show(w, cur.rect, sentence.split(' ').length >= 3 ? sentence : '', cur.meta, 'nested');
    });
    const back = b.querySelector('.back');
    if (back) back.onclick = ev => { ev.stopPropagation(); const p = hist.pop(); if (p) show(p.word, p.rect, p.context, p.meta, 'back'); };
  }

  // Từ nằm đúng dưới con trỏ (không tin vùng chọn của trình duyệt – nó có thể nối 2 phần tử thành "statementThe")
  function wordAtPoint(x, y) {
    let node, off;
    if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (!r) return null; node = r.startContainer; off = r.startOffset; }
    else if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (!p) return null; node = p.offsetNode; off = p.offset; }
    if (!node || node.nodeType !== 3) return null;
    const t = node.nodeValue, W = /[A-Za-z'’-]/;
    let a = off, b = off;
    if (a > 0 && !W.test(t[a] || '') && W.test(t[a - 1])) { a--; b--; }
    while (a > 0 && W.test(t[a - 1])) a--;
    while (b < t.length && W.test(t[b])) b++;
    let word = t.slice(a, b).replace(/^['’-]+|['’-]+$/g, '');
    if (!/^[A-Za-z][A-Za-z'’-]*$/.test(word) || word.length > 30) return null;
    a = t.indexOf(word, a); const range = document.createRange(); range.setStart(node, a); range.setEnd(node, a + word.length);
    return { word: word.toLowerCase().replace(/’/g, "'"), range, rect: range.getBoundingClientRect() };
  }
  function fromSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const text = rangeText(sel.getRangeAt(0), sel.toString());
    if (!text || text.length > 40 || !/^[A-Za-z][A-Za-z'\- ]*[A-Za-z]$/.test(text) || text.split(/\s+/).length > 3) return null;
    const range = sel.getRangeAt(0);
    return { word: text.toLowerCase(), rect: range.getBoundingClientRect(), context: sentenceAround(range) };
  }

  // ---------- Dịch câu / đoạn văn: bôi đen → nút 🌐 (hoặc tự dịch) ----------
  const isWordish = t => t.length <= 40 && /^[A-Za-z][A-Za-z'\- ]*[A-Za-z]$/.test(t) && t.split(/\s+/).length <= 3;
  const inEditable = el => el && el.closest && el.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');

  function selectionInfo() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const text = rangeText(sel.getRangeAt(0), sel.toString());
    if (!text || text.length > 3000 || !/[A-Za-z]{2}/.test(text)) return null;
    const range = sel.getRangeAt(0);
    return { text, range, rect: range.getBoundingClientRect() };
  }

  function showFab(info) {
    ensureHost();
    const f = root.querySelector('.fab');
    const rects = info.range.getClientRects();
    const last = rects[rects.length - 1] || info.rect;
    f.style.left = Math.min(window.innerWidth - 44, last.right + 6) + 'px';
    f.style.top = Math.min(window.innerHeight - 44, last.bottom + 6) + 'px';
    f.hidden = false;
    f.onclick = () => {
      f.hidden = true;
      if (isWordish(info.text)) show(info.text.toLowerCase(), info.rect, sentenceAround(info.range));
      else translateSelection(info);
    };
  }

  async function translateSelection(info) {
    ensureHost();
    hideFab();
    const b = box();
    b.hidden = false;
    current = info.text;
    b.innerHTML = H(`<div class="muted">${tx('⏳ Đang dịch…')}</div>`);
    position(info.rect);
    let r;
    try { r = await chrome.runtime.sendMessage({ type: 'translate', text: info.text, tl: ML() }); }
    catch (e) { b.innerHTML = H(`<div class="muted">${tx('Add-on vừa được cập nhật – hãy tải lại trang.')}</div>`); return; }
    if (current !== info.text) return;
    const vi = (r && r.vi) || '';
    const words = info.text.split(/\s+/).filter(x => /[A-Za-z]/.test(x)).map(x => x.replace(/^[^A-Za-z]+|[^A-Za-z'’-]+$/g, ''));
    const structs = (window.VBStruct ? VBStruct.analyze(info.text, 4) : []);
    if (structs.length && !GT) { try { GT = await (await fetch(chrome.runtime.getURL('grammar-titles.json'))).json(); } catch (e) { GT = {}; } }
    let sentence = ''; try { sentence = info.range ? sentenceAround(info.range) : ''; } catch (e) { /* bỏ qua */ }
    const st = (await chrome.storage.local.get('settings')).settings || {};
    const accent = st.accent || 'en-GB';
    b.innerHTML = H(`
      <div class="tr-head"><b>${tx('🌐 Dịch đoạn đã chọn')}</b><span class="chip">${ML() === 'vi' ? tx('Anh → Việt') : ML() === 'en' ? 'EN' : 'EN → ' + ML().toUpperCase()}</span><button class="x" id="close" title="${tx('Đóng (Esc)')}">×</button></div>
      <div class="body">
        <div class="src">${esc(info.text)}</div>
        ${ML() === 'en' ? '' : `<div class="tr">${vi ? esc(vi) : tx('Không dịch được đoạn này.')}</div>`}
        ${words.length > 1 && words.length <= 12 ? `<div class="def" style="margin-top:8px"><b>${tx('Tra từng từ:')}</b> ${words.map(x => `<span class="lw chipw" data-w="${esc(x.toLowerCase())}">${esc(x)}</span>`).join(' ')}</div>` : ''}
        ${structs.length ? `<div class="st"><b>${tx('🧩 Cấu trúc trong đoạn')}</b>${structs.map(x => `<div class="st-i"><div><span class="st-n">${esc(x.name)}</span> <span class="st-m">“${esc(x.match)}”</span></div>${UI_LANG === 'vi' ? `<div class="st-v">${esc(x.vi)}</div>` : ''}<button class="st-l" data-lesson="${esc(x.lesson)}">${GT && GT[x.lesson] ? '📖 ' + tx('Học bài: {n} →', { n: esc(UI_LANG === 'vi' ? GT[x.lesson][0] : GT[x.lesson][1]) }) : tx('📐 Học bài ngữ pháp này →')}</button></div>`).join('')}</div>` : ''}
        <div id="aiEx"></div>
      </div>
      <div class="foot">
        <button class="btn p" id="listen">${tx('🔊 Nghe')}</button>
        <button class="btn" id="slow">${tx('🐢 Chậm')}</button>
        <button class="btn" id="deep" title="${tx('Giải thích nghĩa trong ngữ cảnh, cấu trúc, collocation, ví dụ')}">${tx('🤖 Giải thích sâu')}</button>
        <button class="btn" id="copy">📋</button>
      </div>`);
    b.querySelectorAll('[data-lesson]').forEach(x => x.onclick = () => chrome.runtime.sendMessage({ type: 'openApp', hash: '#/grammar/' + x.dataset.lesson }).catch(() => {}));
    b.querySelectorAll('.lw[data-w]').forEach(x => x.onclick = ev => { ev.stopPropagation(); const w = x.dataset.w.replace(/[^a-z'-]/g, ''); if (w) show(w, info.rect, sentence || info.text, {}, 'nested'); });
    b.querySelector('#deep').onclick = async ev => {
      const btn = ev.currentTarget, out = b.querySelector('#aiEx'); btn.disabled = true;
      out.innerHTML = H(`<div class="muted" style="margin-top:8px">${tx('⏳ AI đang phân tích…')}</div>`);
      let r; try { r = await chrome.runtime.sendMessage({ type: 'explain', text: info.text, sentence, lang: ML() }); } catch (e) { r = { error: 'FAILED' }; }
      btn.disabled = false;
      if (!r || r.error) {
        const msg = tx({ NO_KEY: 'Chưa bật AI. Mở Lexkite → Cài đặt → “Chấm bài bằng AI” để thêm khóa Gemini miễn phí của bạn.', QUOTA: 'Khóa AI tạm hết lượt miễn phí – thử lại sau ít phút.', BAD_KEY: 'Khóa AI không hợp lệ – kiểm tra lại trong Cài đặt.' }[r && r.error] || 'Không phân tích được lúc này.');
        out.innerHTML = H(`<div class="def" style="margin-top:8px">${esc(msg)} ${r && (r.error === 'NO_KEY' || r.error === 'BAD_KEY') ? `<button class="st-l" id="openSet">${tx('⚙️ Mở Cài đặt')}</button>` : ''}</div>`);
        const os = out.querySelector('#openSet'); if (os) os.onclick = () => chrome.runtime.sendMessage({ type: 'openApp', hash: '#/settings' }).catch(() => {});
        return position(info.rect);
      }
      const x = r.result || {};
      out.innerHTML = H(`<div class="st ai">
        <b>${tx('🤖 Giải thích sâu')}</b>
        ${x.meaning ? `<div class="st-v"><b>${tx('Nghĩa trong ngữ cảnh:')}</b> ${esc(x.meaning)}</div>` : ''}
        ${(x.structure || []).map(y => `<div class="st-i"><span class="st-n">${esc(y.pattern)}</span><div class="st-v">${esc(y.explain)}</div></div>`).join('')}
        ${x.grammar ? `<div class="st-v"><b>${tx('Ngữ pháp:')}</b> ${esc(x.grammar)}</div>` : ''}
        ${(x.collocations || []).length ? `<div class="st-v"><b>${tx('Cụm hay đi kèm:')}</b> ${x.collocations.map(c => `<span class="chipw">${esc(c)}</span>`).join(' ')}</div>` : ''}
        ${(x.examples || []).map(e => `<div class="ex">“${esc(e.en)}” <button class="spk mini" data-text="${esc(e.en)}">🔊</button><div class="muted">${esc(e.vi)}</div></div>`).join('')}
        ${x.tip ? `<div class="st-v">💡 ${esc(x.tip)}</div>` : ''}</div>`);
      out.querySelectorAll('.spk[data-text]').forEach(z => z.onclick = () => speak(z.dataset.text, '', accent, .95));
      position(info.rect);
    };
    const say = rate => speak(info.text, '', accent, rate);
    b.querySelector('#close').onclick = () => { speechSynthesis.cancel(); hide(); };
    b.querySelector('#listen').onclick = () => say(.95);
    b.querySelector('#slow').onclick = () => say(.6);
    b.querySelector('#copy').onclick = async ev => {
      try { await navigator.clipboard.writeText(vi); ev.currentTarget.textContent = tx('✓ Đã chép'); } catch (e) { /* trang chặn clipboard */ }
    };
    position(info.rect);
  }

  const fromHost = e => host && e.composedPath && e.composedPath().includes(host);
  // Trên chính web app Lexkite: từ đã có bảng tra riêng (.tw) và nút lưu cụm riêng → tiện ích nhường, tránh hiện 2 bảng
  const OWN_APP = /^(www\.)?lexkite\.com$|^lexkite\.pages\.dev$|^(vocaband|ielts-lexi-2026)\.web\.app$|^localhost$/.test(location.hostname);
  const appHandles = (el, sel) => OWN_APP && el && el.closest && !!(el.closest('.tw, .pop, .sel-fab, .sel-bar, .sel-pop, [data-own-lookup]') || (sel && el.closest('#view')));

  document.addEventListener('dblclick', e => {
    if (!alive() || !enabled || inEditable(e.target) || fromHost(e) || appHandles(e.target)) return;
    const pt = wordAtPoint(e.clientX, e.clientY);
    if (pt) {
      const sel = window.getSelection(); try { sel.removeAllRanges(); sel.addRange(pt.range); } catch (x) { /* bỏ qua */ }
      return show(pt.word, pt.rect, sentenceAround(pt.range));
    }
    const s = fromSelection();
    if (s) show(s.word, s.rect, s.context);
  });
  document.addEventListener('mouseup', e => {
    if (!alive() || fromHost(e) || e.button !== 0 || inEditable(e.target) || appHandles(e.target, true)) return;
    // Đợi trình duyệt cập nhật vùng chọn
    setTimeout(() => {
      if (e.altKey) { const s = fromSelection(); if (s && enabled) show(s.word, s.rect, s.context); return; }
      if (e.detail >= 2 || selectMode === 'off') return; // bấm đúp do dblclick xử lý
      const info = selectionInfo();
      if (!info) return;
      if (selectMode === 'auto' && !isWordish(info.text)) translateSelection(info);
      else showFab(info);
    }, 10);
  });
  document.addEventListener('mousedown', e => {
    if (!alive() || fromHost(e)) return;
    if (root) { hideFab(); if (!box().hidden) hide(); }
  });
  document.addEventListener('keydown', e => {
    if (!root) return;
    if (e.key === 'Escape') { hide(); hideFab(); return; }
    if ((e.key === 'p' || e.key === 'P') && !box().hidden && !inEditable(e.target)) { const sp = root.querySelector('.spk[data-acc]'); if (sp) { e.preventDefault(); sp.click(); } }
  });
  window.addEventListener('scroll', () => { if (root) { hideFab(); } }, { passive: true });



  // ---------- Đánh dấu từ đã học trên trang (ôn thụ động khi gặp lại trong ngữ cảnh thật) ----------
  const level5 = s => !s || !s.last ? 0 : s.reps === 0 ? 1 : s.interval <= 3 ? 2 : s.interval <= 10 ? 3 : s.interval <= 30 ? 4 : 5;
  let known = new Map(), knownRe = null, marked = 0, toastShown = false;
  const SKIP = 'SCRIPT,STYLE,NOSCRIPT,TEXTAREA,INPUT,SELECT,OPTION,CODE,PRE,KBD,SAMP,SVG,MATH,VB-MARK,IELTS-LEXI-POPUP,TITLE,HEAD';
  let ACAD = null, GT = null; // GT: tên bài ngữ pháp (grammar-titles.json) // từ học thuật B2–C2 (academic.json, sinh từ AWL + NAWL + kho Lexkite)
  async function loadKnown() {
    const r = await chrome.storage.local.get('cards');
    known = new Map(Object.values(r.cards || {}).filter(c => c.word && c.word.length > 2 && !/\s/.test(c.word)).map(c => [c.word.toLowerCase(), { vi: c.vi || '', ipa: c.ipa || '', lv: level5(c.srs) }]));
    if (acadOn) {
      if (!ACAD) try { ACAD = await (await fetch(chrome.runtime.getURL('academic.json'))).json(); } catch (e) { ACAD = {}; }
      for (const [w, cefr] of Object.entries(ACAD)) if (!known.has(w)) known.set(w, { acad: cefr });
    }
    knownRe = known.size ? new RegExp(`\\b(${[...known.keys()].sort((a, b) => b.length - a.length).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(s|es|ed|d|ing)?\\b`, 'gi') : null;
  }
  function injectMarkCss() {
    if (document.getElementById('vb-mark-css')) return;
    const st = document.createElement('style'); st.id = 'vb-mark-css';
    st.textContent = `vb-mark{background:linear-gradient(transparent 60%,var(--vbc,rgba(124,58,237,.3)) 60%);border-radius:2px;cursor:help;color:inherit}
      vb-mark[data-l="1"]{--vbc:rgba(239,68,68,.38)}vb-mark[data-l="2"]{--vbc:rgba(245,158,11,.4)}vb-mark[data-l="3"]{--vbc:rgba(234,179,8,.4)}
      vb-mark[data-l="4"],vb-mark[data-l="5"]{--vbc:rgba(34,197,94,.35)}vb-mark[data-l="0"]{--vbc:rgba(204,63,28,.22)}
      vb-mark[data-a]{background:none;border-bottom:2px dotted #E5502F;border-radius:0}
      .ytp-caption-segment .vbw.known{box-shadow:inset 0 -.18em 0 rgba(34,197,94,.9)}`;
    (document.head || document.documentElement).appendChild(st);
  }
  function markIn(rootEl, budget = 400) {
    if (!markOn || !knownRe || !rootEl || marked > 800) return;
    const tw = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, {
      acceptNode: n => {
        const p = n.parentElement;
        if (!p || !n.nodeValue || n.nodeValue.length < 3 || !/[A-Za-z]{3}/.test(n.nodeValue)) return NodeFilter.FILTER_REJECT;
        if (p.closest(SKIP.split(',').map(x => x.toLowerCase()).join(',') + ',[contenteditable],[contenteditable=""],.ytp-caption-window-container')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = []; let n;
    while ((n = tw.nextNode()) && nodes.length < budget) nodes.push(n);
    for (const node of nodes) {
      const text = node.nodeValue; knownRe.lastIndex = 0;
      if (!knownRe.test(text)) continue;
      knownRe.lastIndex = 0;
      const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = knownRe.exec(text))) {
        const k = known.get(m[1].toLowerCase()); if (!k) continue;
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const el = document.createElement('vb-mark');
        el.textContent = m[0]; el.dataset.w = m[1].toLowerCase();
        if (k.acad) { el.dataset.a = k.acad; el.title = `${k.acad} · ${tx('Từ học thuật – bấm để tra')}`; }
        else { el.dataset.l = k.lv; el.title = `${k.vi}${k.ipa ? '  ' + k.ipa : ''} · ${tx('Lexkite cấp {lv}', { lv: k.lv || tx('mới') })}`; }
        frag.appendChild(el); last = m.index + m[0].length; marked++;
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
      if (marked > 800) break;
    }
    if (document.querySelectorAll('vb-mark[data-l]').length >= 3 && !toastShown) { toastShown = true; showToast(tx('📒 {n} từ bạn đã học xuất hiện trên trang này', { n: new Set([...document.querySelectorAll('vb-mark[data-l]')].map(x => x.dataset.w)).size })); }
  }
  function unmarkAll() { document.querySelectorAll('vb-mark').forEach(el => el.replaceWith(document.createTextNode(el.textContent))); marked = 0; }
  function showToast(msg) {
    ensureHost();
    let t = root.querySelector('.vbtoast');
    if (!t) { t = document.createElement('div'); t.className = 'vbtoast'; root.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(showToast._t); showToast._t = setTimeout(() => { t.hidden = true; }, 4500);
  }
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('vb-mark');
    if (!el || !alive() || el.closest('a,button')) return;
    e.preventDefault(); e.stopPropagation();
    const r = document.createRange(); r.selectNodeContents(el);
    show(el.dataset.w, el.getBoundingClientRect(), sentenceAround(r));
  }, true);
  let moT = null;
  const mo = new MutationObserver(muts => {
    if (!alive()) return mo.disconnect();
    if (!markOn || !knownRe) return;
    if (muts.every(m => [...m.addedNodes].every(x => x.nodeName === 'VB-MARK' || x.nodeType === 3 && x.parentElement && x.parentElement.nodeName === 'VB-MARK'))) return;
    clearTimeout(moT); moT = setTimeout(() => markIn(document.body, 250), 1500);
  });
  (async () => {
    if (window.top !== window || /^(docs|mail)\.google\.com$|(^|\.)lexkite\.com$|^lexkite\.pages\.dev$|(^|\.)(vocaband|ielts-lexi-2026)\.web\.app$|^localhost$/.test(location.hostname)) return;
    await loadKnown(); injectMarkCss();
    const go = () => { markIn(document.body); if (document.body) mo.observe(document.body, { childList: true, subtree: true }); };
    'requestIdleCallback' in window ? requestIdleCallback(go, { timeout: 2500 }) : setTimeout(go, 1200);
  })();
  chrome.storage.onChanged.addListener(async ch => {
    if (!alive()) return;
    if (ch.cards) { await loadKnown(); }
    if (ch.settings) { const nv = ch.settings.newValue || {}, on = nv.markKnown !== false; acadOn = nv.markAcademic !== false; unmarkAll(); await loadKnown(); if (on) markIn(document.body); }
  });

  // ---------- YouTube: chạm vào từ trong phụ đề để tra, video tự dừng ----------
  function initYouTube() {
    const st = document.createElement('style');
    st.textContent = `
      .ytp-caption-segment .vbw { cursor: pointer; border-radius: 4px; transition: background .1s; }
      .ytp-caption-segment .vbw:hover { background: #CC3F1C !important; color: #fff !important; }
      .ytp-caption-window-container .caption-window { pointer-events: auto !important; }`;
    document.documentElement.appendChild(st);
    const video = () => document.querySelector('video.html5-main-video') || document.querySelector('video');
    let pausedByUs = false;
    const resume = () => { const v = video(); if (pausedByUs && v && v.paused) v.play(); pausedByUs = false; };
    const pause = () => { const v = video(); if (v && !v.paused) { v.pause(); pausedByUs = true; } };

    const wrap = seg => {
      const t = seg.textContent;
      if (!t || seg.dataset.vb === t) return;
      seg.innerHTML = H(t.split(/(\s+)/).map(tok => {
        if (!/[A-Za-z]/.test(tok)) return esc(tok);
        const w = tok.toLowerCase().replace(/[^a-z'-]/g, '');
        const k = known.get(w) || known.get(w.replace(/(s|es|ed|d|ing)$/, ''));
        return `<span class="vbw${k ? ' known' : ''}"${k ? ` title="${esc(k.vi)}"` : ''}>${esc(tok)}</span>`;
      }).join(''));
      seg.dataset.vb = seg.textContent;
    };
    const scan = () => document.querySelectorAll('.ytp-caption-segment').forEach(wrap);
    const obs = new MutationObserver(() => { if (!alive()) return obs.disconnect(); if (enabled) scan(); });
    (function attach() {
      const p = document.querySelector('#movie_player');
      if (p) obs.observe(p, { subtree: true, childList: true, characterData: true }); else setTimeout(attach, 1000);
    })();

    // Di chuột vào phụ đề → tạm dừng để đọc; rời đi → chạy tiếp
    document.addEventListener('mouseover', e => {
      if (!alive() || !enabled || !e.target.closest) return;
      if (e.target.closest('.ytp-caption-window-container .caption-window')) pause();
    }, true);
    document.addEventListener('mouseout', e => {
      if (!alive() || !e.target.closest || !e.target.closest('.caption-window')) return;
      const to = e.relatedTarget;
      if (to && to.closest && to.closest('.caption-window')) return;
      if (root && !box().hidden) return; // đang xem bảng tra
      resume();
    }, true);
    // Chặn YouTube kéo khung phụ đề / dừng-phát khi bấm vào từ
    ['mousedown', 'mouseup', 'dblclick'].forEach(t => document.addEventListener(t, e => {
      if (e.target.closest && e.target.closest('.ytp-caption-segment .vbw')) e.stopPropagation();
    }, true));
    document.addEventListener('click', e => {
      const w = e.target.closest && e.target.closest('.ytp-caption-segment .vbw');
      if (!w || !alive() || !enabled) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      pause();
      const word = w.textContent.replace(/[’]/g, "'").replace(/[^A-Za-z'-]/g, '').replace(/^'+|'+$/g, '').toLowerCase();
      if (!word) return;
      const line = [...document.querySelectorAll('.ytp-caption-segment')].map(x => x.textContent).join(' ').replace(/\s+/g, ' ').trim();
      const v = video(), t = v ? Math.floor(v.currentTime) : 0;
      const u = new URL(location.href); u.searchParams.set('t', t + 's');
      show(word, w.getBoundingClientRect(), line.split(' ').length >= 3 ? line : '', { source: u.toString(), title: '▶️ ' + document.title.replace(/ - YouTube$/, '') + ` (${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')})` });
      onHide = resume;
    }, true);
    document.addEventListener('fullscreenchange', () => { if (root && !box().hidden) hide(); });

    // ⌨️ Phím tắt luyện nghe/chép chính tả: A = câu trước · S = lặp câu hiện tại · D = câu sau (Space giữ nguyên của YouTube)
    // Mốc thời gian thật từng câu lấy từ phụ đề của chính video (ưu tiên phụ đề tiếng Anh do người làm, rồi phụ đề tự động)
    let cues = [], cueVid = '', hinted = false;
    const loadCues = async () => {
      const id = new URL(location.href).searchParams.get('v'); if (!id || id === cueVid) return; cueVid = id; cues = [];
      try {
        const r = await chrome.runtime.sendMessage({ type: 'ytTracks' }), tr = (r && r.tracks) || [];
        const pick = tr.find(x => /^en/.test(x.l) && x.k !== 'asr') || tr.find(x => /^en/.test(x.l)) || tr.find(x => x.k !== 'asr') || tr[0]; if (!pick) return;
        const j = await (await fetch(pick.u + (pick.u.includes('?') ? '&' : '?') + 'fmt=json3')).json();
        const raw = (j.events || []).filter(ev => ev.segs && ev.dDurationMs).map(ev => ({ s: ev.tStartMs / 1000, e: (ev.tStartMs + ev.dDurationMs) / 1000, t: ev.segs.map(x => x.utf8 || '').join('').replace(/\s+/g, ' ').trim() })).filter(c => c.t);
        cues = raw.filter((c, i) => !i || c.s - raw[i - 1].s > 0.3); // bỏ mốc trùng của phụ đề tự động cuộn dòng
      } catch (e) { cues = []; }
    };
    document.addEventListener('yt-navigate-finish', () => setTimeout(loadCues, 800));
    setTimeout(loadCues, 1500);
    document.addEventListener('keydown', e => {
      if (!alive() || e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
      const k = e.key.toLowerCase(); if (!'asd'.includes(k)) return;
      const a = document.activeElement; if (a && (a.isContentEditable || /^(input|textarea|select)$/i.test(a.tagName))) return;
      const v = video(); if (!v || !cues.length) return;
      const now = v.currentTime; let i = -1; for (let j = 0; j < cues.length; j++) if (cues[j].s <= now + 0.05) i = j; else break;
      const tgt = k === 'a' ? cues[Math.max(0, i - 1)] : k === 's' ? cues[Math.max(0, i)] : cues[Math.min(cues.length - 1, i + 1)];
      if (!tgt) return;
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      v.currentTime = tgt.s + 0.01; if (v.paused) v.play();
      if (!hinted) { hinted = true; showToast(tx('⌨️ A câu trước · S lặp câu · D câu sau')); }
    }, true);
  }
  if (/(^|\.)youtube\.com$/.test(location.hostname)) initYouTube();

  chrome.runtime.onMessage.addListener(msg => {
    if (!alive()) return;
    if (msg.type === 'translateSelection') { const info = selectionInfo(); if (info) translateSelection(info); return; }
    if (msg.type !== 'showLookup') return;
    const sel = window.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    const rect = range ? range.getBoundingClientRect() : { left: window.innerWidth / 2, top: 80, bottom: 80, width: 0 };
    show(msg.word.trim().toLowerCase(), rect, range ? sentenceAround(range) : '');
  });
})();
