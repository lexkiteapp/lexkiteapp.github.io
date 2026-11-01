/* 🚪 ExitGuard – mọi màn học có lối thoát rõ ràng, nhất quán (docs/specs/exit-button.md, khung §5d biến thể FOCUS).
 * Một chỗ chung thay vì vá từng màn:
 *  - Màn học (ExitGuard.isLearn) → tìm nút X/Quay lại sẵn có ở đầu màn, gắn [data-exit], nhãn aria, vùng chạm ≥ 44 px.
 *    Thiếu nút → chèn thanh FOCUS chung (nút X tròn + thanh tiến độ + chip) – sau cờ lk.exitbar cho tới khi chủ duyệt ảnh.
 *  - Esc, nút back hệ thống/trình duyệt, vuốt quay lại trên iOS = bấm nút thoát.
 *  - Đang làm dở → hỏi nhẹ (Tiếp tục học / Thoát); lưu được thì lưu (ExitGuard.onSave). Chưa làm gì / đã xong → thoát ngay.
 *  - Thoát về đúng màn trước (Hôm nay hoặc tab gốc), không bao giờ kẹt.
 * Màn tự có hộp hỏi riêng (gán el.onclick, vd. study.js guardExit, placement, mock) → giữ nguyên, Esc/back chỉ "bấm" nút đó.
 * Màn mới: thêm tên route vào ALWAYS/WITH_ARG (màn học) hoặc NOT_LEARN (trang trung tâm) – test exit-sweep đỏ nếu route chưa phân loại. */
(function (g) {
  'use strict';
  const t = (s, v) => (g.t ? g.t(s, v) : s);
  // Màn học: luôn là màn học / chỉ khi có tham số (bài cụ thể). Trang trung tâm có crumb + tab dưới.
  const ALWAYS = ['quick', 'reflex', 'paraphrase', 'placement', 'handsfree', 'review', 'rtype', 'cbt', 'call'];
  const WITH_ARG = ['lesson', 'practice', 'listen', 'listen-test', 'dictation', 'grammar', 'read', 'toefl-p', 'toeic-r', 'toeic-test', 'toeic-sw', 'task1', 'pron', 'write', 'speaking', 'roleplay', 'mock', 'letters'];
  const NOT_LEARN = ['home', 'welcome', 'contact', 'deck', 'dict', 'library', 'stats', 'topic', 'class', 'confidence', 'course', 'courses', 'criteria', 'fix', 'goal', 'handoff', 'me', 'skill', 'skills', 'tests', 'vocab', 'ideas', 'league', 'listening', 'method', 'day', 'path', 'tracks', 'model', 'models', 'phrases', 'mistakes', 'qstats', 'style', 'reading', 'report', 'resources', 'streak', 'settings', 'toefl', 'toeic', 'usage', 'train', 'verb'];
  const extra = new Set(); // màn đăng ký lúc chạy (gói lười: truyện, video, Play & Speak…): ExitGuard.learn('story')
  const isLearn = (name, arg) => {
    if (extra.has(name) || ALWAYS.includes(name)) return true;
    if (!WITH_ARG.includes(name) || !arg) return false;
    if (name === 'lesson') return arg === 'go' || /^\d/.test(arg) || !(g.App && App.ux1On && App.ux1On()); // ux1: #/lesson = bản đồ chặng
    return arg !== 'mix';
  };
  const parse = h => { const m = /^#\/([^/?]*)\/?([^?]*)/.exec(h || ''); return m ? [m[1] || 'home', decodeURIComponent(m[2] || '')] : ['home', '']; };
  const learnHash = h => { const [n, a] = parse(h); return isLearn(n, a); };
  const flagOn = () => { try { if (/[?&]exitbar=1\b/.test(location.search + location.hash)) sessionStorage.setItem('lk.exitbar.pv', '1'); return sessionStorage.getItem('lk.exitbar.pv') === '1' || localStorage.getItem('lk.exitbar') === '1'; } catch (e) { return false; } };

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
    b.innerHTML = `<button type="button" class="icon-btn lk-exit-x" data-exit aria-label="${t('Thoát bài học')}">${g.UI && UI.icon ? UI.icon('x') : '✕'}</button><div class="progress" aria-hidden="true"><i style="width:0%"></i></div>`;
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
    const r = x.getBoundingClientRect(); if (r.width < 44 || r.height < 44) x.classList.add('lk-hit44');
  }
  const exitEl = () => { const v = view(); return v && (v.querySelector('[data-exit]') || findExit(v)); };
  const finished = () => done || !!(view() && view().querySelector('.lsn-done, [data-done], .lesson-complete, #wDone:not([hidden])'));
  const needAsk = () => dirty && !finished();

  // Rời màn: về đúng màn trước (Hôm nay/tab gốc); link thoát của màn → theo href của nó
  function leave(el) {
    const href = el && el.getAttribute && el.getAttribute('href');
    const to = href && href !== '#' && !learnHash(href) ? href : backTo || '#/home';
    saves.forEach(f => { try { f(); } catch (e) { /* lưu lỗi không chặn thoát */ } });
    bypass = true; dirty = false;
    if (location.hash === to) { bypass = false; g.App && App.route && App.route(); } else location.hash = to;
  }
  function ask(el) {
    const saved = saves.length > 0;
    const box = g.UI && UI.modal ? UI.modal(`<div class="celebrate lk-exit-ask"><h2>${saved ? t('Thoát bài?') : t('Thoát bây giờ sẽ mất tiến độ bài này?')}</h2>${saved ? `<p class="muted">${t('Tiến độ đã được lưu – lần sau bạn học tiếp từ đây.')}</p>` : ''}<div class="row center"><button type="button" class="btn primary" data-close data-exit-stay>${t('Tiếp tục học')}</button><button type="button" class="btn" data-exit-go>${t('Thoát')}</button></div></div>`) : null;
    if (!box) { if (g.confirm(t('Thoát bây giờ sẽ mất tiến độ bài này?'))) leave(el); return; }
    box.querySelector('[data-exit-go]').onclick = () => { if (UI.closeModal) UI.closeModal(); else document.getElementById('modal').hidden = true; leave(el); };
  }
  // Kích hoạt lối thoát (nút, Esc, back hệ thống)
  function exit(viaHistory) {
    const el = exitEl();
    if (needAsk()) ask(el); // hộp chung; "Thoát" đi thẳng (không qua hộp riêng của màn → không hỏi hai lần) else if (viaHistory || !el) leave(el); else el.click();
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
    const a = document.activeElement; if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value) return; // Esc trong ô đang gõ = xoá/thoát ô, không rời bài
    e.preventDefault(); exit(false);
  });
  // Back hệ thống / vuốt iOS: rời màn học đang dở bằng lịch sử → giữ lại màn (pushState không vẽ lại) rồi hỏi.
  // Nhận biết "quay lại": Navigation API (traverse) nếu có; không thì hash mới = mục trước trong lịch sử phiên và không có chạm điều hướng trong màn ngay trước.
  let navType = '', tapAt = 0; const hist = [];
  if (g.navigation && g.navigation.addEventListener) g.navigation.addEventListener('navigate', e => { navType = e.navigationType; });
  document.addEventListener('click', () => { tapAt = Date.now(); }, true); // chạm (trong màn, hộp hỏi, tab) rồi đổi hash = điều hướng chủ động, không phải back
  g.addEventListener('hashchange', e => {
    const h = location.hash, prev = hist[hist.length - 2], type = navType; navType = '';
    const back = type ? type === 'traverse' : (h === prev && Date.now() - tapAt > 800);
    if (h === prev) hist.pop(); else { hist.push(h); if (hist.length > 50) hist.shift(); }
    if (bypass) { bypass = false; return; }
    if (!cur || !back || !needAsk() || !e.oldURL || e.oldURL.indexOf(cur) < 0) return;
    if (parse(h)[0] === parse(cur)[0] && learnHash(h)) return; // vẫn trong cùng bài
    e.stopImmediatePropagation();
    history.pushState(null, '', cur); hist.push(cur);
    exit(true);
  });
  hist.push(location.hash);
  // Màn vẽ lại đầu trang (câu kế tiếp…) → gắn lại nút thoát, đồng bộ tiến độ; gom theo khung hình
  let raf = 0;
  const reMark = () => { raf = 0; const v = view(); if (!cur || !v) return; if (!v.querySelector('[data-exit]')) setup(...parse(cur)); syncBar(); };
  if (g.MutationObserver) document.addEventListener('DOMContentLoaded', () => { const v = view(); if (v) new MutationObserver(() => { if (cur && !raf) raf = requestAnimationFrame(reMark); }).observe(v, { childList: true, subtree: true }); });

  // Mỗi lượt vẽ trang (App.afterRoute, gọi từ app.js)
  function after(name) {
    const [n, a] = parse(location.hash);
    if (bar && !bar.isConnected) bar = null;
    if (!isLearn(n, a)) { cur = ''; if (n !== 'welcome') backTo = location.hash || '#/home'; document.body.classList.remove('lk-learn'); return; }
    if (location.hash !== cur) { dirty = false; done = false; saves = []; }
    cur = location.hash; document.body.classList.add('lk-learn');
    if (flagOn()) document.body.classList.add('focus'); // khung §5d FOCUS: màn học không có thanh trên/tab dưới (route() tự gỡ khi rời màn)
    setup(n, a);
  }
  const hook = () => { const A = g.App; if (!A) return false; const prev = A.afterRoute; A.afterRoute = name => { if (prev) prev(name); try { after(name); } catch (e) { /* không chặn vẽ trang */ } }; return true; };
  // app.js/ux1.js/path.js cùng nối App.afterRoute → nối sau cùng (sau DOMContentLoaded)
  document.addEventListener('DOMContentLoaded', () => setTimeout(() => { hook(); if (g.App && App.route && view() && view().children.length) after(); }, 0));

  g.ExitGuard = {
    isLearn, ALWAYS, WITH_ARG, NOT_LEARN,
    learn: name => extra.add(name),
    onSave: fn => saves.push(fn), // màn lưu được tiến độ → hộp hỏi báo "đã lưu"
    progress: () => syncBar(),
    done: () => { done = true; }, // màn kết quả → thoát không hỏi
    dirty: v => { dirty = v !== false; },
    backTo: () => backTo,
    exit: () => exit(false),
  };
})(typeof self !== 'undefined' ? self : this);
