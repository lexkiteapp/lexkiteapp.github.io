/* ✍️ Soát lỗi viết (Writing check): gạch chân lỗi tiếng Anh ngay trong ô người dùng đang gõ trên mọi trang, bấm vào để sửa 1 chạm,
 * "Vì sao?" giải thích theo ngôn ngữ người học + bài ngữ pháp liên quan, lỗi lặp lại → Sổ lỗi sai.
 * – Mặc định TẮT (settings.wcOn). Bỏ qua ô mật khẩu/email/số/thẻ, trang ngân hàng & thanh toán, trang người dùng đã tắt (wcOffSites).
 * – Bộ soát: luật offline (app/js/writecheck-rules.js) + Chrome Proofreader API trên máy (nếu có) + LanguageTool (chỉ khi bật "kiểm nâng cao", qua service worker có giới hạn lượt).
 * – Giao diện trong Shadow DOM riêng (<lexkite-wc>), vẽ đè (overlay) bằng tọa độ – KHÔNG sửa DOM của trang; chỉ đổi chữ khi người dùng bấm gợi ý. */
(() => {
  if (!window.LK_WRITE) return; // bản cũ (trước khi add-on cập nhật) tự tắt nhờ sự kiện 'ielts-lexi-takeover' do content.js phát
  let dead = false;
  const alive = () => { try { return !dead && !!chrome.runtime.id; } catch (e) { return false; } };
  document.addEventListener('ielts-lexi-takeover', ev => { if (ev.detail !== chrome.runtime.id) return; dead = true; detach(); if (hostEl) hostEl.remove(); });
  const send = msg => { try { return alive() ? chrome.runtime.sendMessage(msg).catch(() => null) : Promise.resolve(null); } catch (e) { return Promise.resolve(null); } };

  // ---------- Ngôn ngữ giao diện (cùng cách content.js): vi = chữ gốc, ngôn ngữ khác = từ điển web, thiếu khóa → tiếng Anh ----------
  const XLANGS = ['vi', 'en', 'es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
  const pickLang = l => { l = String(l || '').toLowerCase().split('-')[0]; return XLANGS.includes(l) ? l : null; };
  let UI_LANG = pickLang(chrome.i18n && chrome.i18n.getUILanguage ? chrome.i18n.getUILanguage() : navigator.language) || 'en', XD = {}, XEN = {}, dictLang = '';
  const loadDict = () => {
    if (dictLang === UI_LANG || UI_LANG === 'vi') return; dictLang = UI_LANG; const l = UI_LANG;
    send({ type: 'uiDict', lang: 'en' }).then(r => { XEN = (r && r.dict) || {}; });
    if (l !== 'en') send({ type: 'uiDict', lang: l }).then(r => { if (UI_LANG === l) XD = (r && r.dict) || {}; });
  };
  const tx = (src, vars) => { let s = UI_LANG === 'vi' ? src : (XD[src] || XEN[src] || src); if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m)); return s; };

  // ---------- Cài đặt ----------
  let on = false, adv = false, offSites = [];
  const HOST = location.hostname.replace(/^www\./, '');
  // Trang ngân hàng / thanh toán / ví: không bao giờ đọc chữ người dùng gõ (tên miền + đường dẫn thanh toán)
  const BLOCK_HOST = /(^|\.)(paypal|stripe|checkout|braintreegateway|adyen|klarna|afterpay|affirm|squareup|wise|revolut|venmo|cash\.app|zelle|alipay|paytm|razorpay|payoneer|skrill|neteller|westernunion|moneygram|coinbase|binance|kraken|chase|wellsfargo|bankofamerica|citi|citibank|capitalone|usbank|hsbc|barclays|santander|natwest|lloydsbank|monzo|starlingbank|n26|ing|bnpparibas|societegenerale|deutsche-bank|commbank|westpac|anz|nab|dbs|ocbc|uob|maybank|cimb|bca|mandiri|bri|kasikornbank|scb|bangkokbank|icicibank|hdfcbank|sbi|axisbank|mufg|smbc|mizuhobank|kbstar|shinhan|wooribank|hanabank|sberbank|tinkoff|garanti|isbank|akbank|ziraat|itau|bradesco|nubank|bancobrasil|caixa|bbva|vietcombank|techcombank|vietinbank|bidv|agribank|mbbank|tpbank|vpbank|acb|sacombank|hdbank|vib|shb|ocb|msb|seabank|momo|zalopay|vnpay|shopeepay|viettelmoney|payoo|onepay|nganluong|baokim)\.[a-z.]+$|(^|\.)(bank|banking|pay|payment|payments|checkout|billing|secure|login|signin|accounts|auth|id)\.|^docs\.google\.com$/i;
  const BLOCK_PATH = /\/(checkout|payment|payments|pay|billing|cart\/checkout|wallet|bank|signin|login|password)\b/i;
  const pageBlocked = () => !/^https?:$/.test(location.protocol) || BLOCK_HOST.test(location.hostname) || BLOCK_PATH.test(location.pathname) || offSites.includes(HOST) || /(^|\.)lexkite\.com$/.test(location.hostname) && /#\/(mock|test|exam)/.test(location.hash);
  const apply = (st, sites, lang) => {
    st = st || {}; const was = on;
    on = st.wcOn === true; adv = st.wcAdv === true; if (sites) offSites = sites;
    if (lang && pickLang(lang)) UI_LANG = pickLang(lang);
    if (on) loadDict();
    if ((!on || pageBlocked()) && (was || cur)) detach();
  };
  chrome.storage.local.get(['settings', 'wcOffSites', 'uiLang']).then(r => apply(r.settings, r.wcOffSites || [], r.uiLang)).catch(() => {});
  chrome.storage.onChanged.addListener((ch, area) => {
    if (area !== 'local' || !(ch.settings || ch.wcOffSites || ch.uiLang)) return;
    chrome.storage.local.get(['settings', 'wcOffSites', 'uiLang']).then(r => { if (ch.uiLang) dictLang = ''; apply(r.settings, r.wcOffSites || [], r.uiLang); }).catch(() => {});
  });

  // ---------- Ô nhập được phép soát ----------
  const SENSITIVE = /pass|pwd|card|cc-?num|cvv|cvc|csc|iban|swift|bic|routing|account.?(no|num)|ssn|social.?sec|tax.?id|otp|one.?time|2fa|totp|pin\b|security.?code|captcha|e-?mail|phone|mobile|tel\b|zip|postal|coupon|promo/i;
  const editHost = el => { while (el.parentElement && el.parentElement.isContentEditable) el = el.parentElement; return el; };
  function eligible(el) {
    if (!el || el.nodeType !== 1 || !alive()) return null;
    let kind;
    if (el.tagName === 'TEXTAREA') kind = 'ta';
    else if (el.tagName === 'INPUT') { const t = (el.getAttribute('type') || 'text').toLowerCase(); if (t !== 'text') return null; kind = 'in'; }
    else if (el.isContentEditable) { el = editHost(el); kind = 'ce'; }
    else return null;
    if (el.readOnly || el.disabled || el.getAttribute('aria-readonly') === 'true') return null;
    if (el.getAttribute('spellcheck') === 'false' || el.closest('[data-gramm="false"],[data-enable-grammarly="false"],[data-lexkite-wc="off"]')) return null; // trình soạn mã, trang tự tắt soát lỗi
    const role = (el.getAttribute('role') || '').toLowerCase(); if (/search|combobox|spinbutton/.test(role)) return null;
    const ac = (el.getAttribute('autocomplete') || '').toLowerCase(); if (/cc-|password|one-time-code|email|tel|username|postal|street|address|bday|transaction/.test(ac)) return null;
    if (kind !== 'ce' && el.inputMode && /numeric|decimal|tel|email|search/.test(el.inputMode)) return null;
    const meta = [el.name, el.id, el.getAttribute('aria-label'), el.getAttribute('placeholder'), el.className && typeof el.className === 'string' ? el.className : ''].join(' ');
    if (SENSITIVE.test(meta) || el.closest('form') && el.closest('form').querySelector('input[type=password],input[autocomplete^="cc-"]') && kind === 'in') return null;
    const r = el.getBoundingClientRect(); if (r.width < 120 || r.height < 18) return null;
    return { el, kind };
  }

  // ---------- Shadow DOM riêng: lớp gạch chân + hộp gợi ý + huy hiệu ----------
  // Trusted Types: chỉ tạo policy khi trang thực sự bắt buộc TrustedHTML (tránh lỗi console trên trang giới hạn tên policy, vd. StackOverflow)
  let ttPolicy;
  const H = html => { if (ttPolicy === undefined) { ttPolicy = null; let need = false; try { document.createElement('div').innerHTML = '<b></b>'; } catch (e) { need = true; } if (need && window.trustedTypes && trustedTypes.createPolicy) try { ttPolicy = trustedTypes.createPolicy('lexkite#wc', { createHTML: x => x }); } catch (e) { ttPolicy = null; } } return ttPolicy ? ttPolicy.createHTML(html) : html; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const COL = { spelling: '#E5484D', grammar: '#2F6FEB', punct: '#D97706', style: '#0E8F8E' };
  const LABEL = { spelling: 'Lỗi chính tả', grammar: 'Lỗi ngữ pháp', punct: 'Lỗi dấu câu', style: 'Gợi ý văn phong' };
  const CSS = `
    :host { all: initial; }
    .clip { position: fixed; overflow: hidden; pointer-events: none; z-index: 2147483646; }
    .u { position: absolute; height: 2px; border-radius: 2px; pointer-events: none; opacity: .9; }
    .u.spelling { background: ${COL.spelling}; } .u.grammar { background: ${COL.grammar}; } .u.punct { background: ${COL.punct}; } .u.style { background: ${COL.style}; height: 2px; opacity: .7; }
    .u.on { height: auto; opacity: .18; border-radius: 3px; }
    .badge { position: fixed; z-index: 2147483646; min-width: 22px; height: 22px; padding: 0 6px; box-sizing: border-box; border-radius: 11px; border: 0; cursor: pointer; pointer-events: auto;
      color: #fff; font: 700 12px/22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; box-shadow: 0 2px 8px rgba(15,61,62,.25); text-align: center; }
    .badge[hidden], .card[hidden], .why[hidden] { display: none; }
    .card { position: fixed; z-index: 2147483647; width: 320px; max-width: calc(100vw - 16px); box-sizing: border-box; background: #fff; color: #1c1d2b; border: 1px solid #e3e5ef; border-radius: 14px;
      box-shadow: 0 16px 40px -8px rgba(15,61,62,.22), 0 0 1px rgba(0,0,0,.1); font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; padding: 12px 12px 10px; animation: pop .12s ease-out; pointer-events: auto; text-align: start; }
    @keyframes pop { from { opacity: 0; transform: translateY(4px); } }
    .hd { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
    .tag { display: inline-block; padding: 1px 8px; border-radius: 99px; color: #fff; font-size: 11px; font-weight: 700; }
    .ttl { font-weight: 700; font-size: 13.5px; flex: 1; }
    .x { border: 0; background: none; font-size: 18px; line-height: 1; cursor: pointer; color: #6b6f85; padding: 0 2px; }
    .bad { text-decoration: line-through; color: #6b6f85; margin-inline-end: 4px; unicode-bidi: isolate; }
    .reps { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0 8px; }
    .rep { border: 0; border-radius: 9px; padding: 5px 10px; font: 700 14px/1.2 inherit; font-family: inherit; cursor: pointer; background: #0E8F8E; color: #fff; direction: ltr; }
    .rep:hover, .rep:focus-visible { background: #0b6e6d; outline: none; }
    .rep .lv { font-size: 10px; font-weight: 700; background: rgba(255,255,255,.25); border-radius: 6px; padding: 0 4px; margin-inline-start: 5px; }
    .msg { font-size: 12.5px; color: #4b5063; margin: 2px 0 6px; direction: ltr; text-align: left; }
    .acts { display: flex; gap: 6px; flex-wrap: wrap; border-top: 1px solid #eef0f6; padding-top: 8px; }
    .btn { border: 1px solid #e3e5ef; background: #fff; border-radius: 9px; padding: 5px 10px; font: 600 12.5px/1.2 inherit; font-family: inherit; cursor: pointer; color: #1c1d2b; }
    .btn:hover { border-color: #0E8F8E; color: #0E8F8E; }
    .btn.off { margin-inline-start: auto; color: #6b6f85; border-color: transparent; font-weight: 500; }
    .why { margin-top: 8px; padding: 8px 10px; border-radius: 10px; background: #f0faf9; border: 1px solid #c9ece9; font-size: 13px; line-height: 1.5; }
    .why a { color: #0E8F8E; font-weight: 700; text-decoration: none; cursor: pointer; display: inline-block; margin-top: 4px; }
    .src { font-size: 11px; color: #8a8fa3; margin-top: 4px; }
    @media (prefers-color-scheme: dark) {
      .card { background: #1b1c26; color: #ecedf5; border-color: #2e3040; } .btn { background: #242533; border-color: #2e3040; color: #ecedf5; }
      .msg { color: #b8bbcc; } .bad { color: #9a9db0; } .acts { border-color: #2e3040; } .why { background: #15302f; border-color: #1f4b48; } .why a { color: #2dd4bf; }
    }`;
  let hostEl = null, root = null, layer = null, card = null, badge = null, mirror = null;
  function ensureUI() {
    if (hostEl && hostEl.isConnected) return;
    if (!hostEl) {
      hostEl = document.createElement('lexkite-wc');
      root = hostEl.attachShadow({ mode: navigator.webdriver ? 'open' : 'closed' }); // 'open' chỉ khi kiểm thử tự động
      root.innerHTML = H(`<style>${CSS}</style><div class="layer"></div><button class="badge" hidden></button><div class="card" role="dialog" hidden></div>`);
      layer = root.querySelector('.layer'); badge = root.querySelector('.badge'); card = root.querySelector('.card');
      // Bấm trong hộp gợi ý không làm ô nhập mất con trỏ
      for (const n of [card, badge]) n.addEventListener('mousedown', e => e.preventDefault());
      badge.addEventListener('click', () => { if (cur && cur.issues.length) showCard(cur.issues[0]); });
      card.addEventListener('click', onCardClick);
      card.addEventListener('keydown', e => { if (e.key === 'Escape') hideCard(true); });
    }
    (document.fullscreenElement || document.documentElement).appendChild(hostEl);
  }

  // ---------- Trạng thái ô đang soát ----------
  let cur = null; // { el, kind, text, issues, map, seq }
  const ignored = new Set(); // "rule|chữ sai" bỏ qua trong phiên trang này
  const counted = new Set();
  const getText = c => (c.kind === 'ce' ? ceText(c) : c.el.value || '');
  // contenteditable: ghép chữ từ các nút văn bản, xuống dòng ở <br> và khối → bảng ánh xạ vị trí ⇄ nút
  const BLOCK = /^(DIV|P|LI|UL|OL|H[1-6]|BLOCKQUOTE|PRE|TR|TABLE|SECTION|ARTICLE|HEADER|FOOTER)$/;
  function ceText(c) {
    let s = ''; const map = [];
    const walk = n => {
      for (let k = n.firstChild; k; k = k.nextSibling) {
        if (k.nodeType === 3) { map.push({ n: k, s: s.length }); s += k.nodeValue; }
        else if (k.nodeType === 1) {
          if (k.tagName === 'BR') { s += '\n'; continue; }
          if (/^(SCRIPT|STYLE|TEMPLATE)$/.test(k.tagName)) continue;
          const blk = BLOCK.test(k.tagName); if (blk && s && !s.endsWith('\n')) s += '\n';
          walk(k); if (blk && s && !s.endsWith('\n')) s += '\n';
        }
      }
    };
    walk(c.el); c.map = map; return s;
  }
  const posOf = (c, off) => { // vị trí trong chuỗi → [nút, offset]
    const m = c.map; let lo = 0, hi = m.length - 1, f = null;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (m[mid].s <= off) { f = m[mid]; lo = mid + 1; } else hi = mid - 1; }
    if (!f) return null; const o = Math.min(off - f.s, f.n.nodeValue.length); return [f.n, o];
  };
  const offOf = (c, node, o) => { // [nút, offset] → vị trí trong chuỗi
    if (!c.map) return -1;
    if (node.nodeType === 3) { const f = c.map.find(x => x.n === node); return f ? f.s + o : -1; }
    const k = node.childNodes[o] || node; const tw = document.createTreeWalker(k, NodeFilter.SHOW_TEXT); const t = k.nodeType === 3 ? k : tw.nextNode(); const f = t && c.map.find(x => x.n === t); return f ? f.s : -1;
  };

  // ---------- Vị trí chữ trên màn hình ----------
  const MIRROR_PROPS = ['boxSizing', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontVariant', 'fontStretch', 'letterSpacing', 'wordSpacing', 'lineHeight', 'textTransform', 'textIndent', 'tabSize', 'direction', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'textAlign'];
  function fieldRects(c, list) {
    const el = c.el, r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    const bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
    const box = { left: r.left + bl, top: r.top + bt, width: el.clientWidth, height: el.clientHeight };
    if (c.kind === 'ce') {
      const out = list.map(x => { const a = posOf(c, x.s), b = posOf(c, x.e); if (!a || !b) return []; try { const rg = document.createRange(); rg.setStart(a[0], a[1]); rg.setEnd(b[0], b[1]); return [...rg.getClientRects()]; } catch (e) { return []; } });
      return { box: { left: r.left, top: r.top, width: r.width, height: r.height }, out };
    }
    if (!mirror) { mirror = document.createElement('div'); root.appendChild(mirror); }
    const st = mirror.style; st.cssText = 'position:fixed;visibility:hidden;pointer-events:none;overflow:hidden;border:0;margin:0;';
    for (const p of MIRROR_PROPS) st[p] = cs[p];
    st.left = box.left + 'px'; st.top = box.top + 'px'; st.boxSizing = 'border-box'; st.width = box.width + 'px'; st.height = box.height + 'px';
    const text = c.text;
    if (c.kind === 'in') { st.whiteSpace = 'pre'; st.display = 'flex'; st.alignItems = 'center'; st.overflow = 'visible'; st.width = Math.max(box.width, 5000) + 'px'; }
    else { st.whiteSpace = 'pre-wrap'; st.overflowWrap = 'break-word'; st.wordBreak = cs.wordBreak; }
    let html = '', at = 0; list.forEach((x, i) => { html += esc(text.slice(at, x.s)) + `<span data-i="${i}">${esc(text.slice(x.s, x.e)) || '&#8203;'}</span>`; at = x.e; }); html += esc(text.slice(at)) + '&#8203;';
    mirror.innerHTML = H(c.kind === 'in' ? `<span style="white-space:pre">${html}</span>` : html);
    const dx = -el.scrollLeft, dy = -el.scrollTop;
    const out = list.map((x, i) => { const sp = mirror.querySelector(`[data-i="${i}"]`); return sp ? [...sp.getClientRects()].map(q => ({ left: q.left + dx, top: q.top + dy, width: q.width, height: q.height, bottom: q.bottom + dy, right: q.right + dx })) : []; });
    mirror.innerHTML = H('');
    return { box, out };
  }

  // ---------- Vẽ ----------
  let rafId = 0, activeIssue = null;
  const scheduleLayout = () => { if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; layout(); }); };
  function layout() {
    if (!cur || !root) return;
    if (!cur.el.isConnected) return detach();
    const list = cur.issues;
    const { box, out } = fieldRects(cur, list);
    let html = `<div class="clip" style="left:${box.left}px;top:${box.top}px;width:${box.width}px;height:${box.height}px">`;
    list.forEach((x, i) => { x.rects = out[i]; for (const q of out[i] || []) { if (!q.width) continue; const on = activeIssue === x; html += `<div class="u ${x.type}${on ? ' on' : ''}" data-i="${i}" style="left:${q.left - box.left}px;top:${on ? q.top - box.top : q.bottom - box.top - 2}px;width:${q.width}px;${on ? `height:${q.height}px;background:${COL[x.type]}` : ''}"></div>`; } });
    layer.innerHTML = H(html + '</div>');
    // huy hiệu số lỗi ở góc dưới phải ô nhập
    const n = list.filter(x => x.type !== 'style').length, worst = list.find(x => x.type === 'spelling') || list.find(x => x.type === 'grammar') || list.find(x => x.type === 'punct') || list[0];
    const r = cur.el.getBoundingClientRect();
    badge.hidden = !list.length || r.bottom < 0 || r.top > innerHeight;
    if (!badge.hidden) {
      badge.textContent = n ? String(n) : '✦'; badge.style.background = COL[worst.type]; badge.title = tx('Lexkite: {n} gợi ý viết', { n: list.length });
      const bh = 22, x = Math.min(innerWidth - 30, r.right - 28), y = cur.kind === 'in' || r.height < 40 ? r.top + (r.height - bh) / 2 : r.bottom - bh - 6;
      badge.style.left = Math.max(0, x) + 'px'; badge.style.top = Math.max(0, y) + 'px';
    }
    if (activeIssue && !card.hidden) placeCard(activeIssue);
  }
  function clearDraw() { if (layer) layer.innerHTML = H(''); if (badge) badge.hidden = true; }

  // ---------- Soát lỗi ----------
  let tCheck = 0, tLT = 0, prInst = null, prState = '';
  const TYPE_PRIO = { spelling: 0, grammar: 1, punct: 2, style: 3 }, SRC_PRIO = { rules: 0, chrome: 1, lt: 2 };
  async function proofread(text) {
    try {
      const PR = self.Proofreader; if (!PR) return [];
      if (!prState) prState = await PR.availability({ expectedInputLanguages: ['en'] }).catch(() => 'unavailable');
      if (prState !== 'available') return []; // không tự tải mô hình (cần người dùng bấm) – chỉ dùng khi Chrome đã có sẵn
      if (!prInst) prInst = await PR.create({ expectedInputLanguages: ['en'], includeCorrectionTypes: true, includeCorrectionExplanations: true }).catch(() => PR.create({ expectedInputLanguages: ['en'] }));
      const r = await prInst.proofread(text);
      return (r.corrections || []).map(c => {
        const ty = [].concat(c.types || c.type || []).join(' ').toLowerCase();
        const type = /spell/.test(ty) ? 'spelling' : /punct|capital/.test(ty) ? 'punct' : 'grammar';
        return { s: c.startIndex, e: c.endIndex, type, reps: [c.correction], rule: 'chrome:' + (ty || 'fix'), msg: c.explanation || '', lesson: lessonFor(ty + ' ' + (c.explanation || '')), src: 'chrome' };
      });
    } catch (e) { prState = 'unavailable'; return []; }
  }
  // Bài ngữ pháp liên quan cho lỗi từ LanguageTool / Chrome AI (theo mã luật / loại lỗi)
  const LESSON = [[/A_VS_AN|ARTICLE|DT_|DETERMINER|THE_/i, 'articles'], [/AGREEMENT|SVA|HE_VERB|PERS_PRON|SUBJECT_VERB/i, 'subject-verb-agreement'], [/MASS_NOUN|NON_COUNT|UNCOUNT|PLURAL|COUNTABLE/i, 'countable-uncountable'],
    [/COMPAR|SUPERL|MORE_|THAN_THEN/i, 'comparatives-superlatives'], [/GERUND|INFINITIVE|TO_ING|_TO_VB|VBG/i, 'gerund-infinitive'], [/MODAL|COULD_OF|SHOULD_OF/i, 'modals-ability-permission'], [/CONDITIONAL|IF_WILL|IF_/i, 'conditionals-0-1'],
    [/PERFECT|HAVE_PART|HAVE_VBD|PAST_TENSE|TENSE|DID_BASEFORM|VBD|VBN/i, 'tenses-ielts'], [/PREPOSITION|PREP|_ON_|_IN_|_AT_|DEPEND/i, 'dependent-prepositions'], [/COMMA|PUNCT|SEMICOLON|COLON|APOS|CAPITAL|UPPERCASE|SENTENCE_START/i, 'punctuation'],
    [/RELATIVE|WHO_WHICH|WHICH_THAT/i, 'relative-clauses'], [/PASSIVE/i, 'passive-voice'], [/PRON|ITS_IT|YOUR_YOU|THEIR_THERE/i, 'pronouns'], [/ADJ.*ADV|ADVERB/i, 'adjectives-adverbs'], [/REDUNDAN|WORDINESS|STYLE|PLAIN_ENGLISH|VERY_/i, 'idioms-style'],
    [/spell/i, ''], [/prep/i, 'prepositions'], [/punct|capital/i, 'punctuation'], [/grammar/i, '']];
  const lessonFor = s => { for (const [re, id] of LESSON) if (re.test(s)) return id; return ''; };
  const GENERIC_WHY = { spelling: 'Từ này có vẻ viết sai chính tả hoặc không có trong từ điển. Kiểm tra lại cách viết – nếu là tên riêng, bấm “Bỏ qua lỗi”.', grammar: 'Câu có lỗi ngữ pháp ở chỗ được gạch chân. Xem gợi ý sửa và bài ngữ pháp liên quan để hiểu quy tắc.', punct: 'Lỗi trình bày: dấu câu, khoảng trắng hoặc viết hoa chưa đúng quy tắc tiếng Anh.', style: 'Câu không sai, nhưng có cách diễn đạt rõ, gọn hoặc học thuật hơn.' };

  function merge(base, extra) {
    const all = [...base, ...extra].sort((a, b) => TYPE_PRIO[a.type] - TYPE_PRIO[b.type] || SRC_PRIO[a.src] - SRC_PRIO[b.src] || a.s - b.s);
    const keep = [];
    for (const x of all) {
      const dup = keep.find(k => x.s < k.e && k.s < x.e);
      if (!dup) { keep.push(x); continue; }
      // trùng chỗ: gộp gợi ý & lời giải thích của nguồn khác vào lỗi đã giữ
      for (const r of x.reps || []) if (!dup.reps.includes(r) && dup.reps.length < 4 && dup.s === x.s && dup.e === x.e) dup.reps.push(r);
      if (!dup.msg && x.msg) dup.msg = x.msg; if (!dup.lesson && x.lesson) dup.lesson = x.lesson;
    }
    return keep.sort((a, b) => a.s - b.s);
  }
  const fin = (text, list, caret) => list.filter(x => {
    x.bad = text.slice(x.s, x.e);
    if (ignored.has(x.rule + '|' + x.bad.toLowerCase())) return false;
    // từ đang gõ dở ở cuối (con trỏ ngay sau) – chưa bắt lỗi
    if (x.e >= text.length && /[A-Za-z]$/.test(text) && caret >= text.length && x.type !== 'style') return false;
    return true;
  });
  const caretOf = c => { try { if (c.kind !== 'ce') return c.el.selectionEnd; const s = getSelection(); return s && s.focusNode && c.el.contains(s.focusNode) ? offOf(c, s.focusNode, s.focusOffset) : -1; } catch (e) { return -1; } };

  let ltCache = { text: '', list: [] };
  async function runCheck() {
    if (!cur || !on) return;
    const c = cur, seq = ++c.seq, text = getText(c); c.text = text;
    if (text.trim().length < 3 || text.length > 20000) { c.issues = []; layout(); return; }
    const caret = caretOf(c);
    let list = LK_WRITE.check(text).map(x => ({ ...x, reps: [...x.reps] }));
    c.issues = fin(text, list, caret); layout();
    const pr = await proofread(text); if (seq !== c.seq || cur !== c) return;
    if (pr.length) { list = merge(list, pr); c.issues = fin(text, list, caret); layout(); }
    if (!adv || text.trim().split(/\s+/).length < 3) return;
    const runLT = async () => {
      if (seq !== c.seq || cur !== c) return;
      let lt = ltCache.text === text ? ltCache.list : null;
      if (!lt) { const r = await send({ type: 'wcLT', text }); if (!r || !r.list) return; lt = r.list.map(x => ({ ...x, src: 'lt', lesson: lessonFor(x.rule) })); ltCache = { text, list: lt }; }
      if (seq !== c.seq || cur !== c) return;
      list = merge(list, lt.map(x => ({ ...x, reps: [...x.reps] }))); c.issues = fin(text, list, caretOf(c)); layout();
    };
    clearTimeout(tLT); tLT = setTimeout(runLT, 1200); // chờ người dùng ngừng gõ thêm → ít lượt gọi máy chủ
  }

  // ---------- Hộp gợi ý ----------
  function showCard(x) {
    if (!cur) return; activeIssue = x; ensureUI();
    const why = x.why || GENERIC_WHY[x.type];
    const title = x.title ? tx(x.title) : tx(LABEL[x.type]);
    const reps = (x.reps || []).slice(0, 4);
    const lt = x.lesson && GT[x.lesson];
    card.dir = UI_LANG === 'ar' ? 'rtl' : 'ltr'; card.lang = UI_LANG;
    card.innerHTML = H(`<div class="hd"><span class="tag" style="background:${COL[x.type]}">${esc(tx(LABEL[x.type]))}</span><span class="ttl">${esc(title)}</span><button class="x" data-a="close" aria-label="${esc(tx('Đóng hộp gợi ý'))}">×</button></div>
      <div class="reps"><span class="bad" dir="ltr">${esc(x.bad.trim() || '␣')}</span>${reps.map((r, i) => `<button class="rep" data-a="rep" data-k="${i}">${r === '' ? esc(tx('Xóa phần này')) : esc(r.trim() || '␣')}${x.levels && x.levels[i] ? `<span class="lv">${esc(x.levels[i])}</span>` : ''}</button>`).join('') || `<span class="msg">${esc(tx('Chưa có gợi ý sửa – bạn tự sửa lại nhé'))}</span>`}</div>
      ${x.msg && x.src !== 'rules' ? `<div class="msg">${esc(x.msg)}</div>` : ''}
      <div class="acts"><button class="btn" data-a="ign">${esc(tx('Bỏ qua lỗi'))}</button><button class="btn" data-a="why">💡 ${esc(tx('Vì sao?'))}</button><button class="btn off" data-a="off" title="${esc(tx('Tắt soát lỗi trên {site}', { site: HOST }))}">${esc(tx('Tắt trên trang này'))}</button></div>
      <div class="why" hidden>${esc(tx(why))}${lt ? `<br><a data-a="lesson">📐 ${esc(tx('Học bài: {t}', { t: UI_LANG === 'vi' ? lt[0] : lt[1] }))} ↗</a>` : ''}<div class="src">${esc(x.src === 'lt' ? 'LanguageTool' : x.src === 'chrome' ? tx('Chrome AI trên máy') : tx('Bộ luật Lexkite (offline)'))}</div></div>`);
    card.hidden = false; placeCard(x); layout();
  }
  function placeCard(x) {
    const q = (x.rects || [])[0] || (cur && cur.el.getBoundingClientRect()); if (!q) return;
    const w = card.offsetWidth || 320, h = card.offsetHeight || 160;
    let left = Math.min(Math.max(8, q.left), innerWidth - w - 8), top = q.bottom + 8;
    if (top + h > innerHeight - 8) top = Math.max(8, q.top - h - 8);
    card.style.left = left + 'px'; card.style.top = top + 'px';
  }
  function hideCard(refocus) { if (card) card.hidden = true; const had = activeIssue; activeIssue = null; if (had) layout(); if (refocus && cur) cur.el.focus(); }
  let GT = {}; // tên bài ngữ pháp [vi, en] (extension/grammar-titles.json)
  send({ type: 'extJson', name: 'grammar-titles' }).then(r => { GT = (r && r.data) || {}; });

  function onCardClick(e) {
    const b = e.target.closest('[data-a]'); if (!b || !cur || !activeIssue) return;
    const x = activeIssue, a = b.dataset.a;
    if (a === 'close') return hideCard(true);
    if (a === 'why') { const w = card.querySelector('.why'); w.hidden = !w.hidden; placeCard(x); return; }
    if (a === 'lesson') { send({ type: 'openApp', hash: '#/grammar/' + x.lesson }); return hideCard(false); }
    if (a === 'ign') { ignored.add(x.rule + '|' + x.bad.toLowerCase()); cur.issues = cur.issues.filter(i => i !== x); hideCard(true); return layout(); }
    if (a === 'off') { if (!offSites.includes(HOST)) offSites = [...offSites, HOST]; chrome.storage.local.set({ wcOffSites: offSites.slice(-500) }).catch(() => {}); hideCard(false); detach(); return toast(tx('Đã tắt soát lỗi viết trên {site}. Bật lại trong bảng Lexkite (biểu tượng trên thanh công cụ).', { site: HOST })); }
    if (a === 'rep') { const rep = x.reps[+b.dataset.k]; if (rep != null) replace(x, rep); }
  }
  function replace(x, rep) {
    const c = cur, el = c.el, text = getText(c); c.text = text;
    if (text.slice(x.s, x.e) !== x.bad) { hideCard(true); return runCheck(); } // chữ đã đổi → soát lại
    countMistake(x, true);
    el.focus();
    let ok = false;
    try {
      if (c.kind === 'ce') { const a = posOf(c, x.s), b = posOf(c, x.e); const rg = document.createRange(); rg.setStart(a[0], a[1]); rg.setEnd(b[0], b[1]); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); }
      else el.setSelectionRange(x.s, x.e);
      ok = rep ? document.execCommand('insertText', false, rep) : document.execCommand('delete'); // giữ được Hoàn tác (Ctrl+Z) và báo cho React/khung soạn thảo
    } catch (e) { ok = false; }
    if (!ok || getText(c) === text) { // dự phòng
      if (c.kind === 'ce') { const a = posOf(c, x.s), b = posOf(c, x.e); const rg = document.createRange(); rg.setStart(a[0], a[1]); rg.setEnd(b[0], b[1]); rg.deleteContents(); if (rep) rg.insertNode(document.createTextNode(rep)); }
      else el.setRangeText(rep, x.s, x.e, 'end');
      el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: rep }));
    }
    hideCard(false);
    const d = rep.length - (x.e - x.s); c.issues = c.issues.filter(i => i !== x).map(i => (i.s >= x.e ? { ...i, s: i.s + d, e: i.e + d } : i));
    c.text = getText(c); layout(); clearTimeout(tCheck); tCheck = setTimeout(runCheck, 400);
  }

  // ---------- Sổ lỗi sai: lỗi lặp lại (≥ 2 lần ở các lần viết khác nhau) → #/mistakes (+ từ viết sai → thẻ ôn FSRS) ----------
  function countMistake(x, fixed) {
    if (x.type === 'style' || !x.reps.length) return;
    const key = x.rule + '|' + x.bad.trim().toLowerCase(); if (counted.has(key)) return; counted.add(key);
    const text = (cur && cur.text) || '', a = Math.max(0, text.lastIndexOf('\n', x.s) + 1, (text.slice(0, x.s).search(/[^.!?]*$/))), q = text.slice(a, Math.min(text.length, a + 160)).replace(/\s+/g, ' ').trim();
    send({ type: 'wcMistake', key, kind: x.type === 'spelling' ? 'vocab' : 'grammar', q, given: x.bad.trim(), answer: (x.reps[0] || '').trim(), explain: tx(x.why || GENERIC_WHY[x.type]), ref: x.type === 'spelling' ? (x.reps[0] || '').trim() : x.lesson || '', fixed: !!fixed });
  }

  // ---------- Thông báo nhỏ ----------
  function toast(msg) { ensureUI(); const t = document.createElement('div'); t.setAttribute('style', 'position:fixed;right:18px;bottom:18px;z-index:2147483647;max-width:360px;background:#1c1d2b;color:#fff;padding:10px 14px;border-radius:12px;font:600 13px/1.4 -apple-system,"Segoe UI",sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.25)'); t.textContent = msg; root.appendChild(t); setTimeout(() => t.remove(), 5000); }

  // ---------- Gắn / gỡ ----------
  function attach(info) {
    if (cur && cur.el === info.el) return;
    detach(); ensureUI();
    cur = { el: info.el, kind: info.kind, text: '', issues: [], seq: 0 };
    if (window.ResizeObserver) { cur.ro = new ResizeObserver(scheduleLayout); cur.ro.observe(info.el); }
    clearTimeout(tCheck); tCheck = setTimeout(runCheck, 250);
  }
  function detach() {
    if (cur) { for (const x of cur.issues) if (x.type !== 'style') countMistake(x, false); if (cur.ro) cur.ro.disconnect(); }
    cur = null; activeIssue = null; clearTimeout(tCheck); clearTimeout(tLT); clearDraw(); if (card) card.hidden = true;
  }
  const target = e => { const p = e.composedPath ? e.composedPath()[0] : e.target; return p && p.nodeType === 1 ? p : e.target; };
  document.addEventListener('focusin', e => {
    if (!on || dead || pageBlocked()) return;
    const info = eligible(target(e)); if (info) attach(info);
  }, true);
  document.addEventListener('focusout', e => {
    if (!cur) return;
    setTimeout(() => { if (!cur) return; const a = document.activeElement; const inside = a === cur.el || cur.el.contains(a) || (a && a.shadowRoot && a.shadowRoot.activeElement === cur.el) || a === hostEl; if (!inside) detach(); }, 150);
  }, true);
  document.addEventListener('input', e => {
    if (!cur) return; const t = target(e); if (t !== cur.el && !cur.el.contains(t)) return;
    cur.seq++; cur.issues = []; activeIssue = null; if (card) card.hidden = true; clearDraw();
    clearTimeout(tCheck); tCheck = setTimeout(runCheck, 600);
  }, true);
  // Bấm vào chữ bị gạch chân (con trỏ rơi vào đoạn lỗi) → hộp gợi ý
  document.addEventListener('click', e => {
    if (!cur || !cur.issues.length) return; const t = target(e); if (t !== cur.el && !cur.el.contains(t)) return;
    setTimeout(() => {
      if (!cur) return; let off;
      if (cur.kind === 'ce') { const s = getSelection(); if (!s || !s.isCollapsed || !s.anchorNode) return; ceText(cur); off = offOf(cur, s.anchorNode, s.anchorOffset); }
      else { if (cur.el.selectionStart !== cur.el.selectionEnd) return; off = cur.el.selectionStart; }
      const x = cur.issues.find(i => off >= i.s && off <= i.e);
      if (x) showCard(x); else hideCard(false);
    }, 0);
  }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && activeIssue) hideCard(false); }, true);
  window.addEventListener('scroll', () => { if (cur) scheduleLayout(); }, { capture: true, passive: true });
  window.addEventListener('resize', () => { if (cur) scheduleLayout(); }, { passive: true });
  document.addEventListener('fullscreenchange', () => { if (hostEl) ensureUI(); });
})();
