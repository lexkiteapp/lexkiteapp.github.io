/* 🚪 ExitGuard – mọi màn học có lối thoát rõ ràng, nhất quán (docs/specs/exit-button.md, khung §5d biến thể FOCUS).
 * Cách làm (tìm/gắn nút thoát, Esc, back/vuốt iOS, hỏi khi làm dở, vùng chạm 44 px): xem docs/specs/exit-button.md.
 * Màn mới: thêm tên route vào ALWAYS/WITH_ARG (màn học) hoặc NOT_LEARN (trang trung tâm) – test exit-sweep đỏ nếu route chưa phân loại. */
(function (g) {
  'use strict';
  const t = (s, v) => (g.t ? g.t(s, v) : s);
  // Màn học: luôn là màn học / chỉ khi có tham số (bài cụ thể). Trang trung tâm có crumb + tab dưới.
  const ALWAYS = ['quick', 'reflex', 'paraphrase', 'placement', 'handsfree', 'review', 'rtype', 'cbt', 'call', 'task1', 'write', 'speaking']; // task1/write/speaking: không tham số = bài đầu / phòng viết / Part 1
  const WITH_ARG = ['lesson', 'practice', 'listen', 'listen-test', 'dictation', 'grammar', 'read', 'toefl-p', 'toeic-r', 'toeic-test', 'toeic-sw', 'pron', 'roleplay', 'mock', 'letters', 'outcome', 'mediate']
  const NOT_LEARN = ['watch', 'home', 'welcome', 'contact', 'deck', 'dict', 'library', 'stats', 'topic', 'class', 'confidence', 'course', 'courses', 'criteria', 'fix', 'goal', 'handoff', 'me', 'skill', 'skills', 'tests', 'vocab', 'ideas', 'league', 'listening', 'method', 'day', 'path', 'tracks', 'model', 'models', 'phrases', 'mistakes', 'qstats', 'style', 'reading', 'report', 'resources', 'streak', 'settings', 'toefl', 'toeic', 'usage', 'train', 'verb']
  const extra = new Set(); // màn đăng ký lúc chạy (gói lười: truyện, video, Play & Speak…): ExitGuard.learn('story')
  // #/review?hub=1 (thanh tab, ux1) = màn "Ôn" trung tâm của Stitch, không phải phiên ôn – cùng điều kiện study.js
  const reviewHub = q => /(^|[?&])hub=1(&|$)/.test(q || '') && !!(g.App && App.ux1On && App.ux1On());
  const isLearn = (name, arg, q) => {
    if (name === 'review' && reviewHub(q)) return false;
    if (extra.has(name) || ALWAYS.includes(name)) return true;
    if (!WITH_ARG.includes(name) || !arg) return false;
    if (name === 'lesson') return arg === 'go' || /^\d/.test(arg) || !(g.App && App.ux1On && App.ux1On()); // ux1: #/lesson = bản đồ chặng
    return arg !== 'mix';
  };
  const parse = h => { const m = /^#\/([^/?]*)\/?([^?]*)\??(.*)/.exec(h || ''); return m ? [m[1] || 'home', decodeURIComponent(m[2] || ''), m[3] || ''] : ['home', '', '']; };
  const learnHash = h => { const [n, a, q] = parse(h); return isLearn(n, a, q); };
  // Thanh FOCUS bật mặc định (exit-sweep xanh, luật duyệt 2/11); tắt thử: ?exitbar=0 hoặc localStorage lk.exitbar = '0'
  const flagOn = () => { try { const m = /[?&]exitbar=([01])\b/.exec(location.search + location.hash); if (m) sessionStorage.setItem('lk.exitbar.pv', m[1]); const pv = sessionStorage.getItem('lk.exitbar.pv'); return pv ? pv === '1' : localStorage.getItem('lk.exitbar') !== '0'; } catch (e) { return true; } };

  let backTo = '#/home', cur = '', dirty = false, done = false, saves = [], bypass = false, bar = null;
  const view = () => document.getElementById('view');
  const modalOpen = () => { const m = document.getElementById('modal'); return !!(m && !m.hidden); };

  // Nút thoát sẵn có của màn: lớp đã biết hoặc nút/link ở đầu màn mang nhãn/biểu tượng thoát
  const KNOWN = '[data-exit], .lsn-x, .study-top a.icon-btn, .study-top button.icon-btn, #mkQuit, .mk-quit, a.back, .back-btn, [data-back]';
  const ICON = /#i-(x|arrow-left|chevron-left)"|>\s*(close|arrow_back|arrow_back_ios|chevron_left)\s*</; // Lucide <use href="#i-x"> · Material Symbols
  const labels = () => [t('Thoát'), t('Quay lại'), t('Đóng'), t('Thoát bài học'), 'Close', 'Back', 'Exit', 'Quit'].map(s => s.toLowerCase());
  const shown = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  function findExit(root) {
    const k = [...root.querySelectorAll(KNOWN)].find(shown);
    if (k) return k;
    const L = labels(), top = root.getBoundingClientRect().top + 160;
    return [...root.querySelectorAll('a[href], button')].find(el => {
      if (el.closest('.crumb') || !shown(el) || el.getBoundingClientRect().top > top) return false;
      const lab = (el.getAttribute('aria-label') || el.title || '').trim().toLowerCase();
      return (lab && L.includes(lab)) || (ICON.test(el.innerHTML) && !el.textContent.replace(/\b(close|arrow_back|arrow_back_ios|chevron_left)\b/g, '').trim());
    }) || null;
  }
  // Tiến độ của màn (thanh có sẵn) → đồng bộ vào thanh FOCUS chung
  const progressOf = root => {
    const p = root.querySelector('[role="progressbar"][aria-valuenow], progress');
    if (!p) return null;
    const v = p.tagName === 'PROGRESS' ? p.value / (p.max || 1) : (+p.getAttribute('aria-valuenow') - +(p.getAttribute('aria-valuemin') || 0)) / ((+(p.getAttribute('aria-valuemax') || 100)) - +(p.getAttribute('aria-valuemin') || 0) || 1);
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : null;
  };
  function injectBar(v) {
    const b = document.createElement('div');
    b.className = 'study-top lk-exitbar';
    b.innerHTML = `<button type="button" class="icon-btn lk-exit-x" data-exit aria-label="${t('Thoát bài học')}">${g.UI && UI.icon ? UI.icon('x') : '✕'}</button><div class="progress" aria-hidden="true"><i style="width:0%"></i></div><button type="button" id="lkTheme" class="icon-btn lk-exit-x" aria-label="${t('Đổi giao diện sáng/tối')}"><span class="material-symbols-outlined">light_mode</span></button>`; /* desktop: header mẫu bị ẩn → thanh thoát thay header, mang nút sáng/tối (hành vi gắn ở app.js focusTheme) */
    v.prepend(b);
    return b;
  }
  const syncBar = () => { if (!bar || !bar.isConnected) return; const p = progressOf(view()), i = bar.querySelector('.progress i'); if (i) i.style.width = Math.round((p || 0) * 100) + '%'; bar.querySelector('.progress').hidden = p == null; };

  function setup(name, arg) {
    const v = view(); if (!v) return;
    let x = findExit(v);
    if (!x && flagOn()) { bar = injectBar(v); x = bar.querySelector('[data-exit]'); syncBar(); }
    if (!x) return;
    x.setAttribute('data-exit', '');
    if (!x.getAttribute('aria-label')) x.setAttribute('aria-label', t('Thoát bài học'));
    const r = x.getBoundingClientRect(); if (r.width < 44 || r.height < 44) { x.classList.add('lk-hit44'); if (!noGrow) grow(x, r); }
  }
  // Hộp thật ≥ 44 mà KHÔNG đổi điểm ảnh: phần nhìn thấy chuyển nguyên vào <span class="… lk-face"> (cùng lớp → cùng CSS, cùng hộp, cùng vị trí);
  // chính nút (<a>/<button>, giữ handler/id/aria) thành hộp trong suốt bọc ngoài: padding + lề âm → bố cục không đổi (docs/specs/exit-button.md)
  let noGrow = false; // exit-sweep: trang đối chứng không nới
  function grow(x, r) {
    const cs = getComputedStyle(x), px = v => parseFloat(v) || 0, S = x.style, SD = ['Top', 'Right', 'Bottom', 'Left'], M = SD.map(k => px(cs['margin' + k]));
    if (!r.width || x.dataset.lkGrow != null || cs.display === 'inline') return;
    const up = v => Math.ceil(v * 64) / 64, dx = Math.max(0, up((44 - r.width) / 2)), dy = Math.max(0, up((44 - r.height) / 2)); // bội 1/64 px (đơn vị bố cục) → không lệch dưới điểm ảnh
    const f = document.createElement('span');
    f.className = x.className.replace(/\blk-hit44\b/, '') + ' lk-face';
    f.style.cssText = S.cssText; Object.assign(f.style, { position: 'relative', inset: 'auto', margin: 0, flex: 'none', boxSizing: 'border-box', width: r.width + 'px', height: r.height + 'px', display: cs.display });
    while (x.firstChild) f.appendChild(x.firstChild);
    x.dataset.lkGrow = S.cssText; x.appendChild(f); x.classList.add('lk-grow'); x.classList.remove('lk-hit44'); // hộp đã ≥ 44 → bỏ ::after nới ảo
    Object.assign(S, { boxSizing: 'content-box', width: r.width + 'px', height: r.height + 'px', minWidth: 0, minHeight: 0, padding: `${dy}px ${dx}px`, borderWidth: 0, margin: `${M[0] - dy}px ${M[1] - dx}px ${M[2] - dy}px ${M[3] - dx}px` });
  }
  const ungrow = x => {
    if (!x || x.dataset.lkGrow == null) return;
    const f = x.querySelector(':scope > .lk-face'); if (f) { while (f.firstChild) x.insertBefore(f.firstChild, f); f.remove(); }
    x.style.cssText = x.dataset.lkGrow; x.classList.remove('lk-grow'); x.classList.add('lk-hit44'); delete x.dataset.lkGrow;
  };
  const exitEl = () => { const v = view(); return v && (v.querySelector('[data-exit]') || findExit(v)); };
  // Không dùng [data-done] chung (cờ "đã nạp" của .wn-slot/quảng cáo/usage) – docs/specs/exit-button.md
  const finished = () => done || !!(view() && view().querySelector('.lsn-done, [data-lesson-done], .lesson-complete, #wDone:not([hidden])'));
  const needAsk = () => dirty && !finished();

  // Rời màn: đích lượt bị giữ → href nút thoát → màn trước (Hôm nay/tab gốc)
  function leave(el, dest) {
    const href = el && el.getAttribute && el.getAttribute('href');
    const to = dest || (href && href !== '#' && !learnHash(href) ? href : backTo || '#/home');
    saves.forEach(f => { try { f(); } catch (e) { /* lưu lỗi không chặn thoát */ } });
    bypass = true; dirty = false; popFor = '';
    if (location.hash === to) { bypass = false; seen = to; routeNow(); } else location.hash = to;
  }
  function ask(el, dest) {
    const saved = saves.length > 0;
    const box = g.UI && UI.modal ? UI.modal(`<div class="celebrate lk-exit-ask"><h2>${saved ? t('Thoát bài?') : t('Thoát bây giờ sẽ mất tiến độ bài này?')}</h2>${saved ? `<p class="muted">${t('Tiến độ đã được lưu – lần sau bạn học tiếp từ đây.')}</p>` : ''}<div class="row center"><button type="button" class="btn primary" data-close data-exit-stay>${t('Tiếp tục học')}</button><button type="button" class="btn" data-exit-go>${t('Thoát')}</button></div></div>`) : null;
    if (!box) { if (g.confirm(t('Thoát bây giờ sẽ mất tiến độ bài này?'))) leave(el, dest); return; }
    box.querySelector('[data-exit-go]').onclick = () => { if (UI.closeModal) UI.closeModal(); else document.getElementById('modal').hidden = true; leave(el, dest); };
  }
  // Kích hoạt lối thoát (nút, Esc, back hệ thống)
  function exit(viaHistory, dest) {
    const el = exitEl();
    if (needAsk()) ask(el, dest); // hộp chung; "Thoát" đi thẳng (không qua hộp riêng của màn → không hỏi hai lần)
    else if (viaHistory || !el) leave(el, dest);
    else el.click();
  }

  // Nút thoát: màn không tự hỏi → hỏi chung khi đang làm dở
  document.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-exit]');
    if (!el || !cur) return;
    if (el.onclick && !el.matches('.lk-exit-x')) return;
    e.preventDefault(); e.stopPropagation();
    if (needAsk()) ask(el); else leave(el);
  }, true);
  // Bắt đầu làm bài = chạm vào nội dung (không tính nút thoát, nút nghe)
  const touch = e => { if (!cur || dirty) return; const el = e.target; if (!view() || !view().contains(el) || el.closest('[data-exit], [data-speak], [data-say], [data-saysent], [data-slow], .crumb')) return; if (e.type === 'input' || el.closest('button, a, input, textarea, select, [role="button"], .option, [draggable="true"]')) dirty = true; };
  document.addEventListener('pointerdown', touch, true); document.addEventListener('input', touch, true);
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape' || !cur || e.defaultPrevented || modalOpen()) return;
    const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value) return; // Esc trong ô đang gõ = xóa/thoát ô, không rời bài
    e.preventDefault(); exit(false);
  });
  // Enter = nút chính của bước (Kiểm tra → Tiếp tục), khung chung docs/specs/learn-flow-nav.md. Màn đánh dấu [data-lk-primary] hoặc dùng id đã biết.
  // Không bắt khi đang ở nút/link (trình duyệt tự bấm), ô gõ (màn tự xử lý Enter), hộp hỏi đang mở.
  const PRIMARY = '[data-lk-primary], #lsnNext, #lsnCheck, #lsnGo, #nextQ, #gotIt, #nx, #sNext, #dChk, #rNext, #rSub, #ppNext, #rxNext, #tNext, #mkNext, #ivNext, #spkNext, #sayNext, #hfNext, #check, #tGo, #mkGo, [data-lv-next]';
  const usable = el => shown(el) && !el.disabled && el.getAttribute('aria-disabled') !== 'true' && !el.closest('[hidden], [inert]');
  function primaryEl() {
    const roots = [view(), document.getElementById('lsnFoot')].filter(Boolean);
    for (const r of roots) { const k = [...r.querySelectorAll(PRIMARY)].find(usable); if (k) return k; }
    return null;
  }
  const own = el => !!el && el !== document.body && (/^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(el.tagName) || el.isContentEditable || /^(button|link|checkbox|radio|switch|tab|option|menuitem)$/.test(el.getAttribute('role') || ''));
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !cur || e.defaultPrevented || e.repeat || e.isComposing || e.shiftKey || e.ctrlKey || e.metaKey || e.altKey || modalOpen() || own(document.activeElement)) return;
    const p = primaryEl(); if (!p) return;
    e.preventDefault(); p.click();
  });
  // Back/vuốt iOS khi làm dở → giữ màn (pushState) rồi hỏi.
  // Nhận biết "quay lại": Navigation API (traverse) nếu có; không thì hash mới = mục trước trong lịch sử phiên và không có chạm điều hướng trong màn ngay trước.
  // Nghe cả popstate + hashchange (back từ mục pushState chỉ có popstate), mỗi lượt xử lý 1 lần – docs/specs/exit-button.md
  let navType = '', tapAt = 0, seen = location.hash, popFor = '', popRes = '', popT = 0, popClr = 0; const hist = [];
  if (g.navigation && g.navigation.addEventListener) g.navigation.addEventListener('navigate', e => { navType = e.navigationType; });
  document.addEventListener('click', () => { tapAt = Date.now(); }, true); // chạm (trong màn, hộp hỏi, tab) rồi đổi hash = điều hướng chủ động, không phải back
  // replaceState của màn → seen = URL thật
  try { const RS = history.replaceState; history.replaceState = function () { const r = RS.apply(this, arguments); seen = location.hash; return r; }; } catch (e) { /* bỏ qua */ }
  const hashOf = u => { const i = String(u || '').indexOf('#'); return i >= 0 ? String(u).slice(i) : ''; };
  const routeNow = () => { if (g.App && App.route) App.route(); };
  // true = giữ màn (khôi phục URL, hỏi)
  function decide(h) {
    const oldH = seen, prev = hist[hist.length - 2], type = navType; navType = ''; seen = h;
    const back = type ? type === 'traverse' : (h === prev && Date.now() - tapAt > 800);
    if (h === prev) hist.pop(); else { hist.push(h); if (hist.length > 50) hist.shift(); }
    if (bypass) { bypass = false; return false; }
    if (!cur || !back || !needAsk() || !oldH || parse(oldH)[0] !== parse(cur)[0]) return false; // màn tự đổi query (replaceState) → so theo route
    if (parse(h)[0] === parse(cur)[0] && learnHash(h)) return false; // vẫn trong cùng bài
    history.pushState(null, '', oldH); hist.push(oldH); cur = seen = oldH;
    exit(true, h);
    return true;
  }
  g.addEventListener('popstate', () => {
    const h = location.hash;
    clearTimeout(popT); clearTimeout(popClr); popT = 0;
    if (h === seen) { popFor = ''; return; }
    popFor = h; popRes = decide(h) ? 'held' : 'wait';
    popClr = setTimeout(() => { popFor = ''; }, 1000);
    // không có hashchange theo sau → tự vẽ
    if (popRes === 'wait') popT = setTimeout(() => { popT = 0; if (popFor === h && location.hash === h) { popRes = 'routed'; routeNow(); } }, 150);
  });
  g.addEventListener('hashchange', e => {
    const nh = hashOf(e.newURL) || location.hash;
    if (popFor && nh === popFor) {
      popFor = ''; clearTimeout(popClr); clearTimeout(popT); popT = 0;
      if (popRes !== 'wait') e.stopImmediatePropagation();
      return;
    }
    if (decide(location.hash)) e.stopImmediatePropagation();
  });
  hist.push(location.hash);
  // Màn vẽ lại đầu trang (câu kế tiếp…) → gắn lại nút thoát, đồng bộ tiến độ; gom theo khung hình
  let raf = 0;
  const reMark = () => { raf = 0; const v = view(); if (!cur || !v || parse(location.hash)[0] !== parse(cur)[0]) return; /* cur còn là màn học cũ khi đã sang trang khác (đua điều hướng): không gắn thanh thoát vào trang mới */ if (!v.querySelector('[data-exit]')) setup(...parse(cur)); syncBar(); };
  if (g.MutationObserver) document.addEventListener('DOMContentLoaded', () => { const v = view(); if (v) new MutationObserver(() => { if (!cur) return; if (!v.querySelector('[data-exit]')) return reMark(); /* gắn thanh trước khi vẽ: gắn sau đẩy cả màn 64 px (CLS) */ if (!raf) raf = requestAnimationFrame(reMark); }).observe(v, { childList: true, subtree: true }); });

  // Mỗi lượt vẽ trang (App.afterRoute, gọi từ app.js)
  function after(name) {
    const [n, a, q] = parse(location.hash);
    if (bar && !bar.isConnected) bar = null;
    seen = location.hash;
    if (!isLearn(n, a, q)) { cur = ''; if (n !== 'welcome') backTo = location.hash || '#/home'; document.body.classList.remove('lk-learn'); return; }
    if (location.hash !== cur) { dirty = false; done = false; saves = []; }
    cur = location.hash; document.body.classList.add('lk-learn');
    if (flagOn()) document.body.classList.add('focus'); // khung §5d FOCUS: màn học không có thanh trên/tab dưới (route() tự gỡ khi rời màn)
    setup(n, a);
  }
  const hook = () => { const A = g.App; if (!A) return false; const prev = A.afterRoute; A.afterRoute = name => { if (prev) prev(name); try { after(name); } catch (e) { /* không chặn vẽ trang */ } }; return true; };
  // app.js/ux1.js/path.js cùng nối App.afterRoute → nối sau cùng (sau DOMContentLoaded)
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { hook(); if (g.App && App.route && view() && view().children.length) after(); }, 0));
  // Phông web nạp SAU khi nới (font-display swap/optional) → chữ trong nút rộng ra, nhưng hộp đã nới giữ cỡ đo lúc đầu → lệch bố cục
  // (exit-sweep: /mock/run @768 – mặt nút 51,7 px ≠ 54 px khi không nới). Phông đổi → gỡ nới, đo lại, nới lại theo cỡ thật.
  const regrow = () => { const x = exitEl(); if (!x || x.dataset.lkGrow == null) return; ungrow(x); const r = x.getBoundingClientRect(); if (r.width < 44 || r.height < 44) { x.classList.add('lk-hit44'); if (!noGrow) grow(x, r); } };
  const F = document.fonts; if (F && F.addEventListener) { F.addEventListener('loadingdone', regrow); if (F.ready) F.ready.then(regrow, () => {}); }

  g.ExitGuard = {
    isLearn, ALWAYS, WITH_ARG, NOT_LEARN, focusHash: h => flagOn() && learnHash(h),
    focusFor: (n, a, q) => flagOn() && isLearn(n, a, q), // route() đặt khung FOCUS ngay lúc chạm (after() chỉ còn là chốt)
    learn: name => extra.add(name),
    onSave: fn => saves.push(fn), // màn lưu được tiến độ → hộp hỏi báo "đã lưu"
    progress: () => syncBar(),
    done: () => { done = true; }, // màn kết quả → thoát không hỏi
    dirty: v => { dirty = v !== false; },
    backTo: () => backTo,
    exit: () => exit(false),
    primary: () => primaryEl(), // nav-sweep: nút Enter sẽ bấm
    _nav: () => ({ seen, popFor, popRes }),
    _grow: x => grow(x, x.getBoundingClientRect()), _ungrow: ungrow, _regrow: regrow, _noGrow: v => { noGrow = !!v; }, // exit-sweep: so ảnh có/không nới (diff phải = 0)
    _s: () => ({ cur, dirty, done, bypass, backTo, hist: hist.slice(-4), ex: !!exitEl(), exHref: exitEl() && exitEl().getAttribute('href'), exOn: !!(exitEl() && exitEl().onclick), act: document.activeElement && document.activeElement.tagName }), // chẩn đoán cho exit-sweep
  };
})(typeof self !== 'undefined' ? self : this);
