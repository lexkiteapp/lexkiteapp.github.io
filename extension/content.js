/* Content script: bấm đúp vào từ (hoặc bôi đen + Alt) để tra nhanh, lưu vào flashcard kèm câu ngữ cảnh. */
(() => {
  // ---------- Vòng đời: khi add-on được tải lại/cập nhật, bản content script cũ ở các tab đang mở bị "mồ côi" (chrome.runtime.id = undefined,
  // mọi lời gọi chrome.* ném "Extension context invalidated"). Mọi đường vào (sự kiện, timer, observer, listener chrome, promise) đi qua
  // các hàm bọc dưới đây: hết sống thì lặng lẽ tự gỡ (listener, observer, timer, UI) và KHÔNG ném lỗi. Bản mới chạy sẽ tắt bản cũ cùng thế giới.
  const NS = '__lkCS', timers = new Set(), cleanups = []; let gone = false;
  const alive = () => { try { return !gone && !!chrome.runtime.id; } catch (e) { return false; } };
  const stop = () => {
    if (gone) return; gone = true;
    timers.forEach(t => clearTimeout(t)); timers.clear();
    cleanups.splice(0).forEach(f => { try { f(); } catch (e) { /* bỏ qua */ } });
    try { if (window[NS] && window[NS].stop === stop) delete window[NS]; } catch (e) { /* bỏ qua */ }
  };
  try { const prev = window[NS]; if (prev && prev.stop) prev.stop(); } catch (e) { /* bỏ qua */ }
  window[NS] = { stop };
  const guard = fn => function (...a) { if (!alive()) { stop(); return undefined; } try { return fn.apply(this, a); } catch (e) { if (alive()) throw e; stop(); return undefined; } };
  const bind = (t, ev, fn, o) => { const h = guard(fn); t.addEventListener(ev, h, o); cleanups.push(() => { try { t.removeEventListener(ev, h, o); } catch (e) { /* bỏ qua */ } }); };
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!alive()) return stop(); try { fn(); } catch (e) { if (alive()) throw e; stop(); } }, ms); timers.add(id); return id; };
  const DEAD = Object.freeze({ dead: true });
  const send = m => { if (!alive()) { stop(); return Promise.resolve(DEAD); } try { return Promise.resolve(chrome.runtime.sendMessage(m)).catch(e => { if (!alive()) { stop(); return DEAD; } throw e; }); } catch (e) { if (!alive()) stop(); return Promise.resolve(DEAD); } };
  const sget = k => { if (!alive()) { stop(); return Promise.resolve({}); } try { return Promise.resolve(chrome.storage.local.get(k)).then(r => r || {}, () => { if (!alive()) stop(); return {}; }); } catch (e) { if (!alive()) stop(); return Promise.resolve({}); } };
  const sset = o => { if (!alive()) { stop(); return Promise.resolve(); } try { return Promise.resolve(chrome.storage.local.set(o)).catch(() => { if (!alive()) stop(); }); } catch (e) { if (!alive()) stop(); return Promise.resolve(); } };
  const chromeOn = (ev, fn) => { const h = guard(fn); try { ev.addListener(h); cleanups.push(() => { try { ev.removeListener(h); } catch (e) { /* bỏ qua */ } }); } catch (e) { /* bỏ qua */ } };
  const uiLangOf = () => { try { return uiLangOf(); } catch (e) { return navigator.language; } };

  // Cầu nối đồng bộ: trên trang Lexkite (đã đăng nhập Google) web app đọc/ghi dữ liệu add-on để gộp chung theo tài khoản
  if (window.top === window && /^(www\.)?lexkite\.com$|^lexkite\.pages\.dev$/.test(location.hostname)) { // chỉ tên miền đang sở hữu – tên miền cũ *.web.app có thể rơi vào tay người khác
    const KEYS = ['cards', 'stats', 'deleted'];
    bind(window, 'message', async e => {
      if (e.source !== window || e.origin !== location.origin || !e.data || e.data.lkBridge !== 'req') return;
      try { if (!chrome.runtime.id) return; } catch (x) { return; } // bản add-on cũ đã bị thay thế
      try {
        if (e.data.op === 'get') { const data = await sget(KEYS); window.postMessage({ lkBridge: 'res', id: e.data.id, data }, location.origin); }
        else if (e.data.op === 'diag') { const { errLog } = await sget('errLog'); window.postMessage({ lkBridge: 'res', id: e.data.id, data: { v: chrome.runtime.getManifest().version, errLog: errLog || [], ui: UI_LANG, ml: ML(), nav: navigator.language } }, location.origin); }
        else if (e.data.op === 'lang') { const l = (e.data.data || {}).lang; if (pickLang(l)) await sset({ uiLang: pickLang(l) }); window.postMessage({ lkBridge: 'res', id: e.data.id, ok: true }, location.origin); }
        else if (e.data.op === 'linked') { const d = e.data.data || {}; await sset({ linked: { email: String(d.email || '').slice(0, 120), name: String(d.name || '').slice(0, 80), at: Date.now() } }); window.postMessage({ lkBridge: 'res', id: e.data.id, data: { ok: true } }, location.origin); }
        else if (e.data.op === 'aiKeyGet') { const { aiKey } = await sget('aiKey'); window.postMessage({ lkBridge: 'res', id: e.data.id, data: { aiKey: aiKey || '' } }, location.origin); }
        else if (e.data.op === 'aiKeySet') { const k = String((e.data.data || {}).aiKey || ''); if (!k || /^(AIza[\w-]{20,}|AQ\.[\w.-]{20,})$/.test(k)) await sset({ aiKey: k }); window.postMessage({ lkBridge: 'res', id: e.data.id, data: { ok: true } }, location.origin); }
        else if (e.data.op === 'set') {
          // Gộp (không ghi đè): service worker/popup/tab mới có thể vừa lưu thẻ sau lúc web đọc → giữ cả hai, bản hoạt động mới hơn thắng (như mergeCards ở web/js/sync.js)
          const d = e.data.data || {}, cur = await sget(['cards', 'stats', 'deleted']), put = {};
          const act = c => Math.max((c && c.srs && c.srs.last) || 0, (c && c.added) || 0, (c && c.mod) || 0);
          const deleted = Object.assign(Object.create(null), cur.deleted || {});
          for (const [k, t] of Object.entries(d.deleted || {})) deleted[k] = Math.max(deleted[k] || 0, +t || 0);
          if (d.cards) {
            const out = Object.assign(Object.create(null), cur.cards || {});
            for (const [k, c] of Object.entries(d.cards)) { const mine = out[k]; out[k] = !mine || act(c) >= act(mine) ? c : mine; }
            for (const [k, t] of Object.entries(deleted)) if (out[k] && act(out[k]) < t) delete out[k];
            put.cards = out;
          }
          if (d.deleted) put.deleted = deleted;
          if (d.stats) { const a = cur.stats || {}, b = d.stats, days = { ...(a.days || {}) }; for (const [k, v] of Object.entries(b.days || {})) days[k] = Math.max(days[k] || 0, v || 0); put.stats = { ...a, ...b, days }; }
          await sset(put); window.postMessage({ lkBridge: 'res', id: e.data.id, ok: true }, location.origin);
        }
      } catch (err) { window.postMessage({ lkBridge: 'res', id: e.data.id, error: String(err) }, location.origin); }
    });
    try { window.postMessage({ lkBridge: 'hello', version: chrome.runtime.getManifest().version }, location.origin); } catch (x) { /* bản cũ */ }
    try { document.documentElement.setAttribute('data-lexkite-ext', chrome.runtime.getManifest().version); } catch (x) { /* bỏ qua */ } // web ẩn nút "Thêm vào Chrome" khi add-on đã cài (web/js/ext-cta.js)
  }
  // Bản content script cũ (trước khi add-on được cập nhật/tải lại) tự tắt khi bản mới chạy
  try { document.dispatchEvent(new CustomEvent('ielts-lexi-takeover', { detail: chrome.runtime.id })); } catch (x) { /* bản cũ */ }
  // Lỗi của chính content script (thế giới riêng của add-on) → ghi vào nhật ký lỗi để chẩn đoán
  const report = (where, e) => { try { if (!alive()) return stop(); send({ type: 'logErr', where, m: String((e && (e.stack || e.message)) || e).slice(0, 600) + ' @' + location.hostname }); } catch (x) { /* bản cũ */ } };
  bind(window, 'error', e => { if (e.filename && e.filename.startsWith('chrome-extension://')) report('cs', e.error || e.message); });
  bind(window, 'unhandledrejection', e => report('cs-promise', e.reason));
  // Ngôn ngữ giao diện: chỉ en / vi như web app, ngôn ngữ khác → English. Nội dung học (nghĩa Việt, câu dịch) giữ nguyên
  // Ngôn ngữ giao diện: theo lựa chọn trên web Lexkite (đồng bộ qua cầu nối), mặc định theo ngôn ngữ Chrome
  const XLANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
  const pickLang = l => { l = String(l || '').toLowerCase().split('-')[0]; return XLANGS.includes(l) ? l : null; };
  let UI_LANG = pickLang(uiLangOf()) || 'en', XD = {};
  const setLang = l => { if (!l) return; UI_LANG = l; XD = {}; if (l !== 'vi') send({ type: 'uiDict', lang: l }).then(r => { if (UI_LANG === l) XD = (r && r.dict) || {}; }).catch(() => {}); };
  try { sget('uiLang').then(r => setLang(pickLang(r.uiLang) || UI_LANG)).catch(() => {}); chromeOn(chrome.storage.onChanged, ch => { if (ch.uiLang) setLang(pickLang(ch.uiLang.newValue)); }); } catch (x) { /* bản cũ */ }
  const ML = () => { if (UI_LANG === 'vi') return 'vi'; if (UI_LANG !== 'en') return UI_LANG === 'zh' ? 'zh-CN' : UI_LANG; const l = (navigator.language || 'en').toLowerCase(); return l.startsWith('vi') ? 'en' : l.startsWith('zh') ? (/tw|hk|hant/.test(l) ? 'zh-TW' : 'zh-CN') : l.split('-')[0]; };
  const FLAG = l => ({ vi: '🇻🇳', en: '🇬🇧', es: '🇪🇸', pt: '🇧🇷', fr: '🇫🇷', de: '🇩🇪', id: '🇮🇩', th: '🇹🇭', zh: '🇨🇳', 'zh-CN': '🇨🇳', 'zh-TW': '🇹🇼', ja: '🇯🇵', ko: '🇰🇷', hi: '🇮🇳', ar: '🇸🇦', ru: '🇷🇺', tr: '🇹🇷' })[l] || '🌐';
  const EN = {
    'Dịch với Lexkite': 'Translate with Lexkite', 'Nghe câu ví dụ': 'Play example', 'Quay lại từ trước': 'Back to previous word', 'Quay lại': 'Back',
    'Anh–Mỹ': 'US English', 'Nghe giọng Anh–Anh (phím P)': 'British pronunciation (P key)', 'Nghe giọng Anh–Mỹ': 'American pronunciation', 'Nghe chậm': 'Play slowly',
    '📌 Ngữ cảnh sẽ lưu': '📌 Context to save', '📌 Ngữ cảnh': '📌 Context', 'Nghe cả câu': 'Play sentence', '⏳ Đang dịch câu…': '⏳ Translating sentence…',
    '✓ Đã lưu vào flashcard': '✓ Saved to flashcards', '+ Thêm ngữ cảnh': '+ Add context', '✓ Đã lưu': '✓ Saved', '✓ Đã trong sổ thẻ': '✓ In your deck', '⌨️ A câu trước · S lặp câu · D câu sau': '⌨️ A previous line · S repeat line · D next line', 'Học bài: {n} →': 'Lesson: {n} →', 'Từ học thuật – bấm để tra': 'Academic word – click to look up', '+ Lưu flashcard': '+ Save flashcard',
    'Chi tiết': 'Details', 'Cách dùng': 'Usage', 'Giới từ đi kèm, to-V/V-ing, trạng từ, từ dễ nhầm': 'Dependent prepositions, to-V/V-ing, adverbs, confusing words', 'Đóng (Esc)': 'Close (Esc)', '⚠️ Thử lưu lại': '⚠️ Retry saving', 'tên riêng': 'proper noun', 'cụm từ': 'phrase', 'từ': 'word',
    '🔊 Nghe': '🔊 Listen', 'Tra từng từ:': 'Look up each word:', 'Tên riêng (địa danh, người, tổ chức…) – không có trong từ điển phổ thông.': 'Proper noun (place, person, organization…) – not in the general dictionary.',
    'Chưa có trong từ điển – đã dịch tự động.': 'Not in the dictionary yet – machine-translated.', '+ Lưu cụm từ': '+ Save phrase', '+ Lưu từ': '+ Save word',
    'Add-on vừa được cập nhật – hãy tải lại trang.': 'The add-on was just updated – please reload the page.', '⏳ Đang dịch…': '⏳ Translating…',
    '🌐 Dịch đoạn đã chọn': '🌐 Translate selection', 'Không dịch được đoạn này.': 'Could not translate this text.',
    '🧩 Cấu trúc trong đoạn': '🧩 Structures in this text', '📐 Học bài ngữ pháp này →': '📐 Learn this grammar lesson →', '🐢 Chậm': '🐢 Slow',
    'Giải thích nghĩa trong ngữ cảnh, cấu trúc, collocation, ví dụ': 'Explain meaning in context, structure, collocations, examples', '🤖 Giải thích sâu': '🤖 Deep explanation',
    '⏳ AI đang phân tích…': '⏳ AI is analyzing…',
    'Hết lượt AI miễn phí hôm nay – thử lại vào ngày mai.': 'Daily free AI limit reached – try again tomorrow.', 'AI đang bận – thử lại sau ít phút.': 'AI is busy right now – try again in a few minutes.',
    'AI không dùng được khi ngoại tuyến – kết nối mạng rồi thử lại.': 'AI is unavailable offline – connect to the internet and try again.', 'Không phân tích được lúc này.': 'Could not analyze right now.',
    '⚡ Bật AI trên máy (miễn phí, riêng tư)': '⚡ Enable on-device AI (free, private)', 'Chrome tải AI trên máy một lần (~2 GB) – sau đó dùng được cả khi ngoại tuyến.': 'Chrome downloads the on-device AI once (~2 GB) – after that it works even offline.',
    '⬇️ Đang tải AI trên máy… {pct}%': '⬇️ Downloading on-device AI… {pct}%', '✓ AI trên máy đã sẵn sàng': '✓ On-device AI is ready', 'Không bật được AI trên máy – thử lại sau.': 'Could not enable on-device AI – try again later.',
    '💻 AI trên máy – riêng tư, không gửi đi đâu': '💻 On-device AI – private, nothing leaves your device', '🎁 Còn {n} lượt AI miễn phí hôm nay': '🎁 {n} free AI explanations left today',
    'Ngôn ngữ nhận diện → ngôn ngữ dịch': 'Detected language → translation language', 'Chép bản dịch': 'Copy translation', 'Thử lại': 'Try again',
    'Đoạn này đã là tiếng Anh – nghe, tra từng từ hoặc xem giải thích sâu bên dưới.': 'This text is already in English – listen to it, look up words or get a deep explanation below.',
    'Đoạn này đã ở ngôn ngữ của bạn nên được dịch sang tiếng Anh.': 'This text is already in your language, so it was translated into English.',
    'Nghĩa trong ngữ cảnh:': 'Meaning in context:', 'Ngữ pháp:': 'Grammar:', 'Cụm hay đi kèm:': 'Common collocations:',
    '✓ Đã chép': '✓ Copied', 'Ảnh không đúng – ẩn ảnh này': 'Wrong picture – hide it', 'Lexkite cấp {lv}': 'Lexkite level {lv}', 'mới': 'new', '📒 {n} từ bạn đã học xuất hiện trên trang này': '📒 {n} words you have learned appear on this page',
  };
  // Nghĩa chính: nếu nghĩa tóm tắt quá ngắn/trùng từ gốc thì lấy nghĩa đầu tiên của mục từ
  const viMain = (e, shown) => { const v = String(e.vi || '').trim(); if (v.length >= 3 && v.toLowerCase() !== String(e.word || '').toLowerCase()) return v; const f = (shown || []).find(x => x.vi && x.vi.length); return f ? f.vi.slice(0, 3).join(', ') : v; };
  const tx = (src, vars) => { let s = UI_LANG === 'vi' ? src : (XD[src] || EN[src] || src); if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); return s; };
  bind(document, 'ielts-lexi-takeover', ev => { if (ev.detail !== chrome.runtime.id) return; // trang web không tắt được add-on
    stop(); });

  let host = null, root = null, enabled = true, selectMode = 'icon', current = null, markOn = true, acadOn = true, ctxOn = true, prefs = {};
  cleanups.push(() => { try { document.querySelectorAll('vb-mark').forEach(el => el.replaceWith(document.createTextNode(el.textContent))); } catch (e) {} for (const id of ['vb-mark-css']) { const x = document.getElementById(id); if (x) x.remove(); } if (host) host.remove(); window.speechSynthesis && 0; });
  const applySettings = st => { st = st || {}; prefs = st; enabled = st.dblclickOn !== false; selectMode = st.selectMode || 'icon'; ctxOn = st.saveCtx !== false; markOn = st.markKnown !== false; acadOn = st.markAcademic !== false; };
  // Câu ngữ cảnh (P2-1.1): chỉ khi bật "Lưu câu ngữ cảnh"; ≤200 ký tự; nguồn = tên miền (không đường dẫn/truy vấn) – riêng video (YouTube…) giữ liên kết video công khai để xem lại đoạn gốc
  const ctxOut = (text, vi, meta) => {
    if (!ctxOn || !text) return null;
    let src = '';
    try { const u = new URL(meta.source); src = /(^|\.)(youtube\.com|youtu\.be|vimeo\.com|ted\.com)$/.test(u.hostname) ? meta.source : u.origin + '/'; } catch (e) { src = ''; }
    return { text: text.slice(0, 200), vi, source: src, title: meta.title };
  };
  sget('settings').then(r => applySettings(r.settings));
  // Ảnh người dùng đã báo "ảnh không đúng": khóa = từ + URL ảnh (trước đây chỉ theo từ → ẩn vĩnh viễn cả ảnh mới, đúng nghĩa sau khi đổi nguồn ảnh)
  const badImg = new Set(), imgKey = e => e.word + ' ' + e.image;
  sget('badImg').then(r => (r.badImg || []).forEach(w => { if (/ https:\/\//.test(w)) badImg.add(w); })).catch(() => {});
  chromeOn(chrome.storage.onChanged, ch => { if (ch.settings) applySettings(ch.settings.newValue); });

  // Trusted Types: YouTube và một số trang bắt buộc dùng TrustedHTML cho innerHTML
  let ttPolicy; // undefined = chưa kiểm; null = trang không bắt buộc TrustedHTML
  const needTT = () => { try { document.createElement('div').innerHTML = '<b></b>'; return false; } catch (e) { return true; } };
  const H = html => { if (ttPolicy === undefined) { ttPolicy = null; if (window.trustedTypes && trustedTypes.createPolicy && needTT()) try { ttPolicy = trustedTypes.createPolicy('vocaband#lexi', { createHTML: x => x }); } catch (e) { ttPolicy = null; } } return ttPolicy ? ttPolicy.createHTML(html) : html; };
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
    .chip { display: inline-block; padding: 0 7px; margin-left: 4px; border-radius: 99px; background: #f1f2f8; color: #565a6e; font-size: 11px; vertical-align: middle; }
    .lv { background: #fdece6; color: #A5300F; font-weight: 700; }
    .ipa { color: #6b6f85; font-family: "Lucida Sans Unicode", "Arial Unicode MS", sans-serif; }
    .spks { display: flex; gap: 6px; margin: 4px 0 2px; flex-wrap: wrap; }
    .spk { border: 0; background: #fdece6; color: #A5300F; border-radius: 999px; height: 26px; padding: 0 10px; cursor: pointer; font: 700 12px/26px -apple-system, "Segoe UI", sans-serif; vertical-align: middle; }
    .spk:hover { background: #CC3F1C; color: #fff; }
    .spk.mini { height: 22px; padding: 0 6px; line-height: 22px; font-size: 11px; }
    .sk { height: 11px; border-radius: 6px; margin: 7px 0; background: linear-gradient(90deg, #eef0f6 25%, #f8f9fc 50%, #eef0f6 75%); background-size: 200% 100%; animation: sh 1s infinite linear; }
    @keyframes sh { to { background-position: -200% 0; } }
    .vi { color: #0a6f6e; font-weight: 700; font-size: 15px; margin-top: 2px; }
    .body { padding: 0 14px 12px; max-height: 340px; overflow: auto; overflow-anchor: none; } /* không tự giữ vị trí cuộn khi nội dung nạp thêm → dòng đầu không bị đẩy khuất */
    .def { margin: 4px 0; }
    .ex { color: #5d6177; font-style: italic; font-size: 13px; }
    .pg { margin: 8px 0; padding-left: 8px; border-left: 3px solid #e4e6f2; } .pg .chip { margin: 0 6px 0 0; } .pvi { font-weight: 600; }
    .pdef { margin: 3px 0 0; font-size: 13.5px; } .wn-x { margin: 8px 0 2px; padding: 7px 9px; border-radius: 10px; background: #fdf3ee; color: #1c1d2b; font-size: 12.5px; line-height: 1.5; } .wn-x div + div { margin-top: 3px; } .pex { display: block; color: #6b6f85; font-size: 13px; }
    .ctx { margin-top: 8px; padding: 8px 10px; background: #fff8e6; color: #1c1d2b; border-radius: 10px; font-size: 13px; }
    .ctx b { font-style: normal; }
    mark { background: #fde68a; color: #3b2a00; border-radius: 3px; padding: 0 2px; font-weight: 700; }
    .foot { display: flex; gap: 8px; padding: 10px 14px; border-top: 1px solid #eef0f6; background: #fafbfe; align-items: center; }
    .btn { border: 1px solid #e3e5ef; background: #fff; border-radius: 10px; padding: 7px 12px; font: 600 13px/1 inherit; font-family: inherit; cursor: pointer; color: #1c1d2b; }
    .btn.p { background: #CC3F1C; border-color: #CC3F1C; color: #fff; }
    .btn[disabled] { opacity: .6; cursor: default; }
    .lw { cursor: pointer; border-radius: 3px; }
    .lw:hover { background: #fdece6; color: #CC3F1C; }
    .lw.hlw { background: #fde68a; color: #3b2a00; font-weight: 700; }
    .lw.chipw { display: inline-block; padding: 1px 8px; margin: 2px; border-radius: 999px; background: #f1f2f8; color: #1c1d2b; font-weight: 600; }
    .chipw { display: inline-block; padding: 1px 8px; margin: 2px; border-radius: 999px; background: #f1f2f8; color: #1c1d2b; font-weight: 600; font-size: 12px; }
    .st { margin-top: 10px; padding: 9px 10px; border-radius: 12px; background: #fdf6f2; color: #1c1d2b; border: 1px solid #f6d9cd; }
    .st.ai { background: #f0fdf4; border-color: #bbf7d0; }
    .st-i { padding: 6px 0; border-bottom: 1px dashed #f6d9cd; }
    .st-i:last-child { border-bottom: 0; }
    .st-n { font-weight: 800; color: #B23412; }
    .st-m { color: #6b7280; font-style: italic; }
    .st-v { font-size: 12.5px; color: #374151; margin-top: 3px; line-height: 1.5; }
    .st-l { margin-top: 4px; border: 0; background: none; color: #CC3F1C; font-weight: 700; font-size: 12px; cursor: pointer; padding: 0; }
    .back { border: 0; background: #f1f2f8; color: #1c1d2b; border-radius: 8px; width: 26px; height: 26px; margin-right: 6px; cursor: pointer; font-weight: 800; vertical-align: middle; }
    .back:hover { background: #CC3F1C; color: #fff; }
    .x { margin-left: auto; border: 0; background: none; font-size: 18px; cursor: pointer; color: #6b6f85; }
    .muted { color: #6b6f85; padding: 18px 14px; }
    .fab { position: fixed; z-index: 2147483647; width: 34px; height: 34px; border-radius: 50%; border: 0; cursor: pointer;
      background: linear-gradient(135deg, #CC3F1C, #0ea5a4); color: #fff; font-size: 16px; display: grid; place-items: center;
      box-shadow: 0 6px 18px rgba(79,70,229,.45); animation: pop .12s ease-out; }
    .fab:hover { transform: scale(1.08); }
    .fab[hidden], .box[hidden], .vbtoast[hidden], .vbtip[hidden] { display: none; }
    .vbtip { position: fixed; z-index: 2147483647; max-width: 300px; background: #1c1d2b; color: #fff; padding: 5px 9px; border-radius: 8px; font: 500 12.5px/1.4 -apple-system, "Segoe UI", sans-serif; box-shadow: 0 6px 18px rgba(0,0,0,.22); pointer-events: none; }
    .vbtoast { position: fixed; right: 18px; bottom: 18px; z-index: 2147483647; background: #1c1d2b; color: #fff; padding: 10px 14px; border-radius: 12px; font: 600 13px/1.4 -apple-system, "Segoe UI", sans-serif; box-shadow: 0 10px 30px rgba(0,0,0,.25); animation: pop .2s ease-out; }
    .tr-head { display: flex; gap: 8px; align-items: center; padding: 12px 14px 8px; }
    .src { color: #6b6f85; font-size: 13px; margin-bottom: 10px; max-height: 120px; overflow: auto; border-left: 3px solid #e3e5ef; padding-left: 8px; }
    .tr { font-size: 15.5px; line-height: 1.55; color: inherit; font-weight: 500; }
    /* Giao diện tối: chỉ khi TRANG tối (lớp .dark gắn lúc hiện bảng) – bảng sáng trên trang sáng dù máy để chế độ tối */
    .box.dark { background: #1b1c26; color: #ecedf5; border-color: #2e3040; }
    .dark .pg { border-color: #2e3040; } .dark .wn-x { background: #24233a; color: #ecedf5; } .dark .pic, .dark .spk, .dark .chip { background: #2a2b3a; }
    .dark .chip { color: #c3c6d6; } .dark .ipa, .dark .ex, .dark .src, .dark .pex, .dark .st-m, .dark .muted, .dark .x { color: #b4b8cc; }
    .dark .foot { background: #171821; border-color: #2e3040; }
    .dark .btn { background: #2a2b3a; border-color: #3a3c50; color: #ecedf5; } .dark .btn.p { background: #CC3F1C; border-color: #CC3F1C; color: #fff; }
    .dark .ctx { background: #2b2618; color: #f3ecd9; } .dark .st { background: #2a1f1b; border-color: #5a3a2e; color: #ecedf5; } .dark .st-v { color: #d6d8e4; } .dark .st-n, .dark .st-l { color: #ff9b7a; }
    .dark .st.ai { background: #13261b; border-color: #285c3a; }
    .dark .vi { color: #2dd4bf; } .dark .lv { background: #3a2620; color: #ff9b7a; } .dark .spk { color: #ffb199; } .dark .spk:hover { background: #CC3F1C; color: #fff; }
    .dark .lw.chipw, .dark .chipw, .dark .back { background: #2a2b3a; color: #ecedf5; } .dark .lw:hover { background: #3a2620; color: #ffb199; }
    .dark .inDeck { background: #13261b; color: #6ee7a0; }
    /* ảnh minh họa: nút "Ảnh không đúng" khi rê chuột */
    .pic { position: relative; } .pic .noimg { position: absolute; right: 3px; top: 3px; width: 20px; height: 20px; border-radius: 50%; border: 0; background: rgba(0,0,0,.6); color: #fff; font-size: 11px; line-height: 20px; cursor: pointer; opacity: 0; transition: opacity .15s; padding: 0; }
    .pic:hover .noimg { opacity: 1; }
    .pic canvas { width: 100%; height: 100%; display: block; }
    .pic .pcredit { position: absolute; left: 3px; bottom: 3px; width: 16px; height: 16px; border-radius: 50%; background: rgba(0,0,0,.6); color: #fff; font: 700 10px/16px -apple-system, "Segoe UI", sans-serif; text-align: center; text-decoration: none; opacity: 0; transition: opacity .15s; }
    .pic:hover .pcredit, .pic .pcredit:focus { opacity: 1; }
    .box { max-height: calc(100vh - 16px); overflow: auto; }
    /* Bảng dịch đoạn chọn: nút chính = Giải thích sâu, nhóm nghe/chép phụ; xuống dòng khi chữ dài (de, ru…) */
    .foot { flex-wrap: wrap; } .btn.ic { padding: 7px 9px; } .foot .end { margin-left: auto; }
    .btn:hover:not([disabled]) { border-color: #c4c8d8; } .btn.p:hover:not([disabled]) { background: #B23412; border-color: #B23412; }
    .btn:focus-visible, .x:focus-visible, .lw:focus-visible, .st-l:focus-visible, .spk:focus-visible, .back:focus-visible { outline: 2px solid #1F7A72; outline-offset: 2px; }
    .box:focus { outline: none; }
    button.chipw { border: 0; font: 600 12.5px/1.6 inherit; font-family: inherit; cursor: pointer; }
    .lchip { cursor: help; font-weight: 700; letter-spacing: .02em; white-space: nowrap; }
    .note { margin-top: 6px; padding: 8px 10px; border-radius: 10px; background: #eef6f5; color: #0F3D3E; font-size: 13px; line-height: 1.5; }
    .note .acts { display: flex; flex-wrap: wrap; gap: 4px 12px; } .note .st-l, .tiny .st-l { margin-top: 6px; }
    .err { color: #A5300F; font-weight: 600; font-size: 14px; }
    .tiny { font-size: 11.5px; color: #6b6f85; margin-top: 6px; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    .dark .note { background: #16302f; color: #d3efeb; } .dark .err { color: #ff9b7a; } .dark .tiny { color: #b4b8cc; }
    .dark .btn:hover:not([disabled]) { border-color: #565a70; } .dark .btn.p:hover:not([disabled]) { background: #B23412; }
    .dark .btn:focus-visible, .dark .x:focus-visible, .dark .lw:focus-visible, .dark .st-l:focus-visible { outline-color: #2dd4bf; }
    .f1 { flex: 1; } .mw0 { min-width: 0; } .mt4 { margin-top: 4px; } .mt8 { margin-top: 8px; }
    .sk.w40 { width: 40%; } .sk.w50 { width: 50%; } .sk.w60 { width: 60%; } .sk.w80 { width: 80%; }`;

  // Trang tối hay sáng? Lấy màu nền thật dưới vị trí bảng tra (đi ngược lên cha tới khi gặp nền không trong suốt)
  const pageDark = rect => {
    try {
      const x = Math.min(innerWidth - 2, Math.max(1, rect ? (rect.left || 0) + 2 : innerWidth / 2)), y = Math.min(innerHeight - 2, Math.max(1, rect ? (rect.top || 0) + 2 : innerHeight / 2));
      let el = document.elementFromPoint(x, y);
      if (el && host && (el === host || host.contains(el))) el = document.body;
      for (; el && el !== document.documentElement.parentNode; el = el.parentElement) {
        const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
        if (m && (m[4] === undefined || +m[4] > 0.5)) { const [r, g, b] = [+m[1], +m[2], +m[3]]; return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.42; }
      }
      const cs = getComputedStyle(document.documentElement).colorScheme || '';
      return /dark/.test(cs) && !/light/.test(cs);
    } catch (e) { return false; }
  };
  function ensureHost() {
    if (gone) return;
    const parent = document.fullscreenElement || document.documentElement;
    if (host && host.parentNode === parent) return;
    if (host) { parent.appendChild(host); return; }
    host = document.createElement('ielts-lexi-popup');
    // CSS của trang không được đổi vị trí/hiển thị/màu của phần tử gốc (transform/filter/opacity… làm lệch bảng tra)
    host.style.cssText = 'all:initial !important;position:fixed !important;left:0 !important;top:0 !important;width:0 !important;height:0 !important;display:block !important;z-index:2147483647 !important;transform:none !important;filter:none !important;opacity:1 !important;visibility:visible !important;contain:style !important';
    root = host.attachShadow({ mode: navigator.webdriver ? 'open' : 'closed' }); // 'open' chỉ khi chạy kiểm thử tự động (scripts/test/ext-e2e.mjs)
    // CSS qua adoptedStyleSheets: không bị CSP style-src của trang chặn như thẻ <style>; trình duyệt cũ → thẻ <style>
    let adopted = false;
    try { const sh = new CSSStyleSheet(); sh.replaceSync(CSS); root.adoptedStyleSheets = [sh]; adopted = true; } catch (e) { /* dùng <style> */ }
    root.innerHTML = H(`${adopted ? '' : `<style>${CSS}</style>`}<div class="box" hidden></div><button class="fab" hidden title="${tx('Dịch với Lexkite')}" aria-label="${tx('Dịch với Lexkite')}">🌐</button>`);
    parent.appendChild(host);
    root.addEventListener('mousedown', e => e.stopPropagation());
    // Tra tiếp trong chính bảng tra/dịch (định nghĩa, ví dụ, câu ngữ cảnh, bản dịch): bấm đúp 1 từ tiếng Anh → tra lồng (có nút Quay lại);
    // bôi đen nhiều từ → dịch đoạn đó
    const inBoxSel = () => { const sel = root.getSelection ? root.getSelection() : document.getSelection(); if (!sel || !sel.rangeCount || sel.isCollapsed) return null; const t = sel.toString().trim(); return t && /[A-Za-z]{2}/.test(t) ? { t, range: sel.getRangeAt(0) } : null; };
    root.addEventListener('dblclick', e => {
      if (e.target.closest('button, a, input, select, textarea')) return;
      const s = inBoxSel(); if (!s) return;
      const t1 = nfc(s.t).trim(); if (!/^[A-Za-z][A-Za-z'’-]*$/.test(t1)) return; // chỉ từ tiếng Anh trọn vẹn (không cắt "thử" thành "th")
      const w = t1.toLowerCase();
      if (w.length > 1 && w !== (cur && cur.word)) { e.stopPropagation(); show(w, s.range.getBoundingClientRect(), s.range.startContainer && s.range.startContainer.textContent ? s.range.startContainer.textContent.slice(0, 300) : '', {}, 'nested'); }
    });
    root.addEventListener('mouseup', e => {
      if (e.detail >= 2 || e.target.closest('button, a, input, select, textarea')) return;
      later(() => { const s = inBoxSel(); if (s && s.t.split(/\s+/).length > 1) translateSelection({ text: s.t, range: null, rect: s.range.getBoundingClientRect() }); }, 10);
    });
  }
  const box = () => root.querySelector('.box');
  let onHide = null;
  const hide = () => { if (root) box().hidden = true; current = null; hist = []; cur = null; if (onHide) { const f = onHide; onHide = null; f(); } };
  const hideFab = () => { if (root) root.querySelector('.fab').hidden = true; };

  // Đặt bảng cạnh vùng chọn, luôn nằm trọn trong khung nhìn: ưu tiên bên dưới, không đủ chỗ → lật lên trên,
  // cả hai phía đều thiếu → chọn phía rộng hơn và giới hạn chiều cao (nội dung cuộn trong bảng). Vùng chọn đã cuộn khuất → giữa màn hình.
  function position(rect) {
    const b = box(), vw = window.innerWidth, vh = window.innerHeight, M = 8, G = 10;
    let r = rect || {};
    if (!(r.bottom > 0 && r.top < vh) || (!r.width && !r.height && !r.left && !r.top)) r = { left: vw / 2, right: vw / 2, top: vh / 3, bottom: vh / 3, width: 0, height: 0 };
    const W = Math.min(380, Math.max(240, vw - 2 * M));
    b.style.left = Math.max(M, Math.min(r.left + (r.width || 0) / 2 - W / 2, vw - W - M)) + 'px';
    const place = () => {
      b.style.maxHeight = '';
      const h = b.offsetHeight, below = vh - r.bottom - G - M, above = r.top - G - M;
      let top;
      if (h <= below || below >= above) { top = r.bottom + G; if (h > below) b.style.maxHeight = Math.max(160, below) + 'px'; }
      else { const hh0 = h > above ? Math.max(160, above) : h; if (h > above) b.style.maxHeight = hh0 + 'px'; top = r.top - G - hh0; }
      const hh = Math.min(b.offsetHeight || h, vh - 2 * M);
      b.style.top = Math.max(M, Math.min(top, vh - hh - M)) + 'px';
    };
    place();
    requestAnimationFrame(place);
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
  const cacheAudio = (url, a) => { audioCache.set(url, a); while (audioCache.size > 20) { const k = audioCache.keys().next().value; const old = audioCache.get(k); audioCache.delete(k); if (old !== playing) try { old.src = ''; } catch (e) { /* bỏ qua */ } } }; // giới hạn bộ nhớ trên trang mở lâu
  function preloadAudio(url) {
    if (!url || audioCache.has(url)) return;
    try { const a = new Audio(); a.preload = 'auto'; a.src = url; cacheAudio(url, a); } catch (e) { /* trang chặn media */ }
  }
  function speak(text, url, accent, rate) {
    const tts = () => {
      if (!window.speechSynthesis) return;
      speechSynthesis.cancel();
      if (speechSynthesis.paused) speechSynthesis.resume(); // Chrome đôi khi kẹt ở trạng thái tạm dừng
      // đọc từng câu để giữ ngữ điệu tự nhiên; chờ 1 nhịp sau cancel() để Chrome không bỏ mất lượt đọc
      const go = () => later(() => (String(text).match(/[^.!?;]+[.!?;]*/g) || [text]).forEach(part => {
        const u = new SpeechSynthesisUtterance(part.trim()); u.lang = accent || 'en-GB'; u.rate = rate || prefs.ttsRate || .92;
        const v = bestVoice(u.lang); if (v) u.voice = v;
        speechSynthesis.speak(u);
      }), 30);
      // Lần đầu danh sách giọng chưa tải → chờ (tối đa 0,6 s) để lần đọc đầu cũng dùng đúng giọng tốt nhất như các lần sau
      if (speechSynthesis.getVoices().length) go();
      else { let done = false; const f = () => { if (!done) { done = true; go(); } }; speechSynthesis.addEventListener('voiceschanged', f, { once: true }); later(f, 600); }
    };
    if (playing) { try { playing.pause(); } catch (e) { /* bỏ qua */ } playing = null; }
    if (window.speechSynthesis) speechSynthesis.cancel();
    if (!url) return tts();
    let a; try { a = audioCache.get(url) || new Audio(url); cacheAudio(url, a); } catch (e) { return tts(); }
    let started = false, gaveUp = false;
    const fb = later(() => { if (!started) { gaveUp = true; try { a.pause(); } catch (e) { /* bỏ qua */ } tts(); } }, 700);
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
    if (!alive()) return stop();
    meta = meta || { source: location.href, title: document.title };
    if (mode === 'nested' && cur) hist.push(cur); else if (mode !== 'back') hist = [];
    cur = { word, rect, context, meta };
    if (mode !== 'back') try { send({ type: 'usage', ev: 'lookup' }).catch(() => {}); } catch (x) { /* add-on vừa cập nhật */ } // chỉ đếm số lần – không gửi từ/URL
    ensureHost();
    hideFab();
    const b = box();
    b.hidden = false; b.classList.toggle('dark', pageDark(rect)); b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', word);
    b.innerHTML = H(`<div class="head"><div class="pic">📘</div><div class="f1"><div class="w">${esc(word)}</div><div class="sk w60"></div><div class="sk w40"></div></div></div><div class="body"><div class="sk"></div><div class="sk w80"></div></div>`);
    position(rect);
    current = word; trSeq++; // bảng dịch đoạn đang chờ kết quả không được ghi đè bảng tra từ mới
    const st = (await sget('settings')).settings || {};
    const accent = st.accent || 'en-GB';
    let e = null, saved = false, ctxVi = '', ctxDone = false, mlW = '', didSave = false, spoke = false, note = null;

    // Một giọng thống nhất cho lúc tự đọc và nút UK/US: dùng giọng máy tốt nhất; bản ghi âm tình nguyện viên (chất lượng không đều) chỉ dùng khi máy không có giọng đọc
    // Máy không có giọng đọc tiếng Anh (Linux/ChromeOS thiếu gói giọng…) → nút UK/US/tự đọc dùng bản ghi âm thay vì im lặng
    const hasEnVoice = () => { try { return !!window.speechSynthesis && speechSynthesis.getVoices().some(v => /^en/i.test(v.lang)); } catch (x) { return false; } };
    const audioFor = acc => !e || hasEnVoice() ? '' : acc === 'en-US' ? (e.audioUS || e.audio) : (e.audio && !/-us\.mp3$/.test(e.audio) ? e.audio : '');
    const sayWord = (acc, rate) => speak(e ? e.word : word, rate ? '' : audioFor(acc), acc, rate);
    const paintCtx = () => { ctxDone = true; const el = b.querySelector('.ctxvi'); if (el && current === word) el.textContent = ctxVi ? FLAG(ML()) + ' ' + ctxVi : ''; };

    function render() {
      preloadAudio(audioFor('en-GB')); preloadAudio(audioFor('en-US'));
      // Gom theo từ loại như từ điển lớn: mỗi từ loại = nghĩa Việt + định nghĩa Anh + ví dụ của đúng nghĩa đó
      const POSV = { noun: 'danh từ', verb: 'động từ', adjective: 'tính từ', adverb: 'trạng từ', preposition: 'giới từ', conjunction: 'liên từ', pronoun: 'đại từ', interjection: 'thán từ', determiner: 'từ hạn định', abbreviation: 'viết tắt', phrase: 'cụm từ', 'phrasal verb': 'cụm động từ' };
      const ABBR = { n: 'noun', v: 'verb', adj: 'adjective', adv: 'adverb', prep: 'preposition', conj: 'conjunction', pron: 'pronoun', det: 'determiner', int: 'interjection', excl: 'interjection', abbr: 'abbreviation', 'phr v': 'phrasal verb', 'phr. v.': 'phrasal verb', 'chữ viết tắt': 'abbreviation', 'tiền tố': 'prefix', 'hậu tố': 'suffix', 'mạo từ': 'article', 'trợ động từ': 'auxiliary verb' };
      // Chuẩn hóa nhãn từ loại (Việt / viết tắt / Anh) về 1 khóa tiếng Anh → không tách 2 nhóm "danh từ" và "n", không lộ tiếng Việt ở giao diện khác
      const toEn = x => { x = String(x || '').normalize('NFC').trim().toLowerCase().replace(/\.$/, ''); const hit = Object.keys(POSV).find(k => POSV[k] === x); return hit || ABBR[x] || x; };
      // Nhãn từ loại theo ngôn ngữ giao diện (vi: tiếng Việt; en: tiếng Anh; ngôn ngữ khác: từ điển web, thiếu → tiếng Anh). Không bao giờ lộ tiếng Việt ở giao diện khác
      const posLabel = p => { const v = POSV[p]; const out = UI_LANG === 'vi' ? (v || p) : UI_LANG === 'en' || !v ? p : (XD[v] || p); return UI_LANG !== 'vi' && VI.test(out) ? '' : out; };
      const groups = [], byPos = {};
      const grp = x => byPos[x] || (byPos[x] = groups[groups.push({ pos: x, vi: [], defs: [] }) - 1]);
      (e.senses || []).forEach(x => { grp(toEn(x.pos)).vi = x.terms.slice(0, 4); });
      (e.oxford && e.oxford.length ? e.oxford : e.meanings || []).forEach(m => { const g2 = grp(toEn(m.pos)); if (!g2.defs.length) g2.defs = (m.defs || []).filter(d => d.def).slice(0, 2); });
      // Từ loại có nghĩa Việt nhưng Oxford thiếu định nghĩa (vd. action – động từ) → bù từ dictionaryapi.dev (chỉ cho nhóm đã có)
      if (e.oxford && e.oxford.length) (e.meanings || []).forEach(m => { const g2 = byPos[toEn(m.pos)]; if (g2 && !g2.defs.length) g2.defs = (m.defs || []).filter(d => d.def).slice(0, 2); });
      if (e.def) {
        const p = toEn(e.pos || (groups[0] && groups[0].pos) || 'noun');
        const g2 = grp(p);
        const curDef = { def: e.def, ex: e.ex || '' };
        if (!g2.defs.length || g2.defs[0].def !== e.def) {
          const rest = g2.defs.filter(d => d.def !== e.def && !e.def.includes(d.def));
          g2.defs = [curDef, ...rest].slice(0, 2);
        }
      }
      // Chỉ hiện nhóm có nội dung THẤY ĐƯỢC: nghĩa Việt chỉ hiện ở chế độ tiếng Việt → giao diện khác bỏ nhóm chỉ có nghĩa Việt (tránh tiêu đề "verb" trống)
      const shown = groups.filter(x => x.defs.length || (x.vi.length && ML() === 'vi')).slice(0, 3);
      const hasEx = shown.some(x => x.defs.some(d => d.ex));
      const defs = shown.map(x => `<div class="pg">${posLabel(x.pos) ? `<span class="chip">${esc(posLabel(x.pos))}</span>` : ''}${x.vi.length && ML() === 'vi' ? `<span class="pvi">${esc(x.vi.join(', '))}</span>` : ''}${x.defs.map(d => `<div class="pdef">${linkify(d.def)}${d.ex ? `<span class="pex">“${linkify(d.ex, e.word)}” <button class="spk mini" data-text="${esc(d.ex)}" title="${tx('Nghe câu ví dụ')}">🔊</button></span>` : ''}</div>`).join('')}</div>`).join('');
      const ctxHtml = context ? linkify(context, word) : '';
      const showImg = !!(e.image && /^https:\/\//.test(e.image) && !badImg.has(imgKey(e)));
      const credit = e.imageCredit && e.imageCredit.text && /^https?:\/\//.test(e.imageCredit.link || '') ? e.imageCredit : null;
      b.innerHTML = H(`
        <div class="head">
          ${showImg ? `<div class="pic"><img src="${esc(e.image)}" alt="${esc(e.word)}" referrerpolicy="no-referrer"><button class="noimg" title="${tx('Ảnh không đúng – ẩn ảnh này')}" aria-label="${tx('Ảnh không đúng – ẩn ảnh này')}">✕</button>${credit ? `<a class="pcredit" href="${esc(credit.link)}" target="_blank" rel="noopener noreferrer" title="${esc(credit.text)}" aria-label="${esc(credit.text)}">i</a>` : ''}</div>` : e.emoji ? `<div class="pic">${esc(e.emoji)}</div>` : ''}
          <div class="mw0">
            <div>${hist.length ? `<button class="back" title="${tx('Quay lại từ trước')}">←</button>` : ''}<span class="w">${esc(e.word)}</span>${e.pos && posLabel(toEn(e.pos)) ? `<span class="chip">${esc(UI_LANG === 'vi' ? e.pos : posLabel(toEn(e.pos)))}</span>` : ''}${e.level ? `<span class="chip lv" title="CEFR">${esc(e.level)}</span>` : ''}${saved || didSave ? `<span class="chip inDeck">${tx('✓ Đã trong sổ thẻ')}</span>` : ''}</div>
            <div class="ipa">${esc(e.ipa || '')}${e.ipaUS && e.ipaUS !== e.ipa ? ` · <span title="${tx('Anh–Mỹ')}">${esc(e.ipaUS)}</span>` : ''}</div>
            <div class="spks"><button class="spk" data-acc="en-GB" title="${tx('Nghe giọng Anh–Anh (phím P)')}">🔊 UK</button><button class="spk" data-acc="en-US" title="${tx('Nghe giọng Anh–Mỹ')}">🔊 US</button><button class="spk" data-slow title="${tx('Nghe chậm')}">🐢</button></div>
            <div class="vi" dir="auto">${ML() === 'vi' ? esc(viMain(e, shown)) : esc(mlW)}</div>
          </div>
        </div>
        <div class="body">
          ${defs || (e.def ? `<div class="def">${linkify(e.def)}</div>` : '')}
          ${note && UI_LANG === 'vi' ? `<div class="wn-x"><div>💡 ${esc(note.m)}</div><div>⚠️ ${esc(note.e)}</div></div>` : ''}
          ${e.ex && !hasEx ? `<div class="ex">“${linkify(e.ex, e.word)}” <button class="spk mini" data-text="${esc(e.ex)}" title="${tx('Nghe câu ví dụ')}">🔊</button></div>` : ''}
          ${ctxHtml ? `<div class="ctx"><b>${tx('📌 Ngữ cảnh sẽ lưu')}</b> <button class="spk mini" data-text="${esc(context)}" title="${tx('Nghe cả câu')}">🔊</button><button class="spk mini" data-text="${esc(context)}" data-rate="0.65" title="${tx('Nghe chậm')}">🐢</button><br>${ctxHtml}<div class="ctxvi ex mt4">${ctxVi ? FLAG(ML()) + ' ' + esc(ctxVi) : ML() === 'en' || ctxDone ? '' : tx('⏳ Đang dịch câu…')}</div></div>` : ''}
          ${e.partial ? '<div class="sk w50 mt8"></div>' : ''}
        </div>
        <div class="foot">
          <button class="btn p" id="save" ${didSave || (saved && !context) ? 'disabled' : ''}>${didSave ? tx('✓ Đã lưu vào flashcard') : saved ? (context ? tx('+ Thêm ngữ cảnh') : tx('✓ Đã lưu')) : tx('+ Lưu flashcard')}</button>
          <button class="btn" id="more">${tx('Chi tiết')}</button>${/^[a-z][a-z'-]*$/i.test(e.word) ? `<button class="btn" id="usage" title="${tx('Giới từ đi kèm, to-V/V-ing, trạng từ, từ dễ nhầm')}">📘 ${tx('Cách dùng')}</button>` : ''}
          <button class="x" id="close" title="${tx('Đóng (Esc)')}">×</button>
        </div>`);
      const img = b.querySelector('.pic img');
      // Ảnh bị chặn bởi CSP của trang (img-src chỉ cho tên miền của trang, nhiều trang chặn cả data:) → service worker tải ảnh,
      // content script giải mã và VẼ lên <canvas> (vẽ canvas không đi qua img-src nên CSP không chặn được); vẫn lỗi → emoji / bỏ ô ảnh
      const noPic = () => { const p = img && img.parentElement; if (!p) return; if (e.emoji) p.textContent = e.emoji; else p.remove(); };
      const nb = b.querySelector('.pic .noimg');
      if (nb) nb.onclick = ev => { ev.stopPropagation(); badImg.add(imgKey(e)); try { sset({ badImg: [...badImg].slice(-500) }); } catch (x) { /* bỏ qua */ } const p = nb.parentElement; if (e.emoji) p.textContent = e.emoji; else p.remove(); };
      if (img) img.onerror = () => {
        if (img.dataset.retried) return noPic(); img.dataset.retried = 1;
        const want = e.image;
        send({ type: 'imgData', url: want }).then(async r => {
          if (!r || !r.data || !img.isConnected || e.image !== want) return noPic();
          const bin = atob(r.data.slice(r.data.indexOf(',') + 1)), u8 = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
          const bmp = await createImageBitmap(new Blob([u8], { type: (r.data.match(/^data:([^;,]+)/) || [])[1] || 'image/jpeg' }));
          const cv = document.createElement('canvas'), S = 128, k = Math.max(S / bmp.width, S / bmp.height); // phủ kín ô như object-fit: cover
          cv.width = S; cv.height = S; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', e.word);
          cv.getContext('2d').drawImage(bmp, (S - bmp.width * k) / 2, (S - bmp.height * k) / 2, bmp.width * k, bmp.height * k);
          if (bmp.close) bmp.close();
          if (img.isConnected) img.replaceWith(cv);
        }).catch(noPic);
      };
      b.querySelectorAll('.spk[data-acc]').forEach(x => x.onclick = () => sayWord(x.dataset.acc));
      b.querySelector('.spk[data-slow]').onclick = () => sayWord(accent, 0.55);
      b.querySelectorAll('.spk[data-text]').forEach(x => x.onclick = () => speak(x.dataset.text, '', accent, +(x.dataset.rate || 0.95)));
      b.querySelector('#close').onclick = hide;
      bindNav(b);
      b.querySelector('#more').onclick = () => send({ type: 'openApp', hash: '#/dict/' + encodeURIComponent(e.word) }).catch(() => {});
      const ub = b.querySelector('#usage'); if (ub) ub.onclick = () => send({ type: 'openApp', hash: '#/usage/' + encodeURIComponent(e.word.toLowerCase()) }).catch(() => {}); // 📘 Cách dùng từ (trang app trong gói add-on, không cần quyền mới)
      b.querySelector('#save').onclick = async ev => {
        const btn = ev.currentTarget;
        btn.disabled = true;
        // Bấm lưu khi mới có bản tra nhanh (chưa có ảnh/câu ví dụ/âm thanh) → chờ bản đầy đủ (tối đa 8 giây) để thẻ không thiếu trường
        let src = e;
        if (src.partial) { try { const r = await Promise.race([full, new Promise(res => later(res, 8000))]); if (r && r.entry && r.entry.found && r.entry.word === src.word) src = r.entry; } catch (x) { /* dùng bản nhanh */ } }
        const { meanings, oxford, senses, found, audioUS, partial, _imgTry, _t, _v, ...entry } = src;
        const okImg = !!(entry.image && !badImg.has(imgKey(src))); // ảnh người dùng đã báo sai không vào thẻ
        try {
          const r = await send({ type: 'save', entry: { ...entry, image: okImg ? entry.image : '', imageCredit: okImg ? entry.imageCredit || null : null, audio: audioFor(accent) }, context: ctxOut(context, ctxVi, meta) });
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
      if (!vi) { try { vi = ((await send({ type: 'translate', text: word, tl: ML(), sl: srcLang(word) })) || {}).vi || ''; } catch (x) { vi = ''; } }
      if (current !== word) return;
      const multi = /\s/.test(word);
      // Tên riêng: trong câu gốc viết hoa mà không đứng đầu câu (Switzerland, London…)
      const capW = word.replace(/\b[a-z]/g, c => c.toUpperCase());
      const toks = (context || '').split(/\s+/);
      const proper = !multi && toks.some((t, i) => i > 0 && t.replace(/[^A-Za-z'-]/g, '') === capW && !/[.!?:"“]$/.test(toks[i - 1]));
      const shown = proper ? capW : word;
      b.innerHTML = H(`
        <div class="head"><div class="pic">${proper ? '📍' : multi ? '💬' : '📘'}</div><div class="mw0">
          <div>${hist.length ? `<button class="back" title="${tx('Quay lại')}">←</button>` : ''}<span class="w">${esc(shown)}</span><span class="chip">${tx(proper ? 'tên riêng' : multi ? 'cụm từ' : 'từ')}</span></div>
          <div class="spks"><button class="spk" data-say="1">${tx('🔊 Nghe')}</button><button class="spk" data-slow>🐢</button></div>
          <div class="vi">${esc(vi || '—')}</div></div></div>
        <div class="body">
          ${multi ? `<div class="def"><b>${tx('Tra từng từ:')}</b> ${word.split(/\s+/).map(x => `<span class="lw chipw" data-w="${esc(x)}">${esc(x)}</span>`).join(' ')}</div>` : `<div class="def">${proper ? tx('Tên riêng (địa danh, người, tổ chức…) – không có trong từ điển phổ thông.') : tx('Chưa có trong từ điển – đã dịch tự động.')}</div>`}
          ${context ? `<div class="ctx"><b>${tx('📌 Ngữ cảnh')}</b> <button class="spk mini" data-text="${esc(context)}" title="${tx('Nghe cả câu')}">🔊</button><button class="spk mini" data-text="${esc(context)}" data-rate="0.65" title="${tx('Nghe chậm')}">🐢</button><br>${linkify(context, word)}<div class="ctxvi ex mt4">${ctxVi ? FLAG(ML()) + ' ' + esc(ctxVi) : ''}</div></div>` : ''}
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
          const r = await send({ type: 'save', entry: { word, vi, pos: multi ? 'phrase' : '', emoji: '💬' }, context: ctxOut(context, ctxVi, meta) });
          if (!r || r.error) throw new Error();
          btn.textContent = tx('✓ Đã lưu vào flashcard');
        } catch (x) { btn.disabled = false; btn.textContent = tx('⚠️ Thử lưu lại'); }
      };
      position(rect);
      if (st.autoSpeak !== false) speak(word, '', accent);
    }

    // Nghĩa tiếng mẹ đẻ: mảnh nghĩa của kho (cùng nguồn với web/app – Lex) trước; từ ngoài kho mới dịch máy lúc chạy
    const paintMl = m => { mlW = m || ''; const el = b.querySelector('.vi'); if (el && current === word && mlW.toLowerCase() !== word.toLowerCase()) el.textContent = mlW; };
    if (ML() !== 'vi' && ML() !== 'en') send({ type: 'mean', word, lang: ML() }).then(r => (r && r.mean ? paintMl(r.mean[0]) : send({ type: 'translate', text: word, tl: ML() }).then(t2 => paintMl(t2 && t2.vi)))).catch(() => {});
    // Dịch câu ngữ cảnh: không phản hồi sau 10 giây (mạng chậm / add-on vừa nạp lại) → bỏ dòng "Đang dịch câu…" thay vì treo mãi
    if (context && ML() !== 'en') { const ctxT = later(paintCtx, 10000); send({ type: 'translate', text: context, tl: ML() }).then(r => { clearTimeout(ctxT); ctxVi = (r && r.vi) || ''; paintCtx(); }).catch(() => { clearTimeout(ctxT); paintCtx(); }); }
    const full = send({ type: 'lookup', word });
    full.catch(() => {}); // tránh lỗi "Uncaught (in promise)" khi add-on vừa được cập nhật
    let q;
    try { q = await send({ type: 'quick', word }); }
    catch (err) { b.innerHTML = H(`<div class="muted">${tx('Add-on vừa được cập nhật – hãy tải lại trang.')}</div>`); return; }
    if (current !== word) return;
    send({ type: 'notes', word }).then(r => { note = r && r.note; if (note && e && current === word) render(); }).catch(() => {});
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
    const t = node.nodeValue, W = /[\p{L}\p{M}'’-]/u; // mọi chữ Unicode + dấu tổ hợp: café, naïve, "thử" không bị cắt thành "caf", "na", "th"
    let a = off, b = off;
    if (a > 0 && !W.test(t[a] || '') && W.test(t[a - 1])) { a--; b--; }
    while (a > 0 && W.test(t[a - 1])) a--;
    while (b < t.length && W.test(t[b])) b++;
    let word = t.slice(a, b).replace(/^['’-]+|['’-]+$/g, '');
    // Từ tiếng Việt (Kiểm, thử…) không phải từ tiếng Anh để tra → bỏ qua thay vì tra một mẩu bị cắt
    if (!/^[A-Za-z\u00c0-\u024f][A-Za-z\u00c0-\u024f'’-]*$/.test(word) || !/[A-Za-z]/.test(word) || VI_ONLY.test(nfc(word)) || /[×÷]/.test(word) || word.length > 30) return null;
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
  // Đoạn chọn có chữ ngoài tiếng Anh (Latin có dấu, chữ Việt có dấu chồng U+1E00–U+1EFF, Cyrillic, Ả Rập, CJK…) → để Google tự nhận
  // ngôn ngữ nguồn thay vì ép "en". Luôn chuẩn hóa NFC và dùng lớp Unicode \p{L}\p{M} (không dùng A-Za-z / \u00c0-\u024f: "thử" bị cắt thành "th").
  const nfc = s => String(s == null ? '' : s).normalize('NFC');
  const srcLang = t => (/[^\x00-\x7f]/.test(nfc(t).replace(/[\s\p{P}\p{S}\p{N}]/gu, '')) ? 'auto' : 'en');
  const VI_ONLY = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i; // chữ chỉ tiếng Việt có (â ê ô có cả trong tiếng Pháp)
  // "Tra từng từ": chỉ từ tiếng Anh (chữ Latin không dấu), bỏ từ chức năng, bỏ mã chữ+số (E2E, v2), giữ từ nối gạch (add-on) và viết tắt (API)
  const STOP = new Set(("a an the and or but nor so yet if then than as of to in on at by for from with without into onto over under about above below up down out off " +
    "is am are was were be been being do does did done have has had having not no yes it its this that these those there here i me my mine you your yours he him his she her hers " +
    "we us our ours they them their theirs what which who whom whose when where why how all any both each few more most other some such only own same too very can could will would " +
    "shall should may might must just also now s t d ll re ve m don doesn didn isn aren wasn weren won wouldn can't don't doesn't didn't isn't aren't wasn't weren't won't i'm it's that's let's").split(' '));
  // Âm tiết tiếng Việt viết không dấu hay gặp (khi đoạn chọn có tiếng Việt) – không đưa vào ô tra từ tiếng Anh
  const VI_ASCII = /^(ngh?|nh|kh)[a-z]|[aeiouy]nh$|^(va|la|cua|cho|mot|cac|nhung|duoc|trong|khong|thi|da|se|dang|voi|ve|tu|tai|neu|nen|roi|nhu|cung|nay|thu|kiem|tra|loi|bai|tieng|viet|nguoi|lam|di|den|ra|vao|nhieu)$/;
  function lookupWords(text, max = 10) {
    const s = nfc(text), hasVi = VI_ONLY.test(s), out = [], seen = new Set();
    const toks = [...s.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}\p{N}]+)*/gu)].map(m => m[0].replace(/’/g, "'"));
    const viTok = i => i < 0 || i >= toks.length || /[^\x00-\x7f]/.test(toks[i]); // từ có dấu (hoặc đầu/cuối đoạn)
    for (let i = 0; i < toks.length; i++) {
      const w = toks[i];
      if (!/^[A-Za-z]+(?:['-][A-Za-z]+)*$/.test(w)) continue; // có dấu (Kiểm, thử), số, chữ khác hệ → bỏ, không cắt chữ
      const k = w.toLowerCase();
      // Đoạn có tiếng Việt: âm tiết không dấu ngắn kẹp giữa hai từ tiếng Việt ("rất quan trọng") là tiếng Việt, không phải từ tiếng Anh
      if (hasVi && (VI_ASCII.test(k) || (k.length <= 5 && viTok(i - 1) && viTok(i + 1)))) continue;
      if (k.length < 2 || STOP.has(k) || seen.has(k)) continue;
      seen.add(k); out.push({ w: k, label: /^[A-Z]{2,}$/.test(w) ? w : k });
      if (out.length >= max) break;
    }
    return out;
  }
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
    const rects = info.range ? info.range.getClientRects() : [];
    const last = rects[rects.length - 1] || info.rect;
    f.style.left = Math.min(window.innerWidth - 44, last.right + 6) + 'px';
    f.style.top = Math.min(window.innerHeight - 44, last.bottom + 6) + 'px';
    f.hidden = false;
    f.onclick = () => {
      f.hidden = true;
      if (isWordish(info.text)) show(info.text.toLowerCase(), info.rect, info.range ? sentenceAround(info.range) : info.context || '');
      else translateSelection(info, { focus: true });
    };
  }

  // Tên ngôn ngữ theo giao diện (Intl) cho chú thích chip "VI → EN"
  const langName = l => { try { return new Intl.DisplayNames([UI_LANG === 'zh' ? 'zh-CN' : UI_LANG], { type: 'language' }).of(l) || l; } catch (e) { return l; } };
  const langCode = l => String(l || '').split('-')[0].toUpperCase();
  const setLangChip = (el, src, tl, same) => {
    if (!el) return;
    el.textContent = same ? langCode(src || tl) : `${src ? langCode(src) : '…'} → ${langCode(tl)}`;
    el.title = `${tx('Ngôn ngữ nhận diện → ngôn ngữ dịch')}: ${src ? langName(src) : '?'}${same ? '' : ' → ' + langName(tl)}`;
  };
  // 🤖 AI có sẵn trong Chrome (Gemini Nano) gọi ngay trong tab: chỉ dùng khi đã tải sẵn ('available'); 'downloadable' → nút bật 1 chạm
  const NANO_OPTS = { expectedInputs: [{ type: 'text', languages: ['en'] }], expectedOutputs: [{ type: 'text', languages: ['en'] }] };
  const nanoAPI = () => { try { return window.LanguageModel || null; } catch (e) { return null; } };
  const nanoState = async () => { const LM = nanoAPI(); if (!LM || !LM.availability) return 'none'; try { return await LM.availability(NANO_OPTS); } catch (e) { return 'none'; } };
  const LIMIT = (p, ms) => Promise.race([p, new Promise((_, rej) => later(() => rej(new Error('timeout')), ms))]);
  const NANO_PROMPT = (text, sentence) => `Explain the English expression for an English learner. Expression: "${text}"${sentence && sentence !== text ? `\nSentence it appears in: "${sentence}"` : ''}
Return ONLY JSON: {"meaning": string (meaning in THIS context, simple English), "structure": [{"pattern": string, "explain": string}] (1-3 items), "grammar": string, "collocations": [string] (3-5), "examples": [{"en": string}] (2), "tip": string (how to use it in exams)}`;
  async function nanoRun(text, sentence) {
    const sess = await LIMIT(nanoAPI().create(NANO_OPTS), 15000);
    try { const out = String(await LIMIT(sess.prompt(NANO_PROMPT(text, sentence)), 30000)); const j = JSON.parse(out.replace(/^[^{]*/, '').replace(/[^}]*$/, '')); return j && (j.meaning || j.grammar || (j.structure || []).length) ? j : null; }
    finally { try { sess.destroy(); } catch (e) { /* bỏ qua */ } }
  }
  // Người dùng bấm "Bật AI trên máy": tải mô hình có tiến độ (cần thao tác người dùng → gọi create ngay trong sự kiện bấm)
  async function enableNano(btn, done) {
    btn.disabled = true; btn.textContent = tx('⬇️ Đang tải AI trên máy… {pct}%', { pct: 0 });
    try {
      const LM = nanoAPI();
      if (LM && LM.create) { const s = await LM.create({ ...NANO_OPTS, monitor(m) { m.addEventListener('downloadprogress', e => { btn.textContent = tx('⬇️ Đang tải AI trên máy… {pct}%', { pct: Math.round((e.loaded || 0) * 100) }); }); } }); try { s.destroy(); } catch (e) { /* bỏ qua */ } }
      else { const r = await send({ type: 'nanoEnable' }); if (!r || !r.ok) throw new Error('nano'); }
      btn.textContent = tx('✓ AI trên máy đã sẵn sàng'); if (done) done();
    } catch (e) { btn.disabled = false; btn.textContent = tx('Không bật được AI trên máy – thử lại sau.'); }
  }
  // Mã lỗi AI (background.js aiExplain) → lời nhắn thân thiện. Không bao giờ nhắc nhập khóa: AI miễn phí không cần khóa.
  const AI_ERR = { QUOTA_DAY: 'Hết lượt AI miễn phí hôm nay – thử lại vào ngày mai.', BUSY: 'AI đang bận – thử lại sau ít phút.', QUOTA: 'AI đang bận – thử lại sau ít phút.', OFFLINE: 'AI không dùng được khi ngoại tuyến – kết nối mạng rồi thử lại.' };

  let trSeq = 0;
  async function translateSelection(info, opts = {}) {
    ensureHost();
    hideFab();
    const b = box(), seq = ++trSeq, text = nfc(info.text).replace(/\s+/g, ' ').trim();
    const live = () => seq === trSeq && !b.hidden;
    b.hidden = false; b.classList.toggle('dark', pageDark(info && info.rect));
    b.setAttribute('role', 'dialog'); b.setAttribute('aria-label', tx('🌐 Dịch đoạn đã chọn').replace(/^\S+\s+/, '')); b.tabIndex = -1;
    current = info.text;
    const sl = srcLang(text), hint = sl === 'auto' && VI_ONLY.test(text) ? 'vi' : '', tl = ML();
    let sentence = ''; try { sentence = info.range ? sentenceAround(info.range) : ''; } catch (e) { /* bỏ qua */ }
    const words = text.split(' ').length > 1 ? lookupWords(text) : [];
    const st = (await sget('settings').catch(() => ({}))).settings || {};
    const accent = st.accent || 'en-GB';
    if (!live()) return;
    b.innerHTML = H(`
      <div class="tr-head"><b>${tx('🌐 Dịch đoạn đã chọn')}</b><span class="chip lchip" id="lang"></span><button class="x" id="close" title="${esc(tx('Đóng (Esc)'))}" aria-label="${esc(tx('Đóng (Esc)'))}">×</button></div>
      <div class="body">
        <div class="src"${sl === 'en' ? ' lang="en"' : hint ? ' lang="vi"' : ''}>${esc(text)}</div>
        <div class="tr" id="tr" aria-live="polite" aria-busy="true"><div class="sk w80"></div><div class="sk w50"></div><span class="sr">${tx('⏳ Đang dịch…')}</span></div>
        ${words.length ? `<div class="def mt8"><b>${tx('Tra từng từ:')}</b> ${words.map(x => `<button type="button" class="lw chipw" data-w="${esc(x.w)}" lang="en">${esc(x.label)}</button>`).join(' ')}</div>` : ''}
        <div id="more"></div>
        <div id="aiEx"></div>
      </div>
      <div class="foot">
        <button class="btn p" id="deep" title="${esc(tx('Giải thích nghĩa trong ngữ cảnh, cấu trúc, collocation, ví dụ'))}">${tx('🤖 Giải thích sâu')}</button>
        <button class="btn" id="listen" title="${esc(tx('Nghe cả câu'))}">${tx('🔊 Nghe')}</button>
        <button class="btn" id="slow" title="${esc(tx('Nghe chậm'))}">${tx('🐢 Chậm')}</button>
        <button class="btn ic end" id="copy" title="${esc(tx('Chép bản dịch'))}" aria-label="${esc(tx('Chép bản dịch'))}">📋</button>
      </div>`);
    const $ = q => b.querySelector(q);
    setLangChip($('#lang'), sl === 'en' ? 'en' : hint, tl);
    $('#close').onclick = () => { if (window.speechSynthesis) speechSynthesis.cancel(); hide(); };
    b.querySelectorAll('.lw[data-w]').forEach(x => x.onclick = ev => { ev.stopPropagation(); const w = x.dataset.w.replace(/[^a-z'-]/g, ''); if (w) show(w, info.rect, sentence || text, {}, 'nested'); });
    ['#deep', '#listen', '#slow', '#copy'].forEach(q => { $(q).disabled = true; });
    position(info.rect);
    if (opts.focus) try { b.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }

    let r;
    try { r = await send({ type: 'translate', text, tl, sl, hint }); } catch (e) { r = { dead: true }; }
    if (!live()) return;
    r = r || {};
    const trEl = $('#tr'); trEl.removeAttribute('aria-busy');
    const vi = String(r.vi || '').trim(), same = !!r.same, src = r.src || (sl === 'en' ? 'en' : hint), tlUsed = r.tl || tl;
    if (r.dead) { trEl.innerHTML = H(`<div class="err">${tx('Add-on vừa được cập nhật – hãy tải lại trang.')}</div>`); return position(info.rect); }
    if (same) { setLangChip($('#lang'), src || 'en', tlUsed, true); trEl.innerHTML = H(`<div class="note">${esc(tx('Đoạn này đã là tiếng Anh – nghe, tra từng từ hoặc xem giải thích sâu bên dưới.'))}</div>`); }
    else if (vi) { setLangChip($('#lang'), src, tlUsed); trEl.innerHTML = H(`<div lang="${esc(tlUsed)}">${esc(vi)}</div>${tlUsed !== tl ? `<div class="note">${esc(tx('Đoạn này đã ở ngôn ngữ của bạn nên được dịch sang tiếng Anh.'))}</div>` : ''}`); }
    else { // không bao giờ để trống: báo lỗi rõ ràng + thử lại
      trEl.innerHTML = H(`<div class="err" role="alert">${esc(tx('Không dịch được đoạn này.'))}</div><button class="st-l" id="retry">↻ ${tx('Thử lại')}</button>`);
      $('#retry').onclick = ev => { ev.stopPropagation(); translateSelection(info, { focus: true }); };
    }
    // Phần tiếng Anh để nghe / giải thích: đoạn gốc nếu là tiếng Anh, bản dịch nếu đã dịch sang tiếng Anh
    const english = src === 'en' || same ? text : (tlUsed === 'en' && vi ? vi : '');
    for (const q of ['#deep', '#listen', '#slow']) { $(q).disabled = false; $(q).hidden = !english; }
    $('#copy').disabled = false;
    const say = rate => speak(english, '', accent, rate);
    $('#listen').onclick = () => say(.95);
    $('#slow').onclick = () => say(.6);
    $('#copy').onclick = async ev => {
      const btn = ev.currentTarget, val = vi || text; let done = false;
      try { await navigator.clipboard.writeText(val); done = true; } catch (e) { // trang chặn Clipboard API → cách cũ
        try { const ta = document.createElement('textarea'); ta.value = val; ta.className = 'sr'; ta.setAttribute('readonly', ''); root.appendChild(ta); ta.select(); done = document.execCommand('copy'); ta.remove(); } catch (x) { /* bỏ qua */ }
      }
      if (!done) return;
      btn.textContent = '✓'; btn.title = tx('✓ Đã chép'); btn.setAttribute('aria-label', tx('✓ Đã chép'));
      later(() => { if (!btn.isConnected) return; btn.textContent = '📋'; btn.title = tx('Chép bản dịch'); btn.setAttribute('aria-label', tx('Chép bản dịch')); }, 1600);
    };
    const deep = $('#deep');
    const runDeep = async () => {
      const out = $('#aiEx'), sen = english === text ? sentence : ''; deep.disabled = true;
      out.innerHTML = H(`<div class="tiny mt8" role="status">${tx('⏳ AI đang phân tích…')}</div>`); position(info.rect);
      const ns = await nanoState(); let x = null;
      if (ns === 'available') { try { const j = await nanoRun(english, sen); if (j) x = await send({ type: 'explain', text: english, sentence: sen, lang: ML(), local: j }); } catch (e) { x = null; } }
      if (!x || !x.result) { try { x = await send({ type: 'explain', text: english, sentence: sen, lang: ML() }); } catch (e) { x = { error: 'FAILED' }; } }
      if (!live()) return;
      deep.disabled = false; x = x || { error: 'FAILED' };
      const offer = ns === 'downloadable' || ns === 'downloading' || x.nano === 'downloadable' || x.nano === 'downloading';
      const nanoBtn = offer ? `<button class="st-l" id="nanoOn" title="${esc(tx('Chrome tải AI trên máy một lần (~2 GB) – sau đó dùng được cả khi ngoại tuyến.'))}">${tx('⚡ Bật AI trên máy (miễn phí, riêng tư)')}</button>` : '';
      if (!x.result) {
        const retry = x.error === 'QUOTA_DAY' ? '' : `<button class="st-l" id="aiRetry">↻ ${tx('Thử lại')}</button>`;
        out.innerHTML = H(`<div class="note mt8" role="status">${esc(tx(AI_ERR[x.error] || 'Không phân tích được lúc này.'))}${retry || nanoBtn ? `<div class="acts">${retry}${nanoBtn}</div>` : ''}</div>`);
      } else {
        const y = x.result || {};
        const via = x.via === 'device' ? tx('💻 AI trên máy – riêng tư, không gửi đi đâu') : typeof x.left === 'number' ? tx('🎁 Còn {n} lượt AI miễn phí hôm nay', { n: x.left }) : '';
        out.innerHTML = H(`<div class="st ai">
          <b>${tx('🤖 Giải thích sâu')}</b>
          ${y.meaning ? `<div class="st-v"><b>${tx('Nghĩa trong ngữ cảnh:')}</b> ${esc(y.meaning)}</div>` : ''}
          ${(y.structure || []).map(z => `<div class="st-i"><span class="st-n">${esc(z.pattern)}</span><div class="st-v">${esc(z.explain)}</div></div>`).join('')}
          ${y.grammar ? `<div class="st-v"><b>${tx('Ngữ pháp:')}</b> ${esc(y.grammar)}</div>` : ''}
          ${(y.collocations || []).length ? `<div class="st-v"><b>${tx('Cụm hay đi kèm:')}</b> ${y.collocations.map(c => `<span class="chipw" lang="en">${esc(c)}</span>`).join(' ')}</div>` : ''}
          ${(y.examples || []).filter(e => e && e.en).map(e => `<div class="ex"><span lang="en">“${esc(e.en)}”</span> <button class="spk mini" data-text="${esc(e.en)}" aria-label="${esc(tx('Nghe câu ví dụ'))}">🔊</button>${e.vi && e.vi !== e.en ? `<div class="tiny">${esc(e.vi)}</div>` : ''}</div>`).join('')}
          ${y.tip ? `<div class="st-v">💡 ${esc(y.tip)}</div>` : ''}
          ${via || nanoBtn ? `<div class="tiny">${esc(via)} ${nanoBtn}</div>` : ''}</div>`);
        out.querySelectorAll('.spk[data-text]').forEach(z => z.onclick = () => speak(z.dataset.text, '', accent, .95));
      }
      const rt = out.querySelector('#aiRetry'); if (rt) rt.onclick = ev => { ev.stopPropagation(); runDeep(); };
      const nb = out.querySelector('#nanoOn'); if (nb) nb.onclick = ev => { ev.stopPropagation(); enableNano(nb, x.result ? null : runDeep); };
      position(info.rect);
    };
    deep.onclick = runDeep;
    // Cấu trúc ngữ pháp (chỉ phân tích phần tiếng Anh)
    const structs = english && window.VBStruct ? VBStruct.analyze(english, 4) : [];
    if (structs.length && !GT) { try { GT = ((await send({ type: 'extJson', name: 'grammar-titles' })) || {}).data || {}; } catch (e) { GT = {}; } }
    if (!live()) return;
    if (structs.length) {
      $('#more').innerHTML = H(`<div class="st"><b>${tx('🧩 Cấu trúc trong đoạn')}</b>${structs.map(x => `<div class="st-i"><div><span class="st-n">${esc(tx(x.name))}</span> <span class="st-m" lang="en">“${esc(x.match)}”</span></div>${UI_LANG === 'vi' || tx(x.vi) !== x.vi ? `<div class="st-v">${esc(tx(x.vi))}</div>` : ''}<button class="st-l" data-lesson="${esc(x.lesson)}">${GT && GT[x.lesson] ? '📖 ' + tx('Học bài: {n} →', { n: esc(UI_LANG === 'vi' ? GT[x.lesson][0] : GT[x.lesson][1]) }) : tx('📐 Học bài ngữ pháp này →')}</button></div>`).join('')}</div>`);
      b.querySelectorAll('[data-lesson]').forEach(x => x.onclick = () => send({ type: 'openApp', hash: '#/grammar/' + x.dataset.lesson }).catch(() => {}));
    }
    position(info.rect);
  }

  const fromHost = e => host && e.composedPath && e.composedPath().includes(host);
  // Trên chính web app Lexkite: từ đã có bảng tra riêng (.tw) và nút lưu cụm riêng → tiện ích nhường, tránh hiện 2 bảng
  const OWN_APP = /^(www\.)?lexkite\.com$|^lexkite\.pages\.dev$|^(vocaband|ielts-lexi-2026)\.web\.app$|^localhost$/.test(location.hostname);
  // Đang làm BÀI THI trên lexkite.com (thi thử, đề TOEIC/TOEFL, kiểm tra đầu vào, phòng thi máy tính) → khóa tra/dịch để kết quả đo đúng trình độ;
  // học và luyện tập thì vẫn tra/dịch bình thường
  const EXAM_ROUTES = /^#\/(mock|toeic-test|listen-test|toefl-p|cbt|placement)(\/|\?|$)/;
  const inExam = el => OWN_APP && (EXAM_ROUTES.test(location.hash) || !!(el && el.closest && el.closest('.cbt, .mk-read, .mk-write, .mk-qs, [data-exam]')));
  const appHandles = (el, sel) => OWN_APP && el && el.closest && !!(el.closest('.tw, .pop, .sel-fab, .sel-bar, .sel-pop, [data-own-lookup]') || (sel && el.closest('#view')));

  function onDbl(e) {
    if (!alive() || !enabled || inEditable(e.target) || fromHost(e) || appHandles(e.target) || inExam(e.target)) return;
    // Trên chính lexkite.com: web app tự hiện thanh "Tra nghĩa" (.sel-bar) cho vùng chọn trong nội dung → nhường để không hiện 2 bảng;
    // nơi web app không tra (trang chào mừng, đầu trang…) thì tiện ích tra như mọi trang khác.
    if (OWN_APP && !e.lkDeferred) { const ev = { clientX: e.clientX, clientY: e.clientY, target: e.target, lkDeferred: true }; later(() => { const b = document.querySelector('.sel-bar'); if (!(b && !b.hidden)) onDbl(ev); }, 80); return; }
    const pt = wordAtPoint(e.clientX, e.clientY);
    if (pt) {
      const sel = window.getSelection(); try { sel.removeAllRanges(); sel.addRange(pt.range); } catch (x) { /* bỏ qua */ }
      return show(pt.word, pt.rect, sentenceAround(pt.range));
    }
    const s = fromSelection();
    if (s) show(s.word, s.rect, s.context);
  }
  bind(document, 'dblclick', onDbl);
  bind(document, 'mouseup', onUp);
  // boot.js (mồi) chèn file này khi người dùng thao tác lần đầu → phát lại đúng thao tác đó
  window[NS].replay = guard((type, e) => (type === 'dblclick' ? onDbl(e) : onUp(e)));
  function onUp(e) {
    if (!alive() || fromHost(e) || e.button !== 0 || appHandles(e.target) || inExam(e.target)) return;
    // Ô nhập chữ (bài viết, điền từ…): bôi đen → nút 🌐 để dịch (không tự dịch, không chặn việc gõ)
    const fld = e.target && e.target.closest && e.target.closest('textarea, input[type="text"], input[type="search"], input:not([type])');
    if (fld) {
      if (selectMode === 'off') return;
      later(() => {
        const t = String(fld.value || '').slice(fld.selectionStart || 0, fld.selectionEnd || 0).trim();
        if (!t || t.length > 3000 || !/[A-Za-z]{2}/.test(t)) return;
        const r = fld.getBoundingClientRect(), rect = { left: Math.min(e.clientX, r.right - 10), right: Math.min(e.clientX, r.right - 10), top: e.clientY - 10, bottom: e.clientY + 6, width: 0, height: 16 };
        showFab({ text: t, range: null, rect, context: t });
      }, 10);
      return;
    }
    if (inEditable(e.target)) return;
    // Đợi trình duyệt cập nhật vùng chọn. Trên lexkite.com: nhường khi web app đã hiện thanh "Tra nghĩa/Dịch" (.sel-bar);
    // nơi web không dịch (trang chào mừng, trang "bare") thì tiện ích dịch như mọi trang khác.
    later(() => {
      if (OWN_APP) { const sb = document.querySelector('.sel-bar'); if (sb && !sb.hidden) return; }
      if (e.altKey) { const s = fromSelection(); if (s && enabled) show(s.word, s.rect, s.context); return; }
      if (e.detail >= 2 || selectMode === 'off') return; // bấm đúp do dblclick xử lý
      const info = selectionInfo();
      if (!info) return;
      if (selectMode === 'auto' && !isWordish(info.text)) translateSelection(info);
      else showFab(info);
    }, OWN_APP ? 80 : 10);
  }
  bind(document, 'mousedown', e => {
    if (!alive() || fromHost(e)) return;
    if (root) { hideFab(); if (!box().hidden) hide(); }
  });
  bind(document, 'keydown', e => {
    if (!root || !alive()) return; // bản cũ sau khi add-on cập nhật: không bắt phím P/Esc của trang nữa
    if (e.key === 'Escape') { if (!box().hidden) { if (window.speechSynthesis) speechSynthesis.cancel(); hide(); } hideFab(); return; }
    if ((e.key === 'p' || e.key === 'P') && !box().hidden && !inEditable(e.target)) { const sp = root.querySelector('.spk[data-acc]'); if (sp) { e.preventDefault(); sp.click(); } }
  });
  bind(window, 'scroll', () => { if (root) { hideFab(); } }, { passive: true });



  // ---------- Đánh dấu từ đã học trên trang (ôn thụ động khi gặp lại trong ngữ cảnh thật) ----------
  const level5 = s => !s || !s.last ? 0 : s.reps === 0 ? 1 : s.interval <= 3 ? 2 : s.interval <= 10 ? 3 : s.interval <= 30 ? 4 : 5;
  let known = new Map(), knownRe = null, marked = 0, toastShown = false;
  const SKIP = 'SCRIPT,STYLE,NOSCRIPT,TEXTAREA,INPUT,SELECT,OPTION,CODE,PRE,KBD,SAMP,SVG,MATH,VB-MARK,IELTS-LEXI-POPUP,TITLE,HEAD';
  let ACAD = null, GT = null; // GT: tên bài ngữ pháp (grammar-titles.json) // từ học thuật B2–C2 (academic.json, sinh từ AWL + NAWL + kho Lexkite)
  async function loadKnown() {
    const r = await sget('cards');
    known = new Map(Object.values(r.cards || {}).filter(c => c.word && c.word.length > 2 && !/\s/.test(c.word)).map(c => [c.word.toLowerCase(), { vi: c.vi || '', ipa: c.ipa || '', lv: level5(c.srs) }]));
    if (acadOn) {
      if (!ACAD) try { ACAD = ((await send({ type: 'extJson', name: 'academic' })) || {}).data || {}; } catch (e) { ACAD = {}; }
      for (const [w, cefr] of Object.entries(ACAD)) if (!known.has(w)) known.set(w, { acad: cefr });
    }
    knownRe = known.size ? new RegExp(`\\b(${[...known.keys()].sort((a, b) => b.length - a.length).map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(s|es|ed|d|ing)?\\b`, 'gi') : null;
  }
  function injectMarkCss() {
    if (document.getElementById('vb-mark-css')) return;
    const st = document.createElement('style'); st.id = 'vb-mark-css'; st.setAttribute('style', 'display:none !important'); // trang reset kiểu *{all:unset} không làm lộ CSS thành chữ
    st.textContent = `vb-mark{background:linear-gradient(transparent 60%,var(--vbc,rgba(124,58,237,.3)) 60%);border-radius:2px;cursor:help;color:inherit}
      vb-mark[data-l="1"]{--vbc:rgba(239,68,68,.38)}vb-mark[data-l="2"]{--vbc:rgba(245,158,11,.4)}vb-mark[data-l="3"]{--vbc:rgba(234,179,8,.4)}
      vb-mark[data-l="4"],vb-mark[data-l="5"]{--vbc:rgba(34,197,94,.35)}vb-mark[data-l="0"]{--vbc:rgba(204,63,28,.22)}
      vb-mark[data-a]{background:none;border-bottom:1.5px solid rgba(31,122,114,.55);border-radius:0;text-decoration:none} /* gạch xanh mảnh – không giống gạch đỏ lỗi chính tả */
      .ytp-caption-segment .vbw.known{box-shadow:inset 0 -.18em 0 rgba(34,197,94,.9)}
      ::highlight(lexkite-acad){text-decoration:underline 1.5px rgba(31,122,114,.55);text-underline-offset:3px;text-decoration-skip-ink:none}
      ::highlight(lexkite-l0){background-color:rgba(204,63,28,.16)}::highlight(lexkite-l1){background-color:rgba(239,68,68,.24)}::highlight(lexkite-l2){background-color:rgba(245,158,11,.26)}
      ::highlight(lexkite-l3){background-color:rgba(234,179,8,.26)}::highlight(lexkite-l4),::highlight(lexkite-l5){background-color:rgba(34,197,94,.22)}`;
    (document.head || document.documentElement).appendChild(st);
    // CSP style-src chặn <style> chèn vào → ::highlight() vẫn cần kiểu: bảng kiểu dựng sẵn (adoptedStyleSheets) không bị CSP chặn
    if (HLR) later(() => { try { if (st.sheet && st.sheet.cssRules.length) return; const sh = new CSSStyleSheet(); sh.replaceSync(st.textContent.split('\n').filter(l => l.includes('::highlight')).join('\n')); document.adoptedStyleSheets = [...document.adoptedStyleSheets, sh]; } catch (e) { /* bỏ qua */ } }, 50);
  }
  const UI_SKIP = 'button,label,form,nav,header,footer,a,[role=dialog],[aria-modal],[role=listbox],[role=option],[role=combobox],[role=menu],[role=menuitem],[role=button],[role=tab],[role=tablist],[role=tooltip],[role=alert],[aria-live],[popover]';
  // content script ở 'isolated world' không thấy khoá __reactFiber của trang → nhận khung SPA qua DOM: đảo Astro, gốc React/Next/Vue/Angular/Svelte
  const FW_ROOT = 'astro-island,#__next,#root,#app,#__nuxt,[data-reactroot],[data-v-app],[ng-version],[data-svelte-h],[data-rh]';
  const fwOwned = el => !!el.closest(FW_ROOT);
  const TXT_SKIP = SKIP.split(',').map(x => x.toLowerCase()).join(',') + ',[contenteditable],[contenteditable=""],.ytp-caption-window-container,ielts-lexi-popup';
  const MAX_MARK = 800;
  // 24/10 (2.6.439): CSS Custom Highlight API – gạch chân bằng Range + ::highlight(), KHÔNG sửa DOM của trang →
  // React/Vue/Astro vẽ lại thoải mái (không còn removeChild lỗi) → gạch chân lại được cả trong hộp thoại và khung SPA.
  // Trình duyệt chưa có Highlight API → dùng <vb-mark> như cũ, giữ luật bỏ qua UI tương tác + khung SPA.
  // (window.CSS: hằng CSS ở trên là chuỗi CSS của bảng tra, che mất đối tượng CSS toàn cục)
  const HLR = (() => { try { const c = window.CSS; return c && c.highlights && typeof c.highlights.set === 'function' && typeof Highlight === 'function' ? c.highlights : null; } catch (e) { return null; } })();
  const HL_NAMES = ['lexkite-acad', 'lexkite-l0', 'lexkite-l1', 'lexkite-l2', 'lexkite-l3', 'lexkite-l4', 'lexkite-l5'];
  const hlSets = {}, hlNodes = new Map(); let hlCount = 0;
  const hlName = k => k.acad ? 'lexkite-acad' : 'lexkite-l' + Math.max(0, Math.min(5, k.lv | 0));
  const hlTitle = k => k.acad ? `${k.acad} · ${tx('Từ học thuật – bấm để tra')}` : `${k.vi}${k.ipa ? '  ' + k.ipa : ''} · ${tx('Lexkite cấp {lv}', { lv: k.lv || tx('mới') })}`;
  function hlEnsure() { for (const n of HL_NAMES) { if (!hlSets[n]) hlSets[n] = new Highlight(); if (HLR.get(n) !== hlSets[n]) HLR.set(n, hlSets[n]); } }
  function hlDrop(node) { const e = hlNodes.get(node); if (!e) return; for (const h of e.hits) hlSets[h.n].delete(h.r); hlCount -= e.hits.length; hlNodes.delete(node); }
  function hlClear() { if (!HLR) return; for (const n of HL_NAMES) { if (hlSets[n]) hlSets[n].clear(); } hlNodes.clear(); hlCount = 0; hideTip(); }
  cleanups.push(() => { try { if (HLR) for (const n of HL_NAMES) if (HLR.get(n) === hlSets[n]) HLR.delete(n); } catch (e) {} });
  function hlScanText(node) {
    const text = node.nodeValue, hits = []; knownRe.lastIndex = 0; let m;
    while ((m = knownRe.exec(text)) && hlCount + hits.length < MAX_MARK) {
      const w = m[1].toLowerCase(), k = known.get(w); if (!k) continue;
      const r = document.createRange(); r.setStart(node, m.index); r.setEnd(node, m.index + m[0].length); // Range sống: tự theo nút chữ khi trang đổi DOM
      const n = hlName(k); hlSets[n].add(r); hits.push({ r, w, k, n });
    }
    if (hits.length) { hlNodes.set(node, { v: text, hits }); hlCount += hits.length; }
  }
  const acceptText = (n, strict) => {
    const p = n.parentElement;
    if (!p || !n.nodeValue || n.nodeValue.length < 3 || !/[A-Za-z]{3}/.test(n.nodeValue)) return false;
    if (p.closest(TXT_SKIP)) return false;
    // chỉ cho <vb-mark> (sửa DOM): gắn vào chữ React/Vue quản lý làm hỏng trang (form Cloudflare tự đóng 24/10) → bỏ UI tương tác + khung SPA
    if (strict && (p.closest(UI_SKIP) || fwOwned(p))) return false;
    return true;
  };
  function textNodesIn(rootEl, budget, strict) {
    if (rootEl.nodeType === 3) return acceptText(rootEl, strict) ? [rootEl] : [];
    const tw = document.createTreeWalker(rootEl, NodeFilter.SHOW_TEXT, { acceptNode: n => acceptText(n, strict) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const nodes = []; let n;
    while ((n = tw.nextNode()) && nodes.length < budget) nodes.push(n);
    return nodes;
  }
  function markIn(rootEl, budget = 400) {
    if (!markOn || !knownRe || !rootEl) return;
    if (HLR) {
      if (hlCount >= MAX_MARK) return;
      hlEnsure();
      for (const node of textNodesIn(rootEl, budget, false)) { if (hlNodes.has(node)) continue; hlScanText(node); if (hlCount >= MAX_MARK) break; }
      maybeToast(); return;
    }
    if (marked > MAX_MARK) return;
    for (const node of textNodesIn(rootEl, budget, true)) {
      const text = node.nodeValue; knownRe.lastIndex = 0;
      if (!knownRe.test(text)) continue;
      knownRe.lastIndex = 0;
      const frag = document.createDocumentFragment(); let last = 0, m;
      while ((m = knownRe.exec(text))) {
        const k = known.get(m[1].toLowerCase()); if (!k) continue;
        frag.appendChild(document.createTextNode(text.slice(last, m.index)));
        const el = document.createElement('vb-mark');
        el.textContent = m[0]; el.dataset.w = m[1].toLowerCase();
        if (k.acad) el.dataset.a = k.acad; else el.dataset.l = k.lv;
        el.title = hlTitle(k);
        frag.appendChild(el); last = m.index + m[0].length; marked++;
      }
      frag.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(frag, node);
      if (marked > MAX_MARK) break;
    }
    maybeToast();
  }
  function maybeToast() {
    if (toastShown) return;
    const ws = HLR ? [...hlNodes.values()].flatMap(e => e.hits.filter(h => !h.k.acad).map(h => h.w)) : [...document.querySelectorAll('vb-mark[data-l]')].map(x => x.dataset.w);
    if (ws.length >= 3) { toastShown = true; showToast(tx('📒 {n} từ bạn đã học xuất hiện trên trang này', { n: new Set(ws).size })); }
  }
  function unmarkAll() { hlClear(); document.querySelectorAll('vb-mark').forEach(el => el.replaceWith(document.createTextNode(el.textContent))); marked = 0; }
  function showToast(msg) {
    ensureHost();
    let t = root.querySelector('.vbtoast');
    if (!t) { t = document.createElement('div'); t.className = 'vbtoast'; root.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(showToast._t); showToast._t = later(() => { t.hidden = true; }, 4500);
  }
  // Dò từ được gạch chân dưới con trỏ: caretPositionFromPoint/caretRangeFromPoint → nút chữ + vị trí → so với Range đã lưu (+ hộp chữ thật)
  function hlAt(x, y) {
    if (!HLR || !hlCount) return null;
    let node, off;
    try {
      if (document.caretPositionFromPoint) { const p = document.caretPositionFromPoint(x, y); if (p) { node = p.offsetNode; off = p.offset; } }
      else if (document.caretRangeFromPoint) { const r = document.caretRangeFromPoint(x, y); if (r) { node = r.startContainer; off = r.startOffset; } }
    } catch (e) { return null; }
    if (!node || node.nodeType !== 3) return null;
    const e = hlNodes.get(node); if (!e || node.nodeValue !== e.v) return null;
    for (const h of e.hits) {
      const r = h.r; if (r.collapsed || r.startContainer !== node || off < r.startOffset || off > r.endOffset) continue;
      for (const rc of r.getClientRects()) if (x >= rc.left - 1 && x <= rc.right + 1 && y >= rc.top - 1 && y <= rc.bottom + 1) return h;
    }
    return null;
  }
  // Ô gợi ý khi rê chuột (thay title="" của <vb-mark>): nằm trong shadow root của add-on, không đụng DOM trang
  let tipH = null, tipT = null, mvRaf = 0, mvX = 0, mvY = 0;
  function hideTip() { clearTimeout(tipT); tipH = null; const t = root && root.querySelector('.vbtip'); if (t) t.hidden = true; }
  function showTip(h) {
    ensureHost(); if (!root) return;
    let t = root.querySelector('.vbtip');
    if (!t) { t = document.createElement('div'); t.className = 'vbtip'; t.setAttribute('role', 'tooltip'); root.appendChild(t); }
    t.textContent = hlTitle(h.k); t.hidden = false;
    const rc = h.r.getBoundingClientRect(), vw = window.innerWidth;
    t.style.left = Math.max(6, Math.min(rc.left, vw - t.offsetWidth - 6)) + 'px';
    t.style.top = (rc.bottom + 6 + t.offsetHeight > window.innerHeight ? rc.top - t.offsetHeight - 6 : rc.bottom + 6) + 'px';
  }
  if (HLR) {
    bind(document, 'mousemove', e => {
      if (!hlCount || !alive()) return;
      mvX = e.clientX; mvY = e.clientY;
      if (mvRaf) return;
      mvRaf = requestAnimationFrame(() => {
        mvRaf = 0; const h = hlAt(mvX, mvY);
        if (h === tipH) return;
        hideTip(); if (!h) return;
        tipH = h; tipT = later(() => { if (tipH === h && !h.r.collapsed) showTip(h); }, 350);
      });
    }, { passive: true });
    bind(window, 'scroll', hideTip, { passive: true });
    bind(document, 'mousedown', hideTip, true);
  }
  const NO_HIJACK = 'a, button, label, summary, select, input, textarea, [role=button], [role=link], [role=tab], [role=option], [role=menuitem], [onclick], [tabindex], [contenteditable]';
  bind(document, 'click', e => {
    if (!alive() || e.button) return;
    const el = e.target.closest && e.target.closest('vb-mark');
    if (el) {
      if (el.closest(NO_HIJACK)) return;
      e.preventDefault(); e.stopPropagation();
      const r = document.createRange(); r.selectNodeContents(el);
      show(el.dataset.w, el.getBoundingClientRect(), sentenceAround(r));
      return;
    }
    if (!HLR || !hlCount || fromHost(e)) return;
    const h = hlAt(e.clientX, e.clientY); if (!h) return;
    const sel = document.getSelection(); if (sel && !sel.isCollapsed) return; // đang bôi đen → để luồng chọn chữ xử lý
    // Chữ trong phần tử bấm được (nút, liên kết, thẻ có cursor:pointer của SPA) → nhường trang; không chặn sự kiện của trang
    const t = e.target.nodeType === 1 ? e.target : e.target.parentElement;
    if (!t || t.closest(NO_HIJACK)) return;
    try { if (getComputedStyle(t).cursor === 'pointer') return; } catch (x) { /* bỏ qua */ }
    hideTip();
    show(h.w, h.r.getBoundingClientRect(), sentenceAround(h.r));
  }, true);
  let moT = null; const pendingMark = [];
  // <vb-mark> (dự phòng): trang dựng bằng React/Vue/Angular/Svelte tự quản lý DOM – chèn thẻ làm app lỗi (removeChild) → không đánh dấu ở đó
  const frameworkPage = () => !!document.querySelector('[data-reactroot], #__next, #root > *, #app > *, [data-v-app], [ng-version], [data-svelte-h], [data-sveltekit-hydrate]');
  function flushMarks() {
    moT = null;
    if (!alive()) return stop();
    if (!markOn || !knownRe) { pendingMark.length = 0; return; }
    if (HLR) {
      // Range sống co lại khi trang thay chữ → bỏ nút đã rời trang / đổi nội dung, quét lại nút còn đó
      for (const [node, e] of [...hlNodes]) if (!node.isConnected || node.nodeValue !== e.v) { hlDrop(node); if (node.isConnected) pendingMark.push(node); }
    }
    const ns = pendingMark.splice(0, 60); pendingMark.length = Math.min(pendingMark.length, 600);
    ns.forEach(n => n.isConnected && markIn(n, 80));
    if (pendingMark.length && !moT) moT = later(flushMarks, 1500);
  }
  const mo = new MutationObserver(muts => {
    if (!alive()) return stop();
    if (!markOn || !knownRe) return;
    if (!HLR && muts.every(m => [...m.addedNodes].every(x => x.nodeName === 'VB-MARK' || x.nodeType === 3 && x.parentElement && x.parentElement.nodeName === 'VB-MARK'))) return;
    for (const m of muts) {
      if (m.type === 'characterData') { if (HLR) pendingMark.push(m.target); continue; }
      for (const n of m.addedNodes) if ((n.nodeType === 1 && n.nodeName !== 'VB-MARK' && n !== host) || (HLR && n.nodeType === 3)) pendingMark.push(n);
    }
    if (!moT) moT = later(flushMarks, HLR ? 700 : 1500); // gom đợt: trang SPA vẽ lại liên tục cũng chỉ quét ≤ 1 lần / 0,7 s
  });
  cleanups.push(() => mo.disconnect());
  (async () => {
    if (window.top !== window || /^(docs|mail)\.google\.com$|(^|\.)lexkite\.com$|^lexkite\.pages\.dev$|(^|\.)(vocaband|ielts-lexi-2026)\.web\.app$|^localhost$/.test(location.hostname)) return;
    await loadKnown(); injectMarkCss();
    const go = () => { if (!HLR && frameworkPage()) return; markIn(document.body); if (document.body) mo.observe(document.body, HLR ? { childList: true, subtree: true, characterData: true } : { childList: true, subtree: true }); };
    'requestIdleCallback' in window ? requestIdleCallback(() => { if (alive()) go(); else stop(); }, { timeout: 2500 }) : later(go, 1200);
  })();
  chromeOn(chrome.storage.onChanged, async ch => {
    if (!alive()) return;
    if (ch.cards) { await loadKnown(); if (HLR && markOn && knownRe && document.body) { hlClear(); markIn(document.body); } }
    if (ch.settings) { const nv = ch.settings.newValue || {}, on = nv.markKnown !== false; acadOn = nv.markAcademic !== false; unmarkAll(); await loadKnown(); if (on) markIn(document.body); }
  });

  // ---------- YouTube: chạm vào từ trong phụ đề để tra, video tự dừng ----------
  function initYouTube() {
    const st = document.createElement('style'); st.setAttribute('style', 'display:none !important');
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
    cleanups.push(() => { st.remove(); });
    const obs = new MutationObserver(() => { if (!alive()) return stop(); if (enabled) scan(); });
    cleanups.push(() => obs.disconnect());
    (function attach() {
      const p = document.querySelector('#movie_player');
      if (p) obs.observe(p, { subtree: true, childList: true, characterData: true }); else later(attach, 1000);
    })();

    // Di chuột vào phụ đề → tạm dừng để đọc; rời đi → chạy tiếp
    bind(document, 'mouseover', e => {
      if (!alive() || !enabled || !e.target.closest) return;
      if (e.target.closest('.ytp-caption-window-container .caption-window')) pause();
    }, true);
    bind(document, 'mouseout', e => {
      if (!alive() || !e.target.closest || !e.target.closest('.caption-window')) return;
      const to = e.relatedTarget;
      if (to && to.closest && to.closest('.caption-window')) return;
      if (root && !box().hidden) return; // đang xem bảng tra
      resume();
    }, true);
    // Chặn YouTube kéo khung phụ đề / dừng-phát khi bấm vào từ
    ['mousedown', 'mouseup', 'dblclick'].forEach(t => bind(document, t, e => {
      if (e.target.closest && e.target.closest('.ytp-caption-segment .vbw')) e.stopPropagation();
    }, true));
    bind(document, 'click', e => {
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
    bind(document, 'fullscreenchange', () => { if (root && !box().hidden) hide(); });

    // ⌨️ Phím tắt luyện nghe/chép chính tả: A = câu trước · S = lặp câu hiện tại · D = câu sau (Space giữ nguyên của YouTube)
    // Mốc thời gian thật từng câu lấy từ phụ đề của chính video (ưu tiên phụ đề tiếng Anh do người làm, rồi phụ đề tự động)
    let cues = [], cueVid = '', hinted = false;
    const loadCues = async () => {
      const id = new URL(location.href).searchParams.get('v'); if (!id) { cues = []; cueVid = ''; return; } if (id === cueVid) return; cueVid = id; cues = [];
      try {
        const r = await send({ type: 'ytTracks' }), tr = (r && r.tracks) || [];
        const pick = tr.find(x => /^en/.test(x.l) && x.k !== 'asr') || tr.find(x => /^en/.test(x.l)) || tr.find(x => x.k !== 'asr') || tr[0]; if (!pick) return;
        const j = await (await fetch(pick.u + (pick.u.includes('?') ? '&' : '?') + 'fmt=json3')).json();
        const raw = (j.events || []).filter(ev => ev.segs && ev.dDurationMs).map(ev => ({ s: ev.tStartMs / 1000, e: (ev.tStartMs + ev.dDurationMs) / 1000, t: ev.segs.map(x => x.utf8 || '').join('').replace(/\s+/g, ' ').trim() })).filter(c => c.t);
        cues = raw.filter((c, i) => !i || c.s - raw[i - 1].s > 0.3); // bỏ mốc trùng của phụ đề tự động cuộn dòng
      } catch (e) { cues = []; }
    };
    bind(document, 'yt-navigate-finish', () => later(loadCues, 800));
    later(loadCues, 1500);
    bind(document, 'keydown', e => {
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

  chromeOn(chrome.runtime.onMessage, (msg, s, reply) => {
    if (!alive()) return;
    if (msg.type === 'lkPing') { reply({ ok: true }); return; }
    if (msg.type === 'translateSelection') { const info = selectionInfo(); if (info) translateSelection(info); reply({ ok: true }); return; }
    if (msg.type !== 'showLookup') return;
    reply({ ok: true });
    const sel = window.getSelection();
    const range = sel && sel.rangeCount ? sel.getRangeAt(0) : null;
    const rect = range ? range.getBoundingClientRect() : { left: window.innerWidth / 2, top: 80, bottom: 80, width: 0 };
    const w = String(msg.word || '').replace(/\s+/g, ' ').trim();
    if (!w) return;
    if (!isWordish(w)) return translateSelection({ text: w.slice(0, 3000), range, rect });
    show(w.toLowerCase(), rect, range ? sentenceAround(range) : '');
  });
})();
